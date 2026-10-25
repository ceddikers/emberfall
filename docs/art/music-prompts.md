# Music prompts: menu, town, the bosses, and the short stings

> The copy-paste versions in `music-now.md` are the current ones: from Volkar on, the boss tracks there are faster and more epic than the briefs below.

Instrumental only. The game is dusky low fantasy: warm and a little rustic in town, heavier and darker inside the bosses' halls. Nothing cartoonish, nothing comedic in the melody itself. Each piece is written to loop under a fight or a screen, so the arrangement matters more than a big ending.

## How to use these

- **Two fields on most generators.** Suno-style tools have a short **Style** field (about 120 to 200 characters) and a longer **description / lyrics** field. Each piece below gives both: paste the style line into Style, and the structure block into the lyrics field (the `[Instrumental]` and `[Section]` tags tell it not to sing). For tools with one long box (Udio, ElevenLabs Music and similar), paste the **Full prompt** instead.
- **Always add "no vocals, instrumental"** (already in each prompt). For the Hollow King, a wordless choir is wanted, so that prompt says "wordless choir, no lyrics".
- **Looping.** No generator loops perfectly. Ask for the piece to start and end on the same chord or on a held drone, then trim it in an audio editor to a clean loop point (or crossfade the last 4 seconds into the first 4). Aim for 1:30 to 2:30 per track. Boss tracks come in two parts: a main loop, and a harder variant in the same key. On Normal the game crossfades into it at a bar line late in the fight (the moment is in brackets after each harder variant); on Hard it plays the whole fight.
- **File names** follow `docs/art/sounds.md`: `mus-title`, `mus-town`, `mus-grubnak`, `mus-skitterra`, `mus-volkar`, `mus-hollowking`, `mus-wyrm`, `mus-titan`, `mus-archmage`, `mus-hydra`, `mus-corvane`, `mus-brannoc`, `mus-morrowoak`, `mus-caelum`, `mus-pull`, `mus-victory`, `mus-wipe`. The harder variant adds `-hard` (`mus-grubnak-hard`). Export `.ogg` (or `.mp3`), stereo, 44.1 kHz, about -16 LUFS so nothing is much louder than the rest.
- **Mix note.** Music sits under the telegraph and warning sounds: avoid a constant loud snare or cymbal wash in the top frequencies, and keep the low end tidy so effects stay readable. Each prompt already asks for that.
- **Tempo and key** are given so the main loop and its harder variant can be switched at a bar line without a clash.

---

## 1. Main menu / title (`mus-title`)

**Mood:** slow, warm, a little melancholy. A tavern fire you want to stay beside, before the road gets dangerous. 1:30 to 2:00 loop.

**Style (short):** `cinematic folk fantasy, solo cello and fingerpicked lute, soft pad, slow, wistful, warm, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: a single lute arpeggio over a low drone, 8 bars]
[Theme: cello plays the main melody, slow and tender, lute underneath, 16 bars]
[Development: a soft low whistle or flute joins an octave up, strings swell gently, 16 bars]
[Return: back to cello and lute only, fading to the same drone as the intro, 8 bars]
```

**Full prompt:** Slow, wistful instrumental fantasy folk for a game's title screen, around 68 BPM in D minor. Fingerpicked lute arpeggios over a soft low drone, a warm solo cello carrying a tender, simple melody, a faint low whistle joining in the middle section, gentle string pad underneath. Intimate and hopeful, like the last warm night before a long journey. No drums, no vocals, no electronic sounds. Starts and ends on the same quiet drone so it can loop.

---

## 2. Town (`mus-town`)

**Mood:** gentle, rustic, safe. Quiet enough to talk over. A village green in the evening. 2:00 to 3:00 loop.

**Style (short):** `rustic fantasy village music, acoustic guitar, hammered dulcimer, fiddle, light whistle, relaxed, warm, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: hammered dulcimer plays a gentle repeating figure, 4 bars]
[Theme A: fiddle and tin whistle share a cheerful, unhurried melody over acoustic guitar, 16 bars]
[Theme B: a quieter, more thoughtful phrase on whistle alone, dulcimer and soft upright bass, 16 bars]
[Theme A returns lightly, one voice dropping out each phrase, 16 bars, ends on the same dulcimer figure]
```

**Full prompt:** Relaxed instrumental fantasy village music for a game's home town, around 92 BPM in G major with a dorian twist. Hammered dulcimer and fingerpicked acoustic guitar carry a gentle, unhurried groove, a warm fiddle and a tin whistle trade a friendly melody, light frame drum and soft upright bass underneath. Cosy, rustic and sunny but not busy, quiet enough to hold a conversation over, no strong drum hits, no cymbals, no vocals. A slow-breathing arrangement that ends on the same figure it starts with so it loops without a bump.

---

## 3. Grubnak, the Ogre Chef (`mus-grubnak`, harder variant `mus-grubnak-hard`)

**What it is:** a ruined kitchen ruled by a huge, greasy, boastful ogre chef. Five courses: Appetiser, Mains, Flare-Up, Second Sitting, Dessert, escalating to a stove that is on fire. Rowdy and percussive, built out of kitchen clatter, but menacing and a bit grotesque, not a joke.

**Main loop, Appetiser to Mains (Style):** `rowdy dark-fantasy tavern stomp, tuned pots and pans percussion, heavy stomping drums, tuba, accordion, growling low brass, menacing, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: a slow clanging of pots and a cleaver tapping a rhythm, low tuba pedal, 4 bars]
[Verse: heavy stomp-clap beat, tuba bass line, pots and pans as percussion, accordion plays a lumbering waltz-like melody, 16 bars]
[Chorus: full band, growling trombones, big stomping drums, the melody thicker and meaner, 16 bars]
[Break: only the clanging percussion and bass, tension building, 8 bars]
[Return to Verse, ends on the same clanging pattern as the intro, 16 bars]
```

