# Town life: the folk of Emberfall

Data: `client/js/town-npcs.js` (`TOWN_NPCS`, `TOWN_GIFTS`, `TOWN_UNLOCKS`, `FEASTS`). Twelve townsfolk: eight who always live here and four who arrive after a boss's first defeat. Everyone's talk changes as the party clears Grubnak, Skitterra, Volkar and the Hollow King. Nobody explains a boss fight (the journals do that), and nobody names a specialization; Tobble, Ozza and Marigold hint that "the court remembers", and after the Hollow King falls Sir Aldric and Ozza point the party at those memories.

## The cast

| Who | Where (x, y) | Wanders | In one line |
|---|---|---|---|
| **Marigold**, Laundress | plaza, west of the fountain (1060, 1040) | 40 | The town gossip. Knows everyone's business and starts the Corwin secret. |
| **Pip**, Small Adventurer | south-west of the plaza, by the second house (1000, 1230) | 50 | A child who wants an ogre tooth and her confiscated marble back. |
| **Hask**, Portal Sergeant | on the portal terrace, at the head of the road | 0 | Has guarded the portal seventeen years. "I count who comes out." |
| **Corwin**, Old Adventurer | on a barrel just east of the tavern deck (770, 870) | 0 | Retired, bad knee, hates spiders. Once climbed Volkar's mountain and turned back. |
| **Fennick**, Peddler | east road, by the smithy crates (1720, 880) | 20 | Sells "genuine" trophies of every boss; sells a rumour before Grubnak. |
| **Tobble**, Hermit | north-west, by the hut at the top-left (430, 390) | 30 | Lived in the spider caves before the Queen; talks to the fountain. |
| **Osric**, Gravedigger | south road, west of the third house (1300, 1500) | 30 | Digs every grave facing the Barrow; tends an empty knight's grave. |
| **Hilde**, Smith | below the Forge (2070, 975) | 15 | Blunt, burned an eyebrow on spider silk, won't melt a king's crown. |
| **Gaspard**, Chef *(after Grubnak)* | beside the tavern deck (800, 1060) | 0 | Grubnak's potato peeler for eleven years. Now cooks the party's feasts. |
| **Tamsin**, Travelling Bard *(after Skitterra)* | plaza, east of the fountain (1340, 880) | 30 | Writing the ballad of your raid. Nothing rhymes with Skitterra. |
| **Madame Ozza**, Fortune Teller *(after Volkar)* | between the terrace and the plaza, east (1520, 800) | 0 | Couldn't read the sky for thirty years of storm. Reads your fortune once. |
| **Sir Aldric**, Last of the Guard *(after the Hollow King)* | beside The King's Road portal | 0 | A ghost of the King's guard, freed. Stays "a while" because he forgot fountains. |

**Walk-in scenes:** Gaspard and Ozza walk up the south road from (1200, 1680); Tamsin comes down the east road from (2040, 940); Aldric steps out of The King's Road portal. Each says three short lines to everyone on arrival.

**Hero-specific lines:** Shadowblade (Marigold), Marionettist (Pip, Tamsin), Bastion (Hask), Ranger (Corwin), Oathbroker (Fennick, Aldric), Ironpalm and Grovekeeper (Tobble), Chronomancer (Osric, Ozza), Pyromancer (Hilde), Gorgemaw (Gaspard), Runeguard (Aldric). Each sits at one point in the progression (or behind a secret) so it never hides a secret branch.

## What each boss changes in town

| Boss | Toast | Trophy on the statue | Also |
|---|---|---|---|
| Grubnak | The Scullery fires are out; a cook arrives; the cleaver hangs on his statue. | cleaver | **Feasts unlock** (Gaspard). Decor: a cookpot over a fire beside Gaspard. |
| Skitterra | Her silk drapes her statue, the plaza lamps burn silver, a bard arrives. | web | Decor: the four plaza lamps glow pale silver. |
| Volkar | The sky is clear for the first time in years; kites; a fortune teller arrives. | storm-glass | Decor: children's kites bobbing over the plaza. |
| Hollow King | The bells are silent; the crown rests on his statue; one of his guard walks out of the portal. | crown | Decor: festival bunting across the plaza. |

