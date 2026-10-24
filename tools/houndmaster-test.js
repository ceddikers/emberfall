// The Houndmaster's hounds (kits.js HOUND / hdTick, fight.js HOUND_HOST, bots.js BOT_CLASS.houndmaster): the pair the two hounds hold
// decides the Pack Finisher, a free hound drifts and a held one does not, Hold then pounce lands both behind, a telegraph downs a hound
// and it comes back, Call Off saves them, Wild Hunt counts every pair at once, and the hounds' list reaches the host and the other
// players ('hounds'); then a short headless raid with a Houndmaster bot.
//   node tools/houndmaster-test.js            (exit code 0 and a final "Houndmaster OK" when everything holds)
const path = require('path');
const load = p => require(path.join(__dirname, '../client/js', p));
Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'),
  load('combat/talents.js'), load('combat/actor.js'), load('arena/fight.js'), load('arena/bots.js'));
Object.assign(global, load('arena/scoring.js'), load('arena/raid-host.js'));
const { GRUBNAK } = load('arena/bosses/grubnak.js');
const { TALENT_BY_ID } = load('combat/talents.js');
global.TALENT_BY_ID = TALENT_BY_ID;

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };
const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;
const Q = 0, W = 1, E = 2, R = 3, D = 4, F = 5, T = 7;   // (the buttons)

// a kit on a bare stage: the boss at (500, 500) facing +x (state.face), you behind it, a cursor (state.aim), the host's notices by hand
function make(o = {}) {
  let rs = o.seed || 4242;
  const rng = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const st = { t: 1, face: 0, boss: { id: 'boss', x: 500, y: 500 }, pos: { x: 360, y: 500 }, aim: null, shift: false, lists: [], emits: [], danger: null };
  const env = { now: () => st.t, rng, moving: () => false, target: ab => (ab.target === 'enemy' ? st.boss : null), positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}),
    selfMods: () => ({}), recentDamage: () => 0, maxHp: () => 1000, hpFrac: () => 1, isDead: () => false, talents: () => (o.talents ? new Set(o.talents) : null), boss: () => (st.bossHp != null ? { hp: st.bossHp } : null), enemiesNear: () => st.enemies || null,
    pos: () => st.pos, aim: () => st.aim, bossFace: () => st.face, shift: () => st.shift, hounds: l => st.lists.push(l), danger: (x, y, w) => !!st.danger && st.danger(x, y, w), emit: ev => st.emits.push(ev) };
  const kit = new Kit(kitFor('houndmaster', o.spec || null, o.talents ? new Set(o.talents) : null), env);
  const step = secs => { for (let i = 0; i < Math.round(secs / 0.05); i++) { st.t += 0.05; kit.update(); } };
  const hs = () => kit.g.hounds.filter(h => !h.spectral);
  const fx = name => st.emits.filter(e => e.type === 'fx' && e.name === name);
  const dmg = id => st.emits.filter(e => e.type === 'damage' && e.ab && e.ab.id === id);
  const engage = () => { step(0.1); kit.press(Q); step(3); };   // (hitting the boss with the knife: the hounds start to bite)
  const run = secs => { for (let i = 0; i < Math.round(secs / 0.5); i++) { kit.engagedAt = st.t; step(0.5); } };   // (a fight that goes on: the knife keeps landing)
  const ang = h => Math.atan2(h.y - st.boss.y, h.x - st.boss.x);
  step(0.2);
  return { kit, st, step, hs, fx, dmg, engage, ang, run };
}
const put = (m, a, b) => { hdOrder(m.kit, m.hs()[0], a); hdOrder(m.kit, m.hs()[1], b); m.step(3); };
// let the hounds stand free for a long while, pressing the knife now and then, and note the pairs they make
function drift(m, secs) {
  const seen = {}; let goalChanges = 0;
  const last = m.hs().map(h => h.goal);
  for (let i = 0; i < secs * 2; i++) {
    if (i % 5 === 0) { m.kit.engagedAt = m.st.t; }
    m.step(0.5);
    const p = m.kit.g.pair || 'none'; seen[p] = (seen[p] || 0) + 1;
    m.hs().forEach((h, j) => { if (h.goal !== last[j]) { goalChanges++; last[j] = h.goal; } });
  }
  return { seen, goalChanges };
}

// 1. the pairs: two flanks Rend, front and behind Hamstring, both behind Bring Down, anything else Snap; and each is its own blow
{
  const cases = [['left', 'right', 'rend', 420], ['right', 'left', 'rend', 420], ['front', 'behind', 'hamstring', 480], ['behind', 'front', 'hamstring', 480], ['behind', 'behind', 'bringdown', 700],
    ['left', 'left', 'snap', 300], ['right', 'right', 'snap', 300], ['front', 'left', 'snap', 300], ['front', 'front', 'snap', 300], ['right', 'behind', 'snap', 300]];
  for (const [a, b, want, pot] of cases) {
    const m = make();
    m.engage(); put(m, a, b);
    check(m.hs().every(h => h.slot) && m.hs()[0].slot === a && m.hs()[1].slot === b, `${a} + ${b}: the hounds should stand in their slots (${m.hs().map(h => h.slot)})`);
    const pair = m.kit.g.pair;
    check((pair || 'snap') === want, `${a} + ${b} should be ${want} (pair ${pair})`);
    check(m.kit.label(m.kit.abilities[E]) === { rend: 'Rend', hamstring: 'Hamstring', bringdown: 'Bring Down', snap: 'Snap' }[want], `the finisher's name follows the pair (${m.kit.label(m.kit.abilities[E])})`);
    m.kit.g.bond = 100; m.st.emits.length = 0;
    check(m.kit.press(E), `${want}: the finisher should fire with 100 Bond`);
    const d = m.dmg('finisher')[0];
    check(d && near(d.potency, pot, 0.5), `${want} should hit for ${pot} (${d && d.potency})`);
    check(m.kit.g.bond < 61 && m.kit.g.bond > 59 - 0.01 || near(m.kit.g.bond, 60, 12), `it spends 40 Bond (${m.kit.g.bond})`);
    check(m.fx('finisher')[0] && m.fx('finisher')[0].data.pair === want, `the finisher's fx names the pair (${JSON.stringify(m.fx('finisher')[0] && m.fx('finisher')[0].data)})`);
    check(want === 'rend' ? m.kit.dots.has('rend') : !m.kit.dots.has('rend'), `${want}: Rend alone leaves a bleed`);
    const vuln = m.st.emits.filter(e => e.type === 'targetDebuff');
    check(want === 'hamstring' ? vuln.length === 1 && near(vuln[0].value, 0.05) && vuln[0].dur === 10 : vuln.length === 0, `${want}: Hamstring alone weakens the boss for 10s (${vuln.length})`);
  }
  // a hound still on its way makes no pair (null slot), and no Bond means no finisher
  const m = make();
  m.engage();
  hdOrder(m.kit, m.hs()[0], 'left'); hdOrder(m.kit, m.hs()[1], 'right'); m.step(0.05);
  check(!m.kit.g.pair, 'hounds that have not arrived make no pair');
  m.kit.g.bond = 39; check(!m.kit.press(E), 'the finisher needs 40 Bond');
}

// 2. a free hound drifts by itself (so a newbie gets Rend about half the time), and bites
{
  const m = make({ seed: 99 });
  m.engage();
  const { seen, goalChanges } = drift(m, 240);
  const total = Object.values(seen).reduce((a, b) => a + b, 0), rend = (seen.rend || 0) / total;
  check(goalChanges >= 20, `free hounds should keep picking a flank (${goalChanges} changes in 240s)`);
  check(rend > 0.25 && rend < 0.75 && !seen.hamstring && !seen.bringdown, `a free pair is Rend about half the time, and nothing front or back (rend ${(rend * 100).toFixed(0)}%, ${JSON.stringify(seen)})`);
  check((m.kit.stats.bites || 0) > 40, `the hounds bite on their own (${m.kit.stats.bites})`);
  check(m.kit.g.bond > 0 || m.kit.stats.overcap, 'the bites build Bond');
  // a boss that turns sends free hounds round, and they pick again; the pair is the facing's, not the world's
  const m2 = make({ seed: 7 });
  m2.engage(); m2.kit.engagedAt = m2.st.t;
  const rings = m2.hs().map(h => h.ring);
  m2.st.face += 1.3; m2.step(2.5);
  check(m2.hs().every((h, i) => h.ring !== rings[i]), 'a turn moves the free hounds round');
}

