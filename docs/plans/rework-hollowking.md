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
