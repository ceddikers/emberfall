# Alembist: online VFX references

Style target stays the painted sheet (`docs/art/vfx-reference/alembist.png`): green cure, red bomb, blue ward, white steam,
orange kiln. The online references below say how each move should *behave*.

## Analog moves

| Our move | Analog | Source |
|---|---|---|
| Ember / Dew / Salt (brew a reagent) | WoW Mistweaver brews; FF14 Sage Eukrasia (a small self-buff "charge" with a coloured flash at the caster) | https://www.icy-veins.com/wow/mistweaver-monk-pve-healing-spell-summary , https://na.finalfantasyxiv.com/jobguide/sage/ |
| Throw (vial lob) | ARPG potion/grenade lobs; Lost Ark Artist Sunrise (a marble dropped on a spot that heals) | https://www.playlostark.com/en-us/news/articles/lost-ark-academy-artist , https://maxroll.gg/lost-ark/build-guides/support-artist-raid-build-guide |
| Cure splash on an ally | WoW Renewing Mist (HoT that jumps, `leap`), League heal language (green, round, non-threatening) | https://warcraft.wiki.gg/wiki/Revival , https://realtimevfx.com/t/anatomy-of-a-league-of-legends-missile-part-2-what-are-we-communicating-with-our-vfx/13062 |
| Ward splash (blue dome) | Lost Ark Artist Starry Night (shield area), WoW Power Word: Barrier (dome on the floor) | https://icy-veins.com/lost-ark/full-bloom-artist-guide , https://warcraft.wiki.gg/wiki/Power_Word:_Barrier |
| Distill / Grand Batch | Sage Eukrasia / Scholar Aetherflow (refill a resource, a burst at the caster only) | https://ffxiv.consolegameswiki.com/wiki/Category:Scholar_actions |
| Magnum Opus (Ultimate) | Mistweaver Revival, Sage Pneuma (a raid-wide heal: one big moment, then gone) | https://warcraft.wiki.gg/wiki/Revival , https://ffxiv.consolegameswiki.com/wiki/Kardia |

General craft sources: League VFX style guide (https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/),
its summary (https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips), a heal broken into cast, projectile,
detonation, linger and expiry flash (https://polycount.com/discussion/comment/2606437).

## Principles (in my words)

1. Three beats, front-loaded: a short wind-up (80-150 ms), the brightest frame inside the first quarter of the effect,
   then a clean fade. Never a slow ramp to the peak.
2. Fillers are light. A reagent press is the most-pressed button, so it lives on the caster only, about 0.35 s, a
   handful of particles. Brightness and size are saved for the throw's landing and the Ultimate.
3. One primary shape per move, at full value; everything else (smoke, glitter) sits lower and softer. The primary of
   a reagent is the drop of colour going into the still; of a throw, the vial's leading tip and the splash crown.
4. Colour tells function before shape: green round shapes heal, blue domes ward, orange-red spikes hurt. Heals stay
   round and soft-edged; only bombs get spikes.
5. A heal reads on the ally's body, not only on the floor: a short rising lift on the target (light shafts, pluses) for
   the first beat, then a low floor mark that settles under telegraph strength.
6. Moving things are brightest at the leading tip with a tapering trail behind, so the eye follows the path.
7. Lingering marks (ward seal, steam) drop to about a third of their peak after 0.7 s, never fill the floor with red or
   blue, and fade with an expiry flicker so players see when it ends.
8. Scale with importance: filler under 40 particles and about 300 canvas calls; a Reaction or Kiln throw may double that;
   only the Ultimate goes past 1000 calls.

## Move-by-move plan

- **Ember / Dew / Salt**: reference beat = Eukrasia charge. A bead of the reagent's colour drips down into the still
  (wind-up, ~120 ms), plops (a crown of four droplets and a tight coloured ring at the still, the peak), and a small
  tinted wisp rises (fade by ~0.4 s). Less grey smoke, no long life.
- **Quicksilver**: same plop in silver, the existing bead ring kept.
- **Throw**: reference beat = grenade lob anticipation. A short flick arc at the hand in the vial's colour.
- **Vial in flight**: brighter leading glass, the comet trail tapers (thick at the vial, thin at the tail), a glint at
  the apex.
- **Cure landing**: a splash crown of liquid on the ally (the potion's own read) on top of the existing shafts and mark.
- **Leap (Renewing Mist jump)**: a droplet arcs down onto the next ally and splashes small and green.
- **Distill**: Aetherflow-style refill at the caster: the still boils (bubbles rising), a white jet up the chimney,
  one bright condensed drop falls back into the still.
- **Grand Blend**: two coloured streams spiral into the still and pop together.
- **Magnum Opus**: already a single big moment after the painted sheet; kept.