// 3. Hold keeps both slots through a turn and a move; without it the order itself wears off (ORDER s) and the hounds drift
{
  const m = make({ seed: 5 });
  m.engage(); put(m, 'left', 'right');
  check(m.kit.g.pair === 'rend', 'a pincer to start');
  check(m.kit.press(R), 'the first press of R is the hold');
  check(m.kit.label(m.kit.abilities[R]) === 'Pounce', 'and the button now says Pounce');
  check(m.kit.readyIn(m.kit.abilities[R]) < 1, `a second press can come at once (${m.kit.readyIn(m.kit.abilities[R]).toFixed(2)}s)`);
  const goals = m.hs().map(h => h.goal);
  m.st.face += 1.2; m.st.boss.x += 60; m.st.boss.y -= 40; m.step(6);
  check(m.hs().map(h => h.goal).join() === goals.join() && m.kit.g.pair === 'rend', `held hounds keep their sides through a turn and a step (${m.hs().map(h => h.slot)})`);
  const a0 = m.ang(m.hs()[0]) - m.st.face;
  check(near(Math.abs(Math.abs(a0) - Math.PI / 2), 0, 0.5), `and have gone round with the boss (${a0.toFixed(2)} from its facing)`);
  m.step(10);   // the hold wears off (15s); the orders were long ago
  const picks = drift(m, 60);
  check(picks.goalChanges >= 2, `after the hold the hounds are free again (${picks.goalChanges} changes)`);
}

// 4. Hold, then pounce: a hit each, and both land behind (Bring Down); the cooldown is the pounce's
{
  const m = make({ seed: 3 });
  m.engage(); put(m, 'left', 'right');
  m.st.emits.length = 0;
  check(m.kit.press(R), 'hold');
  m.step(0.8);
  check(m.dmg('pounce').length === 0, 'the hold hits nothing');
  check(m.kit.press(R), 'pounce');
  m.step(0.1);
  check(m.hs().every(h => h.mode === 'pounce'), `both hounds are in the air (${m.hs().map(h => h.mode)})`);
  m.step(1.8);
  check(m.hs().every(h => h.slot === 'behind') && m.kit.g.pair === 'bringdown', `they land behind: Bring Down (${m.hs().map(h => h.slot)}, ${m.kit.g.pair})`);
  const pd = m.dmg('pounce');
  check(pd.length === 2 && pd.every(d => near(d.potency, 250, 0.5)), `a 250 hit each (${pd.map(d => d.potency)})`);
  check(m.fx('pounce').length === 1 && m.fx('pounce')[0].data.hounds.length === 2, 'the pounce fx names the hounds');
  check(m.kit.readyIn(m.kit.abilities[R]) > 6, `the pounce starts the 10s cooldown (${m.kit.readyIn(m.kit.abilities[R]).toFixed(1)}s)`);
  check(m.kit.label(m.kit.abilities[R]) === 'Whistle: Hold', 'the key is the hold again');
  // they stay behind for the finisher that follows, through a turn
  m.st.face += 1; m.step(4);
  check(m.kit.g.pair === 'bringdown', 'and stay behind through a turn for the next few seconds');
  // the loot: a pounce that lands in a pair gives 10 Bond per hound
  const m2 = make({ seed: 3 });
  m2.kit.gear = () => ({ perks: new Set(['houndmaster_w3']) });
  m2.engage(); put(m2, 'left', 'right');
  const b0 = m2.kit.g.bond; m2.kit.press(R); m2.step(0.8); m2.kit.press(R); m2.step(2);
  check(m2.kit.g.bond - b0 >= 20, `houndmaster_w3: Bond for each hound that lands in a pair (${b0} -> ${m2.kit.g.bond})`);
}

// 5. Whistle: Flank sends the next hound to the side the cursor points at; Shift the other; with the cursor on the boss, the flank nearest you
{
  const m = make({ seed: 8 });
  m.engage();
  const first = m.kit.g.next;
  m.st.aim = { x: 500, y: 700 };   // (below the boss: its right when it faces +x)
  check(m.kit.press(W), 'a Whistle');
  m.step(2);
  const h = m.hs().find(x => x.id === first);
  check(h.slot === 'right' && h.orderUntil > m.st.t, `the next hound goes to the side the cursor is over (${h.id} ${h.slot})`);
  check(m.kit.g.next !== first, 'and the next one is the other');
  m.step(3);
  m.st.aim = { x: 800, y: 500 };   // (in front)
  m.st.shift = true;
  const nextBefore = m.kit.g.next;
  m.kit.press(W); m.step(2);
  const shifted = m.hs().find(x => x.id !== nextBefore);
  check(shifted.slot === 'front' && shifted.id === first, `Shift sends the other hound, and a cursor in front sends it to the front (${m.hs().map(x => x.id + ':' + x.slot)})`);
  check(m.kit.g.next === nextBefore, 'and the alternation goes on from the one sent');
  // the cursor on the boss: the flank nearest you (you stand at the back, to its left side of the line: y 500, so the tie goes by hound)
  const m3 = make({ seed: 9 });
  m3.engage(); m3.st.pos = { x: 440, y: 640 }; m3.st.aim = { x: 505, y: 505 };
  m3.kit.press(W); m3.step(2);
  check(m3.hs().some(x => x.slot === 'right'), `with the cursor on the boss the hound takes the flank you stand on (${m3.hs().map(x => x.slot)})`);
  // a pair by hand: Rend from two Whistles pointed at opposite sides
  const m4 = make({ seed: 10 });
  m4.engage();
  m4.st.aim = { x: 500, y: 300 }; m4.kit.press(W); m4.step(2.6);
  m4.st.aim = { x: 500, y: 700 }; m4.kit.press(W); m4.step(2.5);
  check(m4.kit.g.pair === 'rend', `two Whistles at opposite flanks make a Rend (${m4.kit.g.pair})`);
}

// 6. a telegraph downs a hound (the kit hears the host's 'houndhit'); it comes back 10s later, next to you, ready
{
  const m = make({ seed: 21 });
  m.engage(); put(m, 'left', 'right');
  const rust = m.hs()[0];
  m.kit.notify('houndhit', { h: rust.id });
  check(rust.mode === 'down' && rust.slot === null && rust.hp === 0, `the hound goes down (${rust.mode})`);
  check(m.fx('houndDown').length === 1, 'and the fx says so');
  m.step(0.1);
  check(!m.kit.g.pair, 'a downed hound breaks the pair');
  m.step(5);
  check(rust.mode === 'down', 'still down 5s on');
  m.step(5.2);
  check(rust.mode !== 'down' && rust.hp === rust.maxHp && m.fx('houndUp').length === 1, `back after 10s (${rust.mode})`);
  m.kit.engagedAt = m.st.t; m.step(3);
  check(rust.goal && rust.ring != null, 'and back at work');
  // Thick Coat: 6s
  const m2 = make({ seed: 22, talents: ['houndmaster_thickcoat'] });
  m2.engage(); const r2 = m2.hs()[0]; m2.kit.notify('houndhit', { h: r2.id }); m2.step(6.3);
  check(r2.mode !== 'down', 'Thick Coat: a downed hound is back in 6s');
  // the shield (the loot) takes one hit, a raidwide is the lesser blow, a spectral hound takes nothing
  const m3 = make({ seed: 23 });
  m3.kit.gear = () => ({ perks: new Set(['houndmaster_a2']) });
  m3.engage(); m3.kit.press(D); m3.step(6);
  const h3 = m3.hs()[0];
  check(h3.shield === true, 'houndmaster_a2: Call Off leaves each hound a shield');
  m3.kit.notify('houndhit', { h: h3.id });
  check(h3.mode !== 'down' && h3.shield === false, 'the shield takes the blow');
  m3.kit.notify('houndhit', { h: h3.id, w: 1 });
  check(h3.mode !== 'down' && h3.hp === 40, `a raidwide the cover would have stopped costs 60 of 100 (${h3.hp})`);
  m3.kit.notify('houndhit', { h: h3.id, w: 1 });
  check(h3.mode === 'down', 'and a second finishes it');
}

// 7. Call Off: both hounds run to you for 5s, nothing touches them, and you take 20% less; it glows when a hound stands in the red
{
  const m = make({ seed: 31 });
  m.engage(); put(m, 'left', 'right');
  check(!m.kit.glows(m.kit.abilities[D]), 'Call Off does not glow with nothing coming');
  m.st.danger = () => true;
  check(m.kit.glows(m.kit.abilities[D]), 'it glows with a telegraph on a hound');
  m.st.danger = null;
  m.st.emits.length = 0;
  check(m.kit.press(D), 'Call Off');
  const mit = m.st.emits.find(e => e.type === 'mit');
  check(mit && mit.target === 'self' && near(mit.pct, 0.2) && mit.dur === 5, `20% less damage for 5s (${JSON.stringify(mit)})`);
  m.step(1.2);
  check(m.hs().every(h => h.mode === 'guard' && Math.hypot(h.x - m.st.pos.x, h.y - m.st.pos.y) < 80), `both hounds are at your side (${m.hs().map(h => Math.round(Math.hypot(h.x - m.st.pos.x, h.y - m.st.pos.y)))})`);
  m.kit.notify('houndhit', { h: m.hs()[0].id });
  check(m.hs()[0].mode === 'guard', 'a telegraph does not touch a hound on guard');
  check(!m.kit.g.pair, 'and they make no pair there');
  m.step(4.5);
  check(m.hs().every(h => h.mode !== 'guard'), 'the guard ends after 5s');
  m.kit.engagedAt = m.st.t; m.step(3);
  check(m.hs().every(h => h.slot), `and they go back to their places (${m.hs().map(h => h.slot)})`);
  check(near(m.kit.readyIn(m.kit.abilities[D]), 15 - 8.7, 0.3), `a 15s cooldown (${m.kit.readyIn(m.kit.abilities[D]).toFixed(1)}s left)`);
}

