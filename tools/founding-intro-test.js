// The Founding: the opening scene (sim-intro.js, client-intro.js), headless. The scene starts with the run and holds the world still
// (no clock, no wave, no enemy); a lone player's Esc skips at once, a party needs most of its players, the host skips for everyone;
// when it ends the usual twenty seconds to wave 1 begin; the script (camera, walk, words) is sane; the client file parses.
// Ends with "Intro OK".   Usage: node tools/founding-intro-test.js

const path = require('path'), fs = require('fs'), vm = require('vm');
const R = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(R('map-data.js'));
const { FOUNDING_DATA: D } = require(R('data.js'));
const { FOUNDING_STORY: ST } = require(R('story.js'));
const { FoundingSim } = require(R('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests', 'sim-trials', 'sim-intro', 'sim-world']) require(R(m + '.js'));
const { FoundingArt } = require(R('map-art.js'));
FoundingArt.layoutOnly();

let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; }
const DT = 0.05, HEROES = ['bastion', 'cleric', 'pyromancer', 'ranger'];

// n players p0..p(n-1) (p0 hosts), everyone ready -> the run starts. intro: true / false / undefined (the default in Node)
function makeSim(n, intro, seed) {
  FoundingSim.intro = intro;
  const log = { fds: [], ev: [] };
  const emit = m => { if (m.t === 'fds') log.fds.push(m); else if (m.t === 'fdx') for (const e of m.ev) log.ev.push(e); };
  const players = []; for (let i = 0; i < n; i++) players.push({ id: 'p' + i, name: 'P' + i });
  const sim = new FoundingSim({ players, emit, emitTo() {}, seed: seed || 5 });
  sim.log = log;
  players.forEach((p, i) => { sim.intent(p.id, { k: 'pick', hero: HEROES[i] }); });
  players.forEach(p => sim.intent(p.id, { k: 'ready' }));
  FoundingSim.intro = undefined;
  return sim;
}
const run = (sim, secs) => { for (let i = 0; i < Math.round(secs / DT); i++) sim.tick(DT); };
const lastIn = sim => { const f = sim.log.fds.filter(m => m.st === 'live').pop(); return f ? f.in : undefined; };
const ends = sim => sim.log.ev.filter(e => e[0] === 'in' && e[1] === 'end');
const waves = sim => sim.log.ev.filter(e => e[0] === 'w');
const TOTAL = FoundingSim.INTRO_TOTAL;

check(TOTAL >= 45 && TOTAL <= 62, `the scene is about a minute (${TOTAL} s)`);

// ---------------------------------------------------------------- 1. off in Node by default; on when asked
{
  const sim = makeSim(1, undefined);
  check(sim.st === 'live', 'the run starts');
  check(lastIn(sim) === undefined, 'headless runs have no scene unless asked');
  run(sim, 21);
  check(sim.wave === 1, 'with no scene, wave 1 comes at twenty seconds');
}

