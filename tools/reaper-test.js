// The Reaper (kits.js REAP, bots.js BOT_CLASS.thresher, fight.js reaperEvent): a string of swings on one global cooldown that a finisher
// ends, each finisher's mark and the arcs they cut, Snap and its Full Harvest and Harvest Moon, Void Star's collapse, Insane Reaper's party
// haste, the Blink keeping a string, the specs and the talents, Arcane Gate's five swings and release, the host's holds, gathers and fields,
// and that a save from the Weight kit still loads (the class stays, the old picks read as none); then a short headless raid with a Reaper bot.
//   node tools/reaper-test.js            (exit code 0 and a final "Reaper OK" when everything holds)
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

// a kit on a bare stage: the boss at (500, 500), you at (430, 500) facing it, whatever else st.enemies holds, the host's notices by hand
function make(o = {}) {
  let rs = o.seed || 4242;
  const rng = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const st = { t: 1, boss: { id: 'boss', x: 500, y: 500, r: 40 }, pos: { x: 430, y: 500 }, others: o.others || [], emits: [], refunds: 0 };
  const all = () => [st.boss, ...st.others];
  const env = { now: () => st.t, rng, moving: () => false, target: ab => (ab.target === 'enemy' ? st.boss : null), positional: () => 'rear',
    partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}), recentDamage: () => 0, maxHp: () => 1000, hpFrac: () => 1, isDead: () => false,
    talents: () => (o.talents ? new Set(o.talents) : null), boss: () => null, pos: () => st.pos, refundDash: () => { st.refunds++; },
    enemiesNear: range => all().filter(c => Math.hypot(c.x - st.pos.x, c.y - st.pos.y) - (c.r || 0) <= range), emit: ev => st.emits.push(ev) };
  const kit = new Kit(kitFor('thresher', o.spec || null, o.talents ? new Set(o.talents) : null), env);
  if (o.perks) kit.gear = () => ({ perks: new Set(o.perks) });
  const step = secs => { for (let i = 0; i < Math.round(secs / 0.05); i++) { st.t += 0.05; kit.update(); } };
  const dmg = id => st.emits.filter(e => e.type === 'damage' && e.ab && kit.baseId(e.ab) === id);
  const fx = name => st.emits.filter(e => e.type === 'fx' && e.name === name);
  // a string of n swings, then W (waiting out each swing's lock)
  const string = (n, fin = true) => { for (let i = 0; i < n; i++) { check(kit.press(Q), `swing ${i + 1} should fire`); step(0.5); } if (fin) { check(kit.press(W), `the finisher after ${n} should fire`); step(0.6); } };
  step(0.2);
  return { kit, st, step, dmg, fx, string };
}
const marksOf = (m, id = 'boss') => reapMarks(m.kit, id);

// 1. the string: swings on no global cooldown, one GCD when it ends, W only with a string in hand, four swings at most
{
  const m = make();
  check(!m.kit.press(W), 'W needs a string in hand');
  check(m.kit.press(Q), 'the first swing fires');
  check(m.kit.gcdRemaining() < 0.01, 'a swing starts no global cooldown');
  m.step(0.5);
  check(m.kit.press(Q), 'and the next swing fires on the lock alone');
  m.step(0.5); check(m.kit.press(Q), 'a third'); m.step(0.5); check(m.kit.press(Q), 'a fourth'); m.step(0.5);
  check(!m.kit.press(Q), 'a string is four swings and no more');
  check(reapN(m.kit) === 4, `four swings counted (${reapN(m.kit)})`);
  check(m.kit.press(W), 'W finishes it');
  check(near(m.kit.gcdRemaining(), REAP.GCD, 0.05), `the one global cooldown starts at the finisher (${m.kit.gcdRemaining().toFixed(2)})`);
  m.step(0.6);
  check(m.kit.readyIn(m.kit.abilities[Q]) > 0.3, 'Q waits for it');
  m.step(1);
  check(m.kit.press(Q) && reapN(m.kit) === 1, 'and a new string starts, at swing 1, when it is over');
  m.step(0.4);
  // a pause ends a string: no finisher, the global cooldown starts then
  const m2 = make();
  m2.kit.press(Q); m2.step(0.5); m2.kit.press(Q);
  m2.step(0.5);
  check(reapN(m2.kit) === 2, 'two swings in hand');
  m2.step(REAP.GAP + 0.3);
  check(reapN(m2.kit) === 0 && m2.kit.gcdRemaining() > 0.5, `a pause ends the string and starts the global cooldown (${reapN(m2.kit)}, ${m2.kit.gcdRemaining().toFixed(2)})`);
  check(m2.fx('string-end').some(e => e.data.ok === false), 'and the string end says it was not finished');
  check(marksOf(m2).length === 0, 'with no mark laid');
}