// 8. Mark the Quarry: the hounds bite 50% faster and Bond doubles for 12s
{
  const bites = q => {
    const m = make({ seed: 41 });
    m.engage(); m.kit.g.bond = 0; m.kit.stats.overcap = {}; if (q) m.kit.press(F);
    m.step(0.1);
    const b0 = m.kit.stats.bites || 0, g0 = m.kit.g.bond; m.run(11);
    return { n: (m.kit.stats.bites || 0) - b0, bond: m.kit.g.bond - g0 + (m.kit.stats.overcap.bond || 0) };
  };
  const a = bites(false), b = bites(true);
  check(b.n > a.n * 1.2, `bites come about 50% faster (${a.n} vs ${b.n})`);
  check(b.bond > a.bond * 1.8, `and Bond doubles (${a.bond.toFixed(0)} vs ${b.bond.toFixed(0)})`);
}

// 9. Wild Hunt: four spectral hounds on the four sides, every pair counts as all three, the finisher is free, then they leave
{
  const m = make({ seed: 51 });
  m.engage(); put(m, 'left', 'left');
  check(m.kit.g.pair === null, 'a same-side pair is nothing');
  m.kit.g.ult = 100; m.kit.g.bond = 0;
  m.st.emits.length = 0;
  check(m.kit.press(T), 'Wild Hunt');
  m.step(1.5);
  const sp = m.kit.g.hounds.filter(h => h.spectral);
  check(sp.length === 4 && sp.map(h => h.slot).sort().join() === 'behind,front,left,right', `four spectral hounds take the four sides (${sp.map(h => h.id + ':' + h.slot)})`);
  check(m.kit.g.all === true && m.kit.g.pair, `every pair counts (all ${m.kit.g.all}, pair ${m.kit.g.pair})`);
  m.st.emits.length = 0;
  const bondBefore = m.kit.g.bond;
  check(m.kit.press(E), 'the finisher with no Bond');
  const d = m.dmg('finisher')[0];
  check(d && near(d.potency, 700, 0.5) && m.kit.dots.has('rend') && m.st.emits.some(e => e.type === 'targetDebuff'), 'Bring Down with the bleed and the weakness, all at once');
  check(m.kit.g.bond === bondBefore, `and it costs no Bond (${bondBefore} -> ${m.kit.g.bond})`);
  m.step(3);
  check(m.dmg('bite').length > 0 && m.kit.g.hounds.filter(h => h.spectral).length === 4, 'the spectral hounds bite');
  m.step(8);
  check(m.kit.g.hounds.length === 2 && m.kit.g.all === false, `after 10s they are gone (${m.kit.g.hounds.length} hounds)`);
  check(m.kit.g.ult < 5, `and the charge was spent (${m.kit.g.ult.toFixed(1)})`);
  // the finisher fills the charge from the Bond it spends
  const m2 = make({ seed: 52 });
  m2.engage(); put(m2, 'left', 'right'); m2.kit.g.ult = 0; m2.kit.g.bond = 100;
  const u0 = m2.kit.g.ult; m2.kit.press(E);
  check(m2.kit.g.ult - u0 > 2 && m2.kit.g.ult - u0 < 4, `a finisher charges Wild Hunt 2.8% (${(m2.kit.g.ult - u0).toFixed(2)})`);
  // King of the Pack: the spectral hounds stay 4s more
  const m3 = make({ seed: 53, talents: ['houndmaster_kingofpack'] });
  m3.engage(); m3.kit.g.ult = 100; m3.kit.press(T); m3.step(12);
  check(m3.kit.g.hounds.some(h => h.spectral) && !m3.kit.g.all, 'King of the Pack: they stay 4s past the window');
  m3.step(4);
  check(!m3.kit.g.hounds.some(h => h.spectral), 'and then go');
  // the loot: the pack opens with a pounce
  const m4 = make({ seed: 54 });
  m4.kit.gear = () => ({ perks: new Set(['houndmaster_w7']) });
  m4.engage(); m4.kit.g.ult = 100; m4.st.emits.length = 0; m4.kit.press(T);
  check(m4.dmg('bite').length === 4, `houndmaster_w7: a pounce from all four spectral hounds (${m4.dmg('bite').length})`);
}

// 10. the host: a telegraph that resolves over a hound tells its owner; down, guarding, mid-pounce and spectral hounds are not touched
function host() {
  const ps = [{ id: 1, name: 'hunter', role: 'dps', cls: 'houndmaster', x: 0, y: 0 }, { id: 2, name: 'tank', role: 'tank', cls: 'bastion', x: 60, y: 0 }];
  const sent = [];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, m => sent.push(m), 7);
  sim.state = 'live'; sim.t = 100; sim.boss.autoAt = 1e9;
  return { sim, sent };
}
{
  const { sim, sent } = host();
  const list = (modes = {}) => [{ x: 300, y: 300, mode: modes.rust || 'run', slot: 'left', id: 'rust' }, { x: 900, y: 900, mode: 'run', slot: 'right', id: 'ash' }, { x: 300, y: 310, mode: 'run', slot: 'front', id: 'sp0' }];
  sim.setHounds(1, list());
  sim.aoe({ kind: 'circle', x: 300, y: 300, r: 80 }, 1, 100);
  for (let i = 0; i < 40; i++) { sim.setHounds(1, list()); sim.tick(0.05); }
  const hits = sent.filter(m => m.t === 'fev' && m.k === 'houndhit');
  check(hits.length === 1 && hits[0].id === 1 && hits[0].h === 'rust' && hits[0].w === 0, `a circle over the hound tells its owner once (${JSON.stringify(hits)})`);
  for (const mode of ['down', 'guard', 'pounce']) {
    const h = host();
    h.sim.setHounds(1, list({ rust: mode }));
    h.sim.aoe({ kind: 'circle', x: 300, y: 300, r: 80 }, 1, 100);
    for (let i = 0; i < 40; i++) { h.sim.setHounds(1, list({ rust: mode })); h.sim.tick(0.05); }
    check(!h.sent.some(m => m.t === 'fev' && m.k === 'houndhit'), `a hound in mode ${mode} is not touched (and nor is a spectral one next to it)`);
  }
  // a stale owner (its client stopped reporting) is not judged, and a dead one neither
  const s2 = host();
  s2.sim.setHounds(1, list());
  s2.sim.aoe({ kind: 'circle', x: 300, y: 300, r: 80 }, 2.5, 100);
  for (let i = 0; i < 60; i++) s2.sim.tick(0.05);
  check(!s2.sent.some(m => m.t === 'fev' && m.k === 'houndhit'), 'hounds nobody is reporting any more are not judged');
  // the 'hounds' message: [[owner, [[x, y, mode, slot, id], ...]]], about ten a second, downed hounds included, cleared when the fight ends
  const s3 = host();
  const rows = () => [{ x: 10, y: 20, mode: 'run', slot: 'left', id: 'rust' }, { x: 30, y: 40, mode: 'down', slot: null, id: 'ash' }];
  s3.sim.setHounds(1, rows());
  let n = 0; for (let i = 0; i < 20; i++) { s3.sim.setHounds(1, rows()); s3.sim.tick(0.05); }
  const msgs = s3.sent.filter(m => m.t === 'hounds' && m.l.length);
  n = msgs.length;
  check(n >= 8 && n <= 12, `about ten 'hounds' messages a second (${n} in a second)`);
  check(JSON.stringify(msgs[0].l) === JSON.stringify([[1, [[10, 20, 'run', 'left', 'rust'], [30, 40, 'down', null, 'ash']]]]), `the message carries the owner and every hound (${JSON.stringify(msgs[0].l)})`);
  s3.sim.end('clear');
  const last = s3.sent.filter(m => m.t === 'hounds').pop();
  check(last && last.l.length === 0 && s3.sim.liveHounds().length === 0, 'and the list is cleared when the fight ends');
  // rows arriving as arrays (the client's message) are the same rows; junk is dropped
  const s4 = host();
  s4.sim.setHounds(1, [[10, 20, 'run', 'left', 'rust'], [5, 5, 'banana', 'sideways', 'x'.repeat(40)], null]);
  const lh = s4.sim.liveHounds();
  check(lh.length === 3 && lh[0][1].id === 'rust' && lh[1][1].mode === 'run' && lh[1][1].slot === null && lh[1][1].id.length <= 12, 'array rows are read, and junk is cleaned');
  s4.sim.setHounds(99, [[1, 2, 'run', null, 'rust']]);
  check(!s4.sim.hounds.has(99), 'a hunter who is not in the fight has no hounds');
}

