// share of the fight with >=2 distinct moves live and quiet windows (>=6 s, nothing live, boss targetable)
// "moves" = boss cast bars + telegraphs (f.mech) grouped by the cast name they came from; "broad" adds timed zones, rollers, sweeps, tethers, reels
const { load } = require('./lib.js');
const mode = process.argv[2] || 'normal', only = (process.argv[3] || '').split(',').filter(Boolean);
const ALL = ['grubnak','skitterra','volkar','hollowking','wyrm','titan','archmage','hydra','corvane','brannoc','morrowoak','caelum'];
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const QUIET = 6, res = {};
const mk = () => ({ ticks: 0, ovM: 0, ovB: 0, qM: [], qB: [] });
for (const b of (only.length ? only : ALL)) {
  const R = Object.assign(mk(), { runs: 0, ph: {} });
  for (const cn of ['A', 'B']) {
    let d; try { d = load(`raw/${mode}-${b}-${cn}.json`); } catch (e) { continue; }
    for (const run of d.runs) {
      const tk = run.tk, n = tk.t.length; const endT = run.state === 'clear' ? Infinity : (run.firstDeath ?? Infinity);
      let last = n; for (let k = 0; k < n; k++) if (tk.t[k] > endT) { last = k; break; }
      R.runs++;
      const isHz = run.mvNames.map(x => x.startsWith('hz:'));
      const sM = { s: -1 }, sB = { s: -1 };
      const close = (st, arr, k, phArr) => { if (st.s >= 0) { const len = (k - st.s) * 0.05; if (len >= QUIET) { R[arr].push(len); (R.ph[tk.ph[st.s]] = R.ph[tk.ph[st.s]] || mk())[arr].push(len); } st.s = -1; } };
      for (let k = 0; k < last; k++) {
        const P = (R.ph[tk.ph[k]] = R.ph[tk.ph[k]] || mk());
        const all = tk.mv[k], moves = all.filter(i => !isHz[i]);
        R.ticks++; P.ticks++;
        if (moves.length >= 2) { R.ovM++; P.ovM++; }
        if (all.length >= 2) { R.ovB++; P.ovB++; }
        if (moves.length === 0 && !tk.un[k]) { if (sM.s < 0) sM.s = k; } else close(sM, 'qM', k);
        if (all.length === 0 && !tk.un[k]) { if (sB.s < 0) sB.s = k; } else close(sB, 'qB', k);
      }
      close(sM, 'qM', last); close(sB, 'qB', last);
    }
  }
  res[b] = R;
}
const f = R => `overlap moves ${(100 * R.ovM / R.ticks).toFixed(0)}% broad ${(100 * R.ovB / R.ticks).toFixed(0)}%`;
const q = (R, runs) => `quiet/run moves ${(R.qM.length / runs).toFixed(1)} med ${med(R.qM).toFixed(1)}s | broad ${(R.qB.length / runs).toFixed(1)} med ${med(R.qB).toFixed(1)}s`;
for (const [b, R] of Object.entries(res)) console.log(b.padEnd(11), '|', f(R).padEnd(34), '|', q(R, R.runs));
if (only.length) for (const [b, R] of Object.entries(res)) { console.log('-- acts', b); for (const [ph, P] of Object.entries(R.ph)) console.log('  act', ph, `${(P.ticks * 0.05 / R.runs).toFixed(0)}s/run`.padEnd(8), f(P).padEnd(34), '|', q(P, R.runs)); }
