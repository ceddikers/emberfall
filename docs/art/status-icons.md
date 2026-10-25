# Status icon briefs (buffs and debuffs)

These show above the hotbar (your own statuses) and, smaller, in the party list (everyone's). Until a painting is in,
the game draws a small line glyph. Drop each file in as `client/icons/status/<key>.png` (square, 128 px is plenty);
the game picks it up on its own, no manifest needed.

Heals over time, healers' buffs on allies and each class's own buffs already wear their ability's painted icon, so
they are not listed here.

**Style (paste before every icon, matching `ability-icons.md`):**

> Fantasy cartoon game status icon in a clean cel-shaded anime style. One bold symbol, centred, filling about 70% of the square, with a chunky silhouette that still reads at 14 pixels. Thick dark outline, flat colours with one hard shadow tone and a small hard white highlight. Plain flat background. Light from the upper left.

**Avoid (negative prompt):** glow, neon, bloom, sparkles, particles, soft gradients, realistic rendering, busy fine detail, frame, border, text, numbers, watermark.

**Colour rule:** debuffs sit on a dark wine-red background; buffs on a dark green background; gear bonds on dark bronze. The game adds the frame.

**Sheet:** keep the numbered order in an even grid (5 per row). The key in brackets is the file name.

## Debuffs (dark red background)
1. **Damage Down** (`dd`): a cracked sword pointing down, a heavy downward arrow behind it.
2. **Vulnerability** (`vuln`): a shield with a jagged lightning crack through the middle.
3. **Raise Sickness** (`weak`): a pale ghostly wisp curling up from a small candle that is nearly out.
4. **Slowed** (`slowed`): a boot stuck in a sticky web, strands pulling at it.
5. **Rooted** (`rooted`): two feet wrapped tight in twisting roots.
6. **Bleeding** (`bleed`): one fat red drop with two small drops falling after it.
7. **Egg-Laden** (`laden`): a pale green speckled egg, venom seeping from a crack.
8. **Pardoned** (`pardoned`): a parchment writ torn clean in two, a broken wax seal.
9. **Tenderized** (`tenderized`): a meat mallet over a slab of steak.
10. **Stuffed** (`stuffed`): an empty plate with a fork and knife crossed over it.
11. **Conductive** (`conductive`): a small metal rod with a yellow bolt striking its tip.
12. **Royal Doom** (`doom`): a grinning skull wearing a small golden crown.
13. **Dread** (`dread`): a wide staring eye with a dark slash across it.
14. **Static** (`static`): a crackling ball of blue-white sparks with two small bolts.
15. **Frostbitten** (`frostbite`): a snowflake with icicles hanging off it.
16. **Gripped** (`gripped`): a huge icy fist closed tight.
17. **Cracked Guard** (`cracked`): a steel shield split by a wide crack down its face.

## Buffs (dark green background)
18. **Mitigation** (`mit`): a sturdy round shield, front view.
19. **Party damage up** (`p-dmg`): a sword raised point up with two smaller swords behind it.
20. **Party crit up** (`p-crit`): a four-pointed star struck through by an arrowhead.
21. **Party haste** (`p-haste`): a winged boot.
22. **Insane Reaper** (`p-rhaste`): a winged boot with a little black scythe blade on the heel.
23. **Item effect** (`fx`): a cut gem, bright violet.

## Gear bond (dark bronze background)
24. **Gear bond** (`bond`): two linked rings, gold.