// 11. the kit and the host talking: the kit's list goes to the host every tick, the host's hit comes back, the pair and the Bond hold up
{
  const ps = [{ id: 1, name: 'hunter', role: 'dps', cls: 'houndmaster', x: 0, y: 0 }, { id: 2, name: 'tank', role: 'tank', cls: 'bastion', x: 60, y: 0 }];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, script() {} };
  let kit = null;
  const sent = [];
  const sim = new FightSim(def, 'normal', () => ps, m => { sent.push(m); if (m.t === 'fev' && m.id === 1 && m.k === 'houndhit') kit.notify('houndhit', m); }, 11);
  sim.state = 'live'; sim.t = 0; sim.boss.autoAt = 1e9;
  const me = sim.ps.get(1);
  const b = { id: 'boss', x: 400, y: 400 };
  let rs = 1111;   // (seeded: the kit rolls its drift and bites from env.rng)
  const rng = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const env = { now: () => sim.t, rng, moving: () => false, target: ab => (ab.target === 'enemy' ? b : null), positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}),
    recentDamage: () => 0, maxHp: () => me.maxHp, hpFrac: () => 1, isDead: () => false, talents: () => null, boss: () => null, pos: () => ({ x: 280, y: 400 }), aim: () => null, bossFace: () => 0,
    hounds: l => sim.setHounds(1, l), emit: () => {} };
  kit = new Kit(kitFor('houndmaster', null), env);
  sim.boss.x = 400; sim.boss.y = 400;
  for (let i = 0; i < 20 * 20; i++) { sim.tick(0.05); kit.update(); if (i % 50 === 0) kit.press(Q); }
  const lastMsg = sent.filter(m => m.t === 'hounds' && m.l.length).pop();
  check(lastMsg && lastMsg.l[0][0] === 1 && lastMsg.l[0][1].length === 2 && lastMsg.l[0][1].map(r => r[4]).sort().join() === 'ash,rust', `the host hands the kit's two hounds to everyone (${JSON.stringify(lastMsg && lastMsg.l)})`);
  check(lastMsg && lastMsg.l[0][1].every(r => Math.hypot(r[0] - 400, r[1] - 400) > 60 && Math.hypot(r[0] - 400, r[1] - 400) < 200), 'standing round the boss');
  // a telegraph on one of them: the host tells the kit, the hound is down in the next message, and back ten seconds on
  const rust = kit.g.hounds[0];
  sim.aoe({ kind: 'circle', x: rust.x, y: rust.y, r: 40 }, 0.5, 100);
  for (let i = 0; i < 40; i++) { sim.tick(0.05); kit.update(); }
  check(kit.g.hounds[0].mode === 'down', `the telegraph reached the kit through the host (${kit.g.hounds[0].mode})`);
  const down = sent.filter(m => m.t === 'hounds').pop();
  check(down.l[0][1].some(r => r[2] === 'down' && r[4] === 'rust'), 'the next message sends it as down');
  for (let i = 0; i < 20 * 10.5; i++) { sim.tick(0.05); kit.update(); }
  check(kit.g.hounds[0].mode !== 'down', 'and it is back 10s later');
  check(kit.stats.bites > 5 && kit.g.bond >= 0, `bites went on (${kit.stats.bites})`);
}

// 12. a Houndmaster bot in a headless raid: it keeps its hounds out of the red, makes pairs, finishes with them, and the host sends its hounds
{
  const events = [];
  const host_ = new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => [], bots: ['bastion:base', 'houndmaster:base', 'cleric:base', 'ranger:base'], seed: 17, emit: m => events.push(m) });
  const orig = host_.emitOut; host_.emitOut = m => { events.push(m); orig(m); };
  let guard = 0;
  while (host_.sim.state !== 'live' && guard++ < 400) host_.tick(0.05);
  const sim = host_.sim, bot = host_.bots[1], kit = bot.actor.kit;
  const pairs = {};
  let maxBond = 0, downs = 0, wasDown = false, errors = null;
  try {
    while (sim.t < 150 && sim.state === 'live') {
      host_.tick(0.05);
      const p = kit.g.pair || 'none'; pairs[p] = (pairs[p] || 0) + 1;
      maxBond = Math.max(maxBond, kit.g.bond);
      const anyDown = kit.g.hounds.some(h => h.mode === 'down');
      if (anyDown && !wasDown) downs++;
      wasDown = anyDown;
    }
  } catch (e) { errors = e; }
  check(!errors, `the raid should run without an error (${errors && errors.stack})`);
  const hm = events.filter(m => m.t === 'hounds' && m.l.some(r => r[0] === bot.id));
  check(hm.length > 200, `the host sent the bot's hounds all fight (${hm.length} messages)`);
  check(hm.some(m => m.l.find(r => r[0] === bot.id)[1].length === 2), 'two hounds in them');
  check((kit.stats.bites || 0) > 20 && (kit.stats.finishers || 0) > 5, `the bot's hounds bite and its finisher is used (${kit.stats.bites} bites, ${kit.stats.finishers} finishers)`);
  const fins = ['fin_rend', 'fin_hamstring', 'fin_bringdown', 'fin_snap'].map(k => `${k.slice(4)} ${kit.stats[k] || 0}`).join(', ');
  const planned = (kit.stats.fin_rend || 0) + (kit.stats.fin_hamstring || 0) + (kit.stats.fin_bringdown || 0);
  check(planned > (kit.stats.fin_snap || 0) * 2, `the bot mostly finishes on a pair (${fins})`);
  check((kit.stats.fin_hamstring || 0) + (kit.stats.fin_bringdown || 0) > 0, 'and not only Rend');
  check((kit.stats.houndsDown || 0) <= 8, `and keeps its hounds out of most of the red (${kit.stats.houndsDown} downed in 150s)`);
  check(sim.stats[bot.id] && sim.stats[bot.id].damage > 0, 'its damage reached the meter');
  console.log(`bot Houndmaster: ${kit.stats.bites} bites, finishers ${fins}, ${kit.stats.houndsDown || 0} hounds downed, ${kit.stats.pounces || 0} pounces, damage ${sim.stats[bot.id].damage}`);
}

