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
  DMG_DOWN: 0.10,        // damage dealt penalty, from an avoidable hit of a move that opts in (ddown: true on the mech, puddle, tether, zone...)
  DMG_DOWN_DUR: 10,
  VULN: 0.25,            // damage taken up per stack, from every avoidable hit
  VULN_DUR: 15,
  // Threat is for adds only: damage × (TANK_THREAT for tanks) × the event's own multiplier (clamped to EV_THREAT_MAX), kept
  // per add and faded (THREAT_FADE of it per second), so what counts is the last ~20 s. The boss has no threat: he stays on
  // the tank who taunted last (or, by default, the tank he is on); see tank(). A taunt on an add sets your threat on it to
  // the top + TAUNT_LEAD and fixes it on you for TAUNT_ADD_FIX s. TAUNT_CD matches TAUNT.cd in kits.js (the host allows
  // 1 s of slack).
  TANK_THREAT: 2.75,
  THREAT_FADE: 0.05,
  EV_THREAT_MAX: 3,
  TAUNT_LEAD: 1.1, TAUNT_ADD_FIX: 6, TAUNT_CD: 20,
  // Raise sickness: a raised player deals and heals PCT less for DUR s. A cast raise is the light kind, an instant raise
  // (a talent, Rewind, a Draught) the heavy one; every earlier death of the party this pull adds PER_DEATH to both, up to
  // MAX. The Limit Break's raise leaves none.
  SICK: { cast: { pct: 0.15, dur: 20 }, instant: { pct: 0.3, dur: 30 }, PER_DEATH: { pct: 0.05, dur: 5 }, MAX: { pct: 0.5, dur: 45 } },
  PERFECT_WINDOW: 0.8,   // Bastion's Brace
  READ_WINDOW: 0.4,      // Ironpalm's Read ('parry'): a hit in its first 0.4 s is caught (halved, and the kit hears 'read')
  SLOWED: 0.55,          // move speed while 'slowed' (webs, venom); 'rooted' stops movement and dashes
  // The boss files are written in "big" numbers; this brings boss HP, player HP and every hit down to the
  // game's small-number scale (same factor as ENGINE.NUM_SCALE, which scales potency).
  NUM_SCALE: 0.05,
  // Limit Break: a shared party gauge of three bars (BAR each). A mechanic that resolves with no avoidable hits and
  // nothing failed adds CLEAN; a damage check met, or a heal check with nobody lost, adds CHECK. Raw damage adds nothing.
  //   TANK: party damage taken down by this much for TANK_DUR s   HEAL: party healed by this share of max health
  //   (three bars, from any role, also raise the fallen at RAISE)   DPS: a blow worth this share of the boss's max health
  LB: { BAR: 100, CLEAN: 4, CHECK: 70, TANK: [0, 0.2, 0.35, 0.5], TANK_DUR: 8, HEAL: [0, 0.3, 0.6, 1], RAISE: 0.5, DPS: [0, 0.008, 0.018, 0.03] },
  // Recovering (Hard): after a death the boss's hits land lighter for DUR s (CUT less) so the party can raise, shown on the HUD; it can
  // start again only COOL s after it ends. A raised player is untouchable for REVIVE_SAFE s.
  REC: { DUR: 12, CUT: 0.3, COOL: 12 }, REVIVE_SAFE: 2.5,
  TANK_HP: 32000, HP: 21000,   // before NUM_SCALE
  // Each party slot's own colour (Hard's own-colour circles: Burial Rites), in the order the party frames list
  // everyone (tank, healer, then the rest by id: FightSim.slotOf). None of them is red or blue, which say
  // danger and share on the floor (safe floor has no colour).
  SLOTS: ['#5fe36a', '#b26cff', '#ff6fd2', '#f2eee4'],
};
const playerBaseHp = role => Math.round((role === 'tank' ? FIGHT.TANK_HP : FIGHT.HP) * FIGHT.NUM_SCALE);

// distance from (px, py) to the segment (ax, ay)-(bx, by)
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

// A Time Stop on the boss (a Chronomancer's Time Reversal, FightSim.pauseBoss): at most MAX s long, and not again
// until GUARD s after the last one ended
const BOSS_PAUSE = { MAX: 2.5, GUARD: 20 };

class FightSim {
  // getPlayers: () => [{ id, name, role, cls, x, y, a }]. emit(msg) broadcasts to everyone (incl. host).
  // opts: { hpPct } extra max HP for everyone (the gear party bonus, items.js)
  constructor(def, mode, getPlayers, emit, seed = Date.now(), opts = {}) {
    this.def = def; this.mode = mode; this.hard = mode === 'hard';
    this.hpPct = Math.max(0, Math.min(0.1, opts.hpPct || 0));
    ARENA.use(def.id);
    this.getPlayers = getPlayers; this.emit = emit;
    this.rngState = (seed >>> 0) || 1;
    // opts.waitPull: no countdown; the party has the room to itself until someone hits the boss ('prepull', see pull())
    this.t = 0; this.state = opts.waitPull ? 'prepull' : 'countdown'; this.countdown = 8;
    // practice: start at this course (phase) number; the ones before it are passed over at the pull (course())
    this.skipTo = opts.practiceFrom > 1 ? Math.floor(opts.practiceFrom) : 0;
    this.recoverEnd = -99;
    this.lb = 0; this.lbUsedAt = -99; this.avoidCount = 0;   // the Limit Break gauge (FIGHT.LB), and avoidable hits so far
    this.events = []; this.mechs = new Map(); this.nextMechId = 1; this.puddles = [];
    this.tethers = new Map(); this.adds = new Map(); this.zones = []; this.addsDirty = false;
    this.rollers = new Map(); this.reels = new Map(); this.sweeps = new Map();
    this.edgeGrace = 0;   // a moving wall (Volkar) leaves people outside it for a moment; don't count that as a fall
    this.healPools = [];  // players' healing pools on the floor (Moonwell): { from, x, y, r, amount, ticks, next, interval }
    this.tickers = [];    // per-tick hooks a boss script adds with ticker() (the Hollow King's lanterns and Doom)
    // the room: solid props (casks, pillars, stones...) and lasting floor changes (rubble, grease, broken-off ground).
    // Host-owned; the whole list goes out in a 'props' message when anything changes, and every 3 s anyway.
    this.props = []; this.floor = []; this.floorVer = 0; this.propsDirty = false; this.lastPropsSend = -99; this.fires = new Map();
    this.phase = 1; this.hpTriggers = [];
    // HP gates (shown as ticks on the boss bar), and the wall a course can raise at its gate (see course()): wallHp is the floor the boss's health cannot go below
    this.gates = (def.gates || []).map(g => (typeof g === 'number' ? { f: g, push: 0, wall: 0 } : { f: g.f, push: g.push ? 1 : 0, wall: g.wall ? 1 : 0 }));
    this.wall = null; this.wallHp = null;
    // Vulnerability per avoidable hit: a boss can make it bite harder (def.vuln)
    this.vulnStep = def.vuln || FIGHT.VULN;
    this.ps = new Map();
    const n = Math.max(1, Math.min(4, getPlayers().length));
    this.scale = { hp: FIGHT.NUM_SCALE, dmg: [0.6, 0.8, 0.92, 1][n - 1] * FIGHT.NUM_SCALE, n };
    const hp = Math.round(def.hp[mode] * this.scale.hp);
    // def.spawn: where the boss stands at the pull; def.anchor: it never walks after the tank (Volkar holds the middle)
    const sp = def.spawn || { x: 0, y: -40 };
    this.boss = {
      hp, maxHp: hp, x: sp.x, y: sp.y, facing: Math.PI / 2, target: null, cast: null, anim: null, untargetable: false,
      vuln: 0, vulnEnd: 0, autoAt: 4, moveTo: null, speed: 140, dmgUp: 0, anchor: !!def.anchor,
    };
    this.stats = {}; this.lastHit = {}; this.saveAt = {};   // (lastHit: when each player last hurt the boss or an add; saveAt: when an ally was last pulled back from the brink)
    for (const p of getPlayers()) this.addPlayer(p);
    this.lastBroadcast = -1; this.lastPartyBroadcast = -1;
    // what stands in the room from the start (Skitterra's pillars, the Hollow King's braziers, Volkar's stones)
    if (def.room) def.room(this);
  }

