// Rotation simulator: plays every class as a "newbie" and as a "pro" against a training target
// for a few minutes and prints DPS, so we can check the skill gap and balance between classes.
//   node tools/simulate.js            (all classes, 5 runs each)
//   node tools/simulate.js pyromancer (one class, with a breakdown)
//
// The newbie follows the in-game hints only: press a glowing button if there is one, otherwise the
// first button (Q); use cooldowns as soon as they're up; react a bit late; doesn't slidecast or plan
// movement; ignores positionals. The pro plays each class's real priority: pools for the 60s party burst,
// weaves, plans movement, times Perfect Blocks / Ward breaks, and so on.

const path = require('path');
const { ENGINE, Kit } = require(path.join(__dirname, '../client/js/combat/engine.js'));
const kitsModule = require(path.join(__dirname, '../client/js/combat/kits.js'));
const { KITS, IP_INPUT, IP_SLOT, ipLive, ipMoves } = kitsModule;
Object.assign(global, kitsModule);   // KITS and the talent helpers the specs share
const { SPECS, kitFor } = require(path.join(__dirname, '../client/js/combat/specs.js'));
const { TALENT_BY_ID } = require(path.join(__dirname, '../client/js/combat/talents.js'));
global.TALENT_BY_ID = TALENT_BY_ID;   // the engine reads talent cooldown / cast changes from it
// this tool's model is written in the original big-number units; only ratios matter for balance
ENGINE.NUM_SCALE = 1; ENGINE.POT_SCALE = 10;
global.ENGINE = ENGINE;   // the kits read ENGINE.NUM_SCALE

const DT = 0.05;
const FIGHT_LEN = 300;
const MOVE_EVERY = 30, MOVE_LEN = 3.5;     // a mechanic forces ~3.5s of movement every 30s
const BURST_EVERY = 60, BURST_LEN = 15;    // the party's shared burst window (other players' buffs)
const AUTO_EVERY = 2.8, AUTO_DMG = 1200;   // boss autos on the tank
const BUSTER_EVERY = 45, BUSTER_DMG = 18000;
const RAIDWIDE_EVERY = 30, RAIDWIDE_DMG = 5000;

function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// talents: an optional Set of talent ids the hero holds (tools/talents.js); the class balance runs hold none
function runSim(classId, skill, seed, specId, talents) {
  const def = kitFor(classId, specId, talents);   // (talents that grant a new move put it in its slot)
  const rng = mulberry(seed);
  const human = mulberry(seed * 7 + 3); // separate stream for "human" randomness
  const state = { t: 0, moving: false, tookDamage: [], shield: null, mits: [], reflect: null, healDebt: 0, healing: 0, eff: 0, gcdHeals: 0, allyWards: [], petalShields: [] };
  const role = ['bastion', 'bloodreaver', 'runeguard', 'ironpalm'].includes(classId) || def.role === 'tank' ? 'tank'
    : ['cleric', 'grovekeeper', 'chronomancer', 'alembist', 'threadweaver', 'tidecaller', 'lanternkeeper'].includes(classId) ? 'healer' : 'dps';
  const maxHp = role === 'tank' ? 32000 : 21000;
  let lastPos = 'rear';
  const env = {
    now: () => state.t,
    rng,
    moving: () => state.moving,
    // (a body probe asks whether you're running through the target right now: a Driftblade's Passing Strikes)
    target: ab => (ab.body ? (state.inBody ? { id: 'dummy', x: 0, y: 0 } : null) : ab.target === 'ally' ? 'tank'
      : ab.target === 'enemy' ? (state.outOfRange && ab.range === 'melee' ? null : { id: 'dummy', x: 0, y: 0 }) : true),
    positional: want => (lastPos === 'want' ? want || 'rear' : lastPos),
    partyMods: () => (inBurst(state.t) ? { dmg: 0.08 } : {}),
    targetMods: () => ({}),
    selfMods: () => ({}),
    recentDamage: secs => state.tookDamage.filter(d => d.t > state.t - secs).reduce((s, d) => s + d.a, 0),
    maxHp: () => maxHp,
    // a rough HP for the Berserker: lower right after big hits
    hpFrac: () => Math.max(0.15, 1 - Math.min(0.85, env.recentDamage(8) / maxHp * 1.3)),
    isDead: () => false,
    // the heal target's health (an Alembist's Throw glow and Magnum Opus charge): a pro says whom it aims at
    // (state.aimHp); otherwise the ally you'd throw at is hurt while the party carries real damage
    allyHp: () => (state.aimHp != null ? state.aimHp : state.healDebt > 3500 ? 0.6 : 0.95),
    // a telegraph about to land on a spot: the blow the Marionettist mover has coming for the Doll (Pirouette glows)
    danger: (x, y, within) => state.dollHitAt != null && state.dollHitAt - state.t <= within,
    defaultLink: () => 'tank',
    talents: () => talents || null,
    // the boss as talents see it (kits.js bossNow): busters and raidwides are 2.5s casts; the tank is its target
    boss: () => {
      const nextOf = (first, every) => (state.t < first ? first : first + Math.ceil((state.t - first) / every) * every);
      const left = Math.min(nextOf(20, BUSTER_EVERY), nextOf(12, RAIDWIDE_EVERY)) - state.t;
      const toRw = nextOf(12, RAIDWIDE_EVERY) - state.t;   // (wide: a raidwide within 5s, for the Alembist's Salt glow)
      return { casting: left > 0 && left < 2.5, castLeft: Math.max(0, left), next: Math.max(0, left), onMe: role === 'tank', vuln: 0, selfVuln: role === 'tank' && state.t - lastBusterAt < 8, wide: toRw > 0 && toRw < 5 };
    },
    // where you stand: away from your spot while a mechanic moves you (and now and then for a newbie), so a Sigilmancer leaves its circle
    // (a class that plays on the move, the Driftblade, gets a path from its mover: circles for Orbit, long lines for Comet)
    pos: () => (state.posFn ? state.posFn(state.t) : state.away ? { x: 999, y: 0 } : { x: 0, y: 0 }),
    // a Lanternkeeper's lanterns (kits.js lkShare): the host stand-in below (LAMP_SIM) heals with them once a second
    lamps: list => { state.lamps = list; },
    emit: ev => {
      if (ev.type === 'heal' || ev.type === 'hot') {
        const amt = ev.type === 'hot' ? ev.amount * ev.ticks : ev.amount;
        state.healing += ev.target === 'party' ? amt * 4 : amt;
        state.eff += Math.min(state.healDebt, (ev.target === 'party' ? amt * 4 : amt)); state.healDebt = Math.max(0, state.healDebt - (ev.target === 'party' ? amt * 4 : amt));
      }
      // Moonwell: assume three of the four stand in the pool for its whole life
      if (ev.type === 'pool') { state.healing += ev.amount * ev.ticks * 3; state.eff += Math.min(state.healDebt, ev.amount * ev.ticks * 3); state.healDebt = Math.max(0, state.healDebt - ev.amount * ev.ticks * 3); }
      // a thrown vial (Alembist): a splash usually catches two or three of the four (the whole party if it says so),
      // a cloud about the same for its whole life; shields count at 80% like an Aegis's
      if (ev.type === 'splash') {
        const hits = ev.target === 'party' ? 4 : ev.target === 'lowest' ? 1.2 : (ev.r || 0) >= 110 ? 2.4 : 1.6;
        const amt = (ev.amount || 0) * hits + (ev.sh || 0) * hits * 0.8 + ((ev.pa || 0) + (ev.ps || 0) * 0.6) * (ev.ticks || 0) * 2.4;
        state.healing += amt; state.eff += Math.min(state.healDebt, amt); state.healDebt = Math.max(0, state.healDebt - amt);
      }
      if (ev.type === 'lamp') { LAMP_SIM.event(state, ev); return; }   // (a Lanternkeeper's Flare and Relight)
      // Judgment (Inquisitor): the party's hits burst every charge soon after
      if (ev.type === 'brand') k.stats.damage += ev.amount * ev.ticks;
      // a shield on an ally (Aegis): counts as healing; a Petal shield on the tank soaks most of it and comes back now and then
      if (ev.type === 'shield' && role === 'healer') {
        state.healing += ev.amount * 0.8; state.eff += Math.min(state.healDebt, ev.amount * 0.8); state.healDebt = Math.max(0, state.healDebt - ev.amount * 0.8);
        if (ev.tag === 'petal') state.petalShields.push({ at: state.t + 3 });
      }
      if (ev.type === 'shield' && ev.target === 'self') state.shield = { amt: ev.amount, max: ev.amount, end: state.t + ev.dur, tag: ev.tag };
      // a Ward on an ally (Spellwarden): assume it soaks a bit over half before it ends (an ally isn't tanking)
      if (ev.type === 'shield' && ev.tag === 'ward' && ev.target !== 'self') state.allyWards.push({ start: state.t, end: state.t + ev.dur });
      if (ev.type === 'shield' && ev.target === 'party') { state.eff += Math.min(state.healDebt, ev.amount * 4); state.healDebt = Math.max(0, state.healDebt - ev.amount * 4); }
      // a tank's own cut (a Berserker's Bloodbath) is damage taken: it feeds the bank and lowers HP
      if (ev.type === 'selfDamage' && role === 'tank') { state.tookDamage.push({ t: state.t, a: maxHp * (ev.pct || 0) }); return; }
      if (KEN_SIM.emit(state, k, ev)) { if (ev.op === 'duel') nextAuto = Math.min(nextAuto, state.t + KENSEI.DUEL_EVERY); return; }   // (a Kenseier's deflect, Posture and Ember Duel)
      if (TANK_SIM.emit(state, k, ev)) return;   // the advanced tanks' jaw and Ledger (below)
      if (ev.type === 'mit' && ev.target === 'self') {
        if (ev.kind === 'reflect') state.reflect = state.t + ev.dur;
        state.mits.push({ pct: ev.pct, end: state.t + ev.dur, start: state.t, kind: ev.kind });
      }
    },
  };
  const k = new Kit(def, env);
  state.kit = k;
  const inBurst = t => t % BURST_EVERY < BURST_LEN;
  const burstSoon = t => (BURST_EVERY - (t % BURST_EVERY)) % BURST_EVERY < 6 && !inBurst(t);
  const isMoveWindow = t => t > 5 && (t % MOVE_EVERY) < MOVE_LEN;
  const moveSoon = (t, within) => { const into = t % MOVE_EVERY; return into > MOVE_LEN && MOVE_EVERY - into < within; };

  // incoming damage for tanks (perfect blocks, ward breaks, reflects, drain value)
  let nextAuto = 3, nextBuster = 20, nextRaidwide = 12, lastBusterAt = -99;
  function hitTank(raw, kind) {
    let mult = 1, perfect = false, read = null;
    state.mits = state.mits.filter(m => m.end > state.t);
    for (const m of state.mits) {
      if (m.kind === 'brace' && state.t - m.start <= 0.8) { perfect = true; mult *= 0.4; }
      else if (m.kind === 'parry' && state.t - m.start <= 0.4 && !read) { read = m; mult *= 0.5; }   // an Ironpalm's Read (fight.js READ_WINDOW)
      else if (m.kind === 'reflect') { mult *= 0.2; }
      else if (m.kind !== 'living' && m.kind !== 'invuln') mult *= 1 - m.pct;
    }
    if (state.reflect && state.t <= state.reflect) { state.reflect = null; state.mits = state.mits.filter(m => m.kind !== 'reflect'); k.notify('reflect', { b: kind === 'buster' ? 1 : 0 }); }
    if (perfect) { state.mits = state.mits.filter(m => !(m.kind === 'brace' && state.t - m.start <= 0.8)); k.notify('perfect', { b: kind === 'buster' ? 1 : 0 }); }
    if (read) { state.mits = state.mits.filter(m => m !== read); k.notify('read', { b: kind === 'buster' ? 1 : 0 }); }
    let amt = raw * mult;
    amt = TANK_SIM.hit(state, k, amt, kind);
    if (classId === 'kenseier') amt = KEN_SIM.hit(state, k, amt, kind);   // (a Kenseier's deflect: KEN_SIM below)
    if (state.shield) {
      const used = Math.min(state.shield.amt, amt); state.shield.amt -= used; amt -= used;
      if (state.shield.amt <= 0) { k.notify('shieldEnd', { tag: state.shield.tag, frac: 1 }); state.shield = null; }
    }
    if (amt > 0) k.notify('taken', { a: amt, k: kind, df: state.kenDf });   // (a Gloomsworn's vessel fills for every hit it takes)
    state.tookDamage.push({ t: state.t, a: amt });
  }

  // healer workload: party damage that needs healing
  function healerIncoming() {
    const before = state.healDebt;
    if (state.t >= nextAuto) { nextAuto += AUTO_EVERY; state.healDebt += AUTO_DMG * 0.75; }
    if (state.t >= nextRaidwide) { nextRaidwide += RAIDWIDE_EVERY; state.healDebt += RAIDWIDE_DMG * 4 * 0.85; }
    if (state.t >= nextBuster) { nextBuster += BUSTER_EVERY; state.healDebt += BUSTER_DMG * 0.45; }
    // Threadweaver: about a third of the party's damage runs along the threads (the host's 'carry' notices), more with more threads
    if (classId === 'threadweaver' && state.healDebt > before && k.g.n) k.notify('carry', { a: (state.healDebt - before) * 0.3 * Math.min(1, k.g.n / 2) });
  }

  const policy = (skill === 'pro' ? PRO : NEWBIE)[classId] || (skill === 'pro' ? genericPro : genericNewbie);   // a spec plays with its class's policy
  // a pro who took a talent on a party cooldown the class policy leaves alone (Rally Banner, Smoke Bomb...) uses it
  // before raidwides, and Undying before tankbusters
  const extras = skill === 'pro' && talents ? [...new Set([...talents].map(id => TALENT_BY_ID[id] && !TALENT_BY_ID[id].t.grants && TALENT_BY_ID[id].t.ab).filter(ab => TALENT_EXTRA.includes(ab)))] : [];
  let reaction = 0;
  for (state.t = 0; state.t < FIGHT_LEN; state.t += DT) {
    state.moving = isMoveWindow(state.t);
    state.away = isMoveWindow(state.t) || (skill !== 'pro' && human() < 0.3);
    // Pros pre-position, so they spend less time moving.
    if (skill === 'pro' && isMoveWindow(state.t) && (state.t % MOVE_EVERY) > MOVE_LEN * 0.6) state.moving = false;
    // Melee lose uptime while moving out of mechanics (out of range); pros keep it with gap closers.
    state.outOfRange = isMoveWindow(state.t) && state.moving && def.abilities[0].range === 'melee' && skill !== 'pro';
    // classes that move on purpose (the Driftblade) walk their own path on top of that
    if (MOVERS[classId]) MOVERS[classId](state, skill, human, specId);
    if (role === 'tank') {
      if (state.t >= nextAuto) { nextAuto += state.kenDuel > state.t ? KENSEI.DUEL_EVERY : AUTO_EVERY; hitTank(AUTO_DMG, 'auto'); }
      if (state.t >= nextBuster) { nextBuster += BUSTER_EVERY; hitTank(BUSTER_DMG, 'buster'); lastBusterAt = state.t; }
      if (state.t >= nextRaidwide) { nextRaidwide += RAIDWIDE_EVERY; hitTank(RAIDWIDE_DMG, 'raidwide'); }
      TANK_SIM.tick(state, k, hitTank);
      if (classId === 'kenseier') KEN_SIM.tick(state, k, nextBuster, nextRaidwide);
      // (an ally's Ward breaks all the way if a tankbuster or raidwide landed while it was up; otherwise it soaks a little)
      const lastRw = nextRaidwide - RAIDWIDE_EVERY, during = (w, at) => at >= w.start && at <= w.end;
      for (const w of state.allyWards) if (state.t >= w.end) { w.done = true; k.notify('shieldEnd', { tag: 'ward', frac: during(w, lastBusterAt) || during(w, lastRw) ? 1 : 0.3 }); }
      state.allyWards = state.allyWards.filter(w => !w.done);
      if (state.shield && state.t >= state.shield.end) { k.notify('shieldEnd', { tag: state.shield.tag, frac: 1 - state.shield.amt / state.shield.max }); state.shield = null; }
    }
    if (role === 'healer') {
      healerIncoming();
      for (const p of state.petalShields) if (state.t >= p.at) { p.done = true; k.notify('shieldEnd', { tag: 'petal', frac: 0.8 }); }
      if (state.lamps) LAMP_SIM.tick(state, k);   // (a Lanternkeeper's lanterns pulse once a second)
      state.petalShields = state.petalShields.filter(p => !p.done);
    }
    // positional: pros are where they want to be most of the time; newbies wander
    if (skill === 'pro') lastPos = human() < 0.9 ? 'want' : 'front';
    else lastPos = ['rear', 'flank', 'front', 'front'][Math.floor(human() * 4)];
    k.update();
    if (reaction > state.t) continue;
    const ctx = { t: state.t, inBurst, burstSoon, isMoveWindow, moveSoon, state, human, nextAuto, nextBuster, nextRaidwide, role,
      setPos: p => { lastPos = p; } };
    const extra = extras.find(id => ready(k, id) && weaveOk(k) && (id === 'undying' ? nextBuster - state.t < 1.5 : nextRaidwide - state.t < 2));
    const choice = extra ? I(k, extra) : policy(k, ctx);
    if (choice !== null && choice !== undefined) {
      const ab = k.abilities[choice];
      if (ab && ab.target === 'enemy' && ab.id) { /* positional resolution */ }
      const ok = k.press(choice);
      if (ok && skill !== 'pro') reaction = state.t + 0.25; // newbies don't double-weave quickly
    }
  }
  const dur = FIGHT_LEN;
  return { dps: k.stats.damage / dur, stats: k.stats, hps: state.healing / dur, ehps: state.eff / dur, gcdHeals: state.gcdHeals, k };
}

