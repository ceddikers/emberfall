# Class balance report, October 2026

A measuring pass only: no game code was changed. Tier list for every DPS class and spec, then tank and healer outliers, then suggested nudges (direction only).

## How this was measured

- **Dummy DPS**: `node tools/simulate.js <class:spec>`, 8 runs each, 300 s on the dummy with a forced 3.5 s of movement every 30 s and a shared 60 s party burst. "Pro" is the expert priority play, "sloppy" is the newbie script. All numbers are in the tool's original big-number units, so only ratios matter.
- **Raid DPS**: `tools/bot-raid.js` on Normal, all eight bosses (the four of set 1 at `GEAR=mid`, the four of set 2 at `GEAR=post1`, the CLAUDE.md tuning targets). The party was Bastion Sentinel, Cleric Aegis, plus the spec under test and one reference DPS (Ranger Venomstrike, or Thermist Pendulum when the tested spec is a Ranger). Each spec ran in both gear slots (slot 2 and slot 3) to cancel the slot gear difference: 2 runs per slot per boss, 32 runs per spec, 512 DPS raid runs in all. Per-player damage is read from the bot-raid per-player line, and boss uptime from its `SCORE=1` tracking.
- **Raid index**: each spec's raid DPS divided by the mean of all 16 DPS specs on the same boss, averaged over the eight bosses. 1.00 is the field average.
- **Tanks and healers**: each spec in its role slot, with the rest of the party fixed (healers: Bastion Sentinel, Ranger Sharpshooter, Pyromancer Cataclysm; tanks: Cleric Aegis, Ranger Sharpshooter, Pyromancer Cataclysm), 3 runs per boss on all eight bosses (24 runs per spec), all on Normal.
- **Noise**: with 32 runs per DPS spec the index is good to roughly +/-0.02, so gaps under about 0.03 are not real. Tank and healer death counts (24 runs each) are noisier still: treat differences under about 0.3 deaths per run as noise.
- **Not covered**: Hard was not run (time budget). The bots pilot every class, so a spec the bot AI plays badly will read low here; those cases are flagged where the pattern looks like a piloting problem rather than a kit problem.
- The data lists 23 classes (CLAUDE.md says 19). Eight are DPS: Ranger, Shadowblade, Pyromancer, Thermist, Driftblade, Marionettist, Thresher, Houndmaster.

## DPS tier list

Tiers are set on the raid index, with the dummy numbers used to explain disagreements. S is 1.12 or more, A is 1.05 to 1.12, B is 0.95 to 1.05, C is 0.90 to 0.95, D is under 0.90.

| Class / spec | Dummy DPS (pro / sloppy) | Raid DPS (index) | Tier | Why |
|---|---|---|---|---|
| Pyromancer: Sigilmancer | 2394 / 1815 (76%) | 170 (1.14) | **S** | Top on five of eight bosses, never below 1.09, and 96% boss uptime; only average on the dummy, so the lead comes from how little the raid costs it |
| Thermist: Zenith | 2386 / 1637 (69%) | 161 (1.09) | **A** | Dummy-average kit that holds up in raids: never below 1.05 on any boss |
| Houndmaster: Packleader | 2371 / 1639 (69%) | 160 (1.08) | **A** | Few deaths (0.03/run) and strong on Skitterra, Volkar and the Hydra (1.12 to 1.15); weakest on Grubnak, Vhalgrath and Hrimgar |
| Thermist: Pendulum | 2375 / 1706 (72%) | 160 (1.08) | **A** | Same as Zenith: flat 1.06 to 1.14 profile, no weak boss |
| Driftblade: Comet | 2509 / 1653 (66%) | 158 (1.07) | **A** | Best dummy DPS of any spec but raid index is 0.97 on Grubnak and 1.21 on The Hollow King: swingy, with the most avoidable hits taken (6.6/run) |
| Ranger: Venomstrike | 2260 / 1653 (73%) | 153 (1.04) | **B** | Lower dummy than its sibling but the steadier raid spec (98% uptime, 0.03 deaths/run) |
| Pyromancer: Cataclysm | 2395 / 1795 (75%) | 153 (1.03) | **B** | Same dummy as Sigilmancer, 0.11 lower in raids, weakest on Volkar and Skitterra (0.94, 0.98) |
| Houndmaster: Lonewolf | 2374 / 1596 (67%) | 150 (1.02) | **B** | Equal to Packleader on the dummy but dies 0.34 times a run (84% clear) and drops to 0.91 on Azerath |
| Driftblade: Orbit | 2433 / 1521 (63%) | 146 (0.99) | **B** | Second-best dummy but average raid, and the worst sloppy ratio of any spec (63%); 0.19 deaths/run |
| Ranger: Sharpshooter | 2318 / 1770 (76%) | 145 (0.98) | **B** | Beats Venomstrike on the dummy (+3%) and loses to it in raids (-0.06): 93% uptime vs 98% |
| Shadowblade: Bladedancer | 2389 / 1732 (72%) | 144 (0.97) | **B** | Dummy-average, slightly below in raids, worst on Grubnak (0.92) and Hrimgar (0.92) |
| Marionettist: Understudy | 2245 / 1592 (71%) | 140 (0.95) | **B** | Lowest dummy of any spec and low raid, but nearly never dies (0.03/run) and clears reliably; bottom of B |
| Shadowblade: Nightstalker | 2393 / 1605 (67%) | 137 (0.92) | **C** | Dummy-average, but the highest death rate of any DPS (0.41/run, 84% clear) and 0.78 on Grubnak |
| Marionettist: Cuttingline | 2393 / 1919 (80%) | 131 (0.89) | **D** | Best sloppy play on the dummy (80%) and the weakest raid scaling of the pair: ceiling is low and it dies 0.31 times a run |
| Thresher: Grim | 2377 / 1707 (72%) | 131 (0.88) | **D** | Average dummy, 0.87 to 0.92 on most bosses and 0.79 on Hrimgar |
| Thresher: Sower | 2376 / 1705 (72%) | 128 (0.87) | **D** | Lowest raid index; 'bind weight' and 'drain weight' waste on the dummy hints at a clunky resource loop |

