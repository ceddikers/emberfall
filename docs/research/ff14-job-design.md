# Research: FF14 job design and skill expression

*Compiled by a research agent, 2026-10-19. FFLogs blocked automated access, so the parse-spread numbers below are approximate community knowledge.*

## 1. Where skill expression comes from

- **GCD/oGCD weaving.** A beginner presses GCDs. An expert places every oGCD without clipping, and even picks which half of the GCD a buff goes in so one more hit lands inside it. https://www.thebalanceffxiv.com/jobs/tanks/gunbreaker/basic-guide/
- **Burst alignment (the 2-minute meta).** All raid buffs share one 120s cycle with roughly 20s windows. **Pooling resources so the best actions land inside the window, without overcapping in between, is the biggest single gap**, and it's a team skill. https://www.gameinformer.com/2024/06/06/high-end-raiding-overview-of-final-fantasy-xiv-dawntrail-job-changes
- **Gauges.** Overcapping is the beginner tell; pooling is the expert payoff.
  - Dark Knight banks MP for five Edge of Shadows per window.
  - The Blackest Night shield refunds a free spender when it breaks.
- **Procs.** Dancer: avoid proc overwrites, hold feathers for burst, don't overcap Esprit.
- **Positionals.** Flank/rear bonuses that reward anticipating the boss. A small potency cost when missed, plus True North to cover them.
- **Cast times vs instants.** Black Mage plans a **movement budget** of instants (Xenoglossy, Triplecast...) for each mechanic, slidecasts, and places Ley Lines.
- **Viper's trick:** combos fold onto one button that highlights the next step. A priority list is enough for casual play; planning around buffs is the next layer.

| Job | Beginner | Expert |
|---|---|---|
| Black Mage | Fire/Ice loop, stops during movement | Plans instants per mechanic, Ley Lines placement, never overcaps Polyglot |
| Machinist | Uses tools when lit | Keeps cooldowns from drifting, Queen and Reassemble under buffs |
| Dancer | Dances, presses procs | Feather/Esprit pooling, no overwrites |
| Reaper | Keeps the gauge loop going | Never drops its debuff, hits positionals, slidecasts |
| Samurai | Combo, then finisher | DoT timing rules, ends the fight at 0 resource |
| Gunbreaker | Combo in No Mercy | Speed-specific weave so an extra hit lands in No Mercy |
| Dark Knight | Spends MP whenever | Banks MP for buffs, never double-casts its shield |

## 2. Fun vs boring

- **Healer damage kits are the top complaint.** Mostly one spell plus a DoT. https://kotaku.com/final-fantasy-14-ff14-dawntrail-healer-job-rework-1851432853
- **Liked:** White Mage's Lily system. Free heals pay back as a damage spell.
- **Disliked:**
  - Support jobs whose whole identity is "a small % buff".
  - Homogenized 2-minute bursts.
  - Rotations that are hard to resume after a mistake, which then got simplified. https://shacknews.com/article/141032/final-fantasy-14-job-identity-dying
- **Most thought-intensive** (Game Informer): Monk, Viper, Machinist, Black Mage.
- **What players miss from older eras:** job-specific resource puzzles and utility, not more buttons.

## 3. Tanks and healers

- **Tanks** plan mitigation per damage event, with the biggest cooldowns on lethal hits. Short mitigation that also earns damage (The Blackest Night) links survival with DPS, which is a great hook. https://guildorder.com/games/ffxiv/guides/writing-a-mit-plan
- **Healers** run on **GCD economy**. Free oGCD heals come first, then resource heals, then GCD heals last, because every GCD heal costs a damage spell.
- **Shield healers** reward knowing the fight, since shields must go up before the hit. Sage's Kardia heals a target whenever you deal damage. https://www.thebalanceffxiv.com/jobs/healers/sage/basic-guide/

## 4. How big is the gap

- Most DPS run 90–95% GCD uptime; healers sometimes about 70%.
- Among Savage clears, median parses sit around 70–80% of the 99th percentile, and the 25th percentile around 60–70%.
- Casual players often do about half of top output, mostly from lost uptime, idle GCDs, missed burst alignment and deaths.

## Takeaways

1. **Fold combos onto one highlighted button.** The skill floor stays low; the ceiling lives in spending decisions.
2. **One shared burst cycle** (e.g. 60s with 15–20s windows) is the cooperative skill check.
3. **Every resource should overcap and be poolable.**
4. **Casters get a movement budget** of instants and charges.
5. **Positionals are small bonuses** (~10–20% of a skill), plus a "True North" style escape.
6. **Tank mitigation used well should earn resources.**
7. **Healers:** a Lily-style economy, at least one DPS-kit decision, and enough incoming damage that oGCDs alone can't cover it.
8. **Distinct resource puzzles** per job, not identical "+2 buttons every 2 minutes".
9. **Rotations that are easy to resume** after a mistake.
10. **Ship an analysis screen** showing uptime, overcaps and buff alignment, so the ceiling becomes visible and learnable.

Sources: thebalanceffxiv.com job guides (Gunbreaker, Dark Knight, Machinist, Dancer, Reaper, Samurai, Viper, Black Mage, Scholar, White Mage, Sage, Astrologian), Game Informer, Kotaku, Shacknews, Square Enix forums, guildorder.com.
