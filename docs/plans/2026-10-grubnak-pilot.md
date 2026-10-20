# Grubnak pilot: the dinner rush

*2026-10-20. The pilot for `2026-10-choreographed-fights-prompt.md`. Decisions picked: all four recommendations. Built the same day; what changed on the way is at the end.*

## Where he stands today (measured)

- Bot party (check.js line-up), Normal, six seeds: **6 of 6, 3:24–3:47**. Party DPS ≈ **290** in game numbers (boss HP 1.25M × 0.05 = 62,500).
- Pro party from `simulate.js` (Bastion 1,498 + Cleric 1,037 + Ranger 2,147 + Pyromancer 2,381, × 0.05) ≈ **353** on a dummy.
- Two loops (`f.loop`, about 2:00 each), one intermission (Simmer at 55%, about 17 s untargetable), Gorge below 15%, Last Call at 5:30.
- Hidden on Hard today: Mince / Double Chop, Ladle Spin, Lid Slam, the Ladle/Lid after Belly Flop, the meatball lane, the Normal-only wash and dashed outline in `boss-tells.js` (`outline()`, lines 38–56).

## Shape

- **Tempo: relentless and accelerating.** Gaps inside a course shrink from about 11 s to about 3 s by Dessert. The calm moments are short beats between courses, and they get shorter each time.
- **Central question: where do I stand?** Where your puddle goes down, where the casks land, which wall the charge hits, and which plate is yours. Each of these choices shapes the floor for later mechanics.
- **He never leaves.** He's the only boss with no downtime. The middle of the fight is a room transformation in place (the Flare-Up), not an intermission. Skitterra, Volkar and the Hollow King each keep a different kind of seam.
- **Unique set piece: the order rail.** Plates are served one after another. Each cloche's gold rim fills at its own rate, so the order shows on the floor with no numbers.
- **Finale type: a gauntlet** (Dessert Trolley), then silence, a last raidwide and a burn.
- **Acts: four courses** with one seam. This takes "four acts" off the table for the other three bosses. The Hollow King's four-part trial would then need to be three acts plus a coda, or five.

## Kill speed and HP

- Assumed "good party": **290 DPS**, the bots. A pro party is about 20% faster, and a first-night human party with deaths is about 15–25% slower.
- **HP: Normal 3.1M** (was 1.25M), so a good party kills in about **8:55**. A pro party takes about 7:20.
- **Hard 3.3M** (was 1.7M). The timeline is the same length on Hard (only cast times shrink), so Hard HP is set by the enrage, not the other way round.
- **Last Call (hard enrage):** the cast starts at 9:52 and lands at 10:00 on Normal, which leaves about 60 s of slack. On Hard it starts at 10:07 and lands at 10:15, about 45 s of slack once Hard's extra moves cost DPS.
- **Gates (boss HP remaining → time for a good party):** Appetiser to 80% (1:47) · Mains to 50% (4:27) · Flare-Up (about 22 s, targetable) · Second Sitting to 18% (7:18) · Dessert to dead (8:55).
- **Course scripts run about 5 s past the good-party gate time.** A good party sees the whole course, and a slow party runs into its closing sequence.
- **Smaller parties (1–3 players, no bots):** the timeline is identical. Plates, stacks and spreads already count the living players. I'd move the HP scale from 42/62/82/100% to about **36/56/79/100%**, since one player brings about 34% of a party's DPS and longer fights magnify the gap. I'll tune this against `bot-raid` with 1–3 bots.

## Timeline (Normal; times are for a 290-DPS party)

