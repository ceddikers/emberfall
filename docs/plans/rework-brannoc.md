# Brannoc rework: pairs, the stones, and a Last Round with three jobs

*2026-10-25. Review: fun 7 on both; "where will it bounce?" is a clear, learnable idea and the titan on the ring of stone is a strong beat. Normal fair; Hard's layers (Twin Wheels, Riposte, Double Grip) are painted. Problems: Deep Call shoved everyone to the rim just before Breaker's wave bounced back off it; the Sand Furrow zone cost bots 76 hits on Normal; the Hard enrage was too tight (clears up to 596 s against a cast at 592 s); the titan acts were single moves with long quiet gaps for the tank and healer. Goal: fun 8 or more, without taking anything demanding out of Hard.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** A champion still fighting for a crowd of ghosts in a sunken arena; halfway through, the star claims him and he rises from the sea as the titan of a broken ring of stone.
2. **What question does the fight keep asking?** "Where will it bounce?" Now also "what will it bounce off?": the wall, and in the sea the stones on the ring.
3. **What is the rule a player learns?** Everything he throws is a path that bounces, and the whole path is drawn before it moves. A new move is the same rule on a new thing (a wheel, a giant wheel, a wave), and later two moves are drawn on the floor at once.
4. **How does the fight warn?** He turns to the first wall and holds that facing; every bounce is drawn, with a blue ring where it rests. A Deep Call is cast and shown as swells closing on the middle. Nothing is hidden on any difficulty.
5. **Acts.** First Blood, Crowd-Pleaser, The Tide Rises (the seam), The Tidewrought, Last Round.
6. **Ending.** Three jobs at once: a Grip held on someone (break the hand), a six-bounce wheel (catch the rings) and the fist on the tank (walk it clear). Every earlier lesson at the same moment, then The Final Bell.
7. **What does Hard change?** Twin Wheels (also from the titan), Double Grip, Riposte, Riptide, faster casts.
8. **Luck.** Who the Leap lands on, who the hand takes, the wheel's angle: random, drawn in full ahead, so it is reading and not luck. The Leap's landing now decides where the next wheel is thrown from, so the party's choice shapes the road.
9. **Tank and healer.** The tank takes Hammer Heel and, in the sea, the titan's strikes and the fist, and walks the fist clear of a party the sea has just dragged together. The healer has the raidwides, the catches and a bleeding hero.
10. **Its own.** A boss who becomes the summon, with a new bar, a new room and new music; and a rule (bounces) that includes the room's own props.
11. **What will players talk about?** The Last Round's three jobs, and the stone that turned a giant wheel back into the middle.

## Changes

1. **Deep Call drags everyone in** (to within a step or two of the middle, never closer) instead of shoving them to the rim. No more standing against the wall as a wave comes back off it. It is now a set-up: the sea drags the party together and the next move lands on the gathering. Tell and impact redrawn (swells and arrows closing on the middle, rings collapsing).
2. **Pairs.** Pull then **Fist Slam** (called as the pull lands); pull then **Sunwheel Unbound**; **Breaker** then an Unbound drawn while the wave still runs; **Grip** then Breaker (the held hero is in the wave's lane); **Victory Leap** then a **Sunwheel** thrown from where he landed (Acts I and II).
3. **The stones bounce wheels.** In the sea the four debris are posts for Sunwheel Unbound and for Twin Wheels from the titan (the wheel's centre turns at the stone's radius plus its own). Catch rings are always placed on open floor, clear of the stones and of every other stretch of the road (the planner tries many throws and keeps the one with the most room).
4. **Tank and healer work.** More tank hits in the sea come from the fist paired with the pull (Deep Call, then Fist Slam) and from Grip then Breaker; the titan's own strikes were tried and dropped (a runeguard tank could not live through them with the weaker healer).
5. **Last Round** is paired throughout and ends on three jobs at once (Grip, six-bounce wheel, fist on the tank). Hard adds Twin Wheels from the titan before it, and once in the middle of Act III. Last Round's calms are 10 to 11 s.
6. **Sand Furrow** zone lasts 12 s, not 16 s.
7. **Enrage and pacing.** Hard's calms between sets are a sixteenth shorter (the same moves, sooner: more pressure, and a script that ends at 9:11), and The Final Bell casts at 612 s (lands 10:20, about a minute after the script ends). Normal unchanged (10:15, script ends 9:05). Normal's calms are the original ones; shorter ones starved the weaker line-up (grovekeeper healer, runeguard tank) of healing time between the raidwides.
8. **Journal.** Deep Call rewritten for all 23 heroes; Sunwheel Unbound mentions the stones for all 23. Normal's Grip hand has more health (30000, was 24000) so breaking it takes real focus. No new cast names, so no new sounds, icons or voice lines.

## Kept

Telegraphs never hidden, 8 to 10 minutes, one enrage, the closing passes for a slow party, Hard's four Normal-never moves (Twin Wheels, Double Grip, Riposte, Riptide).

## Numbers (bots, three seed sets of 30)

Before: Normal `GEAR=post3` 85 of 90 (94%); Hard `GEAR=post4` 64 of 90 (71%). After: Normal 83 of 90 (92%) with the strong line-up, the weaker check line-up (runeguard, grovekeeper, shadowblade, pyromancer) about 65% as before; Hard 109 of 180 (61%) over six seed sets, deaths in the Grip (hand not broken in time) and the early catches. Hard clears run to about 608 s in the slowest runs, so the cast at 612 s is just clear of them.

## Second pass (2026-10-26): enrage slack and the missed catch

Hard health 5.8M to 5.45M, damage multiplier 1.22 to 1.34, and The Final Bell casts at 632 (was 612): the slowest bot clears are about 595 s, about 35 s clear of the cast. A missed catch bursts on the room for 10500 on Hard (was 17000) and 14000 on Normal (was 20000): still a mistake that costs, no longer a wipe chain into dead healers. Bots: Hard `GEAR=post4` 50 of 90 (56%); Normal `GEAR=post3` 83 of 90.
