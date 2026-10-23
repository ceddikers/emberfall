# Ironpalm: online VFX references

Barehanded tank in saffron and gold (Still Water pale water-blue, Avalanche Fist earth). Style target stays `docs/art/vfx-reference/ironpalm.png` (Hundred Palms, Crane Step, Rising Gate, Thousand Palms, Read Stance).

## Analogs

- FF14 Monk: Bootshine / Dragon Kick / Snap Punch as the light chain, Six-sided Star and Phantom Rush as the heavy finishers, Perfect Balance as the flurry window, The Forbidden Chakra as the spent-gauge blow. https://na.finalfantasyxiv.com/jobguide/monk/
- WoW Windwalker Monk: Fists of Fury (a channel of rapid fists with a cone of force), Rising Sun Kick (an upward kick with a sun-arc), Tiger Palm as the filler. https://www.wowhead.com/spell=113656/fists-of-fury , https://www.wowhead.com/spell=107428/rising-sun-kick
- Lost Ark Striker, Wardancer and Soulfist: the best match for hand-to-hand impact. Fast jabs with a flat impact ring per hit, Esoteric skills (Lightning Tiger Strike, Spiral Impact) as the big beats, stagger as the published proxy for how hard a hit lands. https://lostark.wiki.fextralife.com/Esoteric+Skill:+Lightning+Tiger+Strike , https://lostark.wiki.fextralife.com/Esoteric+Skill:+Spiral+Impact , https://www.gamepressure.com/lost-ark/striker/z4f5fc
- Hit feel: freeze a couple of frames on the most striking pose, light hits get a momentary stop, heavy hits keep moving through; hits closer than about 5 frames at 30 fps read as one, so a flurry needs a flash per hit. https://www.gamedeveloper.com/audio/improving-the-combat-impact-of-action-games
- Timing as anticipation, impact, dissipation; an impulse effect skips the wind-up and starts at full strength. https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx

## Principles

1. Three inputs, three silhouettes. A martial artist's chain reads by shape before colour: the palm is a short straight jab with converging speed lines, the fist a fat straight streak that punches through, the kick a low sweeping crescent. Same saffron, different shapes.
2. The impact ring faces the attacker. Lost Ark's hand-to-hand hits draw a flat ring squashed along the line of the blow, so it reads as force arriving from one side, not as an area. Ours is an ellipse across the strike line, never a floor circle.
3. Impulse timing on inputs: no wind-up (they come every 0.4-0.6 s). Contact at 60-130 ms, the flash peaks at contact and is gone by 250 ms, everything under 0.35 s.
4. Hit-stop scales with weight: palm about 40 ms, kick about 50 ms, fist about 70 ms, named heavy moves 100-140 ms. Shake none on the palm, a touch on the fist, 4-6 on drops and Ultimates.
5. Punch-through lines: a heavy blow throws a cone of short streaks out the far side of the target (Fists of Fury's cone, Phantom Rush), so the force visibly passes through.
6. Flurries flash per hit. Thousand Palms and Hundred Palms land every 70 ms: each hit gets its own small white star, and the final hit is the big one.
7. Colour layering: dark ink under, saffron body, white-hot core; dust and rock in muted browns. No red on the floor: Stone Breaker's bruise is earth and amber, not a red rune ring.
8. Floor marks (prints, cracks, the torii) stay faint and settle low so telegraphs read through.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Light (palm) | Bootshine, Striker jab | three speed lines converge on the hand, a crisp star, a flat ring across the strike line, a faint print; 40 ms stop |
| Heavy (fist) | Snap Punch, Wardancer straight | a fat saffron streak from the shoulder, a double cross-ring (white inside, saffron out), a cone of punch-through lines, a dust puff; 70 ms stop, a small shake |
| Kick | Dragon Kick | a low crescent smear swept near the floor, a flat ring at the shin's height, grit kicked aside; 50 ms stop |
| Flowing Palms | Perfect Balance string | the three prints, then the push-through gets the punch-through cone |
| Stone Breaker | Demolish | the crushing kick, shards, and an earth-amber bruise ring with cracks (no red runes) |
| Iron Ox | Six-sided Star / Phantom Rush | a heavy straight streak, a big cross-ring, a long punch-through cone and the dust thrown behind |
| Crane Step, Rising Gate, Heaven's Drop, Thousand Palms, Read | painted sheet | unchanged |
| Hundred Palms (Ult) | Lightning Tiger Strike / Fists of Fury | unchanged (tiger, hand storm, cracked print) |
