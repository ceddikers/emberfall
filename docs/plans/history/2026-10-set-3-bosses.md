# Set 3: the end of the road (the Hour City)

*2026-10-24, a design pass for the user to steer. Nothing here is built. Contains every mechanic of set 3: read only if you don't want the surprise in game.*

## Where the story goes

Set 1 walked the King's Road through the court's own halls; set 2 crossed the wild realm the kings had pushed back. Beyond the Hydra's temple the drowned stair climbs out of the water and the road becomes paved again, in white stone nobody in Emberfall has seen: this is the stretch whose name was chipped off the back of the portal ring. It ends at **Aurelion, the Hour City**, the court's first seat, which the founding king **stopped** the day his reign was meant to end, so it never would. Every clock in it stands at the same minute. The Hollow King was his heir, carried down a road that was never allowed to finish; the bells that woke this autumn were the Hour City's clocks straining to move.

The four bosses are the city's keepers, then the king himself. The tone shifts from monsters to a *court*: clockwork, theatre, oaths, law. Each one is a person with a duty they kept too long.

The chipped word on the portal is the reward of the set: when the finale falls, Hask can finally read it.

## Rules every boss keeps

- Telegraphs are never hidden. Red = damage, blue = stack/soak, safe spots never painted.
- Learnable choreography on `f.course` with HP gates, non-looping, 8–10 minutes, one named enrage with about a minute of slack (about 45 s on Hard). Tank and healer never idle more than about 10 s.
- Natural mechanics: random targets, moves aimed by where players stand or what they did. Hard adds layers and new moves and **shuffles dances per pull**.
- No teaching text in the fight. Pushes and walls stay available (set 2 tech) and are used where they fit.
- **The finale (XII) is the hardest of the set**, and the hardest boss in the game so far.

## Set 3's new idea: time as a resource

Set 1 asked *where*, set 2 asked *what will the room do*. Set 3 asks **when**. Each boss bends time differently, and each introduces one engine feature that the next boss reuses:

| Boss | What time does | New engine feature |
|---|---|---|
| IX Clockwarden | moves are **stored** and replay later | fuse telegraphs (a visible sand-drain on a stored telegraph) |
| X Marionette Queen | your **past movement** is replayed by a puppet | position recorder (per-player ghost paths) |
| XI Oathbound Twins | two bosses on **one shared clock** | linked bosses (two targets, shared rules) |
| XII The Founding King | laws on players that **depend on timing** | player decrees (debuffs that check movement/stillness/facing) |

---

## Boss IX: Quillon, the Clockwarden · "Keeper of the Stopped Minute"

- **Place:** the clock tower's gear-loft. A round floor ringed by twelve brass numerals set into the stone; a great clock face fills the north wall, its hands stopped. Two huge **hands** lie along the floor from the centre (they move: they are the arena's swords). Four **pendulum shafts** in the corners (cover, sometimes swinging).
- **Shape:** *the stored fight.* Quillon casts a move and it doesn't happen: it is **wound**, shown on the floor as a dim telegraph with a sand-drain fuse, and goes off later, usually while something else is happening.
- **Question:** *what's wound, and when does it go?*
- **The boss:** a tall clockwork steward in a frock coat, key in his back, a lantern-faced head showing the stopped minute.

### Signature set
- **Wind** — any move can be cast "wound": its full red telegraph appears at 25% opacity with a fuse ring that drains, then it fires at full strength. Up to three stored at once. The order fires oldest first, always, so the party learns to read the queue.
- **The Hands** — the two floor hands sweep around the dial like real hands: the minute hand (long, fast, a thin red line) and the hour hand (short, broad, a slow wedge). Where they will sweep is painted as the arc ahead of them. Players step across the minute hand and stay out of the hour hand's path.
- **Strike the Hour** — Quillon picks a numeral (the one nearest a random player) and the bell rings that many times: that many small blue soaks pulse on the numeral. One player soaks 1–2, two soak 3+. Teaches counting without text.
- **Escapement** — tankbuster on a tick-tock: two hits on the main target, a swap-friendly gap of 3 s, a vulnerability stack between.

