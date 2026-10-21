# Boss move icons (the cast frame)

99 icons: one for every move a boss casts. They show in the cast frame near the middle of the screen, 46 px while the boss is casting and 34 px for the "Next" move, so each icon has to read at a glance at that size. The game draws a coded placeholder for each one until the painted icon arrives.

Same cartoon style as `ability-icons.md`, so the boss moves sit next to the hotbar without clashing.

## Shared style (paste this before every sheet)

> Fantasy cartoon game ability icons in a clean cel-shaded anime style, like props drawn for a hand-drawn fantasy animated series. A sheet of square icons in a 3 × 3 grid, evenly spaced with thin plain gaps between them, read left to right, top to bottom. Each icon is one bold object or sign filling about 70% of its square, with a chunky, clear silhouette that reads at 40 pixels. Confident line art: a thick dark outline around the object, thinner lines inside. Flat colours with one hard-edged shadow tone and a small hard white highlight. A limited palette: the background colour, one or two object colours, and one bright accent used only where the danger is. One light from the upper left. Motion is shown with a few clean, tapered speed lines, and magic as flat cartoon shapes in solid colour (flames with curled tips, bold rings, star bursts, zigzag bolts), never as glow. Each icon has a plain flat background in the boss's colour, with a simple darker vignette.

**Avoid (negative prompt):** glow, neon, bloom, lens flare, sparkles, particles, light rays, soft gradients, airbrushing, realistic rendering, photo textures, chrome shine, human figures, faces, hands, crosshair, busy fine detail, frame, border, text, letters, numbers, watermark.

**Rules for the set**
- **Show the shape of the danger where you can.** A player has about a second to read the icon. A wedge means a cone, a ring with a hollow middle means "get in", a solid disc means "get out", a line means a charge. The shape should hint what to do.
- **No people, and no boss portrait.** Use the boss's tools, body parts and signs: his cleaver, her fang, his fist, the king's crown.
- **Different silhouettes in a row.** No two icons side by side should have the same outline, so they can be told apart in grey.
- **Keep the subject inside the central circle,** and leave the corners empty.
- **No text on the sheet.** I slice by grid position, so the order below is all I need. If a sheet comes back with fewer than nine, tell me which ones are missing.

**Format:** one 3 × 3 sheet per block below (the last block of a boss can be a partial grid), square, at least 1536 × 1536. I cut each icon to `client/icons/boss/<boss>/<slug>.png` at 256 × 256 and wire them in over the placeholders.

---

## Grubnak, the Glutton Chef (29 icons, 4 sheets)

Background: deep kitchen red-brown. Objects: grease brown, iron grey, butcher's white. Accent: cooking-fire orange and yellow.

**Sheet 1**
1. **Chop Chop** (`chop-chop`): two meat cleavers crossed at an angle, one chopping down onto a board, the other raised behind it with an orange edge.
2. **Tenderize** (`tenderize`): a heavy spiked meat mallet coming straight down, two thick impact lines under it. (The tankbuster: make it feel heavy.)
3. **Cleaver Toss** (`cleaver-toss`): one cleaver spinning end over end along a straight line, a curved spin mark round it.
4. **Simmer** (`simmer`): a pot on the boil seen from the side, three fat bubbles rising and a wavy heat ring spreading from its base.
5. **Boil Over** (`boil-over`): the same pot with its lid lifting off and orange foam spilling over every side.
6. **Order Up!** (`order-up`): a silver serving dome on a plate, the dome lifted a crack, three short "ding" strokes above it.
7. **Clogged Drains** (`clogged-drains`): a round iron floor drain with brown grease welling up through its grate and running out.
8. **Flambé** (`flambe`): a frying pan tipped up, a tall flame leaping off it in pale blue with an orange tip.
9. **Grease Fire** (`grease-fire`): a flat brown puddle of grease on the floor, flames with curled tips standing up out of it.

