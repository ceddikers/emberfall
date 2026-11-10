# The boss revamp (2026-11-10)

The user asked for a revamp so that the bosses "fit FF14 styles", each one unique and "its own thing". Their answers:

- **Scope:** the twelve set bosses. The Cinder Sovereign and the two fights found in town are not touched.
- **Depth:** sharpen each identity. Keep each fight's look, story and spine; replace or re-tie moves other bosses share; add what is missing.
- **FF14 feel, all four:** classic vocabulary, puzzle debuffs, phase spectacle, tighter fixed dances.
- **New:** "an Extreme difficulty made for each fight that adds 3 new mechanics to the dance."
- **Approval:** trusted, no spoilers. Reports to the user name bosses and test results, never mechanics.

## What the audit found (all twelve)

Each boss already owns one good idea. The sameness is around it:

1. **The same filler kit on every boss:** a hidden raidwide with a name, a cone tankbuster, a light line on the tank to fill gaps, a plain spread, a plain
   stack, and an "out then in" circle and donut. None of it touches the boss's idea.
2. **Act changes pass unmarked** on most bosses: a gate tick and the next set begins.
3. **Roles are flat:** the two DPS never get different jobs, the healer rarely gets a job that is not topping people up, the tank's own job is usually
   "aim the cone".
4. **Hard reshuffles the order of each act's sets every pull**, so a Hard fight is read, never learned.
5. Classic FF14 vocabulary that no boss used at all: a shared (party) tankbuster, a line-share with the tank in front, a tether the tank must take,
   attract and repel, keep-moving and stand-still, a counter stance (stop attacking), role-marked towers, a heal-to-full cleanse, fixating adds,
   meteors the party places, knockback into a safe spot.

## Shared rules for every boss in this revamp

- **Keep the spine.** The fight's acts, gates, walls, enrage name, room, art and the signature mechanics in the audit's section 4 stay. Do not rename a
  move players already know unless this doc says so.
- **Tie the filler.** Each boss section below lists which generic moves are re-tied to the boss's idea and how. A re-tied move keeps its name, its slot
  in the timeline, its cast time and its damage unless stated, so tuning moves as little as possible.
