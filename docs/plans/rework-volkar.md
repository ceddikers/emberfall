# Volkar rework (2026-10-25)

Review findings: Normal is clean but flat (one move at a time, a long 40 s lull in the Eye); Hard piles Supercell, Chain Lightning on the healer, Skyfall, Ball Lightning, breaking wedges, Gale Slam and the Pulse into one half, a fall off an edge is heavy damage plus a 5 s root, and Gale Slam can throw people toward a wedge that is about to break. Bots: Normal 20 of 20 at base gear, Hard 15% at `GEAR=mid` (most failures were enrage wipes at 0 to 15% boss health, and a wipe around the 510 s mark where Crash, Field and Walls landed together).

## Volkar's answers (docs/DESIGN.md, "Finding a fight's idea")

1. **What is happening in this room?** A storm that has stood on a summit so long it grew a body. The party climbs into one authored storm front: it builds, a calm eye opens, it comes back doubled, and then the sky itself comes down.
2. **What does the fight keep asking?** "Who am I paired with, and where is cover?"
3. **The rule a player learns:** opposite charges cancel and like charges arc. It explains moves not yet met: the Surge (pair), the Crash cloud over each gold, the Still Air stones (one of your own charge at each), Heavens Fall (both charges in the circle) and, at the end, the Twin Fall (a gold and a blue hold each column). The second rule is cover: a rod, a boulder or a standing stone stands between you and the storm.
4. **How does it warn?** The weather is the warning: the sky darkens before a clap, charges arc between like colours before a Surge, every circle and lane is painted for the whole cast, and the columns of sky are drawn five seconds ahead.
5. **Acts:** The Front (the gaps tighten; the Squall Line arrives early and everything else is walked inside it), The Eye (a short calm and the stones), The Back of the Storm (the front again, doubled; Hard splits it into the doubled front and then the breaking of the summit), Heavens Fall (the sky comes down, whole party then in pairs).
6. **Ending:** the summit shrinks to its last ring and the sky comes down column by column, then splits in two: the Twin Fall, which is the whole fight's idea as a final exam (a gold and a blue to each column).
7. **What does Hard change?** Casts 15% faster and 25% more damage; the charges flip as the Eye opens; three rods and three walls; the Supercell dance in the Front; Chain Lightning on the healer as the fist lands; a single Skyfall; Ball Lightning; in the second half of the Back the summit breaks wedge by wedge (no Gale Slam there, and a fall hurts but holds you for a moment only); the Twin Fall comes with Ball Lightning crossing the columns.
8. **Luck:** who carries the Crash cloud, who is marked for Rod Strike, whom the Chain and the Skyfall pick. All shown for the whole cast.
9. **Tank / healer:** the tank takes Titan Fist and keeps him turned from the party (Hard: Conductive, so no rods); the healer gets the Gathering Storm heal check, Thunderhead, and on Hard the Chain Lightning.
10. **His own:** a pairing fight in which the pairs are the whole fight: every mechanic reads off the two charges, and the room gives cover.
11. **What will players talk about?** The Squall Line walk with a partner, the Supercell dance, and the Twin Fall at the end.

## Changes

Normal
- The Eye is under half as long (about 20 s instead of 40; Distant Thunder, a cast that did nothing, is gone): Eye of the Storm, Still Air, Eye Closes.
- The Squall Line comes early in the Front with Titan Fist and a Polarity Surge landing inside it (pair while walking the drifting circle), and again in the Back with a Thunder Crash inside it. A Surge lands during Storm Walls (pair and walk the gap together).
- The finale adds the Twin Fall: two columns of sky, a gold and a blue hold each one.

