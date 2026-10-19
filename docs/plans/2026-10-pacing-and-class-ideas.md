# Pacing models and more class ideas (draft, 2026-10-19)

> **Mostly shelved.** The user felt these don't fit the game, except **Ironpalm** (the fighting-game combo tank), which they liked: it joins wave 2 of the new classes alongside the seven in `2026-10-new-classes.md`. The rest are kept for reference only.

## GCD or not: have both

The 2.5s global cooldown is one way to pace a class, not a rule of the game. It's why the current nine read well and balance easily: every class does about one "real" action per 2.5s, so damage per second is easy to compare, bots are simple, and nobody wins by mashing.

The engine already supports more than that. Each ability is typed `gcd` or `ogcd`, and `recastGcd` can change the GCD length per ability. So a class with **no GCD** is just a class whose abilities are all off the GCD and limited by something else. Kits run on each player's machine and report results to the host, so input-heavy styles (timing, holding, drawing) cost nothing extra on the network.

**What every pacing model needs to replace what the GCD did:**
1. **A limiter** so mashing isn't optimal: a draining resource, charges, commitment (long animations you can't cancel freely), a rhythm, or a timing window.
2. **A damage-per-second budget** in the same currency as everyone else (potency per second), so `tools/simulate.js` can still balance it against the other classes. Each model gets its own "pro" rotation in the sim.
3. **Bot behaviour** for that model, so `check.js` keeps clearing bosses.

**Proposed: a `pacing` field per class.** The default is `cadence` (the GCD), with new models added one class at a time:

| Pacing | Limiter | Feels like |
|---|---|---|
| **Cadence** (current) | 2.5s GCD plus oGCD weaving | FF14: a planned rotation |
| **Freeflow** | A fast-draining resource; no GCD | Action games: bursts, then catching your breath |
| **Commitment** | Long, mostly uncancellable swings with cancel windows | Monster Hunter: every swing is a decision |
| **Charge** | Hold to charge, release on time | Bows and great swords: timing is damage |
| **Combo** | Input strings with timing windows that branch | Fighting games |
| **Rhythm** | A beat: on-beat presses are empowered | Rhythm games |
| **Hand** | Cards drawn into a hand, played freely; reshuffle downtime | Deckbuilders in real time |
| **Program** | Queue commands ahead, then a machine runs them | Planning against the upcoming-moves feed |
| **Gesture** | Draw a shape with the mouse; the shape is the spell | Black & White, Okami |
| **Beam** | One always-on steerable channel, limited by heat or fuel | A flashlight that heals |

