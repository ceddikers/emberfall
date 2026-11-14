// Boss XV: Ormun, the Tide-Weigher — "The Scales". The third boss of Season 2 (the Silver Road, docs/plans/2026-11-season-2-design.md).
// The road crosses a pair of scales, and their keeper weighs whatever comes over; what is too heavy, or too light, he takes. The question
// is always: which side is heavier?
//   EVERYTHING WEIGHS: a hero is 1, a silver weight is the number on it, a drowned thing is 1 while it lives, a fallen hero still weighs 1
//     where they lie, a hero marked Burden weighs 2 (or 3) and one marked Buoy weighs 0. The bridge between the pans weighs for neither pan.
//     Every judgement names its rule on the cast bar and is settled by what is on each pan when the bar ends (the strike is laid on whatever
//     the count would strike now, moved from pan to pan as the count changes, and fixed for the last half second). Every judgement has an answer the party can
//     reach from where it stands: the weights that fall are chosen (and the Drowned Things split across the pans) so the next judgement can be answered.
//   Act I, First Weighing (100% -> 76%): Let It Be Level (the heavier pan is struck if the pans are not level), Heavy Hand (the tank's buster:
//     it leaves the tank Burdened), The Tide Comes In (a raidwide that hits harder the further from level the pans are), Counterweight
//     (a weight falls on a marked hero and comes to rest in the nearest empty cradle, so where that hero stands decides which pan gains it).
//   Act II, The Heavier (76% -> 50%): The Heavier Falls (the heavier pan is struck; level strikes both lightly), The Lighter Rises (the lighter
//     pan is struck), weights of 2 and 3, Undertow (the low pan's rim floods inward, wider the lower it sits).
//   Spring Tide (the wall at 50%, about 38 s): the Tide arrives, a serpent the length of the room passing under the pans (it adds 3 to the
//     side opposite the pan it lifts), Drowned Things climb onto the pans (1 each while they live) and three Levels are answered by killing
//     the right ones and standing right. He cannot be hurt until the third has fallen.
//   Act III, Burdens (50% -> 22%): Burden and Buoy (one hero heavier, one weightless, for 20 s), the judgements closer together.
//   Act IV, The Last Weighing (22% -> dead): The Bridge Breaks (no crossing, no neutral ground; the party is levelled to two and two), Tip the Scale (everyone
//     on the heavier pan is thrown across, and a hero who carries a weight takes it with them: the one way over, and it is his), Counterweights and Burdens
//     deciding the last judgements, which are all The Lighter Rises (after a Tip everyone alive stands on one pan, so the answer is how much of the weight the
//     other pan keeps). The enrage is The Scale Falls.
// Every telegraph shows on every difficulty.
// HARD (f.hard: casts 15% faster, harder hits, the first calm of every set 6% shorter; the middle units of Acts I, II and III (the Burdens act) come in one of
//   three orders per pull, f.dance, under the rules of Garrow's `mix`: a Heavy Hand never more than 56 s apart nor under 18, no two Tides under 18 s apart, no two
//   judgements under 16 s apart unless they are a Double Judgement's pair; the first unit the three orders do not share tells which dance it is). Five moves Normal
//   never uses, each named on the cast bar or the feed:
//     Hollow Weight        a Counterweight whose weight is cracked (the prop's hp is 1, the head marks grey): it counts half. Tag ormHollow.
//     Scatter the Silver   he strikes a cradle (a red circle r 110, tag ormScatter) and the weight on it breaks into ones that roll to the nearest empty cradles on
//                          either pan (a weight a hero holds is spared). Roomev ormscatter.
//     Double Judgement     one judgement and, 2.6 s after its bar ends, another (the first step is named Double Judgement, the second by its own rule). From Act II.
//     Three Burdens        two heroes weigh 2 and one weighs nothing, for 20 s (Act III on).
//     Twin Undertow        both rims flood: the low pan as wide as ever, the other 70, both 90 when the pans are level. Tag ormTwin.
// EXTREME (f.extreme: Hard plus three rules of its own, one fixed dance, always the written order):
//     Buoyed               a head mark (key ormbuoyed, sym 'seed') and a cast of its own: one hero weighs MINUS ONE for 24 s and lifts their pan.
//     Exact Measure        a judgement that names a number: a pan is lit (orscales exact { pan, n }, roomev ormexact, a gold number over every hero) and must be
//                          heavier than the other by exactly n. Whichever side is too heavy for that is struck. Tag ormJudge, cast name Exact Measure.
//     The Tide Weighs Too  for 24 s the water on the low pan adds 1 to its count for every 3 s it has stood there (at most 4); level, or a new low pan, begins it
//                          again (orscales waterL / waterR, roomev ormwater).
//
// ================================ CONTRACT (for the look, sound, journal and bot lanes) ================================================
// ROOM (shapes.js ARENA_DEFS 'ormun', kind 'union'): two round pans of radius 300 centred (-380, 60) and (380, 60); a bridge, the rect x -110..110,
//   y 10..110. Nothing else is floor: a hero cannot walk off it (ARENA.clamp), and a fall is never part of this fight. Ormun stands at the fulcrum
//   (0, -170) and never moves (def.anchor). His hit radius is 190 (the script sets FIGHT.BOSS_R and sends it in a roomev 'form' with form null, as
//   a form does), so melee reaches him (75 beyond the radius) from the inner edge of either pan and the near half of the bridge.
//   WHERE A HERO COUNTS: in a pan's circle = that pan (the bridge's two ends, where it rests on the rims, are the pans'); in the bridge rect and
//   in neither circle (|x| under about 84) = the bridge, which counts for neither pan. A fallen hero keeps the place they fell.
//   CRADLES (where a weight rests; three on each pan, near the inner edge): L (-216,-135) (-159,-67) (-131,7); R (216,-135) (159,-67) (131,7),
//   cradle index 0..5 (0-2 on L, 3-5 on R). Props kind 'ormcradle' (state 1 while a weight rests on it). Heroes' stand spots for the solver: see SPOTS.
// MECHANIC TAGS (the `tag` on tg / pdmg, `tag` of the mech):
//   ormJudge   a judgement's strike: aoe circle r 280 on a pan (or a rect on the bridge, x -82..82, y 10..110, when more than two stand on it). ONE telegraph per place
//              (left pan, right pan, bridge) for the whole cast, all laid when the cast begins (so none ever shows under its full warning), parked off the floor until the count asks for it, and only moved on or off by `tgmod`
//              { id, shape } (off = a circle of r 1 at (0, -4000), which draws nothing), so the client never sees one re-laid and the bots see one mechanic. Fixed 0.5 s
//              before the cast ends. How the client knows which pan is lit NOW: the orscales event (strikeL / strikeR / strikeB: 0 none, 1 struck, 2 struck lightly,
//              and glowL / glowR), and the tg's own live shape. A light strike (both pans, level in The Heavier Falls / The Lighter Rises) is the same tag; the pdmg
//              `n` names the rule.
//   ormUnder   Undertow's flood: aoe donut on the low pan (outer r 280, inner r 280 - width, width 70 + 40 per point of difference, at most 230); the same
//              keyed mech per pan, moved by tgmod as the width changes.
//   ormTwin    Twin Undertow (Hard): the same donuts on both pans.
//   ormHollow  Hollow Weight (Hard): the Counterweight's spread circle for a cracked weight.   ormScatter  Scatter the Silver (Hard): aoe circle r 110 on a cradle.
//   ormHand    Heavy Hand: buster cone (r 420, arc 1.1) from him to the tank. tag 'buster' (the engine's own).
//   ormTide    The Tide Comes In: raidwide, hidden; its damage is read when it lands (more the further from level).
//   ormCW      Counterweight: spread circle r 100 following the marked hero.
//   ormBeat    the light raidwide that closes each act's opener (hidden).
//   ormBreak   The Bridge Breaks: aoe rect over the bridge for the cast (nobody stays on it).
//   ormTip     Tip the Scale: type 'drop' circles r 290 on both pans, color '#7ab8ff', dmg 0: no damage; where they land heroes are thrown across.
//   ormBite    a Drowned Thing's bite (pdmg kind 'ormBite', avoidable).
// ROOMEVS (all `t:'roomev'`; `dur` is how long the effect should draw; where a payload is `x:` it is a room point):
//   orscales   the STATE (the art already reads it): { tilt (-1..1, + = right pan low), nL, nR (counts, halves possible), nB (heroes on the bridge), glowL, glowR
//              (0|1: a judgement or the flood will fall there), strikeL, strikeR, strikeB (0 none | 1 struck | 2 struck lightly: which place is lit now),
//              locked (0|1: the strike is fixed), exact ({ pan, n } or null: Exact Measure's lit pan and number), waterL, waterR (Extreme: what the water adds),
//              bridge (bool: the span stands), cradles [[x,y] x 6], carry [[pid, n] or [pid, n, 1]...] (who carries which weight; the third element 1 means a cracked weight, Hollow Weight: it counts half), dur 9999 }. Sent on every change and every 2 s.
//   ormact     { act 1..5 (1 First Weighing, 2 The Heavier, 3 Spring Tide, 4 Burdens, 5 The Last Weighing), name, dur }: an act's opener.
//   ormjudge   { rule 'level'|'heavier'|'lighter'|'exact', name, dur (the whole cast), lock (0.5: the last stretch, when the strike is fixed), exact }.
//   ormexact   { pan, n, dur }: Exact Measure (Extreme) names its number: the lit pan must be heavier than the other by n.
//   ormlock    { rule, pans: ['L'|'R'|'B', ...], light (0|1) }: the strike is fixed.
//   ormfall    { pan 'L'|'R'|'B', light (0|1), rule }: the strike lands (one per region).
//   ormweight  { a: 'lift'|'set'|'clear'|'land', id, n, crack (0|1, on a land), x, y, pan, cradle, who }: a weight picked up, put down, all lifted away, or (a 'land') come to rest.
//   ormdrop    { n, hx, hy (where it falls: the marked hero), who, crack (0|1: Hollow Weight), dur (time to fall) }: a Counterweight's fall.
//   ormscatter { a: 'strike' | 'break', id, n, cradle, x, y, to (on a break: the cradle indices the pieces roll to), dur }: Scatter the Silver (Hard).
//   ormwater   { a: 'begin' | 'on', dur }: The Tide Weighs Too (Extreme) is cast, then runs for 24 s.
//   ormundertow { pan, w (flood width), pans [[pan, w]...], twin (0|1), dur, lock }: Undertow / Twin Undertow, sent again whenever it changes.
//   ormtide    { a: 'come' | 'under' | 'leave', pan 'L'|'R' (which pan the serpent lifts), add (3), dur }: the Tide's passage in the wall.
//   ormbell    { n, pan, dur }: the bell on the chain tolls the count (n strokes; pan = the heavier side or null), once per judgement in the wall.
//   ormbridge  { a: 'break', dur }: The Bridge Breaks. After it the bridge is gone (orscales bridge false) and a solid prop 'ormgap' lies over it.
//   ormtip     { a: 'tip', dur }: Tip the Scale resolves: everyone on one pan is thrown to the other (kb events follow).
//   ormtidein  { dur, n (difference now) }: The Tide Comes In begins (the water comes over both rims).
//   form       { form: null, r: 190 }: his hit radius (main.js 'form' handler; nothing else changes).
// PROP KINDS (props message `p`, packed by PROPS.pack: [id, kind, rect, x, y, r, h, a, hp, maxHp, flags, state]):
//   ormcradle  r 34, not solid; state 0 empty, 1 a weight rests on it.   ormweight  r 26, not solid; state = its number (1..3); hp 1 / maxHp 1 = CRACKED (Hollow
//   Weight: it counts half); only while it rests (a carried weight is its head mark, grey when cracked).   ormgap  rect w 168 h 100 at (0, 60), solid: the fallen bridge (Act IV).
// ADD KINDS: 'drowned' (a Drowned Thing: r 26, killable, weighs 1 on the pan it stands on; leashed to where it climbed out; bites 'ormBite').
// HEAD-MARK KEYS (f.mark): 'ormfall' num n (a Counterweight's number, on the hero it will fall on, for the whole cast); 'ormcarry' num n (a carried weight,
//   until put down); 'ormburden' num 2 or 3, orange (the hero weighs that, 20 s, 34 s in the last act); 'ormbuoy' sym 'seed' pale blue (the hero weighs 0: the num
//   mark cannot draw a 0); 'ormbuoyed' sym 'seed' paler (Extreme: the hero weighs -1, 24 s); 'ormexact' num n gold on every living hero for the cast (Exact Measure).
// POSES (f.cast anim / f.anim name): 'weigh' (a judgement), 'hand' (Heavy Hand and Scatter the Silver), 'tide' (The Tide Comes In), 'drop' (Counterweight), 'under' (Undertow),
//   'act' (an opener), 'break' (The Bridge Breaks), 'tip' (Tip the Scale), 'settle' (after a judgement lands, anim 1.2 s), 'wall' (Spring Tide), 'enrage'.
// ART'S NAMES (ormun-art.js poses are props orJudge, orBlow, orTide, orDrop, orCradle, orBridge, orTip, orIntro, orDeath, orEnrage with orSide -1 left pan / 1 right pan /
//   0 both, and orFall / orDur for the strike beat). This file keeps its own names; to reconcile: anim 'weigh' = orJudge (orSide from the roomev ormjudge / ormread pans, orFall
//   from ormfall, orDur from the cast), 'hand' = orBlow, 'tide' = orTide, 'drop' = orDrop, 'under' = orTide on the low pan, 'act' = orIntro, 'break' = orBridge, 'tip' = orTip,
//   'wall' = orIntro, 'enrage' = orEnrage, the kill moment (orm-kill-fall) = orDeath, orCradle = a weight resting / being lifted (roomev ormweight). The live state is the
//   `orscales` event under the art's own name and fields (tilt, nL, nR, glowL, glowR, bridge, cradles), plus nB (the bridge's heroes).
// CAST NAMES: First Weighing, The Beam Leans, The Weight of Things, The Bridge Breaks, Spring Tide (openers); Let It Be Level, The Heavier Falls, The Lighter Rises;
//   Heavy Hand; The Tide Comes In; Counterweight; Undertow; Burden; Tip the Scale; The Tide Arrives; The Scale Falls (the enrage). Hard: Hollow Weight, Scatter the Silver,
//   Twin Undertow, Three Burdens (and the step name Double Judgement, over a cast named by its rule). Extreme: Buoyed, Exact Measure, The Tide Weighs Too.
// MOMENTS (room events 'orm-<show>-<beat>', all { show, beat, dur, ... }; each is a hook for the staging lane: camera, music, room effects):
//   SPRING TIDE (the wall; a showpiece, nothing else on the floor in the hold)   orm-springtide-buildup (his cast, dur = the cast) -> orm-springtide-hold (1.8 s of
//     stillness: no cast, no telegraph, no add) -> orm-springtide-release (The Tide Arrives; the serpent comes) -> orm-springtide-climax (the serpent lifts the first pan: pan)
//     -> orm-springtide-stage (each further pass, pan, round) -> orm-springtide-break (the wall breaks, on the party's THIRD CORRECT COUNT, not a timer: a judgement in which
//     nobody is struck; a wrong count is another round, six at most) -> orm-springtide-end. The `ormtide` / `ormbell` / `ormjudge` events are the detail inside it.
//   THE BRIDGE BREAKS (Act IV's opener; a showpiece)   orm-bridge-buildup (the span groans; x, y = its middle) -> orm-bridge-hold (the last 1.3 s of the cast, nothing else on the
//     floor) -> orm-bridge-release (it falls) -> orm-bridge-end.   THE FIRST TIP THE SCALE: orm-tip-buildup -> orm-tip-hold (1.2 s) -> orm-tip-release (every Tip, not
//     only the first: both pans swing, the thrown fly).
//   THE PARTY CAUSES (the room answers what they did): orm-perfect-swing {rule}: a judgement landed with the pans exactly level and nobody struck: the beam swings hard,
//     the pans lurch. And the wall above breaks on the third correct count.
//   VERDICTS: every judgement sends ormread (the count is read, the beam stops dead: { rule, nL, nR, nB, pans, light, level, strikeIn 0.5 }) half a second BEFORE the
//     ormfall events (the strike). ormlock (the strike is fixed) comes with ormread.
//   THE ENRAGE: orm-enrage-start (The Scale Falls begins, dur 8) and orm-enrage-land.   THE KILL: orm-kill-fall (he is brought down; x, y his middle, dur 3; the
//     fight ends 2.4 s later) -> orm-kill-end.
// f.room (host side, for the bots and tools): { tally() -> { L, R, B (heroes on the bridge), diff (R - L), heavy 'L'|'R'|null }, weights: [{ id, n, crack, idx, pan, x, y, carrier }], wv(w) (what a weight counts),
//   cradles: [{ idx, pan, x, y }], carryOf(pid) -> weight | null, heroW(pid), panOf(x, y), doom: the judgement running { rule, name, end, lockAt, locked, regions, light } or null,
//   agenda() -> { rule, left (s to its cast end), cast (bool), tip (bool: a Tip comes first), exact } | null, plan(rule, o) -> the cheapest answer ({ safe, score, assign: { pid: {
//   to, lift, spot, cradle } } }; o: { tip, exact, left (seconds the walk may take), extra, probe }), SPOTS, BSPOTS, bridgeOn, tide: { L, R }, BRIDGE_CAP }. f.ormLog (tools): one record per
//   judgement { act, rule, answerable (an answer existed from where the party stood when the bar began), lock, ... }.
// =========================================================================================================================================

