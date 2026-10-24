#!/usr/bin/env node
// Tests for the voice layer: node tools/audio/voice-test.js
// Loads client/js/voice-lines.js with a mocked Sound and Captions, drives it with a fake clock and a seeded random,
// and checks the data (counts, lengths, names, duplicates), the triggers (chances, cooldowns, priorities, the local
// hero only, the countdown), robustness against odd data, and the manifest tool.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
let fails = 0, warns = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL ' + msg); } };
const warn = msg => { warns++; console.log('warn ' + msg); };

// ---------------------------------------------------------------- mocks
const said = [];
global.Sound = { say: (id, o) => { said.push({ id, o }); return true; }, get: k => (k === 'captions' ? true : undefined) };
global.Captions = { show: () => {} };
const VL = require(path.join(ROOT, 'client', 'js', 'voice-lines.js'));
let clock = 1000;
let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const later = [];
VL._cfg.now = () => clock;
VL._cfg.rng = rng;
VL._cfg.later = (fn, s) => later.push({ at: clock + s, fn });
const runLater = () => { later.sort((a, b) => a.at - b.at); while (later.length && later[0].at <= clock) later.shift().fn(); };
const fresh = () => { VL.reset(); said.length = 0; later.length = 0; clock += 1000; };
const T = VL.TABLE;

// ---------------------------------------------------------------- data
const CLASSES = ['bastion', 'bloodreaver', 'runeguard', 'ranger', 'shadowblade', 'pyromancer', 'cleric', 'grovekeeper', 'chronomancer',
  'thermist', 'driftblade', 'alembist', 'gorgemaw', 'oathbroker', 'ironpalm', 'threadweaver', 'marionettist', 'gloomsworn', 'thresher', 'tidecaller', 'lanternkeeper', 'kenseier', 'houndmaster'];
const COUNTS = { move: 8, select: 4, down: 3, revive: 3, low: 3, ult: 3, victory: 2 };
for (const c of CLASSES) for (const k of Object.keys(COUNTS)) {
  const e = T[`hero-${c}-${k}`];
  ok(e && e.texts.length === COUNTS[k], `hero-${c}-${k}: ${COUNTS[k]} variants (has ${e ? e.texts.length : 'none'})`);
}
ok(Object.keys(VL.HEROES).length === 23, '23 classes');
for (const c of CLASSES) { const ch = T[`hero-${c}-move`].chance; ok(ch >= 0.12 && ch <= 0.18, `${c} move chance ${ch} in 0.12-0.18`); }
const PHASES = { grubnak: 5, skitterra: 4, volkar: 4, hollowking: 6 };
for (const b of Object.keys(PHASES)) {
  ok(T[`boss-${b}-intro`].texts.length === 3, `${b}: 3 intros`);
  ok(T[`boss-${b}-death`].texts.length === 2, `${b}: 2 deaths`);
  const w = T[`boss-${b}-wipe`].texts.length; ok(w >= 2 && w <= 3, `${b}: 2-3 wipes`);
  ok(T[`boss-${b}-enrage`] && T[`boss-${b}-pull`], `${b}: enrage and pull`);
  for (let n = 2; n <= PHASES[b]; n++) ok(T[`boss-${b}-phase${n}`], `${b}: phase ${n} line`);
  for (let n = 1; n <= 3; n++) ok(T[`boss-${b}-taunt${n}`], `${b}: taunt ${n}`);
  const moves = Object.keys(T).filter(id => id.startsWith(`boss-${b}-move-`));
  ok(moves.length >= 6 && moves.length <= 10, `${b}: 6-10 move calls (${moves.length})`);
  for (const id of moves) ok(T[id].cooldown >= 20 && T[id].cooldownKey === `boss-${b}-calls` && T[id].chance > 0 && T[id].chance <= 1, `${id}: shared call cooldown >= 20 s and a chance`);
}
const ID_RE = /^(hero-[a-z]+-(move|select|down|revive|low|ult|victory)|boss-[a-z]+-(intro|pull|phase\d|move-[a-z0-9-]+|taunt\d|enrage|death|wipe))$/;
const moveTexts = new Map();
for (const id of Object.keys(T)) {
  const e = T[id];
  ok(ID_RE.test(id), `lineId shape: ${id}`);
  ok(Array.isArray(e.texts) && e.texts.length > 0, `${id} has texts`);
  ok(e.priority >= 1 && e.priority <= 5 && e.voiceHint && e.speaker, `${id} has priority, speaker, voiceHint`);
  const seen = new Set();
  e.texts.forEach((t, i) => {
    ok(typeof t === 'string' && t.trim().length > 0, `${id}-${i + 1} text`);
    ok(!/[{}]/.test(t), `${id}-${i + 1}: no delivery braces left in the spoken text`);
    const words = t.split(/\s+/).length;
    if (words > 14) warn(`${id}-${i + 1} is ${words} words: "${t}"`);
    const maxW = e.boss ? 14 : 8;
    if (words > maxW) warn(`${id}-${i + 1} long for a ${e.boss ? 'boss line' : 'bark'} (${words} words)`);
    const key = t.toLowerCase().replace(/[^a-z ]/g, '');
    ok(!seen.has(key), `${id}: duplicate variant "${t}"`);
    seen.add(key);
    if (e.kind === 'move' && !e.boss) {
      ok(!moveTexts.has(key) || moveTexts.get(key) === e.speakerId, `move line "${t}" used by both ${moveTexts.get(key)} and ${e.speakerId}`);
      moveTexts.set(key, e.speakerId);
    }
  });
}
// no bad words or modern slang
const BAD = /\b(damn|hell|crap|ok|okay|lol|cool|dude|guys|awesome)\b/i;
for (const f of VL.files()) ok(!BAD.test(f.text), `${f.file}: tone ("${f.text}")`);

