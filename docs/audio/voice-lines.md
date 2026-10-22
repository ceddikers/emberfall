# Emberfall voice lines: the recording script

Every spoken line in the game, for recording with an AI voice tool. **Generated** from `client/js/voice-lines.js` by `node tools/audio/voice-manifest.js --doc`: change a line there, then regenerate this page, so the game and the script never drift apart.

**615 files** (494 hero, 121 boss), about **20.8 minutes** of audio in all. The recommended minimum set is **80 files**, about 3.2 minutes.

## How to record and deliver

- **One file per row.** The file name is in the first column, exactly as written (lower case, hyphens). A line with several variants has one file for each, numbered from 1: `boss-grubnak-intro-1.ogg`, `boss-grubnak-intro-2.ogg`, `boss-grubnak-intro-3.ogg`. The game picks a variant, and shows that variant's exact text as the subtitle, so each file must say exactly its own line.
- **Format:** `.ogg` (Vorbis, quality 5 or so) preferred; `.mp3` also works. Mono, 44.1 kHz.
- **Trim:** no leading silence (the line must start within 20 ms), at most 150 ms of tail. No music, no sound effects under the voice. Reverb only where the direction asks for it (Volkar, the Hollow King), and keep it short.
- **Level:** normalise each file to about **-16 LUFS** integrated, peaks under -1 dBTP. Shouts are still -16 LUFS: the shout is in the performance, not the level.
- **Where:** put the files in `client/sounds/voice/`, then run `node tools/audio/voice-manifest.js`. It scans that folder, rewrites the `voice/...` entries of `client/sounds/manifest.json` (every other entry is kept) and lists what is still missing. Only files in the manifest are played; a line with no file stays silent (or uses the device voice if the player turns that on) and still shows its subtitle.
- **Delivery notes** in the last column are for the performance only; they are never spoken. Brackets in a line mean nothing: speak only the words in the "Line" column. Ellipses (`...`) are breaths or trailing off.
- **Lengths:** every line is meant to land in 0.5 to 2.5 seconds for heroes and 1 to 4 seconds for bosses. If a take runs long, ask for it faster rather than cutting words.
- **Pronunciation:** Grubnak GROOB-nack; Skitterra skih-TEH-ra; Volkar VOLL-kar; Bastion BAS-tee-un; Alembist AL-em-bist; Gorgemaw GORJ-maw; Marionettist marry-uh-NET-ist; Chronomancer KRON-o-man-ser; Flambé flahm-BAY.

## When lines play

- **Heroes** speak only for the player's own hero; other players' heroes stay silent. A move bark plays on about 12-18% of move orders (each hero has its own rate), never more than once in 9 s, never while a boss is talking and never during the pull countdown. Clicking your own hero: 60%, at most every 6 s. Low health: always, at most every 12 s. Ultimate, down and revive: always. Victory: after the boss's death line.
- **Bosses**: intro when the fight is shown, the pull line as it starts, one line at each phase change, the enrage and death lines always. Move calls are rare: each has its own chance, and a boss makes at most one call or taunt every 22-30 s. Taunts fire once each at 75%, 50% and 25% health. Priorities: enrage and death > phase, intro, pull and wipe > move calls > taunts > hero barks. A boss line always cuts off a hero bark.

## Recommended minimum set (record these first)

The move and select lines of four favourites (Bastion, Ranger, Pyromancer, Cleric), and every boss's intro, death and wipe lines: **80 files**. The game is fully playable with any subset: anything missing is simply silent.

- **Bastion:** `hero-bastion-move-1`, `hero-bastion-move-2`, `hero-bastion-move-3`, `hero-bastion-move-4`, `hero-bastion-move-5`, `hero-bastion-move-6`, `hero-bastion-move-7`, `hero-bastion-move-8`, `hero-bastion-select-1`, `hero-bastion-select-2`, `hero-bastion-select-3`, `hero-bastion-select-4`
- **Ranger:** `hero-ranger-move-1`, `hero-ranger-move-2`, `hero-ranger-move-3`, `hero-ranger-move-4`, `hero-ranger-move-5`, `hero-ranger-move-6`, `hero-ranger-move-7`, `hero-ranger-move-8`, `hero-ranger-select-1`, `hero-ranger-select-2`, `hero-ranger-select-3`, `hero-ranger-select-4`
- **Pyromancer:** `hero-pyromancer-move-1`, `hero-pyromancer-move-2`, `hero-pyromancer-move-3`, `hero-pyromancer-move-4`, `hero-pyromancer-move-5`, `hero-pyromancer-move-6`, `hero-pyromancer-move-7`, `hero-pyromancer-move-8`, `hero-pyromancer-select-1`, `hero-pyromancer-select-2`, `hero-pyromancer-select-3`, `hero-pyromancer-select-4`
- **Cleric:** `hero-cleric-move-1`, `hero-cleric-move-2`, `hero-cleric-move-3`, `hero-cleric-move-4`, `hero-cleric-move-5`, `hero-cleric-move-6`, `hero-cleric-move-7`, `hero-cleric-move-8`, `hero-cleric-select-1`, `hero-cleric-select-2`, `hero-cleric-select-3`, `hero-cleric-select-4`
- **Grubnak:** `boss-grubnak-intro-1`, `boss-grubnak-intro-2`, `boss-grubnak-intro-3`, `boss-grubnak-death-1`, `boss-grubnak-death-2`, `boss-grubnak-wipe-1`, `boss-grubnak-wipe-2`, `boss-grubnak-wipe-3`
- **Queen Skitterra:** `boss-skitterra-intro-1`, `boss-skitterra-intro-2`, `boss-skitterra-intro-3`, `boss-skitterra-death-1`, `boss-skitterra-death-2`, `boss-skitterra-wipe-1`, `boss-skitterra-wipe-2`, `boss-skitterra-wipe-3`
- **Volkar:** `boss-volkar-intro-1`, `boss-volkar-intro-2`, `boss-volkar-intro-3`, `boss-volkar-death-1`, `boss-volkar-death-2`, `boss-volkar-wipe-1`, `boss-volkar-wipe-2`, `boss-volkar-wipe-3`
- **The Hollow King:** `boss-hollowking-intro-1`, `boss-hollowking-intro-2`, `boss-hollowking-intro-3`, `boss-hollowking-death-1`, `boss-hollowking-death-2`, `boss-hollowking-wipe-1`, `boss-hollowking-wipe-2`, `boss-hollowking-wipe-3`

## Totals by speaker

| Speaker | Files | About |
|---|---:|---:|
| Bastion | 26 | 49 s |
| Bloodreaver | 26 | 47 s |
| Runeguard | 26 | 50 s |
| Ranger | 26 | 51 s |
| Shadowblade | 26 | 47 s |
| Pyromancer | 26 | 47 s |
| Cleric | 26 | 59 s |
| Grovekeeper | 26 | 60 s |
| Chronomancer | 26 | 56 s |
| Thermist | 26 | 41 s |
| Driftblade | 26 | 47 s |
| Alembist | 26 | 44 s |
| Gorgemaw | 26 | 46 s |
| Oathbroker | 26 | 46 s |
| Ironpalm | 26 | 50 s |
| Threadweaver | 26 | 47 s |
| Gloomsworn | 26 | 62 s |
| Marionettist | 26 | 49 s |
| Thresher | 26 | 51 s |
| Grubnak | 38 | 82 s |
| Queen Skitterra | 30 | 73 s |
| Volkar | 24 | 52 s |
| The Hollow King | 29 | 89 s |
| **All** | **615** | **20.8 min** |

## Bosses

### Grubnak

**Voice:** boastful, greasy, gleeful. An enormous ogre chef who treats the party as ingredients and the fight as dinner service. Booming, wet, smacking his lips; a gourmand, not a brute.

