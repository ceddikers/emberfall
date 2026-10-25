# Set 3: The Fallen Star

*2026-10-25. A fresh start that replaces the Hour City draft (moved to `docs/plans/history/2026-10-set-3-bosses.md`). The user picked Setting A. These are designed fights, not built yet. Each one carries the feel of a classic Final Fantasy villain without copying its look, its names or its moves.*

Rules that hold for every fight: telegraphs are always shown and safe spots are never painted (red is damage, blue is a stack or soak); fights run 8–10 minutes with one named enrage and about a minute of slack (about 45 s on Hard); tank and healer are never idle for more than about 10 s; targets are random or aimed by where players stand; no teaching text; Hard adds layers and 3–6 new moves and shuffles its dances every pull; the finale is the hardest fight in the game. Times and HP gates below are starting points for tuning.

## The story

The words chipped off the back of the portal ring weren't a place name. They were a warning. Long before the kings, a star fell beyond the wild realm, and they built the gate so the road would lead *away* from its crater. This autumn the star woke up, and the bells are ringing because it's calling. Everyone who reached it before you became one of its keepers.

**The set's thread:** a meteor hangs in the sky above every set 3 room. It's a faint spark at the first boss and a burning mass at the last, and in the finale it falls.

| | Boss | In the spirit of | The fight's idea | Big moment |
|---|---|---|---|---|
| IX | Corvane, the Unburied Blade | a stoic dead swordsman | your mistakes sharpen his blade | the Hundredfold Parting sword dance |
| X | Brannoc the Undefeated | a brash champion who becomes a summon | everything he throws bounces | he becomes the Tidewrought |
| XI | Morrow-Oak, the Starved Grove | a warlock tree and an all-eating hunger | what the hunger eats stays gone | the Grove Remade, made from bosses you've already killed |
| XII | Caelum Vey, the Starborn | a calm, untouchable swordsman | he appears before he cuts | the Starwyrm summon and the sky form |

---

## IX · Corvane, the Unburied Blade

*Look:* a tall dead guard in black lacquered armour cracked with frost, a stiff tattered cloak, and a broad single-edged blade he carries point-down like a walking staff. He never speaks. He sets his feet and waits.
*Room:* a snowy mountain pass at night with a ruined shrine and a row of stone lanterns.

1. *Premise:* the last guard of the crater road. Nobody ever relieved him, so he duels everyone who comes, and every blow he lands sharpens his blade until he unleashes it.
2. *Question:* "What is his stance telling us?"
3. *Rule:* every avoidable hit he lands puts a notch on the **Whetstone gauge** (four notches, a line of light along his blade). When it's full he performs one of three **unleashings**, and his **stance** shows which: blade low and back for *Rising Crane*, blade raised overhead for *Comet Draw*, blade sheathed in the snow for *Hundredfold Parting*. Every act also ends with one scripted unleashing (the gauge fills itself), so clean parties see them on schedule and sloppy parties see extra ones.
4. *Warning:* his stance, the glowing blade, then afterimages and the floor.
5. *Acts:* **The Pass**, **The Shrine**, **The Vigil** (wall), **The Whetted Edge**.
6. *Ending:* one Hundredfold Parting per player in turn, then *Last Light of the Pass*.
7. *Hard:* stances that shift mid-wind-up, a gauge that overflows, unleashings that chain.
8. *Luck:* Comet Draw targets the farthest player (so the party controls it); the dance order is random but numbered.
9. *Tank and healer:* the tank takes *Sundering Cut* followed by *Cracked Guard* (the next hit lands harder, so cooldowns get timed) and keeps him facing away from the lanterns. The healer carries *Hollow Breath* (a cold spread circle that follows them) and catches the raidwide after every unleashing.
10. *His own thing:* the party's mistakes set the pace.
11. *What players say afterwards:* "We fed him three in act two."

