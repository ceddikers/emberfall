# Marionettist: online VFX references

Style target stays `docs/art/vfx-reference/marionettist.png` (crimson velvet, rose petals, gold strings, footlights,
ivory dolls). The references below are for behaviour: anticipation, impact, linger and scale.

## Analogs

| Our move | Analog | Why it fits | Source |
|---|---|---|---|
| Jab (filler) | FF14 Machinist Automaton Queen, Arm Punch | a summoned body does the hitting; the owner only signals | https://ffxiv.consolegameswiki.com/wiki/Automaton_Queen |
| Cross-Cut | FF14 Reaper Cross Reaping / Dancer flourish into Fan Dance | two strokes that cross, the X is the read | https://www.icy-veins.com/ffxiv/reaper-pve-dps-guide |
| Pirouette | FF14 Dancer step (Pirouette is a literal Dancer step) | a spin read as ribbons wrapping the dancer, then a ring released | https://ffxiv.consolegameswiki.com/wiki/Dancer_Guide |
| Grand Finale | FF14 Dancer Technical Step into Technical Finish | a counted routine of steps that grows, then a ringed finish | https://www.thebalanceffxiv.com/jobs/ranged/dancer/basic-guide/ |
| Encore stars (kit `finale`) | FF14 Dancer Starfall Dance | stars streaming to a point | https://www.icy-veins.com/ffxiv/dancer-guide |
| Curtain Call | FF14 Pictomancer Starry Muse, Machinist Queen Overdrive | a theatrical set-piece that frames the target, then a single big strike | https://icy-veins.com/ffxiv/pictomancer-guide |
| Swap | Lost Ark Artist / Summoner swaps, ARPG puppet decoys | afterimages + a pillar where each lands | https://www.playlostark.com/en-us/news/articles/reaper-academy |

Craft sources: League of Legends VFX style guide (importance controlled by "size, shape, timing, value,
saturation and opacity"): https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf ;
VFX Apprentice on timing (wind-up, climax, fall-off; fast attack, slower fade):
https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx ; hit-stop length research summary
(about 0.1-0.2 s optimum, games use 50-100 ms on heavy hits): https://uhiyama-lab.com/en/notes/ue/game-feel-hit-feedback/

## Principles (our words)

1. One shape per move. Jab is a point (a straight lunge and a pin-prick star), Cross-Cut is the X, Pirouette is the
   ring, Grand Finale is the counted beat, Curtain Call is the stage. Never reuse the X on a filler, or the X stops
   meaning "the big cut landed".
2. The Doll hits, the puppeteer only cues. Like the Queen, the owner's part is a thin gold twitch on the string; the
   colour and size all happen at the Doll and the target.
3. Timing: filler wind-up about 60 ms, impact frame at about 80-120 ms, gone by about 350 ms. Big hits: about 100-150 ms
   of anticipation (the strings drawing taut), impact in one frame, a 0.4-1 s fall-off that only dims.
4. Fast in, slow out. Bright shapes grow in under 100 ms and fade over three times that; the aftermath is faint lines
   (scars, a sigil) rather than fills.
5. Colour layers: ink under, crimson body, white-hot core for the first frames only, gold as the accent (strings,
   finishes). Gold means "a payoff", so it is saved for the end of Finale and the strings.
6. Escalation in a routine: each step of Finale is a little bigger and brighter than the one before, and the last is a
   different shape (rings plus an X), like Technical Finish closing a step dance.
7. Hit-stop and shake only on payoffs: Cross-Cut that caught the enemy, the last Finale step, Curtain Call. About 40 ms
   on the Cross-Cut hit, none on fillers.
8. Readability: nothing red or blue filled on the floor, no warning-like marks over the boss; floor marks are thin gold
   or rose lines at low alpha. Fillers stay under about 40 particles.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Jab | Queen Arm Punch | gold twitch on the string (anticipation), straight crimson lunge from the Doll, a small four-point star at the tip and two petals; drop the slash fan and the X |
| Cross-Cut | Cross Reaping two-stroke | strings draw taut (sag to straight, a bead runs to the Doll) for about 0.1 s, then they flash as blades; the X is drawn as two strokes, the first along the string's line, the second across it 60 ms later; small hit-stop on a hit |
| Pirouette | Dancer Pirouette step | two ribbons (crimson, gold) spiral up round the Doll, then a ring is released outward with petals; lighter than before (fewer rings, no double slash) |
| Grand Finale | Technical Step to Technical Finish | each of the five beats a growing step ring under the Doll and a growing cut; the last beat is gold, a double ring and the X |
| Curtain Call | Starry Muse / Queen Overdrive | keep the painted stage; it already has anticipation, a camera stop, flash and a long faint aftermath |
| Pull, Swap | Summoner recall / decoy | keep (they already match the painted sheet) |
