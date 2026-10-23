# Bloodreaver: online VFX references

Crimson and iron, a heavy axe and a blood bank. Style target stays `docs/art/vfx-reference/tanks.jpg` (Ground Slam, Warcry).

## Analogs

- WoW Blood Death Knight: Heart Strike (filler), Death Strike (a hit whose heal is shown as blood pulled back into the knight), Blood Boil, Vampiric Blood, Marrowrend. https://www.wowhead.com/spell=49998/death-strike , https://www.icy-veins.com/wow/blood-death-knight-pve-tank-spell-summary
- FF14 Warrior: Heavy Swing / Maim / Storm's Path combo, Fell Cleave, Inner Release, Bloodwhetting, Holmgang.
- Lost Ark Berserker: Red Dust (an upward rip that opens every burst) and Bloody Rush in Burst Mode. https://maxroll.gg/lost-ark/build-guides/berserkers-technique-berserker-raid-guide
- General timing: https://80.lv/articles/vfx-staples-shape-color-and-motion/ , https://realtimevfx.com/t/stylized-vfx/15639

## Principles

1. Weight comes from the swing, not from particles. A heavy axe reads through a thick smear and a short pause on contact (40-60 ms of hit-stop on the heavy step), not from more sparks.
2. Steps escalate: Hack is a plain cut and leaves nothing behind; Maul comes back the other way, wider, with a floor crack; Gore is an *upward* rip (Red Dust), blood thrown up and out.
3. Drain is a two-way read. Death Strike's look is the hit, then the life coming *back*: a ribbon of blood from target to reaver over about 250 ms and a pulse closing in on the reaver as it lands (the heal). The return must arrive while the swing is still fresh (under 0.4 s), or it reads as a separate event.
4. Blood is dark, not bright. Body in deep crimson, a pale flesh-coloured core, black-red ink. Bright orange is kept for Frenzy's fire and lava.
5. Red on the floor is dangerous: no red discs or rings that sit on the floor past the impact. Splatter stays small and dark; settle long marks to low strength.
6. Fillers under 0.4 s, about 30 particles at most; shake 0 on Hack, 2-3 on Maul and Gore.
7. Cooldowns get a gather-then-slam: 150-250 ms of pull-in, then the impact. Ultimates may tint the screen but should not wash it red (red reads as danger).

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Hack & Maul: Hack | Heavy Swing / Heart Strike | thick crimson smear, a small bite and a splash; no crack, no shake |
| Hack & Maul: Maul | Maim | wider back-swing, hit-stop, a crack in the floor, shake 3 |
| Hack & Maul: Gore | Red Dust | rising rip: a vertical arc, blood flung up, a short spray falling back |
| Crimson Drain | Death Strike | cut, then a blood ribbon arcs back to the reaver and a pulse closes on it as it arrives; splatter smaller |
| Bloodletting | Fell Cleave double / crossing cuts | two crossing cuts and an X scar of blood on the target |
| Frenzy, War Cry, Undying, Scab, Blood Moon | Inner Release, Blood Boil, Vampiric Blood, Holmgang | already on the tank sheet; unchanged |
| Crimson Eclipse (Ult) | Bloodwhetting / Vampiric Blood at scale | softer camera flash so the screen is not washed red |
