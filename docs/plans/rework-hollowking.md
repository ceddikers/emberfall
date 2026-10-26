# Hollow King rework: Hard that is hard and fair, a Court of Bones with a job

*2026-10-25. Review: the best signature in set 1 (the call-and-response court) and a dramatic Long Night relay. Two problems: the Court of Bones leaves him untargetable for about 38 s with the tank and melee idle, and Hard is the most complex fight of the set and felt unfair (7 of 10). Goal: fun 8 or more out of 10 on Normal and on Hard. Bots before the rework: Normal 28 of 30 at `GEAR=fresh`, Hard 16 of 30 at `GEAR=mid`.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

These are the answers the fight already had, written out again so the changes below can be checked against them.

1. **What is happening in this room?** A trial in the court of the dead. The King holds a hearing: he calls (a swing, a Gaze, a decree) and his court answers a fixed beat later (the knights replay it, the coffins stir, the bells toll). The room is the courtroom: braziers down the hall, coffins in the bays, banners above the throne.
2. **What question does the fight keep asking?** "What did I just see?"
3. **What is the rule a player learns?** Whatever he did, something answers it from somewhere else, on a beat you can count: the knights replay the swing they remembered, the Charge Sheet's order comes back as Judgement, Doom comes round the party in the order its sigil glowed. If it already happened once, it comes back.
4. **How does the fight warn?** The call is the warning: the swing flashes on the knight that remembers it, the banners light in turn, the next Doom's sigil glows six seconds ahead, the floor always draws the replay before it lands. Nothing is ever hidden on any difficulty.
5. **Acts.** The Summons (his calls, one at a time), Testimony (the knights rise, the Charge Sheet is read), the Court of Bones (a recess on the throne), the Verdict (calls and answers overlap), Judgement (the Charge Sheet comes back), the Long Night (the lantern relay).
6. **Ending.** The braziers die, one lantern is left, and Doom passes from player to player in a fixed order. It shows the idea most clearly: the answer to "what did I just see?" is a person, and you carry the light to them.
7. **What does Hard change?** Faster casts and harder hits; the Charge Sheet gains Royal Audience (face him, the opposite of the Gaze); the Funeral March; Gravebind; Burial Rites with the Writ of Execution; Falling Masonry on three of the Knells; two lanterns and two dooms at once in the Long Night. The dances are drawn fresh each pull (the Sheet's order, the open lane, who is bound, whose grave is whose), but the timing of every answer is the same every pull.
8. **Where does luck come in, and how can a player read it?** Who is doomed, who is marked, who the dead gather on, which knight remembers which swing, the Pardoned, the bound pair, the graves. All are called before they land (a sigil, a marker that follows, a flash on the knight, a colour on the floor). Luck changes who and where; it never changes when.
9. **Tank and healer.** The tank chooses where his swings point, takes the Grave Cleave and now holds the Grave Warden in the Court of Bones. The healer gets the Royal Tithe heal check and the Dirge, the bleed, and the lantern in the Long Night.
10. **Its own.** Stored swings that come back from somewhere else, and a finale that is a relay of light.
11. **What will players talk about?** The Charge Sheet coming back as Judgement, and the last lantern passed from hand to hand.

## What the review found

- **Court of Bones.** Six coffins wake one by one and die in seconds (the bots clear them in about 4 s each). Everyone else has the sceptre throws, the Summons and the Marks; the tank and the melee have nothing to hold, hit or stand in for about 38 s.
- **Judgement on Hard** drew each swing on the floor for 1.5 s, one every 1.5 s, in an order shuffled each pull. The Echo replays (1.8 s) were also started at a random delay of up to 1.2 s, so the beat could not be counted.
- **Royal Audience** turns the Gaze's rule round; fine when it is called with a cast of its own, harsh when it hides in Judgement behind a short floor.
- **Burial Rites** opened 20 s of graves with the Writ and a Crown of Graves inside it, and Doom followed straight after the graves closed.
- **Gravebind** bound two people while everyone else carried a Grave Marks spread and the tank took the Grave Cleave: four jobs in one beat.
- **Falling Masonry** came down with every Knell in the fight (up to eight chunks).
- **The healer died first** in most early Hard wipes. The bots' cleric never heals herself, so a Royal Decree that is not covered kills her at the first Testimony Decree; a part of this is the bot, and it was left alone. Decree on Hard is eased from 23750 to 21250 (about +42% over Normal instead of +58%).

## Changes

1. **The Grave Warden (both difficulties, Court of Bones).** As the first coffin wakes a Grave Warden climbs down from the dais: a tall, slow skeleton in dead plate (new add art `warden`, no new cast name, so no new sound, icon or voice line), 48k HP on Normal (58k Hard), a heavy bite every 2.5 s on whoever is nearest until somebody is hit or taunts it. It is the tank's job to take it and lead it away from the party; the melee and the rest cut it down once the coffins are dealt with (add priority: coffins first, the Warden, then loose skeletons). The recess now has a tank job (hold it, face it away), a melee job (the Warden), a ranged job (the coffins, the sceptre throws) and the healer's (the bites).
2. **Judgement on Hard** is on the floor for 2.2 s before each swing lands (was 1.5), the same as an Echo replay. Normal stays at 1.6 s: the bots could not read a longer floor over the Normal order (stomp into sweep) and the Normal fight did not need it.
3. **Echo replays on Hard** are drawn on the floor for 2.2 s (was 1.8) and the first replay always lands on the beat: the random delay is gone. Which knight answers first still varies on Hard; the flash on the knight shows what it remembered.
4. (Reverted 2026-10-25 at the user's request: Burial Rites keeps its Crown of Graves and the graves stay open 19.5 s, with Doom 12 s after; the user finds this sequence fun and challenging.) ~~**Burial Rites** loses its Crown of Graves: the graves open for 16.5 s (was 19.5) with the Writ read inside them and nothing else. The Doom set after it waits until the graves have closed (15.5 s after the Writ is cast; the timeline check allows 16 s between named steps).~~
5. **Gravebind** no longer comes with a Grave Marks spread on everyone else. It comes with the Grave Cleave only: the tank takes the greatsword, a chained pair stays close.
6. **Falling Masonry** falls with only three Knells (the last of The Summons, Testimony's, and the first after Judgement), never in the Verdict.
7. **Hard's Royal Decree** is 21250 (was 23750).
8. **Normal swings and echoes** hit for 14000 (was 13000): with the Warden and the longer Hard fixes Normal had drifted to 93% at `GEAR=fresh`, above the 85 to 90 target.

Unchanged: the course (the Summons, Testimony, the Court, the Verdict, Judgement, the Long Night), the Charge Sheet, the lantern relay, the Royal Tithe, every Normal number apart from the Warden.

## Kept

Telegraphs never hidden, 8 to 10 minutes (Normal clears at about 8:00, Hard about 9:05), one named enrage (Moonset lands at about 10:30 Normal, 10:40 Hard), no HP-gate pushes or walls, tank and healer gaps under about 10 s (the Court's casts are never more than 6 s apart; the Warden fills the tank's gap), Hard's moves that Normal never uses: Royal Audience, Funeral March, Gravebind, Burial Rites, Writ of Execution, Falling Masonry (six).

## Journals and tutorial

Burial Rites, Gravebind and Court of Bones are rewritten for all 23 heroes (no Crown inside the Rites, no Marks on Gravebind, the Warden in the Court). The tutorial-data block says the same: the Court's phase text and move, the Knell masonry note, Judgement and Echo notes, Gravebind, Burial Rites and Writ (the graves and the Pardoned are drawn each pull). `docs/DESIGN.md` Boss IV (line 347 on) still describes the older Burial Rites and Court and needs the same edits.

## Hard bite pass (2026-10-26)

The user worried the fairness fixes had babied Hard. Kept: the Warden, no Marks on Gravebind, three masonry Knells, the Decree at 21250, Burial Rites untouched. Restored sting, as tighter skill checks rather than softer numbers:
- Judgement's floor tells are on the floor for 1.8 s on Hard (were 2.2; the first Hard pass was 1.5), and Echo replays for 2.0 s (were 2.2; 1.8 originally). Counting the beat is still possible, with less time to stand around.
- The Court of Bones' early wall: Grave Marks now land 6 s after the Grave Summons stack on Hard (were 3.5 s), so the stack, the Warden and the skeletons are not stacked with the spread. Normal is unchanged.
- `HARD_HIT` 1.12 to 1.13: the bots read a shorter floor as well as a longer one, so the clear rate rose to 72% with only the timings changed; one factor brings it back.

Bots, Hard at `GEAR=mid` (30 runs per seed): before this pass 15 / 21 / 22 (seeds 1000, 2000, 3000: 64%). After: 18 / 19 / 23 (67%) and seeds 4000, 5000, 6000: 16 / 21 / 20 (63%); 65% over 180. Normal at `GEAR=fresh` 26 / 26 / 28 (89%). No journal changes: the counterplay is the same.

## Numbers (bots, 30 runs per seed set)

| | before | after |
|---|---|---|
| Normal, `GEAR=fresh` | 28 of 30 (seed 1000) | 26 / 27 / 28 of 30 (seeds 1000, 2000, 3000: 90%) |
| Hard, `GEAR=mid` | 16 of 30 (seed 1000) | 18 / 16 / 20 of 30 (60%); a second set of seeds (4000, 5000, 6000) 18 / 16 / 15 (54%) |

Scripted length with standing dummies: Normal 8:46, Hard 9:50 (the check allows 8:00 to 10:00). Bots clear Normal at about 7:55 and Hard at about 9:05.

**Retune 2026-10-25 (after the bot prop-steering fix).** The bots now take cover and dodge round props properly, and Hard went from 60% to 92% (83 of 90). Burial Rites and every dance are untouched; every Hard blow (not HP) is scaled by one factor, `HARD_HIT = 1.12`, right after the `dmg` table in `hollowking.js`. Result at `GEAR=mid`: 15 / 21 / 22 of 30 (seeds 1000, 2000, 3000: 64%) and 17 / 22 / 19 (seeds 4000, 5000, 6000: 64%). Target: about 20 of 30 (65 to 67%). Normal at `GEAR=fresh` is unchanged by it: 26 / 26 / 28 of 30 (89%). Bots clear Hard at about 9:00, the enrage lands at 10:40.

## Cool-factor pass (2026-10-26)

The user: more fun and complexity without taking difficulty away; abilities that look good, dodges that feel earned by skill. Burial Rites (graves, Writ, Crown of Graves, graves open 19.5 s) is untouched. No new cast names (so no new sounds, icons or voice lines); every new blow is drawn on the floor from the start, red for damage, no safe spots painted.

**Moves that combine (both difficulties).**
- **Barrow Stomp, Aftershock** (the Summons and the first stomp of Judgement): the ring of the Crown of Graves (everywhere but close round him) lands 1.25 s after the stomp (Hard 1.0 s). Be out for the stomp, then in again before the ring: a step out and a dash back through the line. Both are on the floor well before the stomp lands (the ring is laid at 45% of the cast). The knights remember only the stomp.
- **Sceptre Sweep, Backhand** (the Summons only): when the first cone lands, a second, narrower cone behind him is laid down for 1.5 s (Hard 1.25 s). Whoever slipped round behind him slips out to his flank; the flanks are clean for both strokes. He holds his facing until it lands.
- **Sceptre Throw, as a volley** (the Verdict's last set, in place of its last Barrow Knell): three throws at three random non-tanks, 1.05 s apart (Hard 0.85 s), each line following its hero until 0.85 s (Hard 0.7 s) before it lands, then set. All three lines are on the floor from the cast. Step off your own, keep out of the others'. The Court's single throw is unchanged (and its tell is now the Writ's: pale guide while it follows, red once set).

**What it looks like and feels like** (new file `client/js/hollowking-fx.js`, `HK_FX`, called from `boss-vfx.js impact()`; tells in `boss-tells.js` block K).
- **The whiff:** a hero who stood just outside a blow when it landed (within 80 px, not hit) gets the blow's edge cracking past them: a bright streak along the edge, a ring of wind and sparks at their feet; your own hero also gets a faint white flash, a push of the camera and a soft whoosh. Drawn only for a hero it did not hit and was close to, so it rewards a dodge and never hints where is safe.
- **Weight:** a hit-stop and a push of the camera when a Sweep, Stomp, Crown or Knell lands (never more than once every few seconds); the Sweep leaves a lingering crescent, the Stomp rings twice and sends light up through the floor; the thrown sceptre is seen flying down its lane, spinning, and bites into the wall.
- **Wind-ups:** the Stomp's red circle has rings drawing in toward him, quickening, meeting as it lands (a count for the beat, painted inside the red); the Throw's lane shows chevrons running out and gold gathering at his hand.

**Numbers.** The bots read every telegraph, so the new moves cost them little: Hard went to about 74% with the new moves at the old factors. Retuned in one place, `HARD_HIT` 1.13 to 1.165 (each blow, not HP), and the Hard warns above were tightened a little (the Aftershock gap, the Backhand and the volley's lock). Bots, Hard at `GEAR=mid`, 30 runs per seed: 18 / 19 / 21 (seeds 1000, 2000, 3000) and 19 / 22 / 21 (4000, 5000, 6000), 67% over 180. Normal at `GEAR=fresh`: 24 / 26 / 30 (89%). Scripted length unchanged (Normal 8:47, Hard 9:59 in the timeline check; the volley takes the place of a Knell in the Verdict).

**Journals** for the Sweep, the Stomp and the Throw are rewritten for all 23 heroes (the flank for both strokes; out then straight back in; three throws, each at its own hero), and the tutorial block says the same.

## Work for the tank and the healer, shuffled acts, a finale that peaks (2026-10-26)

Burial Rites (the graves, the Writ, the Crown of Graves) and the call-and-response spine are untouched; no new cast names.

**Found (the scripted timeline, longest stretch with no tank beat / no healer beat, Normal):** the Summons 48 / 41 s, Testimony 50 / 46, the Verdict 49 / 46, Judgement 45 / 57, the Night 31 s for the tank. Hard was worse (Verdict 76 / 71). The Night's closing passes were four old single moves. Several sets were pure waiting (Crown of Graves 16 s, Doom 13 s, Lights Out, Bells).

**Changed (all in `hollowking.js`, the hearing section):** every act is laid out in units; a unit is a call and what rides with it. Tank units carry a Sweep to point or a Grave Cleave to take (Crown then Cleave, Doom then Knell then Sweep, Lids then Cleave then Decree, Sweep then its echo then Knell, a job for the tank while the Charge Sheet is read), most with a Knell or a Decree for the healer, so a dead stretch now has a job in it. Hard draws each act's units in a fresh order per pull (`shuf`) but weaves the two kinds one for one (`weave`, `lay`), so no order leaves either role idle for long. Acts drawn: the Summons, Testimony, Judgement (after its first Cleave), and in the Court which coffin on each side wakes when. Left in order on purpose: Burial Rites with the Doom, Cleave and Lids after it, the Tithe and the unit after it, the Court's casts, and the Long Night (the order of the relay is the lesson). The units with a double echo are ones the fight already had; the Gaze rides only with a single echo. A Sweep the knights do not take in (`noMemory`) opens the Crown unit after the Tithe.

**Why the first version of Hard failed, and the fix.** It cut Hard's Knell to 5000 (below Normal's) because the clear rate fell to about 30%, and blamed the bots' healer never healing herself. That was wrong: bots.js heals the lowest hero, the healer included. Logging the first deaths of 60 Hard pulls showed two real causes. (1) Hard's Grave Cleave (about 40000) is more than the tank's whole health, so it is only survived with a defensive, and the tank's are on 90 to 120 s cooldowns; with about twelve Cleaves in a fight the tank died at a Cleave in 25 of 60 pulls. Hard now has about six, spread so the timeline check's tankbuster gap holds for every draw: one in the Summons, one right after the Charge Sheet, one at the start of the Verdict, one at the start of Judgement, the Night's, and Normal-only extras. (2) With the Court's Knell shuffled or placed next to the stack and the Marks, the healer was below the Marks' 76% of her health when they landed (half of all first deaths, at 213 to 243 s). On Hard the Court's Knell comes last, 11 s after the Marks, with a second Sceptre Throw in its old place. Knell is Normal 9000 (as before) and Hard 10000 (was 14050); `HARD_HIT` 1.165 to 1.18.

**Review round (the spine and the Sheet).** The Charge Sheet is a "nothing lands" moment again: on Normal the Cleave and the Knell follow the banners, on Hard only the Cleave and the Knell (Hard's extra tank Sweeps are gone). Every swing he makes once the knights have risen is answered by an Echo, in the closing passes too; the unanswered Sweeps (the Hard `tb`, the Verdict's, the Night's last Stomp/Sweep and the closing loop) are gone or now followed by an Echo. The Night's last cycle is Stomp, Sweep, then the knights answer both; its closing passes end on the Echo instead of a Sweep and Knell. Hard's Judgement ends on a Sweep, its Echo and a Knell (not a Cleave, which would sit 23 s from the Night's). Costs: Hard's tank has fewer jobs than Normal's, so its longest stretches are long (below).

**The ending:** the Night's old tail was Knell and Cleave, and its closing passes Doom, Stomp, Doom, Knell. It now climbs: a Cleave, a Sweep with its Backhand, the knight's answer, then the Stomp with its Aftershock, a Sweep and the answer to both, and the closing passes repeat Stomp and the answer.

**Numbers.** Bots, 30 runs per seed (1000, 2000, 3000): Normal `GEAR=fresh` before 24 / 26 / 30 (89%), after 26 / 27 / 26 (88%); Hard `GEAR=mid` before 18 / 19 / 21 (64%), after 16 / 18 / 16 (56%). The 13 "Bots clear" line-ups all clear at least twice in three. Scripted length: Normal 9:05, Hard 9:26 (the check allows 8:00 to 10:00); the timeline check passes for 14 different Hard draws.

**Longest stretch now (scripted, tank / healer including the Cleave's bleed):** Normal: Summons 19 / 23, Testimony 28 / 24, Court (the Warden) / 17, Verdict 33 / 24, Judgement 28 / 23, Night 23 / 9. Hard, worst of 30 pulls: 24 / 40, 64 / 48, 9 / 17, 75 / 30, 61 / 51, 24 / 8. Hard's tank and healer stretches in Testimony, the Verdict and Judgement are long (the Tithe is a deliberate lull); shortening them needs more Cleaves than the tank's cooldowns allow, or Sweeps the knights have to answer on top of another read.

## A move for the tank: Sceptre Rebuke (2026-10-26)

Burial Rites (the graves, the Writ, the Crown of Graves) and the call-and-response spine are untouched. One new cast, **Sceptre Rebuke**, on both difficulties, from Testimony on (it needs the knights).

**The move.** He drives the sceptre through his tank: a narrow lance from him through the tank (red from the cast, follows the tank, sets 0.9 s before it lands). The tank takes it; anyone standing in the line behind the tank takes 70% of it, so the tank chooses where it points (the same job as pointing a Sweep, with a lighter blow). A knight takes it in (the flash on the knight) and 0.8 s after the blow answers it: the same lance from the knight's wall, aimed at the **place the tank stood when it landed**, drawn on the floor for the Echo's warning (2.6 s Normal, 2.0 s Hard). So the tank's read is: point him at bare wall, take the blow (a defensive for the heavier Hard one if the Cleave is near), then lead the fight off that spot before the knight's lance arrives; the melee and the healer move with the tank. It is "stored swings that come back from somewhere else", and the lance only ever comes back to where it was called. The answer is its own thing (it never touches the knights' memory), so no Echo unit has to carry it and it is never an extra re-read stacked on an Echo.

**Normal vs Hard.** Normal: lance 115 wide, blow 12000 on the tank, the answer 10500, one knight in turn. Hard: lance 130 wide, blow 14000 and answer 12500 (times `HARD_HIT`), the knight is drawn at random, the floor is 0.6 s shorter. No second layer on Hard (a second knight aimed where the tank has gone by then was tried on paper and left out: bots already lose 10 points to the denser Hard).

**Where it sits** (units; `rebukeUnit`, lead 6 to 9 s). Normal: one in Testimony (before the Lids), one in the Verdict (after Doom and Marks), one in Judgement (first of its tank units). Hard: three in Testimony and three in Judgement, woven among the other units by the existing `lay` (each is a tank unit); two in the Verdict (after Doom and Marks, and after the Decree, before the Tithe, whose lead is 2 s shorter so the Verdict does not grow). Never next to the Cleave (Hard's Cleave still comes about once a minute and a half), never in the Tithe, the Court, the Rites or the Night.

**To stay under the 600 s the timeline check allows.** The six Hard rebukes added about 40 s of script, so Hard's calms were trimmed by a second here and there (the Summons' Crown, Doom, Stomp and closing Knell; Testimony's Stomp, Bells, Lids, Lights, March and closing Knell; Judgement's Lids, Lights, Summons, Audience and closing Sweep; the Court's last pause; the Verdict's Lids and the Tithe). Normal is not trimmed.

**The tank's longest wait without a beat of their own (scripted, worst of 20 Hard pulls):**

| | Summons | Testimony | Court | Verdict | Judgement | Night |
|---|---|---|---|---|---|---|
| Normal before | 19 | 28 | 9 | 33 | 28 | 23 |
| Normal after | 19 | 23 | 9 | 33 | 28 | 23 |
| Hard before | 24 | 64 | 9 | 75 | 61 | 24 |
| Hard after | 23 | 28 | 8 | 40 | 27 | 24 |

The Verdict's remaining 33 / 40 s is the Tithe, the Dirge and the Crown, Gaze, March and volley that follow it: a deliberate lull, and nothing of the tank's fits between a party at a third of its health and a Tithe. The heavy moves are untouched, so the healer's gaps are as they were (Hard Judgement's longest 30 s, from the Summons' stack; the rebuke is a heal beat for them too).

**Numbers (bots, 30 runs per seed).** Hard `GEAR=mid`: before 16 / 18 / 16 (seeds 1000, 2000, 3000: 56%); with the move at `HARD_HIT` 1.18 only 12 / 13 / 12 (41%). A tally of the first deaths showed the extra weight landing in the Court's Grave Summons and Marks (the stack leaves a bot just under what the Marks hit for, so a healer one beat late loses the party); the rebukes themselves were not the cause (all six off, with only the trimmed calms, was 13 of 30), so the bite was brought back with the one factor: `HARD_HIT` 1.18 to 1.14. After (final build): 16 / 14 / 17 (52%; seed 4000 earlier: 20). Scripted length: Normal 9:31, Hard 9:56 (the check allows 8:00 to 10:00). Normal `GEAR=fresh` with the move alone: 28 / 28 / 30 (95%), over the 85 to 90 target, so Normal alone was nudged up (Hard untouched; every Hard blow is still above 1.1x Normal): Knell 9000 to 10000, Normal swings and echoes 14000 to 16000, Grave Marks 8000 to 9000. Result: 25 / 27 / 27 (88%) on seeds 1000, 2000, 3000. (Marks above 9000 or Knell below 10000 broke the weakest line-up, bloodreaver, alembist, bladedancer, pyromancer at base gear, which only clears about one run in four.) The move itself is lighter than the swings (12000 / 10500). All 13 line-ups clear in the final check.

Journal: Sceptre Rebuke for all 23 heroes (`journal-lint` clean). Sound: `bm-hollowking-sceptre-rebuke` (recipe handed over separately). The move's tags `rebuke` (the lance on the tank) and `erebuke` (the knight's answer) use the shared landing; a drawn landing for each (a sceptre thrust, a knight's lance along the floor) can be added to `hollowking-fx.js` later.

## De-cook pass (2026-10-26, evening)

The user played Queen Skitterra and found no time to damage her; four passes in one day had made two moves stacked into each other the default rhythm. "It should still be hard but not to the point there's no time to damage." The challenge stays in how hard each mechanic is to answer; the room around it grows. No cast name was dropped (no journal or sound changes; `journal-lint` clean). Burial Rites with the Writ and the Crown, the Tithe with the Dirge, Judgement, the call-and-response spine (a swing, its Echo, a Knell), the Lids with the Decree and the Verdict's double swing are the signature pairs and are untouched. Sceptre Rebuke stays on both difficulties.

**Cut (uses, never a move).**
- The Summons: the Crown no longer carries a Cleave or Sweep, Doom no longer carries a Knell and a Sweep, the Sweep's Backhand is only on the first Sweep, a Knell is a unit of its own.
- Testimony: the Cleave and Knell that followed the Charge Sheet are one Cleave; the Cleave inside the Lids is gone (Normal keeps one standalone), Normal Lights Out and Bells are not both here (Normal: Bells; Hard: Lights Out), Hard's third Rebuke and its Funeral March are gone from this act.
- The Verdict: Marks no longer ride with Doom; the Crown with the Gaze after the Tithe is a Sweep with its Echo (a tank job right after the lull); Normal's Lids moved first and the Cleave sits just before the Tithe.
- Judgement: no Lids and Decree, no Lights Out on Hard, no Bells on Normal, no Audience as a standalone (it stays in the Charge Sheet and the Summons), Normal's Stomp-and-Echo became a Sweep-and-Echo, the Judgement cast and the Night each have a calm of 7 to 11 s before them (they used to start 2 to 3 s after the last cast).
- Long Night: one pass has nothing but the Doom (a window in the ending); Hard's Rebukes are six (were eight): two in Testimony, two in the Verdict, two in Judgement.
- Court of Bones and the Knights rising: 7 s after the previous Knell (were 2 to 3).

**Drawn order (Hard).** `lay` flags units that hand the tank a job (`t`) or the healer a beat (`h`); Hard still draws every act's order per pull and keeps a draw only when no stretch of units longer than about 28 s lacks either (best of 80 draws). Hard Cleave spacing across 40 draws: never closer than 40 s.

**Uptime (harness, 10 runs x 2 line-ups, bots, after the shared bot fix).**

| | melee | ranged | quiet windows per run (6 s+) | overlap |
|---|---|---|---|---|
| Normal before | 78 | 87 | 7.7 | 2% |
| Normal after | 82 | 89 | 15.2 | 1% |
| Hard before | 77 | 89 | 3.3 | 3% (act 4: 14%) |
| Hard after | 78 | 88 | 12.4 | 3% (act 4: 15%, the Rites) |

Per act on Normal after (windows per run): Summons 5.3, Testimony 2.6, Verdict 1.1 (one long one), Judgement 3.0, Night 1.9. Melee time off the boss is mostly the Stomp (the circle), the Sweep, Bells and the Decree: that cost is the mechanic's own and was left in.

**Longest scripted wait (tank / healer, s).** Normal: Summons 17/27, Testimony 24/24, Verdict 30/8, Judgement 35/27, Night 25/9. Hard, worst of 40 draws: 33/33, 32/29, 39/21, 40/38, 25/9.

**Retune.** Normal HP 3.56M to 3.7M; Hard `HARD_HIT` 1.14 to 1.19. Bots (90 runs): Normal `GEAR=fresh` 79 of 90 (24 / 29 / 26); Hard `GEAR=mid` 50 of 90 (17 / 17 / 16; 49 on the run before). Scripted length: Normal 9:02, Hard 9:54.

**Follow-up (same evening).** Hard `HARD_HIT` 1.19 to 1.34 so the Hollow King is the lowest Hard of set 1: bots at `GEAR=mid`, 180 runs (seeds 1000 to 6000), 89 clear (49%); 1.28 gave 57% and 1.4 gave 41%. Every shared move stays above 1.1x Normal. Uptime after: Hard melee 81, ranged 89, 9.8 quiet windows per run; Normal melee 82, ranged 89, 14.7. Judgement's tank wait: Normal 27 s (Lights Out moved ahead of the Crown unit, so the Cleave comes sooner after the Sweep), Hard worst of 80 draws 30 s (the draw tries up to 300 orders and keeps a stretch of at most about 24 s). Scripted length unchanged (Normal 9:02, Hard 9:54). Normal bots 79 of 90. `nc`/`tb` are gone from the file (the script plays on both difficulties); full `check.js`: All checks passed.
