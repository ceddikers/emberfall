# Procedural sound: render, measure, audition

Every sound effect in Emberfall is synthesized in the browser with the Web Audio API. There are no audio files.

- `client/js/sfx-synth.js` holds the recipes. A small toolkit (tone, noise, partials/bell/glass/metal/wood, coins,
  thud, whoosh, rumble, sizzle, crackle, creak, scrape, zap, crack, bubbles, splat, voice, choir, pad, horn, drum,
  pluck, tick, skitter, echo) and every recipe built from it. It registers with `Sound.define` / `Sound.defineLoop`.
- `client/js/sfx-map.js` decides which recipe plays for an ability, a boss move or a telegraph (`SfxMap`).

## Tools

```
node tools/audio/render.js                 # render + measure everything, write .wav files to tools/audio/out/
node tools/audio/render.js --only ab-fire  # just the recipes whose name contains this
node tools/audio/render.js --write-trim    # re-balance: rewrite the TRIM table so each recipe hits its target
node tools/audio/render.js --all-wavs      # every variant as name-1.wav, name-2.wav, ...
node tools/audio/coverage.js               # SfxMap check: every mapped name exists, every ability / boss move is covered
```

`render.js` needs Node 22+ and a local Chrome or Edge (or `--chrome <path>` / `CHROME_PATH`). It runs headless Chrome
with an OfflineAudioContext at 44.1 kHz, renders every one-shot for 3 variants and seeds, and renders every loop for
5.6 s, calling its stop function at 5.0 s. A full run takes about a minute. `out/` is git-ignored. Audition the .wav files there.

## Reading the report

One line per recipe, plus `out/report.json` with everything:

| column | meaning |
|---|---|
| `dur` | the duration the recipe returns, including its reverb tail |
| `peak` | the highest sample over all variants, in dBFS. Above -0.5 is flagged **CLIP** |
| `LUFS` | loudness. One-shots use momentary max (400 ms window, K-weighted), corrected up for sounds shorter than 400 ms. Loops use integrated loudness over 2.5-5 s |
| `tgt` | the category's target (below) |
| `cent` | spectral centroid in Hz: a rough "brightness" |
| `lo/mid/hi` | share of energy below 250 Hz, 250 Hz-4 kHz and above 4 kHz |
| `trim` | the recipe's current TRIM in dB |
| flags | **CLIP**, **NAN**, **SILENT** (peak under -50), **DC** (mean over 0.01), **OVERRUN** (sound continues past the declared duration, so the engine would cut it), **NOSTOP** (a loop not silent 0.5 s after stop), **QUIET** / **LOUD** (more than 3 LU off target), `quiet(peak-limited)` (a note, not an error: the sound is mostly transient, so reaching the target would push its peak over its ceiling) |

Targets (LUFS), which also encode the mix rule that telegraphs and boss moves are the loudest, clearest layer:

| category | target | peak ceiling | what |
|---|---|---|---|
| `tg` | -14 | -3 | telegraph cues |
| `imp` | -14 | -3 | hits you take, boss impacts, the pull, Limit Break |
| `bm` | -15 | -3 | boss-move signatures |
| `sting` | -16 | -3 | intros, death, revive, clear, wipe |
| `ult` | -16 | -4 | Ultimates |
| `ab` | -18 | -6 | abilities |
| `hud` / `alert` | -20 | -6 / -4 | heals landing, buffs, pings / low-HP heartbeat |
| `ui` / `town` | -22 | -6 | interface, town one-shots |
| `step` | -28 | -6 | footsteps |
| `loop` | -30 | -6 | the cast hum |
| `amb` | -34 | -6 | ambience beds |

The exit code is 1 if anything errors, clips, is silent, NaN, DC-offset, overruns, fails to stop, or misses its target
by more than 3 LU without being peak-limited.

## Adding a recipe

1. In `sfx-synth.js`, in the right section, write
   `def('my-sound', 'ab', S => { S.whoosh({ f: 600, f1: 2400, dur: 0.3, peak: 0.4 }); S.thud({ at: 0.25, f: 120, dur: 0.2 }); });`
   - `S` is one play. Every tool takes `at` (seconds after the start) and `peak` (linear level of that layer), plus
     filters (`hp`/`bp`/`lp`, with `hp1`/`bp1`/`lp1` sweeps), an envelope (`a`, `hold`, `dur`, `swell`, or
     `pts: [[time, level], ...]`), `drive`, `am: [rate, depth]`, `grain` (crackle grit), `pan`, and a reverb send `rev`
     (or `S.space('room'|'hall'|'cave', amount)` for the whole recipe).
   - Use `S.vi(3)` for 2-3 deliberate variants and `S.rr(a, b)` for per-play jitter. Pitch already varies about 25
     cents per play and follows `p.rate`.
   - Layer a transient, a body and a tail. Keep each layer's `peak` around 0.2-0.6. The bus compressor and TRIM do the rest.
   - Loops: `loop('name', 'amb', L => { ... }, fadeIn)`, built from `L.src` (looped noise or buffers), `L.osc`,
     `L.lfo`, `L.f` (filters) and `L.c` (connect a chain) into `L.out`.
   - A per-ability voice is one line in `ABIL`: `[[family, pitch, at, gain, variant], [accent, ...]]`.
2. Run `node tools/audio/render.js --only my-sound` and check the flags. Then run `node tools/audio/render.js --write-trim`
   (the whole set, so other trims stay put) to level it.
3. If the game should play it, map it in `sfx-map.js` and run `node tools/audio/coverage.js`.

The meter only measures. Listen to the .wav files in `out/` before you trust a new sound.