**Moves (Normal)**
- *Draw Cut*: a long line through his target's position, half a second after the draw.
- *Scabbard Sweep*: a half-room cleave on the side the scabbard points to.
- *Sundering Cut* + *Cracked Guard*: the tank pair.
- *White Gale*: a raidwide gust of snow.
- *Still Water* (from act II): a parry stance with a frozen sheen on his front. Hits into his front fill the gauge, so everyone moves behind him.
- *Rising Crane*: a wide fan, then a second fan rotated 45°.
- *Comet Draw*: a dash through the farthest player to the wall. Lanterns block it, but **each lantern cracks apart after sheltering someone once**, so cover runs out.
- *Hundredfold Parting*: he blinks to each player in a random order, leaving numbered silver afterimages, then one slash joins them in order. Players step off the lines between afterimages.

| Act | HP | Time | What happens |
|---|---|---|---|
| I · The Pass | 100–72% | 0:00–2:30 | Draw Cut, Scabbard Sweep, the tank pair, White Gale, then a scripted Rising Crane. |
| II · The Shrine | 72–42% | 2:30–5:15 | Still Water, two Comet Draws through the lanterns, Hollow Breath, then a scripted Comet Draw. |
| Seam · The Vigil | 42%, **wall** | ~5:15, 20 s | He kneels in the snow. Cold wisps drift toward him from the broken lanterns, and each one that reaches him adds a notch. Kill them to open the wall. Notches carry over. |
| III · The Whetted Edge | 42–0% | 5:35–9:00 | All three unleashings, with Hundredfold Parting scripted between them. The closing set runs one Parting per player. |
| Enrage | | 10:00 | **Last Light of the Pass** |

**Hard** (enrage 9:45): *Overwhet* (a fifth notch fires two unleashings back to back); *False Stance* (he changes stance halfway through a wind-up, and the floor updates at least 1.2 s before the hit); *Returning Parting* (the dance runs again in reverse); *Comet Volley* (three Comet Draws at the three farthest players in a row). Shuffles each pull: the act III stance order, which lanterns stand, and Hollow Breath's timing.

---

## X · Brannoc the Undefeated

*Look:* a huge, laughing pit-fighter with bare arms covered in old victory brands and a gilded half-helm. On his back he carries the **Sunwheel**, a round bronze war-shield with a blazing rim that he throws like a discus. His beast form, the **Tidewrought**, is a colossal sea-titan with a shell of barnacled plate and one great fist made of the Sunwheel, grown huge.
*Room:* a drowned colosseum with half-flooded sand, ghostly stands and banners on the walls. After the change: a broken ring of stone in an open sea under the meteor.

1. *Premise:* the champion of an arena that sank long ago still fights for a crowd of ghosts. Halfway through the bout the star claims him, and he rises from the sea as its titan.
2. *Question:* "Where will it bounce?"
3. *Rule:* **everything he throws bounces off walls**, and the whole path is painted before it moves. Read the bank shot. In the titan form his waves bounce off the rim of the ring too.
4. *Warning:* he points his chin at the wall he'll use, then the path draws itself bounce by bounce.
5. *Acts:* **First Blood**, **Crowd-Pleaser**, **The Tide Rises** (push), **The Tidewrought**, **Last Round**.
6. *Ending:* a Sunwheel that bounces six times while the fist grabs someone, then *The Final Bell*.
7. *Hard:* two wheels with crossing paths, two grabs, waves that bounce twice.
8. *Luck:* *Victory Leap* lands on a random player (a ring under them); the grab picks a random non-tank (a shadow of the hand covers them first).
9. *Tank and healer:* in the first form the tank takes *Hammer Heel* (two hits) and keeps him facing the stands. In the titan form the tank holds the fist, whose slams follow the tank. The healer has *Roar of the Stands*, plus a grabbed player who bleeds until freed.
10. *His own thing:* the boss **becomes** the summon, with a new bar, a new arena and new music halfway through.
11. *What players say afterwards:* "Who caught the wheel?"

