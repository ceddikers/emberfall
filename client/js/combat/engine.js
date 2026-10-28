// Combat engine: runs one player's kit. FF14-style rules:
//  - GCD abilities share a global cooldown (2.5s base, haste shortens it). Some have cast times.
//  - oGCD abilities have their own cooldowns and a short animation lock, so 1-2 fit between GCDs ("weaving").
//    Pressing too many oGCDs delays the next GCD ("clipping"), which costs damage.
//  - Presses up to QUEUE_WINDOW early are queued and fire the instant they're ready.
//  - Casts are interrupted by moving, except during the last SLIDECAST seconds.
// It also records the numbers the post-fight report shows (uptime, overcap, wasted procs...).
// Pure logic, no DOM: the same code runs in the game, for bots, and in tools/simulate.js.
//
// Pacing. The GCD is how a kit is paced by default ("cadence"). A kit can pace itself another way with `pacing`:
//   pacing: { kind: 'combo', gcd: false, buffer, bufferSize, repeat: false, pool: { key, max, regen, rest, delay }, itemGcd(k, ab) }
//  - gcd: false   no global cooldown. Its 'gcd' moves are limited only by their own animation lock (ab.lock) and the pool.
//  - pool         the kit's limiter, kept in k.g[key]: each move's `cost` (number or fn) is paid when it fires; it refills
//                 `regen` a second, or `rest` a second once nothing has been spent for `delay` s (def.poolRate(k) scales
//                 both, def.poolRest(k) forces the resting pace). A move you can't pay for fails ('winded').
//  - buffer       presses up to this early are buffered (instead of QUEUE_WINDOW), up to `bufferSize` of them, in order.
//  - repeat:false a held key doesn't auto-repeat presses (main.js).
//  - itemGcd      how much of a "GCD" a press counts as for item effects (optional; by default its recovery over the
//                 standard GCD, Kit.itemGcdShare, so fast presses don't proc them far more often).
// def.moveFor(k, ab) may turn a press into the move it completes (a named string): that move is what fires, is shown
// and is sent to everyone ('used' carries it; it names its button in `slot`). k.input says how the press came in.
// Kits without `pacing` behave exactly as before.
//
// The Ultimate (T, slot 7): def.ultimate, an ability-like object kept OUT of def.abilities (bots, the simulator and
// the six-slot checks never see it). Its charge lives in k.g.ult (0..100, no decay) and fills through the class's own
// loop (ultGain, or the gain/spend maps that Kit.gain/Kit.spend funnel) plus a small trickle while fighting (ultTick).
// Pressing it at 100 spends it all. mode 'instant': its effect is the whole moment. mode 'window': for window.dur
// seconds the bar's moves named in window.over swap to empowered versions (ultOver: same id, so cooldowns, talents,
// bots and kit code keep working; fxId names their look and what other clients are told), then window.onEnd runs.
// While its animation lock lasts the caster takes ult.dr less damage and can't be knocked back (ultSteady).
// Part of the charge (charge.keep, default half) survives a death (ultDeath). Shape: docs/DESIGN.md "Ultimates".

const ENGINE = {
  GCD: 2.5,
  QUEUE_WINDOW: 0.5,
  ANIM_LOCK: 0.6,
  SLIDECAST: 0.5,
  CAST_LOCK_EXTRA: 0.1,
  // Number scale for the whole game: small numbers, so a 1,000 crit is a big moment. Everything that
  // counts HP (boss HP, player HP, boss damage: FIGHT.NUM_SCALE in fight.js) uses the same factor.
  NUM_SCALE: 0.05,
  POT_SCALE: 0.5,    // damage per point of potency (10 x NUM_SCALE)
  BASE_CRIT: 0.10,
  CRIT_MULT: 1.5,
  PANDEMIC: 0.3,     // refreshing a DoT keeps up to 30% of its duration as leftover
  BURST_EVERY: 60,   // the shared raid-buff cycle every class plans around
  // Auto-attacks (FF14 style, no button): while you're fighting and an enemy is in range, your weapon strikes on
  // its own every AUTO_EVERY seconds (haste speeds it up). Never while casting. "Fighting" means you used an
  // enemy skill in the last AUTO_ENGAGE seconds. Each kit sets its own { kind, potency, range } in `auto`.
  AUTO_EVERY: 2.6,
  AUTO_ENGAGE: 8,
  ULT_THREAT: 0.5,   // the threat multiplier on a non-tank's Ultimate hits (a burst should not pull an add off its target)
  // Item effects that fire "on a critical hit" or "on an oGCD" are evened out between classes, so a class that crits on every
  // tick (or presses a dozen oGCDs a minute) gains no more from them than one that crits now and then (or has two oGCDs):
  // at most FX_CRIT_PER_MIN crits and FX_OGCD_PER_MIN oGCDs a minute count (the surplus is thinned evenly, Kit.fxPace), and
  // a kit with few oGCDs counts a GCD as one after FX_OGCD_FLOOR s without any (so everyone lands between about 4 and 6 crits and 6 and 7.5 oGCDs a minute).
  FX_CRIT_PER_MIN: 7, FX_OGCD_PER_MIN: 7.5, FX_OGCD_FLOOR: 10, FX_PACE_TAU: 30,
};

// Buffs a healer puts on ONE chosen ally (Kit.allyBuff): what each one does and how long, and its look (cls/icon: the
// ability art its chip on the party frame and the buff bar wears). Shown by name on every client, so the host only
// relays ids it knows (main.js 'cev'). value: a fraction (0.1 = 10%).
const ALLY_BUFFS = {
  quickened: { name: 'Quickened', kind: 'haste', value: 0.12, dur: 15, cls: 'chronomancer', icon: 'accel', text: 'Acting 12% faster.' },
  blessed: { name: 'Blessed', kind: 'dmg', value: 0.1, dur: 10, cls: 'cleric', icon: 'bene', text: 'Dealing 10% more damage.' },
  wildheart: { name: 'Wildheart', kind: 'dmg', value: 0.1, dur: 12, cls: 'grovekeeper', icon: 'rebirth', text: 'Dealing 10% more damage.' },
  galvanized: { name: 'Galvanized', kind: 'dmg', value: 0.1, dur: 10, cls: 'alembist', icon: 'throw', text: 'Dealing 10% more damage.' },
};

