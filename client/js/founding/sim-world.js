// The Founding: the valley's loose things, host side. Items lie where they fell, and seven waystones let the party cross the bigger map.
//
// Tossing and swapping (the pack). Intent `toss slot [uid]`: the item in that pack slot is set on the ground at the hero's feet (dragging it out of the bar over the world). Intent `swap a b`: two pack slots trade places (an empty one is a move).
//
// Ground drops. Every item a boss, an elite, a wild leader or a wild grunt drops (and each of the secret chain's found-only pieces)
// lies at the death spot until a hero right-clicks it (walking past takes nothing: with many on the ground you take the one you mean). Intent `pick id`:
// taken at once from close by, else the hero walks over and takes it on arrival (any other order on the way calls that off). Only a hero with a free pack slot takes it;
// a hero-made item (D.ITEM[id].hero) is taken only by that class. A drop lasts `TUNE.life` seconds, blinks for the last
// `TUNE.blink`, then fades and goes; a chain piece (`keep`) never fades. No gold stands in for a full pack: it just stays.
//   props.wd   [[id, itemId, x, y, expiresAt (run clock, 0 = never)], ...]
//   events     wdrop id x y itemId · wpk id pid (taken) · wfull pid (a quiet "your pack is full") · wgone id
//   sim.worldDrop(x, y, itemId, { keep }) the one way a module puts an item on the ground (headless pilots set `autoLoot` and skip it)
//
// Waystones. Seven standing stones (FoundingMap.WAYS holds the places; this file the names). A stone is dark until a hero stands
// beside it; then it is lit for the whole party, for the rest of the run. Intent `wtravel to`: -1 the camp (the Recall, as ever),
// 0..6 a lit waystone, from anywhere. The same four second channel as the Recall, broken by a hit, a move, a cast or a stun; the
// shared recall cooldown after a Recall to the camp, a short one after a waystone.
//   props.wy   bit mask of the lit stones
//   events     wsl idx pid (lit) · the travel itself uses the Recall's own rc events (rc pid 1 began, 0 broken, 2 x y arrived)

