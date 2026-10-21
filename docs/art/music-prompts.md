# Music prompts: menu, town, four bosses, and the short stings

Instrumental only. The game is dusky low fantasy: warm and a little rustic in town, heavier and darker inside the bosses' halls. Nothing cartoonish, nothing comedic in the melody itself. Each piece is written to loop under a fight or a screen, so the arrangement matters more than a big ending.

## How to use these

- **Two fields on most generators.** Suno-style tools have a short **Style** field (about 120 to 200 characters) and a longer **description / lyrics** field. Each piece below gives both: paste the style line into Style, and the structure block into the lyrics field (the `[Instrumental]` and `[Section]` tags tell it not to sing). For tools with one long box (Udio, ElevenLabs Music and similar), paste the **Full prompt** instead.
- **Always add "no vocals, instrumental"** (already in each prompt). For the Hollow King, a wordless choir is wanted, so that prompt says "wordless choir, no lyrics".
- **Looping.** No generator loops perfectly. Ask for the piece to start and end on the same chord or on a held drone, then trim it in an audio editor to a clean loop point (or crossfade the last 4 seconds into the first 4). Aim for 1:30 to 2:30 per track. Boss tracks work best as two parts (see "Phase variants"): a main loop, and a harder one the game crossfades to later in the fight.
- **File names** follow `docs/art/sounds.md`: `mus-title`, `mus-town`, `mus-grubnak`, `mus-skitterra`, `mus-volkar`, `mus-hollowking`, `mus-victory`, `mus-wipe`. Phase variants add `-b` (`mus-grubnak-b`). Export `.ogg` (or `.mp3`), stereo, 44.1 kHz, about -16 LUFS so nothing is much louder than the rest.
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

## 3. Grubnak, the Ogre Chef (`mus-grubnak`, harder variant `mus-grubnak-b`)

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

**Harder variant `mus-grubnak-b` (the burning stove, Second Sitting and Dessert) (Style):** `frantic dark-fantasy kitchen chaos, same key but faster, brass stabs, rushing snare, roaring fire, pots clattering, accelerating, instrumental, no vocals`
Full prompt: the same melody as the main loop in the same key (E minor) and the same rhythmic clanging, but faster at about 140 BPM, with a driving snare, screaming brass stabs, rising string tremolos and a roaring, crackling low noise bed, as if the whole kitchen is on fire and orders are piling up. Frantic but never a wall of noise. No vocals. Ends on the same clanging pattern.

---

## 4. Queen Skitterra, the Broodmother (`mus-skitterra`, harder variant `mus-skitterra-b`)

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

**Harder variant `mus-skitterra-b` (the swarms and enrage) (Style):** `frantic horror strings, skittering staccato, rising tremolo, dissonant brass hits, fast pulse, panic, instrumental, no vocals`
Full prompt: the same key and drone as the main loop but at about 150 BPM: relentless staccato strings like a swarm, rising tremolo, harsh dissonant brass stabs, a fast driving low drum, and the eerie glass melody screaming high above. Panicked and relentless. No vocals. Ends on the same drone.

---

## 5. Volkar, the Storm Titan (`mus-volkar`, harder variant `mus-volkar-b`)

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

**Harder variant `mus-volkar-b` (the final phases, Heavens Fall) (Style):** `intense epic orchestral storm finale, fast war drums, choir-less brass fanfare, relentless strings, lightning crackle, climactic, instrumental, no vocals`
Full prompt: the same theme and key as the main loop but faster, about 128 BPM, with relentless running strings, a pounding drum pattern, a full brass fanfare carrying the melody, rising pitch shifts like a storm breaking, and lightning crackle accents. Climactic, urgent, never silent. No vocals. Ends on the same thunder and drum hit.

---

## 6. The Hollow King (`mus-hollowking`, harder variant `mus-hollowking-b`)

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

**Harder variant `mus-hollowking-b` (the war march, after Royal Doom) (Style):** `dark fantasy war march, wordless choir, pounding timpani and snare, brass fanfare, bells, relentless, majestic, instrumental, no lyrics`
Full prompt: the same theme and key as the main loop but turned into a war march at about 108 BPM: snare and timpani marching, a defiant brass fanfare carrying the melody, the choir now loud and fierce (wordless), bells in the rhythm, relentless and grand. No lyrics. Ends on the single tolling bell.

---

## 7. Stings and the town return (short pieces)

**Victory (`mus-victory`, 10 to 20 seconds, then the town music returns):**
Style: `triumphant fantasy fanfare, warm brass, strings, short, resolves gently, instrumental`
Full prompt: A short, warm, triumphant fantasy fanfare of 10 to 15 seconds, around 96 BPM in G major, brass and strings rising to a clear resolution and a gentle fade into a soft hold, hopeful and relieved rather than boastful, ending on a clean final chord. No vocals.

**Defeat / wipe (`mus-wipe`, 6 to 10 seconds):**
Style: `somber short fantasy sting, low strings, fading, defeated, instrumental`
Full prompt: A short, low, somber instrumental sting of 6 to 8 seconds in D minor, slow low strings sinking and a single bell, fading to silence, defeated but not cruel. No vocals.

**Pre-pull / countdown (optional, `mus-pull`, 4 seconds):** a tense rising drum roll and a held brass note that ends on a drum hit, to play during the 5-second pull countdown.

---

## Tips if a generator misses the mood

- **Too cheerful or too modern?** Add "no pop, no EDM, no electric guitar, acoustic and orchestral only".
- **Vocals sneaking in?** Repeat "instrumental, no vocals, no singing, no lyrics" at the start and end of the prompt. For the Hollow King, ask for "wordless choir (oohs and ahs only)".
- **Drums too loud for a fight?** Add "soft mix, drums sit low, plenty of space in the mid-range".
- **Want a seamless loop?** Generate 2 to 3 takes, pick the one whose ending is closest to its start, then crossfade the ends in an audio editor.
- **Want it to build with the fight?** Ask for the main loop first, then a second prompt for the harder variant in the same key and a matching tempo ratio (1.25 to 1.5 times), so the game can crossfade at a bar line.
