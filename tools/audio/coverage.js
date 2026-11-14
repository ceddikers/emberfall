#!/usr/bin/env node
// SfxMap coverage: every name SfxMap can answer must be a recipe sfx-synth.js defines, and every ability / boss move
// in the game should have a mapping. Exit 1 if a mapped name is missing.
//   node tools/audio/coverage.js [--verbose]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const JS = path.join(ROOT, 'client', 'js');
const verbose = process.argv.includes('--verbose');

// the recipes: load sfx-synth.js with a Sound shim that records names
const defined = new Set(), loops = new Set();
global.Sound = { define: n => defined.add(n), defineLoop: n => loops.add(n) };
require(path.join(JS, 'sfx-synth.js'));
const SfxMap = require(path.join(JS, 'sfx-map.js'));
const has = n => defined.has(n) || loops.has(n);
const missing = [];
const check = (what, ans) => { if (ans == null) return; for (const n of [].concat(ans)) if (!has(n)) missing.push(`${what} -> ${n}`); };

// 1. every table entry
for (const [cls, t] of Object.entries(SfxMap.CLASS)) for (const [id, ans] of Object.entries(t)) check(`${cls}.${id}`, ans);
for (const [cls, pair] of Object.entries(SfxMap.IDIOM)) check(`idiom ${cls}`, pair);
for (const [b, t] of Object.entries(SfxMap.MOVES)) for (const [m, ans] of Object.entries(t)) check(`${b}: ${m}`, ans);
for (const b of Object.keys(SfxMap.MOVES)) check(`${b} intro`, SfxMap.forBossIntro(b));
for (const [ty, ans] of Object.entries(SfxMap.TELEGRAPH)) check(`telegraph ${ty}`, ans);
for (const k of ['attack', 'cast', 'big', 'bash', 'brace', 'guard', 'dash', 'palm', 'fist', 'kick', 'slash', 'projectile', 'line', 'ring', 'zone', 'aura', 'shield', 'blink', 'cone', 'spark', 'thermo', 'sabre', 'maw', 'stamp', 'doll', 'fire', 'weird-kind', null])
  for (const cls of [...Object.keys(SfxMap.CLASS), 'nobody']) check(`kind ${cls}/${k}`, SfxMap.forAbility(cls, '__none__', k));

// 2. the game's abilities, read from the kits (kits.js, specs.js) in a sandbox
const sb = { console: { log() {}, warn() {} }, Math, Object, Array, JSON, Number, String, Set, Map };
vm.createContext(sb);
let src = '';
for (const f of ['combat/kits.js', 'combat/specs.js']) src += fs.readFileSync(path.join(JS, f), 'utf8') + '\n';
src += '\n;globalThis.__k = { KITS, ULTIMATES, TALENT_ABILITIES, SPECS: typeof SPECS !== "undefined" ? SPECS : {}, TAUNT_CARRY };';
const abil = {};   // class -> Map(id -> {name, anim, from})
try {
  vm.runInContext(src, sb, { filename: 'kits+specs' });
  const K = sb.__k;
  const add = (cls, ab, from) => { if (!ab || !ab.id) return; (abil[cls] = abil[cls] || new Map()); if (!abil[cls].has(ab.id)) abil[cls].set(ab.id, { name: ab.name, anim: ab.anim, from }); };
  for (const [cls, kit] of Object.entries(K.KITS)) {
    for (const a of kit.abilities || []) add(cls, a, 'kit');
    for (const a of kit.moves || []) add(cls, a, 'move');
    if (kit.auto) add(cls, { id: 'auto', name: 'auto (' + kit.auto.kind + ')', anim: kit.auto.kind }, 'auto');
  }
  for (const [cls, u] of Object.entries(K.ULTIMATES)) {
    if (!u || !u.id) continue;
    add(cls, u, 'ult');
    const w = u.window && u.window.over; if (w) for (const [base, o] of Object.entries(w)) add(cls, { id: o.fxId || base, name: o.name || base, anim: o.anim }, 'ult window');
  }
  for (const [tid, t] of Object.entries(K.TALENT_ABILITIES)) if (t && t.cls) add(t.cls, t.ab, 'talent ' + tid);
  for (const [cls, specs] of Object.entries(K.SPECS || {})) for (const sp of [].concat(specs)) {
    const abs = sp && sp.abilities ? Object.values(sp.abilities) : [];
    for (const a of abs) if (a && a.id) add(cls, a, 'spec ' + sp.id);
  }
} catch (e) { console.log('(could not run kits.js in a sandbox: ' + e.message + ')'); }

