# Ability icon briefs (the hotbar, tooltips and the hero page)

Second pass, 2026-10-19, in the same hand-painted style as `hero-portraits.md`. The first sheet (`ability-icons-sheet.jpg`) reads as AI art for the same reasons the portraits did.

## Why the first sheet looks "AI"

- **Everything glows.** Every icon has a neon backdrop in its class colour, plus lens flares and sparkles. All 54 have the same lighting and finish, so nothing stands out.
- **Colour is the only thing telling icons apart.** Within a class they blur together: Bloodreaver is six red blobs, Pyromancer six orange fireballs.
- **Stock subjects.** Clip-art crosshairs, generic gears, glowing fists, and floating figures with outstretched arms (and AI hands).
- **Airbrushed and busy.** Smooth gradients and chrome shine, with fine detail that turns to mush at hotbar size.

## Shared style (paste this before every icon)

> Hand-painted gouache game ability icon, like a painted card from a printed tabletop RPG. One bold object, filling about 70% of the square, with a clear silhouette that reads at 40 pixels. Visible brush strokes and dry-brush texture, slight paper grain. A limited palette: the background colour, one or two object colours, and one bright accent used only where the action happens. Flat, hard-edged shadow shapes, ink linework that varies in weight. One warm light from the upper left. Motion is shown with a few dry-brush streaks, and magic as flat painted shapes of colour, like flames in an old woodblock print. A plain, mottled background wash in the class colour, darker at the corners with brush texture. Matte surfaces: metal is dull and scratched.

**Avoid (negative prompt):** glow, neon, bloom, lens flare, sparkles, particles, light rays, smooth gradients, chrome or plastic shine, glowing eyes, human figures, faces, hands, crosshair, gears, busy fine detail, frame, border, text, watermark.

**Rules for the set**
- **Keep the subject inside the central circle.** Some slots are drawn round, and the corners get cropped.
- **No people.** Use objects and signs instead: a horn for a war cry, an empty helmet, a feather. That rules out bad hands and floating wizards.
- **Different silhouettes within a class.** No two icons in a row should have the same shape (diagonal, round, upright, spread), so you can tell them apart in grey.
- **One bright spot per icon,** where the hit or the magic is. Everything else stays muted.

**Format:** square, about 256 × 256, no frame (the game adds the slot frame). Files go in `client/icons/<class>/<id>.png`, replacing the current ones. Make one class at a time as a row of six, so each class shares one background and palette.

## Tanks

**Bastion**: slate-blue background, dull steel, gold accent.
1. **Blade Chain** (`bastion/blade`): a plain arming sword pointing up-right, with three curved brush-stroke slash marks behind it, one after another; the last stroke is gold.
2. **Holy Edge** (`bastion/edge`): a crescent of flat gold light shaped like a sword's edge, flying left to right across the frame, with dry-brush speed streaks trailing it.
3. **Brace** (`bastion/brace`): a blue kite shield tilted to take a blow, with one white star-shaped spark at its top edge where something just struck it.
4. **Oath of Valor** (`bastion/oath`): a sword planted point-down, a red oath ribbon wound round its crossguard and sealed with a blob of wax.
5. **Rally Banner** (`bastion/banner`): a tall blue pennant on a pole driven into cracked stone, snapping in the wind, a small gold shield painted on the cloth.
6. **Bulwark** (`bastion/bulwark`): a massive rectangular wall-shield seen straight on, filling the frame. It has iron bands, big rivets and dents, and a thin gold rim.

**Bloodreaver**: dark oxblood background, black iron, bright red accent.
1. **Hack & Maul** (`bloodreaver/hack`): a notched bearded axe-head mid-chop, with two red brush-stroke gashes behind it.
2. **Crimson Drain** (`bloodreaver/drain`): an axe blade with blood running down it, the drops curling back up the haft in a spiral.
3. **Bloodletting** (`bloodreaver/letting`): a short hooked knife beside one thin red cut line, three drops falling from it.
4. **Frenzy** (`bloodreaver/frenzy`): a horned iron helm, one horn snapped short, with a red war-paint handprint smeared across the faceplate. The eye slits are empty and dark.
5. **War Cry** (`bloodreaver/warcry`): a curved bone war horn, its sound painted as three bold red rings bursting from the mouth.
6. **Undying** (`bloodreaver/undying`): one heavy iron chain link, cracked almost all the way through but still holding, bound with a strip of red cloth.

