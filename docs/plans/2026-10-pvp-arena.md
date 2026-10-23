# PvP Arena (Duels and team fights)

Walk into the Arena building in town and pick 1v1 or 2v2 with whoever is in your lobby. Bots fill the empty slots. It is a short round, then everyone goes back to town. There are no rewards.

- **Phase A (done):** the host-side match sim, PvP bots, `tools/pvp-sim.js` and a check.
- **Phase B:** the client side: the building, the lobby UI, drawing opponents, the HUD.
- **Phase C:** capture the flag.

## Files

- `client/js/arena/pvp.js`: `PVP` (all numbers), `PvpSim` (extends `FightSim`, no FightSim change) and `PvpHost` (the RaidHost of a match).
- `client/js/arena/pvp-bots.js`: `PvpBots` (bot movement, the kit's world). The rotation reuses `BotAI.act` / `BotAI.ult`, which get a view in which "the boss" is the chosen opponent and "the party" is the bot's own team.
- `tools/pvp-sim.js`: headless bot matches. `check.js` section 3e runs a few of them.
- Load order (`index.html`): `raid-host.js`, then `pvp-bots.js`, then `pvp.js`. Tools load them the same way.

## Modes

| mode | teams | ends |
|---|---|---|
| `duel` | 1 v 1 | the first to fall loses |
| `team` | 2 v 2 | the last team standing wins |
| `ctf` (phase C) | 2 v 2 or more | captures or the clock |

- **Room:** a plain circle (`ARENA_DEFS.pvp_ring`, radius `PVP.RING_R` = 380) with no props and no boss. Walking out of the ring is a fall and kills you, as in raids. Clients clamp to it.
- **Spawns:** team 0 at x = −250, team 1 at x = +250. Team mates stand 90 apart in y. Team 0 faces right (a = 0) and team 1 faces left (a = π).
- **Countdown:** `PVP.COUNTDOWN` = 5 s. Nobody can deal damage during it, because the sim ignores events before `live`.
- **Clock:** a round is `PVP.ROUND` long (duel 100 s, team 130 s). Then comes sudden death for `PVP.SUDDEN` = 30 s:
  - damage taken goes up 6 % for every second of sudden death;
  - healing received is halved.
- **When the clock runs out:** the side with the higher mean health share wins. Within 2 % it is a draw (`winner: null`).
- **If both sides fall on the same tick:** it is a draw.

## Rules in PvP (all in `PvpSim.onEvent`)

### Damage

A kit `damage` event hits an opponent. The target is chosen in this order:
1. the event's `tgt`, if it is an opponent's player id;
2. otherwise the last opponent this player hit;
3. otherwise the nearest opponent within 700.

The amount works out as:

> amount × (`PVP.TANK_DMG` 0.7 for a tank, or `PVP.DMG` 0.5) × `PVP.CLASS[cls]` (a per-class factor, bot-measured)

- It is capped at `PVP.HIT_CAP` = 12 % of the target's max health per hit, so nothing one-shots, an Ultimate included.
- It then goes through `damagePlayer(..., { scaled: true, kind: 'pvp' })`, so shields, damage cuts, Brace / Read / Reflect, invulnerability, the Gloomsworn's Hollow and threads all work as in raids.
- Damage Down still applies.

### Health

Max health is the raid value (role base + gear) × `PVP.TEAM_HP`: tanks ×1.0, others ×1.15.

### Heals, heals over time, pools and vials

- They are scaled by `PVP.HEAL` = 0.28, and shields by `PVP.SHIELD` = 0.35.
- They only ever land on your own team:
  - "party" means your team;
  - "lowest" means the most hurt team mate;
  - a heal or shield aimed at an opponent lands on yourself.
- A pool ticks only for team mates. Vials have no damage-cut pool in PvP.

### Damage cuts (`mit`)

They last at most `PVP.MIT_DUR` = 6 s.

### Not in PvP

- **Raising:** no `raise` event, and `rewind` never revives (it can still heal the living).
- **Limit Break:** `lb` is ignored.
- **Taunts:** ignored.
- **Boss-only effects:** `targetDebuff`, `brand` and chosen-ally buffs (`allyBuff`) do nothing.
- **Time Stop:** a Time Reversal heals but stops no clock.

### Allowed

- **Ultimates (T)** work. They charge from your own kit as always, and their hits are capped like any hit.
- **Party buffs** (`partyBuff`) apply to the caster's team only (`PvpHost.teamMods`).
- **Dashes and kit moves** are the client's own movement, as in raids.

### Duration target

Most pairings should last 45 to 90 s, and no class should win about 100 % of its duels. Retune `PVP.CLASS` with `node tools/pvp-sim.js duel 2`.

## Protocol (host → everyone, through the host's `emit`, the same channel as raids)

| msg | when | fields |
|---|---|---|
| `pvpStart` | constructor | `mode`, `arena` (`'pvp_ring'`), `ring` (radius), `teams {pid: 0\|1}`, `spawns [[pid, x, y, a]]`, `cd` (countdown s), `round`, `sudden`, `bots [{id, name, cls, spec, role}]` |
| `pvpLive` | countdown over | `round`, `sudden` |
| `pvpClock` | every second while live | `left` (s to the end of the current stage), `sd` (1 in sudden death) |
| `pvpSudden` | sudden death starts | `dur` |
| `phit` | every PvP blow | `from`, `to`, `a` (damage after mitigation and shields), `hp` (target's hp after), `ko` (1 if it killed) |
| `pdmg` | (FightSim) every hit, as in raids | `id`, `a`, `k: 'pvp'`, `hp`, `sh`, `n` (move name) |
| `fps` | (FightSim) 5/s | every player's `[id, hp, maxHp, shield, alive, …]`, opponents included. Use it for enemy health bars. |
| `fev` `k: 'death'` | (FightSim) a player falls | `id` |
| `pheal` | (FightSim) | as in raids |
| `pbuff` | a party buff | as in raids, plus `team` |
| `bots` | 10/s | bot positions `[id, x, y, a, moving]`, as in raids |
| `cast` / `castStart` / `auto` / `kfx` | bot casts | as in raids (`tx`/`ty` is the opponent) |
| `pvpEnd` | the match is decided | `winner` (0, 1 or null for a draw), `reason` (`'ko'` or `'time'`), `time`, `teams`, `stats` (FightSim stats per pid) |

- The raid `fight` message (`s: 'live'`, `'clear'` or `'wipe'`) is **never** sent in a match.
- Boss messages (`boss`, `bnext`, `bcast`) are not sent.
- Client → host: the same kit events as raids (`onPlayerEvent(pid, ev)`). A human's `damage` event **must carry `tgt` = the picked opponent's player id**.

## How phase B starts and runs a match (host tab)

```js
host = new PvpHost({
  mode: 'duel' | 'team',
  humans: () => [{ id, name, cls, spec, role, x, y, a, gear }],   // same shape as RaidHost humans()
  teams: { [humanId]: 0 | 1 },
  bots: [{ cls: 'ranger', spec: undefined | 'base' | specId, team: 1 }],   // fill empty slots; bot ids are 1000+i
  emit: msg => broadcast(msg),   // to every client, the host's own included
  seed,
});
// pvpStart has gone out: move every human to their spawn (host.spawns[pid] = { x, y, a })
// each frame:        host.tick(dt)
// a client's event:  host.onPlayerEvent(pid, ev)
// done when:         host.state === 'over'; host.result = { winner, reason, time }
```

## What phase B must build (client side)

1. **The building:** an Arena building in town, and a lobby panel to pick 1v1 or 2v2 and teams, with bots filling the slots.
2. **Opponents as targets:**
   - Put opponents into the targeting list (`targetList` / `arenaEnemies`) as enemies with their player id.
   - The local kit's `env.target` / `env.picked` / `findEnemy` / `enemiesNear` must return opponents.
   - Range checks use the opponent's position with a body radius of about 18 (bots use `PVP_BOT.BODY_R`).
   - Ally targets are your team only.
3. **Damage events:** fill `tgt` with the opponent's id.
4. **The room:** `ARENA.use('pvp_ring')` on entering, and put it back when leaving. FightSim and RaidHost call `ARENA.use` themselves, so raids are unaffected.
5. **No boss:** don't draw one or its bars. Enemy health comes from `fps`.
6. **HUD:**
   - the round clock from `pvpClock`, and a sudden-death banner;
   - names and health of both teams;
   - a result card from `pvpEnd`, then everyone goes back to town;
   - floating numbers from `phit`;
   - hide the LB gauge.
7. **Ignore in pvp mode:** raid end handling (loot, journal, raid board), the threat display, the boss's upcoming moves.

## Phase C (capture the flag) hooks

- `PvpSim` already has teams (`teams`, `teamOf`, `foes`), a round clock with an end rule, and `finish(winner, reason)`.
- **CTF can subclass it** with:
  - `pvpMode = 'ctf'` and its own `ROUND`;
  - flags and objectives in `tick`;
  - respawns: on `fev death`, schedule `revive(id, s, 1, id)` after a delay and move the player to their spawn (`host.spawns`);
  - `finish(team, 'caps')` when a cap limit or the clock is reached.
- **Bot objectives** go in `PvpBots.move`: carrier, escort, defend.

## Phase C: capture the flag (built)

- **Mode** `ctf`, 2 v 2, on `pvp_field` (a rounded rect 1560 by 800). `CtfSim` (pvp.js) extends `PvpSim`; numbers in `CTF`.
- **Flags:** each side's flag sits on a stand at its own end. Touch the enemy flag to take it. Bring it to your own stand
  while your own flag is home to score.
- **Carrier:** moves at 80% speed, with the flag over their head and a trail. A leap, blink or teleport from an ability
  drops the flag where they took off; the plain dodge roll keeps it.
- **Dropped flag:** when the carrier falls, the flag drops where they fell. Its own side touching it sends it home; it
  also goes home by itself after 10 s. The other side can pick it up again.
- **Death:** back at your own end after 5 s, plus 1 s for each earlier death (at most 9 s). No raising. The usual PvP
  damage and heal scaling applies.
- **Win:** first to 3 captures. When the 5 min clock runs out, the side ahead wins. Level: 60 s of overtime in which the
  next capture wins, then a draw. The result reason is `'caps'` (a draw after overtime is `'time'`).
- **Messages:** `ctf`, `ctfEv`, `ctfDown`, `ctfSpawn` (described above `CtfSim`); client to host: `ctfDrop`.
- **Bots** (`PvpBots.ctfMove`):
  - the first living non-healer bot runs for the flag, or escorts a teammate carrying it;
  - everyone else guards the stand;
  - when their own flag is taken, all of them hunt the thief;
  - a healer stays with the runner;
  - anyone near a dropped flag goes for it.
- **Bot numbers** (`node tools/pvp-sim.js ctf 30`, two seed sets): the sides split about even (30 to 27, 3 draws), the
  median match is 75 to 80 s, and most matches end on three captures.

## Tuning snapshot (2026-10-24, `node tools/pvp-sim.js duel 2`, 342 bot duels)

- Median 68 s. The middle 80 % land between 35 and 127 s.
- Class win rates run from 31 to 75 %, except Threadweaver at 0 %: its bot played a support web and had nobody to web in a duel. Phase C gave it a PvP rotation (`PvpBots.weaver`: stand and cast Needle, Mend when low); it now wins about 45 % of a sample of duels.
- Healer and healer duels run into sudden death (about 110 s).
- Team fights take 75 to 150 s.

These numbers come from bots. Retune with human play.
