// The Kenseier's deflect and the boss's Posture (fight.js KENSEI_HOST, kits.js KENSEI), driven straight on the host: a press
// either side of a blow is judged Perfect or Good by how far apart they are (a press after the blow gives it back), Mikiri Step
// lets an avoidable hit through, a Warden's deflect reaches an ally, Off-balance, Posture filling to a Break (stagger, damage
// window, the script slid, held full through a cast), the 'fb' message's `po`, Ember Duel's steady beat; then the kit and the
// host talking to each other through a short headless fight.
//   node tools/kenseier-test.js            (exit code 0 and a final "Kenseier OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/talents.js'), load('combat/actor.js'), load('arena/fight.js'));
const { Kit } = load('combat/engine.js');
const { TALENT_BY_ID } = load('combat/talents.js');
global.TALENT_BY_ID = TALENT_BY_ID;

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };
const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;

// a three-player host: a Kenseier tank (id 1), a healer (id 2) and a damage dealer (id 3); the sim is put straight into a live fight
function make(opts = {}) {
  const ps = [{ id: 1, name: 'blade', role: 'tank', cls: 'kenseier', x: 0, y: 0 }, { id: 2, name: 'healer', role: 'healer', cls: 'cleric', x: opts.far ? 400 : 60, y: 0 }, { id: 3, name: 'dps', role: 'dps', cls: 'ranger', x: 300, y: 300 }];
  const sent = [];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 1000 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, m => sent.push(m), 7);
  sim.state = 'live'; sim.t = 100; sim.boss.autoAt = 1e9;   // (no autos but the ones the test sends)
  const find = id => sim.players().find(p => p.id === id);
  const defl = (o = {}) => sim.onEvent(1, Object.assign({ type: 'kensei', op: 'deflect', dur: 0.3, amount: 18, value: 8, mult: 30, r: 0, secs: 4, keep: 0, sh: 0, ticks: 1 }, o));
  const hit = (id = 1, kind = 'auto', raw = 1000, extra = {}) => sim.damagePlayer(find(id), raw, Object.assign({ kind }, extra));
  const post = () => sim.boss.post ? sim.boss.post.p : 0;
  return { sim, sent, find, defl, hit, post, s: sim.ps.get(1), s2: sim.ps.get(2) };
}
const fevs = (sent, k) => sent.filter(m => m.t === 'fev' && m.k === k);
const pdmgs = (sent, id = 1) => sent.filter(m => m.t === 'pdmg' && m.id === id);

// 1. a press before the blow: within 0.12 s Perfect (nothing taken, +18), up to 0.3 s Good (half, +8), further out nothing
{
  let { sim, sent, defl, hit, post, s } = make();
  const full = (() => { const h = make(); h.hit(); return pdmgs(h.sent)[0].a; })();
  check(full > 0, 'an auto should hurt a Kenseier with no deflect');
  defl(); sim.t += 0.1; hit();
  let pd = pdmgs(sent).pop();
  check(pd.a === 0 && pd.df === 2, `a Perfect should take the blow whole (a ${pd.a}, df ${pd.df})`);
  check(near(post(), 18), `a Perfect adds 18 Posture (${post()})`);
  const k = fevs(sent, 'kdef').pop();
  check(k && k.q === 2 && k.b === 0 && k.late === 0 && k.a > 0 && near(k.p, 0.09), `the Kenseier is told: Perfect, not a tankbuster, not late, what it would have dealt (${JSON.stringify(k)})`);
  check(s.defl === null, 'the window is spent by the blow it caught');
  ({ sim, sent, defl, hit, post, s } = make());
  defl(); sim.t += 0.25; hit();
  pd = pdmgs(sent).pop();
  check(Math.abs(pd.a - full * 0.5) <= 1 && pd.df === 1, `a Good should halve it (a ${pd.a} of ${full}, df ${pd.df})`);
  check(near(post(), 8), `a Good adds 8 Posture (${post()})`);
  ({ sim, sent, defl, hit, post, s } = make());
  defl(); sim.t += 0.45; hit();
  pd = pdmgs(sent).pop();
  check(pd.a === full && pd.df === undefined && post() === 0, `too early is no deflect at all (a ${pd.a}, posture ${post()})`);
  // a tankbuster Perfect adds its own number, and is marked
  ({ sim, sent, defl, hit, post, s } = make());
  defl(); sim.t += 0.05; hit(1, 'buster', 4000);
  check(near(post(), 30) && fevs(sent, 'kdef').pop().b === 1, `a tankbuster Perfect adds 30 and says so (${post()})`);
  // the window of a press expires on its own
  ({ sim, sent, defl, hit, post, s } = make());
  defl({ dur: 0.5 }); sim.t += 0.45; hit();
  check(pdmgs(sent).pop().df === 1, 'a longer window (Ash Mantle) still catches a hit 0.45 s on, as a Good');
  // a swing that is not an auto or a tankbuster is not deflected
  ({ sim, sent, defl, hit, post, s } = make());
  defl(); sim.t += 0.05; hit(1, 'aoe', 1000, { avoidable: true });
  check(pdmgs(sent).pop().a > 0 && post() === 0, 'an area hit is not something to deflect');
}

