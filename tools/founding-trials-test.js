// The Founding: Founder's Trials, the founders' voice and book, the record and the feats (story.js, sim-trials.js, client-trials.js,
// town-mark.js), headless. Each Trial changes what it says and nothing else; none of them gives power; the record and the marks the
// feats read agree; every page number the sim hands out has text; every quest and moment has a founder's line; the client files parse.
// Ends with "Trials OK".   Usage: node tools/founding-trials-test.js

const path = require('path'), fs = require('fs'), vm = require('vm');
const R = p => path.join(__dirname, '../client/js/founding/' + p);
const { FoundingMap: M } = require(R('map-data.js'));
const { FOUNDING_DATA: D } = require(R('data.js'));
const { FOUNDING_STORY: ST } = require(R('story.js'));
const { FoundingSim } = require(R('sim.js'));
for (const m of ['sim-items', 'sim-defence', 'sim-wild', 'sim-chain', 'sim-quests', 'sim-trials']) require(R(m + '.js'));
const { FoundingArt } = require(R('map-art.js'));
FoundingArt.layoutOnly();
const { FEATS } = require('../client/js/feats-data.js');

let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; }
const DT = 0.05;

function makeSim(trials, seed, extra) {
  FoundingSim.trials = trials || [];
  const log = { fds: [], ev: [] };
  const emit = m => { if (m.t === 'fds') log.fds.push(m); else if (m.t === 'fdx') for (const e of m.ev) log.ev.push(e); };
  const sim = new FoundingSim(Object.assign({ players: [{ id: 'p0', name: 'P0' }], emit, emitTo() {}, seed: seed || 7 }, extra || {}));
  sim.log = log;
  sim.intent('p0', { k: 'pick', hero: 'bastion' });
  sim.intent('p0', { k: 'ready' });
  FoundingSim.trials = [];
  return sim;
}
const run = (sim, secs, fn) => { for (let i = 0; i < secs / DT; i++) { if (fn) fn(i); sim.tick(DT); } };
const lastProps = sim => { const f = sim.log.fds.filter(m => m.props).pop(); return f ? f.props : null; };

// ---------------------------------------------------------------- 1. the founders' lines and the book
{
  for (const id of D.QUEST_ORDER) for (const st of [0, 2, 3]) { const l = ST.line('q', id, st); check(l && l.t && l.name && l.col, `quest ${id} state ${st} has a founder's line`); }
  check(ST.line('q', 'a-quest-nobody-wrote', 2) && ST.line('q', 'a-quest-nobody-wrote', 0), 'a quest without lines still gets its giver\'s own');
  check(ST.line('q', 'spring', 1) === null, 'an active-state quest event speaks nothing');
  D.PARTS.forEach((p, i) => check(ST.line('part', i), `part ${i} (${p[2]}) has a line`));
  for (const id of Object.values(D.BOSS_WAVES).map(b => b[0])) check(ST.line('boss', id), `main boss ${id} has a line`);
  for (const i of [0, 1, 2]) check(ST.line('end', i), `end beat ${i} has a line`);
  check(ST.line('start'), 'the start has a line');
  for (const l of [ST.line('start'), ...[0, 1, 2].map(i => ST.line('end', i))]) check(l.t.length <= 130, 'lines stay short: ' + l.t);
  for (const id of D.QUEST_ORDER) for (const st of [0, 2, 3]) { const t = ST.line('q', id, st).t; check(t.length <= 130, `quest line stays short: ${t}`); check(!/\d/.test(t), 'founders never speak digits: ' + t); }
  check(Object.keys(ST.FOUNDERS).length === 4, 'four founders');

  // every page number the sim can hand out has a real text
  const given = new Set();
  for (const f of fs.readdirSync(path.join(__dirname, '../client/js/founding')).filter(f => /^(sim|client)[-.a-z]*\.js$/.test(f))) {
    const src = fs.readFileSync(R(f), 'utf8');
    for (const m of src.matchAll(/\bpage\([^,()]+,\s*(\d+)\)/g)) given.add(+m[1]);
    for (const m of src.matchAll(/\['pg',\s*[^,\]]+,\s*(\d+)\]/g)) given.add(+m[1]);
    for (const m of src.matchAll(/s\.n === (\d+)(?:\s*\|\|\s*s\.n === (\d+))?\)\s*\{\s*s\.st = 1;\s*this\.page/g)) { given.add(+m[1]); if (m[2]) given.add(+m[2]); }
  }
  check(given.size >= 3, 'found the page numbers the sim hands out (' + [...given].join(',') + ')');
  for (const n of given) { const p = ST.PAGES.find(x => x.n === n); check(p && p.text && p.text.length > 40 && p.title && ST.FOUNDERS[p.by], `page ${n} has a title, a founder and text`); }
  ST.PAGES.forEach((p, i) => check(p.n === i + 1, `pages are numbered in order (${p.n})`));
  check(ST.pageOf(99).text && ST.pageOf(99).n === 99, 'a page nobody wrote still reads');
  const w = ST.pageOf(9); check(Array.isArray(w.words) && w.words.length === 3, 'page 9 carries the Words');
}

