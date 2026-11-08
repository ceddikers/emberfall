# Music now

Each track has two blocks. Paste the first into **Style**, the second into **Lyrics** (the tags keep it from singing). Tools with one box: paste both, Style first.

Save as `client/sounds/music/<name>.mp3` (or `.ogg`). Boss tracks are 1:30 to 2:30, and the `-hard` one must stay in the same key as its main loop so the game can crossfade between them. Generate 2 or 3 takes and keep the one whose ending sounds most like its start. Send them over and I'll trim, level and add them.

The boss tracks lean big and cinematic: a memorable melody, choir, and rock drums or guitar under the orchestra. If a take turns into pop or EDM, add `no pop, no EDM` to Style; if the guitar drowns the orchestra, add `orchestra in front`. If vocals creep in, add `no singing, no lyrics`.

---


## Set 3

### Corvane · `mus-corvane`
A cold mountain pass at night, one dead duellist. It starts nearly empty and builds slowly, like the fight: a lone voice first, more instruments only as the blade gets sharper. Keep it sparse and cold, never a big-band battle. If a take is too busy, add `sparse, lots of silence between phrases`; if it turns into pop or anime rock, add `no pop, no EDM, no guitar`.
```text
cold cinematic duel boss theme, 84 BPM, E minor, solo shakuhachi flute melody, low taiko and frame drums, sparse koto and harp plucks, bowed cello drone, frost bells, slow build, wordless choir only at the peak, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: wind over snow, a single bowed cello drone, one frost bell]
[Stance: a lone shakuhachi plays a slow, proud, stern melody, sparse harp plucks between its phrases]
[Verse: one low taiko hit on every other bar, the cello walking underneath, the melody a little higher]
[Sharpening: strings enter in long rising lines, a rim-struck metal tick on the beat like a whetstone, the taiko doubles]
[Bridge: everything drops out but the drone and a shimmering run of silver bells, like afterimages, quiet]
[Climax: the melody in full strings and a wordless choir over hard taiko, a last long crescendo]
[Outro: back to the home key, the shakuhachi alone, end on the cello drone and one bell]
```

### Corvane, Hard · `mus-corvane-hard`
Same key as the main loop so the game can crossfade between them.
```text
relentless cinematic duel finale, 126 BPM, E minor, driving taiko, racing strings, fierce wordless choir, shakuhachi and brass carrying the melody, metallic ticks like a whetstone, silver bell runs, urgent, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: the frost bell, then taiko breaks in under the drone]
[Theme: the same melody in shakuhachi doubled by brass over racing strings]
[Chant: fierce choir, taiko on every strike, the metallic tick on every beat]
[Bridge: a sudden stop, only the drone and silver bell runs]
[Climax: everything at once, the melody a step higher]
[Outro: back to the home key, end on the cello drone and one bell]
```

### Brannoc · `mus-brannoc`
The drowned colosseum, first half of the fight: a showman champion and a crowd of ghosts. Brass, war drums, a wordless crowd chanting and stamping. Proud and showy with a sad edge, never a comedy. This pairs with the next track, which is the same tune slowed to a crawl and plays from The Tide Rises on: make both in the same key (D minor), the same tempo and the same length (about 2:17), and keep the sections in the same order. End each section of this one on a drum hit, not a long tail. If it turns into pop or anime rock, add `no pop, no EDM, no guitar`; if it is too jokey, add `serious, tragic undertone`.
```text
heroic gladiator boss theme, 112 BPM, D minor, brass fanfare melody, big war drums, stamping crowd, wordless ghostly crowd chant, brass stabs, tambourine and shaker, bronze bell, swaggering, proud, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: a murmuring crowd far off, torch crackle, one war drum, a bronze bell]
[Fanfare: the champion's melody on solo trumpet with snare and stamping feet, a confident swagger]
[Crowd: the ghost crowd chants wordless on the off-beat, war drums lock in, the melody in horns]
[Showboat: brass stabs and a rolling snare, the melody tossed between trumpets and trombones]
[Hush: only the drum, the crowd's stamping and one sad solo horn, like a memory of a living crowd]
[Climax: the melody in full brass over war drums and the crowd at full height, a step higher in the last bars]
```

