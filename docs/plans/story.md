# Story, secrets, feats, bounties and fish

Data: `client/js/story-data.js` (`STORY`), `town-secrets.js` (`TOWN_SECRETS`), `feats-data.js` (`FEATS`), `bounty-data.js` (`BOUNTIES`), `fish-data.js` (`FISH`), and the angler Bram plus new secret lines in `town-npcs.js`.

## The story in brief

Long ago the valley's kings built a gate above Emberfall. **The King's Road** runs through it past the places the court kept: its **kitchen**, its moon-silver **caves**, the **beacon** on the storm peak, the **Barrow** where its kings were buried, and on further than anyone in town has followed it. The words carved on the back of the portal ring stop at BARROW; whatever came next has been chipped away.

A hundred years ago a king was carried down the road and wouldn't lie down: the Hollow King. Since then hungry things have settled in the halls his court left empty. Grubnak took the kitchen (Hilde's grandfather forged its knives), Skitterra took the silver caves, and Volkar sat down on the cold beacon (thirty years of storm). The gate opens on them one at a time, never past one still standing, so the bosses come in a row.

The town stayed: graves dug facing the Barrow, Hask counting who comes back, Osric planting bluebells for those who don't, Corwin leaving a coin behind the Tankard for every party that goes in. This autumn the bells began to toll loud enough to hear in the square, and the heroes came up the south road.

It's open-ended: the Hollow King is the threat right now, not the end of the road. There's no epilogue.

- **Prologue** (4 pages, shown the first time a player enters town): The King's Road / The king who stayed / What moved in / Emberfall.
- **Boss lore** (Raid Board, under each blurb): how each boss came to hold its hall.

## Secrets (14)

Each is drawn faintly and only noticed up close (pick-up radius 24). Every spot was checked with a script against the houses, trees, pedestals, lamps, fountain, pond and notice board.

