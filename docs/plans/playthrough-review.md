# Playthrough review (headless, tank / healer / DPS, 4 bosses, Normal + Hard)

## How this was run, and its limits
- Harness: `RaidHost` with the real FightSim and the real bot AI. I took one slot (tank = Bastion, healer = Cleric, DPS = Ranger; the other three slots are the standard bots) and made it human-like:
  - Its movement plan reaches the floor 0.25-0.35 s late.
  - About 0.4-1.2% of movement decisions are a 1-2 s freeze (a "mistake").
  - Button presses are dropped at 3x that rate.
- Matrix: 4 bosses x 2 modes x 3 roles x 6 seeds = 144 full runs (2 seeds at a higher mistake rate, 2 at a lower one, 2 hard tank controls with mistakes off).
- Class sweep: 17 classes x 4 bosses on Normal = 68 further runs (every class takes the slot of its role).
- Telegraph and phase probes: `tele.js`, `ph.js`, `aggro.js`, all in the scratchpad. The report writes no repo files.
- Not covered: the Browser pane is unavailable, so I did not see art, VFX, camera or audio. Readability notes come from data (warning time, number of simultaneous shapes), not from looking at the screen. Anything marked "verify visually" needs a look in the client.
- The pilot is a bot with delays, not a person. It under-states human adaptivity, so Hard numbers are pessimistic. It also reads every telegraph perfectly, so Normal is optimistic.
- Result counts: no console errors, no exceptions, no stuck states in any of the 212 runs. Every run ended in a clear or a wipe by 615 s.

## Headline numbers
| | Normal | Hard |
|---|---|---|
| Clears (human-like pilot + 3 bots) | 45/48 (94%) | 12/48 (25%) |
| By boss | Volkar 12/12, Hollow King 12/12, Skitterra 11/12, Grubnak 10/12 | Hollow King 9/12, Skitterra 2/12, Volkar 1/12, Grubnak 0/12 |
| Clear time | 443-537 s, median about 490 s (8:10) | 500-575 s |
| Deaths per run | 0-2 | 173 deaths in 48 runs; 36 wipes |

- All-bot Hard control (`bot-raid.js hard 6`): Grubnak 2/6, Hollow King 4/6, Skitterra 1/6, Volkar 2/6. A single sloppy human is not the main cause of the Hard wipes.
- Pacing probe (`ph.js`, Normal):

  | Boss | Phase transitions (time, boss HP) |
  |---|---|
  | Grubnak | 92 s (80%), 240 s (50%), 284 s, 385 s (17%), dead about 450 s |
  | Skitterra | Dark Between at 166-201 s, Act III at 374 s |
  | Volkar | Eye at 220 s, Heavens Fall at 418 s |
  | Hollow King | Court of Bones at 185-220 s, Long Night at 385 s |

- Boss cast cadence is 5-7 named casts a minute. The longest cast-free gaps are 27 s on Skitterra, 17.5 s on the Hollow King, and 15-16 s on Grubnak and Volkar.
- Role activity (presses per minute on Normal):

  | Role | Presses/min |
  |---|---|
  | DPS | 33-37 |
  | Healer | 30-32 |
  | Tank | 25-27 |

  Healers add 40-50 dps on top of 50-100 hps. Tanks add about 60 dps. Melee spend 10-20% of the fight moving.
- Ultimates per 8 minutes, from `ultFire` over cleared runs (targets are 1-4):

  | Class | Ultimates / 8 min |
  |---|---|
  | Grovekeeper | 5.0 |
  | Threadweaver | 4.7 |
  | Alembist | 4.6 |
  | Ranger | 3.9 (peak 5.2) |
  | Oathbroker | 3.9 |
  | Chronomancer | 3.8 |
  | Shadowblade | 3.6 |
  | Cleric | 3.3 |
  | Pyromancer | 3.3 (peak 6.7) |
  | Bastion | 2.4 |
  | Bloodreaver | 2.4 |
  | Marionettist | 2.4 |
  | Other classes | 2.8-3.2 |

  The first Ultimate comes at about 95-140 s, then roughly every 130 s. The four party Ultimates cluster inside a 25-45 s window (about 2:00, 4:10, 6:20, 8:20).