### Normal timeline (target 9:00, enrage 9:50)
| Act | HP | Time | What happens |
|---|---|---|---|
| I · Tick | 100–75% | 0:00–2:20 | Hands sweep alone; Escapement; Strike the Hour; the first **Wind** (a plain cross of lines) stored and fired 12 s later during a hand sweep. Healer: raidwide *Chime* every ~25 s. |
| II · Wound | 75–45% | 2:20–5:00 | Two moves wound at once (a cross + a donut), then a third cast live: the live one and the oldest wound resolve together. Hand sweeps speed up. Pendulums start swinging (red lanes along the shafts). |
| Seam · Rewind | 45% gate, **wall** | ~5:00, 20 s | Quillon turns his own key: the gear-loft runs backward. The last three moves of act II replay in reverse order, quickly. Wall drops when the replay ends. Tank picks up a clockwork **Second** add (a ticking construct that must die before it reaches the dial centre). |
| III · Midnight | 45–0% | 5:20–9:00 | Hands both sweep and the room's numerals light as Strike the Hour pairs. Wound moves now **reposition**: the stored telegraph is aimed at the target's position *when it was wound*, so where you stood 10 s ago matters. Closing pass: three wounds + a full hand revolution. |
| **Enrage** | | 9:50 | **The Minute Ends** — both hands sweep the whole dial at once. |

Roles: tank handles Escapement and the Seconds; healer covers Chime and the wound+live overlaps; DPS soak the hour bells by count.

### Hard adds
- **Overwind** (new): a wound telegraph that fires *twice*, the second copy rotated 45° (the rotation direction shows as an arrow on the fuse).
- **Wrong Time** (new): one numeral's bell rings the wrong count; the blue soak markers show the true count (it's on the floor, never hidden). The count is random per pull.
- **Shuffles:** the order of wound shapes in act II and the hand speeds per act are picked from three dances each pull. Enrage at 9:35.

- **Mood:** brass, verdigris, cream clock-face white, candle-amber.
- **Music:** *"The Stopped Minute"* — harpsichord ostinato over ticking percussion, a bell motif; act III adds strings that drag behind the beat.
- **Town on first kill:** small. **Tobble's** stopped pocket watch starts again; a **clock** appears over the Tankard door and shows real time. New fish *Minute Gudgeon*.
- **Loot theme:** *Wardens' Brass* — gear set, keys, a lantern trinket. Party bonus (2/4 party members wearing it): *Wound Spring* — your first ability after 10 s of not using it hits 10% harder.

---

## Boss X: Velisande, the Marionette Queen · "Mistress of the Long Rehearsal"

- **Place:** the court theatre. A stage with a proscenium arch, footlights, a pit of empty seats to the south; **trapdoors** in a 3×3 grid on stage; a **curtain** that can drop across the middle of the arena; rigging overhead with dangling strings.
- **Shape:** *your shadow does the dance.* Velisande ties players to **puppets** that replay what the player did.
- **Question:** *where was I five seconds ago?*
- **The boss:** a ten-foot porcelain queen worked from above by her own strings, paint cracking; she never stops performing.

### Signature set
- **Understudy** — a random player gets a puppet (a wooden double with a visible string to them). The puppet walks exactly the path that player walked, **5 seconds behind**. The puppet carries a red circle. So you must move in a way that your past self doesn't walk through your friends. Two players by act II, all four in the finale.
- **Curtain Call** — the curtain drops across the stage (east–west or north–south, shown by the rail lighting red). It splits the party into halves for 20 s; Velisande stays on one side and casts at the other through a **puppet stand-in**. Each half must handle their own moves; the healer can only heal their side.
- **Trapdoors** — trapdoors drop open where players stand when the cue lands (blue outline = the doors that will open, red when under a player). Falling = through the floor, a long walk back up the stage stairs (not death, but lost damage and damage taken).
- **Marionette Step** — Velisande grabs a random player's strings: for 3 s their movement is inverted (the arrow on their head shows the direction they'll actually go). Rare and short; never stacked with an Understudy.
- **The Bow** — tankbuster cone that sweeps across the front of the stage.

### Normal timeline (target 9:00, enrage 10:00)
| Act | HP | Time | What happens |
|---|---|---|---|
| I · Rehearsal | 100–70% | 0:00–2:30 | The Bow, Trapdoors, one Understudy at a time. Raidwide *Applause*. |
| II · Curtain | 70–40% | 2:30–5:30 | Two Curtain Calls, each with a Trapdoor cue on both halves; two Understudies at once. Puppet adds (*Players*) walk onstage for the tank. |
| Seam · Intermission | 40% gate, push | ~5:30, 15 s | House lights up, Velisande re-strings herself; puppets of the whole party take a bow then rush the footlights in the lines their owners walked during act II. |
| III · Finale | 40–0% | 5:45–9:00 | All four Understudied in turn; a Curtain splits while Marionette Step lands on one side; closing: the trapdoor grid opens in a chessboard and the puppets replay. |
| **Enrage** | | 10:00 | **Curtain Falls** — the full curtain drops on the stage. |

