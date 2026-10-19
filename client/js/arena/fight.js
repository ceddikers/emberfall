// Host-side boss fight simulation. Only the host runs this; it owns boss HP, player HP, threat,
// mechanics and deaths. Players' kits report their damage/heals as combat events and the host applies
// them here, then broadcasts the results (see arena.js for the client side).
//
// A boss definition (bosses/*.js) provides { id, name, hp: {normal, hard}, autoDmg: {normal, hard},
// enrage: {normal, hard}, script(f) }. The script schedules mechanics with f.at / f.after and the
// primitives below (cast, mech, raidwide, puddle, onHp...).

const FIGHT = {
  BOSS_R: 70,            // boss hitbox radius
  MELEE: 150,            // distance at which the boss autos / walks to the tank
  AUTO_EVERY: 2.8,
  DMG_DOWN: 0.10,        // damage dealt penalty for getting hit by avoidable attacks
  DMG_DOWN_DUR: 10,
  VULN: 0.25,            // damage taken up per stack, from avoidable hits
  VULN_DUR: 15,
  // Threat: damage × (TANK_THREAT for tanks) × the event's own multiplier (clamped to EV_THREAT_MAX), heals × HEAL_THREAT.
  // It fades (THREAT_FADE of it per second), so what counts is the last ~20 s: a tank who stops hitting for a few
  // seconds can lose the boss to a bursting DPS. A taunt sets your threat to the top + TAUNT_LEAD and fixes the boss
  // on you for TAUNT_FIX s (an add: TAUNT_ADD_FIX s). TAUNT_CD matches TAUNT.cd in kits.js (the host allows 1 s of slack).
  TANK_THREAT: 2.75,
  HEAL_THREAT: 0.2,
  THREAT_FADE: 0.05,
  EV_THREAT_MAX: 3,
  TAUNT_LEAD: 1.1, TAUNT_FIX: 3, TAUNT_ADD_FIX: 6, TAUNT_CD: 20,
  RAISE_WEAKNESS: 0.25,
  PERFECT_WINDOW: 0.8,   // Bastion's Brace
  SLOWED: 0.55,          // move speed while 'slowed' (webs, venom); 'rooted' stops movement and dashes
  // The boss files are written in "big" numbers; this brings boss HP, player HP and every hit down to the
  // game's small-number scale (same factor as ENGINE.NUM_SCALE, which scales potency).
  NUM_SCALE: 0.05,
  TANK_HP: 32000, HP: 21000,   // before NUM_SCALE
};
const playerBaseHp = role => Math.round((role === 'tank' ? FIGHT.TANK_HP : FIGHT.HP) * FIGHT.NUM_SCALE);

// distance from (px, py) to the segment (ax, ay)-(bx, by)
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

class FightSim {
  // getPlayers: () => [{ id, name, role, cls, x, y, a }]. emit(msg) broadcasts to everyone (incl. host).
  // opts: { hpPct } extra max HP for everyone (the gear party bonus, items.js)
  constructor(def, mode, getPlayers, emit, seed = Date.now(), opts = {}) {
    this.def = def; this.mode = mode; this.hard = mode === 'hard';
    this.hpPct = Math.max(0, Math.min(0.1, opts.hpPct || 0));
    ARENA.use(def.id);
    this.getPlayers = getPlayers; this.emit = emit;
    this.rngState = (seed >>> 0) || 1;
    this.t = 0; this.state = 'countdown'; this.countdown = 8;
    this.events = []; this.mechs = new Map(); this.nextMechId = 1; this.puddles = [];
    this.tethers = new Map(); this.adds = new Map(); this.zones = []; this.addsDirty = false;
    this.rollers = new Map(); this.reels = new Map(); this.sweeps = new Map();
    this.edgeGrace = 0;   // a moving wall (Volkar) leaves people outside it for a moment; don't count that as a fall
    this.healPools = [];  // players' healing pools on the floor (Moonwell): { from, x, y, r, amount, ticks, next, interval }
    this.tickers = [];    // per-tick hooks a boss script adds with ticker() (the Hollow King's lanterns and Doom)
    this.phase = 1; this.hpTriggers = [];
    // Vulnerability per avoidable hit: a boss can make it bite harder (def.vuln)
    this.vulnStep = def.vuln || FIGHT.VULN;
    this.ps = new Map();
    const n = Math.max(1, Math.min(4, getPlayers().length));
    this.scale = { hp: [0.42, 0.62, 0.82, 1][n - 1] * FIGHT.NUM_SCALE, dmg: [0.6, 0.8, 0.92, 1][n - 1] * FIGHT.NUM_SCALE, n };
    const hp = Math.round(def.hp[mode] * this.scale.hp);
    // def.spawn: where the boss stands at the pull; def.anchor: it never walks after the tank (Volkar holds the middle)
    const sp = def.spawn || { x: 0, y: -40 };
    this.boss = {
      hp, maxHp: hp, x: sp.x, y: sp.y, facing: Math.PI / 2, target: null, cast: null, anim: null, untargetable: false,
      vuln: 0, vulnEnd: 0, autoAt: 4, moveTo: null, speed: 140, dmgUp: 0, anchor: !!def.anchor,
    };
    this.stats = {};
    for (const p of getPlayers()) this.addPlayer(p);
    this.lastBroadcast = -1; this.lastPartyBroadcast = -1;
  }

