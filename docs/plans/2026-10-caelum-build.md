# Caelum Vey build notes (set 3, Boss XII, the finale)

The design is in `docs/plans/2026-10-set-3-pitches.md` (section XII). The fight script is `client/js/arena/bosses/caelum.js` (read its header first). This page is the contract between the script and everything the clients draw, play and say. The notes and files of the three set 3 bosses before him (`2026-10-corvane-build.md`, `2026-10-brannoc-build.md`, `2026-10-morrowoak-build.md`; `corvane-art.js` / `corvane-fx.js`, `brannoc-art.js` / `brannoc-fx.js`, `morrowoak-art.js` / `morrowoak-fx.js`, the journals) are the worked examples. Corvane's afterimages (`cvimgs`) are the nearest thing to his.

He is the hardest fight in the game and the end of the set's story: the meteor that has hung in the sky of every set 3 room is his, and in this fight it falls.

## The rooms

- **First form** `caelum`: a round room, r 560. The crater floor round the half-buried star: glassy black-violet rock cracked with white light, star-dust, the burning meteor huge in the sky (`SET3_SKY` at p = 1: as near as it gets).
- **The half-buried star** in the middle: props `starcore` (r 72, at the centre) and four `starshard`s (r 38, standing clear round it at r 160 on the diagonals, `i` 0-3). All solid cover; Embers of Heaven break some shards (`breakProp`, how `'ember'`). A white-hot core of star-glass half sunk in the rock, the shards jagged pieces of the same.
- **Second form** `caelum:sky` (fight.js `setForm('sky')`, sent as `roomev` `k: 'form'`, `form: 'sky'`, 3 s into Ascendant): a round room, r 520. A circle of cloud high above the falling meteor; the meteor's fire below it lighting the cloud from underneath. The props are gone. `main.js` passes `caelum:sky` to `ArenaView.drawFloor`, so `buildFloor` needs a branch for each id.
- **The shadow** (the fight's clock): `roomev` `k: 'clshadow'` `{ x, y, r, burn }`, sent whenever it changes (each act, and Dark Ember on Hard). A dark disc on the floor, centred on the star, the meteor's shadow; in the last act (`burn: 1`) its floor burns (it is then also a `zone` with tag `clShadowBurn`, drawn as the zone; the shadow draws under it). Always drawn; the latest `clshadow` is its state.
- **Him:** a tall, still figure in armour of black glass veined with white light, a smooth silver mask, a halo of broken star-shards turning slowly behind his back, a blade that is a narrow sliver of starlight (longer each act). He walks, never runs; he turns his head only to choose a target. In the second form (`st.props.sky`, set it in `main.js` from `raid.form === 'sky'` the way Brannoc's `titan` is) the halo opens into a wheel of floating blades.

## Messages the script sends

| message | when | fields |
|---|---|---|
| `roomev` `k: 'climgs:<n>'` | afterimages for a Glint (one) or a Wake (8, or 12 with the second ring, or the mirrored pass), each its own n | `l: [[x, y, order, facing], ...]` (order from 1; facing: the angle to the next one), `dur` |
| `roomev` `k: 'clchorus:<n>'` (Hard) | an afterimage of an earlier set 3 boss joins a dance | `who` (`corvane`, `brannoc`, `morrowoak`), `x, y`, `dur` |
| `roomev` `k: 'clshadow'` | the shadow changes | `x, y, r, burn` |
| `roomev` `k: 'clgrace'` | Grace Withdrawn has taken everyone to 1 HP; Nightfall in `dur` s | |
| `roomev` `k: 'clsummon'` (dur 25) | the Starwyrm: the constellations come loose | |
| `roomev` `k: 'clwyrm:<n>'` | the serpent's path: the coil round the room, or (Hard) Second Coil's dive | `l: [[x, y], ...]`, `sp` (px/s), `at` (s until it moves), `w`, `dive` (1 for the dive), `dur` |
| `roomev` `k: 'clrear'` | the serpent rears on the rim to breathe Constellation Fall | `x, y`, `dur` |
| `roomev` `k: 'clascend'` (dur 8) | Ascendant: the crater falls away | |
| `roomev` `k: 'form'` | the room becomes the cloud | `form: 'sky'` |
| `roomev` `k: 'clhorizon'` | Horizon Cut | `a` (its angle), `g` (the gap's offset from the centre, across the cut), `gw` (the gap's width), `at`, `dur` |
| `propfx` `k: 'clember'` (Hard) | a Dark Ember set down | `x, y, ok` (1: at the shadow's edge, pushing it back; 0: it burns there) |
| `pdmg` `k: 'clGrace'` | each hero's health taken to 1 | |
| puddle `tag: 'clEmberBurn'` | a Dark Ember set down in the wrong place | |
| zone `tag: 'clCrownRing'` | the ring of fire Cinder Crown leaves (a donut) | |

The serpent is not a unit: draw it moving along the `clwyrm` path from `at`, at `sp`, from the message (the clients' clock), the way Brannoc's wheel runs its `brpath`. It is a serpent made of stars: a chain of constellation points joined by faint lines, its head a bright knot of stars.

## Casts (bcast name → anim)

Glint `glint` · Eightfold Wake / Anchored Wake / Mirrored Wake / Chorus of the Fallen `wake` · Cinder Crown `crown` · Pinning Thrust `thrust` · Grace Withdrawn `grace` · Nightfall `night` · Starfall `starfall` · Dark Ember `ember` · The Starwyrm `summon` · Embers of Heaven `embers` · Constellation Fall `constellation` · Ascendant `ascend` (then `banim` `ascendant`) · Horizon Cut `horizon` · Second Coil `coil` · The Sky Comes Down `enrage`.

## Telegraph tags (tg `tag`)

| tag | move | shape | notes |
|---|---|---|---|
| `clGlint` | Glint | rect from him to the afterimage, w 120 | |
| `clWake` | the Wakes' cuts | rects between afterimages, w 100, landing one after another | the whole dance is painted before the first cut |
| `clChorusCut`, `clChorusLeap`, `clChorusBloom` | Chorus of the Fallen (Hard) | Corvane's Draw Cut (a rect), Brannoc's Victory Leap (a circle following a hero), Morrow-Oak's petals (four narrow cones) | drawn in that boss's own colours, ghostly |
| `clCrown` | Cinder Crown | buster circle r 160 on the tank | a crown of embers; the ring of fire it leaves is the `clCrownRing` zone |
| `clThrust` | Pinning Thrust | rect from him through the tank (it turns after them until it locks), w 130 | the tank is driven down it to the wall |
| `clNight` | Nightfall | raidwide | |
| `clStar` | Starfall | towers r 85 (blue, need 1) inside the shadow | shards breaking off the meteor, falling |
| `clStarRain` | Starfall's rain | raidwide | |
| `clEmber` | Dark Ember (Hard) | a `drop` circle r 70 on a hero | a black ember; set it down on the shadow's edge |
| `clCoil` | the Starwyrm's coil | rect pieces round the room near the wall, w 150, landing as the serpent passes | |
| `clEmbers` | Embers of Heaven | circles r 130 on two (Hard: three) of the shards | the shard it lands on breaks |
| `clConstellation` | Constellation Fall | a circle r 1400 from where the serpent rears (the whole floor), `cover` | only the star's shadow is safe: draw the breath as starlight pouring across the floor, the star's shadow clear |
| `clHorizon` | Horizon Cut | two rects covering the whole room on either side of the gap | shards fall on the red, none in the gap |
| `clDive` | Second Coil (Hard) | rect across the room, w 230 | |
| `clShadowBurn` | the burning shadow (Act IV) | zone | |

## Art direction

The user's painted sheets: `docs/art/vfx-reference/caelum-1.png` and `caelum-2.png` in the main checkout (`C:\Users\Cedef\OneDrive\Documents\newgame\docs\art\vfx-reference\`, not in git). Match them: black glass and white-silver light, star-dust, the orange-red burning meteor, deep night violet, and silver afterimages (each one him, see-through, its order and facing readable). Red outlines for damage and blue for soaks are drawn by `boss-tells.js`; what is painted inside is the clue, and safe floor is never painted.

## Boss icons

Painted, in `client/icons/boss/caelum/` (and `PAINTED` in `boss-icons.js`). The file names are the cast names' slugs.
