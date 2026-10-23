# Gloomsworn: online references

Style target: `docs/art/vfx-reference/tanks.jpg` plus the class's own palette (ink black, bruised violet, a pale ghost
teal). Gloomsworn was reworked earlier the same day (Rend stream, Gloom Strike X-cut and column, Shade echo ghost
knight, Hollow event). These references mostly confirm that rework.

## Analogs

- FF14 Dark Knight. Living Shadow is a dark double of the knight that fights beside it (our Shade echo). Edge of
  Shadow is the dark spender hit (our Gloom Strike). Salted Earth is a dark patch on the ground. The Blackest Night is a
  dark barrier (our Last Rite). Living Dead and Walking Dead are death deferred (our Hollow).
  https://na.finalfantasyxiv.com/jobguide/darkknight/, https://ffxiv.consolegameswiki.com/wiki/Living_Shadow,
  https://ffxiv.consolegameswiki.com/wiki/List_of_dark_knight_actions,
  https://ffxiv.consolegameswiki.com/wiki/The_Blackest_Night
- A Square Enix forum thread where players say Edge and Flood of Shadow look plain next to the old Dark Arts.
  It is a reminder that the spender has to look like a spender.
  https://forum.square-enix.com/ffxiv/threads/417843-Please-bring-DRK-Dark-Arts-visual-identity-back-again.
- WoW Blood Death Knight and Shadow: dark streams drawn back into the caster as a resource fills.
- General timing: https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips

## Principles

1. The spender is bigger than the builder. Rend steps get a little heavier each time, and Gloom Strike gets the
   column, the X and a hit-stop.
2. The dark is drawn back into the knight as Gloom fills (the Blood DK read), and it turns pale when a spend is ready.
3. The double is a figure, not a smear. The Shade echo arrives a beat late and lands its own X, so two hits read as two.
4. Dark effects use ordinary compositing (ink), and only the pale core is additive, so the class never washes the screen out.
5. Long auras (Mantle 8 s, Last Rite shell 8 s) must stay cheap and faint. They are on screen for a long time
   alongside three other players' effects.
6. Floor marks stay faint and short. Ink spikes break up out of the floor and settle within half a second.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Rend, Sunder, Gloaming | Hard Slash combo | kept from the earlier rework |
| Gloom Strike | Edge of Shadow | kept (column, X cut, ghost blade) |
| Shade Step and its echo | Living Shadow | kept |
| Black Mantle | Shadow Wall / Dark Mind | kept the look, made the 8 s ribbons cheaper (fewer strokes per ribbon) |
| Last Rite | The Blackest Night | kept (collapse, then a shimmering shell) |
| Hollow | Living Dead / Walking Dead | kept |
| Eclipse of the Vigil | burst | kept |