**Sheet 2**
10. **Last Orders** (`last-orders`): a chalkboard menu with its lines crossed out, a small flame catching its bottom corner.
11. **Belly Flop** (`belly-flop`): a huge round apron-covered belly dropping straight down, shock lines bursting out sideways from under it.
12. **Gut Blast** (`gut-blast`): a wide cone of roaring wind and spittle blasting from a small dark mouth on the left across to the right.
13. **Larder Toss** (`larder-toss`): a wooden cask flying in an arc, a dotted arc line behind it ending in a ring on the floor.
14. **Rolling Meatballs** (`rolling-meatballs`): three giant meatballs bouncing off a wall, speed lines behind them.
15. **Meat Toss** (`meat-toss`): a raw steak with a bone, flying, a grease splat ring waiting on the floor under it.
16. **Mise en Place** (`mise-en-place`): a cleaver, a ladle and a pot lid laid out in a row on a board, left to right.
17. **Family Meal** (`family-meal`): one big platter with a roast on it, small plates pulled in round it. (The stack: the shape should say "come together".)
18. **Whisk** (`whisk`): a big balloon whisk, upright, spinning, with curved arrows round it.

**Sheet 3**
19. **Spice Rack** (`spice-rack`): three spice jars tipping over, each pouring a stream of a different coloured powder.
20. **Service!** (`service`): a brass counter bell being struck, a bold ring of sound around it.
21. **Flare-Up** (`flare-up`): stove burners in a row, every one jumping up into a tall orange flame.
22. **Ladle Spin** (`ladle-spin`): a ladle swinging round in a full circle, a solid orange disc of splash where it sweeps. ("Get out.")
23. **Lid Slam** (`lid-slam`): a pot lid slamming flat, a ring of shock round its edge and a hollow, safe middle. ("Get in.")
24. **Stockpot** (`stockpot`): a huge iron stockpot being heaved, a thick handle on each side, steam curling off the top.
25. **Gorge** (`gorge`): a giant fork stabbed into a pile of food, the pile half gone, crumbs flying.

**Sheet 4 (missed from the first list):** Grubnak's background and palette, the same as above.
26. **Mince** (`mince`): one cleaver raised high and glinting over a chopping board, the left half of the board lit orange. (His most common move: it chops one half of the room, so the icon should say "one side".)
27. **Double Chop** (`double-chop`): two cleavers side by side over a board split down the middle, both halves lit, the right half a little darker. (Hard: one half, then the other.)
28. **Butcher's Charge** (`butchers-charge`): a bull's horned head lowered to charge, a thick arrow on the floor in front of it.
29. **Last Call** (`last-call`): his enrage. A kitchen clock at midnight, a flame licking up its side.

---

## Queen Skitterra, the Spider Broodmother (22 icons, 3 sheets)

Background: dark cave blue-violet. Objects: plum purple, silk off-white. Accent: venom acid green, with pink-purple for her bites.

**Sheet 1**
1. **Venom Mist** (`venom-mist`): a rolling green fog cloud, three drops falling out of its underside.
2. **Venom Spit** (`venom-spit`): one fat green glob flying in an arc, a splash ring waiting where it lands.
3. **Venom Drip** (`venom-drip`): three green drops falling from above, each over its own small ring on the floor.
4. **Eightfold Lunge** (`eightfold-lunge`): a long jointed spider leg striking forward with a red tip, a pink wedge (a cone) opening in front of it.
5. **Silk Wrap** (`silk-wrap`): a cocoon of silk wound tight, strands still pulling round it. (The tankbuster.)
6. **Silk Lines** (`silk-lines`): two rock knobs with one taut silk thread stretched between them, a zigzag where it's under strain.
7. **Spin** (`spin`): a square of silk strung corner to corner between four rock posts, a bright knot at one corner.
8. **Brood** (`brood`): a cluster of pale eggs stuck in web, one cracking open in green.
9. **The Swarm** (`the-swarm`): three small spiderlings scuttling at the viewer, one of them swollen and red.

**Sheet 2**
10. **Egg Sacs** (`egg-sacs`): one big silk egg sac hanging on threads, pulsing, with green veins showing.
11. **Fang Rush** (`fang-rush`): two curved fangs charging forward, long speed lines behind them and a straight line on the floor ahead. (The charge.)
12. **Silk Reel** (`silk-reel`): a thread shot out with a hook on its end, curling back as it reels in.
13. **Strand Reel** (`strand-reel`): a spiderling being dragged along a thread towards a rock pillar.
14. **Spinneret Volley** (`spinneret-volley`): three silk balls dropping on threads from above, a ring on the floor under each.
15. **Acid Deluge** (`acid-deluge`): slanted green rain pouring down, with one rock pillar's dry shadow cut clean out of it. (The shadow is the answer, so show it.)
16. **Ceiling Ambush** (`ceiling-ambush`): a spider dropping head-first down a single thread, a green splash ring waiting under her.
17. **Into the Dark** (`into-the-dark`): a black circle with only her eyes showing in it, small and green.
18. **From the Dark** (`from-the-dark`): a dark spider shape plunging down a thread out of blackness, a burst ring where she'll land.

