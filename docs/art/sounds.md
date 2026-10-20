# Emberfall sound list

There is no audio in the game yet. This is the list of what it needs, for you to source or generate. When files arrive,
the game gets a small sound module that loads them from `client/sounds/` and plays them on the events named below
(each player's browser plays its own copy, so nothing extra goes over the connection).

**Format:** `.ogg` (or `.mp3`), 44.1 kHz. Effects mono and short (most under 1 s, trimmed with no silence at the
start); music stereo and looping cleanly. Name files as in the **File** column. Where a row says *2–3 variants*,
add `-1`, `-2`, `-3` and the game picks one at random so repeats don't grate.

**Mix rule:** boss telegraphs and "you are about to die" cues are the loudest, clearest layer: they carry information.
Your own abilities come next. Other players' and bots' abilities sit quieter (the game will play them at about half).
Town ambience stays well under everything.

**Tone:** dusky low fantasy, warm and a little rustic (the town), heavier and darker inside the bosses' halls. Nothing
cartoonish, no voiced "ha!" grunts on every swing.

---

## 1. Interface

| File | When | Notes |
|---|---|---|
| `ui-click` | Any button | Soft wooden tick |
| `ui-open` / `ui-close` | A panel opens or closes | Paper / leather, subtle |
| `ui-hover` | Hovering a slot or card | Very quiet, optional |
| `ui-error` | Not enough gold, ability not ready, out of range | Dull muted thunk, never shrill |
| `ui-gold` | Gold gained | Two or three coins |
| `ui-buy` | Talent row bought, feast ordered | Coins into a purse |
| `ui-equip` | Gear equipped | Buckle / cloth |
| `ui-feat` | Feat or title earned | Small warm chime, rising |
| `ui-secret` | A town secret found | Curious, a little magical |
| `ui-bounty` | Bounty complete / claimed | Chalk on a board + coin |
| `title-sting` | First key on the title screen | One low swell, 2–3 s |
| `story-page` | Prologue page turn | Parchment |

## 2. Town

| File | When | Notes |
|---|---|---|
| `amb-town` | Loop in town | Distant chatter, birds, a breeze, faint tavern noise; 60–120 s loop |
| `amb-fountain` | Near the fountain (positional) | Water |
| `amb-tavern` | Near the Tankard | Muffled laughter, mugs |
| `amb-pond` | Near the pond | Frogs, water lapping |
| `npc-talk` | Dialogue line appears | Soft murmur per line, *3 variants*, no words |
| `arrival` | A newcomer's arrival scene | Cart wheels + a short motif |
| `portal-hum` | Near the Raid Portal (positional) | Low magical hum, loop |
| `portal-enter` | Stepping through | Whoosh into a deep boom |
| `fish-cast` / `fish-bite` / `fish-reel` / `fish-catch` / `fish-lost` | Fishing steps | Line whip, plop and ripple, reel click, splash out, slack line |
| `emote-cheer`, `emote-laugh`, `emote-wave` | Emotes | Optional, short, no voice acting needed |
| `dummy-hit` | Training Yard dummy hit | Straw thump |

## 3. Combat: shared

| File | When | Notes |
|---|---|---|
| `pull-count` | Pull countdown, each second | Drum tick; the last one heavier |
| `pull-go` | The pull | War horn or deep drum hit |
| `hit-light` / `hit-heavy` | You take a hit | Body impact; heavy for over a third of your HP |
| `low-hp` | You drop below 25% | Heartbeat loop while it lasts |
| `death` | You die | Muffled thud and a fading tone |
| `revive` | You're raised | Warm rising swell |
| `crit` | Your critical hit | A bright layer on top of the normal hit |
| `dash` | Dash | Quick whoosh, *2 variants* |
| `heal-land` | A heal lands on you | Soft chime |
| `shield-up` / `shield-break` | A shield on you | Glassy shimmer / shatter |
| `buff-on` | A party buff (Rally Banner, burst windows) | Short swell |
| `debuff-on` | You get a debuff (bleed, venom, Doom) | Dark sting |
| `cleanse` | A debuff cleansed | Airy release |
| `lb-ready` / `lb-fire` | Limit Break bar fills / fires | Rising shimmer / huge layered hit |
| `ping` / `waymark` | Ping or marker placed | Short UI blip / chalk tap |
| `clear` | Boss defeated | Victory fanfare, 4–6 s |
| `wipe` | Party wiped | Low, defeated chord |
| `chest-drop` / `chest-open` / `loot-take` | The boss chest | Heavy thud / lid creak and sparkle / item pickup |

## 4. Abilities (by kind)

Each hero's moves are tagged with a kind in the code; one set per kind covers all 17 classes. *2–3 variants* each.

| File | Kind | Used by (examples) |
|---|---|---|
| `ab-slash` | Blade swings | Bastion, Bloodreaver, Shadowblade, Driftblade |
| `ab-heavy` | Big weapon slams | Bloodreaver Crimson Drain, Bastion Judgment |
| `ab-stab` | Quick stabs | Shadowblade, Marionettist |
| `ab-punch` | Fists and palms | Ironpalm |
| `ab-shot` | Bow shots | Ranger |
| `ab-fire` | Fire spells | Pyromancer, Thermist |
| `ab-frost` | Cold spells | Thermist |
| `ab-holy` | Light and holy | Cleric, Bastion Holy Edge |
| `ab-nature` | Nature heals and growth | Grovekeeper |
| `ab-time` | Time magic | Chronomancer (a ticking clock layer) |
| `ab-rune` | Runes and glyphs | Runeguard |
| `ab-thread` | Threads and strings | Threadweaver, Marionettist |
| `ab-alchemy` | Vials and bombs | Alembist (glass clink + fizz) |
| `ab-wind` | Wind | Driftblade |
| `ab-maw` | Biting and swallowing | Gorgemaw |
| `ab-ledger` | Coins, quills, stamps | Oathbroker |
| `ab-taunt` | Taunts | All tanks |
| `ab-cast-loop` | While casting | Quiet hum under any cast bar |

## 5. Bosses

Every boss needs: an intro sting (`boss-<id>-intro`), a cast-start cue its big moves share, and the specific moves below.
**Telegraph cues play when the floor warning appears**, so players can hear what is coming; impact sounds play when it lands.

### Grubnak, the Ogre Chef (a kitchen)
`grubnak-intro` (pots clanging, a laugh), `grease-fire` (sizzling whoosh, raidwide), `tenderize` (meat-tenderizer slam,
tankbuster), `mince` / `double-chop` (cleaver whistle and chop), `ladle-spin` (heavy swinging scrape), `lid-slam` (pot
lid crash), `meat-toss` (wet splat), `family-meal` (a dinner bell, then a pile-on stack), `service` (a bell: "order
up"), `flare-up` (the stove igniting), `boil-over` (rising bubbling into an eruption), `dinner-rush` (fast kitchen
chaos, plates clattering).

### Queen Skitterra, the Broodmother (silk caves)
`skitterra-intro` (skittering, a hiss), `venom-mist` (wet hiss, raidwide), `silk-wrap` (silk stretching taut,
tankbuster), `lunge` (fast skitter and bite), `venom-spit` (spit and acid sizzle), `silk-reel` (thread winching),
`egg-sacs` (soft pulsing, then a squelch), `spiderlings` (a swarm of tiny legs), `web-gives-way` (silk tearing, stone
falling), `chrysalis` (silk wrapping tight round her, a heartbeat inside), `acid-deluge` (a downpour that sizzles).

### Volkar, the Storm Titan (the storm peak)
`volkar-intro` (thunder rolling, stone grinding), `pulse` (a low electric thrum), `thunderclap` (sharp crack,
raidwide), `titan-fist` (huge stone punch, tankbuster), `polarity` (two tones: a warm + and a cold −), `lightning-rods`
(metal planted, crackling), `gale-slam` (a wind burst), `storm-walls` (a moving wall of rain and lightning),
`squall-line` (rising wind), `supercell` (thunder marching across the floor in waves), `heavens-fall` (the sky
breaking).

### The Hollow King (the Barrow)
`hollowking-intro` (one funeral bell, chains), `barrow-knell` (a deep bell, raidwide), `royal-gaze` (a cold whisper
as the eyes open), `grave-cleave` (a huge sword with a bleed tear, tankbuster), `royal-doom` (a slow clock ticking
under a low choir, then the death toll), `lantern` (a lantern picked up: warm crackle), `echo-knights` (armour
creaking, a ghostly repeat of his last swing), `barrow-bells` (several bells), `coffin-lids` (stone grinding),
`long-night` (everything goes quiet but the bells), `judgement` (a gavel-like strike).

## 6. Music

| File | When | Notes |
|---|---|---|
| `mus-title` | Title and join screen | Slow, warm, a little melancholy; 1–2 min loop |
| `mus-town` | Town | Gentle, rustic; 2–3 min loop, quiet enough to talk over |
| `mus-grubnak` | Grubnak's fight | Rowdy, percussive, kitchen-clatter rhythm |
| `mus-skitterra` | Skitterra's fight | Tense and creeping, then frantic for the swarms |
| `mus-volkar` | Volkar's fight | Big drums and storm; builds through the phases |
| `mus-hollowking` | The Hollow King | Choir, bells, a funeral march that turns into a war march |
| `mus-victory` | After a clear | Short, 10–20 s, then town music returns |

Boss music should ideally come as an intro section plus a loop, or as stems that can build in later phases. Start with
single loops; stems can come later.

---

**Smallest set that already feels good** (if you want to start small): `ui-click`, `ui-error`, `pull-go`, `hit-heavy`,
`death`, `clear`, `wipe`, and a telegraph cue + impact for each boss's raidwide and tankbuster, then `mus-town` and one
boss track.