Raid DPS is the mean over all eight bosses. Set 1 and set 2 splits are in the notes below.

### Where dummy and raid disagree

- **The dummy is tight, the raid is not.** Dummy pro DPS spans 2245 to 2509 (about 11%, and 2318 to 2433 for 13 of 16). The raid index spans 0.87 to 1.14 (about 30%). Likely the dummy's fixed movement is gentler than what the bosses ask for, and the raid adds costs (deaths, uptime, boss-specific demands) the dummy lacks. Whatever the cause, the dummy alone is a poor balance gauge.
- **Strong on the dummy, weak in raids**: Thresher (both, average dummy and bottom of the raid), Shadowblade Nightstalker (0.92) and Marionettist Cuttingline (0.89; best newbie spec at 80%, so it feels good and tops out low). Nightstalker and Cuttingline also die the most among DPS, so part of the gap is lost damage from deaths.
- **Weak on the dummy, strong in raids**: Pyromancer Sigilmancer (average dummy, S in raids), Thermist (both, 1.08 to 1.09), Houndmaster Packleader (1.08).
- **Best dummy DPS in the game, merely good in raids**: Driftblade. Comet is 2509 on the dummy (highest of all), Orbit 2433 (second), but they sit at 1.07 and 0.99 in raids, with the largest boss-to-boss swing. Their sloppy ratio is also the worst (63%, 66%).
- **Same class, different story**: Pyromancer (+0.11 Sigilmancer over Cataclysm in raids, equal on the dummy), Ranger (Sharpshooter +3% on the dummy, Venomstrike +0.06 in raids), Houndmaster (specs equal on the dummy, Packleader +0.06 and far safer in raids). Thermist is the one class where both specs agree everywhere.
- **Boss swings worth knowing** (index per boss, spec vs the field): Driftblade Comet 1.21 on The Hollow King; Pyromancer Sigilmancer 1.21 on Hrimgar; Houndmaster Packleader 1.12 to 1.15 on Skitterra, Volkar and the Hydra but about 1.02 on Grubnak; Shadowblade Nightstalker 0.78 on Grubnak; Houndmaster Lonewolf 0.91 on Azerath. Set 2 bosses give every spec a higher absolute DPS (stronger gear) and mostly keep the same order.
- **Sloppy-play gap**: only Marionettist Cuttingline (80%) is well above the 70% target, and only Driftblade Orbit (63%) well below. Everything else is 66 to 76%.

## Tank and healer outliers

Tank pro dummy DPS is tight (1488 Bastion Sentinel to 1610 Runeguard Runeblade, about 8%) and every tank clears 88 to 100% of raid runs, so tanks are broadly in line. The healers are not.

### Healers: two clear outliers

All healer specs show about the same healing per second in raids (70 to 84) and the same dummy "effective" HPS (about 1050 to 1075, because the sim is demand-capped), yet clear rate differs widely:

