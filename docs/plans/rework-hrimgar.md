# Hrimgar rework (2026-10-25)

Goal: lift Hrimgar, the Frost Titan, from 7/10 to 8+/10 on Normal and Hard. A review found the floor rule (ice, cracked, frozen, water) clean and memorable, and these weak points: wading the black water while dodging huge arcs (the Long Night, and the Sweep anywhere near water), the frost-slide throwing you about, a last stretch that was only the older moves again with nothing of its own, and a Normal that bots cleared too easily. Bots before: Normal 28 of 30 at `GEAR=post1` (target 85 to 90%), Hard 60% at `GEAR=post2` (target 50 to 60%).

## Hrimgar's answers (docs/DESIGN.md, "Finding a fight's idea")

1. **What is happening in this room?** The Warden of the White Reach stands on a lid of ice over a black lake that is older than the road. Every blow he lands cracks the lid, and the winter wants the lid back. The party fights on a floor that remembers what was done to it.
2. **What does the fight keep asking?** "What will the floor do?" (and, late: "where will I be standing when it does?")
3. **The rule a player learns.** A sheet is what has been done to it. Red means it will sink; sunk it is black water (burns and slows) until a Whiteout or the dark; frozen it glances every blow, is never painted, and is slick underfoot. Ground can be changed, and where a marked hero stands when the frost lands decides which ground will be safe. The rule explains moves the party has not met: Fault Line (cracks everything it crosses except the frozen), the Avalanche (every sheet in a lane that is not frozen), Breath of Winter, and the last act, the Lake Rises.
4. **How does it warn?** The floor is the warning, on both difficulties: a cracking sheet is red for the whole cast, the Grasp circle follows its hero until a second before it lands, the lanes and the rows are painted from the start and the safe ground is simply the ground that is not painted. Nothing is hidden.
5. **Acts.** I. The Thaw (the floor learns to sink). II. The Freeze (frost, the braziers, Frostbite). III. The Crack, opened by the Long Night (the seam). IV. The Avalanche, with the Plateau Tips as the wall at 10%. V. Last Winter (new): the Lake Rises.
6. **How it ends.** Winter's Grasp marks three heroes, and the frozen sheets under them are the only ground that will be left; then every other sheet is painted red and goes under, row by row, and the water stays for the rest of the fight. The last of him is fought on the islands the party chose with where it stood. It is the floor rule as a final exam, and the lesson of the Long Night ("the marked choose the ice by where they stand") paid out.
7. **What does Hard change?** Casts 15% faster and 25% more damage; Glacial Stomp, Breath of Winter and Titan's Grip; three frost islands in every Grasp; the middle sets of each act shuffled per pull; a third wave in the Plateau Tips; the Lake's rows sink in a random order, and the Titan's Grip comes down on the islands in the last act.
8. **Where luck comes in.** Who is marked by the Grasp, the Slam, the Fault Line and the Sweep. Every one is shown for the whole cast (the circle follows its hero, locks a moment before it lands), and for the Lake the party sees the islands form under the marked three before a single sheet is painted.
9. **Tank and healer.** The tank takes Glacial Fist (now also paired with the Slam, the Icefall, the Sweep and the Howl so there is a blow to meet about every half minute) and walks the boss; the healer gets the Howl, the Whiteout, the Long Night, the Frostbite stack and, in the last act, the Lake.
10. **His own.** A boss whose ground is the mechanic, whose finale is built from the party's own choices.
11. **What players will talk about.** Grasp into Fault Line (the frozen ground the line cannot cross), Frostbite into a Sweep while slowed, the Plateau Tips, and the Lake: closing in on the marked three and standing the last of the fight on the ice they made.

## Changes

Fixes to the weak points
- The Long Night's opening blow freezes the lake over, so its huge arcs are never danced with black water underfoot (before, the water of the acts before could still be there).
- The frost-slide shoves a shorter way (78, was 105), so a run onto a frozen sheet no longer carries you into the lane or the water beyond.
- Nothing in the last act is a wide arc: the Sweep is not used once the lake is up, because there is no dry ground to step round it on.

