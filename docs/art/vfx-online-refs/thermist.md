# Thermist: online VFX references

Style target stays `docs/art/vfx-reference/thermist.png` (orange fire against frost blue, windup / impact / aftermath).

## Analogs

| Our move | Analog | Source |
|---|---|---|
| The dial | FF14 Black Mage Astral Fire / Umbral Ice: orange and blue states, the swing between them | https://na.finalfantasyxiv.com/jobguide/blackmage/ |
| Cinder Bolt / Rime Shard | FF14 Fire / Blizzard, WoW Fire Blast / Ice Lance: instant movers | https://icy-veins.com/ffxiv/black-mage-guide |
| Flare | FF14 Fire IV / Flare; Lost Ark Sorceress Explosion | https://ffxiv.consolegameswiki.com/wiki/Flare |
| Glacier Lance | FF14 Blizzard IV; WoW Glacial Spike; Lost Ark Frost's Call | https://lostark.wiki.fextralife.com/Sorceress |
| Thermal Shock | FF14 Paradox (one spell in both colours) | https://consolegameswiki.com/wiki/Paradox |
| Supernova | FF14 Flare Star; Lost Ark Doomsday | https://icy-veins.com/ffxiv/black-mage-job-changes-updates |
| General | Luis Aguas (Blizzard FX) on value and layering; Riot clarity | https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ , https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/ |

## Principles (our own words)

1. One colour per element, never mixed except at the crossing: orange spells stay orange, blue stay blue, and only the
   Thermal Shock (and the Ultimate) puts both on screen at once. That makes the crossing the signature beat.
2. The crossing is a collision: two crescents (orange and blue) slam together over the target, a beat of 120-150 ms,
   then the burst in the colour the dial swung to. Bigger swing, bigger burst; a tiny swing stays small.
3. Instant movers are small and fast (Cinder Bolt, Rime Shard): a hand flick, a bolt, a pop. Under 0.4 s and well
   under 40 particles.
4. Edge casts (instant, sure crit) earn a distinct crit beat: a white-hot star cross over the hit and a sharp ring,
   so the player sees they spent the edge.
5. Fire shapes are round and leaping (starbursts, tongues); frost shapes are straight and faceted (spears, shards,
   crystals). Shape language alone tells the elements apart, even in greyscale.
6. Aftermaths stay on rims: lava cracks and frost rims, never a filled floor disc, and they cool within about two
   seconds.
7. Steam is the bridge between elements: a puff when fire meets frost, kept light and grey-white.
8. Shake is for the Shock and the Ultimate; Flare and Lance nudge, fillers never shake.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Cinder Bolt | FF14 Fire (instant) | a flame crescent flick at the hand, a small bolt, a small burst (trimmed smoke) |
| Rime Shard | Ice Lance | a frost crescent flick at the hand, the shard, chips |
| Flare | Fire IV | unchanged base; an edge cast (On the Brink after it) adds a white-hot crit star and a gold ring |
| Glacier Lance | Blizzard IV / Glacial Spike | unchanged base; an edge cast adds the crit star in pale blue |
| Thermal Shock | Paradox | new collision beat: an orange and a blue crescent slam together over the target before the burst |
| Overheat | n/a | (shared with the Pyromancer) orange flare and smoke instead of a red ring at the feet |
| Supernova, Equilibrium, Inversion | Flare Star etc. | unchanged |