### Brannoc, the Tide · `mus-brannoc-hard`
The second half: the sea-titan. This is not a harder arena track: it is the same melody and key as `mus-brannoc`, in half-time, and the game crossfades into it on a bar line when the Tide Rises, starting it at the same position in time. So it must be the same length with the same section order, and every section must work on its own (open each on a swell of surf; no quiet intro it depends on). Low brass, a tolling bell, deep surf, a slow wordless choir. If the drums are too fast, add `half-time feel, slow heavy drums`.
```text
vast dark orchestral sea titan boss theme, 112 BPM half-time feel, D minor, deep ocean surf, slow low brass, tolling great bell, wordless low male choir, huge slow drums, rising swells, drowned, mournful and immense, instrumental, no lyrics
```
```text
[Instrumental]
[Surf: a heavy swell of surf and one tolling bell, then a low brass drone]
[Fanfare: the champion's melody now in slow low tubas and trombones, half the speed, a huge drum on every other bar]
[Crowd: the stamping crowd has become distant surf, a wordless low male choir sings the chant very slowly under the brass]
[Showboat: the brass stabs become great slow chords, the bell tolls every two bars, the melody in cellos and horns]
[Hush: only deep surf, the bell and one lone horn far away]
[Climax: the melody in full low brass and choir over booming drums, waves breaking on every phrase, a step higher in the last bars]
```

### Morrow-Oak · `mus-morrowoak`
The dead grove on the crater's rim, first half of the fight: an ancient tree that has been patient for a very long time, and the Hunger in his split heartwood as a low drone that pulls inward. Creaking wood, slow low strings, log drums and hollow knocks, a wordless hollow choir. Slow and dreadful, never heroic, never fast. This pairs with the next track, which is the same tune made huge and wrong and plays from the moment the Grove Remade begins: make both in the same key (A minor), the same tempo (80 BPM) and the same length (about 2:24), and keep the sections in the same order. End each section of this one on a dry wooden knock, not a long tail. If it turns into pop or anime rock, add `no pop, no EDM, no guitar`; if it is too busy, add `sparse, slow, lots of space between phrases`.
```text
ancient dark fantasy dead forest boss theme, 80 BPM, A minor, creaking wood, slow bowed double basses and cellos, solo bass clarinet melody, wooden log drums and hollow knocks, hollow wordless choir, low drone pulling inward, bare bone chimes, patient and dreadful, instrumental, no lyrics
```
```text
[Instrumental]
[Roots: creaking wood and a dry wind through dead leaves, a deep bowed drone that slides slowly down and back up like a long breath, one wooden knock]
[Grove: the old tune on a solo bass clarinet and low cellos, very slow, log drums answering on the off-beat, a hollow knock on every bar]
[Hunger: a wordless hollow choir sings the tune in bare open fifths, the drone sinks lower and pulls inward, strings creep in on long bowed notes]
[Hush: only the creaking, one lone bone chime and the drone drawing in, the log drums stop]
[Bloom: the tune in full low strings and horns with the choir, log drums at full weight, the whole piece leaning inward, a step higher in the last bars]
```

### Morrow-Oak, the Grove Remade · `mus-morrowoak-hard`
The second half: the remade grove. This is not a harder track: it is the same melody, key and tempo as `mus-morrowoak`, made huge, low and wrong, and the game crossfades into it on a bar line when the Grove Remade begins, starting it at the same position in time. So it must be the same length with the same section order, and every section must work on its own (open each on a long inward rush of air and leaves; no quiet intro it depends on). Deep basses, tubas and trombones, a full dark choir, booming log drums, and warped echoes of the first four bosses bent through it (a far-off cleaver and pot-lid, skittering strings and hissing silk, thunder, a tolling grave-lantern bell). Keep the tempo the same. If it speeds up, add `same slow tempo, heavy and slow`; if it is not strange enough, add `distorted, detuned, warped, uncanny`.
```text
colossal dark fantasy floating forest boss theme, 80 BPM, A minor, the same slow melody huge and distorted, deep bowed basses, tuba and trombones, full dark wordless male choir, booming log drums, warped echoes of old boss themes, bending drone, immense, wrong, instrumental, no lyrics
```
```text
[Instrumental]
[Roots: a long inward rush of air and leaves, the drone drops a step and bends, one huge wooden boom]
[Grove: the old tune now in tubas and trombones an octave down, a few of its notes bent flat, the log drums enormous on every other bar, a clanging cleaver and pot-lid far off like a warped kitchen]
[Hunger: the choir is full and dark and sings the tune in thick clusters, the drone pulls inward harder, a skittering col legno chitter and hissing strings run underneath like legs and silk]
[Hush: only the drone bending, a slow bell tolling like a grave-lantern and a hollow choir far away, a low rumble of thunder]
[Bloom: the tune in full low brass, strings and choir, every earlier voice at once and warped (the cleaver, the chitter, the thunder, the bell), booming drums, a step higher in the last bars]
```

