# Emberfall: Design Document

A four-player co-op raid game (tank, two DPS, healer) in the browser. You meet in a town, pick a hero at the tavern, and step through a portal into an FF14-style boss fight: the boss mostly holds the middle of the room, and the challenge is reading its attacks, moving as a team, and playing your class well under pressure.

This document covers the combat rules, all nine class kits, and all four bosses. It also records what was built, what was tested, and what still needs testing. The research behind the design is in `docs/research/`:
- `ff14-job-design.md`: where skill expression comes from in FF14 jobs.
- `class-design-beyond-ff14.md`: WoW, Lost Ark, GW2, Dota and design theory.
- `ff14-raid-boss-design.md`: mechanic vocabulary, timelines, Normal vs Savage.

---

## 1. Philosophy: easy to learn, hard to master

Four ideas from the research shaped every kit.

1. **The floor is about understanding, not button count** (Bushnell's Law, Rosewater's "lenticular design").
   - Every class has one main button: a combo on a single key, or a filler cast.
   - Buttons **glow** when they're a good press.
   - Mashing the glowing buttons is a complete, working rotation. A new player is never told "this is only good if...".
2. **The gap comes from the layer above the filler.** WoW's single-button assistant loses only about 2–30% damage. Experts pull ahead through:
   - off-GCD weaving;
   - manufacturing procs instead of waiting for them;
   - pooling resources for the party's burst window;
   - pre-positioning for damage you know is coming;
   - keeping your GCD rolling while you dodge;
   - never overcapping.

   None of that raises the floor. It's simply there to discover.
3. **Each class has one signature skill check that no other class has.** Perfect Block, Crimson Drain timing, Ward breaks, Keen Eye, positionals, Heat and Hot Streak, Petal economy, planting HoTs early, stance juggling. Players should be able to say "I main X because I love doing Y."
4. **Every class gauge is a unique shape, never a plain bar.** Bastion's is a shield that fills, Bloodreaver's a heart, Runeguard's three rune stones, Ranger's a quiver, Shadowblade's a moon with five phases, Pyromancer's a crucible, Cleric's a sundial with petals, Grovekeeper's a sprouting seed, Chronomancer's an hourglass. They are drawn in `client/js/combat/gauges.js`. Hovering a gauge shows a tooltip with its live value (plus a readout like Heat's damage bonus or the Chronomancer's stance) and what fills and spends it (`GAUGE_TIPS` in `client/js/combat/hud.js`).

