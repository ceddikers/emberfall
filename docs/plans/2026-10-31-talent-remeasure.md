# Talent re-measure in raid (2026-10-31)

Measured, not changed. No game file was edited, nothing committed. Worktree at origin/main (c0df6f0, which includes 7ced305: bots hold talents by set).

Rule used throughout: weak things get buffed, strong things are never nerfed. "Hot" readings below are only there so you can tell a real outlier from a dummy artifact; the action list at the end is buffs only.

## What was run

Human-like DPS (`HUMAN=dps`, bots.js BotHuman) in both sweeps; tank and healer are perfect bots; every bot holds `bot-builds.js` talents for the boss's set and mode (Normal 2/4/6 rows, Hard 3/5/7). 8 worker processes (half the cores).

1. **DPS index sweep.** 6 settings (set 1 Normal `fresh`, Hard `mid`; set 2 Normal `post1`, Hard `post2`; set 3 Normal `post3`, Hard `post4`) x all 4 bosses of the set x 32 random parties x 2 pulls = **1,536 full-length pulls** (768 jobs, 16 min). Parties are drawn like comp-sweep.js (bags of every tank, healer and DPS spec; DPS pairs alternate melee/melee, ranged/ranged, melee/ranged; no class twice). Each spec was observed about 96 times (4 parties x 4 bosses x 6 settings), about 190 pulls per spec. Standard errors below are over those observations.
2. **Talent arms.** 32 specs: all 16 DPS, all 14 healers, both Iron Palm tanks. For each spec the bot build is the baseline and every other pick of a row is swapped in alone (rows I-VI on set 3 Normal at `post3`, bosses IX and X, 2 parties; row VII on set 3 Hard at `post4`). Pulls are cut at 240 s so it fits (1,792 jobs, about 4,900 pulls, 17 min). Paired by seed and party against the baseline. 16 pulls per arm for the six classes holding the named talents (Ranger, Chronomancer, Alembist, Driftblade, Tidecaller, Iron Palm), 8 for the rest. A second seed set (32 pulls per arm) was run for the rows holding the five named talents.
   - Metric: damage per second alive (includes movement and out-of-reach time). For healers also effective healing per second alive. The ± is the standard error of the paired difference; treat a gap under about 2x its ± as noise.
   - Not measured: the other tank specs in the talent arms (they are in the index), Hard rows I-VI (only row VII was varied on Hard), clear rate per arm (the 240 s cut), and rankings on sets 1 and 2 (every row I-VI was varied on set 3 Normal only).

