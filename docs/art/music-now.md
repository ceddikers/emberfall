# Music now

Each track has two blocks. Paste the first into **Style**, the second into **Lyrics** (the tags keep it from singing). Tools with one box: paste both, Style first.

Save as `client/sounds/music/<name>.mp3` (or `.ogg`). Boss tracks are 1:30 to 2:30, and the `-hard` one must stay in the same key as its main loop so the game can crossfade between them. Generate 2 or 3 takes and keep the one whose ending sounds most like its start. Send them over and I'll trim, level and add them.

The boss tracks lean big and cinematic: a memorable melody, choir, and rock drums or guitar under the orchestra. If a take turns into pop or EDM, add `no pop, no EDM` to Style; if the guitar drowns the orchestra, add `orchestra in front`. If vocals creep in, add `no singing, no lyrics`.

---

## Set 2

### Hrimgar · `mus-titan`
```text
vast orchestral boss battle, 126 BPM, D minor, wordless choir, driving staccato strings, piano ostinato, huge drums, heroic horns, glacial bells, crystalline celesta, epic, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: wind, a crystalline celesta motif over a deep choir drone]
[Verse: piano ostinato and staccato strings, huge slow drum hits like footfalls]
[Theme: horns carry a wide, noble melody, the choir swells behind]
[Bridge: celesta and a lone wordless female voice, quiet as an aurora]
[Climax: the melody in full brass and choir, cracking ice percussion on the beat]
[Outro: end on the celesta motif and the drone]
```

### Hrimgar, Hard · `mus-titan-hard`
```text
relentless orchestral rock boss finale, 152 BPM, D minor, rock drums, low guitar riff, fierce wordless choir, racing strings, full brass melody, avalanche rumble, epic, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: the celesta motif, then drums and a low riff crash in]
[Theme: the same melody in full brass over racing strings]
[Chant: fierce choir, cracking ice on every beat]
[Climax: an avalanche rumble swells under the whole orchestra]
[Outro: end on the celesta motif and the drone]
```

### The Hydra · `mus-hydra`
```text
dark ritual orchestral boss battle, 132 BPM, D minor, tribal frame drums, wordless chant choir, driving low strings, piano ostinato, brass stabs, bells, building layers, epic, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: water drips, one low drum, a whispered wordless chant]
[Layer one: tribal drums and a driving low string riff]
[Layer two: a piano ostinato and the chanting choir join]
[Theme: brass and choir carry a dark, sweeping melody]
[Drop: only a heartbeat drum and a bubbling drone]
[Layer three: everything at once, the choir at full height, bells]
[Outro: end on the water drip and one drum hit]
```

### The Hydra, Hard · `mus-hydra-hard`
```text
intense dark ritual symphonic finale, 160 BPM, D minor, pounding tribal drums, heavy low riff, thick wordless choir, brass stabs, racing strings, heartbeat bass, relentless, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: water drip, the drums begin pounding]
[Theme: the same melody, thick choir on rising chords, a heavy low riff]
[Chorus: brass stabs on every strike, racing strings, tolling bells]
[Climax: everything at once, the heartbeat bass driving]
[Outro: end on the water drip and one drum hit]
```

### Azerath · `mus-archmage`
```text
arcane orchestral boss battle, 138 BPM, D minor, harpsichord and piano arpeggios, pipe organ, wordless chamber choir, racing strings, brass, electric pulse, elegant, dramatic, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: an organ chord, a four-note motif on harpsichord]
[Part one: racing strings, the motif in low brass]
[Part two: the motif a tone higher, piano and celesta glitter]
[Part three: the motif in staccato violins over an electric pulse, choir stabs]
[Bridge: choir and organ alone, the motif passed between voices]
[Climax: the motif becomes a grand melody for full orchestra and choir]
[Outro: back to the home key, end on the organ chord]
```

### Azerath, Hard · `mus-archmage-hard`
```text
furious arcane symphonic boss finale, 168 BPM, D minor, pipe organ, rock drums, racing strings, harpsichord runs, wordless choir, brass stabs, electric crackle, relentless, instrumental, no lyrics
```
```text
[Instrumental]
[Intro: the organ opens wide, drums kick in]
[Theme: the same four-note motif as a driving melody over racing strings]
[Chant: full choir on rising chords, harpsichord runs, brass stabs]
[Climax: the motif in every register at once, electric crackle on top]
[Outro: end on the organ chord]
```

### Vhalgrath · `mus-wyrm`
```text
epic symphonic rock dragon battle, 144 BPM, C minor, heavy guitar riff, rock drums, full orchestra, soaring French horn melody, brass rips, anvils, string tremolo, no choir, instrumental, no vocals
```
```text
[Instrumental]
[Intro: a volcanic rumble, a distant horn call, a guitar riff rises]
[Ground: the heavy riff and drums lock with low brass, anvil hits]
[Sky: drums drop to timpani under string tremolo, a wide soaring horn melody]
[Ground: the riff returns heavier, brass rips like a roar]
[Smoulder: the rumble and a low piano ostinato]
[Climax: the horn melody in full brass over the riff, a step higher]
[Outro: back to the home key, end on the rumble]
```

### Vhalgrath, Hard · `mus-wyrm-hard`
```text
ferocious symphonic metal dragon finale, 176 BPM, C minor, double-kick drums, heavy guitar riffs, full brass on the horn theme, roaring brass rips, anvils, no choir, instrumental, no vocals
```
```text
[Instrumental]
[Intro: the rumble, the drums break into a gallop under the riff]
[Theme: the same soaring melody in the full brass section]
[Chorus: roaring brass rips on every phrase, anvils on the off-beats]
[Climax: everything at full height, the melody a step higher]
[Outro: back to the home key, end on the rumble]
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

## Checklist (17 tracks)
- [x] `mus-skitterra`
- [x] `mus-skitterra-hard`
- [x] `mus-volkar`
- [x] `mus-volkar-hard`
- [x] `mus-hollowking`
- [x] `mus-hollowking-hard`
- [ ] `mus-titan`
- [ ] `mus-titan-hard`
- [ ] `mus-hydra`
- [ ] `mus-hydra-hard`
- [ ] `mus-archmage`
- [ ] `mus-archmage-hard`
- [ ] `mus-wyrm`
- [ ] `mus-wyrm-hard`
- [ ] `mus-pull`
- [ ] `mus-victory`
- [ ] `mus-wipe`