// ---------------------------------------------------------------- 2. the scene starts with the run and holds the world
{
  const sim = makeSim(1, true), h = sim.heroes[0], x0 = h.x, y0 = h.y;
  check(sim.st === 'live' && sim.log.ev.some(e => e[0] === 'start'), 'the run starts');
  const a = lastIn(sim);
  check(Array.isArray(a) && a[0] === 0 && a[1] === TOTAL && Array.isArray(a[2]) && a[2].length === 0 && a[3] === 1, 'the first snapshot carries the scene: ' + JSON.stringify(a));
  sim.intent('p0', { k: 'move', x: x0 + 400, y: y0 }); sim.intent('p0', { k: 'cast', s: 'q', x: x0, y: y0 - 100 }); sim.intent('p0', { k: 'recall' }); sim.intent('p0', { k: 'buy', item: 'x' });
  run(sim, 30);
  check(sim.time === 0 && sim.wave === 0 && sim.enemies.length === 0, 'no time, no wave, no enemy while the scene runs');
  check(h.x === x0 && h.y === y0 && !h.path, 'the hero is locked: a move order does nothing');
  check(sim.nextWaveAt === D.WAVE_T0, 'the wave clock is held at its start');
  const b = lastIn(sim);
  check(b && Math.abs(b[0] - 30) < 0.5, 'the scene clock runs on in the snapshots (' + (b && b[0]) + ')');
  check(waves(sim).length === 0 && ends(sim).length === 0, 'no wave and no end yet');
  run(sim, TOTAL - 30 + 0.2);
  check(ends(sim).length === 1 && ends(sim)[0][2] === 0, 'the scene ends by itself, not skipped');
  check(lastIn(sim) === undefined, 'the snapshots stop carrying the scene');
  check(sim.time > 0 && sim.time < 1, 'the run clock starts when the scene ends');
  run(sim, 18.5); check(sim.wave === 0, 'wave 1 has not come yet at eighteen seconds after control');
  run(sim, 2.5); check(sim.wave === 1 && waves(sim).length === 1, 'wave 1 comes the usual twenty seconds after control');
  // control works again
  sim.intent('p0', { k: 'move', x: h.x + 200, y: h.y }); check(!!h.path, 'after the scene the hero obeys again');
}

// ---------------------------------------------------------------- 3. a lone player's Esc skips at once
{
  const sim = makeSim(1, true);
  run(sim, 5);
  sim.intent('p0', { k: 'skipIntro' });
  check(ends(sim).length === 1 && ends(sim)[0][2] === 1, 'a lone player skips at once');
  check(lastIn(sim) === undefined, 'the scene is gone from the snapshot');
  const t0 = sim.time; run(sim, 1); check(sim.time > t0, 'the run goes on');
  run(sim, 20); check(sim.wave === 1, 'and wave 1 comes twenty seconds after the skip');
  sim.intent('p0', { k: 'skipIntro' }); check(ends(sim).length === 1, 'a late skip does nothing');
}

// ---------------------------------------------------------------- 4. a party needs most of its players; the host ends it for everyone
{
  // three players: two of three
  const sim = makeSim(3, true);
  run(sim, 3);
  const a = lastIn(sim); check(a && a[3] === 2, 'three players: two must agree (need ' + (a && a[3]) + ')');
  sim.intent('p1', { k: 'skipIntro' }); sim.tick(DT);
  check(ends(sim).length === 0, 'one guest of three does not skip it');
  check(JSON.stringify(lastIn(sim)[2]) === '["p1"]', 'the vote shows in the snapshot: ' + JSON.stringify(lastIn(sim)[2]));
  sim.intent('p1', { k: 'skipIntro', off: 1 }); sim.tick(DT); sim.tick(DT);
  check(lastIn(sim)[2].length === 0, 'a vote can be taken back');
  sim.intent('p1', { k: 'skipIntro' }); sim.intent('p1', { k: 'skipIntro' }); sim.tick(DT); sim.tick(DT);
  check(lastIn(sim)[2].length === 1 && ends(sim).length === 0, 'voting twice is one vote');
  sim.intent('p2', { k: 'skipIntro' });
  check(ends(sim).length === 1 && ends(sim)[0][2] === 1, 'two of three skip it');
  check(sim.time === 0 || sim.time < 0.2, 'no run time was spent');
}
{
  // four players: three of four
  const sim = makeSim(4, true);
  run(sim, 2);
  check(lastIn(sim)[3] === 3, 'four players: three must agree');
  sim.intent('p1', { k: 'skipIntro' }); sim.intent('p2', { k: 'skipIntro' }); sim.tick(DT);
  check(ends(sim).length === 0, 'two of four do not skip it');
  sim.intent('p3', { k: 'skipIntro' });
  check(ends(sim).length === 1, 'three of four skip it');
}
{
  // the host alone ends it for everyone
  const sim = makeSim(3, true);
  run(sim, 4);
  sim.intent('p0', { k: 'skipIntro' });
  check(ends(sim).length === 1 && ends(sim)[0][2] === 1, 'the host ends it for everyone');
}
{
  // two players: both (a majority of two), unless the host votes
  const sim = makeSim(2, true);
  run(sim, 1);
  sim.intent('p1', { k: 'skipIntro' }); sim.tick(DT);
  check(ends(sim).length === 0, 'one of two guests does not end it');
  sim.intent('p0', { k: 'skipIntro' });
  check(ends(sim).length === 1, 'the host and a guest end it');
}
{
  // a guest who leaves takes the vote with them, and the majority is counted among those still here
  const sim = makeSim(3, true);
  run(sim, 1);
  sim.intent('p1', { k: 'skipIntro' }); sim.tick(DT);
  sim.removePlayer('p1'); sim.tick(DT); sim.tick(DT);
  check(ends(sim).length === 0 || ends(sim).length === 1, 'a leaver does not break the scene');
  const a = lastIn(sim);
  if (a) { check(a[2].indexOf('p1') < 0, 'a leaver\'s vote is dropped'); check(a[3] === 2, 'two players left: both must agree'); }
  sim.intent('p2', { k: 'skipIntro' });
  if (!ends(sim).length) { sim.intent('p0', { k: 'skipIntro' }); }
  check(ends(sim).length === 1, 'the rest can still end it');
}

