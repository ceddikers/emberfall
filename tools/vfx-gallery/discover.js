// Static discovery for the VFX gallery: which class moments (KIT_VFX names) each class's kit emits, and sample data
// for each. Nothing here is hard-coded per class: it reads combat/*.js as text, so it keeps up as kits change.
//
// A moment is emitted as  k.fx('name', data)  (or  this.fx(...)  in engine.js, or  emit({ type: 'fxLocal', name: ... })).
// Which class it belongs to is worked out from where the call sits:
//   - inside a class's own block (KITS.x / KITS = { x: ... } / SPECS = { x: [...] } / ULTIMATES.x / TAUNT = { x: ... } /
//     TALENT_ABILITIES.x_talent), or on a line that checks one of its talents/perks (k.talent('x_...'), k.perk('x_...'));
//   - otherwise inside a top-level helper (function / const); the helper's classes are the classes of every place that
//     names it, followed through helpers that call helpers until nothing changes.
// A name emitted by many classes (or only from engine.js) is filed under 'shared'.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SHARED_MIN = 5;   // a moment emitted by this many classes or more goes on the shared sheet instead of each class's

// the source with comments blanked out (same length, same line breaks), so names in comments don't count
function stripComments(src) {
  let out = '', q = null;
  const NL = '\n', BS = String.fromCharCode(92);
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (q) { out += ch; if (ch === BS) { out += src[++i] || ''; continue; } if (ch === q || (ch === NL && q !== '`')) q = null; continue; }
    if (ch === '/' && nx === '/') { while (i < src.length && src[i] !== NL) { out += ' '; i++; } out += src[i] || ''; continue; }
    if (ch === '/' && nx === '*') { while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === NL ? NL : ' '; i++; } out += '  '; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') q = ch;
    out += ch;
  }
  return out;
}
function lineStarts(src) { const a = [0]; for (let i = 0; i < src.length; i++) if (src[i] === '\n') a.push(i + 1); return a; }
function lineOf(starts, pos) { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; }

// the text of a call's arguments starting just after '(' at pos: returns { args: [text...], end }
function readArgs(src, pos) {
  const args = []; let depth = 0, cur = '', q = null;
  for (let i = pos; i < src.length; i++) {
    const ch = src[i];
    if (q) { cur += ch; if (ch === '\\') { cur += src[++i]; continue; } if (ch === q) q = null; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) { if (cur.trim()) args.push(cur.trim()); return { args, end: i }; }
      depth--;
    }
    if (ch === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  return { args, end: src.length };
}

// Evaluate a data argument's text with every unknown name standing in for "something plausible": a value that is the
// number 2 when used as a number (an ally id, a count), has every property, and maps/joins like a 2-long list.
function sampleData(text) {
  if (!text || !/^\{/.test(text)) return null;
  const U = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 2 : k === 'map' ? f => [f(U), f(U)] : k === 'length' ? 2 : k === 'toJSON' ? () => 2 : k === 'id' ? 2 : U),
    apply: () => U,
  });
  const known = { Math, Number, String, Array, Object, JSON, Boolean, undefined, null: null, NaN, Infinity };
  const sandbox = new Proxy(known, { has: () => true, get: (t, k) => (k in t ? t[k] : k === Symbol.unscopables ? undefined : U) });
  try {
    const v = vm.runInNewContext('with (sb) { (' + text + ') }', { sb: sandbox }, { timeout: 50 });
    return JSON.parse(JSON.stringify(v, (k, x) => (x === U ? 2 : typeof x === 'function' ? 2 : x)));
  } catch (e) { return null; }
}

