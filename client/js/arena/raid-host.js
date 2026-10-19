// Runs a raid on the host: the FightSim, the bots, and the routing of combat events.
// Works in the browser (host tab) and in Node (tools/bot-raid.js).
//
// opts: { def, mode, humans: () => [{ id, name, cls, role, x, y, a }], bots: [classId...], emit(msg), seed,
//         bond: partyBonus() result (items.js), the gear party bonus for this fight }
// emit() should broadcast to every player (including the host's own client code).

const BOT_NAMES = ['Brom', 'Ilsa', 'Tamsin', 'Oswin', 'Mira', 'Corvin'];

class RaidHost {
  constructor(opts) {
    this.def = opts.def; this.mode = opts.mode; this.humans = opts.humans; this.emitOut = opts.emit;
    this.t = 0;
    this.partyBuffs = [];  // { kind, value, end }
    this.bond = opts.bond || { hp: 0, dmg: 0, crit: 0, haste: 0 };
    const rngSeed = opts.seed || 1;
    let s = rngSeed >>> 0;
    this.rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    ARENA.use(this.def.id);
    this.spawnR = Math.min(330, ARENA.inner - 70);   // bots start in a ring below the boss, clear of the walls
    this.bots = (opts.bots || []).map((cid, i) => this.makeBot(cid, i));
    this.sim = new FightSim(this.def, this.mode, () => this.allPlayers(), msg => this.onSimMsg(msg), rngSeed, { hpPct: this.bond.hp });
    this.lastBotBroadcast = -1;
  }

  // entry: a class id, or 'class:spec' ('class:base' for the plain kit). Without one, a bot plays the base kit or
  // either specialization, a third of the time each.
  makeBot(entry, i) {
    const [classId, want] = String(entry).split(':');
    const cls = CLASSES.find(c => c.id === classId);
    const specs = (typeof SPECS !== 'undefined' && SPECS[classId]) || [];
    const spec = want ? (want === 'base' ? null : (specs.find(s => s.id === want) || {}).id || null)
      : (specs.length ? [null, ...specs.map(s => s.id)][Math.floor(this.rng() * (specs.length + 1))] : null);
    const spawnA = Math.PI / 2 + (i - 1) * 0.5;
    const bot = { id: 1000 + i, name: BOT_NAMES[i % BOT_NAMES.length], cls, spec, role: cls.role, bot: true, slot: i,
      x: Math.cos(spawnA) * this.spawnR, y: Math.sin(spawnA) * this.spawnR, a: -Math.PI / 2, moving: false, plan: null, nextThink: 0,
      taken: [], healTarget: null, nextAct: 0 };
    bot.actor = new CombatActor(cls, bot, this.botWorld(bot), this.rng);
    return bot;
  }

