// Boss XII: Caelum Vey, the Starborn — "The Crater". The calm, untouchable swordsman, and the finale of set 3.
// Last boss of set 3 (the Fallen Star, docs/plans/2026-10-set-3-pitches.md), so the hardest fight in the game. The star's chosen is
// calling down the meteor that has hung over every room of the set; the party fights him beneath its growing shadow.
// The question is always: where will he be next?
//   HE APPEARS BEFORE HE CUTS: every cut is foretold by a silver afterimage standing where he will be (roomev 'climgs:<n>'), and the
//     afterimages' order and facing show the cut, so a dance nobody has seen before can still be read.
//   THE SHADOW: the meteor's shadow is a dark disc round the half-buried star (roomev 'clshadow'). It grows every act, Starfall lands
//     only inside it, and in the last act it burns.
//   Act I, Descent (100% -> 76%): Glint (a dash cut to an afterimage at the end of a line), Eightfold Wake (eight afterimages round the
//     room, cut from one to the next), Cinder Crown (the tank's buster; a burning ring stays), Pinning Thrust (a lunge that drives the
//     tank to the wall), Grace Withdrawn (the whole party drops to 1 HP, never lethal) and Nightfall (everyone, a few seconds later).
//   Act II, Starfall (76% -> 52%): Anchored Wake (two of the afterimages form where heroes stand), Starfall (blue soaks fall inside the
//     shadow), the shadow grows.
//   The Starwyrm (52%, WALL): he lifts his blade and the constellations knot into a serpent of stars. It coils once round the room (a
//     moving red band), Embers of Heaven chip pieces off the half-buried star, and it rears on the rim and breathes Constellation Fall
//     across the floor: only the star's shadow is safe. The serpent unravels and the wall drops.
//   Act III, Ascendant (52% -> 18%, PUSH): the crater falls away to a circle of cloud above the meteor (the room becomes 'caelum:sky',
//     fight.js setForm). The Wake gains a second ring; Horizon Cut sweeps the whole room but for a gap that moves every time.
//   Act IV, The Sky Comes Down (18% -> dead, PUSH): the shadow covers most of the floor and burns; the last dance runs round what is clear.
// Every telegraph shows on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Mirrored Wake:        the dance runs twice, the second pass mirrored.
//   Second Coil:          the Starwyrm returns in Act III and dives along a painted line.
//   Chorus of the Fallen: once an act, afterimages of Corvane, Brannoc and Morrow-Oak join a dance, each with one of their own moves.
//   Dark Ember:           a hero carries a black ember; set down at the shadow's edge, it pushes the shadow back.
//   and a second Grace Withdrawn during a dance.
// Hard also draws the afterimage orders, the Starfall spots and the Starwyrm's side each pull.