function discover(root, classIds) {
  const files = ['client/js/combat/kits.js', 'client/js/combat/specs.js', 'client/js/combat/engine.js', 'client/js/combat/talents.js'];
  const isCls = new Set(classIds);
  const blocks = [];   // { file, name, start, end (line idx, inclusive), cls?: classId, kind }
  const texts = {};
  for (const f of files) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const src = stripComments(fs.readFileSync(p, 'utf8')), lines = src.split('\n');
    texts[f] = { src, lines, starts: lineStarts(src) };
    // top-level blocks: from a column-0 declaration to the line before the next column-0 line that isn't a closer
    const tops = [];
    lines.forEach((l, i) => {
      let m;
      if ((m = /^(?:const|let|var)\s+(\w+)\s*=/.exec(l)) || (m = /^(?:async\s+)?function\s*\*?\s*(\w+)\s*\(/.exec(l)) || (m = /^class\s+(\w+)/.exec(l))) tops.push({ i, name: m[1] });
      else if ((m = /^(KITS|ULTIMATES|SPECS|TAUNT)\.(\w+)\s*=/.exec(l))) tops.push({ i, name: m[1] + '.' + m[2], cls: isCls.has(m[2]) ? m[2] : null });
      else if ((m = /^TALENT_ABILITIES\.((\w+?)_\w+)/.exec(l))) tops.push({ i, name: 'TALENT_ABILITIES.' + m[1], cls: isCls.has(m[2]) ? m[2] : null });
      else if ((m = /^Object\.assign\((\w+)/.exec(l))) tops.push({ i, name: m[1] + '+' + i });
      else if (/^\S/.test(l) && !/^[})\]]/.test(l) && !/^\/\//.test(l)) tops.push({ i, name: null });
    });
    tops.forEach((t, j) => {
      const end = (j + 1 < tops.length ? tops[j + 1].i : lines.length) - 1;
      if (t.name != null) blocks.push({ file: f, name: t.name, start: t.i, end, cls: t.cls || null, kind: 'top' });
      // its statements at two spaces: a container's class keys (KITS = { bastion: ... }, SPECS, TAUNT, ULTIMATES), talent
      // keys (bastion_hallowed: ...), TALENT_ABILITIES.x_talent = ... inside an IIFE, and named helpers (const / function)
      let cur = null;
      for (let i = t.i + 1; i <= end; i++) {
        const l = lines[i];
        if (!/^ {2}\S/.test(l) || /^ {2}[})\]]/.test(l)) continue;
        if (cur) { cur.end = i - 1; cur = null; }
        let m, cls = null, name = null;
        if ((m = /^ {2}(\w+)\s*:/.exec(l))) { const c = isCls.has(m[1]) ? m[1] : (/^(\w+?)_/.exec(m[1]) || [])[1]; if (isCls.has(c)) cls = c; }
        else if ((m = /^ {2}(?:KITS|ULTIMATES|SPECS|TAUNT)\.(\w+)\s*=/.exec(l)) && isCls.has(m[1])) cls = m[1];
        else if ((m = /^ {2}TALENT_ABILITIES\.(\w+?)_/.exec(l)) && isCls.has(m[1])) cls = m[1];
        else if ((m = /^ {2}(?:const|let|var)\s+(\w+)\s*=/.exec(l)) || (m = /^ {2}function\s+(\w+)\s*\(/.exec(l))) name = m[1];
        if (cls || name) { cur = { file: f, name: name || t.name + '.' + cls, start: i, end, cls, kind: cls ? 'key' : 'top' }; blocks.push(cur); }
      }
    });
  }
  // the innermost block holding a line
  const blockAt = (f, li) => { let best = null; for (const b of blocks) if (b.file === f && b.start <= li && li <= b.end && (!best || b.start >= best.start)) best = b; return best; };
  const ctxOf = (f, li, lineText) => {
    const own = new Set();
    for (const m of lineText.matchAll(/k\.(?:talent|perk)\(\s*'(\w+?)_/g)) if (isCls.has(m[1])) own.add(m[1]);
    const b = blockAt(f, li);
    if (b && b.cls) own.add(b.cls);
    return { own, block: b };
  };
  // classes of each named top-level block: the classes of every place that mentions it (fixpoint)
  const named = blocks.filter(b => b.kind === 'top' && !b.cls && /^\w+$/.test(b.name) && b.name.length > 3);
  const refs = new Map();   // block name -> [{ own:Set, block }]
  for (const b of named) {
    const re = new RegExp('\\b' + b.name + '\\b', 'g'), out = [];
    for (const [f, T] of Object.entries(texts)) for (const m of T.src.matchAll(re)) {
      const li = lineOf(T.starts, m.index);
      if (f === b.file && li >= b.start && li <= b.end) continue;
      out.push(ctxOf(f, li, T.lines[li]));
    }
    refs.set(b.name, out);
  }
  const clsOfBlock = new Map();
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const b of named) {
      const set = clsOfBlock.get(b.name) || new Set(), n0 = set.size;
      for (const r of refs.get(b.name)) {
        for (const c of r.own) set.add(c);
        if (!r.own.size && r.block && clsOfBlock.has(r.block.name)) for (const c of clsOfBlock.get(r.block.name)) set.add(c);
      }
      clsOfBlock.set(b.name, set);
      if (set.size !== n0) changed = true;
    }
    if (!changed) break;
  }
  // every emit site
  const sites = [];
  for (const [f, T] of Object.entries(texts)) {
    for (const m of T.src.matchAll(/\b(?:k|this|kit)\.fx\(/g)) {
      const { args } = readArgs(T.src, m.index + m[0].length);
      const names = [...(args[0] || '').matchAll(/'([\w-]+)'/g)].map(x => x[1]);
      if (!names.length) continue;
      const li = lineOf(T.starts, m.index);
      sites.push({ f, li, names, data: args[1] || null, line: T.lines[li] });
    }
    for (const m of T.src.matchAll(/type:\s*'fxLocal',\s*name:\s*'([\w-]+)'(?:,\s*data:\s*)?/g)) {
      const li = lineOf(T.starts, m.index);
      const dm = /data:\s*(\{[^}]*\})/.exec(T.lines[li]);
      sites.push({ f, li, names: [m[1]], data: dm ? dm[1] : null, line: T.lines[li], local: true });
    }
  }
  const byName = new Map();   // name -> { classes:Set, data: [samples], sites: [] }
  for (const s of sites) {
    const { own, block } = ctxOf(s.f, s.li, s.line);
    let classes = new Set(own);
    if (!classes.size && block && clsOfBlock.has(block.name)) classes = new Set(clsOfBlock.get(block.name));
    const shared = s.f.endsWith('engine.js') && !classes.size;
    for (const n of s.names) {
      const e = byName.get(n) || { name: n, classes: new Set(), data: [], sites: [], shared: false };
      for (const c of classes) e.classes.add(c);
      if (shared || !classes.size) e.shared = true;
      const d = sampleData(s.data);
      const key = JSON.stringify(d);
      if (!e.data.some(x => JSON.stringify(x) === key) && e.data.length < 3) e.data.push(d);
      e.sites.push(s.f.replace(/^client\/js\//, '') + ':' + (s.li + 1));
      byName.set(n, e);
    }
  }
  const perClass = {}; const shared = [];
  for (const c of classIds) perClass[c] = [];
  for (const e of byName.values()) {
    const rec = { name: e.name, data: e.data.length ? e.data : [null], sites: e.sites.slice(0, 4), classes: [...e.classes] };
    if (e.shared || e.classes.size >= SHARED_MIN) shared.push(rec);
    else for (const c of e.classes) perClass[c].push(rec);
  }
  return { perClass, shared };
}

module.exports = { discover };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const { CLASSES } = require(path.join(root, 'client/js/data.js'));
  const r = discover(root, CLASSES.map(c => c.id));
  for (const [c, l] of Object.entries(r.perClass)) console.log(c.padEnd(13), l.map(x => x.name + (x.data[0] ? JSON.stringify(x.data[0]) : '')).join(' '));
  console.log('shared'.padEnd(13), r.shared.map(x => x.name + '[' + x.classes.length + ']').join(' '));
}