class Kit {
  // def: a kit from KITS. env: {
  //   now(), emit(evt), rng() -> [0,1), moving() -> bool,
  //   target(ab) -> target (enemy object, ally id, or point) or null,
  //   positional() -> 'rear' | 'flank' | 'front',
  //   partyMods() -> { dmg, crit, haste }, targetMods() -> { vuln }, selfMods() -> { dmg } (debuffs from the fight),
  //   recentDamage(secs) -> damage this player took in the last secs }
  constructor(def, env) {
    this.def = def;
    this.env = env;
    this.abilities = def.abilities;
    // (moves a talent grants are already in place: specs.js kitFor(classId, specId, talents) builds the def)
    this.g = def.init ? def.init() : {};
    this.buffs = new Map();
    this.cd = {};
    for (const ab of this.abilities) this.cd[ab.id] = ab.charges ? { charges: ab.charges, next: 0 } : 0;
    this.gcdReady = 0; this.gcdLen = ENGINE.GCD;
    this.lockUntil = 0;        // animation lock from the last instant action
    this.cast = null;          // { ab, target, start, end }
    this.queued = null;        // the early press waiting on the GCD (one slot per kind, so a weave doesn't bump a GCD press)
    this.queuedO = null;       // the early press waiting on an off-GCD move
    this.dots = new Map();     // id -> { potency, interval, next, end, ab, opts }
    // auto-attacks: a pseudo-ability so the world's target lookup can apply its range
    this.autoAb = def.auto ? { id: 'auto', name: 'Attack', target: 'enemy', range: def.auto.range, auto: true } : null;
    this.engagedAt = -99; this.nextAuto = 0;
    this.stats = { damage: 0, gcds: 0, gcdTime: 0, casts: {}, start: null, last: 0, overcap: {}, wasted: {},
      posHit: 0, posMiss: 0, interrupts: 0, burstDamage: 0, deadTime: 0 };
    // pacing (see the top of this file): no GCD, a buffer of presses, and the kit's own pool
    this.pace = def.pacing || null;
    this.inbuf = [];             // buffered presses, oldest first: { ab, at }
    this.input = null;           // how the press now firing came in: { at, buffered, idle (seconds you'd been free to act) }
    this.lockLen = 0;            // the length of the current animation lock (the bar's recovery sweep)
    this.lastSpend = -99;
    const pool = this.pace && this.pace.pool;
    if (pool && this.g[pool.key] == null) this.g[pool.key] = this.poolMax();
    // the Ultimate (see the top of this file)
    this.ult = def.ultimate || null;
    this.baseAbilities = this.abilities;   // the bar without a window's empowered moves
    this.ultWin = null;                    // an open window: { start, end, dur, ab }
    this.ultSteadyUntil = 0;
    if (this.ult) { if (this.g.ult == null) this.g.ult = 0; this.cd[this.ult.id] = 0; }
  }
  // ---------------------------------------------------------------- pacing
  gcdFree() { return !!this.pace && this.pace.gcd === false; }
  poolMax() { const p = this.pace && this.pace.pool; return p ? (typeof p.max === 'function' ? p.max(this) : p.max) : 0; }
  costOf(ab) { return typeof ab.cost === 'function' ? ab.cost(this) : (ab.cost || 0); }
  // can the pool pay for this move?
  affords(ab) { const p = this.pace && this.pace.pool; return !p || this.costOf(ab) <= (this.g[p.key] || 0) + 1e-9; }
  // the pool refills on its own (every update)
  refillPool(now) {
    const p = this.pace && this.pace.pool;
    if (!p) return;
    const dt = now - (this._poolT ?? now);
    this._poolT = now;
    if (!(dt > 0 && dt < 1)) return;
    const resting = now - this.lastSpend >= (p.delay || 0) || (this.def.poolRest && this.def.poolRest(this));
    const rate = (resting ? (p.rest ?? p.regen) : p.regen) * (this.def.poolRate ? this.def.poolRate(this) : 1);
    const was = this.g[p.key] || 0;
    this.g[p.key] = Math.min(this.poolMax(), was + rate * dt);
    if (this.g[p.key] > was) this.fxGain(this.g[p.key] - was, true);   // (item effects: a gauge that fills on its own)
  }

  get now() { return this.env.now(); }

  // ---------------------------------------------------------------- resources
  // Add to a gauge value, counting anything above max as overcap (shown in the fight report).
  gain(key, n, max = 100) {
    const was = this.g[key] || 0, v = was + n;
    if (v > max) this.stats.overcap[key] = (this.stats.overcap[key] || 0) + (v - max);
    this.g[key] = Math.min(max, v);
    if (n > 0) this.fxGain(n);
    const per = this.ult && this.ult.charge && this.ult.charge.gain && this.ult.charge.gain[key];
    if (per && this.g[key] > was) this.ultGain((this.g[key] - was) * per);   // (the Ultimate fills from this gauge)
  }
  spend(key, n) {
    if ((this.g[key] || 0) < n) return false;
    this.g[key] -= n;
    const per = this.ult && this.ult.charge && this.ult.charge.spend && this.ult.charge.spend[key];
    if (per && n > 0) this.ultGain(n * per);
    return true;
  }

