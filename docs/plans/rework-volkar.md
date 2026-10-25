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

## Results (bots)

- Normal, `GEAR=fresh`, 90 runs (three seed sets): 80 clears, 89%, wipes spread over the Front and Back, clear time about 7:50. The 14 base-gear line-ups in `check.js` still clear at least once in three.
- Hard, `GEAR=mid`, 180 runs (six seed sets): 105 clears, 58%; mean clear 566 s against the 607 s enrage (about 40 s of slack). Wipes are mostly in the finale (the Heavens and Twin Falls), a few in the Back.
- Journal: Distant Thunder entries removed, Twin Fall entries added for all 23 heroes. Sound: `bm-volkar-twin-fall` added (sfx-map, sfx-synth, rendered trim), icon in boss-icons.js, guide text in tutorial-data.js.