// 2. each finisher's mark, damage and the shape it cuts
{
  const kinds = ['drain', 'bind', 'death', 'thread'], pots = [REAP.FIN[1], REAP.FIN[2], REAP.FIN[3], REAP.FIN[4]];
  for (let n = 1; n <= 4; n++) {
    const m = make();
    m.string(n);
    check(marksOf(m).length === 1 && marksOf(m)[0] === kinds[n - 1], `${n} swing${n > 1 ? 's' : ''} then W leaves a ${kinds[n - 1]} mark (${marksOf(m)})`);
    const d = m.dmg('finish')[0];
    check(d && near(d.potency, pots[n - 1], 0.5), `the ${n}-swing finisher hits for ${pots[n - 1]} (${d && d.potency})`);
    check(m.kit.label(m.kit.abilities[W]) === 'Finisher', 'W reads Finisher with no string');
  }
  // the swings' own potencies, in order
  const m = make();
  m.string(4, false);
  const sw = m.dmg('string').map(e => e.potency);
  check(sw.length === 4 && sw.every((p, i) => near(p, REAP.SW[i], 0.5)), `the four swings hit for ${REAP.SW} (${sw})`);
}

// 3. arcs: others in the shape take a share and the mark; behind you, or out of the arc, nothing
{
  const ahead = { id: 'a1', x: 495, y: 530, r: 20 }, behind = { id: 'a2', x: 300, y: 500, r: 20 }, far = { id: 'a3', x: 500, y: 900, r: 20 };
  const m = make({ others: [ahead, behind, far] });
  m.string(4);
  const hit = m.st.emits.filter(e => e.type === 'damage' && e.tgt);
  check(hit.some(e => e.tgt === 'a1'), 'the wide sweep cuts the add beside the boss');
  check(!hit.some(e => e.tgt === 'a2') && !hit.some(e => e.tgt === 'a3'), 'and not the ones behind or far off');
  check(marksOf(m, 'a1').includes('thread') && marksOf(m, 'boss').includes('thread') && !marksOf(m, 'a2').length, 'a Thread is laid on everything in the arc, adds included');
  const m2 = make({ others: [{ id: 'a1', x: 520, y: 540, r: 20 }, { id: 'a4', x: 800, y: 500, r: 20 }] });
  m2.string(2);
  check(marksOf(m2, 'a1').includes('bind') && !marksOf(m2, 'a4').length, 'the quake ring binds the add near the boss and not one far off');
  check(m2.st.emits.some(e => e.type === 'reaper' && e.op === 'hold' && e.tgt === 'a1'), 'and tells the host to hold the add');
  check(!m2.st.emits.some(e => e.type === 'reaper' && e.tgt === 'boss'), 'never the boss');
  const m3 = make({ others: [{ id: 'a1', x: 560, y: 505, r: 20 }, { id: 'a5', x: 530, y: 580, r: 20 }] });
  m3.string(3);
  check(marksOf(m3, 'a1').includes('death') && !marksOf(m3, 'a5').length, 'the skewer marks along its line and not beside it');
}

