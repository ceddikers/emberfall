# Hydra rework: fair heads, a stump that remembers, a job for the tank

*2026-10-25. Review: the set's best idea (the cut order matters, the Heart replays it, stumps must be seared) held at 7 out of 10 fun; Hard was 6 out of 10 for fairness. Goal: fun 8 or more, Hard fair and tuned to its target.*

## Her answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** A flooded temple, and a mother who will not leave her pool. Her nine heads take turns at the party while she sits at the middle; whichever head the party cuts, she remembers, and at the end she plays them all back.
2. **What question does the fight keep asking?** "Which head is which, and what do they want?" Which to cut first, which stump to sear, and who stands where when the next head's turn comes.
3. **What is the rule a player learns?** What you cut is remembered. The first great head you cut grows back bigger, the stump keeps its element, and the order you cut in is the order she plays back. The stump now teaches this early (see "The stump remembers" below), so the Heart is a replay of something the party has already seen twice.
4. **How does the fight warn?** The head winds up with a glow, a lunge and a cast bar; the floor shows the whole shape from the cast. A stump bleeds and a blue ring opens at the foot of its column. An echo from a stump is the same head move, drawn the same way, and the cast bar names it "Stump Echo" first.
5. **Acts.** Three Heads, Six Heads, the Submerge (the seam: she dives, the temple floods), Nine Heads, the Mother's Heart (the wall), Last Heads.
6. **Ending.** The Heart plays the cut heads back in the order they fell, then the heads still standing, then the beat. It shows the idea most plainly: every choice you made comes back as a shape on the floor.
7. **What does Hard change?** Faster casts and harder hits, which head stands where each pull, Regrowth (a missed searing grows three lesser heads), Tidal Dance, Hydra's Gaze, and a harder bite from the body's Tail Thrash.
8. **Luck.** Whom each head aims at is random and always shown for the whole cast; the order the heads stand in is fixed on Normal and drawn on Hard; where the Submerge's heads break the surface is random and ringed first.
9. **Tank and healer.** The tank takes Rending Maul and now steps out of Tail Thrash between the Mauls, so the gap between his hits is short; the healer gets the Cry, Heart and the puddles the heads leave, with the heads no longer landing on top of the Cry.
10. **Its own.** The only fight where the party's choices are stored and played back at it, and where the add you leave alive grows back worse.
11. **What will players talk about?** The cut order, the Elder that comes back, and the Heart, when the stumps they chose to leave strike again.

## What the review found

- Hard's head round was 3.0 s with casts of 3.9 to 4.4 s, so two heads were always mid-cast; body moves (Cry, Maul) and puddles landed on top, and bots died when a spread, a Cry and ember puddles arrived within a second or two of each other.
- The Heart's last step fired every living head at once (up to six) plus the beat.
- Between Mauls the tank waited about 25 s with nothing to do, and the heads are inert so there was no add to hold.
- Hard cleared 76% at `GEAR=post2` (target 50 to 60%); Normal 10 of 12 at `GEAR=post1`.

## Changes

1. **Fair spacing.** The head round on Hard is 3.7 s at the least (was 3.0) and no head's cast lands within about a second and a half of a Cry, Maul, Gaze or Tidal Dance (the head waits, or the body move starts a moment later). Gaze and Tidal Dance also hold the head round for the length of the move, so nothing stacks on them.
2. **Tail Thrash (both difficulties).** The Mother's body keeps a three-beat rhythm now: Rending Maul, Tail Thrash (a red ring round her feet, a shorter cast), Mother's Cry. The tank and any melee step out of the ring after the Maul; the tank's gap between hits is under ten seconds. New cast, so a new sound (`bm-hydra-tail-thrash`) and a journal entry per hero.
3. **The stump remembers (both difficulties).** From the second great head cut, the stump of the head cut before it answers once: the cast bar reads "Stump Echo", the old stump flashes, and a gentler copy of that head's move fires from the stump. It takes the place of the next head's turn (it does not add to the round). This is the Heart in miniature, so the Heart's rule is learned in the first act. New cast, new sound (`bm-hydra-stump-echo`), a journal entry per hero.
4. **The Heart, staggered.** Echoes of the cut heads a little slower apart, then at most three living heads one after another instead of up to six together, then the beat.
5. **Hard only (unchanged list):** Regrowth, Tidal Dance, Hydra's Gaze, and Tail Thrash hits harder; Tidal Dance and Gaze are now alone on the floor.

## Kept

Telegraphs never hidden, 8 to 10 minutes, The Drowning at 10:20 (10:30 Hard), HP-gate pushes and the wall, tank and healer gaps under about 10 s.

## Numbers

Bots, 30 runs per seed set, three sets (`seed=1000/2000/3000`), default line-up (bastion, cleric, ranger, pyromancer):

