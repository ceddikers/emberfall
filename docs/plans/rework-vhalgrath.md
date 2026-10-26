# Vhalgrath rework: the hunter who reads the party, and a finale that skims the crater

*2026-10-25. Review: the simplest read of set 2 (dive lines and landing circles clear, ground against air pacing works) at 7 out of 10 fun. Goal: fun 8 or more. The gripes: the lava chip was the main killer, the tank stood idle for 25 to 100 s between hits, Twin Pass showed its second dive late, and the last act was a plain ground stretch.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** The old tyrant of the Cinder Peaks hunts the party in his own crater. He walks after the one who holds him, then leaves the ground and comes down where he chooses; every breath he spits scorches the floor, and when he is hurt enough the burning heart in his chest opens.
2. **What question does the fight keep asking?** "Where is he going to land, and where will the ground break after?"
3. **What is the rule a player learns?** A dive is drawn before it is flown: the line of embers from the rim and the red ring where he comes down. And a landing is followed by something that wants you somewhere else (the ring that runs out from his feet, the next landing in the run). Learn to read the whole sentence, not the first word.
4. **How does the fight warn before it tests?** Every dive line and landing ring is on the floor from the cast; Twin Pass and Cinder Run draw every line they will fly at the start, faint at first and hot as they near, so the whole route can be read before the first landing.
5. **Acts.** Ground, First Flight, the Roost (the seam: he perches, shakes his burning scales loose, the whelps harry; then the Crater Boils), Ground Scorched, Final Flight, the Ember Heart (the wall), Last Ember.
6. **How does it end?** Last Ember opens on Cinder Run: he skims the crater and comes down on each of the three spots in turn (Hard: four landings), every line and ring on the floor at once. The one place on none of them is the middle of the crater.
7. **What does Hard change?** Faster casts and harder hits, the ground sets shuffled each pull, Wingbeat on the dives, Cinder Rain, Heart Flare, the Aftershock rings twice (the second ring closes in on his feet), Cinder Run comes down a fourth time, the third Heart Burn.
8. **Where does luck come in?** Which spot he lands on and from where is random but drawn in full from the cast; the breath and the Flare go to a random hero and are shown for the whole cast. Talon Dive goes to the tank's feet, so the party controls it.
9. **Tank and healer.** The tank takes Rending Claws, Tail Lash and now Talon Dive: he is the dive's target, and he chooses where the ground rings out afterwards (away from the lava, away from the others). The healer has the Roar and the claws, and a lot less scorched floor to heal through.
10. **Its own.** The only fight where the dive can be aimed by the party (the tank's feet) and the only one with a run of landings that has one safe place.
11. **What will players talk about?** The first time he dives at the knight, the ring that runs out afterwards, and Cinder Run's middle.

## What the review found

- The lava chip (a molten fan for 20 s after every breath, puddles for 14 to 16 s) was the main killer: 10 to 25 hits a run, and on Hard half of the deaths.
- The tank's gap between Rending Claws was 25 to 100 s (the claws appeared once a minute or less in the early acts).
- Twin Pass showed the second line only 3.5 s before it landed, so on Hard (with Wingbeat on top) it was read too late.
- Last Ember was five plain ground sets: no new idea at the end.

## Changes

1. **Lava trimmed (both).** The breath's molten fan lasts 12 s (Hard 14, was 20), the Magma Burst pools 9 s (Hard 11, was 14 and 16), and the molten tick is a little lighter. The Crater Boils ring still stays for the rest of the fight: the room shrinking is part of the idea, but it is no longer the way to die. Bots now take 1 to 4 lava hits a run (were 10 to 25).
2. **Talon Dive (new, both).** He dives at whoever holds him: the line runs from the rim to where the tank stood as the cast began, and the ring is the usual landing ring. The tank and everyone near him leave it. Sound: `bm-wyrm-talon-dive`.
3. **Aftershock (new, both).** After Talon Dive lands, the ground rings out from his feet: only the middle, by him, is quiet (the same rule as the Heart Burn's island: the bare middle is never painted). Hard rings once more, closer in. The party steps out of the landing and then back in: a two-step that follows from the first. Sound: `bm-wyrm-aftershock`.
4. **Twin Pass shows both lines from the start (both).** The second line and ring were laid 3.5 s ahead of the landing; now they are on the floor when the cast begins (faint at first, hot as they near), so Hard's Wingbeat can be planned for.
5. **Cinder Run (new, both; the finale's own).** Last Ember opens (after the Roar) with Take Flight and Cinder Run: three landings in a row, lines and rings drawn at once. Hard adds a fourth landing and Wingbeat on the first line. The same run comes round again in the closing loop. Sound: `bm-wyrm-cinder-run`.
6. **A beat for the tank every other set (both).** Rending Claws, Tail Lash and Talon Dive are laid out so the tank's gap stays near 25 s in the ground acts (it was up to 100 s), and the mid sets of the ground acts are pairs (a claws set with the move that follows it), so Hard's shuffle cannot open a wider gap. The longest gap left is the join of two acts (about 30 s), where the flight sets start.
7. **Scripts trimmed to the length rule.** More beats meant a longer script; the sets that were pure filler were cut so each act is 480 to 600 s of script in total (9:26 Normal, 9:37 Hard).
8. **Tuning.** Rending Claws now comes round more than twice as often, so each blow is lighter (Normal about a quarter less, Hard about a third less; a runeguard tank died to the old size every few claws). Every other hit but the floor fire and the whelps is 15% up on Normal (Hard as before). The Ashfall enrage on Normal starts at 9:42 and lands at 9:50 (was 10:12 and 10:20; Normal parties clear at about 8:15), Hard unchanged (10:22, lands 10:30). A Roar right after a claws set killed Hard parties in Act III, so the Roar there follows the pairs instead.

## Kept

Telegraphs never hidden, HP-gate pushes and the Ember Heart wall, 8 to 10 minutes, Ashfall as the single enrage, the island of the Heart Burn. Hard-only moves stay three: Wingbeat, Cinder Rain, Heart Flare.

## Numbers

Bots, three seed sets of 30 each (1000, 2000, 3000):

| | before | after |
|---|---|---|
| Normal, `GEAR=post1` | 25 of 30 (83%) | 28, 26, 27 of 30: 81 of 90 (90%) |
| Hard, `GEAR=post2` | 16 of 30 (53%) | 20, 18, 16 of 30: 54 of 90 (60%) |
| mean clear time | Normal 8:14, Hard 9:26 | Normal 8:15, Hard 9:10 |

The runeguard, grovekeeper, shadowblade, pyromancer line-up (the second one in the check) clears Normal 15 of 20 on two seed sets.

Lava hits per Normal run: 10 to 25 before, 1 to 4 after.

Tank beats (Rending Claws, Tail Lash, Talon Dive) in a bot run: the gap was 25 to 100 s before; now it is mostly 20 to 30 s, with the longest (40 to 50 s) at the joins of two acts, where the flight sets begin. Not yet the 10 s the design asks for, but the tank also has the Roost's whelps and the dive's positioning in the air, and the claws are close to as often as is sensible for one tank.

## Hard tuning pass (2026-10-26)

- **The Ember Heart wall (Hard).** Heart Flare no longer stacks with the burns: it comes in the quiet a few seconds after the second burn has landed, and the third Burn only starts more than five seconds after the Flare's spread has gone off. The Flare is tighter (stack and spread circles are smaller / the spread follows sooner) and hits harder; the islands of the three Hard burns are a little smaller (195 / 175 / 160). The wall is about ten seconds longer on Hard.
- **Tank beats.** A Rending Claws lands between the first two burns on Hard, the Roost's approach now has a Tail Lash instead of a Roar, and Final Flight's sets are re-ordered (Talon Dive, then Claws) so the longest gap in the flights drops from about 50 s to about 35-40 s. Gaps are mostly 20-30 s; the join of Act III into the flights (about 40 s) and the stretch between Twin Passes are the longest left.
- **Numbers (bots, seeds 1000/2000/3000):** Hard `GEAR=post2` 52 of 90 before the change in the wall, 85% right after moving the Flare, 58% (52 of 90) after the tightening; Normal `GEAR=post1` 76 of 90 (84%).

## Cool-factor pass (2026-10-26)

Look and feel only; no mechanic changed, so the bot numbers above stand (Normal `GEAR=post1` 76 of 90, Hard `GEAR=post2` 52 of 90, seeds 1000/2000/3000, checked again after the pass). Everything is in `wyrm-art.js`, drawn after the blow has landed or on top of a tell that was already there; no safe floor is ever painted.

- **Dives.** The landing circle gets a ring of heat that closes on its edge and arrives exactly as he does, then the edge goes white-hot. The lane gets chevrons running the way he flies (faster as it nears), a glow at the head, and both edges flare in the last half second. When he lands: a second and third ring, a fountain of embers coming down for a moment, ash off the pit's rim, a white-gold blink and a push of the camera with a hold (own screen only). When he passes over the lane: his shadow and a white-hot head with a long tail race down it, ash is flung to both sides.
- **The whiff.** A hero who stood just outside a dive's lane or landing, a breath, a lash or an Aftershock ring when it landed (within about 80 px, not hit) gets the blow's edge cracking past them: an ember streak, sparks, a ring of heat, and for your own hero a faint amber flash, a push of the camera and a soft whoosh. Only for heroes the blow did not hit; drawn after the landing, so it never shows where is safe.
- **Other moves.** Roar sends a last ring out to the wall; the breath rolls heat down the cone with embers lifting off it; Tail Lash whips pale arcs across its cone; the Crater Boils and the Heart Burn throw embers off the whole rim/floor with a bigger flash and push; Aftershock throws embers along its ring; a Rending Claws that lands on you holds the frame for a beat. The dive's windup on his body now draws heat along the wings with a pulse per beat.
- **Tried and dropped.** A Hard-only tail lash coming round behind him after each plain Dragonfall: the bots cleared Hard about eight points more often with it (the extra cast holds him still), so it would have made Hard easier. Not kept.

## Skill pass (2026-10-26): dodges that are earned

The cool-factor pass was looks only; this one is the gameplay half. Both changes are in the air, so he is untargetable meanwhile and bots' damage time does not move (the reverted Hard tail lash held him still on the ground and made Hard easier).

- **Searing Descent (new, both).** A Dragonfall that breathes as it lands: the line and ring come first, then a fan of fire sweeps out from his feet, three cones one after another (sound: `bm-wyrm-searing-descent`). The cones are laid about two seconds before the landing, the first aimed where a random hero then stands, the sweep running one way or the other (random). Same red cone as the breath, no lava left. The ring and the sweep are one problem: leave the ring, then move with the sweep, because a cone that has gone off is safe to stand in. Hard casts 15% faster, so the sweep comes quicker. It replaces the Magma Burst set in First Flight and the plain Dragonfall that opened Final Flight (the same script length).
- **Twin Pass crosses (both).** The two lines now always cross over the floor (picked from combinations whose lanes intersect), and the second follows closer (gap 2.6 s, Hard 2.2, was 3.2 / 2.7). A fired lane is safe, so the move is: out of the first, across it, clear of the second and its ring.
- **Journal.** New `Searing Descent` entries; Twin Pass entries rewritten for the crossing.
- **Numbers (bots, seeds 1000/2000/3000):** Normal `GEAR=post1` 81 of 90 and, after the last small tune (Normal sweep a little lighter, the sweep turns the other way each time), 74 of 90 (86% over both), Hard `GEAR=post2` 51 and 54 of 90 (58% over both). Bots take the sweep for about one hit in five runs; the rest of their deaths are the old ones (lava, the Heart wall).

## Fun pass (2026-10-26): beats for tank and healer, a shuffled Hard, a finale that peaks

All in `wyrm.js`; no new casts. Review findings checked in the code first: Act I's tank gap (claws 14 s to 51 s), Normal's wall with no tank beat, Act II on Normal with no raidwide, a Last Ember that opened on a second Roar seven seconds after the wall's own Roar (the top killer at the wall's end on Normal), a tail of old moves after the Run, Hard shuffles only on the two ground acts, and the Wingbeat landing 0.6 s before a dive.

- **Act I asks the question early.** One Dragonfall set (`claws`, Take Flight, Dragonfall) joins the ground sets, so the first flight comes at about 70 s on Normal. The lone Tail Lash set is gone (clawsTail has it). Tank gap in Act I: 25 s (was 37 counting claws only).
- **Beat-carrying sets and a checked shuffle.** Every flight now rides on a Rending Claws (or is a Talon Dive), so a shuffle cannot open a gap. `mix()` draws the order of the middle sets on Hard in every act (flights, Roost act, Final Flight, Last Ember, not only the ground acts) and rejects a draw that leaves the tank more than 30 s without a beat, puts two claws under 10 s apart, leaves the healer more than 32 s without work (claws or a hit on the whole party) or more than 64 s without a raidwide, or ends the act on a long wait. Act II opens on a Talon Dive and a Roar (Normal had no raidwide there) and carries Magma Burst on Normal where Hard has Cinder Rain; Act IV opens on a Talon Dive.
- **The Roost.** The buster comes right after he lands (before: Boils first), so the join into Act III holds no 40 s gap.
- **The wall.** Normal has a buster in the quiet after the first burn (it had none), and so does Hard, now after the burn and not cutting the next Heart Burn's cast. Hard also gets a buster after the Flare's spread and draws whether the Flare comes after the first or the second burn. The wall-end buster waits for the Roar's cast to end (it cut it on Normal).
- **Last Ember.** No second Roar at the start. Cinder Run opens (Take Flight 6 s after the wall), then the buster, then sets 9 s apart: Roar, a Talon Dive and its Aftershock, Twin Breath, claws into tail (Hard draws the order). Median 50-60 s; the Run is still the peak.
- **Wingbeat fairness (Hard).** The shove now lands 1.7 s before the landing (was 0.6 s), Searing Descent lays its cones after it, Twin Pass's second Wingbeat comes after the first pass has fired (1.5 s before the second landing) instead of 1.6 s behind the first, and Twin Pass's second cast starts as the first ends.
- **Hard hit size.** Hard's table sat about 15% below Normal's on every shared move. `hardDmg` is now 1.6 (fight.js default 1.25), so shared hits land about 1.05x Normal's; the floor fire, whelps, autos and Hard's own moves are scaled back by 1.25/1.6 so they hit as before. Normal's multiplier is 1.16 (was 1.15) to bring the clear rate back after the double Roar went.
- **Stale comments** (20 s of molten floor: now 12, Hard 14; the Aftershock note) fixed.

Bots (seeds 1000/2000/3000, 30 each): before Normal `post1` 74/90 (82%), Hard `post2` 54/90 (60%), Hard `post1` 50/90 (56%); after 79 (87%), 55 (61%), 33 (36%). The fixes alone put Normal at 98% and Hard near 70%, so the retune above (hardDmg 1.6, K 1.16) was needed.
Longest tank gap (bots, claws, Talon Dive or Tail Lash): Normal 25-29 in Acts I-III, 35 into the wall; Hard 25 in Acts I-II, up to 40-48 at joins on slow pulls. Healer (claws or a raidwide): 14-25 s; raidwide alone about 50 s in Acts I, II and IV.

### Review fixes (2026-10-26, second round)

- **Every written order passes `mix()`'s check** (`f.moves.orderOk`), so Normal's fixed order keeps the same rhythm as Hard's draws. Raid hits now count only real party damage (Roar, Feast, Magma Burst, Flare, Cinder Rain, Crater Boils, Roost); Twin Breath and the Aftershock are avoidable and no longer count. Limits: tank 30 s, claws 12 s apart, healer 36 s from claws or a raid hit (38 at an act's end), 75 s between raid hits. More sets in the middle widen Hard's draws: Ground and the Roost act 24 orders each (4 sets; the old tail sets moved into the middle), First Flight 24, Final Flight 44 (5 sets: Roar moved into a Tail Lash/claws unit and a Talon Dive unit), Last Ember 33.
- **Wingbeat has no cast bar of its own** (it replaced the dive's bar for the last 1.7 s); the telegraph carries it. The journal and sound keyed on that name need another trigger.
- **Normalised** Searing Descent's cones (half a breath on both, was 0.6 on Hard: 1.32x Normal) and the Take Flight gust (into KEEP). The Hard buster base is 17000 (hardDmg 1.7, so about 1.07x Normal's and about 1450 against a tank of 1600), with claws never closer than 12 s.
- **Last Ember peaks.** It runs from 10% to 3%: Roar, Talon Dive, Twin Breath, claws into tail, a dive that breathes (Searing Descent), Hard shuffling the order. At 3% he seals ("Last Ember" wall) and flies Cinder Run, three landings (Hard: four); when the last has gone off the seal opens and the last of him is left to burn down (a buster and Twin Breath; the slow-party passes follow). The fight ends on its biggest read.
- **Numbers** (hardDmg 1.7, Normal multiplier 1.15): Normal `post1` 81 of 90 (90%), Hard `post2` 48 (53%), Hard `post1` 55 (61%); the two check line-ups clear 19 and 18 of 20.

### Timeline fix (2026-10-26)

`check.js` measured 643 s (Normal) and 657 s (Hard), with the feed short for 14 s before the last course. Fixed without losing the peak: Final Flight now has four middle sets (the Talon Dive unit carries the Roar and opens 9 s after the last set; no trailing Tail Lash; 20 valid Hard orders), Last Ember has four sets (no Searing Descent) at 8 s gaps, and the finale lays out its own aftermath (a buster and Twin Breath after the seal opens) so the feed always shows three steps; the last course is only a short wait plus the slow-party passes. Script: Normal 9:39, Hard 9:53; the Vhalgrath timeline check passes. Bots (90 runs each): Normal `post1` 78 (86%), Hard `post2` 47 (52%), Hard `post1` 45 (50%); the check's two Normal line-ups clear on run 1.
