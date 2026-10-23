# Music prompts: menu, town, the bosses, and the short stings

Instrumental only. The game is dusky low fantasy: warm and a little rustic in town, heavier and darker inside the bosses' halls. Nothing cartoonish, nothing comedic in the melody itself. Each piece is written to loop under a fight or a screen, so the arrangement matters more than a big ending.

## How to use these

- **Two fields on most generators.** Suno-style tools have a short **Style** field (about 120 to 200 characters) and a longer **description / lyrics** field. Each piece below gives both: paste the style line into Style, and the structure block into the lyrics field (the `[Instrumental]` and `[Section]` tags tell it not to sing). For tools with one long box (Udio, ElevenLabs Music and similar), paste the **Full prompt** instead.
- **Always add "no vocals, instrumental"** (already in each prompt). For the Hollow King, a wordless choir is wanted, so that prompt says "wordless choir, no lyrics".
- **Looping.** No generator loops perfectly. Ask for the piece to start and end on the same chord or on a held drone, then trim it in an audio editor to a clean loop point (or crossfade the last 4 seconds into the first 4). Aim for 1:30 to 2:30 per track. Boss tracks come in two parts: a main loop, and a harder variant in the same key. On Normal the game crossfades into it at a bar line late in the fight (the moment is in brackets after each harder variant); on Hard it plays the whole fight.
- **File names** follow `docs/art/sounds.md`: `mus-title`, `mus-town`, `mus-grubnak`, `mus-skitterra`, `mus-volkar`, `mus-hollowking`, `mus-wyrm`, `mus-titan`, `mus-archmage`, `mus-hydra`, `mus-pull`, `mus-victory`, `mus-wipe`. The harder variant adds `-hard` (`mus-grubnak-hard`). Export `.ogg` (or `.mp3`), stereo, 44.1 kHz, about -16 LUFS so nothing is much louder than the rest.
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

**Full prompt:** Creeping, patient dark-fantasy boss music for a giant spider queen in a silk-draped cave, around 84 BPM in F# minor. A deep drone, slow bowed string harmonics, a soft heartbeat-like low drum pulse, skittering pizzicato strings that suggest many small legs, and a thin, eerie melody on glass harmonica or celesta. Quiet but constantly uneasy, with a slowly rising tension that falls back to the drone. No vocals, no heavy drums, no electronic synths. It starts and ends on the same drone so it can loop.

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
