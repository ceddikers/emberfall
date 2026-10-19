# Ability icon briefs (the hotbar, tooltips and the hero page)

Second pass, 2026-10-19, in the same cartoon/anime fantasy style as `hero-portraits.md` (clean cel shading, bold lines, flat colour). The first sheet (`ability-icons-sheet.jpg`) reads as AI art for the same reasons the portraits did.

## Why the first sheet looks "AI"

- **Everything glows.** Every icon has a neon backdrop in its class colour, plus lens flares and sparkles. All 54 have the same lighting and finish, so nothing stands out.
- **Colour is the only thing telling icons apart.** Within a class they blur together: Bloodreaver is six red blobs, Pyromancer six orange fireballs.
- **Stock subjects.** Clip-art crosshairs, generic gears, glowing fists, and floating figures with outstretched arms (and AI hands).
- **Airbrushed and busy.** Smooth gradients and chrome shine, with fine detail that turns to mush at hotbar size.

## Shared style (paste this before every icon)

> Fantasy cartoon game ability icon in a clean cel-shaded anime style, like props drawn for a hand-drawn fantasy animated series. One bold object, filling about 70% of the square, with a chunky, clear silhouette that reads at 40 pixels. Confident line art: a thick dark outline around the object, thinner lines inside. Flat colours with one hard-edged shadow tone and a small hard white highlight. A limited palette: the background colour, one or two object colours, and one bright accent used only where the action happens. One light from the upper left. Motion is shown with a few clean, tapered speed lines, and magic as flat cartoon shapes in solid colour (flames with curled tips, bold rings, star bursts), never as glow. A plain flat background in the class colour, with a simple darker vignette shape or a few bold diagonal bands.

**Avoid (negative prompt):** glow, neon, bloom, lens flare, sparkles, particles, light rays, soft gradients, airbrushing, realistic rendering, photo textures, chrome or plastic shine, glowing eyes, human figures, faces, hands, crosshair, gears, busy fine detail, frame, border, text, watermark.

**Rules for the set**
- **Keep the subject inside the central circle.** Some slots are drawn round, and the corners get cropped.
- **No people.** Use objects and signs instead: a horn for a war cry, an empty helmet, a feather. That rules out bad hands and floating wizards.
- **Different silhouettes within a class.** No two icons in a row should have the same shape (diagonal, round, upright, spread), so you can tell them apart in grey.
- **One bright spot per icon,** where the hit or the magic is. Everything else stays muted.

**Format:** square, about 256 × 256, no frame (the game adds the slot frame). Files go in `client/icons/<class>/<id>.png`, replacing the current ones. Make one class at a time as a row of six, so each class shares one background and palette.

## Tanks

**Bastion**: slate-blue background, dull steel, gold accent.
1. **Blade Chain** (`bastion/blade`): a plain arming sword pointing up-right, with three curved slash marks behind it, one after another; the last one is gold.
2. **Holy Edge** (`bastion/edge`): a crescent of flat gold light shaped like a sword's edge, flying left to right across the frame, with tapered speed lines trailing it.
3. **Brace** (`bastion/brace`): a blue kite shield tilted to take a blow, with one white star-shaped spark at its top edge where something just struck it.
4. **Oath of Valor** (`bastion/oath`): a sword planted point-down, a red oath ribbon wound round its crossguard and sealed with a blob of wax.
5. **Rally Banner** (`bastion/banner`): a tall blue pennant on a pole driven into cracked stone, snapping in the wind, a small gold shield painted on the cloth.
6. **Bulwark** (`bastion/bulwark`): a massive rectangular wall-shield seen straight on, filling the frame. It has iron bands, big rivets and dents, and a thin gold rim.

**Bloodreaver**: dark oxblood background, black iron, bright red accent.
1. **Hack & Maul** (`bloodreaver/hack`): a notched bearded axe-head mid-chop, with two bold red slash marks behind it.
2. **Crimson Drain** (`bloodreaver/drain`): an axe blade with blood running down it, the drops curling back up the haft in a spiral.
3. **Bloodletting** (`bloodreaver/letting`): a short hooked knife beside one thin red cut line, three drops falling from it.
4. **Frenzy** (`bloodreaver/frenzy`): a horned iron helm, one horn snapped short, with a red war-paint handprint smeared across the faceplate. The eye slits are empty and dark.
5. **War Cry** (`bloodreaver/warcry`): a curved bone war horn, its sound drawn as three bold red rings bursting from the mouth.
6. **Undying** (`bloodreaver/undying`): one heavy iron chain link, cracked almost all the way through but still holding, bound with a strip of red cloth.