let total = 0, mapped = 0; const fall = [];
for (const [cls, m] of Object.entries(abil)) for (const [id, a] of m) {
  total++;
  const ans = SfxMap.forAbility(cls, id, a.anim);
  check(`ability ${cls}.${id}`, ans);
  if (SfxMap.CLASS[cls] && Object.prototype.hasOwnProperty.call(SfxMap.CLASS[cls], id)) mapped++;
  else fall.push(`${cls}.${id} (${a.name}, ${a.from}, anim ${a.anim}) -> ${[].concat(ans).join(' + ')}`);
}
// every ability in a class sounds different: no two resolve to the same answer (the taunt and the shared Ultimate
// parts excepted), and every per-ability voice is built from a recipe spec of its own across all classes
const dupes = [];
for (const [cls, m] of Object.entries(abil)) {
  const seen = new Map();
  for (const [id, a] of m) {
    const ans = SfxMap.forAbility(cls, id, a.anim);
    if (id === 'taunt' || [].concat(ans)[0] === 'ult-fire') continue;
    const key = JSON.stringify(ans);
    if (seen.has(key)) dupes.push(`${cls}: ${seen.get(key)} and ${id} both -> ${key}`); else seen.set(key, id);
  }
}
const specSeen = new Map(), A = global.SfxSynth.ABIL || {};
for (const cls in A) for (const id in A[cls]) { const k = JSON.stringify(A[cls][id]); if (specSeen.has(k)) dupes.push(`identical voice spec: ${specSeen.get(k)} and ${cls}.${id}`); else specSeen.set(k, cls + '.' + id); }
// dash and taunt are shared
for (const cls of Object.keys(SfxMap.CLASS)) { check(`${cls}.dash`, SfxMap.forAbility(cls, 'dash')); check(`${cls}.taunt`, SfxMap.forAbility(cls, 'taunt')); }

