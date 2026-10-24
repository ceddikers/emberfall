# Prompt: rework the four Emberfall bosses into choreographed 8-10 minute fights

*Written 2026-10-20 for a fresh Opus session (effort: medium to high). Paste everything below the line.*

---

You are reworking the boss fights in Emberfall, a 4-player top-down raid game (browser, PeerJS host-tab multiplayer, art drawn in code). The repo is `C:\Users\Cedef\OneDrive\Documents\newgame`. The owner is an expert raider who wants the fights to feel like a Final Fantasy XIV raid: **one authored, non-looping, start-to-finish choreography of 8 to 10 minutes**, not a rotation that repeats until the boss dies.

## 1. What I want

Each of the four bosses (Grubnak, Skitterra, Volkar, the Hollow King) becomes a single written timeline:

- **No loops.** Today every phase is a `f.loop(...)` of about 1:40 to 2:00 that repeats. Remove every `f.loop`. Every mechanic appears at a deliberate point in a script the player can learn, in a fixed order, the same on every pull.
- **8 to 10 minutes** on both Normal and Hard when the party plays well (Normal today is 4 to 7 minutes, so boss HP, phase lengths and enrage timers all move; see section 5).
- **Choreographed, like FF14.** Build each fight from the ideas in section 3, not from a shared template. A mechanic is introduced alone, then returns paired with another, then returns again in a remixed or stored form. The fight builds, breathes and peaks, and each boss does it in its own way.
- **Same boss identity.** Keep each boss's theme, room, props, tells and signature mechanics (the existing mechanic tables in `docs/DESIGN.md` section 4 are the vocabulary). You are re-sequencing and extending them, not replacing them. Keep the Hard-only moves.

## 2. Design rules (these override anything older in the docs)

