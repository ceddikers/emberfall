# Independent rescore brief

Independent review of a change to one raid boss in Emberfall (browser raid game) at C:\Users\Cedef\OneDrive\Documents\newgame. READ-ONLY: do not edit or commit project files, and do not run bot-raid.js or check.js (the CPU is busy). You may write scratch scripts in your own new folder under C:\Users\Cedef\AppData\Local\Temp\claude\C--Users-Cedef--claude-spares-spare-luY8Lp\8573728e-d855-4d2d-8c80-64219069fd23\scratchpad\ (e.g. a timeline replay of the course steps). Do not read the newest dated section of the boss's docs/plans/rework-*.md (it is the author's own claims); judge from the code.

The old version is `git show HEAD:<file>`; the new one is the working tree file (`git diff HEAD -- <file>` shows the change).

Read the design rules first: CLAUDE.md "Design rules" and docs/DESIGN.md section 1 ("Every fight is one idea", the 11 questions, the Hollow King's answers as the model, and this boss's own answers if written there) and section 4 (shared rules, and this boss's own section).

Score both versions, Normal and Hard, out of 10 for fun, as a demanding expert raid group would feel them (Hard should be challenging AND rewarding). Judge especially:
1. Tank and healer: the longest stretches without something to do, per act, both difficulties (worst case over Hard's shuffles).
2. Does the ending peak, or trail off?
3. On Hard, is the fight read each pull (order drawn) or memorisable?
4. Are the party's choices real trade-offs; is any stretch dead waiting?
Also look for anything the change broke: two re-reads at once, casts that cut each other's cast bar short, unfair piles, filler casts (a weakened copy of a move under the same name), the fight's rule blurred, Hard hitting lighter than Normal on any move, lethal tankbusters too close together, telegraphs shown for under 1.2 s.

Report (under 450 words): scores old vs new (Normal, Hard), the three biggest improvements, the three biggest problems or risks in the new version (file:line), any bugs you see (old or new), and whether you'd keep the change as it is, keep it with fixes (which, concretely), or revert.