### Caelum Vey · `mus-caelum`
The crater floor under a falling sky, first half of the fight and the last fight of the set: a calm, untouchable swordsman who appears before he cuts. One high pure voice (a solo violin in harmonics, or a glass harmonica) over low pulsing cellos, sparse percussion that is only single sword-strikes, and a low drone that climbs very slowly the whole way through, the meteor. Cold, still and exact, never frantic, never heroic. This pairs with the next track, which is the same tune turned to a full choir and plays from the moment the Ascendant begins: make both in the same key (F-sharp minor), the same tempo (88 BPM) and the same length (about 2:11), and keep the sections in the same order. End each section of this one on a single struck-blade hit, not a long tail. If it turns into pop or anime rock, add `no pop, no EDM, no guitar`; if it is too busy or too warm, add `sparse, cold, lots of space between phrases`; if it has a cymbal wash, add `no cymbals`.
```text
cold cinematic duel boss theme, 88 BPM, F-sharp minor, solo violin harmonics and glass harmonica melody, low pulsing cellos, sparse single sword-strike percussion, tuned glass chimes, deep rising drone like a distant falling meteor, still, precise, restrained, instrumental, no lyrics
```
```text
[Instrumental]
[Fall: a very low drone that begins to climb, a long way off like a meteor falling, one pure glass-harmonica note, one struck blade]
[Duel: a solo violin in harmonics (or a glass harmonica) states a calm, cold, exact melody, low cello pulses underneath, a single sword-strike on the first beat of every other bar]
[Afterimages: the tune is answered one bar late by a fainter echo an octave higher on tuned glass, then a third fainter still, the pulses quicken, chimes fall like shards]
[Hush: only the drone, one held glass note and a single blade strike, the tune stops]
[Sky: the tune in full strings in unison, the pulses at full weight, a blade strike on every bar, the drone at its highest, a step higher in the last bars]
```

### Caelum Vey, Ascendant · `mus-caelum-hard`
The second half: the Ascendant above the clouds, the end of the set. This is not a harder track: it is the same melody, key and tempo as `mus-caelum`, turned to a full wordless choir and orchestra, vast and bright, and the game crossfades into it on a bar line when the Ascendant begins, starting it at the same position in time. So it must be the same length with the same section order, and every section must work on its own (open each on a rising roar of fire and air, the meteor, under a held bright chord; no quiet intro it depends on). Keep the echoes: where the first half answers the tune with fainter copies on glass, here a second and a third choir answer one bar late, each higher. The percussion is still only deep drums and single great strikes, no cymbal wash. Keep the tempo the same. If it speeds up, add `same tempo, steady and slow`; if it is not bright enough, add `radiant, major-key colour, soaring high strings and sopranos`.
```text
vast bright epic fantasy finale boss theme, 88 BPM, F-sharp minor, the same melody in a full wordless choir and orchestra, soaring high strings, brass, tuned bells, the roar of a falling meteor beneath, huge deep drums, sparse single anvil strikes, above the clouds, radiant, immense, instrumental, no lyrics
```
```text
[Instrumental]
[Fall: a rising roar of fire and air under a held bright chord, the drone climbing under it, one huge struck blade]
[Duel: the tune now sung by a full wordless choir over strings, horns holding long open chords, the pulses become deep drums on every other bar, bright and wide]
[Afterimages: the choir echoes itself one bar late, then a second choir higher and a third higher still, like afterimages becoming a host, tuned bells fall through it]
[Hush: the roar low and rolling, one held choir chord, one glass note, one great blade strike]
[Sky: the tune in full choir and orchestra with brass and bells, the meteor's roar at full under it, booming drums, a step higher in the last bars]
```

