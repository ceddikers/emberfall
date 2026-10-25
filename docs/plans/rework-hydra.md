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
