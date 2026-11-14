// Boss XVI: Maelis Orne, the Pale Regent — "The Face of the Moon". The fourth and last boss of Season 2 (the Silver Road, docs/plans/2026-11-season-2-design.md),
// the finale of the set and its hardest fight. The Moon's regent has kept her house since the silver was taken, and the party has walked up her road to her door. She does
// not ask them to leave; she shows them the moon. The question is always: how much of her is lit?
//   THE FLOOR IS THE MOON. Her crown is a small moon behind her head and its phase is the shape of her next cut: the lit part of the crown is the part of the round room that is
//     struck, turned the way the crown is turned. A crescent strikes a crescent of floor, a half strikes half, a gibbous leaves only a sliver (the dark side), a full moon lights
//     it all (a raidwide). Phases come in the moon's own order (crescent, half, gibbous, full; waxing or waning, shown by which horn of the crown is bright), so a dance of four
//     cuts can be read from its first. The crown shows the phase for the whole cast; then the same shape is painted red on the floor with a real warning. The turn of every cut
//     is random, set and shown before it lands, and never sweeps.
//   Act I, Moonrise (100% -> 78%): single cuts named for their phase (Crescent, Half Moon, Gibbous), Full Moon (the healer's raidwide), Earthshine (the tank's cut and its pale
//     second hit a beat later) and Moonwell (shafts of light that need two heroes each).
//   Act II, The Waxing (78% -> 56%): the Waxing Dance and the Waning Dance (four cuts in the moon's order on one turn: the landing cut solid and only the next an outline; a
//     waxing dance ends in Full Moon, a waning dance begins with one) and Moonlets (small moons that fall on two heroes and stay where they land; every one bursts when the
//     waxing dance ends in Full Moon, so they are set down on the dark side of the dance that follows, and apart).
//   Act III, New Moon (the wall at 56%, about 42 s): the crown goes dark and so does the room (the floor dims; every telegraph stays as bright as ever). Moonless Steps, the sword dance:
//     six dashes, each foretold by a thin silver line from her to a hero, one at a time, each ending in a small crescent cut; between dashes a pool of the last light (a blue stack)
//     is laid for the party and shrinks. When the last light is gathered (everyone in it) the room holds for a breath, and Full Moon brings the light back.
//   Act IV, The Wild Hunt (56% -> 14%, two halves, the second named Hunter's Moon at 34%): The Hound's Return (his howl is heard before he is seen; the freshest trail in the dust
//     is his road; he runs it and she mounts him where it ends: the second form, Garrow come back up the road as her mount). Hunt's Pass (she rides a marked hero's trail, as Garrow
//     did, and cuts a phase as she passes its middle: two readings at once, twice in the act). Earthshine from the saddle rides where the tank has walked. Moonlets and dances return.
//   Act V, The Long Eclipse (14% -> dead): the crown turns red from one edge and the rule turns over: the dark of the crown is what strikes (Umbral Crescent, Umbral Half; still painted
//     red on the floor, as always). The Last Dance alternates lit and umbral cuts and ends in Full Moon. The red covers the crown by the time Totality (the enrage) lands.
//   (In the script `act` is 1 to 5 as above, and the Hunt's two halves are `part` 1 and 2.)
// Every telegraph shows on every difficulty, in the dark of the wall too. Red is damage, blue is a stack or a soak, a safe spot is never painted, and no text tells anyone what to do.
//
// STAGES 1 AND 2: this file is the whole fight on every difficulty. HARD (f.hard: casts 15% faster, harder hits, the first calm of every set 6% shorter) adds five moves Normal never uses:
//   Two Crowns (her reflection in the dust shows a second crown with its own phase and turn; both cuts land together and the safe ground is what neither lights), Annular (a ring of light: a
//   donut cut that leaves the middle and the rim), Libration (the crown rocks a quarter-turn once after a cut is shown and locks at least 1.5 s before it lands: it turns once and stops),
//   Moonless Steps of eight with a Moonfall (a moonlet falls on a hero in the middle of the dance and bursts when the light comes back), and Harvest (a Waxing Dance that follows Moonlets: a
//   moonlet a cut has already lit bursts wider). Hard draws one of three dances (f.dance) for the middle sets of Acts I, II and IV (the first set the three do not share is the tell; see `mix`).
// EXTREME (f.extreme, with f.hard also true; always dance 0) is Hard plus three mechanics of her own: Moon-Touched (two heroes carry an `eye` mark: for 20 s light does not harm them and darkness
//   does), Blood Moon Rising (from Act II on one cut of every dance is umbral, shown by the red limb of the crown: Blood Moon Dance, Blood Harvest), and The Second Howl (Garrow's shade comes
//   up the road again and runs the freshest trail in the middle of each Last Dance, marked by a head mark).
//
// ============================================================ CONTRACT (for the look, sound, journal and bot lanes) ============================================================
// THE ROOM. ARENA_DEFS.maelis: a circle of radius 560 centred (0, 0), arena theme 'moon'. She stands at (0, -60) at the pull and walks to her tank as any boss does when she is not
//   casting (def.anchor is false); in the wall she stands at (0, -60) and dashes, and in the Hunt she is wherever the Hound's pounce landed. Her hit radius is 70, and 105 from the
//   mount on (def.forms.hunt, sent with the engine's own roomev `form` { form: 'hunt', dur: 9999, r: 105 }; the floor is the same, forms.hunt.sameRoom).
// THE `lune` SHAPE (shapes.js; SHAPES.contains and SHAPES.trace know it, and so does every bot's ordinary read of a telegraph):
//   { kind: 'lune', x, y, r, ph: 'crescent' | 'half' | 'gibbous' | 'full', angle }   the disc of radius r round (x, y) cut by a phase; angle is the direction the LIT side faces.
//     crescent: the disc OUTSIDE a circle of radius r centred 0.55 r from (x, y) toward the dark side (angle + PI): the thin lit rim; 34% of the disc
//     half:     the half-disc on the lit side (u >= 0 where u runs along angle); 50%
//     gibbous:  the disc INSIDE a circle of radius r centred 0.55 r from (x, y) toward the lit side: all but a sliver on the dark side; 65%
//     full:     the whole disc
//   The room's cuts are { x: 0, y: 0, r: 560 }; the wall's small crescent cut is r 230 to 320 centred on the end of a dash. SHAPES.trace draws exactly these outlines (arcs, no clipping).
//   AN UMBRAL CUT (the dark of the crown is what strikes) is the same shapes turned over, so the shape sent is the crown's phase turned over and turned by PI: an Umbral Crescent is a
//     gibbous with angle + PI, an Umbral Half a half with angle + PI. The crown still shows the crown's own phase and turn (umbral: 1), so the dark limb is the struck one.
// THE CROWN. A room event `mlcrown` { phase: 'new' | 'crescent' | 'half' | 'gibbous' | 'full', turn (radians, the direction the lit side faces), wax: 1 | -1 (1 waxing, -1 waning: which
//   horn is bright), ring: 0 | 1 (HARD, Annular: the crown is full with a dark middle; phase is then 'full'), umbral: 0 | 1 (the dark of the crown is what strikes: from Act V on, and during Umbral cuts), red: 0..1 (how far the eclipse has covered the crown; Act V only, 0.06 when the
//   eclipse begins, rising to 1 as Totality lands), dur: 9999 }, sent whenever it changes (so a rejoin replays it). Phase 'new' is the crown at rest (nothing pending) and in the wall's dark.
//   A single cut sets the crown when its cast begins and it stays until the cut has landed. In a dance the crown shows the NEXT cut: it changes when that cut's outline is laid.
//   Waxing dance: wax 1; waning dance: wax -1; everything else wax 1.
// THE SECOND CROWN (HARD, Two Crowns). A second room event `mlcrown2` { on: 1 | 0, phase, turn, wax, umbral, red, dur: 9999 }: the reflection in the dust, a small second crown with its own phase and turn
//   (the same fields as `mlcrown`, whose own fields are unchanged). `on: 1` when Two Crowns begins; `on: 0` 0.4 s after the cuts land (it is then cleared: draw nothing). Both cuts are laid on the floor
//   together and land together; the ground neither lights is safe.
// THE SECOND FORM. `mlform` { n: 1 | 2, dur: 9999 } (n 1 at the pull; n 2 { x, y } when she lands on the Hound, sent with the engine's roomev `form`; a Practice Hall start from Hunter's Moon or from The Long Eclipse sends n 2 at the pull, with no mount: see the end of the script). In form 2 she rides Garrow; the art reuses his body.
// CUTS. `mlcut` { ph, turn, umb: 0 | 1, wax, kd: 'single' | 'dance' | 'pass', n, of, final: 0 | 1, at, warn, who?, dur } says "this cut is coming": `at` is seconds from this event until it lands, `warn` how long its
//   floor is painted before it lands (so the floor appears at at - warn; a Full Moon has no floor: its raidwide is hidden). A single's event is sent at the cast's start (the crown is set then); a
//   dance cut's event is sent when its outline is laid (at = warn); a Hunt's Pass cut (kd 'pass', who = the scented hero) is sent at the cast's start and lands 0.5 s after the ride begins. A dance's
//   own events: `mldance` { name, n, wax, lands: [s from now, ...], dur } (it begins: the landing times close up), `mlpeak` { n, dur: 1.4 } (the last cut lands: the one to remember),
//   `mldanceend` { dur: 1.2 }. Cuts climb: each lands a little sooner and a little harder, and the last is a Full Moon (every moonlet bursts a beat after it).
//   HARD'S CUTS: Two Crowns sends two `mlcut` with kd 'twin' and crown 1 | 2 (n 1, 2 of 2; both land in `at`); Annular sends ph 'ring' (r 440, r2 200: the floor between them is struck; crown phase 'full' with
//   ring 1); Libration sends kd 'libration' with the crown's first turn, then `mllibrate` { from, to, dir: 1 | -1, ph, lock, warn, dur } once (the crown turns a quarter and stops; the floor is painted `lock`
//   s before it lands, at least 3 s; until then the cut has no shape).
// MECHANIC TAGS (the `tag` on tg / pdmg; all shapes in room coordinates):
//   mlCrescent mlHalf mlGibbous     a cut (aoe, a `lune` of the room); mlUCrescent mlUHalf: an umbral cut (aoe, the turned-over `lune`); mlPassCrescent mlPassHalf mlPassGibbous: the cut she makes as
//                                   she passes the middle of a Hunt's Pass (aoe, a `lune` of the room)
//   mlFull                          Full Moon's raidwide (type 'raidwide', hidden: nothing to paint); mlOpen: the light raidwide of an act opener, the New Moon cast, the pounce that shakes the floor
//   buster                          Earthshine's first hit (the engine's own tag): a cone from her (r 360, arc 1.25, aimFromBoss the tank) with the tank as target; mlEarthshine2: the pale second hit
//                                   1.6 s later (55%, the same cone), shown as a second telegraph
//   mlRide                          Earthshine from the saddle: red pieces (rect w 100, circles r 50 at corners) laid along the tank's last 5 s of steps, only when that trail is 160 or longer; each piece
//                                   lands as the rider reaches it (1400 px/s); the matching `mlpath:<n>` kd 'ride'
//   mlWell                          a Moonwell shaft: type 'tower', circle r 95, need 2 (blue); one or two of them, 340 or more apart (a party short of a hero has one)
//   mlMoonlet                       Moonlets' spread: circle r 110 that follows its carrier until the cast ends (then the moonlet is set down where it stopped). mlBurst: a moonlet's burst, circle r 150 at the moonlet
//   mlDash                          a wall dash: rect w 90 + 5 i (i = 0..5) from her to the hero's place and 70 past it; mlStepCut: the small crescent cut at the end of the dash (a `lune` crescent r 230 + 18 i centred where the
//                                   hero stood, angle the direction of the dash, lands 0.5 s after the dash)
//   mlPool                          the pool of the last light: type 'stack', circle r 210, 195, 180, 165, 150, 140 (steps 1 to 6; one per step, laid with the step) and r 190 for The Last Light (the final
//                                   gather: everyone must be in it)
//   mlRun                           the Hound's road (mlpath kd 'return') and the Hunt's Pass ride (kd 'pass'): red pieces (rect w 110 up to 280 long, circles r 55 at corners) that land as the rider reaches them
//                                   (820 px/s); mlPounce: where it ends (circle r 150 for a trail of 600 or more, up to 390 for a hero who never moved; it hangs 0.6 s to 1.4 s before it lands)
//   HARD AND EXTREME TAGS: mlTwinCrescent mlTwinHalf mlTwinGibbous (Two Crowns' second cut, a `lune`; the first is the ordinary mlCrescent mlHalf mlGibbous, both in one `group`: one hit at most), mlAnnular (aoe
//   donut, r 440, r2 200), mlLibCrescent mlLibHalf mlLibGibbous (Libration's cut, a `lune`, laid at its locked turn), mlMoonfall (Moonfall's spread, circle r 110 that follows its carrier: the moonlet is set
//   down where it stops), mlHarvest (a moonlet lit twice: circle r 230; a plain moonlet is mlBurst, r 150), mlShade and mlShadePounce (EXTREME, The Second Howl: the shade's corridor, rect w 110, and the pounce
//   at its end, circle r 150 up to 390). In the wall Hard's dashes are eight (mlDash w 90 + 5 i, i = 0..7; mlStepCut r 230 + 18 i; mlPool r 210, 195, 180, 165, 150, 140, 132, 126 for steps 1 to 8).
//   EXTREME's inversion: a hero with the `mleye` mark is struck by a cut of the phases (mlCrescent mlHalf mlGibbous mlUCrescent mlUHalf mlTwin* mlAnnular mlPass* mlLib*) when they are NOT in its painted
//   shape, and not when they are: the same red floor, read the other way round, for the 20 s the mark lasts. Everything else (raidwides, dashes, bursts, runs, pounces) strikes them as it does anyone.
// HEAD MARKS (f.mark; colours silver-white #dfe9f5 and #e2f2ff):
//   HARD AND EXTREME: 'mlmoonfall' sym 'dot' (the hero a Moonfall falls on, until the cast ends)   'mleye' sym 'eye' col #f2c9a0 (EXTREME, Moon-Touched: two heroes, from the cast's start for 20 s past its end)
//   'mlhowl2' sym 'prey' (EXTREME, The Second Howl: the freshest hero, for the 1.5 s before the corridor locks)
//   'mlprey' sym 'prey'   the hero a Hunt's Pass takes (until the trail locks 1.5 s before the cast ends)     'mlfresh' sym 'prey'   the hero whose trail is the Hound's road (the same, from 2.2 s in)
//   'mlmoon' sym 'dot'    a Moonlets carrier (until the cast ends)                                              'mlstep' sym 'num' n 1..6   the hero a wall dash takes (until the line locks)
// ROOM EVENTS (`roomev`, k = the name; `dur` is how long the client holds it; every one that sets lasting state has a long dur, so a rejoin replays it):
//   mlcrown, mlform (above)         mlact { n: 1..5, part: 1 | 2, dur }      an act's opener begins (n 3 = New Moon, n 4 part 1 = The Hound's Return, part 2 = Hunter's Moon); its light raidwide lands at the cast's end (no two party-wide hits land within 10 s: an opener, New Moon or The Long Eclipse that would follow one too closely waits, and so does its mlact)
//   mlnight { on: 1 | 0, dur: 9999 }       the floor dims (the wall's dark: on 1 at 2.2 s into the New Moon cast) and lights again (on 0 as the release lands). Telegraphs are drawn as bright as ever
//   mlearth { at, gap, saddle: 0 | 1, dur }   Earthshine's two hits land at `at` and `at + gap`; saddle 1 once she rides
//   mlwell { pts: [[x, y], ...], r, at, dur }   Moonwell's shafts (the same as the mlWell telegraphs)
//   mlmoonlets { ids, turn, at, dur }       Moonlets begins; `turn` is the turn of the dance that follows (the crown shows it). mlmoonlet { id, x, y, dur: 40 }: a moonlet is set down (the prop kind 'moonlet'
//                                           too); mlmoonx { id, x, y, burst: 0 | 1, dur }: it is gone; mlburst { id, x, y, r: 150, at, dur }: it will burst in `at` s
//   mlpath:<n> { l: [[x, y], ...], w, sp, at, who, kd: 'pass' | 'return' | 'ride' | 'shade', dur }   a ride is locked: the corridor through the points `l`, `w` wide, `sp` px/s, starting `at` s from now (the Hunt's road;
//                                           for kd 'return' the first point is outside the room, where he comes up the road from)       mlpounce { x, y, r, at, kd?: 'shade', dur }: where it lands, in `at` s
//   mlwallup { at, dur }  the wall begins (with the cast New Moon, which ends in a light raidwide, and mlact n 3)   mlstep { i: 0..5, of: 6, who, x1, y1, x2, y2, lock, at, dur }   dash i is foretold: a thin silver line
//                                           from her (x1, y1) to the hero (x2, y2), who carries the mark; the line locks `lock` s from now and the dash lands `at` s from now
//   mlstepl { i, who, x1, y1, x2, y2, w, cx, cy, a, r, at, atc, dur }   the dash locks: the red line (x1, y1) to (x2, y2), w wide, lands in `at` s; the small crescent at (cx, cy), angle a, radius r, in `atc` s
//   mlpool { i: 0..6, x, y, r, at, last: 0 | 1, dur }   a pool of the last light is laid (i 6 = The Last Light, last 1)     mlpoolmet { ok: 0 | 1, met, of, dur }   the answer: whether everyone stood in the last pool
//   mlnmhold { dur: 1.5 }  THE HELD BEAT of New Moon     mlnmfull { at, dur }  the release (the cast Full Moon, 3.6 s)     mlnmdown { dur: 1.5 }  the breath; the wall comes down
//   mlact n 4, mlhowl { at: 0, dur }  his howl (the Hound's Return begins; nothing is seen)   mlfresh { pid, dur }  the freshest hero is marked   mlreturnhold { dur }  THE HELD BEAT of the Hound's Return
//   mlreturn { pid, at: 1.5, dur: 8 }  the road is locked and painted (with mlpath kd 'return' and mlpounce)   mlmount { x, y, fx, fy, dur: 2.4 }  she vaults from (fx, fy) onto him at (x, y); mlform n 2 follows
//   mleclipse0 { at, dur }  The Long Eclipse begins (the crown dims)   mleclipsehold { dur }  THE HELD BEAT   mleclipse { red, dur: 3 }  the release: the red takes the first edge, the rule turns over (the crown is umbral)
//   mltotality { dur: 8 }  Totality begins (the cast; the crown is red all over)   mltotalityhold { dur: 1.6 }  THE HELD BEAT   mltotalityland { dur: 2 }  it lands
//   mlfall { dur: 2.4 }  the instant she falls; the room holds for 1.4 s (nothing laid) and then the fight ends as a clear
// MOMENTS (the showpieces and their beats; a staging lane can hang camera, music and room effects on each; nothing else is on the floor in a HELD beat):
//   1. NEW MOON, the wall (about 42 s): build-up mlwallup + the cast New Moon + mlnight on, then the sword dance (mlstep, mlstepl, mlpool per dash; Earthshine for the tank between the third dash and the
//      fourth); the party gathers the last light (The Last Light: everyone in the pool); THE HELD BEAT mlnmhold begins the moment the last light is met (mlpoolmet ok 1: the party causes it; a missed one is
//      laid again, twice at most), the release is the cast Full Moon (mlnmfull) with mlnight off as it lands, and mlnmdown 0.9 s later as the wall comes down.
//   2. THE HOUND'S RETURN (about 10 s, the biggest moment of the set): mlhowl (heard before he is seen), mlfresh (the freshest trail in the dust is his road), THE HELD BEAT mlreturnhold (nothing on the floor), then
//      mlreturn + mlpath kd 'return' + mlpounce (he comes up the road along that trail), mlmount (she vaults onto him where he lands) and mlform n 2. The party causes it: the road is whoever walked the most
//      in the last 3 s, and she ends where it ends.
//   3. THE ECLIPSE BEGINS (5.4 s): mlact n 5 + mleclipse0 with the cast The Long Eclipse (build-up), THE HELD BEAT mleclipsehold at 46%, the release mleclipse at 78% (the red takes the first edge, umbral 1)
//      and a light raidwide at the cast's end.
//   4. TOTALITY: mltotality (the 8 s cast), THE HELD BEAT mltotalityhold at 6.4 s, mltotalityland at 8 s.
//   5. THE KILL: mlfall.
//   (The dances each climb: the Waxing Dance mlpeak at its Full Moon with the moonlets bursting; the sword dance's pools shrink to the last light; the Last Dance ends in Full Moon.)
//   HARD AND EXTREME ROOM EVENTS: mlcrown2 (above), mllibrate (above), mlmoonfall { id, at, dur } (Moonfall's carrier; a moonlet is then set down as for Moonlets: mlmoonlet, and the prop) with the cast
//   Moonfall, between the fourth dash and the fifth; the moonlet bursts 1.1 s after the Full Moon of the wall's release lands (mlburst { id, x, y, r: 150, twice: 0, at, dur }, painted from the release's
//   start, never in the held beat); mlburst carries `twice: 1` and r 230 for a Harvest burst; mlstep { of: 8 } for the dashes; mltouch { ids, at, life: 20, dur } (EXTREME: Moon-Touched is cast; the eye
//   marks are on the heroes in ids, and the inversion holds from `at` for `life`); mlhowl2 { pid, at: 1.5, dur: 8 } (EXTREME: the Second Howl, with the cast The Second Howl; then mlpath kd 'shade' and mlpounce kd 'shade' as for the
//   Hound's Return, but the shade runs alone: she does not move and nobody mounts).
// PROPS: kind 'moonlet' (shape 'circle', r 34, solid false): a moonlet at rest. No adds.
// CAST ANIMS (f.cast's third argument, the boss's pose while the bar runs; each is the art's pose name, prop `ml` + the name capitalised: maelis-art.js ML_ART.POSES): full (Moonrise, The Waxing, Hunter's
//   Moon, Full Moon), cut (Crescent, Half Moon, Gibbous and the umbral cuts), buster (Earthshine), call (Moonwell, Moonlets, The Last Light, The Hound's Return), dance (the dances), ride (Hunt's Pass), bow (New Moon),
//   dash (Moonless Steps), eclipse (The Long Eclipse), (HARD AND EXTREME: Two Crowns, Annular and Libration are cut; Moonfall, Moon-Touched and The Second Howl are call), enrage (Totality: the engine's own). banim (the same names): 'cut' { who: 'v', n } as each cut lands, 'dash' { i } as she dashes (her place changes to the end of
//   the line), 'ride' as a Hunt's Pass begins and again for the pounce that ends it, 'mount', 'intro' at the pull, 'death' with mlfall. (Her rest pose, `mlRest`, is the default: no anim is sent for it.)
// CASTS (names the cast bar and the upcoming-moves feed show): Moonrise, Crescent, Half Moon, Gibbous, Full Moon, Earthshine, Moonwell, The Waxing, Moonlets, Waxing Dance, Waning Dance, New Moon, Moonless Steps,
//   (HARD: Two Crowns, Annular, Libration, Moonfall, Harvest = the Waxing Dance after Moonlets; EXTREME: Moon-Touched, Blood Moon Dance, Blood Harvest, The Second Howl = a bar of 1.5 s, the length of its head
//   mark, in the middle of each Last Dance: the clients' cast bar shows it for that long (bcast only, as Wyrm's Marked Prey; the boss is still casting the dance to the sim), and it is named in the upcoming-moves feed from the dance's start),
//   The Last Light, The Hound's Return, Hunt's Pass, Hunter's Moon, The Long Eclipse, Umbral Crescent, Umbral Half Moon, The Last Dance, Totality (the enrage).
// f.room (bots.js maelisRule; the clients read the events): { R: 560, crown() -> the live crown { phase, turn, wax, umbral, red, ring }, crown2() -> the second crown { on, phase, turn, wax, umbral, red }, ring: { r, r2 }, touched(id) -> bool (EXTREME: the eye mark is on), act() 1..5, part() 1 | 2, form() 1 | 2, night() bool, wall (true from the wall's
//   start to its end), pending() -> [{ c: { ph, turn, umb }, shape (the lune it will paint, null for a Full Moon), at (when it lands, seconds on the fight's clock), laid (its floor is painted) }, ...] (the cuts still to land,
//   a dance's later cuts included: the moon's order lets a player read them, so the bots do), moons() -> [{ id, x, y }], lune(ph, turn, umb) -> the shape, trail(pid, span), span(), want, pounceR(L) }.
// DAMAGE KINDS (damagePlayer `kind`, the recap): the tags above.
// =====================================================================================================================================================================================