**Runeguard**: dusky violet background, grey slate, lilac accent.
1. **Rune Strike** (`runeguard/strike`): a stone-knuckled gauntlet, side-on, mid-punch, with one carved rune on the knuckle plate filled with flat lilac colour.
2. **Runic Ward** (`runeguard/ward`): six hexagonal slate tiles locked together into a small dome, a protective rune cut into the top tile.
3. **Glyph Burst** (`runeguard/glyph`): a round carved stone glyph breaking apart. Slate chips fly outward, and flat lilac colour shows through the cracks.
4. **Runic Overload** (`runeguard/overload`): a tall standing stone carved top to bottom with runes, every groove filled with bright lilac, cracks spreading at its base.
5. **Sanctum** (`runeguard/sanctum`): a ring of seven small rune stones on the ground, seen from slightly above, joined by thin lilac lines.
6. **Mirror Aegis** (`runeguard/mirror`): a round, polished silver mirror-shield. A red bolt strikes its face and bends straight back the way it came, in a sharp V.

**Taunts** (each tank's seventh button, on T; one icon per tank in that class's background and palette). Until one is painted, the game shows the icon it borrows (Rally Banner, Bloodletting, Glyph Burst); dropping the PNG in place is enough.
7. **Challenge** (`bastion/taunt`): a sword's flat striking the face of a round shield, three bold gold rings bursting outward from the point of impact.
8. **Reaver's Hook** (`bloodreaver/taunt`): a barbed iron hook on a length of heavy chain, flung diagonally across the frame, red drops flicking off the barb.
9. **Binding Rune** (`runeguard/taunt`): a lilac rune of summons stamped on a slate disc, a short chain of three slate links pulled taut from its centre toward the viewer.

## DPS

**Ranger**: moss-green background, wood and leather, pale straw accent.
1. **Quick Shot** (`ranger/quick`): a single arrow flying flat across the frame, its fletching crisp, a few short straw-coloured speed strokes behind.
2. **Piercing Arrow** (`ranger/pierce`): an arrow that has punched through three autumn leaves, all skewered along its shaft.
3. **Rapid Fire** (`ranger/rapid`): a quiver tipped forward, five arrows sliding out in a fan.
4. **Hunter's Mark** (`ranger/mark`): a hunter's sign, a circle with a cross through it, daubed in orange paint on rough bark, the paint dripping.
5. **Hunter's Cloak** (`ranger/cloak`): a folded green cloak with a leaf-shaped pin, hung on a branch, rain beading and rolling off it.
6. **Barrage** (`ranger/barrage`): three arrows fanning out from one point in flight, each trailing straw speed strokes.

**Shadowblade**: deep plum background, steel, crimson accent (venom green on Venom Blade only).
1. **Strike** (`shadowblade/strike`): a straight dagger thrusting up-right, a crimson rag knotted to the pommel.
2. **Eviscerate** (`shadowblade/evis`): two crimson slash marks crossing in a bold X, a dagger lying across the centre.
3. **Shadowstep** (`shadowblade/step`): a sooty footprint dissolving into a puff of black smoke, with a second footprint appearing on the far side.
4. **Shadow Dance** (`shadowblade/dance`): a crimson scarf whirling in a loose spiral, three knife glints spaced along it.
5. **Venom Blade** (`shadowblade/venom`): a curved dagger with one bright green drop running down the fuller towards the point.
6. **Smoke Bomb** (`shadowblade/smoke`): a round black clay bomb with a sputtering lit fuse, a curl of grey smoke rising from it.

**Pyromancer**: burnt-umber background, soot black, orange and yellow accent.
1. **Fireball** (`pyromancer/fireball`): a small, fast ball of fire diving down-right, drawn as cartoon flame tongues with curled tips, with a short tail.
2. **Pyroblast** (`pyromancer/pyro`): a huge, slow orb of fire filling the frame, its crust dark and cracked, a yellow-white heart showing through the cracks.
3. **Fire Blast** (`pyromancer/fireblast`): a sharp eight-pointed starburst of flame, white-hot at the centre, its points hard-edged.
4. **Combustion** (`pyromancer/combust`): an open spellbook, its pages curling and catching fire from the edges in.
5. **Vent** (`pyromancer/vent`): a small iron furnace door bursting open, flame and sparks spilling out.
6. **Smolder** (`pyromancer/smolder`): one glowing coal held in iron tongs, thin wisps of grey smoke drifting up.

## Healers

**Cleric**: warm ochre background, cream linen, gold accent (flat gold with a hard white shine mark, not glowing).
1. **Smite** (`cleric/smite`): a shaft of flat gold rays, drawn as solid wedges, striking down onto cracked stone.
2. **Mend** (`cleric/mend`): a linen bandage half unrolled, a gold thread stitching a tear in it shut.
3. **Dawn Petal** (`cleric/petal`): three cream lotus petals drifting, edged in gold.
4. **Prayer Circle** (`cleric/prayer`): a ring of lit candles on a stone floor, seen from above, wax pooling at their bases.
5. **Intervention** (`cleric/intervene`): a white feather lying on stone, lifting back up into a narrow column of flat gold.
6. **Benediction** (`cleric/bene`): a gold sun disc with a cream ribbon tied round it, like a blessing token.