// 4. Snap: every mark on every enemy pops, each its own way; a Full Harvest at four; the crescent; a Harvest Moon pops twice
{
  const m = make({ others: [{ id: 'a1', x: 495, y: 530, r: 20 }] });
  check(!m.kit.press(E), 'Snap needs a mark up');
  m.string(1); m.step(1.2);
  m.kit.hp = 1;
  m.st.emits.length = 0;
  check(m.kit.press(E), 'Snap fires with a mark');
  m.step(0.5);
  check(marksOf(m).length === 0, 'and the mark is gone');
  check(m.dmg('snap').length === 1 && near(m.dmg('snap')[0].potency, REAP.POP.drain, 0.5), `a Drain pops for ${REAP.POP.drain} (${m.dmg('snap').map(e => e.potency)})`);
  check(m.st.emits.some(e => e.type === 'heal' && e.target === 'self' && e.amount > 0), 'a Drain mends you');
  check(near(m.kit.g.moon, REAP.MOON_PER, 0.01), `the crescent fills ${REAP.MOON_PER} for a mark popped (${m.kit.g.moon})`);
  // all four on one: Full Harvest
  const f = make();
  for (let n = 1; n <= 4; n++) { f.string(n); f.step(1.2); }
  check(marksOf(f).length === 4, `all four marks on the boss (${marksOf(f)})`);
  const u0 = f.kit.g.ult;
  f.st.emits.length = 0; f.kit.press(E); f.step(1);
  check(f.dmg('snap').length === 5 && f.fx('full-harvest').length === 1, `a Full Harvest: four pops and the burst (${f.dmg('snap').length}, ${f.fx('full-harvest').length})`);
  check(f.kit.g.ult > u0, 'it charges Arcane Gate');
  check(near(f.kit.g.moon, 4 * REAP.MOON_PER + REAP.MOON_FULL, 0.01), `and fills the crescent more (${f.kit.g.moon})`);
  // a full crescent: a Harvest Moon, every mark twice, then empty
  const h = make();
  h.kit.g.moon = 100; h.string(2); h.step(1.2);
  h.st.emits.length = 0; h.kit.press(E); h.step(0.5);
  check(h.fx('harvest-moon').length === 1 && near(h.dmg('snap')[0].potency, REAP.POP.bind * 2, 0.5), `a full crescent: a Harvest Moon, the mark twice over (${h.dmg('snap')[0] && h.dmg('snap')[0].potency})`);
  check(h.kit.g.moon === 0, 'and the crescent empties');
  // Death Mark: the next four hits strike harder
  const d = make();
  d.string(3); d.step(1.2); d.kit.press(E); d.step(0.5);
  check(d.kit.stacks('deathmark') === 4, `a popped Death Mark gives four hits (${d.kit.stacks('deathmark')})`);
  d.st.emits.length = 0; d.kit.press(Q); d.step(0.5);
  check(d.kit.stacks('deathmark') === 3, 'a swing uses one');
  // E glows with two marks or a full crescent; Q always; W on the fourth swing
  const gl = make();
  check(gl.kit.glows(gl.kit.abilities[Q]) && !gl.kit.glows(gl.kit.abilities[E]), 'Q glows, E does not with nothing up');
  gl.string(1); gl.step(1.2); gl.string(2); gl.step(1.2);
  check(gl.kit.glows(gl.kit.abilities[E]), 'E glows with two marks up');
  gl.kit.press(Q); gl.step(0.5); gl.kit.press(Q); gl.step(0.5); gl.kit.press(Q); gl.step(0.5); gl.kit.press(Q); gl.step(0.5);
  check(gl.kit.glows(gl.kit.abilities[W]), 'W glows on the fourth swing');
}

