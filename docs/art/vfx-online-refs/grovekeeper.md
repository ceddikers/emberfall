# Grovekeeper: online VFX references

Style target stays the painted sheet (`docs/art/vfx-reference/grovekeeper.png`): leaf green, bark, golden fruit, a
teal moon pool. The closest live analog is WoW's Restoration Druid; FF14 Sage / Scholar floor heals and Lost Ark's
Artist inform the ground pieces.

## Analogs and sources

| Our move | Analog | Source |
|---|---|---|
| Wrath (filler) | WoW Wrath: a small green-gold bolt with a leafy pop | https://icy-veins.com/restoration-druid-pve-rotation-cooldowns-abilities |
| Thornlash | WoW Moonfire / Sunfire as a dot that marks the target for its duration | same |
| Rejuvenate | WoW Rejuvenation: a light green swirl and a leaf glow that sits on the ally | same; https://questionablyepic.com/restodruid-spells |
| Bloom | WoW Lifebloom's bloom: the flower over the ally bursts open at the end | https://maxroll.gg/wow/class-guides/restoration-druid-mythic-plus-guide |
| Wild Growth | WoW Wild Growth: green spirals rising on several allies at once | https://icy-veins.com/restoration-druid-pve-rotation-cooldowns-abilities |
| Moonwell | WoW Efflorescence / FF14 Sage Kerachole, Scholar Sacred Soil: a flowered patch on the floor | https://warcraft.wiki.gg/wiki/Verdancy |
| World Tree (Ultimate) | WoW Tranquility and Incarnation: Tree of Life | https://warcraft.wiki.gg/wiki/Tranquility |

General craft: https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ (shape, timing, colour/value;
heals never read as damage; check with many casters),
https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx (wind-up, climax, fall-off; calm tempo
for heals).

## Principles (our own words)

1. **Growth goes up and outward, slowly.** Nature heals sprout: vines and rays climb, leaves drift. Attacks snap:
   thorns jab in and are gone.
2. **A HoT you press all fight is quiet.** Rejuvenation in WoW is barely more than a glow and a leaf on the body. Our
   Rejuvenate should land in about 0.4 s and then sit as a faint mark; the loud moment is Bloom.
3. **The payoff blooms.** Lifebloom's bloom is the burst of a HoT: a flower opening, petals thrown wide. Keep Bloom as
   the big golden lotus.
4. **Party heals ride the party, not the floor.** Wild Growth reads as spirals rising out of a ring, not a carpet; a
   filled green disc would cover telegraphs. Short (about 1.3 s), with the floor ring thin.
5. **Floor heals are patches with a rim.** Efflorescence and Sacred Soil: a soft pool with a readable edge and a few
   flowers, faint enough that a red circle under it still shows.
6. **Colour layering:** cream-white core, leaf green body, deep moss and bark ink edges, gold as the accent for the
   heal landing.
7. **Fillers stay light.** Wrath: one small missile, one thorn pop, under about 30 particles and 500 calls.
8. **Cost matters for four casters.** Prefer one path with several sub-paths over many separate stroke calls.

## Move-by-move plan

- **Wrath**: keep the three variants; trim the root crack so it stays a filler.
- **Rejuvenate**: lighter land: keep the leaf stream, the climbing rings, the flower ring and the cross; drop the
  inked spikeburst, the lightfall and most of the rays. The 3 s ticks stay small.
- **Wild Growth**: keep the vine ring and the leaves flung out; batch the vines' strokes into a few paths and drop the
  heavy `V.grove` carpet for a thin flower ring, bringing the peak under about 1,200 calls. Add rising green spirals
  (the WoW read) round the druid.
- **Bloom, Moonwell, Thornlash, World Tree**: keep (they already follow the sheet and these beats).
