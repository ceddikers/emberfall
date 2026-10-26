# Rework: Morrow-Oak, the Starved Grove (Boss XI)

Goal: fun 8+/10 (was 6 Normal / 5.5 Hard) and a fair Hard (was 6/10), without making anything easier by cutting layers. Keep the clever
moves and tune spacing, caps and numbers instead.

## Finding the fight's idea (the answers stand; what changes is shown)

- **Who is he?** The oldest tree, feeding his own grove to the Hunger. Unchanged.
- **The question:** "What will the Hunger eat next, and where do we let it?" Unchanged.
- **What the party can read:** the seed over a hero's head, the ring that locks, the ground splitting, the petals painted before they snap.
  Unchanged, and now also: a seed that bursts beside an old hole feeds it (the hole swells) instead of digging a new one.
- **The signature:** the party permanently reshapes the room. This is kept, but the room now **converges**: a hole stops growing at a ceiling,
  six holes is the most there will be (after that every seed feeds the nearest), so an early mistake costs a bounded piece of floor and the
  fight no longer gets steadily worse for a reason nobody remembers. The room is shaped by where you put the first holes, then it settles.
- **The finale:** Last Bloom keeps every living limb firing in turn and then the last Bloom. The act now *opens* with a new combination, Draw and
  Bloom: an Inhale whose pull puts you at his feet, rolling straight into a Fourfold Bloom whose petals open where you have been drawn.

## What was wrong (bot data, Hard at GEAR=post4, 15 of 30; Normal 26 of 30)

- Hard wipes were almost all in the first minute of Act III (boss at 42 to 45 percent): a Barrow Lantern chain that kept coming back to the same
  two heroes, a Cleaver Bough soak that cost a squishy more than half their life, a Twin Seed or Last Gasp landing on top of a limb's move, and a
  Sap Tide in between. Several heroes died within seconds of each other, to moves that had started in different places.
- Act IV wipes at 1 to 13 percent were two Sap Tides four seconds apart: the previous act's closing tide and the new act's first step.
- Falls were rarely the killer; the cost of holes was the room, and the Inhale or Hungering Dark that ended a hero in one.

## Changes

1. **The Hunger has its fill.** Hole ceiling radius 105 (a Twin Seed's giant one 125, was 170 and 150); six holes at most; a seed whose burst lies
   within 120 of an old hole's rim, or any seed once six are open, feeds the nearest hole (+14, giant +30) instead of digging. Saplings
   grow holes only up to the ceiling. Bots take their seed to the rim of an old hole.
2. **Pulls stop at the edge.** Inhale and Hungering Dark drag you to a hole's edge, never into it (Hungering Dark now hits 9000 instead of 6000, since it no
   longer drops anyone), and one hole's pull a hero per cast. A fall is now always the walker's own step.
3. **One heavy move at a time.** Seeds, Twin Seed, Inhale, Fourfold Bloom, Draw and Bloom, a limb's turn, Hungering Dark and Last Gasp each hold
   the floor for as long as they run; one that comes due sooner waits (it keeps its name in the feed, with the new time). Sap Tide and Root Lash are
   the healer's and tank's own beat and never wait. Last Bloom is the one deliberate pile-up.
4. **Barrow Lantern** never passes to a hero who has carried it this chain (it used to ping-pong between the same two).
5. **Sap Tides are spaced** at least 9 s apart, growing +5% each up to +50% (was +60%).
6. **Cleaver Bough** soak total 54000 / 52000 (was 60000 / 56000).
7. **Act IV** opens with Draw and Bloom (new, uses only the existing Inhale and Fourfold Bloom casts, so no new journal page or sound) instead of an
   immediate Sap Tide.
8. Hard keeps every layer: Twin Seed, Hungering Dark (Hollowing and the Grove Remade), Deeper Roots (4 of 8 limbs), Last Gasp.

## Check list

- Telegraphs unchanged on every difficulty; no new hidden tell.
- Normal GEAR=post3 target 85 to 90 percent, Hard GEAR=post4 target 55 to 60 percent (three seed sets of 30).
- Journal pages rewritten for what changed: Hunger Seed (feeding), Inhale, Hungering Dark, Last Gasp.

## Second pass (2026-10-26): the first minute of Act III

Hard: the first limb waits 3 s longer after the Swallowing and the post-Swallowing Root Lash 4 s longer (the healer's breather); the first two limbs to take a turn are never Cleaver Bough or Barrow Lantern; the first Twin Seed of the new room comes after the limbs have taken three turns (it sat on top of the Swallowing's aftermath). Normal moves the same Hunger Seed set later. Bots: Hard `GEAR=post4` 56 of 90 (62%); Normal `GEAR=post3` 77 of 90.

