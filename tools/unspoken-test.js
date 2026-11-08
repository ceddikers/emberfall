// The engine pieces that percentage hits, frozen heroes, blade lines, guard rings and coffins rest on (fight.js), driven straight on the host:
//   - a blade line is stopped by the first tank in it (everyone before and at the tank is hit, those behind are spared); with no tank all in the line are hit;
//     'first' stops at any hero, 'none' at nothing; every hit hero is frozen, a tank for half the time; thaw ends it; onResolve gets the hit and the stop point
//   - opts.pct takes a share of current health and skips Vulnerability, the Normal slip cap and Damage Down, while cooldowns still cut it
//   - the live telegraph is re-shaped (tgmod) when a tank steps into the line and when they step out
//   - a blade line with shatter breaks the pillar props it crosses before its stop point (and not those beyond it)
//   - a guard ring hands the hit to whoever else stands in it, else to its target
//   - a coffin freezes and silences its hero (heals and shields give nothing), breaks on its hp, at its time and on breakCoffin
//   - def.noSlipCap lifts the Normal slip cap; boss.hover goes out as hv
//   node tools/unspoken-test.js          (exit code 0 and a final "Unspoken OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
const { FIGHT } = load('arena/fight.js');
const { SOVEREIGN } = load('arena/bosses/sovereign.js');

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };

// a four-hero host: tank 1, DPS 2 and 3, healer 4; the boss stands in the middle of a round room; the sim is put straight into a live fight
function make(defExtra = {}) {
  const ps = [
    { id: 1, name: 'tank', role: 'tank', cls: 'bastion', x: 0, y: 300 },
    { id: 2, name: 'dps a', role: 'dps', cls: 'ranger', x: 400, y: 0 },
    { id: 3, name: 'dps b', role: 'dps', cls: 'pyromancer', x: 100, y: 0 },
    { id: 4, name: 'healer', role: 'healer', cls: 'cleric', x: -300, y: -300 },
  ];
  const sent = [];
  const def = Object.assign({ id: 'unspoken-test', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, spawn: { x: 0, y: 0 }, script() {} }, defExtra);
  const sim = new FightSim(def, 'normal', () => ps, m => sent.push(m), 7);
  sim.state = 'live'; sim.t = 100;
  const at = (id, x, y) => { const p = ps.find(q => q.id === id); p.x = x; p.y = y; };
  const hero = id => sim.players().find(p => p.id === id);
  const st = id => sim.ps.get(id);
  // run the sim to t (mechs resolve on updateMechs)
  const run = to => { while (sim.t < to - 1e-9) { sim.t = Math.min(to, sim.t + 0.05); sim.updateMechs(); sim.updateAdds(0.05); } };
  return { sim, ps, sent, at, hero, st, run };
}
const pd = (sent, id) => sent.filter(m => m.t === 'pdmg' && m.id === id);
const hasRoomev = (sent, k, id) => sent.some(m => m.t === 'roomev' && m.k === k && m.id === id);

