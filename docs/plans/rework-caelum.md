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

## Tank move (2026-10-26): Trailing Cut

Why: the tank's own beats were Cinder Crown, Pinning Thrust and tank-aimed Glints, all lethal-weight or tied to a floor read, so the tank waited 30 s (Normal) to 39 s (Hard, Act IV) with nothing of their own, worst through the dances (nothing the tank does fits inside a dance).

The move, in his own language ("he appears before he cuts"): an afterimage always marks the tank. A red ring (circle, radius 135) is drawn round the tank and keeps pace with them; 1.15 s before the cut it stops, a silver copy of him stands in it (a one-image `climgs`, facing him) and he cuts where the tank stood. The tank steps out as it stops and chooses where to lead it: anyone standing close is cut too, and inside a dance the painted cuts are still on the floor. `aoe` with `follow` and `lockAt`, tag `clEcho`, cast `Trailing Cut` (anim `glint`), 2.8 s bar (Hard 2.38 s). Not a buster: it hits whoever is inside, the tank included, and never moves anyone.
- Normal 10500 base (about 11.3k after the 1.08 table), Hard 9800 (about 13.7k at `hardDmg` 1.40): about a third of a Crown. Bots dodge it (it showed up in the failed-hit list once in eight Normal runs).
- Where it sits. Hosted in dances: it is cast just after the dance's own bar (the dance's bar now shows only the lead, as the Grace-in-Wake dance already did), so the tank has a beat of their own inside every dance except the ones that carry a Hard Chorus ghost (Acts I and II) or the Grace (Act III's last Wake, Hard). In the Mirrored Wake it sits in the second pass in Act I (first pass in Act III, after the Grace before it). In the finale's fallen dance it is cast 4.4 s into it. In Act III's wall dance it is the same as the others. On its own: Act I replaces the plain Glint in the Grace block's pair; Act III has it ahead of the Starfall that carries Grace (so the tank has a beat 8 s after the Thrust before the 13 s hold) and ahead of the Normal Thrust (breaking the 25 s Crown-to-Thrust gap) and the Normal last Starfall. On Hard in Acts II and III a single ring sits in the carry of the Dark Ember (the carrier has the read; the tank has their own).
- Hard sharper: standing alone, a second ring is laid where the tank has stepped to 1.7 s after the first lands (delay 1.7 s, locks 1.05 s before), at 80% damage, so the tank walks out in a line.
- Hard draws: tank-gap caps tightened (Act I 32 to 28, II 36 to 29, III 36 to 30, IV 40 to 31); the echo counts as a tank beat in every draw. 120 pulls give 36 / 77 / 83 / 7 distinct orders per act.
- Numbers (scratch timeline of a clean party, longest wait between tank hits): Normal 30 / 31 / 31 / 26 before, 24 / 22 / 24 / 18 after (Acts I to IV); Hard 31 / 31 / 32 / 39 before, 26 / 27 / 30 / 30 after (worst of 40 pulls). What is left is the Grace hold (a tank at 1 HP gets no beat inside the 13 s of it).
- Tuning: Normal's table 6% to 8% up; Hard `hardDmg` 1.40 to 1.45 (a follow-up: at 1.40 the move left Hard at 56%, level with Corvane; the finale should be set 3's hardest: 1.44 gave 48 of 90, 1.45 gave 48 of 90 (61 of 120 with seed 4000, 51%), 1.46 gave 40 of 90). Bots, 90 runs per row: Normal `GEAR=post3` 78 (87%) before, 79 (88%) after; Hard `GEAR=post4` 46 (51%) before, 50 (56%; 65 of 120 with seed 4000) after; the weak line-up (Runeguard, Grovekeeper, Shadowblade, Pyromancer) 18 of 30 before and 13 of 30 after (about 45%).
- Tried and dropped: moving the wall dance's and the finale's echo later (cast 3.4 s and 5.2 s into the dance) to keep it clear of the Chorus ghosts: Hard fell to 34 of 90 for no tank gain.
- Journal: a Trailing Cut page for all 23 heroes. Sound: `bm-caelum-trailing-cut` (not yet in `sfx-synth.js` or `sfx-map.js`).

### Hard re-tune after the raid-host damage fix (2026-10-26)

- `raid-host.js` now hands the bots the boss's own `hardDmg` (they judge telegraphs by it). Hard `post4` at 1.45 read 42/90 (47%); 1.42 gave 51/90 (57%); `hardDmg` 1.435 gives 47/90 (52%; 14, 16, 17), the lowest of set 3. Hard stays about 1.23x Normal on the shared moves. Normal `post3` unchanged: 79/90 (88%; 27, 26, 26).