| Secret | Where (x, y) | Appears | Look | Reward | Flag / who reacts |
|---|---|---|---|---|---|
| A tin behind the Tankard | north wall of the tavern (600, 436) | start | loose-stone | 20 gold | `found-corwin-tin`: Corwin. Marigold's "Any news?" hints at it |
| Words on the back of the gate | behind the portal (1200, 128) | start | carving | lore | `read-kings-road`: Hask. Hask ("What's behind the portal?") and Tobble ("Ask about the gate") hint at it |
| A hollow in the north-east trees | NE corner of the tree line (2285, 125) | start | hollow | 10 gold | `found-pip-stash`: Pip |
| Notches on the corner post | far SE corner inside the Training Yard (2095, 1338) | start | carving | 15 gold | none |
| A ring of bluebells | SW tree line, past the first house (110, 1560) | start | flowers | lore | `found-bluebells`: Osric |
| Something in the far reeds | south bank of the pond (640, 1460) | start | glint | gift: Silver Moth Lure (speed) | `found-lure`: Bram, whose "Lose anything out here?" hints at it |
| A card in the west hedge | west tree line, beside the deck (105, 890) | after Grubnak | note | lore | `found-recipe`: Gaspard |
| Behind the Forge | slag heap north of the smithy (2100, 665) | after Grubnak | glint | 25 gold | `found-cleaver-mark`: Hilde (her grandfather made the King's kitchen knives) |
| A tiny web in the north trees | north tree line above the terrace (850, 115) | after Skitterra | glint | 12 gold | none |
| Under the terrace stones | foot of the terrace, between the 3rd and 4th statues (1500, 668) | after Skitterra | loose-stone | 25 gold | `found-hask-purse`: Hask |
| Glass on the hill | above Tobble's hut (420, 120) | after Volkar | glint | 30 gold | `found-storm-glass`: Fennick |
| A kite in the gutter | east side of the second house (1072, 1340) | after Volkar | note | lore | none |
| A stone by the south road | Osric's patch beside the south road (1265, 1560) | after the Hollow King | carving | 30 gold | none |
| Footprints from the gate | in the frost NW of the portal (1090, 150) | after the Hollow King | footprints | 40 gold | none (hints at the court's memories) |

Each NPC reaction is a one-time line at the top of their talk list, closed by one choice that sets `<name>-…-told`. It shows once and then goes away, so it never hides a chain.

## Feats (34; 12 titles, 5 hidden)

| Feat | How | Title |
|---|---|---|
| First Course | Defeat Grubnak | Ogre's Last Customer |
| Cut the Thread | Defeat Skitterra | |
| Clear Skies | Defeat Volkar | |
| The Bells Stop | Defeat the Hollow King | |
| The King's Road | Defeat all four | Walker of the Road |
| Sent It Back | Grubnak on Hard | Sent It Back |
| All Eight Eyes | Skitterra on Hard | |
| Lightning Rod | Volkar on Hard | Stormproof |
| Kneel to No One | Hollow King on Hard | |
| Hask Counted Four | All four on Hard | Counted Back In |
| Nobody Carried Out | Any boss, no deaths | |
| Clean Plates | Grubnak Hard, no deaths | |
| A Quiet Shift *(hidden)* | Hollow King, no deaths | The Digger's Day Off |
| Express Service | Grubnak under 7 minutes | |
| A Brief Audience | Hollow King under 8 minutes | |
| Back Again | 10 pulls | |
| A Regular | 100 pulls | The Usual |
| Straw and Sawdust | 10 Practice Hall runs | |
| Many Hands | 4 heroes with a clear | |
| Every Seat at the Table | All 17 heroes with a clear | Of Many Faces |
| By the Fire | 20 journal pages | |
| Nosy | 1 secret | |
| Every Stone Turned | All 14 secrets | Knows Every Stone |
| Well Liked | 3 gifts | |
| Friend of Emberfall | 7 gifts (all six NPC gifts plus the moth lure) | Friend of Emberfall |
| Seconds | 10 feasts | |
| Notice Taken | 10 bounties | |
| First Bite | 1 fish | |
| Patience | 50 fish | |
| The One That Didn't Get Away *(hidden)* | Land Old Whiskers | Teller of Fish Tales |
| Showing Off *(hidden)* | 25 emotes | |
| Something Golden | Own a legendary | |
| Stuff of Songs *(hidden)* | Own a mythic | Worth a Verse |
| An Old Road *(hidden)* | Pass a spec trial ("Walk a road the court remembers") | |

The time limits (7 and 8 minutes) are guesses for 8 to 10 minute fights. Tune them once there are real clear times.

## Bounty pool (19; 3 a week)

| Notice | Posted by | Goal | Gold |
|---|---|---|---|
| Keep the Kitchen Cold | Marigold | Grubnak ×2 | 50 |
| No Second Helpings | Hask | Grubnak, no deaths | 60 |
| Quick Service | Corwin | Grubnak under 8 min | 70 |
| Sent Back to the Kitchen | Fennick | Grubnak Hard | 90 |
| Quiet Cellars | Marigold | Skitterra ×2 | 60 |
| Not a Thread Touched | Tobble | Skitterra, no avoidable hits | 110 |
| The Queen at Her Worst | Hilde | Skitterra Hard | 100 |
| Kite Weather | Pip | Volkar ×1 | 60 |
| All the Way Down | Corwin | Volkar, no deaths | 90 |
| Before the Rain | Tobble | Volkar under 9 min | 110 |
| The Bells Again | Marigold | Hollow King ×1 | 80 |
| As the Guard Stood | Osric | Hollow King, no deaths | 130 |
| Mind the King's Eye | Hask | Hollow King, no avoidable hits | 150 |
| A Busy Week | Hask | any 4 clears | 80 |
| Light on Your Feet | Pip | any clear, no avoidable hits | 70 |
| Fish for the Pot | Bram | 5 fish | 40 |
| Eat Together | Gaspard | 2 feasts (needs Grubnak beaten) | 45 |
| Straw Men | Hilde | 3 Practice Hall runs | 40 |
| Look Around You | Tobble | 1 secret | 40 |

Every notice is signed by someone who already lives in town by the time that boss is open. The only exception is Gaspard's feast notice, which needs Grubnak beaten.

## Fish (12; Bram buys them)

| Fish | Rarity | Sells | Bites |
|---|---|---|---|
| Mudminnow | common | 2 | always |
| Reed Perch | common | 3 | always |
| Tankard Bream | common | 4 | always |
| Lantern Dace | uncommon | 8 | always |
| Copper Carp | uncommon | 10 | always |
| Greasefin | uncommon | 9 | after Grubnak |
| Silk Loach | uncommon | 11 | after Skitterra |
| Storm Eel | rare | 18 | after Volkar |
| Bellmouth Carp | rare | 20 | after the Hollow King |
| Grey Pike | rare | 22 | after the Hollow King |
| Old Whiskers | legendary | 40 | always |
| Moon Koi | legendary | 45 | after the Hollow King |

**Bram, Angler** stands by the pond (600, 1290) and is always there. His talk changes with progress and has a Driftblade line. "I've got fish" opens the `fish-shop`, and "Lose anything out here?" hints at the moth lure.