- Normal, `GEAR=post1`: before about 10 of 12 (83%); after 79 of 90 (88%).
- Hard, `GEAR=post2`: before 68 of 90 (76%); after 50 of 90 (56%; the first rework pass, with the old Heart, had Hard at 52% but with three deaths in a row on the Heart as its commonest end).
- Every hit is scaled by one factor per difficulty (`HIT`: Hard 1.22, Normal 1.26). Mean clear about 8:45 to 9:00 (enrage 10:20 / 10:30).
- The scripted timeline is 9:44 Normal / 9:51 Hard (check: 480 to 600 s of script, no feed gaps). The Heart now lifts the seal's bookkeeping a head early (so the feed reads across the join) but keeps the floor under her health until the beat.
- `tutorial-data.js` has no Hydra block (only Grubnak's; briefings are hidden), so nothing there changed.

## Cool-factor pass (2026-10-26)

- **Undertow (both difficulties).** Tail Thrash now has a second half: a ring just outside the first (a breath behind it; a little shorter on Hard) that lands once the first has. Both are drawn from the start. Out for the first, then step in toward her or stay wide of both: the band between is struck. New cast and sound (`bm-hydra-undertow`), a journal entry per hero. The heads keep clear of the pair.
- **The next head rears.** A breath before a head casts, a ring closes on its base (for a stump about to answer, a pillar of light stands over the stump). It is the read for which head is up, which matters most on Hard where the order is drawn fresh each pull.
- **Looks.** Every head's cast gathers a charge ring at its foot and snaps with a burst; a cut head tumbles and ichor fountains from the wound; the Stump Echo is a ghost head rising and striking; Tail Thrash is a curl of tail round the ring; the Undertow is foam dragged inward; the Heart beats twice with a gold pulse down nine veins. The big landings hold the camera a beat.
- **The whiff.** A hero a blow just missed gets a crest of water thrown past them (for your own hero a flash, a push and a whoosh): `HY_FX.impact` now gets the landing's `hits` from boss-vfx.js.
- Bots, three seed sets of 30: Normal `GEAR=post1` 78 of 90 (87%), Hard `GEAR=post2` 47 of 90 (52%).

## Fun pass (2026-10-26)

- **Cutting is a choice now.** Every great head cut quickens the rest (about 3.5% off every gap of the head round per cut, up to six cuts, `rage`). Before, the round sat at its floor from five to nine heads, a head was 34k against 4.95M and "cut everything, gentlest first" was the bots' (and the obvious) answer. Now a cut buys fewer heads but a faster round, and the Heart is paid for in cuts: a stump never seared strikes harder in it (+0.2), and each head cut beyond the fifth adds a little to every echo. A missed Searing is also a small raidwide now (3.5 times the soak's hit), not a nuisance.
- **The seam.** A last Rending Maul goes in before the Submerge's dive (the tank had 33 s with no beat across the seam). Act III's end: Last Heads now starts with the Maul, not a Cry, so the tank no longer waits out the Heart.
- **The last stand.** About nine seconds after the Heart beats, the stump of the last head cut answers once more (two on Hard, the newest first) with the living heads holding their round (`salvo`). Same cast names as before (Stump Echo and the head's own move); it keeps clear of Cry/Maul landings.
- **Hard draws its big beats.** A Dance takes a Thrash's place and a Gaze a Cry's, positions drawn each pull with at least three beats between any two: Act I one Dance (the Tide head has already taught the lines), Act II two, Act III two Dances and two Gazes (was five big moves in all, now seven; Hard only).
- **Retune.** Heart 16600/16100 unchanged; every hit unchanged. Act II's rhythm is 18 beats (was 19) so Hard's script stays under 600 s.
- Timeline: script 581 s Normal / 590 s Hard (was 584 / 591); longest stretch with no tank beat 28 s on both (was 33 s at the seam and the Heart); longest with no raidwide 27 s Normal / 28 s Hard (the Cry; the heads' hits fill the rest).
- Bots, three seed sets of 30: Normal `GEAR=post1` 77 of 90 (86%), Hard `GEAR=post2` 45 of 90 (50%), Hard `GEAR=post1` 39 of 90 (43%). Line-up two (runeguard...) clears about 20% on Normal either way (8 of 40, same before and after).

### Review fixes (2026-10-26, second round)

- **Rage dropped.** The quickening round was a hidden rule with no tell and it broke the 3.7 s floor on Hard. Cutting still has visible costs only: a missed Searing is a raidwide, an unseared stump and every head cut beyond the fifth make the Heart's echoes hit harder. Said plainly: cutting is still mostly favourable (fewer heads, a faster Heart-free fight), so "cut everything, sear everything" remains the sound answer; a visible cost that made it a true trade-off would need a new move or a Heart that grows longer, and a longer Heart killed the bots (60 to 70% on Normal).
- **Hard's big beats all take Thrash slots** (a Dance or a Gaze, drawn, at least three beats apart), so the Cry is never lost: longest stretch with no raidwide 27.8 s (28.9 s Normal), tank 28.7 s.
- **Body casts never overlap.** Every body move reserves its cast time (`bodyEnd`), the Submerge waits for the seam's Maul (dive now 8 s / 7.2 s after the Maul starts), and two Mauls are never started closer than 13 s (the seam's Maul is skipped if the tank had one in the last 17 s). Act II is 19 beats again (ends on a Cry, so the seam Maul has room) and Act III 23 (ends on a Thrash, not a Cry before the closing Cry).
- The last stand replays in the order they fell, like the Heart. Hard's HIT is 1.24 (was 1.22).
- Bots: Normal `GEAR=post1` 78 of 90 (87%); Hard `GEAR=post2` 42 of 90 (47%); Hard `GEAR=post1` 45 of 90 (50%) (post1 sits above post2 here; the first pass had 43%).

## Cutting is a read (2026-10-26, third pass)

*A blind review found the cutting choice solved.* Before this pass:

- **The dominant strategy.** (1) Cut every great head as soon as it can be reached: a head is 34k against a boss of 5M, so a cut is nearly free, and it takes a full-power turn out of the round. (2) Cut the gentlest element first (Acid), because the first great head cut returns as the Elder, then the nastiest; keep the nastiest for after the fifth cut, because the Heart replays only the first five. (3) Sear every stump: a missed searing costs a raidwide and two or three heads, a searing costs a ten-second walk, and the soaker is excused from the Venom stack. None of it depended on the pull. The element ranking was fixed, the price of a cut did not depend on where the head stood, what stood beside it or which head was up, and the journal said as much ("gentlest first, always"). The bots played exactly that (`PLAN`).
- **Why.** The costs of a cut (the soak, the echo, the Heart) were flat numbers, and the one question on the benefit side ("which head returns?") had one answer. Nothing on the board could change which head was right to cut.

**The change: the necks recoil.** Cutting a great head jerks the necks beside it. The nearest live great head each way round the ring rears (the ring that already closes on a head's base before it casts) and lashes out with its own move at half strength, ahead of the turn that was due. It rides the same queue as the Stump Echo, so the heads' floor between casts holds and the body's beats are still kept clear. A stump beside a stump has one live neighbour, the last head standing none. Nothing new to draw, no new cast name: the lash is the neighbour's own move, whole shape on the floor from the cast.

What a cut costs now depends on the board, and the board is drawn: **Normal draws which head stands where each pull too** (it was fixed; Hard already did), and Act III's three places likewise. So:
- the first cut returns as the Elder (wants a gentle element) and wakes its neighbours (wants gentle neighbours): on one pull the gentle head sits between two savage ones, on the next it does not;
- the nastiest head wants cutting, but wakes whatever stands by it, so it is better cut once its neighbours are cut (a stump beside a stump wakes one head, not two);
- Act I's three heads are equally far apart, Act II and III fill the ring, so who is "beside" whom changes with the act and the draw;
- the lash takes a turn's slot, so cutting when the next head up is a savage one and the neighbour is mild is a gain, and the other way about a loss (the rear ring shows who is up).
The Heart's replay, the Elder and the unseared Heart bonus are as before. Searing is unchanged in rule; what changed is what happens while the ring is open (the lashes land in its ten seconds, aimed at random heroes, the soaker included).

**Bots.** The bots no longer follow a fixed list. `prio` in hydra.js prices each great head as its place in `PLAN` plus 0.35 times the places of the heads its cut would wake (from the same `neighboursOf` the lash uses), and cuts the cheapest. Two tries at "the read" went worse on Hard, which is itself the evidence that the choice is real: nastiest-first after the first cut (and the first cut by its neighbours rather than its element) took Hard `post2` from 42 of 90 to 28 of 90 and, with the first cut forced gentle, to 16 of 90. Gentlest-first with the wake as a price is what holds.

**Numbers** (three seed sets of 30; before, measured today: Normal `post1` 78 of 90, Hard `post2` 42 of 90, Hard `post1` 16 of 30 on one seed set, 45 of 90 in the earlier pass):

- Normal `GEAR=post1`: 84 of 90 (93%; a little over its 85-90 band; Normal's HIT 1.26 to 1.29 changed little, the lash being half strength).
- Hard `GEAR=post2`: 41 of 90 (46%; the band is 50-60, today's baseline was 47%; Hard's HIT 1.24 to 1.22 moved it by noise; the knobs left are HIT and the lash's `RECOIL`).
- Hard `GEAR=post1`: 37 of 90 (41%; band 40-45). Post1 and post2 sit close together here, as in the last pass.
- Not changed: the tank's beats (Mauls and Tail Thrash as before), the Heart, the Elder, the script length, the Cry/Maul keep-clear rule (the lash looks for a clear landing too).
- Journal: every hero's meet line and Searing entry no longer say "gentlest first" and now say to read what stands beside the head (lint clean).

### Tuning follow-up (2026-10-26)

- **Hard eased, Normal tightened, nothing quiet.** Hard `HIT` 1.22 to 1.17, with the four moves whose Hard base sat under Normal's (Cry, Heart, pools, Submerge's rising head) raised to Normal's, so the raidwides hit as before and the rest about 4% softer. Normal: `CYC` 17.5 to 14.5 (the heads come round faster; the bots cut quickly, so the round seldom sits at the floor and `GAP_MIN` made no difference), Tail Thrash 8400 to 9200, Undertow 7000 to 8200, Venom Bloom 28300 to 29800. The lash's `RECOIL` stays 0.5 on both (a different one per difficulty would put Hard's lash under Normal's).
- **Shared moves, Hard against Normal** (base times `HIT` times the 1.25 Hard multiplier): the lowest are Mire Spit 1.12 and the equal-base moves at 1.13; all 19 are at or over 1.1.
- Bots, three seed sets of 30: Normal `post1` 78 of 90 (87%); Hard `post2` 45 of 90 (50%); Hard `post1` 43 of 90 (48%; a little over its 40-45 band, post2 taking priority). Two intermediate Normal runs (`CYC` 16.4, `GAP_MIN` 3.15, thicker hits) stayed at 84 of 90.

## De-cook pass (2026-10-26)

*The Hydra was the stacking outlier: 18% of the fight with two moves live, 1.3 quiet windows of 6 s a run (acts 2 and 4 almost none), melee 66% on the boss.*

- **A breath after every Cry.** The body waits 7 s longer than a beat (Normal and Hard alike) and the heads hold their round for the same stretch (`quiet()`), so after each Mother's Cry there is a calm of about 10 s with nothing live and the Mother targetable. Acts are laid out by length (`rhythm(span, ...)`) rather than by beat count, so the acts keep their length and the script is 9:16 Normal / 9:22 Hard (the timeline check passes).
- **Tail Thrash every other round on Normal** (Hard keeps every one, and the Dance and Gaze still take Thrash slots). Maul and Cry keep the beat; the Undertow still follows every Thrash. The melee hands lose most ground to the Thrash and the Searing walk.
- **Normal's `CYC` back to 17.5** (the 14.5 tuning pass is undone); `GAP_MIN` unchanged. Two heads in one cast now overlap in under 1% of the fight: the overlap that remains is the Thrash with its own Undertow and the Searing ring (10 s) open under a body move.
- **Hard**: same breath; `HIT` 1.17 to 1.16 (shared-move ratio stays above 1.1). The challenge stays in the hits and reads (Gaze, Dance, Regrowth, the draws), not in the lack of room.
- Cut: about a quarter of the body's casts on Normal (a Thrash in alternate rounds), about a quarter of the beats on both (the breath replaces them in the same time). Every cast name still appears; journal untouched, lint clean.
- **Uptime (10 runs per line-up, bots, Normal post1 / Hard post2)**: melee on the boss 66% to 73% (plus 9% on adds), ranged 84% to 83% (adds 10%); quiet windows of 6 s or more 1.3 to 13.6 a run (median 11 s), in every act but the Submerge; overlap 18% to 12% (Hard 13% to 8%). Hard: melee 71% to 73%, ranged 84%, 11.8 windows a run (median 11.8 s; about one per 30 s, more room than the ~50 s asked).
- **Tank and healer**: within an act the tank's longest wait is about 30 s on Normal (24 s in a no-Thrash round), 33 s on Hard; the Cry comes about every 33 s (the heads' hits fill the rest). The seam and the Heart gaps (35 to 45 s) are as before.
- **Bots** (three seed sets of 30): Normal `GEAR=post1` 81 of 90 (90%; was 87%); Hard `GEAR=post2` 47 of 90 (52%); Hard `GEAR=post1` 54 of 90 (60%, above its 40-45 band: post1 and post2 sit close together here, as before). Noise is about 10 points: Hard `HIT` 1.15 gave 56 / 60%, 1.17 gave 44 / 54%, 1.21 gave 42%.
- Check: Hydra's timeline, both Normal clear line-ups and Hard runs clean pass in `check.js`; the run's other failures (Grubnak, Skitterra, Caelum timelines, Skitterra and Morrow-Oak bots) are other bosses' work in progress.