**Full prompt:** Rowdy, menacing instrumental for a boss fight against a huge ogre chef in a filthy dungeon kitchen, around 112 BPM in E minor. A heavy stomping beat built from kick drum and floor toms with pots, pans, a cleaver on a board and a cast-iron skillet played as percussion, a lumbering tuba bass line, a creaky accordion and growling trombones carrying a heavy, slightly grotesque waltz-like melody that turns mean in the chorus. Greasy, loud and threatening rather than silly, with space in the middle for tension. No vocals, no electronic synths, no cymbal wash. Starts and ends on the same clanging pot rhythm so it loops.

**Harder variant `mus-grubnak-hard` (the burning stove, Second Sitting and Dessert) (Style):** `frantic dark-fantasy kitchen chaos, same key but faster, brass stabs, rushing snare, roaring fire, pots clattering, accelerating, instrumental, no vocals`
Full prompt: the same melody as the main loop in the same key (E minor) and the same rhythmic clanging, but faster at about 140 BPM, with a driving snare, screaming brass stabs, rising string tremolos and a roaring, crackling low noise bed, as if the whole kitchen is on fire and orders are piling up. Frantic but never a wall of noise. No vocals. Ends on the same clanging pattern.

---

## 4. Queen Skitterra, the Broodmother (`mus-skitterra`, harder variant `mus-skitterra-hard`)

**What it is:** a silk-hung cave under the roots, venom and egg sacs, a patient hunter that turns frantic whenever the brood swarms. Tense and creeping.

**Main loop (Style):** `dark ambient horror fantasy, creeping tension, bowed strings harmonics, glass harmonica, soft pulsing low drum, whispers of wind, tense, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: a low drone, dripping water, a slow bowed string harmonic, 8 bars]
[Verse: a quiet heartbeat-like pulse on low drum, pizzicato strings skittering softly, a thin eerie melody on glass harmonica, 16 bars]
[Build: the skittering pizzicato grows more insistent, dissonant strings rise, 8 bars]
[Release: drops back to the drone and the heartbeat, 8 bars, ends on the same drone]
```

**Full prompt:** Creeping, patient dark-fantasy boss music for a giant spider queen in a silk-draped cave, around 100 BPM in F# minor. A deep drone, slow bowed string harmonics, a soft heartbeat-like low drum pulse, skittering pizzicato strings that suggest many small legs, and a thin, eerie melody on glass harmonica or celesta. Quiet but constantly uneasy, with a slowly rising tension that falls back to the drone. No vocals, no heavy drums, no electronic synths. It starts and ends on the same drone so it can loop.

**Harder variant `mus-skitterra-hard` (the swarms and enrage) (Style):** `frantic horror strings, skittering staccato, rising tremolo, dissonant brass hits, fast pulse, panic, instrumental, no vocals`
Full prompt: the same key and drone as the main loop but at about 150 BPM: relentless staccato strings like a swarm, rising tremolo, harsh dissonant brass stabs, a fast driving low drum, and the eerie glass melody screaming high above. Panicked and relentless. No vocals. Ends on the same drone.

---

## 5. Volkar, the Storm Titan (`mus-volkar`, harder variant `mus-volkar-hard`)

**What it is:** a storm peak, a titan of stone and lightning, thunder rolling across a cliff top. Big drums and storm, building through the phases. The most epic of the four.

**Main loop (Style):** `epic dark fantasy storm, huge taiko and war drums, low brass, driving cellos, rolling thunder, soaring horns, powerful, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: distant thunder, a single huge drum hit every two bars, low horn drone, 8 bars]
[Verse: driving ostinato cellos and a steady war-drum pattern, low brass melody, 16 bars]
[Chorus: soaring horns take the theme, taiko doubles the drums, strings surge, 16 bars]
[Bridge: stripped to drums and a rumbling low drone, tension, 8 bars]
[Return: verse again with horns added, ends on the thunder and single drum from the intro, 16 bars]
```

**Full prompt:** Epic, powerful instrumental for a boss fight against a storm titan on a mountain peak in a thunderstorm, around 100 BPM in C minor. Huge taiko and war drums, driving ostinato cellos and basses, low brass melody that rises into soaring heroic horns, rolling thunder and wind as texture, dramatic but not bombastic, leaving room in the mix for sound effects. No vocals, no electric guitars, no electronic dubstep elements. Starts and ends on distant thunder with a single drum hit so it loops.

**Harder variant `mus-volkar-hard` (the final phases, Heavens Fall) (Style):** `intense epic orchestral storm finale, fast war drums, choir-less brass fanfare, relentless strings, lightning crackle, climactic, instrumental, no vocals`
Full prompt: the same theme and key as the main loop but faster, about 128 BPM, with relentless running strings, a pounding drum pattern, a full brass fanfare carrying the melody, rising pitch shifts like a storm breaking, and lightning crackle accents. Climactic, urgent, never silent. No vocals. Ends on the same thunder and drum hit.

---

## 6. The Hollow King (`mus-hollowking`, harder variant `mus-hollowking-hard`)

**What it is:** a barrow, a long burial hall, a dead king in tarnished gold. A funeral march that turns into a war march. Choir, bells, solemn weight.

**Main loop (Style):** `solemn dark fantasy funeral march, wordless choir, tolling bells, low strings, slow timpani, cold, majestic, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: a single tolling bell and a low drone, 4 bars]
[Verse: slow funeral march on muffled timpani and low strings, a wordless male choir sustains long chords, 16 bars]
[Chorus: the choir rises to a mournful melody over a solemn brass chorale, bells ring on every other beat, 16 bars]
[Bridge: only bells and a thin solo violin, cold and sparse, 8 bars]
[Return: the march again, heavier, ends on the single tolling bell and drone, 16 bars]
```

**Full prompt:** Solemn, majestic dark-fantasy boss music for a dead king in his burial hall, around 66 BPM in A minor. A slow funeral march with muffled timpani and low strings, a wordless male and female choir sustaining mournful chords (ahs and oohs only, no words), tolling church bells and low brass chorale, a thin cold solo violin in a sparse middle section. Heavy, ceremonial and haunted, not horror-jumpy. No lyrics, no electronic sounds. Starts and ends on a single tolling bell over a drone so it loops.