**Runeguard**: dusky violet background, grey slate, lilac accent.
1. **Rune Strike** (`runeguard/strike`): a stone-knuckled gauntlet, side-on, mid-punch, with one carved rune on the knuckle plate filled with lilac paint.
2. **Runic Ward** (`runeguard/ward`): six hexagonal slate tiles locked together into a small dome, a protective rune cut into the top tile.
3. **Glyph Burst** (`runeguard/glyph`): a round carved stone glyph breaking apart. Slate chips fly outward, and flat lilac colour shows through the cracks.
4. **Runic Overload** (`runeguard/overload`): a tall standing stone carved top to bottom with runes, every groove filled with bright lilac, cracks spreading at its base.
5. **Sanctum** (`runeguard/sanctum`): a ring of seven small rune stones on the ground, seen from slightly above, joined by thin painted lilac lines.
6. **Mirror Aegis** (`runeguard/mirror`): a round, polished silver mirror-shield. A red bolt strikes its face and bends straight back the way it came, in a sharp V.

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
2. **Eviscerate** (`shadowblade/evis`): two crimson brush-stroke slashes crossing in a bold X, a dagger lying across the centre.
3. **Shadowstep** (`shadowblade/step`): a sooty footprint dissolving into a puff of black smoke, with a second footprint appearing on the far side.
4. **Shadow Dance** (`shadowblade/dance`): a crimson scarf whirling in a loose spiral, three knife glints spaced along it.
5. **Venom Blade** (`shadowblade/venom`): a curved dagger with one bright green drop running down the fuller towards the point.
6. **Smoke Bomb** (`shadowblade/smoke`): a round black clay bomb with a sputtering lit fuse, a curl of grey smoke rising from it.

**Pyromancer**: burnt-umber background, soot black, orange and yellow accent.
1. **Fireball** (`pyromancer/fireball`): a small, fast ball of fire diving down-right, painted as curling woodblock-print flame tongues, with a short tail.
2. **Pyroblast** (`pyromancer/pyro`): a huge, slow orb of fire filling the frame, its crust dark and cracked, a yellow-white heart showing through the cracks.
3. **Fire Blast** (`pyromancer/fireblast`): a sharp eight-pointed starburst of flame, white-hot at the centre, its points hard-edged.
4. **Combustion** (`pyromancer/combust`): an open spellbook, its pages curling and catching fire from the edges in.
5. **Vent** (`pyromancer/vent`): a small iron furnace door bursting open, flame and sparks spilling out.
6. **Smolder** (`pyromancer/smolder`): one glowing coal held in iron tongs, thin wisps of grey smoke drifting up.

## Healers

**Cleric**: warm ochre background, cream linen, gold-leaf accent (flat and metallic like an old church icon, not glowing).
1. **Smite** (`cleric/smite`): a shaft of flat gold-leaf rays striking down onto cracked stone, painted like the rays on an old icon.
2. **Mend** (`cleric/mend`): a linen bandage half unrolled, a gold thread stitching a tear in it shut.
3. **Dawn Petal** (`cleric/petal`): three cream lotus petals drifting, edged in gold leaf.
4. **Prayer Circle** (`cleric/prayer`): a ring of lit candles on a stone floor, seen from above, wax pooling at their bases.
5. **Intervention** (`cleric/intervene`): a white feather lying on stone, lifting back up into a narrow column of gold leaf.
6. **Benediction** (`cleric/bene`): a gold sun disc with a cream ribbon tied round it, like a blessing token.

**Grovekeeper**: olive background, bark brown, leaf green, blossom pink accent.
1. **Wrath** (`grovekeeper/wrath`): a lightning bolt drawn as a crooked green branch, splitting down through the frame.
2. **Rejuvenate** (`grovekeeper/rejuv`): a seed split open, a green sprout uncurling from it with two new leaves.
3. **Thornlash** (`grovekeeper/thorn`): a coiled bramble whip with long, hooked thorns, mid-crack.
4. **Wild Growth** (`grovekeeper/growth`): a small oak bursting into full leaf all at once, its roots spreading wide below.
5. **Bloom** (`grovekeeper/bloom`): one large pink-and-white flower opening, pollen drifting from it in a few painted dots.
6. **Rebirth** (`grovekeeper/rebirth`): an acorn cracked open with a new shoot rising out of it, ringed by fallen brown leaves.

**Chronomancer**: deep teal background, brass, pale teal accent.
1. **Temporal Bolt** (`chronomancer/bolt`): a brass clock hand thrown like a dart, a pale teal streak behind it.
2. **Rewind** (`chronomancer/rewind`): a brass clock face with a bold curved arrow painted round it the wrong way, anticlockwise.
3. **Shift** (`chronomancer/shift`): a brass dial with a lever in the middle. One side is marked with a snail shell, the other with a swallow's wing.
4. **Accelerando** (`chronomancer/accel`): a wooden metronome, its arm swinging so fast it leaves three ghost strokes.
5. **Stasis** (`chronomancer/stasis`): an hourglass with the sand frozen mid-fall, enclosed in a thin shell of pale teal crystal.
6. **Recall** (`chronomancer/recall`): an open pocket watch on a chain, its glass cracked, the hands moving again.

## Tips

- Paste the shared style block word for word for every class, and keep the same seed or style reference.
- Shrink each finished row to 40 px and convert it to grey. If two icons look the same, redo one with a different shape.
- Pick the image with visible brushwork and slight unevenness over the "cleanest" one.
