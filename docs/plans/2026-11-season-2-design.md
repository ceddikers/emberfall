# Season 2, set 1: The Silver Road (full design)

*2026-11-11. Design only, nothing built. **This file spoils every fight.** The user asked for a spoiler-free plan and reads `2026-11-season-2.md` instead; never quote this file's mechanics in a report to them. Names are working titles. Everything here is this design's call and open to change; the only decisions the user has made are: four new bosses, the start of a "Season 2", unlocked by clearing the Ultimate, and that the mechanics stay a surprise.*

Rules this design is held to: `CLAUDE.md` (design rules), `docs/DESIGN.md` ("Every fight is one idea", the eleven questions, Hard and Extreme), and the saved taste notes: Final Fantasy villain cool (sword dances, a summon arriving, a countdown in the sky, second forms, arena changes), a mix of people and monsters or gods, villains who are cool and not talky, pairs of moves as highlights and not the default rhythm, chained telegraphs drawn one strike at a time, no clock-hand or spinning-floor mechanics, no new classes or build layers, the gear system as it is.

## The story

The court's crowns were made of moon-silver, dug from the caves under its kitchen. The silver was never the valley's. It is a road: the Moon's own road down to the world, laid before there were kings, and the kings dug it up for crowns, bells and the lid of a king's coffin. For an age the Ember under the square glowed just enough to hide the valley from her. The night after the Ember went out was the first truly dark night Emberfall has had, and the first night the Moon could see it.

So a line of moonlight lies on the pond now and does not move with the hours. Everything made of her silver is being called home along it, and her household is coming down it to fetch the rest. They are not cruel. The silver is theirs. But a great deal of the valley is made of it by now, and some of it is in people.

This pays off what set 1 planted: the moon-silver caves, the thread Skitterra stole from the moon, the moth she becomes, the moon sinking in the Hollow King's window, the Moon Koi.

**The set's thread (not a countdown; set 3 used the sky that way).** Each room is a stage further up the road, and Emberfall is in every one of them, smaller each time: a row of lit windows across the lake, a glow far below the hall's windows, a spark under the night sea, and in the finale the whole world hanging in a black sky over the party's heads. Home recedes. Nothing in the fights depends on it.