| Spec | Clear | Deaths per run (all players) | Healing/s | Overheal | Note |
|---|---|---|---|---|---|
| Lanternkeeper: Beacon | 50% | 2.2 | 72 | 55% | Worst. Set 2 bosses especially (about 4 deaths per run on Hrimgar, the Hydra and Azerath) |
| Threadweaver: Loomwright | 58% | 1.7 | 80 | 44% | Second worst. About 4 deaths per run on Vhalgrath and Azerath |
| Lanternkeeper: Wayfarer | 71% | 1.3 | 79 | 71% | Highest overheal of any healer; raw dummy HPS for a sloppy player is only 41% of a pro's (1294 vs 3169) |
| Tidecaller: Springtide | 71% | 1.3 | 69 | 44% | Worst on Vhalgrath and the Hydra (3 to 4 deaths per run) |
| Threadweaver: Shears | 75% | 1.1 | 84 | 53% | Mildly low |
| Peers (Cleric both, Grovekeeper both, Chronomancer both, Alembist both) | 92 to 100% | 0.1 to 1.0 | 73 to 82 | 26 to 69% | |

Setting aside the (large) bot-AI caveat, the Lanternkeeper and Threadweaver kits are the ones to look at: their raid output is not low, so the problem is probably the shape of the healing (burst coverage or responsiveness) rather than the total. Grovekeeper Lifebinder (100% clear, 0.08 deaths) and Cleric Aegis (96%, 0.21) are the benchmark. Lifebinder also has 69% overheal, so it is probably healing more than needed and has room.

The healers' own damage (58 to 76/s) is not an outlier: lowest are Beacon (58), Loomwright (60) and Undertow (60).

### Tanks: smaller outliers

| Spec | Pattern |
|---|---|
| Kenseier: Deathblade and Warden | Take about half the damage of any other tank (14 to 15/s vs 24 to 31/s; mitigated about 35 to 37/s) while having the highest tank damage output (105 to 106/s vs 77 to 93 for the others, Duskreaver 101) and a 59 to 65% overheal, i.e. they barely need healing. The Kenseier and Gloomsworn Duskreaver (101/s) together give the "tank who also hits like a DPS" end of the range. |
| Oathbroker (both) | Mitigate 39 to 40/s (next best is 26) and take only about 20/s. Strong survivability but ordinary damage and no other cost. |
| Bloodreaver: Berserker and Hemomancer | Take 45 to 47/s (about 1.6x the other tanks) with almost no mitigation, living on self-heal (Hemomancer 48 heal/s, 46% overheal). Berserker has the most deaths of any tank spec (0.84/run, 92% clear), mostly on the set 2 bosses (1.3 to 2.0 per run on Vhalgrath, Hrimgar, the Hydra and Azerath). Hemomancer is fine at 0.33. |
| Ironpalm: Avalanche | 0.83 deaths/run and 3.3 on the Hydra; Stillwater is clean (100% clear). Possibly a threat or taunt interaction rather than raw survivability. |
| Bastion Sentinel | Lowest tank damage on the dummy (1488) and 82/s in raids (Crusader 77/s is the lowest of any tank); other stats ordinary. |

Tank-run deaths cluster on Vhalgrath (2.0 or more per run for Sentinel, Berserker, Crusader, Glutton and Stillwater), which looks like the boss rather than the tank.

## Suggested nudges (direction only)

DPS
- **Pyromancer Sigilmancer**: pull down, or accept as the top spec and lift the rest.
- **Pyromancer Cataclysm, Ranger Sharpshooter, Shadowblade Bladedancer**: no change needed; Cataclysm could take a little of Sigilmancer's raid advantage.
- **Thresher (both)**: lift. Largest and most consistent shortfall (0.87 to 0.88 index, 0.79 on Hrimgar). The dummy shows resource waste that a sloppy and an expert player both hit, so it is worth a look at the kit before touching damage numbers.
- **Marionettist Cuttingline**: lift the ceiling, not the floor (it already has the best newbie ratio at 80%); Understudy could gain a little.
- **Shadowblade Nightstalker and Houndmaster Lonewolf**: look at their death rate (0.41 and 0.34/run) before touching damage; they are risk-heavy rather than weak.
- **Driftblade**: small cut to the dummy ceiling or a gain for sloppy play; it is the worst-ratio class (63% to 66% newbie/pro) and its raid index lags its dummy by a wide margin.
- **Ranger**: move a little of Sharpshooter's dummy edge to Venomstrike's raid reliability, or the reverse. They currently reward different things.

Tanks and healers
- **Lanternkeeper Beacon, Threadweaver Loomwright**: lift survivability coverage. Their healing totals are on par; clear rate is not. Check the bot's use of them before changing the kits.
- **Lanternkeeper Wayfarer**: look at overheal (71%) and the very wide pro/sloppy gap.
- **Kenseier**: either trim damage or trim mitigation. It has the best damage and the lowest damage taken.
- **Bloodreaver**: consider more mitigation for Berserker so it is less self-heal dependent.
- **Oathbroker**: leave (survivability only), or trim mitigation slightly if Kenseier is trimmed.
- **Ironpalm Avalanche**: re-run with more samples before touching it; the gap may be noise.