// 2. a press after the blow gives it back (Perfect whole, Good half), if it comes within the window
{
  let { sim, sent, defl, hit, post, s } = make();
  const hp0 = s.hp;
  hit(); const lost = hp0 - s.hp;
  check(lost > 0, 'the blow hurt');
  sim.t += 0.08; defl();
  check(near(s.hp, hp0, 1), `a Perfect press just after the blow gives it all back (hp ${s.hp} of ${hp0})`);
  check(near(post(), 18) && fevs(sent, 'kdef').pop().late === 1, 'and still adds its Posture, flagged late');
  ({ sim, sent, defl, hit, post, s } = make());
  hit(); sim.t += 0.2; defl();
  check(Math.abs(s.hp - (s.maxHp - lost / 2)) <= 1.5 && near(post(), 8), `a Good press after the blow gives half back (hp ${s.hp}, lost ${lost})`);
  ({ sim, sent, defl, hit, post, s } = make());
  hit(); sim.t += 0.4; defl();
  check(near(s.hp, s.maxHp - lost, 1) && post() === 0, 'a press too long after gives nothing back');
  // one blow is given back once
  ({ sim, sent, defl, hit, post, s } = make());
  hit(); sim.t += 0.05; defl(); const hp1 = s.hp; sim.t += 0.05; defl();
  check(s.hp === hp1 && near(post(), 18), 'a blow is given back once');
}

// 3. Mikiri Step: an avoidable hit that lands while it is under way passes through, +25
{
  let { sim, sent, hit, post, s } = make();
  sim.onEvent(1, { type: 'kensei', op: 'step', dur: 0.45, amount: 25, secs: 4, keep: 0 });
  sim.t += 0.2; hit(1, 'aoe', 1000, { avoidable: true });
  let pd = pdmgs(sent).pop();
  check(pd.a === 0 && pd.df === 3 && near(post(), 25) && fevs(sent, 'kdef').pop().q === 3, `a step through an avoidable hit passes it, +25 (a ${pd.a}, posture ${post()})`);
  ({ sim, sent, hit, post, s } = make());
  sim.onEvent(1, { type: 'kensei', op: 'step', dur: 0.45, amount: 25, secs: 4, keep: 0 });
  sim.t += 0.6; hit(1, 'aoe', 1000, { avoidable: true });
  check(pdmgs(sent).pop().a > 0 && post() === 0, 'a hit after the step is over lands');
  ({ sim, sent, hit, post, s } = make());
  sim.onEvent(1, { type: 'kensei', op: 'step', dur: 0.45, amount: 25, secs: 4, keep: 0 });
  hit(1, 'raidwide', 1000);
  check(pdmgs(sent).pop().a > 0, 'a raidwide is not avoidable: the step does not pass it');
}