  // ---------------------------------------------------------------- the Ultimate (see the top of this file)
  ultCharge() { return this.ult ? Math.min(100, this.g.ult || 0) : 0; }
  ultFull() { return !!this.ult && !this.ultWin && (this.g.ult || 0) >= 100; }
  ultLeft() { return this.ultWin ? Math.max(0, this.ultWin.end - this.now) : 0; }
  ultSteady() { return this.now < this.ultSteadyUntil; }   // (no knockback: main.js 'kb', raid-host.js)
  // add charge (none while a window is open; a single cue, the 'ult-ready' moment, when it fills)
  ultGain(n) {
    if (!this.ult || this.ultWin || !(n > 0)) return;
    n *= (this.ult.charge && this.ult.charge.scale) || 1;   // (charge.scale: one dial for a class whose sources fill it too fast)
    const was = this.g.ult || 0;
    if (was >= 100) return;
    this.g.ult = Math.min(100, was + n);
    if (this.g.ult >= 100) this.fx('ult-ready');
  }
  // every update: close a window that has run out, and the trickle while fighting
  ultTick(now) {
    if (this.ultWin && now >= this.ultWin.end) this.ultClose();
    const dt = now - (this._ultT ?? now);
    this._ultT = now;
    const c = this.ult.charge;
    if (!(dt > 0 && dt < 1) || this.ultWin || !c || !c.rate) return;
    const ic = this.env.inCombat ? this.env.inCombat() : null;
    if (ic != null ? ic : now - this.engagedAt <= ENGINE.AUTO_ENGAGE) this.ultGain(c.rate * dt);
  }
  // pressed at full (resolve): spend it all, steady the caster through the animation lock, open a window
  ultFire(ab) {
    this.g.ult = 0;
    this.fx('ult-spent');
    const lock = ab.lock ?? ENGINE.ANIM_LOCK;
    this.ultSteadyUntil = this.now + lock + 0.2;
    if (ab.dr) this.mitigate('self', ab.dr, lock + 0.2, { ab, kind: 'ult' });
    this.stats.ults = (this.stats.ults || 0) + 1;
    // a non-tank's Ultimate is a big burst: for its hits (a window's too, plus a moment after it) the threat is halved (ENGINE.ULT_THREAT)
    this._ultThrUntil = this.now + (ab.mode === 'window' && ab.window ? ab.window.dur + 1.5 : 4);
    if (ab.mode === 'window' && ab.window) {
      const w = ab.window;
      this.ultWin = { start: this.now, end: this.now + w.dur, dur: w.dur, ab };
      this.swapBar(this.baseAbilities.map(a => { const o = w.over && w.over[this.baseId(a)]; return o ? ultOver(a, o, ab) : a; }));
    }
  }
  ultClose() {
    const w = this.ultWin;
    if (!w) return;
    this.ultWin = null;
    this.swapBar(this.baseAbilities);
    if (w.ab.window.onEnd) w.ab.window.onEnd(this);
  }
  // a death keeps charge.keep (default half) of the charge and ends a window
  ultDeath() {
    if (!this.ult) return;
    this.ultClose();
    const full = (this.g.ult || 0) >= 100;
    this.g.ult = Math.floor((this.g.ult || 0) * ((this.ult.charge && this.ult.charge.keep) ?? 0.5));
    if (full) this.fx('ult-spent', { lost: true });   // (lost, not used: no frame flash for teammates)
  }
  // put a different set of moves on the bar (the same slots): presses waiting in the queue follow their slot
  swapBar(list) {
    const old = this.abilities;
    if (old === list) return;
    this.abilities = list;
    const map = ab => { const i = old.indexOf(ab); return i >= 0 && list[i] ? list[i] : ab; };
    if (this.queued) this.queued.ab = map(this.queued.ab);
    if (this.queuedO) this.queuedO.ab = map(this.queuedO.ab);
    for (const q of this.inbuf) q.ab = map(q.ab);
  }
  wasted(what, n = 1) { this.stats.wasted[what] = (this.stats.wasted[what] || 0) + n; }

  // ---------------------------------------------------------------- buffs
  buff(id, dur, data = {}, maxStacks = 1, addStacks = 1) {
    const b = this.buffs.get(id);
    if (b && b.end > this.now) {
      b.end = Math.max(b.end, this.now + dur);
      b.stacks = Math.min(maxStacks, b.stacks + addStacks);
      Object.assign(b.data, data);
      return b;
    }
    const nb = { end: this.now + dur, stacks: Math.min(maxStacks, addStacks), data, start: this.now };
    this.buffs.set(id, nb);
    return nb;
  }
  has(id) { const b = this.buffs.get(id); return !!b && b.end > this.now; }
  stacks(id) { return this.has(id) ? this.buffs.get(id).stacks : 0; }
  remaining(id) { return this.has(id) ? this.buffs.get(id).end - this.now : 0; }
  consume(id, n = 1) {
    const b = this.buffs.get(id);
    if (!b || b.end <= this.now) return false;
    b.stacks -= n;
    if (b.stacks <= 0) this.buffs.delete(id);
    return true;
  }
  clear(id) { this.buffs.delete(id); }
  // A proc that doesn't stack: if it's already up, the new one is wasted.
  proc(id, dur) {
    if (this.has(id)) this.wasted(id);
    this.buff(id, dur);
  }

  // ---------------------------------------------------------------- cooldowns
  abById(id) { return this.abilities.find(a => a.id === id); }
  recast(ab) {
    let r = typeof ab.cd === 'function' ? ab.cd(this) : (ab.cd || 0);
    if (r) { const own = this.talentMod('cd', ab, true), m = this.talentMod('cd', ab) - own; r = Math.max(1, (ab.replaces && m < 0 ? Math.max(r * 0.75, r + m) : r + m) + own); }   // talents: shorter cooldowns (talents.js `cd`); a spec's replacement move keeps at least three quarters of its own cooldown against a cut sized for the base move (e.g. Long Thread on Severance), but not against a number the spec sized for its own move (specMods: Condemn's Benevolence)
    return r && ab.type === 'ogcd' ? r * (1 - Math.min(0.3, this.fxMod('recast'))) : r;   // item effects: shorter oGCD cooldowns
  }
  refreshCharges(ab) {
    const c = this.cd[ab.id];
    while (c.charges < ab.charges && c.next && this.now >= c.next) {
      c.charges++;
      c.next = c.charges < ab.charges ? c.next + this.recast(ab) : 0;
    }
  }
  charges(ab) { if (!ab.charges) return 0; this.refreshCharges(ab); return this.cd[ab.id].charges; }
  cdRemaining(ab) {
    const c = this.cd[ab.id];
    if (ab.charges) { this.refreshCharges(ab); return c.charges > 0 ? 0 : c.next - this.now; }
    return Math.max(0, c - this.now);
  }
  // fraction of the cooldown left (for the ability bar sweep)
  cdFraction(ab) {
    const r = this.recast(ab);
    if (!r) return 0;
    if (ab.charges) { const c = this.cd[ab.id]; return c.next ? Math.max(0, (c.next - this.now) / r) : 0; }
    return Math.max(0, (this.cd[ab.id] - this.now) / r);
  }
  startCooldown(ab) {
    const r = this.recast(ab);
    if (!r) return;
    if (ab.charges) {
      const c = this.cd[ab.id];
      this.refreshCharges(ab);
      c.charges--;
      if (!c.next) c.next = this.now + r;
    } else this.cd[ab.id] = this.now + r;
  }
  reduceCooldown(id, secs) {
    const ab = this.abById(id);
    if (!ab) return;
    if (ab.charges) { const c = this.cd[id]; if (c.next) c.next -= secs; this.refreshCharges(ab); }
    else this.cd[id] = Math.max(this.now, this.cd[id] - secs);
  }
  refundCharge(id) {
    const ab = this.abById(id), c = this.cd[id];
    if (!ab || !ab.charges) return;
    this.refreshCharges(ab);
    if (c.charges < ab.charges) { c.charges++; if (c.charges >= ab.charges) c.next = 0; }
    else this.wasted(id + ' charge');
  }

