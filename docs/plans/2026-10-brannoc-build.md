# Brannoc build notes (set 3, Boss X)

The design is in `docs/plans/2026-10-set-3-pitches.md` (section X). The fight script is `client/js/arena/bosses/brannoc.js` (read its header first). This page is the contract between the script and everything the clients draw, play and say. Corvane's notes (`2026-10-corvane-build.md`) and files (`corvane-art.js`, `corvane-fx.js`, `journal/corvane.js`) are the worked example of the same job.

## The rooms

- **First form** `brannoc`: a round room, r 560. A drowned colosseum: half-flooded sand, ghostly pale-green spectators in the stands round the wall, red sun-banners on the walls, torches.
- **Second form** `brannoc:sea` (fight.js `setForm('sea')`, sent as `roomev` `k: 'form'`, `form: 'sea'`, at the Tide Rises): a round room, r 480. A broken ring of stone in an open sea under a stormy sky. `main.js` passes `brannoc:sea` to `ArenaView.drawFloor` once the form changes, so `buildFloor` needs a branch for each id.
- **Props in the sea form:** four `debris` props (r 38, `cover: true`, never break): broken columns and blocks fallen on the ring. They shelter from Breaker's wave.
- **The set-wide meteor:** `SET3_SKY.draw` (`client/js/set3-sky.js`) at p ≈ 0.33 for Brannoc: bigger and brighter than over Corvane's pass.
- **The Tidewrought** stands at (0, −400), at the ring's north edge, and never walks. He is colossal: a sea-titan with a shell of barnacled bronze plate and one great fist made of the Sunwheel, grown huge. Most of him rises out of the sea beyond the ring's north rim. `st.props.titan` is true in this form.

## Messages the script sends

| message | when | fields |
|---|---|---|
| `roomev` `k: 'brpath:<n>'` | every thrown thing's whole path, painted before it moves (each throw its own n; two can be up at once) | `l: [[x, y], ...]` the path's points (start, each bounce, where it comes to rest), `c: [[x, y], ...]` its blue catch points, `sp` speed px/s, `at` seconds from now it starts moving, `w` width, `big` (Sunwheel Unbound), `wave` (Breaker's wave: water, not a wheel), `dur` |
| `roomev` `k: 'tide'` (dur 10) | the Tide Rises (the colosseum floods and breaks apart) | |
| `roomev` `k: 'form'` | the room becomes the stone ring | `form: 'sea'` |
| `propfx` `k: 'brland'` | Victory Leap lands | `x, y` |
| `propfx` `k: 'brcrush'` | a Grip held too long: the titan slams the held hero | `x, y, pid` |
| adds `kind: 'tidehand'` | Undertow Grip's hand, closed on a hero; break it | |
| debuff `rooted` | the held hero | |

The wheel itself is not a unit: draw it moving along the painted path from `at`, at `sp`, from the `brpath` message (the clients' clock). Riposte (Hard) is a second path from where a wheel was caught.

## Casts (bcast name → anim)

Sunwheel / Twin Wheels `throw` · Riposte `riposte` · Victory Leap `leap` (he is out of reach in the air, then `banim` `pose` for 4 s: open to hits) · Hammer Heel `heel` · Roar of the Stands `roar` · Sand Furrow `furrow` · The Tide Rises `rise` (then `banim` `risen`) · Fist Slam `slam` · Breaker `slam` · Undertow Grip / Double Grip `grip` · Sunwheel Unbound `unbound` · Deep Call `call` · The Final Bell `enrage`.

## Telegraph tags (tg `tag`)

| tag | move | shape | notes |
|---|---|---|---|
| `brWheel` | a wheel's path | rect pieces along the path, landing as the wheel reaches each | pieces stop short of a catch circle |
| `brCatch` | the catch point | tower (blue circle, need 1) | caught: a heavy blow to the catcher; missed: a burst for everyone |
| `brRiposte` | Riposte's path (Hard) | rect pieces | |
| `brBanner` | Banner Fall | rect from the wall inward where a bounce knocked a banner loose | |
| `brLeap` | Victory Leap | circle r 200 following a hero, then held | |
| `buster` | Hammer Heel | two circles on the tank, the second bigger | |
| `brRoar` | Roar of the Stands | raidwide | |
| `brFurrow` | Sand Furrow | a long rect across the room through him, then a **zone** (burn) the same shape for 16 s | |
| `brRise` | the Tide Rises | raidwide | |
| `brFist` | Fist Slam (and Breaker's slam) | buster circle r 175 following the tank | |
| `brWave`, `brWaveBack` | Breaker | wide rects (w 210): out to the rim, then back off it (Hard: twice) | `cover: true`: debris shelters |
| `brGrip` | Undertow Grip | a `drop` marker circle r 110 following a hero (the hand's shadow) | not damage: the hand closes when it lands |
| `brDeep` | Deep Call | raidwide, then everyone shoved toward the rim | |

## Art direction

The user's painted sheets: `docs/art/vfx-reference/brannoc-1.png` and `brannoc-2.png` in the main checkout (`C:\Users\Cedef\OneDrive\Documents\newgame\docs\art\vfx-reference\`, not in git). Match them: wet sand and sea teal, bronze and blazing gold for the Sunwheel, pale ghost-green for the crowd, red banner cloth, gold-orange bounce paths with bright stars at each bounce, blue catch rings. Red outlines for damage and blue for soaks are drawn by `boss-tells.js`; what is painted inside is the clue, and safe floor is never painted.