- **Dances.** (The user, 2026-11-10: "extreme can have those tighter fixed dances, whereas hard can have seeds where there's a chance to get dance 1,
  dance 2, or dance 3".) Normal runs its one written order, as now. **Extreme runs one fixed order** on every pull. **Hard draws one of three fixed
  dances per pull** (`f.dance`, 0 to 2, drawn once at the pull for the whole fight; Extreme and Normal are always 0). Where a script draws Hard's set
  order per pull (`mix()`, `bestOrder`, shuffled mid sets, a drawn unleashing order and the like), it now draws from `f.danceRng(salt)`, a generator
  seeded by the boss and the dance number, under the same legality rules as before, so each dance is the same on every pull that draws it. The three
  dances of an act must differ in the first set that is not common to all three, so that set tells the party which dance this pull is. What stays
  random on every difficulty: who is targeted, which side a two-sided move takes, and anything that is itself the content of a read (a memory order,
  which knight answers, where heads stand). Those are always shown before they matter.
- **Mark every act change.** Where the audit's section 7 says "nothing marked", the act now opens with a short named transition: a cast bar of 3 to 4 s
  with its own name, a `roomev` the client can draw, and one clear beat (a raidwide, a room change or a pose). It must not add more than about 5 s to the
  fight and must not cut a running cast.
- **Telegraphs are never hidden.** Red is damage, blue is stack or soak, safe spots are never painted. Every new move has a floor tell from the cast until
  the hit, never under 1.2 s. No text tells players what to do: marks over heads, cast names and floor shapes only.
- **Pairs are a seasoning.** Do not stack new moves on old ones to add density. A new move takes the slot of a generic one, or of a repeat. Time on the
  boss must not go down.
- **Tank and healer** keep a beat at least as often as before (idle gaps under about 10 s where the script already manages it).
- **Extreme** is `f.extreme` (and `f.hard` is also true: Extreme has every Hard move). It adds exactly the three mechanics listed for the boss, woven
  into the timeline in the slots named, not appended at the end. Extreme has its own `hp.extreme`, `enrage.extreme` and `extremeDmg` in the def (start
  from Hard's values; tuning comes later). Each Extreme mechanic appears at least twice in a pull and at least once together with one of the boss's
  signature mechanics, so it is part of the dance and not a side show. Each has its own name on the cast bar.
- **Bots** must be able to do every new thing. Bots read floor telegraphs on their own; anything that is not a floor shape (a mark, a debuff rule, a
  counter stance, an order) needs a read in the boss file's bot hooks, in the way that file already does its special reads.
- **Journals, sounds, tells, the boss card and DESIGN.md** are a later lane. The script lane only lists, in its report, every new or changed
  player-facing move name with one line on what a player must do.

## Set 1

### Grubnak (`grubnak`)

Idea kept: where do I stand, the order rail, a kitchen that remembers its grease.

Normal and Hard:
- **Grease Fire** (the default raidwide): every grease stain on the floor flares when it lands, a small red ring round each stain painted from the cast.
  Where the party left grease now shapes every one of them.
- **Long Skewer** (new, line-share with the tank in front): from Mains on, one Skewer per act is a blue line-share through the tank. The party lines up
  behind the tank, who takes the larger part; alone, the tank takes all of it. It takes the slot of an existing Skewer.
- **Heavy platter:** in each Order Up! from the Second Sitting on, one plate is a platter that needs two heroes on it.
- **Transitions:** Mains opens with "Dinner Bell" (he rings it, the stove line lights, a light raidwide); Dessert opens with "Dessert Is Served" (a named
  cast, the room dims to the fires).
- Remove the dead code the audit lists if it is truly unreferenced.

Extreme:
1. **Table Numbers.** Each hero gets a numbered ticket over their head (1 to 4). Plates come up numbered; each plate must be collected by the hero with
   its number, in order. A wrong hand spoils the plate (the unserved-plate raidwide). Used on Order Up! rails.
2. **Kitchen Staff.** Two sous-chef adds run in from the larder carrying extra orders to the counter. The tank picks them up; each one that reaches the
   counter adds a plate to the next rail. They take the slot of a Larder Toss set, once in Mains and once in the Second Sitting.
3. **Flashover.** One hero is marked with a wide blast on a timer. It lights every grease stain it touches, so it has to be carried to a clean part of
   the room, away from the party. Paired once with Meat Toss into Family Meal.

### Queen Skitterra (`skitterra`)

Idea kept: what do I break (clutches, knots, pillars), the Dark Between, the Collapse.

Normal and Hard:
- **Fang Strike** (the tank's filler lane): each strike leaves a silk strand along its line that stays until someone cuts it (a knot at its far end,
  one hit). Walking through a strand slows. Where the tank sidesteps decides where strands lie.
- **Venom** (the healer's job): heroes hit by Venom Spit carry Venom, a damage-over-time mark that ends only when the hero is healed to full.
- **Cocoon Drop** (the plain stack): the cocoon stays where it lands as a breakable cover prop (two hits), so the party chooses where its next shelter
  from Acid Deluge stands.
- Act changes are already marked.

Extreme:
1. **Cat's Cradle.** All four heroes are joined in two pairs by strands that cross the room. Strands that cross each other burn both pairs every second;
   the pairs trade places to uncross them before the web tightens (a raidwide scaled by how long they stayed crossed). Once in Act I, once in Act II.
2. **Lure.** In the Dark Between, each of her drops must be led onto a ripening egg clutch: a drop that lands on a clutch crushes it; a drop that lands
   on bare floor hatches the nearest clutch at once.
3. **Imprint.** Hatchlings from the next brood each fixate on the hero nearest them as they hatch and follow only that hero. A fixated hatchling cannot be
   hurt until it has been led through an acid pool. Each hero kites their own.

### Volkar (`volkar`)

Idea kept: everyone carries a charge all fight; who do I pair with, where is cover; the Squall Line; the Eye.

Normal and Hard:
- **Magnetize** (new, attract and repel): he links the heroes in two pairs. A pair of opposite charges is pulled together a fixed distance; a pair of the
  same charge is thrown apart the same distance. The links and the distance are drawn on the floor from the cast. Stand so the throw or the pull ends
  on safe ground. It takes the slots of the lone Static Field and one plain Avalanche per act.
- **Static Lash** (the tank's filler line, a dozen uses): the Lash carries the tank's charge. Heroes of the opposite charge standing within a short
  reach of the line are stung as well, so half the party must give it a wider berth than the other half. Cut its uses by about a third; a Fist or
  Magnetize takes the freed slots.
- **Transition:** Normal's last act opens with a named cast ("The Sky Lowers") as the ring closes, in place of the silent edge step.

Extreme:
1. **Polarity Shift.** Some heroes carry a visible timer; when it ends their charge flips. Short and long timers are dealt so a pairing that is right
   for the first half of a move is wrong for the second. Used over Polarity Surge and Twin Fall.
2. **Conduction.** A bolt strikes one hero and jumps to the nearest hero of the opposite charge, four times, each jump painted before it leaps. A jump
   to a same-charge hero, or a jump that cannot find anyone, bursts on everyone. The last hero must be touching a standing stone, which grounds it.
3. **Split Current.** One cast, two shapes: heroes carrying gold must stand inside the ring, heroes carrying blue outside it. Paired once with the Squall
   Line.

### The Hollow King (`hollowking`)

The user's favourite fight. Normal and Hard keep every move as it is. The only change: where the script draws an act's set order per pull on Hard, it follows
the dance rule (three dances on Hard, one on Extreme). Knights choosing which swing to answer, and the Charge Sheet's order, are reads and stay random.

Extreme:
1. **Contempt of Court.** A knight that kneels as it stores a swing answers with the swing turned inside out (an inner circle answered by a ring, a
   left sweep by a right). The kneel is the tell, shown from the moment the swing is stored.
2. **The Sentence.** Before a call, the court marks the heroes: two are Shackled to each other (they must be within a short reach of one another) and
   two are Exiled (each must be far from every other hero). The marks are judged at the moment the knights answer, not on a clock of their own.
3. **Roll Call.** Heroes are numbered. The King calls the numbers in order; the hero called must face him, and everyone else must look away, for each
   call in turn.

## Set 2

### Vhalgrath (`wyrm`)

Idea kept: where will he land (three spots), the floor taken away, the Roost, the two walls.

Normal and Hard:
- **Cinder Feast** (the plain stack) becomes a party tankbuster: a blue ring on the tank that hits three times (four on Hard) a beat apart. Everyone
  stands in it; the healer heals between bites. Same slot, the damage split over the hits.
- **Twin Breath:** the two heroes it will aim at carry a mark over their heads from the cast, so the party points the two cones on purpose.
- **Transitions:** Act II opens with "Skyward" (he circles the crater once, a light raidwide as he climbs); Act IV opens with "The Tyrant Wakes" (a
  named roar that sets the rim glowing).

Extreme:
1. **Marked Prey.** In the Cinder Run, landings no longer take the three fixed spots: each one falls on a numbered hero in turn. Every landing leaves its
   molten pool, so the party chooses where four pools go.
2. **Ember Devils.** When the cast ends a small whirl of fire is left under each hero. Any hero who touches a whirl (their own after it sets, or
   another's) sets it off. Keep apart, then walk out clean. Paired with Dragonfall.
3. **Molten Trail.** One hero is hunted by five falling pools in a row, each landing where they stand. They lay the trail along the rim while the rest
   of the party does the Feast.

### Hrimgar (`titan`)

Idea kept: his strikes change the floor (sheets sink, ice is the party's resource), the Tips, the Lake.

Normal and Hard:
- **Whiteout** (a plain raidwide): Bitter Cold. From the cast, a hero who stands still for more than a second and a half as it lands is frozen in place
  for a few seconds. Keep moving.
- **Winter's Howl** (the other plain raidwide): Thin Ice. A hero who is moving as it lands cracks the sheet under them. Stand still.
- **Titan's Sweep** (a plain cone): it now shoves everyone it would have hit one sheet's width along the swing. Sunk water behind you is where you land.
  A brazier stops the shove.
- **Icefall** (no tie to the floor): each shard freezes the sheet it lands on, so the heroes it follows choose where two free sheets of ice go.
- **Transitions:** Act II opens with "The Ice Groans" and Act IV with "Deep Winter" (named casts, the plateau's aurora changes).

Extreme:
1. **Two Winters.** Bitter Cold and Thin Ice at once: two heroes are marked to keep moving, two to stand still, through an Avalanche.
2. **Ice Tomb.** Two heroes are sealed in ice where they stand (their sheet freezes). Nobody can break a tomb by hand: one of his own strikes (the
   Fault Line or the Icebreaker) has to be led through it.
3. **Sunk Towers.** Soak towers appear on sheets that have already sunk. A hero can only stand there if Winter's Grasp is spent on that sheet first.

### Azerath (`archmage`)

Idea kept: the Rune Pair (together or apart by element), the four sigils, the Binding, Convergence.

Normal and Hard:
- **Arcane Burst** and **Arcane Lance** take the element of the act they are cast in, each with a small rider: fire leaves a burn to heal through, frost
  a short slow, lightning arcs to anyone within a short reach of the struck hero, void tugs a step toward the middle.
- **Leaping Bolt:** the bolt prefers a rune bearer as its next jump, so where the bearers stand steers it.
- **Void Rifts** (circle spam with no tie): cut to one use per pull, in the void act.
- **Transitions:** each act opens with the floor turning to its element under a named cast ("Circle of Fire" and so on, 3 s).

Extreme:
1. **Spellweave.** He holds three spells as glyphs over his staff before casting any. A reversal glyph, when present, means they come in reverse order.
2. **Runic Clock.** Rune Marks carry timers of different lengths, so the pairs resolve at different moments: a "together" pair first and an "apart" pair
   after, or the other way round.
3. **Cascading Convergence.** The four sigils go off one after another in the order they light, not all at once. Move onto ground that has already gone
   off.

### The Hydra (`hydra`)

Idea kept: nine heads on a shuffled board, what you cut is remembered, the Submerge, the Heart.

Normal and Hard:
- **Taking the bite** (the tank's job): before a Rending Maul, a great head ties a strand of spit to a random non-tank hero. Whoever holds the strand
  when the cast ends takes the Maul. The tank takes the strand by walking through it.
- **Mother's Cry** as each new set of heads rises (Acts II and III), so the act change is a beat and not only heads appearing.
- Leave the eight head attacks as they are: the shuffled board is the read.

Extreme:
1. **Scalded.** A stump needs two sears, and searing leaves a mark for a while that stops the same hero searing again. The party rotates who steps in.
2. **Entwined Necks.** Two heads wind together before they strike, and each fires the other's attack from its own place.
3. **Breach.** She heaves out of the pool and the wave throws everyone outward. A hero thrown against a column is caught; a hero who reaches the wall is
   swept under for a heavy hit. A column whose head has been cut still bleeds, and gives no shelter.

## Set 3

### Corvane (`corvane`)

Idea kept: the Whetstone, the stance that names the unleashing, lanterns as cover, the two Vigils.

Normal and Hard:
- **Still Water** becomes a true counter stance. While the glass stands and his blade is sheathed, any hero who strikes him is answered at once with a
  cut. The stance and the cast bar are the tell; the floor shape stays. Stop attacking, or strike a wisp.
- **Transition:** Act II opens with "The Shrine" (he walks to the shrine, the lanterns flare, a light raidwide).

Extreme:
1. **The Circle.** He names one hero for a duel. A ring is drawn round the two of them: the named hero cannot leave it, nobody else can enter it, and his
   aimed moves all go to the duelist until it ends.
2. **Gale Through the Pass.** White Gale blows from one end of the pass and throws everyone down it. A lit stone lantern shelters whoever stands in its
   lee; a broken one does not.
3. **Three Lessons.** He points at each hero in turn with a stance, shown over their head. Blade low: be behind him. Blade high: be far from him.
   Sheathed: do not strike. All are judged when the unleashing lands.

### Brannoc (`brannoc`)

Idea kept: everything thrown bounces, the catch, the Tide and the titan.

Normal and Hard:
- **Roar of the Stands** (a plain raidwide): the ghost crowd throws. Each Roar knocks one banner loose along the rim, a line from the wall, so the
  raidwide has a place to stand.
- **Transition:** Act II opens with "Crowd-Pleaser" (he raises the Sunwheel to the stands, banners unfurl).

Extreme:
1. **Stand Your Ground.** One hero is marked as a post: the wheel bounces off them as it would off a stone, for a light hit. The whole path is redrawn
   as they move, until it locks, so the party bends the throw to where the catch can be made.
2. **Crowd's Choice.** Each catch ring carries a role sigil (tank, healer or damage). Only a hero of that role makes the catch.
3. **Carry-through.** A caught wheel throws its catcher back along the wheel's heading. Make the catch with safe ground behind you.

### Morrow-Oak (`morrowoak`)

Idea kept: what the Hunger eats stays gone, the party chooses where; pulls end at a hole's edge; the limbs.

Normal and Hard:
- **Sap Tide** (a plain raidwide with a plain ebb): the sap pools in the holes. After each Tide every hole overflows as a ring round its own edge, so the
  ebb is drawn by the holes the party made, in place of the circle and donut round him.
- **Transitions:** Act II opens with "The Hunger Stirs" and Act IV with "Starved" (named casts, the heartwood splits wider).

Extreme:
1. **Greenseed.** One hero carries a living seed while another carries a Hunger Seed. Where the living seed bursts, a hole closes for good. The party
   mends one place and opens another with the same breath.
2. **Take Root.** Root rings appear before a pull. On Extreme the pull no longer stops at a hole's edge; only a hero standing in a root ring is held.
   A rooted hero cannot step out of what follows, so the ring to take is the one the next cones miss.
3. **Grafting.** When a limb breaks, its move is grafted onto the limb beside it, which now does both. The order the limbs are broken in decides what
   the last limb can do.

### Caelum Vey (`caelum`)

Idea kept: every cut is foretold by a numbered afterimage, Grace Withdrawn, the meteor's shadow as the clock.

Normal and Hard:
- **Transitions:** Act II opens with "The Shadow Lengthens" and Act IV with "Sunless" (named casts as the shadow grows).
- No other change: his borrowed guests and his filler are already tied to the set.

Extreme:
1. **Carried Shadow.** One hero carries a small second shadow. Starfall's towers can fall inside it too, so that hero decides where they stand.
2. **Fallen Stars.** In the sky, where there is no cover, marked heroes each drop a star where they stand when their mark ends. Stars are the only cover
   from Constellation Fall. Two dropped too close together burst.
3. **The Star's Pull.** For one whole dance the meteor draws everyone steadily toward the middle of its shadow. The dance is the same; the floor under
   it is not still.

## Extreme, the tier

- Opens for a boss once that boss has fallen on Hard. Hard+ modifiers stay on Hard only.
- Tuning gear: set 1 `full`, set 2 `post3`, set 3 `post5`. Target with `HUMAN=dps`: about 10 to 20% a pull (a set's finale about 8 to 15%); perfect bots
  about 40 to 70%.
- Rewards are never gear: a feat per boss, a title per set, a mark on the trophy, three times Normal's gold.

## Build lanes

1. Engine: the tier (`f.extreme`, saves, menus, feats, tools).
2. Scripts, one agent per boss on its own boss file: Normal and Hard sharpening, then the three Extreme mechanics, with bot reads.
3. Journals (23 voices for each new or changed move), sounds (`tools/audio/coverage.js`), tells and VFX, the boss card in `data.js`, DESIGN.md.
4. Tuning: Normal and Hard held to their targets after the changes; Extreme tuned to its own.
5. Check lines for Extreme in `tools/check.js`, then the full check.
