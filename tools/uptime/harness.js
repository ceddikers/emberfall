// Uptime harness: plays bot raids like tools/bot-raid.js and records raw per-hero hit logs + per-tick meta to JSON.
//   node harness.js <boss|dummy> <normal|hard> <gear> <runs> <comp comma list> <outfile> [seed0]
// Classification is done offline (analyze.js) from this raw data.
const path = require('path');
const fs = require('fs');
const REPO = 'C:/Users/Cedef/OneDrive/Documents/newgame';
const load = (p) => require(path.join(REPO, 'client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
const { buildGear } = require('./gear.js');
const DEFS = {
  grubnak: load('arena/bosses/grubnak.js').GRUBNAK, skitterra: load('arena/bosses/skitterra.js').SKITTERRA,
  volkar: load('arena/bosses/volkar.js').VOLKAR, hollowking: load('arena/bosses/hollowking.js').HOLLOWKING,
  wyrm: load('arena/bosses/wyrm.js').WYRM, titan: load('arena/bosses/titan.js').TITAN, hydra: load('arena/bosses/hydra.js').HYDRA,
  archmage: load('arena/bosses/archmage.js').AZERATH, corvane: load('arena/bosses/corvane.js').CORVANE,
  brannoc: load('arena/bosses/brannoc.js').BRANNOC, morrowoak: load('arena/bosses/morrowoak.js').MORROWOAK, caelum: load('arena/bosses/caelum.js').CAELUM,
};
// a target dummy: Grubnak's shell with no script, no autos, no gates, no enrage, huge HP
DEFS.dummy = Object.assign({}, DEFS.grubnak, { id: 'grubnak', name: 'Dummy', hp: { normal: 2e9, hard: 2e9 }, autoDmg: { normal: 0, hard: 0 },
  enrage: { normal: 99999, hard: 99999 }, gates: [], script() {}, room: undefined });

const [bossId, mode, gearLevel, runsS, compS, outFile, seedS] = process.argv.slice(2);
const def = DEFS[bossId], runs = Number(runsS), comp = compS.split(','), seed0 = Number(seedS || 1000);
if (!def) throw new Error('unknown boss ' + bossId);
const GEARSET = buildGear(gearLevel === 'base' ? '' : gearLevel, comp);
if (GEARSET) {
  const orig = RaidHost.prototype.allPlayers;
  RaidHost.prototype.allPlayers = function () { return orig.call(this).map(p => (p.bot ? Object.assign(p, { gear: GEARSET.sets[p.id - 1000].host }) : p)); };
}
const out = { boss: bossId, mode, gear: gearLevel, comp, seed0, runs: [] };
const DT = 0.05;
for (let r = 0; r < runs; r++) {
  const trace = [];
  const host = new RaidHost({ def, mode, humans: () => [], bots: comp, seed: seed0 + r * 77, bond: GEARSET ? GEARSET.bond : undefined, emit: msg => {
    const t = host.sim ? +host.sim.t.toFixed(2) : 0;
    if (msg.t === 'bcast') trace.push([t, 'cast', msg.name, msg.dur]);
    else if (msg.t === 'fev' && msg.k === 'wall') trace.push([t, 'wall', msg.name || '']);
    else if (msg.t === 'addev' && msg.k === 'spawn') trace.push([t, 'add', msg.kind]);
    else if (msg.t === 'fev' && msg.k === 'death') trace.push([t, 'death', msg.id]);
  } });
  if (GEARSET) host.bots.forEach((b, i) => { b.actor.kit.env.gearMods = () => GEARSET.sets[i].mods; });
  const sim = host.sim;
  const heroes = {};
  for (const [id, st] of Object.entries(sim.stats)) heroes[id] = { id: +id, cls: st.cls, role: st.role, hits: [], other: 0 };
  // wrap sim.onEvent: record the damage that actually landed, on the boss or on an add
  const origOn = sim.onEvent.bind(sim);
  sim.onEvent = (pid, ev) => {
    if (ev.type !== 'damage') return origOn(pid, ev);
    const st = sim.stats[pid], before = st ? st.damage : 0, hp0 = sim.boss.hp;
    origOn(pid, ev);
    const landed = st ? st.damage - before : 0;
    if (landed > 0 && heroes[pid]) {
      const toAdd = ev.tgt != null && ev.tgt !== 'boss';
      heroes[pid].hits.push([+sim.t.toFixed(3), toAdd ? 1 : 0, landed, ev.dot ? 1 : 0, ev.auto ? 1 : 0]);
    }
  };
  // per-tick meta
  const tk = { t: [], ph: [], un: [], al: [], ad: [], cast: [], bhp: [], st: [], mv: [] }, castNames = [], castIdx = {}, mvNames = [], mvIdx = {};
  const dmgSeen = {}; let firstDeath = null;
  const dmgPrev = {};
  while (sim.state === 'countdown' || sim.state === 'live') {
    if (process.env.FORCE_UNT) { const t = sim.t; sim.boss.untargetable = (t >= 100 && t < 120) || (t >= 200 && t < 210); }
    host.tick(DT);
    if (sim.t > (Number(process.env.MAXT) || 900)) break;
    if (sim.state !== 'live' && sim.state !== 'clear' && sim.state !== 'wipe') continue;
    // (the tick that ends the fight is still recorded)
    let alMask = 0; const ids = Object.keys(heroes);
    ids.forEach((id, i) => { const s = sim.ps.get(+id); if (s && s.alive) alMask |= (1 << i); });
    if (firstDeath == null && alMask !== (1 << ids.length) - 1) firstDeath = +sim.t.toFixed(2);
    const c = sim.boss.cast && sim.t < sim.boss.cast.end ? sim.boss.cast.name : '';
    if (c && castIdx[c] == null) { castIdx[c] = castNames.length; castNames.push(c); }
    if (sim.state === 'live' || sim.state === 'clear') {
      tk.t.push(+sim.t.toFixed(2)); tk.ph.push(sim.phase || 1); tk.un.push(sim.boss.untargetable ? 1 : 0); tk.al.push(alMask);
      tk.ad.push(sim.adds.size); { const live = new Set(); if (c) live.add(c); for (const m of sim.mechs.values()) live.add(m.from || ('mech:' + m.type)); if (sim.zones.some(z => z.end > sim.t && !(sim.t < (z.startAt || 0) - 0))) live.add('hz:zone'); if (sim.rollers.size) live.add('hz:roller'); if (sim.sweeps.size) live.add('hz:sweep'); if (sim.tethers.size) live.add('hz:tether'); if (sim.reels.size) live.add('hz:reel'); tk.mv.push([...live].map(n => { if (mvIdx[n] == null) { mvIdx[n] = mvNames.length; mvNames.push(n); } return mvIdx[n]; })); } tk.st.push(host.bots.map(b => { const k = b.actor.kit; return (k.cast ? 1 : 0) | (k.gcdReady > k.now ? 2 : 0) | (b.moving ? 4 : 0); })); tk.cast.push(c ? castIdx[c] : -1); tk.bhp.push(+(sim.boss.hp / sim.boss.maxHp).toFixed(4));
    }
  }
  // damage the stats credited that no onEvent hit explains (ledgers, dolls, hounds, the Limit Break): residual per hero
  for (const [id, st] of Object.entries(sim.stats)) {
    const h = heroes[id]; const tracked = h.hits.reduce((a, x) => a + x[2], 0);
    h.other = st.damage - tracked; h.total = st.damage;
  }
  out.runs.push({ seed: seed0 + r * 77, state: sim.state, endT: +sim.t.toFixed(2), firstDeath, dur: sim.t, bossHp: +(sim.boss.hp / sim.boss.maxHp).toFixed(4),
    gates: (def.gates || []).map(g => (typeof g === 'number' ? g : g.f)), heroes, tk, castNames, mvNames, trace });
  process.stderr.write(`${bossId} ${mode} ${comp[2]} run ${r + 1}/${runs}: ${sim.state} at ${sim.t.toFixed(0)}s\n`);
}
fs.writeFileSync(outFile, JSON.stringify(out));
