// The Founding: later quests, host side. Five more quests that fill the hour run's thin stretches, each asking something new:
//   The Bounds       (Warden, waves 7-11)   escort: walk beside the Warden as she drives four stakes; raiders come for her at each
//   The First Mill   (Smith, 13-17)         defend a work site: the mill goes up only while a hero stands near, in three surges
//   The Winter Larder (Digger, 20-24)       gather: sacks lie in the far corners of the valley, walk up to each
//   The Last of the Stone (Steward, 22-26)  a choice: stone for a bell tower OR a ward-stone, carried to the one you pick
//   The Watch-Fires  (Warden, 24-28)        light and guard at night: a brand from the camp fire lights three far fires, and the dark comes to snuff them
// Each registers with D.addQuest (and three unique boons, all implemented below through the hooks), runs without pausing the waves, adds a
// piece to the camp or the valley (client-quests.js draws it) and ends by its own work: the core hands it out at its giver. Dynamic state goes out in
// `fds.qx` (snapshot), the world's fixed places in FoundingSim.QUESTX. Events all start with `qx`:
//   qxs i x y (stake driven) · qxh x y dmg (the Warden or a site is struck) · qxr kind (a raid arrives: 0 stake, 1 mill, 2 fire) x y
//   qxm (a mill surge) · qxg i x y got need (a sack gathered) · qxp pid (stone taken) · qxd site got need x y (stone laid) · qxc site (the choice is made)
//   qxf i 1|0 x y (a watch-fire lit or snuffed) · qxw (wave-start gift: kind 0 meal, 1 bell, 2 mill) · qxe x y (embers) · qxb pid (cornerstone)
// Intent: none of its own (the core's `carry` key lights a fire with a brand and takes a stone from the pile).
(function () {
  'use strict';
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot, PI = Math.PI, TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const HEARTH = M.P.hearth;

  // ---------------------------------------------------------------- the places (checked by tools/founding-quests-test.js: off the lanes, the wild camps, the chain's ground and the secrets; reachable on the 40 px grid)
  const X = FS.QUESTX = {
    START: [2640, 3600],                                                   // the Warden sets out from the hall
    STAKES: [[2701, 3505], [2364, 3274], [2050, 3412], [1880, 3600]],       // the west plain, out from the camp
    MILL: [1520, 3420],
    SHED: [3060, 4380],                                                    // the larder's shed, at the camp's south edge by the spring
    LARDER: [[5172, 1112], [2990, 1058], [472, 1728], [612, 2942], [2120, 1840], [4770, 1910], [4420, 840], [2380, 4560]],
    PILE: [1140, 4376],                                                     // the quarry
    BELL: [2260, 3580], WARD: [2840, 3580],
    FIRES: [[3080, 1400], [1720, 2330], [4642, 802]],
  };
  const T = X.TUNE = {
    stakes: { hp: [150, 190, 230, 270], speed: 70, near: 175, drive: 6, foe: 150, raid: [[3, 0], [4, 2], [5, 2], [6, 3]], slow: 0.85, slowR: 130 },
    mill: { secs: 80, hp: [420, 520, 620, 720], staffR: 380, surge: [0.15, 0.48, 0.8], gold: 5, r: 38 },
    larder: { need: [4, 5, 6, 6], pickR: 38, meal: 0.3 },
    choice: { need: [2, 3, 3, 4], extra: 1, siteR: 95, pickR: 90, shield: 30, shieldT: 10, ward: 0.25 },
    fires: { chan: 1.4, brand: 10, hp: [110, 140, 170, 200], raids: 2, mend: 3, mendR: 240, lightR: 250, reach: 105, delay: [8, 6] },
    cnt: [0.6, 0.85, 1.1, 1.35],   // raiders by party size
  };

  // ---------------------------------------------------------------- the quests and their boons
  D.addQuest({ id: 'stakes', name: 'The Bounds', giver: 'The Warden', offerWave: 7, deadlineWave: 11, gold: 12, xp: 70,
    text: 'The Warden means to mark where the camp\'s ground begins, so every wanderer knows it. Walk beside her from stake to stake, and keep the hungry things off her while each one is driven in.',
    done: 'The stakes stand: hungry things that cross the bounds slow to a crawl.', missed: 'The bounds go unmarked.',
    boons: ['countin', 'fencepost', 'headcount'] }, [
    { id: 'countin', name: 'Count Them In', text: 'Allies close beside you take a little less damage.' },
    { id: 'fencepost', name: 'Fence-Post', text: 'Stand still a moment and your hits land harder until you move again.' },
    { id: 'headcount', name: 'Headcount', text: 'The more allies stand close, the harder you hit.' },
  ]);
  D.addQuest({ id: 'mill', name: 'The First Mill', giver: 'The Smith', offerWave: 13, deadlineWave: 17, gold: 12, xp: 75,
    text: 'The Smith is raising a mill on the western plain, where the wind never stops. The sails go up only while someone is there to hold the frame, and the hungry things will come for the builders in surges.',
    done: 'The mill turns, and the flour sells: every hero earns a few gold at the start of each wave.', missed: 'The plain stays bare.',
    boons: ['gearing', 'grindstone', 'windfall'] }, [
    { id: 'gearing', name: 'Gearing', text: 'Casting a different skill each time speeds your attacks, four steps high. Repeat one and the wheel runs down.' },
    { id: 'grindstone', name: 'Grindstone', text: 'Enemies that are slowed, rooted or stunned take more from you.' },
    { id: 'windfall', name: 'Windfall', text: 'Now and then a skill you cast costs you nothing: its charge comes straight back.' },
  ]);
  D.addQuest({ id: 'larder', name: 'The Winter Larder', giver: 'The Digger', offerWave: 20, deadlineWave: 24, gold: 12, xp: 85,
    text: 'The Digger wants roots, grain and dried fruit laid by before the long dark. The sacks lie scattered in the far corners of the valley, well away from the roads. Walk up to each one to gather it.',
    done: 'The larder is full: at the start of every wave each hero eats and is mended by a third.', missed: 'The larder stays bare.',
    boons: ['forager', 'ironroots', 'hearty'] }, [
    { id: 'forager', name: 'Forager', text: 'Every kill you land heals you a little.' },
    { id: 'ironroots', name: 'Iron Roots', text: 'Stuns and roots on you wear off twice as fast.' },
    { id: 'hearty', name: 'Hearty Stew', text: 'More health, and a slow mend that never stops.' },
  ]);
  D.addQuest({ id: 'choice', name: 'The Last of the Stone', giver: 'The Steward', offerWave: 22, deadlineWave: 26, gold: 12, xp: 90,
    text: 'There is stone for one thing, not two. The Warden wants a bell tower to call the town in; the Smith wants a ward-stone to shield the camp. Carry the stone from the quarry to the one you choose. The first to be finished is the one that stands.',
    done: 'The stone is raised as you chose: the bell shields every hero at each wave\'s start, or the ward-stone turns a quarter of every blow the camp takes.', missed: 'The stone lies unused.',
    boons: ['tithe', 'tolling', 'cornerstone'] }, [
    { id: 'tithe', name: 'Founder\'s Tithe', text: 'You earn a quarter more gold.' },
    { id: 'tolling', name: 'Tolling', text: 'Your ultimate rings out and staggers the enemies around you.' },
    { id: 'cornerstone', name: 'Cornerstone', text: 'Once a wave, the first time you drop under half health you are mended and shielded.' },
  ]);
  D.addQuest({ id: 'watchfires', name: 'The Watch-Fires', giver: 'The Warden', offerWave: 24, deadlineWave: 28, gold: 12, xp: 95,
    text: 'Three fires must burn on the far rises before the last night, so the Warden can see what comes. Light a brand at a camp fire, carry it to each, and keep them lit: things out in the dark will come to snuff them.',
    done: 'The watch-fires burn: they light the dark, and those who stand beside one are mended.', missed: 'The far rises stay dark.',
    boons: ['unshaken', 'emberward', 'nighteyes'] }, [
    { id: 'unshaken', name: 'Unshaken', text: 'In the glow of the Hearth, a lit post, a watch-fire or your own brand you cannot be stunned, slowed or rooted.' },
    { id: 'emberward', name: 'Ember Ward', text: 'When you are struck, embers burst round you and burn what stands close. Every few seconds.' },
    { id: 'nighteyes', name: 'Night-Eyes', text: 'You see what hides in the dark near you, and strike it harder.' },
  ]);
  const IDS = ['stakes', 'mill', 'larder', 'choice', 'watchfires'];

  // ---------------------------------------------------------------- the module
  (FS.mods = FS.mods || []).push(sim => {
    if (!IDS.every(id => sim.q[id])) return null;   // (a sim made before the quests registered)
    sim.extraVis = sim.extraVis || [];
    const live = {}, done = {}, raiders = new Set();
    const S = { stakes: null, mill: null, larder: null, choice: null, fires: null, bell: 0, ward: 0, meal: 0, mills: 0, slow: 0, lit: 0 };
    const st = h => h._qb || (h._qb = { gear: 0, last: '', gt: -99, ew: -99, cs: -1 });
    const N = () => clamp(sim.scaleN(), 1, 4);
    const byN = a => a[N() - 1];
    const cnt = base => Math.max(1, Math.round(base * T.cnt[N() - 1]));
    const alive = () => sim.heroes.filter(h => !h.dead);
    const near = (x, y, R) => { for (const h of sim.heroes) if (!h.dead && hyp(h.x - x, h.y - y) < R) return true; return false; };
    const ev = a => sim.ev(a);
    const rd = v => Math.round(v);
    // a quest's raiders are as strong as its place in the story asks, never weaker for a party that got there early: quests keep their own
    // pace (2026-10-31), so the wave they used to start at is the floor (waveAs also sets their blows, sim.js resolveAtk)
    const waveOf = qid => Math.max(1, sim.wave, (D.QUESTS[qid] && D.QUESTS[qid].offerWave) || 1);
    const hpMul = qid => D.hpScale(waveOf(qid));
    const dropVis = v => { const i = sim.extraVis.indexOf(v); if (i >= 0) sim.extraVis.splice(i, 1); };

    // ---------------------------------------------------------- raiders: ordinary kinds off the lanes, set on one thing
    const RMOD = {
      update(e, dt) {
        const r = e.qr; if (!r) return;
        if (e.stun > 0 || e.stag > 0) { e.atk = null; return; }
        if (e.atk) { e.atk.t += dt; if (e.atk.t >= e.atk.dur) sim.resolveAtk(e); return; }
        if ((e.tgtT -= dt) <= 0) { e.tgtT = 0.3; e.tgt = pick(e, r); }
        const t = e.tgt; if (!t) return;
        const atk = e.def.atk, gap = hyp(t.x - e.x, t.y - e.y) - e.r - (t.r || 0), range = atk.range || atk.reach;
        if (gap > range) {
          if (e.rootT > 0) return;
          if (sim.lineClear(e.x, e.y, t.x, t.y, 8)) sim.stepToward(e, t.x, t.y, dt); else sim.runnerStep(e, t, dt);
          if (e.stuck > 1.2) { e.stuck = 0; e.rp = null; }
        } else {
          e.face += angDiff(e.face, Math.atan2(t.y - e.y, t.x - e.x)) * Math.min(1, dt * 10);
          if (e.acd <= 0 && e.blind <= 0) sim.startAtk(e, t);
        }
      },
    };
    const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
    function pick(e, r) {
      let hero = null, hd = r.aggro || 150;
      for (const h of sim.heroes) if (!h.dead) { const d = hyp(h.x - e.x, h.y - e.y); if (d < hd) { hd = d; hero = h; } }
      if (hero) return hero;
      const o = r.obj; if (o && !o.dead && o.hp > 0) return o;
      return sim.nearestHeroTo(e.x, e.y, 1200);
    }
    // a spot about `d` out from (cx, cy), roughly in the direction `ang` (random within `spread`), on walkable ground
    function spotAround(cx, cy, d0, d1, ang, spread) {
      for (let k = 0; k < 24; k++) {
        const a = ang + (sim.rand() - 0.5) * 2 * spread, d = d0 + sim.rand() * (d1 - d0), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (M.walkable(x, y, 14) && !M.laneAt(x, y)) return [x, y];
      }
      return sim.nearestWalkable(cx + Math.cos(ang) * d1, cy + Math.sin(ang) * d1);
    }
    function raid(list, cx, cy, ang, spread, obj, qid, kindTag) {
      const P = spotAround(cx, cy, 380, 480, ang, spread); let n = 0;
      for (const [kind, c] of list) for (let i = 0; i < c; i++) {
        const def = D.ENEMIES[kind]; if (!def) continue;
        const x = P[0] + (sim.rand() - 0.5) * 70, y = P[1] + (sim.rand() - 0.5) * 70, p = M.walkable(x, y, 12) ? [x, y] : P;
        const e = sim.spawnAt(kind, p[0], p[1], RMOD, { hp: def.hp * hpMul(qid), tier: Math.min(3, Math.max(sim.tier, D.tierOf(waveOf(qid)))), face: Math.atan2(cy - p[1], cx - p[0]) });
        e.qr = { obj, qid, aggro: 150 }; e.waveAs = waveOf(qid); e.speed *= 0.95; raiders.add(e); n++;
      }
      ev(['qxr', kindTag, rd(P[0]), rd(P[1])]);
      return n;
    }
    function dismiss(qid) {
      for (const e of raiders) if (e.qr && e.qr.qid === qid) { if (!e.dead) { e.dead = true; ev(['d', e.id, rd(e.x), rd(e.y), 0, 0, 0, 0]); } raiders.delete(e); }
    }
    function hurtThing(o, dmg, e) {
      if (o.dead) return; o.hp -= dmg; o.hitT = sim.time; ev(['qxh', rd(o.x), rd(o.y - 14), rd(dmg)]);
      if (o.hp <= 0) { o.hp = 0; o.dead = true; if (o.onDie) o.onDie(); }
    }
    const thing = (x, y, r, hp, onDie) => { const o = { tk: 'ally', x, y, r, hp, max: hp, dead: false, hitT: -99, onDie, hurt(dmg, e) { hurtThing(o, dmg, e); } }; return o; };

    // ---------------------------------------------------------- 1. The Bounds: the Warden walks, and drives four stakes
    function beginStakes() {
      const w = thing(X.START[0], X.START[1], 22, byN(T.stakes.hp), () => sim.failQuest('stakes'));
      w.face = 0; w.moving = false;
      S.stakes = { w, i: 0, driven: S.stakes ? S.stakes.driven : 0, ph: 'walk', t: 0, near: false, havePath: false, raided: false };
      sim.extraVis.push(S.stakes.vis = [rd(w.x), rd(w.y), 300]);
    }
    function updateStakes(dt) {
      const s = S.stakes; if (!s || s.w.dead) return; const w = s.w;
      s.near = near(w.x, w.y, T.stakes.near);
      s.vis[0] = rd(w.x); s.vis[1] = rd(w.y);
      const goal = X.STAKES[s.i]; if (!goal) return;
      if (s.ph === 'walk') {
        w.moving = false;
        if (!s.near) return;
        if (!s.havePath) { sim.pathTo(w, goal[0], goal[1]); s.havePath = true; }
        const px = w.x, py = w.y;
        if (w.path) { w.moving = sim.walkPath(w, T.stakes.speed, dt); if (hyp(w.x - px, w.y - py) > 0.01) w.face = Math.atan2(w.y - py, w.x - px); }
        if (!w.path || hyp(w.x - goal[0], w.y - goal[1]) < 26) { w.path = null; s.havePath = false; s.ph = 'drive'; s.t = 0; s.raided = false; }
        return;
      }
      // driving the stake: a raid comes for her as she starts, and the stake only goes in with her friends close and the way clear
      w.moving = false;
      if (!s.raided) {
        s.raided = true;
        const R = T.stakes.raid[s.i], away = Math.atan2(goal[1] - HEARTH[1], goal[0] - HEARTH[0]);
        raid([['ashling', cnt(R[0])], ['streak', R[1] ? cnt(R[1]) : 0]], goal[0], goal[1], away, 1.1, w, 'stakes', 0);
      }
      if (s.near && !sim.enemyNear(w.x, w.y, T.stakes.foe)) s.t += dt;
      if (s.t >= T.stakes.drive) {
        s.driven++; ev(['qxs', s.i, goal[0], goal[1]]); s.i++; s.ph = 'walk'; s.t = 0;
        sim.q.stakes.prog = s.driven / X.STAKES.length;
        if (s.driven >= X.STAKES.length) sim.finishQuest('stakes');
      } else sim.q.stakes.prog = (s.driven + s.t / T.stakes.drive) / X.STAKES.length;
    }

    // ---------------------------------------------------------- 2. The First Mill: hold the frame while the sails go up
    function beginMill() {
      const o = thing(X.MILL[0], X.MILL[1], T.mill.r, byN(T.mill.hp), () => sim.failQuest('mill'));
      S.mill = { o, prog: 0, surge: 0 };
      sim.extraVis.push(S.mill.vis = [X.MILL[0], X.MILL[1], 280]);
    }
    function updateMill(dt) {
      const m = S.mill; if (!m || m.o.dead) return;
      m.staffed = near(X.MILL[0], X.MILL[1], T.mill.staffR);
      if (m.staffed) m.prog = Math.min(1, m.prog + dt / T.mill.secs);
      sim.q.mill.prog = m.prog;
      while (m.surge < T.mill.surge.length && m.prog >= T.mill.surge[m.surge]) {
        const k = m.surge++, ang = Math.PI + (sim.rand() - 0.5) * 1.2;   // out of the west
        const L = [[['ashling', 5], ['streak', 3]], [['ashling', 6], ['slagback', 2], ['streak', 3]], [['ashling', 6], ['streak', 4], [N() > 1 ? 'brute' : 'slagback', 1]]][k];
        raid(L.map(([kd, c]) => [kd, kd === 'brute' ? c : cnt(c)]), X.MILL[0], X.MILL[1], ang, 0.9, m.o, 'mill', 1);
        ev(['qxm', k]);
      }
      if (m.prog >= 1) sim.finishQuest('mill');
    }

    // ---------------------------------------------------------- 3. The Winter Larder: walk up to each sack
    function beginLarder() {
      S.larder = { got: X.LARDER.map(() => 0), n: 0, need: byN(T.larder.need) };
    }
    function updateLarder(dt) {
      const l = S.larder; if (!l) return;
      for (let i = 0; i < X.LARDER.length; i++) {
        if (l.got[i]) continue; const p = X.LARDER[i];
        for (const h of sim.heroes) if (!h.dead && hyp(h.x - p[0], h.y - p[1]) < T.larder.pickR) {
          l.got[i] = 1; l.n++; ev(['qxg', i, p[0], p[1], l.n, l.need]); sim.q.larder.prog = l.n / l.need; break;
        }
      }
      if (l.n >= l.need) sim.finishQuest('larder');
    }

    // ---------------------------------------------------------- 4. The Last of the Stone: one pile, two sites, one stands
    function beginChoice() {
      const need = byN(T.choice.need);
      S.choice = { need, left: need + T.choice.extra, a: 0, b: 0, chosen: 0 };
    }
    const stonesAvail = () => { const c = S.choice; let n = c.left; for (const h of sim.heroes) if (h.carry === 'stone' && h.carryQ === 'choice') n++; for (const d of sim.drops) if (d.q === 'choice' && !d.gone) n++; return n; };
    function updateChoice(dt) {
      const c = S.choice; if (!c || c.chosen) return;
      for (const h of sim.heroes) {
        if (h.dead || h.carry !== 'stone' || h.carryQ !== 'choice') continue;
        for (const [site, p] of [[1, X.BELL], [2, X.WARD]]) {
          if (hyp(h.x - p[0], h.y - p[1]) > T.choice.siteR) continue;
          h.carry = null; h.carryQ = null; h.dirty = true;
          if (site === 1) c.a++; else c.b++;
          ev(['qxd', site, site === 1 ? c.a : c.b, c.need, p[0], p[1]]);
          if ((site === 1 ? c.a : c.b) >= c.need) { c.chosen = site; ev(['qxc', site]); sim.finishQuest('choice'); return; }
          break;
        }
      }
      sim.q.choice.prog = Math.max(c.a, c.b) / c.need;
      if (Math.max(c.a, c.b) + stonesAvail() < c.need) sim.failQuest('choice');
    }

    // ---------------------------------------------------------- 5. The Watch-Fires: a brand lights each, and the dark comes to snuff it
    function beginFires() {
      const hp = byN(T.fires.hp);
      S.fires = { list: X.FIRES.map((p, i) => { const o = thing(p[0], p[1], 30, hp, null); o.lit = false; o.raids = 0; o.raidAt = -1; o.i = i; o.onDie = () => { o.lit = false; o.hp = 0; o.dead = false; if (o.vis) { dropVis(o.vis); o.vis = null; } ev(['qxf', i, 0, p[0], p[1]]); }; return o; }), done: false };
    }
    function updateFires(dt) {
      const F = S.fires; if (!F || F.done) return;
      for (const h of sim.heroes) {   // a brand held against an unlit fire for a moment lights it
        const c = h.chan; if (!c || c.kind !== 'wf') continue;
        if (c.t >= c.need) {
          h.chan = null; const f = c.fire;
          if (!f.lit) {
            f.lit = true; f.hp = f.max; f.dead = false; if (h.brand < 9000) h.brand = Math.max(0, h.brand - T.fires.brand); h.dirty = true;
            ev(['qxf', f.i, 1, f.x, f.y]); if (!f.vis) sim.extraVis.push(f.vis = [f.x, f.y, 330]);
            if (f.raids < T.fires.raids) f.raidAt = sim.time + T.fires.delay[0] + sim.rand() * T.fires.delay[1];
          }
        }
      }
      let lit = 0;
      for (const f of F.list) {
        if (f.lit) lit++;
        if (f.lit && f.raidAt > 0 && sim.time >= f.raidAt) {
          f.raidAt = -1; f.raids++;
          const away = Math.atan2(f.y - HEARTH[1], f.x - HEARTH[0]);
          const dark = sim.night > 0.3 ? 'stalker' : 'ashling';
          raid([[dark, cnt(3)], ['ashling', cnt(2)]], f.x, f.y, away, 1.3, f, 'watchfires', 2);
        }
      }
      sim.q.watchfires.prog = lit / F.list.length;
      if (lit >= F.list.length) { F.done = true; sim.finishQuest('watchfires'); }
    }

    // ---------------------------------------------------------- start and end of a quest (the core offers and judges; we follow its state)
    const BEGIN = { stakes: beginStakes, mill: beginMill, larder: beginLarder, choice: beginChoice, watchfires: beginFires };
    function finish(id, state) {
      dismiss(id);
      if (id === 'stakes' && S.stakes) dropVis(S.stakes.vis);
      if (id === 'mill' && S.mill) dropVis(S.mill.vis);
      if (id === 'choice') {
        for (const h of sim.heroes) if (h.carryQ === 'choice') { h.carry = null; h.carryQ = null; h.dirty = true; }
        for (const d of sim.drops) if (d.q === 'choice') d.gone = true; sim.drops = sim.drops.filter(d => d.q !== 'choice');
      }
      if (id === 'watchfires' && S.fires) { for (const f of S.fires.list) { f.raidAt = -1; if (state === 2) f.lit = true; } for (const h of sim.heroes) if (h.chan && h.chan.kind === 'wf') h.chan = null; if (state !== 2) for (const f of S.fires.list) if (f.vis) { dropVis(f.vis); f.vis = null; } }
    }
    function sync() {
      for (const id of IDS) {
        const q = sim.q[id];
        if (q.st === 1 && !live[id]) { live[id] = true; BEGIN[id](); }
        else if (q.st !== 1 && live[id]) { live[id] = false; finish(id, q.st); }
      }
    }

    // ---------------------------------------------------------- lights: the lit fires, the mill's lamp, the Hearth-side bell
    {
      const orig = sim.lights.bind(sim);
      sim.lights = function () {
        const cached = sim._lt === sim.tickN && sim._lights.length, L = orig();
        if (!cached || L._qx !== sim.tickN) {
          L._qx = sim.tickN;
          if (S.fires) for (const f of S.fires.list) if (f.lit) L.push([f.x, f.y, T.fires.lightR]);
          if (done.mill) L.push([X.MILL[0], X.MILL[1] - 40, 150]);
        }
        return L;
      };
    }
    // is a point in a standing light (not a hero's own lamp): the Hearth, a lit post, a watch-fire, the beacon
    const inFireLight = h => {
      if (hyp(h.x - HEARTH[0], h.y - HEARTH[1]) < 380 || h.brand > 0 || sim.inPostLight(h.x, h.y)) return true;
      if (S.fires) for (const f of S.fires.list) if (f.lit && hyp(h.x - f.x, h.y - f.y) < T.fires.lightR) return true;
      return sim.beaconLit && hyp(h.x - M.P.beacon[0], h.y - M.P.beacon[1]) < 460;
    };

    // ---------------------------------------------------------- boons through the sim's own methods
    {
      const wrap = (name, fn) => { const orig = sim[name].bind(sim); sim[name] = (...a) => fn(orig, ...a); };
      wrap('release', (orig, h, s, a, pw) => {
        orig(h, s, a, pw);
        if (h.dead || pw !== 1) return;
        const b = h.boons; if (!b.gearing && !b.windfall && !b.tolling) return;
        if (b.gearing) { const q = st(h); q.gear = q.last && q.last !== s ? Math.min(4, q.gear + 1) : (q.last === s ? 0 : 1); q.last = s; q.gt = sim.time; sim.recalc(h); }
        if (b.windfall && sim.rand() < 0.16) { const i = 'qwer'.indexOf(s); if (i >= 0 && h.ch[i] < h.chMax[i]) { h.ch[i]++; if (h.ch[i] >= h.chMax[i]) h.cdT[i] = 0; h.dirty = true; } }
        if (b.tolling && s === 'r') { for (const e of sim.inCircle(h.x, h.y, 280)) sim.stunE(e, 0.8, h); ev(['qxe', rd(h.x), rd(h.y)]); }
      });
    }

    return {
      start() { for (const id of IDS) live[id] = false; },
      tick(dt) {
        sync();
        if (live.stakes) updateStakes(dt);
        if (live.mill) updateMill(dt);
        if (live.larder) updateLarder(dt);
        if (live.choice) updateChoice(dt);
        if (live.watchfires) updateFires(dt);
        // standing effects of what is built
        if (done.stakes) for (const e of sim.enemies) { if (e.dead || e.under || e.def.boss) continue; if (hyp(e.x - HEARTH[0], e.y - HEARTH[1]) < M.CAMP_R + T.stakes.slowR) sim.slowE(e, T.stakes.slow, 0.25); }
        if (done.watchfires && S.fires) for (const h of sim.heroes) { if (h.dead || h.hp >= h.max) continue; for (const f of S.fires.list) if (hyp(h.x - f.x, h.y - f.y) < T.fires.mendR) { h.hp = Math.min(h.max, h.hp + T.fires.mend * dt); break; } }
        if (S.ward && sim.camp.hp > 0) { const c = sim.camp; if (S.campHp !== undefined && c.hp < S.campHp) c.hp = Math.min(c.max, c.hp + (S.campHp - c.hp) * T.choice.ward); S.campHp = c.hp; }
        if (S.raidCleanup === undefined && sim.wave >= 29) { S.raidCleanup = 1; for (const id of IDS) dismiss(id); }
        // boons that need the clock
        for (const h of sim.heroes) {
          if (h.dead) continue; const b = h.boons; if (!b || !Object.keys(b).length) continue; const q = st(h);
          if (b.ironroots) { if (h.stun > 0) h.stun -= dt; if (h.rootT > 0) h.rootT -= dt; }
          if (b.unshaken && inFireLight(h)) { h.stun = 0; h.rootT = 0; h.slowT = 0; }
          if (b.gearing && q.gear > 0 && sim.time - q.gt > 5) { q.gear = 0; q.last = ''; sim.recalc(h); }
          if (b.cornerstone && q.cs !== sim.wave && h.hp < h.max * 0.5) { q.cs = sim.wave; sim.heal(h, h.max * 0.2, { healMul: 1 }); h.shield = Math.max(h.shield, 30); h.shieldT = 6; h.dirty = true; ev(['qxb', h.id]); }
          if (b.nighteyes) for (const e of sim.enemies) if (!e.dead && e.def.hide && hyp(e.x - h.x, e.y - h.y) < 600) e.reveal = Math.max(e.reveal || 0, sim.time + 0.4);
        }
      },
      wave(n) {
        if (done.larder) for (const h of alive()) { sim.heal(h, h.max * T.larder.meal, { healMul: 1 }); ev(['qxw', 0, h.id]); }
        if (S.bell) { for (const h of alive()) { h.shield = Math.max(h.shield, T.choice.shield); h.shieldT = Math.max(h.shieldT, T.choice.shieldT); h.dirty = true; } ev(['qxw', 1, 0]); }
        if (done.mill) for (const h of sim.heroes) { h.gold += T.mill.gold; if (sim.stats[h.id]) sim.stats[h.id].gold += T.mill.gold; h.dirty = true; ev(['qxw', 2, h.id]); }
      },
      // where G would act (mirrors intent below), for the G over it when a hero stands close
      useAt(h) {
        if (h.dead) return null;
        if (live.watchfires && S.fires && h.brand > 0) for (const f of S.fires.list) if (!f.lit && hyp(h.x - f.x, h.y - f.y) < T.fires.reach) return [f.x, f.y];
        if (live.choice && S.choice && !S.choice.chosen && !h.carry && S.choice.left > 0 && hyp(h.x - X.PILE[0], h.y - X.PILE[1]) < T.choice.pickR) return X.PILE;
        return null;
      },
      // the core's `carry` key: a brand against an unlit fire starts the lighting; no brand and a free pair of hands takes a stone from the pile
      intent(h, m) {
        if (m.k !== 'carry' || h.dead) return;
        if (live.watchfires && S.fires && h.brand > 0) {
          for (const f of S.fires.list) if (!f.lit && hyp(h.x - f.x, h.y - f.y) < T.fires.reach) { h.chan = { kind: 'wf', t: 0, need: T.fires.chan, fire: f }; h.path = null; return true; }
        }
        if (live.choice && S.choice && !S.choice.chosen && !h.carry && S.choice.left > 0 && hyp(h.x - X.PILE[0], h.y - X.PILE[1]) < T.choice.pickR) {
          S.choice.left--; h.carry = 'stone'; h.carryQ = 'choice'; h.dirty = true; ev(['pk', h.id, 4]); ev(['qxp', h.id]); return true;
        }
      },
      questDone(id) {
        done[id] = true;
        if (id === 'choice' && S.choice) { if (S.choice.chosen === 1) S.bell = 1; else if (S.choice.chosen === 2) { S.ward = 1; S.campHp = sim.camp.hp; } }
      },
      // the Warden's loss and the sites' damage are told by events; here the numbers the client draws from
      snapshot(s) {
        const qx = {};
        if (S.stakes) { const k = S.stakes, w = k.w; qx.st = [k.driven, rd(w.x), rd(w.y), rd(w.hp), w.max, k.ph === 'drive' ? 1 : 0, k.near ? 1 : 0, k.i, Math.round(k.t * 10) / 10, w.moving ? 1 : 0, Math.round((w.face || 0) * 10) / 10]; }
        if (S.mill) { const m = S.mill; qx.ml = [Math.round(m.prog * 1000) / 1000, rd(m.o.hp), m.o.max, m.staffed ? 1 : 0, m.surge]; }
        if (S.larder) { const l = S.larder; qx.lg = [l.got.reduce((a, v, i) => a | (v << i), 0), l.n, l.need]; }
        if (S.choice) { const c = S.choice; qx.ch = [c.a, c.b, c.left, c.chosen, c.need]; }
        if (S.fires) qx.wf = S.fires.list.map(f => [f.lit ? 1 : 0, rd(f.hp), f.max]);
        if (S.bell) qx.bell = 1; if (S.ward) qx.ward = 1;
        if (Object.keys(qx).length) s.qx = qx;
      },
      // stat boons (the ones that never change with the moment live here; the rest are in tick / hit / hurt / kill)
      recalc(h, s) {
        const b = h.boons; if (!b) return;
        if (b.hearty) { s.hp += Math.round(h.K.hp * 0.12); s.reg += 0.7; }
        if (b.tithe) s.gold += 0.25;
        if (b.gearing && h._qb && h._qb.gear) s.as += 0.04 * h._qb.gear;
      },
      hit(a, e, h, o) {
        if (!h || !h.boons) return a;
        const b = h.boons;
        if (b.grindstone && (e.slowT > 0 || e.rootT > 0 || e.stun > 0)) a *= 1.12;
        if (b.fencepost && h.stillT >= 1.5) a *= 1.12;
        if (b.headcount) { let n = 0; for (const o2 of sim.heroes) if (o2 !== h && !o2.dead && hyp(o2.x - h.x, o2.y - h.y) < 400) n++; if (n) a *= 1 + 0.03 * Math.min(3, n); }
        if (b.nighteyes && e.def.hide) a *= 1.15;
        return a;
      },
      hurt(a, h, src) {
        for (const o of sim.heroes) if (o !== h && !o.dead && o.boons && o.boons.countin && hyp(o.x - h.x, o.y - h.y) < 350) { a *= 0.92; break; }
        const b = h.boons;
        if (b && b.emberward) { const q = st(h); if (sim.time - q.ew > 4) { q.ew = sim.time; for (const e of sim.inCircle(h.x, h.y, 150)) sim.burnE(e, 6, 3, h); ev(['qxe', rd(h.x), rd(h.y)]); } }
        return a;
      },
      kill(e, killer) {
        if (killer && killer.tk === 'hero' && killer.boons && killer.boons.forager && !killer.dead) sim.heal(killer, killer.max * 0.02, { healMul: 1 }, true);
        if (e.qr) raiders.delete(e);
      },
    };
  });
})();
