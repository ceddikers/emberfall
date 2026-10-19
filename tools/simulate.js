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
const { KITS } = kitsModule;
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
  const def = kitFor(classId, specId);
  const rng = mulberry(seed);
  const human = mulberry(seed * 7 + 3); // separate stream for "human" randomness
  const state = { t: 0, moving: false, tookDamage: [], shield: null, mits: [], reflect: null, healDebt: 0, healing: 0, gcdHeals: 0, allyWards: [], petalShields: [] };
  const role = ['bastion', 'bloodreaver', 'runeguard'].includes(classId) ? 'tank'
    : ['cleric', 'grovekeeper', 'chronomancer', 'alembist'].includes(classId) ? 'healer' : 'dps';
  const maxHp = role === 'tank' ? 32000 : 21000;
  let lastPos = 'rear';
  const env = {
    now: () => state.t,
    rng,
    moving: () => state.moving,
    target: ab => (ab.target === 'ally' ? 'tank' : ab.target === 'enemy' ? (state.outOfRange && ab.range === 'melee' ? null : { id: 'dummy' }) : true),
    positional: want => (lastPos === 'want' ? want || 'rear' : lastPos),
    partyMods: () => (inBurst(state.t) ? { dmg: 0.08 } : {}),
    targetMods: () => ({}),
    selfMods: () => ({}),
    recentDamage: secs => state.tookDamage.filter(d => d.t > state.t - secs).reduce((s, d) => s + d.a, 0),
    maxHp: () => maxHp,
    // a rough HP for the Berserker: lower right after big hits
    hpFrac: () => Math.max(0.15, 1 - Math.min(0.85, env.recentDamage(8) / maxHp * 1.3)),
    isDead: () => false,
    defaultLink: () => 'tank',
    talents: () => talents || null,
    // the boss as talents see it (kits.js bossNow): busters and raidwides are 2.5s casts; the tank is its target
    boss: () => {
      const nextOf = (first, every) => (state.t < first ? first : first + Math.ceil((state.t - first) / every) * every);
      const left = Math.min(nextOf(20, BUSTER_EVERY), nextOf(12, RAIDWIDE_EVERY)) - state.t;
      return { casting: left > 0 && left < 2.5, castLeft: Math.max(0, left), next: Math.max(0, left), onMe: role === 'tank', vuln: 0, selfVuln: role === 'tank' && state.t - lastBusterAt < 8 };
    },
    // where you stand: away from your spot while a mechanic moves you (and now and then for a newbie), so a Sigilmancer leaves its circle
    pos: () => (state.away ? { x: 999, y: 0 } : { x: 0, y: 0 }),
    emit: ev => {
      if (ev.type === 'heal' || ev.type === 'hot') {
        const amt = ev.type === 'hot' ? ev.amount * ev.ticks : ev.amount;
        state.healing += ev.target === 'party' ? amt * 4 : amt;
        state.healDebt = Math.max(0, state.healDebt - (ev.target === 'party' ? amt * 4 : amt));
      }
      // Moonwell: assume three of the four stand in the pool for its whole life
      if (ev.type === 'pool') { state.healing += ev.amount * ev.ticks * 3; state.healDebt = Math.max(0, state.healDebt - ev.amount * ev.ticks * 3); }
      // a thrown vial (Alembist): a splash usually catches two or three of the four (the whole party if it says so),
      // a cloud about the same for its whole life; shields count at 80% like an Aegis's
      if (ev.type === 'splash') {
        const hits = ev.target === 'party' ? 4 : ev.target === 'lowest' ? 1.2 : (ev.r || 0) >= 110 ? 2.4 : 1.6;
        const amt = (ev.amount || 0) * hits + (ev.sh || 0) * hits * 0.8 + ((ev.pa || 0) + (ev.ps || 0) * 0.6) * (ev.ticks || 0) * 2.4;
        state.healing += amt; state.healDebt = Math.max(0, state.healDebt - amt);
      }
      // Judgment (Inquisitor): the party's hits burst every charge soon after
      if (ev.type === 'brand') k.stats.damage += ev.amount * ev.ticks;
      // a shield on an ally (Aegis): counts as healing; a Petal shield on the tank soaks most of it and comes back now and then
      if (ev.type === 'shield' && role === 'healer') {
        state.healing += ev.amount * 0.8; state.healDebt = Math.max(0, state.healDebt - ev.amount * 0.8);
        if (ev.tag === 'petal') state.petalShields.push({ at: state.t + 3 });
      }
      if (ev.type === 'shield' && ev.target === 'self') state.shield = { amt: ev.amount, max: ev.amount, end: state.t + ev.dur, tag: ev.tag };
      // a Ward on an ally (Spellwarden): assume it soaks a bit over half before it ends (an ally isn't tanking)
      if (ev.type === 'shield' && ev.tag === 'ward' && ev.target !== 'self') state.allyWards.push({ end: state.t + ev.dur });
      if (ev.type === 'shield' && ev.target === 'party') state.healDebt = Math.max(0, state.healDebt - ev.amount * 4);
      if (ev.type === 'mit' && ev.target === 'self') {
        if (ev.kind === 'reflect') state.reflect = state.t + ev.dur;
        state.mits.push({ pct: ev.pct, end: state.t + ev.dur, start: state.t, kind: ev.kind });
      }
    },
  };
  const k = new Kit(def, env);
  const inBurst = t => t % BURST_EVERY < BURST_LEN;
  const burstSoon = t => (BURST_EVERY - (t % BURST_EVERY)) % BURST_EVERY < 6 && !inBurst(t);
  const isMoveWindow = t => t > 5 && (t % MOVE_EVERY) < MOVE_LEN;
  const moveSoon = (t, within) => { const into = t % MOVE_EVERY; return into > MOVE_LEN && MOVE_EVERY - into < within; };

  // incoming damage for tanks (perfect blocks, ward breaks, reflects, drain value)
  let nextAuto = 3, nextBuster = 20, nextRaidwide = 12, lastBusterAt = -99;
  function hitTank(raw, kind) {
    let mult = 1, perfect = false;
    state.mits = state.mits.filter(m => m.end > state.t);
    for (const m of state.mits) {
      if (m.kind === 'brace' && state.t - m.start <= 0.8) { perfect = true; mult *= 0.4; }
      else if (m.kind === 'reflect') { mult *= 0.2; }
      else if (m.kind !== 'living' && m.kind !== 'invuln') mult *= 1 - m.pct;
    }
    if (state.reflect && state.t <= state.reflect) { state.reflect = null; state.mits = state.mits.filter(m => m.kind !== 'reflect'); k.notify('reflect'); }
    if (perfect) { state.mits = state.mits.filter(m => !(m.kind === 'brace' && state.t - m.start <= 0.8)); k.notify('perfect'); }
    let amt = raw * mult;
    if (state.shield) {
      const used = Math.min(state.shield.amt, amt); state.shield.amt -= used; amt -= used;
      if (state.shield.amt <= 0) { k.notify('shieldEnd', { tag: state.shield.tag, frac: 1 }); state.shield = null; }
    }
    state.tookDamage.push({ t: state.t, a: amt });
  }

  // healer workload: party damage that needs healing
  function healerIncoming() {
    if (state.t >= nextAuto) { nextAuto += AUTO_EVERY; state.healDebt += AUTO_DMG * 0.75; }
    if (state.t >= nextRaidwide) { nextRaidwide += RAIDWIDE_EVERY; state.healDebt += RAIDWIDE_DMG * 4 * 0.85; }
    if (state.t >= nextBuster) { nextBuster += BUSTER_EVERY; state.healDebt += BUSTER_DMG * 0.45; }
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
    state.outOfRange = state.moving && def.abilities[0].range === 'melee' && skill !== 'pro';
    if (role === 'tank') {
      if (state.t >= nextAuto) { nextAuto += AUTO_EVERY; hitTank(AUTO_DMG, 'auto'); }
      if (state.t >= nextBuster) { nextBuster += BUSTER_EVERY; hitTank(BUSTER_DMG, 'buster'); lastBusterAt = state.t; }
      if (state.t >= nextRaidwide) { nextRaidwide += RAIDWIDE_EVERY; hitTank(RAIDWIDE_DMG, 'raidwide'); }
      for (const w of state.allyWards) if (state.t >= w.end) { w.done = true; k.notify('shieldEnd', { tag: 'ward', frac: 0.55 }); }
      state.allyWards = state.allyWards.filter(w => !w.done);
      if (state.shield && state.t >= state.shield.end) { k.notify('shieldEnd', { tag: state.shield.tag, frac: 1 - state.shield.amt / state.shield.max }); state.shield = null; }
    }
    if (role === 'healer') {
      healerIncoming();
      for (const p of state.petalShields) if (state.t >= p.at) { p.done = true; k.notify('shieldEnd', { tag: 'petal', frac: 0.8 }); }
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
  return { dps: k.stats.damage / dur, stats: k.stats, hps: state.healing / dur, gcdHeals: state.gcdHeals, k };
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
    if (ab.target === 'ally' && ctx.role === 'healer' && ctx.state.healDebt < 3000) continue;
    if (ab.id === 'stasis' || ab.id === 'mirror' || ab.id === 'undying' || ab.id === 'shift') continue;
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
const NEWBIE = {
  // Alembist: the hints only. Distill and Grand Batch when noticed; throws when the party looks hurt or R glows;
  // otherwise the glowing reagent (noticed 60% of the time), else Q, now and then a random one. Never picks a slot.
  alembist(k, ctx) {
    const n = ctx.state.newbie || (ctx.state.newbie = { gcdSeenAt: null, delay: 0, ogcdSeen: {} });
    for (const id of ['distill', 'batch']) {
      const ab = abOf(k, id);
      if (!k.usable(ab) || k.readyIn(ab) > 0.0001) { n.ogcdSeen[id] = null; continue; }
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
    if (k.gcdRemaining() > 0.0001) return null;
    if (k.stacks('gorge') > 0) return I(k, 'drain');
    const recent = k.env.recentDamage(6);
    const pooling = ctx.burstSoon(ctx.t) || k.cdRemaining(abOf(k, 'frenzy')) < 6;
    if (k.g.blood >= 40 && (recent > 12000 || (k.g.blood >= 85 && !pooling) || (k.g.blood >= 95))) return I(k, 'drain');
    return I(k, 'hack');
  },
  runeguard(k, ctx) {
    const toBuster = ctx.nextBuster - ctx.t, toRw = ctx.nextRaidwide - ctx.t;
    if (ready(k, 'overload') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'overload');
    if (toBuster < 0.6 && toBuster > 0.1 && ready(k, 'mirror')) return I(k, 'mirror');
    // Whirling Runes (a talent in Sanctum's place): three Runes into blades instead of a Glyph Burst
    if (abOf(k, 'sanctum').id === 'whirl' && ready(k, 'sanctum') && k.g.runes >= 3 && weaveOk(k) && Math.min(toBuster, toRw) > 6) return I(k, 'sanctum');
    if (k.gcdRemaining() > 0.0001) return null;
    const wardFor = (toBuster < 3 && toBuster > 0.3) || (toRw < 3 && toRw > 0.3);
    if (wardFor && k.g.runes >= 1 && !ctx.state.shield) return I(k, 'ward');
    if (k.g.runes >= 3 && !(ctx.burstSoon(ctx.t) && k.g.runes < 3)) {
      // keep a rune for the next planned ward if it's close
      const nextNeed = Math.min(toBuster, toRw);
      if (nextNeed < 6 && nextNeed > 3) return I(k, 'strike');
      return I(k, 'glyph');
    }
    return I(k, 'strike');
  },
  ranger(k, ctx) {
    if (ready(k, 'mark') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'mark');
    if (ready(k, 'barrage') && weaveOk(k) && (k.has('markself') || k.cdRemaining(abOf(k, 'mark')) > 25)) return I(k, 'barrage');
    if (weaveOk(k) && ready(k, 'rapid') && (k.g.focus >= 90 || (k.has('markself') && k.g.focus >= 50))) return I(k, 'rapid');
    if (k.gcdRemaining() > 0.0001) return null;
    const p = abOf(k, 'pierce');
    if (k.has('barrage')) return I(k, 'quick');
    if (k.has('keen') && k.charges(p) >= 0 && ready(k, 'pierce')) return I(k, 'pierce');
    if (k.charges(p) === 2 || (k.charges(p) === 1 && k.cdRemaining(p) === 0 && k.cd[p.id].next - k.now < 2.5)) return I(k, 'pierce');
    if (k.has('markself') && k.charges(p) > 0) return I(k, 'pierce');
    return I(k, 'quick');
  },
  shadowblade(k, ctx) {
    if (ready(k, 'dance') && ctx.inBurst(ctx.t) && weaveOk(k) && k.g.combo <= 2) return I(k, 'dance');
    // Death Blossom (a talent in Smoke Bomb's place): from empty, in the burst
    if (abOf(k, 'smoke').id === 'blossom' && ready(k, 'smoke') && weaveOk(k) && k.g.combo <= 1 && (ctx.inBurst(ctx.t) || k.cdRemaining(abOf(k, 'dance')) > 20)) return I(k, 'smoke');
    const step = abOf(k, 'step');
    if (weaveOk(k) && k.charges(step) > 0 && (k.charges(step) === 2 || ctx.isMoveWindow(ctx.t))) return I(k, 'step');
    if (k.gcdRemaining() > 0.0001) return null;
    const rupture = abOf(k, 'venom').id === 'rupture';
    if (rupture ? k.g.combo >= 4 && k.dotRemaining('rupture') < 3 : k.dotRemaining('poison') < 7) return I(k, 'venom');
    const behind = true;
    if (k.g.combo >= 5 || (k.g.combo >= 4 && behind)) { ctx.setPos(abOf(k, 'evis').id === 'backstab' ? 'rear' : 'flank'); return I(k, 'evis'); }   // Nightstalker's Backstab wants the back
    ctx.setPos('rear');
    return I(k, 'strike');
  },
  pyromancer(k, ctx) {
    const fb = abOf(k, 'fireblast');
    // Fire Blast converts Heating Up into Hot Streak (also mid-cast)
    if (k.has('heating') && k.charges(fb) > 0 && k.readyIn(fb) <= 0.0001) return I(k, 'fireblast');
    if (k.has('combust') && k.charges(fb) > 0 && k.readyIn(fb) <= 0.0001 && !k.has('hotstreak')) return I(k, 'fireblast');
    if (k.charges(fb) === 2 && k.readyIn(fb) <= 0.0001 && !k.cast && weaveOk(k) && !k.has('hotstreak')) return I(k, 'fireblast');
    if (ready(k, 'combust') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'combust');
    // Firestep (a talent in Smolder's place): just before a mechanic moves you, for an instant Fireball on the way
    if (abOf(k, 'smolder').id === 'firestep' && ready(k, 'smolder') && weaveOk(k) && k.g.heat <= 80 && (ctx.moveSoon(ctx.t, 1.5) || ctx.state.moving)) return I(k, 'smolder');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const moving = ctx.state.moving || ctx.isMoveWindow(ctx.t + 1.4);
    if (k.has('hotstreak') && (moving || !k.has('combust') || true)) return I(k, 'pyro');
    if (k.g.heat >= 84 && ready(k, 'vent')) return I(k, 'vent');
    if (moving && (k.has('firestep') || k.has('haze')) && k.g.heat <= 88) return I(k, 'fireball');   // an instant Fireball (talents)
    if (moving) { if (ready(k, 'vent') && k.g.heat >= 30) return I(k, 'vent'); return null; }
    if (k.g.heat > 88) return ready(k, 'vent') ? I(k, 'vent') : null; // don't overheat
    return castOk(k, ctx, 1.8) ? I(k, 'fireball') : null;
  },
  cleric(k, ctx) {
    const debt = ctx.state.healDebt;
    if (debt > 5000 && ready(k, 'prayer') && weaveOk(k)) return I(k, 'prayer');
    if (abOf(k, 'bene').target === 'enemy' ? ready(k, 'bene') && weaveOk(k) : debt > 6000 && ready(k, 'bene') && weaveOk(k)) return I(k, 'bene');   // Inquisitor's Condemn is an attack
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    // Bloom of Dawn (a talent in Intervention's place): a pile of Petals into one big heal
    if (abOf(k, 'intervene').id === 'dawnbloom' && ready(k, 'intervene') && k.g.petals >= 2 && debt > 8000) { ctx.state.gcdHeals++; return I(k, 'intervene'); }
    if (k.g.bloom >= 3 && (ctx.inBurst(ctx.t) || ctx.state.moving)) return I(k, 'smite');
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
    if (ready(k, 'shift') && weaveOk(k)) {
      if (k.g.stance === 'slow' && k.g.flux >= 95) return I(k, 'shift');
      if (k.g.stance === 'slow' && k.g.flux >= 50 && (ctx.inBurst(ctx.t) || toRw < 2)) return I(k, 'shift');
      if (k.g.stance === 'haste' && k.g.flux < 8) return I(k, 'shift');
    }
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    if (debt > 16000 && ready(k, 'recall') && castOk(k, ctx, 2.5)) { ctx.state.gcdHeals++; return I(k, 'recall'); }
    return castOk(k, ctx, 1.5 * k.hasteMult()) || k.has('surge') ? I(k, 'bolt') : null;
  },
  // Alembist: keep a heal or two in stock, otherwise brew bombs and throw them ripe; Catalyst for Reactions on cooldown
  alembist(k, ctx) {
    const debt = ctx.state.healDebt, A = k.def.alem, vials = k.g.vials, vol = !!A.fuse;
    const room = vials.length < A.slots, cat = abOf(k, 'distill').id === 'catalyst';
    const weave = k.gcdRemaining() > 0.2 && !k.cast;   // the short reagent GCD leaves a quarter second to weave
    if (cat) { if (ready(k, 'distill') && !k.g.half.length && room && weave) return I(k, 'distill'); }
    else if (ready(k, 'distill') && room && !k.g.half.length && weave) return I(k, 'distill');
    const batch = abOf(k, 'batch');
    if (batch.id === 'blend') { if (ready(k, 'batch') && vials.length >= A.slots && weave) return I(k, 'batch'); }
    else if (ready(k, 'batch') && k.g.last && vials.length <= 1 && weave && ((alemInfo(k.g.last).kind === 'bomb' && ctx.inBurst(ctx.t)) || (alemInfo(k.g.last).kind === 'heal' && debt > 10000))) return I(k, 'batch');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    if (A.pick && vials.length) {
      const h = vials.findIndex(alemIsHeal);
      let best = 0; vials.forEach((v, i) => { if (alemStrength(k, v) > alemStrength(k, vials[best]) && !alemIsHeal(v)) best = i; });
      k.g.sel = debt > 5000 && h >= 0 ? h : best;
    }
    const i = alemPick(k), v = vials[i];
    if (v) {
      const heal = alemIsHeal(v), ripe = alemStrength(k, v) >= 1 + ALEMBIC.GROW - 0.001;
      if (heal && debt > 5000) return I(k, 'throw');
      if (v.fuse && v.fuse - k.now < 1.3) return I(k, 'throw');
      if (!heal && ripe) return I(k, 'throw');
      if (!room) return I(k, 'throw');
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

// healer DPS also gets healing debt cleared by damage-heals (Chronomancer); count Bolt heals against the debt
// (handled by env.emit 'heal').

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
    let dps = 0, hps = 0, gcdH = 0, last;
    for (let s = 1; s <= RUNS; s++) { const r = runSim(cls, skill, s * 101, spec); dps += r.dps; hps += r.hps; gcdH += r.gcdHeals; last = r; }
    return { dps: dps / RUNS, hps: hps / RUNS, gcdHeals: gcdH / RUNS, last };
  };
  const nb = avg('newbie'), pro = avg('pro');
  rows.push({ c: spec ? `${cls}:${spec}` : cls, nb, pro });
}
console.log('\nclass                    newbie DPS   pro DPS   newbie/pro   (pro HPS / newbie HPS for healers)');
for (const { c, nb, pro } of rows) {
  const ratio = (nb.dps / pro.dps * 100).toFixed(0) + '%';
  const heal = pro.hps > 0 ? `   HPS ${pro.hps.toFixed(0)} / ${nb.hps.toFixed(0)}, GCD heals ${pro.gcdHeals.toFixed(0)} / ${nb.gcdHeals.toFixed(0)}` : '';
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
