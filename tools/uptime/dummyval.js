const { classify, load } = require('./lib.js');
for (const f of process.argv.slice(2)) {
  const d = load(f), agg = {};
  for (const run of d.runs) { const { out, last } = classify(run);
    for (const o of Object.values(out)) { const a = (agg[o.cls] = agg[o.cls] || { alive: 0, boss: 0, add: 0 }); for (let k = 0; k < last; k++) { if (o.st[k] === 0) continue; a.alive++; if (o.st[k] === 1) a.boss++; if (o.st[k] === 2) a.add++; } } }
  for (const [c, a] of Object.entries(agg)) console.log(f, c.padEnd(12), 'on-boss', (100 * a.boss / a.alive).toFixed(1) + '%', 'add', (100 * a.add / a.alive).toFixed(1) + '%');
}
