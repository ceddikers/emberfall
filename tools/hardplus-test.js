// Hard+ (client/js/hardplus.js): each modifier does what it says on a headless Hard pull, and a pull without them is untouched.
//   node tools/hardplus-test.js     (exit code 0 and a final "Hard+ OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'), load('arena/scoring.js'), load('arena/raid-host.js'), load('hardplus.js'));
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { buildGear } = require('./lib/bot-gear.js');
const probs = [], check = (ok, what) => { if (!ok) probs.push(what); };
const COMP = 'bastion,cleric,ranger,pyromancer'.split(',');

// a pull of Grubnak on Hard with these mods: what the host told the clients, and the host at the end
function pull(mods, { secs = 120, seed = 4242, plain = false } = {}) {
  const gear = plain ? null : buildGear('mid', COMP), got = { casts: [], puds: [], debuffs: [], lbs: 0, raised: 0 };
  const host = new RaidHost({ def: GRUBNAK, mode: 'hard', humans: () => [], bots: COMP, mods, seed, bond: gear ? gear.bond : undefined, emit: msg => {
    if (msg.t === 'bcast') got.casts.push([msg.name, msg.dur]);
    if (msg.t === 'pud' && msg.tag === 'scorch') got.puds.push(msg);
    if (msg.t === 'lb') got.lbs++;
    if (msg.t === 'fev' && msg.k === 'raised') got.raised++;
    if (msg.t === 'fps') for (const row of msg.ps) for (const d of row[9]) if (d[0] === 'brittle') got.debuffs.push(d);
  } });
  if (gear) host.bots.forEach((b, i) => { b.actor.kit.env.gearMods = () => gear.sets[i].mods; });
  while ((host.sim.state === 'countdown' || host.sim.state === 'live') && host.sim.t < secs) host.tick(0.05);
  return { host, got };
}
// a fresh sim, live, with one player's health made huge so hits can be compared
function live(mods) {
  const { host } = pull(mods, { secs: 1 }), sim = host.sim;
  sim.state = 'live';
  return { host, sim };
}
const none = pull(null), all = pull('all');
check(HARDPLUS.heat(HARDPLUS.clean('all')) === 15, 'all seven modifiers add up to 15 heat');
check(Object.keys(HARDPLUS.clean(['bogus', 'brittle', 'SHORTFUSE'])).join() === 'brittle,shortfuse', 'clean() keeps only known ids, any case');

