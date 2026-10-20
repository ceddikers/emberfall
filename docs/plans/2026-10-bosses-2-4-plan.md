# Skitterra, Volkar, the Hollow King: choreographed fights

*2026-10-20. The same treatment as Grubnak (`2026-10-grubnak-pilot.md`, built and pushed in a616ca2): one authored, non-looping 8–10 minute script per boss on `f.course`. Every telegraph is on the floor on every difficulty. Each boss's decisions are listed at the end of its section. **Picked 2026-10-20: every recommendation (A) for all three.** Build order: Skitterra, Volkar, the Hollow King, one at a time, each committed when you approve.*

## The four side by side

Each fight has its own shape: if you swapped two bosses' names, it would feel wrong.

| | Grubnak (built) | Skitterra | Volkar | The Hollow King |
|---|---|---|---|---|
| **Shape** | dinner rush: relentless, accelerating | the hunt: long dread, then sudden swarms | the storm front: steady crescendo, a calm eye, then it all comes back | the court: call and response |
| **Question** | where do I stand? | what do I break? | who do I pair with, and where's cover? | what did I just see? |
| **Acts** | 4 courses | 3 acts | 2 movements | 5 sessions |
| **The seam** | room transformation, no downtime (Flare-Up) | she leaves: an untargetable hunt in the dark with an objective (The Dark Between) | a targetable lull with a quiet movement puzzle (The Eye) | a recess: he sits on the throne while his court wakes (Court of Bones) |
| **Unique set piece** | the order rail | cutting the threads in the dark | the Squall Line chase | the Charge Sheet (shown at 1:50, judged at 6:00) |
| **Finale type** | gauntlet (Dessert Trolley) | collapse: the floor falls away to the silk | one shared soak, again and again (Heavens Fall) | relay objective: pass the last lantern (the Long Night) |
| **Hard enrage** | Last Call 10:00 / 10:15 | Devour 10:10 / 10:20 | Skybreak 10:00 / 10:15 | Moonset 10:30 / 10:40 |

What all four share (from the prompt):
- one order on every pull;
- mechanics introduced alone, then paired, stored or remixed;
- HP gates at set seams, with a closing sequence (+10% a pass) for slow parties;
- one named hard enrage with about a minute of slack (about 45 s on Hard);
- the timeline lint, and bots clearing Normal.

## Kill speed and HP

Measured today with the `check.js` line-ups, six seeds each on Normal:

| Boss | Now | Bot DPS on the boss | Downtime planned | New HP (Normal / Hard) | Good-party kill |
|---|---|---|---|---|---|
| Skitterra | 6 of 6, 4:07–4:49 | ~245 (the brood takes a share) | ~40 s (The Dark Between) | 2.5M / 2.7M (was 1.3M / 1.75M) | ~9:10 |
| Volkar | 5 of 6, 3:44–3:57 | ~340 (he never moves) | none (the Eye is targetable but calm) | 3.6M / 3.8M (was 1.65M / 2.2M) | ~8:50 |
| Hollow King | 6 of 6, 6:06–6:26 | ~307 | ~35 s (Court of Bones) | 3.3M / 3.5M (was 2.3M / 3.0M) | ~9:30 |

The timeline is the same for 1–3 players; mechanics that count people (bells, rods, stacks, sacs) already count the living. Bot tuning comes per boss after its build, as with Grubnak.

---

## Skitterra: the hunt in the web