(function () {
  'use strict';
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot;

  const TUNE = {
    life: 240,       // seconds an item lies on the ground
    blink: 20,       // it blinks for the last of them
    fade: 1.6,       // and fades over this long (no longer pick-up-able once the life is over)
    reachR: 52,      // a right-click from this close takes it at once (and a hero sent to it takes it on reaching this close)
    cap: 48,         // most loose items at once (the oldest ordinary one goes first)
    touchR: 84,      // standing this close lights a waystone
    secs: 4,         // the channel (the Recall's)
    wayCd: 15,       // the wait after arriving at a waystone (a Recall to the camp keeps its own)
    arrive: [48, 32], // a traveller steps out this far from the stone
    near: 130,       // "already here": no travelling to the stone you stand beside
  };
  const NAMES = [
    ['junction', 'Junction Stone', 'Where the two roads meet, a stone\'s throw from the camp.'],
    ['gate', 'Gate Stone', 'Below the gate on the North Road.'],
    ['ford', 'Ford Stone', 'On the west bank, before the East Ford.'],
    ['beacon', 'Beacon Stone', 'At the foot of the beacon hill.'],
    ['ruins', 'Ruin Stone', 'On the west plain, among the old walls.'],
    ['woods', 'Wood Stone', 'In the north-east pines.'],
    ['delta', 'Delta Stone', 'Where the river spreads out in the south.'],
  ];
  const WAYS = NAMES.map((n, i) => ({ id: n[0], name: n[1], note: n[2], x: (M.WAYS || [])[i] ? M.WAYS[i][0] : 0, y: (M.WAYS || [])[i] ? M.WAYS[i][1] : 0 }));
  FS.WORLD = { TUNE, WAYS };

  (FS.mods = FS.mods || []).push(sim => {
    const drops = [];
    let did = 0, mask = 0;
    sim.groundDrops = drops;
    sim.waystoneMask = () => mask;
    sim.waystones = WAYS;
    const takeable = (h, d) => { const it = D.ITEM[d.item]; return !!it && (!it.hero || it.hero === h.hero); };
    const live = d => d.keep || sim.time < d.exp;
    const CALL_OFF = new Set(['move', 'attack', 'stop', 'talk', 'cast', 'fetch', 'recall', 'wtravel', 'dash']);   // orders that call off a walk to an item

    // ------------------------------------------------------------ the ground
    // an item lies at (x, y), nudged onto walkable ground and spread round others already there
    sim.worldDrop = function (x, y, id, o) {
      o = o || {};
      let it = D.ITEM[id]; if (!it) return null;
      // an item made for a class that is not in this party would lie there for ever: a plain one of the same rarity takes its place (not one a hero set down)
      if (!o.exact && it.hero && !it.sec && !sim.heroes.some(h => h.hero === it.hero)) {
        const pool = D.ITEMS.filter(i => i.rar === it.rar && !i.sec && (!i.hero || sim.heroes.some(h => h.hero === i.hero)));
        if (pool.length) it = pool[Math.floor(sim.rand() * pool.length)];
      }
      let n = 0; for (const d of drops) if (hyp(d.x - x, d.y - y) < 150) n++;
      let px = x, py = y;
      if (n > 0) { const a = n * 2.39996 + 0.7, r = 32 * Math.sqrt(n) + 4; px = x + Math.cos(a) * r; py = y + Math.sin(a) * r * 0.8; }   // (a sunflower spiral: the first lies on the spot, the rest fan out so each can be pointed at)
      if (!M.walkable(px, py, 8)) { const p = sim.nearestWalkable(px, py, 8); px = p[0]; py = p[1]; }
      const d = { id: ++did, item: it.id, x: Math.round(px), y: Math.round(py), keep: !!o.keep, exp: o.keep ? 0 : Math.round((sim.time + TUNE.life) * 10) / 10 };
      drops.push(d);
      if (drops.length > TUNE.cap) { const i = drops.findIndex(q => !q.keep && q !== d); if (i >= 0) { sim.ev(['wgone', drops[i].id]); drops.splice(i, 1); } }
      sim.ev(['wdrop', d.id, d.x, d.y, d.item]);
      return d;
    };
    function take(h, d, quiet) {
      if (!takeable(h, d)) return false;
      if (sim.freeSlot(h) < 0) { if (!quiet || sim.time - (h._wfull || -99) > 4) { h._wfull = sim.time; sim.ev(['wfull', h.id]); } return false; }
      sim.giveItem(h, d.item); h.dirty = true;
      drops.splice(drops.indexOf(d), 1);
      sim.ev(['dr', h.id, d.item]); sim.ev(['wpk', d.id, h.id]);
      return true;
    }

    // ------------------------------------------------------------ the waystones
    const litAt = i => !!(mask & (1 << i));
    function startTravel(h, to) {
      if (h.dead || sim.st !== 'live' || sim.ending || h.rcCd > 0 || h.stun > 0 || h.rcOn) return;
      if (!(to >= 0 && to < WAYS.length) || !litAt(to) || hyp(h.x - WAYS[to].x, h.y - WAYS[to].y) < TUNE.near) return;
      h.path = null; h.pending = null; h.target = null; h.cast = null;
      h.chan = { kind: 'recall', t: 0, need: TUNE.secs }; h.rcOn = true; h._wdest = to; h.dirty = true;
      sim.ev(['rc', h.id, 1]);
    }
    // the Recall's own arrival and cancel, with a destination
    const arrive0 = sim.recallArrive.bind(sim), cancel0 = sim.recallCancel.bind(sim), start0 = sim.startRecall.bind(sim);
    sim.recallArrive = function (h) {
      const to = h._wdest;
      if (to === undefined || to === null) { arrive0(h); return; }
      h._wdest = null; h.rcOn = false; h.rcCd = TUNE.wayCd; h.dirty = true;
      const W = WAYS[to], pt = sim.nearestWalkable(W.x + TUNE.arrive[0], W.y + TUNE.arrive[1]);
      h.x = pt[0]; h.y = pt[1]; h.path = null; h.target = null; h.pending = null;
      sim.ev(['rc', h.id, 2, Math.round(h.x), Math.round(h.y)]);
    };
    sim.recallCancel = function (h) { h._wdest = null; cancel0(h); };
    sim.startRecall = function (h) { if (!h.rcOn) h._wdest = null; start0(h); };

    return {
      drop(e) {   // sim.dropItem: the roll as ever (a hero's own pieces are rolled for the heroes in the party), but onto the ground
        const hs = sim.heroes.filter(h => !h.dead); if (!hs.length) return true;
        const w = D.dropWeights(sim.wave), tot = w.reduce((a, b) => a + b, 0);
        for (let k = 0; k < (e.def.drop || 1); k++) {
          let x = sim.rand() * tot, rar = 0; for (; rar < 4; rar++) { if (x < w[rar]) break; x -= w[rar]; }
          const h = hs[(sim.dropN++) % hs.length];
          const pool = D.ITEMS.filter(i => i.rar === rar && !i.sec && (!i.hero || i.hero === h.hero)), it = pool[Math.floor(sim.rand() * pool.length)];
          if (it) sim.worldDrop(e.x, e.y, it.id);
        }
        return true;
      },
      tick() {
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (!d.keep && sim.time >= d.exp + TUNE.fade) { sim.ev(['wgone', d.id]); drops.splice(i, 1); continue; }
          if (!live(d)) continue;
        }
        for (const h of sim.heroes) {   // a hero sent to an item by a right-click takes it on arrival
          if (!h._wpick) continue;
          const d = drops.find(q => q.id === h._wpick);
          if (!d || !live(d) || h.dead) { h._wpick = 0; continue; }
          if (hyp(h.x - d.x, h.y - d.y) <= TUNE.reachR) { h._wpick = 0; take(h, d, false); }
          else if (!h.path) h._wpick = 0;   // (stopped short: no way there)
        }
        if (mask !== (1 << WAYS.length) - 1) {
          for (let i = 0; i < WAYS.length; i++) {
            if (litAt(i)) continue;
            for (const h of sim.heroes) if (!h.dead && hyp(h.x - WAYS[i].x, h.y - WAYS[i].y) < TUNE.touchR) { mask |= 1 << i; sim.ev(['wsl', i, h.id]); break; }
          }
        }
      },
      intent(h, m) {
        if (h._wpick && CALL_OFF.has(m.k)) h._wpick = 0;
        if (m.k === 'pick') {
          const d = drops.find(q => q.id === m.id); if (!d || !live(d) || h.dead) return true;
          if (!takeable(h, d)) return true;
          if (hyp(h.x - d.x, h.y - d.y) <= TUNE.reachR) { take(h, d, false); return true; }
          if (sim.freeSlot(h) < 0) { sim.ev(['wfull', h.id]); return true; }
          h.target = null; h.pending = null; h.auto = true; h.chan = null; sim.pathTo(h, d.x, d.y); h._wpick = d.id;   // (taken on arrival: tick)
          return true;
        }
        if (m.k === 'toss') {
          const i = m.slot, x = Number.isInteger(i) && i >= 0 && i < h.items.length && h.items[i];
          if (!x || h.dead || (m.uid !== undefined && m.uid !== x.uid)) return true;
          if (!sim.worldDrop(h.x, h.y, x.id, { exact: true, keep: !!(D.ITEM[x.id] && D.ITEM[x.id].sec) })) return true;
          h.items[i] = null; sim.recalc(h); h.dirty = true;
          return true;
        }
        if (m.k === 'swap') {
          const a = m.a, b = m.b, n = h.items.length;
          if (h.dead || a === b || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n) return true;
          const t = h.items[a]; h.items[a] = h.items[b]; h.items[b] = t; h.dirty = true;
          return true;
        }
        if (m.k === 'wtravel') {
          const to = m.to;
          if (to === -1) sim.startRecall(h); else if (Number.isInteger(to)) startTravel(h, to);
          return true;
        }
      },
      props(p) {
        p.wy = mask;
        p.wd = drops.map(d => [d.id, d.item, d.x, d.y, d.exp]);
      },
    };
  });
})();
