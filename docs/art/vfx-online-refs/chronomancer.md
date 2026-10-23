# Chronomancer: online VFX references

Style target stays the painted sheet (`docs/art/vfx-reference/chronomancer.png`): violet, deep blue and gold, clock
dials, ribbon arrows, crystal shards. The closest live analog is WoW's bronze Evoker (Preservation and Augmentation);
FF14 Astrologian and Lost Ark's Bard fill in the party pieces.

## Analogs and sources

| Our move | Analog | Source |
|---|---|---|
| Temporal Bolt (harms, and heals the link / the party) | Evoker Living Flame (one bolt that hurts or heals), Echo | https://icy-veins.com/wow/preservation-evoker-pve-healing-spell-summary |
| Shift (Slow / Haste) | Evoker's stance-like empower states; AST card draw glyphs | https://maxroll.gg/wow/class-guides/preservation-evoker-raid-guide |
| Rewind | Evoker Rewind / Time Dilation on one ally | https://warcraft.wiki.gg/wiki/Time_Dilation |
| Accelerando (party haste + Quickened ally) | Evoker Temporal Anomaly / Ebon Might; Lost Ark Bard Sonic Vibration | https://warcraft.wiki.gg/wiki/Temporal_Anomaly , https://lostark.wiki.fextralife.com/Sonic+Vibration |
| Stasis (store, then release) | Evoker Stasis; FF14 AST Macrocosmos (bank damage, release as heal) | https://na.finalfantasyxiv.com/jobguide/astrologian/ |
| Paradox | Augmentation's Breath of Eons burst | https://www.method.gg/guides/preservation-evoker |
| Recall (raise / big heal) | Evoker Rewind as a revive; FF14 Ascend | https://icy-veins.com/wow/preservation-evoker-pve-healing-spell-summary |
| Time Reversal (Ultimate) | Evoker Rewind (raid), AST Earthly Star / Macrocosmos | https://ffxiv.consolegameswiki.com/wiki/Earthly_Star |

General craft: https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ ,
https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx

## Principles (our own words)

1. **One bolt, two readings.** Like Living Flame, the same projectile must say what it did: it hits the boss, and the
   heal shows where it went (a thread to the linked ally in Slow; a pulse round the caster for the party in Haste).
2. **Stance colours carry the meaning.** Slow is violet and pale lilac, weighty and a little delayed; Haste is orange
   gold, quick, with afterimages trailing. A player should know their stance from their own bolt.
3. **Time shapes: rings with ticks, arrows on an arc, afterimages.** Clocks are drawn as rims and ticks, never filled.
4. **Floor clocks are brief and faint.** Teal or violet rings on the floor look like soak markers; any dial on the floor
   is under about 0.5 strength and gone within about a second, except the Ultimate's (faint, rim-led).
5. **Filler timing:** Bolt travels about 0.2-0.3 s, peaks on hit for 0.1 s, fades by 0.4 s. Under about 40 particles.
6. **Party buffs announce from the caster and mark the chosen one.** Accelerando: a sweep of gold arrows outward from
   the caster, then a distinct mark (up-arrows) over the Quickened ally.
7. **Reverse motion is the signature.** Rewind and Recall run things backwards: rings closing in, afterimages walking
   back, a dial turning counter-clockwise, then one white snap.
8. **Colour layering:** white core, violet or gold body, deep indigo ink behind ribbons for contrast.

## Move-by-move plan

- **Temporal Bolt**: stance-aware. Slow: a violet clock-shard with a lilac trail, landing as a small tick-ring and
  starburst, then a thin lilac thread from the boss to the linked ally (when known) ending in a plus. Haste: a quicker
  orange-gold streak with two afterimages, a gold pop on hit and a soft gold ring rippling out from the chronomancer
  (the party heal).
- **Accelerando**: no dark ink and no big teal clock. A forward-spinning gold dial at about 0.45 strength for about a
  second, gold ribbon arrows running forward, speed streaks, and two up-arrows over the Quickened ally.
- **Recall**: swap the plain clock sigil for the rich chronoDial turning back (faint), afterimage snapping in; keep the
  time-light shaft and the snap burst.
- **Rewind, Shift, Stasis, Paradox, Time Reversal**: keep (already on the sheet).
