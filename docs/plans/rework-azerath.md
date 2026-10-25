# Azerath rework: the rune you can read, a fairer Hard, and the sigils taught before the finale

*2026-10-25. Review: 7 out of 10 fun on Normal, 6 out of 10 on Hard for fairness. The Rune Pair ("together or apart by element") and the Binding (the tank leads elementals to sigils) are a distinctive pair of jobs and Convergence is clear. What held it back: the rune-to-element rule was learned, not read; Hard stacked a Mark, a Swap, the spell and a Counterspell inside about twenty seconds; the fire and void rings could one-shot a bot; and Normal bots cleared 12 of 12 at `GEAR=post1`. Goal: fun 8 or more, Hard fair and tuned (target 50 to 60% at `GEAR=post2`).*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** A tower drowned to its windows, and its master still at his desk in the middle of it. The floor is seven circles of old spellwork (a middle one, two rings and four sigils for fire, frost, lightning and the void), and he works his spells through them without ever walking.
2. **What question does the fight keep asking?** "Which element is it, and who holds the rune?"
3. **What is the rule a player learns?** Fire and the void part the two bearers; frost and lightning bring them together. The floor now says which element is live: when the Mark lands, the sigil of the coming spell's element lights, and the runes themselves are drawn to match the rule (a closed ring for the two that join, a broken ring for the two that part). The same sigils are the ones the Binding sends the elementals to and the ones Convergence lights at the end.
4. **How does the fight warn?** The Mark's link and glyphs over the two bearers; the lit sigil; the spell named in the feed; then the spell's whole shape on the floor from the first moment of its cast (circles on each bearer, a blue circle between them, a bolt joining them), following the bearers until a moment before it lands.
5. **Acts.** Fire, Frost, the Binding (the seam), Lightning, Void, Convergence. HP gates push the fight on; no wall.
6. **Ending.** Convergence: all four sigils at once, each in its own element, with the reaction filling the lens where two meet. It is the sigils the party has learned all fight, lit together. This rework adds **Sigil Flare** in Acts III and IV, two neighbouring sigils lit at once with the lens between them, so the finale is the same shape, bigger.
7. **What does Hard change?** Casts 15% faster, and Counterspell (the last spell's areas come again on the far side), Rune Swap (the runes jump to two other heroes) and Arcane Mark (a stack where one hero stood). It shuffles each act's middle sets, and Sigil Flare lights the opposite pair after the first (cross the middle).
8. **Luck.** Who gets the runes and which two elements they carry are random, but the spell's element is shown on the floor from the Mark on. Sigil Flare's pair is random and painted in full.
9. **Tank and healer.** The tank takes the Arcane Lance and leads each elemental to its sigil and holds it there (the Binding); the healer gets the Arcane Burst raidwides and the rings' chip damage.
10. **Its own.** The only fight where a pair of players is tied together and the rule for how to stand is set by a spell's element, with the room's own sigils naming the element.
11. **What will players talk about?** The Rune Pair, the Binding, and "which sigil is lit".

## Changes

1. **The live element is on the floor (both difficulties).** The Mark lights the sigil of the coming spell's element until the spell lands (roomev `live`). The rune over each bearer's head is drawn by its element's rule: fire and the void as a broken ring, frost and lightning as a closed one. The rune of the live element is bigger and bright, the other dim. No teaching text; the rule is still the player's to learn.
2. **The Hard chain stays, with room to breathe (Hard).** Mark, Swap, spell and Counterspell are the fight's best layered sequence (the same kind of thing as the Hollow King's graves, Writ and Crown), so they stay one sequence. What changes is the spacing: the Counterspell now waits a little longer after the spell, echoes at most three shapes (it used to be five) and hits softer.
3. **A longer window after the Swap (Hard).** The spell now begins about 5.4 s after the Swap cast starts (was 3.6 s); the new bearers have about six seconds from the jump to the lock.
4. **Hard rings trimmed.** The fire and void rune rings, the reaction circle, the echo and the Pyre Rings hit for about 65 to 80% of what they did, so one ring leaves a hero standing at full health; two still kill. The Hard Arcane Lance is the same as Normal's (a tank at three quarters health was dying to a Lance). No two Arcane Bursts open back to back when a pass runs long (the closing passes of Acts I and IV start with the Lance).
5. **Sigil Flare (new, both difficulties; Hard adds a second pair).** Two neighbouring sigils light and blast together, and the lens between them blooms (the same reaction as Convergence). On Hard the opposite pair follows a moment later, so the safe half becomes the next blast and the party crosses the middle. It replaces a filler Arcane Burst in Acts III and IV. New cast, so a new sound (`bm-archmage-sigil-flare`), an icon and a journal entry per hero.

## Kept

Telegraphs never hidden (every shape is on the floor from the cast), 8 to 10 minutes, one enrage (The Tide Rises casts at 10:00 / 10:05 and lands 8 s later, a minute of slack on Normal and about 45 s on Hard), HP-gate pushes and no wall, tank and healer gaps under about 10 s, Hard has Counterspell, Rune Swap and Arcane Mark that Normal never uses.

## Numbers

