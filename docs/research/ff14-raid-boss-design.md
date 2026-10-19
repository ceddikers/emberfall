# Research: FF14-style raid boss design

*Compiled by a research agent, 2026-10-19, from consolegameswiki, cactbot timeline files (real per-second timings), AkhMorning, developer interviews and forum threads. "(est.)" marks numbers filled in from general FF14 knowledge.*

## 1. Mechanic vocabulary and telegraphs

The marker's shape says **what** to do; the cast bar or a shrinking ring says **when**. Savage often swaps floor markers for reading the boss's animation.

| Mechanic | Telegraph | Tests |
|---|---|---|
| Tankbuster (solo / shared / cleaving) | Reticle on the tank plus a named cast | Tank cooldowns, healer pre-shields; others staying clear |
| Vuln-stack buster | Leaves a damage-taken-up debuff | Tank swap or invuln |
| Raidwide | Named cast, no dodge | Healer and mitigation timing; the fight's metronome |
| Stack | Arrows down onto a player | Grouping; damage split among those inside, lethal if too few |
| Spread | Circle on each player | Spacing |
| Tower / soak | Glowing circle with pips showing how many it needs | Assignments; under-soaking gives a raidwide penalty |
| Proximity / falloff | Rings pulsing outward | Getting distance |
| Knockback | Cast, sometimes arrows | Positioning against walls and edges |
| Line / cone / half-room | Rectangle, cone, or a glowing side of the boss | Reading and moving in time |
| Chariot / donut (in/out) | Circle vs ring, often chained | Reaction; memory when stored |
| Puddle bait | Ring on a player, then a ground AoE where they stood | Dropping it at the edge |
| Tethers | Lines between players or the boss | Pairing, distance, passing |
| Gaze | Eye | Facing away |
| Acceleration bomb / "must move" | Debuff timer | Stop or keep moving at expiry |
| Limit cut | Numbers 1–8 | Order of resolution |

**Snapshot:** hits are judged at the end of the cast or when the indicator vanishes. Damage can land later.

**Phase structure:**
- **Add phases.** The boss goes untargetable while adds are killed.
- **Intermissions.** Short untargetable set pieces between phases.
- **DPS checks.** Kill fast enough or a set piece fires (E5S skips a phase if damage is high enough).
- **Hard enrage.** A fixed-time wipe (P1S about 10:00, M4S 13:24).
- **Soft enrage.** Escalating repeats of an attack until the boss dies.

## 2. Normal vs Savage, and how a timeline is built

Savage keeps the same boss and adds **layers**:
1. Stored mechanics replayed later.
2. Two known mechanics at once.
3. Role-split targeting.
4. Mixed debuff timers.
5. Telegraphs removed.
6. Permanent escalation (the boss buffs itself whenever players fail).

**Timeline grammar** (from the M1S/M4S cactbot timelines):
- **Opener:** a raidwide at 10–15 s.
- **Introduce, then combine.** A mechanic appears alone first and returns paired with another a minute later.
- **Tankbusters:** every 2–3 minutes.
- **Raidwides:** every 1.5–2.5 minutes, at block boundaries.
- **Blocks:** each set of mechanics lasts 20–60 s.
- **Phases:** two phases with an intermission on 4th floors.

**Developer process:**
- Mechanics are designed separately, then combined into the timeline.
- Difficulty is tuned with built-in knobs.
- Arcadion moved back toward boss personality and novelty after Pandæmonium felt like "going through the motions".

## 3. Signature mechanics that translate well to top-down 4-player play

- **P1S Shackles.** Near/far debuffs.
- **P1S Gaoler's Flails.** Shown weapons resolve in order: circle, donut or cleave.
- **P4S Pinax.** Corner panels resolve in turn as proximity, knockback, spread or stack.
- **M1S Mouser.** Tiles crack, then break.
- **M1S Nine Lives.** Clones replay the boss's moves.
- **M2S hearts.** Every avoidable hit adds a heart; at 4 you're stunned and the boss gets a permanent buff. A soft punishment.
- **M3S Lariats.** The glowing arm is the cleave side, combined with in/out.
- **M3S fuse bombs.** Short and long fuses swap groups.
- **M3S knockback towers.** Push you behind the boss to escape a 270° cleave.
- **M4S Bewitching Flight.** Thin lines widen into bursts in a random order.
- **M4S Witch Hunt.** Rings spiral in or out.
- **E8S Mirror Mirror.** Mirrors replay the boss's attack after a delay.
- **TEA limit cut.** Numbered order.
- **Pantokrator.** A rotating line "dance".

## 4. What players find fun and what annoys them

**Fun:**
- Geometric "dances" that click once the group is in sync.
- Set-up-and-watch-it-play-out moments.
- Quick puzzles you solve *while still attacking*.
- Personal failure killing only you.

**Annoying:**
- Excessive randomness that breaks planning (O10S).
- Downtime and forced disengagement.
- Repetitive "two basic mechanics until it dies" fights.
- Over-forgiving design that feels like going through the motions.
- Untelegraphed knock-off-the-edge deaths.

**Takeaways:**
- Keep the boss targetable.
- Make randomness a solvable *pattern* (which side, which order), not a random *outcome*.
- On Normal, one player's mistake shouldn't wipe everyone.

## 5. Practical numbers

- **Length:** Savage enrages land at 10–13.5 minutes; Normal fights die in about 5–8 minutes (est.). **For us: 4–6 minutes on Normal, 7–9 on Hard.**
- **Gaps:** 3–10 s between mechanics inside a set; 5–15 s of breathing room between sets.
- **Raidwides** every 60–150 s; **tankbusters** every 90–180 s.
- **Cast-bar warning (est.):**
  - Simple dodges: 3–5 s.
  - Busters and raidwides: about 5 s.
  - Big multi-part sets: 7–10 s.
  - Chained hits: about 3 s apart.
- **Damage (est.):**
  - Normal raidwide: 20–35% of max HP.
  - Savage raidwide: 50–80%.
  - Savage tankbuster: near-lethal without a cooldown.
  - Variance: ±5%.

**Reusable recipe:**
1. Raidwide opener.
2. Introduce A, then B.
3. Buster.
4. A+B combined.
5. Raidwide.
6. Introduce C (an arena change).
7. Intermission.
8. Phase 2 remixes A/B/C with stored versions.
9. Enrage.

**Hard mode:** add storing, role-split targeting, a second simultaneous layer, animation-only telegraphs, a tighter enrage and higher damage.

## Sources
- https://ffxiv.consolegameswiki.com/wiki/Common_mechanics_and_markers
- https://ffxiv.consolegameswiki.com/wiki/Snapshot
- https://www.akhmorning.com/resources/raiding-fundamentals/
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r1s.txt
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/raid/r4s.txt
- https://ffxiv.consolegameswiki.com/wiki/AAC_Light-heavyweight_M1_(Savage) (and M2–M4)
- https://ffxiv.consolegameswiki.com/wiki/Asphodelos:_The_First_Circle_(Savage)
- https://www.akhmorning.com/news/famitsu-interview-edens-gate-part-2/
- https://backyarddrunkard.com/game-news/ffxiv-raid-design-player-comfort-yokozawa-interview/
- https://forum.square-enix.com/ffxiv/threads/404902-Favorite-mechanics-in-a-fight