  rng() { let t = (this.rngState += 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
  shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // casts are faster on Hard
  ct(sec) { return this.hard ? sec * 0.85 : sec; }

  addPlayer(p) {
    if (this.ps.has(p.id)) return;
    // gear (humans only, already capped by the host): flat HP and a little damage reduction
    const gear = p.gear || {};
    const maxHp = Math.round((playerBaseHp(p.role) + Math.max(0, Math.min(150, gear.hp || 0))) * (1 + (this.hpPct || 0)));
    this.ps.set(p.id, { id: p.id, role: p.role, hp: maxHp, maxHp, alive: true, def: Math.max(0, Math.min(0.1, (gear.def || 0) / 1000)), shield: 0, shieldEnd: 0, shieldMax: 0, shieldFrom: null, shieldTag: null,
      mits: [], threat: p.role === 'tank' ? 1 : 0, vuln: 0, vulnEnd: 0, dmgDownEnd: 0, weakEnd: 0, hots: [], debuffs: {}, hist: [], diedAt: -99 });
    this.stats[p.id] = { damage: 0, healing: 0, overheal: 0, taken: 0, mitigated: 0, deaths: 0, avoidable: 0, name: p.name, role: p.role, cls: p.cls, bot: !!p.bot };
  }
  removePlayer(id) { const s = this.ps.get(id); if (s) { s.alive = false; s.left = true; } }

  // ---------------------------------------------------------------- scheduling
  // name: the step's player-facing name (its cast name), for the upcoming-moves feed (bnext); unnamed steps don't show
  at(t, fn, name) { this.events.push({ t, fn, phase: this.phase, name }); this.events.sort((a, b) => a.t - b.t); }
  after(dt, fn, name) { this.at(this.t + dt, fn, name); }
  // scheduled event that survives phase changes (enrage timer, follow-ups of a running mechanic)
  atKeep(t, fn, name) { this.events.push({ t, fn, phase: this.phase, keep: true, name }); this.events.sort((a, b) => a.t - b.t); }
  afterKeep(dt, fn, name) { this.atKeep(this.t + dt, fn, name); }
  // run a list of [delay, fn, name] steps one after another, starting at `from` (now); a step without fn is just a gap
  seq(steps, from = this.t) { let t = from; for (const [dt, fn, name] of steps) { t += dt; if (fn) this.at(t, fn, name); } return t - this.t; }
  // a phase's repeating rotation: build(n) gives loop n's steps (the last delay is the gap before the next loop). The next
  // loop is laid out 20 s before this one ends, so the upcoming-moves feed sees across the seam.
  loop(build, n = 0, from = this.t) {
    const end = this.t + this.seq(build(n), from);
    this.at(Math.max(from, end - 20), () => this.loop(build, n + 1, end));
  }
  // the next few named steps still to come in this phase (and kept ones, like the enrage)
  upcoming(n = 3) {
    const out = [];
    for (const e of this.events) {
      if (!e.name || e.t < this.t || !(e.phase === this.phase || e.keep)) continue;
      out.push(e);
      if (out.length >= n) break;
    }
    return out;
  }
  // the upcoming-moves feed: [[name, seconds until], ...], about once a second and whenever the list changes
  broadcastNext(force) {
    const up = this.upcoming(3), key = up.map(e => e.name + '@' + e.t.toFixed(2)).join('|');
    if (!force && key === this.nextKey && (!up.length || this.t - this.lastNext < 1)) return;
    this.nextKey = key; this.lastNext = this.t;
    this.emit({ t: 'bnext', l: up.map(e => [e.name, Math.max(0, Math.round((e.t - this.t) * 10) / 10)]) });
  }
  onHp(frac, fn) { this.hpTriggers.push({ frac, fn }); this.hpTriggers.sort((a, b) => b.frac - a.frac); }
  // start a new phase: drops everything still scheduled for the old one
  setPhase(n) { this.phase = n; this.events = this.events.filter(e => e.phase === n || e.keep); }

  players() {
    const out = [];
    for (const p of this.getPlayers()) { const s = this.ps.get(p.id); if (s && !s.left) out.push(Object.assign({}, p, { s })); }
    return out;
  }
  alive() { return this.players().filter(p => p.s.alive); }
  // whoever the boss is on: a taunt's fixation while it lasts, otherwise the most threat
  tank() {
    const al = this.alive(), fx = this.boss.fix;
    if (fx && fx.until > this.t) { const p = al.find(q => q.id === fx.id); if (p) return p; }
    let best = null;
    for (const p of al) if (!best || p.s.threat > best.s.threat) best = p;
    return best;
  }
  // an add's target: a taunt's fixation, then the most threat on that add, then (before anyone has hit it) the nearest
  addTarget(a) {
    const al = this.alive();
    if (a.fix && a.fix.until > this.t) { const p = al.find(q => q.id === a.fix.id); if (p) return p; }
    let best = null, bt = 0;
    for (const p of al) { const th = a.threat[p.id] || 0; if (th > bt) { bt = th; best = p; } }
    if (best) return best;
    let nd = Infinity;
    for (const p of al) { const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < nd) { nd = d; best = p; } }
    return best;
  }
  // Taunt (any tank, tgt = 'boss' or an add's id): threat to the top + 10%, and a short fixation. False if refused.
  taunt(pid, tgt) {
    const s = this.ps.get(pid);
    if (!s || !s.alive || s.role !== 'tank' || this.state !== 'live' || this.t < (s.tauntReady || 0)) return false;
    const al = this.alive();
    if (tgt != null && tgt !== 'boss') {
      const a = this.adds.get(tgt);
      if (!a) return false;
      let top = 1; for (const p of al) top = Math.max(top, a.threat[p.id] || 0);
      a.threat[pid] = top * FIGHT.TAUNT_LEAD;
      a.fix = { id: pid, until: this.t + FIGHT.TAUNT_ADD_FIX };
    } else {
      if (this.boss.untargetable) return false;
      let top = 1; for (const p of al) top = Math.max(top, p.s.threat);
      s.threat = top * FIGHT.TAUNT_LEAD;
      this.boss.fix = { id: pid, until: this.t + FIGHT.TAUNT_FIX };
      tgt = 'boss';
    }
    s.tauntReady = this.t + FIGHT.TAUNT_CD - 1;
    this.emit({ t: 'fev', k: 'taunt', id: pid, tg: tgt });
    return true;
  }
  // a player's share of the room's attention: added to the boss (or an add) and faded every tick
  threatMult(s, ev) {
    const m = ev && ev.threat !== undefined ? (Number.isFinite(ev.threat) ? Math.max(0, Math.min(FIGHT.EV_THREAT_MAX, ev.threat)) : 1) : 1;
    return (s.role === 'tank' ? FIGHT.TANK_THREAT : 1) * m;
  }
  fadeThreat(dt) {
    const k = Math.exp(-FIGHT.THREAT_FADE * dt);
    for (const s of this.ps.values()) s.threat *= k;
    for (const a of this.adds.values()) for (const id in a.threat) a.threat[id] *= k;
  }
  dropThreat(pid) { for (const a of this.adds.values()) delete a.threat[pid]; }
  nonTanks() { const t = this.tank(); return this.alive().filter(p => !t || p.id !== t.id); }

  // ---------------------------------------------------------------- lifecycle
  tick(dt) {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = 'live'; this.t = 0;
        this.def.script(this);
        if (this.def.enrage) this.atKeep(this.def.enrage[this.mode], () => this.enrage(), this.def.enrageName || 'Enrage');
        this.emit({ t: 'fight', s: 'live' });
      }
      return;
    }
    if (this.state !== 'live') return;
    this.t += dt;
    while (this.events.length && this.events[0].t <= this.t) {
      const e = this.events.shift();
      if (e.phase === this.phase || e.keep) e.fn();
    }
    while (this.hpTriggers.length && this.boss.hp / this.boss.maxHp <= this.hpTriggers[0].frac) this.hpTriggers.shift().fn();
    this.fadeThreat(dt);
    this.updateBoss(dt);
    this.updateMechs();
    this.updatePuddles(dt);
    this.updateTethers();
    this.updateAdds(dt);
    this.updateZones();
    this.updateRollers();
    this.updateReels();
    this.updateSweeps();
    for (const fn of this.tickers) fn(dt);
    this.updatePlayers(dt);
    if (this.state !== 'live') return;
    if (this.alive().length === 0) return this.end('wipe');
    this.broadcastNext();
    // a steady 10/s: stepping the mark by 0.1 (not to "now") stops 33 ms ticks rounding every gap up to 133 ms
    if (this.t - this.lastBroadcast >= 0.1) { this.lastBroadcast = Math.max(this.lastBroadcast + 0.1, this.t - 0.05); this.broadcastBoss(); }
    if (this.t - this.lastPartyBroadcast >= 0.2) { this.lastPartyBroadcast = this.t; this.broadcastParty(); }
  }

  enrage() {
    this.cast(this.def.enrageName || 'Enrage', 8, 'enrage');
    this.after(8, () => { for (const p of this.alive()) this.damagePlayer(p, 9999999, { kind: 'enrage' }); });
  }

  end(result) {
    if (this.state !== 'live') return;
    this.state = result;
    this.mechs.clear(); this.puddles = []; this.tethers.clear(); this.adds.clear(); this.zones = []; this.healPools = [];
    this.rollers.clear(); this.reels.clear(); this.sweeps.clear();
    this.events = []; this.broadcastNext(true);
    this.broadcastAdds();
    this.broadcastParty();
    this.emit({ t: 'fight', s: result, time: Math.round(this.t * 10) / 10, stats: this.stats, hp: this.boss.hp, maxHp: this.boss.maxHp, mode: this.mode });
  }

  updateBoss(dt) {
    const b = this.boss;
    if (b.cast && this.t >= b.cast.end) b.cast = null;
    if (b.anim && this.t >= b.anim.end) b.anim = null;
    const tank = this.tank();
    b.target = tank ? tank.id : null;
    if (b.moveTo) {
      const dx = b.moveTo.x - b.x, dy = b.moveTo.y - b.y, d = Math.hypot(dx, dy);
      const step = (b.moveTo.speed || 400) * dt;
      if (d <= step) { b.x = b.moveTo.x; b.y = b.moveTo.y; b.moveTo = null; }
      else { b.x += dx / d * step; b.y += dy / d * step; }
    } else if (tank && !b.cast && !b.lockFacing && !b.untargetable) {
      b.facing = Math.atan2(tank.y - b.y, tank.x - b.x);
      const d = Math.hypot(tank.x - b.x, tank.y - b.y);
      if (d > FIGHT.MELEE && !b.anchor) {
        const step = Math.min(d - FIGHT.MELEE * 0.85, b.speed * dt);
        b.x += Math.cos(b.facing) * step; b.y += Math.sin(b.facing) * step;
        ARENA.clamp(b, 110);
      }
    }
    if (tank && !b.untargetable && this.t >= b.autoAt) {
      b.autoAt = this.t + FIGHT.AUTO_EVERY;
      const d = Math.hypot(tank.x - b.x, tank.y - b.y);
      if (d < FIGHT.MELEE * 1.5) {
        this.emit({ t: 'banim', name: 'auto', dur: 0.5 });
        this.damagePlayer(tank, this.def.autoDmg[this.mode], { kind: 'auto' });
      }
    }
  }

  updatePlayers(dt) {
    for (const p of this.players()) {
      const s = p.s;
      s.mits = s.mits.filter(m => m.end > this.t);
      if (s.shield > 0 && s.shieldEnd <= this.t) this.endShield(p.id, s);
      if (s.vulnEnd <= this.t) s.vuln = 0;
      for (const k in s.debuffs) if (s.debuffs[k] <= this.t) delete s.debuffs[k];
      for (const h of s.hots) {
        while (h.ticks > 0 && this.t >= h.next) { h.ticks--; h.next += h.interval; if (s.alive) this.applyHeal(h.from, p.id, h.amount); }
      }
      s.hots = s.hots.filter(h => h.ticks > 0);
      if (s.alive) for (const pl of this.healPools) if (this.t >= pl.next && Math.hypot(p.x - pl.x, p.y - pl.y) <= pl.r) this.applyHeal(pl.from, p.id, pl.amount);
      if (s.alive) {
        s.hist.push([this.t, s.hp]);
        while (s.hist.length && s.hist[0][0] < this.t - 6) s.hist.shift();
        if (ARENA.sd(p.x, p.y) > 14 && this.t > this.edgeGrace) this.damagePlayer(p, 9999999, { kind: 'fall' });
      }
    }
    for (const pl of this.healPools) if (this.t >= pl.next) { pl.next += pl.interval; pl.ticks--; }
    this.healPools = this.healPools.filter(pl => pl.ticks > 0);
  }

  // ---------------------------------------------------------------- incoming combat events from players
  onEvent(pid, ev) {
    const s = this.ps.get(pid), st = this.stats[pid];
    if (!s || this.state !== 'live') return;
    if (!s.alive) return;
    const targetsOf = target => (target === 'party' ? this.alive().map(p => p.id) : [this.resolveTarget(pid, target, ev.not)]);
    switch (ev.type) {
      case 'damage': {
        let amt = Math.max(0, Math.min(15000, ev.amount | 0));
        if (s.weakEnd > this.t) amt = Math.round(amt * (1 - FIGHT.RAISE_WEAKNESS));
        // ev.tgt names the enemy it was aimed at: 'boss' (or nothing) or an add's id
        if (ev.tgt != null && ev.tgt !== 'boss') {
          const a = this.adds.get(ev.tgt);
          if (a) this.damageAdd(pid, a, amt, this.threatMult(s, ev));
          break;
        }
        if (this.boss.untargetable) return;
        this.boss.hp = Math.max(0, this.boss.hp - amt);
        this.burstBrand(pid);
        st.damage += amt;
        s.threat += amt * this.threatMult(s, ev);
        if (this.boss.hp <= 0) this.end('clear');
        break;
      }
      case 'heal': this.applyHeal(pid, ev.target === 'party' ? null : this.resolveTarget(pid, ev.target, ev.not), ev.amount, ev.target === 'party'); break;
      case 'hot':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          ts.hots = ts.hots.filter(h => !(h.from === pid && h.id === ev.id));
          ts.hots.push({ from: pid, id: ev.id, amount: ev.amount, ticks: ev.ticks, interval: ev.interval, next: this.t + ev.interval });
        }
        break;
      case 'shield':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          if (ts.shield > 0) this.endShield(tid, ts);
          ts.shield = Math.min(ev.amount | 0, ts.maxHp); ts.shieldMax = ts.shield; ts.shieldEnd = this.t + Math.min(30, ev.dur || 15);
          ts.shieldFrom = pid; ts.shieldTag = ev.tag || null;
        }
        break;
      case 'mit':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          ts.mits.push({ pct: Math.max(0, Math.min(1, ev.pct)), start: this.t, end: this.t + Math.min(30, ev.dur || 5), kind: ev.kind, from: pid });
        }
        break;
      case 'raise': {
        const ts = this.ps.get(ev.target);
        if (ts && !ts.alive && !ts.left) this.revive(ev.target, ts, 0.5, pid);
        break;
      }
      case 'rewind': {
        const tid = this.resolveTarget(pid, ev.target), ts = this.ps.get(tid);
        if (!ts || ts.left) break;
        const secs = Math.min(6, ev.secs || 4);
        if (!ts.alive) {
          if (this.t - ts.diedAt <= secs) {
            const before = ts.hist.filter(h => h[0] >= ts.diedAt - secs).reduce((m, h) => Math.max(m, h[1]), ts.maxHp * 0.3);
            this.revive(tid, ts, before / ts.maxHp, pid, true);
          }
        } else {
          const best = ts.hist.filter(h => h[0] >= this.t - secs).reduce((m, h) => Math.max(m, h[1]), ts.hp);
          if (best > ts.hp) this.applyHeal(pid, tid, best - ts.hp);
        }
        break;
      }
      case 'selfDamage': {
        const p = this.players().find(q => q.id === pid);
        if (p) this.damagePlayer(p, s.maxHp * Math.min(0.5, ev.pct || 0), { kind: 'self', raw: true });
        break;
      }
      case 'targetDebuff':
        if (ev.kind === 'vuln') { this.boss.vuln = Math.min(0.2, ev.value); this.boss.vulnEnd = this.t + Math.min(20, ev.dur); }
        break;
      case 'pool': {   // a healing pool at an ally's feet (Moonwell)
        const tp = this.players().find(q => q.id === this.resolveTarget(pid, ev.target)) || this.players().find(q => q.id === pid);
        if (!tp) break;
        this.healPools = this.healPools.filter(pl => pl.from !== pid);
        this.healPools.push({ from: pid, x: tp.x, y: tp.y, r: Math.min(200, ev.r || 140), amount: Math.max(0, Math.min(3000, ev.amount | 0)), ticks: Math.min(12, ev.ticks || 6), interval: Math.max(0.5, ev.interval || 1.5), next: this.t + Math.max(0.5, ev.interval || 1.5) });
        break;
      }
      case 'brand': {  // Judgment on the boss: allies' next hits burst for the Inquisitor's damage
        const b = this.boss, old = b.brand && b.brand.from === pid && b.brand.end > this.t ? b.brand.charges : 0;
        b.brand = { from: pid, charges: Math.min(8, old + Math.min(8, ev.ticks | 0)), amount: Math.max(0, Math.min(3000, ev.amount | 0)), end: this.t + 15 };
        break;
      }
      case 'snap': this.snapReel(pid); break;   // a dash snapped the silk reeling this player in
      case 'taunt': this.taunt(pid, typeof ev.tgt === 'string' ? ev.tgt : 'boss'); break;
    }
  }
  resolveTarget(pid, target, not) {
    if (target === 'lowest') {   // the most hurt ally (by share of HP), for heals that find their own target
      let best = pid, bf = Infinity;
      for (const p of this.alive()) { if (p.id === not) continue; const f = p.s.hp / p.s.maxHp; if (f < bf) { bf = f; best = p.id; } }
      return best;
    }
    return (target === undefined || target === null || target === 'self') ? pid : target;
  }
  // an ally's hit on a branded boss bursts one Judgment charge, credited to the Inquisitor who placed it
  burstBrand(pid) {
    const b = this.boss, br = b.brand;
    if (!br || br.from === pid || br.end <= this.t || br.charges <= 0) return;
    br.charges--;
    b.hp = Math.max(0, b.hp - br.amount);
    const st = this.stats[br.from]; if (st) st.damage += br.amount;
    this.emit({ t: 'fev', k: 'brandHit', id: br.from, left: br.charges });
    if (br.charges <= 0) b.brand = null;
  }

  revive(tid, ts, frac, by, rewound) {
    ts.alive = true; ts.hp = Math.round(ts.maxHp * Math.max(0.1, Math.min(1, frac)));
    ts.weakEnd = rewound ? 0 : this.t + 20; ts.threat = ts.role === 'tank' ? 1 : 0; ts.hist = []; this.dropThreat(tid);
    this.emit({ t: 'fev', k: 'raised', id: tid, by });
  }

  applyHeal(fromId, tid, amount, partyWide) {
    const targets = partyWide ? this.alive() : this.alive().filter(p => p.id === tid);
    for (const p of targets) {
      const s = p.s;
      const amt = Math.max(0, Math.min(8000, amount | 0));
      const real = Math.min(amt, s.maxHp - s.hp);
      s.hp += real;
      const st = this.stats[fromId];
      if (st) { st.healing += real; st.overheal += amt - real; }
      const fs = this.ps.get(fromId); if (fs && fs.alive) fs.threat += real * FIGHT.HEAL_THREAT;
    }
  }

  endShield(tid, s) {
    if (!s.shieldMax) return;
    const frac = 1 - Math.max(0, s.shield) / s.shieldMax;
    if (s.shieldFrom != null) this.emit({ t: 'fev', k: 'shieldEnd', id: s.shieldFrom, target: tid, tag: s.shieldTag, frac: +frac.toFixed(3) });
    s.shield = 0; s.shieldMax = 0; s.shieldFrom = null; s.shieldTag = null;
  }

  debuff(pid, name, dur) { const s = this.ps.get(pid); if (s) { s.debuffs[name] = this.t + dur; } }
  hasDebuff(pid, name) { const s = this.ps.get(pid); return !!(s && s.debuffs[name] > this.t); }

  // ---------------------------------------------------------------- damage to players
  damagePlayer(p, raw, opts = {}) {
    const s = p.s || this.ps.get(p.id);
    if (!s || !s.alive) return 0;
    let amt = opts.raw ? raw : raw * this.scale.dmg * (this.hard ? 1.25 : 1) * (1 + this.boss.dmgUp);
    if (s.vulnEnd > this.t && !opts.raw) amt *= 1 + s.vuln;
    if (s.def && !opts.raw) amt *= 1 - s.def;
    let mult = 1, perfect = null, reflect = null, invuln = false;
    for (const m of s.mits) {
      if (m.kind === 'invuln') { invuln = true; break; }
      if (m.kind === 'living') continue;
      if (m.kind === 'brace' && this.t - m.start <= FIGHT.PERFECT_WINDOW && !perfect) { perfect = m; mult *= 0.4; continue; }
      if (m.kind === 'reflect') { if (!reflect) { reflect = m; mult *= 0.2; } continue; }
      mult *= 1 - m.pct;
    }
    if (invuln) mult = 0;
    if (perfect) {
      s.mits = s.mits.filter(m => m !== perfect);
      this.emit({ t: 'fev', k: 'perfect', id: p.id });
    }
    if (reflect) {
      s.mits = s.mits.filter(m => m !== reflect);
      this.emit({ t: 'fev', k: 'reflect', id: p.id });
    }
    const before = amt;
    amt *= mult;
    const st = this.stats[p.id];
    st.mitigated += Math.round(before - amt);
    if (s.shield > 0 && amt > 0) {
      const used = Math.min(s.shield, amt);
      s.shield -= used; amt -= used;
      const shSt = this.stats[s.shieldFrom]; if (shSt) shSt.healing += Math.round(used);
      if (s.shield <= 0.5) this.endShield(p.id, s);
    }
    amt = Math.round(amt);
    s.hp -= amt;
    st.taken += amt;
    if (opts.avoidable) {
      st.avoidable++;
      s.dmgDownEnd = this.t + FIGHT.DMG_DOWN_DUR;
      // lingering ground ticks give Damage Down but don't stack Vulnerability (it would snowball per tick)
      if (!opts.noVuln) { s.vuln = Math.min(1, (s.vulnEnd > this.t ? s.vuln : 0) + this.vulnStep); s.vulnEnd = this.t + FIGHT.VULN_DUR; }
    }
    if (s.hp <= 0 && s.mits.some(m => m.kind === 'living') && opts.kind !== 'enrage' && opts.kind !== 'fall') s.hp = 1;
    this.emit({ t: 'pdmg', id: p.id, a: amt, k: opts.kind || 'hit', hp: Math.max(0, s.hp), dd: opts.avoidable ? 1 : 0 });
    if (s.hp <= 0) {
      s.hp = 0; s.alive = false; s.shield = 0; s.mits = []; s.hots = []; s.threat = 0; s.diedAt = this.t; this.dropThreat(p.id);
      st.deaths++;
      this.emit({ t: 'fev', k: 'death', id: p.id });
    }
    return amt;
  }

  // ---------------------------------------------------------------- primitives for boss scripts
  cast(name, dur, anim = 'cast', extra = {}) {
    this.boss.cast = { name, start: this.t, end: this.t + dur, anim };
    this.emit(Object.assign({ t: 'bcast', name, dur, anim }, extra));
  }
  anim(name, dur = 1, extra = {}) { this.boss.anim = { name, start: this.t, end: this.t + dur }; this.emit(Object.assign({ t: 'banim', name, dur }, extra)); }
  ticker(fn) { this.tickers.push(fn); }
  moveBoss(x, y, speed = 500) { const p = ARENA.clamp({ x, y }, 110); this.boss.moveTo = { x: p.x, y: p.y, speed }; }

  // Generic telegraph. opts: { shape, delay, dmg, type, hidden, follow, need, tag, onResolve, avoidable, failDmg }
  // type: 'aoe' | 'raidwide' | 'stack' | 'spread' | 'tower' | 'buster' | 'knockback' | 'proximity'
  mech(opts) {
    const id = this.nextMechId++;
    const m = Object.assign({ id, start: this.t, resolveAt: this.t + opts.delay, type: 'aoe', avoidable: true }, opts);
    this.mechs.set(id, m);
    this.emit({ t: 'tg', id, shape: m.shape, dur: m.delay, type: m.type, hidden: !!m.hidden, follow: m.follow ?? null,
      target: m.target ?? null, aim: m.aimFromBoss ?? null, lockAt: m.lockAt || (m.aimFromBoss ? 0.6 : 0),
      need: m.need || 0, tag: m.tag || null, color: m.color || null });
    return m;
  }
  updateMechs() {
    for (const [id, m] of this.mechs) {
      if (m.follow != null && this.t < m.resolveAt - (m.lockAt || 0)) {
        const p = this.players().find(q => q.id === m.follow);
        if (p) { m.shape.x = p.x; m.shape.y = p.y; }
        if (m.aimAt != null) {
          const tp = this.players().find(q => q.id === m.aimAt);
          if (tp) m.shape.angle = Math.atan2(tp.y - m.shape.y, tp.x - m.shape.x);
        }
      }
      if (m.aimFromBoss) { const tp = this.players().find(q => q.id === m.aimFromBoss); if (tp && this.t < m.resolveAt - (m.lockAt || 0.6)) { m.shape.x = this.boss.x; m.shape.y = this.boss.y; m.shape.angle = Math.atan2(tp.y - this.boss.y, tp.x - this.boss.x); } }
      if (this.t < m.resolveAt) continue;
      this.mechs.delete(id);
      this.resolveMech(m);
    }
  }
  resolveMech(m) {
    const pad = 14;
    const inside = this.alive().filter(p => SHAPES.contains(m.shape, p.x, p.y, pad));
    const hits = [];
    const hit = (p, dmg, kind, avoidable) => { this.damagePlayer(p, dmg, { kind, avoidable }); hits.push(p.id); };
    switch (m.type) {
      case 'aoe': for (const p of inside) hit(p, m.dmg, m.tag || 'aoe', m.avoidable); break;
      case 'raidwide': for (const p of this.alive()) hit(p, m.dmg, 'raidwide', false); break;
      case 'stack': {
        // m.dmg is the total, split among everyone inside; too few people and it hits harder
        const need = Math.min(m.need || 1, this.alive().length);
        if (!inside.length) { for (const p of this.alive()) hit(p, m.dmg * 0.6, 'stack-miss', true); break; }
        const each = m.dmg / inside.length * (inside.length < need ? 1.5 : 1);
        for (const p of inside) hit(p, each, 'stack', false);
        break;
      }
      case 'spread':
        for (const p of inside) hit(p, p.id === m.follow ? m.dmg : m.dmg * 1.5, 'spread', p.id !== m.follow);
        break;
      case 'tower': {
        const need = Math.min(m.need || 1, Math.max(1, this.alive().length));
        for (const p of inside) hit(p, m.dmg, 'tower', false);
        if (inside.length < need) for (const p of this.alive()) hit(p, m.failDmg || m.dmg * 2, 'tower-fail', false);
        break;
      }
      case 'buster': {
        const tgt = this.alive().find(p => p.id === (m.target ?? m.follow));
        for (const p of inside) {
          if (tgt && p.id === tgt.id) continue;
          hit(p, m.dmg * 0.7, 'cleave', true);
        }
        if (tgt) hit(tgt, m.dmg, 'buster', false);
        break;
      }
      case 'proximity':
        for (const p of this.alive()) {
          const d = Math.hypot(p.x - m.shape.x, p.y - m.shape.y);
          const f = Math.max(0.15, 1 - d / (m.falloff || 700));
          hit(p, m.dmg * f * f, 'proximity', false);
        }
        break;
      case 'knockback':
        for (const p of this.alive()) this.emit({ t: 'kb', id: p.id, x: m.shape.x, y: m.shape.y, d: m.dist || 260 });
        break;
    }
    this.emit({ t: 'tgx', id: m.id, hits });
    if (m.onResolve) m.onResolve(inside, hits);
  }

  raidwide(dmg, delay = 0) { return this.mech({ type: 'raidwide', shape: { kind: 'circle', x: this.boss.x, y: this.boss.y, r: 0 }, delay, dmg, hidden: true }); }
  aoe(shape, delay, dmg, extra = {}) { return this.mech(Object.assign({ type: 'aoe', shape, delay, dmg }, extra)); }

  // Lingering ground hazard: damages anyone inside every `every` seconds.
  // extra.slow: standing in it also slows you (the 'slowed' debuff, which clients and bots move slower under)
  puddle(x, y, r, dur, dmg, every = 1, tag = 'puddle', extra = {}) {
    const pd = { id: this.nextMechId++, x, y, r, end: this.t + dur, dmg, every, tag, last: {}, slow: !!extra.slow };
    this.puddles.push(pd);
    this.emit({ t: 'pud', id: pd.id, x, y, r, dur, tag });
    return pd;
  }
  updatePuddles() {
    this.puddles = this.puddles.filter(pd => pd.end > this.t);
    for (const pd of this.puddles) {
      for (const p of this.alive()) {
        if (Math.hypot(p.x - pd.x, p.y - pd.y) > pd.r + 10) continue;
        if (pd.slow) this.debuff(p.id, 'slowed', 1.2);
        if (this.t - (pd.last[p.id] || -99) < pd.every) continue;
        pd.last[p.id] = this.t;
        this.damagePlayer(p, pd.dmg, { kind: pd.tag, avoidable: true, noVuln: true });
      }
    }
  }
  clearPuddles() { this.puddles = []; this.emit({ t: 'pud', clear: true }); }

  // Tether between two players. kind 'long': they must be at least `len` apart when it resolves;
  // 'short': at most `len` apart. Otherwise both take `dmg`. opts: { kind, len, dmg, tag, onResolve(ok) }
  tether(aId, bId, delay, opts) {
    const th = Object.assign({ id: this.nextMechId++, a: aId, b: bId, start: this.t, resolveAt: this.t + delay, kind: 'long', len: 400, dmg: 10000 }, opts);
    this.tethers.set(th.id, th);
    this.emit({ t: 'teth', id: th.id, a: aId, b: bId, dur: delay, kind: th.kind, len: th.len, tag: th.tag || null });
    return th;
  }
  clearTethers() { this.tethers.clear(); this.emit({ t: 'tethx', clear: true }); }
  updateTethers() {
    for (const [id, th] of this.tethers) {
      if (this.t < th.resolveAt) continue;
      this.tethers.delete(id);
      const al = this.alive(), pa = al.find(p => p.id === th.a), pb = al.find(p => p.id === th.b);
      let ok = true;
      if (pa && pb) {
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        ok = th.kind === 'long' ? d >= th.len : d <= th.len;
        if (!ok) for (const p of [pa, pb]) this.damagePlayer(p, th.dmg, { kind: th.tag || 'tether', avoidable: true });
      }
      this.emit({ t: 'tethx', id, ok: ok ? 1 : 0 });
      if (th.onResolve) th.onResolve(ok);
    }
  }

  // Killable add. Players hit it by sending damage with tgt = its id. It crawls to its target (addTarget: threat on
  // this add, or a taunt; the nearest player until someone hits it) and bites.
  // opts: { kind, x, y, hp, r, speed, bite, biteEvery, leash, spit, onDeath(add), onTick(add, dt) }
  // leash: only chases players within this distance of its spawn (enraged adds chase anyone). spit: ranged hit otherwise.
  // add.link = another add's id: while both live, a beam joins them that hurts anyone standing across it (linkDmg).
  spawnAdd(opts) {
    const hp = Math.round((opts.hp || 10000) * this.scale.hp);
    const a = Object.assign({ kind: 'add', r: 34, speed: 70, bite: 1000, biteEvery: 2, link: null, linkDmg: 0, linkLast: {} }, opts,
      { id: 'a' + this.nextMechId++, hp, maxHp: hp, born: this.t, enraged: false, facing: 0, threat: {}, fix: null });
    a.nextBite = this.t + 2; a.homeX = a.x; a.homeY = a.y;
    this.adds.set(a.id, a);
    this.addsDirty = true;
    this.emit({ t: 'addev', k: 'spawn', id: a.id, kind: a.kind, x: Math.round(a.x), y: Math.round(a.y) });
    return a;
  }
  damageAdd(pid, a, amt, threatMult = 1) {
    a.hp = Math.max(0, a.hp - amt);
    this.stats[pid].damage += amt;
    a.threat[pid] = (a.threat[pid] || 0) + amt * threatMult;
    this.addsDirty = true;
    if (a.hp <= 0) this.killAdd(a);
  }
  killAdd(a) {
    if (!this.adds.has(a.id)) return;
    this.adds.delete(a.id);
    this.addsDirty = true;
    this.emit({ t: 'addev', k: 'death', id: a.id, x: Math.round(a.x), y: Math.round(a.y) });
    if (a.onDeath) a.onDeath(a);
  }
  clearAdds() { for (const a of [...this.adds.values()]) { this.adds.delete(a.id); this.emit({ t: 'addev', k: 'gone', id: a.id }); } this.addsDirty = true; }
  updateAdds(dt) {
    for (const a of [...this.adds.values()]) {
      if (!this.adds.has(a.id)) continue;
      const near = this.addTarget(a), nd = near ? Math.hypot(near.x - a.x, near.y - a.y) : Infinity;
      a.target = near ? near.id : null;
      if (near) {
        // leashed adds only chase players who come within `leash` of where they hatched; otherwise they go home and spit
        const chase = !a.leash || a.enraged || Math.hypot(near.x - a.homeX, near.y - a.homeY) < a.leash;
        const gx = chase ? near.x : a.homeX, gy = chase ? near.y : a.homeY;
        const gd = Math.hypot(gx - a.x, gy - a.y), stop = chase ? a.r + 30 : 4;
        a.facing = Math.atan2(near.y - a.y, near.x - a.x);
        if (gd > stop) {
          const step = Math.min(gd - stop, a.speed * dt), mv = Math.atan2(gy - a.y, gx - a.x);
          a.x += Math.cos(mv) * step; a.y += Math.sin(mv) * step;
        }
        if (nd < a.r + 60 && this.t >= a.nextBite) {
          a.nextBite = this.t + a.biteEvery;
          this.emit({ t: 'addev', k: 'bite', id: a.id, tg: near.id });
          this.damagePlayer(near, a.bite, { kind: 'bite' });
        } else if (a.spit && this.t >= a.nextBite) {
          a.nextBite = this.t + a.biteEvery * 1.5;
          this.emit({ t: 'addev', k: 'spit', id: a.id, tg: near.id, x: Math.round(a.x), y: Math.round(a.y) });
          this.damagePlayer(near, a.spit, { kind: 'addspit' });
        }
      }
      if (a.link && a.linkDmg) {
        const o = this.adds.get(a.link);
        if (o && a.id < o.id) {
          for (const p of this.alive()) {
            if (segDist(p.x, p.y, a.x, a.y, o.x, o.y) > 20) continue;
            if (this.t - (a.linkLast[p.id] || -99) < 1) continue;
            a.linkLast[p.id] = this.t;
            this.damagePlayer(p, a.linkDmg, { kind: 'silkbeam', avoidable: true, noVuln: true });
          }
        }
      }
      if (a.onTick) a.onTick(a, dt);
    }
  }

  // Lasting floor zone with an effect on whoever stands in it. opts: { shape, dur, effect: 'slow', tag }
  zone(opts) {
    const z = Object.assign({ id: this.nextMechId++, effect: 'slow', tag: 'zone' }, opts);
    z.end = this.t + (opts.dur || 9999);
    this.zones.push(z);
    this.emit({ t: 'zone', id: z.id, shape: z.shape, dur: opts.dur || 9999, tag: z.tag });
    return z;
  }
  updateZones() {
    this.zones = this.zones.filter(z => z.end > this.t);
    for (const z of this.zones) {
      if (z.effect !== 'slow') continue;
      for (const p of this.alive()) if (SHAPES.contains(z.shape, p.x, p.y, 0)) this.debuff(p.id, 'slowed', 0.6);
    }
  }
  clearZones() { this.zones = []; this.emit({ t: 'zone', clear: true }); }

  // Rolling hazard (Grubnak's meatballs): it lands at (x, y), sits there for `delay`, then rolls along `angle` at
  // `speed` until it leaves the room. Anyone it runs over takes dmg once and is shoved off its path.
  // Clients get one message and roll it themselves, so it costs no bandwidth while it moves.
  roller(opts) {
    const r = Object.assign({ id: this.nextMechId++, r: 44, speed: 300, delay: 1.6, dmg: 8000, kb: 150, tag: 'meatball', hit: {} }, opts);
    r.rollAt = this.t + r.delay;
    r.end = r.rollAt + (2 * ARENA.R + 300) / r.speed;
    this.rollers.set(r.id, r);
    this.emit({ t: 'roll', id: r.id, x: Math.round(r.x), y: Math.round(r.y), a: +r.angle.toFixed(3), sp: r.speed, r: r.r, delay: r.delay, tag: r.tag });
    return r;
  }
  rollerPos(r, t) { const d = Math.max(0, t - r.rollAt) * r.speed; return { x: r.x + Math.cos(r.angle) * d, y: r.y + Math.sin(r.angle) * d }; }
  clearRollers() { this.rollers.clear(); this.emit({ t: 'roll', clear: true }); }
  updateRollers() {
    for (const [id, r] of this.rollers) {
      if (this.t >= r.end) { this.rollers.delete(id); continue; }
      if (this.t < r.rollAt) continue;
      const pos = this.rollerPos(r, this.t);
      for (const p of this.alive()) {
        if (r.hit[p.id] || Math.hypot(p.x - pos.x, p.y - pos.y) > r.r + 16) continue;
        r.hit[p.id] = true;
        this.damagePlayer(p, r.dmg, { kind: r.tag, avoidable: true });
        // shoved sideways, to whichever side of the path they were on
        const cross = Math.cos(r.angle) * (p.y - pos.y) - Math.sin(r.angle) * (p.x - pos.x);
        const ka = r.angle + (cross >= 0 ? Math.PI / 2 : -Math.PI / 2);
        this.emit({ t: 'kb', id: p.id, x: p.x - Math.cos(ka) * 20, y: p.y - Math.sin(ka) * 20, d: r.kb });
        this.emit({ t: 'rollhit', id, pid: p.id });
      }
    }
  }

  // Silk Reel (Skitterra): a thread hooks a player and drags them toward the boss for `dur` s after a `windup`.
  // A dash snaps it (the player's client sends 'snap'; bots do it themselves). Dragged within `reach`: a heavy bite.
  reel(pid, opts = {}) {
    const rl = Object.assign({ id: this.nextMechId++, pid, speed: 170, dur: 4, windup: 0.9, dmg: 12000, reach: 150, tag: 'reel' }, opts);
    rl.pullAt = this.t + rl.windup; rl.end = rl.pullAt + rl.dur;
    this.reels.set(rl.id, rl);
    this.emit({ t: 'reel', id: rl.id, pid, windup: rl.windup, dur: rl.dur, sp: rl.speed });
    return rl;
  }
  snapReel(pid) {
    for (const [id, rl] of this.reels) if (rl.pid === pid && this.t >= rl.pullAt - 0.2) { this.reels.delete(id); this.emit({ t: 'reelx', id, pid, ok: 1 }); }
  }
  clearReels() { for (const [id, rl] of this.reels) this.emit({ t: 'reelx', id, pid: rl.pid, ok: 1 }); this.reels.clear(); }
  updateReels() {
    for (const [id, rl] of this.reels) {
      const p = this.alive().find(q => q.id === rl.pid);
      if (!p) { this.reels.delete(id); this.emit({ t: 'reelx', id, pid: rl.pid, ok: 1 }); continue; }
      if (this.t < rl.pullAt) continue;
      if (Math.hypot(p.x - this.boss.x, p.y - this.boss.y) <= rl.reach) {
        this.reels.delete(id);
        this.damagePlayer(p, rl.dmg, { kind: rl.tag, avoidable: true });
        this.debuff(p.id, 'slowed', 4);
        this.emit({ t: 'reelx', id, pid: rl.pid, ok: 0 });
      } else if (this.t >= rl.end) { this.reels.delete(id); this.emit({ t: 'reelx', id, pid: rl.pid, ok: 1 }); }
    }
  }

  // Rotating walls of wind (Volkar's Storm Walls): `arms` beams from (x, y) out past the walls, `w` wide, turning at
  // `spin` rad/s for `dur` s after a `delay`. Anyone an arm passes over takes dmg (once per arm per pass) and is shoved
  // along with it. Like the meatballs, clients get one message and turn the walls on their own clock.
  sweep(opts) {
    const sw = Object.assign({ id: this.nextMechId++, x: 0, y: 0, arms: 2, a0: 0, spin: 0.5, w: 150, delay: 3, dur: 10, dmg: 8000, kb: 110, tag: 'storm', last: {} }, opts);
    sw.startAt = this.t + sw.delay; sw.end = sw.startAt + sw.dur;
    this.sweeps.set(sw.id, sw);
    this.emit({ t: 'sweep', id: sw.id, x: Math.round(sw.x), y: Math.round(sw.y), arms: sw.arms, a0: +sw.a0.toFixed(3), spin: +sw.spin.toFixed(3), w: sw.w, delay: sw.delay, dur: sw.dur, tag: sw.tag });
    return sw;
  }
  sweepAngle(sw, t) { return sw.a0 + Math.max(0, t - sw.startAt) * sw.spin; }
  clearSweeps() { this.sweeps.clear(); this.emit({ t: 'sweep', clear: true }); }
  updateSweeps() {
    for (const [id, sw] of this.sweeps) {
      if (this.t >= sw.end) { this.sweeps.delete(id); continue; }
      if (this.t < sw.startAt) continue;
      const a0 = this.sweepAngle(sw, this.t);
      for (let k = 0; k < sw.arms; k++) {
        const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), s = Math.sin(a);
        for (const p of this.alive()) {
          const dx = p.x - sw.x, dy = p.y - sw.y, along = dx * c + dy * s, across = -dx * s + dy * c;
          if (along < 0 || Math.abs(across) > sw.w / 2 + 14) continue;
          const key = p.id + ':' + k;
          if (this.t - (sw.last[key] ?? -9) < 1.5) continue;
          sw.last[key] = this.t;
          this.damagePlayer(p, sw.dmg, { kind: sw.tag, avoidable: true });
          // shoved the way the wall is turning
          const ta = a + Math.sign(sw.spin || 1) * Math.PI / 2;
          this.emit({ t: 'kb', id: p.id, x: p.x - Math.cos(ta) * 20, y: p.y - Math.sin(ta) * 20, d: sw.kb });
        }
      }
    }
  }

  // ---------------------------------------------------------------- broadcasting
  broadcastBoss() {
    const b = this.boss;
    this.emit({ t: 'fb', hp: b.hp, mx: b.maxHp, x: Math.round(b.x), y: Math.round(b.y), f: +b.facing.toFixed(2), tg: b.target,
      u: b.untargetable ? 1 : 0, v: b.vulnEnd > this.t ? b.vuln : 0, ft: Math.round(this.t * 10) / 10, ph: this.phase,
      na: +(b.autoAt - this.t).toFixed(2),  // time to the next auto-attack, so clients can show the wind-up
      c: +this.t.toFixed(3),                // the fight clock, so clients can space the boss's moves evenly (interp.js)
      bs: this.bossStatus() });             // what's on the boss, for the icons under the boss bar (raid-ui.js)
    if (this.adds.size || this.addsDirty) this.broadcastAdds();
  }
  // host-side states on the boss, compact: [kind, seconds left (0 = no timer), value, who]
  //   ['vuln', s, % more damage taken] Hunter's Mark · ['dmg', 0, % more damage dealt] (Gorge and the like)
  //   ['brand', s, charges, Inquisitor's id] · ['fix', s, 0, taunting tank's id]
  bossStatus() {
    const b = this.boss, t = this.t, out = [];
    if (b.vulnEnd > t && b.vuln) out.push(['vuln', Math.ceil(b.vulnEnd - t), Math.round(b.vuln * 100)]);
    if (b.dmgUp > 0) out.push(['dmg', 0, Math.round(b.dmgUp * 100)]);
    if (b.brand && b.brand.end > t && b.brand.charges > 0) out.push(['brand', Math.ceil(b.brand.end - t), b.brand.charges, b.brand.from]);
    if (b.fix && b.fix.until > t) out.push(['fix', Math.ceil(b.fix.until - t), 0, b.fix.id]);
    return out.length ? out : undefined;
  }
  // [id, kind, x, y, hp, maxHp, enraged, link, facing]
  broadcastAdds() {
    this.addsDirty = false;
    this.emit({ t: 'adds', l: [...this.adds.values()].map(a => [a.id, a.kind, Math.round(a.x), Math.round(a.y), Math.round(a.hp), a.maxHp,
      a.enraged ? 1 : 0, a.link && this.adds.has(a.link) ? a.link : null, +a.facing.toFixed(2)]), c: +this.t.toFixed(3) });
  }
  broadcastParty() {
    const list = [];
    for (const [id, s] of this.ps) {
      if (s.left) continue;
      const mit = s.mits.reduce((m, x) => m * (1 - (x.kind === 'invuln' ? 1 : x.kind === 'living' ? 0 : x.pct)), 1);
      const debuffs = Object.keys(s.debuffs).filter(k => s.debuffs[k] > this.t).map(k => [k, Math.ceil(s.debuffs[k] - this.t)]);
      // heals over time on this player, for the party frames: [id, seconds left, caster]
      const hots = s.hots.map(h => [h.id, Math.max(1, Math.ceil((h.ticks - 1) * h.interval + h.next - this.t)), h.from]);
      list.push([id, Math.round(s.hp), s.maxHp, Math.round(s.shield), s.alive ? 1 : 0,
        s.dmgDownEnd > this.t ? Math.ceil(s.dmgDownEnd - this.t) : 0, s.vulnEnd > this.t ? Math.round(s.vuln * 100) : 0,
        Math.round((1 - mit) * 100), s.weakEnd > this.t ? 1 : 0, debuffs, Math.round(s.threat), hots]);
    }
    this.emit({ t: 'fps', ps: list });
  }
}

if (typeof module !== 'undefined') module.exports = { FIGHT, FightSim, segDist, playerBaseHp };
