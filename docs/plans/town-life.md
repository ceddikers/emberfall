# Town life: the folk of Emberfall

Data: `client/js/town-npcs.js` (`TOWN_NPCS`, `TOWN_GIFTS`, `TOWN_UNLOCKS`, `FEASTS`). Twelve townsfolk: eight who always live here and four who arrive after a boss's first defeat. Everyone's talk changes as the party clears Grubnak, Skitterra, Volkar and the Hollow King. Nobody explains a boss fight (the journals do that), and nobody names a specialization; Tobble, Ozza and Marigold hint that "the court remembers", and after the Hollow King falls Sir Aldric and Ozza point the party at those memories.

## The cast

| Who | Where (x, y) | Wanders | In one line |
|---|---|---|---|
| **Marigold**, Laundress | plaza, west of the fountain (1060, 1040) | 40 | The town gossip. Knows everyone's business and starts the Corwin secret. |
| **Pip**, Small Adventurer | south-west of the plaza, by the second house (1000, 1230) | 50 | A child who wants an ogre tooth and her confiscated marble back. |
| **Hask**, Portal Sergeant | beside the Raid Portal, east side (1310, 410) | 0 | Has guarded the portal seventeen years. "I count who comes out." |
| **Corwin**, Old Adventurer | on a barrel just east of the tavern deck (770, 870) | 0 | Retired, bad knee, hates spiders. Once climbed Volkar's mountain and turned back. |
| **Fennick**, Peddler | east road, by the smithy crates (1720, 880) | 20 | Sells "genuine" trophies of every boss; sells a rumour before Grubnak. |
| **Tobble**, Hermit | north-west, by the hut at the top-left (430, 390) | 30 | Lived in the spider caves before the Queen; talks to the fountain. |
| **Osric**, Gravedigger | south road, west of the third house (1300, 1500) | 30 | Digs every grave facing the Barrow; tends an empty knight's grave. |
| **Hilde**, Smith | below the Forge (2070, 975) | 15 | Blunt, burned an eyebrow on spider silk, won't melt a king's crown. |
| **Gaspard**, Chef *(after Grubnak)* | beside the tavern deck (800, 1060) | 0 | Grubnak's potato peeler for eleven years. Now cooks the party's feasts. |
| **Tamsin**, Travelling Bard *(after Skitterra)* | plaza, east of the fountain (1340, 880) | 30 | Writing the ballad of your raid. Nothing rhymes with Skitterra. |
| **Madame Ozza**, Fortune Teller *(after Volkar)* | between the terrace and the plaza, east (1520, 800) | 0 | Couldn't read the sky for thirty years of storm. Reads your fortune once. |
| **Sir Aldric**, Last of the Guard *(after the Hollow King)* | west of the portal (1080, 400) | 0 | A ghost of the King's guard, freed. Stays "a while" because he forgot fountains. |

**Walk-in scenes:** Gaspard and Ozza walk up the south road from (1200, 1680); Tamsin comes down the east road from (2040, 940); Aldric steps out of the portal at (1200, 340). Each says three short lines to everyone on arrival.

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