**Grovekeeper**: olive background, bark brown, leaf green, blossom pink accent.
1. **Wrath** (`grovekeeper/wrath`): a lightning bolt drawn as a crooked green branch, splitting down through the frame.
2. **Rejuvenate** (`grovekeeper/rejuv`): a seed split open, a green sprout uncurling from it with two new leaves.
3. **Thornlash** (`grovekeeper/thorn`): a coiled bramble whip with long, hooked thorns, mid-crack.
4. **Wild Growth** (`grovekeeper/growth`): a small oak bursting into full leaf all at once, its roots spreading wide below.
5. **Bloom** (`grovekeeper/bloom`): one large pink-and-white flower opening, pollen drifting from it in a few round dots.
6. **Rebirth** (`grovekeeper/rebirth`): an acorn cracked open with a new shoot rising out of it, ringed by fallen brown leaves.

**Chronomancer**: deep teal background, brass, pale teal accent.
1. **Temporal Bolt** (`chronomancer/bolt`): a brass clock hand thrown like a dart, a pale teal streak behind it.
2. **Rewind** (`chronomancer/rewind`): a brass clock face with a bold curved arrow drawn round it the wrong way, anticlockwise.
3. **Shift** (`chronomancer/shift`): a brass dial with a lever in the middle. One side is marked with a snail shell, the other with a swallow's wing.
4. **Accelerando** (`chronomancer/accel`): a wooden metronome, its arm swinging so fast it leaves three ghost strokes.
5. **Stasis** (`chronomancer/stasis`): an hourglass with the sand frozen mid-fall, enclosed in a thin shell of pale teal crystal.
6. **Recall** (`chronomancer/recall`): an open pocket watch on a chain, its glass cracked, the hands moving again.

**Alembist** (new healer, 2026-10): dark walnut background, copper and clear glass, with each reagent's own colour as the accent (Ember red-orange, Dew blue, Salt white). Until a painted file arrives the game draws a simple placeholder icon for each move. When a file is added, also add its id to `client/icons/alembist/manifest.json` (a JSON list of ids, for example `["ember","dew"]`), so the game knows to load it.
1. **Ember** (`alembist/ember`): a single red-orange coal dropping into the open mouth of a glass flask, a cartoon flame with a curled tip licking up from it.
2. **Dew** (`alembist/dew`): one fat blue drop falling from a curled green leaf tip, a small round ripple below.
3. **Salt** (`alembist/salt`): a little heap of chunky white salt crystals poured from a tipped wooden scoop, cubes drawn as flat hexagons.
4. **Throw** (`alembist/throw`): a corked round vial tumbling through the air on a curved arc, three tapered speed lines behind it, a few flat glass-shard shapes where it is about to land.
5. **Distill** (`alembist/distill`): a copper still with a coiled pipe, one bright drop forming at the spout, two puffs of flat white steam.
6. **Grand Batch** (`alembist/batch`): a wooden rack holding a row of corked vials, all different colours, seen front-on.
7. **Grand Blend** (`alembist/blend`, talent, replaces Grand Batch): one big round-bottom flask with swirled bands of red, blue and white liquid inside, its cork tied down with string.
8. **Quicksilver** (`alembist/quicksilver`, talent, replaces Salt): a bead of liquid silver rolling off a spoon, its mirrored surface drawn with one hard white highlight and a flat blue-grey shadow.

## Tips

- Paste the shared style block word for word for every class, and keep the same seed or style reference.
- Shrink each finished row to 40 px and convert it to grey. If two icons look the same, redo one with a different shape.
- Pick the image with the flattest shading and boldest shape. Skip any with soft airbrushed gradients or glow.

## Advanced DPS (added 2026-10-19)

Until these arrive the game draws simple glyph icons for both classes (data.js `art.icons: false`; flip it to `true` once the six icons, the two talent moves and the spec move from `spec-icons.md` are all in).

**Thermist**: plum-charcoal background, brass, two accents: frost blue for frost moves, ember orange for fire moves. Keep each icon to one accent unless the move uses both.
1. **Cinder Bolt** (`thermist/cinder`): a small, fat fire bolt diving down-right, cartoon flame tongues with curled tips, a short tail.
2. **Rime Shard** (`thermist/rime`): one slim, faceted ice shard flying up-right, a few flat chips breaking off its tail.
3. **Flare** (`thermist/flare`): an open hand-sized burst of flame shaped like a blooming flower, eight curled petals of fire round a pale yellow centre.
4. **Glacier Lance** (`thermist/lance`): a long, heavy spear of blue ice, diagonal across the whole frame, its point white.
5. **Equilibrium** (`thermist/equil`): a brass balance scale perfectly level, a small flame in one pan and a snowflake in the other.
6. **Inversion** (`thermist/invert`): an hourglass turned on its side mid-flip, orange sand in one bulb and blue snow in the other, a curved arrow round it.