- **Age:** big, middle-aged ogre
- **Accent:** broad, rich, a showman chef
- **Pacing:** loud, rolling, savouring words
- **Device-speech fallback:** pitch 0.4, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `boss-grubnak-intro-1.ogg` ★ | Customers! In my kitchen! Sit, sit. You're the special. | *Intro (as the fight is shown)* · booming, delighted |
| `boss-grubnak-intro-2.ogg` ★ | Ah, fresh deliveries. Somebody fetch the salt. | unhurried, in full character |
| `boss-grubnak-intro-3.ogg` ★ | Grubnak's kitchen is open. And you are on the menu. | unhurried, in full character |
| `boss-grubnak-pull-1.ogg` | Kitchen's open! | *Pull (the fight begins)* · a short call to begin |
| `boss-grubnak-pull-2.ogg` | Tie your aprons, morsels! | a short call to begin |
| `boss-grubnak-phase2-1.ogg` | Appetiser's done. Bring out the mains! | *Phase 2: Mains* · a turn in the fight; more intent |
| `boss-grubnak-phase2-2.ogg` | Big plates now! Big plates! | a turn in the fight; more intent |
| `boss-grubnak-phase3-1.ogg` | Too cold in here. Feed the stove! | *Phase 3: Flare-Up* · roaring with laughter |
| `boss-grubnak-phase4-1.ogg` | Second sitting! Nobody leaves my table! | *Phase 4: Second Sitting* · a turn in the fight; more intent |
| `boss-grubnak-phase5-1.ogg` | Dessert! I saved room for you! | *Phase 5: Dessert* · a turn in the fight; more intent |
| `boss-grubnak-phase5-2.ogg` | Something sweet to finish. You! | a turn in the fight; more intent |
| `boss-grubnak-move-order-up-1.ogg` | Order up! | *Move call: Order Up!* · bellowed |
| `boss-grubnak-move-order-up-2.ogg` | Plates! Hot plates! | a short shout with the attack |
| `boss-grubnak-move-tenderize-1.ogg` | Tenderize! | *Move call: Tenderize* · a short shout with the attack |
| `boss-grubnak-move-tenderize-2.ogg` | Hold still, cutlet! | a short shout with the attack |
| `boss-grubnak-move-mince-1.ogg` | Mince! | *Move call: Mince* · a short shout with the attack |
| `boss-grubnak-move-mince-2.ogg` | Nice and fine! | a short shout with the attack |
| `boss-grubnak-move-meat-toss-1.ogg` | Catch! | *Move call: Meat Toss* · a short shout with the attack |
| `boss-grubnak-move-meat-toss-2.ogg` | Portions, portions! | a short shout with the attack |
| `boss-grubnak-move-family-meal-1.ogg` | Family meal! | *Move call: Family Meal* · a short shout with the attack |
| `boss-grubnak-move-family-meal-2.ogg` | Grandmother's recipe! | a short shout with the attack |
| `boss-grubnak-move-gut-blast-1.ogg` | Pardon me! | *Move call: Gut Blast* · a huge belch that turns into a roar |
| `boss-grubnak-move-flambe-1.ogg` | Flambé! | *Move call: Flambé* · a short shout with the attack |
| `boss-grubnak-move-flambe-2.ogg` | A splash of brandy! | a short shout with the attack |
| `boss-grubnak-move-rolling-meatballs-1.ogg` | Meatballs! | *Move call: Rolling Meatballs* · a short shout with the attack |
| `boss-grubnak-move-rolling-meatballs-2.ogg` | Fresh off the board! | a short shout with the attack |
| `boss-grubnak-move-gorge-1.ogg` | Mmm. Seconds. | *Move call: Gorge* · chewing |
| `boss-grubnak-move-gorge-2.ogg` | More! More! | a short shout with the attack |
| `boss-grubnak-move-last-orders-1.ogg` | Last orders! | *Move call: Last Orders* · a short shout with the attack |
| `boss-grubnak-taunt1-1.ogg` | Tough meat. Needs longer in the pot! | *Taunt at 75% health* · mocking, between blows |
| `boss-grubnak-taunt2-1.ogg` | You bruise my produce! | *Taunt at 50% health* · mocking, between blows |
| `boss-grubnak-taunt3-1.ogg` | My best knives, wasted on you! | *Taunt at 25% health* · mocking, between blows |
| `boss-grubnak-enrage-1.ogg` | Last call! The kitchen's closing, with you in it! | *Enrage* · final, overwhelming |
| `boss-grubnak-death-1.ogg` ★ | My... soufflé... | *Death* · collapsing |
| `boss-grubnak-death-2.ogg` ★ | Compliments... to... the chef... | dying, trailing off |
| `boss-grubnak-wipe-1.ogg` ★ | Delicious. Who's next? | *Wipe (the party has fallen)* · smacking lips |
| `boss-grubnak-wipe-2.ogg` ★ | Back to the larder with you. | gloating, satisfied |
| `boss-grubnak-wipe-3.ogg` ★ | Needed more salt. | gloating, satisfied |

### Queen Skitterra

**Voice:** hissing, maternal, cold. A spider broodmother who speaks to her prey as she would to her children: tender, patient and utterly without pity. A breathy whisper with a hiss on the s.

- **Age:** ageless
- **Accent:** soft, precise, drawn-out s sounds
- **Pacing:** slow, intimate, hissing
- **Device-speech fallback:** pitch 1.1, rate 0.85

| File | Line | Delivery |
|---|---|---|
| `boss-skitterra-intro-1.ogg` ★ | Hush, little ones. Mother has guests. | *Intro (as the fight is shown)* · whispered, tender |
| `boss-skitterra-intro-2.ogg` ★ | Ssso many soft things, wandering into my silk. | unhurried, in full character |
| `boss-skitterra-intro-3.ogg` ★ | Come closer. My children are hungry. | unhurried, in full character |
| `boss-skitterra-pull-1.ogg` | Feed them. | *Pull (the fight begins)* · a short call to begin |
| `boss-skitterra-pull-2.ogg` | Come to Mother. | a short call to begin |
| `boss-skitterra-phase2-1.ogg` | Close your eyes, children. Mother hunts. | *Phase 2: The Dark Between* · a turn in the fight; more intent |
| `boss-skitterra-phase3-1.ogg` | Wake, my darlings. Supper is here. | *Phase 3: The Brood* · a turn in the fight; more intent |
| `boss-skitterra-phase3-2.ogg` | Hatch. Hatch for Mother. | a turn in the fight; more intent |
| `boss-skitterra-phase4-1.ogg` | You tear my web? Then fall with it. | *Phase 4: The Collapse* · a turn in the fight; more intent |
| `boss-skitterra-move-silk-wrap-1.ogg` | Hold ssstill. | *Move call: Silk Wrap* · a short shout with the attack |
| `boss-skitterra-move-silk-wrap-2.ogg` | There, there. | a short shout with the attack |
| `boss-skitterra-move-eightfold-lunge-1.ogg` | Eight for you. | *Move call: Eightfold Lunge* · a short shout with the attack |
| `boss-skitterra-move-eightfold-lunge-2.ogg` | Dance, little fly. | a short shout with the attack |
| `boss-skitterra-move-venom-spit-1.ogg` | Ssso far away? | *Move call: Venom Spit* · a short shout with the attack |
| `boss-skitterra-move-brood-1.ogg` | Wake, children. | *Move call: Brood* · a short shout with the attack |
| `boss-skitterra-move-brood-2.ogg` | Hatch. | a short shout with the attack |
| `boss-skitterra-move-into-the-dark-1.ogg` | Hush now. | *Move call: Into The Dark* · a short shout with the attack |
| `boss-skitterra-move-silk-lines-1.ogg` | Tied together. How sweet. | *Move call: Silk Lines* · a short shout with the attack |
| `boss-skitterra-move-venom-mist-1.ogg` | Breathe deep, little ones. | *Move call: Venom Mist* · a short shout with the attack |
| `boss-skitterra-move-the-swarm-1.ogg` | All of you. Eat. | *Move call: The Swarm* · a short shout with the attack |
| `boss-skitterra-move-fang-rush-1.ogg` | Run. Mother likes it when they run. | *Move call: Fang Rush* · a short shout with the attack |
| `boss-skitterra-taunt1-1.ogg` | You bite. Like my firstborn did. | *Taunt at 75% health* · mocking, between blows |
| `boss-skitterra-taunt2-1.ogg` | You break my lovely threads. | *Taunt at 50% health* · mocking, between blows |
| `boss-skitterra-taunt3-1.ogg` | Mother is... displeased. | *Taunt at 25% health* · mocking, between blows |
| `boss-skitterra-enrage-1.ogg` | Enough. Mother will eat now. | *Enrage* · final, overwhelming |
| `boss-skitterra-death-1.ogg` ★ | My children... run... | *Death* · fading hiss |
| `boss-skitterra-death-2.ogg` ★ | Who will... sing to them... | dying, trailing off |
| `boss-skitterra-wipe-1.ogg` ★ | Wrap them up, darlings. Slowly. | *Wipe (the party has fallen)* · gloating, satisfied |
| `boss-skitterra-wipe-2.ogg` ★ | Sleep in the silk. | gloating, satisfied |
| `boss-skitterra-wipe-3.ogg` ★ | Ssso easily caught. | gloating, satisfied |

### Volkar

**Voice:** thunderous, ancient, terse. A storm titan who has sat on a mountain for thirty winters. Huge, resonant, every word like distant thunder. Add reverb in post if you can.

- **Age:** ancient
- **Accent:** none: elemental, very deep
- **Pacing:** very slow, one or two words at a time
- **Device-speech fallback:** pitch 0.2, rate 0.7

| File | Line | Delivery |
|---|---|---|
| `boss-volkar-intro-1.ogg` ★ | Small things. On my mountain. | *Intro (as the fight is shown)* · slow, distant thunder |
| `boss-volkar-intro-2.ogg` ★ | Thirty winters I have sat on this stone. Leave. | unhurried, in full character |
| `boss-volkar-intro-3.ogg` ★ | Climb no further. | unhurried, in full character |
| `boss-volkar-pull-1.ogg` | Then break. | *Pull (the fight begins)* · a short call to begin |
| `boss-volkar-phase2-1.ogg` | Be still. | *Phase 2: The Eye* · a turn in the fight; more intent |
| `boss-volkar-phase3-1.ogg` | The storm returns. | *Phase 3: Back of the Storm* · a turn in the fight; more intent |
| `boss-volkar-phase4-1.ogg` | Now. The sky. | *Phase 4: Heavens Fall* · a turn in the fight; more intent |
| `boss-volkar-move-titan-fist-1.ogg` | Kneel. | *Move call: Titan Fist* · a short shout with the attack |
| `boss-volkar-move-thunderclap-1.ogg` | Hear me. | *Move call: Thunderclap* · a short shout with the attack |
| `boss-volkar-move-gale-slam-1.ogg` | Away. | *Move call: Gale Slam* · a short shout with the attack |
| `boss-volkar-move-lightning-rods-1.ogg` | The bolt seeks. | *Move call: Lightning Rods* · a short shout with the attack |
| `boss-volkar-move-polarity-surge-1.ogg` | Feel the charge. | *Move call: Polarity Surge* · a short shout with the attack |
| `boss-volkar-move-storm-walls-1.ogg` | Wind. Rise. | *Move call: Storm Walls* · a short shout with the attack |
| `boss-volkar-move-avalanche-1.ogg` | The mountain moves. | *Move call: Avalanche* · a short shout with the attack |
| `boss-volkar-move-heavens-fall-1.ogg` | Fall. | *Move call: Heavens Fall* · a short shout with the attack |
| `boss-volkar-taunt1-1.ogg` | Ants. Biting. | *Taunt at 75% health* · mocking, between blows |
| `boss-volkar-taunt2-1.ogg` | You... endure. | *Taunt at 50% health* · mocking, between blows |
| `boss-volkar-taunt3-1.ogg` | The storm... weakens? No. | *Taunt at 25% health* · mocking, between blows |
| `boss-volkar-enrage-1.ogg` | The sky breaks. | *Enrage* · the loudest line he has |
| `boss-volkar-death-1.ogg` ★ | The storm... passes... | *Death* · dying, trailing off |
| `boss-volkar-death-2.ogg` ★ | Silence. At last. | dying, trailing off |
| `boss-volkar-wipe-1.ogg` ★ | Dust. | *Wipe (the party has fallen)* · gloating, satisfied |
| `boss-volkar-wipe-2.ogg` ★ | The mountain remains. | gloating, satisfied |
| `boss-volkar-wipe-3.ogg` ★ | Gone. As all things go. | gloating, satisfied |