// ---------------------------------------------------------------- policies
const TALENT_EXTRA = ['banner', 'warcry', 'undying', 'sanctum', 'cloak', 'smoke', 'smolder', 'stasis'];
// abilities by id, or by the id of the base ability a specialization replaced
const abOf = (k, id) => k.abilities.find(a => a.id === id || a.replaces === id);
const I = (k, id) => k.abilities.findIndex(a => a.id === id || a.replaces === id);
const ready = (k, id) => { const ab = abOf(k, id); return k.readyIn(ab) <= 0.0001 && k.usable(ab); };
const readySoon = (k, id, s = ENGINE.QUEUE_WINDOW) => { const ab = abOf(k, id); return k.readyIn(ab) <= s && k.usable(ab); };

// A believable newbie, based on the research numbers (~85-90% GCD uptime, partial use of hints):
//  - never queues: waits until the GCD is ready, then reacts 0.1-0.6s late
//  - notices a glowing button 60% of the time; otherwise presses Q, or now and then a random usable spender
//  - uses oGCDs a little after they come up, whenever (no burst alignment, sometimes clipping the GCD)
//  - keeps casting into movement (gets interrupted), ignores positionals (positionals are random)
//  - heals with the obvious GCD heal when the party looks hurt
function genericNewbie(k, ctx) {
  const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
  // oGCDs: notice each one 0.5-3s after it's ready
  for (const ab of k.abilities) {
    if (ab.type !== 'ogcd') continue;
    if (!k.usable(ab) || k.readyIn(ab) > 0.0001) { n.ogcdSeen[ab.id] = null; continue; }
    if (ab.target === 'ally' && ctx.role === 'healer' && ctx.state.healDebt < 3000 && !k.glows(ab)) continue;
    if ((ab.id === 'stasis' || ab.id === 'mirror' || ab.id === 'undying' || ab.id === 'shift' || k.baseId(ab) === 'rite') && !k.glows(ab)) continue;
    if (n.ogcdSeen[ab.id] == null) n.ogcdSeen[ab.id] = ctx.t + 0.5 + ctx.human() * 2.5;
    if (ctx.t >= n.ogcdSeen[ab.id] && !k.cast) { n.ogcdSeen[ab.id] = null; return I(k, ab.id); }
  }
  if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now) { n.gcdSeenAt = null; return null; }
  if (n.gcdSeenAt === null) { n.gcdSeenAt = ctx.t; n.delay = 0.1 + ctx.human() * 0.5; n.noticeGlow = ctx.human() < 0.6; n.roll = ctx.human(); }
  if (ctx.t < n.gcdSeenAt + n.delay) return null;
  n.gcdSeenAt = null;
  if (ctx.role === 'healer' && ctx.state.healDebt > 3500) {
    const heals = k.abilities.filter(a => a.type === 'gcd' && a.target === 'ally' && !a.allowDead && k.usable(a) && k.readyIn(a) <= 0.0001);
    if (heals.length) { ctx.state.gcdHeals++; return I(k, heals[Math.floor(n.roll * heals.length)].id); }
  }
  const gcds = k.abilities.filter(a => a.type === 'gcd' && a.target !== 'ally' && k.usable(a) && k.readyIn(a) <= 0.0001);
  const glowing = gcds.filter(a => k.glows(a));
  if (n.noticeGlow && glowing.length) return I(k, glowing[0].id);
  if (n.roll < 0.25 && gcds.length > 1) return I(k, gcds[1 + Math.floor(ctx.human() * (gcds.length - 1))].id);
  return 0;
}
function genericPro(k, ctx) { return genericNewbie(k, ctx); }
// a glowing oGCD a newbie answers (60% of the time, 0.1-0.6s late): Bastion's Brace as a tankbuster comes in
function newbieGlowOgcd(k, ctx, id) {
  const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
  const ab = abOf(k, id);
  const up = ab && (ab.charges ? k.charges(ab) > 0 : k.cdRemaining(ab) <= 0.0001);   // (off cooldown; a move in progress is waited out below)
  if (!ab || !k.glows(ab) || !up || !k.usable(ab)) { n.glowAt = null; return null; }
  if (n.glowAt == null) { n.glowAt = ctx.t + 0.1 + ctx.human() * 0.5; n.glowGo = ctx.human() < 0.6; }
  if (n.glowGo && ctx.t >= n.glowAt) { n.glowGo = false; return I(k, id); }   // (pressed mid-move it's buffered, as any press)
  return null;
}
const NEWBIE = {
  bastion(k, ctx) { const g = newbieGlowOgcd(k, ctx, 'brace'); return g != null ? (g < 0 ? null : g) : genericNewbie(k, ctx); },
  // Runeguard: the generic newbie, but a Spellwarden's glowing Ward (an ally-target GCD the generic one skips) is
  // answered like any glowing button: noticed 60% of the time, pressed 0.1-0.6s after the GCD is ready
  runeguard(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    const w = abOf(k, 'ward');
    if (k.def.spec === 'spellwarden' && k.glows(w) && k.usable(w)) {
      if (n.wardGo == null) { n.wardGo = ctx.human() < 0.6; n.wardAt = null; }
      if (n.wardGo) {
        if (k.gcdRemaining() > 0.0001 || k.cast) { n.wardAt = null; return genericNewbie(k, ctx); }
        if (n.wardAt == null) n.wardAt = ctx.t + 0.1 + ctx.human() * 0.5;
        if (ctx.t < n.wardAt) return null;
        n.wardGo = false; return I(k, 'ward');
      }
    } else n.wardGo = null;
    return genericNewbie(k, ctx);
  },
  // Alembist: the hints only. Distill and Grand Batch when noticed; throws when the party looks hurt or R glows;
  // otherwise the glowing reagent (noticed 60% of the time), else Q, now and then a random one. Never marks a vial: its
  // Throw takes the oldest (the leftmost).
  alembist(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    for (const id of ['distill', 'batch']) {
      const ab = abOf(k, id);
      if (!k.usable(ab) || k.readyIn(ab) > 0.0001 || (ab.glow && !k.glows(ab))) { n.ogcdSeen[id] = null; continue; }   // (Catalyst: only while it glows)
      if (n.ogcdSeen[id] == null) n.ogcdSeen[id] = ctx.t + 0.5 + ctx.human() * 2.5;
      if (ctx.t >= n.ogcdSeen[id]) { n.ogcdSeen[id] = null; return I(k, id); }
    }
    if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now) { n.gcdSeenAt = null; return null; }
    if (n.gcdSeenAt === null) { n.gcdSeenAt = ctx.t; n.delay = k.g.half.length ? 0.05 + ctx.human() * 0.15 : 0.1 + ctx.human() * 0.5; n.noticeGlow = ctx.human() < 0.6; n.roll = ctx.human(); }   // (the second reagent of a brew follows in rhythm)
    if (ctx.t < n.gcdSeenAt + n.delay) return null;
    n.gcdSeenAt = null;
    const th = abOf(k, 'throw');
    if (k.usable(th) && ((ctx.state.healDebt > 3500 && n.roll < 0.7) || (n.noticeGlow && k.glows(th)))) { ctx.state.gcdHeals++; return I(k, 'throw'); }
    const reagents = ['ember', 'dew', 'salt'].map(id => abOf(k, id)).filter(a => k.usable(a));
    if (!reagents.length) return k.usable(th) ? I(k, 'throw') : null;
    const glowing = reagents.filter(a => k.glows(a));
    if (n.noticeGlow && glowing.length) return I(k, glowing[0].id);
    if (n.roll < 0.25) return I(k, reagents[Math.floor(ctx.human() * reagents.length)].id);
    return k.usable(abOf(k, 'ember')) ? 0 : I(k, reagents[0].id);
  },
};

// Each pro policy returns the ability index to press, or null. They weave oGCDs in the first half of the GCD.
const weaveOk = k => k.gcdRemaining() > 0.7 && !k.cast;
const castOk = (k, ctx, castTime) => !ctx.state.moving && !(ctx.isMoveWindow(ctx.t + castTime - 0.4) && castTime > 0.3);