// ---------------------------------------------------------------- 2. the record and the marks the feats read
{
  const f = ST.fixProgress(null);
  check(f.wins === 0 && Array.isArray(f.pages) && Array.isArray(f.on), 'a fresh record');
  check(ST.fixProgress({ wins: 'x', pages: [1, 'a', -2, 3], on: ['quick', 'zzz', 'quick'] }).on.join() === 'quick', 'a broken record is mended: unknown Trials dropped');
  check(ST.addPages(f, [6, 1, 6, 'x']) === 2 && f.pages.join() === '1,6', 'pages are added once, in order');
  const Q = D.QUEST_ORDER.slice(), all = {}; for (const id of Q) all[id] = 2;
  const lost = ST.record(ST.fixProgress(null), { won: false, wave: 12, quests: all, stats: { a: {} } }, ['quick'], Q, 1);
  check(!lost.first && !lost.cleared.length && !lost.marks.includes('founding:won'), 'a lost run clears nothing, even with a Trial on');
  const won = ST.record(f, { won: true, wave: 30, quests: all, stats: { a: {} } }, ['quick', 'dry', 'dark'], Q, 1);
  check(won.first && won.cleared.join() === 'quick,dry,dark', 'a won run clears the Trials that were on');
  for (const k of ['founding:won', 'founding:allquests', 'founding:solo', 'founding:trial:quick', 'founding:trials3']) check(won.marks.includes(k), 'mark ' + k);
  const again = ST.record(f, { won: true, wave: 30, quests: Object.assign({}, all, { roof: 3 }), stats: { a: {}, b: {} } }, [], Q, 2);
  check(!again.first && !again.marks.includes('founding:allquests') && !again.marks.includes('founding:solo'), 'a second win is not a first; a missed quest and a pair are not an every-quest solo');
  check(f.wins === 2 && f.runs === 2 && f.trials.quick === 1 && f.best === 30, 'the record counts');
  // every mark a feat reads can be produced, and every Trial has a feat with a title
  const produced = new Set(['founding:won', 'founding:allquests', 'founding:solo', 'founding:trials3', 'founding:trialsAll', 'founding:pages4', ...ST.TRIALS.map(t => 'founding:trial:' + t.id)]);
  const fm = FEATS.filter(x => x.check.type === 'mark' && x.check.k.startsWith('founding:'));
  for (const x of fm) check(produced.has(x.check.k), `${x.id} reads a mark the record can produce (${x.check.k})`);
  for (const t of ST.TRIALS) { const x = FEATS.find(y => y.id === t.feat); check(x && x.check.k === 'founding:trial:' + t.id && x.title === t.title, `Trial ${t.id} has its feat and title`); }
  for (const k of produced) check(fm.some(x => x.check.k === k), `mark ${k} is read by a feat`);
  const all5 = ST.fixProgress(null); for (const t of ST.TRIALS) all5.trials[t.id] = 1;
  check(ST.record(all5, { won: false, wave: 1, quests: {}, stats: {} }, [], Q, 1).marks.includes('founding:trialsAll'), 'every Trial cleared marks the set');
}

