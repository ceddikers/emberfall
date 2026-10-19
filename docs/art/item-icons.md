# Item icon briefs (inventory, loot, tooltips)

**Style (paste before every item, 2026-10-19 second pass, matching `ability-icons.md`):**

> Fantasy cartoon game item icon in a clean cel-shaded anime style, like a prop sheet for a hand-drawn fantasy animated series. One object, centred, filling about 75% of the square, with a chunky, clear silhouette that reads at 48 pixels. Confident line art: a thick dark outline around the object, thinner lines inside. Flat colours with one hard-edged shadow tone and a small hard white highlight. Magic and gems are flat, bright shapes of solid colour, never glow. A plain, flat, dark background with a slightly lighter circle behind the object. Light from the upper left.

**Avoid (negative prompt):** glow, neon, bloom, lens flare, sparkles, particles, soft gradients, airbrushing, realistic rendering, photo textures, chrome shine, hands, people, busy fine detail, frame, border, text, watermark.

**Layout:** weapons are diagonal (handle bottom-left, tip top-right); books, foci and hourglasses stand upright; armour is shown on its own, front view. Items 1-57 have old AI-style art in the game; redo them in this style so the bag matches. Items 58-113 have no art yet.

**Rarity** (Common grey, Uncommon blue, Rare purple, Legendary orange, Mythic red) is drawn by the game as the icon's frame, so the paintings themselves don't need it. Mythics (106-113) can be a touch grander: richer materials and one bold flat accent colour.

**Tiers:**
- **Recruit** items are plain and worn.
- **Grubnak** items are kitchen-themed.
- **Skitterra** items are spider-themed (chitin, silk, fangs, venom green).

**Sheet:** please keep the numbered order below in an even grid (5 per row works well; several sheets are fine). The numbers are how I match each icon to its item; files end up in `client/items/<key>.png`.

## Bastion (royal blue accent)
1. **Recruit's Arming Sword**: A plain steel arming sword with a straight iron crossguard, brown leather grip, and a small nick in the blade.
2. **Cleaverguard Sword**: A broad sword whose blade widens to a square, cleaver-like tip, with a brass crossguard and blue leather grip.
3. **Silkrend Oathblade**: An elegant pale-steel longsword with a silver web etched down the blade, a crossguard of curved spider legs, a gold pommel with a blue gem, and a torn strand of silk caught on the edge.
4. **Iron Skillet Plate**: A breastplate of hammered black cast iron with a round skillet-like plate over the chest, big rivets, and blue cloth trim.
5. **Broodwarden Plate**: A steel breastplate layered with glossy dark chitin plates like a beetle shell, blue enamel trim, and eight small amber studs across the chest.

## Bloodreaver (blood red accent)
6. **Recruit's Hatchet**: A small iron hatchet with a wooden haft wrapped in faded red cloth.
7. **Butcher's Greataxe**: A huge two-handed axe with a rectangular, cleaver-shaped head, a meat hook on the back, blood-spattered steel, and a thick wooden haft.
8. **Fangreaver Axe**: A double-bladed axe whose blades are two curved spider fangs, bone white with dark-red tips, on a dark iron haft wrapped in red.
9. **Bloodstained Apron Mail**: A chainmail shirt under a heavy leather butcher's apron, with dark red stains and iron buckles.
10. **Chitin Ravager Harness**: A spiked harness of black-red chitin plates on leather straps, with bone spikes on the shoulders.

## Runeguard (violet accent)
11. **Recruit's Rune Focus**: A plain grey hexagonal stone with one faint violet rune carved into it.
12. **Spiced Rune Focus**: A violet hexagonal crystal set in a copper frame like a spice grinder, with peppercorns orbiting it and a warm orange rune bright at its heart.
13. **Eight-Eyed Ward Focus**: A dark violet hexagonal crystal with a ring of eight small bright lavender eyes, bound to a silver frame by silk threads.
14. **Simmerweave Robes**: A violet robe with an orange flame-stitch hem and a faint curling steam pattern.
15. **Silkward Robes**: A deep violet robe overlaid with pale silver web-patterned silk, closed with a hexagonal rune clasp.

