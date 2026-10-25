# Corvane build notes (set 3, Boss IX)

The design is in `docs/plans/2026-10-set-3-pitches.md` (section IX). The fight script is `client/js/arena/bosses/corvane.js` (read its header first). This page is the contract between the script and everything the clients draw, play and say.

## The room

- Arena id `corvane`, a rect room: half width 560, half height 400, corner 40 (`shapes.js`). y is down, so the top wall is north.
- A snowy mountain pass at night. A ruined shrine (a torii-style gate and stone steps) against the north wall. Rock pillars and cliffs round the outside. Snow over stone flags.
- **Props:** six `stonelantern` props (r 30, hp 1, `cover: true`). Normal stands them at (±420, ±235) and (0, ±300); Hard draws six of eight spots, adding (−170, −275) and (170, 275). A lantern breaks when it shelters someone from a Comet Draw, or when Sundering Cut reaches it (`propfx` `k: 'break'`, `kind: 'stonelantern'`, `how: 'cut'` or the cover tag).
- **The set-wide meteor:** every set 3 room shows the same falling star in its sky. Over Corvane's pass it is a faint spark; it grows boss by boss (Brannoc, Morrow-Oak) until it fills the sky over Caelum, and in his finale it falls.

## Messages the script sends

| message | when | fields |
|---|---|---|
| `roomev` `k: 'whet'` (dur 9999) | the Whetstone changes | `n` notches lit (0–4), `max` 4, `over` Hard's notches held past the top, `st` the stance on show: `'crane'`, `'comet'`, `'parting'` or `null` |
| `roomev` `k: 'cvimgs'` | each Hundredfold Parting afterimage appears; an empty list clears them | `l: [[x, y, n], ...]` the numbered afterimages so far, `dur` |
| `roomev` `k: 'vigil'` (dur 30) | the Vigil wall begins | |
| `propfx` `k: 'cvdash'` | a Comet Draw dash lands | `x, y` where he started, `x2, y2` where he stopped at the wall |
| `propfx` `k: 'cvwisp'` | a wisp reached him (a notch) | `x, y` |
| `propfx` `k: 'cvlast'` | The Last Vigil begins (the closing act): the lanterns flare, frost runs out from him, the pass goes pale for a breath | `x, y` where he kneels |
| adds `kind: 'wisp'` | the Vigil's cold wisps; they drift to him and can be killed | |
| debuff `cracked` on the tank | Sundering Cut landed; Cracked Guard is coming | |

`main.js` turns `whet` and `vigil` into the figure's `st.props`: `stance`, `notch`, `over`, `kneel`.

## Casts (bcast name → anim)

White Gale `gale` · Sundering Cut `cut` · Cracked Guard `guard` · Draw Cut `draw` · Scabbard Sweep `sweepL` / `sweepR` (the scabbard points left or right of his facing) · Still Water `still` · Hollow Breath `breath` · Cold Sheathe `sheathe` · Rising Crane `crane` · Comet Draw / Comet Volley `comet` · Hundredfold Parting `parting` · False Stance `stance` · the stance before an unleashing: `stance`, with `st` in the message (`'crane'`, `'comet'` or `'parting'`) · The Vigil `kneel` · The Last Vigil `kneel` (a short kneel; then the three edges, each with its own stance and cast) · Last Light of the Pass `enrage`. `banim` `slash` when a Parting's slash lands.

## Telegraph tags (tg `tag`)

| tag | move | shape | notes |
|---|---|---|---|
| `cvGale` | White Gale | raidwide | the whole pass |
| `buster` | Sundering Cut, Cracked Guard | cone r 340 at the tank | the generic buster tag |
| `cvDraw` | Draw Cut | rect from him through a hero, w 110, len 1300 | follows the hero until half a second before |
| `cvSweep` | Scabbard Sweep | cone r 1500, arc π (half the room) | on the scabbard's side |
| `cvStill` | Still Water | a **zone** (burn), cone r 760, arc 2.2, in front of him | glassy ice; standing on it gets you countered |
| `cvBreath` | Hollow Breath | spread circle r 135 following the healer | five breaths in a row |
| `cvCrane`, `cvCrane2` | Rising Crane | two cones r 1500, arc 2.0; the second turned 45° and 1.4 s later | |
| `cvComet` | Comet Draw | rect from him through the farthest hero to the wall, w 150 | `cover: true`: a lantern's shadow is safe |
| `cvPart` | Hundredfold Parting | rect segments, w 96, joining the afterimages in order and back to where he began | |
| `cvSheathe` | Cold Sheathe | raidwide | after every unleashing |

## Art direction

The user's painted sheets are `docs/art/vfx-reference/corvane-1.png` and `corvane-2.png` in the main checkout (`C:\Users\Cedef\OneDrive\Documents\newgame\docs\art\vfx-reference\`, not in git). Match them: moonlit blue-grey snow, black lacquer armour cracked with frost, a broad single-edged blade carried point-down, frost-cyan and white for every danger, silver for afterimages, warm amber only in the lantern flames. Red outlines for damage and blue for soaks are drawn by `boss-tells.js`; what is painted inside is the clue, and safe floor is never painted.