New: **The Lake Rises** (both difficulties, the last act, cast name `The Lake Rises`). Winter's Grasp marks three heroes; where they stand when it lands the sheet freezes (the old frost thaws). Then the Titan casts the Lake: every sheet that is not frozen is painted red at once and goes under, row by row from the south (Hard: any order), and no sheet comes back (no Whiteout, no thaw) for the rest of the fight. The Icefall comes thicker in the last act (eleven shards, was eight) and the Hard Grip lands on the islands. Sound `bm-titan-the-lake-rises` (sfx-synth, sfx-map), drawn badge in boss-icons.js, journal entries for all 23 heroes.

Moves that follow one another (no new names, so no new sounds): Sweep into Slam, Fist into Icefall, Fist into Sweep, Fault into Slam, Howl into Fist (all started so the second begins as the first lands, never overlapping casts), Grasp into Fault Line (the line skips the frozen sheets), and Frostbite into a Sweep (the chilled hero, slowed, has to walk to a brazier and also step out of an arc; on Hard in the Crack, on Normal in the Freeze and the Avalanche).

Bots (`bots.js`, Hrimgar blocks): when the Lake is the next step, the party closes in on the boss so the marked sheets join; once most sheets are marked or under, they stand on the frozen ones nearest the boss.

Unchanged: telegraphs never hidden, one named enrage (Endless Winter) with the slack kept (about a minute Normal, about 45 s Hard), HP gates at 74, 48, 22 and the wall at 10%, Hard's three moves Normal never uses.

## Results (bots)

Numbers: Normal health 5.15M (was 5.55M) and Normal hits 12% heavier (the new combos and the Lake cost a party time, and the weaker base-gear line-up in `check.js` needs room before the enrage); Hard health 5.5M (was 5.6M) so the enrage keeps its slack.

- Normal, `GEAR=post1`, 90 runs (three seed sets of 30): 81 clears, 90% (was 28 of 30 on one set); clear time about 8:05. The weaker Hrimgar line-up in `check.js` (runeguard, grovekeeper, shadowblade, pyromancer) clears about 47% (14 of 30), as before.
- Hard, `GEAR=post2`, 90 runs: 51 clears, 57%; clear time about 8:50 against the 9:58 enrage.
- Before the Lake was given a bot rule, bots stayed where the water rose and drowned; the two bot rules in `bots.js` (close in at the Grasp that chooses the islands, then stand on the frozen sheets) fixed that. A first version with the Sweep in the last act killed bots and would have killed players the same way (no dry ground to step round an arc), so the Sweep is not used there.
- `tutorial-data.js` has no Hrimgar briefing (only the first four bosses have one), so nothing was added there.

## Cool-factor pass (2026-10-26)

Looks (`titan-art.js`): a frost whiff beat (a streak of ice past a hero a blow just missed, a frost ring and thrown snow; for your own hero a pale flash, a push of the camera and a soft whoosh), hit-stop and camera pushes on the big landings (guarded so they never stack), the Sweep's wind running along the arc and its edges kindling in the last moments, a ring of frost closing on the Slam and the Icefall, an aurora beam behind each falling shard, black water pressing in at the edges of a cracking sheet and a column of water and widening rings when it sinks, a crack running ahead of the Fault Line's crystals, a second wave from the Howl and the Slam.

Play:
- Black water numbs rather than slows at once: the legs go heavy only after a little over half a second in it, so a quick crossing keeps its pace and a hero who lingers (or is chilled and wading when a Sweep arrives) can still leave it in time. This answers the rescore's trap of a slowed hero in the water when a Sweep arrives.
- The Sweep now has a backhand (both difficulties; Hard's is longer, wider and harder, Normal's smaller and slower). It appears just before the first blow falls, follows the same hero as they dodge and fixes late, so the first dodge has to leave room for a second. It is drawn violet-edged with its wind running the other way. Moves that follow a Sweep wait for it. The Long Night's arcs are unchanged.
- The two Icefall shards on heroes follow their hero and fix a moment before landing (the others stay where they were thrown).
- No new cast names, so no new sounds. Journal: the Sweep and Icefall entries for all 23 heroes carry the new counterplay.