const PRO = {
  bastion(k, ctx) {
    // Perfect Block: Brace ~0.3s before each boss swing, keeping one charge for busters
    const toAuto = ctx.nextAuto - ctx.t, toBuster = ctx.nextBuster - ctx.t;
    const brace = abOf(k, 'brace');
    if (k.charges(brace) > 0 && ((toAuto < 0.45 && toAuto > 0.1 && (k.charges(brace) === 2 || toBuster > 6)) || (toBuster < 0.45 && toBuster > 0.1))) return I(k, 'brace');
    if (toBuster < 1.2 && ready(k, 'bulwark')) return I(k, 'bulwark');
    if (ctx.inBurst(ctx.t) && ready(k, 'oath') && weaveOk(k)) return I(k, 'oath');
    // Hallowed Ground (a talent in Rally Banner's place): pour a full gauge out between bursts
    if (abOf(k, 'banner').id === 'hallowed' && ready(k, 'banner') && weaveOk(k) && k.g.resolve >= 90 && !k.has('oath') && k.cdRemaining(abOf(k, 'oath')) > 12) return I(k, 'banner');
    if (k.gcdRemaining() > 0.0001) return null;
    const pooling = ctx.burstSoon(ctx.t) || (k.cdRemaining(abOf(k, 'oath')) < 8 && !k.has('oath'));
    // a free Holy Edge (a tankbuster turned aside): in the Oath if it's coming before the free one runs out
    if (k.has('turned') && (k.has('oath') || k.remaining('turned') < 3 || k.cdRemaining(abOf(k, 'oath')) > k.remaining('turned'))) return I(k, 'edge');
    if (k.g.resolve >= 50 && (k.has('oath') || k.g.resolve >= 75 && !pooling || (k.g.resolve >= 90 && k.g.step === 2))) return I(k, 'edge');
    return I(k, 'blade');
  },
  bloodreaver(k, ctx) {
    if (ready(k, 'frenzy') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'frenzy');
    // talent moves: Scab just before a tankbuster, Blood Moon to soak one
    const toBust = ctx.nextBuster - ctx.t;
    if (abOf(k, 'warcry').id === 'scab' && ready(k, 'warcry') && toBust < 1.2 && weaveOk(k)) return I(k, 'warcry');
    if (abOf(k, 'undying').id === 'moon' && ready(k, 'undying') && toBust < 1.5 && weaveOk(k)) return I(k, 'undying');
    const let_ = abOf(k, 'letting');
    if (weaveOk(k) && k.charges(let_) > 0 && k.g.blood <= 80 && (k.charges(let_) === 2 || ctx.inBurst(ctx.t) || k.cdRemaining(let_) < 1)) return I(k, 'letting');
    // Undying on a tankbuster (the hit turns to Blood, Drains are free), War Cry just before one (its free Drain cashes it)
    if (abOf(k, 'undying').id === 'undying' && ready(k, 'undying') && toBust < 1.5 && weaveOk(k)) return I(k, 'undying');
    if (abOf(k, 'warcry').id === 'warcry' && ready(k, 'warcry') && toBust < 3 && weaveOk(k)) return I(k, 'warcry');
    if (k.gcdRemaining() > 0.0001) return null;
    // the bank: what a Drain cashes (the damage since the last one). Free Drains are spread so each has a bank behind
    // it (one Hack between), and one is held for a tankbuster that lands while they last
    const bank = reaverBank(k), mx = k.env.maxHp(), G = ENGINE.GCD;
    const gorge = k.stacks('gorge');
    // the open wound: a Drain right after a tankbuster or raidwide lands hits much harder, so with a Drain in hand the
    // GCD is held for the last moment before the hit, and the Drain goes in as soon as it lands
    const toHit = Math.min(toBust, ctx.nextRaidwide - ctx.t), drainable = reaverDrainOk(k);
    if (drainable && reaverWound(k)) return I(k, 'drain');
    if (drainable && toHit > 0 && toHit < 0.8) return null;
    if (gorge > 0) {
      const left = k.remaining('gorge'), must = left <= gorge * G + 0.4;
      const busterIn = toBust < left - 0.4 && toBust > 0;
      if (must || (bank >= mx * 0.03 && !(busterIn && gorge === 1 && toBust > 0.2))) return I(k, 'drain');
      return I(k, 'hack');
    }
    for (const id of ['deathless', 'throes', 'roar']) if (k.has(id) && (bank >= mx * 0.15 || k.remaining(id) < G + 0.3)) return I(k, 'drain');
    const pooling = ctx.burstSoon(ctx.t) || k.cdRemaining(abOf(k, 'frenzy')) < 6;
    // (Undying turns the buster into Blood and makes Drains free: empty the gauge before it, or that Blood spills)
    const undyingNext = abOf(k, 'undying').id === 'undying' && k.cdRemaining(abOf(k, 'undying')) < toBust && toBust < 7;
    const holdForBuster = toBust < 5 && k.g.blood < 80 && !undyingNext;
    if (k.g.blood >= 40 && (bank > mx * 0.28 || undyingNext || (k.g.blood >= 75 && !pooling && !holdForBuster) || (k.g.blood >= 90))) return I(k, 'drain');
    return I(k, 'hack');
  },
  runeguard(k, ctx) {
    const toBuster = ctx.nextBuster - ctx.t, toRw = ctx.nextRaidwide - ctx.t;
    if (ready(k, 'overload') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'overload');
    if (toBuster < 0.6 && toBuster > 0.1 && ready(k, 'mirror')) return I(k, 'mirror');
    // Whirling Runes (a talent in Sanctum's place): three Runes into blades instead of a Glyph Burst
    if (abOf(k, 'sanctum').id === 'whirl' && ready(k, 'sanctum') && k.g.runes >= 3 && weaveOk(k) && Math.min(toBuster, toRw) > 6) return I(k, 'sanctum');
    // Sanctum just before the Ward for a raidwide (a Ward a raidwide won't break all the way): sanctified, it keeps its Rune
    if (abOf(k, 'sanctum').id === 'sanctum' && ready(k, 'sanctum') && weaveOk(k) && toRw < 3.4 && toRw > 0.6 && k.g.runes >= 1 && !ctx.state.shield) return I(k, 'sanctum');
    if (k.gcdRemaining() > 0.0001) return null;
    const wardFor = (toBuster < 3 && toBuster > 0.3) || (toRw < 3 && toRw > 0.3);
    if (wardFor && (k.g.runes >= 1 || k.has('foreseen')) && !ctx.state.shield) return I(k, 'ward');   // (Foreseen Ward: a cast seen coming makes the next one free)
    const glyphAt = k.has('counter') ? 1 : 3;   // (Counterstroke: a single Rune after a reflect)
    if (k.g.runes >= glyphAt && !(ctx.burstSoon(ctx.t) && k.g.runes < glyphAt)) {
      // keep a rune for the next planned ward if it's close
      const nextNeed = Math.min(toBuster, toRw);
      if (nextNeed < 6 && nextNeed > 3) return I(k, 'strike');
      return I(k, 'glyph');
    }
    return I(k, 'strike');
  },
  // Ranger: pool Focus to 100 and bank two Keen Eyes before Hunter's Mark (Rapid Fire is half price in it, and a banked
  // Keen cashed there readies Barrage again); Cloak for its Focus inside the Mark; Sharpshooter hard-casts Aimed Shot at
  // 5 Steady Aim; Venomstrike bursts a full jar
  ranger(k, ctx) {
    const inMark = k.has('markself'), markCd = k.cdRemaining(abOf(k, 'mark'));
    const pooling = !inMark && (markCd < 9 || ctx.burstSoon(ctx.t));
    if (ready(k, 'mark') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'mark');
    if (ready(k, 'barrage') && weaveOk(k) && (inMark || markCd > 25)) return I(k, 'barrage');
    if (ready(k, 'cloak') && weaveOk(k) && inMark && k.g.focus <= 60) return I(k, 'cloak');
    if (weaveOk(k) && ready(k, 'rapid') && (inMark || (pooling ? k.g.focus >= 100 && markCd > 3 : k.g.focus >= 90))) return I(k, 'rapid');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const p = abOf(k, 'pierce'), spec = k.def.spec, keen = k.stacks('keen');
    if (k.has('barrage')) return I(k, 'quick');
    if (spec === 'venomstrike') {
      if (k.charges(p) > 0 && (k.g.acid >= 8 || (k.charges(p) === 2 && k.g.acid >= 3 && k.cd[p.id].next === 0) || (keen >= 2 && !pooling && k.g.acid >= 5) || (pooling && k.g.focus >= 95 && k.g.acid >= 5))) return I(k, 'pierce');
      return I(k, 'quick');
    }
    if (keen && ready(k, 'pierce') && (inMark ? keen >= 2 || k.remaining('markself') < 2.5 : keen >= 2 && (!pooling || markCd > 3) || (!pooling && markCd > 20))) return I(k, 'pierce');
    if (pooling && k.g.focus >= 95 && k.charges(p) > 0 && !keen && (spec !== 'sharpshooter' || castOk(k, ctx, 2))) return I(k, 'pierce');   // (no Focus past 100)
    // (inside the Mark a Sharpshooter keeps to instant shots while it has Focus for Rapid Fire: a 2s cast leaves no room to weave)
    if (spec === 'sharpshooter' && inMark && !keen && k.g.focus >= 25) return I(k, 'quick');
    if (spec === 'sharpshooter' && !keen && k.charges(p) > 0 && k.stacks('aim') >= 5 && castOk(k, ctx, 2)) return I(k, 'pierce');
    if (!keen && (k.charges(p) === 2 || (k.charges(p) === 1 && k.cdRemaining(p) === 0 && k.cd[p.id].next - k.now < 2.5))) return spec === 'sharpshooter' && !castOk(k, ctx, 2) ? I(k, 'quick') : I(k, 'pierce');
    if (inMark && k.charges(p) > 0 && (spec !== 'sharpshooter' || castOk(k, ctx, 2))) return I(k, 'pierce');
    return I(k, 'quick');
  },
  // Shadowblade: enter Shadow Dance at 5 points (the first finisher keeps them), Smoke Bomb inside the Dance (it runs
  // 3s longer); a Bladedancer lands every finisher at exactly 5 (Blade Fury tops 4 up to 5) for Tempo and its Flourish
  shadowblade(k, ctx) {
    const danceCd = k.cdRemaining(abOf(k, 'dance')), dancer = k.def.spec === 'bladedancer';
    if (ready(k, 'dance') && ctx.inBurst(ctx.t) && weaveOk(k) && (k.g.combo >= 5 || ctx.t % BURST_EVERY > 4)) return I(k, 'dance');
    // Death Blossom (a talent in Smoke Bomb's place): from empty, in the burst
    if (abOf(k, 'smoke').id === 'blossom' && ready(k, 'smoke') && weaveOk(k) && k.g.combo <= 1 && (ctx.inBurst(ctx.t) || k.cdRemaining(abOf(k, 'dance')) > 20)) return I(k, 'smoke');
    if (abOf(k, 'smoke').id === 'smoke' && ready(k, 'smoke') && weaveOk(k) && k.has('dance')) return I(k, 'smoke');
    const step = abOf(k, 'step');
    if (dancer) {
      if (weaveOk(k) && k.charges(step) > 0 && (k.stacks('tempo') >= 3 || (k.g.combo === 4 && !k.g.spilled))) return I(k, 'step');
    } else if (weaveOk(k) && k.charges(step) > 0 && (k.charges(step) === 2 || ctx.isMoveWindow(ctx.t))) return I(k, 'step');
    if (k.gcdRemaining() > 0.0001) return null;
    // pool to 5 for the Dance
    const rupture = abOf(k, 'venom').id === 'rupture';
    const pool = !k.has('dance') && (ready(k, 'dance') || danceCd < 2.5 || (ctx.burstSoon(ctx.t) && danceCd < 6));
    if (pool && k.g.combo >= 5) return rupture ? null : I(k, 'venom');
    if (rupture ? k.g.combo >= 4 && k.dotRemaining('rupture') < 3 : k.dotRemaining('poison') < 7) return I(k, 'venom');
    if (dancer && k.g.combo === 4 && !k.g.spilled && k.charges(step) > 0) return I(k, 'step');
    if (k.g.combo >= 5 || (k.g.combo >= 4 && !pool)) { ctx.setPos(abOf(k, 'evis').id === 'backstab' ? 'rear' : 'flank'); return I(k, 'evis'); }   // Nightstalker's Backstab wants the back
    ctx.setPos('rear');
    return I(k, 'strike');
  },
  pyromancer(k, ctx) {
    const fb = abOf(k, 'fireblast');
    // (never a Fire Blast that, with the cast under way, would burn you)
    const pend = k.cast ? (k.cast.ab.id === 'fireball' ? 12 : 20) : 0, fbSafe = k.g.heat + 6 + pend < 100;
    // Fire Blast converts Heating Up into Hot Streak (also mid-cast)
    if (k.has('heating') && fbSafe && k.charges(fb) > 0 && k.readyIn(fb) <= 0.0001) return I(k, 'fireblast');
    if (k.has('combust') && fbSafe && k.charges(fb) > 0 && k.readyIn(fb) <= 0.0001 && !k.has('hotstreak')) return I(k, 'fireblast');
    if (k.charges(fb) === 2 && fbSafe && k.readyIn(fb) <= 0.0001 && !k.cast && weaveOk(k) && !k.has('hotstreak')) return I(k, 'fireblast');
    if (ready(k, 'combust') && ctx.inBurst(ctx.t) && !k.cast && (weaveOk(k) || (k.gcdRemaining() <= 0.0001 && abOf(k, 'combust').id === 'combust'))) return I(k, 'combust');
    // Firestep (a talent in Smolder's place): just before a mechanic moves you, for an instant Fireball on the way
    if (abOf(k, 'smolder').id === 'firestep' && ready(k, 'smolder') && weaveOk(k) && k.g.heat <= 80 && (ctx.moveSoon(ctx.t, 1.5) || ctx.state.moving)) return I(k, 'smolder');
    // White-Hot: top Heat up past 90 with a Fire Blast for the Vent, and Smolder (its Heat into the party's shields)
    // rather than burn
    const ventIn = k.readyIn(abOf(k, 'vent'));
    if (k.g.heat >= 84 && k.g.heat < 90 && ventIn < 0.5 && k.charges(fb) > 0 && k.readyIn(fb) <= 0.0001 && !k.has('heating') && !k.has('hotstreak') && weaveOk(k)) return I(k, 'fireblast');
    // Smolder: Heat can't boil over for 10s, so ride it at 99 through Combustion (or when Vent is far off)
    if (abOf(k, 'smolder').id === 'smolder' && ready(k, 'smolder') && weaveOk(k) && k.g.heat >= 70 && (k.has('combust') || (k.g.heat >= 87 && ventIn > 4))) return I(k, 'smolder');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const moving = ctx.state.moving || ctx.isMoveWindow(ctx.t + 1.4);
    if (k.has('hotstreak') && k.g.heat >= 90 && ready(k, 'vent')) return I(k, 'vent');
    if (k.has('hotstreak')) return I(k, 'pyro');
    // Cataclysm: Vent while a Meteor falls (it lands at once, the Heat in its crater)
    if (k.g.meteors && k.g.meteors.length && ready(k, 'vent') && k.g.heat >= 70) return I(k, 'vent');
    if (k.g.heat >= 90 && ready(k, 'vent')) return I(k, 'vent');
    if (k.g.heat >= 84 && ready(k, 'vent') && (k.charges(fb) === 0 || moving)) return I(k, 'vent');
    if (moving && (k.has('firestep') || k.has('haze')) && k.g.heat <= 88) return I(k, 'fireball');   // an instant Fireball (talents)
    if (moving) { if (ready(k, 'vent') && k.g.heat >= 30) return I(k, 'vent'); return null; }
    if (k.g.heat >= 87.5 && !(k.has('smoulder') && k.remaining('smoulder') > 2)) return ready(k, 'vent') ? I(k, 'vent') : null; // don't overheat
    return castOk(k, ctx, 1.8) ? I(k, 'fireball') : null;
  },
  cleric(k, ctx) {
    const debt = ctx.state.healDebt;
    if (debt > 5000 && ready(k, 'prayer') && weaveOk(k)) return I(k, 'prayer');
    if (abOf(k, 'bene').target === 'enemy' ? ready(k, 'bene') && weaveOk(k) : debt > 6000 && ready(k, 'bene') && weaveOk(k)) return I(k, 'bene');   // Inquisitor's Condemn is an attack
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    // an instant Smite (Open Verdict) is pressed while moving too
    if (k.has('opened') && k.g.bloom < 3) return I(k, 'smite');
    // Bloom of Dawn (a talent in Intervention's place): a pile of Petals into one big heal
    if (abOf(k, 'intervene').id === 'dawnbloom' && ready(k, 'intervene') && k.g.petals >= 2 && debt > 8000) { ctx.state.gcdHeals++; return I(k, 'intervene'); }
    // (Dawnstar waits for the burst, unless the next Petal or Mend would spill past it)
    if (k.g.bloom >= 3 && (ctx.inBurst(ctx.t) || ctx.state.moving || (!ctx.burstSoon(ctx.t) && ((k.g.petals >= 1 && debt > 2500) || debt > 14000)))) return I(k, 'smite');
    if (k.g.petals >= 1 && (debt > 2500 || k.g.petals >= 3 || ctx.state.moving)) return I(k, 'petal');
    if (debt > 14000) { ctx.state.gcdHeals++; return castOk(k, ctx, 1.8) ? I(k, 'mend') : null; }
    if (ctx.state.moving) return null;
    return castOk(k, ctx, 1.5) || k.g.bloom >= 3 ? I(k, 'smite') : null;
  },
  grovekeeper(k, ctx) {
    const debt = ctx.state.healDebt;
    if (ready(k, 'growth') && (debt > 6000 || ctx.t < 2) && weaveOk(k)) return I(k, 'growth');
    if (ready(k, 'bloom') && weaveOk(k) && (k.g.bloom >= 90 || debt > 7000)) return I(k, 'bloom');
    // Treant (a talent in Thornlash's place) on cooldown
    const treant = abOf(k, 'thorn').id === 'treant';
    if (treant && ready(k, 'thorn') && weaveOk(k)) return I(k, 'thorn');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    // Seed of Renewal (a talent in Rebirth's place) when Bloom is spare and the party is hurting
    if (abOf(k, 'rebirth').id === 'seed' && ready(k, 'rebirth') && k.g.bloom >= 60 && debt > 6000) { ctx.state.gcdHeals++; return I(k, 'rebirth'); }
    if (treant) { if (ctx.state.moving) return k.has('awaken') ? I(k, 'wrath') : null; }
    else if (k.dotRemaining('thorn') < 9 || ctx.state.moving) return I(k, 'thorn');
    if (!k.g.rejuvs.length && (debt > 2000 || ctx.nextRaidwide - ctx.t < 6)) { ctx.state.gcdHeals++; return I(k, 'rejuv'); }
    if (debt > 12000) { ctx.state.gcdHeals++; return I(k, 'rejuv'); }
    if (k.has('awaken')) return I(k, 'wrath');
    return castOk(k, ctx, 1.5) ? I(k, 'wrath') : null;
  },
  chronomancer(k, ctx) {
    const debt = ctx.state.healDebt;
    if (debt > 9000 && k.charges(abOf(k, 'rewind')) > 0 && weaveOk(k)) return I(k, 'rewind');
    if (ready(k, 'accel') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'accel');
    const toRw = ctx.nextRaidwide - ctx.t;
    // Time Bubble (a talent in Stasis's place) on the tank before a buster
    if (abOf(k, 'stasis').id === 'bubble' && ready(k, 'stasis') && k.g.flux >= 50 && ctx.nextBuster - ctx.t < 2 && weaveOk(k)) return I(k, 'stasis');
    // Stasis: start holding the Bolts' heals just before a raidwide, release them once it has landed
    if (abOf(k, 'stasis').id === 'stasis' && ready(k, 'stasis') && weaveOk(k) && (k.g.stash ? toRw > 26 && toRw < 29 : toRw < 4)) return I(k, 'stasis');
    if (ready(k, 'shift') && (weaveOk(k) || (k.g.stance === 'haste' && k.g.flux < 6))) {
      if (k.g.stance === 'slow' && k.g.flux >= 95) return I(k, 'shift');
      if (k.g.stance === 'slow' && k.g.flux >= 50 && (ctx.inBurst(ctx.t) || toRw < 2)) return I(k, 'shift');
      if (k.g.stance === 'haste' && k.g.flux < 12) return I(k, 'shift');   // (Paradox: before the Flux runs dry)
    }
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    if (debt > 16000 && ready(k, 'recall') && castOk(k, ctx, 2.5)) { ctx.state.gcdHeals++; return I(k, 'recall'); }
    return castOk(k, ctx, 1.5 * k.hasteMult()) || k.has('surge') ? I(k, 'bolt') : null;
  },
  // Alembist: keep a heal or two in stock, otherwise brew bombs and throw them ripe; Catalyst for Reactions on cooldown
  alembist(k, ctx) {
    const debt = ctx.state.healDebt, A = k.def.alem, vials = k.g.vials, vol = !!A.fuse;
    const room = vials.length < A.slots, cat = abOf(k, 'distill').id === 'catalyst';
    ctx.state.aimHp = null;
    const weave = k.gcdRemaining() > 0.2 && !k.cast;   // the short reagent GCD leaves a quarter second to weave
    if (cat) { if (ready(k, 'distill') && !k.g.half.length && room && weave) return I(k, 'distill'); }
    else if (ready(k, 'distill') && room && !k.g.half.length && weave) return I(k, 'distill');
    const batch = abOf(k, 'batch');
    if (batch.id === 'blend') { if (ready(k, 'batch') && vials.length >= A.slots && weave) return I(k, 'batch'); }
    else if (ready(k, 'batch') && k.g.last && vials.length <= 1 && weave && ((alemInfo(k.g.last).kind === 'bomb' && ctx.inBurst(ctx.t)) || (alemInfo(k.g.last).kind === 'heal' && debt > 10000))) return I(k, 'batch');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    // which vial goes: a pro marks it with its number key (kits.js alemMark), and aims a cure at someone hurt
    const want = j => { alemMark(k, j); ctx.state.aimHp = alemIsBomb(vials[j]) ? 1 : 0.5; return I(k, 'throw'); };
    if (vials.length) {
      const ripe = v => alemStrength(k, v) >= 1 + ALEMBIC.GROW - 0.001;
      let h = -1; vials.forEach((v, j) => { if (alemIsHeal(v) && (h < 0 || alemStrength(k, v) > alemStrength(k, vials[h]) + 0.001)) h = j; });
      if (h >= 0 && debt > 5000) return want(h);
      const fuse = vials.findIndex(v => v.fuse && v.fuse - k.now < 1.3); if (fuse >= 0) return want(fuse);
      const rb = vials.findIndex(v => !alemIsHeal(v) && ripe(v)); if (rb >= 0) return want(rb);
      if (!room) return want(0);
    }
    if (!room) return null;
    const need = k.has('catalyst') ? 3 : 2;
    if (!k.g.half.length || !k.g.plan || k.g.plan.length !== need) {
      const healer = debt > 7000 && alemHealStock(k) < 2;
      k.g.plan = need === 3 ? (healer ? 'DDD' : 'EEE') : (healer ? 'DD' : 'EE');
    }
    const letter = k.g.plan[k.g.half.length] || 'E';
    return I(k, { E: 'ember', D: 'dew', S: 'salt', Q: 'salt' }[letter]);
  },
};

