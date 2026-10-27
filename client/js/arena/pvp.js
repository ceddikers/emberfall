// PvP Arena (phase A): the host-side match sim. Duels (1v1) and team fights (2v2) in a small open ring, no boss.
// Design note: docs/plans/2026-10-pvp-arena.md (the message protocol and what the client side needs).
//
// PvpSim extends FightSim only to reuse its player state, shields, mitigation, heals over time, pools and class hooks;
// nothing in FightSim changes. Everything PvP-only lives here. PvpHost is the RaidHost of a match: the sim, the bots
// (pvp-bots.js) and the routing of combat events. Works in the browser (host tab) and in Node (tools/pvp-sim.js).

const PVP = {
  RING: 'pvp_ring', RING_R: 380,   // the room: a plain circle (ARENA_DEFS entry added below)
  SPAWN_R: 250,                    // teams start on opposite sides, this far from the centre
  COUNTDOWN: 5,
  ROUND: { duel: 100, team: 130 }, // seconds of normal play; then SUDDEN seconds of sudden death
  SUDDEN: 30, SUDDEN_RAMP: 0.06,   // sudden death: damage taken +6% per second in it, healing received halved
  // Kit numbers are tuned against bosses: a player's hit is cut to DMG of it (and a tank's to TANK_DMG), and no single
  // hit takes more than HIT_CAP of the target's max health (no one-shots, an Ultimate included)
  DMG: 0.5, TANK_DMG: 0.7, HIT_CAP: 0.12,
  // each class's own PvP damage factor on top (bot-measured with tools/pvp-sim.js so every class lands near the same
  // damage per second in a duel; healers lower, as they also heal). Missing: 1.
  CLASS: { thermist: 0.46, ranger: 0.52, thresher: 0.74, gloomsworn: 0.7, bloodreaver: 0.72, marionettist: 0.75, shadowblade: 0.98,
    oathbroker: 0.72, runeguard: 0.78, driftblade: 0.96, ironpalm: 0.9, gorgemaw: 0.92, pyromancer: 0.89, bastion: 1.0,
    alembist: 0.6, cleric: 1.35, grovekeeper: 1.5, chronomancer: 1.35, threadweaver: 1.5, tidecaller: 1.3 },
  HEAL: 0.28, SHIELD: 0.35,          // heals (and heals over time, pools, vials) and shields given in PvP
  MIT_DUR: 6,                      // a damage cut lasts at most this long in PvP
  TEAM_HP: { tank: 1.0, healer: 1.15, dps: 1.15 },   // max health in PvP, a share of the raid value (playerBaseHp + gear)
};
if (typeof ARENA_DEFS !== 'undefined') ARENA_DEFS[PVP.RING] = { kind: 'circle', r: PVP.RING_R };

// Capture the flag (phase C): a long field with each side's flag on a stand at its own end (Gold Gate west, Ash Gate
// east). Touch the enemy flag at its stand to take it; bring it to your own stand while your own flag is home to score.
// A carrier moves at SLOW speed, and a leap, blink or teleport from an ability drops the flag where they took off (the
// plain dodge roll keeps it). A carrier who falls drops it where they fell. A dropped flag goes home at once when its
// own side touches it, or by itself after RETURN seconds; the other side can pick it up again. The fallen come back at
// their own end after RESPAWN seconds (STEP more for each death, at most MAX); no raising. First to CAPS wins. When the
// clock runs out the side ahead wins; level: OT seconds of overtime in which the next capture wins, then a draw.
const CTF = {
  FIELD: 'pvp_field', HW: 780, HH: 400, CORNER: 170,
  STAND_X: 640, SPAWN_X: 560, TOUCH: 44,
  CAPS: 3, ROUND: 300, OT: 60,
  RESPAWN: 5, STEP: 1, MAX: 9, GUARD: 0.6,   // GUARD: a fresh spawn can't touch a flag for this long (its client is still moving it)
  RETURN: 10, SLOW: 0.8,
};
if (typeof ARENA_DEFS !== 'undefined') ARENA_DEFS[CTF.FIELD] = { kind: 'rect', hw: CTF.HW, hh: CTF.HH, corner: CTF.CORNER };
PVP.spawnX = mode => (mode === 'ctf' ? CTF.SPAWN_X : PVP.SPAWN_R);   // (how far from the centre each side starts)

