# Bastion: online VFX references

Shield knight of steel blue and dawn gold. Style target stays `docs/art/vfx-reference/tanks.jpg` (Consecrated Shield, Divine Leap).

## Analogs

- FF14 Paladin: Fast Blade / Riot Blade / Royal Authority combo, Holy Spirit, Confiteor into Blade of Faith / Truth / Valor, Sheltron, Hallowed Ground. https://ffxiv.consolegameswiki.com/wiki/Blade_of_Valor , https://ffxiv.consolegameswiki.com/wiki/Confiteor
- WoW Protection Paladin: Avenger's Shield (thrown shield, ricochet), Judgment (a hammer of light stamped on the target), Shield of the Righteous, Divine Shield. https://www.wowhead.com/spell=31935/avengers-shield
- Lost Ark Paladin and Gunlancer: Shield Bash as the plain filler, shield meter and party wall (Guardian's Protection) as the big moment. https://maxroll.gg/lost-ark/build-guides/tier-4-combat-readiness-gunlancer-build-guide
- General: shape, colour and motion as the three levers, contrast peaks at impact, dissipation is short and low-contrast. https://80.lv/articles/vfx-staples-shape-color-and-motion/ ; impact needs a few frames alone before secondary elements arrive. https://realtimevfx.com/t/stylized-vfx/15639

## Principles

1. Combo steps escalate. FF14's three-step melee reads as light, light, heavy: the first two are plain weapon trails, only the finisher brings holy light. Strike and Riposte stay steel; Judgment is the one gold beat.
2. Judgment is a stamp from above. Both WoW Judgment and Royal Authority land as a shape that comes *down* onto the target, not out from the hero. A blade of light drops point first in about 120 ms, holds a frame, then breaks into the starburst.
3. Impact first, secondary later. The hit flash and spikes own 0-80 ms; rings and sparks start 40-60 ms after, so the pop is not muddied.
4. Fillers stay under 0.4 s and inside the hero-to-boss gap: no full rings wider than about 100 px on a filler, no lasting floor marks.
5. Mitigation reads as *set*, not as *glow*. Sheltron and Shield of the Righteous snap the shield forward: overshoot 15% in 60 ms, settle in 120 ms, a crescent of light shoved off the face. The plate then holds quietly.
6. Thrown light (Holy Edge, Avenger's Shield, Holy Spirit) has a short wind-up glint (60 ms), a straight fast flight, and lands as a vertical cross of light: the Holy Spirit read.
7. Colour layering: dark ink under, steel or gold body, white-hot core, at most two hues per beat. Gold means holy power spent; steel means plain metal.
8. Shake: none on Strike, 1-2 on Riposte and Edge, 3 on Judgment; 6-8 only for the Ultimate.
9. Floor marks for big cooldowns flare and settle to about a third so boss telegraphs read through them. Gold only: never red or blue fills on the floor.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Blade Chain: Strike | Fast Blade | quick steel cut, small spark bite; no shake |
| Blade Chain: Riposte | Riot Blade | backhand, blue spike bite, a shield-edge glint |
| Blade Chain: Judgment | WoW Judgment / Royal Authority | gold arc, then a sword of light drops point first on the target and breaks into the gold starburst; short seal, no wide floor star |
| Holy Edge | Avenger's Shield / Holy Spirit | glint wind-up, radiant blade flight, lands as a vertical holy cross with a small ring |
| Brace | Sheltron / Shield of the Righteous | plate snaps forward with overshoot, a gold crescent shoved off its face, then holds |
| Perfect Block | parry | unchanged (flare, rings, sparks) |
| Oath, Banner, Bulwark, Zeal, Hallowed, Avatar | Fight or Flight, Divine Shield, Hallowed Ground | already on the tank sheet; unchanged |
| Last Bastion (Ult) | Passage of Arms / Guardian's Protection | unchanged |
