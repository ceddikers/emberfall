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

## Tank move (2026-10-26): Skewer

*Ask: the tank still waited 30 to 70 s between things of their own, because Tenderize and Butcher's Charge are the only tank beats and are too heavy to come more often. One new, light move for the tank on both difficulties.*

**The move.** **Skewer**: he hurls a skewer along a line from himself through his tank (cast pose `throw`; a narrow red line drawn from the cast, out to the far wall). The line follows the tank until 1.3 s before it flies on Normal (1.0 s on Hard), so there is a moment to step off it. Type `buster` with `aimFromBoss`: the tank takes a light hit (Normal 5500, about a sixth of the tank's health; Hard 6100, x1.11), anyone else on the line takes 0.7 of it and the bots keep off it. Nothing is hidden, nothing safe is painted, and it never moves him.

**Why it fits.** The fight asks "where do I stand?" and the tank's answer is where the whole kitchen is held. The line runs out from wherever the tank stood, so the tank decides which half of the room it sweeps and whether anyone is behind them on it; and it can be taken or sidestepped after the lock (a read the party can see in the red line). It is not a cleaver, so it does not touch the Tenderized rule.

**Where it sits.** In the calm stretches, never inside a cleaver's cooldown window: Hard's `tankScan` now counts it as a beat and `bestOrder` refuses any order that puts a skewer within 8 s of a cleaver or a charge (`minSk`); the Hard sets that end on one (`sk()`, the next set's opening delay gives back what the skewer took, `fit()`; a Tenderize or charge never follows closer than 8.5 s, a rail, the Dinner Rush or a Belly Flop never closer than 8.5 s so the skewer has landed first) are the Mains' meat-toss and chop sets, the Second Sitting's spice, larder, mise, whisk, meal and Dinner Rush sets; inside sets: the Appetiser's toss-and-meal and larder sets. Both difficulties close the Flare-Up on one and the Gorge passes carry one between each Gorge (Normal 5.5 s after, Hard 6.5 s after). Never on a rail (Order Up!): skewers after the two rails cost Hard about 4 clears in 30 on their own (the rail's plates and Stuffed leave no room for a second line to read), so those two tails were dropped.

**The numbers.** Longest stretch the tank waits between beats (cleaver, charge, skewer), worst over 80 Hard pulls:

| | Appetiser | Mains | Flare-Up | Second Sitting | Dessert Trolley |
|---|---|---|---|---|---|
| Normal before | 58 | 69 | 37 | 56 | 34 (then 90 s of Gorge with none) |
| Normal after | 31 | 34 | 25 | 30 | 34 (Gorge now has one every 15 s) |
| Hard before | 38 | 46 | 40 | 49 | 37 |
| Hard after | 24 | 35 | 25 | 32 | 37 |

Normal's script ends about 19 s later (Last Orders at about 8:39), Hard's about 38 s later (9:22). The Hard Dinner Rush also ends on one skewer. The longer Hard script left 152 s between raidwides in the timeline check, so Hard's Family Meal set in the Second Sitting now carries a Grease Fire.

**Bots** (90 runs, seeds 1000/2000/3000). Normal `GEAR=fresh`: before 82 of 90 (26, 26, 30), now 84 of 90 (29, 27, 28). Hard `GEAR=mid`: before 53 (16, 20, 17), now 54 (18, 13, 23; seed 3000 measured before the Grease Fire below was added). The first draft (9800 on Normal, a skewer after the rails, a skewer between the Ladle and the Lid, seam 11) cost Normal 7 clears and Hard 11. What fixed it: the damage down to 5500 / 6100; the Normal seam raised from 11 to 14 (the skewer after the casks moved the soup set two seconds later, so the 80% gate cut the Appetiser at once and the Mains' first charge-and-toss landed on people still healing the meal; this was the cause of most Normal losses); no skewer between the Ladle Spin and the Lid Slam on Normal (cost about 3 clears in 30); none after a rail on Hard.

**Journal.** `Skewer` for every hero (no spoilers beyond the move itself; both difficulties). **Sound** is not in the repo yet: `scratchpad\newmoves\grubnak.md` has the recipe `bm-grubnak-skewer`.

## De-cook pass (2026-10-26): room between the moves

*Ask: after four density passes the stacking of two moves had become the default rhythm and there was almost no time to damage him. Pairs are seasoning now; the challenge comes from how hard each answer is, not from how little room there is.*

**Cut (both difficulties unless marked).**
- Normal: Soup's On in the Appetiser (the single Ladle Spin and Lid Slam stay as the first read; Soup's On stays in the Dessert), the Mince-then-Tenderize chain after it (one cleaver pair stays), Butcher's Charge with Meat Toss (the Mains open on the charge alone), Order Up! with Larder Toss, the Larder Toss with Mince behind it, Family Meal with a Ladle Spin behind it, the second rail with Rolling Meatballs is kept on Hard only (Normal's rail stands alone), the Mains' mid Meat Toss and Family Meal sets, the Mains' tail Chop Chop, the Spice Rack with a ladle or lid behind it, Whisk with Boil Over (the Boil Over now lands after the Larder Toss casks with room), Whisk with Meatballs (the extra Whisk set is gone), Family Meal with a second Spice Rack, the Second Sitting's Gut Blast and the Mains' Gut Blast (the Appetiser keeps the teaching one), the Dessert's Mince, Spice Rack and Whisk.
- Hard: Belly Flop out of the Mains (it stays in the Second Sitting), the plain first rail, Cleaver Toss out of the rail (it stays in the Dessert), the mid Meat Toss into meal (the tail one stays), Spice Rack's ladle/lid, Gut Blast, Whisk with Meatballs, Whisk's own set, Family Meal's second Spice Rack, the Dessert's Meatballs and Spice Rack, one Mise en Place skewer; the Tenderize behind Grease Fire and behind the Belly Flop gets 2.5 to 3 s of air. Every cast name still appears.
- Gaps: Normal's Mains gaps are stretched (x1.15), the Second Sitting's (x1.2) where they were closed up before, the Appetiser's head is slower.

**Kept (the signatures).** Appetiser: the cleaver pair (Mince, then the Tenderize behind it). Mains: Chop Chop, the rail with Rolling Meatballs under it (Hard), toss into meal at the tail, the charge into the casks. Flare-Up and the Simmer out/in. Second Sitting: the Dinner Rush (Hard: the party lays the plates), Larder Toss then Boil Over, Hard's Tenderize with the Meat Hook. Dessert: Soup's On, Meat Toss with Meatballs under it (Normal), Cleaver Toss and Double Chop (Hard), the closing Gorge. Skewer and the tank beats stay (tank longest wait: Normal 33 s, Hard 36 s; healer 34 s Normal, up to 41 s on some Hard orders).

**Fixes found on the way.** (1) The HP gate cut the Dinner Rush half-way when it landed inside that set (the next seam was more than `seam` away), starting the Dessert's Flambé on top of the plates: it was behind many Normal wipes at 335 to 360 s. The Rush's skewer/grease tail is now its own set (the seam falls after the last plate) and the Second Sitting's `seam` is 20; the Mains' is 13 (an Order Up! rail is never cut) with its closing starting at 14 so the join stays clean. (2) The Mains opened straight after a Family Meal on slow Appetisers and the charge-with-toss killed two at once at about 98 s; the Mains now open on the charge alone. (3) Cask edge gap 26 to 32 (the coordinator's note).

**Hard asks more of every answer.** Hard damage numbers x1.12 on every move except Skewer (`HARD_UP`), Hard HP 4,225,000 to 4,470,000, Normal HP 3,415,000 to 3,900,000.

**Uptime** (harness, 10 runs per line-up, melee/ranged on the boss, moves overlap, quiet windows of 6 s or more per run):

| | before | after |
|---|---|---|
| Normal fresh | 73 / 94, 10%, 9.4 | 82 / 97, 3%, 21.3 |
| Hard (mid A; melee line-up B at full gear, since B cannot clear Hard at mid) | 67 / 95 (B mid), B full 70 / 96, 6% , 13.3 | B full 74 / 97, 2%, 13.5; A mid ranged 96, 3%, 12.9 |

Normal windows per act (act length): Appetiser 4.7 in 105 s, Mains 7.9 in 141 s, Flare-Up 1.0 in 49 s, Second Sitting 6.5 in 102 s, Dessert 1.2 in 68 s.

**Bots** (90 runs, seeds 1000/2000/3000). Normal `GEAR=fresh`: before 84 of 90, now 88 (30, 28, 30). Hard `GEAR=mid`: before 54, now 56 (18, 20, 18). Check: Grubnak's timeline (Normal 9:14, Hard 9:17), all 13 Normal line-ups and Hard runs clean pass; journal-lint clean. Journals: the Order Up! (casks), Whisk (pot boils over) and Spice Rack (ladle or lid after) entries lost the sentence about the pairing that is gone.

**Follow-up retune (2026-10-27).** Asked to bring Normal (88 of 90) and Hard (56) toward their bands with hits, not density. Damage is now built as `mkDmg` with three knobs (`NORMAL_UP`, `RAID_UP` for the unavoidable raidwides, `HARD_UP`) and Hard is never under `HARD_MIN` 1.1x Normal's number on any shared move (spread, stack, puddle, flambé, charge, cask, stove, burn, slam, hook were under it before and are now raised to it; Skewer is 6100 vs 5500, 1.109x). Hard HP 4,470,000 to 4,450,000. What the sweeps showed (bots, 90 runs): Normal fresh does not move with HP alone until the clear time nears the enrage (4.9M HP with the enrage at 600 s gave 80 of 90 with all damage at 1.1x, 1.2x on raidwides), but then the base-gear line-ups in check.js cannot clear (four of thirteen fail at 4.3M with the damage raised, two at 4.15M with none), and any rise in Normal's damage lifts Hard's floor past its band (Hard fell to 26 to 33 of 90 once Normal's numbers were 1.15x to 1.3x). So the knobs are left at 1.0 and Normal stays at 3.9M HP (88 of 90 fresh, all 13 line-ups clear); Hard 4.45M gives 43 to 45 of 90. Not done: the tank's longest wait (33 s Normal, 36 s Hard); a Skewer or cleaver moved into the 153 to 186 s Mains stretch trades the healer's gap for it.

**Last tweaks (2026-10-27).** Hard HP 4,450,000 to 4,350,000: Hard `GEAR=mid` 54 of 90 (17, 17, 20), so Grubnak Hard is no longer below the Hollow King. Tank waits: Normal's Mains open Charge, Tenderize, Skewer, Chop Chop (the skewer sits in the gap before Chop Chop); the Second Sitting's Spice Rack set opens on its skewer, and the Larder Toss carries one before the Boil Over. Hard gets back the Mise en Place skewer. Longest tank wait now 31 s Normal, 30 to 31 s Hard (some shuffles); healer 31 s Normal. Normal stays 3.9M HP (89 of 90 fresh, all 13 base-gear line-ups clear). Check: all passed, timeline 9:20 both.