**Moves: Brannoc**
- *Sunwheel*: the shield is thrown, bounces off 3 walls along a painted path, and returns to his hand. One blue **catch point** sits on the path. A player standing there catches it (a heavy hit to them), and it drops. If nobody catches it, it bursts where it ends.
- *Victory Leap*: a jump onto a random player (red ring), then a short, arrogant pose that opens a burst window.
- *Hammer Heel*: the tankbuster pair.
- *Roar of the Stands*: raidwide.
- *Sand Furrow*: he drags his heel through the sand in a slow line across the arena.
- *Banner Fall*: wheel bounces knock banners loose (red rectangles where they'll land).

**Moves: the Tidewrought**
- *Undertow Grip*: the giant hand grabs a random non-tank. The hand is an add to break within 8 s, or the titan slams that player.
- *Breaker*: a fist slam sends a wave out that bounces once off the rim (both paths painted). Debris blocks it.
- *Sunwheel Unbound*: a giant wheel that bounces 4–6 times, with two catch points.
- *Deep Call*: a raidwide with a short shove toward the rim (never off it).

| Act | HP | Time | What happens |
|---|---|---|---|
| I · First Blood | 100–75% | 0:00–2:20 | Sunwheel (one catch), Victory Leap, Hammer Heel, Roar. |
| II · Crowd-Pleaser | 75–52% | 2:20–4:30 | Sand Furrow crosses a Sunwheel, banners fall, two Sunwheels in a row. |
| Seam · The Tide Rises | 52%, **push** | ~4:30, 15 s | The colosseum floods and breaks apart. He rises in a column of water, and the party lands on the stone ring. The titan's bar fills (a new bar look, same total). |
| III · The Tidewrought | 52–20% | 4:45–8:00 | Undertow Grip, Breaker, Sunwheel Unbound, Deep Call. The tank holds the fist. |
| IV · Last Round | 20–0% | 8:00–9:15, **push** | Everything, faster. The closing pass is a six-bounce wheel during a Grip. |
| Enrage | | 10:15 | **The Final Bell** |

**Hard** (enrage 10:00): *Twin Wheels* (two crossing paths, two catch points); *Double Grip* (both hands, and the party splits to break them); *Riposte* (a caught wheel is kicked back once more along a new painted path); *Riptide* (Breaker's wave bounces twice and pulls on the way back). Shuffles each pull: the first-form wheel walls, the Grip targets, and the titan's move order.

---

## XI · Morrow-Oak, the Starved Grove

*Look:* an elder tree as tall as a tower whose heartwood has split open on a starless dark, **the Hunger**, the part of the fallen star that eats. Branches form his arms, and a crown of dead leaves floats around a hollow face. He moves like a slow, patient landslide.
*Room:* a dead grove on the crater's rim, roots running everywhere. After the change: floating chunks of that grove over the dark.

1. *Premise:* the oldest tree in the realm drank from the star and has been feeding his own grove to the Hunger to keep living. Then the Hunger swallows the grove, and he rises out of it wearing everything he ever fed it, including the monsters you killed on the King's Road.
2. *Question:* "What will the Hunger eat next, and where do we let it?"
3. *Rule:* **what the Hunger eats stays gone.** He plants *Hunger Seeds* on players, and where a player stands when their seed bursts becomes a permanent hole. The party decides where the room disappears: it's planned (holes at the edges) and punished when someone panics into the middle.
4. *Warning:* a dark seed pulsing over the player's head with a shrinking ring; the ground splits under them before it goes.
5. *Acts:* **The Grove**, **Hollowing**, **The Swallowing** (wall and arena change), **The Grove Remade** (second form), **Last Bloom**.
6. *Ending:* every limb that's left fires with a final *Fourfold Bloom*, inside a room the party shaped. Enrage: *Nothing Left*.
7. *Hard:* paired seeds, holes that pull, and limbs from set 2.
8. *Luck:* seed targets are random but shown 6 s ahead; the limb that glows goes next.
9. *Tank and healer:* the tank takes *Root Lash* (buster plus a short root) and must drag him away from holes before *Inhale*. The healer has *Sap Tide*, a raidwide that grows each time.
10. *His own thing:* the party permanently reshapes the room, and the second form is a tour of set 1.
11. *What players say afterwards:* "The lantern arm" and "who put a hole in the middle?"

**Moves (Normal)**
- *Hunger Seed*: on 1 player (on 2 from act II). It leaves a permanent hole where it bursts, which works as a wall.
- *Inhale*: a pull toward him. Anyone dragged into a hole falls (a scripted fall: big damage and a slow climb out, not death).
- *Fourfold Bloom*: four great petals open around him (thorn, frost, spark, blight, each a different object). They turn 45° once before they snap shut. Every petal is red.
- *Root Lash*, *Sap Tide*.
- *Saplings*: small trees that walk toward the nearest hole. If one reaches it, the hole grows.

**The Grove Remade.** After the Swallowing, the arena is floating pieces of the grove, and the holes the party made are still there. He rises with **four limbs grown from things he fed the Hunger**, each a breakable part with its own small bar that performs a remixed signature while it lives:
- *Cleaver Bough* (Grubnak): a soak marker, then a chopping line.
- *Brood Roots* (Skitterra): root strands that hold anyone standing in them, painted first.
- *Storm Knot* (Volkar): three lightning rods. Keep clear of the rod nearest you.
- *Barrow Lantern* (the Hollow King): a light mark passed between players on a beat.
Breaking a limb removes its move. The DPS choose the order.

| Act | HP | Time | What happens |
|---|---|---|---|
| I · The Grove | 100–75% | 0:00–2:20 | Seed (1), Inhale, Fourfold Bloom, Root Lash, Sap Tide. |
| II · Hollowing | 75–48% | 2:20–4:50 | Seeds on 2, Saplings, Inhale near holes. |
| Seam · The Swallowing | 48%, **wall** | ~4:50, 20 s | The grove tears loose and falls. The party rides the pieces down (no damage) onto the floating platform, holes kept. He unfolds, and the wall drops when he's finished. |
| III · The Grove Remade | 48–15% | 5:10–8:20 | The limbs take turns. Break them in any order. Sap Tide keeps growing. |
| IV · Last Bloom | 15–0% | 8:20–9:20, **push** | The surviving limbs and a final Fourfold Bloom. |
| Enrage | | 10:20 | **Nothing Left** |

**Hard** (enrage 10:05): *Twin Seed* (two seeds that must burst apart from each other, or they make one giant hole); *Hungering Dark* (holes pull gently on anyone near them); *Deeper Roots* (set 2 limbs: a wyrm wing, a frost fist, an archmage rune and a hydra head join the pool, and each pull draws 4 of the 8); *Last Gasp* (a broken limb's move fires once more from where it fell). Shuffles each pull: the limbs drawn, the seed targets, and the petals' turn direction.

---

## XII · Caelum Vey, the Starborn (finale)

*Look:* a tall, still figure in armour of black glass veined with white light, his face hidden behind a smooth silver mask. Behind his back a **halo of broken star-shards** turns slowly. His blade is a narrow sliver of starlight that grows longer as the fight goes on. He walks rather than runs and turns his head only to choose a target. He says one line, as the fight begins.
*Room:* the crater floor around the half-buried star. Later, a field of cloud above the falling meteor.

1. *Premise:* the star's chosen is calling down the meteor that has hung over every room of the set. You fight him beneath its growing shadow.
2. *Question:* "Where will he be next?"
3. *Rule:* **he appears before he cuts.** Every cut is foretold by a silver **afterimage** standing where he'll be, and its order, facing and blade show the cut. A move nobody has seen before can still be read, because the afterimages always come first.
4. *Warning:* afterimages, and glittering shards drifting down on the spots about to be hit. The meteor's shadow on the floor is the fight's clock, always in view.
5. *Acts:* **Descent**, **Starfall**, **The Starwyrm** (summon), **Ascendant** (second form), **The Sky Comes Down**.
6. *Ending:* the meteor's shadow covers nearly all the floor, and his final dance runs through the last clear ground. If you win, the meteor breaks into falling stars over the whole realm.
7. *Hard:* mirrored double dances, a second Starwyrm flight, and afterimages of the three earlier set 3 bosses joining his dance.
8. *Luck:* the afterimage order is random each time but always fully shown; Starfall lands on random players.
9. *Tank and healer:* the tank takes *Cinder Crown* (a buster that leaves a burning ring) and *Pinning Thrust* (a lunge that drives the tank to the wall, so aim it at open floor). The healer gets *Grace Withdrawn*: the whole party drops to 1 HP (never lethal) and *Nightfall* hits everyone 8 s later. It's the hardest heal check in the game.
10. *His own thing:* afterimage dances, and a countdown four bosses long.
11. *What players say afterwards:* "The Eightfold Wake."

**Moves (Normal)**
- *Glint*: a dash cut along a line, with the afterimage at its far end.
- *Eightfold Wake*: eight afterimages appear around the room, numbered by facing. He cuts from one to the next, each cut a red line drawn ahead. The whole dance is shown before the first cut.
- *Anchored Wake* (from act II): two of the afterimages form on random players' positions, so the players place part of the dance.
- *Starfall*: shards break off the meteor and fall as blue soaks on random players inside its shadow.
- *Cinder Crown*, *Pinning Thrust*, *Grace Withdrawn* → *Nightfall*.
- *The Shadow*: a dark disc on the floor that grows each act. Starfall lands only inside it, and in the last act it burns.

**The summon: the Starwyrm** (the 52% wall). He lifts his blade, and the constellations above the crater come loose and knot into a **serpent made of stars**. It coils once around the room (its body painted as a moving red band), then rears on the rim and breathes ***Constellation Fall*** across the floor. The **half-buried star** in the centre is cover. Two *Embers of Heaven* fall first and chip pieces off its edge, so the shelter changes shape. The serpent unravels back into the sky, and the wall drops.

**The second form: Ascendant.** The crater falls away, and the fight moves to a circle of cloud above the meteor. The halo opens into a **wheel of floating blades**, the fight gets a new bar look, and the music turns to choir. The dances get bigger: the Eightfold Wake gains a second ring, and *Horizon Cut* sweeps the full width of the room through a gap marked by falling shards that moves each time.

| Act | HP | Time | What happens |
|---|---|---|---|
| I · Descent | 100–76% | 0:00–2:15 | Glint, Eightfold Wake, Cinder Crown, Pinning Thrust, the first Grace Withdrawn. The shadow is small. |
| II · Starfall | 76–52% | 2:15–4:20 | Anchored Wake, Starfall soaks, the shadow grows. |
| Seam · The Starwyrm | 52%, **wall** | ~4:20, 25 s | The summon, Embers of Heaven, Constellation Fall behind the star. |
| III · Ascendant | 52–18% | 4:45–8:20, **push** | The arena change, the two-ring Wake, Horizon Cut, and a second Grace Withdrawn during a Starfall. |
| IV · The Sky Comes Down | 18–0% | 8:20–9:30, **push** | The shadow covers most of the floor and burns. The last dance runs through what's clear. |
| Enrage | | 10:30 | **The Sky Comes Down**: the meteor lands. |

**Hard** (enrage 10:15): *Mirrored Wake* (the dance runs twice, the second pass mirrored); *Second Coil* (the Starwyrm returns in act III and dives along a painted line); *Chorus of the Fallen* (afterimages of Corvane, Brannoc and Morrow-Oak join one dance per act, each doing one of their own moves); *Dark Ember* (a player carries a black ember, and setting it down at the shadow's edge when it fades pushes the shadow back a step); a second *Grace Withdrawn* during a dance. Shuffles each pull: the afterimage orders, Starfall targets, and the Starwyrm's side.

---

## What set 3 needs from the engine

1. The afterimage line dance (Corvane, Caelum).
2. Arena swaps during a fight that keep the floor state they need to (Brannoc, Morrow-Oak, Caelum).
3. A second-form bar look.
4. A summon unit that isn't the boss (the Starwyrm).
5. Bouncing projectiles with painted paths and catch points (Brannoc).
6. Permanent holes made at runtime and kept across an arena swap (Morrow-Oak).
7. The set-wide meteor in the sky of every set 3 room.
8. Big animation moments (a brief slow-motion or camera pull-back) for unleashings, the transformation and the summon.

**Build order:** the engine pieces first, then Corvane, Brannoc, Morrow-Oak, and Caelum last. Each boss also needs journals in all 23 voices, sounds, music prompts, icon prompts, loot and a town reward, the same as earlier sets.