// 13. the talents, rows I-V (talents.js TALENTS.houndmaster; each case holds just the one talent)
const TN = n => 'houndmaster_' + n;
const press3 = m => { for (let i = 0; i < 3; i++) { m.kit.press(Q); m.step(2.6); } };
{
  // Heel Nip: the third knife hit sends the nearer hound to where it makes a pair with the other
  const run3 = (talents, a, b) => { const m = make({ seed: 61, talents }); m.engage(); put(m, a, b); press3(m); m.step(1); return m; };
  const mn = run3([TN('heelnip')], 'left', 'left'), m0 = run3(null, 'left', 'left');
  check(m0.kit.g.pair === null, 'without Heel Nip two hounds on one side stay a Snap');
  check(mn.kit.g.pair === 'rend' && (mn.kit.stats.nips || 0) === 1, `Heel Nip: the third hit sends one hound across, and the pair is a Rend (${mn.kit.g.pair}, ${mn.hs().map(h => h.goal)})`);
  const ms = run3([TN('heelnip')], 'left', 'right');
  check(ms.kit.g.pair === 'rend' && !ms.kit.stats.nips, 'Heel Nip leaves a pair that already stands alone');
  const mf = run3([TN('heelnip')], 'front', 'front');
  check(mf.kit.g.pair === 'hamstring', `two hounds in front: the nip makes a Hamstring (${mf.kit.g.pair})`);
  const mh = make({ seed: 61, talents: [TN('heelnip')] }); mh.engage(); put(mh, 'left', 'left'); mh.kit.press(R); press3(mh);
  check(!mh.kit.stats.nips, 'and a Hold is respected');
}
{
  // Scent Line: the Whistle's hound bites for 120 on its way through the boss
  const go = talents => { const m = make({ seed: 62, talents }); m.engage(); m.st.aim = { x: 500, y: 700 }; m.st.emits.length = 0; m.kit.press(W); return m; };
  const m = go([TN('scentline')]), m0 = go(null);
  check(m.dmg('flank').length === 1 && near(m.dmg('flank')[0].potency, 120, 0.5), `Scent Line: the Whistle bites for 120 (${m.dmg('flank').map(d => d.potency)})`);
  check(m0.dmg('flank').length === 0, 'and without it the Whistle is only a word');
}
{
  // Echo Bark: the same pair twice in a row repeats at 30%; another pair or a Snap does not
  const m = make({ seed: 63, talents: [TN('echobark')] });
  m.engage(); put(m, 'left', 'right');
  m.kit.g.bond = 100; m.st.emits.length = 0;
  m.kit.press(E); m.step(1);
  check(m.dmg('finisher').length === 1, `the first Rend has no echo (${m.dmg('finisher').length} blows)`);
  m.step(1.6); m.kit.g.bond = 100; m.kit.press(E); m.step(0.2);
  check(m.dmg('finisher').length === 2, 'the echo waits a moment');
  m.step(0.5);
  const ds = m.dmg('finisher');
  check(ds.length === 3 && near(ds[2].potency, 84, 0.5), `a second Rend in a row echoes at 20% of 420 (${ds.map(d => d.potency)})`);
  m.step(2.6); m.kit.g.bond = 100; m.st.emits.length = 0;
  m.kit.press(E); m.step(1);
  check(m.dmg('finisher').length === 2, 'a third Rend in a row echoes again (it and its echo)');
  const m2 = make({ seed: 63, talents: [TN('echobark')] });
  m2.engage(); put(m2, 'left', 'left'); m2.kit.g.bond = 100; m2.kit.press(E); m2.step(2.6); m2.kit.g.bond = 100; m2.st.emits.length = 0; m2.kit.press(E); m2.step(1);
  check(m2.dmg('finisher').length === 1, 'a Snap twice does not echo');
}
{
  // Guard Dog: Call Off sets a hound in the way, a shield on you for 8s
  const go = talents => { const m = make({ seed: 64, talents }); m.engage(); m.st.emits.length = 0; m.kit.press(D); return m; };
  const sh = go([TN('guarddog')]).st.emits.find(e => e.type === 'shield'), none = go(null).st.emits.find(e => e.type === 'shield');
  check(sh && sh.target === 'self' && sh.dur === 8 && sh.amount > 50, `Guard Dog: a shield on you for 8s (${JSON.stringify(sh)})`);
  check(!none, 'and Call Off alone gives none');
}
{
  // Fetch: Call Off drags you toward the nearest hound, up to 150, never into the boss
  const m = make({ seed: 65, talents: [TN('fetch')] });
  m.engage(); put(m, 'left', 'right'); m.st.pos = { x: 300, y: 560 }; m.st.emits.length = 0;
  m.kit.press(D);
  const tp = m.st.emits.find(e => e.type === 'teleport');
  check(tp && tp.where === 'point', `Fetch moves you to a point (${JSON.stringify(tp)})`);
  const moved = tp ? Math.hypot(tp.x - 300, tp.y - 560) : 0, toBoss = tp ? Math.hypot(tp.x - 500, tp.y - 500) : 0;
  check(moved > 30 && moved <= 150.5, `by at most 150 (${moved.toFixed(0)})`);
  check(toBoss >= 99, `and never into the boss (${toBoss.toFixed(0)} from its centre)`);
  const m0 = make({ seed: 65 }); m0.engage(); m0.st.emits.length = 0; m0.kit.press(D);
  check(!m0.st.emits.some(e => e.type === 'teleport'), 'without Fetch, Call Off moves nobody');
}
{
  // Shared Kill: a finisher on a boss below 30% gives 20 Bond back (the world's boss() reports its health)
  const go = hp => { const m = make({ seed: 66, talents: [TN('sharedkill')] }); m.engage(); put(m, 'left', 'right'); m.st.bossHp = hp; m.kit.g.bond = 100; m.kit.press(E); return m.kit.g.bond; };
  check(near(go(0.2), 80, 0.01) && near(go(0.5), 60, 0.01) && near(go(0.3), 60, 0.01), `Shared Kill: 60 Bond left, 80 below 30% (${go(0.5)}, ${go(0.2)})`);
}
{
  // Howl: a move on W; the party deals 5% more for 8s, both hounds hold, and the Hold button now pounces
  const m = make({ seed: 67, talents: [TN('howl')] });
  const ab = m.kit.abilities[W];
  check(ab.id === 'howl' && ab.replaces === 'flank' && ab.fromTalent === TN('howl'), `Howl takes Whistle: Flank's button (${ab.id})`);
  m.engage(); put(m, 'left', 'right'); m.st.emits.length = 0;
  check(m.kit.press(W), 'Howl');
  const pb = m.st.emits.find(e => e.type === 'partyBuff');
  check(pb && pb.kind === 'dmg' && near(pb.value, 0.05) && pb.dur === 8, `the party deals 5% more for 8s (${JSON.stringify(pb)})`);
  check(m.fx('howl').length === 1 && hdHolding(m.kit) && m.hs().every(h => h.mode === 'hold'), 'and the hounds hold');
  check(m.kit.label(m.kit.abilities[R]) === 'Pounce', 'so the Hold button says Pounce');
  check(m.kit.readyIn(ab) > 20, `a 25s cooldown (${m.kit.readyIn(ab).toFixed(1)})`);
  m.st.face += 1.2; m.step(5);
  check(m.kit.g.pair === 'rend', 'a held pincer rides out a turn');
  m.kit.press(R); m.step(2.2);
  check(m.kit.g.pair === 'bringdown', 'and one press of the Hold button pounces them behind');
}
{
  // Running Bond: Bond fills while a hound runs to a new place
  const go = talents => { const m = make({ seed: 68, talents }); m.engage(); put(m, 'left', 'left'); m.kit.g.bond = 0; m.kit.stats.overcap = {}; m.kit.engagedAt = -99;
    hdOrder(m.kit, m.hs()[0], 'right'); hdOrder(m.kit, m.hs()[1], 'behind'); m.step(1.5); return m.kit.g.bond; };
  const a = go(null), b = go([TN('runningbond')]);
  check(b - a >= 3 && b - a <= 20, `Running Bond: Bond comes while they run (${a.toFixed(1)} vs ${b.toFixed(1)})`);
  const m = make({ seed: 68, talents: [TN('runningbond')] }); m.engage(); put(m, 'left', 'right'); m.kit.engagedAt = -99; const b0 = m.kit.g.bond; m.step(4);
  check(near(m.kit.g.bond, b0, 0.01), `and none while they stand still (${b0} -> ${m.kit.g.bond})`);
}
{
  // Blood Scent: while the Mark lasts every bite also bites the nearest add
  const go = (talents, mark) => { const m = make({ seed: 69, talents }); m.st.enemies = [{ id: 'boss', x: 500, y: 500, r: 70 }, { id: 'add1', x: 640, y: 560, r: 30 }];
    m.engage(); if (mark) m.kit.press(F); m.st.emits.length = 0; m.run(8); return m.st.emits.filter(e => e.type === 'damage' && e.tgt === 'add1').length; };
  const n = go([TN('bloodscent')], true);
  check(n >= 4 && go([TN('bloodscent')], false) === 0 && go(null, true) === 0, `Blood Scent: the Mark's bites reach the add (${n}), nothing else's do`);
}
{
  // Drive: the Mark also holds both hounds for as long as it lasts
  const go = talents => { const m = make({ seed: 70, talents }); m.engage(); put(m, 'left', 'right'); m.kit.press(F); m.step(0.2);
    return { hold: m.kit.g.holdUntil - m.st.t, modes: m.hs().map(h => h.mode) }; };
  const dv = go([TN('drive')]), d0 = go(null);
  check(near(dv.hold, 11.8, 0.3) && dv.modes.every(x => x !== 'run') && !(d0.hold > 0), `Drive: the Mark holds both hounds for its length (${dv.hold.toFixed(1)}s, ${dv.modes} / ${d0.hold})`);
}
{
  // Cornered: the Mark ends with a pounce from both hounds
  const m = make({ seed: 71, talents: [TN('cornered')] });
  m.engage(); put(m, 'left', 'right'); m.kit.press(F); m.st.emits.length = 0;
  m.run(11);
  check(m.dmg('pounce').length === 0, 'no pounce while the Mark lasts');
  m.run(2);
  check(m.fx('pounce').length === 1 && m.dmg('pounce').length === 2, `Cornered: the Mark ends in a pounce from both (${m.fx('pounce').length}, ${m.dmg('pounce').length})`);
  m.run(2);
  check(m.kit.g.pair === 'bringdown', 'and they land behind');
}
{
  // King of the Pack is read in section 9; The Long Chase is a move on F: four bites round the boss, then both hounds behind
  const m = make({ seed: 72, talents: [TN('longchase')] });
  const ab = m.kit.abilities[F];
  check(ab.id === 'longchase' && ab.replaces === 'quarry' && ab.fromTalent === TN('longchase'), `The Long Chase takes Mark the Quarry's button (${ab.id})`);
  m.engage(); put(m, 'left', 'right'); m.kit.g.bond = 0; m.kit.stats.overcap = {}; m.st.emits.length = 0;
  check(m.kit.press(F), 'the Long Chase');
  check(m.fx('longchase').length === 1, 'its fx');
  m.step(0.1);
  check(m.dmg('longchase').length === 0, 'the first quarter takes a moment');
  m.step(1.4);
  const ds = m.dmg('longchase');
  check(ds.length === 4 && ds.every(d => near(d.potency, 250, 0.5)), `four bites of 250 (${ds.map(d => d.potency)})`);
  m.step(3);
  check(m.kit.g.pair === 'bringdown', `and it ends in a Bring Down pair (${m.kit.g.pair})`);
  check(m.kit.readyIn(ab) > 40, `a 45s cooldown (${m.kit.readyIn(ab).toFixed(1)})`);
}
{
  // Alpha: a Bring Down is a sure crit with both hounds' own Bond full
  const go = bond => { const m = make({ seed: 73, talents: [TN('alpha')] }); m.engage(); put(m, 'behind', 'behind'); m.hs().forEach(h => { h.bond = bond; }); m.kit.g.bond = 100; m.st.emits.length = 0; m.kit.press(E); return { crit: m.dmg('finisher')[0].crit, n: m.kit.stats.alphas || 0 }; };
  const full = go(100), part = go(80);
  check(full.crit === true && full.n === 1 && part.n === 0, `Alpha: sure crit at full Bond only (${JSON.stringify(full)} / ${JSON.stringify(part)})`);
  const m = make({ seed: 73, talents: [TN('alpha')] }); m.engage(); put(m, 'left', 'right'); m.hs().forEach(h => { h.bond = 100; }); m.kit.g.bond = 100; m.kit.press(E);
  check(!m.kit.stats.alphas, 'and for a Bring Down only');
}

