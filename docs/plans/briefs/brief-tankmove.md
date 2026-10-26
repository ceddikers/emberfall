# New tank move brief (one agent per boss)

Game: Emberfall, a browser raid game at C:\Users\Cedef\OneDrive\Documents\newgame. Several agents work at once, one boss each, each on its own files.

## Goal
Every fight has just had a fun pass (2026-10-26). Bots and blind reviewers agree what holds the fights below 8.5-9/10: **the tank still waits 30-75 s between things of their own to do**, because the existing tank moves are deadly (a tankbuster that takes most or all of a tank's health) and can't come more often. Your job: give your boss **one new move for the tank** (two only if one clearly isn't enough) that closes the tank's longest waits, on both difficulties, and makes the tank's job feel like a skill, not a wait.

What a good new tank move is:
- **The tank's own read and positioning job**, not just more damage: where to stand, which way to face the boss, when to step out, what to drag where, when to use a cooldown. Lighter than the existing busters so it can come often (aim: the tank never waits more than about 20-25 s for a beat of their own; worst case ~30 s).
- **Belongs to the fight's own rule** (DESIGN.md's answers for your boss, question 3 above all): it should be a new expression of the pattern the fight teaches, so a player who knows the fight can read it the first time. Read the boss's plan doc and DESIGN.md section 1 first.
- **Telegraphed in the world**: every damaging area drawn from the cast (red damage, blue stack/soak), no painted safe spots, no warning under 1.2 s; the boss's pose/prop is an extra clue (reuse an existing cast anim key from the boss file).
- **Natural targeting**: aimed at the tank or by where the tank stands, never a clock hack or a filler cast. It may touch others near the tank (that's a positioning job for everyone), but it is the tank's move.
- **Paired, not piled**: place it in the quiet stretches the tank has now, and pair it with existing moves where that makes a new problem; never two re-reads at once; never within the tank's cooldown window of a lethal buster; no cast that cuts another cast bar short.
- **Hard**: a sharper version (tighter, layered, or paired with a Hard-only move) is welcome; Hard hits at least x1.1 Normal. Hard keeps 3 to about 6 moves Normal never uses (the new move should be on both difficulties). Hard's per-pull draws (`mix` etc.) must include the new move in their limits (re-check the tank-gap and buster-spacing rules your file already enforces).
- Keep the tank's busiest moments readable: this is about ending the waiting, not making a tank's job a wall of hits.

## What you build (and the files you may touch)
1. **The move** in client/js/arena/bosses/<id>.js (one new cast name, used consistently; a short comment header like the other moves). Update the file's header comments.
2. **Bot handling** only if the generic telegraph-dodging bots can't play it (then add the read in the boss file the way the file's existing bot reads do; do NOT edit bots.js).
3. **The journal**: add the move to client/js/journal/<id>.js for every hero, each in their own voice (docs/plans/journal-voices.md: 1-3 sentences, the real way to survive, no digits or spelled-out times). Run `node tools/journal-lint.js` until it's clean.
4. **The sound: do NOT edit client/js/sfx-synth.js or client/js/sfx-map.js** (shared; I integrate them). Instead write a file `C:\Users\Cedef\AppData\Local\Temp\claude\C--Users-Cedef--claude-spares-spare-luY8Lp\8573728e-d855-4d2d-8c80-64219069fd23\scratchpad\newmoves\<id>.md` with: the cast name; its sound name `bm-<id>-<slug>` (slug = the cast name lower-cased, spaces to hyphens, punctuation dropped; check the boss's existing list in sfx-map.js around line 240 for the convention); and a recipe block in the style of the boss's existing recipes in sfx-synth.js (copy their toolkit use: whoosh, thud, noise, bell, etc.), e.g.
   ```
   def('bm-<id>-<slug>', 'bm', S => { ... });
   ```
   Make it distinct from the boss's other moves and fitting the move's look.
5. A short dated section appended to the boss's docs/plans/rework-*.md: the move, why, where it sits, the numbers.

Do not touch fight.js, bots.js, check.js, data.js, main.js, raid-host.js, DESIGN.md, sfx files or other bosses' files. Keep each file's line endings (`git ls-files --eol` before and after). Don't commit. Use your own scratch subfolder (scratchpad\tm-<id>\), never the scratchpad root.

## Testing
- Bots: `GEAR=<gear> SUMMARY=1 node tools/bot-raid.js <normal|hard> 30 <id> seed=1000` (and 2000, 3000). **At most 2 node processes at once.** Measure before and after; retune with numbers back into the band (gears and bands below). Log the first death of each failed pull before guessing at causes.
- Your boss's "Bots clear" line-ups in tools/check.js RAIDS (note `gear=` and `runs=`): each must still clear at least once in its runs.
- The timeline test in check.js (script 480-600 s with every course running all its sets; the upcoming-moves feed always three named steps ahead; no gap over 16 s with nothing named; a raidwide at least every 150 s and a tankbuster every 180 s; no warning under 1.2 s; every step named). You may run `node tools/check.js` once near the end to confirm your boss's timeline line passes (it takes ~2 minutes; ignore failures that are only the missing sound for your new move, which I'll add: e.g. an audio coverage line naming your `bm-<id>-<slug>`).
- Measure the tank's longest wait per act on both difficulties (worst case over Hard's draws) before and after with a scratch timeline replay.

Bands (bots, 90 runs = 3 seeds of 30): set 1 Normal `GEAR=fresh` 85-90%, Hard `GEAR=mid` 45-60%. Set 2 Normal `post1` 85-90%, Hard `post2` 50-60% (Hydra, the finale, the lowest). Set 3 Normal `post3` 85-90%, Hard `post4`: Corvane 50-55, Brannoc and Morrow-Oak 55-60, Caelum ~50 (the finale, the lowest).

Time box ~60 minutes. If I message a check-in, answer with where you are.

## Report (under 450 words)
The move (what it is, how it's read, where it sits, Normal vs Hard), the tank's longest wait per act before and after (both difficulties), bot numbers before and after, check line-ups, the timeline check result, the sound file path, journal-lint result, and your honest fun estimate before/after. Spoilers are fine in the report (I filter them).
