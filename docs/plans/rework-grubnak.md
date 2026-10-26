# Grubnak rework: Normal that tests you

*2026-10-25. Review: Normal was a clean tutorial but nothing tested you (bots cleared 20 of 20 at `GEAR=fresh`); Hard is dense and fair, and the Dinner Rush is the set's best moment. Goal: Normal fun 8 or more out of 10, Hard kept as it is.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** The Scullery at the dinner rush. An ogre chef is running one long service with no break, and the kitchen is the fight: the grease you drop stays, fire eats grease, and half-way through the kitchen catches.
2. **What question does the fight keep asking?** "Where do I stand?" Where the puddle goes down, where the casks land, which wall the charge hits, which plate is mine.
3. **What is the rule a player learns?** Every tool he picks up has exactly one answer on the floor (a half to leave, a ring to leave, a ring to enter, a plate to take, a pile to join, a cask to hide behind), and later the tools arrive in pairs, so a new move is always two old answers back to back. What you leave on the floor remembers you.
4. **How does the fight warn?** The tool is shown on him first (the glinting cleaver names the half, the ladle or lid on his back names what follows), then the floor draws the whole thing from the cast. The plates' gold rims fill in the order they will come up. Nothing is ever hidden on any difficulty.
5. **Acts.** The Appetiser (one tool at a time), the Mains (everything in pairs), the Flare-Up (the seam: the kitchen catches), the Second Sitting (new tools, paired, in the burning room), Dessert (the Trolley, Last Orders, Gorge). Four courses, each faster than the last.
6. **Ending.** The Dessert Trolley is every earlier answer back to back, each landing as the next is called; then quiet, Last Orders, and he eats (Gorge) until he drops or calls Last Call. It shows the idea most plainly: you have been answering one tool at a time for eight minutes, and now you answer all of them.
7. **What does Hard change?** Faster casts and harder hits, the second half of Mince, belly flops, thrown cleavers, brandy in alternating stripes, a plate that leaves you Stuffed, a hook for the healer, and the Dinner Rush laid by the party.
8. **Luck.** The side Mince chops, the player Family Meal and Meat Toss pick, the two farthest who get casks: all random, all shown before they land (the glint, the marker that follows its player). Plate spots, meatball lanes and the Whisk spin are fixed for each place in the script.
9. **Tank and healer.** The tank takes Tenderize and chooses which wall the charge hits (and keeps the cleaver off the party). The healer gets Grease Fire every course, the burn of a floor that lights, and Gorge at the end.
10. **Its own.** A floor that keeps what you did to it (puddles become stains, stains burn), and a boss who never leaves the room: the only fight with no downtime.
11. **What will players talk about?** The Dinner Rush (Hard: laying the plates yourselves; Normal: running the same dance on plates already laid), and the stain they left that burned somebody later.

## What the review found

- Normal's Appetiser has 10 to 12 s from one cast to the next, with 4 to 5 s casts: more than half of it is waiting. A tutorial, but not a test.
- The Mains pair things only twice (Chop Chop, toss into meal). The pairs are the fight's rule, so the Mains should be full of them.
- The Second Sitting on Normal has the old rail (Order Up! with a Meat Toss behind it); the dance that makes Hard memorable has no Normal version, so a Normal player never meets the fight's best idea.
- Bots dodge everything at base gear because the gaps are long and the pairs are few.

## Changes (Normal only unless said)

1. **Appetiser, quicker.** The plain tools about 2 s closer together (not the Meat Toss, Family Meal and Larder Toss gaps: the puddles need the time to be healed through on weak parties), and one more round of the plain tools (Mince, Tenderize) before the Mains, so the Appetiser is as long as before and denser.
2. **Each course quicker than the last.** The header always said so; now the casts really do speed up: Mains at 0.94 of a Normal cast (carried through the Flare-Up), Second Sitting 0.9, Dessert 0.88 (Hard is 0.85 from the start). Dessert gaps 0.85. No cast shorter than Hard's.
3. **Mains pairs.** Two new pairs built from casts that already exist, so every journal entry and tell still applies: **Larder Toss with a Mince** 1.4 s behind it (the casks follow the farthest two while the glint names the half to leave) and **Family Meal with a Ladle Spin** behind it (the stack has to be made out past his reach). Chop Chop, the charge with the casks already down, the rail under Rolling Meatballs and toss into meal stay. The Mains gaps stay as they were (shortening them wiped weak-healer parties at the first toss into meal); the mealLadle pair sits after the larder set.
4. **Dinner Rush on Normal.** The Second Sitting's rail is now the Dinner Rush on both difficulties. Same choreography (he plants himself south of the pot, three beats: west chop, east chop with the lid, the ladle) and the same plate spots as Hard's answer, but the four plates are already laid from the cast, nobody is Stuffed, and the beats are slower (4.8 s to the first, 2.6 s apart; Hard 4 and 2.2). The chop is called Mince, not Double Chop.
5. **Hard stays as it is.** Its Dinner Rush still differs: the party sets the plates down where it stands, the order follows distance, each plate leaves you Stuffed, and the first beat is Double Chop. Hard's list of moves Normal never uses is unchanged apart from this (Double Chop, Clogged Drains, Belly Flop, Cleaver Toss, Mise en Place and Service!, Meat Hook, Tenderized, the plate placement).
6. **Journal and tutorial.** The Dinner Rush entries are no longer Hard-only: every hero says both how it runs and that on the hard nights the plates are set by the party. The tutorial-data Grubnak block says the same. No new cast names, so no new sounds, icons or voice lines.