**Harder variant `mus-hollowking-hard` (the war march, after Royal Doom) (Style):** `dark fantasy war march, wordless choir, pounding timpani and snare, brass fanfare, bells, relentless, majestic, instrumental, no lyrics`
Full prompt: the same theme and key as the main loop but turned into a war march at about 108 BPM: snare and timpani marching, a defiant brass fanfare carrying the melody, the choir now loud and fierce (wordless), bells in the rhythm, relentless and grand. No lyrics. Ends on the single tolling bell.

---

## 6b. Hrimgar, the Frost Titan (set 2, `mus-titan`, harder variant `mus-titan-hard`)

**What it is:** a glacier plateau under the aurora; a slow giant, the ice itself the enemy. Deep choir drone, glacial bells, giant footfalls, built in layers of ice-crack percussion. Mood: pale blue, white, aurora green and violet.

**Main loop (Style):** `dark fantasy glacial boss theme, deep male choir drone, glacial bells and glass harmonics, slow giant footfall drums, low cello, ice cracking percussion, cold, vast, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: a deep choir drone and a single glacial bell, wind, 4 bars]
[Verse: slow giant footfalls on huge frame drums, a low cello figure, the choir holding long open fifths, 16 bars]
[Chorus: the choir rises over bells and glass harmonics, an ice-crack percussion layer (cracking ice, struck frozen metal) enters on every other beat, 16 bars]
[Bridge: only the drone, bells and a distant wordless female voice like the aurora, 8 bars]
[Return: the footfalls again, one more layer of ice-crack percussion, ends on the bell and the drone, 16 bars]
```

**Full prompt:** Vast, cold dark-fantasy boss music for a frost giant on a glacier under the northern lights, around 60 BPM in D minor. A deep wordless male choir drone on open fifths, giant slow footfalls on frame drums, a low solo cello, glacial bells and glass-harmonica shimmer, and a percussion layer of cracking ice and struck frozen metal that grows a layer at a time as the piece goes on. A sparse middle with a distant wordless female voice over the drone. Heavy, patient, awe rather than fury. No lyrics, no electronic sounds. Starts and ends on a single bell over the drone so it loops.

**Harder variant `mus-titan-hard` (the Long Night onward) (Style):** `dark fantasy glacial war theme, deep choir, pounding frame drums, ice cracking percussion, rising brass, avalanche rumble, relentless, instrumental, no lyrics`
Full prompt: the same theme and key at about 96 BPM: the footfalls become a march, brass carries the melody over a loud fierce wordless choir, ice-crack percussion on every beat, a low avalanche rumble underneath that swells at the end of each phrase. Ends on the single bell.

---

## 6c. The Hydra of the Drowned Temple (set 2, `mus-hydra`, harder variant `mus-hydra-hard`)

**What it is:** a flooded temple, black water, brass and moss, a pool with a gold sheen and a many-headed thing in it. Drums and a low choir, with a head-count layer: each head that rises adds an instrument, so the music thickens as the fight grows from three heads to nine. Dark, wet, ritual; menacing rather than epic.

**Main loop (Style):** `dark ritual fantasy, deep frame drums, low wordless choir, bowed bass, water drips and bubbles, brass drones, slow, layered, ominous, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: water drips over a low brass drone, one frame drum every two bars, 8 bars]
[Three heads: slow frame-drum pulse, bowed bass, low wordless choir holding a fifth, 16 bars]
[Six heads: add a hand drum counter-rhythm, bowed cellos on a rising figure, 16 bars]
[Submerge: everything drops to a bubbling drone and a heartbeat, 8 bars]
[Nine heads: all layers at once, brass stabs, choir opens to a full chord, bells, 16 bars]
[Return: back to the intro drone and a single drum, 8 bars]
```

**Full prompt:** Slow, dark, ritual instrumental for a boss fight against a many-headed hydra in a flooded temple, around 84 BPM in D minor. Deep frame drums, bowed double bass and cellos, a low wordless choir (oohs only), brass drones, water drips and bubbling as texture, bronze bells. Build it in layers: begin with drums and drone, then add a new instrument every sixteen bars so the music gains one voice per head, down to a sudden stripped bubbling heartbeat in the middle and a full thick return. Menacing, wet, never cheerful, leaving room in the mix for sound effects. No lyrics, no electric guitars, no electronic elements. Starts and ends on the water drip over the low drone so it loops.

