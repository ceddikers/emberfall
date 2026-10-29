// A set piece (fight.js FightSim.setPiece), driven headless on the host with a tiny test boss: a raidwide at 10 s, a set piece at 5 s
// lasting 8 s (the first 3 s invulnerable) and an enrage at 20 s. While it runs the boss's clocks and the party's timers stand
// still (the raidwide lands at 18 s, the enrage moves to 28 s, a debuff keeps its time), the boss takes no damage in the opening and
// nothing hits the party, while cooldowns run on, bots hold their Ultimates and the host announces it once.
//   node tools/setpiece-test.js          (exit code 0 and a final "Set piece OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };
const near = (a, b, tol = 0.11) => Math.abs(a - b) <= tol;

const ps = [{ id: 1, name: 'knight', role: 'tank', cls: 'bastion', x: 0, y: -10 }, { id: 2, name: 'striker', role: 'dps', cls: 'ranger', x: 60, y: 40 }];
const sent = [];
let sim;
const def = {
  id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, enrage: { normal: 20 },
  script(f) {
    f.course({ sets: [[
      [5, () => { f.debuff(1, 'burn', 6); f.setPiece({ id: 'test', dur: 8, invul: 3, run: () => { ran++; } }); }, 'Set piece'],
      [5, () => f.raidwide(3000), 'Wave'],
    ]] });
  },
};
let ran = 0, enrageAt = null, wallAt = null, tauntAt1 = null;
sim = new FightSim(def, 'normal', () => ps, m => sent.push(Object.assign({ at: sim.t }, m)), 7);
sim.enrage = function () { enrageAt = this.t; };   // (the real one casts for 8 s and kills: only when it comes is wanted)
sim.pull();

const hp = () => sim.boss.hp;
const hit = () => sim.onEvent(2, { type: 'damage', amount: 1000, tgt: 'boss' });
const marks = {};
const at = (t, fn) => marks[t] = fn;
let probe = {};

// what to do at which second (the sim ticks 0.05 s at a time)
at(1, () => { check(sim.taunt(1, 'boss'), 'the tank should be able to taunt at 1 s'); });
at(4, () => { const h = hp(); hit(); check(hp() === h - 1000, 'a hit before the set piece lands'); });
at(6, () => { probe.hp6 = hp(); hit(); probe.hp6b = hp(); probe.hold6 = sim.setPieceHold(); probe.inv6 = sim.setPieceInvul(); probe.pb = sim.pauseBlock(); probe.dp = sim.damagePlayer(sim.players()[0], 500, { kind: 'cast' }); probe.self = sim.damagePlayer(sim.players()[0], 10, { kind: 'self', raw: true }); });
at(7.9, () => { probe.hp79 = hp(); hit(); probe.hp79b = hp(); });
at(9, () => { probe.inv9 = sim.setPieceInvul(); probe.hold9 = sim.setPieceHold(); probe.hp9 = hp(); hit(); probe.hp9b = hp(); probe.taken9 = sent.filter(m => m.t === 'pdmg' && m.a > 0 && m.k !== 'self').length; });
at(13, () => { probe.left13 = sim.ps.get(1).debuffs.burn - sim.t; probe.taunt13 = sim.taunt(1, 'boss'); probe.tauntLeft13 = sim.ps.get(1).tauntReady - sim.t; probe.hold13 = sim.setPieceHold(); });
at(14, () => { probe.hold14 = sim.setPieceHold(); probe.pb14 = sim.pauseBlock(); });
at(21, () => { probe.taunt21 = sim.taunt(1, 'boss'); });

let t = 0;
const dt = 0.05;
for (let i = 1; i <= 40 / dt; i++) {
  sim.tick(dt); t = sim.t;
  if (wallAt == null) { const w = sent.find(m => m.t === 'pdmg' && m.a > 0 && m.k !== 'self'); if (w) wallAt = w.at; }
  for (const k of Object.keys(marks)) if (t >= +k - 1e-9) { const fn = marks[k]; delete marks[k]; fn(); }
  if (enrageAt != null && t > enrageAt + 1) break;
}

// the set piece was announced once, with its numbers
const sp = sent.filter(m => m.t === 'setpiece');
check(sp.length === 1 && sp[0].id === 'test' && sp[0].dur === 8 && sp[0].invul === 3, `the host should announce { setpiece, test, 8, 3 } once (${JSON.stringify(sp)})`);
check(near(sp[0] && sp[0].at, 5), `it should begin at 5 s (${sp[0] && sp[0].at})`);
check(ran === 1, `run(f) should be called once (${ran})`);
// the clocks
check(wallAt != null && near(wallAt, 18), `the raidwide set for 10 s should land at 18 s (${wallAt})`);
check(enrageAt != null && near(enrageAt, 28), `the enrage set for 20 s should come at 28 s (${enrageAt})`);
check(near(sim.spShift, 8, 1e-6), `the clock should have stood still 8 s in all (${sim.spShift})`);
check(near(probe.left13, 6, 0.06), `a debuff with 6 s left at 5 s should still have 6 s left at 13 s (${probe.left13})`);
// the boss's health
check(probe.hp6b === probe.hp6, 'no damage to the boss at 6 s (the opening)');
check(probe.hp79b === probe.hp79, 'no damage to the boss at 7.9 s (the last of the opening)');
check(probe.hp9b === probe.hp9 - 1000, `damage lands again once the opening is over, at 9 s (${probe.hp9} -> ${probe.hp9b})`);
// the party
check(probe.dp === 0, 'a boss hit during a set piece does no damage');
check(probe.self > 0, 'a self-inflicted cost still lands');
check(probe.taken9 === 0, 'no hit reaches the party during a set piece');
// what keeps running
check(probe.taunt13 === false && near(probe.tauntLeft13, 7, 0.1), `the taunt cooldown (20 s from 1 s) should keep running through the set piece (${probe.tauntLeft13} left at 13 s)`);
check(probe.taunt21 === true, 'the taunt should be ready again at 21 s');
// bots and Time Stops
check(probe.hold6 === true && probe.inv6 === true, 'bots hold their Ultimate and the Limit Break through the Immune opening');
check(probe.hold9 === true && probe.inv9 === false, 'past the opening bots may burst again, as a person may (the script still holds its own clocks)');
check(probe.hold14 === false, 'bots may press them again afterwards');
check(probe.pb === 'set piece', `no Time Stop in a set piece (${probe.pb})`);
// and a set piece asked for when it can't start
check(new FightSim(def, 'normal', () => ps, () => {}, 7).setPiece({ id: 'x', dur: 3 }) === false, 'a set piece does not start before the pull');
// the bar's enrage clock
const fb = sent.filter(m => m.t === 'fb');
check(fb.length && fb[fb.length - 1].pz === 8, `fb should carry pz = 8 afterwards (${fb.length && fb[fb.length - 1].pz})`);

if (probs.length) { console.log('Set piece FAILED:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log(`Set piece OK (raidwide at ${wallAt.toFixed(2)} s, enrage at ${enrageAt.toFixed(2)} s, debuff left ${probe.left13.toFixed(2)} s, taunt left ${probe.tauntLeft13.toFixed(2)} s)`);