## Kept

Telegraphs never hidden, 8 to 10 minutes, Last Call at about 10:00 (10:15 Hard), no HP-gate pushes or walls, tank and healer gaps under about 10 s, the closing passes ("Behind on Orders") for a slow party.

## Numbers (bots, 30 runs per seed set)

Normal, `GEAR=fresh`: before 20 of 20; after 89 of 90 (the bots dodge nearly everything, so the target of 85 to 90% was not reached without making weak base-gear parties unwinnable; their deaths now come in the Trolley and the Dinner Rush). Base-gear check line-ups (20 runs): Tidecaller 14, Cleric Aegis 20, Lanternkeeper 17 (before: 10, 20, 14). Hard, `GEAR=mid`: 47 of 90 (52%), unchanged.

## Cool-factor pass (2026-10-26)

*Ask: more fun and complexity without taking difficulty away; cool-looking moves, a dodge that feels earned (a visible whiff), Normal that really tests an expert group.*

**Looks (new `client/js/grubnak-fx.js`, GR_FX, hooked from boss-vfx.js impact, castStart and propFx; it only adds to the older landings).**
- The whiff, as in the Hollow King's file: a hero the blow did not take who stood within a body of its edge gets a bright streak past them, a ring and sparks, and a kitchen bit by move (steel glint for cleavers, a fleck of broth for the ladle, tin ringing for the lid, a tile chip for the charge and flop, staves for casks, a lick of flame for Flambé). Your own hero also gets a faint flash, a camera push and a soft whoosh. Never drawn for the hit or for anyone far from the edge, and never marks safe floor.
- Hit-stop and a camera push on the big blows (Mince, Ladle Spin, Lid Slam, Belly Flop, charge, Tenderize, and the charge ending against a wall or the pot), never more than once in a few seconds.
- Landings on top: the Mince cut line flashes across the whole kitchen and throws carrot, onion and tomato; the Ladle Spin flings broth in a ring; the Lid Slam rings, skitters tin glints and rattles to rest; the Belly Flop bounces a second time; the charge's wind tears down both sides of the lane; casks burst into staves with a hoop ringing off; Flambé's ignition runs the stripe; a plate comes up with a ding.
- Windups for the casts that had none: Mince and Cleaver Toss (the cleaver glints), Ladle Spin (broth stirred round him, faster and wider), Lid Slam (tin glints drawn in toward him), Belly Flop (dust and heavier beats under his feet), Larder Toss (thumps at the shelves), Flambé (brandy dripping), Rolling Meatballs (the slab).

