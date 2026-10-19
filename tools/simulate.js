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
const { KITS } = require(path.join(__dirname, '../client/js/combat/kits.js'));
global.KITS = KITS;
const { SPECS, kitFor } = require(path.join(__dirname, '../client/js/combat/specs.js'));
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

function runSim(classId, skill, seed, specId) {
  const def = kitFor(classId, specId);
  const rng = mulberry(seed);
  const human = mulberry(seed * 7 + 3); // separate stream for "human" randomness
  const state = { t: 0, moving: false, tookDamage: [], shield: null, mits: [], reflect: null, healDebt: 0, healing: 0, gcdHeals: 0, allyWards: [] };
  const role = ['bastion', 'bloodreaver', 'runeguard'].includes(classId) ? 'tank'
    : ['cleric', 'grovekeeper', 'chronomancer'].includes(classId) ? 'healer' : 'dps';
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
    emit: ev => {
      if (ev.type === 'heal' || ev.type === 'hot') {
        const amt = ev.type === 'hot' ? ev.amount * ev.ticks : ev.amount;
        state.healing += ev.target === 'party' ? amt * 4 : amt;
        state.healDebt = Math.max(0, state.healDebt - (ev.target === 'party' ? amt * 4 : amt));
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
  let nextAuto = 3, nextBuster = 20, nextRaidwide = 12;
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
  let reaction = 0;
  for (state.t = 0; state.t < FIGHT_LEN; state.t += DT) {
    state.moving = isMoveWindow(state.t);
    // Pros pre-position, so they spend less time moving.
    if (skill === 'pro' && isMoveWindow(state.t) && (state.t % MOVE_EVERY) > MOVE_LEN * 0.6) state.moving = false;
    // Melee lose uptime while moving out of mechanics (out of range); pros keep it with gap closers.
    state.outOfRange = state.moving && def.abilities[0].range === 'melee' && skill !== 'pro';
    if (role === 'tank') {
      if (state.t >= nextAuto) { nextAuto += AUTO_EVERY; hitTank(AUTO_DMG, 'auto'); }
      if (state.t >= nextBuster) { nextBuster += BUSTER_EVERY; hitTank(BUSTER_DMG, 'buster'); }
      if (state.t >= nextRaidwide) { nextRaidwide += RAIDWIDE_EVERY; hitTank(RAIDWIDE_DMG, 'raidwide'); }
      for (const w of state.allyWards) if (state.t >= w.end) { w.done = true; k.notify('shieldEnd', { tag: 'ward', frac: 0.55 }); }
      state.allyWards = state.allyWards.filter(w => !w.done);
      if (state.shield && state.t >= state.shield.end) { k.notify('shieldEnd', { tag: state.shield.tag, frac: 1 - state.shield.amt / state.shield.max }); state.shield = null; }
    }
    if (role === 'healer') healerIncoming();
    // positional: pros are where they want to be most of the time; newbies wander
    if (skill === 'pro') lastPos = human() < 0.9 ? 'want' : 'front';
    else lastPos = ['rear', 'flank', 'front', 'front'][Math.floor(human() * 4)];
    k.update();
    if (reaction > state.t) continue;
    const ctx = { t: state.t, inBurst, burstSoon, isMoveWindow, moveSoon, state, human, nextAuto, nextBuster, nextRaidwide, role,
      setPos: p => { lastPos = p; } };
    const choice = policy(k, ctx);
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
const NEWBIE = {};

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
    if (toBuster > 10 && toBuster < 40 && k.cdRemaining(abOf(k, 'bulwark')) > 30 && false) return null;
    if (k.gcdRemaining() > 0.0001) return null;
    const pooling = ctx.burstSoon(ctx.t) || (k.cdRemaining(abOf(k, 'oath')) < 8 && !k.has('oath'));
    if (k.g.resolve >= 50 && (k.has('oath') || k.g.resolve >= 75 && !pooling || (k.g.resolve >= 90 && k.g.step === 2))) return I(k, 'edge');
    return I(k, 'blade');
  },
  bloodreaver(k, ctx) {
    if (ready(k, 'frenzy') && ctx.inBurst(ctx.t) && weaveOk(k)) return I(k, 'frenzy');
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
    if (k.charges(p) === 2 || (k.charges(p) === 1 && k.cdRemaining(p) === 0 && k.cd.pierce.next - k.now < 2.5)) return I(k, 'pierce');
    if (k.has('markself') && k.charges(p) > 0) return I(k, 'pierce');
    return I(k, 'quick');
  },
  shadowblade(k, ctx) {
    if (ready(k, 'dance') && ctx.inBurst(ctx.t) && weaveOk(k) && k.g.combo <= 2) return I(k, 'dance');
    const step = abOf(k, 'step');
    if (weaveOk(k) && k.charges(step) > 0 && (k.charges(step) === 2 || ctx.isMoveWindow(ctx.t))) return I(k, 'step');
    if (k.gcdRemaining() > 0.0001) return null;
    if (k.dotRemaining('poison') < 7) return I(k, 'venom');
    const behind = true;
    if (k.g.combo >= 5 || (k.g.combo >= 4 && behind)) { ctx.setPos('flank'); return I(k, 'evis'); }
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
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    const moving = ctx.state.moving || ctx.isMoveWindow(ctx.t + 1.4);
    if (k.has('hotstreak') && (moving || !k.has('combust') || true)) return I(k, 'pyro');
    if (k.g.heat >= 84 && ready(k, 'vent')) return I(k, 'vent');
    if (moving) { if (ready(k, 'vent') && k.g.heat >= 30) return I(k, 'vent'); return null; }
    if (k.g.heat > 88) return ready(k, 'vent') ? I(k, 'vent') : null; // don't overheat
    return castOk(k, ctx, 1.8) ? I(k, 'fireball') : null;
  },
  cleric(k, ctx) {
    const debt = ctx.state.healDebt;
    if (debt > 5000 && ready(k, 'prayer') && weaveOk(k)) return I(k, 'prayer');
    if (debt > 6000 && ready(k, 'bene') && weaveOk(k)) return I(k, 'bene');
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
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
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    if (k.dotRemaining('thorn') < 9 || ctx.state.moving) return I(k, 'thorn');
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
    if (ready(k, 'shift') && weaveOk(k)) {
      if (k.g.stance === 'slow' && k.g.flux >= 95) return I(k, 'shift');
      if (k.g.stance === 'slow' && k.g.flux >= 50 && (ctx.inBurst(ctx.t) || toRw < 2)) return I(k, 'shift');
      if (k.g.stance === 'haste' && k.g.flux < 8) return I(k, 'shift');
    }
    if (k.gcdRemaining() > 0.0001 || k.cast) return null;
    if (debt > 16000 && ready(k, 'recall') && castOk(k, ctx, 2.5)) { ctx.state.gcdHeals++; return I(k, 'recall'); }
    return castOk(k, ctx, 1.5 * k.hasteMult()) || k.has('surge') ? I(k, 'bolt') : null;
  },
};

// healer DPS also gets healing debt cleared by damage-heals (Chronomancer); count Bolt heals against the debt
// (handled by env.emit 'heal').

// ---------------------------------------------------------------- run
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
