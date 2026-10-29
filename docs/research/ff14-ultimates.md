# Research: FF14's Ultimate raids, and what translates to Emberfall's Ultimate

*Compiled by a research agent, 2026-10-29. Companion to `ff14-raid-boss-design.md` (Savage-era vocabulary) and input to `docs/plans/2026-10-ultimate-raid.md` (the Cinder Sovereign). Nothing here changes either file.*

**How to read this.** Every Ultimate below is an 8-player fight (2 tanks, 2 healers, 4 DPS) with a 120-minute instance clock. Emberfall has 4 players (tank, healer, 2 DPS), so "the party splits in two groups of four" becomes "two pairs" or "all four together", and "8 players each get a number" becomes "4 players each get a number". Timings come from cactbot timeline files where I could read them; those files pad phase starts (a new phase often begins on a round number such as 200.0 or 500.0), so I derive phase lengths from enrage times, not from raw timestamps. "(est.)" marks numbers I filled in from general knowledge and could not confirm in a source.

**What I could not get.** Icy Veins returned HTTP 403 to every fetch, and Reddit/Hector Hectorson pages sat behind an auth redirect. Strategy detail therefore comes from consolegameswiki, the tuufless static-group guides, search snippets from Icy Veins and The Balance, and cactbot. Player-sentiment evidence is thin and is flagged as such in the sentiment section.

---

## 0. What an Ultimate is, in one page

Common traits across all six, observed in the material:

1. **Phases chained like acts.** Each phase has its own boss or boss form, its own mechanic vocabulary, its own enrage, and usually its own short "check" (DPS, a limit-break, a soak count). A phase lasts roughly 2 to 5 minutes. A wipe sends you back to the start of the whole chain (there are no checkpoints inside a pull; DSR is the only one with an early checkpoint after Phase 1).
2. **Recombination as the late-game.** Early phases teach single ideas. Later phases play several of them at once, often on a timer stack so that one resolves every 5 to 10 seconds: UCoB's six Trios, TEA's Wormhole formation, TOP's Dynamis phase (Delta, Sigma, Omega versions), FRU's Crystallize Time, UWU's Ultimate Predation.
3. **A "one mistake is fatal" tone, with a wide tolerance for who dies.** Wrong tower in TOP's Program Loop wipes the raid. A tank can survive some mistakes; the arena edge is lethal. Savage-era "personal failure only hurts you" mostly goes away; instead the fight punishes the party for one error.
4. **Information is front-loaded, resolution is back-loaded.** The tells (markers, tethers, timers, clones, glows) appear 5 to 40 seconds before they resolve. The skill is reading all of them early and then moving on a schedule.
5. **A hard enrage per phase, and a cutscene or hard-cut between them.** Enrages are named casts of 10 to 30 s that wipe the party unless the boss is dead (or below 20% in TOP/FRU, where meeting the DPS check turns the enrage into a heavy raidwide and advances the phase).
6. **Randomness is shallow.** Almost every "random" thing is a small selection from a finite pattern (which cardinal the first icicle lands on, which of two clone sets, who gets which timer); the *shape* of the dance is fixed and the strategy is a lookup table. Players call this "prog" (learning it) and then "execution".

### Typical lengths (from the cactbot timelines and the wiki pages)