**Normal, new pairs (same casts, so no new sounds or icons).**
- **Soup's On**: Ladle Spin with the Lid Slam landing 1.25 s after it (out, then straight back in). In the Appetiser's extra set, the Dessert Trolley (replacing the single ladle or lid) and, on Hard, in the Appetiser in place of the separate ladle and lid.
- **Mince with Tenderize** a second behind it (the tank takes the safe half and keeps the cleaver off the party): Appetiser extra set, Mains.
- **Butcher's Charge with Meat Toss** right behind it: clear the line, then spread.
- **Order Up! with Larder Toss**: the marked two stand at the edge of their plate and step across as the cask lands.
- **Whisk with Boil Over** between its last beams; **Larder Toss with Boil Over** close behind (Second Sitting).
- Each course quicker: Mains 0.92, Second Sitting 0.87, Dessert 0.85 of a Normal cast (Hard's floor is 0.85); Dessert gaps 0.76; the Second Sitting's long gaps close up by about an eighth (the Dinner Rush beats stay fixed).

**Hard.** Only change: the Appetiser's separate Ladle Spin and Lid Slam become Soup's On (one move fewer, a tighter one). Hard's list of moves Normal never uses is unchanged.

**Numbers** (bots, 30 runs per seed set 1000/2000/3000). Normal at `GEAR=fresh`: before 88 of 90; after 85 of 90 (94%, seeds 1000/2000/3000: 30, 28, 27; earlier tunings 83 to 86) (dodges are near-perfect for bots, so their losses still come mostly from healer pressure; the tighter pairs added about 4 points of loss, not the 10 asked). Hard `GEAR=mid`: 51 of 90 (57%; 17, 17, 17), before 16 of 30 on seed 1000.

## Fun pass 3 (2026-10-26): tank and healer beats, the ending, Hard shuffles

*Ask: a tank and healer beat every 20 to 30 s from existing moves (no new casts), an ending that peaks instead of trailing off, Hard sets in a new order each pull, a real trade-off for the charge into the pot. Tools: a timeline-gap script (scratch) listing tank beats (Tenderize, Butcher's Charge, a stack on the tank) and healer beats (raidwides, Gut Blast, Boil Over, stacks, Tenderize).*

**Before.** Longest stretch without a tank beat: Normal 99 s (Mains to the Second Sitting), Hard 85 s; without a healer beat: Normal 44 s (the Flare-Up), Hard 73 s. The Flare-Up ended on 9 s of nothing. The ending was a tail: the Trolley, 12 s of quiet, Last Orders, then Gorge. Hard never shuffled set order. The pot was strictly worse than a wall for the charge.

**What is in.**
- Helpers `busterWith`, `greaseWith`, `mix` (Hard shuffles the middle sets of an act, with order rules), `SS`/`secondOrder` (the Second Sitting's sets by name), and `tankScan`/`bestOrder`: Hard's shuffles try every order and keep one where the tank is never more than 50 s (Appetiser, Mains) or 45 s (Second Sitting, best effort) between cleavers and charges and no cleaver falls inside another's 30 s of Tenderized.
- Every added Tenderize starts only after the cast before it has ended and leaves its own 4.5 s before the next cast (a scratch script lists every cast cut by or cutting a Tenderize: none now, both modes). Normal: after the Soup's On set (the Mince behind it is a second later), after Flambé's cast, the Flare-Up's end, Mince in the Mains tail; Hard: after the Mince in the soup set, after the Grease Fire in the Mains and Second Sitting, after the Belly Flop in the Second Sitting's chop set, after Flambé. The Dessert opens 4.7 s after the last cleaver (it cut it before). Family Meal is a random target again on both difficulties.
- Hard shuffle: the Appetiser keeps one order now (soup set with its cleaver, then the larder set; the other order left the tank 60 s idle); the Mains' middle sets come in a new order (a rail is never followed by a rail, a Larder set or a Grease Fire); the Second Sitting runs in blocks of two that trade places inside the block (Mise en Place always two blocks before Service!). Worst tank gap on Hard over 80 pulls: 38 s Appetiser, 43 s Mains, 23 s Flare-Up, 49 s Second Sitting, 37 s Dessert; 49 s between any two beats. Hard healer gap is still up to about 70 s. Normal tank gaps: 58 s Appetiser, 69 s Mains (Normal's weak-healer line-ups lose clears to every extra cleaver, so Normal got only the beats above).
- The ending: Last Orders is cast 11.5 s after the Whisk's cast, about 4.5 s after its last beam (the 8 s tried first left 1 s); Gorge passes every 12 s on Hard and 15 s on Normal.
- The pot: stuck 5 s taking 30% more, but the ring round it has to be left first.
- Normal's Appetiser uses a seam of 11 s so the Gut Blast that goes with the casks is never cut off by the 80% gate (Mains opened with casks still up and the toss spreads overlapped).
- Hard damage was raised toward Normal's numbers (grease, buster, mince, ladle, whisk, spice, meatball, flop, cleaver, simmer, tower, tower fail, stuffed, gorge, heat, orders; spread and stack part of the way) to bring Hard back into band after the extra cleavers and the breath before Last Orders made it easier (61 of 90). No move hits softer on Hard than on Normal except spread, stack, puddle, cask, flambé, charge, stove, burn, slam and hook, which were already softer in the original.

**What was found and dropped.**
- Hard `GEAR=mid` fell from 51 to about 33 of 90 because of the first version of the ending, not the shuffles. Bisecting (each piece alone, same seeds): the Dessert trade-places swaps, Gorge every 12 s and Last Orders landing with the Whisk cost about 20 clears between them; the early Flare Tenderize and the Second Sitting shuffle cost a few each (within noise); the Mains shuffle cost nothing once rails were kept away from the Larder set. Dropped: the Dessert swaps (chop/ladle, jars/meal).
- Normal at `GEAR=fresh` fell from 85 to 76 because of (a) the gate cut (fixed by the seam and by restoring the original first sets) and (b) the added Tenderizes beside Larder Toss, Meat Toss, Lid Slam, the Mains' Grease Fire and the toss-into-meal, which cost the weak-healer line-ups (Alembist, Thresher, Ironpalm) a third to two thirds of their clears. Dropped those; Normal damage numbers are the original.

**Numbers (90 runs, seeds 1000/2000/3000).** Normal fresh: before 85, now 82 (91%; 26, 26, 30). Hard mid: before 51, now 53 (59%; 16, 20, 17). Base-gear line-ups (3 runs, the check's seeds), all at least 1 of 3: Cleric Aegis, Alembist, Oathbroker, Gloomsworn, Thresher, Lanternkeeper, Kenseier 2; Sentinel, Gorgemaw, Ironpalm, Threadweaver 3; Marionettist and Tidecaller 1 (Tidecaller is weak on its own: about 3 of 12 before and after). Timeline check passes (script 8:20 Normal, 8:44 Hard).