// ---------------------------------------------------------------- 5. a rejoin after the scene is not shown it again; a snapshot mid-scene carries it
{
  const sim = makeSim(2, true);
  run(sim, 7);
  const full = sim.snapshot(true);
  check(Array.isArray(full.in) && Math.abs(full.in[0] - 7) < 0.3, 'a full snapshot mid-scene carries the clock, so a guest joins it where it is');
  sim.intent('p0', { k: 'skipIntro' });
  check(sim.snapshot(true).in === undefined, 'a full snapshot after the scene does not');
}

// ---------------------------------------------------------------- 6. the script (client-intro.js)
{
  global.FoundingMap = M; global.FOUNDING_STORY = ST; global.FoundingSim = FoundingSim;
  const { FoundingIntro: S } = require(R('client-intro.js'));
  check(S.TOTAL === TOTAL, 'the script is as long as the host\'s scene');
  // the words
  check(S.CAPTIONS.length >= 7, 'there are words to the scene');
  let prevEnd = 0;
  for (const c of S.CAPTIONS) {
    check(c.t1 > c.t0 && c.t0 >= prevEnd - 0.01 && c.t1 <= TOTAL, `caption ${c.t0} fits the scene and does not overlap`);
    prevEnd = c.t1;
    check(ST.FOUNDERS[c.by], `caption by a founder (${c.by})`);
    check(c.text && c.text.length <= 100, 'captions stay short: ' + c.text);
    check(!/\d/.test(c.text), 'no digits in a founder\'s mouth: ' + c.text);
    check(!/\b(under the hearth|beneath|below the fire)\b/i.test(c.text), 'nothing is said of what is under the Hearth');
    check((c.t1 - c.t0) >= 2.6 + c.text.length * 0.02, `caption has time to be read: ${c.text}`);
  }
  const last = S.CAPTIONS[S.CAPTIONS.length - 1];
  check(last.by === 'steward' && last.text === ST.line('start').t, 'the Steward says the run\'s opening line, as it has always been worded');
  check(S.CAPTIONS.some(c => c.by === 'warden') && S.CAPTIONS.some(c => c.by === 'smith') && S.CAPTIONS.some(c => c.by === 'digger'), 'every founder speaks');
  // the camera, the light, the fades
  for (let t = 0; t <= TOTAL; t += 0.25) {
    const c = S.camAt(t); check(c.every(Number.isFinite) && c[2] > 0.7 && c[2] < 1.5, `camera sane at ${t}`);
    const n = S.nightAt(t); check(n >= 0 && n <= 0.9, `dusk sane at ${t}`);
    const f = S.fadeAt(t); check(f >= 0 && f <= 1, 'fade in range');
  }
  check(S.fadeAt(0) === 1 && S.fadeAt(TOTAL - 0.5) === 0, 'the scene opens from black and ends in the light');
  check(S.CUTS.every(c => S.fadeAt(c) === 1), 'every cut happens in the dark');
  // continuity: nothing leaps between two frames except across a cut
  const home = { x: 3119, y: 3932 };
  let prev = null, worst = 0;
  for (let t = 0; t <= TOTAL; t += DT) {
    const f = S.founders(t), cur = [...S.hero(t, 1, 4, home).slice(0, 2), ...['steward', 'smith', 'digger', 'warden'].flatMap(k => f[k].slice(0, 2))];
    const wg = S.wagon(t); if (wg) cur.push(wg.x, wg.y); else cur.push(-1, -1);
    if (prev && !S.CUTS.some(c => Math.abs(t - c) < 0.35)) for (let i = 0; i < cur.length; i += 2) { if (cur[i] === -1 || prev[i] === -1) continue; worst = Math.max(worst, Math.hypot(cur[i] - prev[i], cur[i + 1] - prev[i + 1])); }
    prev = cur;
  }
  check(worst < 11, `nobody leaps between frames (worst ${worst.toFixed(1)} px in a twentieth of a second)`);
  // the ends: everyone where the map art keeps them, the wagon gone, heroes home
  const f = S.founders(TOTAL);
  for (const id of ['steward', 'smith', 'digger']) check(Math.hypot(f[id][0] - S.DEFAULT[id][0], f[id][1] - S.DEFAULT[id][1]) < 1, `${id} ends where the map art stands them`);
  const ha = S.hero(TOTAL, 0, 4, home); check(ha[0] === home.x && ha[1] === home.y, 'a hero ends at the place the host stood her');
  check(S.wagon(TOTAL) === null && S.wagon(10) && S.wagon(30), 'the wagon rolls in, rests, and is gone after the dip');
  // the road walk stays on ground a hero can stand on
  for (let t = 1; t < S.CUTS[1]; t += 0.5) for (let i = 0; i < 4; i++) { const p = S.hero(t, i, 4, home); if (t > 3) check(M.walkable(p[0], p[1], 8) || p[1] < 260 || p[1] > 3700, `hero ${i} walks on open ground at ${t} (${Math.round(p[0])},${Math.round(p[1])})`); }
  // the first ashlings are far up the North Road, away from the camp, and only after the dip
  check(S.ashlings(30).length === 0 && S.ashlings(47).length >= 3, 'the ashlings are seen only on the road-head shot');
  for (const a of S.ashlings(49)) check(Math.hypot(a.x - M.P.hearth[0], a.y - M.P.hearth[1]) > 1500, 'they are far from the Hearth');
}