**Epilogue (one page, after the finale's first clear):** the line on the pond is gone, the silver stays where it was taken, and the Moon goes on looking. Tone as "The night after": plain, short, no speech.

## Shape of the set

| | Boss | Kind | Room | The question | The big moments |
|---|---|---|---|---|---|
| XIII | Garrow, the Moon's Hound | monster | the Long Mere, a frozen lake under fresh snow | Where have I walked? | the Whiteout chase; he is the first thing down the road |
| XIV | Vesper, the Mirror Knight | person | the Argent Hall and its reflection | Where is my reflection standing? | a sword dance fought in two rooms at once; the mirror turns; two heroes pulled through the glass |
| XV | Ormun, the Tide-Weigher | god | the Scales, two pans over a night sea | Which side is heavier? | the Tide arrives (a summon passing under the pans); the bridge breaks |
| XVI | Maelis Orne, the Pale Regent | person, then a second form | the face of the moon | How much of her is lit? | a sword dance in the dark; the Hound arrives and she rides him; the blood-moon countdown |

Difficulty climbs XIII to XVI; XVI is the hardest fight of the set. Every fight is 8 to 10 minutes, non-looping, on `f.course`, with HP gates. XIII and XIV use pushes (a quick party moves on early), XV and XVI use one wall each. Every boss has Normal (one written order), Hard (three dances) and Extreme (Hard plus exactly three mechanics, one fixed order).

---

## XIII. Garrow, the Moon's Hound (`garrow`)

*Room: the Long Mere, a frozen lake at night, rect 1120 x 800, snow over black ice, reeds at the edges, Emberfall's windows in a row on the far shore. Question: where have I walked?*

**Look.** A wolf the size of a house made of frost-mist over a silver skeleton that shows through at the ribs and jaw, two small moons for eyes, a broken silver chain trailing from a collar. He does not snarl. He lowers his head and looks at one of you.

**As built (2026-11-11; `docs/DESIGN.md` "Boss XIII" is the record, and where it differs from the text below, it wins).** Five things changed in the build. (1) *He hunts what runs:* a long trail ends in a small pounce and a hero who stood still is fallen on by a wide one, so the scented hero has a reason to write a line (without it, standing still was always right). (2) He does not walk to his tank along the tank's footprints: he stands, and comes back out of the mist to where he stood after each hunt, which keeps melee on him and the tank's job simple. (3) Health marks are 76 / 52 / 26; there is no 10% beat. (4) *The Second Hound* is a shade hunting a second hero at the same moment (the tank's trail is almost always empty, so a shade on it did nothing). (5) *Stillness* marks two heroes who are not the scented one, and their steps burst at the lock, so the scented hero writes a line round them. The finale's Hunt (XVI) inherits (1).

**The eleven answers.**
1. The Moon's hound has come down the road ahead of her household, and it hunts by track: the fresh snow keeps every step anyone takes.
2. Where have I walked?
3. **He goes where a trail goes.** Every hero's last steps lie on the snow as footprints, and anything he does that moves (a run, a pounce, the mist-hounds, his own walk to the tank) follows a trail, never a straight line of his own. A move the party has never seen is still read by asking whose trail it will take.
4. The warning is the footprints themselves, always on the floor, and a head mark (`prey`) on whoever he has scented. When he commits, the scented trail lights from its oldest step to its newest and the whole corridor is painted red before he moves.
5. Five acts: First Snow, The Pack, Whiteout (the seam), Hard Frost, Last Light.
6. It ends with the snow no longer fading: every step since the act began is still there, and his last runs take the whole of a hero's remembered path. The idea at its barest: you are standing in what you did.
7. Hard lets a run change trails where two cross, marks two heroes at once, and makes his own runs leave ice ridges.
8. Luck is who is scented (a random non-tank), shown by the mark before anything is drawn.
9. The tank draws the line the boss walks: Garrow reaches his tank by walking the tank's own footprints, so repositioning him is drawing a path, and his mouth points along it. The healer has the Howls, the frostbite that mist leaves on anyone a run clips, and a real check after the Whiteout.
10. Its own: the party's past positions are the fight's hazards. No other fight uses where a hero has been.
11. "I walked a figure of eight and he ran it."

**Trail rule (engine).** The sim keeps each living hero's positions for the last 8 s (Act V: since the act began, capped). Clients draw footprints from the positions they already have; a locked path is sent with its mechanic so every client paints the same corridor.

**Acts and gates** (all pushed; health marks 76 / 52 / 26 / 10):

| Act | Adds |
|---|---|
| I. First Snow (100 to 76) | **On the Scent** (signature): `prey` mark and a 5 s cast; the marked hero's trail of the last 6 s locks 1.5 s before the cast ends, lights, and he runs it end to end (corridor 120 wide), then **Pounce** (circle, r 150) where it ends. **Throat Snap** (tank buster, a cone along the tank's trail). **Howl** (raidwide). **Rime** (spread circles on two heroes that leave a patch of slick mist for 10 s). |
| II. The Pack (76 to 52) | **Mist-Hounds**: two, later three, lesser hounds each take one hero and walk that hero's trail at 85% of a hero's speed, biting if they catch up. Two mist-hounds that meet cancel each other, so two heroes cross paths to end theirs. On the Scent now happens with a follower behind you. **Circle the Prey**: he trots a ring round the party along his own track and the inside is safe; the track itself bursts (a ring telegraph drawn as his own prints). |
| III. Whiteout (seam at 52, about 30 s) | **Snowdrift** (cast): a flurry wipes every track. He goes into the white (untargetable for the set piece) and runs **The Long Chase**: three On the Scents in a row on three different heroes, each path painted one at a time, each hero starting from no trail at all, so each must run at once to write one. A raidwide Howl closes it. |
| IV. Hard Frost (52 to 26) | His runs now leave an **ice ridge** along the corridor for 18 s, a wall heroes and mist-hounds cannot cross. Where the party lets him run is where the walls stand, so trails are drawn to wall the mist-hounds off, or to keep a road open to the next Rime. **Snowdrift** returns as a single beat before a Scent. |
| V. Last Light (26 to 0) | Tracks stop fading. **The Whole Trail**: a Scent that runs everything the marked hero has walked this act. Mist-hounds in threes. Closing passes until **Cold Trail** (the enrage: he scents all four at once). |

**Hard, moves Normal never uses (five):** **Crossed Trails** (where the trail he is running crosses a fresher one he turns onto it; the corridor is still painted in full along the real route before he moves, so it is a read, not a guess); **Double Scent** (two heroes marked, run one after the other, and if the two corridors touch he does not stop between them); **Doubling Back** (he runs the trail and then runs it back); **Ridges from Act II**; **Buried Scent** (a Snowdrift lands mid-cast, so the trail he takes is only what was walked after it). Dances shuffle the middle sets of Acts I, II and IV; the first set that differs is the tell.

**Extreme (three):** **Blood on the Snow** (a hero hit by anything leaves red prints for 10 s, and at any crossing he prefers red to fresh: mistakes steer him); **The Second Hound** (a shade of him runs the tank's trail at the same moment as each On the Scent, so the tank's line is a hazard too); **Stillness** (two heroes carry the `still` mark through a Scent: a marked hero who moves leaves prints that count double length, so the scented one may have to stand and take a short run on purpose).

**Bots.** A "write a path" behaviour: when scented, walk a straight line away from the party's centre and off other trails; never stand on a lit corridor; cross a partner's trail to cancel mist-hounds.

**Engine.** Trail history per hero; a `path` corridor shape (reuse Brannoc's painted road if it fits); followers that walk a recorded path; ridge walls (reuse storm-wall blocking).

---

## XIV. Vesper, the Mirror Knight (`vesper`)

*Room: the Argent Hall, a long hall of polished moon-silver; rect 1120 x 520 for the hall, and above it on the screen, across the mirror wall, the same hall reflected, dimmer and silver-tinted (1120 x 520 again). The reflected hall's far windows show a glow a long way down. Question: where is my reflection standing?*

**Look.** A tall knight in mirror-bright plate with no face: a smooth visor that shows whoever is looking at it. A long two-handed blade, Evenfall, carried point-down. In the glass stands the Glass Knight, her reflection, who at first does exactly what she does.

**The eleven answers.**
1. The road passes through a gatehouse with one keeper, and she fights with her reflection. In this hall a reflection is a second body.
2. Where is my reflection standing?
3. **You stand in two places.** Every hero has a twin in the glass at the mirrored spot, and anything that hits the twin hits the hero. The hall and the glass each have their own dangers, so a spot is safe only if both of you are.
4. The warning is the twin, always visible, and the two rooms drawn side by side: a danger in the glass is painted in the glass. When the Glass Knight is about to act alone she steps half a pace out of line with Vesper first.
5. Five acts: The Hall, Out of Step, Through the Glass (the wall), The Mirror Turns, The Line.
6. It ends with the glass dark and the mirror planted in the middle of the hall itself, so each hero's twin is standing in the same room. Two bodies, one floor.
7. Hard overlays hall dangers on glass dangers, tethers heroes to their twins, and throws a second small mirror.
8. Luck is who is tethered and who is pulled through, shown first by head marks.
9. The tank places both knights at once (the Glass Knight is always opposite Vesper) and takes **Twin Verdict**, a buster struck in both rooms. The healer mends Fracture, the wound a struck twin leaves, and both halves of a split party.
10. Its own: every hero has two positions. Not a replay (the Hollow King's rule) and not a foretelling (Caelum's): a second body, now.
11. "I was fine. My reflection was standing in it."

**Reflection rule (engine).** Mirror line `y = 0` (later `x = 0`, later a free line). A mechanic carries `hits: 'body' | 'twin' | 'both'`; a hero is struck if their body is in a body shape or their mirrored point is in a twin shape. Twin shapes are drawn in the glass room. Symmetric moves (both knights swinging the same swing) are deliberately the easy case; the fight lives in the moves that differ.

**Acts and gates** (pushed at 74 and 20, a wall at 48, marks 74 / 48 / 20):

| Act | Adds |
|---|---|
| I. The Hall (100 to 74) | **Evenfall** (her wide cone and its mirror image, the easy case). **Lay Glass**: shards fall in the glass hall only (circles drawn there), so twins must stand clear. **Twin Verdict** (buster). **Ring True** (raidwide: both blades struck on the wall). |
| II. Out of Step (74 to 48) | The Glass Knight acts alone, at the same moment as Vesper and never the same swing: **Counterpoint** (Vesper cuts close, a circle in the hall; the Glass Knight cuts far, a ring in the glass), **Cross-Cut** (she cuts the left half of the hall, he the right half of the glass). **Silver Thread**: a `chain` mark on one hero; the line between that hero and their twin becomes a blade for 3 s, so nobody else and no other twin may share their column. |
| III. Through the Glass (wall at 48, about 35 s) | Two heroes (`flip` marks, never the tank) are pulled through: their bodies are in the glass hall and their twins in the real one. The knights kneel. Blue soaks appear in both rooms needing two each, which a hero and the twin of someone on the other side can share. Three rounds, then **The Mirror Turns**: the mirror leaves the north wall for the east wall, the glass hall redraws on the right, and everyone is back in the hall. |
| IV. The Mirror Turns (48 to 20) | Everything from I and II, sideways. **Evenfall Dance** (the sword dance): six cuts alternating between Vesper in the hall and the Glass Knight in the glass, the landing cut solid and the next as an outline, each cut aimed at where a hero or a twin stands when it is drawn. |
| V. The Line (20 to 0) | The glass goes dark. She plants Evenfall and the mirror is a line through the middle of the hall, set by where the tank stands when the cast ends (the line runs through her, square to the tank). Twins are in the room. The Glass Knight steps out and stands opposite her across the line, swinging for real. Dance, Counterpoint and Thread on one floor, then **Last Reflection** (the enrage). |

**Hard, moves Normal never uses (five):** **Lay Glass in both rooms** at once (two different patterns); **Two Threads**; **Hand Mirror** (the Glass Knight throws a standing mirror into the hall: anyone inside its span has a third body beyond it until it shatters); **Backhand** (a Cross-Cut that changes sides late, shown by the blade crossing her body, never under 1.5 s); **Through the Glass, twice** (the pairs trade mid-wall). Dances shuffle the middle sets of Acts I, II and IV.

**Extreme (three):** **Lagging Glass** (heroes with the `still` mark have twins that stand where the hero was a second and a half ago); **Wrong Hand** (heroes with the `flip` mark are mirrored through the hall's centre point, not across the line, so their twin is diagonally opposite); **Trading Places** (Vesper and the Glass Knight swap rooms mid-dance, and hall cuts and glass cuts trade with them).

**Bots.** Score a spot by both points. In the wall, pair a body with a cross-room twin for each soak.

**Engine.** Mirrored hit test and `hits`; a second, mirrored room view (the hall rendered flipped and tinted, with the twins); swap-through teleport; a free mirror line for Act V; the Hand Mirror as a prop with a span.

---

## XV. Ormun, the Tide-Weigher (`ormun`)

*Room: the Scales, two round silver pans (radius 300 each) hanging side by side over a night sea, joined by a short bridge; huge chains run up into the dark; a spark of light under the water where the valley is. Ormun stands at the fulcrum behind the bridge, in reach from the inner edge of both pans and from the bridge. Question: which side is heavier?*

**Look.** A colossus of pale drowned stone, robed, faceless, with water running from his sleeves without end. One hand holds the beam. He never leaves the fulcrum (a giant in the middle, like Volkar), and he never hurries.

**The eleven answers.**
1. The road crosses a pair of scales, and their keeper weighs whatever comes over. What is too heavy, or too light, he takes.
2. Which side is heavier?
3. **Everything weighs.** A hero is 1. A silver weight is the number on it. A drowned thing is 1 while it lives. A fallen hero still weighs 1 where they lie. The bridge weighs for neither pan. Every judgement names its rule on the cast bar and is settled by what is on each pan when the bar ends, so a judgement nobody has seen is solved by counting.
4. The warning is the beam: it tilts as the weights change, all the time, and the low pan sits visibly lower with the sea lapping onto its rim. Before a judgement the pan it will fall on glows from underneath.
5. Five acts: First Weighing, The Heavier, Spring Tide (the wall), Burdens, The Last Weighing.
6. It ends with the bridge broken, the party stranded as it stood, and only the weights he drops left to move the count. The idea at its barest: you can no longer move yourselves, only what you choose to carry.
7. Hard pairs judgements, cracks weights, and counts three heroes' burdens.
8. Luck is who is marked for a Counterweight and who is burdened, shown first.
9. The tank is the heaviest piece on the board: **Heavy Hand** (the buster) leaves the tank Burdened (weight 2, later 3) for 20 s, so the tank's side is a decision. The healer has **The Tide Comes In**, a raidwide that hits harder the further from level the pans are, which the party can soften by levelling first.
10. Its own: a fight settled by counting the party. Nothing else in the game asks how many of you are somewhere.
11. "Nobody move. I'm carrying the three."

**Weights (engine).** Each pan has three cradles near its inner edge (so solving never pulls melee off the boss). A weight sits only in a cradle. Walking onto a weight lifts it (a `num` head mark shows it; the carrier is 15% slower); walking onto an empty cradle sets it down. A carried weight counts where the carrier stands. The bridge and anything on it count for neither pan.

**Judgements** (each a named cast of 6 to 7 s, the pans' count read when it ends): **Let It Be Level** (unequal: the heavier pan is struck); **The Heavier Falls** (the heavier pan is struck; level strikes both lightly); **The Lighter Rises** (the lighter pan is struck). The clean answer to the last two is to make the pan with no heroes on it the one that is struck, which only the silver weights allow.

**Acts and gates** (marks 76 / 50 / 22; a wall at 50):

| Act | Adds |
|---|---|
| I. First Weighing (100 to 76) | **Let It Be Level** with heroes alone, then with one weight of 1 in play (five can't be level, so something stands on the bridge). **Heavy Hand** (buster and Burden). **The Tide Comes In** (raidwide). **Counterweight**: a weight falls on a marked hero (a spread circle); it comes to rest in the nearest empty cradle, so where that hero stands decides which pan gains it. |
| II. The Heavier (76 to 50) | **The Heavier Falls** and **The Lighter Rises**. Weights of 2 and 3 arrive by Counterweight. **Undertow**: the low pan's rim floods inward for a few seconds (a ring telegraph on the low pan only), wider the lower it sits. |
| III. Spring Tide (wall at 50, about 35 s) | **The Tide arrives**: a wave-serpent the length of the room passes under the pans (the summon; it is never fought), lifting one pan and then the other, which adds 3 to the opposite side while it is under each. **Drowned Things** climb onto the pans (each weighs 1 while alive). Three quick Levels, each solved by killing the right ones and standing right. The bell on the chain tolls the count. |
| IV. Burdens (50 to 22) | **Burden** and **Buoy**: head marks make one hero weigh 2 and one weigh 0 for 20 s. Judgements come in pairs a few seconds apart (Level, then The Lighter Rises), so the first answer should already be most of the second. |
| V. The Last Weighing (22 to 0) | **The Bridge Breaks**: no crossing, no neutral ground. **Tip the Scale**: everyone on the heavier pan is thrown to the other (the only way across, and it is his). Counterweights and Burdens decide the last judgements. Then **The Scale Falls** (the enrage). |

**Hard, moves Normal never uses (five):** **Hollow Weight** (a weight with a visible crack counts half at the judgement); **Scatter the Silver** (he strikes a cradle and its weight breaks into ones that roll to the nearest empty cradles on either pan); **Double Judgement from Act II**; **Three Burdens** (2, 2 and 0); **Undertow on both pans** when they are level. Dances shuffle the middle sets of Acts I, II and IV.

**Extreme (three):** **Buoyed** (a marked hero weighs minus 1 and lifts their pan); **Exact Measure** (a judgement that names a number: the lit end of the beam must be heavier by exactly that much); **The Tide Weighs Too** (the water on the low pan adds 1 for every three seconds it has stood there, so an imbalance left alone grows).

**Pacing guard.** This is the thinking fight of the set. To keep time on the boss: he is in reach from both pans, cradles sit by the inner edges, a judgement's cast is long, and no more than one judgement falls in any 20 s on Normal. Measure time-on-boss against Hrimgar's before tuning anything else.

**Bots.** A small solver: given the rule, the weights and who is where, pick the split that needs the least walking; carry when a weight must cross.

**Engine.** A two-pan floor (`f.floor`, as Morrow-Oak's holes) with a bridge that can be removed; weight props with a number, cradles, a carry state; the beam and pan heights drawn from the live count; a pan-wide strike shape.

---

## XVI. Maelis Orne, the Pale Regent (`maelis`)

*The finale, the hardest fight of the set. Room: the face of the moon, a round floor of radius 560 of pale dust that keeps footprints, craters faint in it; the sky is black and the world hangs in it overhead, with one small cluster of lit windows on its night side. After the junction the same floor under a reddening sky. Question: how much of her is lit?*

**Look.** Very tall and still, silver-white hair to the ground, a robe lit on one side and black on the other. A crescent blade as long as she is. Behind her head floats a thin crown that is a small moon, and its phase changes: that crown is the fight's tell. Second form, **the Wild Hunt**: she rides Garrow, come back up the road as her mount, in a wolf-skull helm with his chain in her off hand.

**The eleven answers.**
1. The Moon's regent has kept her house since the silver was taken, and the party has walked up her road to her door. She does not ask them to leave. She shows them the moon.
2. How much of her is lit?
3. **The floor is the moon.** The crown's phase is the shape of her next cut: the lit part of the crown is the part of the round room that is struck, turned the way the crown is turned. A crescent strikes a crescent of floor, a half strikes half, a gibbous leaves only a sliver. Phases come in the moon's own order, so a dance of four cuts can be read from its first.
4. The warning is the crown, for the whole cast, then the same shape painted red on the floor. Waxing or waning is shown by which horn of the crown is bright.
5. Five acts: Moonrise, The Waxing, New Moon (the wall), The Wild Hunt, The Long Eclipse.
6. It ends under a blood moon, where the rule turns over: the dark of the crown is what strikes. The danger is still painted red on the floor, as always, but the party has to read lit against dark for real, and the eclipse closing over the crown is the clock.
7. Hard shows two crowns, rocks the moon late, and cuts a ring.
8. Luck is which way the crown is turned and who carries a moonlet, both shown first.
9. The tank takes **Earthshine** (a cut and its pale second hit a beat later) and, in the Hunt, decides the line she rides by where the tank walked. The healer has **Full Moon** (the whole floor lit: a raidwide that ends every waxing dance), the moonlets' bursts, and the heal check when the dark lifts.
10. Its own: one shape language, the phases, that covers the whole room and can be read ahead. And the set's first rule coming back as her mount.
11. "Waxing from the left. Go right, keep going right."

**Phase shapes (engine).** Room disc of radius R, lit side at angle θ. Crescent: the disc outside a circle of radius R centred `0.55 R` toward the dark side. Half: a half-disc. Gibbous: the disc inside a circle of radius R centred `0.55 R` toward the lit side (the complement of a crescent on the far side). Full: the disc. A new `lune` shape kind covers the first three.

**Acts and gates** (marks 78 / 56 / 34 / 14; a wall at 56):

| Act | Adds |
|---|---|
| I. Moonrise (100 to 78) | Single cuts named for their phase: **Crescent**, **Half Moon**, **Gibbous**, each with a random turn. **Full Moon** (raidwide). **Earthshine** (buster). **Moonwell** (blue soaks: shafts of light that need two heroes each). |
| II. The Waxing (78 to 56) | **Waxing Dance** and **Waning Dance**: four cuts in phase order on one side, the landing cut solid and the next an outline, ending (waxing) or beginning (waning) on Full Moon. **Moonlets**: small moons fall on two heroes (spread) and stay where they land; a moonlet bursts when a cut's light touches it, so they are set down where the coming dance stays dark longest and apart from each other. |
| III. New Moon (wall at 56, about 35 s) | The crown goes dark and so does the room (the floor dims; every telegraph stays as bright as ever). **Moonless Steps**, the sword dance: six dashes, each foretold by a thin silver line from her to a hero, one at a time, each ending in a small crescent cut. Between dashes a pool of the last light (a blue soak) shrinks and moves; the party stands in it. Full Moon ends the dark. |
| IV. The Wild Hunt (56 to 14; the second form at 56) | **The Hound's Return** (the summon arriving): Garrow's howl, and he comes up the road and across the floor along the freshest trail in the dust, which is whoever walked last. She mounts. **Hunt's Pass**: she rides a marked hero's trail (XIII's rule) and cuts a phase as she passes its midpoint: two readings at once, as a highlight, twice in the act. **Earthshine** from the saddle follows the tank's trail. Moonlets and dances return. |
| V. The Long Eclipse (14 to 0) | The crown turns red from one edge. **Umbral** cuts (Umbral Crescent, Umbral Half): the dark of the crown strikes. Lit and umbral cuts alternate inside one last dance. The red covers the crown over about 70 s; at totality, **Totality** (the enrage). |

**Hard, moves Normal never uses (five):** **Two Crowns** (her reflection in the dust shows a second phase with its own turn; both cuts land together and the safe ground is what neither lights); **Annular** (a ring of light: a donut cut that leaves the middle and the rim); **Libration** (the crown rocks a quarter-turn once after a cut is shown and locks at least 1.5 s before it lands); **Moonless Steps of eight**, with a Moonlet falling mid-dance; **Harvest** (a moonlet that is lit twice bursts wider). Dances shuffle the middle sets of Acts I, II and IV.

**Extreme (three):** **Moon-Touched** (two heroes carry an `eye` mark with a burning ring: while it lasts, light does not harm them and darkness does, so the party stands either side of the terminator); **Blood Moon Rising** (umbral cuts appear from Act II on, one inside each dance, shown by a red limb on the crown); **The Second Howl** (Garrow's shade runs the freshest trail again during the Long Eclipse, in the middle of the last dance).

**Bots.** Read the phase and turn from the mechanic; stand on the dark limb at the edge where the whole dance needs the least walking; set moonlets down on the dark side, apart.

**Engine.** The `lune` shape; the crown as a boss part with a phase and turn that clients draw; dust footprints (XIII's trail history, reused); the mounted form (Garrow's art, reused); a per-hero inversion flag for Moon-Touched; the eclipse meter on the crown, not the floor (Caelum's finale already covers a floor with a shadow).

---

## What the set needs outside the fights

- **Unlock.** Open once the account has cleared `sovereign` (in a friend's game, once the host has). Bosses open in order. Hard opens for the set once all four have fallen on Normal, then boss by boss. Extreme opens for a boss once it falls on Hard. Hard+ applies (extend `HARDPLUS.eligible` past set 3).
- **The way in.** The line of moonlight on the pond, beside Bram: walking onto it opens the Raid Board on the new set. It appears the first time the town is visited after the Ultimate's epilogue has been shown. One line each from Bram and Hask the first time. (A town surprise: never described to the user.)
- **Raid Board.** A "Season 2" heading over the new set; sets 1 to 3 and the Ultimate sit under "Season 1". Boss cards, blurbs and lore in `data.js` and `story-data.js`; the boss numbers run on, XIII to XVI.
- **Internal set number.** The Ultimate is `set: 4` in `data.js` and the secret raid's two fights are `set: 5`, so this set is `set: 6`. Everything that reads `bossSet` (unlock text, portals, music, trophies) needs the new case.
- **Gear.** Tiers 13 to 16, the same four rarities, one more step in the existing pattern (`SET4_STEP`, eight more item levels), sized during tuning so best-in-slot stays inside `GEAR_CAPS`; if the caps bind, the step shrinks and the new effects carry the reward. General gear with two Mythics a boss and four party bonuses, as set 2 and 3. No new slots, stats or systems. Item icons follow the standing rule: prompts in `docs/art/item-icons.md`, drawn placeholders until painted, no id in `client/items/manifest.json` before its PNG exists.
- **Tuning gear.** Normal `post5`; Hard a new `post6` (`post5` plus this set's Normal gear); Extreme a new `post7` (plus its Hard gear). Targets as the game stands today, with `HUMAN=dps`: Normal about 85 to 100% a pull, Hard about half (the finale the lowest of the set), Extreme about 10 to 25%.
- **Rewards beyond gear.** Feats for each clear on each difficulty, a set title for Normal, Hard and Extreme, four trophy pedestals, clear gold continuing the scale (140, 155, 170, 190).
- **The town.** Each boss's first defeat adds something (`TOWN_UNLOCKS`). Proposed, for the build only: XIII a silver-grey stray that follows Pip; XIV a looking-glass in the Tankard that shows the room a moment late; XV a tide-post by the pond that Bram reads; XVI the Moon Koi rising to the surface on clear nights. Two new secrets, a fish, three bounties.
- **Journals.** One file a boss, all 23 heroes, per `docs/plans/journal-voices.md`; Extreme pages flagged.
- **Art, sound, music.** Boss art drawn in code in the set 3 style (`caelum-art.js` as the bar), one art file a boss. Prompts for the user to paint: four boss icons, four VFX reference sheets, item icons. Sound recipes for every cast and moment; four boss tracks and a set theme as prompts in `docs/art/music-prompts.md`. Palette for the whole set: silver, black water, frost blue, and one warm colour only, the town's windows.
- **Docs.** The four bosses' answers go into `docs/DESIGN.md` when each is built, as the rule asks.

## Shared engine pieces (build once, before the bosses that need them)

1. Hero trail history and the `path` corridor (XIII, XVI).
2. Mirrored hit tests, the second room view, twins (XIV).
3. A floor made of regions with a count per region, and carried props (XV).
4. The `lune` shape and a boss-part crown with state (XVI).
5. Set 6 plumbing: `data.js`, unlock and road, the Raid Board heading, Practice Hall, `bot-raid.js` and `check.js` lists, `post6` and `post7` gear, Hard+ eligibility.

## Build order

The user's working loop: propose, they pick, build, check, show proof, they play, then it ships. Agents are Sonnet at high effort, one small task each, separate files.

1. **Agree the spoiler-free plan** (names, looks, setting). Cheap to change now.
2. **Set plumbing** (piece 5) and the trail engine (piece 1).
3. **Pilot: Garrow, end to end.** Script (Normal and Hard, then Extreme), bots, look, sound, journal, tuning, full check. The user plays him before the other three are built; what they say changes the rest.
4. **Vesper and Ormun in parallel lanes** (their engine pieces first, then script, bots, look, sound, journal each).
5. **Maelis Orne**, last, because she reuses Garrow's trail and art.
6. **Set pass:** tuning across the four so the finale is the hardest, gear, feats, town, story and epilogue, the way in, music prompts.
7. **Full check, the user's playtest, ship on their word.**

Each boss is about seven agent tasks (engine piece, script stage 1, script stage 2, bots, look, sound, journal) plus tuning by the lead.

## Risks, and what to watch

- **The setting may not land.** The last time a set was drafted without a pitch (the Hour City) the user rejected all of it. The spoiler-free plan is the checkpoint; nothing is built before they have seen it.
- **Ormun could play slow.** The pacing guard above is a requirement, not a hope. If the pilot numbers show under 70% time on the boss for melee, cut a judgement before adding anything.
- **Vesper's two rooms halve the hall on screen.** Check hero size and telegraph legibility at the real zoom on the first day of the look lane.
- **Trails and many players' prints are visual noise.** Draw one hero's prints faintly and only the scented or locked trail brightly (the chained-telegraph rule).
- **The finale leans on the pilot.** If Garrow's trail rule changes after the user plays him, the Hunt changes with it.