### The Hollow King

**Voice:** hollow, courteous, grave. A dead monarch who still holds court out of habit. Polite, faintly sad, echoing as if from inside a tomb. Never shouts; his calm is the threat.

- **Age:** a dead king, a hundred years buried
- **Accent:** old, courtly, formal
- **Pacing:** slow, gracious, hollow
- **Device-speech fallback:** pitch 0.5, rate 0.8

| File | Line | Delivery |
|---|---|---|
| `boss-hollowking-intro-1.ogg` ★ | Visitors. It has been so long since the court received anyone. | *Intro (as the fight is shown)* · unhurried, in full character |
| `boss-hollowking-intro-2.ogg` ★ | Kneel, and be welcome in my barrow. | unhurried, in full character |
| `boss-hollowking-intro-3.ogg` ★ | You have come a long way down the road. Sit. Stay. | unhurried, in full character |
| `boss-hollowking-pull-1.ogg` | Court is in session. | *Pull (the fight begins)* · a short call to begin |
| `boss-hollowking-phase2-1.ogg` | Rise, my guard. Bear witness. | *Phase 2: Testimony* · a turn in the fight; more intent |
| `boss-hollowking-phase3-1.ogg` | Let the court assemble. | *Phase 3: Court of Bones* · a turn in the fight; more intent |
| `boss-hollowking-phase4-1.ogg` | The court has heard enough. | *Phase 4: The Verdict* · a turn in the fight; more intent |
| `boss-hollowking-phase5-1.ogg` | Hear now your judgement. | *Phase 5: Judgement* · a turn in the fight; more intent |
| `boss-hollowking-phase6-1.ogg` | Let the lanterns go out. | *Phase 6: The Long Night* · a turn in the fight; more intent |
| `boss-hollowking-phase6-2.ogg` | The long night falls. As it fell for me. | a turn in the fight; more intent |
| `boss-hollowking-move-royal-doom-1.ogg` | I sentence you. | *Move call: Royal Doom* · a short shout with the attack |
| `boss-hollowking-move-royal-doom-2.ogg` | Royal doom. | quietly, almost sorry |
| `boss-hollowking-move-royal-gaze-1.ogg` | You stand before a king. | *Move call: Royal Gaze* · a short shout with the attack |
| `boss-hollowking-move-grave-cleave-1.ogg` | Bow your head. | *Move call: Grave Cleave* · a short shout with the attack |
| `boss-hollowking-move-echo-knights-1.ogg` | My guard remembers. | *Move call: Echo Knights* · a short shout with the attack |
| `boss-hollowking-move-barrow-bells-1.ogg` | The bells. Do you hear them? | *Move call: Barrow Bells* · a short shout with the attack |
| `boss-hollowking-move-barrow-knell-1.ogg` | Mourn with me. | *Move call: Barrow Knell* · a short shout with the attack |
| `boss-hollowking-move-coffin-lids-1.ogg` | Wake, old friends. | *Move call: Coffin Lids* · a short shout with the attack |
| `boss-hollowking-move-royal-decree-1.ogg` | By royal decree. | *Move call: Royal Decree* · a short shout with the attack |
| `boss-hollowking-move-funeral-march-1.ogg` | March, my dead. | *Move call: Funeral March* · a short shout with the attack |
| `boss-hollowking-taunt1-1.ogg` | You strike at a crown. Bold. | *Taunt at 75% health* · mocking, between blows |
| `boss-hollowking-taunt2-1.ogg` | I have been dead a hundred years. I am patient. | *Taunt at 50% health* · mocking, between blows |
| `boss-hollowking-taunt3-1.ogg` | The crown... grows heavy. | *Taunt at 25% health* · mocking, between blows |
| `boss-hollowking-enrage-1.ogg` | The moon sets. Sleep with me. | *Enrage* · final, overwhelming |
| `boss-hollowking-death-1.ogg` ★ | At last... I may lie down. | *Death* · dying, trailing off |
| `boss-hollowking-death-2.ogg` ★ | Bury me... properly, this time. | dying, trailing off |
| `boss-hollowking-wipe-1.ogg` ★ | Rest here. The court has room. | *Wipe (the party has fallen)* · gloating, satisfied |
| `boss-hollowking-wipe-2.ogg` ★ | Another banner for my hall. | gloating, satisfied |
| `boss-hollowking-wipe-3.ogg` ★ | How courteous of you to stay. | gloating, satisfied |

## Heroes

### Bastion

**Voice:** steady, warm, resolute. A young shield knight who has drilled for this all their life; quiet confidence, never shouts unless it matters. Androgynous voice, mid pitch.

- **Age:** early twenties
- **Accent:** clean, neutral English, a little formal
- **Pacing:** even, unhurried
- **Device-speech fallback:** pitch 1, rate 1

| File | Line | Delivery |
|---|---|---|
| `hero-bastion-move-1.ogg` ★ | Holding the line there. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-bastion-move-2.ogg` ★ | Shield first. Moving. | brisk acknowledgement |
| `hero-bastion-move-3.ogg` ★ | I'll take that ground. | brisk acknowledgement |
| `hero-bastion-move-4.ogg` ★ | Steady. Going. | brisk acknowledgement |
| `hero-bastion-move-5.ogg` ★ | Where you need me. | brisk acknowledgement |
| `hero-bastion-move-6.ogg` ★ | Advancing. | brisk acknowledgement |
| `hero-bastion-move-7.ogg` ★ | Covering that flank. | brisk acknowledgement |
| `hero-bastion-move-8.ogg` ★ | On your word. | brisk acknowledgement |
| `hero-bastion-select-1.ogg` ★ | Shield's up. Orders? | *Select (clicked on)* · attentive, in character |
| `hero-bastion-select-2.ogg` ★ | Bastion, standing ready. | attentive, in character |
| `hero-bastion-select-3.ogg` ★ | I'm with you. | attentive, in character |
| `hero-bastion-select-4.ogg` ★ | Say where, and I'll hold it. | attentive, in character |
| `hero-bastion-down-1.ogg` | The line... breaks... | *Down (falls in battle)* · pained, fading out |
| `hero-bastion-down-2.ogg` | Forgive me... | pained, fading out |
| `hero-bastion-down-3.ogg` | Hold... without me... | pained, fading out |
| `hero-bastion-revive-1.ogg` | Back on my feet. Shield up. | *Revived* · a breath in, relieved |
| `hero-bastion-revive-2.ogg` | The line holds again. | a breath in, relieved |
| `hero-bastion-revive-3.ogg` | Thank you. I'm here. | a breath in, relieved |
| `hero-bastion-low-1.ogg` | I'm bending, not broken! | *Low health* · urgent, strained |
| `hero-bastion-low-2.ogg` | Heal me, quickly! | urgent, strained |
| `hero-bastion-low-3.ogg` | Shield's cracking! | urgent, strained |
| `hero-bastion-ult-1.ogg` | Last Bastion! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-bastion-ult-2.ogg` | Behind me, all of you! | shouted, full voice |
| `hero-bastion-ult-3.ogg` | Nothing passes! | shouted, full voice |
| `hero-bastion-victory-1.ogg` | The line held. Well fought. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-bastion-victory-2.ogg` | Rest now. We earned it. | satisfied, a little tired |

### Bloodreaver

**Voice:** gravelly, wild, amused. A huge axe-brute who enjoys every fight a little too much. Deep chest voice, a grin you can hear.

- **Age:** forties
- **Accent:** broad northern burr
- **Pacing:** loose, bursts of energy, laughs between words
- **Device-speech fallback:** pitch 0.6, rate 1.05

| File | Line | Delivery |
|---|---|---|
| `hero-bloodreaver-move-1.ogg` | Ha! Lead on! | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-bloodreaver-move-2.ogg` | Axe is coming. | brisk acknowledgement |
| `hero-bloodreaver-move-3.ogg` | Smells like a fight. | brisk acknowledgement |
| `hero-bloodreaver-move-4.ogg` | I go where the blood is. | brisk acknowledgement |
| `hero-bloodreaver-move-5.ogg` | Heh. Faster. | brisk acknowledgement |
| `hero-bloodreaver-move-6.ogg` | Out of my way. | brisk acknowledgement |
| `hero-bloodreaver-move-7.ogg` | Stomping over. | brisk acknowledgement |
| `hero-bloodreaver-move-8.ogg` | Aye, aye, aye. | laughing |
| `hero-bloodreaver-select-1.ogg` | Point me at something. | *Select (clicked on)* · attentive, in character |
| `hero-bloodreaver-select-2.ogg` | What's bleeding today? | attentive, in character |
| `hero-bloodreaver-select-3.ogg` | Ha! You called? | attentive, in character |
| `hero-bloodreaver-select-4.ogg` | The axe is thirsty. | attentive, in character |
| `hero-bloodreaver-down-1.ogg` | Hah... not... yet... | *Down (falls in battle)* · pained, fading out |
| `hero-bloodreaver-down-2.ogg` | Too much blood... mine... | pained, fading out |
| `hero-bloodreaver-down-3.ogg` | Ugh. Good hit. | grudging laugh |
| `hero-bloodreaver-revive-1.ogg` | Ha! Can't kill me! | *Revived* · a breath in, relieved |
| `hero-bloodreaver-revive-2.ogg` | Up again. Again! | a breath in, relieved |
| `hero-bloodreaver-revive-3.ogg` | That one tickled. | a breath in, relieved |
| `hero-bloodreaver-low-1.ogg` | Now I am angry! | *Low health* · urgent, strained |
| `hero-bloodreaver-low-2.ogg` | More blood! Mine's running out! | urgent, strained |
| `hero-bloodreaver-low-3.ogg` | Ha! Getting close now! | urgent, strained |
| `hero-bloodreaver-ult-1.ogg` | Crimson Eclipse! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-bloodreaver-ult-2.ogg` | Drink deep! | shouted, full voice |
| `hero-bloodreaver-ult-3.ogg` | Red sky! Red sky! | roared |
| `hero-bloodreaver-victory-1.ogg` | Ha! Who's next? | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-bloodreaver-victory-2.ogg` | Good blood. Good day. | satisfied, a little tired |

