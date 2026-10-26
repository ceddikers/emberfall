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

## Cool pass (2026-10-26): spectacle, and dodges that feel earned

Brief: more fun and complexity without taking away difficulty: signature moves look spectacular, and a dodge should be something the player did, not something that happened to them.

- **Crossed Horizon Cut.** The same cast and sound, but two cuts at once at different angles: the only bare floor is where the two gaps meet (a diamond somewhere in the middle of the room, never painted). Normal: once in Act III (gaps 260 wide, a cut hits at 65% of a single one); Hard: once in Act IV, the last Horizon Cut (gaps 200 wide, 80% of a single hit). Single Horizon Cuts and the star-in-the-gap version are unchanged. The two cuts share one hit group, so standing in both red bands is still one hit.
- **Afterimage cuts.** The next image to be cut gathers light into itself and flashes its blade in the last beat; when a Glint or a Wake cut lands, silver copies of him stand along the line as he passes and come apart one after another, and a crescent of the blade's last arc is thrown through the figure at the end.
- **The whiff.** Anyone a cut did not take, but who stood within a body's width of it (or slipped clean through it on a dash), sees a sliver of light drawn past them, silver pieces and a ring at their feet; the player at the keyboard gets the camera's flinch and a flash at the edge of the screen. Same for Horizon Cut, the Starwyrm's coil and Second Coil's dive, and for whoever made the dark of the star in time for Constellation Fall. Purely visual: nothing changes who is hit.
- **Screen-feel on the big ones.** The meteor's shadow sends a pressure wave out across the floor (and the room shudders) every time it grows, and a ring back in when a Dark Ember pushes it; the Starwyrm's summon, rear and breath, a caught Starfall (light up the arms of whoever took it) and a missed one, the razor edges left where a Horizon Cut's gap was, and a camera hold on a Glint.
- **Tuning.** Normal's fire (Cinder Crown's ring, the burning shadow, its embers) a little lighter (2100 to 1900, 2200 to 2000, 2800 to 2700) to pay for the crossed cut. Bots: Normal `GEAR=post3` 81% before, 79 of 90 after (seeds 1000 to 3000; 106 of 120 with seed 4000); Hard `GEAR=post4` 52 of 90 before, 45 of 90 after (50%).
- Journal: all 23 Horizon Cut pages now say two cuts can come at once and where the safe floor is.

## Fix (2026-10-26, review of sets 2 and 3)

Dark Ember barely mattered: a set ember shrank the shadow for the rest of its act, and the next form's shadow and the burning shadow of the last act were set fresh, so the Hard-only move had almost no payoff. What the embers did now stays for the fight: each ember set at the edge keeps the later shadows 20 smaller, each one missed lets them 20 further in (at most 20 in all). Bots, Hard `GEAR=post4`: 30 per ember gave 54 of 90 (60%, was 45 of 90), so 20: 46 of 90 (51%). Normal is unchanged (no embers).

## Fun pass (2026-10-26): tank and healer beats, drawn acts, one read at a time

Brief: lift both difficulties toward 8.5 to 9 without making the fight easier or harder overall; no new casts.