Roles: tank keeps The Bow toward the empty seats and collects Players; healer manages split halves; everyone plans their path for their puppet.

### Hard adds
- **Encore** (new): the puppet replays the path twice, the second time mirrored across the stage.
- **Recast** (new): mid-act, two Understudy strings swap owners (the strings visibly cross).
- **Shuffles:** which side the curtain drops each time, the Trapdoor cue pattern, and the order of Understudy targets. Enrage 9:45.

- **Mood:** velvet red, gilt, porcelain white, footlight gold.
- **Music:** *"The Long Rehearsal"* — a waltz on a music-box that slowly detunes; brass fanfares at Curtain Calls.
- **Town on first kill:** medium. A travelling **troupe** sets up a small **stage in the square** (players can /emote on it; occasional evening shows with NPC puppet plays retelling earlier boss kills). New NPC **Lisette, Prompter** (cosmetics shop: masks and cloaks).
- **Loot theme:** *Stagehand's Silks* — strings, masks, a puppet charm. Party bonus: *Understudy* — when an ally dies, you gain a short shield (once per fight).

---

## Boss XI: The Oathbound Twins · Sir Aldric and Dame Rhosyn · "The Last Guard of the Hour Gate"

- **Place:** the King's bridge: a long stone bridge (wide, bounded by low parapets with gaps) over a chasm of stopped clouds, ending at the throne doors. Two **oath-braziers**, one each side, and **banner posts** that fall.
- **Shape:** *two bosses, one oath.* A Vindictus-style duel with two knights who fight as a pair: one sword-and-shield, one greatspear.
- **Question:** *which one, and how far apart?*

### Signature set
- **Shared Oath** — the twins share one HP pool *in feel* but have separate bars: if their HP differs by more than 10%, the lower one **Avenges** (a raidwide that grows). The party splits damage and moves the knights.
- **The Tether of Oath** — a gold line joins the twins. If they stand closer than a set distance they are **Sworn** (big damage reduction, painted as a glow); too far and the tether is **Strained** (a red line that hurts anyone crossing it). Tanks drag them into a sweet spot, and the line is a hazard on the floor.
- **Shieldwall / Lancestorm** — Aldric raises a frontal shield (only hits from behind count; Rhosyn guards his back); Rhosyn charges in lines aimed at the farthest player (Vindictus spear charges, painted the full length).
- **Duel** — at intervals a knight challenges a random player: a ring forms around them (blue edge). The challenged player and that knight are inside; no one else can enter for 8 s. The knight uses three telegraphed swings the player must dodge. Grimm-like dash patterns at the arena scale.
- **Tank swap** — each knight stacks *Oath-Broken* on their tank, forcing tanks to swap knights (the only tank-swap fight in the game; with one tank in a 4-party, the off-target knight is kited by the most mobile DPS, whose class gets a temporary "Squire's Ward" button — the Gloomsworn/kite question is flagged for tuning).

### Normal timeline (target 9:15, enrage 10:15)
| Act | HP | Time | What happens |
|---|---|---|---|
| I · First Oath | 100–70% (both) | 0:00–2:40 | Learn the tether, Shieldwall, Lancestorm, one Duel each. |
| II · Banners | 70–40% | 2:40–5:30 | Banner posts fall (red rectangles) and break the bridge parapets: gaps open to the chasm (knockbacks matter now). Both knights cast at once: shield + charge. |
| Seam · Vigil | 40% gate, **wall** on both | ~5:30, 20 s | The twins kneel at the braziers. Each brazier must be soaked by two players (blue) at the same moment; whichever is soaked late, its knight rises with a buff. |
| III · Broken Oath | 40–0% | 5:50–9:15 | One twin falls first (whichever is lower); the survivor takes the other's weapon and uses **both kits** in alternating stances, telegraphed by which weapon glows. |
| **Enrage** | | 10:15 | **Oath Unto Death** — the survivor's charge sweeps the full bridge. |

