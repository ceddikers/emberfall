// Voice lines: every spoken line in the game (hero barks, boss dialogue), and when each one is said.
// The audio core (audio.js, global `Sound`) calls VoiceLines.onEvent(name, data) from the game; this file decides
// whether anything is said, picks the line and its variant, and calls Sound.say(fileId, opts).
//
// FILE NAMES: a lineId (e.g. 'boss-grubnak-intro') has one or more variants. Each variant is its OWN file:
//   client/sounds/voice/<lineId>-<n>.ogg   (n from 1, in the order the texts are listed below)
// VoiceLines picks the variant itself and calls Sound.say('<lineId>-<n>', { text, ... }) with that variant's text, so
// the core plays exactly 'voice/<lineId>-<n>' (no numbering of its own). tools/audio/voice-manifest.js lists them all.
//
// A text may end with a delivery note in braces for the voice actor ('Order up! {bellowed}'); the note is never
// spoken or captioned. Priorities: enrage/death 5 > phase/intro/pull/wipe 4 > move calls 3 > taunts 2 > hero barks 1.
// No line teaches a mechanic: the bosses talk about food, children, storms and courts, never about where to stand.

const VoiceLines = (() => {
  // ------------------------------------------------------------------ speakers
  // hint: device-speech fallback (pitch 0..2, rate 0.5..2). dir: direction for whoever records the voice.
  const SPEAKERS = {
    // --- heroes
    bastion: { name: 'Bastion', color: '#5b8fd8', hint: { pitch: 1.0, rate: 1.0 },
      dir: { age: 'early twenties', accent: 'clean, neutral English, a little formal', pacing: 'even, unhurried',
        adj: 'steady, warm, resolute', ref: 'A young shield knight who has drilled for this all their life; quiet confidence, never shouts unless it matters. Androgynous voice, mid pitch.' } },
    bloodreaver: { name: 'Bloodreaver', color: '#c0353d', hint: { pitch: 0.6, rate: 1.05 },
      dir: { age: 'forties', accent: 'broad northern burr', pacing: 'loose, bursts of energy, laughs between words',
        adj: 'gravelly, wild, amused', ref: 'A huge axe-brute who enjoys every fight a little too much. Deep chest voice, a grin you can hear.' } },
    runeguard: { name: 'Runeguard', color: '#8a5cf6', hint: { pitch: 0.85, rate: 0.9 },
      dir: { age: 'mid twenties', accent: 'soft, precise, slightly archaic', pacing: 'measured, short phrases, pauses',
        adj: 'stoic, low, watchful', ref: 'A young warder who speaks as if every word were carved. Never excited; firm, quiet authority.' } },
    ranger: { name: 'Ranger', color: '#4f9a4a', hint: { pitch: 1.15, rate: 1.05 },
      dir: { age: 'late twenties', accent: 'light, rural lilt', pacing: 'quick and offhand',
        adj: 'dry, wry, cocky', ref: 'A half-elf marksman who has seen it all and is mildly unimpressed. Deadpan, one eyebrow raised.' } },
    shadowblade: { name: 'Shadowblade', color: '#7b3fa0', hint: { pitch: 0.95, rate: 0.95 },
      dir: { age: 'early twenties', accent: 'smooth city voice', pacing: 'low, close to the mic, unhurried',
        adj: 'sly, hushed, knowing', ref: 'A young assassin who half-whispers everything, as if sharing a secret. Never loud, even when fighting.' } },
    pyromancer: { name: 'Pyromancer', color: '#ff7a1a', hint: { pitch: 1.25, rate: 1.1 },
      dir: { age: 'mid twenties', accent: 'bright, theatrical', pacing: 'fast, eager, rising',
        adj: 'fiery, cocky, gleeful', ref: 'A fire mage who loves an audience and a big explosion. Confident to the point of showing off.' } },
    cleric: { name: 'Cleric', color: '#e8c15a', hint: { pitch: 0.8, rate: 0.85 },
      dir: { age: 'sixties', accent: 'warm, rounded, gentle', pacing: 'slow, calm, kind',
        adj: 'calm, kindly, assured', ref: 'An old priest of dawn with a smile in his voice; a grandfatherly baritone that never panics.' } },
    grovekeeper: { name: 'Grovekeeper', color: '#5fbf4a', hint: { pitch: 1.1, rate: 0.8 },
      dir: { age: 'eighties', accent: 'soft countryside', pacing: 'slow, meandering, a little breathy',
        adj: 'old, gentle, mischievous', ref: 'A very old druid woman, patient as a tree, who finds most things quietly funny. Calls everyone "dear".' } },
    chronomancer: { name: 'Chronomancer', color: '#3fd0d0', hint: { pitch: 1.0, rate: 0.95 },
      dir: { age: 'early thirties', accent: 'educated, clipped', pacing: 'starts and stops; trails off, then remembers',
        adj: 'dry, absent-minded, polite', ref: 'A bookish time mage who is never quite sure which moment he is in. Mild, distracted, faintly amused.' } },
    thermist: { name: 'Thermist', color: '#e0648c', hint: { pitch: 1.3, rate: 1.2 },
      dir: { age: 'early thirties', accent: 'quick scholar', pacing: 'rapid, breathless, jumps in pitch',
        adj: 'manic, delighted, twitchy', ref: 'A scientist who treats every explosion as a fascinating result. Thrilled even when it hurts.' } },
    driftblade: { name: 'Driftblade', color: '#4fd0b0', hint: { pitch: 1.0, rate: 0.95 },
      dir: { age: 'mid twenties', accent: 'easy, coastal', pacing: 'relaxed, breathy, light',
        adj: 'calm, airy, easygoing', ref: 'A wind duellist who never seems out of breath; a loose, cheerful calm, a smile in the voice.' } },
    alembist: { name: 'Alembist', color: '#d08a3a', hint: { pitch: 1.35, rate: 1.15 },
      dir: { age: 'late twenties', accent: 'bright, chatty', pacing: 'quick, a little flustered',
        adj: 'cheerful, clumsy, upbeat', ref: 'An alchemist forever one step from spilling something. Sunny, nervous laughter, never gloomy.' } },
    gorgemaw: { name: 'Gorgemaw', color: '#d0743a', hint: { pitch: 0.55, rate: 0.85 },
      dir: { age: 'fifties', accent: 'thick, simple, rustic', pacing: 'slow, few words, chewing',
        adj: 'hungry, simple, cheerful', ref: 'A huge glutton knight who thinks mostly about food. Big, round, friendly voice, a bit slow on the uptake.' } },
    oathbroker: { name: 'Oathbroker', color: '#a8a0c0', hint: { pitch: 0.9, rate: 0.95 },
      dir: { age: 'forties', accent: 'crisp, formal, cold', pacing: 'clipped, precise, no warmth',
        adj: 'cold, exact, unimpressed', ref: 'A contract-knight who reads everything as a ledger. Speaks like a notary reading a sentence.' } },
    ironpalm: { name: 'Ironpalm', color: '#f0a73a', hint: { pitch: 0.75, rate: 0.9 },
      dir: { age: 'late thirties', accent: 'quiet, plain', pacing: 'calm, breath-led, short',
        adj: 'disciplined, humble, grounded', ref: 'A barefoot monk who has taken many beatings and learned from each. Soft-spoken, steady, never boastful.' } },
    threadweaver: { name: 'Threadweaver', color: '#b89cff', hint: { pitch: 1.05, rate: 0.85 },
      dir: { age: 'fifties', accent: 'dry, quiet, homely', pacing: 'soft, unhurried, half to herself',
        adj: 'quiet, precise, motherly', ref: 'A seamstress-witch muttering over her work, a needle between her teeth. Gentle, a little wry.' } },
    gloomsworn: { name: 'Gloomsworn', color: '#7a5aa8', hint: { pitch: 0.7, rate: 0.9 },
      dir: { age: 'forties', accent: 'low, level, tired', pacing: 'slow, deliberate, hollow-voiced',
        adj: 'weary, steady, protective', ref: 'A knight who has died once already and stayed at his post. A low, even voice with something empty behind it.' } },
    marionettist: { name: 'Marionettist', color: '#c84a8c', hint: { pitch: 1.2, rate: 0.9 },
      dir: { age: 'ageless, young', accent: 'stagey, sing-song', pacing: 'theatrical, drawn out, sudden quiet',
        adj: 'theatrical, eerie, playful', ref: 'A puppeteer who speaks for two: themself and the Doll. Androgynous, unsettlingly sweet, like a stage host in an empty theatre.' } },
    thresher: { name: 'Reaper', color: '#8fd8e8', hint: { pitch: 1.0, rate: 0.95 },
      dir: { age: 'thirties', accent: 'cool, precise, faintly continental', pacing: 'unhurried, measured, a pause before the word that matters',
        adj: 'composed, elegant, quietly amused', ref: 'A slim, hooded reaper with a pale mask and a graceful scythe, who keeps appointments rather than hunting. Cool and courteous, a dry wit, never cruel and never in a hurry.' } },
    // --- bosses
    grubnak: { name: 'Grubnak', boss: true, color: '#7fa650', hint: { pitch: 0.4, rate: 0.95 },
      dir: { age: 'big, middle-aged ogre', accent: 'broad, rich, a showman chef', pacing: 'loud, rolling, savouring words',
        adj: 'boastful, greasy, gleeful', ref: 'An enormous ogre chef who treats the party as ingredients and the fight as dinner service. Booming, wet, smacking his lips; a gourmand, not a brute.' } },
    skitterra: { name: 'Queen Skitterra', boss: true, color: '#9a6ac0', hint: { pitch: 1.1, rate: 0.85 },
      dir: { age: 'ageless', accent: 'soft, precise, drawn-out s sounds', pacing: 'slow, intimate, hissing',
        adj: 'hissing, maternal, cold', ref: 'A spider broodmother who speaks to her prey as she would to her children: tender, patient and utterly without pity. A breathy whisper with a hiss on the s.' } },
    volkar: { name: 'Volkar', boss: true, color: '#7aa8d0', hint: { pitch: 0.2, rate: 0.7 },
      dir: { age: 'ancient', accent: 'none: elemental, very deep', pacing: 'very slow, one or two words at a time',
        adj: 'thunderous, ancient, terse', ref: 'A storm titan who has sat on a mountain for thirty winters. Huge, resonant, every word like distant thunder. Add reverb in post if you can.' } },
    hollowking: { name: 'The Hollow King', boss: true, color: '#6ab88a', hint: { pitch: 0.5, rate: 0.8 },
      dir: { age: 'a dead king, a hundred years buried', accent: 'old, courtly, formal', pacing: 'slow, gracious, hollow',
        adj: 'hollow, courteous, grave', ref: 'A dead monarch who still holds court out of habit. Polite, faintly sad, echoing as if from inside a tomb. Never shouts; his calm is the threat.' } },
  };

  // ------------------------------------------------------------------ hero barks
  // per class: move 8, select 4, down 3, revive 3, low 3, ult 3, victory 2. chance = move-bark chance (0.12-0.18).
  const HEROES = {
    bastion: { chance: 0.15,
      move: ['Holding the line there.', 'Shield first. Moving.', "I'll take that ground.", 'Steady. Going.', 'Where you need me.', 'Advancing.', 'Covering that flank.', 'On your word.'],
      select: ["Shield's up. Orders?", 'Bastion, standing ready.', "I'm with you.", "Say where, and I'll hold it."],
      down: ['The line... breaks...', 'Forgive me...', 'Hold... without me...'],
      revive: ["Back on my feet. Shield up.", 'The line holds again.', "Thank you. I'm here."],
      low: ["I'm bending, not broken!", 'Heal me, quickly!', "Shield's cracking!"],
      ult: ['Last Bastion!', 'Behind me, all of you!', 'Nothing passes!'],
      victory: ['The line held. Well fought.', 'Rest now. We earned it.'] },
    bloodreaver: { chance: 0.18,
      move: ['Ha! Lead on!', 'Axe is coming.', 'Smells like a fight.', 'I go where the blood is.', 'Heh. Faster.', 'Out of my way.', 'Stomping over.', 'Aye, aye, aye. {laughing}'],
      select: ['Point me at something.', "What's bleeding today?", 'Ha! You called?', 'The axe is thirsty.'],
      down: ['Hah... not... yet...', 'Too much blood... mine...', 'Ugh. Good hit. {grudging laugh}'],
      revive: ["Ha! Can't kill me!", 'Up again. Again!', 'That one tickled.'],
      low: ['Now I am angry!', "More blood! Mine's running out!", 'Ha! Getting close now!'],
      ult: ['Crimson Eclipse!', 'Drink deep!', 'Red sky! Red sky! {roared}'],
      victory: ["Ha! Who's next?", 'Good blood. Good day.'] },
    runeguard: { chance: 0.12,
      move: ['Understood.', 'The runes agree.', 'Proceeding.', "I'll ward it.", 'As it is written.', 'Taking position.', 'Quietly, then.', 'The stones follow.'],
      select: ['Runeguard. Listening.', 'The wards are set.', 'Speak.', 'The stones are quiet. For now.'],
      down: ['The ward... failed...', 'The runes... go dark...', 'Not yet... written...'],
      revive: ['The wards wake.', 'I return.', 'The stones remember me.'],
      low: ['My wards are thinning.', 'I need mending.', 'The runes are failing.'],
      ult: ['Runic Cataclysm!', 'Every rune, break!', 'Let the stones speak!'],
      victory: ['It is written. It is done.', 'The wards held.'] },
    ranger: { chance: 0.15,
      move: ['Fine. Scenic route.', 'Moving. Try to keep up.', "Wind's in my favour.", 'Better angle over there.', 'If I must.', "Quiver's full. Going.", 'Light on my feet.', 'Sure. Why not.'],
      select: ["Yes, I'm still here.", 'Need something shot?', 'Ranger. Bored. Ready.', 'One arrow, or several?'],
      down: ["Didn't see that one...", "Well... that's embarrassing...", 'Missed... my shot...'],
      revive: ['Right. Where was I?', "Thanks. Let's pretend that never happened.", 'Back. Eyes up.'],
      low: ["I'd like a healer. Now.", 'Getting a little thin here!', 'Not my finest moment!'],
      ult: ['Starfall Volley!', 'Look up!', "Every arrow I've got!"],
      victory: ['Clean shots. Mostly mine.', 'Well. That went better than planned.'] },
    shadowblade: { chance: 0.12,
      move: ['Into the dark.', 'Unseen.', "They won't hear me.", 'Quietly.', 'Already there.', 'A shadow moves.', 'Hm. Fine.', 'Softly now.'],
      select: ['You saw me? Pity.', 'Who needs to vanish?', "Shh. I'm working.", 'Name the throat.'],
      down: ["Should've... stayed hidden...", 'Caught... in the light...', 'Heh... sloppy...'],
      revive: ['Out of the grave. Again.', 'No one saw that.', 'Back to the shadows.'],
      low: ["I'm bleeding out here.", 'Too close. Too close.', 'A mend. Quietly.'],
      ult: ['Thousand Cuts. {hissed, not shouted}', "Don't blink.", "You're already cut."],
      victory: ['Clean. Quiet. Done.', 'It never saw me.'] },
    pyromancer: { chance: 0.18,
      move: ["Oh, I'm coming!", 'Make way for the fire!', 'Hot on your heels.', 'Mind the hat!', 'Burning bright. Moving.', 'Sparks follow me.', 'Keep it warm for me.', "Flame's still lit."],
      select: ['Something need burning?', 'You rang? I sparked.', 'Pyromancer. Obviously.', "Point. I'll ignite."],
      down: ['My fire... went out...', 'Ugh... embers...', 'Not... like this...'],
      revive: ['The flame comes back!', 'Rekindled. Thanks.', "Oh, now I'm furious."],
      low: ["I'm getting singed here!", 'Heal me before I sputter out!', 'Smoke! I need help!'],
      ult: ['Phoenix Dive!', 'Rise from the ash!', 'Burn with me!'],
      victory: ['Look at it smoulder.', 'Told you. Fire solves things.'] },
    cleric: { chance: 0.14,
      move: ['Dawn goes with you.', 'Gently. I follow.', "I'll be near.", 'Walk in the light.', 'As the sun rises.', "Patience. I'm coming.", 'Of course, friend.', 'The light leads.'],
      select: ['Peace. How can I help?', "I'm here, child.", 'The dawn is patient. Are you?', "Speak. I'm listening."],
      down: ['Into the dark... I go...', 'The light... dims...', 'Carry on... without me...'],
      revive: ['Morning, again. Thank you.', 'The light returns.', 'Not my dusk yet.'],
      low: ['Even I need mending.', 'My light is guttering.', 'Help me stand.'],
      ult: ['Dawn Breaks!', 'Let there be morning!', 'Rise, all of you!'],
      victory: ['Rest. The night is over.', 'Give thanks. We stand.'] },
    grovekeeper: { chance: 0.14,
      move: ['Slowly, slowly.', 'Roots follow, dear.', 'These old legs, then.', 'As the moss grows.', "I'll wander over.", 'Mm. The path bends.', 'Yes, little sapling.', 'Leaves on the wind.'],
      select: ['Hello, little sprout.', 'Old as oaks. Still ready.', 'Mm? Something growing?', 'The grove is listening.'],
      down: ['Back... to the soil...', 'Ah... a long winter...', 'The roots... take me...'],
      revive: ['Spring again. How lovely.', 'The green returns, dear.', "Oh, I wasn't done."],
      low: ['My bark is splitting.', 'Even oaks fall, dear.', 'A little sap, please.'],
      ult: ['World Tree!', 'Grow, old friend!', 'Shelter beneath me!'],
      victory: ['There. Let it compost. {chuckling}', 'Seasons turn. We remain.'] },
    chronomancer: { chance: 0.15,
      move: ['Ah. Yes. Moving.', "I was already there. Later.", 'Now. Or shortly.', 'Hm? Right, going.', 'In due course.', 'Time enough.', 'Where was I going? Ah.', 'Tick, tock. Moving.'],
      select: ['Is it now already?', 'Chronomancer. Probably.', 'Have we met? Ah, yes.', "I've a moment. Several."],
      down: ["I've... seen this before...", 'Ran out... of time...', 'Should have... rewound...'],
      revive: ['Ah. That again.', 'Back where I was. Roughly.', 'Thank you. Again, I think.'],
      low: ['My hourglass is low.', 'Running out of sand!', 'Ah. This bit is bad.'],
      ult: ['Time Reversal!', 'Again, from the top!', 'Back! All of it, back!'],
      victory: ['Just as I remembered it.', 'Splendid. Shall we do it again? No.'] },
    thermist: { chance: 0.18,
      move: ['Yes! New readings!', "The data's over there!", 'Ooh, warmer!', 'Hypothesis: over there!', 'Moving! Mind the frost.', 'Recalibrating position!', 'Hot, cold, going!', 'For the experiment!'],
      select: ['Fascinating! You again!', "What's the temperature?", 'Ready! Mostly stable!', 'Hold still. I am measuring you.'],
      down: ['Wrong... reading...', 'Too cold... too hot...', 'Note... for later...'],
      revive: ['Ha! Survived! Write that down!', 'Back to the experiment!', 'Revived! Fascinating!'],
      low: ['Critical! Critical!', 'Readings falling fast!', "I'm overheating!"],
      ult: ['Supernova!', 'Every degree at once!', 'Burn and freeze!'],
      victory: ['Results conclusive!', 'Ha! Magnificent data!'] },
    driftblade: { chance: 0.14,
      move: ['With the wind.', 'Light feet.', 'Drifting.', 'The breeze says yes.', 'Easy. Going.', 'Gone like a gust.', 'Mm. That way.', 'Following the draught.'],
      select: ["Breathe. I'm ready.", "Wind's calm. Are you?", 'Driftblade, at ease.', 'Point the sabre.'],
      down: ['The wind... stops...', 'Ha... too slow...', 'Becalmed...'],
      revive: ['The wind picks up.', 'Breath again. Good.', 'Back in the current.'],
      low: ['Short of breath!', "I'm faltering.", 'Need a mend, quickly.'],
      ult: ['Eye of the Gale!', 'Ride the storm!', 'Be still, and fall.'],
      victory: ['A good duel.', 'The wind settles.'] },
    alembist: { chance: 0.18,
      move: ['Coming! Mind the vials!', 'Oops. Going!', 'Clinking over!', 'Right behind you! Ish.', "Don't jostle me!", 'Off I bubble!', 'Carefully, carefully!', 'On my way! Probably.'],
      select: ['Ooh! Need a potion?', "Don't shake me, please.", 'Alembist! Mostly intact!', "This one's safe. I think."],
      down: ['Wrong... bottle...', "Oh... that's not good...", "Should've... labelled it..."],
      revive: ['Ha! Better than any tonic!', "I'm fine! Mostly!", 'Back! Nothing spilled!'],
      low: ["Ow! Where's my red one?", "I'm leaking! Help!", 'Not good! Not good!'],
      ult: ['Magnum Opus!', 'My masterpiece!', 'Everything, all at once!'],
      victory: ['Nobody exploded! Lovely!', 'Tea, anyone? Real tea.'] },
    gorgemaw: { chance: 0.16,
      move: ['Food that way?', 'Mm. Walking.', 'Big steps.', 'Gorgemaw goes.', 'Hungry. Going.', 'Is it lunch there?', 'Chomp, chomp. Coming.', 'Belly first.'],
      select: ['Is it dinnertime?', 'Hungry. {a long, sad rumble}', 'Gorgemaw here. Food?', 'Mm? Snack?'],
      down: ['Too... full...', 'No... more... seconds...', 'Belly... hurts...'],
      revive: ['Hungry again!', 'Up! Still hungry!', 'Mm. More, please.'],
      low: ['Ow! Tummy!', 'Need food! Healing food!', 'Hurts! Hurts!'],
      ult: ['Maw of Ruin!', 'Open wide!', 'All of it! Mine!'],
      victory: ['Was it tasty? Yes.', 'Leftovers?'] },
    oathbroker: { chance: 0.12,
      move: ['Terms accepted.', 'Noted. Proceeding.', 'Per the agreement.', 'Fine. It goes on your bill.', 'As contracted.', "I'll collect there.", 'Moving. Recorded.', 'Signed. Moving.'],
      select: ['State your terms.', 'Oathbroker. Your account?', 'You owe me. Go on.', "I'm listening. It's billed."],
      down: ['Contract... void...', 'Debt... unpaid...', 'Default...'],
      revive: ['Reinstated.', 'The terms continue.', 'Your debt grows. Thank you.'],
      low: ["My ledger's in the red.", 'Collateral running low.', 'Settle my account. Now.'],
      ult: ['Final Reckoning.', 'All debts come due.', 'Pay. In full.'],
      victory: ['Account closed.', 'Paid in full.'] },
    ironpalm: { chance: 0.12,
      move: ['I go.', 'With humility.', 'Step by step.', 'As the river moves.', 'Breath, then step.', 'I will walk there.', 'Yes, teacher.', 'Steady feet.'],
      select: ['I am ready to learn.', 'My breath is steady.', 'Ironpalm. At your service.', 'Speak. I am still.'],
      down: ['I... yield...', 'The lesson... is learned...', 'Breath... leaving...'],
      revive: ['Rise. Again.', 'Fall seven times. Rise eight.', 'I am grateful.'],
      low: ['Breathe. Endure.', 'The body falters.', 'I need aid.'],
      ult: ['Hundred Palms!', 'Strike with all of me!', 'One hundred strikes!'],
      victory: ['Well practised.', 'A good lesson. Thank you.'] },
    threadweaver: { chance: 0.13,
      move: ['Mm. A stitch there.', 'The thread follows.', 'Quietly, dear.', "Needle's ready.", 'Pulling through.', 'Hem and go.', "I'll mend the way.", 'Softly, softly.'],
      select: ['Torn something, dear?', "Needle's threaded.", "Quiet now. I'm counting stitches.", 'What needs mending?'],
      down: ['The thread... snaps...', 'Unravelling...', 'Loose... ends...'],
      revive: ['Stitched back up.', 'Knotted, and whole.', 'Thank you. Neatly done.'],
      low: ["I'm fraying.", 'Frayed at the seams.', 'Pull me together, quick.'],
      ult: ['Grand Loom.', 'All threads, together.', 'Weave. {low, commanding}'],
      victory: ['Neatly finished.', 'Snip. Done.'] },
    marionettist: { chance: 0.16,
      move: ['Exit, stage left.', 'The Doll insists.', 'We dance there.', 'Strings, follow.', 'A new scene.', 'Our cue, my dear.', 'Tiptoe, tiptoe.', 'Places, everyone.'],
      select: ['Applause? For us?', 'The Doll is watching you.', 'Shall we perform?', 'She says hello. {a different, tiny voice}'],
      down: ['The curtain... falls...', 'Cut... the strings...', 'No... encore...'],
      revive: ['Act two!', 'The show goes on.', 'Strings, tighten. We rise.'],
      low: ['The Doll is cracking!', 'Our act is failing!', 'Mend us! Both of us!'],
      ult: ['Curtain Call!', 'Take a bow!', 'The final act!'],
      victory: ['Bravo. Bravo. {slow clap in the voice}', 'And... scene.'] },
    // Gloomsworn: a knight who has already died once and stayed at his post; death is a debt he is paying, slowly
    gloomsworn: { chance: 0.13,
      move: ['I walk the line.', 'The watch moves.', 'Behind me. Quickly.', 'I have been here before.', 'Still standing. Going.', 'Bring it to me.', 'I will not be long.', 'The debt can wait.'],
      select: ['The watch is kept.', 'Gloomsworn. I hold.', 'Who needs guarding?', 'I died once. It did not take.'],
      down: ['The debt... is paid...', 'Relieve... the watch...', 'Again... so soon...'],
      revive: ['Not yet. Not yet.', 'The dark gave me back.', 'I am still owed a post.'],
      low: ['Hollow! Heal me, now!', 'The debt is rising!', 'Heal me! I am running out of self!'],
      ult: ['Eclipse of the Vigil.', 'Let the dark pour out.', 'Stand in my shadow!'],
      victory: ['The watch is relieved.', 'Dawn. I remember dawn.'] },
    // Reaper (id thresher): a hooded, elegant reaper who keeps appointments; cool, composed, darkly amused, never in a hurry
    thresher: { chance: 0.13,
      move: ['Mind the mist.', 'Gliding.', 'Lightly now.', 'In time.', 'The next step.', 'Quietly.', 'Just passing.', 'Round the edge.'],
      select: ['Reaper. Yes?', 'Someone is due.', 'I keep a long list.', 'The scythe is ready.'],
      down: ['An early... appointment...', 'The list... was wrong...', 'Cold... and quiet...'],
      revive: ['Not yet, it seems.', 'Postponed.', 'My name was not called.'],
      low: ['I am fading!', 'Mend me, I am thinning!', 'The mist takes me!'],
      ult: ['Open the gate.', 'All at once, then!', 'The toll is called!'],
      victory: ['Every name, in its hour.', 'Another appointment kept.'] },

  };

  // ------------------------------------------------------------------ boss dialogue
  // phase[n]: said when phase n starts (n from 2; phase 1 is the pull). moves[slug]: { texts, chance, aliases }.
  // taunt[1..3]: at 75 / 50 / 25% health (boss-hp events), or once per phase when no health reaches us.
  // calls: the boss's own cooldown between move calls and taunts (seconds).
  const BOSSES = {
    grubnak: { calls: 22, phases: ['Appetiser', 'Mains', 'Flare-Up', 'Second Sitting', 'Dessert'],
      intro: ["Customers! In my kitchen! Sit, sit. You're the special. {booming, delighted}",
        'Ah, fresh deliveries. Somebody fetch the salt.',
        "Grubnak's kitchen is open. And you are on the menu."],
      pull: ["Kitchen's open!", 'Tie your aprons, morsels!'],
      phase: {
        2: ["Appetiser's done. Bring out the mains!", 'Big plates now! Big plates!'],
        3: ['Too cold in here. Feed the stove! {roaring with laughter}'],
        4: ['Second sitting! Nobody leaves my table!'],
        5: ['Dessert! I saved room for you!', 'Something sweet to finish. You!'],
      },
      moves: {
        'order-up': { name: 'Order Up!', texts: ['Order up! {bellowed}', 'Plates! Hot plates!'], chance: 0.8 },
        'tenderize': { texts: ['Tenderize!', 'Hold still, cutlet!'], chance: 0.6 },
        'mince': { texts: ['Mince!', 'Nice and fine!'], chance: 0.45, aliases: ['double-chop', 'chop-chop'] },
        'meat-toss': { texts: ['Catch!', 'Portions, portions!'], chance: 0.4 },
        'family-meal': { texts: ['Family meal!', "Grandmother's recipe!"], chance: 0.5 },
        'gut-blast': { texts: ['Pardon me! {a huge belch that turns into a roar}'], chance: 0.6 },
        'flambe': { name: 'Flambé', texts: ['Flambé!', 'A splash of brandy!'], chance: 0.7 },
        'rolling-meatballs': { texts: ['Meatballs!', 'Fresh off the board!'], chance: 0.6 },
        'gorge': { texts: ['Mmm. Seconds. {chewing}', 'More! More!'], chance: 0.4 },
        'last-orders': { texts: ['Last orders!'], chance: 1 },
      },
      taunt: { 1: ['Tough meat. Needs longer in the pot!'], 2: ['You bruise my produce!'], 3: ['My best knives, wasted on you!'] },
      enrage: ["Last call! The kitchen's closing, with you in it!"],
      death: ['My... soufflé... {collapsing}', 'Compliments... to... the chef...'],
      wipe: ["Delicious. Who's next? {smacking lips}", 'Back to the larder with you.', 'Needed more salt.'],
    },
    skitterra: { calls: 24, phases: ['The Web', 'The Dark Between', 'The Brood', 'The Collapse'],
      intro: ['Hush, little ones. Mother has guests. {whispered, tender}',
        'Ssso many soft things, wandering into my silk.',
        'Come closer. My children are hungry.'],
      pull: ['Feed them.', 'Come to Mother.'],
      phase: {
        2: ['Close your eyes, children. Mother hunts.'],
        3: ['Wake, my darlings. Supper is here.', 'Hatch. Hatch for Mother.'],
        4: ['You tear my web? Then fall with it.'],
      },
      moves: {
        'silk-wrap': { texts: ['Hold ssstill.', 'There, there.'], chance: 0.6 },
        'eightfold-lunge': { texts: ['Eight for you.', 'Dance, little fly.'], chance: 0.5 },
        'venom-spit': { texts: ['Ssso far away?'], chance: 0.4 },
        'brood': { texts: ['Wake, children.', 'Hatch.'], chance: 0.6 },
        'into-the-dark': { texts: ['Hush now.'], chance: 0.9 },
        'silk-lines': { texts: ['Tied together. How sweet.'], chance: 0.5 },
        'venom-mist': { texts: ['Breathe deep, little ones.'], chance: 0.4 },
        'the-swarm': { texts: ['All of you. Eat.'], chance: 0.8 },
        'fang-rush': { texts: ['Run. Mother likes it when they run.'], chance: 0.5 },
      },
      taunt: { 1: ['You bite. Like my firstborn did.'], 2: ['You break my lovely threads.'], 3: ['Mother is... displeased.'] },
      enrage: ['Enough. Mother will eat now.'],
      death: ['My children... run... {fading hiss}', 'Who will... sing to them...'],
      wipe: ['Wrap them up, darlings. Slowly.', 'Sleep in the silk.', 'Ssso easily caught.'],
    },
    volkar: { calls: 30, phases: ['The Front', 'The Eye', 'Back of the Storm', 'Heavens Fall'],
      intro: ['Small things. On my mountain. {slow, distant thunder}',
        'Thirty winters I have sat on this stone. Leave.',
        'Climb no further.'],
      pull: ['Then break.'],
      phase: {
        2: ['Be still.'],
        3: ['The storm returns.'],
        4: ['Now. The sky.'],
      },
      moves: {
        'titan-fist': { texts: ['Kneel.'], chance: 0.6 },
        'thunderclap': { texts: ['Hear me.'], chance: 0.4 },
        'gale-slam': { texts: ['Away.'], chance: 0.6 },
        'lightning-rods': { texts: ['The bolt seeks.'], chance: 0.5, aliases: ['grounding-rods'] },
        'polarity-surge': { texts: ['Feel the charge.'], chance: 0.5 },
        'storm-walls': { texts: ['Wind. Rise.'], chance: 0.5 },
        'avalanche': { texts: ['The mountain moves.'], chance: 0.7 },
        'heavens-fall': { texts: ['Fall.'], chance: 0.35 },
      },
      taunt: { 1: ['Ants. Biting.'], 2: ['You... endure.'], 3: ['The storm... weakens? No.'] },
      enrage: ['The sky breaks. {the loudest line he has}'],
      death: ['The storm... passes...', 'Silence. At last.'],
      wipe: ['Dust.', 'The mountain remains.', 'Gone. As all things go.'],
    },
    hollowking: { calls: 24, phases: ['The Summons', 'Testimony', 'Court of Bones', 'The Verdict', 'Judgement', 'The Long Night'],
      intro: ['Visitors. It has been so long since the court received anyone.',
        'Kneel, and be welcome in my barrow.',
        'You have come a long way down the road. Sit. Stay.'],
      pull: ['Court is in session.'],
      phase: {
        2: ['Rise, my guard. Bear witness.'],
        3: ['Let the court assemble.'],
        4: ['The court has heard enough.'],
        5: ['Hear now your judgement.'],
        6: ['Let the lanterns go out.', 'The long night falls. As it fell for me.'],
      },
      moves: {
        'royal-doom': { texts: ['I sentence you.', 'Royal doom. {quietly, almost sorry}'], chance: 0.7 },
        'royal-gaze': { texts: ['You stand before a king.'], chance: 0.5 },
        'grave-cleave': { texts: ['Bow your head.'], chance: 0.5 },
        'echo-knights': { texts: ['My guard remembers.'], chance: 0.7 },
        'barrow-bells': { texts: ['The bells. Do you hear them?'], chance: 0.5 },
        'barrow-knell': { texts: ['Mourn with me.'], chance: 0.35 },
        'coffin-lids': { texts: ['Wake, old friends.'], chance: 0.5 },
        'royal-decree': { texts: ['By royal decree.'], chance: 0.6 },
        'funeral-march': { texts: ['March, my dead.'], chance: 0.6 },
      },
      taunt: { 1: ['You strike at a crown. Bold.'], 2: ['I have been dead a hundred years. I am patient.'], 3: ['The crown... grows heavy.'] },
      enrage: ['The moon sets. Sleep with me.'],
      death: ['At last... I may lie down.', 'Bury me... properly, this time.'],
      wipe: ['Rest here. The court has room.', 'Another banner for my hall.', 'How courteous of you to stay.'],
    },
  };

  // ------------------------------------------------------------------ rules per kind
  // chance / cooldown (s) / cooldownKey ('{hero}' and '{boss}' are filled in) / priority / default delivery note
  const HERO_KINDS = {
    move:    { cooldown: 9,   key: 'hero-{hero}-bark', priority: 1, note: 'brisk acknowledgement' },
    select:  { chance: 0.6, cooldown: 6, key: 'hero-{hero}-select', priority: 1, note: 'attentive, in character' },
    down:    { chance: 1,   cooldown: 2,   key: 'hero-{hero}-down', priority: 1, note: 'pained, fading out' },
    revive:  { chance: 1,   cooldown: 2,   key: 'hero-{hero}-revive', priority: 1, note: 'a breath in, relieved' },
    low:     { chance: 1,   cooldown: 12,  key: 'hero-{hero}-low', priority: 1, note: 'urgent, strained' },
    ult:     { chance: 1,   cooldown: 2,   key: 'hero-{hero}-ult', priority: 1, note: 'shouted, full voice' },
    victory: { chance: 1,   cooldown: 10,  key: 'hero-{hero}-victory', priority: 1, note: 'satisfied, a little tired' },
  };
  const BOSS_KINDS = {
    intro:  { chance: 1, cooldown: 20, priority: 4, note: 'unhurried, in full character' },
    pull:   { chance: 1, cooldown: 10, priority: 4, note: 'a short call to begin' },
    phase:  { chance: 1, cooldown: 4,  priority: 4, note: 'a turn in the fight; more intent' },
    move:   { priority: 3, note: 'a short shout with the attack' },
    taunt:  { chance: 1, priority: 2, note: 'mocking, between blows' },
    enrage: { chance: 1, cooldown: 30, priority: 5, note: 'final, overwhelming' },
    death:  { chance: 1, cooldown: 30, priority: 5, note: 'dying, trailing off' },
    wipe:   { chance: 1, cooldown: 10, priority: 4, note: 'gloating, satisfied' },
  };
  const HERO_ORDER = ['move', 'select', 'down', 'revive', 'low', 'ult', 'victory'];
  const MIN_GAP_AFTER_PULL = 4;   // no move call or taunt in the first seconds of a pull

  // ------------------------------------------------------------------ the table
  const splitNote = s => {
    const m = /\s*\{([^}]*)\}\s*$/.exec(s);
    return m ? { text: s.slice(0, m.index).trim(), note: m[1].trim() } : { text: s.trim(), note: '' };
  };
  const slug = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const TABLE = {};   // lineId -> entry
  const add = (id, spk, kind, rules, texts, extra) => {
    const parts = texts.map(splitNote);
    const sp = SPEAKERS[spk];
    TABLE[id] = Object.assign({
      id, speakerId: spk, speaker: sp.name, boss: !!sp.boss, kind,
      texts: parts.map(p => p.text), notes: parts.map(p => p.note || rules.note || ''),
      chance: rules.chance == null ? 1 : rules.chance, cooldown: rules.cooldown || 0,
      cooldownKey: (rules.key || id).replace('{hero}', spk).replace('{boss}', spk),
      priority: rules.priority, voiceHint: Object.assign({}, sp.hint),
    }, extra || {});
  };
  for (const cid of Object.keys(HEROES)) {
    const h = HEROES[cid];
    for (const k of HERO_ORDER) {
      const r = Object.assign({}, HERO_KINDS[k]);
      if (k === 'move') r.chance = h.chance;
      add(`hero-${cid}-${k}`, cid, k, r, h[k]);
    }
  }
  const MOVE_INDEX = {};   // bossId -> { slug or alias -> lineId }
  for (const bid of Object.keys(BOSSES)) {
    const b = BOSSES[bid];
    const K = BOSS_KINDS;
    add(`boss-${bid}-intro`, bid, 'intro', K.intro, b.intro);
    add(`boss-${bid}-pull`, bid, 'pull', K.pull, b.pull);
    for (const n of Object.keys(b.phase)) add(`boss-${bid}-phase${n}`, bid, 'phase', K.phase, b.phase[n], { phase: +n, phaseName: (b.phases || [])[n - 1] || '' });
    MOVE_INDEX[bid] = {};
    for (const s of Object.keys(b.moves)) {
      const m = b.moves[s];
      const id = `boss-${bid}-move-${s}`;
      add(id, bid, 'move', Object.assign({}, K.move, { chance: m.chance, cooldown: b.calls, key: `boss-${bid}-calls` }), m.texts, { move: s, moveName: m.name || s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') });
      MOVE_INDEX[bid][s] = id;
      for (const a of m.aliases || []) MOVE_INDEX[bid][a] = id;
    }
    for (const n of Object.keys(b.taunt)) {
      add(`boss-${bid}-taunt${n}`, bid, 'taunt', Object.assign({}, K.taunt, { cooldown: b.calls, key: `boss-${bid}-calls` }), b.taunt[n], { taunt: +n });
    }
    add(`boss-${bid}-enrage`, bid, 'enrage', K.enrage, b.enrage);
    add(`boss-${bid}-death`, bid, 'death', K.death, b.death);
    add(`boss-${bid}-wipe`, bid, 'wipe', K.wipe, b.wipe);
  }

  // every voice file: { file: '<lineId>-<n>', lineId, n, speaker, text, note }
  function files() {
    const out = [];
    for (const id of Object.keys(TABLE)) {
      const e = TABLE[id];
      e.texts.forEach((t, i) => out.push({ file: `${id}-${i + 1}`, lineId: id, n: i + 1, speakerId: e.speakerId, speaker: e.speaker, kind: e.kind, text: t, note: e.notes[i] }));
    }
    return out;
  }

  // ------------------------------------------------------------------ runtime state
  const cfg = {
    now: () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000,
    rng: Math.random,
    later: (fn, s) => (typeof setTimeout === 'function' ? setTimeout(fn, Math.max(0, s) * 1000) : fn()),
  };
  const st = {
    hero: null,            // the local hero's class
    cd: {},                // cooldownKey -> time it frees
    lastVar: {},           // lineId -> last variant index
    bossUntil: 0,          // a boss line is (probably) playing until then
    bossPri: 0,            // ...at this priority
    heroUntil: 0,
    countdownUntil: 0,
    boss: null, pullAt: -1e9, phase: 1, phaseAt: -1e9,
    hpSeen: false, taunted: {}, tauntPhase: {},
  };

  // spoken length estimate (s): ~2.6 words a second at rate 1, plus a breath
  function duration(text, hint) {
    const words = String(text).split(/\s+/).filter(Boolean).length;
    const rate = (hint && hint.rate) || 1;
    return Math.max(1.1, words / 2.6 / rate + 0.5 + (String(text).match(/\.\.\./g) || []).length * 0.35);
  }
  function pick(e) {
    const n = e.texts.length;
    if (n <= 1) return 0;
    let i = Math.floor(cfg.rng() * n) % n;
    if (i === st.lastVar[e.id]) i = (i + 1 + Math.floor(cfg.rng() * (n - 1))) % n;
    return i;
  }
  function soundOn(key) {
    try { return typeof Sound !== 'undefined' && Sound && typeof Sound.get === 'function' ? Sound.get(key) : undefined; } catch (e) { return undefined; }
  }

  // play a line now (checks already passed). Returns the file id said, or null.
  function speak(e, opts) {
    const t = cfg.now();
    const i = opts && opts.variant != null ? opts.variant : pick(e);
    const text = e.texts[i];
    const fileId = `${e.id}-${i + 1}`;
    const secs = duration(text, e.voiceHint);
    st.lastVar[e.id] = i;
    if (e.cooldown) st.cd[e.cooldownKey] = t + e.cooldown;
    if (e.boss) { st.bossUntil = t + secs; st.bossPri = e.priority; } else st.heroUntil = t + secs;
    const sayOpts = {
      speaker: e.speaker, text, chance: 1, cooldownKey: e.cooldownKey, cooldown: 0, caption: true,
      voiceHint: e.voiceHint, priority: e.priority, boss: e.boss, lineId: e.id, variant: i + 1,
      file: 'voice/' + fileId, seconds: secs, color: (SPEAKERS[e.speakerId] || {}).color,
    };
    try {
      if (typeof Sound !== 'undefined' && Sound && typeof Sound.say === 'function') Sound.say(fileId, sayOpts);
      else if (typeof Captions !== 'undefined' && Captions && Captions.show) Captions.show(e.speaker, text, secs);
    } catch (err) { /* a voice line never breaks the game */ }
    return fileId;
  }

  // the gate every line goes through. force: skip the chance roll.
  function trySay(id, opts) {
    const e = TABLE[id];
    if (!e) return null;
    const t = cfg.now();
    if (e.cooldown && (st.cd[e.cooldownKey] || 0) > t) return null;
    if (e.boss) {
      if (st.bossUntil > t && e.priority <= st.bossPri && e.priority < 5) return null;   // never over a line of equal or higher weight
    } else {
      if (st.bossUntil > t) return null;           // a hero never talks over a boss
      if (st.countdownUntil > t) return null;      // nor through the pull countdown
      if (st.heroUntil > t && e.kind === 'move') return null;
    }
    const chance = opts && opts.chance != null ? opts.chance : e.chance;
    if (!(opts && opts.force) && chance < 1 && !(cfg.rng() < chance)) return null;
    return speak(e, opts);
  }

  // ------------------------------------------------------------------ events
  const str = v => (typeof v === 'string' || typeof v === 'number') ? String(v) : '';
  const bossOf = d => { const b = slug(str(d && (d.bossId || d.boss || d.id)) || st.boss || ''); return BOSSES[b] ? b : (b === 'hollow-king' ? 'hollowking' : null); };
  function heroOf(d) {
    if (d && d.local === false) return null;   // only the local hero speaks
    const c = slug(str(d && (d.classId || d.cls || d.hero)));
    if (c && HEROES[c]) { st.hero = c; return c; }
    return st.hero && HEROES[st.hero] ? st.hero : null;
  }
  function resetPull(bid) {
    st.boss = bid || st.boss; st.phase = 1; st.phaseAt = cfg.now(); st.hpSeen = false; st.taunted = {}; st.tauntPhase = {};
  }
  function hpPct(d) {
    if (!d) return null;
    let p = d.pct != null ? +d.pct : d.hpPct != null ? +d.hpPct : (d.hp != null && d.maxHp) ? d.hp / d.maxHp : null;
    if (p == null || !isFinite(p)) return null;
    if (p > 1.0001) p /= 100;
    return p;
  }
  const TAUNT_AT = { 1: 0.75, 2: 0.5, 3: 0.25 };
  function checkHp(bid, d) {
    const p = hpPct(d);
    if (p == null || !bid) return;
    st.hpSeen = true;
    for (const n of [3, 2, 1]) {          // the deepest mark crossed, said once
      if (p <= TAUNT_AT[n] && !st.taunted[n]) {
        for (let k = 1; k <= n; k++) st.taunted[k] = true;
        if (cfg.now() - st.pullAt >= MIN_GAP_AFTER_PULL) trySay(`boss-${bid}-taunt${n}`);
        return;
      }
    }
  }

  function onEvent(name, data) {
    try { return handle(String(name || ''), data && typeof data === 'object' ? data : {}); } catch (e) { return null; }
  }
  function handle(name, d) {
    const t = cfg.now();
    switch (name) {
      // ---- bosses
      case 'boss-intro': { const b = bossOf(d); if (!b) return null; st.boss = b; return trySay(`boss-${b}-intro`); }
      case 'countdown': { const s = +d.seconds || +d.secs || 0; st.countdownUntil = s > 0 ? t + s : 0; return null; }
      case 'pull': {
        const b = bossOf(d); st.countdownUntil = 0;
        if (!b) return null;
        resetPull(b); st.pullAt = t;
        return trySay(`boss-${b}-pull`);
      }
      case 'boss-phase': {
        const b = bossOf(d); const n = Math.floor(+d.n || +d.phase || 0);
        if (!b || !(n > 0)) return null;
        st.boss = b; st.phase = n; st.phaseAt = t;
        if (n <= 1) return null;          // phase 1 is the pull
        return trySay(`boss-${b}-phase${n}`);
      }
      case 'boss-hp': { const b = bossOf(d); checkHp(b, d); return null; }
      case 'boss-cast': {
        const b = bossOf(d); if (!b) return null;
        st.boss = b;
        checkHp(b, d);
        if (t - st.pullAt < MIN_GAP_AFTER_PULL) return null;
        // no health from the core this pull: a taunt stands in for one move call per phase, past the first 20 s of it
        const tn = Math.min(3, st.phase - 1);
        if (!st.hpSeen && tn >= 1 && !st.tauntPhase[st.phase] && t - st.phaseAt > 20 && cfg.rng() < 0.5) {
          const said = trySay(`boss-${b}-taunt${tn}`);
          if (said) { st.tauntPhase[st.phase] = true; return said; }
        }
        const mv = d.move && typeof d.move === 'object' ? (d.move.name || d.move.id) : (d.move || d.name);
        const id = MOVE_INDEX[b][slug(str(mv))];
        return id ? trySay(id) : null;
      }
      case 'boss-enrage': { const b = bossOf(d); return b ? trySay(`boss-${b}-enrage`) : null; }
      case 'boss-death': { const b = bossOf(d); return b ? trySay(`boss-${b}-death`) : null; }
      case 'boss-wipe': { const b = bossOf(d); st.countdownUntil = 0; return b ? trySay(`boss-${b}-wipe`) : null; }
      case 'clear': {
        const h = heroOf(d); const b = bossOf(d);
        if (b) st.boss = b;
        if (!h) return null;
        // after the boss has finished dying
        const wait = Math.max(0, st.bossUntil - t) + 0.6;
        cfg.later(() => trySay(`hero-${h}-victory`), wait);
        return null;
      }
      // ---- the local hero
      case 'hero-move': { const h = heroOf(d); return h ? trySay(`hero-${h}-move`) : null; }
      case 'hero-select': { const h = heroOf(d); return h ? trySay(`hero-${h}-select`) : null; }
      case 'hero-down': { const h = heroOf(d); return h ? trySay(`hero-${h}-down`) : null; }
      case 'hero-revive': { const h = heroOf(d); return h ? trySay(`hero-${h}-revive`) : null; }
      case 'hero-low': { const h = heroOf(d); return h ? trySay(`hero-${h}-low`) : null; }
      case 'hero-ult': { const h = heroOf(d); return h ? trySay(`hero-${h}-ult`) : null; }
      default: return null;
    }
  }

  // caption colours: Captions asks by the name shown
  function speakerStyle(name) {
    for (const k of Object.keys(SPEAKERS)) if (SPEAKERS[k].name === name || k === name) return { color: SPEAKERS[k].color, boss: !!SPEAKERS[k].boss };
    return null;
  }

  return {
    TABLE, SPEAKERS, HEROES, BOSSES, HERO_KINDS, BOSS_KINDS,
    onEvent, files, speakerStyle, duration, slug,
    setLocalHero(c) { const s = slug(str(c)); st.hero = HEROES[s] ? s : null; },
    say: (id, opts) => trySay(id, Object.assign({ force: true }, opts || {})),   // debugging / gallery use
    bossSpeaking: () => st.bossUntil > cfg.now(),
    reset() { for (const k of Object.keys(st.cd)) delete st.cd[k]; st.bossUntil = st.heroUntil = st.countdownUntil = 0; st.bossPri = 0; resetPull(null); st.pullAt = -1e9; },
    _cfg: cfg, _state: st,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VoiceLines;
