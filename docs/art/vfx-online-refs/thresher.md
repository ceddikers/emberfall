# Thresher: online VFX references

There is no painted sheet for Thresher; its palette is sickly green, ink and pale gold (with violet as the vein and
brown-black for rot). The references below are for behaviour: anticipation, impact, linger and scale.

## Analogs

| Our move | Analog | Why it fits | Source |
|---|---|---|---|
| Slash / Cleave / Backswing | FF14 Reaper Slice, Waxing Slice, Infernal Slice | a three-swing combo where each swing is wider than the last | https://www.thebalanceffxiv.com/jobs/melee/reaper/basic-guide/ |
| Reap (cashes afflictions) | WoW Affliction Malefic Rapture; FF14 Reaper Gibbet / Gallows | one spender that makes every DoT on the target erupt; a ghost scythe larger than the weapon | https://www.wowhead.com/news/shadowlands-dps-mythic-popularity-for-pre-patch-on-benched-me-318851 , https://www.icy-veins.com/ffxiv/reaper-pve-dps-guide |
| Reap with a full ripe harvest | FF14 Reaper Communio, Plentiful Harvest | the finisher of a build-up, a single heavy downward strike | https://ffxiv.consolegameswiki.com/wiki/Communio |
| Hook | FF14 Reaper Hell's Ingress / Harpe; Lost Ark Reaper dash skills | a gap-closer drawn as a line that bites | https://mobalytics.gg/lost-ark/classes/reaper/raid-lunar-voice |
| Gloam Blink | Lost Ark Reaper Shadow (stealth) skills | a dark streak, the strike lands at the end of it | https://www.playlostark.com/en-us/news/articles/reaper-academy |
| Reaper's Gate (Ultimate) | FF14 Reaper Enshroud (Lemure strikes, Communio finish); Lost Ark Reaper Lunar Eclipse | a transformed state with counted strikes, then one huge release | https://www.icy-veins.com/ffxiv/reaper-pve-dps-guide |

Craft sources: League of Legends VFX style guide: https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf ;
VFX Apprentice on timing (impulse vs rhythm, crescendo): https://www.vfxapprentice.com/blog/the-soul-of-effects-what-is-timing-in-vfx ;
hit-stop length (heavier hits freeze longer, about 50-200 ms): https://bugnet.io/blog/how-to-fix-hitstop-or-freeze-frame-feeling-off

## Principles (our words)

1. The combo is a rhythm: light, heavy, snap. Slash is quick and tight (about 0.3 s), Cleave wider and held a breath
   longer with a short hit-stop, Backswing a fast reverse arc. That already exists; keep it.
2. The spender is a crescendo, not a flash: each affliction pops in turn, a little bigger each time (rhythm), then one
   impulse closes it. This is Malefic Rapture spread over a beat so the count reads.
3. The payoff gets a shape the fillers never use: a ghost scythe much bigger than the weapon, raised behind the boss
   and brought down through it (Gibbet/Gallows' spectral blade, Communio's downward column). Its size and colour
   follow what was cashed: gold is tall and warm, young pale and small, rot heavy and brown.
4. Anticipation for the ghost scythe is short (about 120 ms raised and still), the swing itself about 150 ms, the fade
   about 350 ms. Fast in, slow out.
5. Colour layers: ink body, coloured vein, pale soul rim on the cutting edge only. White only at the impact frame.
6. Hit-stop scales with the payout: about 35 ms on Cleave, 50-100 ms on Reap by count and gold, about 100 ms on the
   Gate's release. Shake follows the same ladder.
7. Readability: the big blade is drawn in the air above the boss, not on the floor, and fades in under half a second;
   no red or blue floor fills. Fillers stay under about 40 particles.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Slash / Cleave / Backswing | Slice / Waxing / Infernal | keep the earlier rework (it already follows the light-heavy-snap ladder) |
| Reap | Malefic Rapture + Gibbet ghost blade | keep the pops; at the closing burst a ghost scythe, sized and coloured by the harvest, is raised behind the boss and swept down through it (two or more afflictions) |
| Reaper's Gate release | Communio | the same ghost scythe at its largest, gold, crossing the boss as the four-colour bloom opens |
| Cull (talent) | Plentiful Harvest | the ghost scythe in gold on its pillar |
| Hook, Blink, Wisp | Harpe / Hell's Ingress | keep |
