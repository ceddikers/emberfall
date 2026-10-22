// Lints the boss journals (client/js/journal/*.js) against docs/plans/journal-voices.md:
// no digits, a word cap, no banned game words, no empty or duplicated entries, and every move key must be a real cast
// in client/js/arena/bosses/<id>.js. `node tools/journal-lint.js` (exit code 1 on any problem; --verbose lists warnings).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BOSSES = ['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra'];
const CAP = 55;   // the voices doc says about 45 to 50; a little slack
const BANNED = /\b(debuffs?|buffs?|dps|aggro|threat|mechanics?|telegraphs?|hp|health bar|cooldowns?|procs?|gcd|aoe|tankbusters?|raidwides?|enrage[ds]?)\b/i;
const NUMWORDS = /(seconds|(one|half a|every|per) second|minutes?|percent|per cent)/i;

function lint() {
  const problems = [], warnings = [];
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
    }
    for (const m of new Set([...src.matchAll(/\bcast\(\s*(['"])((?:(?!\1).)+)\1/g)].map(x => x[2]))) {
      if (!(d.moves || {})[m]) warnings.push(`${b}: cast "${m}" has no journal entry`);
    }
  }
  return { problems, warnings };
}

if (require.main === module) {
  const { problems, warnings } = lint();
  if (process.argv.includes('--verbose')) warnings.forEach(w => console.log('note: ' + w));
  problems.forEach(p => console.log('FAIL ' + p));
  console.log(problems.length ? `journal-lint: ${problems.length} problem(s)` : 'journal-lint: clean');
  process.exit(problems.length ? 1 : 0);
}
module.exports = { lint };
