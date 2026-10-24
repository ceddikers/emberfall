# Emberfall: Design Document

A four-player co-op raid game (tank, two DPS, healer) in the browser. You meet in a town, pick a hero, and step through a portal into an FF14-style boss fight: the challenge is reading the boss's attacks, moving as a team, and playing your class well under pressure.

This document describes the game as it is now: the combat rules, the 23 classes, the 8 bosses, progression, networking, the UI, the code map and how it is tested. Dated rework notes, old tuning experiments, superseded designs and the old per-class, per-boss and per-talent tables are in `docs/plans/history/design-history.md`. The research behind the design is in `docs/research/`:
- `ff14-job-design.md`: where skill expression comes from in FF14 jobs.
- `class-design-beyond-ff14.md`: WoW, Lost Ark, GW2, Dota and design theory.
- `ff14-raid-boss-design.md`: mechanic vocabulary, timelines, Normal vs Savage.

Plans for individual pieces of work live in `docs/plans/` (the boss plans, the new-class plans, the Reaper rework, the PvP arena, the town and story notes).

---

## 1. Philosophy

### Easy to learn, hard to master

1. **The floor is about understanding, not button count** (Bushnell's Law, Rosewater's "lenticular design").
   - Every class has one main button: a combo on a single key, or a filler cast.
   - Buttons **glow** when they're a good press. Mashing the glowing buttons is a complete, working rotation, and a new player is never told "this is only good if...".
2. **The gap comes from the layer above the filler.** An assistant that presses one button loses only a little damage. Experts pull ahead through weaving oGCDs, manufacturing procs instead of waiting for them, pooling resources for the party's burst window, pre-positioning for damage they know is coming, keeping the GCD rolling while they dodge, and never overcapping. None of that raises the floor; it is there to discover. The target is that sloppy play keeps about 70% of an expert's damage.
3. **Each class has one signature skill check that no other class has.** Perfect Block, Crimson Drain timing, Ward breaks, Keen Eye, positionals, Heat and Hot Streak, Petal economy, planting HoTs early, stance juggling, Thermal Shock, Passing Strikes, eating attacks, the Ledger. Players should be able to say "I main X because I love doing Y."
4. **Every class gauge is a unique shape, never a plain bar.** Bastion's is a shield that fills, Bloodreaver's a heart, Ranger's a quiver, Shadowblade's a moon with five phases, Pyromancer's a crucible, Chronomancer's an hourglass, and so on for all 23 (`client/js/combat/gauges.js`). Hovering a gauge shows its live value and what fills and spends it (`GAUGE_TIPS` in `client/js/combat/hud.js`).

Pitfalls avoided: no uncontrollable randomness (procs are steerable), no single cooldown that holds half the damage, no abilities that make a newbie wait, no trap choices between overlapping buttons.

### Every fight is one idea

A boss is not a list of attacks; it is one idea the player learns and then reads. Grubnak's is "where do I stand?", Skitterra's "what do I break?", the Hollow King's "what did I just see?". The rules that follow from that:

- **A fight is an authored, learnable choreography.** One non-looping script of 8 to 10 minutes, the same order on every pull, ending in one named enrage with about a minute of slack (about 45 s on Hard). Anything that varies (a side, a tool) is read from a tell. Hard shuffles its dances per pull, so a Hard fight is read, not memorised.
- **Telegraphs are never hidden, on any difficulty.** Red is damage, blue is a stack or soak, and safe spots are never painted. Hard adds layers and new moves, not hidden tells.
- **Tells are things in the world, not coloured shapes.** Each mechanic is drawn as an object that belongs to its boss, and the danger area still matches the object exactly. The boss's pose and prop are an extra clue, never the only one.
- **Every boss gets at least one mechanic that isn't a floor shape** (a moving hazard, a pull, a tether, an add to break), so fights feel different and are not just reskinned.
- **No text tells you what to do, but thinking is welcome.** Cast bars show the attack's name; nothing poses a puzzle in words. Pairing, ordering, soaking, passing, baiting, cover, reading what the room will do next and stored mechanics that replay are all good, as long as they are solved by moving through what the floor and the boss show.
- **Mechanics must feel natural.** Targets are random where a fight would pick someone (the Grubnak soak marker is the model), and moves are aimed by where players stand, not by clock hacks or filler casts.
- **Tank and healer have something to do.** Idle gaps stay under about 10 s.
- **The finale of a set is the hardest boss.** Set 2 uses HP-gate pushes and walls; set 1 does not.
- **Hard is gear-gated** (see Progression), and bots at mid gear should clear it about 45 to 60% of the time.

**Finding a fight's idea: questions to ask.** The Hollow King is the fight players liked most: fair and hard on both difficulties, and every part of it belongs. These questions look for that quality in a new fight. They are a guideline, not a rule: a fight can answer some loosely, leave one open, or break one on purpose if that makes it better. Write the answers under the boss's own heading when it is designed, and never borrow another boss's answer to question 3.

1. What is happening in this room? (the premise, as a story a player could tell after one pull)
2. What question does the fight keep asking the player?
3. What is the rule a player learns, the pattern that explains moves they haven't seen yet?
4. How does the fight warn before it tests, and how does that warning belong to the premise?
5. What does each act add, and what is each chapter called?
6. How does it end, and how does the ending show the idea most clearly?
7. What does Hard change?
8. Where does luck come in, and how can a player read it?
9. What do the tank and the healer feel?
10. What is this fight's own: what does it do that no other fight in the game does?
11. What will players talk about afterwards?

*The Hollow King's answers:* a trial in the court of the dead; "What did I just see?"; he calls (a swing, a Gaze, a decree) and the court answers a fixed beat later (knights replay it, coffins stir, bells toll); the warning is the call itself (a knight flashes the swing it remembers, the Charge Sheet's banners, the next Doom's sigil six seconds ahead); five sessions from The Summons to The Long Night; it ends in the dark with one lantern passing Doom from player to player; Hard overlaps the calls and answers more; luck (Doom, Marks, the gathering dead) is always called before it lands; the tank decides where his swings point, the healer gets the Tithe heal check and the lantern; his own idea is stored swings that come back from somewhere else.

---

## 2. Combat rules

| Rule | Value |
|---|---|
| Global cooldown (GCD) | 2.5 s, shortened by haste |
| Input queue | presses up to 0.5 s early fire the instant they're ready |
| oGCD animation lock | 0.6 s, so 1 to 2 oGCDs fit between GCDs; more "clips" (delays) the next GCD |
| Casting | moving cancels a cast, except in its last 0.5 s (slidecasting) |
| DoTs | refreshing keeps up to 30% of the remaining duration (pandemic) |
| Burst cycle | every class's big buff is on a 60 s timer, so parties line them up |
| Damage | 10% base crit for 1.5x. The whole game runs on a small-number scale (`NUM_SCALE` 0.05): a hit is potency x 0.5, a hero has about 1,050 HP and a tank 1,600. Boss files and the balance tools stay in the original big numbers |
| Auto-attacks | no button: while you're fighting (an enemy skill in the last 8 s) and an enemy is in range, your weapon strikes on its own every 2.6 s (faster with haste), never while casting. About 8 to 10% of a pro's damage for most classes |
| Avoidable hits | every avoidable hit leaves **Vulnerability** (+25% damage taken per stack, 15 s; all eight bosses set it to +50% a stack, so two hits is double damage). **Damage Down** (-10% damage dealt, 10 s) comes only from moves that opt in with `ddown`: three themed avoidable moves per boss (poison, chill, burns and the like), never a raidwide or a tankbuster |
| Party size | boss HP does not scale. Boss damage scales by headcount at the start of the fight (x0.6 / 0.8 / 0.92 / 1 for 1 to 4 players), which only matters when "Fill empty slots with bots" is off |

**Controls.** Right-click moves. Left-click interacts in town, or picks an ally in the arena. **Q W E R D F** are the six skills, **Space** a shared dash (2 charges, 12 s each), **T** the hero's Ultimate, **1-4** target party members, **`** locks the most hurt ally (again to cycle), **Tab** cycles enemies, **G** is the Limit Break, **H** asks for a raise, **V** sets focus, **I** is the inventory, **N** talents, **J** the journal, **L** the logbook, **M** the damage meter, **K** options. Every action is in the remap list in `client/js/keybinds.js`; new hotkeys must be added there. Middle-click pings, and Alt + drag opens the callout wheel (`pings.js`).

**Aggro and taunt** (host side, `fight.js`):
- **The boss follows a living tank by taunt alone.** There is no boss threat and no threat meter. He is on the tank who taunted last, or by default the tank he is on, for as long as that tank lives. If that tank dies he goes to the other living tank and stays there (a raised tank does not take him back). With every tank down he goes for the nearest player, and the first tank raised takes him back. His autos, facing and tankbusters follow `FightSim.tank()`.
- **Adds keep threat**: damage x 2.75 for tanks (x1 for others) x the event's own multiplier (clamped to 0-3), per add, fading 5% a second. An add goes for the most threat on it, or the nearest player until someone hits it. A non-tank's Ultimate hits carry half threat so a burst doesn't pull an add.
- **Taunt** is on every tank, carried by one of the tank's own buttons (`TAUNT_CARRY` in `kits.js`; a spec's or talent's replacement of that button carries it too). Pressing the carrier taunts only when the taunt is off its 20 s cooldown and the enemy you face is on someone else. Range 500. On the boss it takes him for good (until you fall or the other tank taunts); on an add it lifts your threat to 10% above the top and fixes it on you for 6 s. Each tank's taunt feeds its own gauge. The host checks the cooldown. Bot tanks taunt back after a moment's reaction.

**Ally targeting** (healers), in priority order: Shift + the heal key (yourself); the party frame under the mouse, then an ally under the mouse in the world (mouseover is a setting, on by default); the ally you locked; for a tank, yourself; the ally nearest the cursor; yourself. A green dashed ring shows who the heal will land on.

