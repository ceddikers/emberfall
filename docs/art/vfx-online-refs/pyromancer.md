# Pyromancer: online VFX references

Style target stays `docs/art/vfx-reference/fire-mage.jpg` (fat cel flames, white-hot hearts, grey smoke, ink edges).

## Analogs

| Our move | Analog | Source |
|---|---|---|
| Fireball | WoW Fireball: the filler, a ball with a comet tail | https://www.icy-veins.com/fire-mage-wow-pve-dps-rotation-cooldowns-abilities |
| Heating Up / Hot Streak | WoW Heating Up and Hot Streak: one crit warms the hands, two crits flare them and make Pyroblast instant | https://www.engadget.com/2012-04-07-arcane-brilliance-a-first-look-at-fire-mages-in-mists-of-pandar.html |
| Pyroblast | WoW Pyroblast: a huge slow ball, the biggest single hit; FF14 Black Mage Fire IV / Flare Star | https://na.finalfantasyxiv.com/jobguide/blackmage/ |
| Fire Blast | WoW Fire Blast: instant, off-GCD, always crits, a burst on the target | https://us.forums.blizzard.com/en/wow/t/during-combustion-what-is-priority/1497005 |
| Combustion | WoW Combustion: the hero burns for the window | same as above |
| Vent / Meteor | WoW Meteor: a rune ring, the rock arrives after a delay, burning ground; Lost Ark Sorceress Doomsday | https://www.thegamer.com/lost-ark-sorceress-class-guide/ |
| Ember Circle | FF14 Ley Lines: a circle under the caster | https://na.finalfantasyxiv.com/jobguide/blackmage/ |
| Phoenix Dive | WoW Phoenix Flames | https://us.forums.blizzard.com/en/wow/t/lets-talk-phoenix-flames-and-other-improvements/2025252 |
| General | Luis Aguas (Blizzard FX) on timing and layering; community timing notes | https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ , https://polycount.com/discussion/comment/2598726 |

## Principles (our own words)

1. Hit fast, fade slow: the impact appears in 1-2 frames (a flash and a starburst), then smoke and embers take 0.6-1 s
   to clear, so the eye registers it.
2. The filler is a modest pop; the payoff is the size jump. Fireball's impact is a cushion of puffs about a third the
   size of Pyroblast's. Players learn the rhythm by that size ratio.
3. Procs live on the mage: Heating Up is a small spark in the hand, Hot Streak is flame bursting up off both hands and a
   gold ring, shown the moment the crit lands, so the instant Pyroblast is a reaction to something seen.
4. A proc-spent Pyroblast launches differently from a hard cast: it bursts straight off the hand (no slow gather), a
   flame ring kicks out behind the mage, and it travels faster.
5. Layering from back to front: dark smoke, orange body, gold middle, white-hot heart, then embers last.
6. Ground fire is short and amber: any burning floor fades to a faint scorch within about a second and is never a
   filled red circle. Rune rings before a delayed hit (Meteor, Vent) are amber and gold, so they never pass for a
   boss telegraph.
7. Smoke is grey, not black, and capped at a few puffs on fillers (four casters at once).
8. Shake scales with the moment: none on Fireball, a nudge on Pyroblast, real shake only on Meteor and the Ultimate.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Fireball | WoW Fireball | trim the impact (fewer flares and smoke, no lingering decal, no shake), keep the cushion of puffs; add the proc beat |
| Heating Up / Hot Streak | WoW proc on the hands | new: spark in the hand for Heating Up, flames up both hands + gold ring for Hot Streak (your own hero) |
| Pyroblast | Pyroblast / Fire IV | hard cast keeps the slow burning rock; Hot Streak cast launches straight with a flame ring behind the mage, faster, gold heart; trimmed particles |
| Fire Blast | WoW Fire Blast | a snap of the hand, a crit star (white heart) and grey smoke |
| Vent | Meteor | amber rune ring instead of orange-red |
| Meteor (Cataclysm) | WoW Meteor | amber rune ring; the burning crater settles faint after its impact |
| Overheat | n/a (our mechanic) | orange flare and smoke off the mage instead of a red ring at its feet |
| Combustion, Ember Circle, Phoenix Dive | Combustion, Ley Lines, Phoenix Flames | unchanged |
