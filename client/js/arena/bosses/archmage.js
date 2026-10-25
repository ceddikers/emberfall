// Boss VII: Azerath, the Sunken Archmage, Master of the Seven Circles — "The Drowned Tower". The rotating lab.
// Second set (docs/plans/2026-10-set-2-bosses.md). The tower's floor is seven circles of old spellwork under the water: a middle
// one, a ring around it, a ring beyond that, and four sigils (Fire north, Frost east, Lightning south, the Void west). The
// question is always: which element is it, and who holds the rune? He floats in the middle of the floor and never walks.
//   THE RUNE PAIR: Rune Mark puts a rune on two heroes (two different elements; both shown on them, and a link joins them).
//     The spell that follows (named in the upcoming feed: Cinder / Rime / Storm / Rift Rune) is of one of the two elements, and the
//     element says whether the pair must stand together or apart. The Mark also lights the sigil of that element on the floor until
//     the spell lands, and the clients draw each rune by its rule (a closed ring for frost and lightning, a broken one for fire and void):
//       Cinder Rune (fire):      a ring of fire on each bearer. APART: if they stand close when it is about to land, the runes
//                                react, and a second circle of flame blooms between them (shown a moment ahead).
//       Rime Rune (frost):       one shared blow, a blue circle halfway between the two bearers, for everyone to stand in. TOGETHER.
//       Storm Rune (lightning):  a bolt runs from one bearer to the other and burns whoever stands in its line. TOGETHER makes it
//                                short enough to be harmless.
//       Rift Rune (void):        a ring of void round each bearer, a quiet middle in it. APART (the same reaction as fire).
//   Act I, Fire (100% → 78%): Arcane Burst, Arcane Lance (tankbuster), Pyre Rings (two of the three floor rings burn, one after
//     the other; the third is never painted), Cinder Rune.
//   Act II, Frost (78% → 55%): Ice Lances (lines out of him through some heroes), Rime Rune, Cinder Rune again.
//   The Binding (the seam, opens Act III): the sigils wake and he calls elementals from the middle of the floor. Each follows
//     the shield, slowly, and must be led into the sigil of its own element and held there a moment (a random element order,
//     one at a time; one left unbound blasts the room). He can be hit all the while, and the shield is walking the whole time.
//   Act III, Lightning (55% → 32%): Leaping Bolt (a bolt that jumps from hero to the hero nearest them), Storm Rune, Sigil Flare.
//   Act IV, Void (32% → 14%): Void Rifts (rifts open where heroes stand, and again where they went), Rift Rune, Sigil Flare, the
//     older moves returning mixed.
//   Sigil Flare: two neighbouring sigils light and blast together with the lens between them (Convergence on a small scale, so
//     the finale is a shape the party has met). Hard: the opposite pair follows a moment later, so the party crosses the middle.
//   Act V, Convergence (14% → dead): all four sigils light together; each circle's telegraph is its own element, and where two
//     circles overlap a reaction fills the lens between them. The floor between the sigils, out near the wall, is clear. Then
//     the closing passes until he falls or the tide comes in.
// Acts use PUSH: a party that reaches a gate early cuts the rest of the act and moves on (no wall in this fight).
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Counterspell: the last spell's areas (at most three) come again, thrown to the far side of the room, a few seconds later.
//   Rune Swap:    after the Rune Mark, the runes jump to two other heroes (the spell has not changed; the new bearers get about six
//                 seconds from the jump to the lock). The Mark, the Swap, the spell and the Counterspell still run as one sequence; the
//                 Counterspell now waits a breath longer after the spell, and echoes at most three shapes.
//   Arcane Mark:  one hero's own elemental rises where they stood: a shared blow on that spot, for everyone.
// Hard also shuffles the order of each act's middle sets each pull, lays a third elemental into the Binding's pulses, and a
// fifth jump into the Leaping Bolt.