Bots after (90 runs, three seed sets): Normal `GEAR=post1` 77 of 90 (86%); Hard `GEAR=post2` 51 of 90 (57%).

## Fix (2026-10-26, review of sets 2 and 3)

Winter's Grasp landing on a red sheet froze it, but the sheet still sank a moment later, under the hero who froze it. Freezing a red sheet now calls its sinking off (its red is cleared and it does not hit). Bots unchanged: Normal `GEAR=post1` 77 of 90, Hard `GEAR=post2` 51 of 90.

## Fun pass (2026-10-26, set 2 and 3 pass)

Found before changing: Glacial Fist gaps of 51 s (Act I), 67 s (II), 78 s (III) and about 70 s from the last Avalanche set to the end of the Plateau Tips; Howls 88 s apart in Act I; Act I was seven single moves; Hard shuffled Acts I-III only. The first deaths of failed Hard pulls named the main killer: at the Act II to III seam the closing pass's Howl landed 1 to 7 s before the Long Night's opening raidwide (each is 50 to 70% of a non-tank's health), which killed the healer first. It hit Normal and Hard alike and cost Hard post2 most. The other early killer was a Sweep over water in the first minute of Hard (Sweep-and-Slam drawn first).

Changes (all in `titan.js`, no new cast names):
- Fist now rides with more of the fight's own moves: Fist into Twin Slam, Fault Line, Breath of Winter, Titan's Grip or Glacial Stomp (Hard), Howl into Fist in Acts I, II, IV and the start of Last Winter, and a Fist in the middle of the Plateau Tips (while the first lanes run). Normal's Act I Icefall set is a Howl into Fist; Act II and III Twin Slam sets and Act III's Grasp-and-Fault set are Fist pairs.
- Sets carry their length, so a set begins only after the previous cast ends (fixed: Slam cut by the next Fist in Normal Act I, the Tips Howl cut by the Fist, and an act or the wall opening on top of a closing-pass cast).
- Hard's middle sets (Acts I, II, III and now IV, its Grasps kept in place) are drawn per pull but only to orders that keep a Fist at least every 38 s (the first within 30 s in Act IV, which the party often leaves early), something for the healer at least every 34 s, no two Fists within 14 s, no two raidwides within 12 s, no two of Hard's new moves side by side, and no Sweep-and-Slam in the first minute. Act III's constraints leave only two orders.
- The Long Night waits until its opening raidwide would land 15 s after the last one (its blow is 15% lighter). Closing passes before it start 2 s later so no cast is cut.
- Last Winter: after the Lake, Howl into Fist at once, then a Rime Slam (it cannot crack frozen sheets: on the islands it is a test of where each hero stands), Fist into Icefall, then Howls (Hard: the Grip).
- Hard: `hardDmg` 1.42 (was the default 1.25) and health 5.7M (was 5.5M): the fixes above removed the seam wipes and early Sweep deaths that were doing Hard's killing, so Hard had to bite honestly.

Gaps (cast-timeline harness, Fist landings): Normal tank 30/38/34/33 s per act (was 51/67/78/70); Hard 34/40/43/33 (the 43 is a Long Night seam that waited for the healer). Healer (Fists, raidwides, stacks): Normal 25/24/27/33, Hard 33/25/26/33; raidwides alone are still far apart in places (the Fists carry the healer there).

Bots, 90 runs each (three seed sets), before to after: Normal `GEAR=post1` 77 to 80 clears (86% to 89%), clear time about 8:05 (the enrage slack stays about two minutes: raising Normal health to close it dropped the weak check line-up from about 45% to 13%); Hard `GEAR=post2` 51 to 53 (57% to 59%), clear about 9:10 against the 9:58 enrage; Hard `GEAR=post1` 62 to 41 (69% to 46%). Hard post1 beating post2 was the gear table, not a Hrimgar bug: post1 holds all four 4-piece set-1 bonuses (+9% health) while post2 trades pieces away for 2- and 3-piece set-2 bonuses (+7% health), and the seam wipes sat exactly on that edge. Check line-ups: the four-class post1 line-up cleared 8 of 8, the weak runeguard line-up 2 of 5 (10 of 30 in 30 runs).

### Review round (2026-10-26)
- The Hard shuffle now lists every order of an act's free middle sets and picks one of the valid ones with equal chance (the earlier scoring always kept the best of 80 draws, so almost every pull got the same order). Act II gained a Frostbite-and-Sweep and a Twin Slam, Act III a Twin Slam and its Whiteout joined the drawn sets. In 30 pulls the distinct orders per act were 13 / 29 / 18 / 14 (was 14 / 4 / 4 / 12 with Act III the same 97% of the time).
- One Fist clock for the whole fight: a Glacial Fist never lands less than 16 s after the last (an act seam, a closing pass or the wall's Fist waits; the wall's middle Fist is skipped if it would not fit before the next frost). Smallest gap in the harness: 16 s.
- The Long Night's casts now follow one another (arcs, frost, and the tank's Fist between the second and third arc), so no bar is cut; the act opens with a Fist, and the Night is about 40 s long (it was 24 with overlapping bars). Last Winter's tail has a Fist before the closing passes, which carry one every 30 s.
- Header and doc: Winter's Grasp freezes three sheets on Hard and two on Normal; the Lake's Grasp always three.
- Numbers: Normal damage x1.14 (was x1.12), Hard `hardDmg` 1.46 (was 1.42) to pay for the kinder seams. Bots, 90 runs: Normal post1 82 clears (91%), Hard post2 52 (58%), Hard post1 59 (66%; post1 keeps its 4-piece bonuses, so it stays above post2). Line-ups: four-class 8 of 8, weak runeguard 12 of 30.