## Per boss and role (what it felt like)
**Grubnak**
- Tank: a steady buster rhythm (Tenderize about every 77 s, with Perfect Blocks). Calm until about 250 s, then the burning-kitchen courses (Flambé, Simmer, Whisk, Spice, Boil Over) overlap. Tank deaths in my runs came from Stovefire and Whisk, not from busters.
- Healer: little to do before 170 s (Grease Fire only), then a burst of raidwide, stack and spread overlap. Deaths of the healer in Hard happen at about 238 s, when a Rail tower and meatballs overlap.
- DPS: 33 presses/min with no downtime. Ranged is never interrupted.
- Fun and readable: the one-service-per-course structure and the room props (casks, the charge into brick) give "where do I stand" decisions every 10-12 s.
- Unfair or fragile: permanent grease stains from puddles (any mistake persists), then Flambé lights them. Late Normal deaths pile up at 373-433 s (`burn:180` x3, `flambe:700` plus spread). 4 of 17 class runs wiped on Normal here, against 0-2 on each other boss.

**Skitterra**
- A long, dread-paced fight: Act I casts every 14-15 s. The Dark Between is 35 s untargetable, with eggs and knots to break. The Chrysalis is a 25 s damage check. Max cast-free gap 27 s; boss untargetable 7% of the fight.
- Tank: Silk Wrap and buster are clean. In Hard the six-step Eightfold Lunge killed the tank at 142 s in the seed I traced (`lunge:773` then `lunge:1031` in 1.2 s, "Lunge" is 6-step plus Molt).
- Healer: Hard phase 1 killed the party at 135-161 s on 2 of 6 healer runs (Fang Rush 938, Venom, Silk Thread). Healer hps on Skitterra is the lowest (45-55).
- DPS: egg and cocoon prioritisation reads well (bots pick `cocoon` then `prio` adds).
- Hard Snare Weave: 70 simultaneous snare circles in two layers (see issue 7).

**Volkar**
- The best-paced Normal: 12/12 clears, 462-514 s. The Eye (about 40 s, no Pulse, boss still targetable) is a deliberate breather.
- Healer: the Pulse hits everyone every 4 s (about 120 hits per fight), giving the healer a constant job (80-100 hps). It also adds a floor of damage that makes any Hard death a spiral.
- Hard: first death clusters at 183-192 s (Polarity Surge plus Family-style stack at 192 s), and the Supercell shows 29 rectangles at once.

**Hollow King**
- Most forgiving Hard (9/12). Pace is good: call-and-response, 17.5 s maximum gap, Court of Bones 35 s with six coffins to break.
- Hard wall at 248 s: Sceptre Sweep echo (`esweep` 813-894) right after a Knell raidwide and a spread. Every failed Hard Hollow King run I recorded had its first death at 248-287 s (3 of 3 human-like runs, and 2 of 2 failed all-bot runs). Judgement shows each swing for 1.2 s (7 shapes at 1.2 s: stomp, estomp x2, esweep x2, sweep, ring, audience).
- Boss pause (Chronomancer, 2-3 uses of 2-3 s per fight) is small and fair.

## Shiva-Savage comparison
**Strengths**
- One authored, non-looping timeline per boss, in HP-gated acts. A slow party gets a soft enrage (+10% each pass), as in Shiva-style fights.
- "Each telegraph shows from the cast" is respected: the minimum warning on Normal is 1.2 s or more except the Hard Judgement.
- Each boss asks a different question (where to stand, what to break, who to pair with, what did I just see).
- Ultimates give the burst-window rhythm of a 2-minute raid-buff cycle.

**Flaws**
- Savage's punishment ladder is gentler: one death does not end the pull, because a raise is available and damage is spread over 8 people. With 4 players, every death cuts the healing and damage budget by a quarter, so Hard is a binary clear or wipe at the first mistake.
- Savage fights have several quiet "breather" stretches and a clear damage-up burst for the encounter's last 20%. Here only Volkar's Eye and the Hollow King's Court of Bones are real rests.
- In Shiva-style design the hardest phase comes last (a learned pattern repeated). Here the hardest checks (Hard) arrive at 170-250 s, in Act I-II, so the group meets the wall before it has used any Ultimate twice.