Talent moves (they borrow the icon above until painted):
7. **Thermocline** (`thermist/thermocline`): a single bolt whose head is orange and whose tail turns blue, a wavy line running through it.
8. **Absolute Zero** (`thermist/zero`): a large, flat six-armed snowflake over a brass dial whose needle is pinned hard to the far left.

**Driftblade**: slate-teal background, pale steel, jade accent.
1. **Carve** (`driftblade/carve`): a curved sabre mid-cut, one thick jade crescent arc trailing it.
2. **Slipstream** (`driftblade/slip`): three long tapered wind streaks running left to right, a single leaf riding the middle one.
3. **Hook Turn** (`driftblade/hook`): a bold curved arrow hooking round a small dark post and coming back on itself, a sabre glint at the arrow's head.
4. **Crosswind** (`driftblade/cross`): a wide crescent blade made of wind, flying across the frame, two leaves tumbling in its wake.
5. **Stillpoint** (`driftblade/still`): a sabre held perfectly level, its point resting on a small circle drawn on the ground, the wind lines around it stopped dead.
6. **Gale Run** (`driftblade/gale`): a spiral of jade wind, tight at the centre and opening outward, a ribbon caught in it.

Talent moves (they borrow the icon above until painted):
7. **Gyre** (`driftblade/gyre`): a ribbon making one full loop round a small dark post, four short cut marks spaced round the loop.
8. **Tailspin** (`driftblade/tailspin`): three sabre arcs whirling round one centre, like a spinning top seen from above.

## Threadweaver and Marionettist (new healer and DPS, 2026-10)

Until these arrive the game draws simple glyph icons for both classes (data.js `art.icons: false`; flip it to `true` once all the icons below, the spec moves and the talent moves are in).

**Threadweaver**: plum background, silver needle, one lilac accent (the thread).
1. **Needle** (`threadweaver/needle`): a long silver needle diving diagonally down-right, a short lilac thread trailing from its eye, three tapered speed lines.
2. **Tie** (`threadweaver/tie`): two short ends of lilac thread tied together in one fat, neat knot in the centre, the loose ends curling away.
3. **Mend Seam** (`threadweaver/mend`): a tear in a strip of cream cloth closed by a neat row of lilac cross-stitches, the needle resting at the end of the seam.
4. **Snap** (`threadweaver/snip`): open silver dressmaker's shears just closing on a taut lilac thread, the cut ends springing apart.
5. **Tighten** (`threadweaver/tighten`): a lilac thread pulled into a straight hard line between two small iron rings, one ring tilted as it is yanked, two speed lines.
6. **Tapestry** (`threadweaver/tapestry`): a small round woven tapestry seen flat-on, gold and lilac threads crossing in a bold over-under pattern, a fringe along the bottom edge.
7. **Embroider** (`threadweaver/embroider`, talent, replaces Mend Seam): a wooden embroidery hoop holding a bold stitched flower in lilac and gold, the needle stuck in one petal.
8. **Cat's Cradle** (`threadweaver/cradle`, talent, replaces Tighten): a star-shaped cat's-cradle string figure in lilac, held open in the air by nothing, its crossing points drawn as small knots.

**Marionettist**: deep rose background, pale wood and porcelain, one rose accent.
1. **Jab** (`marionettist/jab`): a small wooden doll's arm with a ball joint at the elbow, thrusting a slim stiletto up-right, one bright point at the tip.
2. **Pull Strings** (`marionettist/pull`): a wooden cross-shaped control bar seen from below, three strings snapping taut and pulled hard to one side, speed lines along them.
3. **Cross-Cut** (`marionettist/cross`): two taut strings crossing in an X, each drawn as a thin silver blade edge, a rose spark where they cross.
4. **Pirouette** (`marionettist/pirouette`): a doll's porcelain ballet slipper on point, a bold rose spiral of motion lines wrapping round it.
5. **Swap** (`marionettist/swap`): two curved arrows chasing each other in a circle, one pale wood and one black, a puff of flat grey smoke between them.
6. **Grand Finale** (`marionettist/finale`): a pair of rose stage curtains drawn back from a small stage with a single bright gold spotlight disc on its floor.
7. **Tangle** (`marionettist/tangle`, talent, replaces Pirouette): a ball of snarled rose string with a stiletto pushed through it.
8. **Red Curtain** (`marionettist/redcurtain`, talent, replaces Swap): a heavy red velvet curtain falling closed, gold fringe along its bottom edge.