  rng() { let t = (this.rngState += 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
  shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // casts are faster on Hard
  ct(sec) { return this.hard ? sec * 0.85 : sec; }

  addPlayer(p) {
    if (this.ps.has(p.id)) return;
    // gear (humans only, already capped by the host): flat HP and a little damage reduction
    if (p.cls === 'kenseier') this.postureOn = true;   // (a Kenseier in the party: the boss carries Posture, KENSEI_HOST at the end of this file)
    const gear = p.gear || {};
    const maxHp = Math.round((playerBaseHp(p.role) + Math.max(0, Math.min(180, gear.hp || 0))) * (1 + (this.hpPct || 0)));   // (items.js GEAR_CAPS)
    this.ps.set(p.id, { id: p.id, role: p.role, hp: maxHp, maxHp, alive: true, def: Math.max(0, Math.min(0.11, (gear.def || 0) / 1000)), shield: 0, shieldEnd: 0, shieldMax: 0, shieldFrom: null, shieldTag: null,
      mits: [], vuln: 0, vulnEnd: 0, dmgDownEnd: 0, weakEnd: 0, hots: [], debuffs: {}, hist: [], diedAt: -99 });
    this.stats[p.id] = { damage: 0, healing: 0, overheal: 0, taken: 0, mitigated: 0, deaths: 0, avoidable: 0,
      // contribution tracking (scoring.js): seconds as the boss's target, seconds of damage landed on it, towers/stacks soaked, raises given,
      // allies lifted from low health, perfect blocks/reads, tankbusters taken, Ultimates and burst-window hits, wards put up on allies,
      // damage dealt while the boss was in its last 20%
      aggro: 0, up: 0, soaked: 0, raises: 0, saves: 0, perfects: 0, busters: 0, ults: 0, burst: 0, wards: 0, closer: 0,
      name: p.name, role: p.role, cls: p.cls, bot: !!p.bot };
  }
  removePlayer(id) { const s = this.ps.get(id); if (s) { s.alive = false; s.left = true; } }

  // ---------------------------------------------------------------- scheduling
  // name: the step's player-facing name (its cast name), for the upcoming-moves feed (bnext); unnamed steps don't show
  // (step: laid by course(), the script's own timeline, which a Time Stop slides later: pauseBoss)
  at(t, fn, name) { this.events.push({ t, fn, phase: this.layPhase ?? this.phase, name, step: !!this.layStep }); this.events.sort((a, b) => a.t - b.t); }
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
  // An authored, non-looping fight is a chain of courses (acts). A course lays all its steps out at once, so the
  // upcoming-moves feed sees every one of them.
  //   o.sets: [[[delay, fn, name], ...], ...]   steps in sets; the gap before a set's first step is the calm between sets
  //   o.until: the boss HP fraction that ends it. It moves on at the next set seam (o.seam s at most, default 8), so a
  //     set never stops half-way; the next course is laid out at once, so the feed reads across the join.
  //   o.closing: a slow party's soft enrage. Once the sets run out, these steps run again and again, each pass with
  //     o.ramp (default +10%) more boss damage, shown under the boss bar. (Without `until`, the course just ends.)
  //   o.next(from): lays out what follows (another course), starting at `from`
  //   o.onStart(): runs as the course begins (clearing the floor, moving the boss...)
  // A course without `until` or `closing` ends with its last step and goes straight on to next().
  //
  // Set 2 systems (a boss opts in; the set 1 fights use only the ticks):
  //   GATES  every o.until is a tick on the boss bar. A boss def may list them up front (def.gates: [0.75, 0.5, ...], numbers or
  //     {f, push, wall}) so the whole fight's acts show from the pull; a gate a course lays out that is not listed is added then.
  //   PUSH   o.push: true (or def.push) on a course with an `until`: reaching the gate cuts the act's remaining steps (and its
  //     closing passes) at once and the next act begins now, instead of at the next set seam. Telegraphs already on the floor
  //     still resolve. A step's follow-ups scheduled with f.after (not afterKeep) die with the act, so a move that must finish
  //     after the cut lays its follow-ups with afterKeep. A party that is behind still gets the closing passes, up to the gate.
  //   WALL   o.wall: { label, run(f), until: 'resolved' | fn(f) -> bool, timeout } on a course with an `until`. From the act's start the boss
  //     cannot be taken below that gate (damage is clamped there). When the gate is reached it is sealed: invulnerable, a shield
  //     drawn round it and a pip with the label on its bar. The act's remaining steps are cut and wall.run(f) lays out the
  //     mechanic that breaks the seal; that mechanic calls f.wallDown() when it resolves ('resolved'), or the seal opens when
  //     fn(f) returns true (polled every tick). timeout (default 45 s) opens it anyway so a script bug can't hold a fight. Then
  //     the act ends as usual (next / push / seam). A course with a wall needs a next() unless the fight is meant to end there.
  course(o, from = this.t) {
    const ph = this.courseN = (this.courseN || 0) + 1;
    if (o.until != null) this.addGate(o.until, o);
    // practice from a later phase: this course is passed over at once. Its onStart still runs (the room is set as it
    // would be by then), and the boss will start at the health the asked-for course begins at.
    if (this.skipTo && ph < this.skipTo && o.next) {
      if (o.onStart) o.onStart();
      if (o.until != null) this.skipHp = o.until;
      this.phase = ph;
      this.layPhase = null;
      return o.next(from);
    }
    const cur = { ph, seams: [], o, done: false };
    this.layPhase = ph;
    if (ph > this.phase) this.atKeep(from - 0.001, () => this.startCourse(cur));
    else this.startCourse(cur, true);
    let t = from;
    this.layStep = true;
    for (const set of o.sets) {
      if (!set || !set.length) continue;
      cur.seams.push(t + set[0][0]);
      for (const [dt, fn, name] of set) { t += dt; if (fn) this.at(t, fn, name); }
    }
    cur.end = t;
    const closing = o.closing && o.closing.length ? o.closing : null;
    if (closing) {
      // each pass lays out the next one 20 s before it ends, so the feed sees across the join
      // (sh0: a Time Stop in between slides the next pass by as much as it slid this one: pauseBoss)
      const pass = (start, k) => {
        this.layPhase = ph; this.layStep = true;
        const sh0 = this.pauseShift || 0;
        cur.seams.push(start + closing[0][0]);
        const ramp = o.ramp ?? 0.1;
        if (ramp) this.at(start + closing[0][0] - 0.01, () => { this.boss.dmgUp += ramp; this.emit({ t: 'fev', k: 'behind', n: k }); });
        const len = this.seq(closing, start) - (start - this.t);
        this.at(Math.max(start, start + len - 20), () => pass(start + len + (this.pauseShift || 0) - sh0, k + 1));
        this.layPhase = null; this.layStep = false;
      };
      pass(t, 1);
    }
    this.layPhase = null; this.layStep = false;
    // no gate to wait for: it ends with its last step, so what follows is laid out now (the feed reads across the join)
    if (!closing && o.until == null && o.next) { cur.done = true; o.next(t); }
    return cur;
  }
  startCourse(cur, now) {
    if (!now) this.setPhase(cur.ph);
    if (this.skipTo && cur.ph === this.skipTo && this.skipHp) { this.boss.hp = Math.min(this.boss.hp, Math.floor(this.boss.maxHp * this.skipHp) - 1); this.skipHp = 0; }
    this.curCourse = cur;
    if (cur.o.onStart) cur.o.onStart();
    if (cur.o.until != null) this.onHp(cur.o.until, () => this.gate(cur));
    if (cur.o.wall && cur.o.until != null) this.wallHp = Math.max(1, Math.floor(this.boss.maxHp * cur.o.until));   // (from here on the boss can't go below its gate)
  }
  addGate(frac, o) {
    const push = (o.push ?? this.def.push) ? 1 : 0, g = this.gates.find(x => Math.abs(x.f - frac) < 0.0005);
    if (g) { if (push) g.push = 1; if (o.wall) g.wall = 1; return; }
    this.gates.push({ f: frac, push, wall: o.wall ? 1 : 0 }); this.gates.sort((a, b) => b.f - a.f);
  }
  // the gates for the clients' boss bar [[fraction, wall], ...]: only when they change (and every 3 s for anyone who missed it)
  gateMsg() {
    const key = this.gates.map(g => g.f + ':' + g.wall).join('|');
    if (key === this.gateKey && this.t - (this.gateSentAt ?? -99) < 3) return undefined;
    this.gateKey = key; this.gateSentAt = this.t;
    return this.gates.map(g => [g.f, g.wall]);
  }
  // a wall goes up at its gate (see the header note above course())
  raiseWall(cur, w) {
    this.wall = { cur, label: w.label || 'Sealed', until: w.until || 'resolved', since: this.t, timeout: w.timeout ?? 45, resolved: false };
    this.events = this.events.filter(e => e.keep || e.phase !== cur.ph || e.t <= this.t);   // the act's remaining steps are cut
    this.emit({ t: 'fev', k: 'wall', on: 1, label: this.wall.label });
    if (w.run) w.run(this);
  }
  wallDown() {
    const w = this.wall;
    if (!w) return;
    this.wall = null; this.wallHp = null;
    this.emit({ t: 'fev', k: 'wall', on: 0, label: w.label });
    this.gate(w.cur);
  }
  wallTick() {
    const w = this.wall;
    if (!w) return;
    if (w.resolved || (typeof w.until === 'function' && w.until(this)) || this.t - w.since > w.timeout) this.wallDown();
  }
  // the boss HP gate is reached: finish the set that's running (up to o.seam s), then go on
  gate(cur) {
    if (cur.done || this.phase !== cur.ph) return;
    if (cur.o.wall && !cur.walled) { cur.walled = true; this.raiseWall(cur, cur.o.wall); return; }
    if (!cur.o.next) return;
    cur.done = true;
    const seam = cur.seams.find(s => s > this.t + 0.05);
    // push: the act is cut at once, not at the next seam
    const push = !!(cur.o.push ?? this.def.push);
    // (not before a Time Stop on the boss ends: pauseBoss)
    const at = Math.max(!push && seam != null && seam - this.t <= (cur.o.seam ?? 8) ? seam - 0.02 : this.t, this.boss.pauseUntil || 0);
    // what this course still had after the seam is dropped now, so the feed already shows what comes next
    this.events = this.events.filter(e => e.keep || e.phase !== cur.ph || e.t <= at);
    cur.o.next(at);
  }
  // the next few named steps still to come in this phase (and kept ones, like the enrage), and in courses already
  // laid out after it
  upcoming(n = 3) {
    const out = [];
    for (const e of this.events) {
      if (!e.name || e.t < this.t || !(e.phase >= this.phase || e.keep)) continue;
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
    // while a Time Stop holds the boss, its own steps don't count down: [name, secs, 1] (held till the stop ends)
    const pu = this.boss.pauseUntil > this.t ? this.boss.pauseUntil : 0;
    this.emit({ t: 'bnext', l: up.map(e => pu && e.step ? [e.name, Math.max(0, Math.round((e.t - pu) * 10) / 10), 1] : [e.name, Math.max(0, Math.round((e.t - this.t) * 10) / 10)]) });
  }
  onHp(frac, fn) { this.hpTriggers.push({ frac, fn }); this.hpTriggers.sort((a, b) => b.frac - a.frac); }
  // start a new phase: drops everything still scheduled for the old one (a course already laid out after it stays)
  setPhase(n) { this.phase = n; this.events = this.events.filter(e => e.phase >= n || e.keep); }

  players() {
    const out = [];
    for (const p of this.getPlayers()) { const s = this.ps.get(p.id); if (s && !s.left) out.push(Object.assign({}, p, { s })); }
    return out;
  }
  alive() { return this.players().filter(p => p.s.alive); }
  // whoever the boss is on (boss.on): the tank who taunted last, or by default the tank he is on, for as long as that tank
  // lives. If that tank dies he goes to the other living tank and stays there (a raised tank does not take him back from
  // it). With every tank down he goes for the nearest player, and the first tank raised takes him back. No threat.
  tank() {
    const b = this.boss, al = this.alive(), tanks = al.filter(p => p.s.role === 'tank');
    let on = tanks.find(p => p.id === b.on);
    if (!on && tanks.length) on = tanks[0];
    if (!on) {
      on = al.find(p => p.id === b.on);   // (no tank stands: whoever he turned to stays his target while they live)
      if (!on) { let nd = Infinity; for (const p of al) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < nd) { nd = d; on = p; } } }
    }
    b.on = on ? on.id : null;
    return on || null;
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
  // Taunt (any tank, tgt = 'boss' or an add's id). On the boss he is on you from now on (until you die or the other tank
  // taunts); on an add, threat to the top + 10% and a short fixation. False if refused.
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
      this.boss.on = pid;
      tgt = 'boss';
    }
    s.tauntReady = this.t + FIGHT.TAUNT_CD - 1;
    this.emit({ t: 'fev', k: 'taunt', id: pid, tg: tgt });
    return true;
  }
  // a player's share of an add's attention (damageAdd), faded every tick
  threatMult(s, ev) {
    const m = ev && ev.threat !== undefined ? (Number.isFinite(ev.threat) ? Math.max(0, Math.min(FIGHT.EV_THREAT_MAX, ev.threat)) : 1) : 1;
    return (s.role === 'tank' ? FIGHT.TANK_THREAT : 1) * m;
  }
  fadeThreat(dt) {
    const k = Math.exp(-FIGHT.THREAT_FADE * dt);
    for (const a of this.adds.values()) for (const id in a.threat) a.threat[id] *= k;
  }
  dropThreat(pid) { for (const a of this.adds.values()) delete a.threat[pid]; }
  nonTanks() { const t = this.tank(); return this.alive().filter(p => !t || p.id !== t.id); }
  // a player's party slot (0-3): the order the party frames list everyone (tank, healer, then the rest by id), so the
  // slot's colour (FIGHT.SLOTS) and the frame's number match
  slotOf(id) {
    const order = { tank: 0, healer: 1, dps: 2 };
    const list = [...this.ps.values()].filter(s => !s.left).sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.id - b.id);
    return Math.max(0, list.findIndex(s => s.id === id));
  }

  // ---------------------------------------------------------------- lifecycle
  tick(dt) {
    if (this.state === 'countdown' || this.state === 'prepull') {
      if (this.state === 'countdown') { this.countdown -= dt; if (this.countdown <= 0) this.pull(); }
      if (this.propsDirty || (this.t - this.lastPropsSend >= 3 && (this.props.length || this.floor.length))) this.broadcastProps();
      return;
    }
    if (this.state !== 'live') return;
    this.t += dt;
    while (this.events.length && this.events[0].t <= this.t) {
      const e = this.events.shift();
      if (e.phase === this.phase || e.keep) e.fn();
    }
    while (this.hpTriggers.length && this.boss.hp / this.boss.maxHp <= this.hpTriggers[0].frac) this.hpTriggers.shift().fn();
    if (this.wall) this.wallTick();
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
    this.updateFires();
    for (const fn of this.tickers) fn(dt);
    if (this.updateClass) this.updateClass(dt);   // Ledgers coming due (end of this file)
    this.weaveTick(dt); this.dollTick(dt);   // classes-c: threads and Dolls (block at the end of this file)
    this.lampTick(dt);   // the Lanternkeeper's lanterns (LANTERNS, the end of this file)
    this.houndTick(dt);   // the Houndmaster's hounds (HOUNDS, the end of this file)
    for (const id in this.lastHit) if (this.t - this.lastHit[id] <= 2.5) this.stats[id].up += dt;   // (seconds with a blow on the boss or an add in the last 2.5 s)
    this.updatePlayers(dt);
    if (this.state !== 'live') return;
    if (this.alive().length === 0) return this.end('wipe');
    this.broadcastNext();
    // the room changes rarely: send it when it does, and every few seconds anyway for anyone who missed it
    if (this.propsDirty || this.t - this.lastPropsSend >= 3) this.broadcastProps();
    // a steady 10/s: stepping the mark by 0.1 (not to "now") stops 33 ms ticks rounding every gap up to 133 ms
    if (this.t - this.lastBroadcast >= 0.1) { this.lastBroadcast = Math.max(this.lastBroadcast + 0.1, this.t - 0.05); this.broadcastBoss(); }
    if (this.t - this.lastPartyBroadcast >= 0.2) { this.lastPartyBroadcast = this.t; this.broadcastParty(); }
  }

  // the fight begins: the script and the enrage clock start now
  pull() {
    if (this.state !== 'countdown' && this.state !== 'prepull') return;
    this.state = 'live'; this.t = 0;
    this.def.script(this);
    if (this.def.enrage) this.atKeep(this.def.enrage[this.mode], () => this.enrage(), this.def.enrageName || 'Enrage');
    this.emit({ t: 'fight', s: 'live' });
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
    this.weaveClear();   // classes-c: threads, Tapestry and Dolls
    this.lampClear();   // the Lanternkeeper's lanterns
    this.houndClear();   // the Houndmaster's hounds
    this.events = []; this.broadcastNext(true);
    this.broadcastAdds();
    this.broadcastParty();
    for (const st of Object.values(this.stats)) { st.aggro = Math.round(st.aggro * 10) / 10; st.up = Math.round(st.up * 10) / 10; }
    this.emit({ t: 'fight', s: result, time: Math.round(this.t * 10) / 10, stats: this.stats, hp: this.boss.hp, maxHp: this.boss.maxHp, mode: this.mode, ph: this.phase || 1 });
  }

  updateBoss(dt) {
    const b = this.boss;
    if (b.cast && this.t >= b.cast.end) b.cast = null;
    if (b.anim && this.t >= b.anim.end) b.anim = null;
    if (this.postureOn) this.kenTick(dt);   // (Posture: a Break running out, recovery)
    const tank = this.tank();
    b.target = tank ? tank.id : null;
    if (b.target != null && this.stats[b.target]) this.stats[b.target].aggro += dt;   // (aggro seconds: scoring.js)
    // stuck in a wall after a charge, or held by a Time Stop (pauseBoss): no walking, turning or autos (a scripted
    // move already under way, moveTo, still finishes)
    const stunned = b.stunUntil > this.t || b.pauseUntil > this.t || !!(b.post && b.post.until > this.t);   // (a Break: KENSEI_HOST)
    if (b.moveTo) {
      const dx = b.moveTo.x - b.x, dy = b.moveTo.y - b.y, d = Math.hypot(dx, dy);
      const step = (b.moveTo.speed || 400) * dt;
      if (d <= step) { b.x = b.moveTo.x; b.y = b.moveTo.y; const done = b.moveTo.done; b.moveTo = null; if (done) done(); }
      else { b.x += dx / d * step; b.y += dy / d * step; }
    } else if (tank && !b.cast && !b.lockFacing && !b.untargetable && !stunned) {
      b.facing = Math.atan2(tank.y - b.y, tank.x - b.x);
      if (b.hornTo && b.hornTo.until > this.t) { const hp = this.players().find(q => q.id === b.hornTo.id); if (hp) b.facing = Math.atan2(hp.y - b.y, hp.x - b.x); }   // (Hunting Horn: only its face; its target and its walk stay the tank's)
      const d = Math.hypot(tank.x - b.x, tank.y - b.y);
      if (d > FIGHT.MELEE && !b.anchor && !(b.holdUntil > this.t)) {
        // round any prop in the way rather than pushing into it
        const goal = this.props.length ? PROPS.steer(b, tank, this.props, FIGHT.BOSS_R * 0.7) : tank;
        const a = Math.atan2(goal.y - b.y, goal.x - b.x), step = Math.min(d - FIGHT.MELEE * 0.85, b.speed * dt);
        b.x += Math.cos(a) * step; b.y += Math.sin(a) * step;
        ARENA.clamp(b, 110);
        PROPS.collide(b, this.props, FIGHT.BOSS_R * 0.7);
      }
    }
    if (tank && !b.untargetable && !stunned && !(b.noAutoUntil > this.t) && this.t >= b.autoAt) {
      b.autoAt = this.t + (b.duelUntil > this.t ? KENSEI.DUEL_EVERY : FIGHT.AUTO_EVERY);   // (Ember Duel: a steady beat)
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
      if (s.alive) for (const pl of this.healPools) {
        if (Math.hypot(p.x - pl.x, p.y - pl.y) > pl.r) continue;
        if (pl.pct) { const m = s.mits.find(x => x.pool === pl); if (m) m.end = this.t + 0.25; else s.mits.push({ pct: pl.pct, start: this.t, end: this.t + 0.25, pool: pl, from: pl.from }); }   // a ward circle (Alembist)
        if (this.t < pl.next) continue;
        if (pl.amount) this.applyHeal(pl.from, p.id, pl.amount);
        if (pl.sh && s.shield < pl.sh) this.giveShield(pl.from, p.id, s, pl.sh, pl.interval + 0.6);
      }
      if (s.alive) {
        s.hist.push([this.t, s.hp]);
        while (s.hist.length && s.hist[0][0] < this.t - 6) s.hist.shift();
        if (ARENA.sd(p.x, p.y) > 14 && this.t > this.edgeGrace) this.damagePlayer(p, 9999999, { kind: 'fall' });
      }
    }
    for (const pl of this.healPools) {
      if (this.t >= pl.next) { pl.next += pl.interval; pl.ticks--; }
      if (pl.fol != null) { const tp = this.players().find(q => q.id === pl.fol); if (tp) { pl.x = tp.x; pl.y = tp.y; } }   // a cloud that follows its ally
    }
    this.healPools = this.healPools.filter(pl => pl.ticks > 0);
  }

  // ---------------------------------------------------------------- incoming combat events from players
  onEvent(pid, ev) {
    const s = this.ps.get(pid), st = this.stats[pid];
    // before the pull, the first blow on the boss starts the fight (and lands)
    if (s && s.alive && this.state === 'prepull' && ev.type === 'damage' && (ev.tgt == null || ev.tgt === 'boss')) this.pull();
    if (!s || this.state !== 'live') return;
    if (!s.alive) return;
    const targetsOf = target => (target === 'party' ? this.alive().map(p => p.id) : [this.resolveTarget(pid, target, ev.not)]);
    switch (ev.type) {
      case 'lb': {
        const lv = Math.floor(this.lb / FIGHT.LB.BAR);
        if (lv >= 1 && this.t - this.lbUsedAt >= 1) this.limitBreak(pid, s, lv);
        break;
      }
      case 'damage': {
        let amt = Math.max(0, Math.min(15000, ev.amount | 0));
        if (s.weakEnd > this.t) amt = Math.round(amt * (1 - (s.weakPct || 0)));
        // ev.tgt names the enemy it was aimed at: 'boss' (or nothing) or an add's id
        if (ev.tgt != null && ev.tgt !== 'boss') {
          const a = this.adds.get(ev.tgt);
          if (a) { this.damageAdd(pid, a, amt, this.threatMult(s, ev)); this.lastHit[pid] = this.t; if (ev.ub) st.burst++; }
          break;
        }
        if (this.boss.untargetable) return;
        if (this.boss.exposedUntil > this.t) amt = Math.round(amt * (1 + (this.boss.exposed || 0)));   // staggered: takes more
        if (this.stageUntil > this.t) amt = Math.round(amt * (1 + DOLL_HOST.STAGE));   // standing on an Understudy's Stage (classes-c)
        if (this.wallHp != null) amt = Math.min(amt, Math.max(0, this.boss.hp - this.wallHp));   // sealed at a gate (a wall)
        this.boss.hp = Math.max(0, this.boss.hp - amt);
        this.burstBrand(pid);
        st.damage += amt;
        this.lastHit[pid] = this.t;
        if (ev.ub) st.burst++;   // (a hit of an Ultimate or its window)
        if (this.boss.hp <= this.boss.maxHp * 0.2) st.closer += amt;
        if (this.boss.hp <= 0) this.end('clear');
        break;
      }
      case 'ult': st.ults++; break;   // (an Ultimate pressed: main.js kitFx, raid-host bots)
      case 'heal': {
        const tid = ev.target === 'party' ? null : this.resolveTarget(pid, ev.target, ev.not);
        if (s.weakEnd > this.t) ev = Object.assign({}, ev, { amount: Math.round((ev.amount || 0) * (1 - (s.weakPct || 0))) });   // (raise sickness)
        this.applyHeal(pid, tid, ev.amount, ev.target === 'party');
        if (tid != null) this.threadHeal(pid, tid, ev.amount, ev.seam);   // a heal runs down the threads (classes-c)
        break;
      }
      case 'hot':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          ts.hots = ts.hots.filter(h => !(h.from === pid && h.id === ev.id));
          ts.hots.push({ from: pid, id: ev.id, amount: s.weakEnd > this.t ? Math.round(ev.amount * (1 - (s.weakPct || 0))) : ev.amount, ticks: ev.ticks, interval: ev.interval, next: this.t + ev.interval });
        }
        break;
      case 'shield':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          this.ward(pid, tid, ts, true);
          if (ts.hollow) { this.hollowShield(pid, ts, ev.amount); continue; }   // (a Hollow knight: a shield pays the debt at half)
          if (ev.tag === 'item' && ts.shield >= (ev.amount | 0)) continue;   // (an item's small ward never replaces a stronger shield: a Runic Ward, a barrier)
          if (ts.shield > 0) this.endShield(tid, ts);
          ts.shield = Math.min(ev.amount | 0, ts.maxHp); ts.shieldMax = ts.shield; ts.shieldEnd = this.t + Math.min(30, ev.dur || 15);
          ts.shieldFrom = pid; ts.shieldTag = ev.tag || null;
        }
        break;
      case 'mit':
        for (const tid of targetsOf(ev.target)) {
          const ts = this.ps.get(tid); if (!ts || !ts.alive) continue;
          this.ward(pid, tid, ts, true);
          ts.mits.push({ pct: Math.max(0, Math.min(1, ev.pct)), start: this.t, end: this.t + Math.min(30, ev.dur || 5), kind: ev.kind, from: pid });
        }
        break;
      case 'raise': {
        const ts = this.ps.get(ev.target);
        if (ts && !ts.alive && !ts.left) this.revive(ev.target, ts, 0.5, pid, ev.instant ? 'instant' : 'cast');
        break;
      }
      case 'rewind': {
        // target 'party' (a Chronomancer's Time Reversal): every living ally back to their best HP of the last secs, at
        // most pct of their max HP each; nobody is revived
        if (ev.target === 'party') {
          const secs = Math.min(6, ev.secs || 4), cap = Math.max(0, Math.min(0.5, Number(ev.pct) || 0.4));
          for (const p of this.alive()) {
            const ps = p.s, best = ps.hist.filter(h => h[0] >= this.t - secs).reduce((m, h) => Math.max(m, h[1]), ps.hp);
            if (best > ps.hp) this.applyHeal(pid, p.id, Math.min(best - ps.hp, ps.maxHp * cap));
          }
          if (ev.dur > 0) this.pauseBoss(ev.dur, pid);   // dur: and the boss's own clock stops (Time Stop)
          break;
        }
        const tid = this.resolveTarget(pid, ev.target), ts = this.ps.get(tid);
        if (!ts || ts.left) break;
        const secs = Math.min(6, ev.secs || 4);
        if (!ts.alive) {
          if (this.t - ts.diedAt <= secs) {
            const before = ts.hist.filter(h => h[0] >= ts.diedAt - secs).reduce((m, h) => Math.max(m, h[1]), ts.maxHp * 0.3);
            this.revive(tid, ts, before / ts.maxHp, pid, 'instant');
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
      case 'splash': this.splash(pid, ev); break;   // a thrown vial (Alembist)
      case 'lamp': this.lampEvent(pid, ev); break;   // a Lanternkeeper's lanterns burst (LANTERNS, the end of this file)
      case 'brand': {  // Judgment on the boss: allies' next hits burst for the Inquisitor's damage
        const b = this.boss, old = b.brand && b.brand.from === pid && b.brand.end > this.t ? b.brand.charges : 0;
        b.brand = { from: pid, charges: Math.min(8, old + Math.min(8, ev.ticks | 0)), amount: Math.max(0, Math.min(3000, ev.amount | 0)), end: this.t + 15 };
        break;
      }
      case 'snap': this.snapReel(pid); break;   // a dash snapped the silk reeling this player in
      case 'taunt': this.taunt(pid, typeof ev.tgt === 'string' ? ev.tgt : 'boss'); break;
      case 'horn': { const hp = this.players().find(q => q.id === pid); if (hp) this.boss.hornTo = { id: pid, until: this.t + Math.max(0.5, Math.min(2, Number(ev.dur) || 1.5)) }; break; }   // a Houndmaster's Hunting Horn: the boss's face swings toward the hunter for a beat (updateBoss)
      case 'kensei': this.kenEvent(pid, ev); break;   // a Kenseier's deflect, step and Posture (KENSEI_HOST, the end of this file)
      case 'maw': case 'ledger': case 'gloom': if (this.classEvent) this.classEvent(pid, ev); break;   // Gorgemaw, Oathbroker, Gloomsworn (end of this file)
      case 'tie': case 'snip': case 'tighten': case 'tapestry': case 'tug': this.weaveEvent(pid, ev); break;   // Threadweaver (classes-c)
    }
  }
  // A thrown vial (Alembist) shatters at an ally's feet (target 'party': it reaches everyone). Everyone alive within r
  // gets its effect: amount heals (up: more on the badly hurt), sh shields for dur, cl cleanses (1 Vulnerability and
  // Damage Down, 2 slows and roots). ticks leaves a pool there (pr radius, every interval: pa heal, ps shield, pct less
  // damage while inside, fol: it follows that ally). Everything is clamped here, like any other combat event.
  splash(pid, ev) {
    const all = ev.target === 'party';
    const at = all ? null : (this.players().find(q => q.id === this.resolveTarget(pid, ev.target, ev.not)) || this.players().find(q => q.id === pid));
    if (!all && !at) return;
    const r = Math.max(0, Math.min(200, ev.r || 0)), num = v => Math.max(0, Math.min(3000, Number(v) || 0));
    for (const p of this.alive()) {
      if (!all && Math.hypot(p.x - at.x, p.y - at.y) > r) continue;
      const s = p.s;
      if (ev.amount) this.applyHeal(pid, p.id, num(ev.amount) * (ev.up ? 2 - s.hp / s.maxHp : 1));
      if (ev.sh) this.giveShield(pid, p.id, s, num(ev.sh), ev.dur || 10);
      if (ev.cl & 1) { s.vuln = 0; s.vulnEnd = 0; s.dmgDownEnd = 0; }
      if (ev.cl & 2) { delete s.debuffs.slowed; delete s.debuffs.rooted; }
    }
    if (at && ev.ticks) {
      const mine = this.healPools.filter(pl => pl.from === pid && pl.vial);
      if (mine.length >= 8) this.healPools.splice(this.healPools.indexOf(mine[0]), 1);
      const iv = Math.max(0.5, Math.min(3, Number(ev.interval) || 1.5));
      this.healPools.push({ from: pid, vial: true, x: at.x, y: at.y, fol: ev.fol ? at.id : null, r: Math.max(0, Math.min(200, ev.pr || r || 100)), amount: num(ev.pa), sh: num(ev.ps),
        pct: Math.max(0, Math.min(0.3, Number(ev.pct) || 0)), ticks: Math.max(1, Math.min(12, ev.ticks | 0)), interval: iv, next: this.t + iv });
    }
  }
  giveShield(from, tid, ts, amount, dur) {
    if (ts.hollow) { this.hollowShield(from, ts, amount); return; }
    if (ts.shield > 0) this.endShield(tid, ts);
    ts.shield = Math.min(amount | 0, ts.maxHp); ts.shieldMax = ts.shield; ts.shieldEnd = this.t + Math.min(30, dur || 15);
    ts.shieldFrom = from; ts.shieldTag = null;
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
    b.hp = Math.max(this.wallHp ?? 0, b.hp - br.amount);
    const st = this.stats[br.from]; if (st) st.damage += br.amount;
    this.emit({ t: 'fev', k: 'brandHit', id: br.from, left: br.charges });
    if (br.charges <= 0) b.brand = null;
  }

  // the party's deaths this pull, and the sickness the next raise of a kind ('cast' or 'instant') leaves (FIGHT.SICK)
  partyDeaths() { return Object.values(this.stats).reduce((n, st) => n + st.deaths, 0); }
  sickness(kind, deaths = this.partyDeaths()) {
    const S = FIGHT.SICK, b = S[kind] || S.cast, n = Math.max(0, deaths - 1);
    return { pct: Math.min(S.MAX.pct, b.pct + n * S.PER_DEATH.pct), dur: Math.min(S.MAX.dur, b.dur + n * S.PER_DEATH.dur) };
  }
  // kind: 'cast' or 'instant' (raise sickness, FIGHT.SICK) or 'none' (the Limit Break)
  revive(tid, ts, frac, by, kind = 'cast') {
    const rs = this.stats[by]; if (rs && by !== tid) rs.raises++;
    ts.alive = true; ts.hollow = null; ts.hp = Math.round(ts.maxHp * Math.max(0.1, Math.min(1, frac)));
    const sick = kind === 'none' ? null : this.sickness(kind);
    ts.weakEnd = sick ? this.t + sick.dur : 0; ts.weakPct = sick ? sick.pct : 0; ts.hist = []; this.dropThreat(tid);
    ts.mits.push({ pct: 1, start: this.t, end: this.t + FIGHT.REVIVE_SAFE, kind: 'invuln', from: by });   // a moment to find their feet
    this.emit({ t: 'fev', k: 'raised', id: tid, by });
  }

  applyHeal(fromId, tid, amount, partyWide) {
    const targets = partyWide ? this.alive() : this.alive().filter(p => p.id === tid);
    for (const p of targets) {
      const s = p.s;
      const amt = Math.max(0, Math.min(8000, amount | 0));
      const real = s.hollow ? amt : Math.min(amt, s.maxHp - s.hp);   // (Hollow: the whole heal pays the debt)
      if (real >= s.maxHp * 0.05) this.ward(fromId, p.id, s, false);
      if (s.hollow) s.hollow.heal += real; else s.hp += real;
      const st = this.stats[fromId];
      if (st) { st.healing += real; st.overheal += amt - real; }
      // a heal from someone else on a player: their client shows the number over themselves (bots have no screen)
      if (fromId !== p.id && p.id < 1000 && amt >= 1) this.emit({ t: 'pheal', id: p.id, a: amt });
    }
  }

  // Contribution tracking: an ally below a quarter of their health lifted by a heal, shield or cut from someone else is a
  // save (one per ally per 10 s); a shield or cut put on an ally counts as a ward (scoring.js)
  ward(by, tid, ts, put) {
    const st = this.stats[by];
    if (!st || by === tid) return;
    if (put) st.wards++;
    if (ts.hp < ts.maxHp * 0.25 && this.t - (this.saveAt[tid] ?? -99) >= 10) { this.saveAt[tid] = this.t; st.saves++; }
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
    // Royal Doom running out, the enrage and falling off the edge are sentences, not hits: no invulnerability, shield,
    // mitigation or cheat-death saves you (only the mechanic's own answer does)
    // (Skitterra's and Volkar's survivable drops are 'fall' too: only the outright kills take this path)
    if (raw >= 9999999 && (opts.kind === 'doom' || opts.kind === 'enrage' || opts.kind === 'fall')) {
      // (the whole sentence lands on health, past any shield: certain death for a real hero, while the tools' test
      // parties with huge health still run on to the end of the script)
      const amt = Math.min(raw, Math.max(1, Math.round(s.hp)));
      s.hp -= raw;
      this.stats[p.id].taken += amt;
      const pd = { t: 'pdmg', id: p.id, a: amt, k: opts.kind, hp: Math.max(0, s.hp), dd: 0 };
      if (opts.n) pd.n = opts.n;
      this.emit(pd);
      if (s.hp > 0) return amt;
      s.hp = 0; s.shield = 0; s.alive = false; s.mits = []; s.hots = []; s.diedAt = this.t; this.dropThreat(p.id);
      if (this.classDeath) this.classDeath(p, s);
      this.stats[p.id].deaths++;
      this.emit({ t: 'fev', k: 'death', id: p.id });
      return amt;
    }
    // (opts.scaled: already in small numbers, e.g. a share passed along a thread, but still mitigated as usual)
    let amt = opts.raw || opts.scaled ? raw : raw * this.scale.dmg * (this.hard ? 1.25 : 1) * (1 + this.boss.dmgUp);
    if (this.recoverEnd > this.t && !opts.raw) amt *= 1 - FIGHT.REC.CUT;   // recovering after a death (Hard)
    if (!opts.shared) amt = this.threadSplit(p, s, amt, opts);   // threads split the hit evenly along them (classes-c)
    if (s.vulnEnd > this.t && !opts.raw) amt *= 1 + s.vuln;
    if (s.def && !opts.raw) amt *= 1 - s.def;
    let mult = 1, perfect = null, reflect = null, invuln = false, read = null;
    for (const m of (opts.nomit ? [] : s.mits)) {   // (nomit: a bill from the Ledger, mitigated when it was written)
      if (m.kind === 'invuln') { invuln = true; break; }
      if (m.kind === 'living') continue;
      if (m.kind === 'brace' && this.t - m.start <= FIGHT.PERFECT_WINDOW && !perfect) { perfect = m; mult *= 0.4; continue; }
      if (m.kind === 'parry' && !opts.raw && this.t - m.start <= FIGHT.READ_WINDOW && !read) { read = m; mult *= 0.5; continue; }
      if (m.kind === 'reflect') { if (!reflect) { reflect = m; mult *= 0.2; } continue; }
      mult *= 1 - m.pct;
    }
    if (invuln) mult = 0;
    // a Kenseier's Off-balance, Mikiri Step and deflect (KENSEI_HOST, the end of this file)
    let kd = null, kPre = 0;
    if (this.postureOn && !opts.raw && !opts.nomit) {
      if (s.offbal > this.t) mult *= 1 + KENSEI.OFF_DMG;
      kPre = amt * mult;
      kd = this.kenIncoming(p, s, kPre, opts);
      if (kd) mult *= kd.mult;
    }
    if (perfect || read || reflect) this.stats[p.id].perfects++;   // (a Brace, Read or Reflect that caught the hit)
    if (perfect) {
      s.mits = s.mits.filter(m => m !== perfect);
      this.emit({ t: 'fev', k: 'perfect', id: p.id, b: opts.kind === 'buster' ? 1 : 0 });   // (b: a tankbuster, for Bastion's turned blow)
    }
    if (reflect) {
      s.mits = s.mits.filter(m => m !== reflect);
      this.emit({ t: 'fev', k: 'reflect', id: p.id, b: opts.kind === 'buster' ? 1 : 0 });
    }
    if (read) {
      s.mits = s.mits.filter(m => m !== read);
      this.emit({ t: 'fev', k: 'read', id: p.id, b: opts.kind === 'buster' ? 1 : 0 });
    }
    const before = amt;
    amt *= mult;
    if (this.classHit) amt = this.classHit(p, s, amt, opts);   // a Gorgemaw's open jaw, an Oathbroker's Ledger (end of this file)
    const st = this.stats[p.id];
    st.mitigated += Math.round(before - amt);
    let absorbed = 0;   // (sent with the hit: the number a shield ate, shown to the one it covered)
    if (s.shield > 0 && amt > 0) {
      const used = Math.min(s.shield, amt);
      s.shield -= used; amt -= used; absorbed = Math.round(used);
      const shSt = this.stats[s.shieldFrom]; if (shSt) shSt.healing += Math.round(used);
      if (s.shield <= 0.5) this.endShield(p.id, s);
    }
    amt = Math.round(amt);
    // a Gloomsworn's Hollow (end of this file): a killing blow at full Gloom starts it, and while it runs every point is debt, not health
    if (amt > 0 && this.hollowHit && this.hollowHit(p, s, amt, opts)) st.taken += amt;
    else { s.hp -= amt; st.taken += amt; }
    if (opts.avoidable) {
      st.avoidable++; this.avoidCount++;
      if (opts.ddown) s.dmgDownEnd = this.t + FIGHT.DMG_DOWN_DUR;   // (Damage Down only where the move opts in: ddown)
      // lingering ground ticks don't stack Vulnerability (it would snowball per tick)
      if (!opts.noVuln) { s.vuln = Math.min(1, (s.vulnEnd > this.t ? s.vuln : 0) + this.vulnStep); s.vulnEnd = this.t + FIGHT.VULN_DUR; }
    }
    if (s.hp <= 0 && s.mits.some(m => m.kind === 'living') && opts.kind !== 'enrage' && opts.kind !== 'fall') s.hp = 1;
    const pd = { t: 'pdmg', id: p.id, a: amt, k: opts.kind || 'hit', hp: Math.max(0, s.hp), dd: opts.avoidable ? 1 : 0 };
    if (opts.n) pd.n = opts.n;   // the move it came from (the death recap)
    if (absorbed > 0) pd.sh = absorbed;
    if (s.hollow && amt > 0) pd.hl = 1;
    if (kd) pd.df = kd.q;   // (a deflect caught it: 2 Perfect, 1 Good, 3 Mikiri Step)
    else if (this.postureOn && amt > 0 && (opts.kind === 'auto' || opts.kind === 'buster')) this.kenNote(p, kPre, amt, opts);   // (kept for a deflect pressed just after)   // (taken as Hollow debt: hp stays at 1)
    this.emit(pd);
    if (s.hp <= 0) {
      s.hp = 0; s.alive = false; s.shield = 0; s.mits = []; s.hots = []; s.diedAt = this.t; this.dropThreat(p.id);
      if (this.classDeath) this.classDeath(p, s);
      st.deaths++;
      this.emit({ t: 'fev', k: 'death', id: p.id });
      if (this.hard && this.t >= this.recoverEnd + FIGHT.REC.COOL && this.state === 'live') { this.recoverEnd = this.t + FIGHT.REC.DUR; this.emit({ t: 'fev', k: 'recover', dur: FIGHT.REC.DUR }); }
    }
    return amt;
  }

  // ---------------------------------------------------------------- primitives for boss scripts
  cast(name, dur, anim = 'cast', extra = {}) {
    this.boss.cast = { name, start: this.t, end: this.t + dur, anim };
    this.lastCast = name;
    this.emit(Object.assign({ t: 'bcast', name, dur, anim }, extra));
  }
  // A hard damage check: the boss must lose `frac` of its health before this `dur` s cast ends. Get there first and the
  // cast breaks (o.onPass(secs the cast had left): a stagger, an opening); let it finish and o.onFail runs (a wipe).
  // The goal shows as a mark on the boss bar while the cast runs.
  dpsCheck(name, dur, frac, o = {}) {
    const b = this.boss, goal = Math.max(0, b.hp / b.maxHp - frac), end = this.t + dur;
    this.cast(name, dur, o.anim || 'cast', { goal: +goal.toFixed(4) });
    this.dpsCheckEnd = end;   // (bots save a Limit Break for this)
    let done = false;
    this.ticker(() => {
      if (done || this.state !== 'live') return;
      if (b.hp / b.maxHp <= goal) {
        done = true; if (b.cast && b.cast.name === name) b.cast = null;
        this.dpsCheckEnd = 0; this.lbGain(FIGHT.LB.CHECK);
        this.emit({ t: 'bcastend', name, ok: 1 });
        if (o.onPass) o.onPass(end - this.t);
      } else if (this.t >= end) { done = true; this.dpsCheckEnd = 0; this.emit({ t: 'bcastend', name, ok: 0 }); if (o.onFail) o.onFail(); }
    });
  }
  // A heal check: the next `dur` s. If nobody falls in it, the gauge fills (FIGHT.LB.CHECK). Bots read healCheckEnd.
  healCheck(dur) {
    const deaths = () => Object.values(this.stats).reduce((n, st) => n + st.deaths, 0), d0 = deaths();
    this.healCheckEnd = this.t + dur;
    this.afterKeep(dur, () => { this.healCheckEnd = 0; if (this.state === 'live' && deaths() === d0) this.lbGain(FIGHT.LB.CHECK); });
  }
  lbGain(n) { this.lb = Math.min(FIGHT.LB.BAR * 3, this.lb + n); }
  // A Limit Break: every whole bar spent at once (lv 1-3), its effect set by the role of whoever pressed it
  limitBreak(pid, s, lv) {
    const L = FIGHT.LB;
    this.lb -= lv * L.BAR; this.lbUsedAt = this.t;
    this.emit({ t: 'lb', id: pid, lv, role: s.role });
    // any living role's Limit Break at three bars raises the fallen (a healer is often the one who is down)
    if (lv >= 3) for (const [tid, ts] of this.ps) if (!ts.alive && !ts.left) this.revive(tid, ts, L.RAISE, pid, 'none');
    if (s.role === 'tank') {
      for (const p of this.alive()) { const ts = this.ps.get(p.id); ts.mits.push({ pct: L.TANK[lv], start: this.t, end: this.t + L.TANK_DUR, kind: 'lb', from: pid }); }
    } else if (s.role === 'healer') {
      for (const p of this.alive()) { const ts = this.ps.get(p.id); this.applyHeal(pid, p.id, ts.maxHp * L.HEAL[lv], true); }
    } else if (!this.boss.untargetable) {
      this.onEvent(pid, { type: 'damage', amount: Math.round(this.boss.maxHp * L.DPS[lv]), tgt: 'boss' });
    }
    this.broadcastParty();
  }
  anim(name, dur = 1, extra = {}) { this.boss.anim = { name, start: this.t, end: this.t + dur }; this.emit(Object.assign({ t: 'banim', name, dur }, extra)); }
  ticker(fn) { this.tickers.push(fn); }
  moveBoss(x, y, speed = 500) { const p = ARENA.clamp({ x, y }, 110); this.boss.moveTo = { x: p.x, y: p.y, speed }; }

  // Time Stop (a Chronomancer's Time Reversal): the boss's own clock stands still for dur s. The steps its script still
  // has to come (course steps: its next moves, and the passes of the soft enrage after them) slide dur s later, with
  // the course's seams and end and the upcoming-moves feed; it stands frozen (no walking, turning or autos, its swing
  // timer held). Whatever is already under way keeps true time: telegraphs, puddles, towers, tethers, rollers, adds,
  // the cast running now (its hit is already on the floor) and the follow-ups of a move already begun (after /
  // afterKeep inside a move), the hard enrage, damage and heal checks. False if it doesn't take (pauseBlock says why).
  pauseBoss(dur, pid) {
    dur = Math.max(0, Math.min(BOSS_PAUSE.MAX, Number(dur) || 0));
    if (!dur || this.pauseBlock(dur)) return false;
    const b = this.boss, t = this.t, cur = this.curCourse;
    for (const e of this.events) if (e.step && e.t > t) e.t += dur;
    this.events.sort((a, c) => a.t - c.t);
    cur.seams = cur.seams.map(s => (s > t ? s + dur : s)); cur.end += dur;
    this.pauseShift = (this.pauseShift || 0) + dur;
    b.pauseUntil = t + dur; this.pauseReady = t + dur + BOSS_PAUSE.GUARD;
    b.autoAt = Math.max(b.autoAt, t) + dur;
    if (this.onPause) this.onPause(dur);   // a script with clocks of its own on show (Skitterra's brood clock)
    this.emit({ t: 'fev', k: 'pause', id: pid ?? null, dur });
    this.broadcastNext(true);
    return true;
  }
  // why a Time Stop wouldn't take now (null: it would). It is extra time to answer the boss, never a way round a check:
  // not in a phase change or an interlude (a course without an HP gate, or one whose gate has gone), not once the soft
  // enrage has begun (past the course's sets), not in the enrage or about to, not in a damage or heal check, not while
  // the boss is out of reach, not within GUARD s of the last one, and not when the script says so (f.noPause: the
  // Hollow King's Royal Doom).
  pauseBlock(dur = BOSS_PAUSE.MAX) {
    const b = this.boss, t = this.t, cur = this.curCourse, enr = this.def.enrage && this.def.enrage[this.mode];
    if (this.state !== 'live') return 'not live';
    if (b.pauseUntil > t || t < (this.pauseReady || 0)) return 'guard';
    if (!cur || cur.o.until == null || cur.done || this.phase !== cur.ph) return 'phase';
    if (t + dur >= cur.end) return 'soft enrage';
    if (enr && t + dur + 0.5 >= enr) return 'enrage';
    if ((b.cast && t < b.cast.end && b.cast.anim === 'enrage') || this.dpsCheckEnd > t || this.healCheckEnd > t) return 'check';
    if (b.untargetable) return 'untargetable';
    if (this.noPause && this.noPause()) return 'script';
    return null;
  }

  // Generic telegraph. opts: { shape, delay, dmg, type, follow, need, tag, onResolve, avoidable, ddown, failDmg }
  // ddown: true makes an avoidable hit of this move also give Damage Down (every avoidable hit gives Vulnerability; the
  // same flag goes on a puddle's extra, a tether, zone, roller, reel, sweep or floor-fire's opts, and on damagePlayer's opts)
  // type: 'aoe' | 'raidwide' | 'stack' | 'spread' | 'tower' | 'buster' | 'knockback' | 'proximity'
  // Cover: opts.cover makes the blast come from opts.src (default: where the boss stands now); anyone whose line to it
  // passes through a cover prop is spared. coverCap: at most this many people behind one prop (the nearest to it).
  // chip: 'used' knocks a hit off every prop that sheltered someone, 'all' off every cover prop.
  mech(opts) {
    const id = this.nextMechId++;
    const m = Object.assign({ id, start: this.t, resolveAt: this.t + opts.delay, type: 'aoe', avoidable: true }, opts);
    // the move it belongs to, for the death recap: the cast it was laid with (opts.from names it otherwise)
    if (m.from == null) m.from = (this.boss.cast && this.t <= this.boss.cast.end ? this.boss.cast.name : this.lastCast) || null;
    // every avoidable hit shows its area on the floor from the cast to the hit, on every difficulty (only a raidwide,
    // which is the whole room, has nothing to draw)
    m.hidden = m.type === 'raidwide' && !!m.hidden;
    if (m.cover && !m.src) m.src = { x: this.boss.x, y: this.boss.y };
    this.mechs.set(id, m);
    this.emit({ t: 'tg', id, shape: m.shape, dur: m.delay, type: m.type, hidden: !!m.hidden, follow: m.follow ?? null,
      target: m.target ?? null, aim: m.aimFromBoss ?? null, lockAt: m.lockAt || (m.aimFromBoss ? 0.6 : 0),
      need: m.need || 0, tag: m.tag || null, color: m.color || null, slot: m.slot || 0,
      cover: m.cover ? [Math.round(m.src.x), Math.round(m.src.y)] : null, cap: m.coverCap || 0 });
    return m;
  }
  // who a cover mechanic spares, and which props it chips: { safe: Set of ids, chip: [props] }
  coverCheck(m) {
    const src = m.src, safe = new Set(), used = new Map(), list = this.props.filter(pr => pr.cover), behind = [];
    for (const p of this.alive()) { const pr = PROPS.shadowing(src.x, src.y, p.x, p.y, list); if (pr) behind.push([p, pr]); }
    behind.sort((a, b) => PROPS.sd(a[1], a[0].x, a[0].y) - PROPS.sd(b[1], b[0].x, b[0].y));
    for (const [p, pr] of behind) {
      const n = used.get(pr) || 0;
      if (m.coverCap && n >= m.coverCap) continue;
      used.set(pr, n + 1); safe.add(p.id);
    }
    return { safe, chip: m.chip === 'all' ? list : m.chip === 'used' ? [...used.keys()] : [] };
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
    const pad = 14, av0 = this.avoidCount;
    const cov = m.cover ? this.coverCheck(m) : null;
    const inside = this.alive().filter(p => SHAPES.contains(m.shape, p.x, p.y, pad) && !(cov && cov.safe.has(p.id)));
    const hits = [];
    let fail = 0;   // a stack or soak nobody (or too few) answered: the clients play it as a failure
    // a Gorgemaw with its jaw open eats what lands on it (eatInfo, end of this file): eat.on take it as a Morsel,
    // eat.whole swallows the whole mechanic for everyone (a teammate's spread circle), eat.raid halves a raidwide
    const eat = this.eatInfo ? this.eatInfo(m, inside) : null;
    const hit = (p, dmg, kind, avoidable) => {
      const ea = eat && eat.on && eat.on.some(q => q.id === p.id) ? eat.type : null;
      this.damagePlayer(p, dmg, { kind, avoidable: avoidable && !ea, ddown: m.ddown, eat: ea, mid: m.id, n: m.from }); hits.push(p.id);
    };
    if (eat && eat.whole) {
      this.damagePlayer(eat.whole, m.dmg, { kind: m.tag || m.type, eat: eat.type, mid: m.id, whole: 1, owner: eat.owner, n: m.from });
      this.emit({ t: 'tgx', id: m.id, hits: [eat.whole.id] });
      if (cov) for (const pr of cov.chip) this.hitProp(pr, 1, m.tag);
      if (m.onResolve) m.onResolve([eat.whole], [eat.whole.id], cov);
      return;
    }
    switch (m.type) {
      case 'aoe':
        // m.group (a Set shared by many overlapping circles that land together, Snare Weave): one hit each at most
        for (const p of inside) { if (m.group) { if (m.group.has(p.id)) continue; m.group.add(p.id); } hit(p, m.dmg, m.tag || 'aoe', m.avoidable); }
        break;
      // a line from the boss through the player it's aimed at (m.target): they take it; anyone else in it takes more
      case 'bait': {
        const tg = m.target ?? m.aimFromBoss;
        for (const p of inside) hit(p, p.id === tg ? m.dmg : m.dmg * 1.25, m.tag || 'bait', p.id !== tg);
        break;
      }
      // a circle that belongs to one player (m.target): they must be in it when it lands, and nobody else may be.
      // Missing it: m.dmg on them (and it counts as failed); someone else in it: m.otherDmg on them.
      case 'own': {
        const owner = this.alive().find(p => p.id === m.target);
        for (const p of inside) if (p.id !== m.target) hit(p, m.otherDmg ?? m.dmg * 0.6, m.tag || 'own', true);
        if (owner && !inside.some(p => p.id === owner.id)) { fail = 1; hit(owner, m.dmg, m.tag || 'own', true); }
        else if (owner) this.stats[owner.id].soaked++;
        break;
      }
      // 'safe' (a harmless area, not drawn: sim data for bots) and 'drop' (a marker on a player; its onResolve does the work) hit nobody
      case 'raidwide':
        for (const p of this.alive()) if (!(cov && cov.safe.has(p.id))) hit(p, m.dmg * (eat && eat.raid ? MAW_HOST.RAID : 1), 'raidwide', false);
        if (eat && eat.raid) for (const p of eat.raid) this.eaten(p, eat.type, { mid: m.id, raid: 1 });
        break;
      case 'stack': {
        // m.dmg is the total, split among everyone inside; too few people and it hits harder
        const need = Math.min(m.need || 1, this.alive().length);
        if (!inside.length) { fail = 1; for (const p of this.alive()) hit(p, m.dmg * 0.6, 'stack-miss', true); break; }
        if (inside.length < need) fail = 1;
        else for (const p of inside) this.stats[p.id].soaked++;
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
        if (inside.length < need) { fail = 1; for (const p of this.alive()) hit(p, m.failDmg || m.dmg * 2, 'tower-fail', false); }
        else for (const p of inside) this.stats[p.id].soaked++;
        break;
      }
      case 'buster': {
        const tgt = this.alive().find(p => p.id === (m.target ?? m.follow));
        for (const p of inside) {
          if (tgt && p.id === tgt.id) continue;
          hit(p, m.dmg * 0.7, 'cleave', true);
        }
        if (tgt) { hit(tgt, m.dmg, 'buster', false); if (tgt.s.alive) this.stats[tgt.id].busters++; }
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
    this.emit(fail ? { t: 'tgx', id: m.id, hits, fail } : { t: 'tgx', id: m.id, hits });
    // answered cleanly (nobody caught by something they could avoid, nothing failed): the gauge fills a little
    if (!fail && this.avoidCount === av0 && m.type !== 'raidwide' && m.type !== 'knockback' && m.type !== 'safe' && m.type !== 'drop' && !(m.group && m.group.lb)) this.lbGain(FIGHT.LB.CLEAN);
    if (m.group) m.group.lb = true;   // (a group of circles fills the gauge once)
    this.dollMech(m, cov);   // a Marionettist's Doll caught in it (classes-c)
    this.houndMech(m, cov);   // a Houndmaster's hound caught in it (HOUNDS, the end of this file)
    if (cov) for (const pr of cov.chip) this.hitProp(pr, 1, m.tag);
    if (m.onResolve) m.onResolve(inside, hits, cov);
  }

  raidwide(dmg, delay = 0) { return this.mech({ type: 'raidwide', shape: { kind: 'circle', x: this.boss.x, y: this.boss.y, r: 0 }, delay, dmg, hidden: true }); }
  aoe(shape, delay, dmg, extra = {}) { return this.mech(Object.assign({ type: 'aoe', shape, delay, dmg }, extra)); }

  // Lingering ground hazard: damages anyone inside every `every` seconds.
  // extra.slow: standing in it also slows you (the 'slowed' debuff, which clients and bots move slower under)
  puddle(x, y, r, dur, dmg, every = 1, tag = 'puddle', extra = {}) {
    const pd = { id: this.nextMechId++, x, y, r, end: this.t + dur, dmg, every, tag, last: {}, slow: !!extra.slow, ddown: !!extra.ddown };
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
        this.damagePlayer(p, pd.dmg, { kind: pd.tag, avoidable: true, noVuln: true, ddown: pd.ddown });
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
        if (!ok) for (const p of [pa, pb]) this.damagePlayer(p, th.dmg, { kind: th.tag || 'tether', avoidable: true, ddown: th.ddown });
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
      // inert things you break (a coffin, a cocoon): no moving, no biting
      if (a.inert) { if (a.onTick) a.onTick(a, dt); continue; }
      const near = this.addTarget(a), nd = near ? Math.hypot(near.x - a.x, near.y - a.y) : Infinity;
      a.target = near ? near.id : null;
      if (near) {
        // leashed adds only chase players who come within `leash` of where they hatched; otherwise they go home and spit
        const chase = !a.leash || a.enraged || Math.hypot(near.x - a.homeX, near.y - a.homeY) < a.leash;
        const gx = chase ? near.x : a.homeX, gy = chase ? near.y : a.homeY;
        const gd = Math.hypot(gx - a.x, gy - a.y), stop = chase ? a.r + 30 : 4;
        a.facing = Math.atan2(near.y - a.y, near.x - a.x);
        if (gd > stop) {
          const goal = this.props.length ? PROPS.steer(a, { x: gx, y: gy }, this.props, a.r * 0.8) : { x: gx, y: gy };
          const step = Math.min(gd - stop, a.speed * dt), mv = Math.atan2(goal.y - a.y, goal.x - a.x);
          a.x += Math.cos(mv) * step; a.y += Math.sin(mv) * step;
          PROPS.collide(a, this.props, a.r * 0.8);
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
            this.damagePlayer(p, a.linkDmg, { kind: 'silkbeam', avoidable: true, noVuln: true, ddown: a.ddown });
          }
        }
      }
      if (a.onTick) a.onTick(a, dt);
    }
  }

  // Lasting floor zone with an effect on whoever stands in it. opts: { shape, dur, effect: 'slow', tag }
  // effect 'burn': hurts whoever stands in it (opts.dmg every second) once opts.delay has passed (a fire wall flaring up)
  zone(opts) {
    const z = Object.assign({ id: this.nextMechId++, effect: 'slow', tag: 'zone', last: {} }, opts);
    z.startAt = this.t + (opts.delay || 0);
    z.end = z.startAt + (opts.dur || 9999);
    this.zones.push(z);
    this.emit({ t: 'zone', id: z.id, shape: z.shape, dur: opts.dur || 9999, tag: z.tag, delay: opts.delay || 0 });
    return z;
  }
  updateZones() {
    this.zones = this.zones.filter(z => z.end > this.t);
    for (const z of this.zones) {
      if (this.t < z.startAt) continue;
      if (z.effect === 'burn') {
        for (const p of this.alive()) {
          if (!SHAPES.contains(z.shape, p.x, p.y, 8) || this.t - (z.last[p.id] ?? -9) < 1) continue;
          z.last[p.id] = this.t;
          this.damagePlayer(p, z.dmg || 4000, { kind: z.tag, avoidable: true, noVuln: true, ddown: z.ddown });
        }
        continue;
      }
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
  // Visual only (never a hazard): the lane a roller will take, sent when the cast starts so the path shows from the first
  // moment of the cast; `delay` is the time from now until that roller starts to roll
  rollerPreview(opts) {
    this.rollPre = (this.rollPre || 0) + 1;
    this.emit({ t: 'roll', pre: 1, id: 'p' + this.rollPre, x: Math.round(opts.x), y: Math.round(opts.y), a: +opts.angle.toFixed(3), sp: opts.speed, r: opts.r, delay: opts.delay, tag: opts.tag || 'meatball' });
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
        this.damagePlayer(p, r.dmg, { kind: r.tag, avoidable: true, ddown: r.ddown });
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
        this.damagePlayer(p, rl.dmg, { kind: rl.tag, avoidable: true, ddown: rl.ddown });
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
    this.emit({ t: 'sweep', id: sw.id, x: Math.round(sw.x), y: Math.round(sw.y), arms: sw.arms, a0: +sw.a0.toFixed(3), spin: +sw.spin.toFixed(3), w: sw.w, delay: sw.delay, dur: sw.dur, tag: sw.tag, cover: sw.cover || null });
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
        // sw.cover: props of that kind shelter whoever stands behind them, and the wall smashes each one once it has passed
        if (sw.cover) for (const pr of this.props.filter(q => q.kind === sw.cover)) {
          const dx = pr.x - sw.x, dy = pr.y - sw.y, over = Math.abs(-dx * s + dy * c) < sw.w / 2 + pr.r && dx * c + dy * s > 0;
          const key = 'p' + pr.id + ':' + k;
          if (over) sw.last[key] = 1;
          else if (sw.last[key]) { delete sw.last[key]; this.breakProp(pr, 'storm'); }
        }
        for (const p of this.alive()) {
          const dx = p.x - sw.x, dy = p.y - sw.y, along = dx * c + dy * s, across = -dx * s + dy * c;
          if (along < 0 || Math.abs(across) > sw.w / 2 + 14) continue;
          const key = p.id + ':' + k;
          if (this.t - (sw.last[key] ?? -9) < 1.5) continue;
          if (sw.cover && PROPS.shadowing(sw.x, sw.y, p.x, p.y, this.props, q => q.kind === sw.cover)) continue;
          sw.last[key] = this.t;
          this.damagePlayer(p, sw.dmg, { kind: sw.tag, avoidable: true, ddown: sw.ddown });
          // shoved the way the wall is turning
          const ta = a + Math.sign(sw.spin || 1) * Math.PI / 2;
          this.emit({ t: 'kb', id: p.id, x: p.x - Math.cos(ta) * 20, y: p.y - Math.sin(ta) * 20, d: sw.kb });
        }
      }
    }
  }

  // ---------------------------------------------------------------- the room: props, floor, fire, wall slams
  // a prop standing in the room (see PROPS in shapes.js). o.hp: hits it takes before it breaks (0: never);
  // o.rubble: false leaves nothing behind when it breaks; o.onBreak(prop) runs when it does
  addProp(o) {
    const pr = Object.assign({ id: this.nextMechId++, kind: 'prop', shape: 'circle', r: 30, w: 0, h: 0, a: 0, hp: 0, solid: true, cover: false, state: 0 }, o);
    pr.maxHp = pr.maxHp || pr.hp;
    this.props.push(pr); this.propsDirty = true;
    return pr;
  }
  propById(id) { return this.props.find(p => p.id === id) || null; }
  setPropState(pr, state) { if (pr && pr.state !== state) { pr.state = state; this.propsDirty = true; } }
  // knock hits off a prop; at 0 it breaks. (A prop on its last hit is drawn cracked, so you see it coming.)
  hitProp(pr, n = 1, how = null) {
    if (!pr || !pr.maxHp || !this.props.includes(pr)) return;
    pr.hp -= n;
    if (pr.hp <= 0) { this.breakProp(pr, how); return; }
    this.propsDirty = true;
    this.emit({ t: 'propfx', k: 'chip', id: pr.id, kind: pr.kind, x: Math.round(pr.x), y: Math.round(pr.y) });
  }
  breakProp(pr, how = null) {
    if (!this.props.includes(pr)) return;
    this.props = this.props.filter(p => p !== pr); this.propsDirty = true;
    const size = pr.shape === 'rect' ? Math.max(pr.w, pr.h) / 2 : pr.r;
    this.emit({ t: 'propfx', k: 'break', id: pr.id, kind: pr.kind, x: Math.round(pr.x), y: Math.round(pr.y), r: Math.round(size), a: +(pr.a || 0).toFixed(2), how });
    if (pr.rubble !== false) this.addFloor({ kind: 'rubble', of: pr.kind, x: Math.round(pr.x), y: Math.round(pr.y), r: Math.round(size * 1.15) });
    if (pr.onBreak) pr.onBreak(pr);
  }
  removeProp(pr) { if (this.props.includes(pr)) { this.props = this.props.filter(p => p !== pr); this.propsDirty = true; } }
  // a lasting change to the floor, drawn once into the room layer: { kind, x, y, r, ... } (rounded by the caller)
  addFloor(o) { const fl = Object.assign({ id: this.nextMechId++ }, o); this.floor.push(fl); this.floorVer++; this.propsDirty = true; return fl; }
  removeFloor(fl) { this.floor = this.floor.filter(f => f !== fl); this.fires.delete(fl.id); this.floorVer++; this.propsDirty = true; }

  // fire on the floor: grease puddles (Grubnak, Hard) touching the shape catch, and fire runs on through every puddle
  // touching a burning one. Each burns for `dur` s, hurting whoever stands in it every second.
  ignite(shape, dur = 6) {
    const grease = this.floor.filter(fl => fl.kind === 'grease');
    const lit = grease.filter(fl => SHAPES.contains(shape, fl.x, fl.y, fl.r * 0.8));
    const seen = new Set(lit.map(fl => fl.id));
    for (let i = 0; i < lit.length; i++) for (const o of grease) {
      if (seen.has(o.id) || Math.hypot(o.x - lit[i].x, o.y - lit[i].y) > o.r + lit[i].r - 10) continue;
      seen.add(o.id); lit.push(o);
    }
    for (const fl of lit) {
      if (!(this.fires.get(fl.id) > this.t)) this.emit({ t: 'propfx', k: 'ignite', id: fl.id, x: fl.x, y: fl.y, r: fl.r });
      this.fires.set(fl.id, Math.max(this.fires.get(fl.id) || 0, this.t + dur));
    }
    if (lit.length) this.propsDirty = true;
    return lit.length;
  }
  burning(fl) { return this.fires.get(fl.id) > this.t; }
  updateFires() {
    if (!this.fires.size) return;
    for (const [id, until] of this.fires) {
      const fl = this.floor.find(f => f.id === id);
      if (!fl || until <= this.t) { this.fires.delete(id); this.propsDirty = true; continue; }
      fl.last = fl.last || {};
      for (const p of this.alive()) {
        if (Math.hypot(p.x - fl.x, p.y - fl.y) > fl.r + 10 || this.t - (fl.last[p.id] || -9) < 1) continue;
        fl.last[p.id] = this.t;
        this.damagePlayer(p, fl.dmg || 4000, { kind: 'burn', avoidable: true, noVuln: true, ddown: fl.ddown });
      }
    }
  }

  // throw a player away from (fx, fy) by dist. The throw stops at the wall or at a solid prop; stopped well short
  // (more than opts.slamAt, default 40) it's a wall slam: opts.slam damage, and dazed (held in place) for 0.6 s.
  knock(p, fx, fy, dist, opts = {}) {
    const a = Math.atan2(p.y - fy, p.x - fx), want = { x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist };
    const dest = ARENA.clamp({ x: want.x, y: want.y }, 12);
    const prop = PROPS.clipMove(p, dest, this.props, 14);
    const short = dist - Math.hypot(dest.x - p.x, dest.y - p.y), slam = short > (opts.slamAt ?? 40);
    this.emit({ t: 'kb', id: p.id, x: Math.round(fx), y: Math.round(fy), d: dist });
    if (slam && opts.slam != null) {
      this.damagePlayer(p, opts.slam, { kind: 'slam', avoidable: true, ddown: opts.ddown });
      this.debuff(p.id, 'rooted', opts.daze ?? 0.6);
      this.emit({ t: 'propfx', k: 'slam', x: Math.round(dest.x), y: Math.round(dest.y), a: +a.toFixed(2), id: prop ? prop.id : null, pid: p.id });
    }
    return { slam, dest, prop };
  }

  // ---------------------------------------------------------------- broadcasting
  // the room: every prop, the floor, which grease is burning, and how a round room's edge has broken
  broadcastProps() {
    this.propsDirty = false; this.lastPropsSend = this.t;
    const lit = []; for (const [id, until] of this.fires) if (until > this.t) lit.push([id, +(until - this.t).toFixed(1)]);
    // the floor list only when it has changed (and every ~9 s for anyone who missed it)
    const withFloor = this.floorSent !== this.floorVer || this.t - (this.floorSentAt ?? -99) >= 9;
    if (withFloor) { this.floorSent = this.floorVer; this.floorSentAt = this.t; }
    this.emit({ t: 'props', p: this.props.map(pr => PROPS.pack(pr)), f: withFloor ? this.floor.map(({ last, ...fl }) => fl) : undefined, fv: this.floorVer, lit });
  }
  broadcastBoss() {
    const b = this.boss;
    this.emit({ t: 'fb', hp: b.hp, mx: b.maxHp, x: Math.round(b.x), y: Math.round(b.y), f: +b.facing.toFixed(2), tg: b.target,
      u: b.untargetable ? 1 : 0, v: b.vulnEnd > this.t ? b.vuln : 0, ft: Math.round(this.t * 10) / 10, ph: this.phase,
      na: +(b.autoAt - this.t).toFixed(2),  // time to the next auto-attack, so clients can show the wind-up
      c: +this.t.toFixed(3),                // the fight clock, so clients can space the boss's moves evenly (interp.js)
      bs: this.bossStatus(), po: this.postureOn ? this.kenPack() : undefined,                // what's on the boss, for the icons under the boss bar (raid-ui.js)
      g: this.gateMsg(), wl: this.wall ? this.wall.label : undefined });   // the HP gates for the bar's ticks, and the wall's label while it holds
    if (this.adds.size || this.addsDirty) this.broadcastAdds();
  }
  // host-side states on the boss, compact: [kind, seconds left (0 = no timer), value, who]
  //   ['vuln', s, % more damage taken] Hunter's Mark · ['dmg', 0, % more damage dealt] (Gorge and the like)
  //   ['brand', s, charges, Inquisitor's id] · ['stun', s, % more damage taken] (wall slam)
  bossStatus() {
    const b = this.boss, t = this.t, out = [];
    if (b.vulnEnd > t && b.vuln) out.push(['vuln', Math.ceil(b.vulnEnd - t), Math.round(b.vuln * 100)]);
    if (b.dmgUp > 0) out.push(['dmg', 0, Math.round(b.dmgUp * 100)]);
    if (b.brand && b.brand.end > t && b.brand.charges > 0) out.push(['brand', Math.ceil(b.brand.end - t), b.brand.charges, b.brand.from]);
    if (b.exposedUntil > t) out.push(['stun', Math.ceil(b.exposedUntil - t), Math.round((b.exposed || 0) * 100)]);
    if (b.pauseUntil > t) out.push(['pause', Math.ceil(b.pauseUntil - t), 0]);   // a Time Stop (pauseBoss)
    if (this.wall) out.push(['wall', 0, 0, this.wall.label]);   // sealed at a gate (a wall)
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
        Math.round((1 - mit) * 100), s.weakEnd > this.t ? [Math.round((s.weakPct || 0) * 100), Math.ceil(s.weakEnd - this.t)] : 0, debuffs, hots,
        s.hollow ? [1, Math.round(s.hollow.debt), Math.round(s.hollow.heal), +Math.max(0, s.hollow.until - this.t).toFixed(1), +Math.max(0, s.hollow.graceUntil - this.t).toFixed(1)] : 0]);   // (a Gloomsworn's Hollow: on, debt, healed, seconds left, grace left)
    }
    this.emit({ t: 'fps', ps: list, lb: Math.round(this.lb), dc: this.partyDeaths(), rc: this.recoverEnd > this.t ? Math.ceil(this.recoverEnd - this.t) : 0 });
  }
}

