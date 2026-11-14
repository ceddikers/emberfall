// Boss XIV: Vesper, the Mirror Knight — "The Argent Hall". The second boss of Season 2 (the Silver Road, docs/plans/2026-11-season-2-design.md).
// The road passes through a gatehouse with one keeper, and she fights with her reflection. In this hall a reflection is a second body: every
// hero has a twin in the glass, and what hits the twin hits the hero. The question is always: where is my reflection standing?
//   THE REFLECTION RULE (sim): a danger "in the glass" is an ordinary telegraph placed at the hall position whose mirror image it is, so a
//     twin stands in a shape exactly when the hero stands in that stored shape. Every mechanic is stored in HALL coordinates and carries its
//     room in its tag (see the CONTRACT), so the host's hit tests and the bots' ordinary telegraph reading work unchanged. A hero is struck by
//     a mechanic when their TEST POINT is in its stored shape. The test point is the hero's own position, except for a hero who has been
//     pulled through the glass (the wall), whose test point is flipped (the sim end of "their body is in the glass and their twin in the hall").
//   Act I, The Hall (100% -> 74%): Evenfall (a wide cone and its mirror image, the easy case), Lay Glass (shards fall in the glass only, so
//     the twins must stand clear), Twin Verdict (the tank's buster, struck in both rooms), Ring True (raidwide: both blades struck on the wall).
//   Act II, Out of Step (74% -> 48%, the wall at 48): the Glass Knight acts alone. She steps half a pace out of line first, then:
//     Counterpoint (Vesper cuts close in the hall, she cuts far in the glass: the safe ground is a band between), Cross-Cut (the hall's
//     side and a blade of the glass), Silver Thread (a hero on a chain: the line between them and their twin becomes a blade).
//   Through the Glass (the wall, about 36 s): two heroes (never the tank) are pulled through. The knights kneel. Three rounds of blue
//     soaks that stand in both rooms and need two each, which a hero and the twin of someone on the other side can share. Then
//     The Mirror Turns: the mirror leaves the north wall for the east wall and everyone is back in the hall.
//   Act IV, The Mirror Turns (48% -> 20%): everything from I and II, sideways, and the Evenfall Dance (the sword dance): six cuts alternating
//     between Vesper in the hall and the Glass Knight in the glass, the landing cut solid and only the next as an outline.
//   Act V, The Line (20% -> dead): the glass goes dark. She plants Evenfall and the mirror is a line through the hall itself, set by where the
//     tank stands when the cast ends; the twins stand in the room. The enrage is Last Reflection.
// Every telegraph shows on every difficulty. Hard (f.hard) casts 15% faster, hits harder, closes each set's first calm by a sixteenth, stops Evenfall's cone
// following its hero 1.2 s before it lands (0.6 s on Normal), and has five moves Normal never uses:
//   Double Glass:   Lay Glass in both rooms at once, two different patterns (shards under the twins in the glass, and a row of four across the hall).
//   Two Threads:    two heroes tied at once (numbered 1 and 2), both blades locking together.
//   Hand Mirror:    the Glass Knight throws a standing mirror into the hall (a prop): whoever stands in its span has a third body, their reflection across it,
//                   struck by everything until it shatters (a ring at its middle, drawn for the last 2 s). A plain Evenfall is laid behind it.
//   Backhand:       a Cross-Cut that changes sides late (the first cut shown is cancelled 1.7 s before it lands and the other side drawn; her pose swings across).
//   Through the Glass, again: mid-wall the pairs trade places (the glass lets go of one hero and takes the one who was left).
// Hard draws one of three orders (f.dance) for the dodges of Acts I, II and IV (the beats stay in their places; see mix() below); the first set the three
// do not share is the tell. Normal and Extreme run the written order (Extreme: dance 0). Extreme (f.extreme, with f.hard true) is Hard plus three
// mechanics of her own, each named on the cast bar and shown by a head mark, woven into the acts and laid over her signatures:
//   Lagging Glass:  two heroes carry the still mark: for 12 s their twin stands where they were 1.5 s ago.
//   Wrong Hand:     two heroes carry the flip mark (warm): for 12 s their twin is mirrored through the hall's centre point, not across the mirror.
//   Trading Places: the dance (renamed): after the third cut the knights swap rooms, so a cut of Vesper's is painted in the glass and the Glass Knight's in the hall.
//
// ====================================================== CONTRACT (for the look, sound and journal lanes) ======================================================
// THE ROOMS. The hall is ARENA_DEFS.vesper: rect hw 480, hh 260 (960 x 520), arena theme 'argent'. A hero at (x, y) is the BODY. The mirror M:
//   kind 'n'    Acts I to III: the north wall, y = -260. Twin of (x, y) is (x, -520 - y). The glass hall is y from -780 to -260.
//   kind 'e'    Act IV: the east wall, x = +480. Twin of (x, y) is (960 - x, y). The glass hall is x from 480 to 1440.
//   kind 'line' Act V: a free line in the hall through P0 = (px, py) with unit normal N = (nx, ny) pointing toward the tank's side; twin of
//               p is p - 2((p - P0) . N) N. The twins stand in the same room (a glass tint over the room, not a second room).
//   A direction angle a mirrors to: 'n' -a; 'e' PI - a; 'line' the reflected direction vector.
// STORED SHAPES AND TAGS. Every mechanic (`tg` message) is laid in HALL coordinates (shape in hall space) and is struck when a hero's test point
//   is inside the shape as sent. Its `tag` begins with a room letter and says where to PAINT it:
//     'vh' + Name   a hall danger (stored shape = where the body is hit): paint the shape as it is, in the hall, red.
//     'vg' + Name   a glass danger (stored shape = the MIRROR IMAGE of the glass danger): paint mirror(shape) in the glass, never in the hall
//                   (a faint hint in the hall is the look lane's call; the glass danger is read in the glass). The shape sent is where the
//                   BODY would be struck; mirror(shape) is where the twin is. Circles and donuts mirror their centre, cones and rects their
//                   origin and angle.
//     'vb' + Name   both rooms: the same shape in both (paint it in the hall as it is and mirror(shape) in the glass).
//   In Act V (kind 'line') the same rule holds: 'vg' shapes are painted at mirror(shape), the Glass Knight's side of the line.
//   Tags: vbOpen (light raidwide of an act opener, hidden), vbRing (Ring True, raidwide, hidden), vbHair (Hairline Fracture, raidwide, hidden),
//     vbEvenfall (cone from Vesper, aimed, aimFromBoss), vgLay (circle r 100 in the glass), vhVerdict / vgVerdict (the two buster cones of Twin
//     Verdict, the first in the hall and the second, 1.6 s later, in the glass; type 'buster', aimFromBoss the tank), vhCounter (circle r 160 round
//     Vesper), vgCounter (donut r2 290 / r 900 round the Glass Knight; stored centre is the mirror of her), vhCross (rect: a band across the hall,
//     the side the cut takes), vgCross (rect: a stripe of the glass), vbThread (rect: the blade between a chained hero and their twin; only the
//     hero's side of the mirror is stored, since the twin's half is its mirror image), vhCut / vgCut (the Evenfall Dance's cuts: cone / long rect),
//     vbSoak (type 'tower', circle r 80, need 2; the wall's soaks; it stands in both rooms and is filled by bodies in the hall copy and by flipped
//     heroes in the glass copy: see FLIP).
//   Hard/Extreme tags: vhShard (Double Glass's row of four circles r 85 in the hall; its glass half is vgLay), vbTwoThread (Two Threads' blades, as vbThread),
//     vhShatter (circle r 130 at a Hand Mirror's middle, when it shatters), vhBackhand / vgBackhand (Backhand's two cuts, as vhCross / vgCross; the first pair is
//     cancelled (tgx x:1) 1.7 s before landing and the second pair laid), vhCut / vgCut as before (Extreme: after the third cut of Trading Places a cone is vg
//     and a line is vh; the final cut stays vh + vg).
// TEST POINTS (the sim end of the twins; clients and bots only need them to draw a hero's twin): a hero is struck when ANY of their points is in the stored
//   shape: a 'vh' shape tests the body, a 'vg' shape the twin, a 'vb' shape either. Body and twin are the hero's own point, except: flipped heroes (FLIP below),
//   Lagging Glass (the twin is where the hero was 1.5 s ago), Wrong Hand (the twin is the point (-x, -y)), and a Hand Mirror (a hero inside the span of the
//   prop has a third body at the reflection of their point across the mirror; it is tested against every shape).
// FLIP (the wall only). Heroes carrying the `vsflip` mark are pulled through (roomev `vsflip` on:1): their body is in the glass hall and their twin is
//   in the real one. Drive coordinates stay the hall box (x, y). On mirror 'n' the flipped body is drawn at (x, y - 520) in the glass, untransformed
//   (it moves as the player moves), and its twin in the hall at (x, -y); on 'e' the body at (x + 960, y) and the twin at (-x, y). The twin is what the
//   hall's dangers strike and the body what the glass's strike; both are the one TEST POINT (x, -y) / (-x, y) against the stored shapes.
// f.room (read by bots as view.room, and by anything with the sim): { mirror: M (the live object { kind, px, py, nx, ny }), twin(x, y) -> [x', y'],
//   twinA(a) -> a', act() -> 1..5, wall (true from the wall's start to The Mirror Turns), flipped() -> [ids], flipPoint(x, y) -> { x, y } (a flipped
//   hero's test point, or the same point where nobody can be flipped), knights() -> { v: { x, y, f }, g: { x, y, f } } (Vesper's place and the Glass
//   Knight's now, f the facing), off: { x, y } (how far she is out of line, in stored space: she stands at twin(B + off)) }.
// ROOM EVENTS (`roomev`, k = name; `dur` is how long the client holds it):
//   vsmirror { kind, px, py, nx, ny, dur: 9999 }   the mirror now (sent at the pull, when The Mirror Turns lands, and when the line is planted)
//   vsact { n: 1..5, dur }                          an act's opener begins (n is the act; light beat: the act opener's raidwide lands at its cast's end)
//   vsring { dur }                                  Ring True: both blades struck on the wall (with its cast)
//   vsstep { ox, oy, dur }                          the Glass Knight steps out of line by (ox, oy) in STORED space (she stands at twin(B + (ox, oy))); (0, 0) puts her back
//   vscut { n: 1..6, who: 'v' | 'g' | 'vg', ox, oy, a, kd: 'cone' | 'line' | 'both', final: 0 | 1, traded: 0 | 1, at, dur }   an Evenfall Dance cut is drawn: from (ox, oy) in
//                                                   stored space at angle a, lands in `at` s. Cuts 1 to 5 grow (cone arc 1.0 + 0.07 k, line width 130 + 8 k); cut 6 (final, who 'vg', kd 'both') is a
//                                                   wide cone from Vesper (arc 1.6, r 480) and a wide line (w 200) from the Glass Knight at the same hero. traded 1 (Extreme): painted in the other room
//   vsdance { dur, lands: [s, ...] }                the Evenfall Dance begins; lands are the six landing times in s from now (they close up: 2.6, 3.9, 5.1, 6.2, 7.2, then a breath, 8.7)
//   vsthread { pid, x1, y1, x2, y2, at, dur }       Silver Thread's blade locks (stored-space ends of the blade; lands in `at` s)
//   vspull { ids: [pid, ...], dur }                 the wall: these heroes are about to be pulled through the glass (their `vsflip` marks run for dur)
//   vsflip { ids: [...], on: 1 | 0, dur: 9999 }     the flip begins / ends for these heroes (the latest replaces the earlier, so a rejoin gets the current set)
//   vskneel { dur: 90 }                             both knights kneel (the wall); stand again when The Mirror Turns lands (vsturnpeak)
//   vswall2 { out: [ids], ids: [ids], at, dur }     Hard: Through the Glass, again: the glass lets go of `out` and takes `ids` (with the cast Through the Glass Again; vsflip follows at `at`)
//   vsbackhand { from: -1 | 1, to: -1 | 1, at, dur }   Hard: the Backhand changes sides: the cut drawn on side `from` is cancelled and the one on `to` is drawn, `at` s before it lands (her pose swings across: crossL / crossR)
//   vshand { x, y, a, len: 300, span: 110, at, life, dur }   Hard: a Hand Mirror is thrown; it lands at `at` s (the prop handmirror appears) and stands `life` (11) s; vshandbreak { x, y, dur } as it shatters
//   vslag { ids, at, dur }                          Extreme: Lagging Glass: from `at` s on, these heroes' twins lag 1.5 s, for 12 s (their still marks show it)
//   vswrong { ids, at, dur }                        Extreme: Wrong Hand: from `at` s on, these heroes' twins stand diagonally opposite, for 12 s (their flip marks show it)
//   vstrade { dur }                                 Extreme: Trading Places: the knights swap rooms (after the third cut lands)
//   vsturn { dur, peak }                            The Mirror Turns: the build to the climax; the mirror leaves the north wall for the east wall at `peak` s (vsturnpeak, vsmirror 'e')
//   vsline { px, py, nx, ny, dur: 9999 }            Act V: Evenfall is planted and the line is set (vsmirror kind 'line' is sent at the same moment)
//   vsfracture { pid, dur }                         a hero caught by a glass danger carries Fracture (a wound: four ticks over 6 s)
//   (the MOMENTS below add: vswallup, vsround, vsroundmet, vshold, vsturnpeak, vswalldown, vsline0, vslinehold, vsgkstep, vslineend, vsdancepeak, vsdanceend, vsenrage, vsenrageland, vsfall)
// MOMENTS (the showpieces and their beats; a staging lane can hang camera, music and room effects on each; nothing else is on the floor in a HELD beat):
//   THE WALL, Through the Glass (about 38 s, longer if a last soak is missed). Build-up, held beat, release, breath.
//     vswallup { dur: 12 }                      the wall begins (with the cast Through the Glass, the vsact n 3 and the vspull)
//     vspull { ids, dur: 3.4 }                  the two heroes are marked; vsflip { ids, on: 1 } when the glass takes them (3.4 s on), vskneel
//     (Hard: vswall2 between the rounds: the pairs trade places)
//     vsround { n: 1..3 (4, 5 if a last soak is missed), last: 0 | 1, at, dur }   a round of soaks is laid (the cast Shared Reflection; they land in `at` s)
//     vsroundmet { n, ok: 0 | 1, met, of, dur }       the answer: the room's own count of whether every soak had its two (0.15 s after they land)
//     (a light Twin Verdict and Hairline Fracture sit between the rounds; the cast Through the Glass ends with a light raidwide)
//     vshold { dur: 1.6 }                       THE HELD BEAT: begins the instant the LAST soak is met (vsroundmet ok 1 on the last round, or after two repeats). Nothing cast, nothing on the floor
//     vsturn { dur: 4.2, peak: 3.6 }            the release builds: the cast The Mirror Turns; its light raidwide lands at the peak
//     vsturnpeak { kind: 'e', dur: 1.4 }        THE CLIMAX, at the peak: the flip ends (vsflip on 0), the mirror is the east wall (vsmirror)
//     vswalldown { dur: 1.5 }                   0.9 s after the peak: the breath, and the wall comes down (the engine's own wall-off follows at once)
//     The party causes it: the held beat and the turn begin when the party meets the last soak, not on a timer.
//   THE LINE, the opening of Act V (about 4.8 s, no other telegraph on the floor):
//     vsact { n: 5 } with the cast The Line     the build-up begins; vsline0 { dur: 1.7, x: 0, y: 0 } she strides to the middle of the hall and the glass dims
//     vslinehold { dur: 1.6 }                   THE HELD BEAT (at 1.7 s): she stops, planted; nothing on the floor
//     vsline { px, py, nx, ny, dur: 9999 }      THE CLIMAX (at 3.3 s): the blade is planted and the mirror is a line, set by where the TANK stood at that instant (with vsmirror 'line')
//     vsgkstep { x, y, f, dur: 9999 }           (at 3.5 s) the Glass Knight steps out of the glass and stands opposite her across the line, at (x, y) facing f
//     vslineend { dur: 1.5 }                    (at the cast's end, 4.8 s) the release: the light raidwide lands and the act's first move follows
//   THE EVENFALL DANCE (each time it is cast; Act IV twice, Act V twice): it climbs. vsdance { lands }, then vscut n 1..6 as each cut is drawn, each landing sooner and
//     a little bigger than the last; the sixth is the final cut (vscut final: 1) after a breath, both knights at once; vsdancepeak { dur: 1.4 } as it lands; vsdanceend { dur: 1.2 }
//   THE ENRAGE: vsenrage { dur: 8 } as the cast Last Reflection begins; vsenrageland { dur: 2 } when it lands.
//   THE KILL: vsfall { dur: 2.4 } the instant the boss falls; the room holds for 1.4 s (no damage, nothing laid) and then the fight ends as a clear.
// PROPS: kind 'handmirror' (Hard's Hand Mirror: shape 'rect', x, y at its middle, w 300 (its length), h 24, a its angle, span 110, solid false: nobody is stopped by it;
//   the span is the rectangle 300 long and 110 either side of it, and is where the third body is made; it stands 11 s and is removed when vshandbreak is sent).
// HEAD MARKS (f.mark): key 'vsaim' sym 'eye' (the hero Evenfall is aimed at, until it locks), 'vschain' sym 'chain' (the hero Silver Thread is
//   tied to, until the blade locks; Hard's Two Threads adds key 'vschainn' sym 'num' n 1 or 2), 'vslag' sym 'still' pale blue (Extreme, Lagging Glass: 3 s + 12 s),
//   'vswrong' sym 'flip' warm #ffcf8a (Extreme, Wrong Hand: 3 s + 12 s), 'vsflip' sym 'flip' (the heroes pulled through, until it happens), 'vscut<k>' sym 'num' n k+1 (the hero Evenfall
//   Dance's cut k+1 is aimed at, until it lands), 'vsfrac' sym 'dot' (Fracture, 6 s). Colours are silver-white (#dfe9f5) and Fracture's pale blue (#9fd8ff).
// CAST ANIMS (f.cast's third argument, the boss's pose while the bar runs; poses with no cast of their own are `banim` events): evenfall, laying,
//   verdict, ringtrue, counter, thread, dance, planted (an act opener, The Line, Hand Mirror, Lagging Glass and Wrong Hand), kneel (the wall's soaks and
//   Through the Glass), turn (The Mirror Turns), enrage (the engine's own). Cross-Cut and Backhand name their side in the cast anim: crossL (screen-left) or
//   crossR (screen-right; on the east mirror the cut's sides run top and bottom and the pose still reads L or R), sent as the cast anim AND as a banim of the
//   same name for the length of the cast; Backhand sends the other side's banim when it changes. banim 'cut' { who: 'v' | 'g' | 'vg', n } as each dance cut
//   lands; banim 'intro' at the pull and banim 'death' with vsfall.
// (A TANK-PLACED line, a PARTY-MET soak: the two moments the room answers the party's own action.)
// CASTS (names the cast bar and the upcoming-moves feed show): The Hall, Evenfall, Twin Verdict, Lay Glass, Ring True, Out of Step, Counterpoint,
//   Cross-Cut, Silver Thread, Through the Glass (the wall), Shared Reflection, Hairline Fracture, The Mirror Turns, Evenfall Dance, The Line,
//   Last Reflection (the enrage); Hard: Double Glass, Two Threads, Hand Mirror, Backhand, Through the Glass Again; Extreme: Lagging Glass, Wrong Hand,
//   Trading Places (the dance's name on Extreme).
// f.room also holds (bots and clients): hands() -> the standing hand mirrors { x, y, a, len, span, end }, third(x, y) -> the third body's point or null, lagged(id),
//   lagPoint(id, x, y), wronged(id).
// DAMAGE KINDS (damagePlayer `kind`, the recap): the tags above, plus vsFracture (the wound's ticks).
// ===========================================================================================================================================================

