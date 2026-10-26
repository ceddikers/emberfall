const { classify, melee, load } = require('./lib.js');
const fs = require('fs');
const mode = process.argv[2] || 'normal', bosses = (process.argv[3] || '').split(',').filter(Boolean);
const ALL = ['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra', 'corvane', 'brannoc', 'morrowoak', 'caelum'];
const pct = (a, b) => b ? (100 * a / b).toFixed(0).padStart(3) : '  -';
const res = {};
for (const b of (bosses.length ? bosses : ALL)) {
  const row = { boss: b, clears: {}, groups: {}, phases: {} };
  for (const cn of ['A', 'B']) {
    const f = `raw/${mode}-${b}-${cn}.json`; if (!fs.existsSync(f)) continue;
    const d = load(f);
    row.clears[cn] = d.runs.filter(r => r.state === 'clear').length + '/' + d.runs.length;
    row.gear = d.gear;
    for (const run of d.runs) {
      const { out, last } = classify(run);
      row.win = row.win || []; row.win.push([run.state, run.tk.t[last - 1] - run.tk.t[0]]);
      // fraction of the window the boss is untargetable
      row.unt = row.unt || [0, 0]; for (let k = 0; k < last; k++) { row.unt[1]++; if (run.tk.un[k]) row.unt[0]++; }
      for (const [id, o] of Object.entries(out)) {
        const g = o.role === 'dps' ? (melee(o.cls) ? 'melee' : 'ranged') : o.role;
        const G = (row.groups[g] = row.groups[g] || { alive: 0, boss: 0, add: 0, offU: 0, offO: 0, n: 0 });
        G.n++;
        for (let k = 0; k < last; k++) {
          const s = o.st[k]; if (s === 0) continue;
          G.alive++; if (s === 1) G.boss++; else if (s === 2) G.add++; else if (s === 3) G.offU++; else G.offO++;
          if (g === 'melee' || g === 'ranged') {
            const key = g + ':' + (run.tk.ph[k] || 1);
            const P = (row.phases[key] = row.phases[key] || { alive: 0, boss: 0, add: 0, offU: 0, offO: 0, ticks: 0 });
            P.alive++; if (s === 1) P.boss++; else if (s === 2) P.add++; else if (s === 3) P.offU++; else P.offO++;
          }
        }
      }
    }
  }
  res[b] = row;
}
fs.writeFileSync(`summary-${mode}.json`, JSON.stringify(res));
console.log('boss        clearA clearB  win(s)  | melee boss add offU offO | ranged boss add offU offO | tank boss add | healer boss add | untarg%');
for (const [b, r] of Object.entries(res)) {
  const g = k => { const G = r.groups[k]; return G ? `${pct(G.boss, G.alive)} ${pct(G.add, G.alive)} ${pct(G.offU, G.alive)} ${pct(G.offO, G.alive)}` : '-'; };
  const t = k => { const G = r.groups[k]; return G ? `${pct(G.boss, G.alive)} ${pct(G.add, G.alive)}` : '-'; };
  const w = r.win ? Math.round(r.win.reduce((a, x) => a + x[1], 0) / r.win.length) : 0;
  console.log(`${b.padEnd(11)} ${String(r.clears.A).padEnd(6)} ${String(r.clears.B).padEnd(6)} ${String(w).padStart(5)}   | ${g('melee')} | ${g('ranged')} | ${t('tank')} | ${t('healer')} | ${pct(r.unt[0], r.unt[1])}`);
}