## Cool-factor pass (2026-10-26): looks and screen feel only, no mechanic changed

The ask: richer signature moves and a dodge that feels earned. Every telegraph is drawn exactly as before (red damage, blue share, no safe spot painted); nothing here changes who is hit.

- **The whiff** (morrowoak-fx.js `whiffs`): a hero a blow did not take, within a stride of its edge (or slipped through a lane or petal), gets the edge cracking past them in the move's own light, dead leaves and bark thrown off the wind of it, a ring of dust; your own hero also gets a flash at the edge of the screen and a push of the camera. A hero hurt by any blow of the same moment never gets one.
- **The lip**: coming to a hole's rim without falling (a step taken just short, or an Inhale or Hungering Dark pull that stops at the edge) knocks clods into the dark and flares the rim.
- **Holes alive**: light lifts off every hole and the odd dead leaf is pulled in; a new hole stands up a column of light for a heartbeat.
- **Windups**: Inhale darkens and rushes the screen's edge inward and rumbles the floor as it builds; the Hunger Seed's lock thumps the ground; Hungering Dark winds the dark inside each hole and flares the rim white in the last breath; every limb's move gathers its colour round the limb (halo, drawn-in motes, a white ring) before it fires.
- **Screen feel**: Sap Tide floods amber in from the screen's edge; petals, seed bursts and hole births push the camera; the Last Bloom's petals each stand a column of their light and ring the room.
- **Last Gasp**: the broken limb's stump gathers its colour back for the moment before the move goes off again (the server now sends `gasp` with the break, and `last` on the final Bloom; both only read by the client).

## Gameplay pass (2026-10-26): dodges that ask for skill, and a less metronomic Act III

The ask: more fun and complexity without taking difficulty away, dodges the player earns. Every telegraph is still drawn, red for damage, no safe spot painted; the hole caps, pulls that stop at a lip, one heavy move at a time and Act III's breather are all kept. Both difficulties.

- **Storm Knot**: each rod's ring follows its hero until the last breath (Normal 1.45 s, Hard 1.2 s before it lands) and then sets. Lead it clear of the others, then step out of it: a ring is a stride and a half wide, so the exit has to start the moment it locks.
- **Brood Roots**: the strands close, then turn half a gap (Hard draws the way) and close again; the second set is painted as the first lands. The middle of a gap is a strand the second time; the ground the first strands struck is safe. Roots hold 2.4 s the first time and 1.5 s the second, so a held hero is never chained. The move holds the floor longer (dur 6.6).
- **Sap Tide's ebb** (Grove Remade onward): the ground heaves after the tide, a ring at his feet (step out) or the ring round them (step in), painted the moment the tide lands (2.0 s warning, 1.7 s on Hard); the order is out, plain, in, plain (Hard starts at in). Cast name unchanged. New tag `mgEbb` with its own tell and impact in morrowoak-fx.js (sap light welling through the ring).
- **Act III variety**: the second Inhale of the act is a Fourfold Bloom instead, so the act no longer runs tide, lash, limb, tide.
- Numbers: `dmg.ebb` 8200 Normal, 7800 Hard (before the shared 1.13 tune).
- Journals rewritten for Sap Tide, Brood Roots, Storm Knot (all 23 heroes each).
- Bots: Normal `GEAR=post3` 76 of 90 (84%, was 86%); Hard `GEAR=post4` 49 of 90 (54%, was 62%) on the ebb at 7800 and rods at 1.2 s; Hard is the slightly tighter fight, Normal sits at the edge of its range. A first try (ebb 8800, rods 1.1 s) was 48 of 90 on Hard.

## Fun pass (2026-10-26): tank and healer beats, the Swallowing, Hard shuffles, numbers

