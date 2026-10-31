// Writes client/js/combat/bot-builds.js: the strongest talent pick of every row for every class and spec, which raid bots carry
// (raid-host.js botWorld) and the bosses are tuned against (user, 2026-10-31: bosses assume talents, by set; the strongest pick).
// A pick is the strongest on its own over the base kit (as tools/talents.js): damage for tanks and damage dealers, healing for
// healers (under heavy party damage, so healing talents count instead of landing as overheal).
//   node tools/bot-builds.js            (every class, in parallel; rewrites the data file)
//   node tools/bot-builds.js <class>    (one class: prints its JSON)
const path = require('path'), fs = require('fs'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const one = process.argv[2];

if (one) {
  if (['cleric', 'grovekeeper', 'chronomancer', 'alembist', 'threadweaver', 'tidecaller', 'lanternkeeper'].includes(one)) process.env.SIM_HEAL_PRESSURE = process.env.SIM_HEAL_PRESSURE || '2.5';
  const { runSim } = require(path.join(__dirname, 'simulate.js'));
  const { TALENTS, specTalentRows } = require(path.join(ROOT, 'client/js/combat/talents.js'));
  const { SPECS } = require(path.join(ROOT, 'client/js/combat/specs.js'));
  const healer = process.env.SIM_HEAL_PRESSURE !== undefined;
  const RUNS = 5;
  const score = (spec, set) => { let s = 0; for (let k = 1; k <= RUNS; k++) { const r = runSim(one, 'pro', k * 101, spec, set); s += healer ? r.hps : r.dps; } return s / RUNS; };
  const out = {};
  for (const spec of [null, ...(SPECS[one] || []).map(s => s.id)]) {
    const base = score(spec, null), picks = [];
    const rows = [...TALENTS[one], ...(specTalentRows(one, spec) || [])];
    for (const row of rows) { let best = null; for (const t of row) { const v = score(spec, new Set([t.id])); if (!best || v > best.v) best = { id: t.id, v }; } picks.push(best.id); }
    out[spec ? `${one}:${spec}` : one] = picks;
    void base;
  }
  console.log(JSON.stringify(out));
} else {
  const { TALENTS } = require(path.join(ROOT, 'client/js/combat/talents.js'));
  const classes = Object.keys(TALENTS), jobs = Math.max(2, require('os').cpus().length - 2), all = {};
  let next = 0, live = 0;
  const done = () => {
    const keys = Object.keys(all).sort(), body = keys.map(k => `  '${k}': [${all[k].map(id => `'${id}'`).join(', ')}],`).join('\n');
    fs.writeFileSync(path.join(ROOT, 'client/js/combat/bot-builds.js'),
`// Raid bots' talents (written by tools/bot-builds.js; rerun it after a talent changes). Bosses are tuned for a party that holds talents
// (user, 2026-10-31): Normal for the rows a party has by that set, Hard one row more, and each pick the strongest of its row.
//   BOT_BUILDS['class' or 'class:spec']   the strongest pick of rows I..VII, in row order (a base hero has five rows)
//   BOT_TALENT_ROWS[set]                  [rows on Normal, rows on Hard]; set 4 is the Ultimate
//   botTalentSet(cls, spec, set, mode)    the Set of talent ids a bot holds for that boss (Hard+ plays as Hard)
const BOT_BUILDS = {
${body}
};
const BOT_TALENT_ROWS = { 1: [2, 3], 2: [4, 5], 3: [6, 7], 4: [7, 7] };
function botTalentSet(cls, spec, set, mode) {
  const b = BOT_BUILDS[spec ? cls + ':' + spec : cls] || BOT_BUILDS[cls], r = BOT_TALENT_ROWS[set];
  if (!b || !r) return new Set();
  return new Set(b.slice(0, r[mode === 'normal' ? 0 : 1]));
}
if (typeof module !== 'undefined') module.exports = { BOT_BUILDS, BOT_TALENT_ROWS, botTalentSet };
`);
    console.log('wrote client/js/combat/bot-builds.js:', keys.length, 'builds');
  };
  const feed = () => {
    while (live < jobs && next < classes.length) {
      const c = classes[next++]; live++;
      cp.execFile('node', [__filename, c], { maxBuffer: 1 << 24 }, (err, so) => {
        live--; if (err) { console.error(c, err.message); process.exitCode = 1; } else Object.assign(all, JSON.parse(so.trim().split('\n').pop()));
        if (next < classes.length) feed(); else if (!live) done();
      });
    }
  };
  feed();
}