### Runeguard

**Voice:** stoic, low, watchful. A young warder who speaks as if every word were carved. Never excited; firm, quiet authority.

- **Age:** mid twenties
- **Accent:** soft, precise, slightly archaic
- **Pacing:** measured, short phrases, pauses
- **Device-speech fallback:** pitch 0.85, rate 0.9

| File | Line | Delivery |
|---|---|---|
| `hero-runeguard-move-1.ogg` | Understood. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-runeguard-move-2.ogg` | The runes agree. | brisk acknowledgement |
| `hero-runeguard-move-3.ogg` | Proceeding. | brisk acknowledgement |
| `hero-runeguard-move-4.ogg` | I'll ward it. | brisk acknowledgement |
| `hero-runeguard-move-5.ogg` | As it is written. | brisk acknowledgement |
| `hero-runeguard-move-6.ogg` | Taking position. | brisk acknowledgement |
| `hero-runeguard-move-7.ogg` | Quietly, then. | brisk acknowledgement |
| `hero-runeguard-move-8.ogg` | The stones follow. | brisk acknowledgement |
| `hero-runeguard-select-1.ogg` | Runeguard. Listening. | *Select (clicked on)* · attentive, in character |
| `hero-runeguard-select-2.ogg` | The wards are set. | attentive, in character |
| `hero-runeguard-select-3.ogg` | Speak. | attentive, in character |
| `hero-runeguard-select-4.ogg` | The stones are quiet. For now. | attentive, in character |
| `hero-runeguard-down-1.ogg` | The ward... failed... | *Down (falls in battle)* · pained, fading out |
| `hero-runeguard-down-2.ogg` | The runes... go dark... | pained, fading out |
| `hero-runeguard-down-3.ogg` | Not yet... written... | pained, fading out |
| `hero-runeguard-revive-1.ogg` | The wards wake. | *Revived* · a breath in, relieved |
| `hero-runeguard-revive-2.ogg` | I return. | a breath in, relieved |
| `hero-runeguard-revive-3.ogg` | The stones remember me. | a breath in, relieved |
| `hero-runeguard-low-1.ogg` | My wards are thinning. | *Low health* · urgent, strained |
| `hero-runeguard-low-2.ogg` | I need mending. | urgent, strained |
| `hero-runeguard-low-3.ogg` | The runes are failing. | urgent, strained |
| `hero-runeguard-ult-1.ogg` | Runic Cataclysm! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-runeguard-ult-2.ogg` | Every rune, break! | shouted, full voice |
| `hero-runeguard-ult-3.ogg` | Let the stones speak! | shouted, full voice |
| `hero-runeguard-victory-1.ogg` | It is written. It is done. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-runeguard-victory-2.ogg` | The wards held. | satisfied, a little tired |

### Ranger

**Voice:** dry, wry, cocky. A half-elf marksman who has seen it all and is mildly unimpressed. Deadpan, one eyebrow raised.

- **Age:** late twenties
- **Accent:** light, rural lilt
- **Pacing:** quick and offhand
- **Device-speech fallback:** pitch 1.15, rate 1.05

| File | Line | Delivery |
|---|---|---|
| `hero-ranger-move-1.ogg` ★ | Fine. Scenic route. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-ranger-move-2.ogg` ★ | Moving. Try to keep up. | brisk acknowledgement |
| `hero-ranger-move-3.ogg` ★ | Wind's in my favour. | brisk acknowledgement |
| `hero-ranger-move-4.ogg` ★ | Better angle over there. | brisk acknowledgement |
| `hero-ranger-move-5.ogg` ★ | If I must. | brisk acknowledgement |
| `hero-ranger-move-6.ogg` ★ | Quiver's full. Going. | brisk acknowledgement |
| `hero-ranger-move-7.ogg` ★ | Light on my feet. | brisk acknowledgement |
| `hero-ranger-move-8.ogg` ★ | Sure. Why not. | brisk acknowledgement |
| `hero-ranger-select-1.ogg` ★ | Yes, I'm still here. | *Select (clicked on)* · attentive, in character |
| `hero-ranger-select-2.ogg` ★ | Need something shot? | attentive, in character |
| `hero-ranger-select-3.ogg` ★ | Ranger. Bored. Ready. | attentive, in character |
| `hero-ranger-select-4.ogg` ★ | One arrow, or several? | attentive, in character |
| `hero-ranger-down-1.ogg` | Didn't see that one... | *Down (falls in battle)* · pained, fading out |
| `hero-ranger-down-2.ogg` | Well... that's embarrassing... | pained, fading out |
| `hero-ranger-down-3.ogg` | Missed... my shot... | pained, fading out |
| `hero-ranger-revive-1.ogg` | Right. Where was I? | *Revived* · a breath in, relieved |
| `hero-ranger-revive-2.ogg` | Thanks. Let's pretend that never happened. | a breath in, relieved |
| `hero-ranger-revive-3.ogg` | Back. Eyes up. | a breath in, relieved |
| `hero-ranger-low-1.ogg` | I'd like a healer. Now. | *Low health* · urgent, strained |
| `hero-ranger-low-2.ogg` | Getting a little thin here! | urgent, strained |
| `hero-ranger-low-3.ogg` | Not my finest moment! | urgent, strained |
| `hero-ranger-ult-1.ogg` | Starfall Volley! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-ranger-ult-2.ogg` | Look up! | shouted, full voice |
| `hero-ranger-ult-3.ogg` | Every arrow I've got! | shouted, full voice |
| `hero-ranger-victory-1.ogg` | Clean shots. Mostly mine. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-ranger-victory-2.ogg` | Well. That went better than planned. | satisfied, a little tired |

### Shadowblade

**Voice:** sly, hushed, knowing. A young assassin who half-whispers everything, as if sharing a secret. Never loud, even when fighting.

- **Age:** early twenties
- **Accent:** smooth city voice
- **Pacing:** low, close to the mic, unhurried
- **Device-speech fallback:** pitch 0.95, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `hero-shadowblade-move-1.ogg` | Into the dark. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-shadowblade-move-2.ogg` | Unseen. | brisk acknowledgement |
| `hero-shadowblade-move-3.ogg` | They won't hear me. | brisk acknowledgement |
| `hero-shadowblade-move-4.ogg` | Quietly. | brisk acknowledgement |
| `hero-shadowblade-move-5.ogg` | Already there. | brisk acknowledgement |
| `hero-shadowblade-move-6.ogg` | A shadow moves. | brisk acknowledgement |
| `hero-shadowblade-move-7.ogg` | Hm. Fine. | brisk acknowledgement |
| `hero-shadowblade-move-8.ogg` | Softly now. | brisk acknowledgement |
| `hero-shadowblade-select-1.ogg` | You saw me? Pity. | *Select (clicked on)* · attentive, in character |
| `hero-shadowblade-select-2.ogg` | Who needs to vanish? | attentive, in character |
| `hero-shadowblade-select-3.ogg` | Shh. I'm working. | attentive, in character |
| `hero-shadowblade-select-4.ogg` | Name the throat. | attentive, in character |
| `hero-shadowblade-down-1.ogg` | Should've... stayed hidden... | *Down (falls in battle)* · pained, fading out |
| `hero-shadowblade-down-2.ogg` | Caught... in the light... | pained, fading out |
| `hero-shadowblade-down-3.ogg` | Heh... sloppy... | pained, fading out |
| `hero-shadowblade-revive-1.ogg` | Out of the grave. Again. | *Revived* · a breath in, relieved |
| `hero-shadowblade-revive-2.ogg` | No one saw that. | a breath in, relieved |
| `hero-shadowblade-revive-3.ogg` | Back to the shadows. | a breath in, relieved |
| `hero-shadowblade-low-1.ogg` | I'm bleeding out here. | *Low health* · urgent, strained |
| `hero-shadowblade-low-2.ogg` | Too close. Too close. | urgent, strained |
| `hero-shadowblade-low-3.ogg` | A mend. Quietly. | urgent, strained |
| `hero-shadowblade-ult-1.ogg` | Thousand Cuts. | *Ultimate (shouted as it fires)* · hissed, not shouted |
| `hero-shadowblade-ult-2.ogg` | Don't blink. | shouted, full voice |
| `hero-shadowblade-ult-3.ogg` | You're already cut. | shouted, full voice |
| `hero-shadowblade-victory-1.ogg` | Clean. Quiet. Done. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-shadowblade-victory-2.ogg` | It never saw me. | satisfied, a little tired |

### Pyromancer

**Voice:** fiery, cocky, gleeful. A fire mage who loves an audience and a big explosion. Confident to the point of showing off.

- **Age:** mid twenties
- **Accent:** bright, theatrical
- **Pacing:** fast, eager, rising
- **Device-speech fallback:** pitch 1.25, rate 1.1

