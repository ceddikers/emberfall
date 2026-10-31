# Talent buffs (night of 2026-10-31 to 2026-11-01)

Branch `talent-buffs`, worktree `.claude/worktrees/talent-buffs`. It is cut from origin/main c0df6f0, uncommitted and not pushed. `node tools/check.js` passes.

The driver was the raid re-measure in `2026-10-31-talent-remeasure.md`. The rule was to lift weak picks to their row's best and never lower anything. Each gap below is the pick's raid damage (healing where stated) against the pick the bots held. The gaps are paired by seed, and ± is the standard error.

## What changed, by class

### Thermist

**Thermocline (row III) is reworked.**
- It is still on Q, but it is now an instant bolt in the way your swing is going, moving the dial like a Cinder Bolt or Rime Shard does.
- It still hits 8% harder per step from 0, and its Shock is still 60% harder.
- New: after any Thermal Shock, your spells come 15% faster for 5 s (once every 15 s).
- Before → after: Pendulum -30 → +7, Zenith -43 → +4.

**Other Thermist picks:**
- **Slag Plate (Zenith, row VI):** the slag also strikes the boss. -5 → +1.
- **Equilibrium Pulse (Pendulum, row IV):** the Shock is 50% harder (was 30%), and the recharge is 10 s faster. -11 → -4.
- **Tolling Bell (Pendulum, row VII):** the bell also strikes the boss. -11 → -3.

### Chronomancer

Each pick below gains damage only; healing is unchanged within noise.
- **Time Warp:** every Bolt gets a second strike from the clock (40%). About -16 → about 0.
- **Second Chance:** Recall strikes the boss, and Bolts get an 80% echo for 8 s. About -20 → -3 to -7.
- **Time Bubble:** it strikes the boss every 2 s. About -4/-14 → +6/-6.
- **Overwound:** spilled Flux strikes the boss. About -3/-13 → +6/-5.

### Ranger

The Ranger is already the top class, so this is row parity only.
- **Fletcher's Rhythm:** every second Quick Shot (was every third), and it always crits and lights Keen Eye. -16 → -2.
- **Steady Breath:** after standing still 2 s, a shot always lights Keen Eye. -17 → +2.
- **Disengage:** you land with Keen Eye twice and both Piercing Arrow charges back, and crits shorten the Cloak. -12 → -2.
- **Second Wind:** Rapid Fire and Explosive Shot each light Keen Eye and give back 15 Focus. -13 → -2.
- **Pinning Shot:** the next Piercing Arrow also crits. -9 → +1.
- **Wild Volley:** the volley hits harder and gives 8 Focus. -13 → -2.
- **Parting Shot:** 100 per stack, Keen Eye twice, both Aimed Shot charges back, 40 Focus. -15 → -4.

### Houndmaster

Pack Leader:
- **Heel Nip:** every knife hit nips, and nips mark heels that strengthen the next finisher. -11 → -3.
- **Guard Dog:** each hound bites as the guard ends. -9 → 0.
- **Howl:** both hounds bite at once and bite twice as fast for 8 s. -18 → -2.
- **The Long Chase:** the lap now ties a Mark, so row IV works with it (before, it switched off the whole row). -15 → +4.
- **King of the Pack:** the hounds stay 15 s, bite twice as fast, and the free finisher hits harder. -9 → -1.

Lone Wolf goes from about 92 to about 99, mostly because of the Long Chase fix.

### Shadowblade

- **Relentless:** gives back points, and an Eviscerate of 4+ points gives 12% haste for 6 s. -12/-17 → about 0.
- **Sharpened Shadows:** double the cap, plus a crit rider. -9/-15 → +3/-3.
- **Feint (Bladedancer):** 20% (was 12%). -9 → -2.
- **Opportunist:** crits on boss casts, plus extra damage. -9 → -2.
- **Eye of the Storm (Bladedancer, row VII):** two Tempo make a Flourish, and a spilled point costs one Tempo, not all of them. -14 → -2.

### Thresher

- **Unbroken Step:** a Blink adds a swing that cuts at once, two through a telegraph. -10 → -4.
- **Flicker:** a Blink through a telegraph also readies Void Star, half again as hard. -10 → 0.

### Pyromancer

- **Afterburn:** Ember Circle goes out in a blast scaled by the time you stood in it. -10 → +1.
- **Long Burn:** after 8 s the circle flares, and you hit 30% harder in it. -10 → -1.
- **Cataclysm:** a spec lift of +9% (balance 1.09), and Meteor's cast is 2.8 s (was 3.0). Raid damage is up 8 to 9%.

