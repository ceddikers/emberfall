// Talent balance: plays each class and spec as a pro (tools/simulate.js) with one talent at a time, then with the
// strongest pick of every row, and prints how much each adds over the base kit.
//   node tools/talents.js              (every class and spec)
//   node tools/talents.js ranger       (one class and its specs)
// Machine-readable lines for tools/check.js:
//   TALENT <class[:spec]> <id> <dps change %> <hps change %>
//   BUILD  <class[:spec]> <base pro dps> <full build pro dps> <change %> <ids...>            (rows I-V)
//   BUILDALL <class:spec> <base pro dps> <full build pro dps> <change %> <ids...>          (rows I-VII: with the spec rows)
// The spec rows (SPEC_TALENTS, VI and VII) are tried for their own spec only.
const path = require('path');
const { runSim } = require(path.join(__dirname, 'simulate.js'));
const { TALENTS, specTalentRows } = require(path.join(__dirname, '../client/js/combat/talents.js'));
const { SPECS } = require(path.join(__dirname, '../client/js/combat/specs.js'));

const RUNS = 5;
const only = process.argv[2];
const pct = (a, b) => (b ? (a - b) / b * 100 : 0);
function avg(cls, spec, talents) {
  let dps = 0, hps = 0;
  for (let s = 1; s <= RUNS; s++) { const r = runSim(cls, 'pro', s * 101, spec, talents); dps += r.dps; hps += r.hps; }
  return { dps: dps / RUNS, hps: hps / RUNS };
}

for (const cls of Object.keys(TALENTS)) {
  if (only && only !== cls) continue;
  for (const spec of [null, ...(SPECS[cls] || []).map(s => s.id)]) {
    const name = spec ? `${cls}:${spec}` : cls;
    const base = avg(cls, spec, null);
    const picks = [];
    console.log(`\n${name}   base pro DPS ${base.dps.toFixed(0)}${base.hps ? `, HPS ${base.hps.toFixed(0)}` : ''}`);
    TALENTS[cls].forEach((row, r) => {
      let best = null;
      for (const t of row) {
        const got = avg(cls, spec, new Set([t.id]));
        const d = pct(got.dps, base.dps), h = pct(got.hps, base.hps);
        console.log(`TALENT ${name} ${t.id} ${d.toFixed(1)} ${h.toFixed(1)}`);
        if (!best || d > best.d) best = { id: t.id, d };
      }
      picks.push(best.id);
    });
    const full = avg(cls, spec, new Set(picks));
    console.log(`BUILD ${name} ${base.dps.toFixed(0)} ${full.dps.toFixed(0)} ${pct(full.dps, base.dps).toFixed(1)} ${picks.join(' ')}`);
    const sr = specTalentRows(cls, spec);
    if (!sr) continue;
    for (const row of sr) {
      let best = null;
      for (const t of row) {
        const got = avg(cls, spec, new Set([t.id]));
        const d = pct(got.dps, base.dps), h = pct(got.hps, base.hps);
        console.log(`TALENT ${name} ${t.id} ${d.toFixed(1)} ${h.toFixed(1)}`);
        if (!best || d > best.d) best = { id: t.id, d };
      }
      picks.push(best.id);
    }
    const all = avg(cls, spec, new Set(picks));
    console.log(`BUILDALL ${name} ${base.dps.toFixed(0)} ${all.dps.toFixed(0)} ${pct(all.dps, base.dps).toFixed(1)} ${picks.join(' ')}`);
  }
}
