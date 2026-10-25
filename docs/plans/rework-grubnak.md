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
