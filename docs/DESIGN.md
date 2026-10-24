# Emberfall: Design Document

A four-player co-op raid game (tank, two DPS, healer) in the browser. You meet in a town, pick a hero at the tavern, and step through a portal into an FF14-style boss fight: the boss mostly holds the middle of the room, and the challenge is reading its attacks, moving as a team, and playing your class well under pressure.

This document covers the combat rules, all twelve class kits, and all four bosses. It also records what was built, what was tested, and what still needs testing. The research behind the design is in `docs/research/`:
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

**Controls:** right-click to move. Left-click interacts in town, or picks an ally to heal in the arena. **Q W E R D F** are the six skills, **Space** is a shared dash (2 charges, 12 s each), **T** is the hero's Ultimate (see "Ultimates" below), **1–4** target party members, and **`** locks the most hurt ally (again to cycle). **I** opens the inventory and **N** your talents.

**Threat and taunt** (host-side, `client/js/arena/fight.js`):
- Threat is damage dealt × 2.75 for tanks (× 1 for everyone else), plus 20% of healing done. It fades by 5% a second, so what counts is roughly the last 20 seconds. It only decides between tanks (and who he turns to once every tank is down).
- **The boss stays on a tank while one stands** (October 2026 rework, `FightSim.tank()`): he attacks, faces and aims his tankbusters at a living tank, the one with the most threat (or a taunt's fixation) when there are two. Damage and healing from anyone else never pull him. With every tank down he goes for whoever has the most threat, and a raised tank takes him straight back. Adds keep their own threat (from damage dealt to that add, with the same tank multiplier) and go for the nearest player until someone hits them.
- Death wipes your threat; a raise starts you again from zero.
- **Taunt (tanks only, every spec), carried by one of the tank's own buttons** (`TAUNT_CARRY` in kits.js: Bastion Brace, Bloodreaver Bloodletting, Runeguard Rune Strike, Ironpalm Read, Gorgemaw Open Wide, Oathbroker Renegotiate; a spec's or talent's replacement of that button carries it too). It is smart: pressing the carrier taunts only when the taunt is off its 20 s cooldown and the enemy you face is on someone else (`Kit.resolve` calls `env.taunt`; the worlds in main.js and raid-host.js decide). A small mark over the carrier shows it ready, and its seconds while it cools. 500 range, aimed at the carrier's target, or the enemy you face. Your threat becomes 10% above the highest, and the boss stays on you for 3 s even if someone out-threats you in that time; an add stays on you for 6 s. Each tank's taunt is its own move with a small gauge tie-in (in the class tables below). The host checks the cooldown, and clamps any threat multiplier a client sends to 0–3.
- Bot tanks taunt back, after a moment's reaction, when the boss or an add is on someone who isn't a tank: they press the carrier (`RaidHost.botTaunt`), and only that press taunts; if the carrier can't go (no charges, out of reach) they taunt directly so they still hold the boss. (A boss on a non-tank only happens while every tank is down.) Bot DPS no longer ease off for threat.
- (Before the October 2026 rework, when DPS could pull the boss) Tuning test (bot raids, the bot tank stops attacking and never taunts while idle): inside the party's 60 s burst windows it loses the boss after 3–6 s; outside them after 7–11 s. In normal play the top DPS sits at about 70–75% of the tank's threat and the bot tank taunts 1–3 times a fight; with taunts switched off a DPS held the boss for 8–33 s of a fight. With the old setting (× 5, no fade) the top DPS sat near 40% and an idle tank never lost it.

**Ally targeting** (for healers), in order of priority:
1. Shift + the heal key: yourself;
2. the party frame under your mouse;
3. the ally your mouse is right on top of in the world (mouseover);
4. the ally you locked (clicked, 1–4, or **`** for the most hurt);
5. the ally nearest your cursor;
6. yourself.

A green dashed ring always shows who your heal will land on. Healers get the party frames docked above the skill bar by default; the small button on the frames moves them to the top-left corner (remembered per role).

**Authority:** each player runs their own kit locally and reports damage and heals to the host. The host's fight sim owns boss HP, player HP, threat, mechanics, deaths, and the HP history Rewind needs.

### Ultimates (T, slot 7; added 2026-10-21)

Every class gets one button on **T** that always feels great to press: a big payoff built up through that class's **own** loop (no shared meter). **Damage** classes press it to open a 6-10 s **window** in which bar buttons swap to empowered versions (FF14 job-gauge payoff: Bahamut, Ogi); **tanks and healers** get an **instant** Ultimate, one big timed party moment. Built so far: **Bastion · Last Bastion** (instant) and **Pyromancer · Phoenix Dive** (window), the reference implementations; the other 15 classes have nothing on T yet (no T slot).

Rules: charge 0-100 in `k.g.ult`, capped, never decays; a pro fills it in about 90 s, a newcomer in about 120 s (measured in tools/simulate.js: Bastion 84 / 125 s, Pyromancer about 93 / 130 s); the kit loop supplies most of it, a passive trickle (`charge.rate`, about 35% of the pace, only while fighting) the rest; a fall keeps half (`charge.keep`); no charge while a window is open. The press spends all of it. It has a short animation lock (`lock`) during which the caster takes `dr` less damage and can't be knocked back (`Kit.ultSteady`; main.js ignores `kb` for you, raid-host.js for bots). Every hit stays far under the host's 15000 clamp (fight.js). Exact numbers live only in the tooltip ({d:N} {h:N} {s:N} tokens, numbers.js).

**Data** (kits.js `ULTIMATES[classId]`, next to `TAUNT`; attached as `KITS[cls].ultimate` at the end of kits.js, so every spec and talent kit carries it; never in `abilities[]`, which stays six):

```js
ultimate: {
  id, name,            // id: lowercase letters, at most 16 (it goes over the network as `a`)
  slot: 7, type: 'ogcd', ult: true,
  mode: 'instant' | 'window',
  target: 'self' | 'enemy', range, anim: 'big', icon,   // icon: the ability icon it borrows until icons/<class>/<id>.png is painted
  lock, dr,            // animation lock (s) and the damage reduction during it
  charge: { rate, keep, gain: { gaugeKey: perPoint }, spend: { gaugeKey: perPoint } },
                       // rate: %/s while fighting; gain/spend: Kit.gain()/Kit.spend() on that gauge feed it automatically
  desc,                // the tooltip, with tokens
  effect(k, target),   // the moment itself (instant), or the opening hit (window)
  window: {            // mode 'window' only
    dur,               // seconds
    over: { <base ability id>: { fxId, name, desc, ...any ability fields to override (cast, recastGcd, glow, effect) } },
    onEnd(k),          // runs when the window closes (not on a death)
  },
  burst,               // optional: a buff id; a bot opens its window while that buff is up
}
```

Worked example, instant (Bastion · Last Bastion): `{ id: 'lastbastion', mode: 'instant', target: 'self', icon: 'bulwark', lock: 1.0, dr: 0.3, charge: { rate: 0.4, keep: 0.5 }, effect(k) { k.mitigate('party', 0.25, 8, { ab: this }); k.after(8, () => { k.damage(1600, { ab, threat: 2 }); k.heal('party', 200, { ab }); k.fx('bastion-slam'); }); } }`. Charge: `k.ultGain(4.5)` on every Perfect Block (bastion `onNotify`), and `bastionUltHits(k)` once a second: up to 3 for the hits taken in that second (12 per 100% of max HP).

Worked example, window (Pyromancer · Phoenix Dive): `{ id: 'phoenixdive', mode: 'window', target: 'enemy', range: RANGED, icon: 'combust', lock: 0.8, dr: 0.3, burst: 'combust', effect(k) { k.damage(900, { ab: this }); /* an active Combustion burns 4 s longer */ }, window: { dur: 8, over: { fireball: { fxId: 'phoenixflame', name: 'Phoenix Flame', cast: 0, recastGcd: 1.8, effect(k) { k.damage(420, { ab: this }); k.gain('heat', 6, 100); } }, pyro: { fxId: 'phoenixblast', name: 'Phoenix Blast', cast: 0, recastGcd: 1.8, effect(k) { const hs = k.consume('hotstreak'); k.damage(hs ? 820 : 640, { ab: this }); k.gain('heat', 8, 100); } } }, onEnd(k) { k.damage(500, { ab: k.ult }); k.fx('phoenix-rebirth'); } } }`. Charge: `k.ultGain(4)` per Hot Streak (pyromancer `onDamage`), `k.ultGain(heat / 13)` when Vent spends Heat.

**Engine** (engine.js, `Kit`): `k.ult` (the def), `k.ultCharge()`, `k.ultFull()`, `k.ultWin` ({ start, end, dur, ab } while a window is open), `k.ultLeft()`, `k.ultSteady()`, `k.ultGain(n)` (also the global helper `ultGain(k, n)`), `k.ultDeath()` (CombatActor.onDeath). `press(7)` resolves to the Ultimate; `usable()` needs it full. On resolve `ultFire` spends it, emits the `ult-spent` moment (and `ult-ready` when it fills: both go out as `kfx`, which is how party frames show the ready pip), steadies the caster, and for a window swaps `k.abilities` to empowered copies (`ultOver(ab, over[id], ult)`: the base move with the override on top, **same id**, so cooldowns, charges, talents, item perks, bot logic and `opts.ab.id` checks keep working; `ultOf` marks it, `fxId` names its look). `k.baseAbilities` is always the plain bar; queued presses follow their slot. Other clients find an Ultimate or an empowered move by id or fxId through `abilityById` (specs.js) -> `ultAbilityById(def, id)`. The cast is always instant (castStart is limited to slots 0-5); a window's empowered moves use the normal slots and cast path.

**Look** (ability-vfx.js, bottom block): `ABILITY_VFX[class][ult.id]` and `[fxId]` for each empowered move; moments that land later are `KIT_VFX[name]` (name `[a-z-]{1,16}`, `atTarget` when they land on the enemy). FX.cast passes `c.cam` only for your own hero (`FX.camFor`): `c.cam.dim(a, dur)` (the world darkens under the effects), `c.cam.stop(dur)` (a cosmetic hit-stop: only the VFX clock slows, never `now`), `c.cam.punch(amount, dur)` (a small push in toward the caster) and `c.cam.flash(color, a, dur)`; main.js `screenFlash / screenDim / zoomPunch / hitStop` implement them. Everyone else's Ultimate plays at 0.6 with no camera. Recipe shape: a 0.3-0.5 s wind-up, one impact (stop + punch + flash there), a mark on the floor that lingers as long as the moment; your own Ultimate's hit is the one big number (main.js onMyDamage). VFX blocks added for these: `VFX.phoenix`, `VFX.emberWings`.

**HUD** (hud.js): the T slot shows only for a hero with an Ultimate: a thin charge ring (`.slot.ult .ring`, `--ult` 0..1), the icon desaturated while charging, one soft glow and a single cue animation when it fills, the seconds left (and a draining ring) while a window is open; empowered moves get a warm rim (`.slot.empowered`). Party frames show a tiny pip (`.pf.ult`) for anyone whose Ultimate is full. The hero page lists it as the eighth key; the help line and Options name it.

**Bots** (bots.js `BotAI.ult(bot, k, view, ctx)`, called each tick from RaidHost.tickBots right after the taunt): damage classes open the window when the party has a damage buff up, in a damage check, under 15% boss HP, inside their own burst (`ult.burst`) or after holding it 20 s; tanks just before a tankbuster aimed at them (under 3 s) or in a heal check; healers when 3+ allies are under 60% or a raidwide is next in the feed (under 6 s); tanks and healers never hold one more than 35 s. tools/simulate.js stays single-player and never presses T, so the pro DPS baselines don't include Ultimates.

**The healers' Ultimates** (kits.js "HEALER ULTIMATES", after the Threadweaver's kit; looks in ability-vfx.js "ULTIMATES · healers"): all instant, each landing 0.4 s after the press (`HEAL_ULT_LAND`, on its recipe's impact) as a party heal plus a blow on the boss that ties the kit's separate buttons together. **Cleric · Dawn Breaks**: heals the party {h:600} + {h:150} per Petal held and a {h:80} regen for 12 s, smites for {d:1200} (+{d:1425} when a ready Dawnstar goes up with it), then all three Petals grow back; charged by Petals spent (5.5 on someone below 90%, 2 above; an Aegis 40% of that), Mends (1), Dawnstars (8, 16 in the party's burst) and Smites (0.5) through `clericUltGain`. **Grovekeeper · World Tree**: party {h:450}, a 180 px canopy that heals {h:110} every 1.5 s for 12 s (a vial-style floor pool: a `splash` with ticks, so it never replaces a Moonwell), {h:300} more on every Rejuvenated ally, roots for {d:900} or {d:1400} with Thornlash on (which starts over), +50 Bloom; charged by Rejuvenate ticks (the Bloom gain map), Bloom spent (the spend map), Thornlash ticks and Wraths while it's on (onDamage). **Chronomancer · Time Reversal**: a `rewind` with target `'party'` (fight.js: every living ally back to their best HP of the last 6 s, at most `pct` 40% of max HP each, nobody revived), at least {h:300} each, {d:900} on the boss and a 2.5 s **Time Stop** (the event's `dur`; fight.js `pauseBoss`: the course's own steps (`at` events laid by `course()`, flagged `step`) slide 2.5 s later with the course's seams and end and the feed, which holds its count (`bnext` entries `[name, secs, 1]`); the boss freezes (no walking, turning or autos, its swing timer held; frosted, its pose stopped, a stopped clock on the floor, an hourglass under its bar). True time for everything already under way: telegraphs, puddles, towers, tethers, rollers, adds, the running cast (its hit is already out), follow-ups inside a move (`after`/`afterKeep`), the hard enrage and damage/heal checks. Refused (`pauseBlock`) in a phase change or interlude (a course without an HP gate, or whose gate has fired), once the soft-enrage passes are due, near or in the enrage, in a damage or heal check, while untargetable, within 20 s of the last stop's end (`BOSS_PAUSE`), and when the script says so (`f.noPause`: the Hollow King's Royal Doom and the Long Night); Skitterra's brood clock follows its steps (`f.onPause`)), then Recall ready, Stasis 30 s closer, full Flux and Haste with two instant Bolts; charged by the Flux Haste burns (chronoFlux), Bolts cast in Haste and Rewinds. **Alembist · Magnum Opus**: party {h:500} + {h:80} per held vial (times its ripeness), a {s:250} party shield, {d:1000} + {d:200} per held vial; the vials are not used up but all ripen, and the Kiln lights; charged per vial thrown (`alemUltThrow`: ripe more, a cure more on someone hurt and less on someone healthy) and Kiln Bombs. **Threadweaver · Grand Loom**: party {h:350} + {h:120} per thread held, {d:500} + {d:300} per thread, then a 6 s Tapestry (never cutting an open one short: `g.tapUntil`) and +35 Spool; charged by the Spool gain map (damage the threads carry), Shuttle strikes and Needle tugs. Fill times (simulate, pro / newbie): Cleric 94 / 108 s, Grovekeeper 88 / 105, Chronomancer 88 / 107, Alembist 102 / 111, Threadweaver 86 / 116 (specs within about 10 s, except the Aegis 82 / 131). Bots: an Ultimate marked `after: true` (Dawn Breaks, Time Reversal: they heal what already happened) waits for 3 allies under 60% (or 2 with one under 35%) instead of firing ahead of a raidwide.

**Adding the next class:** write `ULTIMATES[cls]` (pick 2-3 places in the kit's loop for `k.ultGain`, measure the fill with simulate's runSim, aim for about 90 / 120 s), its recipes in the Ultimates block of ability-vfx.js, and (for a procedurally drawn class, `art.icons === false`) an icon drawer for its id in hud.js ICON_GLYPHS. Nothing else needs touching.

## 3. The twelve classes

Each class has 6 skills plus the shared dash. **GCD** skills share the global cooldown; **oGCD** skills have their own cooldowns and can be woven between GCDs. Potency × 10 ≈ damage.

### Tanks

**Bastion, Shield Knight** (difficulty ◆◇◇). Signature: **Perfect Block**. Gauge: shield (Resolve).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Blade Chain | GCD | Strike → Riposte → Judgment on one button (220/300/400). Judgment gives +25 Resolve (+50 during Oath). After a Perfect Block it glows: the next hit counters for +150. |
| W | Holy Edge | GCD | Spend 50 Resolve: 560 (720 during Oath), range 260, small self-heal. Free after a Perfect Block on a tankbuster ("Turned Aside", 10 s). |
| E | Brace | oGCD | 2 charges, 7 s each: 25% less damage for 3 s. Brace within 0.8 s before a hit lands for a **Perfect Block**: 60% less damage, +20 Resolve, and the counter. A Perfect Block on a tankbuster also gives the charge straight back and makes the next Holy Edge free. Glows in the last 0.8 s of a cast aimed at you. |
| R | Oath of Valor | oGCD | 60 s burst: +10% damage for 15 s. |
| D | Rally Banner | oGCD | Takes up to 50 Resolve: the party takes 15% less damage for 12 s, +1% per 5 Resolve put in (25% at 50); every Perfect Block under it gives +10 Resolve (90 s cooldown). |
| F | Bulwark | oGCD | 40% less damage for 10 s, and Brace's charges refill (120 s cooldown). |
| (Brace) | Challenge | taunt | Carried by Brace (20 s cooldown). Steel on the shield: +10 Resolve, and the next Blade Chain counters for +150, as after a Perfect Block. |

*Floor:* combo, Holy Edge when it glows, Brace when you see the swing. *Ceiling:* time Brace to the boss's wind-up (the boss visibly raises its weapon before every auto-attack), pool Resolve for Oath, plan Banner and Bulwark onto known hits.

**Bloodreaver, Berserker** (◆◆◇). Signature: **Crimson Drain timing**. Gauge: heart (Blood).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Hack / Maul | GCD | Two-hit combo, 240 / 340, builds Blood. |
| W | Crimson Drain | GCD | Spend 40 Blood: 300 + up to 700 potency (1 per 25 damage) from **the bank**: the damage taken since the last Drain, 6 s at most (shown under the heart). Heals for 35% of the bank (minimum 8% max HP). Free and +120 during Frenzy. Glows on Frenzy's/War Cry's/Undying's free Drains, at 90+ Blood, or once the bank holds 20% of max HP (no more "damage in the last 6 s" glow: back-to-back Drains no longer double-dip a buster). |
| E | Bloodletting | oGCD | 2 charges, 15 s each: 220 and +20 Blood. |
| R | Frenzy | oGCD | 60 s burst: +15% damage, and the next 3 Drains are free and stronger. |
| D | War Cry | oGCD | Party shield of about 14% HP (90 s cooldown). The next Drain within 15 s is free and heals the party for a quarter of what it heals you. |
| F | Undying | oGCD | Can't drop below 1 HP for 8 s; self-heals doubled (150 s cooldown). While it lasts Drains are free and every hit taken gives 1 Blood per 1% max HP (so empty the gauge first). Glows as a cast aimed at you lands. |
| (Bloodletting) | Reaver's Hook | taunt | Carried by Bloodletting (20 s cooldown). A hooked chain thrown into the target: +20 Blood. |

*Ceiling:* Drain right after a tankbuster heals and hits for far more than Drain on cooldown. Save Frenzy's free Drains for the buster.

**Runeguard, Warder** (◆◆◆). Signature: **Ward breaks**. Gauge: three rune stones.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Rune Strike | GCD | 270, +1 Rune (+2 during Overload). |
| W | Runic Ward | GCD | Spend 1 Rune: a shield of about 20% HP for 8 s. When it ends, it explodes for 150–600 potency (more if it absorbed more; ×1.5 during Overload). Fully broken, it refunds the Rune. |
| E | Glyph Burst | GCD | Spend 3 Runes: 830 (1080 during Overload). |
| R | Runic Overload | oGCD | 60 s burst. |
| D | Sanctum | oGCD | The party takes 15% less damage for 10 s. The next Ward raised within 10 s is **sanctified**: it refunds its Rune however little it soaks, and its blast heals the party for a third of what it absorbed (spend it on the raidwide Ward that won't break). |
| F | Mirror Aegis | oGCD | For 3 s, the next hit is reduced by 80% and reflected for 1500 potency. A reflected tankbuster carves a Rune (a mirrored buster barely touches the Ward, so the mirror pays the Rune the Ward break would have). |
| (Rune Strike) | Binding Rune | taunt | Carried by Rune Strike (20 s cooldown). A rune of challenge stamped on the target: +1 Rune. |

*Ceiling:* learn the timeline so a Ward goes up right before each heavy hit and gets fully broken (it pays for itself). Line Mirror Aegis up with the boss's biggest swing.

### DPS

**Ranger, Marksman** (◆◇◇). Signature: **Keen Eye procs**. Gauge: quiver (Focus).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Quick Shot | GCD | 230, +10 Focus, 35% chance of Keen Eye (55% while Marked). During Barrage it fires three times (690) with triple Focus. |
| W | Piercing Arrow | GCD | 2 charges, 12 s each: 340. With Keen Eye, 500 and the charge comes back. |
| E | Rapid Fire | oGCD | Spend 50 Focus (25 during Hunter's Mark): 420. |
| R | Hunter's Mark | oGCD | 60 s party burst: the boss takes 8% more damage from everyone for 15 s; +10% crit for you. |
| D | Hunter's Cloak | oGCD | The party takes 10% less damage; +40 Focus. |
| F | Barrage | oGCD | The next Quick Shot fires three times. |

The lowest floor (everything is instant, so you never stop to cast) and a modest ceiling: newbies reach about 80% of pro damage. Keen Eye banks up to two procs. Mastery (Round 2) is pooling: walk into Hunter's Mark with 100 Focus and two Keen Eyes banked, then spend it all at half price (a Keen Eye cashed there while a second is still banked readies Barrage again); Hunter's Cloak's 40 Focus feeds the Mark or Starfall Volley.

**Shadowblade, Assassin** (◆◆◆). Signature: **positionals**. Gauge: a moon with 5 phases (combo points).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Strike | GCD | 220, +1 combo point. From behind: +60 and +2 points. |
| W | Eviscerate | GCD | Spend all points: 120 + 115 per point (+160 at 5). From the flank +80; ×1.15 while poisoned; ×1.25 during Shadow Dance. |
| E | Shadowstep | oGCD | 2 charges, 15 s each: teleport behind the boss; every hit counts as a positional for 5 s. |
| R | Shadow Dance | oGCD | 60 s burst, 10 s: faster attacks, every positional lands. Entered at 5 combo points, the first finisher in it keeps them. |
| D | Venom Blade | GCD | 140 + poison (70 every 3 s for 24 s). Glows in the last 7 s. |
| F | Smoke Bomb | oGCD | The party takes 10% less damage; every hit of yours is a positional for 10 s, and a running Shadow Dance lasts 3 s longer. |

The highest ceiling: newbies reach 70% of pro damage. The boss's hitbox ring shows its front (red), sides (white) and back (purple).

**Pyromancer, Fire Mage** (◆◆◇). Signature: **Heat and Hot Streak**. Gauge: a crucible (Heat).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Fireball | GCD | 1.8 s cast, 300, +12 Heat, +15% crit. |
| W | Pyroblast | GCD | 3 s cast, 540. Instant and 620 with Hot Streak. |
| E | Fire Blast | oGCD | 2 charges, 10 s each. Always crits, and works *during* a cast. |
| R | Combustion | oGCD | 60 s burst: every Fireball, Pyroblast and Fire Blast crits for 10 s. |
| D | Vent | GCD | 150 + 6 per Heat; resets Heat. White-Hot: at 90+ Heat it also lights Hot Streak. |
| F | Smolder | oGCD | The party takes 10% less damage; for 10 s your Heat can't boil over (it holds at 99). |

- **Heat:** each point raises your damage by 0.3%. At 100 you overheat: you lose 15% HP and deal −20% damage for 5 s.
- **Procs:** a crit gives Heating Up; a second crit turns it into Hot Streak; a non-crit clears Heating Up.

*Ceiling:* experts manufacture the second crit with Fire Blast mid-cast, ride high Heat, Vent at 90+ for White-Hot (a Fire Blast tops 84 up), keep Combustion burning with Hot Streak Pyroblasts (+1 s each, up to 4 s), and cast only when they know they won't have to move. A Cataclysm Vents while its Meteor falls: it lands at once with the Heat in its crater.

### Healers

**Raise Sickness.** A raised player deals and heals less for a while (`FIGHT.SICK`). A cast raise leaves 15% for 20 s; an instant raise (Bloom of Dawn, Seed of Renewal, Last Moment, Rewind, the Alembist's Draughts) leaves 30% for 30 s. Every earlier death of the party this pull adds 5% and 5 s, up to 50% for 45 s. The Limit Break's raise leaves none. The party's deaths show beside the Limit gauge, and its tooltip gives the next raise's cost.

**Cleric, Priest of Dawn** (◆◇◇). Signature: **Petal economy**. Gauge: a sundial with 3 petals.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Smite | GCD | 1.5 s cast, 280. After three Dawn Petals it becomes **Dawnstar**: instant, 950. |
| W | Mend | GCD | 1.8 s cast, 700 heal. |
| E | Dawn Petal | GCD | Spend a petal: instant 450 heal + small regen. Petals regrow every 15 s (max 3). |
| R | Prayer Circle | oGCD | The party takes 10% less damage for 10 s and regenerates (60 s cooldown). |
| D | Intervention | GCD | 30 s cooldown: raise a dead ally (5 s cast, like every raise), or 1200 heal (2.5 s cast). |
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
| F | Rebirth | GCD | 30 s cooldown: raise (5 s cast), or 1100 heal (instant). |

*Ceiling:* Rejuvenate *before* damage lands so no tick is wasted, then attack while it works. Bloom turns that foresight into burst healing.

**Chronomancer, Time Mage** (◆◆◆). Signature: **Haste / Slow stance**. Gauge: an hourglass (Flux).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Temporal Bolt | GCD | 1.5 s cast, 280. Slow stance: heals your linked ally (the tank) for 85% of the damage. Haste stance: heals the whole party for 30%. |
| W | Rewind | oGCD | 2 charges, 30 s each: set an ally's HP back to its highest point in the last 4 s. Revives them if they died in that window. They become your link. |
| E | Shift | oGCD | Toggle stance. Haste needs 20+ Flux; your first Bolt in Haste is instant. |
| R | Accelerando | oGCD | 60 s party burst: everyone is 10% faster for 15 s; +40 Flux. Aimed at an ally: they are Quickened (12% faster still, 15 s). |
| D | Stasis | oGCD | (Round 2) 60 s: for 8 s the Bolts' heals are held (25% stronger); press again or let it end to release them to the whole party. Cooldown runs from the release. |
| F | Recall | GCD | 30 s cooldown: raise (5 s cast), or 1200 heal (2.5 s cast). |

- **Flux:** Slow stance fills it (+3/s). Haste stance gives 20% faster casts and +10% damage, but drains it (−5/s).
- Hitting 0 Flux in Haste knocks you into Slow with 3 s of slower casts.

*Ceiling:* plan Haste for raidwides and burst windows, fire Rewind right after a tankbuster, and land Stasis on the boss's biggest attack.

**Healer kit synergy, Round 2 (2026-10-21).** Every healer button now plays off the others, and four healers can pick ONE ally to make stronger.
- *Chronomancer:* **Paradox** (Shift from Haste back to Slow): an instant hit of potency 14 per Flux spent in that Haste window (`CHRONO_PARADOX`, about 5 damage per Flux), healing the party for half; stumbling out (0 Flux) gives none. Shift glows both ways (into Haste at 95+ Flux, back below 15). **Rewind** in Haste costs 25 Flux instead of a charge (that Flux feeds Paradox). **Stasis** reworked: 8 s of held Bolt heals (+25%), released to the party on the second press or at the end; never wasted; 60 s cooldown from the release. Bolt now carries a smaller share of the damage, so potMult fell (0.84 to 0.67; Echoist 0.53 to 0.47; Accelerant 0.80 to 0.70) and Bolt's heal shares rose to match (Slow 150% / Haste 60%; Echoist 135/56; Accelerant 114/71). Phase Strike and Stopwatch now act only on the shift into Haste (Phase's Bolt at 75%).
- *Grovekeeper:* every Thornlash tick grows 2 Bloom (`GROVE_THORN_BLOOM`; pandemic already carried up to 9 s). **Rebirth** is instant on the living: a heal of potency 1100 and Wildheart; it glows when its target is down.
- *Alembist:* **Distill** is a decision: on an empty still the next two reagents are instant (as before); with one reagent in, it doubles it into a fully ripe vial at once. Quickpowder Galvanizes the ally it lands on, and Smart Throw gave a healthy target the Quickpowder before a bomb (Smart Throw is gone since: see *Marking a vial* in the Alembist section).
- *Cleric / Threadweaver:* Intervention and Recall glow when their target is down; Benediction Blesses. The Threadweaver had no dead buttons left (Grand Loom ties Tapestry in).

**Chosen-ally buffs** (`ALLY_BUFFS` in engine.js): Quickened (Accelerando / Echo Chamber / Time Warp: 12% haste, 15 s), Blessed (Benediction: +10% damage, 10 s), Wildheart (Rebirth on the living: +10% damage, 12 s), Galvanized (Quickpowder's target: +10% damage, 10 s). Data flow: the kit calls `k.allyBuff(target, id)`, which emits `{ type: 'allyBuff', target, id, kind, value, dur }`; a human's goes to the host as a `cev` (main.js accepts only a known id on a numeric target and resets its kind, value and duration from the table), a bot's goes straight in (raid-host.js botWorld). `RaidHost.onPlayerEvent` keeps it in `allyBuffs` per player id (the same buff again replaces the old one; nobody fallen) and broadcasts `{ t: 'abuff', to, id, kind, value, dur, from }`. Every client keeps `raid.abuffs`: your own kit reads the ones on you through `env.selfMods()` (`dmg` multiplies damage in `Kit.damage`, `haste` shortens casts and the GCD in `Kit.hasteMult`), bots through `RaidHost.allyMods(id)`; the party frames show a chip with the move's icon, your buff bar shows it too. Bots spend them on the damage dealer who has dealt the most (`BotAI.topDps`) while the party's burst is on (`view.burst`: a damage buff or a vulnerability on the boss), Accelerando on cooldown; a shielding move keeps a charge or waits for an upcoming tankbuster. The simulator has no allies, so it gives these no damage.

**Fun pass (2026-10-24)** on the nine classes that ranked lowest. Small changes that give each one a payoff moment or remove a trap; the details are in the tooltips and the hero guide.
- *Gloomsworn:* **Brimming** (10% less damage taken while the vessel is full) makes banking Gloom pay; **Hollow** breaks the vessel into 40 Gloom of dregs, refills both Gloom Strike charges and keeps Shade Step's echo up for the whole Hollow. Strike glows only in those windows; Shade Step glows with Gloom for two Strikes.
- *Grovekeeper:* every Wrath that lands feeds Thornlash 1 s (up to its full 30 s). **Bloom drift:** a Bloom heal on someone above 90% goes to the most hurt ally instead.
- *Reaper:* **Full Toll:** a Reap that cashes all four afflictions at gold adds a 180 blow and 3 Ultimate charge (the Gate's release look and sound). Shroud's cut is 70.
- *Cleric:* a **Mend** cast with no Petals in hand counts a whole Petal toward Dawnstar.
- *Runeguard:* in Runeblade, a **Rune Cleave** cast while the burning rune still runs lands its remaining ticks at once instead of clipping them.
- *Oathbroker:* a gold **Paid** stamp when a Collect strike clears the Ledger's last line (at most every 6 s), and a number over the boss for what Default or Foreclose made it pay.
- *Threadweaver:* the fray warning now uses the real snap length; a pair needs two Ties within 2 s (was 4); every tug heals whichever end of the thread is more hurt.
- *Ranger / Thermist:* Barrage glows inside Hunter's Mark or when the Mark is over 25 s away; Aimed Shot glows at 5 Steady Aim; Equilibrium glows while the boss casts and the dial stands 3 or more steps out.

### Advanced DPS (added 2026-10-19)

Two DPS built for players who want more to juggle. On the hero select their tiles carry small complexity pips (data.js `complexity`: Thermist 3, Driftblade 2), separate from the difficulty diamonds. Both run on the same rules as the first nine: six keys plus the dash, small numbers, a class gauge drawn as its own shape, kits run on each client and report to the host.

**Thermist, Living Thermometer** (◆◆◆). Signature: **Thermal Shock**. Gauge: a two-sided dial (Temperature), frost blue on the left, ember orange on the right, a mark at 0. Ranged caster; autos alternate a fire and a frost spark (25).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Cinder Bolt | GCD | 1 s cast, 210, turns the dial 1 toward Blaze. Locked while Overheated. |
| W | Rime Shard | GCD | 1 s cast, 210, turns the dial 1 toward Rime. |
| E | Flare | GCD | 2 s cast, 400, dial +2. At +5 it is instant and a sure crit, and holds you **On the Brink** instead of moving the dial. |
| R | Glacier Lance | GCD | 2 s cast, 400, dial −2. The same edge rule at −5. |
| D | Equilibrium | oGCD | 30 s: the dial snaps to 0 behind a shield of 70 per step it fell; clears On the Brink. |
| F | Inversion | oGCD | 90 s burst: flips the dial (+5 becomes −5). From 3 or more steps out that crossing is a Shock half again as strong. 10 s **Attuned**: both elements count as your side. |

- **The dial** runs from −5 (Rime) to +5 (Blaze). Every step from 0 makes that side's spells 8% stronger (Attuned: both sides); spells pushing back toward 0 gain nothing.
- **Thermal Shock:** a spell that carries the dial across 0, after it peaked at 3 or more since the last crossing, detonates on the target. Its size is the **swing**: the peak plus how far past 0 it landed (+5 down to −1 is 6, an Inversion at ±5 is 10). Potency max(0, −120 + 105 × swing): 195 at 3, 510 at 6, 930 at 10. The gauge shows the peak as a bead that lights up once a Shock is armed.
- **Overload:** pushing past ±5, or casting the same element again while On the Brink, overloads you: **Overheat** (fire locked 3 s, you lose 8% HP) or **Frostbite** (casts 30% slower for 3 s).

*Ceiling:* a real swing is a plan several casts long. Climb with the side you're on, use the edge spell as your one instant (it doubles as movement), cross with the other element as far as you can, and save Inversion for the party's burst window. Equilibrium is your mitigation and costs you the swing, so the timing matters. Newbies reach 60% of pro damage, the widest gap in the game.

**Driftblade, Wind Duellist** (◆◆◇). Signature: **Drift and Passing Strikes**. Gauge: a crescent of wind that fills while you move (Drift, 0 to 100), streaks racing through it while it rises. Melee; autos are a quick sabre flick (40).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Carve | GCD | 240, up to 30% more with full Drift. At 50 Drift or more a follow-through cut adds 30%. |
| W | Slipstream | oGCD | 2 charges, 14 s each: dash 180 px the way you're heading, +15 Drift. Leaves a **wind lane** for 6 s: anyone running along it is 30% faster, and stepping back onto your own gives +15 Drift. Dashing through an enemy is a Passing Strike. |
| E | Hook Turn | oGCD | 12 s, range 220: swing round your target to its far side with a cut of 260 (up to 40% more with Drift, a sure crit above 70). Gives back a dash charge. |
| R | Crosswind | GCD | Needs 20 Drift, range 300: spends it all, 100 + 5 per Drift (600 at full). |
| D | Stillpoint | oGCD | 25 s: parry for 2 s, 50% less damage, and Drift holds instead of draining. A hit caught in the first moment is answered with a riposte (320, up to 50% more with Drift). |
| F | Gale Run | oGCD | 90 s burst: for 12 s Drift can't drain and Passing Strikes hit three times as hard. |

- **Drift** fills by 20 a second while you move and drains by 30 while you stand. Nearly every cut scales with it.
- **Passing Strike:** running into an enemy's body while moving cuts it as you pass (90, doubled at full Drift; at most every 0.45 s). Dashes, Hook Turn and plain running all count, so a dodge can carry you through the boss instead of away.

*Ceiling:* never stop. Thread every dodge through the boss, chain Slipstream, Hook Turn (which hands the dash back) and the shared dash into long runs, fire Crosswind full, and keep Gale Run for the stretches where the fight makes you move. Newbies reach 60% of pro damage: a Driftblade who stands still is half a Driftblade.

**Design notes and changes from the brief (2026-10-19):**
- **Thermal Shock is measured from the peak since the last crossing**, not from wherever the dial happened to be one cast ago, so a swing is a plan you build over several casts. A crossing from a peak under 3 is just a crossing.
- **Glacier Lance is single-target** (like every other move in the game), not a piercing line.
- **Overheat and Frostbite** are different on purpose: Overheat costs HP and locks fire; Frostbite only slows casts. Either way you lose the swing.
- **Zenith's Corona** (reworked 2026-10-24, replacing Redline and Strain): an edge cast is instant and a sure crit as in the base kit, but lights a Corona and keeps you at the edge instead; the third (the fifth in Red Giant) leaves you On the Brink. The next Thermal Shock spends every Corona, +25% each; they fade 12 s after the last edge cast. Equilibrium becomes **Sunset** (30 s): every Corona falls on the target as a star (170 potency each), then it is Equilibrium. Spec rows: Solar Wind (Sunset keeps the dial at the edge) / Slag Plate (a small shield per Corona); Red Giant (in Inversion's place, 60 s: hold up to 5 Corona for 8 s, the 4th and 5th edge casts +50%) / Red Alert (a boss cast while you hold 2+ Corona readies Sunset).
- **Pendulum** moves the dial a step further with every spell and gains Momentum (+4% per crossing, up to 5, gone after 6 s without one), so its swings come faster but land closer to the edge.
- **Carve's follow-through** (a second cut at 50+ Drift) replaced "Carve doesn't stop you moving": every GCD in the game already lets you move, so the line said nothing.
- **Hook Turn mirrors you through the target** (to the point opposite where you stood), which reads clearly and is the same rule for players and bots.
- **Slipstream's lane speed** is applied on each player's own client (a lane laid by anyone speeds up anyone running along it). Bots don't use lanes for speed; the Driftblade's own Drift refund from re-entering a lane works for everyone, since it lives in the kit.
- **Stillpoint is a parry built on Brace's timing** (`mitigate` kind `brace`): the host's Perfect Block notice is what triggers the riposte, so it lands with the same fairness window as the Bastion's block.
- **Orbit** (spec) counts how far you circle round your target at close range; at 5 stacks Carve strikes on its own every 1.4 s while you move, and every whole loop flown unbroken round it ends in a **Full Circle** dive (Hook Turn counts as half a loop). **Comet** (spec) doubles Drift to 200, fills it faster in straight lines (34 a second) and turns Crosswind into **Impact**: a charge 120 px clean through the target for 120 + 4 per Drift, a sure crit from 160.
- **Passing Strikes credit the enemy you ran through** (damage events can now name their target, `tgt`), so cutting through an add doesn't hit the boss and vice versa.
- **Kit moves** (`teleport` events with `where`: `dash`, `around`, `through`) play as a dash for players (the same animation and timing as the shared dash) and snap for bots; `kitMoveDest` in `kits.js` is the one rule both use.
- **Art:** both classes ship without painted icons or portraits (data.js `art: { icons: false, portraits: false }`). The game draws small glyph icons for them instead of asking for files that don't exist, and the hero page shows the animated sprite. Briefs are in `docs/art/`.

**Tested (2026-10-19):** `tools/check.js` passes with both classes in the class balance (pro DPS between the Shadowblade and the Pyromancer), every spec within 5% of its class, every talent under +7% and full builds +12 to +16%, all four spec trials passed by a bot playing the spec (the base kits also pass, like 14 of the original vignettes), and four new bot raid line-ups clearing on Normal: Grubnak (base / base), Skitterra (Pendulum / Orbit), Volkar (Zenith / Comet) and the Hollow King (base / base). Over six runs each those cleared 6 of 6, except Volkar with Zenith and Comet at 5 of 6. After merging the boss rework (2026-10-19), the Volkar line-up uses a Cleric instead of an Accelerant (an Accelerant plus two advanced DPS no longer had the damage), the Zenith bot steps off the edge with a quick spell when Strain builds and Bleed Off is cooling (it had been melting down), and the Driftblade bot weaves through the boss unless a telegraph lands within 2.5 s (was 4). The Driftblade bot still deals less than an original DPS bot (about 70 against 100 on Grubnak), so it's the weakest link in a party. In the browser: the hero select at 1280×800 and phone width, the hero pages, both classes in a bot raid with their gauges, cast and Shock effects, Slipstream lanes, the drawn icons (no missing-file requests for either class), the talent screen with the talent moves on the bar, and the Comet trial. Not yet played by a human or over a real network connection.

<!-- classes-b: Alembist (new healer, 2026-10) -->
**Alembist, Alchemist** (◆◆◆). Signature: **brewing ahead**. Gauge: a copper still with a bandolier of vials. Healing comes from vials you brewed earlier, so you heal now with what you planned 10 seconds ago.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Ember | GCD (0.75 s) | Add Ember to the brew. Two reagents make a vial. |
| W | Dew | GCD (0.75 s) | Add Dew. |
| E | Salt | GCD (0.75 s) | Add Salt. |
| R | Throw | GCD (1.0 s) | Throw the oldest vial (or the marked one) at your heal target: it shatters and splashes everyone close by. Bombs fly at the enemy instead. |
| 1-3 | Mark a vial | free | Mark the vial in that place of the bandolier (left to right) for the next Throw. 1-5 for the Apothecary. |
| D | Distill | oGCD | Your next two reagents come off the GCD at once (30 s cooldown). |
| F | Grand Batch | oGCD | Fill every empty slot with copies of the last vial you brewed (120 s cooldown). |

| Recipe | Vial | Effect |
|---|---|---|
| Dew + Dew | Mending Draught | Big splash heal (480). Raises a fallen ally it lands on (once every 30 s). |
| Ember + Ember | Fire Bomb | Flies at the enemy: 360. |
| Salt + Salt | Salt Ward | A salt circle: allies inside take 20% less damage for 6 s. |
| Dew + Ember | Steam | A healing cloud: 80 every 1.5 s for 9 s to everyone inside. |
| Dew + Salt | Salve | Shields everyone splashed (280) and washes off Vulnerability and Damage Down. |
| Ember + Salt | Quickpowder | The party acts 10% faster for 10 s; splashed allies shake off slows and roots. |

- **The bandolier** holds 3 vials. A vial grows 30% stronger over 10 s (ripe), and spoils at 40 s (wasted).
- Reagent order doesn't matter (Dew + Ember = Ember + Dew). A brew left half done stays in the still.
- The gauge shows each vial's colour, ripeness and spoiling, and its place number under it; its tooltip lists the recipes.
- **Marking a vial** (replaced Smart Throw, October 2026): the number keys mark the vial in that place of the bandolier, and the next R throws it at your heal target; an empty place does nothing. The mark sits on the vial itself (`g.mark`, its id), holds until you throw and then goes back to the first; with nothing marked R takes the leftmost (oldest). The marked vial stands raised over a gold chevron with a gold frame. While you play an Alembist the number keys are the vial keys (`vial1`-`vial5` in `keybinds.js`) and party selection moves to F1-F4 (`alemAlly1`-`alemAlly4`); every other class keeps 1-4 for allies. The class-only keys never clash with the party keys in the remap list. The mark lives on the owner's kit only: the throw's own events name the vial. Bots mark the vial they choose the same way (`alemMark`).

*Ceiling:* keep the bandolier full of ripe vials of the right kind before the damage lands (Salt Ward before the buster, Steam before the raidwide), throw bombs only when nobody needs healing, and never let a vial spoil.

**Design changes from the plan (`docs/plans/2026-10-new-classes.md`):**
- **Throw lands at your heal target** (the healer ally-targeting rules: locked ally, mouse-over, or yourself), not at a raw cursor point. Bombs fly at your enemy target. This works the same over the network and for bots.
- **Quickpowder** gives party haste and cleanses slows and roots, since the engine has no movement-speed buff.
- **Salve** cleanses Vulnerability and Damage Down (the debuffs the bosses actually apply).
- **The Mending Draught raises** a fallen ally it lands on (once every 30 s): six buttons left no room for a raise.
- **Distill** makes the next two reagents free of the GCD (an instant brew), rather than brewing a vial itself.
- Reagents have a 0.75 s GCD and Throw 1.0 s, so a brew-and-throw takes about as long as one normal GCD heal.
- **Volatile's Reactions** need a third reagent, which comes from **Catalyst** (replacing Distill, 2 charges, 14 s): while it lasts, a brew takes three reagents.
- **Apothecary** first picked its vial with Shift+R; since every Alembist marks vials with the number keys, the Apothecary simply has five to mark (1-5).
<!-- /classes-b -->

<!-- ironpalm -->
### Ironpalm: the combo-paced tank (added 2026-10-20)

**Ironpalm, Monk Brawler** (◆◆◆, complexity 3). Signature: **Strings and Reads**. Gauge: **Breath**, a ring round an iron fist, with the string you're pressing shown under it. A barefoot monk with iron plates bound over his knuckles; melee, autos are a quick jab (40).

The first class built on a different **pacing**: there is **no GCD**. Light, Heavy and Kick are inputs, each a quick hit with its own short recovery that costs Breath, and strings of them pressed in rhythm become named moves. The limit is Breath and each press's recovery, not a global timer.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Light (palm) | input | 40, 0.38 s recovery, 12 Breath. Adds **L** to the string. |
| W | Heavy (fist) | input | 64, 0.6 s recovery, 18 Breath. Adds **H**. |
| E | Kick | input | 52, 0.48 s recovery, 15 Breath. Adds **K**. |
| R | Read | oGCD | 6 s: a 1.2 s reading stance (20% less damage). A hit landing in its first 0.4 s is **read**: half damage, a counter (63) and 15 Breath. A read **tankbuster** gives an **Opening**: the next Heavy within 4 s is a free Thousand Palms, 30% stronger. Doesn't break the string. |
| D | Iron Skin | oGCD | 120 s: 40% less damage for 10 s, and Breath refills at its resting pace the whole time. |
| F | Temple Bell | oGCD | 60 s: the party takes 10% less damage for 8 s; you get **Second Wind** for 15 s (Breath refills twice as fast, +10% damage). |
| (Read) | Beckoning Palm | taunt | The shared taunt, carried by Read; calling it out steadies your breathing (+30 Breath). |

**The move list** (a string fires its move on its last press: that press's hit plus a bonus):

| Move | String | Bonus | Effect |
|---|---|---|---|
| Crane Step | K L | 24 | Gives back 22 Breath without stopping. |
| Flowing Palms | L L L | 50 | Cheap and simple. All three palms Crisp and left under 40 Breath: 12 Breath back (breathing without stopping). |
| Rising Gate | L L H | 60 | A launcher: 30% less damage taken for 1.5 s while the boss is in the air. The next input gets 1.3 s instead of 0.8 s. |
| Heaven's Drop | L L H K K | 140 | Rising Gate carried on: an axe kick onto the airborne boss. |
| Tiger Wall | H K K | 18 | 25% less damage for 5 s (strung before a buster). |
| Stone Breaker | H H K | 55 | Bruise: a 20-potency tick every 3 s for 15 s. |
| Iron Ox | H H H | 90 | Off balance: Read is ready again at once, and a blow Read within 4 s opens like a tankbuster (the next Heavy is a free, Crisp Thousand Palms). Ox > Read the next auto > Heavy. |
| Thousand Palms | L K H H | 170 | The finisher: five extra strikes in a flurry. |

- **Strings.** A press that continues a known string adds to it; one that fits no string **breaks** it and starts a new one. Waiting longer than the **window** (0.8 s after the last recovery ends, 1.3 s after Rising Gate) **drops** it. After a finished move any key just starts the next string (no break). Strings branch: H H, then H is Iron Ox and K is Stone Breaker; L L H is a move on its own and also the start of Heaven's Drop.
- **Crisp.** A press made in the first 0.18 s after the last recovery ends, pressed then and not buffered early, is Crisp: +10% damage and 40% of its Breath back. Early presses are buffered (0.45 s, two deep), so mashing still works, but a masher is never Crisp. Held keys don't repeat.
- **Breath** (0 to 100) refills 6 a second while you press and 36 a second once you've stopped for 0.45 s. Pressing at 0 fails ("Winded"). A pro runs dry about once a minute and stops for a breath at a safe moment.
- **The display** (the gauge): the Breath ring, the string so far as key chips (Crisp ones rimmed), the name of the move you just landed, a rhythm bar for the current recovery with the Crisp notch, and every move still in reach with its pressed letters lit and a ring on the next one. The glowing key follows a planned string, so a new player can press the glow and play real moves.
- **Hit-stop and impact.** Every hit freezes the monk's swing for a beat where it connects (`hitStop` in `draw-util.js`, purely cosmetic; longer for the big moves and a read buster), with a knuckle flash, a ring and sparks. Named moves get their own: Rising Gate's column of dust, Heaven's Drop's crater, Thousand Palms' storm of palm prints.

*Ceiling:* keep every press Crisp, run Rising Gate into Heaven's Drop as the main string, keep the Bruise up, string Tiger Wall ahead of each buster, Read the buster itself (and spend the Opening at once), Read autos with a spare charge, and time the breaths so you never run dry mid-string. Newbies reach 55% of pro damage (45% as Avalanche Fist).

**The pacing system (`engine.js`, general, any kit can use it).** A kit may set `pacing: { kind: 'combo', gcd: false, buffer, bufferSize, repeat, pool: { key, max, regen, rest, delay }, itemGcd(k, ab) }`:
- `gcd: false`: GCD abilities start no GCD; each locks the kit for its own `lock` (a named move may set its own via `moveFor`).
- `buffer` / `bufferSize`: presses made during a lock are queued (up to `bufferSize`) and fire in order as it ends; `k.input = { at, buffered, idle }` tells the kit how each press was made.
- `pool`: a resource that abilities spend through `cost`; it refills at `regen` while pressing and `rest` after `delay` seconds without spending (`def.poolRate` / `def.poolRest` let the kit scale it). An unaffordable press fails as 'winded'.
- `repeat: false`: held keys don't auto-repeat (main.js).
- `itemGcd`: which presses count as a "GCD" for item triggers (Ironpalm: named moves only), so gear tuned for a 2.5 s GCD isn't fired four times as often.
- Kits without `pacing` run exactly as before (the class balance baseline didn't move).

Other engine pieces: named moves live on the kit (`kit.moves`) and `abilityById` finds them, so a cast carries the move's id over the network and every client draws Heaven's Drop, not "Kick"; the host has a new mitigation kind `parry` (`FIGHT.READ_WINDOW` 0.4 s: half damage, and the kit hears `read` with `b` set for a buster); the sparring dummy swings heavy every fourth blow so Read can be practised in town.

**Design notes:**
- **Threat** uses the tank multiplier as usual; Rising Gate (×3), Iron Ox (×2), the Read counter and Dragon Ascends (×2) carry extra so a tank who strings well holds the boss.
- **The newbie model** for this class mashes at its own pace (presses buffered, rarely Crisp), follows the glow 60% of the time and otherwise presses Q, and uses Read when it comes up, so its Reads land on a hit by luck.
- **Art:** ships without painted icons or portraits (data.js `art: { icons: false, portraits: false }`): drawn glyph icons and the animated sprite. Briefs in `docs/art/`.
**Tested (2026-10-20):** `tools/check.js` passes with the other 12 classes' baseline unchanged (Ironpalm added at pro 1,522, newbie 832), both specs within 1% of the class, every talent at most +5.8% and full builds +13.5 to +16.9%, four new bot line-ups clearing Normal (Grubnak base 2/3, Skitterra Still Water 2/3, Volkar Avalanche 2/3, the Hollow King base 3/3) and both trials passed by the bot. In the browser (own static server, scripted key events since the preview pane runs no animation frames when hidden): hero select and hero page with the drawn icons and no missing-file requests, strings played with real key events (L L H K K landed Rising Gate then Heaven's Drop, every timed press Crisp), the string display (chips, rhythm bar, reachable moves with the plan marker), hit-stop on a Heavy, held keys not repeating, running dry into Winded, a Read on the sparring dummy's heavy swing opening a free Thousand Palms, and both trials cleared by scripted play (Still Water: 10 Reads, 8 of them tankbusters). No console errors. Not yet played by a human with a real keyboard, or over a real network connection.
<!-- /ironpalm -->

<!-- tanks-2: Gorgemaw and Oathbroker (advanced tanks, 2026-10) -->
### Advanced tanks (added 2026-10-20)

Two tanks whose survival is a plan rather than a cooldown rotation. Both carry tank threat (the shared tank multiplier) and the usual taunt (on a carrier button), tied to their gauge.

**Gorgemaw, the Glutton Knight** (◆◆◇, complexity 3). Signature: **eating mechanics**. Gauge: the Belly, a row of hollows holding Morsels in their shape's colour, with a jaw over it that gapes while Open Wide is up. Melee; autos are a gauntlet cuff (40).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Gnash > Rend > Gulp | GCD | 220 / 300 / 390. Gulp heals 2% of your HP, and into an empty Belly it swallows a Ring Morsel (once every 20 s). |
| W | Open Wide | oGCD | 2 charges, 14 s: the jaw is open for 1.5 s. An edible hit that lands on you deals 25% and becomes a Morsel. |
| E | Spit | GCD | Range 300: the oldest Morsel back at the boss. Ring 420, Lance 460, Fang 490, Spike 800. The button names what it will spit. |
| R | Digest | oGCD | 25 s: eat every Morsel. Each heals 6% of your HP and gives 5% less damage taken for 8 s (at most 30%), and its **acid** makes the next Spit within 15 s 50% harder per Morsel (at most +100%). Digest as the buster comes, eat it, spit the Spike back doubled: Digest and Spit feed each other instead of being either/or. |
| D | Iron Gut | oGCD | 90 s: 40% less damage for 8 s. While it lasts Digest works in any moment and every Morsel counts twice (heal, armour, acid). |
| F | Bottomless | oGCD | 120 s: for 4 s you eat everything, raidwides too. The whole party takes half from a raidwide, and each one is a Morsel for you. |
| (Open Wide) | Bellow | taunt | Carried by Open Wide. Takes the boss and opens the jaw for 1 s. |

- **What's edible** (host rule, `MAW_HOST.typeOf` in `fight.js`): any boss telegraph by its shape (circle or donut: Ring; line or cross: Lance; cone: Fang), every tankbuster (Spike), spread and proximity marks (Ring), raidwides (Ring, Bottomless only). A boss file can override with `eat: '<shape>'` or `eat: false` on a mechanic, or pass `eat` on its own `damagePlayer` calls. **Not edible:** room blasts you hide from behind a prop (`cover`: Gut Blast, the Hollow King's knell-behind-a-tomb moves), stacks and towers (the party's soak would be pointless), floor puddles, adds' hits, enrage. Volkar's Rod Strike in the open and Chain Lightning are edible as Lances (a chain swallowed ends in the mouth).
- **Across the four bosses** the rule above decides it, so every tankbuster (Tenderize, Silk Wrap, Titan Fist, Grave Cleave) is a Spike, every plain telegraph you stand in is food by its shape (the Hollow King's sweeps are Fangs, his stomp and Crown of Graves Rings), and a teammate's circle (Larder Toss casks, Grave Marks) can be eaten whole. Room moves are not: cover blasts (Gut Blast), Lights Out, stacks and towers (Barrow Bells), custom mechanics (gaze, polarity, gale, hooks). Volkar's Rod Strike in the open and Chain Lightning are opted in.
- **A teammate's spread or follow circle** (Grave Marks, Larder Toss casks, Spice Rack jars) that lands with an open-jawed Gorgemaw inside is swallowed whole: the owner takes nothing, the Gorgemaw takes a quarter, and the circle never goes off for anyone (the host sends `tgx` with only the eater; clients mark the telegraph gone before its impact plays).
- **Host side:** Open Wide sends a `maw` event (`dur`, `all`); the host keeps `s.maw = { until, all }` (window capped at 4.2 s) and, when a mechanic resolves, `eatInfo` decides who eats what. `classHit` cuts the hit to 25%, marks it unavoidable and sends `fev 'eat'` (`m` shape, `mid` telegraph, `w` whole, `r` raidwide, `f` whose circle). One Morsel per mechanic per eater. The owning client's kit takes the Morsel; everyone draws the swallow.
- **Order in the damage pipeline** (`fight.js` `damagePlayer`): vulnerability and defence, then every mitigation (Perfect Block, an Ironpalm's parry Read, reflects, cooldowns), then `classHit` (the jaw cuts the mitigated hit to 25%, then the Ledger takes its 60% of what's left), then shields, then HP. A parry or cooldown and an eat stack, the Ledger records the already-reduced hit, and a bill coming due (`raw`, `nomit`) skips mitigation and the Ledger, since it was mitigated when it was written.

*Ceiling:* every buster is food, so a good Gorgemaw is never surprised by one: a charge is always ready when it lands, the Spike goes straight back, and Digest is held for when the healer is busy. Newbies reach 72% of pro damage, mostly by never spitting.

**Oathbroker, the Contract Knight** (◆◆◆, complexity 4). Signature: **the Ledger**. Gauge: a page of lines, each an entry's amount and the seconds until it's due (red in the last 2 s), the total above, and the terms in force in the margin (Lien chain, Writ scroll, Moratorium hourglass, Co-Sign link, VOID while closed). Melee; autos are a tap of the stamp-mace (40).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Dun > Levy > Collect | GCD | 230 / 300 / 400. Every strike pays the oldest entry down by 2% of your HP. |
| W | Renegotiate | oGCD | 20 s: every entry comes due 4 s later and is marked **renegotiated** (» on the page): under Lien the boss pays two thirds of it, under Writ you pay half of it, Default strikes for it in full, Foreclose at 1.5×. |
| E | Settle | oGCD | 25 s: pay the whole Ledger now at half its size. |
| R | Lien | oGCD | 60 s: for 10 s the boss pays a third of every bill that comes due (two thirds of a renegotiated one), and every Collect strike that pays the Ledger down also strikes the boss for what it paid (it was ~0% of damage when Collect simply emptied the Ledger). |
| D | Writ of Protection | oGCD | 90 s: 30% less damage for 8 s, and what's written in that time is halved; a renegotiated line coming due in it is billed at half. |
| F | Default | oGCD | 120 s: tear the Ledger up and strike the boss for half of it (renegotiated lines in full): a Ledger-fed finisher. It is closed for 10 s after (hits land on you in full). |
| (Renegotiate) | Summons | taunt | Carried by Renegotiate. Takes the boss; its next blow on you goes 100% into the Ledger, due 3 s later than usual. |

- **The Ledger** takes 60% of every hit after mitigation and bills it 8 s later as raw damage (no mitigation twice). It is **host-owned** (`s.led` in `fight.js`, rules in `OATH` in `kits.js`, shared with `tools/simulate.js`). The kit sends `ledger` events (`op`: `pay`, `reneg`, `settle`, `lien`, `writ`, `default`, `foreclose`, `summons`, `hold`, `cosign`, and `terms` every 3 s for talents and spec); every value is clamped on the host. The host sends `fev 'ledger'` with the packed page (`[[amount, seconds left, co-signer]]` plus timers) whenever it changes (at most 10 a second, and once a second while it holds anything), and `fev 'bill'` when a bill lands, so the owner's column stays exact and everyone else sees the stamp. A late joiner gets the next page within a second. A very long Ledger folds its two oldest lines together (24 at most).

*Ceiling:* the Ledger is time you buy, not damage you avoid. Push the big lines past the raidwide, Settle while the healer has you topped, Lien when the bills stack, pay down with the combo, and keep Default for the moment the Ledger would bury you. Newbies reach 81% of pro damage (most of its damage is the combo either way); the gap is in survival, which the sim doesn't score.

**Specializations.**
- **Glutton** (Gorgemaw): the Belly holds 5. A Spit whose next Morsel is the same shape fires both as a **Fusion** at 2.4× (two Rings a Quake, two Lances a Skewer, two Fangs a Maul, two Spikes an Impale).
- **Gizzard** (Gorgemaw): Digest feeds the party by shape: Ring a shield on everyone (150 each), Lance a big shield on the most hurt (360 each), Fang the party takes 15% less per Fang for 6 s (at most 30%), Spike the most hurt ally is immune for 2 s. You heal 3% per Morsel.
- **Guarantor** (Oathbroker): Lien becomes **Co-Sign** (20 s cooldown): for 10 s (was 20 s, which made it a press-on-cooldown button), 30% of what an ally takes goes into your Ledger instead (marked lines on the page), and every Collect strike that pays a co-signed line down heals that ally for what it paid (`OATH.op 'pay'` returns `r.co`, the host heals). Half the time covered: sign before the blow you want to share; it glows while the boss casts. Picks your locked ally, or the most hurt other ally.
- **Collector** (Oathbroker): every bill also strikes the boss for half its size, and Default becomes **Foreclose**: the whole Ledger in one blow on the boss, then closed for 10 s.

**Talents** (15 each; one plain number each: Wide Jaw, Grace Period). New moves: Regurgitate (III, Spit) and Stone Belly (V, Iron Gut); Audit (III, Settle) and Moratorium (V, Renegotiate). The rest change behaviour (`client/js/combat/talents.js`, tanks-2 block).

| Row | Gorgemaw | Oathbroker |
|---|---|---|
| I | Marinade (Gulp makes the next Spit +25%), Aftertaste (Spit leaves a burn), Crunch (Gulp bites twice) | Interest (Collect scales with entries), Garnish (part of what you pay down hits the boss), Rubber Stamp (Settle hits the boss) |
| II | Chew the Cud (Morsels heal 3%), **Wide Jaw** (2.2 s window), Table Scraps (eating a teammate's attack shields them) | **Grace Period** (due after 10 s), Amnesty (Renegotiate erases the smallest line), Escrow (3+ lines: 10% less damage) |
| III | **Regurgitate** (the whole Belly at 75%), Iron Lining (3% less damage per Morsel held), Sour Stomach (a Morsel kept 15 s hits 40% harder) | **Audit** (15 s: lines 4 s old paid at 30%), Consolidate (Renegotiate folds the page into one line), Fine Print (lines under 2% of HP are struck off) |
| IV | Feast (Bottomless refills Open Wide), Iron Jaw (Iron Gut opens the jaw 2 s), Overflow (a Morsel into a full Belly is spat out, not lost) | Receivership (Default: party 10% less damage), Writ of Execution (lines written under Writ are a third paid by the boss), Clean Slate (Default refreshes Renegotiate and Settle) |
| V | **Stone Belly** (30% for 8 s, every Morsel a Spike), Bile (Digest scalds the boss per Morsel), Rumination (Digest keeps the oldest Morsel) | **Moratorium** (45 s: nothing comes due for 5 s), Tithe (every bill heals your most hurt ally for a quarter), Notary (Collect pushes the newest line 3 s) |

Single talents stay under +7% pro DPS; full builds +7 to +17%.

**Design changes from the plan (`docs/plans/2026-10-new-classes.md`):**
- Gnash's pull was dropped (no boss in the game can be moved); **Gulp heals** instead, which keeps the Gorgemaw self-sufficient between meals.
- **Digest and Settle are oGCDs with cooldowns** (25 s each): as free GCDs they were spammable answers to everything.
- **Bellow and Summons** are the class taunts (the plan named none): one opens the jaw, the other sends the next blow straight onto the Ledger.
- **Gizzard's party effects are by shape** rather than one flat shield, so what you chose to eat decides what the party gets.
- **Guarantor's Co-Sign replaces Lien** (the plan had it as an extra button; there wasn't one). 30% of the ally's hit, not 60%: the Guarantor's own Ledger is already full.
- **Collector** bills the boss for half of each bill on top (not instead of) paying it, and Foreclose replaces Default.
- **Edibility is host-side by shape** with a per-mechanic override, so new bosses are edible by default; room blasts behind cover are inedible by rule (`cover`).
- Rod Strike in the open and Chain Lightning were made edible (`eat: 'lance'` in `volkar.js`); nothing else in the boss files changed.

**Simulator** (`tools/simulate.js`, `TANK_SIM`: an edible hit every 12 s, a buster-sized blow through the Ledger): pro DPS Gorgemaw 1498 (Glutton 1489, Gizzard 1488), Oathbroker 1485 (Guarantor 1485, Collector 1490), against the Bastion's 1498. Newbies: Gorgemaw 72%, Gizzard 80%, Oathbroker 79-81%.

**Bots** (`BOT_CLASS.gorgemaw` / `.oathbroker` in `bots.js`): the Gorgemaw opens its jaw for anything edible landing on it within 0.6 s (its busters first), uses Bottomless on raidwides, Iron Gut on a buster with no charge, Spits whenever there's a Morsel (Glutton waits for a pair, Gizzard keeps them for Digest before party damage). The Oathbroker uses Writ on its busters, Renegotiates a big line due inside 1.5 s when a raidwide or buster is coming, Settles over 22% when healthy, Liens while bills are coming, and Defaults (or Forecloses) before the Ledger buries it; a Guarantor co-signs whoever a buster is aimed at, else the healer. Normal clears, 3 runs each with a Cleric, Ranger and Pyromancer: Gorgemaw Grubnak 3/3, Skitterra 2/3, Volkar 3/3, Hollow King 3/3; Oathbroker 3/3 on all four. Over 6-8 seeded runs on Grubnak: Gorgemaw 6/6 and 7/8, Glutton 3/6 and 8/8, Gizzard 6/6, Oathbroker 7/8, Guarantor 5/6, Collector 6/6 (the Bastion 6/6 and 7/8 on the same seeds; the misses are the party failing to hide from Gut Blast).

**Spec trials:** Glutton *The Last Banquet* (every dish served twice: fusions win it in time), Gizzard *The Lean Winter* (two allies to keep alive through knells; only what you digest feeds them), Guarantor *The Debtor's Daughter* (the Shade's sentences fall on your ally), Collector *The Debt Called In* (a short enrage: the bills have to pay). A bot playing the spec passes all four.

**Art:** no painted icons or portraits yet (`art: { icons: false, portraits: false }`); drawn glyph icons (`ICON_GLYPHS` in `hud.js`) stand in. Briefs in `docs/art/hero-portraits.md`, `ability-icons.md` and `spec-icons.md`.
<!-- /tanks-2 -->
<!-- classes-c: Threadweaver (healer) and Marionettist (DPS), 2026-10 -->
**Threadweaver, Seamstress Witch** (◆◆◆, complexity 4). Signature: **Threads**. Gauge: a spool that winds fuller as your threads carry damage (Spool, 0 to 100). Ranged caster; autos flick a needle-glint (25).

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Needle | GCD | 1.5 s cast, 270. Each Thread on you tugs a small heal (120) to whichever end of it is more hurt. |
| W | Tie | oGCD | 2 charges, 6 s. Tie your target to yourself with a thread. Press it on a second ally within 4 s and those two are tied to each other instead. Up to 3 threads; a fourth drops the oldest. |
| E | Mend Seam | GCD | 1.8 s cast, 440 heal that runs down every thread on the target at full strength. With 35 Spool it spends it, is instant and heals 35% more. |
| R | Snap | oGCD | 25 s. Cut the threads on your target (all of yours if it has none); each releases what it carried in the last 5 s as a heal to both ends (at least 200). |
| D | Tighten | oGCD | 20 s. Pull your target up to 220 px along their thread toward the far end. |
| F | Tapestry | oGCD | 120 s. Ties the whole party into one web for 8 s: any hit on one of you is split evenly among everyone. |

- **A thread** splits a hit on either end evenly between both ends, and a heal on one end runs 60% of the way down. Heals don't split.
- **Threads snap** when their ends get more than 550 px apart (260 until 2026-10-24), with a small heal (150) to both ends. A thread whose end dies is simply gone.
- **Spool** fills from damage your threads carry (1.1 Spool per 1% of your max HP carried) and is spent by Mend Seam.

*Ceiling:* tie the person about to be hit to someone healthy before the hit, read the arena to know which threads a spread mechanic will tear and Snap them yourself first, re-tie on the stack, and keep Tapestry for the hit that would kill. Newbies reach 53% of pro damage, the widest gap of any healer.

**Marionettist, Puppeteer** (◆◆◆, complexity 4). Signature: **the Doll and its Strings**. Gauge: a little stage with five footlights (Encore, 0 to 5) and the three strings above it. The Marionettist stands back; a Doll on three strings does the fighting. She has no auto-attack of her own: the Doll jabs on its own (40, every 4 s while she fights and it has the enemy in reach; Cue makes the next three come every 2 s). No Encore from those.

| Key | Skill | Type | What it does |
|---|---|---|---|
| Q | Cue | GCD | A finger snap: the Doll lunges for a 180 stab at once, and its next three Jabs come twice as fast. +1 Encore. The filler. |
| W | Pull Strings | oGCD | 2 charges, 10 s. Fling the Doll to where you aim (within reach). It cuts what it passes through and stays there until you pull it again or pick another target. Every pull ties all three Strings back and gets a limp Doll up at once. |
| E | Cross-Cut | GCD | 8 s. The strings become blades along the line from you to the Doll: 560 and +2 Encore if the enemy is on the line, nothing otherwise. |
| R | Pirouette | GCD | 12 s. The Doll spins: 300 around it, and nothing can touch it for 1.5 s. +1 Encore, +1 more for a blow it spins through. Glows when a telegraph is about to land on the Doll. |
| D | Swap | oGCD | 20 s. You and the Doll trade places. Stage Cross: the next Cross-Cut within 6 s cuts twice as hard and gives 1 more Encore. |
| F | Grand Finale | GCD | 10 s, needs 5 Encore: spends it on five hits of 253 (about 100 on screen at base gear). The Doll can't move while it plays. |

- **The Doll** works only the enemy you have picked (click or Tab): it stations itself on that enemy's far side. With none picked it stays where it is. Pull Strings parks it until you pull again or pick another target; Swap leaves it for 1.5 s. Bots keep the old 3 s hold.
- **Strings:** three. One tears if the Doll is dragged past 300 px from you (it gets yanked back) or a boss mechanic lands on it. At 0 the Doll goes limp for 4 s and then all three come back; a torn string regrows after 15 s. Pull Strings ties all three back at once and gets a limp Doll up.
- **The rework (2026-10-24):** Jab became the Doll's own timed hit and Cue took Q; Pull Strings restrings; Grand Finale's hits went from 160 to 253. To keep the class's damage where it was, `potMult` went from 0.922 to 0.79, so every other number shows about 14% smaller (Cross-Cut about 221 on screen instead of 258), and Cutting Line's share rose from 0.622 to 0.657.

*Ceiling:* the boss's mechanics are aimed at you, but your damage lives somewhere else. Keep the Doll out of the red with Pull and Pirouette, stand so the boss sits on your string line for every Cross-Cut, and start Grand Finale only when you've read the next five seconds. Newbies reach 69% of pro damage: the Doll keeps jabbing even when you play badly; the gap is in Grand Finales on time, the cut lines and using Pull Strings to tie the Strings back.

**Specs.**
- **Loomwright** (The Living Web): 5 threads, and heals run two links deep (60% to the far end, then 30% on through that ally's threads).
- **Shears** (The Cut Thread): threads store 60% more, Snap recharges in 8 s and refunds 10 Spool per thread, and Tighten becomes **Lash** (the pull plus a 260 shield for 2 s).
- **Cutting Line** (The Bladed String): strings reach 400 px and cut any enemy they cross once a second (48, and Taut String: +12 for every second the line holds across, up to +72; it slackens when the line leaves or a String tears), and Cross-Cut is an oGCD with 2 charges on 9 s.
- **Understudy** (Two Dolls on One Bar): two Dolls at 58% each. The triangle between you and both Dolls is **the Stage**: an enemy inside takes 10% more damage from the whole party.

**Talents.** Threadweaver: Backstitch, Cross Stitch, Taut, Thimble, Reel In, Knotwork, Embroider (replaces Mend Seam), Full Bobbin, Tension, Grand Tapestry, Selvedge, Long Thread, Cat's Cradle (replaces Tighten), Heartstring, Double Knot. Marionettist: Flourish, Lunge, Counterweight, Body Double, Safe Landing, Stand-In, Tangle (replaces Pirouette), Encore! Encore!, Second Act, Standing Ovation, On Cue, Quick Change, Red Curtain (replaces Swap), Twin Strings, Final Bow.

**Host-side design.** Both classes need rules no single client can judge, so the host owns them (`fight.js`, the weave and Doll blocks):
- **Threads live on the host.** Tie, Snap, Tighten and Tapestry are combat events; the host keeps the list, measures lengths every tick, snaps long threads, splits damage in `damagePlayer` (marked `shared` so it never splits twice; enrage, falls and self-damage are never split), runs heals down the threads, and logs what each thread carried for the last 5 s. It sends `thr` (the list) on change and `thrs` (snaps); it tells the weaver `carry` (Spool), `snapped` (Knotwork) and `tiefail` (the charge comes back). Tighten is a knockback toward the partner.
- **Where the split sits in the damage order.** A hit on a threaded player is split first, on the raw incoming amount, into equal shares for them and everyone threaded to them (Tapestry: everyone). Each share then runs through its own taker's full order (vulnerability and defence, mitigations and parry, the Gorgemaw's jaw, the Oathbroker's Ledger, shields, HP) and is marked shared, so it can never split again. So a tank's cooldown only cuts the tank's own share; an Oathbroker writes the share that reaches them into their Ledger like any other hit; and a share landing on a co-signed ally is co-signed as usual. Never split: enrage, falls, self-inflicted damage, Ledger bills and settles (they were split, if at all, when the hit was first taken, and skip the threads like they skip mitigation), and **a hit an open jaw is about to eat**: the Gorgemaw swallows it to 25% and keeps all of it, rather than handing teammates shares of a hit that was going to shrink.
- **Dolls and the Gorgemaw.** A mechanic a Gorgemaw swallows whole (a spread circle eaten for a teammate) never resolves, so it can't catch a Doll either; one the jaw only takes a bite of still resolves for everyone else, Doll included. Dolls themselves are never edible.
- **Dolls are reported by their owner** (10 times a second: position, state, strings) and judged by the host: a mechanic resolving on a Doll that isn't safe, limp or out of date sends the owner `dollhit`. The host rebroadcasts every Doll as `dolls` so everyone draws them, and works out the Stage (an enemy inside an Understudy's triangle takes 10% more from everyone).
- **The simulator and the town have no host**, so the kits fall back to counting their own threads and Dolls; the sim models thread snaps and Doll hits as part of each class's movement.
- **On screen** (`arena/stagecraft.js`): threads bow loose when slack and pull straight, brighten and shiver near 550 px; a snap flicks apart; the Doll is a jointed wooden puppet (drawn in `heroes.js`) with one string per String left, reddening as it nears its reach; the Stage is chalked on the floor and lights while the boss is inside.

**Design changes from the plan (`docs/plans/2026-10-new-classes.md`):**
- **The Stage is +10%**, not 15%: 15% made an Understudy worth more than any DPS in the party.
- **Snap cuts one ally's threads** (all of yours if the target has none), not every thread at once, so it can be aimed at the one a spread will tear.
- **Knotwork** gives back a Tie charge when a thread snaps on its own, rather than re-tying automatically (an automatic re-tie fought the player's own pairing).
- **Mend Seam** is instant only when it spends 35 Spool; there's no Spool-free instant.
- **The Doll stations itself** on the far side of the boss when you haven't placed it. Without that, every new player's Doll stood on top of them and took every hit.
- **No raise in the Threadweaver kit**: six keys left no room. Parties with a Threadweaver need another healer's raise or play without one.
- **Understudy's damage target is 7% under the class** (`balance: 0.93`); the Stage pays the rest to the party.
- **A thread that snaps on its own heals both ends a little** (150), so a torn web isn't a total loss; only Snap releases what it carried.
- **Art:** both ship without painted icons or portraits (`art: { icons: false, portraits: false }`): drawn glyph icons and sprites stand in, and briefs are in `docs/art/`.

**Tested (2026-10-20):** `tools/check.js` passes with both classes in the baseline: the Threadweaver deals 1038 pro DPS (Cleric 1038) with 1423 HPS, the Marionettist 2295, specs within 5% (Understudy against its 0.93 target), every talent under +7% and the best full build +17.6%. Seven new bot line-ups clear on Normal 3 of 3: Threadweaver on Grubnak, Volkar (Loomwright) and the Hollow King (Shears); Marionettist on Grubnak, Skitterra (Cutting Line) and the Hollow King (Understudy); and both together on Volkar. A Threadweaver as the only healer on Skitterra cleared 2 of 4 in extra runs. All four spec trials pass with a bot playing the spec (Loomwright's 4 of 4). In the browser at 1280×800 (solo with bots): a Tie drawn host to client, a snap past 260 px with its effect, Tapestry tying the party, the Spool gauge and icons, both Dolls of an Understudy flanking the boss with their strings and the Stage lit on the host, Cross-Cut's string flash, a Doll going limp and recovering, and no script errors. Not yet played by a human or over a real network connection.
<!-- /classes-c -->

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
| Thermist | 1422 | 2356 | 60% |
| Driftblade | 1433 | 2407 | 60% |
| Alembist | 632 | 1090 | 58% |
| Ironpalm | 832 | 1522 | 55% |
| Gorgemaw | 1076 | 1498 | 72% |
| Oathbroker | 1197 | 1485 | 81% |
| Threadweaver | 547 | 1038 | 53% |
| Marionettist | 1576 | 2290 | 69% |

These numbers include auto-attacks. Each class's `potMult` was lowered when autos were added, so pro damage stayed where it was. Newbies gained a little, because autos keep hitting while they move or hesitate.

Every class has a clear newbie-to-pro gap (14–37%; 40% for the two advanced DPS, by design), and the gap grows with the class's difficulty rating. Within each role, pro damage is balanced to within about 10% through a per-kit `potMult` knob in `combat/kits.js`. Healer pros deal more damage because they stop over-healing and attack instead.

## 4. Bosses

Shared rules for every fight:
- **No text tells you what to do.** Cast bars show the attack's name; the boss's animations and props show what's coming.
- **Tells are things in the world, not colored shapes.** Each boss's mechanics are drawn as objects that belong to that boss (`client/js/arena/boss-tells.js`): Grubnak's are kitchen things, Skitterra's are silk, legs and venom. The danger area still matches the object exactly. **Telegraphs are never hidden, on any difficulty** (rule set 2026-10-20, replacing the old "Hard drops the outline" design): a dashed outline and a wash sweeping out from the origin mark the exact hit area from the cast until it lands, and `FightSim.mech()` refuses to hide anything but a raidwide. The boss's pose and the prop in his hand are an extra clue, never the only one. Every part of a tell, including props in the air like the cleaver, cloches and jars, is drawn under the heroes, boss and adds, so a mechanic never hides a unit.
- **Every boss gets at least one mechanic that isn't a floor shape** (a moving hazard, a pull, a tether), so fights feel different and not just reskinned.
- **No riddles or instruction text, but thinking is welcome.** Nothing on screen says what to do or poses a puzzle in words. Pairing, ordering, soaking, passing, baiting, cover, reading what the room will do next and stored mechanics that replay are all good, as long as they're solved by moving through what the floor and the boss show.
- **Scaling.** Fights scale with party size (boss HP 42% / 62% / 82% / 100% for 1–4 players). Empty slots can be filled with bots that use the real class kits.
- **Normal is a real raid.** A good group should expect several wipes on its first night with any boss, Grubnak included. Avoidable hits take well over half a DPS's HP, and each one leaves +50% Vulnerability for 15 s (`def.vuln`, twice the engine default), so one mistake hurts a lot and two usually kill. The overlapping patterns run from the first loop, the cadence is quick, and the enrage timers are tight. Every Normal attack is still telegraphed on the floor.
- **Hard mode** casts 15% faster and hits 25% harder, and every boss has **three moves Normal never uses**, each with its own floor tell, body tell and impact effect in that boss's style. On top of those, Hard gets harder by layers, never by hiding the floor: stored mechanics replayed later, two known mechanics at once, role-split targeting (the tank gets one thing, the healer another), shorter but always visible warnings (never under 1.2 s), debuffs that punish doing the same thing twice, a tighter enrage and less breathing room.
- **Upcoming moves feed.** Every scripted step has a player-facing name, its cast name (the optional third element of an `f.seq` step; `f.at` / `f.after` take a name too). About once a second, and whenever the list changes, the host sends `{ t: 'bnext', l: [[name, secondsUntil], ...] }`: the next three named steps of the current phase, plus kept ones such as the enrage. A phase change can cut the list short. A boss still built on loops lays each phase's rotation out with `f.loop(build)`, which schedules the next loop 20 s before the current one ends, so the feed sees across the seam. A rebuilt, choreographed boss (below) lays each course out whole and the next one as soon as it's known, so the feed reads across every join. The raid-info branch draws it; the bots read the same list (`view.next`) to top the tank before a buster, heal ahead of party-wide damage, and hold tank cooldowns for the next buster.
- **Choreographed fights** (October 2026, `docs/plans/2026-10-choreographed-fights-prompt.md`; Grubnak first, the other three still loop until they're rebuilt). Each boss is one authored, non-looping script of 8 to 10 minutes, the same order on every pull. Anything that varies (a side, a tool) is read from a tell; patterns that need a plan (plate spots, meatball lanes, spice circles, stripe direction, Whisk spin) are fixed.
  - `f.course({ sets, until, closing, ramp, next, onStart })` in `fight.js` is one act. Its steps come in sets (the gap before a set's first step is the calm between sets) and are laid out all at once.
  - **Phase gates by HP, content by time.** A course ends when the boss reaches `until`, at the next set seam (8 s at most), so a set never stops half-way and a fast party skips the tail. The next course is laid out at that moment.
  - **A slow party gets no free loop.** Once a course's sets run out, its `closing` steps (its last set) run again and again, each pass with +10% boss damage ("Fury" under the boss bar), until the gate.
  - **Hard enrage:** one named cast, set so a party playing cleanly has about a minute of slack.
  - **Party size:** the timeline is the same for 1 to 4 players; plates, stacks and spreads count the living. Boss HP scaling is unchanged for now (42/62/82/100%).
  - `npm run check` lints every rebuilt boss ("Grubnak's timeline"): no `f.loop`, no hidden telegraph, every step named, nothing avoidable shown for under 1.2 s, no more than 16 s between named steps, a raidwide every 150 s and a tankbuster every 180 s at most, the feed always three deep, and the script 8 to 10 minutes long when each course ends as its sets do.
  - **Set 2 systems** (October 2026, `docs/plans/2026-10-set-2-bosses.md`; the set 1 fights use only the ticks; set 2 opts in per boss). The full contract is in the header comment above `course()` in `fight.js`.
    - **Visible HP gates.** Every `until` is a tick on the boss bar. A boss lists them up front (`def.gates: [0.75, 0.5, ...]`, numbers or `{ f, push, wall }`) so the acts show from the pull; any gate a course lays out that isn't listed is added then. The host sends them (`fb.g`) when they change and every 3 s.
    - **Push.** `push: true` on a course (or `def.push`): the moment the boss reaches the gate, the act's remaining steps and closing passes are cut and the next act begins at once, instead of waiting for the next set seam. Telegraphs already on the floor still resolve; follow-ups laid with `f.after` die with the act, so a move that must finish lays them with `afterKeep`. A party that is behind still gets the closing passes, up to the gate.
    - **Wall.** `wall: { label, run(f), until: 'resolved' | fn, timeout }` on a course with an `until`. From the act's start the boss cannot be taken below the gate (every damage path is clamped there). At the gate it is sealed: a shield of light drawn round it, a gold notch on the bar's gate tick that lights, and a pip with the label under the bar. The act's remaining steps are cut and `run(f)` lays out the mechanic that breaks the seal, which calls `f.wallDown()` (or `fn(f)` returns true; `timeout`, 45 s by default, opens it anyway). Then the act ends as usual. Practice skips a wall like any passed-over course.
    - The lint (`check.js`) counts named steps laid with `afterKeep` too, so a wall's own mechanic must keep the upcoming-moves feed at three names until it falls (the last two named in the same tick).
- **Every boss has its own room shape** (`ARENA_DEFS` in `client/js/arena/shapes.js`). The shape fits the theme and the mechanics: Grubnak's kitchen is a long rectangle (1040 × 720, rounded corners; shrunk from 1240 × 840 in October 2026 because the room felt too big, with spawns, plates, Flambé stripes, Boil Over falloff, Belly Flop throw and cask landings retuned to match), Skitterra's web is an octagon hung between eight rock pillars, Volkar's summit is a circle whose electrified edge closes in during phase 2 (on Hard it breaks away a wedge at a time instead), and any boss without its own shape gets a circle. The walls are walls: you're never knocked off an edge, except where Volkar's summit has broken away on Hard (a fall). Wall clamps, bot planning, the camera, mechanics that start at the wall (Rolling Meatballs, Venom Mist) and telegraph clipping all read the shape, so a new boss only needs a new entry.
- **The room has things in it** (October 2026, `docs/plans/2026-10-arena-mechanics.md`). Every boss's room holds **props** the host owns (`PROPS` in `shapes.js`, `addProp` / `hitProp` / `breakProp` in `fight.js`): casks, rock pillars, braziers, coffin lids and fallen masonry, standing stones, boulders.
  - **Solid:** nobody walks through one (players, bots, adds and the boss collide and steer round them), and a throw stops at one.
  - **Cover:** a mechanic with `cover` comes from a point (usually the boss); anyone whose line to it passes through a cover prop is spared. `coverCap` limits how many hide behind one prop (nearest first), and `chip` knocks a hit off the props used (or all of them). The telegraph is drawn with each prop's shadow cut out of it and nothing painted in the shadow: the floor behind each prop is simply left out of the red, for the players to read.
  - **Breakable:** props with HP show cracks on their last hit (a step ahead), break with debris and dust, and leave rubble.
  - **Wall slams:** `FightSim.knock()` throws a player; stopped well short by a wall or prop, they take slam damage and are dazed (held briefly).
  - **Permanent floor state:** rubble, grease, broken ground, drawn once into a cached layer. Grease catches fire and fire runs on through every puddle it touches.
  - **Network:** a `props` message (every prop packed, the floor list only when it changes or every 9 s, which grease is burning) on every change and every 3 s, so late joiners get the room; `propfx` for chips, breaks, slams, ignitions, bolts and the like; `roomev` for room moments (Lights Out, an ambush shadow, the stove, rod marks, a wedge about to break).
  - **Bots** hide behind their own prop (spread over the props in id order, healthiest and nearest first), keep out of solid props, never stand where a throw would slam them, bait Butcher's Charge into a brick wall, stand in the light for Lights Out, and break cocoons and coffins first.
  - Every new move has a cast-bar name and an upcoming-moves feed entry. Where a new move took an old one's slot, the old one was filler; Normal keeps its pressure and Hard adds.
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

### Boss I: Grubnak, the Ogre Chef (built, playable on Normal and Hard; rebuilt as a choreographed fight 2026-10-20)

The dinner rush in the Scullery. One authored service, the same on every pull, that never lets up: four courses, each faster than the last, and a kitchen that catches fire half-way through. He never leaves the floor (the only boss with no downtime). The question he keeps asking is **where do I stand?** It covers where your puddle goes down, where the casks land, which wall his charge hits and which plate is yours. Pilot plan and the choices behind it: `docs/plans/2026-10-grubnak-pilot.md`.

Stats:
- HP: 3.1M (Normal) / 3.3M (Hard). A party at about 290 DPS (the bots) kills in about 9 minutes; a pro party in about 7:20.
- Auto-attacks: 80 every 2.8 s on whoever has the most threat. He visibly winds up first, which Bastion's Perfect Block reads.
- Enrage: "Last Call", cast at 9:52 and landing at 10:00 (Normal), or 10:07 and 10:15 (Hard). That leaves about a minute of slack on Normal and 45 s on Hard.
- Damage below is in the game's numbers (Normal, then Hard). Heroes have about 1,050 HP (tanks 1,600).

**The service** (times for a party at about 290 DPS):

| Course | Gate | Tempo | What happens |
|---|---|---|---|
| **Appetiser** | 100% → 80% (about 1:45) | his tools one at a time, about 11 s apart | Grease Fire, Mince, Ladle Spin, Lid Slam, Tenderize, Meat Toss, Family Meal, Larder Toss → Gut Blast, Grease Fire. Hard opens with Clogged Drains. |
| **Mains** | 80% → 50% (about 4:20) | everything returns paired, about 10–13 s apart | Butcher's Charge into brick; Chop Chop; Tenderize; **the order rail**; Meat Toss → Family Meal; Larder Toss, then the charge with the casks already down, then Gut Blast; Grease Fire; the rail again under Rolling Meatballs (Hard: Cleaver Toss); Tenderize; Chop Chop; toss → meal. Hard adds Belly Flop. |
| **Flare-Up** | at 50% | about 40 s, he stays targetable | **Flare-Up**: he heaves the stockpot onto the stove. The top third of the kitchen burns for the rest of the fight (225 a second), the heat reaches everyone (325) and any grease touching it lights. Flambé runs down the room and lights the stains you left. He drags the **stockpot** to the middle (solid, cover, unbreakable), and it Simmers out, then in. |
| **Second Sitting** | 50% → 18% (about 7:20) | the burning, smaller kitchen; new tools arrive already paired | Whisk; Spice Rack → Ladle/Lid; Larder Toss → Boil Over; Tenderize (Hard: Meat Hook on the healer at the same beat); Gut Blast (a cask or the pot); (Hard: Mise en Place); the rail with Meat Toss landing just after the last plate (Hard: the **Dinner Rush** instead); Butcher's Charge; Grease Fire; (Hard: Service!); Whisk + Rolling Meatballs; Family Meal under Spice Rack; Chop Chop (Hard: Double Chop, then Belly Flop); Tenderize. |
| **Dessert** | 18% → dead | the **Dessert Trolley**: a gauntlet on 2.5–4 s beats, each landing as the next is called | Flambé, Meat Toss, Rolling Meatballs (Hard: Cleaver Toss), Mince, Ladle/Lid, Spice Rack, Family Meal, Whisk. Then 12 s of silence, **Last Orders** (raidwide, 550) and Gorge every 15 s until he drops or calls Last Call. |

- **The course's gate ends it at the next set seam** (8 s at most). A slow party that runs a course out gets its last set again, each pass with +10% boss damage ("Fury" under the boss bar), so there's no free loop.
- **Determinism:** the order never changes. His tells decide which half Mince chops and which tool follows Chop Chop or Belly Flop (and, on Hard, the tools on the pass). Plate spots, meatball lanes, spice circles, the Flambé direction and the Whisk spin are fixed for each place in the script.

| Mechanic | Normal | Hard |
|---|---|---|
| **Grease Fire** | Raidwide, 425. | 531 |
| **Tenderize** | Tankbuster cone that cleaves anyone else in it: 1,300 on the tank. | 1,625, and it leaves *Tenderized*: the next one within 30 s hits 60% harder |
| **Mince** | One half of the room gets chopped (650). His cleaver on that side catches the light. | **Double Chop:** the other half 2.2 s later, drawn from the cast as a ghost behind the first |
| **Ladle Spin / Lid Slam** | Spin = get out (circle on him). Lid held overhead = get in (everything outside him gets hit). 650. He holds his ground until it lands. | same, faster |
| **Chop Chop** | Mince, then straight into Spin or Lid 2.4 s later. The second shape shows from the cast, and the tool hangs on his back. | same |
| **Meat Toss → Family Meal** | Spread circles on everyone but the tank (375, more if they overlap). Each leaves a grease puddle (130 a second, 24 s), then a **grease stain** that stays (at most 8) until fire reaches it and burns it off. Family Meal follows as soon as they land: a stack on one non-tank, 1,100 split among everyone in it (the tank may stay out). | Called together: the meal goes on the tank and lands 2.5 s after the toss; everyone must be in it. Bigger, longer puddles |
| **Order Up! (the order rail)** | One plate (tower) per player round the kitchen, served one after another clockwise from the top left, 1.6 s apart (250 each). Every cloche's gold rim fills toward its own moment, so the next one up is always the fullest. A plate left on the counter hits everyone for 700. After the Flare-Up the plates sit in the lower part of the room. | **Six plates for four** (four for three), 1.5 s apart, and a plate leaves you *Stuffed* for 4 s (a second plate while Stuffed: 700). Nobody can take two in a row, so the party works out who takes the extras (1 and 5, 2 and 6) |
| **Rolling Meatballs** | Three giant meatballs lobbed to set spots on the rim. Each wobbles in place (chevrons and a lane across the room), then rolls straight across, flattening (650) and knocking aside anyone in its path. Staggered. | Four, faster and tighter |
| **Spice Rack** | Jars pour on set spots (650), plus one locked under each non-tank. Ladle or Lid follows straight after. | same |
| **Whisk** | A cross of beams through him that turns 30° four times (650); its spin and start are set. | same |
| **Boil Over** | Damage falls off with distance from him (2,000 at the pot). | 2,875 |
| **Simmer** | Rings of boiling water ripple out from the stockpot, then back in (650). | Faster waves |
| **Last Orders / Gorge** | A big raidwide (550) after the Dessert Trolley; then Gorge every 15 s (325), 10% harder each time. | same, +25% |

**Hard-only moves:**

| Move | What happens | How it reads |
|---|---|---|
| **Belly Flop** | He flops down where he stands: the circle under him (radius 230) takes 812, and the shock throws everyone 200 away. The Ladle Spin (stay out) or Lid Slam (run back in) that follows 2.8 s later is on the floor from the start. | His shadow swells under him; he crouches and bounces; the lid or ladle shows on his back |
| **Cleaver Toss** | A cleaver flies along a line at each of the two farthest non-tanks (812). The lines follow them until a second before the throw, then each cleaver flies back along the same line 1.5 s later (812). | Score marks run out along the floor and sharpen once aimed; on the way back it hangs in the far wall and chevrons point home |
| **Flambé** | Brandy in stripes (six top to bottom, or four side to side, set by the script). Every other stripe goes up (875), then the rest 2.2 s later: step into a burnt stripe. | A wet amber sheen, blue flame along it just before it catches |
| **Mise en Place → Service!** | In the Second Sitting he lays three tools out on the pass along the bottom wall, left to right: a cleaver lying on one side of its board (that half gets chopped), the ladle, the lid, in a shuffled order. About 30 s later, Service! brings them out in that order, 2 s apart, each one drawn on the floor from the cast. | The tools on the pass; each lights as it's served |
| **Dinner Rush** (the dance, Second Sitting, in place of the rail and its Meat Toss) | He plants himself just south of the stockpot (0, 175), facing it, and holds there. A hot plate hangs over every player for the cast (3.4 s): where each stands when it comes down, their plate is set down (a one-person plate, Stuffed as on the rail). He then works the line on three beats 2.2 s apart, the plates coming up **nearest him first**: 4 s after the set-down the first plate with Double Chop's **west** half; then the second with the **east** half and a **Lid Slam** at once (safe: the west side of its quiet circle, 230 here, wider than the plain Lid Slam's so a plate fits with room beside it); then the last two together with a **Ladle Spin** (240). The chop is drawn from the cast, the lid at the set-down, the ladle as the first half lands. Cast names come with each beat (Dinner Rush, Double Chop, Lid Slam, Ladle Spin). | A plate on a chain over each hero, the set-down ring blue (a soak to come); then the rail's cloches, their blue rims filling in serve order |

**The kitchen's props:**

| Move | What happens | Mode |
|---|---|---|
| **Larder Toss** | He rips two casks off the shelves and throws them at the two farthest players (each circle follows its player until 1.6 s before; 450 under it). A cask stays where it lands (never in the fire): solid, two hits, cover. At most four stand at once. | Both |
| **Gut Blast** | A roar across the whole kitchen (750). Hide behind a cask or, after the Flare-Up, the pot: the blast is drawn with each one's shadow cut out. Every cask takes a hit. | Hard: 1,000, two to each |
| **Butcher's Charge** | He lowers his head at his tank and charges until he hits something (700 to anyone on the line). A brick wall: stuck for 4 s, taking 20% more damage. The stove line (before the Flare-Up): the burners erupt over the top third of the room for 10 s (225 a second) and light any grease. A cask: smashed. **The stockpot** (after the Flare-Up): the short way. He's scalded and stuck the same, but the pot slops over in a ring round itself (650) 2.4 s later. | Both |
| **Clogged Drains** | The three drains back up and grease spreads round them for good. Fire (Flambé, the stove, the Flare-Up) runs through every puddle it touches. | Hard |
| **Meat Hook** | A chain off the ceiling rail hooks the healer as the tank takes Tenderize, and drags them 210 toward the stove; through burning grease or into the fire, they catch fire. | Hard |

**How his tells look** (all in `boss-tells.js`; every one also has the outline and wash): Mince darkens the doomed half under a giant ghost cleaver; Ladle Spin churns soup around him; Lid Slam casts the lid's shadow with ripples out to the safe ring; Meat Toss drops a steak on a chain; Family Meal lowers a silver cloche; Order Up! lays out steaming plates under glass cloches with a gold progress rim; Spice Rack shakes salt, pepper and paprika jars; Whisk draws wire loops; Boil Over is rolling heat with bubbles; Simmer's rings are stove coils going dull, red, white-hot; Grease Fire spreads an oil slick that catches fire. The stockpot is a squat copper pot on its own fire, bubbling and steaming (`arena-view.js`, `stockpot`); the pass is a board along the bottom wall (`misePass`).

**Bot test results** (four bots with the real kits and a competent-player AI that reacts instantly, so a human group should expect to do worse at first):
- **Normal, Bastion / Aegis Cleric / Sharpshooter / Cataclysm** (the first `check.js` line-up), twelve seeds: **9 of 12, in 8:31–9:53**. The wipes come from a DPS dying early (the party then runs into Last Call, as it should) or a pile-up in the Mains' second rail or the Dessert Trolley.
- **Every Grubnak line-up in `check.js`** (eight, three seeds each): 15 of 24, every line-up at least once. The Threadweaver, Gorgemaw and Thermist/Driftblade line-ups clear 1 of 3.
- **The Dinner Rush** (Hard, October 2026): the one plan is plate 1 nearest him on his east flank, plate 2 a little farther on his west flank at the lid circle's edge (room for the Stuffed first server), plates 3 and 4 out past the ladle. Set that way it's east, in to the west, out, and the two near servers never leave him. A plate set too near comes up a beat early, under the chop. Bots set their plates by party place (`BotAI.rushSpot`: shield 95 east, third place 165 west, healer and fourth 320 out east and west) and serve by landing order; on Hard rails a bot keeps well clear of a plate that isn't its own (the host counts anyone touching it) and stays on its own until it's served even with the ladle coming. Started from the Flare-Up (practice), four line-ups (base; Runeguard/Grovekeeper/Shadowblade/Driftblade; Bloodreaver/Chronomancer/Thermist/Marionettist; Ironpalm/Alembist/Ranger/Shadowblade) took no avoidable hit over 40 runs; the only deaths in the window came in runs where the healer had already fallen.
- **Hard, base specs:** runs clean through every course and the slow-party sequence. The longest of three ran to Last Call at 10:15. With the party kept alive, every Hard move (Clogged Drains, Double Chop, Belly Flop, Cleaver Toss, Mise en Place → Service!, the six-plate rail, alternating Flambé, Meat Hook) fires on six seeds out of six, and the kill lands at 9:00–9:41.
- **The script itself** (the timeline lint, each course ending as its sets do): 8:09 on Normal, 8:38 on Hard.
- Bot changes for the longer fight: towers that land one after another are handed out in landing order (one each where possible, nobody while Stuffed), and grease a fire is about to reach counts as burning.

### Boss II: Queen Skitterra, the Spider Broodmother (built, playable on Normal and Hard; rebuilt as a choreographed fight 2026-10-20)

The hunt in the web: one authored script, the same on every pull. It's long dread, then sudden swarms, and the question she keeps asking is **what do I break?** That means egg clutches, the knots of her threads, and the pillars you hide behind. Plan and choices: `docs/plans/2026-10-bosses-2-4-plan.md`. The arena is an octagonal web cave: cracked flagstones and standing pools under a huge web strung between eight rock pillars, bones and old egg sacs, stalagmites beyond the rim.

Stats:
- HP: 3.0M (Normal) / 3.2M (Hard). The bots' line-up kills in 8:17–9:21.
- Auto-attacks: 78 every 2.8 s, with the same visible wind-up as Grubnak.
- Enrage: "Devour", cast at 10:02 and landing at 10:10 (Normal), or 10:12 and 10:20 (Hard).

| Mechanic | Normal | Hard |
|---|---|---|
| **Venom Mist** | Raidwide, 425. Her fangs drip green during the cast. | 531 |
| **Silk Wrap** | Tankbuster cone that cleaves anyone else in it, 1,300 on the tank. Where it lands, the tank is **rooted** (2.6 s, can't move or dash). Silk threads wheel around her during the cast. | 1,625; root lasts 3 s |
| **Eightfold Lunge** | Her legs light up around her (glowing leg lines, brightest = next). Each step strikes a leg's direction and the opposite one (two 70° cones, 650), turning 45° per step, so the safe side rotates. 4 steps, 1.3 s apart; each floor telegraph appears 2.5 s before it lands. | 6 steps, 1.15 s apart, 687 (the floor telegraph shows too: telegraphs are never hidden) |
| **Silk Lines** | A silk thread ties two non-tanks. It must be stretched past 420 when it resolves, or both take 800 and Vulnerability. Slack threads sag and wobble; a stretched one runs straight and bright. The second one each loop comes with Venom Spit straight after. | Two threads on four players: green (stretch past 420) and thick red (stay within 150) |
| **Venom Spit** | A narrow cone at each of the two farthest players (600). It tracks them until 1.2 s before it lands, then a slowing venom pool (110 a second, 45 s) is left where it hits. | 656; bigger pools that last 60 s |
| **The brood clock** | Six egg clutches sit in the web from the pull (1,200 HP each, breakable), glowing brighter and pulsing faster as they near hatching. **Brood** (Act I): the two ripest, opposite each other, hatch one spiderling each. **The Swarm** (Act II): every clutch still standing hatches two. Spiderlings stay near their nest (leash 240) and spit at whoever is closest, biting anyone who comes near. When one of a pair dies the other must die within 5 s or it **enrages**: heals 30%, chases anyone, bites 3× harder and pulses a raidwide every 3 s. Left alone for 45 s, both enrage. Every clutch broken costs damage on her now and saves two spiderlings later. | 30k HP for the Brood pair; three to a clutch in the Swarm; a burning beam joins each pair while both live |
| **Spin** | Four threads strung pillar to pillar, a square round the middle. Walking through one stings (150) and roots you for 0.7 s, so the room is cut into sectors. Each has a knot by its first pillar (1,200 HP): break it and the thread is cut for good. A pillar that falls cuts its threads. | same |
| **Silk Reel** | She rears up and shoots a thread at the farthest non-tank. After a short wind-up it goes taut and drags them toward her (and slows their walking). **Dashing snaps the thread.** If she reels them all the way in, she bites: 850 plus a slow. | Two players reeled at once, pulled faster |
| **The Dark Between** (70%) | She climbs into the dark for 40 s (untargetable). The cave falls to pools of light round the pillars. Her shadow runs along each uncut thread in turn and she drops at its far end (a circle of 190, 650, on the floor for 6 s). A thread whose knot is broken before she gets to it is a drop that never comes. Venom Drip (spread, 350) falls mid-way. She comes back down into the middle with **Tightening Web**: the outer ring (390 to the wall) turns sticky for the rest of the fight. | Two drops per uncut thread (the far end, then the near) |
| **The Collapse** (28%) | The cave floor falls away ring by ring from the walls (430, then 330, then 260 out), each shuddering for 6 s first with the silk cut out of the warning. What stays: the hub, the eight spokes, and every thread nobody cut. Anyone on fallen floor drops (700), is held 2 s, then hauled back onto the floor nearer the middle. Pillars on falling floor go with it. | same |
| **Molt** (phase 2) | none | She sheds a pale husk and skitters 240 away. She starts a new Lunge while the husk replays her previous one: two rotations from two centers at once |

**Hard-only moves:**

| Move | What happens | How it reads |
|---|---|---|
| **Egg Sacs** | Three sacs drop around her web, each wanting one person to stomp it (312, and stuck in the goo for 1.5 s). A sac nobody stomps bursts over everyone (625) and leaves a slowing pool of venom. | A pale sac bound in silk sits in each circle, twitching faster as it ripens, with a burning-down rim and one pip; the eggs in her abdomen glow during the cast |
| **Fang Rush** | She charges the farthest player across the web along a 160-wide line (937). The line follows them until 0.8 s before she goes; the silk she drags behind her stays on the floor for 16 s and slows anyone on it. | Threads of silk hang slack along her path while she aims and snap taut once she's set, with pink light racing down them; she rears with her fangs dripping |
| **Spinneret Volley** | Four globs of silk fall in turn on everyone but the tank (687 each), 1.15 s apart. Each follows its target and stops 0.9 s before it lands: keep walking. | A white glob drops on a thread, its shadow tightening under it; silk wheels around her and she rears |

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

**The hunt** (times for the bots' line-up; each act ends at its HP gate at the next set seam, and a slow party runs its last set again, +10% each pass):
- **Act I, The Web** (100% → 70%, about 2:30), 14–15 s apart, one thing at a time: Venom Mist, Silk Wrap, Eightfold Lunge, Silk Lines, **Spin**, Venom Spit (Hard: Egg Sacs), Strand Reel (Hard: Fang Rush), Venom Mist, Wrap + Lunge, **Brood** with Silk Reel, Acid Deluge.
- **The Dark Between** (70%, 40 s): Into the Dark, then From the Dark along each uncut thread in turn, Venom Drip, Tightening Web.
- **Act II, The Brood** (70% → 28%, about 3:20): Venom Mist, Wrap + Lunge, Silk Lines + Spit, (Hard: Spinneret Volley), Silk Reel (Hard: on the healer, as Silk Wrap lands on the tank), Lunge (Hard: Molt), Strand Reel (along a thread still standing), (Hard: Ceiling Ambush), Venom Mist, (Hard: **Snare Weave**: she takes the hub and fills the web with snares in two layers 3.4 s apart, three clear pockets each, not painted (one by her at 140, two at 320, the second layer's turned 60° round her); the two farthest from her tank are Egg-Laden and drop a 26 s venom pool between the layers: the pocket just left is the place), Acid Deluge, **The Swarm**, Silk Wrap, Silk Lines, (Hard: Egg Sacs, Fang Rush), Venom Mist, Lunge, Lines + Spit, Silk Reel.
- **Act III, The Collapse** (28% → dead): the first ring gives way, Venom Mist, the second ring with a Lunge, Silk Lines, the third ring with a Silk Wrap, (Hard: Spinneret Volley), Silk Lines, Venom Mist, Lunge. Then Venom Mist and Lunge in turn, each pass 6% harder, until Devour.

**Cocoon is gone** (2026-10-20, the "never cocoon a player" rule).

**Bot test results:**
- **Rebuilt (2026-10-20), Runeblade / Moonwell / Bladedancer / Sigilmancer**, twelve seeds: **11 of 12, in 8:17–9:21**. The bots break the next knot she's heading for in the dark, break eggs while more than two clutches stand and nothing has hatched, keep off the threads (crossing one costs them), and stay on the silk in the collapse.
- **Every Skitterra line-up in `check.js`** (six, three seeds each): 13 of 18, every line-up at least once (the Gorgemaw line-up 1 of 3).
- **Hard, rebuilt:** runs clean. With the party kept alive, every Hard move fires on six seeds and the kill lands at 8:39–9:09.
- *Before the rebuild:*
- **Normal, Runeblade / Moonwell / Bladedancer / Sigilmancer** (the `check.js` line-up): cleared 15 of 18 over six seed sets, in 3:46–4:18. The wipes come when both spiderlings enrage.
- **Hard, Bastion / Cleric / Ranger / Pyromancer:** 1 of 8 (with one death); the rest reach 21–73% and last 1:43–5:37, usually after the healer falls to venom pools, the beam and a bite.
- **With the pillars** (October 2026, six seeds): Normal (the `check.js` line-up) 4 of 6 in 3:59–4:56 (the wipes at 3% and 53%); Hard (base specs) 2 of 6, the rest reaching 20–74%.
- The bots split the DPS over the brood pair (one each) and ease off when theirs gets well ahead of its sibling. They stretch or close tethers, bait Venom Spit and Fang Rush outward and sidestep at the lock, avoid crossing the beam and pools, keep walking under the Volley, take the nearest free egg sac (the tank last), and stay out of the sticky ring and the silk trail when they can.

**Not built from the original design:** a "real cleave moment for Pyromancer". No kit has multi-target damage yet, so the brood is a split-and-sync check rather than a cleave check.

**The web's props** (October 2026): eight rock pillars (three hits each, cover) stand at the octagon's corners, 375 out, with her silk tied off round them; the corner pillars drawn in the room art became small anchor spurs.

| Move | What happens | Mode |
|---|---|---|
| **Acid Deluge** | She climbs to the middle, raises her abdomen and rains acid over the whole cave. Hide behind a pillar (the rain is drawn with each pillar's shadow cut out); every pillar that sheltered someone takes a hit. | Both. Hard: the floor the acid reached stays sticky (slows) for 8 s |
| **Strand Reel** | She shoots a strand to a pillar at least 260 away and reels herself across to it: the lane under the strand hits and roots for 2 s, and she holds there for 4 s. | Both |
| **Fang Rush** | Now stops at the first pillar in its way and chips it. | Hard |
| **Ceiling Ambush** | She vanishes up into the dark; her shadow crosses the ceiling, then she drops (230 around her, drawn on the floor as well as her shadow) and the shock throws everyone 380 away, slamming anyone who hits a pillar or the wall. | Hard |

Merges: Strand Reel sits beside Silk Reel and Fang Rush rather than replacing either (one pulls you to her, one throws her at you, this one moves her across the room). Acid Deluge comes once or twice a phase and both Venom Mists stay, because the fight got too easy with the Deluge in a Mist's place. Cocoon was removed in the 2026-10-20 rebuild.

### Boss III: Volkar, the Storm Titan (built, playable on Normal and Hard; rebuilt as a choreographed fight 2026-10-20)

The storm front: one authored storm, the same on every pull. It's a steady crescendo, a calm eye, then it all comes back, and the question he keeps asking is **who do I pair with, and where's cover?** Polarity is the spine. Plan and choices: `docs/plans/2026-10-bosses-2-4-plan.md`.

Theme: polarity, knockbacks, rods that become cover, and a room that closes in. The hardest healing fight. Design choices made together on 2026-10-19: soaked rods stay as cover, the edge closes in three warned steps, healing pressure comes from a ramping Pulse, and he is a giant who never leaves the middle.

The arena is the summit of a mountain above the storm: a round shelf of slate (radius 540) scarred by old lightning, with a carved ring where he stands, rain pooling in hollows and wind-flattened grass at the rim. Beyond the cliff edge are clouds and other peaks far below. Clouds drift past, rain slants across, grass bends in the gusts, leaves blow over, and lightning splits the clouds now and then, lighting the summit.

Stats:
- HP: 3.35M (Normal) / 3.8M (Hard). The bots' line-ups kill in 7:33–8:43.
- Auto-attacks: 65 every 2.8 s (Hard 70); he never walks (`anchor`), so the tank comes to him.
- Enrage: "Skybreak", cast at 9:52 and landing at 10:00 (Normal), or 10:07 and 10:15 (Hard).

| Mechanic | Normal | Hard |
|---|---|---|
| **Polarity** | Everyone carries + (gold ring with + marks) or − (blue ring with − marks), half each, all fight. | The charges flip at 50% |
| **Polarity Surge** | Two of the same charge within 150 arc (750 each, avoidable); someone with only opposite charges near takes 100; anyone alone takes the full surge (425). Arcs crackle between same charges before it lands; a calm bond joins opposite ones. | 937 / 125 / 531 |
| **Thunder Crash → Static Field** | A storm cloud and a stack over every + player (650 split per pair): each pair stacks together, and pairs keep apart. Static Field (everyone spreads, 195) follows 3.8 s later. | 469 each; the Field follows 3.3 s later (223) |
| **Static Field** | Everyone spreads (275). | 344 |
| **Lightning Rods** | Two iron rods are driven into the rock, each wanting one person when the bolt lands (250). Catching one gives *Conductive* for 32 s; catching another while Conductive hurts a lot (600 more). An uncaught rod strikes everyone (600). The rod then stays planted for 30 s. The second set each loop comes with a Gale Slam once the rods stand. | 3 rods |
| **Gale Slam** | He draws breath and throws everyone 300 away. Thrown into the wall or a standing stone is a slam (450) that dazes you for 1.2 s. The still air behind any standing rod shelters you; on Normal it shows as a pale strip. | Lands together with the rods: shelter behind the rod you're catching. No floor tell. Thrown off a broken edge is a fall (937, held 5 s) |
| **Storm Walls** | Two walls of wind (150 wide) turn slowly around him for 10 s (550). Walk with them. | 3 walls, turning faster, 12 s (594) |
| **Titan Fist** | Tankbuster cone that cleaves, 1,000 on the tank. Lightning gathers along it. | 1,375, and it leaves the tank Conductive |
| **Thunderclap** | Raidwide (325); the summit darkens under rolling clouds first. | 406 |
| **Pulse** | The storm hits everyone lightly every 4 s (13), 5% harder each minute. It stops while the Eye is open. | 19 |
| **Squall Line** | The summit's safe circle (radius 360, its centre 150 from him) slides off-centre and orbits him once over 30 s: the electrified edge closes on one side and opens on the other. Outside the circle the storm is live (300 a second). The party walks round him with it, still attacking, while the rest of the script carries on inside it. | same |
| **The Eye of the Storm** (55%) | 40 s of calm: the clouds part, the Pulse stops, he stays targetable. **Still Air**: the four stones light up, two + (gold, a + on the face) and two − (blue, a −), opposite stones alike, each with a tower ring of its colour. When the Eye closes each stone wants one person of its own charge: a wrong charge at it is struck (600), and a stone nobody answers discharges across the summit (450 to everyone). Distant Thunder rumbles in between (nothing lands). | The charges flip 2 s after the Eye opens, so the stone you need changes |
| **The closing edge** (back half) | The edge electrifies and closes in warned steps: 540 → 470 a minute into the back half, → 400 at 2:30 in, → 330 as the finale starts. Sparks crawl along the new line for 5 s; anyone outside when it jumps takes 600 and is pushed in. | Replaced by the Crumbling Summit (below), from 2:20 into the back half |
| **Heavens Fall** (finale, 15%) | A column of sky comes down on a set spot round him (140 out, turning 135° each time), shown 5 s ahead. The whole party stands in it together: 1,400 split between everyone in it. It wants both charges in it: all one charge, and it surges through them (750 each). Every 15 s, each 10% harder, until he dies or calls Skybreak. | Every 13 s; 1,750 |

**Hard-only moves:**

| Move | What happens | How it reads |
|---|---|---|
| **Chain Lightning** | A bolt gathers over one non-tank for 5 s. It strikes them (437), then leaps to the nearest player within 300 of the last one struck, up to three more times (437 each, with Vulnerability). The target walks away from everyone. | A storm cell gathers over the target; a dashed, crackling ring shows how far the bolt can leap, and red sparks already jump to anyone inside it. When it lands, the bolt runs player to player (`chain` message). He crackles with charge while he casts |
| **Ball Lightning** | Four crackling orbs gather at the cliff edge, then drift slowly (135) across the peak in staggered lines. Touching one hurts (750) and throws you aside. | Each orb forms out of a falling bolt and crackles in place with chevrons showing its heading (plus a dashed lane on Normal) before it drifts |
| **Grounding Rods → Supercell** (the dance, the Front, in place of the first Rods + Gale) | An iron rod hangs over each + player (3.8 s); where they stand it's driven in (a post, 18 s). 0.6 s later, **Supercell** (2.55 s cast): three squall fronts march across the summit on a 135 grid round him, a strip every 0.5 s, nine strips each, always in this order: from the west (marching east), from the north 3 s later (marching south), from the east 3.5 s after that (marching west). Each cell 469, at most once per front. A front's bolt runs along each row (or column) until it strikes a rod: the rod's own cell is hit, every cell past it stays dry (not painted: the red cells stop short of it while that front passes). Just after the last front passes, a Thunderclap (time to heal up in between). The plan: the rods a cell either side of him, east and west, in the row through him; then the lanes are his east flank (first front), the columns just south of each rod (second), his west flank (third): round your rod with your partner, never leaving him. | The rod sways on a chain over its carrier; the fronts are dark sheets of driving rain with lightning (red rims, the next strip full, later ones faint); each rod takes a bolt as its front reaches it |
| **Skyfall** (the back of the storm) | The sky comes down on the spot where a random player stood when he called it, 5 s later: 2,250 at the spot, falling off with the square of the distance out to 520. In the shrinking room, get as far away as the wall allows. | The clouds open over the spot, the floor brightens toward it and rings of falling air close in; the sky churns over him while he casts |

**The summit's props** (October 2026): four standing stones at the cardinal points, 260 out. They're solid (a throw into one is a slam) but cover from nothing.

| Move | What happens | Mode |
|---|---|---|
| **Rod Strike** | Two players are marked (a charge ring over their heads, burning down), then, as their bolts land, the other two. The bolt hits the stone nearest each marked player if they stand within 70 of it: everyone that close takes 400. Out of reach, it hits the marked player in the open (750). A stone keeps the charge for 10 s (its runes glow): struck again in that time it **discharges** into everyone within 180 (600), so the second pair takes the other two stones. | Both. Hard: 562 / 1,125 / 750 |
| **Grounded** | A discharge also leaps to the nearest player beyond it, within 250 (562). | Hard |
| **Avalanche** | He stamps and three boulders roll in lanes (100 wide) from one side of the summit, stopping just past the middle (550 and thrown off the lane). They stay as solid cover, and the next **Storm Walls** passes over anyone behind one (drawn with each boulder's still air cut out of the wall), smashing each boulder as it passes. A shrinking edge or a breaking wedge takes any boulder in its way. | Both. Hard: four boulders, 750 |
| **Crumbling Summit** | Hard, from 2:20 into the back of the storm: instead of the edge closing in evenly, a wedge of the summit (a fifth of the circle) breaks away every 20 s, five in all, leaving the floor 310 out. Cracks run along the new lip and the doomed wedge darkens and shudders for 6 s first; anyone still on it falls (937, held 5 s while the wind drags them back up). The room goes lopsided, so the Storm Walls' safe lanes and the Gale's safe spots change with each break. | Hard |

Merges: Rod Strike takes the Front's first Lightning Rods (the posts, Conductive and the rods-with-Gale stay everywhere else), so the Gale Slam after it has no posts: stand close enough to him that the throw doesn't reach a wall or a stone. The stones are not Gale shelter (the plan said "solid but not cover", and shelter there would make every Gale trivial). Avalanche sits just before a Storm Walls. Heavens Fall stands alone in the finale (with a Field and a Surge between them it was too much healing for the slack the script leaves).

**The storm** (times for the bots' line-up; each part ends at its HP gate at the next set seam, and a slow party runs its last set again, +10% each pass):
- **The Front** (100% → 55%, about 4:10), the gaps tightening from 15 s to 9 s: Thunderclap, Titan Fist, Surge, Thunder Crash → Field, Rod Strike, Gale Slam (no posts: stand in close), Storm Walls, (Hard: Chain Lightning on the healer as Titan Fist lands on the tank), Thunderclap, Titan Fist, Rods + Gale Slam (Hard: **Grounding Rods → Supercell → Thunderclap** instead), Avalanche → Storm Walls (hide behind the boulders), Surge + Crash together, **Squall Line** (Static Field and a Thunderclap inside it), (Hard: Ball Lightning), Titan Fist, Rods + Gale Slam, Crash → Field, Thunderclap.
- **The Eye** (55%, 40 s): Eye of the Storm, Still Air, Distant Thunder, Eye Closes.
- **The Back of the Storm** (55% → 15%, about 3:20), the Front mirrored and doubled: Thunderclap with a Crash (pairs from where the Eye left you), Titan Fist + Surge, Rods + Gale with a Crash, Avalanche from the other side with the walls turning the other way, (Hard: Skyfall), Rod Strike + Field, Thunderclap, Titan Fist (Hard: with Chain Lightning), **Squall Line the other way round** (24 s, with a Surge and a Field inside it), Rods + Gale, (Hard: Ball Lightning), Crash → Field (Hard: with Storm Walls), Thunderclap, (Hard: Skyfall), Titan Fist, Surge. The edge closes in behind it all (Hard: the summit crumbles).
- **Heavens Fall** (15% → dead): the edge closes to 330 and the sky comes down every 15 s (Hard 13 s), each 10% harder, until Skybreak.

**Hard** keeps his three moves (Chain Lightning, Ball Lightning, Skyfall), adds the Supercell dance in the Front, and adds layers: the charges flip as the Eye opens; three rods and three walls; Titan Fist leaves the tank Conductive; Chain Lightning on the healer as the Fist lands on the tank (a role split); the summit crumbles a wedge at a time instead of closing evenly; Heavens Fall every 13 s; Skybreak at 10:15. Every telegraph shows on the floor on both difficulties.

**New engine pieces:** `ARENA.resize()` (a round room's wall moves; `ARENA.full` keeps the original size), `ARENA.cuts` / `radiusAt()` (wedges broken off a round room; clients rebuild them from the `wedge` floor entries, so late joiners get them), sweeps with `cover` (props of one kind shelter from the walls and are smashed as each wall passes), `def.spawn` / `def.anchor`, `FightSim.sweep()` (turning walls: one `sweep` message, every client turns them on its own clock), a fall-check grace after the wall moves, and the `pol`, `post`, `edgewarn`, `edge` and `pulse` messages. The rebuild added the `squall` and `eye` room events (one message; every client moves the Squall Line's circle on its own clock and draws a ghost of where it's going), stone states 2 / 3 for Still Air's lit + and − stones, and tower rings that take a colour. Bots pair with their opposite charge (the higher id walks to the other, so bots come to you), take rods in turn (bots before humans, Conductive last), shelter behind rods when a Gale Slam would throw them into the wall, read where the storm walls will be along their path, and stay inside the next ring.

**Bot test results:**
- **Rebuilt (2026-10-20), Berserker / Accelerant / Venomstrike / Pyromancer**, twelve seeds: **12 of 12, in 7:33–7:51**. Hemomancer / Inquisitor / Nightstalker / Sigilmancer: 6 of 6, in 8:18–8:43. The bots stay inside the Squall Line's circle (and where it will be in a moment), and at Still Air each takes a stone of its own charge, people first, then bots by id.
- **Every Volkar line-up in `check.js`** (nine, three seeds each) clears at least once. The slowest (Bastion / Cleric / Thermist / Driftblade, whose healer does half the Chronomancer's damage) clears 2 of 3 just before Skybreak. That line-up is what sets the HP: at 3.6M it ran out of time with 1–7% left, and at 3.35M the Berserker line-up dips under eight minutes.
- **Hard, rebuilt:** with the party kept alive, every Hard move fires on six seeds and the kill lands at 8:47–9:22.
- **The Supercell** (Hard, October 2026): bots plant the rods by plan (`BotAI.rodSpot`: the + players by id, 135 west and east of him) and walk the lanes from the `safe` strips (sim data; not drawn); the same four line-ups over 20 runs took no cell hit. (A Shadowstep bot used to teleport behind him into a landing strip: bots now hold Shadowstep while floor is about to land.) The only deaths in the window came in one run per line-up where the healer and the shield had already fallen.
- **Bots and the Storm Walls** (fixed in the rebuild): they used to walk back to their spots through the walls' last turn, since their path check only looked at quarter-points of the walk, all past the walls' end on a long walk. They check the next half second as well now. This took out the wall hits on every boss with Storm Walls.
- *Before the rebuild:*
- **Normal, Hemomancer / Inquisitor / Nightstalker / Sigilmancer:** cleared 18 of 18 over six seed sets, in 4:11–5:43.
- **Normal, Berserker / Accelerant / Venomstrike / Pyromancer:** cleared 9 of 18 (at least one in every set of three), in 3:42–4:25. The bot Chronomancer heals far less than this fight asks, and a Berserker has only two long cooldowns for the Titan Fists.
- **Hard, Bastion / Cleric / Ranger / Pyromancer:** 0 of 8; the bots reach 18–77% and last 1:32–7:08 (two runs reached the enrage).
- Bots keep away from Chain Lightning's target (the target walks away from everyone), stay off the orbs' paths, and run from Skyfall.
- **With the stones** (October 2026, six seeds): Normal Berserker / Accelerant / Venomstrike / Pyromancer 4 of 6 (3:38–3:54), Hemomancer / Inquisitor / Nightstalker / Sigilmancer 6 of 6 (4:12–4:27); Hard (base specs) 0 of 6, reaching 56–82%. Marked bots take the nearest uncharged stone after the people have taken theirs, the rest keep off the stones being struck, nobody stands where the Gale would throw them into a stone, they hide behind boulders from the walls, and they get off a wedge before it breaks.

### Boss IV: The Hollow King, Lord of the Barrow (built, playable on Normal and Hard; rebuilt as a choreographed fight 2026-10-20)

The court of the dead: one authored hearing, the same on every pull, in five sessions. Its shape is call and response: he calls (a swing, a Gaze, a decree) and the court answers a fixed beat later (the knights replay it, the coffins stir, the bells toll). The question he keeps asking is **what did I just see?** Plan and choices: `docs/plans/2026-10-bosses-2-4-plan.md`.

A dead king holding court in his own tomb. Design choices made together on 2026-10-19: you avoid the Gaze by turning your back (your hero faces where they walk), the Echo Knights replay his last two swings, and the Long Night is a dark floor with telegraphs that always glow.

The arena is a long burial hall (a 1200 × 880 rectangle). Worn flagstones and grave slabs, a faded runner up to the dais, his empty throne against the top wall under a tall window, pillars and sarcophagi down both sides, candles along the walls and grave-green braziers in the corners. The moon sinks in the window through the whole fight; when it's gone, that's the enrage. Candles flicker, dust hangs in the air and mist creeps along the walls.

Stats:
- HP: 3.3M (Normal) / 3.65M (Hard). The bots' line-ups kill in 8:47–9:26.
- Auto-attacks: 82 every 2.8 s. He walks after his tank like Grubnak and Skitterra.
- Enrage: "Moonset", cast at 10:22 and landing at 10:30 (Normal), or 10:32 and 10:40 (Hard).

| Mechanic | Normal | Hard |
|---|---|---|
| **Royal Gaze** | He lifts his head and an eye opens over him. Under every hero a cone shows which way they face, red if they'd meet his eyes. Anyone facing him (within about 70°) when it lands takes 450, is held in place for 2 s, and gets *Dread* for 20 s; caught again while Dreading takes 800. Casting at him turns you toward him, so you stop and step away. From Testimony on, some echoes bring a Gaze with their first replay. | 562 / 1,000 |
| **Royal Doom** | A violet skull sigil over one player (never the tank), its ring burning down over 14 s; it kills when it runs out. Lanterns are set down around the hall (one more than there are doomed). The doomed walk into a lantern's light, or anyone picks one up by walking over it and carries it to them. A cure uses the lantern up. | 13 s; two players at once in the Verdict |
| **Grave Cleave** | Tankbuster cone that cleaves, 1,250 on the tank, then the tank bleeds for 9 s (37 every 1.5 s). | 1,562; the bleed is 56 |
| **Barrow Knell** | Raidwide, 450; the hall darkens and the toll rolls out in rings. | 562 |
| **Grave Marks** | Everyone spreads (400). | 500 |
| **His swings** | *Sceptre Sweep* (a wide cone in front; he holds still while it winds up), *Barrow Stomp* (a circle around him, cracks spreading through the stone) and *Crown of Graves* (everywhere except close to him; hands reach up out of the floor). 650. Each comes at a set place in the script, so the upcoming-moves feed names them. | 812 |
| **Echo Knights** (80%) | Two ghost knights rise by the side walls, facing the middle. Each swing he makes is remembered by the next knight (it flashes on the knight). A few seconds later each knight replays its swing from where it stands, aimed at the middle, with a short warning (2.6 s): narrower cone, smaller circle, wider safe ring. They stand at set spots, and move to the other corners after the Court of Bones. | 1.8 s warning |
| **Barrow Bells** | Two bronze bells, each wanting two people (one each if fewer than four are alive). A missed bell dooms everyone, with a lantern for each. | none |
| **The Charge Sheet** (Testimony) | He reads out three charges. Four banner standards stand either side of the dais; the first three light in turn, 2 s apart, each showing the sigil of one of his swings (a boot for Barrow Stomp, a sceptre for Sceptre Sweep, a crown for Crown of Graves), and the same sigil shows over his head as he reads it. Then they go dark. Nothing lands. Always the same three, in the same order. | Four charges: Royal Audience (an open eye) is the second |
| **Judgement** (opens the Verdict's second half, at 46%) | The Charge Sheet comes due: the three swings land in that order, 1.5 s apart, from him and both knights at once. The knights' sweeps are narrower than their echoes, and the knights don't join the Crown of Graves (nobody can stand close to three people at once). Each is shown on the floor for only 1.6 s. The banners blaze grave-green in turn, with no sigils. | 1.2 s on the floor; the Audience among them |
| **Court of Bones** (62%, a recess) | He goes back to his throne, out of reach (untargetable), and wakes six coffins down the walls in a set order, 3 s apart. Each glows and burns down as it nears opening; break it first and it sends nothing, or a skeleton climbs out. A Knell and Grave Marks come during it. Then the knights move and he rises (38 s in all). Lids still lying about crumble. | same |
| **The Long Night** (25%) | The lanterns go out and the braziers die. The hall goes dark but for a little light around each hero and a wide pool around the one lantern left. Telegraphs, heroes and the knights stay visible; he's a shape in the dark. **The relay:** Doom passes round the party in a fixed order (the tank only when nobody else is left), one every 12 s with 11 s on the clock, and the next one's sigil fades in over their head 6 s before it lands. The lantern cures on touch and passes to whoever it cured, who carries it to the next. Swings, echoes, Gazes and Knells between. The night lifts when he falls. | Two lanterns, two dooms at once, 10 s |

**Hard-only moves:**

| Move | What happens | How it reads |
|---|---|---|
| **Royal Audience** | The opposite of the Gaze: anyone with their back to the king when it lands is caught exactly as by the Gaze (562, held for 2 s, Dread; 1,000 if already Dreading). Face him. | A crown of gold light rises over him, its points growing; the same cones under every hero, red now if their back is turned; his own crown blazes and its points lengthen |
| **Funeral March** | Five ranks of his dead march across the hall from one wall to the other, a second apart (875 each). One lane, 220 wide, stays open the whole way across; or step in behind a rank once it has passed. | Grave-light pools where each rank will tread and a row of ghost soldiers with levelled spears tramps forward through it; the first rank shows for the whole cast, the others 2.4 s before they land. He lifts his greatsword while he casts |
| **Gravebind** | It comes as Grave Cleave lands on the tank (a role split): a grave-chain binds the healer and a DPS for about 7.5 s: they must be within 160 of each other when it breaks, or both take 1,000 and Vulnerability. The other DPS gets Grave Marks (spread) that land at the same time. | Iron chain links between the two, hanging slack once they're close, pulled straight and burning green while they're too far apart; grave-light pools under him during the cast |

**The hall's props** (October 2026): six braziers down the side walls (x ±400; lit or snuffed), solid but no cover. The corner braziers in the room art were removed so the real ones read.

| Move | What happens | Mode |
|---|---|---|
| **Lights Out** | He snuffs every brazier and the hall goes black but for a ring of light (140) round each lit brazier. A moment later only the two nearest him flare back up, so you read where to stand from where he is. When it lands his Dread Gaze finds anyone in the dark, exactly like the Gaze. The braziers relight 2.5 s later. | Both (Testimony and the Verdict) |
| **Coffin Lids** | He tears the lids off two coffins, one each side, and they skid across the hall (470 long, 100 wide, 600 to anyone in the way), stopping early at anything solid. Each lies where it stops: solid cover, already cracked. | Both |
| **Royal Decree** | A wave of grave-light rolls down the hall from the throne (750). Only something solid between you and the throne shelters you (the shadows run straight down the hall); it smashes the lids. | Both. Hard: 1,000 |
| **Falling Masonry** | Each Knell brings two chunks of the vault down (circles of 85, 600, dust sifting first). They stay where they fall as cover, up to eight. | Hard |

Merges: "Last Ember" (one light left in the dark) is the Long Night's lantern rather than a second rule; at the Long Night the braziers go out for good.

**The hearing** (times for the bots' line-up; each session ends at its HP gate at the next set seam, and a slow party runs its last set again, +10% each pass):
- **I. The Summons** (100% → 80%, about 1:40), his calls one at a time: Knell, Sceptre Sweep, Gaze, (Hard: Audience), Cleave, Barrow Stomp, Doom, Crown of Graves, Knell.
- **II. Testimony** (80% → 62%, about 1:30): the Echo Knights rise, **the Charge Sheet**, Sweep → its echo, Coffin Lids → Decree, (Hard: Funeral March), Stomp → its echo with a Gaze, Cleave, Bells, Lights Out, Knell.
- **III. Court of Bones** (62%, 38 s, untargetable): the coffins wake in turn, Knell, Grave Marks, The King Rises.
- **IV. The Verdict** (62% → 25%, about 3:00): Sweep and Stomp at once → both echo, (Hard: **Burial Rites**: he walks to the middle and opens a grave per player in their party colour (slot 1 north, 2 south, 3 west, 4 east), closing 19.5 s later; **Writ of Execution** 3.5 s in: a line from him through each player (the second slot's is torn, Pardoned, harmless: its chain hangs broken and no lane is drawn), each red line burning on as a spoke until the graves close, so they must point between the graves; then a Crown of Graves the knights don't remember, landing 3.7 s before the graves close), Doom (Hard: on two) with Grave Marks, Lids → Decree, Cleave (Hard: with Gravebind), Crown → its echo with a Gaze, (Hard: Funeral March), Knell. At 46% **Judgement** opens its second half, then Knell, Bells, Lights Out, Stomp and Sweep → echoes, Cleave (Hard: with Gravebind), (Hard: Audience), Lids → Decree, Crown → echo with a Gaze, Knell.
- **V. The Long Night** (25% → dead): Doom passes on every 12 s with a swing, an echo with a Gaze, a Knell or a Cleave between, the passes 10% harder each time round, until Moonset.

**Hard** keeps his three moves (Royal Audience, Funeral March, Gravebind) and adds layers: the Charge Sheet has four sigils; Judgement shows each swing for 1.2 s; Grave Cleave on the tank as Gravebind lands on the healer and a DPS; Doom on two in the Verdict; two lanterns and two dooms at once in the Long Night; Falling Masonry with each Knell; Moonset at 10:40. Every telegraph shows on the floor on both difficulties.

**New engine pieces:** `FightSim.ticker()` (a per-tick hook for a boss script, used for the lanterns and Doom), and the `lant`, `doomed`, `cure`, `gazed`, `knights`, `kmem`, `kswing` and `night` messages. The rebuild added the `charges`, `judgement` and `doomnext` room events (the banners, the sigil over his head, the next doomed's sigil) and an untargetable recess for the Court. The host judges the Gaze from each player's facing, which already arrives with their position. The Long Night is a screen-sized dark layer with the lights cut out of it, drawn over the floor and under the telegraphs.

**Bots:** they turn their backs just before a Gaze lands (and keep facing him for an Audience). A doomed bot walks into the nearest light; a bot carrying a lantern takes it to whoever is doomed; when a person is doomed, the nearest free bot fetches a lantern for them; in the Long Night a bot (the healer if there is one) picks up the lantern, and whoever it cures carries it on to the next doomed. They go to whichever bell still needs people after counting the humans by the bell they're nearest. They remember what each knight saw and keep out of its replay before it shows (Judgement's swings too); when a replay covers everything close by they look farther out. On a Funeral March they make for the open lane; a Gravebind pair closes up.

**Bot test results:**
- **Rebuilt (2026-10-20), Sentinel / Lifebinder / Ranger / Cataclysm**, twelve seeds: **12 of 12, in 8:47–9:26**. Every `check.js` line-up clears at least 2 of 3 (Crusader / Echoist / Shadowblade / Sharpshooter 2 of 3, the rest 3 of 3). Every Doom of the relay was cured.
- **Hard, rebuilt:** Bastion / Cleric / Ranger / Pyromancer kill him at 10:03 in the check run. With the party kept alive, every Hard move fires on six seeds and the kill lands at 9:48–10:12.
- *Before the rebuild:*
- **Normal:** Sentinel / Lifebinder / Ranger / Cataclysm cleared 18 of 18 (5:48–6:07); Crusader / Echoist / Shadowblade / Sharpshooter 18 of 18 (5:32–5:59); Spellwarden / Cleric / Venomstrike / Nightstalker 16 of 18 (5:38–5:55), over six seed sets each.
- **Hard, Bastion / Cleric / Ranger / Pyromancer:** the bots reach phase 3 in most runs; 2 of 8 killed him during the Moonset cast, the rest wiped at 1–34%.
- Every Doom in every run was cured.
- **With the braziers and lids** (October 2026, six seeds each): Normal 6 of 6 for all three line-ups (5:52–6:26); Hard (base specs) 0 of 6, reaching 5–40% (three reached the Moonset).
### Boss V: Vhalgrath, the Ember Wyrm, Tyrant of the Cinder Peaks (set 2, built 2026-10-22, playable on Normal and Hard)

*The first boss of set 2 (`docs/plans/2026-10-set-2-bosses.md`). Script: `client/js/arena/bosses/wyrm.js`; room: a 560-radius crater (`ARENA_DEFS.wyrm`, `ArenaView.buildCrater`); journal: `client/js/journal/wyrm.js`.*

**Shape: the hunter in the air. Question: where is it going to land?** Four acts on HP gates, all pushed (`push: true`), one wall at the end.

- **Ground.** He walks after his tank. Rending Claws (tankbuster, a cone), Tail Lash (the cone *behind* him), Ember Breath (a cone at a random hero that follows them until a second before it goes; the floor in it, from 190 out, is molten for 20 s), Magma Burst (a circle on every hero but the tank, each leaving a pool), Cinder Feast (a stack on a random hero), Tyrant's Roar (raidwide). Hard shuffles the middle sets of each ground act per pull.
- **Flight.** Take Flight (a gust; he is out of reach until he lands). Dragonfall draws a line of embers from the rim to one of the **three crater spots** (scorched pits at south, north-west and north-east, drawn into the floor) and a ring on the pit he has picked; he flies the line and lands in the ring. The pit and the side he comes from are random each time, shown 4.6 s ahead (3.9 s Hard). The line and the ring are one hit (a shared `group`). Twin Pass: two lines at once, the first only a pass-over, the second landing; the second shows 3.5 s ahead of its landing.
- **The Roost** (the seam, opening the third act). He perches on the rim for 12 s and shakes burning scales onto random tiles (a volley every 2 s: three tiles, one under a random hero) while two ember whelps harry the party; any whelp left alive when he comes down detonates (a circle shown 2.2 s). Then **the Crater Boils**: the ring of floor from 465 out (430 Hard) is molten for the rest of the fight.
- **The Ember Heart (the wall).** At 10% he is sealed (`wall`: label "Ember Heart"). Heart Burn, twice (Hard three times): scorch marks bloom at the three crater spots one after another, 2 s apart; the last one marks the island. The floor-wide fire (a donut: everything but a hole 235 across, smaller on later waves, 195 on Hard's third) is shown 3.6 s before it lands, so the island is the unpainted hole, and a hero can work it out from the first two marks. Between the waves: a Roar as the last fire lands, then a buster in the same tick as the seal opens. Hard adds a Heart Flare in the middle.
- **Last Ember.** The Heart closes; the last 10% is Roar, Twin Breath, claws, Magma Burst, tail, then closing passes (+8% a pass) until he falls or **Ashfall** lands (10:20 Normal, 10:30 Hard).
- **Hard** (casts 15% faster, 25% more damage, and three new moves): **Wingbeat** (every dive: the wings shove everyone within 235 of the flight line away from it, a wall slam if they hit the rim; named on the cast frame as it goes), **Cinder Rain** (ten embers across the crater, each a circle and a small pool), **Heart Flare** (a stack on a random hero, then a spread on everyone as it lands).
- **Pools and molten floor give a second's grace** before they first burn, so a hero standing where one appears can step out of it.

| | Normal | Hard |
|---|---|---|
| HP | 3.45M | 4.1M |
| Gates | 75% / 50% / 24%, the wall at 10% | the same |
| Script (scripted length) | 9:12 | 9:57 |
| Acts (nominal ends) | 1:57 / 3:54 / 6:00 / 8:00, the Heart to 8:25 | 2:07 / 4:13 / 6:38 / 8:38, the Heart to 9:12 |
| Enrage | Ashfall, lands 10:20 | lands 10:30 |

**Bot results** (Bastion / Cleric / Ranger / Pyromancer, `tools/bot-raid.js`; 30–60 seeded runs each): Normal at fresh gear 60 of 60 (kill 8:13 on average), mid 28 of 30, full 20 of 20; the `check.js` line-ups at base gear 19 of 30 and 13 of 30. Hard at mid gear 32 of 60 (53%, kill 9:41 on average), fresh 13 of 30, full 28 of 30 (kill 6:57), base 0 of 20. A kill comes earlier than the script when the party is ahead of the gates (pushes cut the rest of an act).
### Boss VI: Hrimgar, the Frost Titan, Warden of the White Reach (set 2, built 2026-10-23, playable on Normal and Hard)

*The second boss of set 2 (`docs/plans/2026-10-set-2-bosses.md`). Script: `client/js/arena/bosses/titan.js`; room: a 1000 x 800 glacier plateau (`ARENA_DEFS.titan`, `ArenaView.buildGlacier`); journal: `client/js/journal/titan.js`. Opens after Vhalgrath falls.*

**Shape: the slow giant, and the ground itself. Question: what will the floor do?** Four acts on HP gates (74 / 48 / 22%, all pushed), one wall at 10%.

- **The sheets.** The floor is twenty ice sheets, five by four, 200 across (floor entries `kind: 'sheet'`, `st` 0 plain / 1 frozen / 2 cracked / 3 water; the script changes them and bumps `floorVer`). Where Hrimgar strikes (Rime Slam: the sheet under the circle; Fault Line: up to three sheets along the line) a sheet is marked: it is painted red as a normal telegraph for the whole warning, with cracks drawn in, and sinks when it lands. A sunk sheet is black water: a burn zone (bots read it as danger) plus a brief slow, until the Whiteout or 32 s on. A **frozen** sheet cannot crack (his blows glance off it) but is **slick**: entering it from other ground shoves you 105 along your heading (a `kb` from the host's ticker; bots take it through the same message). Winter's Grasp freezes the sheet under two random heroes (three on Hard) and thaws the old frost, so frost is always on a few sheets.
- **Braziers.** Four stand where four sheets meet (prop kind `brazier`, state 3, orange). **Frostbite:** a random non-tank is chilled (debuff `frostbite`, slowed) and a blue stack follows them; standing within 125 of a brazier for a moment cures them and takes the stack with it; otherwise the stack lands, and if they are still chilled at the end they are frozen solid (damage, rooted).
- **Acts.** The Thaw (Howl, Glacial Fist, Rime Slam, Fault Line, Icefall, Titan's Sweep) / the Freeze (Winter's Grasp, Frostbite, Whiteout, Twin Slam) / the Crack, opened by **the Long Night** (the seam: the aurora dims, four huge slow arcs and the frost called twice, so the marked heroes choose where the ice will be) / the Avalanche (Winter's Grasp, then **Avalanche**: five lanes, one per column of sheets; every sheet in a lane that is not frozen is painted red, frozen ones are left clear, the lanes land one after another).
- **The wall: The Plateau Tips.** At 10% he is sealed; the Grasp and the Avalanche run twice (Hard: three times), then a Howl and a Fist as the seal falls. Last stretch until he falls or **Endless Winter** lands (10:08 Normal, 9:58 Hard).
- **Hard** (casts 15% faster, 25% more damage, three new moves): **Glacial Stomp** (a stomp and two rings of shards: step into the quiet at his feet once the stomp has landed), **Breath of Winter** (a cone that freezes the sheets it crosses, then breaks them), **Titan's Grip** (a ring on a hero; whoever it catches is held, a stack frees them or they are crushed). Hard also shuffles the middle sets of each act per pull.
- **Pacing.** His ordinary swings stop while he winds up a heavy move. Autos 1650 / 1800.

| | Normal | Hard |
|---|---|---|
| HP | 3.5M | 4.4M |
| Gates | 74 / 48 / 22%, the wall at 10% | the same |
| Script (scripted length) | 8:25 | 8:25 |
| Enrage | Endless Winter, lands 10:08 | lands 9:58 |

### Boss VII: Azerath, the Sunken Archmage, Master of the Seven Circles (set 2, built 2026-10-23, playable on Normal and Hard)

*Script: `client/js/arena/bosses/archmage.js` (with the shared helper `AZ`); art: `client/js/archmage-art.js` (body, the four elementals, every tell and impact, the tower floor and its life, the rune link); room: a 540-radius round floor (`ARENA_DEFS.archmage`, `ArenaView.buildTower`); journal: `client/js/journal/archmage.js`.*

**Shape: the rotating lab. Question: which element is it, and who holds the rune?** Five acts on HP gates (78% / 55% / 32% / 14%), all pushed, no wall. He floats in the middle of the room (`anchor`) and never walks. The floor is seven circles: the middle one (a seven-pointed star), the two rings round it (the Pyre Rings' borders at 170 and 350) and four sigils at 270 from the middle (Fire north, Frost east, Lightning south, the Void west).

- **The Rune Pair (the set piece).** Rune Mark puts runes of two different elements on two random non-tank heroes (a rune glyph over each head, a link between them). The spell named next in the feed is of one of the two elements and decides **together or apart**. *Cinder Rune* (fire): a spread circle on each bearer; keep apart, or when they are within 250 at the lock a reaction circle (their two elements' colours, 165 across) is laid at their midpoint 1.35 s ahead. *Rime Rune* (frost): one blue stack halfway between the bearers (a `azlink` shape that follows both until 1.2 s before). *Storm Rune* (lightning): a bolt (a rect) from one bearer to the other, cut short at both ends, so bearers standing together make it harmless. *Rift Rune* (void): a donut (hole 90, outer 255) round each bearer plus a small unavoidable hit on them; the same reaction as fire. A pair that stood as asked counts a soak (points) for both. `f.runePair` is read by the bots (`view.runes`).
- **Act I Fire:** Arcane Burst, Arcane Lance (buster), Pyre Rings (two of the three floor rings burn 2.8 s apart; the third is never painted), Cinder Rune. **Act II Frost:** Ice Lances (lines out of him through two heroes, three on Hard, following them until 1.2 s before), Rime Rune, Cinder Rune returning. **The Binding (the seam, opens Act III):** the sigils wake; three elementals (random elements) are called one at a time 8 s apart, each walks after the shield (the tank) and must be led into its own sigil and stand in it 2.3 s; one left alone for 17 s blasts the room (a raidwide, tag `azSurge`). He stays targetable, pulses of circles fall all the while. **Act III Lightning:** Leaping Bolt (a circle on a hero, then the hero nearest them, four jumps, five on Hard), Storm Rune. **Act IV Void:** Void Rifts (circles where heroes stand, again where they went 2.5 s later), Rift Rune, the older moves mixed. **Act V Convergence:** all four sigils at once (a circle of 225 each in its own element, a shared `group`) and in each of the four lenses where two meet a reaction rect (74 wide); the clear floor is the diagonals by the wall (from about 310 out) and a small spot in the middle. Closing passes (+8% a pass) until he falls or **The Tide Rises** lands (10:08 Normal, 10:13 Hard).
- **Hard** (casts 15% faster, 25% more damage, three new moves, and each act's middle sets shuffled per pull): **Counterspell** (the last spell's areas, fire circles, donuts, lines, bolts and stacks, come again through the middle to the far side, shown at once, 4.4 s), **Rune Swap** (after the Mark the runes jump to two other heroes), **Arcane Mark** (a stack left where one hero stood, for everyone, all must be in it).
- **Bots:** `view.runes` and `view.binding` (raid-host.js); `BotAI.danger` makes the two bearers close up (the higher id walks) or keep 380 apart by the rule; the tank bot's `home` is the sigil of the elemental due to blow first. A Time Stop is refused (`f.noPause`) while a pair is held or an elemental is unbound.

| | Normal | Hard |
|---|---|---|
| HP | 3.9M | 5.2M |
| Gates | 78% / 55% / 32% / 14% | the same |
| Script (scripted length) | 8:59 | 9:29 |
| Enrage | The Tide Rises, lands 10:08 | lands 10:13 |

**Bot results** (Bastion / Cleric / Ranger / Pyromancer, `tools/bot-raid.js`, 30 to 60 seeded runs): Normal fresh gear 30 of 30 (kill 7:47), mid 30 of 30, the `check.js` base-gear line-ups 30 of 30 (Cleric Aegis) and 17 of 30 (Runeguard / Grovekeeper). Hard mid gear 32 of 60 (53%, kill about 9:55). The bots read the Rune Pair and the Binding: over 10 runs nearly no avoidable rune hits and every elemental bound.

### Boss VIII: The Hydra of the Drowned Temple, Mother of Nine Heads (set 2, built 2026-10-23, playable on Normal and Hard)

*The last boss of set 2 until the Void Gate exists (`docs/plans/2026-10-set-2-bosses.md`), so the hardest of the four. Script: `client/js/arena/bosses/hydra.js`; room: a 540-radius flooded temple (`ARENA_DEFS.hydra`, `ArenaView.buildTemple` in `client/js/hydra-view.js`); art: `client/js/hydra-art.js`; journal: `client/js/journal/hydra.js`.*

**Shape: many threats, one body. Question: which head is which, and what do they want?** Three acts on HP gates (75 / 45%, all pushed), a seam (the Submerge), one wall at 10%.

- **The Mother** sits in the pool at the middle (`anchor`) and never walks: Mother's Cry (raidwide) and Rending Maul (a tankbuster cone) every ~13 s, and the tank holds her.
- **The heads are killable adds** (`spawnAdd`, `inert: true`: they never walk or bite; kinds `hy-<element>`, `-s` lesser, `-e` Elder, `-w` breaking the flood). They stand on a ring 210 from the middle, one to a slot (nine slots, the first due north); nine columns (prop kind `column`, solid, cover) stand behind them at 400. **Turn order:** one head after another (the one that has waited longest first, clockwise from the north), the gap `max(3.4, 17.5 / heads)` s (Hard 14.5 / 3.0), capped at 11 s; every head aims at a random hero (never the same one twice running). The turns are named events (`owner: 'rot'`) so the upcoming-moves feed shows them and a dead head's turns vanish. Eight elements: **Acid Spray** (cone at a hero's position when it began, acid left in its middle for 8 s), **Tidal Line** (a lane through a hero), **Venom Bloom** (a stack on a hero, a slowing bog after; the number needed drops by one for each searing ring open), **Flame Gout** (a following circle on two heroes, embers after), **Rime Crown** (a donut round the head: close in or far out), **Stormcall** (three lanes fanned, the middle through a hero), **Stonegaze** (everything the head can see; the columns are cover: `cover: true`), **Mire Spit** (circles on three heroes, slowing bog after). Lesser heads do the same at 55% damage and smaller; an Elder at 125%.
- **Searing.** A great head that falls (`onDeath`) leaves a stump: the cast bar reads "Searing" and a blue tower (need 1, radius 62) opens at the foot of its column (470 out) 1 s later for 10 s (Hard 8.5 s). Soaked: the stump is seared, the head gone for good. Missed: everyone takes a sting and two lesser heads sprout in its place (Hard: three, with a "Regrowth" cast). The column's brazier burns while the ring is open.
- **Order.** `f.cutOrder` records the great heads cut. The **first** one cut in the fight grows back as an **Elder** at the start of Act III (acid if nothing was cut). The **Mother's Heart** replays the order.
- **Acts.** Three Heads (Acid, Tide, Venom at slots 0/3/6) to 75% / Six Heads (Flame, Frost, Storm at 1/4/7) to 45%, **the Submerge** (the seam: she dives, the temple floods and slows everyone for the dive, four lesser heads break the surface at random columns one after another, each with a ring first; each strikes once after 2 s and sinks after 8 s if not cut; the old heads are under the water; then she surfaces with a Cry) / Nine Heads (Gaze, Mire and the Elder at 2/5/8) to 10%.
- **The wall: the Mother's Heart.** At 10% she is sealed (`wall`: label "Mother's Heart"). The cut heads strike again from their stumps in the order they fell (up to five, 2.7 s apart, random targets), then every great head still alive at once, and in the same breath the Heart beats and the seal opens. Then Last Heads: Cry and Maul until she falls or **The Drowning** lands (10:20 Normal, 10:30 Hard).
- **Hard** (casts 15% faster, 25% more damage, the heads' round faster, each pull draws which head stands where, and three new moves): **Regrowth** (a missed ring grows three heads), **Tidal Dance** (two heads send lanes across each other three times, each pair crossing a step round from the last; the wedges between are the safe ground), **Hydra's Gaze** (a red circle over the whole inside of the temple, radius 372: only the ground by the wall is safe).
- **The head-picking order for bots** (`prio` set by a ticker in the script, bots.js `pickEnemy` unchanged): the heads breaking the flood, then lesser heads, then great ones the gentlest first (acid, gaze, storm, venom, frost, flame, tide, mire). The searing towers are served by the existing tower logic (`towerFor`).

| | Normal | Hard |
|---|---|---|
| HP | 3.0M | 4.1M |
| Gates | 75 / 45%, the wall at 10% | the same |
| Script (scripted length) | 9:49 | 9:49 |
| Enrage | The Drowning, lands 10:20 | lands 10:30 |

**Bot results** (`tools/bot-raid.js`, 12 to 20 seeded runs each): Normal at base gear Bastion / Cleric / Ranger / Pyromancer 10 of 12 (kill ~8:45), Runeguard / Grovekeeper / Shadowblade / Pyromancer 8 of 12; fresh gear 20 of 20 (kill 7:20). Hard at mid gear: Bastion / Cleric / Ranger / Pyromancer 13 of 20 (kill 9:30), Runeguard / Grovekeeper / Shadowblade / Pyromancer 0 of 20. `check.js`: base-gear line-ups clear 3 of 3 and 2 of 3.

### Specializations (all 24 built)

Each class picks one of two specializations, or keeps the base kit. Rules:
- **A spec reshapes the kit, it doesn't replace it.** It swaps one or two abilities and gives the signature mechanic a new purpose, still on Q W E R D F + Space.
- **The role stays the same:** a tank spec is still a tank, so party building stays simple.
- **No lock-in:** switch freely on the hero page in town; the choice is saved per hero and sent to the group.
- **Balanced against the base class:** both specs' pro DPS stay within 5% of their class in `tools/simulate.js` (a check enforces it). A spec can aim off on purpose with `balance` (the Inquisitor aims for 112% of the Cleric's damage, paid for with less healing).
- **A new look:** each spec draws extra gear or effects on the hero (`SPEC_ART` in `heroes.js`); painted portraits and icons come from `docs/art/spec-icons.md`.
- **Bots play them too:** a bot fills its slot with the base kit or either spec, a third of the time each.
- **Earned, per hero:** specs are sealed until any of the player's heroes clears the Hollow King (any difficulty; account-wide since 2026-10-24). That opens one trial per spec for every hero, and passing a spec's trial unlocks it for that hero for good. See *Spec trials* below.

The hero page shows the base class and both specs as tabs. A spec shows what it specializes in, its passive, and every move it adds or changes (new moves say what they replace); changed keys get a gold mark. A sealed tab is dimmed with an outlined diamond (its tooltip says how it opens); a tab whose trial is open has a glowing blue diamond, and its page ends in a card with the trial's name, its first lore line and **Begin the trial**. The Choose button stays off for a spec that isn't unlocked, so you can read every spec before you earn it.

### Spec trials (all 24 built; design choices made together on 2026-10-19)

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
| Pendulum | The Swinging Weight | Short stretches between marks, blows and stomps, no room for long casts. Quick swings that keep crossing. |
| Zenith | The Burning Edge | He holds his ground and the stretches between attacks are long and quiet. Holding the edge for a full Corona, then the long swing across. |
| Orbit | The Circling Hawk | His sceptre sweeps one side of the hall, then the next quarter, then the far side: whoever keeps circling stays out of it. |
| Comet | The Long Charge | In close, then far out, then in again (rings and stomps): long straight runs across the hall. |
| Apothecary | The Long Vigil | The bells stay quiet for a long while, then ring three times in a row. A deep bandolier brewed in the quiet. |
| Volatile | The Short Fuse | Short, sharp knells with little time between. Reactions brewed and thrown fast. |
| Still Water | The Quiet Water | Alone; quick, plain sword strokes at you, one after another. Reading every one (two charges, and Breath refilled on each). |
| Avalanche Fist | The Mountain Road | With a Cleric; long open stretches at the boss's side, broken only by a stomp: strings that never stop. |

**How it's built:** `client/js/arena/trials.js` holds `TRIALS` (name, lore, outro, allies, target length, enrage, regen, who must live, script) and `trialDef(specId)`, which turns one into a boss definition. It keeps the Hollow King's id, so his hall, art and telegraphs all apply, and sizes the Shade's health for the party. The raid id is `trial:<spec>`; `main.js` (`startTrial`, `raidDef`) runs it as a one-human raid, skips loot and clear records, and calls `Save.recordTrial`. `save.js` adds `trialsOpen`, `trialDone`, `recordTrial` and `specState` ('locked', 'trial' or 'open'); `Save.spec` reads a spec that isn't unlocked as none.

**Tested:** a bot playing the spec passes every trial (`tools/check.js` runs all 24). For the four where the base kit could plausibly scrape through, the base kit was also run and fails: Sentinel, Hemomancer and Spellwarden 0 of 4, Aegis 0 of 5 (the spec cleared them all). In the browser: sealed, trial and open tabs and their tooltips, the trial card, starting a trial from it, the lore over the countdown, the pale Shade, a wipe and **Try again**, a clear unlocking and equipping the spec with no loot and no boss clear recorded, and leaving mid-trial handing back the previous spec. Not yet played by a human, and the other 14 trials are vignettes a base kit can also pass with care.

**Tanks (design choices made together on 2026-10-19):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Bastion · Sentinel** (The Wall) | Protecting the party | A Perfect Block also gives the party 10% less damage for 4 s; Brace has three charges. Holy Edge becomes **Shield Bash**: spend 50 Resolve, 30% less damage for 4 s, a small heal. |
| **Bastion · Crusader** (The Dawn Blade) | Damage through blocking | A Perfect Block makes the next Holy Edge **Radiant** (50% stronger, a beam). Oath of Valor lasts 20 s, Judgment gives 35 Resolve. Bulwark becomes **Zealous Guard**: 30% less damage, Brace refills, next Holy Edge Radiant. |
| **Bloodreaver · Berserker** (The Red Storm) | Risky damage | Blood becomes **Rage**. Crimson Drain becomes **Rampage**: up to 70% harder at low HP, heals for 20% of recent damage. Frenzy also makes you 10% faster. |
| **Bloodreaver · Hemomancer** (The Blood Mage) | Helping the healer | Crimson Drain's healing also heals the whole party at a quarter strength. Bloodletting becomes **Blood Lance**, thrown from range. |
| **Runeguard · Spellwarden** (The Warding Circle) | Shielding allies | Runic Ward goes on an ally (yourself if none is picked), explodes from them, and refunds its Rune once it absorbed half. |
| **Runeguard · Runeblade** (The Carved Edge) | Melee damage | Rune Strike becomes the **Rune Blade** combo (Cut > Carve), Glyph Burst becomes **Rune Cleave** (leaves a burning rune for 12 s), Mirror Aegis has two charges, Wards a little smaller. |
| **Ironpalm · Still Water** (The Unmoving Pond) | Parrying | A perfect Read fills Breath to the top, on any hit; Read has two charges. Iron Skin becomes **Still Pond** (90 s): 25% less damage for 8 s, and Read comes back 0.8 s after each use. |
| **Ironpalm · Avalanche Fist** (The Falling Mountain) | Long strings | Every named move adds **Momentum** (+3% damage, up to 8, gone 2.5 s after the last); moves of four inputs or more hit 20% harder. A broken or dropped string **staggers** you (0.7 s) and loses it all. Temple Bell becomes **Landslide**: the party mitigation, and 15 s in which strings can't drop and Momentum fills and holds. |
| **Gloomsworn · Sentinel** (The Long Vigil) | Protecting the party | Gloom Strike's barrier lasts 10 s and a second one falls on the most hurt ally; Black Pall lasts 8 s; Gloom drains slowly out of combat. A Hollow covers the whole party (15% less damage while it lasts) and gives the healer 6 s after it to pay the debt instead of 4. |
| **Gloomsworn · Reaver of Dusk** (The Hollow Blade) | Damage | 6% more damage. Black Pall becomes **Dusk Reave** (30 s, 25 Gloom, free while Hollow): a 600 cut and 10% less damage for 5 s. Hollow lasts 10 s and every Gloom Strike echoes (85%) while it does. |

**Healers (design choices made together on 2026-10-19):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Cleric · Aegis** (The Golden Wall) | Shields | Dawn Petal leaves a shield instead of a regen; a Petal shield that soaks most of its strength gives the Petal back (once every 10 s). Benediction has two charges. Mend becomes **Divine Barrier**: a 1.5 s cast, a big golden dome on one ally for 12 s. |
| **Cleric · Inquisitor** (The Burning Verdict) | Damage | Smite brands the boss: allies' next 2 hits on it burst for extra damage, counted as the Inquisitor's (4 after Dawnstar). Petals regrow every 20 s. Benediction becomes **Condemn**: a holy-fire lance that brands for 4 and makes the next Smite instant. |
| **Grovekeeper · Lifebinder** (The Deep Roots) | Healing over time | Rejuvenate becomes **Lifebind**: it also takes root on the most hurt other ally. Bloom heals 30% more. |
| **Grovekeeper · Moonwell** (The Silver Pool) | Placed healing | Wild Growth becomes **Moonwell**: a 12 s pool of moonlight at an ally's feet that heals everyone standing in it every 1.5 s (45 s cooldown). Bots step into it. |
| **Chronomancer · Echoist** (The Second Voice) | Delayed healing | Temporal Bolt and Recall repeat 3 s later at half strength. Accelerando becomes **Echo Chamber**: the same party haste, and echoes are full strength while it lasts. |
| **Chronomancer · Accelerant** (The Quickened Hour) | Party support | Haste drains Flux 40% slower and its Bolts heal the party more; Accelerando gives 15% for 20 s; Slow heals the link a little less. **Overclock:** every shift into Haste also hastens the party 6% for 10 s (once per 12 s), so you shift in as the burst begins. |
| **Alembist · Apothecary** (The Prepared Hand) | A deep, planned stock | The bandolier holds 5 vials and they ripen in 5 s. The number keys 1-5 mark which vial Throw sends next (a gold chevron and frame mark it). A little less potent per vial. |
| **Alembist · Volatile** (The Short Fuse) | Hidden recipes | Distill becomes **Catalyst** (2 charges, 14 s): your next brew takes three reagents and makes a **Reaction**. The seven Reactions are hidden: the Catalyst tooltip shows them sealed until you brew one, and found ones are saved per hero. Vials heat up in 4 s and then their **fuse** burns: 6 s later an unthrown vial goes off on you at 60% (bombs burn you). A wrong three-reagent mix fizzles. |

**DPS (design choices made together on 2026-10-19; the Sigilmancer was the user's own idea, a Black Mage-style circle):**

| Spec | Specializes in | What changes |
|---|---|---|
| **Ranger · Sharpshooter** (The Still Eye) | Precision | Each second standing still adds Steady Aim (up to 5, +4% damage each); moving loses it. Piercing Arrow becomes **Aimed Shot**: a 2 s cast, a heavy hit (instant with Keen Eye). |
| **Ranger · Venomstrike** (The Green Death) | Damage that ramps | Quick Shot stacks Acid on the target (up to 8, a growing burn). Piercing Arrow becomes **Caustic Arrow**, which bursts every stack. |
| **Shadowblade · Bladedancer** (The Whirling Edge) | Steady damage from anywhere | Positionals always land. Shadowstep becomes **Blade Fury**, a spinning flurry (+1 combo point, two charges). **Tempo**: an Eviscerate at exactly 5 with no point spilled since the last adds a Tempo (up to 3); at 3 the next Blade Fury is a Flourish (650). A spilled point loses them. Smoke Bomb readies both Blade Furies (a positional-free spec has no use for its True North). |
| **Shadowblade · Nightstalker** (The Knife Behind) | Burst from behind | Eviscerate becomes **Backstab**: much stronger from behind, 25% weaker from the front. Shadowstep starts a **Stalk**: the next Backstab within 6 s hits 6% harder, so the step goes in right before the finisher. Shadow Dance lasts 14 s. |
| **Pyromancer · Cataclysm** (The Falling Star) | Huge single hits | Pyroblast becomes **Meteor**: lands 1.5 s after the cast, hits harder, leaves a burning crater. Hot Streak still makes it instant. |
| **Pyromancer · Sigilmancer** (The Burning Circle) | Positioning | Combustion becomes **Ember Circle**: a 20 s circle at your feet (45 s cooldown). Inside it you cast 20% faster and deal 15% more damage; outside, nothing. Bots stay in theirs. |
| **Thermist · Pendulum** (The Swinging Weight) | Fast swings | Every spell moves the dial a step further; every crossing of 0 adds Momentum (up to 5, +4% damage each, gone after 6 s without a crossing). The Pendulum turns back a step short of the edge. |
| **Thermist · Zenith** (The Burning Edge) | Holding the edge | At ±5 the edge spell is instant, always crits and lights a **Corona** instead of moving you: hold for up to 3, then swing across; the next Thermal Shock is 25% stronger per Corona. Equilibrium becomes **Sunset** (30 s): the Corona falls as stars, then the dial snaps to 0 behind a shield. |
| **Driftblade · Orbit** (The Circling Hawk) | Smooth circles | Circling your target at close range builds Orbit (a stack per radian, up to 5, fading 2.5 s after you stop); Hook Turn swings you half a circle, 3 stacks at once; at 5, Carve strikes on its own every 1.4 s while you move; every whole unbroken loop ends in a Full Circle dive that gives 10 Drift. |
| **Driftblade · Comet** (The Long Charge) | Big, readable burst | Drift holds 200 and fills faster in straight lines. Crosswind becomes **Impact**: a charge clean through the target that releases everything at once (a sure crit from 160). |

New support: kits can ask where their hero stands (`env.pos`, for the Sigilmancer's circle); heals can target `'lowest'` (the most hurt ally, optionally not a given one), healing pools on the floor (`pool` events, ticked in `fight.js`), and the Inquisitor's brand (`brand` events; `burstBrand` credits each burst to the Inquisitor).

**Chronomancer healing raised (2026-10-19):** with the healer specs in the bot line-ups, the base Chronomancer could not heal Volkar (0 of 4 with any tank). Its damage is unchanged, but Bolt now heals the link for 120% (was 85%) and the party for 50% in Haste (was 30%), Recall heals 1,400 (was 1,200), and Haste drains Flux at 4 a second (was 5). A bug where looking up Bolt's cast time spent the free Surge Bolt is fixed. Bots also keep the Chronomancer's link on the tank. Volkar with a Chronomancer now clears 4 of 6 (Bastion), 5 of 6 (Echoist), 6 of 6 (Accelerant); a Runeguard tank with a Chronomancer is still the weakest pairing there (1 of 6), since nothing shields the Runeguard before a buster.

**How it's built:** `client/js/combat/specs.js` holds `SPECS` and `kitFor(classId, specId)`, which lays a spec's changes over the base kit (cached). A replacement ability names the one it replaces (`replaces`), keeps its slot, borrows its icon until a painted one arrives, and honours that ability's gear enhancements. `CombatActor` builds from `kitFor`; the spec rides on the `cls` message and the raid roster, so every client draws the right look and cast effects.

**Tested:** pro DPS within 1% of the base class for all six tank specs and within 3% for the healers (the Inquisitor at its 112%); bot parties with each tank spec cleared Volkar and the Hollow King on Normal 24 of 24; each healer spec cleared the Hollow King 4 of 4, and in those raids every new mechanic fired (pools healed ~2 players a tick, ~200 brand bursts a fight, 12 Petals refunded, 135 echoes). In the browser: the picker, switching spec, the HUD, a Spellwarden Ward on an ally, Condemn's brand and credit, and a Moonwell pool with a bot stepping in.

### Talents (all 180 built; design agreed 2026-10-19, reworked 2026-10-20)

Each hero has a small talent tree: **5 rows of 3 talents, one pick per row**. Talents belong to the hero (not the spec) and work in both of its specs: a talent on a move a spec replaces applies to the replacement, with its own wording where the effect differs (shown in italics below).

- **Unlocking rows:** rows open in order with account gold: **60 / 120 / 200 / 300 / 400** (1,080 for a full tree). You can read the row you could unlock next; rows past it are sealed shapes with no text, so the tree reveals itself as you go.
- **Picking:** picks are free and can be changed or reset ("Reset picks") any time **in town**; the panel is read-only during a raid. Unlocked rows are kept on reset.
- **The rule (reworked 2026-10-20 for all ten heroes):** a talent changes *how* you play, not how big a number is. Each tree has **at most one plain number** (a cooldown cut or a longer buff); **rows III and V each grant a new move** that takes over a button; every other talent changes a trigger, the gauge, movement, zones, a chain, a follow-up press, targeting, or how you answer the boss's casts. The three picks in a row are three different ways to play that row, and every talent works in both specs.
- **Row themes:** I rotation (a twist on the core loop), II survival or utility, III the class gauge (a granted move), IV the big cooldowns, V the capstone (a granted move with a signature shape on the field: wings, a blood moon, a standing rune, a falcon, a phoenix, a treant, a great clock).
- **Numbers:** a single talent is worth at most +7% pro DPS and the best build at most +18% (checked by `tools/check.js` via `tools/talents.js`; the sim's pro rotations use the granted moves). Survival and utility talents show 0 in the simulator by design. Without talents every kit plays exactly as before (the class balance baseline is unchanged).
- **Where:** the **Talent Trainer**, an old weapons-master with a lectern, stands just inside the Training Yard gate; **N** opens the same panel anywhere. Ability tooltips list the talents you hold on that move, and a talented ability gets a small gold mark on its slot. A granted move's tooltip is marked *Talent*; its card in the panel wears the new move's icon and says "New move, in place of ...".
- **Bots take no talents.** Talents are client-side only: they change what your kit does (damage, heals, shields, gauge, cooldowns, movement), never the host's HP or defence rules.
- **Icons:** each talent shows the icon of the ability it changes. A granted move uses its painted icon once one is listed in `client/icons/talent-icons.json` (briefs in `docs/art/talent-icons.md`), else the icon of the move it replaces.

**How it's built:** `client/js/combat/talents.js` holds `TALENTS[classId][row][col] = { id, name, ab, text, spec?, grants?, cd?, cast?, specMods? }` (`ab` is the base ability it changes; `spec` holds per-spec wording; `cd` / `cast` are flat changes the engine applies itself). Kits ask `k.talent('id')`. A talent with `grants: true` puts its move (a self-contained entry in `TALENT_ABILITIES`: id, `replaces`, name, desc, effect, fx, icon fallback) into the slot of the move it replaces, in either spec; see *Talent moves: one system for every class* below. Pieces added for the rework, all generic:

- `env.boss()` gives a kit the boss's state: `{ casting, castLeft, next, onMe, vuln, selfVuln }` (main.js from the raid's cast bar and timeline; the sim models busters and raidwides as 2.5s casts). Kit helpers `bossCasting`, `onBossCast` and `castHold` build reactions on it (Hold Fast, Read the Swing, Ironbark...).
- Kit movement: a kit emits `{ type: 'teleport', where }`; main.js `kitMove` plays it as a dash. Talents use `'back' | 'forward' | 'ally' | 'point'` (`kitMove` in kits.js: Firestep, Disengage, Leaping Ward...), the Driftblade `'dash' | 'around' | 'through'` (`kitMoveDest`).
- VFX: granted moves have `ABILITY_VFX` recipes, talent moments are `KIT_VFX` names (`k.fx(name, data)`); the ones that land on the enemy are flagged `atTarget`, so main.js hands them the boss (all in `client/js/ability-vfx.js`).
- The save went to **v4**: `heroes[classId].talents = { rows, picks, ids }`. Picks are kept by talent id, so reordering a tree never moves a pick; a v3 save names its picks from a table of the old trees (every class, Thermist, Driftblade and Alembist included), and a pick whose talent no longer exists clears (the row stays bought).
- The buff tracker names a granted move's buffs after the move (Avatar of Dawn, not the Oath of Valor it replaced).
- `tools/check.js` holds every class to the rule: at most one plain number (`cd` / `cast`), a granted move in row III and in row V, and each granted move complete and placed in the base kit and every spec.

| Pro DPS (5 runs) | Base | Full build | Change |
|---|---|---|---|
| Bastion / Sentinel / Crusader | 1,498 / 1,485 / 1,500 | 1,683 / 1,674 / 1,705 | +12.4% / +12.7% / +13.7% |
| Bloodreaver / Berserker / Hemomancer | 1,512 / 1,512 / 1,503 | 1,767 / 1,699 / 1,753 | +16.9% / +12.4% / +16.6% |
| Runeguard / Spellwarden / Runeblade | 1,550 / 1,538 / 1,556 | 1,755 / 1,798 / 1,764 | +13.2% / +16.9% / +13.3% |
| Ranger / Sharpshooter / Venomstrike | 2,147 / 2,147 / 2,148 | 2,406 / 2,431 / 2,480 | +12.1% / +13.2% / +15.5% |
| Shadowblade / Bladedancer / Nightstalker | 2,397 / 2,397 / 2,397 | 2,782 / 2,673 / 2,795 | +16.1% / +11.5% / +16.6% |
| Pyromancer / Cataclysm / Sigilmancer | 2,381 / 2,381 / 2,368 | 2,757 / 2,726 / 2,664 | +15.8% / +14.5% / +12.5% |
| Cleric / Aegis / Inquisitor | 1,038 / 1,026 / 1,167 | 1,084 / 1,134 / 1,372 | +4.4% / +10.6% / +17.6% |
| Grovekeeper / Lifebinder / Moonwell | 1,044 / 1,041 / 1,051 | 1,187 / 1,168 / 1,175 | +13.7% / +12.2% / +11.8% |
| Chronomancer / Echoist / Accelerant | 1,142 / 1,141 / 1,155 | 1,339 / 1,300 / 1,336 | +17.3% / +13.9% / +15.7% |
| Thermist / Pendulum / Zenith | 2,356 / 2,355 / 2,357 | 2,675 / 2,718 / 2,707 | +13.5% / +15.4% / +14.8% |
| Driftblade / Orbit / Comet | 2,407 / 2,408 / 2,407 | 2,740 / 2,701 / 2,783 | +13.8% / +12.2% / +15.6% |
| Alembist / Apothecary / Volatile | 1,090 / 1,091 / 1,092 | 1,278 / 1,236 / 1,236 | +17.2% / +13.3% / +13.3% |
| Ironpalm / Still Water / Avalanche | 1,522 / 1,522 / 1,516 | 1,735 / 1,779 / 1,721 | +14.0% / +16.9% / +13.5% |

The base Cleric gains least in damage because its talents mostly change healing and protection (Bloom of Dawn, Dawn Sanctum, Wings of Dawn); the Inquisitor, which heals by Smiting, gains the most.

#### Bastion

| Row | Talent | Effect |
|---|---|---|
| I | **Shield Rhythm** | A Blade Chain hit that carries a Perfect Block counter now skips the chain ahead: your next press is Judgment. |
| I | **Returning Edge** | Holy Edge now comes back to your hand: a moment later it cuts the boss again on the way home, for a tenth of the damage. *Sentinel:* Shield Bash now sends a shockwave rolling on: a moment later it strikes the boss again, for a tenth of the damage. |
| I | **Read the Swing** | Whenever the boss begins a cast, your next Blade Chain hit counters it (+150), as after a Perfect Block. |
| II | **Hold Fast** | A Brace raised while the boss is casting now holds until the cast lands (up to 6s) instead of 3s. |
| II | **Shared Mercy** | While you are above 70% HP, Holy Edge's heal goes to the most hurt ally instead of you, twice as strong. *Sentinel:* While you are above 70% HP, Shield Bash's heal goes to the most hurt ally instead of you, twice as strong. |
| II | **Last Stand** | Bulwark now raises itself the moment you drop below 30% HP, if it is ready. *Crusader:* Zealous Guard now raises itself the moment you drop below 30% HP, if it is ready. |
| III | **Hallowed Ground** | **New move.** Rally Banner becomes Hallowed Ground (30s): pour out all your Resolve (at least 30) to consecrate the ground under you for 10s. The boss burns every 2s, harder the more you poured, and a Perfect Block inside gives 10 more Resolve. |
| III | **Steady Hands** | For 6s after a Perfect Block, Holy Edge costs 35 Resolve instead of 50. *Sentinel:* For 6s after a Perfect Block, Shield Bash costs 35 Resolve instead of 50. |
| III | **Overflowing Faith** | Resolve that would spill past 100 now hardens into a shield on you for 8s. |
| IV | **Unbreakable** | While Bulwark lasts, every Perfect Block gives its Brace charge straight back. *Crusader:* While Zealous Guard lasts, every Perfect Block gives its Brace charge straight back. |
| IV | **Shelter** | Bulwark now covers the party too: for its first 4s everyone takes 10% less damage. *Crusader:* Zealous Guard now covers the party too: for its first 4s everyone takes 10% less damage. |
| IV | **Iron Will** | (The one number talent.) Brace recharges 1.5s faster. |
| V | **Avatar of Dawn** | **New move.** Oath of Valor becomes Avatar of Dawn (60s): wings of light for 15s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss. *Crusader:* Oath of Valor becomes Avatar of Dawn (60s): wings of light for 20s. Everything Oath of Valor does, and every Perfect Block calls a pillar of light down on the boss. |
| V | **Sunlit Shield** | A Perfect Block now also throws a flash of light into the boss. |
| V | **Edge of Judgment** | Judgment now also hurls a shard of Holy Edge at the boss, and it heals you a little. |

#### Bloodreaver

| Row | Talent | Effect |
|---|---|---|
| I | **Gore** | Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow that gives 15 Blood. *Berserker:* Hack & Maul becomes a three-hit combo: Hack > Maul > Gore, a goring blow that gives 15 Rage. |
| I | **Rend** | Maul now carves a Wound in the boss (up to 3). Crimson Drain tears every Wound open for extra damage. *Berserker:* Maul now carves a Wound in the boss (up to 3). Rampage tears every Wound open for extra damage. |
| I | **Retaliation** | Bloodletting within 2s of a heavy hit on you (a tenth of your HP or more) cuts twice as deep. *Hemomancer:* Blood Lance within 2s of a heavy hit on you (a tenth of your HP or more) strikes twice as hard. |
| II | **Sanguine Shield** | Crimson Drain's healing past your full HP now hardens into a shield (up to 15% of your HP). *Berserker:* Rampage's healing past your full HP now hardens into a shield (up to 15% of your HP). |
| II | **Desperate Hunger** | While you are below 35% HP, each hit of Hack & Maul heals you for 4% of your HP. |
| II | **Cauterize** | Bloodletting now sears away Vulnerability: if you carry it, the cut washes it off you (once every 30s). *Hemomancer:* Blood Lance now sears away Vulnerability: if you carry it, the throw washes it off you (once every 30s). |
| III | **Scab** | **New move.** War Cry becomes Scab (20s): spend 30 Blood to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP) for 8s. Whatever is left of it when it falls off comes back as Blood. *Berserker:* War Cry becomes Scab (20s): spend 30 Rage to grow a scab over your wounds, a shield worth the damage you took in the last 6s (at least a tenth of your HP) for 8s. Whatever is left of it when it falls off comes back as Rage. |
| III | **Second Helping** | A Crimson Drain that heals you for more than 15% of your HP gives back 20 Blood. *Berserker:* A Rampage that heals you for more than 10% of your HP gives back 20 Rage. |
| III | **Boiling Blood** | Blood that would spill past 100 is no longer lost: every 10 of it takes 1s off Frenzy's cooldown, or adds 1s to Frenzy while it lasts. *Berserker:* Rage that would spill past 100 is no longer lost: every 10 of it takes 1s off Frenzy's cooldown, or adds 1s to Frenzy while it lasts. |
| IV | **Frenzied Letting** | Frenzy now also opens your veins: it refills Bloodletting's charges. *Hemomancer:* Frenzy now also opens your veins: it refills Blood Lance's charges. |
| IV | **Quickened Vein** | (The one number talent.) Bloodletting recharges 3s faster. *Hemomancer:* Blood Lance recharges 3s faster. |
| IV | **Crimson Tide** | Crimson Drain's healing now also flows to the whole party, at a fifth of the strength. *Berserker:* Rampage's healing now also flows to the whole party, at a fifth of the strength. *Hemomancer:* Shared Vein now flows to the party at 40% of the strength instead of 25%. |
| V | **Blood Moon** | **New move.** Undying becomes Blood Moon (120s): for 10s you cannot drop below 1 HP and your heals on yourself are doubled. When it sets you burst in a tide of blood: the boss takes damage for every hit you took under it, and you heal for a quarter of that. |
| V | **Hemorrhage** | Crimson Drain now opens a Hemorrhage on the boss for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP. *Berserker:* Rampage now opens a Hemorrhage on the boss for 9s. While it bleeds, each hit of Hack & Maul heals you for 2% of your HP. |
| V | **Bloodlust** | When Frenzy ends you finish with a free Crimson Drain that remembers every hit you took while it lasted. *Berserker:* When Frenzy ends you finish with a free Rampage that remembers every hit you took while it lasted. |

#### Runeguard

| Row | Talent | Effect |
|---|---|---|
| I | **Overflow** | A Rune that would overcap bursts into the boss instead. |
| I | **Glyph Echo** | Glyph Burst now leaves its glyph hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter. *Runeblade:* Rune Cleave now leaves its rune hanging on the boss: the next time you raise a Runic Ward, it goes off again for a quarter. |
| I | **Answering Rune** | After a Ward of yours breaks or Mirror Aegis reflects, your next Rune Strike gives an extra Rune. *Runeblade:* After a Ward of yours breaks or Mirror Aegis reflects, your next Rune Blade hit gives an extra Rune. |
| II | **Leaping Ward** | A Runic Ward that ends with strength left now leaps: what is left of it jumps to the most hurt ally for 6s. |
| II | **Patient Mirror** | Mirror Aegis raised while the boss is casting now waits for that cast to land (up to 8s) instead of 3s. |
| II | **Emergency Ward** | Below 35% HP, Runic Ward costs no Rune (once every 30s). |
| III | **Whirling Runes** | **New move.** Sanctum becomes Whirling Runes (30s): every Rune you hold tears loose and spins around you as a blade for 12s, striking the boss every 2s. |
| III | **Reclaim** | A Ward that absorbed at least half gives its Rune back. *Spellwarden:* A Ward gives its Rune back once it has absorbed a third. |
| III | **Glyphguard** | Glyph Burst now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller. *Runeblade:* Rune Cleave now also raises a small Ward on you if you have none (once every 20s). It explodes like a Ward, a little smaller. |
| IV | **Mirror Shards** | A reflected hit now shatters the mirror into shards that strike the boss three more times. |
| IV | **Shatter** | Raising a Runic Ward while yours is still up now shatters the old one: it blasts as if it had been broken all the way (but gives no Rune back). |
| IV | **Polished Mirror** | (The one number talent.) Mirror Aegis recharges 30s faster. |
| V | **Living Rune** | **New move.** Runic Overload becomes Living Rune (60s): a great rune rises behind you for 15s. Everything Runic Overload does, and every Rune you spend makes it fire a bolt at the boss. |
| V | **Ward Nova** | A Runic Ward broken all the way now erupts in a nova: it strikes the boss and heals the whole party for a fifth of the Ward. *Spellwarden:* A Runic Ward that absorbed at least half now erupts in a nova when it ends: it strikes the boss and heals the whole party for a fifth of the Ward. |
| V | **Sigil of Binding** | Glyph Burst now carves a binding sigil under the boss for 8s (once every 20s): your next Rune Strike while it burns gives an extra Rune. *Runeblade:* Rune Cleave now carves a binding sigil under the boss for 8s (once every 20s): your next Rune Blade hit while it burns gives an extra Rune. |

#### Ranger

| Row | Talent | Effect |
|---|---|---|
| I | **Fletcher's Rhythm** | Every fourth Quick Shot looses a second arrow for half damage. |
| I | **Ricochet** | A Piercing Arrow that crits ricochets back into your quiver: it gives its charge back. *Sharpshooter:* An Aimed Shot that crits ricochets back into your quiver: it gives its charge back. *Venomstrike:* A Caustic Arrow that crits ricochets back into your quiver: it gives its charge back. |
| I | **Steady Breath** | A Quick Shot loosed after standing still for 2s lights Keen Eye far more often (55%). |
| II | **Disengage** | Hunter's Cloak now also leaps you backwards, clear of whatever is at your feet. |
| II | **Second Wind** | When you drop below 40% HP, your next Quick Shot also heals you for 15% of your HP (once every 45s). |
| II | **Light Feet** | Each Piercing Arrow takes 3s off Hunter's Cloak's cooldown. *Sharpshooter:* Each Aimed Shot takes 3s off Hunter's Cloak's cooldown. *Venomstrike:* Each Caustic Arrow takes 3s off Hunter's Cloak's cooldown. |
| III | **Explosive Shot** | **New move.** Rapid Fire becomes Explosive Shot: spend 50 Focus to plant a charge in the boss that blows 2.5s later. Every Quick Shot or Piercing Arrow that lands before then makes the blast 30% bigger. |
| III | **Focus Fire** | At full Focus, Quick Shot no longer wastes it: instead of giving Focus it hits twice as hard. |
| III | **Tracking** | Each Quick Shot that doesn't light Keen Eye gives 2 more Focus than the one before (up to 10 more). Keen Eye starts the count over. |
| IV | **Long Hunt** | (The one number talent.) Hunter's Mark lasts 3s longer. |
| IV | **Pinning Shot** | A Keen Eye Piercing Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s). *Sharpshooter:* A Keen Eye Aimed Shot now pins the boss: your next Quick Shot is a critical hit (once every 12s). *Venomstrike:* A Keen Eye Caustic Arrow now pins the boss: your next Quick Shot is a critical hit (once every 12s). |
| IV | **Marked for Death** | When Hunter's Mark ends, the mark bursts on the boss, harder for every Keen Eye you lit while it lasted. |
| V | **Falcon** | **New move.** Barrage becomes Falcon (30s): your falcon dives onto the boss and harries it for 10s, striking every 2s. Every Keen Eye you light while it hunts sends it into a diving strike at once. |
| V | **Storm Arrow** | A Keen Eye Piercing Arrow now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong. *Sharpshooter:* A Keen Eye Aimed Shot now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong. *Venomstrike:* A Keen Eye Caustic Arrow now calls down lightning: it arcs into the boss twice more, each strike a tenth as strong. |
| V | **Wild Volley** | Every Quick Shot crit now calls a volley of arrows down on the boss. |

#### Shadowblade

| Row | Talent | Effect |
|---|---|---|
| I | **Feint** | A Strike from the front is no longer wasted: it sets up a feint, and your next Eviscerate lands as a hit from the side wherever you stand. *Nightstalker:* A Strike from the front is no longer wasted: it sets up a feint, and your next Backstab lands as a hit from behind wherever you stand. *Bladedancer:* A Strike never spills a combo point: at 4 points it gives only the 1 that fits, and your Tempo is safe. |
| I | **Opportunist** | An Eviscerate while the boss is casting is always a critical hit. *Nightstalker:* A Backstab while the boss is casting is always a critical hit. |
| I | **Ambush** | Shadowstep now strikes as you arrive: a stab from behind for a combo point. *Bladedancer:* Blade Fury's spin now gives a second combo point, but never one past 5. |
| II | **Shadow Dodge** | A Shadowstep while the boss is casting also slips the blow: you take 50% less damage for 2s. *Bladedancer:* A Blade Fury while the boss is casting also slips the blow: you take 50% less damage for 2s. |
| II | **Recuperate** | While you are below 60% HP, Eviscerate heals you for 3% of your HP per combo point. *Nightstalker:* While you are below 60% HP, Backstab heals you for 3% of your HP per combo point. |
| II | **Smoke Trail** | Shadowstep leaves a cloud of smoke where you vanished: allies inside take 10% less damage for 6s. *Bladedancer:* Blade Fury kicks up a cloud of smoke around you: allies inside take 10% less damage for 6s. |
| III | **Rupture** | **New move.** Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up for 4s per point. While it bleeds, Eviscerate hits 15% harder, as with your poison. *Nightstalker:* Venom Blade becomes Rupture: a finisher that spends all your combo points to open the boss up for 4s per point. While it bleeds, Backstab hits 15% harder, as with your poison. |
| III | **Relentless** | A 5-point Eviscerate has an even chance to give back 1 combo point. *Nightstalker:* A 5-point Backstab has an even chance to give back 1 combo point. |
| III | **Sharpened Shadows** | A combo point that would spill past 5 now sharpens your next Eviscerate instead: 12% harder for each (up to 3). *Nightstalker:* A combo point that would spill past 5 now sharpens your next Backstab instead: 12% harder for each (up to 3). |
| IV | **Shadow Clone** | Shadow Dance now calls a shadow that repeats your Eviscerates at 20%. *Nightstalker:* Shadow Dance now calls a shadow that repeats your Backstabs at 20%. |
| IV | **Shadow Sprint** | (The one number talent.) Shadowstep recharges 3s faster. *Bladedancer:* Blade Fury recharges 1s faster. |
| IV | **Endless Dance** | Each 5-point finisher during Shadow Dance makes it last 1s longer (up to 4s). |
| V | **Death Blossom** | **New move.** Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts over 1.5s that each give a combo point. The last is a free Eviscerate with everything you hold. *Nightstalker:* Smoke Bomb becomes Death Blossom (120s): you vanish into a storm of knives around the boss, six cuts over 1.5s that each give a combo point. The last is a free Backstab with everything you hold. |
| V | **Toxic Burst** | Eviscerate now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going. *Nightstalker:* Backstab now bursts your poison or Rupture: 15% of what it has left lands at once, and it keeps going. |
| V | **Garrote** | Shadowstep now garrotes: a wire bites into the boss and it bleeds for 9s. *Bladedancer:* Blade Fury now leaves the boss bleeding for 9s. |

#### Pyromancer

| Row | Talent | Effect |
|---|---|---|
| I | **Firestarter** | A Fireball crit sets the target burning for 6s. |
| I | **Chain Reaction** | A Hot Streak Pyroblast now leaves you Heating Up (once every 10s). *Cataclysm:* A Hot Streak Meteor now leaves you Heating Up when it lands (once every 10s). |
| I | **Overcharged Blast** | A Fire Blast fired mid-cast now hurries that cast along: it finishes half a second sooner. |
| II | **Molten Armour** | While your Heat is above 70, you take 10% less damage. |
| II | **Cauterize** | A Fire Blast that turns Heating Up into Hot Streak also heals you for 5% of your HP. |
| II | **Heat Haze** | Whenever the boss begins a cast, your next Fireball is instant. |
| III | **Firestep** | **New move.** Smolder becomes Firestep (20s): blink forward through a burst of flame. It gives 15 Heat and makes your next Fireball instant. |
| III | **Banked Embers** | Your Heat no longer cools off on its own. |
| III | **Flashpoint** | A Fire Blast at 85 Heat or more now vents 30 Heat into the boss as a second blast, instead of adding more. |
| IV | **Afterburn** | When Combustion ends, you get Hot Streak. *Sigilmancer:* When Ember Circle fades, you get Hot Streak. |
| IV | **Wildfire** | Every crit during Combustion now leaves a flame on the boss that burns for 6s (up to 5 at once). *Sigilmancer:* Every crit while you stand in Ember Circle now leaves a flame on the boss that burns for 6s (up to 5 at once). |
| IV | **Long Burn** | (The one number talent.) Combustion lasts 3s longer. *Sigilmancer:* Ember Circle lasts 5s longer. |
| V | **Phoenix Flight** | **New move.** Vent becomes Phoenix Flight (12s): release all your Heat as a phoenix that sweeps through the boss and wheels back for a second pass, harder the more Heat. At 60 Heat or more it leaves you Hot Streak. |
| V | **Twin Flame** | A Hot Streak Pyroblast now splits: a second, smaller Pyroblast hits for 10%. *Cataclysm:* A Hot Streak Meteor now brings a second, smaller meteor down a moment later, for 10%. |
| V | **Living Bomb** | Every fourth Fireball now plants an ember in the boss that bursts 3s later. |

#### Cleric

| Row | Talent | Effect |
|---|---|---|
| I | **Atonement** | Smite now also heals the most hurt ally for 15% of the damage it deals (Dawnstar too). |
| I | **Held Dawn** | Dawnstar no longer wants spending at once: it grows 2% stronger for every second you hold it, up to 30%. |
| I | **Petalfall** | Dawn Petal also sends a spark of light into the boss. |
| II | **Quick Mend** | After you spend a Petal, your next Mend is instant. *Aegis:* After you spend a Petal, your next Divine Barrier is instant. |
| II | **Purify** | Dawn Petal now washes Vulnerability and Damage Down off its target (once every 20s). |
| II | **Wings of Dawn** | Dawn Petal cast on an ally now carries you toward them on wings of light (up to 160). |
| III | **Bloom of Dawn** | **New move.** Intervention becomes Bloom of Dawn (30s, instant): spend all your Petals on one ally. A fallen ally rises at once; a living one is healed for 500 per Petal. Every Petal counts toward Dawnstar. |
| III | **Sun's Favour** | Dawnstar gives back a Petal. |
| III | **Overflowing Petals** | A Petal that would grow past 3 now blooms by itself onto the most hurt ally, and counts toward Dawnstar. |
| IV | **Twin Blessing** | Benediction can now be pressed again within 5s: the same blessing, at half strength, on the most hurt other ally. *Aegis:* A second Benediction within 5s now also lands on the most hurt other ally at half strength, and costs no charge. *Inquisitor:* Condemn can now be fired again within 5s, for a third of the damage. |
| IV | **Sunfall** | Dawnstar now leaves a small sun on the boss that burns it for 12s. |
| IV | **Benevolence** | (The one number talent.) Benediction recharges 8s faster. *Inquisitor:* Condemn recharges 8s faster. |
| V | **Dawn Sanctum** | **New move.** Prayer Circle becomes Dawn Sanctum (90s): a great circle of dawn at your feet for 12s. Allies standing in it take 15% less damage and heal every 1.5s, and your Smites cast from inside it are instant. |
| V | **Twin Petals** | Dawn Petal now also lands on the most hurt other ally, at half strength. |
| V | **Dawn Chorus** | Every third Petal you spend now sings out: the whole party heals for half of it. |

#### Grovekeeper

| Row | Talent | Effect |
|---|---|---|
| I | **Nature's Balance** | Wrath now also heals everyone under your Rejuvenate for a fifth of its damage. *Lifebinder:* Wrath now also heals everyone under your Lifebind for a fifth of its damage. |
| I | **Moonfire** | Every third Wrath is instant. |
| I | **Quick Sprout** | Once every 30s, Rejuvenate takes only a moment: its global cooldown is 1.2s. *Lifebinder:* Once every 30s, Lifebind takes only a moment: its global cooldown is 1.2s. |
| II | **Ironbark** | A Rejuvenate cast while the boss is casting also wraps the ally in bark: 15% less damage for 5s. *Lifebinder:* A Lifebind cast while the boss is casting also wraps the ally in bark: 15% less damage for 5s. |
| II | **Thick Bark** | When you drop below 40% HP, bark closes over you: 30% less damage for 6s (once every 60s). |
| II | **Shared Roots** | Bloom with nobody under your Rejuvenate now heals the most hurt ally instead of you, and grows a short regen on them. *Lifebinder:* Bloom now also grows a short regen on the most hurt ally. |
| III | **Seed of Renewal** | **New move.** Rebirth becomes Seed of Renewal (30s, instant): spend 40 Bloom to plant a seed on an ally for 20s. If they fall while it grows, they spring back up at once; if not, it blooms into a big heal when it ends. On a fallen ally, it raises them at once. |
| III | **Spillover** | Bloom that would spill past 100 now seeps into a healing patch under the most hurt ally. |
| III | **Cycle of Life** | An Awakened Wrath gives back 20 Bloom. |
| IV | **Seedburst** | Wild Growth also Awakens your next Wrath. *Moonwell:* Moonwell also Awakens your next Wrath. |
| IV | **Old Growth** | (The one number talent.) Wild Growth recharges 8s faster. *Moonwell:* Moonwell recharges 8s faster. |
| IV | **Last Blossom** | Rejuvenate now blooms when it ends: one last burst of healing on the ally. *Lifebinder:* Lifebind now blooms when it ends: one last burst of healing on your chosen ally. |
| V | **Treant** | **New move.** Thornlash becomes Treant (45s): call up a treant beside the boss for 15s. It slams the boss every 3s, and every slam heals your most hurt ally. |
| V | **Nature's Wrath** | Bloom now also tears roots up under the boss that lash it. |
| V | **Verdant Pulse** | Wild Growth now pulses every 3s while it lasts, and each pulse grows 8 Bloom. *Moonwell:* Moonwell now pulses every 3s while it lasts, and each pulse grows 8 Bloom. |

#### Chronomancer

| Row | Talent | Effect |
|---|---|---|
| I | **Phase Strike** | Shift now leaves an afterimage that fires a free Temporal Bolt (once every 10s). It heals like any Bolt. |
| I | **Double Time** | Shifting into Haste now makes your next two Bolts instant instead of one. |
| I | **Skipped Beat** | Every fifth Temporal Bolt is instant. |
| II | **Practiced Rewind** | (The one number talent.) Rewind recharges 6s faster. |
| II | **Deja Vu** | Rewind now also snaps you back to where you stood when you last pressed Shift (if that was in the last 10s). |
| II | **Last Moment** | While the boss's cast is about to land (1.5s or less left), Recall casts instantly. |
| III | **Time Bubble** | **New move.** Stasis becomes Time Bubble (40s): spend 30 Flux to wrap an ally in a bubble of slowed time for 6s. It follows them, and everyone inside takes 25% less damage. |
| III | **Borrowed Time** | In Haste, a Bolt that crits gives back 6 Flux. |
| III | **Overwound** | Flux that would spill past 100 in Slow now flows to your linked ally as healing. |
| IV | **Hourglass Ward** | Rewind now also slows time around its target: they take 15% less damage for 6s. |
| IV | **Stopwatch** | Shift now also stops your Flux for 4s: it neither drains nor fills. |
| IV | **Second Hand** | In Haste, Temporal Bolt now strikes again 2s later at 8% strength, healing as a Bolt does. *Echoist:* Your echoes are 60% strength instead of half. *Accelerant:* In Haste, Temporal Bolt now strikes again 2s later at 6% strength, healing as a Bolt does. |
| V | **Time Warp** | **New move.** Accelerando becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux. *Echoist:* Echo Chamber becomes Time Warp (60s): a great clock hangs over the party for 15s. Everyone acts 10% faster and your echoes are full strength, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux. *Accelerant:* Accelerando becomes Time Warp (60s): a great clock hangs over the party for 20s. Everyone acts 15% faster, and every 3s its hands strike the boss and heal the whole party. You gain 40 Flux. |
| V | **Future Sight** | Your Bolts now mark the boss with a rune of the future. 6s after the first, it bursts for a tenth of every Bolt that fed it, and a new rune can form 6s later. |
| V | **Second Chance** | An ally Recall raises is healed to full a moment later, and the rest of the party heals a little. |

#### Thermist

Built under the newer rule (2026-10-19): talents are mostly new moves and changed behaviour, not percentages. Rows III and V each hold a talent that puts a **new move on a button** (Thermocline on Q, Absolute Zero on W); none of the fifteen is a plain number bump.

| Row | Talent | Effect |
|---|---|---|
| I | **Banked Embers** | A Cinder Bolt cast at +3 or hotter now leaves an ember in the target (up to 3). Your next Thermal Shock sets every ember off. |
| I | **Flicker** | Rime Shard is now instant while the dial is cold, and Cinder Bolt while it is hot. |
| I | **Afterglow** | A Flare or Glacier Lance cast at its own edge now leaves the target burning or freezing for 9s. |
| II | **Cold Front** | An Equilibrium that drops the dial 4 or more steps now also gives the whole party 10% less damage for 6s. *Zenith:* a Sunset that drops 2 or more stars. |
| II | **Phase Step** | Equilibrium now also blinks you 150 px the way you're heading. *Zenith:* Sunset does. |
| II | **Thermal Skin** | Every Thermal Shock now also wraps you in a shield worth part of its strength. |
| III | **Thermocline** | New move on Q, in place of Cinder Bolt: instant, swings the dial 2 steps toward the other side (3 for *Pendulum*) and counts as that element; hits harder the further from 0 you started. |
| III | **Latent Heat** | Overloading no longer locks or burns you: the heat is banked and your next Thermal Shock is half again as strong. |
| III | **Rebound** | After a Thermal Shock, your next spell is instant (within 10s). |
| IV | **Polar Vortex** | Inversion now leaves a vortex on the target that strikes every 1.5s for 6s. |
| IV | **Equilibrium Pulse** | Equilibrium now sets off the heat it snaps away: from 3 or more steps out, a Thermal Shock as if you had swung that far. *Zenith:* Sunset does. |
| IV | **Solstice** | Inversion now flips the dial back 5s later: a smaller Shock if it's still far enough from 0. |
| V | **Absolute Zero** | New move on W, in place of Rime Shard: a 2s cast on a 45s cooldown that plunges the dial straight to −5 wherever it was, hitting harder the further it fell (from the hot side that crossing is a Shock of up to 10). |
| V | **Conduction** | Thermal Shock now arcs: a second, smaller Shock strikes the target 1s later. |
| V | **Twin Stars** | A Flare or Glacier Lance cast at its own edge now fires a second, smaller bolt after it. *Zenith:* only the cast that fills the Corona, at 45%. |

#### Driftblade

Same rule: Gyre (row III, on E) and Tailspin (row V, on D) are new moves, and the rest change how things work. The one near-number talent is Tailwind (Drift and a crit on Hook Turn).

| Row | Talent | Effect |
|---|---|---|
| I | **Crescent** | Every third Carve you make while moving now also throws a crescent of wind at the target. |
| I | **Eddies** | A Slipstream lane laid through an enemy now cuts it when you lay it, and again when the lane fades. |
| I | **Tailwind** | Hook Turn now also gives 20 Drift, and your next Carve is a critical hit. |
| II | **Eye of the Storm** | While you hold Stillpoint, the whole party takes 10% less damage too. |
| II | **Gust Guard** | Slipstream now wraps you in a shield of wind for 6s. |
| II | **Sidestep** | Hook Turn now also makes you take 30% less damage for 2s. |
| III | **Gyre** | New move on E, in place of Hook Turn: loop once round your target, one cut for every 25 Drift you have (up to 4). It spends nothing and adds 10 Drift. Two charges. |
| III | **Second Wind** | A Crosswind that spends 80 Drift or more gives 10 back. *Comet:* an Impact that spends 160 or more gives 20 back. |
| III | **Hover** | Your Drift no longer drains in the first 1.5s you stand still. |
| IV | **Galeforce** | When Gale Run ends, it looses a free Crosswind at whatever Drift you hold (it spends nothing). |
| IV | **Jetstream** | A Slipstream through an enemy gives its charge back (once every 8s). |
| IV | **Hurricane** | During Gale Run, each Passing Strike makes it last 1s longer (up to 6s). |
| V | **Tailspin** | New move on D, in place of Stillpoint: whirl in place, parrying like Stillpoint and cutting the nearest enemy three times, then spring 150 px the way you're heading. |
| V | **Razor Wind** | Passing Strikes leave a cut that bleeds for 6s, deeper with each pass (up to 3). |
| V | **Afterimage** | Hook Turn leaves an afterimage that cuts the target again a second later. |

**Talent moves: one system for every class (unified 2026-10-19, when classes-a and classes-b merged).** A talent that puts a new move on a button says `grants: true` in `talents.js`, and its move names the button it takes (`replaces`), exactly like a spec's replacement.
- **Where moves live:** `TALENT_ABILITIES[talentId] = { cls, ab, spec?: { specId: ab } }` in `kits.js` is the registry (all 24 moves: the nine original classes' 18 from the talent rework, plus Thermocline, Absolute Zero, Gyre, Tailspin, Grand Blend and Quicksilver). `spec` gives a spec its own version. A kit may instead list moves on itself in `talentAbilities[talentId]` (the Alembist's original form): both are read the same way, so trees written either way keep working.
- **One lookup:** `talentMoveFor(classId, specId, talentId)` in `specs.js` checks the registry, then the (spec) kit's `talentAbilities`. `kitFor(classId, specId, talents)` lays the held talents' moves over the spec kit (cached per combination, each marked `fromTalent`); the actor, the sim and the hero page all build kits through it, so the engine itself no longer swaps anything.
- **Over the network:** every cast message carries the move's id (`a`) as well as its slot, and `abilityById` finds the move from the kit, its spec or a talent, so other players see Gyre or Grand Blend and not the move it replaced.
- **One check:** `tools/check.js` (talents) asks `talentMoveFor` for the base kit and every spec: a `grants` talent must have a move in each, the move must replace the talent's own ability, carry an id, name, description, type, effect and an icon to borrow, not reuse a kit ability's id, land on exactly one button when held, and be found by `abilityById`; a talent with a move but no `grants` fails too.
- **Screens:** the talent card's tooltip shows the move itself; the move borrows the replaced move's icon (`icon`) until it has its own.

<!-- classes-b: Alembist talents -->
#### Alembist

Built to a new rule (2026-10): mostly new moves and changed behaviour, at most one plain number. Two talents **grant a new move** that takes over a button (`grants: true`, the shared talent-move system above): Grand Blend (row III) and Quicksilver (row V). Both work in either spec.

| Row | Talent | Effect |
|---|---|---|
| I | **Ricochet** | Once every 15s, a Fire Bomb bounces off its target and bursts again a second later, a quarter as strong. |
| I | **Scorch** | A Fire Bomb leaves its target scorched for 10s: every heal vial you land in that time also flicks a spark into it. |
| I | **Kindling** | Starting a brew with Ember flicks an ember at your target. (The one number talent.) |
| II | **Flask Armour** | While your bandolier is full, you take 10% less damage. |
| II | **Clinging Steam** | Steam clouds follow the ally they landed on. |
| II | **Spill** | A spoiled vial spills at your feet at half strength instead of going to waste. *Volatile:* a vial whose fuse runs out goes off at full strength, and bombs no longer burn you. |
| III | **Grand Blend** (new move) | Grand Batch becomes Grand Blend (90s): pour every vial into one. Thrown, it does all of their effects at once, each at 80%. |
| III | **Oak Cask** | Ripe vials keep ripening, up to 50% stronger at 25s, but spoil at 30s. *Volatile:* fuses burn 2s longer and a vial keeps heating, up to 45% stronger. |
| III | **Mother Liquor** | Brewing the same recipe twice in a row makes the second vial ripen half again as fast (*Volatile:* heat up). |
| IV | **Flash Distill** | Distill also drops a copy of your last vial into the bandolier. *Volatile:* Catalyst does, once every 20s. |
| IV | **Grand Reserve** | Grand Batch's copies start fully ripe and never spoil; a Grand Blend keeps every effect at full strength. *Volatile:* copies start heated with 10s fuses. |
| IV | **Fume Hood** | Distill also gives the whole party 10% less damage for 8s. *Volatile:* Catalyst does, once every 30s. |
| V | **Quicksilver** (new move) | Salt becomes Quicksilver, with its own recipes: twice is a Silver Mirror (a pool that keeps everyone in it shielded), with Dew a Silver Tonic (a heal stronger on the badly hurt), with Ember a Fulminate (a bomb that goes off twice). *Volatile:* it counts as Salt in Reactions. |
| V | **Chain Splash** | Every splash heal leaps on to the most hurt ally and splashes there too, at half strength. |
| V | **Residue** | Every vial that breaks on an ally leaves a puddle that heals whoever stands in it for 6s. |

Single talents stay under +5% pro DPS (Ricochet +4.3%, Kindling +4.3%, Mother Liquor +4.8%, Flash Distill +4.6% Volatile); Chain Splash and Residue add 10-21% healing.

**How the Alembist is built:** the kit, recipes, Reactions and helpers are the `ALEMBIST` block in `client/js/combat/kits.js`; specs in `specs.js`; talents in `talents.js`. New engine pieces, all generic:
- `splash` events (kits.js `alemSplash` → `fight.js` `splash()`): a heal, shield, cleanse (bit 1 Vulnerability/Damage Down, bit 2 slowed/rooted) or party effect on every ally within a radius of a point; a vial can also leave a `pool` (heal, shield or damage-reduction ward, optionally following an ally; at most 8 per player).
- Talent moves (Grand Blend, Quicksilver): the shared system (`grants` + `TALENT_ABILITIES`, see *Talent moves* above); they began as the kit's own `talentAbilities` table, which still works.
- `recastGcd` may be a function of the kit (Distill makes reagents free of the GCD).
- `kitFx` messages carry data (`d`), so a vial's arc, colour and target travel with the effect.
- `Save.found(cls)` / `Save.discover(cls, id)`: `heroes[cls].found`, the Reactions a hero has found (optional field, no version bump).
- `ICON_ART` in `gauges.js`: drawn placeholder icons for the Alembist's moves until painted ones are listed in `client/icons/alembist/manifest.json`.
- Bots: `BotAI.alembist` in `bots.js` (brew plans, ripe-vial scoring, Reactions, raising with a Draught).
<!-- /classes-b -->

<!-- ironpalm talents -->
#### Ironpalm

The same rule as the Alembist: moves and behaviour, one plain number (Deep Lungs). Two talents grant a new move (`grants: true`): Bellows Stance (row III, on D) and Dragon Ascends (row V, on F); both work in either spec.

| Row | Talent | Effect |
|---|---|---|
| I | **Swallow's Return** | Crane Step flows on: K L H is a Rising Gate too, so it carries on into Heaven's Drop. |
| I | **Echoing Palm** | Thousand Palms echoes: three more strikes a moment after the flurry, a third as strong. |
| I | **Perfect Form** | A named move with every press Crisp strikes again a moment later: its finishing blow echoed at half strength. |
| II | **Iron Shirt** | Tiger Wall also wraps you in a shield for 5 s. |
| II | **Deflect** | Reading anything but a tankbuster throws the blow back: your counter hits about twice as hard. |
| II | **Bell's Echo** | Temple Bell (*Avalanche:* Landslide) also heals the party a little. |
| III | **Bellows Stance** (new move) | Iron Skin becomes Bellows Stance (90 s): 30% less damage for 10 s, Breath refills half again as fast, and every named move breathes out a shockwave and gives 6 Breath. |
| III | **Deep Lungs** | Breath refills 20% faster. (The one number talent.) |
| III | **Quiet Mind** | Finishing a named move lets your Breath refill at its resting pace at once, until your next press. |
| IV | **Gong of Ages** | Temple Bell tolls again 8 s later: another 4 s of 10% party mitigation. |
| IV | **Unbroken** | While Iron Skin (*Still Water:* Still Pond) lasts, strings never drop or break, and every named move gives 4 Breath. |
| IV | **Answering Fist** | Reading a tankbuster takes 20 s off Iron Skin and Temple Bell (or their spec versions). |
| V | **Dragon Ascends** (new move) | Temple Bell becomes Dragon Ascends (60 s): a heavy leaping blow, the party deals 5% more damage for 12 s, and you get Second Wind. *Avalanche:* Momentum fills and holds for 15 s. |
| V | **Falling Mountain** | Heaven's Drop shakes the ground: an aftershock a second later. |
| V | **Hundred Hands** | Thousand Palms leaves the guard open for 6 s: Light presses hit 30% harder. |

Single talents stay at or under +5.8% pro DPS (Falling Mountain +5.8%, Deflect +5.0% in Still Water, Swallow's Return +2.7 to +3.5%); Perfect Form reads about +5% (its echo rests 8 s); Deep Lungs and Quiet Mind read near 0 for the pro, whose Read pauses already refill it, but they carry a player who presses faster than the pro model.
<!-- /ironpalm talents -->

## 5. What's built (code map)

| Area | Files |
|---|---|
| Combat engine (GCD, oGCD, queue, casts, DoTs, procs, stats) | `client/js/combat/engine.js` |
| The kits (the first nine, then the Alembist block, then the Thermist and Driftblade block: dial, Drift, kit moves, talent moves) | `client/js/combat/kits.js` |
| Specializations (kit changes, per-hero choice) | `client/js/combat/specs.js` |
| Kit-to-world bridge (player and bots) | `client/js/combat/actor.js` |
| Unique class gauges | `client/js/combat/gauges.js` |
| Ability bar, cast bar, buffs | `client/js/combat/hud.js` |
| Telegraph shapes (hit tests and drawing), and each boss's room shape (`ARENA`) | `client/js/arena/shapes.js` |
| Smooth motion for networked units (entity interpolation) | `client/js/interp.js` |
| Host fight sim (HP, threat, mechanics, deaths, Rewind history, tethers, adds, slow zones) | `client/js/arena/fight.js` |
| Boss scripts | `client/js/arena/bosses/grubnak.js`, `skitterra.js`, `volkar.js`, `hollowking.js`, `wyrm.js`, `titan.js` (set 2) |
| Bots | `client/js/arena/bots.js`, `client/js/arena/raid-host.js` |
| Arena drawing (textured kitchen and web-cave floors, ambient life, telegraphs, puddles, hitbox ring, tethers, sticky web, lit legs) | `client/js/arena/arena-view.js` |
| Per-boss mechanic tells (cleaver, cloches, plates, spice jars, stove coils, meatballs, silk reel, leg strikes, venom beads, fog) | `client/js/arena/boss-tells.js` |
| Boss and add art (Skitterra's props, the husk, spiderlings) | `client/js/bosses.js` |
| Boss plate and cast bar, party frames (HoTs, aggro, missing health, cast progress), results screen, training meter | `client/js/raid-ui.js` |
| Ability visuals: particle/effect engine, a recipe per ability, boss impacts and wind-ups | `client/js/vfx.js`, `client/js/ability-vfx.js`, `client/js/boss-vfx.js`, `client/js/fx.js` |
| Hero select copy (passives, combos) | `client/js/hero-guide.js` |
| In-game tooltips (no browser `title=` popups) | `client/js/ui-tip.js` |
| Items, rarities, gear stats, item effects, enhancements, loot tables, chest rolls, gold amounts | `client/js/items.js` |
| Loot chests: Need / Greed / Pass cards, the host's rolls and announcements | `client/js/loot.js` |
| Inventory screen | `client/js/inventory.js` |
| Talents (5 rows x 3 per hero, row costs, held set) and the talent screen | `client/js/combat/talents.js`, `client/js/talent-panel.js` |
| The versioned save (name, gold, bag and gear, each hero's boss clears and talents, settings), with step-by-step upgrades for old saves and a backup before each upgrade | `client/js/save.js` |
| Debug overlay (F3): frame rate, worst frame, ping to the host, messages per second, scene, arena, party, boss update age | `client/js/debug-overlay.js` |
| Scenes, input, hero select, tab targeting, ally targeting, raid start/retry/leave, loot | `client/js/main.js` |
| WebRTC: arena coordinates, combat events, solo mode | `client/js/net.js` |
| Hosting: every push to `main` publishes `client/` to https://ceddikers.github.io/emberfall/ | `.github/workflows/pages.yml` |
| Rotation sim, headless bot raid, talent balance | `tools/simulate.js`, `tools/bot-raid.js`, `tools/talents.js` |

**Hero select:** opens right after joining (and from the barkeep, a hero on the deck, or your hero name top-left).
- The altar: one band per role (tanks, damage, healers), each a grid of compact tiles that wraps, so the roster can grow past 16 and still fit at 1280×800; two columns per band on a phone. Advanced classes carry small complexity pips (data.js `complexity`). Built from `CLASSES` and `ROLES`, nothing hard-coded per class.
- The town deck packs a role with more than three heroes closer together (`lineupSpot(role, col, n)`), and every other name in a packed row sits higher.
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
- **Threat meter** (under the party frames, raid only): those the boss can turn to, highest first, as a share of the top threat, with a thin bar: the living tanks while one stands (so it only shows with two tanks), everyone alive once every tank is down. Your row is lit; anyone the boss isn't on at 90% or more of the top turns amber. It reads the threat the host already sends in the party update.
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
- Gear is modest on purpose: best-in-slot is roughly +15-25% output, and every stat is capped (`GEAR_CAPS`: +180 HP, +160 Physical/Magical, +110 Defense, 12% Haste, 12% Critical; raised for set 2 on 2026-10-23, since set-1 gear alone tops out under the old 150/150/100/10/10).
- Icons are drawn in code until painted ones arrive: briefs and the sheet layout are in `docs/art/item-icons.md`. Painted PNGs go in `client/items/<key>.png` and are listed in `client/items/manifest.json`; the game adds the rarity frame.
- **Rarity is a property of the item** (October rework): each rarity is its own set of items, and power comes from rarity, not from the boss. Within a set there is no ladder between bosses: a Grubnak Legendary is as strong as a Hollow King Legendary. Bosses differ in themes, effects and party bonuses. **Set 2 is one step up** (2026-10-23): its pieces carry 1.15× the budget of a set-1 piece of the same rarity and show 8 more item levels (`SET2_STEP`, `SET2_ILVL` in items.js), and set 2's party bonuses come in a step early (two wearers get what set 1 asks three for). Otherwise wearing the new loot cost more in set-1 bonuses than it gained, and a party in set-1 gear beat set 2 Hard more often than one wearing its drops.

  | Rarity | Colour | Stat budget | Item level | What it is | Sells for |
  |---|---|---|---|---|---|
  | Common | grey | 0.4 | 1 | Recruit starter gear only | 2 |
  | Uncommon | blue | 1.0 | 30 | a clean stat line | 8 |
  | Rare | purple | 1.15 | 33 | stats + a small effect | 15 |
  | Legendary | orange | 1.3 | 36 | a strong effect; every class enhancement lives here | 30 |
  | Mythic | red | 1.45 | 40 | a build-defining effect (two per boss) | 60 |

- **Effects** are data on the item (`fx` in `client/js/items.js`) run by a small hook set in the combat engine (`Kit.itemHook` / `Kit.fxMod` in `engine.js`), in the wearer's own kit like enhancements. The host only sees the ordinary damage, heal and shield events they cause; HP and Defense stay host-side and capped.
  - Triggers: a critical hit or heal, a GCD, an oGCD, a heal or shield you cast, a dash, building your gauge (gauges that fill on their own count every 10 points). Each can have a chance and an internal cooldown.
  - Conditions (always on while true): always, HP above a fraction, HP below a fraction.
  - Actions: an extra strike, mend yourself (share of max HP), a ward on yourself, seconds off your other oGCD cooldowns, a timed buff (stacks; shown in the buff row).
  - Mods (conditions and buffs): damage, healing, crit, haste, shorter oGCD cooldowns (capped at 30%).
  - An effect's own hits and heals never trigger effects. Bots and the simulator wear no gear, so class balance is untouched.
- **Class drops:** each boss drops a weapon and an armour for every class. The piece with an **enhancement** that changes one ability is Legendary (45 in total, five per class, e.g. Holy Edge strikes twice, Glyph Burst refunds a Rune; the enhanced ability gets an orange marker on the bar and a line in its tooltip). The other piece is Rare and carries its boss's small effect: Grubnak's armour *Second Helping* (a dash heals 3%), Volkar's armour *Static* (oGCDs crackle for a little damage), the Hollow King's weapon *Court's Favour* (oGCDs give +3% damage for 6 s). Skitterra's weapon and armour are both enhanced.
  - Volkar's enhanced weapons put the storm into each class's big cooldown: Bulwark shields the party, Frenzy gives 30 Blood, Runic Overload gives 2 Runes, Barrage lights Keen Eye, Shadow Dance gives 2 combo points, Combustion refills Fire Blast, Prayer Circle cuts 15%, Wild Growth gives 25 Bloom, Accelerando heals the party.
  - The Hollow King's enhanced armour: Bulwark cuts 50%, Bloodletting heals 5%, Runic Ward lasts 12 s, Rapid Fire hits 15% harder, True North lasts 8 s, Combustion lasts 13 s, Prayer Circle's regen is 50% stronger, Thornlash grows 5 Bloom, Rewind reaches back 6 s.
- **Loot tables** (per boss: general items for anyone plus the class items; every rarity always has something anyone can get):

  | Boss (theme) | Uncommon | Rare | Legendary | Mythic |
  |---|---|---|---|---|
  | Grubnak (hearty) | Butcher's Cleaver, Simmering Ladle, Apron of the Kitchen Guard | Peppercorn Ring (crits sting), class armour | Egg Timer Pendant (oGCDs take 2 s off the others), class weapon | The Ogre's Stockpot (every 12 s a GCD hits extra and mends 3%), Head Chef's Whites (+6% damage and healing above 70% HP) |
  | Skitterra (crits, venom) | Fang Shortblade, Silkspun Wand, Chitin Hauberk | Eightfold Band (GCDs may give +6% crit), Silkguard Charm (healing spins a ward) | Venom Pendant (crits inject venom), class weapon and armour | Eye of the Broodmother (crits stack up to +9% haste), Venomweave Shroud (GCDs may bite) |
  | Volkar (storm, dashes) | Thunderstone Maul, Lightning Rod Scepter, Slatescale Mail | Polarity Ring (gauge building gives haste), Grounding Charm (a dash wards you), class armour | Eye of the Storm (oGCD cooldowns 8% shorter), class weapon | Stormcaller's Torc (a dash gives Tailwind: +8% haste, +4% damage), Thunderhead Mantle (crits strike and cut oGCD cooldowns) |
  | the Hollow King (risk, oGCDs) | Hollow Crown Greatsword, Sceptre of the Barrow, Royal Burial Shroud | Signet (+3% crit above 80% HP), Last Lantern Charm (+10% healing below 50% HP), class weapon | Barrow Bell Pendant (an oGCD tolls +10% crit), class armour | Crown of the Barrow (+12% damage and healing below 50% HP), Mantle of the Dead Court (oGCD cooldowns 10% shorter, oGCDs stack +2% damage) |

- **Chests:** a clear drops a chest of 4 items (Normal) or 5 (Hard). Each item rolls its rarity (Normal: Uncommon 55 / Rare 30 / Legendary 12 / Mythic 3 %; Hard: 30 / 40 / 22 / 8), then an item of that rarity from the boss's table (no doubles in one chest while there's a choice). Class items only roll for classes a human in the run plays; bots don't count. Wipes and trials drop nothing.
- **Need / Greed / Pass** (`client/js/loot.js`): when the results screen opens, each item appears as a card (rarity colour, name, the item tooltip on hover) with Need, Greed and Pass and a 25 s timer; no pick is a Pass. Need is only open if the hero you raided with can use it (class items: that class; weapons: the matching main stat; armour and accessories: anyone). The host rolls 1-100 for everyone who didn't pass: the best Need wins, otherwise the best Greed, and chat says so ("Ava won [Item] (Need 87)"). If everyone passes, the item is salvaged: each player gets a little gold (Uncommon 2, Rare 4, Legendary 8, Mythic 15). Bots don't roll.
  - Messages: host to all `{ t: 'chest', id, boss, mode, k: [keys], who: [[id, class]], gold, secs }`; player to host `{ t: 'lootc', id, i, c }` (0 pass, 1 greed, 2 need); host to all `{ t: 'lootw', id, i, k, w, c, r, g }` (w = 0: salvaged). The host only accepts a pick for the open chest, a real item index, from a player in the raid, once; a Need the player's hero can't use counts as Greed. Players who stay silent are rolled for after 33 s.
- **Gold:** one wallet for the account (the save). Shown in the inventory and, quietly, next to the bag button in town. A clear pays everyone in it: Grubnak 40, Skitterra 45, Volkar 50, the Hollow King 60; Hard doubles it. Wipes and trials pay nothing. The host decides the amount and sends it with the chest; each player adds it to their own save. Items sell in the inventory (Common 2, Uncommon 8, Rare 15, Legendary 30, Mythic 60); Legendary and Mythic items, and anything another hero wears, ask to confirm.
- **Saves:** version 2 adds the wallet and drops the old Heroic flag (`q`): every item keeps its key, uid and place in your gear and is now simply that item, at the item's own rarity; each Heroic item paid 10 gold once for the bonus it lost. Items with a key the game no longer knows are kept aside (`inv.lost`), never deleted.
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
- Multiplayer: your damage/healing/haste/crit bonuses, enhancements and item effects run in your own kit and reach the host as normal combat events. HP and Defense are applied by the host, which caps every player's totals. The host rolls the chest on a clear and settles Need / Greed / Pass.

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
- checks items: every loot table entry exists and sits in the right table, every rarity has something anyone can get at every boss, two Mythics a boss, every effect uses a known hook with sane numbers, chests roll the right sizes and odds and never a class nobody plays, Need beats Greed, the engine runs effects, and a v1 save upgrades without losing an item;
- the party bonus math, arena clamping and network smoothing;
- class DPS against `tools/check-baseline.json` (±8%);
- bot clears of all four bosses on Normal: seven fixed line-ups, three runs each, and each line-up has to clear at least once (Normal is meant to cost a real group wipes);
- one Hard run per boss: the script must run without errors and the bots must last at least 90 s;
- every spec trial.

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
- In the browser: the taunt (now on carrier buttons; the T slot is the Ultimate), the threat meter, the boss status icons and their tooltips, the upcoming-moves row (with `?bnext-demo` until the bosses send `bnext`), and the target frame moving down under a taller boss plate.
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