// ---------------------------------------------------------------- hero barks
fresh();
VL.setLocalHero('bastion');
let barks = 0;
for (let i = 0; i < 1000; i++) { clock += 10; if (VL.onEvent('hero-move', { classId: 'bastion' })) barks++; }
const rate = barks / 1000;
ok(rate > 0.11 && rate < 0.19, `move bark rate about 15% with no cooldown in the way (${(rate * 100).toFixed(1)}%)`);
ok(said.every(s => /^hero-bastion-move-[1-8]$/.test(s.id)), 'move barks call Sound.say with the variant file id');
ok(said.every(s => T['hero-bastion-move'].texts[+s.id.split('-').pop() - 1] === s.o.text), 'each variant id comes with its own text');
ok(said.every(s => s.o.chance === 1 && s.o.speaker === 'Bastion' && s.o.caption === true), 'Sound.say gets chance 1 (rolled here), the speaker and caption');

fresh();
let lastBark = -1e9, minGap = 1e9, n2 = 0;
for (let i = 0; i < 1000; i++) {
  clock += 1;
  if (VL.onEvent('hero-move', { classId: 'bastion' })) { minGap = Math.min(minGap, clock - lastBark); lastBark = clock; n2++; }
}
ok(n2 > 20 && minGap >= 9, `9 s bark cooldown honoured (${n2} barks, closest ${minGap} s apart)`);

fresh();
let sel = 0, selGap = 1e9, lastSel = -1e9;
for (let i = 0; i < 2000; i++) { clock += 1; if (VL.onEvent('hero-select', { classId: 'ranger' })) { sel++; selGap = Math.min(selGap, clock - lastSel); lastSel = clock; } }
ok(selGap >= 6, `select cooldown 6 s (${selGap})`);
fresh(); sel = 0;
for (let i = 0; i < 1000; i++) { clock += 7; if (VL.onEvent('hero-select', { classId: 'ranger' })) sel++; }
ok(sel / 1000 > 0.53 && sel / 1000 < 0.67, `select chance about 60% (${(sel / 10).toFixed(1)}%)`);

fresh();
ok(VL.onEvent('hero-low', { classId: 'cleric' }), 'low health always speaks');
clock += 5; ok(!VL.onEvent('hero-low', { classId: 'cleric' }), 'low health waits 12 s');
clock += 8; ok(VL.onEvent('hero-low', { classId: 'cleric' }), 'low health again after 12 s');
clock += 5; ok(VL.onEvent('hero-ult', { classId: 'cleric' }), 'ultimate always speaks');
clock += 5; ok(VL.onEvent('hero-down', { classId: 'cleric' }), 'down always speaks');
clock += 5; ok(VL.onEvent('hero-revive', { classId: 'cleric' }), 'revive always speaks');
clock += 5; ok(VL.onEvent('hero-down', {}), 'down with no classId uses the remembered local hero');
clock += 5; ok(!VL.onEvent('hero-ult', { classId: 'cleric', local: false }), 'another player\'s hero stays silent');