- **Lanes** (`lay()` in the acts): every act is a list of time slots in three lanes, T (tank: Root Lash), H (healer: Sap Tide, or an Inhale whose haul now bruises the party for about a sixth of a life: `dmg.haul`, Acts I to III) and F (seeds, Blooms, saplings, limb turns). Healer gaps are now 25 to 34 s in every act on both difficulties (were about 55 to 60 s in Acts I and II). Hard draws the order within each lane (the opening tide stays first, the lash lane and the first three Act III slots stay put) and rejects draws that put a Root Lash within 9 s of an Inhale or 8 s of a Tide, or a Bloom within 11 s after an Inhale (the haul puts everyone at his feet). Acts II and III now shuffle on Hard too (scratch check over 60 seeds: no violations).
- **Tank**: not solved. Tank beats are still Root Lash about every 55 s (Act I 25, 80, 135 s; Act II 30, 86, 134; Act III 50, 118, 186, 220) plus a Cleaver Bough soak on the tank every other time (Act III). Two ways to fill the gaps were built and measured, and both lost: a seed that rides the tank (the tank walks it to the rim; cost about 20 s of clear time and 15 points Normal, 15 Hard; Normal 87% but the runeguard line-up fell to 1 of 6) and a second Root Lash between lashes (the runeguard tank dies, 0 of 6 at 28 s spacing). Seeds that ride the tank stay in `seed(n, twin, onTank)` history only; the code is not in the file.
- **The Swallowing** (wall 25.4 s, was 21): the unfold cast is unchanged; after the landing a quick Fourfold Bloom (10.2 s), then the Sap Tide (16.6 s), the Root Lash (19.8 s) was dropped from the wall (the post-wall lash stays at SWALLOW + 13/17 s) so the weaker tanks survive. Bug fixed: if a Sap Tide was in flight when the gate fell, the Swallowing's raidwide landed 2 to 3 s after it (two raidwides inside 3 s, a wipe on Hard); the Swallowing now waits for that tide to land.
- **Act III and the hole rule**: the Cleaver Bough chop feeds any hole it crosses (+8, up to the ceiling); the soak lands on the tank every other time. Storm Knot rods 190 to 170.
- **Act IV**: the final Fourfold Bloom now comes at the end of the act (a step at 64 s, and also the moment he falls under 5%) instead of at 38 s, so the last 20 s are the climax, not a tail of single moves.
- **Numbers**: `hardDmg` 1.15 to 1.2 on a Hard table about 0.92 of Normal's (every move both have hits about 1.1x on Hard; Hard-only moves keep what they hit; Hard autos 2300); header comment fixed (was "25% more").

### Fun pass, round two (2026-10-26, after review)

- **Tank**: the lash lane now plays a Root Lash about every 35 s (Normal gaps 34 / 32 / 39 s by act; Hard up to 38 / 34 / 42 with the draw); the seeds that were filed as "tank beats" in round one drew only from the non-tanks and are plain seeds in the F lane again (the header is fixed). In Act III the Cleaver Bough soak lands on the tank every other time. Across the Swallowing the wall holds one Root Lash (lands ~24 s into the wall), the first Act III lash comes ~37 s into the act. A seed that rides the tank and a lash every 28 s were both measured last round and both lost clears (tank-seed: DPS time; 28 s: the runeguard tank dies).
- **No deleted steps**: no `null` slots; every lane is full and no two named steps are more than 14 s apart (Normal 8 to 12 s, Hard 8 to 14 s). Act I 15 steps, Act II 19, Act III 26.
- **Inhale**: every Inhale bruises now (Act IV's opening Draw and Bloom, the closing pass and the bare Inhale included). Journal pages for Inhale, The Swallowing (petals, sap, lash after the landing) and Cleaver Bough (the chop widens holes it crosses) updated.
- **Hard**: the whole act is drawn each pull: lane orders are shuffled, every slot moves up to 2 s, and the draw is retried (up to 600 times) until the spacing rules hold (lash 9 s clear of an Inhale and 8 s of a Tide, a Bloom 11 s after an Inhale, 8 to 14 s between steps). 240 scratch layouts (80 seeds x 3 acts) were all different and all valid; if no draw is valid Normal's order, valid by construction, is played.
- **Bugs**: the Swallowing's Tide moved to 16.5 s so the unfold no longer cuts its bar; Normal's Act II Haul/Lash now 10 s apart (the rules are checked on Normal too); a Root Lash waits for any other cast bar in progress (the Lantern's long one most of all) except the wall's tide/lash pair.
- Bots (`post3` Normal, `post4` Hard, 3 x 30): Normal 84/90 (93%), Hard 51/90 (57%). Line-ups 5/6 each at six runs.

### Fun pass, timeline fix (2026-10-26)

`tools/check.js` plays every course's whole list, so round two's longer lists made the script 679 s. Lists now end at Act I 118 s, Act II 133 s, Act III 246 s (the real acts last about 110, 120 and 210 s for a party at pace, so the closing passes stay unreached; the first cut, Act III at 199 s, let Hard parties into the closing ramp and cost about 6 points), Act IV 64 s: scripted 9:47 Normal, 9:46 Hard. Act III's first limb-turn slot moved to 16 s (the wake-up turn at the wall's end left a 16 s hole). Every Hard draw must now also hold a Sap Tide within 70 s of the act's start, no more than 80 s between two, and one within 70 s of the act's end (Inhale hauls do not count as raidwides for the check). `tools/check.js`: all checks passed. Bots: Normal 79/90 (88%), Hard 49/90 (54%).