| File | Line | Delivery |
|---|---|---|
| `hero-pyromancer-move-1.ogg` ★ | Oh, I'm coming! | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-pyromancer-move-2.ogg` ★ | Make way for the fire! | brisk acknowledgement |
| `hero-pyromancer-move-3.ogg` ★ | Hot on your heels. | brisk acknowledgement |
| `hero-pyromancer-move-4.ogg` ★ | Mind the hat! | brisk acknowledgement |
| `hero-pyromancer-move-5.ogg` ★ | Burning bright. Moving. | brisk acknowledgement |
| `hero-pyromancer-move-6.ogg` ★ | Sparks follow me. | brisk acknowledgement |
| `hero-pyromancer-move-7.ogg` ★ | Keep it warm for me. | brisk acknowledgement |
| `hero-pyromancer-move-8.ogg` ★ | Flame's still lit. | brisk acknowledgement |
| `hero-pyromancer-select-1.ogg` ★ | Something need burning? | *Select (clicked on)* · attentive, in character |
| `hero-pyromancer-select-2.ogg` ★ | You rang? I sparked. | attentive, in character |
| `hero-pyromancer-select-3.ogg` ★ | Pyromancer. Obviously. | attentive, in character |
| `hero-pyromancer-select-4.ogg` ★ | Point. I'll ignite. | attentive, in character |
| `hero-pyromancer-down-1.ogg` | My fire... went out... | *Down (falls in battle)* · pained, fading out |
| `hero-pyromancer-down-2.ogg` | Ugh... embers... | pained, fading out |
| `hero-pyromancer-down-3.ogg` | Not... like this... | pained, fading out |
| `hero-pyromancer-revive-1.ogg` | The flame comes back! | *Revived* · a breath in, relieved |
| `hero-pyromancer-revive-2.ogg` | Rekindled. Thanks. | a breath in, relieved |
| `hero-pyromancer-revive-3.ogg` | Oh, now I'm furious. | a breath in, relieved |
| `hero-pyromancer-low-1.ogg` | I'm getting singed here! | *Low health* · urgent, strained |
| `hero-pyromancer-low-2.ogg` | Heal me before I sputter out! | urgent, strained |
| `hero-pyromancer-low-3.ogg` | Smoke! I need help! | urgent, strained |
| `hero-pyromancer-ult-1.ogg` | Phoenix Dive! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-pyromancer-ult-2.ogg` | Rise from the ash! | shouted, full voice |
| `hero-pyromancer-ult-3.ogg` | Burn with me! | shouted, full voice |
| `hero-pyromancer-victory-1.ogg` | Look at it smoulder. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-pyromancer-victory-2.ogg` | Told you. Fire solves things. | satisfied, a little tired |

### Cleric

**Voice:** calm, kindly, assured. An old priest of dawn with a smile in his voice; a grandfatherly baritone that never panics.

- **Age:** sixties
- **Accent:** warm, rounded, gentle
- **Pacing:** slow, calm, kind
- **Device-speech fallback:** pitch 0.8, rate 0.85

| File | Line | Delivery |
|---|---|---|
| `hero-cleric-move-1.ogg` ★ | Dawn goes with you. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-cleric-move-2.ogg` ★ | Gently. I follow. | brisk acknowledgement |
| `hero-cleric-move-3.ogg` ★ | I'll be near. | brisk acknowledgement |
| `hero-cleric-move-4.ogg` ★ | Walk in the light. | brisk acknowledgement |
| `hero-cleric-move-5.ogg` ★ | As the sun rises. | brisk acknowledgement |
| `hero-cleric-move-6.ogg` ★ | Patience. I'm coming. | brisk acknowledgement |
| `hero-cleric-move-7.ogg` ★ | Of course, friend. | brisk acknowledgement |
| `hero-cleric-move-8.ogg` ★ | The light leads. | brisk acknowledgement |
| `hero-cleric-select-1.ogg` ★ | Peace. How can I help? | *Select (clicked on)* · attentive, in character |
| `hero-cleric-select-2.ogg` ★ | I'm here, child. | attentive, in character |
| `hero-cleric-select-3.ogg` ★ | The dawn is patient. Are you? | attentive, in character |
| `hero-cleric-select-4.ogg` ★ | Speak. I'm listening. | attentive, in character |
| `hero-cleric-down-1.ogg` | Into the dark... I go... | *Down (falls in battle)* · pained, fading out |
| `hero-cleric-down-2.ogg` | The light... dims... | pained, fading out |
| `hero-cleric-down-3.ogg` | Carry on... without me... | pained, fading out |
| `hero-cleric-revive-1.ogg` | Morning, again. Thank you. | *Revived* · a breath in, relieved |
| `hero-cleric-revive-2.ogg` | The light returns. | a breath in, relieved |
| `hero-cleric-revive-3.ogg` | Not my dusk yet. | a breath in, relieved |
| `hero-cleric-low-1.ogg` | Even I need mending. | *Low health* · urgent, strained |
| `hero-cleric-low-2.ogg` | My light is guttering. | urgent, strained |
| `hero-cleric-low-3.ogg` | Help me stand. | urgent, strained |
| `hero-cleric-ult-1.ogg` | Dawn Breaks! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-cleric-ult-2.ogg` | Let there be morning! | shouted, full voice |
| `hero-cleric-ult-3.ogg` | Rise, all of you! | shouted, full voice |
| `hero-cleric-victory-1.ogg` | Rest. The night is over. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-cleric-victory-2.ogg` | Give thanks. We stand. | satisfied, a little tired |

### Grovekeeper

**Voice:** old, gentle, mischievous. A very old druid woman, patient as a tree, who finds most things quietly funny. Calls everyone "dear".

- **Age:** eighties
- **Accent:** soft countryside
- **Pacing:** slow, meandering, a little breathy
- **Device-speech fallback:** pitch 1.1, rate 0.8

| File | Line | Delivery |
|---|---|---|
| `hero-grovekeeper-move-1.ogg` | Slowly, slowly. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-grovekeeper-move-2.ogg` | Roots follow, dear. | brisk acknowledgement |
| `hero-grovekeeper-move-3.ogg` | These old legs, then. | brisk acknowledgement |
| `hero-grovekeeper-move-4.ogg` | As the moss grows. | brisk acknowledgement |
| `hero-grovekeeper-move-5.ogg` | I'll wander over. | brisk acknowledgement |
| `hero-grovekeeper-move-6.ogg` | Mm. The path bends. | brisk acknowledgement |
| `hero-grovekeeper-move-7.ogg` | Yes, little sapling. | brisk acknowledgement |
| `hero-grovekeeper-move-8.ogg` | Leaves on the wind. | brisk acknowledgement |
| `hero-grovekeeper-select-1.ogg` | Hello, little sprout. | *Select (clicked on)* · attentive, in character |
| `hero-grovekeeper-select-2.ogg` | Old as oaks. Still ready. | attentive, in character |
| `hero-grovekeeper-select-3.ogg` | Mm? Something growing? | attentive, in character |
| `hero-grovekeeper-select-4.ogg` | The grove is listening. | attentive, in character |
| `hero-grovekeeper-down-1.ogg` | Back... to the soil... | *Down (falls in battle)* · pained, fading out |
| `hero-grovekeeper-down-2.ogg` | Ah... a long winter... | pained, fading out |
| `hero-grovekeeper-down-3.ogg` | The roots... take me... | pained, fading out |
| `hero-grovekeeper-revive-1.ogg` | Spring again. How lovely. | *Revived* · a breath in, relieved |
| `hero-grovekeeper-revive-2.ogg` | The green returns, dear. | a breath in, relieved |
| `hero-grovekeeper-revive-3.ogg` | Oh, I wasn't done. | a breath in, relieved |
| `hero-grovekeeper-low-1.ogg` | My bark is splitting. | *Low health* · urgent, strained |
| `hero-grovekeeper-low-2.ogg` | Even oaks fall, dear. | urgent, strained |
| `hero-grovekeeper-low-3.ogg` | A little sap, please. | urgent, strained |
| `hero-grovekeeper-ult-1.ogg` | World Tree! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-grovekeeper-ult-2.ogg` | Grow, old friend! | shouted, full voice |
| `hero-grovekeeper-ult-3.ogg` | Shelter beneath me! | shouted, full voice |
| `hero-grovekeeper-victory-1.ogg` | There. Let it compost. | *Victory (after a boss falls)* · chuckling |
| `hero-grovekeeper-victory-2.ogg` | Seasons turn. We remain. | satisfied, a little tired |

### Chronomancer

**Voice:** dry, absent-minded, polite. A bookish time mage who is never quite sure which moment he is in. Mild, distracted, faintly amused.

- **Age:** early thirties
- **Accent:** educated, clipped
- **Pacing:** starts and stops; trails off, then remembers
- **Device-speech fallback:** pitch 1, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `hero-chronomancer-move-1.ogg` | Ah. Yes. Moving. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-chronomancer-move-2.ogg` | I was already there. Later. | brisk acknowledgement |
| `hero-chronomancer-move-3.ogg` | Now. Or shortly. | brisk acknowledgement |
| `hero-chronomancer-move-4.ogg` | Hm? Right, going. | brisk acknowledgement |
| `hero-chronomancer-move-5.ogg` | In due course. | brisk acknowledgement |
| `hero-chronomancer-move-6.ogg` | Time enough. | brisk acknowledgement |
| `hero-chronomancer-move-7.ogg` | Where was I going? Ah. | brisk acknowledgement |
| `hero-chronomancer-move-8.ogg` | Tick, tock. Moving. | brisk acknowledgement |
| `hero-chronomancer-select-1.ogg` | Is it now already? | *Select (clicked on)* · attentive, in character |
| `hero-chronomancer-select-2.ogg` | Chronomancer. Probably. | attentive, in character |
| `hero-chronomancer-select-3.ogg` | Have we met? Ah, yes. | attentive, in character |
| `hero-chronomancer-select-4.ogg` | I've a moment. Several. | attentive, in character |
| `hero-chronomancer-down-1.ogg` | I've... seen this before... | *Down (falls in battle)* · pained, fading out |
| `hero-chronomancer-down-2.ogg` | Ran out... of time... | pained, fading out |
| `hero-chronomancer-down-3.ogg` | Should have... rewound... | pained, fading out |
| `hero-chronomancer-revive-1.ogg` | Ah. That again. | *Revived* · a breath in, relieved |
| `hero-chronomancer-revive-2.ogg` | Back where I was. Roughly. | a breath in, relieved |
| `hero-chronomancer-revive-3.ogg` | Thank you. Again, I think. | a breath in, relieved |
| `hero-chronomancer-low-1.ogg` | My hourglass is low. | *Low health* · urgent, strained |
| `hero-chronomancer-low-2.ogg` | Running out of sand! | urgent, strained |
| `hero-chronomancer-low-3.ogg` | Ah. This bit is bad. | urgent, strained |
| `hero-chronomancer-ult-1.ogg` | Time Reversal! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-chronomancer-ult-2.ogg` | Again, from the top! | shouted, full voice |
| `hero-chronomancer-ult-3.ogg` | Back! All of it, back! | shouted, full voice |
| `hero-chronomancer-victory-1.ogg` | Just as I remembered it. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-chronomancer-victory-2.ogg` | Splendid. Shall we do it again? No. | satisfied, a little tired |

