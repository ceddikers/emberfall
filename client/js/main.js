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
  const $ = id => document.getElementById(id);
  const rnd = Math.round;
  let now = 0, last = performance.now(), started = false;
  let townLayer = null, layerScale = 1, minimapBase = null;
  let scene = 'town', zoom = 1;
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

  const lineup = CLASSES.map((cls, i) => {
    const roleIdx = ['tank', 'dps', 'healer'].indexOf(cls.role);
    const same = CLASSES.filter(c => c.role === cls.role), col = same.indexOf(cls);
    const p = lineupSpot(roleIdx, col, Math.max(3, same.length));
    // labelUp: in a packed row every other name sits higher, so neighbours' names don't run together
    return { kind: 'hero', cls, x: p.x, y: p.y, angle: Math.PI / 2, st: newSt(i * 0.7), nextAct: 2 + Math.random() * 6, labelUp: same.length > 3 && col % 2 === 1 };
  });
  const keeper = { kind: 'keeper', x: TOWN.keeper.x, y: TOWN.keeper.y, angle: Math.PI / 2, st: newSt() };
  const trainer = { kind: 'trainer', x: TOWN.trainer.x, y: TOWN.trainer.y, angle: Math.PI / 2, st: newSt(1.3) };   // talents (talent-panel.js)
  const statues = BOSSES.map((boss, i) => ({
    kind: 'boss', boss, x: TOWN.pedestals[i].x, y: TOWN.pedestals[i].y - 6, angle: Math.PI / 2, st: newSt(i), nextAct: 2 + i * 1.5,
  }));
  // The first dummy fights back (every 2.8s, like a raid boss's auto-attack) so tanks can practice their defensives.
  const dummies = TOWN.dummies.map((d, i) => ({ kind: 'dummy', x: d.x, y: d.y, st: { t: 0, hit: -10 }, spar: i === 0, nextSwing: 0, windup: 0 }));

  const interactables = [
    ...lineup.map(h => ({ x: h.x, y: h.y, r: 24, reach: 80, label: h.cls.name, open: () => openHeroPanel(h.cls) })),
    { x: keeper.x, y: keeper.y, r: 22, reach: 80, label: 'Barkeep', open: () => openSelect(null) },
    { x: trainer.x, y: trainer.y, r: 22, reach: 80, label: 'Trainer', open: () => openTalents() },
    ...statues.map(b => ({ x: b.x, y: b.y, r: 58, reach: 120, label: b.boss.name, open: () => openBossPanel(b.boss) })),
    { x: TOWN.portal.x, y: TOWN.portal.y, r: TOWN.portal.r, reach: 130, label: 'Raid Portal', open: () => openBossPanel(BOSSES[0]) },
  ];

  // small game-logic timers (FX.later is for visuals only)
  const timers = [];
  function later(delay, fn) { timers.push({ t: now + delay, fn }); }
  function runTimers() {
    for (let i = timers.length - 1; i >= 0; i--) if (now >= timers[i].t) { const tm = timers[i]; timers.splice(i, 1); tm.fn(); }
  }

  // ---------------------------------------------------------------- local combat (your class kit)
  let actor = null;
  let lockedAlly = null, hoverFrame = null, lastEnemy = null, lockedEnemy = null;
  const town = { buffs: [], vuln: 0, vulnEnd: 0, mits: [], shield: null, taken: [], meter: null, meterDone: null };

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
    if (!talentCache || talentCache.cls !== id) talentCache = { cls: id, set: talentSet(id, Save.talents(id)) };
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
        // the enemy you clicked if it's in range, otherwise the nearest one in range (boss or add)
        if (raid.state !== 'live') return null;
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
    positional: () => {
      if (inArena()) return positionalOf(player, { x: raid.boss.x, y: raid.boss.y, facing: raid.boss.f });
      return lastEnemy ? positionalOf(player, { x: lastEnemy.x, y: lastEnemy.y, facing: Math.PI / 2 }) : 'front';
    },
    allyTarget: (a, ab) => allyTargetId(ab),
    gearMods: () => Inventory.mods(player.cls && player.cls.id),
    talents: () => activeTalents(),
    known: () => new Set(Save.found(player.cls ? player.cls.id : '')),   // hidden recipes found (Volatile Reactions)
    discover: (a, id) => { if (player.cls) Save.discover(player.cls.id, id); },
    isDead: id => { if (!inArena()) return false; const s = raid.party.get(id); return !!s && !s.alive; },
    defaultLink: () => (inArena() && raid.boss.tg != null ? raid.boss.tg : Net.id),
    partyMods: () => {
      const m = { dmg: 0, crit: 0, haste: 0 };
      for (const b of (inArena() ? raid.pbuffs : town.buffs)) if (b.end > now) m[b.kind] = Math.max(m[b.kind] || 0, b.value);
      if (inArena() && raid.bond) { m.dmg += raid.bond.dmg; m.crit += raid.bond.crit; m.haste += raid.bond.haste; }   // gear party bonus
      return m;
    },
    targetMods: () => ({ vuln: inArena() ? (raid.boss.v || 0) : (town.vulnEnd > now ? town.vuln : 0) }),
    selfMods: () => { const s = myState(); return { dmgDown: inArena() && s && s.dd ? FIGHT.DMG_DOWN : 0 }; },
    recentDamage: (a, secs) => (inArena() ? raid.taken : town.taken).filter(d => d.t > now - secs).reduce((x, d) => x + d.a, 0),
    hpFrac: () => { const s = myState(); return s && s.maxHp ? Math.max(0, s.hp / s.maxHp) : 1; },
    // the boss as talents see it (kits.js bossNow): its cast bar, the next move in the bnext feed, who it's on
    boss: () => {
      if (!inArena() || !raid || raid.state !== 'live') return null;
      const c = raid.cast && now <= raid.cast.start + raid.cast.dur ? raid.cast : null, s = myState();
      const n = raid.bnext && raid.bnext.l.length ? Math.max(0, raid.bnext.l[0][1] - (now - raid.bnext.at)) : null;
      return { casting: !!c, castLeft: c ? c.start + c.dur - now : 0, next: n, onMe: raid.boss.tg === Net.id, vuln: raid.boss.v || 0, selfVuln: !!(s && s.vuln) };
    },
    maxHp: () => { const s = myState(); return s ? s.maxHp : playerBaseHp(player.cls ? player.cls.role : 'dps') + (Inventory.mods(player.cls && player.cls.id).hp || 0); },
    onEvent: (a, ev) => onKitEvent(ev),
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
    if (hoverFrame != null && validAlly(hoverFrame, ab)) return hoverFrame;
    // mouseover: pointing straight at an ally in the world sends the heal there, ahead of your locked ally
    const under = hoverAlly(ab);
    if (under != null) return under;
    if (lockedAlly != null && validAlly(lockedAlly, ab)) return lockedAlly;
    // a tank (Spellwarden) is usually pointing at the boss, not an ally: only a frame or a locked ally counts
    if (player.cls && player.cls.role === 'tank') return Net.id;
    const s = softAlly(ab);
    return s != null ? s : Net.id;
  }
  function healerish() { return actor && actor.abilities.some(a => a.target === 'ally'); }

  // --- kit events
  const SIM_EVENTS = new Set(['damage', 'heal', 'hot', 'shield', 'mit', 'raise', 'rewind', 'selfDamage', 'targetDebuff', 'partyBuff', 'snap', 'pool', 'brand', 'taunt', 'splash']);
  const EV_FIELDS = ['type', 'amount', 'crit', 'target', 'ticks', 'interval', 'id', 'dur', 'tag', 'pct', 'kind', 'value', 'secs', 'threat', 'tgt', 'r', 'not',
    'up', 'sh', 'cl', 'pa', 'ps', 'pr', 'fol'];   // (a thrown vial's splash: fight.js splash())
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
        const ab = ev.ab, i = actor.abilities.indexOf(ab);
        if (selfCast && selfCast.i === i) selfCast = null;
        let tx = player.x, ty = player.y, ally = null;
        if (ab.target === 'enemy' && ev.target) { tx = ev.target.x; ty = ev.target.y; lastEnemy = ev.target; }
        else if (ab.target === 'ally' && typeof ev.target === 'number') {
          ally = ev.target; const e = entById(ev.target); if (e) { tx = e.x; ty = e.y; }
        } else {
          const e = enemyPos(); if (e) { tx = e.x; ty = e.y; } else { const m = mouseWorld(); tx = m.x; ty = m.y; }
        }
        FX.cast(player, ab, tx, ty, { mine: true, tent: ally != null ? entById(ally) : null });
        Net.send({ t: 'cast', i, a: ab.id, x: rnd(player.x), y: rnd(player.y), tx: rnd(tx), ty: rnd(ty), ally, s: scene === 'arena' ? 1 : 0, c: +now.toFixed(3) });
        break;
      }
      case 'auto': {
        // your weapon strikes on its own; aim it at whatever it hit and show everyone
        const t = ev.target;
        if (t && typeof t === 'object') {
          lastEnemy = t;
          autoAlt = !autoAlt;
          playAuto(player, t.x, t.y, ev.kind, true, autoAlt);
          Net.send({ t: 'auto', k: ev.kind, tx: rnd(t.x), ty: rnd(t.y), a: autoAlt ? 1 : 0, s: scene === 'arena' ? 1 : 0 });
        }
        break;
      }
      case 'castStart':
        // a real cast: the hero channels it (see drawChannel in heroes.js)
        player.st.action = { type: 'cast', t0: now, dur: Math.max(0.55, ev.dur), channel: true };
        Net.send({ t: 'castStart', i: actor.abilities.indexOf(ev.ab), dur: +ev.dur.toFixed(2) });
        break;
      case 'interrupted':
        player.st.action = null;
        Net.send({ t: 'castStop' });
        FX.text(player.x, player.y - 56, 'Interrupted', '#ff9a8a', 13);
        break;
      case 'fail':
        if (now - failAt < 0.6 || ev.reason === 'cooldown') break;
        failAt = now;
        FX.text(player.x, player.y - 56, ev.reason === 'target' ? (ev.ab.target === 'enemy' ? (inArena() && (raid.boss.u || raid.state !== 'live') ? 'No target' : 'Out of range') : 'No target') : 'Not ready', '#c8c0d8', 12, 0.7);
        break;
      case 'teleport': if (ev.where && ev.where !== 'behind') kitMove(ev); else teleportBehind(); break;
      case 'fx': kitFx(ev.name, ev.data); break;
      case 'damage': onMyDamage(ev); break;
      default:
        if (SIM_EVENTS.has(ev.type)) {
          if (inArena()) {
            sendCombat(ev);
            if (ev.type === 'heal' || (ev.type === 'splash' && ev.amount)) showHeal(ev.target, ev.amount, ev.crit);
          } else townEvent(ev);
        }
    }
  }

  function sendCombat(ev) {
    if (!inArena() || raid.state !== 'live') return;
    const e = packEv(ev);
    if (Net.isHost && raidHost) raidHost.onPlayerEvent(Net.id, e);
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
      if (e && amount >= 1) FX.text(e.x, e.y - 50, '+' + rnd(amount), crit ? '#b6ff9a' : '#7dff8a', crit ? 17 : 14);
    }
  }

  function onMyDamage(ev) {
    // auto-attacks and DoTs get small, muted numbers so the abilities stay the headline
    const big = ev.auto ? (ev.crit ? 15 : 12) : ev.crit ? 21 : ev.dot ? 12 : 15;
    const col = ev.auto ? (ev.crit ? '#f2d488' : '#cfc6b4') : ev.crit ? '#ffd84a' : ev.dot ? '#d8d0c0' : '#ffffff';
    const txt = rnd(ev.amount) + (ev.crit ? '!' : '') + (ev.positional ? ' ◆' : '');
    if (inArena()) {
      // damage goes to whatever you last aimed at (DoTs keep ticking on your current target)
      const tgt = ev.tgt != null ? ev.tgt : lastEnemy && lastEnemy.id != null && lastEnemy.id !== 'dummy' ? lastEnemy.id : 'boss';
      sendCombat(Object.assign({}, ev, { tgt }));
      const at = enemyNow(tgt) || { x: raid.boss.x, y: raid.boss.y };
      FX.text(at.x + (Math.random() - 0.5) * 40, at.y - (tgt === 'boss' ? 70 : 34), txt, col, tgt === 'boss' ? big : big - 2);
      return;
    }
    const d = lastEnemy && lastEnemy.dummy;
    if (!d) return;
    d.st.hit = now;
    FX.text(d.x, d.y - 40, txt, col, big);
    if (!town.meter || now - town.meter.last > 6) town.meter = { start: now, dmg: 0, last: now, gcd0: actor.kit.stats.gcdTime };
    town.meter.dmg += ev.amount; town.meter.last = now;
  }

  // Training-yard stand-ins for what the host does in a raid.
  function townEvent(ev) {
    switch (ev.type) {
      case 'heal': showHeal(ev.target, ev.amount, ev.crit); break;
      case 'partyBuff': town.buffs.push({ kind: ev.kind, value: ev.value, end: now + ev.dur }); break;
      case 'targetDebuff': if (ev.kind === 'vuln') { town.vuln = ev.value; town.vulnEnd = now + ev.dur; } break;
      case 'mit': if (ev.target === 'self' || ev.target === Net.id || ev.target === 'party') town.mits.push({ kind: ev.kind, pct: ev.pct, start: now, end: now + ev.dur }); break;
      case 'shield':
        if (ev.target === 'self' || ev.target === Net.id || ev.target === 'party') {
          if (town.shield) endTownShield();
          town.shield = { amount: ev.amount, max: ev.amount, end: now + (ev.dur || 15), tag: ev.tag };
        } else if (ev.tag === 'ward' && actor) {
          // a Spellwarden's Ward on a friend in town soaks nothing (no host here), but still ends with its blast
          const a = actor; later(ev.dur || 8, () => { if (actor === a) a.notify('shieldEnd', { tag: 'ward', frac: 0 }); });
        }
        break;
    }
  }
  function endTownShield() {
    const s = town.shield; if (!s) return;
    town.shield = null;
    actor && actor.notify('shieldEnd', { tag: s.tag, frac: 1 - Math.max(0, s.amount) / s.max });
  }
  // the sparring dummy's swing landing on you
  function sparHit(d) {
    const dist = Math.hypot(player.x - d.x, player.y - d.y);
    FX.add({ type: 'ring', x: player.x, y: player.y, r: 40, color: '#ff6a4a', dur: 0.35 });
    if (dist > 140 || !actor) return;
    let amt = 1300 * FIGHT.NUM_SCALE, perfect = false, reflect = false;
    town.mits = town.mits.filter(m => m.end > now);
    for (const m of town.mits) {
      if (m.kind === 'brace' && now - m.start <= FIGHT.PERFECT_WINDOW && !perfect) { perfect = true; amt *= 0.4; m.end = 0; continue; }
      if (m.kind === 'reflect' && !reflect) { reflect = true; amt *= 0.2; m.end = 0; continue; }
      if (m.kind === 'invuln') { amt = 0; break; }
      if (m.kind !== 'living') amt *= 1 - (m.pct || 0);
    }
    if (town.shield) {
      const used = Math.min(town.shield.amount, amt);
      town.shield.amount -= used; amt -= used;
      if (town.shield.amount <= 0.5) endTownShield();
    }
    amt = rnd(amt);
    town.taken.push({ t: now, a: amt });
    if (amt > 0) FX.text(player.x, player.y - 46, '-' + amt, '#ff7a6a', 14);
    if (perfect) actor.notify('perfect');
    if (reflect) actor.notify('reflect');
  }

  const ADD_R = 30;
  function arenaEnemies() {
    const out = [];
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
    if (!inArena() || id == null || id === 'boss') return inArena() ? { x: raid.bossDraw.x, y: raid.bossDraw.y } : null;
    const a = raid.adds.get(id);
    return a ? { x: a.x, y: a.y } : null;
  }
  function enemyPos() {
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
  function lockedTarget() {
    if (lockedEnemy == null) return null;
    if (inArena()) {
      if (lockedEnemy === 'boss') return raid.boss.u ? null : { x: raid.bossDraw.x, y: raid.bossDraw.y, r: FIGHT.BOSS_R * 0.9, name: raid.def.name, hp: raid.boss.hp, mx: raid.boss.mx, boss: true };
      const a = raid.adds.get(lockedEnemy);
      return a ? { x: a.x, y: a.y, r: ADD_R, name: a.enr ? 'Enraged Spiderling' : 'Spiderling', hp: a.hp, mx: a.mx } : null;
    }
    const d = lockedDummy();
    return d ? { x: d.x, y: d.y, r: 22, name: d.spar ? 'Sparring Dummy' : 'Training Dummy', hp: 1, mx: 1, dummy: true } : null;
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
  function updateTargetFrame() {
    const t = started && !panelOpen() ? lockedTarget() : null;
    const key = t ? `${t.name}|${t.dummy ? '' : Math.round(1000 * t.hp / Math.max(1, t.mx))}` : '';
    if (key === tfKey) return;
    tfKey = key;
    targetFrame.classList.toggle('hidden', !t);
    if (!t) return;
    const f = t.dummy ? 1 : clamp(t.hp / Math.max(1, t.mx), 0, 1);
    targetFrame.innerHTML = `<b>${t.name}</b><div class="tf-bar"><i style="width:${(f * 100).toFixed(1)}%"></i><span>${t.dummy ? '∞' : (f * 100).toFixed(1) + '%'}</span></div>`;
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
    const label = { perfect: ['Perfect!', '#ffe27a'], reflect: ['Reflect!', '#e0d4ff'], overheat: ['Overheat', '#ff6a3a'], lag: ['Time Lag', '#9ab8c0'], frostbite: ['Frostbite', '#9ad8ff'], riposte: ['Riposte!', '#e8fff8'] }[name];
    if (label) FX.text(x, y - 62, label[0], label[1], 17, 1.1);
    playKitFx(player, name, true, data);
    Net.send(Object.assign({ t: 'kfx', k: name, s: scene === 'arena' ? 1 : 0 }, data ? { d: data } : null));
  }
  function playKitFx(ent, name, mine, data) {
    const f = KIT_VFX[name];
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
    if (amDead() || (inArena() && raid.state !== 'live' && raid.state !== 'countdown')) return;
    if (i === 6) { doDash(); return; }
    if (i === 7) { doTaunt(); return; }
    actor.press(i);
  }

  // A tank's taunt (T): an oGCD outside the kit. It waits out a short animation lock (like a queued press), never
  // fires mid-cast, and goes to the enemy you're aiming at (locked, else nearest in reach). The host applies it.
  let tauntQueued = false;
  function doTaunt() {
    if (!actor.taunt || !player.cls) return;
    const k = actor.kit, lock = k.lockUntil - now;
    if (k.cast || !actor.tauntReady(now)) { kitFail(k.cast ? 'Not ready' : null); return; }
    if (lock > 0) { if (lock <= ENGINE.QUEUE_WINDOW && !tauntQueued) { tauntQueued = true; later(lock, () => { tauntQueued = false; if (actor && !amDead()) doTaunt(); }); } return; }
    const tg = world.findEnemy(actor, { range: TAUNT.range });
    if (!tg) { kitFail(inArena() && (raid.boss.u || raid.state !== 'live') ? 'No target' : 'Out of range'); return; }
    actor.useTaunt(now);
    k.lockUntil = now + TAUNT.lock;
    const at = tg.dummy ? tg.dummy : (inArena() ? enemyNow(tg.id) : null) || tg;
    playTaunt(player, at, true);
    if (inArena()) sendCombat({ type: 'taunt', tgt: tg.id });   // the host shows it to everyone else ('fev' taunt)
    else Net.send({ t: 'kfx', k: 'taunt', s: 0 });
  }
  function kitFail(text) {
    if (!text || now - failAt < 0.6) return;
    failAt = now;
    FX.text(player.x, player.y - 56, text, '#c8c0d8', 12, 0.7);
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
    Net.send({ t: 'cast', i: 6, x: rnd(player.x), y: rnd(player.y), tx: rnd(dest.x), ty: rnd(dest.y), s: scene === 'arena' ? 1 : 0, c: +now.toFixed(3) });
  }

  // ---------------------------------------------------------------- the raid (client side; every player)
  let raid = null;
  // host only
  let raidHost = null, hostRoster = [], stopHostTick = null, lastRaidOpts = { mode: 'normal', fill: true, boss: 'grubnak' };

  const RAID_DEFS = { grubnak: GRUBNAK, skitterra: SKITTERRA, volkar: VOLKAR, hollowking: HOLLOWKING };
  // a raid id is a boss id, or 'trial:<spec>' for a specialization trial (trials.js)
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

  function startRaid(mode, fill, bossId = lastRaidOpts.boss) {
    if (!Net.isHost || !player.cls) return;
    stopRaidHost();
    hostTrial = null;
    const def = RAID_DEFS[bossId] || GRUBNAK;
    lastRaidOpts = { mode, fill, boss: def.id };
    const humans = raidHumans();
    const spawns = {};
    ARENA.use(def.id);
    const sr = Math.min(360, ARENA.inner - 60);   // a ring below the boss, clear of the walls
    humans.forEach((h, i) => { const a = Math.PI / 2 + (i - (humans.length - 1) / 2) * 0.35; spawns[h.id] = [rnd(Math.cos(a) * sr), rnd(Math.sin(a) * sr)]; });
    hostRoster = humans.map(h => Object.assign({}, h, { spawn: spawns[h.id] }));
    const bond = bondCounts(humans);   // gear party bonuses, fixed for the fight (gear is locked inside a raid)
    raidHost = new RaidHost({ def, mode, humans: hostHumans, bots: fill ? pickBots(humans) : [], seed: (Math.random() * 1e9) | 0, emit: m => Net.broadcastAll(m), bond: partyBonus(bond) });
    const roster = [...humans, ...raidHost.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role, bot: true }))];
    for (const b of raidHost.bots) spawns[b.id] = [rnd(b.x), rnd(b.y)];
    Net.broadcastAll({ t: 'raid', boss: def.id, mode, roster, spawns, bond });
    // tick the fight off a worker timer so it keeps running if the host's tab is in the background
    let lastT = performance.now(), endedAt = null;
    stopHostTick = Net.steadyInterval(() => {
      if (!raidHost) return;
      const t = performance.now();
      let dt = Math.min(0.25, (t - lastT) / 1000); lastT = t;
      while (dt > 0) { const step = Math.min(0.05, dt); raidHost.tick(step); dt -= step; }
      const st = raidHost.sim.state;
      if (st === 'clear' && !endedAt) hostRollLoot();
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
  // ---- loot: a clear drops a chest; the humans in the run roll Need / Greed / Pass on it (loot.js), and the host
  // pays everyone the clear's gold with it. Wipes and trials drop nothing.
  function hostRollLoot() {
    if (hostTrial) return;   // a trial is a memory: nothing drops
    const humans = hostRoster.filter(h => !h.left && h.cls).map(h => [h.id, h.cls]);
    if (humans.length) Loot.hostOpen(lastRaidOpts.boss, lastRaidOpts.mode, humans);
  }
  Loot.init({
    broadcast: m => Net.broadcastAll(m),
    send: m => (Net.isHost ? Loot.hostChoice(Net.id, m) : Net.send(m)),
    myId: () => Net.id,
    nameOf: id => (id === Net.id ? 'You' : (remotes.get(id) || {}).name || 'Someone'),
    inRaid: () => scene === 'arena',
    addItem: key => {
      const inst = Inventory.add(key);
      if (scene === 'arena') VFX.burst(player.x, player.y, { color: Inventory.rarityColor(inst), color2: '#ffffff', n: 22, speed: 240 });
    },
    addGold: n => Inventory.addGold(n),
    iconURL: key => Inventory.iconURL({ key }),
    itemTip: (key, cls) => {
      const inst = { key }, l = cls ? Inventory.loadout(cls) : {}, s = cls && slotsFor(inst).find(x => canEquip(inst, cls, x));
      return Inventory.itemTip(inst, cls, s ? l[s] : null);
    },
  });
  Net.on('chest', m => Loot.onChest(m));
  Net.on('lootw', m => Loot.onWin(m));
  Net.onHost('lootc', (pid, m) => Loot.hostChoice(pid, m));
  // combat events from other players
  const EV_TYPES = new Set([...SIM_EVENTS]);
  Net.onHost('cev', (pid, msg) => {
    if (!raidHost || !hostRoster.some(h => h.id === pid && !h.left)) return;
    const ev = msg.ev;
    if (!ev || !EV_TYPES.has(ev.type)) return;
    for (const k of ['amount', 'pct', 'value', 'dur', 'secs', 'ticks', 'interval', 'threat', 'r', 'not']) if (ev[k] !== undefined && !Number.isFinite(ev[k])) return;
    if (ev.tgt !== undefined && typeof ev.tgt !== 'string') return;
    raidHost.onPlayerEvent(pid, ev);
  });
  Net.onHost('rleave', pid => {
    const h = hostRoster.find(x => x.id === pid);
    if (h) { h.left = true; if (raidHost) raidHost.sim.removePlayer(pid); }
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
    const def = raidDef(msg.boss);
    if (!def || !msg.roster.some(r => r.id === Net.id)) {
      if (scene === 'town' && def && !def.trial) toast(`Your party went into the raid: ${def.name}.`);
      return;
    }
    closePanels();
    RaidUI.hideResults();
    FX.clear(); VFX.clear();
    ARENA.use(def.id);
    sceneFade();
    const sp = def.spawn || { x: 0, y: -40 };
    raid = {
      def, mode: msg.mode, roster: msg.roster, rosterIds: new Set(msg.roster.map(r => r.id)),
      state: 'countdown', countdownEnd: now + 8, fightTime: 0,
      boss: { x: sp.x, y: sp.y, f: Math.PI / 2, hp: 1, mx: 1, u: 0, v: 0, tg: null },
      bossDraw: { x: sp.x, y: sp.y, f: Math.PI / 2, st: newSt(), lastX: sp.x, lastY: sp.y, fade: 1 },
      bossTrack: new Track(sp.x, sp.y, Math.PI / 2), ghosts: [],
      // Volkar: everyone's charge, rods left standing, turning storm walls, and the closing edge's warning
      pol: new Map(), posts: new Map(), sweeps: new Map(), edgeWarn: null,
      // the Hollow King: lanterns, who is doomed (and until when), his Echo Knights, and how dark the Long Night is
      lanterns: [], doom: new Map(), knights: new Map(), night: false, nightK: 0,
      fightClock: new SendClock(), botClock: new SendClock(),   // the host's fight and bot clocks (see interp.js)
      nextAutoAt: 0, cast: null, props: {}, propsUntil: {},
      tgs: new Map(), puddles: new Map(), party: new Map(), bots: new Map(), pbuffs: [], taken: [], result: null, resultAt: 0,
      adds: new Map(), tethers: new Map(), zones: new Map(), lunges: [], husks: [], eggs: null,
      rollers: new Map(), reels: new Map(),
      bond: partyBonus(msg.bond),   // the gear party bonus the host counted for this fight
      room: ArenaView.newRoom(),    // the room's props and floor state (host-owned, 'props' / 'propfx' / 'roomev')
    };
    player.reel = null;
    lockedEnemy = null;
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
    town.meter = null; town.meterDone = null; RaidUI.meter(null);
    player.target = null; player.interact = null; player.dashMove = null; player.kb = null; player.angle = -Math.PI / 2;
    lockedAlly = null; lastEnemy = null;
    makeActor();
    RaidUI.resetRoster();
    RaidUI.setRoster(msg.roster);
    applyFrameDock();
    RaidUI.show(true);
    setSceneUI();
    updateCamera(0, true);
    lastSentKey = '';
  }

  function leaveRaid(byMe) {
    if (byMe) {
      if (Net.isHost) { Net.broadcastAll({ t: 'raidend' }); return; }  // the host leaving ends it for everyone
      Net.send({ t: 'rleave' });
    }
    if (Net.isHost) { stopRaidHost(); hostRoster = []; }
    if (scene !== 'arena') return;
    if (trialPrevSpec !== undefined) {
      player.spec = trialPrevSpec; trialPrevSpec = undefined;
      if (player.cls) Net.send({ t: 'cls', id: player.cls.id, spec: player.spec });
    }
    raid = null;
    scene = 'town';
    sceneFade();
    FX.clear(); VFX.clear();
    RaidUI.show(false);
    RaidUI.hideResults();
    player.x = TOWN.portal.x + (Math.random() - 0.5) * 80; player.y = TOWN.portal.y + TOWN.portal.r + 30;
    player.target = null; player.dashMove = null; player.kb = null;
    lockedAlly = null; lockedEnemy = null;
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
  // the key line at the bottom (tanks also get their taunt key)
  function updateHelp() {
    const tauntKey = player.cls && player.cls.role === 'tank' ? ' · <kbd>T</kbd> taunt' : '';
    const hurtKey = healerish() ? ' · <kbd>&#96;</kbd> most hurt' : '';
    $('help').innerHTML = scene === 'arena'
      ? `<kbd>Right-click</kbd> move · <kbd>Left-click</kbd> ally or frame to target · <kbd>1</kbd>-<kbd>4</kbd> target party${hurtKey} · <kbd>Shift</kbd>+skill on yourself · <kbd>Space</kbd> dash${tauntKey}`
      : `<kbd>Right-click</kbd> move · <kbd>Left-click</kbd> interact · <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd><kbd>D</kbd><kbd>F</kbd> skills · <kbd>Space</kbd> dash${tauntKey} · <kbd>Enter</kbd> chat`;
  }

  function clampArena(e) {
    ARENA.clamp(e, 12);
    if (raid) {
      PROPS.collide(e, raid.room.props, 12);   // solid props: casks, pillars, stones...
      const b = raid.boss, dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy), min = FIGHT.BOSS_R * 0.75;
      if (d < min && d > 0.01) { e.x = b.x + dx / d * min; e.y = b.y + dy / d * min; }
    }
  }

  // --- messages from the host's fight
  Net.on('raid', enterArena);
  Net.on('raidend', () => {
    if (!Net.isHost && raid && (raid.state === 'live' || raid.state === 'countdown')) toast('The host ended the raid.');
    leaveRaid(false);
  });
  Net.on('fight', msg => {
    if (!raid) return;
    if (msg.s === 'live') { raid.state = 'live'; return; }
    raid.state = msg.s; raid.result = msg; raid.resultAt = now + 2.2;
    fadeTelegraphs(); raid.tethers.clear(); raid.lunges = []; raid.eggs = null; raid.rollers.clear(); raid.reels.clear(); player.reel = null;
    raid.sweeps.clear(); raid.edgeWarn = null; for (const p of raid.posts.values()) p.end = Math.min(p.end, now + 1);
    raid.doom.clear(); raid.lanterns = raid.lanterns.filter(l => l.last); for (const k of raid.knights.values()) k.gone = k.gone || now;
    if (msg.s === 'clear') raid.night = false;   // the Long Night lifts when he falls
    for (const z of raid.zones.values()) z.end = Math.min(z.end, now + 1);
    if (actor && actor.kit.cast) actor.kit.cast = null;
    FX.shake = 8;
    if (msg.s === 'clear' && player.cls && raid.def.trial) {
      Save.recordTrial(player.cls.id, raid.def.trial);
      trialPrevSpec = raid.def.trial;   // you leave the memory wearing the spec you just earned
      Save.setSpec(player.cls.id, raid.def.trial);
      const sp = specOf(player.cls.id, raid.def.trial);
      if (sp) { heroPickFx(player, { accent: sp.accent }); toast(`${sp.name} unlocked.`); }
    } else if (msg.s === 'clear' && player.cls) Save.recordClear(player.cls.id, raid.def.id, raid.mode);
    if (msg.s === 'clear') BOSS_VFX.victory([...raid.rosterIds].map(entById).filter(Boolean));
    else BOSS_VFX.wipe();
  });
  Net.on('fb', msg => {
    if (!raid) return;
    Object.assign(raid.boss, { x: msg.x, y: msg.y, f: msg.f, hp: msg.hp, mx: msg.mx, u: msg.u, v: msg.v, tg: msg.tg });
    raid.bossTrack.push(raid.fightClock.map(msg.c, now), msg.x, msg.y, msg.f);
    raid.lastFb = performance.now();   // for the debug overlay
    raid.fightTime = msg.ft;
    if (msg.na != null) raid.nextAutoAt = now + msg.na;
    raid.bossStatus = Array.isArray(msg.bs) ? msg.bs : [];   // what's on the boss (fight.js bossStatus)
  });
  // the boss's next moves, from the host about once a second: [[name, seconds until], ...] (drawn under the cast bar)
  Net.on('bnext', msg => {
    if (!raid) return;
    raid.bnext = Array.isArray(msg.l) ? { at: now, l: msg.l.filter(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isFinite(e[1])).slice(0, 3) } : null;
  });
  Net.on('fps', msg => {
    if (!raid) return;
    const listed = new Set();
    for (const [id, hp, maxHp, shield, alive, dd, vuln, mit, weak, debuffs, threat, hots] of msg.ps) {
      listed.add(id);
      const s = raid.party.get(id);
      if (s) Object.assign(s, { hp, maxHp, shield, alive: !!alive, dd, vuln, mit, weak, debuffs, threat: threat || 0, hots: hots || [], left: false });
    }
    // the host stops listing anyone who left the raid; don't leave their last numbers frozen on the frames
    for (const [id, s] of raid.party) if (!listed.has(id) && !s.left) Object.assign(s, { left: true, alive: false, hp: 0, shield: 0, hots: [], debuffs: [] });
  });
  Net.on('tg', msg => {
    if (!raid) return;
    raid.tgs.set(msg.id, Object.assign({}, msg, { start: now, live: Object.assign({}, msg.shape) }));
  });
  Net.on('tgx', msg => {
    if (!raid) return;
    const tg = raid.tgs.get(msg.id);
    if (!tg || tg.gone != null) return;
    tg.gone = now;
    BOSS_VFX.impact(tg, msg, { entById, boss: raid.def.id, pol: raid.pol, units: raidUnits() });
    if (msg.hits && msg.hits.includes(Net.id) && tg.type === 'aoe') FX.shake = Math.max(FX.shake, 5);
  });
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
    raid.cast = { name: msg.name, dur: msg.dur, start: now };
    BOSS_VFX.castStart(raid.def.id, msg.anim, msg.dur, raid.bossDraw);
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
      case 'flop': prop('flop', true, end + 0.2); if (msg.then) prop('next', msg.then, end + 0.3); break;
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
    }
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
    else if (msg.name === 'leap') later(msg.dur || 0.6, () => raid && BOSS_VFX.leap(raid.boss.x, raid.boss.y));
    else if (msg.name === 'gorge' || msg.name === 'roar') { st.action = { type: 'attack', t0: now, dur: 1.4 }; BOSS_VFX.roar(raid.boss.x, raid.boss.y, raid.def.id); }
    else if (msg.name === 'wrap') { raid.props.silk = true; raid.propsUntil.silk = now + msg.dur + 0.3; }
    else if (msg.name === 'field') { raid.props.charge = true; raid.propsUntil.charge = now + msg.dur + 0.3; }
  });
  // --- adds, tethers, zones and Skitterra's legs (all host-driven)
  Net.on('adds', msg => {
    if (!raid) return;
    const seen = new Set(), at = raid.fightClock.map(msg.c, now);
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
      case 'spawn': BOSS_VFX.addSpawn(msg.x, msg.y); break;
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
  Net.on('eggs', msg => { if (raid) raid.eggs = { pts: msg.pts, start: now, end: now + msg.dur }; });
  // Rolling Meatballs: one message each; every client rolls them on its own clock
  Net.on('roll', msg => {
    if (!raid) return;
    if (msg.clear) { raid.rollers.clear(); return; }
    raid.rollers.set(msg.id, { x: msg.x, y: msg.y, a: msg.a, sp: msg.sp, r: msg.r, delay: msg.delay, start: now, tag: msg.tag });
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
  // the room: props and floor state (the whole list), a prop chipped / broken / slammed into, and room moments
  Net.on('props', msg => { if (raid) ArenaView.roomProps(raid.room, msg, now); });
  Net.on('propfx', msg => { if (raid) BOSS_VFX.propFx(msg, raid.room, entById); });
  Net.on('roomev', msg => { if (raid) ArenaView.roomEvent(raid.room, msg, now, entById); });

  // --- the Hollow King
  // lanterns: [id, x, y, carrier, last]; a carried one is drawn in its carrier's hands
  Net.on('lant', msg => { if (raid && Array.isArray(msg.l)) raid.lanterns = msg.l.map(([id, x, y, carrier, last]) => ({ id, x, y, carrier, last: !!last })); });
  Net.on('doomed', msg => {
    if (!raid) return;
    for (const id of msg.ids || []) { raid.doom.set(id, { start: now, end: now + (msg.dur || 14) }); const e = entById(id); if (e) BOSS_VFX.doomed(e); }
  });
  Net.on('cure', msg => { if (!raid) return; raid.doom.delete(msg.id); const e = entById(msg.id); if (e) BOSS_VFX.cure(e); });
  Net.on('gazed', msg => { const e = raid && entById(msg.id); if (e) BOSS_VFX.gazed(e); });
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
    if (!raid || msg.id !== Net.id) return;
    const a = Math.atan2(player.y - msg.y, player.x - msg.x);
    const dest = { x: player.x + Math.cos(a) * msg.d, y: player.y + Math.sin(a) * msg.d };
    clampArena(dest);
    PROPS.clipMove(player, dest, raid.room.props, 14);   // a throw stops at a solid prop
    player.kb = { sx: player.x, sy: player.y, tx: dest.x, ty: dest.y, t0: now };
    player.dashMove = null; player.target = null;
  });
  Net.on('pdmg', msg => {
    if (!raid) return;
    // party frames react to the hit right away instead of waiting for the next party update
    const ps = raid.party.get(msg.id);
    if (ps && msg.hp != null) { ps.hp = msg.hp; if (msg.a > 0) ps.hitAt = now; }
    if (msg.id !== Net.id) return;
    raid.taken.push({ t: now, a: msg.a });
    if (msg.a > 0) FX.text(player.x, player.y - 46, '-' + rnd(msg.a), msg.dd ? '#ff4a3a' : '#ff8a7a', msg.a > 400 ? 18 : 14);
    if (msg.dd) FX.shake = Math.max(FX.shake, 4);
  });
  Net.on('fev', msg => {
    if (!raid) return;
    const e = entById(msg.id);
    if (msg.k === 'death' && e) BOSS_VFX.playerDeath(e);
    if (msg.k === 'death') raid.doom.delete(msg.id);
    if (msg.k === 'raised' && e) BOSS_VFX.playerRaised(e);
    if (msg.k === 'brandHit') { VFX.setScale(msg.id === Net.id ? 1 : 0.6); try { KIT_VFX.brandHit(e, { x: raid.boss.x, y: raid.boss.y }); } finally { VFX.setScale(1); } }
    if (msg.k === 'taunt' && e && msg.id !== Net.id) playTaunt(e, enemyNow(msg.tg), false);   // (your own played when you pressed it)
    if (msg.id !== Net.id || !actor) return;
    if (msg.k === 'perfect') actor.notify('perfect');
    if (msg.k === 'reflect') actor.notify('reflect');
    if (msg.k === 'shieldEnd') actor.notify('shieldEnd', msg);
    if (msg.k === 'death') { actor.kit.cast = null; actor.kit.queued = null; player.target = null; player.dashMove = null; }
  });
  Net.on('pbuff', msg => {
    if (!raid) return;
    raid.pbuffs.push({ kind: msg.kind, value: msg.value, end: now + msg.dur });
    const e = entById(msg.from);
    if (e) BOSS_VFX.partyBuff(e);
  });
  Net.on('bots', msg => {
    if (!raid) return;
    const at = raid.botClock.map(msg.c, now);
    for (const [id, x, y, a, m] of msg.b) {
      const b = raid.bots.get(id);
      if (!b) continue;
      if (!b.track) b.track = new Track(b.x, b.y, b.angle);
      b.track.push(at, x, y, a);
      b.tx = x; b.ty = y; b.ta = a; b.m = m;
    }
  });

  // ---------------------------------------------------------------- input
  const mouse = { x: 0, y: 0, rightDown: false };
  const mouseWorld = () => ({ x: mouse.x / zoom + cam.x, y: mouse.y / zoom + cam.y });

  function hoverTarget() {
    if (scene !== 'town') return null;
    const m = mouseWorld();
    let best = null, bd = Infinity;
    for (const it of interactables) {
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

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (mouse.rightDown && !player.dashMove) moveTo(mouseWorld(), false);
  });
  canvas.addEventListener('mousedown', e => {
    if (!started) return;
    // clicking the world takes keyboard focus back from any UI button
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (e.button === 2) { mouse.rightDown = true; player.interact = null; moveTo(mouseWorld(), true); return; }
    if (e.button !== 0) return;
    const it = hoverTarget();
    if (it) { player.interact = it; player.target = { x: it.x, y: it.y }; return; }
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
  window.addEventListener('mouseup', e => { if (e.button === 2) mouse.rightDown = false; });
  document.addEventListener('mouseover', e => { const row = e.target.closest && e.target.closest('.pf'); hoverFrame = row ? Number(row.dataset.id) : null; });

  const chatInput = $('chat-input');
  const SLOT_OF = { q: 0, w: 1, e: 2, r: 3, d: 4, f: 5, ' ': 6, t: 7 };   // 7: a tank's taunt
  window.addEventListener('keydown', e => {
    if (!started) return;
    // Tab never moves browser focus once you're in the game; it cycles enemy targets instead
    if (e.key === 'Tab') {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement !== chatInput) document.activeElement.blur();
      if (!panelOpen() && document.activeElement !== chatInput) cycleTarget(e.shiftKey ? -1 : 1);
      return;
    }
    if (document.activeElement === chatInput) {
      if (e.key === 'Enter') { sendChat(chatInput.value); chatInput.value = ''; chatInput.blur(); chatInput.classList.add('hidden'); }
      if (e.key === 'Escape') { chatInput.value = ''; chatInput.blur(); chatInput.classList.add('hidden'); }
      return;
    }
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'Escape') { if (selOpen()) selBack(); else if (panelOpen()) closePanels(); else { lockedAlly = null; lockedEnemy = null; } return; }
    if (e.key.toLowerCase() === 'i' && !selOpen() && overlay.classList.contains('hidden')) { TalentPanel.close(); Inventory.toggle(); return; }
    if (e.key.toLowerCase() === 'n' && started && !selOpen() && overlay.classList.contains('hidden')) {
      if (TalentPanel.isOpen()) TalentPanel.close(); else openTalents();
      return;
    }
    if (panelOpen()) return;
    if (e.key === 'Enter') { chatInput.classList.remove('hidden'); chatInput.focus(); e.preventDefault(); return; }
    if (e.code === 'Backquote') { e.preventDefault(); lockMostHurt(); return; }
    if (/^[1-4]$/.test(e.key)) {
      const list = partyOrder();
      const pick = list[Number(e.key) - 1];
      if (pick != null) lockedAlly = pick;
      return;
    }
    const idx = SLOT_OF[e.key.toLowerCase()];
    if (idx !== undefined) {
      e.preventDefault();
      if (e.repeat && idx >= 6) return;
      // a kit's own Shift move (the Apothecary moves its pick along the bandolier with Shift+R)
      if (e.shiftKey && idx < 6 && actor && actor.kit.def.shiftPress) { if (e.repeat) return; if (actor.kit.def.shiftPress(actor.kit, idx)) return; }
      if (e.shiftKey && idx < 6 && actor && actor.abilities[idx].target === 'ally') selfCast = { i: idx, until: now + ENGINE.QUEUE_WINDOW + 0.3 };
      else if (!e.repeat && selfCast && selfCast.i === idx) selfCast = null;
      pressSlot(idx);
    }
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
    VFX.update(now, dt);
    runTimers();
    updatePlayer(dt);
    if (actor) actor.update();
    sendPos();
    updateRemotes(dt);
    if (scene === 'town') updateTown(dt); else updateArena(dt);
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
        const slow = (actP(player.st, 'brace') >= 0 ? 0.4 : 1) * (myDebuff('slowed') ? FIGHT.SLOWED : 1) * (reeled ? 0.4 : 1) * windLaneBoost(player.x, player.y, dx, dy, FX.now);   // a Driftblade's Slipstream lane
        const step = Math.min(d, MOVE_SPEED * slow * dt);
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
    if (inPortal && !wasInPortal) openBossPanel(BOSSES[0]);
    wasInPortal = inPortal;
  }

  // send our position ~12 times a second when it changes
  function sendPos() {
    if (!Net.online || now - lastSent < 1 / 12) return;
    const s = scene === 'arena' ? 1 : 0;
    const key = `${rnd(player.x)},${rnd(player.y)},${player.angle.toFixed(2)},${player.st.moving ? 1 : 0},${rnd(player.lift)},${s}`;
    if (key !== lastSentKey) {
      Net.send({ t: 'pos', x: rnd(player.x), y: rnd(player.y), a: +player.angle.toFixed(2), m: player.st.moving ? 1 : 0, l: rnd(player.lift), s, c: +now.toFixed(3) });
      lastSentKey = key;
    }
    lastSent = now;
  }

  // other players and bots: drawn slightly in the past, blended between their updates (see interp.js)
  function easeEnt(r, dt) {
    r.st.t = now;
    if (!r.track) r.track = new Track(r.x, r.y, r.angle);
    const p = r.track.at(now), ox = r.x, oy = r.y;
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
      if (now > b.nextAct) {
        b.st.action = { type: 'attack', t0: now, dur: BOSS_ATTACK_DUR };
        b.nextAct = now + 6 + Math.random() * 3;
        FX.later(BOSS_ATTACK_DUR * 0.5, () => bossImpact(b));
      }
    }
    for (const d of dummies) {
      d.st.t = now;
      if (!d.spar) continue;
      const near = Math.hypot(player.x - d.x, player.y - d.y) < 140 && actor;
      if (!near) { d.nextSwing = 0; continue; }
      if (!d.nextSwing) d.nextSwing = now + 1.5;
      if (now >= d.nextSwing - 0.6 && !d.windup) d.windup = d.nextSwing;
      if (now >= d.nextSwing) { d.st.hit = now; d.windup = 0; d.nextSwing = now + FIGHT.AUTO_EVERY; sparHit(d); }
    }
    town.buffs = town.buffs.filter(b => b.end > now);
    if (town.shield && town.shield.end <= now) endTownShield();
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
    const bp = raid.bossTrack.at(now);
    bd.x = bp.x; bd.y = bp.y;
    let df = bp.a - bd.f; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
    bd.f += df * Math.min(1, dt * 9);
    bd.fade += ((b.u ? 0.55 : 1) - bd.fade) * Math.min(1, dt * 5);   // fades out and back in when untargetable
    bd.st.t = now; bd.st.raid = true;
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
    // telegraphs that follow players or track the tank
    for (const [id, tg] of raid.tgs) {
      const end = tg.start + tg.dur;
      // a resolved telegraph stays put and fades out (ArenaView / BossTells read tg.gone)
      if (tg.gone != null) { if (now > tg.gone + TG_FADE) raid.tgs.delete(id); continue; }
      if (tg.follow != null && now < end - (tg.lockAt || 0)) { const e = entById(tg.follow); if (e) { tg.live.x = e.x; tg.live.y = e.y; } }
      if (tg.aim != null && now < end - (tg.lockAt || 0.6)) {
        const e = entById(tg.aim);
        tg.live.x = bd.x; tg.live.y = bd.y;
        if (e) tg.live.angle = Math.atan2(e.y - bd.y, e.x - bd.x);
      }
      if (now > end + 1.5) raid.tgs.delete(id);
    }
    for (const [id, p] of raid.puddles) if (now > p.end) raid.puddles.delete(id);
    for (const a of raid.adds.values()) {
      const ox = a.x, oy = a.y, ap = a.track.at(now);
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
    raid.taken = raid.taken.filter(x => x.t > now - 10);
    if (raid.cast && now > raid.cast.start + raid.cast.dur + 0.3) raid.cast = null;
    if (raid.result && raid.resultAt && now >= raid.resultAt) {
      raid.resultAt = 0;
      RaidUI.showResults(raid.result, raid, Net.id, actor ? { stats: actor.kit.stats, cls: player.cls } : null, Net.isHost, {
        retry: () => raid.def.trial ? startTrial(raid.def.trial) : startRaid(lastRaidOpts.mode, lastRaidOpts.fill),
        town: () => Net.broadcastAll({ t: 'raidend' }),
        leave: () => leaveRaid(true),
      });
      Loot.reveal();   // the chest's cards come up with the results
    }
    RaidUI.update(raid, now, Net.id, frameMarks());
  }

  function updateCamera(dt, snap) {
    if (snap) dt = 10;  // jump straight there (scene changes)
    if (scene === 'arena') {
      // About 82% of the arena's height fits on screen. The camera leans toward you but stops where the rim
      // would leave empty space at the screen edge, so as much of the room as possible stays in view.
      zoom = clamp(Math.min(W, H) / 960, 0.55, 1.1);
      const vw = W / zoom, vh = H / zoom;
      // lo / hi: screen margins (px) you're never pushed into, so you never stand under the ability bar or boss plate
      const lean = (p, v, size, lo, hi, edge) => {
        const lim = Math.max(0, edge - v / 2);
        let c = clamp(p * 0.8, -lim, lim);
        c = Math.max(c, p + v / 2 - (size - hi) / zoom);
        c = Math.min(c, p + v / 2 - lo / zoom);
        return c;
      };
      // the room's own width and height decide how far the camera can lean each way
      // (far enough past the walls to show the scenery there: the stoves, shelves and pillars)
      const tx = lean(player.x, vw, W, 60, 60, ARENA.hw + 100) - vw / 2, ty = lean(player.y, vh, H, 150, 190, ARENA.hh + 110) - vh / 2;
      cam.x += (tx - cam.x) * Math.min(1, dt * 6);
      cam.y += (ty - cam.y) * Math.min(1, dt * 6);
      return;
    }
    zoom = 1;
    const tx = clamp(player.x - W / 2, 0, Math.max(0, WORLD.w - W));
    const ty = clamp(player.y - H / 2, 0, Math.max(0, WORLD.h - H));
    cam.x += (tx - cam.x) * Math.min(1, dt * 8);
    cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    if (W > WORLD.w) cam.x = (WORLD.w - W) / 2;
    if (H > WORLD.h) cam.y = (WORLD.h - H) / 2;
  }

  function bossImpact(b) {
    const style = { grubnak: ['#d8b07a', 70], skitterra: ['#9dff6a', 60], volkar: ['#7fe8ff', 85], hollowking: ['#6dff9a', 75] }[b.boss.id];
    const x = b.x + Math.cos(b.angle) * 50, y = b.y + Math.sin(b.angle) * 50;
    FX.add({ type: 'ring', x, y, r: style[1], color: style[0], dur: 0.6 });
    if (scene === 'town' && Math.hypot(player.x - b.x, player.y - b.y) < 350) FX.shake = Math.max(FX.shake, 4);
  }

  // ---------------------------------------------------------------- rendering
  function drawEntity(e) {
    switch (e.kind) {
      case 'hero': drawHero(ctx, e.cls, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'keeper': drawKeeper(ctx, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'trainer': drawTrainer(ctx, e.x, e.y, e.angle, e.st, HERO_SCALE); break;
      case 'boss': drawBoss(ctx, e.boss, e.x, e.y, e.angle, e.st, BOSS_SCALE); break;
      case 'dummy': drawDummy(ctx, e.x, e.y, e.st, HERO_SCALE); break;
      case 'player': case 'remote': {
        const dead = inArena() && raid.party.get(e.id === undefined ? Net.id : e.id) && !raid.party.get(e.id === undefined ? Net.id : e.id).alive;
        if (dead) { ctx.save(); ctx.globalAlpha = 0.4; }
        drawHero(ctx, e.cls, e.x, e.y, e.angle, dead ? { t: 0, moving: false, action: null } : e.st, heroScale(), { lift: e.lift, spec: e.spec });
        if (dead) ctx.restore();
        break;
      }
    }
  }

  function playerTag(e, isMe, hp) {
    const y = e.y - (e.lift || 0) - (e.cls ? 36 : 26) * heroScale() / HERO_SCALE;
    const color = e.cls ? ROLES[e.cls.role].color : '#dffaff';
    label(ctx, e.name + (isMe ? ' (you)' : ''), e.x, y, isMe ? '#fff3d8' : color, 12);
    if (hp && !isMe) {
      // over-head bar: health, then any shield in pale white after it
      const w = 44, f = hp.maxHp ? clamp(hp.hp / hp.maxHp, 0, 1) : 0, sf = hp.maxHp ? clamp((hp.shield || 0) / hp.maxHp, 0, 1 - f) : 0;
      const x0 = Math.round(e.x - w / 2), y0 = Math.round(y + 4);
      rrect(ctx, x0 - 1, y0 - 1, w + 2, 7, 2, 'rgba(10,8,6,0.85)');
      if (f > 0) rrect(ctx, x0, y0, w * f, 5, 1.5, f < 0.35 ? '#e8503f' : f < 0.7 ? '#c9c45a' : '#5fcf78');
      if (sf > 0) rrect(ctx, x0 + w * f, y0, w * sf, 5, 1.5, 'rgba(236,244,255,0.85)');
    } else if (e.cls && !inArena()) label(ctx, e.cls.name, e.x, y + 12, color, 10);
    if (e.chat && now < e.chatUntil) {
      ctx.font = '600 13px system-ui, sans-serif';
      const tw = Math.min(260, ctx.measureText(e.chat).width) + 18, bx = e.x - tw / 2, by = y - 38;
      rrect(ctx, bx, by, tw, 26, 8, 'rgba(255,250,240,0.95)', OUT, 1.5);
      poly(ctx, [e.x - 6, by + 26, e.x + 6, by + 26, e.x, by + 33], 'rgba(255,250,240,0.95)');
      ctx.fillStyle = '#1a1622'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.chat, e.x, by + 13, 250);
      ctx.textBaseline = 'alphabetic';
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
      kit: k || null, cls: player.cls ? player.cls.id : null,   // your own DoTs on the boss (raid-ui.js boss status)
    };
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

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (scene === 'arena' && raid) renderArena(); else renderTown();
  }

  function renderTown() {
    ctx.fillStyle = '#2d4a22'; ctx.fillRect(0, 0, W, H);
    const sh = FX.shake;
    const sx = sh > 0.3 ? (Math.random() - 0.5) * sh : 0, sy = sh > 0.3 ? (Math.random() - 0.5) * sh : 0;
    const cx = Math.round(cam.x + sx), cy = Math.round(cam.y + sy);
    ctx.translate(-cx, -cy);

    const vx = clamp(cx, 0, WORLD.w), vy = clamp(cy, 0, WORLD.h);
    const vw = Math.min(W, WORLD.w - vx), vh = Math.min(H, WORLD.h - vy);
    if (vw > 0 && vh > 0) ctx.drawImage(townLayer, vx * layerScale, vy * layerScale, vw * layerScale, vh * layerScale, vx, vy, vw, vh);
    drawTownDynamic(ctx, now);

    FX.draw(ctx, true);
    VFX.draw(ctx, 'ground');
    // the sparring dummy winds up before it swings
    for (const d of dummies) if (d.spar && d.windup) {
      const p = clamp(1 - (d.windup - now) / 0.6, 0, 1);
      circle(ctx, d.x, d.y + 4, 20 + p * 30, null, rgba('#ff6a4a', 0.3 + p * 0.6), 2 + p * 2);
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
    const ents = [...lineup, keeper, trainer, ...statues, ...dummies, player, ...townRemotes];
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) drawEntity(e);

    FX.draw(ctx, false);
    VFX.draw(ctx, 'air');
    drawSmoke(ctx, now);

    for (const h of lineup) if (Math.hypot(player.x - h.x, player.y - h.y) < 260 || hov?.label === h.cls.name) label(ctx, h.cls.name, h.x, h.y - (h.labelUp ? 47 : 34), ROLES[h.cls.role].color, 11);
    const bob = Math.sin(now * 4) * 3;
    label(ctx, '!', keeper.x, keeper.y - 40 + bob, '#ffd65a', 26, 'Cinzel, Georgia, serif', 800);
    label(ctx, 'Barkeep', keeper.x, keeper.y - 28 + 6, '#f0d48a', 11);
    label(ctx, 'Trainer', trainer.x, trainer.y - 34, '#f0d48a', 11);
    for (const d of dummies) if (d.spar && Math.hypot(player.x - d.x, player.y - d.y) < 260) label(ctx, 'Sparring Dummy', d.x, d.y - 46, '#ffb0a0', 11);
    for (const r of townRemotes) playerTag(r, false);
    playerTag(player, true);
    if (hov && !hov.label.match(/Barkeep|Trainer/) &&!lineup.some(h => h.cls.name === hov.label)) {
      label(ctx, hov.label, mouseWorld().x, mouseWorld().y - 18, '#ffe9a8', 13);
    }
  }

  function renderArena() {
    ctx.fillStyle = { volkar: '#080b11', hollowking: '#0a0c0e' }[raid.def.id] || '#120d0a'; ctx.fillRect(0, 0, W, H);
    const sh = FX.shake;
    const sx = sh > 0.3 ? (Math.random() - 0.5) * sh : 0, sy = sh > 0.3 ? (Math.random() - 0.5) * sh : 0;
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x + sx, -cam.y + sy);
    ArenaView.drawFloor(ctx, raid.def.id, Math.min(1.5, DPR * zoom));
    ArenaView.drawAmbient(ctx, now);
    ArenaView.drawEdge(ctx, now, raid.edgeWarn);
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
    ArenaView.drawZones(ctx, raid.zones, now);
    ArenaView.drawPuddles(ctx, raid.puddles, now);
    if (raid.eggs) ArenaView.eggs(ctx, raid.eggs.pts, clamp((now - raid.eggs.start) / Math.max(0.1, raid.eggs.end - raid.eggs.start), 0, 1), now);
    const bd = raid.bossDraw;
    const units = raidUnits();
    // things that shelter from Gale Slam: posts, and rods waiting for their bolt
    const covers = [...raid.posts.values()].filter(p => now < p.end).map(p => ({ x: p.x, y: p.y }));
    for (const tg of raid.tgs.values()) if (tg.tag === 'rod' && tg.gone == null) covers.push({ x: tg.live.x, y: tg.live.y });
    const tellEnv = { boss: bd, bossId: raid.def.id, entById, hard: raid.mode === 'hard', pol: raid.pol, units, covers, props: raid.room.props, room: raid.room };
    ArenaView.drawTelegraphs(ctx, raid.tgs, now, tellEnv);
    BossTells.drawRollers(ctx, raid.rollers, now, tellEnv);
    BossTells.drawSweeps(ctx, raid.sweeps, now, tellEnv);
    // the tells' props (cleaver, cloches, jars, whisk) go under every unit too, so nobody is hidden behind a mechanic
    BossTells.air(ctx, raid.tgs, now, tellEnv);
    const ringA = clamp((bd.fade - 0.55) / 0.45, 0, 1);   // the hitbox ring fades with the boss when it goes untargetable
    if (ringA > 0.02) { ctx.save(); ctx.globalAlpha = ringA; ArenaView.drawBossRing(ctx, { x: bd.x, y: bd.y, f: bd.f }); ctx.restore(); }
    // your current add target gets a red ring
    const lt = lockedTarget();
    const tAdd = !lt && lastEnemy && raid.adds.get(lastEnemy.id);
    if (lt) drawReticle(lt);
    else if (tAdd) ellipse(ctx, tAdd.x, tAdd.y + 4, 34, 26, 0, null, rgba('#ff6a5a', 0.5 + Math.sin(now * 6) * 0.2), 2);
    for (const a of raid.adds.values()) { const o = a.link && raid.adds.get(a.link); if (o && a.id < o.id && raid.mode === 'hard') ArenaView.addBeam(ctx, a, o, now); }
    FX.draw(ctx, true);
    VFX.draw(ctx, 'ground');
    drawAllyTarget();
    if (raid.pol.size) ArenaView.polarityAuras(ctx, units, raid.pol, now);

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
    const all = [...ents, bossEnt, ...adds, ...husks, ...posts, ...knights, ...lants, ...roomProps].sort((a, b) => a.y - b.y);
    const bossDef = BOSSES.find(x => x.id === raid.def.id);
    for (const e of all) {
      if (e === bossEnt) {
        ctx.save(); ctx.globalAlpha = bd.fade;
        if (raid.nightK > 0.05) ctx.filter = `brightness(${(1 - 0.55 * raid.nightK).toFixed(2)})`;   // he's a shape in the dark
        if (raid.def.trial) {   // in a trial he's only a memory: pale, cold and not quite there
          ctx.globalAlpha = bd.fade * (0.72 + 0.06 * Math.sin(now * 2.3));
          ctx.filter = 'grayscale(0.7) brightness(1.9) sepia(0.35) hue-rotate(175deg) drop-shadow(0 0 9px #8fa8ff)';
        }
        drawBoss(ctx, bossDef, bd.x, bd.y, bd.f, bd.st, RAID_BOSS_SCALE);
        ctx.restore();
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
      else drawEntity(e);
    }
    // the Hollow King: lanterns held up by whoever carries them, and the Doom sigil over each doomed head
    for (const l of raid.lanterns) { const c = l.carrier != null ? entById(l.carrier) : null; if (c) ArenaView.lantern(ctx, c.x + 14, c.y - (c.lift || 0), now, true, l.last); }
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
    FX.draw(ctx, false);
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
    playerTag(player, true);
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
    for (const b of statues) dot(b.x, b.y, 3.5, '#ff6a5a');
    dot(TOWN.portal.x, TOWN.portal.y, 4.5, '#b080ff');
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
    const s = myState();
    if (inArena() && s) {
      if (s.dd) out.push({ id: 'dd', name: 'Damage Down', left: s.dd, stacks: 1, bad: true });
      if (s.vuln) out.push({ id: 'vuln', name: `Vulnerability +${s.vuln}%`, left: 1, stacks: 1, bad: true });
    }
    // gear party bonuses last the whole fight (no timer)
    if (inArena() && raid.bond) for (const b of raid.bond.active) {
      out.push({ id: 'bond' + b.tier, name: `${b.name} ${b.n}/4`, stacks: 1, bond: true, tip: `${b.name}: ${b.n} in your group wear ${PARTY_BONUS[b.tier].boss} gear. Everyone gets ${b.text}.` });
    }
    return out;
  };

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function setObjective(html) { $('objective').innerHTML = html; }
  function updateHeroName() {
    $('hero-name').innerHTML = player.cls
      ? `<span style="color:${ROLES[player.cls.role].color}">${player.cls.name}</span> · ${player.cls.title}`
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
    overlay.classList.add('hidden'); bossPanel.classList.add('hidden');
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
  const selThumbs = [];
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
    const COMPLEXITY = { 2: 'More moving parts than most', 3: 'Many moving parts' };
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
        const cv = document.createElement('canvas'); setupCanvas(cv, 112, 112);
        b.appendChild(cv);
        // complexity pips: only on the classes that ask more of you (data.js `complexity` 2 or 3)
        const cx = cls.complexity >= 2 ? `<span class="hc-cx" data-tip="${COMPLEXITY[cls.complexity] || COMPLEXITY[3]}">${'<i></i>'.repeat(cls.complexity)}</span>` : '';
        b.insertAdjacentHTML('beforeend', `<span class="hc-text"><b>${cls.name}</b><small>${cls.title}</small><span class="diff">${diamonds(cls.difficulty)}</span></span>${cx}<em class="hc-taken"></em>`);
        Tip.set(b, () => `<b>${cls.name}</b><em>${ROLES[cls.role].name} · ${cls.title}</em>“${cls.tagline}”`);
        b.addEventListener('click', () => { selFromGrid = true; showDetail(cls); });
        grid.appendChild(b);
        selThumbs.push({ cv, cls, b, st: newSt(Math.random() * 3) });
      }
      altar.appendChild(band);
    }
  })();
  // an ability's icon as a CSS background (the taunt layers its own painting over the icon it borrows)
  const abBg = (cls, a) => (a.taunt ? tauntIconBg(cls.id) : `url(${abilityIcon(cls.id, abilityIconId(a))})`);
  // the shared in-game tooltip for an ability
  function abilityTip(cls, a) {
    const icon = a.id ? `<i class="ab-icon ${a.type}" style="background-image:${abBg(cls, a)}"></i>` : '<i class="ab-icon dash">»</i>';
    return `<div class="tip-ab">${icon}<div><b>${a.name}</b><em>${abilityMeta(a)}</em></div></div>${a.desc}`;
  }
  // --- specializations on the hero page: the base class and its two specs as tabs. A spec shows what it
  // specializes in, its passive, and every move it adds or changes (with the move it replaced).
  let selSpec = null;
  function renderSpecBox(cls, kit, rerender) {
    const box = $('sel-spec'), specs = SPECS[cls.id] || [];
    box.classList.toggle('hidden', !specs.length);
    if (!specs.length) return;
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
    box.innerHTML = `<h4>Specialization</h4><div class="spec-tabs">${tabs}</div>${body}`;
    box.querySelectorAll('.spec-tab').forEach(b => b.addEventListener('click', () => { selSpec = b.dataset.spec || null; rerender(); }));
    const tb = box.querySelector('.trial-go');
    if (tb) tb.addEventListener('click', () => {
      if (tb.getAttribute('aria-disabled') || scene !== 'town') return;
      if (player.cls !== cls) chooseHero(cls);
      closePanels();
      startTrial(tb.dataset.spec);
    });
    box.querySelectorAll('.spec-move').forEach(m => { const i = Number(m.dataset.i); Tip.set(m, () => abilityTip(cls, sk.abilities[i])); });
  }
  // under a sealed or trial-ready spec: the trial's name and memory, and the way in once it's open
  function trialCard(cls, spec, state) {
    const T = TRIALS[spec.id];
    if (state === 'open' || !T) return '';
    if (state === 'locked') return `<div class="spec-trial locked"><h5>${T.name}</h5><p>Sealed until this hero has cleared the Hollow King.</p></div>`;
    const host = Net.isHost && scene === 'town';
    return `<div class="spec-trial"><h5>${T.name}</h5><p>${T.lore[0]}</p>
      <button class="cta trial-go" type="button" data-spec="${spec.id}"${host ? '' : ' aria-disabled="true" data-tip="Trials are solo. Begin one from town while you are hosting or playing alone."'}>Begin the trial</button></div>`;
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
    toast(spec ? `You are now a ${spec.name}, ${spec.title}.` : `You are a ${player.cls.name} again.`);
    Net.send({ t: 'cls', id: player.cls.id, spec: player.spec });
  }
  const slotIndex = k => (k === 'space' ? 6 : SLOT_OF[k]);
  function keyChip(cls, k) {
    const i = slotIndex(k), a = i === 6 ? DASH_AB : kitFor(cls.id, selSpec).abilities[i];
    return `<span class="kchip ${a.type}" data-i="${i}">${a.id ? `<i style="background-image:url(${abilityIcon(cls.id, abilityIconId(a))})"></i>` : '<i class="dash">»</i>'}<kbd>${KEYS[i]}</kbd></span>`;
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
    selGrid.classList.add('hidden'); selDetail.classList.remove('hidden');
    loadSpecPortraits(cls.id);
    const kit = KITS[cls.id], guide = HERO_GUIDE[cls.id];
    const tauntAb = tauntAbility(cls.id);   // tanks: the taunt on T after the dash
    const abs = [...kit.abilities, DASH_AB, ...(tauntAb ? [tauntAb] : [])];
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
      const kitAbs = [...kitFor(cls.id, selSpec).abilities, DASH_AB, ...(tauntAb ? [tauntAb] : [])];
      abs.splice(0, abs.length, ...kitAbs);
      // the seven keys (eight for a tank), with what this specialization changed marked
      keys.innerHTML = abs.map((a, i) => `<button class="key-cell ${a.type}${i < 6 && a !== kit.abilities[i] ? ' changed' : ''}" data-i="${i}">
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
        <div><h4>Passive · ${guide.passive.name}</h4><p>${(spec && spec.classPassive) || guide.passive.desc}</p></div>`;
      $('sel-tips').innerHTML = `<h4>Tips &amp; Combos</h4>
        <div class="tips-grid">
          <div>${spec ? `<h5>As a ${spec.name}</h5><p>${spec.blurb}</p>` : ''}<h5>First steps</h5><p>${kit.floor}</p><h5>Mastery · ${kit.signature}</h5><ul class="ceiling">${kit.ceiling.map(c => `<li>${c}</li>`).join('')}</ul></div>
          <div><h5>Combos</h5>${guide.combos.map(c => `<div class="combo"><div class="chain">${c.keys.map(k => keyChip(cls, k)).join('<b class="arrow">›</b>')}</div><p>${c.text}</p></div>`).join('')}</div>
        </div>`;
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
        if (PORTRAITS[th.cls.id]) drawBust(c, PORTRAITS[th.cls.id], 0, 0, 112, hov ? 1.16 : 1.1);
        else {
          if (hov) { VFX.glowAt(c, 56, 70, 50, th.cls.accent, 0.5); VFX.neonRing(c, 56, 92, 34 + Math.sin(now * 4) * 2, th.cls.accent, 2, 0.8, 0.4); }
          drawHero(c, th.cls, 56, 62, hov ? 0.6 + Math.sin(now * 2) * 0.5 : 0.6, th.st, 1.6, { ring: false });
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
    const bits = [ab.type === 'gcd' ? 'GCD' : 'oGCD'];
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
    setObjective('Try your skills on the <b>Training Yard</b> dummies (east). The red one swings back. When you\'re ready, step into the <b>Raid Portal</b> (north).');
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
      b.insertAdjacentHTML('beforeend', `<span><b>${boss.name}</b><small>Boss ${['I', 'II', 'III', 'IV'][i]} · ${boss.title}</small></span>`);
      b.addEventListener('click', () => showBoss(boss));
      list.appendChild(b);
      bossThumbs.push({ cv, boss });
    });
  })();
  let raidMode = 'normal', raidFill = true;
  function showBoss(boss) {
    document.querySelectorAll('#boss-list .item').forEach(b => b.classList.toggle('active', b.dataset.id === boss.id));
    const i = BOSSES.indexOf(boss);
    const det = $('boss-detail');
    det.innerHTML = `
      <div class="detail-top">
        <canvas></canvas>
        <div class="detail-info">
          <h3>${boss.name}</h3>
          <div class="sub"><span class="role-tag" style="--c:#ff7a6a">Boss ${['I', 'II', 'III', 'IV'][i]}</span>${boss.title}</div>
          <p class="tagline">${boss.blurb}</p>
        </div>
      </div>
      <ul class="abilities mech">${boss.mechanics.map(m => `<li><kbd>◆</kbd><div><b>${m.name}</b><span>${m.desc}</span></div></li>`).join('')}</ul>
      <div class="raid-setup">${boss.playable ? '' : '<button class="cta" disabled>Designed, not built yet · coming soon</button>'}</div>`;
    const cv = det.querySelector('canvas');
    setupCanvas(cv, 260, 260);
    preview = { kind: 'boss', boss, cv, st: newSt(), nextDemo: now + 0.8 };
    if (boss.playable) { const el = det.querySelector('.raid-setup'); el.dataset.boss = boss.id; renderRaidSetup(el); }
  }
  function renderRaidSetup(el) {
    const humans = raidHumans();
    const bots = raidFill ? pickBots(humans) : [];
    const canStart = Net.isHost && !!player.cls;
    const why = !Net.isHost ? 'Only the host can start the raid.' : !player.cls ? 'Pick a hero first.' : '';
    const extra = [...remotes.values()].filter(r => r.cls).length + (player.cls ? 1 : 0) > 4 ? '<p class="raid-note">Only the first four heroes go in.</p>' : '';
    el.innerHTML = `
      <div class="mode-pick">
        <button data-mode="normal" class="${raidMode === 'normal' ? 'on' : ''}"><b>Normal</b><small>Every attack is telegraphed on the floor.</small></button>
        <button data-mode="hard" class="${raidMode === 'hard' ? 'on' : ''}"><b>Hard</b><small>Faster and deadlier, with attacks Normal never uses. Some only show on the boss.</small></button>
      </div>
      <label class="fill"><input type="checkbox" ${raidFill ? 'checked' : ''} ${Net.isHost ? '' : 'disabled'}> Fill empty slots with bots</label>
      <div class="raid-roster">${humans.map(h => `<span style="--c:${ROLES[h.role].color}">${escapeHtml(h.name)}<small>${CLASSES.find(c => c.id === h.cls).name}</small></span>`).join('')}${
        bots.map(id => { const c = CLASSES.find(x => x.id === id); return `<span class="bot" style="--c:${ROLES[c.role].color}">Bot<small>${c.name}</small></span>`; }).join('')}</div>
      ${extra}
      <button class="cta" ${canStart ? '' : 'disabled'}>${canStart ? `Start raid · ${raidMode === 'hard' ? 'Hard' : 'Normal'}` : why}</button>`;
    el.querySelectorAll('.mode-pick button').forEach(b => b.addEventListener('click', () => { raidMode = b.dataset.mode; renderRaidSetup(el); }));
    el.querySelector('.fill input').addEventListener('change', e => { raidFill = e.target.checked; renderRaidSetup(el); });
    el.querySelector('.cta').addEventListener('click', () => startRaid(raidMode, raidFill, el.dataset.boss));
  }
  function openBossPanel(boss) {
    if (scene !== 'town') return;
    sel.classList.add('hidden');
    overlay.classList.remove('hidden'); bossPanel.classList.remove('hidden');
    player.target = null;
    showBoss(boss);
  }

  function renderPanels() {
    renderSelect();
    Inventory.frame(now);
    if (overlay.classList.contains('hidden')) return;
    const idle = { t: now, moving: false, action: null };
    for (const { cv, boss } of bossThumbs) drawBoss(prep(cv), boss, 28, 28, Math.PI / 2, idle, 0.34);
    if (!preview || preview.kind !== 'boss') return;
    const st = preview.st;
    st.t = now;
    {
      if (now > preview.nextDemo) { st.action = { type: 'attack', t0: now, dur: BOSS_ATTACK_DUR }; preview.nextDemo = now + 2.8; }
      const c = prep(preview.cv);
      drawBoss(c, preview.boss, 130, 128, 0.5 + Math.sin(now * 0.5) * 0.3, st, 1.45);
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
    if (raidHost) { const h = hostRoster.find(x => x.id === msg.id); if (h) { h.left = true; raidHost.sim.removePlayer(msg.id); } }
  });
  Net.on('snap', msg => {
    for (const [id, x, y, a, m, l, s, c] of msg.ps) {
      const r = remotes.get(id);
      if (!r) continue;
      const sc = s ? 1 : 0;
      if (sc !== r.scene) { r.scene = sc; r.x = x; r.y = y; r.track = new Track(x, y, a); updatePartyList(); }
      if (!r.track) r.track = new Track(r.x, r.y, r.angle);
      if (!r.clock) r.clock = new SendClock();
      r.track.push(r.clock.map(c, now), x, y, a);   // big jumps (teleports, scene changes) snap inside the track
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
    if (!e.bot) { e.tx = msg.x; e.ty = msg.y; if (e.track) e.track.push(e.clock ? e.clock.map(msg.c, now) : now, msg.x, msg.y, e.track.latest().a); }
    if (msg.i === 6) { e.dashUntil = now + 0.2; VFX.setScale(0.6); KIT_VFX.dash(e, e.cls.accent); VFX.setScale(1); return; }
    // a move a talent granted (msg.a names it) looks like itself, not the move it replaced
    const ab = (msg.a && abilityById(e.cls.id, e.spec, msg.a)) || kitFor(e.cls.id, e.spec).abilities[msg.i];
    if (!ab) return;
    let tx = msg.tx, ty = msg.ty, tent = null;
    if (msg.ally != null) { tent = entById(msg.ally); if (tent) { tx = tent.x; ty = tent.y; } }
    FX.cast(e, ab, tx, ty, { tent });
  });
  // another player's class moment (Perfect Block, Overheat, Dawnstar...)
  Net.on('kfx', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (!e || (msg.s ? 1 : 0) !== (scene === 'arena' ? 1 : 0)) return;
    playKitFx(e, msg.k, false, msg.d && typeof msg.d === 'object' ? msg.d : null);
  });
  Net.on('castStart', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (e) e.st.action = { type: 'cast', t0: now, dur: Math.max(0.55, msg.dur || 1), channel: true };
  });
  Net.on('castStop', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (e && e.st.action && e.st.action.channel) e.st.action = null;
  });
  // someone else's auto-attack (a friend's or a bot's)
  Net.on('auto', msg => {
    const e = msg.id >= 1000 ? (raid && raid.bots.get(msg.id)) : remotes.get(msg.id);
    if (!e || !e.cls || (msg.s ? 1 : 0) !== (scene === 'arena' ? 1 : 0)) return;
    playAuto(e, msg.tx, msg.ty, msg.k, false, !!msg.a);
  });
  Net.on('chat', msg => { const r = remotes.get(msg.id); if (r) showChat(r, msg.text); });
  // the host is gone: back to the join screen (hero and bags kept) so you can rejoin, host or go solo at once
  Net.on('disconnect', () => {
    remotes.clear(); updatePartyList();
    if (scene === 'arena') leaveRaid(false);
    closePanels(); if (Inventory.isOpen()) Inventory.toggle();
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
    started = true;
    Inventory.showGoldHud(scene !== 'arena');
    if (!player.cls) openSelect(null);
    else { Net.send({ t: 'cls', id: player.cls.id, spec: player.spec }); sendGear(); }   // back after a lost connection: tell the new room who we are
    updatePartyList();
    toast(Net.solo ? `Welcome to Emberfall, ${player.name}! Bots will fill your party.` : Net.isHost ? `You're hosting! Room code: ${Net.room}` : `Welcome to Emberfall, ${player.name}!`);
  }
  hostBtn.addEventListener('click', () => enter('host'));
  soloBtn.addEventListener('click', () => enter('solo'));
  joinForm.addEventListener('submit', e => { e.preventDefault(); enter(codeInput.value ? 'join' : 'host'); });

  $('party').addEventListener('click', e => {
    if (!e.target.closest('.copy-room')) return;
    const link = /^https?:/.test(location.protocol) ? `${location.origin}${location.pathname}#${Net.room}` : Net.room;
    navigator.clipboard.writeText(link).then(
      () => toast(link === Net.room ? `Copied room code ${Net.room}` : 'Invite link copied!'),
      () => toast(`Room code: ${Net.room}`));
  });

  // clicking your locked ally's frame again lets go of them
  RaidUI.init({ onFrame: id => { lockedAlly = lockedAlly === id ? null : id; }, onLeave: () => leaveRaid(true),
    onDock: where => { if (player.cls) Save.setSetting(`frames-${player.cls.role}`, where); } });
  // where the party frames sit for your role: healers start with them above the hotbar
  const applyFrameDock = () => { if (player.cls) RaidUI.dock(Save.setting(`frames-${player.cls.role}`, player.cls.role === 'healer' ? 'strip' : 'left')); };

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
  bagBtn.id = 'bag-btn'; bagBtn.dataset.tip = 'Inventory (I)';
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
    openHeroPanel, openBossPanel, chooseHero, startRaid, startTrial, openSelect, pressSlot, leaveRaid, CLASSES, BOSSES,
    // testing aid: advance the game clock by hand (for screenshots in throttled preview panes)
    step(sec = 0.5) { for (let t = 0; t < sec; t += 1 / 60) { now += 1 / 60; update(1 / 60); } render(); renderPanels(); updateTargetFrame(); Hud.update(now, now); },
    cycleTarget, get lockedEnemy() { return lockedEnemy; },
    pause(on = true) { paused = on; },
  };
  let paused = false;

  // ---------------------------------------------------------------- boot
  function frame(ts) {
    const raw = (ts - last) / 1000, dt = Math.min(0.05, raw);
    last = ts;
    DebugOverlay.frame(raw);   // the real frame time, before the 50 ms cap
    if (!paused) { now += dt; update(dt); }
    render();
    renderPanels();
    updateTargetFrame();
    Hud.update(now, now);
    drawMinimap();
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
