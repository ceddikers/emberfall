const fs = require('fs');
const W = 2.6;           // max hit-to-hit gap that still counts as continuous attacking
const BUSY_FRAC = 0.9;   // a longer gap counts too if the hero was casting / on its GCD for this share of it (a long cast, then its hit)
// states: 0 dead, 1 boss, 2 add, 3 off (boss untargetable), 4 off (other)
function classify(run) {
  const { tk } = run, n = tk.t.length, ids = Object.keys(run.heroes);
  const endT = run.state === 'clear' ? Infinity : (run.firstDeath != null ? run.firstDeath : Infinity);
  let last = n; for (let k = 0; k < n; k++) if (tk.t[k] > endT) { last = k; break; }
  const t0 = tk.t[0], dt = 0.05;
  const out = {};
  ids.forEach((id, hi) => {
    const h = run.heroes[id];
    const st = new Uint8Array(last).fill(4);
    const hits = h.hits.filter(x => !x[3]);
    const idxOf = t => Math.max(0, Math.min(last, Math.round((t - t0) / dt)));
    for (let i = 1; i < hits.length; i++) {
      const a = hits[i - 1][0], b = hits[i][0], gap = b - a;
      const ia = idxOf(a), ib = idxOf(b);
      let on = gap <= W;
      if (!on && gap <= 9 && ib > ia) {
        let busy = 0; for (let k = ia; k < Math.min(ib, n); k++) if (tk.st[k][hi] & 3) busy++;
        on = busy / (ib - ia) >= BUSY_FRAC;
      }
      if (on) { const v = hits[i][1] ? 2 : 1; for (let k = ia; k < Math.min(ib, last); k++) st[k] = v; }
    }
    for (let k = 0; k < last; k++) {
      if (!(tk.al[k] & (1 << hi))) st[k] = 0;
      else if (st[k] === 4 && tk.un[k]) st[k] = 3;
    }
    out[id] = { cls: h.cls, role: h.role, st };
  });
  return { out, last };
}
function melee(cls) { return ['shadowblade', 'driftblade', 'thresher', 'houndmaster'].includes(cls); }
function load(file) { return JSON.parse(fs.readFileSync(file)); }
module.exports = { classify, melee, load, W };