**Pitfalls avoided:**
- No uncontrollable randomness. Procs are steerable (Fire Blast manufactures crits; Hunter's Mark raises Keen Eye odds).
- No single cooldown holds half the damage.
- No abilities that make a newbie wait.
- No trap choices between overlapping buttons.

## 2. Combat rules (FF14-style)

| Rule | Value |
|---|---|
| Global cooldown (GCD) | 2.5 s, shortened by haste |
| Input queue | presses up to 0.5 s early fire the instant they're ready |
| oGCD animation lock | 0.6 s, so 1–2 oGCDs fit between GCDs; more "clips" (delays) your next GCD |
| Casting | moving cancels a cast, except in its last 0.5 s (slidecasting) |
| DoTs | refreshing keeps up to 30% of the remaining duration (pandemic) |
| Burst cycle | every class's big buff is on a 60 s timer, so parties line them up |
| Damage | potency × 10, 10% base crit for 1.5× |
| Getting hit by something avoidable | **Damage Down** (−10% damage, 10 s) and **Vulnerability** (+25% damage taken per stack, 15 s) |
| Auto-attacks | no button: while you're fighting (an enemy skill in the last 8 s) and an enemy is in range, your weapon strikes on its own every 2.6 s (faster with haste), never while casting. Potency 40 for weapon classes, 25 for casters' sparks. About 8–10% of a pro's damage for most classes, almost nothing for the Pyromancer, who is nearly always casting. |

**Animations:**
- **Attacks:** a wind-up, then a lunge and twist into the strike. Swords and axes leave a bright arc, daggers thrust streaks, and the bow kicks back with a thrumming string.
- **Auto-attacks** play a lighter version that alternates forehand and backhand, with small effects and small, muted damage numbers.
- **Channeling** a real cast: a rune circle under the caster fills with the cast's progress, and motes in the class's style (embers, light motes, leaves, clock ticks) spiral into the staff, orb or hands, which swell until the release. Interrupting a cast stops it for everyone. While casting, the hero keeps turned toward the target (the enemy, or the ally being healed), following it if it moves.

**Controls:** right-click to move. Left-click interacts in town, or picks an ally to heal in the arena. **Q W E R D F** are the six skills, **Space** is a shared dash (2 charges, 12 s each), **T** is a tank's taunt, and **1–4** target party members.

**Threat and taunt** (host-side, `client/js/arena/fight.js`):
- Threat is damage dealt × 2.75 for tanks (× 1 for everyone else), plus 20% of healing done. It fades by 5% a second, so what counts is roughly the last 20 seconds. A tank who keeps hitting holds the boss through normal play; a tank who stops for a few seconds (or a newbie tank against a bursting DPS) loses it.
- The boss attacks, faces and aims its tankbusters at whoever has the most threat. Adds keep their own threat (from damage dealt to that add, with the same tank multiplier) and go for the nearest player until someone hits them.
- Death wipes your threat; a raise starts you again from zero.
- **Taunt (T, tanks only, every spec):** an oGCD, 20 s cooldown, 500 range, aimed at your target (the locked enemy, or the nearest). Your threat becomes 10% above the highest, and the boss stays on you for 3 s even if someone out-threats you in that time; an add stays on you for 6 s. Each tank's taunt is its own move with a small gauge tie-in (in the class tables below). The host checks the cooldown, and clamps any threat multiplier a client sends to 0–3.
- Bot tanks taunt back, after a moment's reaction, when the boss or an add is on someone who isn't a tank. They save it for the boss while a DPS is close to pulling.
- Tuning test (bot raids, the bot tank stops attacking and never taunts while idle): inside the party's 60 s burst windows it loses the boss after 3–6 s; outside them after 7–11 s. In normal play the top DPS sits at about 70–75% of the tank's threat and the bot tank taunts 1–3 times a fight; with taunts switched off a DPS held the boss for 8–33 s of a fight. With the old setting (× 5, no fade) the top DPS sat near 40% and an idle tank never lost it.

**Ally targeting** (for healers), in order of priority:
1. the party frame under your mouse;
2. the ally you clicked;
3. the ally nearest your cursor;
4. yourself.

A green dashed ring always shows who your heal will land on.

**Authority:** each player runs their own kit locally and reports damage and heals to the host. The host's fight sim owns boss HP, player HP, threat, mechanics, deaths, and the HP history Rewind needs.

## 3. The nine classes

Each class has 6 skills plus the shared dash. **GCD** skills share the global cooldown; **oGCD** skills have their own cooldowns and can be woven between GCDs. Potency × 10 ≈ damage.

### Tanks

**Bastion, Shield Knight** (difficulty ◆◇◇). Signature: **Perfect Block**. Gauge: shield (Resolve).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Blade Chain | GCD | Strike → Riposte → Judgment on one button (220/300/400). Judgment gives +25 Resolve (+50 during Oath). After a Perfect Block it glows: the next hit counters for +150. |
| W | Holy Edge | GCD | Spend 50 Resolve: 560 (720 during Oath), range 260, small self-heal. |
| E | Brace | oGCD | 2 charges, 7 s each: 25% less damage for 3 s. Brace within 0.8 s before a hit lands for a **Perfect Block**: 60% less damage, +20 Resolve, and the counter. |
| R | Oath of Valor | oGCD | 60 s burst: +10% damage for 15 s. |
| D | Rally Banner | oGCD | The party takes 15% less damage for 12 s (90 s cooldown). |
| F | Bulwark | oGCD | 40% less damage for 10 s, and Brace's charges refill (120 s cooldown). |
| T | Challenge | oGCD | Taunt (20 s cooldown). Steel on the shield: +10 Resolve, and the next Blade Chain counters for +150, as after a Perfect Block. |

*Floor:* combo, Holy Edge when it glows, Brace when you see the swing. *Ceiling:* time Brace to the boss's wind-up (the boss visibly raises its weapon before every auto-attack), pool Resolve for Oath, plan Banner and Bulwark onto known hits.

**Bloodreaver, Berserker** (◆◆◇). Signature: **Crimson Drain timing**. Gauge: heart (Blood).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Hack / Maul | GCD | Two-hit combo, 240 / 340, builds Blood. |
| W | Crimson Drain | GCD | Spend 40 Blood: 330 + up to 450 potency based on damage taken in the last 6 s. Heals for 35% of that damage (minimum 8% max HP). Free and +120 during Frenzy. |
| E | Bloodletting | oGCD | 2 charges, 15 s each: 220 and +20 Blood. |
| R | Frenzy | oGCD | 60 s burst: +15% damage, and the next 3 Drains are free and stronger. |
| D | War Cry | oGCD | Party shield of about 14% HP (90 s cooldown). |
| F | Undying | oGCD | Can't drop below 1 HP for 8 s; self-heals doubled (150 s cooldown). |
| T | Reaver's Hook | oGCD | Taunt (20 s cooldown). A hooked chain thrown into the target: +20 Blood. |

*Ceiling:* Drain right after a tankbuster heals and hits for far more than Drain on cooldown. Save Frenzy's free Drains for the buster.

**Runeguard, Warder** (◆◆◆). Signature: **Ward breaks**. Gauge: three rune stones.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Rune Strike | GCD | 270, +1 Rune (+2 during Overload). |
| W | Runic Ward | GCD | Spend 1 Rune: a shield of about 20% HP for 8 s. When it ends, it explodes for 150–600 potency (more if it absorbed more; ×1.5 during Overload). Fully broken, it refunds the Rune. |
| E | Glyph Burst | GCD | Spend 3 Runes: 830 (1080 during Overload). |
| R | Runic Overload | oGCD | 60 s burst. |
| D | Sanctum | oGCD | The party takes 15% less damage for 10 s. |
| F | Mirror Aegis | oGCD | For 3 s, the next hit is reduced by 80% and reflected for 1500 potency. |
| T | Binding Rune | oGCD | Taunt (20 s cooldown). A rune of challenge stamped on the target: +1 Rune. |

*Ceiling:* learn the timeline so a Ward goes up right before each heavy hit and gets fully broken (it pays for itself). Line Mirror Aegis up with the boss's biggest swing.

### DPS

**Ranger, Marksman** (◆◇◇). Signature: **Keen Eye procs**. Gauge: quiver (Focus).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Quick Shot | GCD | 230, +10 Focus, 35% chance of Keen Eye (55% while Marked). During Barrage it fires three times (690) with triple Focus. |
| W | Piercing Arrow | GCD | 2 charges, 12 s each: 340. With Keen Eye, 500 and the charge comes back. |
| E | Rapid Fire | oGCD | Spend 50 Focus: 420. |
| R | Hunter's Mark | oGCD | 60 s party burst: the boss takes 8% more damage from everyone for 15 s; +10% crit for you. |
| D | Hunter's Cloak | oGCD | The party takes 10% less damage. |
| F | Barrage | oGCD | The next Quick Shot fires three times. |

The lowest floor (everything is instant, so you never stop to cast) and a modest ceiling: newbies reach 85% of pro damage. Mastery is spending Keen Eye before the next Quick Shot overwrites it, and never sitting on full Focus.

**Shadowblade, Assassin** (◆◆◆). Signature: **positionals**. Gauge: a moon with 5 phases (combo points).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Strike | GCD | 220, +1 combo point. From behind: +60 and +2 points. |
| W | Eviscerate | GCD | Spend all points: 120 + 115 per point (+160 at 5). From the flank +80; ×1.15 while poisoned; ×1.25 during Shadow Dance. |
| E | Shadowstep | oGCD | 2 charges, 15 s each: teleport behind the boss; every hit counts as a positional for 5 s. |
| R | Shadow Dance | oGCD | 60 s burst, 10 s: faster attacks, every positional lands. |
| D | Venom Blade | GCD | 140 + poison (70 every 3 s for 24 s). Glows in the last 7 s. |
| F | Smoke Bomb | oGCD | The party takes 10% less damage. |

The highest ceiling: newbies reach 70% of pro damage. The boss's hitbox ring shows its front (red), sides (white) and back (purple).

**Pyromancer, Fire Mage** (◆◆◇). Signature: **Heat and Hot Streak**. Gauge: a crucible (Heat).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Fireball | GCD | 1.8 s cast, 300, +12 Heat, +15% crit. |
| W | Pyroblast | GCD | 3 s cast, 540. Instant and 620 with Hot Streak. |
| E | Fire Blast | oGCD | 2 charges, 10 s each. Always crits, and works *during* a cast. |
| R | Combustion | oGCD | 60 s burst: every Fireball, Pyroblast and Fire Blast crits for 10 s. |
| D | Vent | GCD | 150 + 6 per Heat; resets Heat. |
| F | Smolder | oGCD | The party takes 10% less damage. |

- **Heat:** each point raises your damage by 0.3%. At 100 you overheat: you lose 15% HP and deal −20% damage for 5 s.
- **Procs:** a crit gives Heating Up; a second crit turns it into Hot Streak; a non-crit clears Heating Up.

*Ceiling:* experts manufacture the second crit with Fire Blast mid-cast, ride high Heat, Vent just before 100, and cast only when they know they won't have to move.

### Healers

**Cleric, Priest of Dawn** (◆◇◇). Signature: **Petal economy**. Gauge: a sundial with 3 petals.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Smite | GCD | 1.5 s cast, 280. After three Dawn Petals it becomes **Dawnstar**: instant, 950. |
| W | Mend | GCD | 1.8 s cast, 700 heal. |
| E | Dawn Petal | GCD | Spend a petal: instant 450 heal + small regen. Petals regrow every 15 s (max 3). |
| R | Prayer Circle | oGCD | The party takes 10% less damage for 10 s and regenerates (60 s cooldown). |
| D | Intervention | GCD | 2.5 s cast, 30 s cooldown: raise a dead ally, or 1200 heal. |
| F | Benediction | oGCD | 800 heal + 300 shield (40 s cooldown). |

*Ceiling:* spend Petals where they heal *and* keep Dawnstar coming, and keep Smiting whenever nobody needs healing.

**Grovekeeper, Druid** (◆◆◇). Signature: **planting heals early**. Gauge: a sprouting seed (Bloom).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Wrath | GCD | 1.5 s cast, 260. Instant and 390 after Bloom. |
| W | Rejuvenate | GCD | Instant 200 heal, then 140 every 3 s for 15 s. Each tick gives +5 Bloom. |
| E | Thornlash | GCD | 120 + thorns for 30 s. Glows in the last third. |
| R | Wild Growth | oGCD | Party regen, and your heals are +25% for 15 s (60 s cooldown). |
| D | Bloom | oGCD | Spend 50 Bloom: 400 instant heal on everyone with your Rejuvenate (the whole party during Wild Growth). Your next Wrath is instant. |
| F | Rebirth | GCD | 2.5 s cast, 30 s cooldown: raise, or 1100 heal. |

*Ceiling:* Rejuvenate *before* damage lands so no tick is wasted, then attack while it works. Bloom turns that foresight into burst healing.

**Chronomancer, Time Mage** (◆◆◆). Signature: **Haste / Slow stance**. Gauge: an hourglass (Flux).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Temporal Bolt | GCD | 1.5 s cast, 280. Slow stance: heals your linked ally (the tank) for 85% of the damage. Haste stance: heals the whole party for 30%. |
| W | Rewind | oGCD | 2 charges, 30 s each: set an ally's HP back to its highest point in the last 4 s. Revives them if they died in that window. They become your link. |
| E | Shift | oGCD | Toggle stance. Haste needs 20+ Flux; your first Bolt in Haste is instant. |
| R | Accelerando | oGCD | 60 s party burst: everyone is 10% faster for 15 s; +40 Flux. |
| D | Stasis | oGCD | The whole party is immune for 2 s (120 s cooldown). |
| F | Recall | GCD | 2.5 s cast, 30 s cooldown: raise, or 1200 heal. |

- **Flux:** Slow stance fills it (+3/s). Haste stance gives 20% faster casts and +10% damage, but drains it (−5/s).
- Hitting 0 Flux in Haste knocks you into Slow with 3 s of slower casts.

*Ceiling:* plan Haste for raidwides and burst windows, fire Rewind right after a tankbuster, and land Stasis on the boss's biggest attack.

### Simulation results (`node tools/simulate.js`)

The sim runs a 6-minute fight twice per class. The *pro* follows that class's optimal priorities. The *newbie* model:
- never queues inputs;
- reacts 0.1–0.6 s late;
- notices only 60% of glows;
- uses oGCDs 0.5–3 s late;
- ignores positionals;
- casts into movement.

| Class | Newbie DPS | Pro DPS | Newbie / pro |
|---|---|---|---|
| Bastion | 1073 | 1498 | 72% |
| Bloodreaver | 1172 | 1512 | 78% |
| Runeguard | 1070 | 1550 | 69% |
| Ranger | 1850 | 2147 | 86% |
| Shadowblade | 1739 | 2397 | 73% |
| Pyromancer | 1945 | 2381 | 82% |
| Cleric | 658 | 1037 | 63% |
| Grovekeeper | 744 | 1044 | 71% |
| Chronomancer | 834 | 1122 | 74% |

These numbers include auto-attacks. Each class's `potMult` was lowered when autos were added, so pro damage stayed where it was. Newbies gained a little, because autos keep hitting while they move or hesitate.

Every class has a clear newbie-to-pro gap (14–37%), and the gap grows with the class's difficulty rating. Within each role, pro damage is balanced to within about 10% through a per-kit `potMult` knob in `combat/kits.js`. Healer pros deal more damage because they stop over-healing and attack instead.

## 4. Bosses

Shared rules for every fight:
- **No text tells you what to do.** Cast bars show the attack's name; the boss's animations and props show what's coming.
- **Tells are things in the world, not colored shapes.** Each boss's mechanics are drawn as objects that belong to that boss (`client/js/arena/boss-tells.js`): Grubnak's are kitchen things, Skitterra's are silk, legs and venom. The danger area still matches the object exactly. Normal adds a faint dashed outline of the hit area for fairness; Hard drops the outline, and some mechanics stay fully hidden so you read the boss. Every part of a tell, including props in the air like the cleaver, cloches and jars, is drawn under the heroes, boss and adds, so a mechanic never hides a unit.
- **Every boss gets at least one mechanic that isn't a floor shape** (a moving hazard, a pull, a tether), so fights feel different and not just reskinned.
- **No logic puzzles.** Every check is action/reaction, positioning or teamwork.
- **Scaling.** Fights scale with party size (boss HP 42% / 62% / 82% / 100% for 1–4 players). Empty slots can be filled with bots that use the real class kits.
- **Hard mode** casts 15% faster and hits 25% harder, and adds layers: stored or doubled mechanics, telegraphs only on the boss model, and debuffs that punish soaking twice.
- **Every boss has its own room shape** (`ARENA_DEFS` in `client/js/arena/shapes.js`). The shape fits the theme and the mechanics: Grubnak's kitchen is a long rectangle (1240 × 840, rounded corners), Skitterra's web is an octagon hung between eight rock pillars, Volkar's summit is a circle whose electrified edge closes in during phase 2, and any boss without its own shape gets a circle. The walls are walls: you're never knocked off an edge. Wall clamps, bot planning, the camera, mechanics that start at the wall (Rolling Meatballs, Venom Mist) and telegraph clipping all read the shape, so a new boss only needs a new entry.
- **The room is alive.** Floors are textured (bevelled, cracked and stained tiles; pitted, cracked and mossy stone with standing water). An ambient layer, drawn under everything else, keeps the room moving:
  - Kitchen: burners flicker, pots steam, lamp light breathes on the tiles, flour dust drifts, and now and then a rat runs along the bottom wall.
  - Web cave: dew twinkles on the threads, drips fall into the pools and ripple, small spiders creep along the spokes, spores drift up, and cold fog slides along the walls.
- **Everything moves smoothly.**
  - Other players, bots, the boss and adds are drawn about 0.15 s in the past and blended between network updates (entity interpolation, `client/js/interp.js`), so they glide instead of lurching after each update. In a test, the old easing peaked at more than twice walking speed; interpolated movement stays within about 15% of it.
  - Every update carries the sender's own clock (player positions, casts, the boss, adds, bots), and updates are spaced by that clock, not by when they arrive. Over a simulated wobbly connection this keeps speed within 2% where arrival timing alone swung from 75% to 150%. The boss and bots send a steady 10 updates a second.
  - If the host's tab is in the background, the fight keeps running (it ticks off a worker timer); only the host's own hero stands still.
  - If the host disappears, guests go back to the join screen ("Lost connection to the host."), keeping their hero, and can rejoin, host or go solo straight away. Someone who leaves mid-raid shows as "Left" on the party frames.
  - Heroes turn quickly toward what they attack instead of snapping.
  - Telegraphs fade out over a quarter second after they land.
  - Adds fade in when they hatch and out when they die.
  - The boss fades when it goes untargetable.
  - The sticky web fades when it ends.
  - Entering or leaving a raid fades up from black.

### Boss I: Grubnak, the Ogre Chef (built, playable on Normal and Hard)

The tutorial raid. Everything he does, he shows you first, and the fight teaches FF14's core vocabulary one piece at a time, then combines the pieces.

Stats:
- HP: 1.25M (Normal) / 1.7M (Hard).
- Auto-attacks: every 2.8 s on whoever has the most threat. He visibly winds up first, which Bastion's Perfect Block reads.
- Enrage: "Last Call" at 7:00 (Normal) / 6:15 (Hard).

| Mechanic | What happens | What it teaches | Hard layer |
|---|---|---|---|
| **Grease Fire** | Raidwide | Healing, party mitigation | none |
| **Tenderize** | Tankbuster: a cone on the tank that cleaves anyone else in it. A cleaver icon floats over the target. | Tank cooldowns; don't stand with the tank | Leaves *Tenderized* (the next buster hits 60% harder), so tanks must alternate cooldowns |
| **Mince** | One half of the room gets chopped. His cleaver on that side catches the light. | Reading the boss | **Double Chop:** both halves in sequence, glowing side first, no floor telegraph |
| **Ladle Spin / Lid Slam** | Spin = get out (circle on him). Lid held overhead = get in (everything outside him gets hit). | In/out | No floor telegraph; read the prop |
| **Chop Chop** | Mince, then instantly Spin or Lid. While he chops, the next tool hangs on his back. | Combining two known mechanics | Hidden |
| **Meat Toss** | Spread circles on everyone but the tank. Each one leaves a grease puddle. | Spreading; where you drop puddles matters | Bigger, longer puddles |
| **Family Meal** | Stack on one player; damage is split among everyone inside | Stacking | Paired with Meat Toss at once: spread, then stack |
| **Order Up!** | One plate (tower) per player around the room. Every plate must be collected. | Soaking, ownership | Soaking makes you *Stuffed*; a second plate hurts a lot |
| **Spice Rack** | Random circles, plus one locked under each non-tank | Keep moving | none |
| **Whisk** | A cross of beams through him that turns 30° four times | Rotating dodge | none |
| **Boil Over** | Damage falls off with distance from him | Proximity | Replaced by Kitchen Rush (a charge at the farthest player) |
| **Simmer** (intermission at 55%) | He leaps to the center, untargetable, and rings of boiling water ripple out, then back in | Wave timing: step into the ring that just went off | Faster waves |
| **Gorge** (below 15%) | Raidwide every 20 s; he hits 10% harder each time | Soft enrage, a DPS check | none |
| **Rolling Meatballs** | He lobs giant meatballs to the rim. Each wobbles in place (its lane is shown by chevrons, plus a dashed lane on Normal), then rolls straight across the room, flattening and knocking aside anyone in its path. Staggered, so the gaps open one at a time. | Dodging moving hazards, not floor shapes | 4 meatballs instead of 3, faster and tighter |

**How his tells look** (all drawn in `boss-tells.js`): Mince darkens the doomed half under a giant ghost cleaver; Ladle Spin churns soup around him; Lid Slam casts the lid's shadow with ripples out to the safe ring; Meat Toss drops a steak on a chain; Family Meal lowers a silver cloche; Order Up! lays out steaming plates under glass cloches with a gold progress rim; Spice Rack shakes salt, pepper and paprika jars that pour onto the floor; Whisk draws wire loops; Boil Over is rolling heat with bubbles; Kitchen Rush leaves skid marks; Simmer's rings are stove coils going dull, red, white-hot; Grease Fire spreads an oil slick that catches fire.

**Timeline:**
- **Phase 1** (100–55%), about 2 minutes, then loops:
  - Grease, Tenderize, Mince, Ladle/Lid, Meat Toss, Family Meal;
  - Chop Chop, Grease, Order Up!, Tenderize;
  - Meat Toss → Family Meal back to back;
  - Chop Chop, Grease, Rolling Meatballs, Order Up!, Tenderize.
- **Intermission:** Simmer out, then Simmer in. Any meatballs still rolling are cleared.
- **Phase 2:** remixes everything with Whisk, Spice Rack → Ladle/Lid, Order Up! (with Meat Toss on Hard), Boil Over, Rolling Meatballs, and more.

**Bot test results** (`node tools/bot-raid.js`; four bots with the real kits and a simple competent-player AI):
- **Normal, Bastion / Cleric / Ranger / Pyromancer:** 5 of 5 runs cleared, in 3:27–3:45, with zero deaths.
- **Normal, other line-ups:**
  - Runeguard / Grovekeeper / Shadowblade / Ranger: cleared 3 of 3, no deaths.
  - Bastion / Grovekeeper / Pyromancer / Ranger: cleared 1 of 1.
  - Bloodreaver / Chronomancer / Pyromancer / Shadowblade: cleared 2 of 3.
  - Runeguard / Chronomancer / Ranger / Shadowblade: cleared 1 of 3. The bot tank dies around 2:40.

  The bot AI plays Chronomancer and Runeguard far more simply than a person would, so those line-ups are the closest calls. Watch this pairing when humans play it.
- **Hard:** bots get to 7–36% and wipe, usually on the phase 2 Order Up! + Meat Toss overlap. That's the intended result: Hard should take a coordinated human team a few tries.

### Boss II: Queen Skitterra, the Spider Broodmother (built, playable on Normal and Hard)

Theme: tethers, killing adds together, and rotating danger. The boss stays central on her web; the floor is the hazard. The arena is an octagonal web cave: cracked flagstones and standing pools under a huge web strung between eight rock pillars, bones and old egg sacs, stalagmites beyond the rim.

Stats:
- HP: 1.3M (Normal) / 1.75M (Hard).
- Auto-attacks every 2.8 s with the same visible wind-up as Grubnak.
- Enrage: "Devour" at 7:30 (Normal) / 6:40 (Hard).

| Mechanic | What happens | Hard layer |
|---|---|---|
| **Venom Mist** | Raidwide. Her fangs drip green during the cast. | none |
| **Silk Wrap** | Tankbuster cone that cleaves anyone else in it. Where it lands, the tank is **rooted** (2.6 s, can't move or dash). Silk threads wheel around her during the cast. | Root lasts 3 s |
| **Eightfold Lunge** | Her legs light up around her (glowing leg lines, brightest = next). Each step strikes a leg's direction and the opposite one (two 70° cones), turning 45° per step, so the safe side rotates. Normal: 4 steps, 1.35 s apart; each floor telegraph appears 2.6 s before it lands. | 6 steps, 1.05 s apart, no floor telegraph: read the legs |
| **Silk Lines** | A silk thread ties two non-tanks. It must be stretched past 420 when it resolves, or both take 14k and Vulnerability. Slack threads sag and wobble; a stretched one runs straight and bright. | Two threads on four players: green (stretch past 420) and thick red (stay within 150) |
| **Venom Spit** | A narrow cone at each of the two farthest players. It tracks them until 1.2 s before it lands, then a slowing venom pool (45 s) is left where it hits. Bait it at the edge, then sidestep. | Bigger pools that last 60 s |
| **Brood** | Eggs glow on the floor, then two spiderlings hatch on opposite sides. They stay near their nest (leash 240) and spit at whoever is closest, biting anyone who comes near. When one dies the other must die within 5 s or it **enrages**: heals 30%, chases anyone, bites 3× harder and pulses a raidwide every 3 s. Left alone for 45 s, both enrage. | 30k HP each instead of 26k; a burning beam joins the pair while both live and hurts anyone standing across it |
| **Tightening Web** (50%) | She returns to the middle, untargetable briefly, and the outer ring (radius 390 to the wall) turns sticky: standing in it slows you. | none |
| **Molt** (Hard, phase 2) | She sheds a pale husk and skitters 240 away. She starts a new Lunge while the husk replays her previous one: two rotations from two centers at once. | Hard only |
| **Silk Reel** | She rears up and shoots a thread from her spinnerets at the farthest non-tank. After a short wind-up it goes taut and drags them toward her (and slows their walking). **Dashing snaps the thread.** If she reels them all the way in, she bites: big damage plus a slow. | Two players reeled at once, pulled faster |

**How her tells look:** Venom Mist is a green fog rolling in from the walls; Lunge strikes show a raised, segmented leg with a red tip over each cone; Venom Spit is a line of venom beads that brighten when the aim locks; Silk Wrap pulls silk strands in toward the tank.

**New engine pieces** (all host-authoritative, all broadcast to every client):
- `FightSim.tether()` and the `teth` / `tethx` messages.
- `FightSim.spawnAdd()`: killable adds with leash, bite, ranged spit, `onDeath` / `onTick` hooks and an optional link beam. The `adds` message syncs them about 10 times a second; `addev` carries spawn, death, enrage, bites and spits.
- Damage events now carry `tgt` ('boss' or an add's id). Players hit the enemy they clicked, or the nearest one in range. The current add target gets a red ring and adds show HP bars.
- `FightSim.zone()` (lasting slow zones, `zone` message) and slowing puddles (`puddle(..., { slow: true })`).
- `slowed` and `rooted` debuffs that player movement, dashes and bot movement obey. They show on party frames.
- The `lunge`, `husk` and `eggs` messages for her leg lights, the husk and the eggs.
- `FightSim.roller()` (Grubnak's meatballs): one `roll` message, then every client computes the position from its own clock; the host checks hits against reported player positions and sends `rollhit` and a knockback.
- `FightSim.reel()` (Silk Reel): `reel` / `reelx` messages. The reeled client drags and slows its own movement; a dash sends a `snap` combat event. The host bites if the player reaches her, and bots snap after a random reaction time.

**Timeline:**
- **Phase 1** (100–50%), about 2 minutes, then loops:
  - Mist, Wrap, Lunge, Silk Lines;
  - Venom Spit, Brood, Silk Reel, Mist, Lunge;
  - Silk Lines (from the second loop on Normal, and always on Hard, with Venom Spit right after);
  - Wrap, Venom Spit.
- **Phase 2:**
  - Mist, then Wrap + Lunge together. The wrap lands just before the first strike, so the rooted tank must already stand somewhere the first two strikes miss.
  - Brood with Silk Lines.
  - Silk Reel, Venom Spit, then Molt on Hard or Lunge on Normal.
  - Wrap, Silk Lines + Spit, Mist, Lunge, Brood.

**Bot test results** (`node tools/bot-raid.js normal 5 skitterra`; the tool now takes a boss id):
- **Normal, Bastion / Cleric / Ranger / Pyromancer:** cleared 6 of 6, in 3:50–4:12, with no deaths.
- **Normal, other line-ups:**
  - Bastion / Grovekeeper / Pyromancer / Ranger: cleared 5 of 5.
  - Runeguard / Grovekeeper / Shadowblade / Ranger: cleared 2 of 3.
  - Bloodreaver / Chronomancer / Pyromancer / Shadowblade: cleared 2 of 3.
  - Runeguard / Chronomancer / Ranger / Shadowblade: cleared 2 of 3.
  - Overall: 17 of 20. Bots mostly get hit by Lunge and by walking through venom pools; brood pairs usually die within 2 s of each other.
- **Hard:** bots reach 34–43% in phase 2 and wipe (one seed wiped in phase 1 at 70%). Deaths come from Wrap + Lunge (the rooted tank), the brood beam and the venom-filled floor. That's tougher than Grubnak Hard, as intended.
- The bots split the DPS over the brood pair (one each) and ease off when theirs gets well ahead of its sibling. They stretch or close tethers, bait Venom Spit outward and sidestep at the lock, avoid crossing the beam and pools, and stay out of the sticky ring when they can.
- Grubnak was re-run after the engine changes: Normal still clears 5 of 5, and Hard still wipes in phase 2.

**Not built from the original design:** a "real cleave moment for Pyromancer". No kit has multi-target damage yet, so the brood is a split-and-sync check rather than a cleave check.

Explicitly **not** included: any "player gets cocooned and must be broken out" mechanic. That idea is parked elsewhere.

### Boss III: Volkar, the Storm Titan (built, playable on Normal and Hard)

Theme: polarity, knockbacks, rods that become cover, and a room that closes in. The hardest healing fight. Design choices made together on 2026-10-19: soaked rods stay as cover, the edge closes in three warned steps, healing pressure comes from a ramping Pulse, and he is a giant who never leaves the middle.

The arena is the summit of a mountain above the storm: a round shelf of slate (radius 540) scarred by old lightning, with a carved ring where he stands, rain pooling in hollows and wind-flattened grass at the rim. Beyond the cliff edge are clouds and other peaks far below. Clouds drift past, rain slants across, grass bends in the gusts, leaves blow over, and lightning splits the clouds now and then, lighting the summit.

Stats:
- HP: 1.65M (Normal) / 2.2M (Hard).
- Auto-attacks every 2.8 s; he never walks (`anchor`), so the tank comes to him.
- Enrage: "Skybreak" at 8:00 (Normal) / 7:10 (Hard).

| Mechanic | What happens | Hard layer |
|---|---|---|
| **Polarity** | Everyone carries + (gold ring with + marks) or − (blue ring with − marks), half each, all fight. | The charges flip at 50% |
| **Polarity Surge** | Two of the same charge within 150 arc (big, avoidable); someone with only opposite charges near takes a little; anyone alone takes the full surge. Arcs crackle between same charges before it lands; a calm bond joins opposite ones. | none |
| **Thunder Crash** | A storm cloud and a stack over every + player: each pair stacks together, and pairs keep apart. | Comes with Static Field 3 s later |
| **Static Field** | Everyone spreads. | none |
| **Lightning Rods** | Iron rods are driven into the rock (2, or 3 on Hard), each wanting one person when the bolt lands. Catching one gives *Conductive* for 32 s; catching another while Conductive hurts a lot. An uncaught rod strikes everyone. The rod then stays planted for 30 s. | 3 rods |
| **Gale Slam** | He draws breath and throws everyone 300 away. Hitting the wall hurts. The still air behind any standing rod shelters you; on Normal it shows as a pale strip. | Lands together with the rods: shelter behind the rod you're catching. No floor tell |
| **Storm Walls** | Walls of wind (150 wide) turn slowly around him for 10 s. Walk with them. | 3 walls, turning faster, 12 s |
| **Titan Fist** | Tankbuster cone that cleaves. Lightning gathers along it. | Leaves the tank Conductive |
| **Thunderclap** | Raidwide; the summit darkens under rolling clouds first. | none |
| **Pulse** | The storm hits everyone lightly every 4 s, 20% harder each minute. | Stronger |
| **Eye of the Storm** (50%) | The edge electrifies and closes in three warned steps 40 s apart: 540 → 470 → 400 → 330 (about 60%). Sparks crawl along the new line for 5 s; anyone outside when it jumps takes a hit and is pushed in. Beyond the wall the ground is dead and crackling. Late in the fight nobody survives a Gale Slam without a rod. | none |

**Timeline:** phase 1 (about 2 minutes, then loops): Thunderclap, Titan Fist, Surge, Rods, Gale Slam (sheltered by the posts), Thunder Crash, Storm Walls, Static Field, Titan Fist, Rods then Gale Slam, Surge, Thunderclap. Phase 2 remixes it with Crash + Field, more Rods + Gale Slam, while the edge closes.

**New engine pieces:** `ARENA.resize()` (a round room's wall moves; `ARENA.full` keeps the original size), `def.spawn` / `def.anchor`, `FightSim.sweep()` (turning walls: one `sweep` message, every client turns them on its own clock), a fall-check grace after the wall moves, and the `pol`, `post`, `edgewarn`, `edge` and `pulse` messages. Bots pair with their opposite charge (the higher id walks to the other, so bots come to you), take rods in turn (bots before humans, Conductive last), shelter behind rods when a Gale Slam would throw them into the wall, read where the storm walls will be along their path, and stay inside the next ring.

**Bot test results:**
- **Normal, Bastion / Cleric / Ranger / Pyromancer:** cleared 9 of 9, in 4:17-4:30, almost no mistakes.
- Runeguard / Grovekeeper / Shadowblade / Ranger and Bastion / Grovekeeper / Pyromancer / Ranger: cleared 6 of 6.
- Line-ups with a Chronomancer healer: 0 of 6. The bot heals about 60 per second where the fight needs about 100. A bot never takes the Chronomancer slot when it fills a party (Cleric, then Grovekeeper), and a person can plan Haste for the big hits, but watch this when someone heals Volkar as Chronomancer.
- One idle human plus three bots still clears (at 7:20).
- **Hard:** bots reach 17-68% and wipe; two runs lasted to the enrage. Deaths come from the Crash + Field burst and the Pulse late in phase 2.
- Bot healers now use Recall on the living (it was filtered out as a raise). That also helped elsewhere: Chronomancer line-ups now clear Grubnak 2 of 3 (was 1 of 3) and Skitterra 3 of 3 (was 2 of 3).

### Boss IV: The Hollow King, Lord of the Barrow (built, playable on Normal and Hard)

Theme: everything combined, across three phases. The final exam. Design choices made together on 2026-10-19: you avoid the Gaze by turning your back (your hero faces where they walk), the Echo Knights replay his last two swings, the Long Night is a dark floor with telegraphs that always glow, and a clean Normal kill takes about 6 minutes.

The arena is a long burial hall (a 1200 × 880 rectangle). Worn flagstones and grave slabs, a faded runner up to the dais, his empty throne against the top wall under a tall window, pillars and sarcophagi down both sides, candles along the walls and grave-green braziers in the corners. The moon sinks in the window through the whole fight; when it's gone, that's the enrage. Candles flicker, dust hangs in the air and mist creeps along the walls.

Stats:
- HP: 2.3M (Normal) / 3.0M (Hard).
- He walks after his tank like Grubnak and Skitterra.
- Enrage: "Moonset" at 9:00 (Normal) / 8:00 (Hard).

| Mechanic | What happens | Hard layer |
|---|---|---|
| **Royal Gaze** | He lifts his head and an eye opens over him. Under every hero a cone shows which way they face, red if they'd meet his eyes. Anyone facing him (within about 70°) when it lands takes a hit, is held in place for 2 s, and gets *Dread* for 20 s; caught again while Dreading hurts much more. Casting at him turns you toward him, so you stop and step away. | Lands at the same moment as an Echo Knight's replay |
| **Royal Doom** | A violet skull sigil over one player (never the tank), its ring burning down over 15 s; it kills when it runs out. Lanterns are set down around the hall (one more than there are doomed). The doomed walk into a lantern's light, or anyone picks one up by walking over it and carries it to them. A cure uses the lantern up. | Two players at once, 13 s |
| **Grave Cleave** | Tankbuster cone that cleaves, then the tank bleeds for 9 s. | Harder |
| **Barrow Knell** | Raidwide; the hall darkens and the toll rolls out in rings. | none |
| **Grave Marks** | Everyone spreads. | none |
| **His swings** | *Sceptre Sweep* (a wide cone in front; he holds still while it winds up), *Barrow Stomp* (a circle around him, cracks spreading through the stone) and *Crown of Graves* (everywhere except close to him; hands reach up out of the floor). | none |
| **Echo Knights** (65%) | Two ghost knights rise by the side walls, facing the middle. Each swing he makes is remembered by the next knight (it flashes on the knight). A few seconds later each knight replays its swing from where it stands, aimed at the middle, with a short warning (2.6 s): narrower cone, smaller circle, wider safe ring. The knights move to new spots every other cycle. | 1.8 s warning |
| **Barrow Bells** | Two bronze bells, each wanting two people (one each if fewer than four are alive). A missed bell dooms everyone, with a lantern for each. | none |
| **The Long Night** (30%) | The lanterns go out. The hall goes dark but for a little light around each hero and a wide pool around the last lantern, which someone carries. Telegraphs, heroes and the knights stay visible; he's a shape in the dark. The last lantern is now the only cure for Doom, and it isn't used up. Everything comes back shorter. The night lifts when he falls. | Doom on two |

**Timeline:** phase 1 (about 2 minutes, then loops): Knell, Sweep, Gaze, Cleave, Doom, a swing, Marks, a swing, Gaze, Cleave, Knell. Phase 2: two swings then their echoes, Cleave, Bells, Doom, Knell, and again with Gaze and Marks. Phase 3: Knell, a swing and its echo, Gaze, Doom, Bells, a swing, Marks, Gaze, Cleave.

**New engine pieces:** `FightSim.ticker()` (a per-tick hook for a boss script, used for the lanterns and Doom), and the `lant`, `doomed`, `cure`, `gazed`, `knights`, `kmem`, `kswing` and `night` messages. The host judges the Gaze from each player's facing, which already arrives with their position. The Long Night is a screen-sized dark layer with the lights cut out of it, drawn over the floor and under the telegraphs.

**Bots:** they turn their backs just before a Gaze lands. A doomed bot walks into the nearest light; a bot carrying a lantern takes it to whoever is doomed; when a person is doomed, the nearest free bot fetches a lantern for them; in the Long Night a bot (the healer if there is one) carries the last lantern. They go to whichever bell still needs people after counting the humans by the bell they're nearest. They remember what each knight saw and keep out of its replay before it shows.

**Bot test results:**
- **Normal, Bastion / Cleric / Ranger / Pyromancer:** cleared 8 of 8, in 5:40-5:58, no deaths.
- Other line-ups (Runeguard / Grovekeeper, Bloodreaver / Cleric, Bloodreaver / Grovekeeper, Bastion / Grovekeeper): cleared 11 of 11. Grave Cleave was lowered after it killed a Runeguard tank with its bleed.
- Line-ups with a Chronomancer healer: 0 of 2 (the same bot-healing gap as Volkar).
- One idle human plus three bots: cleared 2 of 3 at about 9:00. The idle hero misses every bell, so everyone gets doomed, and the bots still cured all 22 Dooms.
- **Hard:** bots reach phase 3 and wipe at 12-20%, at the enrage.
- Every Doom in every run was cured.
### Specializations (all 18 built)

Each class picks one of two specializations, or keeps the base kit. Rules:
- **A spec reshapes the kit, it doesn't replace it.** It swaps one or two abilities and gives the signature mechanic a new purpose, still on Q W E R D F + Space.
- **The role stays the same:** a tank spec is still a tank, so party building stays simple.
- **No lock-in:** switch freely on the hero page in town; the choice is saved per hero and sent to the group.
- **Balanced against the base class:** both specs' pro DPS stay within 5% of their class in `tools/simulate.js` (a check enforces it). A spec can aim off on purpose with `balance` (the Inquisitor aims for 112% of the Cleric's damage, paid for with less healing).
- **A new look:** each spec draws extra gear or effects on the hero (`SPEC_ART` in `heroes.js`); painted portraits and icons come from `docs/art/spec-icons.md`.
- **Bots play them too:** a bot fills its slot with the base kit or either spec, a third of the time each.
- **Earned, per hero:** a hero's specs are sealed until it clears the Hollow King (any difficulty). That opens one trial per spec, and passing a spec's trial unlocks it for that hero for good. See *Spec trials* below.

The hero page shows the base class and both specs as tabs. A spec shows what it specializes in, its passive, and every move it adds or changes (new moves say what they replace); changed keys get a gold mark. A sealed tab is dimmed with an outlined diamond (its tooltip says how it opens); a tab whose trial is open has a glowing blue diamond, and its page ends in a card with the trial's name, its first lore line and **Begin the trial**. The Choose button stays off for a spec that isn't unlocked, so you can read every spec before you earn it.

### Spec trials (all 18 built; design choices made together on 2026-10-19)

The user picked: **story vignettes**, **one per spec**, **built so the spec's trick is the obvious answer**, and **unlocked by that hero clearing the Hollow King on any difficulty**.

- **A memory of the Barrow.** Every trial is a short fight (about a minute) against the **Shade of the Hollow King**, drawn pale and cold, in his hall, with his telegraphs. It opens on two lines of lore over the countdown and ends on one more. No instructions anywhere: the spec page already explains the moves, and each fight is shaped so the new move is the natural answer.
- **Solo.** Only you go in (the trial lends you that spec for the fight), with the bots the story needs. Friends in your room stay in town. You start it from town, as host or alone.
- **Retry freely.** A wipe shows *The memory fades* with **Try again**; a clear shows *&lt;Spec&gt; unlocked*, records it, puts you in that spec, and sends you back to town. Trials drop no loot and don't count as boss clears.
- **Who must live:** you always; in trials about protecting others, your allies too.

| Spec | Trial | The story asks for |
|---|---|---|
| Sentinel | The Gate | Battering rams: three heavy blows in a row on you, again and again. Brace's third charge and the party Perfect Block. |
| Crusader | Dawn Over the Barrow | Alone; quick, readable strikes at you, each a chance to block and light up a Radiant Holy Edge. |
| Berserker | The Red Hour | Alone; the fight opens by taking 60% of your health, and there's no healer. Rampage at low health. |
| Hemomancer | The Blood Vow | No healer; knell after knell wears down your two allies, and they must live. Crimson Drain's party heal. |
| Spellwarden | The Warded Heir | The Shade keeps aiming a Royal Sentence past you at the heir (a mage), who must live. A Ward on an ally. |
| Runeblade | The Carved Oath | Alone, a duel: strikes and stomps, enough time to run the Rune Blade combo. |
| Aegis | The Golden Wall | The Executioner's Axe falls on the tank, slow and plain to see, harder than any heal can answer afterwards. Shields before the hit. |
| Inquisitor | Judgment | A full party hitting the Shade; your Smite's brand makes every blade count. |
| Lifebinder | Deep Roots | The Dead Wind: a knell every few seconds, steady as breathing. Healing over time on everyone. |
| Moonwell | The Silver Pool | Everyone gathers under the bells, then the knell follows right after. A pool where they stand. |
| Echoist | The Second Voice | Every knell rings twice, three seconds apart. Heals that repeat. |
| Accelerant | The Quickened Hour | A party racing the enrage. Haste for everyone. |
| Sharpshooter | The Still Eye | His attacks stay close to him; the far end of the hall stays quiet. Standing still. |
| Venomstrike | The Green Death | A long fight against a champion with lots of health. Acid that ramps. |
| Bladedancer | The Whirling Edge | He never stops turning, so he has no back for long. Positionals that always land. |
| Nightstalker | The Knife Behind | His Royal Gaze, again and again: look away, stay behind. Backstab. |
| Cataclysm | The Falling Star | He holds the middle of the hall and barely moves. Meteor. |
| Sigilmancer | The Burning Circle | His sceptre sweeps one side of the hall, then the other; straight behind him never burns. A circle that stays safe. |

**How it's built:** `client/js/arena/trials.js` holds `TRIALS` (name, lore, outro, allies, target length, enrage, regen, who must live, script) and `trialDef(specId)`, which turns one into a boss definition. It keeps the Hollow King's id, so his hall, art and telegraphs all apply, and sizes the Shade's health for the party. The raid id is `trial:<spec>`; `main.js` (`startTrial`, `raidDef`) runs it as a one-human raid, skips loot and clear records, and calls `Save.recordTrial`. `save.js` adds `trialsOpen`, `trialDone`, `recordTrial` and `specState` ('locked', 'trial' or 'open'); `Save.spec` reads a spec that isn't unlocked as none.

**Tested:** a bot playing the spec passes every trial (`tools/check.js` runs all 18). For the four where the base kit could plausibly scrape through, the base kit was also run and fails: Sentinel, Hemomancer and Spellwarden 0 of 4, Aegis 0 of 5 (the spec cleared them all). In the browser: sealed, trial and open tabs and their tooltips, the trial card, starting a trial from it, the lore over the countdown, the pale Shade, a wipe and **Try again**, a clear unlocking and equipping the spec with no loot and no boss clear recorded, and leaving mid-trial handing back the previous spec. Not yet played by a human, and the other 14 trials are vignettes a base kit can also pass with care.

**Tanks (design choices made together on 2026-10-19):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Bastion · Sentinel** (The Wall) | Protecting the party | A Perfect Block also gives the party 10% less damage for 4 s; Brace has three charges. Holy Edge becomes **Shield Bash**: spend 50 Resolve, 30% less damage for 4 s, a small heal. |
| **Bastion · Crusader** (The Dawn Blade) | Damage through blocking | A Perfect Block makes the next Holy Edge **Radiant** (50% stronger, a beam). Oath of Valor lasts 20 s, Judgment gives 35 Resolve. Bulwark becomes **Zealous Guard**: 30% less damage, Brace refills, next Holy Edge Radiant. |
| **Bloodreaver · Berserker** (The Red Storm) | Risky damage | Blood becomes **Rage**. Crimson Drain becomes **Rampage**: up to 70% harder at low HP, heals for 20% of recent damage. Frenzy also makes you 10% faster. |
| **Bloodreaver · Hemomancer** (The Blood Mage) | Helping the healer | Crimson Drain's healing also heals the whole party at a quarter strength. Bloodletting becomes **Blood Lance**, thrown from range. |
| **Runeguard · Spellwarden** (The Warding Circle) | Shielding allies | Runic Ward goes on an ally (yourself if none is picked), explodes from them, and refunds its Rune once it absorbed half. |
| **Runeguard · Runeblade** (The Carved Edge) | Melee damage | Rune Strike becomes the **Rune Blade** combo (Cut > Carve), Glyph Burst becomes **Rune Cleave** (leaves a burning rune for 12 s), Mirror Aegis has two charges, Wards a little smaller. |

**Healers (design choices made together on 2026-10-19):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Cleric · Aegis** (The Golden Wall) | Shields | Dawn Petal leaves a shield instead of a regen; a Petal shield that soaks most of its strength gives the Petal back (once every 10 s). Benediction has two charges. Mend becomes **Divine Barrier**: a 1.5 s cast, a big golden dome on one ally for 12 s. |
| **Cleric · Inquisitor** (The Burning Verdict) | Damage | Smite brands the boss: allies' next 2 hits on it burst for extra damage, counted as the Inquisitor's (4 after Dawnstar). Petals regrow every 20 s. Benediction becomes **Condemn**: a holy-fire lance that brands for 4 and makes the next Smite instant. |
| **Grovekeeper · Lifebinder** (The Deep Roots) | Healing over time | Rejuvenate becomes **Lifebind**: it also takes root on the most hurt other ally. Bloom heals 30% more. |
| **Grovekeeper · Moonwell** (The Silver Pool) | Placed healing | Wild Growth becomes **Moonwell**: a 12 s pool of moonlight at an ally's feet that heals everyone standing in it every 1.5 s (45 s cooldown). Bots step into it. |
| **Chronomancer · Echoist** (The Second Voice) | Delayed healing | Temporal Bolt and Recall repeat 3 s later at half strength. Accelerando becomes **Echo Chamber**: the same party haste, and echoes are full strength while it lasts. |
| **Chronomancer · Accelerant** (The Quickened Hour) | Party support | Haste drains Flux 40% slower and its Bolts heal the party more; Accelerando gives 15% for 20 s; Slow heals the link a little less. |

**DPS (design choices made together on 2026-10-19; the Sigilmancer was the user's own idea, a Black Mage-style circle):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Ranger · Sharpshooter** (The Still Eye) | Precision | Each second standing still adds Steady Aim (up to 5, +4% damage each); moving loses it. Piercing Arrow becomes **Aimed Shot**: a 2 s cast, a heavy hit (instant with Keen Eye). |
| **Ranger · Venomstrike** (The Green Death) | Damage that ramps | Quick Shot stacks Acid on the target (up to 8, a growing burn). Piercing Arrow becomes **Caustic Arrow**, which bursts every stack. |
| **Shadowblade · Bladedancer** (The Whirling Edge) | Steady damage from anywhere | Positionals always land. Shadowstep becomes **Blade Fury**, a spinning flurry (+1 combo point, two charges). |
| **Shadowblade · Nightstalker** (The Knife Behind) | Burst from behind | Eviscerate becomes **Backstab**: much stronger from behind, 25% weaker from the front. Shadow Dance lasts 14 s. |
| **Pyromancer · Cataclysm** (The Falling Star) | Huge single hits | Pyroblast becomes **Meteor**: lands 1.5 s after the cast, hits harder, leaves a burning crater. Hot Streak still makes it instant. |
| **Pyromancer · Sigilmancer** (The Burning Circle) | Positioning | Combustion becomes **Ember Circle**: a 20 s circle at your feet (45 s cooldown). Inside it you cast 20% faster and deal 15% more damage; outside, nothing. Bots stay in theirs. |

New support: kits can ask where their hero stands (`env.pos`, for the Sigilmancer's circle); heals can target `'lowest'` (the most hurt ally, optionally not a given one), healing pools on the floor (`pool` events, ticked in `fight.js`), and the Inquisitor's brand (`brand` events; `burstBrand` credits each burst to the Inquisitor).

**Chronomancer healing raised (2026-10-19):** with the healer specs in the bot line-ups, the base Chronomancer could not heal Volkar (0 of 4 with any tank). Its damage is unchanged, but Bolt now heals the link for 120% (was 85%) and the party for 50% in Haste (was 30%), Recall heals 1,400 (was 1,200), and Haste drains Flux at 4 a second (was 5). A bug where looking up Bolt's cast time spent the free Surge Bolt is fixed. Bots also keep the Chronomancer's link on the tank. Volkar with a Chronomancer now clears 4 of 6 (Bastion), 5 of 6 (Echoist), 6 of 6 (Accelerant); a Runeguard tank with a Chronomancer is still the weakest pairing there (1 of 6), since nothing shields the Runeguard before a buster.

**How it's built:** `client/js/combat/specs.js` holds `SPECS` and `kitFor(classId, specId)`, which lays a spec's changes over the base kit (cached). A replacement ability names the one it replaces (`replaces`), keeps its slot, borrows its icon until a painted one arrives, and honours that ability's gear enhancements. `CombatActor` builds from `kitFor`; the spec rides on the `cls` message and the raid roster, so every client draws the right look and cast effects.

**Tested:** pro DPS within 1% of the base class for all six tank specs and within 3% for the healers (the Inquisitor at its 112%); bot parties with each tank spec cleared Volkar and the Hollow King on Normal 24 of 24; each healer spec cleared the Hollow King 4 of 4, and in those raids every new mechanic fired (pools healed ~2 players a tick, ~200 brand bursts a fight, 12 Petals refunded, 135 echoes). In the browser: the picker, switching spec, the HUD, a Spellwarden Ward on an ally, Condemn's brand and credit, and a Moonwell pool with a bot stepping in.
## 5. What's built (code map)

| Area | Files |
|---|---|
| Combat engine (GCD, oGCD, queue, casts, DoTs, procs, stats) | `client/js/combat/engine.js` |
| The nine kits | `client/js/combat/kits.js` |
| Specializations (kit changes, per-hero choice) | `client/js/combat/specs.js` |
| Kit-to-world bridge (player and bots) | `client/js/combat/actor.js` |
| Unique class gauges | `client/js/combat/gauges.js` |
| Ability bar, cast bar, buffs | `client/js/combat/hud.js` |
| Telegraph shapes (hit tests and drawing), and each boss's room shape (`ARENA`) | `client/js/arena/shapes.js` |
| Smooth motion for networked units (entity interpolation) | `client/js/interp.js` |
| Host fight sim (HP, threat, mechanics, deaths, Rewind history, tethers, adds, slow zones) | `client/js/arena/fight.js` |
| Boss scripts | `client/js/arena/bosses/grubnak.js`, `skitterra.js`, `volkar.js`, `hollowking.js` |
| Bots | `client/js/arena/bots.js`, `client/js/arena/raid-host.js` |
| Arena drawing (textured kitchen and web-cave floors, ambient life, telegraphs, puddles, hitbox ring, tethers, sticky web, lit legs) | `client/js/arena/arena-view.js` |
| Per-boss mechanic tells (cleaver, cloches, plates, spice jars, stove coils, meatballs, silk reel, leg strikes, venom beads, fog) | `client/js/arena/boss-tells.js` |
| Boss and add art (Skitterra's props, the husk, spiderlings) | `client/js/bosses.js` |
| Boss plate and cast bar, party frames (HoTs, aggro, missing health, cast progress), results screen, training meter | `client/js/raid-ui.js` |
| Ability visuals: particle/effect engine, a recipe per ability, boss impacts and wind-ups | `client/js/vfx.js`, `client/js/ability-vfx.js`, `client/js/boss-vfx.js`, `client/js/fx.js` |
| Hero select copy (passives, combos) | `client/js/hero-guide.js` |
| In-game tooltips (no browser `title=` popups) | `client/js/ui-tip.js` |
| Items, gear stats, enhancements, loot rolls | `client/js/items.js` |
| Inventory screen | `client/js/inventory.js` |
| The versioned save (name, bag and gear, each hero's boss clears, settings), with step-by-step upgrades for old saves and a backup before each upgrade | `client/js/save.js` |
| Debug overlay (F3): frame rate, worst frame, ping to the host, messages per second, scene, arena, party, boss update age | `client/js/debug-overlay.js` |
| Scenes, input, hero select, tab targeting, ally targeting, raid start/retry/leave, loot | `client/js/main.js` |
| WebRTC: arena coordinates, combat events, solo mode | `client/js/net.js` |
| Hosting: every push to `main` publishes `client/` to https://ceddikers.github.io/emberfall/ | `.github/workflows/pages.yml` |
| Rotation sim, headless bot raid | `tools/simulate.js`, `tools/bot-raid.js` |

**Hero select:** opens right after joining (and from the barkeep, a hero on the deck, or your hero name top-left).
- The altar grid: nine heroes in three role columns.
- The detail page: back arrow, flavor text, an animated portrait, the hero's passive (their signature mechanic), the Q W E R D F Space icons with tooltips, and Tips & Combos (first steps, mastery, combos shown as icon chains).
- Painted front-facing portraits are in `client/portraits/<id>.png`, cut from `docs/art/hero-portraits-sheet.jpg` (briefs in `docs/art/hero-portraits.md`).
  - Each is a square head-and-shoulders bust (440×440), cut from the 3×3 bust sheet; the older full-figure sheet is kept as `docs/art/hero-portraits-fullbody-sheet.jpg`.
  - The detail page and inventory show it in a 224 px frame with an accent-colored top edge; grid cards zoom slightly toward the face.
  - The bust briefs are in `docs/art/hero-portraits.md`.
  - A missing portrait falls back to the sprite.

**Arena camera and scale:**
- The camera fits about 960 world units of height on screen, so the kitchen's full height nearly fits. It leans toward you, separately for width and height of the room's shape, far enough past a wall to show the scenery there (the stove line, shelves, pillars). It never lets you sit under the ability bar or the boss plate.
- Wide screens still show the full width.
- Heroes are drawn at 1.85× in the arena (1.5× in town) so they read well next to the boss. Hitboxes are unchanged: what counts is still the point at your feet.

**Battle UI:**
- **Boss plate:** name, mode and timer. The HP bar has quarter ticks and a pale trail that drains behind each chunk of damage. The cast bar below it flashes when the cast goes off.
  - **What's on the boss**, as small icons under the HP bar with seconds left and an in-game tooltip: Hunter's Mark (Vulnerability), a damage-up (Grubnak's Gorge), a taunt's fixation (the tank's taunt icon), the Inquisitor's Judgment brand with its charges (dimmed if it isn't yours), the last 60 s before the hard enrage, and your own damage over time (Poison, Thorns, Acid with its stacks, the Runeblade's burning rune, the Pyromancer's burns). The host sends its part in the boss update (`fb.bs`: `[kind, seconds, value, who]`); your DoTs come from your own kit.
  - **Upcoming moves** under the cast bar: the boss's next 2–3 moves with countdowns, from the host's `bnext` feed (`{ t: 'bnext', l: [[name, secondsUntil], ...]}`, about once a second). It counts down between updates and hides when there's no feed or it's more than 3 s old. (Testing aid: `?bnext-demo` in the address feeds the local tab a made-up list.)
- **Threat meter** (under the party frames, raid only): everyone alive, highest first, as a share of the top threat (the tank at 100%), with a thin bar. Your row is lit; a non-tank at 90% or more of the tank's threat turns amber. It reads the threat the host already sends in the party update.
- **Party frames** (top left, in role order, with keys 1–4):
  - role mark, name, an eye on whoever the boss is attacking, and their class;
  - a tall HP bar that turns amber below 60% and red below 35%, with a pulsing edge when low;
  - a pale trail on the bar showing a hit that just landed, plus a red flash on the frame;
  - shields drawn as hatched white after the health;
  - HoTs as small icons of the ability that cast them, with seconds left (yours bright, other healers' dimmed);
  - mitigation, Damage Down, Vulnerability and boss debuffs as small line-icon chips with tooltips.
- **Healers:** frames show the *missing* health (−420) instead of current health.
  - A thin gold line under a frame fills with your cast toward them.
  - The frame where your next heal lands gets a faint green edge; a locked ally gets a bright one.
- **In the world:**
  - A locked heal target gets green corner brackets and a chevron over their head. The soft target (nearest the cursor) gets a dashed ring.
  - While you cast a heal, a thread of light runs from you to them.
  - Over-head HP bars also show shields.
- **Heal targeting:** what a heal lands on, in order:
  1. Shift + the key → yourself (it holds through the input queue).
  2. The party frame under the mouse.
  3. Your locked ally.
  4. The ally nearest the cursor.
  5. Yourself.
  - Lock an ally by clicking their frame or them in the world, or with 1–4. Click a locked frame again, or press Esc, to let go.
  - Heals have no range limit.
- **Multiplayer:** the host's party update now carries HoTs, and every client applies hits to the frames as soon as they land.

**Targeting:** Tab / Shift+Tab cycle enemies nearest-first (boss and adds in a raid, dummies in town). Tab never moves browser focus once in the game, and clicking the world takes focus back from any button. The locked target gets a rotating reticle and a target frame. Targets are local; damage events name the target and the host applies them.

**Numbers:** the whole game runs on a small-number scale (`ENGINE.NUM_SCALE` / `FIGHT.NUM_SCALE` = 0.05). Normal hits are around 80-200, a buffed big crit is about 1,000, a tank has about 1,600 HP, and Grubnak about 62,500. Boss files stay written in the original big numbers; the fight sim scales them. The balance tools run in the original units (only ratios matter).

**Gear:** weapon, armor and two accessories, per hero; the bag is shared by every hero you play, saved in the browser.
- Stats: HP, Physical, Magical (each class reads one), Defense, Haste, Critical. No MP (every class already has its own resource) and no movement speed (mechanics are timed for one run speed).
- Gear is modest on purpose: best-in-slot is roughly +15-20% output, and everything is capped.
- Icons are drawn in code until painted ones arrive: briefs and the sheet layout are in `docs/art/item-icons.md`. Painted PNGs go in `client/items/<key>.png` and are listed in `client/items/manifest.json`; the game adds the rarity frame.
- Class drops can carry an **enhancement** that changes one ability (45 in total, five per class, e.g. Holy Edge strikes twice, Glyph Burst refunds a Rune). Enhanced items are one rarity higher; the enhanced ability gets an orange marker on the bar and a line in its tooltip.
- Tiers: Recruit, Grubnak, Skitterra, Volkar (Epic, item level 30). Volkar's class weapons put the storm into each class's big cooldown: Bulwark shields the party, Frenzy gives 30 Blood, Runic Overload gives 2 Runes, Barrage lights Keen Eye, Shadow Dance gives 2 combo points, Combustion refills Fire Blast, Prayer Circle cuts 15%, Wild Growth gives 25 Bloom, Accelerando heals the party. Volkar also drops a maul, a scepter, scale mail and three accessories for anyone.
- The Hollow King's tier (Epic, item level 40) puts the enhancement on the class armour: Bulwark cuts 50%, Bloodletting heals 5%, Runic Ward lasts 12 s, Rapid Fire hits 15% harder, True North lasts 8 s, Combustion lasts 13 s, Prayer Circle's regen is 50% stronger, Thornlash grows 5 Bloom, Rewind reaches back 6 s. He also drops a greatsword, a sceptre, a burial shroud, and a signet, bell and lantern charm for anyone.
- **Party bonuses:** when 2, 3 or 4 people in the group each wear at least one item from the same boss, the whole party (bots too) gets that boss's bonus for the fight. Recruit gear has none, and someone wearing gear from two bosses counts toward both. It rewards playing together rather than solo grinding, and stays small like the rest of gear (`PARTY_BONUS` in `client/js/items.js`).

  | Bonus | 2 wearing | 3 wearing | 4 wearing |
  |---|---|---|---|
  | **Kitchen Crew** (Grubnak) | +3% max HP | +3% max HP, +2% damage | +5% max HP, +3% damage |
  | **Brood Bond** (Skitterra) | +2% crit | +2% crit, +2% haste | +3% crit, +3% haste |
  | **Stormbound** (Volkar) | +2% haste | +3% max HP, +2% haste | +4% max HP, +3% haste |
  | **Court of the Barrow** (the Hollow King) | +2% damage | +2% damage, +2% crit | +3% damage, +3% crit |

  - Each player tells the host which bosses their equipped gear comes from (cleaned on the host). The host counts the humans when the raid starts and sends the result with the raid. Gear is locked inside a raid, so the bonus is fixed for the fight.
  - Damage, crit and haste go into everyone's party modifiers; max HP is applied by the host.
  - Shown as a gold chip in the buff row (e.g. "Kitchen Crew 3/4", with a tooltip). Every item's tooltip lists its boss's three tiers.
  - Bots don't wear gear, so solo with bots never triggers a bonus.
- Multiplayer: your damage/healing/haste/crit bonuses and enhancements run in your own kit and reach the host as normal combat events. HP and Defense are applied by the host, which caps every player's totals. Loot is rolled by the host on a clear and announced to everyone.

**In town:**
- Pick a hero on the hero select screen.
- Train on the dummies; a DPS meter appears and gives a session summary.
- The red Sparring Dummy swings every 2.8 s like a raid boss, so tanks can practice Perfect Blocks, Ward breaks, Mirror reflects and Crimson Drain timing.
- Step into the portal to open the raid board: pick Normal or Hard and whether bots fill empty slots.

**After a fight:** a results screen shows everyone's DPS, HPS, damage taken, avoidable hits and deaths, plus a personal report:
- GCD uptime, positional rate, overcap, wasted procs and cancelled casts;
- damage dealt inside raid buffs;
- class stats such as Perfect Blocks, Ward breaks and overheats.

The host can retry or take everyone back to town.

**Solo play:** "Play solo with bots" on the join screen needs no internet. You host a private room and bots fill the party.

## 6. Testing status

**One command checks everything automated:** `npm run check` (`tools/check.js`, about 5 s). It runs:
- a parse of every script;
- checks that classes, items and enhancements line up;
- the party bonus math, arena clamping and network smoothing;
- class DPS against `tools/check-baseline.json` (±8%);
- bot clears of all four bosses on Normal.

After an intended balance change, record the new numbers with `node tools/check.js --update-baseline`.

**Tested:**
- Kit balance and the newbie/pro gaps, in the rotation sim.
- Grubnak Normal and Hard with all-bot parties, headless (re-run after the Skitterra engine changes; unchanged).
- In the browser:
  - town training: DPS meter, damage numbers, gauges, glows;
  - the tavern panel and the raid board;
  - a solo raid: arena, boss, bots, telegraphs, puddles, party frames, cast bar;
  - the results screen and return to town.
- **Co-op, two browser tabs on one machine over PeerJS:**
  - the friend joined by code, picked a class, and was pulled into the raid;
  - they saw the boss, party HP, bots and telegraphs from the host;
  - their damage and heals reached the host's fight;
  - the host ending the raid sent both back to town.
- **Queen Skitterra:**
  - Normal and Hard with all-bot parties, headless (results in section 4).
  - Solo in the browser, picking her on the raid board and pressing Start, on Normal and Hard, with no console errors. Seen working:
    - the web-cave floor;
    - Lunge cones and lit legs;
    - Normal's white tether, and Hard's green and red tethers;
    - venom pools;
    - eggs and spiderlings, with HP bars;
    - click-targeting a spiderling and killing it with my own Ranger;
    - the Hard brood beam;
    - phase 2's sticky ring;
    - Molt's husk and two overlapping Lunges.
  - Co-op, two tabs on one machine over PeerJS: the friend's client saw the synced spiderlings and picked one as its target. Their Fire Blast arrived at the host as add damage (tagged with the add's id, reduced by raise weakness).

- **Presentation, gear and numbers (this round), in the browser:**
  - ability VFX in town; Grubnak and Skitterra impacts, wind-ups and adds in a solo raid, with no console errors;
  - hero select (grid, detail page, tooltips), tab targeting with the reticle and target frame, inventory equip and enhancement tooltips;
  - the 20x number scale: bot raids still clear Normal (6/6 Grubnak, 4/4 Skitterra) and wipe Hard at 17-36%, as before;
  - two tabs over PeerJS: the friend's gear reached the host (HP and Defense in the host's sim), casts reached the friend, and both saw the same loot roll.

- **Boss tells, Rolling Meatballs and Silk Reel:**
  - bot raids on Normal: 6/6 Grubnak and 6/6 Skitterra after the new mechanics (bots dodge meatball lanes and dash out of reels);
  - in the browser, with no console errors: Grubnak's plates, cloches, steak, spice jars, cleaver, whisk, stove coils, lid shadow, skid marks and meatballs; Skitterra's leg strikes, venom beads, fog and silk thread;
  - a reeled player is dragged in at the right speed, a dash snaps the thread (the host confirms), and reaching her gives the bite;
  - two tabs over PeerJS: meatballs and reels showed up on the friend's client, and the friend's dash snapped their reel on the host.

- **Battle UI and healer targeting**, in the browser as a Cleric, with no console errors:
  - frame lock by click, unlock by clicking again;
  - Shift+W self-cast while another ally stays locked;
  - the cast line on the frame and the thread of light in the world;
  - missing-health numbers, the trail and hit flash, HoT icons, the aggro eye;
  - the layout at 1280×760.
  - Two tabs over PeerJS: the joined healer's frames showed its own missing health, the hit flash, the host's HoT and the aggro eye. Bots still clear Normal (3/3 each boss).

- **Auto-attacks and animations:**
  - autos fire every 2.6 s after a skill for melee and casters, in town and in raids;
  - new attack frames, auto swings and the channel visuals for every caster, in the browser with no console errors;
  - bot raids still clear Normal (4/4 each boss);
  - two tabs over PeerJS: the joined player saw the bots' autos and everyone's channels, and the host received the joined player's autos and channel.

- **Threat and taunts (October rework), headless only:**
  - the careless-tank sweep in "Threat and taunt" above, on Grubnak and Volkar with bot parties;
  - bot raids still clear Normal (all `npm run check` line-ups; 10-run samples: Grubnak, Volkar and the Hollow King 10/10, Skitterra 7/10, the same as before the change);
  - every tank and tank spec gets its taunt and its gauge tie-in.

**Not yet tested:**
- In the browser: the taunt on T (bar slot, tooltip, cooldown sweep, the three looks), the threat meter, the boss status icons and their tooltips, the upcoming-moves row (with `?bnext-demo` until the bosses send `bnext`), and the target frame moving down under a taller boss plate.
- A human tank taunting over real latency (the host applies it about one round trip after the press; your own look plays at once).
- The Hollow King played by a person, on Normal or Hard (tested headless with bots, and in the browser solo with bots: hall, Gaze cones, lanterns, knights and replays, bells, the Long Night, the Doom sigil, loot).
- The Hollow King over real latency. The host judges the Gaze from the facing it last heard (positions arrive about 12 times a second), so turning away at the very last moment can count a little late on a slow connection. Lantern pickups and cures are judged on the host from positions too.
- The Long Night's dark layer on a slow machine (it's one extra screen-sized draw each frame).
- Auto-attacks over real latency: each auto is a small combat event every 2.6 s per player, plus one visual message.
- The new party frames with a full human party over real latency (HoT timers and health refresh every 0.2 s; hits show at once).
- Rolling Meatballs and Silk Reel over real latency. Meatballs are drawn from each client's own clock, so a laggy client sees them slightly late; the host is lenient (it checks against the position the client reports). A reel on a laggy client starts pulling a little after the host's, and a snap sent too early is ignored.
- Hard mode for both new mechanics, headless or by hand.
- Gear, enhancements and loot on real separate machines, and by hand over a full fight.
- Enhancement balance: each one is small, but none have been run through `tools/simulate.js` yet.
- Skitterra on real separate machines. Every new message goes through the same host broadcast as Grubnak's, but nothing has been tried over real latency. Things to watch:
  - adds update about 10 times a second, so a fast-moving enraged spiderling may look jumpy;
  - `slowed` and `rooted` reach clients through the party update (every 0.2 s), so a root can start up to about 0.2 s late on a remote client.
- Skitterra by hand with a full human party. The two-tab test drove the friend's buttons by script, because a hidden browser pane doesn't run animation frames. Not yet tried by a person:
  - a human tank getting rooted by Silk Wrap during a Lunge;
  - human tether pairs;
  - human DPS splitting the brood.
- Damage over time follows your current target: a DoT applied to the boss ticks on a spiderling once you switch to it. It's simple and readable, but not FF14-accurate.
- Two or more real machines over the internet: latency, NAT traversal, a friend on another network.
- A full fight played by hand with real keyboard input (the browser preview throttles frames, so I tested by script).
- A human tank holding threat against human DPS for a whole fight.
- Every class's visuals in the arena (all nine kits' effects play, but I only spot-checked a few in a raid).