const MAELIS = {
  id: 'maelis', name: 'Maelis Orne', title: 'the Pale Regent', set: 6,
  // Tuned 2026-11-12 at GEAR=post5 / post6 / post7, the standard line-up bastion, cleric, ranger, pyromancer, 24 pulls a sample (seeds 1000 and 5000, 48 a rate):
  //   HUMAN=dps: Normal 40 of 48 (83%, kill about 8:40), Hard 21 of 48 (44%; 37 of 96 over four seed sets, 39%; kill about 9:00, the enrage 50 s after), Extreme 6 of 48 (13%); perfect bots: Normal 47 of 48, Hard 42 of 48 (88%), Extreme 17 of 48 (35%).
  //   RE-TUNED 2026-11-13 (Hard only): after a timeline fix, a review pass and the post6 gear correction her Hard had fallen to 7 of 48 human-like (perfect bots 38 of 48; Extreme 8 and 21, Normal 36 and 44 of 48 on seeds 1 and 2).
  //   Most human-like Hard wipes were Acts I and II (a failed Moonwell or a late look at a wide cut, then the plain Full Moons finishing a party already chipped), a few in the wall and Act V; none were the enrage. Full Moon on Hard
  //   12500 -> 11800 (Extreme keeps 12500, so Extreme and Normal are unchanged): HUMAN=dps Hard 20 of 48 (31 of 72 with seed 3, 43%), perfect bots Hard 44 of 48 (64 of 72 with seed 3, 89%), Extreme 8 of 48 human-like and 21 of 48 perfect
  //   (as before; seed 3: 7 and 15 of 24), Normal 36 of 48 and 44 of 48 (as before). One-shot tries: Hard cut 20500 -> 19500 alone gave 8 of 48, wellFail 9400 -> 8800 11, pool 10300 -> 9600 12, Full Moon 11800 20; hdmg 0.97 gave 15, 0.95 27, 0.92 29,
  //   0.85 34 (the Full Moon is the cliff: a human-like party is chipped by the lapses and the plain raidwide finishes it).
  //   THE SCRIPT WAS CUT to meet the timeline check (the scripted fight, to the end of its last set with the wall at its longest, 480 to 600 s): it had run 738 s on Normal, a party at pace used less than three
  //   quarters of Act V. The tail of every act (sets a party at pace never reached: a second Hunt's Pass and Moonwell set, the last Waning Dance's calm, Act V after its first Last Dance) was dropped and every mechanic
  //   is still in play. A party that is slower than the script reaches the closing passes sooner (Full Moon, Earthshine, a cut, 8% to 10% more damage each), so the health came down by 9% (Normal 8.6M -> 7.8M), 10% (Hard
  //   8.9M -> 8.0M) and 5% (Extreme 9.2M -> 8.72M), the enrage moved to 595 s / 590 s / 625 s (a minute after the script's end on Normal, 45 s on Hard) and the rates are back in their bands.
  //   Hard perfect bots with other line-ups (before the cut): shadowblade/ranger 45 of 48, driftblade/ranger 40 of 48, shadowblade/thresher 33 of 48. Bot clear rates swing about 7 points between runs of the same set (Hard 8.0M to 8.1M
  //   measured 44% to 35% and 8.05M 29% on the same seeds: do not chase a single sample).
  //   CLIFFS (Hard, HUMAN=dps): a Moonwell that fails (wellFail) and the pool of the last light (pool) are the chip a Full Moon then finishes: 9400 and 10300 give 40%, but wellFail 10000 with pool 11800
  //   gives 6%, and a plain Full Moon (full) of 13000 and not 12500 gives 23%. The side chosen is the one under the cliff. Extreme is Hard with its cuts and Moonwell fails a little softer (AV, wellFail),
  //   and less health, so a late look at a wide floor is a hurt and the three new mechanics are the difficulty (Extreme's health is steep: 8.65M gave 22% and 8.8M 7% over 96 pulls). Perfect bots never take a cut: their rate is the unavoidable chip and the last dances.
  hp: { normal: 7800000, hard: 8000000, extreme: 8720000 },
  normalDmg: 1.42, hardDmg: 1.9, extremeDmg: 1.9,
  autoDmg: { normal: 2700, hard: 2700, extreme: 2700 },
  enrage: { normal: 595, hard: 590, extreme: 625 },   // the cast starts here and lands 8 s later
  enrageName: 'Totality',
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'moon' },
  // the second form (fight.js setForm 'hunt'): she rides Garrow; the same floor (sameRoom), a larger body (bossR is the hit radius from then on)
  forms: { hunt: { name: 'Maelis Orne, the Wild Hunt', title: 'the Pale Regent', sameRoom: true, bossR: 105 } },
  gates: [{ f: 0.78, push: 1 }, { f: 0.56, push: 1, wall: 1 }, { f: 0.34, push: 1 }, { f: 0.14, push: 1 }],

  script(f) {
    const H = f.hard, X = f.extreme, B = f.boss, TAU = Math.PI * 2, PI = Math.PI, R = 560;
    const dmg = {
      open: H ? 5000 : 6200, full: X ? 12500 : H ? 11800 : 15200, cut: H ? 20500 : 23500, umbral: H ? 21500 : 25000, earth: H ? 30500 : 35000, well: H ? 3500 : 4000, wellFail: X ? 8200 : H ? 9400 : 10500,
      moonlet: H ? 7000 : 8500, burst: H ? 17000 : 20000, dash: H ? 20500 : 23500, stepCut: H ? 13500 : 16000, pool: H ? 10300 : 14000,
      run: H ? 19500 : 22500, pounce: H ? 21500 : 25000, ride: H ? 17000 : 20000,
      ring: 21500, moonfall: 7000,   // (Hard and Extreme only: Annular's ring, Moonfall's spread)
    };
    // (Hard and Extreme: the cuts, the dashes, the rides and the bursts are the hits a late look at a wide floor costs, so they are cut down: AV of what they were. A human-like party that is a second late to a gibbous is hurt, and two such lapses kill; perfect bots never take one)
    const AV = X ? 0.8 : H ? 0.95 : 1;
    for (const k of ['cut', 'umbral', 'ring', 'dash', 'stepCut', 'run', 'pounce', 'ride', 'burst']) dmg[k] = Math.round(dmg[k] * AV);
    // (Hard closes the calm before a set's first step by a sixteenth: the moves are the same, they come sooner)
    const FINM = H ? 1.0 : 1.15;   // (a dance's last Full Moon and the wall's release hit a little harder on Normal; on Hard the plain Full Moon is already the heaviest an unavoidable hit may be)
    const S = (...steps) => { const st = steps.filter(Boolean); return H && st.length ? [[st[0][0] * 0.94, ...st[0].slice(1)], ...st.slice(1)] : st; };
    const live = id => f.alive().find(p => p.id === id);
    const rd = n => Math.round(n);
    const wrap = a => { a %= TAU; if (a > PI) a -= TAU; if (a <= -PI) a += TAU; return a; };
    let fell = false;   // (the boss has fallen: the room holds for a breath and nothing more is laid or sent)
    const ev = (k, o = {}) => { if (!fell || k === 'mlfall') f.emit(Object.assign({ t: 'roomev', k }, o)); };
    let act = 1, part = 1, busyUntil = 0, wallOn = false, form = 1, night = false, eclipseAt = -1, final = false;   // (final: Totality has begun, nothing more is begun)
    const busy = d => { busyUntil = Math.max(busyUntil, f.t + d); };
    // a step that would begin while a move is still on the floor waits for it (two moves never overlap unless a set pairs them)
    const free = fn => () => { if (final) return; const w = busyUntil - f.t; if (w > 0.02) f.afterKeep(w + 0.05, fn); else fn(); };
    // (no two party-wide hits land within 10 s of each other: wideAt is when the last one lands, and an act opener that would follow one too closely waits: `spaced`)
    let wideAt = -99;
    const raidwide = (delay, amt, tag) => { wideAt = Math.max(wideAt, f.t + delay); return f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay, dmg: amt, hidden: true, tag }); };
    const spaced = (d, fn) => { const w = wideAt + 10 - (f.t + d); if (w > 0.05) { busy(w + d + 0.5); f.afterKeep(w, () => { if (f.state === 'live') fn(); }); } else fn(); };

    // --- the crown ---------------------------------------------------------------------------------------------------------------------------
    // Her crown is a small moon behind her head; its phase is the shape of her next cut and its turn the way the lit side faces. At rest it is new.
    const crown = { phase: 'new', turn: 0, wax: 1, umbral: 0, red: 0, ring: 0 };
    let crownKey = '', crownUntil = 0;
    const sendCrown = () => {
      const k = [crown.phase, crown.turn.toFixed(3), crown.wax, crown.umbral, crown.red.toFixed(2), crown.ring].join();
      if (k === crownKey) return;
      crownKey = k;
      ev('mlcrown', { phase: crown.phase, turn: +crown.turn.toFixed(3), wax: crown.wax, umbral: crown.umbral, red: +crown.red.toFixed(2), ring: crown.ring, dur: 9999 });
    };
    const setCrown = o => { Object.assign(crown, { ring: 0 }, o); crown.turn = wrap(crown.turn); sendCrown(); };
    // (Hard, Two Crowns) her reflection in the dust: a second crown with its own phase and turn, the room event `mlcrown2` (same fields as `mlcrown` and `on: 1 | 0`); `on: 0` clears it
    const crown2 = { on: 0, phase: 'new', turn: 0, wax: 1, umbral: 0, red: 0 };
    let crown2Key = '';
    const setCrown2 = o => {
      Object.assign(crown2, o); crown2.turn = wrap(crown2.turn);
      const k = [crown2.on, crown2.phase, crown2.turn.toFixed(3)].join();
      if (k === crown2Key) return;
      crown2Key = k;
      ev('mlcrown2', { on: crown2.on, phase: crown2.phase, turn: +crown2.turn.toFixed(3), wax: crown2.wax, umbral: crown2.umbral, red: crown2.red, dur: 9999 });
    };
    // back to a new moon once nothing is pending on it (a cut that has landed)
    const restCrown = () => { if (f.state === 'live' && f.t >= crownUntil - 0.01 && crown.phase !== 'new') setCrown({ phase: 'new', umbral: eclipseAt >= 0 ? 1 : 0 }); };
    const holdCrown = d => { crownUntil = Math.max(crownUntil, f.t + d); f.afterKeep(d + 0.05, restCrown); };
    let lastTurn = 0;
    const newTurn = (gap = 1.1) => {
      for (let i = 0; i < 14; i++) { const a = wrap(f.rng() * TAU); if (Math.abs(wrap(a - lastTurn)) >= gap) { lastTurn = a; return a; } }
      lastTurn = wrap(lastTurn + 2.2); return lastTurn;
    };
    // the shape a cut strikes. An umbral cut is the dark of the crown striking: the phase turned over (a crescent's dark is a gibbous on the far side)
    const lune = (ph, turn, umb = 0, o = {}) => {
      if (umb) { ph = { crescent: 'gibbous', gibbous: 'crescent', half: 'half', full: 'full' }[ph]; turn += PI; }
      return Object.assign({ kind: 'lune', x: 0, y: 0, r: R, ph, angle: +wrap(turn).toFixed(3) }, o);
    };
    const CAP = { crescent: 'Crescent', half: 'Half', gibbous: 'Gibbous', full: 'Full' };
    const tagOf = c => 'ml' + (c.umb ? 'U' : '') + CAP[c.ph];
    // what is still to land (cuts whose shapes the bots may plan round before they are painted): { c, shape, at, laid }
    let pend = [];
    // the floor's part of a cut, red from `delay` s before it lands
    const layCut = (c, delay, amt, extra = {}) => {
      if (c.ph === 'full' && !c.umb) return raidwide(delay, amt, 'mlFull');
      if (c.ph === 'ring') return f.aoe(ringShape(), delay, amt, Object.assign({ tag: 'mlAnnular' }, extra));
      return f.aoe(lune(c.ph, c.turn, c.umb), delay, amt, Object.assign({ tag: tagOf(c) }, extra));
    };
    const RING = { r: 440, r2: 200 };   // (Annular: the ring of light between 200 and 440 from the middle; the middle and the rim are left)
    const ringShape = () => ({ kind: 'donut', x: 0, y: 0, r: RING.r, r2: RING.r2 });
    const pendAdd = (c, at) => { const e = { c, shape: c.ph === 'full' && !c.umb ? null : c.ph === 'ring' ? ringShape() : lune(c.ph, c.turn, c.umb), at, laid: false }; pend.push(e); return e; };
    const pendTidy = () => { pend = pend.filter(e => e.at > f.t - 0.3); };

    // --- the moon's clock (Act V): the eclipse closes over the crown and totality is the enrage ----------------------------------------------
    f.ticker(() => {
      if (eclipseAt < 0 || f.state !== 'live') return;
      const land = f.enrageAt() + 8, red = Math.max(0.06, Math.min(1, 0.06 + 0.94 * (f.t - eclipseAt) / Math.max(20, land - eclipseAt)));
      if (Math.abs(red - crown.red) >= 0.02) { crown.red = red; sendCrown(); }
    });

    // --- the dust: every hero's steps (the Hunt's rule, as Garrow's) ----------------------------------------------------------------------------
    const STEP = 0.15, KEEP = 30, SPAN = 6, LOCK = 1.5, SPEED = 820;
    const hist = new Map();
    let acc = 0, stare = null, pathN = 0, lastPrey = null;
    f.ticker(dt => {
      if (stare != null) { const p = live(stare); if (p) B.facing = Math.atan2(p.y - B.y, p.x - B.x); }
      acc += dt; if (acc < STEP) return;
      acc = 0;
      for (const p of f.alive()) {
        let h = hist.get(p.id); if (!h) hist.set(p.id, h = []);
        const l = h[h.length - 1];
        if (!l || Math.hypot(p.x - l.x, p.y - l.y) >= 12) h.push({ x: p.x, y: p.y, t: f.t });
        while (h.length && h[0].t < f.t - KEEP) h.shift();
      }
    });
    const trail = (pid, span) => {
      const from = f.t - span, out = [];
      for (const q of hist.get(pid) || []) if (q.t >= from) out.push(q);
      const p = live(pid);
      if (p) { const l = out[out.length - 1]; if (!l || Math.hypot(p.x - l.x, p.y - l.y) > 4) out.push({ x: p.x, y: p.y, t: f.t }); }
      return out;
    };
    const lenOf = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; };
    const walked = (pid, span) => lenOf(trail(pid, span));
    const simplify = (pts, tol = 16) => {
      if (pts.length < 3) return pts.slice();
      const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
      const stack = [[0, pts.length - 1]];
      while (stack.length) {
        const [a, b] = stack.pop(), ax = pts[a].x, ay = pts[a].y, dx = pts[b].x - ax, dy = pts[b].y - ay, l2 = dx * dx + dy * dy;
        let far = -1, fd = tol;
        for (let i = a + 1; i < b; i++) {
          const u = l2 ? Math.max(0, Math.min(1, ((pts[i].x - ax) * dx + (pts[i].y - ay) * dy) / l2)) : 0, d = Math.hypot(pts[i].x - ax - dx * u, pts[i].y - ay - dy * u);
          if (d > fd) { fd = d; far = i; }
        }
        if (far > 0) { keep[far] = true; stack.push([a, far], [far, b]); }
      }
      return pts.filter((_, i) => keep[i]);
    };
    // lay a ride along a line of steps: red pieces that land as the rider reaches them. o: { delay, w, speed, tag, dmg, who, kind }
    const layRun = (raw, o) => {
      const pts = simplify(raw).map(q => [q.x, q.y]), along = [0], group = new Set();
      for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = along[along.length - 1];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sl = along[i] - along[i - 1], ang = Math.atan2(by - ay, bx - ax);
        if (sl < 6) continue;
        for (let u0 = 0; u0 < sl - 1;) {
          const u = Math.min(sl, u0 + 280);
          f.aoe({ kind: 'rect', x: rd(ax + Math.cos(ang) * u0), y: rd(ay + Math.sin(ang) * u0), angle: +ang.toFixed(3), len: rd(u - u0), w: o.w }, o.delay + (along[i - 1] + u) / o.speed, dmg[o.dmg], { tag: o.tag, group });
          u0 = u;
        }
        if (i < pts.length - 1) f.aoe({ kind: 'circle', x: rd(bx), y: rd(by), r: rd(o.w / 2) }, o.delay + along[i] / o.speed, dmg[o.dmg], { tag: o.tag, group });
      }
      f.emit({ t: 'roomev', k: 'mlpath:' + (++pathN), l: pts.map(([x, y]) => [rd(x), rd(y)]), w: o.w, sp: o.speed, at: +o.delay.toFixed(2), who: o.who ?? null, kd: o.kind || 'run',
        dur: +(o.delay + L / o.speed + 0.6).toFixed(2) });
      return { pts, L, end: o.delay + L / o.speed };
    };
    // he hunts what runs: a trail of 600 or more ends in a pounce of 150; the shorter the trail the wider the pounce (a hero who stood still is fallen on, 390), and
    // the wider the pounce the longer it hangs before it lands (0.6 s to 1.4 s)
    const POUNCE_R = L => rd(150 + Math.max(0, 600 - L) * 0.4);
    const HANG = r => 0.6 + (r - 150) / 300;
    const pickPrey = (n = 1, not = []) => {
      let pool = f.nonTanks().filter(p => !not.includes(p.id)); if (!pool.length) pool = f.alive().filter(p => !not.includes(p.id));
      if (pool.length > n && lastPrey != null) pool = pool.filter(p => p.id !== lastPrey);
      return f.shuffle(pool).slice(0, n);
    };
    // the rider runs a laid line (untargetable while she does)
    const runBoss = (pts, speed, done) => {
      if (f.state !== 'live') return;
      B.x = pts[0][0]; B.y = pts[0][1]; B.untargetable = true; B.lockFacing = true;
      let i = 1;
      const next = () => {
        if (f.state !== 'live') return;
        if (i >= pts.length) { if (done) done(); return; }
        const [x, y] = pts[i++];
        if (Math.hypot(x - B.x, y - B.y) > 1) B.facing = Math.atan2(y - B.y, x - B.x);
        B.moveTo = { x, y, speed, done: next };
      };
      next();
    };

    // --- moonlets ----------------------------------------------------------------------------------------------------------------------------
    // Small moons fall on two heroes (a spread) and stay where they land. Every one bursts when a waxing dance ends in Full Moon (r 150, painted from the cut's
    // outline); one never lit fades by itself after 40 s.
    const moons = [];
    const addMoon = (x, y) => {
      const p = ARENA.clamp({ x, y }, 60), m = { x: rd(p.x), y: rd(p.y), born: f.t, id: 0 };
      m.pr = f.addProp({ kind: 'moonlet', shape: 'circle', x: m.x, y: m.y, r: 34, hp: 0, solid: false, cover: false, rubble: false });
      m.id = m.pr.id; moons.push(m);
      ev('mlmoonlet', { id: m.id, x: m.x, y: m.y, dur: 40 });
      f.afterKeep(40, () => dropMoon(m, false));
    };
    const dropMoon = (m, burst) => {
      const i = moons.indexOf(m); if (i < 0) return;
      moons.splice(i, 1); f.removeProp(m.pr);
      ev('mlmoonx', { id: m.id, x: m.x, y: m.y, burst: burst ? 1 : 0, dur: 1.5 });
    };
    // every moonlet bursts `delay` s from now (painted from now)
    // (Hard, Harvest: a moonlet that a cut of the dance has already lit bursts wider, 230 and not 150: `before` are the cuts of the dance that land ahead of the last)
    const burstAll = (delay, before) => {
      for (const m of [...moons]) {
        const twice = !!(H && before && before.some(c => !(c.ph === 'full' && !c.umb) && SHAPES.contains(lune(c.ph, c.turn, c.umb), m.x, m.y, 0))), br = twice ? 230 : 150;
        f.aoe({ kind: 'circle', x: m.x, y: m.y, r: br }, delay, twice ? dmg.burst * 1.1 : dmg.burst, { tag: twice ? 'mlHarvest' : 'mlBurst' });
        ev('mlburst', { id: m.id, x: m.x, y: m.y, r: br, twice: twice ? 1 : 0, at: +delay.toFixed(2), dur: +(delay + 0.8).toFixed(2) });
        f.afterKeep(delay, () => dropMoon(m, true));
      }
    };

    // --- the cuts ---------------------------------------------------------------------------------------------------------------------------------
    const NAMES = { crescent: 'Crescent', half: 'Half Moon', gibbous: 'Gibbous' };
    const WARN = 3.0, WIN = 2.7;   // (how long a cut's floor is painted before it lands: a single's (the same on every difficulty: the room is wide and the walk long), and a dance's later cuts' (a cast time, so Hard shortens it))
    // one cut: the crown shows it for the whole cast, then the same shape is painted red on the floor with a real warning
    const single = (ph, o = {}) => () => {
      const d = f.ct(o.d || 4.6), warn = WARN, c = { ph, turn: o.turn ?? newTurn(), umb: o.umb ? 1 : 0 }, name = o.name || ((o.umb ? 'Umbral ' : '') + NAMES[ph]);
      f.cast(name, d, 'cut'); busy(d + 0.5); holdCrown(d + 0.3);
      setCrown({ phase: ph, turn: c.turn, wax: o.wax ?? 1, umbral: c.umb });
      const pe = pendAdd(c, f.t + d);
      ev('mlcut', { ph, turn: +c.turn.toFixed(3), umb: c.umb, wax: crown.wax, kd: 'single', n: 1, of: 1, final: 0, at: +d.toFixed(2), warn: +warn.toFixed(2), dur: +(d + 1).toFixed(2) });
      f.afterKeep(d - warn, () => { if (f.state !== 'live') return; pe.laid = true; layCut(c, warn, c.umb ? dmg.umbral : dmg.cut); });
      f.afterKeep(d, () => f.anim('cut', 0.5, { who: 'v', n: 1 }));
    };
    // Full Moon: the whole floor is lit (the healer's raidwide)
    const fullMoon = () => {
      const d = f.ct(4.6);
      f.cast('Full Moon', d, 'full'); busy(d + 0.4); holdCrown(d + 0.3);
      setCrown({ phase: 'full', turn: crown.turn, wax: 1, umbral: 0 });
      ev('mlcut', { ph: 'full', turn: +crown.turn.toFixed(3), umb: 0, wax: 1, kd: 'single', n: 1, of: 1, final: 0, at: +d.toFixed(2), warn: +d.toFixed(2), dur: +(d + 1).toFixed(2) });
      raidwide(d, dmg.full, 'mlFull');
    };
    // Earthshine: a cut at the tank and its pale second hit a beat later. In the saddle she rides where the tank has walked: the line of the tank's last 5 s is
    // laid red along the whole ride, so the party stands out of the tank's wake.
    const earthshine = (scale = 1) => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.2), gap = f.ct(1.6);
      f.cast('Earthshine', d + gap, 'buster'); busy(d + gap + 0.5);
      const cone = () => ({ kind: 'cone', x: rd(B.x), y: rd(B.y), r: 360, arc: 1.25, angle: B.facing });
      f.mech({ type: 'buster', shape: cone(), delay: d, dmg: dmg.earth * scale, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
      f.mech({ type: 'buster', shape: cone(), delay: d + gap, dmg: dmg.earth * 0.55 * scale, target: tank.id, aimFromBoss: tank.id, tag: 'mlEarthshine2' });
      ev('mlearth', { at: +d.toFixed(2), gap: +gap.toFixed(2), saddle: form === 2 ? 1 : 0, dur: +(d + gap + 0.8).toFixed(2) });
      if (form === 2) {
        f.afterKeep(d - LOCK, () => {
          if (f.state !== 'live') return;
          const tr = trail(tank.id, 5);
          if (lenOf(tr) >= 160) layRun(tr, { delay: LOCK, w: 100, speed: 1400, tag: 'mlRide', dmg: 'ride', who: tank.id, kind: 'ride' });
        });
      }
    };
    // Moonwell: two shafts of light that need two heroes each (blue)
    const moonwell = () => {
      const d = f.ct(5.2), pts = [];
      for (let i = 0; i < 40 && pts.length < 2; i++) {
        const a = f.rng() * TAU, r = 120 + f.rng() * 250, p = { x: rd(Math.cos(a) * r), y: rd(Math.sin(a) * r) };
        if (!pts.length || Math.hypot(p.x - pts[0].x, p.y - pts[0].y) >= 340) pts.push(p);
      }
      pts.length = Math.max(1, Math.min(pts.length, Math.floor(f.alive().length / 2)));
      f.cast('Moonwell', d, 'call'); busy(d + 0.4);
      for (const p of pts) f.mech({ type: 'tower', shape: { kind: 'circle', x: p.x, y: p.y, r: 95 }, delay: d, dmg: dmg.well, need: 2, failDmg: dmg.wellFail, tag: 'mlWell' });
      ev('mlwell', { pts: pts.map(p => [p.x, p.y]), r: 95, at: +d.toFixed(2), dur: +(d + 0.8).toFixed(2) });
    };
    // Moonlets: two heroes carry a small moon each (a spread); it is set down where they stand and stays. The crown shows the turn of the dance that follows.
    let nextDance = null;
    const moonlets = () => {
      const d = f.ct(4.2), pool = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 2);
      if (!pool.length) return;
      nextDance = newTurn(); holdCrown(d + 1.6);
      f.cast('Moonlets', d, 'call'); busy(d + 0.4);
      setCrown({ phase: 'crescent', turn: nextDance, wax: 1, umbral: 0 });
      ev('mlmoonlets', { ids: pool.map(p => p.id), turn: +nextDance.toFixed(3), at: +d.toFixed(2), dur: +(d + 1).toFixed(2) });
      for (const p of pool) {
        f.mark(p.id, { sym: 'dot', col: '#dfe9f5', dur: d, key: 'mlmoon' });
        const m = f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.moonlet, follow: p.id, tag: 'mlMoonlet', onResolve: () => addMoon(m.shape.x, m.shape.y) });
      }
    };

    // --- Hard: Two Crowns, Annular, Libration -------------------------------------------------------------------------------------------------------
    // Layers on the cuts, never hidden tells: each is cast under its own name, the crown shows what it will be, and the floor is painted for a full warning (never under 1.2 s).
    const litAt = (c, x, y, pad) => SHAPES.contains(lune(c.ph, c.turn, c.umb), x, y, pad);
    const safeFrac = (a, b) => {
      let n = 0, m = 0;
      for (let x = -480; x <= 480; x += 48) for (let y = -480; y <= 480; y += 48) { if (Math.hypot(x, y) > 480) continue; m++; if (!litAt(a, x, y, 45) && !litAt(b, x, y, 45)) n++; }
      return n / m;
    };
    // Two Crowns: her reflection in the dust shows a second phase with its own turn (the room event mlcrown2); both cuts land together, and the safe ground is what neither lights
    const twoCrowns = () => {
      const d = f.ct(5.8), warn = WARN, P3 = ['crescent', 'half', 'gibbous'];
      let pair = null;
      for (let i = 0; i < 40 && !pair; i++) {
        const a = { ph: P3[Math.floor(f.rng() * 3)], turn: newTurn(), umb: 0 }, b = { ph: P3[Math.floor(f.rng() * 3)], turn: wrap(a.turn + 1.3 + f.rng() * 3.6), umb: 0 };
        if (safeFrac(a, b) >= 0.17) pair = [a, b];
      }
      if (!pair) { const T = newTurn(); pair = [{ ph: 'crescent', turn: T, umb: 0 }, { ph: 'crescent', turn: wrap(T + PI), umb: 0 }]; }
      const [a, b] = pair, group = new Set();
      f.cast('Two Crowns', d, 'cut'); busy(d + 0.5); holdCrown(d + 0.3);
      setCrown({ phase: a.ph, turn: a.turn, wax: 1, umbral: 0 });
      setCrown2({ on: 1, phase: b.ph, turn: b.turn, wax: 1, umbral: 0 });
      f.afterKeep(d + 0.4, () => setCrown2({ on: 0, phase: 'new', turn: b.turn }));
      const pa = pendAdd(a, f.t + d), pb = pendAdd(b, f.t + d);
      [a, b].forEach((c, i) => ev('mlcut', { ph: c.ph, turn: +c.turn.toFixed(3), umb: 0, wax: 1, kd: 'twin', crown: i + 1, n: i + 1, of: 2, final: 0, at: +d.toFixed(2), warn: +warn.toFixed(2), dur: +(d + 1).toFixed(2) }));
      f.afterKeep(d - warn, () => { if (f.state !== 'live') return; pa.laid = pb.laid = true; layCut(a, warn, dmg.cut, { group }); layCut(b, warn, dmg.cut, { group, tag: 'mlTwin' + CAP[b.ph] }); });
      f.afterKeep(d, () => f.anim('cut', 0.5, { who: 'v', n: 1 }));
    };
    // Annular: a ring of light, a donut cut that leaves the middle and the rim (the crown is full with a dark middle: mlcrown ring 1)
    const annular = () => {
      const d = f.ct(4.8), warn = WARN, c = { ph: 'ring', turn: 0, umb: 0 };
      f.cast('Annular', d, 'cut'); busy(d + 0.5); holdCrown(d + 0.3);
      setCrown({ phase: 'full', ring: 1, turn: crown.turn, wax: 1, umbral: 0 });
      const pe = pendAdd(c, f.t + d);
      ev('mlcut', { ph: 'ring', turn: 0, umb: 0, wax: 1, kd: 'single', n: 1, of: 1, final: 0, at: +d.toFixed(2), warn: +warn.toFixed(2), r: RING.r, r2: RING.r2, dur: +(d + 1).toFixed(2) });
      f.afterKeep(d - warn, () => { if (f.state !== 'live') return; pe.laid = true; layCut(c, warn, dmg.ring); });
      f.afterKeep(d, () => f.anim('cut', 0.5, { who: 'v', n: 1 }));
    };
    // Libration: the crown rocks a quarter-turn once after the cut is shown and locks (it turns once and stops, never sweeps); the floor is painted from the lock, 3 s or more before it lands
    const libration = () => {
      const d = f.ct(6.4), t1 = f.ct(2.4), warn = d - t1 - 0.2, ph = f.shuffle(['crescent', 'half', 'gibbous'])[0], T0 = newTurn(), dir = f.rng() < 0.5 ? 1 : -1, T1 = wrap(T0 + dir * PI / 2), c = { ph, turn: T1, umb: 0 };
      f.cast('Libration', d, 'cut'); busy(d + 0.5); holdCrown(d + 0.3);
      setCrown({ phase: ph, turn: T0, wax: 1, umbral: 0 });
      const pe = pendAdd(c, f.t + d); pe.shape = null;   // (not known until it locks)
      ev('mlcut', { ph, turn: +T0.toFixed(3), umb: 0, wax: 1, kd: 'libration', n: 1, of: 1, final: 0, at: +d.toFixed(2), warn: +warn.toFixed(2), dur: +(d + 1).toFixed(2) });
      f.afterKeep(t1, () => {
        if (f.state !== 'live') return;
        lastTurn = T1; setCrown({ phase: ph, turn: T1, wax: 1, umbral: 0 });
        ev('mllibrate', { from: +T0.toFixed(3), to: +T1.toFixed(3), dir, ph, lock: +(d - t1).toFixed(2), warn: +warn.toFixed(2), dur: +(d - t1 + 1).toFixed(2) });
        f.afterKeep(0.2, () => { if (f.state !== 'live') return; pe.shape = lune(ph, T1); pe.laid = true; layCut(c, warn, dmg.cut, { tag: 'mlLib' + CAP[ph] }); });
      });
      f.afterKeep(d, () => f.anim('cut', 0.5, { who: 'v', n: 1 }));
    };
    // Moonfall (Hard, in the wall): a moonlet falls on one hero in the middle of the dance and stays; it bursts when the light comes back
    const moonfall = then => {
      if (f.state !== 'live') return;
      const d = f.ct(3.4), pool = f.alive().filter(p => p.id !== lastStep && p.id !== (f.tank() || {}).id), p = f.shuffle(pool.length ? pool : f.alive())[0];
      if (!p) { if (then) then(); return; }
      f.cast('Moonfall', d, 'call'); busy(d + 0.4);
      f.mark(p.id, { sym: 'dot', col: '#dfe9f5', dur: d, key: 'mlmoonfall' });
      ev('mlmoonfall', { id: p.id, at: +d.toFixed(2), dur: +(d + 1).toFixed(2) });
      const m = f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.moonfall, follow: p.id, tag: 'mlMoonfall', onResolve: () => addMoon(m.shape.x, m.shape.y) });
      if (then) f.afterKeep(d + 0.5, then, 'Moonless Steps');
    };

    // --- Extreme: Moon-Touched and The Second Howl ------------------------------------------------------------------------------------------------------
    // Moon-Touched: two heroes carry an eye mark: for 20 s light does not harm them and darkness does (a cut of the phases, a ring, a pass's cut strikes them wherever it is NOT painted).
    const touchedAt = new Map();   // id -> { from, end }
    const isTouched = id => { const e = touchedAt.get(id); return !!e && f.t >= e.from && f.t < e.end; };
    const touched = () => {
      const pool = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 2); if (!pool.length) return;
      const d = f.ct(3.4), LIFE = 20;
      f.cast('Moon-Touched', d, 'call'); busy(d + 0.4);
      ev('mltouch', { ids: pool.map(p => p.id), at: +d.toFixed(2), life: LIFE, dur: +(d + LIFE + 0.5).toFixed(2) });
      for (const p of pool) { touchedAt.set(p.id, { from: f.t + d, end: f.t + d + LIFE }); f.mark(p.id, { sym: 'eye', col: '#f2c9a0', dur: d + LIFE, key: 'mleye' }); }
    };
    const CUT_TAG = /^ml(Crescent|Half|Gibbous|UCrescent|UHalf|Twin|Annular|Pass|Lib)/;
    const innerPt = sh => {
      if (sh.kind === 'donut') return { x: sh.x + (sh.r + sh.r2) / 2, y: sh.y };
      const k = sh.ph === 'crescent' ? 0.85 : 0.3; return { x: sh.x + Math.cos(sh.angle) * k * sh.r, y: sh.y + Math.sin(sh.angle) * k * sh.r };
    };
    const resolve0 = f.resolveMech.bind(f);
    f.resolveMech = m => {
      if (!X || !m.shape || !CUT_TAG.test(m.tag || '') || ![...touchedAt.keys()].some(isTouched)) return resolve0(m);
      const alive0 = f.alive, inner = innerPt(m.shape);
      f.alive = () => alive0.call(f).map(q => {
        if (!isTouched(q.id)) return q;
        return Object.assign(Object.create(Object.getPrototypeOf(q)), q, SHAPES.contains(m.shape, q.x, q.y, 14) ? { x: 99999, y: 99999 } : { x: inner.x, y: inner.y });
      });
      try { resolve0(m); } finally { f.alive = alive0; }
    };
    // The Second Howl: in the middle of the Last Dance Garrow's shade comes up the road again and runs the freshest trail (the hero who has walked the most in the last 3 s); a head mark, then the corridor, then the pounce
    const secondHowl = () => {
      if (f.state !== 'live') return;
      const al = f.alive(); if (!al.length) return;
      let best = al[0], bw = -1;
      for (const p of al) { const w = walked(p.id, 3); if (w > bw) { bw = w; best = p; } }
      // (the howl is a named bar as long as the head mark: the bar, the sound and the journal say it. It is a bar only, as Wyrm's Marked Prey: the boss is still casting the dance, with the dance's own
      //  name and end, to the sim, the kits and the recap; only what the clients show of the cast changes, for those 1.5 s)
      f.emit({ t: 'bcast', name: 'The Second Howl', dur: LOCK, anim: 'call' });
      f.mark(best.id, { sym: 'prey', col: '#e2f2ff', dur: LOCK, key: 'mlhowl2' });
      ev('mlhowl2', { pid: best.id, at: LOCK, dur: 8 });
      f.afterKeep(LOCK, () => {
        if (f.state !== 'live') return;
        const raw = trail(best.id, SPAN), L0 = lenOf(raw);
        let pts = raw.map(q => ({ x: q.x, y: q.y })); if (!pts.length) { const p = live(best.id); if (p) pts = [{ x: p.x, y: p.y }]; } if (!pts.length) return;
        const s0 = pts[0], a = Math.hypot(s0.x, s0.y) > 40 ? Math.atan2(s0.y, s0.x) : f.rng() * TAU;
        pts = [{ x: Math.cos(a) * (R + 40), y: Math.sin(a) * (R + 40) }, ...pts];
        const run = layRun(pts, { delay: LOCK, w: 110, speed: SPEED, tag: 'mlShade', dmg: 'run', who: best.id, kind: 'shade' });
        const end = run.pts[run.pts.length - 1], pr = POUNCE_R(L0), landAt = LOCK + run.L / SPEED + HANG(pr);
        f.aoe({ kind: 'circle', x: rd(end[0]), y: rd(end[1]), r: pr }, landAt, dmg.pounce, { tag: 'mlShadePounce' });
        ev('mlpounce', { x: rd(end[0]), y: rd(end[1]), r: pr, at: +landAt.toFixed(2), kd: 'shade', dur: +(landAt + 1).toFixed(2) });
      });
    };

    // --- the dances ---------------------------------------------------------------------------------------------------------------------------------
    // Cuts in the moon's own order on one turn, so the whole dance can be read from its first. Each is laid `win` s before it lands: the landing cut is solid and only
    // the next an outline. It climbs: each cut lands a little sooner and hits a little harder, and the last is the one to remember (a Full Moon, with every moonlet bursting
    // a beat after it).
    const danceRun = (name, cuts, lead, gaps, o = {}) => {
      const lands = [f.ct(lead)];
      for (const g of gaps) lands.push(lands[lands.length - 1] + f.ct(g));
      const N = cuts.length, last = lands[N - 1], burst = moons.length ? f.ct(1.1) : 0, total = last + 0.3 + burst;
      f.cast(name, total, 'dance'); busy(total + 0.5); holdCrown(total);
      ev('mldance', { name, n: N, wax: o.wax ?? 1, lands: lands.map(l => +l.toFixed(2)), dur: +(total + 1).toFixed(2) });
      cuts.forEach((c, k) => {
        c.umb = c.umb ? 1 : 0;
        const win = Math.min(k === 0 ? WARN : f.ct(WIN), lands[k] - (k === 0 ? 0.2 : lands[k - 1] - 0.5)), fin = k === N - 1, amt = (c.umb ? dmg.umbral : dmg.cut) * (1 + 0.05 * k);
        const pe = pendAdd(c, f.t + lands[k]);
        const show = () => {
          if (f.state !== 'live') return;
          setCrown({ phase: c.ph, turn: c.turn, wax: o.wax ?? 1, umbral: c.umb });
          pe.laid = true;
          layCut(c, win, c.ph === 'full' && !c.umb ? dmg.full * (fin ? FINM : 1) : amt);
          ev('mlcut', { ph: c.ph, turn: +c.turn.toFixed(3), umb: c.umb, wax: o.wax ?? 1, kd: 'dance', n: k + 1, of: N, final: fin ? 1 : 0, at: +win.toFixed(2), warn: +win.toFixed(2), dur: +(win + 0.9).toFixed(2) });
          if (fin && moons.length) burstAll(win + burst, cuts.slice(0, N - 1));
        };
        if (k === 0) { setCrown({ phase: c.ph, turn: c.turn, wax: o.wax ?? 1, umbral: c.umb }); f.afterKeep(Math.max(0.2, lands[0] - win), show); }
        else f.afterKeep(lands[k] - win, show);
        f.afterKeep(lands[k], () => { f.anim('cut', 0.5, { who: 'v', n: k + 1 }); if (fin) ev('mlpeak', { n: N, dur: 1.4 }); });
      });
      if (o.beat) f.afterKeep(last, () => {}, o.beat);   // (for the feed: the dance's last cut is a Full Moon, named so the feed reads across a dance that lasts longer than a calm)
      if (o.howl) f.afterKeep(lands[1] + 0.3, secondHowl, 'The Second Howl');   // (Extreme, The Second Howl: in the middle of the dance; named, so the feed shows it)
      f.afterKeep(total, () => { pendTidy(); ev('mldanceend', { dur: 1.2 }); });
    };
    // (Hard: a Waxing Dance that follows Moonlets is Harvest. Extreme, Blood Moon Rising: one cut of every dance is umbral, shown by the red limb of the crown: Blood Moon Dance, Blood Harvest)
    const waxingDance = () => {
      const T = nextDance != null ? nextDance : newTurn(); nextDance = null;
      const nm = X ? (moons.length ? 'Blood Harvest' : 'Blood Moon Dance') : H && moons.length ? 'Harvest' : 'Waxing Dance';
      danceRun(nm, [{ ph: 'crescent', turn: T }, { ph: 'half', turn: T }, { ph: 'gibbous', turn: T, umb: X ? 1 : 0 }, { ph: 'full', turn: T }], 4.4, [2.2, 2.0, 2.0], { wax: 1 });
    };
    const waningDance = () => { const T = newTurn(); nextDance = null; danceRun(X ? 'Blood Moon Dance' : 'Waning Dance', [{ ph: 'full', turn: T }, { ph: 'gibbous', turn: T }, { ph: 'half', turn: T, umb: X ? 1 : 0 }, { ph: 'crescent', turn: T }], 4.8, [3.2, 2.2, 2.2], { wax: -1 }); };

    // --- the Hunt's Pass and the Hound's Return -----------------------------------------------------------------------------------------------------
    // A ride along a hero's trail (Garrow's rule: a long trail ends in a small pounce, a short one in a wide pounce). prey: the hero; o.cut: a crown cut she makes as she passes
    // (the second reading); o.approach: he comes up the road from the edge of the room to the start of the trail (the Hound's Return).
    const lockRide = (id, o) => {
      if (f.state !== 'live') return;
      stare = null;
      const raw = trail(id, SPAN), L0 = lenOf(raw);
      let pts = raw.map(q => ({ x: q.x, y: q.y }));
      if (!pts.length) { const p = live(id); if (p) pts = [{ x: p.x, y: p.y }]; }
      if (!pts.length) { B.lockFacing = false; return; }
      if (o.approach) {
        const s0 = pts[0], d0 = Math.hypot(s0.x, s0.y), a = d0 > 40 ? Math.atan2(s0.y, s0.x) : f.rng() * TAU;
        pts = [{ x: Math.cos(a) * (R + 40), y: Math.sin(a) * (R + 40) }, ...pts];
      }
      const run = layRun(pts, { delay: LOCK, w: 110, speed: SPEED, tag: 'mlRun', dmg: 'run', who: id, kind: o.approach ? 'return' : 'pass' });
      const end = run.pts[run.pts.length - 1], pr = POUNCE_R(L0), landAt = LOCK + run.L / SPEED + HANG(pr);
      f.aoe({ kind: 'circle', x: rd(end[0]), y: rd(end[1]), r: pr }, landAt, dmg.pounce, { tag: 'mlPounce' });
      ev('mlpounce', { x: rd(end[0]), y: rd(end[1]), r: pr, at: +landAt.toFixed(2), dur: +(landAt + 1).toFixed(2) });
      busy(landAt + 1.4);
      f.maelisRuns = f.maelisRuns || []; f.maelisRuns.push({ t: +f.t.toFixed(1), L: rd(L0), r: pr, kind: o.approach ? 'return' : 'pass' });   // (for tools and testing)
      if (o.approach) {
        // the Hound runs the road and the trail and pounces where it ends; she vaults onto him a beat after it lands, and is the Wild Hunt from then on
        raidwide(landAt + 0.5, dmg.open * 1.3, 'mlOpen');   // (the pounce shakes the floor: a light beat for the healer as she mounts)
        f.afterKeep(landAt + 0.5, () => mount(end[0], end[1]));
      } else {
        raidwide(landAt, dmg.open * 1.3, 'mlOpen');   // (the pounce shakes the floor)
        f.afterKeep(LOCK, () => { f.anim('ride', run.L / SPEED + 0.15); runBoss(run.pts, SPEED, () => f.anim('ride', Math.max(0.7, landAt - LOCK - run.L / SPEED + 0.1))); });
        const home = { x: B.x, y: B.y };
        f.afterKeep(landAt + 0.9, () => {
          if (f.state !== 'live') return;
          B.moveTo = { x: home.x, y: home.y, speed: 1500, done: () => { B.untargetable = false; B.lockFacing = false; B.autoAt = Math.max(B.autoAt, f.t + 1.5); } };
        });
      }
    };
    const huntPass = () => {
      const p = pickPrey(1)[0]; if (!p) return;
      const d = f.ct(5.6), ph = f.shuffle(['crescent', 'half', 'gibbous'])[0], c = { ph, turn: newTurn(), umb: 0 };
      f.cast("Hunt's Pass", d, 'ride'); busy(d + 3.2); holdCrown(d + 1);
      lastPrey = p.id; stare = p.id; B.lockFacing = true;
      setCrown({ phase: ph, turn: c.turn, wax: 1, umbral: 0 });
      f.mark(p.id, { sym: 'prey', col: '#e2f2ff', dur: d - LOCK, key: 'mlprey' });
      // the second reading: the cut she makes as she passes the middle of the ride, painted from near the start of the cast (it lands 0.5 s after the ride begins)
      const lay = Math.min(1.2, d - 3.2), landIn = d - lay + 0.5, pe = pendAdd(c, f.t + d + 0.5);
      ev('mlcut', { ph, turn: +c.turn.toFixed(3), umb: 0, wax: 1, kd: 'pass', n: 1, of: 1, final: 0, at: +(lay + landIn).toFixed(2), warn: +landIn.toFixed(2), who: p.id, dur: +(lay + landIn + 1).toFixed(2) });
      f.afterKeep(lay, () => { if (f.state !== 'live') return; pe.laid = true; layCut(c, landIn, dmg.cut, { tag: 'mlPass' + CAP[ph] }); });
      f.afterKeep(d - LOCK, () => lockRide(p.id, {}));
    };
    // mounted: the Hound has landed; she goes to him
    const mount = (x, y) => {
      if (f.state !== 'live') return;
      B.untargetable = true; B.lockFacing = true;
      const from = { x: B.x, y: B.y };
      ev('mlmount', { x: rd(x), y: rd(y), fx: rd(from.x), fy: rd(from.y), dur: 2.4 });
      f.anim('mount', 1.2);
      B.moveTo = { x, y, speed: 1500, done: () => {
        form = 2; f.setForm('hunt'); ev('mlform', { n: 2, x: rd(B.x), y: rd(B.y), dur: 9999 });
        B.untargetable = false; B.lockFacing = false; B.autoAt = Math.max(B.autoAt, f.t + 2.5);
      } };
    };
    // The Hound's Return: his howl is heard before he is seen. The freshest trail in the dust (the hero who has walked the most in the last 3 s) is his road: it locks, he runs it and
    // pounces where it ends, and she mounts him there. The party sets where she is when the Hunt begins.
    const houndReturn = () => {
      act = 4;
      const d = f.ct(6.4), tFresh = d * 0.34, tHold = d * 0.56;
      f.cast("The Hound's Return", d, 'call'); busy(d + 3.6);
      ev('mlact', { n: 4, part: 1, dur: +(d + 2).toFixed(2) });
      ev('mlhowl', { at: 0, dur: +(d * 0.56).toFixed(2) });
      f.afterKeep(tFresh, () => {
        if (f.state !== 'live') return;
        const al = f.alive(); if (!al.length) return;
        let best = al[0], bw = -1;
        for (const p of al) { const w = walked(p.id, 3); if (w > bw) { bw = w; best = p; } }
        lastPrey = best.id; stare = best.id;
        f.mark(best.id, { sym: 'prey', col: '#e2f2ff', dur: d - LOCK - tFresh, key: 'mlfresh' });
        ev('mlfresh', { pid: best.id, dur: +(d - tFresh).toFixed(2) });
      });
      f.afterKeep(tHold, () => ev('mlreturnhold', { dur: +(d - LOCK - tHold).toFixed(2) }));   // the held beat: nothing on the floor
      f.afterKeep(d - LOCK, () => {
        if (f.state !== 'live') return;
        const id = stare != null && live(stare) ? stare : (f.alive()[0] || {}).id;
        if (id == null) return;
        ev('mlreturn', { pid: id, at: +LOCK.toFixed(2), dur: 8 });
        lockRide(id, { approach: true });
      });
    };

    // --- the openers (a short named cast, a room event and one light raidwide) ---------------------------------------------------------------------------
    const opener = (n, name, d0, o = {}) => spaced(f.ct(d0), () => {
      const d = f.ct(d0);
      f.cast(name, d, o.anim || 'full'); busy(d + 0.4);
      ev('mlact', { n, part: o.part || 1, dur: +(d + 1.2).toFixed(2) });
      raidwide(d, dmg.open, 'mlOpen');
    });
    const moonrise = () => { act = 1; opener(1, 'Moonrise', 3.0); };
    const waxingOpen = () => { act = 2; opener(2, 'The Waxing', 3.2); };
    const huntersMoon = () => { part = 2; opener(4, "Hunter's Moon", 3.2, { part: 2, anim: 'full' }); };

    // --- New Moon (the wall) -----------------------------------------------------------------------------------------------------------------------
    // The crown goes dark and so does the room (the floor dims; every telegraph stays as bright as ever). The sword dance: six dashes, each foretold by a thin silver line
    // from her to a hero (a number over their head), one at a time, each ending in a small crescent cut. A pool of the last light (a blue stack) is laid for the party while
    // each dash is on its way. When the last light is gathered (everyone in it: the party's own doing) the room holds for a breath, and Full Moon brings the light back.
    let lastStep = null, poolA = 0, poolPrev = null;
    const POOL_R = [210, 195, 180, 165, 150, 140, 132, 126], NSTEP = H ? 8 : 6;   // (Hard: Moonless Steps of eight)
    const poolSpot = (avoid, minB = 330) => {
      for (let i = 0; i < 24; i++) {
        const a = f.rng() * TAU, r = 90 + f.rng() * 250, p = { x: rd(Math.cos(a) * r), y: rd(Math.sin(a) * r) };
        if (Math.hypot(p.x - B.x, p.y - B.y) >= minB && (!avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) >= 220) && moons.every(m => Math.hypot(p.x - m.x, p.y - m.y) >= 330)) return p;
      }
      const d = Math.hypot(B.x, B.y) || 1;
      return { x: rd(-B.x / d * 260), y: rd(-B.y / d * 260) };
    };
    const step = (k, SL) => {
      if (f.state !== 'live') return;
      const al = f.alive(); if (!al.length) return;
      const cand = al.filter(p => p.id !== lastStep), h = f.shuffle(cand.length ? cand : al)[0]; lastStep = h.id;
      const lock = f.ct(1.4), land = f.ct(3.0), landC = land + f.ct(0.5), landP = f.ct(3.6);
      f.mark(h.id, { sym: 'num', n: k + 1, col: '#dfe9f5', dur: lock, key: 'mlstep' });
      ev('mlstep', { i: k, of: NSTEP, who: h.id, x1: rd(B.x), y1: rd(B.y), x2: rd(h.x), y2: rd(h.y), lock: +lock.toFixed(2), at: +land.toFixed(2), dur: +(land + 0.8).toFixed(2) });
      // the pool of the last light: a blue stack, shrinking, somewhere clear of her and of the last one
      const pp = poolSpot(poolPrev), pr = POOL_R[Math.min(k, NSTEP - 1)];
      poolPrev = pp;
      f.mech({ type: 'stack', shape: { kind: 'circle', x: pp.x, y: pp.y, r: pr }, delay: landP, dmg: dmg.pool, need: Math.max(1, f.alive().length - 1), tag: 'mlPool' });
      ev('mlpool', { i: k, x: pp.x, y: pp.y, r: pr, at: +landP.toFixed(2), last: 0, dur: +(landP + 0.8).toFixed(2) });
      f.afterKeep(lock, () => {
        if (f.state !== 'live') return;
        const q = live(h.id); if (!q) return;
        const dx = q.x - B.x, dy = q.y - B.y, Ld = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx), len = Ld + 70, w = 90 + 5 * k, cr = 230 + 18 * k;   // (the dance climbs: each dash is a little wider and its crescent a little larger, the last the one to remember)
        f.aoe({ kind: 'rect', x: rd(B.x), y: rd(B.y), angle: +ang.toFixed(3), len: rd(len), w }, land - lock, dmg.dash, { tag: 'mlDash' });
        const cx = rd(q.x), cy = rd(q.y);
        f.aoe(lune('crescent', ang, 0, { x: cx, y: cy, r: cr }), landC - lock, dmg.stepCut, { tag: 'mlStepCut' });
        ev('mlstepl', { i: k, who: h.id, x1: rd(B.x), y1: rd(B.y), x2: rd(B.x + Math.cos(ang) * len), y2: rd(B.y + Math.sin(ang) * len), w, cx, cy, a: +ang.toFixed(3), r: cr, at: +(land - lock).toFixed(2), atc: +(landC - lock).toFixed(2), dur: +(landC - lock + 0.8).toFixed(2) });
        f.afterKeep(land - lock - 0.3, () => { if (f.state !== 'live') return; B.facing = ang; f.anim('dash', 0.5, { i: k }); B.moveTo = { x: cx, y: cy, speed: 2400 }; });
      });
    };
    const stepsRun = (k0, k1) => {
      const SL = f.ct(3.6), total = (k1 - k0) * SL + 0.2;
      f.cast('Moonless Steps', total, 'dash'); busy(total + 0.3);
      for (let k = k0; k < k1; k++) f.afterKeep((k - k0) * SL + 0.1, () => step(k, SL));
    };
    // the last light: everyone stands in the pool; if it is missed it is laid again (twice at most)
    const gather = rep => {
      if (f.state !== 'live') return;
      const d = f.ct(3.6), pp = poolSpot(null, 250), r = 190;
      f.cast('The Last Light', d, 'call'); busy(d + 0.4);
      f.mech({ type: 'stack', shape: { kind: 'circle', x: pp.x, y: pp.y, r }, delay: d, dmg: dmg.pool * 0.8, need: Math.max(1, f.alive().length), tag: 'mlPool',
        onResolve: ins => {
          const ok = ins.length >= f.alive().length || rep >= 2;
          ev('mlpoolmet', { ok: ins.length >= f.alive().length ? 1 : 0, met: ins.length, of: f.alive().length, dur: 1.2 });
          if (ok) f.afterKeep(0.15, heldBeat); else { layTail(1.2 + f.ct(3.6) + 6.15); f.afterKeep(1.2, () => gather(rep + 1), 'The Last Light'); }
        } });
      ev('mlpool', { i: 6, x: pp.x, y: pp.y, r, at: +d.toFixed(2), last: 1, dur: +(d + 0.8).toFixed(2) });
    };
    const heldBeat = () => {   // nothing on the floor, nothing cast: stillness in the dark, then the light comes back
      if (f.state !== 'live') return;
      const h = 1.5;
      ev('mlnmhold', { dur: h });
      B.moveTo = { x: 0, y: -60, speed: 700 }; B.facing = PI / 2;
      f.afterKeep(h, release, 'Full Moon');
    };
    const release = () => {
      if (f.state !== 'live') return;
      const d = 3.6;
      f.cast('Full Moon', d, 'full'); busy(d + 0.4); holdCrown(d + 0.5);
      setCrown({ phase: 'full', turn: crown.turn, wax: 1, umbral: 0 });
      ev('mlnmfull', { at: d, dur: +(d + 1.6).toFixed(2) });
      raidwide(d, dmg.full * FINM, 'mlFull');
      if (moons.length) burstAll(d + 1.1);   // (Hard: the moonlet that fell in the dance)
      f.afterKeep(d, () => { night = false; ev('mlnight', { on: 0, dur: 9999 }); });
      f.afterKeep(d + 0.9, () => {
        if (f.state !== 'live') return;
        wallOn = false; B.lockFacing = false; B.holdUntil = 0; B.noAutoUntil = 0;
        ev('mlnmdown', { dur: 1.5 });
        dropAnchors();
        if (f.wall) f.wallDown();
      });
    };
    // The wall ends when the party gathers the last light, so the feed cannot read the next act across it: the first two steps of The Wild Hunt (The Hound's Return, then an
    // Earthshine) stand in the feed as anchors while the wall runs, re-laid when the last light has to be laid again and dropped the moment the real act is laid out.
    const anchors = [];
    const dropAnchors = () => { for (const fn of anchors.splice(0)) f.events = f.events.filter(e => e.fn !== fn); };
    const layTail = dt => {   // (dt: how long from now the wall is expected to come down)
      dropAnchors();
      const lay1 = (d, name) => { const fn = () => {}; anchors.push(fn); f.atKeep(f.t + dt + d, fn, name); };
      lay1(H ? 0.75 : 0.8, "The Hound's Return"); lay1(H ? 10.7 : 11.4, 'Earthshine');
    };
    // The wall's whole sword dance is laid at the moment its gate falls (every step named, so the feed reads across all of it): New Moon, the dashes, an Earthshine for the tank
    // between them (Hard: a Moonfall and a second Earthshine), then the last light. The times are the old chain's, now laid ahead.
    const wallRun = () => {
      if (f.state !== 'live' || final) return;
      const dNM = f.ct(3.6), SL = f.ct(3.6), esW = f.ct(4.2) + f.ct(1.6) + 0.4, dMF = f.ct(3.4);
      const w1 = Math.max(0.05, busyUntil - f.t, B.cast ? B.cast.end + 0.3 - f.t : 0), w2 = wideAt + 10 - (f.t + w1 + dNM), w0 = w1 + (w2 > 0.05 ? w2 : 0);
      if (w2 > 0.05) busy(w0 + dNM + 0.5);
      const run = (t, k0, k1) => f.afterKeep(t, () => stepsRun(k0, k1), 'Moonless Steps'), runLen = n => n * SL + 0.2;
      f.afterKeep(w0, wallStart, 'New Moon');
      let t = w0 + dNM + 0.5;
      run(t, 0, 3); t += runLen(3);
      f.afterKeep(t, () => earthshine(0.7), 'Earthshine'); t += esW;
      if (H) { f.afterKeep(t, () => moonfall(), 'Moonfall'); t += dMF + 0.5; }
      run(t, 3, 6); t += runLen(3);
      if (H) {
        f.afterKeep(t, () => earthshine(0.7), 'Earthshine'); t += esW;
        run(t, 6, NSTEP); t += runLen(NSTEP - 6);
      }
      f.afterKeep(t, () => gather(0), 'The Last Light');
      layTail(t + f.ct(3.6) + 6.15);
    };
    const wallStart = () => {
      if (f.state !== 'live') return;
      wallOn = true; act = 3; lastStep = null; poolPrev = null;
      B.lockFacing = true; B.holdUntil = 1e9; B.noAutoUntil = f.t + 140; B.moveTo = { x: 0, y: -60, speed: 600 };
      const d = f.ct(3.6);
      f.cast('New Moon', d, 'bow'); busy(d + 0.4);
      ev('mlwallup', { at: +d.toFixed(2), dur: +(d + 12).toFixed(2) });   // (the build-up)
      ev('mlact', { n: 3, part: 1, dur: +(d + 1).toFixed(2) });
      setCrown({ phase: 'new', umbral: 0 });
      f.afterKeep(d - 1.4, () => { night = true; ev('mlnight', { on: 1, dur: 9999 }); });
      raidwide(d, dmg.open * 1.3, 'mlOpen');
    };

    // --- Act V: the eclipse -------------------------------------------------------------------------------------------------------------------------
    // The crown turns red from one edge. The rule turns over: from now on the dark of the crown is what strikes (still painted red on the floor, as always). The red covers the
    // crown by the time Totality lands. The opening is a showpiece: the crown dims (build-up), one held beat with nothing on the floor, then the red takes the first edge.
    const eclipseOpen = () => spaced(f.ct(5.4), () => {
      act = 5; part = 1;
      const d = f.ct(5.4), tHold = d * 0.46, tPeak = d * 0.78;
      f.cast('The Long Eclipse', d, 'eclipse'); busy(d + 0.4);
      ev('mlact', { n: 5, part: 1, dur: +(d + 1.2).toFixed(2) });
      ev('mleclipse0', { at: +d.toFixed(2), dur: +(d + 1).toFixed(2) });
      setCrown({ phase: 'new', umbral: 0 });
      f.afterKeep(tHold, () => ev('mleclipsehold', { dur: +(tPeak - tHold).toFixed(2) }));   // the held beat
      f.afterKeep(tPeak, () => {   // the release: the red takes the first edge, and the rule turns over
        if (f.state !== 'live') return;
        eclipseAt = f.t; setCrown({ phase: 'new', umbral: 1, red: 0.06 });
        ev('mleclipse', { red: 0.06, dur: 3 });
      });
      raidwide(d, dmg.open * 1.2, 'mlOpen');
    });
    // The Last Dance: lit and umbral cuts alternate on one floor, ending in a Full Moon (the turns are fixed offsets of one turn, found by search so the walk between cuts is never over about 280 and no one place is dark throughout)
    const lastDance = () => {
      const T = newTurn(), off = [0, 7, 7, 9, 10, 10].map(n => wrap(T + n * PI / 6));   // (a search of the turns: no one spot is dark for the whole dance, and the longest walk between two cuts is about 280)
      danceRun('The Last Dance', [{ ph: 'crescent', turn: off[0] }, { ph: 'crescent', turn: off[1], umb: 1 }, { ph: 'half', turn: off[2] }, { ph: 'half', turn: off[3], umb: 1 }, { ph: 'gibbous', turn: off[4] }, { ph: 'full', turn: off[5] }],
        4.4, [2.6, 2.4, 2.3, 2.2, 2.2], { wax: 1, howl: X, beat: 'Full Moon' });
    };

    // --- the acts -------------------------------------------------------------------------------------------------------------------------------------
    // The rhythm (as the siblings): every move stands alone with a calm after it, in a cycle of four about 35 s long: an Earthshine for the tank, a cut or a well, a Full Moon
    // for the healer, a cut. A dance is its own block (a Waxing Dance ends in a Full Moon, a Waning Dance begins with one). Pairs (Moonlets with the dance they are set for,
    // a Hunt's Pass with its cut) are the highlights, two or three to an act.
    const DT = 8.7;
    const P = (fn, name) => [free(fn), name];
    const cr = P(single('crescent'), 'Crescent'), hf = P(single('half'), 'Half Moon'), gb = P(single('gibbous'), 'Gibbous'), fm = P(fullMoon, 'Full Moon'), es = P(earthshine, 'Earthshine'), mw = P(moonwell, 'Moonwell');
    const wxd = P(waxingDance, X ? 'Blood Harvest' : H ? 'Harvest' : 'Waxing Dance'), wnd = P(waningDance, X ? 'Blood Moon Dance' : 'Waning Dance'), ml = P(moonlets, 'Moonlets'), hp = P(huntPass, "Hunt's Pass");
    const two = P(twoCrowns, 'Two Crowns'), ann = P(annular, 'Annular'), lib = P(libration, 'Libration'), tc = P(touched, 'Moon-Touched');   // (the Hard moves; Moon-Touched is Extreme's)
    const xtc = cut => S([DT, ...tc], [4.0, ...cut]);   // (Extreme: Moon-Touched with the cut or the dance it is cast for)
    // The three dances (Hard): the middle sets of Acts I, II and IV in one of three orders, drawn at the pull (f.dance); the first set the three do not share is the tell. An order is legal when
    // the tank is never more than 40 s nor less than 14 s between Earthshines, no two party-wide hits land under 11 s apart nor more than 44 s, and no two re-reads (Two Crowns, Libration,
    // Hunt's Pass) follow each other. Normal and Extreme run the order as written.
    const EST = { Earthshine: 6.3, 'Full Moon': 5.0, Harvest: 13.2, 'Waning Dance': 13.6, Moonlets: 4.6, "Hunt's Pass": 9.0, Moonwell: 5.6, Crescent: 5.1, 'Half Moon': 5.1, Gibbous: 5.1, Libration: 5.9, 'Two Crowns': 6.3, Annular: 5.3,
      Moonrise: 3.4, 'The Waxing': 3.6, "The Hound's Return": 10, "Hunter's Moon": 3.6 };
    const BEAT = { Earthshine: 4.2 }, RAIDAT = { 'Full Moon': 4.6, Harvest: 11.4, 'Waning Dance': 4.8, "Hunt's Pass": 9.4, Moonrise: 3, 'The Waxing': 3.2, "The Hound's Return": 10.2, "Hunter's Moon": 3.2 }, RE = { 'Two Crowns': 1, Libration: 1, "Hunt's Pass": 1 };
    const orderOk = sets => {
      let t = 0, busyEnd = 0, tank = [], raid = [], prevRE = false, bad = 0, prevNm = '';
      for (const set of sets) for (const st of set) {
        const nm = st[2]; t = Math.max(t + st[0], busyEnd); busyEnd = t + (EST[nm] || 5);
        if (nm === prevNm) bad++; prevNm = nm;   // (the same move twice running)
        if (BEAT[nm]) tank.push(t + BEAT[nm]);
        if (RAIDAT[nm]) raid.push(t + RAIDAT[nm]);
        const re = !!RE[nm]; if (re && prevRE) bad++; prevRE = re;
      }
      const gaps = (a, end) => { let w = 0, lo = 1e9, prev = 0; for (const x of a) { w = Math.max(w, x - prev); if (prev > 0) lo = Math.min(lo, x - prev); prev = x; } w = Math.max(w, end - prev); return { w, lo }; };
      const tg = gaps(tank, t + 8), rg = gaps(raid, t + 8);
      return !bad && tg.w <= 40 && tg.lo >= 14 && rg.lo >= 11 && rg.w <= 44;
    };
    const mix = (head, mid, tail, act) => {
      const keep = [...head, ...mid, ...tail];
      if (!H || X) return keep;
      const g = f.danceRng(act + ':perms', 0), valid = [];
      for (let k = 0; k < 4000 && valid.length < 400; k++) {
        const idx = mid.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(g() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        const sets = [...head, ...idx.map(i => mid[i]), ...tail];
        if (orderOk(sets)) valid.push(sets);
      }
      if (valid.length < 6) return keep;
      let pickK = 0, bestSc = -1;
      for (let k = 0; k < 400; k++) {
        const o3 = [0, 1, 2].map(d => valid[Math.floor(f.danceRng(act + ':' + k, d)() * valid.length)]);
        let i = head.length; while (i < o3[0].length && o3[0][i] === o3[1][i] && o3[1][i] === o3[2][i]) i++;
        const sc = new Set(o3.map(o => o[i])).size === 3 ? 100 - i : 0;
        if (sc > bestSc) { bestSc = sc; pickK = k; }
      }
      return valid[Math.floor(f.danceRng(act + ':' + pickK, f.dance)() * valid.length)];
    };
    const ucr = P(single('crescent', { umb: 1 }), 'Umbral Crescent'), uhf = P(single('half', { umb: 1 }), 'Umbral Half Moon'), ld = P(lastDance, 'The Last Dance');
    const closing = [[10, ...fm], [10, ...es], [10, ...hf]];
    const closingV = [[10, ...fm], [10, ...es], [10, ...ucr]];

    // I. Moonrise
    const first = from => f.course({
      until: 0.78, push: true, onStart: () => { act = 1; },
      sets: mix([S([3, moonrise, 'Moonrise']), S([4, ...cr])], [
        S([DT, ...es]), S([DT, ...(H ? lib : hf)]), X && xtc(gb), S([DT, ...fm]), S([DT, ...mw]), S([DT, ...es]), S([DT, ...(H ? ann : gb)]), S([DT, ...fm]),
        S([DT, ...es]), S([DT, ...gb]), S([DT, ...fm]), S([DT, ...mw]),
      ].filter(Boolean), [S([DT, ...gb])], 'act1'),
      closing, next: waxing,
    }, from);

    // II. The Waxing (its gate is the wall)
    const waxing = from => f.course({
      until: 0.56, push: true, onStart: () => { act = 2; },
      wall: { label: 'New Moon', run: wallRun, until: 'resolved', timeout: 110 },
      sets: mix([S([2.5, waxingOpen, 'The Waxing']), S([6, ...es])], [
        S([DT, ...gb]), S([DT, ...ml], [5.6, ...wxd]), S([13.6, ...es]), X && xtc(wnd), S([DT, ...(H ? two : cr)]), S([DT, ...mw]), S([DT, ...fm]),
        S([DT, ...es]), !X && S([DT, ...wnd]), S([13.6, ...(H ? lib : gb)]), S([DT, ...fm]),
      ].filter(Boolean), [S([DT, ...cr])], 'act2'),
      closing, next: hunt,
    }, from);

    // IV. The Wild Hunt (56% to 34%): the Hound's Return opens it
    const hunt = from => f.course({
      until: 0.34, push: true, onStart: () => { act = 4; part = 1; dropAnchors(); },
      sets: mix([S([0.8, houndReturn, "The Hound's Return"]), S([10.6, ...es]), ...(H ? [S([DT, ...hp])] : [])], [
        S([DT, ...(H ? two : hf)]), !H && S([DT, ...hp]), S([DT + 4, ...es]), X && xtc(hf), S([DT, ...fm]), S([DT, ...mw]), S([DT, ...(H ? ann : gb)]), S([DT, ...es]), S([DT, ...fm]),
        S([DT, ...ml], [5.6, ...wxd]), S([13.6, ...es]),
      ].filter(Boolean), [], 'act4a'),
      closing, next: hunters,
    }, from);

    // IV (second half). Hunter's Moon (34% to 14%)
    const hunters = from => f.course({
      until: 0.14, push: true, onStart: () => { act = 4; part = 2; },
      sets: mix([S([2.5, huntersMoon, "Hunter's Moon"]), S([6, ...es]), ...(H ? [S([DT, ...hp])] : [])], [
        S([DT, ...(H ? lib : gb)]), !H && S([DT, ...hp]), S([DT + 4, ...es]), X && xtc(hf), S([DT, ...fm]), S([DT, ...ml], [5.6, ...wxd]), S([13.6, ...es]),
        S([DT, ...(H ? two : cr)]), S([DT, ...mw]), !X && S([DT, ...fm]), !X && S([DT, ...es]), S([DT, ...wnd]),
      ].filter(Boolean), [], 'act4b'),
      closing, next: eclipse,
    }, from);

    // V. The Long Eclipse (a written order on every difficulty; the rule is turned over)
    const eclipse = from => f.course({
      ramp: 0.08, onStart: () => { act = 5; part = 1; },
      sets: X ? [   // (Extreme: both Last Dances come early, so the Second Howl is in every pull twice, the first with Moon-Touched)
        S([2, eclipseOpen, 'The Long Eclipse']), S([8.8, ...es]), xtc(ld), S([18.2, ...es]), S([DT, ...ld]),
      ] : [
        S([2, eclipseOpen, 'The Long Eclipse']), S([8.8, ...es]), S([DT, ...ucr]), S([DT, ...uhf]), S([DT, ...fm]), S([DT, ...es]), S([DT, ...ld]),
      ],
      closing: closingV,
    }, from);

    // the enrage and the kill get room events of their own (a kill holds the room for a breath before the fight ends)
    const enrage0 = f.enrage.bind(f);
    f.enrage = () => {
      if (f.noEnrage) return;
      final = true; setCrown({ phase: 'new', umbral: 1, red: 1 });
      ev('mltotality', { dur: 8 });
      f.afterKeep(6.4, () => ev('mltotalityhold', { dur: 1.6 }));   // (the held beat: the red has covered the crown; nothing moves)
      f.afterKeep(8, () => ev('mltotalityland', { dur: 2 }));
      enrage0();
    };
    f.onFell = () => {
      fell = true; B.untargetable = true; B.noAutoUntil = f.t + 10;
      for (const m of [...f.mechs.values()]) f.cancel(m);
      f.ticker(() => { for (const m of [...f.mechs.values()]) f.cancel(m); });
      ev('mlfall', { dur: 2.4 }); f.anim('death', 2.4);
      f.afterKeep(1.4, () => f.end('clear'));
    };
    first(0);
    // (a Practice Hall start from Hunter's Moon or later: the acts before it were passed over, the mount with them. She begins as she would have ended the Hunt's first half, on the Hound,
    //  with the engine's form and the room's mlform sent at the pull as a rejoin would get them, and no staged arrival; the music layer follows from the phase, sound-hooks.js)
    if (f.skipTo >= 4) { form = 2; f.setForm('hunt'); }
    sendCrown();
    ev('mlform', form === 2 ? { n: 2, x: rd(B.x), y: rd(B.y), dur: 9999 } : { n: 1, dur: 9999 });
    f.afterKeep(0.2, () => f.anim('intro', 2.4));

    // what the bots and the clients read (bots.js maelisRule)
    f.room = {
      R, crown: () => crown, act: () => act, part: () => part, form: () => form, night: () => night, get wall() { return wallOn; },
      crown2: () => crown2, ring: RING, touched: isTouched, pending: () => { pendTidy(); return pend; }, moons: () => moons, lune,
      trail: (pid, span = SPAN) => trail(pid, span).map(q => [q.x, q.y]), span: () => SPAN, want: 600, pounceR: POUNCE_R,
    };
    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.waxingDance())
    f.moves = { twoCrowns, annular, libration, touched, secondHowl, moonfall, single, fullMoon, earthshine, moonwell, moonlets, waxingDance, waningDance, huntPass, houndReturn, lastDance, eclipseOpen, wallRun, moonrise, trail, setCrown };
  },
};

if (typeof module !== 'undefined') module.exports = { MAELIS };