// ---------------------------------------------------------------- bosses and priorities
fresh();
VL.setLocalHero('pyromancer');
ok(VL.onEvent('boss-intro', { bossId: 'grubnak' }), 'boss intro speaks');
let blocked = true;
for (let i = 0; i < 40; i++) { if (VL.onEvent('hero-move', { classId: 'pyromancer' })) blocked = false; if (VL.onEvent('hero-ult', { classId: 'pyromancer' })) blocked = false; }
ok(blocked, 'a boss line blocks hero barks (moves and ultimates)');
ok(VL.bossSpeaking(), 'bossSpeaking() while the intro plays');
clock += 8;
ok(!VL.bossSpeaking(), 'the boss line ends');
let after = false;
for (let i = 0; i < 200 && !after; i++) { clock += 10; after = !!VL.onEvent('hero-move', { classId: 'pyromancer' }); }
ok(after, 'barks resume after the boss line');

fresh();
VL.setLocalHero('pyromancer');
VL.onEvent('countdown', { seconds: 5 });
let cd = false;
for (let i = 0; i < 50; i++) { clock += 0.09; if (VL.onEvent('hero-move', { classId: 'pyromancer' }) || VL.onEvent('hero-select', { classId: 'pyromancer' })) cd = true; }
ok(!cd, 'no barks in the pull countdown');
ok(VL.onEvent('pull', { bossId: 'grubnak' }), 'pull line');
ok(!VL.onEvent('boss-cast', { bossId: 'grubnak', move: 'Order Up!' }), 'no move call right after the pull');
clock += 10;
// a cast name maps to its line; the shared call cooldown holds the next one back
let call = null;
for (let i = 0; i < 30 && !call; i++) { call = VL.onEvent('boss-cast', { bossId: 'grubnak', move: 'Order Up!' }); if (!call) clock += 30; }
ok(call && /^boss-grubnak-move-order-up-\d$/.test(call), `'Order Up!' -> ${call}`);
clock += 5;
let calls = 0; for (let i = 0; i < 50; i++) if (VL.onEvent('boss-cast', { bossId: 'grubnak', move: 'Flambé' })) calls++;
ok(calls === 0, 'boss call cooldown blocks the next call');
ok(/^boss-grubnak-phase3-1$/.test(VL.onEvent('boss-phase', { bossId: 'grubnak', n: 3 }) || ''), 'phase line plays over the call cooldown');
ok(VL.onEvent('boss-enrage', { bossId: 'grubnak' }), 'enrage cuts in over a phase line (priority 5)');
ok(VL.onEvent('boss-death', { bossId: 'grubnak' }), 'death speaks over everything');
// call aliases and accents
fresh(); VL.onEvent('pull', { bossId: 'grubnak' }); clock += 30;
let alias = null; for (let i = 0; i < 40 && !alias; i++) { alias = VL.onEvent('boss-cast', { bossId: 'grubnak', move: 'Double Chop' }); clock += 30; }
ok(alias && alias.startsWith('boss-grubnak-move-mince-'), 'Double Chop uses the Mince call');
fresh(); VL.onEvent('pull', { bossId: 'hollowking' }); clock += 30;
let doom = null; for (let i = 0; i < 40 && !doom; i++) { doom = VL.onEvent('boss-cast', { bossId: 'hollowking', move: { name: 'Royal Doom' } }); clock += 30; }
ok(doom && doom.startsWith('boss-hollowking-move-royal-doom-'), 'a move given as an object');

// taunts from health
fresh(); VL.onEvent('pull', { bossId: 'volkar' }); clock += 30;
const t1 = VL.onEvent('boss-hp', { bossId: 'volkar', pct: 0.74 });
clock += 40; VL.onEvent('boss-hp', { bossId: 'volkar', pct: 0.7 });
const tauntsSaid = said.filter(s => /taunt/.test(s.id)).map(s => s.id);
ok(tauntsSaid.length === 1 && tauntsSaid[0] === 'boss-volkar-taunt1-1', `75% taunt once (${tauntsSaid})`);
clock += 40; VL.onEvent('boss-hp', { bossId: 'volkar', hp: 20, maxHp: 100 });
ok(said.some(s => s.id === 'boss-volkar-taunt3-1') && !said.some(s => s.id === 'boss-volkar-taunt2-1'), 'a jump past two marks says only the deepest');
// taunts with no health: one per phase instead of a call
fresh(); VL.onEvent('pull', { bossId: 'skitterra' }); clock += 30;
VL.onEvent('boss-phase', { bossId: 'skitterra', n: 2 }); clock += 25;
for (let i = 0; i < 30; i++) { VL.onEvent('boss-cast', { bossId: 'skitterra', move: 'Venom Mist' }); clock += 30; }
const sk = said.filter(s => /taunt/.test(s.id));
ok(sk.length === 1 && sk[0].id === 'boss-skitterra-taunt1-1', `no health events: one taunt for the phase (${sk.map(s => s.id)})`);

