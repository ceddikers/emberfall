// The Founding: the founders' voices, the founders' book (story pages) and the Founder's Trials, as data. Shared by the host's
// sim (sim-trials.js), the client layer (client-trials.js), the town (main.js, town-mark.js) and the tests. All files LF.
//
//   FOUNDING_STORY.FOUNDERS            the four founders: id -> { name, col }
//   FOUNDING_STORY.line(kind, a, b)    a founder's line for a moment -> { by, name, col, t } or null.
//        ('q', questId, 0|2|3) a quest offered / done / missed, ('part', partIdx), ('boss', enemyId), ('end', 0|1|2), ('start')
//   FOUNDING_STORY.thread(kind, a, b, ctx)   the lines to speak for a moment, in order: for a quest, the pickup on an offer, or the giver's word and
//        a hand-off to the next job on done / missed. ctx = { st: { questId: 0|1|2|3 }, wave, led: {} } (client-trials.js builds it). Other kinds: [line(...)].
//   FOUNDING_STORY.nextAfter(id, ctx)  the next quest still to do after id -> { id, timing: 'near' | 'far' } or null
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
    stakes: ['The ground needs edges. Walk with me, and I will drive the stakes one by one.', 'Every stake holds. Now the camp has an edge, and a wanderer can know it.', 'No bounds, then. I will keep the edge in my head and call out when it is crossed.'],
    mill: ['The wind on the west plain never tires. I mean to make it grind. Hold the frame with me.', 'It turns. Flour by the sack, and a little coin for everyone.', 'No sails, then. The wind will keep, and so will I.'],
    larder: ['Winter will make the ground hard. Roots and grain, laid by, while we can still dig.', 'Full, and dry. We will not go hungry before spring.', 'Thin shelves. We will stretch what we have.'],
    choice: ['One stone, two wishes. Carry it to the one you choose, and that one stands.', 'It is raised. Whichever it is, it was chosen by those who carried it.', 'Neither stands, then. The quarry will wait for us to agree.'],
    watchfires: ['Fires on the far rises, so I see the dark before it sees us. Carry a brand to each.', 'Every rise burns. Nothing crosses the valley now without being counted.', 'Dark rises, then. I will count the shadows myself.'],
    cover: ['Now the Hearth. We cover it, and we do not look in. Not today. Not ever.', 'It is covered. Let it be a floor. Let the floor be a town.', 'Open to the sky, then. Stand close to it.'],
  };
  const QBY = { spring: 'digger', gate: 'steward', fire: 'smith', beacon: 'steward', stakes: 'warden', road: 'steward', graves: 'digger', mill: 'smith', stonegate: 'steward', roof: 'smith', larder: 'digger', choice: 'steward', watchfires: 'warden', cover: 'steward' };
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

  // ---------------------------------------------------------------- the thread between quests
  // A quest is offered, then done or missed; each of those moments can carry the camp's story on to the next job.
  //   OFFER[id]   the giver picks up from the quest before it in D.QUEST_ORDER: [it was done, it was missed, it is still open]
  //   REACT[id]   when a quest ends, another founder answers it: { done: [by, text], missed: [by, text] } (never the giver; a missed quest is never scolded)
  //   LEAD[id]    the hand-off to the quest that comes next: { near, far }. 'near' = it is open, or offered within a wave; 'far' only hints at it.
  //               {S} is "The Steward" (whoever owns that job) when another founder says it, and "I" when the owner says it themselves,
  //               so lead lines keep to the past tense and to "will", which fit both.
  const OFFER = {
    gate: ['Water in the camp, and now a door for the road. The stone is on its way up the hill.', 'A dry camp, then, and all the more reason for a door. The stone is on its way up the hill.', 'The Digger is still at the dig. Meanwhile the road wants a door, and the stone is on its way.'],
    fire: ['A gate to hold, and now something to hold it with. Give me a quiet hour and a bed of coals.', 'No gate, so we need good iron more than ever. Give me a quiet hour and a bed of coals.', 'The stone is still climbing. I will light the forge while it does, if someone stands by me.'],
    beacon: ['The forge is lit, and we have iron. Now a light for the hill, so the dark has something to look at.', 'No forge yet, and no matter. A light on the hill wants oil, not iron.', 'The Smith is still coaxing her coals. The hill wants a light meanwhile. Oil, up the slope.'],
    stakes: ['The hill is lit, and now we can see how much ground we hold. I mean to mark where it ends.', 'The hill stays dark. Then I will mark the ground by hand, and count whatever stands inside it.', 'Oil is still going up the hill. Meanwhile I will walk the edge of the camp and drive stakes. Walk with me.'],
    road: ['The bounds are marked. Now we make the road lead them away from the warmth, post by post.', 'Unmarked ground, then. All the more reason to give them a road that leads away from us.', 'The Warden is still driving stakes. I will have lanterns along the road, to lead them away from the warmth.'],
    graves: ['The road bought us a quiet night, mostly. We lost some of us anyway. They get the meadow, and flowers.', 'They came straight at us, and we lost some in the night. They get the meadow, and flowers.', 'The lanterns are still going up. We lost some in the night, and they get the meadow, and flowers.'],
    mill: ['The meadow is in bloom, so now to feed the living. The wind never stops on the west plain. A mill, then.', 'No flowers, and the camp is hungry anyway. The wind never stops on the west plain; I mean to put a mill there.', 'The bluebells are going in. Hands wanted anyway: the west plain wants a mill, and a mill wants builders.'],
    stonegate: ['The mill turns, and the camp eats. Now the gate gets what it was owed: the Words, cut deep.', 'No flour, and thin porridge. The gate still wants its Words.', 'Whatever the mill does, the gate must have its Words. The dressed stone is waiting at the quarry.'],
    roof: ['Words on the gate. Words do not keep rain off, though. Timber from past the ford, and a roof.', 'Bare stone, then. Words or no words, we need a roof. Timber from past the ford.', 'While the Steward carves, I will see to timber. A roof wants hauling from past the ford.'],
    larder: ['A roof over us. Now something in the cupboard: roots, grain and dried fruit, before the long dark.', 'No roof, so we will eat damp. Let us at least have a full larder before the long dark.', 'The roof goes up slowly, and winter will not wait. Roots and grain, laid by, before the long dark.'],
    choice: ['The larder is full. One stone is left in the quarry: a bell or a ward, not both. The Warden and the Smith are arguing it.', 'A lean winter, and one stone left. A bell or a ward, not both. The Warden and the Smith are already arguing.', 'Gather what you can. The last stone is spoken for twice: a bell, or a ward. Carry it, and the argument settles.'],
    watchfires: ['The stone is raised. Good. Now I want fires on every far rise, so I see what is coming before it arrives.', 'The stone lies unused. Fine. We will see the dark coming by fire. Carry a brand to each far rise.', 'While the stone is argued over, I want fires on the far rises. Light them from the camp, and keep them lit.'],
    cover: ['The far fires burn, and we can see the dark coming. Now the Hearth. Stand close while we lay the capstone.', 'The rises stay dark; we will trust our ears. Now the Hearth. Stand close while we lay the capstone.', 'Keep the fires burning, but come in when you can. The capstone is ready for the Hearth.'],
  };
  const REACT = {
    spring: { done: ['smith', 'Water I can quench in. Good.'], missed: ['warden', 'A trickle still fills a cup. I will ration it.'] },
    gate: { done: ['warden', 'Now there is a door to count people through.'], missed: ['digger', 'Open road. I have dug in worse places.'] },
    fire: { done: ['warden', 'Sparks by the river. Every eye in the valley will see them.'], missed: ['digger', 'Cold iron keeps. The anvil will have its turn.'] },
    beacon: { done: ['smith', 'A light is a promise. I hope we can keep it.'], missed: ['digger', 'The dark has kept this ground a long time. We will manage.'] },
    stakes: { done: ['smith', 'Stakes in the ground. Now they know where our fire ends.'], missed: ['digger', 'Unmarked ground is still ground. We know where it ends.'] },
    road: { done: ['smith', 'A road that leads them wrong. I would pay to see their faces.'], missed: ['warden', 'They will come straight. I will count the gate twice.'] },
    graves: { done: ['steward', 'Bluebells in the meadow. We will remember who they were.'], missed: ['warden', 'I counted them anyway. I will keep counting.'] },
    mill: { done: ['digger', 'Flour. A mill, and soon a town. Somebody will bake.'], missed: ['warden', 'No mill. We will eat what we can carry.'] },
    stonegate: { done: ['digger', 'Words in stone. I hope we meant them.'], missed: ['warden', 'Bare stone. The Steward will carve it another day.'] },
    roof: { done: ['warden', 'A roof. I will count heads from a dry bed.'], missed: ['steward', 'No roof. We will let the sky be our ceiling a while.'] },
    larder: { done: ['smith', 'Full sacks. A hammer swings better on a full belly.'], missed: ['warden', 'A lean larder. Small portions, and no complaint.'] },
    choice: { done: ['digger', 'A stone raised, whichever it is. The camp is standing.'], missed: ['smith', 'Neither bell nor ward. Then I will keep the hammer close.'] },
    watchfires: { done: ['smith', 'Fires on every rise. Let the dark see us from afar.'], missed: ['digger', 'Dark rises. The dark has kept us company before.'] },
    cover: { done: ['warden', 'The Hearth is covered, and the camp is standing. I counted.'], missed: ['smith', 'Uncovered, then. Mind the heat, and keep your head.'] },
  };
  const LEAD = {
    gate: { near: '{S} could use hands for the gate stone.', far: '{S} was out on the North Road again, measuring it for a door.' },
    fire: { near: '{S} would be glad of a guard at the first forge.', far: '{S} kept looking at the river bank, and at the coals.' },
    beacon: { near: '{S} will want oil carried up the hill.', far: '{S} was up on the hill, looking at all that dark.' },
    stakes: { near: '{S} meant to mark the edge of the camp, and wanted company.', far: '{S} was pacing the edge of the camp, counting steps.' },
    road: { near: '{S} will be asking for lanterns along the North Road.', far: '{S} was drawing a road in the dirt that bent away from the Hearth.' },
    graves: { near: '{S} could use a hand in the meadow.', far: '{S} was looking at the meadow, and at the bluebell seed.' },
    mill: { near: '{S} would be glad of builders on the west plain.', far: '{S} was watching the west wind as if it owed a debt.' },
    stonegate: { near: '{S} will need the dressed stone hauled to the gate.', far: '{S} was standing at the gate with a chisel and a long face.' },
    roof: { near: '{S} could use timber from past the ford.', far: '{S} was eyeing the trees past the ford.' },
    larder: { near: '{S} will be asking for sacks gathered from the far corners.', far: '{S} was counting sacks again, and not liking the count.' },
    choice: { near: '{S} will want stone carried, and a choice made.', far: '{S} was down at the quarry, looking at the last of the stone.' },
    watchfires: { near: '{S} would be glad of fires on the far rises.', far: '{S} was looking at the far rises as if they were already lit.' },
    cover: { near: '{S} will want everyone at the Hearth.', far: '{S} was standing over the Hearth, saying nothing.' },
  };
  const LEAD_ANY = { near: '{S} will want a hand with the next job.', far: '{S} was looking over what is left to build.' };

  const dataOf = () => { try { if (typeof FOUNDING_DATA !== 'undefined') return FOUNDING_DATA; if (typeof require !== 'undefined') return require('./data.js').FOUNDING_DATA; } catch (e) { /* no data: no thread */ } return null; };
  const giverOf = id => { const D = dataOf(), def = D && D.QUESTS && D.QUESTS[id]; return QBY[id] || byGiver(def ? def.giver : null); };
  const mk = (by, t, p, tag) => { const f = FOUNDERS[by] || FOUNDERS.steward; return { by, name: f.name, col: f.col, t, p, tag }; };

  // the next quest still to be done after `id`, and how close it is: ctx = { st: { id: 0 unseen | 1 open | 2 done | 3 missed }, wave }
  function nextAfter(id, ctx) {
    const D = dataOf(); if (!D) return null;
    const order = D.QUEST_ORDER, i = order.indexOf(id), st = (ctx && ctx.st) || {}, wave = (ctx && ctx.wave) | 0;
    if (i < 0) return null;
    for (let k = i + 1; k < order.length; k++) {
      const n = order[k], s = st[n] | 0; if (s >= 2) continue;
      return { id: n, timing: s === 1 || D.QUESTS[n].offerWave - wave <= 1 ? 'near' : 'far' };
    }
    return null;
  }
  // a quest is offered: its giver picks up from the quest before it
  function pickup(id, ctx) {
    const D = dataOf(), order = D ? D.QUEST_ORDER : [], i = order.indexOf(id), by = giverOf(id);
    if (i > 0 && OFFER[id]) {
      const ps = ((ctx && ctx.st) || {})[order[i - 1]] | 0;
      return mk(by, OFFER[id][ps === 2 ? 0 : ps === 3 ? 1 : 2], 3, 'offer');
    }
    const l = line('q', id, 0); return l ? Object.assign(l, { tag: 'offer' }) : null;
  }
  // a quest ends: another founder answers it and points at the next job. The same lead is not spoken twice (ctx.led remembers it).
  function handoff(id, outcome, ctx) {
    const n = nextAfter(id, ctx), r = REACT[id] && REACT[id][outcome === 2 ? 'done' : 'missed'];
    let lead = null, key = null, who = r ? r[0] : null;
    if (n) {
      key = n.id + ':' + n.timing;
      if (!(ctx && ctx.led && ctx.led[key])) lead = (LEAD[n.id] || LEAD_ANY)[n.timing];
      if (!who) who = giverOf(n.id);
    }
    if (!r && !lead) return null;
    if (lead && ctx && ctx.led) ctx.led[key] = 1;
    const nb = n ? giverOf(n.id) : null;
    const text = [r ? r[1] : null, lead ? lead.replace('{S}', nb === who ? 'I' : (FOUNDERS[nb] || FOUNDERS.steward).name) : null].filter(Boolean).join(' ');
    return mk(who, text, 3, 'hand');
  }
  // every line for a moment, in the order to speak them. ('q', id, 0|2|3, ctx) = the pickup / the giver's own word, then the hand-off; other kinds as line()
  function thread(kind, a, b, ctx) {
    if (kind !== 'q') { const l = line(kind, a, b); return l ? [l] : []; }
    if (b === 0) { const l = pickup(a, ctx); return l ? [l] : []; }
    if (b === 2 || b === 3) { const out = [], g = line('q', a, b), h = handoff(a, b, ctx); if (g) out.push(g); if (h) out.push(h); return out; }
    return [];
  }

  const PRIO = { q: 3, part: 1, boss: 4, end: 5, start: 4 };   // which line the voice keeps when it is crowded
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
    return { by, name: f.name, col: f.col, t, p: PRIO[kind] | 0 };
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

  return { freshProgress, fixProgress, addPages, record, FOUNDERS, line, thread, nextAfter, THREAD: { OFFER, REACT, LEAD }, PAGES, PAGE_COUNT, pageOf, TRIALS, TRIAL, validTrials, TUNE, byGiver };
})();

if (typeof module !== 'undefined') module.exports = { FOUNDING_STORY };
