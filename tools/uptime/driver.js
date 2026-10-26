// node driver.js normal | node driver.js hard boss1,boss2,...   (max 2 node children at once)
const { spawn } = require('child_process');
const mode = process.argv[2], only = (process.argv[3] || '').split(',').filter(Boolean);
const SETS = { set1: ['grubnak', 'skitterra', 'volkar', 'hollowking'], set2: ['wyrm', 'titan', 'archmage', 'hydra'], set3: ['corvane', 'brannoc', 'morrowoak', 'caelum'] };
const GEAR = { normal: { set1: 'fresh', set2: 'post1', set3: 'post3' }, hard: { set1: 'mid', set2: 'post2', set3: 'post4' } }[mode];
const COMPS = { A: 'bastion,cleric,ranger,pyromancer', B: 'bastion,cleric,shadowblade,driftblade' };
const jobs = [];
for (const [set, bosses] of Object.entries(SETS)) for (const b of bosses) {
  if (only.length && !only.includes(b)) continue;
  for (const [cn, comp] of Object.entries(COMPS)) jobs.push({ b, args: [b, mode, GEAR[set], '10', comp, `raw/${mode}-${b}-${cn}.json`] });
}
let running = 0, i = 0, failed = 0;
function next() {
  while (running < 2 && i < jobs.length) {
    const j = jobs[i++]; running++;
    const t0 = Date.now();
    const c = spawn('node', ['harness.js', ...j.args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; c.stderr.on('data', d => { err += d; });
    c.on('exit', code => { running--; if (code) { failed++; console.log('FAIL', j.args.join(' '), err.slice(-400)); } else console.log('done', j.args[5], ((Date.now() - t0) / 1000).toFixed(0) + 's'); next(); });
  }
  if (!running && i >= jobs.length) console.log('all done, failed', failed);
}
next();