// 1. a tank in the line stops it: those before it and the tank are hit and frozen, the one behind is spared
{
  const { sim, sent, at, st, run } = make();
  at(1, 220, 0);   // the tank, 220 from the boss on the line to hero 2 (at 400, 0)
  at(3, 120, 0);   // a DPS in front of the tank
  let resolved = null;
  const m = sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, freeze: 2, tag: 'tline', onResolve: (hit, stopAt) => { resolved = { ids: hit.map(p => p.id).sort(), stopAt }; } });
  check(m.type === 'aoe' && m.shape.kind === 'rect' && m.tag === 'tline', 'a blade line is an aoe rect mech with its tag');
  const tg = sent.find(x => x.t === 'tg' && x.id === m.id);
  check(tg && tg.shape.kind === 'rect' && tg.aim === 2, 'the line is sent as a rect telegraph aimed from the boss at its target');
  check(tg && tg.shape.len < 260 && tg.shape.len > 200, `the line is drawn cut short at the tank (len ${tg && tg.shape.len})`);
  run(101.2);
  check(resolved && resolved.ids.join() === '1,3', `the tank and the DPS before it are hit, the one behind is spared (hit ${resolved && resolved.ids})`);
  check(resolved && Math.hypot(resolved.stopAt.x - 220, resolved.stopAt.y) < 2, 'onResolve gets the tank as the stop point');
  check(pd(sent, 3).length === 1 && pd(sent, 1).length === 1 && pd(sent, 2).length === 0, 'only the two in front take damage');
  check(pd(sent, 3)[0] && pd(sent, 3)[0].pc === 1, 'a percentage hit goes out flagged pc');
  const t0 = sim.t;
  check(st(3).debuffs.frozen > t0 && st(3).debuffs.rooted > t0, 'a hit DPS is frozen and rooted');
  check(Math.abs((st(3).debuffs.frozen - 101) - 2) < 0.2, `a DPS is frozen the full 2 s (${(st(3).debuffs.frozen - 101).toFixed(2)})`);
  check(Math.abs((st(1).debuffs.frozen - 101) - 1) < 0.2, `a tank is frozen half as long (${(st(1).debuffs.frozen - 101).toFixed(2)})`);
  check(!(st(2).debuffs.frozen > 0), 'the spared DPS is not frozen');
  check(hasRoomev(sent, 'hdfreeze', 3) && hasRoomev(sent, 'hdfreeze', 1), 'hdfreeze goes out for each frozen hero');
  const fz = sent.find(x => x.k === 'hdfreeze' && x.id === 1), fd = sent.find(x => x.k === 'hdfreeze' && x.id === 3);
  check(fz && fd && fz.dur < fd.dur, 'the tank hdfreeze dur is the shorter');
  // thaw
  check(sim.thaw(3) && !(st(3).debuffs.frozen > sim.t) && !(st(3).debuffs.rooted > sim.t), 'thaw clears both debuffs');
  check(hasRoomev(sent, 'hdthaw', 3), 'hdthaw goes out');
  check(!sim.thaw(3), 'thawing a hero who is not frozen does nothing');
  // the party message carries the frozen debuff
  sim.broadcastParty();
  const row = sent.filter(x => x.t === 'fps').pop().ps.find(r => r[0] === 1);
  check(row && row[9].some(d => d[0] === 'frozen'), 'broadcastParty lists the frozen debuff');
}

// 2. no tank in the line: both heroes in it are hit and frozen
{
  const { sim, sent, at, st, run } = make();
  at(3, 200, 10);
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, freeze: 2 });
  run(101.2);
  check(pd(sent, 2).length === 1 && pd(sent, 3).length === 1 && pd(sent, 1).length === 0, 'with no tank in the line both heroes in it are hit');
  check(st(2).debuffs.frozen > sim.t && st(3).debuffs.frozen > sim.t, 'both are frozen');
}

// 3. stop 'first' stops at any hero; stop 'none' at nothing
{
  const { sim, sent, at, run } = make();
  at(3, 150, 0); at(1, 250, 0);
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, stop: 'first' });
  run(101.2);
  check(pd(sent, 3).length === 1 && pd(sent, 1).length === 0 && pd(sent, 2).length === 0, "stop 'first': only the first hero in the line is hit");
}
{
  const { sim, sent, at, run } = make();
  at(3, 150, 0); at(1, 250, 0);
  let stopAt = null;
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, stop: 'none', onResolve: (h, s) => { stopAt = s; } });
  run(101.2);
  check(pd(sent, 3).length === 1 && pd(sent, 1).length === 1 && pd(sent, 2).length === 1, "stop 'none': a tank in the line stops nothing");
  check(stopAt && stopAt.x > 480 && stopAt.x <= 521, `stop 'none' ends at the wall (${stopAt && Math.round(stopAt.x)})`);
}

// 4. freeze 0: damage with no freeze; a fixed dmg line
{
  const { sim, sent, at, st, run } = make();
  at(1, 500, 500);
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, dmg: 1000, freeze: 0 });
  run(101.2);
  check(pd(sent, 2).length === 1 && !(pd(sent, 2)[0].pc) && !(st(2).debuffs.frozen > 0), 'freeze 0 and a fixed dmg: a plain hit with no pc flag and no freeze');
}

