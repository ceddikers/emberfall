// A hero's journal entries should each read fresh (user, 2026-10-31): no stock line or pet phrase said over and over.
// node tools/journal-repeats.js [boss ...]   -> per boss file, per hero: each pet phrase used more than once, and any sentence the hero
// says twice in that file. Exit 1 when something is over. With no boss named it checks every journal and also the totals over all
// of them (a pet phrase at most about once a boss). tools/journal-lint.js runs the same check.
const fs = require('fs'), path = require('path');
const DIR = process.env.JOURNAL_DIR || path.join(__dirname, '../client/js/journal');   // (JOURNAL_DIR: check a working copy)
const ONLY = process.env.HEROES ? new Set(process.env.HEROES.split(',')) : null;   // (HEROES=a,b: report only these heroes)

// each hero's pet phrases (case-insensitive regexes); at most once per hero per boss file
const PET = {
  alembist: [/\bailment:/i, /\bremedy:/i, /\bshelf note\b/i],
  bastion: [/\bheld\.$/i, /\bgave ground\b/i, /\bwill hold\b/i],
  bloodreaver: [/\ba fine scar\b/i, /\bbleed first\b/i],
  chronomancer: [/\ba beat (after|before)\b/i, /\bi'll have\b/i],
  cleric: [/\bdawn keep\b/i, /\bthank the light\b/i, /\bdears\b/i, /\bflock\b/i],
  driftblade: [/\bnever landing\b/i, /\bwent through\b/i],
  gloomsworn: [/\bi know the sensation\b/i, /\beven i hide\b/i, /\bthe watch is relieved\b/i, /\bthe dark remembers\b/i],
  gorgemaw: [/\bstill hungry\b/i, /\bunderseasoned\b/i, /\bthe whole table\b/i],
  grovekeeper: [/\bplant first\b/i],
  houndmaster: [/\bheel\b/i, /\bgood dogs\b/i, /\bthe shield man\b/i, /\bkept the dogs\b/i, /\beasy, lads\b/i],
  ironpalm: [/\bbreathe\.$/i, /\bthen (i|we) answered\b/i],
  kenseier: [/\bcatch the beat\b/i, /\bash settles\b/i, /\bbreathe, then strike\b/i],
  lanternkeeper: [/\bkeep your light\b/i, /\bi'll leave one burning\b/i, /\bwalk where it's warm\b/i],
  marionettist: [/\bour leading man\b/i, /\bexit, pursued\b/i],
  oathbroker: [/\bso noted\b/i, /\bthe undersigned\b/i, /\bthe fine print\b/i, /\bentered in the ledger\b/i, /\bcountersigned\b/i],
  // (her running joke is her own hair and sleeves catching: in any words it counts as one, user 2026-10-31)
  pyromancer: [/\bkept casting\b/i, /\b(unsinged|singe\w*|scorch\w*|(eye)?brows?|fringe|hair|sleeves?|cuffs?|hat|smoulder\w*|smolder\w*|unburn\w*)\b/i],
  ranger: [/\bclean line\b/i],
  runeguard: [/\bas foreseen\b/i, /\bnot foreseen\b/i, /\bthe omen:/i, /\bthe answer:/i],
  shadowblade: [/\bnever saw me\b/i],
  thermist: [/\bcold read\b/i, /\bhot read\b/i, /\bback to the middle\b/i],
  threadweaver: [/\bmind the slack\b/i, /\bthe whole hem\b/i, /\bpulled it tight\b/i],
  thresher: [/\boff we go\b/i, /\bnot yet!/i, /\bdo mind the step\b/i, /\bin time!/i],
  tidecaller: [/\bmind the tide\b/i, /\bwait for the water\b/i, /\bthe sea gives back\b/i, /\blet the water\b/i, /\blike a tide\b/i],
};
// a pet phrase: once a boss per hero, and only a handful of times over all thirteen journals (user: "not just within but across bosses too")
const PER_FILE = 1, OVERALL = 4;

function load(file) { const w = {}; new Function('window', fs.readFileSync(file, 'utf8'))(w); const J = w.JOURNAL_DATA; return J[Object.keys(J)[0]]; }
// every entry of a journal: [hero, where, text]
function entries(j) {
  const out = [];
  const walk = (o, where) => { for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string') out.push([k, where, v]); else if (v && typeof v === 'object') walk(v, where ? where + '.' + k : k); } };
  walk(j, ''); return out;
}
const sentences = t => t.split(/(?<=[.!?)])\s+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 2);

function check(bosses) {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js') && (!bosses.length || bosses.includes(f.replace(/\.js$/, ''))));
  const problems = [], total = {}, every = {}, wins = {};
  for (const f of files) {
    const E = entries(load(path.join(DIR, f))), boss = f.replace(/\.js$/, ''), pet = {}, seen = {};
    for (const [hero, where, text] of E) {
      for (const s of sentences(text)) { const k = hero + '|' + s.toLowerCase(); (every[k] = every[k] || new Set()).add(boss); }
      if (where === 'win') { const open = text.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim().split(/\s+/).slice(0, 4).join(' '); (wins[hero + '|' + open] = wins[hero + '|' + open] || []).push(boss); }
    }
    for (const [hero, where, text] of E) {
      for (const re of PET[hero] || []) {
        const n = sentences(text).filter(s => re.test(s)).length || (re.test(text) ? 1 : 0); if (!n) continue;
        const k = hero + ' ' + re.source; (pet[k] = pet[k] || []).push(where); total[k] = (total[k] || 0) + n;
      }
      for (const s of sentences(text)) { const k = hero + '|' + s.toLowerCase(); (seen[k] = seen[k] || []).push(where); }
    }
    for (const k in pet) if (pet[k].length > PER_FILE) problems.push(`${boss}: ${k.replace(/\\b/g, '')} used ${pet[k].length} times (${pet[k].join(', ')})`);
    for (const k in seen) if (seen[k].length > 1) { const [hero, s] = k.split('|'); problems.push(`${boss}: ${hero} says "${s}" ${seen[k].length} times (${seen[k].join(', ')})`); }
  }
  if (!bosses.length) {
    for (const k in total) if (total[k] > OVERALL) problems.push(`all journals: ${k.replace(/\\b/g, '')} used ${total[k]} times (at most ${OVERALL})`);
    // across bosses: the same sentence in two journals, and two victories that open the same way
    for (const k in every) if (every[k].size > 1) { const [hero, s] = k.split('|'); problems.push(`across bosses: ${hero} says "${s}" in ${[...every[k]].join(', ')}`); }
    for (const k in wins) if (wins[k].length > 1) { const [hero, o] = k.split('|'); problems.push(`across bosses: ${hero}'s victories open the same way ("${o} ...") in ${wins[k].join(', ')}`); }
  }
  return problems;
}

if (require.main === module) {
  const p = check(process.argv.slice(2)).filter(l => !ONLY || [...ONLY].some(h => new RegExp('(: | )' + h + '( |\'s )').test(l)));
  for (const l of p) console.log('REPEAT ' + l);
  console.log(p.length ? `journal-repeats: ${p.length} problem(s)` : 'journal-repeats: clean');
  process.exit(p.length ? 1 : 0);
}
module.exports = { check, PET };