const PVP_DEF = { id: PVP.RING, name: 'The Arena', hp: { normal: 1, hard: 1 }, autoDmg: { normal: 0, hard: 0 }, script() {} };

class PvpSim extends FightSim {
  // opts: { mode: 'duel'|'team', teams: { [pid]: 0|1 }, seed }
  constructor(getPlayers, emit, opts = {}) {
    super(PVP_DEF, 'normal', getPlayers, emit, opts.seed || 1, {});
    this.pvp = true;
    this.pvpMode = opts.mode === 'team' ? 'team' : 'duel';
    this.teams = Object.assign({}, opts.teams || {});
    this.countdown = opts.countdown ?? PVP.COUNTDOWN;
    this.roundLen = PVP.ROUND[this.pvpMode];
    this.sudden = false; this.result = null; this.lastClock = -9;
    this.focus = {};   // what each player last hit (for a damage event that doesn't name its target)
    const b = this.boss; b.untargetable = true; b.hp = b.maxHp = 1; b.x = 0; b.y = 0;
    for (const s of this.ps.values()) { s.maxHp = s.hp = Math.round(s.maxHp * (PVP.TEAM_HP[s.role] || 1)); }
  }
  addPlayer(p) {
    super.addPlayer(p);
    if (this.teams && p.team != null && this.teams[p.id] == null) this.teams[p.id] = p.team;
  }
  teamOf(id) { return this.teams[id] ?? null; }
  foes(id) { const tm = this.teamOf(id); return super.alive().filter(p => this.teamOf(p.id) !== tm); }
  // inside a player's own event, "everyone" means their own team (party heals, party shields, the most hurt ally)
  alive() { const a = super.alive(); return this.ctxTeam == null ? a : a.filter(p => this.teamOf(p.id) === this.ctxTeam); }

  pull() {
    if (this.state !== 'countdown') return;
    this.state = 'live'; this.t = 0;
    this.emit({ t: 'pvpLive', round: this.roundLen, sudden: PVP.SUDDEN });
  }
  broadcastBoss() {}
  broadcastNext() {}
  end(result) { if (result === 'wipe') this.finish(null, 'ko'); }   // (both sides down on the same tick)

  tick(dt) {
    super.tick(dt);
    if (this.state !== 'live') return;
    const up = [0, 1].map(tm => super.alive().filter(p => this.teamOf(p.id) === tm).length);
    if (!up[0] || !up[1]) return this.finish(up[0] ? 0 : up[1] ? 1 : null, 'ko');
    if (!this.sudden && this.t >= this.roundLen) { this.sudden = true; this.emit({ t: 'pvpSudden', dur: PVP.SUDDEN }); }
    if (this.t >= this.roundLen + PVP.SUDDEN) {
      // time: the side with more of its health left (as a share) wins; within 2% it's a draw
      const frac = tm => { const l = super.players().filter(p => this.teamOf(p.id) === tm); return l.reduce((a, p) => a + (p.s.alive ? p.s.hp / p.s.maxHp : 0), 0) / Math.max(1, l.length); };
      const d = frac(0) - frac(1);
      return this.finish(Math.abs(d) < 0.02 ? null : d > 0 ? 0 : 1, 'time');
    }
    if (this.t - this.lastClock >= 1) { this.lastClock = this.t; this.emit({ t: 'pvpClock', left: Math.max(0, Math.ceil(this.roundLen + (this.sudden ? PVP.SUDDEN : 0) - this.t)), sd: this.sudden ? 1 : 0 }); }
  }