## Top 10 issues
Size: S = under half a day, M = about a day, L = several days.

1. **Hard is a death spiral: the first death is nearly a wipe.** (M)
   - Where: all four bosses on Hard; `fight.js` death and raise handling, Cleric/healer raise, `FIGHT.LB`.
   - Evidence: 36 of 48 Hard runs wiped. Median time from first death to wipe is 50 s for tank/healer deaths (12 s on a Grubnak tower fail, 6 s in one run); only 25 raises against 173 deaths. All 7 Grubnak-hard healer and tank wipes except one ended within 12-51 s of the first death.
   - Fix: make recovery realistic for four players. Options: 3 s raise cast with 40% HP and a short invulnerability; a boss-damage cut of about 15% for 20 s after a death; or give the Limit Break raise (see 9) to any role. Re-tune so one death is survivable at Hard.

2. **Fixed "walls" on Hard where two lethal checks land within 2-3 s.** (M)
   - Evidence, first deaths at the same second across seeds:
     - Grubnak 169-180 s: spread 406 + grease 163 + stack 281-313, killing the first player in 6 of 12 Hard runs ("toss and meal at once").
     - Grubnak 238-252 s: tower + meatball 813-894.
     - Hollow King 248-253 s: raidwide 501-619 + spread, then Sceptre Sweep echo 813-894.
     - Skitterra 81-139 s: Fang Rush 938, Venom 656, buster 1625.
     - Volkar 183-192 s: Polarity Surge + stack 548-813.
   - Fix: stagger the second check by at least 3 s, or let the preceding raidwide land on a different beat; use these timestamps as the retest points. The Grubnak 170 s toss-plus-meal is the first one to fix.

3. **A missed tower hurts everyone, not the missing soaker.** (S)
   - Where: Grubnak Hard "tower-fail" (14000 base), Skitterra and Volkar towers.
   - Evidence: `tower-fail:963` on 2-3 players at the same second, wipes 6-12 s after the first death (`grubnak_hard_healer_2`: first death 249, wipe 255; `grubnak_hard_tank_1`: 240 to 252). Normal also has `tower-fail:750` on two players.
   - Fix: split the fail damage into a hit on the missing soaker plus a survivable (about 40%) raid hit, or give towers a short "last chance" extension when the soaker is within 1 m.

4. **Ultimate counts exceed the 1-4 target on several classes.** (S)
   - Evidence: Grovekeeper 5.0, Threadweaver 4.7, Alembist 4.6, Ranger 3.9 with 5.2 peaks, Pyromancer 3.3 average with 6-7 in some runs (`pyromancer_volkar` 7 in 504 s). Bastion, Bloodreaver and Marionettist sit at 2.4.
   - Fix: lower the charge rate of the healers listed, Ranger and Pyromancer by about 15-25%, so every class sits at 2.5-3.5 per 8 minutes. Add a cap or longer fill for kits whose gauge fills on movement.

5. **Normal is a little short, front-loaded and mostly easy for a competent group.** (S)
   - Evidence: 45/48 Normal clears at 443-537 s (median about 490 s, below the 8-10 minute target); Grubnak Appetiser is only 0-92 s, and the first 170 s has no kill-the-healer pressure. Four-bot Normal wipes were rare (2 of 17 class runs per boss on average).
   - Fix: raise boss HP about 8-10% (Normal) or add one more set to each act's `closing`. Keep Hard's HP as is (Hard runs already reach 530-575 s on a clear).

6. **Dead stretches for some roles.** (S/M)
   - Evidence: Skitterra's 35 s untargetable Dark Between (166-201 s) and the Hollow King's 35 s Court of Bones (185-220 s) have a 27 s and 17.5 s cast-free gap. Bots' melee and ranged DPS switch to eggs and coffins, but the tank has nothing to do except hold position, and the healer has little to heal. Overall 7% of the fight is untargetable.
   - Fix: add a light recurring cast (a raidwide pulse or a small stack) during these windows so the healer and tank stay engaged; or give the tank a small add to hold.