// Pure helpers shared with the clients (arena-view / main.js move the live shape of a shape that joins two heroes)
const AZ = {
  ELS: ['fire', 'frost', 'bolt', 'void'],
  NAME: { fire: 'Fire', frost: 'Frost', bolt: 'Lightning', void: 'the Void' },
  COL: { fire: '#ff6a2a', frost: '#7fd8ff', bolt: '#ffe45a', void: '#a05aff' },
  RULE: { fire: 'split', frost: 'pair', bolt: 'pair', void: 'split' },
  SPELL: { fire: 'Cinder Rune', frost: 'Rime Rune', bolt: 'Storm Rune', void: 'Rift Rune' },
  TAG: { fire: 'azFire', frost: 'azFrost', bolt: 'azBolt', void: 'azVoid' },
  // the sigil circles on the floor: where the elementals are led, and the centres of the Convergence
  SIG: { fire: [0, -270], frost: [270, 0], bolt: [0, 270], void: [-270, 0] },
  // live shape of a link between two heroes: 'mid' (a stack halfway between them) or 'beam' (a line from one to the other,
  // shortened at both ends so the two of them stand outside it)
  linkShape(k, a, b, s) {
    if (k === 'mid') { s.x = (a.x + b.x) / 2; s.y = (a.y + b.y) / 2; return s; }
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    s.x = a.x + Math.cos(ang) * 45; s.y = a.y + Math.sin(ang) * 45; s.angle = ang; s.len = Math.max(0, d - 90);
    return s;
  },
};