// ---------------------------------------------------------------- advanced classes (Thermist, Driftblade)
// LAMP_SIM: the host's lanterns (fight.js LANTERNS) as the simulator sees them. The party stands round the middle
// (0, 0) where the healer stands too, so a lantern set there catches most of it (the wider the glow, the more of the
// four); one set while the healer was away (999, 0) catches nobody. A hand lantern reaches its ally and now and then a
// second one, the floating lanterns about one and a half, Lighthouse all four.
const LAMP_SIM = {
  inGlow(l) {
    if (l.all) return 4;
    if (l.on === 'c') return 1.2;
    if (l.on != null) return 1.4;
    return Math.hypot(l.x, l.y) <= l.r ? Math.min(3.6, 1 + l.r / 55) : 0;
  },
  add(state, amt) { state.healing += amt; state.eff += Math.min(state.healDebt, amt); state.healDebt = Math.max(0, state.healDebt - amt); },
  tick(state, k) {
    if (state.t < (state.lampNext || 1)) return;
    state.lampNext = (state.lampNext || 1) + 1;
    let n = 0, c = 0;
    for (const l of state.lamps) {
      const m = LAMP_SIM.inGlow(l);
      LAMP_SIM.add(state, l.h * m + (l.ln && m ? l.h * 0.3 : 0) + (l.hh ? l.hh / 6 * m * 0.6 : 0));
      n += m; c = Math.max(c, m);
    }
    if (state.lamps.length) k.notify('lit', { n, c: Math.round(c) });
  },
  event(state, ev) {
    if (ev.op === 'relight') { LAMP_SIM.add(state, ev.amount || 0); return; }
    for (const l of state.lamps || []) {
      if (ev.lid != null && l.id !== ev.lid) continue;
      const m = ev.all ? 4 : LAMP_SIM.inGlow(l);
      LAMP_SIM.add(state, (ev.amount || 0) * m * (ev.full ? 0.6 : 1) + (ev.sh || 0) * m * (ev.full ? 0.3 : 0.6));
    }
  },
};