// the cooldowns and reach: Call Off 15s, Whistle 1s, the finisher from any range
{
  const m = make({ seed: 79 }), ab = id => m.kit.abilities.find(a => a.id === id);
  check(ab('calloff').cd === 15 && ab('flank').cd === 1 && ab('finisher').range >= 2000, `Call Off 15s, Whistle 1s, the finisher reaches from anywhere (${ab('calloff').cd} / ${ab('flank').cd} / ${ab('finisher').range})`);
}

// 14. the loot: a hound whistled out from the front pays 10 Bond; a Snap brings a downed hound back
{
  const go = (perk, a) => { const m = make({ seed: 74 }); if (perk) m.kit.gear = () => ({ perks: new Set(['houndmaster_w2']) });
    m.engage(); put(m, a, 'behind'); m.st.aim = { x: 500, y: 700 }; m.kit.g.next = m.hs()[0].id; m.kit.g.bond = 0; m.kit.press(W); return m.kit.g.bond; };
  check(go(true, 'front') === 10 && go(true, 'left') === 0 && go(false, 'front') === 0, `houndmaster_w2: 10 Bond for a hound whistled out from the front, and only then (${go(true, 'front')})`);
  // a downed hound breaks every pair, so the finisher is a Snap: with the perk it brings the hound back
  const snap = perk => { const m = make({ seed: 75 }); if (perk) m.kit.gear = () => ({ perks: new Set(['houndmaster_a4']) });
    m.engage(); put(m, 'behind', 'behind'); m.kit.notify('houndhit', { h: 'rust' }); m.step(0.1); m.kit.g.bond = 100;
    const was = m.hs()[0].mode, fin = m.kit.g.pair; m.kit.press(E); return { was, fin, now: m.hs()[0].mode, up: m.fx('houndUp').length, last: m.kit.g.lastFin && m.kit.g.lastFin.pair }; };
  const a4 = snap(true), n4 = snap(false);
  check(a4.was === 'down' && a4.last === 'snap' && a4.now !== 'down' && a4.up === 1 && n4.now === 'down', `houndmaster_a4: a Snap brings the downed hound back at once (${JSON.stringify(a4)} / ${n4.now})`);
  const m = make({ seed: 76 }); m.kit.gear = () => ({ perks: new Set(['houndmaster_a4']) });
  m.engage(); put(m, 'behind', 'behind'); m.kit.g.bond = 100; m.kit.press(E);
  check(m.hs().every(h => h.mode !== 'down'), 'a finisher with nobody down changes nothing');
}

// 15. Pack Leader (the Two-Dog Hunt): Pounce keeps two charges and a pounce in a pair pays 20 Bond, Harmony, and spec rows VI and VII
{
  const m = make({ spec: 'packleader', seed: 81 });
  check(m.kit.def.spec === 'packleader' && m.kit.abilities[D].id === 'calloff' && m.kit.abilities[D].cd === 15, 'the Pack Leader keeps Call Off');
  m.engage(); put(m, 'left', 'right');
  const P = m.kit.abilities[R];
  check(m.kit.charges(P) === 2, 'Pounce has two charges');
  check(m.kit.press(R) && m.kit.charges(P) === 2, 'the hold (first press) takes no charge');
  m.step(0.8);
  m.kit.g.bond = 0; const b0 = m.kit.stats.bites || 0;
  check(m.kit.press(R) && m.kit.charges(P) === 1, 'the pounce takes one');
  m.step(2.2);
  check(m.kit.g.pair === 'bringdown', `both land behind (${m.kit.g.pair})`);
  const gain = 20 + 5 * ((m.kit.stats.bites || 0) - b0);
  check(near(m.kit.g.bond, gain, 0.6), `a pounce that forms a pair gives 20 Bond (${m.kit.g.bond} vs ${gain})`);
  // the second charge: hold and pounce again at once, then the key is spent
  check(m.kit.press(R) && m.kit.charges(P) === 1, 'a second hold');
  m.step(0.8);
  check(m.kit.press(R) && m.kit.charges(P) === 0, 'and a second pounce');
  check(m.kit.readyIn(P) > 5, `and then it recharges (${m.kit.readyIn(P).toFixed(1)}s)`);
  // the base kit: no second charge, no Bond from a pounce
  const mb = make({ seed: 81 }); mb.engage(); put(mb, 'left', 'right');
  check(!mb.kit.abilities[R].charges && !mb.kit.def.pounceBond, 'and the base class has neither');
}
{
  // Harmony: a finisher on a pair you did not use last time does 10% more
  const m = make({ spec: 'packleader', seed: 83 });
  m.engage(); put(m, 'left', 'right');
  const fin = m.kit.abilities[E], mod = () => m.kit.def.dmgMod(m.kit, { ab: fin });
  check(near(mod(), 0.1), `the first finisher is on a new pair (${mod()})`);
  m.kit.g.bond = 100; m.kit.press(E); m.step(3);
  check(m.kit.g.lastFin.pair === 'rend' && mod() === 0, `the same pair again is plain (${mod()})`);
  put(m, 'front', 'behind');
  check(near(mod(), 0.1), `another pair earns it (${mod()})`);
  check(m.kit.def.dmgMod(m.kit, { ab: m.kit.abilities[Q] }) === 0, 'and only the finisher does');
  // the bleed of a Rend that was new carries it too
  const mr = make({ spec: 'packleader', seed: 83 }); mr.engage(); put(mr, 'front', 'behind'); mr.kit.g.bond = 100; mr.kit.press(E); mr.step(3);
  put(mr, 'left', 'right'); mr.kit.def.dmgMod(mr.kit, { ab: mr.kit.abilities[E] });
  check(near(mr.kit.def.dmgMod(mr.kit, { ab: { id: 'rend' }, dot: true }), 0.1), 'a Rend on a new pair has the bleed hit 10% harder too');
}
{
  // Pincer Drill: Rend's bleed also takes hold on the nearest add
  const go = (talents, a, b) => { const m = make({ spec: 'packleader', seed: 84, talents }); m.st.enemies = [{ id: 'boss', x: 500, y: 500 }, { id: 'imp2', x: 700, y: 520 }, { id: 'imp1', x: 560, y: 580 }];
    m.engage(); put(m, a, b); m.kit.g.bond = 100; m.kit.press(E); return m.kit.dots.get('rend2'); };
  const d = go(['houndmaster_pincerdrill'], 'left', 'right');
  check(d && d.opts.tgt === 'imp1', `Pincer Drill: Rend's bleed also bleeds the nearest add (${d && d.opts.tgt})`);
  check(!go(['houndmaster_pincerdrill'], 'front', 'behind') && !go(null, 'left', 'right'), 'and only a Rend, and only with the talent');
  const m = make({ spec: 'packleader', seed: 84, talents: ['houndmaster_pincerdrill'] }); m.engage(); put(m, 'left', 'right'); m.kit.g.bond = 100; m.kit.press(E);
  check(!m.kit.dots.has('rend2'), 'with no add there is nothing to jump to');
}
{
  // Tag Team: after a Call Off the next finisher counts every pair
  const go = (tag, call) => { const m = make({ spec: 'packleader', seed: 85, talents: tag ? ['houndmaster_tagteam'] : null }); m.engage();
    if (call) { m.kit.press(D); m.step(5.5); } put(m, 'behind', 'behind'); m.kit.g.bond = 100; m.st.emits.length = 0; m.kit.press(E);
    return { rend: m.kit.dots.has('rend'), vuln: m.st.emits.filter(e => e.type === 'targetDebuff').length, tt: m.kit.stats.tagTeams || 0, m }; };
  const a = go(true, true), b = go(true, false), c = go(false, true);
  check(a.rend && a.vuln === 1 && a.tt === 1, `Tag Team: a Bring Down after a Call Off has the bleed and the weakness too (${JSON.stringify({ r: a.rend, v: a.vuln, t: a.tt })})`);
  check(!b.rend && b.vuln === 0 && !c.rend && c.vuln === 0, 'and neither without the Call Off nor without the talent');
  a.m.kit.g.bond = 100; a.m.step(3); a.m.st.emits.length = 0; a.m.kit.press(E);
  check(a.m.st.emits.filter(e => e.type === 'targetDebuff').length === 0, 'it is for one finisher');
}
{
  // Hunting Horn: a landed pounce turns the boss's face toward you for a beat (the host), and the hounds keep their sides through it
  const m = make({ spec: 'packleader', seed: 86, talents: ['houndmaster_huntinghorn'] });
  m.engage(); put(m, 'left', 'right'); m.kit.press(R); m.step(0.8); m.st.emits.length = 0; m.kit.press(R);
  for (let i = 0; i < 80 && !m.st.emits.some(e => e.type === 'horn'); i++) m.step(0.05);
  const horns = m.st.emits.filter(e => e.type === 'horn');
  check(horns.length === 1 && horns[0].dur === 1.5, `Hunting Horn: the landed pounce sounds it (${horns.length})`);
  const f0 = hdFace(m.kit, m.st.boss);
  m.st.face += 1.5;
  check(hdFace(m.kit, m.st.boss) === f0, 'and for the beat the hounds read the face it had');
  m.step(2.2);
  check(near(hdFace(m.kit, m.st.boss), f0 + 1.5, 0.001), 'then the face is the boss\'s own again');
  const mb = make({ spec: 'packleader', seed: 86 }); mb.engage(); put(mb, 'left', 'right'); mb.kit.press(R); mb.step(0.8); mb.kit.press(R); mb.step(2);
  check(!mb.st.emits.some(e => e.type === 'horn'), 'and nothing without the talent');
  // the host: the boss's face swings to the hunter for 1.5s, then back to the tank; its target stays the tank's
  const ps = [{ id: 1, name: 'hunter', role: 'dps', cls: 'houndmaster', x: 0, y: 200 }, { id: 2, name: 'tank', role: 'tank', cls: 'bastion', x: 200, y: 0 }];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, () => {}, 9);
  sim.state = 'live'; sim.t = 100; sim.boss.autoAt = 1e9; sim.boss.x = 0; sim.boss.y = 0;
  sim.tick(0.05);
  const face0 = sim.boss.facing;
  sim.onEvent(1, { type: 'horn', dur: 1.5 }); sim.tick(0.05);
  const face1 = sim.boss.facing, tgt1 = sim.boss.target;
  for (let i = 0; i < 40; i++) sim.tick(0.05);
  check(near(face0, 0, 0.2) && near(face1, Math.PI / 2, 0.2) && near(sim.boss.facing, 0, 0.2) && tgt1 === 2, `the host turns the boss to the hunter for a beat (${face0.toFixed(2)} > ${face1.toFixed(2)} > ${sim.boss.facing.toFixed(2)}, target ${tgt1})`);
}
{
  // Littermates: when one hound bites, the other bites too one time in five (and for no Bond)
  const go = talents => { const m = make({ spec: 'packleader', seed: 87, talents }); m.engage(); m.run(240); return m.kit.stats; };
  const a = go(['houndmaster_littermates']), b = go(null);
  const own = (a.bites || 0) - (a.litters || 0), share = (a.litters || 0) / own;
  check(share > 0.1 && share < 0.3 && !b.litters, `Littermates: about one bite in five has the other hound along (${a.litters} of ${own}, none without)`);
}

