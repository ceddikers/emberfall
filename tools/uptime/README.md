# Uptime harness

Measures how much of each fight bots spend hitting the boss, hitting adds, or off (dodging, out of range, boss untargetable), plus overlap (two moves live at once) and quiet windows (6 s or more with nothing live and the boss targetable). Run from this folder; raw data goes to `raw/` (not committed).

- `node driver.js normal [boss1,boss2]` / `node driver.js hard ...`: plays 10 runs per boss with line-up A (bastion, cleric, ranger, pyromancer) and B (bastion, cleric, shadowblade, driftblade: the melee line-up), each boss at its tuned gear. At most 2 node children at once.
- `node analyze.js <mode> [bosses]`: on-boss / adds / off % per role and per act.
- `node overlap.js <mode> [bosses]`: overlap share and quiet windows.
- `node stretches.js <mode> <boss>`: the longest stretches where melee can't hit the boss, with the casts behind them.
- `node dummyval.js`: validation on a target dummy (should read ~99%).

Baselines and targets: docs/plans/handoff-2026-10-27.md.