Reproduce. My harness is not in the repo (scratch only), it is in the session scratchpad `C:\Users\Cedef\AppData\Local\Temp\claude\C--Users-Cedef--claude-spares-spare-DNeWfK\f9624a99-d3a8-4a7f-9074-58eedd57f4f6\scratchpad\`: `harness.js` (a copy of comp-sweep's worker with spec-level stats, a `maxT` cut and a `talents` override), `gen-index.js`, `gen-talent.js`, `an-index.js`, `an-talent2.js`.

```
node gen-index.js 60 2 index-jobs.json            (the run used the comps < 32 slice)
node harness.js index-a.json index.jsonl jobs=8
node an-index.js
node gen-talent.js talent-jobs.json 0 ; node harness.js talent-jobs.json talent.jsonl jobs=8
node gen-talent.js talent-jobs-x1.json 1          (second seed set, filtered to the named rows)
node an-talent2.js talent.jsonl talent-x1.jsonl
```

Closest repo-tool equivalents: `SUMMARY=1 node tools/comp-sweep.js hard grubnak gear=mid comps=32 runs=2 human=dps breakdown=1 jobs=8` (per-class dps per party, not per spec), and `BOT_TALENTS=<builds.json> node tools/comp-sweep.js ... only=ranger:venomstrike human=dps` for a swapped build (the json maps `"class:spec"` to the full list of talent ids to hold).

Context, party-pool clear rates with human DPS and random parties (not the tuning line-up): set 1 Normal 77% / Hard 37%, set 2 Normal 84% / Hard 36%, set 3 Normal 75% / Hard 33%.

## 1. DPS index in raid (100 = mean DPS spec)

Damage per second alive, each boss and setting normalised to the mean DPS, then averaged. The raw index (damage / pull time) agrees within 2 points for every spec.

| Spec | Index | ± | S1 N / H | S2 N / H | S3 N / H | Out of reach |
|---|---|---|---|---|---|---|
| ranger:venomstrike | 121.8 | 0.9 | 117 / 119 | 133 / 122 | 120 / 123 | 1% |
| houndmaster:packleader | 110.7 | 1.1 | 120 / 107 | 111 / 115 | 109 / 104 | 21% |
| ranger:sharpshooter | 109.5 | 1.1 | 106 / 100 | 104 / 108 | 114 / 126 | 1% |
| marionettist:cuttingline | 108.6 | 1.1 | 127 / 118 | 104 / 103 | 100 / 100 | 0% |
| thresher:phantom | 102.7 | 1.2 | 95 / 104 | 100 / 99 | 109 / 113 | 15% |
| pyromancer:sigilmancer | 101.8 | 0.7 | 101 / 102 | 106 / 106 | 102 / 96 | 1% |
| driftblade:comet | 101.8 | 1.6 | 101 / 95 | 89 / 105 | 108 / 113 | 15% |
| thermist:pendulum | 100.0 | 0.7 | 95 / 104 | 100 / 106 | 94 / 100 | 1% |
| shadowblade:bladedancer | 95.4 | 1.5 | 83 / 100 | 102 / 98 | 99 / 91 | 24% |
| shadowblade:nightstalker | 94.2 | 2.0 | 83 / 97 | 104 / 99 | 82 / 100 | 24% |
| driftblade:orbit | 94.0 | 0.8 | 97 / 95 | 91 / 96 | 94 / 91 | 14% |
| marionettist:understudy | 93.8 | 0.8 | 102 / 102 | 94 / 93 | 91 / 85 | 0% |
| thresher:dancer | 93.0 | 1.6 | 99 / 83 | 98 / 83 | 101 / 94 | 17% |
| thermist:zenith | 92.3 | 0.6 | 94 / 89 | 88 / 92 | 95 / 96 | 1% |
| houndmaster:lonewolf | 91.8 | 1.7 | 87 / 97 | 96 / 85 | 93 / 93 | 24% |
| pyromancer:cataclysm | 90.1 | 0.5 | 94 / 89 | 87 / 89 | 90 / 91 | 1% |

(Each setting is shown Normal / Hard. A single setting cell is about 16 observations, so it is good to roughly +-5.)

Clearly below 100, in order: **Cataclysm 90** (lowest, and steady in all six settings), **Lone Wolf 92**, **Zenith 92**, **Dancer 93** (about 99 on Normal but 83 on Hard in sets 1 and 2), **Understudy 94** (fine in set 1, about 88 in set 3), **Orbit 94**, **Nightstalker 94** and **Bladedancer 95** (both noisy, 82 to 104 between cells). At the top, Venomstrike is 22 points above the mean and 11 above the next DPS spec.

Two things move these numbers that are not talent values:
- Melee DPS spend 14 to 24% of their alive time out of reach of the boss (Shadowblade, Lone Wolf, Pack Leader 21-24%), ranged about 1%. Driftblade is moving 68% of its alive time.
- The bots do not always hold the raid-best pick (section 3). Orbit would gain about 12% from Jet, Venomstrike about 15% from Ricochet.

Tanks (index against other tanks, own damage only, SE about 1): Sentinel 89, both Iron Palm specs 91, Berserker 95, Guarantor 96, Collector 97, Duskward 98, Crusader 99, Gizzard 100, Glutton 101, Deathblade 104, Runeblade 105, Hemomancer 107, Duskreaver 107, Warden 108, Spellwarden 112. Tank damage is a minor part of the role; the party-result column in section 4 is the better read, and for tanks it shows nothing outside the noise except Collector (+6.7 +-2.4, worse) and Guarantor (-5.1 +-2.0, better).

## 2. The five named talents, in raid

Numbers are the change in the spec's own damage (or healing where stated) of each row-mate against the build the bots hold, swapped in one at a time, 32 pulls per arm for these rows (Ranger Ricochet 16). A negative number means the pick leads its row-mate by that much.

| Talent | Held by bots? | Raid result | Verdict |
|---|---|---|---|
| **Explosive Shot** (Ranger, row III) | Yes, both specs | Sharpshooter: Focus Fire -3.5 +-1.4, Tracking -2.6 +-1.2. Venomstrike: Focus Fire -2.9 +-0.9, Tracking -2.3 +-0.9. | Leads its row by about 3%. **Dummy artifact**: best pick, not hot. |
| **Future Sight** (Chronomancer, row V) | Yes, both specs | Row-mates are 15 to 21% behind on the Chronomancer's damage (Accelerant: Time Warp -15.2 +-1.0, Second Chance -20.2 +-1.0; Echoist: -18.6 +-1.5 and -19.9 +-1.1). Healing is the same within noise (-0.2 to +3.3). | **Real.** It carries most of Chronomancer's damage index of 123-136. The row-mates only match it on healing, so for a player who wants damage the row is not a choice. |
| **Ricochet, Ranger** (row I) | Sharpshooter yes, Venomstrike holds Rhythm | Sharpshooter: Rhythm -17.2 +-1.6, Steady -15.9 +-1.9. Venomstrike: Ricochet is **+15.4 +-1.8 over the Rhythm the bots hold**, Steady +2.2 +-1.6. | **Real, hot in raid.** One pick is worth about 16% of the Ranger's damage. Venomstrike's bot build is not its strongest pick. |
| **Ricochet, Alembist** (row I) | Yes, both specs | Apothecary: Scorch +3.7 +-1.9, Kindle +8.8 +-1.8 (damage), healing +1.3 and -2.3. Volatile: Scorch -5.2 +-1.4, Kindle +5.2 +-2.1. | **Not hot.** Level with its row-mates. |
| **Ricochet, Driftblade Comet** (row VI, for completeness) | Yes | Afterburn is -6.6 +-1.5 behind it. | Leads a two-pick row by 7%. Not an outlier. |
| **Spindrift** (Tidecaller, row I) | **No**: bots hold Low Water (Springtide) and Foam (Undertow) | Springtide: Spindrift is **+46.8 +-3.1% damage** at healing +0.9 +-2.3. Undertow: **+38.2 +-2.5% damage**, healing -5.9 +-2.2. | **Hot: the largest single effect anywhere in this measurement**, at about no healing cost. The bots skip it because the build maker scored healers on healing only. A Tidecaller who takes it is no longer weak (damage index 77 to roughly 105); Low Water and Foam are the weak picks. |
| **Hundred Hands** (Iron Palm, row V) | Yes | Avalanche: Dragon +0.7 +-0.7, Mountain +1.8 +-0.6. Stillwater: Dragon +5.1 +-0.6 damage and +17 +-3 healing, Mountain -0.8 +-0.5. | **Not hot.** Level with or behind its row-mates. Dummy artifact. |

Of the five: two run hot in raid (Future Sight, Ranger Ricochet), one is hot but not held by the bots (Spindrift), two do not (Explosive Shot, Hundred Hands). Alembist's Ricochet is ordinary.

## 3. Rows with a dead or clearly weak pick

Gap = the row-mate's damage (healing for the healing rows named) against the held pick, paired. I listed gaps of about 10% or more, all more than 2 sigma. These are picks a player has little reason to take.

| Spec | Row | Weak pick(s) vs the held pick | Gap |
|---|---|---|---|
| thermist:zenith / pendulum | III | Thermocline vs Latent Heat (Zenith) / Rebound (Pendulum) | -45% / -31% |
| ranger (both) | I | Rhythm, Steady vs Ricochet | -16 to -17% |
| ranger (both) | II | Disengage, Second Wind vs Lightfoot | -12 to -14% (Sharpshooter), -1 to -6% (Venomstrike) |
| ranger:sharpshooter | IV, V, VI | Pin -9, Volley -13, Parting -14 | |
| houndmaster:packleader | I, II, III, V | Heel Nip -13, Guard Dog -10.5, Howl -18, Long Chase -17 (King of the Pack in V -9) | |
| shadowblade (both) | III | Relentless, Sharpen vs Rupture | -10 to -16% |
| shadowblade:bladedancer | I, VII | Feint, Opportunist vs Ambush -9%; Eye of the Blades vs Curtain -15% | |
| pyromancer:sigilmancer | IV | Afterburn, Longburn vs Wildfire | -12 / -13% |
| lanternkeeper:beacon | V | Eternal Lantern, Last Light vs Festival (healing) | -25% |
| lanternkeeper:wayfarer | II | Ward vs the held pick (healing) | -10% |
| thresher:dancer / phantom | VII | Unbroken (dancer), Flicker (phantom) | -10% each |
| thermist:pendulum | IV, VII | Pulse -10.6, Bell -10.6 | |
| chronomancer (both) | III, V, VI | Bubble / Overwound (-13% damage, Echoist), Time Warp / Second Chance (-16 to -21% damage), Reprise (-12% damage, +13% healing) | damage only; healing equal or better |

**Where the held pick is beaten by 5% or more by a row-mate (bots not on the raid-best build)**, damage, paired, SE in brackets: Ranger Venomstrike I Ricochet +15 (1.8) and VII Virulence +4 (1.5); Driftblade Orbit IV Jet +12 (1.5); Driftblade Comet I Tailwind +10 (2.3), III Gyre +10 (2.0), IV Hurricane +6 (2.0); Thresher Phantom III Twin +16 (1.1) and IV Toll +15 (2.5); Thresher Dancer III Twin +8 (2.3), VI Pirouette +5 (2.0); Lone Wolf III Howl +7 (2.0); Iron Palm Stillwater V Dragon +5 (0.6). Driftblade is most affected because the build maker scored on a stationary dummy and Driftblade moves most of the time; Thresher is in the same position.

Healer rows trade damage for healing. The build maker scored healers on healing under heavy damage, so in most healer rows an unused pick gives the healer far more damage for about the same healing. These are not weak picks; they are places where the held build is not the raid-best:

| Healer | Row-mate that adds damage, at about equal healing (+-5) |
|---|---|
| tidecaller (both) | Spindrift +38 to +47% (section 2); Deep / Moon (row III) +11 to +22% damage for -6 to -8% healing |
| alembist (both) | Cask (III) +25 to +39% damage; Quicksilver (V) +20 to +34%; Slag (VII, Volatile) +16% for -5% healing |
| grovekeeper (both) | Moonfire (I) +15%; Seed Burst (IV) +18 to +21%; Nature's Wrath (V) +22 to +28% damage, healing within noise |
| threadweaver:shears | Heartstring (V) +18% damage, healing +5 |
| cleric:aegis | Atonement (I), Sanctum (V), Gilded (VI) are **+7 to +8% healing** over the held pick for 3 to 5% less damage (8 pulls each, about 2.5 sigma) |
| alembist:volatile | Residue (V) +6.7 +-2.7% healing |
| chronomancer:echoist | Reprise (VI) +13.4 +-3.7% healing at -12% damage |

Rows not listed are within about 5% of each other in raid (all rows I-VI of the specs I did not name), or are noise at 8 pulls.

## 4. Healers

Two numbers per healer: healing per second alive (100 = mean healer) and own damage per second alive (100 = mean healer), plus the party result: boss health left at the end of the pull compared with the average party in the same boss and setting (positive is worse). 48 to 64 observations per spec.

| Healer | Heal idx | Damage idx | Overheal | Party boss-HP-left delta (± ~2) |
|---|---|---|---|---|
| chronomancer:echoist | 98 | 136 | 72% | -7.8 |
| chronomancer:accelerant | 92 | 123 | 65% | -1.7 |
| threadweaver:shears | 103 | 106 | 58% | -9.3 |
| cleric:inquisitor | 100 | 113 | 50% | -3.4 |
| alembist:apothecary | 97 | 107 | 46% | +6.8 |
| alembist:volatile | 99 | 102 | 59% | +4.0 |
| grovekeeper:lifebinder | 108 | 104 | 79% | -2.6 |
| grovekeeper:moonwell | 106 | 99 | 67% | -1.9 |
| threadweaver:loomwright | 106 | 94 | 53% | -4.1 |
| lanternkeeper:wayfarer | 115 | 88 | 79% | +11.0 |
| tidecaller:undertow | 88 | 84 | 34% | -0.6 |
| cleric:aegis | 100 | 84 | 36% | -3.4 |
| lanternkeeper:beacon | 97 | 82 | 70% | +7.8 |
| tidecaller:springtide | 94 | 77 | 43% | +3.6 |

Behind: **Lantern Keeper (both specs)** is the clear one. Its parties leave 8 to 11 points more boss health than average (3 to 5 sigma), 70-79% of its healing is overheal, and its own damage is 12 to 18% under the mean healer. **Tidecaller** is behind on both axes (Springtide damage 77, healing 94; Undertow healing 88), though only because the bots do not hold Spindrift. **Apothecary** and Volatile parties also leave 4 to 7 points more boss health despite normal numbers. **Aegis** has the lowest damage among the Clerics but its party result is fine. At the other end, Echoist's damage is 36% above the mean healer at an average healing figure and Accelerant's 23% above (Future Sight is most of that); nothing here says to trim them, they set the bar the others are measured against.

Caveat: the party result is confounded by the other three members, error about 2 points. Only Lantern Keeper (+8, +11) and Shears (-9) are 3 sigma or more out.

## Caveats

- 240 s cut for the talent arms: a talent that pays only late in a pull is under-read, and clear rate was not measured per arm.
- Talents that add a new move (Thermocline, Gyre, Howl, Long Chase) are played by the bot AI. If the AI plays one worse than a person would, its reading is too low; bots.js has dedicated Thermocline code, so I do not think that is the cause there.
- Healer value includes shielding and damage reduction that the healing figure does not count, so a healing gap under 10% on a shield or mitigation talent proves little. The damage figures for healers are exact.
- Pairing removes the party and seed from the comparison, but pulls diverge chaotically after a few seconds, so the ±s above are the real noise. 8-pull arms only resolve gaps of roughly 7 to 8%.
- No dummy re-run was done; "dummy artifact" means only that the raid reading does not show the effect.

## Ranked buff candidates (direction only, no code)

1. **Thermist: Thermocline** (row III, both specs). Dead pick, -31% (Pendulum) and -45% (Zenith). A plain number lift will not close that; it needs a behaviour change that gives the Q slot something Rebound and Latent Heat do not.
2. **Ranger: rows I and II.** Rhythm and Steady trail Ricochet by about 16%; Disengage and Second Wind trail Lightfoot by 12 to 14%. Direction: behaviour change on Rhythm (a second arrow that always crits, or every second Quick Shot instead of every third) and Steady (a bigger Keen Eye payout), and a damage rider on Second Wind.
3. **Houndmaster Pack Leader: Heel Nip, Guard Dog, Howl, Long Chase.** All 10 to 18% behind. Howl is +7% on Lone Wolf, so it is spec-specific: give Pack Leader a version where the hounds also bite, or lift Heel Nip and Long Chase by about a third.
4. **Shadowblade row III (Relentless, Sharpen) and Bladedancer row VII (Eye).** 10 to 16% behind Rupture. Direction: Relentless refunds the points and also grants a short haste window; double Sharpen's cap.
5. **Pyromancer Sigilmancer: Afterburn and Longburn** (row IV). 12 to 13% behind Wildfire. Number lift: Afterburn's blast about 40% bigger; give Longburn a damage bonus during its extra seconds.
6. **Lantern Keeper (both specs).** The only healer with a clearly worse party result; most healing is overheal. Direction: behaviour change toward targeted or reactive healing, or a damage lift (damage idx 82-88). Eternal Lantern and Last Light are 25% behind Festival on Beacon; Ward is 10% behind on Wayfarer.
7. **Tidecaller: Low Water and Foam** (row I). If these should be real picks they are 38 to 47% behind Spindrift on damage and not ahead on healing. Direction: give both a small damage component. Or accept Spindrift as the pick and make the bot build hold it.
8. **Pyromancer Cataclysm** (index 90, flat across settings). Its row-mates are within +-4%, so this is not a talent problem; a flat lift of about 8 to 10% on the spec's own damage (number lift).
9. **Thresher Dancer on Hard** (83 against 99 on Normal in sets 1 and 2) and its row VII Unbroken (-10%): it loses more when it has to dodge. Direction: let a Blink be worth more when it goes through a telegraph (Phantom's Flicker, also -10%, could share the idea).
10. **Marionettist Understudy in set 3** (about 88). Number lift on its late rows (Curtain Rise -4%, Twin -3.5%).
11. **Lone Wolf (92), Zenith (92), Orbit (94).** Small gaps. Orbit: lift Galeforce (the held pick is 12% behind Jet). Zenith: row VI Slag trails by 8%.
12. **Chronomancer Time Warp, Second Chance, Bubble / Overwound.** They trail Future Sight by 13 to 21% damage with equal healing, so they are dead for anyone who wants to hurt. Direction: add a damage rider to Time Warp (scale its 70-damage strike every 3 s).
13. **Alembist, Grove Keeper, Shears.** The held healing picks give up 20 to 35% of the healer's damage for no healing advantage. Not weak specs; the fix is a rule in the next bot-build pass (score healers on healing and damage), not a buff.
14. **Sentinel (tank damage 89), Iron Palm tanks (91), Avalanche Bedrock and Stillwater Ripples (-6 / -7).** Low priority: tank damage matters less than survival.

**For the next bot-builds pass** (not a balance change): Venomstrike should hold Ricochet; Tidecaller should hold Spindrift; Orbit and Comet should hold Jet, Tailwind, Gyre; Phantom and Dancer should hold Twin (and Toll for Phantom). Doing that would change which specs read as weak (Tidecaller and Orbit most). I did not run it.
