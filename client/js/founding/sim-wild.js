// The Founding: wild camps, host side (pass 3).
// Ten neutral camps off the lanes. Each is a small family of creatures with a leader: idle until a hero comes near (or a blow lands),
// then the whole camp comes; leashed to its ground (they run home, heal and forget); a cleared camp refills 2-3 minutes later (longer
// as the run goes on) and comes back stronger with the lane tier. They pay XP and gold the ordinary way (killE) and the leader may
// drop an item. Strikes follow the game's telegraph rules: the small ones show the ordinary red circle (the core draws it from the
// def), the heavy ones and every leader move send a telegraph event. The module runs its own enemies (FoundingSim.spawnAt).
// Events (all start with wc): wcwake ci eid x y · wcrst ci x y · wcclr ci x y · wcre ci · wchowl eid x y · wcmv eid kind · wcfx kind x y r.
// Props: wc = one state code per camp (0 asleep, 1 awake, 2 cleared).
(function () {
  'use strict';
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot, PI = Math.PI, TAU = PI * 2;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return hyp(px - (x1 + dx * t), py - (y1 + dy * t)); };
  const r2 = v => Math.round(v * 100) / 100;

  // ---------------------------------------------------------------- the creatures
  // atk as the lane enemies (wind, cd, dmg, hitR, reach, off, range, tele). sp: the leader's own move (see SPECIALS). A strike with
  // tele sends a red telegraph; the rest show the small red circle the core draws from hitR/off.
  const KINDS = {
    // ash-boars of the woods and copses
    wboar: { name: 'Cinderboar', fam: 'boar', r: 16, hp: 92, speed: 72, aggro: 175, xp: 13, gold: 3, atk: { wind: 0.6, cd: 1.5, dmg: 8, hitR: 28, reach: 14, off: 22 } },
    wsow: { name: 'Ashtusk Sow', fam: 'boar', r: 27, hp: 500, speed: 54, aggro: 190, xp: 52, gold: 20, elite: true, kbRes: 0.45, sp: 'rush', atk: { wind: 1.0, cd: 2.8, dmg: 17, hitR: 64, reach: 16, off: 38, tele: true } },
    // wolves of the high ground and the open plain
    wwolf: { name: 'Ash Wolf', fam: 'wolf', r: 13, hp: 62, speed: 100, aggro: 195, xp: 12, gold: 3, atk: { wind: 0.45, cd: 1.1, dmg: 6, hitR: 22, reach: 12, off: 20 } },
    walpha: { name: 'Emberjaw Alpha', fam: 'wolf', r: 21, hp: 420, speed: 88, aggro: 210, xp: 50, gold: 19, elite: true, kbRes: 0.3, sp: 'pounce', atk: { wind: 0.8, cd: 2.3, dmg: 15, hitR: 52, reach: 14, off: 30, tele: true } },
    // things of the river bends and the reed margins
    wsnapper: { name: 'Reed Snapper', fam: 'river', r: 14, hp: 88, speed: 54, aggro: 150, xp: 13, gold: 3, atk: { wind: 0.7, cd: 1.6, dmg: 9, hitR: 26, reach: 14, off: 22 } },
    wspit: { name: 'Mudspitter', fam: 'river', r: 12, hp: 46, speed: 46, aggro: 270, xp: 14, gold: 4, ranged: true, atk: { wind: 1.2, cd: 2.8, dmg: 11, hitR: 46, range: 230, tele: true } },
    wsilt: { name: 'Old Silt', fam: 'river', r: 28, hp: 520, speed: 44, aggro: 200, xp: 54, gold: 20, elite: true, kbRes: 0.5, sp: 'wave', atk: { wind: 1.1, cd: 2.7, dmg: 17, hitR: 66, reach: 16, off: 40, tele: true } },
    // cairn-things, stone and ember
    wcairn: { name: 'Cairn Crawler', fam: 'stone', r: 17, hp: 150, speed: 38, aggro: 150, xp: 15, gold: 4, atk: { wind: 0.8, cd: 1.8, dmg: 10, hitR: 32, reach: 14, off: 24 } },
    wwisp: { name: 'Ember Wisp', fam: 'stone', r: 10, hp: 38, speed: 64, aggro: 250, xp: 12, gold: 4, ranged: true, atk: { wind: 1.1, cd: 2.5, dmg: 10, hitR: 44, range: 220, tele: true } },
    wwarden: { name: 'Cairnwarden', fam: 'stone', r: 30, hp: 580, speed: 36, aggro: 190, xp: 56, gold: 22, elite: true, kbRes: 0.6, sp: 'stonefall', atk: { wind: 1.2, cd: 2.9, dmg: 19, hitR: 78, reach: 18, off: 44, tele: true } },
  };
  for (const id in KINDS) { KINDS[id].wild = true; D.addEnemy(id, KINDS[id]); }

  // the leaders' own moves: cd (s), warn (s), dmg, shape numbers; min/max is the distance to the target where it is used
  const SPECIALS = {
    rush: { cd: 7.5, warn: 0.95, dmg: 21, len: 320, hw: 34, min: 0, max: 380, dash: 0.34 },       // Gore Rush: a red lane, then the sow runs it
    pounce: { cd: 6.5, warn: 0.85, dmg: 19, R: 66, min: 0, max: 430, dash: 0.26 },                // Pounce: a red circle where the hero stands, then the alpha lands in it
    wave: { cd: 8.0, warn: 1.1, dmg: 20, reach: 270, half: 0.5, min: 0, max: 250 },                 // Silt Wave: a red cone
    stonefall: { cd: 9.0, warn: 1.25, dmg: 16, R: 50, n: 3, min: 0, max: 420 },                      // Stonefall: three red circles round the hero
  };

  // ---------------------------------------------------------------- the camps
  // x, y: the leader's place; grunts stand in a ring round it. m: strength (health, damage, pay). where: for the notes and the test.
  const CAMPS = [
    { id: 'hillcairn', name: 'Cairn Hollow', where: 'Beacon Hill, the mountain side', x: 720, y: 1180, fam: 'stone', leader: 'wwarden', grunts: [['wcairn', 2], ['wwisp', 1]], m: 1.1 },
    { id: 'plainwolves', name: 'The Wind Den', where: 'the western plain', x: 1080, y: 2580, fam: 'wolf', leader: 'walpha', grunts: [['wwolf', 3]], m: 1.0 },
    { id: 'westcopse', name: 'Bristle Copse', where: 'the western copse', x: 1640, y: 2920, fam: 'boar', leader: 'wsow', grunts: [['wboar', 3]], m: 1.0 },
    { id: 'swplain', name: 'The Far Den', where: 'the south-west plain', x: 740, y: 3560, fam: 'wolf', leader: 'walpha', grunts: [['wwolf', 3]], m: 1.15 },
    { id: 'bluffpack', name: 'Bluff Rest', where: 'the East Bluff', x: 4320, y: 1560, fam: 'wolf', leader: 'walpha', grunts: [['wwolf', 3]], m: 1.1 },
    { id: 'pasture', name: 'The High Pasture', where: 'the pasture between the road and the bluff', x: 3660, y: 1120, fam: 'boar', leader: 'wsow', grunts: [['wboar', 3]], m: 1.0 },
    { id: 'seaflats', name: 'The Ashwood Wallow', where: 'the woods across the river, south-east', x: 5800, y: 3780, fam: 'boar', leader: 'wsow', grunts: [['wboar', 4]], m: 1.2 },
    { id: 'southbend', name: 'Silt Bend', where: 'the south bend of the river, east bank', x: 4760, y: 3980, fam: 'river', leader: 'wsilt', grunts: [['wsnapper', 2], ['wspit', 1]], m: 1.05 },
    { id: 'eastbank', name: 'The Reed Bank', where: 'the east bank above the bend', x: 4880, y: 3320, fam: 'river', leader: 'wsilt', grunts: [['wsnapper', 2], ['wspit', 2]], m: 1.15 },
    { id: 'embergrove', name: 'The Ember Cairns', where: 'the far south-east', x: 5300, y: 4460, fam: 'stone', leader: 'wwarden', grunts: [['wcairn', 2], ['wwisp', 2]], m: 1.25 },
    // (2026-10-30, the bigger valley) six more camps for the new wilds
    { id: 'ruins', name: 'The Broken Ring', where: 'the old ruins on the west plain', x: 1060, y: 3220, fam: 'stone', leader: 'wwarden', grunts: [['wcairn', 2], ['wwisp', 1]], m: 1.1 },
    { id: 'greyback', name: 'The Grey Stones', where: 'the top of the Greyback', x: 1050, y: 2150, fam: 'wolf', leader: 'walpha', grunts: [['wwolf', 3]], m: 1.05 },
    { id: 'fen', name: 'Sedge Hollow', where: 'the Sedge Fen, south-west', x: 820, y: 3980, fam: 'river', leader: 'wsilt', grunts: [['wsnapper', 2], ['wspit', 1]], m: 1.1 },
    { id: 'delta', name: 'The Delta Shoals', where: 'the river delta, south-east', x: 5750, y: 4400, fam: 'river', leader: 'wsilt', grunts: [['wsnapper', 2], ['wspit', 2]], m: 1.2 },
    { id: 'heights', name: 'The High Runs', where: 'the Timber Heights, north-east', x: 6100, y: 1560, fam: 'wolf', leader: 'walpha', grunts: [['wwolf', 3]], m: 1.15 },
    { id: 'ashpines', name: 'The Pine Hollow', where: 'deep in the Ashwood', x: 6100, y: 3400, fam: 'boar', leader: 'wsow', grunts: [['wboar', 3]], m: 1.2 },
  ];

  const TUNE = {
    wake: 1,                      // multiplies a creature's waking distance
    leash: 540,                   // how far from its camp a creature may be drawn before it runs home
    party: 1.2,                   // grunt count (not by party size: every party meets the same camps)
    leaderHp: [0.7, 1, 1.3, 1.6], // leader health, by party size
    tierHp: 0.08, tierDmg: 0.05, tierPay: 0.06,   // stronger per lane tier (sim.tier 0..7)
    tierExtra: 4,                 // from this tier a camp has one more grunt
    respawn: [118, 4.5, 40],      // seconds: base, per wave reached, random spread
    respawnApart: 260,            // a camp does not refill with a hero right on top of it (it refills behind you otherwise)
    sight: 560,                   // how far a pack sees a hero it has not been hurt by (and only along a clear line: woods, ridges and higher ground hide)
    lostSecs: 3,                  // an unhurt pack that has lost sight of everyone this long goes home
    wakeR: 520, sleepR: 800,    // a camp only exists in the world while a hero is within this of it (it is asleep, whole and healed, otherwise)
    itemLeader: 0.42, itemGrunt: 0.05, itemTier: 0.015,
    rewardMul: 1,                 // all camp xp and gold
    xpMul: 3,                     // camp xp on top: a hero who jungles levels well ahead of one who only holds a lane (user, 2026-10-30)
    idle: 0.35,                   // idle wander speed
  };

  const stCode = c => (c.st === 'clear' ? 2 : c.alert ? 1 : 0);

  FS.WILD = { CAMPS, KINDS, SPECIALS, TUNE, FAMS: ['boar', 'wolf', 'river', 'stone'] };

  (FS.mods = FS.mods || []).push(sim => {
    const camps = CAMPS.map((c, i) => ({ i, def: c, x: c.x, y: c.y, st: 'none', act: false, recs: [], mem: [], alert: false, alertT: 0, respawnAt: 0, gen: 0, clears: 0, slots: [] }));
    const stats = { kills: 0, clears: 0, items: 0, xp: 0, gold: 0, builds: 0 };   // read by the tuning runner
    const WI = () => sim.scaleN();
    const waveDmg = () => D.dmgScale(sim.wave);

    // ---------------------------------------------------------------- spawning
    function slotsFor(c, n) {   // the leader at the camp's heart, grunts in a ring (snapped to ground that can be stood on)
      const out = [], lead = sim.nearestWalkable(c.x, c.y, 20); out.push(lead);
      for (let k = 0; k < n; k++) {
        const a = 0.7 + k * TAU / Math.max(3, n) + (c.i % 3) * 0.4, rad = 66 + (k % 2) * 16;
        out.push(sim.nearestWalkable(lead[0] + Math.cos(a) * rad, lead[1] + Math.sin(a) * rad, 16));
      }
      return out;
    }
    // a camp is built when it fills (the start of the run, and again after each clear): who stands where, with this moment's strength.
    // It only lives in the world (as enemies) while a hero is within reach of it; asleep and far away it is just this record, healed.
    function buildCamp(c) {
      const d = c.def, N = WI(), tier = sim.tier, wave = Math.max(1, sim.wave);
      const list = []; { const pools = d.grunts.map(g => g[1]); let more = true; for (let r = 0; more; r++) { more = false; d.grunts.forEach((g, gi) => { if (r < pools[gi]) { list.push(g[0]); more = true; } }); } }
      let n = Math.round(list.length * TUNE.party) + (tier >= TUNE.tierExtra ? 1 : 0); n = Math.max(1, n);
      const kinds = []; for (let k = 0; k < n; k++) kinds.push(list[k % list.length]);
      const hpMul = D.hpScale(wave) * d.m * (1 + TUNE.tierHp * tier), dm = d.m * (1 + TUNE.tierDmg * tier), pay = TUNE.rewardMul * (1 + TUNE.tierPay * tier) * (0.85 + 0.15 * d.m);
      const slots = slotsFor(c, n); c.slots = slots; c.recs = []; c.mem = [];
      const rec = (kind, slot, leader) => { const base = D.ENEMIES[kind], hp = base.hp * hpMul * (leader ? TUNE.leaderHp[Math.min(3, N - 1)] : 1); c.recs.push({ kind, slot, leader, hp, max: hp, dm, pay, tier, dead: false }); };
      rec(d.leader, slots[0], true);
      kinds.forEach((k, i) => rec(k, slots[i + 1], false));
      c.st = 'live'; c.act = false; c.alert = false; c.prov = false; c.gen++; sim.ev(['wcre', c.i]);
    }
    function mk(c, r) {
      const base = D.ENEMIES[r.kind], slot = r.slot;
      const e = sim.spawnAt(r.kind, slot[0], slot[1], mod, { hp: r.max, tier: r.tier, face: sim.rand() * TAU });
      e.hp = r.hp; e.max = r.max;
      e.def = Object.assign({}, base, { atk: Object.assign({}, base.atk, { dmg: base.atk.dmg * r.dm }), xp: base.xp * r.pay * TUNE.xpMul, gold: base.gold * r.pay });   // this one's own numbers; the client reads the kind's
      e.w = { c, slot, rec: r, leader: r.leader, mode: 'idle', baseSpeed: base.speed, hasteT: 0, tgtT: sim.rr(0, 0.3), lostT: 0, wanderT: sim.rr(0.5, 4), wx: slot[0], wy: slot[1], cool: 0, spCd: sim.rr(2, 5), dmgF: r.dm, path: null, pi: 0, pathUntil: 0, sp: null };
      e.acd = sim.rr(0.4, 1.2);
      c.mem.push(e); return e;
    }
    function activate(c) { c.mem = []; for (const r of c.recs) if (!r.dead) mk(c, r); c.act = true; c.alert = false; c.prov = false; }
    function deactivate(c) { for (const e of c.mem) if (!e.dead) { e.w.rec.hp = e.w.rec.max; e.dead = true; } c.mem = []; c.act = false; c.alert = false; c.prov = false; }

    // ---------------------------------------------------------------- waking, leashing
    function alertCamp(c, by, who, hurt) {
      if (hurt) c.prov = true;   // a blow was struck: the pack hunts whoever it likes from now on (until it has gone home)
      if (c.alert) return;
      c.alert = true; c.alertT = sim.time;
      sim.ev(['wcwake', c.i, who ? who.id : 0, Math.round(who ? who.x : c.x), Math.round(who ? who.y : c.y)]);
    }
    function startReturn(e) {
      const w = e.w; if (w.mode === 'return') return;
      w.mode = 'return'; e.invuln = true; e.tgt = null; e.atk = null; w.sp = null; e.burn = null; e.burnT = 0; e.slowT = 0; e.slowM = 1; e.mark = null; e.rootT = 0; e.tauntT = 0; e.taunter = null; e.stun = 0; e.stag = 0; e.blind = 0;
      w.hasteT = 0; e.speed = w.baseSpeed * 1.8; w.path = null; w.retT = 0;
      if (!w.c.rstT || sim.time - w.c.rstT > 2) { w.c.rstT = sim.time; sim.ev(['wcrst', w.c.i, Math.round(e.x), Math.round(e.y)]); }
    }
    // sight: a creature sees a point only along a clear line (FoundingMap.losClear: thick woods, higher ground and ridges block it)
    function seesPt(e, x, y, R) { const d = hyp(x - e.x, y - e.y); return d <= R && M.losClear(e.x, e.y, x, y); }
    // the pack shares its eyes: a hero any living, unreturned member can see
    function packSees(c, x, y) { for (const m of c.mem) if (!m.dead && m.w.mode !== 'return' && seesPt(m, x, y, TUNE.sight)) return true; return false; }
    function sightedHero(e, R) {   // the nearest hero this creature itself sees within R
      let best = null, bd = R; for (const h of sim.heroes) { if (h.dead || h.invul > 0) continue; const d = hyp(h.x - e.x, h.y - e.y); if (d < bd && M.losClear(e.x, e.y, h.x, h.y)) { bd = d; best = h; } } return best;
    }
    function pickTarget(e) {
      const w = e.w, c = w.c, lim = TUNE.leash + 40, blind = !c.prov;   // an unhurt pack only follows what it can see
      if (e.tauntT > 0 && e.taunter && !e.taunter.dead && hyp(e.taunter.x - c.x, e.taunter.y - c.y) < lim + 60) { e.tgt = e.taunter; return; }
      let best = null, bd = 1e9;
      const cur = e.tgt && validT(e, e.tgt) && (!blind || packSees(c, e.tgt.x, e.tgt.y)) ? e.tgt : null; if (cur) { best = cur; bd = hyp(cur.x - e.x, cur.y - e.y) * 0.75; }   // stick to the one it has, unless another is much nearer
      for (const h of sim.heroes) { if (h.dead || h.invul > 0) continue; if (hyp(h.x - c.x, h.y - c.y) > lim) continue; const d = hyp(h.x - e.x, h.y - e.y); if (d < bd && (!blind || packSees(c, h.x, h.y))) { bd = d; best = h; } }
      for (const u of sim.allies || []) { if (u.dead) continue; if (hyp(u.x - c.x, u.y - c.y) > lim) continue; const d = hyp(u.x - e.x, u.y - e.y) - (u.r || 0); if (d < bd && (!blind || packSees(c, u.x, u.y))) { bd = d; best = u; } }
      e.tgt = best;
    }
    function validT(e, t) { const c = e.w.c; return !t.dead && hyp(t.x - c.x, t.y - c.y) < TUNE.leash + 100; }

    // walk with a grid path round trunks when the straight step is blocked
    function walkTo(e, tx, ty, dt, k) {
      const w = e.w, now = sim.time;
      if (w.path && now < w.pathUntil) {
        const p = w.path[Math.min(w.pi, w.path.length - 1)];
        if (hyp(p[0] - e.x, p[1] - e.y) < 14 && w.pi < w.path.length - 1) w.pi++;
        sim.stepToward(e, w.path[Math.min(w.pi, w.path.length - 1)][0], w.path[Math.min(w.pi, w.path.length - 1)][1], dt * k); return;
      }
      w.path = null;
      sim.stepToward(e, tx, ty, dt * k);
      if (e.stuck > 0.3) { w.path = sim.findPath(e.x, e.y, tx, ty); w.pi = 0; w.pathUntil = now + 1.6; e.stuck = 0; }
    }

    // ---------------------------------------------------------------- the leaders' moves
    function canUse(e, t, d) {
      const w = e.w, S = SPECIALS[e.def.sp]; if (!S || w.spCd > 0) return false;
      return d >= S.min && d <= S.max;
    }
    function startSpecial(e, t) {
      const w = e.w, kind = e.def.sp, S = SPECIALS[kind], ang = Math.atan2(t.y - e.y, t.x - e.x), id = ++sim.tid;
      e.face = ang; e.reveal = sim.time + 1.4; w.spCd = S.cd;
      const a = { t: 0, dur: S.warn, sp: kind, id, ang, phase: 'warn', cx: 0, cy: 0, R: 0, hit: null };
      if (kind === 'rush') {
        const dist = hyp(t.x - e.x, t.y - e.y), len = Math.min(S.len, dist + 90);
        a.len = len; a.x0 = e.x; a.y0 = e.y;
        sim.ev(['t', id, 1, Math.round(e.x), Math.round(e.y), r2(ang), Math.round(len), S.hw, r2(S.warn), 0]);
      } else if (kind === 'pounce') {
        a.cx = t.x; a.cy = t.y; a.R = S.R;
        sim.ev(['t', id, 0, Math.round(t.x), Math.round(t.y), S.R, 0, 0, r2(S.warn), 0]);
      } else if (kind === 'wave') {
        a.reach = S.reach;
        sim.ev(['t', id, 2, Math.round(e.x), Math.round(e.y), r2(ang), S.reach, S.half, r2(S.warn), 0]);
      } else if (kind === 'stonefall') {
        a.pts = [{ x: t.x, y: t.y, id }];
        for (let k = 1; k < S.n; k++) { const aa = sim.rand() * TAU, rr = 70 + sim.rand() * 70, p = { x: t.x + Math.cos(aa) * rr, y: t.y + Math.sin(aa) * rr, id: ++sim.tid }; if (!M.walkable(p.x, p.y, 10)) { p.x = t.x; p.y = t.y + (k === 1 ? 90 : -90); } a.pts.push(p); }
        for (const p of a.pts) sim.ev(['t', p.id, 0, Math.round(p.x), Math.round(p.y), S.R, 0, 0, r2(S.warn), 0]);
      }
      e.atk = a; sim.ev(['wcmv', e.id, ['rush', 'pounce', 'wave', 'stonefall'].indexOf(kind)]);
    }
    function hitHero(e, h, base) { sim.hurtHero(h, base * e.w.dmgF * waveDmg(), e, { block: true }); }   // a leader's own move: its base number, the camp's strength, the wave's climb
    function stepSpecial(e, dt) {
      const a = e.atk, w = e.w, S = SPECIALS[a.sp];
      a.t += dt;
      if (a.sp === 'rush' || a.sp === 'pounce') {
        if (a.phase === 'warn') {
          if (a.t < S.warn) return;
          a.phase = 'dash'; a.dt = 0; a.hit = new Set(); a.px = e.x; a.py = e.y;
          if (a.sp === 'pounce') { a.sx = e.x; a.sy = e.y; }
        }
        a.dt += dt; const k = Math.min(1, a.dt / S.dash);
        if (a.sp === 'rush') {
          const nx = a.x0 + Math.cos(a.ang) * a.len * k, ny = a.y0 + Math.sin(a.ang) * a.len * k;
          if (M.walkable(nx, ny, 12)) { e.x = nx; e.y = ny; } else a.dt = S.dash;   // a trunk or a cliff stops it
          for (const h of sim.heroes) if (!h.dead && !a.hit.has(h) && segDist(h.x, h.y, a.px, a.py, e.x, e.y) < S.hw + h.r) { a.hit.add(h); hitHero(e, h, S.dmg); }
          a.px = e.x; a.py = e.y;
        } else {
          const nx = a.sx + (a.cx - a.sx) * k, ny = a.sy + (a.cy - a.sy) * k;
          if (M.walkable(nx, ny, 12)) { e.x = nx; e.y = ny; }
        }
        if (k >= 1) {
          if (a.sp === 'pounce') { for (const h of sim.heroes) if (!h.dead && hyp(h.x - a.cx, h.y - a.cy) < a.R + h.r) hitHero(e, h, S.dmg); sim.ev(['wcfx', 1, Math.round(a.cx), Math.round(a.cy), a.R]); }
          if (a.sp === 'rush') sim.ev(['wcfx', 0, Math.round(e.x), Math.round(e.y), S.hw, r2(a.ang)]);
          sim.ev(['i', a.id, Math.round(e.x), Math.round(e.y)]); e.atk = null; e.acd = 1.3;
        }
        return;
      }
      if (a.t < S.warn) return;
      if (a.sp === 'wave') {
        for (const h of sim.heroes) if (!h.dead && sim.coneHit(h, e.x, e.y, a.ang, S.reach, S.half)) hitHero(e, h, S.dmg);
        sim.ev(['wcfx', 2, Math.round(e.x), Math.round(e.y), S.reach, r2(a.ang)]);
      } else if (a.sp === 'stonefall') {
        for (const p of a.pts) { for (const h of sim.heroes) if (!h.dead && hyp(h.x - p.x, h.y - p.y) < S.R + h.r) hitHero(e, h, S.dmg); sim.ev(['i', p.id, Math.round(p.x), Math.round(p.y)]); sim.ev(['wcfx', 3, Math.round(p.x), Math.round(p.y), S.R]); }
      }
      if (a.sp === 'wave') sim.ev(['i', a.id, Math.round(e.x), Math.round(e.y)]);
      e.atk = null; e.acd = 1.2;
    }
    // the alpha's howl: the whole pack runs a little faster for a few seconds
    function howl(e) {
      const c = e.w.c; e.w.howlAt = sim.time + 16;
      sim.ev(['wchowl', e.id, Math.round(e.x), Math.round(e.y)]);
      for (const m of c.mem) if (!m.dead && m.w.mode === 'fight') { m.w.hasteT = 5; m.speed = m.w.baseSpeed * 1.3; }
    }

    // ---------------------------------------------------------------- one creature
    function idleStep(e, dt) {
      const w = e.w;
      if (e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * 0.05 * dt);
      w.wanderT -= dt;
      if (w.wanderT <= 0) {
        w.wanderT = sim.rr(3, 8) * (e.def.fam === 'stone' ? 1.6 : 1);
        if (sim.rand() < (e.def.fam === 'stone' ? 0.35 : 0.8)) { const a = sim.rand() * TAU, rad = 18 + sim.rand() * 46; w.wx = w.slot[0] + Math.cos(a) * rad; w.wy = w.slot[1] + Math.sin(a) * rad; if (!M.walkable(w.wx, w.wy, 14)) { w.wx = w.slot[0]; w.wy = w.slot[1]; } }
      }
      if (hyp(w.wx - e.x, w.wy - e.y) > 5) { if (e.rootT <= 0) sim.stepToward(e, w.wx, w.wy, dt * TUNE.idle); }
    }
    function update(e, dt) {
      const w = e.w, c = w.c, def = e.def, now = sim.time;
      if (w.spCd > 0) w.spCd -= dt;
      if (w.hasteT > 0) { w.hasteT -= dt; if (w.hasteT <= 0 && w.mode !== 'return') e.speed = w.baseSpeed; }
      // returning: untouchable, quick, and healing; at the foot of its camp it settles
      if (w.mode === 'return') {
        e.atk = null; e.invuln = true; e.hp = Math.min(e.max, e.hp + e.max * 0.3 * dt);
        const d = hyp(w.slot[0] - e.x, w.slot[1] - e.y);
        if ((w.retT += dt) > 7) { e.x = w.slot[0]; e.y = w.slot[1]; e.kvx = e.kvy = 0; }   // wedged on a cliff edge or a trunk: it is home
        if (d < 12 || w.retT > 7 || (e.stuck > 1.5 && d < 60)) { w.mode = 'idle'; e.invuln = false; e.speed = w.baseSpeed; w.cool = now + 2.5; e.tgt = null; w.wx = e.x; w.wy = e.y; }
        else walkTo(e, w.slot[0], w.slot[1], dt, 1);
        return;
      }
      if (e.stun > 0 || e.stag > 0) { if (e.atk && !(e.atk.sp && e.atk.phase === 'dash')) e.atk = null; return; }
      if (e.atk) { if (e.atk.sp) stepSpecial(e, dt); else { e.atk.t += dt; if (e.atk.t >= e.atk.dur) sim.resolveAtk(e); } return; }
      if (w.mode === 'idle') {
        if (now < w.cool) { idleStep(e, dt); return; }
        if (c.alert) { w.mode = 'fight'; w.lostT = 0; }
        else {
          const near = sightedHero(e, def.aggro * TUNE.wake + 20);   // its own eyes, along a clear line
          if (near) { alertCamp(c, near, e); w.mode = 'fight'; w.lostT = 0; }
        }
        if (w.mode === 'idle') { idleStep(e, dt); return; }
      }
      // ---- fighting
      if (hyp(e.x - c.x, e.y - c.y) > TUNE.leash) { startReturn(e); return; }
      if ((w.tgtT -= dt) <= 0) { w.tgtT = 0.25; pickTarget(e); }
      const t = e.tgt;
      if (!t || !validT(e, t)) { e.tgt = null; w.lostT += dt; if (w.lostT > (c.prov ? 3 : TUNE.lostSecs)) startReturn(e); else idleStep(e, dt * 0.5); return; }
      w.lostT = 0;
      const atk = def.atk, dx = t.x - e.x, dy = t.y - e.y, dist = hyp(dx, dy), gap = dist - e.r - (t.r || 0), range = atk.range || atk.reach;
      if (def.sp === 'pounce' && now >= (w.howlAt || 0) && c.mem.length > 1 && e.acd <= 0.5) { howl(e); }
      if (e.acd <= 0 && e.blind <= 0 && canUse(e, t, dist)) { startSpecial(e, t); return; }
      if (gap > range) { if (e.rootT <= 0) walkTo(e, t.x, t.y, dt, 1); }
      else { e.face += angDiff(e.face, Math.atan2(dy, dx)) * Math.min(1, dt * 10); if (e.acd <= 0 && e.blind <= 0) sim.startAtk(e, t); }
    }
    const mod = { update };

    // ---------------------------------------------------------------- the module
    const buildAll = () => { for (const c of camps) if (c.st === 'none') buildCamp(c); };
    function itemFor(e, c) {
      const hs = sim.heroes.filter(h => !h.dead); if (!hs.length) return;
      const w = D.dropWeights(sim.wave), tot = w.reduce((a, b) => a + b, 0);
      let x = sim.rand() * tot, rar = 0; for (; rar < 4; rar++) { if (x < w[rar]) break; x -= w[rar]; }
      let pool = []; for (let r = rar; r >= 0 && !pool.length; r--) pool = D.ITEMS.filter(i => i.rar === r && !i.sec);
      if (!pool.length) return;
      // the items that do something (a passive) are favoured: the items module may mark them with passive/pas/proc
      const wt = pool.map(i => (i.passive || i.pas || i.proc ? 2 : 1)), wsum = wt.reduce((a, b) => a + b, 0);
      let y = sim.rand() * wsum, it = pool[0]; for (let k = 0; k < pool.length; k++) { if (y < wt[k]) { it = pool[k]; break; } y -= wt[k]; }
      if (!sim.autoLoot && sim.worldDrop) { sim.worldDrop(e.x, e.y, it.id); stats.items++; return; }   // in play it lies where the leader fell (sim-world.js)
      for (let t = 0; t < hs.length; t++) { const h = hs[(sim.dropN++) % hs.length]; if (sim.freeSlot(h) >= 0) { sim.giveItem(h, it.id); sim.ev(['dr', h.id, it.id]); stats.items++; return; } else if (t === hs.length - 1) { h.gold += 20; h.dirty = true; } }
    }
    return {
      camps, stats,   // (for the tuning runner and the test)
      start() { if (!sim.noSpawn) buildAll(); },
      hit(a, e, h) { if (e && e.w && e.w.mode !== 'return') alertCamp(e.w.c, h, e, true); return a; },
      kill(e, killer) {
        const w = e.w; if (!w) return;
        const c = w.c; w.rec.dead = true; c.mem = c.mem.filter(m => m !== e && !m.dead); stats.kills++; stats.xp += e.def.xp * D.xpMul(sim.scaleN()); stats.gold += e.def.gold;
        // an item: mostly from the leader
        const p = (w.leader ? TUNE.itemLeader : TUNE.itemGrunt) + TUNE.itemTier * sim.tier * (w.leader ? 1 : 0.3);
        if (sim.rand() < p * TUNE.rewardMul) itemFor(e, c);
        if (c.recs.every(r => r.dead)) {
          c.st = 'clear'; c.act = false; c.alert = false; c.clears++; stats.clears++; c.respawnAt = sim.time + TUNE.respawn[0] + TUNE.respawn[1] * Math.max(1, sim.wave) + sim.rand() * TUNE.respawn[2];
          sim.ev(['wcclr', c.i, Math.round(c.x), Math.round(c.y)]);
        }
      },
      tick() {
        const now = sim.time, over = sim.wave >= D.LAST_WAVE;
        for (const c of camps) {
          if (c.st === 'none') { if (!sim.noSpawn) buildCamp(c); else continue; }
          if (c.st === 'live') {
            const near = sim.nearestHeroTo(c.x, c.y, c.act ? TUNE.sleepR : TUNE.wakeR);
            if (!c.act) { if (near) activate(c); continue; }
            if (c.alert && now - c.alertT > 0.6 && !c.mem.some(m => !m.dead && m.w.mode === 'fight')) { c.alert = false; c.prov = false; }   // everyone has gone home
            if (!near && !c.alert && !c.mem.some(m => !m.dead && m.w.mode === 'return')) deactivate(c);
          } else if (c.st === 'clear' && now >= c.respawnAt && !over && !sim.noSpawn && !sim.nearestHeroTo(c.x, c.y, TUNE.respawnApart)) buildCamp(c);
        }
        // the last siege is beaten: the wilds must not hold the run open
        if (over && !sim.spawnQ.length && !sim.enemies.some(e => !e.dead && !e.w)) {
          for (const c of camps) { for (const e of c.mem) e.dead = true; c.mem = []; if (c.recs) for (const r of c.recs) r.dead = true; c.st = 'clear'; c.act = false; c.alert = false; c.respawnAt = 1e9; }
        }
      },
      props(p) { p.wc = camps.map(stCode); },
    };
  });
})();