---

## The Ultimate (the Cinder Sovereign)

One theme runs through all six tracks: **the Sovereign's theme**, a slow five-note figure that climbs and then falls back a step. All six are in **D minor**, the key of the title screen, so the last fight of the game echoes the first thing a player hears. The acts change at set pieces that open on silence, so the tempos can differ.

- **The order of the instruments:** they pile up as the party walks home, from the title screen's lute and cello, to a full orchestra, to a choir, to everything at once with the town's own fiddle, whistle and dulcimer.
- **If your tool can take audio** (cover or extend from an uploaded file), use `mus-title` as the source for `mus-ult-1`, and `mus-town` for `mus-ult-4` and `mus-ult-end`. That carries the real melodies across. Otherwise the shared key, tempo and instruments carry the link.
- **Keep the theme the same across tracks:** generate `mus-ult-1` first, then use it as the audio source for the other act tracks if you can.

### The Kindling · `mus-ult-1` (Act I, about 2:30 loop)
The first act, in a cold hall of four braziers deep under the town: the title screen's own sound turned dark and dangerous. A plucked lute figure and a solo cello carry the theme plainly, with low whistle answering, over a steady frame drum and low strings. Restrained and ominous, a folk tune at the bottom of a well. It must loop cleanly. If it turns into pop, add `no pop, no EDM`; if it is too gentle, add `menacing, driving frame drum, low brass swells`.
```text
dark folk fantasy boss theme, 84 BPM, D minor, plucked lute ostinato, solo cello melody, low whistle answers, steady frame drum, low string drone, slow menacing brass swells, ember and ash, restrained, ominous, instrumental, no lyrics
```
```text
[Instrumental]
[Kindle: a low string drone, the lute alone plays a five-note figure that climbs and falls back a step]
[Theme: the solo cello takes the five-note theme over the lute, the frame drum enters steady, low whistle answers each phrase]
[Gathering: low brass swells under the theme, the drum doubles, the strings rise a step]
[Hush: only the lute figure and the drone, one held whistle note]
[Theme: cello and whistle together in full, brass beneath, end on the lute figure so it loops]
```

### The Forge · `mus-ult-2` (Act II, about 2:30 loop)
The second act, on a floor of cracked sheets with the high places burning round the room: the theme on a full orchestra, heavy and driving, with anvil strikes as the percussion. Forged and relentless. Same key; slightly faster. If it gets too busy, add `clear melody in front`; if the anvils vanish, add `prominent anvil strikes`.
```text
epic orchestral boss theme, 96 BPM, D minor, full orchestra, driving low strings ostinato, heavy brass melody, anvil and hammer strikes as percussion, taiko drums, forge, molten, relentless, cinematic, instrumental, no lyrics
```
```text
[Instrumental]
[Strike: a single anvil strike, then driving low strings, the five-note theme in the horns]
[Forge: full brass carries the theme, anvils on every beat, taiko under it]
[Quench: the orchestra drops away to low strings and a hiss of cymbal, the theme on a lone trumpet]
[Hammer: everything returns heavier, the theme a step higher, anvils doubled]
[Strike: end on the driving strings and one anvil strike, so it loops]
```

### The Heart · `mus-ult-heart` (the wall, about 0:30 loop)
The Heart Remembers: a sealed boss and a party facing the heads they cut. Almost nothing: a deep heartbeat, a low drone and one held high string note. No melody, no build. It must loop seamlessly.
```text
dark ambient tension loop, 60 BPM, D minor, deep heartbeat drum, low sub drone, one sustained high violin note, silence between beats, no melody, instrumental, no vocals
```
```text
[Instrumental]
[Pulse: a deep heartbeat drum, a low drone, a single high violin note held]
[Pulse: the same, the heartbeat slightly louder, end on the same beat so it loops]
```