`decor` is an optional extra field; the engine may ignore it.

**Feasts** (Gaspard, "What's cooking?"): the whole table eats one, for the next hour.

| Feast | Cost | Effect |
|---|---|---|
| Scullery Stew | 30 gold | +3% max health |
| Pepper Pie | 40 gold | +3% damage |
| Honeyroot Broth | 35 gold | +3% healing |
| Quickfoot Tarts | 25 gold | +2% speed |

## Secret chains

Six chains, each ending in a gift (one per hero, all accessories). Flags in brackets.

1. **Pip's marble** (any time) → *Pip's Lucky Button* (health)
   1. Talk to Pip, choose "Why the long face, Pip?": Hask took her marble [`pip-marble`].
   2. Talk to Hask, choose "Pip wants her marble back" [`got-marble`].
   3. Talk to Pip, choose "Give Pip the marble": she gives her lucky button [`pip-done`].

2. **Corwin's summit** (start before Volkar) → *Corwin's Storm Compass* (speed)
   1. Before Volkar falls, ask Marigold "Heard anything about the mountain?" [`heard-summit`].
   2. Corwin admits he turned back at the last ridge and dares you to go further (he says this as long as Volkar stands).
   3. Beat Volkar, then talk to Corwin, choose "Tell him about the summit": he gives his compass [`corwin-done`].

3. **The scullion** (start before Grubnak) → *Gaspard's Tasting Spoon* (healing)
   1. Before Grubnak falls, ask Fennick "Any rumours for sale?": a kitchen hand is chained by Grubnak's potato sacks [`heard-scullion`].
   2. Beat Grubnak; Gaspard (that kitchen hand) arrives.
   3. Talk to Gaspard, choose "He says it's the other way round": he gives his tasting spoon [`gaspard-done`].

4. **The moon-thread** (start before Skitterra) → *Moonthread Band* (damage)
   1. Before Skitterra falls, ask Tobble "Ask about the caves": one silver thread at the heart of her web; tell Hilde [`tobble-silk`].
   2. Beat Skitterra.
   3. Talk to Hilde, choose "Ask what she made of it": she gives the band [`hilde-done`].

5. **The song** (after Volkar, any time before the Hollow King) → *Tamsin's Folded Verse* (damage)
   1. Ask Madame Ozza "Read my fortune": "The song will find you before the crown does. Go and see the bard" [`ozza-fortune`]. (After the Hollow King falls she no longer reads fortunes.)
   2. Talk to Tamsin, choose "Hold still": she gives a verse [`tamsin-done`].

6. **The empty grave** (start before the Hollow King) → *Ring of the Last Guard* (health)
   1. Before the Hollow King falls, ask Osric "Whose grave is that, by the road?": Sir Aldric's, kept clean in case he wants it [`osric-oath`].
   2. Beat the Hollow King; Sir Aldric walks out of the portal.
   3. Talk to Aldric, choose "He keeps your stone clean": he gives his ring [`aldric-thanks`].
   4. Osric then has a new line: he'll plant something on the stone.

Missing a "before" window closes that chain for good (the hint is only offered while that boss stands).

## Spec hints (never named)

- Tobble, after Volkar ("Ask about the Barrow"): fighters' ways of fighting stayed in the Barrow and will want new hands.
- Ozza, after Volkar ("What else do you see?"): each hero has a second shadow the King keeps; ask for it when he's gone.
- After the Hollow King: Marigold ("the old court is talking"), Tobble ("the court remembers"), Ozza ("two old roads behind each of you"), Aldric ("those memories are yours now; go and ask for them").

## Set 2 additions (spoilers)

One thing per set 2 boss on its first defeat (Normal), shown the same way as set 1: a toast, a trophy on the statue, a decor kind (`TOWN_UNLOCKS` in `town-npcs.js`, drawn by `town-life.js`), and a few new lines for the townsfolk. Everything is optional; none of it is needed to clear anything. Old saves keep working: the unlock is "boss beaten and not yet marked in `town.seen`", so a save that already beat these bosses gets the moments the next time it is in town (one at a time).