// ===================================================================================================================
// ADVANCED TANKS (tanks-2): the host's side of the Gorgemaw's jaw and the Oathbroker's Ledger. Both classes run their
// kits on their own clients like everyone else; these are the parts that touch HP, which only the host owns.
// ===================================================================================================================
// Gorgemaw: an open jaw (a `maw` event, at most WIN s) eats what lands on it. What's edible, and as which Morsel:
//   aoe: by shape (circle / donut: ring, rect / cross: lance, cone: fang)   spread: ring   buster: spike   proximity: ring
//   raidwide: only through Bottomless (`all`), which halves it for everyone and gives a ring per hit
// Not edible: towers and stacks (they want bodies), tethers, gazes, knockbacks and gales, Lights Out, rollers, sweeps,
// puddles and fire, adds, autos, the enrage. A mechanic can say otherwise with `eat: false` or `eat: '<shape>'`, and a
// boss's own hit can be edible with damagePlayer(p, dmg, { eat: '<shape>', mid }) (Volkar's Rod Strike and Chain Lightning).
const MAW_HOST = { EAT: 0.25, RAID: 0.5, WIN: 4.2 };
MAW_HOST.typeOf = m => {
  if (m.eat === false) return null;
  if (typeof m.eat === 'string') return m.eat;
  if (m.cover) return null;   // a blast you hide from (Gut Blast, Dead Wind...) fills the room: nothing to bite
  switch (m.type) {
    case 'aoe': { const k = m.shape && m.shape.kind; return k === 'circle' || k === 'donut' ? 'ring' : k === 'rect' || k === 'cross' ? 'lance' : k === 'cone' ? 'fang' : null; }
    case 'spread': case 'proximity': case 'raidwide': return 'ring';
    case 'buster': return 'spike';
  }
  return null;
};
Object.assign(FightSim.prototype, {
  // can this player eat right now? (raid: only Bottomless eats raidwides)
  canEat(p, raid) { const s = p.s || this.ps.get(p.id); return !!(s && s.alive && s.maw && s.maw.until > this.t && (!raid || s.maw.all)); },
  eatInfo(m, inside) {
    let anyone = false;
    for (const s of this.ps.values()) if (s.maw && s.maw.until > this.t && s.alive) { anyone = true; break; }
    if (!anyone) return null;
    const type = MAW_HOST.typeOf(m);
    if (!type) return null;
    const eaters = this.alive().filter(p => this.canEat(p));
    if (!eaters.length) return null;
    if (m.type === 'raidwide') { const r = eaters.filter(p => p.s.maw.all); return r.length ? { type, raid: r } : null; }
    // a circle on one person (a spread, a jar or a cask chasing them): whoever eats it takes it for them
    if (m.type === 'spread' || (m.type === 'aoe' && m.follow != null && m.shape.kind === 'circle')) {
      const e = eaters.find(p => inside.some(q => q.id === p.id));
      if (e) return { type, whole: e, owner: m.follow !== e.id ? m.follow : null };
      return null;
    }
    if (m.type === 'buster') { const tg = m.target ?? m.follow, e = eaters.find(p => p.id === tg); return e ? { type, on: [e] } : null; }
    const on = m.type === 'proximity' ? eaters : eaters.filter(p => inside.some(q => q.id === p.id));
    return on.length ? { type, on } : null;
  },
  // a Morsel for p: the owner's kit takes it (fev 'eat'); every client draws the mechanic going down (w: all of it)
  eaten(p, type, o = {}) {
    const s = p.s || this.ps.get(p.id);
    if (!s) return;
    const key = o.mid != null ? String(o.mid) : null;
    if (key && s.ateKey === key) return;   // one Morsel per mechanic
    if (key) s.ateKey = key;
    s.ate = (s.ate || 0) + 1;
    this.emit({ t: 'fev', k: 'eat', id: p.id, m: type, mid: typeof o.mid === 'number' ? o.mid : null, w: o.whole ? 1 : 0, r: o.raid ? 1 : 0, f: o.owner ?? null });
  },
  // every hit on a player passes through here (damagePlayer, after mitigation): the jaw, then the Ledger
  classHit(p, s, amt, opts) {
    if (amt <= 0 || opts.kind === 'enrage' || opts.kind === 'fall') return amt;
    if (opts.eat && this.canEat(p)) {
      amt *= MAW_HOST.EAT;
      opts.avoidable = false;
      this.eaten(p, opts.eat, { mid: opts.mid, whole: opts.whole, owner: opts.owner });
    }
    if (opts.raw || opts.nomit) return amt;
    if (s.led) amt -= OATH.write(s.led, amt, this.t);
    // co-signed by a Guarantor: part of the hit goes onto their Ledger
    for (const g of this.ps.values()) {
      const L = g.led;
      if (!L || g === s || !g.alive || !L.cosign || L.cosign.id !== p.id || L.cosign.until <= this.t) continue;
      amt -= OATH.write(L, amt, this.t, { co: p.id });
      break;
    }
    return amt;
  },
  classDeath(p, s) {
    s.defl = null; s.step = null; s.offbal = 0;   // (a Kenseier's deflect, step and Off-balance end with it)
    s.maw = null; s.hollow = null; s.glm = null;   // (a Hollow ends with the knight)
    if (s.led) { s.led.e = []; s.led.cosign = null; s.led.ver++; }
  },
  classEvent(pid, ev) {
    const s = this.ps.get(pid), me = this.players().find(q => q.id === pid);
    if (!s || !me) return;
    if (ev.type === 'maw') {
      if (me.cls !== 'gorgemaw') return;
      const dur = Math.max(0, Math.min(MAW_HOST.WIN, Number(ev.dur) || 0));
      s.maw = { until: this.t + dur, all: !!ev.all && dur > 1 };
      return;
    }
    if (ev.type === 'gloom') {   // the Gloomsworn's vessel, as its kit sees it (HOLLOW_HOST judges a killing blow by it)
      if (me.cls !== 'gloomsworn') return;
      const H = HOLLOW_HOST, num = (v, a, b, d) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d);
      s.glm = { v: num(ev.value, 0, 100, 0), at: this.t, dur: num(ev.dur, H.DUR_MIN, H.DUR_MAX, H.DUR), grace: num(ev.secs, H.GRACE_MIN, H.GRACE_MAX, H.GRACE), cd: num(ev.st, H.CD_MIN, H.CD, H.CD) };
      return;
    }
    if (me.cls !== 'oathbroker') return;
    const L = s.led || (s.led = OATH.make());
    if (ev.op === 'terms') { OATH.terms(L, ev, s.maxHp); return; }
    if (ev.op === 'cosign') {
      // a Guarantor's bond: the ally named (yourself or nobody: the most hurt other ally)
      let tid = typeof ev.target === 'number' ? ev.target : null;
      const ok = id => { const q = this.ps.get(id); return q && q.alive && !q.left && id !== pid; };
      if (!ok(tid)) { tid = null; let bf = Infinity; for (const q of this.alive()) { if (q.id === pid) continue; const f = q.s.hp / q.s.maxHp; if (f < bf) { bf = f; tid = q.id; } } }
      L.cosign = tid != null ? { id: tid, until: this.t + Math.max(0, Math.min(24, Number(ev.dur) || 0)) } : null;
      L.ver++;
      this.sendLedger(pid, true);
      return;
    }
    const r = OATH.op(L, ev, this.t, s.maxHp);
    const p = this.alive().find(q => q.id === pid);
    if (r.self > 0 && p) { this.damagePlayer(p, r.self, { kind: 'settle', raw: true, nomit: true }); this.emit({ t: 'fev', k: 'bill', id: pid, a: Math.round(r.self), s: 1 }); }
    if (r.boss > 0) this.ledgerStrike(pid, r.boss);
    if (r.co) for (const [id, a] of Object.entries(r.co)) if (a > 0) this.applyHeal(pid, Number(id), a);   // (a co-signed line paid down heals its ally)
    if (ev.op === 'default' || ev.op === 'foreclose') this.emit({ t: 'fev', k: 'default', id: pid, b: Math.round(r.boss) });
    this.sendLedger(pid, true);
  },
  // the boss pays: damage credited to the Oathbroker
  ledgerStrike(pid, amt) {
    const s = this.ps.get(pid), b = this.boss;
    if (!s || b.untargetable || this.state !== 'live' || !(amt > 0)) return;
    amt = Math.round(Math.min(amt, 15000));
    b.hp = Math.max(this.wallHp ?? 0, b.hp - amt);
    this.stats[pid].damage += amt;
    if (b.hp <= 0) this.end('clear');
  },
  // the owner's copy of a Ledger (and every client's, for the stamps): on every change, and each second while it holds
  sendLedger(pid, force, bill) {
    const s = this.ps.get(pid), L = s && s.led;
    if (!L) return;
    const busy = L.e.length || this.t < L.frozen || this.t < L.lien || this.t < L.hold || (L.cosign && L.cosign.until > this.t);
    if (!force && L.sentVer === L.ver && !(busy && this.t - (L.sentAt ?? -99) >= 1)) return;
    if (!force && L.sentVer !== L.ver && this.t - (L.sentAt ?? -99) < 0.1) return;   // at most ten a second
    L.sentVer = L.ver; L.sentAt = this.t;
    this.emit(Object.assign({ t: 'fev', k: 'ledger', id: pid }, OATH.pack(L, this.t), bill ? { bill: Math.round(bill) } : null));
  },
  updateClass(dt) {
    this.hollowTick();
    for (const [pid, s] of this.ps) {
      const L = s.led;
      if (!L || s.left) continue;
      if (!s.alive) { if (L.e.length) { L.e = []; L.ver++; } this.sendLedger(pid); continue; }
      const due = OATH.bills(L, this.t, dt);
      let billed = 0;
      for (const b of due) {
        const p = this.alive().find(q => q.id === pid);
        if (!p) break;
        if (b.self > 0) { this.damagePlayer(p, b.self, { kind: 'ledger', raw: true, nomit: true }); billed += b.self; }
        if (b.boss > 0) this.ledgerStrike(pid, b.boss);
        if (b.heal > 0) this.applyHeal(pid, this.resolveTarget(pid, 'lowest'), b.heal);
        this.emit({ t: 'fev', k: 'bill', id: pid, a: Math.round(b.self), b: Math.round(b.boss), sm: b.small ? 1 : 0 });
        if (this.state !== 'live') return;
      }
      if (L.cosign && L.cosign.until <= this.t) { L.cosign = null; L.ver++; }
      this.sendLedger(pid, false, billed || null);
    }
  },
});

