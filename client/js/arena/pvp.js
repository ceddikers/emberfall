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
    alembist: 0.6, cleric: 1.35, grovekeeper: 1.5, chronomancer: 1.35, threadweaver: 1.5 },
  HEAL: 0.28, SHIELD: 0.35,          // heals (and heals over time, pools, vials) and shields given in PvP
  MIT_DUR: 6,                      // a damage cut lasts at most this long in PvP
  TEAM_HP: { tank: 1.0, healer: 1.15, dps: 1.15 },   // max health in PvP, a share of the raid value (playerBaseHp + gear)
};
if (typeof ARENA_DEFS !== 'undefined') ARENA_DEFS[PVP.RING] = { kind: 'circle', r: PVP.RING_R };

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
    for (const s of this.ps.values()) { s.threat = 0; s.maxHp = s.hp = Math.round(s.maxHp * (PVP.TEAM_HP[s.role] || 1)); }
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
      case 'splash': ev = Object.assign({}, ev, { amount: (ev.amount || 0) * PVP.HEAL, sh: (ev.sh || 0) * PVP.SHIELD, pa: (ev.pa || 0) * PVP.HEAL, ps: (ev.ps || 0) * PVP.SHIELD, pct: 0 }); break;
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
// The host side of a match: PvpSim + bots. opts: {
//   mode: 'duel'|'team',
//   humans: () => [{ id, name, cls, spec, role, x, y, a, gear }]   (as RaidHost; positions owned by their clients)
//   teams: { [humanId]: 0|1 },
//   bots: [{ cls: 'ranger', spec?: 'id'|'base', team: 0|1 }] (filling the empty slots),
//   emit(msg), seed }
const PVP_BOT_NAMES = ['Brom', 'Ilsa', 'Tamsin', 'Oswin'];
class PvpHost {
  constructor(opts) {
    this.mode = opts.mode === 'team' ? 'team' : 'duel';
    this.humans = opts.humans || (() => []);
    this.emitOut = opts.emit || (() => {});
    this.t = 0; this.lastBotBroadcast = -1;
    this.partyBuffs = [[], []];   // per team: { kind, value, end }
    let s = (opts.seed || 1) >>> 0;
    this.rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    ARENA.use(PVP.RING);
    const teams = Object.assign({}, opts.teams || {});
    this.bots = (opts.bots || []).map((b, i) => { const bot = this.makeBot(b, i); teams[bot.id] = b.team ? 1 : 0; return bot; });
    // spawns: team 0 on the left, team 1 on the right; a pair stands a little apart
    this.spawns = {};
    const ids = [...this.humans().map(p => p.id), ...this.bots.map(b => b.id)];
    for (const tm of [0, 1]) {
      const mine = ids.filter(id => teams[id] === tm);
      mine.forEach((id, k) => { this.spawns[id] = { x: (tm ? 1 : -1) * PVP.SPAWN_R, y: (k - (mine.length - 1) / 2) * 90, a: tm ? Math.PI : 0 }; });
    }
    for (const b of this.bots) Object.assign(b, this.spawns[b.id] || {});
    this.sim = new PvpSim(() => this.allPlayers(), msg => this.onSimMsg(msg), { mode: this.mode, teams, seed: opts.seed });
    this.emit({ t: 'pvpStart', mode: this.mode, ring: PVP.RING_R, arena: PVP.RING, teams, cd: this.sim.countdown, round: this.sim.roundLen, sudden: PVP.SUDDEN,
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

if (typeof module !== 'undefined') module.exports = { PVP, PvpSim, PvpHost, PVP_DEF };