  finish(winner, reason) {
    if (this.state !== 'live') return;
    this.state = 'over'; this.result = { winner, reason, time: Math.round(this.t * 10) / 10 };
    this.mechs.clear(); this.puddles = []; this.healPools = []; this.events = [];
    this.weaveClear();
    for (const s of this.ps.values()) s.hots = [];
    this.broadcastParty();
    this.emit({ t: 'pvpEnd', winner, reason, time: this.result.time, teams: this.teams, stats: this.stats });
  }

  suddenMult() { return this.sudden ? 1 + PVP.SUDDEN_RAMP * Math.max(0, this.t - this.roundLen) : 1; }

  onEvent(pid, ev) {
    const s = this.ps.get(pid);
    if (!s || !s.alive || this.state !== 'live' || !ev) return;
    const tm = this.teamOf(pid), foe = id => typeof id === 'number' && this.ps.has(id) && this.teamOf(id) !== tm;
    switch (ev.type) {
      case 'damage': return this.pvpHit(pid, s, ev);
      case 'lb': case 'raise': case 'targetDebuff': case 'brand': case 'taunt': return;   // no Limit Break, no raising, nothing aimed at a boss
      case 'rewind': if (ev.target !== 'party') { const ts = this.ps.get(this.resolveTarget(pid, ev.target)); if (!ts || !ts.alive) return; } ev = Object.assign({}, ev, { dur: 0 }); break;
      case 'heal': case 'hot': ev = Object.assign({}, ev, { amount: (ev.amount || 0) * PVP.HEAL }); break;
      case 'shield': ev = Object.assign({}, ev, { amount: (ev.amount || 0) * PVP.SHIELD }); break;
      case 'mit': ev = Object.assign({}, ev, { dur: Math.min(PVP.MIT_DUR, ev.dur || 5) }); break;
      case 'pool': ev = Object.assign({}, ev, { amount: (ev.amount || 0) * PVP.HEAL }); break;
      case 'splash': ev = Object.assign({}, ev, { amount: (ev.amount || 0) * PVP.HEAL, sh: (ev.sh || 0) * PVP.SHIELD, sht: (ev.sht || 0) * PVP.SHIELD, pa: (ev.pa || 0) * PVP.HEAL, ps: (ev.ps || 0) * PVP.SHIELD, pct: 0 }); break;
    }
    if (foe(ev.target)) ev = Object.assign({}, ev, { target: pid });   // help aimed at an opponent lands on yourself
    this.ctxTeam = tm;
    try { super.onEvent(pid, ev); } finally { this.ctxTeam = null; }
  }