**Harder variant `mus-hydra-hard` (the last acts, the Mother's Heart) (Style):** `intense dark ritual orchestral finale, pounding frame drums, choir chords, brass stabs, heartbeat bass, relentless strings, instrumental, no lyrics`
Full prompt: the same theme and key but faster, about 112 BPM, with a pounding drum pattern, a thick wordless choir on rising chords, brass stabs on every strike, a heartbeat in the low bass, and tolling bells. Climactic, urgent, never silent. No lyrics. Ends on the same water drip and drum hit.

---

## 6d. Azerath, the Sunken Archmage (set 2, `mus-archmage`, harder variant `mus-archmage-hard`)

**What it is:** a drowned mage's tower, deep teal stone under standing water, seven circles of old spellwork glowing in four elements. Arcane strings and a wordless choir, with one motif that modulates by element: it is heard in four keys through the fight (fire, frost, lightning, void), and an electric undertone runs under the whole piece. Mood: deep teal, with orange, pale blue, yellow and violet each in its turn. Learned, ceremonial, a little sad; menacing rather than epic.

**Main loop (Style):** `dark fantasy arcane boss theme, legato string ensemble, wordless chamber choir, harp and celesta arpeggios, low pipe organ drone, glass harmonica, subtle electric hum, modal, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: water drips over a low organ drone and a glass harmonica, the four-note motif once in the celesta, 8 bars]
[Fire: the motif in the cellos in D minor, harp arpeggios, a low war drum on the beat, 16 bars]
[Frost: the same motif a tone up in high strings and glass harmonica, sparse, bells, 16 bars]
[Lightning: the motif in staccato violins, a crackling electric texture under it, the choir on short stabs, 16 bars]
[Binding: only the choir and the organ, the motif passing from instrument to instrument, 8 bars]
[Void: the motif low in a bass clarinet and contrabass, the choir sliding downward, 16 bars]
[Return: the intro drone, the motif once, ends on the glass harmonica, 8 bars]
```

**Full prompt:** Learned, ceremonial dark-fantasy boss music for a drowned archmage's tower, around 76 BPM in D minor. A single short four-note motif is carried by different instruments and moves to a new key for each element: low cellos for fire, high strings and glass harmonica for frost, staccato violins over a faint crackling electric hum for lightning, bass clarinet and contrabass for the void. A wordless chamber choir, harp and celesta arpeggios, a low pipe organ drone, water drips as texture. A short stripped passage of choir and organ in the middle where the motif is handed from voice to voice. Eerie and dignified, a little sad, never cheerful, leaving room in the mix for sound effects. No lyrics, no guitars, no synth leads. Starts and ends on the water drip over the organ drone so it loops.

**Harder variant `mus-archmage-hard` (the last acts, the Convergence) (Style):** `intense dark arcane orchestral finale, driving strings ostinato, full choir chords, brass stabs, pipe organ, electric crackle, relentless, instrumental, no lyrics`
Full prompt: the same motif and key at about 108 BPM: a driving string ostinato, a full wordless choir on rising chords, brass stabs on every strike, the organ opened wide, and all four element colours of the motif played at once in different registers, with an electric crackle through the top. Climactic, urgent, never silent. No lyrics. Ends on the same water drip and organ chord.

---

## 6e. Vhalgrath, the Ember Wyrm (set 2, `mus-wyrm`, harder variant `mus-wyrm-hard`)

**What it is:** a volcanic crater high in the Cinder Peaks: black rock, ash on the wind, the glow of lava under everything, and a tyrant dragon who owns the sky above it. The one boss with no choir: war drums and brass carry it. Two moods trade places through the piece, a heavy stomping weight on the ground and a wide soaring horn theme overhead. Mood: ember orange, ash grey, black.

**Main loop (Style):** `dark fantasy dragon boss theme, heavy war drums, low brass ostinato, soaring French horn melody, anvil hits, string tremolo, volcanic rumble, fiery, instrumental, no vocals`

**Structure block:**
```
[Instrumental]
[Intro: a low volcanic rumble and crackling embers, one distant horn call, 4 bars]
[Ground: heavy war drums in a slow stomping pattern, a low brass ostinato, an anvil strike on every fourth beat, 16 bars]
[Sky: the drums drop to rolling timpani under string tremolo, a wide soaring French horn melody over rushing wind, 16 bars]
[Ground: the stomp returns heavier, a brass rip like a roar at the end of each phrase, 16 bars]
[Smoulder: only the rumble, a low bowed bass and crackling embers, 8 bars]
[Return: the horn call over the stomp, ends on the volcanic rumble, 8 bars]
```

**Full prompt:** Heavy, fiery dark-fantasy boss music for a tyrant dragon in a volcanic crater, around 92 BPM in C minor. Big low war drums in a slow stomping pattern, a low brass ostinato of horns, trombones and tuba, anvil strikes, string tremolo, and a wide, soaring French horn melody that takes over in the middle as if the music has left the ground. Brass rips like a roar close the phrases. A volcanic rumble and crackling embers as texture, and a short stripped smouldering passage of rumble and bowed bass. Menacing and grand, hot rather than cold, leaving room in the mix for sound effects. No choir, no vocals, no electric guitars, no electronic sounds. Starts and ends on the volcanic rumble so it loops.

**Harder variant `mus-wyrm-hard` (the last quarter of the fight) (Style):** `furious dark fantasy dragon battle theme, fast war drums, roaring brass rips, soaring horns, driving string ostinato, anvil hits, volcanic rumble, relentless, instrumental, no vocals`
Full prompt: the same theme and key at about 120 BPM: the stomp becomes a gallop on the war drums, a driving string ostinato underneath, the soaring horn melody now carried by the full brass section, roaring brass rips on every phrase, anvils on the off-beats, and the volcanic rumble swelling at the end of each phrase. Furious and climactic, never silent. No vocals. Ends on the same volcanic rumble.

---

## 6f. Corvane, the Unburied Blade (set 3, `mus-corvane`, harder variant `mus-corvane-hard`)

**What it is:** a mountain pass at night in deep snow, a ruined shrine and a row of stone lanterns, and one dead guard who has stood there since before anyone remembers. A lone duellist, not an army: the music starts almost empty and builds as slowly as the Whetstone fills, with a long melody for a solo shakuhachi flute that is his stance, and a quiet shimmer of silver bells under the Hundredfold Parting. Nothing hurries until it must. Mood: moonlit blue-grey, black lacquer, snow white, one amber lantern.

**Main loop (Style):** `cold cinematic duel boss theme, solo shakuhachi flute melody, low taiko and frame drums, sparse koto and harp plucks, bowed cello drone, frost bells, slow build, wordless choir only at the peak, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: wind over snow, a single bowed cello drone, one frost bell, 4 bars]
[Stance: a lone shakuhachi plays a slow, proud, stern melody, sparse harp plucks between its phrases, 16 bars]
[Verse: one low taiko hit on every other bar, the cello walking underneath, the melody a little higher, 16 bars]
[Sharpening: strings enter in long rising lines, a rim-struck metal tick on the beat like a whetstone, the taiko doubles, 16 bars]
[Bridge: only the drone and a shimmering run of silver bells like afterimages, quiet, 8 bars]
[Climax: the melody in full strings and a wordless choir over hard taiko, one long crescendo, 16 bars]
[Return: the shakuhachi alone, ends on the cello drone and one bell, 8 bars]
```

**Full prompt:** Cold, restrained cinematic boss music for a lone undead swordsman in a snowy mountain pass at night, around 84 BPM in E minor. It begins almost empty: wind over snow, a bowed cello drone and one frost bell, then a solo shakuhachi flute plays a slow, proud, stern melody with sparse koto and harp plucks between its phrases. Low taiko enters one hit every other bar and doubles as the piece sharpens; long rising string lines join, with a rim-struck metal tick on the beat like a blade on a whetstone. A quiet middle where only the drone and a shimmer of silver bells remain, then the melody returns in full strings with a wordless choir over hard taiko for one long crescendo, and falls back to the flute alone. Solemn and tense, never cheerful, never a wall of sound, leaving room in the mix for sound effects. No lyrics (the choir is wordless oohs), no electric guitars, no synth leads. Starts and ends on the cello drone and one bell so it loops.

**Harder variant `mus-corvane-hard` (the last quarter of the fight; the whole fight on Hard) (Style):** `relentless cinematic duel finale, driving taiko, racing strings, fierce wordless choir, shakuhachi and brass carrying the melody, metallic ticks like a whetstone, silver bell runs, urgent, instrumental, no lyrics`
Full prompt: the same melody and key at about 126 BPM: the taiko drives on every strike, strings race underneath, the shakuhachi doubled by brass carrying the melody, a fierce wordless choir on rising chords and the whetstone tick on every beat. One sudden stop in the middle where only the drone and the silver bell runs remain, then everything returns a step higher. Urgent and climactic, never silent. No lyrics. Ends on the same cello drone and one bell.

---

## 6g. Brannoc the Undefeated (set 3, `mus-brannoc`, second half `mus-brannoc-hard`)

**What it is:** two moods in one fight, and the music turns with The Tide Rises. First a drowned colosseum: bright, brassy and proud, a champion's fanfare over war drums with a ghost crowd chanting and stamping in the stands, a laughing showman who is also very old and very sad. Then the sea: the same tune, slowed to a crawl in low brass and a tolling bell, deep surf and a wordless choir of low voices, a titan standing in open water under a falling star. Mood: sun-bleached sand, bronze and gold, red banner cloth, then wet teal, drowned stone, storm grey.

**How the two halves are played (this fits the music system as it is, with one small change).** The game already has a main track and a `-hard` track in the same key, and `LAYER_AT` in `client/js/sound-hooks.js` crossfades from one to the other on the next bar line, starting the second at the same position in time as the first (`Sound.music.layer`). For Brannoc that crossfade is the turn: `mus-brannoc` is the arena half and plays from the pull; `mus-brannoc-hard` is the sea half and is layered in when the Tide Rises begins (the fight's act 3: `brannoc: 3` in `LAYER_AT`). So `-hard` here means "the second half", not "the harder fight", and the two files must be built as a pair:

- **Same key, same tempo and the same length** (64 bars at 112 BPM is 2:17), so the bar-line crossfade lands clean. The sea half is in half-time (the drums hit every other beat, the harmony moves every two bars), which is slower in feel on the same bar grid.
- **Same section order and the same melody.** The sea half plays the arena's tune in low brass and bells, so the champion and the titan are one theme. Because the second file starts where the first happens to be, every section of the sea half must stand alone; none may depend on a quiet intro before it.
- **The first beat of every section in the sea half is a swell of surf**, so a short crossfade is covered by water and never sounds like a cut. The arena half's sections end on a drum hit, not a long tail, for the same reason.
- **One gap to close in code:** the system keeps Hard on its `-hard` file from the pull (`bossTrack` and the `!/-hard$/` guard in `phase`). For Brannoc both difficulties must start on `mus-brannoc` and layer into `mus-brannoc-hard` at the Tide Rises, or Hard's first half would play the sea music. Hard's pace comes from the fight, not the music.

**Arena half, main loop (Style):** `heroic gladiator boss theme, brass fanfare melody, big war drums, stamping crowd, wordless ghostly crowd chant, brass stabs, tambourine and shaker, bronze bell, swaggering, proud, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Intro: a murmuring crowd far off, torch crackle, one war drum, a bronze bell, 4 bars]
[Fanfare: the champion's melody on solo trumpet with snare and stamping feet, a confident swagger, 12 bars]
[Crowd: the ghost crowd chants wordless on the off-beat, war drums lock in, the melody in horns, 16 bars]
[Showboat: brass stabs and a rolling snare, the melody tossed between trumpets and trombones, 12 bars]
[Hush: only the drum, the crowd's stamping and one sad solo horn, like a memory of a living crowd, 8 bars]
[Climax: the melody in full brass over war drums and the crowd at full height, a step higher in the last 4 bars, 12 bars]
```
(64 bars. It ends on a drum hit and the crowd's last stamp, and starts on the murmur, so it loops.)

**Full prompt:** Proud, swaggering cinematic gladiator boss music for a laughing pit-fighter in a drowned colosseum, around 112 BPM in D minor. It begins with a distant crowd murmuring, torch crackle, one war drum and a bronze bell, then a solo trumpet states a bold, showy champion's melody over snare and stamping feet. War drums lock in, a ghostly wordless crowd chants on the off-beat and stamps in the stands, and the melody passes to horns and trombones with brass stabs and a rolling snare. A quieter middle where only a drum, the stamping and one sad solo horn remain, as if remembering a living crowd, then the whole melody in full brass over the war drums and the full crowd, rising a step in the last four bars. Heroic with a hollow ache under it, never a joke, never cheerful pop, leaving room in the mix for sound effects. No lyrics (the crowd is wordless), no electric guitars, no synth leads. Starts and ends on the crowd murmur and a drum so it loops.

**Sea half `mus-brannoc-hard` (layered in when the Tide Rises begins; the whole second half of the fight) (Style):** `vast dark orchestral sea titan boss theme, deep ocean surf, slow low brass, tolling great bell, wordless low male choir, huge slow drums, rising swells, drowned, mournful and immense, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Surf: a heavy swell of surf and one tolling bell, then a low brass drone, 4 bars]
[Fanfare: the champion's melody now in slow low tubas and trombones, half the speed, a huge drum on every other bar, 12 bars]
[Crowd: the stamping crowd has become distant surf, a wordless low male choir sings the chant very slowly under the brass, 16 bars]
[Showboat: the brass stabs become great slow chords, the bell tolls every two bars, the melody in cellos and horns, 12 bars]
[Hush: only deep surf, the bell and one lone horn far away, 8 bars]
[Climax: the melody in full low brass and choir over booming drums, waves breaking on every phrase, a step higher in the last 4 bars, 12 bars]
```
(64 bars, same grid as the arena half. Each section opens on a swell of surf. It ends on surf and one bell so it loops.)

**Full prompt:** The same melody and key as the arena theme, now for a colossal sea-titan standing in open water under a falling star, around 112 BPM in D minor but felt as half-time, so it moves at half the speed: the drums hit every other beat, the harmony changes every two bars. Every section opens on a heavy swell of surf. The champion's tune is played slow and huge in low tubas, trombones and cellos, a wordless choir of low male voices sings the old crowd chant very slowly underneath, as if the crowd had drowned and was still singing, and a great bell tolls every two bars. A quiet middle of deep surf, the bell and one lone horn far away, then the whole melody in full low brass and choir over booming drums, with waves breaking on every phrase and rising a step in the last four bars. Immense, mournful and relentless, never silent, never cheerful, leaving room in the mix for sound effects. No lyrics, no electric guitars, no synth leads. Starts and ends on deep surf and one bell so it loops.

If a take of either half turns into pop, anime rock or EDM, add `no pop, no EDM, no guitar`. If the sea half is not slow enough, add `half-time feel, slow heavy drums`. If the arena half is too silly, add `serious, tragic undertone, no comedy`.

---

## 6h. Morrow-Oak, the Starved Grove (set 3, `mus-morrowoak`, second half `mus-morrowoak-hard`)

**What it is:** two moods in one fight, and the music turns when the Grove Remade begins. First a dead grove on the crater's rim: an ancient, creaking dread, an old thing that has been patient for a very long time, with the Hunger under everything as a drone that does not sit still but pulls inward, as if the whole piece were being slowly inhaled. Then the remade grove: the same tune grown huge and wrong, floating over the dark, with echoes of the four set 1 monsters he swallowed bent through it like voices from inside the tree. Mood: scorched brown earth, grey bark, a few dead gold leaves, then black-violet with a bright violet rim.

**How the two halves are played (the same system as Brannoc's, already in the code).** `TURN` and `LAYER_AT` in `client/js/sound-hooks.js` already list `morrowoak`: both difficulties start on `mus-morrowoak` and crossfade into `mus-morrowoak-hard` on the next bar line when the Grove Remade begins (`morrowoak: 3`), starting the second at the same position in time as the first. So `-hard` here means "the second half", not "the harder fight" (Hard's pace comes from the fight, not the music), and the two files must be built as a pair:

- **Same key, same tempo, same bar count** (48 bars at 80 BPM is 2:24), so the bar-line crossfade lands clean. The remade half does not change tempo: it is the same tune made larger, lower and wronger, not faster.
- **Same section order and the same melody.** The first half states the tune thin and hollow on a few low instruments; the second plays that same tune huge, doubled an octave down, with the intervals bent. Because the second file starts wherever the first happens to be, every section of it must stand alone; none may depend on a quiet intro before it.
- **The first beat of every section in the remade half is a long inward rush**, a breath of air and leaves being drawn into a dark mouth, with the low drone dropping a step under it, so a short crossfade is covered by the Hunger and never sounds like a cut. The first half's sections end on a dry wooden knock, not a long tail, for the same reason.

**First half, the dead grove, main loop (Style):** `ancient dark fantasy dead forest boss theme, creaking wood, slow bowed double basses and cellos, wooden log drums and hollow knocks, hollow wordless choir, low drone pulling inward, bare bone chimes, patient and dreadful, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Roots: creaking wood and a dry wind through dead leaves, a deep bowed drone that slides slowly down and back up like a long breath, one wooden knock, 4 bars]
[Grove: the old tune on a solo bass clarinet and low cellos, very slow, log drums answering on the off-beat, a hollow knock on every bar, 12 bars]
[Hunger: a wordless hollow choir sings the tune in bare open fifths, the drone sinks lower and pulls inward, strings creep in on long bowed notes, 12 bars]
[Hush: only the creaking, one lone bone chime and the drone drawing in, the log drums stop, 8 bars]
[Bloom: the tune in full low strings and horns with the choir, log drums at full weight, the whole piece leaning inward, a step higher in the last 4 bars, 12 bars]
```
(48 bars. It ends on a wooden knock and starts on the creak and the wind, so it loops.)

**Full prompt:** Ancient, creaking, dreadful cinematic boss music for a huge dead tree in a scorched grove, around 80 BPM in A minor. It begins with the creak of old wood, a dry wind through dead leaves, a deep bowed drone that slowly slides down and back up like a long breath, and one wooden knock. A solo bass clarinet and low cellos play a slow, patient, hollow melody while log drums and hollow wooden knocks answer on the off-beats. A wordless hollow choir takes the tune in bare open fifths as the drone sinks lower and seems to pull everything inward, with strings creeping in on long bowed notes. A quiet middle of creaking, one bone chime and the drawn-in drone, then the whole melody in full low strings, horns and choir over heavy log drums, rising a step in the last four bars. Patient and heavy, never fast, never heroic, never a wall of sound, leaving room in the mix for sound effects. No lyrics (the choir is wordless), no electric guitars, no synth leads. Starts and ends on the creak and the drone so it loops.

**Remade half `mus-morrowoak-hard` (crossfaded in when the Grove Remade begins; the whole second half of the fight) (Style):** `colossal dark fantasy floating forest boss theme, the same slow melody huge and distorted, deep bowed basses, tuba and trombones, full dark male choir, booming log drums, warped echoes of old boss themes, bending drone, immense, wrong, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Roots: a long inward rush of air and leaves, the drone drops a step and bends, one huge wooden boom, 4 bars]
[Grove: the old tune now in tubas and trombones an octave down, a few of its notes bent flat, the log drums enormous on every other bar, a clanging cleaver and pot-lid far off like a warped kitchen, 12 bars]
[Hunger: the choir is full and dark and sings the tune in thick clusters, the drone pulls inward harder, a skittering col legno chitter and hissing strings run underneath like legs and silk, 12 bars]
[Hush: only the drone bending, a slow bell tolling like a grave-lantern and a hollow choir far away, a low rumble of thunder, 8 bars]
[Bloom: the tune in full low brass, strings and choir, every earlier voice at once and warped (the cleaver, the chitter, the thunder, the bell), booming drums, a step higher in the last 4 bars, 12 bars]
```
(48 bars, same grid as the first half. Each section opens on the inward rush. It ends on the bending drone and one wooden knock so it loops.)

**Full prompt:** The same melody and key as the grove theme, now for a gigantic remade tree floating in a violet dark, around 80 BPM in A minor, the same tempo but everything larger, lower and wrong. Every section opens on a long inward rush of air and leaves, with the drone dropping a step beneath it. The old tune is played huge in tubas, trombones and deep bowed basses, a few notes bent out of tune, over enormous log drums on every other bar. A full, dark, wordless male choir sings it in thick clusters as the drone pulls harder inward. Echoes of the four monsters the tree swallowed bend through it like voices from inside the trunk: a far-off clanging cleaver and pot-lid, a skittering chitter of strings and hissing silk, rolling thunder, a slow tolling grave-lantern bell. A quiet middle of only the bending drone, the bell and a hollow far-off choir, then the whole melody in full low brass, strings and choir with every one of those echoes at once and warped, over booming drums, rising a step in the last four bars. Immense, wrong and relentless, never silent, never cheerful, leaving room in the mix for sound effects. No lyrics, no electric guitars, no synth leads. Starts and ends on the bending drone and one wooden knock so it loops.

If a take of either half turns into pop, anime rock or EDM, add `no pop, no EDM, no guitar`. If the first half is too busy, add `sparse, slow, lots of space between phrases`. If the second half is not wrong enough, add `distorted, detuned, warped, uncanny`; if it speeds up, add `same slow tempo, heavy and slow`.

---

## 6i. Caelum Vey, the Starborn (set 3, `mus-caelum`, second half `mus-caelum-hard`)

**What it is:** the end of the set, and two moods in one fight. First a cold, still, precise duel on the crater floor under a falling sky: a calm swordsman who never hurries, one high pure voice (a solo violin in harmonics, or a glass harmonica) over low pulses, sparse percussion like single sword-strikes, and the meteor as a drone that rises, very slowly, the whole way through. Then the Ascendant, above the clouds: the same tune turned to choir, a full wordless choir and orchestra, vast and bright, the meteor's roar rolling underneath it. The first half is the one he is; the second is what the star made of him. Mood: black glass, silver light, deep night violet, an orange-red fire far below, then cloud and white gold.

**How the two halves are played (the same system as Brannoc's and Morrow-Oak's).** `TURN` and `LAYER_AT` in `client/js/sound-hooks.js` list `caelum` (the code agent is setting this up beside these prompts): both difficulties start on `mus-caelum` and crossfade into `mus-caelum-hard` on the next bar line when the Ascendant begins (`caelum: 3`, the fight's act 3), starting the second at the same position in time as the first. So `-hard` here means "the second half", not "the harder fight" (Hard's pace comes from the fight, not the music), and the two files must be built as a pair:

- **Same key, same tempo, same bar count** (48 bars at 88 BPM is 2:11), so the bar-line crossfade lands clean. The second half does not change tempo: it is the same tune made larger and brighter, not faster.
- **Same section order and the same melody.** The first half states the tune thin and cold on one high voice, then lets it echo; the second plays that same tune in a full choir with the echoes as other choirs answering one bar late. Because the second file starts wherever the first happens to be, every section of it must stand alone; none may depend on a quiet intro before it.
- **The first beat of every section in the Ascendant half is a rising swell of the meteor's roar**, a rush of fire and air climbing under a held chord, so a short crossfade is covered by the sky and never sounds like a cut. The first half's sections end on a single struck-blade hit (a bright metal strike with a short decay), not a long tail, for the same reason.
- **No cymbal wash or constant high percussion in either half**: the strikes are single and spaced, so the telegraph sounds stay readable.

**First half, the duel under the falling sky, main loop (Style):** `cold cinematic duel boss theme, solo violin harmonics and glass harmonica melody, low pulsing cellos, sparse single sword-strike percussion, tuned glass chimes, deep rising drone like a distant falling meteor, still, precise, restrained, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Fall: a very low drone that begins to climb, a long way off like a meteor falling, one pure glass-harmonica note, one struck blade, 4 bars]
[Duel: a solo violin in harmonics (or a glass harmonica) states a calm, cold, exact melody, low cello pulses underneath, a single sword-strike on the first beat of every other bar, 12 bars]
[Afterimages: the tune is answered one bar late by a fainter echo an octave higher on tuned glass, then a third fainter still, the pulses quicken, chimes fall like shards, 12 bars]
[Hush: only the drone, one held glass note and a single blade strike, the tune stops, 8 bars]
[Sky: the tune in full strings in unison, the pulses at full weight, a blade strike on every bar, the drone at its highest, a step higher in the last 4 bars, 12 bars]
```
(48 bars. It ends on a single blade strike and starts on the low drone, so it loops.)

**Full prompt:** Cold, still, precise cinematic boss music for a calm swordsman duelling beneath a falling meteor, around 88 BPM in F-sharp minor. It begins with a very low drone that starts to climb, far off, like a meteor falling, one pure glass-harmonica note and one struck blade. A solo violin in harmonics, or a glass harmonica, states a calm, cold, exact melody over low pulsing cellos, with a single sword-strike on the first beat of every other bar and no other percussion. The tune is then answered one bar late by a fainter echo an octave higher on tuned glass, and a third fainter still, like afterimages, while the pulses quicken and chimes fall like shards. A quiet middle of only the drone, one held glass note and a single strike, then the tune in full strings in unison over the pulses, a blade strike on every bar, the drone at its highest, rising a step in the last four bars. Restrained and exact, never frantic, never heroic, never a wall of sound, leaving room in the mix for sound effects. No lyrics, no vocals, no electric guitars, no synth leads, no cymbal wash. Starts and ends on the low drone and a single blade strike so it loops.

**Ascendant half `mus-caelum-hard` (crossfaded in when the Ascendant begins; the whole second half of the fight) (Style):** `vast bright epic fantasy finale boss theme, the same melody in a full wordless choir and orchestra, soaring high strings, brass, tuned bells, the roar of a falling meteor beneath, huge deep drums, sparse single anvil strikes, above the clouds, radiant, immense, instrumental, no lyrics`

**Structure block:**
```
[Instrumental]
[Fall: a rising roar of fire and air under a held bright chord, the drone climbing under it, one huge struck blade, 4 bars]
[Duel: the tune now sung by a full wordless choir over strings, horns holding long open chords, the pulses become deep drums on every other bar, bright and wide, 12 bars]
[Afterimages: the choir echoes itself one bar late, then a second choir higher and a third higher still, like afterimages becoming a host, tuned bells fall through it, 12 bars]
[Hush: the roar low and rolling, one held choir chord, one glass note, one great blade strike, 8 bars]
[Sky: the tune in full choir and orchestra with brass and bells, the meteor's roar at full under it, booming drums, a step higher in the last 4 bars, 12 bars]
```
(48 bars, same grid as the first half. Each section opens on the rising roar. It ends on the roar falling away and one blade strike so it loops.)

**Full prompt:** The same melody and key as the duel theme, now for the radiant second form of the swordsman above the clouds, around 88 BPM in F-sharp minor, the same tempo but everything larger, brighter and higher. Every section opens on a rising roar of fire and air, like a meteor falling close, under a held bright chord. The old tune is sung by a full wordless choir over soaring strings with horns holding long open chords, the cello pulses now deep drums on every other bar, and the calm of the first half is still there under the size of it. The tune is echoed one bar late by a second choir, higher, and a third, higher still, with tuned bells falling through it. A quiet middle of only the low rolling roar, one held choir chord, one glass note and one great blade strike, then the whole melody in full choir and orchestra with brass and bells and the meteor's roar at full, over booming drums, rising a step in the last four bars. Vast, bright and relentless, the end of a long journey, never silent, never cheerful, never frantic, leaving room in the mix for sound effects. No lyrics (the choir is wordless), no electric guitars, no synth leads, no cymbal wash. Starts and ends on the roar and one blade strike so it loops.

If a take of either half turns into pop, anime rock or EDM, add `no pop, no EDM, no guitar`. If the first half is too busy or too warm, add `sparse, cold, lots of space between phrases`. If the second half is not bright enough, add `radiant, major-key colour, soaring high strings and sopranos`; if it speeds up, add `same tempo, steady and slow`.

---

## 7. Stings and the town return (short pieces)

**Victory (`mus-victory`, 10 to 20 seconds, then the town music returns):**
Style: `triumphant fantasy fanfare, warm brass, strings, short, resolves gently, instrumental`
Full prompt: A short, warm, triumphant fantasy fanfare of 10 to 15 seconds, around 96 BPM in G major, brass and strings rising to a clear resolution and a gentle fade into a soft hold, hopeful and relieved rather than boastful, ending on a clean final chord. No vocals.

**Defeat / wipe (`mus-wipe`, 6 to 10 seconds):**
Style: `somber short fantasy sting, low strings, fading, defeated, instrumental`
Full prompt: A short, low, somber instrumental sting of 6 to 8 seconds in D minor, slow low strings sinking and a single bell, fading to silence, defeated but not cruel. No vocals.

**Before the pull (`mus-pull`, a 40 to 60 second loop):** plays from the moment the party walks into any boss room until the first blow lands, which can take minutes, so it loops, stays quiet and never reaches a climax. It is shared by all eight bosses, so it carries no boss's theme.
Style: `tense dark fantasy pre-battle loop, low string drone, soft heartbeat drum, distant timpani rolls, held low brass, suspense, quiet, instrumental, no vocals`
Full prompt: A quiet, tense instrumental loop of 40 to 60 seconds for the moments before a boss fight, around 70 BPM in D minor. A low string drone, a soft heartbeat on a frame drum, distant timpani rolls that swell and fall back, a held low brass note now and then, and a faint high string harmonic. Suspense that waits rather than builds: no melody to speak of, no climax, soft in the mix. No vocals. Starts and ends on the same drone so it loops seamlessly.

---

## Tips if a generator misses the mood

- **Too cheerful or too modern?** Add "no pop, no EDM, no electric guitar, acoustic and orchestral only".
- **Vocals sneaking in?** Repeat "instrumental, no vocals, no singing, no lyrics" at the start and end of the prompt. For the Hollow King, ask for "wordless choir (oohs and ahs only)".
- **Drums too loud for a fight?** Add "soft mix, drums sit low, plenty of space in the mid-range".
- **Want a seamless loop?** Generate 2 to 3 takes, pick the one whose ending is closest to its start, then crossfade the ends in an audio editor.
- **Want it to build with the fight?** Ask for the main loop first, then a second prompt for the harder variant in the same key and a matching tempo ratio (1.25 to 1.5 times), so the game can crossfade at a bar line.
