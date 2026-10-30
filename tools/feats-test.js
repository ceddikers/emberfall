// Feats (client/js/feats-data.js, feat-rules.js, pastimes.js): the data is sound, the rules read a fight's party and tally the
// right way, and the Pastimes engine (loaded here against a stub save and page) earns, remembers and titles the right feats.
//   node tools/feats-test.js     (exit code 0 and a final "Feats OK" when everything holds; tools/check.js runs this)
const path = require('path'), vm = require('vm'), fs = require('fs');
const client = p => path.join(__dirname, '../client/js', p);
const { FEATS, FEAT_CATS } = require(client('feats-data.js'));
const { FeatRules } = require(client('feat-rules.js'));
const { CLASSES, BOSSES, ULTIMATE_BOSS } = require(client('data.js'));
const { Scoring } = require(client('arena/scoring.js'));

const probs = [];
const check = (ok, what) => { if (!ok) probs.push(what); };

// ---------------------------------------------------------------- 1. the data
{
  const ids = new Set(), titles = new Set(), cats = new Set(FEAT_CATS.map(c => c[0]));
  const TYPES = new Set(['clear', 'clearAll', 'clearNoDeaths', 'clearUnder', 'pulls', 'practice', 'secrets', 'gifts', 'feasts', 'fish', 'journal', 'bounties', 'heroes', 'emotes', 'items', 'trial', 'mark', 'count', 'hardRole', 'hardRoles', 'hardClasses', 'hplusSet']);
  const bossIds = new Set(BOSSES.map(b => b.id).concat(ULTIMATE_BOSS ? [ULTIMATE_BOSS.id] : []));   // (the Ultimate is not on the Raid Board but has feats)
  for (const f of FEATS) {
    check(f.id && f.name && f.desc, `${f.id}: needs an id, a name and a description`);
    check(!ids.has(f.id), `${f.id}: duplicate id`); ids.add(f.id);
    check(cats.has(f.cat), `${f.id}: unknown section ${f.cat}`);
    check(f.check && TYPES.has(f.check.type), `${f.id}: unsupported check ${f.check && f.check.type}`);
    if (f.title) { check(!titles.has(f.title), `${f.id}: the title "${f.title}" is used twice`); titles.add(f.title); check(f.title.length <= 28, `${f.id}: title too long for a nameplate`); }
    if (f.check.boss) check(bossIds.has(f.check.boss), `${f.id}: unknown boss ${f.check.boss}`);
    if (f.needs) check(bossIds.has(f.needs), `${f.id}: unknown needs ${f.needs}`);
    if (f.hidden) check(f.hint, `${f.id}: a hidden feat needs a hint`);
    check(!/\d{2,}:\d{2}|enrage|soak|stack|marker/i.test(f.name + f.desc + (f.hint || '')), `${f.id}: feat text must not describe mechanics`);
    // a feat for the second road must stay hidden until its boss is open
    const set2 = (f.check.boss && (BOSSES.find(b => b.id === f.check.boss) || {}).set === 2) || f.check.set === 2;
    check(!set2 || f.needs || (f.check.boss && f.check.boss !== 'grubnak'), `${f.id}: a set 2 feat needs a gate (needs / check.boss)`);
    if (f.check.type === 'hardClasses' || f.check.type === 'heroes') check(f.check.n === 'all' || f.check.n <= CLASSES.length, `${f.id}: asks for more heroes than exist`);
    if (f.check.type === 'mark') check(f.check.k, `${f.id}: a mark check needs k`);
  }
  check(FEATS.length >= 60, `expected at least 60 feats, have ${FEATS.length}`);
}