## The tank's own move: Icebreaker (2026-10-26)

Found before changing: the tank waited 30/38/34/30 s (Normal, Acts I-IV) and 38/40/36/47 s (Hard) between blows of their own, with the first blow 33 s into the fight. Glacial Fist takes most of a tank's health (Hard 141%), so it cannot come more often than every 16 s.

**The move** (`Icebreaker`, both difficulties, tag `tiice`, pose `slam`): his fist comes down on the sheet the tank stands on. A short cone at the tank (a lighter Fist, tank only; others in the cone take the usual cleave), and **where the tank stands when it lands, that sheet cracks**: red for the whole warning (4.6 s), then it sinks, so the tank steps off. It is the floor rule aimed at the tank, and the rule's other half pays: **a frozen sheet glances the blow** (a third of its weight, nothing cracks), so a tank who has read the ice, above all the ice Winter's Grasp has just made, leads the Titan onto it. The Last Winter's islands already are that ice. **Hard**: the sheet behind the tank, on the line from the Titan, cracks as well (the tank steps to the side, not back).

Numbers: Normal 11400 x1.2 (the Normal multiplier, see below), Hard 10300 x1.46 = about 46% of Normal's Fist, no longer than 3.8 s cast (Hard 3.2). A Fist never lands within 9 s after an Icebreaker, an Icebreaker never within 9 s of a Fist or 14 s of another (a runtime wait like the Fist's 16 s clock, and a rule in Hard's draws). The "outside the Fist's 16 s window" of the brief was read as 9 s: a 30 s stretch cannot hold a Fist, a lighter blow and a second Fist 16 s apart on each side.