| Time | Mechanic | What it tests | Tell |
|---|---|---|---|
| **Appetiser** | *one tool at a time, about 11 s apart* | | |
| 0:06 | Grease Fire | raidwide, first heal check | oil slick spreads, catches |
| 0:16 | Mince | half-room dodge | cleaver on that side glints; half-room darkens under the ghost cleaver |
| 0:27 | Ladle Spin | get out | ladle in hand; soup churns round him |
| 0:37 | Lid Slam | get in | lid overhead; its shadow and ripples to the safe ring |
| 0:48 | Tenderize | tankbuster #1 (cone, cleaves) | raised cleaver; cone follows the tank |
| 1:00 | Meat Toss | spread; **you choose where your puddle stays** | steak on a chain over each non-tank |
| 1:12 | Family Meal | stack, alone this time | silver cloche lowers |
| 1:24 | Larder Toss | bait where the casks land (farthest two) | casks ripped off the shelves |
| 1:34 | Gut Blast | hide behind your cask | blast drawn with each cask's shadow cut out |
| 1:45 | Grease Fire | raidwide #2 | |
| ~1:55 | *closing if still above 80%* | | |
| **Mains** | *the kitchen fills: everything returns paired, about 8–12 s apart* | | |
| 1:52 | Butcher's Charge | tank baits it into brick, not the stove | head lowered; line follows the tank |
| 2:05 | Chop Chop | Mince **then** Ladle/Lid | next tool hangs on his back |
| 2:18 | Tenderize | tankbuster #2 | |
| 2:30 | **Order Up! (the rail)** | four plates served in order, 1.6 s apart; take yours when its turn comes | gold rims fill at different rates |
| 2:46 | Meat Toss → Family Meal | spread then stack, back to back | |
| 3:02 | Larder Toss | | |
| 3:10 | Butcher's Charge | **now the casks are down**: aim it at brick, not your cover | |
| 3:20 | Gut Blast | hide (if your cask survived the charge) | |
| 3:32 | Grease Fire | raidwide #3 | |
| 3:44 | Order Up! + Rolling Meatballs | the rail remixed: meatballs roll through the plate lanes; serve in order between them | wobbling meatballs, chevrons, lane |
| 4:04 | Tenderize | tankbuster #3 | |
| 4:14 | Chop Chop | reversed order to 2:05 | |
| 4:26 | Meat Toss + Family Meal 1 s apart | the crescendo before the seam | |
| ~4:35 | *closing if still above 50%* | | |
| **Flare-Up** | *at 50%; he stays targetable* | | |
| +0 | Flare-Up (6 s cast) | — | he heaves the stockpot onto the stove |
| +6 | the stove line erupts **for the rest of the fight** | the top third of the kitchen is gone; any grease touching it lights | burners roar, fire wall |
| +8 | Flambé (running stripes) | walk behind the fire; it lights the puddles you placed in Mains | amber sheen, blue flame |
| +16 | he drags the pot to the middle | the pot becomes a solid, unbreakable prop | |
| +18 / +24 | Simmer out, Simmer in | rings round the pot while he ladles from it | coils dull → red → white |
| **Second Sitting** | *the burning, smaller kitchen; about 6–10 s apart* | | |
| 4:58 | Whisk | the turning cross, alone, in less room | wire loops |
| 5:08 | Spice Rack → Ladle/Lid | | jars shake and pour |
| 5:22 | Larder Toss → Boil Over | casks land where the far players are, and Boil Over wants everyone far: **choose where the cover goes** | rolling heat round him |
| 5:36 | Tenderize | tankbuster #4 | |
| 5:44 | Gut Blast | behind a cask **or the pot** | |
| 5:54 | Order Up! + Meat Toss on the plates | soak your plate and drop your puddle there, in order | |
| 6:10 | Butcher's Charge | **choice under time:** brick wall (clean stun) or the pot (shorter run, he's scalded and stuck, but the pot boils over in one Simmer ring) | |
| 6:24 | Whisk + Rolling Meatballs | | |
| 6:38 | Grease Fire | raidwide #4 (the fire band still burns) | |
| 6:48 | Family Meal under Spice Rack | | |
| 7:02 | Chop Chop | | |
| 7:12 | Tenderize | tankbuster #5 | |
| ~7:25 | *closing if still above 18%* | | |
| **Dessert** | *at 18%* | | |
| +0 → +30 | **Dessert Trolley** | gauntlet, 2–4 s beats: Flambé · Meat Toss · Rolling Meatballs · Mince · Ladle/Lid · Spice Rack · Whisk · Family Meal · Lid Slam | everything you have seen, overlapping |
| +30 → +38 | silence | he wipes down the counter | |
| +38 | Last Orders | big raidwide (about 1.5 × Grease Fire) | |
| +44 on | Gorge every 15 s, +10% each | burn | he eats |
| 9:52 | Last Call | hard enrage | |

Cadence check: raidwides about every 60–100 s; tankbusters every 72–90 s, then at the Dessert gap. Simple dodges get 4–5 s of warning, busters and raidwides about 5 s, the order rail 7.5 s.

## Normal vs Hard

Hard keeps casts 15% faster and damage 25% higher. **Every telegraph shows on the floor on both difficulties.** The wash and dashed outline come back on Hard, and nothing is visible for less than 1.2 s.