## De-cook pass (2026-10-26): room to damage between the moves

Why: after four density passes the fight was a string of stacked moves (melee on the boss 67%, ranged 87%, the most melee cut-offs per minute after the Hydra). Brief: pairs are seasoning; melee at least about 80% on Normal (about 72% on Hard), ranged about 90%, a quiet window of 6 s or more about every 40 s in every act. The challenge has to come from how hard each answer is, not from how little room there is.

What melee were losing (uptime harness, melee line-up, Normal): the Starwyrm's wall (26 s, no damage can land), Cinder Crown's ring (12 s, 168 to 250 out from the tank, which is exactly where a melee behind the boss stands: about 28 s a fight), the dances (about 35 s), Starfall, Horizon Cut lanes drawn far from where the party stands, and Glint's long dash.

Cut (uses, not names; every cast name is still in the fight):
- **Cinder Crown's ring** now burns 7 s (was 12) and runs 168 to 222 from the tank (was 250). It still marks where the Crown fell; it no longer eats the ground behind the boss.
- **The wall** is 22 s (was 26): the Starfall inside it is gone (Constellation Fall, the Embers and the Crown stay; the wall's Crown is the tank's beat).
- **Act I** (Normal 9 blocks, Hard 10, was 11): the pair of Trailing Cut and a tank Glint, the third dance on Normal (Hard keeps the Chorus dance) and the last Crown are cut; one hosted Trailing Cut left on Normal's Mirrored-Wake slot, Hard keeps its signature (Mirrored Wake with its Trailing Cut).
- **Act II** (8 blocks, was 11): one Starfall with a Thrust, one Anchored Wake, one Crown and the Glint after the rim Horizon Cut are cut. Pairs left: the first Anchored Wake with its Trailing Cut, the tank Glint with the Thrust.
- **Act III** (Normal 13, Hard 14, was 16): the Glint-and-Thrust, Starfall-and-Thrust and Echo-Thrust-Glint stacks, one Horizon Cut and one dance on Normal are cut; Grace Withdrawn's Starfall pair stays (the signature), the Trailing Cut that was its third part now stands alone in front of it (it keeps the tank's beat before the 13 s hold). Hard keeps its second Grace dance, Second Coil and Dark Ember.
- **Act IV**: the Glint before the Thrust is cut; leads lengthened.
- **Calms**: leads grew about 1 to 4 s on most blocks (a Normal script is 511 s, was 595; Hard 509 to 518 s; a named step now always comes within 16 s, a draw that would leave a longer silence after a long dance is refused), so a quiet window of 6 s or more follows about every third block.
- **Aimed, not random**: the first Starfall tower falls near where he is held; a plain or star Horizon Cut's gap is cut across where he stands (Act II's rim lane runs along the rim at his side); Glint dashes at most 480 (was 700). The party that holds him is no longer taken across the room by every move; the rest still have to read where the lane or tower lies. Crossed Horizon Cut stays fully random (it is the hard one).
- **Hard draws**: the act windows are now drawn again (up to twelve times) when none of their orders fits, so Hard never falls back to the written order (150 pulls: no fallbacks); caps 28 / 31 / 30 / 31 s for the tank. Normal's longest tank wait is 29 / 25 / 30 / 26 s, Hard's 24 / 25 / 29 / 30; with busters counted the healer's longest gap is 28 s or less (raidwides and flares alone: Normal 46 / 46 / 63 / 40, Act III is the loose one).

Uptime (harness, 10 runs per line-up, bots at `post3` Normal and `post4` Hard):

| | melee on boss | ranged on boss | quiet windows 6 s+ per run | moves overlapping |
|---|---|---|---|---|
| Normal before | 67% | 87% | 8.0 | 6% |
| Normal after | 80% (Act I 87, II 72 with the wall, III 81, IV 80) | 90% | 25 (5 to 9 per act) | 5% |
| Hard before | 69% | 90% | 4.3 | 5% |
| Hard after | 76% | 90% | 12.8 over shorter pulls (3 or more per act) | 5% |

Retune: health 5.2M to 5.4M on both (more time on him means faster kills; Hard clears at 534 s on average, Normal 517 s), `hardDmg` unchanged at 1.435. Bots, 90 runs: Normal `GEAR=post3` 79 (88%) before, 80 (89%) after; Hard `GEAR=post4` 47 (52%) before, 47 (52%) after (44 of 90 on an earlier run of the same script: 50% over 180).

Not changed: the wall is still the largest dead stretch (damage cannot land, melee 72% in Act II); shortening it further would crowd the breath, the Embers and the coil.