Where it sits (kept inside the scripts' lengths: Normal 582 s, Hard 578-588 s, so most of it replaces tank-less sets or rides inside one):
- Act I: the head Slam gives way to an Icebreaker (the first thing the tank does is read the floor; Normal keeps the Slam after it), and a second one sits in the middle sets. First beat now at about 20 s (was 33 s).
- Act II: Winter's Grasp opens the act as Grasp-into-Icebreaker (the tank takes the first blow on the new ice), and the Whiteout set is Icebreaker-into-Whiteout.
- Act III: the Long Night has an Icebreaker on the ice its first Grasp made (the seam's tank gap had no beat but one Fist), Whiteout is Icebreaker-into-Whiteout, one more sits in the middle sets.
- Act IV: one in the middle sets (Normal replaces the Twin Slam, Hard the lone Frostbite); in the Plateau Tips the Icebreaker takes the middle Fist's slot when that Fist would not fit (it used to be skipped: a 47 s wait).
- Hard's draws (`mix`): `mk` lists where the Icebreakers land; the tank (Fist or Icebreaker) never waits more than `TANK_MAX` 30 s; an Icebreaker keeps clear of Fists and of other Icebreakers; Act IV's first beat within 24 s. To keep the script under 600 s Hard lost Act I's second Howl-into-Fist (its Stomp is now Fist-into-Stomp), Act II's second Frostbite-and-Sweep and Act III's Twin Slam; Normal's Act IV Twin Slam became an Icebreaker. Distinct draws per act 10 / 18 / 15 / 12 (was 11 / 12 / 9 / 9).

Tank's longest wait between beats (cast-timeline harness, Fist and Icebreaker landings; the first beat is not counted):
- Normal Acts I-IV: 30/38/34/30 -> 27/30/30/30 (in the full script 25/29/26/30).
- Hard Acts I-IV, worst of 30 draws: 38/40/36/47 -> 27/29/29/33.

Bots, 90 runs each (three seed sets), before to after: Normal `GEAR=post1` 82 to 86 clears (91% to 96%: the acts have more sets, so the closing passes that used to run when a script ran out of sets come less often; Normal damage x1.14 to x1.2 to win some back, the weak runeguard line-up stays at 13 of 30, was 12); Hard `GEAR=post2` 52 to 50 (58% to 56%); Hard `GEAR=post1` 59 to 46 (66% to 51%: nearer its 40-45% target, still above post2 because of the gear table). Normal's x1.2 is a compromise: x1.25 gave 84 of 90 but only 9 of 30 for the weak line-up.

Not done here: the `tiice` tell (the generic spike and cone are drawn), a boss-icons badge for `Icebreaker`, and a glance effect (the blow just takes less).
Sound: `bm-titan-icebreaker` (recipe in the lead's `newmoves/titan.md`). Journal: `Icebreaker` for all 23 heroes.

## Numbers pass (2026-10-26, leftover fixes)

`raid-host.js` now tells the bots the boss's own `hardDmg`, so Hard was re-measured: with `hardDmg` 1.46 it was post1 47 of 90 (52%), post2 54 (60%); Normal post1 sat at 96% after the Icebreaker move. Changes in `titan.js`: Normal multiplier x1.2 to x1.38, `hardDmg` 1.46 to 1.56, Hard's Icebreaker (`maul`) 10300 to 11200 (it must stay at least 1.1x Normal's: 11400 x1.38 against 11200 x1.56 is 1.11). Bots, 90 runs: Normal post1 78 (87%); Hard post1 40 (44%); Hard post2 48 (53%). Steep curve: hardDmg 1.52 gave post1 44, 1.56 gave 42/52, 1.58 gave post1 30, 1.62 gave 29/27. The weak runeguard line-up now clears 4 of 30 (was 13); the check line (8 tries, stops at the first clear) cleared on run 5. Check passes.

Revised the same day: the blanket Normal x1.38 hit the tank hardest and left the weak runeguard line-up at 4 of 30. Normal's multiplier is now split: the tank's blows (Glacial Fist, Icebreaker) stay at x1.2, every other move x1.41 (the most that keeps Hard at least 1.1x Normal on the Howl: 1.56 / 1.41). Bots, 90 runs: Normal post1 81 clears (90%); the weak runeguard line-up 10 of 30; Hard unchanged by this (post1 40, post2 48). Check passes (weak line cleared on run 6).

## De-cook pass (2026-10-27)

Why: the party found no time to damage between mechanics. Four passes on 2026-10-26 had each added density, and moves stacked into each other had become the rhythm instead of the highlight.

Measured before (uptime harness, 10 runs per line-up, bots): Normal `GEAR=post1` melee 79% / ranged 92% of the time on the boss, 6.5 quiet windows (6 s or more, nothing live, boss targetable) per run, two moves live 8% of the fight; windows per act 2.6 / 2.5 / 0.8 / 0 / 0.6. Hard `GEAR=post2` melee 80% / ranged 93%, 5.7 windows per run.

What changed (all in `titan.js`, no cast name dropped, no journal change):
- Every set is now one beat with its own length (`live`: the cast bar plus the sheets it cracked) and a calm after it (`rest`): 3.5 s between beats and a long one (7.5 s, shortened after a long move so the timeline check's 16 s of named steps still holds) after about every second or third, so a quiet window opens roughly every 40 s in every act. A set begins when the one before has gone quiet and rested (`spaced`), not at a hand-written delay.
- Pairs cut to the signature moments: Winter's Grasp into the Icebreaker (Act II's opening), Grasp into Fault Line (the frozen ground the line cannot cross), Icebreaker into a Whiteout (Act III), Frostbite into a Sweep (Act IV on Normal, Act III on Hard), a Fist into an Icefall (Last Winter), and the Long Night (now opened by a Fist as one set). Gone: Howl into Fist (all), Sweep into Slam, Fist into Slam / Twin Slam / Fault Line / Sweep / Breath / Grip / Stomp (all), Fist into Icefall in Acts I and IV, Fault into Slam. Moves cut outright from the scripted sets: Act I's second and third Slam, Act IV's Icefall, most second Howls, the Twin Slam (it stays in the closing passes of Acts II and IV), Hard's Sweep in Act I.
- Hard's draws are rebuilt for the new sets (`mix`/`fits`): the tank never waits over 32 s between a Fist or an Icebreaker, something for the healer within 34 s, raidwides 12 s apart, a quiet window at least every 50 s, no two of Hard's new moves side by side, no Sweep in the first minute, and the wait across an act seam counts (`endBeat`). Valid orders per act: 46 / 6 / 4 / 64 (Acts I-IV); there is no fallback to a fixed order unless none is valid. Hard keeps Glacial Stomp (Act I), Breath of Winter (Acts II and IV) and Titan's Grip (Last Winter).
- A Fist that had to wait for the 16 s Fist clock used to run into the Long Night's first bar; the Night now opens as "Fist, then the Night" in one set. Act II's closing passes begin 16 s (was 10) after the last set, so the tail Howl and the first closing Howl are never 10 s apart (two raidwides that close killed healers in the first version of this pass). Act IV gets a Howl (a raidwide at least every 150 s).
- Normal's first Sweep is the first thing after the opening Icebreaker (only the tank's own sheet is down) and a second one comes after Act II's Whiteout, never over standing water; when a Sweep came 12 s after the Icebreaker and the Fault Line, bots ran across black water to leave the arc and died to it.
- Numbers: Normal health 5.0M (was 5.15M), Hard health 5.55M (was 5.7M); `hardDmg` stays 1.56 and the Normal multipliers are unchanged (Fist and Icebreaker x1.2, the rest x1.41; Hard stays at least 1.1x Normal on every shared move, the Howl at 1.106).

Measured after: Normal melee 84% / ranged 92%, 15.3 quiet windows per run, two moves live 2%; per act 5.8 / 5.2 / 2.8 / 0.9 / 0.6 (the last two acts are short for bots, and the Tips wall is untargetable). Hard melee 83% / ranged 94%, 12.8 windows, two moves live 1%. Script length (timeline check) 9:13 Normal, 9:06 Hard (was about 9:42 / 9:48). Tank's longest wait in the full script: Normal 31 / 35 / 31 / 33 / 23 s (the 35 is the Act I to II seam), Hard 26 / 28 / 32 / 32 / 23 s; healer's longest Normal 31 / 27 / 28 / 27 / 23, Hard 26 / 28 / 18 / 31 / 23.

Bots, 90 runs per row (three seed sets of 30): Normal `GEAR=post1` 79 and 85 of 90 over two seed ranges (91% of 180; before 90%); the weak runeguard line-up 68 of 90 (75%; was 10 of 30, the quieter fight is kinder to it; its check line has runs=8); Hard `GEAR=post2` 105 of 180 (58%; was 53%), Hard `GEAR=post1` 88 of 180 (49%; was 44%). Hard is a steep, noisy knob: `hardDmg` 1.58 gave 40% / 53% on the same seeds and 1.62 gave 49% / 48%, and the two gears track each other more closely than before, so post1 sits a few points above its band when post2 is in its band.
