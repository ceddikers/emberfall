// The Gloomsworn's Hollow (fight.js HOLLOW_HOST), driven straight on the host: a killing blow at full Gloom starts it, every
// point of damage after that is debt, healing (shields at half) pays it, and when the grace ends the knight stands up at a
// quarter of its health if the debt is covered, or falls if it is not. Doom, the enrage and a fall bypass it; a revive or a
// death clears it. Then a headless raid: a healer bot has to save a Hollow tank (the numbers print; tools/check.js runs this).
//   node tools/hollow-test.js            (exit code 0 and a final "Hollow OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { HOLLOW_HOST } = require(path.join(__dirname, '../client/js/arena/fight.js'));

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };

// a two-player host: a Gloomsworn tank (id 1) and a healer (id 2); the sim is put straight into a live fight
function make() {
  const ps = [{ id: 1, name: 'knight', role: 'tank', cls: 'gloomsworn', x: 0, y: 0 }, { id: 2, name: 'healer', role: 'healer', cls: 'cleric', x: 100, y: 100 }];
  const sent = [];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, m => sent.push(m), 7);
  sim.state = 'live'; sim.t = 100;
  const s = sim.ps.get(1);
  return { sim, s, sent, tank: () => sim.players().find(p => p.id === 1), gloom: (v, dur = 8, secs = 4, st = 60) => sim.onEvent(1, { type: 'gloom', value: v, dur, secs, st }) };
}
const kinds = (sent, k) => sent.filter(m => m.t === 'fev' && m.k === k);

// 1. a killing blow at full Gloom: Hollow begins, HP held at 1, nothing lost
{
  const { sim, s, sent, tank, gloom } = make();
  s.hp = 300; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'buster', raw: true });
  check(s.alive && s.hp === 1 && s.hollow, `a killing blow at full Gloom should start Hollow (alive ${s.alive}, hp ${s.hp})`);
  check(kinds(sent, 'hollow').length === 1 && kinds(sent, 'hollow')[0].on === 1 && kinds(sent, 'hollow')[0].d === 8 && kinds(sent, 'hollow')[0].g === 4, 'the host should announce the Hollow (8s window, 4s grace)');
  check(s.hollow && s.hollow.debt === 0, 'the killing blow itself is forgiven (debt starts at 0)');
  check(sent.filter(m => m.t === 'pdmg').every(m => m.hp >= 0), 'HP never goes below 0');
  // 2. damage while Hollow is debt, hp stays at 1
  sim.damagePlayer(tank(), 120, { kind: 'hit', raw: true });
  sim.damagePlayer(tank(), 80, { kind: 'hit', raw: true });
  check(s.hp === 1 && s.alive && s.hollow.debt === 200 * HOLLOW_HOST.DEBT, `damage while Hollow should be debt (x DEBT) (hp ${s.hp}, debt ${s.hollow && s.hollow.debt})`);
  const pd = sent.filter(m => m.t === 'pdmg').pop();
  check(pd && pd.hl === 1 && pd.hp === 1, 'a Hollow hit is sent flagged (hl) with hp 1');
  // the fps tuple carries [on, debt, healed, left, grace]
  sim.broadcastParty();
  const fps = sent.filter(m => m.t === 'fps').pop(), row = fps && fps.ps.find(r => r[0] === 1);
  check(row && Array.isArray(row[12]) && row[12][0] === 1 && row[12][1] === 200 * HOLLOW_HOST.DEBT && row[12][2] === 0, `fps row should end with the Hollow tuple (${JSON.stringify(row && row[12])})`);
  // 3. healing pays it: a heal, a shield (half) and a heal over time
  sim.applyHeal(2, 1, 200 * HOLLOW_HOST.DEBT);
  check(s.hp === 1 && s.hollow.heal === 200 * HOLLOW_HOST.DEBT, 'a heal on a Hollow knight pays the debt, not HP');
  sim.onEvent(2, { type: 'shield', target: 1, amount: 100, dur: 8 });
  check(s.hollow.heal === 200 * HOLLOW_HOST.DEBT + 50 && !s.shield, `a shield pays at half (healed ${s.hollow.heal}, shield ${s.shield})`);
  // 4. the grace ends with the debt covered: it stands up at a quarter of its HP
  sim.t += 8 + 4 + 0.1; sim.updateClass(0.05);
  check(s.alive && !s.hollow && s.hp === Math.round(s.maxHp * 0.25), `debt covered: it should stand at 25% (hp ${s.hp} of ${s.maxHp})`);
  const end = kinds(sent, 'hollow').pop();
  check(end && end.on === 0 && end.ok === 1, 'the end of a saved Hollow is announced (ok)');
  // 5. the minute: the vessel full again at once changes nothing until the cooldown is up
  s.hp = 200; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'buster', raw: true });
  check(!s.alive, 'Hollow should not come back inside its minute');
}