  // ---------------------------------------------------------------- readiness
  hasteMult() {
    let h = this.def.haste ? this.def.haste(this) : 1;
    const party = this.env.partyMods ? this.env.partyMods() : null;
    if (party && party.haste) h *= 1 - party.haste;
    const mine = this.env.selfMods ? this.env.selfMods() : null;   // (a buff an ally put on you: allyBuff below)
    if (mine && mine.haste) h *= 1 - mine.haste;
    const gear = this.gear();
    if (gear.haste) h *= 1 - gear.haste;
    const fh = this.fxMod('haste');
    if (fh) h *= 1 - fh;
    return h;
  }
  // equipment bonuses: { power, crit, haste } (bots and the simulator have none)
  gear() { return (this.env.gearMods && this.env.gearMods()) || {}; }
  // is an item enhancement (see ITEM_PERKS in items.js) equipped?
  perk(id) { const p = this.gear().perks; return !!(p && p.has(id)); }

  // ---------------------------------------------------------------- talents (data: TALENTS in talents.js)
  // env.talents() is the Set of talent ids this hero holds (bots and the plain simulator hold none).
  talent(id) { const t = this.env.talents && this.env.talents(); return !!(t && t.has(id)); }
  // the base ability a move stands for (a spec's replacement names the one it took over)
  baseId(ab) { return ab.replaces || ab.id; }
  // the summed `cd` or `cast` change (seconds) the held talents make to this ability
  talentMod(kind, ab, ownOnly = false) {
    const t = this.env.talents && this.env.talents();
    if (!t || !t.size || typeof TALENT_BY_ID === 'undefined') return 0;
    let v = 0;
    const base = this.baseId(ab), spec = this.def.spec;
    for (const id of t) {
      const d = TALENT_BY_ID[id]; if (!d) continue;
      const over = d.t.specMods && d.t.specMods[spec] && d.t.specMods[spec][kind];   // a spec's own number (talents.js specMods)
      if (ownOnly && !over) continue;   // (ownOnly: just the numbers a spec sized for its own move; recast below)
      const m = over || d.t[kind];
      if (m && m[base]) v += m[base];
    }
    return v;
  }
  // run fn a little later (a delayed hit: a second meteor, a bomb, an echo). Game logic, so it runs in update().
  after(secs, fn) { (this.pending || (this.pending = [])).push({ at: this.now + secs, fn }); }

  // ---------------------------------------------------------------- item effects (data: ITEMS[key].fx in items.js)
  // Triggers: crit, gcd, ogcd, heal, dash, gain. Conditions: always, hpAbove, hpBelow. Actions: strike, mend, ward,
  // cdr, buff. Mods: dmg, heal, crit, haste, recast. Everything an effect does reaches the host as an ordinary combat
  // event (damage, heal, shield), so it needs nothing new there. Bots and the simulator wear no gear: no effects.
  itemHook(trigger, ab) {
    const list = this.gear().fx;
    if (!list || !list.length || this._inFx) return;
    this._inFx = true;   // an effect's own hits and heals never trigger effects
    try {
      const ready = this.fxReady || (this.fxReady = new Map());
      for (const e of list) {
        if (e.on !== trigger || this.now < (ready.get(e.id) || 0)) continue;
        if (e.chance != null && this.rng() >= e.chance) continue;
        if (e.icd) ready.set(e.id, this.now + e.icd);
        if (e.strike) this.damage(e.strike, { item: true });
        if (e.mend) this.env.emit({ type: 'heal', target: 'self', amount: Math.round((this.env.maxHp ? this.env.maxHp() : 0) * e.mend), crit: false });
        if (e.ward) this.shield('self', e.ward, e.dur || 6, { tag: 'item' });   // (tagged: it never replaces a stronger shield, fight.js)
        if (e.cdr) for (const a of this.abilities) if (a.type === 'ogcd' && a !== ab) this.reduceCooldown(a.id, e.cdr);
        if (e.buff) {
          const bs = this.fxBuffs || (this.fxBuffs = new Map()), b = bs.get(e.id);
          if (b && b.end > this.now) { b.stacks = Math.min(e.stacks || 1, b.stacks + 1); b.end = this.now + e.dur; }
          else bs.set(e.id, { end: this.now + e.dur, stacks: 1, mods: e.buff, name: e.name || 'Item' });
        }
      }
    } finally { this._inFx = false; }
  }
  // Even out a rate-driven trigger between classes (ENGINE.FX_*): tracks how often it happens (a 30 s moving rate) and lets
  // events through evenly so no more than `perMin` of them a minute count. Returns true if this event counts.
  fxPace(key, perMin) {
    const st = this._fxPace || (this._fxPace = {}), p = st[key] || (st[key] = { r: 0, at: this.now, acc: 0 });
    p.r = p.r * Math.exp(-(this.now - p.at) / ENGINE.FX_PACE_TAU) + 1 / ENGINE.FX_PACE_TAU;
    p.at = this.now;
    p.acc += Math.min(1, perMin / 60 / p.r);
    if (p.acc < 0.999) return false;
    p.acc -= 1;
    return true;
  }
  // a critical hit or heal (every crit counts as one event; at most FX_CRIT_PER_MIN of them a minute reach the item effects)
  fxCrit() {
    const list = this.gear().fx;
    if (list && list.length && this.fxPace('crit', ENGINE.FX_CRIT_PER_MIN)) this.itemHook('crit');
  }
  // an oGCD (or, in a kit that has few, a GCD standing in for one: resolve() above)
  fxOgcd(ab) {
    const list = this.gear().fx;
    if (!list || !list.length) return;
    this._ogAt = this.now;
    if (this.fxPace('ogcd', ENGINE.FX_OGCD_PER_MIN)) this.itemHook('ogcd', ab);
  }
  // gauges that fill on their own (a little every frame) count once per 10 points
  fxGain(n, steady) {
    if (n >= 1 && !steady) { this.itemHook('gain'); return; }
    this._gainAcc = (this._gainAcc || 0) + n;
    if (this._gainAcc >= 10) { this._gainAcc -= 10; this.itemHook('gain'); }
  }
  // the sum of one item modifier right now: conditions that hold, plus item buffs (times their stacks)
  fxMod(stat) {
    const list = this.gear().fx;
    let v = 0;
    if (list && list.length) {
      for (const e of list) {
        if (!e.while || !e[stat]) continue;
        const hp = e.while === 'always' ? 0 : (this.env.hpFrac ? this.env.hpFrac() : 1);
        if (e.while === 'always' || (e.while === 'hpAbove' && hp > e.frac) || (e.while === 'hpBelow' && hp < e.frac)) v += e[stat];
      }
    }
    if (this.fxBuffs) for (const b of this.fxBuffs.values()) if (b.end > this.now && b.mods[stat]) v += b.mods[stat] * b.stacks;
    return v;
  }
  // item buffs for the buff row
  itemBuffs() {
    const out = [];
    if (this.fxBuffs) for (const [id, b] of this.fxBuffs) if (b.end > this.now) out.push({ id: 'fx-' + id, name: b.name, left: b.end - this.now, stacks: b.stacks });
    return out;
  }
  castTime(ab) {
    let t = typeof ab.cast === 'function' ? ab.cast(this) : (ab.cast || 0);
    if (t > 0) t = Math.max(0.5, t + this.talentMod('cast', ab));
    return t > 0 ? t * this.hasteMult() : 0;
  }
  gcdRemaining() { return Math.max(0, this.gcdReady - this.now); }
  usable(ab) { return (!ab.ult || this.ultFull()) && (!ab.usable || ab.usable(this)) && this.affords(ab); }
  needsTarget(ab) { return ab.target && ab.target !== 'self' && ab.target !== 'none'; }
  available(ab) {
    if (!this.usable(ab)) return false;
    if (this.cdRemaining(ab) > 0) return false;
    if (this.needsTarget(ab) && !this.env.target(ab)) return false;
    return true;
  }
  // Seconds until this ability could fire (for queueing and the bar).
  readyIn(ab) {
    let t = Math.max(0, this.lockUntil - this.now);
    if (this.cast && !ab.duringCast) t = Math.max(t, this.cast.end - this.now + ENGINE.CAST_LOCK_EXTRA);
    if (ab.type === 'gcd' && !(ab.freeGcd && ab.freeGcd(this))) t = Math.max(t, this.gcdRemaining());   // (ab.freeGcd(k): a GCD move that is off the global cooldown right now: the Kenseier's Feint)
    t = Math.max(t, this.cdRemaining(ab));
    return t;
  }
  // Should the button glow? (the kit's hint for "this is a good press right now")
  glows(ab) { return !!(ab.glow && ab.glow(this)); }
  label(ab) { return typeof ab.label === 'function' ? ab.label(this) : ab.name; }