| Boss | Size | What | Where / how |
|---|---|---|---|
| Vhalgrath (`wyrm`) | small | **The Forge burns hotter.** Embers lift off the chimney in a slow stream, the hearth and the door glow warmer, and one of the wyrm's great scales leans against the front wall west of the door (solid, `r` 15). Trophy on the statue: a scale. | decor `forge-embers`; scale at (1962, 920); Hilde and Fennick have a new line. |
| Hrimgar (`titan`) | small | **Snow.** A light flurry drifts across the whole town, and the children have built a family of three snowmen east of the Tankard (the small one is the grumpy one; solid, drawn as entities so heroes pass behind and in front). Trophy: an ice shard. | decor `snowfall`; snowmen at (802, 722), (848, 746), (776, 760); Pip has a new line (and keeps her marble choice). |
| Azerath (`archmage`) | **big** | **Quill, the Archmage's apprentice**, walks up the pond's south-west shore (from (430, 1590), round to (469, 1205): about four seconds) with three lines for everyone, and sets up beside a chalk circle on the bank (seven small circles, four lit with fire, frost, lightning and void; puddles, a pail, a chalk-box). He draws **wards**: pick one and it sits on you for an hour, on you alone (no network message; the totals go out with your gear like a feast's, `deps.onFeast`). One ward at a time, a new one replaces it, and it **stacks with a feast**. A chip "Warded" with the minutes left sits above the "Well fed" one. Trophy: a seven-circle sigil. | NPC `quill` (hat `pointed`, `drip: true` for the puddle), `WARDS` in `town-npcs.js`, node action `ward`, `feastTotals` merges the ward, `#ward-chip` in `style.css`. Bram and Marigold have new lines. |
| The Hydra (`hydra`) | small (interactive) | **The fountain answers.** The town fountain gets gold glinting on the basin floor, nine soft lights round the rim (the heads' element colours) and can be clicked: "Wishing pool". A coin costs 5 gold and brings one of nine voices (never the same twice until all nine have spoken); one toss in eight the water gives 12 gold back. Hearing all nine sets `fountain-nine`. Trophy: a fang. | decor `wishing-pool`; `FOUNTAIN` in `town-npcs.js`; an interactable at the fountain (reach from its middle, 125); node action `wish`. Tobble has two new lines (one for `fountain-nine`). |

**Numbers.** Wards: Cinder +2% crit chance (30 gold), Rime 2% less damage taken (30), Storm +2% haste (30), Void +2% power (35). Two percent is the most any ward gives (a feast tops out at 3%).

**Walk-in, collisions, minimap.** Quill's route clears the pond (its west end is about x 467 at the shore) and the first house (x to 382); the walk's stuck guard (one second without getting closer, then walk through) still applies. The chalk circle, puddles and the pool's lights are flat ground art, not solid. The scale and the snowmen add small circle colliders once their unlock shows (guarded, added once), and no road or NPC route passes through them. The minimap draws no townsfolk or decor, so nothing was added to it.

**Voice.** Quill is anxious and polite and always damp ("Sorry! Sorry. Mind the water."). The pool's nine voices are the nine heads: acid, tide, venom, flame, rime, storm, the stone gaze, the mire, the elder.

## Set 3 additions (spoilers)

**The town's layout (2026-10-25).** The middle of town is no longer a row of statues. The portal terrace (`TOWN.terrace`, y 556) holds one portal per set (`TOWN.portals`): The King's Road, The Wild Realm and The Fallen Star, each opening the raid board at that set's latest open boss (a set with no open boss reads as sealed), and a fourth, shrouded and nameless, for the ultimate raid to come. Returning from a raid sets the player down at the portal of the set they fought in. Every statue, trophy and plaque stands in the Trophy Hall, which is a building and a separate room, not an area of the map. In town the building (`TOWN.trophy`, x 1050, y 300, 300 by 230: slate roof, pediment with a gold cup, four columns, a name beam, a brazier pillar either side of its steps) stands at the top-middle, north of the portal row, its door facing the terrace. A teleporter pad (`TOWN.trophy.pad`, a rune slab with a turning gold swirl, drawn like the portals) lies at the foot of the door: step onto it and a short fade carries you inside. The inside (`TOWN.hall`, drawn into its own layer by `buildRoomLayer`) is a pocket of the same coordinate space east of the town, outside `WORLD`: `TOWN.room` is x 2700, y 0, 1272 by 700, the walled hall inside it x 2800, y 60, 1072 by 580. Three rows of four (set 1 at the back, set 3 nearest the pad, `TOWN.pedestals` filled from the hall's rows and columns, statues at 0.9 scale) stand in it, walls all round, and a second pad (`TOWN.hall.pad`, between two brazier pillars on the front wall) takes you back out to `TOWN.trophy.out`, just south of the door. Both pads work from `trophyStep` in `main.js`: you are set down a little way off the far pad and each re-arms once you step clear of it. Nothing walks between town and room but the pads (`townClamp` keeps a hero in whichever one it is in; the camera, the minimap, which is put away inside, and what is drawn all follow `inRoom()`), and position sync is unchanged, so a friend in the hall is simply drawn in the room. The town's moments (arrivals, the Barrow Gate rising) wait while you are inside. The old hall's ground is lawn and trees again (`nearTrophy` keeps trees off the building), and the Barrow Gate stands east of the building with its stepping stones running to the building's east wall (`TOWN.barrow`, 1600, 300). The room has no spare row: a fourth set means making it taller (and moving its pad down with it). Town additions and secrets placed against the old layout were moved with it (`town-life.js`, `town-secrets.js`, `pastimes.js`, `barrow-gate.js`).

*(Superseded by the layout above:)* **The set 3 terrace.** `TOWN.terrace3` ({x 392, y 98, w 302, h 328}) is a colder-grey terrace in the north-west, joined to the west end of the first portal terrace (its right edge is x 694, where terrace 2 begins). Its four pedestals are a 2 x 2 block at (460, 168), (626, 168), (460, 326), (626, 326), in the BOSSES' order (Corvane first), rows 160 apart so a name plaque clears the next row. A pale four-pointed star is inlaid between the statues. The town was otherwise full, so the block sits where two trees stood (they are skipped in `initTown`, the random draw is kept) and two things moved a little: Tobble (430, 390 to 346, 398) and the `storm-glass` secret (420, 120 to 350, 106, still "on the hill", now beside the terrace).

| Boss | Size | What | Where / how |
|---|---|---|---|
| Corvane (`corvane`) | small | A toast, a trophy on the statue, a decor piece (`pass-lanterns`), and a new line from Sir Aldric. | `TOWN_UNLOCKS.corvane` in `town-npcs.js`; drawn by `town-life.js` (the pieces are solid and drawn as entities so heroes pass behind them); the trophy is `sheathed-blade`. |
| Brannoc (`brannoc`) | small | A toast, a trophy on the statue (`sunwheel`), a decor piece (`victory-banners`), and a new line from Tamsin. | `TOWN_UNLOCKS.brannoc` in `town-npcs.js`; drawn by `town-life.js` (the two banners are solid and drawn as entities, at (1126, 1150) and (1274, 1150) where the road comes in from the south, so heroes pass behind them). |
| Morrow-Oak (`morrowoak`) | small | A toast, a trophy on the statue (`heartwood`), a decor piece (`seedlings`), and a new line from Tobble. | `TOWN_UNLOCKS.morrowoak` in `town-npcs.js`; drawn by `town-life.js` (two young trees at (1500, 1000) and (1548, 1040) just east of the plaza, solid and drawn as entities so heroes pass behind them; the whole reward is self-contained so it can move). |
| Caelum Vey (`caelum`) | small | A toast, a trophy on the statue (`silver-mask`), a decor piece (`starfall`, which shows from his first defeat), and a new line from Madame Ozza. | `TOWN_UNLOCKS.caelum` in `town-npcs.js`; drawn by `town-life.js` (slow stars drift over the whole town the way the flurry does, and a splinter of black star-glass stands in the middle of the Trophy Hall's set 3 row, solid and drawn as an entity; its spot is worked out from the hall, so it moves with the layout; the whole reward is self-contained so it can move). It follows the set 2 finale's precedent: a town-wide ambience (like the snow) and no new system. |