// 4. a Warden's deflect reaches an ally in range (r), judged the same way, and costs nothing here but the window
{
  let { sim, sent, defl, hit, post, s2 } = make();
  const full = (() => { const h = make(); h.hit(2); return pdmgs(h.sent, 2)[0].a; })();
  defl({ r: 120 }); sim.t += 0.05; hit(2);
  let pd = pdmgs(sent, 2).pop(), k = fevs(sent, 'kdef').pop();
  check(pd.a === 0 && pd.df === 2 && k.to === 2 && near(post(), 18), `a deflect with reach turns a blow from an ally in range (ally took ${pd.a}, to ${k && k.to})`);
  ({ sim, sent, defl, hit, post, s2 } = make({ far: true }));
  defl({ r: 120 }); sim.t += 0.05; hit(2);
  check(pdmgs(sent, 2).pop().a === full && post() === 0, 'an ally out of reach takes the blow');
  ({ sim, sent, defl, hit, post, s2 } = make());
  defl({ r: 0 }); sim.t += 0.05; hit(2);
  check(pdmgs(sent, 2).pop().a === full, 'without reach an ally is not covered');
  // a press after the blow on an ally gives it back to them
  ({ sim, sent, defl, hit, post, s2 } = make());
  hit(2); sim.t += 0.05; defl({ r: 120 });
  check(near(s2.hp, s2.maxHp, 1) && fevs(sent, 'kdef').pop().to === 2, 'a late deflect with reach gives the ally their health back');
}

// 5. Off-balance: more damage taken, no deflects
{
  let { sim, sent, defl, hit, post, s } = make();
  const full = (() => { const h = make(); h.hit(); return pdmgs(h.sent)[0].a; })();
  sim.onEvent(1, { type: 'kensei', op: 'off', dur: 2 });
  hit(); check(Math.abs(pdmgs(sent).pop().a - full * 1.1) <= 1, `Off-balance takes 10% more (${pdmgs(sent).pop().a} vs ${full})`);
  defl(); check(s.defl === null, 'no deflects while Off-balance');
  sim.t += 2.1; defl(); check(!!s.defl, 'and deflects again when it is over');
}