  // a blow from pid: on the opponent it names (ev.tgt), else the one pid last hit, else the nearest in reach
  pvpHit(pid, s, ev) {
    const tm = this.teamOf(pid);
    let tid = typeof ev.tgt === 'number' ? ev.tgt : null;
    if (tid == null || this.teamOf(tid) === tm) tid = this.focus[pid];
    let target = tid != null ? this.foes(pid).find(p => p.id === tid) : null;
    if (!target) {
      const me = super.players().find(p => p.id === pid); if (!me) return;
      let bd = 700; for (const p of this.foes(pid)) { const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < bd) { bd = d; target = p; } }
    }
    if (!target) return;
    this.focus[pid] = target.id;
    const cls = (super.players().find(p => p.id === pid) || {}).cls;
    let amt = Math.max(0, Math.min(15000, Number(ev.amount) || 0)) * (s.role === 'tank' ? PVP.TANK_DMG : PVP.DMG) * (PVP.CLASS[cls] ?? 1);
    if (s.dmgDownEnd > this.t) amt *= 1 - FIGHT.DMG_DOWN;
    amt = Math.min(amt, target.s.maxHp * PVP.HIT_CAP) * this.suddenMult();
    const before = target.s.hp;
    const dealt = this.damagePlayer(target, amt, { scaled: true, kind: 'pvp', n: ev.ab && ev.ab.name ? ev.ab.name : undefined });
    const st = this.stats[pid]; st.damage += dealt; this.lastHit[pid] = this.t;
    if (ev.ub) st.burst++;
    this.emit({ t: 'phit', from: pid, to: target.id, a: Math.round(dealt), hp: Math.max(0, Math.round(target.s.hp)), ko: before > 0 && !target.s.alive ? 1 : 0 });
  }

  // heals, shields and pools never reach the other team (a pool or a heal over time ticks on whoever stands in it)
  applyHeal(fromId, tid, amount, partyWide) {
    if (partyWide) { for (const p of super.alive()) if (this.teamOf(p.id) === this.teamOf(fromId)) super.applyHeal(fromId, p.id, amount, false); return; }
    if (this.teamOf(tid) !== this.teamOf(fromId)) return;
    super.applyHeal(fromId, tid, this.sudden ? amount * 0.5 : amount, false);
  }
  giveShield(from, tid, ts, amount, dur) { if (this.teamOf(tid) === this.teamOf(from)) super.giveShield(from, tid, ts, amount, dur); }
}

// ---------------------------------------------------------------------------------------------------------------------
// Capture the flag: a team bout (2 v 2) with flags, captures and respawns instead of a knockout. Messages (host to all):
//   ctf      { caps: [gold, ash], f: [[state 0 home|1 carried|2 dropped, x, y, carrier id|null, return secs], x2] }
//            on every change and once a second
//   ctfEv    { k: 'take'|'drop'|'return'|'cap', tm: the flag's side, id: who (null: it went home by itself) }
//   ctfDown  { id, secs }   a player fell; back in secs
//   ctfSpawn { id, x, y, a } a player is back at their end (a human's client moves itself there)
//   pvpSudden { dur, ot: 1 } overtime; pvpEnd reason 'caps' (or 'time' for a draw after overtime)
class CtfSim extends PvpSim {
  constructor(getPlayers, emit, opts = {}) {
    super(getPlayers, emit, Object.assign({}, opts, { mode: 'team' }));
    this.pvpMode = 'ctf'; this.roundLen = CTF.ROUND;
    ARENA.use(CTF.FIELD);   // (FightSim put up its own room, the ring)
    this.caps = [0, 0]; this.ot = false;
    this.flags = [0, 1].map(tm => ({ tm, st: 'home', x: this.stand(tm).x, y: 0, by: null, ret: 0 }));
    this.respawnAt = {}; this.deathN = {}; this.guard = {}; this.ctfDirty = true; this.lastCtf = -9;
  }
  stand(tm) { return { x: (tm ? 1 : -1) * CTF.STAND_X, y: 0 }; }
  spawnOf(id) {
    const tm = this.teamOf(id), mine = Object.keys(this.teams).filter(k => this.teams[k] === tm), k = Math.max(0, mine.indexOf(String(id)));
    return { x: (tm ? 1 : -1) * CTF.SPAWN_X, y: (k - (mine.length - 1) / 2) * 90, a: tm ? Math.PI : 0 };
  }
  carrying(id) { return this.flags.find(f => f.st === 'carried' && f.by === id) || null; }
  end() {}   // (no knockout here: the fallen come back)