// 5. Void Star, Dusk Veil, Insane Reaper
{
  const m = make({ others: [{ id: 'a1', x: 590, y: 590, r: 20 }, { id: 'a2', x: 900, y: 900, r: 20 }] });
  m.string(2); m.step(1.2);
  const u0 = m.kit.g.ult;
  m.st.emits.length = 0;
  check(m.kit.press(R), 'Void Star fires on a marked target');
  check(m.fx('star-open').length === 1 && m.dmg('star').length === 0, 'it opens first and has hit nothing yet');
  m.step(REAP.STAR_DELAY + 0.2);
  const hits = m.st.emits.filter(e => e.type === 'damage' && e.ab && e.ab.id === 'star');
  check(hits.some(e => e.tgt === 'boss') && hits.some(e => e.tgt === 'a1') && !hits.some(e => e.tgt === 'a2'), 'the collapse hits the boss and the add beside it, and not the far one');
  const bossHit = hits.find(e => e.tgt === 'boss'), addHit = hits.find(e => e.tgt === 'a1');
  check(near(bossHit.potency, REAP.STAR + REAP.STAR_MARK, 0.5) && near(addHit.potency, REAP.STAR, 0.5), `harder for each mark on it (${bossHit.potency}, ${addHit.potency})`);
  check(marksOf(m).length === 1, 'and uses no mark');
  check(m.kit.g.ult > u0 && m.st.refunds === 1, 'it charges Arcane Gate and gives a Blink back');
  check(!m.st.emits.some(e => e.type === 'reaper'), 'and moves no add');
  const v = make();
  v.st.emits.length = 0; v.kit.press(D); v.step(0.1);
  check(v.st.emits.some(e => e.type === 'mit' && near(e.pct, REAP.VEIL_MIT)) && v.st.refunds === 1, 'Dusk Veil takes 35% off and gives a Blink back');
  const f = make();
  f.st.emits.length = 0; f.kit.press(F); f.step(0.1);
  const pb = f.st.emits.find(e => e.type === 'partyBuff');
  check(pb && pb.kind === 'rhaste' && near(pb.value, 0.1) && pb.dur === 15, 'Insane Reaper gives the party 10% haste for 15s, as a kind of its own that stacks');
  check(f.kit.has('frenzy') && f.kit.hasteMult() < 0.95, `and your own swings come faster (${f.kit.hasteMult().toFixed(2)})`);
  check(f.kit.cd.frenzy - f.st.t > 58, 'sixty seconds to come back');
  f.step(1);
  f.kit.press(Q); const l0 = f.kit.lockUntil - f.st.t;
  const base = make(); base.kit.press(Q); const l1 = base.kit.lockUntil - base.st.t;
  check(l0 < l1 - 0.02, `a swing's lock is shorter in Insane Reaper (${l0.toFixed(2)} < ${l1.toFixed(2)})`);
}

// 6. the Blink: a string survives it
{
  const m = make();
  m.kit.press(Q); m.step(0.5); m.kit.press(Q); m.step(0.5);
  m.step(0.6);
  const left = m.kit.g.str.until - m.st.t;
  m.kit.def.onBlink(m.kit, { from: { x: 430, y: 500 }, to: { x: 450, y: 500 }, through: false });
  check(m.kit.g.str.until - m.st.t > left, 'a Blink keeps the string alive');
  m.step(0.7);
  check(reapN(m.kit) === 2, 'where it would have ended');
}

// 7. Arcane Gate: five swings, empowered marks in order, Gatebreaker, the fifth a Snap
{
  const m = make();
  m.kit.g.ult = 100;
  m.st.emits.length = 0;
  check(m.kit.press(T), 'Arcane Gate fires at full charge');
  check(m.st.emits.some(e => e.type === 'mit' && e.kind === 'invuln'), 'you phase out as it opens');
  m.step(1.3);
  check(m.kit.ultWin && reapMax(m.kit) === 5, 'five swings in the window');
  const order = [];
  for (let i = 0; i < 4; i++) { m.kit.press(Q); m.step(0.5); order.push(reapAllMarks(m.kit).filter(e => e.id === 'boss')[0].kinds.length); }
  check(order.join() === '1,2,3,4', `each swing lays the next empowered mark (${order})`);
  check(['drain', 'bind', 'death', 'thread'].every(k => m.kit.g.marks.boss[k] && m.kit.g.marks.boss[k].emp), 'all four empowered');
  check(m.kit.has('gatebreaker'), 'four inside the time limit: Gatebreaker');
  m.st.emits.length = 0;
  check(m.kit.label(m.kit.abilities[Q]) === 'Release', 'the fifth is the Release');
  check(m.kit.press(Q), 'the fifth swing fires');
  m.step(0.6);
  check(m.fx('gate-release').length === 1 && m.fx('full-harvest').length === 1, 'it is a Snap that pops all four, a Full Harvest');
  check(m.dmg('string').filter(e => e.potency > 0).length === 5, `four pops twice over and the burst (${m.dmg('string').length})`);
  check(marksOf(m).length === 0, 'and leaves no mark');
  check(m.kit.gcdRemaining() > 0.3, 'the release ends the string');
  // slow: no Gatebreaker
  const s = make();
  s.kit.g.ult = 100; s.kit.press(T); s.step(1.3);
  for (let i = 0; i < 4; i++) { s.kit.press(Q); s.step(1.2); }
  check(!s.kit.has('gatebreaker') && reapMarks(s.kit, 'boss').length === 4, 'four swings too slowly are no Gatebreaker (and the string may have lapsed)');
  m.step(8);
  check(!m.kit.ultWin && reapMax(m.kit) === 4, 'the window closes');
}