// ---------------------------------------------------------------- 7. the client file parses, and its pieces are wired
{
  const src = fs.readFileSync(R('client-intro.js'), 'utf8');
  try { new vm.Script(src, { filename: 'client-intro.js' }); check(true, ''); } catch (e) { check(false, 'client-intro.js parses: ' + e.message); }
  check(/skipIntro/.test(src) && /Escape/.test(src), 'Esc votes to skip');
  check(/Founding\.addLayer/.test(src), 'it is a layer');
  const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf8');
  check(/founding\/sim-intro\.js/.test(html) && /founding\/client-intro\.js/.test(html), 'index.html loads both files');
  check(html.indexOf('sim-intro.js') > html.indexOf('sim-trials.js') && html.indexOf('client-intro.js') > html.indexOf('client-trials.js'), 'after the trials files');
  check(!/Math\.random/.test(fs.readFileSync(R('sim-intro.js'), 'utf8')), 'the host side uses no Math.random');
  for (const f of ['sim-intro.js', 'client-intro.js', '../../../tools/founding-intro-test.js']) check(!fs.readFileSync(R(f), 'utf8').includes('\r'), f + ' is LF');
}

console.log(failures ? `\n${failures} failed, ${passed} passed` : `Intro OK (${passed} checks)`);
process.exit(failures ? 1 : 0);