// ===================================================================================================================
// GLOOMSWORN (tank, class 18): Hollow, host side. The knight's kit tells the host its Gloom (a 'gloom' event: value, and
// the Hollow it would have: dur, grace). When a blow would take a Gloomsworn from alive to dead while that Gloom is full,
// and it is not already Hollow and the minute has passed, it does not: HP is held at 1 and s.hollow = { until, graceUntil,
// debt, heal } starts. Every point of damage it would take (after shields, mitigation and the rest) is added to the debt,
// the whole of every heal and half of every shield pay it (applyHeal, giveShield, the 'shield' event), through the window
// and the grace after it. At graceUntil: healed >= debt and it stands up at WAKE of its HP, otherwise it dies the usual way.
// The sentences (Royal Doom running out, the enrage, a fall) never reach this: they kill outright, which also ends a Hollow
// (classDeath). A revive clears it too. HP never drops below 0: the debt is its own number.
// ===================================================================================================================
const HOLLOW_HOST = { DEBT: 1.8, DUR: 8, DUR_MIN: 6, DUR_MAX: 12, GRACE: 4, GRACE_MIN: 2, GRACE_MAX: 8, CD: 60, CD_MIN: 30, WAKE: 0.25, SHIELD: 0.5, STALE: 4, NOT: new Set(['doom', 'enrage', 'fall']) };
Object.assign(FightSim.prototype, {
  // one hit of amt on p (after mitigation). True if Hollow took it (the debt grew, or Hollow began and the hit was forgiven)
  hollowHit(p, s, amt, opts) {
    const H = HOLLOW_HOST;
    if (s.hollow) { s.hollow.debt += amt * HOLLOW_HOST.DEBT; return true; }   // (DEBT: every point written down counts this many times; mitigation and barriers already cut amt)
    if (!s.glm || s.hp - amt > 0 || H.NOT.has(opts.kind)) return false;
    if (s.glm.v < 99.5 || this.t - s.glm.at > H.STALE || this.t < (s.hollowCd || 0)) return false;
    s.hollow = { until: this.t + s.glm.dur, graceUntil: this.t + s.glm.dur + s.glm.grace, debt: 0, heal: 0 };
    s.hollowCd = this.t + s.glm.cd;
    s.hp = 1; s.glm.v = 0;
    this.emit({ t: 'fev', k: 'hollow', id: p.id, on: 1, d: +s.glm.dur.toFixed(1), g: +s.glm.grace.toFixed(1) });
    return true;
  },
  // a shield given to a Hollow knight pays its debt at half (it never stands: all damage is debt already)
  hollowShield(from, ts, amount) {
    const amt = Math.max(0, Math.min(8000, (Number(amount) || 0) | 0)) * HOLLOW_HOST.SHIELD;
    ts.hollow.heal += amt;
    const st = this.stats[from]; if (st) st.healing += Math.round(amt);
  },
  // every tick: a Hollow whose grace has run out is settled
  hollowTick() {
    for (const [pid, s] of this.ps) {
      if (!s.hollow || s.left) continue;
      if (!s.alive) { s.hollow = null; continue; }
      if (this.t < s.hollow.graceUntil) continue;
      const H = s.hollow, ok = H.heal >= H.debt;
      s.hollow = null;
      if (ok) {
        s.hp = Math.max(1, Math.round(s.maxHp * HOLLOW_HOST.WAKE));
        this.emit({ t: 'fev', k: 'hollow', id: pid, on: 0, ok: 1, debt: Math.round(H.debt), heal: Math.round(H.heal) });
      } else {
        this.emit({ t: 'fev', k: 'hollow', id: pid, on: 0, ok: 0, debt: Math.round(H.debt), heal: Math.round(H.heal) });
        this.hollowKill(pid, s, Math.round(H.debt - H.heal));
      }
    }
  },
  // the debt was not paid: the knight falls the way a hit would have felled it
  hollowKill(pid, s, short) {
    const p = this.players().find(q => q.id === pid), st = this.stats[pid];
    this.emit({ t: 'pdmg', id: pid, a: Math.max(1, short), k: 'hollow', hp: 0, dd: 0, n: 'Hollow debt' });
    s.hp = 0; s.alive = false; s.shield = 0; s.mits = []; s.hots = []; s.diedAt = this.t; this.dropThreat(pid);
    if (this.classDeath) this.classDeath(p || { id: pid }, s);
    if (st) st.deaths++;
    this.emit({ t: 'fev', k: 'death', id: pid });
    if (this.hard && this.t >= this.recoverEnd + FIGHT.REC.COOL && this.state === 'live') { this.recoverEnd = this.t + FIGHT.REC.DUR; this.emit({ t: 'fev', k: 'recover', dur: FIGHT.REC.DUR }); }
  },
});

