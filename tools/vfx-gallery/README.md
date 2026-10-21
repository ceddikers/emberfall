# VFX gallery

Contact sheets of every visual effect in the game, so effects can be reviewed (and regression-checked) without
playing. The real game scripts are loaded into headless Chrome; nothing is mocked except the network layer.

```
node tools/vfx-gallery/render.js <what> [--zoom 0.63|1.0|0.63,1.0] [--out dir] [--only text] [--check]
```

| `<what>` | what it renders |
|---|---|
| a class id (`pyromancer`) | every ability, move, Ultimate (and its window moves), talent move, auto-attack, dash, taunt and kit moment of that class |
| `all-classes` | every class, plus the `shared` sheet |
| `shared` | moments many classes emit (`empower`, `ult-ready`...) |
| a boss id (`grubnak`, `skitterra`, `volkar`, `hollowking`) | every telegraph, cast, add, room and fight moment that boss's fight sends, plus every other `BOSS_VFX` export |
| `all-bosses`, `all` | as it says |
| `selftest` | five deliberately broken moments the checker must flag (throws, NaN, leak, dropped while drawing, missing): run with `--check`, expect exit 1 |

Other options: `--rows n` (rows per PNG page), `--frame WxH` (world size of a class frame, default 640x440),
`--floor <bossId>` (the room classes are drawn in, default grubnak), `--chrome <path>` (or `CHROME_PATH`; otherwise
Chrome, Chromium or Edge is found in the usual places), `--png` (write sheets in `--check` mode too), `-v` (per-row log).

Output goes to `tools/vfx-gallery/out/` (ignored by the .gitignore here): `<what>-p1.png`, `-p2.png`... and `<what>.json`.
A sheet at another zoom than 0.63 is named `<what>-z1-p1.png` etc. Needs Node 22+ (built-in WebSocket).

Timing (this machine): one class 6-20 s; `all-classes` about 3 min with PNGs, about 70 s in `--check` mode; a boss
about 2.5 min with PNGs (its fight is simulated first, about 4 s), `all-bosses --check` about 2 min.

## Check mode (for CI / tools/check.js)

```
node tools/vfx-gallery/render.js all-classes --check
node tools/vfx-gallery/render.js all-bosses --check
```

Exits 1 if any effect
- throws (when triggered, in a delayed `later`, in a VFX tick, or while drawing: `VFX.draw` drops a throwing effect
  with a `console.warn`, which is caught too),
- passes a NaN / Infinity to any canvas call or sets one on `lineWidth`, `globalAlpha`... (with the file:line),
- has an effect with a non-finite duration,
- leaves particles or effects alive more than 3 s after its declared end, or keeps going past 30 s,
- or is emitted by a kit (`k.fx('name')`) with no `KIT_VFX` entry to draw it.

Exit code 2 is a setup problem (no Chrome, bad argument). Not wired into `tools/check.js` yet: add a step that runs
the two commands above if wanted (about 8 min together).

## Reading a sheet

Each row is one effect. The header line gives its name (and `[visual id]`), what kind it is, where its look comes
from (`recipe` = `ABILITY_VFX`, `generic fx:` = the ability's `fx` field through `FX.cast`, `KIT_VFX`, `AUTO_VFX`,
`BOSS_VFX`...), and on the right its peak particles, peak live effects, peak canvas calls in one frame (a cost proxy)
and how long anything it made stayed alive. A red header is a failure (the reason is printed under the stats), an
amber one a warning (console output, or "draws nothing").

The frames are windup / impact / mid / aftermath / end. The times are picked per effect from a probe run: impact is
the busiest frame (canvas calls plus new particles), end is just before the last particle or effect dies; boss
telegraphs use the cast (windup at 55% of the cast, impact just after the hit lands). Every frame is labelled with
its time, live particles / effects, and canvas calls that frame.