  ctfEv(k, tm, id) { this.ctfDirty = true; this.emit({ t: 'ctfEv', k, tm, id: id ?? null }); }
  dropFlag(f, x, y) { const by = f.by; f.st = 'dropped'; f.by = null; f.x = x; f.y = y; ARENA.clamp(f, 30); f.ret = this.t + CTF.RETURN; this.ctfEv('drop', f.tm, by); }
  homeFlag(f, id, k) { const s = this.stand(f.tm); f.st = 'home'; f.by = null; f.x = s.x; f.y = s.y; this.ctfEv(k, f.tm, id); }
  takeFlag(f, p) { f.st = 'carried'; f.by = p.id; f.x = p.x; f.y = p.y; this.ctfEv('take', f.tm, p.id); }
  // a carrier who leaps, blinks or teleports lets go of the flag where they took off (main.js and pvp-bots.js call this)
  ctfDrop(id) { const f = this.carrying(id); if (f && this.state === 'live') this.dropFlag(f, f.x, f.y); }
  sendCtf() {
    this.ctfDirty = false; this.lastCtf = this.t;
    this.emit({ t: 'ctf', caps: this.caps.slice(), f: this.flags.map(f => [f.st === 'home' ? 0 : f.st === 'carried' ? 1 : 2, Math.round(f.x), Math.round(f.y), f.by, f.st === 'dropped' ? Math.max(0, +(f.ret - this.t).toFixed(1)) : 0]) });
  }