- **Acts are now lists of blocks** (one move, or two a few seconds apart), laid out by `sets()` in `caelum.js`. Normal plays them in the written order (timings kept). Hard draws the middle of every act each pull, in threes (the same load arrives at about the same time, so a party behind or ahead meets the same fight; a full shuffle cost the bots 15 to 25 points). An order is kept only if the tank's longest gap stays under 32 to 44 s (by act), no stretch passes 28 s without a tank hit or a heal beat, no two Crown/Thrust hits are closer than 9.5 s, two dances never run back to back, and the act's rules hold (Act I: Grace not before 60 s, the Mirrored Wake not before 48 s, a dance and Grace never neighbours; Act III: the two Graces 50 s apart, a Second Coil dive and a dance never neighbours).
- **Tank beats.** Act I: the Mirrored Wake now comes after the first Thrust, and a Crown sits before Grace (it used to follow it), so the 44 s tank gap is gone. Plain Glints in the Thrust pairs of Acts II and III are aimed at the tank, and Act III gained a Thrust on one Starfall, so the longest Hard tank gap in 40 drawn pulls is 37 s (it was 44 to 58 in Acts I and III), Normal 34 s (was 40).
- **Healer beats.** Mirrored Wake's Starlight now closes the first pass as well as the second (a beat in the middle of the longest dance); Act IV ends fallen dance, Crown, Grace Withdrawn, crossed Horizon Cut (the Crown moved from after Grace to before it, so the finale ends on the two heal checks, not on a tank hit).
- **One read at a time (Hard, Act III).** The Dark Ember moved off the Mirrored Wake onto a Starfall, as in Act II (it is carried alone, and the next block waits until it is set down); the Chorus moved off the Mirrored Wake onto the first dance up in the sky; a Second Coil dive and a dance never neighbour. The Hard-only Grace inside the last Eightfold Wake stays: it is the intended peak, and nothing but the painted cuts can hurt a hero held at 1 HP (the fire is held, the flare and the hidden raidwides skip them, the blade is off).
- **Horizon Cut's first taste in Act II** (Normal and Hard): one single cut, its lane running along the rim and clear of the star and its shards (a lane 290 wide on Normal, 230 on Hard). A narrow lane at the rim killed bots in about a fifth of pulls; the wide one costs about seven points.
- **Bugs fixed.** Grace Withdrawn (with the third Starfall) began 0.8 to 1.6 s before the towers landed and cut the Starfall's cast bar: it now starts as they land; Dark Ember began 0.25 s before Starfall's cast ended (now 4.6 s in); the last Horizon Cut of Act III and the Crown that opens Act IV overlapped their casts (lead 4 to 5); stale header (Hard "25% more damage" is `hardDmg`); a no-op `H ? 10 : 10`.
- **Not changed.** Hard's enrage cast stays at 625 s (Normal 605 s): Hard fights run longer by design, and the slowest bot clears still land about 20 s before it; the script ends 9:43 to 9:57 on Hard, 9:42 on Normal.
- **Tuning.** `hardDmg` 1.50 to 1.43 (the Hard draws put heavy moves into the part of an act a party sees, so the bots lost about 10 points). Bots, 90 runs per row. Normal `GEAR=post3`: 79 before, 83 after (92%). Hard `GEAR=post4`: 46 of 90 (51%) before; 47 of 90 after on seeds 1000 to 3000 (52%), 58 of 120 with seed 4000 (48%).

### Review round (2026-10-26, same day)

- **More orders on Hard.** Act I now draws from its second block (only the opening Glint is fixed; the Mirrored Wake waits for 40 s and Grace for 50 s, instead of 48 and 60), and the three-block windows start one or two blocks in on some pulls. Distinct orders seen over 300 pulls: Act I about 30, Act II about 40, Act III 15, Act IV 7 (the finale keeps the fallen dance before its last three blocks, which may now come in any order but Grace last; the strike order of the fallen is drawn as before).
- **Floor-only blocks.** Horizon Cut, Second Coil and the dances count as floor-only; three in a row are refused. A clean Horizon Cut or Starfall no longer counts as healer work in the gap checks; the cap on tank-or-healer idle time stays 28 s, the cap on a healer with no raidwide, Grace or flare 46 s. Worst drawn healer gap (raidwides and Grace only): about 60 s before, 46 s now; with tank busters counted, 31 s at worst.
- **Cast bars.** The wall's Cinder Crown now begins at 16.7 s (after the breath's bar) and its Starfall at 21 s; the wall lasts 26 s so the Ascendant no longer cuts the Starfall. The Eightfold Wake that carries Hard's second Grace shows its bar only for the lead; the cuts run on and Grace's cast starts 5 s in without overwriting it. Act II's head Starfall waits for Act I's last Crown. What remains: the Crown at the end of Act II can still overlap the Starwyrm's summon, because the wall opens on the boss's health, not on the clock.
- **Normal Act II.** The rim Horizon Cut is followed by a tank-aimed Glint again (both difficulties), so the Thrust-to-next-beat gap is no longer idle. The rim lane is narrower: 230 wide on Normal, 170 on Hard (later lanes 190 and 135).
- **Retune.** Normal's damage table is 6% up except Nightfall, Embers of Heaven and Constellation Fall (they keep Hard's 1.1x over them); Normal's Act III Thrust moved 5 s later so a Crown and a Thrust sit 25 s apart. `hardDmg` 1.43 to 1.40. Bots, 90 runs per row: Normal `GEAR=post3` 78 (87%), Hard `GEAR=post4` 46 (51%, 61 of 120 with seed 4000). The second Normal line-up (Runeguard, Grovekeeper, Shadowblade, Pyromancer) clears about 45% of 30 runs, down from about 80% before the fun pass; it still clears in the check's three tries.