| | Normal | Hard |
|---|---|---|
| Mince | one half | **Double Chop:** both halves; the second shows as a ghost from the cast, full once the first lands |
| Opening | — | **Clogged Drains** at 0:03: grease round the drains for good, which makes the Flare-Up far worse |
| Mains | as above | **Belly Flop** at 2:58 with its Ladle/Lid drawn on the floor; **Cleaver Toss** on the second order rail |
| Order rail | 4 plates for 4 | **6 plates for 4, in order; Stuffed lasts 7 s.** You can't take two plates in a row, so the party works out a rotation (1 & 5, 2 & 6, 3, 4) |
| Flare-Up / Dessert Flambé | running stripes | alternating stripes (the Hard version) |
| Second Sitting | Tenderize alone | **role split:** Tenderize on the tank and **Meat Hook** on the healer at the same beat |
| Stored mechanic | — | **Mise en Place** (about 6:00): he lays three tools out on the pass (a cleaver on one side, the ladle, the lid). 25 s later, **Service!** fires them in that order on 2 s beats |
| Two at once | — | Dessert Trolley pairs Double Chop with Flambé |
| Breathing room | as above | Second Sitting gaps 20% shorter; Dessert Trolley 25 s |
| Enrage | 10:00, 3.1M | 10:15, 3.3M (less slack) |
| Kept | | Tenderized, Stuffed, two to a cask, Meat Hook, Vulnerability |

## Engineering

- `fight.js`: a small `f.course({ name, until: hpFrac, steps, closing, next })` on top of `f.seq`. It lays the whole course out at once, which means the feed always sees three steps ahead, and the closing steps are part of the layout. Hitting the gate moves to `next` at the next set seam (8 s at most). `f.loop` goes away.
- **Closing sequence ("Behind on Orders"):** the course's last set again, every 30 s or so. Each pass adds a visible stacking boss buff (+10% damage) under the boss bar, like Staggered. The names in the feed stay the real cast names.
- Remove `hidden` on non-raidwides and Hard's outline differences. Audit every `outline: false` tell, so each one's own art covers the exact area.
- New pieces: a sequential tower (order rail), a permanent fire zone, the pot prop (charge stop + cover), the boss buff, and Mise en Place props on the pass. Bots learn the rail order, the Hard rotation, and the burning band.
- Determinism: see decision 4.
- `check.js` lint as in the prompt (no `f.loop`, every step named, nothing hidden, length 8–10 min, cadence, the feed across every seam). Bot clear rate and times over six seeds. Hard must run without breaking.

## Decisions

1. **Kill speed.** **A (recommended):** HP gates, content laid out by time, a closing sequence when a course runs out, and transitions at the next set seam. **B:** time-locked courses (the boss stops at each gate until the course's time is up). Every pull looks the same, but fast parties waste DPS and stand around. **C:** time push. Courses end on time even if HP is left over, with no closing pressure. It's gentle, and Last Call is the only check.
2. **The middle of the fight.** **Flare-Up (recommended):** no downtime, the room burns for good and the pot moves to the middle. **Stockpot dive:** today's Simmer (he's untargetable for about 17 s), then the fire. **No seam:** the kitchen just keeps filling, and the fire band arrives with the first stove charge instead.
3. **Finale.** **Dessert Trolley gauntlet → silence → Last Orders → Gorge (recommended).** **Closing Service:** a last eight-plate order rail under meatballs and Flambé, so the unique set piece is also the finale.
4. **Determinism.** **Hybrid (recommended):** the order of mechanics is always fixed. Sides with a strong tell (Mince's glint, the tool on his back, Mise en Place) stay variable, and plate positions, meatball lanes, spice circles, Flambé direction and Whisk spin become authored patterns. **All fixed:** every side identical on every pull. **As now:** sides and patterns random.

## As built (2026-10-20)

Picked: HP gates with a closing sequence, the Flare-Up, the Dessert Trolley, the hybrid determinism. Differences from the plan above, all found with the bots or the new timeline lint:

- **The Flare-Up has a raidwide** (the heat as the stove catches, 325). Without it, raidwides were 204 s apart. Its course opens 6 s after Mains ends, so it doesn't land on the last toss → meal.
- **The Second Sitting's Meat Toss lands just after the last plate**, not on the plates. A puddle under your own plate was a trap. Its Grease Fire also moved earlier, so Hard's extra sets don't stretch the raidwide gap past 150 s.
- **The Dessert Trolley is spaced so each beat lands as the next is called** (the first version stacked Flambé on top of the toss and killed every bot). Whisk replaces the second Lid Slam.
- **Grease stains burn off** once lit (at most 8 stand). Mains puddles still shape the Flare-Up, but the floor doesn't fill with fire for the rest of the fight.
- **Hard's Stuffed lasts 4 s,** so a rotation of 1 & 5, 2 & 6 works. Mise en Place resolves about 30 s later, not 25.
- **Boss HP scaling for 1–3 players** is unchanged for now (42/62/82/100%); I've left it for a pass with 1–3 bot parties.
- **Late joiners** don't get the permanent fire band redrawn (zones go out once). A reconnect mid-fight would see the fire do damage without seeing it. This is still open.
- Measured: the script runs 8:09 (Normal) and 8:38 (Hard). The check line-up cleared 9 of 12 seeds in 8:31–9:53. Every Grubnak line-up in `check.js` clears at least once; Hard runs to Last Call.
