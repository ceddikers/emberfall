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

## Tank move (2026-10-26): Pounce

The fun pass left the tank with a beat (Rending Claws, Talon Dive, Tail Lash) about every 25 s (Hard: 35 at the join into the wall and in Final Flight, 34 across Cinder Run). The claws are a near-lethal buster and cannot come oftener, so the new move is lighter and between them.

- **The move.** **Pounce** (sound `bm-wyrm-pounce`, pose `dive`): he coils for whoever holds him. A ring (r 125, Hard 135) is drawn on the tank from the first moment of the cast, follows them until 1.3 s before the spring (Hard's second spring: 1.2 s), then stays where it is. He springs and comes down in it (he is off the ground for the last half second), the ring hits everyone in it, and the floor in it burns for 5 s (Hard 6 s; a second and a half before it first burns). It belongs to the fight's question: where will he land? The tank decides. Take the landing and walk him out of his own fire, or step out of the ring and he comes down on empty floor, and the tank then has to bring him back round the pool with the party following. Melee who stand in front of the tank are in the ring too, so everyone reads it. It is the ground twin of Talon Dive (no line, no Aftershock, a quarter of the size).
- **Numbers.** Normal 10000 (x1.15 = about 0.43 of the claws), Hard 7600 (x1.7, 1.12x Normal's hit, about 0.45 of Hard's claws). Hard springs twice: the second a beat after the first landing (1.7 s to read, no second cast bar, like Twin Breath's second cone), at wherever the tank has gone, 5400 base (0.7x the first). Pool ticks as Magma Burst's puddles. Warning: 3.6 s of cast (Hard 3.06); the ring is on the floor the whole time.
- **Where it sits.** Every claws set that has room carries it: Pounce starts 6.5 s after its claws (the claws' bar is over, the next step still comes 12 s after the claws, so no set got longer): Act I's opener, its feast/roar sets (Hard: not the Cinder Rain set, which already runs 21.5 s), Act II's feast set, Act III's magma/feast/roar sets, Final Flight's magma set (Normal; Hard's Heart Flare set has none, so the Flare is never under a double spring), the tail set of the Roost act (5 s after the Roar, before the double breath), and on Hard in the wall a single spring in the quiet after the burn that precedes the Flare (so the wall's two long stretches are halved). The flight sets and the claws-into-tail sets are left alone (a flight is his own question; a tail is already a beat).
- **Order rules.** `orderOk` counts Pounce as a tank beat and the tank limit drops from 30 to 26 s; an act with a wall after it (Last Ember) must end within 9 s of a beat (`mix()` takes it as `endMax`), because the finale's Take Flight and Cinder Run are a long stretch with nothing for the tank. No Hard draw falls back, and Normal's written order passes.
- **Tank gaps (fire to fire of Rending Claws, Talon Dive, Tail Lash, Pounce; a clean party at each gate, Hard worst case over 100 draws).** Before: Normal Acts I-IV 25 / 25 / 32 / 25, the wall and Last Ember 20; Hard 25 / 25 / 32 / 35, the wall and Last Ember 34. After: Normal 25 / 25 / 24 / 25 / 20; Hard 25 / 25 / 24 / 25 / 26. Mean gap 22 s down to 16.5 (Normal) and 17.4 (Hard); gaps over 20 s fall from 72-76% to 32-43%. The 25 s stretches left are all flight sets (claws, then the flight and the dive, then the next claws): the tank's beat there is the position of the dive itself.
- **Bots** (seeds 1000/2000/3000, 30 each): Normal `GEAR=post1` 79 of 90 (88%; was 78); Hard `GEAR=post2` 44 of 90 (49%; the same machine and seeds on HEAD: 47 of 90, 52%). The bots step out of the ring every time (no Pounce hit in the 60 Hard runs logged), so the move costs them nothing but a walk; the Hard difference is chance. Deaths are the old ones (the Flare, the Heart wall, the breath).
- **Journal.** New `Pounce` entry for every hero. **Sound** recipe and icon suggestion: handed over (not in the sfx files here).

### Hard gear split (2026-10-26, leftover fix)

`raid-host.js` now hands the bots the boss's own `hardDmg` (1.7 here) instead of 1.25, so they read Hard's hits correctly. Re-measured on seeds 1000-6000 (30 each, 180 runs per figure): Hard `post1` 47% and `post2` 48%, with the gears barely apart (the Roar and the other party-wide hits are what a thin-skinned set-1 party cannot shrug off; single-target hits are dodged by both).

- **What changed (`wyrm.js`, Hard only).** The party-wide hits (Roar, Crater Boils, Heart pulse) are 5% up (`RAID_UP`), and the hits a party can dodge or avoid are eased (`EASE`: Heart Burn and the last-stand hit 0.85, Aftershock and the whelp blast 0.9, Cinder Rain, the Flare's stack and spread, the molten floor and puddles 0.85). Every shared move stays at least 1.1x Normal's (floor fire 1.15 / 1.11x; the Aftershock 1.12x). Normal untouched.
- **Numbers (bots, 180 runs each).** Hard `post1` 77 (43%), Hard `post2` 93 (52%); before 85 (47%) and 87 (48%). Normal `post1` 157 (87%). Findings along the way: +4% Hard HP cost about 17 points on both gears, so the HP and the enrage stay as they are.

### Hard buster to 1.1x (2026-10-26)

The Hard buster was 1.07x Normal's hit; Hard's base is now 17500 (about 1.10x). Audit of every shared move at the final numbers (Hard hit / Normal hit): Roar 1.18, buster 1.10, Tail Lash 1.15, breath 1.18, Magma Burst 1.15, Cinder Feast 1.13, gust 1.12, dive line 1.12, landing 1.18, Pounce 1.12, Roost scales 1.14, whelp blast 1.12, Crater Boils 1.18, scorch 1.14, Heart Burn 1.12, Heart pulse 1.35, Aftershock 1.12, last-stand hit 1.18, molten floor 1.15, puddles 1.11, autos 1.14. None under 1.1 (Wingbeat, Cinder Rain, the Flare and the second Pounce are Hard-only). To make room the raid-hit bump (`RAID_UP`) is 1.04 (was 1.05).

Bots, 180 runs each (seeds 1000-6000): Hard `post1` 77 (43%), Hard `post2` 95 (53%). With the buster at 1.10 and `RAID_UP` 1.05 they read 76 (42%) and 91 (51%); at 1.03, 82 (46%) and 95 (53%).

## De-cook pass (2026-10-26): room between the moves

Why: four passes in a day stacked moves into each other until there was almost no time to damage him (melee 69%, ranged 79%, acts IV and V the worst: melee about 50% on the boss). The challenge now comes from how hard each move is to answer, not from how little room there is between them. All in `wyrm.js`; no cast name was dropped (journal untouched, `journal-lint` clean).

- **A step every 14 s (`G`)**, not 12, and no two moves stacked by default. Pounce no longer rides 6.5 s behind its claws: it is a step of its own. Cut uses: 9 Pounces to 4 (Normal), the double breath after the Roar in Act III, the Roar-after-claws sets, Magma/Feast doubled in Act III, Searing Descent and a second Talon Dive in Act IV, a Talon Dive and a Roar in Last Ember, and the filler claws sets. Normal's script has about 46 named steps in the place of about 62.
- **Pairs kept (the signatures):** claws into tail (once an act: I, III, Last Ember), Twin Breath (Act III, Last Ember), Talon Dive with its Aftershock (Acts II and IV), Searing Descent (Act II), Twin Pass (Act IV, the crossing lines), the Heart wall and the Cinder Run.
- **Flights:** one flight per act is the rule of thumb. Act II: Talon Dive and Searing Descent (Twin Pass moved to Act IV, last in Normal's written order so a quick party meets the wall first); Act IV: Talon Dive and Twin Pass; Last Ember: only the Cinder Run. Ten flights in the script became six plus the Run.
- **Last Ember** is two sets (Twin Breath, claws into tail) 14 s apart, Hard drawing the order, then the Run. The wall itself (Ember Heart 28 s, Last Ember 14 s of script) is unchanged: the seal is the climax and it is the floor under the uptime numbers.
- **`orderOk`** (the Hard draw check; Normal's written order passes it too): the tank limit is 28 s (was 26), a claws-into-tail step counts the tail as a second tank beat (a fourth value on the step), and Ember Breath and Twin Breath count as light healer beats. Every act has valid draws (Acts I to IV 48-58 of 80 shuffles pass, Last Ember 80) and none falls back to the written order. The longest tank wait (fire to fire) is 28 s; the longest stretch with nothing named is 15.5 s.
- **Script length** (check.js timeline): Normal 9:11, Hard 9:31.

### Uptime (harness, 10 runs per line-up, Normal `post1`, Hard `post2`)

| | before | after |
|---|---|---|
| Normal melee / ranged on the boss | 69 / 79 | 77 / 83 (83 / 91 with the two seals left out) |
| Hard melee / ranged | 75 / 78 | 78 / 83 (84 / 91 without the seals) |
| quiet windows 6 s+ per run, Normal | 9.7 | 26.5 (median 9.4 s) |
| Normal act IV, melee (seal left out) | 69 | 80 |
| Normal act V, melee | 53 | 83 |
| overlap (two moves live) | 1% | 1% |

Per act, the quiet windows per run: I 6.5, II 6.7, III 7.3, IV 4.3 (93 s), V 1.8 (44 s): at least one about every 25-40 s everywhere. The Ember Heart and Last Ember seals (invulnerable) cost about 6 points of melee and 8 of ranged over the fight; they stay.

### Retune (bots, 90 runs per figure unless stated)

More time on him means faster kills and fewer deaths (Normal read 98% and Hard post2 70% with the new script), so the hits got harder, not the gaps shorter: Normal HP 4.8M to 5.2M (the clear takes about 8:45, the enrage lands at 9:50), Hard buster and every shared Hard hit up through K 1.0 to 1.06, `RAID_UP` 1.04 to 1.08 (the Roar, Crater Boils, Heart pulse). Normal `post1` 79 of 90 (88%); Hard `post2` 96 of 180 (53%), Hard `post1` 91 of 180 (51%). The gears still sit close (as in the leftover-fix note above): more room helps the thinner set-1 party, so `post1` reads above the 40-45 target; nothing tried (RAID_UP 1.10 read 33% on both, K 1.05 on three seed sets read 37% post1 but 52% post2, then 51/53 on six) separates them. Parity: every shared Hard hit is at least 1.1x Normal's (K 1.06 on Hard against 1.15 on Normal leaves the old ratios, a little higher).