  tick(dt) {
    FightSim.prototype.tick.call(this, dt);   // (not PvpSim's: no knockout, no sudden death)
    if (this.state !== 'live') return;
    const t = this.t;
    // the fallen: their flag drops, and they come back at their own end after a while
    for (const [id, s] of this.ps) {
      if (s.left) continue;
      if (!s.alive && this.respawnAt[id] == null) {
        const n = this.deathN[id] = (this.deathN[id] || 0) + 1, secs = Math.min(CTF.MAX, CTF.RESPAWN + CTF.STEP * (n - 1));
        this.respawnAt[id] = t + secs;
        const f = this.carrying(id); if (f) this.dropFlag(f, f.x, f.y);
        this.emit({ t: 'ctfDown', id, secs });
      } else if (!s.alive && t >= this.respawnAt[id]) {
        delete this.respawnAt[id];
        this.revive(id, s, 1, id);
        s.weakEnd = 0; s.dmgDownEnd = 0; for (const k in s.debuffs) s.debuffs[k] = 0;
        const sp = this.spawnOf(id); this.guard[id] = t + CTF.GUARD;
        this.emit({ t: 'ctfSpawn', id, x: Math.round(sp.x), y: Math.round(sp.y), a: +sp.a.toFixed(2) });
      } else if (s.alive && this.respawnAt[id] != null) delete this.respawnAt[id];
    }
    // the flags
    const up = this.alive().filter(p => !(this.guard[p.id] > t)), near = (p, x, y) => Math.hypot(p.x - x, p.y - y) <= CTF.TOUCH;
    for (const f of this.flags) {
      if (f.st === 'carried') {
        const c = this.alive().find(p => p.id === f.by);
        if (!c) { this.dropFlag(f, f.x, f.y); continue; }
        f.x = c.x; f.y = c.y;
        const tm = 1 - f.tm, home = this.stand(tm);
        if (this.flags[tm].st === 'home' && near(c, home.x, home.y)) {
          this.caps[tm]++; this.stats[c.id].caps = (this.stats[c.id].caps || 0) + 1;
          this.homeFlag(f, c.id, 'cap');
          if (this.caps[tm] >= CTF.CAPS || this.ot) { this.sendCtf(); return this.finish(tm, 'caps'); }
        }
      } else if (f.st === 'dropped') {
        if (t >= f.ret) { this.homeFlag(f, null, 'return'); continue; }
        const p = up.find(q => near(q, f.x, f.y) && !this.carrying(q.id));
        if (!p) continue;
        if (this.teamOf(p.id) === f.tm) this.homeFlag(f, p.id, 'return'); else this.takeFlag(f, p);
      } else {
        const s = this.stand(f.tm), p = up.find(q => this.teamOf(q.id) !== f.tm && near(q, s.x, s.y) && !this.carrying(q.id));
        if (p) this.takeFlag(f, p);
      }
    }
    // the clock: ahead at the end wins; level, overtime (the next capture wins), then a draw
    if (!this.ot && t >= this.roundLen) {
      if (this.caps[0] !== this.caps[1]) { this.sendCtf(); return this.finish(this.caps[0] > this.caps[1] ? 0 : 1, 'caps'); }
      this.ot = true; this.emit({ t: 'pvpSudden', dur: CTF.OT, ot: 1 });
    }
    if (this.ot && t >= this.roundLen + CTF.OT) { this.sendCtf(); return this.finish(null, 'time'); }
    if (t - this.lastClock >= 1) { this.lastClock = t; this.emit({ t: 'pvpClock', left: Math.max(0, Math.ceil(this.roundLen + (this.ot ? CTF.OT : 0) - t)), sd: this.ot ? 1 : 0 }); }
    if (this.ctfDirty || t - this.lastCtf >= 1) this.sendCtf();
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The host side of a match: PvpSim + bots. opts: {
//   mode: 'duel'|'team',
//   humans: () => [{ id, name, cls, spec, role, x, y, a, gear }]   (as RaidHost; positions owned by their clients)
//   teams: { [humanId]: 0|1 },
//   bots: [{ cls: 'ranger', spec?: 'id'|'base', team: 0|1 }] (filling the empty slots),
//   emit(msg), seed }
const PVP_BOT_NAMES = ['Brom', 'Ilsa', 'Tamsin', 'Oswin'];
class PvpHost {
  constructor(opts) {
    this.mode = opts.mode === 'team' || opts.mode === 'ctf' ? opts.mode : 'duel';
    this.humans = opts.humans || (() => []);
    this.emitOut = opts.emit || (() => {});
    this.t = 0; this.lastBotBroadcast = -1;
    this.partyBuffs = [[], []];   // per team: { kind, value, end }
    let s = (opts.seed || 1) >>> 0;
    this.rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    ARENA.use(this.mode === 'ctf' ? CTF.FIELD : PVP.RING);
    const teams = Object.assign({}, opts.teams || {});
    this.bots = (opts.bots || []).map((b, i) => { const bot = this.makeBot(b, i); teams[bot.id] = b.team ? 1 : 0; return bot; });
    // spawns: team 0 on the left, team 1 on the right; a pair stands a little apart
    this.spawns = {};
    const ids = [...this.humans().map(p => p.id), ...this.bots.map(b => b.id)];
    for (const tm of [0, 1]) {
      const mine = ids.filter(id => teams[id] === tm);
      mine.forEach((id, k) => { this.spawns[id] = { x: (tm ? 1 : -1) * PVP.spawnX(this.mode), y: (k - (mine.length - 1) / 2) * 90, a: tm ? Math.PI : 0 }; });
    }
    for (const b of this.bots) Object.assign(b, this.spawns[b.id] || {});
    this.sim = new (this.mode === 'ctf' ? CtfSim : PvpSim)(() => this.allPlayers(), msg => this.onSimMsg(msg), { mode: this.mode, teams, seed: opts.seed });
    this.emit({ t: 'pvpStart', mode: this.mode, ring: PVP.RING_R, arena: this.mode === 'ctf' ? CTF.FIELD : PVP.RING, teams, cd: this.sim.countdown, round: this.sim.roundLen, sudden: PVP.SUDDEN,
      spawns: Object.entries(this.spawns).map(([id, p]) => [Number(id), Math.round(p.x), Math.round(p.y), +p.a.toFixed(2)]),
      bots: this.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role })) });
  }
  makeBot(entry, i) {
    const cls = CLASSES.find(c => c.id === entry.cls);
    if (!cls) throw new Error('PvpHost: no class ' + entry.cls);
    const specs = (typeof SPECS !== 'undefined' && SPECS[cls.id]) || [];
    const spec = entry.spec ? (entry.spec === 'base' ? null : (specs.find(s => s.id === entry.spec) || {}).id || null)
      : (specs.length ? [null, ...specs.map(s => s.id)][Math.floor(this.rng() * (specs.length + 1))] : null);
    const bot = { id: 1000 + i, name: entry.name || PVP_BOT_NAMES[i % PVP_BOT_NAMES.length], cls, spec, role: cls.role, bot: true, slot: i, team: entry.team ? 1 : 0,
      x: 0, y: 0, a: 0, moving: false, plan: null, nextThink: 0, taken: [], healTarget: null, nextAct: 0, strafe: this.rng() < 0.5 ? 1 : -1 };
    bot.actor = new CombatActor(cls, bot, PvpBots.world(this, bot), this.rng);
    return bot;
  }
  allPlayers() {
    return [...this.humans(), ...this.bots.map(b => ({ id: b.id, name: b.name, cls: b.cls.id, spec: b.spec, role: b.role, x: b.x, y: b.y, a: b.a, bot: true }))];
  }
  emit(msg) { this.emitOut(msg); }
  get state() { return this.sim.state; }
  get result() { return this.sim.result; }

