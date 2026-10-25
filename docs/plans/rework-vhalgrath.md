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
