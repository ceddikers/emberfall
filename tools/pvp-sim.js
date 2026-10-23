// Headless PvP Arena matches, bot against bot, with the real kits (client/js/arena/pvp.js, pvp-bots.js).
//   node tools/pvp-sim.js [duel|team|ctf] [runs] [classA] [classB] ...
//   duel with two classes: that pairing; duel with no classes: every class against every other (round robin), with
//   a table of win rates and match lengths per class. team: four classes, the first two against the last two
//   (random ones when not given). ctf: capture the flag, two against two as in team. seed=N for another seed set; VERBOSE=1 prints every match.
const path = require('path');
const load = (p) => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'), load('arena/pvp-bots.js'), load('arena/pvp.js'));

let mode = 'duel', runs = 0, seed0 = 500;
const picks = [];
for (const a of process.argv.slice(2)) {
  if (a === 'duel' || a === 'team' || a === 'ctf') mode = a;
  else if (/^seed=\d+$/.test(a)) seed0 = Number(a.slice(5));
  else if (/^\d+$/.test(a)) runs = Number(a);
  else if (CLASSES.find(c => c.id === a.split(':')[0])) picks.push(a);
  else { console.error(`unknown argument: ${a} (classes: ${CLASSES.map(c => c.id).join(', ')})`); process.exit(1); }
}
const VERBOSE = !!process.env.VERBOSE;

function runMatch(entries, seed, ctf) {
  // entries: [{ cls, spec, team }]
  let errors = 0;
  const ev = { take: 0, drop: 0, return: 0, cap: 0, down: 0 };
  const host = new PvpHost({ mode: ctf ? 'ctf' : entries.length > 2 ? 'team' : 'duel', humans: () => [], seed,
    bots: entries.map(e => ({ cls: e.cls, spec: e.spec, team: e.team })), emit: m => { if (m.t === 'ctfEv') ev[m.k]++; if (m.t === 'ctfDown') ev.down++; } });
  const t0 = Date.now();
  while (host.state === 'countdown' || host.state === 'live') {
    try { host.tick(0.05); } catch (e) { errors++; if (errors === 1) console.error('error in match:', e.stack); if (errors > 3) break; }
    if (host.sim.t > (ctf ? 500 : 400)) break;
  }
  const st = host.sim.stats;
  return { result: host.result || { winner: null, reason: 'stuck', time: host.sim.t }, errors, ms: Date.now() - t0, ev, caps: host.sim.caps,
    players: host.bots.map(b => ({ cls: b.cls.id, spec: b.spec, team: b.team, dmg: Math.round(st[b.id].damage), heal: Math.round(st[b.id].healing), alive: host.sim.ps.get(b.id).alive })) };
}
const entry = (s, team) => { const [cls, spec] = s.split(':'); return { cls, spec, team }; };
const fmt = r => `${r.result.reason} ${r.result.winner == null ? 'draw' : 'team ' + r.result.winner} at ${r.result.time}s | ` +
  r.players.map(p => `${p.cls}${p.spec ? ':' + p.spec : ''}(t${p.team}) dmg ${p.dmg} heal ${p.heal}${p.alive ? '' : ' KO'}`).join(', ');