// Short Fuse: the enrage is 30 s sooner
check(none.host.sim.enrageAt() - live('shortfuse').sim.enrageAt() === 30, 'Short Fuse moves the enrage 30 s earlier');
// Quick Casts: wind-ups 15% shorter, never under 1.2 s (one already under it is left alone)
{
  const q = pull('quickcasts', { secs: 40 }), n = pull(null, { secs: 40 });
  const c0 = n.got.casts[0], c1 = q.got.casts[0];
  check(c0 && c1 && c1[0] === c0[0], 'the same first cast');
  check(c0 && c1 && (c0[1] <= 1.2 ? c1[1] === c0[1] : Math.abs(c1[1] - Math.max(1.2, c0[1] * 0.85)) < 1e-9), `Quick Casts: first cast ${c0 && c0[0]} ${c0 && c0[1]} -> ${c1 && c1[1]}`);
  check(HARDPLUS.quick(1.0, { quickcasts: true }) === 1.0 && HARDPLUS.quick(1.3, { quickcasts: true }) === 1.2 && Math.abs(HARDPLUS.quick(4, { quickcasts: true }) - 3.4) < 1e-9, 'quick(): floor 1.2, 15% off, short ones untouched');
  check(all.got.casts.length > 5, 'the full pull casts');
}
// Heavy Hands: a hit lands 10% harder
{
  const hit = mods => { const { sim } = live(mods), p = sim.alive()[0], s = p.s; s.hp = s.maxHp = 1e9; s.def = 0; sim.damagePlayer(p, 10000, { kind: 'x' }); return 1e9 - s.hp; };
  const r = hit('heavyhands') / hit(null);
  check(Math.abs(r - 1.1) < 0.01, `Heavy Hands multiplies a hit by 1.1 (got ${r.toFixed(3)})`);
}
// Brittle: stacks on avoidable hits (3 at most) and makes the next hit hurt more; a lingering-ground tick does not stack.
// (Vulnerability stacks on the same hits, so each series is read against the same hits without Brittle.)
{
  const series = mods => {
    const { sim } = live(mods), p = sim.alive()[0], s = p.s; s.hp = s.maxHp = 1e9; s.def = 0;
    const dmg = (o = {}) => { const h = s.hp; sim.damagePlayer(p, 10000, Object.assign({ avoidable: true, kind: 'x' }, o)); return h - s.hp; };
    const d = [dmg(), dmg(), dmg(), dmg(), dmg()];
    const stacks = s.brittle | 0, end = s.debuffs.brittle - sim.t; dmg({ noVuln: true });
    const after = s.brittle | 0; sim.t += 40; d.push(dmg({ avoidable: false }));
    return { d, stacks, end, after };
  };
  const base = series(null), br = series('brittle');
  const r = br.d.map((v, i) => v / base.d[i]);
  check(br.stacks === 3, 'Brittle caps at 3 stacks (' + br.stacks + ')');
  check(Math.abs(r[0] - 1) < 0.01 && Math.abs(r[1] - 1.1) < 0.02 && Math.abs(r[2] - 1.2) < 0.02 && Math.abs(r[3] - 1.3) < 0.02 && Math.abs(r[4] - 1.3) < 0.02, 'Brittle adds 10% a stack (' + r.map(x => x.toFixed(2)) + ')');
  check(Math.abs(br.end - 12) < 0.01, 'Brittle lasts 12 s');
  check(br.after === 3, 'a ground tick does not stack Brittle');
  check(Math.abs(r[5] - 1) < 0.01, 'Brittle wears off (' + r[5].toFixed(2) + ')');
}
// No Second Chances: the fallen stay down; a raise and a Limit Break raise do nothing
{
  const { host, sim } = live('nosecondchances'), p = sim.alive().find(q => q.role === 'dps');
  sim.damagePlayer(p, 1e9, { raw: true, kind: 'x' });
  check(!p.s.alive, 'a hero fell');
  sim.revive(p.id, p.s, 0.5, sim.alive()[0].id, 'cast'); check(!p.s.alive, 'revive() does nothing');
  const healer = sim.alive().find(q => q.role === 'healer'); sim.onEvent(healer.id, { type: 'raise', target: p.id });
  check(!p.s.alive, 'a raise event does nothing');
  sim.lb = 300; sim.lbUsedAt = -99; sim.mods = {}; sim.mods.nosecondchances = true; sim.onEvent(sim.alive()[0].id, { type: 'lb' }); check(!p.s.alive, 'a Limit Break raises no one');
  check(host.view().players.find(q => q.id === p.id).left, 'bots see the fallen as gone, so they stop trying to raise');
  check(all.got.raised === 0, 'nobody was raised in the full pull');
}
// Bare Hands: no Limit Break
{
  const { sim } = live('barehands'); sim.lb = 300; sim.lbUsedAt = -99;
  sim.onEvent(sim.alive()[0].id, { type: 'lb' }); check(sim.lb === 300, 'Bare Hands refuses the Limit Break');
  check(all.got.lbs === 0, 'no Limit Break fired in the full pull');
}
// Scorched Earth: ground hits leave burning patches that tick for a few seconds and then end
{
  const s = pull('scorchedearth', { secs: 100 });
  check(s.got.puds.length > 0, 'Scorched Earth leaves patches on the floor');
  check(s.got.puds.every(p => p.dur === HARDPLUS.T.SCORCH.DUR && p.r >= 40 && p.r <= 110), 'patches are small and last about 6 s');
  check(none.got.puds.length === 0, 'no patches without the modifier');
  check(s.host.sim.puddles.filter(p => p.tag === 'scorch').length <= HARDPLUS.T.SCORCH.MAX, 'at most the cap of patches at once');
}
// Brittle goes out to the party frames with its stacks
{
  const seen = [], host = new RaidHost({ def: GRUBNAK, mode: 'hard', humans: () => [], bots: COMP, mods: 'brittle', seed: 5, emit: m => { if (m.t === 'fps') for (const r of m.ps) for (const d of r[9]) if (d[0] === 'brittle') seen.push(d); } });
  const sim = host.sim; sim.state = 'live';
  const p = sim.alive()[0]; sim.damagePlayer(p, 100, { avoidable: true, kind: 'x' }); sim.damagePlayer(p, 100, { avoidable: true, kind: 'x' });
  for (let i = 0; i < 40; i++) host.tick(0.05);
  check(seen.length > 0 && seen.every(d => d[2] === 2 && d[1] > 0 && d[1] <= 12), 'Brittle goes out to the party frames with its stacks (' + JSON.stringify(seen[0]) + ')');
}
// Normal ignores modifiers
{
  const n = new FightSim(GRUBNAK, 'normal', () => [], () => {}, 1, { mods: 'all' });
  check(Object.keys(n.mods).length === 0, 'Normal takes no modifiers');
}
if (probs.length) { console.log('Hard+ problems:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log('Hard+ OK');