// 6. Posture: it only fills from a Kenseier, a full bar Breaks, and the Break staggers the boss and exposes it
{
  let { sim, sent, post } = make();
  sim.onEvent(3, { type: 'kensei', op: 'posture', amount: 50 });
  check(post() === 0 && !sim.postureOn === false, 'only a Kenseier fills Posture');
  sim.onEvent(1, { type: 'kensei', op: 'posture', amount: 50, secs: 4, keep: 0 });
  check(near(post(), 50), `Posture from a Kenseier's own move adds (${post()})`);
  for (let i = 0; i < 2; i++) sim.onEvent(1, { type: 'kensei', op: 'posture', amount: 50, secs: 4, keep: 0 });
  check(!sim.boss.post.until, 'not yet');
  const t0 = sim.t;
  sim.onEvent(1, { type: 'kensei', op: 'posture', amount: 50, secs: 4, keep: 0 });
  const P = sim.boss.post;
  check(near(P.until - t0, 4) && P.p === 0, `a full bar Breaks for 4s and empties (until +${(P.until - t0).toFixed(2)}, p ${P.p})`);
  const kb = fevs(sent, 'kbrk').pop();
  check(kb && kb.id === 1 && near(kb.secs, 4), 'the Breaker is told');
  check(sim.boss.exposedUntil >= P.until - 0.01 && near(sim.boss.exposed, 0.15), 'the boss takes 15% more');
  sim.onEvent(3, { type: 'damage', amount: 1000, tgt: 'boss' });
  check(sim.boss.maxHp - sim.boss.hp === 1150, `a hit on a Broken boss lands 15% harder (${sim.boss.maxHp - sim.boss.hp})`);
  // stagger: it does not swing while Broken
  sim.boss.autoAt = sim.t; const hp = sim.ps.get(1).hp; sim.updateBoss(0.05);
  check(sim.ps.get(1).hp === hp && sim.boss.autoAt === sim.t, 'a Broken boss does not swing');
  // Posture added to a cracked bar is nothing
  sim.onEvent(1, { type: 'kensei', op: 'posture', amount: 50, secs: 4, keep: 0 });
  check(P.p === 0, 'a cracked bar takes nothing more');
  // the pack for the fb message: [p, max, break seconds left, held, recovering, who]
  const pk = sim.kenPack();
  check(pk[1] === 200 && near(pk[2], 4) && pk[3] === 0 && pk[5] === 1, `kenPack ${JSON.stringify(pk)}`);
  sim.broadcastBoss();
  const fb = sent.filter(m => m.t === 'fb').pop();
  check(fb && Array.isArray(fb.po) && fb.po[1] === 200, 'the fb message carries the bar (po)');
  // it ends: kbend, and the bar starts again at keep
  sim.t += 4.1; sim.kenTick(0.05);
  check(!P.until && fevs(sent, 'kbend').length === 1, 'the Break ends and the Kenseier is told');
  check(P.p === 0, 'the bar starts empty afterward');
  // Crack: a third full (keep)
  sim.onEvent(1, { type: 'kensei', op: 'posture', full: 1, secs: 4, keep: 0.125 });
  sim.t += 4.1; sim.kenTick(0.05);
  check(near(P.p, 25), `a Crack leaves 25 Posture (${P.p})`);
  // a Deathblow ends the Break early
  sim.onEvent(1, { type: 'kensei', op: 'posture', full: 1, secs: 4, keep: 0 });
  check(P.until > sim.t, 'Broken again');
  sim.onEvent(1, { type: 'kensei', op: 'end' }); sim.kenTick(0.05);
  check(!P.until && fevs(sent, 'kbend').length === 3, 'a Deathblow ends the Break at once');
}

// 7. recovery: the bar falls slowly once nothing has added to it for a while
{
  const { sim } = make();
  sim.onEvent(1, { type: 'kensei', op: 'posture', amount: 60, secs: 4, keep: 0 });
  const P = sim.boss.post;
  sim.t += 3; for (let i = 0; i < 20; i++) sim.kenTick(0.05);
  check(near(P.p, 60), 'no recovery while pressured (4 s)');
  sim.t += 2; for (let i = 0; i < 20; i++) sim.kenTick(0.05);
  check(P.p < 60 && P.p > 50, `it recovers slowly after that (${P.p})`);
}

// 8. never during a scripted cast: a full bar holds, and Breaks as the cast ends
{
  const { sim, sent } = make();
  sim.boss.cast = { name: 'Big Move', start: sim.t, end: sim.t + 3, anim: 'cast' };
  sim.onEvent(1, { type: 'kensei', op: 'posture', full: 1, secs: 4, keep: 0 });
  const P = sim.boss.post;
  check(P.hold && !P.until && P.p === 200, 'a full bar holds through a cast');
  check(sim.kenPack()[3] === 1, 'and the pack says it is held');
  sim.t += 1; sim.kenTick(0.05);
  check(P.hold && !P.until, 'still held mid-cast');
  sim.t += 2.1; sim.boss.cast = null; sim.kenTick(0.05);
  check(!P.hold && P.until > sim.t && fevs(sent, 'kbrk').length === 1, 'it Breaks as the cast ends');
}