### The Fall · `mus-ult-3` (Act III, about 2:30 loop)
The second form under the relit meteor: the theme sung by a full wordless choir with glass, bells and the roar of the meteor beneath, vast and terrible. It starts at full weight with no intro, because it opens on the halo opening into a wheel of blades. Same key. If vocals form words, add `wordless choir only, no lyrics`; if it is too bright, add `dark, ominous, minor key`.
```text
vast dark choral fantasy boss theme, 88 BPM, D minor, full wordless choir carries the melody, orchestra, glass harmonica and tuned bells, deep roaring drone like a falling meteor, huge drums, single great blade strikes, immense, terrible, instrumental, no lyrics
```
```text
[Instrumental]
[Rebirth: a huge choir chord at full weight, a great blade strike, the meteor's roar beneath]
[Theme: the choir sings the five-note theme over strings, drums on every other bar, bells falling like embers]
[Dance: the choir answers itself one bar late, glass harmonica runs between phrases, blade strikes on the beat]
[Hush: the roar alone, one held choir note, one glass note]
[Theme: choir, orchestra and bells in full, a step higher at the end, close on the opening chord so it loops]
```

### Every Name · `mus-ult-4` (Act IV, about 3:00)
The last act, in Emberfall's own square on fire: everything at once. The Sovereign's theme in choir and orchestra, *with* the town's own instruments (fiddle, tin whistle, hammered dulcimer) playing a warm village tune against it, so the town is fighting back. It grows section by section, four passes, each bigger than the last. If the folk instruments get lost, add `fiddle and whistle clearly in front`; if it turns cheerful, add `desperate, epic, minor key`.
```text
epic final boss theme, 92 BPM, D minor, full orchestra and wordless choir, folk fiddle, tin whistle and hammered dulcimer playing a warm village melody against the dark theme, huge drums, burning town, desperate, triumphant, cinematic, instrumental, no lyrics
```
```text
[Instrumental]
[Square: hammered dulcimer alone plays a warm village figure, then the choir crashes in with the five-note dark theme]
[First Pass: orchestra and choir carry the theme, the fiddle answers with the village melody]
[Second Pass: the tin whistle joins the fiddle, drums double, the two melodies trade phrases]
[Third Pass: the village melody and the dark theme play at once, brass and choir at full]
[Last Pass: everything a step higher, the fiddle and whistle soaring over the choir, the biggest moment of the game]
```

### Night in the Square · `mus-ult-end` (the kill, about 1:00, plays once)
The fire has gone out and the party is standing in the real square at night. One tin whistle plays the town's warm village tune, slowly, alone. Then the hammered dulcimer joins softly for the second phrase, and it ends on a single held note. No drums, no orchestra, no choir. Quiet enough to hear the night.
```text
quiet solo tin whistle, 66 BPM, D major ending, a slow warm village melody played alone, then soft hammered dulcimer joins, night air, peaceful, tender, a long journey over, instrumental, no drums, no vocals
```
```text
[Instrumental]
[Night: a single tin whistle plays the warm village melody slowly and alone]
[Home: the hammered dulcimer joins softly under the second phrase]
[End: one held whistle note fading into silence]
```

---

## Short pieces

### Before the pull · `mus-pull` (40 to 60 s loop, quiet, no climax)
```text
tense dark fantasy pre-battle loop, 70 BPM, D minor, low string drone, soft heartbeat drum, distant timpani rolls, held low brass, quiet suspense, no melody, instrumental, no vocals
```
```text
[Instrumental]
[Drone: low strings, a soft heartbeat on a frame drum]
[Swell: distant timpani rolls rise and fall back, a held low brass note]
[Drone: a faint high string harmonic, end on the same drone]
```

### Victory · `mus-victory` (10 to 15 s)
```text
short triumphant fantasy fanfare, 96 BPM, G major, warm brass and strings, hopeful, resolves gently, instrumental, no vocals
```
```text
[Instrumental]
[Fanfare: brass and strings rise to a clear resolution]
[End: a gentle fade on one clean final chord]
```