  // ---------------------------------------------------------------- input
  press(index) {
    const ab = index === 7 ? this.ult : this.abilities[index];   // (7: T, the Ultimate)
    if (!ab) return false;
    if (!this.usable(ab)) { this.env.emit({ type: 'fail', reason: this.affords(ab) ? 'unusable' : 'winded', ab }); return false; }
    const wait = this.readyIn(ab);
    const size = (this.pace && this.pace.bufferSize) || 1;
    // a paced kit keeps its presses in order: while some wait in the buffer, a new one goes behind them
    if (size > 1 && this.inbuf.length) {
      if (this.inbuf.length < size) { this.inbuf.push({ ab, at: this.now }); return true; }
      this.env.emit({ type: 'fail', reason: 'cooldown', ab });
      return false;
    }
    if (wait <= 0.0001) { this.input = { at: this.now, buffered: false, idle: this.now - this.lockUntil }; return this.execute(ab); }
    if (wait <= ((this.pace && this.pace.buffer) || ENGINE.QUEUE_WINDOW)) {
      if (size > 1) this.inbuf.push({ ab, at: this.now }); else if (ab.type === 'ogcd') this.queuedO = { ab, at: this.now }; else this.queued = { ab, at: this.now };
      return true;
    }
    this.env.emit({ type: 'fail', reason: 'cooldown', ab });
    return false;
  }

  execute(ab) {
    if (!this.available(ab)) {
      // say what is actually wrong: a queued press that went off while the move had stopped being usable is "not ready", not "no target"
      const reason = !this.usable(ab) ? (this.affords(ab) ? 'unusable' : 'winded') : this.cdRemaining(ab) > 0 ? 'cooldown' : 'target';
      this.env.emit({ type: 'fail', reason, ab });
      return false;
    }
    const target = this.needsTarget(ab) ? this.env.target(ab) : null;
    if (this.stats.start === null && (ab.target === 'enemy' || ab.startsCombat)) this.stats.start = this.now;
    if (ab.target === 'enemy') this.engagedAt = this.now;
    const ct = this.castTime(ab);
    // (a paced kit: the press may complete a named move, which brings its own animation lock)
    const mv = ct > 0 || !this.def.moveFor ? ab : (this.def.moveFor(this, ab) || ab);
    const lock = mv.lock ?? ab.lock ?? ENGINE.ANIM_LOCK;
    if (ab.type === 'gcd' && !this.gcdFree() && !(ab.freeGcd && ab.freeGcd(this))) {
      this.gcdLen = ((typeof ab.recastGcd === 'function' ? ab.recastGcd(this) : ab.recastGcd) || ENGINE.GCD) * this.hasteMult();
      this.gcdReady = this.now + this.gcdLen;
      this.stats.gcds++;
      this.stats.gcdTime += this.gcdLen;
    } else if (ab.type === 'gcd' && this.gcdFree()) { this.stats.gcds++; this.stats.gcdTime += ct || lock; }   // no GCD: uptime is time spent in your moves
    if (ab.type === 'ogcd' || ab.cd) this.startCooldown(ab);
    const pool = this.pace && this.pace.pool, cost = pool ? this.costOf(ab) : 0;
    // (the resting pace counts from the end of the move's recovery, not the press: a chain of presses each made as
    // the last recovery ends never stops long enough to rest, however slow the recoveries are)
    if (cost) { this.g[pool.key] = Math.max(0, (this.g[pool.key] || 0) - cost); this.lastSpend = this.now + (ct > 0 ? 0 : lock); }
    if (ct > 0) {
      this.cast = { ab, target, start: this.now, end: this.now + ct };
      this.env.emit({ type: 'castStart', ab, dur: ct, target, h: this.healPreview(ab, target) });
    } else {
      this.lockLen = lock;
      this.lockUntil = this.now + lock;
      this.resolve(mv, target);
    }
    return true;
  }