// 16. Lone Wolf (the Rider): Greyfang alone, the pair is its place and yours, One Heart, Mount and Ride Down, spec rows VI and VII
const stand = (m, slot) => { const a = m.st.face + HD_OFF[slot]; m.st.pos = { x: m.st.boss.x + Math.cos(a) * 140, y: m.st.boss.y + Math.sin(a) * 140 }; };
{
  const m = make({ spec: 'lonewolf', seed: 91 });
  check(m.hs().length === 1 && m.hs()[0].id === 'greyfang' && m.hs()[0].maxHp === 220 && m.kit.def.solo, `one hound, Greyfang, bigger (${m.hs().map(h => h.id + ':' + h.maxHp)})`);
  check(m.kit.abilities[W].id === 'mount' && m.kit.abilities[W].replaces === 'flank' && m.kit.abilities[W].name === 'Mount', 'Whistle: Flank is Mount');
  // the pairs: Greyfang's place and yours
  const cases = [['left', 'right', 'rend', 420], ['right', 'left', 'rend', 420], ['behind', 'left', 'bringdown', 700], ['behind', 'right', 'bringdown', 700], ['behind', 'behind', 'bringdown', 700],
    ['behind', 'front', 'hamstring', 480], ['front', 'behind', 'hamstring', 480], ['left', 'behind', 'snap', 300], ['left', 'left', 'snap', 300], ['right', 'front', 'snap', 300], ['front', 'left', 'snap', 300]];
  for (const [gf, me, want, pot] of cases) {
    const w = make({ spec: 'lonewolf', seed: 92 });
    w.engage(); hdOrder(w.kit, w.hs()[0], gf); stand(w, me); w.step(3);
    check(w.hs()[0].slot === gf, `Greyfang ${gf}, you ${me}: Greyfang should stand in its place (${w.hs()[0].slot})`);
    check((w.kit.g.pair || 'snap') === want, `Greyfang ${gf} + you ${me} should be ${want} (${w.kit.g.pair})`);
    w.kit.g.bond = 100; w.st.emits.length = 0; w.kit.press(E);
    const d = w.dmg('finisher')[0];
    check(d && near(d.potency, pot, 0.5), `${want} hits for ${pot} (${d && d.potency})`);
  }
  // a hound still on its way, or you out of reach of the boss, make no pair
  const w = make({ spec: 'lonewolf', seed: 92 }); w.engage(); hdOrder(w.kit, w.hs()[0], 'behind'); stand(w, 'left'); w.step(0.05);
  check(!w.kit.g.pair, 'Greyfang on its way makes no pair');
  w.step(3); w.st.pos = { x: 5000, y: 5000 }; w.step(0.1);
  check(!w.kit.g.pair, 'and nor do you, far from the boss');
  // a free Greyfang picks a flank or the back, a third of the time each
  const f = make({ spec: 'lonewolf', seed: 93 }); f.engage();
  const goals = {}; let last = null;
  for (let i = 0; i < 1200; i++) { if (i % 5 === 0) f.kit.engagedAt = f.st.t; f.step(0.5); const g = f.hs()[0].goal; if (g !== last) { goals[g] = (goals[g] || 0) + 1; last = g; } }
  check(goals.left > 10 && goals.right > 10 && goals.behind > 10 && !goals.front, `a free Greyfang drifts between both flanks and the back (${JSON.stringify(goals)})`);
  // One Heart: its bites give half again the Bond, and hit as hard as a bigger hound would
  const g = make({ spec: 'lonewolf', seed: 94 }); g.engage(); g.kit.g.bond = 0; g.kit.stats.bites = 0; g.run(8);
  const bites = g.kit.stats.bites;
  check(bites >= 2 && near(g.kit.g.bond, bites * 7.5, 0.6), `One Heart: each bite gives 7.5 Bond (${bites} bites, ${g.kit.g.bond})`);
  check(g.dmg('bite').every(d => near(d.potency, 82.5, 0.5)), `and Greyfang bites for 82.5 (${g.dmg('bite').map(d => d.potency)})`);
}
{
  // Mount: Greyfang under you, a quicker walk, the knife a mounted charge, the button Ride Down
  const m = make({ spec: 'lonewolf', seed: 95 });
  m.engage();
  m.st.emits.length = 0;
  check(m.kit.press(W), 'Mount');
  m.step(0.1);
  const gf = m.hs()[0], MT = m.kit.abilities[W];
  check(hdMounted(m.kit) && m.fx('mount').length === 1 && m.kit.has('mounted'), 'riding, with the fx and the buff');
  check(MT.name === 'Ride Down' && MT.fxId === 'ridedown' && MT.icon === 'ridedown' && m.kit.glows(MT), `the button is Ride Down, glowing (${MT.name})`);
  check(m.kit.label(m.kit.abilities[Q]) === 'Charge', 'and the knife is a charge');
  check(Math.hypot(gf.x - m.st.pos.x, gf.y - m.st.pos.y) < 12 && gf.mode === 'guard', 'Greyfang is under you');
  check(m.kit.def.moveMult(m.kit) === 1.5, 'you run half as fast again');
  check(abilityById('houndmaster', 'lonewolf', 'ridedown') && abilityById('houndmaster', 'lonewolf', 'ridedown').name === 'Ride Down', 'other players can find Ride Down by its id');
  // the charge: 260 and a bite with it; no bites of its own while it carries you
  m.step(2.6); m.st.emits.length = 0;
  check(m.kit.press(Q), 'a charge');
  const ch = m.dmg('knife'), bi = m.dmg('bite');
  check(ch.length === 1 && near(ch[0].potency, 260, 0.5) && bi.length === 1, `a mounted charge hits for 260 with Greyfang\'s bite (${ch.map(d => d.potency)} / ${bi.length})`);
  m.step(1.2);
  // a ride down: a blow for 550, the bar back, the cooldown starts now
  check(m.kit.readyIn(MT) < 0.1, 'Ride Down is ready');
  m.st.emits.length = 0;
  check(m.kit.press(W), 'Ride Down');
  const rd = m.dmg('mount');
  check(rd.length === 1 && near(rd[0].potency, 550, 0.5) && m.fx('ridedown').length === 1, `Ride Down hits for 550 (${rd.map(d => d.potency)})`);
  m.step(0.1);
  check(!hdMounted(m.kit) && m.kit.abilities[W].name === 'Mount' && !m.kit.has('mounted') && m.kit.label(m.kit.abilities[Q]) !== 'Charge', 'the ride is over and the bar is back');
  check(m.kit.readyIn(m.kit.abilities[W]) > 15 && m.kit.readyIn(m.kit.abilities[W]) <= 20, `Mount\'s cooldown starts at the dismount (${m.kit.readyIn(m.kit.abilities[W]).toFixed(1)}s)`);
  m.kit.engagedAt = m.st.t; m.step(3);
  check(m.hs()[0].mode !== 'guard' && m.hs()[0].goal, 'Greyfang is back at work');
  // a ride that runs out: no blow, and the cooldown starts then
  const t = make({ spec: 'lonewolf', seed: 96 }); t.engage(); t.kit.press(W); t.st.emits.length = 0; t.step(6.3);
  check(!hdMounted(t.kit) && t.kit.abilities[W].name === 'Mount' && t.dmg('mount').length === 0 && t.kit.readyIn(t.kit.abilities[W]) > 15, `a ride that runs out is just a dismount, and the cooldown starts (${t.kit.readyIn(t.kit.abilities[W]).toFixed(1)}s)`);
  // Wild Hunt opening and closing in the ride does not take the bar apart
  const w = make({ spec: 'lonewolf', seed: 97 }); w.engage(); w.kit.press(W); w.step(0.6); w.kit.g.ult = 100; w.kit.press(T); w.step(0.2);
  check(w.kit.abilities[W].name === 'Ride Down', 'Wild Hunt in the ride keeps Ride Down on the bar');
  w.step(10.5);
  check(w.kit.abilities[W].name === 'Mount' && !hdMounted(w.kit), 'and the bar is back after both');
  // while riding Hold/Pounce is not usable; Call Off still is
  const r = make({ spec: 'lonewolf', seed: 98 }); r.engage(); r.kit.press(W); r.step(0.6);
  check(!r.kit.usable(r.kit.abilities[R]), 'no Hold or pounce while riding');
  // Saddle Born: two seconds longer
  const sb = make({ spec: 'lonewolf', seed: 99, talents: ['houndmaster_saddleborn'] }); sb.engage(); sb.kit.press(W);
  check(near(sb.kit.g.mountUntil - sb.st.t, 8, 0.01), `Saddle Born: a ride of 8s (${(sb.kit.g.mountUntil - sb.st.t).toFixed(2)})`);
  // Leap Off: Ride Down lands where you aim, up to 220 away
  const lo = make({ spec: 'lonewolf', seed: 100, talents: ['houndmaster_leapoff'] }); lo.engage(); lo.kit.press(W); lo.step(0.7);
  lo.st.aim = { x: 360, y: 900 }; lo.st.emits.length = 0; lo.kit.press(W);
  const mv = lo.st.emits.find(e => e.type === 'teleport');
  check(mv && mv.where === 'point' && near(mv.x, 360, 1) && near(mv.y, 720, 1), `Leap Off: Ride Down lands 220 toward the cursor (${mv && mv.x},${mv && mv.y})`);
  const lo2 = make({ spec: 'lonewolf', seed: 100, talents: ['houndmaster_leapoff'] }); lo2.engage(); lo2.kit.press(W); lo2.step(0.7); lo2.st.aim = { x: 420, y: 560 }; lo2.st.emits.length = 0; lo2.kit.press(W);
  const mv2 = lo2.st.emits.find(e => e.type === 'teleport');
  check(mv2 && near(mv2.x, 420, 1) && near(mv2.y, 560, 1), 'and a nearer cursor is where it lands');
  const nl = make({ spec: 'lonewolf', seed: 100 }); nl.engage(); nl.kit.press(W); nl.step(0.7); nl.st.aim = { x: 360, y: 900 }; nl.st.emits.length = 0; nl.kit.press(W);
  check(!nl.st.emits.some(e => e.type === 'teleport'), 'and it stays put without the talent');
}
{
  // Old Scars: Greyfang takes 30% less from a raidwide
  const go = talents => { const m = make({ spec: 'lonewolf', seed: 101, talents }); m.engage(); m.kit.notify('houndhit', { h: 'greyfang', w: 1 }); return m.hs()[0].hp; };
  check(near(go(['houndmaster_oldscars']), 220 - 42, 0.01) && near(go(null), 160, 0.01), `Old Scars: a raidwide costs Greyfang 42, not 60 (${go(['houndmaster_oldscars'])} / ${go(null)})`);
  const m = make({ spec: 'lonewolf', seed: 101, talents: ['houndmaster_oldscars'] }); m.engage(); m.kit.notify('houndhit', { h: 'greyfang' }); m.kit.notify('houndhit', { h: 'greyfang' });
  check(m.hs()[0].hp === 20 && m.hs()[0].mode !== 'down', 'and a telegraph proper is still 100 (a bigger hound takes two)');
  m.kit.notify('houndhit', { h: 'greyfang' });
  check(m.hs()[0].mode === 'down', 'and the third downs it');
  // Fang and Knife: the bite a knife hit lets Greyfang have is twice as hard
  const fk = talents => { const w = make({ spec: 'lonewolf', seed: 102, talents }); w.engage(); w.step(2.6); w.kit.press(Q); w.step(2.6); w.st.emits.length = 0; w.kit.press(Q); return w.dmg('bite').map(d => d.potency); };
  const a = fk(['houndmaster_fangknife']), b = fk(null);
  check(a.length >= 1 && near(a[0], 165, 0.5) && b.length >= 1 && near(b[0], 82.5, 0.5), `Fang and Knife: the third hit's bite is doubled (${a} / ${b})`);
  // ... and a bite a few seconds later is not
  const w2 = make({ spec: 'lonewolf', seed: 102, talents: ['houndmaster_fangknife'] }); w2.engage(); w2.kit.press(Q); w2.step(1.5); w2.st.emits.length = 0;
  w2.kit.engagedAt = w2.st.t; w2.step(8);
  check(w2.dmg('bite').every(d => near(d.potency, 82.5, 0.5)), 'and a bite long after the knife is plain');
}

