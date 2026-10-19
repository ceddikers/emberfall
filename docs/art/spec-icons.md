# Specialization art briefs (ability icons, then portraits)

Second pass, 2026-10-19: cartoon/anime cel-shaded style, matching `ability-icons.md` and `hero-portraits.md`.

## Ability icons

**Style:** paste the shared style block and avoid list from `ability-icons.md`, and use the class's background and palette from there. No frame, border or text; the game adds the slot frame.

**Sheet:** one row per spec, in the order below. Files go in `client/icons/<class>/<id>.png`; the id is given for each icon.

Only moves that are new to a spec need an icon. Changed moves (for example Sentinel's Brace with a third charge) keep their current icon. Until a new icon arrives, the game borrows the icon of the move it replaced.

### Tanks

**Bastion · Sentinel** (silver and royal blue)
1. **Shield Bash** (`bastion/bash`), replaces Holy Edge: a silver tower shield slamming forward, bold blue impact rings bursting from its face, a few star-shaped spark marks.

**Bastion · Crusader** (gold and white)
2. **Zealous Guard** (`bastion/zeal`), replaces Bulwark: a gold-trimmed shield with a sun emblem, flat gold ray wedges fanning out behind it.

**Bloodreaver · Berserker** (orange-red)
3. **Rampage** (`bloodreaver/rampage`), replaces Crimson Drain: a two-handed axe mid-swing leaving a thick orange-red arc, cartoon flame shapes with curled tips along it.

**Bloodreaver · Hemomancer** (deep crimson and black)
4. **Blood Lance** (`bloodreaver/lance`), replaces Bloodletting: a spear made of liquid blood flying diagonally, round droplets trailing behind, a bright red point.

**Runeguard · Spellwarden** (pale ice blue)
- No new moves. Runic Ward keeps its icon; it just goes on an ally now.

**Runeguard · Runeblade** (violet and lavender)
5. **Rune Blade** (`runeguard/cut`), replaces Rune Strike: a straight sword etched with runes filled in flat lavender, slashing diagonally with a lavender arc.
6. **Rune Cleave** (`runeguard/cleave`), replaces Glyph Burst: a wide sweeping cut arc, with a violet rune left burning in the air where it passed.

### Healers

**Cleric · Aegis** (pale gold and white)
7. **Divine Barrier** (`cleric/barrier`), replaces Mend: a pale gold dome over a rune circle on the ground, a single white feather drifting down onto it.

**Cleric · Inquisitor** (burning orange and gold)
8. **Condemn** (`cleric/condemn`), replaces Benediction: a lance of holy fire striking down, a bright four-pointed brand stamped into the ground where it hits.

**Grovekeeper · Lifebinder** (spring green and blossom pink)
9. **Lifebind** (`grovekeeper/lifebind`), replaces Rejuvenate: two separate saplings joined by one curling green vine, small pink blossoms opening along it.

**Grovekeeper · Moonwell** (silver blue)
10. **Moonwell** (`grovekeeper/moonwell`), replaces Wild Growth: a still pool seen from above, a crescent moon reflected in it, vines curling round its rim.

**Chronomancer · Echoist** (lilac)
11. **Echo Chamber** (`chronomancer/chamber`), replaces Accelerando: a clock face with three fading copies of itself rippling outward, like an echo.

**Chronomancer · Accelerant** (amber gold)
- No new moves. Temporal Bolt and Accelerando keep their icons; they just do more.

### DPS

**Ranger · Sharpshooter** (gold and steel)
12. **Aimed Shot** (`ranger/aimed`), replaces Piercing Arrow: an arrow drawn on a taut bow, a gold arrowhead, and a thin dashed line running straight ahead to a small distant target.

**Ranger · Venomstrike** (acid green)
13. **Caustic Arrow** (`ranger/caustic`), replaces Piercing Arrow: an arrow with a bright green head dripping acid, splashing into a bubbling green puddle.

**Shadowblade · Bladedancer** (silver and violet)
14. **Blade Fury** (`shadowblade/fury`), replaces Shadowstep: two curved blades whirling inside a ring of silver and violet speed lines, seen from above.

**Shadowblade · Nightstalker** (crimson and black)
15. **Backstab** (`shadowblade/backstab`), replaces Eviscerate: a dagger thrusting out of a flat black shadow shape, one crimson streak, a red star-shaped flash at the point.

**Pyromancer · Cataclysm** (deep red and orange)
16. **Meteor** (`pyromancer/meteor`), replaces Pyroblast: a burning rock falling from a dark sky towards a rune circle on the ground.

**Pyromancer · Sigilmancer** (amber)
17. **Ember Circle** (`pyromancer/circle`), replaces Combustion: a ring of burning glyphs on dark stone seen from above, a pair of scorched boot prints at its centre.

## Portraits (one per spec)

**Format:** paste the shared style block and avoid list from `hero-portraits.md`. A square head-and-shoulders bust, about 512 × 512. Keep the class's character from `hero-portraits.md` (same person, same face); the spec changes the gear, mood and background colour. These show on the hero page when the spec is picked. Files go in `client/portraits/<class>-<spec>.png` (for example `bastion-sentinel.png`). Until one arrives, the hero page shows the animated sprite in the spec's look.

1. **Bastion · Sentinel** (silver-blue): the same knight, visor up, a broad silver tower shield raised to the chin, heavier plate pauldrons, calm and immovable.
2. **Bastion · Crusader** (gold): the same knight with a fierce, determined look, a gold tabard with a sun emblem over their plate, a sword hilt over their shoulder with a hard gold shine, a warm dawn-coloured background.
3. **Bloodreaver · Berserker** (orange-red): the same man with his helm off, his red-brown mane loose from its braids, orange war-paint stripes across his face, bare scarred shoulders, a few cartoon ember shapes floating up, mid roaring laugh.
4. **Bloodreaver · Hemomancer** (crimson): the same man in a dark red hooded cowl over the horned helm, calm, heavy-lidded eyes, dark robes over mail, three small orbs of blood floating beside his head.
5. **Runeguard · Spellwarden** (pale blue): the same warder, his violet hood trimmed in pale ice blue, a ring of pale blue runes behind his head as a flat graphic shape, eyes open now, one hand raised outward as if shielding someone.
6. **Runeguard · Runeblade** (violet): the same warder with the hood fully off, a rune-carved sword held upright before his face, its runes filled in flat lavender, a focused stare along the blade.
7. **Cleric · Aegis** (pale gold): the same priest under a white hood, a pale gold half-dome shape arching over his shoulders, serene and watchful.
8. **Cleric · Inquisitor** (orange): the same priest with a stern frown, a burning-orange sash over white robes, one hand raised with a bright four-pointed brand mark on the palm.
9. **Grovekeeper · Lifebinder** (green and pink): the same old druid with a crown of fresh leaves, small pink blossoms in her braid, a warm grandmotherly smile.
10. **Grovekeeper · Moonwell** (silver blue): the same druid against a night-blue background with a big pale crescent moon behind her head, silver-blue highlights on her face and hood.
11. **Chronomancer · Echoist** (lilac): the same time mage with a second, slightly offset lilac outline of his head drawn just behind him like a double exposure, one eyebrow raised.
12. **Chronomancer · Accelerant** (amber): the same time mage with a ring of gold clock hands behind his head and speed lines, his loupe flipped up, an eager grin.
13. **Ranger · Sharpshooter** (gold): the same ranger with one eye narrowed down the shaft of a drawn arrow, a gold arrowhead, very still.
14. **Ranger · Venomstrike** (acid green): the same ranger, hood up but face visible, a green-tipped arrow held beside her face, a few green bubbles drifting from the quiver.
15. **Shadowblade · Bladedancer** (silver violet): the same assassin with two curved blades crossed before the chest, silver speed-line swirls round the shoulders, a light, poised half-smile in the eyes.
16. **Shadowblade · Nightstalker** (crimson): the same assassin, hood pulled lower but eyes visible and narrowed, a deep black-red background, a single red highlight along the dagger's edge.
17. **Pyromancer · Cataclysm** (deep red): the same fire mage looking up, her face lit warm from above by a falling burning rock, cartoon embers in her hair, her hat brim smoking.
18. **Pyromancer · Sigilmancer** (amber): the same fire mage standing in a ring of burning glyphs that light her face from below, hands open, calm and powerful.

## Alembist specs (new healer, 2026-10)

**Ability icons** (Alembist palette from `ability-icons.md`: dark walnut background, copper, glass):

**Alembist · Apothecary** (herb green and cream)
- No new moves. Throw keeps its icon; with Shift it picks which vial goes.

**Alembist · Volatile** (soot black and fuse orange)
19. **Catalyst** (`alembist/catalyst`), replaces Distill: a stoppered round flask with three small drops (red, blue, white) falling into it at once, a jagged orange star-burst shape at the neck where they meet.

**Portraits** (same woman as `hero-portraits.md` #10):

19. **Alembist · Apothecary** (herb green): the same alchemist, goggles off and hanging at her neck, a **leather satchel of labelled clay jars** at her hip, a sprig of green herbs tucked behind one ear, reading a small handwritten label on a jar with calm, patient focus. Sage-green background with a pale mortar-and-pestle shape behind the head.
20. **Alembist · Volatile** (soot and orange): the same alchemist with soot smudged across her cheek and coat, goggles pulled down over her eyes with **orange lenses**, a few singed strands loose from her bun, holding up a vial with a **short lit fuse** spitting flat orange star-shaped sparks, a wide, slightly reckless grin. Charcoal background with a bold orange burst shape behind the head.