// CLASSES-C: the Threadweaver's threads and the Marionettist's Dolls, host side. One block of FightSim methods; the core
// calls in with one line each: tick (weaveTick, dollTick), onEvent (weaveEvent, threadHeal), damagePlayer (threadSplit),
// resolveMech (dollMech), end (weaveClear), and the Stage's bonus in the 'damage' case.
//
// Threads: { id, from (the weaver), a, b, at, log: [[t, carried]], sh (heal when it snaps on its own), st (how much of
// what it carried Snap releases), dp (Loomwright: heals run two links deep), hold (no snapping before) }.
//   - Any hit on one end is split evenly among it and everyone threaded to it (Tapestry: everyone), before mitigation;
//     each share then runs through its taker's own damage order (vulnerability, mitigation and parry, the Gorgemaw's
//     jaw, the Oathbroker's Ledger, shields), marked shared so it never splits again. Enrage, falls, self-inflicted
//     damage, Ledger bills and a hit an open jaw is about to eat are never split.
//   - A heal on one end runs 60% down each thread (Mend Seam's `seam`: 100%; Embroider's seam 2 goes a link further).
//   - Ends more than 550 px apart snap the thread: a small heal to both, and the weaver hears ('snapped').
//   - The weaver hears what their threads carried ('carry', twice a second), which fills Spool.
//   - Everyone gets the list ('thr', on change and every second) and draws the threads, and every snap ('thrs').
// Dolls: each Marionettist reports where its Dolls are (setDoll: a human's client 10 times a second, a bot's kit every
// tick). A telegraph that resolves over one ('dollhit' to its owner) tears a String, the same shapes that hit a player:
// circles and cones, spreads, a tankbuster's cleave, a cover blast it isn't sheltered from, rollers and storm walls.
// Two Dolls and their owner make the Stage: with the boss's centre inside that triangle, it takes 10% more damage.
// Bosses and bots never target a Doll; it's never in alive() or players().
// ===================================================================================================================
const WEAVE_HOST = { SNAP: 550, MAX: 5, SHARE: 0.6, DEEP: 0.3, CARRY_SECS: 5, NO_SPLIT: new Set(['enrage', 'fall', 'self', 'thread', 'ledger', 'settle']) };
const DOLL_HOST = { STAGE: 0.10, STALE: 1.5, PAD: 12 };
Object.assign(FightSim.prototype, {
  // ---------------------------------------------------------------- threads
  partnersOf(id) {
    const out = new Set();
    for (const th of this.threads || []) { if (th.a === id) out.add(th.b); else if (th.b === id) out.add(th.a); }
    return out;
  },
  weaveEvent(pid, ev) {
    this.threads = this.threads || [];
    const al = new Map(this.alive().map(p => [p.id, p])), num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
    switch (ev.type) {
      case 'tie': {
        const b = this.resolveTarget(pid, ev.target), a = ev.pair != null ? ev.pair : pid;
        if (a === b || !al.has(a) || !al.has(b)) { this.emit({ t: 'fev', k: 'tiefail', id: pid }); return; }
        const same = th => (th.a === a && th.b === b) || (th.a === b && th.b === a);
        // a second Tie re-routes your thread to the first ally into one between the two allies
        if (ev.pair != null) this.threads = this.threads.filter(th => !(th.from === pid && ((th.a === pid && th.b === ev.pair) || (th.b === pid && th.a === ev.pair))));
        this.threads = this.threads.filter(th => !same(th));
        const mine = this.threads.filter(th => th.from === pid), mx = Math.round(num(ev.mx, 1, WEAVE_HOST.MAX));
        while (mine.length >= mx) { const old = mine.shift(); this.threads.splice(this.threads.indexOf(old), 1); }
        this.threads.push({ id: this.nextMechId++, from: pid, a, b, at: this.t, log: [], sh: num(ev.amount, 0, 3000), st: num(ev.st, 1, 2), dp: ev.dp ? 1 : 0, rg: num(ev.rg, 0, 1), hold: this.t + num(ev.hm, 0, 6) });
        this.weaveDirty = true;
        return;
      }
      case 'snip': {
        const tid = this.resolveTarget(pid, ev.target);
        let cut = this.threads.filter(th => th.from === pid && (th.a === tid || th.b === tid));
        if (!cut.length) cut = this.threads.filter(th => th.from === pid);
        const value = num(ev.value, 0, 2.5), floor = num(ev.amount, 0, 3000), sh = num(ev.sh, 0, 3000);
        for (const th of cut) {
          const carried = th.log.reduce((s, l) => s + (l[0] >= this.t - WEAVE_HOST.CARRY_SECS ? l[1] : 0), 0);
          const heal = Math.min(3000, Math.max(floor, carried * value));
          for (const e of [th.a, th.b]) { this.applyHeal(pid, e, heal); const es = this.ps.get(e); if (sh && es && es.alive) this.giveShield(pid, e, es, sh, 6); }
          this.threads.splice(this.threads.indexOf(th), 1);
        }
        if (cut.length) { this.emit({ t: 'thrs', l: cut.map(th => [th.a, th.b, 1]) }); this.weaveDirty = true; }
        return;
      }
      case 'tighten': {
        const tid = this.resolveTarget(pid, ev.target), me = al.get(tid);
        if (!me) return;
        // the nearest ally on the far end of its threads
        let q = null, qd = Infinity;
        for (const id of this.partnersOf(tid)) { const o = al.get(id); if (!o) continue; const d = Math.hypot(o.x - me.x, o.y - me.y); if (d < qd) { qd = d; q = o; } }
        if (!q || qd < 70) return;
        const pull = Math.min(num(ev.r, 0, 260), qd - 50), ux = (q.x - me.x) / qd, uy = (q.y - me.y) / qd;
        // a throw toward the partner: 'kb' throws away from a point, so the point sits just behind
        const throwTo = (p, dx, dy, d) => this.emit({ t: 'kb', id: p.id, x: Math.round(p.x - dx * 20), y: Math.round(p.y - dy * 20), d: Math.round(d) });
        if (ev.both) { throwTo(me, ux, uy, pull / 2); throwTo(q, -ux, -uy, pull / 2); } else throwTo(me, ux, uy, pull);
        if (ev.mit) for (const p of [me, q]) p.s.mits.push({ pct: num(ev.mit, 0, 0.2), start: this.t, end: this.t + 4, from: pid });
        this.emit({ t: 'thrs', l: [[tid, q.id, 2]] });
        return;
      }
      case 'tapestry':
        this.tapestry = { from: pid, end: this.t + num(ev.dur, 0, 10), keep: !!ev.keep };
        this.weaveDirty = true;
        return;
      case 'tug': {   // Needle: each thread on the weaver heals whichever of its two ends is more hurt (the far end on a tie)
        const amt = num(ev.amount, 0, 3000), hp = id => { const q = this.ps.get(id); return q && q.alive ? q.hp / Math.max(1, q.maxHp) : 2; };
        for (const th of this.threads) if (th.from === pid && (th.a === pid || th.b === pid)) { const far = th.a === pid ? th.b : th.a; this.applyHeal(pid, hp(pid) < hp(far) ? pid : far, amt); }
        return;
      }
    }
  },
  // the hit on p (amt, in small numbers) split evenly with everyone threaded to it: returns p's own share
  threadSplit(p, s, amt, opts) {
    if ((!this.threads || !this.threads.length) && !(this.tapestry && this.tapestry.end > this.t)) return amt;
    if (opts.raw || WEAVE_HOST.NO_SPLIT.has(opts.kind) || !(amt > 0) || s.mits.some(m => m.kind === 'invuln')) return amt;
    // a raidwide is never split along the threads (it would pile onto the weaver at the middle of the web): every thread
    // rings instead, a heal to both its ends once the hit has landed (weaveTick)
    if (opts.kind === 'raidwide') {
      this.ringAcc = this.ringAcc || new Map();
      for (const th of this.threads || []) if (th.a === p.id || th.b === p.id) {
        const r = this.ringAcc.get(th) || { at: this.t, sum: 0 };
        r.sum += amt; this.ringAcc.set(th, r);
        th.log.push([this.t, amt / 2]);
        this.carryAcc = this.carryAcc || new Map();
        this.carryAcc.set(th.from, (this.carryAcc.get(th.from) || 0) + amt / 2);
      }
      return amt;
    }
    // a hit a Gorgemaw's open jaw is about to eat isn't shared: the jaw swallows it (to 25%) and keeps what's left;
    // Ledger bills and settles are raw, so a debt coming due never splits either (NO_SPLIT names them too)
    if (opts.eat && this.canEat && this.canEat(p)) return amt;
    const tp = this.tapestry && this.tapestry.end > this.t ? this.tapestry : null;
    const ids = tp ? null : this.partnersOf(p.id);
    const partners = this.alive().filter(q => q.id !== p.id && (tp || ids.has(q.id)));
    if (!partners.length) return amt;
    const share = amt / (partners.length + 1);
    this.carryAcc = this.carryAcc || new Map();
    for (const q of partners) {
      const th = (this.threads || []).find(t => (t.a === p.id && t.b === q.id) || (t.b === p.id && t.a === q.id));
      if (th) th.log.push([this.t, share]);
      const w = th ? th.from : tp.from;
      this.carryAcc.set(w, (this.carryAcc.get(w) || 0) + share);
      this.damagePlayer(q, share, { kind: 'thread', scaled: true, shared: true });
    }
    return share;
  },
  // a heal on tid runs down its threads (60%; seam 1: all of it; Loomwright and seam 2: a link further)
  threadHeal(fromId, tid, amount, seam) {
    if (!this.threads || !this.threads.length) return;
    const first = this.partnersOf(tid);
    if (!first.size) return;
    const amt = Math.max(0, Math.min(8000, amount | 0)), share = seam ? 1 : WEAVE_HOST.SHARE;
    for (const id of first) this.applyHeal(fromId, id, amt * share);
    const deep = seam === 2 || this.threads.some(th => th.dp && (th.a === tid || th.b === tid));
    if (!deep) return;
    const second = new Set();
    for (const id of first) for (const o of this.partnersOf(id)) if (o !== tid && !first.has(o)) second.add(o);
    for (const id of second) this.applyHeal(fromId, id, amt * (seam === 2 ? WEAVE_HOST.SHARE : WEAVE_HOST.DEEP));
  },
  weaveTick() {
    if (!this.threads) return;
    const al = new Map(this.alive().map(p => [p.id, p])), snaps = [];
    if (this.ringAcc && this.ringAcc.size) {   // the web rings after a raidwide: rg of what its two ends took, as a heal to both
      for (const [th, r] of this.ringAcc) if (r.at < this.t) {
        this.ringAcc.delete(th);
        if (!th.rg || !this.threads.includes(th)) continue;
        for (const e of [th.a, th.b]) if (al.has(e)) this.applyHeal(th.from, e, Math.min(3000, th.rg * r.sum / 2));
        this.emit({ t: 'thrs', l: [[th.a, th.b, 2]] });
      }
    }
    const keep = this.tapestry && this.tapestry.end > this.t && this.tapestry.keep ? this.tapestry.from : null;
    for (const th of [...this.threads]) {
      const a = al.get(th.a), b = al.get(th.b);
      if (!a || !b) { this.threads.splice(this.threads.indexOf(th), 1); this.weaveDirty = true; continue; }
      while (th.log.length && th.log[0][0] < this.t - WEAVE_HOST.CARRY_SECS) th.log.shift();
      if (Math.hypot(a.x - b.x, a.y - b.y) <= WEAVE_HOST.SNAP || this.t < th.hold || th.from === keep) continue;
      // pulled too far apart: it snaps, with a small heal to both ends
      this.threads.splice(this.threads.indexOf(th), 1);
      this.applyHeal(th.from, th.a, th.sh); this.applyHeal(th.from, th.b, th.sh);
      this.emit({ t: 'fev', k: 'snapped', id: th.from, a: th.a, b: th.b });
      snaps.push([th.a, th.b, 0]);
    }
    if (snaps.length) { this.emit({ t: 'thrs', l: snaps }); this.weaveDirty = true; }
    if (this.tapestry && this.tapestry.end <= this.t) { this.tapestry = null; this.weaveDirty = true; }
    if (this.carryAcc && this.carryAcc.size && this.t - (this.carryAt ?? -9) >= 0.5) {
      this.carryAt = this.t;
      for (const [w, a] of this.carryAcc) if (a >= 1) this.emit({ t: 'fev', k: 'carry', id: w, a: Math.round(a) });
      this.carryAcc.clear();
    }
    if (this.weaveDirty || this.t - (this.weaveSent ?? -9) >= 1) this.weaveSend();
  },
  // the web for everyone: [a, b, weaver] per thread, and the Tapestry as [weaver, seconds left] (0: none)
  weaveSend() {
    this.weaveDirty = false; this.weaveSent = this.t;
    const tp = this.tapestry && this.tapestry.end > this.t ? [this.tapestry.from, +(this.tapestry.end - this.t).toFixed(1)] : 0;
    this.emit({ t: 'thr', l: (this.threads || []).map(th => [th.a, th.b, th.from]), tp });
  },
  weaveClear() {
    if (this.threads && (this.threads.length || this.tapestry)) { this.threads = []; this.tapestry = null; this.weaveSend(); }
    this.dollHitMemo = {};
    if (this.dolls && this.dolls.size) { this.dolls.clear(); this.stageUntil = 0; this.emit({ t: 'dolls', l: [], s: 0 }); }
  },

  // ---------------------------------------------------------------- Dolls
  // a Marionettist's Dolls: up to two { x, y, st } (st: 0 standing, 1 can't be touched, 2 limp, 3 in Grand Finale, 4 moving)
  setDoll(pid, list) {
    if (!Array.isArray(list) || !this.ps.has(pid)) return;
    const n = v => Math.max(-2000, Math.min(2000, Math.round(Number(v) || 0)));
    this.dolls = this.dolls || new Map();
    this.dolls.set(pid, { l: list.slice(0, 2).map(d => ({ x: n(d && d.x), y: n(d && d.y), st: Math.max(0, Math.min(4, (d && d.st) | 0)), s: Math.max(0, Math.min(3, d && d.s != null ? d.s | 0 : 3)) })), at: this.t });
  },
  // the Dolls whose owners are alive and still reporting: [[ownerId, doll, index]]
  liveDolls() {
    const out = [];
    if (!this.dolls) return out;
    for (const [pid, D] of this.dolls) {
      const s = this.ps.get(pid);
      if (!s || !s.alive || this.t - D.at > DOLL_HOST.STALE) continue;
      D.l.forEach((d, i) => out.push([pid, d, i]));
    }
    return out;
  },
  dollMech(m, cov) {
    if (!this.dolls || !this.dolls.size) return;
    const props = cov ? this.props.filter(pr => pr.cover) : null;
    for (const [pid, d, i] of this.liveDolls()) {
      if (d.st === 2) continue;   // (a spinning Doll, st 1, is still told: its kit counts the dodge, Pirouette's Encore, and tears nothing)
      const shadowed = cov && PROPS.shadowing(m.src.x, m.src.y, d.x, d.y, props);
      let hit = false;
      if (m.type === 'aoe' || m.type === 'spread' || m.type === 'buster') hit = SHAPES.contains(m.shape, d.x, d.y, DOLL_HOST.PAD) && !shadowed;
      else if (m.type === 'raidwide') hit = !!cov && !shadowed;
      if (hit) this.emit({ t: 'fev', k: 'dollhit', id: pid, i });
    }
  },
  dollTick() {
    if (!this.dolls || !this.dolls.size) return;
    const live = this.liveDolls();
    // rollers and storm walls run over a Doll as they would a player (once each)
    this.dollHitMemo = this.dollHitMemo || {};
    for (const [pid, d, i] of live) {
      if (d.st === 1 || d.st === 2) continue;
      for (const [id, r] of this.rollers) {
        if (this.t < r.rollAt) continue;
        const pos = this.rollerPos(r, this.t), key = 'r' + id + ':' + pid + ':' + i;
        if (!this.dollHitMemo[key] && Math.hypot(d.x - pos.x, d.y - pos.y) < r.r + DOLL_HOST.PAD) { this.dollHitMemo[key] = this.t; this.emit({ t: 'fev', k: 'dollhit', id: pid, i }); }
      }
      for (const [id, sw] of this.sweeps) {
        if (this.t < sw.startAt) continue;
        const a0 = this.sweepAngle(sw, this.t);
        for (let k = 0; k < sw.arms; k++) {
          const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), sn = Math.sin(a), dx = d.x - sw.x, dy = d.y - sw.y;
          const key = 's' + id + ':' + k + ':' + pid + ':' + i;
          if (dx * c + dy * sn < 0 || Math.abs(-dx * sn + dy * c) > sw.w / 2 + DOLL_HOST.PAD || this.t - (this.dollHitMemo[key] ?? -9) < 1.5) continue;
          if (sw.cover && PROPS.shadowing(sw.x, sw.y, d.x, d.y, this.props, q => q.kind === sw.cover)) continue;
          this.dollHitMemo[key] = this.t; this.emit({ t: 'fev', k: 'dollhit', id: pid, i });
        }
      }
    }
    // the Stage: an Understudy and both Dolls (neither limp) round the boss's centre
    const b = this.boss, tri = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    let stage = 0;
    for (const [pid, D] of this.dolls) {
      if (D.l.length < 2 || D.l.some(d => d.st === 2) || this.t - D.at > DOLL_HOST.STALE) continue;
      const o = this.alive().find(p => p.id === pid);
      if (!o) continue;
      const [d1, d2] = D.l, s1 = tri(o, d1, b), s2 = tri(d1, d2, b), s3 = tri(d2, o, b);
      if (!b.untargetable && ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) && Math.abs(tri(o, d1, d2)) > 2000) { stage = pid; break; }
    }
    if (stage) this.stageUntil = this.t + 0.2;
    // where every Doll is, for everyone to draw (owners draw their own from their kit): [owner, [[x, y, st], ...]]
    if (this.t - (this.dollSent ?? -9) >= 0.1) {
      this.dollSent = this.t;
      const by = new Map();
      for (const [pid, d] of live) { if (!by.has(pid)) by.set(pid, []); by.get(pid).push([d.x, d.y, d.st, d.s]); }
      this.emit({ t: 'dolls', l: [...by].map(([pid, l]) => [pid, l]), s: stage || 0, c: +this.t.toFixed(3) });
    }
  },
});

