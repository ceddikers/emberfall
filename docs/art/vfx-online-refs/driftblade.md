# Driftblade: online VFX references

A wind-sabre duellist in pale jade (Orbit mint, Comet gold) whose damage grows with Drift built by moving. Style target stays `docs/art/vfx-reference/driftblade.png` (Eye of the Gale, Passing Strike, Crosswind, Hook Turn, Stillpoint).

## Analogs

- FF14 Samurai: Hakaze / Jinpu / Gekko as clean single arcs, Iaijutsu (Midare Setsugekka) as the spender whose cut appears after the draw, Kaeshi as an echo of the last cut. https://ffxiv.consolegameswiki.com/wiki/Midare_Setsugekka , https://na.finalfantasyxiv.com/jobguide/samurai/
- FF14 Viper: alternating twin-blade fillers (Steel Fangs / Reaving Fangs), positional finishers, Reawaken's Generation chain that gets faster and brighter. https://na.finalfantasyxiv.com/jobguide/viper/
- WoW Windwalker Monk: wind streaks and gust spirals as the class's air language (Fists of Fury's cone, Whirling Dragon Punch's spiral). https://www.wowhead.com/spell=113656/fists-of-fury
- Lost Ark Deathblade (Wind Cut: a forward slash that leaves a lingering gust of blades; Surge as a stacked spender) and Aeromancer (wind as the weapon). https://lostark.wiki.fextralife.com/Deathblade , https://maxroll.gg/lost-ark/build-guides/surge-deathblade-raid-guide
- Slash VFX timing: the smear must sync to the swing, and a slow linear fade reads mushy, so cut the tail fast. https://realtimevfx.com/t/sword-slash-combo-advice-are-really-welcome/9379

## Principles

1. Fillers alternate. Viper and Samurai fillers read as a rhythm because each press swings the other way; Carve alternates forehand and backhand instead of picking at random.
2. The cut appears on the body. Iaijutsu reads as a thin bright slit across the target that flares and closes, not a starburst. A wind blade leaves a line, not a ball.
3. The gauge shows on the filler. The more Drift, the more wind: leaves, a second ghost arc and longer streaks, so the meter is legible in the swing itself (as Surge stacks show on the Deathblade).
4. Swing in 100-150 ms, contact at about 80 ms, gone by 350 ms. Leaves may drift a little longer but stay few.
5. The spender scales with what it spent: Crosswind's X grows with the Drift it used, from a small cross to the full sheet look.
6. Wind is streaks and ribbons in two values (jade body, white edge) over a thin dark ink. No filled floor shapes; lanes and arcs stay faint and short.
7. Shake: none on Carve, 2-3 on Crosswind by size, more only for Eye of the Gale.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Carve | Hakaze / Steel and Reaving Fangs | alternating crescent smear; a thin slit flashes across the target and closes; wind detail (leaves, a ghost echo arc) grows with your Drift; the starburst kept small |
| Carve's follow-through (crescent talent) | Kaeshi echo | a wide pale echo arc with a slit, same shape language |
| Crosswind | Midare Setsugekka / Wind Cut | loops, flying blade, X of streaks; X size, streak count and shake scale with the Drift spent (cached from the last Driftblade press) |
| Slipstream, Hook Turn, Stillpoint, Gale Run, Passing Strike | painted sheet | unchanged |
| Eye of the Gale (Ult) | Reawaken / Whirling Dragon Punch | unchanged |
