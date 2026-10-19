// Headless smoke test for a boss script: runs the fight with stand-still players dealing steady damage
// and prints what happened. Catches script errors without opening the game.
//   node tools/fight-test.js [normal|hard] [players]
const path = require('path');
Object.assign(global, require(path.join(__dirname, '../client/js/arena/shapes.js')));
const { FightSim, FIGHT } = require(path.join(__dirname, '../client/js/arena/fight.js'));
FIGHT.NUM_SCALE = 1; global.FIGHT = FIGHT;   // this smoke test's player numbers are in the original big-number units
const { GRUBNAK } = require(path.join(__dirname, '../client/js/arena/bosses/grubnak.js'));

const mode = process.argv[2] || 'normal';
const n = Number(process.argv[3] || 4);
const roles = ['tank', 'healer', 'dps', 'dps'];
const players = [];
for (let i = 0; i < n; i++) players.push({ id: i + 1, name: 'P' + (i + 1), role: roles[i], cls: roles[i], x: Math.cos(i) * 200, y: 150 + i * 20, a: 0 });
const counts = {};
let log = [];
const sim = new FightSim(GRUBNAK, mode, () => players, msg => {
  counts[msg.t] = (counts[msg.t] || 0) + 1;
  if (msg.t === 'bcast') log.push(`${sim.t.toFixed(1)} cast ${msg.name}`);
  if (msg.t === 'fev' && msg.k === 'death') log.push(`${sim.t.toFixed(1)} death P${msg.id}`);
  if (msg.t === 'fight') log.push(`${sim.t.toFixed(1)} fight ${msg.s}`);
}, 12345);
const dps = { tank: 1500, healer: 1000, dps: 2300 };
for (let step = 0; step < 20 * 600 && sim.state !== 'clear' && sim.state !== 'wipe'; step++) {
  sim.tick(0.05);
  if (sim.state === 'live') {
    for (const p of players) {
      if (step % 20 === 0) sim.onEvent(p.id, { type: 'damage', amount: dps[p.role] });
      // the healer keeps everyone topped up
      if (step % 20 === 0 && p.role === 'healer') for (const q of players) sim.onEvent(p.id, { type: 'heal', target: q.id, amount: 1500 });
    }
  }
}
console.log(log.slice(0, 80).join('\n'));
console.log('...\nresult:', sim.state, 'at', sim.t.toFixed(1), 's; boss hp', sim.boss.hp, '/', sim.boss.maxHp, '; phase', sim.phase);
console.log('messages:', counts);
console.log('stats:', Object.values(sim.stats).map(s => `${s.name} dmg ${s.damage} taken ${s.taken} deaths ${s.deaths} avoidable ${s.avoidable}`).join('\n       '));
