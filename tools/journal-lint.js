// Lints the boss journals (client/js/journal/*.js) against docs/plans/journal-voices.md:
// no digits, a word cap, no banned game words, no empty or duplicated entries, no two heroes reading as one voice on the
// same move, and every move key must be a real cast
// in client/js/arena/bosses/<id>.js. `node tools/journal-lint.js` (exit code 1 on any problem; --verbose lists warnings).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOSSES = ['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra'];
const CAP = 55;   // the voices doc says about 45 to 50; a little slack
const BANNED = /\b(debuffs?|buffs?|dps|aggro|threat|mechanics?|telegraphs?|hp|health bar|cooldowns?|procs?|gcd|aoe|tankbusters?|raidwides?|enrage[ds]?)\b/i;
// Voice distinctness: two heroes' entries for the SAME move must not read as one voice. Measured as the Dice overlap of
// their content words (stopwords dropped): 2*shared / (words in A + words in B). Above OVERLAP_NOTE is a note (--verbose
// lists them); above OVERLAP_FAIL is a failure. The summary line always prints the count and the worst pair.
const OVERLAP_NOTE = 0.6, OVERLAP_FAIL = 0.8;
const STOP = new Set('the a an and of to in on at it i was is we he she they his her my our me with for as that this but so then from by be had not no up out into when until before after again one all there their them its were are have has just'.split(' '));
const toks = t => new Set(t.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)));
function overlap(a, b) {
  const A = toks(a), B = toks(b); if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(w => { if (B.has(w)) n++; });
  return 2 * n / (A.size + B.size);
}
const NUMWORDS = /(seconds|(one|half a|every|per) second|minutes?|percent|per cent)/i;

function lint() {
  const problems = [], warnings = [];
  const stats = { pairs: 0, noted: 0, worst: { o: 0 } };
  const win = {};
  global.window = win;
  for (const b of BOSSES) {
    const id = require.resolve(path.join(ROOT, 'client/js/journal', b + '.js'));
    delete require.cache[id];
    require(id);
    const d = win.JOURNAL_DATA && win.JOURNAL_DATA[b];
    if (!d) { problems.push(`${b}: no JOURNAL_DATA.${b}`); continue; }
    const src = fs.readFileSync(path.join(ROOT, 'client/js/arena/bosses', b + '.js'), 'utf8');
    const seenLine = new Map();
    const check = (where, text) => {
      if (typeof text !== 'string' || !text.trim()) { problems.push(`${where}: empty entry`); return; }
      if (/\d/.test(text)) problems.push(`${where}: contains a digit`);
      if (NUMWORDS.test(text)) problems.push(`${where}: spells out a time or percentage (${text.match(NUMWORDS)[0]})`);
      const bw = text.match(BANNED);
      if (bw) problems.push(`${where}: banned word "${bw[0]}"`);
      const n = text.split(/\s+/).length;
      if (n > CAP) problems.push(`${where}: ${n} words (cap ${CAP})`);
      const key = text.trim().toLowerCase();
      if (seenLine.has(key)) problems.push(`${where}: identical to ${seenLine.get(key)}`); else seenLine.set(key, where);
    };
    for (const part of ['meet', 'win']) for (const h in (d[part] || {})) check(`${b}.${part}.${h}`, d[part][h]);
    const heroes = Object.keys(d.meet || {});
    for (const m in (d.moves || {})) {
      const mv = d.moves[m];
      const q = [`'${m}'`, `"${m}"`, `\`${m}\``];
      if (!q.some(x => src.includes(x))) problems.push(`${b}.moves.${m}: no such cast in arena/bosses/${b}.js`);
      for (const h of heroes) check(`${b}.moves.${m}.${h}`, (mv.learned || {})[h]);
      for (const h in (mv.learned || {})) if (!heroes.includes(h)) problems.push(`${b}.moves.${m}: unknown hero ${h}`);
      const hs = Object.keys(mv.learned || {});
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
        const a = mv.learned[hs[i]], c = mv.learned[hs[j]];
        if (typeof a !== 'string' || typeof c !== 'string') continue;
        const o = overlap(a, c); stats.pairs++;
        if (o > stats.worst.o) stats.worst = { o, where: `${b}.moves.${m}: ${hs[i]} / ${hs[j]}` };
        if (o >= OVERLAP_FAIL) problems.push(`${b}.moves.${m}: ${hs[i]} and ${hs[j]} read as one voice (overlap ${o.toFixed(2)})`);
        else if (o >= OVERLAP_NOTE) { stats.noted++; warnings.push(`${b}.moves.${m}: ${hs[i]} / ${hs[j]} overlap ${o.toFixed(2)}`); }
      }
    }
    for (const m of new Set([...src.matchAll(/\bcast\(\s*(['"])((?:(?!\1).)+)\1/g)].map(x => x[2]))) {
      if (!(d.moves || {})[m]) warnings.push(`${b}: cast "${m}" has no journal entry`);
    }
  }
  return { problems, warnings, stats };
}

if (require.main === module) {
  const { problems, warnings, stats } = lint();
  if (process.argv.includes('--verbose')) warnings.forEach(w => console.log('note: ' + w));
  problems.forEach(p => console.log('FAIL ' + p));
  console.log(`voice overlap: ${stats.noted} of ${stats.pairs} same-move pairs at or above ${OVERLAP_NOTE} (fails at ${OVERLAP_FAIL}); worst ${stats.worst.o.toFixed(2)} (${stats.worst.where})`);
  console.log(problems.length ? `journal-lint: ${problems.length} problem(s)` : 'journal-lint: clean');
  process.exit(problems.length ? 1 : 0);
}
module.exports = { lint };