const AZERATH = {
  id: 'archmage', name: 'Azerath', title: 'Master of the Seven Circles',
  hp: { normal: 5800000, hard: 6350000 },
  autoDmg: { normal: 2000, hard: 1850 },
  enrage: { normal: 600, hard: 605 },   // the cast starts here and lands 8 s later
  enrageName: 'The Tide Rises',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'tower' },
  gates: [0.78, 0.55, 0.32, 0.14],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                         // reach a gate early and he moves on (fight.js course: push)

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const { ELS, RULE, SPELL, TAG, SIG, NAME } = AZ;
    const dmg = {
      burst: H ? 17000 : 20200, lance: H ? 18600 : 18600, pyre: H ? 17000 : 22300, fire: H ? 16500 : 23900, react: H ? 19500 : 21500, frost: H ? 43200 : 49600,
      beam: H ? 24300 : 21500, void: H ? 16500 : 19100, voidSelf: H ? 8800 : 11400, ice: H ? 25200 : 22300, bolt: H ? 19800 : 17500, rift: H ? 21600 : 19100,
      conv: H ? 27900 : 24600, lens: H ? 18000 : 15900, counter: H ? 17500 : 19100, mark: H ? 43200 : 49600, pulse: H ? 16200 : 14300, surge: H ? 21600 : 23900,
      elBite: H ? 1500 : 1300, flare: H ? 16000 : 15500, flens: H ? 13500 : 13000,
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    // Hard draws the order of an act's middle sets fresh each pull (the opening and the last sets stay put)
    const mix = (head, mid, tail) => [...head, ...(H ? f.shuffle(mid) : mid), ...tail];

    // shared with the bots and the host's view (raid-host.js)
    f.runePair = null;     // { a, b, ea, eb, el, rule: 'pair' | 'split', on: 1 }: who carries the runes, and what the coming spell wants of them
    f.binding = null;      // { circles: [{ el, x, y, r }], items: [{ add, el, t0, inT, done }] }: the elementals to be led to their sigils
    // no Time Stop (fight.js pauseBoss) while a Rune Pair is held or an elemental is still to be bound: both run on their own clock
    f.noPause = () => !!f.runePair || !!(f.binding && f.binding.items.some(i => !i.done));

    // --- shapes that follow two heroes (the shape moves on the host here and on every client: AZ.linkShape) ------------
    const links = [];
    f.ticker(() => {
      for (let i = links.length - 1; i >= 0; i--) {
        const L = links[i];
        if (!f.mechs.has(L.m.id)) { links.splice(i, 1); continue; }
        if (f.t >= L.m.resolveAt - L.lock) continue;
        const a = live(L.a), b = live(L.b);
        if (a && b) AZ.linkShape(L.k, a, b, L.m.shape);
      }
    });
    const link = (m, a, b, k, lock) => { links.push({ m, a, b, k, lock }); f.emit({ t: 'azlink', id: m.id, a, b, k, lock }); };

    // --- what the last spell covered, for Counterspell (Hard) ----------------------------------------------------------
    let mem = null;
    const memo = m => {
      if (!H) return;
      if (!mem || f.t - mem.at > 1.6) mem = { at: f.t, list: [] };
      if (m.shape.kind === 'rect' && m.shape.len < 40) return;   // (a bolt between two heroes standing together is nothing to copy)
      mem.at = f.t; mem.list.push({ shape: Object.assign({}, m.shape), dmg: m.dmg, tag: m.tag, type: m.type });
    };
    const rec = (shape, delay, dm, extra = {}) => { const m = f.aoe(shape, delay, dm, Object.assign({}, extra, { onResolve: () => memo(m) })); return m; };

    // --- the core moves --------------------------------------------------------------------------------------------
    const burst = () => {
      const d = f.ct(4.4);
      f.cast('Arcane Burst', d, 'burst');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.burst, hidden: true, tag: 'azBurst' });
    };
    const lance = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.4);
      f.cast('Arcane Lance', d, 'lance');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 380, arc: 1.3, angle: B.facing }, delay: d, dmg: dmg.lance, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
    };
    // Pyre Rings: the floor's three rings (the middle disc, the ring round it, the outer ring); two burn one after the other
    const RINGS = [{ kind: 'circle', x: 0, y: 0, r: 170 }, { kind: 'donut', x: 0, y: 0, r: 350, r2: 170 }, { kind: 'donut', x: 0, y: 0, r: 590, r2: 350 }];
    const pyre = () => {
      const d = f.ct(4.6), gap = f.ct(2.8);
      const safe = f.pick([0, 1, 1, 2, 2]);
      const order = [0, 1, 2].filter(i => i !== safe);
      if (f.rng() < 0.5) order.reverse();
      f.cast('Pyre Rings', d, 'pyre');
      order.forEach((ri, j) => f.aoe(RINGS[ri], d + j * gap, dmg.pyre, { tag: 'azFire', ddown: true }));
    };
    // Ice Lances: a line out of him through each of two heroes (three on Hard), following them until a moment before it goes
    const iceLances = () => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()).slice(0, H ? 3 : 2);
      if (!pool.length) return;
      const d = f.ct(4.8);
      f.cast('Ice Lances', d, 'lances');
      for (const p of pool) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(p.y - B.y, p.x - B.x), len: 620, w: 110 }, delay: d, dmg: dmg.ice, tag: 'azFrost', ddown: true, aimFromBoss: p.id, lockAt: 1.2,
          onResolve: () => memo(m) });
      }
    };
    // Leaping Bolt: a circle on one hero, then on the hero nearest them, and on, a heartbeat apart
    const leapingBolt = () => {
      const al = f.alive(); if (!al.length) return;
      const d0 = f.ct(4.6), step = f.ct(0.95);
      f.cast('Leaping Bolt', d0, 'chain');
      let cur = f.pick(f.nonTanks().length ? f.nonTanks() : al);
      const seq = [];
      while (cur && seq.length < (H ? 5 : 4)) {
        seq.push(cur);
        let best = null, bd = 520;
        for (const p of al) { if (seq.some(q => q.id === p.id)) continue; const dd = Math.hypot(p.x - cur.x, p.y - cur.y); if (dd < bd) { bd = dd; best = p; } }
        cur = best;
      }
      seq.forEach((p, i) => {
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 105 }, delay: d0 + i * step, dmg: dmg.bolt, follow: p.id, lockAt: 1.0, tag: 'azBolt', onResolve: () => memo(m) });
      });
    };
    // Void Rifts: rifts open where heroes stand now, and again a moment later where they went
    const voidRifts = () => {
      const d = f.ct(4.4), n = H ? 4 : 3;
      f.cast('Void Rifts', d, 'rifts');
      for (const p of f.shuffle(f.alive()).slice(0, n)) rec({ kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 120 }, d, dmg.rift, { tag: 'azVoid', ddown: true });
      f.afterKeep(f.ct(2.5), () => {
        for (const p of f.shuffle(f.alive()).slice(0, n)) rec({ kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 120 }, f.ct(2.6), dmg.rift, { tag: 'azVoid', ddown: true });
      });
    };

    // --- the Rune Pair -----------------------------------------------------------------------------------------------
    const setPair = (a, b, ea, eb, el, hold) => {
      f.runePair = { a, b, ea, eb, el, rule: RULE[el], on: 1 };
      f.clearTethers();
      if (b != null) f.tether(a, b, hold, { kind: 'short', len: 99999, dmg: 0, tag: 'rune:' + ea + ':' + eb + ':' + el });   // (el: the rune that is live, for the clients' drawing)
    };
    let holdUntil = 0;
    // hold: seconds from now until the spell has landed (the link on the two stays until then)
    const runeMark = (el, hold) => {
      f.cast('Rune Mark', f.ct(2.4), 'rune');
      holdUntil = f.t + hold;
      f.emit({ t: 'roomev', k: 'live', el, dur: hold });   // the sigil of the coming spell's element lights until it lands (archmage-art.js towerLife)
      const pool = f.nonTanks().length >= 2 ? f.nonTanks() : f.alive();
      if (!pool.length) { f.runePair = null; return; }
      const pr = f.shuffle(pool);
      const other = f.pick(ELS.filter(e => e !== el));
      const ea = f.rng() < 0.5 ? el : other, eb = ea === el ? other : el;
      setPair(pr[0].id, pr[1] ? pr[1].id : null, ea, eb, el, hold);
    };
    // Rune Swap (Hard): the runes jump to two other heroes
    const runeSwap = () => {
      const rp = f.runePair; if (!rp) return;
      const d = f.ct(2.2);
      f.cast('Rune Swap', d, 'swap');
      f.afterKeep(d, () => {
        const cur = f.runePair; if (!cur) return;
        let pool = f.nonTanks().filter(p => p.id !== cur.a && p.id !== cur.b);
        if (pool.length < 2) pool = f.alive().filter(p => p.id !== cur.a && p.id !== cur.b).concat(f.alive().filter(p => p.id === cur.a || p.id === cur.b));
        const pr = f.shuffle(pool);
        if (pr.length < 2) return;
        setPair(pr[0].id, pr[1].id, cur.ea, cur.eb, cur.el, Math.max(1, holdUntil - f.t));
      });
    };
    // two heroes too close when a split spell is about to land: a circle of their two runes' flame or void blooms between them
    const reactCheck = d => {
      const rp = f.runePair; if (!rp || rp.b == null) return;
      f.afterKeep(d - 1.45, () => {
        const a = live(rp.a), b = live(rp.b);
        if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 250) return;
        f.aoe({ kind: 'circle', x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2), r: 165 }, 1.35, dmg.react, { tag: 'azReact:' + rp.ea + ':' + rp.eb });
      });
    };
    // the spell: one of the two runes' elements, and the rule that goes with it
    const runeSpell = el => {
      const rp = f.runePair;
      const d = f.ct(4.6);
      f.cast(SPELL[el], d, el);
      if (!rp) return;
      const A = live(rp.a), Bp = rp.b != null ? live(rp.b) : null;
      const ids = [rp.a, rp.b].filter(x => x != null);
      let ok = () => true;
      if (el === 'fire') {
        for (const id of ids) {
          const p = live(id); if (!p) continue;
          const m = f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 125 }, delay: d, dmg: dmg.fire, follow: id, lockAt: 1.1, tag: 'azFire', onResolve: () => memo(m) });
        }
        reactCheck(d);
        ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 250; };
      } else if (el === 'void') {
        for (const id of ids) {
          const p = live(id); if (!p) continue;
          const m = f.mech({ type: 'aoe', shape: { kind: 'donut', x: p.x, y: p.y, r: 255, r2: 90 }, delay: d, dmg: dmg.void, follow: id, lockAt: 1.1, tag: 'azVoid', onResolve: () => memo(m) });
          f.afterKeep(d + 0.03, () => { const q = live(id); if (q) f.damagePlayer(q, dmg.voidSelf, { kind: 'azVoid', n: SPELL.void }); });
        }
        reactCheck(d);
        ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 250; };
      } else if (el === 'frost') {
        const n = f.alive().length;
        const sx = A && Bp ? (A.x + Bp.x) / 2 : A ? A.x : 0, sy = A && Bp ? (A.y + Bp.y) / 2 : A ? A.y : 0;
        const m = f.mech({ type: 'stack', shape: { kind: 'circle', x: sx, y: sy, r: 150 }, delay: d, dmg: dmg.frost * Math.min(n, 4) / 4, need: H ? n : Math.max(1, n - 1), lockAt: 1.2, tag: 'azFrost', onResolve: () => memo(m) });
        if (A && Bp) link(m, rp.a, rp.b, 'mid', 1.2);
      } else {
        // lightning: a bolt from one bearer to the other. Standing together makes it too short to reach anyone
        if (A && Bp) {
          const m = f.mech({ type: 'aoe', shape: AZ.linkShape('beam', A, Bp, { kind: 'rect', x: 0, y: 0, angle: 0, len: 0, w: 100 }), delay: d, dmg: dmg.beam, lockAt: 1.2, tag: 'azBeam', onResolve: () => memo(m) });
          link(m, rp.a, rp.b, 'beam', 1.2);
          ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) <= 170; };
        }
      }
      // the pair is done a moment after the spell lands; a pair that stood the way the element wanted counts as a soak for both
      f.afterKeep(d + 0.05, () => {
        if (ok()) for (const id of ids) { const st = f.stats[id]; if (st && live(id)) st.soaked++; }
        f.runePair = null; f.clearTethers();
      });
    };
    // a Rune Mark and the spell that follows it (the spell's name is laid out now, so the upcoming feed already says which element it is)
    const runeSet = (gap, el, o = {}) => {
      // (a Swap leaves the new bearers about six seconds from the jump to the lock: the spell begins 5.4 s after the Swap's cast does)
      const swap = H && o.swap, g2 = swap ? 5.4 : 7.4, hold = (swap ? 4.2 : 0) + g2 + f.ct(4.6) + 0.35;
      return [[gap, () => runeMark(el, hold), 'Rune Mark'], swap && [4.2, runeSwap, 'Rune Swap'], [g2, () => runeSpell(el), SPELL[el]]].filter(Boolean);
    };

    // --- the Binding (the seam): lead each elemental to its own sigil ------------------------------------------------
    const BIND_R = 135, BIND_T = 2.3, FUSE = 17;
    const bindStart = () => {
      f.cast('The Binding', f.ct(3), 'bind');
      f.binding = { circles: ELS.map(e => ({ el: e, x: SIG[e][0], y: SIG[e][1], r: BIND_R })), items: [] };
      f.emit({ t: 'roomev', k: 'bind', els: [], dur: 60 });
      // the pulses of the working: circles on the floor all through it (one under a hero), so nobody stands idle
      for (let i = 0; i < 5; i++) f.afterKeep(f.ct(3.5) + i * 4.4, () => {
        const tgt = nonTank();
        const at = [];
        if (tgt) at.push([tgt.x, tgt.y]);
        while (at.length < 2) { const a = f.rng() * TAU, r = Math.sqrt(f.rng()) * 430; at.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (const [x, y] of at) f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 105 }, f.ct(2.8), dmg.pulse, { tag: 'azPulse' });
      });
    };
    const bindEls = () => (f.binding ? f.binding.items.filter(i => !i.done).map(i => i.el) : []);
    const call = el => {
      f.cast('Call of the Circle', f.ct(1.8), 'bind');
      if (!f.binding) f.binding = { circles: ELS.map(e => ({ el: e, x: SIG[e][0], y: SIG[e][1], r: BIND_R })), items: [] };
      const ang = f.rng() * TAU, tank = f.tank();
      const a = f.spawnAdd({ kind: 'az' + el, x: Math.round(Math.cos(ang) * 110), y: Math.round(Math.sin(ang) * 110), hp: 9000000, r: 30, speed: 110, bite: dmg.elBite, biteEvery: 2.4, inert: true });
      if (tank) a.fix = { id: tank.id, until: 1e9 };
      f.binding.items.push({ add: a, el, t0: f.t, inT: 0, done: false, warned: false });
      f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
    };
    // the elementals walk after the shield (or whoever is nearest, if it has fallen), bite, and are bound when one has stood in its own sigil long enough
    f.ticker(dt => {
      const bd = f.binding; if (!bd) return;
      const al = f.alive();
      for (const it of bd.items) {
        if (it.done) continue;
        const a = it.add;
        if (!f.adds.has(a.id)) { it.done = true; f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 }); continue; }
        const lead = f.tank();
        let tgt = lead || null;
        if (!tgt) { let nd = Infinity; for (const p of al) { const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < nd) { nd = d; tgt = p; } } }
        if (tgt) {
          const dx = tgt.x - a.x, dy = tgt.y - a.y, d = Math.hypot(dx, dy);
          a.facing = Math.atan2(dy, dx);
          if (d > a.r + 42) { const step = Math.min(d - (a.r + 42), a.speed * dt); a.x += dx / d * step; a.y += dy / d * step; }
          else if (f.t >= a.nextBite) { a.nextBite = f.t + a.biteEvery; f.emit({ t: 'addev', k: 'bite', id: a.id, tg: tgt.id }); f.damagePlayer(tgt, a.bite, { kind: 'bite' }); }
          f.addsDirty = true;
        }
        const c = bd.circles.find(q => q.el === it.el);
        if (Math.hypot(a.x - c.x, a.y - c.y) < c.r - 12) it.inT += dt; else it.inT = Math.max(0, it.inT - dt * 0.5);
        if (it.inT >= BIND_T) {
          it.done = true;
          for (const p of al) if (Math.hypot(p.x - c.x, p.y - c.y) < 300) f.stats[p.id].soaked++;
          f.emit({ t: 'roomev', k: 'bound', el: it.el, dur: 1.6 });
          f.killAdd(a);
          f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
        } else if (f.t - it.t0 >= FUSE) {
          it.done = true;
          f.emit({ t: 'roomev', k: 'surge', el: it.el, dur: 1.2 });
          f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.5, dmg: dmg.surge, hidden: true, tag: 'azSurge' });
          f.killAdd(a);
          f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
        } else if (f.t - it.t0 >= FUSE - 2.4 && !it.warned) { it.warned = true; f.emit({ t: 'addev', k: 'fury', x: Math.round(a.x), y: Math.round(a.y) }); }
      }
    });

    // --- Convergence: every sigil lights, each in its own element, and a reaction fills the lens where two meet ------------
    const SR = 225;
    const N = ELS.length;
    // the lens where two neighbouring sigils overlap: a reaction of their two elements
    const lens = (i, delay, dm) => {
      const e = ELS[i], e2 = ELS[(i + 1) % N], A = SIG[e], C = SIG[e2];
      const mx = (A[0] + C[0]) / 2, my = (A[1] + C[1]) / 2, ang = Math.atan2(C[1] - A[1], C[0] - A[0]) + Math.PI / 2;
      f.aoe({ kind: 'rect', x: Math.round(mx - Math.cos(ang) * 125), y: Math.round(my - Math.sin(ang) * 125), angle: ang, len: 250, w: 74 }, delay, dm, { tag: 'azReact:' + e + ':' + e2 });
    };
    const convergence = () => {
      const d = f.ct(7.2), group = new Set();
      f.cast('Convergence', d, 'conv');
      f.emit({ t: 'roomev', k: 'conv', dur: d + 0.6 });
      for (const e of ELS) f.aoe({ kind: 'circle', x: SIG[e][0], y: SIG[e][1], r: SR }, d, dmg.conv, { tag: TAG[e], group });
      ELS.forEach((e, i) => lens(i, d, dmg.lens));
    };
    // Sigil Flare: two neighbouring sigils light and blast together, with the lens between them. Convergence on a small scale, so the
    // finale is a shape the party has met. Hard: the opposite pair follows, so the half of the floor that was safe is the next one lit
    const sigilFlare = () => {
      const d = f.ct(4.8), gap = f.ct(3), k = f.pick([0, 1, 2, 3]);
      f.cast('Sigil Flare', d, 'conv');   // (the staff lifts as for Convergence)
      const pair = (i, delay) => {
        const group = new Set();
        f.afterKeep(delay === d ? 0 : d, () => f.emit({ t: 'roomev', k: 'flare', els: [ELS[i], ELS[(i + 1) % N]], dur: (delay === d ? d : gap) + 0.6 }));   // (the two sigils glow until they go)
        for (const j of [i, (i + 1) % N]) f.aoe({ kind: 'circle', x: SIG[ELS[j]][0], y: SIG[ELS[j]][1], r: SR }, delay, dmg.flare, { tag: TAG[ELS[j]], group });
        lens(i, delay, dmg.flens);
      };
      pair(k, d);
      if (H) pair((k + 2) % N, d + gap);
    };

    // --- Hard only -----------------------------------------------------------------------------------------------------
    // Counterspell: what the last spell covered comes again, thrown through the middle to the far side of the room
    const counterspell = () => {
      const d = f.ct(3), dd = f.ct(5.2);
      f.cast('Counterspell', d, 'counter');
      const m = mem && f.t - mem.at < 30 ? mem : null;
      if (!m) return;
      const flip = s => { const o = Object.assign({}, s); o.x = -s.x; o.y = -s.y; if (s.angle != null) o.angle = s.angle + Math.PI; return o; };
      const group = new Set(), n = f.alive().length;
      for (const e of m.list.slice(0, 3)) {   // (at most three shapes come back)
        if (e.type === 'stack') f.mech({ type: 'stack', shape: flip(e.shape), delay: dd, dmg: e.dmg * 0.9, need: n, tag: e.tag, color: 'echo' });   // (color: only the drawing reads it: an echo of the last spell)
        else f.aoe(flip(e.shape), dd, dmg.counter, { tag: e.tag, group, color: 'echo' });
      }
    };
    // Arcane Mark: one hero's own elemental rises where they stood: a blow for everyone to share, on that spot
    const arcaneMark = () => {
      const t = nonTank(); if (!t) return;
      const el = f.pick(ELS), d = f.ct(5.6), n = f.alive().length;
      f.cast('Arcane Mark', f.ct(2.4), 'mark');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: Math.round(t.x), y: Math.round(t.y), r: 130 }, delay: d, dmg: dmg.mark * Math.min(n, 4) / 4, need: n, tag: 'azMark:' + el });
    };

    // --- the acts ------------------------------------------------------------------------------------------------------
    const runeS = (gap, el, o) => S(...runeSet(gap, el, o));
    const withCounter = (steps, after = 6.2) => S(...steps, H && [after, counterspell, 'Counterspell']);

    // I. Fire
    const fire1 = from => f.course({
      until: 0.78, push: true,
      sets: mix([S([4, burst, 'Arcane Burst']), S([12, pyre, 'Pyre Rings']), S([12, lance, 'Arcane Lance'])], [
        withCounter(runeSet(12, 'fire')),
        S([12, pyre, 'Pyre Rings']),
        S([12, lance, 'Arcane Lance'], [7.5, burst, 'Arcane Burst']),
      ], [
        runeS(12, 'fire', { swap: true }),
        S([12, burst, 'Arcane Burst']),
      ]),
      closing: [[10, lance, 'Arcane Lance'], [10, burst, 'Arcane Burst'], [10, pyre, 'Pyre Rings']],   // (the last set ends on a Burst, so no Burst opens the closing passes)
      next: frost1,
    }, from);

    // II. Frost
    const frost1 = from => f.course({
      until: 0.55, push: true,
      sets: mix([S([4, iceLances, 'Ice Lances']), S([12, lance, 'Arcane Lance'])], [
        runeS(12, 'frost'),
        S([12, pyre, 'Pyre Rings'], [8, iceLances, 'Ice Lances']),
        H ? S([12, arcaneMark, 'Arcane Mark']) : S([12, burst, 'Arcane Burst']),
      ], [
        withCounter(runeSet(12, f.pick(['frost', 'fire', 'frost']), { swap: true })),
        S([12, lance, 'Arcane Lance'], [7.5, pyre, 'Pyre Rings']),
      ]),
      closing: [[10, burst, 'Arcane Burst'], [10, lance, 'Arcane Lance'], [10, iceLances, 'Ice Lances']],
      next: bound,
    }, from);

    // The Binding, then III. Lightning
    const els = f.shuffle(ELS).slice(0, 3);
    const bound = from => f.course({
      until: 0.32, push: true,
      sets: mix([
        S([2, bindStart, 'The Binding'], [5, () => call(els[0]), 'Call of the Circle'], [8, () => call(els[1]), 'Call of the Circle'], [8, () => call(els[2]), 'Call of the Circle']),
        S([10, burst, 'Arcane Burst']),
      ], [
        S([12, leapingBolt, 'Leaping Bolt']),
        runeS(12, 'bolt'),
        S([12, lance, 'Arcane Lance'], [7.5, leapingBolt, 'Leaping Bolt']),
      ], [
        withCounter(runeSet(12, f.pick(['bolt', 'frost', 'bolt']), { swap: true })),
        S([12, burst, 'Arcane Burst'], [8, sigilFlare, 'Sigil Flare']),
      ]),
      closing: [[10, burst, 'Arcane Burst'], [10, lance, 'Arcane Lance'], [10, leapingBolt, 'Leaping Bolt']],
      next: void1,
    }, from);

    // IV. Void
    const void1 = from => f.course({
      until: 0.14, push: true,
      sets: mix([S([4, voidRifts, 'Void Rifts']), S([12, lance, 'Arcane Lance'])], [
        runeS(12, 'void'),
        S([12, leapingBolt, 'Leaping Bolt'], [8, voidRifts, 'Void Rifts']),
        S([12, burst, 'Arcane Burst'], [8, sigilFlare, 'Sigil Flare']),
      ], [
        withCounter(runeSet(12, f.pick(['void', 'fire', 'void']), { swap: true })),
        S([12, burst, 'Arcane Burst']),
      ]),
      closing: [[10, lance, 'Arcane Lance'], [10, burst, 'Arcane Burst'], [10, voidRifts, 'Void Rifts']],   // (as in Act I: the last set ends on a Burst)
      next: finale,
    }, from);

    // V. Convergence: no gate after it; the closing passes run until he falls
    const finale = from => f.course({
      sets: [
        S([4, convergence, 'Convergence']),
        S([13, lance, 'Arcane Lance']),
        runeS(12, f.pick(ELS)),
        !H && S([12, burst, 'Arcane Burst']),   // (Hard's long rune chains carry the finale's time: no plain Burst between them, so the script ends with the usual slack before the enrage)
        withCounter(runeSet(12, f.pick(ELS), { swap: true })),
        S([13, convergence, 'Convergence']),
        S([13, H ? arcaneMark : iceLances, H ? 'Arcane Mark' : 'Ice Lances'], [7, leapingBolt, 'Leaping Bolt']),
      ].filter(Boolean),
      closing: [[10, burst, 'Arcane Burst'], [10, convergence, 'Convergence'], [10, lance, 'Arcane Lance']],
      ramp: 0.08,
    }, from);

    fire1(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.pyre())
    f.moves = { burst, lance, pyre, iceLances, leapingBolt, voidRifts, runeMark, runeSpell, runeSwap, bindStart, call, convergence, sigilFlare, counterspell, arcaneMark };
  },
};

if (typeof module !== 'undefined') module.exports = { AZERATH, AZ };