// 3. boss moves: the names cast in the boss scripts and written up in tutorial-data.js
const moves = {};
for (const b of ['grubnak', 'skitterra', 'volkar', 'hollowking']) {
  const s = fs.readFileSync(path.join(JS, 'arena', 'bosses', b + '.js'), 'utf8');
  moves[b] = new Set([...s.matchAll(/(?:name|cast|label|move)\s*[:(,]\s*(['"])([A-Z][^'"]{2,30})\1/g)].map(m => m[2]));
}
// Vesper (Season 2): her casts are named in the CONTRACT's CASTS paragraph of her script (several are passed in as variables, so the quoted-name scan alone misses them); every one must
// have a sound of its own
const vesperSrc = fs.readFileSync(path.join(JS, 'arena', 'bosses', 'vesper.js'), 'utf8');
moves.vesper = new Set([...vesperSrc.matchAll(/f\.cast\((['"])([A-Z][^'"]{2,30})\1/g)].map(m => m[2]));
{
  const i = vesperSrc.indexOf('// CASTS (names the cast bar'), j = vesperSrc.indexOf("the dance's name on Extreme).", i);
  if (i >= 0 && j > i) for (const part of vesperSrc.slice(i, j).replace(/\/\/ */g, ' ').replace(/\([^)]*\)/g, ' ').replace(/Hard:|Extreme:/g, ',').split(/[,:;]/).slice(1)) { const n = part.trim().replace(/ \($/, ""); if (/^[A-Z][A-Za-z' -]{2,30}$/.test(n)) moves.vesper.add(n); }
}
// Ormun (Season 2): his casts are the quoted names of f.cast calls plus the CAST NAMES paragraph of his CONTRACT (a judgement is cast under its rule's name, held in a table); every one must
// have a sound of its own
const ormunSrc = fs.readFileSync(path.join(JS, 'arena', 'bosses', 'ormun.js'), 'utf8');
moves.ormun = new Set([...ormunSrc.matchAll(/f\.cast\((?:[^'"(),]*\? *)?(['"])([A-Z][^'"]{2,30})\1/g)].map(m => m[2]));
{
  const i = ormunSrc.indexOf('// CAST NAMES:'), e = 'The Tide Weighs Too.', j = ormunSrc.indexOf(e, i);
  if (i >= 0 && j > i) for (const part of ormunSrc.slice(i, j + e.length).replace(/\/\/ */g, ' ').replace(/\([^)]*\)/g, ' ').replace(/Hard:|Extreme:/g, ',').split(/[,:;.]/).slice(1)) { const n = part.trim(); if (/^[A-Z][A-Za-z' -]{2,30}$/.test(n)) moves.ormun.add(n); }
}
// Maelis (Season 2): her casts are the quoted names of f.cast calls (several are passed in as variables) plus the CASTS paragraph of her CONTRACT (Hard's and Extreme's sit in it inside brackets); every
// one must have a sound of its own
const maelisSrc = fs.readFileSync(path.join(JS, 'arena', 'bosses', 'maelis.js'), 'utf8');
moves.maelis = new Set([...maelisSrc.matchAll(/f\.cast\((['"])([A-Z][^'"]{2,30})\1/g)].map(m => m[2]));
{
  const i = maelisSrc.indexOf('// CASTS (names the cast bar'), e = 'Totality (the enrage).', j = maelisSrc.indexOf(e, i);
  if (i >= 0 && j > i) for (const part of maelisSrc.slice(i, j + e.length).replace(/\/\/ */g, ' ').replace(/\(names[^)]*\)/, ' ').replace(/\(the enrage\)/, ' ').replace(/= [^;)]*/g, ' ').replace(/HARD:|EXTREME:/g, ',').replace(/[()]/g, ' ').split(/[,:;.]/).slice(1)) { const n = part.trim(); if (/^[A-Z][A-Za-z' -]{2,30}$/.test(n)) moves.maelis.add(n); }
}
const tut = fs.readFileSync(path.join(JS, 'tutorial-data.js'), 'utf8');
for (const b of Object.keys(moves)) {
  const i = tut.indexOf('\n    ' + b + ':'); if (i < 0) continue;
  const j = tut.indexOf('moves:', i), end = tut.indexOf('\n    }', j);
  for (const m of tut.slice(j, end).matchAll(/^\s{8}(['"])([^'"]+)\1\s*:/gm)) moves[b].add(m[2]);
}
const bossNames = new Set(['Grubnak', 'Queen Skitterra', 'Volkar', 'The Hollow King', "Butcher"]);
let mTotal = 0; const mFall = [];
for (const [b, set] of Object.entries(moves)) for (const name of set) {
  if (bossNames.has(name)) continue;
  mTotal++;
  const ans = SfxMap.forBossMove(b, name);
  check(`move ${b}: ${name}`, ans);
  if (!ans) mFall.push(`${b}: ${name}`);
}

// every cast of Vesper's sounds different from every other of hers
const vSeen = new Map(), vDupes = [];
for (const name of moves.vesper) { const k = JSON.stringify(SfxMap.forBossMove('vesper', name)); if (vSeen.has(k)) vDupes.push(`vesper: ${vSeen.get(k)} and ${name} both -> ${k}`); else vSeen.set(k, name); }
console.log(`vesper: ${moves.vesper.size} casts, ${vSeen.size} distinct sounds`);
for (const d of vDupes) dupes.push(d);
const oSeen = new Map(), oDupes = [];
for (const name of moves.ormun) { const k = JSON.stringify(SfxMap.forBossMove('ormun', name)); if (oSeen.has(k)) oDupes.push(`ormun: ${oSeen.get(k)} and ${name} both -> ${k}`); else oSeen.set(k, name); }
console.log(`ormun: ${moves.ormun.size} casts, ${oSeen.size} distinct sounds`);
for (const d of oDupes) dupes.push(d);
const mSeen = new Map(), mDupes = [];
for (const name of moves.maelis) { const k = JSON.stringify(SfxMap.forBossMove('maelis', name)); if (mSeen.has(k)) mDupes.push(`maelis: ${mSeen.get(k)} and ${name} both -> ${k}`); else mSeen.set(k, name); }
console.log(`maelis: ${moves.maelis.size} casts, ${mSeen.size} distinct sounds`);
for (const d of mDupes) dupes.push(d);
console.log(`recipes: ${defined.size} one-shots, ${loops.size} loops`);
console.log(`abilities: ${total} found in the kits, ${mapped} in the per-class table, ${fall.length} by fallback`);
if (fall.length) for (const f of fall) console.log('  fallback  ' + f);
console.log(`boss moves: ${mTotal} found, ${mTotal - mFall.length} mapped, ${mFall.length} fall back to the telegraph cue`);
for (const f of mFall) console.log('  no signature  ' + f);
if (verbose) for (const [cls, m] of Object.entries(abil)) console.log(cls + ': ' + [...m.keys()].join(' '));
if (dupes.length) { console.log(`
IDENTICAL ability sounds (${dupes.length}):`); for (const d of dupes) console.log('  ' + d); }
else console.log(`every ability in a class sounds different (${specSeen.size} per-ability voices, all specs distinct)`);
if (missing.length || dupes.length) { console.log(`\nMISSING recipes (${missing.length}):`); for (const m of missing) console.log('  ' + m); process.exit(1); }
console.log('every mapped name is a defined recipe');