  resolve(ab, target) {
    this.stats.casts[ab.id] = (this.stats.casts[ab.id] || 0) + 1;
    // st: which step of its combo this press is (ab.fxStep, read before the effect moves it on), so its look on every
    // client matches the hit the kit really made (ability-vfx.js: Blade Chain, Hack & Maul)
    this.env.emit({ type: 'used', ab, target, st: ab.fxStep ? ab.fxStep(this) : undefined });
    // a tank's taunt rides on this button (kits.js TAUNT_CARRY): the world taunts only if it's ready and wanted
    // (def.tauntWhen(k, ab): a carrier that only carries on some presses, the Kenseier's third Ember Cut)
    if (this.def.tauntOn && this.env.taunt && this.baseId(ab) === this.def.tauntOn && (!this.def.tauntWhen || this.def.tauntWhen(this, ab))) this.env.taunt(target);
    if (ab.ult) this.ultFire(ab);
    const share = ab.type === 'gcd' ? this.itemGcdShare(ab) : 0;   // (read before the effect: a Distill it spends shortens the GCD)
    ab.effect(this, target);
    if (this.def.afterUse) this.def.afterUse(this, ab);
    if (ab.type !== 'gcd') this.fxOgcd(ab);
    else {
      if ((this._gcdShare = (this._gcdShare || 0) + share) >= 0.999) { this._gcdShare -= 1; this.itemHook('gcd', ab); }
      if (this._ogAt == null) this._ogAt = this.now;
      else if (this.now - this._ogAt > ENGINE.FX_OGCD_FLOOR) this.fxOgcd(ab);   // (a kit with few oGCDs: a GCD stands in)
    }
  }
  // how much of a GCD this press counts as for item effects: a standard GCD is one; a shorter one (an Alembist's reagents)
  // and a press of a kit without a GCD (an Ironpalm's, by its recovery) count as their share, so fast presses don't proc
  // "on a GCD" effects more often than anyone else's GCDs do
  itemGcdShare(ab) {
    if (this.pace && this.pace.itemGcd) return +this.pace.itemGcd(this, ab);
    const t = this.gcdFree() ? (this.castTime(ab) || this.lockLen || ENGINE.ANIM_LOCK)
      : ((typeof ab.recastGcd === 'function' ? ab.recastGcd(this) : ab.recastGcd) || ENGINE.GCD);
    return Math.min(1, t / ENGINE.GCD);
  }

  update() {
    const now = this.now;
    if (this.cast) {
      const c = this.cast;
      if (this.env.moving() && now < c.end - ENGINE.SLIDECAST) {
        this.cast = null;
        this.stats.interrupts++;
        if (c.ab.type === 'gcd') { this.gcdReady = now + 0.5; this.stats.gcdTime -= this.gcdLen - 0.5; }
        if (c.ab.type === 'ogcd' || c.ab.cd) this.resetCooldown(c.ab);
        this.env.emit({ type: 'interrupted', ab: c.ab });
      } else if (now >= c.end) {
        this.cast = null;
        this.lockUntil = now + ENGINE.CAST_LOCK_EXTRA;
        this._fromCast = true;   // (a raise from a finished cast is the light raise sickness: raise())
        try { this.resolve(c.ab, this.needsTarget(c.ab) ? (this.env.target(c.ab) || c.target) : null); } finally { this._fromCast = false; }
      }
    }
    for (const slot of ['queued', 'queuedO']) {
      const q = this[slot];
      if (!q) continue;
      if (now - q.at > ((this.pace && this.pace.buffer) || ENGINE.QUEUE_WINDOW) + 0.25) this[slot] = null;
      else if (this.readyIn(q.ab) <= 0.0001) { this[slot] = null; this.input = { at: q.at, buffered: true, idle: 0 }; this.execute(q.ab); }
    }
    if (this.inbuf.length) {
      // the oldest buffered press fires the moment it can; the next one's wait starts counting then
      const q = this.inbuf[0];
      if (now - q.at > (this.pace.buffer || ENGINE.QUEUE_WINDOW) + 0.25) this.inbuf.shift();
      else if (this.readyIn(q.ab) <= 0.0001) {
        this.inbuf.shift();
        if (this.inbuf.length) this.inbuf[0].at = now;
        this.input = { at: q.at, buffered: true, idle: 0 };
        this.execute(q.ab);
      }
    }
    this.refillPool(now);
    for (const [id, d] of this.dots) {
      while (now >= d.next && d.next <= d.end + 0.001) {
        d.next += d.interval;
        this.damage(d.potency, Object.assign({ dot: true, ab: d.ab }, d.opts));
      }
      if (now > d.end) this.dots.delete(id);
    }
    if (this.pending && this.pending.length) {
      const due = this.pending.filter(p => now >= p.at);
      if (due.length) { this.pending = this.pending.filter(p => now < p.at); for (const p of due) p.fn(); }
    }
    this.autoAttack(now);
    if (this.ult) this.ultTick(now);
    if (this.def.tick) this.def.tick(this);
    for (const [id, b] of this.buffs) if (b.end <= now) { this.buffs.delete(id); if (this.def.onExpire) this.def.onExpire(this, id, b); }
  }
  autoAttack(now) {
    const au = this.def.auto;
    if (!au || this.cast || now < this.nextAuto || now - this.engagedAt > ENGINE.AUTO_ENGAGE) return;
    if (this.env.canAuto && !this.env.canAuto()) return;
    const target = this.env.target(this.autoAb);
    if (!target) return;
    this.nextAuto = now + ENGINE.AUTO_EVERY * this.hasteMult();
    this.env.emit({ type: 'auto', kind: au.kind, target });
    this.damage(au.potency, { auto: true });
  }
  refill(id) { const ab = this.abById(id); if (!ab) return; this.cd[id] = ab.charges ? { charges: ab.charges, next: 0 } : 0; }
  resetCooldown(ab) { if (ab.charges) { const n = Math.min(ab.charges, this.cd[ab.id].charges + 1); this.cd[ab.id] = { charges: n, next: n >= ab.charges ? 0 : this.cd[ab.id].next }; } else this.cd[ab.id] = 0; }   // (at full charges the recharge stops, as refundCharge does)

