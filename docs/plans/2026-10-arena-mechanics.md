# Bosses that use the room (design, 2026-10-19)

Today each arena is a painted backdrop: the walls clamp movement, and that's all. Every mechanic is a shape on the floor. This pass gives each room objects the boss *uses* and the party has to *read*: cover to hide behind, walls to slam into, things that break and stay broken, so the room at minute 4 isn't the room at minute 1.

It builds on the boss rework (harder Normal, Hard-only moves) and keeps its rules: no teaching text, the cast bar and the upcoming-moves feed name every move, and Hard adds moves rather than only bigger numbers.

## Shared engine: arena props

One new host-side system, used by all four fights.

- **Props:** `f.props`, a list of `{ id, kind, x, y, r | w,h,angle, hp, solid, cover, state }` owned by the host. A compact `props` message is sent whenever one changes (spawned, damaged, broken, moved, state change), and every client draws them with the room's theme.
- **Solid:** players, bots, adds and the boss collide with it (it's pushed out like the wall clamp). Dashes stop at it.
- **Cover:** a mechanic can take `cover: true`. A player is safe if the line from the mechanic's source (usually the boss) to them passes through a cover prop. The telegraph is drawn **with the shadows cut out**, so the safe spot reads at a glance as a lit floor patch behind the prop. That keeps it clear without any text.
- **Breakable:** props have HP. A cover mechanic that hits a prop chips it, and some boss moves smash props outright. A broken prop leaves rubble (drawn, not solid) or a hazard zone.
- **Wall slam:** a knockback or boss charge that ends against the room wall or a solid prop triggers an impact. A player takes slam damage and is dazed for 0.6s. The boss is staggered and takes more damage (see Grubnak).
- **Floor state:** permanent floor changes (`f.floor`) such as collapsed sections, rubble, grease and ice. Drawn into the room layer once, not every frame.
- **Bots** learn cover (stand in the safe shadow), avoid solid props when pathing, and bait charges into walls, so `check.js` still clears every boss.

## Grubnak: the kitchen

The room: a long checker-tiled kitchen, the stove line along the top wall, shelves down the sides, counters along the bottom.

**Normal**
- **Butcher's Charge** (new): Grubnak lowers his head at his top-threat target and charges in a straight line until he hits something. If he hits the **brick wall**, he's stuck for 4s, and the party deals 20% more damage to him. If he hits the **stove line**, the burners erupt into a fire wall across the top third of the room for 10s. So the tank decides where the charge goes by where they stand.
- **Larder Toss** (new): he rips a cask off a side shelf and throws it at the farthest player (a circle telegraph). The cask stays where it lands as a solid cover prop. Two casts later, **Gut Blast** (a whole-room roar from Grubnak, `cover: true`) has to be hidden behind a cask. Casks crack after one Gut Blast and break after two, so the party keeps needing fresh ones.
- **Flambé** (replaces one existing filler): burners along the stove flare in a running sequence, left to right or right to left, and the cast bar says which. You walk with the gap.

**Hard adds**
- **Grease Fire:** the drains back up and spill grease puddles (permanent floor). Any fire, whether Flambé, a stove eruption or a Pyromancer's ground fire, sets the connected grease alight for 6s. The party has to keep fights away from the puddles.
- **Meat Hook:** a chain flies from the ceiling rail at a random non-tank player and drags them 200 px toward the stove. If they hit a burner or a lit puddle on the way, they ignite. You dash against the pull or stand where the drag path is clean.
- The cask Gut Blast cover also takes **two** players per cask, so pairs have to share.

## Skitterra: the web cave

The room: an octagon of web strung between eight rock pillars, one at each corner.

**Normal**
- **The pillars become solid cover props** (they're already drawn at the corners). Each pillar takes 3 hits before it collapses into rubble.
- **Acid Deluge** (new): Skitterra rears up in the centre and sprays the whole cave (`cover: true` from her position). Hide in a pillar's shadow. Each Deluge chips the pillars used, so the party should spread across pillars instead of all piling behind the closest one. Deluges come back three times per phase, which makes losing pillars the fight's real timer.
- **Strand Reel** (reworks Fang Dash): she shoots a strand to a pillar and reels herself to it in a straight line (a rect from her to the pillar). Anyone on the line is hit and webbed. She hangs on that pillar for a few seconds, so melee follow her there.

**Hard adds**
- **Ceiling Ambush:** she climbs into the ceiling web and becomes untargetable. Only her **shadow** crosses the floor, picking up speed. She drops after 5s where the shadow stops (a large circle) and knocks everyone in it into the nearest wall (wall slam). Watch the shadow, not the cast bar.
- **Cocoon Pillar:** a webbed-up player gets stuck to the nearest pillar. Breaking the cocoon damages that pillar too, so the party trades cover for a teammate.
- Acid Deluge leaves the floor **outside** every shadow sticky for 8s (slow), so getting to cover late costs you the next move as well.

## Volkar: the storm peak

The room: a round summit under open sky, with a cliff edge all round and clouds below. It already has Storm Walls and an electrified edge that closes in during phase 2.

**Normal**
- **Standing Stones** (new props): four tall stones around the summit, solid but not cover. **Rod Strike** (reworks the rod towers): lightning hits the stone nearest each marked player. Standing next to the stone *takes* the hit for your marker, so you soak it at the stone instead of in the open, but a stone that takes two hits in 10s **discharges** into everyone near it. Rotate stones.
- **Gale Force** gets an edge: its knockback now ends in a wall slam *at the cliff edge*. The storm edge throws you back up hurt and dazed (Normal), so you place yourself with your back to the middle, not to the edge.
- **Avalanche** (new): Volkar stamps and boulders roll across the summit in lanes from one edge (rects with a short lead time). The boulders come to rest as solid cover props, and the next **Storm Walls** sweep is the first mechanic you can hide behind them for. The walls shatter them as they pass.

**Hard adds**
- **Crumbling Summit:** instead of the whole edge closing in evenly in phase 2, one wedge of the peak breaks off at a time (permanent floor loss, telegraphed by cracks 6s ahead). The room becomes lopsided, and the Storm Walls' safe lanes change with it.
- **Grounded:** a stone that discharges also *chains* to the nearest player within 250, so rotating stones is mandatory, not just good practice.
- Gale Force past a broken wedge is a **fall**: you're dragged back up by the wind, but you're out of the fight for 5s, taking heavy damage.

## The Hollow King: the burial hall

The room: a long burial hall, the throne against the top wall, braziers and candles, coffins along the side walls. It already has lanterns, Echo Knights and the bells.

**Normal**
- **Braziers become props with a lit/unlit state.** **Lights Out** (new, reworks Gaze): he snuffs the hall. The room goes dark except for a small circle of light around each *lit* brazier, and his **Dread Gaze** hits anyone standing in the dark. Only two braziers relight after each Lights Out, and he chooses which by his position, so the party reads where to be from which braziers he's walking past.
- **Coffin Lids** (new): he tears the lids off two coffins and sends them skidding across the hall (wide rects, from the walls inward). Each lid stops where it lands as solid cover for his next **Royal Decree** (a frontal wave across the whole hall, `cover: true`). The lid is then destroyed.
- **The Throne:** at the phase change he sits and casts **Court of Bones**. The coffins along the walls open in order and send out adds. The party can break the coffin *before* it opens (it has HP) to stop that add, so which coffins to break first is a real decision.

**Hard adds**
- **Falling Masonry:** each Knell (the raidwide) brings down two chunks of ceiling, leaving permanent solid rubble. The hall gets more crowded through the fight, and that rubble *blocks* Coffin Lids and Royal Decree too, so late in the fight you get cover you didn't plan for, and walls you can't walk through.
- **Last Ember:** in phase 3 only one brazier ever relights. Someone carries a **Torch** (an extra action on a marked player), and the light moves with them, so the party follows the torch-bearer, who has to dodge as well.

## Build notes

- **Order:** shared props system first (props, solid, cover with shadow drawing, wall slam, network sync, bot cover logic), then Grubnak (charge and casks prove it), then Skitterra (pillars), Hollow King (braziers, coffins), and Volkar (stones, avalanche, crumbling edge).
- **Clarity rules:** props are drawn with a clean outline and a contact shadow so they read as solid. A cover telegraph always shows its shadows cut out. A prop about to break shows cracks one step ahead. Each new move gets a cast-bar name and an upcoming-moves entry.
- **Balance:** each new Normal move replaces an existing filler rather than piling on, so fight length stays the same. Hard-only moves go on top. `check.js` bot clears must still pass on both difficulties.
- **Network:** props change rarely, so a whole-list `props` message on change is fine. Floor state goes in the same message.