### Thermist

**Voice:** manic, delighted, twitchy. A scientist who treats every explosion as a fascinating result. Thrilled even when it hurts.

- **Age:** early thirties
- **Accent:** quick scholar
- **Pacing:** rapid, breathless, jumps in pitch
- **Device-speech fallback:** pitch 1.3, rate 1.2

| File | Line | Delivery |
|---|---|---|
| `hero-thermist-move-1.ogg` | Yes! New readings! | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-thermist-move-2.ogg` | The data's over there! | brisk acknowledgement |
| `hero-thermist-move-3.ogg` | Ooh, warmer! | brisk acknowledgement |
| `hero-thermist-move-4.ogg` | Hypothesis: over there! | brisk acknowledgement |
| `hero-thermist-move-5.ogg` | Moving! Mind the frost. | brisk acknowledgement |
| `hero-thermist-move-6.ogg` | Recalibrating position! | brisk acknowledgement |
| `hero-thermist-move-7.ogg` | Hot, cold, going! | brisk acknowledgement |
| `hero-thermist-move-8.ogg` | For the experiment! | brisk acknowledgement |
| `hero-thermist-select-1.ogg` | Fascinating! You again! | *Select (clicked on)* · attentive, in character |
| `hero-thermist-select-2.ogg` | What's the temperature? | attentive, in character |
| `hero-thermist-select-3.ogg` | Ready! Mostly stable! | attentive, in character |
| `hero-thermist-select-4.ogg` | Hold still. I am measuring you. | attentive, in character |
| `hero-thermist-down-1.ogg` | Wrong... reading... | *Down (falls in battle)* · pained, fading out |
| `hero-thermist-down-2.ogg` | Too cold... too hot... | pained, fading out |
| `hero-thermist-down-3.ogg` | Note... for later... | pained, fading out |
| `hero-thermist-revive-1.ogg` | Ha! Survived! Write that down! | *Revived* · a breath in, relieved |
| `hero-thermist-revive-2.ogg` | Back to the experiment! | a breath in, relieved |
| `hero-thermist-revive-3.ogg` | Revived! Fascinating! | a breath in, relieved |
| `hero-thermist-low-1.ogg` | Critical! Critical! | *Low health* · urgent, strained |
| `hero-thermist-low-2.ogg` | Readings falling fast! | urgent, strained |
| `hero-thermist-low-3.ogg` | I'm overheating! | urgent, strained |
| `hero-thermist-ult-1.ogg` | Supernova! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-thermist-ult-2.ogg` | Every degree at once! | shouted, full voice |
| `hero-thermist-ult-3.ogg` | Burn and freeze! | shouted, full voice |
| `hero-thermist-victory-1.ogg` | Results conclusive! | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-thermist-victory-2.ogg` | Ha! Magnificent data! | satisfied, a little tired |

### Driftblade

**Voice:** calm, airy, easygoing. A wind duellist who never seems out of breath; a loose, cheerful calm, a smile in the voice.

- **Age:** mid twenties
- **Accent:** easy, coastal
- **Pacing:** relaxed, breathy, light
- **Device-speech fallback:** pitch 1, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `hero-driftblade-move-1.ogg` | With the wind. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-driftblade-move-2.ogg` | Light feet. | brisk acknowledgement |
| `hero-driftblade-move-3.ogg` | Drifting. | brisk acknowledgement |
| `hero-driftblade-move-4.ogg` | The breeze says yes. | brisk acknowledgement |
| `hero-driftblade-move-5.ogg` | Easy. Going. | brisk acknowledgement |
| `hero-driftblade-move-6.ogg` | Gone like a gust. | brisk acknowledgement |
| `hero-driftblade-move-7.ogg` | Mm. That way. | brisk acknowledgement |
| `hero-driftblade-move-8.ogg` | Following the draught. | brisk acknowledgement |
| `hero-driftblade-select-1.ogg` | Breathe. I'm ready. | *Select (clicked on)* · attentive, in character |
| `hero-driftblade-select-2.ogg` | Wind's calm. Are you? | attentive, in character |
| `hero-driftblade-select-3.ogg` | Driftblade, at ease. | attentive, in character |
| `hero-driftblade-select-4.ogg` | Point the sabre. | attentive, in character |
| `hero-driftblade-down-1.ogg` | The wind... stops... | *Down (falls in battle)* · pained, fading out |
| `hero-driftblade-down-2.ogg` | Ha... too slow... | pained, fading out |
| `hero-driftblade-down-3.ogg` | Becalmed... | pained, fading out |
| `hero-driftblade-revive-1.ogg` | The wind picks up. | *Revived* · a breath in, relieved |
| `hero-driftblade-revive-2.ogg` | Breath again. Good. | a breath in, relieved |
| `hero-driftblade-revive-3.ogg` | Back in the current. | a breath in, relieved |
| `hero-driftblade-low-1.ogg` | Short of breath! | *Low health* · urgent, strained |
| `hero-driftblade-low-2.ogg` | I'm faltering. | urgent, strained |
| `hero-driftblade-low-3.ogg` | Need a mend, quickly. | urgent, strained |
| `hero-driftblade-ult-1.ogg` | Eye of the Gale! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-driftblade-ult-2.ogg` | Ride the storm! | shouted, full voice |
| `hero-driftblade-ult-3.ogg` | Be still, and fall. | shouted, full voice |
| `hero-driftblade-victory-1.ogg` | A good duel. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-driftblade-victory-2.ogg` | The wind settles. | satisfied, a little tired |

### Alembist

**Voice:** cheerful, clumsy, upbeat. An alchemist forever one step from spilling something. Sunny, nervous laughter, never gloomy.

- **Age:** late twenties
- **Accent:** bright, chatty
- **Pacing:** quick, a little flustered
- **Device-speech fallback:** pitch 1.35, rate 1.15

| File | Line | Delivery |
|---|---|---|
| `hero-alembist-move-1.ogg` | Coming! Mind the vials! | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-alembist-move-2.ogg` | Oops. Going! | brisk acknowledgement |
| `hero-alembist-move-3.ogg` | Clinking over! | brisk acknowledgement |
| `hero-alembist-move-4.ogg` | Right behind you! Ish. | brisk acknowledgement |
| `hero-alembist-move-5.ogg` | Don't jostle me! | brisk acknowledgement |
| `hero-alembist-move-6.ogg` | Off I bubble! | brisk acknowledgement |
| `hero-alembist-move-7.ogg` | Carefully, carefully! | brisk acknowledgement |
| `hero-alembist-move-8.ogg` | On my way! Probably. | brisk acknowledgement |
| `hero-alembist-select-1.ogg` | Ooh! Need a potion? | *Select (clicked on)* · attentive, in character |
| `hero-alembist-select-2.ogg` | Don't shake me, please. | attentive, in character |
| `hero-alembist-select-3.ogg` | Alembist! Mostly intact! | attentive, in character |
| `hero-alembist-select-4.ogg` | This one's safe. I think. | attentive, in character |
| `hero-alembist-down-1.ogg` | Wrong... bottle... | *Down (falls in battle)* · pained, fading out |
| `hero-alembist-down-2.ogg` | Oh... that's not good... | pained, fading out |
| `hero-alembist-down-3.ogg` | Should've... labelled it... | pained, fading out |
| `hero-alembist-revive-1.ogg` | Ha! Better than any tonic! | *Revived* · a breath in, relieved |
| `hero-alembist-revive-2.ogg` | I'm fine! Mostly! | a breath in, relieved |
| `hero-alembist-revive-3.ogg` | Back! Nothing spilled! | a breath in, relieved |
| `hero-alembist-low-1.ogg` | Ow! Where's my red one? | *Low health* · urgent, strained |
| `hero-alembist-low-2.ogg` | I'm leaking! Help! | urgent, strained |
| `hero-alembist-low-3.ogg` | Not good! Not good! | urgent, strained |
| `hero-alembist-ult-1.ogg` | Magnum Opus! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-alembist-ult-2.ogg` | My masterpiece! | shouted, full voice |
| `hero-alembist-ult-3.ogg` | Everything, all at once! | shouted, full voice |
| `hero-alembist-victory-1.ogg` | Nobody exploded! Lovely! | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-alembist-victory-2.ogg` | Tea, anyone? Real tea. | satisfied, a little tired |

### Gorgemaw

**Voice:** hungry, simple, cheerful. A huge glutton knight who thinks mostly about food. Big, round, friendly voice, a bit slow on the uptake.

- **Age:** fifties
- **Accent:** thick, simple, rustic
- **Pacing:** slow, few words, chewing
- **Device-speech fallback:** pitch 0.55, rate 0.85

| File | Line | Delivery |
|---|---|---|
| `hero-gorgemaw-move-1.ogg` | Food that way? | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-gorgemaw-move-2.ogg` | Mm. Walking. | brisk acknowledgement |
| `hero-gorgemaw-move-3.ogg` | Big steps. | brisk acknowledgement |
| `hero-gorgemaw-move-4.ogg` | Gorgemaw goes. | brisk acknowledgement |
| `hero-gorgemaw-move-5.ogg` | Hungry. Going. | brisk acknowledgement |
| `hero-gorgemaw-move-6.ogg` | Is it lunch there? | brisk acknowledgement |
| `hero-gorgemaw-move-7.ogg` | Chomp, chomp. Coming. | brisk acknowledgement |
| `hero-gorgemaw-move-8.ogg` | Belly first. | brisk acknowledgement |
| `hero-gorgemaw-select-1.ogg` | Is it dinnertime? | *Select (clicked on)* · attentive, in character |
| `hero-gorgemaw-select-2.ogg` | Hungry. | a long, sad rumble |
| `hero-gorgemaw-select-3.ogg` | Gorgemaw here. Food? | attentive, in character |
| `hero-gorgemaw-select-4.ogg` | Mm? Snack? | attentive, in character |
| `hero-gorgemaw-down-1.ogg` | Too... full... | *Down (falls in battle)* · pained, fading out |
| `hero-gorgemaw-down-2.ogg` | No... more... seconds... | pained, fading out |
| `hero-gorgemaw-down-3.ogg` | Belly... hurts... | pained, fading out |
| `hero-gorgemaw-revive-1.ogg` | Hungry again! | *Revived* · a breath in, relieved |
| `hero-gorgemaw-revive-2.ogg` | Up! Still hungry! | a breath in, relieved |
| `hero-gorgemaw-revive-3.ogg` | Mm. More, please. | a breath in, relieved |
| `hero-gorgemaw-low-1.ogg` | Ow! Tummy! | *Low health* · urgent, strained |
| `hero-gorgemaw-low-2.ogg` | Need food! Healing food! | urgent, strained |
| `hero-gorgemaw-low-3.ogg` | Hurts! Hurts! | urgent, strained |
| `hero-gorgemaw-ult-1.ogg` | Maw of Ruin! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-gorgemaw-ult-2.ogg` | Open wide! | shouted, full voice |
| `hero-gorgemaw-ult-3.ogg` | All of it! Mine! | shouted, full voice |
| `hero-gorgemaw-victory-1.ogg` | Was it tasty? Yes. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-gorgemaw-victory-2.ogg` | Leftovers? | satisfied, a little tired |

