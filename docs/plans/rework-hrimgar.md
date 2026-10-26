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