// ===================================================================================================================
// LANTERNS: the Lanternkeeper's lanterns, host side (kits.js LANTERN; drawn by lanterns.js). One block of FightSim
// methods; the core calls in with one line each: tick (lampTick), onEvent ('lamp' bursts: lampEvent), end (lampClear).
// The owner's kit keeps its lanterns and reports them (setLamps: a human's client 10 times a second, a bot's kit every
// tick): [{ id, x, y, r, h, w, k, on?, ox?, oy?, all?, st?, ln?, sg?, hh? }]. h is what one pulse heals (the kit works
// out the wick, its gear and Lighthouse), w the wick (0-100), k the kind (0 floor, 1 Great Beacon, 2 hand, 3 small,
// 4 floating, 5 eternal). on: an ally it hangs on (or 'c', the party's centre), placed at that ally plus ox, oy.
//   - Once a second every alive player inside a glow heals that lantern's h (glows stack). all: everyone counts (Lighthouse).
//   - st (Steady Glow): 8% less damage while inside it. ln (Lighthouse Keeper): its most hurt
//     player heals 30% more. sg (Signal Fire): with two of them, a player on the line between (outside both) heals half.
//     hh (Hearth): 6s in its glow heals hh, and again every 6s more.
//   - 'lamp' events: op 'burst' (every lantern, or lid's: everyone in its glow heals amount and takes a shield sh;
//     full: only those at full health take the shield, instead of the heal), op 'waylight' (a Wayfarer's step-light: the most hurt player within WAY_R of the owner heals amount),
//     op 'relight' (the most hurt player inside any glow heals amount; last: under 20% they can't fall for 3s, once every 90s).
//   - The owner hears what its lanterns did ('fev' lit, every pulse: n ally-pulses healed, c players in a glow).
//   - Everyone gets the list ('lamps', 10 a second) to draw other keepers' lanterns.
// Nothing here is trusted: positions, radii and amounts are clamped like any other combat event.
// ===================================================================================================================
const LAMP_HOST = { MAX: 12, R: 220, HEAL: 2000, STALE: 1.5, PULSE: 1, STEADY: 0.08, WAY_R: 240, LINE: 30, HEARTH: 6, LAST_CD: 90 };
Object.assign(FightSim.prototype, {
  setLamps(pid, list) {
    if (!Array.isArray(list) || !this.ps.has(pid)) return;
    const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
    this.lamps = this.lamps || new Map();
    const old = this.lamps.get(pid);
    const l = list.slice(0, LAMP_HOST.MAX).filter(o => o && typeof o === 'object').map(o => {
      const on = o.on === 'c' ? 'c' : o.on === 'self' ? pid : Number.isFinite(o.on) ? o.on : null;
      return { id: n(o.id, 0, 1e9), x: n(o.x, -2000, 2000), y: n(o.y, -2000, 2000), r: n(o.r, 0, LAMP_HOST.R), h: n(o.h, 0, LAMP_HOST.HEAL), w: n(o.w, 0, 100), k: n(o.k, 0, 5),
        on, ox: n(o.ox, -200, 200), oy: n(o.oy, -200, 200), all: o.all ? 1 : 0, st: o.st ? 1 : 0, ln: o.ln ? 1 : 0, sg: o.sg ? 1 : 0, hh: n(o.hh, 0, LAMP_HOST.HEAL) };
    });
    this.lamps.set(pid, { l, at: this.t, next: old ? old.next : this.t + LAMP_HOST.PULSE, inside: old ? old.inside : new Map(), lastAt: old ? old.lastAt : -999 });
  },
  // where a lantern is now (one hung on an ally goes where they go; 'c', over the party's centre)
  lampAt(l, al) {
    if (l.on == null) return l;
    if (l.on === 'c') {
      if (!al.length) return null;
      const c = al.reduce((a, p) => ({ x: a.x + p.x / al.length, y: a.y + p.y / al.length }), { x: 0, y: 0 });
      return { x: c.x + l.ox, y: c.y + l.oy };
    }
    const p = al.find(q => q.id === l.on);
    return p ? { x: p.x + l.ox, y: p.y + l.oy } : null;
  },
  // the live lanterns: [[ownerId, lantern, {x, y}]]
  liveLamps() {
    const out = [];
    if (!this.lamps || !this.lamps.size) return out;
    const al = this.alive();
    for (const [pid, L] of this.lamps) {
      const s = this.ps.get(pid);
      if (!s || !s.alive || this.t - L.at > LAMP_HOST.STALE) continue;
      for (const l of L.l) { const at = this.lampAt(l, al); if (at) out.push([pid, l, at]); }
    }
    return out;
  },
  inLamp(p, l, at) { return !!l.all || Math.hypot(p.x - at.x, p.y - at.y) <= l.r; },
  lampEvent(pid, ev) {
    const L = this.lamps && this.lamps.get(pid);
    if (!L || this.state !== 'live') return;
    const al = this.alive(), mine = this.liveLamps().filter(e => e[0] === pid), amt = Math.max(0, Math.min(3000, Number(ev.amount) || 0));
    if (ev.op === 'burst') {
      const sh = Math.max(0, Math.min(3000, Number(ev.sh) || 0));
      for (const [, l, at] of mine) {
        if (ev.lid != null && l.id !== ev.lid) continue;
        for (const p of al) {
          if (!(ev.all || this.inLamp(p, l, at))) continue;
          const full = p.s.hp >= p.s.maxHp - 0.5;
          if (amt && !(ev.full && full)) this.applyHeal(pid, p.id, amt);
          if (sh && (!ev.full || full) && p.s.shield < sh) this.giveShield(pid, p.id, p.s, sh, 8);
        }
      }
    } else if (ev.op === 'waylight') {
      // a light lands on the most hurt ally within reach of the walker (the walker too)
      const me = al.find(p => p.id === pid);
      if (!me) return;
      let best = null, bf = 0.99;
      for (const p of al) {
        const f = p.s.hp / p.s.maxHp;
        if (f < bf && Math.hypot(p.x - me.x, p.y - me.y) <= LAMP_HOST.WAY_R) { bf = f; best = p; }
      }
      if (!best) return;
      this.applyHeal(pid, best.id, amt);
      this.emit({ t: 'fev', k: 'relit', id: pid, to: best.id, w: 1 });
    } else if (ev.op === 'relight') {
      let best = null, bf = Infinity;
      // the most hurt ally (one standing in a glow first, unless someone outside is far worse off)
      for (const p of al) {
        const f = p.s.hp / p.s.maxHp + (mine.some(([, l, at]) => this.inLamp(p, l, at)) ? 0 : 0.15);
        if (f < bf) { bf = f; best = p; }
      }
      if (!best) return;
      const f = best.s.hp / best.s.maxHp;
      this.applyHeal(pid, best.id, amt);
      if (ev.last && f < 0.2 && this.t - L.lastAt >= LAMP_HOST.LAST_CD) { L.lastAt = this.t; best.s.mits.push({ pct: 0, kind: 'living', start: this.t, end: this.t + 3, from: pid }); }
      this.emit({ t: 'fev', k: 'relit', id: pid, to: best.id });
    }
  },
  lampTick() {
    if (!this.lamps || !this.lamps.size) return;
    const al = this.alive(), live = this.liveLamps();
    // Steady Glow: everyone inside a Great Beacon's glow takes less damage while there
    for (const [pid, l, at] of live) {
      if (!l.st) continue;
      for (const p of al) {
        if (!this.inLamp(p, l, at)) continue;
        const m = p.s.mits.find(x => x.lampSt);
        if (m) m.end = this.t + 0.25; else p.s.mits.push({ pct: LAMP_HOST.STEADY, start: this.t, end: this.t + 0.25, lampSt: true, from: pid });
      }
    }
    if (this.state === 'live') for (const [pid, L] of this.lamps) {
      if (this.t < L.next) continue;
      L.next = Math.max(L.next + LAMP_HOST.PULSE, this.t - 0.5);
      const mine = live.filter(e => e[0] === pid);
      if (!mine.length) continue;
      let n = 0;
      const lit = new Set();
      for (const [, l, at] of mine) {
        const inside = al.filter(p => this.inLamp(p, l, at));
        // Lighthouse Keeper: the most hurt one inside heals 30% more
        const lean = l.ln && inside.length ? inside.reduce((a, b) => (b.s.hp / b.s.maxHp < a.s.hp / a.s.maxHp ? b : a)) : null;
        for (const p of inside) { this.applyHeal(pid, p.id, l.h * (p === lean ? 1.3 : 1)); n++; lit.add(p.id); }
        // Hearth: seconds in a Great Beacon's glow
        if (l.hh) for (const p of al) {
          const key = l.id + ':' + p.id, was = L.inside.get(key) || 0;
          if (!inside.includes(p)) { L.inside.set(key, 0); continue; }
          if (was + LAMP_HOST.PULSE >= LAMP_HOST.HEARTH) { this.applyHeal(pid, p.id, l.hh); L.inside.set(key, 0); } else L.inside.set(key, was + LAMP_HOST.PULSE);
        }
      }
      // Signal Fire: the line between two Great Beacons
      const sig = mine.filter(([, l]) => l.sg && l.k === 1);
      if (sig.length >= 2) {
        const [[, l1, a], [, l2, b]] = sig;
        for (const p of al) {
          if (this.inLamp(p, l1, a) || this.inLamp(p, l2, b) || segDist(p.x, p.y, a.x, a.y, b.x, b.y) > LAMP_HOST.LINE) continue;
          this.applyHeal(pid, p.id, (l1.h + l2.h) / 4); n++; lit.add(p.id);
        }
      }
      this.emit({ t: 'fev', k: 'lit', id: pid, n, c: lit.size });
    }
    // where every lantern is, for everyone to draw (owners draw their own from their kit): [owner, [[x, y, r, w, k, on, ox, oy, all], ...]]
    if (this.t - (this.lampSent ?? -9) >= 0.1) {
      this.lampSent = this.t;
      const by = [];
      for (const [pid, L] of this.lamps) {
        const s = this.ps.get(pid);
        if (!s || !s.alive || this.t - L.at > LAMP_HOST.STALE) continue;
        by.push([pid, L.l.map(l => [l.x, l.y, l.r, l.w, l.k, l.on, l.ox, l.oy, l.all])]);
      }
      if (by.length || this.lampsShown) this.emit({ t: 'lamps', l: by });
      this.lampsShown = by.length > 0;
    }
  },
  lampClear() {
    if (this.lamps && this.lamps.size) { this.lamps.clear(); this.emit({ t: 'lamps', l: [] }); }
    this.lampsShown = false;
  },
});