// ---------------------------------------------------------------- 3. the Trials in the sim
{
  check(ST.validTrials(['bold', 'nope', 'quick', 'quick']).join() === 'quick,bold', 'known ids only, in list order, once');
  const base = makeSim([], 7, { noSpawn: true });
  check(!base.trials && !(lastProps(base) || {}).tr, 'no Trials: the module stays out');
  const junk = makeSim(['nope'], 7, { noSpawn: true });
  check(!junk.trials, 'unknown Trials: the module stays out');

  // props.tr reaches every tab
  for (const t of ST.TRIALS) { const s = makeSim([t.id], 7, { noSpawn: true }); run(s, 1); check(lastProps(s) && lastProps(s).tr && lastProps(s).tr.join() === t.id, `${t.id}: props.tr carries it`); }

  // quick: the waves come sooner and the night keeps its place among them
  {
    const a = makeSim([], 7, { noSpawn: true }), b = makeSim(['quick'], 7, { noSpawn: true });
    const waveAt = (s, n) => { let t = null; run(s, 20 + 100 * (n - 1) + 6, () => { if (t === null && s.wave >= n) t = s.time; }); return t; };
    const ta = waveAt(a, 3), tb = waveAt(b, 3);
    check(Math.abs(ta - 220) < 0.2 && Math.abs(tb - 180) < 0.2, `wave 3 at ${ta} s normally and ${tb} s with Short Days`);
    const c = makeSim(['quick'], 7, { noSpawn: true }), d = makeSim([], 7, { noSpawn: true });
    const sixC = D.WAVE_T0 + 5 * ST.TUNE.quickGap, sixD = D.WAVE_T0 + 5 * D.WAVE_GAP;
    let nc = 0, nd = 0; run(c, sixC + 10, () => {}); nc = c.night; run(d, sixD + 10, () => {}); nd = d.night;
    check(Math.abs(nc - nd) < 0.08 && nc > 0.3, `dusk meets wave 6 either way (${nc.toFixed(2)} vs ${nd.toFixed(2)})`);
  }
  // dry: the spring heals no one (and the art shows a trickle); without it the same hero heals
  {
    const heal = trials => {
      const s = makeSim(trials, 7, { noSpawn: true });
      const h = s.heroes[0]; h.x = M.P.spring[0] + 20; h.y = M.P.spring[1] + 10; h.hp = h.max * 0.4; s.spring = 2;
      const hp0 = h.hp; run(s, 5); return { gain: h.hp - hp0, props: lastProps(s) || {} };
    };
    const a = heal([]), b = heal(['dry']);
    check(a.gain > 50, `the spring heals ${a.gain.toFixed(0)} in five seconds`);
    check(Math.abs(b.gain) < 1, `with the Dry Spring the same hero gains ${b.gain.toFixed(1)}`);
    check(b.props.spring === 'trickle' && b.props.fountainR > 26 && b.props.fountainR <= 40, 'the art shows a dry spring');
  }
  // dark: dawn lingers, the beacon cannot help, lamps reach less
  {
    const a = makeSim([], 7, { noSpawn: true }), b = makeSim(['dark'], 7, { noSpawn: true });
    a.beaconLit = b.beaconLit = true;
    const t11 = D.waveStartAt(11);
    run(a, t11 + 20); run(b, t11 + 20);
    check(b.night > a.night + 0.15, `at dawn the Moonless night is darker (${b.night.toFixed(2)} vs ${a.night.toFixed(2)})`);
    check(b.peak >= D.TUNE.nightPeak - 1e-9 && a.peak < D.TUNE.nightPeak, 'the beacon does not thin the night');
    check(b.lampR(b.heroes[0]) < a.lampR(a.heroes[0]) * 0.8, `lamps reach less (${b.lampR(b.heroes[0]).toFixed(0)} vs ${a.lampR(a.heroes[0]).toFixed(0)})`);
  }
  // lean: less gold from a fallen enemy; bold: the lane enemy is born a step ahead
  {
    const kill = trials => {
      const s = makeSim(trials, 7, { noSpawn: true }); run(s, 1);
      const h = s.heroes[0], g0 = h.gold; let e = null; for (let i = 0; i < 40; i++) { e = s.spawnEnemy('ashling', 0); s.dmgE(e, 99999, h); } return { gold: h.gold - g0, e: s.spawnEnemy('ashling', 0), s };
    };
    const a = kill([]), b = kill(['lean']);
    check(a.gold > 0 && b.gold < a.gold * 0.75 && b.gold > a.gold * 0.5, `a lean purse earns ${b.gold} against ${a.gold}`);
    const c = kill(['bold']); c.s.tick(DT);
    check(c.e.tier === a.e.tier + ST.TUNE.boldStep && c.e.arm > a.e.arm && c.e.speed > a.e.speed * 1.05, 'a bold lane enemy is a step ahead: look, plate and pace');
    const boss = c.s.spawnEnemy('tunnelmaw', 0); c.s.tick(DT);
    check(boss.tier === 0 && boss.arm === 0, 'bosses are left as they are');
  }
  // never power: no Trial raises any stat sheet value that helps the hero, or any reward
  {
    const a = makeSim([], 7, { noSpawn: true }), pa = a.heroes[0].S;
    for (const t of ST.TRIALS) {
      const s = makeSim([t.id], 7, { noSpawn: true }), ps = s.heroes[0].S;
      for (const k of Object.keys(pa)) check(ps[k] <= pa[k] + 1e-9, `${t.id} never raises ${k} (${ps[k]} vs ${pa[k]})`);
      check(s.heroes[0].max === a.heroes[0].max && s.camp.max === a.camp.max, `${t.id} leaves health alone`);
    }
  }
  // the same seed and Trials replay exactly
  {
    const play = () => { const s = makeSim(['quick', 'dark', 'bold', 'lean'], 11); run(s, 140); return JSON.stringify(s.log.fds.slice(-1)[0]) + s.enemies.length + s.heroes[0].gold; };
    check(play() === play(), 'same seed and Trials: same run');
  }
}

