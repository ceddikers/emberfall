# Cleric: online VFX references

Style target stays the painted sheet (`docs/art/vfx-reference/healers-bard.jpg`): cel-shaded white-gold light, pink
petals, ink edges. These notes are about how the moves should *behave*, taken from FF14 White Mage, WoW Holy Priest /
Holy Paladin and Lost Ark's supports.

## Analogs and sources

| Our move | Analog | Source |
|---|---|---|
| Smite (filler) | FF14 Glare III: a quick white glyph flash on the target, no travel | https://na.finalfantasyxiv.com/jobguide/whitemage/ , https://ffxiv.consolegameswiki.com/wiki/List_of_white_mage_actions |
| Dawnstar (Smite empowered) | FF14 Afflatus Misery (the Blood Lily nuke: the one big hit of the filler loop), WoW Holy Fire | same; https://warcraft.wiki.gg/wiki/Category:Holy_spells |
| Mend (slow single heal) | WoW Holy Word: Serenity / FF14 Cure II: a glyph or halo over the ally and light rising off them | https://warcraft.wiki.gg/wiki/Category:Holy_spells |
| Dawn Petal (instant heal + HoT) | WoW Holy Shock / FF14 Regen: instant pop, then a quiet ongoing mark | as above |
| Prayer Circle (party mit + regen) | FF14 Temperance and Liturgy of the Bell; WoW Divine Hymn | https://na.finalfantasyxiv.com/jobguide/whitemage/ |
| Benediction (big single heal + shield) | FF14 Benediction / Divine Benison | as above |
| Dawn Breaks (Ultimate) | WoW Divine Hymn, Lost Ark Bard / Paladin awakening | https://lostark.wiki.fextralife.com/Bard |

General craft sources: Luis Aguas on WoW FX (shape, timing, colour/value; "a heal must never read as damage", test
with many casters): https://80.lv/articles/world-of-warcraft-vfx-overview-from-luis-aguas/ . Timing vocabulary
(wind-up, climax, fall-off; slow tempo for heals, fast for attacks):
https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx . Player read of WoW Legion caster FX
(linger "just a moment" after the hit): https://realtimevfx.com/t/sarah-carmody-world-of-warcraft-legion-reel-2016/866

## Principles (our own words)

1. **Damage points down and out, heals rise.** Attacks land as spiky, inked starbursts and downward shafts; heals use
   rounded shapes (halos, petals, crosses) moving *up* off the ally. No inked spikeburst on a heal.
2. **Filler is a flicker.** Glare-style: about 0.1 s wind-up, 0.15 s peak, gone by 0.4-0.5 s. Under 30 particles and
   about 300 calls. Variety comes from alternating shapes, not from size.
3. **The empowered hit is the one big one.** Dawnstar should be 2-3x Smite in radius and hold the peak a beat longer
   (about 0.25 s) so the player feels the payoff, like Misery against Glare.
4. **A heal reads on the target, not the caster.** The caster gets a glint; the ally gets the halo, the rising light
   and a plus. Single heals sit within about one body width so other allies' telegraphs stay visible.
5. **Slow heal = descending glyph, instant heal = pop.** Serenity-style: a halo forms above the head, drops onto the
   ally (about 0.2 s), and light rises out. Instant heals skip the descent and pop at once.
6. **Colour layering:** white core, pale gold body, warm gold rim, pink petals as accent only; a darker ink edge on
   cel shapes for contrast (Aguas: dark behind bright).
7. **Party cooldowns announce, then get out of the way.** A bell or circle tolls once big (about 0.5 s), then only a
   thin gold rim stays for the duration. Never a filled floor disc: it would hide red and blue telegraphs.
8. **Heal tempo is slower than attack tempo.** Ticks of a HoT pulse about every 3 s, soft and small.

## Move-by-move plan

- **Smite**: keep the three alternating variants (shaft / lance / fan); trim the peak a little so it stays a flicker.
- **Dawnstar** (KIT_VFX `dawnstar`): a white-gold eight-point star falls onto the boss, a ground stamp of rays and a
  wide gold ring: bigger and longer than Smite.
- **Mend**: Serenity beat: a gold halo forms over the ally's head and drops down their body, then a column of motes
  and a cross rise out. Drop the inked spikeburst.
- **Dawn Petal**: keep the petal-orb and stamped blossom; swap the inked pink spikeburst for a soft upward petal plume
  so the instant heal reads as a heal.
- **Prayer Circle**: Liturgy / Temperance beat: a gold bell hangs over the cleric and tolls (two rings run out over the
  party), the hex flares once, then only the thin rim holds. No dark ink disc under the party.
- **Benediction**: keep; add a crown halo that settles on the ally's head as the shield lands.
- **Intervention, Dawn Breaks**: keep (already reworked and QA-tuned).