let allErrors = 0;
if (mode === 'ctf') {
  const ids = CLASSES.map(c => c.id);
  runs = runs || 3;
  const wins = [0, 0, 0], lens = [], reasons = {};
  for (let r = 0; r < runs; r++) {
    const comp = picks.length === 4 ? picks : [0, 1, 2, 3].map(i => picks[i] || ids[(r * 7 + i * 5 + seed0) % ids.length]);
    const res = runMatch(comp.map((c, i) => entry(c, i < 2 ? 0 : 1)), seed0 + r * 77, true);
    allErrors += res.errors; lens.push(res.result.time);
    wins[res.result.winner == null ? 2 : res.result.winner]++;
    reasons[res.result.reason] = (reasons[res.result.reason] || 0) + 1;
    const e = res.ev;
    console.log(`run ${r + 1}: ${res.result.reason} ${res.result.winner == null ? 'draw' : 'team ' + res.result.winner} at ${res.result.time}s, caps ${res.caps.join('-')} | takes ${e.take} drops ${e.drop} returns ${e.return} deaths ${e.down} | ${comp.slice(0, 2).join('+')} v ${comp.slice(2).join('+')}`);
  }
  lens.sort((a, b) => a - b);
  console.log(`team 0 ${wins[0]}, team 1 ${wins[1]}, draws ${wins[2]}; median ${lens[Math.floor((lens.length - 1) / 2)]}s; ${Object.entries(reasons).map(([k, v]) => k + ' ' + v).join(', ')}`);
  if (reasons.stuck) { console.log('STUCK: a match did not end'); process.exitCode = 1; }
} else if (mode === 'team') {
  const ids = CLASSES.map(c => c.id);
  runs = runs || 5;
  let wins = [0, 0, 0], tot = 0;
  for (let r = 0; r < runs; r++) {
    const comp = picks.length === 4 ? picks : [0, 1, 2, 3].map(i => picks[i] || ids[(r * 7 + i * 5 + seed0) % ids.length]);
    const res = runMatch(comp.map((c, i) => entry(c, i < 2 ? 0 : 1)), seed0 + r * 77);
    allErrors += res.errors; tot += res.result.time;
    wins[res.result.winner == null ? 2 : res.result.winner]++;
    console.log(`run ${r + 1}: ${fmt(res)}`);
  }
  console.log(`team 0 ${wins[0]}, team 1 ${wins[1]}, draws ${wins[2]}; mean ${(tot / runs).toFixed(0)}s`);
} else if (picks.length >= 2) {
  runs = runs || 5;
  const w = [0, 0, 0]; let tot = 0;
  for (let r = 0; r < runs; r++) {
    const res = runMatch([entry(picks[0], r % 2), entry(picks[1], 1 - (r % 2))], seed0 + r * 77);   // (sides swap each run)
    allErrors += res.errors; tot += res.result.time;
    const win = res.result.winner == null ? 2 : (res.result.winner === r % 2 ? 0 : 1);
    w[win]++;
    console.log(`run ${r + 1}: ${fmt(res)}`);
  }
  console.log(`${picks[0]} ${w[0]}, ${picks[1]} ${w[1]}, draws ${w[2]}; mean ${(tot / runs).toFixed(0)}s`);
} else {
  // round robin: every pairing, `runs` matches each (default 2)
  runs = runs || 2;
  const ids = CLASSES.map(c => c.id), row = {};
  for (const id of ids) row[id] = { w: 0, l: 0, d: 0, t: 0, n: 0, dmg: 0, heal: 0 };
  const lengths = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let r = 0; r < runs; r++) {
    const res = runMatch([entry(ids[i], r % 2), entry(ids[j], 1 - (r % 2))], seed0 + (i * 31 + j) * 7 + r);
    allErrors += res.errors;
    const t = res.result.time; lengths.push(t);
    const wi = res.result.winner == null ? null : res.result.winner === r % 2 ? ids[i] : ids[j];
    for (const id of [ids[i], ids[j]]) { const x = row[id]; x.n++; x.t += t; if (wi == null) x.d++; else if (wi === id) x.w++; else x.l++; const pl = res.players.find(p => p.cls === id); x.dmg += pl.dmg / t; x.heal += pl.heal / t; }
    if (VERBOSE) console.log(`${ids[i]} v ${ids[j]}: ${fmt(res)}`);
  }
  console.log('class          win%  W   L   D  mean s  dps  hps');
  for (const id of ids.sort((a, b) => row[b].w / row[b].n - row[a].w / row[a].n)) { const x = row[id]; console.log(`${id.padEnd(14)} ${(100 * x.w / x.n).toFixed(0).padStart(4)} ${String(x.w).padStart(3)} ${String(x.l).padStart(3)} ${String(x.d).padStart(3)}  ${(x.t / x.n).toFixed(0).padStart(6)} ${(x.dmg / x.n).toFixed(1).padStart(5)} ${(x.heal / x.n).toFixed(1).padStart(5)}`); }
  lengths.sort((a, b) => a - b);
  const q = f => lengths[Math.floor(f * (lengths.length - 1))];
  console.log(`${lengths.length} matches: median ${q(0.5)}s, 10% ${q(0.1)}s, 90% ${q(0.9)}s; in 45-90s: ${(100 * lengths.filter(t => t >= 45 && t <= 90).length / lengths.length).toFixed(0)}%`);
}
if (allErrors) { console.log(`ERRORS: ${allErrors}`); process.exitCode = 1; }