7. **Hard Snare Weave and Supercell are likely hard to read.** (S/M, verify visually)
   - Where: `skitterra.js` `snareWeave` and `snareLayer`; `volkar.js` Supercell.
   - Evidence: 70 simultaneous snare shapes (two layers); the pockets are "not painted: read from the snares" and the second layer is "faint until the first lands". The warning for the second layer is 3.4 s. Supercell shows 29 `squallcell` rectangles plus 4 `stilllane` safes at once.
   - Fix: outline the safe pockets (the `snaregap` safe mech exists but is invisible) and show the second layer's safe pockets in a distinct colour from 2 s out. This follows the "telegraphs never hidden" rule.

8. **Hollow King Hard Judgement is tight.** (S)
   - Evidence: seven shapes (stomp, two estomps, sweep, two esweeps, ring, audience) with a minimum warning of 1.20 s. With a 0.25 s reaction and 230 px/s speed there is about 0.95 s (about 220 px) to act.
   - Fix: raise to 1.5 s, or lay out the shapes so no more than two overlap in the last second. Verify visually.

9. **The Limit Break is rarely used and is unavailable when needed.** (S)
   - Evidence: Normal clears end with 80-216 of 300 gauge unspent; Skitterra Hard wipes end at 300 on 4 of 10 runs; Hollow King Normal ends at about 200. The bot rule for the healer's raise needs a living healer with 3 bars, but the healer is usually the one who has died.
   - Fix: let any living role press the raise or shield LB when the healer is dead, and let the gauge fill slower or show a clearer "LB ready" prompt. Retest alongside issue 1.

10. **Grubnak's permanent grease stains snowball into the late Normal deaths.** (S/M)
    - Evidence: every missed Meat Toss puddle leaves grease for good; Flambé then lights them. Late deaths cluster at 373-433 s (`burn:180` x3 at 381-383, `flambe:700` at 407 plus spread 413 and grease 195). Grubnak is the only boss where Normal wipes occur at roughly 400 s regularly (4 of 17 class runs).
    - Fix: let stains fade after about 45 s on Normal (keep them permanent on Hard), or cap them at 6, so one early mistake does not decide the end of the fight.

### Smaller oddities (not in the top 10)
- Damage messages with an amount of 0 (`auto:0`, `pulse:0`, `tower:0`) are emitted as `pdmg` events. Probably shield-absorbed hits; verify the client does not draw a "0" number.
- Volkar's Pulse is about 120-200 hits per fight, each a separate damage message. Harmless to the sim; possible log and sound noise.
- `press(7)` returns true several times in the same second in my instrumentation, while `ultFire` fires once. Likely queueing, not a bug, but worth a check that holding T cannot double-spend.
- Bot-side only (other agents are editing bots): the bot healer's raise count is low (25 raises against 173 Hard deaths), and bot tanks do not reposition for a six-step Lunge in time (142 s Skitterra Hard).

## Top 5 strengths
1. Stability: no console error, exception or stuck state in 212 runs; all 17 classes complete all four bosses; every fight resolves by its 10-minute enrage.
2. The authored timeline plus the upcoming-moves feed gives a learnable, non-looping fight with a steady 5-7 named casts a minute and no unreadable gaps longer than 17.5 s apart from Skitterra's Dark Between.
3. The Ultimate rhythm mostly lands in the target: 2.4-3.5 per fight for most classes, a first burst at about 2:00 and a 130 s cycle that lines up the party's windows.
4. Every role stays busy: 25-37 presses per minute, healers deal 40-50 dps beside 50-100 hps, and melee spend only 10-20% of the fight off the boss. The Chronomancer's boss pause (2-3 uses of 2-3 s) adds identity without breaking pacing.
5. Distinct boss identities and a working difficulty ladder: Normal clears 94% and Hard clears 25%, with the Hollow King the most forgiving Hard and Grubnak the hardest. HP-gated acts with a soft enrage are the Shiva-style feature that works best.