// ===================================================================================================================
// HOUNDS: the Houndmaster's hounds, host side (kits.js HOUND, drawn by kennel.js). One block of FightSim methods; the core
// calls in with one line each: tick (houndTick), resolveMech (houndMech), end (houndClear).
// Each Houndmaster reports where its hounds are (setHounds: a human's client 10 times a second, a bot's kit every tick):
// up to 8 { x, y, mode, slot, id } (mode: run | hold | guard | pounce | bite | down; slot: left | right | front | behind | null).
// A telegraph that resolves over a hound ('houndhit' to its owner, with the hound's id) downs it, the same shapes that hit a
// player: circles and cones, spreads, a tankbuster's cleave, a cover blast it isn't sheltered from (w: 1), rollers and storm
// walls. A hound that is down, on its way to its owner (Call Off: guard) or in mid-pounce is not touched, and neither are
// the spectral hounds of Wild Hunt (ids sp0..sp3). Bosses and bots never target a hound; it's never in alive() or players().
// Everyone gets the list ('hounds', 10 a second) to draw: [[owner, [[x, y, mode, slot, id], ...]], ...].
// ===================================================================================================================
const HOUND_HOST = { STALE: 1.5, PAD: 12, MAX: 8, MODES: ['run', 'hold', 'guard', 'pounce', 'bite', 'down'], SLOTS: ['left', 'right', 'front', 'behind'] };
Object.assign(FightSim.prototype, {
  // a Houndmaster's hounds (rows as { x, y, mode, slot, id } or [x, y, mode, slot, id])
  setHounds(pid, list) {
    if (!Array.isArray(list) || !this.ps.has(pid)) return;
    const n = v => Math.max(-2000, Math.min(2000, Math.round(Number(v) || 0)));
    const row = d => (Array.isArray(d) ? { x: d[0], y: d[1], mode: d[2], slot: d[3], id: d[4] } : d || {});
    this.hounds = this.hounds || new Map();
    this.hounds.set(pid, { l: list.slice(0, HOUND_HOST.MAX).map(row).map(d => ({ x: n(d.x), y: n(d.y), mode: HOUND_HOST.MODES.includes(d.mode) ? d.mode : 'run',
      slot: HOUND_HOST.SLOTS.includes(d.slot) ? d.slot : null, id: String(d.id == null ? '' : d.id).slice(0, 12) })), at: this.t });
  },
  // the hounds whose owners are alive and still reporting: [[ownerId, hound, index]] (the downed ones too: they are drawn as down)
  liveHounds() {
    const out = [];
    if (!this.hounds) return out;
    for (const [pid, H] of this.hounds) {
      const s = this.ps.get(pid);
      if (!s || !s.alive || this.t - H.at > HOUND_HOST.STALE) continue;
      H.l.forEach((d, i) => out.push([pid, d, i]));
    }
    return out;
  },
  // can a telegraph touch this hound at all?
  houndOpen(d) { return d.mode !== 'down' && d.mode !== 'guard' && d.mode !== 'pounce' && !/^sp/.test(d.id); },
  houndHit(pid, d, w) { this.emit({ t: 'fev', k: 'houndhit', id: pid, h: d.id, w: w ? 1 : 0 }); },
  houndMech(m, cov) {
    if (!this.hounds || !this.hounds.size) return;
    const props = cov ? this.props.filter(pr => pr.cover) : null;
    for (const [pid, d] of this.liveHounds()) {
      if (!this.houndOpen(d)) continue;
      const shadowed = cov && PROPS.shadowing(m.src.x, m.src.y, d.x, d.y, props);
      if (m.type === 'aoe' || m.type === 'spread' || m.type === 'buster') { if (SHAPES.contains(m.shape, d.x, d.y, HOUND_HOST.PAD) && !shadowed) this.houndHit(pid, d, false); }
      else if (m.type === 'raidwide' && cov && !shadowed) this.houndHit(pid, d, true);
    }
  },
  houndTick() {
    if (!this.hounds || !this.hounds.size) { if (this.houndsShown) { this.houndsShown = false; this.emit({ t: 'hounds', l: [] }); } return; }
    const live = this.liveHounds();
    // rollers and storm walls run over a hound as they would a player (once each)
    this.houndMemo = this.houndMemo || {};
    for (const [pid, d] of live) {
      if (!this.houndOpen(d)) continue;
      for (const [id, r] of this.rollers) {
        if (this.t < r.rollAt) continue;
        const pos = this.rollerPos(r, this.t), key = 'r' + id + ':' + pid + ':' + d.id;
        if (!this.houndMemo[key] && Math.hypot(d.x - pos.x, d.y - pos.y) < r.r + HOUND_HOST.PAD) { this.houndMemo[key] = this.t; this.houndHit(pid, d, false); }
      }
      for (const [id, sw] of this.sweeps) {
        if (this.t < sw.startAt) continue;
        const a0 = this.sweepAngle(sw, this.t);
        for (let k = 0; k < sw.arms; k++) {
          const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), sn = Math.sin(a), dx = d.x - sw.x, dy = d.y - sw.y;
          const key = 's' + id + ':' + k + ':' + pid + ':' + d.id;
          if (dx * c + dy * sn < 0 || Math.abs(-dx * sn + dy * c) > sw.w / 2 + HOUND_HOST.PAD || this.t - (this.houndMemo[key] ?? -9) < 1.5) continue;
          if (sw.cover && PROPS.shadowing(sw.x, sw.y, d.x, d.y, this.props, q => q.kind === sw.cover)) continue;
          this.houndMemo[key] = this.t; this.houndHit(pid, d, false);
        }
      }
    }
    // where every hound is, for everyone to draw (owners draw their own from their kit): [owner, [[x, y, mode, slot, id], ...]]
    if (this.t - (this.houndSent ?? -9) >= 0.1 - 1e-6) {
      this.houndSent = this.t;
      const by = new Map();
      for (const [pid, d] of live) { if (!by.has(pid)) by.set(pid, []); by.get(pid).push([d.x, d.y, d.mode, d.slot, d.id]); }
      this.houndsShown = by.size > 0;
      this.emit({ t: 'hounds', l: [...by].map(([pid, l]) => [pid, l]), c: +this.t.toFixed(3) });
    }
  },
  houndClear() {
    this.houndMemo = {};
    if (this.hounds && this.hounds.size) { this.hounds.clear(); this.emit({ t: 'hounds', l: [] }); }
    this.houndsShown = false;
  },
});

