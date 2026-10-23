# Runeguard: online VFX references

Indigo runes on a gauntlet; a gauge of three Runes spent on Glyph Burst. Style target stays `docs/art/vfx-reference/tanks.jpg`. Rune Strike, the Ward blast and the Glyph flight were reworked earlier; this pass builds on them.

## Analogs

- WoW Death Knight runes and runeforging: runes shown as glyphs that light and empty; Empower Rune Weapon / Dancing Rune Weapon as the power-up; Rune Tap. https://www.wowhead.com/spell=49998/death-strike (Blood DK kit)
- FF14 Gunbreaker: Keen Edge / Brutal Shell / Solid Barrel loading cartridges, Burst Strike spending one, No Mercy as the burst window (a sharp flare and a lingering edge glow), Heart of Corundum. https://ffxiv.consolegameswiki.com/wiki/Gunbreaker
- Lost Ark Gunlancer: Shield Bash as filler, a shield meter, Guardian's Protection party wall. https://maxroll.gg/lost-ark/build-guides/tier-4-combat-readiness-gunlancer-build-guide
- General: https://80.lv/articles/vfx-staples-shape-color-and-motion/ , https://realtimevfx.com/t/stylized-vfx/15639

## Principles

1. A gauge move shows the gauge. Gunbreaker's cartridges and DK runes read because the resource is visible at the moment it changes: each Rune Strike stamps the slots (kept from the earlier rework).
2. Load is small, spend is big. Building hits stay quick (about 0.25 s) and cheap; Glyph Burst, which spends all three, gets the pillar, crystals and hit-stop.
3. Power-up windows (No Mercy, Empower Rune Weapon) are one sharp event: a gather of 200-300 ms, one bright snap, then a quiet lingering edge glow. Random scattered bolts read as noise; ordered shapes (three runes lighting one after another) read as a mechanism.
4. Runes are hard-edged and angular (straight strokes, triangles, hex), never soft blobs: that is what separates the Runeguard from the healers' light.
5. Indigo body, pale lilac core, near-black blue ink. Floor circles are indigo-violet, never a saturated blue fill (blue on the floor means stack).
6. Fillers under 0.4 s and about 30 particles; shake only on the third Rune Strike and on spends.
7. Shields (Ward, Mirror) are outline-led so whatever is under them reads.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Rune Strike | Keen Edge / Solid Barrel loading | kept (three-step round and the slot stamp) |
| Runic Ward | Heart of Corundum | kept |
| Glyph Burst | Burst Strike / Hypervelocity | kept (three runes fly, pillar, hit-stop) |
| Runic Overload | No Mercy / Empower Rune Weapon | three rune stones light in turn round the guard (the load), one snap ring, then the aura; no random lightning |
| Runeblade: Cut / Carve | Death Strike rune-etched blade | a rune etched along the cut's trail, a small rune flash on the hit |
| Mirror Aegis | Gunlancer shield wall | kept |
| Runic Cataclysm (Ult) | Guardian's Protection / Dancing Rune Weapon | kept |