**Shape: long dread, then sudden swarms.** Act I is slow and quiet: mechanics come 12–15 s apart, alone, while six egg clutches pulse in the web from the pull. Then the brood breaks out all at once. **Question: what do I break?** Eggs (each one broken costs boss damage now, but it's a smaller swarm later), threads (each one cut is one less ambush in the dark, but one less strip of floor at the end), and pillars (Acid Deluge chips the ones you hide behind).

New pieces:
- **The brood clock.** Six egg clutches sit at fixed spots in the web from the pull (adds with HP, inert), glowing brighter as they ripen. The two ripest hatch as the Brood pair at about 2:20. All that remain hatch at once as **the Swarm** at about 5:40, two spiderlings each, leashed to their nest, enraging after 45 s. Breaking a clutch costs about 8 s of one DPS.
- **Spin.** She strings three threads pillar to pillar across the octagon. Crossing one stings and roots you for 1 s, so the room is cut into sectors, and cut threads stay cut. A thread is cut by standing on its knot at the pillar for 2 s.
- **The Dark Between** (the seam, at 68%). She climbs into the dark beyond the pillars (untargetable, about 40 s). The cave dims to pools of light. Her shadow runs along every uncut thread in a fixed order, and at each knot she reaches she drops (a circle shown 3 s before, 650). Cutting a knot before she gets there removes that drop. She comes back down into the middle, and the outer ring of the web turns sticky for the rest of the fight (Tightening Web, kept).
- **The collapse** (finale). The cave floor falls away ring by ring from the walls inward (each ring cracks and sheds dust for 6 s first; falling: 700 and held 5 s). What's left is the hub, the eight spokes and the threads you didn't cut.

| Time | Mechanic | What it tests | Tell |
|---|---|---|---|
| **Act I: The Web** | *100% → 68%, about 2:45; 12–15 s apart, one thing at a time* | | |
| 0:05 | Venom Mist | raidwide | green fog rolls in from the walls |
| 0:18 | Silk Wrap | tankbuster; rooted where it lands | silk wheels round her |
| 0:32 | Eightfold Lunge | rotating safe side, alone (4 steps) | legs light in order |
| 0:50 | Silk Lines | stretch the tether | slack thread sags, taut runs bright |
| 1:05 | **Spin** | three threads cut the web into sectors | silk fired pillar to pillar |
| 1:20 | Venom Spit | bait the two cones outward; pools stay | venom beads along the line |
| 1:35 | Strand Reel | she crosses the room along a lane | a strand to a pillar |
| 1:50 | Venom Mist | raidwide | |
| 2:05 | Silk Wrap → Lunge | the rooted tank must already be safe | |
| 2:20 | **Brood** | the two ripest clutches hatch: kill in sync | the ripest eggs split |
| 2:30 | Silk Reel (during the brood) | dash to snap it | |
| 2:45 | Acid Deluge | hide behind a pillar; pillars chip | |
| **The Dark Between** | *at 68%, about 40 s, she's gone* | | |
| +0 | Into the Dark | she climbs out of sight; the light falls to pools | |
| +4 … +34 | five drops, 6 s apart, along the uncut threads in order | **cut the knot she's running to, or dodge where she lands** | her shadow racing along the silk; the knot glows |
| +20 | Venom Drip | spread, while cutting | drops falling from the dark |
| +38 | she drops back into the middle; the outer ring turns sticky for good | | |
| **Act II: The Brood** | *68% → 28%, about 3:25; pairs, then the swarm* | | |
| 3:30 | Venom Mist | | |
| 3:42 | Silk Wrap + Lunge | | |
| 4:00 | Silk Lines + Venom Spit | | |
| 4:18 | Silk Reel | | |
| 4:30 | Eightfold Lunge | | |
| 4:45 | Strand Reel | only along threads still standing | |
| 5:00 | Venom Mist | | |
| 5:15 | Acid Deluge | fewer pillars now | |
| 5:40 | **The Swarm** | every clutch left hatches at once: the eggs you broke are the adds you don't fight | the whole web shakes |
| 5:55 | Silk Wrap | buster during the swarm | |
| 6:10 | Silk Lines | stretch over the adds | |
| 6:25 | Venom Mist | | |
| 6:40 | Lunge | | |
| **Act III: The Collapse** | *28% → dead* | | |
| +0 | The Web Gives Way | the outer ring falls; three more rings follow, 20 s apart | cracks and dust |
| +10 | Venom Mist | | |
| +22 | Lunge on a shrinking floor | | |
| +36 | Silk Lines along the threads | | |
| +50 | Silk Reel toward the edge | | |
| +62 | Venom Spit | | |
| +75 | the last ring falls: hub, spokes and uncut threads | | |
| then | Venom Mist + Lunge every 20 s, +10% each | burn | |
| 10:02 | Devour (lands 10:10) | hard enrage | |

**Hard** (casts 15% faster, 25% more damage, and her three moves kept: Egg Sacs, Fang Rush, Spinneret Volley):
- Lunge runs 6 steps; Silk Lines is green and red; the brood pair's beam stays.
- **Two drops per uncut thread** in the Dark Between.
- Clutches hatch three spiderlings each.
- **Molt** in Act II: the husk replays her last Lunge while she starts a new one (the stored layer).
- **Role split:** Silk Wrap on the tank and Silk Reel on the healer at the same beat.
- Fang Rush along a thread in the collapse; Ceiling Ambush, with the floor shown; Acid Deluge leaves sticky floor.
- **Cocoon is removed** (your "never cocoon a player" rule).
- Devour lands at 10:20 with 2.7M HP.

**Decisions:**
1. **Threads and the finale floor.**
   - **A (recommended):** the hub and eight spokes always stay, and each uncut thread adds a strip of floor. Cutting saves you in the dark and costs you room at the end, but you can never cut yourself out of a floor.
   - **B:** the finale floor is only the hub and the uncut threads. A harsher trade-off: cut too many and the end is very tight.
   - **C:** no cutting. The Dark Between is a pure stalk-and-dodge.
2. **The brood clock.**
   - **A (recommended):** six clutches visible from the pull, two waves (the pair at 2:20, the swarm at 5:40).
   - **B:** one clutch hatches every 60 s, ripest first: a steady clock rather than a swarm.
   - **C:** only the swarm.
3. **The Dark Between.**
   - **A (recommended):** at 68%, about 40 s, fully untargetable.
   - **B:** shorter (about 25 s), and her legs stay targetable on the pillars, so DPS isn't lost.

### Skitterra as built (2026-10-20)

- **Knots are breakable, not cut by standing.** Each thread's knot is a small add with HP. In the dark, the party's damage goes to either knots or eggs, which is the "what do I break?" question in its plainest form. Four threads (a square round the middle), not three.
- **HP 3.0M / 3.2M** (the plan said 2.5M / 2.7M). With the brood moved, the bots do more damage to her than the old fight showed. Act I's gate moved to 70%.
- **The last ring stops at 260**, not 210. A smaller hub left no room for melee and Lunges together. Act III swaps Silk Reel (it dragged people across the pits) for a Silk Wrap, and its burn ramps 6% a pass rather than 10%.
- **Falling is its own punishment** (700, held 2 s, hauled back), with no Vulnerability stack.
- **Measured:** the script runs 8:05 (Normal) and 8:56 (Hard). Bots clear 11 of 12 Normal pulls in 8:17–9:21, and Hard runs clean with every move firing. Act III also drops Venom Spit (dodging it sent bots off the spokes), and knots only draw the bots once no spiderling is loose.

---

## Volkar: the storm front

**Shape: a steady crescendo, a calm eye, then it all comes back.** Act I's gaps tighten evenly from about 15 s to about 8 s. The Eye is 40 s of calm: the Pulse stops, the rain stops, and he's targetable but still. Then the back of the storm replays Act I mirrored and doubled, building again to the sky coming down. **Question: who do I pair with, and where's cover?** Polarity is the spine: every pairing, stack and shelter is read through your charge.

New pieces:
- **Squall Line** (the unique chase). The summit's safe circle drifts off-centre and orbits him once over 30 s: the electrified edge closes on one side and opens on the other. The party walks round him with it while still attacking. Storm Walls turn inside it.
- **The Eye** (the seam, at 55%). The wind drops, and the four standing stones light up with charges in a fixed pattern (two +, two −). When the Eye closes, each stone discharges into anyone of the wrong charge standing at it, and an empty stone discharges across the summit. The answer is to be at a stone of your own charge, which also sets up the Thunder Crash that opens the back half.
- **Heavens Fall** (finale). A column of sky comes down on a spot (fixed spots, round him in turn), shown 5 s ahead. The whole party must stand in it together (damage split four ways, deadly to fewer), with both charges in it (all one charge surges). It comes every 16 s, each one 15% harder. Static Field and Surge sit between them.

| Time | Mechanic | What it tests | Tell |
|---|---|---|---|
| **Act I: The Front** | *100% → 55%, about 4:00; gaps tighten from ~15 s to ~8 s* | | |
| 0:00 | Polarity | charges for the whole fight | gold + / blue − rings |
| 0:06 | Thunderclap | raidwide | summit darkens |
| 0:22 | Titan Fist | tankbuster | lightning along the cone |
| 0:36 | Polarity Surge | pair + with − | arcs between same charges |
| 0:52 | Thunder Crash → Static Field | + players' stacks, then spread | clouds over each + |
| 1:10 | Rod Strike | marked pairs take the stones in turn | charge rings burning down |
| 1:22 | Gale Slam (no posts) | stand close: no wall or stone behind you | he draws breath |
| 1:38 | Storm Walls | walk with them | |
| 1:52 | Thunderclap | | |
| 2:02 | Titan Fist | | |
| 2:14 | Lightning Rods + Gale Slam | catch your rod, shelter behind it | |
| 2:30 | Avalanche → Storm Walls | hide behind a boulder | |
| 2:48 | Surge + Thunder Crash together | pairs and stacks at the same beat | |
| 3:05 | **Squall Line** | follow the safe circle round him for 30 s | the edge crackles and slides |
| 3:40 | Titan Fist | | |
| 3:50 | Thunderclap | | |
| **The Eye** | *at 55%, about 40 s; he stays targetable* | | |
| +0 | Eye of the Storm | the wind drops; the Pulse stops | rain stops, the clouds open |
| +8 | the stones light: two +, two − | **be at a stone of your own charge when it closes** | runes glow gold and blue |
| +38 | Eye Closes | wrong charge at a stone, or an empty stone: discharge | the stones flare |
| **Act II: The Back of the Storm** | *55% → 15%, about 3:50; Act I mirrored and doubled* | | |
| 4:40 | Thunderclap + Thunder Crash on the stones | pairs from where the Eye left you | |
| 4:55 | Titan Fist + Surge | | |
| 5:10 | Rods + Gale + Crash | rods and stacks together | |
| 5:30 | Avalanche from the other side, walls turning the other way | mirrored | |
| 5:50 | Rod Strike + Static Field | | |
| 6:08 | Thunderclap | | |
| 6:18 | Titan Fist | | |
| 6:30 | **Squall Line, the other way round**, with a Surge inside it | | |
| 7:05 | Rods + Gale | | |
| 7:22 | Crash → Field + Storm Walls | | |
| 7:42 | Thunderclap | | |
| 7:52 | Titan Fist | | |
| **Finale: Heavens Fall** | *15% → dead; the edge closes to 330 for good* | | |
| every 16 s | Heavens Fall, +15% each | all four in one column, both charges | the sky opens over the spot |
| between | Static Field / Surge | | |
| 9:52 | Skybreak (lands 10:00) | hard enrage | |

**Hard** (casts 15% faster, 25% more damage, and his three moves kept: Chain Lightning, Ball Lightning, Skyfall):
- **The charges flip as the Eye opens**, so the stone you need changes.
- Crumbling Summit replaces the closing edge in Act II.
- Titan Fist leaves the tank Conductive.
- **Role split:** Chain Lightning on the healer as Titan Fist lands on the tank.
- Three rods; three storm walls.
- The Squall Line orbits faster.
- Heavens Fall every 14 s.
- Skybreak lands at 10:15 with 3.8M HP.

**Decisions:**
1. **The chase.**
   - **A (recommended):** the Squall Line: the safe circle orbits him.
   - **B:** a straight front: a wall of storm crosses the summit side to side with one gap that slides along it.
   - **C:** keep the three-step closing edge as the chase.
2. **The Eye.**
   - **A (recommended):** Still Air (stand at a stone of your own charge when it closes).
   - **B:** the eye's centre is the only calm: pairs of opposite charge must share two small pockets.
   - **C:** no puzzle, just 40 s of quiet.
3. **Finale.**
   - **A (recommended):** Heavens Fall: the shared soak, again and again, until he drops.
   - **B:** one giant soak at a fixed time, then a plain burn to Skybreak.

### Volkar as built (2026-10-20)

- **HP 3.35M / 3.8M** (the plan said 3.6M on Normal). The slowest `check.js` line-up (Bastion / Cleric / Thermist / Driftblade) ran out of time at 3.6M with 1–7% left. At 3.35M it clears 2 of 3, and the fastest (Berserker) kills in 7:33–7:51, a little under eight minutes.
- **Lighter hits and a gentler Pulse.** Over a 9-minute fight the old numbers out-damaged any healer (110–150 damage a second taken against about 110 healed). Thunderclap, Thunder Crash, Static Field and his autos all came down, and the Pulse ramps 5% a minute rather than 20%.
- **The doubled sets were re-paired.** Rods with a Crash, and Rod Strike with a Field, so no two moves ask for opposite things at the same beat. The back half's Squall Line runs 24 s, so the rods after it don't land inside it.
- **The finale is Heavens Fall alone**, every 15 s (Hard 13 s), ramping 10% a pass, not 15%. Each one is 1,400 split between those in it. A Field and a Surge between the falls, and the heavier fall, made the last minute a coin flip. The first fall comes 10 s in, so it never overlaps the last Crash.
- **The Eye's stones and towers are gold (+) and blue (−)**, with the sign on each stone's face.
- **Bots no longer cut back through the Storm Walls' last turn** (their path check now looks at the next half second, not only quarter-points of a long walk). This was most of the bots' damage taken on Volkar, and it lifted every Grubnak and Skitterra line-up too.
- **Measured:** the script runs 8:25 (Normal) and 9:04 (Hard). Bots clear 12 of 12 Normal pulls (Berserker / Accelerant / Venomstrike / Pyromancer) in 7:33–7:51, 6 of 6 with Hemomancer / Inquisitor / Nightstalker / Sigilmancer in 8:18–8:43, and every `check.js` line-up at least once. Hard runs clean with every move firing (kept alive, the kill lands at 8:47–9:22).

---

## The Hollow King: the court of the dead

**Shape: call and response.** He calls (a swing, a Gaze, a decree) and the court answers a fixed beat later (the knights replay it, the coffins stir, the bells toll). Each session raises how much you have to remember. **Question: what did I just see?** It covers which swing, which knight saw it, and which charges he read out at 1:50.

New pieces:
- **The Charge Sheet** (the unique set piece; the long stored mechanic). At about 1:50, in Testimony, he reads out three charges. Three banners above the throne light in turn, each showing the sigil of one of his swings (sceptre for Sweep, boot for Stomp, crown for Crown of Graves). They go dark and stay dark through the recess. At about 6:00, **Judgement**: the three swings land in that order, 1.5 s apart, from him and both knights at once. Each is still drawn on the floor, but only for 1.6 s (1.2 s on Hard), so you have to remember the order.
- **Knights from the start of Testimony.** They rise at 80% (not 65%), so call and response is the fight's grammar from minute two.
- **The Long Night as a relay** (finale). One lantern. Doom moves from player to player in a fixed order (the next doomed's sigil starts to glow 6 s ahead). The lantern passes on touch, so the carrier hands it to the next one in time. Doom kills when its ring runs out.

| Time | Mechanic | What it tests | Tell |
|---|---|---|---|
| **I. The Summons** | *100% → 80%, about 1:45* | | |
| 0:05 | Barrow Knell | raidwide | the hall darkens, the toll rolls out |
| 0:16 | Sceptre Sweep | his calls, one at a time | he holds still, sceptre raised |
| 0:30 | Royal Gaze | turn your back | the eye opens over him |
| 0:45 | Grave Cleave | tankbuster + bleed | |
| 0:58 | Barrow Stomp | | cracks through the stone |
| 1:12 | Royal Doom | carry a lantern to the doomed | violet sigil |
| 1:30 | Crown of Graves | | hands reach up from the floor |
| 1:42 | Barrow Knell | | |
| **II. Testimony** | *80% → 62%, about 1:40; the knights rise and answer every call* | | |
| 1:45 | Echo Knights rise | | |
| 1:50 | **The Charge Sheet** | **remember three sigils, in order** | banners light in turn |
| 2:05 | Sweep → its echo | call and response | the knight flashes |
| 2:20 | Coffin Lids | lids skid across; they stay as cover | |
| 2:32 | Royal Decree | hide behind a lid | grave-light rolls down the hall |
| 2:48 | Stomp + Gaze → echoes | | |
| 3:05 | Grave Cleave | | |
| 3:18 | Barrow Bells | two to a bell | |
| 3:30 | Lights Out | stand in the light near him | |
| **III. Court of Bones** | *at 62%, about 35 s; he's on the throne* | | |
| +0 | the court is called to order | | he sits; the moon dips |
| +4 … +22 | six coffins wake one by one, 3 s apart | **break each before it opens**, in the order they glow | grave-light leaking out |
| +28 | the knights move; he rises with three-swing memory | | |
| **IV. Verdict** | *62% → 25%, about 3:50; calls and their answers overlap* | | |
| 4:20 | Knell | | |
| 4:30 | Sweep + Stomp → both echo | two calls, two answers | |
| 4:50 | Doom + Grave Marks | | |
| 5:08 | Royal Decree | | |
| 5:20 | Grave Cleave | | |
| 5:35 | Crown → echo with a Gaze | | |
| 6:00 | **Judgement** | the Charge Sheet resolves: three swings, three sources, 1.6 s warnings | the banners blaze |
| 6:20 | Knell | | |
| 6:35 | Bells + Lights Out | | |
| 6:55 | three swings → three echoes | | |
| 7:20 | Grave Cleave | | |
| 7:35 | Coffin Lids → Decree | | |
| **V. Sentence: the Long Night** | *25% → dead* | | |
| +0 | The Long Night | the lanterns go out; one stays | |
| every 12 s | **Doom passes on**, player to player | **relay the lantern** | the next sigil glows 6 s ahead |
| between | swings + echoes, Gaze, Knell, all glowing in the dark | | |
| 10:22 | Moonset (lands 10:30) | hard enrage | the last of the moon |

**Hard** (casts 15% faster, 25% more damage, and his three moves kept: Royal Audience, Funeral March, Gravebind):
- Judgement warnings of 1.2 s.
- **The Charge Sheet has four sigils**, one of them Royal Audience (face him).
- **Role split:** Grave Cleave on the tank as Gravebind lands on the healer and a DPS.
- Falling Masonry; Doom on two in the Verdict.
- **The relay passes two lanterns** (two dooms at once) in the Long Night.
- Moonset lands at 10:40 with 3.5M HP.

**Decisions:**
1. **The long memory.**
   - **A (recommended):** the Charge Sheet (shown at 1:50 on banners, judged at 6:00).
   - **B:** Judgement replays the whole of Testimony backwards.
   - **C:** no long memory; the knights' ordinary echoes only.
2. **Court of Bones.**
   - **A (recommended):** a recess on the throne. He's untargetable while six coffins wake in order: break them before they open.
   - **B:** he stays targetable on the throne (taking half damage) while the coffins wake.
3. **The Long Night.**
   - **A (recommended):** the relay: one lantern, Doom moving in a fixed order.
   - **B:** as now: the last lantern cures, carried by one player, with Doom on random targets.
