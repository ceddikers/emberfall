# Rework: Morrow-Oak, the Starved Grove (Boss XI)

Goal: fun 8+/10 (was 6 Normal / 5.5 Hard) and a fair Hard (was 6/10), without making anything easier by cutting layers. Keep the clever
moves and tune spacing, caps and numbers instead.

## Finding the fight's idea (the answers stand; what changes is shown)

- **Who is he?** The oldest tree, feeding his own grove to the Hunger. Unchanged.
- **The question:** "What will the Hunger eat next, and where do we let it?" Unchanged.
- **What the party can read:** the seed over a hero's head, the ring that locks, the ground splitting, the petals painted before they snap.
  Unchanged, and now also: a seed that bursts beside an old hole feeds it (the hole swells) instead of digging a new one.
- **The signature:** the party permanently reshapes the room. This is kept, but the room now **converges**: a hole stops growing at a ceiling,
  six holes is the most there will be (after that every seed feeds the nearest), so an early mistake costs a bounded piece of floor and the
  fight no longer gets steadily worse for a reason nobody remembers. The room is shaped by where you put the first holes, then it settles.
- **The finale:** Last Bloom keeps every living limb firing in turn and then the last Bloom. The act now *opens* with a new combination, Draw and
  Bloom: an Inhale whose pull puts you at his feet, rolling straight into a Fourfold Bloom whose petals open where you have been drawn.

## What was wrong (bot data, Hard at GEAR=post4, 15 of 30; Normal 26 of 30)

- Hard wipes were almost all in the first minute of Act III (boss at 42 to 45 percent): a Barrow Lantern chain that kept coming back to the same
  two heroes, a Cleaver Bough soak that cost a squishy more than half their life, a Twin Seed or Last Gasp landing on top of a limb's move, and a
  Sap Tide in between. Several heroes died within seconds of each other, to moves that had started in different places.
- Act IV wipes at 1 to 13 percent were two Sap Tides four seconds apart: the previous act's closing tide and the new act's first step.
- Falls were rarely the killer; the cost of holes was the room, and the Inhale or Hungering Dark that ended a hero in one.

## Changes

1. **The Hunger has its fill.** Hole ceiling radius 105 (a Twin Seed's giant one 125, was 170 and 150); six holes at most; a seed whose burst lies
   within 120 of an old hole's rim, or any seed once six are open, feeds the nearest hole (+14, giant +30) instead of digging. Saplings
   grow holes only up to the ceiling. Bots take their seed to the rim of an old hole.
2. **Pulls stop at the edge.** Inhale and Hungering Dark drag you to a hole's edge, never into it (Hungering Dark now hits 9000 instead of 6000, since it no
   longer drops anyone), and one hole's pull a hero per cast. A fall is now always the walker's own step.
3. **One heavy move at a time.** Seeds, Twin Seed, Inhale, Fourfold Bloom, Draw and Bloom, a limb's turn, Hungering Dark and Last Gasp each hold
   the floor for as long as they run; one that comes due sooner waits (it keeps its name in the feed, with the new time). Sap Tide and Root Lash are
   the healer's and tank's own beat and never wait. Last Bloom is the one deliberate pile-up.
4. **Barrow Lantern** never passes to a hero who has carried it this chain (it used to ping-pong between the same two).
5. **Sap Tides are spaced** at least 9 s apart, growing +5% each up to +50% (was +60%).
6. **Cleaver Bough** soak total 54000 / 52000 (was 60000 / 56000).
7. **Act IV** opens with Draw and Bloom (new, uses only the existing Inhale and Fourfold Bloom casts, so no new journal page or sound) instead of an
   immediate Sap Tide.
8. Hard keeps every layer: Twin Seed, Hungering Dark (Hollowing and the Grove Remade), Deeper Roots (4 of 8 limbs), Last Gasp.

## Check list

- Telegraphs unchanged on every difficulty; no new hidden tell.
- Normal GEAR=post3 target 85 to 90 percent, Hard GEAR=post4 target 55 to 60 percent (three seed sets of 30).
- Journal pages rewritten for what changed: Hunger Seed (feeding), Inhale, Hungering Dark, Last Gasp.

## Second pass (2026-10-26): the first minute of Act III

Hard: the first limb waits 3 s longer after the Swallowing and the post-Swallowing Root Lash 4 s longer (the healer's breather); the first two limbs to take a turn are never Cleaver Bough or Barrow Lantern; the first Twin Seed of the new room comes after the limbs have taken three turns (it sat on top of the Swallowing's aftermath). Normal moves the same Hunger Seed set later. Bots: Hard `GEAR=post4` 56 of 90 (62%); Normal `GEAR=post3` 77 of 90.

## Cool-factor pass (2026-10-26): looks and screen feel only, no mechanic changed

The ask: richer signature moves and a dodge that feels earned. Every telegraph is drawn exactly as before (red damage, blue share, no safe spot painted); nothing here changes who is hit.

- **The whiff** (morrowoak-fx.js `whiffs`): a hero a blow did not take, within a stride of its edge (or slipped through a lane or petal), gets the edge cracking past them in the move's own light, dead leaves and bark thrown off the wind of it, a ring of dust; your own hero also gets a flash at the edge of the screen and a push of the camera. A hero hurt by any blow of the same moment never gets one.
- **The lip**: coming to a hole's rim without falling (a step taken just short, or an Inhale or Hungering Dark pull that stops at the edge) knocks clods into the dark and flares the rim.
- **Holes alive**: light lifts off every hole and the odd dead leaf is pulled in; a new hole stands up a column of light for a heartbeat.
- **Windups**: Inhale darkens and rushes the screen's edge inward and rumbles the floor as it builds; the Hunger Seed's lock thumps the ground; Hungering Dark winds the dark inside each hole and flares the rim white in the last breath; every limb's move gathers its colour round the limb (halo, drawn-in motes, a white ring) before it fires.
- **Screen feel**: Sap Tide floods amber in from the screen's edge; petals, seed bursts and hole births push the camera; the Last Bloom's petals each stand a column of their light and ring the room.
- **Last Gasp**: the broken limb's stump gathers its colour back for the moment before the move goes off again (the server now sends `gasp` with the break, and `last` on the final Bloom; both only read by the client).