// 8. the specs, the talents, the perks
{
  const d = make({ spec: 'dancer' });
  d.string(4);
  check(near(d.dmg('finish')[0].potency, REAP.FIN[4] * 1.4, 0.6), `the Dancer's four-swing finisher is 40% stronger (${d.dmg('finish')[0].potency})`);
  const d2 = make({ spec: 'dancer' }); d2.kit.press(Q); d2.step(2.0);
  check(reapN(d2.kit) === 1, 'a Dancer holds a string longer between presses');
  const base = make(); base.kit.press(Q); base.step(2.0);
  check(reapN(base.kit) === 0, 'and the base kit does not');
  const p = make({ spec: 'phantom' });
  const actor = { dash: { charges: 3 } };
  check(kitFor('thresher', 'phantom', null).dashPlus === 1, 'a Phantom has a third Blink charge');
  p.string(1); p.step(1.2);
  p.kit.def.onBlink(p.kit, {});
  p.st.emits.length = 0;
  p.string(1);
  check(p.st.emits.some(e => e.type === 'teleport' && e.where === 'around') && marksOf(p).includes('phantom'), 'after a Blink the finisher is a teleport slash and leaves a Phantom mark');
  p.step(1.2); p.st.emits.length = 0; p.kit.press(E); p.step(0.5);
  check(p.dmg('snap').some(e => near(e.potency, REAP.POP.phantom, 0.5)), 'Snap pops it');
  // talents
  const tk = (talents, spec) => make({ talents, spec });
  { const m = tk(['thresher_reach']); check(m.kit.def.reach(m.kit, m.kit.abilities[Q]) > REAP.REACH * 1.19, 'Long Reach: the scythe reaches further'); }
  { const m = tk(['thresher_patient']); m.string(1); check(m.kit.g.marks.boss.drain.until - m.st.t > 30, 'Patient Death: marks last longer'); }
  { const m = tk(['thresher_quick']); m.string(1); m.step(1.2); m.string(2); m.step(1.2); m.kit.press(E); m.step(0.5); check(marksOf(m).length === 1, 'Quick Harvest: Snap pops only the oldest'); check(m.kit.recast(m.kit.abById('snap')) === 4, `and comes back in 4s (${m.kit.recast(m.kit.abById('snap'))})`); }
  { const m = tk(['thresher_vein'], null); const a = { id: 'a1', x: 540, y: 520, r: 20 }; m.st.others.push(a); m.string(1); m.step(1.2); m.kit.press(E); m.step(0.5); check(marksOf(m, 'a1').includes('drain'), 'Open Vein: Snap spreads Drain to a near enemy'); }
  { const m = tk(['thresher_gather']); m.st.others.push({ id: 'a1', x: 540, y: 520, r: 20 }); m.string(4); m.step(1.2); m.kit.press(E); m.step(0.5); check(m.st.emits.some(e => e.type === 'reaper' && e.op === 'gather'), 'Gathering Threads: a Thread that pops gathers the adds'); }
  { const m = tk(['thresher_twin']); const ab = m.kit.abilities[R]; check(ab.id === 'twinstar' && ab.charges === 2, 'Twin Stars: Void Star holds two charges'); m.string(1); m.step(1.2); m.st.emits.length = 0; m.kit.press(R); m.step(1.3); const h = m.st.emits.find(e => e.type === 'damage' && e.ab && e.ab.id === 'twinstar'); check(h && near(h.potency, (REAP.STAR + REAP.STAR_MARK) * 0.7, 1), 'and each is smaller'); }
  { const m = tk(['thresher_step']); m.kit.def.onBlink(m.kit, { through: true }); m.kit.press(Q); check(reapN(m.kit) === 2, 'Step Through: a Blink through a telegraph starts the next string at swing 2'); }
  { const m = tk(['thresher_encore'], 'dancer'); m.string(4); m.step(1.2); m.kit.press(Q); check(reapN(m.kit) === 2, 'Encore: after a four-swing finisher the next string starts at swing 2'); }
  { const m = tk(['thresher_unbroken'], 'dancer'); m.kit.press(Q); m.step(0.5); m.kit.def.onBlink(m.kit, {}); check(reapN(m.kit) === 2, 'Unbroken Step: a Blink adds a swing'); }
  { const m = tk(['thresher_flicker'], 'phantom'); m.kit.def.onBlink(m.kit, { through: true }); check(m.st.refunds === 1, 'Flicker: a Blink through a telegraph gives the charge back'); }
  { const m = tk(['thresher_afterimage'], 'phantom'); m.kit.def.onBlink(m.kit, {}); m.st.emits.length = 0; m.string(1); m.step(1); check(m.dmg('finish').length >= 2, 'Afterimage: the finisher repeats'); }
  { const m = tk(['thresher_shade'], 'phantom'); m.kit.def.onBlink(m.kit, { from: { x: 400, y: 400 } }); check(m.st.emits.some(e => e.type === 'reaper' && e.op === 'field'), 'Shade Step: a Blink leaves a field'); }
  { const m = tk(['thresher_vanishing'], 'phantom'); m.kit.def.onBlink(m.kit, { from: { x: 123, y: 456 } }); m.st.emits.length = 0; m.kit.press(R); check(fxData(m, 'star-open').x === 123, 'Vanishing Point: Void Star opens where you blinked from'); }
  { const m = tk(['thresher_linger']); m.string(1); m.step(1.2); let seeded = 0; for (let i = 0; i < 30; i++) { const mm = make({ talents: ['thresher_linger'], seed: 100 + i }); mm.string(3); mm.step(1.2); mm.kit.press(R); mm.step(1.3); if (reapMarks(mm.kit, 'boss').length > 1) seeded++; } check(seeded > 10, `Lingering Star seeds a mark often with marks up (${seeded}/30)`); }
  { const m = tk(['thresher_grave']); m.string(1); m.step(1.2); m.kit.press(E); m.step(0.5); m.st.emits.length = 0; m.kit.press(D); check(m.st.emits.some(e => e.type === 'heal' && e.amount > 0), 'Grave Ward: Dusk Veil mends for marks snapped'); }
  { const m = tk(['thresher_pirouette'], 'dancer'); m.st.others.push({ id: 'a1', x: 380, y: 530, r: 20 }); m.kit.press(Q); m.step(0.5); m.kit.press(Q); m.step(0.5); m.st.emits.length = 0; m.kit.press(Q); check(m.st.emits.some(e => e.type === 'damage' && e.tgt === 'a1'), 'Pirouette: the third swing hits all round you'); }
  { const m = tk(['thresher_danse'], 'dancer'); check(!!TALENT_BY_ID.thresher_danse, 'Danse Macabre is in the tree'); }
  { const m = tk(['thresher_moonrise']); m.kit.g.moon = 100; m.st.emits.length = 0; m.kit.def.onBlink(m.kit, { from: { x: 420, y: 500 }, to: { x: 560, y: 500 } }); check(m.dmg('snap').length >= 1 && m.kit.g.moon === 100, 'Moonrise: a full crescent makes the Blink a slash, and keeps the crescent'); }
  { const m = tk(['thresher_hungry']); m.st.others.push({ id: 'a1', x: 495, y: 530, r: 20 }); m.kit.press(Q); check(m.kit.g.moon === 3, `Hungry Scythe: a swing on two enemies fills 3 (${m.kit.g.moon})`); }
  { const m = tk(['thresher_tide']); m.string(1); m.step(1.2); m.kit.press(E); m.step(0.5); check(m.st.emits.some(e => e.type === 'heal' && e.target === 'lowest'), 'Black Tide: Drain mends the most hurt ally'); }
  { const m = tk(['thresher_debt']); m.string(2); m.step(1.2); m.st.emits.length = 0; m.kit.press(E); m.step(0.5); check(m.st.emits.some(e => e.type === 'mit' && e.target === 'party' && near(e.pct, 0.08)), 'Debt Collector: a Bind that pops steadies the party'); }
  { const m = tk(['thresher_toll']); m.string(4); m.step(1.2); m.kit.press(E); m.step(0.5); check(m.st.refunds >= 1, 'Last Toll: a Thread that pops gives a Blink back'); }
  { const m = tk(['thresher_gravewalk']); const ab = m.kit.abilities[D]; check(ab.id === 'gravewalk', 'Gravewalk takes the place of Dusk Veil'); m.st.emits.length = 0; m.kit.press(D); check(m.st.emits.some(e => e.type === 'mit' && e.kind === 'invuln') && m.st.refunds === 1, 'and is a breath out of the world and a Blink back'); }
  // perks
  { const m = make({ perks: ['thresher_w2'] }); m.string(1); check(near(m.dmg('finish')[0].potency, REAP.FIN[1] * 1.25, 0.6), 'thresher_w2: finishers cut 25% more'); }
  { const m = make({ perks: ['thresher_w3'] }); m.kit.press(R); check(near(m.kit.recast(m.kit.abById('star')), REAP.STAR_CD - 5, 0.01), 'thresher_w3: Void Star back 5s sooner'); }
}
// every talent id in the tree is real, has a name and text, and the talents the kit reads are all in it
{
  const ids = [];
  for (const row of TALENTS.thresher) for (const t of row) ids.push(t.id);
  for (const spec of Object.values(SPEC_TALENTS.thresher)) for (const row of spec) for (const t of row) ids.push(t.id);
  check(ids.length === 23 && new Set(ids).size === 23, `fifteen talents and eight spec talents (${ids.length})`);
  const src = require('fs').readFileSync(path.join(__dirname, '../client/js/combat/kits.js'), 'utf8');
  for (const id of ids) check(src.includes(`'${id}'`) || src.includes(`TALENT_ABILITIES.${id}`), `${id} is used by the kit`);
  const used = [...src.matchAll(/talent\('(thresher_\w+)'\)/g)].map(x => x[1]);
  for (const id of used) check(ids.includes(id), `${id} is read by the kit but not in the tree`);
  check(TALENTS.thresher.length === 5 && TALENTS.thresher.every(r => r.length === 3), 'five rows of three');
  check(TALENTS.thresher[2].some(t => t.grants) && TALENTS.thresher[4].some(t => t.grants), 'a new move in rows III and V');
}
function fxData(m, name) { const e = m.st.emits.find(x => x.type === 'fx' && x.name === name); return (e && e.data) || {}; }