### Oathbroker

**Voice:** cold, exact, unimpressed. A contract-knight who reads everything as a ledger. Speaks like a notary reading a sentence.

- **Age:** forties
- **Accent:** crisp, formal, cold
- **Pacing:** clipped, precise, no warmth
- **Device-speech fallback:** pitch 0.9, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `hero-oathbroker-move-1.ogg` | Terms accepted. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-oathbroker-move-2.ogg` | Noted. Proceeding. | brisk acknowledgement |
| `hero-oathbroker-move-3.ogg` | Per the agreement. | brisk acknowledgement |
| `hero-oathbroker-move-4.ogg` | Fine. It goes on your bill. | brisk acknowledgement |
| `hero-oathbroker-move-5.ogg` | As contracted. | brisk acknowledgement |
| `hero-oathbroker-move-6.ogg` | I'll collect there. | brisk acknowledgement |
| `hero-oathbroker-move-7.ogg` | Moving. Recorded. | brisk acknowledgement |
| `hero-oathbroker-move-8.ogg` | Signed. Moving. | brisk acknowledgement |
| `hero-oathbroker-select-1.ogg` | State your terms. | *Select (clicked on)* · attentive, in character |
| `hero-oathbroker-select-2.ogg` | Oathbroker. Your account? | attentive, in character |
| `hero-oathbroker-select-3.ogg` | You owe me. Go on. | attentive, in character |
| `hero-oathbroker-select-4.ogg` | I'm listening. It's billed. | attentive, in character |
| `hero-oathbroker-down-1.ogg` | Contract... void... | *Down (falls in battle)* · pained, fading out |
| `hero-oathbroker-down-2.ogg` | Debt... unpaid... | pained, fading out |
| `hero-oathbroker-down-3.ogg` | Default... | pained, fading out |
| `hero-oathbroker-revive-1.ogg` | Reinstated. | *Revived* · a breath in, relieved |
| `hero-oathbroker-revive-2.ogg` | The terms continue. | a breath in, relieved |
| `hero-oathbroker-revive-3.ogg` | Your debt grows. Thank you. | a breath in, relieved |
| `hero-oathbroker-low-1.ogg` | My ledger's in the red. | *Low health* · urgent, strained |
| `hero-oathbroker-low-2.ogg` | Collateral running low. | urgent, strained |
| `hero-oathbroker-low-3.ogg` | Settle my account. Now. | urgent, strained |
| `hero-oathbroker-ult-1.ogg` | Final Reckoning. | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-oathbroker-ult-2.ogg` | All debts come due. | shouted, full voice |
| `hero-oathbroker-ult-3.ogg` | Pay. In full. | shouted, full voice |
| `hero-oathbroker-victory-1.ogg` | Account closed. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-oathbroker-victory-2.ogg` | Paid in full. | satisfied, a little tired |

### Ironpalm

**Voice:** disciplined, humble, grounded. A barefoot monk who has taken many beatings and learned from each. Soft-spoken, steady, never boastful.

- **Age:** late thirties
- **Accent:** quiet, plain
- **Pacing:** calm, breath-led, short
- **Device-speech fallback:** pitch 0.75, rate 0.9

| File | Line | Delivery |
|---|---|---|
| `hero-ironpalm-move-1.ogg` | I go. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-ironpalm-move-2.ogg` | With humility. | brisk acknowledgement |
| `hero-ironpalm-move-3.ogg` | Step by step. | brisk acknowledgement |
| `hero-ironpalm-move-4.ogg` | As the river moves. | brisk acknowledgement |
| `hero-ironpalm-move-5.ogg` | Breath, then step. | brisk acknowledgement |
| `hero-ironpalm-move-6.ogg` | I will walk there. | brisk acknowledgement |
| `hero-ironpalm-move-7.ogg` | Yes, teacher. | brisk acknowledgement |
| `hero-ironpalm-move-8.ogg` | Steady feet. | brisk acknowledgement |
| `hero-ironpalm-select-1.ogg` | I am ready to learn. | *Select (clicked on)* · attentive, in character |
| `hero-ironpalm-select-2.ogg` | My breath is steady. | attentive, in character |
| `hero-ironpalm-select-3.ogg` | Ironpalm. At your service. | attentive, in character |
| `hero-ironpalm-select-4.ogg` | Speak. I am still. | attentive, in character |
| `hero-ironpalm-down-1.ogg` | I... yield... | *Down (falls in battle)* · pained, fading out |
| `hero-ironpalm-down-2.ogg` | The lesson... is learned... | pained, fading out |
| `hero-ironpalm-down-3.ogg` | Breath... leaving... | pained, fading out |
| `hero-ironpalm-revive-1.ogg` | Rise. Again. | *Revived* · a breath in, relieved |
| `hero-ironpalm-revive-2.ogg` | Fall seven times. Rise eight. | a breath in, relieved |
| `hero-ironpalm-revive-3.ogg` | I am grateful. | a breath in, relieved |
| `hero-ironpalm-low-1.ogg` | Breathe. Endure. | *Low health* · urgent, strained |
| `hero-ironpalm-low-2.ogg` | The body falters. | urgent, strained |
| `hero-ironpalm-low-3.ogg` | I need aid. | urgent, strained |
| `hero-ironpalm-ult-1.ogg` | Hundred Palms! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-ironpalm-ult-2.ogg` | Strike with all of me! | shouted, full voice |
| `hero-ironpalm-ult-3.ogg` | One hundred strikes! | shouted, full voice |
| `hero-ironpalm-victory-1.ogg` | Well practised. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-ironpalm-victory-2.ogg` | A good lesson. Thank you. | satisfied, a little tired |

### Threadweaver

**Voice:** quiet, precise, motherly. A seamstress-witch muttering over her work, a needle between her teeth. Gentle, a little wry.

- **Age:** fifties
- **Accent:** dry, quiet, homely
- **Pacing:** soft, unhurried, half to herself
- **Device-speech fallback:** pitch 1.05, rate 0.85

