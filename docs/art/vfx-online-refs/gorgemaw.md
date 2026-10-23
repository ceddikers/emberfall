# Gorgemaw: online references

Style target stays `docs/art/vfx-reference/gorgemaw.png` (purple flesh, glowing orange teeth, green slime, Morsel spirits).
These references only say how the moves should behave.

## Analogs

- WoW Brewmaster Monk. Stagger turns damage into a delayed debt, which is close to our Belly. Keg Smash is the heavy hitter
  of the rotation, Purifying Brew clears the debt, and Breath of Fire is a cone from the mouth.
  https://warcraft.wiki.gg/wiki/Stagger, https://warcraft.wiki.gg/wiki/Purifying_Brew,
  https://breezewiki.discard.no/wowpedia/wiki/Keg_Smash, https://www.method.gg/guides/brewmaster-monk/playstyle-and-rotation
- Lost Ark brawler slams (Destroyer and Warlord gravity hits): one frame of hit-stop, a dust ring and debris, then a fast clear.
  https://lostark.wiki.fextralife.com/Gravity+Impact
- Dota-style devour: the target is pulled into a mouth and the mouth snaps shut.
- General timing: VFX Apprentice's summary of the League of Legends VFX style guide,
  https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips, and their timing article,
  https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx

## Principles

1. Three beats: wind-up, then impact, then falloff. Put the peak in the first quarter of the effect's life and never use linear timing.
2. A combo builds. The first and second hits are light (about 0.25 s, one crescent, a few crumbs). The third (Gulp) is the
   Keg Smash: a 60-80 ms rear-back, the full jaw closing on the target, a hit-stop of about 60 ms and a small shake.
3. A filler leaves nothing on the floor. Any scorch mark goes only on the finisher and fades within about a second.
4. A mouth reads by its shape: teeth in a crescent, the jaw rim lit, the dark of the throat. Glow goes on the teeth and the leading edge.
5. Getting rid of the debt (Purifying Brew, our Digest) should feel like a purge: dark, sickly puffs blown off the
   body, then warm gold motes rising. That is a slower, calmer beat than an attack (under about 60 BPM).
6. Mitigation reads as armour closing in. The plates arrive from outside in about 0.2 s and stop with a clank, then a faint
   ring stays on, never a disc on the floor.
7. A spit needs recoil: the head kicks back, dust comes off the feet and slime sprays out of the mouth before the glob flies.
8. Keep greens and oranges off the floor in red or blue: puddles stay green and dark.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Gnash (step 1) | Tiger Palm, a light jab | quick crescent bite, a few crumbs, no floor scorch |
| Rend (step 2) | backhand, the light second hit | the crescent mirrored from the other side, torn flecks |
| Gulp (step 3) | Keg Smash | rear-back, the whole jaw closing round the target, hit-stop, a mouthful arcing home, a short scorch |
| Spit | Keg Smash throw, Breath of Fire | recoil puff at the feet, a slime spray from the mouth, the existing per-shape projectiles |
| Digest | Purifying Brew | Morsels spiral in (kept), then dark puffs purged outward and gold motes rising |
| Iron Gut | Fortifying Brew | an inward squeeze, then bronze plates slam in from outside and stay as a ring |
| Open Wide, Bottomless, Maw of Ruin | devour | already match the painted sheet; kept |
