# Leftover fixes brief (one agent per boss)

Game: Emberfall, a browser raid game at C:\Users\Cedef\OneDrive\Documents\newgame. Read CLAUDE.md first (design rules, commands, line endings). Several agents work at once, one boss each, on their own files.

## What just changed (affects you)
`client/js/arena/raid-host.js:267` used to tell the bots that every boss's Hard damage is x1.25. It now uses the boss's own `def.hardDmg ?? 1.25` (the same multiplier fight.js really applies). Bots use it to judge how much a telegraph will hurt (bots.js ~1117). So on bosses with their own `hardDmg` (titan 1.46, wyrm 1.7, brannoc 1.34, corvane 1.33, caelum 1.45, morrowoak 1.2) Hard bot clear rates may have moved. Measure Hard fresh with this in place; do not edit raid-host.js.

## Rules
- Touch only your boss file `client/js/arena/bosses/<id>.js`, its journal `client/js/journal/<id>.js` (only if a move's behaviour changes; `node tools/journal-lint.js` clean), and append a short dated section to its `docs/plans/rework-*.md`. Never fight.js, bots.js, raid-host.js, check.js, data.js, DESIGN.md, sfx or icon files, other bosses. If you truly need one of those, stop and report why.
- Keep line endings (`git ls-files --eol` before/after). Don't commit. Scratch files go in your own `scratchpad\fx-<id>\` (scratchpad = C:\Users\Cedef\AppData\Local\Temp\claude\C--Users-Cedef--claude-spares-spare-luY8Lp\8573728e-d855-4d2d-8c80-64219069fd23\scratchpad).
- Design rules hold: telegraphs never hidden, Hard hits at least x1.1 Normal on every shared move, Hard keeps 3 to ~6 moves Normal never uses, no warning under 1.2 s, no cast cutting another's bar, tank and healer gaps stay as they are now (don't undo the 2026-10-26 tank moves), lethal busters not closer than now. Prefer tuning knobs that are Normal-only or Hard-only as the problem needs; a change must not quietly push the other difficulty out of its band.
- Bots: `GEAR=<gear> SUMMARY=1 node tools/bot-raid.js <normal|hard> 30 <id> seed=1000` (and 2000, 3000). **At most 2 node processes at once.** Tune on all three seeds (90 runs); swings of ±10 points between seed sets are normal, so don't chase single seeds. Log first deaths of failed pulls before guessing causes.
- Your boss's "Bots clear" line-ups in tools/check.js RAIDS (note gear= and runs=) must still clear. Near the end run `node tools/check.js` once (about 2-4 minutes) and confirm your boss's lines and the timeline line pass; ignore failures that are plainly another boss's (others are editing at the same time) but name them.
- Bands (90 runs): set 1 Normal `fresh` 85-90, Hard `mid` 45-60. Set 2 Normal `post1` 85-90, Hard `post2` 50-60 (Hydra, the finale, lowest of set 2) and Hard `post1` 40-45. Set 3 Normal `post3` 85-90; Hard `post4`: Corvane 50-55, Brannoc and Morrow-Oak 55-60, Caelum ~50 (finale, lowest).
- Time box ~60 minutes. If I check in, answer with where you are. After two failed attempts at the same thing, stop and report what blocks you.

## Report (under 350 words)
What you changed and why (file:line), bot numbers before/after for each difficulty and gear you touched, check result, journal-lint result if run. Spoilers are fine (I filter them).
