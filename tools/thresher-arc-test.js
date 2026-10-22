// The Thresher's wide arc (kits.js thArc): a Reap pays its full set on the main target, and every other enemy in the arc in front
// of the scythe (a boss or an add) takes 60% of the base cut as a damage event aimed at it (tgt), so threat, add HP and kill
// credit work; one behind the Thresher is not touched; with no enemiesNear (the training dummy) nothing changes.
//   node tools/thresher-arc-test.js     (exit code 0 and a final "Thresher arc OK" when everything holds)
const path = require('path');
const { ENGINE, Kit } = require(path.join(__dirname, '../client/js/combat/engine.js'));
const kitsModule = require(path.join(__dirname, '../client/js/combat/kits.js'));
const { KITS, THRESH } = kitsModule;
Object.assign(global, kitsModule);
const { kitFor } = require(path.join(__dirname, '../client/js/combat/specs.js'));
const { TALENT_BY_ID } = require(path.join(__dirname, '../client/js/combat/talents.js'));
global.TALENT_BY_ID = TALENT_BY_ID; ENGINE.NUM_SCALE = 1; ENGINE.POT_SCALE = 10; global.ENGINE = ENGINE;

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };

function run(enemies) {
  const evs = []; let t = 0;
  const boss = { id: 'boss', x: 60, y: 0, r: 60 };
  const env = {
    now: () => t, rng: () => 0.5, moving: () => false, target: ab => (ab.target === 'enemy' ? boss : ab.target === 'ally' ? 'tank' : true),
    positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}), recentDamage: () => 0, maxHp: () => 20000,
    hpFrac: () => 1, isDead: () => false, allyHp: () => 0.9, defaultLink: () => 'tank', talents: () => null, boss: () => null, pos: () => ({ x: 0, y: 0 }),
    emit: ev => evs.push(ev),
  };
  if (enemies) env.enemiesNear = range => enemies.filter(c => Math.hypot(c.x, c.y) - c.r <= range);
  const k = new Kit(kitFor('thresher', null, null), env);
  const slash = k.abilities.findIndex(a => a.id === 'slash'), reap = k.abilities.findIndex(a => a.id === 'reap');
  // lay a Mark and a Drain, then Reap
  const adv = s => { t += s; k.update(); };
  k.press(slash); adv(2); k.press(slash); adv(2);
  evs.length = 0;
  k.press(reap); for (let i = 0; i < 40; i++) adv(0.05);
  return evs.filter(e => e.type === 'damage');
}
const sum = l => l.reduce((a, e) => a + e.amount, 0);

const solo = run(null);
const withAdd = run([{ id: 'boss', x: 60, y: 0, r: 60 }, { id: 'a1', x: 70, y: 40, r: 14 }, { id: 'a2', x: -80, y: 0, r: 14 }, { id: 'a3', x: 300, y: 0, r: 14 }]);
const bossHits = withAdd.filter(e => e.tgt == null), addHits = id => withAdd.filter(e => e.tgt === id);
check(solo.length > 1 && solo.every(e => e.tgt == null), 'with no enemiesNear a Reap should only hit its target');
check(bossHits.length === solo.length && sum(bossHits) === sum(solo), 'the main target should be paid exactly as before (the full set)');
check(addHits('a1').length === 1, `an add in the arc should take one hit (got ${addHits('a1').length})`);
check(addHits('a2').length === 0, 'an add behind the Thresher should not be hit');
check(addHits('a3').length === 0, 'an add out of reach should not be hit');
check(addHits('boss').length === 0, 'the main target is not hit twice');
if (addHits('a1').length) {
  const r = addHits('a1')[0].amount / solo[0].amount;
  check(r > 0.5 && r < 0.7, `the add should take about 60% of the base cut (${r.toFixed(2)})`);
}
if (probs.length) { console.log('Thresher arc FAILED:\n - ' + probs.join('\n - ')); process.exit(1); }
console.log(`Thresher arc OK (boss set ${sum(bossHits)}, add in arc ${sum(addHits('a1'))}, behind 0)`);
