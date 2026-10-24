# The Reaper rework: Scythe Evie (2026-10-24)

The Reaper (class id `thresher`) is rebuilt from scratch, inspired by Vindictus's Scythe Evie. It replaces the current Weight and afflictions kit. Nothing of the old kit has to survive except the class id, its save data and its place in the roster.

**Role:** melee DPS with a mid-range reach, half support. Its personal damage sits a little under the other DPS, and **Insane Reaper**'s party haste makes up the difference. Target: a raid index of about 0.93–0.95 on its own, about 1.0 once the haste it gives the party is counted.

**Look:** inky black smoke with blue lightning, as in Evie's Void Star. Finishers leave ink slashes, marks are small blue runes, and Snap pops them in blue sparks.

## Kit

| Key | Ability | Type | What it does |
|---|---|---|---|
| Q | **Scythe String** | GCD string | Up to 4 quick swings: (1) rising cut, (2) backhand sweep, (3) overhead spin, (4) reaping circle. Mid range (about 1.5× melee reach), in arcs. The whole string plus its finisher counts as **one GCD**: the GCD starts when the string ends (a finisher, or about 1 s without a press). Short strings leave room to move, long ones hit harder. |
| W | **Finisher** | ends the string | What it does depends on how many swings came first, and each leaves its own mark. **QW:** a hooking cut, **Drain** mark (Snap heals you a little). **QQW:** the blade driven into the floor in a small quake ring, **Bind** mark (adds are held in place briefly; on a boss, it's just the mark). **QQQW:** a line skewer, **Death Mark** (your next few hits strike harder). **QQQQW:** a wide sweep, **Thread** mark on everything in the arc, adds included. |
| E | **Snap** | oGCD, short cooldown | Detonates every mark on every enemy, each popping its own way. All four marks on one target at once gives a **Full Harvest** (an extra burst). Fills the crescent gauge. With a full crescent, the next Snap is a **Harvest Moon**: it pops every mark twice. |
| R | **Void Star** | oGCD, about 30 s | A void of black smoke with a blue lightning core opens at your target. It **pulls nearby adds in (never the boss)**, then collapses and damages everything around it. It hits harder for every mark on the target, without using them up. It adds a chunk of Arcane Gate charge and gives back a blink charge. Drawn under telegraphs and the boss: it never hides a tell. |
| D | **Dusk Veil** | oGCD, defensive | A dark cloak: take less damage for a few seconds, and get a blink charge back. |
| F | **Insane Reaper** | oGCD, 60 s (the class's burst buff) | Evie's frenzy. The party gains **10% haste for 15 s** (its own `rhaste` party buff kind, added to the Chronomancer's Accelerando: **they stack**, capped at 35% in all; the user's call, 2026-10-25). The Reaper's own swings come faster during it too. It lines up with every class's 60 s burst. |
| Space | **Blink** | the class's dash | A clean teleport-dodge, the Reaper's alone (2 charges, like the shared dash). Blinking doesn't break the string. |
| T | **Arcane Gate** | Ultimate (window, about 8 s) | You phase out as it opens (untargetable for the lock). In the window the string runs to **five swings**, and each of the first four that hits applies an **empowered** mark, in order: Drain, Bind, Death Mark, Thread. If all four land within the time limit you become **Gatebreaker** (stronger finishers and Snap until the window ends). **The fifth Q is the release: an enhanced Snap that pops every empowered mark at once.** |

**Gauge:** a crescent moon (gauges never use a plain bar). Snaps fill it. A full crescent makes the next Snap a Harvest Moon.

**Ultimate charge:** gained from Full Harvests, from Void Star (the Vindictus link: Void Star shortens Arcane Gate), and from the passive trickle. Target fill: about 90 s for a pro and 120 s for a newcomer.

**For newcomers:**
- Q glows at all times.
- W glows on the fourth swing.
- E glows once two marks are up, or with a full crescent.
- R glows when there are marks on the target.
- F glows in the party's burst window.

Mashing the glowing buttons plays QQQQW, then Snap, which is a full working rotation. An expert picks shorter finishers to fit mechanics, builds all four marks for a Full Harvest, and times Void Star on a stack of marks.

**Taunt and threat:** not a tank, so no taunt carrier.

## Talents (rows I–V)

Each talent is new behaviour; Long Reach is the class's one plain-number talent.

| Row | A | B |
|---|---|---|
| I | **Lingering Star:** Void Star's collapse can re-seed one mark. The chance goes up with each mark on the target, so it can be steered. | **Twin Stars:** Void Star holds two charges, each a little smaller. |
| II | **Step Through:** blinking through a telegraph makes your next Q start at swing 2. | **Long Reach:** a bit more scythe range. |
| III | **Gathering Threads:** Thread marks pull adds together when they pop. | **Open Vein:** Snap spreads Drain to nearby enemies. |
| IV | **Patient Death:** marks last longer, so all four can be built before a Snap. | **Quick Harvest:** Snap comes back sooner but pops only the oldest mark. |
| V | **Moonrise:** a full crescent makes your next blink a slash through its path. | **Grave Ward:** Dusk Veil heals you for each mark you've snapped recently. |

## Specs (rows VI–VII each)

**Dancer, the Long Waltz:** long strings. The four-swing finisher is much stronger, and a string can be held a little longer between presses.
- VI: **Encore** (after QQQQW, the next string starts at swing 2) or **Pirouette** (swing 3 spins and hits all around you).
- VII: **Danse Macabre** (a Full Harvest leaves a dancing scythe that swings once more) or **Unbroken Step** (a blink adds a swing to the string, not just keeps it).

**Phantom, the Vanishing Edge:** blink chains. Blink has one more charge. After a blink, W becomes a teleport slash to the target's far side that leaves a Phantom mark (popped by Snap like the others).
- VI: **Afterimage** (a blink leaves an afterimage that repeats your next finisher) or **Shade Step** (a blink leaves a short dark field that slows adds).
- VII: **Flicker** (blinking through a telegraph refunds the charge) or **Vanishing Point** (Void Star opens where you last blinked from).

## Look and sound brief (one line each)

- **Swings 1–4:** a rising cut with a thin ink arc, a backhand sweep with a wide low arc, an overhead spin as a full ink circle, a reaping circle with a large arc and a blue edge.
- **Finishers:** QW a hook flick that leaves a blue Drain rune; QQW the blade into the ground with a cracked-ink ring; QQQW a long skewer streak with blue sparks; QQQQW a huge sweep with blue threads trailing to every target.
- **Snap:** the Reaper snaps their fingers, and each rune flashes and bursts in blue sparks, with a different pop per mark. Full Harvest adds a ring of ink. Harvest Moon adds a crescent flash.
- **Void Star:** smoke spirals in over about 1 s around a blue spark at the core, with lightning crawling over it, then the core flares and blows into an ink ring with blue arcs. A short hit-stop. Sound: an inward hum, then a deep muffled boom with crackle.
- **Insane Reaper:** a red-black aura flares around the Reaper, and the party gets a small blue flicker. Sound: a sharp scythe whine.
- **Blink:** a blue-black smear, gone and back.
- **Arcane Gate:** the world tints violet, the Reaper phases (half-transparent), each empowered mark is a larger rune, and the fifth swing's release is a big blue-white burst.
- **Icons:** prompts for 9 icons (6 skills, blink, Ultimate, gauge) to be added to `docs/art/icon-prompts.md` in the build.

## Build plan

Three stages, the same as the Tidecaller template: kit first, then look and sound, then content.

1. **Kit:**
   - The string engine (a multi-press GCD-slot string with a finisher that branches on its count) is new. Build it in `engine.js` with a narrow API, and try it on the town dummy first.
   - Marks, Snap, Void Star's add pull (reuse `FightSim.knock`, or the pull the Skitterra reels use), and the Blink dash override for this class.
   - The Arcane Gate window with five swings, specs, talents, the bot, simulate policies, and the baseline.
   - Retire the old Weight kit cleanly. Old talent picks reset, and the save keeps the class.
2. **Look and sound:** the briefs above, the hero art (scythe), the crescent gauge, and sounds checked by `tools/audio/coverage.js`.
3. **Content:** tooltips, the journal voice (keep the Reaper's voice sheet), the spec trials, loot names, icon prompts, and the guide.

**Balance targets:** sloppy play about 70% of pro; raid index about 0.93–0.95 alone. Measure the party-haste value separately: the party's DPS with Insane Reaper against without.