// MOVERS: classes whose damage depends on how they move get a path every tick (state.moving, state.inBody: running
// through the target right now, state.posFn: where they are, for circles and straight lines).
const MOVERS = {
  // a Wayfarer pro keeps walking a slow loop through the party, so its small lights fall where everyone stands
  lanternkeeper(state, skill, human, specId) {
    if (specId !== 'wayfarer' || skill !== 'pro' || state.away) { state.posFn = null; return; }
    state.moving = true;
    state.posFn = tt => ({ x: Math.cos(tt * 0.8) * 40, y: Math.sin(tt * 0.8) * 40 });
  },
  driftblade(state, skill, human, specId) {
    const t = state.t;
    if (skill === 'pro') {
      // a pro never stops: Orbit circles close round the boss (cutting through it now and then), Comet runs long
      // straight lines through it, the base kit weaves back and forth through its body
      state.moving = true;
      if (specId === 'orbit') { state.posFn = tt => ({ x: Math.cos(tt * 2.1) * 105, y: Math.sin(tt * 2.1) * 105 }); state.inBody = t % 4.5 < 0.12; }
      else if (specId === 'comet') { const leg = 2.8; state.posFn = tt => { const q = (tt % (leg * 2)) / leg; return { x: (q < 1 ? q : 2 - q) * 640 - 320, y: 0 }; }; state.inBody = Math.abs((t % 2.8) - 1.4) < 0.07; }
      else { state.posFn = tt => ({ x: Math.sin(tt * 1.3) * 140, y: 0 }); state.inBody = t % 3.2 < 0.12; }
      return;
    }
    // a newbie remembers to keep moving about half the time, and runs through the boss now and then
    if (state.walkBlock !== Math.floor(t)) { state.walkBlock = Math.floor(t); state.walkOn = human() < 0.65; }
    state.moving = state.moving || state.walkOn;
    state.posFn = tt => ({ x: Math.sin(tt * 0.9) * 160, y: Math.cos(tt * 0.6) * 60 });
    state.inBody = state.moving && t % 7 < 0.12;
  },
  // Marionettist (classes-c): stands off the boss so the Doll's far-side station is in reach and the line crosses it. A
  // mechanic now and then lands on the Doll (a String): a pro rarely lets it, a newbie often does, and a newbie also
  // drifts too far back now and then (the Doll slides round to a flank and Cross-Cut misses)
  marionettist(state, skill, human) {
    const t = state.t;
    if (skill === 'pro') { state.posFn = () => ({ x: -160, y: 0 }); if (state.hitBlock !== Math.floor(t / 45)) { state.hitBlock = Math.floor(t / 45); state.dollHitAt = t + 10 + human() * 30; } }
    else {
      if (state.walkBlock !== Math.floor(t / 6)) { state.walkBlock = Math.floor(t / 6); state.farOff = human() < 0.35; }
      state.posFn = () => ({ x: state.farOff ? -250 : -165, y: state.farOff ? 90 : 0 });
      if (state.hitBlock !== Math.floor(t / 15)) { state.hitBlock = Math.floor(t / 15); state.dollHitAt = t + human() * 15; }
    }
    if (state.dollHitAt != null && t >= state.dollHitAt) { state.dollHitAt = null; state.kit.notify('dollhit', { i: 0 }); }
  },
  // Threadweaver: every mechanic that moves the party pulls a thread apart
  threadweaver(state) {
    const block = Math.floor(state.t / MOVE_EVERY);
    if (state.t > 5 && state.snapBlock !== block) { state.snapBlock = block; if (state.kit.g.n) state.kit.notify('snapped', {}); }
  },
};
const thermStepOf = (k, id) => {
  // the element and dial change of a Thermist spell right now (for the planner): el +1 fire / -1 frost
  const t = k.g.temp, sb = k.def.stepBonus || 0, ab = abOf(k, id);
  if (!ab) return null;
  if (ab.id === 'thermocline') { const el = t > 0 ? -1 : t < 0 ? 1 : -1; return { el, to: t + el * (2 + sb) }; }
  if (ab.id === 'zero') return { el: -1, to: -5, safe: true };
  const el = id === 'cinder' || id === 'flare' ? 1 : -1, big = id === 'flare' || id === 'lance';
  if (big && thermEdgeCast(k, el)) return { el, to: t, edge: true };
  return { el, to: t + el * ((big ? 2 : 1) + sb) };
};
function thermOverloads(k, id) {
  const s = thermStepOf(k, id);
  if (!s) return true;
  const brink = k.has('brink') ? k.buffs.get('brink').data.el : 0;
  if (brink && brink === s.el) return true;
  if (s.safe || s.edge) return false;
  return Math.abs(s.to) > 5 && !k.def.redline;
}
Object.assign(PRO, {
  thermist(k, ctx) {
    const t = k.g.temp;
    // Inversion at the edge: a swing of 10, half again as strong (in a burst window when one is close)
    // Controlled Meltdown (a talent in Inversion's place): let go with the Strain well up
    if (abOf(k, 'invert').id === 'meltdown') { if (ready(k, 'invert') && weaveOk(k) && (k.g.strain || 0) >= 60) return I(k, 'invert'); }
    else if (ready(k, 'invert') && weaveOk(k) && Math.abs(t) >= 5 && (ctx.inBurst(ctx.t) || (ctx.t % BURST_EVERY) < 40)) return I(k, 'invert');
    // Dead Centre (a Pendulum talent): Equilibrium keeps the Momentum alive when it is about to lapse
    if (k.talent('thermist_deadcentre') && ready(k, 'equil') && weaveOk(k) && k.stacks('momentum') >= 2 && k.remaining('momentum') < 2.5) return I(k, 'equil');
    // Zenith: vent Strain before it melts you down, without leaving the edge
    if (k.def.redline && ready(k, 'equil') && weaveOk(k) && k.g.strain >= 50 && Math.abs(t) >= 5) return I(k, 'equil');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const plan = thermPlan(k), dir = plan === 'cinder' || plan === 'flare' ? 1 : -1;
    // Absolute Zero from high up is a swing of up to 10
    if (abOf(k, 'rime').id === 'zero' && ready(k, 'rime') && t >= 3 && castOk(k, ctx, k.castTime(abOf(k, 'rime')))) return I(k, 'rime');
    const order = [plan, dir > 0 ? 'cinder' : 'rime', dir > 0 ? 'flare' : 'lance', 'rime', 'cinder', 'lance', 'flare'];
    for (const id of [...new Set(order)]) {
      const ab = abOf(k, id);
      if (!ab || ab.id === 'zero' || !k.usable(ab) || k.readyIn(ab) > 0.0001 || thermOverloads(k, id)) continue;
      // Thermocline swings away from the side you're on: only when that's the way the plan goes
      if (ab.id === 'thermocline' && (thermStepOf(k, id).el !== dir || Math.abs(t) < 1)) continue;
      const ct = k.castTime(ab);
      if (ct > 0 && !castOk(k, ctx, ct)) continue;
      return I(k, id);
    }
    return null;
  },
  driftblade(k, ctx) {
    const slip = abOf(k, 'slip'), full = driftMax(k);
    // (Starfall, the Comet's spec-row move in Gale Run's place, goes off on a big charge; Roost and Gale Run in the burst)
    if (abOf(k, 'gale').id === 'starfall') { if (ready(k, 'gale') && weaveOk(k) && k.g.drift >= 150) return I(k, 'gale'); }
    else if (ready(k, 'gale') && weaveOk(k) && (ctx.inBurst(ctx.t) || (ctx.t % BURST_EVERY) < 30)) return I(k, 'gale');
    if (ready(k, 'hook') && weaveOk(k) && (k.g.drift >= 70 || (abOf(k, 'hook').id === 'gyre' && (k.g.drift >= 75 || k.charges(abOf(k, 'hook')) === 2)))) return I(k, 'hook');
    if (weaveOk(k) && k.charges(slip) > 0 && (k.charges(slip) === 2 || k.g.drift < full * 0.6)) return I(k, 'slip');
    if (abOf(k, 'still').id === 'tailspin' && ready(k, 'still') && weaveOk(k)) return I(k, 'still');
    if (k.gcdRemaining() > 0.0001) return null;
    const cross = abOf(k, 'cross');
    if (k.usable(cross) && k.readyIn(cross) <= 0.0001 && (k.g.drift >= full * 0.92 || (ctx.inBurst(ctx.t) && k.g.drift >= full * 0.7))) return I(k, 'cross');
    return I(k, 'carve');
  },
});