  tick(dt) {
    this.t += dt;
    this.sim.tick(dt);
    for (const l of this.partyBuffs) for (let i = l.length - 1; i >= 0; i--) if (l[i].end <= this.sim.t) l.splice(i, 1);
    if (this.sim.state === 'live') PvpBots.tick(this, dt);
    if (this.t - this.lastBotBroadcast >= 0.1 && this.bots.length) {
      this.lastBotBroadcast = Math.max(this.lastBotBroadcast + 0.1, this.t - 0.05);
      this.emit({ t: 'bots', b: this.bots.map(b => [b.id, Math.round(b.x), Math.round(b.y), +b.a.toFixed(2), b.moving ? 1 : 0]), c: +this.t.toFixed(3) });
    }
  }
  onSimMsg(msg) {
    if (msg.t === 'ctfSpawn') { const bot = this.bots.find(b => b.id === msg.id); if (bot) Object.assign(bot, { x: msg.x, y: msg.y, a: msg.a, down: false, plan: null, nextThink: 0, moving: false }); }
    if (msg.t === 'fev') { const bot = this.bots.find(b => b.id === msg.id); if (bot && ['perfect', 'reflect', 'read', 'shieldEnd', 'eat', 'ledger', 'hollow'].includes(msg.k)) bot.actor.notify(msg.k, msg); }
    if (msg.t === 'pdmg') { const bot = this.bots.find(b => b.id === msg.id); if (bot) { bot.taken.push({ t: this.sim.t, a: msg.a }); while (bot.taken.length && bot.taken[0].t < this.sim.t - 30) bot.taken.shift(); if (msg.a > 0) bot.actor.notify('taken', msg); } }
    this.emit(msg);
  }
  // a combat event from a player (a human's kit through the network, or a bot's)
  onPlayerEvent(pid, ev) {
    if (!ev) return;
    if (ev.type === 'partyBuff') {
      const tm = this.sim.teamOf(pid); if (tm == null || this.sim.state !== 'live') return;
      this.partyBuffs[tm].push({ kind: ev.kind, value: ev.value, end: this.sim.t + ev.dur });
      this.emit({ t: 'pbuff', kind: ev.kind, value: ev.value, dur: ev.dur, from: pid, team: tm });
      return;
    }
    if (ev.type === 'allyBuff') return;   // (chosen-ally buffs are a raid tool: none in PvP)
    this.sim.onEvent(pid, ev);
  }
  teamMods(id) {
    const m = { dmg: 0, crit: 0, haste: 0 }, tm = this.sim.teamOf(id);
    for (const b of this.partyBuffs[tm] || []) if (b.end > this.sim.t) m[b.kind] = Math.max(m[b.kind] || 0, b.value);
    return m;
  }
}

if (typeof module !== 'undefined') module.exports = { PVP, CTF, PvpSim, CtfSim, PvpHost, PVP_DEF };