// 6. the debt is not covered: it falls when the grace ends (the normal death path)
{
  const { sim, s, sent, tank, gloom } = make();
  s.hp = 300; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'buster', raw: true });
  sim.damagePlayer(tank(), 400, { kind: 'hit', raw: true });
  sim.applyHeal(2, 1, 100);   // (400 x DEBT written down, 100 healed)
  sim.t += 11; sim.updateClass(0.05);
  check(s.alive && s.hollow, 'inside the grace it should still be Hollow');
  sim.t += 1.5; sim.updateClass(0.05);
  check(!s.alive && !s.hollow && s.hp === 0, `an unpaid debt should kill at the end of the grace (alive ${s.alive}, hp ${s.hp})`);
  check(kinds(sent, 'death').length === 1 && kinds(sent, 'hollow').pop().ok === 0, 'the death and the failed Hollow are announced');
  check(sim.stats[1].deaths === 1, 'the death is counted');
}

// 7. sentences bypass it: doom, the enrage and a fall kill a knight with a full vessel; a Hollow ends with its death
for (const kind of ['doom', 'enrage', 'fall']) {
  const { sim, s, tank, gloom } = make();
  gloom(100);
  sim.damagePlayer(tank(), 9999999, { kind });
  check(!s.alive && !s.hollow, `${kind} should kill a knight with a full vessel`);
}
{
  const { sim, s, tank, gloom } = make();
  s.hp = 300; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'buster', raw: true });
  sim.damagePlayer(tank(), 9999999, { kind: 'enrage' });
  check(!s.alive && s.hollow == null && s.glm == null, 'the enrage should kill a Hollow knight and clear its state');
}
// a 'fall' that is only a survivable drop is still a fall: no Hollow
{
  const { sim, s, tank, gloom } = make();
  s.hp = 100; gloom(100);
  sim.damagePlayer(tank(), 500, { kind: 'fall', raw: true });
  check(!s.alive && !s.hollow, 'a killing fall is no Hollow');
}

// 8. not full, stale, or the wrong class: no Hollow
{
  const { sim, s, tank, gloom } = make();
  s.hp = 100; gloom(99);
  sim.damagePlayer(tank(), 500, { kind: 'hit', raw: true });
  check(!s.alive && !s.hollow, 'Gloom 99 is not full: it should die');
}
{
  const { sim, s, tank, gloom } = make();
  s.hp = 100; gloom(100); sim.t += 5;
  sim.damagePlayer(tank(), 500, { kind: 'hit', raw: true });
  check(!s.alive && !s.hollow, 'a Gloom report 5s old is stale: it should die');
}
{
  const { sim, tank, gloom } = make();
  const h = sim.ps.get(2); h.hp = 50;
  sim.onEvent(2, { type: 'gloom', value: 100 });
  sim.damagePlayer(sim.players().find(p => p.id === 2), 500, { kind: 'hit', raw: true });
  check(!h.alive && !h.glm, 'a healer cannot go Hollow, whatever it sends');
  void tank; void gloom;
}
// a hit that does not kill leaves it alone
{
  const { sim, s, tank, gloom } = make();
  gloom(100);
  sim.damagePlayer(tank(), 300, { kind: 'hit', raw: true });
  check(s.alive && !s.hollow && s.hp === s.maxHp - 300, 'a hit that does not kill should not start Hollow');
}