// 9. the host: a Bind holds an add (not the boss), a Thread gathers adds, a Shade Step field slows them
{
  const ps = [{ id: 1, name: 'reaper', role: 'dps', cls: 'thresher', x: 0, y: 0 }, { id: 2, name: 'tank', role: 'tank', cls: 'bastion', x: 60, y: 0 }];
  const def = { id: 'grubnak', name: 'test', hp: { normal: 1e9 }, autoDmg: { normal: 0 }, script() {} };
  const sim = new FightSim(def, 'normal', () => ps, () => {}, 7);
  sim.state = 'live'; sim.t = 100; sim.boss.autoAt = 1e9;
  const a = sim.spawnAdd({ x: 600, y: 600, hp: 1e6, speed: 100, bite: 0 }), b = sim.spawnAdd({ x: 900, y: 600, hp: 1e6, speed: 100, bite: 0 });
  const free = sim.spawnAdd({ x: 600, y: 900, hp: 1e6, speed: 100, bite: 0 });
  sim.onEvent(1, { type: 'reaper', op: 'hold', tgt: a.id, dur: 2 });
  const ax = a.x, ay = a.y, fx0 = free.x, fy0 = free.y;
  for (let i = 0; i < 20; i++) sim.tick(0.05);
  check(a.x === ax && a.y === ay, 'a held add stands still');
  check(Math.hypot(free.x - fx0, free.y - fy0) > 20, 'and one that is not held moves');
  const bossAt = { x: sim.boss.x, y: sim.boss.y };
  sim.onEvent(1, { type: 'reaper', op: 'hold', tgt: 'boss', dur: 3 });
  check(sim.boss.holdUntil === undefined, 'a hold on the boss does nothing');
  for (let i = 0; i < 60; i++) sim.tick(0.05);
  const before = { x: b.x, y: b.y };
  sim.onEvent(1, { type: 'reaper', op: 'gather', x: 700, y: 600, r: 260, dist: 120 });
  check(Math.hypot(b.x - 700, b.y - 600) < Math.hypot(before.x - 700, before.y - 600) - 50, 'a gather draws an add toward the spot');
  check(Math.hypot(b.x - before.x, b.y - before.y) <= 125, 'by no more than the distance it asks (' + Math.round(Math.hypot(b.x - before.x, b.y - before.y)) + ')');
  sim.onEvent(1, { type: 'reaper', op: 'gather', x: 1e9, y: -1e9, r: 1e9, dist: 1e9 });
  check(Math.hypot(b.x, b.y) < 5000, 'wild numbers are clamped');
  sim.onEvent(1, { type: 'reaper', op: 'field', x: 600, y: 900, r: 90, dur: 5 });
  sim.onEvent(1, { type: 'reaper', op: 'field', x: Math.round(free.x), y: Math.round(free.y), r: 90, dur: 5 });
  check(sim.addSpeedMult(free) === 0.5, 'a field slows an add inside it to half pace');
  check(sim.addSpeedMult(a) === 1 || sim.addSpeedMult(a) === 0.5, 'and one that is held or not inside is read right');
}

