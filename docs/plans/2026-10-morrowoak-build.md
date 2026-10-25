# Morrow-Oak build notes (set 3, Boss XI)

The design is in `docs/plans/2026-10-set-3-pitches.md` (section XI). The fight script is `client/js/arena/bosses/morrowoak.js` (read its header first). This page is the contract between the script and everything the clients draw, play and say. Corvane's and Brannoc's notes (`2026-10-corvane-build.md`, `2026-10-brannoc-build.md`) and files (`corvane-art.js`, `corvane-fx.js`, `brannoc-art.js`, `brannoc-fx.js`, `journal/corvane.js`, `journal/brannoc.js`) are the worked examples of the same job.

## The rooms

- **First form** `morrowoak`: a round room, r 560. A dead grove on the crater's rim: scorched, cracked brown earth, withered grey-brown roots running everywhere, a few dead gold leaves, the night sky with the burning meteor.
- **Second form** `morrowoak:remade` (fight.js `setForm('remade')`, sent as `roomev` `k: 'form'`, `form: 'remade'`, during the Swallowing): a round room, r 520. Floating chunks of that grove over a starless violet-black dark, cracks of dark between them (decoration only: all of it inside r 520 is floor except the holes). `main.js` passes `morrowoak:remade` to `ArenaView.drawFloor` once the form changes, so `buildFloor` needs a branch for each id.
- **The holes** (the fight's whole idea): `f.floor` entries `{ id, kind: 'hole', x, y, r }`, sent in the `props` message's `f` list (the same path as Skitterra's fallen floor and Grubnak's grease). They are permanent and kept across the form change. A hole's `r` can grow (Saplings) while it stands, so draw it from the entry each frame, never cached at its first size. A hole is the Hunger: a ragged pit of starless black-violet with a bright violet rim, roots torn at its edge, things falling into it. It reads as "not floor" at a glance on both floors. Draw it in `ArenaView`'s floor-entry pass (the `fl.kind === 'pit'` branch is the model).
- **The set-wide meteor:** `SET3_SKY.draw` (`client/js/set3-sky.js`) at p ≈ 0.66 for Morrow-Oak: a burning mass, much nearer than over Brannoc's colosseum.
- **Him:** an elder tree as tall as a tower whose heartwood has split open on the Hunger (a starless dark with a violet rim). Branches for arms, a crown of dead leaves floating round a hollow face. He moves like a slow landslide. In the second form (`st.props.remade`) he is bigger and wears the limbs he grew.

## Messages the script sends

| message | when | fields |
|---|---|---|
| `propfx` `k: 'mgdig'` | a seed bursts and the ground opens (a new hole) | `x, y, r` |
| `propfx` `k: 'mggrow'` | a sapling reaches a hole and the hole grows | `x, y, r` (the new size) |
| `propfx` `k: 'mgfall'` | a hero falls into a hole (a heavy hit, held a moment, then climbs out on the side nearer the middle) | `x, y, pid, hx, hy` (the hole's centre) |
| `propfx` `k: 'mglimb'` | a limb is broken | `x, y, limb` (its key) |
| `roomev` `k: 'mgbloom'` | Fourfold Bloom: the petals open | `x, y` (his spot), `a` (the first petal's angle), `dir` (1 clockwise, -1 the other way: the turn between snaps), `at` (s to the first snap), `turn` (s from the first snap to the second), `dur` |
| `roomev` `k: 'swallow'` (dur 21) | the Swallowing: the grove tears loose and falls into the dark; the party rides the pieces down | |
| `roomev` `k: 'form'` | the room becomes the floating grove | `form: 'remade'` |
| `roomev` `k: 'mglimbs'` | the limbs grow | `l: [key, ...]` (in order: the first is at his upper left, then upper right, lower right, lower left) |
| adds `kind: 'sapling'` | little trees that walk to the nearest hole | |
| adds `kind: 'limb-<key>'` | the second form's limbs: breakable parts with their own bar, held at his side (they follow him) | keys: `cleaver`, `brood`, `storm`, `lantern` (Normal); Hard draws 4 of those and `wing`, `rime`, `rune`, `head` |
| puddle `tag: 'mgRimeIce'` | the ice a Frost Fist leaves (slows) | |
| debuff `rooted` | a fall, a Root Lash, Brood Roots | |

## The limbs (each grown from a monster the party has already killed)

| key | name | from | look | colour |
|---|---|---|---|---|
| `cleaver` | Cleaver Bough | Grubnak's cleaver | a bough ending in a huge rusted butcher's cleaver | orange |
| `brood` | Brood Roots | Skitterra's legs and silk | a clutch of root-legs strung with grey silk | lime green |
| `storm` | Storm Knot | Volkar's lightning | a knotted branch crackling with cyan storm | cyan |
| `lantern` | Barrow Lantern | the Hollow King's lanterns | a branch hung with a pale grave-lantern | pale green |
| `wing` | Wyrm Wing (Hard) | Vhalgrath's wing | a scorched bat-wing of bark and ember | orange-red |
| `rime` | Frost Fist (Hard) | Hrimgar's fist | a fist of ice-bound wood | ice blue |
| `rune` | Archmage Rune (Hard) | Azerath's sigils | a branch carved with a glowing rune ring | teal |
| `head` | Hydra Head (Hard) | the Hydra's heads | a serpent head of wet bark | sea green |

## Casts (bcast name → anim)

Hunger Seed / Twin Seed `seed` · Inhale `inhale` · Fourfold Bloom `bloom` (extra `dir`) · Root Lash `lash` · Sap Tide `tide` · Saplings `saplings` · Hungering Dark `dark` · The Swallowing `swallow` · The Grove Remade (Normal) / Deeper Roots (Hard) `unfold` (the limbs grow as it ends) · Cleaver Bough `cleaver` · Brood Roots `roots` · Storm Knot `storm` · Barrow Lantern `lantern` · Wyrm Wing `wing` · Frost Fist `fist` · Archmage Rune `rune` · Hydra Head `head` · Nothing Left `enrage`. (Last Gasp, Hard, is not its own cast: a broken limb's move fires once more from where it fell, under that move's own name.)

## Telegraph tags (tg `tag`)

| tag | move | shape | notes |
|---|---|---|---|
| `mgSeed` | Hunger Seed | circle r 90 following a hero, locking 1.6 s before it bursts | the dark seed pulsing over their head with a shrinking ring; at the lock the ground splits under the circle; then it is a hole |
| `mgTwin` | Twin Seed (Hard) | a tether (`kind: 'long'`, 330) between two seed carriers | apart, or they open one giant hole between them |
| `mgInhale` | Inhale | a `drop` of r 0 at him (nothing on the floor) | draw the Hunger breathing in: dust, leaves and light streaming toward his split, growing until it lands; then everyone slides toward him |
| `mgThorn`, `mgFrost`, `mgSpark`, `mgBlight` | Fourfold Bloom | four cones from him (thorn and spark wide, frost and blight narrow), all red | one object per petal: thorn (green, thorny), frost (ice blue), spark (gold, crackling), blight (violet, rotten); they snap, turn an eighth of the way (`mgbloom` `dir`) and snap again. Show which way they will turn on the petals themselves (they lean or curl that way) |
| `mgLash` | Root Lash | buster circle r 150 on the tank | roots whip up |
| `mgSap` | Sap Tide | raidwide | amber sap welling from the ground |
| `mgDark` | Hungering Dark (Hard) | a donut round each hole (inside: the hole's rim; outside: the rim + 95) | the ground round the holes leaning in |
| `mgSwallow` | the Swallowing's blow | raidwide | |
| `mgCleave` | Cleaver Bough's soak | stack circle r 120 on a hero (blue) | |
| `mgChop` | Cleaver Bough's chop | rect from the bough through where the soak landed, w 150 | |
| `mgRoots` | Brood Roots | five rects from the limb, w 90 | silk-strung roots |
| `mgRod` | Storm Knot | three circles r 190 | a lightning rod at each centre |
| `mgLantern` | Barrow Lantern | spread circle r 150 on a hero, passed on a beat | pale grave-light |
| `mgWing` | Wyrm Wing | half-room cone from him toward the limb's side | |
| `mgRime` | Frost Fist | circle r 210 following the farthest hero, then ice | |
| `mgRune`, `mgRuneRing` | Archmage Rune | circle r 270 at him, then the donut outside it | |
| `mgHead` | Hydra Head | rect from the limb toward the farthest hero, w 130 | |

## Art direction

The user's painted sheets: `docs/art/vfx-reference/morrowoak-1.png` and `morrowoak-2.png` in the main checkout (`C:\Users\Cedef\OneDrive\Documents\newgame\docs\art\vfx-reference\`, not in git). Match them: scorched cracked brown earth, withered grey-brown bark, a few dead gold leaves, the Hunger as black-violet with a bright violet rim, the orange-red meteor in the night sky. Each limb uses its own colour only on its own move (the table above); the petals are green (thorn), ice blue (frost), gold (spark) and violet (blight). Amber-gold only for sap. Red outlines for damage and blue for soaks are drawn by `boss-tells.js`; what is painted inside is the clue, and safe floor is never painted. The holes are not a telegraph (they are the floor itself) and are always drawn.

## Boss icons

Painted, in `client/icons/boss/morrowoak/` (and `PAINTED` in `boss-icons.js`). The file names are the cast names' slugs.