const CAELUM = {
  id: 'caelum', name: 'Caelum Vey', title: 'the Starborn',
  hp: { normal: 5200000, hard: 5400000 },
  hardDmg: 1.24,   // (Hard's damage multiplier; fight.js default 1.25)
  autoDmg: { normal: 2600, hard: 2600 },
  enrage: { normal: 622, hard: 607 },   // the cast starts here and lands 8 s later (10:30 / 10:15)
  enrageName: 'The Sky Comes Down',
  vuln: 0.5,
  spawn: { x: 0, y: -300 },
  arena: { theme: 'crater' },
  // the second form (fight.js setForm 'sky'): the bar, the room and the music change with it (raid-ui.js reads forms)
  forms: { sky: { name: 'Caelum Vey, Ascendant', title: 'the Starborn' } },
  gates: [0.76, { f: 0.52, wall: 1 }, { f: 0.18, push: 1 }],

  // the half-buried star in the middle of the crater: a core and four shards broken off round it (with room to walk between),
  // all cover (Constellation Fall); only Embers of Heaven break them
  room(f) {
    f.addProp({ kind: 'starcore', x: 0, y: 0, r: 72, hp: 0, solid: true, cover: true, rubble: false });
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2;
      f.addProp({ kind: 'starshard', x: Math.round(Math.cos(a) * 160), y: Math.round(Math.sin(a) * 160), r: 38, hp: 1, solid: true, cover: true, i: k });
    }
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      glint: H ? 18800 : 20000, wake: H ? 17800 : 19800, crown: H ? 25000 : 26500, crownRing: H ? 2600 : 2900, thrust: H ? 22500 : 24000,
      pinSlam: H ? 8500 : 9500, night: H ? 4200 : 4400, star: H ? 8000 : 9000, starFail: H ? 11000 : 12000, starRain: H ? 5600 : 5900, ember: H ? 17500 : 20000,
      coil: H ? 19800 : 21000, constellation: H ? 60000 : 70000, horizon: H ? 25000 : 27000, burn: H ? 3000 : 3200,
      secondCoil: H ? 20000 : 0, chorus: H ? 19500 : 0, darkEmber: H ? 3000 : 0,
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    // how far a line from (x, y) along a runs before it meets the round wall
    const toWall = (x, y, a, R = ARENA.r) => { const dx = Math.cos(a), dy = Math.sin(a), b = x * dx + y * dy, c = x * x + y * y - R * R; return -b + Math.sqrt(Math.max(0, b * b - c)); };
    let imgN = 0, wyrmN = 0;
    const seg = (a, b, delay, o = {}) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 20) return null;
      return f.aoe({ kind: 'rect', x: Math.round(a.x), y: Math.round(a.y), angle: +Math.atan2(b.y - a.y, b.x - a.x).toFixed(3), len: Math.round(len), w: o.w || 100 }, delay, o.dmg ?? dmg.wake, { tag: o.tag || 'clWake' });
    };

    // --- the shadow ---------------------------------------------------------------------------------------------------------
    const shadow = { x: 0, y: 0, r: 150, burn: 0 };
    let burnZone = null;
    const setShadow = (r, burn) => {
      shadow.r = Math.round(r); if (burn != null) shadow.burn = burn ? 1 : 0;
      f.emit({ t: 'roomev', k: 'clshadow', x: shadow.x, y: shadow.y, r: shadow.r, burn: shadow.burn, dur: 9999 });
      if (shadow.burn) {
        if (burnZone) burnZone.end = f.t;
        burnZone = f.zone({ shape: { kind: 'circle', x: shadow.x, y: shadow.y, r: shadow.r }, dur: 9999, effect: 'burn', dmg: dmg.burn, tag: 'clShadowBurn' });
      }
    };
    f.room = { shadow };
    // a spot inside the shadow for a Starfall: clear of the star in the first form, and of the other spots
    const inShadow = (taken, minR) => {
      for (let k = 0; k < 40; k++) {
        const a = f.rng() * TAU, r = minR + f.rng() * Math.max(10, shadow.r - 55 - minR);
        const x = shadow.x + Math.cos(a) * r, y = shadow.y + Math.sin(a) * r;
        if (taken.every(q => Math.hypot(q.x - x, q.y - y) > 210)) return { x: Math.round(x), y: Math.round(y) };
      }
      return null;
    };

    // --- the afterimages ------------------------------------------------------------------------------------------------------
    // Glint: an afterimage at the end of a line toward a hero; the cut runs down the line and he is there
    const glint = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(2.6), a = Math.atan2(tgt.y - B.y, tgt.x - B.x), L = Math.max(150, Math.min(700, toWall(B.x, B.y, a) - 70));
      const from = { x: B.x, y: B.y }, end = { x: Math.round(B.x + Math.cos(a) * L), y: Math.round(B.y + Math.sin(a) * L) };
      f.cast('Glint', d, 'glint');
      hold(d + 0.3); B.lockFacing = true; B.facing = a;
      f.emit({ t: 'roomev', k: 'climgs:' + (++imgN), l: [[end.x, end.y, 1, +a.toFixed(2)]], dur: +(d + 0.4).toFixed(2) });
      seg(from, end, d, { tag: 'clGlint', dmg: dmg.glint, w: 120 });
      f.afterKeep(d, () => { B.x = end.x; B.y = end.y; B.lockFacing = false; });
    };
    // the Chorus of the Fallen (Hard): an afterimage of an earlier set 3 boss joins a dance with one of its own moves
    const chorusOrder = H ? f.shuffle(['corvane', 'brannoc', 'morrowoak']) : [];
    let chorusI = 0;
    const chorus = lead => {
      const who = chorusOrder[chorusI++ % chorusOrder.length];
      const a = f.rng() * TAU, at = { x: Math.round(Math.cos(a) * 330), y: Math.round(Math.sin(a) * 330) };
      f.emit({ t: 'roomev', k: 'clchorus:' + (++imgN), who, x: at.x, y: at.y, dur: +(lead + 3).toFixed(2) });
      if (who === 'corvane') {
        // a Draw Cut from his afterimage through the hero farthest from it
        let far = null, fd = -1; for (const p of f.alive()) { const d = Math.hypot(p.x - at.x, p.y - at.y); if (d > fd) { fd = d; far = p; } }
        if (far) { const ang = Math.atan2(far.y - at.y, far.x - at.x); f.aoe({ kind: 'rect', x: at.x, y: at.y, angle: +ang.toFixed(3), len: Math.round(toWall(at.x, at.y, ang)), w: 120 }, lead + 1.2, dmg.chorus, { tag: 'clChorusCut' }); }
      } else if (who === 'brannoc') {
        // a Victory Leap onto a hero
        const tgt = nonTank();
        if (tgt) f.mech({ type: 'aoe', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 200 }, delay: lead + 1.8, dmg: dmg.chorus, follow: tgt.id, lockAt: 1.3, tag: 'clChorusLeap' });
      } else {
        // a Fourfold Bloom from where his afterimage stands (narrow petals: one snap)
        const a0 = f.rng() * TAU;
        for (let i = 0; i < 4; i++) f.aoe({ kind: 'cone', x: at.x, y: at.y, r: 1300, arc: 0.55, angle: +(a0 + i * Math.PI / 2).toFixed(3) }, lead + 2.2, dmg.chorus, { tag: 'clChorusBloom' });
      }
    };
    // Eightfold Wake: eight afterimages round the room, numbered; he cuts from one to the next, each cut a red line drawn ahead, the
    // whole dance shown before the first cut. o: { anchored (that many afterimages form where heroes stand), rings: 2 (a second,
    // inner ring of four after the eight), ringR, mirror (Hard: the dance again, mirrored), chorus (Hard), name, quiet }
    const wake = (o = {}) => {
      const n = 8, R = o.ringR || 400, a0 = f.rng() * TAU;
      let pts = f.shuffle([...Array(n).keys()]).map(k => ({ x: Math.round(Math.cos(a0 + k * TAU / n) * R), y: Math.round(Math.sin(a0 + k * TAU / n) * R) }));
      if (o.anchored) f.shuffle(f.nonTanks()).slice(0, o.anchored).forEach((p, i) => { pts[1 + i * 3] = { x: Math.round(p.x), y: Math.round(p.y) }; });
      if (o.rings === 2) { const b0 = f.rng() * TAU; pts = pts.concat(f.shuffle([0, 1, 2, 3]).map(k => ({ x: Math.round(Math.cos(b0 + k * TAU / 4) * R * 0.45), y: Math.round(Math.sin(b0 + k * TAU / 4) * R * 0.45) }))); }
      return dance(pts, o);
    };
    const dance = (pts, o = {}) => {
      const lead = f.ct(o.lead || 3.4), step = f.ct(0.6), total = lead + pts.length * step;
      const name = o.name || (o.mirror && H ? 'Mirrored Wake' : o.anchored ? 'Anchored Wake' : 'Eightfold Wake');
      if (!o.quiet) f.cast(name, total, 'wake');
      B.lockFacing = true; hold(total + 0.8);
      const from = { x: Math.round(B.x), y: Math.round(B.y) };
      f.emit({ t: 'roomev', k: 'climgs:' + (++imgN), l: pts.map((q, i) => { const nx = pts[i + 1]; return [q.x, q.y, i + 1, nx ? +Math.atan2(nx.y - q.y, nx.x - q.x).toFixed(2) : 0]; }), dur: +(total + 0.6).toFixed(2) });
      let prev = from;
      pts.forEach((q, i) => {
        seg(prev, q, lead + (i + 1) * step);
        f.afterKeep(lead + (i + 1) * step, () => { B.x = q.x; B.y = q.y; if (pts[i + 1]) B.facing = Math.atan2(pts[i + 1].y - q.y, pts[i + 1].x - q.x); });
        prev = q;
      });
      if (o.chorus && H) chorus(lead);
      f.afterKeep(total + 0.1, () => { B.lockFacing = false; });
      // Mirrored Wake (Hard): the same dance again, mirrored across a line through the middle
      if (o.mirror && H) {
        const m = f.rng() * Math.PI, c = Math.cos(2 * m), s = Math.sin(2 * m);
        const mp = pts.map(q => ({ x: Math.round(q.x * c + q.y * s), y: Math.round(q.x * s - q.y * c) }));
        f.afterKeep(total + 0.3, () => { if (f.state === 'live') dance(mp, { quiet: true, lead: 2.6 }); }, 'Mirrored Wake');
        return total + 0.3 + f.ct(2.6) + mp.length * step;
      }
      return total;
    };

    // --- the tank and the healer --------------------------------------------------------------------------------------------
    // Cinder Crown: a buster on the tank, and a ring of fire stays round where it landed
    const crown = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.2);
      f.cast('Cinder Crown', d, 'crown');
      const m = f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 160 }, delay: d, dmg: dmg.crown, target: tank.id, follow: tank.id, lockAt: 0.8, tag: 'clCrown',
        onResolve: () => f.zone({ shape: { kind: 'donut', x: Math.round(m.shape.x), y: Math.round(m.shape.y), r: 250, r2: 168 }, dur: 12, effect: 'burn', dmg: dmg.crownRing, tag: 'clCrownRing' }) });
    };
    // Pinning Thrust: a lunge down the line from him through the tank; the tank is driven to the wall along it (something solid in
    // the way slams them), anyone else on the line is cut. Aim it at open floor.
    const thrust = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(3.8);
      f.cast('Pinning Thrust', d, 'thrust');
      hold(d + 0.6);
      const m = f.mech({ type: 'buster', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tank.y - B.y, tank.x - B.x), len: 1300, w: 130 }, delay: d, dmg: dmg.thrust, target: tank.id, aimFromBoss: tank.id, lockAt: 0.9, tag: 'clThrust',
        onResolve: () => {
          const q = live(tank.id); if (!q) return;
          const a = m.shape.angle, L = Math.max(0, toWall(q.x, q.y, a) - 34);
          f.knock(q, q.x - Math.cos(a), q.y - Math.sin(a), L, { slam: dmg.pinSlam, slamAt: 50 });
          f.debuff(q.id, 'rooted', 1.2);
          f.afterKeep(0.15, () => { const t2 = live(tank.id); if (t2) { B.x = t2.x - Math.cos(a) * 110; B.y = t2.y - Math.sin(a) * 110; ARENA.clamp(B, 90); } });
        } });
    };
    // Grace Withdrawn: his grace leaves the whole party: everyone drops to 1 HP (never lethal), and Nightfall lands on them all a
    // few seconds later. The hardest heal check in the game.
    const grace = (o = {}) => {
      const d = f.ct(o.quick ? 2.4 : 3.2), gap = 8;
      f.cast('Grace Withdrawn', d, 'grace');
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        // (tools/check.js's timeline plays a clean party, whose healer has them back up: its dummies keep their health)
        if (!f.cleanRun) for (const p of f.alive()) {
          const s = p.s, lost = Math.max(0, s.hp - 1);
          s.hp = 1; s.shield = 0;
          f.emit({ t: 'pdmg', id: p.id, a: Math.round(lost), k: 'clGrace', hp: 1, dd: 0, n: 'Grace Withdrawn' });
        }
        f.emit({ t: 'roomev', k: 'clgrace', dur: gap });
        B.noAutoUntil = Math.max(B.noAutoUntil || 0, f.t + gap + 0.5);   // (no blade on anyone while they are held at nothing)
        f.cast('Nightfall', gap, 'night');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: gap, dmg: dmg.night, hidden: true, tag: 'clNight', from: 'Nightfall' });
      });
      f.afterKeep(d + 0.05, () => {}, 'Nightfall');   // (for the feed: Nightfall's cast begins as the grace leaves)
    };
    // Starfall: shards break off the meteor and fall as blue soaks inside its shadow (one hero each)
    const starfall = (n = 2) => {
      const d = f.ct(5), taken = [], minR = f.form ? 40 : 175;
      f.cast('Starfall', d, 'starfall');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.starRain, hidden: true, tag: 'clStarRain' });
      for (let i = 0; i < n; i++) {
        const at = inShadow(taken, minR); if (!at) break;
        taken.push(at);
        f.mech({ type: 'tower', shape: { kind: 'circle', x: at.x, y: at.y, r: 85 }, delay: d, dmg: dmg.star, need: 1, failDmg: dmg.starFail, tag: 'clStar' });
      }
    };
    // Dark Ember (Hard): a black ember rides a hero; set down at the shadow's edge, it pushes the shadow back a step (anywhere else
    // it burns where it falls)
    const darkEmber = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(9);
      f.cast('Dark Ember', f.ct(2.4), 'ember');
      const m = f.mech({ type: 'drop', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 70 }, delay: d, dmg: 0, follow: tgt.id, lockAt: 0.6, tag: 'clEmber', avoidable: false,
        onResolve: () => {
          const x = m.shape.x, y = m.shape.y, edge = Math.abs(Math.hypot(x - shadow.x, y - shadow.y) - shadow.r);
          if (edge < 80) { setShadow(Math.max(140, shadow.r - 55)); f.emit({ t: 'propfx', k: 'clember', x: Math.round(x), y: Math.round(y), ok: 1 }); }
          else { f.puddle(x, y, 100, 10, dmg.darkEmber, 1, 'clEmberBurn'); f.emit({ t: 'propfx', k: 'clember', x: Math.round(x), y: Math.round(y), ok: 0 }); }
        } });
    };

    // --- the Starwyrm (the wall) ------------------------------------------------------------------------------------------------
    // the serpent's body: red pieces round the room that land as it passes, painted all at once
    const coil = (delay, a0, dir, R = 455) => {
      const N = 24, sp = 470, pts = [];
      for (let i = 0; i <= N; i++) { const a = a0 + dir * i * TAU / N; pts.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]); }
      let s0 = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
        f.aoe({ kind: 'rect', x: ax, y: ay, angle: +Math.atan2(by - ay, bx - ax).toFixed(3), len: Math.round(L) + 20, w: 150 }, delay + (s0 + L) / sp, dmg.coil, { tag: 'clCoil' });
        s0 += L;
      }
      f.emit({ t: 'roomev', k: 'clwyrm:' + (++wyrmN), l: pts, sp, at: +delay.toFixed(2), w: 150, dur: +(delay + s0 / sp + 1).toFixed(2) });
      return delay + s0 / sp;
    };
    const STARWYRM = 25;
    const starwyrm = () => {
      f.cast('The Starwyrm', 3.5, 'summon');
      B.lockFacing = true; hold(STARWYRM); B.moveTo = { x: 0, y: -200, speed: 300 };
      f.emit({ t: 'roomev', k: 'clsummon', dur: STARWYRM });
      const a0 = f.rng() * TAU, dir = H && f.rng() < 0.5 ? -1 : 1;
      f.afterKeep(3.5, () => coil(1.2, a0, dir));
      // Embers of Heaven: two (Hard: three) of the shards round the star are struck off before it breathes
      f.afterKeep(5, () => {
        if (f.state !== 'live') return;
        f.cast('Embers of Heaven', f.ct(3.2), 'embers');
        const shards = f.shuffle(f.props.filter(p => p.kind === 'starshard')).slice(0, H ? 3 : 2);
        for (const pr of shards) f.aoe({ kind: 'circle', x: pr.x, y: pr.y, r: 130 }, f.ct(3.2), dmg.ember, { tag: 'clEmbers', onResolve: () => { if (f.props.includes(pr)) f.breakProp(pr, 'ember'); } });
      }, 'Embers of Heaven');
      // it rears on the rim (Hard draws the side) and breathes across the whole floor: only the star's shadow is safe
      f.afterKeep(11, () => {
        if (f.state !== 'live') return;
        const ra = H ? f.rng() * TAU : -Math.PI / 2 + (f.rng() - 0.5) * 1.2, rx = Math.round(Math.cos(ra) * (ARENA.r - 20)), ry = Math.round(Math.sin(ra) * (ARENA.r - 20));
        const d = f.ct(5.5);
        f.cast('Constellation Fall', d, 'constellation');
        f.emit({ t: 'roomev', k: 'clrear', x: rx, y: ry, dur: +(d + 2).toFixed(2) });
        // he steps round the star into its shadow to watch (so the tank holding him is behind it too)
        // (round the side of it, not through it)
        const side = ra + Math.PI / 2 * (f.rng() < 0.5 ? 1 : -1), back = { x: Math.round(-Math.cos(ra) * 230), y: Math.round(-Math.sin(ra) * 230), speed: 300 };
        B.moveTo = { x: Math.round(Math.cos(side) * 240), y: Math.round(Math.sin(side) * 240), speed: 300, done: () => { B.moveTo = back; } };
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: rx, y: ry, r: 1400 }, delay: d, dmg: dmg.constellation, cover: true, src: { x: rx, y: ry }, tag: 'clConstellation' });
      }, 'Constellation Fall');
      f.afterKeep(19, crown, 'Cinder Crown');
      f.afterKeep(20.5, () => starfall(2), 'Starfall');
      f.afterKeep(STARWYRM, () => { B.lockFacing = false; if (f.wall) f.wallDown(); });
      // (and the Ascendant and his first dance up there are laid now, so the feed reads across the wall into Act III)
      f.afterKeep(STARWYRM + 0.5, ascend, 'Ascendant');
      f.afterKeep(STARWYRM + 9.5, () => wake({ rings: 2 }), 'Eightfold Wake');
    };

    // --- Ascendant (the second form) --------------------------------------------------------------------------------------------
    let ascended = false;
    const ascend = () => {
      if (ascended) return;
      ascended = true;
      const d = 6;
      f.cast('Ascendant', d, 'ascend');
      B.untargetable = true; hold(d);
      f.emit({ t: 'roomev', k: 'clascend', dur: d + 2 });
      f.afterKeep(3, () => {
        f.clearZones(); f.clearPuddles(); burnZone = null;
        for (const pr of [...f.props]) f.removeProp(pr);
        f.setForm('sky');
        f.edgeGrace = f.t + 3;
        for (const p of f.alive()) { const r = Math.hypot(p.x, p.y); if (r > ARENA.r - 50) f.knock(p, p.x * 3, p.y * 3, r - (ARENA.r - 90)); }
        B.x = 0; B.y = -60; B.moveTo = null;
        setShadow(300);
      });
      f.afterKeep(d, () => { B.untargetable = false; f.anim('ascendant', 2); });
    };
    // Horizon Cut: the whole room is cut across but for a gap (the gap moves every time; shards fall on everything else)
    const horizon = () => {
      const d = f.ct(5), a = f.rng() * Math.PI, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const g = Math.round((f.rng() - 0.5) * 440), gw = H ? 170 : 190, FAR = 800;
      f.cast('Horizon Cut', d, 'horizon');
      hold(d + 0.4);
      const band = (n0, n1) => { const mid = (n0 + n1) / 2, w = n1 - n0; return { kind: 'rect', x: Math.round(nx * mid - dx * FAR), y: Math.round(ny * mid - dy * FAR), angle: +a.toFixed(3), len: FAR * 2, w: Math.round(w) }; };
      const group = new Set();
      f.aoe(band(-FAR, g - gw / 2), d, dmg.horizon, { tag: 'clHorizon', group });
      f.aoe(band(g + gw / 2, FAR), d, dmg.horizon, { tag: 'clHorizon', group });
      f.emit({ t: 'roomev', k: 'clhorizon', a: +a.toFixed(3), g, gw, at: +d.toFixed(2), dur: +(d + 0.8).toFixed(2) });
    };
    // Second Coil (Hard): the Starwyrm comes back and dives across the room along a painted line
    const secondCoil = () => {
      const d = f.ct(4.6), a = f.rng() * TAU, off = (f.rng() - 0.5) * 300, nx = -Math.sin(a), ny = Math.cos(a);
      const x0 = nx * off - Math.cos(a) * 700, y0 = ny * off - Math.sin(a) * 700;
      f.cast('Second Coil', d, 'coil');
      f.aoe({ kind: 'rect', x: Math.round(x0), y: Math.round(y0), angle: +a.toFixed(3), len: 1400, w: 230 }, d, dmg.secondCoil, { tag: 'clDive' });
      f.emit({ t: 'roomev', k: 'clwyrm:' + (++wyrmN), l: [[Math.round(x0), Math.round(y0)], [Math.round(x0 + Math.cos(a) * 1400), Math.round(y0 + Math.sin(a) * 1400)]], sp: 1400, at: +d.toFixed(2), w: 230, dive: 1, dur: +(d + 1.6).toFixed(2) });
    };

    // --- the acts -------------------------------------------------------------------------------------------------------------
    // I. Descent
    const descent = from => f.course({
      until: 0.76, onStart: () => setShadow(150),
      sets: [
        S([4, glint, 'Glint']),
        S([8, () => wake(), 'Eightfold Wake']),
        S([13, crown, 'Cinder Crown']),
        S([10, glint, 'Glint'], [6, thrust, 'Pinning Thrust']),
        S([11, () => wake({ mirror: true, chorus: true }), H ? 'Mirrored Wake' : 'Eightfold Wake']),
        S([H ? 17 : 13, () => grace(), 'Grace Withdrawn']),
        S([15, crown, 'Cinder Crown']),
        S([10, glint, 'Glint'], [7, glint, 'Glint']),
        S([10, () => wake(), 'Eightfold Wake']),
        S([13, thrust, 'Pinning Thrust']),
        S([10, crown, 'Cinder Crown']),
      ],
      closing: [[10, glint, 'Glint'], [10, crown, 'Cinder Crown'], [12, () => wake(), 'Eightfold Wake']],
      next: starfallAct,
    }, from);

    // II. Starfall (its gate is the Starwyrm's wall)
    const starfallAct = from => f.course({
      until: 0.52, onStart: () => setShadow(270),
      wall: { label: 'The Starwyrm', run: starwyrm, until: 'resolved', timeout: STARWYRM + 8 },
      sets: [
        S([4, () => starfall(2), 'Starfall']),
        S([9, () => wake({ anchored: 2 }), 'Anchored Wake']),
        S([13, crown, 'Cinder Crown']),
        S([10, glint, 'Glint'], [7, thrust, 'Pinning Thrust']),
        S([12, () => starfall(2), 'Starfall'], H && [4, darkEmber, 'Dark Ember']),
        S([H ? 6 : 9, () => wake({ anchored: 2, chorus: true }), H ? 'Chorus of the Fallen' : 'Anchored Wake']),
        S([13, crown, 'Cinder Crown']),
        S([11, glint, 'Glint'], [6, glint, 'Glint']),
        S([11, () => starfall(2), 'Starfall'], [6, thrust, 'Pinning Thrust']),
        S([12, () => wake({ anchored: 2 }), 'Anchored Wake']),
        S([13, crown, 'Cinder Crown']),
      ],
      closing: [[10, () => starfall(2), 'Starfall'], [10, crown, 'Cinder Crown'], [12, () => wake({ anchored: 2 }), 'Anchored Wake']],
      next: ascendant,
    }, from);

    // III. Ascendant
    const ascendant = from => f.course({
      until: 0.18, push: true,
      onStart: () => { if (!ascended) ascend(); },   // (practice from here: the wall that lays it was passed over)
      sets: [
        S([23.5, crown, 'Cinder Crown']),
        S([10, horizon, 'Horizon Cut']),
        S([10, glint, 'Glint'], [7, thrust, 'Pinning Thrust']),
        // a second Grace Withdrawn as a Starfall comes down
        S([11, () => starfall(3), 'Starfall'], [2.8, () => grace({ quick: true }), 'Grace Withdrawn']),
        S([14, crown, 'Cinder Crown']),
        S([10, horizon, 'Horizon Cut'], H && [7, secondCoil, 'Second Coil']),
        S([H ? 8 : 11, () => wake({ rings: 2, chorus: true, mirror: true }), H ? 'Mirrored Wake' : 'Eightfold Wake'], H && [6, darkEmber, 'Dark Ember']),
        S([H ? 13 : 14, thrust, 'Pinning Thrust'], [8, glint, 'Glint']),
        S([11, () => starfall(3), 'Starfall']),
        S([12, crown, 'Cinder Crown']),
        S([10, horizon, 'Horizon Cut']),
        S([11, () => wake({ rings: 2 }), 'Eightfold Wake'], H && [5, () => grace({ quick: true }), 'Grace Withdrawn']),
        S([H ? 11 : 14, crown, 'Cinder Crown']),
        S([10, glint, 'Glint'], [7, thrust, 'Pinning Thrust']),
        S([H ? 9 : 11, () => starfall(3), 'Starfall']),
        S([H ? 7 : 10, horizon, 'Horizon Cut']),
      ].filter(Boolean),
      closing: [[10, crown, 'Cinder Crown'], [10, horizon, 'Horizon Cut'], [12, () => wake({ rings: 2 }), 'Eightfold Wake']],
      next: skyComes,
    }, from);

    // IV. The Sky Comes Down: the shadow burns, and grows; the last dance runs round the clear ground left at the rim
    const skyComes = from => f.course({
      onStart: () => { setShadow(340, true); f.afterKeep(36, () => { if (f.state === 'live') setShadow(390, true); }); },
      sets: [
        S([4, crown, 'Cinder Crown']),
        S([9, horizon, 'Horizon Cut']),
        S([10, glint, 'Glint'], [6, thrust, 'Pinning Thrust']),
        S([11, () => wake({ ringR: 455, chorus: true }), H ? 'Chorus of the Fallen' : 'Eightfold Wake']),
        S([12, () => grace(), 'Grace Withdrawn']),
        S([15, crown, 'Cinder Crown']),
        S([10, horizon, 'Horizon Cut']),
      ],
      closing: [[10, crown, 'Cinder Crown'], [10, horizon, 'Horizon Cut'], [12, () => wake({ ringR: 455 }), 'Eightfold Wake']],
      ramp: 0.08,
    }, from);

    descent(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.wake())
    f.moves = { glint, wake, dance, crown, thrust, grace, starfall, darkEmber, coil, starwyrm, ascend, horizon, secondCoil, chorus, setShadow };
    f.caelumShadow = shadow;
  },
};

if (typeof module !== 'undefined') module.exports = { CAELUM };