### Wipe · `mus-wipe` (6 to 8 s)
```text
short somber fantasy sting, D minor, slow low strings sinking, a single bell, fading to silence, instrumental, no vocals
```
```text
[Instrumental]
[Sting: low strings sink, a single bell tolls]
[End: fade to silence]
```

---

## The Founding (hero defence)

One small, hopeful folk melody on a low whistle (the camp's tune) runs through all eight; the pieces differ by how much the dark has taken of it. All of them are in **D minor (F major relative) at 72 BPM**, so the game can crossfade between any two at any moment. Warm and stubborn underneath, never grim for its own sake. If a take turns cinematic-trailer, add `small, human, folk`; if electronics creep in, add `no electronics`.

### The opening · `mus-fd-opening` (about 1:00, plays once)
The end of a long road: a wagon at dusk, warmth found in the ground, a fire, four people alone in a big valley, a distant stir. Tired and tender, not an epic trailer.
```text
cinematic folk fantasy, 72 BPM, D minor, low whistle melody, solo cello, soft frame drum footsteps, fingerpicked lute, warm pad, soft bell, one distant horn, slow, wistful, dusk, instrumental, no vocals, no big drums
```
```text
[Instrumental]
[Intro: one low drone and slow wooden footsteps on a frame drum, a few creaks]
[Theme: a low whistle plays the camp's simple, hopeful melody, cello under it, sparse]
[Discovery: the pad opens warm and bright as the ground gives off its warmth, a soft bell]
[Camp: lute arpeggios join, the melody passes to the cello, gentle and settled]
[Stir: the drone drops a step, one low string note and a single distant horn, unresolved]
[Close: the whistle plays the first four notes alone and stops on the open fifth]
```

### Day, building the camp · `mus-fd-day` (2:30 to 3:00 loop)
Calm, working, a little proud: a place being made between the waves. The loop heard most, so it must not tire.
```text
warm folk fantasy, 72 BPM, F major leaning on D minor, plucked lute, soft shaker, light frame drum, low whistle melody, fiddle answering in thirds, gentle walking bass, calm, industrious, instrumental, no vocals, no heavy drums, no cymbals
```
```text
[Instrumental]
[Intro: lute and a soft shaker pulse over a low drone]
[Theme: low whistle carries the camp's melody, lute and light frame drum underneath]
[Second voice: a fiddle answers the whistle in thirds, a gentle walking bass]
[Open: only lute and a held pad, the melody hinted, room to breathe]
[Return: the whistle again, fiddle gone, back to the opening pulse and drone so it loops]
```

### Dusk, tension building · `mus-fd-dusk` (1:30 to 2:00 loop)
The light draining and the first thing moving at the edge of it. Nothing has happened yet; everyone knows it is about to.
```text
tense dark folk fantasy, 72 BPM, D minor, thinning low whistle melody, low cello ostinato, muted frame drum heartbeat, long rising strings, one high harmonic, building suspense, no climax, instrumental, no vocals, no cymbals
```
```text
[Instrumental]
[Intro: the day's melody on a lone whistle, slower and thinner, over a low drone]
[Build: a low cello ostinato starts, a muted frame drum heartbeat]
[Build: strings hold long rising notes, the melody moves low, the drum grows by one layer]
[Hold: the ostinato alone, quiet, one high harmonic]
[Return: back to the drone and the thinned whistle so it loops]
```

### Night, the waves · `mus-fd-night` (2:00 to 2:30 loop)
Dark, steady and relentless, with the camp's tune as a small flame against it. Driving but not frantic, with room in the middle for the game's sound effects.
```text
dark folk fantasy action, 72 BPM half-time feel, D minor, deep drum pulse, war drums, driving low string ostinato, low brass pedals, tremolo violins, a lone low whistle melody like a lantern in the dark, night siege, instrumental, no vocals, no electric guitar, no cymbal wash
```
```text
[Instrumental]
[Intro: a deep drum pulse and a low string ostinato]
[Verse: the ostinato drives, war drums on the beat, low brass pedal notes]
[Flame: the whistle plays the camp's melody quietly on top, tremolo violins behind, drums drop to a heartbeat]
[Surge: full strings and low brass, the drums return, the melody low in the cellos]
[Return: ostinato and pulse only, so it loops]
```

### A main boss · `mus-fd-boss` (2:00 to 3:00 loop)
Something huge and old at the edge of the camp: slow, heavy, close. Weight and patience, not speed.
```text
slow heavy dark fantasy boss, 72 BPM, D minor, huge low drums, grinding rhythm, bowed double basses, deep brass descending theme, cellos, silence between big hits, a lone low whistle answering, ground-shaking, menacing, instrumental, no vocals, no choir, no cymbal wash
```
```text
[Instrumental]
[Intro: a single huge drum hit, a held low brass note, silence between]
[Verse: a slow grinding rhythm on low drums and bowed double basses]
[Chorus: deep brass plays a heavy descending theme, cellos double it]
[Answer: a lone low whistle plays the camp's melody over only a drone, then the drums return under it]
[Verse: the grinding rhythm again, end on the same single drum hit so it loops]
```

### The final siege · `mus-fd-siege` (3:00 to 3:30 loop)
The last wave and the last night: the camp's tune carried by the whole orchestra, stubborn and defiant. A stand, not a conquest.
```text
epic dark folk fantasy finale, 72 BPM half-time feel, D minor, full orchestra, relentless war drums, low string ostinato, brass fanfare, soaring strings, the folk melody in full, defiant, last stand, instrumental, no vocals, no choir, no electric guitar
```
```text
[Instrumental]
[Intro: a pulse of war drums and a rising string drone]
[Verse: a relentless ostinato in low strings and drums, brass pedal notes]
[Theme: horns and strings play the camp's melody in full, defiant, over the driving ostinato]
[Break: everything drops but a single low whistle and one drum, the melody quiet]
[Climb: the whole orchestra rebuilds, the melody an octave higher, strings soaring]
[Return: ostinato and drum pulse, ending as the intro did so it loops]
```

### Founding victory · `mus-fd-victory` (20 to 30 s, plays once)
A town has just been named. Relief and belonging, not a fanfare.
```text
warm hopeful fantasy resolution, 72 BPM, F major, low whistle melody, strings, soft brass, bells, soft frame drum only, gentle triumph, instrumental, no vocals
```
```text
[Instrumental]
[Theme: a low whistle plays the camp's melody in full]
[Swell: strings and soft brass take it up]
[End: a few bells and one long clean chord fading to a soft hold]
```

### Founding defeat · `mus-fd-defeat` (8 to 12 s, plays once)
A fire going out. Sad but not cruel.
```text
somber short fantasy sting, D minor, slow sinking low strings, a lone whistle, a single low bell, fading ember, instrumental, no vocals
```
```text
[Instrumental]
[Sting: low strings sink, a lone whistle plays the first four notes of the camp's melody and breaks off]
[End: a single low bell, fading to silence]
```

---

## Checklist (25 tracks still to make)

Already in the game: title, town, and every set 1 and set 2 boss track.

**Set 3**
- [ ] `mus-corvane`
- [ ] `mus-corvane-hard`
- [ ] `mus-brannoc`
- [ ] `mus-brannoc-hard`
- [ ] `mus-morrowoak`
- [ ] `mus-morrowoak-hard`
- [ ] `mus-caelum`
- [ ] `mus-caelum-hard`

**The Ultimate**
- [ ] `mus-ult-1`
- [ ] `mus-ult-2`
- [ ] `mus-ult-heart`
- [ ] `mus-ult-3`
- [ ] `mus-ult-4`
- [ ] `mus-ult-end`

**Short pieces**
- [ ] `mus-pull`
- [ ] `mus-victory`
- [ ] `mus-wipe`

**The Founding**
- [ ] `mus-fd-opening`
- [ ] `mus-fd-day`
- [ ] `mus-fd-dusk`
- [ ] `mus-fd-night`
- [ ] `mus-fd-boss`
- [ ] `mus-fd-siege`
- [ ] `mus-fd-victory`
- [ ] `mus-fd-defeat`