0. **Start from the questions.** Before designing a new boss, answer the questions in `docs/DESIGN.md` ("Finding a fight's idea: questions to ask", with the Hollow King's answers as the example) and write the answers there under the boss's heading. They are a guideline, not a constraint.

1. **Telegraphs are never hidden, on any difficulty.** This reverses the current Hard design. Delete the "Hard drops the outline / some mechanics stay fully hidden" behaviour (`tg.hidden`, `outline: false`, Hard's body-tell-only mechanics in `client/js/arena/boss-tells.js` and the boss files). Every avoidable hit shows its exact danger area on the floor from the moment it is cast until it lands. Body tells (the boss's pose, the prop in its hand) stay as an extra clue, never a substitute. Hard gets harder by other levers (section 6).
2. **No riddles or instruction text.** Nothing on screen may tell you what to do or pose a puzzle in words. Cast bars show the attack's name; the world shows the rest.
3. **Thinking mechanics are welcome.** Teamwork and problem-solving *through movement and telegraphs* is the goal: pairing, ordering, soaking, passing, baiting, using cover, reading what the room will do next, stored mechanics that replay. The earlier "no logic puzzles" rule only ever meant "no riddle text". Do not strip thinking out of fights.
4. **Determinism.** The order of mechanics never changes between pulls. If something varies (which side, which pillar, which player), the variation is a *pattern the player can read* from a tell (a glow, a prop, a marker), never a random outcome that breaks a plan.
5. **Everything stays fair for a Normal first night.** Every Normal attack is telegraphed on the floor, and a good group should expect several wipes on a boss's first night, as now (`docs/DESIGN.md` section 4 shared rules, kept).
6. **Existing systems stay.** Props, cover, wall slams and room state; the upcoming-moves feed; threat and the tank's taunt; party-size scaling for 1 to 4 players with bots filling empty slots; Vulnerability stacking on avoidable hits; class-aware mechanics (Gorgemaw's edible hits, Ironpalm's Read, the Marionettist's Doll, Oathbroker's Ledger). Small numbers throughout.

## 3. Ideas, not a template (read this twice)

**Do not give the four fights the same skeleton.** A single recipe (opener, teach A, teach B, combine, intermission, remix, finale) would make every boss feel like the same fight in a different costume. Each boss must have its own *shape*: its own tempo, its own central question, its own kind of set piece, its own kind of finale. FF14's best fights are memorable because they are different from each other, not because they share a timeline grammar.

### 3a. What every fight shares (the minimum)
- One authored order, learnable by repetition, and a single named hard enrage.
- Mechanics that build: something introduced alone returns paired, stored or remixed.
- Rhythm: tense stretches and real breathing room. Cadence numbers from the research are for orientation only (`docs/research/ff14-raid-boss-design.md`): 3 to 10 s between mechanics inside a set, 5 to 15 s of calm between sets, a raidwide every 60 to 150 s, a tankbuster every 90 to 180 s, warnings of 3 to 5 s for simple dodges, about 5 s for busters and raidwides, 7 to 10 s for big multi-part sets.
- What players enjoy: geometric "dances" that click once the group is in sync, set-up-and-watch-it-play-out moments, quick puzzles you solve while still attacking, a boss that stays targetable most of the time. What they dislike: randomness that breaks planning, long forced downtime, "two basic mechanics until it dies", filler.

### 3b. A menu of set pieces (pick different ones per boss; invent more)
- **Chase:** a wall of something advances and the party moves with it while still attacking.
- **Gauntlet:** a dense run of overlapping mechanics for 20 to 30 s, then silence.
- **Objective phase:** the boss is not the point; carry a lantern, cut threads, break eggs, hold a bell, light braziers.
- **Relay:** pass a debuff, a light or a tether from player to player before it expires.
- **Pairing and tethers:** two players must be near or far from each other, or from the boss, at a beat.
- **Arena transformation:** the room permanently changes (floods, burns, collapses, closes in, fills with webs) and later mechanics use the new room.
- **Boss leaves and returns:** an untargetable hunt, an add wave or a story beat, then he comes back changed.
- **Echo and memory:** the boss's last moves are replayed by something else (stored mechanics), or a mechanic is shown now and resolved two sets later.
- **Mirror or reversal:** an earlier set replays flipped or backwards, or with the safe area where the danger was.
- **Counting and order:** things resolve one by one in an order the telegraphs make readable (no numbers on screen).
- **Choice under time:** two safe answers with different costs (a long way round, or a short way with a hit).
- **The big shared soak:** the whole party must stand in one place at one beat.
- **A target swap:** the boss changes who he is hunting mid-fight, so the threat and cooldown plan changes (with one tank, that means a cooldown plan, a taunt moment, or the Oathbroker or Gorgemaw class interactions).
- **Class-aware moments:** an attack that rewards a Gorgemaw's jaw, an Ironpalm's Read, a Marionettist's Doll placement, a Driftblade's run through the boss, a Threadweaver's tie. Make them possible and rewarding, never required.

### 3c. Rules that keep the four fights different
- No two bosses share the same number of acts or the same kind of intermission.
- Each boss has a **tempo curve** of its own (for example: relentless and accelerating; long dread with sudden swarms; a steady crescendo then a calm eye; call and response).
- Each boss has a **central question** the party keeps answering (where do I stand; what do I break; who do I pair with and where is the cover; what did I just see).
- Each boss has **one set piece nobody else has** and a **finale of a different type** (a gauntlet, an objective, a chase, a memory).
- When you finish a boss's outline, compare it with the others: if you could swap the boss names in two timelines and nothing would feel wrong, redo one of them.

## 4. How the code is organised (read these first)

- `client/js/arena/fight.js`: `FightSim` host-side. The script API is `f.at`, `f.after`, `f.seq([[delay, fn, 'Cast name'], ...])` and `f.loop(build)`. Every scripted step carries a player-facing name used by the upcoming-moves feed (`{ t: 'bnext', l: [[name, secondsUntil], ...] }`, the next three named steps, plus kept ones like the enrage). The feed must keep working across a linear script (it currently relies on `f.loop` scheduling the next loop 20 s early to see across the seam).
- `client/js/arena/bosses/{grubnak,skitterra,volkar,hollowking}.js`: one script per boss (about 400 to 470 lines each), with `hp`, `autoDmg`, `enrage`, `vuln`, `script(f)`.
- `client/js/arena/boss-tells.js`: how each mechanic is drawn.
- `client/js/arena/shapes.js`: room shapes and props.
- `client/js/arena/bots.js`, `raid-host.js`: the bots, which read `view.next` and each boss's mechanics.
- `client/js/arena/trials.js`: the spec trials; do not break them.
- `docs/DESIGN.md` section 4: every mechanic's numbers; `docs/research/`: the FF14 research.
- `tools/check.js` (`npm run check`), `tools/bot-raid.js`, `tools/simulate.js`.

## 5. The hard engineering problem: a non-looping fight with variable kill speed

A loop self-corrects if the party is slow or fast. A linear script does not. You must decide, and tell me the options and your recommendation before building, how each phase handles both ends:

- **Phase gates by HP, content by time.** A phase ends when the boss reaches an HP threshold (so a fast party skips the tail of the script, as FF14 does with DPS checks), and each phase's script is laid out in time. Choose thresholds and boss HP so that a good party takes about 8 to 10 minutes, and say what DPS you assumed (the bot parties in `check.js`, and the pro DPS numbers in `tools/simulate.js`).
- **If a phase's script runs out before its HP gate:** do not restart the phase. End it with an **escalating closing sequence** (a soft enrage: the last set, repeated with +10% damage each time, or a new named "Final Verse"-style cast) so a slow party is pressured, not given a free loop.
- **If the gate is hit early:** the transition cuts the remaining steps cleanly (the existing "dropped if the phase changes first" behaviour), with the intermission as the seam.
- **Hard enrage:** one named cast. Set it so a party that plays the fight cleanly has about a minute of slack, and a sloppy one wipes to it.

Also decide how long the fight is for 1 to 3 players (boss HP scales 42 / 62 / 82 / 100% today); the choreography must still make sense with bots filling the party and with fewer people to soak towers, take stacks and so on.

## 6. Hard mode without hidden telegraphs

Keep Hard's existing multipliers (casts 15% faster, 25% more damage) and its Hard-only moves per boss (at least three, at most about six). Add difficulty through the FF14 "layers", never through hiding the floor:
- stored mechanics replayed later (the Hollow King's knights are the pattern);
- two known mechanics resolving at once;
- role-split or marked-player targeting (the tank gets a different mechanic from the healer);
- shorter, but always visible, warning times (set a hard floor on the visible lead time, for example 1.2 s);
- debuff timers that punish doing the same thing twice;
- a tighter enrage and less breathing room;
- permanent escalation when players fail (the Vulnerability rule, kept).

## 7. Boss-by-boss seeds (starting ideas, not a spec; propose better)

Each seed gives the boss a different *shape*. Throw away any that do not work and say why.

- **Grubnak, the dinner rush (long kitchen).** Shape: **relentless and accelerating**. Central question: *where do I stand?* The fight is a service: orders come in as courses, and the tempo rises like a Friday night. Appetiser (tools introduced one at a time, generous gaps), main (the kitchen fills: grease, lit stoves, casks as cover, the charge into the brick wall), a mid-fight "kitchen on fire" transformation, then dessert as a gauntlet and "Last Call" as the soft enrage. Unique set piece: the order rail, where plates appear in a visible order and must be soaked in that order. Finale: a gauntlet of overlapping stripes, tosses and meatballs, then silence and a last raidwide. Keep the Hard-only moves.
- **Skitterra, the hunt in the web (octagon).** Shape: **long dread, then sudden swarms**. Central question: *what do I break?* The brood is a visible clock: eggs sit in the web from the start and hatch on a timeline; breaking them early costs boss damage but shrinks a later swarm. The web is a board she reshapes: threads cut the room into sectors, and cut threads stay cut. She retreats into the dark between the pillars (an untargetable stalking set piece) and returns changed. Unique set piece: a thread-cutting objective phase. Finale: a collapsing web where the safe floor shrinks to the thread lines. (Do not use Hard's Cocoon; it conflicts with the owner's "never cocoon a player" rule.)
- **Volkar, the storm front (circular summit).** Shape: **a steady crescendo, then a calm eye, then it all comes back**. Central question: *who do I pair with, and where is cover?* Polarity is the spine. The fight is a weather front moving in: calm and charged, squall, the eye (a short eerie lull where the room is peaceful and a quiet movement puzzle is solved), then the front passes and Act I's mechanics replay mirrored and doubled. Unique set piece: a chase along the electrified edge as it closes in. Finale: the sky coming down, an all-party shared soak. His giant, never-walks identity stays.
- **The Hollow King, the court of the dead (burial hall).** Shape: **call and response**. Central question: *what did I just see?* The fight is a trial: summons, testimony (his moves, remembered and replayed by the knights), verdict (a stored mechanic resolved much later), sentence (the finale). Memory is the unique set piece: a long stored mechanic shown in minute two and resolved in minute six. The Court of Bones is a boss-leaves-and-returns intermission; the Long Night (the dark hall with the last lantern) is an objective finale. The moon setting stays as the enrage clock.

## 8. Quality gates and process

1. **Pilot first.** Do Grubnak only, then show me: a timeline table (time, mechanic, what it tests, tell), your phase-gate numbers, and the Normal vs Hard differences. For any real decision (section 5, the intermission shape, the finale), give 2 to 3 options with a recommendation and wait for my pick. Then do the other three bosses.
2. **Bots must still clear Normal.** Update `tools/bot-raid.js` runs and `check.js` line-ups so the bot parties clear each boss on Normal (record the clear rate and time over six seeds), and that Hard runs clean (it is allowed to wipe, but not to break or hang). Longer fights make bot survival harder (the healer has to keep up for twice as long); tune the bots, not just the boss.
3. **Add a timeline lint to `tools/check.js`:** no `f.loop` remains; every scripted step has a name; no mechanic is hidden or has `outline: false` on any difficulty; each fight's scripted length is in range; gaps and warning times meet the cadence targets; the upcoming-moves feed shows the next three steps across every seam.
4. **Update `docs/DESIGN.md` section 4** for every boss (timeline, numbers, bot results), and replace the old "Hard drops the outline / hidden telegraphs" rule everywhere it appears.
5. **Browser verification** (Browser pane, own dev server from `.claude/launch.json`; use the `emberfall-alt` entry if port 3000 is busy): play each pilot fight with bots, watch the telegraphs, check no console errors.
6. **Do not commit or push without my say-so.** A push to `main` is the live deploy (`ceddikers.github.io/emberfall`). Commit boss by boss when I approve.
7. Keep things small-scale and themed. Tells are objects that belong to the boss. No teaching text. Show boss cast names and the upcoming moves; keep aggro visible.

Deliver the pilot plan first. Do not start rewriting scripts until I have picked the options.
