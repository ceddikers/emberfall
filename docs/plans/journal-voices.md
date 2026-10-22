# Boss journal: the voice bible

Every hero keeps a journal. When a player sees a boss move and lives through it, that hero writes one entry about it, that night, by the fire, in their own voice. There are 19 journals and eight bosses, written by several writers at once, so this page is the shared reference. Read the rules first, then the hero you're writing.

Sources for every voice: the class tagline and gameplan (`client/js/data.js`), the spec blurbs (`client/js/combat/specs.js`), the passives (`client/js/hero-guide.js`) and the trial lore (`client/js/arena/trials.js`). A voice grows out of the class's own puzzle: what the hero *does* in a fight decides what they *notice* in one.

---

## Rules for all writers

**Form**
- First person, past tense, as if written that night by the fire.
- 1 to 3 sentences, at most about 45 words. Shorter is usually better.
- One entry is about one move.

**Content**
- Every entry contains the **real, correct way to survive that move**: where to stand, when to move, who to stand with, what to break. A player who reads only the journal should be able to do it. Check the boss's own design notes (`docs/DESIGN.md`, `client/js/arena/bosses/*.js`) before you write; if the tactic is wrong, the voice doesn't matter.
- Say the tactic in character. The Gorgemaw doesn't say "stand behind the boss", it says the kitchen is safest behind the cook.
- The hero writes from their own seat in the fight (a tank about the blow on them, a healer about who was hurting), but the tactic must still be the one everyone needs. If a move only concerns one role (a blow meant for the tank), each journal says what *that* hero did about it, or what they watched the right person do.
- Write as someone who just figured it out, not as a teacher. "I learned", "next time", "it turns out" are fine; "you should" is not.