// victory waits for the death line
fresh(); VL.setLocalHero('ironpalm'); VL.onEvent('pull', { bossId: 'grubnak' }); clock += 60;
VL.onEvent('boss-death', { bossId: 'grubnak' });
VL.onEvent('clear', { bossId: 'grubnak', classId: 'ironpalm' });
ok(!said.some(s => s.id.startsWith('hero-ironpalm-victory')), 'victory not over the death line');
clock += 6; runLater();
ok(said.some(s => s.id.startsWith('hero-ironpalm-victory')), 'victory after the death line');
// wipe gloats
fresh(); ok(VL.onEvent('boss-wipe', { bossId: 'skitterra' }), 'wipe line');

// ---------------------------------------------------------------- robustness
fresh();
const ODD = [undefined, null, 0, 'x', [], {}, { bossId: 'nope' }, { bossId: 42 }, { classId: {} }, { classId: 'nobody' }, { bossId: 'grubnak', move: null },
  { bossId: 'grubnak', move: { } }, { bossId: 'grubnak', n: 'two' }, { bossId: 'grubnak', n: 99 }, { bossId: 'volkar', pct: 'half' }, { bossId: { toString() { throw new Error('x'); } } }];
const NAMES = ['boss-intro', 'boss-phase', 'boss-cast', 'boss-enrage', 'boss-death', 'boss-wipe', 'pull', 'clear', 'hero-move', 'hero-select', 'hero-down',
  'hero-revive', 'hero-low', 'hero-ult', 'boss-hp', 'countdown', 'nonsense', '', null, undefined, 7];
let threw = false;
VL.reset(); VL.setLocalHero(null);
for (const n of NAMES) for (const d of ODD) { try { VL.onEvent(n, d); } catch (e) { threw = true; console.log(n, d, e); } }
ok(!threw, 'no event throws for odd data');
const saved = global.Sound; global.Sound = { say() { throw new Error('boom'); } };
try { VL.onEvent('boss-death', { bossId: 'volkar' }); } catch (e) { threw = true; }
global.Sound = undefined;
try { clock += 100; VL.onEvent('boss-death', { bossId: 'volkar' }); } catch (e) { threw = true; }
global.Sound = saved;
ok(!threw, 'a failing or missing Sound never throws');

// ---------------------------------------------------------------- manifest tool
const MT = require(path.join(ROOT, 'tools', 'audio', 'voice-manifest.js'));
const files = VL.files();
const list = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'audio', 'voice-manifest.js'), '--list'], { encoding: 'utf8' }).trim().split(/\r?\n/);
ok(list.length === files.length && list.every((l, i) => l === files[i].file + '.ogg'), `--list prints every expected file (${list.length})`);
ok(new Set(list).size === list.length, 'file names are unique');
ok(list.every(l => /^[a-z0-9-]+\.ogg$/.test(l)), 'file names are lower case with hyphens');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-test-'));
const vdir = path.join(tmp, 'voice'); fs.mkdirSync(vdir);
for (const f of ['boss-grubnak-intro-1.ogg', 'hero-bastion-move-3.mp3', 'stray-file.ogg', 'readme.txt']) fs.writeFileSync(path.join(vdir, f), '');
const mf = path.join(tmp, 'manifest.json');
fs.writeFileSync(mf, JSON.stringify(['ui-click', 'music/mus-town', 'voice/old-line-1', 'dash-1']));
const sc = MT.scan(VL, vdir);
const merged = MT.merge(sc.entries, mf);
ok(JSON.stringify(merged) === JSON.stringify(['ui-click', 'music/mus-town', 'dash-1', 'voice/boss-grubnak-intro-1', 'voice/hero-bastion-move-3.mp3', 'voice/stray-file']),
  `manifest merge keeps other entries and replaces voice ones (${JSON.stringify(merged)})`);
ok(sc.unknown.length === 1 && sc.unknown[0] === 'stray-file.ogg', 'an unexpected file is reported');
ok(sc.found.size === 2 && sc.missing.length === files.length - 2, 'found and missing counted');
fs.rmSync(tmp, { recursive: true, force: true });
const doc = fs.readFileSync(path.join(ROOT, 'docs', 'audio', 'voice-lines.md'), 'utf8');
ok(doc === MT.buildDoc(VL), 'docs/audio/voice-lines.md is up to date (run voice-manifest.js --doc)');
ok(files.every(f => doc.includes('`' + f.file + '.ogg`')), 'every file is in the recording script');

// ---------------------------------------------------------------- report
const per = {};
for (const f of files) per[f.speaker] = (per[f.speaker] || 0) + 1;
console.log(`\n${files.length} voice files: ` + Object.entries(per).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`${checks} checks, ${fails} failed, ${warns} warnings`);
process.exit(fails ? 1 : 0);