// 9. a Break slides the script: the next steps of the course move out by the Break's length, as a Time Stop's do
{
  const { sim } = make();
  const hit = [];
  sim.curCourse = { o: { until: 0.5, next: null }, ph: sim.phase, done: false, seams: [sim.t + 20], end: sim.t + 500 };
  sim.layStep = true; sim.at(sim.t + 2, () => hit.push('a')); sim.at(sim.t + 30, () => hit.push('b')); sim.layStep = false;
  sim.atKeep(sim.t + 3, () => hit.push('keep'));   // (a kept step is not the script's: the enrage, a follow-up)
  const first = sim.events.find(e => e.step && e.t < sim.t + 10).t;
  sim.onEvent(1, { type: 'kensei', op: 'posture', full: 1, secs: 4, keep: 0 });
  const steps = sim.events.filter(e => e.step).map(e => e.t), keepAt = sim.events.find(e => e.keep).t;
  check(near(steps[0], first + 4) && near(steps[1], first + 32), `the script's steps slide out by the Break (${steps})`);
  check(near(keepAt, sim.t + 3 - 0, 0.0001) || near(keepAt, 103), 'a kept step does not slide');
  check(near(sim.curCourse.seams[0], 100 + 20 + 4) && near(sim.curCourse.end, 100 + 500 + 4), 'the course seams and end slide too');
}

// 10. Ember Duel: the boss's autos come every 2 s
{
  const { sim } = make();
  sim.boss.autoAt = sim.t + 2.8;
  sim.onEvent(1, { type: 'kensei', op: 'duel', dur: 10 });
  check(sim.boss.duelUntil > sim.t && sim.boss.autoAt <= sim.t + 2.0001, 'the next auto comes within 2 s');
  sim.boss.autoAt = sim.t; sim.updateBoss(0.05);
  check(near(sim.boss.autoAt, sim.t + 2, 0.001), `and the next after it 2 s on (${sim.boss.autoAt - sim.t})`);
  sim.t += 11; sim.boss.autoAt = sim.t; sim.updateBoss(0.05);
  check(near(sim.boss.autoAt, sim.t + FIGHT.AUTO_EVERY, 0.001), 'back to the usual beat afterward');
}

// 11. Guard Stance's shield: a deflect shields the nearest ally (two with Fireside Guard); only a deflect that caught something
{
  let { sim, sent, defl, hit, s2 } = make();
  defl({ sh: 7, ticks: 1 }); sim.t += 0.05; hit();
  check(sim.ps.get(2).shield > 0 && sim.ps.get(3).shield === 0, `the nearest ally (the healer) is shielded (${sim.ps.get(2).shield}, ${sim.ps.get(3).shield})`);
  ({ sim, sent, defl, hit, s2 } = make());
  defl({ sh: 7, ticks: 2 }); sim.t += 0.05; hit();
  check(sim.ps.get(2).shield > 0 && sim.ps.get(3).shield > 0, 'two allies with Fireside Guard');
  ({ sim, sent, defl, hit, s2 } = make());
  defl({ sh: 7 }); sim.t += 2;
  check(sim.ps.get(2).shield === 0, 'no shield without a deflect that caught a blow');
}

