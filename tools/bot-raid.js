// Headless raid with a full bot party: checks the boss script, the kits and the bot AI together,
// and gives a rough idea of clear times and death counts.
//   node tools/bot-raid.js [normal|hard] [runs] [classes comma-separated] [boss id]
//   e.g. node tools/bot-raid.js normal 5 skitterra   (arguments can come in any order; the boss defaults to grubnak)
const path = require('path');
const load = (p) => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/raid-host.js'));
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { SKITTERRA } = load('arena/bosses/skitterra.js');
const { VOLKAR } = load('arena/bosses/volkar.js');
const { HOLLOWKING } = load('arena/bosses/hollowking.js');
const DEFS = { grubnak: GRUBNAK, skitterra: SKITTERRA, volkar: VOLKAR, hollowking: HOLLOWKING };
const { TRIALS, trialDef } = load('arena/trials.js');

let mode = 'normal', runs = 3, comp = 'bastion,cleric,ranger,pyromancer'.split(','), def = GRUBNAK;
for (const a of process.argv.slice(2)) {
  if (a === 'normal' || a === 'hard') mode = a;
  else if (/^\d+$/.test(a)) runs = Number(a);
  else if (DEFS[a]) def = DEFS[a];
  // trial:<spec> runs that spec's trial, with a bot taking it (or 'trial:<spec>:base' to try it with the base kit)
  else if (/^trial:\w+/.test(a) && TRIALS[a.split(':')[1]]) { const T = TRIALS[a.split(':')[1]]; def = trialDef(T.spec); comp = [`${T.cls}:${a.split(':')[2] || T.spec}`, ...T.allies]; }
  else if (a.includes(',')) comp = a.split(',');
  else { console.error(`unknown argument: ${a} (bosses: ${Object.keys(DEFS).join(', ')})`); process.exit(1); }
}
console.log(`${def.name}, ${mode}, ${comp.join('/')}`);

let clears = 0;
for (let r = 0; r < runs; r++) {
  const casts = [];
  const host = new RaidHost({ def, mode, humans: () => [], bots: comp, seed: 1000 + r * 77, emit: msg => {
    if (msg.t === 'bcast') casts.push(msg.name);
  } });
  let deaths = [];
  const origEmit = host.emitOut;
  const recent = {};
  const kinds = {};
  host.emitOut = msg => {
    if (msg.t === 'pdmg') {
      (recent[msg.id] = recent[msg.id] || []).push(`${msg.k}:${Math.round(msg.a)}@${host.sim.t.toFixed(1)}(${msg.hp})`);
      if (msg.dd) kinds[msg.k] = (kinds[msg.k] || 0) + 1;
    }
    if (msg.t === 'addev' && msg.k === 'enrage') kinds['add-enrage'] = (kinds['add-enrage'] || 0) + 1;
    if (msg.t === 'fev' && msg.k === 'death') {
      const last = (recent[msg.id] || []).slice(-3).join(' ');
      deaths.push(`${host.sim.t.toFixed(0)}s ${host.bots.find(b => b.id === msg.id)?.name}` + (process.env.WHY ? ` [${last}]` : ''));
    }
    origEmit(msg);
  };
  while (host.sim.state === 'countdown' || host.sim.state === 'live') {
    host.tick(0.05);
    if (host.sim.t > 900) break;
  }
  if (host.sim.state === 'clear') clears++;
  const st = host.sim.stats;
  const dur = host.sim.t;
  console.log(`run ${r + 1}: ${host.sim.state} at ${dur.toFixed(0)}s, boss ${(host.sim.boss.hp / host.sim.boss.maxHp * 100).toFixed(1)}%, phase ${host.sim.phase}, deaths: ${deaths.join(', ') || 'none'}`);
  console.log('   ' + Object.values(st).map(s => `${s.name}/${s.cls}: ${(s.damage / dur).toFixed(0)} dps, ${(s.healing / dur).toFixed(0)} hps, avoidable ${s.avoidable}, deaths ${s.deaths}`).join('\n   '));
  if (Object.keys(kinds).length) console.log('   failed: ' + Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', '));
}
console.log(`cleared ${clears} of ${runs}`);
