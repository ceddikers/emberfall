# Advanced classes: design draft (2026-10-19)

The nine current classes are the simple ones: each has one gauge, and its ceiling is about rotation and timing. This set is for players who want a class with a puzzle in it. Each class has a single core mechanic that no current class (and, as far as I know, no well-known game) builds a whole class around. That mechanic also hooks into raid fights: telegraphs, spread and stack, the upcoming-moves feed.

Same frame as today: Q W E R D F, the shared dash on Space, tanks have a taunt on T, and each class has a base kit plus two specs. Numbers are small-scale, in line with the current kits.

| Role | Class | Core idea | Complexity |
|---|---|---|---|
| Tank | **Gorgemaw** | Eats boss mechanics and spits them back | ●●●○ |
| Tank | **Oathbroker** | Damage taken goes on a Ledger and comes due later | ●●●● |
| DPS | **Thermist** | A temperature dial from frost to fire; swings through zero detonate | ●●●○ |
| DPS | **Marionettist** | Fights through a puppet: two bodies to position and keep alive | ●●●● |
| DPS | **Driftblade** | Damage comes from movement; standing still drains you | ●●○○ |
| Healer | **Threadweaver** | Ties allies together so they share damage and healing | ●●●● |
| Healer | **Alembist** | Brews vials ahead of time from three reagents, then throws them | ●●●○ |

---

## Tanks

### Gorgemaw: the Maw That Walks
A huge armoured glutton with a jaw-plate helm. Boss attacks are food.

**Gauge: Belly.** It holds up to 3 **Morsels**, each shaped like the attack you ate: **Ring** (circles), **Lance** (lines), **Fang** (cones and frontals) or **Spike** (tankbusters).

- **Q Gnash**: 3-hit combo with high threat; the third hit pulls the target 20 px toward you.
- **W Open Wide** (oGCD, 2 charges, 14s): your jaw opens for 1.5s. A telegraph that resolves on you in that window is eaten: you take 25% of it and gain the matching Morsel. You can step into a teammate's spread circle and eat it for them.
- **E Spit**: fires your oldest Morsel back from the boss's position in that shape. A Ring explodes around the boss, a Lance pierces through it, a Fang hits as a cone, a Spike is one huge hit.
- **R Digest**: eats every Morsel at once and heals you 6% per Morsel, plus 5% damage reduction per Morsel for 8s.
- **D Iron Gut**: 40% damage reduction for 8s (90s).
- **F Bottomless** (120s): for 4s you eat raidwide attacks too. The whole party takes 50% less and you gain one Morsel per hit.
- **T Bellow**: taunts, and adds' projectiles turn toward you for 3s.

**Floor:** Open Wide on tankbusters, then Spit. **Ceiling:** learning which mechanics are edible, eating teammates' mechanics, and choosing Spit (damage) or Digest (survival) based on what's coming next.

**Specs**
- **Glutton**, *The Endless Appetite*: the Belly holds 5. Spitting two Morsels of the same shape fuses them: two Rings make a Quake, two Lances a Skewer volley, two Fangs a Maul. You're rewarded for eating the same mechanic repeatedly.
- **Gizzard**, *The Iron Stomach*: Digest turns Morsels into party protection by shape. Ring gives everyone a shield, Lance a big shield on whoever is in front of you, Fang 20% reduction for allies behind you, and Spike a 2s immunity on one ally. This is the support tank.

### Oathbroker: the Debt Comes Due
A grey-robed contract-knight with a chained ledger book and a sealing stamp for a mace. Damage isn't taken, it's borrowed.

**Gauge: Ledger.** 60% of the damage you take is written into the Ledger as an entry instead of hitting you. Each entry comes due after 8s and is billed to you as damage then. The HUD shows a column of entries with their timers.

- **Q Collect**: 3-hit combo; each hit pays down (erases) the oldest entry by a little.
- **W Renegotiate** (oGCD, 20s): pushes every entry's due time back 4s. Use it to get a tankbuster's bill past a raidwide.
- **E Settle**: pays the whole Ledger now, at 50%. It turns scary delayed damage into one healable chunk, and needs the healer ready.
- **R Lien**: for 10s, a third of every entry that comes due is paid by the boss as damage instead.
- **D Writ of Protection**: 30% damage reduction for 8s, and entries written during it are halved.
- **F Default** (120s): erases the entire Ledger. Your credit then freezes for 10s: damage hits you normally.
- **T Summons**: taunts. The boss's next hit goes straight onto the Ledger with 3 extra seconds on its timer.

**Floor:** press Settle when the Ledger gets big and Default in emergencies. **Ceiling:** rolling damage forward with Renegotiate, settling during healer downtime, and lining Lien up with the biggest bills.

**Specs**
- **Guarantor**, *The Co-Signer*: co-sign one ally at a time. 30% of the damage they take goes onto your Ledger, and Settle pays their entries too. You protect a fragile healer or a DPS caught in a mechanic.
- **Collector**, *The Debt Comes Due*: every entry that comes due also deals 50% of its size to the boss. Default becomes **Foreclose**, which turns the whole Ledger into a single strike on the boss. You *want* a big Ledger, so it's a greed tank.

