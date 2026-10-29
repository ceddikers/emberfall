// The Founding: the founders' voices, the founders' book (story pages) and the Founder's Trials, as data. Shared by the host's
// sim (sim-trials.js), the client layer (client-trials.js), the town (main.js, town-mark.js) and the tests. All files LF.
//
//   FOUNDING_STORY.FOUNDERS            the four founders: id -> { name, col }
//   FOUNDING_STORY.line(kind, a, b)    a founder's line for a moment -> { by, name, col, t } or null.
//        ('q', questId, 0|2|3) a quest offered / done / missed, ('part', partIdx), ('boss', enemyId), ('end', 0|1|2), ('start')
//   FOUNDING_STORY.pageOf(n)           the founders' book page n -> { n, title, by, text }; a page nobody wrote a text for still reads
//   FOUNDING_STORY.PAGES               pages 1..PAGE_COUNT
//   FOUNDING_STORY.TRIALS              the Founder's Trials: { id, name, text, title, feat }
//   FOUNDING_STORY.validTrials(ids)    known ids only, in the list's order, no repeats
//   FOUNDING_STORY.TUNE                the numbers a trial changes (sim-trials.js reads them)
//
// Story text is the game's voice: plain, warm, short. It hints at the warmth under the Hearth and never shows it.

const FOUNDING_STORY = (() => {
  const FOUNDERS = {
    steward: { name: 'The Steward', col: '#e8cf8a' },
    smith: { name: 'The Smith', col: '#f0a870' },
    digger: { name: 'The Digger', col: '#a9cf9a' },
    warden: { name: 'The Warden', col: '#9fc4ee' },
  };
  const byGiver = g => (g === 'The Steward' ? 'steward' : g === 'The Smith' ? 'smith' : g === 'The Digger' ? 'digger' : g === 'The Warden' ? 'warden' : 'steward');

  // ---------------------------------------------------------------- spoken lines
  // quest lines are spoken by the quest's giver unless an entry names someone else
  const Q = {
    spring: ['There is water under this. I can hear it thinking about coming up.', 'Warm as a hand. Do not ask me why. I did once, and the ground kept its counsel.', 'Only a trickle. It will do for drinking. It will not do for mending.'],
    gate: ['A road wants a door in it. The stone is on its way up the hill.', 'A gate. Not much to look at yet. But now we can say which side of it we are on.', 'No gate, then. We keep the road open and our eyes on it.'],
    fire: ['Give me a quiet hour and a bed of coals, and I will give you iron.', 'She is lit. Now we can make things worth the carrying.', 'Cold forge. I can still flatten a nail. That is about all.'],
    beacon: ['Oil to the hill. The dark should have something to look at besides us.', 'Look at that. You can see it from the ford. So can anything else, I suppose. Worth it.', 'A dark hill and a dark night. Keep your lamps trimmed.'],
    road: ['Light the road away from the Hearth. Whatever follows warmth can follow it the long way round.', 'A road that leads them off. Remember who walked it first.', 'They will come straight at us, then. We were slow.'],
    graves: ['We lost some in the night. They get the meadow, and flowers, if I have to carry the seed in my teeth.', 'Bluebells. They will come up every spring after we are gone. I will see to it.', 'No flowers this year. I am sorry for it.'],
    stonegate: ['Words on the gate. Whoever comes through should know what we meant by it.', 'Cut deep. Let the weather try.', 'Bare stone. We will have to mean it without saying it.'],
    roof: ['A hall. Four walls, a roof, and the first thing in the valley that is not a tent.', 'The roof is on. It leaks in one corner, which makes it a proper building.', 'No roof yet. The rain gets in, and so do the tired.'],
    cover: ['Now the Hearth. We cover it, and we do not look in. Not today. Not ever.', 'It is covered. Let it be a floor. Let the floor be a town.', 'Open to the sky, then. Stand close to it.'],
  };
  const QBY = { spring: 'digger', gate: 'steward', fire: 'smith', beacon: 'steward', road: 'steward', graves: 'digger', stonegate: 'steward', roof: 'smith', cover: 'steward' };
  // for a quest nobody wrote a line for: the giver's own way of saying it
  const GENERIC = {
    steward: ['One thing more, and then another. That is how a place gets built.', 'Good. Another stone laid.', 'We will manage without it.'],
    smith: ['Hands wanted. Mine are full.', 'Well made.', 'Next time, then.'],
    digger: ['The ground wants turning.', 'That will hold.', 'The earth will wait. It always does.'],
    warden: ['Eyes up. Something wants doing.', 'Counted, and done.', 'Noted.'],
  };
  const PART = [   // by the run's part, spoken as it begins (D.PARTS order)
    ['warden', 'You are the first wardens. I will keep the count.'],
    ['smith', 'The light is thin out there. Keep your backs to the fire.'],
    ['digger', 'Morning. Everything is where we left it, and so are we.'],
    ['warden', 'They have learned the road. So have we.'],
    ['steward', 'Look at it. It is starting to be a place.'],
    ['steward', 'The last of the dark. Hold, and the rest is a morning.'],
  ];
  const BOSS = {   // the four main bosses, by enemy id; kept vague on purpose
    tunnelmaw: ['digger', 'Something old is coming up through the road.'],
    wickeater: ['smith', 'That one has been waiting a long time.'],
    mirebull: ['warden', 'Big, and slow. Do not let it set the pace.'],
    oldgnaw: ['steward', 'This is what the fire called. Hold the camp.'],
  };
  const END = [   // the end beat: beaten, the gate shuts, the town is named
    ['warden', 'It is down. It is down, and the camp is standing.'],
    ['smith', 'Shut the gate. Let the road be a road.'],
    ['steward', 'Emberfall. A fire fell here, and we stayed.'],
  ];
  const START = ['steward', 'The ember fell short of the hills. The valley is ours to hold, and nobody else is coming.'];

  function line(kind, a, b) {
    let by = null, t = null;
    if (kind === 'q') {
      const st = b === 0 ? 0 : b === 2 ? 1 : b === 3 ? 2 : -1;
      if (st < 0) return null;
      const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : null, def = D && D.QUESTS && D.QUESTS[a];
      by = QBY[a] || byGiver(def ? def.giver : null);
      t = Q[a] ? Q[a][st] : GENERIC[by][st];
    } else if (kind === 'part') { const p = PART[a]; if (p) { by = p[0]; t = p[1]; } }
    else if (kind === 'boss') { const p = BOSS[a]; if (p) { by = p[0]; t = p[1]; } }
    else if (kind === 'end') { const p = END[a]; if (p) { by = p[0]; t = p[1]; } }
    else if (kind === 'start') { by = START[0]; t = START[1]; }
    if (!t) return null;
    const f = FOUNDERS[by] || FOUNDERS.steward;
    return { by, name: f.name, col: f.col, t };
  }

  // ---------------------------------------------------------------- the founders' book
  // Pages the run hands out: 1, 6, 7 and 9 now; the rest are written ahead of the secrets that will hand them out.
  // Page 9 carries the Words as they were first carved. (Draft: the Ultimate's page and the line after its first clear are written with it.)
  const PAGES = [
    { n: 1, title: 'The first coin', by: 'warden', text: 'We left a coin under the first post, and a note on the lid. Whoever comes back thirsty can buy the round. It is the only thing we own that is not needed.' },
    { n: 2, title: 'The hill and the slab', by: 'steward', text: 'Under a slab at the foot of the beacon hill, something silver that nobody here would wear. Someone before us did not wish to be called what they were. We will not call ourselves that either.' },
    { n: 3, title: 'What the water says', by: 'digger', text: 'Sit by the spring long enough and something answers. A frog, I tell myself. The water talks back if you let it, and it has not once said anything unkind.' },
    { n: 4, title: 'Silver in the shallows', by: 'smith', text: 'A glint in the ford at first light, there and gone. Moon-silver, the old woman called it. I wanted it for the forge. She told me the river would want it back, and it does.' },
    { n: 5, title: 'The small footprints', by: 'warden', text: 'A child went missing at dusk and walked home at dawn with a lucky stone and no explanation. I counted her twice to be sure. I will keep counting her.' },
    { n: 6, title: 'The stone that was already there', by: 'digger', text: 'One grave in the meadow was older than the rest of us. No name. No flowers. The valley had its dead before it had a town. I planted bluebells over that one first.' },
    { n: 7, title: 'A word in another hand', by: 'steward', text: 'Under the Words on the gate, one more. Not my hand, not any I know. It is already half worn, as if it was cut long before the stone was dressed.' },
    { n: 8, title: 'The warm stone', by: 'digger', text: 'A pebble too warm to hold, south of the camp. I carried it to the spring and set it in the water. Put it back, I was told. I did not ask who told me.' },
    { n: 9, title: 'The Words', by: 'steward', text: 'Carved this day on the back of the gate, cut deep so that weather will have to try:', words: ['FOLLOW THE ROAD.', 'LEAVE THE FIRE BEHIND YOU.', 'LET WHAT IS COVERED LIE.'] },
    { n: 10, title: 'Those who herded here', by: 'warden', text: 'Bells on the high ledge, cracked, and a track only goats would climb. Someone kept flocks here before us. They did not stay. Nobody has told me why.' },
    { n: 11, title: 'A fish in the reeds', by: 'smith', text: 'Pale, whiskered, as long as a cart, and unhurried. The reed pool will give you one good fish, the old men say, and then it gives you a reason to stop fishing.' },
    { n: 12, title: 'The grove we do not cut', by: 'digger', text: 'Timber is timber, but I will not take another stick from the oak with the carved ring. The wood there is slow to forgive. We have enough.' },
    { n: 13, title: 'Where the ash comes from', by: 'warden', text: 'The hungry things are not born of the ash; they are drawn to the warmth, and the ash is only what they leave. Whatever is warm calls them. That is all we know, and it is enough to be afraid of.' },
    { n: 14, title: 'The first hunger', by: 'steward', text: 'The fire did not fall alone. It was followed. Whatever came first came a long way, and was hungrier than anything since. We hold the valley so that nothing after it has to.' },
  ];
  const PAGE_COUNT = PAGES.length;
  const pageOf = n => PAGES.find(p => p.n === n) || { n, title: 'A page', by: 'steward', text: 'Too water-stained to read.' };

  // ---------------------------------------------------------------- Founder's Trials
  // Opt-in modifiers, available after a first win. Winning a run with one on clears it: a title (feats-data.js) and nothing else.
  // Never power. The host chooses; everyone in the room plays them and earns the clear.
  const TRIALS = [
    { id: 'quick', name: 'Short Days', text: 'The waves come a fifth sooner. The quests have less time to be done.', title: 'Quick of the First Watch', feat: 'founding-trial-quick' },
    { id: 'dry', name: 'The Dry Spring', text: 'The spring heals no one. Rest at the fountain is only rest.', title: 'Dry-Throated Warden', feat: 'founding-trial-dry' },
    { id: 'dark', name: 'No Moon', text: 'The nights come on sooner and leave later, the beacon cannot lighten them, and every lamp burns smaller.', title: 'Lamp in the Dark', feat: 'founding-trial-dark' },
    { id: 'lean', name: 'A Lean Purse', text: 'The fallen leave a third less gold behind.', title: 'Of the Lean Winter', feat: 'founding-trial-lean' },
    { id: 'bold', name: 'The Ash, Bolder', text: 'Every ordinary enemy is born a step ahead of its lane: plated, quicker, and a little harder to stop.', title: 'Faced the Bold Ash', feat: 'founding-trial-bold' },
  ];
  const TRIAL = Object.fromEntries(TRIALS.map(t => [t.id, t]));
  const validTrials = ids => TRIALS.map(t => t.id).filter(id => Array.isArray(ids) && ids.includes(id));
  // the numbers a trial changes (sim-trials.js)
  const TUNE = {
    quickGap: 80,       // seconds between waves with Short Days (100 normally)
    nightShift: 30,     // No Moon: dusk comes this many seconds sooner and dawn this many later
    darkSight: -0.3,    // No Moon: each lamp's reach
    leanGold: -0.34,    // A Lean Purse: gold from the fallen
    boldArm: 0.06, boldSpeed: 0.08, boldStep: 1,   // The Ash, Bolder: extra plate, extra pace, steps ahead in look
  };


  // ---------------------------------------------------------------- progress (kept in the save under 'founding', per browser)
  // f = { wins, runs, best, pages: [n], trials: { id: clears }, quests: { id: times done }, on: [ids chosen for the next run] }
  const freshProgress = () => ({ wins: 0, runs: 0, best: 0, pages: [], trials: {}, quests: {}, on: [] });
  function fixProgress(f) {
    const o = f && typeof f === 'object' ? f : freshProgress();
    o.wins = o.wins | 0; o.runs = o.runs | 0; o.best = o.best | 0;
    o.pages = Array.isArray(o.pages) ? o.pages.filter(n => Number.isInteger(n) && n > 0) : [];
    o.trials = o.trials && typeof o.trials === 'object' ? o.trials : {}; o.quests = o.quests && typeof o.quests === 'object' ? o.quests : {};
    o.on = validTrials(o.on);
    return o;
  }
  // pages a run handed out -> how many were new
  function addPages(f, list) { let n = 0; for (const p of list || []) if (Number.isInteger(p) && p > 0 && !f.pages.includes(p)) { f.pages.push(p); n++; } if (n) f.pages.sort((a, b) => a - b); return n; }
  // a finished run (fdend `res`) with the trials that were on, the quest ids this build offers and how many played -> what to remember and what to mark
  function record(f, res, trials, questIds, players) {
    const out = { first: false, cleared: [], marks: [], allQuests: false };
    f.runs++; f.best = Math.max(f.best, res.wave | 0);
    const done = (questIds || []).filter(id => res.quests && res.quests[id] === 2);
    for (const id of done) f.quests[id] = (f.quests[id] | 0) + 1;
    if (res.won) {
      out.first = f.wins === 0; f.wins++; out.marks.push('founding:won');
      if (questIds && questIds.length && done.length === questIds.length) { out.allQuests = true; out.marks.push('founding:allquests'); }
      if (players === 1) out.marks.push('founding:solo');
      for (const id of validTrials(trials)) { f.trials[id] = (f.trials[id] | 0) + 1; out.cleared.push(id); out.marks.push('founding:trial:' + id); }
      if (out.cleared.length >= 3) out.marks.push('founding:trials3');
    }
    if (TRIALS.every(t => f.trials[t.id] > 0)) out.marks.push('founding:trialsAll');
    if (f.pages.length >= 4) out.marks.push('founding:pages4');
    return out;
  }

  return { freshProgress, fixProgress, addPages, record, FOUNDERS, line, PAGES, PAGE_COUNT, pageOf, TRIALS, TRIAL, validTrials, TUNE, byGiver };
})();

if (typeof module !== 'undefined') module.exports = { FOUNDING_STORY };
