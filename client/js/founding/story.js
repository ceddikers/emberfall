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
    // (everyday modern English, said plainly: no old-fashioned phrasing, no strings of metaphors; user, 2026-10-31)
    spring: ["There's water under here, and it's warm. Keep those things off me while I dig.", "The spring's open. Warm water for everyone. Don't ask me why it's warm.", "Only a trickle. Fine for drinking, but it won't heal anyone."],
    gate: ['The road needs a gate. The stone carts are on their way up the hill.', "We've got a gate. It's not much yet, but it's ours.", "No gate, then. We'll keep the road open and keep an eye on it."],
    fire: ['Give me an hour and some hot coals, and I can make you real gear.', 'The forge is lit. Now I can make things worth having.', "The forge is cold. I can fix a nail, and that's about it."],
    beacon: ["Let's get oil up to the beacon. We need a light on that hill.", "The beacon's lit. You can see it from the ford. Worth it.", 'The hill stays dark, so the nights will be darker.'],
    road: ['Put lanterns along the North Road. If we light a longer way round, some of them will take it.', "The road's lit. Some of them will go the long way now.", "They'll come straight at us, then."],
    graves: ['We lost people last night. They should be buried in the meadow, with flowers.', "Bluebells on every grave. They'll come up every spring.", "No flowers this year. I'm sorry about that."],
    stonegate: ['I want words carved on the gate, so whoever comes through knows what this place is.', "The words are cut deep. They'll last.", 'Plain stone, then. It will have to do.'],
    roof: ["We need a hall with a real roof. The first building here that isn't a tent.", "The roof's on. It leaks in one corner, but it's a building.", 'No roof yet. The rain gets in, and nobody sleeps well.'],
    stakes: ['I want to mark where the camp ends. Walk with me while I put the stakes in.', "All the stakes are in. Anyone who crosses them knows it's our ground.", "No stakes, then. I'll watch the edge myself."],
    mill: ["I'm building a mill on the west plain. The wind never stops out there. Help me hold the frame.", "The mill's turning. Flour to sell, and a bit of gold for everyone.", "No mill this time. We'll manage."],
    larder: ["Winter's coming. We need roots and grain stored while we can still find them.", "The larder's full. We won't go hungry this winter.", "The shelves are thin. We'll make it stretch."],
    choice: ["There's stone left for one thing, not two. Whichever one you carry it to, that's what we build.", "It's built. You picked it, and that's what we've got.", 'Nothing got built. The stone can wait.'],
    watchfires: ['I want fires on the far hills so I can see what is coming. Light a brand at camp and carry it to each one.', "All the fires are burning. Nothing gets across the valley without me seeing it.", "The hills stay dark. I'll just have to watch harder."],
    cover: ["Now the Hearth. We cover it up and we don't look inside. Not today, not ever.", "It's covered. We build on top of it now.", "It's still open. Stay close to it."],
  };
  const QBY = { spring: 'digger', gate: 'steward', fire: 'smith', beacon: 'steward', stakes: 'warden', road: 'steward', graves: 'digger', mill: 'smith', stonegate: 'steward', roof: 'smith', larder: 'digger', choice: 'steward', watchfires: 'warden', cover: 'steward' };
  // for a quest nobody wrote a line for: the giver's own way of saying it
  const GENERIC = {
    steward: ["One more job. That's how a town gets built.", "Good. That's done.", "We'll manage without it."],
    smith: ['I could use a hand. Mine are full.', 'Nice work.', 'Next time, then.'],
    digger: ["There's digging to do.", "That'll hold.", "It can wait."],
    warden: ['Something needs doing.', 'Done. I counted.', 'Noted.'],
  };
  const PART = [   // by the run's part, spoken as it begins (D.PARTS order)
    ['warden', "You're the first wardens. I'll keep count."],
    ['smith', "It's getting dark out there. Stay near the fire."],
    ['digger', "Morning. Everything's still here, and so are we."],
    ['warden', 'They know the road now. So do we.'],
    ['steward', "Look at it. It's starting to look like a town."],
    ['steward', "This is the last night. Get through it and it's morning."],
  ];
  const BOSS = {   // the four main bosses, by enemy id; kept vague on purpose
    tunnelmaw: ['digger', 'Something big is coming up under the road.'],
    wickeater: ['smith', "That one's been waiting a long time."],
    mirebull: ['warden', "It's big and slow. Don't let it set the pace."],
    oldgnaw: ['steward', 'This is what the fire brought here. Hold the camp.'],
  };
  const END = [   // the end beat: beaten, the gate shuts, the town is named
    ['warden', "It's down. It's down, and the camp's still standing."],
    ['smith', "Shut the gate. We're done for tonight."],
    ['steward', 'Emberfall. A fire fell here, and we stayed.'],
  ];
  const START = ['steward', "The ember came down in this valley. It's ours to hold now, and nobody else is coming."];

  // ---------------------------------------------------------------- the thread between quests
  // A quest is offered, then done or missed; each of those moments can carry the camp's story on to the next job.
  //   OFFER[id]   the giver picks up from the quest before it in D.QUEST_ORDER: [it was done, it was missed, it is still open]
  //   REACT[id]   when a quest ends, another founder answers it: { done: [by, text], missed: [by, text] } (never the giver; a missed quest is never scolded)
  //   LEAD[id]    the hand-off to the quest that comes next: { near, far }. 'near' = it is open, or offered within a wave; 'far' only hints at it.
  //               {S} is "The Steward" (whoever owns that job) when another founder says it, and "I" when the owner says it themselves,
  //               so lead lines keep to the past tense and to "will", which fit both.
  const OFFER = {
    gate: ["We've got water. Now the road needs a gate, and the stone's on its way up.", 'No spring, so we need a gate even more. The stone is on its way up.', "The Digger's still at it. Meanwhile, the road needs a gate. The stone's on its way."],
    fire: ["We've got a gate. Now we need gear to hold it. Give me an hour at the forge.", 'No gate, so we need good gear even more. Give me an hour at the forge.', "The stone's still coming up. I'll light the forge meanwhile, if someone stands guard."],
    beacon: ["The forge is going. Now let's get a light on the hill. Oil, up the slope.", "No forge yet. That's fine, the beacon needs oil, not iron.", "The Smith's still working on the forge. The hill needs a light in the meantime."],
    stakes: ["With the hill lit we can see how much ground we've got. I want to mark where it ends.", "The hill's dark, so I'll mark our ground by hand. Walk with me.", "Oil's still going up the hill. Meanwhile I'll mark the edge of camp. Walk with me."],
    road: ["The edge is marked. Now let's light a road that leads them away from the Hearth.", "No stakes, so let's at least give them a road that leads away from us.", "The Warden's still out with the stakes. I want lanterns along the road meanwhile."],
    graves: ['The road kept most of them off. We still lost people. They should go in the meadow, with flowers.', 'They came straight at us and we lost people. They should go in the meadow, with flowers.', 'The lanterns are still going up. We lost people last night. They should go in the meadow.'],
    mill: ["The meadow's done. Now let's feed the living. I want a mill on the west plain.", "No flowers, and everyone's hungry anyway. I want a mill on the west plain.", "Hands wanted. I'm putting a mill up on the west plain."],
    stonegate: ["The mill's running and we're eating. Now the gate gets its words, cut in stone.", "No flour, so it's thin soup. The gate still needs its words.", "Mill or no mill, the gate needs its words. The cut stone's waiting at the quarry."],
    roof: ["The gate has its words. Words don't keep the rain off, though. I need timber from past the ford.", 'Plain gate, then. We still need a roof. Timber from past the ford.', "While the Steward carves, I'll need timber for a roof. It's past the ford."],
    larder: ["We've got a roof. Now we need food stored: roots, grain, dried fruit, before winter.", "No roof, so we'll be damp. Let's at least have full shelves before winter.", "The roof's slow going, and winter won't wait. Let's get food stored."],
    choice: ["The larder's full. There's one stone left: a bell or a ward, not both. The Warden and the Smith can't agree.", 'A lean winter, and one stone left. A bell or a ward. The Warden and the Smith are already arguing.', 'Keep gathering if you can. The last stone can be a bell or a ward. Carry it to one and that settles it.'],
    watchfires: ["Good, it's built. Now I want fires on the far hills, so I can see what's coming.", 'Nothing got built. Fine. I want fires on the far hills, so we see them coming.', 'While they argue about the stone, I want fires lit on the far hills.'],
    cover: ['The far fires are burning. Now the Hearth. Stay close while we put the capstone on.', "The hills are dark, so we'll listen instead. Now the Hearth. Stay close while we put the capstone on.", "Keep the fires going, but come back when you can. The capstone's ready."],
  };
  const REACT = {
    spring: { done: ['smith', 'Water for the forge. Good.'], missed: ['warden', "A trickle still fills a cup. We'll ration it."] },
    gate: { done: ['warden', "Now there's a door I can count people through."], missed: ['digger', "Open road. I've dug in worse spots."] },
    fire: { done: ['warden', 'Sparks by the river. Everyone in the valley will see those.'], missed: ['digger', 'The anvil can wait. Iron keeps.'] },
    beacon: { done: ['smith', 'Nice to see a light out there.'], missed: ['digger', "It's been dark here a long time. We'll cope."] },
    stakes: { done: ['smith', 'Now everyone knows where our ground ends.'], missed: ['digger', 'We know where our ground ends, stakes or not.'] },
    road: { done: ['smith', 'A road that sends them the wrong way. I like it.'], missed: ['warden', "They'll come straight in. I'll keep a closer eye on the gate."] },
    graves: { done: ['steward', "Bluebells in the meadow. We'll remember them."], missed: ['warden', "I counted them anyway. I won't forget."] },
    mill: { done: ['digger', "Flour. Somebody's going to bake bread."], missed: ['warden', "No mill. We'll eat what we've got."] },
    stonegate: { done: ['digger', 'Words in stone. I hope we live up to them.'], missed: ['warden', 'Plain stone. The Steward can carve it another day.'] },
    roof: { done: ['warden', "A roof. I'll sleep dry for once."], missed: ['steward', "No roof. We'll sleep under the sky a while longer."] },
    larder: { done: ['smith', 'Full sacks. I work better on a full stomach.'], missed: ['warden', 'Small portions, then. Nobody complain.'] },
    choice: { done: ['digger', "Something got built. The camp's still standing."], missed: ['smith', "No bell, no ward. I'll keep my hammer handy."] },
    watchfires: { done: ['smith', 'Fires on every hill. Let them see us from far off.'], missed: ['digger', "Dark hills. We've been in the dark before."] },
    cover: { done: ['warden', "The Hearth's covered and the camp's still standing. I checked."], missed: ['smith', 'Still open, then. Watch the heat.'] },
  };
  const LEAD = {
    gate: { near: '{S} could use help with the gate stone.', far: '{S} was out on the North Road again, measuring it for a gate.' },
    fire: { near: '{S} would like someone to guard the forge.', far: '{S} kept looking at the river bank and the coals.' },
    beacon: { near: '{S} will want oil carried up the hill.', far: '{S} was up on the hill, looking out at the dark.' },
    stakes: { near: '{S} wanted to mark the edge of the camp, with company.', far: '{S} was pacing the edge of the camp.' },
    road: { near: '{S} will be asking for lanterns along the North Road.', far: '{S} was sketching a road in the dirt.' },
    graves: { near: '{S} could use a hand in the meadow.', far: '{S} was looking out at the meadow.' },
    mill: { near: '{S} could use builders on the west plain.', far: '{S} was watching the wind on the west plain.' },
    stonegate: { near: '{S} will need the cut stone hauled to the gate.', far: '{S} was standing at the gate with a chisel.' },
    roof: { near: '{S} could use timber from past the ford.', far: '{S} was eyeing the trees past the ford.' },
    larder: { near: '{S} will be asking for food gathered from the far corners.', far: '{S} was counting sacks again.' },
    choice: { near: '{S} will want stone carried, and a choice made.', far: '{S} was down at the quarry, looking at the last stone.' },
    watchfires: { near: '{S} would like fires on the far hills.', far: '{S} kept looking at the far hills.' },
    cover: { near: '{S} will want everyone at the Hearth.', far: '{S} was standing by the Hearth, not saying much.' },
  };
  const LEAD_ANY = { near: '{S} will want a hand with the next job.', far: "{S} was looking over what's left to build." };

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
      return { id: n, timing: 'near' };   // (the quests come one after another at their givers, apart from the waves: the next is always near)
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
