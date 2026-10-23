# Ranger: online VFX references

Style target stays `docs/art/vfx-reference/archer.jpg` (leaf green, hunter's gold, ink-edged cel shapes). The games
below tell us how the moves should behave, not how they should look.

## Analogs

| Our move | Analog | Source |
|---|---|---|
| Quick Shot | WoW Marksmanship Steady/Arcane Shot: a light, quick filler | https://icy-veins.com/wow/marksmanship-hunter-pve-dps-spell-summary |
| Keen Eye proc | WoW Precise Shots / Lock and Load proc glow; FF14 Bard Straight Shot Ready | https://method.gg/guides/marksmanship-hunter/playstyle-and-rotation |
| Piercing Arrow (Keen) | WoW Aimed Shot (heavy, drawn shot, long streak); FF14 Bard Apex Arrow | https://www.icy-veins.com/ffxiv/bard-guide |
| Rapid Fire | WoW Rapid Fire: a 2 s stream of 7-10 quick shots from the bow | https://icy-veins.com/wow/marksmanship-hunter-pve-dps-spell-summary |
| Hunter's Mark | WoW Trueshot (gold eyes on the hunter, burst window) + Hunter's Mark (a mark over the target); FF14 Radiant Finale | https://na.finalfantasyxiv.com/jobguide/bard/ |
| Barrage | WoW Barrage / Multi-Shot fan | https://lostark.wiki.fextralife.com/Sharpshooter |
| Starfall Volley | Lost Ark Sharpshooter Arrow Shower; FF14 Bard Radiant Finale | https://lostark.wiki.fextralife.com/Arrow+Shower |
| General | Luis Aguas (Blizzard FX) on shape, timing, colour/value; Riot's clarity rules | https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ , https://www.leagueoflegends.com/en-gb/news/dev/clarity-in-league/ |

## Principles (our own words)

1. Three beats on every shot: launch (a glint and an air ring at the bow, 40-80 ms), travel (a streak that shows the
   heading), impact (a small pop that fades slower than it appeared). A projectile must never just pop into existence.
2. Visual weight follows importance: the filler is the smallest, fastest thing in the kit (under 0.4 s, a handful of
   particles); the proc-spending shot is clearly bigger and gold; the burst window is the only thing that marks the hero
   for long.
3. Procs are readable on the hero, not the boss: a short gold flare at the bow when Keen Eye lights (WoW and FF14 both
   flash the proc on the player and the bar, never on the enemy).
4. A stream reads as a stream: Rapid Fire is many small, evenly spaced arrows from the bow (60-70 ms apart), not one
   ground circle. Each arrow gets a tiny tick at the target; only the last one gets a bigger pop.
5. Gold means "empowered" for the Ranger, green means "base". Keep gold over the boss as lines and brackets (a reticle),
   never as a filled floor disc, so telegraphs under the boss stay readable.
6. Dark under bright: a thin ink edge under each arrow and streak lets it read on light and dark floors (Aguas'
   value rule).
7. No red symbols over the boss and no red floor shapes: Marked for Death and Hunter's Mark use amber and gold.
8. Shake only on the shots that matter (Keen Pierce, Aimed Shot); fillers never shake.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Quick Shot | Steady Shot | keep launch ring + arrow + dust; add the Keen Eye proc flare on your own hero when it lights |
| Piercing Arrow | Aimed Shot / Apex Arrow | plain: green helix arrow and a modest burst, no tornado; Keen: gold drawn-bow flare, gold lance streak through the boss, whirlwind, small shake |
| Rapid Fire | WoW Rapid Fire | a stream of arrows from the bow over 0.4 s, ticks on the boss, last arrow pops; gold and longer inside Hunter's Mark |
| Hunter's Mark | Trueshot + Hunter's Mark | a gold eye flares over the ranger; four brackets snap closed on the boss and the reticle stays (lines only, no floor disc) |
| Marked for Death | Hunter's Mark consumed | amber brackets crunch inward and a burst on the boss (no red floor star) |
| Aimed Shot (spec) | Aimed Shot | longer gold draw glint, a thick gold lance streak and a hit-stop-sized pop |
| Starfall Volley | Arrow Shower / Radiant Finale | unchanged (already a three-beat ultimate) |