// ---------------------------------------------------------------- advanced tanks (Gorgemaw, Oathbroker)
// TANK_SIM stands in for the host: the Gorgemaw's jaw (an edible telegraph lands on the tank every EDIBLE_EVERY s, on
// top of the busters; the tank dodges it unless the jaw is open) and the Oathbroker's Ledger (OATH, the host's rules).
const EDIBLE_EVERY = 12, EDIBLE_DMG = 6500;
const TANK_SIM = {
  emit(state, k, ev) {
    if (ev.type === 'maw') { state.mawUntil = state.t + ev.dur; state.mawAll = !!ev.all; return true; }
    if (ev.type === 'ledger') {
      const L = state.led || (state.led = OATH.make());
      if (ev.op === 'terms') OATH.terms(L, ev, 32000);
      else if (ev.op !== 'cosign') { const r = OATH.op(L, ev, state.t, 32000); if (r.self) state.tookDamage.push({ t: state.t, a: r.self }); k.stats.damage += r.boss; }
      k.notify('ledger', OATH.pack(L, state.t));
      return true;
    }
    return false;
  },
  hit(state, k, amt, kind) {
    if (k.def.eats && state.t < (state.mawUntil || 0)) {
      if (kind === 'raidwide') { if (state.mawAll) { k.notify('eat', { m: 'ring' }); return amt * 0.5; } }
      else if (kind !== 'auto') { k.notify('eat', { m: kind === 'buster' ? 'spike' : kind }); return amt * 0.25; }
    }
    if (k.def.ledger && state.led) amt -= OATH.write(state.led, amt, state.t);
    return amt;
  },
  tick(state, k, hitTank) {
    if (k.def.eats) {
      if (state.nextEdible == null) state.nextEdible = 6;
      if (state.t >= state.nextEdible) {
        const m = ['ring', 'lance', 'fang'][Math.floor(state.t / EDIBLE_EVERY) % 3];
        state.nextEdible += EDIBLE_EVERY;
        if (state.t < (state.mawUntil || 0)) hitTank(EDIBLE_DMG, m);   // dodged otherwise
      }
    }
    const L = state.led;
    if (L) {
      const bills = OATH.bills(L, state.t, DT);
      for (const b of bills) { state.tookDamage.push({ t: state.t, a: b.self }); k.stats.damage += b.boss; }
      // (a bill billed to you rides on the notice, as the host sends it: Compound Interest reads it)
      const billed = bills.reduce((s, b) => s + b.self, 0);
      if (bills.length || state.t - (state.ledAt || 0) > 1) { state.ledAt = state.t; k.notify('ledger', billed > 0 ? Object.assign(OATH.pack(L, state.t), { bill: Math.round(billed) }) : OATH.pack(L, state.t)); }
    }
  },
};
Object.assign(PRO, {
  // Gorgemaw: the jaw open just before every buster and edible hit (Bottomless on raidwides), Spit what you eat
  // (pairs together for the Glutton), Digest when the Belly is full and nothing is about to land, Iron Gut on busters
  gorgemaw(k, ctx) {
    const s = ctx.state, toB = ctx.nextBuster - ctx.t, toE = (s.nextEdible ?? 6) - ctx.t, toR = ctx.nextRaidwide - ctx.t;
    const wide = abOf(k, 'wide'), max = mawMax(k), b = k.g.belly;
    if (ready(k, 'bottomless') && toR < 0.5 && toR > 0.05) return I(k, 'bottomless');
    if (k.charges(wide) > 0 && k.readyIn(wide) <= 0.0001 && !(ctx.t < (s.mawUntil || 0)) && ((toB < 0.5 && toB > 0.05) || (toE < 0.5 && toE > 0.05))) return I(k, 'wide');
    // Iron Gut just before a tankbuster (Digest inside it counts twice), then Digest what's in the Belly as the buster
    // comes, so the Spike Open Wide eats next is spat back with the acid
    const gut = abOf(k, 'iron').id === 'iron', spikeNext = toB < 2.4 && toB > 0.4 && k.charges(wide) > 0;
    if (gut && ready(k, 'iron') && weaveOk(k) && spikeNext && b.length) return I(k, 'iron');
    if (toB < 1.2 && ready(k, 'iron') && gut && k.charges(wide) === 0) return I(k, 'iron');
    if (abOf(k, 'iron').id === 'stonebelly' && ready(k, 'iron') && toB < 1.2) return I(k, 'iron');
    if (weaveOk(k) && ready(k, 'digest') && b.length && spikeNext && !(k.def.spec === 'gizzard' && b.length < 2 && !k.has('irongut'))) return I(k, 'digest');
    if (weaveOk(k) && ready(k, 'digest') && (k.def.spec === 'gizzard' ? b.length >= 2 && (toR < 4 || toB < 4 || b.length >= max) : b.length >= max && k.gcdRemaining() > 0.7)) return I(k, 'digest');
    if (k.gcdRemaining() > 0.0001) return null;
    const spit = abOf(k, 'spit');
    // (a Morsel or two kept for the Digest before a tankbuster, when it'll be ready)
    const keep = toB < 7 && toB > 0.4 && b.length <= 2 && b.length < max && k.cdRemaining(abOf(k, 'digest')) < toB - 0.5 && !k.has('acid');
    if (spit.id === 'regurgitate') { if (b.length >= Math.min(3, max) && k.usable(spit)) return I(k, 'spit'); }
    else if (k.usable(spit) && k.has('acid') && b.length && b[0].m === 'spike') return I(k, 'spit');
    else if (k.usable(spit) && k.def.spec !== 'gizzard' && !keep && (k.def.fuse ? (b.length >= 2 && b[0].m === b[1].m) || b.length >= max || (b.length && ctx.inBurst(ctx.t)) : b.length >= 1)) return I(k, 'spit');
    else if (k.usable(spit) && k.def.spec === 'gizzard' && (b.length >= max || (k.has('acid') && b.length))) return I(k, 'spit');
    return I(k, 'gnash');
  },
  // Oathbroker: Lien in the burst window (Co-Sign kept up), Writ on busters, Renegotiate a big bill that's about to
  // land, Settle at a fifth of your HP, Default (Foreclose) when the Ledger gets heavy
  oathbroker(k, ctx) {
    const hp = 32000, toB = ctx.nextBuster - ctx.t, tot = oathTotal(k);
    const lien = abOf(k, 'lien');
    if (lien.id === 'cosign') { if (ready(k, 'lien') && weaveOk(k)) return I(k, 'lien'); }
    // (Lien waits, inside the burst, for a tankbuster about to land: its bill then comes due under the Lien)
    else if (ready(k, 'lien') && weaveOk(k) && (oathDueSoon(k, 9.5) > hp * 0.15 || (ctx.inBurst(ctx.t) && !(toB > 0 && toB < 9) && ctx.t % BURST_EVERY > 0) || (ctx.inBurst(ctx.t) && ctx.t % BURST_EVERY > BURST_LEN - 3))) return I(k, 'lien');
    const def = abOf(k, 'default'), reneg = abOf(k, 'reneg').id === 'reneg';
    // (Writ is kept off a tankbuster you mean to Default or Foreclose on: the full bill is the blow)
    // (Warrant, a Collector's spec-row move in Writ's place, goes off in the burst instead)
    if (abOf(k, 'writ').id === 'warrant') { if (ready(k, 'writ') && weaveOk(k) && ctx.inBurst(ctx.t)) return I(k, 'writ'); }
    else if (toB < 1 && ready(k, 'writ') && !(k.cdRemaining(def) < 4)) return I(k, 'writ');
    const plain = k.g.ledger.filter(e => !e.rn).reduce((s, e) => s + e.a, 0);
    // Renegotiate as a setup: a big Ledger about to be torn up is renegotiated first (Default strikes for those lines
    // in full, Foreclose at 1.5x), and lines about to fall due just before Lien are pushed into it
    const defSoon = k.cdRemaining(def) < 2 && tot > hp * (def.id === 'foreclose' ? 0.28 : OATH.BIG + 0.01);
    if (reneg && ready(k, 'reneg') && weaveOk(k) && defSoon && plain > tot * 0.5) return I(k, 'reneg');
    if (reneg && ready(k, 'reneg') && weaveOk(k) && lien.id === 'lien' && !oathLien(k) && k.cdRemaining(lien) < 3 && oathDueSoon(k, 2.5) > hp * 0.05) return I(k, 'reneg');
    if (ready(k, 'default') && weaveOk(k) && tot > hp * (def.id === 'foreclose' ? 0.32 : OATH.BIG + 0.01) && (!reneg || plain < tot * 0.5 || k.cdRemaining(abOf(k, 'reneg')) > 3)) return I(k, 'default');
    if (ready(k, 'reneg') && weaveOk(k) && oathDueSoon(k, 1.2) > hp * 0.12) return I(k, 'reneg');
    // (the Ledger is left to grow for a Default that's nearly back)
    const hoard = def.id === 'default' && k.cdRemaining(def) < 10 && tot < hp * 0.5;
    if (ready(k, 'settle') && weaveOk(k) && def.id !== 'foreclose' && !hoard && (abOf(k, 'settle').id === 'audit' ? oathAuditable(k).reduce((s, e) => s + e.a, 0) > hp * 0.12 : tot > hp * 0.22)) return I(k, 'settle');
    if (k.gcdRemaining() > 0.0001) return null;
    return I(k, 'collect');
  },
});
// ---------------------------------------------------------------- Ironpalm (no GCD: the combo pacing, engine.js)
// The newbie is the generic one, which already fits: it waits for the recovery to end (it never buffers), reacts 0.1-0.6s
// late, follows the glowing key 60% of the time and otherwise presses Q, so its strings break now and then and few of
// its presses land Crisp. The pro reads tankbusters and autos (keeping Read for the buster when one is close), waits
// out each recovery so every press is Crisp, keeps the Bruise up, raises Tiger Wall before tankbusters, runs Rising
// Gate into Heaven's Drop (through Crane Step with Swallow's Return), cashes every Opening, and stops to breathe
// rather than run dry mid-string. Temple Bell (or its replacement) goes with the party's burst.
const IP_COST = { L: IP_INPUT.L.cost, H: IP_INPUT.H.cost, K: IP_INPUT.K.cost };
// The newbie mashes at its own pace (with the usual 0.25s reaction after each press that works, a press every 0.3-0.6s),
// so presses that come during a recovery are buffered and never Crisp. It follows the glowing key 60% of the time,
// otherwise presses Q, now and then a random key, and keeps pressing when it's out of Breath. oGCDs as every newbie:
// a little after they come up, Read included, so its Reads land on a hit only by luck.
Object.assign(NEWBIE, {
  ironpalm(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { ogcdSeen: {}, next: 0 });
    const gr = newbieGlowOgcd(k, ctx, 'read');   // (Read glows as a tankbuster comes in)
    if (gr != null) return gr < 0 ? null : gr;
    for (const ab of k.abilities) {
      if (ab.type !== 'ogcd' || k.baseId(ab) === 'read') continue;   // (Read only when it glows, as the floor says)
      if (!k.usable(ab) || k.readyIn(ab) > 0.0001) { n.ogcdSeen[ab.id] = null; continue; }
      if (n.ogcdSeen[ab.id] == null) n.ogcdSeen[ab.id] = ctx.t + 0.5 + ctx.human() * 2.5;
      if (ctx.t >= n.ogcdSeen[ab.id]) { n.ogcdSeen[ab.id] = null; return I(k, ab.id); }
    }
    if (ctx.t < n.next) return null;
    // the keys glow on the beat (as a recovery ends): 60% of the time it waits for the light and presses that key a
    // moment after it comes on; otherwise it mashes as before (Q, now and then a random key), and always while winded
    if (n.follow == null) { n.follow = ctx.human() < 0.6; n.since = ctx.t; n.seen = null; }
    const glow = [0, 1, 2].find(i => k.glows(k.abilities[i]));
    if (n.follow && !ipWinded(k) && ctx.t - n.since < 2) {
      if (glow == null) { n.seen = null; return null; }
      if (n.seen == null) n.seen = ctx.t + 0.1 + ctx.human() * 0.4;
      if (ctx.t < n.seen) return null;
    }
    n.follow = null;
    n.next = ctx.t + 0.05 + ctx.human() * 0.3;
    if (glow != null && n.seen != null) return glow;
    if (ctx.human() < 0.25) return Math.floor(ctx.human() * 3);
    return 0;
  },
});
Object.assign(PRO, {
  ironpalm(k, ctx) {
    const P = ctx.state.ip || (ctx.state.ip = { plan: null, resting: false });
    const toAuto = ctx.nextAuto - ctx.t, toBuster = ctx.nextBuster - ctx.t, read = abOf(k, 'read');
    const readUp = k.readyIn(read) <= 0.0001 || (read.charges && k.charges(read) > 0 && k.lockUntil - k.now < 0.05);
    const spare = !!read.charges && k.charges(read) === 2;
    // the next hit worth reading, and when it lands (an auto only when Read will be back for the next buster)
    const hitIn = toBuster < 0.6 ? toBuster : toAuto < toBuster && (spare || toBuster > 6.6 || k.has('pond') || k.has('offbal')) ? toAuto : toBuster;
    if (readUp && hitIn < 0.32 && hitIn > 0.02 && k.lockUntil <= k.now) return I(k, 'read');
    if (toBuster < 2.5 && ready(k, 'skin') && k.lockUntil <= k.now) return I(k, 'skin');
    const bell = abOf(k, 'bell');
    if (ready(k, 'bell') && k.lockUntil <= k.now && (ctx.inBurst(ctx.t) || bell.id === 'slide')) return I(k, 'bell');
    if (k.lockUntil > k.now) return null;   // wait out the recovery: the next press lands Crisp
    // don't start a press whose recovery would still be running when a hit worth reading lands
    const g = k.g, live = ipLive(k) ? g.str : '';
    const wantKey = () => {
      if (k.has('opening')) return 'H';
      if (!P.plan || !(P.plan.startsWith(live) && P.plan.length > live.length) || (!live && P.done)) {
        P.done = false;
        if (live && !g.clean) { const on = ipMoves(k).filter(e => e.seq.startsWith(live) && e.seq.length > live.length).sort((a, b) => b.seq.length - a.seq.length); P.plan = on.length ? on[0].seq : null; }
        else {
          const swallow = k.talent('ironpalm_swallow');
          const cost = s => [...s].reduce((a, x) => a + IP_COST[x] * (k.talent('ironpalm_clean') ? 0 : 0.6), 0);
          const main = swallow ? 'KLHKK' : 'LLHKK';
          if (toBuster < 7 && toBuster > 1.6 && !k.has('wall')) P.plan = 'HKK';
          else if (k.dotRemaining('bruise') < 2.5) P.plan = 'HHK';
          // Iron Ox while Read is cooling: it brings Read back and the auto read after it opens a free Thousand Palms
          else if (k.readyIn(read) > 2 && toBuster > 9 && !k.has('offbal') && !k.has('opening')) P.plan = 'HHH';
          else P.plan = main;
          if (g.breath < cost(P.plan) + 2) {
            // short of Breath: Flowing Palms in rhythm breathes without stopping (Crisp, finished under 40: Breath back)
            if (g.breath >= cost('LLL') + 1 && !k.talent('ironpalm_clean')) P.plan = 'LLL';
            else if (g.breath >= cost('KL') && !swallow) P.plan = 'KL';
            else { P.resting = true; P.plan = null; }
          }
        }
      }
      return P.plan ? P.plan[live.length] : null;
    };
    if (P.resting) { if (g.breath < 75 && !k.has('opening')) return null; P.resting = false; }
    const x = wantKey();
    if (!x) return null;
    if (live.length + 1 >= (P.plan || '').length) P.done = true;
    const lock = IP_INPUT[x].lock;
    if (readUp && hitIn > 0.02 && hitIn < lock + 0.05) return null;
    return IP_SLOT[x];
  },
});

// ---------------------------------------------------------------- classes-c (Threadweaver, Marionettist)
// Marionettist newbie: the generic one (Cue whenever nothing glows, so often mid quick Jabs), but it flings the Doll
// only once both Pull Strings charges sit full: it doesn't think of W as the way to tie torn Strings back
NEWBIE.marionettist = (k, ctx) => {
  const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
  if (k.charges(abOf(k, 'pull')) < 2) n.ogcdSeen.pull = Infinity;
  else if (n.ogcdSeen.pull === Infinity) n.ogcdSeen.pull = null;
  return genericNewbie(k, ctx);
};
Object.assign(PRO, {
  // Threadweaver: keep the web full, Tapestry and the Cradle before raidwides, Snap when the threads have carried a lot
  // (Shears: on cooldown), Mend Seam on Spool, and Needle the rest of the time
  threadweaver(k, ctx) {
    const debt = ctx.state.healDebt, n = k.g.n, toRw = ctx.nextRaidwide - ctx.t, shears = k.def.store > 1;
    if (weaveOk(k) && ready(k, 'tie') && n < weaveMax(k)) return I(k, 'tie');
    if (weaveOk(k) && ready(k, 'tapestry') && toRw < 2) return I(k, 'tapestry');
    const cradle = abOf(k, 'shuttle').id === 'cradle';
    if (cradle && weaveOk(k) && ready(k, 'shuttle') && toRw < 2.5) return I(k, 'shuttle');
    // Shuttle with the web full (a strike per thread)
    // (a Shears' Shuttle also runs what Snap just cut: she cuts, re-ties, then throws it)
    if (!cradle && weaveOk(k) && ready(k, 'shuttle') && weaveShuttleN(k) >= 3) return I(k, 'shuttle');
    if (weaveOk(k) && ready(k, 'snip') && n > 0 && (shears ? n >= 2 || debt > 4000 : debt > 7000)) return I(k, 'snip');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const mend = abOf(k, 'mend');
    if (mend.id === 'embroider') { if (ready(k, 'mend') && (debt > 5000 || k.g.spool >= 80)) { ctx.state.gcdHeals++; return I(k, 'mend'); } }
    else if (k.g.spool >= WEAVE.MEND_COST && (debt > 4000 || k.g.spool >= 90)) { ctx.state.gcdHeals++; return I(k, 'mend'); }
    if (debt > 14000 && mend.id === 'mend' && castOk(k, ctx, 1.8)) { ctx.state.gcdHeals++; return I(k, 'mend'); }
    return castOk(k, ctx, k.castTime(abOf(k, 'needle'))) ? I(k, 'needle') : null;
  },
  // Marionettist: Finale at full Encore (or 3+ in a burst), Cross-Cut whenever the line is on, Pirouette / Tangle on
  // cooldown, Pull Strings at two charges or the moment a String tears (it ties them all back), Cue in the gaps (the
  // Doll jabs on its own)
  marionettist(k, ctx) {
    const cross = abOf(k, 'cross');
    if (cross.type === 'ogcd' && weaveOk(k) && ready(k, 'cross') && k.glows(cross)) return I(k, 'cross');
    if (weaveOk(k) && ready(k, 'pull') && (k.charges(abOf(k, 'pull')) === 2 || k.g.strings < 3 || mariLimp(k))) return I(k, 'pull');
    if (abOf(k, 'swap').id === 'swap' && k.talent('marionettist_cue') && weaveOk(k) && ready(k, 'swap') && k.cdRemaining(cross) > 3) return I(k, 'swap');
    // Stage Cross: Swap a moment before Cross-Cut comes up, so the cut lands harder (the Doll is back on its mark by then)
    else if (abOf(k, 'swap').id === 'swap' && weaveOk(k) && ready(k, 'swap') && !k.has('oncue') && k.readyIn(cross) < 4 && k.readyIn(cross) > 1.5) return I(k, 'swap');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const hitIn = ctx.state.dollHitAt != null ? ctx.state.dollHitAt - ctx.t : 99;
    // Pirouette through a blow you see coming (+1 Encore); otherwise keep it for the next one when it's close
    if (ready(k, 'pirouette') && abOf(k, 'pirouette').id === 'pirouette' && hitIn < 1.4) return I(k, 'pirouette');
    if (ready(k, 'finale') && k.g.encore >= 5) return I(k, 'finale');
    if (cross.type === 'gcd' && ready(k, 'cross') && k.glows(cross)) return I(k, 'cross');   // (Crossfire glows for the Dolls' own line)
    if (ready(k, 'pirouette') && (abOf(k, 'pirouette').id !== 'pirouette' || hitIn > 12)) return I(k, 'pirouette');
    return ready(k, 'cue') ? I(k, 'cue') : null;
  },
});