| File | Line | Delivery |
|---|---|---|
| `hero-threadweaver-move-1.ogg` | Mm. A stitch there. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-threadweaver-move-2.ogg` | The thread follows. | brisk acknowledgement |
| `hero-threadweaver-move-3.ogg` | Quietly, dear. | brisk acknowledgement |
| `hero-threadweaver-move-4.ogg` | Needle's ready. | brisk acknowledgement |
| `hero-threadweaver-move-5.ogg` | Pulling through. | brisk acknowledgement |
| `hero-threadweaver-move-6.ogg` | Hem and go. | brisk acknowledgement |
| `hero-threadweaver-move-7.ogg` | I'll mend the way. | brisk acknowledgement |
| `hero-threadweaver-move-8.ogg` | Softly, softly. | brisk acknowledgement |
| `hero-threadweaver-select-1.ogg` | Torn something, dear? | *Select (clicked on)* · attentive, in character |
| `hero-threadweaver-select-2.ogg` | Needle's threaded. | attentive, in character |
| `hero-threadweaver-select-3.ogg` | Quiet now. I'm counting stitches. | attentive, in character |
| `hero-threadweaver-select-4.ogg` | What needs mending? | attentive, in character |
| `hero-threadweaver-down-1.ogg` | The thread... snaps... | *Down (falls in battle)* · pained, fading out |
| `hero-threadweaver-down-2.ogg` | Unravelling... | pained, fading out |
| `hero-threadweaver-down-3.ogg` | Loose... ends... | pained, fading out |
| `hero-threadweaver-revive-1.ogg` | Stitched back up. | *Revived* · a breath in, relieved |
| `hero-threadweaver-revive-2.ogg` | Knotted, and whole. | a breath in, relieved |
| `hero-threadweaver-revive-3.ogg` | Thank you. Neatly done. | a breath in, relieved |
| `hero-threadweaver-low-1.ogg` | I'm fraying. | *Low health* · urgent, strained |
| `hero-threadweaver-low-2.ogg` | Frayed at the seams. | urgent, strained |
| `hero-threadweaver-low-3.ogg` | Pull me together, quick. | urgent, strained |
| `hero-threadweaver-ult-1.ogg` | Grand Loom. | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-threadweaver-ult-2.ogg` | All threads, together. | shouted, full voice |
| `hero-threadweaver-ult-3.ogg` | Weave. | low, commanding |
| `hero-threadweaver-victory-1.ogg` | Neatly finished. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-threadweaver-victory-2.ogg` | Snip. Done. | satisfied, a little tired |

### Gloomsworn

**Voice:** weary, steady, protective. A knight who has died once already and stayed at his post. A low, even voice with something empty behind it.

- **Age:** forties
- **Accent:** low, level, tired
- **Pacing:** slow, deliberate, hollow-voiced
- **Device-speech fallback:** pitch 0.7, rate 0.9

| File | Line | Delivery |
|---|---|---|
| `hero-gloomsworn-move-1.ogg` | I walk the line. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-gloomsworn-move-2.ogg` | The watch moves. | brisk acknowledgement |
| `hero-gloomsworn-move-3.ogg` | Behind me. Quickly. | brisk acknowledgement |
| `hero-gloomsworn-move-4.ogg` | I have been here before. | brisk acknowledgement |
| `hero-gloomsworn-move-5.ogg` | Still standing. Going. | brisk acknowledgement |
| `hero-gloomsworn-move-6.ogg` | Bring it to me. | brisk acknowledgement |
| `hero-gloomsworn-move-7.ogg` | I will not be long. | brisk acknowledgement |
| `hero-gloomsworn-move-8.ogg` | The debt can wait. | brisk acknowledgement |
| `hero-gloomsworn-select-1.ogg` | The watch is kept. | *Select (clicked on)* · attentive, in character |
| `hero-gloomsworn-select-2.ogg` | Gloomsworn. I hold. | attentive, in character |
| `hero-gloomsworn-select-3.ogg` | Who needs guarding? | attentive, in character |
| `hero-gloomsworn-select-4.ogg` | I died once. It did not take. | attentive, in character |
| `hero-gloomsworn-down-1.ogg` | The debt... is paid... | *Down (falls in battle)* · pained, fading out |
| `hero-gloomsworn-down-2.ogg` | Relieve... the watch... | pained, fading out |
| `hero-gloomsworn-down-3.ogg` | Again... so soon... | pained, fading out |
| `hero-gloomsworn-revive-1.ogg` | Not yet. Not yet. | *Revived* · a breath in, relieved |
| `hero-gloomsworn-revive-2.ogg` | The dark gave me back. | a breath in, relieved |
| `hero-gloomsworn-revive-3.ogg` | I am still owed a post. | a breath in, relieved |
| `hero-gloomsworn-low-1.ogg` | Hollow! Heal me, now! | *Low health* · urgent, strained |
| `hero-gloomsworn-low-2.ogg` | The debt is rising! | urgent, strained |
| `hero-gloomsworn-low-3.ogg` | Heal me! I am running out of self! | urgent, strained |
| `hero-gloomsworn-ult-1.ogg` | Eclipse of the Vigil. | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-gloomsworn-ult-2.ogg` | Let the dark pour out. | shouted, full voice |
| `hero-gloomsworn-ult-3.ogg` | Stand in my shadow! | shouted, full voice |
| `hero-gloomsworn-victory-1.ogg` | The watch is relieved. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-gloomsworn-victory-2.ogg` | Dawn. I remember dawn. | satisfied, a little tired |

### Marionettist

**Voice:** theatrical, eerie, playful. A puppeteer who speaks for two: themself and the Doll. Androgynous, unsettlingly sweet, like a stage host in an empty theatre.

- **Age:** ageless, young
- **Accent:** stagey, sing-song
- **Pacing:** theatrical, drawn out, sudden quiet
- **Device-speech fallback:** pitch 1.2, rate 0.9

| File | Line | Delivery |
|---|---|---|
| `hero-marionettist-move-1.ogg` | Exit, stage left. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-marionettist-move-2.ogg` | The Doll insists. | brisk acknowledgement |
| `hero-marionettist-move-3.ogg` | We dance there. | brisk acknowledgement |
| `hero-marionettist-move-4.ogg` | Strings, follow. | brisk acknowledgement |
| `hero-marionettist-move-5.ogg` | A new scene. | brisk acknowledgement |
| `hero-marionettist-move-6.ogg` | Our cue, my dear. | brisk acknowledgement |
| `hero-marionettist-move-7.ogg` | Tiptoe, tiptoe. | brisk acknowledgement |
| `hero-marionettist-move-8.ogg` | Places, everyone. | brisk acknowledgement |
| `hero-marionettist-select-1.ogg` | Applause? For us? | *Select (clicked on)* · attentive, in character |
| `hero-marionettist-select-2.ogg` | The Doll is watching you. | attentive, in character |
| `hero-marionettist-select-3.ogg` | Shall we perform? | attentive, in character |
| `hero-marionettist-select-4.ogg` | She says hello. | a different, tiny voice |
| `hero-marionettist-down-1.ogg` | The curtain... falls... | *Down (falls in battle)* · pained, fading out |
| `hero-marionettist-down-2.ogg` | Cut... the strings... | pained, fading out |
| `hero-marionettist-down-3.ogg` | No... encore... | pained, fading out |
| `hero-marionettist-revive-1.ogg` | Act two! | *Revived* · a breath in, relieved |
| `hero-marionettist-revive-2.ogg` | The show goes on. | a breath in, relieved |
| `hero-marionettist-revive-3.ogg` | Strings, tighten. We rise. | a breath in, relieved |
| `hero-marionettist-low-1.ogg` | The Doll is cracking! | *Low health* · urgent, strained |
| `hero-marionettist-low-2.ogg` | Our act is failing! | urgent, strained |
| `hero-marionettist-low-3.ogg` | Mend us! Both of us! | urgent, strained |
| `hero-marionettist-ult-1.ogg` | Curtain Call! | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-marionettist-ult-2.ogg` | Take a bow! | shouted, full voice |
| `hero-marionettist-ult-3.ogg` | The final act! | shouted, full voice |
| `hero-marionettist-victory-1.ogg` | Bravo. Bravo. | *Victory (after a boss falls)* · slow clap in the voice |
| `hero-marionettist-victory-2.ogg` | And... scene. | satisfied, a little tired |

### Thresher

**Voice:** cheerful, patient, faintly unnerving. A farmer who is also the one who digs the graves, and sees no difference between the two jobs. Warm, chatty, a low fond laugh now and then; she is never cruel and never in a hurry, which is the worst of it.

- **Age:** thirties
- **Accent:** soft, rural, unhurried
- **Pacing:** easy, patient, a pause before the word that matters
- **Device-speech fallback:** pitch 1, rate 0.95

| File | Line | Delivery |
|---|---|---|
| `hero-thresher-move-1.ogg` | Mind the furrows. | *Move (told to go somewhere)* · brisk acknowledgement |
| `hero-thresher-move-2.ogg` | Walking, walking. | brisk acknowledgement |
| `hero-thresher-move-3.ogg` | Lovely day for it. | brisk acknowledgement |
| `hero-thresher-move-4.ogg` | Plenty of time. | brisk acknowledgement |
| `hero-thresher-move-5.ogg` | Another row. | brisk acknowledgement |
| `hero-thresher-move-6.ogg` | Soft ground, this. | brisk acknowledgement |
| `hero-thresher-move-7.ogg` | Just tilling. | brisk acknowledgement |
| `hero-thresher-move-8.ogg` | Round the headland. | brisk acknowledgement |
| `hero-thresher-select-1.ogg` | Morning! Thresher. | *Select (clicked on)* · attentive, in character |
| `hero-thresher-select-2.ogg` | Something here is ripening. | attentive, in character |
| `hero-thresher-select-3.ogg` | I do like a fresh field. | attentive, in character |
| `hero-thresher-select-4.ogg` | Spade is in the cart. | attentive, in character |
| `hero-thresher-down-1.ogg` | Oh... planted me... | *Down (falls in battle)* · pained, fading out |
| `hero-thresher-down-2.ogg` | Cut... down... early... | pained, fading out |
| `hero-thresher-down-3.ogg` | Lovely... soil... | pained, fading out |
| `hero-thresher-revive-1.ogg` | Up again, like wheat. | *Revived* · a breath in, relieved |
| `hero-thresher-revive-2.ogg` | Not in the ground yet. | a breath in, relieved |
| `hero-thresher-revive-3.ogg` | Ha! Wrong season. | a breath in, relieved |
| `hero-thresher-low-1.ogg` | I am going soft! | *Low health* · urgent, strained |
| `hero-thresher-low-2.ogg` | Mend me, I am wilting! | urgent, strained |
| `hero-thresher-low-3.ogg` | Frost! It is frost! | urgent, strained |
| `hero-thresher-ult-1.ogg` | Open the gate. | *Ultimate (shouted as it fires)* · shouted, full voice |
| `hero-thresher-ult-2.ogg` | All at once, then! | shouted, full voice |
| `hero-thresher-ult-3.ogg` | Harvest time! | shouted, full voice |
| `hero-thresher-victory-1.ogg` | Look at that yield. | *Victory (after a boss falls)* · satisfied, a little tired |
| `hero-thresher-victory-2.ogg` | Everything ripens. Everything. | satisfied, a little tired |

★ = in the recommended minimum set.
