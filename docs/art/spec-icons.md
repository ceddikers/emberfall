# Specialization art briefs (ability icons, then portraits)

## Ability icons

**Style:** the hand-painted gouache style in `ability-icons.md`: use its shared style block, its avoid list and the class's background and palette. Where a line below says "glowing" or "light", paint it as a flat, bright shape of colour, not an actual glow. No frame, border or text; the game adds the slot frame.

**Sheet:** one row per spec, in the order below. Files end up in `client/icons/<class>/<id>.png`. The id is given for each icon.

Only moves that are new to a spec need an icon. Changed moves (for example Sentinel's Brace with a third charge) keep their current icon. Until a new icon arrives, the game borrows the icon of the move it replaced.

### Tanks (batch 1)

**Bastion · Sentinel** (silver and royal blue)
1. **Shield Bash** (`bastion/bash`), replaces Holy Edge: a huge silver tower shield slamming forward, a blue shockwave bursting from its face, small sparks of light at the impact.

**Bastion · Crusader** (gold and white)
2. **Zealous Guard** (`bastion/zeal`), replaces Bulwark: a gold-trimmed shield with a blazing sun emblem, rays of dawn light streaming out behind it.

**Bloodreaver · Berserker** (orange-red, fire and rage)
3. **Rampage** (`bloodreaver/rampage`), replaces Crimson Drain: a wild double-handed axe swing leaving a burning orange-red arc, with cracks of fiery light along the blade.

**Bloodreaver · Hemomancer** (deep crimson and black)
4. **Blood Lance** (`bloodreaver/lance`), replaces Bloodletting: a spear of liquid blood flying diagonally, droplets trailing behind it and a dark red glow at the tip.

**Runeguard · Spellwarden** (pale ice blue)
- No new moves. Runic Ward keeps its icon; it just goes on an ally now.

**Runeguard · Runeblade** (violet and lavender)
5. **Rune Blade** (`runeguard/cut`), replaces Rune Strike: a straight sword etched with glowing violet runes, slashing diagonally with a lavender trail.
6. **Rune Cleave** (`runeguard/cleave`), replaces Glyph Burst: a wide sweeping cut, a burning violet rune left hanging in the air where it passed.

### Healers (batch 2)

**Cleric · Aegis** (pale gold and white)
7. **Divine Barrier** (`cleric/barrier`), replaces Mend: a translucent golden dome over a glowing rune circle, a single white feather drifting down onto it.

**Cleric · Inquisitor** (burning orange and gold)
8. **Condemn** (`cleric/condemn`), replaces Benediction: a lance of holy fire striking down, a blazing four-pointed brand seared into the ground where it hits.

**Grovekeeper · Lifebinder** (spring green and blossom pink)
9. **Lifebind** (`grovekeeper/lifebind`), replaces Rejuvenate: two separate saplings joined by one curling green vine, small pink blossoms opening along it.

**Grovekeeper · Moonwell** (silver blue)
10. **Moonwell** (`grovekeeper/moonwell`), replaces Wild Growth: a still pool of moonlight seen from above, a crescent moon reflected in it, vines curling around its rim.

**Chronomancer · Echoist** (lilac)
11. **Echo Chamber** (`chronomancer/chamber`), replaces Accelerando: a clock face with three fading copies of itself rippling outward, like an echo.

**Chronomancer · Accelerant** (amber gold)
- No new moves. Temporal Bolt and Accelerando keep their icons; they just do more.

### DPS (batch 3)

**Ranger · Sharpshooter** (gold and steel)
12. **Aimed Shot** (`ranger/aimed`), replaces Piercing Arrow: an arrow drawn to the ear on a taut bow, a gold glint at the tip and a thin line of light running ahead to a distant target.

**Ranger · Venomstrike** (acid green)
13. **Caustic Arrow** (`ranger/caustic`), replaces Piercing Arrow: an arrow with a glowing green head dripping acid, splashing into a hissing green puddle.

**Shadowblade · Bladedancer** (silver and violet)
14. **Blade Fury** (`shadowblade/fury`), replaces Shadowstep: two curved blades whirling in a ring of silver and violet streaks, seen from above.

**Shadowblade · Nightstalker** (crimson and black)
15. **Backstab** (`shadowblade/backstab`), replaces Eviscerate: a dagger thrusting out of deep shadow, a single crimson streak and a red flash at the point.

**Pyromancer · Cataclysm** (deep red and orange)
16. **Meteor** (`pyromancer/meteor`), replaces Pyroblast: a burning rock falling out of a dark sky toward a glowing rune circle on the ground.

**Pyromancer · Sigilmancer** (amber)
17. **Ember Circle** (`pyromancer/circle`), replaces Combustion: a ring of burning glyphs on dark stone seen from above, a pair of scorched boot prints at its centre.

## Portraits (one per spec)

**Format:** the same as `hero-portraits.md` (the second, hand-painted gouache pass): a square head-and-shoulders bust, about 512 × 512, using its shared style block and avoid list. The spec's colour goes in the background wash and one piece of gear, not a glow, so read "light" in the lines below as painted colour. Keep the class's new face and design from `hero-portraits.md`; the spec changes the gear and mood. These show on the hero page when the spec is picked. Files go in `client/portraits/<class>-<spec>.png` (for example `bastion-sentinel.png`). Until one arrives, the hero page shows the animated sprite in the spec's look.

1. **Bastion · Sentinel** (silver-blue): the same great-helm, now with a broad silver tower shield raised to the chin, heavier plate pauldrons, a calm and immovable stance.
2. **Bastion · Crusader** (gold): the helm with its visor raised to show determined eyes, a gold tabard with a sun emblem over the plate, a glowing sword hilt at the shoulder, warm dawn light from one side.
3. **Bloodreaver · Berserker** (orange-red): helmet off, a wild mane of hair, red war paint across the face, bare scarred shoulders, embers rising around him, a snarl.
4. **Bloodreaver · Hemomancer** (crimson): a dark hooded cowl over the horned helm, red eyes, dark robes over mail, small orbs of blood floating beside the head.
5. **Runeguard · Spellwarden** (pale blue): the violet hood edged in pale ice-blue light, a circle of pale runes turning behind the head, one hand raised as if warding someone else.
6. **Runeguard · Runeblade** (violet): the hood pushed back a little, the hilt of a rune-carved sword held upright before the face, its runes glowing lavender.
7. **Cleric · Aegis** (pale gold): the same calm face under a white hood, a faint golden half-dome of light arching over the shoulders, serene and watchful.
8. **Cleric · Inquisitor** (orange): a sterner look, a burning orange sash across white robes, one hand raised with a glowing brand-mark in the palm.
9. **Grovekeeper · Lifebinder** (green and pink): a crown of fresh leaves, small pink blossoms in the hair, a soft green glow from below, a warm smile.
10. **Grovekeeper · Moonwell** (silver blue): moonlit, a pale crescent moon floating behind the head, silver light catching the face and robe, night-blue background.
11. **Chronomancer · Echoist** (lilac): a faint, slightly offset second outline of the head trailing behind, as if the portrait echoes, lilac light.
12. **Chronomancer · Accelerant** (amber): a golden clock-hand ring spinning behind the head, motion streaks, a focused, eager expression.
13. **Ranger · Sharpshooter** (gold): one eye narrowed down the shaft of a drawn arrow, a gold glint on the arrowhead, very still.
14. **Ranger · Venomstrike** (acid green): hood up, a green-tipped arrow held beside the face, faint green haze drifting from the quiver.
15. **Shadowblade · Bladedancer** (silver violet): two curved blades crossed before the chest, silver streaks curling around the shoulders, a light, poised look.
16. **Shadowblade · Nightstalker** (crimson): mostly in shadow, only the eyes and a dagger's edge lit in red, the hood pulled low.
17. **Pyromancer · Cataclysm** (deep red): looking up, face lit from above by a falling burning rock, embers in the hair.
18. **Pyromancer · Sigilmancer** (amber): standing in a ring of burning glyphs that light the face from below, hands open, calm and powerful.
