// The Founding: towers and soldiers, host side (pass 3). A feature module on FoundingSim.mods (see docs/plans/founding-pass3.md).
//
// Towers: built anywhere a ghost fits, four kinds (Watch-post, Brazier, Warding bell, Ballista) with three ranks, each rank changing how the
// tower works. They have their own health, enemies target and hit them through sim.allies, a boss's red strikes hurt them, they leave rubble,
// and they give sight. Soldiers: a squad (two knights, an archer, a cleric at the start) marches out to each lane with every wave and fights down it
// toward the spawn. When the enemies step up (waves 5, 9, 13, ...) the squad gains a soldier (see SQUAD_STEPS: archer, knight, a cavalry knight, ...)
// and its soldiers get tougher; the party buys squad upgrades at the Builder's board on top.
// The numbers shared with the client (prices, texts, the placement test) live in FOUNDING_DATA.DEFENCE.
//
// Messages: snapshot keys `tw` (towers) and `sd` (soldiers); props `vis` (sight circles), `tcap` [towers, cap], `sdu` [armour, weapons, healing];
// intents build / upTower / sellTower / repair / soldier; fdx events tw* and so*:
//   twb id kind rank x y (a tower begins)  twu id rank (upgraded)  twf id tx ty variant (it fired)  twr id radius (the bell rang)
//   twd id x y (it fell)  twx id x y (rubble cleared)  twre id (rebuilt)  tws id (sold)  twno pid code (refused: 1 gold 2 cap 3 spot 4 reach 5 away 6 max)
// The Ash Spires: one at the far end of each lane, beside the place the waves come out. A soldier left idle at the hold point walks on and
// attacks its lane's spire; the spire throws a slow ember bolt at the soldiers near it, so they usually die there instead of waiting. It cannot
// fall, is no enemy and no ally (heroes, towers, enemies and the camp never touch it), and its bolts change nothing else. A soldier it takes is owed
// back: the next squad on that lane marches with it again (up to laneExtra), so the lanes keep the strength they had. snapshot key `sp`:
// one small flag int per spire (1 = it was just struck, 2 = soldiers are near and it is awake); events spf idx soldierId tx ty (a bolt leaves),
//   spi idx soldierId x y (it lands), sph idx x y (a soldier struck or shot it).
//   sob wave n (the squads march: n soldiers in all)  soc id tx ty (a cavalry knight's charge struck)  sof id tx ty type (a soldier struck or shot)  soh id tx ty (a heal)  sod id x y (a soldier fell)  sou pid which rank (squad upgrade)
(function () {
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot, PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const r2 = v => Math.round(v * 100) / 100;
  const num = v => typeof v === 'number' && isFinite(v);
  function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return hyp(px - (x1 + dx * t), py - (y1 + dy * t)); }
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };

  // ============================================================ shared numbers (client reads them too)
  const KINDS = ['post', 'brazier', 'bell', 'ballista'];
  // per kind: ranks as arrays indexed rank-1. cost is the price of that rank (rank 1 is the build).
  const TOWER = {
    post: { name: 'Watch-post', cost: [45, 65, 100], hp: [250, 310, 380], sight: [340, 380, 430], range: [300, 310, 330], cd: [1.15, 1.1, 1.05], dmg: [9, 9, 10], arrows: [1, 2, 2], pierce: [0, 0, 1],
      text: ['Looses an arrow at the nearest enemy, or at whatever a hero has marked.', 'Looses two arrows at once.', 'Its arrows pierce in a line.'] },
    brazier: { name: 'Brazier', cost: [50, 70, 100], hp: [240, 300, 370], sight: [300, 340, 400], range: [210, 220, 240], cd: [2.1, 2.0, 1.9], dmg: [15, 17, 19], blast: [48, 54, 60], light: [200, 230, 310], lob: 0.38,
      text: ['Throws fire in a small burst, and lights the ground around it at night.', 'Leaves burning ground where the fire lands.', 'A wider light, and nothing hides in it, not even a stalker.'] },
    bell: { name: 'Warding bell', cost: [40, 60, 90], hp: [230, 290, 350], sight: [340, 370, 410], ring: [2.6, 2.4, 2.2], radius: [200, 220, 240], slow: [0.55, 0.5, 0.5], slowT: [1.4, 1.5, 1.6],
      text: ['No damage. It rings on a beat and slows what is near.', 'Its ring shows hidden enemies.', 'Its ring also shields the nearest tower for a moment.'] },
    ballista: { name: 'Ballista', cost: [60, 80, 120], hp: [310, 380, 460], sight: [320, 360, 400], range: [470, 500, 540], cd: [4.6, 4.3, 4.0], dmg: [52, 64, 78], kb: [0, 22, 22], root: [0, 0, 1.5],
      text: ['A slow, heavy bolt a long way off. It prefers elites and bosses.', 'The bolt knocks its target back.', 'The bolt pins its target in place for a moment.'] },
  };
  // soldiers: per squad upgrade, three ranks
  const SOLDIER_UP = {
    arm: { name: 'Plate and shield', cost: [40, 70, 110], text: ['Tougher knights, archers and cleric: more health, and each blow lands softer.', 'Better plate again.', 'The best plate the founders can make.'] },
    wpn: { name: 'Sharper steel', cost: [40, 70, 110], text: ['Knights and archers hit harder.', 'Sharper again, and a little quicker.', 'The best edge the founders can put on a blade.'] },
    heal: { name: "The cleric's hands", cost: [30, 55, 90], text: ['The cleric heals more, and a little more often.', 'She mends the towers, too, at full strength.', 'Her light reaches farther, and mends everything it touches.'] },
  };
  const UP_IDS = ['arm', 'wpn', 'heal'];
  // soldier bodies: base numbers; a squad's soldiers are multiplied by the enemies' own health growth to the power TUNE.grow (see bodyOf)
  const SOLDIER = {
    knight: { hp: 74, dmg: 6, cd: 1.1, speed: 80, reach: 22, r: 11, aggro: 170 },
    archer: { hp: 44, dmg: 5, cd: 1.3, speed: 72, range: 240, r: 10, aggro: 250 },
    cleric: { hp: 52, heal: 13, cd: 2.2, speed: 76, range: 170, r: 10, aggro: 0 },
    cavalry: { hp: 96, dmg: 8, cd: 1.2, speed: 80, charge: 200, chargeFrom: 100, reach: 26, r: 13, aggro: 270 },
  };
  const TYPES = ['knight', 'archer', 'cleric', 'cavalry'];   // the snapshot's type index
  // the squad that marches to each lane: the base, plus one soldier for every step the enemies have taken (tier 1..7)
  const SQUAD_BASE = ['knight', 'knight', 'archer', 'cleric'];
  const SQUAD_STEPS = ['archer', 'knight', 'cavalry', 'archer', 'cleric', 'cavalry'];   // (the seventh step makes them tougher only: ten at the top)
  const squadAt = tier => SQUAD_BASE.concat(SQUAD_STEPS.slice(0, clamp(tier | 0, 0, SQUAD_STEPS.length)));
  const TUNE = {
    r: 24, capBase: 4, capPer: 2, buildReach: 1000, repairReach: 130, buildSecs: 2.2, upSecs: 1.2, repairPerSec: 0.12, repairGold: 0.1, rubbleSecs: 300, refund: 0.5, rebuild: 0.5,
    soldierCap: 30, laneExtra: 4, grow: 0.65, sqWave: 1, towTab: [1.7, 2.4, 7.9, 14.5, 22, 22, 26, 26], towDmg: 1, towHp: 0.65, chargeMul: 2.2, chargeCd: 7, chargeKb: 100, holdFrac: 0.3, pay: 0.5, bossHit: 2.2, armHp: 0.2, armTake: 0.07, wpnDmg: 0.25, wpnCd: 0.05, healAmt: 0.35, healCd: 0.12, sdSight: 190,
  };
  const SITES = { spring: 120, shop: 90, steward: 80, hall: 140, gate: 90, forge: 100, beacon: 80, meadow: 90, woods: 80, hearth: 190 };
  // the lantern post slots along the North Road (the same list the sim and the art use)
  const POSTS = [];
  { const L1 = M.LANES[0].path, tot = L1[L1.length - 1][2]; let k = 0; for (let s = tot - 100; s > 280; s -= 118, k++) { let i = L1.length - 1; while (i > 0 && L1[i][2] > s) i--; const p = L1[i], side = k % 2 ? -1 : 1; POSTS.push([Math.round(p[0] - p[4] * side * 84), Math.round(p[1] + p[3] * side * 84)]); } }
  const invested = (kind, rank) => { let s = 0; for (let i = 0; i < rank; i++) s += TOWER[kind].cost[i]; return s; };
  const capOf = heroes => TUNE.capBase + TUNE.capPer * Math.max(1, heroes | 0);
  // can a tower stand here? 0 yes, 3 no. towers: [{x, y}] (rubble included), P: the props (quest points, secrets)
  function fits(x, y, towers, P) {
    const R = TUNE.r;
    if (!num(x) || !num(y) || x < 60 || y < 60 || x > M.W - 60 || y > M.H - 60) return 3;
    if (!M.walkable(x, y, R)) return 3;
    for (const t of towers) if (hyp(t.x - x, t.y - y) < R * 2 + 6) return 3;
    for (const k in SITES) { const p = M.P[k]; if (p && hyp(p[0] - x, p[1] - y) < SITES[k]) return 3; }
    for (const p of POSTS) if (hyp(p[0] - x, p[1] - y) < 40) return 3;
    { const QX = typeof FS !== 'undefined' && FS.QUESTX;   // the new quests' fixed places (stakes, mill, larder sacks, shed, quarry, the choice's sites, the fires): keep clear
      if (QX) for (const k in QX) { if (k === 'TUNE' || k === 'START') continue; const v = QX[k]; if (!Array.isArray(v)) continue; const pts = num(v[0]) ? [v] : v; for (const q of pts) if (Array.isArray(q) && hyp(q[0] - x, q[1] - y) < 60) return 3; } }
    if (P) {
      for (const q of P.qo || []) if (hyp(q[1] - x, q[2] - y) < 60) return 3;
      for (const q of P.qd || []) if (hyp(q[1] - x, q[2] - y) < Math.max(50, q[3] || 0) + 40) return 3;
      for (const s of P.sec || []) if (hyp(s[1] - x, s[2] - y) < 60) return 3;
    }
    return 0;
  }
  // the Ash Spires: a crooked pillar beside each lane's far end (where the waves come out; places in map-data.js SPIRES). `stop` is the lane index
  // a soldier walks to before it steps off the road toward the spire. r: its body. range: how far its bolts reach. cd / dmg: one bolt per cd seconds,
  // dmg times the soldiers' own growth (so a soldier lasts a few bolts at any wave); ramp: each second of a fight adds this share to a bolt; crowd:
  // each extra soldier near it quickens the bolts (down to minCd share); travel: the bolt's flight in seconds; idle: seconds a soldier waits at its
  // hold point, with the lane quiet, before it goes on; stopAfter: how many lane samples back toward the camp the road stop lies.
  const SPIRE = { r: 30, range: 330, cd: 2.2, dmg: 14, ramp: 0.1, crowd: 0.05, minCd: 0.55, travel: 0.55, idle: 8, stopAfter: 10, at: M.SPIRES[0].i };
  const SPIRES = M.SPIRES.map(sp => ({ lane: sp.lane, x: sp.x, y: sp.y, stop: Math.min(M.LANES[sp.lane].path.length - 1, sp.i + SPIRE.stopAfter) }));
  const DEF = D.DEFENCE = { SPIRE, SPIRES, KINDS, TOWER, SOLDIER_UP, UP_IDS, SOLDIER, TYPES, SQUAD_BASE, SQUAD_STEPS, squadAt, TUNE, SITES, POSTS, invested, capOf, fits };

  // ============================================================ the module
  (FS.mods = FS.mods || []).push(sim => {
    const ZONE = FS.ZONE;
    sim.extraVis = sim.extraVis || [];
    const towers = [], soldiers = [], up = { arm: 0, wpn: 0, heal: 0 };
    const spires = SPIRES.map(d => ({ d, cd: 1, heat: 0, quiet: 99, hitT: -99, evT: -99 }));   // the Ash Spires (not enemies, not allies: nothing but a soldier ever touches them)
    const quiet = [true, true];   // per lane: no live enemy on it (refreshed each tick)
    const owed = [[], []];   // per lane: the types of soldiers the spire took since the last wave; they march out again with the next squad (the lane keeps its strength)
    let nid = 0, sid = 0;
    const api = sim.defence = { towers, soldiers, up, TUNE, DEF, spires, owed, build: null };

    // ---------------------------------------------------------- damage to enemies: tower and soldier kills pay half
    const payDefs = new Map();
    const softDef = def => { let d = payDefs.get(def); if (!d) { d = Object.assign({}, def, { gold: def.gold * TUNE.pay, xp: def.xp * TUNE.pay }); payDefs.set(def, d); } return d; };
    function hitE(e, amt, o) {
      if (e.dead || e.under) return 0;
      if (e.hp <= amt * 1.7 + 2) { const d = e.def; e.def = softDef(d); const a = sim.dmgE(e, amt, null, o); e.def = d; return a; }
      return sim.dmgE(e, amt, null, o);
    }
    // a tower is as strong as the tier it was built or last upgraded in (rank-ups and rebuilds restamp it): its blows are multiplied by
    // TUNE.towTab[tier] and the damage it takes is divided by that to the power TUNE.towHp. The table is set so a maxed tower line plus a
    // maxed squad holds its lane for that step and the next, then the enemies outgrow it (a tower built to hold waves 5-12 slips at 13).
    // Squads march out fresh each wave, so they keep pace on their own (bodyOf).
    const stampNow = () => D.tierOf(Math.max(1, sim.wave));
    const towMul = (t, k) => Math.pow(TUNE.towTab[Math.min(t.st | 0, TUNE.towTab.length - 1)], k);
    const hiddenFrom = e => e.def.hide && sim.night > 0.3 && !(e.reveal > sim.time) && !sim.isLit(e.x, e.y);
    const nearestOf = (x, y, R, pred) => { let best = null, bd = R + 1; for (const e of sim.inCircle(x, y, R)) { if (pred && !pred(e)) continue; const d = hyp(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } } return best; };

    // the brazier lights the ground at night: add its light to the sim's list (the list is cached per tick, so build our own copy once)
    { const orig = sim.lights.bind(sim); let lastBase = null, lastOut = null, lastN = -1;
      sim.lights = function () {
        const base = orig(); let n = 0; for (const t of towers) if (t.kind === 'brazier' && !t.rubble) n++;
        if (!n) return base;
        if (base === lastBase && n === lastN) return lastOut;
        const out = base.slice(); for (const t of towers) if (t.kind === 'brazier' && !t.rubble) out.push([t.x, t.y, TOWER.brazier.light[t.rank - 1]]);
        lastBase = base; lastOut = out; lastN = n; return out;
      }; }

    // ---------------------------------------------------------- towers
    const live = t => !t.rubble && !t.dead;
    const liveCount = () => { let n = 0; for (const t of towers) if (!t.rubble) n++; return n; };
    const cap = () => capOf(sim.heroes.length || sim.players.length || 1);
    function newTower(kind, x, y, pid) {
      const K = TOWER[kind], max = K.hp[0];
      const t = { tk: 'ally', tw: true, id: ++nid, kind, ki: KINDS.indexOf(kind), rank: 1, st: stampNow(), x, y, r: TUNE.r, hp: Math.round(max * 0.35), max, dead: false, rubble: false, inv: K.cost[0], paid: {}, buildT: TUNE.buildSecs, upT: 0, cd: 0.6, hurtT: -99, shield: 0, shieldT: 0, firedT: -9, burnT: -9, repBy: null, rubbleAt: 0, base: K.cost[0],
        hurt(dmg, e) { return hurtTower(t, dmg, e); } };
      t.paid[pid] = K.cost[0];
      return t;
    }
    function hurtTower(t, dmg, e) {
      if (t.dead || t.rubble) return 0;
      dmg = Math.max(1, Math.round(dmg / towMul(t, TUNE.towHp)));
      if (t.shield > 0) { const a = Math.min(t.shield, dmg); t.shield -= a; dmg -= a; if (dmg <= 0) return 0; }
      t.hp -= dmg; t.hurtT = sim.time;
      if (t.hp <= 0) fall(t);
      return dmg;
    }
    function fall(t) {
      t.hp = 0; t.dead = true; t.rubble = true; t.rubbleAt = sim.time + TUNE.rubbleSecs; t.repBy = null;
      const i = sim.allies.indexOf(t); if (i >= 0) sim.allies.splice(i, 1);
      sim.ev(['twd', t.id, Math.round(t.x), Math.round(t.y)]);
    }
    const heroNear = (x, y, R) => { for (const h of sim.heroes) if (!h.dead && hyp(h.x - x, h.y - y) <= R) return h; return null; };
    const reply = (h, code) => { sim.ev(['twno', h.id, code]); };
    function pay(h, t, amt) { h.gold -= amt; h.dirty = true; t.paid[h.id] = (t.paid[h.id] || 0) + amt; t.inv += amt; }
    function doBuild(h, m) {
      if (h.dead) return;
      const kind = m.kind; if (typeof kind !== 'string' || !KINDS.includes(kind) || !num(m.x) || !num(m.y)) return;
      const x = Math.round(m.x), y = Math.round(m.y);
      if (!heroNear(x, y, TUNE.buildReach)) return reply(h, 4);
      if (fits(x, y, towers, sim.buildProps())) return reply(h, 3);
      if (liveCount() >= cap()) return reply(h, 2);
      const c = TOWER[kind].cost[0]; if (h.gold < c) return reply(h, 1);
      const t = newTower(kind, x, y, h.id); h.gold -= c; h.dirty = true;
      towers.push(t); sim.allies.push(t);
      sim.ev(['twb', t.id, t.ki, 1, x, y]);
      return t;
    }
    function doUp(h, m) {
      const t = towers.find(q => q.id === m.id); if (!t || h.dead || t.rubble) return;
      if (t.rank >= 3) return reply(h, 6);
      const c = TOWER[t.kind].cost[t.rank]; if (h.gold < c) return reply(h, 1);
      pay(h, t, c); t.base += c;
      const K = TOWER[t.kind], old = t.max; t.rank++; t.st = stampNow(); t.max = K.hp[t.rank - 1]; t.hp = Math.min(t.max, t.hp + (t.max - old)); t.upT = TUNE.upSecs;
      sim.ev(['twu', t.id, t.rank]);
    }
    function doSell(h, m) {
      const t = towers.find(q => q.id === m.id); if (!t || h.dead) return;
      if (!t.rubble) for (const pid in t.paid) { const o = sim.hmap[pid]; if (o) { o.gold += Math.floor(t.paid[pid] * TUNE.refund); o.dirty = true; } }
      const i = towers.indexOf(t); if (i >= 0) towers.splice(i, 1);
      const j = sim.allies.indexOf(t); if (j >= 0) sim.allies.splice(j, 1);
      t.dead = true; sim.ev([t.rubble ? 'twx' : 'tws', t.id, Math.round(t.x), Math.round(t.y)]);
    }
    function doRepair(h, m) {
      const t = towers.find(q => q.id === m.id); if (!t || h.dead) return;
      if (hyp(h.x - t.x, h.y - t.y) > TUNE.repairReach + t.r) return reply(h, 5);
      if (t.rubble) {   // rebuild for half the price of that tower
        if (liveCount() >= cap()) return reply(h, 2);
        const c = Math.ceil(t.base * TUNE.rebuild); if (h.gold < c) return reply(h, 1);
        pay(h, t, c); t.st = stampNow(); t.rubble = false; t.dead = false; t.hp = Math.round(t.max * 0.4); t.buildT = TUNE.buildSecs; t.hurtT = sim.time; sim.allies.push(t);
        sim.ev(['twre', t.id]); return;
      }
      if (t.hp >= t.max) return;
      t.repBy = h.id;
    }
    function doSoldier(h, m) {
      if (h.dead || UP_IDS.indexOf(m.up) < 0) return;
      const k = m.up, r = up[k]; if (r >= 3) return reply(h, 6);
      const c = SOLDIER_UP[k].cost[r]; if (h.gold < c) return reply(h, 1);
      h.gold -= c; h.dirty = true; up[k] = r + 1; sim.ev(['sou', h.id, UP_IDS.indexOf(k), up[k]]);
    }
    api.build = (h, kind, x, y) => doBuild(h, { kind, x, y });

    // ---------------------------------------------------------- what a tower does each tick
    function towerAct(t, dt) {
      const K = TOWER[t.kind], r = t.rank - 1;
      if (t.buildT > 0) { t.buildT -= dt; t.hp = Math.min(t.max, t.hp + t.max * 0.65 * dt / TUNE.buildSecs); return; }
      if (t.upT > 0) { t.upT -= dt; return; }
      if (t.shieldT > 0) { t.shieldT -= dt; if (t.shieldT <= 0) t.shield = 0; }
      if (t.repBy) repairStep(t, dt);
      t.cd -= dt;
      switch (t.kind) {
        case 'post': {
          if (t.cd > 0) return;
          const rg = K.range[r];
          const tg = nearestOf(t.x, t.y, rg, e => e.mark && !hiddenFrom(e)) || nearestOf(t.x, t.y, rg, e => !hiddenFrom(e) && !e.def.inert);
          if (!tg) { t.cd = 0.15; return; }
          t.cd = K.cd[r];
          const n = K.arrows[r]; let second = null;
          if (n > 1) second = nearestOf(t.x, t.y, rg, e => e !== tg && !hiddenFrom(e) && !e.def.inert) || tg;
          shootArrow(t, tg, K.dmg[r] * towMul(t, TUNE.towDmg), K.pierce[r], rg);
          if (n > 1) shootArrow(t, second, K.dmg[r] * towMul(t, TUNE.towDmg), 0, rg);
          return;
        }
        case 'brazier': {
          if (t.cd > 0) return;
          const tg = nearestOf(t.x, t.y, K.range[r], e => !hiddenFrom(e) && !e.def.inert);
          if (!tg) { t.cd = 0.2; if (t.rank >= 3) revealIn(t.x, t.y, K.light[r], 1.0); return; }
          t.cd = K.cd[r]; t.firedT = sim.time;
          // the fire is lobbed (K.lob seconds in the air) at where the target will be, and burns only where it lands, when it lands
          const bl = K.blast[r], mul = towMul(t, TUNE.towDmg), dmg = K.dmg[r] * mul, burn = t.rank >= 2 && sim.time - t.burnT > 2.5;
          let lx = (tg.lvx || 0) * K.lob, ly = (tg.lvy || 0) * K.lob; const ld = hyp(lx, ly); if (ld > 60) { lx *= 60 / ld; ly *= 60 / ld; }
          const ax = Math.round(tg.x + lx), ay = Math.round(tg.y + ly);
          if (burn) t.burnT = sim.time;
          sim.ev(['twf', t.id, ax, ay, 2]);
          sim.after(K.lob, () => { for (const e of sim.inCircle(ax, ay, bl)) hitE(e, dmg, { quiet: 1, aoe: 1 }); if (burn) burnGround(ax, ay, 44, 3.6, 5 * mul); });
          return;
        }
        case 'bell': {
          if (t.cd > 0) return;
          const R = K.radius[r], en = sim.inCircle(t.x, t.y, R);
          if (!en.length) { t.cd = 0.3; return; }
          t.cd = K.ring[r];
          sim.ev(['twr', t.id, R]);
          for (const e of en) { sim.slowE(e, K.slow[r], K.slowT[r]); if (t.rank >= 2 && e.def.hide) e.reveal = sim.time + K.slowT[r]; }
          if (t.rank >= 3) { let best = null, bd = 340; for (const o of towers) if (o !== t && live(o) && o.shield < 60) { const d = hyp(o.x - t.x, o.y - t.y); if (d < bd) { bd = d; best = o; } } if (best) { best.shield = 80; best.shieldT = 3; } }
          return;
        }
        case 'ballista': {
          if (t.cd > 0) return;
          const rg = K.range[r];
          let tg = nearestOf(t.x, t.y, rg, e => (e.def.elite || e.def.boss) && !hiddenFrom(e) && !e.def.inert);
          if (!tg) { let bm = -1; for (const e of sim.inCircle(t.x, t.y, rg)) if (!e.def.inert && !hiddenFrom(e) && e.max > bm) { bm = e.max; tg = e; } }
          if (!tg) { t.cd = 0.25; return; }
          t.cd = K.cd[r]; t.firedT = sim.time;
          sim.ev(['twf', t.id, Math.round(tg.x), Math.round(tg.y), 3]);
          const a = hitE(tg, K.dmg[r] * towMul(t, TUNE.towDmg), { aoe: 0 });
          if (!tg.dead) {
            if (K.kb[r]) { const res = 1 - (tg.def.kbRes || 0), ang = Math.atan2(tg.y - t.y, tg.x - t.x); tg.kvx += Math.cos(ang) * K.kb[r] * 7 * res; tg.kvy += Math.sin(ang) * K.kb[r] * 7 * res; }
            if (K.root[r]) sim.rootE(tg, K.root[r]);
          }
          return;
        }
      }
    }
    function revealIn(x, y, R, secs) { for (const e of sim.inCircle(x, y, R)) if (e.def.hide) e.reveal = sim.time + secs; }
    function shootArrow(t, tg, dmg, pierce, rg) {
      t.firedT = sim.time;
      sim.ev(['twf', t.id, Math.round(tg.x), Math.round(tg.y), pierce ? 1 : 0]);
      if (!pierce) { hitE(tg, dmg, { quiet: 1 }); return; }
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x), ex = t.x + Math.cos(ang) * rg, ey = t.y + Math.sin(ang) * rg;
      for (const e of sim.inCircle(t.x + Math.cos(ang) * rg * 0.5, t.y + Math.sin(ang) * rg * 0.5, rg * 0.55)) if (segDist(e.x, e.y, t.x, t.y, ex, ey) < 12 + e.r * 0.6 && !hiddenFrom(e)) hitE(e, dmg, { quiet: 1 });
    }
    function burnGround(x, y, R, dur, dps) {
      const z = sim.addZone(ZONE.BURN, x, y, R, 0, 0, dur, null); let tk = 0;
      z.upd = (zz, dt) => { tk += dt; if (tk >= 0.5) { tk -= 0.5; for (const e of sim.inCircle(zz.x, zz.y, zz.a)) hitE(e, dps * 0.5, { quiet: 1, aoe: 1 }); } };
    }
    function repairStep(t, dt) {
      const h = sim.hmap[t.repBy];
      if (!h || h.dead || t.hp >= t.max || hyp(h.x - t.x, h.y - t.y) > TUNE.repairReach + t.r || sim.time - t.hurtT < 3 || sim.time - h.lastHit < 2) { t.repBy = null; return; }
      const heal = Math.min(t.max - t.hp, t.max * TUNE.repairPerSec * dt), cost = heal * TUNE.repairGold;
      t.repAcc = (t.repAcc || 0) + cost;
      if (t.repAcc >= 1) { const g = Math.floor(t.repAcc); if (h.gold < g) { t.repBy = null; return; } h.gold -= g; h.dirty = true; t.repAcc -= g; t.paid[h.id] = (t.paid[h.id] || 0); }
      t.hp += heal;
    }

    // enemies cannot walk through a tower: slide them off it
    function solid(t) {
      for (const e of sim.inCircle(t.x, t.y, t.r + 40)) {
        if (e.def.boss || e.def.inert || e.mod) continue;
        const dx = e.x - t.x, dy = e.y - t.y, d = hyp(dx, dy) || 0.01, min = t.r + e.r * 0.8;
        if (d < min) { const nx = e.x + dx / d * (min - d), ny = e.y + dy / d * (min - d); if (M.walkable(nx, ny, 6)) { e.x = nx; e.y = ny; } else if (M.walkable(nx, e.y, 6)) e.x = nx; else if (M.walkable(e.x, ny, 6)) e.y = ny; }
      }
    }

    // a boss's red strikes hurt towers: read the telegraphs the sim sent this tick (ordinary enemies already hit what they target)
    function scanTelegraphs() {
      const evs = sim.events; if (!towers.length && !soldiers.length) return;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i]; if (e[0] !== 't' || e[9]) continue;
        const tid = e[1]; let ordinary = false;
        for (const en of sim.enemies) if (en.atk && en.atk.id === tid) { ordinary = true; break; }
        if (ordinary) continue;
        const shape = e[2], x = e[3], y = e[4], a = e[5], b = e[6], w = e[7], warn = e[8];
        let boss = null, bd = 140; for (const en of sim.enemies) if (!en.dead && en.def.boss) { const d = hyp(en.x - x, en.y - y); if (d < bd) { bd = d; boss = en; } }
        const dmg = (boss ? boss.def.atk.dmg : 24) * TUNE.bossHit * D.dmgScale(sim.wave);
        sim.after(warn, () => {
          const hurt = u => {
            if (u.dead) return; const dx = u.x - x, dy = u.y - y, d = hyp(dx, dy); let inside = false;
            if (shape === 0) inside = d < a + u.r;
            else if (shape === 2) inside = d < b + u.r && Math.abs(angDiff(a, Math.atan2(dy, dx))) < w + 0.2;
            else if (shape === 1) inside = segDist(u.x, u.y, x, y, x + Math.cos(a) * b, y + Math.sin(a) * b) < w + u.r;
            if (inside) u.hurt(dmg, boss);
          };
          for (const t of towers.slice()) hurt(t);
          for (const s of soldiers.slice()) hurt(s);
        });
      }
    }

    // ---------------------------------------------------------- soldiers
    const tierNow = () => D.tierOf(Math.max(1, sim.wave));
    function bodyOf(type, tier) {
      const K = SOLDIER[type], hpm = 1 + TUNE.armHp * up.arm, dm = 1 + TUNE.wpnDmg * up.wpn;
      const sg = Math.pow(D.hpScale(TUNE.sqWave ? Math.max(1, sim.wave) : tier ? D.TIER_AT[tier - 1] : 1), TUNE.grow);   // the soldiers toughen with the enemies' own growth
      const hp = Math.round(K.hp * sg * hpm);
      return { hp, max: hp, dmg: K.dmg ? K.dmg * sg * dm : 0, cd: K.cd * (type === 'cleric' ? 1 - TUNE.healCd * up.heal : 1 - TUNE.wpnCd * up.wpn), heal: K.heal ? K.heal * sg * (1 + TUNE.healAmt * up.heal) : 0, take: 1 - TUNE.armTake * up.arm };
    }
    const ORDER = { knight: 0, cavalry: 1, archer: 2, cleric: 3 };   // front rank first
    function spawnSquad(lane) {
      const path = sim.paths[lane], last = path.length - 1, tier = tierNow(); let made = 0;
      const back = owed[lane].splice(0), base = squadAt(tier), stop = Math.round(last * TUNE.holdFrac), list = base.concat(back).sort((a, b) => ORDER[a] - ORDER[b]);
      let inLane = 0; for (const o of soldiers) if (o.lane === lane) inLane++;
      const laneCap = base.length + TUNE.laneExtra;
      for (let i = 0; i < list.length; i++) {
        if (soldiers.length >= TUNE.soldierCap || inLane >= laneCap) { for (const t of list.slice(i)) { const k = back.indexOf(t); if (k >= 0) { back.splice(k, 1); owed[lane].push(t); } } break; }   // (owed ones that found no room march next time)
        const type = list[i], K = SOLDIER[type], b = bodyOf(type, tier), row = (i / 4) | 0, off = ((i % 4) - 1.5) * 22;
        const q = path[Math.min(last, Math.max(0, last - 6 + row * 2 - (i % 2)))], wp = sim.nearestWalkable(q[0] - q[4] * off, q[1] + q[3] * off, 10), hx = wp[0], hy = wp[1];
        const s = { tk: 'ally', so: true, id: ++sid, type, ti: TYPES.indexOf(type), lane, x: hx, y: hy, r: K.r, face: -PI / 2, hp: b.hp, max: b.max, dmg: b.dmg, cd: b.cd, heal: b.heal, take: b.take, dead: false, atkT: 0.3 * i, thinkT: 0.1 * i, tgt: null, pi: Math.max(0, last - 6), stop, off, px: hx, py: hy, stuck: 0, go: false, idleT: 0, flash: 0, moving: false, hurtT: -99, healT: -9, ur: up.arm | (up.wpn << 2) | (up.heal << 4), charging: false, chargeCd: 0,
          hurt(dmg, e) { return hurtSoldier(s, dmg, e); } };
        soldiers.push(s); sim.allies.push(s); made++; inLane++;
      }
      return made;
    }
    function hurtSoldier(s, dmg, e) {
      if (s.dead) return 0;
      dmg = Math.max(1, Math.round(dmg * s.take)); s.hp -= dmg; s.hurtT = sim.time;
      if (s.hp <= 0) { s.dead = true; sim.ev(['sod', s.id, Math.round(s.x), Math.round(s.y)]); const i = sim.allies.indexOf(s); if (i >= 0) sim.allies.splice(i, 1); }
      return dmg;
    }
    // step toward a point if it is walkable (slides along obstacles like an enemy does)
    function stepTo(s, tx, ty, dt, speed) {
      const dx = tx - s.x, dy = ty - s.y, d = hyp(dx, dy); if (d < 1) return d;
      const k = Math.min(1, speed * dt / d), nx = s.x + dx * k, ny = s.y + dy * k;
      if (M.walkable(nx, ny, 8)) { s.x = nx; s.y = ny; } else if (M.walkable(nx, s.y, 8)) s.x = nx; else if (M.walkable(s.x, ny, 8)) s.y = ny;
      s.face += angDiff(s.face, Math.atan2(dy, dx)) * Math.min(1, dt * 10);
      return d;
    }
    function laneWaypoint(s) {
      const path = sim.paths[s.lane], last = path.length - 1;
      for (let p = path[s.pi]; s.pi > s.stop && hyp(s.x - (p[0] - p[4] * s.off), s.y - (p[1] + p[3] * s.off)) < 36; p = path[--s.pi]);
      const a = path[Math.max(s.stop, s.pi - 3)];
      return [a[0] - a[4] * s.off, a[1] + a[3] * s.off];
    }
    function soldierStep(s, dt) {
      const K = SOLDIER[s.type];
      s.atkT -= dt; s.thinkT -= dt; if (s.flash > 0) s.flash -= dt; if (s.chargeCd > 0) s.chargeCd -= dt;
      const mx = s.x - s.px, my = s.y - s.py; s.px = s.x; s.py = s.y;
      if (s.moving && mx * mx + my * my < 0.04) s.stuck += dt; else s.stuck = 0;
      s.moving = false;
      if (s.stuck > 1.5) { s.stuck = 0; s.tgt = null; s.thinkT = 1.2; const path = sim.paths[s.lane], n = M.near(path, s.x, s.y); s.pi = Math.max(s.stop, n.i); const q = path[s.pi]; s.x = q[0] - q[4] * s.off; s.y = q[1] + q[3] * s.off; }
      if (s.type === 'cleric') return clericStep(s, dt, K);
      // pick a target now and then
      if (s.thinkT <= 0) {
        s.thinkT = 0.2 + sim.rand() * 0.12;
        const had = s.tgt && !s.tgt.dead ? s.tgt : null;
        const near = nearestOf(s.x, s.y, K.aggro, e => !e.def.inert && !(e.def.boss && (s.type === 'knight' || s.type === 'cavalry') && hyp(e.x - s.x, e.y - s.y) > 120));
        s.tgt = near || null;
        if (had && !near) { const path = sim.paths[s.lane]; s.pi = M.near(path, s.x, s.y).i; if (s.pi < s.stop) s.pi = s.stop; }
      }
      const t = s.tgt && !s.tgt.dead ? s.tgt : null;
      if (!t) {   // march down the lane toward the spawn, and wait at the end of it (then walk on to the Ash Spire)
        s.charging = false;
        if (s.go && s.pi <= s.stop + 1) { spireStep(s, dt, K); return; }
        const w = laneWaypoint(s);
        if (s.pi > s.stop || hyp(w[0] - s.x, w[1] - s.y) > 24) { stepTo(s, w[0], w[1], dt, K.speed); s.moving = true; s.idleT = 0; }
        else if (!s.go) { s.idleT += dt; if (s.idleT >= SPIRE.idle && quiet[s.lane]) { s.go = true; s.stop = SPIRES[s.lane].stop; } }   // idle with nothing to fight: on to the spire
        if (s.hp < s.max && sim.time - s.hurtT > 6) s.hp = Math.min(s.max, s.hp + 2 * dt);
        return;
      }
      s.idleT = 0;
      const d = hyp(t.x - s.x, t.y - s.y) - t.r;
      if (s.type === 'knight' || s.type === 'cavalry') {
        if (d > K.reach) {
          let sp = K.speed;
          if (s.type === 'cavalry') { if (!s.charging && d > K.chargeFrom && s.chargeCd <= 0) s.charging = true; if (s.charging) sp = K.charge; }   // a rider spurs at what is out in front
          stepTo(s, t.x, t.y, dt, sp); s.moving = true;
        } else {
          s.face += angDiff(s.face, Math.atan2(t.y - s.y, t.x - s.x)) * Math.min(1, dt * 12);
          if (s.atkT <= 0) {
            s.atkT = s.cd; s.flash = 0.25; let dm = s.dmg;
            if (s.charging) {   // the charge lands: a heavy blow that shoves what it hits back
              s.charging = false; s.chargeCd = TUNE.chargeCd; dm *= TUNE.chargeMul; sim.ev(['soc', s.id, Math.round(t.x), Math.round(t.y)]);
              if (!t.dead && !t.def.boss) { const res = 1 - (t.def.kbRes || 0), ang = Math.atan2(t.y - s.y, t.x - s.x); t.kvx += Math.cos(ang) * TUNE.chargeKb * res; t.kvy += Math.sin(ang) * TUNE.chargeKb * res; }
            }
            hitE(t, dm, { quiet: 1 });
          }
        }
      } else {
        if (d > K.range * 0.95) { stepTo(s, t.x, t.y, dt, K.speed); s.moving = true; }
        else {
          if (d < 90) { const ang = Math.atan2(s.y - t.y, s.x - t.x); stepTo(s, s.x + Math.cos(ang) * 40, s.y + Math.sin(ang) * 40, dt, K.speed * 0.9); s.moving = true; }
          s.face += angDiff(s.face, Math.atan2(t.y - s.y, t.x - s.x)) * Math.min(1, dt * 12);
          if (s.atkT <= 0) { s.atkT = s.cd; s.flash = 0.25; sim.ev(['sof', s.id, Math.round(t.x), Math.round(t.y), 1]); hitE(t, s.dmg, { quiet: 1 }); }
        }
      }
    }
    // a soldier at the spire: knights walk up and strike it, archers shoot it from their range. The spire never takes harm (it only flashes).
    function spireStep(s, dt, K) {
      const sp = spires[s.lane], X = sp.d.x, Y = sp.d.y, d = hyp(X - s.x, Y - s.y) - SPIRE.r, melee = s.type === 'knight' || s.type === 'cavalry';
      if (d > (melee ? K.reach : K.range * 0.95)) { stepTo(s, X, Y, dt, K.speed); s.moving = true; return; }
      s.face += angDiff(s.face, Math.atan2(Y - s.y, X - s.x)) * Math.min(1, dt * 12);
      if (s.atkT > 0) return;
      s.atkT = s.cd; s.flash = 0.25;
      if (!melee) sim.ev(['sof', s.id, Math.round(X), Math.round(Y - 40), 1]);
      sp.hitT = sim.time; if (sim.time - sp.evT > 0.3) { sp.evT = sim.time; sim.ev(['sph', s.lane, Math.round(X), Math.round(Y)]); }
    }
    // the spire's own turn: a bolt at the nearest soldier in reach, quicker the more of them there are, and sharper the longer a fight runs
    function spireTick(sp, dt) {
      let n = 0, best = null, bd = 1e9;
      for (const o of soldiers) { if (o.dead) continue; const d = hyp(o.x - sp.d.x, o.y - sp.d.y); if (d <= SPIRE.range) { n++; if (d < bd) { bd = d; best = o; } } }
      if (sp.cd > 0) sp.cd -= dt;
      if (!n) { sp.quiet += dt; if (sp.quiet > 3) sp.heat = 0; return; }
      sp.quiet = 0; sp.heat = Math.min(40, sp.heat + dt);
      if (sp.cd > 0) return;
      sp.cd = SPIRE.cd * Math.max(SPIRE.minCd, 1 - SPIRE.crowd * (n - 1));
      const sg = Math.pow(D.hpScale(Math.max(1, sim.wave)), TUNE.grow), dmg = SPIRE.dmg * sg * (1 + SPIRE.ramp * sp.heat), tg = best;
      sim.ev(['spf', sp.d.lane, tg.id, Math.round(tg.x), Math.round(tg.y)]);
      sim.after(SPIRE.travel, () => { if (tg.dead) return; tg.hurt(dmg, null); if (tg.dead && owed[tg.lane].length < TUNE.laneExtra) owed[tg.lane].push(tg.type); sim.ev(['spi', sp.d.lane, tg.id, Math.round(tg.x), Math.round(tg.y)]); });
    }
    function clericStep(s, dt, K) {
      // stay behind the nearest knight of the squad, heal the most hurt friend in reach
      let lead = null, ld = 1e9;
      for (const o of soldiers) if (o.lane === s.lane && o.type === 'knight' && !o.dead) { const d = hyp(o.x - s.x, o.y - s.y); if (d < ld) { ld = d; lead = o; } }
      if (s.thinkT <= 0) {
        s.thinkT = 0.25;
        let best = null, bf = 0.92;
        const reach = K.range * (up.heal >= 3 ? 1.35 : 1);
        const pool = (cand) => { const f = cand.hp / cand.max; if (f < bf && hyp(cand.x - s.x, cand.y - s.y) <= reach) { bf = f; best = cand; } };
        for (const o of soldiers) if (!o.dead) pool(o);
        if (up.heal >= 2) for (const o of towers) if (live(o)) pool(o);
        for (const h of sim.heroes) if (!h.dead) pool(h);
        s.healTg = best;
      }
      if (lead) { if (ld > 70) { stepTo(s, lead.x - Math.cos(lead.face) * 24, lead.y - Math.sin(lead.face) * 24, dt, K.speed); s.moving = true; } }
      else if (s.go && s.pi <= s.stop + 1) { const sp = SPIRES[s.lane]; if (hyp(sp.x - s.x, sp.y - s.y) > 150) { stepTo(s, sp.x, sp.y, dt, K.speed); s.moving = true; } }   // no knight left to follow: she goes on to the spire too
      else {
        const w = laneWaypoint(s);
        if (s.pi > s.stop || hyp(w[0] - s.x, w[1] - s.y) > 24) { stepTo(s, w[0], w[1], dt, K.speed); s.moving = true; s.idleT = 0; }
        else { s.idleT += dt; if (s.idleT >= SPIRE.idle && quiet[s.lane]) { s.go = true; s.stop = SPIRES[s.lane].stop; } }
      }
      if (s.atkT <= 0 && s.healTg && !s.healTg.dead) {
        const tg = s.healTg, amt = s.heal; s.atkT = s.cd; s.flash = 0.35;
        if (tg.tk === 'hero') sim.heal(tg, amt, null, true); else tg.hp = Math.min(tg.max, tg.hp + amt);
        sim.ev(['soh', s.id, Math.round(tg.x), Math.round(tg.y)]); s.healTg = null;
      }
    }
    function separate() {
      for (let i = 0; i < soldiers.length; i++) {
        const a = soldiers[i]; for (let j = i + 1; j < soldiers.length; j++) {
          const b = soldiers[j], dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r; if (dx > m || dx < -m || dy > m || dy < -m) continue;
          const d = hyp(dx, dy) || 0.01; if (d < m) { const p = (m - d) * 0.3, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
        }
      }
    }

    // ---------------------------------------------------------- hooks
    return {
      start() { owed[0].length = owed[1].length = 0; for (const sp of spires) { sp.cd = 1; sp.heat = 0; sp.quiet = 99; sp.hitT = -99; sp.evT = -99; } towers.length = 0; soldiers.length = 0; up.arm = up.wpn = up.heal = 0; nid = 0; sid = 0; },
      wave(n) {
        if (sim.noSpawn) return;
        let made = 0; for (let lane = 0; lane < 2; lane++) made += spawnSquad(lane);
        if (made) sim.ev(['sob', n, made]);
      },
      // a hero who rejoins gets a new id: her share of each tower (refunds) and her repairs follow her
      rejoin(h, oldId) {
        for (const t of towers) {
          if (t.paid[oldId] !== undefined) { t.paid[h.id] = (t.paid[h.id] || 0) + t.paid[oldId]; delete t.paid[oldId]; }
          if (t.repBy === oldId) t.repBy = null;
        }
      },
      intent(h, m) {
        switch (m.k) {
          case 'build': doBuild(h, m); return true;
          case 'upTower': doUp(h, m); return true;
          case 'sellTower': doSell(h, m); return true;
          case 'repair': doRepair(h, m); return true;
          case 'soldier': doSoldier(h, m); return true;
        }
      },
      tick(dt) {
        scanTelegraphs();
        // each enemy's pace over the last tick, for the brazier's lead (towerAct caps the lead, so a burrow or a knock never throws it far off)
        if (dt > 0) for (const e of sim.enemies) { if (e.lx !== undefined) { e.lvx = (e.x - e.lx) / dt; e.lvy = (e.y - e.ly) / dt; } e.lx = e.x; e.ly = e.y; }
        quiet[0] = quiet[1] = true; if (soldiers.length) for (const e of sim.enemies) if (!e.dead && !e.def.inert && e.lane < 2) quiet[e.lane] = false;
        for (const sp of spires) spireTick(sp, dt);
        for (let i = 0; i < towers.length; i++) {
          const t = towers[i];
          if (t.rubble) { if (sim.time >= t.rubbleAt) { towers.splice(i, 1); i--; sim.ev(['twx', t.id, Math.round(t.x), Math.round(t.y)]); } continue; }
          towerAct(t, dt); solid(t);
        }
        for (let i = 0; i < soldiers.length; i++) { const s = soldiers[i]; if (s.dead) { soldiers.splice(i, 1); i--; continue; } soldierStep(s, dt); }
        if (soldiers.length > 1) separate();
      },
      snapshot(s) {
        s.tw = towers.map(t => [t.id, t.ki, t.rank, Math.round(t.x), Math.round(t.y), Math.round(t.hp), t.max, (t.rubble ? 1 : 0) | (t.buildT > 0 ? 2 : 0) | (t.upT > 0 ? 4 : 0) | (t.shield > 0 ? 8 : 0) | (t.repBy ? 16 : 0), t.rubble ? Math.ceil(t.base * TUNE.rebuild) : t.inv]);
        s.sp = spires.map(sp => (sim.time - sp.hitT < 0.25 ? 1 : 0) | (sp.quiet < 1 ? 2 : 0));
        s.sd = soldiers.map(o => [o.id, o.ti, Math.round(o.x), Math.round(o.y), Math.round(o.face * 10), Math.max(1, Math.round(o.hp / o.max * 100)), (o.flash > 0 ? 1 : 0) | (o.moving ? 2 : 0) | (o.ur << 2) | (o.charging ? 256 : 0), o.lane]);
      },
      props(p) {
        const vis = []; for (const t of towers) if (!t.rubble) vis.push([Math.round(t.x), Math.round(t.y), TOWER[t.kind].sight[t.rank - 1]]);
        for (const v of sim.extraVis) vis.push(v);
        if (vis.length) p.vis = vis;
        p.tcap = [liveCount(), cap()]; p.sdu = [up.arm, up.wpn, up.heal];
      },
    };
  });
})();