  // Messages from the fight (host) or training sim: e.g. 'perfect' block, 'shieldEnd', 'reflect'.
  notify(type, data) { if (this.def.onNotify) this.def.onNotify(this, type, data || {}); }

  // ---------------------------------------------------------------- effects API used by kits
  rng() { return this.env.rng(); }

  // Potency -> damage on the current enemy. opts: { ab, crit, autoCrit, mult, positional: 'rear'|'flank', posBonus, threat }
  damage(potency, opts = {}) {
    let pot = potency, posHit = null;
    if (opts.positional) {
      const pos = this.env.positional(opts.positional);
      posHit = this.has('truenorth') || pos === opts.positional || (this.def.positionalAlways && this.def.positionalAlways(this));
      if (posHit) { pot += opts.posBonus || 0; this.stats.posHit++; } else this.stats.posMiss++;
    }
    const party = this.env.partyMods ? this.env.partyMods() : {};
    const tgt = this.env.targetMods ? this.env.targetMods() : {};
    const self = this.env.selfMods ? this.env.selfMods() : {};
    // (an item's extra hit is the same "about 30 damage" for every class: it skips the class's balance knob, its own damage
    // and crit modifiers, so a 45%-crit class does not hit a Brand twice as hard as everyone else)
    const flat = !!opts.item;
    // an Ultimate's hits (itself, its window's moves, the follow-ups it tags ultPart or passes ult: true) by the role's
    // Ultimate tuning (kits.js ULT_TUNE: def.ultimate.dmgScale)
    const ab = opts.ab, ultK = !flat && this.ult && this.ult.dmgScale && (opts.ult || (ab && (ab.ult || ab.ultOf || ab.ultPart))) ? this.ult.dmgScale : 1;
    const kitDmg = !flat && this.def.dmgMod ? this.def.dmgMod(this, opts) : 0;
    const gear = this.gear();
    const critChance = opts.autoCrit ? 1 : ENGINE.BASE_CRIT + (gear.crit || 0) + (flat ? 0 : (opts.crit || 0) + (party.crit || 0) + (this.def.critMod ? this.def.critMod(this, opts) : 0)) + this.fxMod('crit');
    const crit = this.rng() < critChance;
    const variance = 0.95 + this.rng() * 0.1;
    const amount = Math.round(pot * ENGINE.POT_SCALE * (flat ? 1 : this.def.potMult || 1) * (1 + kitDmg) * (1 + (gear.power || 0)) * (1 + (party.dmg || 0)) * (1 + (tgt.vuln || 0)) *
      (1 - (self.dmgDown || 0)) * (1 + (self.dmg || 0)) * (opts.mult || 1) * ultK * (crit ? ENGINE.CRIT_MULT : 1) * variance * (1 + this.fxMod('dmg')));
    this.stats.damage += amount;
    if (party.dmg || tgt.vuln || self.dmg) this.stats.burstDamage += amount;
    this.stats.last = this.now;
    // (opts.tgt: an enemy id when a hit lands on something other than what you last aimed at: a Passing Strike)
    this.env.emit({ type: 'damage', amount, crit, potency: pot, positional: posHit, ab: opts.ab, dot: !!opts.dot, auto: !!opts.auto, threat: opts.threat || (this.now < (this._ultThrUntil || 0) && this.def.role !== 'tank' ? ENGINE.ULT_THREAT : 1), tgt: opts.tgt });
    if (opts.item) return { amount, crit, posHit };   // an item's extra hit doesn't feed the kit or other items
    if (this.def.onDamage) this.def.onDamage(this, amount, crit, opts);
    if (crit) this.fxCrit();
    return { amount, crit, posHit };
  }
  // Damage over time, ticking every `interval`. Re-applying keeps up to 30% of the old duration (pandemic).
  dot(id, potency, dur, interval = 3, opts = {}) {
    const old = this.dots.get(id);
    let end = this.now + dur;
    if (old && old.end > this.now) {
      const left = old.end - this.now;
      end += Math.min(left, dur * ENGINE.PANDEMIC);
      if (left > dur * ENGINE.PANDEMIC) this.wasted(id + ' clipped', left - dur * ENGINE.PANDEMIC);
    }
    this.dots.set(id, { potency, interval, next: old && old.end > this.now ? old.next : this.now + interval, end, ab: opts.ab, opts });
  }
  dotRemaining(id) { const d = this.dots.get(id); return d ? Math.max(0, d.end - this.now) : 0; }

