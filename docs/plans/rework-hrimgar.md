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
