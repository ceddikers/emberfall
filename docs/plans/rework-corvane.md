# Corvane rework: a finale, pairs, and a Hard that can be read

*2026-10-25. Review: the Whetstone is the best idea in set 3, but Normal was clean to the point of being a tutorial, tank and healer sat idle for most of a minute at a time, the last act was only a time-based dance a fast party never saw, and Hard stacked False Stance, Overwhet and Returning Parting while its clears landed 551 to 587 s against an enrage at 595. Goal: fun 8 or more out of 10 on both difficulties.*

## His answers to "Finding a fight's idea" (docs/DESIGN.md)

1. **What is happening in this room?** The last guard of a road nobody relieved is duelling the first people to come in years. He never speaks; he sets his feet, and the lanterns of the pass are the only other witnesses.
2. **What question does the fight keep asking?** "What is his stance telling us?" (and, since this rework, "what is he about to add to it?").
3. **What is the rule a player learns?** Every avoidable hit puts a notch on his blade; a full blade is released as one of three unleashings, and his stance names which before any floor is painted. The new half of the rule: his plain moves arrive in twos, and the second is always something you have already learned, laid so close that the first is still being dodged.
4. **How does the fight warn?** The stance alone for over two seconds, then the glow along the blade, then the floor. In a pair the second telegraph is painted while the first is still following its target; in the finale the next stance is shown on the blade as the last floor lands. Nothing is hidden on any difficulty.
5. **Acts.** The Pass (one thing at a time), The Shrine (glass, lanterns and the first pairs), the Vigil (the wall), The Whetted Edge (the three unleashings and the pairs), **The Last Vigil** (new, on its own health gate at 16%).
6. **Ending.** He kneels once more and rises, and gives all three edges back to back; then one Hundredfold Parting begun from each hero in turn. It is the sentence the whole fight has been spelling: you have read these stances one at a time for eight minutes, and now you read them as they land.
7. **What does Hard change?** Faster casts and harder hits, Overwhet, False Stance, Returning Parting, Comet Volley, and a closing Parting run back the other way. This rework keeps those four and stops them stacking.
8. **Luck.** The target of each Draw Cut, the order of the afterimages and which side the sweep takes are random, but all shown before they land; Comet Draw goes to whoever stands farthest, so the party controls it.
9. **Tank and healer.** The tank takes the Sundering pair, now a Draw Cut at him between pairs (on Still Water's glass he must leave the line and the glass at once) and keeps him turned from the lanterns; the healer takes a raidwide or Hollow Breath nearly every set, a Draw Cut aimed at her inside the breath, and the three-edge finale.
10. **Its own.** A boss whose pace the party's mistakes set, and now a finale that every party reaches, however fast.
11. **What will players talk about?** The Whetstone, and reading the third stance while the first one's lines are still on the floor.

## What the review found

- Normal was clean: bots cleared 94% where the target is 85 to 90, and no two moves ever asked for a decision together.
- Tank-specific events were 50 to 78 s apart; the healer's longest stretch was 35 s.
- The final dance sat at the end of a fixed-length act. A party that kills on pace (about 8:20) reaches the boss's end before the script reaches the dance, so the climax was seen only by slow parties.
- Hard stacked three re-reads, could run three unleashings back to back, and killed at 551 to 587 s.

## Changes

1. **A fourth act, The Last Vigil, on a health gate at 16%.** Act III now ends at 16% (it used to end on the script's last set). Act III's last set is a Sundering pair; the new act opens with **The Last Vigil** (he kneels, the lanterns flare, a ring of frost runs out), then Rising Crane, Comet Draw and Hundredfold Parting back to back in that order on Normal (a drawn order on Hard). Each stance is shown on the blade as the last floor lands: 2.2 s alone for the first, 1.65 s for the others (1.4 s on Hard). One Cold Sheathe closes the three. Then a Sundering pair and the old dance, one Parting begun from each hero in turn; on Hard the last of those is followed by a Returning Parting. Closing passes follow for a slow party (the first waits out the dance). The cast name is new (**The Last Vigil**: a kneel, no damage) and has a sound and a journal entry for every hero; the three edges keep their own names, so no other new sounds. Practice mode lists it as a fourth phase.
2. **Pairs (no new names).** A **Draw Cut with a Scabbard Sweep** laid 0.8 s behind it (the line is aimed first; the sweep's half is painted while it is still following, so whoever it follows steps off it toward the clear half), a **Draw Cut at the tank** (Act I, on the glass of Still Water in Acts II and III), a **Draw Cut at the healer** inside Hollow Breath, and a **Sundering Cut with a White Gale** 5.5 s into it. Act I teaches the first two, Acts II and III use all four.
3. **Idle gaps.** Tank-specific events (the pair, a Draw Cut at him) are now at most about 38 s apart (it was 78 s); raidwide, Cold Sheathe or Hollow Breath work for the healer at most about 36 s (it was 35, but with far fewer events in between). Not the 10 s the rules ask for: the tank's and healer's own work between events is the same as before, and the longest stretches are the finale's three-edge sentence and the Vigil. Every set carries something for one of them.
4. **Hard stops stacking.** No False Stance on the second unleashing of an Overwhet pair and never two unleashings running; the stance he ends on is shown alone for 1.9 s instead of 1.3; and the Overwhet pair has a breath (1 s) between the first Cold Sheathe and the second stance.
5. **Slack.** Hard HP 5.9M to 5.45M and Hard's enrage cast starts at 9:40 (lands 9:48) instead of 9:55, so a clear lands near 8:30 and the script's end sits about 45 s before the enrage. Hard damage multiplier 1.15 to 1.42 to hold the clear rate (the base numbers are the same; the old multiplier only made sense against the old, longer fight).
6. **Smaller.** A Still Water caught by the Vigil's gate lets go (the glass was laid for another place in the room). The scripted Cold Sheathe and White Gale on Normal are about 4% harder (bots cleared 94% before).

## Kept

Telegraphs never hidden, the question and the Whetstone as they were, 8 to 10 minutes, one enrage, the Vigil as the wall, no pushes, Hard's four Normal-never moves (Overwhet, False Stance, Returning Parting, Comet Volley), tank and healer never leaving the fight idle.

## Numbers (bots, 30 runs per seed set, three sets)

Normal, `GEAR=post3`: before 80 of 90 (89%); after 79 of 90 (88%). Hard, `GEAR=post4`: before 52 of 90 (58%), clears at 543 to 555 s on average; after 49 of 90 (54%), clears at 508 s on average (the tail ends near 570 s, against an enrage cast at 580). Base-gear check line-ups still clear.