## Ranger (forest green accent)
16. **Recruit's Shortbow**: A simple short wooden bow with a plain string and one arrow nocked.
17. **Hickory Kitchen Bow**: A dark hickory recurve bow with its limbs bound in kitchen twine and a sprig of rosemary tucked into the grip.
18. **Silkstring Longbow**: A tall, elegant pale-wood longbow with green inlay, a pale silk string, and tips curved like spider legs.
19. **Smoked Leather Jerkin**: A brown leather jerkin darkened by smoke, with a green hood folded at the collar and a small pouch of dried herbs on the belt.
20. **Webstalker Cloak**: A hooded green-grey cloak covered in web-pattern netting with dangling strips of camouflage silk.

## Shadowblade (purple accent)
21. **Recruit's Knives**: Two plain short knives, crossed, with black cloth grips.
22. **Paring Knives**: Two small curved kitchen paring knives, crossed, with purple-wrapped handles and a hard white shine on the edges.
23. **Twin Fangs**: Two curved daggers shaped like glossy black spider fangs, crossed, with green venom dripping from the tips and purple-wrapped grips.
24. **Pantry Shadow Garb**: A near-black wrapped cloth vest with many small pockets and a crimson sash.
25. **Widow's Wrap**: A black silk body wrap with a red hourglass mark on the chest and a trailing crimson scarf.

## Pyromancer (orange accent)
26. **Recruit's Primer**: A thin brown leather spellbook with a simple flame mark on the cover.
27. **Grease Fire Grimoire**: A thick purple tome with a grease-stained cover and a brass clasp shaped like a frying pan, flames licking out from between the pages.
28. **Venomflame Tome**: A black chitin-bound book with a spider-eye clasp and green-and-orange flames curling off the pages.
29. **Charred Chef Robes**: A burnt-orange double-breasted chef's robe with gold buttons, scorched hems, and a wisp of smoke.
30. **Broodfire Vestments**: Dark red robes with an orange flame pattern woven like webbing and ember-orange stitching at the seams.

## Cleric (gold accent)
31. **Recruit's Sunstaff**: A plain wooden staff topped with a small brass sun disc.
32. **Dawnladle Staff**: A staff whose head is a golden ladle bowl cradling a bright sun orb, with rays around it.
33. **Sunweb Staff**: A white-wood staff topped with a golden sun disc whose rays are fine silk threads spun into a bright web.
34. **Linen of the Hearth**: A simple cream linen robe with a blue sash and a small embroidered hearth flame.
35. **Silken Vestments of Dawn**: Smooth cream-and-gold silk vestments with a sunburst embroidered on the chest and a blue sash.

## Grovekeeper (leaf green accent)
36. **Recruit's Branch**: A crooked plain branch with a couple of leaves.
37. **Herb Garden Staff**: A gnarled staff sprouting basil, rosemary and thyme, with a garlic bulb tied near the top and a bright green bud at the tip.
38. **Mossweb Staff**: A dark twisted staff wrapped in moss and spider silk with glinting dewdrops, a bright green bud cradled in a web at the top.
39. **Rootcellar Robes**: An earthy brown robe with root-pattern embroidery and a small burlap pouch at the belt.
40. **Spinner's Bark Mantle**: A bark-plated shoulder mantle draped with silk and moss, with leaf-green trim.

## Chronomancer (teal accent)
41. **Recruit's Chronoglass**: A small plain hourglass with a wooden frame and white sand.
42. **Kitchen Timer Chronoglass**: A brass egg-timer hourglass with a little bell and a dial, full of bright teal sand.
43. **Eightfold Hourglass**: A silver hourglass held by eight spider-leg supports, its glass laced with silk, with gold sand inside.
44. **Simmering Moment Robes**: Deep teal robes with silver trim and a pattern of bubbles and steam frozen in mid-air.
45. **Silken Second Robes**: Dark teal silk robes with a clock-face web pattern and silver tick marks.