---

## DPS

### Thermist: the Living Thermometer
A mage with one arm wreathed in fire and the other frosted to the elbow. Inspired by the Black Mage swap you described, but built around a dial, not two phases.

**Gauge: Temperature**, from −5 (Rime) through 0 to +5 (Blaze), starting at 0. Fire spells push it up and hit harder the hotter you are (+8% per step). Frost spells push it down and hit harder the colder you are.

**Thermal Shock:** when a spell carries the dial across 0 from 3 or more steps away, the swing detonates on the target. The damage scales with how far you swung, so a +5 to −1 swing is the jackpot. Pushing past ±5 overloads you: Overheat (your fire spells locked for 3s and you burn) or Frostbite (casts 30% slower for 3s).

- **Q Cinder Bolt**: fast fire bolt, +1.
- **W Rime Shard**: fast frost shard, −1.
- **E Flare**: 2s fire cast, +2. At +5 it's instant and always crits, but it overloads you unless your next spell is frost.
- **R Glacier Lance**: 2s frost cast, −2, piercing line. Same edge rule at −5.
- **D Equilibrium** (30s): snaps the dial to 0 and gives you a shield sized by how far it fell. Also a defensive.
- **F Inversion** (90s): flips the dial (+5 becomes −5), setting off a huge Shock. For 10s, both elements count as your current one.

**Floor:** alternate Q and W and press F on cooldown. **Ceiling:** planning full swings, holding at the edge during burst windows, and timing Equilibrium as mitigation before raidwides.

**Specs**
- **Pendulum**, *The Swinging Weight*: every crossing of 0 grants a Momentum stack (up to 5, +4% damage each, reset if 6s pass without a crossing). Your spells move the dial one step further. Fast back-and-forth play, close to a rhythm game.
- **Zenith**, *The Burning Edge*: at ±5 you stay in **Redline**, where every spell is empowered, but each second there builds Strain. At full Strain you overload hard. Equilibrium becomes **Bleed Off**, which vents Strain without leaving the edge. You hold the edge and greed it.

### Marionettist: Strings and a Painted Doll
A slight puppeteer in stagehand black, wooden control bar in hand, and a life-sized painted doll that does the fighting.

**The Doll** is a second body on the field. Your attacks come from the Doll, not from you. It drifts after you lazily, and **W** sends it somewhere on purpose. The two of you are joined by **Strings**: if you get more than 300 px apart, or the Doll is standing in a telegraph when it lands, you lose a String.

**Gauge: Strings (3)** and **Encore (0–5).** At 0 Strings the Doll goes limp for 4s and comes back with 3.

- **Q Jab**: the Doll stabs; builds Encore.
- **W Pull Strings**: the Doll dashes to the cursor and damages everything along the way.
- **E Cross-Cut**: the String itself becomes a blade and cuts everything on the line between you and the Doll. With the boss between you, it's a big hit.
- **R Pirouette**: the Doll spins, hitting all around it.
- **D Swap** (20s): you and the Doll trade places. It's your escape, and the Doll takes your spot.
- **F Grand Finale**: spends all Encore. The Doll performs a set routine of 5 hits, but you can't move it while it plays.

**Floor:** Jab, Pirouette, Finale; keep the Doll out of the red. **Ceiling:** keeping the boss between the two bodies for Cross-Cut, dodging with two bodies at once, and Swap as a dodge.

**Specs**
- **Cutting Line**, *The Bladed String*: the String always deals light damage to whatever it crosses, it can stretch to 400 px, and Cross-Cut is off the global cooldown. All about positioning.
- **Understudy**, *Two Dolls on One Bar*: two smaller Dolls. The triangle between you and both Dolls is the **Stage**: enemies inside take 15% more damage from the whole party. Each Doll hits for less alone. The tank can drag the boss onto your Stage, so it rewards teamwork.

### Driftblade: Never Stand Still
A wind-swift duellist with a long ribbon scarf and a curved sabre. This one is a step down in complexity: a DPS that turns your dodging into your damage.

**Gauge: Drift (0–100).** It fills while you move (+20/s) and drains while you stand still (−30/s). Most abilities scale with Drift. You also deal **Passing Strikes**: running through an enemy's body hits it.

- **Q Carve**: a slash. At 50+ Drift it doesn't stop your movement.
- **W Slipstream**: a dash that leaves a wind lane. Allies moving along it are faster, and you regain Drift each time you re-enter it.
- **E Hook Turn**: swing 180° around your target. It crits above 70 Drift and gives back a dash charge.
- **R Crosswind**: spends all Drift; damage scales with what you spent.
- **D Stillpoint** (25s): stop dead and parry for 2s. Drift is stored, not drained, while you hold still.
- **F Gale Run** (90s): for 12s Drift can't drain, and Passing Strikes deal triple damage.

**Floor:** keep moving and press Crosswind when the gauge is full. **Ceiling:** turning dodges into Passing Strikes, chaining Hook Turn dash refunds, and saving Gale Run for movement-heavy phases.

