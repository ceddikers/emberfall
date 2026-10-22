# Two more classes: a dark tank and a scythe DPS (options)

*2026-10-22. Design pass only; nothing is built. The user asked for a dark-knight-style tank and a scythe user. The Summoner and the ranged/melee switcher are parked. Names are placeholders and share nothing with FF14's jobs beyond the broad playstyle.*

Same frame as every class: Q W E R D F, shared dash on Space, T is the Ultimate (tanks carry the taunt on one of their buttons), a base kit plus two specs, talents that add behaviour not %, small numbers, 70% newbie-to-pro target, no mana, no interrupts. Each class needs its own core mechanic that no class has.

## The Dark Tank — "Gloomsworn" (working name)

What exists: Bastion (shields, blocks), Bloodreaver (berserker: HP bank, drain), Runeguard (runes), Gorgemaw (eats mechanics), Ironpalm (parry), Oathbroker (ledger of delayed damage). The new tank must not be a second Bloodreaver.

**Option 1 — Pact** *(recommended).* The tank pays HP for protection. A **Dread** gauge fills as you hit and are hit. Spending it on **Oblation** burns a slice of your own HP to put a barrier on an ally or the party; on top, your abilities leave a **Shade** that echoes your next strikes for a moment. The skill is deciding *when to spend your health* (it needs a healer's attention, a risk/reward dance) and keeping the Shade fed. Floor: Oblation on the buster. Ceiling: timing Oblation so the barrier takes a hit the healer was planning for, and chaining Shade echoes.
**Option 2 — Reprisal.** Taking damage builds Dread; spending it releases stored damage back as a shadow burst. Simple, strong, but close to the Bloodreaver's "damage in, damage out".
**Option 3 — Eclipse.** A short window where lethal damage cannot kill you but your HP bleeds afterward. Conflicts with the Oathbroker's debt idea.

**Sketch (Pact):**
- Q **Rend**: 3-hit combo, the third hit builds Dread and leaves a mark.
- W **Oblation** (2 charges, spends Dread): burns 8% of your max HP to give an ally a barrier worth 2× that (a self-damage that never kills you).
- E **Shade Step**: a short step; for 4 s your next two strikes echo from your Shade.
- R **Gloom Wall**: 30% party mitigation for 6 s, costs Dread.
- D **Black Mantle**: tank mitigation (60 s).
- F **Last Rite**: an emergency, spends all Dread; bigger barrier for the tankbuster and heals you back a portion.
- T **Ultimate — Eclipse of the Pact** *(instant)*: a heavy strike that turns Dread into a party barrier and a burst of damage; role-shaped power.
- Taunt rides on Rend's third hit or Shade Step (the carrier-button rule).
- **Specs:** *Sentinel* (Oblation shields last longer and chain to a second ally), *Reaver of Dusk* (more damage; Shade echoes grow with Dread).
- **Bots:** an HP threshold plus a "tankbuster incoming" read (the same as other tanks), so cheap to add.

## The Scythe — "Thresher" (working name)

What exists: Shadowblade (combo points, behind-the-target), Driftblade (movement), Bloodreaver and Ironpalm for melee. The scythe should feel like *reach and timing*: big arcs and a ripening of the thing you cut.

**Option A — Shroud window.** Build a gauge, enter a short window with transformed finishers. Familiar, easy, close to Shadowblade's Shadow Dance.
**Option B — Sow and reap.** Abilities sow up to three marks on the boss; a wide **Reap** consumes them. More marks, bigger reap, and the arc hits adds.
**Option C — Ripening** *(recommended).* Your hits leave **seeds** on the boss. A seed **ripens** over a few seconds (green, then gold, then rotten: visible on the target). A **Reap** harvests every seed: unripe seeds give little, gold seeds give the full burst, rotten ones give a smaller, messier payout. Skill is *timing* the Reap on gold; floor is "just press it": a sloppy player reaps whenever and still does about 70% of an expert. A wide arc hits adds too.

**Sketch (Ripening, with Shroud as the Ultimate):**
- Q **Slash**: wide arc, plants a seed.
- W **Hook**: a pulling cut that gets you in range, plants a seed, and shortens ripening.
- E **Reap**: the harvest: spend every seed; damage scales by ripeness; a longer arc.
- R **Gather**: refreshes all seeds to green (resets rot) but costs a beat: a deliberate "save my seeds" button for experts.
- D **Gloam Step**: a dash cut.
- F **Cull**: a finisher on a target below 30% HP, or a small burst otherwise.
- T **Ultimate — Harvest Moon** *(window, about 8 s)*: your arcs grow and every seed instantly ripens; Reap becomes chainable.
- **Specs:** *Sower* (more seeds, a faster ripening, a fast-paced rotation) and *Grim* (fewer seeds but bigger reaps, and the rotten payout is better, so patience pays).
- **Bots:** a simple rule: reap at gold if the boss will survive, otherwise hold; sloppy bots reap at the first seed.

## What each costs (both)

Each class needs: the kit and two specs, an Ultimate and a window (scythe), talents, hero guide text, bot AI, balance sweeps, a weapon in the loot tables, painted icons and a VFX pass (reference sheets from you), sounds, a hero voice for every journal move (17 → 19 voices per move), and a trial per spec. A day or so of agent time each, plus your painting time.

## Order

1. **Gloomsworn** first: the tank frame, taunt and mitigation systems already exist, so it exercises the whole class pipeline end to end at the lowest risk.
2. **Thresher** second: the seed/ripening state is new but contained (a per-target timer).
