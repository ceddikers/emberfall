# Skitterra rework (2026-10-25)

Goal: lift Queen Skitterra to 8+/10 on Normal and Hard. A review found: Act I is ten single moves with 14 to 15 s of calm between them (the weakest pacing in set 1); the Dark Between leaves her untargetable for 30 s with nothing for the tank and melee to do; Hard's Eightfold Lunge only shows its floor about two seconds ahead (six steps, 1.15 s apart); Snare Weave's pockets read poorly; Hard stacks a second hunt drop 2.3 s behind the first in the dark, where it is unreadable. Bots: Normal 30/30 at `GEAR=fresh` (too easy), Hard 63% at `GEAR=mid` (target 45 to 60%).

## Finding a fight's idea (Skitterra's answers)

1. **What is happening in this room?** A broodmother's hunting web, hung between eight pillars. She has laid her eggs in it, strung her threads across it and sits at the hub. The party is the prey that came into her larder. By the end the web itself is giving way.
2. **What question does the fight keep asking?** "What do I break?"
3. **The rule.** Everything she has built can be cut, and what you cut changes what she can do to you. A clutch broken is two fewer spiderlings later; a knot cut is one less drop in the dark, but a strip of floor gone at the end; a pillar you hide behind is chipped by every Acid Deluge. So the rule explains moves the party has not met: if it is in the web, it can be broken, and it was worth something.
4. **The warning.** Her legs light in order before the Lunge, and (new) the whole lunge is drawn on the floor from the first moment as a faint chain, each strike stronger as it nears (the ghost chain). The eggs carry their own hatch clock, the threads and knots stand in plain view, a ring of floor shudders for six seconds before it goes. Every telegraph is on the floor, on both difficulties.
5. **Acts.** I. The Web (one hunt, now in movements: a move and the one that answers it), The Dark Between (the seam: lights out, the brood stirs, she drops), II. The Brood (pairs, then the Swarm), III. The Collapse (the Chrysalis, then the floor falls ring by ring to nothing but the hub's last disc and the silk).
6. **How it ends.** On the last of the silk: the party stands on spokes and threads with the pit all round, while she drops, reels and lunges across a floor that is no longer there to dodge on. Then Devour, or she falls into her own web.
7. **What Hard changes.** Six-step Lunges (and a faint chain of all six first), green and red Silk Lines, a burning beam on every hatched pair, three spiderlings to a clutch, two drops per uncut thread (now 3.6 s apart, not 2.3), Molt, Ceiling Ambush, Snare Weave, sticky acid, and her three moves: Egg Sacs, Fang Rush, Spinneret Volley.
8. **Where luck comes in, and how it is read.** The farthest hero is hunted (the party controls it by standing close), the cocoon falls on a random one (the circle follows them until 1.6 s out), the Lines pick two at random. Nothing lands without a circle first.
9. **Tank and healer.** The tank takes Silk Wrap (rooted where it lands, so the Lunge that follows has to be survived from that spot) and, in the dark, holds whatever hatches; the healer gets Venom Mist, the Reel and the Collapse's falls.
10. **Her own.** A boss whose room you dismantle: the party's choices about what to break are the fight, and they pay out later (dark drops, Swarm size, floor at the end).
11. **What players will talk about.** The Dark Between (lights out, the brood hatching around the tank, a drop from nowhere), cutting a knot just before she runs the thread, the last silk.

## What changes

**Act I, now seven movements.** The ten single moves become seven sets in which a move is followed by the one that answers it, with 10 to 12 s of calm between sets and 5 to 8 s inside: Mist into Silk Wrap; Brood into Silk Reel (Hard adds Egg Sacs); Spin into Strand Reel (Hard adds Fang Rush); Venom Spit into a Lunge fought across the pools; Mist into the Deluge; the Wrap-Lunge into a second Spit; Lines into Mist. The two Silk Wraps are about 90 s apart. The length stays about the same (the script has to outlast a slow party).

**The Dark Between.** The eggs do not wait while she is up there: each time, the clutch with the shortest clock splits and a spiderling (on Hard, a linked pair with its beam) runs at the tank. The brood clock shows the clutch's countdown. The tank holds it, the melee cut it down, the ranged go to the knots and the eggs; a clutch broken first sends nothing. Hard's drops are spread out: a thread's two drops are 3.6 s apart, and the hunt's second circle only appears when the first has landed.

**Hard Lunge.** All six steps are on the floor from the cast, the next in full and the later ones faint, as with Grubnak's Double Chop. Normal shows its four the same way.

**Snare Weave.** The pockets are wider (radius 100, was 75), so the clear floor reads as clear floor and the whole party fits in one.

**The Collapse, a climax.** Denser (nothing quiet for more than about 10 s); the Reel, Lines and Lunge are now fought on thinning silk; a fourth ring takes the hub down to a disc (215 across the middle) for the last stretch; and the hunt returns as the finale: From the Dark, from the web overhead, falls on whoever stands farthest out on the silk, then the next, three times in turn (four on Hard). No new cast name, so no new sound.

Unchanged: telegraphs never hidden (red damage, blue share), 8 to 10 minutes, one named enrage (Devour) with about a minute of slack (about 45 s on Hard), Hard has six moves Normal never uses (no more added), no HP-gate pushes or walls in set 1.

## Results (bots)

Normal at `GEAR=fresh`: about 90% (81/90 over three seed sets of 30), was 30/30. Hard at `GEAR=mid`: about 62% (56/90), was about 63%, with a fourth ring, the finale hunt and a new dark to play. Base-gear line-ups had to be eased (fall 15600, Mist 10300, Brood spiderlings 20000, a second Silk Wrap kept 90 s from the first so the tank's cooldown is back) so each still clears Skitterra in check.js; the Tidecaller line-up (about a quarter at base gear) now gets twelve tries. Two fixes were needed on the way: the Brood now starts with her walking to the hub, and hatchlings come out on the inward side of the clutch (the threads run past the clutches on their far side, and the bots would not cross one to reach what hatched).

## Second fun pass (2026-10-26)

Goal: Act II as dense as Act I, Hard's opening not a wipe, the fight toward 8 minutes. Tight, readable, skill-based dodges over softer numbers; no new cast names (so no new sounds or tells).

**Act I.** The threads (Spin) now go up only after the Spit-Lunge and the charges are done: Venom Spit into a Lunge (pools, no silk), Strand Reel (Hard: into Fang Rush) on a bare floor, then Spin into the Acid Deluge, then the Wrap-Lunge across the threads with no pools left, a second Spit, Lines into Mist, and a closing Reel into Mist (eight movements, Act I now lasts about 20 s longer). A party that is behind meets Mist and a Reel, not a Lunge over the Spit pools and the threads (that closing Lunge was most of Hard's early wipes). Hard Spit pools last 45 s (was 60).

**Act II, in pairs.** 10 to 12 s of calm (9 to 10 on Hard), 4 to 10 s inside a set. Normal: Mist into Lunge, Lines and Spit, Reel into Spit, Mist into Deluge, Strand Reel into a rim Lunge, the Swarm into the Wrap, Lines into a Lunge that lands as the lines come due, Spit into Reel, Mist into a Lunge, Lines into Mist, Strand Reel into Mist, Reel into Lunge. Hard: Volley into Reel and Wrap, Mist into Molt, Egg Sacs into Fang Rush, the Swarm into the Wrap, Strand Reel into a rim Lunge, Snare Weave into the Deluge, Ambush into Mist, Lines into Lunge, Reel into Lunge, Mist into a Wrap-Lunge, Spit into Reel. The rim Lunge is struck from the pillar the Strand Reel left her on, its first strike aimed back across the cave, so the cones sweep the room like a wiper from the wall. The Brood clock for the Swarm is now read from the Swarm's own step (it was about 10 s early).

**Hard numbers.** Lunge steps 1.05 s (was 1.15), strike 13300 (was 12100), HP 4.0M (was 3.8M), Devour at 568 s (was 612), a thread's drop gap unchanged. The script runs to the end of every set for a clean party: Normal about 8 minutes.

**Results (bots).** Normal `GEAR=fresh` 80/90 (was 82/90), clear time still about 7:20 (the script is 8 minutes, a bot party is faster). Hard `GEAR=mid`: about 57 to 62% over 180 runs (was 60%), and the share of wipes in the first 140 s fell from 7 of 24 to about 2 of 40. The check.js base-gear line-ups all clear (the Act II Wrap-Lunge was kept at the start and the second Wrap moved to the Swarm so the tank's cooldown is back).