// 5. percentage hits: current health, no Vulnerability, no slip cap, no Damage Down, cooldowns still cut
{
  const { sim, st, hero, sent } = make();
  const s = st(2);
  s.hp = 800; s.vuln = 0.3; s.vulnEnd = sim.t + 10;
  const a = sim.damagePlayer(hero(2), 0, { kind: 'pcTest', pct: 0.7, avoidable: true, ddown: true });
  check(a === 560, `70% of current health (800) is 560, Vulnerability not counted (got ${a})`);
  check(s.vuln === 0.3 && s.vulnEnd <= sim.t + 10, 'a percentage hit gives no new Vulnerability');
  check(!(s.dmgDownEnd > sim.t), 'a percentage hit never gives Damage Down');
  check(sent.filter(m => m.t === 'pdmg').pop().pc === 1, 'the pdmg message carries pc: 1');
  s.hp = s.maxHp; s.vulnEnd = 0;
  const b = sim.damagePlayer(hero(2), 0, { kind: 'pcTest', pct: 0.95, avoidable: true });
  check(b === Math.round(s.maxHp * 0.95), `a percentage hit is not slip-capped on Normal (took ${b} of ${s.maxHp})`);
  s.hp = s.maxHp; s.vulnEnd = 0;
  const c = sim.damagePlayer(hero(2), 1e9, { kind: 'fixedTest', avoidable: true });
  check(c <= Math.round(s.maxHp * FIGHT.NORMAL_SLIP_CAP), `(control) a fixed avoidable hit IS capped on Normal (took ${c})`);
  // a cooldown cuts it, a shield eats it
  s.hp = 1000; s.vulnEnd = 0; s.mits.push({ pct: 0.5, start: sim.t, end: sim.t + 10, kind: 'cd', from: 4 });
  const d = sim.damagePlayer(hero(2), 0, { kind: 'pcTest', pct: 0.8 });
  check(d === 400, `a 50% cooldown halves an 80% hit of 1000 (took ${d})`);
  s.mits = []; s.hp = 1000;
  sim.giveShield(4, 2, s, 300, 10, 'test');
  const e = sim.damagePlayer(hero(2), 0, { kind: 'pcTest', pct: 0.5 });
  check(e === 200 && s.hp === 800, `a shield of 300 eats most of a 500 hit (took ${e}, hp ${s.hp})`);
}
{
  const { sim, st, hero } = make({ noSlipCap: true });
  const s = st(2);
  const c = sim.damagePlayer(hero(2), 1e9, { kind: 'fixedTest', avoidable: true });
  check(c >= s.maxHp, `def.noSlipCap lifts the Normal slip cap (took ${c} of ${s.maxHp})`);
  check(SOVEREIGN.noSlipCap === true, 'the Sovereign sets noSlipCap');
}

// 6. a mech with pct: a raidwide share of current health
{
  const { sim, sent, st, run } = make();
  st(2).hp = 500;
  sim.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 1, pct: 0.5, hidden: true });
  run(101.2);
  check(pd(sent, 2)[0] && pd(sent, 2)[0].a === 250 && pd(sent, 2)[0].pc === 1, 'a mech with pct takes that share of current health from everyone');
}

// 7. tgmod: the live telegraph is cut short when a tank steps in, and grows back when they step out
{
  const { sim, sent, at, run } = make();
  const m = sim.bladeLine({ to: 2, delay: 3, lock: 0.5, pct: 0.7 });
  const full = sent.find(x => x.t === 'tg' && x.id === m.id).shape.len;
  check(full > 500, `with no tank the line runs to the wall (${full})`);
  run(100.5);
  check(!sent.some(x => x.t === 'tgmod'), 'no tgmod while nothing changes');
  at(1, 250, 0); run(100.7);
  const mod = sent.filter(x => x.t === 'tgmod' && x.id === m.id).pop();
  check(mod && mod.shape.kind === 'rect' && mod.shape.len < 280 && mod.shape.len > 240, `tgmod clips the line at the tank (${mod && mod.shape.len})`);
  at(1, 0, 300); run(101.2);
  const mod2 = sent.filter(x => x.t === 'tgmod' && x.id === m.id).pop();
  check(mod2 && mod2.shape.len > 480, `tgmod unclips when the tank steps out (${mod2 && mod2.shape.len})`);
}