**Sheet 3**
19. **Molt** (`molt`): a pale, hollow, cracked spider shell split down the back, empty.
20. **Tightening Web** (`tightening-web`): an orb web seen from the front, its outer ring drawn tight and glowing green at the edge.
21. **The Web Gives Way** (`the-web-gives-way`): the same web with its outer ring torn, a pink crack running round it and pieces falling away.
22. **Devour** (`devour`): her enrage. A gaping mouth seen from the front, two huge pink fangs, green venom dripping off them.

---

## Volkar, the Storm Titan (20 icons, 3 sheets)

Background: storm-cloud slate blue. Objects: slate stone, cloud grey. Accent: electric cyan and white, with gold for the + charge and deep blue for the − charge.

**Sheet 1**
1. **Thunderclap** (`thunderclap`): two huge stone palms clapping together, a cyan shock ring bursting out between them.
2. **Distant Thunder** (`distant-thunder`): a far-off storm cloud low on the horizon, one thin bolt dropping out of it.
3. **Titan Fist** (`titan-fist`): a giant stone fist with cyan cracks, smashing down, crackles at its knuckles. (The tankbuster.)
4. **Thunder Crash** (`thunder-crash`): a cloud with a forked bolt splitting into two prongs, each hitting a spot on the ground.
5. **Static Field** (`static-field`): a violet ring of crackling static, a small bolt trapped in the middle.
6. **Polarity Surge** (`polarity-surge`): two orbs side by side, one gold marked with a plus, one deep blue marked with a minus, a spark leaping between them.
7. **Lightning Rods** (`lightning-rods`): an iron lightning rod standing up, a bolt striking its tip, a ring at its foot.
8. **Still Air** (`still-air`): two banners hanging dead straight, one gold with a plus, one blue with a minus, no wind in them.
9. **Rod Strike** (`rod-strike`): a standing stone struck from above by a thick bolt, chips flying off its top.

**Sheet 2**
10. **Gale Slam** (`gale-slam`): three curved wind arcs sweeping across the frame, the front one cyan.
11. **Storm Walls** (`storm-walls`): a wall of dark cloud with lightning curtains hanging down it, cutting the circle in two.
12. **Squall Line** (`squall-line`): a dark storm ring closing in, a small calm circle left in the middle.
13. **Eye of the Storm** (`eye-of-the-storm`): a spiral of cloud seen from above, a clear bright eye at its centre.
14. **Eye Closes** (`eye-closes`): the same spiral with its eye pinched shut, a bolt stabbing out of the middle.
15. **Avalanche** (`avalanche`): boulders tumbling down a slope from the upper left, speed lines behind them.
16. **Chain Lightning** (`chain-lightning`): a bolt zigzagging between four small dots, jumping from one to the next.
17. **Ball Lightning** (`ball-lightning`): a floating ball of cyan lightning with a white core, short crackles sticking out of it.
18. **Skyfall** (`skyfall`): a great column of white light dropping out of the sky onto a ring on the ground.

**Sheet 3**
19. **Heavens Fall** (`heavens-fall`): the whole sky splitting with many columns coming down at once, one gold ring on the ground marking the only safe spot.
20. **Skybreak** (`skybreak`): his enrage. The sky cracking open like glass, a white seam across a black cloud and bolts pouring out of it.

---

## The Hollow King (22 icons, 3 sheets)

Background: dark barrow green-black. Objects: dark iron, bone, tarnished gold. Accent: grave-light green, with Doom violet and cold moonlight blue. (In the fight his swings are colour-coded, and the icons follow the same code: Sceptre Sweep gold, Barrow Stomp teal, Crown of Graves violet.)