// 12. the Kenseier's kit and the host talking: a short headless fight (the tank deflects each auto, the kit hears the Breaks and Deathblows)
{
  const ps = [{ id: 1, name: 'blade', role: 'tank', cls: 'kenseier', x: 0, y: 0 }, { id: 2, name: 'healer', role: 'healer', cls: 'cleric', x: 60, y: 0 }, { id: 3, name: 'dps', role: 'dps', cls: 'ranger', x: 300, y: 300 }];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 300 }, script() {} };
  let kit = null;
  const sent = [];
  const sim = new FightSim(def, 'normal', () => ps, m => {
    sent.push(m);
    if (m.t === 'fev' && m.id === 1 && ['kdef', 'kbrk', 'kbend'].includes(m.k)) kit.notify(m.k, m);
    if (m.t === 'pdmg' && m.id === 1 && m.a > 0) kit.notify('taken', m);
  }, 11);
  sim.state = 'live'; sim.t = 0; sim.boss.autoAt = 3;
  const s = sim.ps.get(1);
  const EVF = ['type', 'amount', 'crit', 'target', 'ticks', 'interval', 'id', 'dur', 'tag', 'pct', 'kind', 'value', 'secs', 'threat', 'tgt', 'r', 'not', 'sh', 'op', 'mult', 'keep', 'full'];
  const env = { now: () => sim.t, rng: Math.random, moving: () => false, target: () => ({ id: 'boss', x: 0, y: -40 }), positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}),
    recentDamage: () => 0, maxHp: () => s.maxHp, hpFrac: () => s.hp / s.maxHp, isDead: () => false, talents: () => null, boss: () => null,
    emit: ev => {
      if (ev.type === 'kensei' || ev.type === 'damage' || ev.type === 'mit' || ev.type === 'heal' || ev.type === 'partyBuff') { const o = {}; for (const k of EVF) if (ev[k] !== undefined) o[k] = ev[k]; if (o.type === 'damage') o.tgt = 'boss'; sim.onEvent(1, o); }
    } };
  kit = new Kit(kitFor('kenseier', null), env);
  const W = 1, R = 3;
  let presses = 0, dbs = 0, brks = 0, planned = [];
  for (let i = 0; i < 20 * 120; i++) {
    sim.tick(0.05); kit.update();
    // the tank's own press: W 0.05 s before each auto (the boss swings at autoAt)
    const toAuto = sim.boss.autoAt - sim.t;
    if (toAuto < 0.1 && toAuto > 0.04 && !kenBroken(kit) && planned.indexOf(sim.boss.autoAt) < 0) { planned.push(sim.boss.autoAt); if (kit.press(W)) presses++; }   // (once per swing, none at a staggered boss)
    if (kit.gcdRemaining() <= 0 && kit.lockUntil <= kit.now && !(toAuto < 0.45 && toAuto > -0.1)) {   // (nothing pressed just before a swing: it would sit behind the press's animation lock)
      const was = kit.stats.casts.deathblow || 0;
      if (kit.usable(kit.abilities[R]) && kenBroken(kit)) { if (kit.press(R)) dbs++; } else kit.press(0);
      void was;
    }
  }
  brks = fevs(sent, 'kbrk').length;
  check(presses > 35 && kit.stats.perfects >= presses - 1, `the kit's Perfects register (${kit.stats.perfects} of ${presses})`);
  check(brks >= 3 && kit.stats.breaks === brks, `Breaks happen and the kit hears them (${brks}, kit ${kit.stats.breaks})`);
  check(dbs >= 1 && dbs <= brks, `a Deathblow was struck in a Break (${dbs} of ${brks})`);
  check(fevs(sent, 'kbend').length >= brks - 1, 'Breaks end');
  check(kit.g.poise === 100 && s.hp === s.maxHp, `Perfect after Perfect costs nothing (poise ${kit.g.poise}, hp ${s.hp} of ${s.maxHp})`);
  check(sim.boss.maxHp - sim.boss.hp > 0, 'the cuts reached the boss');
  // a Kenseier who does nothing takes the hits, and loses Poise for them
  const sim2 = new FightSim(def, 'normal', () => ps, m => { if (m.t === 'pdmg' && m.id === 1 && m.a > 0) kit2.notify('taken', m); }, 12);
  sim2.state = 'live'; sim2.t = 0; sim2.boss.autoAt = 3;
  const env2 = Object.assign({}, env, { now: () => sim2.t, emit: () => {} });
  const kit2 = new Kit(kitFor('kenseier', null), env2);
  for (let i = 0; i < 20 * 30; i++) { sim2.tick(0.05); kit2.update(); }
  check(kit2.g.poise < 100 && sim2.ps.get(1).hp < sim2.ps.get(1).maxHp, `undeflected hits cost Poise and health (poise ${kit2.g.poise.toFixed(0)})`);
}

if (probs.length) { console.log('Kenseier FAILED:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log('Kenseier OK: deflect early and late, Mikiri Step, reach, Off-balance, Posture, Break, the held bar, the slid script, Ember Duel, shields, kit and host together');