// ===================================================================================================================
// KENSEIER (tank, class 22): Posture and the deflect, host side (KENSEI and the kit are in kits.js). Everything runs through
// the one 'kensei' event (kits.js, the Kenseier block, lists its ops) and answers with fev 'kdef' / 'kbrk' / 'kbend'.
//  - boss.post (KENSEI.make): the boss's Posture. Only a Kenseier fills it (kenAdd). At full it Breaks (kenBreak): for the
//    Break's length (4 s, 5 s for a Deathblade) it is staggered (stunned: no walking, turning or autos), the party's blows
//    land 15% harder (boss.exposed), and the script is slid out of the way (kenSlide: no casts, as Time Stop does). It
//    never Breaks during a scripted cast: the bar holds full (post.hold) until the cast ends. post.until is the Break's end.
//    The 'fb' message carries it as po: [p, max, break seconds left, held full, recovering, builder] (kenPack).
//  - a deflect is a window (s.defl, from the press, `dur` long) held against the next auto or tankbuster that lands on the
//    Kenseier, or, with reach (Warden), on an ally within it. A hit inside the window judges the press by how far apart they
//    are (KENSEI.judge: 2 Perfect within 0.09 s, 1 Good within the window): Perfect takes the blow whole, Good takes a third off.
//    A press just AFTER a blow (within the window) gives it back: the hit is in kenHits for half a second, and the press
//    refunds what it cost, whole or a third. Mikiri Step (s.step) lets an avoidable hit that lands during it pass through.
//  - Off-balance (s.offbal): +10% damage taken, and its deflects are ignored.
// ===================================================================================================================
Object.assign(FightSim.prototype, {
  kenPost() { const b = this.boss; return b.post || (b.post = KENSEI.make()); },
  kenCasting() { const b = this.boss; return !!(b.cast && this.t < b.cast.end); },
  // the bar for the 'fb' message: [p, max, break seconds left, held full, recovering, who built it]
  kenPack() {
    const P = this.kenPost(), t = this.t;
    return [+P.p.toFixed(1), KENSEI.MAX, P.until > t ? +(P.until - t).toFixed(1) : 0, P.hold ? 1 : 0, KENSEI.recovering(P, t) ? 1 : 0, P.by ?? 0];
  },
  // every tick: a Break running out, a held bar breaking as the cast ends, recovery
  kenTick(dt) {
    const P = this.kenPost(), r = KENSEI.tick(P, this.t, dt, this.kenCasting());
    if (r === 'end') this.emit({ t: 'fev', k: 'kbend', id: P.by ?? 0 });
    else if (r === 'break') this.kenBreak(P.by);
    if (this.kenHits && this.kenHits.length) this.kenHits = this.kenHits.filter(h => this.t - h.t < 1);
  },
  // add Posture from pid (o.full: all of it). A Break begins if it fills (and the boss is not casting).
  kenAdd(pid, n, o = {}) {
    const b = this.boss;
    if (b.untargetable || this.state !== 'live') return;
    const r = KENSEI.add(this.kenPost(), o.full ? KENSEI.MAX : n, this.t, { secs: o.secs, keep: o.keep, by: pid, casting: this.kenCasting() });
    if (r === 'break') this.kenBreak(pid);
  },
  kenBreak(pid) {
    const b = this.boss, P = this.kenPost(), secs = P.until - this.t;
    const was = b.exposedUntil > this.t ? (b.exposed || 0) : 0;
    b.exposed = Math.max(was, KENSEI.BREAK_DMG); b.exposedUntil = Math.max(b.exposedUntil || 0, P.until);   // (staggered: takes more, boss 'damage' event)
    if (this.stats[pid]) this.stats[pid].breaks = (this.stats[pid].breaks || 0) + 1;
    this.kenSlide(secs);
    this.emit({ t: 'fev', k: 'kbrk', id: pid ?? 0, secs: +secs.toFixed(1) });
  },
  // the boss does not cast while it is Broken: its script's next steps slide out by the Break's length, as a Time Stop slides
  // them (pauseBoss), but without the stop's frost, guard or length limit. Not where a Time Stop would not take (a phase change,
  // a check, the enrage run-up...): the stagger and the damage window still stand.
  kenSlide(dur) {
    if (!(dur > 0) || this.pauseBlock(dur)) return false;
    const t = this.t, cur = this.curCourse;
    for (const e of this.events) if (e.step && e.t > t) e.t += dur;
    this.events.sort((a, c) => a.t - c.t);
    cur.seams = cur.seams.map(s => (s > t ? s + dur : s)); cur.end += dur;
    this.pauseShift = (this.pauseShift || 0) + dur;
    if (this.onPause) this.onPause(dur);
    this.broadcastNext(true);
    return true;
  },
  kenEvent(pid, ev) {
    const s = this.ps.get(pid), me = this.players().find(q => q.id === pid);
    if (!s || !me || !s.alive || me.cls !== 'kenseier') return;
    this.postureOn = true;
    const t = this.t, num = (v, a, b, d) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d);
    const secs = num(ev.secs, 2, 8, KENSEI.BREAK), keep = num(ev.keep, 0, 0.6, 0);
    switch (ev.op) {
      case 'deflect': {
        if (s.offbal > t) return;   // (Off-balance: no deflects)
        const dur = num(ev.dur, 0.2, 0.6, KENSEI.GOOD);
        const win = { start: t, end: t + dur, dur, pp: num(ev.amount, 0, 60, KENSEI.POST.perfect), pg: num(ev.value, 0, 30, KENSEI.POST.good), pb: num(ev.mult, 0, 80, KENSEI.POST.buster),
          r: num(ev.r, 0, 220, 0), sh: num(ev.sh, 0, 400, 0), ticks: num(ev.ticks, 1, 2, 1), secs, keep };
        s.defl = win;
        // a press just after the blow: it gives the blow back (the newest hit that this press can reach)
        let rec = null;
        for (const h of this.kenHits || []) {
          if (h.done || t - h.t > dur || (rec && h.t < rec.t)) continue;
          const v = this.players().find(q => q.id === h.id);
          if (!v || !v.s.alive || (v.id !== pid && !(win.r > 0 && Math.hypot(v.x - me.x, v.y - me.y) <= win.r))) continue;
          rec = h;
        }
        if (rec) {
          rec.done = true;
          const vic = this.players().find(q => q.id === rec.id), r = this.kenResolve(me, win, vic, rec.pre, rec.buster, rec);
          if (r) {
            const vs = vic.s, back = Math.min(vs.maxHp - vs.hp, rec.amt * (1 - r.mult));
            if (back > 0) { vs.hp += back; this.stats[vic.id].taken -= back; this.stats[vic.id].mitigated += Math.round(back); }
          }
        }
        break;
      }
      case 'step': s.step = { until: t + num(ev.dur, 0.2, 0.8, 0.45), amount: num(ev.amount, 0, 60, KENSEI.POST.mikiri), secs, keep }; break;
      case 'posture': this.kenAdd(pid, num(ev.amount, 0, 60, 0), { secs, keep, full: !!ev.full }); break;
      case 'end': KENSEI.endBreak(this.kenPost(), t); break;   // (a Deathblow: the Break is over, kenTick says so)
      case 'off': s.offbal = t + num(ev.dur, 0, 4, KENSEI.OFF); s.defl = null; break;
      case 'duel': { const b = this.boss; b.duelUntil = t + num(ev.dur, 0, 12, KENSEI.DUEL); b.autoAt = Math.min(b.autoAt, t + KENSEI.DUEL_EVERY); break; }
    }
  },
  // a hit about to land on p (pre: what it would deal after mitigation): a Mikiri Step lets an avoidable one through; a deflect
  // window of p's own (or an ally's with reach) catches an auto or tankbuster. Returns { mult, q } (damagePlayer), or null.
  kenIncoming(p, s, pre, opts) {
    if (!(pre > 0)) return null;
    const t = this.t;
    if (s.step && s.step.until > t && opts.avoidable && !opts.noVuln) {
      const st = s.step; s.step = null;
      this.kenAdd(p.id, st.amount, st);
      this.emit({ t: 'fev', k: 'kdef', id: p.id, q: 3, a: Math.round(pre), p: +KENSEI.frac(this.kenPost()).toFixed(2) });
      return { mult: 0, q: 3 };
    }
    if (opts.kind !== 'auto' && opts.kind !== 'buster') return null;
    let owner = null, win = null;
    if (s.defl && s.defl.end > t) { owner = p; win = s.defl; }
    else {
      for (const q of this.alive()) {
        const w = q.s.defl;
        if (q.id === p.id || !w || w.end <= t || !(w.r > 0) || q.s.offbal > t || Math.hypot(q.x - p.x, q.y - p.y) > w.r) continue;
        owner = q; win = w; break;
      }
    }
    return win ? this.kenResolve(owner, win, p, pre, opts.kind === 'buster', null) : null;
  },
  // judge a press against a hit (late: the hit's record when the press came after it). Perfect takes the blow whole, Good a third off.
  kenResolve(owner, win, victim, pre, buster, late) {
    const t = this.t, q = KENSEI.judge(late ? t - late.t : t - win.start, win.dur);
    if (!q) return null;
    owner.s.defl = null;
    this.kenAdd(owner.id, q === 2 ? (buster ? win.pb : win.pp) : win.pg, win);
    if (win.sh > 0) this.kenGuard(owner, win);
    if (q === 2) this.stats[owner.id].perfects++;
    this.emit({ t: 'fev', k: 'kdef', id: owner.id, q, b: buster ? 1 : 0, a: Math.round(pre), late: late ? 1 : 0, to: victim.id !== owner.id ? victim.id : null, p: +KENSEI.frac(this.kenPost()).toFixed(2) });
    return { mult: q === 2 ? 0 : 2 / 3, q };
  },
  // Guard Stance: a deflect shields the nearest ally (or two)
  kenGuard(owner, win) {
    const near = this.alive().filter(q => q.id !== owner.id).sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y)).slice(0, win.ticks);
    for (const q of near) if (q.s.shield < win.sh) { this.ward(owner.id, q.id, q.s, true); this.giveShield(owner.id, q.id, q.s, win.sh, 6); }
  },
  // a blow that landed with no deflect to meet it, kept half a second for a press that comes just after
  kenNote(p, pre, amt, opts) {
    (this.kenHits || (this.kenHits = [])).push({ t: this.t, id: p.id, pre, amt, buster: opts.kind === 'buster', done: false });
    if (this.kenHits.length > 12) this.kenHits.shift();
  },
});

// The training yard's stand-in for a raid host, for a Kenseier on the sparring dummy (main.js townKen): a bare FightSim with the one
// player and a boss that is only a Posture bar, so the yard runs the very same kenEvent / kenIncoming / kenTick / kenNote a raid does.
// getMe() gives the player's { id, x, y }; emit gets the host's messages (fev kdef / kbrk / kbend). The caller keeps sim.t on its clock.
FightSim.kenYard = function (getMe, emit) {
  const sim = Object.create(FightSim.prototype), id = getMe().id;
  const s = { id, role: 'tank', hp: 1, maxHp: 1, alive: true, shield: 0, mits: [], hots: [], debuffs: {} };
  Object.assign(sim, { t: 0, state: 'live', postureOn: true, emit, events: [], kenHits: [], def: {}, mode: 'normal',
    boss: { hp: 1, maxHp: 1, untargetable: false, cast: null, autoAt: 1e9, exposed: 0, exposedUntil: 0 },
    ps: new Map([[id, s]]), stats: { [id]: { perfects: 0, breaks: 0, taken: 0, mitigated: 0 } } });
  sim.players = () => [Object.assign({ name: 'you', role: 'tank', cls: 'kenseier' }, getMe(), { s })];
  return sim;
};

if (typeof module !== 'undefined') module.exports = { FIGHT, FightSim, segDist, playerBaseHp, MAW_HOST, WEAVE_HOST, DOLL_HOST, HOLLOW_HOST, LAMP_HOST };