**Sheet 1**
1. **Sceptre Sweep** (`sceptre-sweep`): a gold sceptre swinging in a wide arc, a gold wedge of sweep trailing behind it.
2. **Barrow Stomp** (`barrow-stomp`): an iron boot slamming down, teal cracks spreading out in a ring around it.
3. **Crown of Graves** (`crown-of-graves`): a crown floating above a ring of grave hands reaching up out of the ground in violet.
4. **Barrow Knell** (`barrow-knell`): one big iron funeral bell swinging, two wide rings of sound under it.
5. **Barrow Bells** (`barrow-bells`): two smaller bells side by side, each over its own spot on the floor.
6. **Royal Gaze** (`royal-gaze`): one cold green eye staring straight out, its pupil a slit.
7. **Royal Audience** (`royal-audience`): a large crown sitting on a throne cushion, three small lights lined up in front of it.
8. **Grave Cleave** (`grave-cleave`): a greatsword cutting down, a violet rune wedge burning on the floor in front of it. (The tankbuster.)
9. **Royal Doom** (`royal-doom`): a pale skull inside a violet ring, like a seal stamped onto someone.

**Sheet 2**
10. **Grave Marks** (`grave-marks`): a green ring on the floor with four short marks pointing in, like a target scratched into stone.
11. **Gravebind** (`gravebind`): two iron shackles joined by a short red chain.
12. **Funeral March** (`funeral-march`): three spears tilted forward in a row, marching, a long arrow of motion under them.
13. **Lights Out** (`lights-out`): an iron brazier with its flame just snuffed, three puffs of dark smoke rising.
14. **Coffin Lids** (`coffin-lids`): a stone coffin lid flying sideways, tipped on its edge, speed lines behind it.
15. **Royal Decree** (`royal-decree`): an unrolled scroll with a wax seal, a wave of green rolling out along the ground below it.
16. **Court of Bones** (`court-of-bones`): an upright coffin with a skull peering out of its open lid.
17. **Echo Knights** (`echo-knights`): a ghostly knight's helm in moonlight blue, see-through, with its visor slit.
18. **The King Rises** (`the-king-rises`): a crown lifting up off a dark stone slab, green light spilling out from under it.

**Sheet 3**
19. **The Charge Sheet** (`the-charge-sheet`): a long parchment list with marks down its left side, one line ticked in green.
20. **Judgement** (`judgement`): a set of iron scales, one pan pulled down hard by a green weight.
21. **The Long Night** (`the-long-night`): a single lantern with a small warm flame, in the middle of a field of black.
22. **Moonset** (`moonset`): his enrage. A pale crescent moon sinking below a black horizon, a thin green line along the edge.

---

## New casts (damage and heal checks): 5 icons, one partial sheet

Use each boss's own background and palette from above; one 3 × 3 sheet is fine (the rest of the grid left empty).

