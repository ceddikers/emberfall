# Class rework briefs (2026-10-24)

To start a rework, paste one brief into a new desktop chat (in a worktree). Each chat proposes options, waits for your pick, builds, and re-measures. The numbers come from `docs/plans/2026-10-class-balance.md`.

**Shared background (include it with every brief):** Read `CLAUDE.md` first; its rules apply. Never commit without the user's OK. Never convert line endings. Don't spoil boss mechanics. Talents are behaviour, not % bumps. The balance numbers and method are in `docs/plans/2026-10-class-balance.md`: dummy DPS from `tools/simulate.js`, plus bot raids on Normal across all 8 bosses (set 1 at `GEAR=mid`, set 2 at `GEAR=post1`). Re-measure the same way when you're done. Keep edits to the shared files (`kits.js`, `specs.js`, `talents.js`, `bots.js`, `check.js`) narrow, because other reworks run in parallel. Read the kit, specs and talents, then present 2–3 concrete options with a recommendation, and wait for the user's pick. Build, update tooltips and talents, re-measure, and finish with `node tools/check.js` ending in "All checks passed". Report the before and after numbers.

## 1. Thresher (Grim, Wraith)
Both specs are D tier: raid index 0.88 and 0.87 (0.79 on Hrimgar), while their dummy DPS is average. Both pro and sloppy play waste Weight.

Direction:
- First check that the bot plays the loop properly.
- Extra Weight spills onto the next affliction instead of being lost.
- Afflictions pause while the boss is untargetable.
- Grim: one "early harvest" Reap when every affliction is at full Weight.
- Wraith: a small payoff for movement (Weight ticks faster while you move).

Target: a raid index of about 0.97–1.03, with the sloppy/pro ratio near 70%.

## 2. Lanternkeeper (Beacon, Wayfarer)
Beacon clears 50% of raids (2.2 deaths per run); Wayfarer clears 71%, with 71% overheal, and a sloppy player heals only 41% as much as a pro. Their healing per second is in line with other healers, so the shape of the healing is the problem.

Direction:
- Beacon: call a Great Beacon to where you stand, once per lantern charge. The damage reduction applies right away, instead of needing allies to hold still.
- Wayfarer: every few steps, a light lands on the most-hurt ally in range.
- Check the bot's lantern use.

Target: a clear rate within about 10 points of the other healers (Lifebinder 100%, Aegis 96%).

## 3. Threadweaver (Loomwright, Shears)
Loomwright clears 58% (1.7 deaths per run); Shears clears 75%. The web has to be built before the hit, and threads go to waste when the party spreads.

Direction:
- Loomwright: threads stretch further, and a thread that snaps from range re-ties itself a few seconds later. A party-wide hit tugs every thread at once.
- Shears: re-measure before changing it.
- Check that the bot keeps the web up.

Target: a clear rate within about 10 points of the other healers.

## 4. Tanks: Kenseier down, Bloodreaver Berserker up
Kenseier takes 14–15 damage per second (other tanks 24–31) while dealing the most damage of any tank (105/s against 77–93). Bots probably deflect with frame-perfect timing.

Direction:
- First give the Kenseier bot a human-like timing error, then re-measure.
- Then trim: an ordinary deflect blocks only part of a hit, a Perfect deflect blocks it fully, and a small damage trim if it's still on top.

Berserker takes 1.6× the damage of other tanks, with almost no mitigation, and has the most tank deaths (0.84 per run).

Direction:
- Rampage used below half HP gives a short guard.

Target: both inside the other tanks' range (damage taken, damage dealt, deaths).

## 5. Marionettist Cutting Line and Shadowblade Nightstalker
Cutting Line is D tier (0.89), but a sloppy player already gets 80% of a pro's damage, so its floor is high and its ceiling is low.

Direction:
- An expert layer, such as a string drawn taut through the boss, cashed in at the right moment. It lifts the pro number, not the sloppy one.

Nightstalker is C tier (0.92) with the highest DPS death rate (0.41 per run). Its spec makes standing anywhere but behind the boss cost it.

Direction:
- Remove that penalty and keep only the rear reward.
- Shadowstep also works as a dodge.
- Check the bots for both specs.

Target: a raid index of about 0.97–1.03, and Cutting Line's sloppy/pro ratio nearer 70–75%.