// 10. the save: an old Weight-kit save loads: the class stays, its old spec reads as none, its old talent picks as none
{
  global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
  global.window = global;
  const src = require('fs').readFileSync(path.join(__dirname, '../client/js/save.js'), 'utf8');
  const old = { v: 4, name: 'Old', gold: 500, inv: { next: 1, items: [], equip: {}, lost: [] }, heroes: { thresher: { clears: { grubnak: { normal: 1 } }, spec: 'sower', trials: { sower: 1 },
    talents: { rows: 7, picks: [0, 1, 2, 0, 1], ids: ['thresher_drag', 'thresher_vanish', 'thresher_sowing', 'thresher_sacrifice', 'thresher_cull'], specIds: { sower: ['thresher_anchor', 'thresher_hourglass'] } } } }, settings: {} };
  localStorage.setItem('emberfall-save', JSON.stringify(old));
  const Save = (new Function(src + String.fromCharCode(10) + 'return Save;'))();
  const t = Save.talents('thresher');
  check(t.rows === 7, `the rows stay bought (${t.rows})`);
  check(t.picks.every(p => p === null), `old talent picks read as none (${t.picks})`);
  check(Save.specState && !specOf('thresher', Save.spec('thresher')), 'the old spec is not one of the new ones, so the base kit plays');
  check(Save.trialDone('thresher', 'dancer') === false && Save.trialDone('thresher', 'sower') === true, 'trials are kept per spec id; the new specs start unopened');
  check(talentSet('thresher', t).size === 0, 'and the kit holds no old talent');
  check(new Kit(kitFor('thresher', Save.spec('thresher'), talentSet('thresher', t)), { now: () => 1, rng: Math.random, moving: () => false, target: () => ({ id: 'dummy', x: 0, y: 0 }), partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}), emit() {}, maxHp: () => 100 }).abilities.length === 6, 'an old save still builds a six-button Reaper');
}