## General items (any class)
46. **Butcher's Cleaver**: A big square kitchen cleaver with a dented steel blade, a hole near the spine, and a worn wooden handle.
47. **Simmering Ladle**: A large steel ladle brimming with bright orange soup, steam rising from it.
48. **Fang Shortblade**: A short sword whose blade is a single curved, bone-white spider fang, with a leather-wrapped grip.
49. **Silkspun Wand**: A slender white wand wound with silk thread, tipped with a pale star-shaped crystal.
50. **Traveler's Coat**: A plain brown wool coat with a leather belt.
51. **Apron of the Kitchen Guard**: A white apron with a red stripe, padded and studded like armor, with a ladle in the front pocket.
52. **Chitin Hauberk**: A mail shirt reinforced with dark green-black chitin plates.
53. **Peppercorn Ring**: A gold ring set with a big glossy red-black gem like a peppercorn.
54. **Egg Timer Pendant**: A gold chain with a tiny egg-timer hourglass pendant full of bright blue sand.
55. **Eightfold Band**: A silver ring shaped like eight spider legs wrapping around the finger, set with a small blue gem.
56. **Venom Pendant**: A gold pendant holding a green gem shaped like a drop of venom.
57. **Silkguard Charm**: A small shield-shaped charm wrapped in pale silk threads with a lavender sheen.

## Volkar sheet (items 58-81)
**Tier style:** storm-themed. Slate-grey stone, dark wet iron, lightning-blue accents (cracks, runes or zigzag bolts in flat bright blue), with a little rain sheen. Keep each class's accent colour in the trim. Same layout rules as above.

### Class items
58. **Stormward Oathblade** (Bastion): A broad steel longsword with a slate-grey fuller cracked by a line of blue lightning, a crossguard shaped like two storm clouds, and royal-blue leather on the grip.
59. **Thunderforged Plate** (Bastion): A heavy breastplate of dark iron with slate inlays, a lightning-bolt emblem embossed in silver on the chest, and blue cloth trim.
60. **Skysplitter Axe** (Bloodreaver): A huge axe whose head is a wedge of split slate bound in iron, with a crackling blue seam along the edge and a red-wrapped haft.
61. **Stormrent Harness** (Bloodreaver): A spiked iron-and-leather harness with storm-grey plates, deep red straps, and small blue sparks caught on the spikes.
62. **Lodestone Rune Focus** (Runeguard): A hexagonal lodestone crystal, dark and metallic, with a violet rune bright in it and tiny iron filings standing on end around its edges.
63. **Galeweave Robes** (Runeguard): Violet robes whose hem streams sideways as if caught in a gale, with silver wind-swirl embroidery.
64. **Thunderhead Longbow** (Ranger): A tall dark-wood longbow with grey storm clouds carved along its limbs, a pale blue string, and green grip wrapping.
65. **Windrunner Cloak** (Ranger): A grey-green hooded cloak with a rain-darkened hem, flapping as if in wind, fastened with a small silver feather clasp.
66. **Stormcut Knives** (Shadowblade): Two short knives with blades of dark slate edged in bright blue, crossed, with purple-wrapped grips.
67. **Galeshroud Garb** (Shadowblade): A dark grey wrapped vest with a long trailing scarf blowing sideways, a purple sash, and a faint rain sheen.
68. **Tome of the Burning Sky** (Pyromancer): A thick book bound in charred slate-grey leather, a lightning bolt and a flame crossed on the cover, orange fire and blue sparks escaping its pages.
69. **Stormfire Vestments** (Pyromancer): Dark red robes with orange flame trim, a pattern of blue lightning forks running through the fabric.
70. **Skylight Staff** (Cleric): A white-wood staff topped by a golden sun disc breaking through a small grey storm cloud, rays shining through.
71. **Vestments of the Clear Sky** (Cleric): Pale sky-blue and cream vestments with a gold sunburst on the chest and a soft parting-cloud pattern at the hem.
72. **Stormstruck Oak** (Grovekeeper): A gnarled oak staff split down the middle by an old lightning strike, the scar a pale blue, with fresh green leaves sprouting from the split.
73. **Rainwood Mantle** (Grovekeeper): A bark shoulder mantle beaded with raindrops, moss in the grooves, leaf-green trim.
74. **Storm-Eye Hourglass** (Chronomancer): A silver hourglass whose glass holds a tiny swirling storm cloud instead of sand, with a spark flickering in its centre.
75. **Robes of the Still Moment** (Chronomancer): Dark teal robes with raindrops embroidered frozen in mid-fall and silver clock-hand trim.