// 17. both specs in a headless raid: the bots keep their hounds, make pairs, and the Lone Wolf rides
for (const spec of ['packleader', 'lonewolf']) {
  const events = [];
  const host_ = new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => [], bots: ['bastion:base', 'houndmaster:' + spec, 'cleric:base', 'ranger:base'], seed: 21, emit: m => events.push(m) });
  let guard = 0;
  while (host_.sim.state !== 'live' && guard++ < 400) host_.tick(0.05);
  const sim = host_.sim, bot = host_.bots[1], kit = bot.actor.kit;
  const pairs = {};
  let errors = null, rode = 0, wasRiding = false;
  try {
    while (sim.t < 150 && sim.state === 'live') {
      host_.tick(0.05);
      const p = kit.g.pair || 'none'; pairs[p] = (pairs[p] || 0) + 1;
      const r = hdMounted(kit); if (r && !wasRiding) rode++; wasRiding = r;
    }
  } catch (e) { errors = e; }
  check(!errors, `${spec}: the raid should run without an error (${errors && errors.stack})`);
  check(kit.def.spec === spec && kit.def.hounds ? true : spec === 'packleader', `${spec}: the bot plays the spec`);
  const fins = ['rend', 'hamstring', 'bringdown', 'snap'].map(x => `${x} ${kit.stats['fin_' + x] || 0}`).join(', ');
  check((kit.stats.finishers || 0) > 5 && (kit.stats.bites || 0) > 20, `${spec}: the bot bites and finishes (${kit.stats.bites} bites, ${fins})`);
  check((kit.stats.houndsDown || 0) <= 8, `${spec}: and keeps its hounds out of most of the red (${kit.stats.houndsDown} downed)`);
  const planned = (kit.stats.fin_rend || 0) + (kit.stats.fin_hamstring || 0) + (kit.stats.fin_bringdown || 0);
  check(planned > (kit.stats.fin_snap || 0), `${spec}: it mostly finishes on a pair (${fins})`);
  if (spec === 'lonewolf') {
    check(rode >= 3 && (kit.stats.rideDowns || 0) >= 2, `the Lone Wolf bot rides and leaps off (${rode} rides, ${kit.stats.rideDowns || 0} Ride Downs)`);
    check((kit.stats.fin_bringdown || 0) > 0 && (kit.stats.fin_rend || 0) > 0, 'and makes both a Pack and a Rend');
  } else {
    check((kit.stats.relays || 0) >= 0 && (kit.stats.pounces || 0) > 2, `the Pack Leader bot pounces (${kit.stats.pounces}) and Relays when a hound is in the red (${kit.stats.relays || 0})`);
  }
  console.log(`bot ${spec}: ${kit.stats.bites} bites, finishers ${fins}, ${kit.stats.houndsDown || 0} hounds downed, ${kit.stats.pounces || 0} pounces, ${kit.stats.relays || 0} relays, ${rode} rides, ${kit.stats.rideDowns || 0} ride downs, damage ${sim.stats[bot.id].damage}`);
}

if (probs.length) { console.log(probs.join('\n')); console.log('Houndmaster FAILED'); process.exit(1); }
console.log('Houndmaster OK (pairs, drift and hold, pounce, Call Off, Wild Hunt, the host and its message, a bot raid, talents I-V and the loot, Pack Leader and Lone Wolf)');