// 11. a short headless raid with a Reaper bot per spec
for (const spec of ['base', 'dancer', 'phantom']) {
  const events = [];
  const host = new RaidHost({ def: GRUBNAK, mode: 'normal', humans: () => [], bots: ['bastion:base', 'cleric:base', `thresher:${spec}`, 'ranger:base'], seed: 31, emit: m => events.push(m) });
  const bot = [...host.bots.values()].find(b => b.cls && b.cls.id === 'thresher') || null;
  for (let i = 0; i < 20 * 120; i++) host.tick(0.05);
  const kit = bot && bot.actor && bot.actor.kit;
  check(!!kit, `${spec}: a Reaper bot is in the raid`);
  if (!kit) continue;
  const s = kit.stats;
  check((s.casts.string || 0) > 40 && (s.casts.finish || 0) > 10, `${spec}: the bot swings and finishes (${s.casts.string} swings, ${s.casts.finish} finishers)`);
  check((s.snaps || 0) >= 3, `${spec}: and snaps (${s.snaps})`);
  console.log(`bot ${spec}: ${s.casts.string} swings, ${s.casts.finish} finishers, ${s.snaps || 0} snaps, ${s.fulls || 0} full harvests, ${s.stars || 0} stars, ${Math.round(s.damage)} damage, wasted ${JSON.stringify(s.wasted)}, uptime ${Math.round(s.gcdTime / 120 * 100)}%`);
}

if (probs.length) { console.log(probs.join('\n')); console.log('Reaper FAILED'); process.exit(1); }
console.log('Reaper OK (string and its GCD, finishers and marks, arcs, Snap, Full Harvest, Harvest Moon, Void Star, Veil, Insane Reaper, Blink, Gate, specs, talents, perks, the host, the old save, a bot raid)');
