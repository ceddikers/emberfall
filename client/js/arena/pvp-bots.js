// PvP Arena bots (phase A): the world a bot's kit sees in a match, and how it moves. The rotation itself is the raid
// bots' own (BotAI.act and BotAI.ult in bots.js), fed a view in which "the boss" is the bot's chosen opponent and "the
// party" is its own team. Nothing here touches the raid bots.

const PVP_BOT = {
  SPEED: 230,
  MELEE_AT: 48,          // a melee bot closes to this far from its opponent
  RANGED_AT: 270,        // a ranged one keeps about this far
  HEALER_AT: 230,
  KITE_IN: 130,          // a ranged bot with a melee opponent this close backs off
  STRAFE: 0.35,          // radians per second a ranged bot circles its opponent
  BODY_R: 18,            // a hero's body, for reach
};

const PvpBots = {
  isMelee(bot) { return BotAI.isMelee(bot.cls); },

  // the opponent to fight: the one already chosen while alive and not much further than another; else the nearest,
  // a hurt one counting as closer
  pickFoe(host, bot) {
    const sim = host.sim, foes = sim.foes(bot.id);
    if (!foes.length) return null;
    if (sim.flags) {   // (capture the flag: whoever carries our flag comes first, when near)
      const c = sim.flags[sim.teamOf(bot.id)].st === 'carried' ? foes.find(p => p.id === sim.flags[sim.teamOf(bot.id)].by) : null;
      if (c && Math.hypot(c.x - bot.x, c.y - bot.y) < 650) return c;
    }
    const score = p => Math.hypot(p.x - bot.x, p.y - bot.y) * (0.6 + 0.4 * p.s.hp / p.s.maxHp) * (p.s.role === 'healer' ? 0.8 : 1);
    let best = foes[0];
    for (const p of foes) if (score(p) < score(best)) best = p;
    const cur = foes.find(p => p.id === bot.foe);
    if (cur && score(cur) < score(best) * 1.4) return cur;
    return best;
  },

  // the raid view (raid-host.js view()) with no boss mechanics, the opponent as the boss and the team as the party
  view(host, bot, foe) {
    const sim = host.sim, tm = sim.teamOf(bot.id), t = sim.t;
    const players = sim.players().filter(p => sim.teamOf(p.id) === tm).map(p => ({ id: p.id, x: p.x, y: p.y, role: p.role, alive: !!p.s.alive, hp: p.s.hp, maxHp: p.s.maxHp, left: false,
      hollow: !!p.s.hollow, debt: p.s.hollow ? p.s.hollow.debt : 0, healed: p.s.hollow ? p.s.hollow.heal : 0, hollowLeft: p.s.hollow ? Math.max(0, p.s.hollow.until - t) : 0, graceLeft: p.s.hollow ? Math.max(0, p.s.hollow.graceUntil - t) : 0 }));
    return {
      t, boss: foe ? { x: foe.x, y: foe.y, facing: foe.a || 0, untargetable: false } : { x: 0, y: 0, facing: 0, untargetable: true },
      bossTarget: foe ? host.bots.find(b => b.id === foe.id)?.foe ?? bot.id : null, bossCast: null,
      mechs: [], puddles: [], players, bossId: 'pvp', dmgScale: 1, mitLog: [], adds: [], tethers: [], zones: [], rollers: [], rollPre: [], lungePlan: [],
      tauntAt: () => -99, reels: [], sweeps: [], polarity: null, posts: [], edgeNext: null, pendingCut: null, lanterns: [], doomed: null, echoPlan: [], night: false,
      pools: sim.healPools, runes: null, binding: null, props: [], floor: [], burning: () => false, room: null, next: [],
      debuffs: id => { const s = sim.ps.get(id), out = {}; if (s) for (const k in s.debuffs) if (s.debuffs[k] > t) out[k] = s.debuffs[k] - t; return out; },
      threads: sim.threads || [], tapestry: null, dolls: sim.liveDolls(),
      burst: false, dealt: id => (sim.stats[id] ? sim.stats[id].damage : 0), allyMods: () => ({ dmg: 0, haste: 0 }),
    };
  },

  // where to stand: melee on top of the foe, ranged at range circling it (and backing off a melee foe), healers at
  // range near a hurt ally
  move(host, bot, foe, dt) {
    const sim = host.sim;
    if (sim.flags) { const p = this.ctfMove(host, bot, foe); if (p !== undefined) return p; }
    if (!foe) return null;
    const dx = bot.x - foe.x, dy = bot.y - foe.y, d = Math.hypot(dx, dy) || 1;
    if (this.isMelee(bot)) {
      if (d <= PVP_BOT.MELEE_AT + 6) return null;
      return { x: foe.x + dx / d * PVP_BOT.MELEE_AT, y: foe.y + dy / d * PVP_BOT.MELEE_AT };
    }
    const foeBot = host.bots.find(b => b.id === foe.id), foeMelee = foeBot ? this.isMelee(foeBot) : CLASSES.find(c => c.id === foe.cls) && BotAI.isMelee(CLASSES.find(c => c.id === foe.cls));
    let want = bot.role === 'healer' ? PVP_BOT.HEALER_AT : PVP_BOT.RANGED_AT;
    if (foeMelee && d < PVP_BOT.KITE_IN) want += 120;   // kite
    if (bot.role === 'healer') {   // stay near a teammate who is in trouble
      const mate = sim.alive().find(p => p.id !== bot.id && sim.teamOf(p.id) === sim.teamOf(bot.id));
      if (mate && Math.hypot(mate.x - bot.x, mate.y - bot.y) > 300) return { x: mate.x, y: mate.y };
    }
    if (sim.t >= (bot.strafeFlip || 0)) { bot.strafe = -bot.strafe; bot.strafeFlip = sim.t + 2.5 + host.rng() * 3; }
    const a = Math.atan2(dy, dx) + bot.strafe * PVP_BOT.STRAFE;
    const to = { x: foe.x + Math.cos(a) * want, y: foe.y + Math.sin(a) * want };
    ARENA.clamp(to, 40);
    return to;
  },

  // capture the flag: where the objective wants a bot (undefined: fight as in a team bout). Each side's first living
  // non-healer bot runs for the enemy flag (or escorts a teammate carrying it); the others guard the stand, chase a
  // thief, and a healer stays with whoever runs. Anyone near a dropped flag goes for it first.
  ctfMove(host, bot, foe) {
    const sim = host.sim, tm = sim.teamOf(bot.id), mine = sim.flags[tm], theirs = sim.flags[1 - tm], home = sim.stand(tm);
    const d = p => Math.hypot(p.x - bot.x, p.y - bot.y);
    if (theirs.st === 'carried' && theirs.by === bot.id) return { x: home.x, y: home.y };   // carrying: home
    if (mine.st === 'dropped' && d(mine) < 480) return { x: mine.x, y: mine.y };
    if (theirs.st === 'dropped' && d(theirs) < 480) return { x: theirs.x, y: theirs.y };
    const team = host.bots.filter(b => b.team === tm && sim.ps.get(b.id) && sim.ps.get(b.id).alive);
    const runner = team.find(b => b.role !== 'healer') || team[0];
    const carrier = theirs.st === 'carried' ? sim.alive().find(p => p.id === theirs.by) : null;
    const escort = c => { const a = Math.atan2(bot.y - c.y, bot.x - c.x); return { x: c.x + Math.cos(a) * 110, y: c.y + Math.sin(a) * 110 }; };
    // our flag taken: everyone but our own carrier (and a healer minding them) hunts the thief
    const thief = mine.st === 'carried' ? sim.alive().find(p => p.id === mine.by) : null;
    if (thief && !(bot.role === 'healer' && carrier && Math.hypot(carrier.x - home.x, carrier.y - home.y) > 200)) return d(thief) > 260 ? { x: thief.x, y: thief.y } : undefined;
    if (bot.role === 'healer' && runner !== bot) {
      const mate = carrier || sim.alive().find(p => p.id !== bot.id && sim.teamOf(p.id) === tm);
      if (!mate) return undefined;
      if (foe && d(foe) < 300) return undefined;   // (in a fight: heal and fight as usual)
      return d(mate) > 160 ? escort(mate) : { x: bot.x, y: bot.y };
    }
    if (bot === runner) {
      if (carrier) return foe && d(foe) < 220 ? undefined : escort(carrier);
      return { x: theirs.x, y: theirs.y };
    }
    // a guard: after a thief, else near our stand, fighting whoever comes close to it
    if (mine.st === 'carried') return undefined;   // (pickFoe has put the thief first)
    if (foe && Math.hypot(foe.x - home.x, foe.y - home.y) < 420) return undefined;
    const post = { x: home.x * 0.82, y: (bot.slot % 2 ? 1 : -1) * 60 };
    return Math.hypot(post.x - bot.x, post.y - bot.y) > 40 ? post : { x: bot.x, y: bot.y };
  },

  // a Threadweaver in a bout has no web to keep (no tank, rarely a teammate in reach): she stands and throws Needles,
  // and mends herself when low; the raid rotation handles the rest (her Ultimate and so on)
  weaver(bot, k, view) {
    const i = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ready = j => { const a = k.abilities[j]; return j >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    if (k.cast || k.lockUntil > k.now || k.gcdRemaining() > 0) return null;
    const me = view.players.find(p => p.id === bot.id), mend = i('mend'), needle = i('needle');
    const still = j => { bot.stillUntil = view.t + (k.castTime(k.abilities[j]) || 0) + 0.1; return j; };
    if (me && me.hp / me.maxHp < 0.45 && ready(mend)) { bot.healTarget = bot.id; return still(mend); }
    if (ready(needle) && !view.boss.untargetable) return still(needle);
    return BotAI.act(bot, k, view);
  },

  tick(host, dt) {
    const sim = host.sim;
    for (const bot of host.bots) {
      const s = sim.ps.get(bot.id);
      if (!s || !s.alive) { if (!bot.down) { bot.down = true; bot.actor.onDeath(); } bot.moving = false; continue; }
      const foe = this.pickFoe(host, bot);
      bot.foe = foe ? foe.id : null;
      if (sim.t >= bot.nextThink) { bot.plan = this.move(host, bot, foe, dt); bot.nextThink = sim.t + 0.2 + host.rng() * 0.15; }
      const deb = s.debuffs, rooted = deb.rooted > sim.t, slowed = deb.slowed > sim.t;
      // casting a spell with a cast time: stand still for it (BotAI.act may set stillUntil too)
      const casting = !!bot.actor.kit.cast;
      if (bot.plan && !rooted && !casting && !(bot.stillUntil > sim.t)) {
        const ddx = bot.plan.x - bot.x, ddy = bot.plan.y - bot.y, d = Math.hypot(ddx, ddy);
        const carry = sim.carrying && sim.carrying(bot.id) ? CTF.SLOW : 1;
        if (d > 6) { const step = Math.min(d, PVP_BOT.SPEED * (slowed ? FIGHT.SLOWED : 1) * carry * dt); bot.x += ddx / d * step; bot.y += ddy / d * step; bot.moving = true; }
        else bot.moving = false;
      } else bot.moving = false;
      ARENA.clamp(bot, 12);
      if (foe) bot.a = Math.atan2(foe.y - bot.y, foe.x - bot.x);
      bot.actor.update();
      const view = this.view(host, bot, foe);
      const k = bot.actor.kit;
      if (k.ult && foe && BotAI.ult(bot, k, view, { mods: host.teamMods(bot.id), dpsCheck: false, healCheck: false, bossFrac: foe.s.hp / foe.s.maxHp })) bot.actor.press(7);
      if (sim.t >= bot.nextAct) {
        let i = null;
        try { i = bot.cls.id === 'threadweaver' ? this.weaver(bot, k, view) : BotAI.act(bot, k, view); } catch (e) { if (!bot.actErr) { bot.actErr = 1; if (typeof console !== 'undefined') console.warn('pvp bot act', bot.cls.id, e && e.message); } }
        if (i !== null && i !== undefined && bot.actor.press(i)) bot.nextAct = sim.t + 0.15;
      }
    }
  },

  // the world a bot's kit talks to (actor.js), in a match
  world(host, bot) {
    const sim = () => host.sim;
    const reach = ab => (ab.range === 'melee' ? 75 : (ab.range || 420)) + PVP_BOT.BODY_R;
    const foeOf = () => { const f = bot.foe != null ? sim().foes(bot.id).find(p => p.id === bot.foe) : null; return f || null; };
    return {
      now: () => sim().t,
      moving: () => bot.moving,
      canAuto: () => { const s = sim().ps.get(bot.id); return !!s && s.alive && sim().state === 'live'; },
      findEnemy: (actor, ab) => {
        const f = foeOf();
        if (f && Math.hypot(f.x - bot.x, f.y - bot.y) <= reach(ab)) return { id: f.id, x: f.x, y: f.y };
        for (const p of sim().foes(bot.id)) if (Math.hypot(p.x - bot.x, p.y - bot.y) <= reach(ab)) return { id: p.id, x: p.x, y: p.y };
        return null;
      },
      enemiesNear: (actor, range) => sim().foes(bot.id).map(p => ({ id: p.id, x: p.x, y: p.y, r: PVP_BOT.BODY_R })).filter(c => Math.hypot(c.x - bot.x, c.y - bot.y) - c.r <= range),
      positional: () => { const f = foeOf(); return f ? positionalOf(bot, { x: f.x, y: f.y, facing: f.a || 0 }) : 'front'; },
      allyTarget: (actor, ab) => {
        const t = bot.healTarget, s = t != null ? sim().ps.get(t) : null;
        if (!s || sim().teamOf(t) !== sim().teamOf(bot.id)) return bot.id;
        if (!s.alive && !ab.allowDead) return bot.id;
        return t;
      },
      isDead: id => { const s = sim().ps.get(id); return !!s && !s.alive; },
      allyHp: id => { const s = sim().ps.get(id); return s && s.maxHp ? (s.alive ? Math.max(0, s.hp / s.maxHp) : 0) : null; },
      defaultLink: () => { const m = sim().alive().find(p => p.id !== bot.id && sim().teamOf(p.id) === sim().teamOf(bot.id)); return m ? m.id : bot.id; },
      partyMods: () => host.teamMods(bot.id),
      targetMods: () => ({ vuln: 0 }),
      selfMods: () => { const s = sim().ps.get(bot.id); return { dmgDown: s && s.dmgDownEnd > sim().t ? FIGHT.DMG_DOWN : 0, dmg: 0, haste: 0 }; },
      recentDamage: (actor, secs) => bot.taken.filter(d => d.t > sim().t - secs).reduce((a, d) => a + d.a, 0),
      maxHp: () => { const s = sim().ps.get(bot.id); return s ? s.maxHp : playerBaseHp(bot.role); },
      hpFrac: () => { const s = sim().ps.get(bot.id); return s && s.maxHp ? Math.max(0, s.hp / s.maxHp) : 1; },
      aim: () => { const f = foeOf(); return f ? { x: f.x, y: f.y } : bot.plan || null; },
      collide: (actor, o) => { ARENA.clamp(o, 16); },
      dolls: (actor, list) => sim().setDoll(bot.id, list),
      taunt: () => false,
      inCombat: () => sim().state === 'live',
      threads: () => ({ me: bot.id, l: (sim().threads || []).filter(th => th.from === bot.id).map(th => {
        const a = sim().players().find(p => p.id === th.a), b = sim().players().find(p => p.id === th.b);
        return [th.a, th.b, a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0];
      }) }),
      onEvent: (actor, ev) => {
        switch (ev.type) {
          case 'used': {
            const en = ev.ab.target === 'enemy' && ev.target && typeof ev.target === 'object' ? ev.target : null;
            if (en) bot.lastEnemy = en.id;
            const f = en || foeOf();
            host.emit({ t: 'cast', id: bot.id, i: actor.abilities.includes(ev.ab) ? actor.abilities.indexOf(ev.ab) : (ev.ab.slot ?? -1), a: ev.ab.fxId || ev.ab.id, x: Math.round(bot.x), y: Math.round(bot.y),
              tx: Math.round(f ? f.x : bot.x), ty: Math.round(f ? f.y : bot.y), ally: typeof ev.target === 'number' ? ev.target : null, st: ev.st });
            break;
          }
          case 'damage':
            host.onPlayerEvent(bot.id, Object.assign({}, ev, { tgt: typeof ev.tgt === 'number' ? ev.tgt : (bot.lastEnemy ?? bot.foe) }, ev.ab && (ev.ab.ult || ev.ab.ultOf) ? { ub: 1 } : null));
            break;
          case 'castStart':
            host.emit(Object.assign({ t: 'castStart', id: bot.id, i: actor.abilities.indexOf(ev.ab), dur: ev.dur }, ev.h > 0 && typeof ev.target === 'number' ? { h: ev.h, to: ev.target } : null));
            break;
          case 'auto': {
            const t = ev.target && typeof ev.target === 'object' ? ev.target : null;
            if (t) bot.lastEnemy = t.id;
            bot.autoAlt = !bot.autoAlt;
            host.emit({ t: 'auto', id: bot.id, k: ev.kind, tx: Math.round(t ? t.x : bot.x), ty: Math.round(t ? t.y : bot.y), a: bot.autoAlt ? 1 : 0, s: 1 });
            break;
          }
          case 'fx':
            host.emit(Object.assign({ t: 'kfx', id: bot.id, k: ev.name, s: 1 }, ev.data ? { d: ev.data } : null));
            if (ev.name === 'ult-spent') host.onPlayerEvent(bot.id, { type: 'ult' });
            break;
          case 'teleport': {
            const f = foeOf();
            let to;
            if (ev.where === 'point') to = { x: Number(ev.x) || 0, y: Number(ev.y) || 0 };
            else if (ev.where === 'behind' || !ev.where) to = f ? { x: f.x - Math.cos(f.a || 0) * 45, y: f.y - Math.sin(f.a || 0) * 45 } : { x: bot.x, y: bot.y };
            else to = kitMoveDest(ev.where, bot, f ? { x: f.x, y: f.y } : null, PvpBots.isMelee(bot) && f ? { x: f.x, y: f.y } : bot.plan, ev.d);
            if (host.sim.ctfDrop) host.sim.ctfDrop(bot.id);   // (capture the flag: a blink lets go of the flag)
            ARENA.clamp(to, 40); bot.x = to.x; bot.y = to.y;
            break;
          }
          default:
            host.onPlayerEvent(bot.id, ev);
        }
      },
    };
  },
};

if (typeof module !== 'undefined') module.exports = { PvpBots, PVP_BOT };