### Driftblade (Orbit)

- **Galeforce:** every Passing Strike looses a wind blade, in a run or out of it. The spec rises to about 100.
- **Hurricane:** every Passing Strike gives Drift and cuts Hook Turn and Slipstream cooldowns. -13 → -3 against Jet.

### Marionettist (Understudy)

- A spec lift of +8% (raid damage up 7.5 to 9%).
- **Twin Strings:** cut 32 → 46 per second, Crossfire line 56 → 78.

### Lantern Keeper

- **Trim the Wick:** 5% more per lit lantern. Own damage is up about 16% (estimated, not re-measured in raid).
- **Eternal Lamp:** lit from the pull's start, it hangs over the most hurt ally and moves on when someone is worse off. Before, it hung over the keeper. This is a feel change you may want to judge.
- **Last Light:** the most hurt ally anywhere heals extra each second (the guard stays).
- **Lantern Ward:** a wider, stronger Hand Lantern.
- Row V healing gap: -19 → -6/-8 against Festival.
- Wayfarer's spec damage share is now declared at 1.1, so the check's spec rule matches the new Trim the Wick.

### Tidecaller

- **Low Water:** the backwash strikes the boss.
- **Foam:** the foam stings the boss as it forms and as it heals.
- Both now sit level with or a few points over Spindrift on damage (Springtide +48 to +53% against the old build, Spindrift +44 to +47%). Healing is flat within noise.

## Bot play fixes

These changes are in bots.js. They make the measurements fairer and don't change the classes.

- **Lantern Keeper's healing glow:** it drew melee bots away from the boss. Partners were out of reach 36% of the time, now 4%; the party does about 30% more damage, and leaves 6 to 9 points less boss health.
- **Ranger Disengage:** the bot now actually uses the Cloak.
- **Bladedancer:** the bot holds Blade Fury for the Flourish.
- **Thresher:** Blinks out of telegraphs now trigger Flicker and Unbroken.
- **Chronomancer:** presses Time Warp, Recall (with Second Chance) and keeps Overwound wound.
- **Bot builds:** `bot-builds.js` is regenerated. The bots now hold several of the lifted picks, such as Rhythm and Second Wind on Ranger, the new Pack Leader picks, and Afterburn.

## Boss tuning: please look at this

I compared untouched code with this branch on all 12 bosses, Normal and Hard, with the base line-up (Bastion, Cleric, Ranger, Pyromancer). That was 48 human-like pulls per cell, at each set's tuning gear.

**Kill times:**
- 6 to 8% faster everywhere.

**Normal:**
- Up about 5 points.

**Hard:**
- Up about 8 points on average, mixed per boss.
- Archmage 58 → 81% and Hydra 40 → 65% stand out.
- Some bosses are flat or slightly down within noise: Volkar, Corvane, Brannoc, Morrow-Oak and Caelum.

**The cause:**
- The base line-up's bot Ranger held Fletcher's Rhythm, which trailed Ricochet by 16% in raid. With Rhythm at parity, that Ranger does about 15% more damage (Ricochet on the same code: +13%), and the Pyromancer about 4% more.
- So the bosses were tuned against a bot playing a weak pick. A person who already took Ricochet was already this strong, and nothing raised the ceiling.

**Your call (not done):**
- Leave it.
- Or give the bosses a small health lift (about 6 to 8%) to put kill times and Hard clear rates back where they were.

Note that my baseline already read above the CLAUDE.md bands on some bosses with this line-up. Before retuning, the retune method from 2026-10-31 should be re-run rather than these numbers.

## Worth a look in play

- **Eternal Lamp's new behaviour:** it follows the most hurt ally, not the keeper.
- **Second Chance:** sized to bot use of Recall. A player who presses Recall much more could pass Future Sight.
- **Pendulum Thermocline:** it reads +7 over Rebound, a little over the +5 guide but within noise.
- **Lone Wolf:** after the build regeneration it may now read above 100 (its Howl helps the bot pounce more). Re-measure before quoting.
- **Left alone:** Nightstalker Cloak and Veil (about -7) weren't on the list, and neither was the healer bot-build scoring rule (healers scored on healing only).

## Reproduce

- Agents' measurement files: `scratchpad/measure/<group>/`.
- Lead's Ranger and tuning checks: `scratchpad/measure/lead/` and `scratchpad/tune/`.
- The harness is `scratchpad/measure/harness.js`, run with `REPO=<worktree>`.