// 9. a revive clears it; so does a death by anything else
{
  const { sim, s, tank, gloom } = make();
  s.hp = 300; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'buster', raw: true });
  sim.revive(1, s, 0.5, 2);
  check(!s.hollow && s.alive && s.hp > 1, 'a revive should clear Hollow');
}

// 10. the numbers on a shielded knight: a shield up before the blow soaks it first (and a Hollow is not started by a hit that does not kill)
{
  const { sim, s, tank, gloom } = make();
  s.hp = 300; s.shield = 5000; s.shieldMax = 5000; s.shieldEnd = 999; gloom(100);
  sim.damagePlayer(tank(), 2000, { kind: 'hit', raw: true });
  check(s.alive && !s.hollow && s.hp === 300, 'a shield that soaks the blow means no Hollow');
}

// ---------------------------------------------------------------- the headless raid: a healer bot saves a Hollow tank
function raid(seed, healer) {
  const events = [];
  const host = new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => [], bots: ['gloomsworn:base', healer, 'ranger:base', 'pyromancer:base'], seed, emit: m => events.push(m) });
  const origEmit = host.emitOut; host.emitOut = m => { events.push(m); origEmit(m); };
  let guard = 0;
  while (host.sim.state !== 'live' && guard++ < 400) host.tick(0.05);
  const sim = host.sim, tank = host.bots[0], s = sim.ps.get(tank.id);
  // twenty seconds in: a full vessel, a sliver of health, and a blow that would kill
  while (sim.t < 20) host.tick(0.05);
  const kit = tank.actor.kit;
  kit.g.gloom = 100; kit.g.sentAt = -9; kit.g.sentV = -1; s.hp = Math.round(s.maxHp * 0.12);
  host.tick(0.05);   // (the kit tells the host its vessel is full, as it does a few times a second)
  check(s.glm && s.glm.v === 100, 'the bot kit should have reported a full vessel to the host');
  sim.damagePlayer(sim.players().find(p => p.id === tank.id), s.maxHp, { kind: 'buster', raw: true });
  const began = !!s.hollow;
  while (sim.t < 20 + 20 && sim.state === 'live') host.tick(0.05);
  const ends = events.filter(m => m.t === 'fev' && m.k === 'hollow' && !m.on);
  return { began, saved: ends.some(m => m.ok), fell: ends.some(m => !m.ok), end: ends[0] };
}
const results = [];
for (const [seed, healer] of [[11, 'cleric:base'], [12, 'grovekeeper:base'], [13, 'chronomancer:base'], [14, 'alembist:base'], [15, 'threadweaver:base']]) {
  const r = raid(seed, healer);
  results.push(`${healer.split(':')[0]}: ${r.began ? (r.saved ? `saved (debt ${r.end.debt}, healed ${r.end.heal})` : `fell (debt ${r.end.debt}, healed ${r.end.heal})`) : 'no Hollow'}`);
  check(r.began, `${healer}: the blow should start a Hollow in the bot raid`);
}
const saves = results.filter(r => /saved/.test(r)).length;
check(saves >= 3, `at least three of five healer bots should save a Hollow tank (saved ${saves}: ${results.join('; ')})`);
console.log('healer bots vs a Hollow tank: ' + results.join('; '));

if (probs.length) { console.log(probs.join('\n')); console.log('Hollow FAILED'); process.exit(1); }
console.log(`Hollow OK (HOLLOW_HOST: ${HOLLOW_HOST.DUR}s + ${HOLLOW_HOST.GRACE}s grace, a quarter of its health on waking; ${saves} of 5 healer bots saved the knight)`);