1. **Chrysalis** (`skitterra/chrysalis`): a tall silk cocoon hanging at the centre of a web, wound tight, a faint glow of her shape inside, a few strands still pulling round it. (Her damage check: it should look like it's about to close.)
2. **Gathering Storm** (`volkar/gathering-storm`): a low storm cloud with three short bolts already crackling out of its underside at once, small cyan sparks round them.
3. **Thunderhead** (`volkar/thunderhead`): one huge anvil-shaped storm cloud, dark, with a single thick white bolt splitting it down the middle.
4. **Royal Tithe** (`hollowking/royal-tithe`): a tarnished gold offering bowl under a floating crown, a stream of green life-light pouring up out of the bowl into the crown.
5. **Dirge** (`hollowking/dirge`): an old iron funeral bell, still, with wide slow rings of sound spreading out beneath it in green.

---

## New Hard moves (the dance sets): 6 icons, one partial sheet

Each boss's own background and palette from above.

1. **Snare Weave** (`skitterra/snare-weave`): a web seen from above made of many small overlapping silk rings, packed edge to edge, with three round holes left clear in it (the holes a plain dark blue). A small pale egg clutch hangs from one strand at the side. (The shape to read: a field of rings with gaps.)
2. **Burial Rites** (`hollowking/burial-rites`): four small open graves in a square around a crown, each grave's rim a different flat colour (green, violet, pink, white), a headstone at the head of each.
3. **Writ of Execution** (`hollowking/writ-of-execution`): an unrolled parchment writ with a heavy wax seal, three iron chains running from it out to the edges of the square, and a fourth chain hanging broken. (Lines going out from one point, one of them harmless.)
4. **Dinner Rush** (`grubnak/dinner-rush`): a cleaver stuck upright in a board in the middle, four white plates set down round it at different distances, each with a gold rim: the nearest plate's rim complete, the next two-thirds round, the farthest two only a third. Steam off the nearest. (The shape to read: plates laid out round him, filling in order.)
5. **Grounding Rods** (`volkar/grounding-rods`): an iron lightning rod hanging point-down, crown of spikes at the top, sparks crawling down its length and a small burst of blue-white at the point where it's about to bite into the rock.
6. **Supercell** (`volkar/supercell`): three dark bands of driving rain marching across the square with lightning in them, and one iron rod standing in their path with a clean strip of calm, plain blue air running out behind it. (Walls of storm, and the lane a rod leaves.)

---

## Still unpainted (15 icons, two sheets)

These 15 still show the drawn placeholder in the cast frame (October 2026). Some were briefed above; this list replaces those briefs, so paint from here. Use each boss's own background and palette from its section above, and the shared style. Sheet 1 is the first nine, read left to right, top to bottom; sheet 2 the last six (the rest of the grid left empty).

**Sheet 1**
1. **Mince** (`grubnak/mince`): a thick wooden chopping board seen from the side, a heap of minced red meat on it, and one cleaver coming down into the heap at an angle with an orange glint on its edge, two short speed lines behind it. (Chop Chop's half-room cut: one blade, one board.)
2. **Double Chop** (`grubnak/double-chop`): a long board split down the middle by a pale crack, its left half lit cooking-fire orange and the right half dark, and two cleavers coming down crossed in an X, one over each half. (The shape to read: both halves at once.)
3. **Butcher's Charge** (`grubnak/butchers-charge`): a straight dusty track running across the square, a pair of short curved bull horns lowered at its near end, skid marks and puffs of dust behind them, and an oak cask at the far end splitting apart with staves flying. (A line: the charge runs wall to wall.)
4. **Dinner Rush** (`grubnak/dinner-rush`): a cleaver stuck upright in a board in the middle, four white plates set down round it at different distances, each with a blue rim: the nearest plate's rim complete, the next two-thirds round, the farthest two only a third. Steam off the nearest. (Plates laid out round him, filling in order.)
5. **Last Call** (`grubnak/last-call`): a brass service bell on a wooden base in front of a cream clock face whose hands both point straight up to the hour, a small curled flame catching at the bell's side.
6. **Chrysalis** (`skitterra/chrysalis`): a tall silk cocoon hanging on one thread at the centre of a web, wound tight in bands, a pink seam of her glow showing through it, two strands pulling taut from its sides. (Her damage check: it should look about to close.)
7. **Snare Weave** (`skitterra/snare-weave`): a web seen from above made of many small overlapping silk rings packed edge to edge, three round holes left clear in it (the holes plain dark blue), a small pale egg clutch hanging from one strand at the side. (A field of rings with gaps.)
8. **Gathering Storm** (`volkar/gathering-storm`): a low, heavy storm cloud with three short bolts already crackling out of its underside at once, small cyan sparks where each meets the ground.
9. **Thunderhead** (`volkar/thunderhead`): one huge anvil-shaped storm cloud, flat-topped and dark, a single thick white bolt splitting it down the middle to a bright splash on the ground.

**Sheet 2**
10. **Grounding Rods** (`volkar/grounding-rods`): an iron lightning rod hanging point-down, a crown of three spikes at its top, sparks crawling down its length and a small blue-white burst on the rock where its point is about to bite.
11. **Supercell** (`volkar/supercell`): three dark vertical bands of driving rain marching across the square with lightning in them, one iron rod standing in their path with a clean strip of calm, plain dark-blue air running out behind it. (Walls of storm, and the lane a rod leaves.)
12. **Burial Rites** (`hollowking/burial-rites`): four small open graves in a cross around a tarnished gold crown, each grave's rim a different flat colour (green, violet, pink, white), a grey headstone at the head of each.
13. **Writ of Execution** (`hollowking/writ-of-execution`): an unrolled parchment writ with a heavy red wax seal, three iron chains running from it out to the edges of the square, and a fourth chain hanging broken. (Lines going out from one point, one of them harmless.)
14. **Royal Tithe** (`hollowking/royal-tithe`): a tarnished gold offering bowl on a short foot, a floating gold crown above it, and a stream of green life-light pouring up out of the bowl into the crown, a few pale motes in it.
15. **Dirge** (`hollowking/dirge`): an old iron funeral bell hanging still from a short beam, wide slow rings of sound spreading out beneath it in grave-light green, fading as they widen.