// ---------------------------------------------------------------- 4. the client files parse, and the town mark has what main.js calls
{
  for (const f of ['client-trials.js', 'town-mark.js', 'story.js', 'sim-trials.js']) {
    let ok = true; try { new vm.Script(fs.readFileSync(R(f), 'utf8'), { filename: f }); } catch (e) { ok = false; console.log('  ' + f + ': ' + e.message); }
    check(ok, `${f} parses`);
  }
  const mark = fs.readFileSync(R('town-mark.js'), 'utf8');
  const api = mark.slice(mark.lastIndexOf('return {'));
  for (const fn of ['init', 'update', 'drawGround', 'entities', 'interactables', 'isOpen']) check(api.includes(fn), `TownMark exposes ${fn}`);
  const main = fs.readFileSync(path.join(__dirname, '../client/js/main.js'), 'utf8');
  for (const call of ['TownMark.init', 'TownMark.update', 'TownMark.drawGround', 'TownMark.entities', 'TownMark.interactables', 'foundingRecord', 'FoundingBook.openBook']) check(main.includes(call), `main.js uses ${call}`);
  const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf8');
  const at = n => html.indexOf('js/founding/' + n);
  check(at('story.js') > at('data.js') && at('story.js') < at('sim-trials.js') && at('client-trials.js') > at('client.js') && at('town-mark.js') > at('client-trials.js') && at('town-mark.js') < html.indexOf('js/main.js'), 'index.html loads the files in order');
  // the rule: nothing in a Trial's text promises power
  for (const t of ST.TRIALS) check(!/\b(stronger|bonus|extra damage|more gold|faster heal)\b/i.test(t.text), `${t.id}'s text promises no power`);
}

console.log(failures ? `\n${failures} failed, ${passed} passed` : `Trials OK (${passed} checks)`);
process.exit(failures ? 1 : 0);
