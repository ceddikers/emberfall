# Talent move icon briefs (moves a talent grants)

Two talents per hero (rows III and V) grant a new move that takes over a button. Until a move has its own icon, the game shows the icon of the move it replaces. Same style as `ability-icons.md`, so the new moves sit on the hotbar beside the old ones.

## Shared style (paste this before every icon)

> Fantasy cartoon game ability icon in a clean cel-shaded anime style, like props drawn for a hand-drawn fantasy animated series. One bold object, filling about 70% of the square, with a chunky, clear silhouette that reads at 40 pixels. Confident line art: a thick dark outline around the object, thinner lines inside. Flat colours with one hard-edged shadow tone and a small hard white highlight. A limited palette: the background colour, one or two object colours, and one bright accent used only where the action happens. One light from the upper left. Motion is shown with a few clean, tapered speed lines, and magic as flat cartoon shapes in solid colour (flames with curled tips, bold rings, star bursts), never as glow. A plain flat background in the class colour, with a simple darker vignette shape or a few bold diagonal bands.

**Avoid (negative prompt):** glow, neon, bloom, lens flare, sparkles, particles, light rays, soft gradients, airbrushing, realistic rendering, photo textures, chrome or plastic shine, glowing eyes, human figures, faces, hands, crosshair, gears, busy fine detail, frame, border, text, watermark.

**Rules:** keep the subject inside the central circle; no people; one bright spot per icon. Each new move must have a different silhouette from the move it replaces (they share a button, so a player should see the swap at a glance).

**Format:** square, about 256 × 256, no frame. Files go in `client/icons/<class>/<id>.png`. Then add the move's id (just `"<id>"`, e.g. `"hallowed"`) to the list in `client/icons/talent-icons.json` so the game uses the painted icon instead of the fallback.

## Tanks

**Bastion**: slate-blue background, dull steel, gold accent.
1. **Hallowed Ground** (`bastion/hallowed`, replaces Rally Banner): a cracked flagstone seen from slightly above, a five-pointed gold star burned into it, short flat gold flame tongues standing up along the star's lines.
2. **Avatar of Dawn** (`bastion/avatar`, replaces Oath of Valor): a pair of spread feathered wings in cream and gold, upright and symmetrical, a small round steel shield at their centre with a gold sunburst on its face.

**Bloodreaver**: dark oxblood background, black iron, bright red accent.
3. **Scab** (`bloodreaver/scab`): a rough, plated crust of dark red over a split in black iron armour, like a scab over a wound, one bright red line still showing through a crack.
4. **Blood Moon** (`bloodreaver/moon`): a big round red moon with dark crater spots, hanging over a jagged black horizon, a few red drops rising up into it.

**Runeguard**: dusky violet background, grey slate, lilac accent.
5. **Whirling Runes** (`runeguard/whirl`): three slate rune tiles shaped like diamonds, each with one lilac rune, flying in a tight circle with bold curved speed lines between them.
6. **Living Rune** (`runeguard/living`): one tall diamond-shaped rune stone standing on its point, floating above a small cracked base, its single big rune filled with bright lilac.

## DPS

**Ranger**: moss-green background, wood and leather, pale straw accent.
7. **Explosive Shot** (`ranger/explosive`): an arrow with a small round black charge lashed behind its head, a short lit fuse sparking straw-yellow at its tip, flying up-right.
8. **Falcon** (`ranger/falcon`): a falcon in a steep dive seen from the side, wings swept back, talons forward, two tapered speed lines above it.

**Shadowblade**: deep plum background, steel, crimson accent.
9. **Rupture** (`shadowblade/rupture`): a short curved dagger seen point-down, one deep crimson wound-mark beneath it in the shape of a jagged star, three drops falling.
10. **Death Blossom** (`shadowblade/blossom`): six throwing knives arranged point-out in a ring like the petals of a flower, a crimson flower centre where their hilts meet.

**Pyromancer**: burnt-umber background, soot black, orange and yellow accent.
11. **Firestep** (`pyromancer/firestep`): a single leather boot print burned into the floor, flat orange flames with curled tips rising from its edges, two speed lines leading out of it.
12. **Phoenix Flight** (`pyromancer/phoenix`): a phoenix with wings raised, made of flat orange and yellow flame shapes with curled tips, a looping tail that curls back on itself.

## Healers

**Cleric**: warm ochre background, cream linen, gold accent.
13. **Bloom of Dawn** (`cleric/dawnbloom`): a big open flower of cream petals seen from above, a flat gold sun disc at its centre.
14. **Dawn Sanctum** (`cleric/dawnsanctum`): a wide ring of standing gold stones seen from slightly above, a half-risen sun on the far horizon behind them.

**Grovekeeper**: olive background, bark brown, leaf green, blossom pink accent.
15. **Seed of Renewal** (`grovekeeper/seed`): a large acorn-like seed split open at the top, a two-leaf sprout coming out, one small pink bud on the sprout.
16. **Treant** (`grovekeeper/treant`): the top of a stout tree stump with two thick branch-arms raised like fists, a leafy crown, no face.

**Chronomancer**: deep teal background, brass, pale teal accent.
17. **Time Bubble** (`chronomancer/bubble`): a round soap-bubble outline in pale teal holding a small brass hourglass frozen mid-pour, the falling sand stopped in mid-air.
18. **Time Warp** (`chronomancer/warp`): a large brass clock face tilted in perspective, its two hands bent and swept round like speed lines, a pale teal ring around the rim.

## Threadweaver and Marionettist (2026-10)

The four talent moves for these two (Embroider, Cat's Cradle, Tangle, Red Curtain) are in `ability-icons.md` with the rest of each class, since neither class has painted icons yet.