**Specs**
- **Orbit**, *The Circling Hawk*: circling your target at close range builds Orbit stacks. At 5, Carve chains on its own as you move. Smooth circles are rewarded.
- **Comet**, *The Long Charge*: Drift goes up to 200 and builds faster in straight lines. Crosswind becomes **Impact**, a long charge across the arena that releases everything at once. Big, readable burst windows.

---

## Healers

### Threadweaver: the Web Between Us
A seamstress-witch with a needle as long as a rapier and spools on her belt. She heals the bonds between people.

**Threads:** you tie two allies together (yourself included), up to 3 Threads. Allies on the same Thread split the damage they take evenly, and a heal on one also heals the other for 60%. A Thread snaps if the pair gets more than 260 px apart, so boss spread mechanics will tear your web, and stack mechanics are when you re-tie it. A snap releases a small heal to both.

**Gauge: Spool.** It fills as your Threads carry damage, and your bigger heals spend it.

- **Q Needle**: a damage attack. Each Thread on you heals whoever is on its far end.
- **W Tie**: tie your target to yourself, or press it on two allies in a row to tie them to each other.
- **E Mend Seam**: heals your target, and the heal runs down every Thread attached to them.
- **R Snap**: cuts every Thread on purpose. Each one releases a burst heal equal to the damage it carried in the last 5s.
- **D Tighten** (20s): pulls two tied allies together, which yanks someone out of a puddle.
- **F Tapestry** (120s): ties the whole party into one web for 8s. All damage is split four ways.

**Floor:** tie the tank to yourself and spam Mend Seam. **Ceiling:** planning the web around the next mechanic, snapping just before a spread for burst healing, and rescues with Tighten.

**Specs**
- **Loomwright**, *The Living Web*: up to 5 Threads, and heals travel two links deep. A network you build and maintain.
- **Shears**, *The Cut Thread*: Threads store more, and Snap becomes your main heal (short cooldown, refunds Spool). Tighten becomes **Lash**, which also shields the pulled ally for 2s. Burst healing by cutting aggressively.

### Alembist: Brewed Before It's Needed
A goggled alchemist with a bandolier of vials and a smoking copper still on her back. You heal what's *coming*, not what just happened. It plays straight into the upcoming boss moves feed.

**Reagents:** **Ember** (Q), **Dew** (W) and **Salt** (E). Two quick reagent presses (0.75s each) brew one vial into your bandolier (3 slots). **R Throw** lobs the oldest vial at the cursor. Vials grow 30% stronger over their first 10s, then spoil after 40s.

| Recipe | Vial |
|---|---|
| Dew + Dew | Big splash heal |
| Ember + Ember | Fire bomb (damage) |
| Salt + Salt | Ward circle: 20% less damage inside for 6s |
| Ember + Dew | Steam: a healing-over-time cloud |
| Dew + Salt | Cleanse plus a shield |
| Ember + Salt | Quickpowder: haste and move speed |

- **D Distill** (oGCD, 30s): your next brew is instant.
- **F Grand Batch** (120s): fills every empty slot with copies of your last vial.

**Floor:** brew Dew + Dew whenever you're idle and throw it at whoever is low. **Ceiling:** brewing in downtime for the mechanic two moves ahead, timing vials to peak potency, and splash placement that catches everyone.

**Specs**
- **Apothecary**, *The Prepared Hand*: 5 slots, vials ripen twice as fast, and Throw can pick any slot (Shift+R cycles). A planner's healer.
- **Volatile**, *The Unstable Mix*: three-reagent brews unlock **Reactions**, stronger, stranger effects that you discover by experimenting; they aren't listed anywhere until you've made one. But every vial has a 6s fuse and goes off wherever it is. Hidden recipes fit the "abilities you didn't know you had" idea from Talents.

---

## What each class needs from the engine

| Class | New engine piece | Size |
|---|---|---|
| Gorgemaw | Telegraphs marked edible by shape; an eat window that turns a hit into a Morsel | M |
| Oathbroker | A delayed-damage ledger on the host sim, plus Ledger HUD entries | M |
| Thermist | Gauge only (dial, shock, overload); fits the current kit system | S |
| Marionettist | A second controllable body (Doll entity, synced over the network); line-segment hit tests | L |
| Driftblade | Movement-driven gauge; body-pass collision for Passing Strikes | S–M |
| Threadweaver | Tether system (damage split, heal share, snap distance) plus thread drawing | M–L |
| Alembist | Brew queue, vial aging and splash zones; hidden-recipe save flag | M |

Every class also needs: a sprite in the current code-drawn style, two spec sprites, VFX, a spec trial each, five Talent rows, class items, bot AI so `check.js` can clear bosses with them, and your painted portraits (3 per class) and icons (6 to 7 per class) from briefs.

**Suggested order:** Thermist first (smallest, and it's the idea you brought), then one tank and one healer so a full party of advanced classes is possible (Gorgemaw and Alembist), then the rest. All of this comes after the current rework (bosses, Talents, polish) lands.
