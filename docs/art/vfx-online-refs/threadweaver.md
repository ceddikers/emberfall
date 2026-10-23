# Threadweaver: online VFX references

Style target stays the painted sheet (`docs/art/vfx-reference/threadweaver.png`): crimson and gold threads, a white-hot
core, woven diamond seals. Threads are lines; there are no red floor fills.

## Analog moves

| Our move | Analog | Source |
|---|---|---|
| Tie (a thread between allies) | FF14 Scholar Fey Union (a channelled link to one ally that holds while in range), Sage Kardia (a standing link to one partner) | https://ffxiv.consolegameswiki.com/wiki/Fey_Union , https://ffxiv.consolegameswiki.com/wiki/Kardia |
| Threads splitting damage, Tapestry | WoW Spirit Link Totem (health redistributed among everyone inside each second), Spirit Link (damage shared between linked targets) | https://warcraft.wiki.gg/wiki/Spirit_Link_Totem , https://warcraft.wiki.gg/wiki/Spirit_Link |
| Needle tugs a heal down the threads | Sage Kardia (a damaging cast heals the linked partner), Discipline Priest Atonement (damage heals linked allies) | https://thebalanceffxiv.com/jobs/healers/sage/leveling-guide , https://warcraft.wiki.gg/wiki/Atonement |
| Snap (cut threads, release the stored damage as a heal) | Scholar Seraph Consolation (a burst heal plus barrier); Lost Ark Bard's identity burst | https://ffxiv.consolegameswiki.com/wiki/Consolation_(Seraph) , https://maxroll.gg/lost-ark/build-guides/support-bard-raid-guide |
| Cat's Cradle (area web) | Power Word: Barrier (a placed area that protects whoever stands in it) | https://warcraft.wiki.gg/wiki/Power_Word:_Barrier |
| Grand Loom (Ultimate) | Spirit Link Totem's raid-wide moment, Seraph summon | as above |

General craft sources: League VFX style guide (https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/,
"if everything is important, nothing is important" from the Riot missile breakdown,
https://realtimevfx.com/t/anatomy-of-a-league-of-legends-missile-part-2-what-are-we-communicating-with-our-vfx/13062),
https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips .

## Principles (in my words)

1. A tether is one clean line. Its life is in the ends: a knot or bead where it ties, a flash when it goes taut, a
   recoil when it snaps. The middle stays thin so four players' threads never become a net over the floor.
2. Damage-to-heal links (Kardia, Atonement) read as a pulse travelling caster to ally along the existing link, fired
   by the damaging hit. The traveller is small and bright; the ally end gets the heal pop.
3. Taut versus slack tells state: a new tie pulls straight with a twang (a quick wobble that damps out in ~200 ms); a
   cut thread whips back and sags.
4. Projectiles (Needle, Shuttle) are fast (100-300 ms flight), brightest at the tip, and the impact is a short star
   (~300 ms). The trailing thread fades before the next cast.
5. Heals on allies sit on the body (coil, stitches, pluses) and keep floor marks faint and short.
6. Crimson is the class colour but is used only as lines and points. Floor seals use gold rims and a very faint warm
   tint, never a red fill, and settle to about a third after 0.7 s.
7. Burst scale: Needle and Tie are fillers (under ~300 canvas calls and 40 particles, about 0.4-0.6 s of visible
   motion); Snap and Tapestry get a starburst and a seal; only Grand Loom takes the screen.

## Move-by-move plan

- **Needle**: reference beat = Kardia. A short glint at her hand (wind-up), the lance (unchanged shape, tighter
  timing), the bite star, and then the tug: a bead runs down each of her threads to its far end with a small heal pop.
- **Tie**: reference beat = Fey Union link forming. The loop flies (kept), and on arrival the line between the two
  goes taut with a damped twang, a gold knot flashes at both ends, and the coil wraps the ally's body (lower, tighter).
- **Snap**: reference beat = Consolation burst. Shears flash (kept), then each cut half whips back toward its end
  before the starburst; the floor diamond loses its red fill.
- **Mend Seam**: kept (stitches on the ally, beads run the threads).
- **Shuttle**: kept; already the strongest painted read.
- **Tapestry**: reference beat = Spirit Link Totem pulse. Kept, with the diamond's fill turned gold-faint so the large
  seal never reads as a red floor telegraph.
- **Grand Loom**: kept (already one big moment); it inherits the gold-faint seal.