Class stage: the effect's hero (melee classes at the boss, ranged ones back), three allies of other classes, the boss
of the `--floor` room on its real floor. Abilities aimed at an ally land on the green healer at the left. The last two
frames draw a red danger circle and a blue stack marker (the game's own telegraph drawing) under the effect, so you
can judge whether a telegraph stays readable under it.

Boss stage: the whole room. Each row is replayed from a real headless fight (normal, then hard for anything new):
the bot party where it stood, the room's props and floor as they were, the boss's cast with its telegraph and the
impact message, through the same view code the arena uses (`ArenaView`, `BossTells`, `BOSS_VFX`).

Frame size: the in-game camera's zoom is `clamp(min(W, H) / 960, 0.55, 1.1)`, so the screen always shows about 960
world px vertically and zoom only changes how many pixels a world px gets. A frame is a 640x440 world-px slice of
that (the whole room for bosses) at the chosen zoom: 0.63 is a 1080p-ish laptop window, 1.0 a 1920x1080 screen.
The hero is about 30 world px across (scale 1.85, as in the arena).

The JSON has the same per effect: `fail`, `warn`, `errors`, `nan` (call + file:line), `warnings`, `peakParts`,
`peakEffs`, `peakCalls`, `totalCalls`, `endT`, `declaredEnd`, `times`, `ms`; plus `maxParticles` and page-load errors.

## How effects are found (nothing is listed by hand)

- Abilities: for the base kit and every spec (`specKit`): the bar, a paced kit's `moves`, the Ultimate and its
  window's empowered moves (`ultAbilityById`), every `TALENT_ABILITIES` / `talentAbilities` move. Each is played
  through `FX.cast`, exactly as `main.js` plays a cast. `ABILITY_VFX[class]` keys no ability points at are played too
  (`recipe only`).
- Auto-attack: `KITS[class].auto.kind` through `AUTO_VFX`. Dash: `KIT_VFX.dash` and the dash trail. Taunt: classes in
  `TAUNT_CARRY`.
- Kit moments: `discover.js` reads `combat/*.js` for `k.fx('name', data)` (and `fxLocal` emits) and works out which
  class each belongs to from where it sits (the class's block, a `k.talent('class_...')` check on the line, or the
  helpers that call it, followed through helper calls). `sim.js` then runs short bot fights of the class (talents
  taken a row-option at a time) and records the real `kfx` data each moment was sent with; where no fight sent it,
  the call site's data is evaluated with stand-in values. Moments 5+ classes emit go on the `shared` sheet. The moment
  is aimed as `main.js playKitFx` aims it (`atTarget`, `data.to`, `data.en`...).
- Bosses: `sim.js` runs the boss fight (the real `RaidHost` with a bot party, normal and hard) and keeps the first of
  every kind of message that shows something (`tg` by tag, `bcast`, `banim`, `addev`, `propfx`, `roomev`, `zone`,
  `pud`, `roll`, `teth`, `fev`...), with what answered it (its `tgx`, `rollhit`, `reelx`...). Every `BOSS_VFX` export
  the fight never reached is then called directly with stand-in arguments guessed from its parameter names.

## Adding a new effect

Nothing to register: add the recipe / `KIT_VFX` entry / boss message as the game needs it and it shows up on the next
run. If a new message type draws something, add its handler to `handle()` in `page/harness.js` (copy what the
`Net.on` handler in `main.js` does) and a key for it in `keyOf()` in `sim.js`. A new script file is picked up from
`client/index.html` (the UI-only scripts the gallery skips are listed in `gameScripts()` in `render.js`).

## Known limits

- Effects that only exist inside `main.js`'s closure can't be called: the Ultimate-ready cue (`ultReadyCue`), the
  hurt vignette, pings, waymarks, the town. The screen moments (`cam.flash/dim/punch/stop`) are re-implemented in
  the harness from `main.js`.
- Data for kit moments no fight sent is a guess (`data from code` in the row's note): a recipe that throws only with
  that guess shows as a failure that may not happen in game; check the call site before filing it.
- Boss exports called directly (`direct` rows) get stand-in arguments, so what goes wrong there is a warning, not a failure (`edgeClose`, `meatballWall`, `floorFalls` warn today only because the guessed arguments are wrong); drawing helpers and setters (`drawBody`,
  `setClock`... anything taking a canvas or a function) are not called and are listed under `notRendered` in the JSON.
- Messages that only move things (adds walking, knockbacks, bot positions) are not replayed: units stand where the
  fight had them when the moment began.
- Moments that need a specific earlier state (a Threadweaver's threads, a Marionettist's Dolls) get a fixed stand-in
  state: two threads from the hero, two Dolls by the boss.
- `vfx.js` keeps its particle and effect lists private; the gallery's server adds one statement to the start of the
  `function setScale` line to read them (line numbers unchanged). If that line is renamed, effect counts and
  durations fall back to particle counts only (`vfxInternals: false` in the JSON).
- Randomness is seeded per effect, so sheets are repeatable run to run, but any change to an effect's random calls
  changes its particles.