**Banned words** (they break the fiction):
debuff, buff, DPS, aggro, threat, mechanic, telegraph, HP, health bar, cooldown, proc, GCD, AoE, tankbuster, raidwide, add, phase, enrage, DoT, HoT, stack (as a noun for the marker), spread (as a game term), tank (as a role: say "our shield", "the knight", or the hero's name for them), healer is fine as a plain word but prefer something in voice, and any button, key or ability name from the hotbar.

**Plain-world words for game things** (use these or the hero's own version):

| Game term | Say it as something like |
|---|---|
| tankbuster | the heavy blow meant for whoever stood in front |
| raidwide | the blast that reached every one of us |
| cone / cleave | the sweep in front of him |
| circle around the boss | the ring of stone/fire at his feet |
| donut | the ring with the quiet middle |
| spread markers | the marks over our heads; we each needed our own patch of floor |
| stack marker | the hit we had to share by standing together |
| tower | a circle that wanted someone standing in it |
| knockback | the shove; where it threw us |
| adds | his little helpers, the brood, the spawn |
| enrage | when he stopped holding back / ran out of patience |
| the visible danger area | the shadow / the scorch line / the outline on the floor (it is always drawn, so a hero may say they "saw where it would land") |

**No numbers.** No digits, no seconds, no percentages, no damage. Rhythm words are fine ("twice", "a heartbeat later", "the third swing").

**Tone**
- Humour is welcome and should come from the hero's personality, not from jokes about the game.
- No modern slang, no profanity, nothing that winks at the player. These are people in a world of barrows, storms and spiders.
- No teaching text that reads like a tooltip. If an entry would work as a loading-screen tip, rewrite it.

**Distinctness test.** Cover the hero's name. A reader should still know who wrote it. Each hero below has a short list of tics; use at least one per entry, but never all of them at once. If two heroes' entries for the same move could swap without anyone noticing, one of them is wrong.

**Names.** The bosses are Grubnak (the ogre chef), Queen Skitterra (the spider broodmother), Volkar (the storm titan) and the Hollow King (lord of the Barrow). Heroes call them whatever suits them, and each hero should pick one name and keep it in their journal.

---

## Voice sheets

Each sheet: who they are, how they sound, what they notice, their tics, and two sample entries about generic boss moves. The samples show the voice, not the bosses' real moves; your boss file decides the real ones.

---

### bastion — Bastion, Shield Knight (tank)

**Who:** An immovable wall of steel; a plain soldier whose whole craft is raising the shield in the last instant before the blow.

**Voice:** Short, square, declarative sentences. Drill-yard vocabulary: line, ground, footing, shield, hold, give. Earnest, no irony, faintly proud. Writes like a report to an officer who isn't there.

**Notices:** The weight of a blow, the footing under it, the exact moment to brace, and who stands behind the shield. Thinks of the party as "the line" and himself as the part that doesn't move.

**Tics:**
- Ends an entry on a one-word verdict: "Held." "Gave ground." "Will hold."
- Talks about the moment *just before* a blow ("I waited for the shoulder to drop").
- Never complains about pain, only about bad footing.

**Samples:**
> The heavy swing came for me alone. I waited until his shoulder dropped, shield up in that last instant, and kept the others behind me and out of it. Held.

> He blasted the whole room. Nothing to block, so I planted my feet, let the line close up near the healer, and we took it together. Held, barely.

**Don't:** let him get poetic. If a sentence has a metaphor, it's a shield metaphor.

---

### bloodreaver — Bloodreaver, Berserker (tank)

**Who:** Every wound is fuel; the closer to death, the harder the hit back.

**Voice:** Hot, gleeful, punchy. Fragments and exclamations. Counts wounds the way others count coins and is mildly insulted by anything that doesn't hurt. Grim humour, never cruel to friends.

**Notices:** Pain: who hit hardest, how deep, what it felt like. Measures every move by the wound it left and what it gave back. Respects the boss more after a good hit.

**Tics:**
- Rates a blow by the scar ("a good one", "barely a scratch, shameful").
- Takes the hit first, then answers it; the order matters to him ("Bleed first. Then drink.").
- Calls the boss something almost affectionate: "the big one", "my friend".

**Samples:**
> The big one wound up and hit me hard enough to taste iron. Good! I let it land, then struck back while it was still fresh in me and drank it all back.

> Fire across the whole floor. The others don't love it like I do, so I pulled the beast's face away from them and kept my back to the wall. A fine scar.

**Don't:** make him reckless about tactics. He enjoys the hit; he still stands in the right place.

---

### runeguard — Runeguard, Warder (tank)

**Who:** Sees the blow before it lands; writes wards on the air between the heir and every blade.

**Voice:** Measured, scholarly, a little pedantic. Long, well-ordered sentences with semicolons. Uses words like sign, omen, inscription, foreseen, margin. Writes as if annotating a manuscript for a successor.

**Notices:** The sign that comes *before* each blow: a stance, a sound, a shift of weight. Cares about order and sequence: what follows what. Takes quiet pride in being right in advance.

**Tics:**
- "As foreseen." or "Not foreseen; now it is."
- Records the omen first, then the answer ("The omen: ... The answer: ...").
- Calls the boss formally ("the Broodmother", "the Titan").

**Samples:**
> The omen: he lifted his arm and the air went still around me. The answer: a ward laid a breath before the blow, so it broke on him rather than me. As foreseen.

> Not foreseen; now it is. When the light gathers at his feet, everyone steps outside the ring before it closes, and I follow last.

**Don't:** let him sound like a manual. He is pleased with himself, and it shows.

---

### ranger — Ranger, Marksman (dps)

**Who:** Never misses, never stops moving; the archer on the far wall who sees the whole field.

**Voice:** Laconic, dry, outdoors. Short sentences, hunting vocabulary: line, lane, cover, wind, sightline, flank, tracks. Understated to the point of rudeness.

**Notices:** Angles and distances. Where the clear lanes are, which side gives a clean shot, how the quarry turns. Reads a boss like tracks in mud.

**Tics:**
- Compass and clock-face directions ("came round from the north side", "three paces left of his tail").
- "Clean line." / "No line." as a verdict.
- Talks about the boss as quarry: "it", "the beast", "the old stag".

**Samples:**
> The sweep covered everything in front of it. Kept to its flank, outside the arc, and drew again before the dust settled. Clean line.

> The marks over our heads wanted room. We fanned out like a hunting party, each to our own patch, nobody's mark touching another's. Shot through the gap between them.

**Don't:** let her talk much. If an entry runs to three sentences, cut one.

---

### shadowblade — Shadowblade, Assassin (dps)

**Who:** The last thing you see is nothing at all; strikes from behind and never looks the King in the eye.

**Voice:** Soft, smug, a little theatrical in the noir way. Sentences that end on a turn. Vocabulary of shadows, backs, blind sides, patience. Speaks of the boss as a mark and of herself as unseen.

**Notices:** Where the boss is looking, and therefore where it isn't. Backs, flanks, blind spots. The moment of attention shifting. Who is drawing the eye (usually the tank) and how to use that.

**Tics:**
- "It never saw me." or a variant, as a closing boast.
- Refers to the boss as "the mark".
- Treats danger as a lapse of manners ("rude of it to turn round").

**Samples:**
> The mark swept the ground in front of it and behind it in turn. I waited at its side, where neither blade could see me, and slipped back in when it was done. It never saw me.

> It turned to face the room, which was rude of it. I let our shield pull its eyes back, then settled behind it again, where I belong.

**Don't:** let her be edgy or grim. She is having a lovely time.

---

### pyromancer — Pyromancer, Fire Mage (dps)

**Who:** Burns bright, sometimes too bright; calls the sky down and stands in her own burning circle.

**Voice:** Excitable, dramatic, overconfident, self-mocking about the burns. Exclamation marks allowed. Big words for small things. Always slightly singed.

**Notices:** How long she can stand still before she must move, where the safe ground is to plant her feet and keep casting, and how bright everything is. Treats every move as an interruption of her performance.

**Tics:**
- Mentions her own hair, eyebrows or sleeves catching ("Mostly unsinged.").
- Resents having to move, then admits it was right.
- Measures danger in brightness ("it glowed the colour of trouble").

**Samples:**
> Right in the middle of my best spell, the floor at his feet began to glow! I let it go, stepped out of the ring, and finished it from the edge. Mostly unsinged.

> He hit everyone at once, and nobody could stand anywhere safe. So I stopped sulking, stood close to the healer and kept casting through it. Only my sleeve smouldered.

**Don't:** make her stupid. She is vain, not careless; the tactic in her entry is always the right one.

---

### cleric — Cleric, Priest of Dawn (healer)

**Who:** The light answers when called; a priest who put a wall of light in the Executioner's way, again and again.

**Voice:** Warm, kind, steady, gently devout. Medium sentences with a pastoral rhythm. Uses dawn, light, grace, mercy, the faithful. Thinks of the party as people to look after and will mildly scold them.

**Notices:** Who is hurting and how badly; who wandered into harm; when to shield before the blow rather than mend after. Remembers people, not positions.

**Tics:**
- A short thanks or blessing ("Dawn keep us.", "Thank the light.").
- Gentle reproach for a friend's mistake, never by role name ("our brave knight", "the young archer").
- Prefers "before" to "after": the light goes up before the blow.

**Samples:**
> The heavy blow fell on our knight, as it always does. I laid the light on him before it landed instead of after, and he barely staggered. Dawn keep him.

> The whole room burned at once. I gathered everyone close to me first, so one prayer could reach them all, and nobody fell. Thank the light for small mercies.

**Don't:** make her saccharine. She has seen a lot of people die and is quietly practical.

---

### grovekeeper — Grovekeeper, Druid (healer)

**Who:** Plants the cure before the wound; grows roots under friends before the wind reaches them.

**Voice:** Slow, patient, earthy. Unhurried sentences, gardener's vocabulary: plant, root, season, frost, weather, sow, reap. Treats a boss like weather to be read, not an enemy to be hated.

**Notices:** What's coming next and how early to prepare for it. The rhythm of the fight like seasons. Who is rooted and who is wandering.

**Tics:**
- Farming and weather similes ("came on like an early frost").
- "Plant first." as a principle.
- Calls the party "my lot" or "the saplings" when fond.

**Samples:**
> The ring at his feet came on like an early frost. Everyone pulled back past its edge, and I'd planted on the knight before it, so the mending was already growing when it struck.

> I can smell his big blast coming now, the way you smell rain. Gathered my lot together, sowed before it broke, and reaped after. Plant first, always.

**Don't:** let him be slow on the page. Patient voice, short entries.

---

### chronomancer — Chronomancer, Time Mage (healer)

**Who:** It already happened, let's undo that; the mage who answers every bell twice and makes the last hour last.

**Voice:** Wry, unhurried, faintly bored by repetition. Slips between tenses on purpose ("I will have dodged it; I did"). Timing vocabulary: beat, bell, echo, the moment before, the moment after. Talks about "this time" as if there were many.

**Notices:** Timing above all: what comes a beat after what, the gap between the warning and the blow, the second hit that follows the first. Sees the fight as a melody with a tempo.

**Tics:**
- Tense slips ("Next time, which was last time...").
- Hears the fight as rhythm ("the second strike came on the off-beat").
- Mildly smug about undoing a death.

**Samples:**
> He swings twice, and the second one is the one that matters. I stepped out on the first beat and stayed out through the echo. I'll have known that all along, I'm sure.

> The blast came the moment his hands closed, every time. So we gathered a beat before, I kept time for them, and nobody had to be undone. Nearly nobody.

**Don't:** make the tense trick unreadable. One slip per entry, and the tactic must read plainly.

---

### thermist — Thermist, Living Thermometer (dps)

**Who:** Frost in one hand, fire in the other; the keeper of a clock that runs on a pendulum of frost and fire.

**Voice:** Two moods in one body. Cold sentences are clipped and precise; hot sentences rush and spill. An entry often swings from one to the other mid-way. Vocabulary of temperature: chill, thaw, scald, swing, edge, balance.

**Notices:** Change. Heat, cold, the swing between states, and the moment a thing tips over. Senses danger as a temperature.

**Tics:**
- Reports their own temperature as mood ("I ran cold all evening").
- Swings register within an entry: clipped then breathless, or the reverse.
- "Too far" / "back to the middle" as moral judgments.

**Samples:**
> Cold read first: the ring at his feet, the quiet beyond it. Step out. Then the heat came and I was already swinging back in, burning, cutting, and the ground behind me cracked where I'd stood.

> He blasted the whole hall and I ran hot with fright. Steadied. Back to the middle, close to the others, and let it wash over us together.

**Don't:** let the swings hide the tactic. The cold half usually carries it.

---

### driftblade — Driftblade, Wind Duellist (dps)

**Who:** Never stand still; the falconer-swordswoman who circles her quarry and never lands.

**Voice:** Breathless, run-on, full of motion verbs, held together with commas and "and". One long sentence is better than three short ones. Wind vocabulary: gust, slip, pass, through, round, wake. Bored by stillness, delighted by danger that gives her somewhere to run.

**Notices:** Paths: gaps, lanes, the line through the boss and out the other side. Treats every dodge as a route rather than a retreat.

**Tics:**
- The word "through" as often as she can get away with it.
- Complains about having to stand still for anything.
- Hawk imagery ("circled, never landed").

**Samples:**
> The sweep came round in front of him and I went through his side and out the back of it and round again, never landing, and it was over before I'd even slowed.

> The hit we had to share meant standing still with everyone, which I hate, so I ran a circle round them until the very last breath and then slipped in among them and took it.

**Don't:** turn the run-on into nonsense. It should still parse, and the safe spot should be clear.

---

### alembist — Alembist, Alchemist (healer)

**Who:** Brewed before it's needed; an apothecary who fills her shelves in the quiet hours, and sometimes mixes what no book allows.

**Voice:** A lab notebook. Tidy labels, cause and remedy, short clauses. Underneath, a cheerful streak of someone who has blown up more than one workshop. Vocabulary: brew, shelf, label, steep, reagent, dose, fuse, spoil.

**Notices:** Preparation and order: what to have ready, what to use first, what spoils if you wait. The quiet stretches between the busy ones. Treats moves as ailments with remedies.

**Tics:**
- Writes "Ailment:" and "Remedy:" (or "Note:"), at least sometimes.
- Mentions shelves, labels, or something spoiling.
- A small aside about an explosion that was entirely intended.

**Samples:**
> Ailment: the whole room scorched at once, every time he raises his ladle. Remedy: everyone gathered close, and the cure brewed during the quiet before it, not after.

> Note for the shelf: the marks over our heads must not touch. We each took our own patch of floor and I threw the mending into the middle of us after. Only one small fire, deliberate.

**Don't:** confuse her with the Runeguard. He foresees the omen; she prepares the remedy. Hers is a kitchen, his is a library.

---

### gorgemaw — Gorgemaw, The Maw That Walks (tank)

**Who:** Boss attacks are food; the guest who ate the cooks' every trick, twice over, and asked for more. A gourmand with strong opinions about cooks.

**Voice:** A food critic with a bottomless stomach. Rich, rolling sentences, tasting-menu vocabulary: course, flavour, seasoning, texture, palate, aftertaste. Contemptuous of any cook (especially Grubnak), generous to anyone who brings him something worth eating.

**Notices:** Food. Every move is a dish: its flavour, its presentation, whether it was worth swallowing. Notices what he can eat for others, and which dishes are better sent back.

**Tics:**
- A verdict on the dish ("Underseasoned." "Bland, but filling." "Sent it back.").
- Calls attacks courses, the fight a meal, the boss "the cook" or "my host".
- Never full.

**Samples:**
> My host served the heavy blow straight to me, as he should. I opened wide just before it landed, chewed it over, and sent the bones straight back at him. Underseasoned.

> The little marks over my friends' heads looked like canapés, so I stepped into one and ate it for its owner while everyone else kept to their own plate. Still hungry.

**Don't:** let the food jokes bury the tactic. One dish per entry, served plainly.

---

### oathbroker — Oathbroker, Contract-Knight (tank)

**Who:** Damage isn't taken, it's borrowed; a knight who signs his name under a debtor's child and collects every debt the realm is owed.

**Voice:** Formal, legal, archaic. Long, carefully constructed sentences with clauses and provisos. Vocabulary: terms, clause, surety, debt, due, ledger, settle, default, countersign, fine print. Treats the boss as a counterparty, never as a monster.

**Notices:** Terms and due dates. What the boss is owed and what it owes; what comes due when; the fine print in each move (the part everyone misses).

**Tics:**
- "So noted." / "Entered in the ledger." / "Countersigned."
- Refers to the party as "my co-signatories" or "the undersigned".
- Points to "the fine print": the detail of the move that actually kills people.

**Samples:**
> The terms were simple: a heavy blow, payable by whoever stood before him. I accepted delivery in full, deferred the worst of it past his next swing, and settled when our healer was ready. So noted.

> The fine print of his great blast: it is owed by all the undersigned at once, so we stood together and paid it in common. Entered in the ledger.

**Don't:** make the legalese so dense the tactic disappears. The clause should be the tactic.

---

### ironpalm — Ironpalm, Monk Brawler (tank)

**Who:** Every blow is a word, learn to speak in sentences; a monk who meets every stroke with an open hand and breathes.

**Voice:** Calm, spare, koan-like. Very short sentences. Breath and speech as metaphors for fighting: the blow is a word, a combo is a sentence, a fight is a conversation. Serene even when describing near-death.

**Notices:** Rhythm and breath. The boss's attacks as speech with a cadence. The pause before a blow; the breath after it. When to stop pressing and let the breath return.

**Tics:**
- Opens or closes on breath ("Breathe." "I breathed.").
- "It asked. I answered." or another call-and-response framing.
- Very little adjective, no exclamation marks.

**Samples:**
> The great blow came. I did not raise my arms until its last instant, and took half. Then I answered. Breathe.

> He spoke to everyone at once, loudly. We gathered close and listened together, and it passed. Then we answered him.

**Don't:** confuse him with the Bastion. Bastion is duty and footing; Ironpalm is breath and conversation. Bastion holds; Ironpalm replies.

---

### threadweaver — Threadweaver, Seamstress Witch (healer)

**Who:** What hurts one, hurts two a little less; a seamstress who ties the whole court together so no one stands alone.

**Voice:** A sharp, warm, no-nonsense seamstress. Sewing vocabulary everywhere: seam, hem, stitch, slack, tension, snag, unpick, needle. Brisk, a little bossy, very fond of her party and very cross when they wander.

**Notices:** Who is tied to whom and how far apart people are. Strain and slack. The moment a thread would snap because someone wandered off, and the moment to cut it on purpose.

**Tics:**
- "Mind the slack." / "Pulled it tight."
- Treats bad positioning as poor needlework ("a sloppy seam").
- Calls the party "my little stitches" or "the whole hem".

**Samples:**
> When the marks came, each of my stitches needed their own patch of floor, so I cut the threads before they snapped and tied them again once we'd come back together. Mind the slack.

> The heavy blow landed on our knight, and it ran down the thread to the archer, so neither took it all. A neat seam, if I say so myself.

**Don't:** let the sewing turn twee. She is practical first, and knows exactly how much one person can take.

---

### marionettist — Marionettist, Puppeteer (dps)

**Who:** Stand well back, let the Doll take the bows; the court puppeteer who never came within reach of the King.

**Voice:** A theatre director's playbill. Grand, arch, fond of the stage: act, scene, cue, entrance, exit, wings, upstage, curtain, the company. Calls the boss "our leading man/lady" or "the star", the party "the company", and the Doll "my Doll" with real tenderness.

**Notices:** Staging: who stands where, the lines between people, where the Doll must be, cues and exits. Sees every move as blocking to be rehearsed.

**Tics:**
- Stage directions in parentheses ("(Exit the Doll, stage left, unharmed.)").
- Reviews the performance ("A tolerable second act.").
- Speaks of danger as missing a cue.

**Samples:**
> Our leading man swept the stage in front of him. The company stepped behind him on cue, and I pulled my Doll into the wings before the blade passed. (Applause, mostly for the Doll.)

> He blasted the whole house. Nowhere to hide, so the company gathered downstage, close together, and took it as one. A tolerable second act.

**Don't:** forget that she is never near the boss herself. The Doll is in the scene; she directs from the back.

---

### gloomsworn — Gloomsworn, Undying Vigil (tank)

**Who:** A knight who has already died once and stayed at his post. Death is a debt he is paying slowly; the dark keeps the watch with him and does not let go.

**Voice:** Low, level, tired, with something empty behind it. Flat past-tense sentences, no flourish, dry rather than funny. Vocabulary of the watch and the dark: post, relieved, the dark, hollow, owed, grave, dusk, small hours, the dead. He takes a blow the way a man takes weather he has survived before. Never a drill-yard word: footing, line and "Held" belong to the Bastion.

**Notices:** What will hurt, and whether it can hurt him any more than it already has. Who is behind him. Who is going to pay for his wounds (the healer, at the end). Places where one stands alone, and long, quiet stretches. Uses "the watch" for the party only a few times per boss.

**Tics:**
- Dry asides about being dead: "I know the sensation.", "I was dead for those.", "Even I hide from some things."
- Takes the blow *whole*, drawing the dark in at the last moment, rather than bracing a shield.
- Sign-offs are rare and varied ("The watch is relieved.", "The dark remembers."); most entries simply stop.
- Never "Held.", never a footing complaint.

**Samples:**
> The claws were meant for me. I watched his near shoulder and let the rake land where I stood. A wound is only a wound; mine are written down already. The rest kept wide of the arc.

> Static took hold of every one of us, and each needed room apart. I found my own bare place and stayed on it. A man who has been buried does not mind a small space.

**Don't:** make him gloomy for its own sake, or pile on death jokes. One dry aside per entry, at most. Do not let him say "debt" in every line (the Oathbroker owns it).

---

### thresher — Thresher, Scythe-Farmer (dps)

**Who:** A farmer who is also the one who digs the graves, and sees no difference between the two jobs. Everything ripens in its time; she only has to be there.

**Voice:** Warm, chatty, unhurried, with a pause before the word that matters. Rural plain-speech; a low fond laugh. Cheerful about terrible things and never in a hurry, which is the unnerving part. Vocabulary of the field and the plot: furrow, row, headland, stubble, sheaf, stook, chaff, plough, spade, soil, ripe, rot, weeds, fallow. (Weather, seasons and planting belong to the Grovekeeper; keep those to a passing word.)

**Notices:** Timing in the sense of when a thing is ready: the telegraph of a blow as a crop coming ripe, ground that has been worked, ground that is spent. The kind of soil one stands on. What will need burying afterwards.

**Tics:**
- A farm comparison now and then (not every line): "like chaff off a threshing floor".
- Graveyard cheer: "Room for one more.", "Not the plot I would have chosen to lie in."
- Easy sign-offs: "Plenty of time.", "Not yet.", "Wrong season for that one.", a pleased "Ha."
- Talks to the boss kindly, as to something about to be put in the ground.

**Samples:**
> Up he went, and the embers drew his road to one of the pits, the ring showing which. I stepped off the road and well clear of the pit, and let him dig it himself. Saves me the trouble.

> Cut a head and the stump bleeds, and a blue ring opens at the column behind. Someone has to stand in it till it shuts, or two sprout like weeds. The first cut grows back late, so take the mildest first.

**Don't:** use a "like ... in a field" simile in every entry (it had become a formula), or make her sinister on purpose. She is never cruel.

---

## Quick reference: who notices what

| Hero | Sees a fight as | Signature verdict |
|---|---|---|
| bastion | footing and the line behind him | "Held." |
| bloodreaver | wounds and what they give back | "A fine scar." |
| runeguard | omens and the order they come in | "As foreseen." |
| ranger | angles, lanes and distance | "Clean line." |
| shadowblade | where the boss is looking, and isn't | "It never saw me." |
| pyromancer | when she may stand still and burn | "Mostly unsinged." |
| cleric | who is hurting, and grace before the blow | "Dawn keep us." |
| grovekeeper | weather and seasons; plant before | "Plant first." |
| chronomancer | rhythm, beats and echoes | a tense slip |
| thermist | temperature and the swing between | "Back to the middle." |
| driftblade | routes through and out | "through", "never landed" |
| alembist | ailments and remedies, prepared early | "Ailment: / Remedy:" |
| gorgemaw | dishes and courses | "Underseasoned." |
| oathbroker | terms, debts and fine print | "So noted." |
| ironpalm | breath and conversation | "Breathe." |
| threadweaver | seams, slack and who's tied to whom | "Mind the slack." |
| marionettist | staging, cues and the company | (stage directions) |
| gloomsworn | a post kept, and a wound already written down | a dry aside about being dead |
| thresher | what is ripe, what needs burying, and ground already worked | "Plenty of time." |

**Pairs most likely to blur, and how to keep them apart:**
- Bastion / Ironpalm / Runeguard (all "brace before the blow"): Bastion holds his ground, Ironpalm answers a word, Runeguard foresaw it.
- Cleric / Grovekeeper / Alembist (all "heal before"): Cleric prays for people, Grovekeeper reads weather and plants, Alembist labels an ailment and brews its cure.
- Ranger / Driftblade (both move a lot): Ranger stands off and picks an angle in few words; Driftblade runs through in one long breath.
- Gloomsworn / Bastion (both tanks who take the blow): Bastion braces a shield at the last instant and ends "Held."; Gloomsworn lets the wound in, draws the dark about him, and makes a dry remark about having died. Different verbs, different endings, and never the same nouns for the ground ("footing", "line" are Bastion's).
- Thresher / Grovekeeper (both farm talk): Grovekeeper reads weather and plants before; Thresher works rows and spades, waits for a thing to ripen, and jokes pleasantly about graves.
- Shadowblade / Marionettist (both theatrical): Shadowblade is noir and alone; Marionettist is the stage and the whole company.