  healAmount(potency, opts = {}) {
    const self = this.def.healMod ? this.def.healMod(this, opts) : 0;
    const gear = this.gear();
    const crit = this.rng() < ENGINE.BASE_CRIT + (gear.crit || 0) + (opts.crit || 0) + this.fxMod('crit');
    if (crit) this.fxCrit();
    return { amount: Math.round(potency * ENGINE.POT_SCALE * (1 + self) * (1 + (gear.power || 0)) * (crit ? ENGINE.CRIT_MULT : 1) * (0.95 + this.rng() * 0.1) * (1 + this.fxMod('heal'))), crit };
  }
  heal(target, potency, opts = {}) {
    const { amount, crit } = this.healAmount(potency, opts);
    this.env.emit({ type: 'heal', target, amount, crit, ab: opts.ab, not: opts.not });
    this.itemHook('heal');
    return amount;
  }
  // Heal a fixed number of HP (for heals based on damage taken / dealt rather than potency).
  healRaw(target, amount, opts = {}) {
    amount = Math.round(amount * (1 + (this.def.healMod ? this.def.healMod(this, opts) : 0)) * (1 + (this.gear().power || 0)) * (1 + this.fxMod('heal')));
    this.env.emit({ type: 'heal', target, amount, crit: false, ab: opts.ab, not: opts.not });
    this.itemHook('heal');
    return amount;
  }
  // What a cast heal on an ally should land for (the party frames' incoming-heal preview): ab.healPot (a number or
  // fn(k)) or the {h:N} its text names, worked out the way healAmount does but without its crit and spread (no rng, so
  // the fight is unchanged). 0 for a move that heals nothing, or for a fallen ally (a raise, not a heal).
  healPreview(ab, target) {
    if (!ab || ab.target !== 'ally' || typeof target !== 'number' || (this.env.isDead && this.env.isDead(target))) return 0;
    let pot = typeof ab.healPot === 'function' ? ab.healPot(this) : ab.healPot;
    if (pot == null) { const m = typeof ab.desc === 'string' && /\{h:(\d+)\}/.exec(ab.desc); pot = m ? +m[1] : 0; }
    if (!(pot > 0)) return 0;
    return Math.round(pot * ENGINE.POT_SCALE * (1 + (this.def.healMod ? this.def.healMod(this, { ab }) : 0)) * (1 + (this.gear().power || 0)) * (1 + this.fxMod('heal')));
  }
  hot(target, potencyPerTick, ticks, interval = 3, opts = {}) {
    const { amount } = this.healAmount(potencyPerTick, opts);
    this.env.emit({ type: 'hot', target, amount, ticks, interval, ab: opts.ab, id: opts.id || (opts.ab && opts.ab.id) });
    this.itemHook('heal');
  }
  // what a shield of this potency comes to (no crit, no spread): shield() and the wards a splash carries (opts.not on shield: an ally to leave out of 'lowest')
  shieldAmount(potency, opts = {}) { return Math.round(potency * ENGINE.POT_SCALE * (1 + (this.def.healMod ? this.def.healMod(this, opts) : 0)) * (1 + (this.gear().power || 0)) * (1 + this.fxMod('heal'))); }
  shield(target, potency, dur, opts = {}) {
    const amount = this.shieldAmount(potency, opts);
    this.env.emit({ type: 'shield', target, amount, dur, ab: opts.ab, tag: opts.tag, not: opts.not, sk: opts.ab && typeof opts.ab === 'object' ? opts.ab.id : (typeof opts.ab === 'string' ? opts.ab : undefined) });   // (sk: which shield it is; a recast of the same one replaces it, others stack: fight.js giveShield)
    this.itemHook('heal');
    return amount;
  }
  // Damage reduction on a player (or 'party'). kind: undefined | 'brace' | 'reflect' | 'living' | 'invuln'
  mitigate(target, pct, dur, opts = {}) { this.env.emit({ type: 'mit', target, pct, dur, ab: opts.ab, kind: opts.kind, tag: opts.tag }); }   // (opts.tag 'sus:x': a cut re-sent every second while a condition holds; the host keeps ONE of it per caster and tag and only pushes its end out, fight.js 'mit')
  partyBuff(kind, value, dur, opts = {}) { this.env.emit({ type: 'partyBuff', kind, value, dur, ab: opts.ab }); }
  // A buff on ONE chosen ally (ALLY_BUFFS names it): kind 'dmg' (damage dealt) or 'haste'. The host keeps it per player
  // (raid-host.js allyBuffs), tells everyone ('abuff'), and the ally's own kit reads it through env.selfMods().
  allyBuff(target, id, opts = {}) {
    const b = ALLY_BUFFS[id];
    if (!b || target == null) return;
    this.env.emit({ type: 'allyBuff', target, id, kind: b.kind, value: b.value, dur: b.dur, ab: opts.ab, not: opts.not });   // (target 'lowest': the most hurt ally, other than opts.not)
  }
  debuffTarget(kind, value, dur, opts = {}) { this.env.emit({ type: 'targetDebuff', kind, value, dur, ab: opts.ab, tag: opts.tag }); }   // (tag: a weakness of its own that stacks with the holder's others, fight.js)
  selfDamage(pctMaxHp, opts = {}) { this.env.emit({ type: 'selfDamage', pct: pctMaxHp, ab: opts.ab }); }
  // instant: not at the end of a cast (a talent, a seed, a Draught), which leaves the heavier raise sickness (fight.js FIGHT.SICK)
  raise(target, opts = {}) { this.env.emit({ type: 'raise', target, ab: opts.ab, instant: !this._fromCast }); }
  rewind(target, secs, opts = {}) { this.env.emit({ type: 'rewind', target, secs, ab: opts.ab }); }
  // where: 'behind' (the target's back), or a kit move: 'dash' (d px toward where you're heading), 'around' (to the far
  // side of the target), 'through' (a charge through the target, d px past it). The world moves you (kitMoveDest).
  teleport(where, opts = {}) { this.env.emit({ type: 'teleport', where, ab: opts.ab, d: opts.d }); }
  fx(name, data) { this.env.emit({ type: 'fx', name, data }); }
}

// A window's empowered move: the bar's move with the override's fields on top (getters kept). It keeps the move's id,
// so its cooldown, talents, item enhancements, bot logic and kit code (k.abById, opts.ab.id checks) all still apply;
// o.fxId names its visual (ABILITY_VFX) and what other clients are told it was. ultOf: the Ultimate it belongs to.
function ultOver(ab, o, ult) {
  const copy = (...src) => src.reduce((to, s) => Object.defineProperties(to, Object.getOwnPropertyDescriptors(s)), {});
  return Object.assign(copy(ab, o), { id: ab.id, ultOf: ult ? ult.id : true });
}
// def.ultimate, or one of its window's empowered moves, by the id other clients were sent (fxId) or its own id
function ultAbilityById(def, id) {
  const u = def && def.ultimate;
  if (!u || id == null) return null;
  if (u.id === id) return u;
  const over = u.window && u.window.over;
  if (!over) return null;
  for (const [base, o] of Object.entries(over)) {
    if (o.fxId !== id) continue;
    const ab = def.abilities.find(a => (a.replaces || a.id) === base);
    return ab ? ultOver(ab, o, u) : null;
  }
  return null;
}
// for kit code: add Ultimate charge (k.ultGain does the work; nothing for a kit without an Ultimate)
function ultGain(k, n) { k.ultGain(n); }

if (typeof module !== 'undefined') module.exports = { ENGINE, ALLY_BUFFS, Kit, ultOver, ultAbilityById, ultGain };
