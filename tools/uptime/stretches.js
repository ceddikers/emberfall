const { classify, melee, load } = require('./lib.js');
const [mode, boss, minLen] = [process.argv[2] || 'normal', process.argv[3] || 'skitterra', Number(process.argv[4] || 4)];
const d = load(`raw/${mode}-${boss}-B.json`);
const all = [];
d.runs.forEach((run, ri) => {
  const { out, last } = classify(run); const ids = Object.keys(out).filter(id => melee(out[id].cls));
  const t = run.tk.t; let s = -1;
  const blocked = k => ids.every(id => out[id].st[k] !== 1);   // no melee DPS landing on the boss (dead counts as blocked only if all dead)
  const alive = k => ids.some(id => out[id].st[k] !== 0);
  const flush = (k) => { if (s >= 0) { const len = t[k - 1] - t[s]; if (len >= minLen) all.push({ ri, a: t[s], b: t[k - 1], len }); s = -1; } };
  let gapStart = -1;
  for (let k = 0; k < last; k++) {
    const bl = alive(k) && blocked(k);
    if (bl) { if (s < 0) s = k; gapStart = -1; }
    else if (s >= 0) { if (gapStart < 0) gapStart = k; if (t[k] - t[gapStart] > 0.8) { flush(gapStart); gapStart = -1; } }
  }
  flush(gapStart >= 0 ? gapStart : last);
});
all.sort((x, y) => y.len - x.len);
console.log('stretches >=', minLen, 's:', all.length, ' (10 runs, all melee DPS not on the boss)');
const seen = {};
for (const st of all.slice(0, 25)) {
  const run = d.runs[st.ri], t = run.tk.t;
  const casts = run.trace.filter(e => e[1] === 'cast' && e[0] >= st.a - 3.5 && e[0] <= st.b).map(e => `${e[0].toFixed(0)}:${e[2]}(${e[3]}s)`);
  const k0 = t.findIndex(x => x >= st.a), k1 = t.findIndex(x => x >= st.b);
  let un = 0, ad = 0; for (let k = k0; k <= k1; k++) { if (run.tk.un[k]) un++; ad = Math.max(ad, run.tk.ad[k]); }
  const adds = run.trace.filter(e => e[1] === 'add' && e[0] >= st.a - 3 && e[0] <= st.b).length;
  console.log(`run${st.ri + 1} ${st.a.toFixed(0)}-${st.b.toFixed(0)}s len ${st.len.toFixed(1)}s act ${run.tk.ph[k0]} untarg ${(100 * un / (k1 - k0 + 1)).toFixed(0)}% maxAdds ${ad} | ${casts.join(', ')}`);
}