// 8. shatter: pillars in the line before the stop point break, in order; those beyond it and off to the side stand
{
  const { sim, sent, at, run } = make();
  at(1, 300, 0);
  const mk = (x, y) => sim.addProp({ kind: 'pillar', x, y, r: 34, hp: 1, solid: true, cover: true, rubble: false });
  const near = mk(120, 0), side = mk(120, 300), behind = mk(420, 0);
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, shatter: true });
  run(101.2);
  check(!sim.props.includes(near), 'the pillar in the line before the tank breaks');
  check(sim.props.includes(side), 'a pillar off to the side stands');
  check(sim.props.includes(behind), 'a pillar behind the tank (past the stop point) stands');
  const br = sent.filter(x => x.t === 'propfx' && x.k === 'break');
  check(br.length === 1 && br[0].how === 'blade' && br[0].kind === 'pillar', 'the break is announced as propfx break, how blade');
}
{
  const { sim, at, run } = make();
  at(1, 300, 0);
  const a = sim.addProp({ kind: 'pillar', x: 200, y: 0, r: 34, hp: 1, solid: true, cover: true, rubble: false }), b = sim.addProp({ kind: 'pillar', x: 450, y: 0, r: 34, hp: 1, solid: true, cover: true, rubble: false });
  sim.bladeLine({ to: 2, delay: 1, lock: 0.5, pct: 0.7, shatter: true, stop: 'none' });
  run(101.2);
  check(!sim.props.includes(a) && !sim.props.includes(b), "stop 'none' with shatter breaks every pillar in the line to the wall");
}

// 9. the guard ring: someone else standing in it takes the hit; nobody else, the target takes it where they stand
{
  const { sim, sent, at, run } = make();
  at(2, 0, -200);                       // the target
  at(1, 50, -200); at(3, 95, -200);    // two others in the ring (r 56 round 80, -200): hero 3 is nearer its centre
  sim.mech({ type: 'guard', shape: { kind: 'circle', x: 80, y: -200, r: 56 }, target: 2, delay: 1, dmg: 2000, tag: 'gtest', need: 1 });
  const tg = sent.find(x => x.t === 'tg' && x.type === 'guard');
  check(tg && tg.target === 2 && tg.need === 1, 'the guard ring is sent as a telegraph of type guard with its target');
  run(101.2);
  const hitIds = sent.filter(x => x.t === 'pdmg' && x.k === 'gtest').map(x => x.id);
  check(hitIds.length === 1, `exactly one hero takes the ring (${hitIds})`);
  check(hitIds[0] === 3, 'the one nearest the ring centre takes it, not the target');
  check(sim.stats[hitIds[0]].soaked === 1, 'it counts as a soak');
}
{
  const { sim, sent, at, run } = make();
  at(2, 0, -200); at(1, 400, 300); at(3, 300, 300);
  sim.mech({ type: 'guard', shape: { kind: 'circle', x: 80, y: -200, r: 56 }, target: 2, delay: 1, dmg: 2000, tag: 'gtest', need: 1 });
  run(101.2);
  const hitIds = sent.filter(x => x.t === 'pdmg' && x.k === 'gtest').map(x => x.id);
  check(hitIds.length === 1 && hitIds[0] === 2, `with nobody else in the ring the target takes it (${hitIds})`);
}
{
  const { sim, sent, at, run } = make();
  at(2, 80, -200); at(1, 90, -200);      // the target stands in its own ring with a tank: the tank still covers
  sim.mech({ type: 'guard', shape: { kind: 'circle', x: 80, y: -200, r: 56 }, target: 2, delay: 1, pct: 0.5, tag: 'gtest', need: 1 });
  run(101.2);
  const h = sent.filter(x => x.t === 'pdmg' && x.k === 'gtest');
  check(h.length === 1 && h[0].id === 1 && h[0].pc === 1, 'the target standing in its own ring does not count as covering; another hero in it does (and a pct guard hit is a pc hit)');
}