const ORMUN = {
  id: 'ormun', name: 'Ormun', title: 'the Tide-Weigher', set: 6,   // (set 6: bots hold the talents of the set before it, as for Garrow; data.js will carry it too)
  // Loosened 2026-11-13 (the clock for everyone, so that two melee heroes can clear; samples are 48 pulls, seeds 1 and 2, bastion + cleric + a damage pair, Normal post5, Hard post6, Extreme post7; h = HUMAN=dps, p = perfect bots).
  //   Why: the melee pair (shadowblade + thresher, or shadowblade + driftblade) dealt about 20 to 25% less than the ranged pair on this stationary boss and the standard line-up cleared at about 519 s against a 612 s enrage, so melee parties met the enrage
  //   (21 of 48 Hard h pulls) or died in a spiral first: the boss's swings land on a melee hero once the tank is down, and the Drowned Things of the wall bite whoever hugs them. Time out of reach was a few seconds an act and is not the cause.
  //   What changed (old -> new): health 8.8M / 9.5M / 10.3M -> 7.75M / 8.36M / 8.755M (about 88%, 88%, 85%); the enrage 620 / 612 / 640 s -> 660 s on all three (the closing passes keep the course going to it, so there is no dead air); the boss's swing (autoDmg) 2700 -> 1500 / 1800 / 2250;
  //   the Drowned Things' bite 2600 / 2300 -> 1300 / 1150 on Normal and Hard, 1150 on Extreme (about half); the Heavy Hand 35000 / 30500 -> 52500 / 45750 on Normal and Hard (Extreme's stays 30500) so the tank's work is where it was; the multipliers 4.75 / 5.0 / 7.2 -> 5.0 / 6.0 / 9.0, with the Tide, Counterweight's spread
  //   and the opening beats written down by the same factor again (Normal 1840 / 3650 / 3220 -> 1748 / 3468 / 3059, Hard 1950 / 3750 / 3250 -> 1625 / 3125 / 2708, Extreme 1420 / 2880 / 2490 -> 1136 / 2304 / 1992) so each lands exactly as before (the ceiling below still holds).
  //   The multiplier is no lever for the melee pairs (every rise of it took them down far faster than the standard line-up), the swing and the bite are; the health is the one that gives melee time, and the standard line-up gets easier with it, which the multiplier and the Hand take back in part.
  //   Clears of 48 (before -> now; the standard line-up, A = shadowblade + thresher, B = shadowblade + driftblade):
  //     Normal h:  standard 39 -> 48, A 1 -> 28, B 1 -> 28.   Normal p:  standard 47 -> 47, A 9 -> 43, B 9 -> 36.   (median clear, standard: h 573 -> 510 s, p 513 -> 465 s; A h 575 -> 615 s)
  //     Hard h:    standard 32 -> 37, A 0 -> 14, B 3 -> 12.   Hard p:    standard 44 -> 47, A 12 -> 33, B 8 -> 23.   (median clear, standard: h 575 -> 519 s, p 517 -> 476 s)
  //     Extreme h: standard 10 -> 16, A 0 -> 0,  B 0 -> 1.    Extreme p: standard 14 -> 27, A 0 -> 5,  B 0 -> 1.    (median clear, standard: h 618 -> 566 s, p 579 -> 493 s)
  //   Not reached: the standard line-up's Normal (h 48 against 39) and Extreme (h 16 against 10) are easier than they were, because there is no setting that keeps them where they were and lets two melee clear (every rise in what hurts the standard line-up kills the melee pairs more);
  //   Normal and Hard melee h are at 28 / 28 and 14 / 12 of 48, and the median clear of the standard line-up is a little under 480 s for perfect bots on Normal (465 s). An unseen seed (3, 24 pulls): standard h / p 23 / 23 (Normal), 19 / 23 (Hard); shadowblade + ranger 24 / 23 (Normal), 15 / 20 (Hard).
  // Tuned 2026-11-12 (the build before that; its figures are superseded by the above), the standard line-up (bastion, cleric, ranger, pyromancer), 24 pulls a sample, seeds 1000 and 5000. The health was then 8.8M / 9.5M / 10.3M.
  //   The damage multipliers are about twice what they were (Normal 2.04 -> 4.75, Hard 2.5 -> 5.0, Extreme 2.76 -> 7.2) and the three hits that must not rise with them are written down by the same factor,
  //   so they land as before: The Tide Comes In (its ceiling is set below), Counterweight's spread (about 75% of a light hero's health, so a pair of melee heroes standing close is never one-shot by it) and
  //   the opening beats (about 43% of one). What the multiplier does raise is the tank's swings, the Heavy Hand and the Drowned Things' bite: the healer's work, so a party that has lost a hero to a misread count is
  //   short of healing for the next one. (Raising the Tide itself is no way to tune: at its worst it is already 76 to 89% of a light hero's health.) (An act's opener after a Tide waits until OPEN_GAP s clear of it; that cost no clears.)
  //   Normal at GEAR=post5: HUMAN=dps 43 (90%), perfect bots 45 (94%); a human-like party kills at about 9:00 to 9:30, the enrage lands a minute after.
  //   (Normal and Extreme run the written order, whose Act I now ends on a Counterweight and not a Tide so the next opener's wait for the Tide leaves no stretch with nothing named; Hard's list, which its dances permute, is as it was.)
  //   Hard at post6: HUMAN=dps 22 (46%), perfect bots 41 (85%); kills at about 9:30, the enrage lands about 40 s after.
  //   Extreme at post7: HUMAN=dps 10 (21%), perfect bots 23 (48%). Every judgement had an answer from where the party stood when its bar began (f.ormLog).
  //   Other line-ups, Hard post6, perfect bots: bastion/cleric/shadowblade/ranger 34 (71%), with a driftblade 39 (81%), with a thresher 41 (85%), shadowblade + thresher 10 (21%). The last is short of its 40% by damage dealt,
  //   not by the Tide: two melee heroes do about 16% less here than the ranged pair (609 against 721 damage a second in the same fight), so 9 of every 24 of their pulls reach the enrage with the boss at 0 to 23%
  //   and no death needed, and every setting that holds the standard party's human-like pulls at 46% (more health, or more of the multiplier above) takes that line-up further down.
  hp: { normal: 7750000, hard: 8360000, extreme: 8755000 },
  normalDmg: 5.0, hardDmg: 6.0, extremeDmg: 9.0,
  autoDmg: { normal: 1500, hard: 1800, extreme: 2250 },
  enrage: { normal: 660, hard: 660, extreme: 660 },   // the cast starts here and lands 8 s later (11:08 on all three)
  enrageName: 'The Scale Falls',
  vuln: 0.5,
  spawn: { x: 0, y: -170 }, anchor: true,
  arena: { theme: 'scales' },
  gates: [{ f: 0.76, push: 1 }, { f: 0.5, wall: 1 }, { f: 0.22, push: 1 }],

  script(f) {
    const H = f.hard, X = f.extreme, B = f.boss, TAU = Math.PI * 2;
    const rd = Math.round, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hyp = (a, b) => Math.hypot(a, b);
    const dmg = {
      judge: H ? 22500 : 26000, hand: X ? 30500 : H ? 45750 : 52500, tide: X ? 1136 : H ? 1625 : 1748, cw: X ? 2304 : H ? 3125 : 3468, under: H ? 19500 : 22500,
      beat: X ? 1992 : H ? 2708 : 3059, bridge: H ? 12500 : 15000, bite: X ? 1150 : H ? 1150 : 1300, scatter: H ? 19000 : 22000,
    };
    const LIGHT = 0.4, LOCK = 0.5, BRIDGE_CAP = 2, REACH_R = 190, SPD = 230;
    // The Tide Comes In: dmg.tide is its hit with the pans level, and every point off level adds TIDE_PT of it, at most four points (so 2.2 times at the worst: levelling is what keeps it small). The base is chosen so that
    // the worst case, unmitigated (four points off level, no shield, no cooldown), is under what the lightest hero (a Lanternkeeper, 1187 health at post5 to post7 gear, 6% defence) can take: 76% of it on Normal,
    // 85% on Hard, 89% on Extreme; seen in play, at most 986 on a Cleric of 1198 on Hard. (A hero already carrying a stack of vulnerability from an avoidable hit takes a quarter more on Hard: that hero is not at full health.)
    const TIDE_PT = 0.3;
    // (Hard closes every calm between sets by a sixteenth, as Garrow does: the moves are the same, they come sooner)
    const S = (...steps) => { const st = steps.filter(Boolean); return H && st.length ? [[st[0][0] * 0.94, ...st[0].slice(1)], ...st.slice(1)] : st; };
    FIGHT.BOSS_R = REACH_R;   // (a colossus: the pans' inner rims are 144 from his middle)
    f.emit({ t: 'roomev', k: 'form', form: null, r: REACH_R, dur: 9999 });

    // --- the room ---------------------------------------------------------------------------------------------------------------
    const PAN = { L: { x: -380, y: 60, r: 300 }, R: { x: 380, y: 60, r: 300 } };
    const BR = { x0: -110, x1: 110, y0: 10, y1: 110 };
    const CRADLES = [[-216, -135], [-159, -67], [-131, 7], [216, -135], [159, -67], [131, 7]].map(([x, y], i) => ({ idx: i, pan: i < 3 ? 'L' : 'R', x, y, prop: null }));
    // where the solver stands a hero for a pan (a ring of spots 205 from the pan's middle on its inner side, clear of the cradles) and on the bridge
    const SPOTS = { L: [-44, -32, -20, -8, -56, 4].map(a => ({ x: rd(-380 + Math.cos(a * Math.PI / 180) * 205), y: rd(60 + Math.sin(a * Math.PI / 180) * 205) })) };
    SPOTS.R = SPOTS.L.map(s => ({ x: -s.x, y: s.y }));
    const BSPOTS = [{ x: -54, y: 60 }, { x: -18, y: 60 }, { x: 18, y: 60 }, { x: 54, y: 60 }];   // (down the middle of the span: the bots keep 45 from a wall)
    const panOf = (x, y) => {
      if (hyp(x - PAN.L.x, y - PAN.L.y) <= PAN.L.r) return 'L';
      if (hyp(x - PAN.R.x, y - PAN.R.y) <= PAN.R.r) return 'R';
      return x >= BR.x0 && x <= BR.x1 && y >= BR.y0 && y <= BR.y1 ? 'B' : 'B';   // (nowhere else is floor: the sea counts as the bridge, which weighs nothing)
    };
    const other = p => (p === 'L' ? 'R' : 'L');
    // a beat of a showpiece or a verdict: its own room event ('orm-<show>-<beat>') for the staging lane to hang the camera, the music and the room on
    const moment = (show, beat, o = {}) => f.emit(Object.assign({ t: 'roomev', k: 'orm-' + show + '-' + beat, show, beat, dur: 2 }, o));
    const live = id => f.alive().find(p => p.id === id);
    let bridgeOn = true, gap = null, act = 1, guardOff = 0;   // (guardOff: until then a throw of his own may carry a hero across; see the crossing guard in the ticker)

    // --- weights, cradles, carrying -----------------------------------------------------------------------------------------------
    const weights = [], carry = new Map(), dwell = new Map(), burden = new Map(), buoy = new Map();
    let wid = 0;
    const tide = { L: 0, R: 0 };
    for (const c of CRADLES) c.prop = f.addProp({ kind: 'ormcradle', shape: 'circle', x: c.x, y: c.y, r: 34, solid: false, cover: false, hp: 0, rubble: false, state: 0 });
    const restAt = idx => weights.find(w => w.idx === idx && !w.carrier) || null;
    const carryOf = pid => carry.get(pid) || null;
    const heroW = pid => { const b = buoy.get(pid); if (b && b.end > f.t) return b.v; const u = burden.get(pid); return u && u.end > f.t ? u.n : 1; };
    const EPS = 1e-6;
    const wv = w => (w.crack ? w.n / 2 : w.n);   // (what a weight counts: a cracked one, Hard's Hollow Weight, counts half)
    const water = { L: 0, R: 0 };   // (Extreme, The Tide Weighs Too: what the water on a pan adds)
    let waterEnd = 0, waterLow = null, waterSince = 0;
    const putProp = w => {
      const c = CRADLES[w.idx];
      w.pan = c.pan; w.x = c.x; w.y = c.y;
      w.prop = f.addProp({ kind: 'ormweight', shape: 'circle', x: c.x, y: c.y, r: 26, solid: false, cover: false, hp: w.crack ? 1 : 0, maxHp: w.crack ? 1 : 0, rubble: false, state: w.n });   // (hp 1: cracked)
      f.setPropState(c.prop, 1);
    };
    const takeProp = w => { if (w.prop) { f.removeProp(w.prop); w.prop = null; } if (w.idx >= 0) f.setPropState(CRADLES[w.idx].prop, 0); };
    const nearestEmpty = (x, y, pan) => {
      let best = null, bd = Infinity;
      for (const c of CRADLES) { if (restAt(c.idx) || (pan && c.pan !== pan)) continue; const d = hyp(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
      return best;
    };
    const addWeight = (n, idx, crack = false) => { const w = { id: ++wid, n, crack, idx, pan: CRADLES[idx].pan, x: 0, y: 0, carrier: null, prop: null, lock: null, from: -1 }; weights.push(w); putProp(w); return w; };
    const lift = (p, w) => {
      takeProp(w); w.carrier = p.id; w.from = w.idx; w.idx = -1; w.lock = p.id; carry.set(p.id, w);
      f.mark(p.id, { sym: 'num', n: w.n, col: w.crack ? '#9fb0c6' : '#e8f1fb', dur: 0, key: 'ormcarry' });
      f.emit({ t: 'roomev', k: 'ormweight', a: 'lift', id: w.id, n: w.n, x: rd(w.x), y: rd(w.y), pan: w.pan, cradle: w.from, who: p.id, dur: 1 });
    };
    const setDown = (pid, w, c) => {
      carry.delete(pid); f.unmark(pid, 'ormcarry');
      w.carrier = null; w.idx = c.idx; w.lock = pid; putProp(w);
      f.emit({ t: 'roomev', k: 'ormweight', a: 'set', id: w.id, n: w.n, x: c.x, y: c.y, pan: c.pan, cradle: c.idx, who: pid, dur: 1 });
    };
    const clearWeights = () => {
      for (const w of weights) { if (w.carrier != null) f.unmark(w.carrier, 'ormcarry'); takeProp(w); }
      weights.length = 0; carry.clear(); dwell.clear();
      for (const c of CRADLES) f.setPropState(c.prop, 0);
      f.emit({ t: 'roomev', k: 'ormweight', a: 'clear', dur: 1.2 });
    };
    // a Counterweight lands: it rests in the nearest empty cradle to where it fell
    const land = (n, x, y, hid, crack = false) => {
      const c = nearestEmpty(x, y);
      if (!c) return null;
      const w = addWeight(n, c.idx, crack);
      f.emit({ t: 'roomev', k: 'ormweight', a: 'land', id: w.id, n, crack: crack ? 1 : 0, x: c.x, y: c.y, pan: c.pan, cradle: c.idx, who: hid ?? null, dur: 1 });
      return w;
    };

    // --- what is on each pan -------------------------------------------------------------------------------------------------------
    const tally = (o = {}) => {
      const c = { L: tide.L + (o.dry ? 0 : water.L), R: tide.R + (o.dry ? 0 : water.R), B: 0 };
      for (const p of f.players()) {
        const pan = panOf(p.x, p.y);
        if (pan === 'B') { c.B++; continue; }
        c[pan] += (p.s.alive ? heroW(p.id) : 1) + (carry.get(p.id) ? wv(carry.get(p.id)) : 0);
      }
      for (const w of weights) if (!w.carrier) c[w.pan] += wv(w);
      for (const a of f.adds.values()) if (a.kind === 'drowned') { const pan = panOf(a.x, a.y); if (pan !== 'B') c[pan] += 1; }
      c.diff = Math.abs(c.R - c.L) < EPS ? 0 : c.R - c.L; c.heavy = c.diff > 0 ? 'R' : c.diff < 0 ? 'L' : null;
      return c;
    };
    // the rule of each judgement: what it would strike with the counts as given (L, R, and how many stand on the bridge)
    const RULES = { level: 'Let It Be Level', heavier: 'The Heavier Falls', lighter: 'The Lighter Rises', exact: 'Exact Measure' };
    const strikeOf = (rule, L, R, bn, ex) => {
      const diff = Math.abs(R - L) < EPS ? 0 : R - L, hv = diff > 0 ? 'R' : 'L', lt = diff > 0 ? 'L' : 'R', pans = [];
      let light = false;
      if (rule === 'exact') { const d = ex.lit === 'R' ? R - L : L - R; if (d > ex.n + EPS) pans.push(ex.lit); else if (d < ex.n - EPS) pans.push(other(ex.lit)); }
      else if (diff !== 0) pans.push(rule === 'lighter' ? lt : hv);
      else if (rule !== 'level') { pans.push('L', 'R'); light = true; }
      if (bn > BRIDGE_CAP) pans.push('B');
      return { pans, light };
    };

    // --- a strike that follows the count ---------------------------------------------------------------------------------------------
    // A judgement (or the flood) keeps ONE telegraph per place it can fall (the left pan, the right pan, the bridge) for the whole cast: all are laid (tg) when
    // the cast begins, parked off the floor, and from then on only moved on or off (tgmod: the shape is swapped for a speck far out in the sea), so the client
    // never sees a telegraph re-laid and the bots see one mechanic. The last LOCK seconds are fixed. regions(): [{ slot: 'L'|'R'|'B', shape, dmg }].
    const OFF = { kind: 'circle', x: 0, y: -4000, r: 1 };
    let live1 = null;
    const strike = o => {
      live1 = Object.assign({ slots: {}, group: new Set(), locked: false }, o);
      // (every place the strike can fall is laid now with the whole cast to run, off the floor until the count asks for it: a telegraph never appears with less than its full warning)
      const d = Math.max(0.3, o.end - f.t);
      for (const key of o.keys || ['L', 'R', 'B']) { const m = live1.slots[key] = f.aoe(Object.assign({}, OFF), d, 0, { tag: o.tag, group: live1.group, color: null }); m.sk = JSON.stringify(OFF); }
    };
    const setSlot = (L, key, r) => {
      let m = L.slots[key];
      if (!r && !m) return;
      if (!m) { m = L.slots[key] = f.aoe(r.shape, Math.max(0.3, L.end - f.t), r.dmg, { tag: L.tag, group: L.group, color: null }); m.sk = JSON.stringify(r.shape); return; }
      const want = r ? r.shape : OFF, sk = JSON.stringify(want);
      if (r) m.dmg = r.dmg;
      if (m.sk !== sk) { m.sk = sk; m.shape = Object.assign({}, want); f.emit({ t: 'tgmod', id: m.id, shape: want }); }
    };
    const strikeApply = (L, rg) => { for (const key of ['L', 'R', 'B']) setSlot(L, key, rg.find(r => r.slot === key) || null); };
    const strikeTick = () => {
      const L = live1;
      if (!L) return;
      if (f.t >= L.end + 0.1) { if (L.onEnd) L.onEnd(L); live1 = null; return; }
      if (L.locked) return;
      const rg = L.regions();
      strikeApply(L, rg);
      if (L.onChange) L.onChange(L, rg);
      if (f.t >= L.end - LOCK) { L.locked = true; if (L.onLock) L.onLock(L, rg); }
    };
    const PR = 280;   // (a strike's radius: it hits 14 past its edge, so 280 covers the whole pan, rim included, and stops short of the bridge's neutral ground, which starts at 300)
    const panShape = (pan, r2) => (r2 ? { kind: 'donut', x: PAN[pan].x, y: PAN[pan].y, r: PR, r2 } : { kind: 'circle', x: PAN[pan].x, y: PAN[pan].y, r: PR });
    const bridgeShape = { kind: 'rect', x: -82, y: 60, angle: 0, len: 164, w: 100 };

    // --- judgements ----------------------------------------------------------------------------------------------------------------
    let doom = null, tideEnd = 0;   // (tideEnd: when the Tide Comes In now casting reads the count; see agenda)
    // Spacing: two of his unavoidable party-wide hits (The Tide Comes In, an act's opening beat) never land within OPEN_GAP s of each other (the wall's opening beat, which seals him and leaves the party idle
    // while it waits, WIDE_GAP), so the healer can answer the first: the raidwides of a pull keep about 18 s apart, as in Garrow's `mix`. The
    // script's own rhythm keeps them far apart; what can bring them close is a health gate (a push or the wall), which falls wherever the party's damage puts it, even in the middle of a Tide.
    // Then the act that begins is slid later (slideCourse: every step it laid, its seams and its closing passes, as a Time Stop slides them) or, for the wall, begun later.
    const OPEN_GAP = 18, WIDE_GAP = 10;
    let wideLast = -99;   // (when the last Tide landed)
    const wideHold = (land, gap = OPEN_GAP) => Math.max(0, wideLast + gap - land);
    const slideCourse = dur => {
      const t = f.t, cur = f.curCourse;
      for (const e of f.events) if (e.step && e.t > t) e.t += dur;
      f.events.sort((a, b) => a.t - b.t);
      if (cur) { cur.seams = cur.seams.map(q => (q > t ? q + dur : q)); cur.end += dur; }
      f.pauseShift = (f.pauseShift || 0) + dur;
      f.broadcastNext(true);
    };
    const holdAct = cast => {   // (an act's opener: its beat lands cast s after its first step)
      const e0 = f.events.find(e => e.step && e.phase === f.phase && e.t >= f.t - 0.05);
      const w = e0 ? wideHold(e0.t + f.ct(cast)) : 0;
      if (w > 0.05) slideCourse(w);
    };
    // Exact Measure (Extreme): a pan is lit and a number named; the lit pan must be heavier by exactly that much. Whichever side is too heavy for it is struck.
    const pickExact = () => {
      let first = null;
      for (const lit of f.shuffle(['L', 'R'])) for (const n of f.shuffle([1, 2, 3])) {
        const ex = { lit, n }, pl = plan('exact', { exact: ex, probe: true });
        if (!first) first = ex;
        if (pl && pl.safe) return ex;
      }
      return first;
    };
    const judge = (rule, base = 6.5, after = null, o = {}) => {
      if (f.state !== 'live') return;
      const d = f.ct(base), name = RULES[rule], end = f.t + d, ex = rule === 'exact' ? o.exact || pickExact() : null;
      f.cast(name, d, 'weigh');
      f.emit({ t: 'roomev', k: 'ormjudge', rule, name, dur: +d.toFixed(2), lock: LOCK, exact: ex });
      doom = { rule, name, end, lockAt: end - LOCK, locked: false, regions: [], light: false, exact: ex };
      if (ex) {
        f.emit({ t: 'roomev', k: 'ormexact', pan: ex.lit, n: ex.n, dur: +(d + 1).toFixed(2) });
        for (const p of f.alive()) f.mark(p.id, { sym: 'num', n: ex.n, col: '#ffe08a', dur: d, key: 'ormexact' });
      }
      // (a log for the tools: was there an answer from where the party stood when the bar began, and did anyone take the hit)
      const pl0 = plan(rule, { probe: true, left: d - LOCK }), rec = { t: +f.t.toFixed(1), act, rule, answerable: !!(pl0 && pl0.safe), hit: 0 };
      if (!rec.answerable) { const c0 = tally(); rec.start = { L: c0.L, R: c0.R, B: c0.B, tide: tide.L + '/' + tide.R, adds: [...f.adds.values()].filter(q => q.kind === 'drowned').map(q => panOf(q.x, q.y)).join(''), who: f.alive().map(p => panOf(p.x, p.y) + heroW(p.id) + '@' + Math.round(p.x) + ',' + Math.round(p.y)).join(' '), left: d - LOCK, pl: pl0 && { bn: pl0.bn, score: pl0.score, heavy: pl0.heavy, light: pl0.light, late: pl0.late, counts: pl0.counts, assign: Object.values(pl0.assign).map(q => q.to + (q.lift ?? '')).join(' ') } }; }
      (f.ormLog = f.ormLog || []).push(rec);
      const regionsNow = () => {
        const c = tally(), s = strikeOf(rule, c.L, c.R, c.B, ex);
        doom.regions = s.pans; doom.light = s.light;
        return s.pans.map(p => ({ slot: p, shape: p === 'B' ? bridgeShape : panShape(p), dmg: p === 'B' ? dmg.bridge : dmg.judge * (s.light ? LIGHT : 1) }));
      };
      if (typeof process !== 'undefined' && process.env && process.env.ORM_TRACE) { rec.trace = []; for (let k = 8; k >= 0; k--) f.afterKeep(Math.max(0, d - 0.3 * k), () => rec.trace.push(+(f.t - end).toFixed(1) + ' ' + f.alive().map(p => panOf(p.x, p.y) + Math.round(p.x) + ',' + Math.round(p.y)).join(' '))); }
      strike({ end, tag: 'ormJudge', regions: regionsNow,
        onLock: () => {
          doom.locked = true;
          const c = tally();
          rec.lock = { L: c.L, R: c.R, B: c.B, pans: doom.regions.join(''), who: f.alive().map(p => panOf(p.x, p.y) + heroW(p.id)).join(' '), w: weights.map(w => w.n + w.pan + (w.carrier ? 'c' : '')).join(','), ex };
          f.emit({ t: 'roomev', k: 'ormlock', rule, pans: doom.regions.slice(), light: doom.light ? 1 : 0, dur: LOCK + 0.8 });
          // the verdict: the count is read (the beam stops dead) half a second before the strike that follows it
          f.emit({ t: 'roomev', k: 'ormread', rule, nL: c.L, nR: c.R, nB: c.B, pans: doom.regions.slice(), light: doom.light ? 1 : 0, level: c.diff === 0 ? 1 : 0, exact: ex, strikeIn: LOCK, dur: LOCK + 1 });
        },
        onEnd: () => {
          const struck = f.alive().filter(p => doom.regions.includes(panOf(p.x, p.y))), hit = struck.length > 0, level = tally().diff === 0;
          rec.hit = struck.length;
          rec.end = f.alive().map(p => panOf(p.x, p.y) + Math.round(p.x) + ',' + Math.round(p.y)).join(' ');
          for (const p of doom.regions) f.emit({ t: 'roomev', k: 'ormfall', pan: p, light: doom.light ? 1 : 0, rule, dur: 1.4 });
          // answered perfectly level, and nobody struck: the room answers (the beam swings hard, the pans lurch)
          if (!hit && level && rule !== 'exact') moment('perfect', 'swing', { rule, dur: 2.4 });
          if (!hit && rule === 'exact') moment('perfect', 'swing', { rule, dur: 2.4 });
          f.anim('settle', 1.2); const cb = after; doom = null; emitScales(true);
          if (cb) cb(!hit);
        } });
    };
    // Undertow: the low pan's rim floods inward, wider the lower it sits (nothing when the pans are level). Twin Undertow (Hard): both rims flood; the low pan as wide
    // as ever and the other a thin 70, and both 90 when the pans are level.
    const undertow = (twin = false) => {
      const d = f.ct(5.2), end = f.t + d;
      f.cast(twin ? 'Twin Undertow' : 'Undertow', d, 'under');
      let lastKey = '';
      doom = { rule: 'under', name: twin ? 'Twin Undertow' : 'Undertow', end, lockAt: end - LOCK, locked: false, regions: [], light: false, exact: null };
      strike({ end, tag: twin ? 'ormTwin' : 'ormUnder', keys: ['L', 'R'],
        regions: () => {
          const c = tally(), out = [];
          doom.regions = [];
          if (!c.diff && !twin) return out;
          const w = clamp(70 + 40 * Math.abs(c.diff), 70, 230);
          for (const pan of ['L', 'R']) {
            const width = !c.diff ? 90 : pan === c.heavy ? w : 70;
            if (!twin && pan !== c.heavy) continue;
            out.push({ slot: pan, shape: panShape(pan, PR - width), dmg: dmg.under, w: width, pan });
            doom.regions.push(pan);
          }
          return out;
        },
        onChange: (L, rg) => { const k = rg.map(r => r.pan + r.w).join('|'); if (k !== lastKey) { lastKey = k; f.emit({ t: 'roomev', k: 'ormundertow', pan: rg[0] ? rg[0].pan : null, w: rg[0] ? rg[0].w : 0, pans: rg.map(r => [r.pan, r.w]), twin: twin ? 1 : 0, dur: +(end - f.t + 1).toFixed(2), lock: LOCK }); } },
        onEnd: () => { doom = null; emitScales(true); } });
    };

    // --- the rest of his kit -------------------------------------------------------------------------------------------------------
    const addBurden = (pid, n, dur = 20) => { burden.set(pid, { n, end: f.t + dur }); f.mark(pid, { sym: 'num', n, col: '#ffb066', dur, key: 'ormburden' }); };
    // Heavy Hand: the tank's buster, and the weight it leaves (the tank's side is a decision)
    const heavyHand = (n = 2) => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4);
      f.cast('Heavy Hand', d, 'hand');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 420, arc: 1.1, angle: B.facing }, delay: d, dmg: dmg.hand, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
      f.afterKeep(d + 0.05, () => { if (f.state === 'live' && live(tank.id)) addBurden(tank.id, n); });
    };
    // The Tide Comes In: the healer's raidwide, harder the further from level the pans are when it lands
    const tideIn = () => {
      const d = f.ct(4.4);
      tideEnd = f.t + d; wideLast = tideEnd;
      f.cast('The Tide Comes In', d, 'tide');
      f.emit({ t: 'roomev', k: 'ormtidein', dur: +(d + 1.2).toFixed(2), n: Math.abs(tally().diff) });
      const m = f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.tide, hidden: true, tag: 'ormTide' });
      f.afterKeep(d - 0.05, () => { const c = tally(); m.dmg = dmg.tide * (1 + TIDE_PT * Math.min(4, Math.abs(c.diff))); });
    };
    // Counterweight: a weight falls on a marked hero (a spread circle) and rests in the nearest empty cradle. n: its number ('auto' picks one that leaves the next judgement
    // (o.rule) answerable, and, failing that, picks another marked hero: the weight is only ever dropped where the next judgement still has an answer); o.who: the hero.
    // Hollow Weight (Hard, o.crack): the weight is cracked and counts half.
    const chooseDrop = o => {
      const pool = f.nonTanks().length ? f.nonTanks() : f.alive(), allowed = o.allowed || [1, 2, 3];
      const heroes = o.who ? [live(o.who)].filter(Boolean) : f.shuffle(pool).slice(0, 3);
      let best = null;
      for (const p of heroes) {
        const pan = panOf(p.x, p.y);
        for (const n of f.shuffle(allowed)) {
          const v = o.crack ? n / 2 : n, pl = o.rule ? plan(o.rule, { tip: o.tip, extra: [{ n: v, pan: pan === 'B' ? 'L' : pan }], probe: true }) : null;
          const c = { p, n, safe: !o.rule || !!(pl && pl.safe), dec: pl ? Object.values(pl.assign).filter(a => a.lift != null).length : 0 };
          // (one that needs a decision is better than one that needs none; one that cannot be answered is never picked while another can)
          if (!best || (c.safe && !best.safe) || (c.safe === best.safe && c.dec > best.dec)) best = c;
        }
      }
      return best;
    };
    const counterweight = (o = {}) => {
      if (weights.length >= 5) return;
      const ch = chooseDrop(o);
      if (!ch) return;
      const p = ch.p, n = o.n != null && o.n !== 'auto' ? o.n : ch.n, d = f.ct(4.6), crack = !!o.crack;
      f.cast(crack ? 'Hollow Weight' : 'Counterweight', d, 'drop');
      f.mark(p.id, { sym: 'num', n, col: crack ? '#9fb0c6' : '#cfe6ff', dur: d, key: 'ormfall' });
      f.emit({ t: 'roomev', k: 'ormdrop', n, hx: rd(p.x), hy: rd(p.y), who: p.id, crack: crack ? 1 : 0, dur: +d.toFixed(2) });
      f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: d, dmg: dmg.cw, follow: p.id, tag: crack ? 'ormHollow' : 'ormCW', onResolve: () => f.unmark(p.id, 'ormfall') });
      // (the weight comes to rest where the hero stood as it fell)
      f.afterKeep(d - 0.02, () => { const q = live(p.id); const at = q ? { x: q.x, y: q.y } : { x: p.x, y: p.y }; land(n, at.x, at.y, p.id, crack); });
    };
    // Scatter the Silver (Hard): he strikes a cradle and the weight on it breaks into ones that roll to the nearest empty cradles, on either pan. A weight in a hero's hands is spared.
    const scatter = () => {
      const free = CRADLES.filter(c => !restAt(c.idx)).length;
      const cand = weights.filter(w => !w.carrier && w.idx >= 0 && w.n >= 2 && w.n - 1 <= free);
      if (!cand.length) return counterweight({ allowed: [2, 3] });
      const w = f.shuffle(cand)[0], c = CRADLES[w.idx], d = f.ct(4.2);
      f.cast('Scatter the Silver', d, 'hand');
      f.emit({ t: 'roomev', k: 'ormscatter', a: 'strike', id: w.id, n: w.n, cradle: w.idx, x: c.x, y: c.y, dur: +d.toFixed(2) });
      f.aoe({ kind: 'circle', x: c.x, y: c.y, r: 110 }, d, dmg.scatter, { tag: 'ormScatter' });
      f.afterKeep(d, () => {
        if (f.state !== 'live' || w.carrier || w.idx < 0 || !weights.includes(w)) return;
        takeProp(w); weights.splice(weights.indexOf(w), 1);
        const dests = [];
        for (let i = 0; i < w.n; i++) {
          // (the first piece rolls to the nearest empty cradle; the next ones to the nearest still empty, on either pan)
          let best = null, bd = Infinity;
          for (const q of CRADLES) { if (restAt(q.idx) || dests.includes(q.idx)) continue; const dd = hyp(q.x - c.x, q.y - c.y); if (dd < bd) { bd = dd; best = q; } }
          if (best) dests.push(best.idx);
        }
        f.emit({ t: 'roomev', k: 'ormscatter', a: 'break', id: w.id, n: w.n, cradle: w.idx, x: c.x, y: c.y, to: dests, dur: 1.6 });
        f.afterKeep(0.9, () => { if (f.state === 'live') for (const idx of dests) if (!restAt(idx)) { const nw = addWeight(1, idx); f.emit({ t: 'roomev', k: 'ormweight', a: 'land', id: nw.id, n: 1, x: nw.x, y: nw.y, pan: nw.pan, cradle: idx, who: null, dur: 1 }); } });
      });
    };
    // Burden: one hero weighs 2 and one weighs nothing, for 20 s (never the tank, who has the Hand). Three Burdens (Hard): two weigh 2 and one weighs nothing.
    // Buoyed (Extreme): one hero weighs minus one for 24 s, and lifts their pan.
    const burdens = (three = false, dur = 20) => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive());
      if (pool.length < 2) return;
      const d = f.ct(3.2);
      f.cast(three ? 'Three Burdens' : 'Burden', d, 'drop');
      const heavy = pool.slice(0, three && pool.length >= 3 ? 2 : 1), b = pool[heavy.length];
      for (const a of heavy) f.mark(a.id, { sym: 'num', n: 2, col: '#ffb066', dur: d, key: 'ormburden' });
      f.mark(b.id, { sym: 'seed', col: '#9fe0ff', dur: d, key: 'ormbuoy' });
      f.afterKeep(d, () => { if (f.state !== 'live') return; for (const a of heavy) addBurden(a.id, 2, dur); buoy.set(b.id, { end: f.t + dur, v: 0 }); f.mark(b.id, { sym: 'seed', col: '#9fe0ff', dur, key: 'ormbuoy' }); });
    };
    const buoyed = () => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive());
      if (!pool.length) return;
      const d = f.ct(3.2), b = pool[0];
      f.cast('Buoyed', d, 'drop');
      f.mark(b.id, { sym: 'seed', col: '#d6f4ff', dur: d, key: 'ormbuoyed' });
      f.afterKeep(d, () => { if (f.state !== 'live') return; buoy.set(b.id, { end: f.t + 24, v: -1 }); f.mark(b.id, { sym: 'seed', col: '#d6f4ff', dur: 24, key: 'ormbuoyed' }); });
    };
    // The Tide Weighs Too (Extreme): for 24 s the water on the low pan adds 1 for every 3 s it has stood there, up to 4; level, or a new low pan, begins it again.
    const tideWeighs = () => {
      const d = f.ct(3.4);
      f.cast('The Tide Weighs Too', d, 'tide');
      f.emit({ t: 'roomev', k: 'ormwater', a: 'begin', dur: +(d + 1).toFixed(2) });
      f.afterKeep(d, () => { if (f.state !== 'live') return; waterEnd = f.t + 24; waterLow = null; f.emit({ t: 'roomev', k: 'ormwater', a: 'on', dur: 24 }); });
    };

    // The Bridge Breaks (Act IV's opener): no crossing, no neutral ground
    const bridgeBreaks = () => {
      const d = f.ct(4);
      f.cast('The Bridge Breaks', d, 'break');
      f.emit({ t: 'roomev', k: 'ormact', act: 5, name: 'The Bridge Breaks', dur: +(d + 1.4).toFixed(2) });
      f.emit({ t: 'roomev', k: 'form', form: null, r: REACH_R, dur: 9999 });
      clearWeights();
      f.aoe(bridgeShape, d, dmg.bridge, { tag: 'ormBreak' });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.beat, hidden: true, tag: 'ormBeat' });
      // a showpiece: the span groans (build-up), the last stretch of the cast is held (nothing else on the floor), then it falls
      moment('bridge', 'buildup', { x: 0, y: 60, dur: +(d - 1.3).toFixed(2) });
      f.afterKeep(d - 1.3, () => { if (f.state === 'live') moment('bridge', 'hold', { x: 0, y: 60, dur: 1.3 }); });
      f.afterKeep(d - 0.1, () => {
        if (f.state !== 'live') return;
        moment('bridge', 'release', { x: 0, y: 60, dur: 2.4 });
        bridgeOn = false;
        // (the span falls: anyone left on it is dropped on their own side, and if that leaves one pan with two more people than the other, the surplus is
        // flung across, so Act IV never opens with a pan nobody can answer for)
        const side = p => { const q = panOf(p.x, p.y); return q === 'B' ? (p.x < 0 ? 'L' : 'R') : q; }, cnt = { L: 0, R: 0 }, moved = new Set();
        for (const p of f.alive()) { cnt[side(p)]++; if (panOf(p.x, p.y) === 'B') f.knock(p, 0, p.y, 130, { slam: null, rescue: true }); }
        while (Math.abs(cnt.L - cnt.R) >= 2) {
          const big = cnt.L > cnt.R ? 'L' : 'R', c = f.alive().filter(p => side(p) === big && !moved.has(p.id)).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
          if (!c) break;
          moved.add(c.id); cnt[big]--; cnt[other(big)]++;
          f.knock(c, 2 * c.x + c.x, c.y, Math.abs(2 * c.x), { slam: null, rescue: true });
        }
        guardOff = f.t + 1.5;
        ARENA.parts = ARENA.parts.filter(q => q.kind === 'circle');   // (the host's floor loses the span as every client's does: orscales bridge false)
        f.emit({ t: 'roomev', k: 'ormbridge', a: 'break', dur: 2 });
        f.edgeGrace = f.t + 2;
        f.afterKeep(0.6, () => { moment('bridge', 'end', { dur: 1.6 }); if (f.state === 'live' && !gap) gap = f.addProp({ kind: 'ormgap', shape: 'rect', x: 0, y: 60, w: 168, h: 100, a: 0, solid: true, cover: false, hp: 0, rubble: false }); emitScales(true); });
      });
    };
    // Tip the Scale: everyone alive on the heavier pan (the tank's pan when they are level) is thrown to the other, with whatever they carry.
    let tipAt = 0, tips = 0;
    const tipScale = () => {
      const d = f.ct(4.5), first = !tips++;
      f.cast('Tip the Scale', d, 'tip');
      tipAt = f.t + d;
      // (the first Tip is a showpiece: the beam creaks, a held beat, then both pans swing)
      if (first) { moment('tip', 'buildup', { dur: +(d - 1.2).toFixed(2) }); f.afterKeep(d - 1.2, () => { if (f.state === 'live') moment('tip', 'hold', { dur: 1.2 }); }); }
      for (const p of ['L', 'R']) f.mech({ type: 'drop', shape: panShape(p), delay: d, dmg: 0, color: '#7ab8ff', avoidable: false, tag: 'ormTip', onResolve: p === 'L' ? () => doTip() : null });
    };
    const doTip = () => {
      if (f.state !== 'live') return;
      tipAt = 0; guardOff = f.t + 1.5;
      f.emit({ t: 'roomev', k: 'ormtip', a: 'tip', dur: 1.6 });
      moment('tip', 'release', { dur: 2 });
      if (gap) { f.removeProp(gap); gap = null; }
      const ct = tally(), tk = f.tank(), tp = ct.heavy || (tk ? panOf(tk.x, tk.y) : 'L');   // (the heavier pan's people: the tank's pan when level)
      for (const p of f.alive()) {
        const pan = panOf(p.x, p.y); if (pan === 'B' || pan !== tp) continue;
        const to = { x: -p.x, y: p.y }, dist = Math.abs(to.x - p.x);
        f.knock(p, 2 * p.x - to.x, 2 * p.y - to.y, dist, { slam: null, rescue: true });   // (rescue: not even an Ultimate's lock holds a hero back from the throw)
      }
      f.afterKeep(0.8, () => { if (f.state === 'live' && !bridgeOn && !gap) gap = f.addProp({ kind: 'ormgap', shape: 'rect', x: 0, y: 60, w: 168, h: 100, a: 0, solid: true, cover: false, hp: 0, rubble: false }); });
    };

    // --- the Tide (the wall) -------------------------------------------------------------------------------------------------------
    // Drowned Things climb out onto a pan: each weighs 1 while it lives
    // (a wave is split across the pans so that the Level that follows still has an answer from where the party stands)
    const waveSplit = n => {
      const opts = f.shuffle([...Array(n + 1).keys()]);
      for (const a of opts) { const pl = plan('level', { probe: true, addsExtra: { L: a, R: n - a }, left: 8 }); if (pl && pl.safe) return a; }
      return opts[0];
    };
    const wave = n => { const a = waveSplit(n); drowned('L', a); drowned('R', n - a); };
    const drowned = (pan, n) => {
      for (let i = 0; i < n; i++) {
        const c = CRADLES[(pan === 'L' ? 0 : 3) + (i % 3)], a = f.rng() * TAU, r = 60 + f.rng() * 40;
        const pos = ARENA.clamp({ x: c.x - Math.sign(c.x) * 70 + Math.cos(a) * r, y: c.y + 30 + Math.sin(a) * r }, 40);
        const th = f.spawnAdd({ kind: 'drowned', x: pos.x, y: pos.y, hp: 15000, r: 26, speed: 60, bite: dmg.bite, biteEvery: 2.4, leash: 90,
          onTick: a2 => { const q = panOf(a2.x, a2.y); if (q === 'B') { const pn = a2.homeX < 0 ? 'L' : 'R', cp = PAN[pn]; const dd = hyp(a2.x - cp.x, a2.y - cp.y) || 1; a2.x = cp.x + (a2.x - cp.x) / dd * 270; a2.y = cp.y + (a2.y - cp.y) / dd * 270; } } });
        f.emit({ t: 'propfx', k: 'ormrise', x: rd(th.x), y: rd(th.y), pan });
      }
    };
    // Spring Tide is a showpiece: the build-up (his cast), a held beat with nothing on the floor, the Tide arriving, the serpent passing under one pan
    // and then the other, and a wall that breaks on the party's third correct count (no timer: a wrong count is only another round, up to four).
    const springTide = () => {
      // (the wall goes up the moment the party's damage reaches its gate, which may be while a Tide is still to land: the boss stands sealed until the beat that opens it is WIDE_GAP s clear of the Tide)
      const w = wideHold(f.t + f.ct(3.6), WIDE_GAP);
      if (w > 0.05) { f.afterKeep(w, () => { if (f.state === 'live') springTideGo(); }); return; }
      springTideGo();
    };
    const springTideGo = () => {
      clearWeights(); tide.L = tide.R = 0;
      const d0 = f.ct(3.6);
      let correct = 0, done = false;
      f.cast('Spring Tide', d0, 'wall');
      f.emit({ t: 'roomev', k: 'ormact', act: 3, name: 'Spring Tide', dur: +(d0 + 1.4).toFixed(2) });
      f.emit({ t: 'roomev', k: 'form', form: null, r: REACH_R, dur: 9999 });
      moment('springtide', 'buildup', { dur: +d0.toFixed(2) });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d0, dmg: dmg.beat, hidden: true, tag: 'ormBeat' });
      const named = (t, fn, name) => f.atKeep(f.t + t, () => { if (f.state === 'live' && !done) fn(); }, name);   // (laid up front and named, so the upcoming-moves feed reads through the wall)
      const bell = () => f.emit({ t: 'roomev', k: 'ormbell', n: Math.abs(tally().diff), pan: tally().heavy, dur: 1.6 });
      const HOLD = 1.8, come = d0 + 0.1 + HOLD, JD = f.ct(6.5), ROUND = 3 + JD + 1.4, first = come + 2.5;
      named(d0 + 0.1, () => moment('springtide', 'hold', { dur: HOLD }));   // (no cast, no telegraph, no thing on the floor)
      named(come, () => { f.cast('The Tide Arrives', 2.4, 'tide'); f.emit({ t: 'roomev', k: 'ormtide', a: 'come', dur: 3 }); moment('springtide', 'release', { dur: 2.4 }); }, 'The Tide Arrives');
      const ph = [];   // (what the next act will lay, shown in the feed until the wall is down)
      const place = (t, name) => { const fn = () => {}; ph.push(fn); f.atKeep(f.t + t, fn, name); };
      const finish = () => {
        if (done) return;
        done = true;
        tide.L = tide.R = 0;
        moment('springtide', 'break', { dur: 2.6 });
        f.emit({ t: 'roomev', k: 'ormtide', a: 'leave', dur: 2.4 });
        for (const a of [...f.adds.values()]) if (a.kind === 'drowned') f.killAdd(a);
        f.afterKeep(1.4, () => { moment('springtide', 'end', { dur: 1.6 }); f.events = f.events.filter(e => !ph.includes(e.fn)); if (f.state === 'live') f.wallDown(); });
      };
      // a round: the tide passes under one pan (or leaves), a wave of Drowned Things climbs out, and 3 s later a Level is read
      const roundStart = k => {
        const tp = k % 3;
        tide.L = tp === 1 ? 3 : 0; tide.R = tp === 0 ? 3 : 0;
        if (tp === 2) f.emit({ t: 'roomev', k: 'ormtide', a: 'leave', dur: 2.4 });
        else { f.emit({ t: 'roomev', k: 'ormtide', a: 'under', pan: tp === 0 ? 'L' : 'R', add: 3, dur: 10 }); moment('springtide', k ? 'stage' : 'climax', { pan: tp === 0 ? 'L' : 'R', round: k, dur: 2.4 }); }
        wave(k < 2 ? 3 : 2);
      };
      const roundJudge = k => { bell(); judge('level', 6.5, clean => { if (clean) correct++; if (correct >= 3 || k >= 3) finish(); }); };
      // (all four rounds are laid now; the wall is down after the third correct count, or after the fourth round)
      for (let k = 0; k < 4; k++) { named(first + k * ROUND, () => roundStart(k)); named(first + k * ROUND + 3, () => roundJudge(k), 'Let It Be Level'); }
      const endAt = first + 3 * ROUND + 3 + JD + 1.5;
      place(endAt - 1, 'The Tide Leaves');
      place(endAt + 3.5, 'The Weight of Things');
      place(endAt + 10.5, 'Burden');
    };

    // --- the tally goes out to the clients, and weights are lifted and set down -----------------------------------------------------
    let lastKey = '', lastEmit = -9;
    const emitScales = force => {
      const c = tally(), tilt = clamp((c.R - c.L) / 4, -1, 1);
      const gl = { L: 0, R: 0 }, sk = { L: 0, R: 0, B: 0 };
      if (doom) for (const p of doom.regions) { if (p !== 'B') gl[p] = 1; sk[p] = doom.light ? 2 : 1; }
      const ex = doom && doom.exact ? doom.exact : null;
      const cr = [...carry].map(([pid, w]) => (w.crack ? [pid, w.n, 1] : [pid, w.n]));
      const key = [c.L, c.R, c.B, sk.L, sk.R, sk.B, doom && doom.locked ? 1 : 0, ex ? ex.lit + ex.n : '', water.L, water.R, bridgeOn ? 1 : 0, cr.join(';')].join('|');
      if (!force && key === lastKey && f.t - lastEmit < 2) return;
      lastKey = key; lastEmit = f.t;
      f.emit({ t: 'roomev', k: 'orscales', tilt: +tilt.toFixed(2), nL: c.L, nR: c.R, nB: c.B, glowL: gl.L, glowR: gl.R, strikeL: sk.L, strikeR: sk.R, strikeB: sk.B, locked: doom && doom.locked ? 1 : 0,
        exact: ex ? { pan: ex.lit, n: ex.n } : null, waterL: water.L, waterR: water.R, carry: cr, bridge: bridgeOn, cradles: CRADLES.map(q => [q.x, q.y]), dur: 9999 });
    };
    const LIFT_R = 30, LIFT_T = 0.6, guardAt = new Map();
    let crossBacks = 0;
    f.ticker(dt => {
      // (burdens and buoys run out)
      for (const [k, v] of burden) if (v.end <= f.t) burden.delete(k);
      for (const [k, v] of buoy) if (v.end <= f.t) buoy.delete(k);
      // (The Tide Weighs Too: the water on the low pan rises a point every 3 s it has stood there, and starts again if the low pan changes or the pans are level)
      if (waterEnd > f.t) {
        const low = tally({ dry: true }).heavy;
        if (low !== waterLow) { waterLow = low; waterSince = f.t; water.L = water.R = 0; }
        else if (low) water[low] = Math.min(4, Math.floor((f.t - waterSince) / 3));
      } else if (water.L || water.R) { water.L = water.R = 0; waterLow = null; }
      for (const [pid, w] of [...carry]) {
        if (!live(pid)) { const c = nearestEmpty(w.x, w.y) || nearestEmpty(0, 0); f.unmark(pid, 'ormcarry'); carry.delete(pid); w.carrier = null; if (c) { w.idx = c.idx; putProp(w); } else weights.splice(weights.indexOf(w), 1); }
      }
      for (const p of f.alive()) {
        const cw = carry.get(p.id);
        if (!cw) {
          for (const w of weights) {
            if (w.carrier) continue;
            const d = hyp(p.x - w.x, p.y - w.y), key = p.id + ':' + w.id;
            if (w.lock === p.id) { if (d > 56) w.lock = null; continue; }
            if (d <= LIFT_R) { const a = (dwell.get(key) || 0) + dt; if (a >= LIFT_T) { dwell.delete(key); lift(p, w); break; } dwell.set(key, a); } else dwell.delete(key);
          }
        } else {
          for (const c of CRADLES) {
            if (restAt(c.idx)) continue;
            const d = hyp(p.x - c.x, p.y - c.y), key = p.id + ':c' + c.idx;
            if (cw.from === c.idx && cw.lock === p.id) { if (d > 56) cw.lock = null; continue; }
            if (d <= LIFT_R) { const a = (dwell.get(key) || 0) + dt; if (a >= LIFT_T) { dwell.delete(key); setDown(p.id, cw, c); break; } dwell.set(key, a); } else dwell.delete(key);
          }
        }
      }
      // The crossing guard: with the span down nothing carries a hero across the gap but his own Tip. A dash, a blink, a pull or a throw that lands someone on the
      // other pan is undone at once (they are thrown back to where they last stood), so the rule holds on the host whatever a class can do.
      if (!bridgeOn) {
        for (const p of f.alive()) {
          const pan = panOf(p.x, p.y), last = guardAt.get(p.id);
          if (last && last.hold > f.t) continue;   // (a throw back is still on its way)
          if (f.t < guardOff || !last || pan === 'B' || last.pan === 'B' || pan === last.pan) { guardAt.set(p.id, { pan, x: p.x, y: p.y }); continue; }
          if (gap) { f.removeProp(gap); gap = null; f.afterKeep(0.8, () => { if (f.state === 'live' && !bridgeOn && !gap) gap = f.addProp({ kind: 'ormgap', shape: 'rect', x: 0, y: 60, w: 168, h: 100, a: 0, solid: true, cover: false, hp: 0, rubble: false }); }); }
          f.emit({ t: 'roomev', k: 'ormcross', who: p.id, dur: 1 });
          f.knock(p, 2 * p.x - last.x, 2 * p.y - last.y, hyp(p.x - last.x, p.y - last.y), { slam: null, rescue: true });
          guardAt.set(p.id, { pan: last.pan, x: last.x, y: last.y, hold: f.t + 0.7 });
          crossBacks++;
        }
      }
      strikeTick();
      emitScales(false);
    });

    // --- the solver ---------------------------------------------------------------------------------------------------------------
    // The cheapest way for the living to stand (and carry) so that none of them is struck by `rule` when its bar ends. It reads the room as it
    // is now (weights at rest, what is carried, drowned things, the tide, the fallen), and the bridge when it stands. o: { tip: the pans trade
    // their people first (Act IV), extra: [{ n, pan }] weights that will have landed }.
    const walk = (from, to) => {
      const pf = panOf(from.x, from.y), pt = panOf(to.x, to.y);
      if (pf !== 'B' && pt !== 'B' && pf !== pt) { const s = pf === 'L' ? -1 : 1; return (hyp(from.x - s * 75, from.y - 60) + 150 + hyp(to.x + s * 75, to.y - 60)) / SPD; }
      return hyp(from.x - to.x, from.y - to.y) / SPD;
    };
    let planCache = null, commit = null;
    const plan = (rule, o = {}) => {
      const al = f.alive();
      if (!al.length) return null;
      const ex = o.exact || (doom && doom.exact) || null;
      const sig = [rule, o.addsExtra ? o.addsExtra.L + ':' + o.addsExtra.R : '', ex ? ex.lit + ex.n : '', water.L, water.R, !!o.tip, bridgeOn, tide.L, tide.R, (o.extra || []).map(e => e.n + e.pan).join(','), weights.map(w => w.id + ':' + w.idx + ':' + (w.carrier ?? '')).join(','),
        al.map(p => p.id + ':' + panOf(p.x, p.y) + ':' + heroW(p.id) + ':' + Math.round(p.x / 40) + ',' + Math.round(p.y / 40)).join(','), [...f.adds.values()].filter(a => a.kind === 'drowned').map(a => a.id + panOf(a.x, a.y)).join(',')].join('/');
      if (!o.probe && planCache && planCache.sig === sig && f.t - planCache.t < 0.5) return planCache.res;
      const heroes = al.map(p => ({ id: p.id, x: p.x, y: p.y, pan: panOf(p.x, p.y), w: heroW(p.id), carry: carry.get(p.id) || null }));
      const base = { L: tide.L + water.L, R: tide.R + water.R, B: 0 };
      for (const p of f.players()) if (!p.s.alive) base[panOf(p.x, p.y) === 'B' ? 'B' : panOf(p.x, p.y)] += panOf(p.x, p.y) === 'B' ? 1 : 1;
      // (a drowned thing that is more than half cut down is counted as gone: it will be by the time the bar ends)
      for (const a of f.adds.values()) if (a.kind === 'drowned') { const q = panOf(a.x, a.y); if (q !== 'B' && a.hp / a.maxHp >= 0.45) base[q] += 1; }
      if (o.addsExtra) { base.L += o.addsExtra.L; base.R += o.addsExtra.R; }
      for (const h of heroes) if (h.carry) h.cn = wv(h.carry);
      const rest = weights.filter(w => !w.carrier).map(w => ({ id: w.id, n: wv(w), pan: w.pan, x: w.x, y: w.y }));
      for (const e of o.extra || []) { const c = nearestEmpty(PAN[e.pan].x + Math.sign(PAN[e.pan].x) * -250, -60, e.pan); if (c) rest.push({ id: -1 - rest.length, n: e.n, pan: e.pan, x: c.x, y: c.y }); }
      // where each hero may end: free on both pans and the bridge while the span stands; with it down, their own pan (the other after a Tip)
      const cT = { L: base.L, R: base.R };
      for (const h of heroes) if (h.pan !== 'B') cT[h.pan] += h.w + (h.cn || 0);
      for (const w of rest) cT[w.pan] += w.n;
      const tk = heroes.find(h => f.tank() && h.id === f.tank().id), TP = cT.R > cT.L ? 'R' : cT.L > cT.R ? 'L' : (tk && tk.pan !== 'B' ? tk.pan : 'L');   // (the pan a Tip throws: the heavier one, or the tank's when level)
      const options = h => {
        if (o.tip && bridgeOn === false) return [h.pan === TP ? other(TP) : h.pan];
        if (!bridgeOn) return [h.pan === 'B' ? 'L' : h.pan];
        return ['L', 'R', 'B'];
      };
      const spotUsed = new Set();
      const spotFor = (h, to) => {
        if (to === h.pan && !h.lifting) return { x: h.x, y: h.y };
        const list = to === 'B' ? BSPOTS : SPOTS[to];
        let best = null, bd = Infinity;
        for (let i = 0; i < list.length; i++) { const k = to + i; if (spotUsed.has(k)) continue; const d = hyp(list[i].x - h.x, list[i].y - h.y); if (d < bd) { bd = d; best = { x: list[i].x, y: list[i].y, k }; } }
        return best || list[0];
      };
      const budget = o.left != null ? o.left - 0.8 : Infinity;   // (seconds a hero has to be where they are going: a walk that takes longer is no answer)
      let best = null;
      const cur = new Array(heroes.length);
      const evalAll = () => {
        const used = new Set(), c = { L: base.L, R: base.R }; let bn = base.B;
        for (const a of cur) if (a.lift != null) used.add(a.lift);
        for (const w of rest) if (!used.has(w.id)) c[w.pan] += w.n;
        for (let i = 0; i < heroes.length; i++) {
          const h = heroes[i], a = cur[i], wn = a.lift != null ? rest.find(w => w.id === a.lift).n : h.cn || 0;
          if (a.to === 'B') bn++; else c[a.to] += h.w + wn;
        }
        const tideR = rule === 'tide', s = tideR ? { pans: bn > BRIDGE_CAP ? ['B'] : [], light: false } : strikeOf(rule, c.L, c.R, bn, ex);
        let heavy = 0, light = 0;
        for (const a of cur) { if (!s.pans.includes(a.to)) continue; if (s.light) light++; else heavy++; }
        let cost = heavy * 1000 + light * 250, late = 0;
        const off = tideR ? Math.abs(c.R - c.L) : 0;   // (The Tide Comes In: nothing is struck, the count is what it reads: each point from level costs the same as a hero struck)
        cost += off * 1000;
        spotUsed.clear();
        const out = {};
        for (let i = 0; i < heroes.length; i++) {
          const h = heroes[i], a = cur[i];
          let t = 0, spot, cradle = null;
          h.lifting = a.lift != null;
          if (a.lift != null) { const w = rest.find(x => x.id === a.lift); cradle = { x: w.x, y: w.y }; spot = spotFor(h, a.to); t = walk(h, cradle) + LIFT_T + (a.to === w.pan && panOf(h.x, h.y) !== 'B' ? 0 : walk(cradle, spot)) + 0.3; if (a.to === w.pan) spot = { x: w.x, y: w.y }; }
          else { spot = spotFor(h, a.to); t = to0(h, a.to) ? 0 : walk(h, spot); }
          if (spot.k) spotUsed.add(spot.k);
          cost += t;
          if (t > budget) { cost += 400; late++; }
          out[h.id] = { to: a.to, lift: a.lift, spot: { x: spot.x, y: spot.y }, cradle };
        }
        if (!best || cost < best.score) best = { score: cost, safe: heavy + light + late === 0 && off < EPS, heavy, light, late, assign: out, rule, bn, counts: { L: c.L, R: c.R } };
      };
      const to0 = (h, to) => (to === h.pan);
      const rec = i => {
        if (i === heroes.length) { evalAll(); return; }
        const h = heroes[i], opts = options(h);
        for (const to of opts) {
          cur[i] = { to, lift: null }; rec(i + 1);
          if (h.carry) continue;
          for (const w of rest) {
            if (cur.slice(0, i).some(a => a.lift === w.id)) continue;
            if (!bridgeOn && w.pan !== (h.pan === 'B' ? 'L' : h.pan)) continue;
            cur[i] = { to, lift: w.id }; rec(i + 1);
          }
        }
      };
      // (an answer already under way stands while it still keeps everyone clear: nobody wanders back and forth as they cross, or as a drowned thing falls)
      const ckey = (doom && doom.rule !== 'under' ? doom.end.toFixed(1) : 'n') + rule + (o.tip ? 't' : '');
      let kept = false;
      if (!o.extra && !o.probe && commit && commit.key === ckey && heroes.every(h => commit.a[h.id])) {
        heroes.forEach((h, i) => {
          const a = commit.a[h.id], op = options(h); let lift = a.lift;
          if (lift != null && (h.carry || !rest.some(w => w.id === lift))) lift = null;
          cur[i] = { to: op.includes(a.to) ? a.to : op[0], lift };
        });
        best = null; evalAll();
        if (best && best.safe) kept = true; else best = null;
      }
      if (!kept) rec(0);
      if (!o.extra && !o.probe && best) commit = { key: ckey, a: Object.fromEntries(heroes.map(h => [h.id, { to: best.assign[h.id].to, lift: best.assign[h.id].lift }])) };
      if (!o.probe) planCache = { sig, t: f.t, res: best };
      return best;
    };
    // the judgement a bot should be planning for: the one running, or the next one coming (with a Tip first if one comes before it)
    const JUDGE_BY_NAME = { 'Let It Be Level': 'level', 'The Heavier Falls': 'heavier', 'The Lighter Rises': 'lighter' };
    // (The Tide Comes In reads the count as it lands and hits harder the further from level the pans are, so for the bots it is a Level they stand for, without the strike: `tide: true`)
    const agenda = () => {
      if (doom && doom.rule !== 'under' && f.t < doom.end) return { rule: doom.rule, left: doom.end - f.t, cast: true, tip: false, exact: doom.exact };
      if (tideEnd > f.t) return { rule: 'tide', left: tideEnd - f.t, cast: true, tip: false, tide: true };
      let tip = tipAt > f.t;
      for (const e of f.upcoming(5)) {
        if (e.name === 'Tip the Scale') tip = true;
        if (e.name === 'The Tide Comes In') return { rule: 'tide', left: e.t - f.t + 4.4, cast: false, tip, startIn: e.t - f.t, tide: true };
        const rule = JUDGE_BY_NAME[e.name] || (e.fn && e.fn.rule !== 'exact' ? e.fn.rule : null);
        if (rule) return { rule, left: e.t - f.t + 6.5, cast: false, tip, startIn: e.t - f.t };
      }
      return null;
    };

    // --- the acts -------------------------------------------------------------------------------------------------------------------
    // An opener: a short named cast (3.4 s) with a room event and a light raidwide; what Ormun weighed before is lifted away on his chains.
    const opener = (n, name) => () => {
      const d = f.ct(3.4);
      act = n;
      f.cast(name, d, 'act');
      f.emit({ t: 'roomev', k: 'ormact', act: n, name, dur: +(d + 1.2).toFixed(2) });
      f.emit({ t: 'roomev', k: 'form', form: null, r: REACH_R, dur: 9999 });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.beat, hidden: true, tag: 'ormBeat' });
      if (n > 1) f.afterKeep(1.2, clearWeights);
    };
    // a judgement step: its function carries its rule (fn.rule), so the feed can tell the bots what is coming even under a name that is not the rule's own
    const jf = rule => { const fn = () => judge(rule); fn.rule = rule; return fn; };
    const lv = jf('level'), hv = jf('heavier'), lt = jf('lighter'), exm = jf('exact');
    const hh2 = () => heavyHand(2), hh3 = () => heavyHand(3), under = () => undertow(false), twinU = () => undertow(true);
    const cw = (rule, o = {}) => () => counterweight(Object.assign({ rule }, o));
    const hollow = (rule, o = {}) => cw(rule, Object.assign({ crack: true }, o));
    const bur = () => burdens(false), bur3 = () => burdens(true), burL = () => burdens(false, 34), bur3L = () => burdens(true, 34);   // (L: in the last act the marks last through the judgement a Tip leads to)
    // Double Judgement (Hard): one judgement, and 2.6 s after its bar ends, the next. A highlight, never the rhythm.
    const dj = (gap, r1, r2) => [[gap, jf(r1), 'Double Judgement'], [f.ct(6.5) + 2.6, jf(r2), RULES[r2], 'pair']];

    // The dance (Hard draws one of three orders of an act's middle units per pull; Normal and Extreme run the order as written). An order is valid when the tank is never
    // without a Heavy Hand for more than `lim` s nor given two under `near` s apart, two Tides never land under 18 s apart, the act's first Tide is not later than lims.first
    // s in nor its last earlier than lims.tail s before its end, and no two judgements begin under 16 s apart unless they are a Double Judgement's pair. The three dances of
    // an act are drawn until they open their middle with three different units: the first unit the three do not share tells the party which dance it is.
    const BEAT_AT = { 'Heavy Hand': 4 }, RW_AT = { 'The Tide Comes In': 4.4 }, RW_NEAR = 18, J_NEAR = 16, JNAMES = new Set(['Let It Be Level', 'The Heavier Falls', 'The Lighter Rises', 'Exact Measure', 'Double Judgement']);
    const orderScore = (sets, lim, near, lims = {}) => {
      let t = 0, last = 0, rwLast = -99, rwFirst = Infinity, worst = 0, tight = 0, rw = 0, jl = -99, jt = 0;
      for (const set of sets) for (const st of set) {
        const name = st[2]; t += st[0];
        if (st[1] && BEAT_AT[name]) { const at = t + BEAT_AT[name]; worst = Math.max(worst, at - last); if (last > 0 && at - last < near) tight++; last = at; }
        if (st[1] && RW_AT[name]) { if (t + RW_AT[name] - rwLast < RW_NEAR) rw++; rwLast = t + RW_AT[name]; rwFirst = Math.min(rwFirst, rwLast); }
        if (st[1] && JNAMES.has(name)) { if (!st[3] && t - jl < J_NEAR) jt++; jl = t; }
      }
      worst = Math.max(worst, t + 6 - last);
      const far = (lims.first != null && rwFirst > lims.first) || (lims.tail != null && t - rwLast > lims.tail);
      return { worst, tight, rw, jt, far, ok: worst <= lim && !tight && !rw && !jt && !far };
    };
    const mix = (head, mid, tail, lim = 56, near = 18, actName = 'act', lims = {}) => {
      const keep = [...head, ...mid, ...tail], log = f.ormMix = f.ormMix || [];
      if (!H || X) { log.push({ act: actName, normal: orderScore(keep, lim, near, lims) }); return keep; }
      const valid = [], n = mid.length, idx = mid.map((_, k) => k), c = new Array(n).fill(0);
      let bad = null, badPen = Infinity;
      const see = () => {
        const sets = [...head, ...idx.map(k => mid[k]), ...tail], sc = orderScore(sets, lim, near, lims);
        if (sc.ok) valid.push(sets);
        else { const pen = sc.worst + (sc.tight + sc.rw + sc.jt + (sc.far ? 1 : 0)) * 30; if (pen < badPen) { badPen = pen; bad = sets; } }
      };
      see();
      for (let k = 0; k < n;) { if (c[k] < k) { const a = k % 2 ? c[k] : 0; [idx[a], idx[k]] = [idx[k], idx[a]]; see(); c[k]++; k = 0; } else { c[k] = 0; k++; } }   // (Heap's algorithm)
      log.push({ valid: valid.length, act: actName });
      if (!valid.length) return bad;
      let pickK = 0, bestSc = -1;
      for (let k = 0; k < 400; k++) {
        const o3 = [0, 1, 2].map(d => valid[Math.floor(f.danceRng(actName + ':' + k, d)() * valid.length)]);
        let i = head.length; while (i < o3[0].length && o3[0][i] === o3[1][i] && o3[1][i] === o3[2][i]) i++;
        const sc = new Set(o3.map(o => o[i])).size === 3 ? 100 - i : 0;
        if (sc > bestSc) { bestSc = sc; pickK = k; }
      }
      return valid[Math.floor(f.danceRng(actName + ':' + pickK, f.dance)() * valid.length)];
    };
    const cw1 = cw('level', { n: 1, allowed: [1] });

    // I. First Weighing
    const first = from => f.course({
      until: 0.76, push: true, onStart: () => { act = 1; },
      sets: mix(
        [S([3, opener(1, 'First Weighing'), 'First Weighing']), S([7, lv, 'Let It Be Level'])],
        [
          S([14, hh2, 'Heavy Hand']),
          S([13, cw1, 'Counterweight']),
          S([13, tideIn, 'The Tide Comes In']),
          S([14, lv, 'Let It Be Level']),
          S([14, hh2, 'Heavy Hand'], [10, lv, 'Let It Be Level']),
          ...(H && !X
            ? [S([14, cw1, 'Counterweight']), S([13, tideIn, 'The Tide Comes In'])]   // (Hard's dances permute these, so Hard's list stays as it was)
            : [S([13, tideIn, 'The Tide Comes In']), S([14, cw1, 'Counterweight'])]),   // (the written order ends on a Counterweight, not a Tide: the next act's opener waits OPEN_GAP s for a Tide, and that wait must not be a stretch with nothing named)
        ],
        [], 56, 18, 'act1', { first: 62, tail: 62 }),
      closing: [[12, hh2, 'Heavy Hand'], [12, tideIn, 'The Tide Comes In'], [12, lv, 'Let It Be Level']],
      next: second,
    }, from);

    // II. The Heavier (its gate is the wall). Hard: Hollow Weight, Twin Undertow, Scatter the Silver and a Double Judgement join the middle. Extreme: Buoyed, Exact
    // Measure and The Tide Weighs Too, in the order as written.
    const second = from => {
      const head = [
        S([3, opener(2, 'The Beam Leans'), 'The Beam Leans']),
        S([8, cw('heavier', { allowed: [2, 3] }), 'Counterweight']),
        S([11, (H ? hollow : cw)('heavier', { allowed: [2, 3] }), H ? 'Hollow Weight' : 'Counterweight']),
        S([13, hv, 'The Heavier Falls']),
      ];
      const mid = X ? [
        S([14, hh2, 'Heavy Hand']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, tideWeighs, 'The Tide Weighs Too'], [9, lt, 'The Lighter Rises']),
        S([13, hh2, 'Heavy Hand'], [10, exm, 'Exact Measure']),
        S([12, buoyed, 'Buoyed'], [9, hv, 'The Heavier Falls']),
        S([14, cw('level', { allowed: [2, 3] }), 'Counterweight'], [11, scatter, 'Scatter the Silver']),
      ] : H ? [
        S([14, hh2, 'Heavy Hand']),
        S([13, tideIn, 'The Tide Comes In']),
        S([13, tideIn, 'The Tide Comes In']),
        S([13, hh2, 'Heavy Hand'], [10, lv, 'Let It Be Level']),
        S([14, cw('level', { allowed: [2, 3] }), 'Counterweight'], [11, scatter, 'Scatter the Silver']),
        S(...dj(14, 'level', 'lighter')),
      ] : [
        S([14, hh2, 'Heavy Hand']),
        S([11, under, 'Undertow']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, lt, 'The Lighter Rises']),
        S([14, cw('level', { allowed: [1, 2, 3] }), 'Counterweight']),
        S([13, hh2, 'Heavy Hand'], [10, lv, 'Let It Be Level']),
      ];
      return f.course({
        until: 0.5, wall: { label: 'Spring Tide', run: springTide, until: 'resolved', timeout: 90 },
        onStart: () => { act = 2; holdAct(3.4); },
        sets: mix(head, mid, [], 56, 18, 'act2', { first: 62, tail: 62 }),
        closing: [[12, hh2, 'Heavy Hand'], [12, H ? twinU : under, H ? 'Twin Undertow' : 'Undertow'], [12, lt, 'The Lighter Rises']],
        next: third,
      }, from);
    };

    // III. Burdens. Hard: Three Burdens, Hollow Weight, Twin Undertow and a Double Judgement. Extreme: Buoyed, Exact Measure, The Tide Weighs Too.
    const third = from => {
      const head = [S([3, opener(4, 'The Weight of Things'), 'The Weight of Things']), S([7, bur, 'Burden']), S([9, lv, 'Let It Be Level'])];
      const mid = X ? [
        S([15, hh3, 'Heavy Hand']),
        S([13, hollow('lighter', { allowed: [2, 3] }), 'Hollow Weight'], [13, lt, 'The Lighter Rises']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, bur, 'Burden'], [7, cw('heavier', { allowed: [2, 3] }), 'Counterweight'], [9, hv, 'The Heavier Falls']),
        S([13, bur3, 'Three Burdens'], [9, exm, 'Exact Measure']),
        S([12, tideWeighs, 'The Tide Weighs Too'], [9, lt, 'The Lighter Rises']),
        S([12, twinU, 'Twin Undertow']),
      ] : H ? [
        S([15, hh3, 'Heavy Hand']),
        S([13, hollow('lighter', { allowed: [2, 3] }), 'Hollow Weight'], [13, lt, 'The Lighter Rises']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, bur, 'Burden'], [7, cw('heavier', { allowed: [2, 3] }), 'Counterweight'], [9, hv, 'The Heavier Falls']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, twinU, 'Twin Undertow']),
        S([13, bur3, 'Three Burdens'], [9, lv, 'Let It Be Level']),
      ] : [
        S([15, hh3, 'Heavy Hand']),
        S([13, cw('lighter', { allowed: [2, 3] }), 'Counterweight'], [13, lt, 'The Lighter Rises']),
        S([13, tideIn, 'The Tide Comes In']),
        S([12, bur, 'Burden'], [9, hv, 'The Heavier Falls']),
        S([14, hh3, 'Heavy Hand']),
        S([12, under, 'Undertow']),
      ];
      return f.course({
        until: 0.22, push: true, onStart: () => { act = 4; holdAct(3.4); },
        sets: mix(head, mid, [], 56, 18, 'act4', { first: 62, tail: 62 }),
        closing: [[12, bur, 'Burden'], [10, lv, 'Let It Be Level'], [12, hh3, 'Heavy Hand']],
        next: fourth,
      }, from);
    };

    // IV. The Last Weighing: the bridge is gone; the Tip throws the heavier pan's people across, and what they carry goes with them. The only judgement is The Lighter Rises:
    // after a Tip everyone alive stands on one pan, so the answer is always the same one, and whether the pan left behind weighs more than the people on the other depends
    // on the weights they chose to carry across. (Hard: a Hollow Weight, Three Burdens and a Double Judgement; Extreme: Buoyed and The Tide Weighs Too.)
    const tipUnit = (gap, hollowOne) => S([gap, (hollowOne ? hollow : cw)('lighter', { allowed: [3, 2], tip: true }), hollowOne ? 'Hollow Weight' : 'Counterweight'], [10, tipScale, 'Tip the Scale'], [8, lt, 'The Lighter Rises']);
    const fourth = from => f.course({
      onStart: () => { act = 5; holdAct(4); },
      sets: [
        S([3, bridgeBreaks, 'The Bridge Breaks']),
        S([8, hh3, 'Heavy Hand']),
        tipUnit(13, false),
        S([13, tideIn, 'The Tide Comes In']),
        ...(X ? [S([12, buoyed, 'Buoyed'])] : []),
        S([12, H ? bur3L : burL, H ? 'Three Burdens' : 'Burden']),
        tipUnit(8, H),
        S([13, hh3, 'Heavy Hand']),
        ...(X ? [S([12, tideWeighs, 'The Tide Weighs Too'])] : []),
        S([12, tideIn, 'The Tide Comes In']),
      ],
      closing: [[12, hh3, 'Heavy Hand'], [12, tideIn, 'The Tide Comes In'], [12, cw('lighter', { allowed: [3, 2], tip: true }), 'Counterweight'], [10, tipScale, 'Tip the Scale'], [8, lt, 'The Lighter Rises']],
      ramp: 0.08,
    }, from);

    first(0);
    emitScales(true);
    // the enrage and the kill have their own room events too
    // (the engine's enrage: whenever its cast actually starts, at the natural time or any other way, the staged beats follow it: its start now and its land 8 s later)
    const enrage0 = f.enrage.bind(f);
    f.enrage = () => { if (f.noEnrage) return; moment('enrage', 'start', { dur: 8 }); f.afterKeep(8, () => moment('enrage', 'land', { dur: 2.4 })); enrage0(); };
    f.onFell = () => {
      for (const m of [...f.mechs.values()]) f.cancel(m);
      B.untargetable = true; live1 = null; doom = null;
      moment('kill', 'fall', { x: B.x, y: B.y, dur: 3 });
      f.afterKeep(2.4, () => { moment('kill', 'end', { dur: 1.6 }); f.end(f.alive().length ? 'clear' : 'wipe'); });
    };

    // what the bots read (bots.js ormunRule), and every move by name for tools and testing (window.__game.raidHost.sim.moves.judge('level'))
    f.room = {
      tally, weights, wv, cradles: CRADLES.map(c => ({ idx: c.idx, pan: c.pan, x: c.x, y: c.y })), carryOf, heroW, panOf, plan, agenda, SPOTS, BSPOTS, BRIDGE_CAP, tide,
      get doom() { return doom; }, get crossBacks() { return crossBacks; }, get bridgeOn() { return bridgeOn; }, get tipAt() { return tipAt; }, get act() { return act; },
    };
    f.moves = { judge, undertow, heavyHand, tideIn, counterweight, scatter, burdens, buoyed, tideWeighs, bridgeBreaks, tipScale, springTide, tally, plan, clearWeights, addWeight };
    void TAU;
  },
};

if (typeof module !== 'undefined') module.exports = { ORMUN };
