# Caelum rework: a Grace that can be survived, and a finale with the fallen in it

*2026-10-25. Review: the afterimage-before-cut language and the meteor's shadow are what players will remember, and the Starwyrm and the Ascendant are proper set pieces, but he is the most to track in the game (complexity 10 on Hard), Grace Withdrawn takes everyone to 1 HP for 8 s so any chip damage kills, and the healer is the first to die in about one pull in six. Fun was 7 on Normal and 6 on Hard; the goal is 8 or more on both. More fun does not mean easier: Hard stays challenging but doable, and every clever layer stays.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** The star's chosen is calling down the meteor that has hung over every room of the set. He is calm and untouchable; the party fights him beneath its growing shadow until the sky itself comes down.
2. **What question does the fight keep asking?** "Where will he be next?"
3. **What is the rule a player learns?** He appears before he cuts: every cut is foretold by a silver afterimage standing where he will be, and the afterimages' numbers and facings show the cut. A dance nobody has seen can still be read. (New half of the rule, from this rework: when the fallen join in, they too are shown before they strike.)
4. **How does the fight warn?** The afterimages themselves, numbered and each turned to the next, with the whole dance painted on the floor before the first cut; the shadow, always in view, is the clock. Nothing is hidden on any difficulty.
5. **Acts.** Descent, Starfall, the Starwyrm (the wall), Ascendant (the seam: room, bar and music change), The Sky Comes Down.
6. **Ending.** A room the shadow has nearly covered and set alight, the last dance run through the ground it has left, and now the three fallen guards standing in it too (on Normal as well, once), then The Sky Comes Down.
7. **What does Hard change?** Faster casts, harder hits, the dance run twice with the second pass mirrored, the Starwyrm's return to dive, the fallen joining a dance every act, the Dark Ember, and a second Grace Withdrawn during a dance.
8. **Luck.** The order of the afterimages and where Starfall lands are random, but numbered and fully shown before the first cut; in the Anchored Wake the party places two of the points itself.
9. **Tank and healer.** The tank takes Cinder Crown and Pinning Thrust and aims the thrust at open floor; the healer gets Grace Withdrawn and Nightfall (the hardest heal check in the game) and now a flare at the end of every dance.
10. **Its own.** A duel in which every move is shown before it is made, and a countdown four bosses long that ends with the meteor landing.
11. **What will players talk about?** The afterimages, and the shadow growing over the room.

## What the review found

- The first Grace Withdrawn (about 70 s in) killed the healer at Nightfall in about 1 pull in 5 on Normal and 1 in 3 on Hard (bots), and a dead healer ends the run: this was most of the early wipes. Eight seconds is three casts; four heroes at 1 HP.
- Fire (the burning shadow, Cinder Crown's ring) kept ticking while everyone was held at 1 HP, and its damage (about 14% of a hero's health a second) was heavy for chip.
- Act IV: the burning shadow was the largest single source of hits taken (41 in 30 Normal runs), usually followed by a Horizon Cut.
- The healer's quiet stretches in Act I were over a minute; the Hard Act I Chorus sat in the Mirrored Wake two moves before Grace.

## Changes

1. **Grace Withdrawn is a heal check that can be done.** Nightfall comes 10 s after the grace leaves (Hard 9 s), up from 8. Every burning zone and fire puddle is held for the whole of it (the fire sits dim and dashed on the floor), so a hero at 1 HP is never hurt by the floor; only telegraphed cuts can still hurt, and those are ones the party already knows are coming.
2. **Hard Act I: the Chorus leaves the Mirrored Wake before Grace** (it joins the later Eightfold Wake instead) and Grace starts 5 s or more after the last cut.
3. **Fire is smaller.** Burning shadow ticks and Cinder Crown's ring are about 30% lighter (they stay a reason to move, not a clock on the party).
4. **A flare closes every dance** (Starlight, a raidwide on the last afterimage, with no new move name): the healer has something to do after each Wake.
5. **A Starfall in the gap.** In Ascendant, some Horizon Cuts drop a Starfall tower into their gap: the gap is the only safe floor and the soak is in it, so the party crowds into one lane and one of them stands in the tower. (Shown the whole cast; no new name.)
6. **Tank and healer beats.** Some Glints are aimed at the tank (he steps off the line, then follows Caelum to where he ends), and Cinder Crown throws embers on everyone a moment after it lands, so the tank and the healer have something in the gaps between big moves.
7. **The fallen at the finale.** On Normal the last dance of Act IV brings the three fallen guards' afterimages once (it was Hard only), so the finale is the set's sentence for everyone; Hard keeps one in every act.
8. **Tuning.** Hard HP 5.4M to 5.6M and Hard damage multiplier 1.24 to 1.32 (the Grace fix removed most of the early wipes, so Hard needed to bite elsewhere); Normal's enrage cast moves from 10:22 to 10:05; some Hard delays are trimmed so the Hard script still ends under 600 s (594 s). Normal's Chorus is a little lighter than Hard's.

## Kept

Telegraphs never hidden, the afterimage rule, the shadow and Starfall, the Starwyrm as the wall, the Ascendant as the seam, Horizon Cut's moving gap, Hard's Mirrored Wake, Second Coil, Chorus, Dark Ember and the second Grace during a dance, 8 to 10 minutes and one enrage.

## Numbers (bots, 30 runs per seed set, three sets)

Before: Normal `GEAR=post3` 22 of 30 on seed 1 (about 73%; target 85 to 90); Hard `GEAR=post4` 16 of 30 on seed 1 (33% over three sets; target about 50%).
After: Normal 83 of 90 (92%, clears at 485 to 575 s against an enrage landing at 613 s); Hard 49 of 90 (54%, clears at 510 to 610 s against an enrage landing at 615 s). The first Grace no longer decides the pull (it used to end 1 pull in 5 on Normal).

## Second pass (2026-10-26): enrage slack and the healer's single point of failure

Hard health 5.6M to 5.2M, damage multiplier 1.32 to 1.50, Horizon Cut's gap 170 to 135 wide (a tighter lane to earn), and the enrage cast 607 to 625 (slowest bot clears now about 606 s, about 20 s clear of the cast). Grace Withdrawn on Hard: the gap is 10 s (was 9), Nightfall 3800 (was 4200), the blade stays off a few seconds after Nightfall so the healer can catch up, and the hidden raidwides (Cinder Crown's embers, Starfall's rain) never land on heroes held at nothing. Bots, Hard `GEAR=post4`: 45 of 90 before; 61 of 120 after (seed 4000 is the low one). Normal `GEAR=post3` 73 of 90.
