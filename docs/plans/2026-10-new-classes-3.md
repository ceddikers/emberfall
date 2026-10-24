# Four more classes: two healers, a beast-master, a parry tank

*2026-10-24. Design pass only; nothing is built. The user's picks: a new healer plus "cool dps or tank ideas that fit the theme... unique, a bit complex, and fun", with specs, talents and personal loot. Names are working names.*

Same frame as every class: **Q W E R D F**, the shared dash on **Space**, **T** is the Ultimate (own-kit charge, instant or a window). No mana, no interrupts, small numbers (a filler GCD hits for about 150–250, a spender 450–700, heals 120–400), the 70% newbie-to-pro target, telegraphs never hidden. Tanks carry the taunt on one of their buttons. Talents: 5 rows of 3 (I rotation, II survival/utility, III gauge, IV big cooldowns, V capstone); rows III and V each hold one `grants` talent; at most one plain-number talent per class. Each spec adds rows VI and VII (2 options each). Loot: one weapon line and one armour line in `CLASS_GEAR`, and legendary perks in `ITEM_PERKS` (keys `<class>_w1..w4`, `_a2`, `_a4` for set 1; tiers 5–8 for set 2).

| Class | Role | Hook | Gauge |
|---|---|---|---|
| Lanternkeeper | Healer | Light pools on the floor and on allies; place, relight, move them | Embers (wick charges) |
| Tidecaller | Healer | A tide that rises and ebbs on its own; sip low or surge high | Tide (a moving water line) |
| Houndmaster | Melee DPS | Two hounds stand around the boss; their positions spell the combo | Pack (Hounds' Bond) |
| Kenseier ("Ashen Guard") | Tank | Small-window deflects build the boss's Posture; Break opens a Deathblow | Posture (on the boss) + Poise (self) |

---

## 1. Lanternkeeper — *The Keeper of the Last Light* (Healer)

**Tagline:** "Every dark corner gets a light. Every light gets a keeper."

**Gameplan (data.js style):** Set lanterns where the party will stand, hang one on whoever is taking the hits, and keep them lit. Lanterns heal everyone in their glow, so the skill is placement: be where the fight is going, not where it was.

### Gauge: Embers
Three to five ember charges shown as little flames in the lantern on the hero's hip (and a row of flames on the gauge bar). Embers refill slowly (one per 6 s) and from **Trim the Wick** hits. Each lantern on the floor has a **wick** that burns down (a visible flame that shrinks from tall gold to a small red stub); a stub lantern heals at half strength.

### Kit
| Key | Name | Cast / CD | What it does |
|---|---|---|---|
| Q | **Trim the Wick** | GCD, instant | A small bolt of ember at the boss ({d:180}); refreshes the wick of the nearest lantern a little and gives an ember every third hit. The filler. |
| W | **Set Lantern** | GCD, 1 Ember | Place a lantern at your feet (max 3). Heals everyone in its glow (radius ~90) for {h:40} per second for 18 s. Placing a fourth snuffs the oldest. |
| E | **Hand Lantern** | GCD, 1 Ember, 8 s CD | Hang a lantern on an ally: it moves with them and heals them and anyone close for {h:60}/s for 10 s. The tank lantern. |
| R | **Flare** | oGCD, 20 s CD | Every lantern bursts at once: {h:180} to everyone in each glow, and the wick drops a stage. Stacked glows stack. The raidwide answer. |
| D | **Carry the Flame** | oGCD, 2 charges, 15 s | Pick up the nearest lantern and set it down where you stand (a short toss, ~200 range). Moving a lantern keeps its wick. |
| F | **Relight** | GCD, 2 Embers | Every lantern's wick back to full, and a single-target heal on the most hurt ally in a glow ({h:320}). The emergency. |
| T | **Ultimate — Lighthouse** *(window, 8 s)* | own charge | A tall beam rises from your lantern: the whole arena counts as inside a glow, every lantern heals double, and Flare is ready again. Charge fills from healing done by lanterns. |

**Glows:** W when you have no lantern near the party; E when the tank has no hand lantern; R when the boss starts a raidwide cast and two allies are in glows; F when two lanterns are at stub; T when charged.

**Signature mechanic and why it's fun:** healing as level design. You read the arena: where the next spread, soak or stack will be, and pre-light it. A good Lanternkeeper's lanterns are already waiting when the party arrives. Moving a lantern with D in a pinch is a satisfying save.

**Bots:** keep one hand lantern on the tank; place floor lanterns at the party centroid when fewer than two allies are in a glow; Carry the nearest lantern to the centroid when it drifts > 150 away; Flare on raidwide casts; Relight under 50% average party HP. Sloppy bots place at their own feet and never Carry.

**Newbie vs expert:** a newbie drops lanterns at their feet and spams Flare: about 70%. An expert pre-places for the next mechanic, keeps wicks gold with Trim, and spends Flare only on overlapping glows.

### Specs
| | **Beacon** (*the Fixed Star*) | **Wayfarer** (*the Road Lamp*) |
|---|---|---|
| Identity | A few bright fixed lights, big heals. | Lanterns trail behind you as you move; healing on the go. |
| Changes | Max 2 floor lanterns, each with a doubled radius and +50% heal. **Set Lantern → Great Beacon** (a tall post that cannot be Carried but never burns below half wick). | **Set Lantern → Lamplighter's Stride**: for 10 s, every 60 units you move drops a small lantern (6 s life, small glow). Max 6 small lights. Carry the Flame becomes a dash that drags all your lights along. |
| Passive | **Steady Glow:** allies standing still in a glow for 3 s take 5% less damage. | **Road Worn:** you heal 10% more while moving; standing still for 3 s dims your newest lights. |

### Talents
| Row | A | B | C |
|---|---|---|---|
| I rotation | **Spark Chain** (Q): Trim the Wick leaps to a second lantern and relights it too. | **Moth Light** (Q): Trim hits mark the boss; marked boss hits on an ally in a glow heal that ally for {h:30}. | **Ember Ward** (W): a lantern you place on a telegraph's edge pulses a small shield the moment the telegraph lands. |
| II survival/utility | **Lantern Ward** (E): a hand lantern also takes 10% of the bearer's damage. | **Long Toss** (D): Carry the Flame throws twice as far. | **Night Walk** (D): Carrying a lantern gives you a short speed burst. |
| III gauge | **Hoarded Embers** (gauge): max Embers 5 instead of 4 *(the plain-number talent)*. | **Ember Fall** (gauge): a lantern snuffed at stub gives an Ember back. | **Will-o'-Wisp** *(grants, replaces F)*: a wandering wisp that floats to the most hurt ally and heals {h:90}/s for 6 s. |
| IV big cooldowns | **Twin Flare** (R): Flare fires twice, the second a beat later at half strength. | **Flare Shield** (R): Flare also leaves a {h:120} shield on anyone it hits at full HP. | **Shadow Catch** (R): Flare pulls every lantern 40 units toward the party centre first. |
| V capstone | **Eternal Lamp** (T): Lighthouse leaves one lantern that never burns down for the rest of the pull. | **Lantern Festival** *(grants, replaces W)*: release 5 floating lanterns that drift over the party for 12 s. | **Last Light** (F): Relight on an ally under 20% also prevents their next lethal hit (once per 90 s). |
| VI Beacon | **Lighthouse Keeper**: Great Beacons slowly turn toward the nearest hurt ally, tightening their glow. | **Signal Fire**: when two Beacons are lit, a line of light joins them and heals anyone on it. | | 
| VII Beacon | **Hearth**: an ally standing in a Beacon for 6 s gets a {h:150} heal over time. | **Pillar of Flame**: Great Beacon damages the boss when it stands in the glow ({d:40}/s). | |
| VI Wayfarer | **Pathfinder**: small lights dropped along a dash heal double. | **Breadcrumbs**: your last 3 lights glow brighter and last 4 s longer. | |
| VII Wayfarer | **Pilgrim's Pace**: moving for 5 s without stopping gives the next Flare +30%. | **Trailing Sparks**: lights you pass back through relight and hit the boss for {d:60}. | |

### Loot (CLASS_GEAR.lanternkeeper: wtype 'lantern')
- Weapons: *Tallow Lamp, Spider-Glass Lantern, Forge-Iron Lantern, Grave-Candle Lantern, Lantern of the Hollow King*. Armour: *Lamplighter's Coat, Silkwick Coat, Soot-Black Coat, Barrow-Warden Coat*.
- **lanternkeeper_w1** (Grubnak): "Set Lantern starts with a full extra second of glow, and its first pulse heals double."
- **lanternkeeper_a2** (Skitterra): "Carry the Flame relights the lantern you move by a stage."
- **lanternkeeper_w3** (Volkar): "Flare also hits the boss for {d:120} per lantern that burst."
- **lanternkeeper_w5** (Wyrm, set 2): "A hand lantern hangs on for 3 s more."

### Visuals and sound
A short figure in a long soot-grey coat and wide hat, an iron lantern on a pole, a smaller one on the hip. Palette: soot grey, brass, ember gold (#ffc46b), a soft amber glow. Floor lanterns are drawn as squat iron cages with a teardrop flame; the glow is a warm, faintly flickering disc (never painted as a safe spot: it is a heal zone, warm amber, not blue). Sounds: a soft brass clink on place, a whoosh-hush for Flare, a match-strike for Relight, a low choral hum under Lighthouse.

### Voice sheet
Calm, patient, a night-watch keeper; speaks in small, kind sentences and lighting metaphors; counts things ("three lights, three of you"). Sign-offs: "Keep your light.", "I'll leave one burning.", "Walk where it's warm."
- *Grubnak, soak marker:* "When the mark finds someone, I'll have a light there before the rest of you arrive. Just go to it."
- *Skitterra, webs:* "Webs don't burn the way you'd hope. Stand by the lamp and let me do the worrying."
- *Volkar, raidwide:* "Stand in the glow when his voice rises. I'll make the light flare. Keep your light."

### Icon prompts (for `docs/art/icon-prompts.md`)
Portrait: a hooded lamplighter, lantern raised, face half-lit amber against a dark blue night. Abilities: a trimmed wick with a spark (Q); an iron lantern set on stone (W); a lantern on a hook in a gauntleted hand (E); a lantern bursting into rays (R); a lantern mid-toss with a flame trail (D); a match lighting a wick (F); a lighthouse beam over a dark arena (T); Great Beacon (a tall iron post with a fire); Lamplighter's Stride (footprints of tiny lights).

---

## 2. Tidecaller — *The Voice of the Undertow* (Healer)

**Tagline:** "The sea doesn't hurry. Neither do I."

**Gameplan:** Your healing rises and falls like the sea. The tide climbs on its own; spend it as small sips while it's low, or wait for high water and let a surge wash over everyone. The skill is choosing when.

### Gauge: Tide
A water line that rises from Low to High over about 12 s, holds high for 2 s, then ebbs back over 6 s, and loops. Shown as a vertical vial on the gauge and as the water level painted around the hero's feet (a ring of rising waves). Spending resets the tide to whatever is left: a sip barely lowers it, a surge drains it to the floor. The cycle is readable and never random.

### Kit
| Key | Name | Cast / CD | What it does |
|---|---|---|---|
| Q | **Salt Spray** | GCD, instant | {d:170} at the boss; nudges the tide up a little. The filler. |
| W | **Sip** | GCD, instant | A small heal ({h:150}) on a target; costs a small slice of tide. Stronger at low tide (+30%), so low water is not wasted. |
| E | **Riptide Mark** | GCD, 12 s CD | Mark an ally: they heal {h:40}/s; when the tide crests, the mark pops for {h:200}. |
| R | **Surge** | GCD, 1.5 s cast | Spend all tide: a wave from you heals everyone it touches. Scales from {h:120} (low) to {h:480} (high water). |
| D | **Current** | oGCD, 20 s | Shift the tide: push it up a quarter, or (held) pull it down a quarter. The expert's timing tool. |
| F | **Breakwater** | oGCD, 60 s | A wall of water: party takes 15% less damage for 8 s; while it stands the tide does not ebb. |
| T | **Ultimate — Spring Flood** *(instant)* | own charge | The tide goes to High and stays there for 6 s; every Surge cast in that time costs nothing. Charge fills as you heal. |

**Glows:** R at high water when the boss is casting a raidwide; W at low tide when someone is under 70%; E with no mark out; D when the crest would land in the wrong place (a raidwide is about to land and the tide is ebbing).

**Signature mechanic:** a heal resource that has its own rhythm, which you line up with the boss's rhythm. Satisfying click when high water and a raidwide meet.

**Bots:** Surge when tide > 70% and a raidwide is casting, or when party average < 60%; Sip at low tide on anyone < 75%; Current up when a raidwide is casting and tide is ebbing; keep a Riptide Mark on the tank. Sloppy bots Surge whenever the tide is over half.

**Newbie vs expert:** a newbie Surges at random heights and Sips: about 70%. An expert bends the cycle with Current so the crest meets each raidwide and Riptide pops land on tankbusters.

### Specs
| | **Spring Tide** (*the Flood*) | **Undertow** (*the Deep Pull*) |
|---|---|---|
| Identity | Huge surges timed to raidwides. | Pulls damage off allies into a shield that slowly drains. |
| Changes | Tide holds high for 3 s instead of 2; Surge at high water also leaves a {h:100} shield. **Sip → Swell** (a cheap heal that raises tide instead of costing it, weaker). | **Surge → Undertow**: drag up to 30% of each ally's recent damage taken into your own Deep Shield, which heals that much back to them over 8 s and absorbs your own damage meanwhile. Riptide Mark pulls the next hit's damage 50% onto your Deep Shield. |
| Passive | **King Tide:** a Surge at full high water heals 10% more for every ally it reaches. | **Still Water:** your Deep Shield drains a third slower while you stand still. |

### Talents
| Row | A | B | C |
|---|---|---|---|
| I rotation | **Spindrift** (Q): Salt Spray at high water hits a second time. | **Foam** (W): Sip on someone already marked spreads a small heal to one more ally. | **Low Water** (W): at the bottom of the ebb your next Sip is instant and free. |
| II survival/utility | **Kelp Bind** (E): Riptide Mark also slows the marked ally's falls below 30% (5% damage cut). | **Tidewalk** (D): Current also dashes you a short way. | **Sea Legs** (F): Breakwater also lets you cast Surge while moving. |
| III gauge | **Deep Water** (gauge): the high-water hold lasts 1 s longer *(the plain-number talent)*. | **Moon Pull** (gauge): every raidwide you heal through pulls the tide a little higher. | **Maelstrom** *(grants, replaces E)*: a whirlpool on the floor: allies in it heal by how high the tide is. |
| IV big cooldowns | **Seawall** (F): Breakwater moves with you. | **Ebb Shield** (F): when Breakwater ends, the tide it held drains into a party shield. | **Twin Currents** (D): Current has 2 charges. |
| V capstone | **Leviathan** (T): Spring Flood's last surge summons a wave that hits the boss for {d:600}. | **Tidal Bore** *(grants, replaces R)*: a line wave you aim; heals allies on the line by tide, more at the far end. | **Neap and Spring** (gauge): the cycle alternates short and long; a long crest heals 20% more. |
| VI Spring Tide | **Rogue Wave**: a Surge right at the crest is instant. | **Overflow**: healing beyond full from Surge becomes a shield (up to {h:120}). | |
| VII Spring Tide | **Tide Table**: the gauge shows when the next crest arrives (a tick mark). | **Brine Lash**: Surge also hits the boss by tide height. | |
| VI Undertow | **Drowned Bell**: when the Deep Shield breaks, it heals the party for what remained. | **Grip of the Deep**: Riptide Mark pulls from two allies. | |
| VII Undertow | **Pressure**: while the Deep Shield is up, your Salt Spray hits harder. | **Slack Water**: Current can freeze the Deep Shield's drain for 4 s. | |

### Loot (wtype 'conch')
- Weapons: *Driftwood Conch, Silk-Strung Conch, Storm-Shell Conch, Barrow-Pearl Conch, Conch of the Drowned Choir*. Armour: *Tidewife's Wrap, Weaver's Kelp Wrap, Stormsalt Wrap, Gravewater Wrap*.
- **tidecaller_w1** (Grubnak): "Surge at high water also refills a sliver of tide."
- **tidecaller_a2** (Volkar): "Breakwater lasts 2 s longer."
- **tidecaller_w4** (Hollow King): "Riptide Mark pops twice per crest, the second at half."
- **tidecaller_w6** (Titan, set 2): "Spring Flood's charge fills a little from damage your party takes."

### Visuals and sound
A tall barefoot singer in sea-blue wraps, hair like wet rope, a great conch on a strap. Palette: deep teal, sea foam white, wet slate, a pearl highlight (#d7f2ee). The tide ring at their feet is a gentle animated wave ring. Surge is a ring of water rolling outward (teal-white, never blue-filled on the floor so it can't read as a soak). Sounds: conch horn swell for Surge (pitch rising with tide), droplet ticks for Sip, a low rumble for Breakwater, gulls far off under Spring Flood.

### Voice sheet
Slow, sing-song, salt-wise; talks of weather, depth and patience; never rushes a sentence. Sign-offs: "Mind the tide.", "The sea gives back.", "Wait for the water."
- *Grubnak, slam:* "He hits on his own time. I'll keep the water climbing so it's high when he does. Mind the tide."
- *Skitterra, adds:* "Small things, many of them. Sip, sip, sip. The sea is patient too."
- *Hollow King, raidwide:* "Let the cold come. When it does, the water will already be high. Wait for the water."

### Icon prompts
Portrait: a singer with a conch to their lips, spray around them, teal and pearl. Abilities: a spray of salt water at a claw (Q); a single droplet into a cupped hand (W); a whirl mark over a shoulder (E); a cresting wave (R); a tide arrow up/down over water (D); a stone wall of water (F); a flooded arena under a full moon (T); Undertow (a hand pulled down into dark water); Maelstrom (a whirlpool).

---

## 3. Houndmaster — *The Huntsman of the Old Road* (Melee DPS)

**Tagline:** "I whistle. They bite."

**Gameplan:** Your two hounds move on their own. Whistle commands to send them around the boss: flank, hold, pounce. Where they stand when you strike decides which finisher you get. Keep them in good places and your combo writes itself.

### Gauge: Pack
Two hound portraits on the gauge, each with a position pip (Left flank, Right flank, Front, Behind) and a small **Bond** bar (0–100) that fills as the hounds hit. In the arena each hound has a coloured collar (Rust and Ash); its current position is drawn as a faint arc under the boss, so you can read the "word" at a glance.

**The combo:** the two hounds' positions make a **pair**. Flank + flank (pincer) → **Rend**; front + behind (surround) → **Hamstring**; both behind (pack) → **Bring Down**; same side → nothing special. Your finisher (E) becomes whichever pair is held.

### Kit
| Key | Name | Cast / CD | What it does |
|---|---|---|---|
| Q | **Hunting Knife** | GCD, 3-step combo | {d:160}/{d:180}/{d:230}; the third hit lets both hounds bite (+Bond). |
| W | **Whistle: Flank** | oGCD, 2.5 s | Send the hound you point at (alternates Rust/Ash, or Shift for the other) to the side you're facing: left or right flank. |
| E | **Pack Finisher** | GCD, 40 Bond | Spends Bond; the move depends on the pair: **Rend** ({d:620}, bleed), **Hamstring** ({d:480} + boss takes 5% more damage for 10 s), **Bring Down** ({d:700}). Without a pair: **Snap** ({d:300}). |
| R | **Whistle: Hold / Pounce** | oGCD, 10 s | Tap: both hounds hold their spot (they won't drift when the boss turns or moves). Hold again: both pounce, a {d:250} hit each, and land behind. |
| D | **Call Off** | oGCD, 30 s | Both hounds sprint to you and stand guard: 20% less damage for you for 5 s. Saves them from a telegraph (hounds take boss damage like a pet: a downed hound respawns after 10 s). |
| F | **Mark the Quarry** | oGCD, 60 s | 12 s burst: hounds attack 50% faster and Bond fills double. |
| T | **Ultimate — Wild Hunt** *(window, 10 s)* | own charge | Spectral pack of four joins: every pair counts as all three at once, and E costs nothing. |

**Glows:** E when Bond ≥ 40 and a pair is formed (glows the pair's colour); W when a hound is in front (it's wasting time) or no pair is formed; R (pounce) when both hounds would land in the pack pair; D when a telegraph covers a hound.

**Signature mechanic:** you play two "pieces" on a board around the boss. Planning the next finisher a few seconds ahead, and moving your dogs out of telegraphs, is the fun; the dogs are characters.

**Bots:** cycle pairs Pincer → Surround → Pack; Whistle a hound when it is in front; Call Off when a hound stands in red; F on cooldown with the party's burst. Sloppy bots never move the hounds and press E whenever Bond is full (gets Snap or a lucky pair).

**Newbie vs expert:** hounds drift to the flanks by themselves, so a newbie gets Rend half the time: ~70%. An expert plans Pack before F and Surround before the party burst, and Holds hounds through boss turns.

### Specs
| | **Pack Leader** (*the Two-Dog Hunt*) | **Lone Wolf** (*the Rider*) |
|---|---|---|
| Identity | Both hounds, coordinated pounces. | One great hound you ride in for big bursts. |
| Changes | Pounce (R) gets a 2nd charge; a pounce that forms a pair grants 20 Bond. **Call Off → Relay**: swap the two hounds' places. | One hound, **Greyfang**, larger. Pairs are made by Greyfang's position + yours (you flank, it's behind: Pack, etc.). **Whistle: Flank → Mount**: ride Greyfang for 6 s; you move fast, your Q becomes a mounted charge ({d:260}) and dismounting is **Ride Down** ({d:550}). |
| Passive | **Harmony:** a finisher on a pair you didn't use last time does 10% more. | **One Heart:** Greyfang shares your buffs and its bites also give you Bond. |

### Talents
| Row | A | B | C |
|---|---|---|---|
| I rotation | **Heel Nip** (Q): the third knife hit also nudges the nearer hound one step toward a pair. | **Scent Line** (W): Whistle: Flank sends the hound through the boss, biting on the way ({d:120}). | **Echo Bark** (E): a finisher of the same pair twice in a row repeats at 30%. |
| II survival/utility | **Guard Dog** (D): Call Off makes a hound body-block the next hit on you (once). | **Fetch** (D): Call Off also drags you 150 units toward the hounds. | **Thick Coat** (passive): a downed hound respawns in 6 s instead of 10 *(the plain-number talent)*. |
| III gauge | **Shared Kill** (gauge): a finisher on a boss below 30% refunds 20 Bond. | **Howl** *(grants, replaces W)*: both hounds howl; the party gains 5% damage for 8 s and the hounds hold. | **Running Bond** (gauge): Bond fills while hounds move to a new position. |
| IV big cooldowns | **Blood Scent** (F): Mark the Quarry spreads to the nearest add. | **Drive** (F): during Mark, Whistle has no cooldown. | **Cornered** (F): Mark ends with a forced pounce from both hounds. |
| V capstone | **King of the Pack** (T): Wild Hunt's spectral hounds stay 4 s after it ends. | **The Long Chase** *(grants, replaces F)*: send the pack on a lap round the boss: each quarter it passes deals a hit, ends in a Pack pair. | **Alpha** (E): a Bring Down crits for sure if both hounds are at full Bond. |
| VI Pack Leader | **Pincer Drill**: Rend's bleed jumps to an add if the boss has two. | **Tag Team**: after Relay, the next finisher counts both pairs. | |
| VII Pack Leader | **Hunting Horn**: Pounce knocks the boss's facing toward you for a beat (no effect on a tank's hold of aggro). | **Littermates**: when one hound bites, the other bites too 20% of the time. | |
| VI Lone Wolf | **Saddle Born**: Mount lasts 2 s longer. | **Leap Off**: Ride Down lands where you aim (short range). | |
| VII Lone Wolf | **Old Scars**: Greyfang takes 30% less damage from raidwides. | **Fang and Knife**: your knife hits make Greyfang's next bite double. | |

### Loot (wtype 'hunting knife', plus a collar trinket)
- Weapons: *Kennel Knife, Webcut Skinner, Ember-Forged Skinner, Barrow-Hound Knife, Knife of the Hollow Hunt*. Armour: *Kennelman's Jerkin, Silkhide Jerkin, Stormhide Jerkin, Gravehound Jerkin*.
- **houndmaster_w1** (Grubnak): "A Rend's bleed also makes your hounds' bites hit 10% harder."
- **houndmaster_a2** (Skitterra): "Call Off also gives the hounds a small shield."
- **houndmaster_w3** (Volkar): "Pounce gives 10 Bond per hound that lands in a pair."
- **houndmaster_w7** (Archmage, set 2): "Wild Hunt opens with a pounce from all four spectral hounds."

### Visuals and sound
A lean huntsman in a fur-collared green coat and leather cap, a horn and a long knife. Hounds: lean grey-brown lurchers drawn with a few curves, one rust collar, one ash collar; tails and ears animated. Palette: moss green, tan leather, rust (#c46a3a), ash (#b8b2a8). VFX: whistle notes (a curved line) from you to the hound; position arcs under the boss; finisher-specific bites (Rend: two crossing claw lines; Hamstring: a low cut and a stumble; Bring Down: both hounds leap and a dust ring). Sounds: two-tone whistles (distinct for flank/hold/pounce), barks per hound (one lower), a hunting horn for Wild Hunt.

### Voice sheet
Gruff, few words, talks to the dogs as much as the party; country turns of phrase. Sign-offs: "Good dogs.", "Heel.", "We'll have him by supper."
- *Grubnak, cleave:* "Big lad swings wide. Keep the dogs off his front and he'll never see 'em. Good dogs."
- *Skitterra, webs:* "Rust hates the webs. Call him in before they drop. Heel."
- *Volkar, adds:* "Let the pack loose on the little ones. They like a chase. We'll have him by supper."

### Icon prompts
Portrait: a huntsman kneeling with two hounds, horn on his hip, misty green woods. Abilities: a skinning knife (Q); a whistle with a curved arrow (W); two hounds' jaws meeting (E); a hound mid-leap (R); hounds running back to a boot (D); a red cloth tied on a branch (F); a ghostly pack of four under the moon (T); Mount (a rider on a huge grey hound); Howl (a hound howling).

---

## 4. Kenseier — *The Ashen Guard* (Tank)

*(Working name. "Kensei" plus Emberfall's ash: a swordsman of the old ember-watch who meets every blow with the blade. Alternative: "Ashguard".)*

**Tagline:** "Every blow has a beat. Catch it."

**Gameplan:** Meet the boss's blows with your blade. A deflect timed to the hit turns it aside and wears down the boss's **Posture**. Fill it and the boss **Breaks**: a short window to strike a **Deathblow**. Mistime and you still block a little. Only you can build Posture.

**How it differs:** Ironpalm reads single blows for its own DPS combo; Bastion's Perfect Block is a timing bonus on a mitigation Brace. The Kenseier's deflect is the **core rotation**: every boss auto has a beat, the deflect window is tiny, and the payoff lives on the boss (a shared Posture bar that drives a party-wide damage window).

### Gauges
- **Posture** (on the boss): a bar under the boss's nameplate, painted white-gold, that only the Kenseier fills. It recovers slowly when not pressured (a grey back-fill shows recovery). At full: **Break** (the bar flashes and cracks, the boss staggers for 4 s: it does not cast, it takes 15% more damage from the party, and the Deathblow key glows). Bosses never Break during a scripted cast; Posture just holds full until the cast ends.
- **Poise** (self): your own small bar; a mistimed deflect or a hit taken without deflecting costs Poise. At zero you're **Off-balance** for 2 s (no deflects, +10% damage taken). Poise refills quickly while you aren't hit.

**The beat:** every boss auto and tankbuster shows its swing on the boss (they already do); the Kenseier also sees a thin ring closing on their own feet for incoming hits aimed at them (a readable ring, never hidden from others). Deflect windows: **Perfect** ±0.12 s, **Good** ±0.3 s.

### Kit
| Key | Name | Cast / CD | What it does |
|---|---|---|---|
| Q | **Ember Cut** | GCD, 3-step | {d:170}/{d:190}/{d:240}. The third adds 8 Posture. **Taunt rides here**: a third hit on a boss not targeting you pulls it. |
| W | **Deflect** | oGCD, no CD (0.6 s lockout after a miss) | Perfect: no damage, +18 Posture (+30 on a tankbuster), a spark. Good: 50% damage, +8 Posture. Miss (pressed with no hit): costs a little Poise. |
| E | **Mikiri Step** | oGCD, 12 s | A small step through a frontal attack or charge; Perfect timing passes through it untouched and adds 25 Posture. |
| R | **Deathblow** | GCD | Only during Break: {d:900} and heals you 15%; it ends the Break early. Out of Break: **Pommel** ({d:200}, +5 Posture). |
| D | **Ash Mantle** | oGCD, 60 s | 40% less damage for 8 s; deflects in the mantle always count as Good at least. The tank cooldown. |
| F | **Guard Stance** | oGCD, 90 s | For 6 s your deflects also shield the nearest ally ({h:150}). Party utility. |
| T | **Ultimate — Flash of Ash** *(instant)* | own charge | Fill the boss's Posture to full and Break it at once, then a free Deathblow at double strength. Charge fills from Perfect deflects. |

**Glows:** W lights in time with the closing ring (a thin flash on the key at the Perfect moment); R during a Break; E when a frontal is aimed at you; D on a tankbuster cast; T when charged.

**Signature mechanic:** a rhythm game with the boss. The boss's autos and casts are the song; Perfect deflects ring out (a bright clang), and a Break is a moment the whole party feels (a crack, a stagger, a damage window). That gives the tank a payoff beyond "survive".

**Bots:** deflect on the hit with a skill-based timing jitter (pro: ±0.08 s, sloppy: ±0.3 s); Deathblow on Break; Ash Mantle on tankbuster casts; Mikiri Step on frontals. Party bots spend their bursts on a Break.

**Newbie vs expert:** a newbie mashes Deflect around the hit and gets Goods: half damage, slower Breaks, about 70% (tuned so Good still Breaks about every 45 s, Perfect about every 25 s). An expert Perfects nearly every swing, times Mikiri on frontals and lines Breaks up with the party's burst.

### Specs
| | **Deathblade** (*the Kill Stroke*) | **Warden of the Ash** (*the Turning Blade*) |
|---|---|---|
| Identity | All-in on parry and Deathblow. | Deflects hits away from allies or turns them back. |
| Changes | Perfect deflects +25 Posture; Break lasts 5 s; **Guard Stance → Iai Stance** (6 s: your next Perfect deflect is followed by an automatic counter-cut for {d:450}). | **Deflect** can also be used on a hit aimed at an ally within 120 range (you step in front: your Poise, their safety). **Pommel → Redirect**: send the last deflected hit back at the boss ({d:} equal to 30% of what it would have dealt, capped at {d:500}). |
| Passive | **Killing Edge:** Deathblow also leaves the boss taking 5% more damage from you for 10 s. | **Ash Wall:** each Perfect deflect gives the party a tiny 2% damage cut for 4 s (stacks to 3). |

### Talents
| Row | A | B | C |
|---|---|---|---|
| I rotation | **Riposte** (W): a Perfect deflect makes your next Ember Cut skip to the third step. | **Ember Edge** (Q): the third cut sets a burn that adds 1 Posture a second for 6 s. | **Feint** (R): Pommel can be pressed instantly after a Good deflect to upgrade it to Perfect (8 s CD). |
| II survival/utility | **Iron Breath** (gauge): Poise recovers twice as fast while you're not hit. | **Long Step** (E): Mikiri Step carries you twice as far. | **Second Wind** (D): Ash Mantle has a 45 s cooldown *(the plain-number talent)*. |
| III gauge | **Crack** (Posture): Breaks leave the bar starting a third full afterward. | **Shatter** (Posture): a Perfect deflect on a tankbuster Breaks at once if Posture is above half. | **Whirlwind Slash** *(grants, replaces E)*: a spin that adds 4 Posture per enemy hit (adds count); for fights with adds. |
| IV big cooldowns | **Fireside Guard** (F): Guard Stance shields two allies. | **Unbroken** (D): while Ash Mantle is up, a miss costs no Poise. | **Blazing Mantle** (D): Ash Mantle ends in a burst for {d:300} per Perfect deflect inside it. |
| V capstone | **Grand Deathblow** (R): a Deathblow at the very start of a Break deals 30% more. | **Ember Duel** *(grants, replaces F)*: for 10 s the boss's autos come at a steady beat (every 2 s exactly) and every Perfect adds double Posture. | **Last Spark** (T): Flash of Ash charge refills by a quarter on a Break you built yourself. |
| VI Deathblade | **Cleaving Death**: Deathblow also hits adds near the boss. | **Patient Edge**: Breaks you didn't spend a Deathblow on within 2 s give the party +5% damage instead. | |
| VII Deathblade | **Crane Form**: Iai Stance's counter-cut adds 10 Posture. | **Double Stroke**: Deathblow strikes twice, the second at 40%. | |
| VI Warden | **Long Guard**: cross-deflect range 180 instead of 120. | **Ember Return**: Redirect also heals you by what it deals. | |
| VII Warden | **Shared Poise**: a cross-deflect Perfect gives the ally a 3 s shield. | **Turned Tide**: a redirected tankbuster adds 20 Posture. | |

### Loot (wtype 'katana-like "ashblade"')
- Weapons: *Watchman's Ashblade, Silk-Wrapped Ashblade, Forgefire Ashblade, Barrow Ashblade, Ashblade of the Last Watch*. Armour: *Ember-Watch Haori, Webweave Haori, Stormash Haori, Gravestill Haori*.
- **kenseier_w1** (Grubnak): "A Perfect deflect heals you for about 2% of your HP."
- **kenseier_a2** (Volkar): "Off-balance lasts 1 s instead of 2."
- **kenseier_w4** (Hollow King): "Deathblow during the first second of a Break leaves a short party shield."
- **kenseier_w8** (Hydra, set 2): "Flash of Ash charges a little from Good deflects too."

### Visuals and sound
A tall figure in an ash-grey haori over dark lacquered plates, a single long blade with an ember-orange edge, a cloth mask. Palette: ash grey, charcoal, ember orange (#ff8a3d), white-gold Posture. VFX: Perfect deflect is a bright white-orange spark and a short ring; Good is a duller grey spark; Break cracks the boss's Posture bar and draws a gold crack across the boss sprite; Deathblow is a single long slash with a fading ember trail and a brief screen hush (no screen shake beyond the existing level). Sounds: a high clean clang for Perfect, a duller clank for Good, a glass-crack for Break, a drawn-out whoosh then thump for Deathblow.

### Voice sheet
Quiet, terse, a teacher of the blade; talks about beats, breath and timing; dry respect for the boss. Sign-offs: "Catch the beat.", "Breathe, then strike.", "Ash settles."
- *Grubnak, autos:* "His fists are slow and honest. Learn the count and he gives you all the openings you need. Catch the beat."
- *Skitterra, charge:* "Step through the charge, not away. The web falls behind you. Ash settles."
- *Hollow King, tankbuster:* "His heavy strike comes after the long breath. Meet it with the blade, and he will kneel. Breathe, then strike."

### Icon prompts
Portrait: a masked swordsman with the blade raised, sparks flying, ash drifting, dark charcoal background. Abilities: an ember-edged cut (Q); a blade meeting a claw with a white spark (W); a footstep through a red line (E); a single killing slash across a cracked bar (R); a cloak of ash (D); a blade held across an ally (F); a ring of a thousand slashes (T); Iai Stance (a sheathed blade, hand on hilt); Redirect (a blow turned back with an arrow).

---

## Build plan

Each class touches: `client/js/combat/kits.js` (kit, gauge, glow, `k.fx`, `TALENT_ABILITIES`, `ULTIMATES`), `specs.js`, `talents.js`, `data.js` (class entry, gameplan, roster), `heroes.js` (the drawn hero), `gauges.js` / `hud.js` (gauge drawing), `ability-vfx.js`, `items.js` (`CLASS_MAIN`, `CLASS_GEAR`, `ITEM_PERKS`), `arena/bots.js` (bot play), `hero-guide.js`, `sfx-map.js` / `sfx-synth.js` (sounds; `tools/audio/coverage.js`), `keybinds.js` (any new hotkey), `journal/*.js` (a voice line for all eight bosses' moves; `docs/plans/journal-voices.md`), `voice-lines.js`, `docs/art/icon-prompts.md`, `tools/simulate.js` / `tools/check.js` registration.

New engine pieces: **Lanternkeeper** needs floor and attached heal zones (zones exist for bosses; a player-owned heal zone is new). **Tidecaller** is self-contained (a timer gauge). **Houndmaster** needs two pets with positions around the boss, telegraph damage, and respawn (the first player pets: biggest new system). **Kenseier** needs a per-hit timing check (Ironpalm/Bastion already time hits) and a Posture bar on the boss shown to all (boss state, synced from host).

Split per class into three agent tasks, on separate files to avoid collisions:
1. **Core kit**: kits.js + specs.js + talents.js + engine hook (zones / pets / posture), with `tools/simulate.js` balance to the 70% target.
2. **Look and sound**: heroes.js drawing, gauges/HUD, ability-vfx.js, sfx, icon prompts.
3. **Content**: data.js entry, items.js loot, bots.js, hero-guide.js, journals and voice lines, check.js lines.

Suggested order: **Tidecaller** (smallest new system), **Lanternkeeper** (player zones), **Kenseier** (posture on the boss), **Houndmaster** (pets, the largest). One class at a time through all three tasks keeps `kits.js` and `data.js` edits from colliding.