The seven classes already designed mostly fit **Cadence** as written. Two would arguably feel better freed from it: **Driftblade** (Freeflow, with Drift as the limiter) and **Marionettist** (Doll commands off the GCD, since the Doll's actions take their own time).

## More class ideas

Each one is built around a different pacing model, so they don't just play differently, they *feel* different in the hands.

### Ironpalm: tank, Combo
A barefoot monk-brawler with iron knuckle wraps. **Light / Heavy / Kick** on Q W E, no GCD. Strings of presses inside a short timing window become named moves: L-L-H is **Rising Gate** (a launcher, adds threat), H-K-K is **Tiger Wall** (a block stance), L-K-H-H is **Thousand Palms** (a finisher). Dropping the window resets the string. The limiter is **Breath**: every press costs a little, and breath refills while you aren't pressing. **R Read** is a parry stance: catching a tankbuster in its last 0.4s cancels half of it and opens a free finisher.
- *Specs:* **Still Water** (parry-focused; perfect reads refill Breath), **Avalanche Fist** (longer strings get stronger the longer you go, but a dropped string staggers you).

### Colossus: tank, Commitment
A giant in stone armour with a slab of a maul. Every swing is a 1 to 2s commitment you can only cancel into **Brace** (block). It's slow and enormous: a full swing does what a current tank does in three GCDs. **Charged slams reshape the floor**: they leave rubble walls (solid props from the arena plan) that the party can use as cover. On a map-mechanics boss, the tank builds terrain.
- *Specs:* **Earthshaker** (more rubble; walls block boss lines), **Anvil** (Brace becomes the main tool; a held Brace stores the hits it takes and releases them in the next swing).

### Cardsharp: DPS, Hand
A gambler-mage in a long coat, cards fanned between his fingers. Your abilities form a **deck** (each ability appears 2 to 4 times). You hold a hand of 4 and play any card instantly, with no GCD, but each card has a short flourish. When the deck runs out, you **shuffle** for 3s and can't play anything. Talents and items add, remove or upgrade cards, so your deck *is* your build. Playing three of the same suit in a row triggers a bonus.
- *Specs:* **Stacked Deck** (you see the next 3 cards and can discard one), **High Roller** (a Joker card in the deck copies the strongest card in your hand, and shuffles are faster but random).

### Gearwright: DPS, Program
A tinkerer with a walking brass automaton. You punch up to 4 commands into a **program card** (Laser, Saw, Mortar, Shield Drone, Vent...), then **wind the key**. The automaton runs the program in order over the next 8s while you're free to move, dodge and punch the next card. Adjacent commands combo: Mortar then Laser fires a **Spotted** shot, Vent then Saw makes the saw red-hot. This works directly with the upcoming boss moves display: you schedule your burst for the window where the boss is pinned.
- *Specs:* **Overclock** (3-slot programs that run twice as fast), **Long Program** (8 slots and more combos, but the automaton stalls if hit by a mechanic mid-run).

### Bellwright: healer, Rhythm
A bell-ringer with a carillon of small bronze bells on a yoke. A **tempo** ticks on the HUD (and as a soft chime). Heals pressed **on the beat** land 50% stronger and build a **Peal** streak. Off-beat heals still work, but they break the streak. At a 10-beat streak the tempo speeds up. Raidwides are where you hold the rhythm under pressure. No GCD: the beat *is* the pacing. It's judged on your own machine, so latency doesn't matter.
- *Specs:* **Toll** (slow tempo with huge single heals), **Carillon** (fast tempo with small heals that chain to the next ally).

### Glyphwright: DPS, Gesture
A young scribe with ink-stained hands and a floating quill. Hold **left mouse** and draw a shape to cast: a **line** is a lance, a **circle** a ring blast, a **zig-zag** chain lightning, a **triangle** a ward, a **spiral** a pull. Drawing faster casts sooner, and drawing cleaner is stronger (shape accuracy is scored). Q W E R add an element or modifier to your next glyph. No GCD: the limiter is the drawing itself, plus **Ink**.
- *Specs:* **Calligrapher** (slow, precise and huge; a perfect stroke crits), **Scrawler** (sloppy shapes still count, and chaining glyphs within 1s stacks them).

### Lanternkeeper: healer, Beam
A lighthouse-keeper with a great brass lantern on a pole. **Hold Q** to project a beam that you steer with the mouse. Allies in the beam are healed every tick, and enemies are burned. The beam is limited by **Oil** (it drains while on, refills when off) and **Heat** (holding a narrow focus overheats). E widens the beam (weaker, covers the party), R narrows it (strong, single target). No GCD at all. It's about where you point.
- *Specs:* **Prism** (the beam splits into two you steer apart), **Lighthouse** (plant the lantern; it sweeps on its own while you heal by hand).

### Harpooner: DPS, Freeflow plus physics
A whaler with a coil of rope and a long-hafted harpoon gun. Harpoons **stick**: into the boss, into adds, into the floor and walls. Each one stays tethered to you by a rope. **Reel** pulls you to whatever the harpoon is in (mobility), or pulls the add to you. A rope stretched across the room is a **tripwire** for adds. Up to 3 ropes at once. The limiter is **Rope** (charges). No GCD.
- *Specs:* **Whaler** (reel the boss itself a short way, so the tank and the Harpooner can drag it out of a bad spot together), **Rigger** (ropes between props become ziplines anyone in the party can ride).

## If you only take a few
- **Ironpalm** and **Bellwright**: the biggest change in how the game *feels*, and both are cheap for the engine (all kit-side).
- **Gearwright**: the best fit with the upcoming-moves feed you already have.
- **Glyphwright**: the most original, but also the riskiest. Gesture recognition and the right-click-to-move controls need a prototype first.