**Damage order** (`damagePlayer` in `fight.js`): Vulnerability and Defense, then every mitigation (Perfect Block, Read, reflects, cooldowns), then the class hooks (the Gorgemaw's jaw cuts the hit to a quarter, then the Ledger takes its share), then shields, then HP. Thread and Tapestry splits happen first, on the raw hit, and each share then runs through its own taker's full order. Bills that come due, enrage, falls and self-damage skip mitigation and splitting.

**Death, raises and Raise Sickness.** A cast raise takes 5 s; an instant raise (a talent, Rewind, an Alembist Mending Draught or Elixir) has no cast. A raised player deals and heals less for a while (`FIGHT.SICK`): a cast raise leaves 15% for 20 s, an instant raise 30% for 30 s, and every earlier death of the party this pull adds 5% and 5 s, up to 50% for 45 s. The Limit Break's raise leaves none. A raised player is untouchable for 2.5 s. The party's deaths show beside the Limit gauge, and its tooltip gives the next raise's cost. Only the Cleric, Grovekeeper, Chronomancer and Alembist raise from their bars; the Threadweaver, Tidecaller and Lanternkeeper have no raise.

**Limit Break (G).** A shared party gauge of three bars, filled by mechanics that resolve with no avoidable hits and by damage and heal checks met. Every whole bar is spent at once, and the effect follows the role of whoever presses it: a tank cuts party damage, a healer heals the party, a DPS strikes the boss. At three bars any role's Limit Break also raises the fallen.

**Recovering (Hard).** After a death the boss's hits land 30% lighter for 12 s so the party can raise; it can start again only 12 s after it ends. It shows on the HUD.

**Authority.** Each player runs their own kit locally and reports damage, heals and class events to the host. The host's fight sim owns boss HP, player HP, mechanics, deaths, adds, and the HP history Rewind needs. It clamps what clients send (a hit is at most 15,000, threat multipliers 0-3) and applies HP and Defense from gear, capped.

### Chosen-ally buffs

Healers can make one ally stronger (`ALLY_BUFFS` in `engine.js`): **Quickened** (Accelerando, Echo Chamber: +12% haste, 15 s), **Blessed** (Benediction: +10% damage, 10 s), **Wildheart** (Rebirth on the living: +10% damage, 12 s), **Galvanized** (Quickpowder's target: +10% damage, 10 s). The kit calls `k.allyBuff(target, id)`; a human's goes to the host as a `cev` (main.js accepts only a known id and resets its numbers from the table), a bot's straight in. `RaidHost` keeps it per player and broadcasts `abuff`. Every client keeps `raid.abuffs`: your own kit reads the buffs on you through `env.selfMods()`, bots through `RaidHost.allyMods(id)`, and the party frames show a chip. Bots spend them on the top damage dealer during the party's burst.

### Ultimates (T, slot 7)

Every class has one button on **T** that always feels great to press: a big payoff built up through that class's **own** loop (no shared meter). Each Ultimate is either **instant** (one big party moment; every tank and healer except the Lanternkeeper, and several damage classes) or a **window** of 7 to 10 s in which some bar buttons swap to empowered versions (Pyromancer, Shadowblade, Driftblade, Reaper, Houndmaster, Lanternkeeper).

Rules:
- Charge is 0 to 100 in `k.g.ult`, capped, never decays. The aim is about 90 s to fill for a pro and about 120 s for a newcomer. The kit loop supplies most of it, a passive trickle (`charge.rate`, only while fighting) the rest. A fall keeps half (`charge.keep`). No charge while a window is open. The press spends all of it.
- A short animation lock (`lock`) during which the caster takes `dr` less damage (30% for most) and can't be knocked back (`Kit.ultSteady`).
- Every hit stays far under the host's 15,000 clamp. Exact numbers live only in the tooltip (`{d:N} {h:N} {s:N}` tokens, `numbers.js`).

Data (`kits.js`, `ULTIMATES[classId]`, attached as `KITS[cls].ultimate` at the end of the file, so every spec and talent kit carries it; never in `abilities[]`, which stays six):

```js
ultimate: {
  id, name,            // id: lowercase letters, at most 16 (it goes over the network as `a`)
  slot: 7, type: 'ogcd', ult: true,
  mode: 'instant' | 'window',
  target: 'self' | 'enemy', range, anim: 'big', icon,
  lock, dr,            // animation lock (s) and the damage reduction during it
  charge: { rate, keep, gain: { gaugeKey: perPoint }, spend: { gaugeKey: perPoint } },
  desc,                // the tooltip, with number tokens
  effect(k, target),   // the moment itself (instant), or the opening hit (window)
  window: { dur, over: { <base ability id>: { fxId, name, desc, ...ability fields to override } }, onEnd(k) },
  burst, after, botOk  // optional hints for the bot (see below)
}
```

Engine (`engine.js`, `Kit`): `k.ult`, `k.ultCharge()`, `k.ultFull()`, `k.ultWin`, `k.ultLeft()`, `k.ultSteady()`, `k.ultGain(n)`, `k.ultDeath()`. `press(7)` resolves to the Ultimate; `usable()` needs it full. On resolve `ultFire` spends it, emits `ult-spent` (and `ult-ready` when it fills; both go out as `kfx`, which is how party frames show a ready pip), steadies the caster, and for a window swaps `k.abilities` to empowered copies (`ultOver`: the base move with the override on top, **same id**, so cooldowns, charges, talents, item perks, bot logic and `opts.ab.id` checks keep working; `fxId` names its look). `k.baseAbilities` is always the plain bar. Other clients find an Ultimate or an empowered move by id or fxId through `abilityById`.

Looks are in `ability-vfx.js` (`ABILITY_VFX[class][ult.id]`, moments that land later in `KIT_VFX`). Your own Ultimate gets camera work (dim, hit-stop, a small punch, a flash: `FX.camFor`); everyone else's plays at 0.6 with no camera. The HUD shows a thin charge ring on the T slot, a cue when it fills, the seconds left in a window, and a warm rim on empowered moves; party frames show a pip for anyone whose Ultimate is full.

Bots (`BotAI.ult`): damage classes press into the party's burst, a damage check, the boss's last 15%, their own burst buff, or after holding it 20 s; tanks just before a tankbuster aimed at them or in a heal check, with class-specific rules; healers when three allies are under 60% or a raidwide is next in the feed (an Ultimate marked `after`, which heals what already happened, waits for the hurt). Nobody holds a full one for more than about 35 s. `tools/simulate.js` never presses T, so the pro DPS baselines exclude Ultimates; bot raids do press them.

Adding one: write `ULTIMATES[cls]` (pick two or three places in the kit's loop for `k.ultGain`), its recipes in the Ultimates block of `ability-vfx.js`, and for a procedurally drawn class an icon drawer in `hud.js` `ICON_GLYPHS`.

### The combo-paced engine

A kit may set `pacing: { kind: 'combo', gcd: false, buffer, bufferSize, repeat, pool: { key, max, regen, rest, delay }, itemGcd(k, ab) }` (the Ironpalm uses it): GCD abilities start no GCD and each locks the kit for its own `lock`; presses during a lock are buffered; the `pool` is a resource that abilities spend and that refills while pressing and faster at rest; `repeat: false` stops held keys auto-repeating; `itemGcd` says which presses count as a "GCD" for item triggers. Named moves live on the kit (`kit.moves`, `moveFor`) and `abilityById` finds them, so a cast carries the move's id over the network. Kits without `pacing` run the standard GCD.

---

## 3. Roles and classes

There are three roles (tank, DPS, healer) and 23 classes: 8 tanks, 8 DPS, 7 healers. Each has six skills (Q W E R D F), the shared dash and an Ultimate on T. The hero select shows a difficulty rating in diamonds and, for the advanced classes, complexity pips (`data.js` `complexity`). Class rules: no mana and no interrupts; taunts ride on a carrier button; talents are new abilities or changed behaviour (at most one plain-number talent per class); numbers stay small. Kits are in `combat/kits.js` (`KITS`), specs in `combat/specs.js`, gauges in `combat/gauges.js`. Classes without painted icons or portraits (`art: { icons: false, portraits: false }` in `data.js`) fall back to drawn glyph icons and the animated sprite; briefs for the painted art are in `docs/art/`.

Each class below gives its signature, gauge, the six keys in order (Q W E R D F), its Ultimate and its two specs. Exact numbers live in the in-game tooltips.

### Tanks

**Bastion, Shield Knight** (difficulty 1). Signature: **Perfect Block**. Gauge: a shield (Resolve).
Blade Chain (a three-hit combo that builds Resolve) / Holy Edge (spends Resolve, ranged, small self-heal) / Brace (2 charges; a press within 0.8 s before a hit is a Perfect Block: heavy mitigation, Resolve, a counter, and on a tankbuster the charge back and a free Holy Edge) / Oath of Valor (60 s burst) / Rally Banner (spend Resolve to cut the party's damage; Perfect Blocks under it pay Resolve) / Bulwark. Taunt: Challenge, on Brace. Ultimate **Last Bastion** (a dome of party mitigation that comes down as a slam).
Specs: **Sentinel** (a Perfect Block steadies the party; Brace has three charges; Holy Edge becomes Shield Bash), **Crusader** (a Perfect Block makes the next Holy Edge Radiant; Bulwark becomes Zealous Guard).

**Bloodreaver, Berserker** (2). Signature: **Crimson Drain timing**. Gauge: a heart (Blood).
Hack & Maul / Crimson Drain (cashes "the bank", the damage taken since the last Drain, as damage and healing; a warm bank right after a heavy hit is worth far more than Drain on cooldown) / Bloodletting (2 charges) / Frenzy (burst, free Drains) / War Cry (party shield) / Undying (can't drop below 1 HP; Drains are free). Taunt: Reaver's Hook, on Bloodletting. Ultimate **Crimson Eclipse** (a party shield and free Drains, then the damage taken under it erupts).
Specs: **Berserker** (Blood becomes Rage; Drain becomes Rampage, harder at low HP, with a guard), **Hemomancer** (Drain also heals the party; Bloodletting becomes a ranged Blood Lance).

**Runeguard, Warder** (3). Signature: **Ward breaks**. Gauge: three rune stones.
Rune Strike / Runic Ward (a shield that explodes when it ends, harder the more it soaked; fully broken it refunds its Rune) / Glyph Burst (spends 3 Runes) / Runic Overload (burst) / Sanctum (party mitigation; the next Ward inside it is sanctified) / Mirror Aegis (reflects the next hit). Taunt: Binding Rune, on Rune Strike. Ultimate **Runic Cataclysm** (every Rune comes down on the target, then settles as a party Sanctum).
Specs: **Spellwarden** (the Ward goes on an ally), **Runeblade** (a melee combo, Rune Cleave leaves a burning rune, two mirror charges).

**Gorgemaw, the Glutton Knight** (2, complexity 3). Signature: **eating mechanics**. Gauge: the Belly, a row of Morsels with a jaw over it.
Gnash > Rend > Gulp (Gulp heals, and fills an empty Belly) / Open Wide (2 charges: for 1.5 s an edible hit that lands on you deals a quarter and becomes a Morsel) / Spit (the oldest Morsel back at the boss, in the shape you ate) / Digest (heal and mitigate per Morsel, and the acid makes the next Spit harder; only in a hard moment) / Iron Gut / Bottomless (for 4 s eat raidwides too, the party takes half). Taunt: Bellow, on Open Wide. Ultimate **Maw of Ruin** (the whole Belly in one bite, digested at once, a party shield).
Specs: **Glutton** (a Belly of 5; two Morsels of one shape fuse when spat), **Gizzard** (Digest feeds the party by shape: shields, mitigation, an immunity).

**Oathbroker, the Contract Knight** (3, complexity 4). Signature: **the Ledger**. Gauge: a page of lines, each an amount and the seconds until it is due.
Dun > Levy > Collect (every strike pays the oldest entry down) / Renegotiate (push every entry back 4 s) / Settle (pay the Ledger now at half) / Lien (the boss pays half of every bill that comes due) / Writ of Protection / Default (tear the Ledger up and strike the boss for half of it; credit freezes for 10 s). Taunt: Summons, on Renegotiate. Ultimate **Final Reckoning** (every entry comes due on the boss instead of you).
Specs: **Guarantor** (Lien becomes Co-Sign: part of an ally's damage goes on your Ledger), **Collector** (every bill also strikes the boss; Default becomes Foreclose).

**Ironpalm, Monk Brawler** (3, complexity 3). Signature: **Strings and Reads**. Gauge: Breath, a ring round an iron fist, with the string you're pressing under it.
The first class with **no GCD**: Light, Heavy and Kick are inputs, each with its own short recovery that costs Breath, and strings of them pressed in rhythm become named moves (Rising Gate, Heaven's Drop, Iron Ox, Thousand Palms...). A press just after the last recovery ends is **Crisp** (more damage, Breath back). Q W E are Light, Heavy and Kick, then R **Read** (a stance: a hit in its first 0.4 s is read, halved, countered and gives Breath; reading a tankbuster opens a free finisher) / Iron Skin / Temple Bell (party mitigation, Second Wind). Taunt: Beckoning Palm, on Read. Ultimate **Hundred Palms** (every string at once).
Specs: **Still Water** (a perfect Read fills Breath; two Read charges; Iron Skin becomes Still Pond), **Avalanche Fist** (Momentum for long strings; Temple Bell becomes Landslide).

**Gloomsworn, Undying Vigil** (3, complexity 3). Signature: **the Hollow**. Gauge: a vessel (Gloom).
Rend > Sunder > Gloaming (fills Gloom; carries the taunt) / Gloom Strike (2 charges, spends Gloom, leaves a barrier) / Shade Step (a cut that makes the next two Strikes echo) / Black Pall (party mitigation) / Black Mantle / Last Rite (spends all Gloom for a barrier and a heal). A killing blow taken with a full vessel does not kill: you go **Hollow**, held at 1 HP and hitting harder while every wound is written down as debt that the healer must pay back before the grace ends (once a minute at most; the host judges it). Ultimate **Eclipse of the Vigil** (pours the vessel out as a blow, a party barrier and mitigation).
Specs: **Sentinel** (longer barriers that chain to the most hurt ally; a Hollow covers the party), **Reaver of Dusk** (more damage; Black Pall becomes Dusk Reave; a Hollow is a window).

**Kenseier, the Ashen Guard** (3, complexity 3). Signature: **the Beat**. Gauge: Poise. Painted icons and portraits exist.
Ember Cut (a three-hit combo; the third hit adds Posture to the boss and carries the taunt) / Deflect (no cooldown: pressed within a blink of a boss auto or tankbuster landing on you it is Perfect (no damage, big Posture) or Good (a third off, some Posture); a pointless press costs Poise) / Mikiri Step (a blow that lands as you step passes through you) / Deathblow (only while the boss is Broken; otherwise a Pommel that adds Posture) / Ash Mantle / Guard Stance. Only a Kenseier fills the boss's **Posture** bar; a full bar **Breaks** the boss (a short stagger in which the whole party hits harder, held off during a scripted cast). Ultimate **Thousand Cuts** (fills Posture at once, Breaks, then a free double Deathblow).
Specs: **Deathblade** (bigger Posture, longer Breaks, Iai Stance), **Warden of the Ash** (Deflect reaches an ally; every Perfect cuts party damage; Pommel becomes Redirect).

### Damage dealers

**Ranger, Marksman** (1). Signature: **Keen Eye procs**. Gauge: a quiver (Focus). The lowest floor (everything is instant) and a modest ceiling.
Quick Shot (may light Keen Eye) / Piercing Arrow (2 charges; with Keen Eye it hits harder and the charge comes back) / Rapid Fire (spends Focus; half price in Hunter's Mark) / Hunter's Mark (60 s party burst: the boss takes more damage from everyone) / Hunter's Cloak (party mitigation, Focus) / Barrage (the next Quick Shot fires three times). Ultimate **Starfall Volley** (all Focus into a rain of stars).
Specs: **Sharpshooter** (stand still for Steady Aim; Piercing Arrow becomes the Aimed Shot), **Venomstrike** (Quick Shot stacks Acid; Piercing Arrow becomes the Caustic Arrow that bursts it).

**Shadowblade, Assassin** (3). Signature: **positionals**. Gauge: a moon with five phases (combo points). The highest ceiling.
Strike (more and 2 points from behind) / Eviscerate (spends all points; more from the flank) / Shadowstep (2 charges: behind the boss; every hit counts as a positional for 5 s) / Shadow Dance (burst) / Venom Blade (poison) / Smoke Bomb (party mitigation, positionals). The boss's hitbox ring shows its front, sides and back. Ultimate **Thousand Cuts** (a window of free finishers that all come due at once).
Specs: **Bladedancer** (positionals always land; Shadowstep becomes Blade Fury; Tempo), **Nightstalker** (Eviscerate becomes Backstab, stronger from behind; Shadowstep dodges for 1 s and starts a Stalk).

**Pyromancer, Fire Mage** (2). Signature: **Heat and Hot Streak**. Gauge: a crucible (Heat).
Fireball (builds Heat) / Pyroblast (instant with Hot Streak) / Fire Blast (2 charges; always crits; usable mid-cast) / Combustion (burst: everything crits) / Vent (spends Heat; at 90 it also lights Hot Streak) / Smolder (party mitigation; Heat can't boil over). Heat raises damage; at 100 you overheat. A crit gives Heating Up; a second crit makes Hot Streak. Ultimate **Phoenix Dive** (a window of instant Phoenix Flames and Blasts).
Specs: **Cataclysm** (Pyroblast becomes Meteor), **Sigilmancer** (Combustion becomes Ember Circle: stronger only while you stand in it).

**Thermist, Living Thermometer** (3, complexity 3). Signature: **Thermal Shock**. Gauge: a two-sided dial from Rime (-5) to Blaze (+5).
Cinder Bolt and Rime Shard (instant, turn the dial 1) / Flare and Glacier Lance (cast, turn it 2; at the edge instant and a sure crit, holding you On the Brink) / Equilibrium (snap the dial to 0 behind a shield; the swing is kept) / Inversion (flip the dial). A spell that carries the dial across 0 after it peaked at 3 or more detonates a **Thermal Shock** sized by the swing. Pushing past an edge overloads you. Ultimate **Supernova** (frost and fire on the stored swing).
Specs: **Pendulum** (each spell moves the dial further; Momentum), **Zenith** (the edge spell is instant and lights a Corona; hold the edge, then swing; Equilibrium becomes Sunset).

**Driftblade, Wind Duellist** (2, complexity 2). Signature: **Drift and Passing Strikes**. Gauge: a crescent of wind that fills while you move.
Carve / Slipstream (2 charges: a dash that leaves a wind lane) / Hook Turn (swing round the target; gives back a dash charge) / Crosswind (spends Drift) / Stillpoint (a parry) / Gale Run (burst). Moving fills Drift and standing drains it, and running through an enemy cuts it as you pass, so a dodge can carry you through the boss. Ultimate **Eye of the Gale** (a window of gale lines, ending in a tempest).
Specs: **Orbit** (circling the target builds Orbit; Full Circle dives), **Comet** (Drift holds 200; Crosswind becomes the charge Impact).

**Marionettist, Puppeteer** (3, complexity 4). Signature: **the Doll and its Strings**. Gauge: a stage with five footlights (Encore) and the three strings.
A Doll on three strings does the fighting; she has no auto-attack and the Doll jabs on its own. Cue (the Doll lunges, builds Encore) / Pull Strings (2 charges: fling the Doll where you aim; it ties the Strings back) / Cross-Cut (the strings become blades along the line from you to the Doll; cuts only if the enemy is on the line) / Pirouette (a spin, and the Doll can't be touched for a moment) / Swap (trade places) / Grand Finale (spends 5 Encore). A String tears if the Doll is dragged too far or a mechanic lands on it; with none left it goes limp. The Doll works only the enemy you picked. Ultimate **Curtain Call**.
Specs: **Cutting Line** (strings reach 400 and cut what they cross; Cross-Cut is an oGCD; Draw Tight makes a long unbroken line hit harder), **Understudy** (two smaller Dolls; the triangle between you and them is the Stage, where the boss takes 10% more from everyone).

**Houndmaster, Huntsman of the Old Road** (3, complexity 4). Signature: **the Pack**. Gauge: Bond. Melee.
Two hounds, Rust and Ash, stand around the boss and bite on their own; where they stand when you strike decides your finisher. Hunting Knife (a three-hit combo; the third lets the hounds bite) / Whistle: Flank (send a hound to a side of the boss) / Pack Finisher (spends Bond; the move is whichever pair they hold: Rend, Hamstring, Bring Down, or Snap with no pair) / Whistle: Hold (hold their spots through the boss's turns, then pounce) / Call Off (both sprint to you and guard; saves a hound from a telegraph) / Mark the Quarry (the hounds bite faster, Bond doubled). The host damages hounds with boss telegraphs. Ultimate **Wild Hunt** (a window: four spectral hounds, every pair counts as all three).
Specs: **Pack Leader** (Pounce keeps two charges; Harmony rewards changing the pair), **Lone Wolf** (one bigger hound, Greyfang, with you as the second half of every pair; Mount for a ride and a mounted charge).

**Reaper (`thresher`): Scythe Evie** (rebuilt 2026-10-25; design in `docs/plans/2026-10-reaper-rework.md`). A melee DPS with a mid-range scythe reach and a half-support role: personal damage a little under the other DPS, made up by **Insane Reaper** (F, 60 s), 10% party haste for 15 s (its own `rhaste` kind, which stacks with the Chronomancer's Accelerando up to 35% in all). **Signature:** the Scythe String. Q swings up to four times on one GCD; W finishes it, and the finisher depends on the count and leaves a mark (QW Drain, QQW Bind, QQQW Death Mark, QQQQW Thread). E **Snap** detonates every mark, each its own way, with a **Full Harvest** for all four on one target. R **Void Star** opens a smoke void at the target that collapses on everything round it, harder per mark (it uses none), and charges Arcane Gate and gives a Blink back. D **Dusk Veil** (defence, a Blink back). Space is the class-only **Blink**, which keeps the string alive. **Gauge:** a crescent moon filled by Snaps; full, the next Snap is a **Harvest Moon** that pops every mark twice. **Ultimate:** **Arcane Gate**, an 8 s window: you phase out as it opens, the string runs to five swings, the first four apply empowered marks (all four in time makes you **Gatebreaker**), and the fifth swing is an enhanced Snap. **Specs:** **Dancer** (long strings) and **Phantom** (blink chains).

### Healers

Every healer both heals and attacks: heals are aimed by ally-targeting (see Combat rules), and the attack fills the kit's gauge.

**Cleric, Priest of Dawn** (1). Signature: **Petal economy**. Gauge: a sundial with 3 petals.
Smite (after three Petals' worth, where a Mend counts as half, it becomes the instant Dawnstar) / Mend (cast heal) / Dawn Petal (instant heal and regen; Petals regrow every 15 s) / Prayer Circle (party mitigation and regen) / Intervention (raise, or a heal) / Benediction (heal, shield, and Blessed). Ultimate **Dawn Breaks** (a party heal that grows with Petals held, then a smite).
Specs: **Aegis** (Petals leave shields; Mend becomes Divine Barrier), **Inquisitor** (Smite brands the boss so allies' hits burst; Benediction becomes Condemn; less healing).

**Grovekeeper, Druid** (2). Signature: **planting heals early**. Gauge: a sprouting seed (Bloom).
Wrath (instant after Bloom) / Rejuvenate (a HoT whose ticks grow Bloom) / Thornlash (a DoT that also grows Bloom) / Wild Growth (party regen, your heals stronger) / Bloom (spend Bloom: a burst on everyone with your Rejuvenate; drifts to the most hurt if aimed at someone healthy) / Rebirth (raise, or an instant heal and Wildheart). Ultimate **World Tree**.
Specs: **Lifebinder** (Rejuvenate becomes Lifebind, covering two allies), **Moonwell** (Wild Growth becomes a placed healing pool).

**Chronomancer, Time Mage** (3). Signature: **Haste / Slow stance**. Gauge: an hourglass (Flux).
Temporal Bolt (an attack that heals: in Slow your linked ally, in Haste the party) / Rewind (set an ally's HP back to its best in the last 4 s, even from dead; in Haste costs Flux instead of a charge) / Shift (toggle stance; shifting back from Haste sets off Paradox, a hit sized by the Flux you spent) / Accelerando (60 s party burst; Quickened on one ally) / Stasis (hold Bolt heals for 8 s, then release them to the party) / Recall (raise, or a heal). Slow fills Flux, Haste drains it; running dry in Haste stumbles you into Slow. Ultimate **Time Reversal** (heals the party back to its best of the last 6 s and stops the boss's clock for 2.5 s, with strict refusals so it is never a way round a check).
Specs: **Echoist** (Bolts and Recalls repeat 3 s later), **Accelerant** (shifting into Haste hastens the party; Haste is longer and heals more).

**Alembist, Alchemist** (3). Signature: **brewing ahead**. Gauge: a copper still with a bandolier of vials.
Ember, Dew and Salt are reagents (short GCDs); two make a vial (Mending Draught, Fire Bomb, Salt Ward, Steam, Salve, Quickpowder). Throw (at your heal target, or a bomb at the enemy) / Distill / Grand Batch. Vials ripen over 10 s and spoil at 40 s; the bandolier holds 3. The number keys mark the vial the next Throw takes (and party selection moves to F1-F4 while you play an Alembist). Every vial that isn't a bomb heats the Kiln; at three the next Throw adds a free Kiln Bomb. Ultimate **Magnum Opus**.
Specs: **Apothecary** (5 vials ripening in 5 s), **Volatile** (Distill becomes Catalyst: three-reagent hidden Reactions found by experiment; vials have a fuse).

**Threadweaver, Seamstress Witch** (3, complexity 4). Signature: **Threads**. Gauge: a spool that fills as threads carry damage (Spool).
Needle (an attack; each Thread on you tugs a small heal) / Tie (2 charges: tie your target to yourself; press on a second ally to tie those two; on an ally already on your threads it pulls them along the thread) / Mend Seam (a heal that runs down the thread; instant with Spool) / Snap (cut a target's threads, releasing what they carried as a heal) / Shuttle (strike the boss down every thread) / Tapestry (tie the whole party into one web). A thread splits a hit evenly between its ends; heals run part-way down; threads snap past 550 px with a small heal. Raidwides ring the web (heal both ends of every thread) instead of piling onto the weaver. No raise. Ultimate **Grand Loom**.
Specs: **Loomwright** (5 threads, heals two links deep), **Shears** (Snap is the main heal on a short cooldown that returns Spool; Tie shields).

**Tidecaller, Voice of the Undertow** (2, complexity 3). Signature: **the Tide**. Gauge: a tide that climbs on its own, ebbs, and crests.
Salt Spray (an attack that nudges the tide) / Sip (a small heal that costs a slice of the tide; stronger at low water) / Riptide Mark (a HoT that pops when the tide next crests) / Surge (spend all the tide in a party wave, 120 at low water to 480 at high) / Current (bend the tide) / Breakwater (party mitigation, the tide does not ebb). The skill is choosing when to sip and when to wait for high water. Ultimate **Spring Flood**.
Specs: **Spring Tide** (a longer crest, a stronger Surge with a shield; Sip becomes Swell, which raises the tide), **Undertow** (Surge becomes a party HoT with a Deep Shield for you).

**Lanternkeeper, Keeper of the Last Light** (2, complexity 4). Signature: **Lanterns**. Gauge: Embers.
Trim the Wick (an attack that tops up wicks and gives Embers) / Set Lantern (1 Ember: a healing glow at your feet) / Hand Lantern (1 Ember: hang one on an ally) / Flare (12 s: every lantern bursts, healing and shielding everyone in a glow once for each glow they stand in) / Carry the Flame (pick up a lantern and set it at your feet) / Relight (2 Embers: wicks back to full and a heal). Lanterns heal everyone in their glow, so the skill is placement. Ultimate **Lighthouse** (a window: the whole room counts as inside every glow).
Specs: **Beacon** (two Great Beacons with wide glows that never burn below half and cut damage; Call the Beacon pulls one to you), **Wayfarer** (small lights fall wherever you walk and heal the most hurt ally; Trailblaze drags them along).

### Classes that need the host

Most kits run entirely on their owner's client. These classes keep rules the host owns, because they touch HP, other players or the boss (`fight.js`, near the end of the file):
- **Gorgemaw's jaw** (`MAW_HOST`). Open Wide sends a `maw` event (window capped at 4.2 s). A mechanic that resolves on an open jaw is eaten: the hit drops to a quarter, avoidable becomes false, and the owner's kit gets a Morsel (`fev eat`). What's edible is decided by shape: an aoe by its shape (circle or donut: Ring, line or cross: Lance, cone: Fang), a spread or proximity mark: Ring, a tankbuster: Spike, a raidwide: Ring through Bottomless only. A boss file can override with `eat: '<shape>'` or `eat: false`, or pass `eat` on its own `damagePlayer` calls. Not edible: cover blasts, stacks and towers, tethers, gazes, knockbacks, floor puddles and fire, adds, autos, the enrage. A teammate's spread or follow circle that lands on an open jaw is swallowed whole (the owner takes nothing, the circle goes off for nobody). One Morsel per mechanic per eater.
- **Oathbroker's Ledger** (`OATH`, `kits.js`; `s.led` in `fight.js`). The Ledger takes 60% of every hit after mitigation and bills it 8 s later as raw damage. The kit sends `ledger` events and the host clamps every value; it sends back the packed page and `bill` events so the owner's column stays exact. A very long Ledger folds its two oldest lines (24 at most).
- **Threadweaver's threads and the Marionettist's Dolls** (the weave and Doll blocks). Threads live on the host: Tie (and its pull), Snap and Tapestry are combat events; the host measures lengths every tick, snaps long threads, splits damage, runs heals down the threads and logs what each thread carried for the last 5 s (`thr`, `thrs`). Dolls are reported by their owner 10 times a second and judged by the host: a mechanic resolving on a Doll that isn't safe sends the owner `dollhit`. The host rebroadcasts every Doll (`dolls`) and works out the Understudy's Stage. Dolls are never edible. The simulator and the town have no host, so the kits count their own threads and Dolls there.
- **Gloomsworn's Hollow** (`HOLLOW_HOST`). The kit reports its Gloom; a blow that would kill a knight with a full vessel (and the minute has passed) holds HP at 1, and every point becomes debt (counted 1.8 times) that healing pays down (shields at half). Unpaid when the grace ends, it kills. Doom, the enrage and falls bypass it; a revive clears it.
- **Kenseier's Posture** (the Kenseier block, `kenEvent`). Active only when a Kenseier is in the party. The boss carries a Posture bar that only a Kenseier fills; a deflect is judged by how far the press is from the blow (Perfect or Good); a full bar Breaks the boss (the script slides out of the way as a Time Stop does).
- **Houndmaster's hounds** (`HOUND_HOST`). The host damages hounds with telegraphs, holds each player's hounds, and broadcasts them 10 times a second (`hounds`).
- **Lanternkeeper's lanterns** (the Lanternkeeper block, `lampEvent`). Your own lanterns come straight from your kit and are sent to the host 10 times a second; the host broadcasts everyone's (`lamps`). They are healing zones drawn faintly under telegraphs.
- **Chronomancer's Time Stop** (`pauseBoss`). The boss's own clock stops for up to 2.5 s: the script's remaining steps slide later, the boss freezes, and everything already under way (telegraphs, puddles, the running cast, checks, the hard enrage) keeps true time. Refused in a phase change, a check, near the enrage, while untargetable, within 20 s of the last stop, and where a script says `noPause`.

### Class balance

Within each role, pro damage is balanced through a per-kit `potMult` knob in `kits.js`; healers deal less damage because healing is their job, and every healer stops healing to attack when nobody needs it. The class balance baseline (`tools/check-baseline.json`, checked to +/-8%) records pro DPS and the newbie share (sloppy play: late inputs, noticing only 60% of glows, ignoring positionals, casting into movement). Every spec's pro DPS stays within 5% of its class (a spec can aim off on purpose with `balance`).

| Role | Class: pro DPS, newbie as a share of pro |
|---|---|
| Tanks | Bastion 1498, 72% · Bloodreaver 1512, 80% · Runeguard 1550, 67% · Gorgemaw 1498, 72% · Oathbroker 1485, 81% · Ironpalm 1522, 55% · Gloomsworn 1519, 69% · Kenseier 1529, 72% |
| Damage | Ranger 2147, 85% · Shadowblade 2397, 72% · Pyromancer 2381, 83% · Thermist 2356, 60% · Driftblade 2407, 60% · Marionettist 2295, 81% · Reaper 2738, 68% · Houndmaster 2364, 70% |
| Healers | Cleric 1038, 63% · Grovekeeper 1044, 71% · Chronomancer 1142, 74% · Alembist 1090, 58% · Threadweaver 1038, 53% · Tidecaller 1052, 62% · Lanternkeeper 1048, 66% |

The gap grows with a class's difficulty. The advanced classes are meant to have a wider gap (down to about 55%).

---

## 4. Bosses

Eight bosses in two sets, each on Normal and Hard. Set 1 is Grubnak, Skitterra, Volkar and the Hollow King; set 2, "the wild realm beyond the road", is Vhalgrath, Hrimgar, Azerath and the Hydra. Boss data is in `client/js/arena/bosses/<id>.js` (ids `grubnak`, `skitterra`, `volkar`, `hollowking`, `wyrm`, `titan`, `archmage`, `hydra`), the room shapes in `arena/shapes.js` (`ARENA_DEFS`), the boss art and tells in `bosses.js`, `boss-tells.js` and per-boss art files, and the player-facing journal in `client/js/journal/<id>.js`. A set 3 (the Void Gate) is planned in `docs/plans/2026-10-set-3-bosses.md`.

| Boss | HP (Normal / Hard) | Enrage lands | HP gates | Room |
|---|---|---|---|---|
| Grubnak, the Ogre Chef | 3.415M / 4.225M | 10:00 / 10:15 "Last Call" | 80 / 50 / 18% | 1040 x 720 kitchen |
| Queen Skitterra | 3.305M / 4.105M | 10:10 / 10:20 "Devour" | 70 / 28% | octagon, radius 560 |
| Volkar, the Storm Titan | 3.62M / 4.51M | 10:00 / 10:15 "Skybreak" | 55 / 15% | circle, radius 540, closes in |
| The Hollow King | 3.56M / 4.345M | 10:30 / 10:40 "Moonset" | 80 / 62 / 46 / 25% | 1200 x 880 hall |
| Vhalgrath, the Ember Wyrm | 4.8M / 5.635M | 10:20 / 10:30 "Ashfall" | 75 / 50 / 24%, wall 10% | circle, radius 560 |
| Hrimgar, the Frost Titan | 5.55M / 5.6M | 10:08 / 9:58 "Endless Winter" | 74 / 48 / 22%, wall 10% | 1000 x 800 ice plateau |
| Azerath, the Sunken Archmage | 5.5M / 6.16M | 10:08 / 10:13 "The Tide Rises" | 78 / 55 / 32 / 14% | circle, radius 540 |
| The Hydra of the Drowned Temple | 4.95M / 5.85M | 10:20 / 10:30 "The Drowning" | 75 / 45%, wall 10% | circle, radius 540 |

(HP is in boss-file units; the game shows 5% of it. Enrage is when the named cast lands, 8 s after it starts. Gates are the HP ticks on the boss bar.)

### Shared rules and systems

- **Normal is a real raid.** A good group should expect several wipes on its first night with any boss, Grubnak included. An avoidable hit takes well over half a DPS's HP and leaves +50% Vulnerability for 15 s (`def.vuln`), so one mistake hurts and two usually kill. Every Normal attack is still telegraphed on the floor.
- **Hard** casts 15% faster and hits 25% harder, and every boss has at least three (and at most about six) moves Normal never uses, each with its own floor tell, body tell and impact effect in that boss's style. On top of those, Hard gets harder by layers, never by hiding the floor: stored mechanics replayed later, two known mechanics at once, role-split targeting (the tank gets one thing, the healer another), shorter but always visible warnings (never under 1.2 s), debuffs that punish repeating, and a tighter enrage.
- **Tells.** Telegraphs are drawn from the cast until the hit as a dashed outline and a wash that sweeps from the origin (`FightSim.mech()` refuses to hide anything but a raidwide). Every part of a tell, including props in the air, is drawn under the heroes, boss and adds, so a mechanic never hides a unit.
- **Courses.** `f.course({ sets, until, closing, ramp, next, onStart })` in `fight.js` is one act. Its steps come in sets (the gap before a set's first step is the calm between sets) laid out all at once. **Gates by HP, content by time:** a course ends when the boss reaches `until`, at the next set seam (8 s at most), so a set never stops half-way and a fast party skips the tail. **A slow party gets no free loop:** once a course's sets run out, its `closing` steps run again and again, each pass with more boss damage (10% by default, shown under the boss bar), until the gate. `f.dpsCheck` and `f.healCheck` build damage and heal checks; both feed the Limit Break and bots read them.
- **Set 2 systems** (the contract is in the comment above `course()`): every `until` is a visible tick on the boss bar (`def.gates`, sent as `fb.g`); **push** (`push: true`): the moment the boss reaches the gate the act's remaining steps are cut and the next begins at once (telegraphs already on the floor still resolve; follow-ups laid with `afterKeep` survive); **wall** (`wall: { label, run(f), until, timeout }`): from the act's start the boss can't be taken below the gate, at the gate it is sealed (a shield of light, a gold notch, a pip with the label), and `run(f)` lays out the mechanic that breaks the seal (`f.wallDown()`, or the timeout opens it anyway). Practice skips a wall like any passed-over course. Set 1 uses neither push nor wall.
- **Upcoming-moves feed.** Every scripted step has a player-facing name. About once a second, and whenever the list changes, the host sends `{ t: 'bnext', l: [[name, secondsUntil], ...] }`: the next three named steps plus kept ones such as the enrage. The raid UI draws it under the cast bar; bots read it (`view.next`) to top the tank before a buster, heal ahead of party-wide damage and hold tank cooldowns. A course lays out the next course as soon as it is known, so the feed reads across every join.
- **Rooms and props.** Each boss has its own room shape (`ARENA_DEFS`); walls are walls, and you are never knocked off an edge except where a script breaks the floor away (a fall). Every boss's room holds **props** the host owns (`PROPS` in `shapes.js`, `addProp` / `hitProp` / `breakProp`): solid (nobody walks through, throws stop), **cover** (a mechanic with `cover` comes from a point; anyone whose line to it passes through a cover prop is spared, `coverCap` limits how many hide behind one, the telegraph is drawn with each prop's shadow cut out and nothing painted in it), **breakable** (cracks on the last hit, debris, rubble), and **wall slams** (`FightSim.knock()` throws a player; stopped short by a wall or prop they take slam damage and are dazed). Permanent floor state (rubble, grease, broken ground) is drawn once into a cached layer. The host sends `props` (on change and every 3 s, so late joiners get the room), `propfx` for chips, breaks, slams and ignitions, and `roomev` for room moments.
- **Adds.** `FightSim.spawnAdd()` makes killable adds with a leash, bite, ranged spit, `onDeath` / `onTick` hooks and an optional link beam (`adds`, `addev`). Damage events carry `tgt` ('boss' or an add's id): players hit the enemy they clicked, or the nearest in range.
- **Other host pieces:** tethers (`tether()`), slow zones and slowing puddles, `slowed` and `rooted` debuffs that movement, dashes and bots obey, rollers (one `roll` message, every client computes the position on its own clock), reels, sweeps (turning walls), floor fires, towers and stacks, `ticker()` hooks, and `ARENA.resize()` / `cuts` for a round room whose wall moves or breaks.
- **Bots.** Bots read the same telegraphs the players do (they score candidate spots against every live telegraph) and play a competent-player priority with the real kits; each boss file adds the extra reads it needs (which bell, which stone, which head). Bot clear-rate targets are under Testing.
- **The room is alive.** Floors are textured; an ambient layer (steam, dew, rain, dust, mist, an aurora) keeps each room moving, drawn under everything else. Entities are drawn about 0.15 s in the past and interpolated, so they glide. Telegraphs fade over a quarter second after they land, adds fade in and out, and entering or leaving a raid fades from black.

### Boss I: Grubnak, the Ogre Chef

*Set 1. Room: the Scullery. Question: where do I stand?* The dinner rush: one authored service that never lets up, four courses each faster than the last (the Flare-Up is the seam between the second and third), in a kitchen that catches fire half-way through. He never leaves the floor (the only boss with no downtime). Plan: `docs/plans/2026-10-grubnak-pilot.md`.

- **Appetiser** (to 80%): his tools one at a time: Grease Fire (raidwide), Mince (one half of the room is chopped; the glinting cleaver shows which), Ladle Spin (get out) and Lid Slam (get in), Tenderize (tankbuster cone), Meat Toss (spread; each puddle leaves a grease stain) into Family Meal (a stack), Larder Toss (casks land on the farthest two and stay as cover) and Gut Blast (hide behind a cask). Hard opens with Clogged Drains.
- **Mains** (to 50%): everything returns paired. Butcher's Charge (he charges his tank; bait it into the brick wall, where he is stuck and takes more damage), Chop Chop (Mince straight into Ladle or Lid), **Order Up!** (the order rail: one plate per player, served one after another, the order shown by how fast each cloche's gold rim fills; a plate left on the counter hurts everyone), Rolling Meatballs, Meat Toss into Family Meal. Hard adds Belly Flop and Cleaver Toss.
- **Flare-Up** (at 50%, about 40 s, he stays targetable): he heaves the stockpot onto the stove. The top third of the kitchen burns for the rest of the fight, and any grease touching fire lights. Flambé runs down the room and lights the stains you left. The stockpot is dragged to the middle (solid, cover, and something the charge can stop on) and Simmers out, then in.
- **Second Sitting** (to 18%): the burning, smaller kitchen; new tools arrive already paired: Whisk (a turning cross of beams), Spice Rack (jars on set spots plus one on each non-tank), Boil Over (damage falls off with distance), Meat Hook on the healer as the tank takes Tenderize (Hard). Charging into the pot is the short way (he is scalded and stuck, but the pot slops over).
- **Dessert** (to the end): the Dessert Trolley, a gauntlet of everything on 2.5 to 4 s beats, each landing as the next is called; 12 s of silence; Last Orders (a big raidwide); then Gorge every 15 s, 10% harder each time, until he drops or calls Last Call.
- **Determinism.** The order never changes. His tells decide which half Mince chops and which tool follows Chop Chop or Belly Flop. Plate spots, meatball lanes, spice circles, the Flambé direction and the Whisk spin are fixed for each place in the script.
- **Hard-only moves:** **Belly Flop** (he flops down where he stands and throws everyone away; the Ladle or Lid that follows is on the floor from the start), **Cleaver Toss** (a cleaver at each of the two farthest non-tanks, then back along the same line), **Flambé** in alternating stripes, **Mise en Place / Service!** (three tools laid on the pass early in the Second Sitting, served in that order much later), and the **Dinner Rush** (the Second Sitting's dance, in place of the rail: the party sets its own plates down while he works the line on three beats, the plates coming up nearest him first). Hard also gives the rail six plates for four players and a *Stuffed* debuff so nobody takes two in a row, and double Mince.
- **Props:** casks (solid, two hits, cover; at most four stand) and the stockpot. The room's brick walls and the stove line are what Butcher's Charge is baited into.

### Boss II: Queen Skitterra, the Spider Broodmother

*Set 1. Room: the web cave, an octagon hung between eight rock pillars. Question: what do I break?* The hunt: long dread, then sudden swarms. What you break is egg clutches, the knots of her threads, and the pillars you hide behind. Plan: `docs/plans/2026-10-bosses-2-4-plan.md`.

- **Act I, The Web** (to 70%): one thing at a time, 14 to 15 s apart. Venom Mist (raidwide), Silk Wrap (tankbuster; roots the tank), Eightfold Lunge (her legs light up; each step strikes a leg's direction and the opposite one, rotating, so the safe side moves), Silk Lines (a thread ties two non-tanks; it must be stretched when it resolves), **Spin** (four threads pillar to pillar cut the room into sectors; each has a knot to break), Venom Spit (two farthest players, venom pools), Strand Reel (she reels herself to a pillar), **Brood** (the two ripest of six egg clutches hatch; when one of a pair dies the other must follow within seconds or it enrages), Silk Reel (she drags the farthest non-tank in; a dash snaps the thread), **Acid Deluge** (hide behind a pillar; every pillar that sheltered someone takes a hit).
- **The Dark Between** (at 70%, about 30 s, she is untargetable): the cave falls to pools of light. Her shadow runs along each uncut thread in turn and she drops at its far end; a thread whose knot is broken first is a drop that never comes, but a cut thread is one she hunts instead (to whoever stands farthest). A Cocoon Drop (a stack on a random non-tank), a Venom Drip (spread) and the drops land in between. She returns with **Tightening Web**: the outer ring turns sticky for the rest of the fight.
- **Act II, The Brood** (to 28%): the same moves paired, then **The Swarm** (every clutch still standing hatches). Every clutch broken costs damage on her now and saves two spiderlings later.
- **Act III, The Collapse** (to the end): opens with the **Chrysalis**, a damage check (take 5% of her health off before it closes or she devours the party; passing leaves her staggered), then the floor falls away ring by ring from the walls, each shuddering for 6 s first. The hub, the eight spokes and every thread nobody cut stay; anyone on fallen floor drops, is held, and is hauled back. Then Venom Mist and Lunge in turn, each pass harder, until Devour.
- **Hard-only moves:** **Egg Sacs** (three sacs drop; each wants one person to stomp it), **Fang Rush** (a charge at the farthest player along a line; the silk behind her slows), **Spinneret Volley** (four globs fall in turn on everyone but the tank). Hard also adds six-step Lunges, green and red Silk Lines, a burning beam on the brood pair, three spiderlings to a clutch, two drops per uncut thread, **Molt** (a husk replays her last Lunge while she starts a new one), Ceiling Ambush, **Snare Weave** and sticky acid.
- **Props:** eight rock pillars (three hits each, cover), clutches and knots (breakable adds), the silk threads.

### Boss III: Volkar, the Storm Titan

*Set 1. Room: the summit, a round shelf of slate above the storm. Question: who do I pair with, and where's cover?* A steady crescendo, a calm eye, then it all comes back. Polarity is the spine, and it is the hardest healing fight. He is a giant who never leaves the middle.

- **Polarity.** Everyone carries + or - (half each) all fight. **Polarity Surge** punishes two of the same charge close together and rewards pairing with the opposite; **Thunder Crash** puts a stack on every + player (pairs stack together and apart from other pairs) and a **Static Field** (spread) follows.
- **The Front** (to 55%): Thunderclap, Titan Fist (tankbuster), Surge, Crash into Field, **Rod Strike** (bring your bolt down on a standing stone; a stone struck twice discharges), **Gale Slam** (everyone is thrown away; a standing rod's still air shelters you), **Lightning Rods** (each rod wants one person; catching two in a row hurts), **Storm Walls** (turning walls of wind), **Avalanche** (boulders that become cover, and the next walls smash them), and the **Squall Line**: the safe circle drifts round him for 30 s and the party walks with it while the rest of the script carries on inside it.
- **The Eye** (at 55%, 40 s): a calm; the Pulse stops, he stays targetable. **Still Air**: four stones light up, two + and two -; when the Eye closes each stone wants one person of its own charge.
- **The Back of the Storm** (to 15%): the Front mirrored and doubled, while the electrified edge closes in warned steps. Adds **Gathering Storm**, a heal check: static ticks on everyone every 1.5 s for 12 s, then one Thunderhead, healed through as it lands.
- **Heavens Fall** (15% to the end): the edge closes to its last ring and the sky comes down on set spots round him; the whole party stands in each together, both charges in it, each a little harder, until he dies or calls Skybreak.
- **Pulse:** the storm hits everyone lightly every 4 s, 5% harder each minute; it stops in the Eye.
- **Hard-only moves:** **Chain Lightning** (a bolt gathers over one non-tank, then leaps player to player), **Ball Lightning** (orbs drift across the peak), **Skyfall** (the sky comes down where a random player stood). Hard also flips the charges as the Eye opens, three rods and three walls, Titan Fist leaves the tank Conductive, the summit crumbles a wedge at a time instead of closing evenly, and the Front's dance: **Grounding Rods** (the + players plant rods) into the **Supercell** (three squall fronts march across; the cells past a rod stay dry).
- **Props:** four standing stones (solid, not cover), boulders from Avalanche, standing rods.

### Boss IV: The Hollow King, Lord of the Barrow

*Set 1. Room: a long burial hall. Question: what did I just see?* The court of the dead: one authored hearing in five sessions. He walks after his tank. The moon sinks in the window through the whole fight; when it is gone, that is the enrage.

- **I. The Summons** (to 80%): his calls one at a time. Barrow Knell (raidwide), Sceptre Sweep (a wide cone), **Royal Gaze** (turn your back; your cone shows if you would meet his eyes), Grave Cleave (tankbuster and bleed), Barrow Stomp (a circle round him), **Royal Doom** (a skull sigil over one non-tank, its ring burning down; carry a lantern to the doomed), Crown of Graves (everywhere but close to him).
- **II. Testimony** (to 62%): two **Echo Knights** rise by the walls. Each remembers a swing as he makes it and replays it from where it stands, aimed at the middle. **The Charge Sheet** (banners light in turn, each with the sigil of one of his swings, then go dark; nothing lands), Coffin Lids into **Royal Decree** (hide behind a lid), Barrow Bells (two to a bell), **Lights Out** (stand in a brazier's light).
- **III. Court of Bones** (at 62%, 38 s, untargetable): six coffins wake in turn down the walls; break each before it opens or a skeleton climbs out. He hurls his sceptre at whoever stands farthest (Sceptre Throw) and the dead gather on a random hero (Grave Summons: the party stacks in); Knell and Grave Marks (spread) fall between.
- **IV. The Verdict** (to 25%): calls and answers overlap: two swings and two echoes, Doom with Marks, the lids and the Decree again, **Royal Tithe** (a heal check you prepare for: everyone drops to a third of their health, then the Dirge tolls eight seconds later). At 46% **Judgement** opens its second half: the Charge Sheet's three swings land in that order, from him and both knights at once, each shown on the floor for only 1.6 s (1.5 s on Hard).
- **V. The Long Night** (25% to the end): the braziers die and one lantern is left. Doom passes from player to player in a fixed order, the next one's sigil glowing six seconds ahead, and the lantern passes on touch (whoever it cures carries it to the next). Swings, echoes, Gazes and Knells between, each pass harder, until he falls or the moon sets.
- **Hard-only moves:** **Royal Audience** (the opposite of the Gaze: face him), **Funeral March** (ranks of his dead march across the hall, one lane open the whole way), **Gravebind** (a grave-chain binds the healer and a DPS as Grave Cleave lands on the tank; stay close until it breaks, while the other DPS is marked). Hard also: four sigils on the Charge Sheet, Doom on two in the Verdict and two lanterns in the Night, **Burial Rites / Writ of Execution** (a grave per player in their slot colour, with a line read through each), Falling Masonry with each Knell, and the Charge Sheet's order, the March's lane and the bound players drawn fresh each pull.
- **Props:** six braziers (solid, not cover), coffin lids (solid cover), fallen masonry (cover).

### Boss V: Vhalgrath, the Ember Wyrm, Tyrant of the Cinder Peaks

*Set 2, the first boss. Room: a 560-radius crater. Question: where is it going to land?* The hunter in the air. Four acts on HP gates, all pushed, one wall at the end. Plan: `docs/plans/2026-10-set-2-bosses.md`. Script `wyrm.js`; journal `journal/wyrm.js`.

- **Ground.** He walks after his tank: Tyrant's Roar (raidwide), Rending Claws (tankbuster), Tail Lash (the cone behind him), Ember Breath (a cone at a random hero that follows until a second before it goes; the floor in it is molten for 20 s), Magma Burst (a circle on every hero but the tank, each leaving a pool), Cinder Feast (a stack). Hard shuffles the middle sets of each ground act per pull.
- **Flight.** Take Flight (he is out of reach until he lands). **Dragonfall** draws a line of embers from the rim to one of three scorched crater spots and a ring on the pit he has picked; the pit and the side are random each time, shown 4.6 s ahead (3.9 s on Hard). Twin Pass: two lines at once, the first only a pass-over, the second landing.
- **The Roost** (the seam before Act III): he perches on the rim for 12 s and shakes burning scales onto random tiles while two ember whelps harry the party; any left alive when he comes down detonates. Then **the Crater Boils**: the outer ring of the floor is molten for the rest of the fight.
- **The Ember Heart** (the wall, at 10%): he is sealed. Heart Burn, twice (three times on Hard): scorch marks bloom at the three crater spots one after another; the last marks the island. The floor-wide fire is shown before it lands, so the island is the unpainted hole.
- **Last Ember** (the last 10%): Roar, Twin Breath, claws, Magma Burst, tail, then closing passes until he falls or Ashfall lands.
- **Hard-only moves:** **Wingbeat** (every dive's wings shove everyone near the flight line away from it), **Cinder Rain** (ten embers across the crater, each a circle and a small pool), **Heart Flare** (a stack, then a spread as it lands). Pools and molten floor give a second's grace before they first burn.

### Boss VI: Hrimgar, the Frost Titan, Warden of the White Reach

*Set 2. Room: a 1000 x 800 glacier plateau of twenty ice sheets. Question: what will the floor do?* The slow giant, and the ground itself. Four acts on HP gates, all pushed, one wall at 10%. Script `titan.js`. His ordinary swings stop while he winds up a heavy move.

- **The sheets.** The floor is twenty sheets (5 x 4, 200 across). Where Hrimgar strikes (Rime Slam: the sheet under the circle; Fault Line: up to three sheets along a line) a sheet is painted red for the whole warning and sinks when it lands. A sunk sheet is black water (burns and slows) until the Whiteout or 32 s on. A **frozen** sheet cannot crack but is **slick**: entering it shoves you along your heading. Winter's Grasp freezes the sheet under two random heroes (three on Hard) and thaws the old frost.
- **Braziers.** Four stand where four sheets meet. **Frostbite** chills a random non-tank (slowed) and a blue stack follows them; a moment near a brazier cures them and takes the stack; otherwise the stack lands, and a hero still chilled is frozen solid.
- **Acts.** The Thaw (Howl, Glacial Fist, Rime Slam, Fault Line, Icefall, Titan's Sweep) / the Freeze (Grasp, Frostbite, Whiteout, Twin Slam) / the Crack, opened by **the Long Night** (the seam: the aurora dims, huge slow arcs, and the frost called twice so the marked heroes choose where the ice will be) / the Avalanche (Grasp, then five lanes, one per column of sheets; every sheet in a lane that is not frozen is hit). **The Plateau Tips** is the wall at 10%: the Grasp and the Avalanche run twice (three times on Hard), then a Howl and a Fist as the seal falls. Last stretch until he falls or Endless Winter lands.
- **Hard-only moves:** **Glacial Stomp** (a stomp and two rings of shards; step into the quiet at his feet), **Breath of Winter** (a cone that freezes the sheets it crosses, then a burst breaks them), **Titan's Grip** (a ring on a hero; whoever it catches is held, and a stack frees them or they are crushed). Hard also shuffles each act's middle sets.

### Boss VII: Azerath, the Sunken Archmage, Master of the Seven Circles

*Set 2. Room: a 540-radius tower floor of seven circles of spellwork. Question: which element is it, and who holds the rune?* The rotating lab. Five acts on HP gates, all pushed, no wall. He floats in the middle and never walks. The floor is the middle circle (a seven-pointed star), two rings round it and four sigils at 270 from the middle (Fire north, Frost east, Lightning south, the Void west). Script `archmage.js`, art `archmage-art.js`.

- **The Rune Pair** (the set piece). Rune Mark puts runes of two different elements on two random non-tank heroes (a glyph over each head, a link between them). The spell named next in the feed is of one of the two elements and decides **together or apart**: *Cinder Rune* (fire) a spread circle on each bearer, apart (close at the lock and a reaction circle blooms between them), *Rime Rune* (frost) one blue stack halfway between, together, *Storm Rune* (lightning) a bolt from one bearer to the other, together makes it harmless, *Rift Rune* (void) a donut round each bearer, apart. `f.runePair` is read by the bots.
- **Act I Fire:** Arcane Burst, Arcane Lance (tankbuster), Pyre Rings (two of the three floor rings burn; the third is never painted), Cinder Rune. **Act II Frost:** Ice Lances, Rime Rune, Cinder Rune returning. **The Binding** (the seam): the sigils wake and three elementals are called one at a time; each follows the shield and must be led into the sigil of its own element and held there; one left alone blasts the room. **Act III Lightning:** Leaping Bolt, Storm Rune. **Act IV Void:** Void Rifts, Rift Rune, older moves mixed. **Act V Convergence:** all four sigils at once, each circle in its own element, with a reaction where two overlap; the clear floor is the diagonals by the wall and a small spot in the middle. Closing passes until he falls or The Tide Rises.
- **Hard-only moves:** **Counterspell** (the last spell's areas come again, thrown to the far side), **Rune Swap** (after the Mark the runes jump to two other heroes), **Arcane Mark** (a stack left where one hero stood; everyone must be in it). Hard also shuffles each act's middle sets, a third elemental in the Binding's pulses and a fifth jump in Leaping Bolt.

### Boss VIII: The Hydra of the Drowned Temple, Mother of Nine Heads

*Set 2, the last boss until the Void Gate exists, so the hardest. Room: a 540-radius flooded temple. Question: which head is which, and what do they want?* Many threats, one body. Three acts on HP gates (all pushed), a seam, and a wall at 10%. Script `hydra.js`, art `hydra-art.js` and `hydra-view.js`.

- **The Mother** sits in the pool at the middle and never walks: Mother's Cry (raidwide) and Rending Maul (tankbuster) every 13 s or so.
- **The heads are killable adds** (`inert`: they never walk or bite) on a ring round her, with nine solid cover columns behind them. They take turns, one after another, each aiming at a random hero. Eight elements: Acid Spray, Tidal Line, Venom Bloom, Flame Gout, Rime Crown, Stormcall, Stonegaze (everything the head can see; the columns are cover), Mire Spit. Lesser heads do the same at less damage; an Elder at more.
- **Searing.** A great head that falls leaves a bleeding stump and a blue tower at the foot of its column for about 10 s. Soak it and the head is gone for good; miss it and two lesser heads sprout (three on Hard, as Regrowth).
- **Order.** The first great head cut grows back as an **Elder** at the start of Act III, and the **Mother's Heart** replays the order every head was cut in.
- **Acts.** Three Heads (to 75%) / Six Heads (to 45%) / **the Submerge** (the seam: she dives for 15 s, the temple floods and slows everyone, five lesser heads break the surface at random columns one after another, then she surfaces with a Cry) / Nine Heads (to 10%). **The Mother's Heart** is the wall: the cut heads strike again from their stumps in the order they fell, then every great head still alive at once, then the Heart beats. Last Heads until she falls or The Drowning lands.
- **Hard-only moves:** **Regrowth**, **Tidal Dance** (two heads send lanes across each other three times; the wedges between are safe), **Hydra's Gaze** (a red circle over the whole inside of the temple: only the ground by the wall is safe). Hard also speeds the heads' round and draws which head stands where each pull.
- **Bots** pick heads in a fixed order (the heads breaking the flood, then lesser heads, then great ones the gentlest first); the searing towers go through the existing tower logic.

---

## 5. Progression

### Unlocks

- **Bosses open in order**: each boss opens once someone on the account has beaten the one before it (Vhalgrath after the Hollow King). A sealed boss is unnamed under a shroud.
- **Hard is gear-gated, set by set.** It unlocks for a set once every boss of that set has fallen on Normal, then opens one boss at a time (each Hard needs the previous boss's Hard first, starting with Grubnak and Vhalgrath).
- **Specs and the Barrow Gate** open after the Hollow King falls (see below). Talents are open from the start; rows VI and VII need a spec.
- **The town grows** after each boss's first defeat. Each defeat adds something (never announced in advance).

### Specializations

Each class picks one of two specializations, or keeps the base kit. 46 in all.
- **A spec reshapes the kit, it doesn't replace it.** It swaps one or two abilities and gives the signature mechanic a new purpose, still on Q W E R D F, Space and T.
- **The role stays the same**, so party building stays simple.
- **No lock-in**: switch freely on the hero page in town; the choice is saved per hero and sent to the group.
- **Balanced against the base class** within 5% (enforced by a check); a spec can aim off on purpose with `balance`.
- **A new look**: each spec draws extra gear or effects (`SPEC_ART` in `heroes.js`).
- **Bots play them too**: a bot fills its slot with the base kit or either spec, a third of the time each.
- **Earned, per hero**: specs stay sealed until any of the player's heroes clears the Hollow King on any difficulty (account-wide). That opens one trial per spec for every hero, and passing a spec's trial unlocks it for that hero for good.

The hero page shows the base class and both specs as tabs: what the spec specializes in, its passive, and every move it adds or changes (changed keys get a gold mark). A sealed tab is dimmed, a tab whose trial is open has a glowing blue diamond and a card with **Begin the trial**. Choose stays off for a spec that isn't unlocked, so you can read every spec before you earn it. `specs.js` holds `SPECS` and `kitFor(classId, specId)`, which lays a spec's changes over the base kit (cached); a replacement ability names the one it replaces (`replaces`), keeps its slot, borrows its icon until a painted one arrives, and honours that ability's gear enhancements. The spec rides on the `cls` message and the raid roster so every client draws the right look and cast effects.

**Spec trials** (`arena/trials.js`, 46 of them, one per spec). A trial is a short story vignette (about a minute) against the **Shade of the Hollow King**, drawn pale and cold, in his hall with his telegraphs; it opens on two lines of lore and ends on one more. It is built so the spec's trick is the natural answer, and there are no instructions. It is solo (the trial lends you that spec, with the bots the story needs), started from the Barrow Gate in town (which appears once any hero has cleared the Hollow King). A wipe shows "The memory fades" with **Try again**; a clear unlocks the spec for that hero for good and returns you to town. Trials drop no loot and don't count as boss clears. The raid id is `trial:<spec>` and `Save.recordTrial` records the clear (`trialsOpen`, `trialDone`, `specState`).

### Talents

Each hero has a talent tree of **7 rows** (23 heroes, 529 talents). Rows I to V are 3 talents each and belong to the hero (they work in both specs, with their own wording where a spec changes the move); rows VI and VII are 2 talents each and belong to the active spec (each spec keeps its own picks).
- **Unlocking** rows is with account gold, in order: **0 / 100 / 180 / 280 / 400 / 540 / 700** (row I is free; 2,200 for a full tree). You can read the next row you could unlock; later rows are sealed shapes. Rows VI and VII appear once the hero has a spec.
- **Picks are free** and can be changed or reset any time **in town**; the panel is read-only during a raid. Unlocked rows are kept on reset.
- **The rule:** a talent changes how you play, not how big a number is. Each hero has at most one plain-number talent (a cooldown or cast change); rows III and V each grant a **new move** that takes over one of the six buttons; every other talent changes a trigger, the gauge, movement, zones, a chain, a follow-up press, targeting, or how you answer the boss's casts. Spec rows follow the same philosophy (row VI is the spec's rhythm or guard, row VII its capstone).
- **Row themes:** I rotation, II survival or utility, III the class gauge (a granted move), IV the big cooldowns, V the capstone (a granted move with a signature shape on the field).
- **Numbers:** a single talent is worth at most +7% pro DPS, a full rows I-V build at most +18% and a full seven-row build at most +24% (`tools/talents.js`, enforced by `tools/check.js`; survival and utility talents read 0 by design).
- **Where:** the **Talent Trainer**, an old weapons-master just inside the Training Yard gate; **N** opens the same panel anywhere. Ability tooltips list the talents you hold on that move and a talented ability gets a small gold mark on its slot.
- **Bots take no talents.** Talents are client-side: they change what your kit does, never the host's HP or defence rules.
- **Where it lives:** `combat/talents.js` (`TALENTS`, `SPEC_TALENTS`, `TALENT_COSTS`, `talentText`); a talent is `{ id, name, ab, text, spec?, cd?, cast?, grants? }` and kits ask `k.talent('id')`; a `grants: true` talent puts its move (a self-contained entry registered in `kits.js`) in the slot of the move it replaces. Generic pieces talents use: `env.boss()` (the boss's cast state), kit movement (`teleport` events with `where`), `ABILITY_VFX` / `KIT_VFX` recipes, and `env.pos`. The authoring guide for adding a class's spec rows is in `talents.js`.
- **Saves** keep picks by talent id (`heroes[classId].talents = { rows, picks, ids, specIds }`), so reordering a tree never moves a pick, and a pick whose talent no longer exists clears (the row stays bought).

### Gear and loot

- **Slots:** weapon, armor and two accessories, per hero; each hero has their own bags and equipment (gold is the account's). Recruit gear (Common) is granted to every hero.
- **Stats:** HP, Physical, Magical (each class reads one), Defense, Haste, Critical. No MP and no movement speed. Gear is modest: best-in-slot is roughly +15 to 25% output, every stat capped (`GEAR_CAPS`: +180 HP, +160 Physical/Magical, +110 Defense, 12% Haste, 12% Critical).
- **Rarity is a property of the item:** each rarity is its own set of items, and power comes from rarity, not from the boss. A Grubnak Legendary is as strong as a Hollow King Legendary; bosses differ in themes, effects and party bonuses. **Set 2 is one step up**: its pieces carry 1.15x the budget of a set-1 piece of the same rarity and show 8 more item levels (`SET2_STEP`, `SET2_ILVL`), and its party bonuses come in a step early (two wearers get what set 1 asks three for).

  | Rarity | Colour | Stat budget | Item level | What it is | Sells for |
  |---|---|---|---|---|---|
  | Common | grey | 0.4 | 1 | Recruit starter gear only | 2 |
  | Uncommon | blue | 1.0 | 30 | a clean stat line | 8 |
  | Rare | purple | 1.15 | 33 | stats and a small effect | 15 |
  | Legendary | orange | 1.3 | 36 | a strong effect; every class enhancement lives here | 30 |
  | Mythic | red | 1.45 | 40 | a build-defining effect (two per boss) | 60 |

- **Effects** are data on the item (`fx`, `items.js`) run by a small hook set in the combat engine (`Kit.itemHook` / `Kit.fxMod`) in the wearer's own kit. Triggers: a critical hit or heal, a GCD, an oGCD, a heal or shield you cast, a dash, building your gauge. Conditions: always, HP above or below a fraction. Actions: an extra strike, mend yourself, a ward on yourself, seconds off your other oGCD cooldowns, a timed buff. Mods: damage, healing, crit, haste, shorter oGCD cooldowns (capped at 30%). Crit and oGCD triggers are evened out between classes (`ENGINE.FX_*`). An effect's own hits and heals never trigger effects. Bots wear no gear, so class balance is untouched.
- **Class drops (set 1):** each set-1 boss drops a weapon and armour for every class. The piece with an **enhancement** that changes one ability is Legendary (the ability gets an orange marker on the bar and a tooltip line); the other is Rare with the boss's small effect. Set 2 bosses drop general gear (weapons, armour, rings, charms, pendants, two Mythics each), with a few class weapons (Kenseier, Houndmaster) among them.
- **Chests.** A clear bursts the boss into a physical **chest** where it fell: 4 items on Normal, 5 on Hard. Each item rolls its rarity (Normal: Uncommon 55 / Rare 30 / Legendary 12 / Mythic 3 %; Hard: 30 / 40 / 22 / 8), then an item of that rarity from the boss's table (no doubles in one chest while there's a choice). Class items only roll for classes a human in the run plays. The chest holds at most 12.
  - **Taking:** anyone who was in the raid opens it (click it, or the Spoils panel that opens with the results) and takes what they like, first come first served, into the bags of the hero they raided with. Anyone can also put an item of their own in, to trade; someone else takes it out. When the raid ends, what's left is salvaged into a little gold for each player (Uncommon 2, Rare 4, Legendary 8, Mythic 15 per item), and anything a player put in goes back to them.
  - **Messages:** host to all `chest`, `cst`, `cgot`, `cputok`, `csalv`; player to host `ctake`, `cput`, `cack`. The chest is sent again once on a rejoin if the player never confirmed it; a tab never opens the same chest (or collects its gold) twice. Bots don't loot. The Raid Board's Loot tab shows each item's chance per chest for the classes in the party (`chestChances`).
- **Gold** is one wallet for the account (the save). A clear pays everyone in it: Grubnak 40, Skitterra 45, Volkar 50, the Hollow King 60, Vhalgrath 65, Hrimgar 70, Azerath 75, the Hydra 85; Hard doubles it. Wipes, practice runs and trials pay nothing. The host decides the amount and sends it with the chest; each player adds it to their own save. Items sell in the inventory; Legendary and Mythic items, and anything another hero wears, ask to confirm.
- **Party bonuses** (`PARTY_BONUS`): when 2, 3 or 4 people in the group each wear at least one item from the same boss, the whole party (bots too) gets that boss's bonus for the fight. Someone wearing gear from two bosses counts toward both; recruit gear has none. Each player tells the host which bosses their gear comes from; the host counts the humans when the raid starts. Gear is locked inside a raid. Damage, crit and haste go into everyone's party modifiers; max HP is applied by the host. Shown as a gold chip in the buff row. The eight bonuses: Kitchen Crew (Grubnak), Brood Bond (Skitterra), Stormbound (Volkar), Court of the Barrow (the Hollow King), Cinder Pact (Vhalgrath), Frostbound (Hrimgar), Circle of Seven (Azerath), Nine Heads (the Hydra). Each is a small mix of max HP, damage, crit and haste.
- **Saves** are versioned (`save.js`, currently v4) with step-by-step upgrades and a backup before each. Items with a key the game no longer knows are kept aside (`inv.lost`), never deleted.

---

## 6. Multiplayer and networking

**Topology.** One tab hosts and acts as the server; everyone else joins by a 4-letter room code over WebRTC (PeerJS, `client/js/net.js`; a room holds up to 8, a raid takes the first four heroes). A host runs the `RaidHost` (the fight sim, the bots, and the routing of combat events). Solo ("Play solo with bots") needs no internet: you host a private room and bots fill the party. The game is plain static files: every push to `main` publishes `client/` to GitHub Pages (`.github/workflows/pages.yml`), and `server/server.js` is the local dev server.

**Bots.** The raid board has a "Fill empty slots with bots" option. Bots use the real class kits with a competent-player priority (`bots.js`), wear no gear and take no talents, and choose the base kit or either spec at random unless a test line-up says otherwise. A bot's class is picked by `pickBots` from a role-based preference list.

**Authority and messages.** Players send their own position (with a sender clock), casts, and combat events (damage, heals, shields, class events); the host applies them and broadcasts the results: the boss update (10 per second), the party update (5 per second, with HoTs), `bots`, `adds`, telegraph and mechanic messages, `bnext`, `props`, `roomev` and the class-specific ones listed above. Heartbeats run every 3 s and a silent player is dropped after 15 s. The host's fight keeps running when its tab is in the background (a Web Worker timer); only the host's own hero stands still.

**Smooth motion.** Other players, bots, the boss and adds are drawn about 0.15 s in the past and blended between updates (`interp.js`). Every update carries the sender's own clock, and updates are spaced by that clock, not by when they arrive, which keeps speed steady over a wobbly connection.

**Mid-raid reconnect.** A joined player whose link drops mid-raid keeps their slot for **60 s** (`HOLD_MS`):
- The host stands a **bot in for their hero** (`RaidHost.standIn`, under the player's own id, so the sim's health, shield and tally carry on and clients draw it as that player). The party sees "lost their connection. A stand-in plays their hero."
- The tab **auto-rejoins** quietly for 70 s (`REJOIN_MS`), carrying its join token. The host's reply says at once if the slot is gone ("Your place in the raid is gone."). A strip at the top shows "Connection lost. Rejoining..." and "Back in the raid."
- On return the stand-in steps out, the hero is handed back where the bot left it, and the host sends a full **snapshot** of the fight (`RaidHost.snapshot`, replayed through the usual handlers with each message's age so a half-grown telegraph is half-grown; sounds and effects of things that began before the player looked are not replayed). A loot chest the player never confirmed is re-sent once, and never paid twice.
- **Resync** (Options, or a key you bind): ask the host for the same snapshot without leaving, at most every 2 s.
- If the host disappears, guests go back to the join screen ("Lost connection to the host."), keeping their hero, and can rejoin, host or go solo straight away. Someone who leaves mid-raid shows as "Left" on the party frames.

**Drop in as your last hero.** The game remembers your last class and spec (`lastHero` in the save) and starts you as them on solo, host or join; the hero select opens only the first time.

**Raid flow.** The portal opens the Raid Board (pick the boss, Normal or Hard, whether bots fill). In the arena the party has the room to itself until someone hits the boss or a pull countdown is started (`waitPull`), so the party can buff and position. A host-only **Practice Hall** starts a boss from a chosen act (earlier acts are passed over; no loot). After a fight a results screen shows everyone's DPS, HPS, damage taken, avoidable hits, deaths, a personal report (GCD uptime, positionals, overcap, wasted procs, cancelled casts, damage inside raid buffs, class stats), contribution points and an MVP with awards (`arena/scoring.js`); the host can retry or take everyone back to town.

**PvP Arena** (`arena/pvp.js`, `pvp-bots.js`, `pvp-ui.js`; plan `docs/plans/2026-10-pvp-arena.md`). The Arena building in town opens a lobby for duels (1v1), team fights (2v2) and capture the flag. There is no boss and no reward. `PvpSim` extends `FightSim` to reuse player state, shields, mitigation and class hooks; a player's hit is cut (`PVP.DMG`, with a per-class factor) and no single hit takes more than 12% of a target's max health, an Ultimate included. A round is 100 s (duel) or 130 s (team) plus 30 s of sudden death in which damage taken rises 6% a second and healing received is halved. Bots fill the empty slots.

---

## 7. UI

**Town.** A hub the party walks around: the Barkeep opens the hero select, the Talent Trainer talents, the sparring dummies and DPS meter are for practice (the red dummy swings every 2.8 s like a raid boss so tanks can practise defensives), the Practice Hall, the portal's raid board, the bounty board and the Arena. Between pulls there are pastimes (`pastimes.js`): feats and titles (the logbook, **L**), town secrets, a weekly bounty board, fishing, feasts, and townsfolk who react to the bosses you have beaten. A tutorial (opt-in, from the Raid Board) covers every lesson worth knowing before a pull and a briefing per boss; the boss **journals** (**J**) tell, in each hero's own voice, the real way to survive each boss move (1 to 3 sentences per hero per move). Tooltips are in-game only (`ui-tip.js`, never the browser's `title=`).

**Hero select.** Opens right after joining (and from the Barkeep, a hero on the deck, or the hero name top-left). One band per role, each a grid of compact tiles that wraps; built from `CLASSES` and `ROLES`, nothing hard-coded per class. The detail page shows flavour text, an animated portrait (or a painted bust from `client/portraits/`), the passive (the signature mechanic), the Q W E R D F Space T icons with tooltips, and Tips & Combos (`hero-guide.js`).

**Camera and scale.** The camera fits about 960 world units of height, leans toward you far enough past a wall to show the scenery, and never lets you sit under the ability bar or boss plate; the wheel zooms out to 0.8. Heroes are drawn at 1.85x in the arena (1.5x in town) so they read next to the boss; hitboxes are unchanged.

**Battle UI.**
- **Boss plate:** name, mode, timer; an HP bar with ticks at each gate and a pale trail behind damage; a cast bar that flashes when the cast goes off; what's on the boss as small icons with seconds left (Hunter's Mark, a damage-up, a taunt's fixation, the Inquisitor's brand, the last 60 s before the enrage, your own DoTs); and the **upcoming moves** (next 2 to 3 with countdowns, from `bnext`). A wall shows as a gold notch and a labelled pip.
- **Party frames** (top left, in role order, keys 1-4; docked above the skill bar for healers by default): role mark, name, an eye on whoever the boss is attacking, class; an HP bar that turns amber below 60% and red below 35%; a trail on a hit that just landed; shields as hatched white; HoTs as icons of the ability that cast them; mitigation, Damage Down, Vulnerability and boss debuffs as small chips with tooltips; a pip for a full Ultimate. Healers' frames show **missing** health instead.
- **In the world:** a locked heal target gets green corner brackets and a chevron; the soft target a dashed ring; a thread of light runs from a healer to the ally they're healing. Over-head HP bars show shields.
- **Targeting:** Tab / Shift+Tab cycles enemies nearest-first. The locked target gets a rotating reticle and a target frame.
- **Class HUD** (`combat/hud.js`): the ability bar with cooldown sweeps and glows, the class gauge, cast bar, buff tracker, the T slot with its charge ring.
- **Limit gauge and raise counter**, the live DPS meter (**M**), pings and chat, the death recap, and a debug overlay (**F3**) with frame rate, ping to the host, messages per second and boss update age.

**Options (K, or Esc with nothing open).** Four tabs at one fixed size: **Keys** (every skill and panel, with class-only keys shown only for that class), **Interface**, **Audio**, **Data** (Resync lives here). The HUD layout is arrangeable and remembered.

---

## 8. Code map

| Area | Files |
|---|---|
| Combat engine (GCD, oGCD, queue, casts, DoTs, procs, pacing, Ultimates, stats) | `client/js/combat/engine.js` |
| The kits | `client/js/combat/kits.js` (`KITS`, `TAUNT`, `ULTIMATES`, `TALENT_ABILITIES`) |
| Specializations | `client/js/combat/specs.js` |
| Talents | `client/js/combat/talents.js`, `client/js/talent-panel.js` |
| Kit-to-world bridge (player and bots) | `client/js/combat/actor.js` |
| Class gauges, ability bar, cast bar, buffs, move-text numbers | `client/js/combat/gauges.js`, `hud.js`, `numbers.js` |
| Host fight sim (HP, aggro, mechanics, deaths, adds, props, courses, class host rules) | `client/js/arena/fight.js` |
| Boss scripts | `client/js/arena/bosses/*.js` (one per boss) |
| Room shapes and telegraph shapes, props | `client/js/arena/shapes.js` |
| Bots and the raid host (bots, stand-ins, snapshot, event routing) | `client/js/arena/bots.js`, `raid-host.js` |
| Arena drawing, boss tells, class stagecraft (threads, Dolls, hounds, lanterns) | `arena/arena-view.js`, `boss-tells.js`, `stagecraft.js`, `kennel.js`, `lanterns.js`; boss and add art in `bosses.js` and the per-boss art files |
| Spec trials | `client/js/arena/trials.js`; the Barrow Gate in `barrow-gate.js` |
| PvP Arena | `client/js/arena/pvp.js`, `pvp-bots.js`, `pvp-ui.js` |
| Contribution scores, MVP, awards | `client/js/arena/scoring.js` |
| Smooth motion for networked units | `client/js/interp.js` |
| Networking (PeerJS, hold, rejoin) | `client/js/net.js` |
| Scenes, input, hero select, targeting, raid start/retry/leave, loot, snapshot | `client/js/main.js` |
| Boss plate, party frames, results, meter, upcoming feed, Limit gauge | `client/js/raid-ui.js` |
| Options, keys and the HUD layout | `client/js/keybinds.js` |
| Ability and boss visuals | `client/js/vfx.js`, `ability-vfx.js`, `boss-vfx.js`, `fx.js`, `draw-util.js`, `heroes.js` |
| Items, rarities, effects, loot tables, chest rolls, party bonuses | `client/js/items.js` |
| Chests | `client/js/loot.js` |
| Inventory | `client/js/inventory.js` |
| The versioned save | `client/js/save.js` |
| Town, pastimes, feats, bounties, story, secrets | `town.js`, `town-life.js`, `town-npcs.js`, `town-secrets.js`, `pastimes.js`, `feats-data.js`, `feat-rules.js`, `bounty-data.js`, `fish-data.js`, `story-data.js`, `pings.js` |
| Guides, tutorial, boss journals | `hero-guide.js`, `tutorial.js`, `tutorial-data.js`, `journal.js`, `client/js/journal/*.js` |
| Sound: engine, procedural library, event map, game hooks, voice lines, captions | `audio.js`, `sfx-synth.js`, `sfx-map.js`, `sound-hooks.js`, `voice-lines.js`, `captions.js` |
| Tooltips | `client/js/ui-tip.js` |
| Debug overlay (F3) | `client/js/debug-overlay.js` |
| Hosting | `.github/workflows/pages.yml`; local dev server `server/server.js` (port 3000) |
| Tools | `tools/check.js`, `simulate.js`, `bot-raid.js`, `talents.js`, `stamp.js`, `journal-lint.js`, the class tests (`hollow-test.js`, `kenseier-test.js`, `houndmaster-test.js`, `thresher-arc-test.js`), `rejoin-test.js`, `pvp-sim.js`, `feats-test.js`, `tools/audio/`, `tools/vfx-gallery/` |

Line endings differ by file (some CRLF, most LF; check `git ls-files --eol` before editing and never convert a file). Art is drawn in code on canvas; painted icons and portraits are optional overrides listed in `client/icons`, `client/portraits` and `client/items/manifest.json` (an item id goes in the manifest only after its PNG exists). Briefs for the painted art are in `docs/art/`; audio notes in `docs/audio/`.

---

## 9. Testing

**One command checks everything automated:** `node tools/check.js` (`npm run check`, about 3 minutes). It must end with "All checks passed" before any push. It runs:
- a parse of every script, the data and shared math (classes, items, enhancements, talents line up with the kits, arena clamping, network smoothing, props: solid, cover, throws, chipping);
- items: loot tables and chest sizes and odds, effects use known hooks, the party-bonus maths, a v1 save upgrades without losing an item;
- class DPS against `tools/check-baseline.json` (+/-8%), every spec within 5% of its class, every talent under +7% and full builds under their caps;
- the contribution scores, the feats, the boss journals (`journal-lint.js`), and the cache-busting stamps (`tools/stamp.js` stamps every script and stylesheet in `client/index.html` with `?v=<hash>`; the check restamps it, so commit the changed `index.html` with the change);
- **choreographed timelines** for every boss on Normal and Hard: no `f.loop`, no hidden telegraph, every step named, nothing avoidable shown for under 1.2 s, no more than 16 s between named steps, a raidwide at least every 150 s and a tankbuster every 180 s, the upcoming-moves feed always three deep, and the script 480 to 600 s long when each course ends as its sets do;
- bot clears of every boss on Normal: fixed line-ups that together cover every class and spec, each cleared at least once in three runs (Normal is meant to cost a real group wipes; some lines get more tries), set 2 at the gear levels they're tuned for;
- one Hard smoke run per boss: the script runs without errors and the bots last at least 90 s;
- every spec trial (a bot playing the spec passes it);
- class-specific tests: the Gloomsworn's Hollow, the Kenseier's deflect and Posture, the Houndmaster's hounds;
- the dropped-link test (`rejoin-test.js`: hold, rejoin, snapshot hold for every boss), a few PvP bot matches.

After an intended balance change, record the numbers with `node tools/check.js --update-baseline`.

**Other tools.**
- `node tools/simulate.js [class]` plays every class as a newbie and as a pro on a dummy and prints DPS and HPS (sloppy play should keep about 70% of an expert). It never presses T.
- `node tools/bot-raid.js [normal|hard] [runs] [boss] [classes...]` runs headless bot raids. `GEAR=fresh|mid|full|post1|post2` gives the bots representative gear, `SUMMARY=1` prints one line, `seed=N` picks another seed set. Base-gear runs are unrealistically weak. **Set 1 Hard is tuned at `GEAR=mid`** (about 45 to 60%); **set 2 is tuned for a party that cleared the earlier bosses**: Normal at `post1` (set 1 cleared on Normal and Hard, about 85 to 90%), Hard at `post2` (plus set 2 Normal drops, about 50 to 60%) and, harder, Hard at `post1` (about 40 to 45%). Set 2 gear is one step up. Bot clear rates swing about +/-10 points between seed sets, so tune on 90 runs (three seed sets of 30).
- `node tools/talents.js [class]` measures each talent and full builds.
- `node tools/audio/coverage.js` checks that every ability and boss move has a distinct sound; `node tools/audio/render.js --only <name> --write-trim` renders and levels new recipes.
- `node tools/journal-lint.js` checks the boss journals (no digits or spelled-out times, 1 to 3 sentences per hero per move, every hero in its own voice; `docs/plans/journal-voices.md`).

**In the browser.** The preview pane does not run the game loop reliably when hidden. Drive frames with `window.__game.step(dt)` and `raidHost.tick(0.05)`, and spy on `Sound.play` to check sounds. The `emberfall.unlockAll` local-storage flag opens everything for testing; remove it when done. `localhost:3000` is shared with other tabs and agents, so pin every call to your own tab.

**Known gaps.** The automated tests cover logic and bot play; they do not cover real network conditions or a human at a keyboard. In particular, mid-raid reconnect is tested with simulated drops, not over real latency; the host judges positions and facing from updates that arrive about 12 times a second, so very late reactions (a last-moment turn for a Gaze, a dash against a reel) can count a little late on a slow connection; and every boss is balanced against bots, whose clear rates are a guide to a human group, not a measure of it. Two or more real machines over the internet (latency, NAT traversal) and a full human party across a whole fight remain the real test.