Hard
- The Back is split by time into two halves with the Hard moves spread between them. First half: doubled front, rods with Gale Slam, Avalanche into Walls, Rod Strike, Gathering Storm. Second half (the breaking): wedges crumble, Squall Line, Ball Lightning, Chain Lightning, Crash and Field. No Gale Slam in the second half, so nobody is thrown toward a wedge that is about to go. Skyfall moves to the Front (one cast); Crash and Walls no longer land together.
- Falling off an edge is heavy damage and a short hold instead of five seconds.
- Hard boss health trimmed (4.83M to 4.4M) so the enrage has its slack; Normal health is a little up (3.62M to 3.75M) now that the Eye is shorter.
- The finale ends on the Twin Fall. On Hard a second, lighter pair of columns lands a few seconds after the first (shown from the start), so the pairs hold one and run to the next. (A first version had Ball Lightning crossing the columns; the bots could not hold a column through it and it was too much to read, so it went.)
- Hard's Heavens Fall hits for a little more (41.5k instead of 35.6k) because the finale is where the Hard clear rate is decided.

## Hard bite pass (2026-10-26)

The user worried Hard had been babied. Skill checks tightened instead of numbers softened:
- Falling off an edge holds you 2.5 s (was 1.5; 5 s originally), the Gale Slam and the crumbling wedges alike. Heavy damage and a real cost for a misstep.
- The finale was read as a hidden healing check (the Pulse plus a 10% a pass ramp on a 41.5k Heavens Fall). Hard's ramp is now 7% a pass, and each Heavens Fall on Hard breaks over the summit as it lands: everyone is marked (a Static Field at 55% damage) 3.3 s later, so the party holds the column, then scatters. It is a dance step you can see on the floor, not a bigger number. Twin Fall stays, and its second pair of columns lands 3.4 s behind the first (was 3.8).
- Journal: all 23 Heavens Fall entries say the Hard scatter.
- The tutorial text for Heavens Fall (`tutorial-data.js`) does not yet mention the Hard scatter (outside this pass's files).

Bots, Hard at `GEAR=mid` (30 runs per seed): before this pass 20 / 19 / 21 (seeds 1000, 2000, 3000: 67%); after 17 / 19 / 15 (57%). Normal at `GEAR=fresh` 28 / 26 / 28 (91%). (The scatter at 65% damage gave 46%, at 50% 63%.)

## Results (bots)

- Normal, `GEAR=fresh`, 90 runs (three seed sets): 80 clears, 89%, wipes spread over the Front and Back, clear time about 7:50. The 14 base-gear line-ups in `check.js` still clear at least once in three.
- Hard, `GEAR=mid`, 180 runs (six seed sets): 105 clears, 58%; mean clear 566 s against the 607 s enrage (about 40 s of slack). Wipes are mostly in the finale (the Heavens and Twin Falls), a few in the Back.
- Journal: Distant Thunder entries removed, Twin Fall entries added for all 23 heroes. Sound: `bm-volkar-twin-fall` added (sfx-map, sfx-synth, rendered trim), icon in boss-icons.js, guide text in tutorial-data.js.

## Cool-factor pass (2026-10-26)

The ask: more spectacle and more earned dodges, without taking difficulty away (Hard especially).

Moves that combine (no new cast names, nothing hidden):
- **Surge into Static Field.** A Polarity Surge now often has a Static Field follow it the moment it lands (shown from then, 3.4 s Normal / 2.8 s Hard). A Surge wants a partner within 150, the field wants everyone 115 apart, so the one ground that answers both is a long stride from your partner. Used in the Front (the second Surge), at the end of the Back, and after the Squall in the Back. Both fields hit for 55% of a full Static Field.
- **The Squall Line closes in.** The quiet circle narrows over the last 65% of its walk (Front 360 to 300 Normal / 260 Hard; Back 320 to 270 Normal / 232 Hard), drawn by the red edge itself closing (`room.inSquall` and `squallDraw` use the same curve). The Surge landing inside it now lands in the tight end.
- (Tried and dropped: a Rod Strike while the second Storm Walls turn on Normal. Bots at base gear with a weak healer line-up fell from about 70% to 50%; the Surge stays there.)
- **Twin Fall on Normal** gets a lighter second pair (45%) a quarter-turn round, 4.4 s behind the first, like Hard's (heavier, 3.4 s).

Spectacle and feel (`boss-vfx.js`, `arena-view.js`):
- Heavens Fall / Twin Fall / Skyfall: a new windup (the cloud opens and a shaft of light thickens onto the summit, motes streaming up, bolts at its edge); the impact adds a trailing second and third ring, a shower of sky shards, a white screen flash, a camera push-in and a brief hit-stop. A Twin Fall column also throws a gold and a blue bolt through him to the other column.
- Thunderclap and a Thunder Crash held by the whole pair flash and push the camera.
- A graze beat: when a storm lane or cell lands and you are within a body's width of it, unhurt, a white bolt tears past and sparks crackle off you with a small camera lean and a quiet whoosh. When Gale Slam is turned aside by a rod ('lee'), a ring and sparks mark it.

Bots: Normal `GEAR=fresh` 30 / 24 / 25 of 30 (88%); Hard `GEAR=mid` 16 / 16 / 19 (57%; the first, gentler numbers gave 61%, so the circle and the field were tightened once). The bots handle all of this well (they read the field and the shrinking circle); a person has less slack than the sims show.

## Beats, shuffle and ending pass (2026-10-26)

The ask: tank and healer never idle, a peaking ending, Hard read rather than memorised, real choices, without making the fight easier or harder overall. Rules kept: no filler casts (every Thunderclap and Titan Fist is the full move), and no step starts a cast while the previous one is still on the bar (checked by logging every cast; the only overlaps left are the ones the fight always had: Fist with Surge or Chain, Surge with Crash, Rods with Gale, Rod Strike with Fist).

Before (cast times from a full-script run): the longest stretch with no Titan Fist was 131 s in the Normal Front (112 s Hard) and 108 s in the Normal Back (78 s Hard); the longest with no Thunderclap, Crash, check or Fall for the healer was 87 s (Normal Front), 78 s (Normal Back), 82 s and 79 s on Hard. The finale had no tank beat at all. Hard shuffled nothing.

Changes (all in `volkar.js`, no new cast names):
- **Units.** The Front, Back and finale are laid out as units (`U(P, [offset, fn, name]...)`, `lay`): steps that belong together, with `P` the time to the next unit, so a unit can move without opening a gap. Full Titan Fists and the existing healer moves are paired into them; a Static Field follows some fists and gales (not where Walls are sweeping). P of a few units grew by a second or two so casts do not overlap; scripted 9:50 Normal, 9:55 Hard.
- **Finale.** Normal: a Titan Fist follows each Heavens Fall once it has landed. Hard: one, after the first. The ending (Heavens Fall alternating with the Twin Fall) was already the climax with no tail of old moves.
- **Hard shuffle.** Hard lays its units in a fresh order each pull: the Front after the Squall Line and the first Rod Strike (a group with a Titan Fist and a group without, taken in turn; a Thunderclap first and the Supercell dance in the middle so a raidwide is never more than a couple of minutes away), the Back's doubled front and its breaking half (a wedge breaks with the unit that owns it), and the three middle falls of the finale (first a Heavens Fall, last a Twin Fall).
- **Retune.** Hard's Pulse is 330 (was 440) against Normal's 300, and Hard's Clap 8600 (was 9300), Fist 26500 (was 28000), Thunderhead 6700 (was 7400), Gathering Storm tick 2100 (was 2300) and Heavens Fall 37000 (was 41500) now sit about 15 percent over Normal's (they were 25), to pay for the extra Fists, the shuffle and the Fields. Hard still hits harder than Normal everywhere. The tank dies to full Fists that come too close together at mid gear, so the Hard fists were thinned (none in Avalanche, Walls, Crash or Surge units, only one in the finale).

After (landing to landing, Eye excluded): tank gaps Normal at most about 36 s, Hard about 35 s in the Front and 40 to 50 s around the Gathering Storm and the join into the finale; healer Normal at most 47 s (the Rod Strike, Gale and Walls stretch) and about 42 s late in the Front, Hard 25 to 40 s. Not the 20 to 30 s hoped for: Static Fields cannot sit on top of sweeping Walls, and full Fists cannot sit closer without the Normal weak-healer line-ups and Hard dying.

Bots (90 runs each, three seed sets): Normal `GEAR=fresh` before 79 (88%), after 74 (82%); Hard `GEAR=mid` before 51 (57%), after 49 (54%). All 14 base-gear line-ups clear at least once in three (Undertow 3 of 8, Apothecary 2 of 3).

## New tank move: Static Lash (2026-10-26)

The ask: the tank still waited 30 to 36 s between beats on Normal and 35 to 50 s on Hard, because Titan Fist (a full tankbuster) cannot come more often. Volkar gets one lighter beat of the tank's own.

**The move.** Static Lash, on both difficulties: a rope of lightning flung down the line to the tank (a red lane from him through the tank to the rim, 100 wide, 640 long, shown for the whole cast; boss pose is his Chain Lightning crackle, anim key `chain`). It follows the tank and fixes late (1.4 s before it lands on Normal, 1.0 s on Hard): the tank steps out sideways once it locks, or takes it with a mitigation; whoever stands in the lane takes it too, so nobody stands behind the tank on that line. Normal 7800, cast 3.2 s; Hard 9000 (15 percent over Normal), cast 2.7 s. Dodged it is nothing; hit, it is about a third of a Titan Fist and gives Vulnerability like any avoidable hit.

**Why this shape.** Where's cover and who's in the line is the fight's second rule; the lane is the tank's own read and positioning job (which way to step, away from the party), not another number to heal. Never reuses the Fist's name or its cone; it is a lane you can dodge, so it can come every 15 to 25 s. A first version forked the rope to whoever shared the tank's charge on Hard ("like charges arc", a second lane aimed at that player). It was the best fit with the polarity rule but cost the bots about 20 points of Hard clears (seeds 1000 and 3000: 38 percent with the fork on every lash, 47 percent on three, 60 percent without), so it was dropped. If Hard wants a polarity layer later, that is the lever to try on one lash only.

**Where it sits.** In units (`stepLash`), so Hard's shuffles keep it. Placed after the previous cast bar ends and well clear of the Fists (at least 7 s landing to landing), never inside sweeping Storm Walls, a Rod Strike or a Gale. Normal: the Front (after the first Fist; twice in the Squall Line unit; after the walls' Surge; after the Avalanche walls; after the Static Field; after Rods and Gale), the Back (straight off the stones before the Crash; after the Avalanche walls; during the Gathering Storm; after the late Surge and Field), the finale (after each Twin Fall's second pair). Hard: the Supercell unit, the Squall Line unit twice, the Surge + Crash, Static Field and Surge + Field units of the Front's shuffle, between Avalanche and Storm Walls (both Fronts), the Back's opening Crash, the Rods + Surge unit, the Gathering Storm, the late Surge, and the finale's units (after the scatter of each Heavens Fall, after each Twin Fall). The slow-party repeat of the finale carries one lash a pass. Hard's two Avalanche + Walls units grew by a second (the Walls cast later, the lash between); the opening Thunderclap unit is a few seconds shorter on both difficulties to pay for the extra length. Scripted 9:55 Normal (was 9:50), 9:57 Hard (was 9:55).

**Tank gaps** (landing to landing, Titan Fist and Lash together, worst over eight Hard draws):

| | Front | Back | Eye / finale |
|---|---|---|---|
| Normal before | 33 | 36 | 45 across the Eye |
| Normal after | 22 | 25 | 32 across the Eye (its 20 s are calm by design) |
| Hard before | 37 | 41 to 45 | 51 across the Eye, 39 in the finale |
| Hard after | 28 | 28 | 32 across the Eye, 13 in the finale |

**Bots.** Normal `GEAR=fresh`, 90 runs: 26 / 27 / 28 of 30 (90 percent; before 82 to 91 depending on the pass). Hard `GEAR=mid`: 15 / 14 / 19 (53 percent; before 54 percent). The bots dodge the lash well (one hit in 18 runs). All 14 Volkar line-ups in `check.js` clear (mostly on run 1), the timeline passes (no warning under 1.2 s, no cast cut short, the feed always three steps ahead), Hard runs clean.

Tell art: the lane draws with the default red area (tag `lash`); a rope-of-lightning look in `boss-tells.js` would be the next polish. Sound: `bm-volkar-static-lash` (recipe in the scratchpad `newmoves/volkar.md`, not yet in the sfx files).