// ---------------------------------------------------------------- Gloomsworn (tank, class 18)
// The pro: Black Mantle just before a buster, Black Pall before a raidwide it can afford, Shade Step on cooldown and Gloom
// Strike into its echoes. (A real pro also holds the vessel full before a tankbuster, because a full vessel is what turns a
// killing blow into a Hollow; the simulator only measures damage, so this one spends.) Last Rite when the tank is low. The
// Hollow itself is the host's: tools/hollow-test.js.)
Object.assign(PRO, {
  gloomsworn(k, ctx) {
    const toB = ctx.nextBuster - ctx.t, toR = ctx.nextRaidwide - ctx.t, g = k.g.gloom || 0;
    // (Dark Pact, the Reaver's spec row VII, takes Black Mantle's place: the vessel filled for two echoing Strikes, whenever it is ready and the vessel is low)
    if (abOf(k, 'mantle').id === 'pact') { if (ready(k, 'mantle') && weaveOk(k) && g < 40) return I(k, 'mantle'); }
    else if (toB < 1.2 && toB > 0 && ready(k, 'mantle') && weaveOk(k)) return I(k, 'mantle');
    // (a Reaver of Dusk's Dusk Reave stands where Black Pall was: a cut on cooldown, free in a Hollow, kept clear of a tankbuster's Gloom)
    if (abOf(k, 'pall').id === 'reave') { if (ready(k, 'pall') && weaveOk(k) && (k.has('hollow') || (g >= 50 && toB > 8))) return I(k, 'pall'); }
    else if (toR < 1.5 && toR > 0 && g >= 30 && ready(k, 'pall') && weaveOk(k) && (g >= 70 || toB > 12)) return I(k, 'pall');
    if (ready(k, 'rite') && weaveOk(k) && k.env.hpFrac() < 0.3 && g >= 20) return I(k, 'rite');
    // Shade Step when the vessel holds Gloom for two Strikes, so both echo
    if (ready(k, 'shade') && weaveOk(k) && !k.has('shade') && g >= 50 && k.charges(abOf(k, 'strike')) >= 1) return I(k, 'shade');
    if (k.gcdRemaining() > 0.0001) return null;
    // (the vessel held full before a buster, for a Hollow, is real play but not damage: the simulator only measures damage, so a pro here spends)
    if (ready(k, 'strike') && g >= 40 && (g >= 65 || k.has('shade') || ctx.inBurst(ctx.t) || k.has('hollow'))) return I(k, 'strike');
    return I(k, 'rend');
  },
});

// ---------------------------------------------------------------- Thresher (damage, class 19)
// The pro: lays all four afflictions (Hook for the Thread, Blink for the Bind, Q for the Mark and Drain), Gathers the young ones
// to gold, and Reaps when the gold is in, or just before it rots. The newbie is the generic one: it notices the glowing Reap
// 60% of the time and otherwise cuts.
Object.assign(PRO, {
  thresher(k, ctx) {
    const on = thCount(k), gold = thCount(k, 2), young = thCount(k, 1), rot = thCount(k, 3);
    const R = thR(k), soon = THRESH.IDS.some(id => thStage(k, id) === 2 && k.now - k.g.aff[id] > R - 1.5);
    const reapReady = ready(k, 'reap');
    if (weaveOk(k)) {
      const wisp = abOf(k, 'wisp');
      if (wisp.id === 'cull') { if (ready(k, 'wisp') && on >= 3) return I(k, 'wisp'); }
      else if (ready(k, 'wisp') && (!k.has('wisp') || (k.talent('thresher_sacrifice') && k.remaining('wisp') < 6 && on >= 3))) return I(k, 'wisp');
      const hook = abOf(k, 'hook'), blink = abOf(k, 'blink');
      // (the spec rows' Blink replacements: Hourglass holds the gold for the Reap, Nightfall hurries the faint ones)
      if (blink.id === 'hourglass') { if (ready(k, 'blink') && gold >= 2 && !reapReady) return I(k, 'blink'); }
      else if (blink.id === 'nightfall') { if (ready(k, 'blink') && young >= 2 && gold === 0) return I(k, 'blink'); }
      if (k.charges(hook) > 0 && thStage(k, 'thread') === 0) return I(k, 'hook');
      if (k.charges(blink) > 0 && thStage(k, 'bind') === 0 && !(k.def.noAff && k.def.noAff.indexOf('bind') >= 0)) return I(k, 'blink');
      if (k.def.blinkAge && k.charges(blink) > 0 && young >= 2 && gold === 0) return I(k, 'blink');   // (a Grim's Blink ripens the afflictions)
      if (abOf(k, 'gather').id === 'sowing') { if (ready(k, 'gather') && on <= 1) return I(k, 'gather'); }
      else if (ready(k, 'gather') && on >= 2 && (rot >= 1 || (reapReady && young >= 2 && gold === 0))) return I(k, 'gather');
    }
    if (k.gcdRemaining() > 0.0001) return null;
    // (the Full Toll: with all four up and three gold, a beat more for the fourth, unless one is about to lapse)
    const toll = on === 4 && gold === 3 && rot === 0 && !soon;
    if (reapReady && on > 0 && ((gold >= Math.max(2, on - 1) && !toll) || (soon && gold >= 1) || rot >= 2)) return I(k, 'reap');
    return I(k, 'slash');
  },
});

// ---------------------------------------------------------------- Tidecaller (healer, class 20)
// The pro bends the tide so the crest meets each raidwide (Current: push a rising tide up, turn an ebbing one back, hold a
// crest), puts Breakwater down at high water as the raidwide lands, Surges at full high water when the party is hurt (or
// before the crest lets go), keeps a Riptide Mark on the tank ahead of the crest, Sips at low water, and Sprays the rest.
// The newbie answers the hints: Surge whenever the tide is over half and the party looks hurt, Sip otherwise.
Object.assign(PRO, {
  tidecaller(k, ctx) {
    const debt = ctx.state.healDebt, toRw = ctx.nextRaidwide - ctx.t, g = k.g, tide = g.tide || 0;
    const crestIn = g.tphase === 'rise' ? (100 - tide) / 100 * TIDE.RISE : 99;
    const flood = tideFlood(k), full = tideFull(k);
    if (weaveOk(k)) {
      if (ready(k, 'breakwater') && toRw < 2 && tide >= 60) return I(k, 'breakwater');
      if (ready(k, 'current') && !flood) {
        if (g.tphase === 'ebb' && toRw < 7 && toRw > 1) return I(k, 'current');
        if (g.tphase === 'rise' && toRw < 8 && crestIn > toRw + 0.3) return I(k, 'current');
        if (g.tphase === 'hold' && toRw < 3 && g.holdEnd - k.now < toRw + 1) return I(k, 'current');
        if (g.tphase === 'rise' && toRw > 14 && crestIn > 4) return I(k, 'current');   // (no raidwide near: just more crests)
      }
    }
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    // (a steady cadence: one Surge every crest, a Riptide Mark ahead of it, a Sip only in an emergency)
    const surgeCt = k.castTime(abOf(k, 'surge'));
    const surgeOk = !surgeCt || castOk(k, ctx, surgeCt);
    if (full && surgeOk && (flood || debt > 300 || (g.tphase === 'hold' && g.holdEnd - k.now < surgeCt + 0.6))) { ctx.state.gcdHeals++; return I(k, 'surge'); }
    const rip = abOf(k, 'riptide');
    if (ready(k, 'riptide')) {
      if (rip.id === 'maelstrom') { if (crestIn < 4) { ctx.state.gcdHeals++; return I(k, 'riptide'); } }
      else if (!tideMarked(k) && crestIn < 4) { ctx.state.gcdHeals++; return I(k, 'riptide'); }
    }
    if (debt > 20000 || (k.g.lowWater && debt > 8000)) { ctx.state.gcdHeals++; return I(k, 'sip'); }
    return I(k, 'spray');
  },
});
Object.assign(NEWBIE, {
  tidecaller(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    if (ctx.state.healDebt > 3500 && k.gcdRemaining() <= 0.0001 && !k.cast && n.gcdSeenAt != null && ctx.t >= n.gcdSeenAt + n.delay) {
      n.gcdSeenAt = null;
      ctx.state.gcdHeals++;
      if ((k.g.tide || 0) > 50 && !ctx.state.moving) return I(k, 'surge');
      return n.roll < 0.3 && ready(k, 'riptide') ? I(k, 'riptide') : I(k, 'sip');
    }
    return genericNewbie(k, ctx);
  },
});

// ---------------------------------------------------------------- Lanternkeeper (healer, class 21)
// The pro keeps two lanterns lit where the party stands (sets a new one as an old one runs out, never while a mechanic
// has moved it away), a Hand Lantern on the tank, Flares as a raidwide lands, Carries a lantern left behind back to the
// party, and Relights two stubs when the party is hurt. Trim the Wick the rest of the time. A Wayfarer keeps its Stride
// going as it walks. The newbie answers the hints: lanterns at its feet wherever it is, Flare whenever it is up, the
// Hand Lantern when the party looks hurt, never a Carry unless it glows (and then only now and then).
const lkAtParty = l => l.on == null && Math.hypot(l.x, l.y) <= l.r;
Object.assign(PRO, {
  lanternkeeper(k, ctx) {
    const g = k.g, debt = ctx.state.healDebt, toRw = ctx.nextRaidwide - ctx.t, away = ctx.state.away;
    const floor = g.lan.filter(l => l.kind === 'floor' || l.kind === 'beacon' || l.kind === 'float');
    const lit = floor.filter(l => (l.on != null || lkAtParty(l)) && l.end - k.now > 2.5);
    const spec = k.def.spec;
    if (weaveOk(k)) {
      if (ready(k, 'flare') && g.lan.length && toRw < 1.2 && toRw > 0.2) return I(k, 'flare');
      if (ready(k, 'flare') && g.lan.length && debt > 16000 && ctx.nextRaidwide - ctx.t > 14) return I(k, 'flare');
      const c = abOf(k, 'carry');
      if (c.id === 'carry' && !away && k.charges(c) > 0 && k.usable(c) && g.lan.some(l => lkMovable(l) && !lkAtParty(l))) return I(k, 'carry');
    }
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const set = abOf(k, 'set'), hand = abOf(k, 'hand'), rel = abOf(k, 'relight');
    if (ready(k, 'hand') && !g.lan.some(l => l.kind === 'hand') && (debt > 11000 || (g.emb >= lkEmbMax(k) && debt > 3000))) { ctx.state.gcdHeals++; return I(k, 'hand'); }
    if (!away && ready(k, 'set')) {
      if (set.id === 'stride') { if (k.now >= g.strideUntil - 0.5 && (debt > 5000 || g.emb >= lkEmbMax(k))) { ctx.state.gcdHeals++; return I(k, 'set'); } }
      else if (set.id === 'festival') { if (!g.lan.some(l => l.kind === 'float' && l.end - k.now > 1.5)) { ctx.state.gcdHeals++; return I(k, 'set'); } }
      else if (lit.length < 1 || (lit.length < 2 && debt > 15000)) { ctx.state.gcdHeals++; return I(k, 'set'); }
    }
    if (ready(k, 'relight')) {
      if (rel.id === 'wisp') { if (debt > 9000) { ctx.state.gcdHeals++; return I(k, 'relight'); } }
      else if (g.lan.filter(l => l.kind !== 'hand' && l.wick < 0.25).length >= 2 && debt > 9000) { ctx.state.gcdHeals++; return I(k, 'relight'); }
    }
    return I(k, 'trim');
  },
});
Object.assign(NEWBIE, {
  lanternkeeper(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    const fl = abOf(k, 'flare');
    if (k.usable(fl) && k.readyIn(fl) <= 0.0001 && k.g.lan.length) {
      if (n.ogcdSeen.flare == null) n.ogcdSeen.flare = ctx.t + 0.5 + ctx.human() * 2.5;
      if (ctx.t >= n.ogcdSeen.flare && !k.cast) { n.ogcdSeen.flare = null; return I(k, 'flare'); }
    } else n.ogcdSeen.flare = null;
    const g = newbieGlowOgcd(k, ctx, 'carry');
    if (g != null && g >= 0) return g;
    if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now) { n.gcdSeenAt = null; return null; }
    if (n.gcdSeenAt === null) { n.gcdSeenAt = ctx.t; n.delay = 0.1 + ctx.human() * 0.5; n.noticeGlow = ctx.human() < 0.6; n.roll = ctx.human(); }
    if (ctx.t < n.gcdSeenAt + n.delay) return null;
    n.gcdSeenAt = null;
    if (ctx.state.healDebt > 3500) {
      if (ready(k, 'hand') && n.roll < 0.5) { ctx.state.gcdHeals++; return I(k, 'hand'); }
      if (ready(k, 'set') && (k.glows(abOf(k, 'set')) || n.roll < 0.3)) { ctx.state.gcdHeals++; return I(k, 'set'); }
    }
    for (const id of ['set', 'hand', 'relight']) if (n.noticeGlow && ready(k, id) && k.glows(abOf(k, id))) { ctx.state.gcdHeals++; return I(k, id); }
    return 0;
  },
});

