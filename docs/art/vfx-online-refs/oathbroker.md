# Oathbroker: online references

Style target stays `docs/art/vfx-reference/oathbroker.png`: lilac light, gold coins, parchment and a dark wax seal
bearing the scales. Its stamp and its "VOID" are its identity. These references only say how the moves should behave.

## Analogs

- FF14 Dark Knight. The Blackest Night is a barrier that pays out when it is used up, and Living Dead and Walking Dead are
  a death deferred for a while and then billed.
  https://ffxiv.consolegameswiki.com/wiki/The_Blackest_Night, https://ffxiv.consolegameswiki.com/wiki/Living_Shadow,
  https://na.finalfantasyxiv.com/jobguide/darkknight/
- WoW Brewmaster Stagger: damage turned into a debt that ticks later, the closest mechanic to the Ledger.
  https://warcraft.wiki.gg/wiki/Stagger
- WoW Vengeance Demon Hunter sigils: a glyph on the floor that goes off a beat later. The delay is the drama, so the
  glyph is a thin outline, not a filled disc. https://warcraft.wiki.gg/wiki/Sigil_of_Chains
- WoW Warlock pacts and contracts (Demonic Circle, Soul Link): a binding drawn as a line between two parties.
- General timing: https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips

## Principles

1. A hit is a stamp: a fast fall (about 120 ms for a filler, 250-500 ms for a big one), one frame of squash on contact,
   and then the impression is left behind.
2. Readability first. Red floor shapes mean boss damage, so the Oathbroker never presses a bright red disc into the
   floor. Wax on the floor is dark wine, faint, and read by its gold rim. A filler's seal is stamped on the target's body
   in the air, not on the floor.
3. A filler stays light: one swing, one small impression, at most a few coins, gone in about 0.4 s. The third hit of the
   combo gets the stamp and the gold.
4. Money flows home. Coins and ribbons go from the target back to the knight, so a payment reads as debt collected.
5. Paper is the secondary layer: a few pages, never a blizzard on a filler. Bursts may throw a dozen or more.
6. Time moves are clocks: a dial or hands turning backward, slips of paper sliding back, with chevrons for "pushed back".
7. Tearing up the debt (Default) is the identity beat: a contract held up over the knight, VOID stamped across it, and
   the sheet torn in two halves that fly apart.

## Move plan

| Move | Reference beat | Plan |
|---|---|---|
| Dun / Levy (steps 1-2) | light weaponskill | mace swing, a small lilac impression on the target (in the air), Levy pulls coins back |
| Collect (step 3) | the stamp, combo finisher | a small stamp drops onto the target, a gold seal flashes on its body, coins run home |
| Auto-attack | light tap | a small lilac seal (kept small, short) |
| Renegotiate | Living Dead's deferral | the clock spins back (kept), plus three page slips sliding back with lilac chevrons |
| Settle | Purifying Brew, the debt paid at once | kept: the stamp beside the knight with coins and a faint dark seal |
| Default | the VOID | a contract over the knight, VOID stamped across it, torn in two |
| Summons (taunt) | Sigil of Chains | the lilac line to the boss, a seal stamped on the boss's body in the air, not a red disc on the floor |
| Bill coming due | Stagger tick | a dark wine seal with a gold rim at the feet, faint |
| Lien, Writ, Co-Sign, Foreclose, Final Reckoning | contracts, chains, the great seal | already match the painted sheet; kept |