const VESPER = {
  id: 'vesper', name: 'Vesper', title: 'the Mirror Knight', set: 6,   // (set: the bots' talent rows by set, raid-host.js botWorld; data.js will carry it too)
  // Tuned 2026-11-12 at GEAR=post5 / post6 / post7, the standard line-up, 48 pulls a sample (seeds 1000 and 5000, 24 each):
  //   HUMAN=dps: Normal 43 of 48 (90%), Hard 24 of 48 (50%), Extreme 10 of 48 (21%); perfect bots: Normal 47 of 48, Hard 39 of 48 (81%), Extreme 25 of 48 (52%).
  //   (The wall now lays the first two steps of The Mirror Turns' act in the upcoming-moves feed, so the bots that read the feed (the tank and healer look ahead at it) see what is coming across the wall,
  //   as every other boss's feed lets them: Hard went from 46% to 63% with the damage as it was, so Hard's damage rose 1.76 -> 1.79 and Extreme's 1.76 -> 1.88 to bring both back. A single set of 48 swings
  //   about 10 points: Hard measured 40 to 54% between 1.78 and 1.84.)
  //   (Extreme's health was found with xhp=: 0.9 of the first 10.3M cleared 48% with HUMAN=dps, 1.0 only 6%; its enrage is the cliff, so it sits at 0.975.)
  //   2026-11-13: post6 and post7 became the whole set's gear (all four bosses' tiers; bot-gear.js), no longer Garrow's tier alone, so Hard's damage went 1.79 -> 1.84 and Extreme's health
  //   10.04M -> 10.64M to bring the rates of that day's code back (48 pulls, seeds 1 and 2): HUMAN=dps Hard 19 of 48 and Extreme 8 of 48; perfect bots Hard 42 and Extreme 27. The new gear alone gave 25 / 21 and 38 / 29.
  //   A human-like party kills at about 9:00 on Normal, 9:35 on Hard and 10:00 on Extreme (the enrage starts at 10:15 on Normal, 10:35 on Hard and Extreme, and lands 8 s later).
  hp: { normal: 8600000, hard: 9100000, extreme: 10640000 },
  normalDmg: 1.25, hardDmg: 1.84, extremeDmg: 1.88,
  autoDmg: { normal: 2700, hard: 2700, extreme: 2700 },
  enrage: { normal: 615, hard: 635, extreme: 635 },   // the cast starts here and lands 8 s later
  enrageName: 'Last Reflection',
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'argent' },
  gates: [{ f: 0.74, push: 1 }, { f: 0.48, push: 1, wall: 1 }, { f: 0.20, push: 1 }],

  script(f) {
    const H = f.hard, X = f.extreme, B = f.boss;
    const dmg = {
      ring: H ? 12200 : 15200, open: H ? 5000 : 6200, hair: H ? 7000 : 8600, even: H ? 21500 : 25000, lay: H ? 19500 : 22500, verdict: H ? 30500 : 35000,
      counter: H ? 20000 : 23500, cross: H ? 20000 : 23500, thread: H ? 21500 : 25000, cut: H ? 19500 : 22500,
      soak: H ? 3500 : 4000, soakFail: H ? 9000 : 10500, frac: H ? 2000 : 2400, shatter: H ? 17000 : 17000,
    };
    // (Hard closes the calm before a set's first step by a sixteenth: the moves are the same, they come sooner)
    const S = (...steps) => { const st = steps.filter(Boolean); return H && st.length ? [[st[0][0] * 0.94, ...st[0].slice(1)], ...st.slice(1)] : st; };
    const live = id => f.alive().find(p => p.id === id);
    const rd = n => Math.round(n);
    let fell = false;   // (the boss has fallen: the room holds for a breath and nothing more is laid or sent)
    const ev = (k, o = {}) => { if (!fell || k === 'vsfall') f.emit(Object.assign({ t: 'roomev', k }, o)); };
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };

    // --- the mirror ---------------------------------------------------------------------------------------------------------------------------
    const HW = 480, HH = 260;
    const M = { kind: 'n', px: 0, py: 0, nx: 0, ny: 1 };
    const twin = (x, y) => {
      if (M.kind === 'n') return [x, -2 * HH - y];
      if (M.kind === 'e') return [2 * HW - x, y];
      const k = 2 * ((x - M.px) * M.nx + (y - M.py) * M.ny);
      return [x - k * M.nx, y - k * M.ny];
    };
    const twinA = a => {
      if (M.kind === 'n') return -a;
      if (M.kind === 'e') return Math.PI - a;
      const dx = Math.cos(a), dy = Math.sin(a), k = 2 * (dx * M.nx + dy * M.ny);
      return Math.atan2(dy - k * M.ny, dx - k * M.nx);
    };
    // a hero pulled through has a flipped test point (see FLIP in the contract); on the line nobody is flipped
    const flipPt = (x, y) => (M.kind === 'n' ? { x, y: -y } : M.kind === 'e' ? { x: -x, y } : { x, y });
    const flipped = new Set();
    const off = { x: 0, y: 0 };        // the Glass Knight's step out of line, in stored space
    let act = 1, wallOn = false, busyUntil = 0, lastAim = null;
    const sendMirror = () => ev('vsmirror', { kind: M.kind, px: rd(M.px), py: rd(M.py), nx: +M.nx.toFixed(4), ny: +M.ny.toFixed(4), dur: 9999 });
    const setMirror = kind => { M.kind = kind; sendMirror(); };
    // the preserved axis of the mirror (the coordinate a twin shares with its hero), its half-length in the hall and a step of n along it
    const half = () => (M.kind === 'e' ? HH : HW);
    const shiftVec = (s, n) => (M.kind === 'n' ? { x: s * n, y: 0 } : M.kind === 'e' ? { x: 0, y: s * Math.min(n, 120) } : { x: -M.ny * s * n, y: M.nx * s * n });
    const gkPos = () => twin(B.x + off.x, B.y + off.y);
    const busy = d => { busyUntil = Math.max(busyUntil, f.t + d); };
    // a step that would begin while a move is still on the floor waits for it (two moves never overlap unless a set pairs them)
    const free = fn => () => { const w = busyUntil - f.t; if (w > 0.02) f.afterKeep(w + 0.05, fn); else fn(); };

    // --- the test points ------------------------------------------------------------------------------------------------------------------------------
    // A hero is struck by a Vesper mechanic when one of their test points is in its stored shape. A hall danger ('vh') tests the body, a glass danger ('vg')
    // the twin, and a both-rooms danger ('vb') either. Ordinarily body and twin are the one point (the hero's own place in stored space). They part for:
    //   a hero pulled through the wall (flipped: both are the flipped point), Lagging Glass (Extreme: the twin stands where the hero was 1.5 s ago),
    //   Wrong Hand (Extreme: the twin stands diagonally opposite, through the hall's centre point), and a Hand Mirror (Hard: a third body, the reflection
    //   of the hero across the mirror, tested against everything). fight.js resolveMech tests everyone at their own x, y; this wraps it.
    const lag = new Map(), wrong = new Map(), hands = [], trail = new Map();   // (id -> { from, end }; hand mirrors { x, y, a, len, span, end }; Extreme: each hero's last 2.6 s)
    const LAG = 1.5;
    const lagging = id => { const e = lag.get(id); return !!e && f.t >= e.from && f.t < e.end; };
    const wronged = id => { const e = wrong.get(id); return !!e && f.t >= e.from && f.t < e.end; };
    const lagPt = (id, q) => { const h = trail.get(id) || []; for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= f.t - LAG) return h[i]; return h.length ? h[0] : q; };
    const handOf = q => {
      for (const h of hands) {
        if (h.end <= f.t) continue;
        const c = Math.cos(h.a), s = Math.sin(h.a), dx = q.x - h.x, dy = q.y - h.y;
        if (Math.abs(dx * c + dy * s) <= h.len / 2 && Math.abs(-dx * s + dy * c) <= h.span) return h;
      }
      return null;
    };
    const third = (h, q) => { const c = Math.cos(h.a), s = Math.sin(h.a), ac = -(q.x - h.x) * s + (q.y - h.y) * c; return { x: q.x + 2 * ac * s, y: q.y - 2 * ac * c }; };
    const testPts = (q, m) => {
      const side = (m.tag || '')[1], base = flipped.has(q.id) ? flipPt(q.x, q.y) : { x: q.x, y: q.y };
      let tw = base;
      if (lagging(q.id)) tw = lagPt(q.id, base); else if (wronged(q.id)) tw = { x: -base.x, y: -base.y };
      const pts = side === 'h' ? [base] : side === 'g' ? [tw] : [base, tw];
      const hd = hands.length ? handOf(base) : null;
      if (hd) pts.push(third(hd, base));
      return pts;
    };
    const special = () => flipped.size > 0 || hands.some(h => h.end > f.t) || (X && (lag.size > 0 || wrong.size > 0));
    const resolve0 = f.resolveMech.bind(f);
    f.resolveMech = m => {
      if (!/^v[hgb]/.test(m.tag || '') || !m.shape || !special()) return resolve0(m);
      const alive0 = f.alive;
      f.alive = () => alive0.call(f).map(q => { const pts = testPts(q, m), t = pts.find(z => SHAPES.contains(m.shape, z.x, z.y, 14)) || pts[0]; return Object.assign(q, { x: t.x, y: t.y }); });
      try { resolve0(m); } finally { f.alive = alive0; }
    };
    if (X) f.ticker(() => {
      for (const q of f.alive()) {
        let h = trail.get(q.id); if (!h) trail.set(q.id, h = []);
        h.push({ t: f.t, x: q.x, y: q.y });
        while (h.length && h[0].t < f.t - 2.6) h.shift();
      }
    });

    // --- Fracture: the wound a struck twin leaves (the healer's) ---------------------------------------------------------------------------------
    const fr = new Map();
    const fracture = id => {
      if (!live(id)) return;
      fr.set(id, { n: 4, at: f.t + 1.5 });
      f.mark(id, { sym: 'dot', col: '#9fd8ff', dur: 6.2, key: 'vsfrac' });
      ev('vsfracture', { pid: id, dur: 6.2 });
    };
    f.ticker(() => {
      for (const [id, s] of fr) {
        if (f.t < s.at) continue;
        const p = live(id);
        if (!p) { fr.delete(id); continue; }
        s.n--; s.at = f.t + 1.5;
        f.damagePlayer(p, dmg.frac, { kind: 'vsFracture', avoidable: false, noVuln: true, n: 'Fracture' });
        if (s.n <= 0) fr.delete(id);
      }
    });

    // --- laying a danger -----------------------------------------------------------------------------------------------------------------------
    // side: 'h' (hall), 'g' (glass) or 'b' (both); the shape is in stored (hall) space. A glass danger that lands leaves Fracture on whoever it caught.
    const lay = (side, name, shape, delay, amt, extra = {}) => {
      const o = Object.assign({ tag: 'v' + side + name }, extra);
      if (side === 'g') {
        const on = o.onResolve;
        o.onResolve = (ins, hits, cov) => { for (const id of hits) fracture(id); if (on) on(ins, hits, cov); };
      }
      return f.aoe(shape, delay, amt, o);
    };
    const pickAim = (n = 1, not = []) => {
      let pool = f.nonTanks().filter(p => !not.includes(p.id)); if (!pool.length) pool = f.alive().filter(p => !not.includes(p.id));
      if (pool.length > n && lastAim != null) pool = pool.filter(p => p.id !== lastAim);
      const out = f.shuffle(pool).slice(0, n); if (out[0]) lastAim = out[0].id;
      return out;
    };
    const raidwide = (delay, amt, tag) => f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay, dmg: amt, hidden: true, tag });
    const stepOut = (v, dur) => { off.x = v.x; off.y = v.y; ev('vsstep', { ox: rd(v.x), oy: rd(v.y), dur: +dur.toFixed(2) }); };
    const stepBack = () => { off.x = 0; off.y = 0; ev('vsstep', { ox: 0, oy: 0, dur: 0.5 }); };
    // the Glass Knight acts alone: she steps half a pace out of line, and a second later the move's cast begins (the step is the tell)
    const STEP_T = 1.0;
    const alone = (run, castLen) => {
      const s = f.rng() < 0.5 ? -1 : 1, v = shiftVec(s, 44);
      stepOut(v, STEP_T + castLen + 0.4); busy(STEP_T + castLen + 0.5); hold(STEP_T + castLen);
      f.afterKeep(STEP_T, () => { if (f.state !== 'live' || f.wall) { stepBack(); return; } run(v); f.afterKeep(castLen + 0.2, stepBack); });
    };

    // --- act openers (a named cast of about 3 s, a room event and one light raidwide) ------------------------------------------------------------
    const opener = (n, name, d0, anim = 'planted') => {
      const d = f.ct(d0);
      f.cast(name, d, anim); busy(d + 0.4);
      ev('vsact', { n, dur: +(d + 1.2).toFixed(2) });
      raidwide(d, dmg.open, 'vbOpen');
    };
    const hallOpen = () => { act = 1; opener(1, 'The Hall', 3.0); };
    const outOfStep = () => { act = 2; opener(2, 'Out of Step', 3.2); stepOut(shiftVec(1, 44), 3.6); f.afterKeep(f.ct(3.2) + 0.2, stepBack); };

    // --- Act I -----------------------------------------------------------------------------------------------------------------------------------
    // Evenfall: her wide cone and its mirror image (the easy case: both knights swing the same swing), aimed at a random hero
    const evenfall = () => {
      const p = pickAim(1)[0]; if (!p) return;
      const d = f.ct(3.8);
      f.cast('Evenfall', d, 'evenfall'); busy(d + 0.5); hold(d);
      const lock = H ? 1.2 : 0.6;   // (Hard's cone stops following its hero 1.2 s before it lands, not 0.6: the cast is 15% shorter, and the walk out is the same)
      f.mark(p.id, { sym: 'eye', col: '#dfe9f5', dur: d - lock, key: 'vsaim' });
      lay('b', 'Evenfall', { kind: 'cone', x: rd(B.x), y: rd(B.y), r: 430, arc: 1.3, angle: +Math.atan2(p.y - B.y, p.x - B.x).toFixed(3) }, d, dmg.even, { aimFromBoss: p.id, lockAt: lock });
    };
    // Lay Glass: shards fall in the glass hall only, on the twins: wherever a hero stands now, their twin stands under a shard (and one stray)
    const layGlass = () => {
      const pool = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 3);
      if (!pool.length) return;
      const d = f.ct(4.2), grp = new Set();
      f.cast('Lay Glass', d, 'laying'); busy(d + 0.4);
      for (const p of pool) lay('g', 'Lay', { kind: 'circle', x: rd(p.x), y: rd(p.y), r: 100 }, d, dmg.lay, { group: grp });
      lay('g', 'Lay', { kind: 'circle', x: rd((f.rng() - 0.5) * 2 * 360), y: rd((f.rng() - 0.5) * 2 * 150), r: 100 }, d, dmg.lay, { group: grp });
    };
    // Twin Verdict: the tank's buster, struck in both rooms: Vesper's cut at the tank, then the Glass Knight's at the tank's twin a beat later
    const verdict = (scale = 1) => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.0), gap = f.ct(1.6);
      f.cast('Twin Verdict', d + gap, 'verdict'); busy(d + gap + 0.5); hold(d + gap);
      const cone = () => ({ kind: 'cone', x: rd(B.x), y: rd(B.y), r: 340, arc: 1.2, angle: B.facing });
      f.mech({ type: 'buster', shape: cone(), delay: d, dmg: dmg.verdict * scale, target: tank.id, aimFromBoss: tank.id, tag: 'vhVerdict' });
      f.mech({ type: 'buster', shape: cone(), delay: d + gap, dmg: dmg.verdict * 0.55 * scale, target: tank.id, aimFromBoss: tank.id, tag: 'vgVerdict' });
    };
    // Ring True: both blades struck on the wall (the healer's raidwide)
    const ringTrue = (amt = dmg.ring, name = 'Ring True') => {
      const d = f.ct(4.4);
      f.cast(name, d, 'ringtrue'); busy(d + 0.4);
      ev('vsring', { dur: +(d + 1).toFixed(2) });
      raidwide(d, amt, 'vbRing');
    };

    // --- Act II: the Glass Knight acts alone --------------------------------------------------------------------------------------------------------
    // Counterpoint: Vesper cuts close (a circle round her in the hall), the Glass Knight far (a ring round her in the glass): stand between
    const counterpoint = () => alone(v => {
      const d = f.ct(4.6);
      f.cast('Counterpoint', d, 'counter');
      lay('h', 'Counter', { kind: 'circle', x: rd(B.x), y: rd(B.y), r: 160 }, d, dmg.counter);
      lay('g', 'Counter', { kind: 'donut', x: rd(B.x + v.x), y: rd(B.y + v.y), r: 900, r2: 290 }, d, dmg.counter);
    }, f.ct(4.6));
    // a band across the hall over the coordinate range [lo, hi] of the preserved axis
    const band = (lo, hi) => (M.kind === 'e'
      ? { kind: 'rect', x: -700, y: rd((lo + hi) / 2), angle: 0, len: 1400, w: rd(hi - lo) }
      : { kind: 'rect', x: rd((lo + hi) / 2), y: -420, angle: +(Math.PI / 2).toFixed(3), len: 840, w: rd(hi - lo) });
    // Cross-Cut: Vesper cuts one side of the hall, the Glass Knight a blade of the glass: the safe ground is two pockets on the other side.
    // The cast names its side for the body (crossL / crossR: screen-left or screen-right; on the east mirror the sides run top and bottom)
    const crossLay = (s, delay, name) => {
      const h = half(), c1 = h * 0.24, w = M.kind === 'e' ? 100 : 130, uc = -h * 0.35 + (f.rng() - 0.5) * h * 0.1;   // (uc: in the cut's own direction, negative is away from the cut)
      return [lay('h', name, s > 0 ? band(c1, h + 80) : band(-h - 80, -c1), delay, dmg.cross), lay('g', name, band(s * uc - w / 2, s * uc + w / 2), delay, dmg.cross)];
    };
    const crossPose = s => (s < 0 ? 'crossL' : 'crossR');
    const crossCut = () => alone(() => {
      const d = f.ct(4.4), s = f.rng() < 0.5 ? -1 : 1;
      f.cast('Cross-Cut', d, crossPose(s)); f.anim(crossPose(s), d + 0.4);
      crossLay(s, d, 'Cross');
    }, f.ct(4.4));
    // Backhand (Hard): a Cross-Cut that changes sides late. The first cut shown is cancelled 1.7 s before it lands and the other side is drawn (the blade
    // crosses her body: her pose swings the other way and the room sends vsbackhand); the safe ground is on the new far side, a walk of about 340.
    const backhand = () => alone(() => {
      const d = f.ct(5.8), lead = f.ct(2.0), s = f.rng() < 0.5 ? -1 : 1;
      f.cast('Backhand', d, crossPose(s)); f.anim(crossPose(s), d - lead);
      const first = crossLay(s, d, 'Backhand');
      f.afterKeep(d - lead, () => {
        if (f.state !== 'live') return;
        for (const m of first) f.cancel(m);
        crossLay(-s, lead, 'Backhand');
        f.anim(crossPose(-s), lead + 0.4);
        ev('vsbackhand', { from: s, to: -s, at: +lead.toFixed(2), dur: +(lead + 0.8).toFixed(2) });
      });
    }, f.ct(5.8));
    // Silver Thread: a hero is tied to their twin, and the line between them becomes a blade; it locks 1.6 s before it lands (the chain mark shows who)
    const THREAD_LEAD = 1.6;
    const threadSeg = p => {
      if (M.kind === 'n') { const y0 = p.y - 48, len = Math.max(40, y0 + HH + 30); return { s: { kind: 'rect', x: rd(p.x), y: rd(y0), angle: +(-Math.PI / 2).toFixed(3), len: rd(len), w: 80 }, a: [p.x, y0], b: [p.x, y0 - len] }; }
      if (M.kind === 'e') { const x0 = p.x + 48, len = Math.max(40, HW + 30 - x0); return { s: { kind: 'rect', x: rd(x0), y: rd(p.y), angle: 0, len: rd(len), w: 80 }, a: [x0, p.y], b: [x0 + len, p.y] }; }
      const [tx, ty] = twin(p.x, p.y), L = Math.hypot(tx - p.x, ty - p.y) || 1, ux = (tx - p.x) / L, uy = (ty - p.y) / L, len = Math.max(40, L - 96);
      const x0 = p.x + ux * 48, y0 = p.y + uy * 48;
      return { s: { kind: 'rect', x: rd(x0), y: rd(y0), angle: +Math.atan2(uy, ux).toFixed(3), len: rd(len), w: 80 }, a: [x0, y0], b: [x0 + ux * len, y0 + uy * len] };
    };
    // a hero is tied to their twin: the blade (the hero's side of the mirror, from 48 past the hero to the wall) locks 1.6 s before it lands
    const thread = () => alone(() => {
      const p = pickAim(1)[0]; if (!p) return;
      const d = f.ct(5.2), lead = f.ct(THREAD_LEAD);
      f.cast('Silver Thread', d, 'thread');
      f.mark(p.id, { sym: 'chain', col: '#dfe9f5', dur: d - lead, key: 'vschain' });
      f.afterKeep(d - lead, () => {
        const q = live(p.id); if (!q || f.state !== 'live') return;
        const g = threadSeg(q);
        lay('b', 'Thread', g.s, lead, dmg.thread);
        ev('vsthread', { pid: q.id, x1: rd(g.a[0]), y1: rd(g.a[1]), x2: rd(g.b[0]), y2: rd(g.b[1]), at: +lead.toFixed(2), dur: +(lead + 0.8).toFixed(2) });
      });
    }, f.ct(5.2));
    // Two Threads (Hard): two heroes tied at once, numbered 1 and 2, both blades locking together; each stands clear of the other's
    const twoThreads = () => alone(() => {
      const two = pickAim(2); if (!two.length) return;
      const d = f.ct(5.4), lead = f.ct(THREAD_LEAD);
      f.cast('Two Threads', d, 'thread');
      two.forEach((p, i) => { f.mark(p.id, { sym: 'chain', col: '#dfe9f5', dur: d - lead, key: 'vschain' }); f.mark(p.id, { sym: 'num', n: i + 1, col: '#dfe9f5', dur: d - lead, key: 'vschainn' }); });
      f.afterKeep(d - lead, () => {
        if (f.state !== 'live') return;
        const grp = new Set();
        for (const p of two) {
          const q = live(p.id); if (!q) continue;
          const g = threadSeg(q);
          lay('b', 'TwoThread', g.s, lead, dmg.thread, { group: grp });
          ev('vsthread', { pid: q.id, x1: rd(g.a[0]), y1: rd(g.a[1]), x2: rd(g.b[0]), y2: rd(g.b[1]), at: +lead.toFixed(2), dur: +(lead + 0.8).toFixed(2), two: 1 });
        }
      });
    }, f.ct(5.4));
    // Double Glass (Hard): Lay Glass in both rooms at once, two different patterns: shards under the twins in the glass, and a row of four across the hall
    const doubleGlass = () => {
      const pool = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 3);
      if (!pool.length) return;
      const d = f.ct(4.6), grp = new Set(), a = (f.rng() - 0.5) * 1.0, c = Math.cos(a), sn = Math.sin(a);
      f.cast('Double Glass', d, 'laying'); busy(d + 0.4);
      for (const q of pool) lay('g', 'Lay', { kind: 'circle', x: rd(q.x), y: rd(q.y), r: 100 }, d, dmg.lay, { group: grp });
      for (const k of [-330, -110, 110, 330]) lay('h', 'Shard', { kind: 'circle', x: rd(c * k), y: rd(sn * k), r: 85 }, d, dmg.lay, { group: grp });
    };
    // Hand Mirror (Hard): the Glass Knight throws a standing mirror into the hall (a prop, kind handmirror: a segment 300 long with a span 110 either side).
    // Whoever stands inside the span has a third body, their reflection across the mirror, struck by everything the hall and the glass lay, until it shatters
    // (a ring at its middle, drawn for the last 2 s). The move after it in the set is a plain one, read with the third body.
    const HAND_LIFE = 11;
    const handMirror = () => {
      const d = f.ct(3.0), a = +(f.rng() * Math.PI).toFixed(3), x = rd((f.rng() - 0.5) * 2 * 230), y = rd((f.rng() - 0.5) * 2 * 80), life = HAND_LIFE;
      f.cast('Hand Mirror', d, 'planted'); busy(d + 0.4);
      ev('vshand', { x, y, a, len: 300, span: 110, at: +d.toFixed(2), life, dur: +(d + life).toFixed(2) });
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        const h = { x, y, a, len: 300, span: 110, end: f.t + life };
        h.pr = f.addProp({ kind: 'handmirror', shape: 'rect', x, y, w: 300, h: 24, a, hp: 0, solid: false, cover: false, rubble: false, span: 110 });
        hands.push(h);
        f.afterKeep(life - f.ct(2.0), () => { if (f.state === 'live') lay('h', 'Shatter', { kind: 'circle', x, y, r: 130 }, f.ct(2.0), dmg.shatter); });
        f.afterKeep(life, () => { const i = hands.indexOf(h); if (i >= 0) hands.splice(i, 1); f.removeProp(h.pr); ev('vshandbreak', { x, y, dur: 1.2 }); });
      });
    };
    // Lagging Glass (Extreme): two heroes carry the still mark: for 12 s their twin stands where they were 1.5 s ago (glass dangers strike that place)
    const laggingGlass = () => {
      const two = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 2), d = f.ct(3.0);
      f.cast('Lagging Glass', d, 'planted'); busy(d + 0.4);
      ev('vslag', { ids: two.map(q => q.id), at: +d.toFixed(2), dur: +(d + 12).toFixed(2) });
      for (const q of two) { lag.set(q.id, { from: f.t + d, end: f.t + d + 12 }); f.mark(q.id, { sym: 'still', col: '#9fd8ff', dur: d + 12, key: 'vslag' }); }
    };
    // Wrong Hand (Extreme): two heroes carry the flip mark: for 12 s their twin is mirrored through the hall's centre point, not across the mirror, so it
    // stands diagonally opposite (glass dangers strike the place at (-x, -y))
    const wrongHand = () => {
      const two = f.shuffle(f.nonTanks().length >= 2 ? f.nonTanks() : f.alive()).slice(0, 2), d = f.ct(3.0);
      f.cast('Wrong Hand', d, 'planted'); busy(d + 0.4);
      ev('vswrong', { ids: two.map(q => q.id), at: +d.toFixed(2), dur: +(d + 12).toFixed(2) });
      for (const q of two) { wrong.set(q.id, { from: f.t + d, end: f.t + d + 12 }); f.mark(q.id, { sym: 'flip', col: '#ffcf8a', dur: d + 12, key: 'vswrong' }); }
    };

    // --- Through the Glass (the wall) ----------------------------------------------------------------------------------------------------------------
    // Two heroes (never the tank) are pulled through; the knights kneel; three rounds of blue soaks that stand in both rooms and need two each
    // (the hall copy is filled by bodies in the hall and the glass copy by the pulled-through heroes' bodies in the glass, which is the one test point);
    // a raidwide and a light Twin Verdict between; then the mirror turns. About 36 s.
    // The wall is a showpiece: a build-up (the pull, three rounds), a held beat of stillness with nothing on the floor, the release (the mirror turns), and a
    // breath. The release is the party's: the held beat begins the moment the last soak is met (a missed last soak is laid again, twice at most).
    const soakRound = (i, cb) => {
      const d = 4.8, s = f.rng() < 0.5 ? -1 : 1;
      f.cast('Shared Reflection', d, 'kneel'); busy(d + 0.4);
      ev('vsround', { n: i + 1, last: i >= 2 ? 1 : 0, at: d, dur: +(d + 0.8).toFixed(2) });
      const pts = [[-(150 + f.rng() * 180), s * (90 + f.rng() * 60)], [150 + f.rng() * 180, -s * (90 + f.rng() * 60)]];
      if (i % 2 === 1) pts.forEach(p => { p[0] = -p[0]; });   // (every other round swaps the sides)
      pts.length = Math.max(1, Math.min(2, Math.floor(f.alive().length / 2)));   // (a party short of a hero has one soak to fill, not two it cannot)
      let met = 0;
      for (const [x, y] of pts) f.mech({ type: 'tower', shape: { kind: 'circle', x: rd(x), y: rd(y), r: 80 }, delay: d, dmg: dmg.soak, need: 2, failDmg: dmg.soakFail, tag: 'vbSoak',
        onResolve: ins => { if (ins.length >= Math.min(2, f.alive().length)) met++; } });
      f.afterKeep(d + 0.15, () => {
        if (f.state !== 'live') return;
        const ok = met >= pts.length;
        ev('vsroundmet', { n: i + 1, ok: ok ? 1 : 0, met, of: pts.length, dur: 1.2 });
        if (cb) cb(ok);
      });
    };
    const turnCast = () => {
      if (f.state !== 'live') return;
      const d = 3.6;
      f.cast('The Mirror Turns', d, 'turn'); busy(d + 0.4);
      ev('vsturn', { dur: +(d + 0.6).toFixed(2), peak: d });   // (the build to the climax)
      raidwide(d, dmg.open * 1.4, 'vbOpen');
      f.afterKeep(d, () => {   // the climax: the mirror leaves the north wall
        if (f.state !== 'live') return;
        if (flipped.size) { const was = [...flipped]; flipped.clear(); ev('vsflip', { ids: was, on: 0, dur: 9999 }); }
        setMirror('e'); act = 4;
        ev('vsturnpeak', { kind: 'e', dur: 1.4 });
      });
      f.afterKeep(d + 0.9, () => {   // a breath, and the wall comes down
        if (f.state !== 'live') return;
        wallOn = false; B.lockFacing = false; B.holdUntil = 0; B.noAutoUntil = 0;
        ev('vswalldown', { dur: 1.5 });
        dropAnchors();
        if (f.wall) f.wallDown();
      });
    };
    const heldBeat = () => {   // nothing on the floor, nothing cast: stillness, then the turn
      if (f.state !== 'live') return;
      const h = 1.6;
      ev('vshold', { dur: h });
      f.afterKeep(h, turnCast, 'The Mirror Turns');
    };
    // Through the Glass, again (Hard): the glass lets go of one of the pulled-through heroes and takes the one who was left (a pair is traded), with its own beat
    const tradePass = () => {
      if (f.state !== 'live') return;
      const d = f.ct(3.0), nt = f.nonTanks(), old = [...flipped].filter(id => nt.some(q => q.id === id)), rest = nt.filter(q => !old.includes(q.id)).map(q => q.id);
      if (!rest.length || !old.length) return;
      const keep = f.shuffle(old).slice(0, Math.max(0, Math.min(2, nt.length) - rest.length)), ids = [...rest, ...keep].slice(0, 2), out = old.filter(id => !ids.includes(id));
      f.cast('Through the Glass Again', d, 'kneel'); busy(d + 0.4);
      ev('vswall2', { out, ids, at: +d.toFixed(2), dur: +(d + 1).toFixed(2) });
      for (const id of ids) f.mark(id, { sym: 'flip', col: '#dfe9f5', dur: d, key: 'vsflip' });
      f.afterKeep(d, () => {
        if (f.state !== 'live' || !wallOn) return;
        for (const id of out) flipped.delete(id);
        for (const id of ids) flipped.add(id);
        ev('vsflip', { ids: out, on: 0, dur: 9999 }); ev('vsflip', { ids, on: 1, dur: 9999 });
      });
    };
    // The wall ends when the party meets the last soak, so the feed cannot read the real next act across it: the first two steps of The Mirror Turns' act
    // (Evenfall, then a Twin Verdict) stand in the feed as anchors for as long as the wall runs, re-laid whenever the last round has to be repeated, and
    // are dropped the moment the real act is laid out. `dt` is how long from now the wall is expected to come down.
    const anchors = [];
    const dropAnchors = () => { for (const fn of anchors.splice(0)) f.events = f.events.filter(e => e.fn !== fn); };
    const layTail = dt => {
      dropAnchors();
      const lay1 = (d, name) => { const fn = () => {}; anchors.push(fn); f.atKeep(f.t + dt + d, fn, name); };
      lay1(H ? 2.35 : 3, 'Evenfall'); lay1(H ? 7.05 : 11.5, 'Twin Verdict');
    };
    // (the wall's own steps are all laid at the moment its gate falls, from the moment the last cast of the act is done, so the feed is never short while she finishes)
    const wallRun = () => {
      if (f.state !== 'live') return;
      const w0 = Math.max(0.05, busyUntil - f.t, B.cast ? B.cast.end + 0.3 - f.t : 0);
      const lastAt = H ? 30.6 : 26.6;
      layTail(w0 + lastAt + 11.05);
      f.afterKeep(w0, () => wallStart(w0));
      f.afterKeep(w0 + 4.4, () => soakRound(0), 'Shared Reflection');
      f.afterKeep(w0 + 10.0, () => verdict(0.7), 'Twin Verdict');
      f.afterKeep(w0 + 16.4, () => soakRound(1), 'Shared Reflection');
      f.afterKeep(w0 + 22.0, () => { const d = f.ct(3.2); f.cast('Hairline Fracture', d, 'ringtrue'); busy(d + 0.4); ev('vsring', { dur: d + 1 }); raidwide(d, dmg.hair, 'vbHair'); }, 'Hairline Fracture');
      const last = k => soakRound(2 + k, ok => { if (ok || k >= 2) heldBeat(); else { layTail(1.2 + 11.05); f.afterKeep(1.2, () => last(k + 1), 'Shared Reflection'); } });
      if (H) f.afterKeep(w0 + 26.4, tradePass, 'Through the Glass Again');   // (Hard: the pairs trade places mid-wall, and the last round is a few seconds later)
      f.afterKeep(w0 + lastAt, () => last(0), 'Shared Reflection');
    };
    const wallStart = w0 => {
      if (f.state !== 'live') return;
      wallOn = true; act = 3;
      B.lockFacing = true; B.holdUntil = 1e9; B.noAutoUntil = f.t + 120;
      const tc = 3.4, ids = f.shuffle(f.nonTanks()).slice(0, 2).map(p => p.id);
      f.cast('Through the Glass', tc, 'kneel'); busy(tc + 0.4);
      ev('vswallup', { dur: 12 });   // (start: the build-up begins)
      raidwide(tc, dmg.open * 1.2, 'vbOpen');   // (the glass takes them: a light beat for the healer as the wall begins)
      ev('vsact', { n: 3, dur: tc + 1 });
      ev('vspull', { ids, dur: +tc.toFixed(2) });
      for (const id of ids) f.mark(id, { sym: 'flip', col: '#dfe9f5', dur: tc, key: 'vsflip' });
      f.afterKeep(tc, () => {
        if (f.state !== 'live') return;
        for (const id of ids) flipped.add(id);
        ev('vsflip', { ids, on: 1, dur: 9999 }); ev('vskneel', { dur: 90 });
      });
    };

    // --- Act IV: the Evenfall Dance -------------------------------------------------------------------------------------------------------------------
    // Six cuts alternating between Vesper (a cone from her, in the hall) and the Glass Knight (a long line from her, in the glass), each aimed at where
    // a hero (hers) or a twin (the Glass Knight's) stands when it is drawn. The landing cut is solid and only the next one is an outline: each cut is drawn
    // 1.7 s before it lands and they land 1.3 s apart, so at most two are on the floor. The Glass Knight cuts from a step to the side of her mirror image.
    // The dance climbs: each cut lands a little sooner than the last and is a little bigger, and the last is the one to remember: a breath, then both
    // knights cut at once at the same hero (a wide cone and a wide line, a heavier hit).
    const GAPS = [1.3, 1.2, 1.1, 1.0, 1.5];
    const danceCut = (k, id, delay) => {
      const q = live(id); if (!q) return;
      const traded = X && k >= 3 && k < 5;   // (Trading Places: after the third cut the knights swap rooms, so a cut of Vesper's is drawn in the glass and the Glass Knight's in the hall)
      const glass = k % 2 === 1, fin = k === 5, sh = shiftVec(k % 4 === 1 ? 1 : -1, 150);
      const o = glass ? { x: B.x + sh.x, y: B.y + sh.y } : { x: B.x, y: B.y };
      const a = +Math.atan2(q.y - o.y, q.x - o.x).toFixed(3), amt = dmg.cut * (fin ? 1.1 : 1);
      const grp = fin ? new Set() : null, ex = grp ? { group: grp } : {};
      const cone = { kind: 'cone', x: rd(B.x), y: rd(B.y), r: fin ? 480 : 430 + 10 * k, arc: fin ? 1.6 : +(1.0 + 0.07 * k).toFixed(2), angle: +Math.atan2(q.y - B.y, q.x - B.x).toFixed(3) };
      const line = { kind: 'rect', x: rd(o.x), y: rd(o.y), angle: a, len: 820, w: fin ? 200 : 130 + 8 * k };
      if (fin) { lay('h', 'Cut', cone, delay, amt, ex); lay('g', 'Cut', line, delay, amt, ex); }
      else if (glass) lay(traded ? 'h' : 'g', 'Cut', line, delay, amt);
      else lay(traded ? 'g' : 'h', 'Cut', Object.assign(cone, { x: rd(o.x), y: rd(o.y) }), delay, amt);
      f.mark(q.id, { sym: 'num', n: k + 1, col: '#dfe9f5', dur: delay, key: 'vscut' + k });
      ev('vscut', { n: k + 1, who: fin ? 'vg' : glass ? 'g' : 'v', ox: rd(o.x), oy: rd(o.y), a, kd: fin ? 'both' : glass ? 'line' : 'cone', final: fin ? 1 : 0, traded: traded ? 1 : 0, at: +delay.toFixed(2), dur: +(delay + 0.9).toFixed(2) });
      f.afterKeep(delay, () => {
        if (f.state !== 'live') return;
        f.anim('cut', 0.5, { who: fin ? 'vg' : glass ? 'g' : 'v', n: k + 1 });
        if (fin) ev('vsdancepeak', { dur: 1.4 });
      });
    };
    const dance = () => {
      const lead = f.ct(2.6), gaps = GAPS.map(g => f.ct(g)), lands = [lead];
      for (const g of gaps) lands.push(lands[lands.length - 1] + g);
      const total = lands[5] + 0.2;
      const order = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()).map(p => p.id);
      if (!order.length) return;
      f.cast(X ? 'Trading Places' : 'Evenfall Dance', total, 'dance'); busy(total + 0.6); hold(total + 0.8);
      if (X) f.afterKeep(lands[2] + 0.2, () => ev('vstrade', { dur: 1.6 }));
      ev('vsdance', { dur: +(total + 1).toFixed(2), lands: lands.map(l => +l.toFixed(2)) });
      f.afterKeep(total, () => ev('vsdanceend', { dur: 1.2 }));
      for (let k = 0; k < 6; k++) {
        const win = f.ct(k === 5 ? 2.3 : 1.7);
        const pickId = () => (live(order[k % order.length]) ? order[k % order.length] : (f.alive()[0] || {}).id);
        if (k === 0) danceCut(0, pickId(), lead);
        else f.afterKeep(lands[k] - win, () => { if (f.state === 'live') danceCut(k, pickId(), win); });
      }
    };

    // --- Act V: the line -----------------------------------------------------------------------------------------------------------------------------
    // She plants Evenfall at the middle of the hall and the mirror becomes a line behind her, square to where the tank stands when the cast ends. The twins
    // stand in the room (the Glass Knight on the far side of the line, opposite Vesper).
    // The Line is a showpiece: she strides to the middle and the glass dims (build-up), one held beat of stillness with nothing on the floor, the blade is
    // planted where the tank stands (the climax, the party's own: the line is set by the tank), the Glass Knight steps out of the glass opposite her, and the
    // light raidwide lands as the release.
    const theLine = () => {
      act = 5;
      const d = f.ct(4.8), tHold = 1.7, tPlant = 3.3, tStep = 3.5;
      f.cast('The Line', d, 'planted'); busy(d + 0.4);
      ev('vsact', { n: 5, dur: +(d + 1.2).toFixed(2) });
      ev('vsline0', { dur: tHold, x: 0, y: 0 });   // (build-up: she strides to the middle)
      f.moveBoss(0, 0, 420); B.holdUntil = 1e9;
      f.afterKeep(tHold, () => ev('vslinehold', { dur: +(tPlant - tHold).toFixed(2) }));   // (the held beat)
      f.afterKeep(tPlant, () => {   // (the climax)
        if (f.state !== 'live') return;
        const tk = f.tank(), dx = tk ? tk.x - B.x : 0, dy = tk ? tk.y - B.y : 1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        M.px = B.x - ux * 110; M.py = B.y - uy * 110; M.nx = ux; M.ny = uy;
        setMirror('line');
        ev('vsline', { px: rd(M.px), py: rd(M.py), nx: +ux.toFixed(4), ny: +uy.toFixed(4), dur: 9999 });
      });
      f.afterKeep(tStep, () => {   // (the Glass Knight steps out of the glass and stands opposite her across the line)
        if (f.state !== 'live') return;
        const gk = gkPos();
        ev('vsgkstep', { x: rd(gk[0]), y: rd(gk[1]), f: +twinA(B.facing).toFixed(3), dur: 9999 });
      });
      raidwide(d, dmg.open * 1.2, 'vbOpen');
      f.afterKeep(d, () => ev('vslineend', { dur: 1.5 }));   // (the release)
    };

    // --- the acts ------------------------------------------------------------------------------------------------------------------------------------
    // The rhythm: every move stands alone with a calm after it, in a cycle of about 35 s of four (a Twin Verdict for the tank, a move, a Ring True for the
    // healer, a move), so tank and healer each have a beat about every 35 s. A pair is a highlight (two or three to an act): a Ring True with a move laid
    // 5.4 s behind it, a Hand Mirror with a plain Evenfall behind it, an Extreme mark with the signature it governs. A dance is 9.9 s of its own, bracketed
    // by a Twin Verdict before it and a Ring True after it.
    // Hard draws the order of each act's middle sets (the dance, f.dance 0 to 2; Extreme runs dance 0), under rules that hold on every draw: neither tank nor
    // healer waits more than 36.5 s for a beat, no two Twin Verdicts and no two Ring Trues land within 12 s of each other, and two dances never run back to
    // back. The three dances of an act are drawn until they differ in the first set they do not share, so that set tells the party which dance this is.
    const DT = 8.7;
    const P = (fn, name) => [free(fn), name];
    const ev1 = P(evenfall, 'Evenfall'), lg = P(layGlass, 'Lay Glass'), tv = P(verdict, 'Twin Verdict'), rt = P(ringTrue, 'Ring True');
    const cp = P(counterpoint, 'Counterpoint'), cc = P(crossCut, 'Cross-Cut'), st = P(thread, 'Silver Thread');
    const dnName = X ? 'Trading Places' : 'Evenfall Dance', dn = P(dance, dnName);
    const dg = P(doubleGlass, 'Double Glass'), hm = P(handMirror, 'Hand Mirror'), bh = P(backhand, 'Backhand'), tt = P(twoThreads, 'Two Threads');
    const lgg = P(laggingGlass, 'Lagging Glass'), wh = P(wrongHand, 'Wrong Hand');
    const dS = dt => S([dt, ...dn], [1.8]);                      // (a dance set: 1.8 s more of calm, so the next set begins 10.5 s after it)
    const hmP = () => S([DT, ...hm], [6.2, ...ev1]);               // (Hard: a Hand Mirror with a plain Evenfall read through its third body)
    const xP = (a, b) => S([DT, ...a], [3.8, ...b]);               // (Extreme: a mark with the signature it governs, landing while the mark is on)
    const closing = [[10, ...rt], [10, ...tv], [11, ...ev1]];
    const closingV = [[10, ...rt], [10, ...tv], [10.5, ...dn], [1.8], [8, ...st]];

    // the three dances: orders of the middle sets of an act that keep the rules above
    const BEAT = { 'Twin Verdict': 4.0 }, RW = { 'Ring True': 4.4 }, NEAR = 12;
    const keyOf = set => set.map(x => x[2] || '').join('+');
    const orderOk = (sets, lim, lv0, lr0) => {
      let t = 0, lv = lv0, lr = lr0, wv = 0, wr = 0, bad = false, prevDance = false;
      for (const set of sets) {
        let isDance = false;
        for (const x of set) {
          t += x[0];
          if (x[1] && BEAT[x[2]]) { const at = t + BEAT[x[2]]; wv = Math.max(wv, at - lv); if (at - lv < NEAR) bad = true; lv = at; }
          if (x[1] && RW[x[2]]) { const at = t + RW[x[2]]; wr = Math.max(wr, at - lr); if (at - lr < NEAR) bad = true; lr = at; }
          if (x[2] === 'Evenfall Dance' || x[2] === 'Trading Places') isDance = true;
        }
        if (isDance && prevDance) bad = true;
        prevDance = isDance;
        if (bad) return false;
      }
      return Math.max(wv, t + 6 - lv) <= lim && Math.max(wr, t + 6 - lr) <= lim;
    };
    // A plan is the act's sets in order, with the beats (Twin Verdict, Ring True) fixed in their places and a null wherever a dodge goes; the dances shuffle
    // which dodge fills which null.
    const mix = (head, plan, dodges, tail, act, lead, lim = 39) => {
      const fill = order => { let i = 0; return [...head, ...plan.map(x => x || dodges[order[i++]]), ...tail]; };
      const written = fill(dodges.map((_, i) => i));
      if (!H) return written;
      const draw = (d, k) => {
        const rng = f.danceRng(act + ':' + k, d);
        for (let n = 0; n < 4000; n++) {
          const idx = dodges.map((_, i) => i);
          for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
          const seq = fill(idx);
          if (orderOk(seq, lim, lead[0], lead[1])) return seq;
        }
        return null;
      };
      let fallback = null;
      for (let k = 0; k < 60; k++) {
        const o3 = [0, 1, 2].map(d => draw(d, k));
        if (o3.some(o => !o)) continue;
        if (!fallback) fallback = o3[f.dance];
        let i = head.length;
        while (i < o3[0].length && keyOf(o3[0][i]) === keyOf(o3[1][i]) && keyOf(o3[1][i]) === keyOf(o3[2][i])) i++;
        if (i < o3[0].length && new Set(o3.map(o => keyOf(o[i]))).size === 3) { (f.vesperMix = f.vesperMix || []).push({ act, k }); return o3[f.dance]; }
      }
      (f.vesperMix = f.vesperMix || []).push({ act, k: fallback ? -1 : -2 });
      return fallback || written;
    };
    const V_ = S([DT, ...tv]), R_ = S([DT, ...rt]);   // (a beat's set; null in a plan is a dodge)

    // I. The Hall
    const first = from => f.course({
      until: 0.74, push: true, onStart: () => { act = 1; },
      sets: H ? mix([S([3, hallOpen, 'The Hall']), S([4, ...ev1])], [V_, null, R_, null, V_, null, R_, null, V_, null, R_, null],
        [S([DT, ...dg]), X ? xP(lgg, lg) : S([DT, ...lg]), X ? xP(wh, lg) : S([DT, ...lg]), S([DT, ...ev1]), hmP(), S([DT, ...ev1])], [S([DT, ...tv])], 'act1', [-8, 6])
        : [S([3, hallOpen, 'The Hall']), S([4, ...ev1]), S([DT, ...tv]), S([DT, ...lg]), S([DT, ...rt]), S([DT, ...ev1]), S([DT, ...tv]), S([DT, ...lg]), S([DT, ...rt], [5.4, ...ev1]),
          S([DT, ...tv]), S([DT, ...lg]), S([DT, ...rt]), S([DT, ...ev1]), S([DT, ...tv]), S([DT, ...lg]), S([DT, ...rt])],
      closing, next: outOfStepAct,
    }, from);

    // II. Out of Step (its gate is the wall)
    const outOfStepAct = from => f.course({
      until: 0.48, push: true, onStart: () => { act = 2; },
      wall: { label: 'Through the Glass', run: wallRun, until: 'resolved', timeout: 90 },
      sets: H ? mix([S([2.5, outOfStep, 'Out of Step']), S([6, ...tv])], [null, R_, null, V_, null, R_, null, V_, null, R_, null, V_, null],
        [X ? xP(wh, cp) : S([DT, ...cp]), S([DT, ...bh]), S([DT, ...tt]), hmP(), X ? xP(lgg, cc) : S([DT, ...cc]), S([DT, ...st]), S([DT, ...ev1])], [R_], 'act2', [-12, 5.7])
        : [S([2.5, outOfStep, 'Out of Step']), S([6, ...tv]), S([DT, ...cp]), S([DT, ...rt], [5.4, ...cc]), S([DT, ...tv]), S([DT, ...st]), S([DT, ...rt]), S([DT, ...cp]),
          S([DT, ...tv]), S([DT, ...cc]), S([DT, ...rt], [5.4, ...st]), S([DT, ...tv]), S([DT, ...cp]), S([DT, ...rt]), S([DT, ...cc])],
      closing, next: mirrorTurns,
    }, from);

    // IV. The Mirror Turns (its opener is the wall's last cast)
    const mirrorTurns = from => f.course({
      until: 0.20, push: true, ramp: 0.08, onStart: () => { act = 4; dropAnchors(); flipped.clear(); wallOn = false; setMirror('e'); },
      sets: H ? mix([S([2.5, ...ev1]), S([5, ...tv])], [null, R_, null, V_, null, R_, null, V_, null, R_, null],
        [dS(DT), dS(DT), X ? xP(wh, cp) : S([DT, ...cp]), S([DT, ...bh]), S([DT, ...tt]), X ? xP(lgg, lg) : hmP()], [S([DT, ...tv])], 'act4', [-24, -1])
        : [S([3, ...ev1]), S([8.5, ...tv]), S([DT, ...cc]), S([DT, ...rt]), S([11.1, ...tv]), dS(6.6), S([DT, ...rt]), S([9.5, ...tv]), S([DT, ...cp]), S([DT, ...st]), S([DT, ...rt]),
          S([DT, ...tv]), dS(6.6), S([DT, ...rt]), S([9.5, ...tv]), S([DT, ...cc])],
      closing, next: line,
    }, from);

    // V. The Line (a written order on every difficulty; Hard swaps a Silver Thread for Two Threads and adds a Hand Mirror, Extreme lays its marks over the signatures)
    const line = from => f.course({
      ramp: 0.08, onStart: () => { act = 5; },
      sets: [
        S([2, theLine, 'The Line']), S([8.5, ...tv]), dS(6.6), S([DT, ...rt]), S([9.5, ...tv]),
        X ? xP(wh, cp) : S([DT, ...cp]), H ? S([DT, ...tt]) : S([DT, ...st]), S([DT, ...rt]), S([DT, ...tv]), dS(6.6), S([DT, ...rt]), S([9.5, ...tv]),
        ...(H ? [hmP()] : [S([DT, ...cp])]), X ? xP(lgg, st) : S([DT, ...st]), S([DT, ...rt]),
      ],
      closing: closingV,
    }, from);

    // the enrage and the kill get room events of their own (a kill holds the room for a breath before the fight ends)
    const enrage0 = f.enrage.bind(f);
    f.enrage = () => { if (f.noEnrage) return; ev('vsenrage', { dur: 8 }); f.afterKeep(8, () => ev('vsenrageland', { dur: 2 })); enrage0(); };
    f.onFell = () => {
      fell = true; B.untargetable = true; B.noAutoUntil = f.t + 10; fr.clear();
      for (const m of [...f.mechs.values()]) f.cancel(m);
      f.ticker(() => { for (const m of [...f.mechs.values()]) f.cancel(m); });
      ev('vsfall', { dur: 2.4 }); f.anim('death', 2.4);
      f.afterKeep(1.4, () => f.end('clear'));
    };
    first(0);
    sendMirror();
    f.afterKeep(0.2, () => f.anim('intro', 2.4));

    // what the bots and the clients read (bots.js vesperRule)
    f.room = {
      mirror: M, twin, twinA, off, flipped: () => [...flipped], flipPoint: (x, y) => flipPt(x, y), act: () => act,
      hands: () => hands.filter(h => h.end > f.t), third: (x, y) => { const h = handOf({ x, y }); return h ? third(h, { x, y }) : null; },
      lagged: id => lagging(id), lagPoint: (id, x, y) => lagPt(id, { x, y }), wronged: id => wronged(id),
      get wall() { return wallOn; },
      knights: () => { const g = gkPos(); return { v: { x: B.x, y: B.y, f: B.facing }, g: { x: g[0], y: g[1], f: twinA(B.facing) } }; },
    };
    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.dance())
    f.moves = { doubleGlass, handMirror, backhand, twoThreads, laggingGlass, wrongHand, tradePass, evenfall, layGlass, verdict, ringTrue, counterpoint, crossCut, thread, dance, opener, hallOpen, outOfStep, theLine, wallRun, soakRound, fracture, twin, setMirror };
  },
};

if (typeof module !== 'undefined') module.exports = { VESPER };
