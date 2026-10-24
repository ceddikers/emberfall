// Emberfall client. Two scenes:
//  - town: walk around with friends, pick a hero at the tavern, train on the dummies, inspect bosses.
//  - arena: the raid. The host runs the fight (RaidHost/FightSim) and everyone renders its messages.
// Each player runs their own class kit locally (CombatActor) and reports damage/heals to the host.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  const HERO_SCALE = 1.5, BOSS_SCALE = 0.85, RAID_BOSS_SCALE = 1.3;
  // heroes are drawn a little bigger in the arena so they hold up next to the boss (hitboxes don't change)
  const ARENA_HERO_SCALE = 1.85;
  const heroScale = () => (scene === 'arena' ? ARENA_HERO_SCALE : HERO_SCALE);
  const MOVE_SPEED = 230, DASH_DIST = 170, DASH_TIME = 0.18;
  const TOWN_PACE = 1.35;
  const $ = id => document.getElementById(id);
  const rnd = Math.round;
  const SH = typeof SoundHooks !== 'undefined' ? SoundHooks : null;   // sound (sound-hooks.js): every call below is guarded by it
  let now = 0, last = performance.now(), started = false;
  // Network smoothing runs on its own clock (interp.js): real time, so a stalled frame or a throttled tab doesn't
  // squeeze arrival stamps together the way the capped game clock `now` would. step() (testing) pushes it along too.
  let rOff = 0;
  const realNow = () => performance.now() / 1000 + rOff;
  let rnow = realNow();
  let townLayer = null, layerScale = 1, minimapBase = null;
  let scene = 'town', zoom = 1;
  // an Ultimate's screen moments (screenFlash, zoomPunch, hitStop... next to hurtVignette) and a fall noticed once
  const screenFx = { flash: null, dim: null };
  let punch = null, vfxClock = 0, hitStopUntil = -9, wasDown = false;
  const cam = { x: 0, y: 0 };

  initTown();
  Hud.init();
  FX.heroScale = HERO_SCALE;

  // ---------------------------------------------------------------- entities
  const newSt = (phase = 0) => ({ t: 0, moving: false, action: null, phase });
  const player = {
    kind: 'player', name: 'You', x: TOWN.spawn.x, y: TOWN.spawn.y, angle: -Math.PI / 2, cls: null,
    target: null, interact: null, dashMove: null, kb: null, lift: 0, faceLock: 0, st: newSt(),
  };
  const remotes = new Map(); // id -> remote player

  const lineup = [];
  // who waits on the tavern deck: the heroes you've played (and the three easy starters); the rest are at the Barkeep
  function playedHero(id) {
    const h = Save.get('heroes') && Save.get('heroes')[id];
    if (!h) return false;
    const c = h.clears || {};
    return Object.values(c).some(b => b && (b.normal || b.hard)) || (h.talents && ((h.talents.rows | 0) > 1 || (h.talents.picks || []).some(x => x != null))) || (h.journal && Object.keys(h.journal.met || {}).length > 0) || !!h.spec;
  }
  function refreshLineup() {
    // (not the hero you're playing: you're already the one walking round town)
    const shown = CLASSES.filter(c => (c.difficulty === 1 || playedHero(c.id)) && !(player.cls && player.cls.id === c.id));
    lineup.length = 0;
    lineup.push(...shown.map((cls, i) => {
    const roleIdx = ['tank', 'dps', 'healer'].indexOf(cls.role);
    const same = shown.filter(c => c.role === cls.role), col = same.indexOf(cls);
    const p = lineupSpot(roleIdx, col, same.length);   // (each row centred on the deck, however many wait in it)
    // labelUp: in a packed row every other name sits higher, so neighbours' names don't run together
    return { kind: 'hero', cls, x: p.x, y: p.y, angle: Math.PI / 2, st: newSt(i * 0.7), nextAct: 2 + Math.random() * 6, labelUp: same.length > 3 && col % 2 === 1 };
    }));
  }
  refreshLineup();
  const keeper = { kind: 'keeper', x: TOWN.keeper.x, y: TOWN.keeper.y, angle: Math.PI / 2, st: newSt() };
  const trainer = { kind: 'trainer', x: TOWN.trainer.x, y: TOWN.trainer.y, angle: Math.PI / 2, st: newSt(1.3) };   // talents (talent-panel.js)
  // A boss stays sealed (unnamed, under a shroud) until someone on this account has beaten the one before it.
  // (localStorage 'emberfall.unlockAll' = '1' opens everything, for testing.)
  const unlockAll = (() => { try { return localStorage.getItem('emberfall.unlockAll') === '1'; } catch (e) { return false; } })();
  function bossOpen(boss) { const i = BOSSES.indexOf(boss); return unlockAll || i <= 0 || Save.bossBeaten(BOSSES[i - 1].id); }
  // Hard, set by set (data.js BOSSES[].set): locked until every playable boss of the set has fallen on Normal, then it opens a boss at a
  // time, starting with the set's first (Grubnak; Vhalgrath for set 2)
  const bossSet = boss => boss.set || 1;
  const hardUnlocked = (set = 1) => unlockAll || BOSSES.filter(b => b.playable && bossSet(b) === set).every(b => Save.normalBeaten(b.id));
  const firstOfSet = boss => { const i = BOSSES.indexOf(boss); return i <= 0 || bossSet(BOSSES[i - 1]) !== bossSet(boss); };
  function hardOpen(boss) { const i = BOSSES.indexOf(boss); return unlockAll || (hardUnlocked(bossSet(boss)) && (firstOfSet(boss) || Save.hardBeaten(BOSSES[i - 1].id))); }
  const hardWhy = boss => { const i = BOSSES.indexOf(boss); return !hardUnlocked(bossSet(boss)) ? (bossSet(boss) === 1 ? 'Clear all four bosses on Normal first.' : 'Clear every boss of the wild realm on Normal first.') : `Beat ${BOSSES[i - 1].name} on Hard first.`; };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const lastOpenBoss = () => [...BOSSES].reverse().find(b => b.playable && bossOpen(b)) || BOSSES[0];
  // the specializations stay a secret until the Hollow King has fallen once on this account
  const specsRevealed = () => unlockAll || Save.bossBeaten('hollowking');
  const statues = BOSSES.map((boss, i) => ({
    kind: 'boss', boss, x: TOWN.pedestals[i].x, y: TOWN.pedestals[i].y - 6, angle: Math.PI / 2, st: newSt(i), nextAct: 2 + i * 1.5,
  }));
  // The first dummy fights back (every 2.8s, like a raid boss's auto-attack) so tanks can practice their defensives.
  const dummies = TOWN.dummies.map((d, i) => ({ kind: 'dummy', x: d.x, y: d.y, st: { t: 0, hit: -10 }, spar: i === 0, nextSwing: 0, windup: 0 }));

  const interactables = [
    { x: keeper.x, y: keeper.y, r: 22, reach: 80, label: 'Barkeep', open: () => openSelect(null) },
    { x: trainer.x, y: trainer.y, r: 22, reach: 80, label: 'Trainer', open: () => openTalents() },
    ...statues.map(b => ({ x: b.x, y: b.y, r: 58, reach: 120, get label() { return bossOpen(b.boss) ? b.boss.name : 'Sealed'; }, open: () => openBossPanel(b.boss) })),
    { x: TOWN.portal.x, y: TOWN.portal.y, r: TOWN.portal.r, reach: 130, label: 'Raid Portal', open: () => openBossPanel(lastOpenBoss()) },
    ...TOWN.houses.filter(b => b.hall).map(b => ({ x: b.x + b.w / 2, y: b.y + b.h + 8, r: 26, reach: 90, label: 'Practice Hall', open: () => openPractice() })),
    ...(TOWN.arena ? [{ x: TOWN.arena.door.x, y: TOWN.arena.door.y, r: 26, reach: 90, label: 'The Arena', open: () => openArena() }] : []),   // PvP (pvp-ui.js)
  ];

  // small game-logic timers (FX.later is for visuals only)
  const timers = [];
  function later(delay, fn) { timers.push({ t: now + delay, fn }); }
  function runTimers() {
    for (let i = timers.length - 1; i >= 0; i--) if (now >= timers[i].t) { const tm = timers[i]; timers.splice(i, 1); tm.fn(); }
  }
  // a scene change drops whatever the last scene still had queued (a prop due to change)
  function clearTimers() { timers.length = 0; }

  // Back from a hidden tab: nothing spawned while hidden (FX/VFX muted), what was already playing is dropped, and
  // everything moving stands at its newest known position instead of fast-forwarding through what was missed.
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    FX.muted = hidden; VFX.mute(hidden);
    if (hidden) return;
    FX.clear(); VFX.clear(); FX.shake = 0;
    for (const r of remotes.values()) if (r.track) r.track.settle();
    if (raid) {
      raid.bossTrack.settle();
      for (const a of raid.adds.values()) if (a.track) a.track.settle();
      for (const b of raid.bots.values()) if (b.track) b.track.settle();
    }
  });

  // ---------------------------------------------------------------- local combat (your class kit)
  let actor = null;
  let lockedAlly = null, hoverFrame = null, lastEnemy = null, lockedEnemy = null;
  const town = { buffs: [], abuffs: [], vuln: 0, vulnEnd: 0, mits: [], shield: null, taken: [], meter: null, meterDone: null };

  const inArena = () => scene === 'arena' && !!raid;
  const myState = () => (raid ? raid.party.get(Net.id) : null);
  const amDead = () => inArena() && !!myState() && !myState().alive;
  // a debuff the host has put on you ('slowed', 'rooted', ...)
  const myDebuff = k => { const s = inArena() ? myState() : null; return !!(s && s.debuffs && s.debuffs.some(d => d[0] === k)); };

  // the talents your hero holds (talents.js), rebuilt from the save when the hero or the picks change
  let talentCache = null;
  function activeTalents() {
    const id = player.cls && player.cls.id;
    if (!id) return null;
    const sp = Save.spec(id);   // (rows VI-VII hold the active spec's picks: a spec swap swaps them)
    if (!talentCache || talentCache.cls !== id || talentCache.spec !== sp) talentCache = { cls: id, spec: sp, set: talentSet(id, Save.talents(id)) };
    return talentCache.set;
  }
  function openTalents() {
    if (!player.cls) { toast('Pick a hero first.'); return; }
    closePanels();
    TalentPanel.open();
  }
  function talentsChanged() {
    talentCache = null;
    if (actor && scene === 'town') makeActor();   // a fresh kit, so charges and gauge caps follow the new picks
  }

  function makeActor() {
    if (!player.cls) { actor = null; Hud.hide(); return; }
    actor = new CombatActor(player.cls, player, world, Math.random);
    Hud.setActor(actor, i => pressSlot(i));
    if ($('help')) updateHelp();
  }

  function entById(id) {
    if (id === Net.id) return player;
    if (raid && raid.bots.has(id)) return raid.bots.get(id);
    return remotes.get(id) || null;
  }
  // everyone in the raid who's alive and on screen: [{ id, x, y }] (for mechanics drawn between players)
  function raidUnits() {
    const out = [];
    if (raid) for (const id of raid.rosterIds) {
      const e = entById(id), s = raid.party.get(id);
      if (e && (!s || s.alive)) out.push({ id, x: e.x, y: e.y, a: e.angle });
    }
    return out;
  }

  const world = {
    now: () => now,
    moving: () => player.st.moving,
    // auto-attacks pause while you're down, dashing or knocked back, and outside a live fight
    canAuto: () => !amDead() && !player.dashMove && !player.kb && (!inArena() || raid.state === 'live'),
    findEnemy: (a, ab) => {
      const range = ab.range === 'melee' ? 75 : (ab.range || 420);
      if (inArena()) {
        // the enemy you clicked if it's in range, otherwise the nearest one in range (boss or add); before the pull
        // the boss can be hit too (that's what pulls it)
        if (raid.state !== 'live' && raid.state !== 'prepull') return null;
        const inRange = c => Math.hypot(c.x - player.x, c.y - player.y) - c.r <= range;
        const cands = arenaEnemies().filter(inRange);
        const pick = cands.find(c => c.id === lockedEnemy) ||
          cands.sort((p, q) => (Math.hypot(p.x - player.x, p.y - player.y) - p.r) - (Math.hypot(q.x - player.x, q.y - player.y) - q.r))[0];
        return pick ? { id: pick.id, x: pick.x, y: pick.y } : null;
      }
      const lockedD = lockedDummy();
      if (lockedD && Math.hypot(lockedD.x - player.x, lockedD.y - player.y) - 20 <= range) return { id: 'dummy', x: lockedD.x, y: lockedD.y, dummy: lockedD };
      let best = null, bd = Infinity;
      for (const d of dummies) { const dist = Math.hypot(d.x - player.x, d.y - player.y) - 20; if (dist <= range && dist < bd) { bd = dist; best = d; } }
      return best ? { id: 'dummy', x: best.x, y: best.y, dummy: best } : null;
    },
    enemiesNear: (a, range) => {
      if (inArena()) return raid.state === 'live' ? arenaEnemies().filter(c => Math.hypot(c.x - player.x, c.y - player.y) - c.r <= range) : [];
      return dummies.filter(d => Math.hypot(d.x - player.x, d.y - player.y) - 20 <= range).map(d => ({ id: 'dummy', x: d.x, y: d.y, r: 20 }));
    },
    positional: () => {
      if (inArena() && raid.pvp) { const f = lastEnemy && entById(lastEnemy.id); return f && f !== player ? positionalOf(player, { x: f.x, y: f.y, facing: f.angle || 0 }) : 'front'; }
      if (inArena()) return positionalOf(player, { x: raid.boss.x, y: raid.boss.y, facing: raid.boss.f });
      return lastEnemy ? positionalOf(player, { x: lastEnemy.x, y: lastEnemy.y, facing: Math.PI / 2 }) : 'front';
    },
    // a Houndmaster (kennel.js): the facing of the enemy it works (the hounds' left and right are the boss's own) and Shift held at the press
    bossFace: () => (inArena() && raid.boss && Number.isFinite(raid.boss.f) ? raid.boss.f : Math.PI / 2),
    shift: () => shiftDown,
    allyTarget: (a, ab) => allyTargetId(ab),
    gearMods: () => Inventory.mods(player.cls && player.cls.id),
    talents: () => activeTalents(),
    known: () => new Set(Save.found(player.cls ? player.cls.id : '')),   // hidden recipes found (Volatile Reactions)
    discover: (a, id) => { if (player.cls) Save.discover(player.cls.id, id); },
    isDead: id => { if (!inArena()) return false; const s = raid.party.get(id); return !!s && !s.alive; },
    // an ally's health 0..1 (the Alembist's Throw glow and Magnum Opus charge): the party's in the arena, your own in town
    allyHp: id => {
      if (!inArena()) { if (id !== Net.id) return 1; const s = myState(); return s && s.maxHp ? Math.max(0, s.hp / s.maxHp) : 1; }
      const s = raid.party.get(id); return s && s.maxHp ? (s.alive === false ? 0 : Math.max(0, s.hp / s.maxHp)) : null;
    },
    defaultLink: () => (inArena() && raid.boss.tg != null ? raid.boss.tg : Net.id),
    partyMods: () => {
      const m = { dmg: 0, crit: 0, haste: 0 };
      for (const b of (inArena() ? raid.pbuffs : town.buffs)) if (b.end > now) m[b.kind] = Math.max(m[b.kind] || 0, b.value);
      if (inArena() && raid.bond) { m.dmg += raid.bond.dmg; m.crit += raid.bond.crit; m.haste += raid.bond.haste; }   // gear party bonus
      return m;
    },
    targetMods: () => ({ vuln: inArena() ? (raid.boss.v || 0) : (town.vulnEnd > now ? town.vuln : 0) }),
    selfMods: () => {
      const s = myState(), m = { dmgDown: inArena() && s && s.dd ? FIGHT.DMG_DOWN : 0, dmg: 0, haste: 0 };
      // a healer's buff on you (engine.js ALLY_BUFFS: the host's 'abuff'; in town, your own on yourself)
      for (const b of (inArena() ? raid.abuffs : town.abuffs)) if (b.to === Net.id && b.end > now) m[b.kind] = Math.max(m[b.kind] || 0, b.value);
      return m;
    },
    recentDamage: (a, secs) => (inArena() ? raid.taken : town.taken).filter(d => d.t > now - secs).reduce((x, d) => x + d.a, 0),
    hpFrac: () => { const s = myState(); return s && s.maxHp ? Math.max(0, s.hp / s.maxHp) : 1; },
    // the boss as talents see it (kits.js bossNow): its cast bar, the next move in the bnext feed, who it's on
    boss: () => {
      if (!inArena()) return townKenBoss();   // (a Kenseier on the sparring dummy: its swings are the blows; null for everyone else)
      if (!raid || raid.state !== 'live') return null;
      const c = raid.cast && now <= raid.cast.start + raid.cast.dur ? raid.cast : null, s = myState();
      const n = raid.bnext && raid.bnext.l.length ? Math.max(0, raid.bnext.l[0][1] - (now - raid.bnext.at)) : null;
      // wide: a raidwide is on its way (its cast is up, its telegraph is down, or it's next in the feed within 5s): an Alembist's Salt glows
      const RW = typeof RAID_CASTS !== 'undefined' ? RAID_CASTS : null;
      const wide = (c && RW && RW.test(c.name)) || [...raid.tgs.values()].some(tg => tg.type === 'raidwide' && tg.gone == null && now < tg.start + tg.dur) ||
        !!(RW && raid.bnext && raid.bnext.l.some(e => { const left = e[1] - (now - raid.bnext.at); return RW.test(e[0]) && left > -0.5 && left < 5; }));
      // (hitIn / hitKind: the Kenseier's closing ring, the next blow aimed at you; posture: the bar on the boss, fight.js kenPack)
      const ring = kenRing();
      return { casting: !!c, castLeft: c ? c.start + c.dur - now : 0, next: n, onMe: raid.boss.tg === Net.id, vuln: raid.boss.v || 0, selfVuln: !!(s && s.vuln), wide: !!wide,
        hitIn: ring ? ring.at : null, hitKind: ring ? ring.kind : null, posture: raid.posture || null,
        hp: raid.boss && raid.boss.mx > 0 ? Math.max(0, Math.min(1, raid.boss.hp / raid.boss.mx)) : null };   // (the boss's health 0..1: a Houndmaster's Shared Kill)
    },
    maxHp: () => { const s = myState(); return s ? s.maxHp : playerBaseHp(player.cls ? player.cls.role : 'dps') + (Inventory.mods(player.cls && player.cls.id).hp || 0); },
    onEvent: (a, ev) => onKitEvent(ev),
    // classes-c (kits.js, stagecraft.js): the cursor, the room's props a Doll bumps into, this weaver's threads (from the
    // host's 'thr' list; null in town), and where your Dolls are (sent to the host 10 times a second)
    aim: () => (started && mouse.x != null ? mouseWorld() : null),
    // the enemy you have chosen (clicked or tabbed to), or null: a Marionettist's Doll only goes to work on that one
    picked: () => { const t = lockedTarget(); return t ? { id: lockedEnemy, x: t.x, y: t.y, r: t.r } : null; },   // (each dummy its own id: a new pick sends a parked Doll back to work)
    collide: (a, o, r) => {
      if (inArena()) { clampArena(o); if (raid.room.props.length) PROPS.collide(o, raid.room.props, r); }
      else { o.x = clamp(o.x, 40, WORLD.w - 40); o.y = clamp(o.y, 40, WORLD.h - 40); }
    },
    threads: () => (inArena() ? Stagecraft.threadsOf(Net.id, entById) : null),
    dolls: (a, list) => Stagecraft.setMine(list, player.cls && player.cls.id, actor && actor.kit),
    lamps: (a, list) => Lamps.setMine(list, now),   // a Lanternkeeper's lanterns (lanterns.js; sent to the host 10 times a second)
    hounds: (a, list) => Kennel.setMine(list, player.cls && player.cls.id, actor && actor.kit),   // a Houndmaster's hounds (kennel.js; sent to the host 10 times a second)
    // a telegraph about to land on a spot (a circle, cone, spread or cleave due within `within` s): Pirouette glows for its Doll
    danger: (a, x, y, within) => inArena() && [...raid.tgs.values()].some(tg => tg.gone == null && !tg.hidden && ['aoe', 'spread', 'buster'].includes(tg.type) &&
      tg.start + tg.dur - now <= within && SHAPES.contains(tg.live || tg.shape, x, y, 12)),
    // a tank pressed its taunt carrier (kits.js TAUNT_CARRY; CombatActor checked the taunt is ready): taunt the move's
    // enemy (or the one you face) unless it is already on you. The host applies it and shows everyone ('fev' taunt).
    taunt: (a, tg0) => {
      if (!inArena() || raid.state !== 'live' || amDead()) return false;
      const tg = tg0 && typeof tg0 === 'object' && tg0.id != null ? tg0 : world.findEnemy(a, { range: TAUNT.range });
      if (!tg || (tg.id === 'boss' && raid.boss.tg === Net.id)) return false;
      a.useTaunt(now);
      playTaunt(player, enemyNow(tg.id) || tg, true);
      sendCombat({ type: 'taunt', tgt: tg.id });
      return true;
    },
    // the Ultimate's passive trickle runs while a raid is live (in town: while you're hitting a dummy)
    inCombat: () => (inArena() ? raid.state === 'live' : null),
  };

  // --- ally targeting: party frame under the mouse > clicked ally > ally nearest the cursor > yourself
  function allyList() {
    if (inArena()) return raid.roster.map(r => ({ id: r.id, ent: entById(r.id) })).filter(c => c.ent);
    return [{ id: Net.id, ent: player }, ...[...remotes.values()].filter(r => r.scene === 0).map(r => ({ id: r.id, ent: r }))];
  }
  function validAlly(id, ab) {
    if (!inArena()) return id === Net.id || (remotes.has(id) && remotes.get(id).scene === 0);
    const s = raid.party.get(id);
    if (!s || !raid.rosterIds.has(id)) return false;
    if (raid.pvp && raid.pvp.teams[id] !== raid.pvp.myTeam) return false;   // (PvP: an opponent is no ally)
    return s.alive || !!(ab && ab.allowDead);
  }
  function softAlly(ab) {
    const m = mouseWorld();
    let best = null, bd = 70;
    for (const c of allyList()) {
      const d = Math.hypot(c.ent.x - m.x, c.ent.y - m.y);
      if (d < bd && validAlly(c.id, ab)) { bd = d; best = c.id; }
    }
    return best;
  }
  // the ally the cursor is right on top of (a tight hit test, unlike softAlly's nearest-within-reach), or null
  function hoverAlly(ab) {
    if (!started || mouse.x == null) return null;
    const id = allyUnderMouse();
    return id != null && validAlly(id, ab) ? id : null;
  }
  // ` locks the most hurt ally; pressing it again quickly moves on to the next most hurt
  let hurtCycleAt = -9;
  function lockMostHurt() {
    const list = partyOrder().filter(id => validAlly(id)).map(id => {
      const s = inArena() ? raid.party.get(id) : null;
      return { id, f: s && s.maxHp > 1 ? s.hp / s.maxHp : 1 };
    }).sort((a, b) => a.f - b.f || a.id - b.id);
    if (!list.length) return;
    const i = list.findIndex(x => x.id === lockedAlly);
    lockedAlly = now - hurtCycleAt < 1.5 && i >= 0 ? list[(i + 1) % list.length].id : list[0].id;
    hurtCycleAt = now;
  }
  // Shift + a heal key casts it on yourself (kept until that press fires, since presses can queue)
  let selfCast = null;
  function allyTargetId(ab) {
    if (selfCast && now < selfCast.until && actor && actor.abilities[selfCast.i] === ab && validAlly(Net.id, ab)) return Net.id;
    // mouseover (a setting, on unless turned off): a party frame or an ally you point at takes the heal, ahead of your locked ally
    if (mouseoverOn()) {
      if (hoverFrame != null && validAlly(hoverFrame, ab)) return hoverFrame;
      const under = hoverAlly(ab);
      if (under != null) return under;
    }
    if (lockedAlly != null && validAlly(lockedAlly, ab)) return lockedAlly;
    // a tank (Spellwarden) is usually pointing at the boss, not an ally: only a frame or a locked ally counts
    if (player.cls && player.cls.role === 'tank') return Net.id;
    const s = softAlly(ab);
    return s != null ? s : Net.id;
  }
  function mouseoverOn() { return Save.setting('mouseover', true) !== false; }
  function selfBarOn() { return Save.setting('selfbar', false) === true; }
  // how far out you've scrolled the raid camera (1 = the usual framing; the wheel takes it out to 0.8)
  function camOut() { const v = Number(Save.setting('camout', 1)); return v >= 0.8 && v <= 1 ? v : 1; }
  function healerish() { return actor && actor.abilities.some(a => a.target === 'ally'); }
  // the next blow aimed at you, for a Kenseier's ring: a boss auto while it is on you, or a tankbuster telegraph that names you.
  // { at: seconds until it lands (a little negative: it just did), kind: 'auto' | 'buster' }, or null
  function kenRing(id = Net.id) {   // (id: whose blow; the ring is drawn for every Kenseier in the raid, drawKenRing)
    if (!inArena()) return id === Net.id ? townKenRing() : null;   // (the yard: the sparring dummy's next swing)
    if (!raid || raid.state !== 'live') return null;
    let best = null;
    if (raid.boss.tg === id && raid.nextAutoAt != null) best = { at: raid.nextAutoAt - now, kind: 'auto' };
    for (const tg of raid.tgs.values()) {
      if (tg.type !== 'buster' || tg.gone != null || !(tg.target === id || tg.follow === id)) continue;
      const at = tg.start + tg.dur - now;
      if (at > -0.3 && (!best || at < best.at)) best = { at, kind: 'buster' };
    }
    return best && best.at > -0.3 ? best : null;
  }

  // --- kit events
  const SIM_EVENTS = new Set(['damage', 'heal', 'hot', 'shield', 'mit', 'raise', 'rewind', 'selfDamage', 'targetDebuff', 'partyBuff', 'allyBuff', 'snap', 'pool', 'brand', 'taunt', 'splash',
    'maw', 'ledger', 'gloom',   // (the Gorgemaw's jaw, the Oathbroker's Ledger and the Gloomsworn's vessel: fight.js classEvent)
    'tie', 'snip', 'tighten', 'tapestry', 'tug',   // (the Threadweaver's threads: fight.js weaveEvent)
    'lamp',   // (a Lanternkeeper's lanterns burst: fight.js lampEvent)
    'kensei',   // (a Kenseier's deflect, Mikiri Step and Posture: fight.js KENSEI_HOST)
    'horn',   // (a Houndmaster's Hunting Horn: fight.js, the boss's face)
    'lb',   // (a Limit Break: fight.js limitBreak)
    'ult']);   // (an Ultimate pressed, for the contribution score: kitFx)
  const EV_FIELDS = ['type', 'amount', 'crit', 'target', 'ticks', 'interval', 'id', 'dur', 'tag', 'pct', 'kind', 'value', 'secs', 'threat', 'tgt', 'r', 'not',
    'up', 'sh', 'cl', 'pa', 'ps', 'pr', 'fol',   // (a thrown vial's splash: fight.js splash())
    'all', 'op', 'older', 'mark', 'freeze', 'drop', 'merge', 'hit', 'push', 'due', 'col', 'small', 'tithe', 'mult',   // (jaw and Ledger orders)
    'pair', 'mx', 'st', 'dp', 'hm', 'seam', 'both', 'mit', 'keep', 'ub',
    'lid', 'full', 'last'];   // (a lantern's burst: fight.js lampEvent)   // (threads; ub: a hit of an Ultimate or its window)
  function packEv(ev) {
    const o = {};
    for (const k of EV_FIELDS) if (ev[k] !== undefined) o[k] = ev[k];
    if (o.target && typeof o.target === 'object') delete o.target;
    return o;
  }
  let failAt = 0;

  function onKitEvent(ev) {
    switch (ev.type) {
      case 'used': {
        // (a named move a paced kit's press completed isn't on the bar itself: it names its button in `slot`)
        const ab = ev.ab, i = actor.abilities.includes(ab) ? actor.abilities.indexOf(ab) : (ab.slot ?? -1);
        if (selfCast && selfCast.i === i) selfCast = null;
        let tx = player.x, ty = player.y, ally = null;
        if (ab.target === 'enemy' && ev.target) { tx = ev.target.x; ty = ev.target.y; lastEnemy = ev.target; }
        else if (ab.target === 'ally' && typeof ev.target === 'number') {
          ally = ev.target; const e = entById(ev.target); if (e) { tx = e.x; ty = e.y; }
        } else {
          const e = enemyPos(); if (e) { tx = e.x; ty = e.y; } else { const m = mouseWorld(); tx = m.x; ty = m.y; }
        }
        FX.cast(player, ab, tx, ty, { mine: true, tent: ally != null ? entById(ally) : null, step: ev.st });
        if (SH) { SH.castEnd(); SH.ability(player.cls.id, ab, true, null, Net.id); if (ab.ult) SH.vo('hero-ult', { classId: player.cls.id, ability: ab.id }); }
        Net.send(Object.assign({ t: 'cast', i, a: ab.fxId || ab.id, x: rnd(player.x), y: rnd(player.y), tx: rnd(tx), ty: rnd(ty), ally, s: scene === 'arena' ? 1 : 0, c: +rnow.toFixed(3) }, Number.isInteger(ev.st) ? { st: ev.st } : null));
        break;
      }
      case 'auto': {
        // your weapon strikes on its own; aim it at whatever it hit and show everyone
        const t = ev.target;
        if (t && typeof t === 'object') {
          lastEnemy = t;
          autoAlt = !autoAlt;
          playAuto(player, t.x, t.y, ev.kind, true, autoAlt);
          if (SH) SH.auto(player.cls.id, ev.kind, true, null, Net.id);
          Net.send({ t: 'auto', k: ev.kind, tx: rnd(t.x), ty: rnd(t.y), a: autoAlt ? 1 : 0, s: scene === 'arena' ? 1 : 0 });
        }
        break;
      }
      case 'castStart':
        // a real cast: the hero channels it (see drawChannel in heroes.js)
        player.st.action = { type: 'cast', t0: now, dur: Math.max(0.55, ev.dur), channel: true };
        // a cast pressed on the move stops you where you stand instead of breaking at once: walking again (a new right
        // click) is what cancels it, so a right button still held from the walk stops steering until it's pressed again
        if (!player.dashMove) { player.target = null; player.interact = null; player.st.moving = false; mouse.holdOff = true; }
        // (h: a heal's expected size on the ally it's aimed at, to: who; the party frames preview it: frameMarks)
        player.castBar = { ab: ev.ab, t0: now, dur: ev.dur, to: ev.h > 0 ? ev.target : null, h: ev.h > 0 ? ev.h : 0 };
        Net.send(Object.assign({ t: 'castStart', i: actor.abilities.indexOf(ev.ab), dur: +ev.dur.toFixed(2) }, ev.h > 0 ? { h: ev.h, to: ev.target } : null));
        if (typeof CAST_VFX !== 'undefined') CAST_VFX.start(player, ev.dur, ev.ab);   // the gathering (it follows castBar to its end)
        if (SH) SH.castStart(player.cls.id, ev.ab);
        break;
      case 'interrupted':
        player.st.action = null; if (player.castBar && player.castBar.stop == null) player.castBar.stop = now;   // (its bar shows the interrupt: drawCastBar)
        Net.send({ t: 'castStop' });
        if (SH) SH.castEnd();
        FX.text(player.x, player.y - 60, 'Interrupted', '#ff9a8a', 14, 1, { kind: 'call' });
        break;
      case 'fail':
        if (now - failAt < 0.6 || ev.reason === 'cooldown') break;
        failAt = now;
        if (SH) SH.play('ui-error', { bus: 'ui', key: 'ui-error', minGap: 0.5 });
        FX.text(player.x, player.y - 56, ev.reason === 'target' ? (ev.ab.target === 'enemy' ? (inArena() && (raid.boss.u || (raid.state !== 'live' && raid.state !== 'prepull')) ? 'No target' : 'Out of range') : 'No target') : ev.reason === 'winded' ? 'Winded' : 'Not ready', '#c8c0d8', 12, 0.7, { kind: 'quiet' });
        break;
      case 'fxLocal': playKitFx(player, ev.name, true, ev.data); break;   // a class moment only you see (an Ironpalm's Crisp press)
      case 'teleport': if (pvpCarrying()) ctfLetGo(); if (ev.where && ev.where !== 'behind') kitMove(ev); else teleportBehind(); break;   // (capture the flag: a blink lets go of the flag)
      case 'fx': kitFx(ev.name, ev.data); if (ev.name === 'ult-spent' && inArena()) sendCombat({ type: 'ult' }); break;
      case 'damage': onMyDamage(ev); break;
      default:
        if (SIM_EVENTS.has(ev.type)) {
          if (inArena()) {
            sendCombat(ev);
            if (ev.type === 'heal' || (ev.type === 'splash' && ev.amount)) showHeal(ev.target, ev.amount, ev.crit);
            if ((ev.type === 'shield' || ev.type === 'mit') && ev.target === 'party') partyWard(ev);
          } else townEvent(ev);
        }
    }
  }

  // a shield or damage cut you put on the whole party: everyone sees it flash on every member (KIT_VFX.partyWard);
  // one flash for a move that does both (a shield and a cut together)
  let wardAt = -9;
  function partyWard(ev) {
    if (now - wardAt < 0.3) return;
    wardAt = now;
    kitFx('partyWard', ev.type === 'mit' ? { m: 1 } : null);
  }
  const PRE_PULL = new Set(['hot', 'shield', 'mit', 'partyBuff', 'pool']);
  function sendCombat(ev) {
    if (!inArena()) return;
    // a shield, mitigation or heal over time put up in the countdown lands at the pull (what's left of it), instead of
    // its cooldown being spent for nothing; damage before the pull has nothing to hit
    if ((raid.state === 'countdown' || raid.state === 'prepull') && PRE_PULL.has(ev.type)) { (raid.prePull || (raid.prePull = [])).push({ ev, at: now }); return; }
    const e = packEv(ev);
    // before the pull only a blow on the boss goes out: it's what starts the fight
    const pullHit = raid.state === 'prepull' && e.type === 'damage' && (e.tgt == null || e.tgt === 'boss');
    if (raid.state !== 'live' && !pullHit) return;
    if (Net.isHost && (pvpHost || raidHost)) (pvpHost || raidHost).onPlayerEvent(Net.id, e);   // (a PvP match's host: pvp-ui.js)
    else Net.send({ t: 'cev', ev: e });
  }

  // An auto-attack: a light version of the hero's attack animation (only if they aren't mid-ability) and a small
  // effect. Casters flick a spark; weapons swing or shoot. alt flips the swing direction each time.
  let autoAlt = false;
  function playAuto(ent, tx, ty, kind, mine, alt) {
    if (!ent || !ent.st) return;
    const ang = Math.atan2(ty - ent.y, tx - ent.x);
    if (!(ent.faceLock > now)) faceToward(ent, ang, 0.35);
    const busy = ent.st.action && (ent.st.action.channel || actP(ent.st) >= 0);
    if (!busy) ent.st.action = kind === 'spark' || kind === 'rune' ? { type: 'cast', t0: now, dur: 0.34 } : { type: 'attack', t0: now, dur: 0.4, alt };
    const fn = AUTO_VFX[kind];
    if (!fn) return;
    const dim = mine ? 0.85 : 0.5;
    const delay = kind === 'spark' || kind === 'rune' ? 0.1 : kind === 'shot' ? 0.16 : 0.1;
    FX.later(delay, () => {
      VFX.setScale(dim);
      try {
        fn({ ent, tx, ty, ang, alt, color: ent.cls ? ent.cls.accent : '#ffffff',
          later: (d, f) => FX.later(d, () => { VFX.setScale(dim); try { f(); } finally { VFX.setScale(1); } }) });
      } finally { VFX.setScale(1); }
    });
  }

  function showHeal(target, amount, crit) {
    const ids = target === 'party' ? allyList().map(c => c.id) : [target === 'self' || target === 'lowest' || target == null ? Net.id : target];
    for (const id of ids) {
      const e = entById(id);
      // (beside the body, right of it: clear of the name tag and the bar over their head)
      if (e && amount >= 1) FX.text(e.x, e.y - (e.lift || 0) - 18, '+' + rnd(amount), crit ? '#b6ff9a' : '#7dff8a', crit ? 17 : 14, 1, { kind: 'heal' });
      if (SH && id === Net.id && amount >= 1) SH.play('heal-land', { vol: 0.55, key: 'heal-land', minGap: 0.3 });
    }
  }

  // a hit's size next to what this hero usually deals (a running average of its ability hits): a bigger-than-usual one
  // is drawn a little larger, a small one a little smaller, so a finisher or a burst reads without any flash
  const dmgAvg = { v: 0, n: 0 };
  function hitScale(ev) {
    if (ev.auto || ev.dot || !(ev.amount > 0)) return 1;
    const avg = dmgAvg.v;
    dmgAvg.v = dmgAvg.n ? avg * 0.85 + ev.amount * 0.15 : ev.amount; dmgAvg.n++;
    if (dmgAvg.n < 4 || !(avg > 0)) return 1;
    return Math.max(0.85, Math.min(1.7, 1 + 0.4 * Math.log2(ev.amount / avg)));
  }

  function onMyDamage(ev) {
    // auto-attacks and DoTs get small, muted numbers so the abilities stay the headline
    const sc = hitScale(ev);
    // (an Ultimate's own hit is the one big number of its moment)
    const ultHit = !!(ev.ab && ev.ab.ult);
    const big = Math.round((ev.auto ? (ev.crit ? 15 : 12) : ev.crit ? 21 : ev.dot ? 12 : 15) * sc * (ultHit ? 1.55 : 1));
    const col = ultHit ? '#ffe9a8' : ev.auto ? (ev.crit ? '#f2d488' : '#cfc6b4') : ev.crit ? '#ffd84a' : ev.dot ? '#d8d0c0' : '#ffffff';
    const txt = rnd(ev.amount) + (ev.crit ? '!' : '') + (ev.positional ? ' ◆' : '');
    // how it moves (fx.js TEXT_KINDS): autos and DoTs small and quick, a crit pops harder, an Ultimate's hit hardest
    const tk = { kind: ultHit ? 'ult' : ev.auto || ev.dot ? (ev.dot ? 'dot' : 'auto') : ev.crit ? 'crit' : 'hit' };
    if (SH && ev.crit && !ev.dot && ev.amount > 0) SH.play('crit', { vol: ev.auto ? 0.35 : 0.6, key: 'crit', minGap: 0.08 });
    if (SH && !inArena() && lastEnemy && lastEnemy.dummy && !ev.dot) SH.play('dummy-hit', { vol: 0.45, at: lastEnemy.dummy, key: 'dummy-hit', minGap: 0.1 });
    if (inArena()) {
      // damage goes to whatever you last aimed at (DoTs keep ticking on your current target)
      const tgt = ev.tgt != null ? ev.tgt : lastEnemy && lastEnemy.id != null && lastEnemy.id !== 'dummy' ? lastEnemy.id : 'boss';
      sendCombat(Object.assign({}, ev, { tgt }, ev.ab && (ev.ab.ult || ev.ab.ultOf) ? { ub: 1 } : null));
      if (raid.pvp) return;   // (in PvP the number shown is the blow as it landed: 'phit')
      // [boss presentation] the boss flinches at your blow (DoT ticks don't; a crit or an Ultimate harder; throttled)
      if (tgt === 'boss' && !ev.dot && ev.amount > 0 && raid.state === 'live') BOSS_VFX.bossHit(raid.bossDraw, ultHit ? 1 : ev.crit ? 0.75 : ev.auto ? 0.3 : 0.45);
      const at = enemyNow(tgt) || { x: raid.boss.x, y: raid.boss.y };
      FX.text(at.x, at.y - (tgt === 'boss' ? 70 : 34), txt, col, tgt === 'boss' ? big : big - 2, 0.9, tk);
      return;
    }
    const d = lastEnemy && lastEnemy.dummy;
    if (!d) return;
    d.st.hit = now;
    const K = town.ken && town.ken.actor === actor ? town.ken : null, more = K && kenBrk(K) ? 1 + KENSEI.BREAK_DMG : 1;   // (a Break: the dummy takes 15% more, as a boss does)
    FX.text(d.x, d.y - 40, more > 1 ? rnd(ev.amount * more) + (ev.crit ? '!' : '') + (ev.positional ? ' ◆' : '') : txt, col, big, 0.9, tk);
    if (!town.meter || now - town.meter.last > 6) town.meter = { start: now, dmg: 0, last: now, gcd0: actor.kit.stats.gcdTime };
    town.meter.dmg += ev.amount * more; town.meter.last = now;
  }

  // Training-yard stand-ins for what the host does in a raid.
  function townEvent(ev) {
    switch (ev.type) {
      case 'heal': showHeal(ev.target, ev.amount, ev.crit); break;
      case 'partyBuff': town.buffs.push({ kind: ev.kind, value: ev.value, end: now + ev.dur }); break;
      case 'allyBuff':   // (no host in town: only one on yourself takes)
        if (ev.target === 'self' || ev.target === Net.id) { town.abuffs = town.abuffs.filter(b => b.end > now && b.id !== ev.id); town.abuffs.push({ to: Net.id, id: ev.id, kind: ev.kind, value: ev.value, end: now + ev.dur, from: Net.id }); }
        break;
      case 'targetDebuff': if (ev.kind === 'vuln') { town.vuln = ev.value; town.vulnEnd = now + ev.dur; } break;
      case 'mit': if (ev.target === 'self' || ev.target === Net.id || ev.target === 'party') town.mits.push({ kind: ev.kind, pct: ev.pct, start: now, end: now + ev.dur }); break;
      case 'shield':
        if (ev.target === 'self' || ev.target === Net.id || ev.target === 'party') {
          if (ev.tag === 'item' && town.shield && town.shield.end > now && town.shield.amount >= ev.amount) break;   // (an item's ward never replaces a stronger shield)
          if (town.shield) endTownShield();
          town.shield = { amount: ev.amount, max: ev.amount, end: now + (ev.dur || 15), tag: ev.tag };
        } else if (ev.tag === 'ward' && actor) {
          // a Spellwarden's Ward on a friend in town soaks nothing (no host here), but still ends with its blast
          const a = actor; later(ev.dur || 8, () => { if (actor === a) a.notify('shieldEnd', { tag: 'ward', frac: 0 }); });
        }
        break;
      case 'kensei': townKenEvent(ev); break;   // a Kenseier's deflect, Posture and Break: the sparring dummy (townKen)
      case 'maw': case 'ledger': if (typeof CLASS_TOWN !== 'undefined') CLASS_TOWN.event(town, ev, now, actor); break;   // the advanced tanks on the sparring dummy
    }
  }
  function endTownShield() {
    const s = town.shield; if (!s) return;
    town.shield = null;
    actor && actor.notify('shieldEnd', { tag: s.tag, frac: 1 - Math.max(0, s.amount) / s.max });
  }
  // ---- a Kenseier on the sparring dummy. The yard plays host with the raid host's own Posture functions (fight.js FightSim.kenYard:
  // kenEvent / kenIncoming / kenTick), so a deflect is judged by the same KENSEI rules. The dummy's swings are the blows (every
  // fourth is heavy: a tankbuster) and its Posture fills, recovers and Breaks; Broken, it is staggered (no swings) and takes 15%
  // more. Only a Kenseier has any of this: for everyone else the yard is as it was.
  const kenBrk = K => !!(K.sim.boss.post && K.sim.boss.post.until > now);
  const townSpar = () => dummies.find(d => d.spar && Math.hypot(player.x - d.x, player.y - d.y) < 140) || null;   // (the sparring dummy you stand at)
  function townKen() {
    if (!actor || !player.cls || player.cls.id !== 'kenseier') return null;
    if (town.ken && town.ken.actor === actor) return town.ken;
    const sim = FightSim.kenYard(() => ({ id: Net.id, x: player.x, y: player.y }), m => {
      if (m.t !== 'fev' || !actor) return;
      if (m.k === 'kdef' || m.k === 'kbrk' || m.k === 'kbend') actor.notify(m.k, m);
      const d = dummies.find(x => x.spar);
      if (m.k === 'kbrk' && d) d.windup = 0;   // (staggered: a swing in the air is gone)
      if (m.k === 'kbend' && d && d.nextSwing) d.nextSwing = now + 0.8;   // (it finds its feet and swings again)
    });
    sim.t = now;
    return (town.ken = { actor, sim, s: sim.ps.get(Net.id) });
  }
  // the next blow aimed at you (kind 'buster' for the heavy swing), a moment after it too: the closing ring and the Deflect's glow
  function townKenRing() {
    const K = townKen(), d = K && townSpar();
    if (!d || kenBrk(K)) return null;
    if (d.hitAt != null && now - d.hitAt < 0.3) return { at: d.hitAt - now, kind: d.hitKind };
    if (!d.nextSwing) return null;
    return { at: d.nextSwing - now, kind: ((d.swings || 0) + 1) % 4 === 0 ? 'buster' : 'auto' };
  }
  // the boss as the kit sees it (kits.js bossNow), while you stand at the sparring dummy
  function townKenBoss() {
    const K = townKen(), d = K && townSpar();
    if (!d) return null;
    const ring = townKenRing(), cast = K.sim.boss.cast;
    return { casting: !!cast, castLeft: cast ? Math.max(0, cast.end - now) : 0, next: null, onMe: true, vuln: 0, selfVuln: false, wide: false,
      hitIn: ring ? ring.at : null, hitKind: ring ? ring.kind : null, posture: null };
  }
  function townKenEvent(ev) {
    const K = townKen(); if (!K) return;
    K.sim.t = now; K.sim.kenEvent(Net.id, ev);
    const d = ev.op === 'duel' && dummies.find(x => x.spar);
    if (d && d.nextSwing) d.nextSwing = Math.min(d.nextSwing, now + KENSEI.DUEL_EVERY);   // (Ember Duel: a steady beat)
  }
  // every frame: the heavy swing's wind-up counts as a cast (a full bar holds until it lands, as for a boss), then Posture's own
  // tick (a Break running out, recovery), and the bar under the meter while you are at the dummy or it is not empty
  function townKenStep(dt) {
    const K = townKen();
    if (!K) { RaidUI.townPosture(null); return; }
    const sim = K.sim, d = dummies.find(x => x.spar);
    sim.t = now; K.s.alive = true;
    sim.boss.cast = d && d.windup && ((d.swings || 0) + 1) % 4 === 0 ? { name: 'Heavy blow', start: d.windup - 0.6, end: d.windup, anim: 'cast' } : null;
    sim.kenTick(dt);
    const pk = sim.kenPack();
    RaidUI.townPosture(townSpar() || pk[0] > 0 || pk[2] > 0 ? { p: pk[0], max: pk[1], broken: pk[2], hold: !!pk[3], rec: !!pk[4] } : null, dt);
  }

  // the sparring dummy's swing landing on you
  function sparHit(d) {
    const dist = Math.hypot(player.x - d.x, player.y - d.y);
    FX.add({ type: 'ring', x: player.x, y: player.y, r: 40, color: '#ff6a4a', dur: 0.35 });
    if (dist > 140 || !actor) return;
    let amt = 1300 * FIGHT.NUM_SCALE, perfect = false, reflect = false, read = false;
    town.mits = town.mits.filter(m => m.end > now);
    for (const m of town.mits) {
      if (m.kind === 'brace' && now - m.start <= FIGHT.PERFECT_WINDOW && !perfect) { perfect = true; amt *= 0.4; m.end = 0; continue; }
      if (m.kind === 'parry' && now - m.start <= FIGHT.READ_WINDOW && !read) { read = true; amt *= 0.5; m.end = 0; continue; }
      if (m.kind === 'reflect' && !reflect) { reflect = true; amt *= 0.2; m.end = 0; continue; }
      if (m.kind === 'invuln') { amt = 0; break; }
      if (m.kind !== 'living') amt *= 1 - (m.pct || 0);
    }
    // a Kenseier's deflect, judged as in a raid (Off-balance takes more, a window that covers the swing turns it aside)
    const kenK = townKen(), kind = d.heavy ? 'buster' : 'auto';
    let kd = null, kPre = 0;
    if (kenK) {
      kenK.sim.t = now;
      if (kenK.s.offbal > now) amt *= 1 + KENSEI.OFF_DMG;
      kPre = amt;
      kd = kenK.sim.kenIncoming({ id: Net.id, x: player.x, y: player.y, s: kenK.s }, kenK.s, kPre, { kind });
      if (kd) amt *= kd.mult;
    }
    if (typeof CLASS_TOWN !== 'undefined') amt = CLASS_TOWN.hit(town, amt, now, actor, player);   // an open jaw, a Ledger
    let absorbed = 0;
    if (town.shield) {
      const used = Math.min(town.shield.amount, amt);
      town.shield.amount -= used; amt -= used; absorbed = used;
      if (town.shield.amount <= 0.5) endTownShield();
    }
    amt = rnd(amt);
    if (kenK && !kd && amt > 0) kenK.sim.kenNote({ id: Net.id }, kPre, amt, { kind });   // (kept for a deflect pressed just after)
    town.taken.push({ t: now, a: amt });
    if (amt > 0) { const dd = Math.hypot(player.x - d.x, player.y - d.y) || 1; player.st.hurt = { t0: now, k: d.heavy ? 1.15 : 0.6, ax: (player.x - d.x) / dd, ay: (player.y - d.y) / dd }; }   // (the flinch: heroes.js heroPose)
    // (left of the body, clear of the name tag; what a shield ate in muted blue beside it)
    if (amt > 0) FX.text(player.x, player.y - (player.lift || 0) - 18, '-' + amt, '#ff7a6a', 14, 1, { kind: 'taken' });
    if (rnd(absorbed) >= 1) FX.text(player.x, player.y - (player.lift || 0) - 18, rnd(absorbed) + ' absorbed', '#9cc4ec', 12, 1, { kind: 'absorb' });
    if (perfect) actor.notify('perfect', { b: d.heavy ? 1 : 0 });
    if (reflect) actor.notify('reflect', { b: d.heavy ? 1 : 0 });
    if (read) actor.notify('read', { b: d.heavy ? 1 : 0 });   // (the sparring dummy's every fourth swing counts as a tankbuster)
    if (amt > 0) actor.notify('taken', kenK ? { a: amt, k: kind, df: kd ? kd.q : 0 } : { a: amt });
  }

  const ADD_R = 30;
  function arenaEnemies() {
    const out = [];
    if (raid.pvp) {
      for (const id of raid.pvp.foes) { const e = entById(id), s = raid.party.get(id); if (e && s && s.alive) out.push({ id, x: e.x, y: e.y, r: 20 }); }
      return out;
    }
    if (!raid.boss.u) out.push({ id: 'boss', x: raid.boss.x, y: raid.boss.y, r: FIGHT.BOSS_R });
    for (const a of raid.adds.values()) out.push({ id: a.id, x: a.tx, y: a.ty, r: ADD_R });
    return out;
  }
  // While you cast at something, keep turned toward it (enemies, and allies you're healing). Your facing reaches
  // everyone else through your position updates.
  function castTargetPos(t) {
    if (t == null) return null;
    if (typeof t === 'number') { const e = entById(t); return e && e !== player ? { x: e.x, y: e.y } : null; }
    if (typeof t !== 'object') return null;
    if (t.dummy) return { x: t.dummy.x, y: t.dummy.y };
    return (inArena() && enemyNow(t.id)) || { x: t.x, y: t.y };
  }
  function faceCastTarget(dt) {
    const c = actor && actor.kit.cast;
    if (!c || player.dashMove || player.kb) return;
    const p = castTargetPos(c.target);
    if (!p || Math.hypot(p.x - player.x, p.y - player.y) < 4) return;
    faceToward(player, Math.atan2(p.y - player.y, p.x - player.x), 0.25);
  }
  // Turn quickly to face something (an attack, a cast) instead of snapping: the angle is reached within a few frames
  // by turnFacing(), and the hero holds it for `hold` seconds.
  function faceToward(e, ang, hold) { e.faceTo = ang; e.faceLock = Math.max(e.faceLock || 0, now + hold); }
  function turnFacing(e, dt) { if (e.faceTo != null && now < e.faceLock) { turnToward(e, e.faceTo, dt, 24); return true; } return false; }
  // where the thing you last hit is now (as drawn, so you turn toward what you see)
  function enemyNow(id) {
    if (inArena() && raid.pvp) { const e = typeof id === 'number' ? entById(id) : null; return e && e !== player ? { x: e.x, y: e.y } : null; }
    if (!inArena() || id == null || id === 'boss') return inArena() ? { x: raid.bossDraw.x, y: raid.bossDraw.y } : null;
    const a = raid.adds.get(id);
    return a ? { x: a.x, y: a.y } : null;
  }
  function enemyPos() {
    if (inArena() && raid.pvp) { const l = lastEnemy && enemyNow(lastEnemy.id); if (l) return l; const f = arenaEnemies()[0]; return f ? { x: f.x, y: f.y } : null; }
    if (inArena()) {
      const e = lastEnemy && lastEnemy.id !== 'boss' && raid.adds.has(lastEnemy.id) ? enemyNow(lastEnemy.id) : null;
      return e || (raid.boss.u ? null : { x: raid.bossDraw.x, y: raid.bossDraw.y });
    }
    if (lockedDummy()) return lockedDummy();
    let best = null, bd = 520;
    for (const d of dummies) { const dist = Math.hypot(d.x - player.x, d.y - player.y); if (dist < bd) { bd = dist; best = d; } }
    return best;
  }

  // ---------------------------------------------------------------- tab targeting
  // Tab / Shift+Tab cycle through enemies nearest-first (boss and adds in a raid, dummies in town).
  // Targets are local: your damage events name the target, and the host applies them.
  const lockedDummy = () => (typeof lockedEnemy === 'string' && lockedEnemy.startsWith('dummy:') ? dummies[Number(lockedEnemy.slice(6))] || null : null);
  function targetList() {
    const d = c => Math.hypot(c.x - player.x, c.y - player.y);
    if (inArena()) return arenaEnemies().sort((a, b) => d(a) - d(b));
    return dummies.map((m, i) => ({ id: 'dummy:' + i, x: m.x, y: m.y, r: 22 })).filter(c => d(c) < 900).sort((a, b) => d(a) - d(b));
  }
  function cycleTarget(dir) {
    const list = targetList();
    if (!list.length) { lockedEnemy = null; return; }
    const i = list.findIndex(c => c.id === lockedEnemy);
    const next = list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length];
    lockedEnemy = next.id;
    VFX.shock(next.x, next.y, { r0: next.r + 40, r: next.r + 8, color: '#ff6a5a', w: 3, dur: 0.25 });
  }
  // where the locked target is right now (null if it's gone)
  function lockedTarget(id = lockedEnemy) {
    if (id == null) return null;
    if (inArena() && raid.pvp) {
      const e = typeof id === 'number' && raid.pvp.foes.includes(id) ? entById(id) : null, s = e && raid.party.get(id);
      return e && s && s.alive ? { x: e.x, y: e.y, r: 20, name: pvpName(id), hp: s.hp, mx: s.maxHp } : null;
    }
    if (inArena()) {
      if (id === 'boss') return raid.boss.u ? null : { x: raid.bossDraw.x, y: raid.bossDraw.y, r: FIGHT.BOSS_R * 0.9, name: raid.def.name, hp: raid.boss.hp, mx: raid.boss.mx, boss: true, tg: raid.state === 'live' ? raid.boss.tg : null };
      const a = raid.adds.get(id);
      return a ? { x: a.x, y: a.y, r: ADD_R, name: a.enr ? 'Enraged Spiderling' : 'Spiderling', hp: a.hp, mx: a.mx } : null;
    }
    if (id !== lockedEnemy) return null;   // (the focus is a raid thing)
    const d = lockedDummy();
    return d ? { x: d.x, y: d.y, r: 22, name: d.spar ? 'Sparring Dummy' : 'Training Dummy', hp: 1, mx: 1, dummy: true } : null;
  }
  // the focus (V): a second enemy kept in its own frame (an add to watch while you hit the boss, or the reverse)
  let focusEnemy = null;
  function setFocus() {
    if (!inArena()) return;
    focusEnemy = lockedEnemy != null && lockedEnemy !== focusEnemy ? lockedEnemy : null;
    toast(focusEnemy == null ? 'Focus cleared.' : `Focus: ${(lockedTarget(focusEnemy) || {}).name || 'target'}.`);
  }
  // who an enemy is hitting, as a line for its frame
  function totHtml(t) {
    if (!t || t.tg == null || !inArena()) return '';
    const r = raid.roster.find(x => x.id === t.tg);
    if (!r) return '';
    return `<em class="tf-tot" style="--rc:${ROLES[r.role].color}">→ ${t.tg === Net.id ? 'You' : escapeHtml(r.name)}</em>`;
  }
  // the boss's chest where he fell: it drops in with a bounce, glows while there's anything in it
  let chestFx = null;   // the chest's own animation: { born, t0, last, openK, landed }
  function drawChest() {
    const c = Loot.chestAt();
    if (!c) { chestFx = null; return; }
    // (timed on the game clock from the moment this chest first shows; c.born only tells one chest from the next)
    if (!chestFx || chestFx.born !== c.born) chestFx = { born: c.born, t0: now, last: now, openK: 0, landed: false };
    const cf = chestFx, age = now - cf.t0, cdt = clamp(now - cf.last, 0, 0.1);
    cf.last = now;
    // it falls (0.42s), lands with a puff of dust and a squash, and bounces once
    const fallQ = Math.min(1, age / 0.42), air = (1 - fallQ * fallQ) * 120 + (age > 0.42 && age < 0.64 ? Math.sin((age - 0.42) / 0.22 * Math.PI) * 7 : 0);
    const sq = age > 0.42 && age < 0.54 ? Math.sin((age - 0.42) / 0.12 * Math.PI) * 0.12 : age > 0.64 && age < 0.72 ? Math.sin((age - 0.64) / 0.08 * Math.PI) * 0.05 : 0;
    if (!cf.landed && age >= 0.42) {
      cf.landed = true;
      FX.add({ type: 'land', x: c.x, y: c.y + 12, color: '#d8ccb4', dur: 0.6 });
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; FX.add({ type: 'puff', x: c.x + Math.cos(a) * 26, y: c.y + 14 + Math.sin(a) * 8, r: 7, color: '#cfc2a6', dur: 0.55 }); }
    }
    // the lid swings open while the spoils are up, or once it's empty
    const want = Loot.isOpen() || c.n === 0 ? 1 : 0;
    cf.openK += (want - cf.openK) * Math.min(1, cdt * 7);
    const k = cf.openK, ink = OUT, wood = '#6e3f1d', woodD = '#4a2810', iron = '#8c8a86';
    ctx.save();
    VFX.glowAt(ctx, c.x, c.y, 70 + 24 * k, '#ffd65a', (c.n > 0 ? 0.32 + Math.sin(now * 3) * 0.1 : 0.08) * Math.min(1, age / 0.5));
    const sh = 1 - Math.min(0.6, air / 200);
    ellipse(ctx, c.x, c.y + 16, 30 * sh, 9 * sh, 0, 'rgba(0,0,0,' + (0.38 * sh).toFixed(3) + ')');
    ctx.translate(c.x, c.y + 16 - air); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(0, -16);
    const domeAt = x => { const t = (x + 26) / 52; return -6 - 48 * t * (1 - t); };
    const lid = (open) => {
      ctx.save();
      if (open) { ctx.translate(0, -6 - 11 * k); ctx.scale(1 - 0.05 * k, 1 - 0.5 * k); ctx.translate(0, 6); }
      ctx.beginPath(); ctx.moveTo(-26, -6); ctx.quadraticCurveTo(0, -30, 26, -6); ctx.closePath();
      ctx.fillStyle = open && k > 0.5 ? '#4e2c14' : '#7a4a22'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(40,18,6,0.45)'; ctx.lineWidth = 0.8;   // grain
      for (const gy of [-10, -15]) { ctx.beginPath(); ctx.moveTo(-24, gy + 2); ctx.quadraticCurveTo(-6, gy - 2, 8, gy + 1); ctx.quadraticCurveTo(16, gy + 3, 24, gy); ctx.stroke(); }
      ctx.fillStyle = iron; ctx.fillRect(-17.5, -32, 5, 30); ctx.fillRect(12.5, -32, 5, 30);   // the bands over the lid
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-17, -32, 1.2, 30); ctx.fillRect(13, -32, 1.2, 30);
      ctx.restore();
      ctx.lineWidth = 2.2; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke();
      for (const bx of [-15, 15]) circle(ctx, bx, domeAt(bx) + 3, 1, '#d8d4c8');
      ctx.restore();
    };
    if (k > 0.02) lid(true);   // (swung back, it's behind the box)
    // the box: planks with grain, iron bands with rivets, an ink outline
    rrect(ctx, -26, -6, 52, 22, 2.5, wood);
    ctx.strokeStyle = woodD; ctx.lineWidth = 1.2;
    for (const py of [1.5, 9]) { ctx.beginPath(); ctx.moveTo(-25, py); ctx.lineTo(25, py); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(36,16,6,0.45)'; ctx.lineWidth = 0.8;
    for (const [gx, gy] of [[-22, -2.5], [-4, 5], [4, 12.5], [-20, 12]]) { ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 7, gy - 1.6, gx + 14, gy + 0.5); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,220,160,0.16)'; ctx.fillRect(-25, -5, 50, 1.5);
    for (const bx of [-15, 15]) {
      rrect(ctx, bx - 2.5, -6, 5, 22, 0.8, iron, ink, 1);
      line(ctx, bx - 1.3, -5, bx - 1.3, 15, 'rgba(255,255,255,0.25)', 0.8);
      circle(ctx, bx, -2, 1, '#d8d4c8'); circle(ctx, bx, 12, 1, '#d8d4c8');
    }
    rrect(ctx, -26, -6, 52, 22, 2.5, null, ink, 2.2);
    if (k > 0.02) {
      // open: the dark inside, the gold catching the light, light spilling up and motes drifting out
      ellipse(ctx, 0, -6, 24, 5.5 * k, 0, '#24120a', ink, 1.5);
      if (c.n > 0) {
        ellipse(ctx, 0, -5.5, 18, 3.4 * k, 0, '#e8b84a');
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 0, -8, 34, '#ffd65a', 0.55 * k);
        ctx.save(); ctx.translate(0, -8); ctx.scale(0.55, 1.9); glow(ctx, 0, -12, 26, '#ffe9a0', 0.35 * k * (0.85 + 0.15 * Math.sin(now * 4))); ctx.restore();
        for (let i = 0; i < 6; i++) {
          const q = (now * 0.55 + i / 6) % 1, mx = Math.sin(i * 2.3) * 13 + Math.sin(now * 2 + i) * 3, my = -8 - q * 48;
          glow(ctx, mx, my, 5, '#ffd65a', 0.8 * k * Math.sin(q * Math.PI));
          circle(ctx, mx, my, 1.1, rgba('#fff6d8', k * Math.sin(q * Math.PI)));
        }
        ctx.restore();
      }
    } else lid(false);
    // the lock plate (on the box front; open, it hangs from the box)
    rrect(ctx, -4.5, -8 + k * 3, 9, 9, 1.5, '#e8c15a', ink, 1.2);
    circle(ctx, 0, -4.4 + k * 3, 1.3, '#3a2408'); line(ctx, 0, -4 + k * 3, 0, -1.6 + k * 3, '#3a2408', 1.1);
    ctx.restore();
    if (Math.hypot(mouseWorld().x - c.x, mouseWorld().y - c.y) < 40) label(ctx, c.n ? `Chest · ${c.n}` : 'Chest (empty)', c.x, c.y - 42, '#ffe9a8', 12);
  }
  // a small diamond over the focused enemy
  function drawFocusMark() {
    const t = focusEnemy != null && focusEnemy !== lockedEnemy ? lockedTarget(focusEnemy) : null;
    if (!t) return;
    const y = t.y - t.r - 26 + Math.sin(now * 3) * 2;
    ctx.save(); ctx.translate(t.x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#7fc8ff'; ctx.strokeStyle = '#06121c'; ctx.lineWidth = 2;
    ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
  }
  // rotating corner brackets around the locked target
  function drawReticle(t) {
    const r = t.r + 14, a0 = now * 1.6, k = 0.85 + Math.sin(now * 6) * 0.15;
    ctx.save(); ctx.translate(t.x, t.y + 4); ctx.scale(1, 0.72);
    VFX.glowAt(ctx, 0, 0, r * 1.3, '#ff5a4a', 0.18);
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * Math.PI / 2;
      VFX.neonPath(ctx, '#ff6a5a', 3, k, () => ctx.arc(0, 0, r, a - 0.38, a + 0.38));
      const tx = Math.cos(a) * (r + 7), ty = Math.sin(a) * (r + 7);
      VFX.neonPath(ctx, '#ff6a5a', 2.5, k, () => { ctx.moveTo(tx, ty); ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4)); });
    }
    ctx.restore();
  }
  const targetFrame = $('target-frame');
  let tfKey = '';
  const focusFrame = $('focus-frame');
  let ffKey = '';
  function updateTargetFrame() {
    let t = started && !panelOpen() ? lockedTarget() : null;
    if (t && !t.dummy && (t.hp <= 0 || (t.boss && raid && raid.state === 'clear'))) t = null;
    if (t && t.boss) t = null;   // (the boss bar already shows its health and who it's on: no second frame under it)   // (a fallen boss or add drops off the frame)
    const key = t ? `${t.name}|${t.dummy ? '' : Math.round(1000 * t.hp / Math.max(1, t.mx))}|${t.tg}` : '';
    if (key !== tfKey) {
      tfKey = key;
      targetFrame.classList.toggle('hidden', !t);
      if (t) {
        const f = t.dummy ? 1 : clamp(t.hp / Math.max(1, t.mx), 0, 1);
        targetFrame.innerHTML = `<b>${t.name}</b><div class="tf-bar"><i style="width:${(f * 100).toFixed(1)}%"></i><span>${t.dummy ? '∞' : (f * 100).toFixed(1) + '%'}</span></div>${totHtml(t)}`;
      }
    }
    // the focus frame (gone when its enemy is)
    if (focusEnemy != null && (!inArena() || !lockedTarget(focusEnemy))) focusEnemy = null;
    let ft = started && !panelOpen() && focusEnemy != null ? lockedTarget(focusEnemy) : null;
    if (ft && (ft.hp <= 0 || (ft.boss && raid && raid.state === 'clear'))) ft = null;
    const fk = ft ? `${ft.name}|${Math.round(1000 * ft.hp / Math.max(1, ft.mx))}|${ft.tg}` : '';
    if (fk === ffKey) return;
    ffKey = fk;
    focusFrame.classList.toggle('hidden', !ft);
    if (!ft) return;
    const f = clamp(ft.hp / Math.max(1, ft.mx), 0, 1);
    focusFrame.innerHTML = `<small>Focus</small><b>${ft.name}</b><div class="tf-bar"><i style="width:${(f * 100).toFixed(1)}%"></i><span>${(f * 100).toFixed(1)}%</span></div>${totHtml(ft)}`;
  }

  function teleportBehind() {
    FX.add({ type: 'ring', x: player.x, y: player.y, r: 32, color: '#9b5fd0', style: 'implode', dur: 0.4 });
    if (inArena()) {
      const b = raid.boss, a = b.f + Math.PI;
      player.x = b.x + Math.cos(a) * (FIGHT.BOSS_R + 45); player.y = b.y + Math.sin(a) * (FIGHT.BOSS_R + 45);
      clampArena(player);
      player.angle = Math.atan2(b.y - player.y, b.x - player.x);
    } else {
      const d = lastEnemy && lastEnemy.dummy ? lastEnemy.dummy : enemyPos();
      if (d) { player.x = d.x; player.y = d.y - 55; resolveCollisions(player); player.angle = Math.PI / 2; }
    }
    player.target = null; player.interact = null;
    FX.add({ type: 'ring', x: player.x, y: player.y, r: 38, color: '#c58aff', dur: 0.45 });
  }
  // a kit move: it plays as a dash. Talents (kits.js kitMove) use 'back' (away from the enemy), 'forward' (where you
  // face), 'ally' (toward ev.to, up to ev.d) and 'point' (ev.x, ev.y); the Driftblade's moves (kits.js kitMoveDest)
  // use 'dash', 'around' (swing round the target) and 'through' (charge through it)
  function kitMove(ev) {
    if (amDead() || player.kb || myDebuff('rooted')) return;
    const en = enemyPos(), tgt = en ? { x: en.x, y: en.y } : null;
    let dest, face = true;
    if (ev.where === 'back' || ev.where === 'forward' || ev.where === 'ally' || ev.where === 'point') {
      const d = ev.d || 140;
      dest = { x: player.x, y: player.y }; face = false;
      if (ev.where === 'back') { const a = tgt ? Math.atan2(player.y - tgt.y, player.x - tgt.x) : player.angle + Math.PI; dest.x += Math.cos(a) * d; dest.y += Math.sin(a) * d; }
      else if (ev.where === 'forward') { dest.x += Math.cos(player.angle) * d; dest.y += Math.sin(player.angle) * d; }
      else if (ev.where === 'ally') { const a = entById(ev.to); if (!a || a === player) return; const dist = Math.hypot(a.x - player.x, a.y - player.y), k = Math.max(0, Math.min(d, dist - 40)) / (dist || 1); dest.x += (a.x - player.x) * k; dest.y += (a.y - player.y) * k; }
      else if (Number.isFinite(ev.x) && Number.isFinite(ev.y)) { dest.x = ev.x; dest.y = ev.y; }
      else return;
    } else dest = kitMoveDest(ev.where, player, tgt, player.target || mouseWorld(), ev.d);
    if (inArena()) clampArena(dest); else { dest.x = clamp(dest.x, 40, WORLD.w - 40); dest.y = clamp(dest.y, 40, WORLD.h - 40); }
    player.dashMove = { sx: player.x, sy: player.y, tx: dest.x, ty: dest.y, t0: now };
    if (face) player.angle = tgt && ev.where !== 'dash' ? Math.atan2(tgt.y - dest.y, tgt.x - dest.x) : Math.atan2(dest.y - player.y, dest.x - player.x);
    player.target = null; player.interact = null;
  }
  // class moments (Perfect Block, Overheat...): the big effect plays for everyone, the text only for you
  function kitFx(name, data) {
    const x = player.x, y = player.y;
    if (name === 'ult-ready') ultReadyCue();
    const label = { perfect: ['Perfect!', '#ffe27a'], reflect: ['Reflect!', '#e0d4ff'], overheat: ['Overheat', '#ff6a3a'], lag: ['Time Lag', '#9ab8c0'], frostbite: ['Frostbite', '#9ad8ff'], riposte: ['Riposte!', '#e8fff8'], read: ['Read!', '#ffd9a0'] }[name];
    if (label) FX.text(x, y - 62, label[0], label[1], 17, 1.1, { kind: 'call' });
    playKitFx(player, name, true, data);
    Net.send(Object.assign({ t: 'kfx', k: name, s: scene === 'arena' ? 1 : 0 }, data ? { d: data } : null));
  }
  function playKitFx(ent, name, mine, data) {
    const f = Object.prototype.hasOwnProperty.call(KIT_VFX, name) ? KIT_VFX[name] : null;   // (names come over the wire: never a prototype key)
    if (!f) return;
    let target = name === 'reflect' || name === 'dawnstar' || name === 'radiant' || name === 'echo' || f.atTarget ? (ent === player ? enemyPos() : (inArena() ? { x: raid.boss.x, y: raid.boss.y } : null)) : null;
    // a moment aimed somewhere (an Alembist's vial): data.to names an ally, data.en an enemy ('boss', an add, a dummy)
    if (data && typeof data === 'object') {
      if (data.en != null) target = inArena() ? (enemyNow(data.en) || { x: raid.boss.x, y: raid.boss.y }) : (ent === player ? enemyPos() : null);
      else if (data.to != null) { const a = entById(data.to); if (a) target = a; }
      if (!target && data.self) target = ent;
    }
    VFX.setScale(mine ? 1 : 0.6);
    try { f(ent, target, data || null); } finally { VFX.setScale(1); }
  }

  // --- pressing buttons
  function pressSlot(i) {
    if (!started || panelOpen()) return;
    if (!actor) { toast('Pick a hero first.'); return; }
    if (amDead() || (inArena() && raid.state !== 'live' && raid.state !== 'countdown' && raid.state !== 'prepull')) return;
    Hud.pressed(i);   // (the slot lights, or shakes if it's still cooling: hud.js)
    if (i === 6) { doDash(); return; }
    // T (slot 7): the Ultimate (engine.js; kits without one have nothing there yet)
    actor.press(i);
  }

  // the taunt's look: the hero rears up, a shout ring, and a chain of the class's colour to whatever was taunted
  function playTaunt(ent, at, mine) {
    if (!ent) return;
    if (ent.st && !(ent.st.action && ent.st.action.channel)) ent.st.action = { type: 'big', t0: now, dur: ANIM_DUR.big || 0.6 };
    if (at) faceToward(ent, Math.atan2(at.y - ent.y, at.x - ent.x), 0.4);
    VFX.setScale(mine ? 1 : 0.6);
    try { KIT_VFX.taunt(ent, at); } finally { VFX.setScale(1); }
  }

  function doDash() {
    if (player.dashMove || player.kb || myDebuff('rooted') || !actor.useDash(now)) return;
    const m = mouseWorld();
    const to = player.target || m;
    let a = Math.atan2(to.y - player.y, to.x - player.x);
    if (Math.hypot(to.x - player.x, to.y - player.y) < 4) a = player.angle;
    const dest = { x: player.x + Math.cos(a) * DASH_DIST, y: player.y + Math.sin(a) * DASH_DIST };
    if (inArena()) clampArena(dest); else { dest.x = clamp(dest.x, 40, WORLD.w - 40); dest.y = clamp(dest.y, 40, WORLD.h - 40); }
    KIT_VFX.dash(player, player.cls.accent);
    if (SH) SH.play('dash', { vol: 0.6 });
    // dashing snaps a Silk Reel (tell the host; show it right away)
    const rl = player.reel;
    if (inArena() && rl && now >= rl.pullAt - 0.2) {
      // clear locally first: on the host, sendCombat answers synchronously with a 'reelx'
      raid.reels.delete(rl.id);
      player.reel = null;
      sendCombat({ type: 'snap' });
      BOSS_VFX.silkSnap(player, raid.bossDraw);
    }
    player.dashMove = { sx: player.x, sy: player.y, tx: dest.x, ty: dest.y, t0: now };
    player.angle = a;
    if (player.target && Math.hypot(player.target.x - dest.x, player.target.y - dest.y) < 20) player.target = null;
    Net.send({ t: 'cast', i: 6, x: rnd(player.x), y: rnd(player.y), tx: rnd(dest.x), ty: rnd(dest.y), s: scene === 'arena' ? 1 : 0, c: +rnow.toFixed(3) });
  }

  // ---------------------------------------------------------------- the raid (client side; every player)
  let raid = null;
  // host only
  let raidHost = null, hostRoster = [], stopHostTick = null, lastRaidOpts = { mode: 'normal', fill: true, boss: 'grubnak' };

  const RAID_DEFS = { grubnak: GRUBNAK, skitterra: SKITTERRA, volkar: VOLKAR, hollowking: HOLLOWKING, wyrm: WYRM, titan: TITAN };
  // a raid id is a boss id, or 'trial:<spec>' for a specialization trial (trials.js)
  RAID_DEFS.hydra = HYDRA;   // (set 2, Boss VIII: hydra.js)
  RAID_DEFS.archmage = AZERATH;   // (set 2, Boss VII: archmage.js)
  const raidDef = id => RAID_DEFS[id] || (typeof id === 'string' && id.startsWith('trial:') ? trialDef(id.slice(6)) : null);
  let hostTrial = null;   // host: the spec whose trial is running, if it's a trial
  let trialPrevSpec;      // the spec you wore before stepping into a trial (undefined when not in one)

  // a specialization trial: a solo memory against the Shade (only you go in, with the trial's own allies)
  function startTrial(specId) {
    const T = TRIALS[specId];
    if (!Net.isHost || !T || !player.cls || player.cls.id !== T.cls) return;
    stopRaidHost();
    hostTrial = specId;
    const def = trialDef(specId);
    const me = { id: Net.id, name: player.name, cls: T.cls, spec: specId, role: player.cls.role };
    hostRoster = [Object.assign({}, me, { spawn: [0, 300] })];
    raidHost = new RaidHost({ def, mode: 'normal', humans: hostHumans, bots: T.allies, seed: (Math.random() * 1e9) | 0, emit: m => Net.broadcastAll(m) });
    const roster = [me, ...raidHost.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role, bot: true }))];
    const spawns = { [Net.id]: [0, 300] };
    for (const b of raidHost.bots) spawns[b.id] = [rnd(b.x), rnd(b.y)];
    Net.broadcastAll({ t: 'raid', boss: 'trial:' + specId, mode: 'normal', roster, spawns, bond: {} });
    let lastT = performance.now(), endedAt = null;
    stopHostTick = Net.steadyInterval(() => {
      if (!raidHost) return;
      const t = performance.now();
      let dt = Math.min(0.25, (t - lastT) / 1000); lastT = t;
      while (dt > 0) { const step = Math.min(0.05, dt); raidHost.tick(step); dt -= step; }
      const st = raidHost.sim.state;
      if (st === 'clear' || st === 'wipe') { endedAt = endedAt || t; if (t - endedAt > 3000) stopRaidHost(true); }
    }, 33);
  }

  function pickBots(humans) {
    const slots = ['tank', 'healer', 'dps', 'dps'];
    for (const h of humans) {
      const i = slots.indexOf(h.role);
      if (i >= 0) slots.splice(i, 1); else slots.splice(slots.indexOf('dps') >= 0 ? slots.indexOf('dps') : 0, 1);
    }
    const taken = new Set(humans.map(h => h.cls));
    const prefs = { tank: ['bastion', 'runeguard', 'bloodreaver'], healer: ['cleric', 'grovekeeper', 'chronomancer'], dps: ['ranger', 'pyromancer', 'shadowblade'] };
    const out = [];
    for (const role of slots.slice(0, Math.max(0, 4 - humans.length))) {
      const c = prefs[role].find(id => !taken.has(id)) || prefs[role][0];
      taken.add(c); out.push(c);
    }
    return out;
  }
  function raidHumans() {
    const me = { id: Net.id, name: player.name, cls: player.cls && player.cls.id, spec: player.spec || null, role: player.cls && player.cls.role };
    const others = [...remotes.values()].filter(r => r.cls).map(r => ({ id: r.id, name: r.name, cls: r.cls.id, spec: r.spec || null, role: r.cls.role }));
    return [me, ...others].filter(h => h.cls).slice(0, 4);
  }

  function startRaid(mode, fill, bossId = lastRaidOpts.boss, practiceFrom = 0) {
    Loot.hostClose();   // a chest from the last pull is settled first
    if (!Net.isHost || !player.cls) return;
    if (mode === 'hard' && !hardOpen(BOSSES.find(b => b.id === bossId) || BOSSES[0])) mode = 'normal';   // (Hard stays locked)
    stopRaidHost();
    hostTrial = null;
    const def = RAID_DEFS[bossId] || GRUBNAK;
    lastRaidOpts = { mode, fill, boss: def.id, practice: practiceFrom || 0 };
    const humans = raidHumans();
    const spawns = {};
    ARENA.use(def.id);
    const sr = Math.min(360, ARENA.inner - 60);   // a ring below the boss, clear of the walls
    humans.forEach((h, i) => { const a = Math.PI / 2 + (i - (humans.length - 1) / 2) * 0.35; spawns[h.id] = [rnd(Math.cos(a) * sr), rnd(Math.sin(a) * sr)]; });
    hostRoster = humans.map(h => Object.assign({}, h, { spawn: spawns[h.id] }));
    const bond = bondCounts(humans);   // gear party bonuses, fixed for the fight (gear is locked inside a raid)
    raidHost = new RaidHost({ def, mode, humans: hostHumans, bots: fill ? pickBots(humans) : [], seed: (Math.random() * 1e9) | 0, emit: m => Net.broadcastAll(m), bond: partyBonus(bond), waitPull: true, practiceFrom });
    const roster = [...humans, ...raidHost.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role, bot: true }))];
    for (const b of raidHost.bots) spawns[b.id] = [rnd(b.x), rnd(b.y)];
    Net.broadcastAll({ t: 'raid', boss: def.id, mode, roster, spawns, bond, pull: 1, practice: practiceFrom || 0 });
    hostMarks = loadMarks(def.id);
    Net.broadcastAll({ t: 'wms', m: hostMarks });
    // tick the fight off a worker timer so it keeps running if the host's tab is in the background
    let lastT = performance.now(), endedAt = null;
    stopHostTick = Net.steadyInterval(() => {
      if (!raidHost) return;
      const t = performance.now();
      let dt = Math.min(0.25, (t - lastT) / 1000); lastT = t;
      while (dt > 0) { const step = Math.min(0.05, dt); raidHost.tick(step); dt -= step; }
      const st = raidHost.sim.state;
      if (st === 'clear' && !endedAt && !lastRaidOpts.practice) hostRollLoot();   // (practice runs drop nothing)
      if (st === 'clear' || st === 'wipe') { endedAt = endedAt || t; if (t - endedAt > 3000) stopRaidHost(true); }
    }, 33);
  }
  function stopRaidHost(keepSim) {
    if (stopHostTick) { stopHostTick(); stopHostTick = null; }
    if (!keepSim) raidHost = null;
  }
  function hostHumans() {
    const out = [];
    for (const h of hostRoster) {
      if (h.left) continue;
      let x = h.spawn[0], y = h.spawn[1], a = -Math.PI / 2;
      if (h.id === Net.id) { if (scene === 'arena') { x = player.x; y = player.y; a = player.angle; } }
      else { const r = remotes.get(h.id); if (!r) continue; if (r.scene === 1) { x = r.tx; y = r.ty; a = r.ta; } }
      out.push({ id: h.id, name: h.name, cls: h.cls, role: h.role, x, y, a, gear: hostGear.get(h.id) || null });
    }
    return out;
  }
  // ---- gear: each player tells the host their totals (HP and Defense matter there) and which bosses their equipped
  // items come from (for party bonuses); the host caps and cleans both
  const hostGear = new Map(), hostSources = new Map();
  function sendGear() {
    if (!player.cls) return;
    const t = Inventory.totals(player.cls.id), src = gearSources(Object.values(Inventory.loadout(player.cls.id)));
    if (Net.isHost) { hostGear.set(Net.id, sanitizeGear(t)); hostSources.set(Net.id, src); }
    else Net.send({ t: 'gear', s: t, src });
  }
  Net.onHost('gear', (pid, msg) => { hostGear.set(pid, sanitizeGear(msg.s)); hostSources.set(pid, sanitizeSources(msg.src)); });
  // how many people in the raid wear something from each boss: { tier: n }
  function bondCounts(humans) {
    const counts = {};
    for (const h of humans) for (const t of hostSources.get(h.id) || []) counts[t] = (counts[t] || 0) + 1;
    return counts;
  }
  // ---- loot: a clear bursts the boss into a chest where he fell; the humans in the run take from it (and put things in
  // to trade) until the raid ends (loot.js). The host pays everyone the clear's gold with it. Wipes and trials drop nothing.
  function hostRollLoot() {
    if (hostTrial) return;   // a trial is a memory: nothing drops
    const humans = hostRoster.filter(h => !h.left && h.cls).map(h => [h.id, h.cls]);
    const b = raidHost && raidHost.sim.boss;
    if (humans.length) Loot.hostOpen(lastRaidOpts.boss, lastRaidOpts.mode, humans, b ? { x: b.x, y: b.y } : null);
  }
  Loot.init({
    broadcast: m => Net.broadcastAll(m),
    send: m => (!Net.isHost ? Net.send(m) : m.t === 'ctake' ? Loot.hostTake(Net.id, m) : m.t === 'cput' ? Loot.hostPut(Net.id, m) : null),
    myId: () => Net.id,
    nameOf: id => (id === Net.id ? 'You' : (remotes.get(id) || {}).name || 'Someone'),
    inRaid: () => scene === 'arena',
    addItem: (key, cls) => {
      const inst = Inventory.add(key, cls || (player.cls && player.cls.id));
      if (scene === 'arena') VFX.burst(player.x, player.y, { color: Inventory.rarityColor(inst), color2: '#ffffff', n: 22, speed: 240 });
    },
    addGold: n => Inventory.addGold(n),
    iconURL: key => Inventory.iconURL({ key }),
    myItems: () => (player.cls ? Inventory.spare(player.cls.id) : []),
    dropItem: uid => Inventory.drop(uid),
    escrow: uid => Inventory.escrow(uid), settle: key => Inventory.settle(key), unescrow: key => Inventory.unescrow(key), unescrowAll: () => Inventory.unescrowAll(),
    itemTip: (key, cls) => itemKeyTip(key, cls),
  });
  // the boss bursts into the chest
  Net.on('chest', m => {
    Loot.onChest(m);
    const c = raid && Loot.chestAt();
    if (c) { VFX.burst(c.x, c.y, { color: '#ffd65a', color2: '#ffffff', n: 46, speed: 340 }); FX.add({ type: 'ring', x: c.x, y: c.y, r: 90, color: '#ffd65a', dur: 0.6 }); FX.shake = Math.max(FX.shake || 0, 6); }
    if (SH && c) SH.play('chest-drop', { vol: 0.85, at: c });
  });
  Net.on('cst', m => Loot.onState(m));
  Net.on('cgot', m => { Loot.onGot(m); if (SH) SH.play('loot-take', { bus: 'ui', key: 'loot-take', minGap: 0.1 }); });
  Net.on('cputok', m => Loot.onPutOk(m));
  Net.on('csalv', m => Loot.onSalvage(m));
  Net.onHost('ctake', (pid, m) => Loot.hostTake(pid, m));
  Net.onHost('cput', (pid, m) => Loot.hostPut(pid, m));
  // ---------------------------------------------------------------- Limit Break (G)
  // The party's shared gauge (the host's, fight.js): every whole bar is spent at once by whoever presses first, with the
  // effect of their role. Tank: Stand Fast (the party takes less damage). Healer: Rekindle (heals the party; three bars
  // raise the fallen). DPS: Emberfall (one great blow).
  const LB_NAME = { tank: 'Stand Fast', healer: 'Rekindle', dps: 'Emberfall' };
  function useLimit() {
    if (!raid || raid.state !== 'live' || amDead() || raid.def.trial || raid.pvp) return;
    if ((raid.lb || 0) < FIGHT.LB.BAR) { FX.text(player.x, player.y - 56, 'Not ready', '#c8c0d8', 12, 0.7, { kind: 'quiet' }); return; }
    sendCombat({ type: 'lb' });
  }
  // the Down screen's "ask for a raise" (button or key): the host marks it for everyone's frames, and healer bots raise
  // whoever asked first once it's safe to stand for the cast (raid-host.js rezAsk, bots.js BotAI.raiseFirst)
  function askRaise() {
    if (!raid || raid.state !== 'live' || !amDead() || raid.def.trial || raid.pvp || (raid.rezAsks && raid.rezAsks[Net.id])) return;
    if (Net.isHost) hostRezAsk(Net.id); else Net.send({ t: 'rez' });
  }
  function hostRezAsk(pid) { if (raidHost && hostRoster.some(h => h.id === pid && !h.left)) raidHost.rezAsk(pid); }
  Net.onHost('rez', hostRezAsk);
  Net.on('rez', msg => { if (raid && Number.isInteger(msg.id)) (raid.rezAsks = raid.rezAsks || {})[msg.id] = now; });
  Net.on('lb', msg => {
    if (!raid) return;
    const who = entById(msg.id), units = raidUnits(), b = raid.bossDraw, lv = Math.max(1, Math.min(3, msg.lv | 0));
    if (who) FX.text(who.x, who.y - 64, LB_NAME[msg.role] || 'Limit Break', '#f2d38a', 14 + lv * 2, 1.6);
    if (SH) SH.play('lb-fire', { vol: 1, variant: lv - 1 });
    if (msg.role === 'tank') for (const u of units) { VFX.shock(u.x, u.y, { r: 46 + lv * 12, color: '#f2d38a', w: 3 + lv, dur: 0.7, flat: 1 }); VFX.shock(u.x, u.y, { r: 30, color: '#ffffff', w: 2, dur: 0.4, flat: 1 }); }
    else if (msg.role === 'healer') for (const u of units) { VFX.burst(u.x, u.y - 24, { color: '#c8f5d0', n: 6 + lv * 3, speed: 120, size: 8 }); VFX.shock(u.x, u.y, { r: 40 + lv * 10, color: '#9fe8b0', w: 3, dur: 0.6, flat: 1 }); }
    else if (b) { VFX.hit(b.x, b.y - 30, '#fff0c8', 1.4 + lv * 0.6); VFX.shock(b.x, b.y, { r: 140 + lv * 60, color: '#f2b060', w: 4 + lv * 2, dur: 0.7, flat: 1 }); FX.shake = Math.max(FX.shake, 4 + lv * 3); }
  });

  // ---------------------------------------------------------------- the Practice Hall
  // Any boss, either difficulty, from any phase. No loot, no clears, nothing on the progression record.
  const PRACTICE_PHASES = {
    grubnak: ['Appetiser', 'Mains', 'Flare-Up', 'Second Sitting', 'Dessert'],
    skitterra: ['The Web', 'The Dark Between', 'The Brood', 'The Collapse'],
    volkar: ['The Front', 'The Eye', 'Back of the Storm', 'Heavens Fall'],
    hollowking: ['The Summons', 'Testimony', 'Court of Bones', 'The Verdict', 'Judgement', 'The Long Night'],
    wyrm: ['Ground', 'First Flight', 'The Roost', 'Final Flight', 'Last Ember'],
    titan: ['The Thaw', 'The Freeze', 'The Crack', 'The Avalanche', 'Last Winter'],
  };
  PRACTICE_PHASES.hydra = ['Three Heads', 'Six Heads', 'The Submerge', 'Nine Heads', 'Last Heads'];
  PRACTICE_PHASES.archmage = ['Fire', 'Frost', 'The Binding', 'Void', 'Convergence'];
  let practicePanel = null, practicePick = { boss: 'grubnak', mode: 'normal' };
  function openPractice() {
    if (!practicePanel) {
      practicePanel = document.createElement('div');
      practicePanel.id = 'practice'; practicePanel.className = 'hidden';
      document.body.appendChild(practicePanel);
      practicePanel.addEventListener('mousedown', e => e.stopPropagation());
      practicePanel.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('close')) { closePractice(); return; }
        if (t.dataset.boss) practicePick.boss = t.dataset.boss;
        if (t.dataset.mode) practicePick.mode = t.dataset.mode;
        if (t.dataset.ph) {
          if (!Net.isHost) { toast('Only the host can start a practice run.'); return; }
          if (!player.cls) { toast('Pick a hero first.'); return; }
          closePractice();
          startRaid(practicePick.mode, true, practicePick.boss, Number(t.dataset.ph));
          return;
        }
        renderPractice();
      });
    }
    renderPractice();
    practicePanel.classList.remove('hidden');
  }
  function renderPractice() {
    const ids = Object.keys(PRACTICE_PHASES).filter(id => bossOpen(BOSSES.find(b => b.id === id))), pk = practicePick;
    if (!ids.includes(pk.boss)) pk.boss = ids[0];
    practicePanel.innerHTML = `<header><h3>Practice Hall</h3><button type="button" class="close" aria-label="Close">×</button></header>
      <p class="pr-note">Any fight, from any phase. No loot, no clears; the progression record doesn't see it.${Net.isHost ? '' : ' Only the host can start one.'}</p>
      <h4>Fight</h4><div class="pr-row">${ids.map(id => `<button type="button" class="btn2${pk.boss === id ? ' on' : ''}" data-boss="${id}">${escapeHtml(RAID_DEFS[id] ? RAID_DEFS[id].name : id)}</button>`).join('')}</div>
      <h4>Difficulty</h4><div class="pr-row">${['normal', 'hard'].map(m => `<button type="button" class="btn2${pk.mode === m ? ' on' : ''}"${m === 'hard' && !hardOpen(BOSSES.find(b => b.id === pk.boss)) ? ' disabled data-tip="Hard is still locked"' : ''} data-mode="${m}">${m === 'hard' ? 'Hard' : 'Normal'}</button>`).join('')}</div>
      <h4>Start from</h4><div class="pr-phases">${PRACTICE_PHASES[pk.boss].map((n, i) => `<button type="button" class="pr-ph" data-ph="${i + 1}"${Net.isHost ? '' : ' aria-disabled="true"'}><i>${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</i><b>${escapeHtml(n)}</b></button>`).join('')}</div>`;
  }
  function closePractice() { if (practicePanel) practicePanel.classList.add('hidden'); }
  const practiceOpen = () => !!practicePanel && !practicePanel.classList.contains('hidden');

  // ---------------------------------------------------------------- the Barrow Gate (barrow-gate.js)
  // The spec trials taken at the town's second portal: this hero's two specializations, each with its trial. Starting one is
  // the hero panel's own button (trialGo / beginTrial below), so solo and host-only exactly as there.
  let barrowPanel = null;
  function openBarrow() {
    if (scene !== 'town') return;
    if (!barrowPanel) {
      barrowPanel = document.createElement('div');
      barrowPanel.id = 'barrow'; barrowPanel.className = 'hidden';
      document.body.appendChild(barrowPanel);
      barrowPanel.addEventListener('mousedown', e => e.stopPropagation());
      barrowPanel.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('close')) { closeBarrow(); return; }
        if (t.classList.contains('bg-pick')) { closeBarrow(); openSelect(null); return; }
        if (t.classList.contains('trial-go') && !t.getAttribute('aria-disabled')) beginTrial(player.cls, t.dataset.spec);
      });
    }
    renderBarrow();
    barrowPanel.classList.remove('hidden');
  }
  function renderBarrow() {
    const cls = player.cls, specs = (cls && SPECS[cls.id]) || [];
    let body;
    if (!cls) body = `<p class="bg-note">The gate has no name to call yet. Choose a hero at the Gilded Tankard, then come back.</p><button type="button" class="btn2 bg-pick">Choose a hero</button>`;
    else if (!specs.length) body = `<p class="bg-note">${cls.name} has no specializations to prove yet.</p>`;
    else body = `<div class="bg-hero"><i style="background:${ROLES[cls.role].color}"></i><b>${cls.name}</b><small>${cls.title}</small></div>${specs.map(s => gateCard(cls, s)).join('')}`;
    barrowPanel.innerHTML = Num.fill(`<header><h3>The Barrow Gate</h3><button type="button" class="close" aria-label="Close">×</button></header>
      <p class="bg-lede">The Hollow King's Shade keeps his hall as it was. Each memory is a short trial, fought alone with the allies it remembers.</p>${body}`);
  }
  // one specialization at the gate: who it is, whether its trial is passed, and the way in
  function gateCard(cls, spec) {
    const T = TRIALS[spec.id];
    if (!T) return '';
    const passed = Save.trialDone(cls.id, spec.id);
    return `<div class="spec-trial gate-spec${passed ? ' passed' : ''}" style="--sa:${spec.accent || cls.accent}">
      <div class="gs-head"><b>${spec.name}</b><small>${spec.title}</small><em class="gs-state">${passed ? 'Passed' : 'Open'}</em></div>
      <p class="gs-focus">${spec.focus}</p>
      <h5>${T.name}</h5><p class="gs-lore">${T.lore[0]}</p>
      ${trialGo(spec.id, passed ? 'Walk it again' : 'Begin the trial', passed ? 'You leave the memory wearing this specialization.' : '')}</div>`;
  }
  function closeBarrow() { if (barrowPanel) barrowPanel.classList.add('hidden'); }
  const barrowOpen = () => !!barrowPanel && !barrowPanel.classList.contains('hidden');

  // ---------------------------------------------------------------- progression (this browser)
  // Every pull of a boss on a difficulty: where its health ended, the phase reached and how long it went. Kept for the
  // last 40 pulls; the best is the lowest health ever reached (a clear is 0).
  const PROG_KEY = 'emberfall.prog';
  const progAll = () => { try { const v = JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const progOf = (bossId, mode) => { const r = progAll()[bossId + ':' + mode]; return r && Array.isArray(r.pulls) ? r : { n: 0, best: null, pulls: [] }; };
  function progRecord(bossId, mode, pull) {
    const all = progAll(), k = bossId + ':' + mode, r = all[k] && Array.isArray(all[k].pulls) ? all[k] : { n: 0, best: null, pulls: [] };
    r.n = (r.n || 0) + 1;
    pull.n = r.n;
    if (r.best) pull.prev = r.best.pct;   // (the results screen says so when this one beats it)
    r.pulls.push(pull);
    if (r.pulls.length > 40) r.pulls.shift();
    if (!r.best || pull.pct < r.best.pct) r.best = pull;
    all[k] = r;
    try { localStorage.setItem(PROG_KEY, JSON.stringify(all)); } catch (e) { /* not remembered */ }
    return r;
  }

  // ---------------------------------------------------------------- waymarks
  // A B C D (circles) and 1 2 3 4 (squares) on the floor. Anyone in the raid can put one down or pick one up; the
  // host keeps the set, remembers it per boss (this browser) and sends it to everyone.
  const WAYMARKS = ['A', 'B', 'C', 'D', '1', '2', '3', '4'];
  const WM_COLOR = { A: '#ff6a5a', B: '#ffd84a', C: '#5ab4ff', D: '#c98aff', 1: '#ff6a5a', 2: '#ffd84a', 3: '#5ab4ff', 4: '#c98aff' };
  let hostMarks = {}, placingMark = null;
  const marksKey = id => 'emberfall.marks.' + id;
  function loadMarks(id) {
    const out = {};
    try {
      const v = JSON.parse(localStorage.getItem(marksKey(id)) || '{}');
      for (const k of WAYMARKS) if (Array.isArray(v[k]) && v[k].every(Number.isFinite)) out[k] = [Math.round(v[k][0]), Math.round(v[k][1])];
    } catch (e) { /* nothing saved: no markers */ }
    return out;
  }
  function hostWaymark(pid, msg) {
    if (!raidHost || !hostRoster.some(h => h.id === pid && !h.left)) return;
    if (msg.all === 'clear') hostMarks = {};
    else if (WAYMARKS.includes(msg.k)) {
      if (msg.clear) delete hostMarks[msg.k];
      else if (Number.isFinite(msg.x) && Number.isFinite(msg.y)) { const q = ARENA.clamp({ x: msg.x, y: msg.y }, 24); hostMarks[msg.k] = [Math.round(q.x), Math.round(q.y)]; }
      else return;
    } else return;
    try { localStorage.setItem(marksKey(raidHost.def.id), JSON.stringify(hostMarks)); } catch (e) { /* not remembered */ }
    Net.broadcastAll({ t: 'wms', m: hostMarks });
  }
  Net.onHost('wm', hostWaymark);
  Net.on('wms', msg => {
    if (!raid || !msg.m || typeof msg.m !== 'object') return;
    const m = {};
    for (const k of WAYMARKS) if (Array.isArray(msg.m[k]) && msg.m[k].every(Number.isFinite)) m[k] = msg.m[k];
    raid.marks = m;
    if (SH) SH.play('waymark', { bus: 'ui', key: 'waymark', minGap: 0.1 });
  });
  // pings: { x, y, c } from a player in the raid; the host checks it (and keeps anyone from flooding the floor)
  const lastPing = new Map();
  function hostPing(pid, msg) {
    if (!raidHost || !hostRoster.some(h => h.id === pid && !h.left)) return;
    if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
    const t = performance.now();
    if (t - (lastPing.get(pid) || -1e9) < 250) return;
    lastPing.set(pid, t);
    const q = ARENA.clamp({ x: msg.x, y: msg.y }, 0);
    Net.broadcastAll({ t: 'pg', id: pid, x: Math.round(q.x), y: Math.round(q.y), c: Pings.clean(msg.c) });
  }
  Net.onHost('pg', hostPing);
  Net.on('mtr', msg => { if (raid && Array.isArray(msg.d)) raid.meter = msg; });
  // the pull countdown: anyone in the raid can start it before the pull; the host runs it
  function hostPullIn(pid) { if (raidHost && hostRoster.some(h => h.id === pid && !h.left)) raidHost.pullIn(5); }
  Net.onHost('pci', hostPullIn);
  Net.on('pcd', msg => { if (raid && raid.state === 'prepull') raid.pullAt = now + (Number(msg.n) || 5); });
  function startPullCountdown() { if (!raid || raid.state !== 'prepull' || raid.pullAt) return; if (Net.isHost) hostPullIn(Net.id); else Net.send({ t: 'pci' }); }
  Net.on('pg', msg => {
    if (!raid || !Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
    const r = raid.roster.find(x => x.id === msg.id);
    Pings.add({ x: msg.x, y: msg.y, c: msg.c, name: r ? r.name : '', color: r && ROLES[r.role] ? ROLES[r.role].color : null }, now);
    if (SH) SH.play('ping', { bus: 'ui', vol: 0.8, key: 'ping', minGap: 0.15 });
  });
  function sendPing(x, y, c) { const msg = { x: Math.round(x), y: Math.round(y), c: c || null }; if (Net.isHost) hostPing(Net.id, msg); else Net.send(Object.assign({ t: 'pg' }, msg)); }
  let pingFrom = null;   // where an Alt-drag began (the wheel is open)

  function sendWaymark(msg) { if (Net.isHost) hostWaymark(Net.id, msg); else Net.send(Object.assign({ t: 'wm' }, msg)); }
  function placeMark(k) { placingMark = placingMark === k ? null : k; document.body.classList.toggle('placing-mark', !!placingMark); }
  function drawWaymarks(ctx) {
    const m = placingMark ? Object.assign({}, raid.marks, { [placingMark]: (() => { const w = mouseWorld(); return [w.x, w.y]; })() }) : raid.marks;
    if (!m) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 25px Cinzel, Georgia, serif'; ctx.lineJoin = 'round';
    for (const k of WAYMARKS) {
      if (!m[k]) continue;
      ctx.globalAlpha = k === placingMark ? 0.55 : 1;
      const [x, y] = m[k], col = WM_COLOR[k], R = 30, sq = k >= '0' && k <= '9';
      ctx.beginPath();
      if (sq) ctx.rect(x - R * 0.88, y - R * 0.88, R * 1.76, R * 1.76); else ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, 0.2); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(k, x, y + 1);
      ctx.fillStyle = col; ctx.fillText(k, x, y + 1);
    }
    ctx.restore();
  }

  // combat events from other players
  const EV_TYPES = new Set([...SIM_EVENTS]);
  Net.onHost('cev', (pid, msg) => {
    const host = pvpHost || raidHost;   // (a PvP match takes the raid's place: pvp-ui.js)
    if (!host || !hostRoster.some(h => h.id === pid && !h.left)) return;
    const ev = msg.ev;
    if (!ev || !EV_TYPES.has(ev.type)) return;
    for (const k of ['amount', 'pct', 'value', 'dur', 'secs', 'ticks', 'interval', 'threat', 'r', 'not', 'pair', 'mx', 'st', 'dp', 'hm', 'seam', 'both', 'mit', 'keep']) if (ev[k] !== undefined && !Number.isFinite(ev[k])) return;
    if (ev.tgt !== undefined && typeof ev.tgt !== 'string' && !(pvpHost && Number.isInteger(ev.tgt))) return;   // (PvP: the opponent's player id)
    // a bad heal over time (thousands of ticks, no interval) could freeze the host; a party buff is one of the known
    // kinds, in sane bounds
    if (ev.type === 'hot' && (!(ev.ticks >= 1 && ev.ticks <= 20) || !(ev.interval >= 0.5 && ev.interval <= 10))) return;
    if (ev.type === 'partyBuff') {
      if (!['dmg', 'crit', 'haste'].includes(ev.kind)) return;
      ev.value = Math.max(0, Math.min(0.2, ev.value || 0)); ev.dur = Math.max(0, Math.min(30, ev.dur || 0));
    }
    // a buff on one chosen ally: only a known one (engine.js ALLY_BUFFS), at its own strength, on a player id
    if (ev.type === 'allyBuff') {
      const b = typeof ev.id === 'string' && Object.prototype.hasOwnProperty.call(ALLY_BUFFS, ev.id) ? ALLY_BUFFS[ev.id] : null;
      if (!b || !Number.isFinite(ev.target)) return;
      ev.kind = b.kind; ev.value = b.value; ev.dur = b.dur;
    }
    host.onPlayerEvent(pid, ev);
  });
  // a Marionettist's Dolls, from its own client (classes-c): [[x, y, state], ...], at most two
  Net.onHost('doll', (pid, msg) => {
    const host = pvpHost || raidHost;
    if (!host || !hostRoster.some(h => h.id === pid && !h.left) || !Array.isArray(msg.l)) return;
    const ok = d => Array.isArray(d) && Number.isFinite(d[0]) && Number.isFinite(d[1]) && Math.abs(d[0]) < 2000 && Math.abs(d[1]) < 2000;
    host.sim.setDoll(pid, msg.l.slice(0, 2).filter(ok).map(d => ({ x: d[0], y: d[1], st: Number(d[2]) || 0, s: Number(d[3]) || 0 })));
  });
  // a Houndmaster's hounds, from its own client (kennel.js): [[x, y, mode, slot, houndId], ...], at most eight; the host gets { id, x, y, mode, slot } objects, like the host client's own list
  Net.onHost('hound', (pid, msg) => {
    const host = pvpHost || raidHost;
    if (!host || typeof host.sim.setHounds !== 'function' || !hostRoster.some(h => h.id === pid && !h.left) || !Array.isArray(msg.l)) return;
    const ID = /^(rust|ash|greyfang|sp[0-3])$/, MODE = ['run', 'hold', 'guard', 'pounce', 'bite', 'down'], SLOT = ['left', 'right', 'front', 'behind'];
    const ok = d => Array.isArray(d) && Number.isFinite(d[0]) && Number.isFinite(d[1]) && Math.abs(d[0]) < 2000 && Math.abs(d[1]) < 2000 && typeof d[4] === 'string' && ID.test(d[4]);
    host.sim.setHounds(pid, msg.l.slice(0, 8).filter(ok).map(d => ({ id: d[4], x: d[0], y: d[1], mode: MODE.includes(d[2]) ? d[2] : 'run', slot: SLOT.includes(d[3]) ? d[3] : null })));
  });
  // a Lanternkeeper's lanterns, from its own client: [{ id, x, y, r, h, w, k, ... }] (fight.js setLamps clamps them)
  Net.onHost('lamp', (pid, msg) => {
    const host = pvpHost || raidHost;
    if (!host || !host.sim.setLamps || !hostRoster.some(h => h.id === pid && !h.left) || !Array.isArray(msg.l)) return;
    host.sim.setLamps(pid, msg.l);
  });
  Net.onHost('rleave', pid => {
    const h = hostRoster.find(x => x.id === pid);
    if (h) { h.left = true; if (raidHost) raidHost.sim.removePlayer(pid); if (pvpHost) pvpHost.sim.removePlayer(pid); }
  });

  // going in or out of a raid fades up from black instead of cutting straight to the new room
  const sceneVeil = document.createElement('div');
  sceneVeil.id = 'scene-veil';
  document.body.appendChild(sceneVeil);
  function sceneFade() {
    sceneVeil.style.transition = 'none'; sceneVeil.style.opacity = '1';
    void sceneVeil.offsetWidth;
    sceneVeil.style.transition = ''; sceneVeil.style.opacity = '0';
  }

  function enterArena(msg) {
    const def = msg.pvp ? (msg.pvp.mode === 'ctf' ? PVP_FIELD_DEF : PVP_CLIENT_DEF) : raidDef(msg.boss);
    if (!def || !msg.roster.some(r => r.id === Net.id)) {
      if (scene === 'town' && def && !def.trial) toast(`Your party went into the raid: ${def.name}.`);
      return;
    }
    closePanels();
    RaidUI.hideResults();
    resetRaidInput();
    FX.clear(); VFX.clear(); clearTimers();
    ARENA.use(def.id);
    if (SH && msg.pvp) { SH.castEnd(); SH.play('portal-enter', { vol: 0.8 }); SH.music('mus-pull', { fade: 2 }); }   // (the ring: no boss, no intro)
    else if (SH) { SH.castEnd(); SH.play('portal-enter', { vol: 0.8 }); SH.music('mus-pull', { fade: 2 }); later(0.6, () => { SH.play(def.id + '-intro', { vol: 0.9 }); SH.vo('boss-intro', { bossId: def.id }); }); }
    sceneFade();
    const sp = def.spawn || { x: 0, y: -40 };
    raid = {
      def, mode: msg.mode, roster: msg.roster, rosterIds: new Set(msg.roster.map(r => r.id)),
      // pull: no countdown, the fight starts on the first blow on the boss ('prepull' till then)
      state: msg.pull ? 'prepull' : 'countdown', countdownEnd: now + (msg.pvp ? msg.pvp.cd : 8), fightTime: 0, marks: {},
      prog: null, practice: Number(msg.practice) || 0, deaths: [], meter: null, pullAt: null, tl: { hp: [], casts: [] },
      introAt: msg.pvp ? 0 : now + 0.6,   // the title card, once the room has faded in
      boss: { x: sp.x, y: sp.y, f: Math.PI / 2, hp: 1, mx: 1, u: 0, v: 0, tg: null },
      bossDraw: { x: sp.x, y: sp.y, f: Math.PI / 2, st: newSt(), lastX: sp.x, lastY: sp.y, fade: 1 },
      bossTrack: new Track(sp.x, sp.y, Math.PI / 2), ghosts: [],
      // Volkar: everyone's charge, rods left standing, turning storm walls, and the closing edge's warning
      pol: new Map(), posts: new Map(), sweeps: new Map(), edgeWarn: null,
      // the Hollow King: lanterns, who is doomed (and until when), his Echo Knights, and how dark the Long Night is
      lanterns: [], doom: new Map(), knights: new Map(), night: false, nightK: 0,
      fightClock: new SendClock(), botClock: new SendClock(),   // the host's fight and bot clocks (see interp.js)
      nextAutoAt: 0, cast: null, props: {}, propsUntil: {},
      hits: [],
      tgs: new Map(), puddles: new Map(), party: new Map(), bots: new Map(), pbuffs: [], abuffs: [], taken: [], result: null, resultAt: 0,
      adds: new Map(), tethers: new Map(), zones: new Map(), lunges: [], husks: [], eggs: null,
      rollers: new Map(), reels: new Map(),
      bond: partyBonus(msg.bond),   // the gear party bonus the host counted for this fight
      room: ArenaView.newRoom(),    // the room's props and floor state (host-owned, 'props' / 'propfx' / 'roomev')
    };
    if (msg.pvp) {
      // PvP (pvp-ui.js): no boss; the party frames and ally targets are your own side, the other side are the enemies
      const T = msg.pvp.teams, myTeam = T[Net.id];
      raid.pvp = { mode: msg.pvp.mode, teams: T, myTeam, foes: msg.roster.filter(r => T[r.id] !== myTeam).map(r => r.id), round: msg.pvp.round, sudden: msg.pvp.sudden, state: 'countdown', left: null, leftAt: now, sd: 0, names: new Map(msg.roster.map(r => [r.id, r.name])) };
      raid.boss.u = 1; raid.boss.x = raid.boss.y = 99999;
      // capture the flag: both flags home, the score, when each fallen player is back (raid.pvp.ctf, from 'ctf' / 'ctfDown')
      if (msg.pvp.mode === 'ctf') raid.pvp.ctf = { caps: [0, 0], f: [[0, -CTF.STAND_X, 0, null, 0], [0, CTF.STAND_X, 0, null, 0]], at: now, down: {} };
      document.body.classList.add('in-pvp');
    }
    player.reel = null;
    lockedEnemy = null; focusEnemy = null;
    // a trial lends you its spec for the length of the memory
    if (def.trial) { if (trialPrevSpec === undefined) trialPrevSpec = player.spec || null; player.spec = def.trial; }
    for (const r of msg.roster) {
      raid.party.set(r.id, { hp: 1, maxHp: 1, shield: 0, alive: true, dd: 0, vuln: 0, mit: 0, weak: 0, debuffs: [] });
      const sp = msg.spawns[r.id] || [0, 360];
      if (r.bot) {
        raid.bots.set(r.id, { kind: 'remote', remote: true, bot: true, id: r.id, name: r.name, cls: CLASSES.find(c => c.id === r.cls), spec: specOf(r.cls, r.spec) ? r.spec : null,
          x: sp[0], y: sp[1], tx: sp[0], ty: sp[1], angle: -Math.PI / 2, ta: -Math.PI / 2, m: 0, lift: 0, tl: 0, faceLock: 0, st: newSt(Math.random() * 3) });
      }
      if (r.id === Net.id) { player.x = sp[0]; player.y = sp[1]; }
    }
    scene = 'arena';
    town.meter = null; town.meterDone = null; RaidUI.meter(null); RaidUI.townPosture(null); town.ken = null;
    player.target = null; player.interact = null; player.dashMove = null; player.kb = null; player.angle = -Math.PI / 2;
    lockedAlly = null; lastEnemy = null;
    Stagecraft.reset();   // threads and Dolls (classes-c)
    Lamps.reset(); Kennel.reset();
    makeActor();
    for (const rm of remotes.values()) rm.ultReady = false;   // (everyone starts the raid with an empty Ultimate)
    RaidUI.resetRoster();
    RaidUI.setRoster(raid.pvp ? msg.roster.filter(r => raid.pvp.teams[r.id] === raid.pvp.myTeam) : msg.roster);
    applyFrameDock();
    RaidUI.show(true);
    setSceneUI();
    if (raid.pvp) { const sp0 = msg.spawns[Net.id]; if (sp0 && sp0[2] != null) player.angle = sp0[2]; raid.roster = msg.roster.filter(r => raid.pvp.teams[r.id] === raid.pvp.myTeam); }
    updateCamera(0, true);
    lastSentKey = '';
  }

  // nothing half-done carries from one raid to the next (or into town)
  function resetRaidInput() { placeMark(null); Pings.wheelClose(); pingFrom = null; Pings.clear(); Loot.leave(); }
  function leaveRaid(byMe) {
    if (byMe && Net.isHost) Loot.hostClose();   // (settled first, so the host's own salvage still lands)
    resetRaidInput();
    focusEnemy = null;
    if (byMe) {
      if (Net.isHost) { Loot.hostClose(); Net.broadcastAll({ t: 'raidend' }); return; }  // the host leaving ends it for everyone
      Net.send({ t: 'rleave' });
    }
    if (Net.isHost) { stopRaidHost(); stopPvpHost(); hostRoster = []; }
    if (scene !== 'arena') return;
    const wasPvp = !!(raid && raid.pvp);
    if (wasPvp) { document.body.classList.remove('in-pvp'); PvpUI.leave(); }
    const wasTrial = trialPrevSpec !== undefined;
    if (trialPrevSpec !== undefined) {
      player.spec = trialPrevSpec; trialPrevSpec = undefined;
      if (player.cls) Net.send({ t: 'cls', id: player.cls.id, spec: player.spec });
    }
    raid = null;
    scene = 'town';
    townObjective();
    sceneFade();
    FX.clear(); VFX.clear(); clearTimers();
    RaidUI.show(false);
    RaidUI.hideResults();
    player.x = TOWN.portal.x + (Math.random() - 0.5) * 80; player.y = TOWN.portal.y + TOWN.portal.r + 30;
    if (wasPvp && TOWN.arena) { player.x = TOWN.arena.door.x + (Math.random() - 0.5) * 60; player.y = TOWN.arena.door.y - 50; }   // (out of the Arena's gate)
    if (wasTrial && BarrowGate.isOpen()) { const sp = BarrowGate.exitSpot(); player.x = sp.x; player.y = sp.y; }   // (a trial lets you out at the Barrow Gate)
    player.target = null; player.dashMove = null; player.kb = null;
    lockedAlly = null; lockedEnemy = null;
    Stagecraft.reset();
    Lamps.reset(); Kennel.reset();
    makeActor();
    setSceneUI();
    updateCamera(0, true);
    lastSentKey = '';
  }

  function setSceneUI() {
    const arena = scene === 'arena';
    $('minimap').classList.toggle('hidden', arena);
    $('party').classList.toggle('hidden', arena);
    $('objective').classList.toggle('hidden', arena);
    $('hud-tl').querySelector('.town').textContent = arena ? raid.def.name : 'Emberfall';
    FX.heroScale = heroScale();
    // in a raid the boss bar already names the fight and the party frames name you
    $('hud-tl').classList.toggle('hidden', arena);
    Inventory.showGoldHud(!arena);
    updateHelp();
    updateHeroName();
  }
  // the key line at the bottom (a hero with an Ultimate also gets its key)
  function updateHelp() {
    const tauntKey = actor && actor.kit.ult ? ` · <kbd>${KEYS[7]}</kbd> ultimate` : '';
    const hurtKey = healerish() ? ' · <kbd>&#96;</kbd> most hurt' : '';
    $('help').innerHTML = scene === 'arena'
      ? `<kbd>Right-click</kbd> move · <kbd>Left-click</kbd> ally or frame to target · <kbd>1</kbd>-<kbd>4</kbd> target party${hurtKey} · <kbd>Shift</kbd>+skill on yourself · <kbd>${KEYS[6]}</kbd> dash${tauntKey}`
      : `<kbd>Right-click</kbd> move · <kbd>Left-click</kbd> interact · ${KEYS.slice(0, 6).map(k => `<kbd>${k}</kbd>`).join('')} skills · <kbd>${KEYS[6]}</kbd> dash${tauntKey} · <kbd>Enter</kbd> chat · <kbd>${Keybinds.label(Keybinds.keyFor('options'))}</kbd> options`;
  }

  function clampArena(e) {
    ARENA.clamp(e, 12);
    if (raid && !raid.pvp) {
      PROPS.collide(e, raid.room.props, 12);   // solid props: casks, pillars, stones...
      const b = raid.boss, dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy), min = FIGHT.BOSS_R * 0.75;
      if (d < min && d > 0.01) { e.x = b.x + dx / d * min; e.y = b.y + dy / d * min; }
    }
  }

  // ---------------------------------------------------------------- the PvP Arena (pvp-ui.js; the host's match: arena/pvp.js)
  // A bout runs in the arena scene with raid.pvp set: no boss, the other side are the enemies, the host never sends the
  // raid's 'fight' messages, so no raid end, loot, journal or record ever fires. 'raidend' brings everyone back.
  const PVP_CLIENT_DEF = { id: 'pvp_ring', name: 'The Arena', spawn: { x: 0, y: 0 } };
  const PVP_FIELD_DEF = { id: 'pvp_field', name: 'The Arena', spawn: { x: 0, y: 0 } };   // (capture the flag's longer field)
  // capture the flag: am I carrying a flag; and letting go of it (a blink while carrying drops it, see CTF in pvp.js)
  function pvpCarrying() { const C = raid && raid.pvp && raid.pvp.ctf; return !!C && raid.pvp.state === 'live' && C.f.some(f => f[0] === 1 && f[3] === Net.id); }
  function ctfLetGo() { if (Net.isHost) { if (pvpHost && pvpHost.sim.ctfDrop) pvpHost.sim.ctfDrop(Net.id); } else Net.send({ t: 'ctfDrop' }); }
  let pvpHost = null, stopPvpTick = null;
  function pvpName(id) {
    if (id === Net.id) return player.name;
    const n = raid && raid.pvp && raid.pvp.names.get(id);
    if (n) return n;
    const r = remotes.get(id); return r ? r.name : '?';
  }
  function stopPvpHost() { if (stopPvpTick) { stopPvpTick(); stopPvpTick = null; } pvpHost = null; }
  function openArena() {
    if (!player.cls) { toast('Pick a hero at the tavern first.'); return; }
    PvpUI.open();
  }
  // host: cfg { mode, teams: { pid: 0|1 }, bots: [{ cls, team }] } from the lobby
  function startPvp(cfg) {
    if (!Net.isHost || !player.cls || raid || typeof PvpHost === 'undefined') return;
    stopRaidHost(); stopPvpHost(); raidHost = null;
    const humans = raidHumans().filter(h => cfg.teams[h.id] != null);
    // where everyone starts, laid out as PvpHost does (the host's own entry needs it before the first position update)
    const ids = [...humans.map(h => h.id), ...cfg.bots.map((b, i) => 1000 + i)], teamOf = id => (id >= 1000 ? (cfg.bots[id - 1000].team ? 1 : 0) : cfg.teams[id]), spawns = {};
    for (const tm of [0, 1]) { const mine = ids.filter(id => teamOf(id) === tm); mine.forEach((id, k) => { spawns[id] = [(tm ? 1 : -1) * PVP.spawnX(cfg.mode), (k - (mine.length - 1) / 2) * 90]; }); }
    hostRoster = humans.map(h => Object.assign({}, h, { spawn: spawns[h.id] }));
    pvpHost = new PvpHost({ mode: cfg.mode, humans: hostHumans, teams: cfg.teams, bots: cfg.bots, emit: m => Net.broadcastAll(m), seed: (Math.random() * 1e9) | 0 });
    let lastT = performance.now(), endedAt = null;
    stopPvpTick = Net.steadyInterval(() => {
      if (!pvpHost) return;
      const t = performance.now();
      let dt = Math.min(0.25, (t - lastT) / 1000); lastT = t;
      if (pvpHost.state !== 'over') while (dt > 0) { const step = Math.min(0.05, dt); pvpHost.tick(step); dt -= step; }
      else { endedAt = endedAt || t; if (t - endedAt > 20000) { stopPvpHost(); Net.broadcastAll({ t: 'raidend' }); } }   // (everyone back to town a while after the result)
    }, 33);
  }
  Net.on('pvpStart', msg => {
    if (!msg || !msg.teams || !Array.isArray(msg.spawns)) return;
    const T = {}; for (const k of Object.keys(msg.teams)) T[Number(k)] = msg.teams[k] ? 1 : 0;
    const bots = new Map((msg.bots || []).map(b => [b.id, b]));
    const roster = Object.keys(T).map(Number).map(id => {
      const b = bots.get(id);
      if (b) return { id, name: b.name, cls: b.cls, spec: b.spec, role: b.role, bot: true };
      if (id === Net.id) return { id, name: player.name, cls: player.cls && player.cls.id, spec: player.spec || null, role: player.cls && player.cls.role };
      const r = remotes.get(id);
      return { id, name: r ? r.name : 'Challenger', cls: r && r.cls ? r.cls.id : 'ranger', spec: (r && r.spec) || null, role: r && r.cls ? r.cls.role : 'dps' };
    });
    if (T[Net.id] == null) { if (scene === 'town') toast('A bout has begun in the Arena.'); return; }
    const spawns = {};
    for (const [id, x, y, a] of msg.spawns) spawns[id] = [x, y, a];
    PvpUI.close();
    enterArena({ boss: 'pvp_ring', mode: 'normal', roster, spawns, bond: {}, pvp: { mode: msg.mode, teams: T, cd: Number(msg.cd) || 5, round: Number(msg.round) || 100, sudden: Number(msg.sudden) || 30 } });
  });
  Net.on('pvpLive', msg => {
    if (!raid || !raid.pvp) return;
    raid.state = 'live'; raid.prePull = null;
    Object.assign(raid.pvp, { state: 'live', left: Number(msg.round) || raid.pvp.round, leftAt: now });
    if (SH) SH.play('pull-go', { vol: 1 });
  });
  Net.on('pvpClock', msg => { if (raid && raid.pvp && Number.isFinite(msg.left)) Object.assign(raid.pvp, { left: msg.left, leftAt: now, sd: msg.sd ? 1 : 0 }); });
  Net.on('pvpSudden', msg => {
    if (!raid || !raid.pvp) return;
    Object.assign(raid.pvp, { sd: 1, left: Number(msg.dur) || 30, leftAt: now });
    FX.text(player.x, player.y - 90, msg.ot ? 'Overtime' : 'Sudden death', '#ff9a7a', 20, 1.6, { kind: 'call' });
  });
  // capture the flag (arena/pvp.js CtfSim): the flags and score, what happened to a flag, the fallen and their return
  Net.on('ctf', msg => {
    const C = raid && raid.pvp && raid.pvp.ctf; if (!C || !Array.isArray(msg.f) || msg.f.length !== 2) return;
    C.caps = [Number(msg.caps[0]) || 0, Number(msg.caps[1]) || 0]; C.f = msg.f; C.at = now;
  });
  Net.on('ctfEv', msg => {
    const P = raid && raid.pvp; if (!P || !P.ctf) return;
    const ours = msg.tm === P.myTeam, who = msg.id != null ? pvpName(msg.id) : null, e = msg.id != null ? entById(msg.id) : null, at = e || player;
    const say = { take: ours ? `${who} has your flag` : `${who} takes the flag`, drop: ours ? 'Your flag is down' : 'The flag is down',
      return: ours ? 'Your flag is home' : 'Their flag goes home', cap: ours ? `${who} scores` : `${who} scores!` }[msg.k];
    if (say) FX.text(at.x, at.y - 80, say, ours ? '#ff9a7a' : '#ffe08a', msg.k === 'cap' ? 20 : 15, 1.5, { kind: 'call' });
    const snd = { take: ours ? 'debuff-on' : 'loot-take', drop: 'chest-drop', return: 'cleanse', cap: ours ? 'debuff-on' : 'ult-ready' }[msg.k];
    if (SH && snd) SH.play(snd, { bus: 'ui', vol: 0.8 });
    if (msg.id === Net.id && (msg.k === 'cap' || (msg.k === 'take' && !ours) || (msg.k === 'return' && ours))) Pastimes.event('ctf', { k: msg.k });   // (feats: only what you did)
  });
  Net.on('ctfDown', msg => { const C = raid && raid.pvp && raid.pvp.ctf; if (C && Number.isFinite(msg.secs)) C.down[msg.id] = now + msg.secs; });
  Net.on('ctfSpawn', msg => {
    const C = raid && raid.pvp && raid.pvp.ctf; if (!C || !Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
    delete C.down[msg.id];
    const b = raid.bots.get(msg.id);
    if (b) { b.x = b.tx = msg.x; b.y = b.ty = msg.y; b.track = null; }   // (no slide across the field)
    if (msg.id === Net.id) { player.x = msg.x; player.y = msg.y; player.angle = Number(msg.a) || 0; player.dashMove = null; player.kb = null; player.target = null; updateCamera(0, true); }
  });
  Net.onHost('ctfDrop', pid => { if (pvpHost && pvpHost.sim.ctfDrop && hostRoster.some(h => h.id === pid)) pvpHost.sim.ctfDrop(pid); });
  // a blow as it landed: your own over your target (what you take shows through 'pdmg' like in a raid)
  Net.on('phit', msg => {
    if (!raid || !raid.pvp || msg.from !== Net.id) return;
    const e = entById(msg.to); if (!e) return;
    if (msg.a > 0) FX.text(e.x, e.y - 34, String(msg.a), '#ffffff', 15, 0.9, { kind: 'hit' });
    if (msg.ko) FX.text(e.x, e.y - 60, 'Down!', '#ffd84a', 20, 1.4, { kind: 'crit' });
  });
  Net.on('pvpEnd', msg => {
    if (!raid || !raid.pvp) return;
    raid.state = 'pvpover'; raid.pvp.state = 'over'; raid.pvp.sd = 0; raid.pvp.left = 0;
    if (actor && actor.kit.cast) actor.kit.cast = null;
    const won = msg.winner != null && msg.winner === raid.pvp.myTeam;
    Pastimes.event('pvp', { won, draw: msg.winner == null, mode: raid.pvp.mode, stats: msg.stats, teams: msg.teams || raid.pvp.teams, myTeam: raid.pvp.myTeam, myId: Net.id });   // (feats)
    if (SH) { SH.castEnd(); SH.play(won ? 'clear' : 'wipe', { vol: 1 }); SH.music(won ? 'mus-victory' : 'mus-wipe', { fade: 1, loop: false }); }
    const P = raid.pvp;
    later(1.4, () => { if (raid && raid.pvp === P) PvpUI.result(msg, P, pvpName, { town: () => leaveRaid(true) }); });
  });
  // the lobby: the host's copy goes to everyone; a player can ask for it or ask to change sides
  Net.on('pvpLobby', msg => PvpUI.onLobby(msg.l));
  Net.onHost('pvpAsk', () => PvpUI.publish());
  Net.onHost('pvpSide', pid => PvpUI.hostMove(pid));
  PvpUI.init({
    isHost: () => Net.isHost, myId: () => Net.id,
    humans: () => raidHumans(),
    send: m => Net.send(m), broadcast: m => Net.broadcastAll(m),
    ready: () => { if (raid) { toast('Finish the raid first.'); return false; } if (!player.cls) { toast('Pick a hero first.'); return false; } return true; },
    start: cfg => startPvp(cfg),
  });

  // --- messages from the host's fight
  Net.on('raid', enterArena);
  Net.on('raidend', () => {
    if (!Net.isHost && raid && (raid.state === 'live' || raid.state === 'countdown')) toast(raid.pvp ? 'The host ended the bout.' : 'The host ended the raid.');
    leaveRaid(false);
  });
  Net.on('fight', msg => {
    if (!raid) return;
    if (msg.s === 'live') {
      raid.state = 'live';
      for (const { ev, at } of raid.prePull || []) {
        const gone = now - at, e = Object.assign({}, ev);
        if (typeof e.dur === 'number') { e.dur -= gone; if (e.dur <= 0.2) continue; }
        if (typeof e.ticks === 'number' && e.interval > 0) { e.ticks -= Math.floor(gone / e.interval); if (e.ticks <= 0) continue; }
        sendCombat(e);
      }
      raid.prePull = null;
      // the journal: a first meeting, and the moves to watch from here
      Journal.fightStart();
      if (player.cls && !raid.def.trial && !raid.practice) Journal.met(player.cls.id, raid.def.id);
      if (!raid.def.trial) Pastimes.event('pull', { boss: raid.def.id, practice: !!raid.practice });
      if (SH) { SH.play('pull-go', { vol: 1 }); SH.music(SH.bossTrack(raid.def.id, raid.mode), { fade: 0.8 }); SH.phase(raid.def.id, raid.ph || 1); SH.vo('pull', { bossId: raid.def.id }); }
      return;
    }
    if (msg.stats) raid.meter = { ft: msg.time, d: Object.entries(msg.stats).map(([id, st]) => Scoring.pack(Number(id), st)) };   // (the meter ends on the final tally)
    if ((msg.s === 'clear' || msg.s === 'wipe') && msg.stats && !raid.def.trial && !raid.practice && !raid.fightLogged) { raid.fightLogged = true; Pastimes.logFight(msg, raid.def.id); }   // (the Logbook's Fights tab)
    raid.state = msg.s; raid.result = msg; raid.resultAt = now + (msg.s === 'clear' ? 3.4 : 2.8);   // [boss presentation] (after his fall / the wipe's beat)
    if (SH && (msg.s === 'clear' || msg.s === 'wipe')) { SH.castEnd(); SH.play(msg.s, { vol: 1 }); SH.music(msg.s === 'clear' ? 'mus-victory' : 'mus-wipe', { fade: 1, loop: false }); SH.vo(msg.s === 'clear' ? 'boss-death' : 'boss-wipe', { bossId: raid.def.id }); if (msg.s === 'clear') SH.vo('clear', { bossId: raid.def.id, classId: player.cls ? player.cls.id : null }); }
    if (player.cls && !raid.def.trial && !raid.practice && msg.s === 'clear') Journal.won(player.cls.id, raid.def.id);
    if (!raid.def.trial && msg.s === 'clear') Pastimes.event('clear', { boss: raid.def.id, mode: raid.mode, secs: Number(msg.time) || 0, practice: !!raid.practice,
      deaths: Object.values(msg.stats || {}).reduce((n, x) => n + (x.deaths | 0), 0), avoidable: Object.values(msg.stats || {}).reduce((n, x) => n + (x.avoidable | 0), 0),
      stats: msg.stats, myId: Net.id, alive: [...raid.party].filter(([, p]) => p.alive).map(([id]) => Number(id)) });   // (stats, myId, alive: feats read the party and your own tally, feat-rules.js)
    if (!raid.def.trial && msg.s === 'wipe' && !raid.wipeSent) { raid.wipeSent = true; Pastimes.event('wipe', { boss: raid.def.id, practice: !!raid.practice }); }
    // a real pull (not a trial or a practice run) goes on the progression record
    if ((msg.s === 'clear' || msg.s === 'wipe') && !raid.def.trial && !raid.practice && msg.maxHp > 0) {
      const pct = msg.s === 'clear' ? 0 : Math.max(0, Math.min(100, Math.round(msg.hp / msg.maxHp * 1000) / 10));
      raid.prog = progRecord(raid.def.id, raid.mode, { pct, ph: Number(msg.ph) || 1, time: Math.round(msg.time || 0), clear: msg.s === 'clear' ? 1 : 0, at: Date.now() });
    }
    fadeTelegraphs(); raid.tethers.clear(); Stagecraft.endFight(); Lamps.reset(); Kennel.endFight(); raid.lunges = []; raid.eggs = null; raid.rollers.clear(); raid.reels.clear(); player.reel = null;
    raid.sweeps.clear(); raid.edgeWarn = null; for (const p of raid.posts.values()) p.end = Math.min(p.end, now + 1);
    raid.doom.clear(); raid.lanterns = raid.lanterns.filter(l => l.last); for (const k of raid.knights.values()) k.gone = k.gone || now;
    if (msg.s === 'clear') raid.night = false;   // the Long Night lifts when he falls
    for (const z of raid.zones.values()) z.end = Math.min(z.end, now + 1);
    if (actor && actor.kit.cast) actor.kit.cast = null;
    // the end of the fight: the boss falling is a heavy thump, a wipe only a low shudder. Heroes still standing cheer
    // (a hop and the weapon thrown up, one after another) or sink to a knee (heroes.js heroPose)
    FX.shake = msg.s === 'clear' ? 7 : msg.s === 'wipe' ? 2.5 : 4;
    if (msg.s === 'clear' || msg.s === 'wipe') {
      let i = 0;
      for (const id of raid.rosterIds) {
        const e = entById(id), s = raid.party.get(id);
        if (!e || !e.st || (s && !s.alive)) continue;
        const t0 = now + (msg.s === 'clear' ? 0.25 : 0.1) + i++ * 0.14;
        e.st.react = { kind: msg.s === 'clear' ? 'cheer' : 'slump', t0 };
        if (msg.s === 'clear') e.st.action = { type: 'big', t0: t0 + 0.05, dur: ANIM_DUR.big };
      }
    }
    if (msg.s === 'clear' && player.cls && raid.def.trial) {
      Save.recordTrial(player.cls.id, raid.def.trial);
      trialPrevSpec = raid.def.trial;   // you leave the memory wearing the spec you just earned
      Save.setSpec(player.cls.id, raid.def.trial);
      const sp = specOf(player.cls.id, raid.def.trial);
      if (sp) { heroPickFx(player, { accent: sp.accent }); toast(`${sp.name} unlocked.`); }
    } else if (msg.s === 'clear' && player.cls && !raid.practice) {
      const first = !Save.bossBeaten(raid.def.id);
      Save.recordClear(player.cls.id, raid.def.id, raid.mode);
      if (first) {
        const i = BOSSES.findIndex(b => b.id === raid.def.id), next = BOSSES[i + 1];
        if (next && next.playable) later(3.5, () => toast(`Somewhere past the portal, ${next.name} stirs.`));
        if (raid.def.id === 'hollowking') later(3.5, () => toast('Every hero feels it: something new has woken in them. Look again at your hero.'));
      }
    }
    // [boss presentation] his fall first, then the confetti (victory waits for it); a wipe gets its own scene
    if (msg.s === 'clear') { if (!raid.def.trial) BOSS_VFX.bossDeath(raid.def.id, raid.bossDraw); BOSS_VFX.victory([...raid.rosterIds].map(entById).filter(Boolean), raid.def.trial ? 0 : 2.2); }
    else BOSS_VFX.wipe(raid.bossDraw, raid.def.id);
  });
  Net.on('fb', msg => {
    if (!raid) return;
    Object.assign(raid.boss, { x: msg.x, y: msg.y, f: msg.f, hp: msg.hp, mx: msg.mx, u: msg.u, v: msg.v, tg: msg.tg });
    BOSS_VFX.bossHp(raid.bossDraw, msg.hp, msg.mx);   // [boss presentation] a flinch for everyone's bigger blows
    raid.bossTrack.push(raid.fightClock.map(msg.c, rnow), msg.x, msg.y, msg.f);
    raid.lastFb = performance.now();   // for the debug overlay
    raid.fightTime = msg.ft;
    // the pull's timeline (results screen): the boss's health once a second
    if (raid.state === 'live' && msg.mx > 0 && (!raid.tl.hp.length || msg.ft - raid.tl.hp[raid.tl.hp.length - 1][0] >= 1) && raid.tl.hp.length < 1200) raid.tl.hp.push([msg.ft, msg.hp / msg.mx]);
    if (msg.na != null) raid.nextAutoAt = now + msg.na;
    raid.bossStatus = Array.isArray(msg.bs) ? msg.bs : [];   // what's on the boss (fight.js bossStatus)
    if (Array.isArray(msg.g)) raid.gates = msg.g;   // the HP gates (ticks on the boss bar) and the wall's label while the boss is sealed (fight.js raiseWall)
    raid.wallLabel = msg.wl || null;
    // a Kenseier in the party: the boss's Posture bar and Break (fight.js kenPack), for the HUD and the kit (world.boss)
    raid.posture = Array.isArray(msg.po) ? { p: msg.po[0], max: msg.po[1], broken: msg.po[2], hold: !!msg.po[3], rec: !!msg.po[4], by: msg.po[5], at: now } : null;
    if (SH && raid.state === 'live' && msg.mx > 0 && Math.floor(msg.hp / msg.mx * 20) !== raid.hpBucket) { raid.hpBucket = Math.floor(msg.hp / msg.mx * 20); SH.vo('boss-hp', { bossId: raid.def.id, hp: msg.hp, maxHp: msg.mx }); }   // (every 5%)
    if (msg.ph != null && msg.ph !== raid.ph) { const first = raid.ph == null; raid.ph = msg.ph; if (SH && raid.state === 'live') { SH.phase(raid.def.id, msg.ph); if (!first) SH.vo('boss-phase', { bossId: raid.def.id, n: msg.ph }); } }
  });
  // the boss's next moves, from the host about once a second: [[name, seconds until], ...] (drawn under the cast bar)
  Net.on('bnext', msg => {
    if (!raid) return;
    raid.bnext = Array.isArray(msg.l) ? { at: now, l: msg.l.filter(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isFinite(e[1])).slice(0, 3) } : null;
  });
  Net.on('fps', msg => {
    if (!raid) return;
    if (Number.isFinite(msg.lb)) raid.lb = msg.lb;
    raid.rc = msg.rc > 0 ? msg.rc : 0;   // seconds of 'recovering' left (fight.js FIGHT.REC)
    const listed = new Set();
    for (const [id, hp, maxHp, shield, alive, dd, vuln, mit, weak, debuffs, threat, hots, hol] of msg.ps) {
      listed.add(id);
      const s = raid.party.get(id);
      // a Gloomsworn's Hollow: [on, debt, healed, seconds left, grace left] (party frames: raid-ui.js; its own gauge: the kit)
      if (s) s.hollow = Array.isArray(hol) && hol[0] ? { debt: hol[1], healed: hol[2], left: hol[3], grace: hol[4], at: now } : null;
      if (id === Net.id && actor && actor.cls.id === 'gloomsworn') actor.notify('hollowtick', Array.isArray(hol) && hol[0] ? { on: 1, debt: hol[1], healed: hol[2], left: hol[3], grace: hol[4] } : { on: 0 });
      if (SH && s && id === Net.id && s.alive && alive) { if (shield > 0 && !(s.shield > 0)) SH.play('shield-up', { vol: 0.6, key: 'shield-up', minGap: 0.5 }); if (Array.isArray(debuffs) && debuffs.length > (Array.isArray(s.debuffs) ? s.debuffs.length : 0)) SH.play('debuff-on', { vol: 0.75, key: 'debuff-on', minGap: 0.4 }); }
      if (s) Object.assign(s, { hp, maxHp, shield, alive: !!alive, dd, vuln, mit, weak, debuffs, threat: threat || 0, hots: hots || [], left: false });
    }
    // the host stops listing anyone who left the raid; don't leave their last numbers frozen on the frames
    for (const [id, s] of raid.party) if (!listed.has(id) && !s.left) Object.assign(s, { left: true, alive: false, hp: 0, shield: 0, hots: [], debuffs: [] });
  });
  Net.on('tg', msg => {
    if (!raid) return;
    raid.tgs.set(msg.id, Object.assign({}, msg, { start: now, live: Object.assign({}, msg.shape) }));
    if (SH) SH.telegraph(msg.type);
  });
  Net.on('tgx', msg => {
    if (!raid) return;
    const tg = raid.tgs.get(msg.id);
    if (!tg || tg.gone != null) return;
    tg.gone = now;
    BOSS_VFX.impact(tg, msg, { entById, boss: raid.def.id, pol: raid.pol, units: raidUnits(), props: raid.room.props, room: raid.room, bossDraw: raid.bossDraw });
    if (msg.fail) BOSS_VFX.failed(tg);
    if (SH && tg.type !== 'safe') SH.impact(tg.type, !!(msg.hits && msg.hits.includes(Net.id)));
    if (msg.hits && msg.hits.includes(Net.id) && tg.type === 'aoe') FX.shake = Math.max(FX.shake, 5);
  });
  // Azerath: a shape that joins two heroes (a stack halfway between the Rune bearers, the bolt from one to the other) moves with them until it locks
  Net.on('azlink', msg => { const tg = raid && raid.tgs.get(msg.id); if (tg) tg.link = msg; });
  Net.on('tgclear', () => { if (raid) { fadeTelegraphs(); raid.lunges = []; raid.eggs = null; } });
  const TG_FADE = 0.25;
  function fadeTelegraphs() { for (const tg of raid.tgs.values()) if (tg.gone == null) tg.gone = now; }
  Net.on('pud', msg => {
    if (!raid) return;
    if (msg.clear) { raid.puddles.clear(); return; }
    raid.puddles.set(msg.id, { id: msg.id, x: msg.x, y: msg.y, r: msg.r, start: now, end: now + msg.dur, tag: msg.tag });
  });
  Net.on('bcast', msg => {
    if (!raid) return;
    raid.cast = { name: msg.name, dur: msg.dur, start: now, goal: Number.isFinite(msg.goal) ? msg.goal : null };
    if (raid.state === 'live' && player.cls && !raid.def.trial && !raid.practice) Journal.castStart(player.cls.id, raid.def.id, String(msg.name), msg.dur, now);
    if (SH) { SH.bossCast(raid.def.id, String(msg.name), msg.anim); SH.vo(msg.anim === 'enrage' ? 'boss-enrage' : 'boss-cast', { bossId: raid.def.id, move: String(msg.name), dur: msg.dur, hp: raid.boss.hp, maxHp: raid.boss.mx }); }
    if (raid.state === 'live' && raid.tl.casts.length < 400) raid.tl.casts.push([raid.fightTime || 0, String(msg.name).slice(0, 40), raid.cast.goal != null ? 1 : 0]);
    const castPose = BOSS_VFX.castStart(raid.def.id, msg.anim, msg.dur, raid.bossDraw, msg.name);   // [boss presentation] the move's pose
    const end = now + msg.dur, st = raid.bossDraw.st;
    const prop = (k, v, until) => { raid.props[k] = v; raid.propsUntil[k] = until; };
    switch (msg.anim) {
      case 'mince':
        prop('mince', { side: msg.side, second: msg.second || null }, end + (msg.second ? 2.2 : 0.2));
        if (msg.then) prop('next', msg.then, end + 0.3);
        break;
      case 'ladle': prop('held', 'ladle', end + 0.4); later(msg.dur - 0.5, () => raid && prop('spin', true, now + 0.9)); break;
      case 'lid': prop('held', 'lid', end + 0.2); break;
      case 'boil': prop('steam', true, end + 0.5); break;
      // Skitterra: what she's doing shows on her body
      case 'spit': case 'mist': prop('venom', true, end + 0.3); break;
      case 'wrap': case 'silk': case 'web': prop('silk', true, end + 0.3); break;
      case 'brood': prop('brood', true, end + 0.6); break;
      case 'lunge': case 'molt': prop('rear', true, end + 0.5); break;
      case 'reel': prop('silk', true, end + 4.5); prop('rear', true, end + 0.5); break;
      case 'meatballs': prop('meat', true, end + 0.3); break;
      // Volkar: the titan shows what's coming
      case 'clap': case 'storm': prop('sky', true, end + 0.4); break;
      case 'fist': case 'avalanche': prop('fist', true, end + 0.2); break;
      case 'surge': prop('polar', true, end + 0.3); break;
      case 'rods': case 'crash': case 'field': prop('charge', true, end + 0.4); break;
      case 'gale': prop('inhale', true, end + 0.1); break;
      case 'walls': prop('spin', true, end + 10); break;
      // the Hollow King
      case 'gaze': case 'lightsout': prop('gaze', true, end + 0.3); break;
      case 'lids': case 'decree': prop('raise', true, end - 0.3); break;
      case 'doom': prop('doom', true, end + 0.4); break;
      case 'knell': case 'bells': prop('knell', true, end + 0.3); break;
      case 'stomp': case 'ring': prop('graves', true, end + 0.2); break;
      case 'rise': case 'night': prop('rise', true, end + 0.3); break;
      case 'sweep': prop('raise', true, end - 0.45); break;
      // Hard-only moves
      case 'flop': prop('flop', true, end); if (msg.then) prop('next', msg.then, end + 1.6); later(msg.dur, () => raid && prop('flat', true, now + 1.3)); break;
      case 'throw': case 'larder': case 'hook': prop('toss', true, end + 0.1); break;
      case 'gut': prop('steam', true, end + 0.3); break;
      case 'flambe': prop('brandy', true, end + 0.3); break;
      case 'eggs': prop('brood', true, end + 0.6); break;
      case 'fang': prop('rear', true, end + 0.4); prop('venom', true, end + 0.2); break;
      case 'volley': prop('silk', true, end + 4.5); prop('rear', true, end + 0.5); break;
      case 'deluge': prop('venom', true, end + 0.3); prop('rear', true, end + 0.3); break;
      case 'strand': case 'cocoon': case 'ambush': prop('silk', true, end + 0.4); prop('rear', true, end + 0.3); break;
      case 'chain': case 'orbs': prop('charge', true, end + 0.4); break;
      case 'skyfall': prop('sky', true, end + 0.4); break;
      case 'audience': prop('audience', true, end + 0.3); break;
      case 'march': prop('rise', true, end + 0.3); break;
      case 'bind': prop('graves', true, end + 0.3); break;
      // Vhalgrath
      case 'claws': prop('claw', true, end + 0.2); break;
      case 'tail': prop('tail', true, end + 0.3); break;
      case 'breath': prop('breath', true, end + 0.3); break;
      case 'fly': prop('fly', true, end + 0.4); break;
      case 'dive': prop('dive', true, end + 0.2); break;
      case 'roost': prop('perch', true, end + 12.4); break;
      case 'heart': prop('heart', true, end + 0.5); break;
      // the Hydra
      case 'cry': prop('cry', true, end + 0.4); break;
      case 'maul': prop('maul', true, end + 0.3); break;
      case 'head': prop('head', true, end + 0.3); break;
      case 'burst': case 'feast': case 'rain': case 'flare': case 'crater': prop('roar', true, end + 0.2); break;
      // Hrimgar
      case 'slam': prop('raise', true, end + 0.4); break;
      case 'howl': prop('howl', true, end + 0.3); break;
    }
    for (const [k, after] of castPose || []) prop(k, true, end + after);   // [boss presentation] (boss-vfx.js CAST_POSE)
    if (msg.anim !== 'mince' && msg.anim !== 'boil') st.action = { type: 'attack', t0: end - 0.45, dur: 1.2 };
  });
  Net.on('banim', msg => {
    if (!raid) return;
    const st = raid.bossDraw.st;
    if (msg.name === 'auto') {
      if (!(st.action && st.action.t0 > now - 0.6)) st.action = { type: 'attack', t0: now - 0.45, dur: 1.0 };
      const tgt = raid.boss.tg != null ? entById(raid.boss.tg) : null;
      later(0.08, () => raid && BOSS_VFX.auto(raid.bossDraw, tgt));
    }
    else if (msg.name === 'ladle') { raid.props.held = 'ladle'; raid.propsUntil.held = now + msg.dur + 0.3; later(msg.dur - 0.5, () => { if (raid) { raid.props.spin = true; raid.propsUntil.spin = now + 0.9; } }); }
    else if (msg.name === 'lid') { raid.props.held = 'lid'; raid.propsUntil.held = now + msg.dur + 0.2; }
    else if (msg.name === 'leap') {
      // [boss presentation] Grubnak's walk down after the Flare-Up: he carries the stockpot until he sets it down (grubnak.js
      // adds the pot 0.9 s in)
      if (raid.def.id === 'grubnak' && !raid.room.props.some(p => p.kind === 'pot')) { raid.props.carry = true; raid.propsUntil.carry = now + 0.9; }
      later(msg.dur || 0.6, () => raid && BOSS_VFX.leap(raid.boss.x, raid.boss.y));
    }
    else if (msg.name === 'gorge' || msg.name === 'roar') { st.action = { type: 'attack', t0: now, dur: 1.4 }; BOSS_VFX.roar(raid.boss.x, raid.boss.y, raid.def.id); }
    else if (msg.name === 'wrap') { raid.props.silk = true; raid.propsUntil.silk = now + msg.dur + 0.3; }
    else if (msg.name === 'field') { raid.props.charge = true; raid.propsUntil.charge = now + msg.dur + 0.3; }
  });
  // --- adds, tethers, zones and Skitterra's legs (all host-driven)
  Net.on('adds', msg => {
    if (!raid) return;
    const seen = new Set(), at = raid.fightClock.map(msg.c, rnow);
    for (const [id, kind, x, y, hp, mx, enr, link, f] of msg.l) {
      seen.add(id);
      let a = raid.adds.get(id);
      if (!a) { a = { id, kind, x, y, f, born: now, track: new Track(x, y, f), st: newSt(Math.random() * 3) }; raid.adds.set(id, a); }
      else a.track.push(at, x, y, f);
      Object.assign(a, { tx: x, ty: y, hp, mx, enr: !!enr, link, tf: f });
    }
    for (const id of [...raid.adds.keys()]) if (!seen.has(id)) removeAdd(id, 0.45);
  });
  // an add that's gone fades out where it was drawn instead of vanishing
  function removeAdd(id, dur) {
    const a = raid.adds.get(id);
    if (!a) return;
    raid.adds.delete(id);
    raid.ghosts.push({ a, t0: now, dur });
  }
  Net.on('addev', msg => {
    if (!raid) return;
    const a = raid.adds.get(msg.id);
    switch (msg.k) {
      case 'spawn': BOSS_VFX.addSpawn(msg.x, msg.y, msg.kind); break;
      case 'death':
        BOSS_VFX.addDeath(a ? a.x : msg.x, a ? a.y : msg.y);
        removeAdd(msg.id, 0.3);
        if (lockedEnemy === msg.id) lockedEnemy = null;
        break;
      case 'gone': removeAdd(msg.id, 0.5); break;
      case 'enrage': BOSS_VFX.addEnrage(a || { x: msg.x, y: msg.y }); break;
      case 'fury': BOSS_VFX.fury(msg.x, msg.y); break;
      case 'bite': if (a) a.st.action = { type: 'attack', t0: now, dur: 0.5 }; break;
      case 'spit': {
        if (a) a.st.action = { type: 'attack', t0: now, dur: 0.5 };
        const e = entById(msg.tg);
        if (e && a) BOSS_VFX.spit(a, e);
        break;
      }
    }
  });
  Net.on('teth', msg => {
    if (!raid) return;
    raid.tethers.set(msg.id, { a: msg.a, b: msg.b, kind: msg.kind, len: msg.len, tag: msg.tag, start: now, end: now + msg.dur });
  });
  Net.on('tethx', msg => {
    if (!raid) return;
    if (msg.clear) { raid.tethers.clear(); return; }
    const th = raid.tethers.get(msg.id);
    raid.tethers.delete(msg.id);
    if (!th) return;
    for (const id of [th.a, th.b]) {
      const e = entById(id);
      if (e) BOSS_VFX.tetherSnap(e, msg.ok);
    }
  });
  Net.on('zone', msg => {
    if (!raid) return;
    if (msg.clear) { for (const z of raid.zones.values()) z.end = Math.min(z.end, now + 1); return; }
    raid.zones.set(msg.id, { shape: msg.shape, tag: msg.tag, start: now, end: now + (msg.delay || 0) + msg.dur, at: now + (msg.delay || 0) });
  });
  Net.on('lunge', msg => {
    if (!raid) return;
    raid.lunges.push({ who: msg.who, x: msg.x, y: msg.y, a0: msg.a0, dir: msg.dir, n: msg.n, step: msg.step, delay: msg.delay, start: now });
  });
  Net.on('husk', msg => {
    if (!raid) return;
    raid.husks.push({ x: msg.x, y: msg.y, f: msg.f, end: now + msg.dur, st: Object.assign(newSt(), { props: { husk: true } }) });
    BOSS_VFX.husk(msg.x, msg.y);
  });
  Net.on('eggs', msg => {
    if (!raid) return;
    raid.eggs = { pts: msg.pts, start: now, end: now + msg.dur };
    // the clutch splitting open once the shells have shaken a moment
    later(msg.dur, () => raid && msg.pts.forEach(([x, y]) => BOSS_VFX.hatch(x, y)));
  });
  // Rolling Meatballs: one message each; every client rolls them on its own clock
  Net.on('roll', msg => {
    if (!raid) return;
    if (msg.clear) { raid.rollers.clear(); return; }
    raid.rollers.set(msg.id, { x: msg.x, y: msg.y, a: msg.a, sp: msg.sp, r: msg.r, delay: msg.delay, start: now, tag: msg.tag, pre: !!msg.pre });
    if (msg.pre) return;   // (a lane preview: just the path, the ball comes with its own message)
    if (msg.tag === 'orb') BOSS_VFX.orbForm(msg.x, msg.y);
    else later(0.5, () => raid && BOSS_VFX.meatballLand(msg.x, msg.y));
  });
  Net.on('rollhit', msg => {
    const e = raid && entById(msg.pid), r = raid && raid.rollers.get(msg.id);
    if (e) (r && r.tag === 'orb' ? BOSS_VFX.orbHit : BOSS_VFX.meatballHit)(e);
  });
  // Chain Lightning (Volkar, Hard): the bolt's path from player to player
  Net.on('chain', msg => { if (raid) BOSS_VFX.chain((msg.ids || []).map(id => entById(id)).filter(Boolean)); });
  // Silk Reel: the hooked player is dragged in on their own client; a dash snaps it (see doDash)
  Net.on('reel', msg => {
    if (!raid) return;
    const rl = { id: msg.id, pid: msg.pid, start: now, pullAt: now + msg.windup, end: now + msg.windup + msg.dur, sp: msg.sp };
    raid.reels.set(msg.id, rl);
    if (msg.pid === Net.id) player.reel = rl;
  });
  Net.on('reelx', msg => {
    if (!raid) return;
    const rl = raid.reels.get(msg.id);
    raid.reels.delete(msg.id);
    if (player.reel && player.reel.id === msg.id) player.reel = null;
    const e = entById(msg.pid);
    if (e && rl) { if (msg.ok) BOSS_VFX.silkSnap(e, raid.bossDraw); else BOSS_VFX.reelBite(e); }
  });
  // --- Volkar
  // everyone's charge (+1 / −1); on Hard they flip at 50%
  Net.on('pol', msg => {
    if (!raid || !Array.isArray(msg.m)) return;
    for (const [id, s] of msg.m) raid.pol.set(id, s > 0 ? 1 : -1);
    if (msg.flip) for (const id of raid.pol.keys()) { const e = entById(id); if (e) BOSS_VFX.polarityFlip(e, raid.pol.get(id)); }
  });
  // a rod that has been struck stays planted for a while
  Net.on('post', msg => {
    if (!raid) return;
    if (msg.clear) { raid.posts.clear(); return; }
    raid.posts.set(msg.id, { x: msg.x, y: msg.y, start: now, end: now + msg.dur });
  });
  // Storm Walls: one message, every client turns them on its own clock
  Net.on('sweep', msg => {
    if (!raid) return;
    if (msg.clear) { raid.sweeps.clear(); return; }
    raid.sweeps.set(msg.id, { x: msg.x, y: msg.y, arms: msg.arms, a0: msg.a0, spin: msg.spin, w: msg.w, start: now, at: now + msg.delay, end: now + msg.delay + msg.dur, cover: msg.cover || null });
  });
  // the closing edge: sparks mark where the wall will be, then it jumps there and pushes anyone outside back in
  Net.on('edgewarn', msg => { if (raid) raid.edgeWarn = { r: msg.r, from: ARENA.r, start: now, end: now + msg.dur }; });
  Net.on('edge', msg => {
    if (!raid) return;
    const from = raid.edgeWarn ? raid.edgeWarn.from : ARENA.r;
    ARENA.resize(msg.r);
    raid.edgeWarn = null;
    for (const [id, p] of raid.posts) if (Math.hypot(p.x, p.y) > msg.r - 30) p.end = Math.min(p.end, now + 0.4);
    BOSS_VFX.edgeClose(from, msg.r);
    const d = Math.hypot(player.x, player.y);
    if (d > msg.r - 16) {
      const k = (msg.r - 40) / Math.max(1, d);
      player.kb = { sx: player.x, sy: player.y, tx: player.x * k, ty: player.y * k, t0: now };
      player.dashMove = null; player.target = null;
    }
  });
  // the storm's constant pulse: a faint bolt touches everyone
  Net.on('pulse', () => { if (raid) BOSS_VFX.pulse(raidUnits()); });
  // a damage check met before its cast ran out (ok) or not: the cast ends here, and the cocoon (Skitterra) tears or shuts
  Net.on('bcastend', msg => {
    if (!raid) return;
    if (raid.cast && raid.cast.name === msg.name && now < raid.cast.start + raid.cast.dur) { raid.cast.dur = Math.max(0.01, now - raid.cast.start); raid.cast.goal = null; }
    BOSS_VFX.cocoonEnd(raid.bossDraw, !!msg.ok);
  });
  // the room: props and floor state (the whole list), a prop chipped / broken / slammed into, and room moments
  Net.on('props', msg => { if (raid) ArenaView.roomProps(raid.room, msg, now); });
  Net.on('propfx', msg => { if (raid) BOSS_VFX.propFx(msg, raid.room, entById, raid.def.id); });
  Net.on('roomev', msg => { if (raid) ArenaView.roomEvent(raid.room, msg, now, entById); });

  // --- the Hollow King
  // lanterns: [id, x, y, carrier, last]; a carried one is drawn in its carrier's hands
  Net.on('lant', msg => { if (raid && Array.isArray(msg.l)) raid.lanterns = msg.l.map(([id, x, y, carrier, last]) => ({ id, x, y, carrier, last: !!last })); });
  Net.on('doomed', msg => {
    if (!raid) return;
    for (const id of msg.ids || []) { raid.doom.set(id, { start: now, end: now + (msg.dur || 14) }); const e = entById(id); if (e) BOSS_VFX.doomed(e); }
  });
  Net.on('cure', msg => { if (!raid) return; raid.doom.delete(msg.id); const e = entById(msg.id); if (e) BOSS_VFX.cure(e); if (SH && e) SH.play('cleanse', { vol: 0.7, remote: msg.id !== Net.id, at: e }); });
  Net.on('gazed', msg => { const e = raid && entById(msg.id); if (e) BOSS_VFX.gazed(e, raid.bossDraw); });
  // the Echo Knights: where they stand; one remembering a swing; one raising its blade to replay it
  Net.on('knights', msg => {
    if (!raid) return;
    const seen = new Set();
    for (const [id, x, y, f] of msg.k || []) {
      seen.add(id);
      if (!raid.knights.has(id)) { raid.knights.set(id, { id, x, y, f, born: now, st: Object.assign(newSt(Math.random() * 3), { props: {} }) }); BOSS_VFX.knightRise({ x, y }); }
    }
    for (const [id, k] of raid.knights) if (!seen.has(id) && !k.gone) k.gone = now;
  });
  Net.on('kmem', msg => { const k = raid && raid.knights.get(msg.id); if (k) { k.mem = now; BOSS_VFX.knightMemory(k); } });
  Net.on('kswing', msg => {
    const k = raid && raid.knights.get(msg.id);
    if (!k) return;
    k.ready = now + msg.dur;
    k.st.action = { type: 'attack', t0: now + msg.dur - 0.4, dur: 1.0 };
  });
  Net.on('night', msg => { if (!raid) return; raid.night = !!msg.on; if (raid.night) BOSS_VFX.nightFall(); });

  Net.on('kb', msg => {
    if (!raid || msg.id !== Net.id || (actor && actor.kit.ultSteady())) return;   // (an Ultimate's lock: engine.js ultSteady)
    const a = Math.atan2(player.y - msg.y, player.x - msg.x);
    const dest = { x: player.x + Math.cos(a) * msg.d, y: player.y + Math.sin(a) * msg.d };
    clampArena(dest);
    PROPS.clipMove(player, dest, raid.room.props, 14);   // a throw stops at a solid prop
    player.kb = { sx: player.x, sy: player.y, tx: dest.x, ty: dest.y, t0: now };
    player.dashMove = null; player.target = null;
  });
  // a heal someone else landed on you (fight.js applyHeal): its number, a paler green than your own heals'
  Net.on('pheal', msg => {
    if (!raid || msg.id !== Net.id || !(msg.a >= 1) || !player) return;
    FX.text(player.x, player.y - (player.lift || 0) - 18, '+' + rnd(msg.a), '#a6e8b0', 13, 1, { kind: 'heal' });
    if (SH) SH.play('heal-land', { vol: 0.55, key: 'heal-land', minGap: 0.3 });
  });
  Net.on('pdmg', msg => {
    if (!raid) return;
    // party frames react to the hit right away instead of waiting for the next party update
    const ps = raid.party.get(msg.id);
    if (ps && msg.hp != null) { ps.hp = msg.hp; if (msg.a > 0) ps.hitAt = now; }
    heroFlinch(msg, ps);
    // a blow that left them at 0: the death log on the results screen
    if (msg.k === 'enrage') BOSS_VFX.enrageLand(raid.def.id, raid.bossDraw);   // [boss presentation] the enrage lands (once)
    if (msg.hp === 0 && msg.a > 0 && raid.state === 'live' && raid.deaths.length < 60) {
      const c = raid.cast && now <= raid.cast.start + raid.cast.dur + 0.3 ? raid.cast.name : null;
      raid.deaths.push({ id: msg.id, t: raid.fightTime || 0, n: typeof msg.n === 'string' ? msg.n.slice(0, 40) : null, k: String(msg.k || ''), cast: c });
    }
    if (msg.id !== Net.id) return;
    raid.taken.push({ t: now, a: msg.a });
    if (actor && msg.a > 0) actor.notify('taken', msg);   // (a Gloomsworn's vessel fills for every hit it takes)
    // the death recap: your last few hits, named by the move they came from (or what kind of hit it was)
    if (msg.a > 0) {
      const c = raid.cast && now <= raid.cast.start + raid.cast.dur + 0.3 ? raid.cast.name : null;
      (raid.hits || (raid.hits = [])).push({ t: now, a: msg.a, n: typeof msg.n === 'string' ? msg.n.slice(0, 40) : null, k: String(msg.k || ''), cast: c, hp: msg.hp, dd: !!msg.dd });
      if (raid.hits.length > 12) raid.hits.shift();
    }
    // (left of the body, clear of the name tag; what your shield ate beside it in muted blue: msg.sh, fight.js)
    const hy = player.y - (player.lift || 0) - 18;
    if (msg.a > 0) FX.text(player.x, hy, '-' + rnd(msg.a), msg.dd ? '#ff4a3a' : '#ff8a7a', msg.a > 400 ? 18 : 14, 1, { kind: 'taken' });
    if (msg.sh >= 1) FX.text(player.x, hy, rnd(msg.sh) + ' absorbed', '#9cc4ec', 12, 1, { kind: 'absorb' });
    if (SH && msg.a > 0) SH.play(ps && ps.maxHp > 1 && msg.a > ps.maxHp / 3 ? 'hit-heavy' : 'hit-light', { vol: 0.85, key: 'hit', minGap: 0.08 });
    if (SH && msg.sh >= 1 && msg.a > 0) SH.play('shield-break', { vol: 0.7, key: 'shield-break', minGap: 0.4 });   // (it ate what it could and broke)
    if (msg.dd) FX.shake = Math.max(FX.shake, 4);
    // the screen's edge flushes red, harder the bigger the bite out of your health
    if (msg.a > 0 && ps && ps.maxHp > 1) {
      const k = clamp(msg.a / ps.maxHp * 2.2, 0.25, 1);
      raid.hurtK = now - (raid.hurtAt ?? -9) < 0.35 ? Math.max(raid.hurtK, k) : k; raid.hurtAt = now;
    }
  });
  Net.on('fev', msg => {
    if (!raid) return;
    const e = entById(msg.id);
    if (msg.k === 'death' && e) BOSS_VFX.playerDeath(e);
    if (msg.k === 'behind') BOSS_VFX.behind(raid.bossDraw, msg.n);   // [boss presentation] the soft enrage's pass: he gets heavier
    if (msg.k === 'death') raid.doom.delete(msg.id);
    if (msg.k === 'raised' && e) BOSS_VFX.playerRaised(e);
    if (msg.k === 'raised' && raid.rezAsks) delete raid.rezAsks[msg.id];   // (the ask is answered: askRaise)
    if (SH && e && (msg.k === 'death' || msg.k === 'raised')) { const mine = msg.id === Net.id; SH.play(msg.k === 'death' ? 'death' : 'revive', { vol: 0.9, remote: !mine, at: mine ? null : e }); SH.vo(msg.k === 'death' ? 'hero-down' : 'hero-revive', { id: msg.id, classId: e.cls ? e.cls.id : null, mine, local: mine }); }
    // a Time Stop on the boss (Time Reversal, fight.js pauseBoss): it freezes mid-pose, frosted, under a stopped clock
    if (msg.k === 'pause' && msg.dur > 0) { const d = Math.min(2.5, +msg.dur); raid.bossPause = { at: now, end: now + d }; BOSS_VFX.timeStop(raid.bossDraw, d); }
    if (msg.k === 'brandHit') { VFX.setScale(msg.id === Net.id ? 1 : 0.6); try { KIT_VFX.brandHit(e, { x: raid.boss.x, y: raid.boss.y }); } finally { VFX.setScale(1); } }
    if (msg.k === 'taunt' && e && msg.id !== Net.id) playTaunt(e, enemyNow(msg.tg), false);   // (your own played when you pressed it)
    // the advanced tanks' moments (something eaten, a bill stamped): CLASS_FEV in ability-vfx.js
    if (typeof CLASS_FEV !== 'undefined' && CLASS_FEV[msg.k] && e) { VFX.setScale(msg.id === Net.id ? 1 : 0.6); try { CLASS_FEV[msg.k](msg, e, { mine: msg.id === Net.id, tgs: raid.tgs, now, boss: raid.bossDraw }); } finally { VFX.setScale(1); } }
    if (msg.k === 'raised' && msg.by === Net.id && msg.id !== Net.id && !raid.pvp) Pastimes.event('raise', {});   // (feats)
    if (msg.k === 'hollow' && msg.id === Net.id && !msg.on && msg.ok) Pastimes.event('hollow', { ok: 1 });
    if (msg.id !== Net.id || !actor) return;
    if (msg.k === 'eat' || msg.k === 'ledger' || msg.k === 'hollow') actor.notify(msg.k, msg);
    if (msg.k === 'perfect') actor.notify('perfect', msg);   // (msg.b: it was a tankbuster)
    if (msg.k === 'reflect') actor.notify('reflect', msg);
    if (msg.k === 'read') actor.notify('read', msg);   // an Ironpalm's Read caught a hit (msg.b: it was a tankbuster)
    if (msg.k === 'shieldEnd') actor.notify('shieldEnd', msg);
    if (msg.k === 'carry' || msg.k === 'snapped' || msg.k === 'dollhit' || msg.k === 'houndhit' || msg.k === 'tiefail') actor.notify(msg.k, msg);   // threads and Dolls (classes-c)
    if (msg.k === 'lit' || msg.k === 'relit') actor.notify(msg.k, msg);   // what your lanterns healed (fight.js LANTERNS)
    if (msg.k === 'kdef' || msg.k === 'kbrk' || msg.k === 'kbend') actor.notify(msg.k, msg);   // a Kenseier's deflect and Breaks (fight.js KENSEI_HOST)
    if (msg.k === 'death') { actor.kit.cast = null; actor.kit.queued = null; actor.kit.queuedO = null; actor.kit.inbuf.length = 0; player.target = null; player.dashMove = null; }
  });
  // the Threadweavers' threads, their snaps, and every Marionettist's Dolls (classes-c, stagecraft.js)
  Net.on('thr', msg => { if (raid) Stagecraft.onThreads(msg, now); });
  Net.on('thrs', msg => { if (raid) Stagecraft.onSnaps(msg, now, entById); });
  Net.on('dolls', msg => { if (raid) Stagecraft.onDolls(msg, now, Net.id); });
  Net.on('hounds', msg => { if (raid) Kennel.onHounds(msg, now, Net.id); });   // every Houndmaster's hounds (kennel.js)
  Net.on('lamps', msg => { if (raid) Lamps.onList(msg, Net.id); });   // every Lanternkeeper's lanterns (lanterns.js)
  // a healer's buff on one chosen ally (raid-host.js allyBuffs): every client keeps them all, for the party frames
  Net.on('abuff', msg => {
    if (!raid || !ALLY_BUFFS[msg.id]) return;
    raid.abuffs = raid.abuffs.filter(b => !(b.to === msg.to && b.id === msg.id) && b.end > now);
    raid.abuffs.push({ to: msg.to, id: msg.id, kind: msg.kind, value: msg.value, end: now + msg.dur, from: msg.from });
    const e = entById(msg.to);
    if (e) { VFX.shock(e.x, e.y, { r: 46, color: '#ffe2a0', w: 3, dur: 0.45 }); VFX.motes(e.x, e.y, { color: '#ffe9a0', n: 8, r: 24 }); }
    if (SH && msg.to === Net.id) SH.play('buff-on', { vol: 0.6, key: 'buff-on', minGap: 0.3 });
  });
  Net.on('pbuff', msg => {
    if (!raid) return;
    raid.pbuffs.push({ kind: msg.kind, value: msg.value, end: now + msg.dur });
    const e = entById(msg.from);
    if (e) BOSS_VFX.partyBuff(e);
    if (SH) SH.play('buff-on', { vol: 0.7, key: 'buff-on', minGap: 0.3 });
  });
  Net.on('bots', msg => {
    if (!raid) return;
    const at = raid.botClock.map(msg.c, rnow);
    for (const [id, x, y, a, m] of msg.b) {
      const b = raid.bots.get(id);
      if (!b) continue;
      if (!b.track) b.track = new Track(b.x, b.y, b.angle);
      b.track.push(at, x, y, a);
      b.tx = x; b.ty = y; b.ta = a; b.m = m;
    }
  });

  // ---------------------------------------------------------------- input
  const mouse = { x: 0, y: 0, rightDown: false, holdOff: false };
  const mouseWorld = () => ({ x: mouse.x / zoom + cam.x, y: mouse.y / zoom + cam.y });

  function hoverTarget() {
    if (scene !== 'town') return null;
    const m = mouseWorld();
    let best = null, bd = Infinity;
    for (const it of [...interactables, ...lineup.map(h => ({ x: h.x, y: h.y, r: 24, reach: 80, label: h.cls.name, open: () => openHeroPanel(h.cls) })), ...TownLife.interactables(), ...Pastimes.interactables(), ...BarrowGate.interactables()]) {
      const d = Math.hypot(m.x - it.x, m.y - it.y);
      if (d < it.r && d < bd) { best = it; bd = d; }
    }
    return best;
  }
  function allyUnderMouse() {
    const m = mouseWorld();
    let best = null, bd = 34;
    for (const c of allyList()) { const d = Math.hypot(c.ent.x - m.x, c.ent.y - 10 - m.y); if (d < bd) { bd = d; best = c.id; } }
    return best;
  }
  function moveTo(p, marker) {
    if (amDead()) return;
    player.target = { x: p.x, y: p.y };
    if (marker) FX.add({ type: 'click', x: p.x, y: p.y, dur: 0.45 });
  }

  // right-click is the game's anywhere on the page (the browser's menu only in a text box)
  document.addEventListener('contextmenu', e => { if (!(e.target.closest && e.target.closest('input, textarea'))) e.preventDefault(); });
  canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (Pings.wheelIsOpen()) Pings.wheelMove(e.clientX, e.clientY);
    if (mouse.rightDown && !player.dashMove && !mouse.holdOff) moveTo(mouseWorld(), false);
  });
  // the wheel scrolls the raid camera out a little (and back in); kept between pulls
  canvas.addEventListener('wheel', e => {
    if (scene !== 'arena' || panelOpen()) return;
    e.preventDefault();
    Save.setSetting('camout', Math.round(clamp(camOut() - Math.sign(e.deltaY) * 0.05, 0.8, 1) * 100) / 100);
  }, { passive: false });
  canvas.addEventListener('mousedown', e => {
    if (!started) return;
    // clicking the world takes keyboard focus back from any UI button
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (e.button >= 3) { const a = Keybinds.actionOf('mouse' + e.button, player.cls && player.cls.id); if (a) { e.preventDefault(); runAction(a, e); } return; }
    if (inArena() && e.button === 1) { e.preventDefault(); const m = mouseWorld(); sendPing(m.x, m.y, null); return; }
    if (inArena() && e.button === 0 && e.altKey) { e.preventDefault(); pingFrom = mouseWorld(); Pings.wheelOpen(e.clientX, e.clientY); return; }
    if (placingMark && inArena()) {
      if (e.button === 0) { const m = mouseWorld(); sendWaymark({ k: placingMark, x: m.x, y: m.y }); }
      placeMark(null);   // (right-click just puts it away)
      return;
    }
    if (e.button === 2) { mouse.rightDown = true; mouse.holdOff = false; player.interact = null; moveTo(mouseWorld(), true); if (SH && player.cls && !amDead()) SH.vo('hero-move', { classId: player.cls.id, scene }); return; }
    if (e.button !== 0) return;
    if (scene === 'town' && Pastimes.pondClick(mouseWorld(), now)) return;   // (fishing: cast, strike, reel)
    const ch = inArena() && Loot.chestAt();
    if (ch && Math.hypot(mouseWorld().x - ch.x, mouseWorld().y - ch.y) < 40) { Loot.open(); if (SH) SH.play('chest-open', { vol: 0.8 }); return; }
    const it = hoverTarget();
    if (it) { player.interact = it; player.target = { x: it.x, y: it.y }; return; }
    if (SH && player.cls && Math.hypot(mouseWorld().x - player.x, mouseWorld().y - (player.y - 18)) < 26) SH.vo('hero-select', { classId: player.cls.id, scene });
    const ally = healerish() ? allyUnderMouse() : null;
    if (ally != null) { lockedAlly = ally; return; }
    // clicking an enemy picks it as your target
    if (inArena()) {
      const m = mouseWorld();
      const en = arenaEnemies().find(c => Math.hypot(c.x - m.x, c.y - m.y) < c.r + 8);
      if (en) { lockedEnemy = en.id; return; }
    } else if (scene === 'town') {
      const m = mouseWorld();
      const di = dummies.findIndex(d => Math.hypot(d.x - m.x, d.y - 14 - m.y) < 30);
      if (di >= 0) { lockedEnemy = 'dummy:' + di; return; }
    }
    player.interact = null; moveTo(mouseWorld(), true);
  });
  window.addEventListener('mouseup', e => {
    if (e.button >= 3 && Keybinds.actionOf('mouse' + e.button, player.cls && player.cls.id)) e.preventDefault();   // (a bound side button never goes Back)
    if (e.button === 2) mouse.rightDown = false;
    if (e.button === 0 && Pings.wheelIsOpen()) { const c = Pings.wheelClose(); if (c && pingFrom && inArena()) sendPing(pingFrom.x, pingFrom.y, c); pingFrom = null; }
  });
  // (the wheel follows the cursor even over the HUD while it's open)
  window.addEventListener('mousemove', e => { if (Pings.wheelIsOpen() && e.target !== canvas) Pings.wheelMove(e.clientX, e.clientY); });
  // the middle button never starts the browser's autoscroll
  canvas.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  window.addEventListener('keyup', e => { if (e.key === 'Alt') e.preventDefault(); });
  // the window loses focus mid-drag (Alt+Tab, a click outside): the wheel closes without pinging
  window.addEventListener('blur', () => { if (Pings.wheelIsOpen()) { Pings.wheelClose(); pingFrom = null; } });
  document.addEventListener('mouseover', e => { const row = e.target.closest && e.target.closest('.pf'); hoverFrame = row ? Number(row.dataset.id) : null; });

  const chatInput = $('chat-input');
  const SLOT_OF = { q: 0, w: 1, e: 2, r: 3, d: 4, f: 5, ' ': 6, t: 7 };   // the default keys (the guides' combos name these)
  // Options (K): keys and the HUD (keybinds.js)
  function openOptions() {
    Keybinds.openPanel({
      namer: i => (i < 6 && actor && actor.abilities[i] ? actor.abilities[i].name : i === 7 && actor && actor.kit.ult ? actor.kit.ult.name : null),
      onChange: () => { document.querySelectorAll('#ability-row .slot').forEach(el => { const k = el.querySelector('kbd'); if (k) k.textContent = SLOT_KEYS[Number(el.dataset.i)]; }); updateHelp(); },
      prefs: player.cls ? {
        get: () => ({ frames: frameDock(), role: ROLES[player.cls.role].name.toLowerCase(), mouseover: mouseoverOn(), selfbar: selfBarOn() }),
        set: (k, v) => { if (k === 'frames') { Save.setSetting(`frames-${player.cls.role}`, v === 'strip' ? 'strip' : 'left'); applyFrameDock(); } if (k === 'mouseover') Save.setSetting('mouseover', !!v); if (k === 'selfbar') Save.setSetting('selfbar', !!v); },
      } : null,
    });
  }
  // ---- town life: the townsfolk, unlock moments and feasts (town-life.js)
  TownLife.init({
    beaten: id => unlockAll || Save.bossBeaten(id),
    hero: () => (player.cls ? player.cls.id : null),
    role: () => (player.cls ? player.cls.role : null),
    player,
    addItem: key => { const inst = Inventory.add(key, player.cls && player.cls.id); VFX.burst(player.x, player.y, { color: Inventory.rarityColor(inst), color2: '#ffffff', n: 20, speed: 220 }); },
    gold: () => Save.gold(),
    spendGold: n => { Save.addGold(-n); Inventory.refreshGold(); if (SH) SH.play('ui-buy', { bus: 'ui' }); },
    toast: msg => toast(msg),
    orderFeast: id => {
      if (!Net.isHost && !Net.online) { toast('Not connected: nobody to cook for.'); return false; }
      if (Net.isHost) hostFeast(Net.id, { id }); else Net.send({ t: 'feastreq', id });
      return true;
    },
    blocked: (x, y) => COLLIDERS.rects.some(r => x > r.x - 14 && x < r.x + r.w + 14 && y > r.y - 14 && y < r.y + r.h + 14) || COLLIDERS.circles.some(c => Math.hypot(x - c.x, y - c.y) < c.r + 12),
    collide: e => resolveCollisions(e, 12),
    fishShop: () => Pastimes.openFishShop(),
    focusCamera: f => { camFocus = f ? { f, until: now + 5 } : null; },   // (a few seconds at most; moving takes it back)
    // the eating scene (town-life.js): its own camera hold, who sits down, whether you've moved, and what time it is
    holdCamera: (pt, secs, zm) => { camFocus = pt ? { f: pt, until: now + (secs || 8), hold: true, zoom: zm || 0 } : null; },
    diners: () => [...(player.cls ? [{ ent: player, name: player.name || 'You', cls: player.cls, spec: player.spec || null, me: true }] : []),
      ...[...remotes.values()].filter(r => r.scene === 0 && r.cls).map(r => ({ ent: r, name: r.name || 'Hero', cls: r.cls, spec: r.spec || null }))],
    moving: () => (player.dashMove ? 'dash' : player.target || null),
    inTown: () => scene === 'town' && started,
    now: () => now,
    onFeast: () => { Inventory.refresh(); sendGear(); },
  });
  // ---- the Barrow Gate (barrow-gate.js): appears once a hero has cleared the Hollow King; its panel is openBarrow
  BarrowGate.init({
    open: () => openBarrow(),
    banner: text => TownLife.banner(text),
    focus: pt => { camFocus = { f: pt, until: now + 5 }; },
    busy: () => TownLife.busy() || TownLife.isTalking() || panelOpen() || practiceOpen(),
    sound: () => { if (typeof Sound !== 'undefined') Sound.play('arrival', { vol: 0.8 }); },
  });
  Inventory.setExtra(clsId => TownLife.feastTotals(clsId));
  const feastAt = new Map();
  function hostFeast(pid, m) {
    if (!m || typeof m.id !== 'string' || !(typeof FEASTS !== 'undefined' && FEASTS.some(f => f.id === m.id))) return;
    if (now - (feastAt.get(pid) || -99) < 30) return;   // (one order per person every half minute)
    feastAt.set(pid, now);
    const who = pid === Net.id ? (player.name || 'Someone') : (remotes.get(pid) || {}).name || 'Someone';
    Net.broadcastAll({ t: 'feast', id: m.id, by: who, from: pid });
  }
  Net.onHost('feastreq', hostFeast);
  Net.on('feast', m => { if (scene === 'town' || m.from === Net.id) { TownLife.eat(m.id, m.from === Net.id ? null : m.by); Pastimes.event('feast', { id: m.id }); } });
  // leaving the page while online in a raid asks first (an unbound mouse Back, Ctrl+W, F5)
  window.addEventListener('beforeunload', e => { if (started && !Net.solo && (scene === 'arena' || Net.isHost)) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('mouseup', e => { if (started && e.button >= 3) e.preventDefault(); });
  window.addEventListener('emberfall-save-failed', () => toast("Couldn't save: this browser's storage is full."));
  // two tabs of the game share one save; the newer one warns
  try {
    const bc = new BroadcastChannel('emberfall');
    bc.onmessage = ev => { if (ev.data === 'hello') bc.postMessage('here'); else if (ev.data === 'here') toast('Emberfall is open in another tab: both share one save, so play in one.'); };
    bc.postMessage('hello');
  } catch (e) { /* no BroadcastChannel */ }
  // a clicked button lets go of focus, so Space and Enter never press it again
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b && b !== chatInput) b.blur(); }, true);
  // ---- pastimes: feats & titles, secrets, the bounty board, fishing, emotes, the Logbook, the prologue (pastimes.js)
  function giveGift(id) {
    if (!player.cls || typeof TOWN_GIFTS === 'undefined' || !TOWN_GIFTS[id]) return false;
    const t = Save.get('town') || {}; t.gifts = t.gifts || {}; const mine = t.gifts[player.cls.id] = t.gifts[player.cls.id] || {};
    if (mine[id]) return false;
    mine[id] = 1; Save.set('town', t);
    Inventory.add('gift_' + id, player.cls.id);
    return true;
  }
  function whenOk(w) {
    const flags = (Save.get('town') || {}).flags || {}, b = id => unlockAll || Save.bossBeaten(id);
    if (w.beaten && !w.beaten.every(b)) return false;
    if (w.notBeaten && w.notBeaten.some(b)) return false;
    if (w.flags && !w.flags.every(f => flags[f])) return false;
    if (w.notFlags && w.notFlags.some(f => flags[f])) return false;
    return true;
  }
  Pastimes.init({
    player, toast: m => toast(m), addGold: n => Inventory.addGold(n), giveGift, matches: whenOk,
    bossOpen: id => bossOpen(BOSSES.find(b => b.id === id) || BOSSES[0]), beaten: id => unlockAll || Save.bossBeaten(id),
    items: () => Inventory.items(), iconURL: key => Inventory.iconURL({ key }),
    onTitle: t => sendTitle(t), later: (s2, fn) => later(s2, fn),
  });
  // every piece you ever hold goes in the Armory
  { const add0 = Inventory.add; Inventory.add = (k, o) => { const i = add0(k, o); Pastimes.event('item', { key: k }); return i; }; }
  function sendTitle(t) {
    t = typeof t === 'string' ? t.slice(0, 40) : null;
    player.title = t;
    updateHeroName();
    if (!Net.online) return;
    if (Net.isHost) Net.broadcastAll({ t: 'ttl', id: Net.id, title: t }); else Net.send({ t: 'ttlreq', title: t });
  }
  Net.onHost('ttlreq', (pid, m) => Net.broadcastAll({ t: 'ttl', id: pid, title: typeof m.title === 'string' ? m.title.slice(0, 40) : null }));
  Net.on('ttl', m => { const r = remotes.get(m.id); if (r) r.title = typeof m.title === 'string' ? m.title.slice(0, 40) : null; });
  Net.on('join', () => setTimeout(() => sendTitle(Pastimes.title()), 400));   // (someone new: they hear your title)
  player.title = Pastimes.title();
  // the journal shows the heroes you've played (the current one first)
  Journal.setOpener(() => ({
    bosses: BOSSES, open: bossOpen, hero: player.cls ? player.cls.id : null, boss: raid && !raid.def.trial ? raid.def.id : null,
    heroes: () => CLASSES.filter(c => (player.cls && c.id === player.cls.id) || Object.keys(Save.journal(c.id).met).length).sort((a, b) => (player.cls && b.id === player.cls.id) - (player.cls && a.id === player.cls.id)),
  }));
  // the Tutorial (Raid Board): the lessons, and the briefing for each boss that's open
  const openTutorial = boss => Tutorial.open({ bosses: () => BOSSES.filter(b => b.playable && bossOpen(b)), boss });
  $('tutorial-btn').addEventListener('click', () => openTutorial(null));
  $('opt-btn').addEventListener('click', () => (Keybinds.panelOpen() ? Keybinds.closePanel() : openOptions()));
  $('menu-chip').addEventListener('click', () => (Keybinds.panelOpen() ? Keybinds.closePanel() : openOptions()));
  $('menu-chip').addEventListener('mousedown', e => e.stopPropagation());
  // a bound action that isn't a panel (keyboard or a mouse's side button)
  function runAction(a, e) {
    if (a === 'meter') { if (inArena()) RaidUI.toggleMeter(); return; }
    if (a === 'metermode') { if (inArena() && !e.repeat) RaidUI.cycleMeter(); return; }
    if (a === 'focus') { if (!e.repeat) setFocus(); return; }
    if (a === 'limit') { if (inArena() && !e.repeat) useLimit(); return; }
    if (a === 'rezask') { if (inArena() && !e.repeat) askRaise(); return; }
    if (a === 'options') { if (Keybinds.panelOpen()) Keybinds.closePanel(); else openOptions(); return; }
    if (a === 'journal') { Journal.toggle(); return; }
    if (a === 'logbook') { if (Pastimes.anyOpen()) Pastimes.closeAll(); else Pastimes.openBook(); return; }
    // a party member by place, in party-frame order (1-4; F1-F4 while you play an Alembist, whose number keys are vials)
    const ally = /^(?:ally|alemAlly)([1-4])$/.exec(a);
    if (ally) { const pick = partyOrder()[Number(ally[1]) - 1]; if (pick != null) lockedAlly = pick; return; }
    // the Alembist's vial keys: mark the vial in that place for the next Throw (kits.js alemMark; an empty place does
    // nothing). The mark lives on your own kit: the throw's events name the vial it took, so nothing else is sent.
    const vial = /^vial([1-5])$/.exec(a);
    if (vial) { if (!e.repeat && actor && actor.kit.def.markVial) actor.kit.def.markVial(actor.kit, Number(vial[1]) - 1); return; }
    if (a[0] !== 's') return;
    const idx = Number(a.slice(1));
    if (e.repeat && idx >= 6) return;
    if (e.repeat && actor && actor.kit.pace && actor.kit.pace.repeat === false) return;   // a paced kit counts presses, not a held key
    if (e.shiftKey && idx < 6 && actor && actor.abilities[idx] && actor.abilities[idx].target === 'ally') selfCast = { i: idx, until: now + ENGINE.QUEUE_WINDOW + 0.3 };
    else if (!e.repeat && selfCast && selfCast.i === idx) selfCast = null;
    pressSlot(idx);
  }
  let shiftDown = false;   // (Shift held at a key press: a Houndmaster's Whistle: Flank sends the other hound)
  window.addEventListener('keydown', e => { shiftDown = !!e.shiftKey; }, true);
  window.addEventListener('keyup', e => { shiftDown = !!e.shiftKey; }, true);
  window.addEventListener('blur', () => { shiftDown = false; });
  window.addEventListener('keydown', e => {
    if (e.key === 'Alt') e.preventDefault();   // (Alt is the ping wheel: it must never pull focus to the browser's menu)
    if (!started) return;
    if (e.key === 'Escape' && Pings.panelOpen()) { Pings.closePanel(); return; }
    if (e.key === 'Escape' && practiceOpen()) { closePractice(); return; }
    if (e.key === 'Escape' && barrowOpen()) { closeBarrow(); return; }
    if (e.key === 'Escape' && Keybinds.panelOpen()) { Keybinds.closePanel(); return; }
    if (e.key === 'Escape' && Journal.isOpen()) { Journal.close(); return; }
    if (e.key === 'Escape' && Tutorial.isOpen()) { Tutorial.close(); return; }
    if (e.key === 'Escape' && TownLife.isTalking()) { TownLife.endTalk(); return; }
    if (e.key === 'Escape' && Loot.isOpen()) { Loot.close(); return; }
    if (e.key === 'Escape' && Pastimes.anyOpen()) { Pastimes.closeAll(); return; }
    if (e.key === 'Escape' && Keybinds.isArranging()) { Keybinds.arrange(false); return; }
    // Tab never moves browser focus once you're in the game; it cycles enemy targets instead
    if (e.key === 'Tab') {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement !== chatInput) document.activeElement.blur();
    }
    if (document.activeElement === chatInput) {
      if (e.key === 'Enter') { sendChat(chatInput.value); chatInput.value = ''; chatInput.blur(); chatInput.classList.add('hidden'); }
      if (e.key === 'Escape') { chatInput.value = ''; chatInput.blur(); chatInput.classList.add('hidden'); }
      return;
    }
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'Escape' && placingMark) { placeMark(null); return; }
    // Esc: back out of a page, close a panel, drop your targets, and with nothing left to close, open the menu
    if (e.key === 'Escape') { if (selOpen()) selBack(); else if (panelOpen()) closePanels(); else if (lockedAlly != null || lockedEnemy != null) { lockedAlly = null; lockedEnemy = null; } else if (started && !e.repeat) openOptions(); return; }
    // (Shift turns 5 into %, ; into :, ...: a bound symbol key still works with Shift through its physical key)
    const SHIFTED = { Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=' };
    const kname = String(e.key || '').toLowerCase();
    const bcls = player.cls && player.cls.id;   // (the Alembist's own keys: keybinds.js CLASS_KEYS)
    const act = Keybinds.actionOf(kname, bcls) || (e.shiftKey && SHIFTED[e.code] ? Keybinds.actionOf(SHIFTED[e.code], bcls) : null);
    if (act && /^f\d+$/.test(kname)) e.preventDefault();   // (a bound F key never opens the browser's help or search)
    if (act === 'options' || act === 'journal' || act === 'logbook') { e.preventDefault(); if (!e.repeat) runAction(act, e); return; }
    const floating = () => { Journal.close(); Tutorial.close(); Keybinds.closePanel(); };   // (a full page never opens behind them)
    if (act === 'bags' && !selOpen() && overlay.classList.contains('hidden')) { TalentPanel.close(); floating(); Inventory.toggle(); return; }
    if (act === 'talents' && started && !selOpen() && overlay.classList.contains('hidden')) {
      if (TalentPanel.isOpen()) TalentPanel.close(); else { floating(); openTalents(); }
      return;
    }
    if (panelOpen()) return;
    if (act === 'chat') { chatInput.classList.remove('hidden'); chatInput.focus(); e.preventDefault(); return; }
    if (act === 'hurt') { e.preventDefault(); lockMostHurt(); return; }
    if (act === 'cycle') { e.preventDefault(); cycleTarget(e.shiftKey ? -1 : 1); return; }
    if (act) { e.preventDefault(); runAction(act, e); }
  });
  // same order as the party frames: tank, healer, dps
  function partyOrder() {
    if (!inArena()) return [Net.id, ...[...remotes.values()].filter(r => r.scene === 0).map(r => r.id)];
    const order = { tank: 0, healer: 1, dps: 2 };
    return [...raid.roster].sort((a, b) => order[a.role] - order[b.role] || a.id - b.id).map(r => r.id);
  }

  // ---------------------------------------------------------------- update
  function turnToward(e, target, dt, speed = 14) {
    let d = target - e.angle;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    e.angle += d * Math.min(1, dt * speed);
  }

  let lastSent = 0, lastSentKey = '';
  let wasInPortal = false;

  function update(dt) {
    FX.update(now, dt);
    // the effects' own clock: it crawls through a hit-stop (an Ultimate's impact) while game time runs on
    const vdt = now < hitStopUntil ? dt * 0.08 : dt;
    vfxClock += vdt;
    VFX.update(vfxClock, vdt);
    runTimers();
    updatePlayer(dt);
    if (actor) {
      const down = amDead();
      if (down && !wasDown) actor.onDeath();   // (a fall keeps half the Ultimate's charge: engine.js ultDeath)
      wasDown = down;
      actor.update();
    }
    sendPos();
    // your Dolls to the host, 10 times a second (classes-c; the host's own go straight in)
    if (inArena() && raid.state === 'live' && Stagecraft.dueMine(now)) {
      const l = Stagecraft.S.mine.l;
      if (Net.isHost && (pvpHost || raidHost)) (pvpHost || raidHost).sim.setDoll(Net.id, l); else Net.send({ t: 'doll', l: l.map(d => [d.x, d.y, d.st, d.s]) });
    }
    // your lanterns to the host, 10 times a second (the host's own go straight in)
    if (inArena() && raid.state === 'live' && Lamps.dueMine(now)) {
      const l = Lamps.S.mine;
      if (Net.isHost && (pvpHost || raidHost)) (pvpHost || raidHost).sim.setLamps(Net.id, l); else Net.send({ t: 'lamp', l });
    }
    // your hounds to the host, 10 times a second (the host's own go straight in)
    if (inArena() && raid.state === 'live' && Kennel.dueMine(now)) {
      if (Net.isHost && (pvpHost || raidHost)) { const sim = (pvpHost || raidHost).sim; if (typeof sim.setHounds === 'function') sim.setHounds(Net.id, Kennel.S.mine.l); } else Net.send({ t: 'hound', l: Kennel.wireMine() });
    }
    Stagecraft.update(now, dt); Kennel.update(now, dt);
    updateRemotes(dt);
    if (scene === 'town') updateTown(dt); else updateArena(dt);
    TownLife.update(dt, now, scene === 'town' && started);
    Pastimes.update(now, scene === 'town' && started);
    BarrowGate.update(dt, now, scene === 'town' && started);
    if (scene === 'town') TownLife.checkDistance(); else if (TownLife.isTalking()) TownLife.endTalk();
    updateCamera(dt);
  }

  function updatePlayer(dt) {
    player.st.t = now;
    let moving = false;
    if (amDead()) { player.st.moving = false; player.target = null; return; }
    if (player.kb) {
      const k = player.kb, p = Math.min(1, (now - k.t0) / 0.35), e = easeOut(p);
      player.x = k.sx + (k.tx - k.sx) * e; player.y = k.sy + (k.ty - k.sy) * e;
      if (p >= 1) player.kb = null;
      moving = true;
    } else if (player.dashMove) {
      const d = player.dashMove, p = Math.min(1, (now - d.t0) / DASH_TIME), e = easeOut(p);
      player.x = d.sx + (d.tx - d.sx) * e; player.y = d.sy + (d.ty - d.sy) * e;
      if (scene === 'town') resolveCollisions(player); else clampArena(player);
      FX.dashTrail(player, player.cls && player.cls.accent);
      if (p >= 1) player.dashMove = null;
      moving = true;
    } else if (player.target && myDebuff('rooted')) {
      if (now > player.faceLock) turnToward(player, Math.atan2(player.target.y - player.y, player.target.x - player.x), 0.016);
    } else if (player.target) {
      const dx = player.target.x - player.x, dy = player.target.y - player.y, d = Math.hypot(dx, dy);
      const stopAt = player.interact ? player.interact.reach * 0.8 : 3;
      if (d <= stopAt) player.target = null;
      else {
        const reeled = inArena() && player.reel && now >= player.reel.pullAt;
        const slow = (actP(player.st, 'brace') >= 0 ? 0.4 : 1) * (myDebuff('slowed') ? FIGHT.SLOWED : 1) * (reeled ? 0.4 : 1) * windLaneBoost(player.x, player.y, dx, dy, FX.now) * (actor.moveMult ? actor.moveMult() : 1);   // a Driftblade's Slipstream lane, a Lone Wolf's ride
        const step = Math.min(d, MOVE_SPEED * slow * (scene === 'town' ? TOWN_PACE : 1) * (pvpCarrying() ? CTF.SLOW : 1) * dt);   // (town is walked a little quicker)
        const ox = player.x, oy = player.y;
        player.x += dx / d * step; player.y += dy / d * step;
        if (scene === 'town') {
          resolveCollisions(player);
          moving = Math.hypot(player.x - ox, player.y - oy) > step * 0.2;
          if (!moving) {
            // head-on into an obstacle: sidestep along it, and give up only if truly stuck
            const side = ((player.stuckT || 0) % 1.2) < 0.6 ? 1 : -1;
            player.x += -dy / d * step * side; player.y += dx / d * step * side;
            resolveCollisions(player);
            player.stuckT = (player.stuckT || 0) + dt;
            if (player.stuckT > 1.2) { player.target = null; player.interact = null; player.stuckT = 0; }
          } else player.stuckT = 0;
        } else {
          clampArena(player);
          moving = Math.hypot(player.x - ox, player.y - oy) > step * 0.2;
          if (!moving) player.target = null;
        }
        if (now > player.faceLock) turnToward(player, Math.atan2(dy, dx), dt);
      }
    }
    // a Silk Reel drags you toward her (you can only struggle slowly against it; a dash snaps it)
    const rl = inArena() ? player.reel : null;
    if (rl && now > rl.end) player.reel = null;
    else if (rl && now >= rl.pullAt && !player.dashMove && !player.kb) {
      const b = raid.boss, dx = b.x - player.x, dy = b.y - player.y, d = Math.hypot(dx, dy);
      if (d > 80) {
        const step = Math.min(d - 80, rl.sp * dt);
        player.x += dx / d * step; player.y += dy / d * step;
        clampArena(player);
        moving = true;
      }
    }
    player.st.moving = moving;
    faceCastTarget(dt);
    turnFacing(player, dt);
    if (scene !== 'town') return;
    if (player.interact && Math.hypot(player.x - player.interact.x, player.y - player.interact.y) <= player.interact.reach) {
      const it = player.interact;
      player.interact = null; player.target = null;
      it.open();
    }
    // stepping into the portal opens the raid board (once per visit)
    const inPortal = Math.hypot(player.x - TOWN.portal.x, player.y - TOWN.portal.y) < TOWN.portal.r - 10;
    if (inPortal && !wasInPortal) openBossPanel(lastOpenBoss());
    wasInPortal = inPortal;
  }

  // send our position ~12 times a second when it changes
  function sendPos() {
    if (!Net.online || now - lastSent < 1 / 12) return;
    const s = scene === 'arena' ? 1 : 0;
    const key = `${rnd(player.x)},${rnd(player.y)},${player.angle.toFixed(2)},${player.st.moving ? 1 : 0},${rnd(player.lift)},${s}`;
    if (key !== lastSentKey) {
      Net.send({ t: 'pos', x: rnd(player.x), y: rnd(player.y), a: +player.angle.toFixed(2), m: player.st.moving ? 1 : 0, l: rnd(player.lift), s, c: +rnow.toFixed(3) });
      lastSentKey = key;
    }
    lastSent = now;
  }

  // other players and bots: drawn slightly in the past, blended between their updates (see interp.js)
  function easeEnt(r, dt) {
    r.st.t = now;
    if (!r.track) r.track = new Track(r.x, r.y, r.angle);
    const p = r.track.at(rnow), ox = r.x, oy = r.y;
    r.x = p.x; r.y = p.y;
    // legs follow the motion you actually see (the "moving" flag itself arrives before the delayed motion)
    if (Math.hypot(r.x - ox, r.y - oy) > 18 * dt) r.walkUntil = now + 0.12;
    r.st.moving = now < (r.walkUntil || 0);
    if (!turnFacing(r, dt)) turnToward(r, p.a, dt, 16);
    if (r.dashUntil > now) FX.dashTrail(r, r.cls && r.cls.accent);
    r.lift += ((r.tl || 0) - r.lift) * Math.min(1, dt * 14);
  }
  function updateRemotes(dt) {
    for (const r of remotes.values()) easeEnt(r, dt);
    if (raid) for (const b of raid.bots.values()) easeEnt(b, dt);
  }

  function updateTown(dt) {
    // tavern heroes idle, glance at nearby players, and show off now and then
    for (const h of lineup) {
      h.st.t = now;
      const d = Math.hypot(player.x - h.x, player.y - h.y);
      turnToward(h, d < 240 ? Math.atan2(player.y - h.y, player.x - h.x) : Math.PI / 2, dt, 4);
      if (now > h.nextAct) {
        const abs = KITS[h.cls.id].abilities, ab = abs[Math.floor(Math.random() * abs.length)];
        h.st.action = { type: ab.anim, t0: now, dur: ANIM_DUR[ab.anim] };
        h.nextAct = now + 4 + Math.random() * 6;
      }
    }
    keeper.st.t = now;
    turnToward(keeper, Math.hypot(player.x - keeper.x, player.y - keeper.y) < 260 ? Math.atan2(player.y - keeper.y, player.x - keeper.x) : Math.PI / 2, dt, 4);
    trainer.st.t = now;
    turnToward(trainer, Math.hypot(player.x - trainer.x, player.y - trainer.y) < 260 ? Math.atan2(player.y - trainer.y, player.x - trainer.x) : Math.PI / 2, dt, 3);
    for (const b of statues) {
      b.st.t = now;
      if (now > b.nextAct && bossOpen(b.boss)) {
        b.st.action = { type: 'attack', t0: now, dur: BOSS_ATTACK_DUR };
        b.nextAct = now + 6 + Math.random() * 3;
        FX.later(BOSS_ATTACK_DUR * 0.5, () => bossImpact(b));
      }
    }
    townKenStep(dt);   // (a Kenseier's Posture on the sparring dummy)
    for (const d of dummies) {
      d.st.t = now;
      if (!d.spar) continue;
      const near = Math.hypot(player.x - d.x, player.y - d.y) < 140 && actor;
      if (!near) { d.nextSwing = 0; continue; }
      const K = townKen();
      if (K && kenBrk(K)) { d.windup = 0; continue; }   // (Broken: staggered, no swings)
      if (!d.nextSwing) d.nextSwing = now + 1.5;
      if (now >= d.nextSwing - 0.6 && !d.windup) d.windup = d.nextSwing;
      if (now >= d.nextSwing) {
        d.st.hit = now; d.windup = 0; d.nextSwing = now + (K && K.sim.boss.duelUntil > now ? KENSEI.DUEL_EVERY : FIGHT.AUTO_EVERY); d.swings = (d.swings || 0) + 1; d.heavy = d.swings % 4 === 0;
        d.hitAt = now; d.hitKind = d.heavy ? 'buster' : 'auto';   // (the Kenseier's ring lingers a moment after the blow)
        sparHit(d);
      }
    }
    town.buffs = town.buffs.filter(b => b.end > now);
    if (town.shield && town.shield.end <= now) endTownShield();
    if (typeof CLASS_TOWN !== 'undefined') CLASS_TOWN.tick(town, now, actor, player);
    town.taken = town.taken.filter(x => x.t > now - 10);
    updateMeter();
  }

  function updateMeter() {
    const m = town.meter;
    if (m && now - m.last <= 6) {
      const dur = Math.max(1, now - m.start);
      RaidUI.meter(`<b>${rnd(m.dmg / dur).toLocaleString('en-US')}</b> DPS<span>${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}</span>`);
      return;
    }
    if (m) {
      const dur = Math.max(1, m.last - m.start + 2.5);
      const up = Math.min(100, (actor.kit.stats.gcdTime - m.gcd0) / dur * 100);
      town.meterDone = { text: `Last session: <b>${rnd(m.dmg / dur).toLocaleString('en-US')}</b> DPS over ${Math.round(dur)}s<span>GCD uptime ${up.toFixed(0)}%</span>`, until: now + 12 };
      town.meter = null;
    }
    if (town.meterDone && now < town.meterDone.until) RaidUI.meter(town.meterDone.text);
    else RaidUI.meter(null);
  }

  function updateArena(dt) {
    const b = raid.boss, bd = raid.bossDraw;
    // the boss glides between the host's updates (interp.js) and turns at a steady pace
    const bp = raid.bossTrack.at(rnow);
    bd.x = bp.x; bd.y = bp.y;
    let df = bp.a - bd.f; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
    bd.f += df * Math.min(1, dt * 9);
    bd.fade += ((b.u ? 0.55 : 1) - bd.fade) * Math.min(1, dt * 5);   // fades out and back in when untargetable
    bd.st.t = raid.bossPause && now < raid.bossPause.end ? raid.bossPause.at : now; bd.st.raid = true;   // (a Time Stop holds its pose)
    bd.st.moving = Math.hypot(bd.x - bd.lastX, bd.y - bd.lastY) > 20 * dt;
    bd.lastX = bd.x; bd.lastY = bd.y;
    // wind-up before each auto-attack (it only lands on the tank, in melee range)
    const tank = b.tg != null ? entById(b.tg) : null;
    if (raid.state === 'live' && tank && !b.u && Math.hypot(tank.x - b.x, tank.y - b.y) < FIGHT.MELEE * 1.5) {
      const left = raid.nextAutoAt - now;
      if (left > 0 && left < 0.5 && !(bd.st.action && bd.st.action.t0 > now - 1)) bd.st.action = { type: 'attack', t0: raid.nextAutoAt - 0.45, dur: 1.0 };
    }
    for (const key of Object.keys(raid.propsUntil)) if (now > raid.propsUntil[key]) { delete raid.props[key]; delete raid.propsUntil[key]; }
    bd.st.props = raid.props;
    if (raid.def.id === 'hydra') { raid.props.dive = !!b.u; raid.props.heart = !!raid.wallLabel; }   // (the Mother sinks while she is out of reach; the Heart shows in her chest while she is sealed)
    if (raid.def.id === 'wyrm') { raid.props.air = !!b.u && !raid.props.perch; if (raid.wallLabel) raid.props.heart = true; }   // (Vhalgrath: lifted while he is out of reach; the Ember Heart shows in his chest while he is sealed)
    // telegraphs that follow players or track the tank
    for (const [id, tg] of raid.tgs) {
      const end = tg.start + tg.dur;
      // a resolved telegraph stays put and fades out (ArenaView / BossTells read tg.gone)
      if (tg.gone != null) { if (now > tg.gone + TG_FADE) raid.tgs.delete(id); continue; }
      if (tg.follow != null && now < end - (tg.lockAt || 0)) { const e = entById(tg.follow); if (e) { tg.live.x = e.x; tg.live.y = e.y; } }
      if (tg.link && now < end - tg.link.lock) { const la = entById(tg.link.a), lb = entById(tg.link.b); if (la && lb) AZ.linkShape(tg.link.k, la, lb, tg.live); }
      if (tg.aim != null && now < end - (tg.lockAt || 0.6)) {
        const e = entById(tg.aim);
        tg.live.x = bd.x; tg.live.y = bd.y;
        if (e) tg.live.angle = Math.atan2(e.y - bd.y, e.x - bd.x);
      }
      if (now > end + 1.5) raid.tgs.delete(id);
    }
    for (const [id, p] of raid.puddles) if (now > p.end) raid.puddles.delete(id);
    for (const a of raid.adds.values()) {
      const ox = a.x, oy = a.y, ap = a.track.at(rnow);
      a.x = ap.x; a.y = ap.y;
      let da = ap.a - a.f; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      a.f += da * Math.min(1, dt * 10);
      a.st.t = now; a.st.moving = Math.hypot(a.x - ox, a.y - oy) > 10 * dt;
    }
    raid.ghosts = raid.ghosts.filter(gh => now < gh.t0 + gh.dur);
    for (const gh of raid.ghosts) gh.a.st.t = now;
    for (const [id, th] of raid.tethers) if (now > th.end + 1) raid.tethers.delete(id);
    for (const [id, z] of raid.zones) if (now > z.end) raid.zones.delete(id);   // drawZones fades them out first
    raid.lunges = raid.lunges.filter(l => now < l.start + l.delay + l.n * l.step + 0.3);
    raid.husks = raid.husks.filter(h => now < h.end);
    for (const [id, p] of raid.posts) if (now > p.end + 0.5) raid.posts.delete(id);
    for (const [id, sw] of raid.sweeps) if (now > sw.end + 0.4) raid.sweeps.delete(id);
    if (raid.edgeWarn && now > raid.edgeWarn.end + 1.5) raid.edgeWarn = null;
    // the Hollow King: knights glow when they remember a swing and lift their blades to replay it; the night falls slowly
    for (const [id, k] of raid.knights) {
      k.st.t = now;
      k.st.props.ready = !!(k.ready && now < k.ready);
      k.st.props.mem = k.mem ? Math.max(0, 1 - (now - k.mem) / 1.6) : 0;
      if (k.gone && now > k.gone + 0.8) raid.knights.delete(id);
    }
    raid.nightK += ((raid.night ? 1 : 0) - raid.nightK) * Math.min(1, dt * 1.2);
    ArenaView.night = raid.nightK;
    for (const [id, d] of raid.doom) if (now > d.end + 0.5) raid.doom.delete(id);
    for (const h of raid.husks) { h.st.t = now; h.st.props.rear = raid.lunges.some(l => l.who === 'husk'); }
    if (raid.eggs && now > raid.eggs.end + 0.3) raid.eggs = null;
    raid.pbuffs = raid.pbuffs.filter(x => x.end > now);
    if (raid.abuffs.length) raid.abuffs = raid.abuffs.filter(x => x.end > now);
    raid.taken = raid.taken.filter(x => x.t > now - 10);
    if (raid.cast && now > raid.cast.start + raid.cast.dur + 0.3) raid.cast = null;
    if (raid.pvp) PvpUI.frame(raid.pvp, raid.party, now, pvpName);
    if (!raid.pvp && raid.result && raid.resultAt && now >= raid.resultAt) {
      raid.resultAt = 0;
      RaidUI.showResults(raid.result, raid, Net.id, actor ? { stats: actor.kit.stats, cls: player.cls } : null, Net.isHost, {
        retry: () => raid.def.trial ? startTrial(raid.def.trial) : startRaid(lastRaidOpts.mode, lastRaidOpts.fill, lastRaidOpts.boss, lastRaidOpts.practice || 0),
        town: () => { Loot.hostClose(); Net.broadcastAll({ t: 'raidend' }); },
        leave: () => leaveRaid(true),
      });
      Loot.reveal();   // the chest's cards come up with the results
    }
    RaidUI.update(raid, now, Net.id, frameMarks());
    RaidUI.waymarks(raid.def.trial || raid.pvp ? null : raid.marks, placingMark);
    if (!raid.pvp) Journal.tick(now, raid.state === 'live' && !amDead());
    if ((raid.state === 'clear' || raid.state === 'wipe') && !raid.pagesTaken) { raid.pagesTaken = true; raid.newPages = Journal.newPages(); }
    if (raid.introAt && now >= raid.introAt) {
      raid.introAt = 0;
      if (!raid.def.trial) {
        BOSS_VFX.intro(raid.def.id, raid.bossDraw);   // [boss presentation] his entrance, in time with the title card
        let met = {};
        try { met = JSON.parse(localStorage.getItem('emberfall.met') || '{}') || {}; } catch (e) { /* first time for everything */ }
        RaidUI.intro(raid.def, raid.mode, !met[raid.def.id]);
        met[raid.def.id] = 1;
        try { localStorage.setItem('emberfall.met', JSON.stringify(met)); } catch (e) { /* the line again next time */ }
      }
    }
    if (!raid.prog && !raid.def.trial && !raid.practice && !raid.pvp) raid.prog = progOf(raid.def.id, raid.mode);
    RaidUI.prog(raid.def.trial || raid.practice || raid.pvp ? null : raid.prog);
  }

  let camFocus = null;   // an arrival in town borrows the camera while they walk in (TownLife)
  // the camera push (zoomPunch) is laid over the normal camera each frame and taken off before the next one
  let punchCam = null;
  function updateCamera(dt, snap) {
    if (punchCam) { cam.x = punchCam.x; cam.y = punchCam.y; punchCam = null; }
    baseCamera(dt, snap);
    const p = punchNow();
    if (p > 0.0005 && scene === 'arena') {
      punchCam = { x: cam.x, y: cam.y };
      const z1 = zoom * (1 + p), sx = player.x - cam.x, sy = player.y - (player.lift || 0) - cam.y;
      cam.x = player.x - sx * zoom / z1; cam.y = player.y - (player.lift || 0) - sy * zoom / z1;
      zoom = z1;
    }
  }
  // how far down the screen the boss plate reaches (px), checked twice a second
  let plateAt = -1, plateH = 0;
  function bossPlateH() {
    if (now - plateAt > 0.5 || now < plateAt) { plateAt = now; const r = document.getElementById('boss-bar')?.getBoundingClientRect(); plateH = r && r.height > 0 ? Math.max(0, r.bottom + 6) : 0; }
    return plateH;
  }
  function baseCamera(dt, snap) {
    if (snap) dt = 10;  // jump straight there (scene changes)
    if (camFocus && (scene !== 'town' || now > camFocus.until || (!camFocus.hold && (mouse.rightDown || player.target || player.dashMove)))) camFocus = null;
    if (camFocus) {
      const k = Math.min(1, dt * 2.5);
      if (camFocus.zoom) zoom += (camFocus.zoom - zoom) * Math.min(1, dt * 3);   // (a scene can lean in a little)
      // (cam is the screen's top-left corner: centre the thing being watched, and stay inside the town)
      const tx = clamp(camFocus.f.x - W / zoom / 2, 0, Math.max(0, WORLD.w - W / zoom)), ty = clamp(camFocus.f.y - H / zoom / 2, 0, Math.max(0, WORLD.h - H / zoom));
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      return;
    }
    if (scene === 'arena') {
      // About 82% of the arena's height fits on screen. The camera leans toward you but stops where the rim
      // would leave empty space at the screen edge, so as much of the room as possible stays in view.
      zoom = clamp(Math.min(W, H) / 960, 0.55, 1.1) * camOut();
      const vw = W / zoom, vh = H / zoom;
      // lo / hi: screen margins (px) you're never pushed into, so you never stand under the ability bar or boss plate
      const lean = (p, v, size, lo, hi, edge, edgeTop = edge) => {
        const lim = Math.max(0, edge - v / 2), limTop = Math.max(0, edgeTop - v / 2);
        let c = clamp(p * 0.8, -limTop, lim);
        c = Math.max(c, p + v / 2 - (size - hi) / zoom);
        c = Math.min(c, p + v / 2 - lo / zoom);
        return c;
      };
      // the room's own width and height decide how far the camera can lean each way
      // (far enough past the walls to show the scenery there: the stoves, shelves and pillars)
      // (at the top the camera can go as much again as the boss plate is tall, so the scenery there clears the plate)
      const plate = bossPlateH();
      const tx = lean(player.x, vw, W, 60, 60, ARENA.hw + 100) - vw / 2, ty = lean(player.y, vh, H, 150, 190, ARENA.hh + 110, ARENA.hh + 110 + plate / zoom) - vh / 2;
      const ka = 1 - Math.exp(-6 * dt);   // (frame-rate independent easing)
      cam.x += (tx - cam.x) * ka;
      cam.y += (ty - cam.y) * ka;
      return;
    }
    zoom = Math.abs(zoom - 1) < 0.003 || snap ? 1 : zoom + (1 - zoom) * (1 - Math.exp(-5 * dt));   // (easing back out of a scene's zoom)
    const tx = clamp(player.x - W / zoom / 2, 0, Math.max(0, WORLD.w - W / zoom));
    const ty = clamp(player.y - H / zoom / 2, 0, Math.max(0, WORLD.h - H / zoom));
    const kt = 1 - Math.exp(-8 * dt);
    cam.x += (tx - cam.x) * kt;
    cam.y += (ty - cam.y) * kt;
    if (W / zoom > WORLD.w) cam.x = (WORLD.w - W / zoom) / 2;
    if (H / zoom > WORLD.h) cam.y = (WORLD.h - H / zoom) / 2;
  }

  function bossImpact(b) {
    const style = { grubnak: ['#d8b07a', 70], skitterra: ['#9dff6a', 60], volkar: ['#7fe8ff', 85], hollowking: ['#6dff9a', 75], wyrm: ['#ff8a3a', 85], titan: ['#bfe8ff', 95] }[b.boss.id] || (b.boss.id === 'hydra' ? ['#7fe0a8', 80] : ['#ffffff', 70]);
    const x = b.x + Math.cos(b.angle) * 50, y = b.y + Math.sin(b.angle) * 50;
    FX.add({ type: 'ring', x, y, r: style[1], color: style[0], dur: 0.6 });
    if (scene === 'town' && Math.hypot(player.x - b.x, player.y - b.y) < 350) FX.shake = Math.max(FX.shake, 4);
  }

  // ---------------------------------------------------------------- rendering
  // a sealed boss's statue: a dark cloth over a tall shape, roped at the base, a faint glow underneath
  function drawShroud(c, x, y) {
    c.save();
    const g = c.createRadialGradient(x, y + 4, 4, x, y + 4, 56);
    g.addColorStop(0, 'rgba(150,110,255,0.20)'); g.addColorStop(1, 'rgba(150,110,255,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y + 4, 56, 20, 0, 0, Math.PI * 2); c.fill();
    const sway = Math.sin(now * 0.8) * 1.5;
    c.beginPath();
    c.moveTo(x - 34, y + 6);
    c.quadraticCurveTo(x - 40, y - 40, x - 18 + sway, y - 78);
    c.quadraticCurveTo(x, y - 96, x + 18 + sway, y - 78);
    c.quadraticCurveTo(x + 40, y - 40, x + 34, y + 6);
    c.quadraticCurveTo(x, y + 14, x - 34, y + 6);
    const cl = c.createLinearGradient(x - 34, 0, x + 34, 0);
    cl.addColorStop(0, '#1b1624'); cl.addColorStop(0.45, '#2c2438'); cl.addColorStop(1, '#141019');
    c.fillStyle = cl; c.fill();
    c.strokeStyle = '#0a080d'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1.5;   // folds
    for (const [a, b] of [[-16, -60], [0, -70], [14, -58]]) { c.beginPath(); c.moveTo(x + a * 0.6, y + b); c.quadraticCurveTo(x + a * 1.3, y - 24, x + a * 1.6, y + 4); c.stroke(); }
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 2.5;   // the rope
    c.beginPath(); c.moveTo(x - 31, y - 10); c.quadraticCurveTo(x, y - 2, x + 31, y - 10); c.stroke();
    c.restore();
  }
  // a hero taking a real hit flinches (heroes.js heroPose: a white flash and a 2-3px recoil away from the blow), you,
  // friends and bots alike. Damage-over-time ticks and chip damage don't; a tankbuster rocks them hardest.
  function heroFlinch(msg, ps) {
    const e = msg.a > 0 && raid ? entById(msg.id) : null;
    if (!e || !e.st || !ps || !(ps.maxHp > 1)) return;
    const frac = msg.a / ps.maxHp, buster = msg.k === 'buster';
    if (!buster && (frac < 0.03 || msg.k === 'bleed' || msg.k === 'static' || msg.k === 'tithe')) return;
    const k = buster ? 1.15 : clamp(0.35 + frac * 3, 0.35, 0.9);
    const b = raid.bossDraw, dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
    e.st.hurt = { t0: now, k, ax: d > 1 ? dx / d : -Math.cos(e.angle), ay: d > 1 ? dy / d : -Math.sin(e.angle) };
  }
  // A Kenseier's beat: a thin ring closing on their feet for the next blow aimed at them (a boss auto while it is on them, or a
  // tankbuster that names them), so it meets the feet exactly as the blow lands. Drawn for every viewer, never hidden. The fixed
  // ring at the feet is where it ends; both turn white-gold inside the Perfect window (+-0.12s, KENSEI.PERFECT); an auto's ring is
  // pale, a tankbuster's ember-orange and doubled. It stays a moment after the blow (the Good window runs 0.3s either side).
  function drawKenRing(e) {
    if (!e.cls || e.cls.id !== 'kenseier') return;
    const yard = !inArena(), id = e.id === undefined ? Net.id : e.id;
    if (yard ? id !== Net.id : !raid || raid.state !== 'live') return;   // (the yard: only yours, kenRing)
    const ps = yard ? null : raid.party.get(id);
    if (!yard && ((ps && !ps.alive) || raid.boss.u || (raid.posture && raid.posture.broken > 0))) return;
    const r = kenRing(id), LEAD = 1.2;
    if (!r || r.at > LEAD) return;
    const hs = heroScale(), cx = e.x, cy = e.y - (e.lift || 0) + 2 * hs, R0 = 21 * hs, SQ = 0.8, buster = r.kind === 'buster';
    const perfect = Math.abs(r.at) <= (typeof KENSEI !== 'undefined' ? KENSEI.PERFECT : 0.12), after = r.at < 0;
    const lead = clamp(r.at / LEAD, 0, 1), fade = after ? clamp(1 + r.at / 0.3, 0, 1) : 1;
    const col = perfect ? '#fff3c4' : buster ? '#ff8a3d' : '#e6e0d4', rad = R0 + (after ? -r.at * 40 * hs : lead * 38 * hs * (2 - lead));
    ctx.save(); ctx.lineCap = 'round';
    // every ring is stroked twice, a dark underline then the colour, so it reads on a pale floor as well as a dark one
    const ring = (rr, color, w, alpha) => {
      ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * SQ, 0, 0, TAU);
      ctx.globalAlpha = alpha * 0.55; ctx.strokeStyle = '#14100c'; ctx.lineWidth = w + 2.4; ctx.stroke();
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    };
    // where it ends: a ring at the feet, lit gold in the Perfect window
    ring(R0, perfect ? '#ffd27a' : '#d8d2c4', perfect ? 2.6 : 1.4, (0.5 + (perfect ? 0.5 : 0)) * fade);
    // the ring itself: closing from outside, brightening as it comes; a tankbuster brings a second one right behind
    for (let i = 0; i < (buster ? 2 : 1); i++) ring(rad + (after ? 0 : i * 7 * hs * lead), col, (buster ? 2.6 : 2) * (perfect ? 1.3 : 1), (0.45 + 0.55 * (1 - lead)) * fade * (i ? 0.7 : 1));
    if (perfect) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx, cy, R0 * 1.5, '#ffd27a', 0.28 * fade); }
    ctx.restore();
  }
  function drawEntity(e) {
    switch (e.kind) {
      case 'hero': drawHero(ctx, e.cls, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'keeper': drawKeeper(ctx, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'trainer': drawTrainer(ctx, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'boss': if (bossOpen(e.boss)) drawBoss(ctx, e.boss, e.x, e.y, e.angle, e.st, BOSS_SCALE); else drawShroud(ctx, e.x, e.y); break;
      case 'dummy': drawDummy(ctx, e.x, e.y, e.st, HERO_SCALE); break;
      case 'player': case 'remote': {
        const ps = inArena() ? raid.party.get(e.id === undefined ? Net.id : e.id) : null, dead = !!ps && !ps.alive;
        // going down and getting up (heroes.js drawHeroDown): one grey picture taken as they fall, tipped over in 0.4s;
        // on a revive their live self rises back up. (A new raid starts clean, with no fall or rise to play.)
        const dn = e._dn || (e._dn = { dead: false, t: -9, cv: null, raid: null, angle: 0 });
        if (dn.raid !== raid) { dn.raid = raid; dn.dead = dead; dn.t = -9; dn.cv = null; dn.angle = e.angle; }
        else if (dn.dead !== dead) { dn.dead = dead; dn.t = now; dn.cv = null; dn.angle = e.angle; }
        const dAge = now - dn.t;
        if (dead || dAge < 0.45) {
          const q = Math.min(1, dAge / (dead ? 0.4 : 0.45)), sm = q * q * (3 - 2 * q), k = dead ? sm : 1 - sm, hs = heroScale();
          ctx.save(); ctx.translate(e.x, e.y); ctx.scale(hs, hs);
          if (dead && !dn.cv) dn.cv = heroDownSprite(ctx, e.cls, dn.angle, { spec: e.spec });
          const img = dead ? dn.cv : heroSprite(ctx, e.cls, dn.angle, e.st, { spec: e.spec }, null);
          ctx.restore();
          if (img) { drawHeroDown(ctx, e.cls, e.x, e.y, dn.angle, hs, k, img); break; }
          if (dead) { ctx.save(); ctx.globalAlpha = 0.4; drawHero(ctx, e.cls, e.x, e.y, e.angle, { t: 0, moving: false, action: null }, hs, { lift: e.lift, spec: e.spec }); ctx.restore(); break; }
        }
        const em = Pastimes.emoteLook(e, now);
        drawHero(ctx, e.cls, e.x, e.y, e.angle, e.st, heroScale(), { lift: e.lift, spec: e.spec, emote: em || null });
        drawKenRing(e);
        // what's on them, on the body (heroes.js drawHeroStatus): shields and defensives, chosen-ally buffs, Slowed,
        // Damage Down, Vulnerability, a bleed or venom
        if (ps) {
          const id = e.id === undefined ? Net.id : e.id, buffs = [];
          for (const b of raid.abuffs) if (b.to === id && b.end > now && !buffs.includes(b.id)) buffs.push(b.id);
          drawHeroStatus(ctx, e.x, e.y - (e.lift || 0), heroScale(), e.cls, ps, buffs, now);
        }
        // town footsteps: a faint puff of dust under each foot as it lands
        if (scene === 'town' && e.st.stride != null) {
          const n = Math.floor(e.st.stride / Math.PI + 0.5);
          if (e._step !== n) {
            if (e._step != null && e.st.moving && e.st.walkK > 0.5 && !e.dashMove) {
              const side = n % 2 ? 1 : -1, a = e.angle + Math.PI / 2;
              FX.add({ type: 'step', x: e.x + Math.cos(a) * side * 7 + Math.cos(e.angle) * 3, y: e.y + 7 + Math.sin(a) * side * 4, color: '#dccca4', dur: 0.55 });
            }
            e._step = n;
          }
        }
        break;
      }
    }
  }

  function playerTag(e, isMe, hp) {
    // a downed hero's tag sinks with them (lying on the floor) and goes a muted grey
    const dn = inArena() && e._dn, dk = !dn ? 0 : dn.dead ? Math.min(1, (now - dn.t) / 0.4) : Math.max(0, 1 - (now - dn.t) / 0.45);
    const y = e.y - (e.lift || 0) - (e.cls ? 36 : 26) * heroScale() / HERO_SCALE + 14 * dk;
    const color = e.cls ? ROLES[e.cls.role].color : '#dffaff';
    if (dk > 0.5) { ctx.save(); ctx.globalAlpha = 0.8; label(ctx, e.name + (isMe ? ' (you)' : ''), e.x, y, '#9c98a8', 11); ctx.restore(); }
    else label(ctx, e.name + (isMe ? ' (you)' : ''), e.x, y, isMe ? '#fff3d8' : color, 12);
    if (e.title && !inArena()) label(ctx, e.title, e.x, y - 13, '#d8b46a', 10);
    const wa = e.emote ? Pastimes.emoteWordA(e, now) : 0;   // (the emote's word eases in, rising, and fades out)
    if (wa > 0.01) { ctx.save(); ctx.globalAlpha = wa; label(ctx, Pastimes.EMOTES[e.emote.kind], e.x, y - (e.title && !inArena() ? 26 : 14) + (1 - wa) * 4, '#e6dcc8', 10.5); ctx.restore(); }
    if (hp && (!isMe || selfBarOn())) {
      // over-head bar: health, then any shield in pale white after it
      const w = 44, f = hp.maxHp ? clamp(hp.hp / hp.maxHp, 0, 1) : 0, sf = hp.maxHp ? clamp((hp.shield || 0) / hp.maxHp, 0, 1 - f) : 0;
      const x0 = Math.round(e.x - w / 2), y0 = Math.round(y + 4);
      rrect(ctx, x0 - 1, y0 - 1, w + 2, 7, 2, 'rgba(10,8,6,0.85)');
      // the damage trail: a pale chunk holds where health just was, then drains (as on the party frames, raid-ui.js)
      const tdt = clamp(now - (e._hpTt ?? now), 0, 0.1); e._hpTt = now;
      if (e._hpF != null && f < e._hpF - 0.001) e._hpHit = now;
      e._hpF = f;
      e._hpT = f >= (e._hpT ?? 0) ? f : now - (e._hpHit ?? -9) > 0.45 ? Math.max(f, e._hpT - tdt * 0.7) : e._hpT;
      if (e._hpT > f + 0.002) rrect(ctx, x0 + w * f, y0, w * (e._hpT - f), 5, 1.5, 'rgba(255,226,196,0.7)');
      if (f > 0) rrect(ctx, x0, y0, w * f, 5, 1.5, f < 0.35 ? '#e8503f' : f < 0.7 ? '#c9c45a' : '#5fcf78');
      if (sf > 0) rrect(ctx, x0 + w * f, y0, w * sf, 5, 1.5, 'rgba(236,244,255,0.85)');
    } else if (e.cls && !inArena()) label(ctx, e.cls.name, e.x, y + 12, color, 10);
    drawCastBar(e);
    if (e.chat && now < e.chatUntil) {
      // the same bubble the townsfolk speak in (town-life.js bubble): wrapped at 240px, the wrap kept until the line changes
      ctx.save();
      ctx.font = '13px Georgia, serif';
      let cw = e._chatWrap;
      if (!cw || cw.text !== e.chat) {
        const lines = [];
        let cur = '';
        for (const wd of String(e.chat).split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > 240 && cur) { lines.push(cur); cur = wd; } else cur = t; }
        if (cur) lines.push(cur);
        cw = e._chatWrap = { text: e.chat, until: 0, t0: now, lines, w: Math.min(260, Math.max(...lines.map(l => ctx.measureText(l).width))) + 20 };
      }
      if (cw.until !== e.chatUntil) { cw.until = e.chatUntil; cw.t0 = now; }   // (said again: pops in again)
      const age = now - cw.t0, ka = clamp(Math.min(age / 0.15, (e.chatUntil - now) / 0.3), 0, 1);   // (pops in, fades out)
      const bh = cw.lines.length * 17 + 12, by = y - 20 - (e.title && !inArena() ? 13 : 0) - (wa > 0.01 ? 13 : 0) + (1 - ka) * 3;
      ctx.globalAlpha = ka;
      ctx.fillStyle = 'rgba(16,13,10,0.92)'; ctx.strokeStyle = '#c89a5a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(e.x - cw.w / 2, by - bh, cw.w, bh, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x - 6, by); ctx.lineTo(e.x, by + 7); ctx.lineTo(e.x + 6, by); ctx.fill();
      ctx.fillStyle = '#f2e6c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      cw.lines.forEach((l, i) => ctx.fillText(l, e.x, by - bh + 6 + i * 17, 250));
      ctx.restore();
    }
  }

  // what the party frames should mark: the locked ally, where your next heal lands, your cast in progress, the boss's target
  function frameMarks() {
    const healer = healerish();
    const k = actor && actor.kit, c = k && k.cast;
    const ab = healer ? actor.abilities.find(a => a.target === 'ally') : null;
    return {
      healer,
      locked: healer ? lockedAlly : null,
      heal: healer ? allyTargetId(ab) : null,
      casting: c && c.ab.target === 'ally' && typeof c.target === 'number' ? { id: c.target, frac: Math.min(1, (now - c.start) / Math.max(0.01, c.end - c.start)) } : null,
      aggro: raid.state === 'live' && !raid.boss.u ? raid.boss.tg : null,
      // you carry a cleanse (the Alembist's vials, the Cleric's Purify): frames with something to wash off are marked
      cleanse: !!(k && ((player.cls && player.cls.id === 'alembist') || (k.talent && k.talent('cleric_purify')))),
      kit: k || null, cls: player.cls ? player.cls.id : null,   // your own DoTs on the boss (raid-ui.js boss status)
      // whose Ultimate is full (a pip on the frame): yours from your kit, everyone else's from their 'ult-ready' moment
      ult: new Set([...raid.rosterIds].filter(id => (id === Net.id ? !!(k && k.ultFull()) : !!(entById(id) || {}).ultReady))),
      incoming: incomingHeals(),
    };
  }
  // heals being cast right now, by anyone in the party (bots too), summed per ally they're aimed at: castStart's h/to
  // (a cast that was interrupted or has run its length counts no more)
  function incomingHeals() {
    const out = new Map();
    for (const r of raid.roster) {
      const cb = (entById(r.id) || {}).castBar, s = raid.party.get(r.id);
      if (cb && cb.h > 0 && (!s || s.alive) && cb.to != null && cb.stop == null && now - cb.t0 < cb.dur) out.set(cb.to, (out.get(cb.to) || 0) + cb.h);
    }
    return out;
  }

  // under whoever your heals will land on: corner brackets when locked, a soft ring when it's just the nearest ally.
  // While you cast a heal, a thread of light runs from you to them.
  function drawAllyTarget() {
    if (!healerish()) return;
    const ab = actor.abilities.find(a => a.target === 'ally');
    const c = actor.kit.cast;
    const id = c && c.ab.target === 'ally' && typeof c.target === 'number' ? c.target : allyTargetId(ab);
    const e = entById(id);
    if (!e) return;
    const locked = id === lockedAlly || id === hoverFrame || id === hoverAlly(ab) || (selfCast && id === Net.id);
    const col = '#8dffa0', k = heroScale() / HERO_SCALE;
    ctx.save(); ctx.translate(e.x, e.y + 4);
    if (locked || c) {
      const pulse = (1 + Math.sin(now * 5) * 0.04) * k, rx = 32 * pulse, ry = 24 * pulse;
      ellipse(ctx, 0, 0, rx, ry, 0, rgba(col, 0.16), rgba(col, 0.5), 2);
      ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let q = 0; q < 4; q++) {
        const a = q * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.ellipse(0, 0, rx + 6, ry + 5, 0, a - 0.34, a + 0.34); ctx.stroke();
      }
      // a small chevron over their head, so the lock reads even in a crowd
      const hy = -(e.lift || 0) - (e.cls ? 66 : 54) * k + Math.sin(now * 4) * 2 - 4;
      poly(ctx, [-8, hy - 6, 8, hy - 6, 0, hy + 4], rgba(col, 0.95), 'rgba(10,20,12,0.9)', 1.5);
    } else {
      ctx.setLineDash([6, 6]); ctx.rotate(now * 0.8);
      ellipse(ctx, 0, 0, 28 * k, 21 * k, 0, null, rgba(col, 0.6), 2);
      ctx.setLineDash([]);
    }
    ctx.restore();
    if (c && e !== player) {
      const p = Math.min(1, (now - c.start) / Math.max(0.01, c.end - c.start));
      const sx = player.x, sy = player.y - 26, tx = e.x, ty = e.y - 26, mx = (sx + tx) / 2, my = Math.min(sy, ty) - 40;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ffe9a0', 0.12 + p * 0.3); ctx.lineWidth = 2 + p * 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      // a mote travels along the thread as the cast fills
      const u = p, qx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * tx, qy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ty;
      circle(ctx, qx, qy, 4 + p * 2, rgba('#fff6d0', 0.9));
      ctx.restore();
    }
  }

  // Screen shake: a smooth, damped wobble (sines on the game clock, so it reads the same at 60 or 144 Hz) instead of a
  // fresh random jump every frame. FX.shake is its strength (FX.addShake sets it; FX.update lets it die away).
  function shakeOffset() {
    const sh = FX.shake;
    if (!(sh > 0.3)) return [0, 0];
    const t = now, a = sh * 0.5;
    return [a * (Math.sin(t * 47.3 + 1.1) * 0.62 + Math.sin(t * 83.9 + 2.7) * 0.38), a * (Math.sin(t * 53.1 + 0.4) * 0.62 + Math.sin(t * 71.7 + 4.2) * 0.38)];
  }
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (scene === 'arena' && raid) renderArena(); else renderTown();
  }

  let lineupLabelAt = null;   // (the last frame the deck heroes' names were eased)
  function renderTown() {
    ctx.fillStyle = '#2d4a22'; ctx.fillRect(0, 0, W, H);
    const [sx, sy] = shakeOffset();
    // (snapped to device pixels, not whole CSS pixels: on a 2x screen a half-pixel step is visible as jitter)
    const cx = Math.round((cam.x + sx) * DPR) / DPR, cy = Math.round((cam.y + sy) * DPR) / DPR;
    if (zoom !== 1) ctx.scale(zoom, zoom);   // (only while a town scene leans in: the feast)
    ctx.translate(-cx, -cy);

    const vx = clamp(cx, 0, WORLD.w), vy = clamp(cy, 0, WORLD.h);
    const vw = Math.min(W / zoom, WORLD.w - vx), vh = Math.min(H / zoom, WORLD.h - vy);
    if (vw > 0 && vh > 0) ctx.drawImage(townLayer, vx * layerScale, vy * layerScale, vw * layerScale, vh * layerScale, vx, vy, vw, vh);
    drawTownDynamic(ctx, now);

    FX.draw(ctx, true);
    VFX.draw(ctx, 'ground');
    // the sparring dummy winds up before it swings
    for (const d of dummies) if (d.spar && d.windup) {
      const p = clamp(1 - (d.windup - now) / 0.6, 0, 1), heavy = ((d.swings || 0) + 1) % 4 === 0;   // every fourth swing is a heavy one
      circle(ctx, d.x, d.y + 4, 20 + p * 30, null, rgba(heavy ? '#ff3a2a' : '#ff6a4a', 0.3 + p * 0.6), (2 + p * 2) * (heavy ? 1.8 : 1));
    }
    const lt = lockedTarget();
    const en = !lt && actor ? enemyPos() : null;
    if (lt) drawReticle(lt);
    else if (en) ellipse(ctx, en.x, en.y + 6, 26, 19, 0, null, rgba('#ff6a5a', 0.45), 2);
    drawAllyTarget();

    const hov = started && !panelOpen() ? hoverTarget() : null;
    if (hov) ellipse(ctx, hov.x, hov.y + 4, hov.r + 4, (hov.r + 4) * 0.75, 0, null, rgba('#ffd65a', 0.6 + Math.sin(now * 6) * 0.3), 2.5);
    canvas.classList.toggle('hovering', !!hov);

    const townRemotes = [...remotes.values()].filter(r => r.scene === 0);
    const scEnv = { entById, me: Net.id, town: true };   // your Doll(s) follow you round town too (classes-c)
    Stagecraft.drawFloor(ctx, now, scEnv);
    Kennel.drawFloor(ctx, now, scEnv);
    Lamps.drawFloor(ctx, now, scEnv);   // your lanterns light the training yard too
    Pastimes.drawGround(ctx, now);
    BarrowGate.drawGround(ctx, now);
    TownLife.drawGround(ctx, now, TOWN.pedestals, BOSSES.map(b => b.id));
    TOWN.pedestals.forEach((pd, i) => { if (BOSSES[i]) drawPlaque(ctx, pd, bossOpen(BOSSES[i]) ? BOSSES[i].name : 'Sealed'); });
    for (const h of lineup) drawDeckPad(ctx, h.home ? h.home.x : h.x, h.home ? h.home.y : h.y, lineup.filter(o => o.cls.role === h.cls.role).length > 3);
    const ents = [...lineup, keeper, trainer, ...statues, ...dummies, player, ...townRemotes, ...Stagecraft.entities(now, scEnv), ...Kennel.entities(now, scEnv), ...TownLife.entities(HERO_SCALE), ...BarrowGate.entities(now)].filter(e => !TownLife.hides(e));
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) { if (e.kind === 'stagecraft') e.draw(ctx); else drawEntity(e); }
    Stagecraft.drawOver(ctx, now, scEnv);
    Lamps.drawOver(ctx, now, scEnv);

    drawScreenFx('dim');
    VFX.draw(ctx, 'air');
    drawSmoke(ctx, now);

    // the deck heroes' names fade in (rising a little) as you come near, and out as you leave
    const ldt = clamp(now - (lineupLabelAt ?? now), 0, 0.1); lineupLabelAt = now;
    for (const h of lineup) {
      const want = Math.hypot(player.x - h.x, player.y - h.y) < 260 || hov?.label === h.cls.name ? 1 : 0;
      h.labelK = (h.labelK || 0) + (want - (h.labelK || 0)) * Math.min(1, ldt * 9);
      if (h.labelK < 0.02) continue;
      ctx.save(); ctx.globalAlpha = h.labelK;
      label(ctx, h.cls.name, h.x, h.y - (h.labelUp ? 47 : 34) + (1 - h.labelK) * 4, ROLES[h.cls.role].color, 11);
      ctx.restore();
    }
    const bob = Math.sin(now * 4) * 3;
    label(ctx, '!', keeper.x, keeper.y - 40 + bob, '#ffd65a', 26, 'Cinzel, Georgia, serif', 800);
    label(ctx, 'Barkeep', keeper.x, keeper.y - 28 + 6, '#f0d48a', 11);
    label(ctx, 'Trainer', trainer.x, trainer.y - 34, '#f0d48a', 11);
    // the Trainer calls you over while your hero has an open talent row with nothing picked in it (row I is free)
    if (player.cls) { const tt = Save.talents(player.cls.id); if (tt.picks.some((p, r) => r < tt.rows && p == null)) label(ctx, '!', trainer.x, trainer.y - 52 + bob, '#ffd65a', 26, 'Cinzel, Georgia, serif', 800); }
    for (const d of dummies) if (d.spar && Math.hypot(player.x - d.x, player.y - d.y) < 260) label(ctx, 'Sparring Dummy', d.x, d.y - 46, '#ffb0a0', 11);
    Pastimes.drawOver(ctx, now);
    BarrowGate.drawOver(ctx, now);
    TownLife.drawLabels(ctx, label, f => Math.hypot(player.x - f.x, player.y - f.y) < 220);
    for (const r of townRemotes) if (!TownLife.hides(r)) playerTag(r, false);
    if (!TownLife.hides(player)) playerTag(player, true);
    FX.draw(ctx, false);   // (the numbers over the tags and the air effects, as in the arena)
    if (hov && !hov.label.match(/Barkeep|Trainer/) &&!lineup.some(h => h.cls.name === hov.label)) {
      label(ctx, hov.label, mouseWorld().x, mouseWorld().y - 18, '#ffe9a8', 13);
    }
    drawScreenFx('flash');
  }

  // [boss presentation] the boss's own layer (the Long Night's dark, a Time Stop's frost, a trial's memory, his flinch,
  // the enrage rim, untargetable as a ghost) is BOSS_VFX.drawBody now: tints laid on with source-atop and an outline
  // from his silhouette, instead of a CSS filter with a drop-shadow on a canvas up to ~1320 px a side every frame.

  function renderArena() {
    ctx.fillStyle = { volkar: '#080b11', hollowking: '#0a0c0e', wyrm: '#0b0706', titan: '#070d14' }[raid.def.id] || (raid.def.id === 'hydra' ? '#04100c' : raid.def.id === 'archmage' ? '#04141a' : '#120d0a'); ctx.fillRect(0, 0, W, H);
    const [sx, sy] = shakeOffset(), px = DPR * zoom;
    ctx.scale(zoom, zoom);
    // (snapped to device pixels, like the town's camera, so a resting or shaking view never shimmers half a pixel)
    ctx.translate(Math.round((-cam.x + sx) * px) / px, Math.round((-cam.y + sy) * px) / px);
    if (raid.pvp) { if (raid.pvp.ctf) PvpView.drawField(ctx, now); else PvpView.drawRing(ctx, now); }
    else {
      ArenaView.drawFloor(ctx, raid.def.id, Math.min(1.5, DPR * zoom));
      ArenaView.drawAmbient(ctx, now);
      ArenaView.drawEdge(ctx, now, raid.edgeWarn);
    }
    ArenaView.drawRoomUnder(ctx, raid.room, now, { W, H, DPR, zoom, cam, units: raidUnits(), entById, boss: raid.bossDraw });
    if (raid.def.id === 'hollowking') {
      // the Long Night: dark but for a little light around each hero and a wide pool round each lantern
      if (raid.nightK > 0.01) {
        const lights = raidUnits().map(u => ({ x: u.x, y: u.y, r: 120 }));
        for (const l of raid.lanterns) { const c = l.carrier != null ? entById(l.carrier) : null; lights.push({ x: c ? c.x : l.x, y: c ? c.y : l.y, r: l.last ? 300 : 190 }); }
        for (const pr of raid.room.props) if (pr.kind === 'brazier' && pr.state === 1) lights.push({ x: pr.x, y: pr.y, r: 200 });
        ArenaView.drawNight(ctx, lights, raid.nightK, { W, H, DPR, zoom, cam });
      }
      ArenaView.drawMoon(ctx, raid.def.enrage ? raid.fightTime / raid.def.enrage[raid.mode] : 0, now);
    }
    drawWaymarks(ctx);
    ArenaView.drawZones(ctx, raid.zones, now);
    ArenaView.drawPuddles(ctx, raid.puddles, now);
    if (raid.eggs) ArenaView.eggs(ctx, raid.eggs.pts, clamp((now - raid.eggs.start) / Math.max(0.1, raid.eggs.end - raid.eggs.start), 0, 1), now);
    const bd = raid.bossDraw;
    const units = raidUnits();
    // things that shelter from Gale Slam: posts, and rods waiting for their bolt
    const covers = [...raid.posts.values()].filter(p => now < p.end).map(p => ({ x: p.x, y: p.y }));
    for (const tg of raid.tgs.values()) if (tg.tag === 'rod' && tg.gone == null) covers.push({ x: tg.live.x, y: tg.live.y });
    const tellEnv = { tgs: raid.tgs, boss: bd, bossId: raid.def.id, entById, hard: raid.mode === 'hard', pol: raid.pol, units, covers, props: raid.room.props, room: raid.room };
    // the floor effects (scorch, frost, lingering pools, dash afterimages) go under the telegraphs' fills, so a lingering
    // effect never sits over a mechanic; the telegraph rims are drawn over both again below (BossTells.rims)
    FX.draw(ctx, true);
    VFX.draw(ctx, 'ground');
    Lamps.drawFloor(ctx, now, { entById, me: Net.id, party: units });   // lantern glows: faint, and under every telegraph (lanterns.js)
    Kennel.drawFloor(ctx, now, { entById, me: Net.id, boss: bd });   // a Houndmaster's position arcs round the boss: faint, under every telegraph (kennel.js)
    ArenaView.drawTelegraphs(ctx, raid.tgs, now, tellEnv);
    BossTells.drawRollers(ctx, raid.rollers, now, tellEnv);
    BossTells.drawSweeps(ctx, raid.sweeps, now, tellEnv);
    // the tells' props (cleaver, cloches, jars, whisk) go under every unit too, so nobody is hidden behind a mechanic
    BossTells.air(ctx, raid.tgs, now, tellEnv);
    const ringA = clamp((bd.fade - 0.55) / 0.45, 0, 1) * BOSS_VFX.presence(bd);   // the hitbox ring fades with the boss when it goes untargetable ([boss presentation] or falls, or hasn't come in yet)
    if (ringA > 0.02 && !raid.pvp) { ctx.save(); ctx.globalAlpha = ringA; ArenaView.drawBossRing(ctx, { x: bd.x, y: bd.y, f: bd.f }); ctx.restore(); }
    // your current add target gets a red ring
    const lt = lockedTarget();
    const tAdd = !lt && lastEnemy && raid.adds.get(lastEnemy.id);
    if (lt) drawReticle(lt);
    else if (tAdd) ellipse(ctx, tAdd.x, tAdd.y + 4, 34, 26, 0, null, rgba('#ff6a5a', 0.5 + Math.sin(now * 6) * 0.2), 2);
    for (const a of raid.adds.values()) { const o = a.link && raid.adds.get(a.link); if (o && a.id < o.id && raid.mode === 'hard') ArenaView.addBeam(ctx, a, o, now); }
    drawFocusMark();
    drawChest();
    BossTells.rims(ctx, raid.tgs, now, tellEnv);   // telegraph rims stay readable over the floor effects
    drawAllyTarget();
    if (raid.pvp) PvpView.drawSides(ctx, units, raid.pvp.teams, raid.pvp.myTeam, now);
    if (raid.pol.size) ArenaView.polarityAuras(ctx, units, raid.pol, now);
    const scEnv = { entById, me: Net.id, boss: bd, units };   // threads, the Stage and the Dolls (classes-c, stagecraft.js)
    Stagecraft.drawFloor(ctx, now, scEnv);

    const arenaRemotes = [...remotes.values()].filter(r => r.scene === 1 && raid.rosterIds.has(r.id));
    const ents = [player, ...arenaRemotes, ...raid.bots.values()];
    const bossEnt = { kind: 'raidboss', y: bd.y };
    // adds fade in when they hatch; ones that died or left fade out where they were
    const adds = [...raid.adds.values()].map(a => ({ kind: 'add', y: a.y, a, alpha: Math.min(1, (now - (a.born ?? -9)) / 0.3) }));
    for (const gh of raid.ghosts) adds.push({ kind: 'add', y: gh.a.y, a: gh.a, alpha: Math.max(0, 1 - (now - gh.t0) / gh.dur) });
    const husks = raid.husks.map(h => ({ kind: 'husk', y: h.y, h }));
    const posts = [...raid.posts.values()].map(p => ({ kind: 'post', y: p.y, p }));
    const knights = [...raid.knights.values()].map(k => ({ kind: 'knight', y: k.y, k }));
    const lants = raid.lanterns.filter(l => l.carrier == null).map(l => ({ kind: 'lantern', y: l.y, l }));
    const roomProps = raid.room.props.map(pr => ({ kind: 'prop', y: pr.y + (pr.shape === 'rect' ? 0 : pr.r * 0.4), pr }));
    const all = [...ents, ...(raid.pvp ? [] : [bossEnt]), ...adds, ...husks, ...posts, ...knights, ...lants, ...roomProps, ...Stagecraft.entities(now, scEnv), ...Kennel.entities(now, scEnv)].sort((a, b) => a.y - b.y);
    const bossDef = BOSSES.find(x => x.id === raid.def.id);
    for (const e of all) {
      if (e === bossEnt) {
        // [boss presentation] BOSS_VFX.drawBody: in the Long Night he's a shape in the dark; in a trial only a memory (pale,
        // cold, not quite there); in a Time Stop frosted; untargetable a ghost with an outline; his flinches, enrage,
        // entrance and fall. (Plain frames still draw him straight onto the scene.)
        const ghost = clamp((1 - bd.fade) / 0.45, 0, 1);
        BOSS_VFX.drawBody(ctx, bossDef, bd, { scale: RAID_BOSS_SCALE, ghost, dark: raid.nightK > 0.05 ? 0.55 * raid.nightK : 0,
          alpha: raid.def.trial ? 0.72 + 0.06 * Math.sin(now * 2.3) : Math.max(bd.fade, 0.8),
          tint: raid.def.trial ? 'memory' : raid.bossPause && now < raid.bossPause.end ? 'frost' : null, pending: !!raid.introAt && !raid.def.trial });
        if (raid.wallLabel) ArenaView.wallShield(ctx, bd.x, bd.y, now, RAID_BOSS_SCALE);
      } else if (e.kind === 'knight') {
        const k = e.k, a = Math.min(1, (now - k.born) / 0.6) * (k.gone ? Math.max(0, 1 - (now - k.gone) / 0.8) : 1);
        drawEchoKnight(ctx, k.x, k.y, k.f, k.st, a * (1 - 0.3 * raid.nightK));
      } else if (e.kind === 'lantern') {
        ArenaView.lantern(ctx, e.l.x, e.l.y, now, false, e.l.last);
      } else if (e.kind === 'prop') {
        ArenaView.drawProp(ctx, e.pr, now, raid.room);
      } else if (e.kind === 'add') {
        ctx.save(); ctx.globalAlpha = e.alpha;
        drawAdd(ctx, e.a.kind, e.a.x, e.a.y, e.a.f, e.a.st, e.a.enr, 1.5);
        ctx.restore();
      }
      else if (e.kind === 'husk') { ctx.save(); ctx.globalAlpha = 0.8; drawBoss(ctx, bossDef, e.h.x, e.h.y, e.h.f, e.h.st, RAID_BOSS_SCALE); ctx.restore(); }
      else if (e.kind === 'post') BossTells.rodPost(ctx, e.p.x, e.p.y, now, Math.min(1, (now - e.p.start) / 0.3, Math.max(0, (e.p.end - now) / 0.5)));
      else if (e.kind === 'stagecraft') e.draw(ctx);
      else drawEntity(e);
    }
    // the Hollow King: lanterns held up by whoever carries them, and the Doom sigil over each doomed head
    for (const l of raid.lanterns) { const c = l.carrier != null ? entById(l.carrier) : null; if (c) ArenaView.lantern(ctx, c.x + 14, c.y - (c.lift || 0), now, true, l.last); }
    if (raid.pvp && raid.pvp.ctf) PvpView.drawFlags(ctx, raid.pvp.ctf, now, entById);   // capture the flag: on the stands, on the ground, over a carrier
    // Stuffed (Grubnak, Hard): a gold, bloated glow round whoever can't take another plate
    for (const [id, st] of raid.party) if (st.alive && st.debuffs && st.debuffs.some(d => d[0] === 'stuffed')) { const e = entById(id); if (e) ArenaView.stuffedMark(ctx, e.x, e.y - (e.lift || 0), now); }
    // Skitterra's silk: whoever is rooted is wound in a cocoon, which shreds when it lets go
    if (raid.def.id === 'skitterra') for (const [id, st] of raid.party) {
      const on = st.alive && st.debuffs && st.debuffs.some(d => d[0] === 'rooted'), e = entById(id);
      if (on && !st.wrapAt) st.wrapAt = now;
      if (!on && st.wrapAt) { st.wrapAt = 0; if (e && st.alive) BOSS_VFX.silkFree(e); }
      if (on && e) ArenaView.cocoon(ctx, e.x, e.y - (e.lift || 0), now - st.wrapAt, now);
    }
    for (const [id, d] of raid.doom) {
      const e = entById(id); if (!e) continue;
      ArenaView.doomMark(ctx, e.x, e.y - (e.lift || 0) - 92 * heroScale() / HERO_SCALE, (d.end - now) / Math.max(0.1, d.end - d.start), now);
    }
    for (const lg of raid.lunges) ArenaView.lungeLegs(ctx, lg.x, lg.y, lg, now);
    ArenaView.drawRoomOver(ctx, raid.room, now, tellEnv);
    BossTells.drawReels(ctx, raid.reels, now, tellEnv);
    for (const th of raid.tethers.values()) {
      const a = entById(th.a), b = entById(th.b);
      if (a && b && now <= th.end) ArenaView.tether(ctx, a, b, th, now, raid.mode === 'hard');
    }
    Stagecraft.drawOver(ctx, now, scEnv);
    Lamps.drawOver(ctx, now, { entById, me: Net.id, party: units });
    drawScreenFx('dim');
    VFX.draw(ctx, 'air');
    // add health bars
    for (const a of raid.adds.values()) {
      const w = 46, f = a.mx ? a.hp / a.mx : 0, y = a.y - 40;
      rrect(ctx, a.x - w / 2, y, w, 6, 2, 'rgba(0,0,0,0.65)');
      if (f > 0) rrect(ctx, a.x - w / 2, y, w * f, 6, 2, a.enr ? '#ff4a2a' : '#c070ff');
    }
    // tankbuster icon over its target
    for (const tg of raid.tgs.values()) if (tg.type === 'buster' && tg.target != null && tg.gone == null) { const e = entById(tg.target); if (e) ArenaView.busterIcon(ctx, e.x, e.y, now); }
    for (const e of [...arenaRemotes, ...raid.bots.values()]) playerTag(e, false, raid.party.get(e.id));
    playerTag(player, true, selfBarOn() ? raid.party.get(Net.id) : null);
    // the floating numbers (and the old-style ability shapes) over everything in the world: the air effects' additive
    // glow doesn't wash them out and no name tag or health bar covers them
    FX.draw(ctx, false);
    Pings.draw(ctx, now);
    hurtVignette();
    drawScreenFx('flash');
  }
  // ---- an Ultimate's screen moments (your own only: FX.camFor in fx.js). All cosmetic: `now` never slows.
  //  screenFlash(color, alpha, dur): a bright wash over everything, fading fast
  //  screenDim(alpha, dur): the world darkens under the effects for a beat (drawn before the air layer, so they pop)
  //  zoomPunch(amount, dur): the camera pushes in toward you (zoom x (1 + amount)) and eases back
  //  hitStop(dur): the effects' clock (VFX) nearly stops for dur s (at most 0.2) at the moment of impact
  function screenFlash(color = '#ffffff', alpha = 0.35, dur = 0.3) { screenFx.flash = { color, alpha, dur, t0: now }; }
  function screenDim(alpha = 0.35, dur = 0.8) { screenFx.dim = { color: '#05030a', alpha: Math.min(0.26, alpha * 0.6), dur: Math.min(0.8, dur * 0.55), t0: now }; }   // (a beat of contrast, not a blackout)
  function zoomPunch(amount = 0.06, dur = 0.5) { punch = { a: Math.min(0.15, amount), dur, t0: now }; }
  function punchNow() {
    if (!punch) return 0;
    const q = (now - punch.t0) / punch.dur;
    if (q >= 1) { punch = null; return 0; }
    return punch.a * (q < 0.18 ? easeOut(q / 0.18) : 1 - easeOut((q - 0.18) / 0.82));
  }
  function hitStop(dur = 0.1) { hitStopUntil = Math.max(hitStopUntil, now + Math.min(0.2, dur)); }
  FX.cam = { flash: screenFlash, dim: screenDim, punch: zoomPunch, stop: hitStop };
  FX.me = player;
  // the party as this client sees it, living heroes only (KIT_VFX.partyWard flashes a party shield on each)
  FX.party = () => (inArena() ? allyList().filter(c => { const s = raid.party.get(c.id); return !s || s.alive; }) : allyList()).map(c => c.ent);
  function drawScreenFx(kind) {
    const f = screenFx[kind];
    if (!f) return;
    const age = now - f.t0, q = age / f.dur;
    if (q >= 1) { screenFx[kind] = null; return; }
    const a = f.alpha * (kind === 'dim' ? Math.min(1, age / 0.1) * Math.min(1, (1 - q) / 0.45) : (1 - q) * (1 - q));
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = kind === 'flash' ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // your Ultimate is full: a soft ring and a rising shimmer round you, once (the T slot glows: hud.js)
  function ultReadyCue() {
    const c = (player.cls && player.cls.accent) || '#ffd65a';
    VFX.shock(player.x, player.y, { r: 70, color: c, dur: 0.6, w: 3 });
    if (SH) SH.play('ult-ready', { vol: 0.75, key: 'ult-ready', minGap: 2 });
    VFX.motes(player.x, player.y, { color: '#fff2c8', n: 8, r: 26, rise: 0.8, life: 1.1 });
  }
  // a red flush round the screen's edge for a moment when you're hit (stronger for a bigger hit)
  let hurtGrad = null, hurtFor = '';
  function hurtVignette() {
    const age = now - (raid.hurtAt ?? -9);
    if (age > 0.4) return;
    const a = raid.hurtK * (1 - age / 0.4) * 0.55;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (hurtFor !== W + 'x' + H) {
      hurtFor = W + 'x' + H;
      hurtGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      hurtGrad.addColorStop(0, 'rgba(200,20,10,0)'); hurtGrad.addColorStop(1, 'rgba(200,20,10,1)');
    }
    ctx.globalAlpha = a; ctx.fillStyle = hurtGrad; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- minimap (town)
  const mini = $('minimap');
  const MW = 200, MH = Math.round(200 * WORLD.h / WORLD.w);
  function setupCanvas(cv, w, h) {
    cv.width = w * DPR; cv.height = h * DPR; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv._w = w; cv._h = h;
  }
  function prep(cv) {
    const c = cv.getContext('2d');
    c.setTransform(cv.width / cv._w, 0, 0, cv.height / cv._h, 0, 0);
    c.clearRect(0, 0, cv._w, cv._h);
    return c;
  }
  function drawMinimap() {
    if (scene !== 'town') return;
    const c = prep(mini), s = MW / WORLD.w;
    c.drawImage(minimapBase, 0, 0, MW, MH);
    const dot = (x, y, r, col) => circle(c, x * s, y * s, r, col, OUT, 1);
    for (const b of statues) dot(b.x, b.y, 3.5, bossOpen(b.boss) ? '#ff6a5a' : '#6a5a80');
    dot(TOWN.portal.x, TOWN.portal.y, 4.5, '#b080ff');
    for (const b of TOWN.houses) if (b.hall) dot(b.x + b.w / 2, b.y + b.h / 2, 4, '#7fd0a0');
    if (TOWN.arena) dot(TOWN.arena.x + TOWN.arena.w / 2, TOWN.arena.y + TOWN.arena.h / 2, 4, '#e8a05a');
    if (BarrowGate.isOpen()) dot(TOWN.barrow.x, TOWN.barrow.y, 4, '#8fe3dc');   // (the Barrow Gate, once it has risen)
    dot(keeper.x, keeper.y, 3.5, '#ffd65a');
    dot(trainer.x, trainer.y, 3, '#f0d48a');
    for (const r of remotes.values()) if (r.scene === 0) dot(r.x, r.y, 3.5, r.cls ? ROLES[r.cls.role].color : '#dffaff');
    dot(player.x, player.y, 4.5, '#ffffff');
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
    c.strokeRect(cam.x * s, cam.y * s, W * s, H * s);
  }
  mini.addEventListener('mousedown', e => {
    const r = mini.getBoundingClientRect();
    moveTo({ x: (e.clientX - r.left) / MW * WORLD.w, y: (e.clientY - r.top) / MH * WORLD.h }, true);
    player.interact = null;
  });

  // ---------------------------------------------------------------- HUD bits
  const PBUFF_NAMES = { dmg: 'Party damage up', crit: 'Party crit up', haste: 'Party haste' };
  Hud.extra = () => {
    const out = [];
    const list = inArena() ? raid.pbuffs : town.buffs;
    const seen = new Set();
    for (const b of list) if (b.end > now && !seen.has(b.kind)) { seen.add(b.kind); out.push({ id: 'p-' + b.kind, name: PBUFF_NAMES[b.kind] || b.kind, left: b.end - now, stacks: 1 }); }
    // a healer's buff on you (engine.js ALLY_BUFFS), wearing the icon of the move that gave it
    for (const b of (inArena() ? raid.abuffs : town.abuffs)) {
      const d = ALLY_BUFFS[b.id];
      if (d && b.to === Net.id && b.end > now) out.push({ id: 'a-' + b.id, name: d.name, left: b.end - now, stacks: 1, img: abilityIcon(d.cls, d.icon), tip: d.text });
    }
    const s = myState();
    if (inArena() && s) {
      if (s.dd) out.push({ id: 'dd', name: 'Damage Down', left: s.dd, stacks: 1, bad: true, tip: 'Dealing 10% less damage.' });
      if (s.vuln) out.push({ id: 'vuln', name: 'Vulnerability', label: `+${s.vuln}%`, stacks: 1, bad: true, tip: `Taking ${s.vuln}% more damage.` });
    }
    // gear party bonuses last the whole fight (no timer)
    if (inArena() && raid.bond) for (const b of raid.bond.active) {
      out.push({ id: 'bond' + b.tier, name: b.name, label: `${b.n}/4`, stacks: 1, bond: true, tip: `${b.name}: ${b.n} in your group wear ${PARTY_BONUS[b.tier].boss} gear. Everyone gets ${b.text}.` });
    }
    return out;
  };

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    if (SH && /\b(not enough|can't|cannot|only the host|not connected|get closer|short)\b/i.test(msg)) SH.play('ui-error', { bus: 'ui', key: 'ui-error', minGap: 0.5 });
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function setObjective(html) { $('objective').innerHTML = html; }
  // the hint in the corner follows the road: the yard and the portal at first, then the next boss still standing
  function townObjective() {
    if (!player.cls) return;
    const next = BOSSES.find(b => !(unlockAll || Save.bossBeaten(b.id)));
    if (!BOSSES.some(b => Save.bossBeaten(b.id))) setObjective('Try your skills on the <b>Training Yard</b> dummies (east). The red one swings back. When you\'re ready, step into the <b>Raid Portal</b> (north).');
    else if (next) setObjective(`Next on the King's Road: <b>${next.name}</b>. Step into the <b>Raid Portal</b> (north) when your party is ready.`);
    else setObjective('The road is quiet, for now. Try a boss on <b>Hard</b>, or look around town: not everything in Emberfall is out in the open.');
  }
  function updateHeroName() {
    $('hero-name').innerHTML = player.cls
      ? `<span style="color:${ROLES[player.cls.role].color}">${player.cls.name}</span> · ${player.cls.title}${player.title ? `<em class="hn-title">${escapeHtml(player.title)}</em>` : ''}`
      : 'Wisp · no hero chosen';
  }
  function updatePartyList() {
    const all = [{ name: player.name, cls: player.cls, me: true }, ...[...remotes.values()]];
    const room = Net.room ? `<div class="room">Room <b>${Net.room}</b>${Net.isHost ? ' · you host' : ''}<button class="copy-room">Copy invite</button></div>` : '';
    const head = Net.solo ? 'Solo' : Net.online ? `In town (${all.length})` : 'Offline';
    $('party').innerHTML = room + `<div class="party-head">${head}</div>` + all.map(p =>
      `<div class="pm"><i style="background:${p.cls ? ROLES[p.cls.role].color : '#dffaff'}"></i>${escapeHtml(p.name)}${p.me ? ' <em>(you)</em>' : ''}${p.scene === 1 ? ' <em>· raiding</em>' : ''}<small>${p.cls ? p.cls.name : 'Wisp'}</small></div>`).join('');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  // chat
  function sendChat(text) {
    text = text.trim().slice(0, 120);
    if (!text) return;
    const em = text.match(/^\/(\w+)$/);
    if (em && Pastimes.EMOTES[em[1].toLowerCase()]) {
      const k = em[1].toLowerCase();
      Pastimes.emote(player, k, now); Pastimes.event('emote', { k });
      emoteLine(player.name, k);
      Net.send({ t: 'chat', text: '*' + k });
      return;
    }
    showChat(player, text);
    Net.send({ t: 'chat', text });
  }
  function showChat(e, text) {
    e.chat = text; e.chatUntil = now + 5;
    const log = $('chat-log');
    const row = document.createElement('div');
    row.innerHTML = `<b style="color:${e.cls ? ROLES[e.cls.role].color : '#dffaff'}">${escapeHtml(e.name)}:</b> ${escapeHtml(text)}`;
    log.appendChild(row);
    while (log.children.length > 7) log.firstChild.remove();
    setTimeout(() => row.classList.add('old'), 12000);
  }

  // ---------------------------------------------------------------- panels
  const overlay = $('overlay'), bossPanel = $('boss-panel');
  const sel = $('select'), selGrid = $('sel-grid'), selDetail = $('sel-detail');
  let preview = null;
  const selOpen = () => !sel.classList.contains('hidden');
  const panelOpen = () => !overlay.classList.contains('hidden') || selOpen() || Inventory.isOpen() || TalentPanel.isOpen();
  function closePanels() {
    Tutorial.close();
    overlay.classList.add('hidden'); bossPanel.classList.add('hidden');
    closeBarrow();
    sel.classList.add('hidden');
    Inventory.close();
    TalentPanel.close();
    preview = null; selPortrait = null;
    Tip.hide();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closePanels(); });
  document.querySelectorAll('.close').forEach(b => b.addEventListener('click', closePanels));

  // ---------------------------------------------------------------- hero select: the altar grid, then a detail page
  const DASH_AB = { name: 'Dash', type: 'ogcd', desc: 'A quick dash toward where you\'re heading (or the cursor). Two charges, 12s each. Every hero has it.', anim: 'cast' };
  const diamonds = n => `${'◆'.repeat(n)}${'◇'.repeat(3 - n)}`;
  const selThumbs = [], TILE = 200;
  let selPortrait = null, selFromGrid = false;
  // Optional painted portraits (client/portraits/<classId>.png, front-facing). Missing ones fall back to the sprite.
  const PORTRAITS = {};
  // (classes flagged art.portraits === false in data.js have none yet: skip them rather than ask for files that 404)
  const hasPortraits = c => !(c.art && c.art.portraits === false);
  for (const c of CLASSES.filter(hasPortraits)) { const img = new Image(); img.onload = () => { PORTRAITS[c.id] = img; }; img.src = `portraits/${c.id}.png`; }
  // spec portraits are big, so a hero's are fetched the first time its page opens, not at startup
  const SPEC_PORTRAITS = {}, specPortraitsAsked = new Set();
  function loadSpecPortraits(cid) {
    if (specPortraitsAsked.has(cid) || !hasPortraits(CLASSES.find(c => c.id === cid) || {})) return;
    specPortraitsAsked.add(cid);
    for (const sp of SPECS[cid] || []) { const key = `${cid}-${sp.id}`, img = new Image(); img.onload = () => { SPEC_PORTRAITS[key] = img; }; img.src = `portraits/${key}.png`; }
  }
  // Portraits are square head-and-shoulders busts. Fill a square box with one, breathing a little; zoom > 1 moves in
  // on the face (kept anchored at the top so the head stays in frame).
  function drawBust(c, img, x, y, size, zoom = 1) {
    const z = zoom * (1 + Math.sin(now * 1.6) * 0.006), sw = img.width / z, sh = img.height / z;
    c.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.15, sw, sh, x, y, size, size);
  }
  (function buildAltar() {
    // one band per role (rows, so the roster can grow), compact tiles flowing inside each band
    const altar = $('altar');
    const COMPLEXITY = { 2: 'More than most', 3: 'Many', 4: 'The most' };
    const DIFFICULTY = ['', 'Gentle', 'Moderate', 'Demanding'];
    for (const role of Object.keys(ROLES)) {
      const list = CLASSES.filter(c => c.role === role);
      if (!list.length) continue;
      const band = document.createElement('section');
      band.className = 'altar-col altar-band'; band.style.setProperty('--c', ROLES[role].color);
      band.innerHTML = `<h3>${role === 'dps' ? 'Damage' : ROLES[role].name + 's'}<i>${list.length}</i></h3><div class="band-grid"></div>`;
      const grid = band.querySelector('.band-grid');
      for (const cls of list) {
        const b = document.createElement('button');
        b.className = 'hero-card'; b.dataset.id = cls.id; b.style.setProperty('--a', cls.accent);
        // just the portrait: the name, difficulty and play style are in the tooltip
        const cv = document.createElement('canvas'); setupCanvas(cv, TILE, TILE);
        b.setAttribute('aria-label', `${cls.name}, ${cls.title}`);
        b.appendChild(cv);
        b.insertAdjacentHTML('beforeend', '<em class="hc-taken"></em>');
        const style = cls.gameplan.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
        Tip.set(b, () => `<b>${cls.name}</b><em>${ROLES[cls.role].name} · ${cls.title}</em>“${cls.tagline}”
          <div class="hc-tip"><span><u>Difficulty</u> ${diamonds(cls.difficulty)} ${DIFFICULTY[cls.difficulty] || ''}</span>${cls.complexity >= 2 ? `<span><u>Moving parts</u> ${'◆'.repeat(cls.complexity)}${'◇'.repeat(4 - cls.complexity)} ${COMPLEXITY[cls.complexity]}</span>` : ''}</div>${style}`);
        b.addEventListener('click', () => { selFromGrid = true; showDetail(cls); });
        grid.appendChild(b);
        selThumbs.push({ cv, cls, b, st: newSt(Math.random() * 3) });
      }
      altar.appendChild(band);
    }
  })();
  // an ability's icon as a CSS background (an Ultimate layers its own painting over the icon it borrows)
  const abBg = (cls, a) => (a.ult ? ultIconBg(cls.id) : `url(${abilityIcon(cls.id, abilityIconId(a))})`);
  // the shared in-game tooltip for an ability (a tank's taunt carrier says so: kits.js tauntNote)
  function abilityTip(cls, a) {
    const icon = a.id ? `<i class="ab-icon ${a.type}${a.ult ? ' ult' : ''}" style="background-image:${abBg(cls, a)}"></i>` : '<i class="ab-icon dash">»</i>';
    return `<div class="tip-ab">${icon}<div><b>${a.name}</b><em>${a.ult ? ultMeta(a) : abilityMeta(a)}</em></div></div>${a.desc}${a.id ? tauntNote(cls.id, a) : ''}`;
  }
  // --- specializations on the hero page: the base class and its two specs as tabs. A spec shows what it
  // specializes in, its passive, and every move it adds or changes (with the move it replaced).
  let selSpec = null, tipsTab = 'first', selShown = null;
  // move text shows exact numbers (numbers.js) for the hero a page is about: the one on the hero page, else yours
  Num.setContext(() => (!sel.classList.contains('hidden') && !selDetail.classList.contains('hidden') && selShown
    ? { cls: selShown.id, spec: selSpec } : { cls: player.cls && player.cls.id, spec: player.spec }));
  function renderSpecBox(cls, kit, rerender) {
    const box = $('sel-spec'), specs = SPECS[cls.id] || [];
    box.classList.toggle('hidden', !specs.length || !specsRevealed());
    if (!specs.length || !specsRevealed()) return;
    const spec = specOf(cls.id, selSpec), sk = kitFor(cls.id, selSpec);
    // a spec is sealed until this hero clears the Hollow King, then opens through its trial
    const stateOf = s => (s.id ? Save.specState(cls.id, s.id) : 'open');
    const STATE_TIP = { locked: `Sealed. Clear the Hollow King as the ${cls.name} to open its trial.`, trial: 'Its trial is open.' };
    const tabs = [{ id: null, name: cls.name, title: 'Base class' }, ...specs].map(s => `<button class="spec-tab ${stateOf(s)}${(s.id || null) === (selSpec || null) ? ' on' : ''}" data-spec="${s.id || ''}" style="--sa:${s.accent || cls.accent}"${STATE_TIP[stateOf(s)] ? ` data-tip="${STATE_TIP[stateOf(s)]}"` : ''}>
      <b>${s.name}</b><small>${s.title}</small></button>`).join('');
    let body;
    if (!spec) body = `<p class="spec-focus">The class as it was made: every specialization starts from here and changes a few things. Pick one to see what it changes.</p>`;
    else {
      const changes = sk.abilities.map((a, i) => ({ a, was: kit.abilities[i], i })).filter(c => c.a !== c.was);
      body = `<p class="spec-focus"><u>Specializes in</u> ${spec.focus}</p>
        <div class="spec-passive"><h5>${spec.passive.name}</h5><p>${spec.passive.desc}</p></div>
        <div class="spec-moves">${changes.map(c => `<div class="spec-move" data-i="${c.i}">
          <i class="ab-icon ${c.a.type}" style="background-image:url(${abilityIcon(cls.id, abilityIconId(c.a))})"></i>
          <div><b><kbd>${KEYS[c.i]}</kbd>${c.a.name}${c.a.id !== c.was.id ? `<em>New, replaces ${c.was.name}</em>` : '<em>Changed</em>'}</b><p>${c.a.desc}</p></div></div>`).join('')}</div>`;
      body += trialCard(cls, spec, Save.specState(cls.id, spec.id));
    }
    box.innerHTML = Num.fill(`<h4>Specialization</h4><div class="spec-tabs">${tabs}</div>${body}`);
    box.querySelectorAll('.spec-tab').forEach(b => b.addEventListener('click', () => { selSpec = b.dataset.spec || null; rerender(); }));
    const tb = box.querySelector('.trial-go');
    if (tb) tb.addEventListener('click', () => { if (!tb.getAttribute('aria-disabled')) beginTrial(cls, tb.dataset.spec); });
    box.querySelectorAll('.spec-move').forEach(m => { const i = Number(m.dataset.i); Tip.set(m, () => abilityTip(cls, sk.abilities[i])); });
  }
  // under a sealed or trial-ready spec: the trial's name and memory, and the way in once it's open
  function trialCard(cls, spec, state) {
    const T = TRIALS[spec.id];
    if (state === 'open' || !T) return '';
    if (state === 'locked') return `<div class="spec-trial locked"><h5>${T.name}</h5><p>Sealed until one of your heroes has cleared the Hollow King.</p></div>`;
    return `<div class="spec-trial"><h5>${T.name}</h5><p>${T.lore[0]}</p>
      ${trialGo(spec.id)}${BarrowGate.isOpen() ? '<small class="spec-gatehint">Trials are also taken at the Barrow Gate.</small>' : ''}</div>`;
  }
  // the way into a trial (the hero panel's card and the Barrow Gate share it): only the host, from town, plays one
  function trialGo(specId, label = 'Begin the trial', tip = '') {
    const host = Net.isHost && scene === 'town';
    return `<button class="cta trial-go" type="button" data-spec="${specId}"${host ? (tip ? ` data-tip="${tip}"` : '') : ' aria-disabled="true" data-tip="Trials are solo. Begin one from town while you are hosting or playing alone."'}>${label}</button>`;
  }
  function beginTrial(cls, specId) {
    if (scene !== 'town' || !cls) return;
    if (player.cls !== cls) chooseHero(cls);
    closePanels();
    startTrial(specId);
  }
  function renderChoose(cls) {
    const btn = $('sel-choose'), spec = specOf(cls.id, selSpec);
    const same = player.cls === cls, sameSpec = same && (player.spec || null) === (selSpec || null);
    const sealed = spec && Save.specState(cls.id, spec.id) !== 'open';
    btn.disabled = sameSpec || sealed;
    btn.textContent = sealed ? `${spec.name} is sealed` : sameSpec ? 'Your current hero' : same ? `Play as ${spec ? spec.name : `a ${cls.name}`}` : `Choose ${cls.name}${spec ? ` · ${spec.name}` : ''}`;
    btn.onclick = () => (same ? applySpec(selSpec) : chooseHero(cls, selSpec));
  }
  // switch the current hero's specialization (in town)
  function applySpec(specId) {
    if (!player.cls || scene !== 'town') return;
    player.spec = specOf(player.cls.id, specId) && Save.specState(player.cls.id, specId) === 'open' ? specId : null;
    Save.setSpec(player.cls.id, player.spec);
    closePanels();
    const spec = specOf(player.cls.id, player.spec);
    heroPickFx(player, spec ? { accent: spec.accent } : player.cls);
    makeActor();
    toast(spec ? `You are now the ${spec.name}, ${spec.title}.` : `You are the ${player.cls.name} again.`);
    Net.send({ t: 'cls', id: player.cls.id, spec: player.spec });
  }
  const slotIndex = k => (k === 'space' ? 6 : SLOT_OF[k]);
  function keyChip(cls, k) {
    const kt = kitFor(cls.id, selSpec), i = slotIndex(k), a = i === 6 ? DASH_AB : i === 7 ? kt.ultimate : kt.abilities[i];
    if (!a) return '';
    return `<span class="kchip ${a.type}${a.ult ? ' ult' : ''}" data-i="${i}">${a.id ? `<i style="background-image:${abBg(cls, a)}"></i>` : '<i class="dash">»</i>'}<kbd>${KEYS[i]}</kbd></span>`;
  }
  function openSelect(cls) {
    if (scene !== 'town') return;
    overlay.classList.add('hidden');
    sel.classList.remove('hidden');
    player.target = null;
    if (cls) { selFromGrid = false; showDetail(cls); } else showGrid();
  }
  function showGrid() {
    selDetail.classList.add('hidden'); selGrid.classList.remove('hidden');
    selPortrait = null;
    sel.querySelector('.sel-close').classList.toggle('hidden', !player.cls);
    for (const th of selThumbs) {
      const takenBy = [...remotes.values()].filter(r => r.cls === th.cls).map(r => escapeHtml(r.name));
      th.b.classList.toggle('mine', player.cls === th.cls);
      th.b.querySelector('.hc-taken').textContent = player.cls === th.cls ? 'You' : takenBy.join(', ');
    }
    Tip.hide();
  }
  function showDetail(cls) {
    selShown = cls;
    selGrid.classList.add('hidden'); selDetail.classList.remove('hidden');
    loadSpecPortraits(cls.id);
    const kit = KITS[cls.id], guide = HERO_GUIDE[cls.id];
    const abs = [...kit.abilities, DASH_AB];
    const takenBy = [...remotes.values()].filter(r => r.cls === cls).map(r => escapeHtml(r.name));
    selDetail.style.setProperty('--a', cls.accent);
    selDetail.style.setProperty('--c', ROLES[cls.role].color);
    $('sel-flavor').innerHTML = `
      <h2>${cls.name}</h2>
      <div class="sub"><span class="role-tag" style="--c:${ROLES[cls.role].color}">${ROLES[cls.role].name}</span>${cls.title}
        <span class="diff" data-tip="Difficulty ${cls.difficulty} of 3">${diamonds(cls.difficulty)}</span></div>
      <p class="tagline">“${cls.tagline}”</p>
      <p>${cls.gameplan}</p>
      ${takenBy.length ? `<p class="taken">Also picked by ${takenBy.join(', ')}</p>` : ''}`;
    const keys = $('sel-keys');
    selSpec = player.cls === cls ? (player.spec || null) : Save.spec(cls.id);
    const renderKit = () => {
      const sk0 = kitFor(cls.id, selSpec), kitAbs = [...sk0.abilities, DASH_AB, ...(sk0.ultimate ? [sk0.ultimate] : [])];
      abs.splice(0, abs.length, ...kitAbs);
      // the seven keys (eight with an Ultimate on T), with what this specialization changed marked
      keys.innerHTML = abs.map((a, i) => `<button class="key-cell ${a.type}${a.ult ? ' ult' : ''}${i < 6 && a !== kit.abilities[i] ? ' changed' : ''}" data-i="${i}">
        <i class="ab-icon ${a.type}${a.id ? '' : ' dash'}" ${a.id ? `style="background-image:${abBg(cls, a)}"` : ''}>${a.id ? '' : '»'}</i>
        <kbd>${KEYS[i]}</kbd><span>${a.name}</span></button>`).join('');
      keys.querySelectorAll('.key-cell').forEach(b => {
        const i = Number(b.dataset.i);
        Tip.set(b, () => abilityTip(cls, abs[i]));
        b.addEventListener('mouseenter', () => { playPreview(i); preview.nextDemo = now + 2.5; });
      });
      if (preview) preview.lis = [...keys.querySelectorAll('.key-cell')];
      renderSpecBox(cls, kit, renderKit);
      renderChoose(cls);
      // tips are written for the base class; under a spec the key chips show its moves and it adds its own line first
      const spec = specOf(cls.id, selSpec);
      $('sel-passive').innerHTML = `<i class="ab-icon passive" style="background-image:url(${abilityIcon(cls.id, guide.passive.icon)})"></i>
        <div><h4>Passive · ${guide.passive.name}</h4><p>${Num.fill((spec && spec.classPassive) || guide.passive.desc)}</p></div>`;
      // one page of tips at a time (tabs), so the hero page fits on one screen
      const tabs = [
        ...(spec ? [{ k: 'spec', name: spec.name, html: `<p>${spec.blurb}</p>` }] : []),
        { k: 'first', name: 'First steps', html: `<p>${kit.floor}</p>` },
        { k: 'mastery', name: 'Mastery', html: `<h5>${kit.signature}</h5><ul class="ceiling">${kit.ceiling.map(c => `<li>${c}</li>`).join('')}</ul>` },
        { k: 'combos', name: 'Combos', html: guide.combos.map(c => `<div class="combo"><div class="chain">${c.keys.map(k => keyChip(cls, k)).join('<b class="arrow">›</b>')}</div><p>${c.text}</p></div>`).join('') },
      ];
      if (!tabs.some(t => t.k === tipsTab)) tipsTab = 'first';
      $('sel-tips').innerHTML = `<div class="tips-head"><h4>Tips &amp; Combos</h4><nav>${tabs.map(t => `<button type="button" data-k="${t.k}" class="${t.k === tipsTab ? 'on' : ''}">${t.name}</button>`).join('')}</nav></div>
        <div class="tips-page">${Num.fill(tabs.find(t => t.k === tipsTab).html)}</div>`;
      $('sel-tips').querySelectorAll('.tips-head button').forEach(b => b.addEventListener('click', () => { tipsTab = b.dataset.k; renderKit(); }));
      $('sel-tips').querySelectorAll('.kchip').forEach(ch => { const i = Number(ch.dataset.i); Tip.set(ch, () => abilityTip(cls, abs[i])); });
    };
    renderKit();
    const cv = $('sel-portrait');
    if (!cv._w) setupCanvas(cv, 220, 220);
    preview = { kind: 'hero', cls, st: newSt(), nextDemo: now + 0.6, demo: 0, lis: [...keys.querySelectorAll('.key-cell')], abs };
    selPortrait = { cv, cls };
    Tip.hide();
  }
  sel.querySelector('.sel-close').addEventListener('click', closePanels);
  sel.querySelector('.sel-back').addEventListener('click', () => { if (selFromGrid || !player.cls) showGrid(); else closePanels(); });
  $('hero-name').addEventListener('click', () => { if (scene === 'town') openSelect(null); });
  $('hero-name').dataset.tip = 'Change hero';
  function selBack() {
    if (!selDetail.classList.contains('hidden') && (selFromGrid || !player.cls)) showGrid();
    else if (player.cls) closePanels();
  }
  function renderSelect() {
    if (!selOpen()) return;
    if (!selGrid.classList.contains('hidden')) {
      for (const th of selThumbs) {
        const hov = th.b.matches(':hover');
        th.st.t = now; th.st.moving = hov;
        const c = prep(th.cv);
        if (PORTRAITS[th.cls.id]) drawBust(c, PORTRAITS[th.cls.id], 0, 0, TILE, hov ? 1.06 : 1);
        else {
          c.save(); c.scale(TILE / 112, TILE / 112);
          if (hov) { VFX.glowAt(c, 56, 70, 50, th.cls.accent, 0.5); VFX.neonRing(c, 56, 92, 34 + Math.sin(now * 4) * 2, th.cls.accent, 2, 0.8, 0.4); }
          drawHero(c, th.cls, 56, 62, hov ? 0.6 + Math.sin(now * 2) * 0.5 : 0.6, th.st, 1.6, { ring: false });
          c.restore();
        }
      }
    }
    if (!selPortrait || !preview) return;
    const st = preview.st, cls = selPortrait.cls;
    st.t = now;
    if (now > preview.nextDemo) { playPreview(preview.demo++ % 6); preview.nextDemo = now + 1.7; }
    st.moving = actP(st) < 0 && Math.sin(now * 1.3) > 0.4;
    const c = prep(selPortrait.cv);
    // a spec shows its own painted portrait (portraits/<class>-<spec>.png) or, until there is one, the sprite in its look
    const spec = specOf(cls.id, selSpec), img = spec ? SPEC_PORTRAITS[`${cls.id}-${spec.id}`] : PORTRAITS[cls.id];
    if (img) {
      drawBust(c, img, 0, 0, 220);
      // a slow wash of the hero's colour rising from the bottom of the frame
      VFX.glowAt(c, 110, 236, 120, spec ? spec.accent : cls.accent, 0.16 + Math.sin(now * 1.4) * 0.04);
      return;
    }
    // no painted portrait: the sprite on a slowly turning sigil, in their colour
    c.save(); c.scale(220 / 260, 220 / 260);
    c.save(); c.translate(130, 200); c.scale(1, 0.42); c.rotate(now * 0.4);
    VFX.neonPath(c, cls.accent, 2, 0.55, () => { for (let i = 0; i <= 8; i++) { const a = i * Math.PI * 2 / 8 * 3; c.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); } });
    c.restore();
    VFX.neonRing(c, 130, 200, 100, cls.accent, 2.5, 0.8, 0.42);
    VFX.neonRing(c, 130, 200, 84, cls.accent, 1.2, 0.5, 0.42);
    VFX.glowAt(c, 130, 150, 120, cls.accent, 0.28 + Math.sin(now * 2) * 0.06);
    for (let i = 0; i < 6; i++) { const q = (now * 0.35 + i / 6) % 1, a = i * 2.1; VFX.glowAt(c, 130 + Math.cos(a) * 70, 200 - q * 170, 6, cls.accent, 0.8 * Math.sin(q * Math.PI)); }
    drawHero(c, cls, 130, 160, 0.45 + Math.sin(now * 0.6) * 0.35, st, 3.1, { ring: false, spec: selSpec });
    c.restore();
  }

  function abilityMeta(ab) {
    const bits = [ab.meta || (ab.type === 'gcd' ? 'GCD' : 'oGCD')];
    if (typeof ab.cast === 'number' && ab.cast) bits.push(`${ab.cast}s cast`);
    else if (typeof ab.cast === 'function') bits.push('cast');
    if (ab.charges) bits.push(`${ab.charges} charges · ${ab.cd}s`);
    else if (typeof ab.cd === 'number' && ab.cd) bits.push(`${ab.cd}s cooldown`);
    if (ab.range === 'melee') bits.push('melee');
    return bits.join(' · ');
  }

  function playPreview(i) {
    if (!preview || preview.kind !== 'hero') return;
    const ab = preview.abs[i];
    const type = !ab.anim || ab.anim === 'dash' ? 'cast' : ab.anim;
    preview.st.action = { type, t0: now, dur: ANIM_DUR[type] };
    preview.lis.forEach((li, k) => li.classList.toggle('playing', k === i));
  }
  const openHeroPanel = cls => openSelect(cls);
  // stepping into a new hero: a sigil, a light column, sparkles (everyone in town sees it)
  function heroPickFx(e, cls) {
    VFX.sigil(e.x, e.y, { r: 64, style: 'star5', color: cls.accent, dur: 1.4, follow: e });
    VFX.pillar(e.x, e.y, { r: 30, h: 220, color: cls.accent, dur: 1.1, follow: e });
    VFX.burst(e.x, e.y, { color: cls.accent, color2: '#ffffff', n: 18, speed: 220 });
  }
  function chooseHero(cls, specId) {
    if (typeof cls === 'string') cls = CLASSES.find(c => c.id === cls);   // (window.__game.chooseHero('thresher') from a console: an id without its class left drawHero reading ROLES[undefined])
    if (!cls) return;
    setTimeout(refreshLineup, 0);   // (the hero you just picked steps off the deck; the one you left steps back on)
    player.cls = cls;
    // the spec picked on the hero page, or the one this hero last played
    if (specId !== undefined) Save.setSpec(cls.id, specOf(cls.id, specId) ? specId : null);
    player.spec = specOf(cls.id, Save.spec(cls.id)) ? Save.spec(cls.id) : null;
    closePanels();
    heroPickFx(player, cls);
    Inventory.grantStarter(cls.id);
    makeActor();
    town.meter = null; town.meterDone = null;
    updateHeroName(); updatePartyList();
    toast(`You are now the ${cls.name}, ${cls.title}.`);
    townObjective();
    Net.send({ t: 'cls', id: cls.id, spec: player.spec });
    sendGear();
  }

  const bossThumbs = [];
  (function buildBossList() {
    const list = $('boss-list');
    BOSSES.forEach((boss, i) => {
      const b = document.createElement('button');
      b.className = 'item'; b.dataset.id = boss.id;
      const cv = document.createElement('canvas'); setupCanvas(cv, 56, 56);
      b.appendChild(cv);
      b.insertAdjacentHTML('beforeend', `<span><b></b><small></small></span>`);
      b.addEventListener('click', () => showBoss(boss));
      list.appendChild(b);
      bossThumbs.push({ cv, boss, b });
    });
    refreshBossList();
  })();
  // names and thumbnails for the bosses that are open; the rest read as sealed
  function refreshBossList() {
    BOSSES.forEach((boss, i) => {
      const t = bossThumbs[i], open = bossOpen(boss);
      t.b.classList.toggle('sealed', !open);
      t.b.querySelector('b').textContent = open ? boss.name : 'Sealed';
      t.b.querySelector('small').textContent = open ? `Boss ${ROMAN[i]} · ${boss.title}` : `Boss ${ROMAN[i]} · beat ${bossOpen(BOSSES[i - 1]) ? BOSSES[i - 1].name : `Boss ${ROMAN[i - 1]}`} to open`;
    });
  }
  let raidMode = 'normal', raidFill = true;
  function showBoss(boss) {
    document.querySelectorAll('#boss-list .item').forEach(b => b.classList.toggle('active', b.dataset.id === boss.id));
    const i = BOSSES.indexOf(boss);
    const det = $('boss-detail');
    if (!bossOpen(boss)) {
      det.innerHTML = `<div class="boss-sealed"><canvas></canvas><h3>Sealed</h3><p>Something waits past ${escapeHtml(BOSSES[i - 1].name)}. Beat ${escapeHtml(BOSSES[i - 1].name)} to see what.</p></div>`;
      const cv = det.querySelector('canvas'); setupCanvas(cv, 160, 160);
      const c = prep(cv); c.save(); c.translate(80, 128); c.scale(1.1, 1.1); drawShroud(c, 0, 0); c.restore();
      preview = null;
      return;
    }
    det.innerHTML = `
      <div class="detail-top">
        <canvas></canvas>
        <div class="detail-info">
          <h3>${boss.name}</h3>
          <div class="sub"><span class="role-tag" style="--c:#ff7a6a">Boss ${ROMAN[i]}</span>${boss.title}</div>
          <p class="tagline">${boss.blurb}</p>${typeof STORY !== 'undefined' && STORY.bossLore && STORY.bossLore[boss.id] ? `<p class="lore">${escapeHtml(STORY.bossLore[boss.id])}</p>` : ''}
        </div>
      </div>
      <div class="board-tabs hidden"><button type="button" data-tab="raid">Raid</button><button type="button" data-tab="loot">Loot</button></div>
      <div class="board-pane"><div class="raid-setup"></div><div class="loot-table"></div></div>`;
    const cv = det.querySelector('canvas');
    setupCanvas(cv, 260, 260);
    preview = { kind: 'boss', boss, cv, st: newSt(), nextDemo: now + 0.8 };
    if (boss.playable) { const el = det.querySelector('.raid-setup'); el.dataset.boss = boss.id; renderRaidSetup(el); }
    if (boss.playable) setupLootTab(det, boss);
  }
  // ---------------------------------------------------------------- the Loot tab: a beaten boss's chest and the odds
  // Normal's odds once the boss has fallen, Hard's once it has fallen on Hard. The odds come from the real roll
  // (chestChances in items.js) for the classes the people in the party play: bots bring no class pieces.
  let bossTab = 'raid', lootMode = 'normal';
  const lootCache = new Map();
  const lootModes = boss => (LOOT_TABLES[boss.id] ? ['normal', 'hard'].filter(m => unlockAll || (m === 'hard' ? Save.hardBeaten(boss.id) : Save.bossBeaten(boss.id))) : []);
  const slotName = it => (it.slot === 'accessory' ? 'Accessory' : it.slot === 'weapon' ? 'Weapon' : 'Armor');
  const clsName = id => (CLASSES.find(c => c.id === id) || { name: id }).name;
  function itemKeyTip(key, cls) {   // (the inventory's tooltip, compared with what this hero wears in that slot)
    const inst = { key }, l = cls ? Inventory.loadout(cls) : {}, s = cls && slotsFor(inst).find(x => canEquip(inst, cls, x));
    return Inventory.itemTip(inst, cls, s ? l[s] : null);
  }
  function setupLootTab(det, boss) {
    const tabs = det.querySelector('.board-tabs'), pane = det.querySelector('.board-pane');
    const modes = lootModes(boss);
    if (!modes.length) return;
    if (!modes.includes(lootMode)) lootMode = modes.includes(raidMode) ? raidMode : modes[0];   // (the last pick stays, boss to boss)
    tabs.classList.remove('hidden');
    const show = t => {
      bossTab = t;
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
      pane.classList.toggle('loot', t === 'loot');
      if (t === 'loot') renderLootTable(pane.querySelector('.loot-table'), boss);
      Tip.hide();
    };
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    show(bossTab);
  }
  function renderLootTable(el, boss) {
    const modes = lootModes(boss);
    if (!modes.includes(lootMode)) lootMode = modes[0];
    const humans = raidHumans(), classes = [...new Set(humans.map(h => h.cls))].sort();
    const ck = `${boss.id}|${lootMode}|${classes.join(',')}`;
    if (!lootCache.has(ck)) lootCache.set(ck, chestChances(boss.id, lootMode, classes));
    const odds = lootCache.get(ck), table = LOOT_TABLES[boss.id], mine = player.cls && player.cls.id;
    const pct = p => (p >= 1 ? '100%' : p < 0.005 ? '<1%' : `${Math.min(99, Math.round(p * 100))}%`);
    const rows = [], others = [];
    for (const r of [R_MYTHIC, R_LEGENDARY, R_RARE, R_UNCOMMON]) {
      const keys = table[r].filter(k => !ITEMS[k].cls || classes.includes(ITEMS[k].cls));
      keys.sort((a, b) => (odds[b] || 0) - (odds[a] || 0) || ITEMS[a].name.localeCompare(ITEMS[b].name));
      rows.push(...keys);
      others.push(...table[r].filter(k => ITEMS[k].cls && !classes.includes(ITEMS[k].cls)));
    }
    const rc = k => RARITY[ITEMS[k].rarity].color;
    const odd = CHEST_ODDS[lootMode].map((p, i) => `<span><i style="color:${RARITY[R_UNCOMMON + i].color}">${RARITY[R_UNCOMMON + i].name}</i> ${p}%</span>`).join('');
    const who = !classes.length ? 'with no hero picked yet, so no class pieces'
      : humans.length === 1 ? `raiding as your ${clsName(classes[0])}, with or without bots`
      : `for this party: ${humans.map(h => `${h.id === Net.id ? 'you' : escapeHtml(h.name)} (${clsName(h.cls)})`).join(', ')}, bots aside`;
    el.innerHTML = `
      <div class="lt-head">
        <div class="lt-odds"><span>${CHEST_SIZE[lootMode]} items</span>${odd}</div>
        <nav class="lt-modes">${modes.map(m => `<button type="button" data-mode="${m}" class="${m === lootMode ? 'on' : ''}">${m === 'hard' ? 'Hard' : 'Normal'}</button>`).join('')}</nav>
      </div>
      <div class="lt-list">
        <div class="lt-rows">${rows.map(k => { const it = ITEMS[k]; return `<div class="lt-row${it.cls && it.cls === mine ? ' mine' : ''}" data-key="${k}" style="--rc:${rc(k)}">
          <img src="${Inventory.iconURL({ key: k })}" alt=""><span class="lt-name"><b>${escapeHtml(it.name)}</b><small>${slotName(it)}${it.cls ? ` · ${clsName(it.cls)}` : ''}</small></span>${it.cls && it.cls === mine ? '<em>Yours</em>' : ''}<span class="lt-pct">${pct(odds[k] || 0)}</span></div>`; }).join('')}</div>
        ${others.length ? `<h5>Other heroes' pieces</h5><div class="lt-others">${others.map(k => `<i data-key="${k}" style="--rc:${rc(k)};background-image:url(${Inventory.iconURL({ key: k })})"></i>`).join('')}</div>` : ''}
      </div>
      <p class="lt-foot">The chance each piece is in one chest, ${who}.</p>`;
    el.querySelectorAll('.lt-row').forEach(row => Tip.set(row, () => itemKeyTip(row.dataset.key, mine)));
    el.querySelectorAll('.lt-others i').forEach(ic => Tip.set(ic, () => `${itemKeyTip(ic.dataset.key, mine)}<div class="lt-tipnote">Only in the chest when someone in the party plays a ${clsName(ITEMS[ic.dataset.key].cls)}. Bots don't count.</div>`));
    el.querySelectorAll('.lt-modes button').forEach(b => b.addEventListener('click', () => { lootMode = b.dataset.mode; renderLootTable(el, boss); }));
  }
  function renderRaidSetup(el) {
    const humans = raidHumans();
    const bots = raidFill ? pickBots(humans) : [];
    const canStart = Net.isHost && !!player.cls;
    const bossDef = BOSSES.find(b => b.id === el.dataset.boss) || BOSSES[0], hardOk = hardOpen(bossDef);
    if (!hardOk && raidMode === 'hard') raidMode = 'normal';
    const why = !Net.isHost ? 'Only the host can start the raid.' : !player.cls ? 'Pick a hero first.' : '';
    const extra = [...remotes.values()].filter(r => r.cls).length + (player.cls ? 1 : 0) > 4 ? '<p class="raid-note">Only the first four heroes go in.</p>' : '';
    el.innerHTML = `
      <div class="mode-pick">
        <button data-mode="normal" class="${raidMode === 'normal' ? 'on' : ''}"><b>Normal</b><small>Every attack is telegraphed on the floor.</small></button>
        <button data-mode="hard" class="${raidMode === 'hard' ? 'on' : ''}"${hardOk ? '' : ' disabled'}><b>Hard</b><small>${hardOk ? 'Faster and deadlier, with attacks Normal never uses.' : hardWhy(bossDef)}</small></button>
      </div>
      <label class="fill"><input type="checkbox" ${raidFill ? 'checked' : ''} ${Net.isHost ? '' : 'disabled'}> Fill empty slots with bots</label>
      <div class="raid-roster">${humans.map(h => `<span style="--c:${ROLES[h.role].color}">${escapeHtml(h.name)}<small>${CLASSES.find(c => c.id === h.cls).name}</small></span>`).join('')}${
        bots.map(id => { const c = CLASSES.find(x => x.id === id); return `<span class="bot" style="--c:${ROLES[c.role].color}">Bot<small>${c.name}</small></span>`; }).join('')}</div>
      ${extra}
      <button class="cta" ${canStart ? '' : 'disabled'}>${canStart ? `Start raid · ${raidMode === 'hard' ? 'Hard' : 'Normal'}` : why}</button>`;
    el.querySelectorAll('.mode-pick button:not([disabled])').forEach(b => b.addEventListener('click', () => { raidMode = b.dataset.mode; renderRaidSetup(el); }));
    el.querySelector('.fill input').addEventListener('change', e => { raidFill = e.target.checked; renderRaidSetup(el); });
    el.querySelector('.cta').addEventListener('click', () => startRaid(raidMode, raidFill, el.dataset.boss));
  }
  function openBossPanel(boss) {
    if (scene !== 'town') return;
    refreshBossList();
    sel.classList.add('hidden');
    overlay.classList.remove('hidden'); bossPanel.classList.remove('hidden');
    player.target = null;
    showBoss(boss);
  }

  // Menus fit the window: a page taller than the screen is scaled down to fit (to 70% at most; past that it scrolls)
  function fitMenus() {
    const pages = [
      ...document.querySelectorAll('#select > .sel-page:not(.hidden)'),
      ...document.querySelectorAll('#overlay:not(.hidden) > .panel:not(.hidden)'),
      ...['talents', 'inventory'].map(id => $(id)).filter(e => e && !e.classList.contains('hidden')).map(e => e.firstElementChild).filter(Boolean),
    ];
    for (const p of pages) {
      p.classList.add('fit');
      const z0 = Number(p.style.zoom) || 1, h = p.getBoundingClientRect().height / z0;
      if (!h) continue;
      const z = Math.max(0.7, Math.min(1, (innerHeight - 40) / h));
      if (Math.abs(z - z0) > 0.01) p.style.zoom = z.toFixed(3);
    }
  }
  let fitAt = 0;
  function renderPanels() {
    if (performance.now() - fitAt > 250) { fitAt = performance.now(); fitMenus(); }
    Keybinds.applyLayout();
    renderSelect();
    Inventory.frame(now);
    if (overlay.classList.contains('hidden')) return;
    const idle = { t: now, moving: false, action: null };
    for (const { cv, boss } of bossThumbs) { const c = prep(cv); if (bossOpen(boss)) drawBoss(c, boss, 28, 28, Math.PI / 2, idle, 0.34); else { c.save(); c.translate(28, 40); c.scale(0.42, 0.42); drawShroud(c, 0, 0); c.restore(); } }
    if (!preview || preview.kind !== 'boss') return;
    const st = preview.st;
    st.t = now;
    {
      if (now > preview.nextDemo) {
        st.action = { type: 'attack', t0: now, dur: BOSS_ATTACK_DUR }; preview.nextDemo = now + 2.8;
        if (preview.boss.id === 'wyrm') { const ks = ['roar', 'breath', 'claw', 'tail', 'fly']; preview.wp = ks[preview.wn = ((preview.wn ?? -1) + 1) % ks.length]; preview.wpUntil = now + 2.2; }
        if (preview.boss.id === 'hydra') { const ks = ['cry', 'maul', 'head', 'heart']; preview.wp = ks[preview.wn = ((preview.wn ?? -1) + 1) % ks.length]; preview.wpUntil = now + 2.2; }
        if (preview.boss.id === 'titan') { const ks = ['howl', 'fist', 'raise', 'breath']; preview.wp = ks[preview.wn = ((preview.wn ?? -1) + 1) % ks.length]; preview.wpUntil = now + 2.2; }
      }
      if (preview.boss.id === 'wyrm') st.props = preview.wp && now < preview.wpUntil ? { [preview.wp]: true } : {};   // (Vhalgrath's pose changes as the preview cycles)
      if (preview.boss.id === 'hydra') st.props = preview.wp && now < preview.wpUntil ? { [preview.wp]: true } : {};   // (the Mother's pose changes as the preview cycles)
      if (preview.boss.id === 'titan') st.props = preview.wp && now < preview.wpUntil ? { [preview.wp]: true } : {};   // (Hrimgar's pose changes as the preview cycles)
      const c = prep(preview.cv);
      preview.boss.id === 'wyrm' ? drawBoss(c, preview.boss, 168, 134, 0.3, st, 1.15) : drawBoss(c, preview.boss, 130, 128, 0.5 + Math.sin(now * 0.5) * 0.3, st, 1.45);
    }
  }

  // ---------------------------------------------------------------- networking (town)
  function makeRemote(p) {
    return {
      kind: 'remote', remote: true, id: p.id, name: p.name, cls: CLASSES.find(c => c.id === p.cls) || null,
      spec: p.cls && specOf(p.cls, p.spec) ? p.spec : null,
      x: p.x, y: p.y, tx: p.x, ty: p.y, angle: p.a || 0, ta: p.a || 0, m: 0, lift: 0, tl: 0, faceLock: 0, scene: p.s || 0,
      st: newSt(Math.random() * 3),
    };
  }
  Net.on('join', msg => {
    remotes.set(msg.p.id, makeRemote(msg.p));
    toast(`${msg.p.name} joined the town.`);
    updatePartyList();
  });
  Net.on('leave', msg => {
    const r = remotes.get(msg.id);
    if (!r) return;
    remotes.delete(msg.id); toast(`${r.name} left.`); updatePartyList();
    if (raidHost || pvpHost) { const h = hostRoster.find(x => x.id === msg.id); if (h) { h.left = true; (pvpHost || raidHost).sim.removePlayer(msg.id); } }
  });
  Net.on('snap', msg => {
    for (const [id, x, y, a, m, l, s, c] of msg.ps) {
      const r = remotes.get(id);
      if (!r) continue;
      const sc = s ? 1 : 0;
      if (sc !== r.scene) { r.scene = sc; r.x = x; r.y = y; r.track = new Track(x, y, a); updatePartyList(); }
      if (!r.track) r.track = new Track(r.x, r.y, r.angle);
      if (!r.clock) r.clock = new SendClock();
      r.track.push(r.clock.map(c, rnow), x, y, a);   // big jumps (teleports, scene changes) snap inside the track
      r.tx = x; r.ty = y; r.ta = a; r.m = m; r.tl = l;
    }
  });
  Net.on('cls', msg => {
    const r = remotes.get(msg.id);
    if (!r) return;
    const was = r.cls;
    r.cls = CLASSES.find(c => c.id === msg.cls) || null;
    r.spec = r.cls && specOf(r.cls.id, msg.spec) ? msg.spec : null;
    if (r.cls && r.cls !== was) {   // a spec change alone (or a reconnect resend) isn't a new pick
      if (r.scene === (scene === 'arena' ? 1 : 0)) heroPickFx(r, r.cls);
      toast(`${r.name} picked ${r.cls.name}.`);
    }
    updatePartyList();
  });
  // another player's (or a bot's) skill: play its visual
  Net.on('cast', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (!e || !e.cls) return;
    const eScene = e.bot ? 1 : (msg.s ? 1 : 0);
    if (eScene !== (scene === 'arena' ? 1 : 0)) return;
    // where they cast from goes into their track like any position update (snapping here would fight the smoothing)
    if (!e.bot) { e.tx = msg.x; e.ty = msg.y; if (e.track) e.track.push(e.clock ? e.clock.map(msg.c, rnow) : rnow, msg.x, msg.y, e.track.latest().a); }
    if (msg.i === 6) { e.dashUntil = now + 0.2; VFX.setScale(0.6); KIT_VFX.dash(e, e.cls.accent); VFX.setScale(1); if (SH) SH.play('dash', { vol: 0.6, remote: true, at: e }); return; }
    // a move a talent granted (msg.a names it) looks like itself, not the move it replaced
    const ab = (msg.a && abilityById(e.cls.id, e.spec, msg.a)) || kitFor(e.cls.id, e.spec).abilities[msg.i];
    if (!ab) return;
    let tx = msg.tx, ty = msg.ty, tent = null;
    if (msg.ally != null) { tent = entById(msg.ally); if (tent) { tx = tent.x; ty = tent.y; } }
    FX.cast(e, ab, tx, ty, { tent, step: msg.st });   // (st: its combo step, engine.js fxStep)
    if (SH) SH.ability(e.cls.id, ab, false, e, msg.id);
  });
  // another player's class moment (Perfect Block, Overheat, Dawnstar...)
  Net.on('kfx', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (e && (msg.k === 'ult-ready' || msg.k === 'ult-spent')) e.ultReady = msg.k === 'ult-ready';   // (the pip on their party frame)
    if (!e || (msg.s ? 1 : 0) !== (scene === 'arena' ? 1 : 0)) return;
    playKitFx(e, msg.k, false, msg.d && typeof msg.d === 'object' ? msg.d : null);
  });
  Net.on('castStart', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (e) e.st.action = { type: 'cast', t0: now, dur: Math.max(0.55, msg.dur || 1), channel: true };
    // the bar under them: the skill's icon and name, and the seconds left
    const ab = e && e.cls && Number.isInteger(msg.i) && msg.i >= 0 ? kitFor(e.cls.id, e.spec).abilities[msg.i] : null;
    if (e) e.castBar = ab ? { ab, t0: now, dur: Math.max(0.3, msg.dur || 1), to: msg.h > 0 && Number.isInteger(msg.to) ? msg.to : null, h: msg.h > 0 ? msg.h : 0 } : null;
    if (e && e.castBar && typeof CAST_VFX !== 'undefined') { VFX.setScale(0.6); try { CAST_VFX.start(e, e.castBar.dur, ab); } finally { VFX.setScale(1); } }
  });
  Net.on('castStop', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (e && e.st.action && e.st.action.channel) e.st.action = null;
    if (e && e.castBar && e.castBar.stop == null) e.castBar.stop = now;   // (its bar shows the interrupt, then goes: drawCastBar)
  });
  // a cast under a hero's feet: icon, name, a bar filling, "1.9 / 5.9"
  const castIcons = new Map();
  function castIcon(cls, ab) {
    const k = cls.id + ':' + ab.id;
    if (!castIcons.has(k)) { const im = new Image(); im.src = abilityIcon(cls.id, abilityIconId(ab)); castIcons.set(k, im); }
    return castIcons.get(k);
  }
  function drawCastBar(e) {
    const c = e.castBar;
    if (!c || !e.cls) return;
    const el = now - c.t0;
    // its ending: a cast that ran out flashes full and fades; one cut short (c.stop: castStop) goes red and drops away
    const stopEl = c.stop != null ? c.stop - c.t0 : null, broke = stopEl != null;
    if (broke ? el > stopEl + 0.4 : el > c.dur + 0.3) { e.castBar = null; return; }
    const q = broke ? (el - stopEl) / 0.4 : el >= c.dur ? (el - c.dur) / 0.3 : 0;
    const w = 74, x0 = Math.round(e.x - w / 2 + 9), y0 = Math.round(e.y + 22 + (broke ? q * q * 9 : 0));
    const f = clamp((broke ? stopEl : el) / c.dur, 0, 1);
    const im = castIcon(e.cls, c.ab);
    ctx.save();
    if (q > 0) ctx.globalAlpha = broke ? 1 - q * q : 1 - q * q * (3 - 2 * q);
    rrect(ctx, x0 - 20, y0 - 3, w + 22, 14, 2, 'rgba(10,8,6,0.82)');
    if (im.complete && im.naturalWidth) ctx.drawImage(im, x0 - 19, y0 - 2, 12, 12);
    rrect(ctx, x0, y0, w, 8, 1.5, 'rgba(255,255,255,0.08)');
    rrect(ctx, x0, y0, w * f, 8, 1.5, broke ? '#c8463a' : e.cls.accent || '#e8c15a');
    if (!broke && el >= c.dur) rrect(ctx, x0, y0, w, 8, 1.5, `rgba(255,248,226,${(0.6 * (1 - q)).toFixed(3)})`);   // (the completion flash)
    ctx.font = '600 9.5px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(10,8,6,0.9)';
    const outlined = (s, x, y, col) => { ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); };
    ctx.textAlign = 'right';
    outlined(broke ? 'Interrupted' : `${Math.min(el, c.dur).toFixed(1)} / ${c.dur.toFixed(1)}`, x0 + w - 2, y0 + 4.5, broke ? '#ffd0c8' : '#fff');
    // the name, cut to the plate's width (measured once per cast)
    if (c.nm == null) {
      const max = w + 20;
      let s = c.ab.name;
      if (ctx.measureText(s).width > max) { while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); s = s.trimEnd() + '…'; }
      c.nm = s;
    }
    ctx.textAlign = 'left';
    outlined(c.nm, x0 - 19, y0 - 9, '#f2e6c8');
    ctx.restore();
  }
  // someone else's auto-attack (a friend's or a bot's)
  Net.on('auto', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (!e || !e.cls || (msg.s ? 1 : 0) !== (scene === 'arena' ? 1 : 0)) return;
    playAuto(e, msg.tx, msg.ty, msg.k, false, !!msg.a);
    if (SH) SH.auto(e.cls.id, msg.k, false, e, msg.id);
  });
  Net.on('chat', msg => {
    const r = remotes.get(msg.id);
    if (!r) return;
    const em = /^\*(\w+)$/.exec(msg.text || '');
    if (em && Pastimes.EMOTES[em[1]]) { Pastimes.emote(r, em[1], now); emoteLine(r.name, em[1]); return; }
    showChat(r, msg.text);
  });
  function emoteLine(name, k) {
    const log = $('chat-log'), row = document.createElement('div');
    row.className = 'emote-line'; row.textContent = `${name} ${Pastimes.EMOTES[k]}.`;
    log.appendChild(row); while (log.children.length > 7) log.firstChild.remove();
    setTimeout(() => row.classList.add('old'), 15000);
  }
  // the host is gone: back to the join screen (hero and bags kept) so you can rejoin, host or go solo at once
  Net.on('disconnect', () => {
    remotes.clear(); updatePartyList();
    if (scene === 'arena') leaveRaid(false);
    closePanels(); if (Inventory.isOpen()) Inventory.toggle();
    Journal.close(); Tutorial.close(); Keybinds.closePanel(); Keybinds.arrange(false); Pings.closePanel(); closePractice(); closeBarrow();
    TownLife.endTalk(); Loot.leave(); TalentPanel.close();
    chatInput.classList.add('hidden'); chatInput.blur();
    started = false;
    joinErr.textContent = 'Lost connection to the host.';
    hostBtn.disabled = joinBtn.disabled = soloBtn.disabled = false;
    for (const b of [hostBtn, joinBtn, soloBtn]) b.textContent = b.dataset.label;
    $('join').classList.remove('hidden');
  });

  // ---------------------------------------------------------------- join screen
  const joinForm = $('join-form'), nameInput = $('name-input'), codeInput = $('code-input'), joinErr = $('join-error');
  const hostBtn = $('host-btn'), joinBtn = $('join-btn'), soloBtn = $('solo-btn');
  nameInput.value = Save.get('name') || '';
  const hashCode = location.hash.replace('#', '').toUpperCase();
  if (/^[A-Z]{4}$/.test(hashCode)) codeInput.value = hashCode; // invite links look like ...#ABCD
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  for (const b of [hostBtn, joinBtn, soloBtn]) b.dataset.label = b.textContent;

  async function enter(mode) {
    const name = nameInput.value.trim().slice(0, 16) || 'Adventurer';
    Save.set('name', name);
    joinErr.textContent = '';
    if (mode === 'join' && codeInput.value.length !== 4) { joinErr.textContent = 'Enter the 4-letter room code from your host.'; return; }
    if (mode !== 'solo' && typeof Peer === 'undefined') { joinErr.textContent = 'Could not load the networking library. Check your connection, or play solo.'; return; }
    const btn = { host: hostBtn, join: joinBtn, solo: soloBtn }[mode], label = btn.textContent;
    hostBtn.disabled = joinBtn.disabled = soloBtn.disabled = true;
    btn.textContent = mode === 'host' ? 'Opening...' : mode === 'join' ? 'Joining...' : 'Starting...';
    try {
      const msg = mode === 'host' ? await Net.host(name) : mode === 'join' ? await Net.join(codeInput.value, name) : await Net.startSolo(name);
      player.name = msg.name;
      for (const p of msg.players) remotes.set(p.id, makeRemote(p));
      player.x = msg.spawn.x; player.y = msg.spawn.y;
    } catch (err) {
      joinErr.textContent = err.message;
      hostBtn.disabled = joinBtn.disabled = soloBtn.disabled = false; btn.textContent = label;
      return;
    }
    $('join').classList.add('hidden');
    Title.hide();
    started = true;
    Inventory.showGoldHud(scene !== 'arena');
    if (!player.cls) openSelect(null);
    else { Net.send({ t: 'cls', id: player.cls.id, spec: player.spec }); sendGear(); }   // back after a lost connection: tell the new room who we are
    updatePartyList();
    toast(Net.solo ? `Welcome to Emberfall, ${player.name}. Bots fill the empty slots.` : Net.isHost ? `Hosting · room code ${Net.room}` : `Welcome to Emberfall, ${player.name}.`);
  }
  hostBtn.addEventListener('click', () => enter('host'));
  soloBtn.addEventListener('click', () => enter('solo'));
  joinForm.addEventListener('submit', e => { e.preventDefault(); enter(codeInput.value ? 'join' : 'host'); });

  $('party').addEventListener('click', e => {
    if (!e.target.closest('.copy-room')) return;
    const link = /^https?:/.test(location.protocol) ? `${location.origin}${location.pathname}#${Net.room}` : Net.room;
    navigator.clipboard.writeText(link).then(
      () => toast(link === Net.room ? `Room code copied: ${Net.room}.` : 'Invite link copied.'),
      () => toast(`Room code: ${Net.room}`));
  });

  // clicking your locked ally's frame again lets go of them
  RaidUI.init({ onFrame: id => { lockedAlly = lockedAlly === id ? null : id; }, onLeave: () => leaveRaid(true),
    onPlaceMark: k => placeMark(k), onWaymark: msg => sendWaymark(msg), onCallouts: () => Pings.openPanel(), onPullIn: () => startPullCountdown(), onRezAsk: () => askRaise(),
    onDock: where => { if (player.cls) Save.setSetting(`frames-${player.cls.role}`, where); } });
  // where the party frames sit for your role: healers start with them above the hotbar
  // party frames sit in the corner unless you moved them above your skills (Options, or the dock button on them)
  const frameDock = () => (player.cls ? Save.setting(`frames-${player.cls.role}`, 'left') : 'left');
  const applyFrameDock = () => { if (player.cls) RaidUI.dock(frameDock()); };

  // inventory: the hero figure uses the painted portrait if there is one, else the sprite on a sigil
  const invSt = newSt();
  // game-side lines for the debug overlay (F3): [label, value, needs attention?]
  DebugOverlay.init(() => {
    const out = [];
    const humans = 1 + [...remotes.values()].filter(r => !inArena() || raid.rosterIds.has(r.id)).length;
    if (!inArena()) { out.push(['Scene', 'town'], ['Players here', String(humans)]); }
    else {
      const age = raid.lastFb ? performance.now() - raid.lastFb : null;
      out.push(['Scene', `${raid.def.name} · ${raid.mode} · ${raid.state}`]);
      out.push(['Arena', ARENA.kind === 'rect' ? `rectangle ${ARENA.hw * 2}×${ARENA.hh * 2}` : ARENA.kind === 'poly' ? `${ARENA.n}-sided, ${ARENA.r} across to a corner` : `circle r ${ARENA.r}`]);
      out.push(['Party', `${humans} player${humans > 1 ? 's' : ''}, ${raid.bots.size} bot${raid.bots.size === 1 ? '' : 's'}`]);
      out.push(['Last boss update', age == null ? '—' : `${age.toFixed(0)} ms ago`, age != null && age > 400 && raid.state === 'live']);
      out.push(['On screen', `${raid.adds.size} adds · ${raid.tgs.size} telegraphs · ${raid.puddles.size} puddles`]);
      if (raid.bond && raid.bond.active.length) out.push(['Party bonus', raid.bond.active.map(b => `${b.name} ${b.n}/4`).join(', ')]);
    }
    out.push(['Save', `v${Save.VERSION}`]);
    return out;
  });

  Inventory.init({
    cls: () => player.cls && player.cls.id,
    locked: () => scene === 'arena',
    onChange: sendGear,
    drawFigure(c, cls, w, h) {
      invSt.t = now;
      if (PORTRAITS[cls.id]) { drawBust(c, PORTRAITS[cls.id], 0, 0, Math.min(w, h)); VFX.glowAt(c, w / 2, h + 16, 110, cls.accent, 0.16); return; }
      c.save(); c.translate(w / 2, h - 34); c.scale(1, 0.4); c.rotate(now * 0.3);
      VFX.neonPath(c, cls.accent, 1.6, 0.5, () => { for (let i = 0; i <= 8; i++) { const a = i * Math.PI * 2 / 8 * 3; c.lineTo(Math.cos(a) * 78, Math.sin(a) * 78); } });
      c.restore();
      VFX.neonRing(c, w / 2, h - 34, 86, cls.accent, 2, 0.7, 0.4);
      VFX.glowAt(c, w / 2, h * 0.55, 110, cls.accent, 0.22);
      drawHero(c, cls, w / 2, h * 0.52, Math.PI / 2 + Math.sin(now * 0.6) * 0.5, invSt, 2.9, { ring: false });
    },
  });
  const bagBtn = document.createElement('button');
  bagBtn.id = 'bag-btn'; bagBtn.dataset.tip = 'Inventory';
  bagBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 7V6a4 4 0 0 1 8 0v1h2.5l1.5 14H4L5.5 7H8zm2 0h4V6a2 2 0 0 0-4 0v1z" fill="currentColor"/></svg>';
  bagBtn.addEventListener('click', () => { if (started && !selOpen()) { TalentPanel.close(); Inventory.toggle(); } });
  document.body.appendChild(bagBtn);
  TalentPanel.init({
    cls: () => player.cls,
    spec: () => player.spec,
    locked: () => scene !== 'town',
    onChange: talentsChanged,
    onGold: () => Inventory.refreshGold(),
  });

  // Handy for poking at the game from the browser console.
  window.__game = {
    player, remotes, get actor() { return actor; }, get raid() { return raid; }, get raidHost() { return raidHost; },
    openHeroPanel, openBossPanel, openBarrow, chooseHero, startRaid, startTrial, openSelect, pressSlot, leaveRaid, CLASSES, BOSSES,
    // testing aid: advance the game clock by hand (for screenshots in throttled preview panes)
    // (it also unmutes FX/VFX: a hidden preview pane is still being watched through screenshots)
    step(sec = 0.5) { FX.muted = false; VFX.mute(false); for (let t = 0; t < sec; t += 1 / 60) { now += 1 / 60; rOff += 1 / 60; rnow = realNow(); update(1 / 60); } render(); renderPanels(); updateTargetFrame(); Hud.update(now, now); },
    cycleTarget, get lockedEnemy() { return lockedEnemy; }, get now() { return now; },
    pause(on = true) { paused = on; },
    get pvpHost() { return pvpHost; }, startPvp,
  };
  let paused = false;

  // sound once a frame (sound-hooks.js): the listener, the scene's beds and music, the pull countdown's drum, an
  // Ultimate window opening and closing, and the cast hum ending with its bar
  let sndCount = -1, sndUltWin = false;
  function soundTick() {
    if (!SH) return;
    try {
      const ms = inArena() ? myState() : null;
      if (actor && actor.kit && inArena()) SH.stacks(actor.kit);
      SH.tick(!started ? 'title' : scene, player.x, player.y, !!player.st.moving, ms && ms.maxHp > 0 ? ms.hp / ms.maxHp : 1, !!(ms && ms.alive));
      const left = !inArena() ? -1 : raid.state === 'countdown' ? raid.countdownEnd - now : raid.state === 'prepull' && raid.pullAt ? raid.pullAt - now : -1;
      const n = left > 0 ? Math.ceil(left) : -1;
      if (n !== sndCount) { if (n > 0) SH.play(n === 1 ? 'pull-count-last' : 'pull-count', { vol: n === 1 ? 1 : 0.8 }); if (n > 0 && sndCount <= 0) SH.vo('countdown', { bossId: raid.def.id, seconds: left }); sndCount = n; }
      const w = !!(actor && actor.kit.ultWin);
      if (w !== sndUltWin) { sndUltWin = w; SH.play(w ? 'ult-window' : 'ult-window-end', { vol: 0.7 }); }
      const cb = player.castBar;
      if (!cb || cb.stop != null || now > cb.t0 + cb.dur + 0.15) SH.castEnd();
    } catch (e) { /* sound never stops a frame */ }
  }

  // ---------------------------------------------------------------- boot
  function frame(ts) {
    const raw = (ts - last) / 1000;
    last = ts;
    rnow = realNow();
    DebugOverlay.frame(raw);   // the real frame time
    // a slow frame is caught up in steps of at most 50 ms (up to a quarter second), so cast bars and timers keep
    // the host's real time
    if (!paused) { let left = Math.min(0.25, raw); while (left > 1e-4) { const dt = Math.min(0.05, left); now += dt; update(dt); left -= dt; } }
    render();
    renderPanels();
    updateTargetFrame();
    Hud.update(now, now);
    drawMinimap();
    soundTick();
    requestAnimationFrame(frame);
  }

  const fontsReady = document.fonts
    ? Promise.race([document.fonts.load('700 15px Cinzel'), new Promise(r => setTimeout(r, 1500))])
    : Promise.resolve();
  fontsReady.then(() => {
    layerScale = Math.min(DPR, 1.5);
    townLayer = buildTownLayer(layerScale);
    minimapBase = document.createElement('canvas');
    minimapBase.width = MW * 2; minimapBase.height = MH * 2;
    minimapBase.getContext('2d').drawImage(townLayer, 0, 0, MW * 2, MH * 2);
    setupCanvas(mini, MW, MH);
    cam.x = clamp(player.x - W / 2, 0, Math.max(0, WORLD.w - W));
    cam.y = clamp(player.y - H / 2, 0, Math.max(0, WORLD.h - H));
    updateHeroName();
    updatePartyList();
    setObjective('Visit the <b>Barkeep</b> at The Gilded Tankard (west) to choose a hero, or click a hero waiting on the deck.');
    nameInput.focus();
    requestAnimationFrame(t => { last = t; frame(t); });
  });
})();
