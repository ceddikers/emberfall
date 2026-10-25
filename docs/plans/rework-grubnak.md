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