// 10. the coffin: frozen and silenced, breaks on its hp, at its time and on request
{
  const { sim, sent, st, hero } = make();
  st(2).hp = 300;
  const a = sim.coffin(4, { hp: 1000, dur: 5, name: 'Burial' });
  check(a && a.kind === 'coffin' && a.held === 4 && a.inert && sim.coffinOf(4) === a && sim.coffinOf(2) === null, 'a coffin is an inert add of kind coffin held by the hero');
  check(st(4).debuffs.coffin > sim.t && st(4).debuffs.frozen > sim.t && st(4).debuffs.rooted > sim.t, 'the hero is coffined, frozen and rooted');
  check(a.hp === Math.round(1000 * sim.scale.hp), 'its hp is scaled by scale.hp');
  sim.applyHeal(4, 2, 500);
  check(st(2).hp === 300, 'a coffined hero heals no one');
  sim.applyHeal(4, 4, 500);
  sim.giveShield(4, 2, st(2), 500, 10, 'test');
  check(st(2).shield === 0, 'a coffined hero shields no one');
  sim.applyHeal(3, 2, 100);
  check(st(2).hp === 400, 'others still heal (the control)');
  sim.broadcastBoss();
  const adds = sent.filter(x => x.t === 'adds').pop();
  check(adds && adds.l.some(r => r[1] === 'coffin' && r[9] === 4), 'the adds message carries the held hero as element 9');
  // it breaks on its hp
  const dmgFx = sent.length;
  sim.damageAdd(2, a, a.maxHp);
  check(sim.coffinOf(4) === null && !(st(4).debuffs.coffin > sim.t) && !(st(4).debuffs.frozen > sim.t) && !(st(4).debuffs.rooted > sim.t), 'a broken coffin frees the hero');
  check(sent.slice(dmgFx).some(x => x.t === 'addev' && x.k === 'death' && x.id === a.id), 'the coffin breaks like any add (addev death)');
  sim.applyHeal(4, 2, 100);
  check(st(2).hp === 500, 'the hero heals again once it is broken');
  void hero;
}
{
  const { sim, st } = make();
  const a = sim.coffin(4, { hp: 1e9, dur: 5 });
  sim.t += 4.9; sim.updateAdds(0.05);
  check(sim.coffinOf(4) === a, 'the coffin still stands before its time');
  sim.t += 0.2; sim.updateAdds(0.05);
  check(sim.coffinOf(4) === null && !(st(4).debuffs.coffin > sim.t), 'the coffin breaks at its time');
  const b = sim.coffin(4, { hp: 1e9, dur: 5 });
  check(sim.breakCoffin(4) && sim.coffinOf(4) === null && b && !(st(4).debuffs.frozen > sim.t), 'breakCoffin breaks it early and thaws the hero');
  check(!sim.breakCoffin(4), 'breaking a hero with no coffin does nothing');
  const c = sim.coffin(4, { hp: 1e9, dur: 20 });
  st(4).alive = false; sim.updateAdds(0.05);
  check(sim.coffinOf(4) === null && c, 'a coffin on a fallen hero is gone');
}

// 11. a cleanse does not lift a freeze; a daze does not shorten one; a raise clears it
{
  const { sim, st } = make();
  sim.freeze(2, 6);
  sim.onEvent(4, { type: 'heal', target: 2, amount: 0, cl: 2 });
  check(st(2).debuffs.rooted > sim.t + 5, 'a cleanse leaves a freeze alone');
  sim.debuff(2, 'rooted', 0.6);
  check(st(2).debuffs.rooted > sim.t + 5, 'a daze never shortens a freeze');
  sim.freeze(1, 6);
  check(Math.abs(st(1).debuffs.frozen - sim.t - 3) < 0.01, 'a tank freeze is half the length');
  sim.thaw(2);
  check(!(st(2).debuffs.rooted > sim.t), 'thaw lifts the root it laid');
}

// 12. hover goes out as hv
{
  const { sim, sent } = make();
  sim.broadcastBoss();
  check(sent.filter(x => x.t === 'fb').pop().hv === 0, 'fb carries hv 0 on the ground');
  sim.boss.hover = 1; sim.broadcastBoss();
  check(sent.filter(x => x.t === 'fb').pop().hv === 1, 'fb carries hv 1 while hovering');
}

if (probs.length) { console.log('Unspoken FAILED:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log('Unspoken OK: blade lines, tank body-block, freeze and thaw, percentage hits, guard ring, coffin, pillars, tgmod, hover');