  allPlayers() {
    return [...this.humans(), ...this.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role, x: b.x, y: b.y, a: b.a, bot: true }))];
  }

  emit(msg) { this.emitOut(msg); }

  // ---------------------------------------------------------------- per-frame
  tick(dt) {
    this.t += dt;
    this.sim.tick(dt);
    this.partyBuffs = this.partyBuffs.filter(b => b.end > this.sim.t);
    if (this.sim.state === 'live') this.tickBots(dt);
    if (this.t - this.lastBotBroadcast >= 0.1 && this.bots.length) {
      this.lastBotBroadcast = Math.max(this.lastBotBroadcast + 0.1, this.t - 0.05);   // steady 10/s (see fight.js)
      this.emit({ t: 'bots', b: this.bots.map(b => [b.id, Math.round(b.x), Math.round(b.y), +b.a.toFixed(2), b.moving ? 1 : 0]), c: +this.t.toFixed(3) });
    }
  }

  view() {
    const sim = this.sim;
    const players = this.allPlayers().map(p => {
      const s = sim.ps.get(p.id) || {};
      return { id: p.id, x: p.x, y: p.y, role: p.role, alive: !!s.alive, hp: s.hp || 0, maxHp: s.maxHp || 1, left: s.left, threat: s.threat || 0 };
    });
    const b = sim.boss;
    return {
      t: sim.t, boss: { x: b.x, y: b.y, facing: b.facing, untargetable: b.untargetable }, bossTarget: b.target,
      bossCast: b.cast ? { name: b.cast.name, left: b.cast.end - sim.t } : null,
      mechs: [...sim.mechs.values()], puddles: sim.puddles, players,
      adds: [...sim.adds.values()], tethers: [...sim.tethers.values()], zones: sim.zones,
      rollers: [...sim.rollers.values()], reels: [...sim.reels.values()], sweeps: [...sim.sweeps.values()],
      // Volkar: everyone's charge, the rods' posts, and where the closing wall is about to jump
      polarity: sim.polarity || null, posts: (sim.posts || []).filter(c => c.end > sim.t), edgeNext: sim.edgeNext || null,
      // the Hollow King: lanterns, who is doomed (and when it kills), and the knights' replays still to come
      lanterns: sim.lanterns || [], doomed: sim.doomed || null, echoPlan: sim.echoPlan || [], night: !!sim.night, pools: sim.healPools,
      // the room: solid props (cover, walls to bait a charge into), burning grease, and boss-specific room state
      props: sim.props, floor: sim.floor, burning: fl => sim.burning(fl), room: sim.room || null,
      // the boss's next named moves, as the upcoming-moves feed shows them to players: [[name, seconds until], ...]
      next: sim.upcoming(3).map(e => [e.name, e.t - sim.t]),
      debuffs: id => { const s = sim.ps.get(id); const out = {}; if (s) for (const k in s.debuffs) if (s.debuffs[k] > sim.t) out[k] = true; return out; },
    };
  }

  tickBots(dt) {
    const view = this.view();
    for (const bot of this.bots) {
      const s = this.sim.ps.get(bot.id);
      if (!s || !s.alive) { bot.moving = false; continue; }
      if (this.sim.t >= bot.nextThink) {
        bot.wantEnemy = BotAI.pickEnemy(bot, view);
        bot.plan = BotAI.move(bot, view);
        bot.nextThink = this.sim.t + 0.2 + this.rng() * 0.1;
      }
      const deb = s.debuffs, rooted = deb.rooted > this.sim.t, slowed = deb.slowed > this.sim.t;
      // reeled in by silk: dragged toward the boss until the bot reacts and dashes free
      const rl = bot.reel;
      if (rl && this.sim.t >= rl.pullAt) {
        const b = this.sim.boss, dx = b.x - bot.x, dy = b.y - bot.y, d = Math.hypot(dx, dy) || 1;
        if (this.sim.t >= rl.snapAt) {
          const a = Math.atan2(-dy, -dx);
          const to = { x: bot.x + Math.cos(a) * 170, y: bot.y + Math.sin(a) * 170 };
          ARENA.clamp(to, 40);
          this.emit({ t: 'cast', id: bot.id, i: 6, x: Math.round(bot.x), y: Math.round(bot.y), tx: Math.round(to.x), ty: Math.round(to.y), ally: null });
          bot.x = to.x; bot.y = to.y; bot.reel = null;
          this.sim.snapReel(bot.id);
        } else { const step = Math.min(d, rl.speed * dt); bot.x += dx / d * step; bot.y += dy / d * step; }
      }
      if (bot.plan && rooted) bot.moving = false;
      else if (bot.plan) {
        // walk round any solid prop in the way
        const goal = this.sim.props.length ? PROPS.steer(bot, bot.plan, this.sim.props, 14) : bot.plan;
        const dx = goal.x - bot.x, dy = goal.y - bot.y, d = Math.hypot(dx, dy);
        if (d > 6) {
          const step = Math.min(d, 230 * (slowed ? FIGHT.SLOWED : 1) * (bot.reel && this.sim.t >= bot.reel.pullAt ? 0.4 : 1) * dt);
          bot.x += dx / d * step; bot.y += dy / d * step; bot.moving = true;
        } else bot.moving = false;
      }
      ARENA.clamp(bot, 12);   // walls can move (Volkar's closing edge)
      PROPS.collide(bot, this.sim.props, 14);
      const b = this.sim.boss;
      bot.a = Math.atan2(b.y - bot.y, b.x - bot.x);
      // Royal Gaze: turn your back on him just before it lands (Royal Audience wants the opposite: keep facing him)
      if (view.mechs.some(m => m.type === 'gaze' && m.resolveAt - this.sim.t < 1.1) && !view.mechs.some(m => m.type === 'audience' && m.resolveAt - this.sim.t < 1.1)) bot.a += Math.PI;
      bot.actor.update();
      if (bot.actor.taunt) this.botTaunt(bot, view);
      if (this.sim.t >= bot.nextAct) {
        const i = BotAI.act(bot, bot.actor.kit, view);
        if (i !== null && i !== undefined) {
          const ab = bot.actor.abilities[i];
          if (bot.actor.press(i)) {
            bot.nextAct = this.sim.t + 0.15;
            void ab;
          }
        }
      }
    }
  }

  // a bot tank taunts back what it lost, after a human-ish moment to notice (BotAI.tauntTarget picks what)
  botTaunt(bot, view) {
    const t = this.sim.t, want = bot.actor.tauntReady(t) ? BotAI.tauntTarget(bot, view) : null;
    if (!want) { bot.tauntSeen = null; return; }
    if (!bot.tauntSeen || bot.tauntSeen.tg !== want) { bot.tauntSeen = { tg: want, at: t + 0.7 }; return; }
    if (t < bot.tauntSeen.at) return;
    bot.tauntSeen = null;
    if (this.sim.taunt(bot.id, want)) bot.actor.useTaunt(t);
  }
  // ---------------------------------------------------------------- routing
  onSimMsg(msg) {
    // things the bots need to know about themselves
    if (msg.t === 'fev') {
      const bot = this.bots.find(b => b.id === msg.id);
      if (bot) {
        if (msg.k === 'perfect') bot.actor.notify('perfect');
        if (msg.k === 'reflect') bot.actor.notify('reflect');
        if (msg.k === 'shieldEnd') bot.actor.notify('shieldEnd', msg);
      }
    }
    if (msg.t === 'pdmg') { const bot = this.bots.find(b => b.id === msg.id); if (bot) bot.taken.push({ t: this.sim.t, a: msg.a }); }
    if (msg.t === 'reel') {
      const bot = this.bots.find(b => b.id === msg.pid);
      // a bot notices the hook after a human-ish reaction time (slower on purpose: sometimes it gets bitten)
      if (bot) bot.reel = { pullAt: this.sim.t + msg.windup, speed: msg.sp, snapAt: this.sim.t + msg.windup + 0.35 + this.rng() * 0.9 };
    }
    if (msg.t === 'reelx') { const bot = this.bots.find(b => b.id === msg.pid); if (bot) bot.reel = null; }
    if (msg.t === 'kb') {
      const bot = this.bots.find(b => b.id === msg.id);
      if (bot) {
        const a = Math.atan2(bot.y - msg.y, bot.x - msg.x);
        const to = ARENA.clamp({ x: bot.x + Math.cos(a) * msg.d, y: bot.y + Math.sin(a) * msg.d }, 12);  // the arena has a wall, same as for players
        PROPS.clipMove(bot, to, this.sim.props, 14);   // ... and a throw stops at a solid prop
        bot.x = to.x; bot.y = to.y;
      }
    }
    this.emit(msg);
  }

  // a combat event from a human player (or a bot)
  onPlayerEvent(pid, ev) {
    if (ev.type === 'partyBuff') {
      this.partyBuffs.push({ kind: ev.kind, value: ev.value, end: this.sim.t + ev.dur });
      this.emit({ t: 'pbuff', kind: ev.kind, value: ev.value, dur: ev.dur, from: pid });
      return;
    }
    this.sim.onEvent(pid, ev);
  }

  partyMods() {
    const m = { dmg: 0, crit: 0, haste: 0 };
    for (const b of this.partyBuffs) if (b.end > this.sim.t) m[b.kind] = Math.max(m[b.kind] || 0, b.value);
    // the gear party bonus stacks on top of buffs (bots get it too)
    m.dmg += this.bond.dmg; m.crit += this.bond.crit; m.haste += this.bond.haste;
    return m;
  }

  // ---------------------------------------------------------------- the world as a bot sees it
  botWorld(bot) {
    const host = this;
    return {
      now: () => host.sim.t,
      moving: () => bot.moving,
      canAuto: () => { const s = host.sim.ps.get(bot.id); return !!s && s.alive && host.sim.state === 'live'; },
      // the add this bot wants if it's in range, else the boss, else any add in range
      findEnemy: (actor, ab) => {
        const b = host.sim.boss;
        const range = ab.range === 'melee' ? 75 : (ab.range || 420);
        const inRange = (x, y, r) => Math.hypot(x - bot.x, y - bot.y) - r <= range;
        const want = bot.wantEnemy ? host.sim.adds.get(bot.wantEnemy) : null;
        if (want && inRange(want.x, want.y, want.r)) return { id: want.id, x: want.x, y: want.y };
        if (!b.untargetable && inRange(b.x, b.y, FIGHT.BOSS_R)) return { id: 'boss', x: b.x, y: b.y };
        if (bot.wantEnemy === 'hold') return null;
        for (const a of host.sim.adds.values()) if (inRange(a.x, a.y, a.r)) return { id: a.id, x: a.x, y: a.y };
        return null;
      },
      positional: () => positionalOf(bot, host.sim.boss),
      allyTarget: (actor, ab) => {
        const t = bot.healTarget;
        if (t == null) return bot.id;
        const s = host.sim.ps.get(t);
        if (!s) return bot.id;
        if (!s.alive && !ab.allowDead) return bot.id;
        return t;
      },
      isDead: id => { const s = host.sim.ps.get(id); return !!s && !s.alive; },
      defaultLink: () => { const t = host.sim.tank(); return t ? t.id : bot.id; },
      partyMods: () => host.partyMods(),
      targetMods: () => ({ vuln: host.sim.boss.vulnEnd > host.sim.t ? host.sim.boss.vuln : 0 }),
      selfMods: () => { const s = host.sim.ps.get(bot.id); return { dmgDown: s && s.dmgDownEnd > host.sim.t ? FIGHT.DMG_DOWN : 0 }; },
      recentDamage: (actor, secs) => bot.taken.filter(d => d.t > host.sim.t - secs).reduce((a, d) => a + d.a, 0),
      maxHp: () => { const s = host.sim.ps.get(bot.id); return s ? s.maxHp : playerBaseHp(bot.role); },
      hpFrac: () => { const s = host.sim.ps.get(bot.id); return s && s.maxHp ? Math.max(0, s.hp / s.maxHp) : 1; },
      onEvent: (actor, ev) => {
        switch (ev.type) {
          case 'used': {
            const en = ev.ab.target === 'enemy' && ev.target && typeof ev.target === 'object' ? ev.target : null;
            if (en) bot.lastEnemy = en.id;
            host.emit({ t: 'cast', id: bot.id, i: actor.abilities.indexOf(ev.ab), x: Math.round(bot.x), y: Math.round(bot.y),
              tx: Math.round(en ? en.x : host.sim.boss.x), ty: Math.round(en ? en.y : host.sim.boss.y), ally: typeof ev.target === 'number' ? ev.target : null });
            break;
          }
          case 'damage':
            host.onPlayerEvent(bot.id, Object.assign({}, ev, { tgt: bot.lastEnemy || 'boss' }));
            break;
          case 'castStart':
            host.emit({ t: 'castStart', id: bot.id, i: actor.abilities.indexOf(ev.ab), dur: ev.dur });
            break;
          case 'auto': {
            const t = ev.target && typeof ev.target === 'object' ? ev.target : null;
            if (t) bot.lastEnemy = t.id;
            bot.autoAlt = !bot.autoAlt;
            host.emit({ t: 'auto', id: bot.id, k: ev.kind, tx: Math.round(t ? t.x : host.sim.boss.x), ty: Math.round(t ? t.y : host.sim.boss.y), a: bot.autoAlt ? 1 : 0, s: 1 });
            break;
          }
          case 'fx':  // class moments (perfect block, overheat...) so every client can show them
            host.emit({ t: 'kfx', id: bot.id, k: ev.name, s: 1 });
            break;
          case 'teleport': {
            const b = host.sim.boss, a = b.facing + Math.PI;
            bot.x = b.x + Math.cos(a) * (FIGHT.BOSS_R + 45); bot.y = b.y + Math.sin(a) * (FIGHT.BOSS_R + 45);
            break;
          }
          case 'heal': case 'hot': case 'shield': case 'mit': case 'raise': case 'rewind':
          case 'selfDamage': case 'targetDebuff': case 'partyBuff': case 'pool': case 'brand':
            host.onPlayerEvent(bot.id, ev);
            break;
        }
      },
    };
  }
}

// Which side of the boss is this entity on? (the boss faces its target, usually the tank)
function positionalOf(ent, boss) {
  const a = Math.atan2(ent.y - boss.y, ent.x - boss.x);
  let d = a - boss.facing;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  d = Math.abs(d);
  return d < Math.PI / 4 ? 'front' : d > Math.PI * 3 / 4 ? 'rear' : 'flank';
}

if (typeof module !== 'undefined') module.exports = { RaidHost, positionalOf };