Boss HP 5.8M Normal (was 5.5M) and 6.35M Hard (was 6.16M); the Hard Arcane Burst hits a little harder (17000, was 16000) so the heal check stays real now that the rings are softer. Measured with the two line-ups in `tools/check.js` (A: bastion, cleric Aegis, ranger Sharpshooter, pyromancer Cataclysm; B: runeguard, grovekeeper, shadowblade, pyromancer Sigilmancer) and the plain `bot-raid.js` line-up, 30 runs per seed, seeds 1000, 2000, 3000:

| | before (HEAD) | now |
|---|---|---|
| Normal `GEAR=post1`, A | 12 of 12 | 92% (83 of 90) |
| Normal `GEAR=post1`, B | not measured | 75% (45 of 60, two seed sets) |
| Hard `GEAR=post2`, A | 50% (one set) | 62% (56 of 90) |
| Hard `GEAR=post2`, plain line-up | 74% (67 of 90) | 87% (78 of 90) |
| Hard `GEAR=post2`, B | not measured | 20% (6 of 30; a weak line-up that is short on damage) |

On Hard the finale has no plain Burst between its two rune chains, so the script ends at 9:38 (Normal 9:08), a little under half a minute before the enrage casts.

Clear times: Normal about 545 s, Hard 545 s (plain line-up) to 595 s (A), against an enrage that lands at 608 / 613 s.

## Hard tuning pass (2026-10-26)

Hard `GEAR=post2`, plain line-up, was 87% (78 of 90); now 62% (56 of 90, seeds 1000/2000/3000). Normal `GEAR=post1` 87 of 90.

- **Tighter, not softer.** On Hard the Pyre Rings follow one another closer (2.3 s, was 2.8), the Leaping Bolt hops faster, the Rime Rune circle is a little smaller, the Sigil Flare's second pair follows sooner, and two bearers of a split rune must now stand further apart (and the reaction between them is bigger). The Counterspell lands sooner (a run across the room) and hits a little harder.
- **The echo of the echo (Hard).** After the far-side copy goes off, the first two shapes come back to where they began, so the old ground is not safe either. A new line in every hero's Counterspell journal entry.
- **Numbers.** The Hard Arcane Burst is 19200 (was 17000); the Rime Rune and Arcane Mark blows are a tenth stronger. Bots dodge every shape perfectly, so the bite that moves their clear rate is the unavoidable damage.

## Cool-factor pass (2026-10-26)

Look and feel only: no timing, damage or shape changed, so the rates above stand (re-measured below), and no journal line changed because the counterplay did not.

- **The whiff.** A hero a blow just missed, standing within a stride of its edge, gets the edge going past: a streak of the element along it, a small rune ring at their feet, sparks, and for your own hero a faint flash, a push of the camera and a soft whoosh. Drawn only for a hero the blow did not hit and was close to (never for a share, a tankbuster or a raidwide), so it is a reward after the fact and tells nothing about where is safe. Counterspell echoes whiff too, in pale violet.
- **The last beat of a wait.** Inside the red, a ring of the element closes on the middle of each circle (or sweeps in from the rim of a band, or a spearhead of light runs down a line) and lands at the instant the blow does. It times the landing; it paints nothing outside the outline. The rune bearers' feet get a tightening ring in the last moments before their spell.
- **The sigil stamp.** Every landing now slams the tower's own sigil onto the floor (a brass ring, the element's rune marks and its sign opening out and fading). Convergence and Sigil Flare run beams between the sigils through the middle of the floor and a star of light over him; the Pyre Rings run a ring of rune marks across the band; the lens burns a white seam along its length; the Counterspell echoes fold in on themselves with the runes turning the wrong way and pale shards flung out.
- **Screen feel.** Big landings push the camera and hold the frame an instant, with a flash in the element's colour, never more than once in a couple of seconds (your own view only).
- **The Binding.** A bound elemental's rune ring closes on its sigil with its light climbing; one left unbound tears a ring through the room.

## Skill pass (2026-10-26)

Gameplay half of the fun-and-complexity ask: dodges that are earned, not stumbled into. No new cast names (so no new sound or icon); two existing moves gained a second problem, both difficulties, every shape on the floor from the moment it is laid.

- **Ice Lances, the weave.** The moment the first lines lock on their heroes, a second volley is laid either side of each line and lands a beat after the first (Normal about 1 s, Hard a little less; Hard also has a third line to start with). The ground between a line and its flanks is safe through both, and so is the first line once it has fired. A sloppy side-step lands in a flank. Journal: every hero's Ice Lances entry rewritten.
- **Rime Rune, dodge then close in.** A lance out of him through each bearer lands a beat before the blue circle (Hard a hair tighter). The bearers have to leave their own lines and still come together, and everyone else has to be off both lines and then in the circle. Journal: every hero's Rime Rune entry rewritten.
- **Numbers.** Bots dodge every shape, so these moves do not move their clear rate; the Normal Arcane Burst goes 20200 to 20900 to bring Normal toward range. It cannot go much higher: line-up B (squishy, short on damage) clears about 58% before this pass and 44% at 20900, and a bigger Burst (21800) took it to a miss in check.js. Hard unchanged otherwise.
- **Rates** (30 runs per seed, seeds 1000/2000/3000): Normal `GEAR=post1` 83 of 90 (92%, was 97%; 78 of 90 = 87% at a Burst of 21800, which line-up B cannot take); Hard `GEAR=post2` 51 of 90 (57%, was 62%).