### General items
76. **Thunderstone Maul**: A two-handed maul with a block of grey slate for a head, a blue lightning crack running through it, on an iron-banded wooden haft.
77. **Lightning Rod Scepter**: A short iron scepter crowned with three spikes like a lightning rod, a blue spark crackling between the tips.
78. **Slatescale Mail**: A coat of small overlapping slate-grey scales like a fish, with an iron collar.
79. **Polarity Ring**: A silver ring set with two small gems side by side, one warm gold and one cold blue.
80. **Eye of the Storm**: A pendant holding a round grey stone with a slowly turning blue swirl inside it, like a storm seen from above.
81. **Grounding Charm**: A small iron charm shaped like a spike driven into a rock, with a copper wire wound around it.

## Hollow King sheet (items 82-105)
**Tier style:** royal and dead. Tarnished gold, dark iron and old bone, pale grave-green accents (in fullers, gems and runes), with warm candle-yellow highlights. Keep each class's accent colour in the trim. Same layout rules as above.

### Class items
82. **Barrowking Oathblade** (Bastion): A long dark-steel sword with a grave-green fuller, a crossguard shaped like a small spiked crown in tarnished gold, and royal-blue leather on the grip.
83. **Gravewarden Plate** (Bastion): A breastplate of blackened iron with a gold crown emblem on the chest, tomb-stone grey pauldrons, and blue cloth trim.
84. **Kingslayer Greataxe** (Bloodreaver): A huge axe with a crescent head of dark iron, a broken gold crown hammered onto the back of the head like a trophy, and a red-wrapped haft.
85. **Barrow Reaver Mail** (Bloodreaver): A chainmail shirt with bone plates riveted over the ribs, deep red straps, and a grey burial cloth tied at the waist.
86. **Crown-Rune Focus** (Runeguard): A hexagonal crystal of smoky green glass ringed by a thin gold crown, a violet rune bright in its centre.
87. **Tombward Robes** (Runeguard): Violet robes with tarnished gold borders and a faint pattern of grave slabs and runes down the front.
88. **Moonset Longbow** (Ranger): A tall black-wood longbow with a silver crescent moon at the grip, a pale silver string, with green grip wrapping.
89. **Nightwatch Cloak** (Ranger): A deep green-black hooded cloak with a small iron lantern clasp and a frayed hem, as if worn on many night watches.
90. **Lantern-Thief Knives** (Shadowblade): Two short curved knives with warm amber edges, crossed, a tiny brass lantern charm hanging from one pommel, purple-wrapped grips.
91. **Shroud of the Long Night** (Shadowblade): A near-black wrapped garb with a hood, starlit silver flecks woven in, and a purple sash.
92. **Tome of the Last Lantern** (Pyromancer): A heavy book bound in dark leather with a little iron lantern set into the cover, a warm orange flame burning inside it.
93. **Candlewax Vestments** (Pyromancer): Dark red robes dripped with pale candle wax at the shoulders, orange flame trim, embers at the hem.
94. **Staff of the Dawn After** (Cleric): A white-wood staff topped by a golden sun disc rising out of a black crescent of night, rays breaking through.
95. **Vestments of the Unsetting Sun** (Cleric): Cream and gold vestments with a gold sun on the chest that never sets below its embroidered horizon line, blue sash.
96. **Barrow Yew** (Grovekeeper): A gnarled dark yew staff (the graveyard tree) with dark needles, red berries, and a bright green bud at the tip.
97. **Gravemoss Mantle** (Grovekeeper): A bark shoulder mantle thick with pale grave-moss and tiny white flowers, leaf-green trim.
98. **Moonset Hourglass** (Chronomancer): A silver hourglass whose upper glass holds a small pale moon, slowly sinking into the lower glass as sand.
99. **Robes of the Final Hour** (Chronomancer): Dark teal robes with a large silver clock face at the chest, its hands near midnight, and silver trim.

### General items
100. **Hollow Crown Greatsword**: A long two-handed greatsword of dark steel with a grave-green fuller and a crossguard that is a spiked gold crown.
101. **Sceptre of the Barrow**: A short gold sceptre topped with a small crown around a bright grave-green gem.
102. **Royal Burial Shroud**: Pale linen burial wrappings worn as a tunic, bound with a tarnished gold band, a faded green crest at the chest.
103. **Signet of the Hollow King**: A heavy tarnished-gold signet ring with a small crown engraved on a dark green stone.
104. **Barrow Bell Pendant**: A gold chain with a tiny bronze bell pendant, a pale green shine inside its mouth.
105. **Last Lantern Charm**: A small iron lantern charm on a ring, a warm golden flame burning inside its glass.

