// The Founding: the host's authoritative simulation (heroes, enemies, quests, economy). No DOM, no Net: it is handed an
// emit(msg) and emitTo(id, msg) and speaks the messages in docs/plans/founding-build.md (fds, fdp, fdx, fdend).
// Deterministic with a seeded RNG. Distances are world pixels, times seconds, dt is 0.05 on the host (20 ticks a second).

const FoundingSim = (() => {
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const PI = Math.PI, TAU = PI * 2, hyp = Math.hypot, rk = D.rk;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return hyp(px - (x1 + dx * t), py - (y1 + dy * t)); }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const num = v => typeof v === 'number' && isFinite(v);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  // bit flags on heroes and enemies in fds (shared; a bit means the same thing where it applies to both)
  const FLAG = { STUN: 1, SLOW: 2, MARK: 4, BURN: 8, ELITE: 16, DEAD: 32, CARRY: 64, ROOT: 128, WIND: 256 /* enemy winding up / hero bracing */, HOT: 512,
    PETAL1: 1024, PETAL2: 2048 /* cleric petals 0-3 as bits 10-11 */, SHIELD: 4096, HASTE: 8192, TAUNT: 16384, BOSS: 32768, UNDER: 65536, FRONT: 131072 /* enemy has a frontal shield */,
    INVULN: 262144, BLIND: 524288, VULN: 1048576, HIDDEN: 2097152 /* enemy only seen in light, and standing in the dark */, BRAND: 4194304 /* hero holds a lit brand */ };
  // persistent ground effects in fds.z: [id, kind, x, y, a, b, tLeft, c]
  const ZONE = { BANNER: 1, SANCT: 2, BURN: 3, WALL: 4, TRAP: 5, VOLLEY: 6, CRATER: 7, FUSE: 8, METEOR: 9, TRAIL: 10, FLOOD: 11 /* the Mirebull's flood: a radius, b level, c dam logs left */ };
  const SLOT = { q: 0, w: 1, e: 2, r: 3 };
  const SLOT_NAMES = ['q', 'w', 'e', 'r'];
  const CELL = 40, COLS = Math.ceil(M.W / CELL), ROWS = Math.ceil(M.H / CELL);   // the pathing grid
  const HASH = 96, HC = Math.ceil(M.W / HASH), HR = Math.ceil(M.H / HASH);        // the enemy spatial hash
  const HEARTH = M.P.hearth, CAMP_R = M.CAMP_R;
  const HERO_R = 16;
  const SLOWAT = typeof M.slowAt === 'function' ? (x, y) => M.slowAt(x, y) : null;   // shallow water and thick woods slow whatever walks there (the terrain agent's map; absent = no slow)
  const RECALL = { secs: 4, cd: 45, cancelCd: 4, minFrom: 140 }, DASH = { dist: 160, dur: 0.18, cd: 12 }, PING_GAP = 2, GNAW_PARK = 12, ALERT = { gap: 20, far: 500, gate: 0.4 };
  const QT = D.QUEST_TUNE, GATE = { x: M.P.gate[0], y: M.P.gate[1], x0: M.P.gate[0] - 295, x1: M.P.gate[0] + 335 }, HALL = { x: M.P.hall[0], y: M.P.hall[1] };
  const HAUL_IDS = ['beacon', 'graves', 'stonegate', 'roof'];
  const CARRY_CODE = { warm: 1, jar: 2, bier: 3, stone: 4, timber: 5 };   // fds hero row [11], fdp cr
  // the lantern post slots along the North Road, camp end first (the same list the map art draws: FoundingArt.POST_SLOTS)
  const POST_SLOTS = [];
  { const L1 = M.LANES[0].path, tot = L1[L1.length - 1][2]; let k = 0; for (let s = tot - 180; s > 560; s -= 236, k++) { let i = L1.length - 1; while (i > 0 && L1[i][2] > s) i--; const p = L1[i], side = k % 2 ? -1 : 1; POST_SLOTS.push([Math.round(p[0] - p[4] * side * 84), Math.round(p[1] + p[3] * side * 84), side]); } }
  const FLOOD_R = [0, 190, 320, 450];   // the Mirebull's flood by level

  class FoundingSim {
    constructor(o) {
      this.emit = o.emit || (() => {}); this.emitTo = o.emitTo || (() => {});
      this.rng = o.rng || mulberry(o.seed == null ? 1 : o.seed);
      this.practice = !!o.practice;
      this.noSpawn = !!o.noSpawn;   // test hook: waves count but bring no enemies
      this.autoLoot = !!o.autoLoot;   // headless pilots (tests, the tuner) have no hands: drops go straight to a hero with room, as before sim-world.js put them on the ground
      this.players = []; for (const p of (o.players || []).slice(0, 4)) this.players.push({ id: p.id, name: p.name || 'Hero', hero: null, ready: false });
      this.st = 'camp'; this.time = 0; this.tickN = 0; this.wave = 0; this.nextWaveAt = -1;
      this.heroes = []; this.hmap = Object.create(null); this.enemies = []; this.emap = new Map(); this.eid = 0; this.tid = 0; this.zid = 0; this.uid = 0;
      this.spawnQ = []; this.zones = []; this.projs = []; this.timers = []; this.events = [];
      this.paths = [M.LANES[0].path, M.LANES[1].path];
      this.palIdx = M.near(this.paths[0], M.P.gate[0], M.P.gate[1]).i; this.fordIdx = M.near(this.paths[1], M.P.ford[0], M.P.ford[1]).i;
      this.hHead = new Int32Array(HC * HR); this.hNext = new Int32Array(512);
      this.q = {}; for (const id of D.QUEST_ORDER) this.q[id] = { st: 0, prog: 0 };
      this.qWait = []; this.qNextAt = 0;   // the quests waiting at their givers (a ! overhead), and when the next giver may call
      this.autoQuest = !!o.autoQuest;   // headless pilots: a waiting quest is taken at once, as if someone walked straight over
      this.camp = { tk: 'camp', x: HEARTH[0], y: HEARTH[1], r: CAMP_R, hp: 0, max: 0 };
      this.props = {}; this.lastProps = ''; this.pal = null; this.carts = []; this.smith = null; this.dig = null; this.forge = 0; this.spring = 0; this.warm = false; this.luck = false;
      this.secrets = []; this.child = null; this.lastHurt = -99; this.dropN = 0; this.stats = {}; this.over = null; this.wipeT = 0; this.bossRef = null; this.casts = 0; this.snapN = 0;
      this.blocked = null;   // the pathing grid, built on first use (the map art may add solids before that)
      this.result = null;
      // the later run: night and light, hauling quests, posts, the gate's second stage, the Covering, the ending
      this.night = 0; this.peak = 1; this.beaconLit = false; this.longWay = false; this.routeLong = null; this.roofDone = false; this.hearthCovered = false; this.covering = false;
      this.blessing = 0; this.graves = 0; this.cap = 0; this.sg = null; this.posts = []; this.drops = []; this.did = 0; this.haul = {}; this.postSlots = []; this.shut = false; this.ending = null; this.gnawDown = false;
      this._lt = -1; this._lights = [];
      this.snuffed = []; this.kept = Object.create(null);   // a guest who left mid-run: the hero's whole state by the player's name, waiting for sim.rejoin()
      this.alertT = [-99, -99]; this.tier = 0;
      this.allies = [];   // towers, soldiers: things enemies can target and hurt (tk 'ally'; each has x, y, r, dead and hurt(dmg, e))
      this.mods = (FoundingSim.mods || []).map(fn => fn(this)).filter(Boolean);   // feature modules (sim-*.js), see hook()
    }
    // call a hook on every module: start, wave(n), tick(dt), intent(h, m) -> true if handled, kill(e, h), hit(a, e, h, o) -> a,
    // hurt(a, h, src) -> a, recalc(h, s), snapshot(s), props(p), sheet(h, o), payout(parts) -> parts
    hook(name, a, b, c, d) { let r; for (const m of this.mods) if (m[name]) { const v = m[name](a, b, c, d); if (v !== undefined) r = v; } return r; }
    hookVal(name, v, a, b, c) { for (const m of this.mods) if (m[name]) { const r = m[name](v, a, b, c); if (r !== undefined) v = r; } return v; }

    // ================================================================ small helpers
    rand() { return this.rng(); }
    rr(a, b) { return a + this.rng() * (b - a); }
    ev(a) { this.events.push(a); }
    after(delay, fn) { this.timers.push({ t: this.time + delay, fn }); }
    enemyById(id) { const e = this.emap.get(id); return e && !e.dead ? e : null; }
    area(h, v) { return v * (1 + h.S.area); }
    plCount() { return this.heroes.length || this.players.length || 1; }
    scaleN() { return this.N0 || this.plCount(); }
    lampR(h) { return QT.lampR * (1 + h.S.sight) * (h.boons.lamplighter ? 1.8 : 1); }
    inPostLight(x, y) { for (const p of this.posts) if (p.lit && hyp(p.x - x, p.y - y) < 210) return true; return false; }
    // everything that gives light right now: [x, y, radius] (fires, lit posts, the beacon if lit, Sanctums, burning ground, brands, each hero's lamp)
    lights() {
      if (this._lt === this.tickN && this._lights.length) return this._lights;
      const L = []; L.push([HEARTH[0], HEARTH[1], 380]);
      if (this.forge === 2 || (this.forge === 1 && this.q.fire.prog > 0.1)) L.push([M.P.forge[0], M.P.forge[1], 300]);
      if (this.beaconLit) L.push([M.P.beacon[0], M.P.beacon[1], 620]);
      for (const p of this.posts) if (p.lit) L.push([p.lx, p.ly, 210]);
      if (this.roofDone) L.push([HALL.x + 130, HALL.y, 230]);
      if (this.pal && this.pal.stone) { L.push([GATE.x - 130, GATE.y + 56, 200]); L.push([GATE.x + 130, GATE.y + 56, 200]); }
      for (const z of this.zones) if (!z.dead && (z.kind === ZONE.SANCT || z.kind === ZONE.BURN)) L.push([z.x, z.y, z.a + 50]);
      for (const h of this.heroes) if (!h.dead) { L.push([h.x, h.y, this.lampR(h)]); if (h.brand > 0) L.push([h.x, h.y, QT.brandR]); }
      this._lt = this.tickN; this._lights = L; return L;
    }
    isLit(x, y, L) { L = L || this.lights(); for (let i = 0; i < L.length; i++) { const l = L[i], dx = x - l[0], dy = y - l[1]; if (dx * dx + dy * dy < l[2] * l[2]) return true; } return false; }
    // dusk and dawn; an unlit beacon makes the night darker
    updateNight(dt) {
      const target = this.beaconLit ? D.TUNE.nightPeakLit : D.TUNE.nightPeak;
      this.peak += clamp(target - this.peak, -0.02 * dt, 0.02 * dt);
      this.night = D.nightFrac(this.time) * this.peak;
    }
    // The Road: the long way round (the North Road to the stone gate site, west round the hill, back to the road by the junction)
    longRoute() {
      if (this.routeLong) return this.routeLong;
      const L = this.paths[0], pts = []; for (let i = 4; i < L.length && L[i][2] < 1120; i += 3) pts.push([L[i][0], L[i][1]]);
      let cx = pts[pts.length - 1][0], cy = pts[pts.length - 1][1];
      for (const w of [[1920, 1600], [1640, 2500], [2240, 3400], [3120, 3000]]) { const wp = this.nearestWalkable(w[0], w[1]); for (const q of this.findPath(cx, cy, wp[0], wp[1])) pts.push(q); cx = wp[0]; cy = wp[1]; }
      this.routeLong = pts; return pts;
    }
    nearestWalkable(x, y, rad = 14) {
      if (M.walkable(x, y, rad)) return [x, y];
      for (let d = 20; d <= 400; d += 20) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a * TAU / 16) * d, py = y + Math.sin(a * TAU / 16) * d; if (M.walkable(px, py, rad)) return [px, py]; }
      return [HEARTH[0], HEARTH[1] - 100];
    }

    // ================================================================ intents
    intent(pid, m) {
      const p = this.players.find(q => q.id === pid); if (!p || !m || typeof m.k !== 'string') return;
      if (this.paused && this.isPaused()) return;   // (held: the host's tab sends nothing, and a stray intent changes nothing)
      if (this.st === 'live' && this.introActive && this.introActive() && m.k !== 'skipIntro') return;   // (the opening scene holds every hand but the skip vote)
      if (this.st === 'live' && this.hmap[pid] && this.hook('intent', this.hmap[pid], m)) return;
      if (this.st === 'camp') {
        if (m.k === 'pick') { if (D.HERO_IDS.includes(m.hero) && !this.players.some(q => q !== p && q.hero === m.hero)) { p.hero = m.hero; p.ready = false; this.lobby(); } }
        else if (m.k === 'ready') { if (p.hero) { p.ready = true; this.lobby(); this.maybeStart(p); } }
        return;
      }
      if (this.st !== 'live') return;
      const h = this.hmap[pid]; if (!h) return;
      switch (m.k) {
        case 'move': if (num(m.x) && num(m.y) && !h.dead) { h.fetch = null; h.target = null; h.pending = null; h.auto = true; h.chan = null; h.talk = null; this.pathTo(h, clamp(m.x, 20, M.W - 20), clamp(m.y, 20, M.H - 20)); } break;
        case 'stop': h.fetch = null; h.path = null; h.pending = null; h.target = null; h.chan = null; h.talk = null; break;
        case 'attack': { const e = this.enemyById(m.id); if (e && !h.dead && !e.under) { h.fetch = null; h.target = e; h.pending = null; h.path = null; h.chan = null; h.talk = null; } break; }
        case 'talk': h.fetch = null; this.talkTo(h, m.id); break;
        case 'fetch': if (num(m.x) && num(m.y) && !h.dead) { h.target = null; h.pending = null; h.auto = true; h.chan = null; h.talk = null; h.fetch = { x: m.x, y: m.y }; this.pathTo(h, m.x, m.y); } break;
        case 'cast': if (!h.dead && typeof m.s === 'string' && Object.prototype.hasOwnProperty.call(SLOT, m.s)) this.tryCast(h, m.s, m); break;
        case 'learn': this.learn(h, m.s); break;
        case 'buy': if (typeof m.up === 'string') this.buyUp(h, m.up); else if (typeof m.item === 'string') this.buyItem(h, m.item); break;
        case 'forge': this.forgeItems(h, m.a, m.b); break;
        case 'boon': this.pickBoon(h, m.id); break;
        case 'use': this.useItem(h, m.slot); break;
        case 'carry': this.interact(h); break;
        case 'drop': this.dropCarry(h); break;
        case 'aim': if (num(m.x) && num(m.y)) h.aim = { x: m.x, y: m.y }; break;   // the cursor, for Guided Stars
        case 'recall': this.startRecall(h); break;
        case 'dash': if (num(m.x) && num(m.y)) this.startDash(h, m.x, m.y); break;
        case 'ping': this.ping(h, m); break;
        case 'sell': this.sellItem(h, m.slot); break;
      }
    }
    lobby() { this.ev(['lobby', this.plist()]); }
    plist() { return this.players.map(p => [p.id, p.name, p.hero, p.ready ? 1 : 0]); }
    maybeStart(p) {
      if (!this.players[0].hero) return;
      if (p === this.players[0] || this.players.every(q => q.ready)) this.start();
    }
    removePlayer(pid) {
      const i = this.players.findIndex(q => q.id === pid); if (i < 0) return;
      const p = this.players[i]; this.players.splice(i, 1);
      if (this.st === 'camp') { this.lobby(); return; }
      const h = this.hmap[pid];
      if (h) {   // the hero leaves the field, but everything she has is kept under the player's name (see rejoin)
        if (h.carry) this.dropCarry(h);
        h.chan = null; h.cast = null; h.pending = null; h.path = null; h.target = null; h.rcOn = false;
        this.heroes.splice(this.heroes.indexOf(h), 1); delete this.hmap[pid];
        for (const e of this.enemies) { if (e.tgt === h) e.tgt = null; if (e.taunter === h) { e.taunter = null; e.tauntT = 0; } if (e.ai && e.ai.tgt === h) e.ai.tgt = null; }
        for (const z of this.zones) if (z.owner === h) z.dead = true;   // (a banner left behind would keep calling enemies to an empty spot)
        h.dash = null; h.fetch = null; h.talk = null; h.dig = null; h.gone = true;   // (gone: her queued echoes and recasts hold their fire)
        if (this.child && this.child.follow === h) { this.child.st = 1; this.child.follow = null; this.markProps(); }
        this.hook('leave', h);
        this.kept[this.nameKey(p.name)] = { h, oldId: pid, name: p.name };
      }
      if (this.st === 'live' && !this.heroes.length) this.finish(!!this.ending);   // (the last one leaving during the end beat still wins)
    }
    nameKey(n) { return String(n || '').trim().toLowerCase(); }
    // a guest whose name matches a kept hero joins the running run again: the hero returns at the spring with all she had. Returns true.
    rejoin(newId, name) {
      if (this.st !== 'live' || this.ending) return false;
      const k = this.nameKey(name), K = this.kept[k]; if (!K || this.players.length >= 4 || this.players.some(q => q.id === newId)) return false;
      const h = K.h; delete this.kept[k];
      this.players.push({ id: newId, name: K.name, hero: h.hero, ready: true });
      this.stats[newId] = this.stats[K.oldId] || { kills: 0, dmg: 0, heal: 0, dth: 0, gold: 0 }; if (K.oldId !== newId) delete this.stats[K.oldId];
      h.id = newId; h.name = K.name; h.dead = false; h.respT = 0; h.hp = Math.max(h.hp, Math.round(h.max * 0.6)); h.invul = 3; h.stun = 0; h.rootT = 0; h.slowT = 0; h.rcCd = 0; h.dashCd = 0; h.dash = null; h.awayT = 0; h.blessed = false; h.gone = false;
      if (K.oldId !== newId) this.hook('rejoin', h, K.oldId);   // (what modules keep by her old id: tower shares, chain drops)
      const pt = this.nearestWalkable(M.P.spring[0] + 50, M.P.spring[1] - 30); h.x = pt[0]; h.y = pt[1]; h.dirty = true; h.lastSheet = -99;
      this.heroes.push(h); this.hmap[newId] = h; this.ev(['hu', h.id, Math.round(h.x), Math.round(h.y)]);
      this.sendSheet(h);
      return true;
    }
    hasKept(name) { return !!this.kept[this.nameKey(name)]; }

    // ================================================================ the run
    start() {
      const taken = new Set(this.players.map(p => p.hero).filter(Boolean));
      for (const p of this.players) if (!p.hero) { p.hero = D.HERO_IDS.find(h => !taken.has(h)); taken.add(p.hero); }
      this.N0 = this.players.length;
      this.noDps = this.N0 === 2 && !this.players.some(p => p.hero === 'pyromancer' || p.hero === 'ranger');   // a pair of tank and healer has no damage dealer to lean on
      this.players.forEach((p, i) => { const a = -PI / 2 + (i - (this.N0 - 1) / 2) * 0.55, pt = this.nearestWalkable(HEARTH[0] + Math.cos(a) * 110, HEARTH[1] + 80 + Math.sin(a) * 40); const h = this.newHero(p, pt[0], pt[1]); this.heroes.push(h); this.hmap[p.id] = h; this.stats[p.id] = { kills: 0, dmg: 0, heal: 0, dth: 0, gold: 0 }; });
      this.camp.max = this.camp.hp = Math.round(D.campHp(this.N0) * (this.N0 === 1 ? (D.SOLO_CAMP[this.players[0].hero] || 1) : 1)); this.setupWorld();
      this.st = 'live'; this.time = 0; this.nextWaveAt = D.WAVE_T0;
      // Day one's secrets, drawn faintly by the client (props.sec). Only the ones that belong to waves 1-6.
      // (positions are the map art's ground spots, FoundingArt.SPOTS[n - 1]; the child waits in the north-east woods)
      const cpt = this.nearestWalkable(5920, 800);
      this.secrets = [{ n: 1, x: 5876, y: 1130, st: 0 }, { n: 3, x: 2792, y: 4242, st: 0 }, { n: 5, x: cpt[0], y: cpt[1], st: 0 }, { n: 8, x: 2956, y: 4568, st: 0 }];
      for (const h of this.heroes) { this.recalc(h); h.hp = h.max; h.dirty = true; }
      this.hook('start');
      this.ev(['start', this.plist()]);
      this.sendSnapshot(); for (const h of this.heroes) this.sendSheet(h);
      this.flushEvents();
    }
    // where the hauling quests pick up and put down (snapped to ground a hero can stand on; the map art's solids are in by now)
    setupWorld() {
      this.postSlots = POST_SLOTS.map(p => [p[0], p[1]]);
      this.haul = {};
      for (const id of HAUL_IDS) { const C = QT.haul[id], f = this.nearestWalkable(C.from[0], C.from[1]), t = this.nearestWalkable(C.to[0], C.to[1]); this.haul[id] = { kind: C.kind, code: C.code, need: C.need[this.N0 - 1], fx: f[0], fy: f[1], tx: t[0], ty: t[1], toR: C.toR, plant: C.plantSecs || 0, left: 0, got: 0 }; }
      this.carvePt = this.nearestWalkable(QT.carve[0], QT.carve[1]); this.coverPt = this.nearestWalkable(QT.cover[0], QT.cover[1]);
    }
    newHero(p, x, y) {
      const K = D.KITS[p.hero];
      return { tk: 'hero', id: p.id, name: p.name, hero: p.hero, hk: D.HERO_IDS.indexOf(p.hero), K, x, y, r: HERO_R, face: -PI / 2, hp: K.hp, max: K.hp, level: 1, xp: 0, gold: 0, dead: false, respT: 0, deaths: 0,
        ranks: [0, 0, 0, 0, 0], xpAll: 0, cdT: [0, 0, 0, 0], ch: [1, 1, 1, 1], chMax: [1, 1, 1, 1], ups: {}, items: new Array(D.ITEM_SLOTS).fill(null), boons: {}, offers: null, flask: 0,
        S: null, dmgMul: 1, asMul: 1, msMul: 1, cdrMul: 1, healMul: 1, rangeMul: 1,
        path: null, pi: 0, target: null, auto: true, pending: null, cast: null, atkT: 0, repathT: 0, lockT: 0, braceT: 0, stun: 0, rootT: 0, slowT: 0, slowM: 1, hasteT: 0, rallyT: 0, springT: 0, drinkT: 0, stillT: 0,
        shield: 0, shieldT: 0, invul: 0, hots: [], healAcc: 0, carry: null, carryQ: null, chan: null, brand: 0, rage: 0, runT: 0, lastHit: -99, lsReady: 0, awayT: 0, inCamp: true, blessed: false, rcCd: 0, rcOn: false, dashCd: 0, dash: null, pingT: -99, pages: [], offerQ: [], dig: null, aim: null, echoN: 0, tagged: 0, dirty: true, lastSheet: 0,
        st: { petals: 3, pt: 0, streak: 0, hot: false, hotN: 0, last: null, stacks: 0, count: 0 }, traps: [], bannerZ: null, sanctZ: null, bounty: 0 };
    }
    recalc(h) {
      const s = { hp: 0, dmg: 0, as: 0, ms: 0, cdr: 0, reg: 0, armor: 0, heal: 0, range: 0, area: 0, gold: 0, xp: 0, leech: 0, burn: 0, echo: 0, sight: 0, slowhit: 0 };
      for (const it of h.items) if (it) { const st = D.ITEM[it.id].stats; for (const k in st) s[k] += st[k]; }
      if (this.luck) { s.dmg += 0.06; s.hp += 20; }   // the lucky stone
      this.hook('recalc', h, s);
      h.S = s;
      const old = h.max; h.max = Math.round(h.K.hp + h.K.hpL * D.LEVELS.hpPer * (h.level - 1)) + s.hp; if (h.max > old) h.hp += h.max - old; h.hp = Math.min(h.hp, h.max);
      h.dmgMul = (1 + D.LEVELS.dmgPer * (h.level - 1)) * (1 + s.dmg) * (this.N0 === 1 ? (D.SOLO_DMG[h.hero] || 1) : this.noDps ? D.NO_DPS_DMG : D.PARTY_DMG[Math.min(4, this.N0) - 1]);   // a lone hero has no one to lean on
      h.healMul = (1 + D.LEVELS.dmgPer * (h.level - 1)) * (1 + s.heal);
      h.asMul = 1 + s.as; h.msMul = 1 + s.ms; h.cdrMul = Math.max(0.5, 1 - s.cdr); h.rangeMul = 1 + s.range;
      h.dirty = true;
    }

    // ================================================================ tick
    // Solo pause (the host's tab only): with one human in the run the sim can be held; every clock in it is sim.time, so holding the ticks
    // holds the wave timer, the quest-givers' calls, respawns, set-piece timers and the chain's gaps. Returns whether the hold is on.
    setPaused(on) {
      if (on && (this.st !== 'live' || this.over || this.players.length !== 1 || (this.introActive && this.introActive()))) return false;
      this.paused = !!on; return this.paused;
    }
    isPaused() { if (this.paused && (this.st !== 'live' || this.players.length !== 1)) this.paused = false; return !!this.paused; }
    tick(dt) {
      if (this.isPaused()) return;
      if (this.st === 'live') {
        this.time += dt; this.tickN++;
        this.runWaves(dt); this.updateNight(dt);
        this.buildHash();
        this.runTimers();
        for (const h of this.heroes) this.updateHero(h, dt);
        this.updateZones(dt); this.updateProjs(dt);
        const E = this.enemies;
        for (let i = 0; i < E.length; i++) if (!E[i].dead) this.updateEnemy(E[i], dt);
        this.hook('tick', dt);
        this.separate(); this.collideWalls();
        this.updateQuests(dt); this.updateSecrets(dt);
        if (this.tickN % 10 === 0) this.checkAlerts();
        this.reap(); this.buildHash();   // (rebuilt after the reap: a skill cast by an intent between ticks reads this hash, and the reap moved the indexes)
        if (this.camp.hp > 0 && this.camp.hp < this.camp.max && this.tickN % 20 === 0 && !this.enemyNear(HEARTH[0], HEARTH[1], CAMP_R)) this.camp.hp = Math.min(this.camp.max, this.camp.hp + 8 + (this.roofDone ? QT.roofHeal : 0));
        this.updateEnding(dt);
        this.checkEnd(dt);
      }
      if (this.st === 'live' || this.st === 'camp') {
        if (this.snapN++ % 2 === 0) this.sendSnapshot();
        if (this.st === 'live' && this.tickN % 4 === 0) for (const h of this.heroes) { const p = this.useSpot(h), k = p ? Math.round(p[0]) + ',' + Math.round(p[1]) : ''; if (k !== (h.useK || '')) { h.useK = k; h.useAt = p ? [Math.round(p[0]), Math.round(p[1])] : 0; h.dirty = true; } }
        if (this.st === 'live') for (const h of this.heroes) if (h.dirty ? this.time - h.lastSheet >= 0.2 : this.time - h.lastSheet >= 2) this.sendSheet(h);
      }
      this.flushEvents();
    }
    flushEvents() { if (this.events.length) { const ev = this.events; this.events = []; this.emit({ t: 'fdx', ev }); } }
    runTimers() {
      const T = this.timers;
      for (let i = 0; i < T.length; i++) if (T[i].t <= this.time) { const f = T[i].fn; T.splice(i, 1); i--; f(); }
    }

    // ================================================================ waves
    runWaves() {
      if (this.wave < D.LAST_WAVE && this.time >= this.nextWaveAt) this.startWave();
      const Q = this.spawnQ;
      for (let i = Q.length - 1; i >= 0; i--) if (Q[i].t <= this.time) { const s = Q[i]; Q.splice(i, 1); this.spawnEnemy(s.kind, s.lane); }
    }
    startWave() {
      const n = ++this.wave, def = D.WAVES[n - 1];
      this.nextWaveAt = D.WAVE_T0 + n * D.WAVE_GAP;
      if (!this.noSpawn) for (const g of def.groups) { const c = g.n; for (let i = 0; i < c; i++) this.spawnQ.push({ t: this.time + g.at + i * g.gap * (0.85 + this.rand() * 0.3), kind: g.kind, lane: g.lane }); }
      if (def.boss && !this.noSpawn) this.spawnQ.push({ t: this.time + (def.bossAt || 5), kind: def.boss, lane: def.bossLane || 0 });
      this.ev(['w', n, def.boss ? 1 : 0, def.boss ? D.ENEMIES[def.boss].idx : -1, D.partOf(n)]);
      const tr = D.tierOf(n); if (tr > this.tier) { this.tier = tr; for (let lane = 0; lane < 2; lane++) this.ev(['step', tr, lane, D.stepKind(lane, tr)]); }   // once per lane per step
      this.hook('wave', n);   // (quests keep their own pace: flowQuests)
      if (n === 11) this.addSecret(4, 5126, 2326);   // a glint in the ford, only at dawn
      if (n === 13) { const s = this.secrets.find(x => x.n === 4); if (s && !s.st) s.st = 2; }
      if (n === 6) { const c = this.secrets.find(s => s.n === 5); if (c) { this.child = { x: c.x, y: c.y, st: 1, path: null, pi: 0, follow: null, repathT: 0 }; this.markProps(); } }
    }
    spawnEnemy(kind, lane, at) {
      const def = D.ENEMIES[kind], path = this.paths[lane], i0 = 5 + Math.floor(this.rand() * 6), p = path[i0];
      const off = (this.rand() - 0.5) * 2 * (M.LANE_HW - 26), px = p[0] - p[4] * off, py = p[1] + p[3] * off;
      let hp = def.hp * D.hpScale(this.wave);   // waves and ordinary enemies do not depend on party size; main bosses and dam logs get a gentle step
      if (def.boss) hp = def.hp * D.bossHpMul(this.scaleN());
      if (def.inert) hp = def.hp * D.logHpMul(this.scaleN());
      const e = { tk: 'enemy', id: ++this.eid, kind, def, type: def.idx, lane, pi: i0, off: off * 0.6, x: at ? at[0] : px, y: at ? at[1] : py, r: def.r, face: lane ? PI : PI / 2, hp, max: hp, speed: def.speed,
        slowM: 1, slowT: 0, rootT: 0, stun: 0, stag: 0, blind: 0, burn: null, burnT: 0, burnAcc: 0, mark: null, tauntT: 0, taunter: null, kvx: 0, kvy: 0, atk: null, acd: this.rr(0, 0.6), tgt: null, tgtT: this.rr(0, 0.2),
        resume: false, stuck: 0, divert: lane === 1 && this.rand() < 0.6, dead: false, under: false, last: null, hitMask: 0, wallT: -9, ai: null, vuln: false, tier: 0, arm: 0 };
      if (!def.boss && !def.inert && !at) { const tr = D.tierOf(this.wave), mods = D.laneMods(lane, tr); e.tier = tr; e.arm = Math.min(0.5, mods.arm); e.speed = def.speed * (1 + mods.spd); }   // the lane's line-up has stepped up: stronger look, plate, pace
      if (def.boss) { e.ai = { ph: 'walk', t: 0, step: 0, gate: 0, next: 1, age: 0 }; this.bossRef = e; this.ev(['boss', e.id, def.idx]); }
      if (kind === 'oldgnaw' && this.q.cover && this.q.cover.st === 0) this.callQuest('cover');   // the Covering is part of the siege: its giver calls now if nobody has reached it
      if (lane === 0 && this.longWay && !at && !def.boss && !def.inert && this.rand() < 0.4) { e.route = this.longRoute(); e.ri = 0; e.long = true; }   // The Road: part of every wave takes the long way round
      this.enemies.push(e); this.emap.set(e.id, e);
      return e;
    }

    // an enemy off the lanes, run by a feature module: mod.update(e, dt) each tick (the module may call startAtk, resolveAtk,
    // stepToward, pickTarget, validTarget). o: { hp, tier, face }. Bosses spawned here do not set bossRef or send 'boss'.
    spawnAt(kind, x, y, mod, o) {
      o = o || {}; const def = D.ENEMIES[kind], hp = o.hp || def.hp;
      const e = { tk: 'enemy', id: ++this.eid, kind, def, type: def.idx, lane: -1, pi: 0, off: 0, x, y, r: def.r, face: o.face || PI / 2, hp, max: hp, speed: def.speed,
        slowM: 1, slowT: 0, rootT: 0, stun: 0, stag: 0, blind: 0, burn: null, burnT: 0, burnAcc: 0, mark: null, tauntT: 0, taunter: null, kvx: 0, kvy: 0, atk: null, acd: this.rr(0, 0.6), tgt: null, tgtT: 0,
        resume: false, stuck: 0, divert: false, dead: false, under: false, last: null, hitMask: 0, wallT: -9, ai: o.ai || {}, vuln: false, tier: o.tier || 0, arm: o.arm || 0, mod };
      this.enemies.push(e); this.emap.set(e.id, e);
      return e;
    }

    // ================================================================ spatial hash
    buildHash() {
      const E = this.enemies; if (this.hNext.length < E.length) this.hNext = new Int32Array(E.length * 2);
      this.hHead.fill(-1);
      for (let i = 0; i < E.length; i++) {
        const e = E[i]; if (e.dead) continue;
        const c = clamp(Math.floor(e.x / HASH), 0, HC - 1) + clamp(Math.floor(e.y / HASH), 0, HR - 1) * HC;
        this.hNext[i] = this.hHead[c]; this.hHead[c] = i;
      }
    }
    // enemies within R of a point (a fresh array: skills are not the hot path)
    inCircle(x, y, R) {
      const out = [], E = this.enemies, c0 = clamp(Math.floor((x - R - 60) / HASH), 0, HC - 1), c1 = clamp(Math.floor((x + R + 60) / HASH), 0, HC - 1), r0 = clamp(Math.floor((y - R - 60) / HASH), 0, HR - 1), r1 = clamp(Math.floor((y + R + 60) / HASH), 0, HR - 1);
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) for (let i = this.hHead[cx + cy * HC]; i !== -1; i = this.hNext[i]) { const e = E[i]; if (!e.dead && !e.under && hyp(e.x - x, e.y - y) < R + e.r * 0.5) out.push(e); }
      return out;
    }
    enemyNear(x, y, R) {
      const E = this.enemies; for (let i = 0; i < E.length; i++) { const e = E[i]; if (!e.dead && !e.under && hyp(e.x - x, e.y - y) < R) return true; } return false;
    }
    nearestEnemy(x, y, R, skip) {
      let best = null, bd = R; for (const e of this.inCircle(x, y, R)) { if (e === skip) continue; const d = hyp(e.x - x, e.y - y) - e.r * 0.5; if (d < bd) { bd = d; best = e; } } return best;
    }
    separate() {
      const E = this.enemies;
      for (let i = 0; i < E.length; i++) {
        const a = E[i]; if (a.dead || a.under) continue;
        const c0 = clamp(Math.floor((a.x - 50) / HASH), 0, HC - 1), c1 = clamp(Math.floor((a.x + 50) / HASH), 0, HC - 1), r0 = clamp(Math.floor((a.y - 50) / HASH), 0, HR - 1), r1 = clamp(Math.floor((a.y + 50) / HASH), 0, HR - 1);
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) for (let j = this.hHead[cx + cy * HC]; j !== -1; j = this.hNext[j]) {
          if (j <= i) continue; const b = E[j]; if (b.dead || b.under) continue;
          const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r - 2; if (dx > m || dx < -m || dy > m || dy < -m) continue;
          const d = hyp(dx, dy) || 0.01; if (d < m) { const ma = a.def.boss || a.def.inert ? 0 : 1, mb = b.def.boss || b.def.inert ? 0 : 1, p = (m - d) * 0.25, nx = dx / d, ny = dy / d; a.x -= nx * p * ma; a.y -= ny * p * ma; b.x += nx * p * mb; b.y += ny * p * mb; }
        }
      }
    }
    // a Wall zone is a segment: enemies are pushed off its front or back, and a blocked one hacks at it
    collideWalls() {
      for (const z of this.zones) {
        if (z.kind !== ZONE.WALL) continue;
        const ux = z.ux, uy = z.uy, nx = z.nx, ny = z.ny, half = z.a / 2;
        for (const e of this.enemies) {
          if (e.dead || e.under || e.def.boss || e.def.inert) continue;
          const dx = e.x - z.x, dy = e.y - z.y, u = dx * ux + dy * uy, v = dx * nx + dy * ny, rr = e.r + 8;
          if (Math.abs(u) <= half + e.r * 0.5 && Math.abs(v) < rr) { const side = v < 0 ? -1 : 1; e.x += nx * side * (rr - Math.abs(v)); e.y += ny * side * (rr - Math.abs(v)); e.wallT = this.time; e.wall = z; if (!e.atk && e.acd <= 0 && e.stun <= 0 && e.stag <= 0 && e.blind <= 0 && !e.def.ranged) this.startAtk(e, z); }
        }
      }
    }
    reap() {
      const E = this.enemies; let w = 0;
      for (let i = 0; i < E.length; i++) { const e = E[i]; if (e.dead) { this.emap.delete(e.id); continue; } E[w++] = e; }
      E.length = w;
    }

    // ================================================================ pathing (a coarse grid A* for heroes, cached)
    ensureGrid() {
      if (this.blocked) return; this.blocked = new Uint8Array(COLS * ROWS);
      for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) this.blocked[cx + cy * COLS] = M.walkable(cx * CELL + CELL / 2, cy * CELL + CELL / 2, 16) ? 0 : 1;
    }
    lineClear(x0, y0, x1, y1, rad = 12) {
      const d = hyp(x1 - x0, y1 - y0), n = Math.ceil(d / 20);
      for (let i = 1; i <= n; i++) { const t = i / n; if (!M.walkable(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad)) return false; }
      return true;
    }
    findPath(x0, y0, x1, y1) {
      [x1, y1] = this.nearestWalkable(x1, y1);
      if (this.lineClear(x0, y0, x1, y1)) return [[x1, y1]];
      this.ensureGrid(); const B = this.blocked;
      const free = (cx, cy) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < COLS && y < ROWS && !B[x + y * COLS]) return x + y * COLS; } return -1; };
      const s = free(clamp(Math.floor(x0 / CELL), 0, COLS - 1), clamp(Math.floor(y0 / CELL), 0, ROWS - 1)), g = free(clamp(Math.floor(x1 / CELL), 0, COLS - 1), clamp(Math.floor(y1 / CELL), 0, ROWS - 1));
      if (s < 0 || g < 0) return [[x1, y1]];
      const N = COLS * ROWS, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
      const gx = g % COLS, gy = (g / COLS) | 0, hf = i => { const dx = Math.abs((i % COLS) - gx), dy = Math.abs(((i / COLS) | 0) - gy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
      const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
      gs[s] = 0; push(hf(s), s);
      while (heap.length) {
        const [, i] = pop(); if (closed[i]) continue; closed[i] = 1; if (i === g) break;
        const cx = i % COLS, cy = (i / COLS) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue; const j = x + y * COLS; if (B[j] || closed[j]) continue;
          if (dx && dy && (B[cx + dx + cy * COLS] || B[cx + (cy + dy) * COLS])) continue;   // no cutting corners
          const ng = gs[i] + (dx && dy ? Math.SQRT2 : 1); if (ng < gs[j]) { gs[j] = ng; from[j] = i; push(ng + hf(j), j); }
        }
      }
      if (!closed[g]) return [[x1, y1]];
      const pts = []; for (let i = g; i !== s && i >= 0; i = from[i]) pts.push([(i % COLS) * CELL + CELL / 2, ((i / COLS) | 0) * CELL + CELL / 2]); pts.reverse();
      // smooth: skip ahead to the farthest waypoint in a clear line
      const out = []; let cx = x0, cy = y0, k = 0;
      while (k < pts.length) { let j = pts.length - 1; while (j > k && !this.lineClear(cx, cy, pts[j][0], pts[j][1])) j--; out.push(pts[j]); cx = pts[j][0]; cy = pts[j][1]; k = j + 1; }
      out.push([x1, y1]); return out;
    }
    pathTo(ent, x, y) { ent.path = this.findPath(ent.x, ent.y, x, y); ent.pi = 0; }
    // walk an entity along its path; returns true if it moved
    walkPath(ent, speed, dt) {
      if (!ent.path) return false;
      let step = speed * dt, moved = false;
      while (step > 0 && ent.path) {
        const wp = ent.path[ent.pi], dx = wp[0] - ent.x, dy = wp[1] - ent.y, d = hyp(dx, dy);
        if (d <= step + 0.01) { ent.x = wp[0]; ent.y = wp[1]; step -= d; moved = moved || d > 0.1; if (++ent.pi >= ent.path.length) { ent.path = null; } continue; }
        const nx = ent.x + dx / d * step, ny = ent.y + dy / d * step;
        if (M.walkable(nx, ny, 12)) { ent.x = nx; ent.y = ny; } else if (M.walkable(nx, ent.y, 12)) ent.x = nx; else if (M.walkable(ent.x, ny, 12)) ent.y = ny; else { ent.path = null; break; }
        ent.face = Math.atan2(dy, dx); moved = true; step = 0;
      }
      return moved;
    }

    // ================================================================ heroes
    heroSpeed(h) {
      let m = h.msMul; if (h.hasteT > 0) m += 0.25; if (h.rallyT > 0) m += 0.25; if (h.springT > 0) m += 0.25;
      if (h.boons.carthand && this.heroes.some(o => o !== h && !o.dead && hyp(o.x - h.x, o.y - h.y) < 250)) m += 0.15;
      if (h.carry) m -= h.carry === 'warm' ? 0.1 : (h.boons.steadyhands ? 0.03 : QT.carrySlow);
      if (h.boons.pathfinder && h.runT >= 2) m += 0.15;
      return h.K.speed * Math.max(0.3, m) * (h.slowT > 0 ? h.slowM : 1) * (SLOWAT ? SLOWAT(h.x, h.y) : 1);
    }
    updateHero(h, dt) {
      if (h.rcCd > 0) { h.rcCd -= dt; if (h.rcCd <= 0) h.dirty = true; }
      if (h.dashCd > 0) { h.dashCd -= dt; if (h.dashCd <= 0) h.dirty = true; }
      if (h.rcOn && (!h.chan || h.chan.kind !== 'recall' || h.stun > 0)) { if (h.chan && h.chan.kind === 'recall') h.chan = null; this.recallCancel(h); }   // a hit, a move, a cast, a stun or a fall ends it
      if (h.dead) { h.respT -= dt; if (h.respT <= 0) { if (h.blessed) { h.blessed = false; this.respawn(h, h.x, h.y, 0.6, 2); } else this.respawn(h, M.P.spring[0] + 50, M.P.spring[1] - 30, 1, 0); } return; }
      if (h.stun > 0) h.stun -= dt; if (h.rootT > 0) h.rootT -= dt; if (h.slowT > 0) h.slowT -= dt; if (h.hasteT > 0) h.hasteT -= dt; if (h.rallyT > 0) h.rallyT -= dt;
      if (h.rage > 0) h.rage -= dt; if (h.brand > 0 && h.brand < 9000) h.brand -= dt;
      if (h.springT > 0) h.springT -= dt; if (h.invul > 0) h.invul -= dt; if (h.lockT > 0) h.lockT -= dt; if (h.braceT > 0) h.braceT -= dt; if (h.atkT > 0) h.atkT -= dt;
      if (h.shieldT > 0) { h.shieldT -= dt; if (h.shieldT <= 0) h.shield = 0; }
      for (let i = h.hots.length - 1; i >= 0; i--) { const o = h.hots[i]; o.t -= dt; o.tick += dt; while (o.tick >= 0.5) { o.tick -= 0.5; this.heal(h, o.per, o.src, true); } if (o.t <= 0) h.hots.splice(i, 1); }
      const inCamp = hyp(h.x - HEARTH[0], h.y - HEARTH[1]) < CAMP_R, cdk = h.boons.hearthside && inCamp ? 1.3 : 1;
      if (inCamp) { if (!h.inCamp && h.awayT > 10 && h.boons.rafters) { h.shield = Math.max(h.shield, 40); h.shieldT = 8; h.dirty = true; } h.awayT = 0; } else h.awayT += dt;
      h.inCamp = inCamp;
      // charges recharge
      for (let i = 0; i < 4; i++) if (h.ch[i] < h.chMax[i]) { h.cdT[i] -= dt * cdk; if (h.cdT[i] <= 0) { h.ch[i]++; h.dirty = true; if (h.ch[i] < h.chMax[i]) h.cdT[i] += this.cdOf(h, i); else h.cdT[i] = 0; } }
      // the fountain, regeneration, passives
      const inFount = hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) < D.TUNE.fountainR;
      if (inFount) {
        const rate = (this.spring === 2 ? D.TUNE.full : D.TUNE.trickle) * (this.warm ? 1.3 : 1);
        if (h.hp < h.max) h.hp = Math.min(h.max, h.hp + rate * dt);
        h.drinkT += dt; if (h.boons.springstep && h.drinkT >= 1.5) h.springT = 10;
        if (h.boons.carriedwater && !h.flask) { h.flask = 1; h.dirty = true; }
      } else h.drinkT = 0;
      if (h.S.reg && h.hp < h.max) h.hp = Math.min(h.max, h.hp + h.S.reg * dt);
      if (h.boons.hearthside && inCamp && h.hp < h.max) h.hp = Math.min(h.max, h.hp + 3 * dt);
      if (h.boons.quiethands && this.time - h.lastHit > 4 && h.hp < h.max) h.hp = Math.min(h.max, h.hp + 0.025 * h.max * dt);
      const moving0 = !!h.path;
      if (h.boons.wellspring && !moving0 && !h.cast && h.hp < h.max) h.hp = Math.min(h.max, h.hp + 2.5 * dt);
      if (h.hero === 'cleric' && h.st.petals < 3) { h.st.pt += dt * (inFount ? 4 : 1); if (h.st.pt >= this.petalOf(h).t) { h.st.pt = 0; h.st.petals++; h.dirty = true; } }
      // casting
      if (h.cast) { h.cast.t += dt; if (h.cast.t >= h.cast.wind) { const f = h.cast.fn; h.cast = null; f(); } if (h.cast && !h.cast.mobile) { h.stillT = 0; return; } }
      if (h.dash) { if (h.stun > 0 || h.rootT > 0 || h.lockT > 0) h.dash = null; else { this.stepDash(h, dt); h.stillT = 0; return; } }
      if (h.stun > 0 || h.lockT > 0) return;
      if (h.chan) { if (this.stepChan(h, dt)) { h.stillT += dt; h.runT = 0; return; } }
      // a skill waiting for the hero to come into range
      if (h.pending) this.stepPending(h, dt);
      // walking
      let moving = false;
      if (h.path && h.rootT <= 0) moving = this.walkPath(h, this.heroSpeed(h), dt);
      if (h.fetch) { if (hyp(h.x - h.fetch.x, h.y - h.fetch.y) <= 60) { h.fetch = null; h.path = null; moving = false; this.interact(h); } else if (!h.path) h.fetch = null; }   // (sent by a right-click: arrived, it does what G would)
      h.stillT = moving ? 0 : h.stillT + dt; h.runT = moving ? h.runT + dt : 0;
      // attacking
      if (!moving && !h.path && !h.cast && !h.pending) this.stepAttack(h, dt);
    }
    stepPending(h, dt) {
      const p = h.pending, sk = h.K.skills[p.s]; p.age += dt;
      let t = null; if (p.unit) { t = p.e ? (p.e.dead ? null : p.e) : (p.u && !p.u.dead ? p.u : null); if (!t) { h.pending = null; h.path = null; return; } } else t = p.pt;
      if (p.age > 8) { h.pending = null; return; }
      const reach = this.castRange(h, p.s);
      if (hyp(t.x - h.x, t.y - h.y) - (t.r || 0) <= reach) { h.pending = null; h.path = null; this.tryCast(h, p.s, p.m); return; }
      h.repathT -= dt; if (!h.path || h.repathT <= 0) { h.repathT = 0.4; const d = hyp(t.x - h.x, t.y - h.y) || 1, k = Math.max(0, d - reach + 4) / d; this.pathTo(h, h.x + (t.x - h.x) * k, h.y + (t.y - h.y) * k); }
    }
    stepAttack(h, dt) {
      let t = h.target; if (t && (t.dead || t.under)) t = h.target = null;
      const range = h.K.range * (h.hero === 'bastion' ? 1 : h.rangeMul);
      if (!t && h.auto) t = this.nearestEnemy(h.x, h.y, range + 20);
      if (!t) return;
      const d = hyp(t.x - h.x, t.y - h.y) - t.r;
      if (d <= range) { h.face = Math.atan2(t.y - h.y, t.x - h.x); if (h.atkT <= 0) this.startAttack(h, t); }
      else if (h.target) { h.repathT -= dt; if (h.repathT <= 0) { h.repathT = 0.35; const dd = hyp(t.x - h.x, t.y - h.y) || 1, k = Math.max(0, dd - range + 6) / dd; this.pathTo(h, h.x + (t.x - h.x) * k, h.y + (t.y - h.y) * k); } }
    }
    startAttack(h, t) {
      let cd = h.K.aaCd / (h.asMul + (h.rallyT > 0 ? 0.25 : 0)), wind = 0.13;
      if (h.hero === 'ranger') { const s = h.st; if (s.last !== t) { s.last = t; s.stacks = Math.min(s.stacks, this.keenOf(h).keep); s.count = 0; } cd = Math.max(0.45, h.K.aaCd * (1 - 0.09 * s.stacks)) / h.asMul; wind = Math.min(0.16, cd * 0.4); }
      h.atkT = cd; h.cast = { slot: 4, t: 0, wind, mobile: false, fn: () => this.resolveAttack(h, t) };
    }
    resolveAttack(h, t) {
      if (h.dead || t.dead || t.under) return;
      const K = h.K, base = K.aaDmg, mk = (e, m, o) => { this.dmgE(e, base * m, h, o); if ((h.S.burn || h.boons.emberedge) && !e.dead) this.burnE(e, 3, 3, h); if (h.S.slowhit && !e.dead) this.slowE(e, 0.7, 1.2); const cleave = h.boons.axehand ? 0.5 : (this.N0 === 1 && h.hero === 'bastion' ? D.SOLO_CLEAVE : 0); if (cleave && !(o && o.noCleave)) for (const n of this.inCircle(e.x, e.y, 70)) if (n !== e) this.dmgE(n, base * m * cleave, h, { quiet: 1, aoe: 1, noCleave: 1 }); };
      h.face = Math.atan2(t.y - h.y, t.x - h.x); this.ev(['a', h.id, t.id]);
      if (h.hero === 'bastion') mk(t, 1, { kb: 5 });
      else if (h.hero === 'cleric') this.after(hyp(t.x - h.x, t.y - h.y) / 430, () => { if (!t.dead) mk(t, 1, { kb: 4 }); });
      else if (h.hero === 'pyromancer') this.after(hyp(t.x - h.x, t.y - h.y) / 380, () => { if (t.dead) return; const crit = this.pyroRoll(h); mk(t, crit ? 2 : 1, { kb: 5, fire: 1, crit }); });
      else {
        const s = h.st, KE = this.keenOf(h); s.count++; s.stacks = Math.min(5, s.stacks + 1);
        if (s.count % KE.every === 0) { const dx = t.x - h.x, dy = t.y - h.y, l = hyp(dx, dy) || 1, L = K.range + 90; for (const e of this.enemies) if (!e.dead && !e.under && segDist(e.x, e.y, h.x, h.y, h.x + dx / l * L, h.y + dy / l * L) < 7 + e.r * 0.85 && (e.x - h.x) * dx + (e.y - h.y) * dy > 0) mk(e, KE.pierce, { kb: 7 }); }
        else this.after(hyp(t.x - h.x, t.y - h.y) / 760, () => { if (!t.dead) mk(t, 1, { kb: 4 }); });
      }
    }
    // the passive's numbers for this hero's passive rank (0 is the passive as it always was)
    prank(h) { return Math.min(2, h.ranks[4] | 0); }
    petalOf(h) { return D.KITS.cleric.passive.petal[this.prank(h)]; }
    keenOf(h) { const P = D.KITS.ranger.passive, r = this.prank(h); return { every: P.every[r], pierce: P.pierce[r], keep: P.keep[r] }; }
    critChance(h) { return D.KITS.pyromancer.passive.crit[this.prank(h)]; }
    // a roll's result feeds the streak (the Coal Pouch rolls its own chance and calls this)
    streak(h, crit) {
      if (crit) { h.st.streak++; if (h.st.streak >= 2) { h.st.hot = true; h.st.hotN = D.KITS.pyromancer.passive.hot[this.prank(h)]; h.st.streak = 0; h.dirty = true; } } else h.st.streak = 0;
    }
    pyroRoll(h) { const crit = this.rand() < this.critChance(h); this.streak(h, crit); return crit; }
    respawn(h, x, y, hpFrac, invul) {
      h.dead = false; h.blessed = false; h.dash = null; h.hp = Math.max(1, Math.round(h.max * hpFrac)); [h.x, h.y] = this.nearestWalkable(x, y); h.path = null; h.invul = invul || 0; h.target = null; h.dirty = true;   // (a raise before the blessing's own rising spends it)
      this.ev(['hu', h.id, h.x, h.y]);
      if (h.boons.bluebellbloom) { h.invul = Math.max(h.invul, 2); for (const o of this.heroes) if (!o.dead && hyp(o.x - h.x, o.y - h.y) < 250) this.heal(o, 40, { healMul: 1 }); this.ev(['bb', h.id, Math.round(h.x), Math.round(h.y)]); }
    }
    killHero(h) {
      h.hp = 0; h.dead = true; h.dash = null; h.fetch = null; h.deaths++; h.respT = Math.min(D.TUNE.respawnMax, D.TUNE.respawn + D.TUNE.respawnPer * (h.deaths - 1)); h.cast = null; h.pending = null; h.path = null; h.target = null; h.carry && this.dropCarry(h);
      h.chan = null;
      if (this.blessing > 0) { this.blessing--; h.respT = 2.5; h.blessed = true; this.ev(['bl', h.id]); }   // The First Graves: once, a fallen hero rises by themselves
      for (const o of this.heroes) if (o !== h && !o.dead && o.boons.lastrites && hyp(o.x - h.x, o.y - h.y) < 500) { o.rage = 8; o.dirty = true; }
      this.stats[h.id].dth++; this.ev(['hd', h.id, h.x, h.y]); for (const e of this.enemies) if (e.tgt === h) e.tgt = null;
      h.dirty = true;
    }
    // every hit on a hero comes through here (armour, shields, Perfect Block)
    hurtHero(h, amt, src, o) {
      if (h.dead || h.invul > 0 || this.st !== 'live' || this.ending) return 0;
      if (o && o.block && h.hero === 'bastion' && h.braceT > 0) { this.perfectBlock(h, src); return 0; }
      let a = amt * (1 - Math.min(0.6, h.S.armor));
      if (h.hero === 'bastion' && h.ranks[1] >= 5 && h.bannerZ && !h.bannerZ.dead && hyp(h.x - h.bannerZ.x, h.y - h.bannerZ.y) < h.bannerZ.a + h.r) a *= 0.8;
      if (h.boons.hardground && !this.heroes.some(x => x !== h && !x.dead && hyp(x.x - h.x, x.y - h.y) < 350)) a *= 0.75;
      if (h.boons.roadwarden && this.inPostLight(h.x, h.y)) a *= 0.9;
      if (h.boons.longnight && this.night > 0.5) a *= 0.88;
      if (h.boons.stoneskin && this.time - h.lastHit > 6) a /= 3;
      a = Math.max(1, Math.round(this.hookVal('hurt', a, h, src)));
      if (h.shield > 0) { const ab = Math.min(h.shield, a); h.shield -= ab; a -= ab; if (a <= 0) return 0; }
      if (h.boons.laststand && h.hp - a <= 0 && this.time >= h.lsReady) { h.lsReady = this.time + 60; a = Math.max(0, Math.round(h.hp - 1)); this.ev(['ls', h.id]); }
      h.hp -= a; this.lastHurt = this.time; h.lastHit = this.time; h.dig = null; h.dirty = true;
      if (h.chan) { if (h.chan.kind === 'carve') this.carveHit(h); h.chan = null; }
      if (h.brand > 0 && h.boons.brandbearer && src && src.tk === 'enemy' && !src.dead) this.burnE(src, 4, 3, h);
      if (src && src.x !== undefined && h.stillT > -1) { /* hits do not move heroes */ }
      this.ev(['h', 1, h.id, a, 0, Math.round(h.x), Math.round(h.y)]);
      if (h.hp <= 0) this.killHero(h);
      return a;
    }
    heal(u, amt, src, quiet) {
      if (u.dead) return 0;
      let a = amt * (src && src.healMul ? src.healMul : 1);
      const room = u.max - u.hp;
      if (a > room) { const over = a - room; if (src && src.ups && src.ups.overflow) { u.shield = Math.min(40, u.shield + over); u.shieldT = 6; } a = room; }
      if (a <= 0) return 0;
      u.hp += a; if (src && src.id !== undefined && this.stats[src.id]) this.stats[src.id].heal += a;
      u.healAcc += a; if (!quiet || u.healAcc >= 10) { this.ev(['h', 1, u.id, Math.round(u.healAcc), 2, Math.round(u.x), Math.round(u.y)]); u.healAcc = 0; }
      return a;
    }
    perfectBlock(h, src) {
      h.braceT = 0; h.ch[0] = h.chMax[0]; h.cdT[0] = 0; h.dirty = true;
      const ang = src && src.x !== undefined ? Math.atan2(src.y - h.y, src.x - h.x) : h.face; h.face = ang;
      const PB = D.KITS.bastion.passive.pb[this.prank(h)], reach = PB.reach, half = PB.half;
      this.ev(['pb', h.id, Math.round(h.x), Math.round(h.y), r2(ang), this.prank(h)]);
      if (PB.shield) { h.shield = Math.max(h.shield, PB.shield); h.shieldT = Math.max(h.shieldT, 4); }
      for (const e of this.inCircle(h.x, h.y, reach)) { const d = hyp(e.x - h.x, e.y - h.y); if (Math.abs(angDiff(ang, Math.atan2(e.y - h.y, e.x - h.x))) > half + 0.12 && d > e.r + 14) continue; this.dmgE(e, PB.dmg, h, { kb: e.def.elite ? 95 : 100, aoe: 1 }); if (!e.def.boss) { e.stag = 0.45; e.atk = null; } }
      if (h.ups.secondwind) this.heal(h, 20, h);
    }
    // a hero is raised (Dawn Breaks, or the timer)
    raise(h, hpFrac, invul) { if (h.dead) this.respawn(h, h.x, h.y, hpFrac, invul); }

    // ================================================================ recall, ping, lane alerts
    startRecall(h) {
      if (h.dead || this.st !== 'live' || this.ending || h.rcCd > 0 || h.stun > 0 || h.rcOn) return;
      if (hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) < RECALL.minFrom) return;   // already home
      h.path = null; h.pending = null; h.target = null; h.cast = null; h.chan = { kind: 'recall', t: 0, need: RECALL.secs }; h.rcOn = true; h.dirty = true;
      this.ev(['rc', h.id, 1]);
    }
    // the dash (the hotbar's Dash key, Space by default): a short burst toward the cursor on its own cooldown. It breaks a recall or a
    // channel, stops at anything solid, and the hero walks on to where it was going.
    startDash(h, x, y) {
      if (h.dead || h.dash || h.dashCd > 0 || h.stun > 0 || h.rootT > 0 || h.lockT > 0 || (h.cast && !h.cast.mobile && h.cast.slot !== 4)) return;   // (a basic swing still winding up gives way to a dash)
      let dx = x - h.x, dy = y - h.y, d = hyp(dx, dy); if (d < 4) { dx = Math.cos(h.face || 0); dy = Math.sin(h.face || 0); d = 1; }
      const ux = dx / d, uy = dy / d; let L = 0;
      while (L + 8 <= DASH.dist && M.walkable(h.x + ux * (L + 8), h.y + uy * (L + 8), 12)) L += 8;
      if (L < 16) return;
      if (h.rcOn) this.recallCancel(h);
      const to = h.path && h.path.length ? h.path[h.path.length - 1] : null;
      if (h.cast && h.cast.slot === 4) h.cast = null;
      h.chan = null; h.pending = null; h.dig = null; h.path = null; h.face = Math.atan2(uy, ux);   // (a walk to a giver goes on after: h.talk stays)
      h.dash = { ux, uy, left: L, v: DASH.dist / DASH.dur, to }; h.dashCd = DASH.cd; h.dirty = true;
      this.ev(['dsh', h.id, Math.round(h.x), Math.round(h.y), Math.round(h.x + ux * L), Math.round(h.y + uy * L)]);
    }
    stepDash(h, dt) {
      const o = h.dash, s = Math.min(o.left, o.v * dt); h.x += o.ux * s; h.y += o.uy * s; o.left -= s;
      if (o.left <= 0.5) { h.dash = null; if (o.to && !h.path && !h.target && !h.pending && !h.chan) this.pathTo(h, o.to[0], o.to[1]); }   // (an order given during the dash wins over the old walk)
    }
    recallCancel(h) { if (!h.rcOn) return; h.rcOn = false; h.rcCd = Math.max(h.rcCd || 0, RECALL.cancelCd); h.dirty = true; this.ev(['rc', h.id, 0]); }
    recallArrive(h) {
      h.rcOn = false; h.rcCd = RECALL.cd; h.dirty = true;
      const pt = this.nearestWalkable(M.P.spring[0] + 50, M.P.spring[1] - 30); h.x = pt[0]; h.y = pt[1]; h.path = null; h.target = null; h.pending = null;
      this.ev(['rc', h.id, 2, Math.round(h.x), Math.round(h.y)]);
    }
    ping(h, m) {
      if (!num(m.x) || !num(m.y) || this.time - (h.pingT === undefined ? -99 : h.pingT) < PING_GAP) return;
      h.pingT = this.time; this.ev(['pi', h.id, Math.round(clamp(m.x, 0, M.W)), Math.round(clamp(m.y, 0, M.H))]);
    }
    // a lane is truly breaking: an enemy (two, or an elite) past the lane's halfway mark toward the camp with no hero within 500 px of it, or the gate under 40% with enemies at it
    laneHalf(lane) { if (!this._half) this._half = this.paths.map(P => { const tot = P[P.length - 1][2]; let i = 0; while (i < P.length - 1 && P[i][2] < tot / 2) i++; return i; }); return this._half[lane]; }
    checkAlerts() {
      const hit = [0, 0], far = ALERT.far;
      for (const e of this.enemies) {
        if (e.dead || e.under || e.def.inert || e.route || e.long) continue;
        if (e.pi < this.laneHalf(e.lane)) continue;
        let near = false; for (const h of this.heroes) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < far) { near = true; break; }
        if (!near) hit[e.lane] += (e.def.elite ? 2 : 1);
      }
      if (this.pal && this.pal.hp < this.pal.max * ALERT.gate && this.enemyNear(this.pal.x, this.pal.y, 380)) hit[0] += 2;
      for (let lane = 0; lane < 2; lane++) if (hit[lane] >= 2 && this.time - this.alertT[lane] >= ALERT.gap) { this.alertT[lane] = this.time; this.ev(['al', lane]); }
    }

    // ================================================================ casting
    castRange(h, s) {
      const sk = h.K.skills[s]; let r = Array.isArray(sk.range) ? rk(sk.range, h.ranks[SLOT[s]]) : sk.range;
      if (h.hero === 'bastion' && s === 'q') return h.ups.shieldcharge ? 260 : 42;
      if (r === undefined) return 0;
      if (h.hero === 'pyromancer' && s === 'e' && h.ups.longstride) r *= 2;
      return r * h.rangeMul;
    }
    cdOf(h, i) {
      const s = SLOT_NAMES[i], sk = h.K.skills[s]; let cd = rk(sk.cd, h.ranks[i]);
      if (h.hero === 'cleric' && s === 'r' && h.ups.earlylight) cd = 35;
      return cd * h.cdrMul;
    }
    // skill points: one a level; a rank opens at the level D.LEVELS.gate(slot, rank) gives (Q W E 1 3 5 7 9, R 6 11 16, the passive 8 14)
    spent(h) { return (h.ranks[0] | 0) + (h.ranks[1] | 0) + (h.ranks[2] | 0) + (h.ranks[3] | 0) + (h.ranks[4] | 0); }
    canLearn(h, s) {
      const i = s === 'p' ? 4 : SLOT[s]; if (i === undefined || !h.K.skills[s]) return false;
      const r = h.ranks[i] | 0; return r < h.K.skills[s].maxRank && h.level >= D.LEVELS.gate(s, r + 1) && h.level - this.spent(h) > 0;
    }
    learn(h, s) {
      if (!this.canLearn(h, s)) return;
      const i = s === 'p' ? 4 : SLOT[s]; h.ranks[i] = (h.ranks[i] | 0) + 1; h.dirty = true;
    }
    buyUp(h, id) {
      const u = D.UPGRADES[id]; if (!u || u.hero !== h.hero || h.ups[id] || h.dead) return;
      const i = SLOT[u.slot]; if (h.ranks[i] < 1 || !this.atShop(h)) return;
      const owned = D.KITS[h.hero].skills[u.slot].ups.filter(x => h.ups[x.id]).length, price = D.upgradePrice(u.slot, owned);
      if (h.gold < price) return;
      h.gold -= price; h.ups[id] = 1; h.dirty = true;
      if (id === 'twinflame' || id === 'doublestep' || id === 'twinsanctum') { h.chMax[i] = 2; }
      this.ev(['up', h.id, id]);
    }
    atShop(h) { return hyp(h.x - M.P.shop[0], h.y - M.P.shop[1]) <= 260; }
    shopStock() { return D.ITEMS.filter(x => x.shop === 'basic' || (x.shop === 'forged' && this.forge === 2)); }
    freeSlot(h) { return h.items.indexOf(null); }
    buyItem(h, id) {
      const it = D.ITEM[id]; if (!it || h.dead || !this.atShop(h)) return;
      if (!this.shopStock().includes(it) || h.gold < it.price) return;
      const s = this.freeSlot(h); if (s < 0) return;
      h.gold -= it.price; h.items[s] = { uid: ++this.uid, id }; this.recalc(h);
    }
    giveItem(h, id) { const s = this.freeSlot(h); if (s < 0) return false; h.items[s] = { uid: ++this.uid, id }; this.recalc(h); return true; }
    useItem(h, slot) {
      if (h.dead) return;
      if (slot === 'f') { if (h.flask) { h.flask = 0; this.heal(h, 80, h); h.dirty = true; } return; }
      const it = Number.isInteger(slot) && h.items[slot]; if (!it) return;
      const d = D.ITEM[it.id]; if (!d.use) return;
      if (d.use.heal) this.heal(h, d.use.heal, { healMul: 1 }); h.items[slot] = null; this.recalc(h);
    }
    forgeItems(h, a, b) {
      if (h.dead || this.forge !== 2 || a === b || hyp(h.x - M.P.forge[0], h.y - M.P.forge[1]) > 220) return;
      const ia = h.items.findIndex(x => x && x.uid === a), ib = h.items.findIndex(x => x && x.uid === b); if (ia < 0 || ib < 0) return;
      const A = D.ITEM[h.items[ia].id], B = D.ITEM[h.items[ib].id]; if (A.rar !== B.rar || !D.canForge(A.rar)) return;   // only Rare and up
      let hyper = false, pool;
      if (A.rar === 4) pool = D.ITEMS.filter(x => x.rar === 4 && x.id !== A.id && x.id !== B.id && !x.sec);
      else { hyper = A.rar === 2 && this.rand() < D.HYPER_CHANCE; pool = D.ITEMS.filter(x => x.rar === D.forgeTargetRarity(A.rar, hyper) && !x.sec); }
      if (!pool.length) return;
      const res = pool[Math.floor(this.rand() * pool.length)];
      h.items[ia] = { uid: ++this.uid, id: res.id }; h.items[ib] = null; this.recalc(h);
      this.ev(['fg', h.id, res.id, hyper ? 1 : 0]);
    }
    // Common and Uncommon items can be sold for half their price (anywhere: the bag and the tent both offer it)
    sellItem(h, slot) {
      if (h.dead || !Number.isInteger(slot) || slot < 0 || slot >= h.items.length || !h.items[slot]) return;
      const it = D.ITEM[h.items[slot].id]; if (!it || !D.canSell(it.rar) || it.sec) return;
      const gold = D.sellPrice(it); h.items[slot] = null; h.gold += gold; this.recalc(h); h.dirty = true;
      this.ev(['sl', h.id, it.id, gold]);
    }
    pickBoon(h, id) { if (!h.offers || !h.offers.includes(id)) return; h.boons[id] = 1; h.offers = h.offerQ.length ? h.offerQ.shift() : null; h.dirty = true; if (id === 'carriedwater') h.flask = 1; this.recalc(h); }

    tryCast(h, s, m) {
      const i = SLOT[s], sk = h.K.skills[s]; if (h.dead || h.stun > 0 || h.ranks[i] < 1) return;
      if (s === 'r' && h.level < D.LEVELS.rLevel) return;
      // a second press of Long Watch or Wandering Light moves the first
      if (sk.type === 'ground' && num(m.x) && num(m.y)) {
        const z = (h.hero === 'bastion' && s === 'w' && h.ups.longwatch) ? h.bannerZ : (h.hero === 'cleric' && s === 'e' && h.ups.wanderinglight) ? h.sanctZ : null;
        if (z && !z.dead && !z.moved && h.ch[i] < h.chMax[i]) { const R = this.castRange(h, s), d = hyp(m.x - h.x, m.y - h.y), k = d > R ? R / d : 1; z.x = h.x + (m.x - h.x) * k; z.y = h.y + (m.y - h.y) * k; z.moved = true; this.ev(['r', h.id, i, Math.round(z.x), Math.round(z.y), Math.round(h.x), Math.round(h.y), h.ranks[i]]); return; }
      }
      if (h.ch[i] < 1) return;
      if (h.cast && !h.cast.mobile) return;
      const a = { m };
      if (sk.type === 'unit') {
        if (sk.tgt === 'enemy') { let e = this.enemyById(m.id); if (!e) e = this.nearestEnemy(h.x, h.y, this.castRange(h, s) + 60); if (!e || e.under) return; a.e = e; }
        else { let u = typeof m.id === 'string' || typeof m.id === 'number' ? this.hmap[m.id] : null; if (!u || u.dead) u = h; if (h.st.petals < 1) return; a.u = u; }
      } else if (sk.type === 'ground' || sk.type === 'shot') {
        if (!num(m.x) || !num(m.y)) return; a.x = clamp(m.x, 0, M.W); a.y = clamp(m.y, 0, M.H);
      } else { a.x = num(m.x) ? m.x : h.x + Math.cos(h.face) * 60; a.y = num(m.y) ? m.y : h.y + Math.sin(h.face) * 60; }
      // out of reach: walk into range first
      const tgt = a.e || a.u || (sk.type === 'ground' && sk.shape !== 'blink' ? { x: a.x, y: a.y, r: 0 } : null);
      if (tgt && tgt !== h && hyp(tgt.x - h.x, tgt.y - h.y) - (tgt.r || 0) > this.castRange(h, s) + 0.5) {
        h.pending = { s, m, e: a.e, u: a.u, pt: a.e || a.u ? null : { x: a.x, y: a.y, r: 0 }, unit: !!(a.e || a.u), age: 0 }; h.repathT = 0; h.target = null; return;
      }
      h.pending = null; this.beginCast(h, s, a);
    }
    beginCast(h, s, a) {
      const i = SLOT[s], sk = h.K.skills[s], r = h.ranks[i];
      let wind = sk.wind, mobile = false;
      if (h.hero === 'pyromancer' && s === 'q') { a.hot = h.st.hot; if (a.hot) { if (--h.st.hotN <= 0) h.st.hot = false; wind = 0; } }
      if (h.hero === 'cleric' && s === 'q' && h.ups.swiftmend) { wind = 0; mobile = true; }
      if (h.ch[i] === h.chMax[i]) h.cdT[i] = this.cdOf(h, i); h.ch[i]--; h.dirty = true;
      if (!mobile) h.path = null; h.target = null; h.chan = null; h.casts = (h.casts || 0) + 1;
      const tx = a.e ? a.e.x : a.u ? a.u.x : a.x, ty = a.e ? a.e.y : a.u ? a.u.y : a.y;
      if (tx !== undefined) h.face = Math.atan2(ty - h.y, tx - h.x);
      if (h.hero === 'cleric' && s === 'q') { const free = (this.petalOf(h).free && h.st.petals >= 3) || (h.ranks[0] >= 5 && a.u && a.u.hp < a.u.max * 0.5); if (!free) { h.st.petals--; h.st.pt = 0; } }
      this.ev(['c', h.id, i, r2(wind), Math.round(tx === undefined ? h.x : tx), Math.round(ty === undefined ? h.y : ty), a.e ? a.e.id : 0]);
      if (wind <= 0) this.release(h, s, a, 1); else h.cast = { slot: i, t: 0, wind, mobile, fn: () => this.release(h, s, a, 1) };
    }
    release(h, s, a, pw) {
      if (h.dead) return; const i = SLOT[s];
      this.casts++; SK[h.hero + '.' + s].call(this, h, h.ranks[i], a, pw);
      if (pw === 1 && h.S.echo && ++h.echoN % 4 === 0) this.after(0.7, () => { if (!h.dead && !h.gone && !(a.e && a.e.dead)) SK[h.hero + '.' + s].call(this, h, h.ranks[i], a, 0.5); });
      if (s === 'r' && h.boons.bellows) for (let k = 0; k < 3; k++) if (h.ch[k] < h.chMax[k]) h.cdT[k] *= 0.5;
      if (s === 'r' && h.boons.capstoneward) for (const o of this.heroes) if (!o.dead && hyp(o.x - h.x, o.y - h.y) < 250) { o.shield = Math.max(o.shield, 35); o.shieldT = 6; o.dirty = true; }
      h.dirty = true;
    }
    fx(h, i, x, y, r) { this.ev(['r', h.id, i, Math.round(x), Math.round(y), Math.round(h.x), Math.round(h.y), r === undefined ? h.ranks[i] : r]); }
    impact(h, i, x, y, rad) { this.ev(['im', h.id, i, Math.round(x), Math.round(y), Math.round(rad)]); }

    // ================================================================ damage to enemies
    dmgE(e, amt, h, o) {
      if (e.dead || e.under || e.invuln) return 0; o = o || {};
      let a = amt * (o.pw || 1);
      if (h) {
        a *= h.dmgMul; if (h.rage > 0) a *= 1.2; if (h.boons.lamplighter && hyp(e.x - h.x, e.y - h.y) < this.lampR(h)) a *= 1.08; if (h.boons.roadwarden && this.inPostLight(h.x, h.y)) a *= 1.1; if (h.boons.longnight && this.night > 0.5) a *= 1.06; if (h.boons.stragglersbane && e.long) a *= 1.15;
        if (h.boons.tempered && h.tagged !== undefined) { const bit = 1 << this.players.findIndex(p => p.id === h.id); if (!(e.hitMask & bit)) { e.hitMask |= bit; a *= 2; o.crit = 1; } }
      }
      if (e.mark) a *= e.mark.m;
      if (e.vuln) a *= 1.25; if (e.crack > 0) a *= 1.06; if (e.arm) a *= 1 - e.arm;
      if (e.def.shield && !o.aoe && h && Math.abs(angDiff(e.face, Math.atan2(h.y - e.y, h.x - e.x))) < e.def.shield.half) a *= e.def.shield.mult;
      a = Math.max(1, Math.round(this.hookVal('hit', a, e, h, o))); e.hp -= a; e.last = h || e.last; if (h && h.boons.chisel) e.crack = 3;
      if (h) { const S = this.stats[h.id]; if (S) S.dmg += a; if (h.S.leech) this.heal(h, a * h.S.leech, { healMul: 1 }, true); }
      if (!o.quiet && this.events.length < 120) this.ev(['h', 0, e.id, a, o.crit ? 1 : 0, Math.round(e.x), Math.round(e.y)]);
      if (o.kb && h) { const ang = Math.atan2(e.y - (o.fy !== undefined ? o.fy : h.y), e.x - (o.fx !== undefined ? o.fx : h.x)), res = 1 - (e.def.kbRes || 0); e.kvx += Math.cos(ang) * o.kb * 7 * res; e.kvy += Math.sin(ang) * o.kb * 7 * res; }
      if (o.stun) this.stunE(e, o.stun, h);
      if (o.stag && !e.def.boss) e.stag = Math.max(e.stag, o.stag);
      if (e.hp <= 0) this.killE(e, h);
      return a;
    }
    stunE(e, t, h) { if (e.def.boss || e.def.inert || t <= 0) return; if (h && h.boons.stonemason) t *= 1.3; e.stun = Math.max(e.stun, t); e.atk = null; }
    rootE(e, t, h) { if (e.def.boss || e.def.inert) return; if (h && h.boons.stonemason) t *= 1.3; e.rootT = Math.max(e.rootT, t); }
    slowE(e, m, t) { if (e.def.boss) m = 1 - (1 - m) * 0.5; if (m < e.slowM || e.slowT <= 0) e.slowM = m; e.slowT = Math.max(e.slowT, t); }
    burnE(e, dps, t, h) { if (e.dead || e.under) return; if (!e.burn || dps >= e.burn.dps) e.burn = { dps, src: h }; e.burnT = Math.max(e.burnT, t); }
    killE(e, h) {
      e.dead = true; this.ev(['d', e.id, Math.round(e.x), Math.round(e.y), r2(e.face), Math.round(e.kvx * 0.6), Math.round(e.kvy * 0.6), e.def.elite ? 1 : 0]);
      const def = e.def, killer = h || e.last, alive = this.heroes.filter(x => !x.dead);
      if (killer && this.stats[killer.id]) this.stats[killer.id].kills++;
      const near = alive.filter(x => hyp(x.x - e.x, x.y - e.y) <= D.LEVELS.share), xpEach = def.xp * D.xpMul(this.scaleN()) / Math.max(1, near.length);   // WC3-style: split equally among the living heroes near it, none for the rest
      for (const x of near) this.addXp(x, xpEach);
      for (const x of alive) {
        const g = def.gold * (x === killer ? 1 : 0.4) * (1 + x.S.gold);
        x.gold += Math.round(g); this.stats[x.id].gold += Math.round(g); x.dirty = true;
      }
      if (e.mark && e.mark.src) { const ow = e.mark.src; if (ow.ups.bounty && !ow.dead) { ow.gold += 8; this.stats[ow.id].gold += 8; ow.dirty = true; } if (ow.ups.passingmark && !ow.dead) { const n = this.nearestEnemy(e.x, e.y, 250, e); if (n) { n.mark = { m: e.mark.m, t: Math.max(2, e.mark.t), src: ow }; } } }
      if (def.drop) this.dropItem(e);
      this.hook('kill', e, killer);
      if (def.boss) { this.ev(['bossdown', e.id, def.idx]); this.bossCleanup(e); }
      if (e.kind === 'damlog') this.logDown(e);
    }
    dropItem(e) {
      if (!this.autoLoot && this.worldDrop && this.hook('drop', e)) return;   // sim-world.js: the drop lies where it fell until a hero picks it up
      const w = D.dropWeights(this.wave), tot = w.reduce((a, b) => a + b, 0), n = def => def;
      for (let k = 0; k < (e.def.drop || 1); k++) {
        let x = this.rand() * tot, rar = 0; for (; rar < 4; rar++) { if (x < w[rar]) break; x -= w[rar]; }
        const hs = this.heroes.filter(x => !x.dead); if (!hs.length) return;
        for (let t = 0; t < hs.length; t++) {
          const h = hs[(this.dropN++) % hs.length];
          if (this.freeSlot(h) >= 0) { const pool = D.ITEMS.filter(i => i.rar === rar && !i.sec && (!i.hero || i.hero === h.hero)), it = pool[Math.floor(this.rand() * pool.length)]; if (it) { this.giveItem(h, it.id); this.ev(['dr', h.id, it.id]); } break; }   // (a hero's own pieces only drop for that hero)
          else if (t === hs.length - 1) { h.gold += 20; }
        }
      }
    }
    addXp(h, n) {
      h.xp += n * (1 + h.S.xp); h.xpAll += n * (1 + h.S.xp);
      while (h.level < D.LEVELS.max && h.xp >= D.LEVELS.need(h.level)) { h.xp -= D.LEVELS.need(h.level); h.level++; this.recalc(h); this.ev(['lv', h.id, h.level]); }
      if (h.level >= D.LEVELS.max) h.xp = 0;
      h.dirty = true;
    }

    // ================================================================ enemies
    updateEnemy(e, dt) {
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowM = 1; }
      if (e.rootT > 0) e.rootT -= dt; if (e.stun > 0) e.stun -= dt; if (e.stag > 0) e.stag -= dt; if (e.blind > 0) e.blind -= dt; if (e.tauntT > 0) e.tauntT -= dt;
      if (e.mark) { e.mark.t -= dt; if (e.mark.t <= 0) e.mark = null; else if (e.mark.slow) this.slowE(e, 0.7, 0.3); }
      if (e.burn) { e.burnT -= dt; e.burnAcc += dt; while (e.burnAcc >= 0.5) { e.burnAcc -= 0.5; this.dmgE(e, e.burn.dps * 0.5, e.burn.src, { quiet: 1, aoe: 1 }); if (e.dead) return; } if (e.burnT <= 0) e.burn = null; }
      e.acd -= dt;
      // knockback slides and decays
      if (e.kvx * e.kvx + e.kvy * e.kvy > 9) { const nx = e.x + e.kvx * dt, ny = e.y + e.kvy * dt; if (M.walkable(nx, ny, 8)) { e.x = nx; e.y = ny; } const k = Math.exp(-dt * 6); e.kvx *= k; e.kvy *= k; } else { e.kvx = 0; e.kvy = 0; }
      if (e.crack > 0) e.crack -= dt;
      if (e.def.inert) return;
      if (e.mod) { e.mod.update(e, dt); return; }   // a feature module runs this one (wild camps, the chain): see spawnAt
      if (e.def.devour) for (const p of this.posts) if (p.lit && hyp(p.x - e.x, p.y - e.y) < e.r + 50) { p.lit = false; this.ev(['wk', e.id, p.slot]); }
      if (e.def.boss) return this.updateBoss(e, dt);
      if (e.stun > 0 || e.stag > 0) { e.atk = null; return; }
      if (e.atk) { e.atk.t += dt; if (e.atk.t >= e.atk.dur) this.resolveAtk(e); return; }
      if ((e.tgtT -= dt) <= 0) { e.tgtT = 0.2 + this.rand() * 0.1; const had = e.tgt; this.pickTarget(e); if (had && !e.tgt) e.resume = true; }
      let t = e.tgt;
      if (t && !this.validTarget(t, e)) { t = e.tgt = null; e.resume = true; }
      if (!t) { this.followLane(e, dt); return; }
      const atk = e.def.atk, gap = hyp(t.x - e.x, t.y - e.y) - e.r - (t.r || 0), range = atk.range || atk.reach;
      if (gap > range) { if (e.rootT <= 0) { if (e.def.runner && (t.tk !== 'hero' || e.def.hunt)) this.runnerStep(e, t, dt); else this.stepToward(e, t.x, t.y, dt); if (e.stuck > 1.2) { e.tgt = null; e.resume = true; } } }
      else { e.face += angDiff(e.face, Math.atan2(t.y - e.y, t.x - e.x)) * Math.min(1, dt * 10); if (e.acd <= 0 && e.blind <= 0) this.startAtk(e, t); }
    }
    // a runner finds its way to a quest object round trees and the river (a grid path, redone every second or two)
    runnerStep(e, t, dt) {
      e.rpT = (e.rpT || 0) - dt;
      if (!e.rp || e.rpT <= 0 || e.rpFor !== t) { e.rp = this.findPath(e.x, e.y, t.x, t.y); e.rpi = 0; e.rpT = 1.5; e.rpFor = t; }
      const w = e.rp[Math.min(e.rpi, e.rp.length - 1)]; if (hyp(w[0] - e.x, w[1] - e.y) < 14 && e.rpi < e.rp.length - 1) e.rpi++;
      this.stepToward(e, w[0], w[1], dt);
    }
    validTarget(t, e) {
      switch (t.tk) {
        case 'hero': return !t.dead && hyp(t.x - e.x, t.y - e.y) < Math.max(e.def.aggro, 140) * 1.8 + (e.tauntT > 0 ? 600 : 0) + (e.def.hunt && t.carry ? 1500 : 0);
        case 'drop': return !t.gone;
        case 'camp': return this.camp.hp > 0;
        case 'pal': return !!this.pal && this.pal.hp > 0;
        case 'cart': return t.hp > 0 && !t.gone;
        case 'smith': return !!this.smith && this.smith.hp > 0 && this.q.fire.st === 1;
        case 'dig': return !!this.dig;
        case 'wall': return !t.dead && e.wallT > this.time - 1.0;
        case 'ally': return !t.dead && hyp(t.x - e.x, t.y - e.y) < Math.max(e.def.aggro, 140) * 1.8 + (t.r || 0);
      }
      return false;
    }
    pickTarget(e) {
      const def = e.def, ax = e.x, ay = e.y;
      if (e.tauntT > 0 && e.taunter && !e.taunter.dead) { e.tgt = e.taunter; return; }
      if (this.covering && !def.boss) {   // The Covering: every enemy on both lanes turns for the camp
        let ch = null, cd = 110; for (const h of this.heroes) if (!h.dead) { const d = hyp(h.x - ax, h.y - ay); if (d < cd) { cd = d; ch = h; } }
        if (ch) { e.tgt = ch; return; }
        e.tgt = hyp(ax - HEARTH[0], ay - HEARTH[1]) - CAMP_R - e.r - (def.atk.range || 0) <= 20 && this.camp.hp > 0 ? this.camp : null; return;
      }
      // the nearest hero in aggro range
      let hero = null, hd = def.aggro;
      for (const h of this.heroes) { if (h.dead) continue; const d = hyp(h.x - ax, h.y - ay); if (d < hd) { hd = d; hero = h; } }
      for (const u of this.allies) { if (u.dead) continue; const d = hyp(u.x - ax, u.y - ay) - (u.r || 0); if (d < hd) { hd = d; hero = u; } }   // towers and soldiers count as heroes here
      if (def.hunt) {   // cart-burners hunt whoever carries something for the town, and what has been set down
        let best = null, bd = 1500; for (const h of this.heroes) if (!h.dead && h.carry && h.carry !== 'warm') { const d = hyp(h.x - ax, h.y - ay); if (d < bd) { bd = d; best = h; } }
        if (!best) for (const dr of this.drops) if (!dr.gone) { const d = hyp(dr.x - ax, dr.y - ay); if (d < bd) { bd = d; best = dr; } }
        if (best && !(hero && hd < 50)) { e.tgt = best; return; }
      }
      // quest objects: runners go for them from anywhere they can walk straight to; others only fight what they bump into
      let obj = null, od = def.runner ? 9999 : def.aggro + 60;
      const consider = o => { const d = hyp(o.x - ax, o.y - ay); if (d < od && (def.runner ? true : e.divert ? this.lineClear(ax, ay, o.x, o.y, 8) : true)) { od = d; obj = o; } };
      for (const c of this.carts) if (!c.gone && c.hp > 0) consider(c);
      if (this.smith && this.smith.hp > 0 && this.q.fire.st === 1 && (def.runner || (e.lane === 1 && e.divert && e.pi >= this.fordIdx - 6))) { od = def.runner ? od : 9999; consider(this.smith); }
      if (this.dig && def.runner) consider({ tk: 'dig', x: this.dig.x, y: this.dig.y, r: 30 });
      if (obj && obj.tk === 'dig') obj = this.digTarget;
      if (obj && (def.runner && !(hero && hd < 50))) { e.tgt = obj; return; }
      if (hero) { e.tgt = hero; return; }
      if (obj) { e.tgt = obj; return; }
      if (this.pal && this.pal.hp > 0 && e.lane === 0 && e.pi >= this.palIdx - 6 && e.pi <= this.palIdx + 10) { e.tgt = this.pal; return; }
      const ring = hyp(ax - HEARTH[0], ay - HEARTH[1]) - CAMP_R - e.r - (def.atk.range || 0);
      if (ring <= 20 && this.camp.hp > 0) { e.tgt = this.camp; return; }
      e.tgt = null;
    }
    followLane(e, dt) {
      if (e.rootT > 0) return;
      if (e.route) return this.followRoute(e, dt);
      const path = this.paths[e.lane], last = path.length - 1;
      if (e.resume) { e.resume = false; e.pi = M.near(path, e.x, e.y).i; }
      if (e.stuck > 0.8) { // wedged against the river or a prop: step back onto the lane
        e.stuck = 0; const n = M.near(path, e.x, e.y), q = path[n.i]; e.pi = n.i; e.x = q[0] - q[4] * e.off; e.y = q[1] + q[3] * e.off; e.kvx = e.kvy = 0;
      }
      for (let p = path[e.pi]; e.pi < last && hyp(e.x - (p[0] - p[4] * e.off), e.y - (p[1] + p[3] * e.off)) < 28; p = path[++e.pi]);   // the path point, shifted to this enemy's side of the lane
      const a = path[Math.min(last, e.pi + 3)];
      this.stepToward(e, a[0] - a[4] * e.off, a[1] + a[3] * e.off, dt);
    }
    followRoute(e, dt) {
      const R = e.route, last = R.length - 1;
      if (e.resume) { e.resume = false; let bi = e.ri, bd = 1e9; for (let i = Math.max(0, e.ri - 3); i <= last; i++) { const d = hyp(R[i][0] - e.x, R[i][1] - e.y); if (d < bd) { bd = d; bi = i; } } e.ri = bi; }
      while (e.ri < last && hyp(e.x - R[e.ri][0], e.y - R[e.ri][1]) < 30) e.ri++;
      if (e.ri >= last && hyp(e.x - R[last][0], e.y - R[last][1]) < 40) { e.route = null; e.resume = true; return; }
      if (e.stuck > 0.8) { e.stuck = 0; const q = R[Math.max(0, e.ri - 1)]; e.x = q[0]; e.y = q[1]; e.kvx = e.kvy = 0; }
      const a = R[Math.min(last, e.ri)]; this.stepToward(e, a[0], a[1], dt);
    }
    stepToward(e, tx, ty, dt) {
      const dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy); if (d < 0.5) return;
      const sp = e.speed * e.slowM * dt * (SLOWAT && !e.def.boss ? SLOWAT(e.x, e.y) : 1), k = Math.min(1, sp / d), nx = e.x + dx * k, ny = e.y + dy * k;
      if (M.walkable(nx, ny, 6)) { e.x = nx; e.y = ny; e.stuck = 0; } else if (M.walkable(nx, e.y, 6)) { e.x = nx; e.stuck = 0; } else if (M.walkable(e.x, ny, 6)) { e.y = ny; e.stuck = 0; } else e.stuck += dt;
      e.face += angDiff(e.face, Math.atan2(dy, dx)) * Math.min(1, dt * 10);
    }
    // start a strike: the red circle is where it will land, fixed now
    startAtk(e, t) {
      const a = e.def.atk, ang = Math.atan2(t.y - e.y, t.x - e.x); e.face = ang;
      let cx, cy;
      if (a.range) { if (t.tk === 'camp') { const d = hyp(e.x - HEARTH[0], e.y - HEARTH[1]) || 1; cx = HEARTH[0] + (e.x - HEARTH[0]) / d * (CAMP_R - 40); cy = HEARTH[1] + (e.y - HEARTH[1]) / d * (CAMP_R - 40); } else { cx = t.x; cy = t.y; } }
      else { cx = e.x + Math.cos(ang) * a.off; cy = e.y + Math.sin(ang) * a.off; }
      e.atk = { t: 0, dur: a.wind, cx, cy, R: a.hitR, tgt: t, id: ++this.tid }; e.reveal = this.time + 1.4;
      if (a.tele) this.ev(['t', e.atk.id, 0, Math.round(cx), Math.round(cy), a.hitR, 0, 0, r2(a.wind), 0]);
    }
    resolveAtk(e) {
      const a = e.atk, def = e.def.atk, t = a.tgt, dmg = def.dmg * D.dmgScale(Math.max(this.wave, e.waveAs || 0)); e.atk = null; e.acd = def.cd;
      for (const h of this.heroes) if (!h.dead && hyp(h.x - a.cx, h.y - a.cy) < a.R + h.r) this.hurtHero(h, dmg, e, { block: true });
      if (t && t.tk !== 'hero') this.hurtObj(t, dmg, e, a);
      if (e.def.elite) this.ev(['i', a.id, Math.round(a.cx), Math.round(a.cy)]);
    }
    // damage to a non-hero thing: the camp, palisade, cart, smith, dig, or the Wall
    hurtObj(t, dmg, e, a) {
      if (e && e.def.objMul && t.tk !== 'camp' && t.tk !== 'pal') dmg *= e.def.objMul;
      switch (t.tk) {
        case 'camp': if (this.camp.hp > 0) { dmg = Math.max(1, Math.round(dmg * D.CAMP_TAKE)); this.camp.hp = Math.max(0, this.camp.hp - dmg); this.ev(['h', 2, 0, dmg, 0, Math.round(a ? a.cx : t.x), Math.round(a ? a.cy : t.y)]); } break;
        case 'pal': if (!this.pal) break; this.pal.hp -= dmg; this.ev(['h', 3, 0, dmg, 0, Math.round(t.x), Math.round(t.y)]); if (this.pal.hp <= 0) { this.pal = null; this.markProps(); this.ev(['pal', 0]); } break;
        case 'cart': if (!a || hyp(a.cx - t.x, a.cy - t.y) < a.R + t.r + 10) { t.hp -= dmg; if (t.hp <= 0) { t.gone = true; this.ev(['cart', t.id, 0, Math.round(t.x), Math.round(t.y)]); this.markProps(); } } break;
        case 'smith': if (this.q.fire.st === 1 && (!a || hyp(a.cx - t.x, a.cy - t.y) < a.R + t.r + 10)) { t.hp -= dmg; this.markProps(); if (t.hp <= 0) { this.smith = null; this.fireFail(); } } break;
        case 'dig': if (this.dig && (!a || hyp(a.cx - t.x, a.cy - t.y) < a.R + 70)) { this.dig.prog = Math.max(0, this.dig.prog - 0.06); this.markProps(); } break;
        case 'wall': t.hp -= dmg; t.sh = 1; break;
        case 'ally': if (!t.dead && (!a || hyp(a.cx - t.x, a.cy - t.y) < a.R + (t.r || 0) + 10)) t.hurt(dmg, e); break;
        case 'drop': if (!t.gone && (!a || hyp(a.cx - t.x, a.cy - t.y) < a.R + t.r + 10)) { t.hp -= dmg; if (t.hp <= 0) { t.gone = true; this.drops = this.drops.filter(x => x !== t); this.ev(['dgone', CARRY_CODE[t.kind], Math.round(t.x), Math.round(t.y)]); } } break;
      }
    }

    // ================================================================ the first mini-boss: Tunnelmaw
    // It walks the North Road, then cycles four telegraphed moves and burrows at its health gates. Burrow: it dives and
    // tunnels toward the Hearth (the dust trail is its position), stops and points, then a red circle shows where it will
    // surface 1.6 s later. Tail Sweep is the tank's; Quake Ring is everyone's; Tremor is a blue stack (split by who stands in it).
    updateBoss(e, dt) {
      switch (e.kind) {
        case 'wickeater': return this.updateWick(e, dt);
        case 'mirebull': return this.updateMire(e, dt);
        case 'oldgnaw': return this.updateGnaw(e, dt);
      }
      return this.updateTunnel(e, dt);
    }
    updateTunnel(e, dt) {
      const ai = e.ai; ai.t += dt;
      const hero = this.bossHero(e);
      if (ai.ph === 'walk') {
        if (hero && hyp(hero.x - e.x, hero.y - e.y) < 420) { ai.ph = 'idle'; ai.t = 0; return; }
        const path = this.paths[0], last = path.length - 1; while (e.pi < last && hyp(e.x - path[e.pi][0], e.y - path[e.pi][1]) < 30) e.pi++;
        if (e.pi >= this.palIdx + 20 && !ai.burrowed) { ai.burrowed = 1; this.bossBurrow(e); return; }
        const a = path[Math.min(last, e.pi + 3)]; this.stepToward(e, a[0], a[1], dt);
        if (hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < CAMP_R + 60) { ai.ph = 'idle'; ai.t = 0; }
        return;
      }
      if (ai.ph === 'idle') {
        e.vuln = false;
        // HP gates: burrow and call a few ashlings
        const frac = e.hp / e.max;
        if (ai.gate < 2 && frac < (ai.gate === 0 ? 0.66 : 0.33)) { ai.gate++; for (let i = 0; i < 6; i++) { const s = this.spawnEnemy('ashling', 0); [s.x, s.y] = this.nearestWalkable(e.x + this.rr(-90, 90), e.y + this.rr(-90, 90)); s.resume = true; } this.bossBurrow(e); return; }
        if (!hero) { // nobody near: go for the camp like any enemy
          this.pickTargetBoss(e, dt); return;
        }
        const d = hyp(hero.x - e.x, hero.y - e.y) - e.r - hero.r;
        if (d > 110 && ai.t < ai.next + 3) { this.stepToward(e, hero.x, hero.y, dt); return; }   // close in; a kiter still gets the moves after a few seconds
        if (ai.t < ai.next) { e.face += angDiff(e.face, Math.atan2(hero.y - e.y, hero.x - e.x)) * Math.min(1, dt * 10); return; }
        const course = ['sweep', 'spin', 'sweep', 'stack', 'burrow'], mv = course[ai.step++ % course.length];
        this.bossMove(e, mv, hero); return;
      }
      if (ai.ph === 'sweep' || ai.ph === 'spin' || ai.ph === 'stack') { if (ai.t >= ai.dur) this.bossResolve(e); return; }
      if (ai.ph === 'burrow') {
        if (ai.sub === 'dive') { if (ai.t >= 0.9) { ai.sub = 'tunnel'; ai.t = 0; e.under = true; this.ev(['bu', e.id, 1]); } return; }
        if (ai.sub === 'tunnel') {
          const hd = hyp(HEARTH[0] - e.x, HEARTH[1] - e.y), ang = Math.atan2(HEARTH[1] - e.y, HEARTH[0] - e.x); ai.ang = ang;
          if (ai.t < 4.5 && hd > 560) { const nx = e.x + Math.cos(ang) * 135 * dt, ny = e.y + Math.sin(ang) * 135 * dt; e.x = clamp(nx, 40, M.W - 40); e.y = clamp(ny, 40, M.H - 40); e.face = ang; return; }
          // stop and point: the surfacing circle is ahead of the trail
          ai.sub = 'aim'; ai.t = 0; const L = Math.min(260, Math.max(0, hd - 230)); [ai.sx, ai.sy] = this.nearestWalkable(e.x + Math.cos(ang) * L, e.y + Math.sin(ang) * L, 20);
          ai.id = ++this.tid; this.ev(['t', ai.id, 0, Math.round(ai.sx), Math.round(ai.sy), 150, 0, 0, 1.6, 0]); return;
        }
        if (ai.sub === 'aim') {
          if (ai.t >= 1.6) {
            e.x = ai.sx; e.y = ai.sy; e.under = false; this.ev(['bu', e.id, 0]); this.ev(['i', ai.id, Math.round(e.x), Math.round(e.y)]);
            for (const h of this.heroes) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < 150 + h.r) { this.hurtHero(h, 34, e, { block: true }); if (!h.dead) h.stun = Math.max(h.stun, 1); }
            e.vuln = true; ai.ph = 'idle'; ai.t = 0; ai.next = 2.6;
          }
        }
      }
    }
    // ---------------------------------------------------------------- helpers for the later bosses
    // a telegraph: shape 0 circle (a radius), 2 cone (a angle, b reach, w half-angle), 1 line (a angle, b length, w half-width); col 0 red damage, 1 blue
    tele(shape, x, y, a, b, w, warn, col) { const id = ++this.tid; this.ev(['t', id, shape, Math.round(x), Math.round(y), r2(a), Math.round(b), r2(w), warn, col || 0]); return id; }
    coneHit(h, ox, oy, ang, reach, half) { const d = hyp(h.x - ox, h.y - oy); return d < reach + h.r && (d < 24 || Math.abs(angDiff(ang, Math.atan2(h.y - oy, h.x - ox))) < half); }
    nearestHeroTo(x, y, R) { let best = null, bd = R; for (const h of this.heroes) if (!h.dead) { const d = hyp(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } } return best; }
    bossCleanup(e) {
      if (e.kind === 'mirebull') { const ai = e.ai; if (ai.zone) ai.zone.dead = true; for (const l of ai.logs || []) l.dead = true; }
      if (e.kind === 'wickeater') for (const o of this.enemies) if (o.kind === 'wickshade') o.dead = true;
      if (e.kind === 'oldgnaw') { for (const o of this.enemies) if (o.kind === 'whelp') o.dead = true; this.gnawDown = true; if (this.q.cover.st === 1) this.failQuest('cover'); }
    }
    logDown(e) { const b = this.enemies.find(x => x.kind === 'mirebull' && !x.dead); if (b && b.ai.logs) this.ev(['ml', e.id, b.ai.logs.filter(l => !l.dead && l !== e).length]); }
    bossInfo(e) {   // fds.bs rows, always 7 long: [id, typeIdx, ...]
      const ai = e.ai || {}, base = [e.id, e.type];
      switch (e.kind) {
        case 'oldgnaw': return base.concat([Math.round(ai.tx || e.x), Math.round(ai.ty || e.y), ai.tgt ? ai.tgt.k : 0, ai.part || 1, this.hearthCovered ? 0 : 1]);
        case 'wickeater': return base.concat([Math.round(ai.lx || 0), Math.round(ai.ly || 0), ai.fed || 0, this.posts.filter(p => !p.lit).length, ai.pinned ? 1 : 0]);
        case 'mirebull': return base.concat([ai.level || 0, ai.logs ? ai.logs.filter(l => !l.dead).length : 3, Math.round(ai.cx || e.x), Math.round(ai.cy || e.y), 0]);
      }
      return base.concat([0, 0, 0, 0, 0]);
    }

    // ================================================================ the Wick-Eater (wave 10): eats light, fears Sanctums and the camp's glow
    wickLure(e) {
      let best = null, bd = 600; const eat = (x, y, kind) => { const d = hyp(x - e.x, y - e.y); if (d < bd) { bd = d; best = { x, y, kind }; } };
      for (const p of this.posts) if (p.lit) eat(p.lx, p.ly, 1);
      for (const z of this.zones) if (!z.dead && (z.kind === ZONE.BURN || z.kind === ZONE.TRAIL)) eat(z.x, z.y, 2);
      for (const h of this.heroes) if (!h.dead) eat(h.x, h.y, h.brand > 0 ? 4 : 3);
      return best;
    }
    wickEat(e, ai, x, y, R) {
      for (const p of this.posts) if (p.lit && hyp(p.x - x, p.y - y) < R) { p.lit = false; ai.fed = Math.min(8, ai.fed + 1); this.ev(['wk', e.id, p.slot]); }
      for (const z of this.zones) if (!z.dead && (z.kind === ZONE.BURN || z.kind === ZONE.TRAIL) && hyp(z.x - x, z.y - y) < R + 40) { z.dead = true; ai.fed = Math.min(8, ai.fed + 1); this.ev(['wk', e.id, -1]); }
    }
    updateWick(e, dt) {
      const ai = e.ai; ai.t += dt; ai.age = (ai.age || 0) + dt; if (ai.fed === undefined) { ai.fed = 0; ai.breathT = 9; ai.next = 2; }
      e.r = 34 + 1.6 * ai.fed;
      const mult = (1 + 0.06 * ai.fed) * (ai.age > 150 ? 1.5 : 1);
      // it will not cross a Sanctum or the camp's glow; two lights on opposite sides pin it where it stands
      const fear = []; for (const z of this.zones) if (z.kind === ZONE.SANCT && !z.dead) fear.push([z.x, z.y, z.a]);
      fear.push([HEARTH[0], HEARTH[1], CAMP_R - 20]); if (this.beaconLit) fear.push([M.P.beacon[0], M.P.beacon[1], 150]);
      const seen = [];
      for (const fr of fear) {
        const d = hyp(e.x - fr[0], e.y - fr[1]), lim = fr[2] + e.r + 12;
        if (d < lim) { const k = (lim - d) / (d || 1); e.x += (e.x - fr[0]) * k; e.y += (e.y - fr[1]) * k; }
        if (d < lim + 30) seen.push(Math.atan2(fr[1] - e.y, fr[0] - e.x));
      }
      let pinned = false; for (let i = 0; i < seen.length && !pinned; i++) for (let j = i + 1; j < seen.length; j++) if (Math.abs(angDiff(seen[i], seen[j])) > 2.2) { pinned = true; break; }
      if (pinned !== !!ai.pinned) { ai.pinned = pinned; this.ev(['pin', e.id, pinned ? 1 : 0]); }
      e.vuln = pinned;
      if (pinned) { if (ai.ph === 'glow' || ai.ph === 'breath') { this.ev(['i', ai.id || 0, Math.round(e.x), Math.round(e.y)]); ai.ph = 'walk'; ai.wind = false; } ai.t = 0; return; }
      this.wickEat(e, ai, e.x, e.y, e.r + 70);
      if (!ai.split && e.hp < e.max * 0.5) { ai.split = true; for (const side of [-1, 1]) { const p = this.nearestWalkable(e.x + side * 150, e.y, 10), s = this.spawnEnemy('wickshade', 0, p); s.resume = true; } this.ev(['ws', e.id]); }
      if (ai.ph === 'walk' || !ai.ph) {
        ai.ph = 'walk'; const lure = this.wickLure(e); ai.lx = lure ? lure.x : 0; ai.ly = lure ? lure.y : 0; ai.breathT -= dt;
        if (lure && ai.t >= ai.next && hyp(lure.x - e.x, lure.y - e.y) < 320 + e.r) {   // the throat glows, a red cone shows the lunge
          ai.ph = 'glow'; ai.t = 0; ai.wind = true; ai.ang = Math.atan2(lure.y - e.y, lure.x - e.x); e.face = ai.ang;
          ai.id = this.tele(2, e.x, e.y, ai.ang, 330 + e.r, 0.5, 1.2, 0); this.ev(['wg', e.id, 1.2]); return;
        }
        if (ai.breathT <= 0) { ai.ph = 'breath'; ai.t = 0; ai.wind = true; ai.bdmg = Math.round(Math.min(26, 6 + 2.4 * this.posts.filter(p => !p.lit).length + ai.fed) * mult); this.ev(['wb', e.id, 1.6, ai.bdmg]); return; }
        if (lure && hyp(lure.x - e.x, lure.y - e.y) < 560) this.stepToward(e, lure.x, lure.y, dt);
        else { const path = this.paths[0], last = path.length - 1; while (e.pi < last && hyp(e.x - path[e.pi][0], e.y - path[e.pi][1]) < 30) e.pi++; const a = path[Math.min(last, e.pi + 3)]; this.stepToward(e, a[0], a[1], dt); }
        return;
      }
      if (ai.ph === 'glow') {
        if (ai.t < 1.2) return;
        ai.wind = false; const ang = ai.ang, reach = 330 + e.r;
        for (const h of this.heroes) if (!h.dead && this.coneHit(h, e.x, e.y, ang, reach, 0.5)) this.hurtHero(h, Math.round(24 * mult), e, { block: true });
        for (const p of this.posts) if (p.lit && hyp(p.x - e.x, p.y - e.y) < reach && Math.abs(angDiff(ang, Math.atan2(p.y - e.y, p.x - e.x))) < 0.5) { p.lit = false; ai.fed = Math.min(8, ai.fed + 1); this.ev(['wk', e.id, p.slot]); }
        if (Math.abs(angDiff(ang, Math.atan2(HEARTH[1] - e.y, HEARTH[0] - e.x))) < 0.5 && hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < reach + CAMP_R) this.hurtObj(this.camp, Math.round(20 * mult), e, null);
        this.ev(['i', ai.id, Math.round(e.x), Math.round(e.y)]); ai.ph = 'dash'; ai.t = 0; return;
      }
      if (ai.ph === 'dash') {
        const nx = e.x + Math.cos(ai.ang) * 780 * dt, ny = e.y + Math.sin(ai.ang) * 780 * dt; if (M.walkable(nx, ny, 6)) { e.x = nx; e.y = ny; }
        if (ai.t >= 0.32) { ai.ph = 'walk'; ai.t = 0; ai.next = 3.2 + this.rand() * 1.2; } return;
      }
      if (ai.ph === 'breath' && ai.t >= 1.6) {   // Wick Breath: a party-wide cold that grows with every light that is out
        ai.wind = false; for (const h of this.heroes) if (!h.dead) this.hurtHero(h, ai.bdmg, e, { block: false });
        ai.breathT = 11; ai.ph = 'walk'; ai.t = 0;
      }
    }

    // ================================================================ the Mirebull (wave 15): dams the East Ford, floods the lane ring by ring
    mireFlood(e, lvl) { const ai = e.ai; ai.level = lvl; if (ai.zone) { ai.zone.a = FLOOD_R[lvl]; ai.zone.b = lvl; } }
    updateMire(e, dt) {
      const ai = e.ai; ai.t += dt; ai.age = (ai.age || 0) + dt;
      if (ai.ph === 'walk') {
        const path = this.paths[1], last = path.length - 1;
        while (e.pi < last && hyp(e.x - path[e.pi][0], e.y - path[e.pi][1]) < 30) e.pi++;
        if (e.pi >= this.fordIdx) {   // it plants itself in the ford; the dam logs stand round it
          ai.ph = 'plant'; ai.t = 0; ai.cx = e.x; ai.cy = e.y; ai.logs = []; ai.level = 0; ai.chillT = 0; ai.step = 0;
          for (const a of [-1.9, 0.35, 2.3]) { const lg = this.spawnEnemy('damlog', 1, this.nearestWalkable(e.x + Math.cos(a) * 115, e.y + Math.sin(a) * 115, 10)); lg.resume = false; ai.logs.push(lg); }
          ai.zone = this.addZone(ZONE.FLOOD, e.x, e.y, 0, 0, 3, 99999, null); return;
        }
        const a = path[Math.min(last, e.pi + 3)]; this.stepToward(e, a[0], a[1], dt); return;
      }
      const alive = ai.logs.filter(l => !l.dead).length;
      for (const l of ai.logs) if (l.invT > 0) { l.invT -= dt; if (l.invT <= 0) l.invuln = false; }
      if (ai.zone) ai.zone.c = alive;
      if (ai.level > alive) this.mireFlood(e, alive);
      if (ai.level > 0) { ai.chillT += dt; if (ai.chillT >= 1) { ai.chillT -= 1; for (const h of this.heroes) if (!h.dead && hyp(h.x - ai.cx, h.y - ai.cy) < FLOOD_R[ai.level]) { this.hurtHero(h, 1 + ai.level, e, { block: false }); h.slowT = Math.max(h.slowT, 1.4); h.slowM = 0.75; } } }
      if (alive === 0 && ai.ph !== 'drown') { ai.ph = 'drown'; ai.t = 0; e.vuln = true; this.mireFlood(e, 0); this.ev(['md', e.id]); }   // the last log breaks: the flood drains and takes it
      if (ai.ph === 'drown') { if (ai.t >= 4) this.killE(e, e.last); return; }
      if (ai.ph === 'plant') { if (ai.t >= 3) { ai.ph = 'idle'; ai.t = 0; ai.next = 1.2; this.mireFlood(e, 1); } return; }
      if (ai.ph === 'return') {
        const dx = ai.cx - e.x, dy = ai.cy - e.y, d = hyp(dx, dy); if (d < 12) { ai.ph = 'idle'; ai.t = 0; ai.next = 1.6; return; }
        e.x += dx / d * 120 * dt; e.y += dy / d * 120 * dt; return;
      }
      if (ai.ph === 'idle') {
        const hero = this.nearestHeroTo(e.x, e.y, 800); if (hero) e.face += angDiff(e.face, Math.atan2(hero.y - e.y, hero.x - e.x)) * Math.min(1, dt * 8);
        if (ai.t < ai.next) return;
        const mv = ['stamp', 'sweep', 'stamp', 'charge', 'shield'][ai.step++ % 5];
        if (mv === 'shield') {   // it turns toward the log it protects
          const cand = alive > 1 ? ai.logs.filter(l => !l.dead && !l.invuln) : [];
          if (cand.length) { const l = cand[Math.floor(this.rand() * cand.length)]; l.invuln = true; l.invT = 9; e.face = Math.atan2(l.y - e.y, l.x - e.x); this.ev(['ms', e.id, l.id, 9]); }
          ai.t = 0; ai.next = 2.0; return;
        }
        if (mv === 'charge' && !hero) { ai.t = 0; ai.next = 1; return; }
        ai.t = 0; ai.mv = mv; ai.ph = 'act'; ai.id2 = 0;
        if (mv === 'stamp') { ai.dur = 1.6; ai.id = this.tele(0, e.x, e.y, 150, 0, 0, 1.6, 0); ai.up = Math.min(alive, ai.level + 1); if (ai.up > ai.level) ai.id2 = this.tele(0, ai.cx, ai.cy, FLOOD_R[ai.up], 0, 0, 1.6, 1); }   // red ring at its feet; blue: the water about to rise
        else if (mv === 'sweep') { ai.ang = hero ? Math.atan2(hero.y - e.y, hero.x - e.x) : e.face; e.face = ai.ang; ai.dur = 1.3; ai.id = this.tele(2, e.x, e.y, ai.ang, 210, 0.95, 1.3, 0); }
        else { ai.ang = Math.atan2(hero.y - e.y, hero.x - e.x); e.face = ai.ang; ai.len = clamp(hyp(hero.x - e.x, hero.y - e.y) + 100, 220, 420); ai.dur = 1.5; ai.id = this.tele(1, e.x, e.y, ai.ang, ai.len, 46, 1.5, 0); }
        return;
      }
      if (ai.ph === 'act' && ai.t >= ai.dur) {
        ai.ph = 'idle'; ai.t = 0; ai.next = 2.4 + this.rand() * 0.8;
        this.ev(['i', ai.id, Math.round(e.x), Math.round(e.y)]); if (ai.id2) this.ev(['i', ai.id2, Math.round(ai.cx), Math.round(ai.cy)]);
        if (ai.mv === 'stamp') { for (const h of this.heroes) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < 150 + h.r) this.hurtHero(h, 24, e, { block: true }); if (ai.up > ai.level) this.mireFlood(e, ai.up); }
        else if (ai.mv === 'sweep') { for (const h of this.heroes) if (!h.dead && this.coneHit(h, e.x, e.y, ai.ang, 210, 0.95)) this.hurtHero(h, 28, e, { block: true }); }
        else {
          const ex = e.x + Math.cos(ai.ang) * ai.len, ey = e.y + Math.sin(ai.ang) * ai.len;
          for (const h of this.heroes) if (!h.dead && segDist(h.x, h.y, e.x, e.y, ex, ey) < 46 + h.r) this.hurtHero(h, 36, e, { block: true });
          e.x = ex; e.y = ey; ai.ph = 'return';
        }
      }
    }

    // ================================================================ Old Gnaw (wave 20): it goes for the warmest thing it can smell
    warmSources() {
      const S = [], covered = this.hearthCovered;
      if (!covered) S.push({ x: HEARTH[0], y: HEARTH[1], w: 100, k: 1 });
      for (const h of this.heroes) if (!h.dead && h.brand > 0) S.push({ x: h.x, y: h.y, w: 70, k: 2 });
      for (const fp of QT.fires) S.push({ x: fp[0], y: fp[1], w: covered ? 36 : 24, k: 3 });
      if (this.forge === 2 || (this.forge === 1 && this.q.fire.prog > 0.1)) S.push({ x: M.P.forge[0], y: M.P.forge[1], w: 30, k: 3 });
      for (const p of this.posts) if (p.lit) S.push({ x: p.lx, y: p.ly, w: 42, k: 4 });
      for (const z of this.zones) if (!z.dead && (z.kind === ZONE.BURN || z.kind === ZONE.TRAIL)) S.push({ x: z.x, y: z.y, w: 46, k: 5 });
      if (this.beaconLit) S.push({ x: M.P.beacon[0], y: M.P.beacon[1], w: 38, k: 6 });
      if (this.snuffed.length) { const t = this.time; this.snuffed = this.snuffed.filter(z => z.until > t); if (this.snuffed.length) return S.filter(w => w.k === 2 || !this.snuffed.some(z => hyp(z.x - w.x, z.y - w.y) < 40)); }   // what it has snuffed smells cold for a while
      return S;
    }
    warmest(e) { let best = null, bs = -1; for (const s of this.warmSources()) { const sc = s.w / (1 + hyp(s.x - e.x, s.y - e.y) / 900); if (sc > bs) { bs = sc; best = s; } } return best; }
    gnawStep(e, tx, ty, dt, k) {
      const ai = e.ai, d = hyp(tx - e.x, ty - e.y); if (d < 175) { e.face += angDiff(e.face, Math.atan2(ty - e.y, tx - e.x)) * Math.min(1, dt * 6); return; }
      ai.cT -= dt; if (ai.cT <= 0) { ai.cT = 0.5; ai.clear = this.lineClear(e.x, e.y, tx, ty, 6); }
      if (ai.clear) { ai.route = null; this.stepToward(e, tx, ty, dt * k); return; }
      ai.rT = (ai.rT || 0) - dt;
      if (!ai.route || ai.rT <= 0 || hyp((ai.rtx || 0) - tx, (ai.rty || 0) - ty) > 120) { ai.route = this.findPath(e.x, e.y, tx, ty); ai.ri = 0; ai.rT = 2; ai.rtx = tx; ai.rty = ty; }
      const w = ai.route[Math.min(ai.ri, ai.route.length - 1)]; if (hyp(w[0] - e.x, w[1] - e.y) < 24 && ai.ri < ai.route.length - 1) ai.ri++;
      this.stepToward(e, w[0], w[1], dt * k);
    }
    updateGnaw(e, dt) {
      const ai = e.ai; ai.t += dt; ai.age = (ai.age || 0) + dt;
      if (ai.part === undefined) { ai.part = 1; ai.parkT = 0; ai.parkKey = ''; ai.lungeCd = 4; ai.whelpT = 4; ai.next = 3; ai.shT = -9; ai.cT = 0; ai.ph = 'move'; }
      const frac = e.hp / e.max, open = !this.hearthCovered, mult = (ai.age > D.TUNE.siegeEnrage ? 1.8 : 1) * (ai.part === 3 ? 1.15 : 1);
      if (e.y > GATE.y - 150 && e.y < GATE.y + 60 && e.x > GATE.x0 - 60 && e.x < GATE.x1 + 60) ai.atGate = true;
      const part = frac < 0.33 ? 3 : (ai.atGate || frac < 0.66) ? 2 : 1;   // 1 The Scent, 2 The Breach, 3 The Cold
      if (part !== ai.part) { ai.part = part; this.ev(['gp', e.id, part]); if (part === 3 && this.q.cover.st === 1) this.failQuest('cover'); }
      ai.lungeCd -= dt;
      const tgt = this.warmest(e); ai.tgt = tgt; const hn = tgt ? null : this.nearestHeroTo(e.x, e.y, 99999), tx = tgt ? tgt.x : hn ? hn.x : HEARTH[0], ty = tgt ? tgt.y : hn ? hn.y : HEARTH[1]; ai.tx = tx; ai.ty = ty;
      if (ai.ph === 'act') { if (ai.t >= ai.dur) this.gnawResolve(e, mult, open); return; }
      if (ai.ph === 'dash') {
        const k = clamp(ai.t / 0.45, 0, 1); e.x = ai.sx + (ai.ex - ai.sx) * k; e.y = ai.sy + (ai.ey - ai.sy) * k;
        if (k >= 1) { ai.ph = 'move'; ai.t = 0; ai.next = 1.5; if (hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < CAMP_R + 170) this.hurtObj(this.camp, Math.round(55 * mult), e, null); this.ev(['bw', e.id]); }
        return;
      }
      const tear = !!this.pal && ai.atGate && ty > e.y + 30 && e.y < GATE.y + 40;   // held up by the gate it must break to reach the warmth
      const key = (tgt ? tgt.k : 0) + ':' + Math.round(tx / 80) + ':' + Math.round(ty / 80);
      // it never parks forever: standing within reach of the same warm source for a long while with no hero near, it smashes (snuffs) that source, in red, and goes for the next warmest
      if (ai.pkx === undefined || hyp(e.x - ai.pkx, e.y - ai.pky) > 40) { ai.pkx = e.x; ai.pky = e.y; ai.parkT = 0; }   // it has moved: the wait starts over
      const parked = (!tgt || tgt.k > 2) && !tear && !this.nearestHeroTo(e.x, e.y, 520);
      if (parked && key === ai.parkKey) ai.parkT += dt; else { ai.parkKey = key; ai.parkT = 0; }
      if (ai.parkT >= GNAW_PARK) {
        ai.parkT = 0;
        if (!tgt) this.snuffed.length = 0;   // nothing warm left: everything smells warm again, and it goes for the nearest hero meanwhile
        else { const dd = hyp(tx - e.x, ty - e.y), kk = dd > 220 ? 150 / dd : 1, mx = dd > 220 ? e.x + (tx - e.x) * kk : tx, my = dd > 220 ? e.y + (ty - e.y) * kk : ty;   // out of reach (walled off by the camp): it smashes the ground toward it
        ai.mv = 'smash'; ai.dur = 1.4; ai.sk = tgt; ai.sx2 = mx; ai.sy2 = my; ai.id = this.tele(0, mx, my, 130, 0, 0, 1.4, 0); ai.ph = 'act'; ai.wind = true; ai.t = 0; return; }
      }
      if (key !== ai.key && ai.age - ai.shT > 1.2) { ai.key = key; ai.shT = ai.age; this.ev(['sh', e.id, Math.round(e.x), Math.round(e.y), Math.round(tx), Math.round(ty), tgt ? tgt.k : 0]); }   // the shimmer line from its nose
      if (!tear) this.gnawStep(e, tx, ty, dt, part === 3 ? 1.3 : 1); else e.face += angDiff(e.face, PI / 2) * Math.min(1, dt * 6);
      if (part === 2) {   // ash-whelps pour from its fur in The Breach
        ai.whelpT -= dt;
        if (ai.whelpT <= 0) { ai.whelpT = 6.5; if (this.enemies.length < 90) { const n = 5; for (let i = 0; i < n; i++) { const a = this.rand() * TAU, p = this.nearestWalkable(e.x + Math.cos(a) * (e.r + 10), e.y + Math.sin(a) * (e.r + 10), 8), s = this.spawnEnemy('whelp', 0, p); s.resume = true; } this.ev(['gw', e.id, n]); } }
      }
      if (ai.t < ai.next) return;
      const dT = hyp(tx - e.x, ty - e.y), nh = this.nearestHeroTo(e.x, e.y, 9999), nd = nh ? hyp(nh.x - e.x, nh.y - e.y) : 9999;
      ai.t = 0;
      if (open && tgt && tgt.k === 1 && dT < 760 && ai.lungeCd <= 0) {   // a lunge straight for the uncovered Hearth
        const ang = Math.atan2(ty - e.y, tx - e.x); ai.mv = 'lunge'; ai.ang = ang; ai.len = Math.min(560, dT - 110); e.face = ang; ai.dur = 1.7; ai.lungeCd = 8; ai.id = this.tele(1, e.x, e.y, ang, ai.len, 60, 1.7, 0);
      } else if (tear || nd < 250 || (open && hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < CAMP_R + 170)) {
        ai.mv = 'stamp'; ai.dur = 1.4; ai.id = this.tele(0, e.x, e.y, 170, 0, 0, 1.4, 0);
      } else if (dT < 600 || nd < 440) {
        const ang = dT < 600 ? Math.atan2(ty - e.y, tx - e.x) : Math.atan2(nh.y - e.y, nh.x - e.x); ai.mv = 'breath'; ai.ang = ang; e.face = ang; ai.dur = 1.6; ai.id = this.tele(2, e.x, e.y, ang, 380, 0.45, 1.6, 0);
      } else { ai.next = 0.8; return; }
      ai.ph = 'act'; ai.wind = true;
    }
    gnawResolve(e, mult, open) {
      const ai = e.ai, mv = ai.mv; ai.wind = false; ai.ph = 'move'; ai.t = 0; ai.next = ai.part === 3 ? (open ? 1.5 : 1.9) : ai.part === 2 ? 2.8 : 3.4;
      this.ev(['i', ai.id, Math.round(e.x), Math.round(e.y)]);
      if (mv === 'smash') {   // wander on: the warm thing it stood by goes cold
        const sx = ai.sx2, sy = ai.sy2, src = ai.sk;
        this.ev(['i', ai.id, Math.round(sx), Math.round(sy)]);
        for (const h of this.heroes) if (!h.dead && hyp(h.x - sx, h.y - sy) < 130 + h.r) this.hurtHero(h, Math.round(24 * mult), e, { block: true });
        if (hyp(sx - HEARTH[0], sy - HEARTH[1]) < CAMP_R + 120) this.hurtObj(this.camp, Math.round(16 * mult), e, null);
        if (src && src.k === 4) { for (const p of this.posts) if (p.lit && hyp(p.lx - src.x, p.ly - src.y) < 6) { p.lit = false; this.ev(['wk', e.id, p.slot]); } }
        else if (src && src.k === 5) { for (const z of this.zones) if (!z.dead && (z.kind === ZONE.BURN || z.kind === ZONE.TRAIL) && hyp(z.x - src.x, z.y - src.y) < 6) z.dead = true; }
        if (src) this.snuffed.push({ x: src.x, y: src.y, until: this.time + 50 });
        this.ev(['bw', e.id]); return;
      }
      if (mv === 'stamp') {   // Stamp: a red ring
        for (const h of this.heroes) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < 170 + h.r) this.hurtHero(h, Math.round(30 * mult), e, { block: true });
        if (hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < CAMP_R + 150) this.hurtObj(this.camp, Math.round((open ? 45 : 22) * mult), e, null);
        if (this.pal && ai.atGate && hyp(e.x - this.pal.x, e.y - this.pal.y) < 300) this.hurtObj(this.pal, 150, e, null);
        this.ev(['bw', e.id]);
      } else if (mv === 'breath') {   // Ash Breath: a red cone
        for (const h of this.heroes) if (!h.dead && this.coneHit(h, e.x, e.y, ai.ang, 380, 0.45)) this.hurtHero(h, Math.round(26 * mult), e, { block: true });
        if (Math.abs(angDiff(ai.ang, Math.atan2(HEARTH[1] - e.y, HEARTH[0] - e.x))) < 0.45 && hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < 380 + CAMP_R * 0.5) this.hurtObj(this.camp, Math.round(30 * mult), e, null);
      } else {   // the lunge: a red line, then it is there
        const ex = e.x + Math.cos(ai.ang) * ai.len, ey = e.y + Math.sin(ai.ang) * ai.len;
        for (const h of this.heroes) if (!h.dead && segDist(h.x, h.y, e.x, e.y, ex, ey) < 60 + h.r) this.hurtHero(h, Math.round(34 * mult), e, { block: true });
        ai.ph = 'dash'; ai.sx = e.x; ai.sy = e.y; ai.ex = ex; ai.ey = ey; ai.t = 0;
      }
    }

    bossHero(e) {
      if (e.tauntT > 0 && e.taunter && !e.taunter.dead) return e.taunter;   // Hold the Line still pulls it
      let best = null, bd = 900; for (const h of this.heroes) { if (h.dead) continue; const d = hyp(h.x - e.x, h.y - e.y); if (d < bd) { bd = d; best = h; } } return best;
    }
    pickTargetBoss(e, dt) {   // no hero close: walk to the camp ring and strike it
      const d = hyp(e.x - HEARTH[0], e.y - HEARTH[1]) - CAMP_R - e.r;
      if (d > 10) { this.stepToward(e, HEARTH[0], HEARTH[1], dt); return; }
      if (e.ai.t >= e.ai.next && e.acd <= 0 && this.camp.hp > 0) { e.acd = 2; this.hurtObj(this.camp, 26, e, null); this.ev(['bw', e.id]); }
    }
    bossBurrow(e) { const ai = e.ai; ai.ph = 'burrow'; ai.sub = 'dive'; ai.t = 0; e.atk = null; this.ev(['bd', e.id]); }
    bossMove(e, mv, hero) {
      const ai = e.ai; ai.t = 0; ai.id = ++this.tid; e.vuln = false;
      if (mv === 'burrow') { this.bossBurrow(e); return; }
      ai.ph = mv;
      if (mv === 'sweep') { ai.ang = Math.atan2(hero.y - e.y, hero.x - e.x); ai.dur = 1.1; e.face = ai.ang; this.ev(['t', ai.id, 2, Math.round(e.x), Math.round(e.y), r2(ai.ang), 170, r2(1.22), 1.1, 0]); }
      else if (mv === 'spin') { ai.dur = 1.5; this.ev(['t', ai.id, 0, Math.round(e.x), Math.round(e.y), 175, 0, 0, 1.5, 0]); }
      else { // stack: a blue circle on a random hero
        const hs = this.heroes.filter(x => !x.dead), t = hs[Math.floor(this.rand() * hs.length)] || hero; ai.sx = t.x; ai.sy = t.y; ai.dur = 2.2;
        this.ev(['t', ai.id, 0, Math.round(ai.sx), Math.round(ai.sy), 95, 0, 0, 2.2, 1]);
      }
    }
    bossResolve(e) {
      const ai = e.ai, mv = ai.ph; ai.ph = 'idle'; ai.t = 0; ai.next = 2.2 + this.rand() * 0.8;
      this.ev(['i', ai.id, Math.round(e.x), Math.round(e.y)]);
      if (mv === 'sweep') { for (const h of this.heroes) { if (h.dead) continue; const d = hyp(h.x - e.x, h.y - e.y); if (d < 170 + h.r && Math.abs(angDiff(ai.ang, Math.atan2(h.y - e.y, h.x - e.x))) < 1.22) this.hurtHero(h, 26, e, { block: true }); } if (Math.abs(angDiff(ai.ang, Math.atan2(HEARTH[1] - e.y, HEARTH[0] - e.x))) < 1.22 && hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < CAMP_R + 190) this.hurtObj(this.camp, 20, e, null); }
      else if (mv === 'spin') { for (const h of this.heroes) if (!h.dead && hyp(h.x - e.x, h.y - e.y) < 175 + h.r) this.hurtHero(h, 22, e, { block: true }); }
      else { const ins = this.heroes.filter(h => !h.dead && hyp(h.x - ai.sx, h.y - ai.sy) < 95 + h.r); for (const h of ins) this.hurtHero(h, Math.max(6, Math.round(40 / ins.length)), e, { block: false }); }
    }

    // ================================================================ zones, projectiles
    addZone(kind, x, y, a, b, c, dur, owner) {
      const z = { id: ++this.zid, kind, x, y, a, b, c, t: dur, dur, owner, dead: false, upd: null, end: null }; this.zones.push(z); return z;
    }
    updateZones(dt) {
      const Z = this.zones;
      for (let i = 0; i < Z.length; i++) {
        const z = Z[i]; z.t -= dt; if (z.upd && !z.dead) z.upd(z, dt);
        if (z.t <= 0 || z.dead) { z.dead = true; if (z.end) { const f = z.end; z.end = null; f(z); } }
      }
      let w = 0; for (let i = 0; i < Z.length; i++) if (!Z[i].dead) Z[w++] = Z[i]; Z.length = w;
    }
    updateProjs(dt) {
      const P = this.projs;
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; if (p.upd(p, dt)) P.splice(i, 1); }
    }

    // ================================================================ quests
    markProps() { /* props are diffed when a snapshot is sent */ }
    questState(id) { return this.q[id].st; }
    // ---- the quests' own pace: one at a time in story order, each waiting at its giver until a hero walks up and takes it
    giverAt(id) { return D.GIVER_AT[D.giverKey(id)]; }
    callQuest(id) {
      if (this.q[id].st !== 0 || this.qWait.includes(id)) return;
      this.qWait.push(id); const g = this.giverAt(id); this.ev(['qa', id, g[0], g[1]]); this.markProps();
    }
    takeQuest(id, h) {
      const i = this.qWait.indexOf(id); if (i < 0 || this.q[id].st !== 0) return false;
      this.qWait.splice(i, 1); for (const o of this.heroes) if (o.talk === id) o.talk = null;
      this.offerQuest(id); if (h) this.ev(['qt', id, h.id]); return true;
    }
    // a hero sent to a giver: taken on the spot when close, or walked over and taken on arrival (flowQuests)
    talkTo(h, id) {
      if (h.dead || this.ending || !this.qWait.includes(id)) return;
      const g = this.giverAt(id); h.target = null; h.pending = null; h.chan = null;
      if (hyp(h.x - g[0], h.y - g[1]) <= D.QUEST_FLOW.talkR) { h.path = null; this.takeQuest(id, h); return; }
      h.talk = id; this.pathTo(h, g[0], g[1] + 50);
    }
    flowQuests() {
      if (this.ending || this.wave < 1) return;
      const busy = this.qWait.length || D.QUEST_ORDER.some(id => this.q[id].st === 1);
      if (!busy && this.time >= this.qNextAt) { const id = D.QUEST_ORDER.find(k => this.q[k].st === 0); if (id) this.callQuest(id); }
      if (this.autoQuest) { for (const id of this.qWait.slice()) this.takeQuest(id, null); return; }
      for (const h of this.heroes) {
        if (!h.talk) continue;
        if (h.dead || !this.qWait.includes(h.talk)) { h.talk = null; continue; }
        const g = this.giverAt(h.talk); if (hyp(h.x - g[0], h.y - g[1]) <= D.QUEST_FLOW.talkR) { h.path = null; this.takeQuest(h.talk, h); }
      }
    }
    offerQuest(id) {
      const q = this.q[id], N = this.scaleN(), T = D.QUEST_TUNE; q.st = 1; q.prog = 0; this.ev(['q', id, 0]);
      if (id === 'spring') { this.dig = { x: M.P.spring[0], y: M.P.spring[1], prog: 0, need: T.digSecs + T.digPerExtra * (N - 1) }; this.digTarget = { tk: 'dig', x: this.dig.x, y: this.dig.y, r: 30 }; this.spring = 1; }
      if (id === 'gate') {
        const path = this.paths[0], sGate = path[this.palIdx][2], sStart = path[path.length - 1][2] - 170, n = T.carts(N);
        this.carts = []; for (let i = 0; i < n; i++) this.carts.push({ tk: 'cart', id: i + 1, s: sStart + i * 60, x: 0, y: 0, r: 22, hp: T.cartHp, max: T.cartHp, gone: false, arrived: false, sGate: sGate + i * 36 });
        for (const c of this.carts) { const p = M.along('north', c.s); c.x = p[0]; c.y = p[1]; }
      }
      if (id === 'fire') { const F = M.P.forge, sp = this.nearestWalkable(F[0] - 50, F[1] + 40); this.smith = { tk: 'smith', x: sp[0], y: sp[1], r: 18, hp: T.smithHp + T.smithPerExtra * (N - 1), max: T.smithHp + T.smithPerExtra * (N - 1) }; this.forge = 1; q.need = T.fireSecs + T.firePerExtra * (N - 1); }
      if (HAUL_IDS.includes(id)) { const H = this.haul[id]; H.left = H.need; H.got = 0; }
      if (id === 'road') q.need = QT.posts[N - 1];
      if (id === 'cover') this.cap = 0;
      this.markProps();
    }
    updateQuests(dt) {
      this.flowQuests();
      const sp = this.q.spring, gt = this.q.gate, fr = this.q.fire;
      if (sp.st === 1 && this.dig) {
        const heroNear = this.heroes.some(h => !h.dead && hyp(h.x - this.dig.x, h.y - this.dig.y) < 260), foe = this.enemyNear(this.dig.x, this.dig.y, 220);
        if (heroNear && !foe) { this.dig.prog = Math.min(1, this.dig.prog + dt / this.dig.need); if (this.tickN % 10 === 0) this.markProps(); }
        sp.prog = this.dig.prog; if (this.dig.prog >= 1) this.finishQuest('spring');
      }
      if (gt.st === 1) {
        const path = this.paths[0]; let en = 0, delivered = 0;
        for (const c of this.carts) {
          if (c.gone) continue; if (c.arrived) { delivered++; continue; }
          if (c.hp > 0 && this.heroes.some(h => !h.dead && hyp(h.x - c.x, h.y - c.y) < D.QUEST_TUNE.cartNear)) { c.s -= D.QUEST_TUNE.cartSpeed * dt; const p = M.along('north', Math.max(c.s, c.sGate)); c.x = p[0]; c.y = p[1]; if (this.tickN % 4 === 0) this.markProps(); }
          if (c.s <= c.sGate) { c.arrived = true; delivered++; this.ev(['cart', c.id, 1]); this.markProps(); } else en++;
        }
        gt.prog = this.carts.length ? delivered / this.carts.length : 0;
        if (en === 0) { if (delivered > 0) this.finishQuest('gate'); else this.failQuest('gate'); }
      }
      if (fr.st === 1 && this.smith) { fr.prog = Math.min(1, fr.prog + dt / fr.need); if (this.tickN % 10 === 0) this.markProps(); if (fr.prog >= 1) this.finishQuest('fire'); }
      this.updateLaterQuests(dt);
    }
    // The Beacon, The Road, The First Graves, The Stone Gate, The Roof, The Covering
    updateLaterQuests(dt) {
      for (const id of HAUL_IDS) {
        const q = this.q[id]; if (q.st !== 1) continue; const H = this.haul[id];
        for (const h of this.heroes) {   // put down at the end of the carry (a bier waits for the bluebells to be planted)
          if (h.dead || h.carry !== H.kind || h.carryQ !== id || hyp(h.x - H.tx, h.y - H.ty) > H.toR) continue;
          if (H.plant && h.stillT < H.plant) continue;
          h.carry = null; h.carryQ = null; h.dirty = true; H.got++; this.ev(['dl', id, H.got, H.need, Math.round(H.tx), Math.round(H.ty)]);
          if (id === 'graves') { this.graves = H.got; if (H.got === 1) this.addSecret(6, 600, 4384); }
        }
        let avail = H.left; for (const h of this.heroes) if (h.carry === H.kind && h.carryQ === id) avail++; for (const d of this.drops) if (d.q === id && !d.gone) avail++;
        if (id === 'stonegate' && this.sg) q.prog = 0.4 + 0.6 * this.sg.carve; else q.prog = (id === 'stonegate' ? 0.4 : 1) * H.got / H.need;
        if (H.got >= H.need) { if (id === 'stonegate') { if (!this.sg) { this.sg = { carve: 0 }; this.ev(['sg', 2]); } } else { this.finishQuest(id); continue; } }
        else if (H.got + avail < H.need) this.failQuest(id);   // too much was lost to finish
      }
      if (this.sg && this.q.stonegate.st === 1) {   // carving the Words: one hero, still, at the gate's back
        if (this.heroes.some(h => !h.dead && h.chan && h.chan.kind === 'carve' && hyp(h.x - this.carvePt[0], h.y - this.carvePt[1]) <= QT.carveRad + 20)) {
          this.sg.carve = Math.min(1, this.sg.carve + dt / (QT.carveSecs + QT.carvePerExtra * (this.scaleN() - 1)));
          if (this.sg.carve >= 1) this.finishQuest('stonegate');
        }
        if (this.sg) this.q.stonegate.prog = 0.4 + 0.6 * this.sg.carve;
      }
      const rd = this.q.road; if (rd.st === 1) { rd.prog = Math.min(1, this.posts.length / rd.need); if (this.posts.length >= rd.need) this.finishQuest('road'); }
      const cv = this.q.cover; this.covering = false;
      if (cv.st === 1) {
        const ch = this.heroes.filter(h => !h.dead && h.chan && h.chan.kind === 'cover' && hyp(h.x - this.coverPt[0], h.y - this.coverPt[1]) <= QT.coverRad + 20);
        if (ch.length) { this.covering = true; this.cap = Math.min(1, this.cap + dt * (1 + QT.coverHelp * (ch.length - 1)) / QT.coverSecs); }
        cv.prog = this.cap; if (this.cap >= 1) this.finishQuest('cover');
      }
    }
    clearHaul(id) { for (const h of this.heroes) if (h.carryQ === id && h.carry) { h.carry = null; h.carryQ = null; h.dirty = true; } this.drops = this.drops.filter(d => d.q !== id); const H = this.haul[id]; if (H) H.left = 0; }
    finishQuest(id) {
      const q = this.q[id], Q = D.QUESTS[id]; if (q.st !== 1) return; q.st = 2; q.prog = 1;
      if (id === 'spring') { this.spring = 2; this.dig = null; }
      if (id === 'gate') { const T = D.QUEST_TUNE, n = this.carts.filter(c => c.arrived).length, hp = T.palHp * n + T.palPerExtra * (this.scaleN() - 1), p = this.paths[0][this.palIdx]; this.pal = { tk: 'pal', x: p[0], y: p[1], r: 46, hp, max: hp }; this.carts = []; }
      if (id === 'fire') this.forge = 2;
      if (id === 'beacon') { this.beaconLit = true; this.addSecret(2, 1504, 1872); }
      if (id === 'road') this.longWay = true;
      if (id === 'graves') { this.blessing = 1; this.graves = Math.max(this.graves, this.haul.graves.got); }
      if (id === 'stonegate') { const p = this.paths[0][this.palIdx], hp = QT.stoneGateHp + QT.stoneGatePerExtra * (this.scaleN() - 1); this.pal = { tk: 'pal', x: p[0], y: p[1], r: 46, hp, max: hp, stone: true }; this.sg = null; this.addSecret(7, 2660, 1716); for (const h of this.heroes) this.page(h, 9); this.ev(['pal', 1]); }
      if (id === 'roof') this.roofDone = true;
      if (id === 'cover') { this.hearthCovered = true; this.covering = false; }
      if (HAUL_IDS.includes(id)) this.clearHaul(id);
      for (const h of this.heroes) { if (h.offers) h.offerQ.push(Q.boons.slice()); else h.offers = Q.boons.slice(); this.addXp(h, Q.xp); h.dirty = true; }
      this.ev(['q', id, 2]); this.markProps(); this.hook('questDone', id);
      this.qNextAt = this.time + D.QUEST_FLOW.pause;
    }
    failQuest(id) {
      const q = this.q[id]; if (q.st !== 1) return; q.st = 3;
      if (id === 'spring') { this.dig = null; this.spring = 0; }
      if (id === 'gate') this.carts = [];
      if (id === 'fire') this.fireFail();
      if (HAUL_IDS.includes(id)) this.clearHaul(id);
      if (id === 'stonegate') this.sg = null;
      if (id === 'cover') this.covering = false;
      this.ev(['q', id, 3]); this.markProps();
      this.qNextAt = this.time + D.QUEST_FLOW.pause;
    }
    // (only while the fire is catching: once the forge is lit it stays lit, whatever befalls the Smith after)
    fireFail() { if (this.q.fire.st === 2) return; this.smith = null; this.forge = 0; if (this.q.fire.st === 1) { this.q.fire.st = 3; this.ev(['q', 'fire', 3]); this.qNextAt = this.time + D.QUEST_FLOW.pause; } this.markProps(); }
    judge(id) { const q = this.q[id]; if (q.st !== 1) return; if (id === 'gate' && this.carts.some(c => c.arrived)) { this.finishQuest(id); return; } this.failQuest(id); }

    // ================================================================ Day one's secrets (state only; the client draws them faintly)
    updateSecrets(dt) {
      for (const h of this.heroes) if (h.carry === 'warm' && hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) < 80) { h.carry = null; this.warm = true; const s = this.secrets.find(x => x.n === 8); if (s) { s.st = 1; s.x = M.P.spring[0] + 30; s.y = M.P.spring[1] + 30; } }   // the warm stone goes back by the spring
      for (const s of this.secrets) {
        if (s.st) continue;
        if (s.n === 3 && this.q.spring.st === 2) {   // still, alone, at the spring for a while
          const h = this.heroes.find(x => !x.dead && hyp(x.x - s.x, x.y - s.y) < 90);
          if (h && h.stillT > 0 && this.heroes.every(o => o === h || o.dead || hyp(o.x - s.x, o.y - s.y) > 260) && !this.enemyNear(s.x, s.y, 320)) { s.t = (s.t || 0) + dt; if (s.t >= 25) { s.st = 1; this.ev(['pg', h.id, 3]); this.markProps(); } } else s.t = 0;
        }
      }
      for (const h of this.heroes) if (h.dig) {   // a quiet dig: nobody hit and the hero stays put
        if (h.path || this.time - this.lastHurt < 3 || h.dead) { h.dig = null; continue; }
        h.dig -= dt; if (h.dig <= 0) { h.dig = null; const s = this.secrets.find(x => x.n === 1); if (s && !s.st) { s.st = 1; h.gold += 40; this.ev(['pg', h.id, 1]); this.markProps(); h.dirty = true; } }
      }
      const c = this.child; if (!c) return;
      if (c.st === 1) { const h = this.heroes.find(x => !x.dead && hyp(x.x - c.x, x.y - c.y) < 70); if (h) { c.st = 2; c.follow = h; this.markProps(); } }
      else if (c.st === 2) {
        const h = c.follow; if (!h || h.dead) { c.st = 1; c.follow = null; return; }
        const d = hyp(h.x - c.x, h.y - c.y);
        if (d > 70) { c.repathT -= dt; if (!c.path || c.repathT <= 0) { c.repathT = 0.6; this.pathTo(c, h.x, h.y); } this.walkPath(c, 135, dt); }
        if (hyp(c.x - HEARTH[0], c.y - HEARTH[1]) < 260) { c.st = 3; this.luck = true; for (const o of this.heroes) this.recalc(o); this.ev(['pg', h.id, 5]); this.markProps(); }
        else if (this.tickN % 5 === 0) this.markProps();
      }
      if (this.wave >= 6 && this.time >= D.WAVE_T0 + 6 * D.WAVE_GAP && c.st < 3) { c.st = 4; this.markProps(); }   // she walks home on her own
    }
    interact(h) {
      if (h.dead || this.st !== 'live' || this.ending) return;
      const near = (x, y, r) => hyp(h.x - x, h.y - y) <= r;
      for (const id of this.qWait) { const g = this.giverAt(id); if (near(g[0], g[1], D.QUEST_FLOW.talkR)) { this.takeQuest(id, h); return; } }   // a giver with work waiting
      // a brand in hand relights a dark post
      if (h.brand > 0) for (const p of this.posts) if (!p.lit && near(p.x, p.y, 100)) { h.chan = { kind: 'relight', t: 0, need: QT.relightSecs, post: p }; h.path = null; return; }
      if (!h.carry) {
        for (const d of this.drops) if (!d.gone && near(d.x, d.y, 80)) { h.carry = d.kind; h.carryQ = d.q; d.gone = true; h.dirty = true; this.drops = this.drops.filter(x => !x.gone); this.ev(['pk', h.id, CARRY_CODE[d.kind]]); return; }
        for (const id of HAUL_IDS) { const H = this.haul[id]; if (this.q[id].st === 1 && H.left > 0 && near(H.fx, H.fy, QT.pickR) && !(id === 'stonegate' && this.sg)) { H.left--; h.carry = H.kind; h.carryQ = id; h.dirty = true; this.ev(['pk', h.id, H.code]); return; } }
      }
      // the camp fires: light a brand
      for (const fp of QT.fires) if (near(fp[0], fp[1], 100)) { h.brand = h.boons.keeper ? 99999 : QT.brandSecs * (h.boons.brandbearer ? 2 : 1); h.dirty = true; this.ev(['br', h.id, 1]); return; }
      if (h.carry) return;
      if (this.q.road.st === 1) {
        let bi = -1, bd = 90; this.postSlots.forEach((s, i) => { if (this.posts.some(p => p.slot === i)) return; const d = hyp(h.x - s[0], h.y - s[1]); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0) { h.chan = { kind: 'post', t: 0, need: QT.postSecs, slot: bi }; h.path = null; return; }
      }
      if (this.sg && this.q.stonegate.st === 1 && near(this.carvePt[0], this.carvePt[1], QT.carveRad)) { h.chan = { kind: 'carve', t: 0 }; h.path = null; return; }
      if (this.q.cover.st === 1 && near(this.coverPt[0], this.coverPt[1], QT.coverRad)) { h.chan = { kind: 'cover', t: 0 }; h.path = null; return; }
      for (const s of this.secrets) {
        if (s.st || hyp(h.x - s.x, h.y - s.y) > 70) continue;
        if (s.n === 1) { h.dig = 3; h.path = null; return; }
        if (s.n === 8) { h.carry = 'warm'; s.carried = h; s.st = 0; s.x = -999; s.y = -999; this.markProps(); return; }
        if (s.n === 2 || s.n === 4) { s.st = 1; const id = s.n === 2 ? 'circlet' : 'silverheads'; if (!this.giveItem(h, id)) { h.gold += 40; this.stats[h.id].gold += 40; } this.ev(['dr', h.id, id]); h.dirty = true; return; }
        if (s.n === 6 || s.n === 7) { s.st = 1; this.page(h, s.n); return; }
      }
    }
    // where the use key (G) would act for this hero right now, or null: the same tests as interact (and the modules' useAt, in their
    // intent order), so a hero standing close to something G does (a secret, a load, a fire, a giver) sees a G over it. Never sent from afar.
    useSpot(h) {
      if (h.dead || this.st !== 'live' || this.ending || h.chan || h.dig) return null;
      for (const m of this.mods) if (m.useAt) { const p = m.useAt(h); if (p) return p; }
      const near = (x, y, r) => hyp(h.x - x, h.y - y) <= r;
      for (const id of this.qWait) { const g = this.giverAt(id); if (near(g[0], g[1], D.QUEST_FLOW.talkR)) return [g[0], g[1]]; }
      if (h.brand > 0) for (const p of this.posts) if (!p.lit && near(p.x, p.y, 100)) return [p.x, p.y];
      if (!h.carry) {
        for (const d of this.drops) if (!d.gone && near(d.x, d.y, 80)) return [d.x, d.y];
        for (const id of HAUL_IDS) { const H = this.haul[id]; if (this.q[id].st === 1 && H.left > 0 && near(H.fx, H.fy, QT.pickR) && !(id === 'stonegate' && this.sg)) return [H.fx, H.fy]; }
      }
      for (const fp of QT.fires) if (near(fp[0], fp[1], 100)) return [fp[0], fp[1]];
      if (h.carry) return null;
      if (this.q.road.st === 1) { let best = null, bd = 90; this.postSlots.forEach((s, i) => { if (this.posts.some(p => p.slot === i)) return; const d = hyp(h.x - s[0], h.y - s[1]); if (d < bd) { bd = d; best = s; } }); if (best) return [best[0], best[1]]; }
      if (this.sg && this.q.stonegate.st === 1 && near(this.carvePt[0], this.carvePt[1], QT.carveRad)) return [this.carvePt[0], this.carvePt[1]];
      if (this.q.cover.st === 1 && near(this.coverPt[0], this.coverPt[1], QT.coverRad)) return [this.coverPt[0], this.coverPt[1]];
      for (const s of this.secrets) if (!s.st && near(s.x, s.y, 70) && [1, 2, 4, 6, 7, 8].includes(s.n)) return [s.x, s.y];
      return null;
    }
    page(h, n) { if (!h.pages.includes(n)) h.pages.push(n); h.dirty = true; this.ev(['pg', h.id, n]); }
    addSecret(n, x, y) { if (!this.secrets.some(s => s.n === n)) this.secrets.push({ n, x, y, st: 0 }); }
    dropCarry(h) {
      if (!h.carry) return;
      if (h.carry === 'warm') { const s = this.secrets.find(x => x.n === 8); if (s) { s.x = h.x; s.y = h.y; } }
      else { this.drops.push({ tk: 'drop', id: ++this.did, kind: h.carry, q: h.carryQ, x: h.x, y: h.y, r: 14, hp: QT.dropHp, gone: false }); this.ev(['dp', h.id, CARRY_CODE[h.carry], Math.round(h.x), Math.round(h.y)]); }
      h.carry = null; h.carryQ = null; h.dirty = true; this.markProps();
    }
    // a hero channelling (planting a post, relighting one, carving the Words, laying the capstone); false once it ends
    stepChan(h, dt) {
      const c = h.chan;
      if (h.path || h.stun > 0 || h.cast || this.ending) { h.chan = null; return false; }
      c.t += dt;
      switch (c.kind) {
        case 'post': if (this.q.road.st !== 1) { h.chan = null; return false; } if (c.t >= c.need) { h.chan = null; this.plantPost(h, c.slot); return false; } break;
        case 'relight': if (c.t >= c.need) { c.post.lit = true; if (h.brand < 9000) h.brand = Math.max(0, h.brand - 8); h.chan = null; h.dirty = true; this.ev(['rl', h.id, c.post.slot]); return false; } break;
        case 'carve': if (!this.sg || this.q.stonegate.st !== 1 || hyp(h.x - this.carvePt[0], h.y - this.carvePt[1]) > QT.carveRad + 20) { h.chan = null; return false; } break;
        case 'recall': if (c.t >= c.need) { h.chan = null; this.recallArrive(h); return false; } break;
        case 'cover': if (this.q.cover.st !== 1 || hyp(h.x - this.coverPt[0], h.y - this.coverPt[1]) > QT.coverRad + 20) { h.chan = null; return false; } break;
      }
      return true;
    }
    plantPost(h, slot) {
      if (this.q.road.st !== 1 || this.posts.some(p => p.slot === slot)) return;
      const s = this.postSlots[slot], side = POST_SLOTS[slot][2];
      this.posts.push({ slot, x: s[0], y: s[1], lx: s[0] + 8 * side, ly: s[1] - 8, lit: true }); this.posts.sort((a, b) => a.slot - b.slot);
      this.ev(['pp', h.id, slot, s[0], s[1]]);
    }
    // a blow while carving loses the place back to the last quarter
    carveHit(h) { if (!this.sg) return; const was = this.sg.carve; this.sg.carve = Math.floor(was * 4 + 1e-9) / 4; if (was - this.sg.carve > 0.001 || was > 0) this.ev(['cv', h.id, r2(this.sg.carve)]); }

    // ================================================================ end of the run
    checkEnd(dt) {
      if (this.ending) return;
      if (this.camp.hp <= 0) return this.finish(false);
      if (this.heroes.length > 1 && this.heroes.every(h => h.dead)) { this.wipeT += dt; if (this.wipeT > 0.5) return this.finish(false); } else this.wipeT = 0;
      // the run is won when the last wave's siege is beaten and nothing is left alive
      if (this.wave >= D.LAST_WAVE && !this.spawnQ.length && !this.enemies.some(e => !e.dead)) this.beginEnding();
    }
    // the end beat: the gate shuts, the Warden counts the heroes in, the Steward names the town
    beginEnding() {
      for (const id of D.QUEST_ORDER) if (this.q[id].st === 1) this.failQuest(id);
      if (this.qWait.length) { this.qWait.length = 0; this.markProps(); }
      this.ending = { t: 0, step: 0, counted: 0 };
      for (const h of this.heroes) { h.chan = null; h.path = null; h.pending = null; h.target = null; if (h.dead) this.respawn(h, h.x, h.y, 1, 0); h.invul = 99; }
      this.ev(['end', 0]);
    }
    updateEnding(dt) {
      const E = this.ending; if (!E || this.st !== 'live') return; E.t += dt; const N = this.heroes.length;
      if (E.step === 0 && E.t >= 1.5) { E.step = 1; this.shut = true; this.ev(['end', 1]); }
      if (E.step >= 1 && E.counted < N && E.t >= 3 + 1.1 * E.counted) { const h = this.heroes[E.counted++]; this.ev(['count', h.id, E.counted, N]); }
      if (E.step === 1 && E.counted >= N && E.t >= 3 + 1.1 * N + 1.2) { E.step = 2; this.ev(['end', 2]); }
      if (E.step === 2 && E.t >= 3 + 1.1 * N + 5.5) this.finish(true);
    }
    finish(won) {
      if (this.st !== 'live') return;
      this.st = won ? 'won' : 'lost';
      const questsDone = D.QUEST_ORDER.filter(id => this.q[id].st === 2).length, survived = won ? D.LAST_WAVE : Math.max(0, this.wave - 1);
      const parts = this.practice ? { waves: 0, quests: 0, hold: 0, chain: 0 } : this.hookVal('payout', D.payoutParts(survived, questsDone, won, 0)), pay = parts.waves + parts.quests + parts.hold + parts.chain, gold = {}, goldBy = {};
      for (const p of this.players) { gold[p.id] = pay; goldBy[p.id] = Object.assign({}, parts); }
      const quests = {}; for (const id of D.QUEST_ORDER) quests[id] = this.q[id].st;
      this.result = { t: 'fdend', won, wave: this.wave, quests, gold, goldBy, stats: this.stats, time: Math.round(this.time) };
      this.sendSnapshot(); this.flushEvents(); this.emit(this.result);
    }

    // ================================================================ messages
    sendSnapshot() { this.emit(this.snapshot(false)); }
    // which of a hero's Q W E R can be pressed right now (bit 0 Q .. bit 3 R): learned, the R's level reached, a charge in hand; the team strip shows it
    readyMask(h) { let m = 0; if (h.dead) return 0; for (let i = 0; i < 4; i++) if (h.ranks[i] > 0 && h.ch[i] >= 1 && !(i === 3 && h.level < D.LEVELS.rLevel)) m |= 1 << i; return m; }
    snapshot(full = true) {
      const s = { t: 'fds', st: this.st, tm: r1(this.time), wave: this.wave, next: this.st === 'live' && this.wave < D.LAST_WAVE ? Math.max(0, Math.round(this.nextWaveAt - this.time)) : -1, camp: [Math.round(this.camp.hp), this.camp.max], h: [], e: [], q: [], z: [] };
      for (const h of this.heroes) s.h.push([h.id, Math.round(h.x), Math.round(h.y), r2(h.face), Math.round(h.hp), h.max, this.heroFlags(h), h.cast ? h.cast.slot : -1, h.cast ? r2(h.cast.t / h.cast.wind) : 0, h.level, h.hk, CARRY_CODE[h.carry] || 0, this.readyMask(h)]);
      const L = this.lights();
      for (const e of this.enemies) if (!e.dead) s.e.push([e.id, e.type, Math.round(e.x), Math.round(e.y), r2(e.face), Math.max(1, Math.round(e.hp / e.max * 100)), this.enemyFlags(e, L), e.tier || 0]);
      for (const id of D.QUEST_ORDER) { const q = this.q[id]; s.q.push([id, q.st, Math.round(q.prog * 100), D.QUESTS[id].deadlineWave]); }
      for (const z of this.zones) if (!z.dead) s.z.push([z.id, z.kind, Math.round(z.x), Math.round(z.y), Math.round(z.a), r2(z.b), r1(Math.max(0, z.t)), z.kind === ZONE.WALL ? Math.round(z.hp / z.max * 100) : z.c]);
      s.part = D.partOf(Math.max(1, this.wave)); s.tier = this.tier; s.bs = this.enemies.filter(e => !e.dead && e.def.boss).map(e => this.bossInfo(e));
      if (this.st === 'camp' || full) s.pl = this.plist();
      if (this.st === 'live' && (full || this.tickN % 20 < 2)) s.dm = this.heroes.map(h => { const t = this.stats[h.id] || {}; return [h.id, Math.round(t.dmg || 0), Math.round(t.heal || 0)]; });   // the damage meter: each hero's run total, once a second
      this.hook('snapshot', s);
      const props = this.buildProps(), js = JSON.stringify(props);
      if (full || js !== this.lastProps) { s.props = props; this.lastProps = js; }
      return s;
    }
    buildProps() {
      const qo = [], qd = [], Hb = this.haul.beacon, Hr = this.haul.roof;
      for (const id of HAUL_IDS) {
        const H = this.haul[id]; if (!H || this.q[id].st !== 1) continue; const second = id === 'stonegate' && this.sg;
        if (H.left > 0 && !second) qo.push([H.code, Math.round(H.fx), Math.round(H.fy), H.left]);
        if (!second) qd.push([H.code, Math.round(H.tx), Math.round(H.ty), H.toR]);
      }
      if (this.sg && this.q.stonegate.st === 1) qd.push([6, Math.round(this.carvePt[0]), Math.round(this.carvePt[1]), QT.carveRad]);
      if (this.q.cover.st === 1) qd.push([7, Math.round(this.coverPt[0]), Math.round(this.coverPt[1]), QT.coverRad]);
      for (const d of this.drops) if (!d.gone) qo.push([CARRY_CODE[d.kind], Math.round(d.x), Math.round(d.y), 1]);
      for (const fp of QT.fires) qo.push([8, fp[0], fp[1], 0]);
      return { sp: this.spring, dg: this.dig ? Math.round(this.dig.prog * 100) : 0, pal: this.pal ? [Math.round(this.pal.hp), this.pal.max] : 0, ct: this.carts.filter(c => !c.gone).map(c => [c.id, Math.round(c.x), Math.round(c.y), Math.round(c.hp), c.max, c.arrived ? 1 : 0]),
        sm: this.smith ? [Math.round(this.smith.x), Math.round(this.smith.y), Math.round(this.smith.hp), this.smith.max] : 0, fg: this.forge, fp: Math.round(this.q.fire.prog * 100),
        sec: this.secrets.map(s => [s.n, Math.round(s.x), Math.round(s.y), s.st]), ch: this.child ? [Math.round(this.child.x), Math.round(this.child.y), this.child.st] : 0, wm: this.warm ? 1 : 0,
        // the same state in the words the map art reads (founding/map-art.js)
        spring: this.spring === 2 ? 'well' : 'trickle', fountainR: D.TUNE.fountainR, gate: this.pal ? (this.pal.stone ? 'stone' : 'palisade') : 'none', gateHp: this.pal ? r2(this.pal.hp / this.pal.max) : 0, forge: this.forge === 2 || (this.forge === 1 && this.q.fire.prog > 0.1), smith: !!this.smith,
        carts: this.carts.filter(c => !c.gone).map(c => ({ x: Math.round(c.x), y: Math.round(c.y), a: r2(M.along('north', c.s)[2] ? Math.atan2(-M.along('north', c.s)[3], -M.along('north', c.s)[2]) : 0) })),
        found: this.secrets.reduce((m, s) => m | (s.st ? 1 << (s.n - 1) : 0), 0), prints: !!this.child && this.child.st === 1,
        // the later run
        night: Math.round(this.night * 20) / 20, beacon: this.beaconLit, jars: this.q.beacon.st === 1 && Hb ? Hb.left : 0,
        posts: this.posts.map(p => p.slot), postsOff: this.posts.filter(p => !p.lit).map(p => p.slot), postSlots: this.q.road.st === 1,
        graves: this.graves, roof: this.roofDone ? 1 : (this.q.roof.st === 1 && Hr && Hr.need ? r2(0.9 * Hr.got / Hr.need) : 0), capstone: this.cap >= 1 ? 1 : r2(this.cap),
        carved: this.sg ? r2(this.sg.carve) : this.q.stonegate.st === 2 ? 1 : 0, shut: this.shut, ending: this.ending ? 1 : 0, glint: this.secrets.some(s => s.n === 4 && !s.st),
        qo, qd, qw: this.qWait.map(id => [id, D.giverKey(id)]), ...(this.mods.length ? this.hookProps() : null) };
    }
    hookProps() { const p = {}; this.hook('props', p); return p; }
    heroFlags(h) {
      let f = 0; if (h.dead) f |= FLAG.DEAD; if (h.stun > 0) f |= FLAG.STUN; if (h.slowT > 0) f |= FLAG.SLOW; if (h.rootT > 0) f |= FLAG.ROOT; if (h.carry) f |= FLAG.CARRY; if (h.braceT > 0) f |= FLAG.WIND;
      if (h.st.hot) f |= FLAG.HOT; if (h.hero === 'cleric') f |= h.st.petals << 10; if (h.shield > 0) f |= FLAG.SHIELD; if (h.hasteT > 0 || h.rallyT > 0 || h.springT > 0) f |= FLAG.HASTE; if (h.invul > 0) f |= FLAG.INVULN; if (h.brand > 0) f |= FLAG.BRAND; return f;
    }
    enemyFlags(e, L) {
      let f = 0; if (e.stun > 0) f |= FLAG.STUN; if (e.slowT > 0) f |= FLAG.SLOW; if (e.mark) f |= FLAG.MARK; if (e.burn) f |= FLAG.BURN; if (e.def.elite) f |= FLAG.ELITE; if (e.rootT > 0) f |= FLAG.ROOT; if (e.atk) f |= FLAG.WIND;
      if (e.tauntT > 0) f |= FLAG.TAUNT; if (e.def.boss) f |= FLAG.BOSS; if (e.under) f |= FLAG.UNDER; if (e.def.shield) f |= FLAG.FRONT; if (e.blind > 0) f |= FLAG.BLIND; if (e.vuln) f |= FLAG.VULN;
      if (e.invuln) f |= FLAG.INVULN; if (e.ai && e.ai.wind) f |= FLAG.WIND;
      if (e.def.hide && this.night > 0.3 && !(e.reveal > this.time) && !this.isLit(e.x, e.y, L)) f |= FLAG.HIDDEN;   // only seen in light
      return f;
    }
    hookSheet(h) { const o = {}; this.hook('sheet', h, o); return o; }
    sendSheet(h) {
      h.dirty = false; h.lastSheet = this.time;
      const cd = [], cm = []; for (let i = 0; i < 4; i++) { cd.push(h.ch[i] >= h.chMax[i] ? 0 : r1(Math.max(0, h.cdT[i]))); cm.push(h.ranks[i] ? r1(this.cdOf(h, i)) : 0); }
      const pts = h.level - this.spent(h);
      const ps = h.hero === 'bastion' ? [h.braceT > 0 ? 1 : 0] : h.hero === 'cleric' ? [h.st.petals, Math.round(h.st.pt / this.petalOf(h).t * 100)] : h.hero === 'pyromancer' ? [h.st.streak, h.st.hot ? 1 : 0] : [h.st.stacks, h.st.count % this.keenOf(h).every];
      this.emitTo(h.id, { t: 'fdp', hero: h.hero, gold: h.gold, xp: Math.round(h.xp), need: h.level >= D.LEVELS.max ? 0 : D.LEVELS.need(h.level), lv: h.level, pts, rk: [0, 1, 2, 3, 4].map(i => h.ranks[i] | 0), cd, cm, ch: h.ch.slice(), cx: h.chMax.slice(), up: Object.keys(h.ups),
        it: h.items.map(x => x ? [x.uid, x.id] : 0), bn: Object.keys(h.boons), bo: h.offers || 0, ps, fl: h.flask, hp: [Math.round(h.hp), h.max], sh: Math.round(h.shield), st: h.dead ? Math.round(h.respT) : 0, shop: this.forge === 2 ? 2 : 1, dm: r2(h.dmgMul), ms: Math.round(this.heroSpeed(h)), br: h.brand > 9000 ? 999 : Math.round(Math.max(0, h.brand)), cr: CARRY_CODE[h.carry] || 0, pg: h.pages.slice(), bq: h.offerQ.length, rc: Math.ceil(Math.max(0, h.rcCd || 0)), ds: r1(Math.max(0, h.dashCd || 0)), ua: h.useAt || 0, ...(this.mods.length ? this.hookSheet(h) : null) });
    }
  }

  // ====================================================================== the skills (each runs at release)
  // (h hero, r rank, a target {e|u|x,y}, pw power: 1, or 0.5 for an Echoing Bell echo)
  const SK = {};
  const sk = (h, s) => h.K.skills[s];

  SK['bastion.q'] = function (h, r, a, pw) {
    let e = a.e; if (e.dead) return; const S = sk(h, 'q');
    if (h.ups.shieldcharge) { const d = hyp(e.x - h.x, e.y - h.y) - e.r - h.r - 4; if (d > 0) { const k = d / hyp(e.x - h.x, e.y - h.y), nx = h.x + (e.x - h.x) * k, ny = h.y + (e.y - h.y) * k; if (M.walkable(nx, ny, 12)) { h.x = nx; h.y = ny; } } }
    this.dmgE(e, rk(S.dmg, r), h, { pw, kb: 14, stun: rk(S.stun, r), stag: 0.2 });
    this.fx(h, 0, e.x, e.y);
    if (h.ups.ricochet) { const n = this.nearestEnemy(e.x, e.y, 170, e); if (n) { this.dmgE(n, 6, h, { pw, kb: 6, stun: 0.8 }); this.ev(['r', h.id, 0, Math.round(n.x), Math.round(n.y), Math.round(e.x), Math.round(e.y), 9]); } }
    if (h.ups.concussive) for (const n of this.inCircle(e.x, e.y, 80)) if (n !== e) { const ang = Math.atan2(n.y - e.y, n.x - e.x), res = 1 - (n.def.kbRes || 0); n.kvx += Math.cos(ang) * 22 * 7 * res; n.kvy += Math.sin(ang) * 22 * 7 * res; }
  };
  SK['bastion.w'] = function (h, r, a, pw) {
    const S = sk(h, 'w'), R = this.area(h, rk(S.rad, r)), slow = rk(S.slow, r), dur = rk(S.dur, r) * (h.ups.longwatch ? 2 : 1);
    if (h.bannerZ && !h.bannerZ.dead) h.bannerZ.dead = true;
    const z = this.addZone(ZONE.BANNER, a.x, a.y, R, 0, 0, dur, h); h.bannerZ = z;
    z.upd = (z) => { for (const e of this.inCircle(z.x, z.y, z.a)) { if (e.def.boss) continue; e.tauntT = 0.5; e.taunter = h; this.slowE(e, 1 - slow, 0.5); } if (h.ups.rally) for (const o of this.heroes) if (!o.dead && hyp(o.x - z.x, o.y - z.y) < z.a + o.r) o.rallyT = 0.5; };
    if (h.ups.ironground) for (const e of this.inCircle(a.x, a.y, R)) if (e.def.elite) this.rootE(e, 1.5, h);
    this.fx(h, 1, a.x, a.y);
  };
  SK['bastion.e'] = function (h, r, a) {
    const S = sk(h, 'e'); h.braceT = rk(S.window, r);
    if (h.ups.bulwarkstep) { const ang = Math.atan2(a.y - h.y, a.x - h.x); for (let d = 90; d > 0; d -= 15) { const nx = h.x + Math.cos(ang) * d, ny = h.y + Math.sin(ang) * d; if (M.walkable(nx, ny, 12)) { h.x = nx; h.y = ny; h.face = ang; break; } } } else h.lockT = 0.35;
    if (h.ups.sharedshield) { let best = null, bd = 450; for (const o of this.heroes) { if (o === h || o.dead) continue; const d = hyp(o.x - h.x, o.y - h.y); if (d < bd) { bd = d; best = o; } } if (best) { best.shield = Math.max(best.shield, 30); best.shieldT = 4; best.dirty = true; } }
    this.fx(h, 2, h.x, h.y);
  };
  SK['bastion.r'] = function (h, r, a) {
    const S = sk(h, 'r'), len = rk(S.len, r) * (h.ups.longwall ? 1.5 : 1), dur = rk(S.dur, r) * (h.ups.longwall ? 1.5 : 1), dir = Math.atan2(a.y - h.y, a.x - h.x), ang = dir + PI / 2;
    for (const o of this.zones) if (o.kind === ZONE.WALL && o.owner === h) o.dead = true;
    const z = this.addZone(ZONE.WALL, a.x, a.y, len, ang, 0, dur, h); z.hp = z.max = rk(S.hp, r); z.tk = 'wall'; z.r = 0;
    z.ux = Math.cos(ang); z.uy = Math.sin(ang); z.nx = Math.cos(dir); z.ny = Math.sin(dir); z.sh = 0;
    if (r >= 2) for (const e of this.enemies) {   // rank 2: raising it shoves back what stands on its line; rank 3 stuns it too
      if (e.dead || e.under || e.def.boss) continue; const dx = e.x - a.x, dy = e.y - a.y, u = dx * z.ux + dy * z.uy, v = dx * z.nx + dy * z.ny;
      if (Math.abs(u) < len / 2 + 20 && Math.abs(v) < 60) { const side = v < 0 ? -1 : 1, res = 1 - (e.def.kbRes || 0); e.kvx += z.nx * side * 120 * res; e.kvy += z.ny * side * 120 * res; if (r >= 3) this.stunE(e, 1, h); }
    }
    z.upd = (z) => {
      if (z.hp <= 0) z.dead = true;
      if (h.ups.spikedwall && this.tickN % 10 === 0) for (const e of this.enemies) if (!e.dead && e.wall === z && e.wallT > this.time - 0.6) this.dmgE(e, 5, h, { quiet: 1, aoe: 1 });
    };
    z.end = (z) => { // Collapse: it falls forward and stuns what stands in front
      if (!h.ups.collapse) return;
      for (const e of this.enemies) { if (e.dead || e.under) continue; const dx = e.x - z.x, dy = e.y - z.y, u = dx * z.ux + dy * z.uy, v = dx * z.nx + dy * z.ny; if (Math.abs(u) < z.a / 2 + 20 && v > -30 && v < 150) this.dmgE(e, 15, h, { stun: 1.5, aoe: 1 }); }
      this.impact(h, 3, z.x + z.nx * 70, z.y + z.ny * 70, 110);
    };
    this.fx(h, 3, a.x, a.y);
  };

  SK['cleric.q'] = function (h, r, a, pw) {
    const S = sk(h, 'q'), per = rk(S.heal, r) / 8 * pw;
    const add = (u, k) => { if (!u || u.dead) return; u.hots.push({ per: per * k, t: S.dur, tick: 0, src: h }); this.ev(['r', h.id, 0, Math.round(u.x), Math.round(u.y), Math.round(h.x), Math.round(h.y), r]); };
    add(a.u, 1);
    if (h.ups.chainmend) { let best = null, bd = 260; for (const o of this.heroes) { if (o === a.u || o.dead) continue; const d = hyp(o.x - a.u.x, o.y - a.u.y); if (d < bd) { bd = d; best = o; } } if (best) add(best, 0.6); }
  };
  SK['cleric.w'] = function (h, r, a, pw) {
    const e = a.e; if (e.dead) return; const S = sk(h, 'w'), ex = e.x, ey = e.y, splash = rk(S.splash, r), radiant = h.ups.radiant, R = radiant ? 160 : S.splashR;
    this.fx(h, 1, ex, ey);
    this.dmgE(e, rk(S.dmg, r), h, { pw, kb: 7, aoe: 1 });
    { const P = this.petalOf(h); if (P.smite && h.st.petals < 3) h.st.pt += P.smite; }
    if (h.ups.searing && !e.dead) this.burnE(e, 5, 3, h);
    if (h.ups.judgement && !e.dead && e.def.elite) this.stunE(e, 1.2, h);
    for (const u of this.heroes) if (!u.dead && hyp(u.x - ex, u.y - ey) < R + u.r) this.heal(u, splash * pw, h);
    if (radiant) for (const n of this.inCircle(ex, ey, R)) if (n !== e) this.dmgE(n, rk(S.dmg, r) * 0.6, h, { pw, aoe: 1 });
    this.impact(h, 1, ex, ey, R);
  };
  SK['cleric.e'] = function (h, r, a, pw) {
    const S = sk(h, 'e'), R = this.area(h, rk(S.rad, r)), hp = rk(S.heal, r) * pw, bp = rk(S.burn, r) * pw; let tk = 0;
    const z = this.addZone(ZONE.SANCT, a.x, a.y, R, 0, 0, rk(S.dur, r), h); h.sanctZ = z;
    z.upd = (z, dt) => { tk += dt; if (tk >= 0.5) { tk -= 0.5; for (const u of this.heroes) if (!u.dead && hyp(u.x - z.x, u.y - z.y) < z.a + u.r) this.heal(u, hp * 0.5, h, true); for (const e of this.inCircle(z.x, z.y, z.a)) { this.dmgE(e, bp * 0.5, h, { quiet: 1, aoe: 1 }); if (h.ups.hallowed) this.slowE(e, 0.7, 0.8); } } };
    this.fx(h, 2, a.x, a.y);
  };
  SK['cleric.r'] = function (h, r, a, pw) {
    const S = sk(h, 'r'), R = this.area(h, rk(S.rad, r));
    this.fx(h, 3, a.x, a.y);
    for (const u of this.heroes) if (hyp(u.x - a.x, u.y - a.y) < R + u.r) { if (u.dead) this.raise(u, h.ups.morningglory ? 1 : rk(S.raise, r), h.ups.morningglory ? 3 : rk(S.safe, r)); else this.heal(u, rk(S.heal, r), h); }
    if (h.ups.blindingdawn) for (const e of this.inCircle(a.x, a.y, R)) { if (e.def.boss) continue; e.blind = 3; e.atk = null; }
    this.impact(h, 3, a.x, a.y, R);
  };

  SK['pyromancer.q'] = function (h, r, a, pw) {
    const S = sk(h, 'q'), hot = !!a.hot, ang = Math.atan2(a.y - h.y, a.x - h.x), dx = Math.cos(ang), dy = Math.sin(ang);
    const R = this.area(h, rk(S.rad, r)) * (hot ? 1.5 : 1), Dm = rk(S.dmg, r) * (hot ? 2 : 1), maxD = S.range * h.rangeMul;
    this.ev(['r', h.id, 0, Math.round(h.x + dx * 16), Math.round(h.y + dy * 16), Math.round(h.x + dx * maxD), Math.round(h.y + dy * maxD), hot ? 9 : r]);
    this.fireball(h, h.x + dx * 16, h.y + dy * 16, dx, dy, maxD, R, Dm, pw, S.speed, true, r, hot && D.KITS.pyromancer.passive.ground[this.prank(h)]);
    if (h.ups.twinflame) { /* the second charge is its own cast */ }
  };
  FoundingSim.prototype.fireball = function (h, x, y, dx, dy, maxD, R, Dm, pw, speed, main, rank, ground) {
    const p = { x, y, dist: 0, trailAt: 0, upd: (p, dt) => {
      const st = speed * dt; p.x += dx * st; p.y += dy * st; p.dist += st;
      if (main && h.ups.scorchedpath && p.dist - p.trailAt >= 55) { p.trailAt = p.dist; const z = this.addZone(ZONE.BURN, p.x, p.y, 34, 0, 0, 3, h); let tk = 0; z.upd = (z, d2) => { tk += d2; if (tk >= 0.5) { tk -= 0.5; for (const e of this.inCircle(z.x, z.y, z.a)) this.dmgE(e, 4, h, { quiet: 1, aoe: 1, pw }); } }; }
      let hit = null; for (const e of this.inCircle(p.x, p.y, 10)) { hit = e; break; }
      if (hit || p.dist >= maxD || !M.walkable(p.x, p.y, 2)) {
        const crit = main ? this.pyroRoll(h) : false;
        for (const t of this.inCircle(p.x, p.y, R)) { const d = t === hit ? Dm : Dm * 0.6; this.dmgE(t, crit && t === hit ? d * 2 : d, h, { pw, kb: 12, fire: 1, crit: crit && t === hit, aoe: 1, stag: 0.25, fx: p.x, fy: p.y }); }
        this.impact(h, 0, p.x, p.y, R);
        if (ground) this.burnGround(h, p.x, p.y, R * 0.8, 4, 8, pw);
        if (main && h.ups.split) for (let k = 0; k < 3; k++) { const ang = Math.atan2(dy, dx) + (k - 1) * 0.9 + (hit ? PI * 0 : 0), ddx = Math.cos(ang), ddy = Math.sin(ang); this.fireball(h, p.x + ddx * 12, p.y + ddy * 12, ddx, ddy, 170, R * 0.5, Dm * 0.35, pw, speed * 0.8, false, rank); this.ev(['r', h.id, 0, Math.round(p.x), Math.round(p.y), Math.round(p.x + ddx * 170), Math.round(p.y + ddy * 170), 8]); }
        return true;
      }
      return false;
    } };
    this.projs.push(p);
  };
  SK['pyromancer.w'] = function (h, r, a, pw) {
    const S = sk(h, 'w'), R = this.area(h, rk(S.rad, r)) * (h.ups.wildfire ? 1.35 : 1), Dm = rk(S.dmg, r), stun = rk(S.stun, r), x = a.x, y = a.y;
    const fz = this.addZone(ZONE.FUSE, x, y, R, S.delay, 0, S.delay, h);
    this.fx(h, 1, x, y);
    const erupt = (k, extra) => {
      for (const e of this.inCircle(x, y, R)) this.dmgE(e, Dm * k, h, { pw, kb: 12, fire: 1, aoe: 1, stun: extra ? 0 : stun, fx: x, fy: y });
      this.impact(h, 1, x, y, R);
      if (r >= 3 && !extra) this.burnGround(h, x, y, R * 0.85, 4, 8, pw);
    };
    if (h.ups.updraft) this.after(S.delay * 0.5, () => { for (const e of this.inCircle(x, y, R * 1.3)) { const res = 1 - (e.def.kbRes || 0); e.kvx += (x - e.x) * 6 * 0.7 * res; e.kvy += (y - e.y) * 6 * 0.7 * res; } });
    fz.end = () => { erupt(1, false); if (h.ups.aftershock) this.after(0.7, () => { erupt(0.6, true); }); };
  };
  FoundingSim.prototype.burnGround = function (h, x, y, R, dur, dps, pw, slow) {
    const z = this.addZone(ZONE.BURN, x, y, R, 0, 0, dur, h); let tk = 0;
    z.upd = (z, dt) => { tk += dt; if (tk >= 0.5) { tk -= 0.5; for (const e of this.inCircle(z.x, z.y, z.a)) { this.dmgE(e, dps * 0.5, h, { quiet: 1, aoe: 1, pw }); if (slow) this.slowE(e, 1 - slow, 0.8); } } };
    return z;
  };
  SK['pyromancer.e'] = function (h, r, a, pw) {
    const S = sk(h, 'e'), maxD = rk(S.range, r) * (h.ups.longstride ? 2 : 1) * h.rangeMul, dx0 = a.x - h.x, dy0 = a.y - h.y, d = hyp(dx0, dy0) || 1, m = Math.min(maxD, d), ux = dx0 / d, uy = dy0 / d, sx = h.x, sy = h.y;
    let L = m; while (L > 0 && !M.walkable(sx + ux * L, sy + uy * L, 12)) L -= 10;
    const nx = sx + ux * Math.max(0, L), ny = sy + uy * Math.max(0, L); h.x = nx; h.y = ny; h.face = Math.atan2(dy0, dx0); h.path = null; h.pending = null;
    this.ev(['r', h.id, 2, Math.round(nx), Math.round(ny), Math.round(sx), Math.round(sy), r]);
    for (const e of this.enemies) if (!e.dead && !e.under && segDist(e.x, e.y, sx, sy, nx, ny) < 22 + e.r) this.dmgE(e, 10, h, { pw, kb: 8, fire: 1, aoe: 1 });
    const T = rk(S.trail, r) * (h.ups.longstride ? 1.5 : 1), dps = 9 * (h.ups.longstride ? 1.5 : 1); let tk = 0;
    const z = this.addZone(ZONE.TRAIL, sx, sy, nx, ny, 18, T, h);
    z.upd = (z, dt) => { tk += dt; if (tk >= 0.5) { tk -= 0.5; for (const e of this.enemies) if (!e.dead && !e.under && segDist(e.x, e.y, sx, sy, nx, ny) < 18 + e.r) this.dmgE(e, dps * 0.5 * pw, h, { quiet: 1, aoe: 1, fire: 1 }); } };
    if (h.ups.landingblast) { for (const e of this.inCircle(nx, ny, 70)) this.dmgE(e, 20, h, { pw, kb: 14, aoe: 1, fire: 1 }); this.impact(h, 2, nx, ny, 70); }
  };
  SK['pyromancer.r'] = function (h, r, a, pw) {
    const S = sk(h, 'r'), R = this.area(h, rk(S.rad, r)), delay = h.ups.plummet ? 0.8 : S.delay, x = a.x, y = a.y;
    const meteor = (mx, my, MR, dmg, t0) => {
      const z = this.addZone(ZONE.METEOR, mx, my, MR, t0, 0, t0, h);
      z.end = () => {
        for (const e of this.inCircle(mx, my, MR)) { const d = hyp(e.x - mx, e.y - my); this.dmgE(e, dmg * (1 - 0.35 * clamp(d / MR, 0, 1)), h, { pw, kb: 34, fire: 1, aoe: 1, stag: 0.4, fx: mx, fy: my }); }
        this.impact(h, 3, mx, my, MR);
        if (MR >= R) this.burnGround(h, mx, my, MR * 0.8, h.ups.moltencrater ? 12 : 6, (h.ups.moltencrater ? 1.5 : 1) * rk(S.crater, r), pw, h.ups.moltencrater ? 0.4 : 0);
      };
    };
    this.fx(h, 3, x, y);
    meteor(x, y, R, rk(S.dmg, r), delay);
    if (h.ups.shower) for (let k = 0; k < 3; k++) { const ang = k * TAU / 3 + 0.5, mx = x + Math.cos(ang) * 150, my = y + Math.sin(ang) * 150; this.after(0.25 * (k + 1), () => { if (!h.dead || true) meteor(mx, my, 70, Math.round(rk(S.dmg, r) * 0.16), delay); }); }
  };

  SK['ranger.q'] = function (h, r, a, pw) {
    const S = sk(h, 'q'), L = rk(S.len, r) * h.rangeMul, base = rk(S.dmg, r), ang0 = Math.atan2(a.y - h.y, a.x - h.x);
    const fire = (ang) => {
      const dx = Math.cos(ang), dy = Math.sin(ang), x2 = h.x + dx * L, y2 = h.y + dy * L;
      this.ev(['r', h.id, 0, Math.round(h.x + dx * 14), Math.round(h.y + dy * 14), Math.round(x2), Math.round(y2), r]);
      for (const e of this.enemies) {
        if (e.dead || e.under) continue; if (segDist(e.x, e.y, h.x, h.y, x2, y2) >= 8 + e.r * 0.85 || (e.x - h.x) * dx + (e.y - h.y) * dy <= 0) continue;
        const fly = hyp(e.x - h.x, e.y - h.y); let m = 1; if (h.ups.longshot) m = 1 + 0.6 * clamp(fly / L, 0, 1);
        this.dmgE(e, base * m, h, { pw, kb: 9 });
        if (h.ups.splinter && !e.dead) for (const side of [-1, 1]) { const sa = ang + side * PI / 2, sx2 = e.x + Math.cos(sa) * 70, sy2 = e.y + Math.sin(sa) * 70; for (const t of this.enemies) if (t !== e && !t.dead && !t.under && segDist(t.x, t.y, e.x, e.y, sx2, sy2) < 6 + t.r * 0.8) this.dmgE(t, base * 0.35, h, { pw, quiet: 1 }); }
      }
    };
    if (h.ups.twinarrow) { fire(ang0 - 0.14); fire(ang0 + 0.14); } else fire(ang0);
  };
  SK['ranger.w'] = function (h, r, a, pw) {
    const S = sk(h, 'w'), R = this.area(h, rk(S.rad, r)), cap = h.ups.hairtrigger ? 5 : rk(S.cap, r);
    const lay = (x, y, other) => {
      h.traps = h.traps.filter(t => !t.dead); while (h.traps.length >= cap) h.traps.shift().dead = true;
      const z = this.addZone(ZONE.TRAP, x, y, R, h.ups.hairtrigger ? 1 : 0, h.ranks[1], 40, h); z.armT = h.ups.hairtrigger ? 0 : S.arm; z.pairs = other ? [other] : []; if (other) other.pairs.push(z); h.traps.push(z);
      z.upd = (z, dt) => {
        if (z.armT > 0) { z.armT -= dt; if (z.armT <= 0) z.b = 1; return; }
        let trig = this.enemyNearTrap(z, 36);
        if (!trig && z.pairs.length) for (const o of z.pairs) if (!o.dead) for (const e of this.enemies) if (!e.dead && !e.under && segDist(e.x, e.y, z.x, z.y, o.x, o.y) < 18 + e.r * 0.5) { trig = true; break; }
        if (trig) this.trapBurst(z, h, r, pw, R);
      };
      return z;
    };
    this.fx(h, 1, a.x, a.y);
    if (h.ups.tripwire) { const ang = Math.atan2(a.y - h.y, a.x - h.x) + PI / 2, off = 80, z1 = lay(a.x + Math.cos(ang) * off, a.y + Math.sin(ang) * off, null); lay(a.x - Math.cos(ang) * off, a.y - Math.sin(ang) * off, z1); }
    else lay(a.x, a.y, null);
  };
  FoundingSim.prototype.enemyNearTrap = function (z, R) { for (const e of this.inCircle(z.x, z.y, R)) return !!e; return false; };
  FoundingSim.prototype.trapBurst = function (z, h, r, pw, R) {
    if (z.dead) return; z.dead = true; const S = sk(h, 'w');
    const go = (zz) => { for (const e of this.inCircle(zz.x, zz.y, R)) { this.dmgE(e, rk(S.dmg, r), h, { pw, kb: 16, aoe: 1, stag: 0.2, fx: zz.x, fy: zz.y }); this.slowE(e, 1 - rk(S.slow, r), rk(S.slowT, r)); } this.impact(h, 1, zz.x, zz.y, R); };
    go(z);
    if (h.ups.cluster) for (let k = 0; k < 3; k++) { const ang = this.rand() * TAU, d = this.rand() * R * 1.1, bx = z.x + Math.cos(ang) * d, by = z.y + Math.sin(ang) * d; this.after(0.35, () => { for (const e of this.inCircle(bx, by, 42)) this.dmgE(e, rk(S.dmg, r) * 0.4, h, { pw, aoe: 1 }); this.impact(h, 1, bx, by, 42); }); }
    for (const o of z.pairs) if (!o.dead) { o.dead = true; go(o); }
  };
  SK['ranger.e'] = function (h, r, a, pw) {
    const e = a.e; if (e.dead) return; const S = sk(h, 'e');
    e.mark = { m: rk(S.mult, r) + (h.ups.exposed ? 0.15 : 0), t: rk(S.dur, r), src: h, slow: !!h.ups.exposed };
    this.fx(h, 2, e.x, e.y);
  };
  SK['ranger.r'] = function (h, r, a, pw) {
    const S = sk(h, 'r'), R = this.area(h, rk(S.rad, r)), dur = rk(S.dur, r) * (h.ups.longrain ? 2.2 : 1), Dm = rk(S.dmg, r), BR = S.blast; let acc = 0;
    const z = this.addZone(ZONE.VOLLEY, a.x, a.y, R, 0, 0, dur + 0.6, h);
    z.upd = (z, dt) => {
      if (h.ups.guidedstars && h.aim) { const dx = h.aim.x - z.x, dy = h.aim.y - z.y, d = hyp(dx, dy); if (d > 4) { const st = Math.min(d, 140 * dt); z.x += dx / d * st; z.y += dy / d * st; } }
      if (z.dur - z.t < dur) { acc += dt; while (acc >= 0.06) { acc -= 0.06; const ang = this.rand() * TAU, d = Math.sqrt(this.rand()) * z.a, ax = z.x + Math.cos(ang) * d, ay = z.y + Math.sin(ang) * d; this.after(0.4, () => { for (const e of this.inCircle(ax, ay, BR)) { this.dmgE(e, Dm, h, { pw, kb: 5, aoe: 1, quiet: 1 }); if (h.ups.pinningstars) this.rootE(e, 0.8, h); } }); } }
    };
    this.fx(h, 3, a.x, a.y);
  };

  FoundingSim.FLAG = FLAG; FoundingSim.ZONE = ZONE; FoundingSim.mulberry = mulberry;
  return FoundingSim;
})();

if (typeof module !== 'undefined') module.exports = { FoundingSim };