// healer DPS also gets healing debt cleared by damage-heals (Chronomancer); count Bolt heals against the debt
// (handled by env.emit 'heal').

// ---------------------------------------------------------------- Kenseier (tank, class 22)
// KEN_SIM stands in for the host (fight.js KENSEI_HOST): a deflect window held against the tank's autos and busters (judged by
// how far the press is from the blow, either side: KENSEI.judge; a press just after a blow gives it back), the boss's Posture
// (KENSEI.add / tick: a full bar Breaks unless the boss is casting; busters and raidwides are 2.5s casts here) and the
// notices the kit hears ('kdef', 'kbrk', 'kbend'). Mikiri Step has nothing to meet here (no frontals): it is not pressed.
// The pro deflects each blow with a press about 0.06 s either side of it (gaussian: now and then a Good), keeping clear of it
// with everything else (a press right before it would put the key behind an animation lock), Ash Mantle ahead of a buster,
// a Deathblow the moment a Break begins, the Pommel when it is ready. The newbie presses around the blow (0.34 s either way,
// about a third of the swings Perfect, most of the rest Good, a few missed, and one in five let go by), notices the Break's
// glow 60% of the time, Ash Mantle on a glowing buster 60% of the time, and presses the rest of the oGCDs when it sees them.
const KEN_FRONTAL = { first: 17, every: 30 };   // (the simulator's boss swings a frontal attack at the tank this often)
const KEN_SIM = {
  P: state => state.kenP || (state.kenP = KENSEI.make()),
  add(state, k, n, o) {
    const r = KENSEI.add(KEN_SIM.P(state), n, state.t, { secs: o.secs, keep: o.keep, by: 1, casting: !!state.kenCasting });
    if (r === 'break') k.notify('kbrk', { secs: KEN_SIM.P(state).until - state.t });
  },
  gain(state, k, q, buster, w, pre, late) {
    KEN_SIM.add(state, k, q === 2 ? (buster ? w.pb : w.pp) : w.pg, w);
    k.notify('kdef', { q, b: buster ? 1 : 0, a: pre, late: late ? 1 : 0, p: KENSEI.frac(KEN_SIM.P(state)) });
  },
  emit(state, k, ev) {
    if (ev.type !== 'kensei') return false;
    const t = state.t;
    if (ev.op === 'deflect') {
      const w = { start: t, end: t + ev.dur, dur: ev.dur, pp: ev.amount, pg: ev.value, pb: ev.mult, secs: ev.secs, keep: ev.keep };
      state.kenWin = w;
      const h = state.kenHit;   // a blow just before the press: it comes back
      if (h && !h.done && t - h.t <= ev.dur) {
        h.done = true;
        const q = KENSEI.judge(t - h.t, ev.dur);
        if (q) { state.kenWin = null; KEN_SIM.gain(state, k, q, h.b, w, h.pre, true); }
      }
    } else if (ev.op === 'posture') KEN_SIM.add(state, k, ev.full ? KENSEI.MAX : ev.amount, ev);
    else if (ev.op === 'end') KENSEI.endBreak(KEN_SIM.P(state), t);
    else if (ev.op === 'duel') state.kenDuel = t + ev.dur;
    else if (ev.op === 'step') state.kenStep = { until: t + ev.dur, amount: ev.amount, secs: ev.secs, keep: ev.keep };
    return true;
  },
  // a blow lands on the tank: a window that covers it turns it aside (0 or half), otherwise it is kept for a late press
  hit(state, k, amt, kind) {
    state.kenDf = 0;
    if (kind !== 'auto' && kind !== 'buster') return amt;
    const t = state.t, w = state.kenWin, b = kind === 'buster';
    if (w && t >= w.start && t <= w.end) {
      const q = KENSEI.judge(t - w.start, w.dur);
      if (q) { state.kenWin = null; state.kenDf = q; KEN_SIM.gain(state, k, q, b, w, amt, false); return q === 2 ? 0 : amt * 0.5; }
    }
    if (amt > 0) state.kenHit = { t, pre: amt, b, done: false };
    return amt;
  },
  tick(state, k, nextBuster, nextRaidwide) {
    const P = KEN_SIM.P(state), t = state.t;
    state.kenCasting = nextBuster - t < 2.5 || nextRaidwide - t < 2.5;
    // a frontal attack every KEN_FRONTAL s (the boss's cone or charge): a Mikiri Step under way when it lands passes through it, +25 Posture
    if (state.kenFrontal == null) state.kenFrontal = KEN_FRONTAL.first;
    if (t >= state.kenFrontal) {
      state.kenFrontal += KEN_FRONTAL.every;
      const st = state.kenStep;
      if (st && t <= st.until) { state.kenStep = null; KEN_SIM.add(state, k, st.amount, st); k.notify('kdef', { q: 3, a: 0, p: KENSEI.frac(P) }); }
    }
    const r = KENSEI.tick(P, t, DT, state.kenCasting);
    if (r === 'end') k.notify('kbend', {});
    else if (r === 'break') k.notify('kbrk', { secs: P.until - t });
  },
};
// the deflect plan: each blow gets one press at (the blow's time + a jitter); returns true on the step it is due.
// sample() gives the jitter, skip is the chance the swing is let go by. Presses are pinned to the 0.05 s step: a press lands
// 0 to 0.05 s later than planned, so the plan is that much early.
function kenDeflectDue(ctx, sample, skip) {
  const s = ctx.state, K = s.kenPlan || (s.kenPlan = { last: -1, list: [] });
  const hitAt = Math.min(ctx.nextAuto, ctx.nextBuster);
  if (hitAt > K.last) { K.last = hitAt; K.list.push({ at: hitAt + sample() - 0.025, skip: ctx.human() < skip, done: false }); }
  K.list = K.list.filter(p => ctx.t - p.at < 1);
  const p = K.list.find(q => !q.done && ctx.t >= q.at);
  if (!p) return false;
  p.done = true;
  return !p.skip;
}
// is a planned deflect press due within `within` s (or just was)? Anything pressed now would sit behind its animation lock.
const kenPlanNear = (ctx, within) => (ctx.state.kenPlan ? ctx.state.kenPlan.list.some(p => !p.done && !p.skip && p.at - ctx.t < within && p.at - ctx.t > -0.1) : false);
const kenGauss = ctx => () => Math.sqrt(-2 * Math.log(1 - ctx.human() * 0.999999)) * Math.cos(2 * Math.PI * ctx.human());
Object.assign(PRO, {
  kenseier(k, ctx) {
    const toB = ctx.nextBuster - ctx.t, g = kenGauss(ctx);
    if (kenDeflectDue(ctx, () => g() * 0.055, 0) && ready(k, 'deflect')) return I(k, 'deflect');
    // Feint: a Good deflect turned into a Perfect with the Pommel (off the global cooldown)
    const db = abOf(k, 'deathblow');
    if (db.freeGcd && db.freeGcd(k) && ready(k, 'deathblow') && !kenPlanNear(ctx, 0.35)) return I(k, 'deathblow');
    if (weaveOk(k) && !kenPlanNear(ctx, 0.6)) {
      if (toB < 2.2 && toB > 1.0 && ready(k, 'mantle')) return I(k, 'mantle');
      if (ready(k, 'guard')) return I(k, 'guard');   // (Iai Stance, Ember Duel; Guard Stance's shield is the party's)
      const mk = abOf(k, 'mikiri'), toF = (ctx.state.kenFrontal ?? KEN_FRONTAL.first) - ctx.t;
      if (mk && mk.id === 'whirlwind') { if (ready(k, 'mikiri')) return I(k, 'mikiri'); }
      else if (ready(k, 'mikiri') && toF < 0.3 && toF > 0.05) return I(k, 'mikiri');   // (stepped through the frontal as it lands)
    }
    if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now || kenPlanNear(ctx, 0.35)) return null;   // (the animation lock of the last press waited out: a Pommel is the move to reach for)
    if (kenBroken(k)) return I(k, 'deathblow');
    // (a Pommel; a Warden's Redirect only for a blow worth sending back, the tankbuster: an auto's is worth less than a cut)
    if (ready(k, 'deathblow') && (!k.def.warden || (k.g.lastDef && k.g.lastDef.a >= 0.15 * k.env.maxHp()))) return I(k, 'deathblow');
    return 0;
  },
});
Object.assign(NEWBIE, {
  kenseier(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    if (kenDeflectDue(ctx, () => (ctx.human() < 0.5 ? -1 : 1) * (0.08 + ctx.human() * 0.30), 0.2) && ready(k, 'deflect')) return I(k, 'deflect');
    const g = newbieGlowOgcd(k, ctx, 'mantle');
    if (g != null && g >= 0) return g;
    // the other oGCDs: noticed 0.5-3 s after they come up
    for (const id of ['guard', 'mikiri']) {
      const ab = abOf(k, id);
      if (!ab || !k.usable(ab) || k.readyIn(ab) > 0.0001) { if (ab) n.ogcdSeen[ab.id] = null; continue; }
      if (n.ogcdSeen[ab.id] == null) n.ogcdSeen[ab.id] = ctx.t + 0.5 + ctx.human() * 2.5;
      if (ctx.t >= n.ogcdSeen[ab.id] && !k.cast) { n.ogcdSeen[ab.id] = null; return I(k, id); }
    }
    if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now) { n.gcdSeenAt = null; return null; }
    if (n.gcdSeenAt === null) { n.gcdSeenAt = ctx.t; n.delay = 0.1 + ctx.human() * 0.5; n.noticeGlow = ctx.human() < 0.6; n.roll = ctx.human(); }
    if (ctx.t < n.gcdSeenAt + n.delay) return null;
    n.gcdSeenAt = null;
    const db = abOf(k, 'deathblow');
    if (n.noticeGlow && k.glows(db) && k.usable(db) && k.readyIn(db) <= 0.0001) return I(k, 'deathblow');   // (the Break's glow, or a Redirect's)
    if (n.roll < 0.25) { const o = k.abilities.filter(a => a.type === 'gcd' && k.usable(a) && k.readyIn(a) <= 0.0001); if (o.length > 1) return I(k, o[1 + Math.floor(ctx.human() * (o.length - 1))].id); }
    return 0;
  },
});

// ---------------------------------------------------------------- run
if (require.main !== module) module.exports = { runSim, FIGHT_LEN };
else main();
function main() {
// every class, then each of its specializations as "class:spec" (or one of either, given as an argument)
const only = process.argv[2];
const entries = [];
for (const c of Object.keys(KITS)) {
  entries.push([c, null]);
  for (const s of SPECS[c] || []) entries.push([c, s.id]);
}
const picked = only ? entries.filter(([c, s]) => (s ? `${c}:${s}` : c) === only) : entries;
const RUNS = only ? 8 : 5;
const rows = [];
for (const [cls, spec] of picked) {
  const avg = skill => {
    let dps = 0, hps = 0, ehps = 0, gcdH = 0, last;
    for (let s = 1; s <= RUNS; s++) { const r = runSim(cls, skill, s * 101, spec); dps += r.dps; hps += r.hps; ehps += r.ehps; gcdH += r.gcdHeals; last = r; }
    return { dps: dps / RUNS, hps: hps / RUNS, ehps: ehps / RUNS, gcdHeals: gcdH / RUNS, last };
  };
  const nb = avg('newbie'), pro = avg('pro');
  rows.push({ c: spec ? `${cls}:${spec}` : cls, nb, pro });
}
console.log('\nclass                    newbie DPS   pro DPS   newbie/pro   (pro HPS / newbie HPS for healers)');
for (const { c, nb, pro } of rows) {
  const ratio = (nb.dps / pro.dps * 100).toFixed(0) + '%';
  const heal = pro.hps > 0 ? `   HPS ${pro.ehps.toFixed(0)} / ${nb.ehps.toFixed(0)} effective (${pro.hps.toFixed(0)} / ${nb.hps.toFixed(0)} raw), GCD heals ${pro.gcdHeals.toFixed(0)} / ${nb.gcdHeals.toFixed(0)}` : '';
  console.log(`${c.padEnd(14)} ${nb.dps.toFixed(0).padStart(9)} ${pro.dps.toFixed(0).padStart(9)} ${ratio.padStart(11)}${heal}`);
}
if (only) {
  for (const skill of ['newbie', 'pro']) {
    const r = rows[0][skill === 'pro' ? 'pro' : 'nb'].last;
    const s = r.stats;
    console.log(`\n${skill}: casts`, s.casts, '\n  overcap', s.overcap, ' wasted', s.wasted, ' pos', s.posHit, '/', s.posHit + s.posMiss,
      ' interrupts', s.interrupts, ' perfects', s.perfects || 0, ' wardBreaks', s.wardBreaks || 0, ' overheats', s.overheats || 0,
      ` uptime ${(s.gcdTime / FIGHT_LEN * 100).toFixed(0)}%`, ` burst share ${(s.burstDamage / s.damage * 100).toFixed(0)}%`);
  }
}
}