| Ultimate | Phases | Rough clear length | Source of the number |
|---|---|---|---|
| UCoB | 5 (Twintania, Nael, Bahamut trios, Teraflare adds, Golden Bahamut) | 20+ min (est.); Twintania enrage ~3 min, Golden Bahamut ~4.5 min | page + cactbot |
| UWU (The Weapon's Refrain) | 5 (Garuda, Ifrit, Titan, Lahabrea, Ultima) | ~20 min (est.); the wiki gives no timers | structure only |
| TEA | 4 (+ intermission) | ~20 min; cactbot last event 1249.8 s, padded | cactbot |
| DSR | 7 + 2 "Vault" intermissions | ~22 min (the wiki states about 3 min P1 and 19 min for the rest) | page |
| TOP | 6 + intermission | ~20 to 24 min; summed enrage windows give ~19 min before cutscenes | cactbot |
| FRU | 5 + intermission | ~20 min; summed phase windows ~17.5 min before cutscenes | cactbot |

Reference for Emberfall: the plan's ~15 minute, four-act fight is shorter than every real Ultimate. Its acts (3.5 to 4.5 min) match a real phase length.

---

## 1. The Unending Coil of Bahamut (UCoB), 2017, level 70

**The feel.** The oldest and the most "mythic". It is a gauntlet of memorised calls: Nael's quotes, Bahamut's Trios, the Octet. The fight reuses earlier phase bosses (Twintania, Nael) as characters in later phases, so the fight is a call-back raid. This is the closest FF14 analogue to Emberfall's "villain calls back earlier bosses".

**Structure and timings** (cactbot offsets, so use as relative):
- **Phase 1, Twintania.** Hard enrage about 3 min (Aetheric Profusion). Three HP bands (about 100 to 75, 75 to 45, below 45%). Each band adds something: Neurolink puddle drops at 74% and 44%, a second Generate, an unbaitable Liquid Hell.
- **Phase 2, Nael Deus Darnus.** Enrage Megaflare at about 9 min in the file (a long phase). Nael calls a **quote** before each pair of attacks, and each quote maps to specific attacks; the party's callers announce the sequence. Bahamut's Favor summons five dragons, each with its own debuff puzzle (ice and fire cancel each other, thunder, light's white puddles cure Doom, dark's Doom timers).
- **Phase 3, Bahamut Prime.** Six **Trios** on a roughly 40 to 60 s cadence (cactbot starts: 1037, 1078, 1129, 1181, 1242, 1298, so gaps of 41, 51, 52, 61, 56 s). Between Trios Bahamut himself does plain attacks (Flare Breath, Flatten, Gigaflare), which keeps healers and tanks honest and leaves DPS windows. The Trios in order:
  - **Quickmarch.** Three bosses charge through the middle and leave safe edges; Twisters are dropped in them.
  - **Blackfire.** One diver marker sets where the boss lands; Liquid Hell bait to the edge; four Megaflare marks and four towers.
  - **Fellruin.** The bosses land in a triangle; two Neurolink puddles are shared; Meteor Stream.
  - **Heavensfall.** Eight towers, a central pillar that knocks everyone outward, and players stand with their backs to a tower so the knockback lands them in it.
  - **Tenstrike.** Generate orbs (three players stand in Neurolinks), Meteor Stream per role, Earthshaker marks swap in two rounds.
  - **Grand Octet.** All eight bosses and dragons dive in a set order (counter-clockwise or clockwise depending on where Bahamut stands); every living player has at least one diver marker. Bahamut must be below 60% by then or the next attack is lethal.
- **Phase 4, Teraflare.** Nael and Twintania both targetable, a Teraflare gauge fills to 100% (wipe); both die together or the survivor heals and buffs. Phoenix revival if the gauge fills anyway.
- **Phase 5, Golden Bahamut.** Pure repetition: Morn Afah (untelegraphed stack), Akh Morn (tank hits), Exaflare (three pairs of circles that travel across the arena), five times then an infinite enrage.

**Choreography moments** (named):
- **Heavensfall Trio (P3).** The pillar's knockback is *used*: everyone is told to stand with their back to a tower so the knockback delivers them into it. Strong example of a forced movement as the solution.
- **Quickmarch Trio (P3).** The charges are the safe-zone generator: where they pass leaves clean edges, and the party relocates there.
- **Grand Octet (P3).** Every player has a marker and the dives resolve in a *fixed visible order*; the party spreads at clock positions and counts.
- **Exaflare (P5).** Pairs of circles that march across the board; the old position is safe once they fire. The party follows the trail.

**DPS check and enrage.** Three enrages (Twintania 3 min, Nael Megaflare, Teraflare gauge) and a soft check (Bahamut below 60% before the Octet ends; Teraflare gauge).

**Notable design notes.**
- Neurolink is a **seed**: tanks drop three black puddles in Phase 1, and only a player standing in one survives later (Hatch, Aetheric Profusion, Tenstrike orbs). A mechanic in an early phase prepares the floor for a later one.
- Quote calls make Nael a **call-and-response** fight (the party hears the call and knows what follows). It is the oldest example of the plan's "the Sovereign calls a name and its rule follows".

---

## 2. The Weapon's Refrain (UWU), 2018, level 70

**The feel.** A gauntlet through three Primals (Garuda, Ifrit, Titan), then Lahabrea, then the Ultima Weapon, who recalls all three Primals and fights with their moves. The "the whole fight is the previous bosses again" idea of UCoB, in simpler dress. UWU is widely rated the easiest of the six now (an unsourced tier list says every mechanic is well-documented).

**Structure.**
- **The Awakening rule.** Each boss gains a stack when a phase mechanic is resolved *the intended way* (nails killed in the right order, Gaol puddle stepped on, Thermal Low stacks cleansed). At 4 stacks it becomes **Awakened**, upgrading its moves (Wicked Tornado joins the Wheel, Crimson Cyclone leaves a cross, Landslide fires twice). A boss that dies Awakened leaves a pillar of light that grants **Beyond Limits**: its holder's level-3 Limit Break refills, and a caster, a melee and a healer each need one for Phase 4's Limit-Break checks. So **doing the mechanic right makes the fight harder now and enables a later phase**.
- **Phase 4 is a chain of one-answer checks.** Magitek Bits (the caster's limit break), Lahabrea's Blight (the healer's), Dark IV (the melee's), Ultima (the tank's).
- **Phase 5, Ultima Weapon.** Three sub-phases of increasing intensity. "Ultimate Predation" summons all three Primals together and plays their kits on top of one another; the "Ultima Aether" gauge rises over time and each death adds 4%. The enrage is a staged killing: players are lifted one at a time in order of damage dealt.

**Choreography moments.**
- **Ifrit's nails (P2).** Four Infernal Nails are destroyed in an order *the party chooses*. **The same order is replayed by Ifrit's three clones' Crimson Cyclone charges later**, so the party's earlier choice becomes the later pattern. This is the clearest "stored mechanic" in the six and matches the plan's Hydra wall exactly (heads strike again in the order you cut them).
- **Titan Landslide.** Five lines knock you to the wall; the Awakened version fires a second set *in the previously safe gaps*. The party steps out, then steps in again as the first set resolves. "Where it was safe is the next hit" is the same shape as TOP's Wave Repeater donuts.
- **Titan Granite Gaol chain.** Gaoled players stand in a line from a rock toward the boss; the rock's burst frees the nearest one and leaves a puddle, and the cascade frees the others and lays a path of puddles to Titan. The *rescue itself* is a seeded line.
- **Garuda Mistral Song.** A tank breaks line of sight at the arena edge while the group stacks in the centre (a role split into two movements that begin together).
- **Eye of the Storm.** Cyclones eat the edges and shrink the floor: the arena is a resource that changes during a mechanic.

**Timings.** No cast times are given on the wiki page. The structure: Garuda about 4 stacks, each pair of casts a few seconds apart; the Titan phase is Tumult times 6 to 8 between bigger mechanics (repeated raidwide metronome).

**DPS check and enrage.** A DPS-based Ifrit skip (kill fast enough to skip the dashes), Hellfire enrage, Earthen Fury enrage, Aerial Blast enrage, and the lethal Ultima Aether sequence.

---

## 3. The Epic of Alexander (TEA), 2019, level 80

**The feel.** The most "systems" Ultimate: debuff-colour logic (Judgment Nisi), tethers with min and max distance, numbers 1 to 8, and a final phase where your own clone shows the future. It rewards players who like puzzle logic. Hector Hectorson reportedly names BJ/CC (Brute Justice and Cruise Chaser) as a favourite phase, as "a chaotic version" of the classic FFXIV mechanical dance (via a search snippet of a Reddit AMA; I could not open the thread).

**Structure and timings** (cactbot, padded).
- **Phase 1, Living Liquid** (enrage Cascade about 142 s). Hand and boss split; Hand of Prayer (fist: separate them; open palm: bring them together) and Hand of Pain (HP gap above 4% wipes). Jagd Dolls must be fed into the boss at 25% HP, not killed, not overfed.
- **Intermission, Limit Cut** (about 30 s). Numbers 1 to 8, Cruise Chaser hits pairs; Hawk Blasters rotate explosions around the arena in ten sets.
- **Phase 2, Brute Justice and Cruise Chaser** (enrage about 190 s). Judgment Nisi colours pass on contact (two different colours touching kills); Compressed Water/Lightning debuffs pass to a random player; Verdict/Gavel is a "everyone must hold the correct colour" check.
- **Phase 3, Alexander Prime** (about 200 s in four formations, then a ~70 s DPS check). Formation 1 Temporal Stasis (tethers: near, far, and a "do not take extra damage" marker). Formation 2 Inception (orbs drift to their owners and shrink as they travel; crystals dropped by the other four must not touch). Formation 3 Wormhole **plays the earlier mechanics together**. Formation 4 Summon Alexander is a DPS check: kill Cruise Chaser, Brute Justice, then Alexander Prime.
- **Phase 4, Perfect Alexander** (about 350 s). Final Word, Fate Projection alpha and beta, Almighty Judgment, then the Temporal Prison enrage (cages drop clockwise; if anyone is not caged, an instant reset).

**Choreography moments.**
- **Limit Cut (Intermission).** Odd numbers are blue, even are red. Cruise Chaser teleports behind an odd player, cleaves the way they face, then dashes to the next even player. The two groups run on opposite sides of the room following rotating Hawk Blaster explosions, first the inner ring, then the outer. One of the best examples of *a numbered order plus a rotating hazard making the party run in a circle*.
- **Final Word (P4 opening).** Contact Prohibition (move toward the Regulation player) and Escape Prohibition (move away from the Detection player) turn into a **forced march**: after the timer, players are moved by their debuff. The rest of the party is arranged in rows so the marches do not collide. Ordained Motion/Stillness (white/black sword: keep moving or stand still) then drives the whole party's behaviour for one cast.
- **Fate Projection alpha and beta.** The most distinctive pattern in any Ultimate: **each player's own clone appears with a symbol showing what will be done to them**, and the party solves the mechanic by reading its clones (one has gears, one a pulse, a stacking-gears one). The dance is "stand in front of your clone, relative to the Alexander clone that is not holding fire".
- **Inception (P3).** Plasma orbs spawn in one of two diagonal formations and drift to their owners; owners run to the opposite intercardinals so each orb shrinks across the room before it reaches them.
- **Wormhole (P3).** Chakrams, missiles, Void of Repentance (three shrinking soak puddles) stack so the numbered players take turns in a fixed order, each knowing their next bait.

**DPS check and enrage.** Five enrages in the cactbot file (Cascade, Eternal Darkness twice, Divine Judgment, Temporal Prison). The Temporal Prison enrage cages the party in a visible order, so it is a "beat the clock" cutscene as well as a wipe.

---

## 4. Dragonsong's Reprise (DSR), 2022, Endwalker (item level sync 605)

**The feel.** A story fight with the longest chain: seven phases and two "Vault" intermissions, about 22 minutes, with a recurring cast of named bosses (the Knights of the Round, Nidhogg, Hraesvelgr, Thordan). It reuses *the same mechanic in new forms*: the Holy Chain pair tethers return in Phase 5; Wings of Salvation and Doom return from UCoB's light dragon. A phase-skipping story branch (spare Thordan or not) leads to Phase 7's loop.

**Structure and timings** (cactbot).
- **P1** Adelphel, Grinnaux, Charibert (about 134 s; soft enrage at ~127 s). Hard-coded HP sync between bosses; Pure of Heart ends it.
- **Vault intermission** (~40 s): repeat of the end of P1 with Limit Break.
- **P2** King Thordan and the Knights (about 197 s). Two Knight sets (Strength of the Ward: charge lanes; Sanctity of the Ward: gazes, comets, ice, fire); Ultimate End raidwide; Aetheric Burst enrage at about 738 (padded).
- **P3** Nidhogg (~118 s). Numbered **Dive from Grace** towers; Gnash and Lash in and out.
- **P4** The Eyes (~90 s). Two Eyes with colour chains; Mirage Dive; Flare Nova and Flare Star orb soaks.
- **P5** Dark King Thordan (about 235 s). **Wrath of the Heavens** (Trio) then **Death of the Heavens**; Holy Meteor is a DPS check at the end.
- **P6** Nidhogg and Hraesvelgr (about 212 s). Wyrmsbreath (tethered breath), Mortal Vow (a debuff you must pass every ~30 s), Akh Afah, **Wroth Flames**.
- **P7** Dragon-king Thordan (loops). A 79-80 s cycle (cactbot: Exaflare's Edge at 4036, 4114.8, 4194.8): Trinity, Exaflare, Trinity, Akh Morn, Trinity, Gigaflare, three times, then Morn Afah's Edge (towers that spawn until the party wipes).

**Choreography moments.**
- **Wrath of the Heavens (P5).** A white dragon spawns on a random cardinal and *defines north*. Two Dragoon-style tethers are crossed and stood on the south side; a blue-marked Skyward Leap player goes north-west; Charibert and Grinnaux appear north and south in random order and the party must identify which is which; a green divebomb mark shows the landing; then a Liquid Heaven five-fireball bait and an Altar Pyre four-fire bait resolve, and the party steers to Grinnaux's safe spot as Empty Dimension donuts. One reference-point spawn plus a fixed order of events.
- **Death of the Heavens (P5).** Four players get Doom (25 s). A flurry of AoEs resolve, then **Wings of Salvation** spawn white puddles that only the Doomed can use to cleanse Doom. Players first line up in two lines (doomed and not doomed) *so everyone can see their order*, then split to spread spots, bait circle markers, then converge in the centre for the Playstation-symbol chain pairs, look away from the gaze sources, take the knockback, then step to the white puddle. About eight beats on a clock that the strategy learns by heart.
- **Dive from Grace (P3).** Each of 1, 2, 3 has an arrow (circle, down, up) that decides where a tower spawns relative to the player: on them, 10 yalms behind, or 10 yalms ahead. The party's facing and the arrow place the tower, so **the player aims their own tower**.
- **Wroth Flames (P6).** Orb crosses spread out across the room; four players are marked Spreading Flames (detonating after 24 s), two are marked Entangled Flames (must stack). Each group then works through three orb crosses in turn.
- **Trinity loop (P7).** An in/out sword decides whether you hug the boss or stand out (ice sword: in, flame sword: out). Tri-directional exaflares fire along arrows; Akh Morn's Edge has three towers (two for three players, one for both tanks). All spawn relative to the boss's facing, so the *shape* repeats at a different angle every time.

**DPS check and enrage.** Six named enrages (Bull's Steel, Aetheric Burst twice, Revenge of the Horde three times, Pierce) plus the Holy Meteor soft check. The loop in P7 is the only one in the six that is infinite by design.

---

## 5. The Omega Protocol (TOP), 2023, level 90

**The feel.** The most demanding, with the strictest DPS checks (the page says potions matter more here than in earlier Ultimates). It is built around **long debuff timelines** (16 to 43 s, 12 to 30 s, 23 s) that give every player a personal schedule, and around a final stretch that plays Omega's whole kit in **three variants** (Delta, Sigma, Omega) on one structural template. Widely called the hardest Ultimate; its problem, as one editorial put it, was tracking buffs and debuffs through a fight with this many (RPGSite).

**Structure and timings** (cactbot; each phase starts on a round number):
- **P1 Omega** (the Beetle). Program Loop 15.0, Pantokrator 69.2, Kyrios attacks 81 to 99, Atomic Ray enrage 127.7. About 2 min.
- **P2 Omega-M and Omega-F** (200 to ~350). Firewall 206, Party Synergy 231, Limitless Synergy 282, Cosmo Memory 319, Laser Shower enrage 347. About 2.5 min.
- **Intermission, Reconfiguration** (~35 s).
- **P3 Hello, World** (400 to ~590). Hello, World 441, Latent Defect puddles 464, Critical Error 550, Ion Efflux enrage 587. About 3 min.
- **P4 Blue Screen** (~60 s). Wave Cannons 621 to 637 and Blue Screen at 661; a hard DPS check (below 20% HP).
- **P5 Run: Dynamis** (700 to ~1000). Delta 740, Sigma 822, Omega 911, Blind Faith 998. About 5 min.
- **P6 Alpha Omega** (1100 to ~1422). Everyone needs three Quickening Dynamis stacks to enter; the Limit Breaks given by the stacks are the DPS and mitigation. Cosmo Meteor 1332, Magic Number 1367, enrage 1422. About 5.5 min.

**Choreography moments.**
- **Program Loop (P1).** Every player has a timer of 16, 25, 34 or 43 seconds (two players per timer; 9 s apart), which is also an **order in line** (first to fourth). Four pairs of yellow towers appear in sequence, and each player soaks in order; a wrong soak wipes the party. Meanwhile boss tethers hit four players in 3-4-1-2 pickup order for four Blaster hits, each putting a 99% max-HP penalty on the holder. **The timer is the player's schedule and the party is a clock**: each player walks to the next tower in the order, people with the next number stand near it, and the pickup order of the tethers makes a second rotating schedule over the first.
- **Pantokrator (P1).** Everyone has two timers: a Guided Missile (12, 18, 24, 30 s) and a matching Wave Cannon. Two cone AoEs, each a sixth of the room, sit on opposite sides and **rotate clockwise or counter-clockwise, and the direction is invisible until they start**. Circle AoEs appear under players. The party splits into two stacks of four, each holding all four timers; **each stack orbits the room with the cones**, the stack soaks the Wave Cannon line together, and *the player whose missile is about to expire steps out, takes it alone, and walks back in*. At the end, three players bait a line, then the other three bait it. The whole thing is about 30 s of the party moving as one organism, with one member popping out and back every 6 s. This is the mechanic the user named.
- **Party Synergy (P2).** Players get Mid Glitch or Remote Glitch pairs (stay half or the full room apart or take Vulnerability Up) *while* clones resolve attacks. The party must satisfy a fixed *distance* shape while dodging; the Discharger knockback is used to land pairs on the right spots.
- **Hello, World (P3).** Seven kinds of debuff plus **a four-role cycle**: each player starts as one of defamation, blue tether, stack or red/green tether, and **each role passes to the next in turn after every round**, so every player does every job (defamation, then blue tether, then stack, then red and green tether, then defamation again). Rot (red or blue) spreads on contact and is cleansed by soaking puddles of its colour. It is the best example of a long *rotation of duties*.
- **Wave Cannon (P4).** Each player gets a line; a follow-up line appears where they stood, so each position is both a hit and a seed; two players take line stacks while the party splits in two groups. Three sets, with donuts returning; on the second set you stay outside and dodge in.
- **Delta, Sigma, Omega (P5).** Hello, Near World and Distant World are a bounce chain: the target takes a big circle, and it **jumps to the nearest (or furthest) player, then the next-nearest**, so the order in which people stand *is* the schedule. Three stacks per player are needed to enter Phase 6. Delta uses coloured fists that must be paired with the opposite colour; Sigma has a "smiley face" or "pentagon" tower pattern the party is knocked into; Omega pairs clones in stances that attack in spawn order.
- **Unlimited Wave Cannon and Cosmo Arrow (P6).** Four exaflares march across the board; Cosmo Arrow plus-shaped lines cascade into narrower lines. The party starts at the centre, steps next to the first exaflare, then steps into the zone it just burned.

**DPS check and enrage.** Atomic Ray (P1), Laser Shower (P2), Ion Efflux (P3), Blue Screen (P4, below 20% to advance), Blind Faith (P5), the long Run: enrage in P6. Meeting the check converts the enrage into a heavy raidwide; failing wipes.

---

## 6. Futures Rewritten (FRU), 2025, level 100

**The feel.** The newest and a deliberately gentler design. An editorial describes it as easing off after DSR and TOP; the author says the fight "wants you to clear it", where TOP challenged players to surmount it (RPGSite). It is notable for the most *beat-based* timeline of the six: a **5-second heartbeat** in Ultimate Relativity, 3-4 s steps in Fall of Faith, 6 s steps in Diamond Dust. Pandora's Phase 5 is a single repeated three-act mechanic cycle. FRU is the best model for a "dance" fight because most of its mechanics have a *fixed*, learnable shape and a visible "first" signal.

**Structure and timings** (cactbot, real in-phase times):
- **P1 Fatebreaker** (0 to ~160 s; Burnished Glory enrage at 160). Cyclonic Break at 14 s, Powder Mark Trail buster at 24, Utopian Sky 35 (untargetable fog with clone mirror lines), Fall of Faith at 101, Burnt Strike towers at 141.
- **P2 Usurper of Frost** (200 to ~390 s; Absolute Zero enrage at 390). Quadruple Slap 210, Diamond Dust 236 (about 40 s long), Mirror Mirror 293, Light Rampant 333 (about 30 s long), Absolute Zero 390.
- **Intermission, Ice Veil** (~65 s). A tight add-kill with a "Gaia" crystal-preservation optional.
- **P3 Oracle of Darkness** (~490 to 672 s; Memory's End at 672). Hell's Judgment 518, **Ultimate Relativity 532 to 573**, then Shell Crusher 580, Shockwave Pulsar 588, Black Halo 597, Spell-in-Waiting Refrain 606, **Apocalypse 621 to 658**.
- **P4 Usurper and Oracle** (681 to 856 s). Darklit Dragonsong 715, Akh Morn 751, Morn Afah 761, **Crystallize Time 776 to 829**, then Akh Morn 833, Morn Afah 843, and the double enrage at 856.
- **P5 Pandora** (1030 to 1301 s). A repeating cycle: Fulgent Blade; Akh Morn; Paradise Regained; Wings Dark and Light; Polarizing Strikes; then back. Pandora's Box (a tank LB3 check) sits between cycles, then Paradise Lost, the enrage, at 1301. About 4.5 min.

**Choreography moments.**
- **Utopian Sky (P1).** Clones spawn on cardinals and intercardinals holding raised or lowered weapons; raised-weapon clones fire a line across the room, leaving two opposite sectors safe. Players mirror the clones' weapons to find which sector.
- **Fall of Faith (P1).** The party stands in a **conga line**. The boss and three Fatebreaker's Images tether four random players in order, each tether holding an element: fire (a wide cone aimed at the nearest player: a soak stack that the three people behind the tether-holder take) or lightning (three cones at the nearest three: those three spread out in a fan around the tether holder). The line groups into two parties of four, each with two tethered players; since the Magic Vulnerability debuff lasts through two tethers only, the groups **alternate** tethers. Lining up horizontally (west to east) rather than north to south was proposed in a tuufless v2 note because it makes the second to fourth tethers easier to tell apart. A 'snake that bends one tether at a time'.
- **Diamond Dust (P2).** Icicles appear in pairs on cardinals or intercardinals; the **first pair tells whether every later line and spread is aimed at cardinals or intercardinals**. The clone's kick (Axe: stay out; Scythe: stay in) is read from the enmity cast bar, not the animation. After a knockback the party **runs a puddle lap**: each light party drops four puddles while moving around the arena, clockwise-fast, clockwise-slow or anticlockwise-fast depending on where the Usurper stands relative to the party. Then the floor turns to ice (sliding), and Twin Silence / Twin Stillness force the party to step in front of or behind the clone. About 40 s from raidwide to the end; seven separate beats. A tuufless v2 note says the author would drop the coloured sectors and have the *whole party rotate clockwise*, because "consistent movement for the group" is easier than tanks anti-clockwise and DPS clockwise.
- **Mirror, Mirror (P2).** Two red mirrors (90 degrees apart) and one blue mirror stand at the wall. The blue mirror copies the boss's Scythe Kick now; the red mirrors copy it later. The party splits into two groups, **melee and tanks facing the boss opposite the blue mirror, ranged at the mirror**, so every cone avoids the other group's. Then the boss is walked to the nearest red mirror and the groups swap places. Banish III counts orbs: one orb means pairs stack, four orbs mean full spread. Reads as a *walk across the room with the boss*.
- **Light Rampant (P2).** Six players are chained in a ring (counted clockwise from a fixed player: the first tether takes the north-west tower, the second south, third north-east, and so on); two players drop five puddles each in an **anticlockwise spiral outward**; two linked players carry the Weight of Light stack; a centre four-player tower needs those with exactly two stacks. The party's whole job is to reach the right number of stacks (five wipes), so "soak count" is the hidden objective.
- **Ultimate Relativity (P3).** The best dance in the six. Hell's Judgment first drops everyone to 1 HP. Each player gets 3 to 4 debuffs on **three Fire timers (10, 20 or 30 s, Dark Fire III is a spread; one short or long becomes Dark Blizzard, a donut)**, an **Unholy Darkness** 5-stack, a **Return** (a recorded position that stuns and pulls the player back at about 39 to 42 s), and a late debuff (Dark Eruption, Dark Water, or the Shadoweye gaze). Hourglasses stand around the boss in a Y: **speed tethers** decide which resolve first (yellow, then none, then purple), and each hourglass fires a ten-hit rotating line (about 110 degrees, 10 s) at whoever baits it. Everything resolves on a **5 s beat**: Fire spreads and a 5-stack at 10 s, a Rewind drop and an hourglass bait at 15 s, the next fire and stack at 20 s, and so on to the stun at 37 s. On each beat *the party's shape alternates out and in*: short-Fire players walk to the edge, everyone else stacks in the centre; then mid-Fire players go out and the rest stack in; then long-Fire. Players record their Return spot just before the stun *based on which late debuff they hold*, so their position after the stun is planned in advance. A tip in the guides: align the hourglass frame with the black dot in your debuff icon to bait it right. The start of the mechanic is a **debuff reveal** (a minute or two of guesswork the first pull), the middle is a metronome, and the end is a **snap** (all players teleport to where they stood).
- **Apocalypse (P3).** Six white light trails sweep the floor, marking six waves of large circles; Water stacks resolve while the waves pass; a spread marker on everyone, then Spirit Taker, then Darkest Dance on the farthest player, then a radial knockback. The party starts in two boxes of four so each group has one of every timer; they step to safe patches *between the waves*.
- **Darklit Dragonsong (P4).** Refulgent Chain tethers (7 s then 14 s) with patterns (bowtie, hourglass, box) that decide who swaps. Two towers spawn north and south; those tethered take towers; non-tethered bait the Path of Light cone from the middle. The party lines up horizontally by quadrant.
- **Crystallize Time (P4).** Combines the whole fight: hourglasses with speed tethers firing Maelstroms, Dark Aero knockbacks across the arena, Dark Eruption spreads, a 5-stack, dragon heads soaked by the players with the matching Wyrmclaw, line sweeps (Tidal Light) crossing the room, Return stuns at about 40 s, and a pair of Hallowed Wings knockbacks. Everyone has a Rewind-and-Return, so positions are again planned in advance.
- **Pandora (P5).** **Fulgent Blade**: six half-dark, half-light lines form three X's; the first X to light shows direction (clockwise or counter-clockwise), each X resolves as a cascade of line AoEs, and the party stands between X's and shifts to the left or right tip of the diamond each pulse; the first lines have a late telegraph and the rest none, and the guides tell players to move on the shimmer sound of the follow-ups. **Paradise Regained**: three towers (NW, NE, S) in random order; the first is south for orientation; Wings Dark and Light fix which tankbuster pattern follows. **Polarizing Strikes**: a light stack to a random player on the boss's left and a dark stack on the right, four rounds; the front-most player of each stack gets the matching resistance debuff so the **front rotates: tanks, melee, ranged, healers**; players swap groups after their turn. This is the "dance in four counts" structure.

**DPS check and enrage.** Burnished Glory (P1), Absolute Zero (P2, below 20%), Endless Ice Age (intermission), Memory's End (P3, below 20%), Memory's End and Absolute Zero (P4), Paradise Lost (P5). The player-facing tone: the final phase is full-uptime, so movement against damage is tightest there (an unsourced tier list says so too).

---

## 7. Cross-cutting findings

### 7.1 How a mechanic steers the party (the common recipes)

1. **A reference spawn defines "north".** White dragon in Wrath of the Heavens, Omega-M's spawn in Sigma, the first tower in Paradise Regained, the Y of hourglasses in Ultimate Relativity, Charibert/Grinnaux in either order, the first icicle in Diamond Dust. One random-looking object resets the party's compass; every later move is "relative to that". The party learns **one dance and rotates it**.
2. **A timer gives each player a personal schedule.** Program Loop (16/25/34/43 s), Pantokrator missiles (12/18/24/30 s), Ultimate Relativity fires (10/20/30 s), Hello, World local timers (23 s). The gaps between timers (9 s, 6 s, 10 s) are the unit of the dance. In most of these, *two* players share each timer, so the party has fixed pairs.
3. **A resolution order the party creates.** Ifrit's nails (order of destruction), UWU. Limit Cut numbers. Fall of Faith tether order (the boss picks it; the party learns it). Tower order by In Line.
4. **A hazard that moves through the room in a fixed way.** Exaflare marching circles, Hawk Blaster rotations, Pantokrator cones, hourglass sweeps, Apocalypse trails, Cosmo Arrow cascades. The party moves *with* it: stay in its wake, step into the last-hit zone.
5. **Forced movement used as a feature.** Heavensfall Trio (back to a tower so the knockback lands in it), Sigma tower knockback (Discharger), Final Word marches, Memory Loss (Looper), Return (rewind and stun). The planned destination is learned, so the party *surrenders control* for a beat and arrives where it chose.
6. **Cascade: where you stood becomes the next hit.** Wave Cannon (follow-up line where each player was), Light Rampant puddle spiral, Liquid Hell trails, Twisters dropped at the edge, Titan's Landslide second set in the first set's gaps.
7. **The party splits and reunites on a clock.** Every phase uses two groups of four (two light parties); the split is by *role* or by *timer* so each group contains one of every timer. The reunion is the stack (a shared raid damage, a 5-stack, a donut, a chain pair).
8. **Mechanics that change who does what each round.** Hello, World's four-role rotation, Polarizing Strikes' front rotation, the debuff-resistance alternations in Fall of Faith, tank swaps. A rotation of duties keeps a repeated shape fresh and spreads risk.

### 7.2 "Stored" or delayed mechanics that look random and play the same

- **Replay in the order you did something.** Ifrit's nails to clones (UWU), and the plan's Hydra heads.
- **Recorded positions.** Rewind/Return (FRU), Memory Loss.
- **A telegraph that tells a *later* hit.** Utopian Sky clones (raised/lowered weapons), Mirror Mirror (red mirrors copy later), Fate Projection (your clone shows your fate), Ordained Motion/Stillness (a sword that sets a stance for the *next* cast).
- **A count that decides the response.** Banish III (one orb: pairs; four: spread), Pantokrator's rotating cones (direction shown on first move), Dive from Grace arrows.
- **Slow fuses.** Weight of Light, Spreading Flames (24 s), Wroth Flames, Looper timers. The debuff is a *promise*; the party can plan around it.

### 7.3 Seeding the floor

- **Puddle trails and drops:** Liquid Hell (UCoB), Twisters at the edge (UCoB, DSR), Light Rampant spirals, Wings of Salvation puddles (DSR, UCoB), Hello, World's red and blue puddles, Jagd Doll/Gaol puddles.
- **Pillars and arena edits:** Heavensfall pillars, Geocrush shrinks Titan's floor, Eye of the Storm's cyclones, Reconfiguration's centre bleed puddle plus Wave Repeater donuts, the TOP death wall.
- **Neurolink-style refuges placed early for later use** (UCoB).
- **Clones as pre-placed attackers:** Omega clones in stances, Fatebreaker's Images, Oracle's Reflection, the Frozen Mirrors, Fate Projection, Chirada and Suparna (UWU: they copy the boss's moves).

### 7.4 Phase structure, checks, enrages

- **Per-phase enrage** (almost all) with a **converted enrage** in TOP and FRU: the enrage cast is a DPS check; meeting it triggers a big raidwide and the phase change. This is a *natural* HP gate with a visible deadline.
- **Intermissions** reuse a mechanic from earlier (TEA's Limit Cut from the Savage fight, DSR's Vault, TOP's Reconfiguration, FRU's Ice Veil).
- **Cutscenes** between acts: DSR, TOP, TEA (merge into Perfect Alexander), FRU.
- **Limit Breaks as mechanics:** UWU's Beyond Limits, TOP's Dynamis/Spark, FRU's Pandora's Box. Emberfall has none of this; the Ultimate-on-T system is the nearest thing, and the plan keeps Ultimates and the Limit Break held through set pieces.
- **Dedicated "no mechanic" windows:** UWU's Tumult metronome, DSR Trinity, FRU Black Halo/Shockwave Pulsar. Tanks and healers use these for their work; DPS use them to stand still.
- **Soft fail forgiveness:** TOP and FRU let you walk into the wall to cut a 90% Damage Down to a lighter Weakness if you are not needed alive. FRU is described as a "will let you see what went wrong" fight. Emberfall's equivalent would be tuned damage, not a mechanic.

### 7.5 What players say makes the dances satisfying versus frustrating

(Evidence is thin; I could not open Reddit and several guide sites. What follows is what the sources actually say.)

- **Satisfying.**
  - Square Enix forum thread "Favorite mechanics in a fight": positioning mechanics that feel like a **dance**, Pantokrator and O8S's Forsaken named; others like **intuitive geometric mechanics you set down and watch play out** (Archive Peripheral, Mindjack).
  - Hector Hectorson (reportedly, via snippet): Nael (UCoB) and BJ/CC (TEA) as "chaotic" mechanical dances.
  - A designer's intent per RPGSite: FRU reads as "wants you to clear it", not "surmount it". The strongest sentiment in the few sources is that **mistakes should be readable** (you can see what went wrong without an autopsy).
- **Frustrating.**
  - **Tracking too many debuffs.** TOP's reputation (RPGSite). In-game, Hello, World's seven debuffs and four rotating roles were the cited example.
  - **Untelegraphed or late-telegraphed hits.** Hawk Blasters (untelegraphed circles), Pandora's Fulgent Blade (first lines late-telegraphed, the rest none, guides tell players to use the shimmer sound), Nael's quotes needing a caller, Protean Wave's untelegraphed waves.
  - **Inconsistent group movement.** The tuufless v2 note: one rotation rule for everyone is easier than tanks going one way and DPS the other.
  - **Imprecise movement.** Ice sliding on a controller (the guide recommends a macro).
  - **Overcorrection:** tanks and healers with little to do (a thin-pressure criticism of FRU).
- **"Reading from the floor vs memorising."** The sources agree that nearly every Ultimate is *memorised from a guide*; the real UX difference is in what the guide reduces to. The most learnable ones have **a single first signal** (the first icicle, the first X, the first tower, the white dragon) and one rotation. The least learnable stack a *new* rule on every beat.
- **The "solve" moment.** From the forum and guide notes: the click comes when a player realises the 5 s beat (Ultimate Relativity) or the 6 s gap (Pantokrator) and stops reading each debuff and starts moving with the music. The plan's Fixed-and-learned approach fits that.

### 7.6 Cast lengths and gaps (from the cactbot files)

| Beat | Typical |
|---|---|
| Raidwide opener | 10 to 15 s into a phase |
| Mechanics within a phase | every 8 to 15 s between named moves (FRU P3: 580, 588, 597, 606 s) |
| One big sequence | 30 to 45 s long (Ultimate Relativity 41 s, Diamond Dust 40 s, Light Rampant 30 s, Pantokrator 30 s, Crystallize Time 53 s) |
| Beats inside a sequence | 5 s (Ultimate Relativity), 6 s (Pantokrator), 9 s (Program Loop), 3 to 4 s (Fall of Faith) |
| Debuff fuses | 10 to 43 s |
| Phase length | 2 to 5.5 min |
| Enrage cast | 10 to 30 s (TOP's final enrage ~30 s), a few seconds for early ones |
| Cycle length in loops | ~80 s (DSR P7), ~90 to 110 s (FRU Pandora) |
| Trios | every 40 to 60 s (UCoB) |
| Tankbusters and raidwides | every ~15 to 30 s *between* sequences in the late phases |

---

## 8. Patterns that translate

**Constraints for Emberfall** (from CLAUDE.md and the plan): top-down; 4 heroes (tank, healer, 2 DPS); red is damage, blue is stack or soak; safe spots are never painted; no teaching text in-fight; random targets shown in full before they resolve; no interrupts; Ultimate is fixed (no shuffle); the party should be able to read a full chain's *next* strike, not the whole chain. A tag marks the ones where the party moves as a choreographed unit: **[DANCE]**.

Where a pattern needs a number, a letter or a symbol over a head, that is a marker, not an instruction; every pattern below keeps the instruction in the world, not in text.

### 1. Numbered towers, in order [DANCE]
- **Source:** Program Loop (TOP P1); also Dive from Grace (DSR P3), Limit Cut (TEA).
- **There:** every player carries a timer (16/25/34/43 s) that is also an order; pairs of yellow towers appear in sequence and each is soaked in order; wrong order wipes the raid.
- **Emberfall:** four heroes, four **sigil-numbered rings** over their heads (one to four pips, drained like Hrimgar's ring). Blue soak towers rise in the order of the numbers, and the tower for number N glows in the colour of hero N a beat before it is soakable. Soaking in order is the whole fight; a wrong soak is a raidwide, not a wipe. Gaps about 6 to 8 s (a human needs time to run). The healer's number is in the middle so the healer is never the one running furthest.
- **Fit:** the Sovereign's Pyre (numbered blink-cut) could use this as its soak half.

### 2. Orbit with breakaways (Pantokrator) [DANCE]
- **Source:** Pantokrator (TOP P1).
- **There:** two cone AoEs on opposite sides rotate (direction hidden until they start); the party stacks in two groups of four and **orbits** to stay out of the cones; the player whose missile expires leaves the stack, takes it alone, and returns; the stack soaks a heavy line together.
- **Emberfall:** all four heroes stack. Two red wedges sweep around the Sovereign, one direction per cast, revealed by the first inch of movement (this is a hidden *direction*, not a hidden tell; the wedge itself is fully painted). Four countdown rings at 6 s apart: when a ring ends, that hero pops a red circle on themselves that kills whoever stands inside, so they step out one pace before, and back in. A blue stack-line goes to a random hero (shown for the whole cast). About 24 s. **The most user-matching pattern.**

### 3. Beat-based debuff alternation, out then in then out [DANCE]
- **Source:** Ultimate Relativity (FRU P3).
- **There:** each player has a Fire timer (10/20/30 s); on each 5 s beat, the player whose timer ends spreads out and everyone else stacks in the centre. Three fires, three stacks, then a snap.
- **Emberfall:** each hero has an ember ring (short, middle, long). When it ends, a red circle bursts on that hero, so they step to the edge on the beat; the other three share a blue stack. With four heroes it is three beats of "one steps out, the other three huddle", and the fourth hero (the tank) has the long one so the tank is the last out. The *rhythm* is the dance: 5 s in, 5 s out. Combine with the Sovereign's drum (a visible pulse on the floor at 5 s) so the rhythm is audible and visible without text.

### 4. Record a spot, get pulled back (Rewind) [DANCE]
- **Source:** Ultimate Relativity's Return and Rewind; Crystallize Time.
- **There:** a player's position is recorded; at the end they are stunned and teleported back; so they *choose* where they will be at the end, and the other debuffs resolve around that.
- **Emberfall:** each hero plants a **glowing pin** (a visible ghost of them, with their own ring) at the start. At the timer, they snap back to it. Their ghost's own marker shows what they will be (a stack, a spread, or a gaze). Because the end position is shown from the beginning, the player can *build the final picture early*. Everything shown; the party just plans the route.
- **Cost:** needs a "pull-back" effect in the engine; cheap in a top-down game (a teleport with a trail).

### 5. Conga-line tethers [DANCE]
- **Source:** Fall of Faith (FRU P1).
- **There:** the party stands in a line; the boss tethers four players in order; each tether has an element: fire means the three players behind the tether-holder stack, lightning means three cones go at the nearest three, so those three spread in a fan; the line bends to resolve each tether in turn.
- **Emberfall:** four heroes stand in a row. The Sovereign ties its **ember line** to the first hero, then the second, and so on (each tether visible for its full length). A **fire** tether means a wide red cone aimed at the nearest hero, so the others stack behind them and share it; a **lightning** tether means three narrow cones and a fan spread. The line snakes across the room, one bend per 4 s. A human-sized version of the dance: "walk the snake".

### 6. First-signal compass reset (random-looking, fixed shape)
- **Source:** Diamond Dust icicles (FRU P2); Heavensfall (UCoB); Wrath of the Heavens (DSR); Paradise Regained (FRU P5).
- **There:** the first pair of icicles lands on cardinals or intercardinals and all later lines, spreads and safe positions are aimed at that same frame; a spawned dragon defines north; the first tower is south.
- **Emberfall:** one object (a pillar, a statue, a sigil lighting) appears at a point; every later hit in the sequence is on the *same* rotated frame. The Sovereign's Dance always does the same 4-move choreography, rotated by the first signal. The fight is 100% fixed (the user's call), so the rotation is **scripted per act**; the party learns "this signal means this angle". This gives Act IV the "same dance, new angle" feel for free.

### 7. Follow the trail (exaflares) [DANCE]
- **Source:** Exaflare (UCoB P5; DSR Exaflare's Edge; TOP Unlimited Wave Cannon); Hawk Blaster rotations (TEA); Apocalypse light trails (FRU).
- **There:** circles or lines march across the arena in a visible pattern; the spot they just left is safe; the party walks with the wave.
- **Emberfall:** Hrimgar's Glass Floor already does this (a crack ripples). Generalise: **a line of embers lights up in sequence along a path** (each ember painted red as it is about to burst); the last-burst ember is clean. The whole party walks the path one step behind it, and a second path can cross at an angle (the dance's turn).

### 8. Cascade: your standing spot becomes the next hit
- **Source:** Wave Cannon (TOP P4), Wave Repeater, Liquid Hell, Light Rampant's spiral puddles, Titan's second Landslide.
- **There:** each player is hit by a line; a second line appears at their previous position a few seconds later. Puddle trails are laid wherever the dropper walked.
- **Emberfall:** each hero gets a red line and, 3 s later, a **ghost line** at the place they stood. The party spreads (the first line), then moves to stack (the blue stack), then moves *out of* the ghost lines. The Ultimate's Scatter and Cupped Ember could chain this way. Keep it as a pair, not a long chain (the plan's "show the next strike of a chain").

### 9. Four-role cycle [DANCE]
- **Source:** Hello, World's four-role cycle (TOP P3).
- **There:** four roles (defamation, blue tether, stack, red/green tether), each passed to the next player at each round, so everyone does every job.
- **Emberfall:** four roles, four heroes: **spread, tether, stack, bait**. Each round the roles pass one step around the room (clockwise), so the same dance is performed with each hero in a different seat. It makes 4 rounds feel like 4 different problems with one rule. Excellent for a fixed fight where we need to extend length without new vocabulary. The "pass" is shown by the role-marker travelling in a visible arc from hero to hero.

### 10. Mirror and replay (Mirror Mirror) [DANCE]
- **Source:** Mirror Mirror (FRU P2); Utopian Sky clone mirror lines; Omega clones in stances.
- **There:** a blue mirror copies the boss's attack now; red mirrors copy it later; the party splits to the two sides (one group at the boss, one at the mirror) and then both groups move to the next mirror. Clones hold raised or lowered weapons to say where the line goes.
- **Emberfall:** matches the plan's Hollow King's knights (replay the Sovereign's last Sweep from the far side a beat later) and Corvane's stance. The extra step to take: **walk the boss to the mirror** (the tank carries the Sovereign across the room while the others cover the other side), so the party relocates as a unit.

### 11. Own-clone preview (Fate Projection)
- **Source:** Fate Projection alpha and beta (TEA P4).
- **There:** each player's own clone shows what will be done to them (gears, pulse, stacking gears); the party solves the mechanic by standing relative to its clones. Only players with a certain buff see the clones.
- **Emberfall:** after a call, **four ghost copies of the heroes** appear in a ring, each with its marker (a red ring, a blue ring, a gaze). The party sees the whole upcoming pattern and walks into the ghost that is theirs (a different position from where they stand). All seen, nothing hidden. Telegraph-friendly because the *future is the telegraph*. It is the Ultimate's "learn by watching" move.

### 12. One bait per round, front rotating (Polarizing Strikes)
- **Source:** Polarizing Strikes (FRU P5); Pandora's Fulgent Blade.
- **There:** a light line goes to the player in front of the left stack and a dark line to the right; whoever is in front gets a matching resistance debuff, so next round someone else must be in front; the front passes tanks, melee, ranged, healers.
- **Emberfall:** two stacks (one blue-silver, one ember-red) on random heroes; the closest hero to the boss takes a "burn" that makes the next hit of the same colour deadly, so the front **rotates**. Four rounds, four fronts. This is a dance of order; it teaches the party "swap".

### 13. Direction reveal by first pulse (cw or ccw lines)
- **Source:** Fulgent Blade (FRU P5); Pantokrator cones.
- **There:** six lines in three X's; the first X to light shows clockwise or counter-clockwise; each X cascades outward; the party stands in the diamond and shifts left or right tip per pulse.
- **Emberfall:** three X-shaped line sets; the first to flare names the rotation; the other two follow in order; the party shifts one slot per pulse. It is a **dance in three counts with a visible cue**. Fully painted (red lines), and fixed per act.

### 14. Cardinal/diagonal tower knock-in [DANCE]
- **Source:** Heavensfall Trio (UCoB); Sigma (TOP P5); Burnt Strike (FRU P1).
- **There:** towers need a specific number of soakers (1 to 4); a knockback is used to place players into towers; players stand with their back to the tower.
- **Emberfall:** three blue towers needing 1, 1 and 2 heroes (four heroes in total); a shown **arrow knock** pushes each hero a step toward a tower, so the player decides their facing, not their path. Fail by under-soaking (raidwide) rather than wipe.

### 15. Doom-and-cleanse puddles [DANCE]
- **Source:** Wings of Salvation and Doom (UCoB light dragon, DSR Death of the Heavens).
- **There:** four players have Doom with different timers; white puddles appear (made by non-doomed players); only the doomed can use them; a non-doomed player stepping into one consumes it and kills someone.
- **Emberfall:** this is the plan's lantern. Doom on one or two heroes, a **lantern** carried by the others that lights a puddle where they stand; the doomed run to the light. A dance of *two heroes running to meet a third*. Shown fully (the timer is a ring; the puddle is blue).

### 16. Contact / escape drift (forced march)
- **Source:** Final Word's Contact/Escape Prohibition (TEA P4); Memory Loss (TOP P1).
- **There:** after a timer, players are moved automatically toward or away from a marked player; the rest of the party sets up rows so the marches do not collide.
- **Emberfall:** Volkar's magnetism, made into a one-time march. Two heroes drift toward a third; the party lines up so their lanes do not cross. For safety against frustration, make it a slow drift (not a teleport) with the full path painted as a faint trail, and never lethal on contact (a hit and a stun, not a death).

### 17. Stance sword for a whole cast
- **Source:** Ordained Motion/Stillness (TEA P4); Ice/Flame of Ascalon (DSR P7) in/out.
- **There:** a white sword means keep moving; a black one means stand still; or a sword's element names in vs out.
- **Emberfall:** a **flare or a gutter** in the Sovereign's blade tells the whole party to keep moving or stand still for the next cast (movement-coded damage that is visible in the floor: "the floor burns where you stop" or "the floor burns where you move"). The same cue as Hollow King's call-and-response. One party-wide behaviour; zero text.

### 18. Pair-distance tethers (near or far)
- **Source:** Mid/Remote Glitch (TOP P2); Local/Remote Code Smell (TOP P3); House Arrest/Restraining Order (TEA).
- **There:** pairs must stay within or beyond a distance for a duration; breaking the pair on cue (move together or apart) is the resolution.
- **Emberfall:** two pairs: a blue tether (stay near; shown as a thick line) and a red tether (stay apart; the line thins and glows red as it stretches). The party's shape is a *diamond* the whole fight. With 4 heroes, the arrangement is mostly decided by who is paired with whom: choose the pairing so the tank and healer are a near pair and the DPS a far pair.

### 19. Rotating blast pairs (Limit Cut) [DANCE]
- **Source:** Limit Cut and Hawk Blasters (TEA); Pyre-like numbered cuts.
- **There:** the boss dashes to numbers 1, 2, 3, ... in order; rotating explosion sets lap the arena clockwise, then move to the centre and repeat on the outside; the party runs in two groups around the explosions.
- **Emberfall:** matches Pyre. Add the **two rotating circles** that lap the room; the numbered heroes are chased by the dash while the party runs inside the rotation. The party runs a clockwise lap on the inner ring, then the outer, a circle dance of about 25 s.

### 20. Order-of-doing becomes the replay [DANCE]
- **Source:** Ifrit's nails (UWU P2); also Bahamut's Octet order.
- **There:** the party picks the order in which four nails are destroyed (raidwide plus a vulnerability each); Ifrit's clones later charge in *that* order.
- **Emberfall:** the Hydra's heads (in the plan already). Wider use: **any "cut" or "break" the party makes in an early act replays in its original order in a later act** (Skitterra's threads cut, Hrimgar's sheets sunk, Morrow-Oak's holes). This is the best "learn once, perform later" device in the six: the later act is *the party's own story played back*.

### 21. Shrinking floor (resource edit)
- **Source:** Eye of the Storm (UWU Garuda), Geocrush (Titan), Reconfiguration's centre puddle (TOP).
- **There:** cyclones eat the edge; the arena shrinks; a centre bleed puddle forces the party to the rim.
- **Emberfall:** matches Act IV's holes. Edit the floor *within* one mechanic (a ring of embers closing in from the edge, a pool in the centre that fills slowly), so the party's lane gets narrower and the same dance has less room each time.

### 22. Remix phase on a timer stack (the late game)
- **Source:** TEA Wormhole; UCoB Trios; TOP Dynamis (Delta/Sigma/Omega); FRU Crystallize Time; UWU Ultimate Predation.
- **There:** earlier mechanics all fire in one sequence on a **staggered schedule** (each new beat arrives as the last resolves); the phase's name is its recombination ("Trio"). The recombination reuses the exact same resolution pattern as the original, so the party recognises each.
- **Emberfall:** the plan's Act IV is this. The lesson: **every call in the remix arrives on the same beat as in its first appearance** (use the same number of seconds from tell to hit), so a veteran can see 3 old rules on one clock. UCoB shows a cadence of one Trio every 50 s with ordinary attacks between.

### 23. DPS-check enrage converting to a raidwide
- **Source:** TOP and FRU (Blue Screen, Absolute Zero, Memory's End).
- **There:** a long named cast; below 20% HP before it ends: a big raidwide and the phase advances; above: wipe. A single slow bar is both the check and the cinematic.
- **Emberfall:** each act's HP gate could have a **visible final cast** (a halo closing) that is the wipe if the gate isn't hit, but is converted into the set-piece (Kindling, Rebirth) if it is. It tells the player the soft deadline *without text* (the cast name is the warning). The plan has "one named enrage with about a minute of slack"; this is a per-act version at ~3 min each.

### 24. Soak-to-cleanse colours
- **Source:** Hello, World red/blue rot; Judgment Nisi colours; Fire and Ice dragons (UCoB); Delta's coloured fists.
- **There:** a coloured debuff that spreads or is cleansed by an opposite or matching colour; a colour crossing kills.
- **Emberfall:** Volkar's fire/ash charges are already this; extend with **puddles in the two colours** that cleanse a charge. Keep it to one rule per act, because TOP's "too many debuffs to track" was the most-cited frustration.

### 25. Good play feeds the boss, and a prepared perk for later
- **Source:** Awakening stacks and Beyond Limits (UWU); Neurolink (UCoB).
- **There:** resolve a mechanic correctly and the boss gains a stack (becoming Awakened at four), which both makes the boss stronger and grants a key item later; a puddle placed in Phase 1 is what keeps a player alive in Phase 4.
- **Emberfall:** *a risk-reward for the Hollow King's lantern*: carrying the lantern through a call makes the next call's tell shorter (it is hotter) but gives the party a refuge in Act IV. **Caution:** a refuge ring is a painted safe spot, which the design rule forbids unless it is framed as a soak. Treat as optional.

---

## 9. What does not translate

- **Two bosses with HP-gap lethal stacks** (Akh Morn, Morn Afah, Akh Afah, Hand of Pain): needs both a second boss and enough DPS to balance. With 2 DPS it would be a chore.
- **Hard-coded Limit Break checks** (UWU Phase 4, TOP Phase 6): Emberfall has no shared limit gauge.
- **Eight-player role splits** (two light parties): collapse to "all four" or "two pairs".
- **Cutscene-gated progress with phase-skip on kill speed** (E5S-style): Emberfall's HP gates already do it.
- **Untelegraphed late-cast lines** (Hawk Blaster, Pandora's first lines, Nael's quotes without a caller): forbidden by Emberfall's telegraph rule, and the most-cited frustration in the sources.
- **Enrages that kill players in order of damage** (UWU): not tasteful; the plan's Emberfall enrage is better.
- **Dozen-debuff tracking:** TOP's Hello, World is the cautionary tale. A hero should never carry more than two things.

## 10. Fit with the plan (notes, not edits)

- The plan's Act I through IV are about 3.5 to 4.5 min each, about a real phase; Ultimates use *per-phase* enrages and checks, while the plan has HP gates with one final enrage. A converted-enrage per act (pattern 23) would add the Ultimate feel at low cost.
- The plan's strongest asset (the Hydra wall) is the same trick as UWU's Ifrit nails (pattern 20). Extend it: every act's calls could leave a *record* the next act replays.
- The plan's Sovereign's Dance (afterimages laying out a sword dance) already matches Pantokrator and Ultimate Relativity in spirit; the missing ingredient is **a personal schedule per hero** (patterns 1, 3, 4), which the plan so far gives mostly to Brand, Doom and the lantern.
- A 5-second beat (pattern 3) and a 6 to 9 s gap (patterns 1, 2) are the numbers to match to a human party in a top-down game; the timeline's 10 to 15 s gaps between calls leave the dance blocks as the exception.
- Per-act cadence: the real Ultimates give *one* long set piece (30 to 55 s) per 2 to 3 minutes, and the rest is single moves. Emberfall's four acts each want one such block.

---

## Sources

- https://ffxiv.consolegameswiki.com/wiki/The_Unending_Coil_of_Bahamut_(Ultimate)
- https://ffxiv.consolegameswiki.com/wiki/The_Weapon%27s_Refrain_(Ultimate)
- https://ffxiv.consolegameswiki.com/wiki/The_Epic_of_Alexander_(Ultimate)
- https://ffxiv.consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
- https://ffxiv.consolegameswiki.com/wiki/The_Omega_Protocol_(Ultimate)
- https://ffxiv.consolegameswiki.com/wiki/Futures_Rewritten_(Ultimate)
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
- https://raw.githubusercontent.com/OverlayPlugin/cactbot/main/ui/raidboss/data/04-sb/ultimate/unending_coil_ultimate.txt
- https://ffxiv.tuufless.com/static/fru/ (index, with the v2.0 change notes quoted in the sentiment section)
- https://ffxiv.tuufless.com/static/fru/02_usurper_of_frost/
- https://ffxiv.tuufless.com/static/fru/03_oracle_of_darkness/
- https://ffxiv.tuufless.com/mana/dsr/05_alternate_thordan/
- https://www.thebalanceffxiv.com/jobs/casters/red-mage/fight-tips/futures-rewritten-ultimate-rdm-guide/
- https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-5-pandora (search snippet only; fetch blocked)
- https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-1-guide (search snippet only; fetch blocked)
- https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-limit-cut (search snippet only)
- https://www.rpgsite.net/feature/16994-final-fantasy-xiv-dawntrails-futures-rewritten-ultimate-raid-was-what-the-raid-scene-needed-for-now
- https://forum.square-enix.com/ffxiv/threads/404902-Favorite-mechanics-in-a-fight (search snippet)
- https://www.mmogah.com/ar/news/ffxiv/ffxiv-ultimate-raid-tier-list-from-easiest-to-hardest-2025-edition (commercial source; used only for the "UWU easiest" remark)
- Reddit AMA with Hector Hectorson, r/ffxivdiscussion (search snippet via a mirror; thread not opened)