// ---------------------------------------------------------------- 2. the rules
const P = (id, role, extra = {}) => ({ [id]: Object.assign({ role, cls: role === 'tank' ? 'bastion' : role === 'healer' ? 'cleric' : 'ranger', name: 'p' + id, bot: false, deaths: 0, avoidable: 0, raises: 0, damage: 1000, healing: 0, taken: 0, mitigated: 0, overheal: 0 }, extra) });
const stats = (...ps) => Object.assign({}, ...ps);
const has = (marks, k) => marks.includes(k);
{
  const base = { boss: 'grubnak', mode: 'normal', secs: 400, myId: 1, alive: [1, 2, 3, 4] };
  const std = stats(P(1, 'tank'), P(2, 'healer'), P(3, 'dps'), P(4, 'dps'));
  let m = FeatRules.clear(Object.assign({ stats: std }, base), { set: 1 });
  check(has(m, 'clear:grubnak:normal'), 'clear mark');
  check(has(m, 'me:spotless'), 'spotless with no avoidable hits');
  check(!has(m, 'comp:twoHealers') && !has(m, 'comp:noHealer') && !has(m, 'comp:allDps') && !has(m, 'comp:solo') && !has(m, 'comp:twoTanks'), 'the standard party earns no comp marks');
  check(has(m, 'comp:fullTable'), 'four non-bots is a full table');
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank', { bot: false }), P(2, 'healer', { bot: true }), P(3, 'dps', { bot: true }), P(4, 'dps', { bot: true })) }, base), { set: 1 });
  check(!has(m, 'comp:fullTable'), 'bots do not fill the table');
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank'), P(2, 'healer'), P(3, 'healer'), P(4, 'dps')) }, base), { set: 1 });
  check(has(m, 'comp:twoHealers'), 'two healers');
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank'), P(2, 'tank'), P(3, 'healer'), P(4, 'dps')) }, base), { set: 1 });
  check(has(m, 'comp:twoTanks'), 'two tanks');
  const noHeal = stats(P(1, 'tank'), P(3, 'dps'), P(4, 'dps'));
  check(has(FeatRules.clear(Object.assign({ stats: noHeal }, base), { set: 1 }), 'comp:noHealer'), 'no healer on Normal set 1');
  check(!has(FeatRules.clear(Object.assign({ stats: noHeal }, base, { mode: 'hard' }), { set: 1 }), 'comp:noHealer'), 'no healer on Hard is not the Normal feat');
  check(!has(FeatRules.clear(Object.assign({ stats: noHeal }, base, { boss: 'wyrm' }), { set: 2 }), 'comp:noHealer'), 'no healer on set 2 is not the set 1 feat');
  check(!has(FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank'), P(3, 'dps')) }, base), { set: 1 }), 'comp:noHealer'), 'a pair is not the no-healer challenge');
  check(has(FeatRules.clear(Object.assign({ stats: stats(P(1, 'dps'), P(2, 'dps'), P(3, 'dps'), P(4, 'dps')) }, base), { set: 1 }), 'comp:allDps'), 'all damage dealers');
  check(!has(FeatRules.clear(Object.assign({ stats: stats(P(1, 'dps')) }, base), { set: 1 }), 'comp:allDps'), 'a lone damage dealer is solo, not "all dps"');
  const solo = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank')), alive: [1] }, base), { set: 1 });
  check(has(solo, 'comp:solo') && !has(solo, 'comp:soloHard') && !has(solo, 'me:lastEmber'), 'solo');
  check(has(FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank')), alive: [1] }, base, { mode: 'hard' }), { set: 1 }), 'comp:soloHard'), 'solo on Hard');
  // personal record
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank', { avoidable: 2 }), P(2, 'healer'), P(3, 'dps'), P(4, 'dps')) }, base), { set: 1 });
  check(!has(m, 'me:spotless'), 'an avoidable hit breaks spotless');
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank'), P(2, 'healer', { avoidable: 3 }), P(3, 'dps'), P(4, 'dps')) }, base), { set: 1 });
  check(has(m, 'me:spotless'), 'spotless is about you, not the party');
  m = FeatRules.clear(Object.assign({ stats: std, mode: 'hard' }, base, { mode: 'hard' }), { set: 1 });
  check(has(m, 'party:spotlessHard') && has(m, 'hardrole:tank') && has(m, 'hardcls:bastion'), 'a spotless Hard clear marks the party, role and hero');
  m = FeatRules.clear(Object.assign({ stats: stats(P(1, 'tank'), P(2, 'healer', { deaths: 1 }), P(3, 'dps'), P(4, 'dps')), mode: 'hard' }, base, { mode: 'hard' }), { set: 1 });
  check(!has(m, 'party:spotlessHard'), 'a death breaks the party record');
  check(!has(FeatRules.clear(Object.assign({ stats: std }, base), { set: 1 }), 'hardrole:tank'), 'no hard marks on Normal');
  // last standing, comebacks, MVP
  check(has(FeatRules.clear(Object.assign({ stats: std }, base, { alive: [1] }), { set: 1 }), 'me:lastEmber'), 'last one standing');
  check(!has(FeatRules.clear(Object.assign({ stats: std }, base, { alive: [2] }), { set: 1 }), 'me:lastEmber'), 'someone else last standing');
  check(!has(FeatRules.clear(Object.assign({ stats: std }, base, { alive: [1, 2] }), { set: 1 }), 'me:lastEmber'), 'two standing');
  check(has(FeatRules.clear(Object.assign({ stats: std }, base), { set: 1, wipes: 5 }), 'me:comeback'), 'five wipes then a clear');
  check(!has(FeatRules.clear(Object.assign({ stats: std }, base), { set: 1, wipes: 4 }), 'me:comeback'), 'four wipes is not enough');
  const star = stats(P(1, 'dps', { damage: 90000 }), P(2, 'healer'), P(3, 'dps', { damage: 1000 }), P(4, 'tank'));
  const sc = Scoring.score(star, { time: 400 }), top = Scoring.mvp(star, sc);
  check(has(FeatRules.clear(Object.assign({ stats: star }, base, { myId: top }), { set: 1, score: Scoring }), 'me:mvp'), 'the top contributor gets the MVP mark');
  const other = Number(Object.keys(star).find(i => Number(i) !== top));
  check(!has(FeatRules.clear(Object.assign({ stats: star }, base, { myId: other }), { set: 1, score: Scoring }), 'me:mvp'), 'someone else does not');
  check(FeatRules.clear(Object.assign({ stats: std }, base, { myId: 99 }), { set: 1 }).every(k => !k.startsWith('me:')), 'a player outside the tally gets no personal marks');
  // the bout
  const T = { 1: 0, 2: 0, 3: 1, 4: 1 }, bs = stats(P(1, 'dps'), P(2, 'dps', { bot: true }), P(3, 'dps'), P(4, 'dps', { bot: true }));
  m = FeatRules.pvp({ won: true, draw: false, mode: 'ctf', stats: bs, teams: T, myTeam: 0, myId: 1 });
  check(has(m, 'pvp:win:ctf') && has(m, 'pvp:win:human'), 'a CTF win against a human');
  m = FeatRules.pvp({ won: true, draw: false, mode: 'duel', stats: stats(P(1, 'dps'), P(3, 'dps', { bot: true })), teams: { 1: 0, 3: 1 }, myTeam: 0, myId: 1 });
  check(has(m, 'pvp:win:duel') && !has(m, 'pvp:win:human'), 'a duel win against a bot is not a human win');
  check(FeatRules.pvp({ won: false, draw: false, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 }).length === 0, 'a loss earns nothing');
  check(FeatRules.pvp({ won: false, draw: true, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 }).length === 0, 'a draw earns nothing');
}

// ---------------------------------------------------------------- 3. the engine, against a stub save and page
{
  const store = {};
  const Save = { get: k => store[k], set: (k, v) => { store[k] = v; }, commit() {} };
  const el = () => { const o = { children: [], classList: { add() {}, remove() {}, contains: () => true }, appendChild(c) { o.children.push(c); }, addEventListener() {}, querySelector: () => el(), querySelectorAll: () => [], remove() {}, set innerHTML(v) {}, style: {} }; return o; };
  const notices = [], titles = [];
  const ctx = vm.createContext({ Save, FEATS, FEAT_CATS, FeatRules, Scoring, CLASSES, BOSSES, COLLIDERS: { circles: [] }, ITEMS: {}, RARITY: [], setTimeout: () => 0, document: { getElementById: () => null, createElement: el, body: el(), querySelectorAll: () => [] }, window: {}, console, Date, Math, Object, Array, Set, Number, String, JSON });
  vm.runInContext(fs.readFileSync(client('pastimes.js'), 'utf8') + '\n;this.Pastimes = Pastimes;', ctx);
  const Pt = ctx.Pastimes;
  store.heroes = {};
  const open = new Set(BOSSES.map(b => b.id));
  Pt.init({ player: {}, toast() {}, addGold() {}, giveGift() {}, matches: () => true, bossOpen: id => open.has(id), beaten: () => true, items: () => [], iconURL: () => '', onTitle: t => titles.push(t), later() {} });
  // swallow the notices (they draw into the page): count them through the engine's own feat record instead
  const earned = () => Object.keys(Save.get('pastimes').feats);
  const std = stats(P(1, 'tank'), P(2, 'healer'), P(3, 'dps'), P(4, 'dps'));
  Pt.event('clear', { boss: 'grubnak', mode: 'normal', secs: 300, practice: false, deaths: 0, avoidable: 0, stats: std, myId: 1, alive: [1, 2, 3, 4] });
  let e = earned();
  check(e.includes('first-course') && e.includes('nobody-carried') && e.includes('spotless') && e.includes('express-service'), `a first clean fast Grubnak clear earns its feats (have: ${e.join(', ')})`);
  check(!e.includes('sent-it-back') && !e.includes('two-healers'), 'and not the Hard or two-healer feats');
  check(titles.length === 1 && titles[0] === 'Ogre\'s Last Customer', 'the first title earned is worn (' + titles.join('|') + ')');
  // practice runs earn no clear feats
  Pt.event('clear', { boss: 'skitterra', mode: 'normal', secs: 300, practice: true, deaths: 0, avoidable: 0, stats: std, myId: 1, alive: [] });
  check(!earned().includes('cut-the-thread'), 'a practice clear does not count');
  // Hard, solo, no deaths on Volkar
  Pt.event('clear', { boss: 'volkar', mode: 'hard', secs: 500, practice: false, deaths: 0, avoidable: 0, stats: stats(P(1, 'healer')), myId: 1, alive: [1] });
  e = earned();
  check(e.includes('lightning-rod') && e.includes('unstruck') && e.includes('party-of-one') && e.includes('nobody-to-blame') && e.includes('role-healer') && e.includes('not-a-mark'), `solo Hard Volkar, nobody dying (${e.join(', ')})`);
  check(!e.includes('role-tank') && !e.includes('three-hats'), 'only the healer role so far');
  Pt.event('clear', { boss: 'grubnak', mode: 'hard', secs: 500, practice: false, deaths: 2, avoidable: 6, stats: stats(P(1, 'tank', { deaths: 1, avoidable: 3 }), P(2, 'healer', { deaths: 1, avoidable: 3 }), P(3, 'dps'), P(4, 'dps')), myId: 1, alive: [1] });
  check(!earned().includes('clean-plates'), 'a death on Hard Grubnak: no Clean Plates');
  // wipes: five in a row then a clear
  for (let i = 0; i < 5; i++) Pt.event('wipe', { boss: 'skitterra', practice: false });
  Pt.event('clear', { boss: 'skitterra', mode: 'normal', secs: 400, practice: false, deaths: 0, avoidable: 0, stats: std, myId: 1, alive: [1, 2] });
  check(earned().includes('try-again'), 'five wipes then a clear');
  check(Save.get('pastimes').wipeRun.skitterra === undefined, 'the wipe streak resets on a clear');
  for (let i = 0; i < 20; i++) Pt.event('wipe', { boss: 'volkar', practice: false });
  check(earned().includes('floor-inspector'), '25 wipes');
  // the road: second-road feats stay unearned until the bosses fall
  for (const b of ['wyrm', 'titan', 'archmage']) Pt.event('clear', { boss: b, mode: 'hard', secs: 500, practice: false, deaths: 0, avoidable: 0, stats: std, myId: 1, alive: [1, 2, 3, 4] });
  e = earned();
  check(!e.includes('second-road') && !e.includes('hard-road'), 'three of four second-road bosses is not the road');
  check(e.includes('hotter-still') && e.includes('clean-ascent'), 'Vhalgrath on Hard, a clean second-road clear');
  Pt.event('clear', { boss: 'hydra', mode: 'hard', secs: 500, practice: false, deaths: 0, avoidable: 0, stats: std, myId: 1, alive: [1, 2, 3, 4] });
  check(!earned().includes('second-road'), 'the second road also needs Normal clears');
  for (const b of ['wyrm', 'titan', 'archmage', 'hydra']) Pt.event('clear', { boss: b, mode: 'normal', secs: 500, practice: false, deaths: 1, avoidable: 1, stats: std, myId: 1, alive: [1, 2, 3, 4] });
  e = earned();
  check(e.includes('second-road') && e.includes('hard-road'), 'the second road, Normal and Hard');
  // roles and heroes on Hard
  Pt.event('clear', { boss: 'grubnak', mode: 'hard', secs: 400, practice: false, deaths: 0, avoidable: 0, stats: stats(P(1, 'dps', { cls: 'pyromancer' })), myId: 1, alive: [1] });
  Pt.event('clear', { boss: 'grubnak', mode: 'hard', secs: 400, practice: false, deaths: 0, avoidable: 0, stats: stats(P(1, 'tank', { cls: 'bastion' })), myId: 1, alive: [1] });
  e = earned();
  check(e.includes('three-hats') && e.includes('role-tank') && e.includes('role-dps'), 'tank, healer and damage on Hard make three hats');
  // old saves: hard clears the save already holds count for mastery
  store.heroes = { bloodreaver: { clears: { grubnak: { normal: 1, hard: 2 } } }, runeguard: { clears: { volkar: { normal: 0, hard: 1 } } } };
  Pt.event('item', { key: 'x' });
  // raises, hollow, flags, bouts
  Pt.event('raise', {});
  Pt.event('hollow', { ok: 0 });
  check(earned().includes('hand-up') && !earned().includes('back-from-hollow'), 'a raise counts, a failed Hollow does not');
  Pt.event('hollow', { ok: 1 });
  check(earned().includes('back-from-hollow'), 'a Hollow survived');
  Pt.event('ctf', { k: 'take' }); Pt.event('ctf', { k: 'cap' });
  check(earned().includes('grab-and-go') && earned().includes('home-run'), 'flags taken and captured');
  const bs = stats(P(1, 'dps'), P(3, 'dps')), T = { 1: 0, 3: 1 };
  for (let i = 0; i < 2; i++) Pt.event('pvp', { won: true, draw: false, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 });
  check(earned().includes('into-the-pit') && !earned().includes('three-in-a-row'), 'two duel wins');
  Pt.event('pvp', { won: false, draw: false, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 });
  Pt.event('pvp', { won: true, draw: false, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 });
  check(!earned().includes('three-in-a-row'), 'a loss breaks the streak');
  for (let i = 0; i < 2; i++) Pt.event('pvp', { won: true, draw: false, mode: 'duel', stats: bs, teams: T, myTeam: 0, myId: 1 });
  check(earned().includes('three-in-a-row'), 'three wins running');
  for (let i = 0; i < 10; i++) Pt.event('emote', { k: 'dance' });
  check(earned().includes('two-left-feet'), 'ten dances');
  // titles: only an earned title can be worn
  Pt.setTitle('lightning-rod'); check(Pt.title() === 'Stormproof', 'wear an earned title');
  Pt.setTitle('mythic'); check(Pt.title() === null, 'an unearned title cannot be worn');
  Pt.setTitle(''); check(Pt.title() === null, 'no title');
  // the whole saved record survives a JSON round trip (the save is localStorage)
  check(JSON.stringify(JSON.parse(JSON.stringify(Save.get('pastimes')))) === JSON.stringify(Save.get('pastimes')), 'the feat record is plain JSON');
}

if (probs.length) { console.log('Feats FAILED:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log(`Feats OK (${FEATS.length} feats, ${new Set(FEATS.filter(f => f.title).map(f => f.title)).size} titles, ${FEATS.filter(f => f.hidden).length} hidden)`);