### Hard adds
- **Mirror Duel** (new): both twins Duel at the same time, two rings, two players.
- **Vow of Vengeance** (new): when one twin dies, the other casts one big echo of the dead twin's last three moves at once.
- **Shuffles:** which twin opens, the Duel targets, and the banner fall pattern. Enrage 10:00.

- **Mood:** white stone, cold blue sky-clouds, gold oath light, faded heraldic green.
- **Music:** *"The Last Guard"* — two interlocking melodies (cello for Aldric, horn for Rhosyn) that become one theme when one falls.
- **Town on first kill:** medium. The **Training Yard** gets two knight **sparring dummies** (Duel practice), and **Sir Aldric's squire, Bren,** walks down the road to Emberfall, takes up the old guard tower and sells oath-cloaks; Hask notes the squire is the first person ever to come *down* the road.
- **Loot theme:** *Oathplate* — paired weapons (the set's best tank and melee drops). Party bonus: *Sworn Pair* — two set wearers within 8 yards take 4% less damage.

---

## Boss XII (finale): Aurel, the Founding King · "He Who Stopped the Hour"

- **Place:** the throne hall of the Hour City, then (in the last act) the Road itself. The hall: a circular floor of white marble with inlaid **gold sigils** (four, the four laws), a broken throne north, and through the windows the frozen sky. In the last act the floor falls away and the party stands on a ribbon of the King's Road, floating, with the earlier bosses' places visible as tiny distant lights.
- **Shape:** *the law.* The King doesn't just attack: he **decrees**, placing laws on players that change how they must move. Then he enforces them. It's the FF14 Ultimate move set (acceleration bomb, pyretic, facing checks) given a court's face, with Grimm-speed dashes at the end.
- **Question:** *what am I allowed to do right now?*

### Signature set
- **Decrees** (player debuffs with a crown-shaped icon over the head and a countdown ring; their meaning is the icon's shape, learned from the journal):
  - *Stillness* — when it ends you must not be moving.
  - *Procession* — when it ends you must be moving.
  - *Obeisance* — when it ends you must face away from the King.
  - *Audience* — when it ends you must be within reach of the King (a blue ring under him).
  Failing a decree deals heavy damage to you **and** strips your next heal.
- **The Crown** — a crown sits on one player (random). The King's big hits all target the crown-wearer; the crown passes to whoever the wearer touches (walk through someone). Holding it too long builds a stack. A juggling mechanic, aimed by where players stand.
- **The Stopped Hour** — the King freezes time for 4 s: the party is frozen in place, and every red telegraph during the freeze is drawn **before** it begins. The party has 2 s of warning to pick spots before the freeze.
- **Sigil Law** — the four floor sigils light in an order; each one sets a law on the whole room (e.g. *no two players within 4 yards*). The order is random per pull on Normal too.
- **Sceptre** — tankbuster with a knockback toward the brightest sigil.

### Normal timeline (target 9:40, enrage 10:40)
| Act | HP | Time | What happens |
|---|---|---|---|
| I · Court | 100–75% | 0:00–2:30 | Decrees one at a time; Sceptre; the Crown introduced. |
| II · Law | 75–50% | 2:30–5:00 | Sigil Laws over the hall + two Decrees together (e.g. Stillness on two players while the Crown passes). |
| Seam · Stopped Hour | 50% gate, **wall** | ~5:00, 25 s | The first full Stopped Hour, three times in a row with changing telegraphs. Wall drops on the third. |
| III · The Road | 50–15% | 5:25–8:20 | The floor falls; on the road ribbon, lanes and edges. The King dashes the length of the road (Grimm-fast, painted lines), Decrees return together with Crown passes; the distant lights flash and send one **Memory** at a time: a faint echo of one earlier boss's signature (a hand-sweep, a puppet replay, a twin charge) — set 3's own mechanics returning, never set 1–2 reskins. |
| IV · The Hour Strikes | 15–0% | 8:20–9:40 | A **push** gate: the King casts all four Decrees, one on each player, then Stopped Hour, then a final Sceptre. A short, intense finale. |
| **Enrage** | | 10:40 | **The Hour Strikes** — time resumes for the whole city at once. |

### Hard adds
- **Edict** (new): a decree pair — two players get opposite decrees and must stand together.
- **Usurper's Crown** (new): two crowns, the King alternates which one he strikes.
- **False Hour** (new): a Stopped Hour where one telegraph appears *after* the freeze begins (still painted, just later).
- **Shuffles:** the sigil order, which decrees land on which roles, and the order of Memories. Enrage 10:25.

- **Mood:** white marble, gold, absent-blue sky; then black void and the road's pale stones.
- **Music:** *"The Stopped Hour"* (hall: choir, organ, a held note that never resolves) and *"The Road Home"* (act III–IV: the set 1 town motif returns in full orchestra, finally resolving that held note).
- **Town on first kill:** **big.** The clocks in Emberfall start properly; the **portal ring's chipped word** is restored, and Hask can read it; the whole town gathers on the terrace for one evening (the bells ring once, then stop for good). A **Throne-room trophy** in the Tankard. A new feat title *The Hour Struck*. Open question: whether the road should go on (a set 4) — the restored word could name what lies beyond.
- **Loot theme:** *Regalia of the First King* — crown helms, sceptres, a legendary/mythic ring. Party bonus: *Hour Kept* — once per fight, the first death is undone after 3 s.

---

## Order, difficulty, tuning

- **Order:** Clockwarden → Marionette Queen → Oathbound Twins → Founding King.
- **Unlock:** set 3 Normal opens after the Hydra falls on Normal. Hard opens per set (all four Normal first), then one boss at a time, as now.
- **HP (Normal / Hard), relative to set 2's ~4.8–5.9M:**
  - IX 5.4M / 6.3M · X 5.6M / 6.5M · XI 2 × 2.9M / 2 × 3.35M · XII 6.4M / 7.4M.
  - Auto damage about +10% over set 2, raidwides about +12%. Set 3 gear is one step above set 2 (`SET3_STEP`).
- **New gear levels for bots:** `GEAR=post3` (set 2 cleared Normal and Hard) for set 3 Normal, aim about 85–90%; `GEAR=post4` (plus set 3 Normal drops) for set 3 Hard, aim about 50–60% for IX–XI and 40–45% for XII; Hard at `GEAR=post3` (harder) about 35–45%.
- **Tuning rule:** 90 runs (three `seed=` sets of 30) per boss per difficulty, as now. Bots need new behaviours: path-planning for puppets, decree compliance, crown passing, duel ring dodging.

## Build plan

### New engine features (in order, each tried on a training dummy first)
1. **Fuse telegraphs** (`fight.js`/`boss-vfx.js`): a stored telegraph with a sand-drain ring and a queue; fires oldest first. Used by IX and XII.
2. **Position recorder** (`fight.js`): every player's last ~10 s of positions, for puppets (X) and wound-at-old-position (IX).
3. **Linked bosses** (`fight.js`, `raid-host.js`, `hud.js`): two boss targets with two bars, a shared enrage and shared course; aggro per boss; tank-swap stacks. XI only, but large.
4. **Player decrees** (`combat/actor.js`, `hud.js`): debuffs with movement/stillness/facing/range checks at expiry. XII.
5. **Split arena** (curtain wall) and **trapdoors** (pit tiles with a respawn walk) for X.
6. **Freeze** (party input lock with telegraphs painted in advance) for XII.
7. **Inverted control** (short, for Marionette Step) — `keybinds.js`/input layer.

### Agent-sized tasks (each on separate files, Sonnet high)
1. Engine features 1–2 (fight.js region + boss-vfx).
2. Engine feature 3 (linked bosses), alone; it touches the most shared code.
3. Engine features 4, 6, 7 (actor/hud/input).
4. Per boss, four tasks each: (a) boss file + room in `arena/bosses/`, (b) boss VFX and tells, (c) journal (19 voices, `journal/`), (d) bot behaviour + tuning sweep. 16 tasks total, max two bosses in flight.
5. Town additions (clock, stage, squire, portal word, finale evening), story pages, feats, bounties, fish: one task.
6. Sounds (`sfx-map.js`/`sfx-synth.js`, coverage check), music prompts into `docs/art/music-prompts.md`, icon prompts into `docs/art/icon-prompts.md` / `item-icons.md` (no manifest ids until PNGs exist).
7. Loot tiers 9–12 with party bonuses in `items.js`.

Rough size: each boss about one set 2 boss; the Twins and the King each need an engine feature of their own first, so about a fifth more.

## Questions for the user

1. The **Twins' tank swap** in a one-tank party: keep it (with the Squire's Ward kite button), or drop the swap and make the off-twin a positional threat only?
2. The King's **Memory** echoes in act III: welcome as callbacks, or too close to repeating content?
3. Is the Hour City the **end of the road** (an epilogue), or does the restored word open set 4?