## Mythic sheet (items 106-113)
**Style:** each boss's tier style above (kitchen, spider, storm, royal-and-dead), but grander: these are the rarest drops in the game. Same layout rules. Files: `client/items/<key>.png` (key in brackets).

106. **The Ogre's Stockpot** (`m_stockpot`, Grubnak, accessory): A squat, battered iron cooking pot on a short chain loop, thick orange stew bubbling over the rim, a wooden spoon handle sticking out, and one big ogre tooth hanging from the chain.
107. **Head Chef's Whites** (`m_whites`, Grubnak, armour): A tall, crisp white double-breasted chef's coat with gold buttons, a red neckerchief, a cleaver tucked through a leather belt, and a few proud splashes of sauce.
108. **Eye of the Broodmother** (`m_broodeye`, Skitterra, accessory): A gold pendant holding a cluster of six glossy red spider eyes of different sizes set in black chitin, hung on a chain of pale silk thread.
109. **Venomweave Shroud** (`m_venomweave`, Skitterra, armour): A dark green-black hooded shroud woven from thick spider silk in a web pattern, bright venom-green drops beaded along its threads and hem.
110. **Stormcaller's Torc** (`m_torc`, Volkar, accessory): An open neck-ring of twisted dark iron, its two ends capped with round slate stones that each hold a bright blue lightning rune, a small flat zigzag bolt arcing between them.
111. **Thunderhead Mantle** (`m_thunderhead`, Volkar, armour): Heavy slate-grey shoulder plates with a short storm-cloud-grey cape, a flat bright blue lightning bolt running down the chest plate, and rain beading on the iron.
112. **Crown of the Barrow** (`m_crown`, the Hollow King, accessory): A tarnished gold crown with tall, thin spikes, one spike broken off, a grave-green gem at the front and a few strands of old cobweb between the points.
113. **Mantle of the Dead Court** (`m_deadcourt`, the Hollow King, armour): A deep plum-black royal mantle with a high stiff collar, a tarnished gold chain of office across the chest, a small grave-green brooch, and a frayed, grave-dusted hem.

## Alembist sheet (new healer, 2026-10; copper orange accent)
**Style:** the shared style above and each boss's tier theme. A retort (the Alembist's weapon) is a glass flask with a long bent neck; draw it diagonal like the other weapons, the bulb bottom-left and the neck rising to the top-right. Coats stand front view. Until the art arrives the bag draws a simple retort shape. Files: `client/items/<key>.png` (key in brackets).

114. **Recruit's Retort** (`alembist_w0`): A plain, slightly cloudy glass retort with a chipped neck, a cork stopper and a frayed cord tied round the bulb.
115. **Stockpot Retort** (`alembist_w1`): A squat copper-bottomed retort like a little stockpot with a glass neck, a dented ladle handle soldered on as a grip, thick orange broth sloshing inside.
116. **Venomglass Retort** (`alembist_w2`): A retort of dark green glass with a silver web etched round the bulb, two curved spider-fang clasps holding the neck, a bright venom-green liquid inside.
117. **Stormcatcher Retort** (`alembist_w3`): A clear glass retort caged in twisted dark iron wire, a tiny storm cloud trapped in the bulb with a flat blue zigzag bolt.
118. **Barrow-Lamp Retort** (`alembist_w4`): A tarnished gold and glass retort shaped like a grave lantern, a small crown-shaped stopper, a pale grave-green liquid with one flat green flame floating on it.
119. **Grease-Spattered Apron** (`alembist_a1`): A heavy canvas apron splashed with sauce and grease, a wooden spoon and a corked vial in its front pocket, copper buckles.
120. **Silk-Lined Lab Coat** (`alembist_a2`): An olive lab coat lined with pale spider silk showing at the open front and cuffs, a row of chitin buttons and a small vial loop on the chest.
121. **Oilskin Coat of the Summit** (`alembist_a3`): A long slate-grey oilskin coat with a high storm collar, rain beading on its shoulders, a bandolier of three blue-tinted vials across it.
122. **Gravedust Smock** (`alembist_a4`): A plum-grey smock dusted pale with grave dust, a tarnished gold clasp at the throat, a few small labelled jars hanging from a cord belt.
