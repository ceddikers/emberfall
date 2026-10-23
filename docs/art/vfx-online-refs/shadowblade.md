# Shadowblade: online VFX references

Combo-point rogue in violet shadow, pale steel and crimson. Style target stays `docs/art/vfx-reference/rogue.jpg` (Swift Strike, Backstab, Shadow Dash, Shadows / Stealth, Smoke Bomb). Already reworked once (alternating Strike, combo-scaled Eviscerate, rear and flank flourish with a violet "!", Shadowstep arrowhead); this pass builds on it.

## Analogs

- WoW Subtlety Rogue: Shadow Dance (a 6 s burst window that lets stealth moves be used anywhere), Shadowstrike, Eviscerate. https://www.wowhead.com/spell=185313/shadow-dance , https://www.icy-veins.com/wow/news/blizzard-shuts-down-shadow-dance-pre-pull-in-season-2/
- FF14 Ninja: Kassatsu (a one-shot empower), Bhavacakra (the gauge spender), Trick Attack / Kunai's Bane from Hidden, Aeolian Edge and Armor Crush as rear and flank finishers. https://na.finalfantasyxiv.com/jobguide/ninja/
- FF14 Viper: positional finishers (Flanksting / Hindsting) and the Reawaken chain. https://na.finalfantasyxiv.com/jobguide/viper/
- Lost Ark Deathblade and Shadowhunter: back attacks as the core of the damage, a burst state that changes the hero's silhouette. https://www.icy-veins.com/lost-ark/surge-zero-deathblade-guide
- Hit feel: freeze on the striking pose, trails to show the blade path, flashing particles per hit in a fast combo. https://www.gamedeveloper.com/audio/improving-the-combat-impact-of-action-games

## Principles

1. Builders are light, spenders grow. Strike stays a quick crossed cut; Eviscerate's cuts, burst and stop scale with the points spent (already built). Five points must look different from four.
2. Positionals get a stamp, not a colour wash: the violet "!" over the boss from the back or side, as FF14 shows a positional hit by its own flyout.
3. A burst window changes the silhouette. WoW's Shadow Dance and Lost Ark's burst states read because the hero looks different for the whole window: a shadow double trailing the rogue and a darker aura, kept faint so it never covers telegraphs.
4. Entering a window is an impulse: ink pulled in for about 120 ms, then a snap ring and a white flicker. No long wind-up on an off-GCD button.
5. Blood is air, not floor. A red pool on the floor reads like a damage telegraph; wounds bleed as spray and drops, and anything left on the floor is a dark wine stain, small and low.
6. Fillers under 0.4 s and under about 40 particles; shake only from three points up.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Strike | Shadowstrike / Gust Slash | unchanged (alternating X and thrust) |
| Eviscerate | Eviscerate / Bhavacakra | unchanged shape; the floor splatter becomes a small dark wine stain, not a red pool |
| Rupture | Rupture | the bleeding pool becomes a dark wine stain; drops keep falling |
| Shadowstep | Shadowstep / Shadow Dash | unchanged |
| Shadow Dance | WoW Shadow Dance / Kassatsu | ink pulled in, a snap ring and white flicker, then a shadow double trails the rogue for the 10 s window, faint |
| Venom Blade, Smoke Bomb, talents | rogue sheet | unchanged |
| Thousand Cuts (Ult) | Shadow Blades / Ten Chi Jin | unchanged |
