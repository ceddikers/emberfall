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
//     tank to the wall), Trailing Cut (a silver copy is left at the tank's heel and a ring keeps pace with them until the last moment: he
//     cuts where the tank stood, so the tank steps clear and leads it away from the party; it runs inside a dance too, with the dance's
//     cuts still to read), Grace Withdrawn (the whole party drops to 1 HP, never lethal) and Nightfall (everyone, a few seconds later).
//   Act II, Starfall (76% -> 52%): Anchored Wake (two of the afterimages form where heroes stand), Starfall (blue soaks fall inside the
//     shadow), the shadow grows, and the first Horizon Cut (a wide lane along the rim, clear of the star: a taste of Act III's idea).
//   The Starwyrm (52%, WALL): he lifts his blade and the constellations knot into a serpent of stars. It coils once round the room (a
//     moving red band), Embers of Heaven chip pieces off the half-buried star, and it rears on the rim and breathes Constellation Fall
//     across the floor: only the star's shadow is safe. The serpent unravels and the wall drops.
//   Act III, Ascendant (52% -> 18%, PUSH): the crater falls away to a circle of cloud above the meteor (the room becomes 'caelum:sky',
//     fight.js setForm). The Wake gains a second ring; Horizon Cut sweeps the whole room but for a gap that moves every time.
//   Act IV, The Sky Comes Down (18% -> dead, PUSH): the shadow covers most of the floor and burns; the last dance runs round what is clear.
// Every telegraph shows on every difficulty. Hard: casts 15% faster, harder hits (hardDmg), and:
//   Mirrored Wake:        the dance runs twice, the second pass mirrored.
//   Trailing Cut, twice:  when it stands alone, a second ring comes where the tank has stepped to, a moment after the first lands (in a dance, one ring on both).
//   Second Coil:          the Starwyrm returns in Act III and dives along a painted line.
//   Chorus of the Fallen: once an act (in Act III, the first dance up in the sky), an afterimage of Corvane, Brannoc or Morrow-Oak joins a dance with one of its own moves (on Normal
//                         and Hard alike all three strike in turn at the end of the last dance).
//   Dark Ember:           a hero carries a black ember as a Starfall comes down (Acts II and III); set down at the shadow's edge, it pushes the shadow back.
//   and a second Grace Withdrawn during a dance.
// Hard also draws the afterimage orders, the Starfall spots and the Starwyrm's side each pull, and the order of each act's middle (see the acts below).
// Crossed Horizon Cut (same name): two cuts at once at different angles; the only bare floor is where the two gaps meet (Normal once in Act III, Hard once in Act IV).

const CAELUM = {
  id: 'caelum', name: 'Caelum Vey', title: 'the Starborn',
  hp: { normal: 5400000, hard: 5400000 },   // (Hard was 5.6M: the slowest clears used to land on the enrage cast; now 20 s or more clear)
  hardDmg: 1.435,   // (Hard's damage multiplier; fight.js default 1.25; up as the health came down, so every hit still has to be earned)
  autoDmg: { normal: 2600, hard: 2600 },
  enrage: { normal: 605, hard: 625 },   // the cast starts here and lands 8 s later (10:13 / 10:33)
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
      glint: H ? 18800 : 20000, wake: H ? 17800 : 19800, crown: H ? 25000 : 26500, crownRing: H ? 1900 : 1900, thrust: H ? 22500 : 24000,
      pinSlam: H ? 8500 : 9500, night: H ? 3800 : 4400, star: H ? 8000 : 9000, starFail: H ? 11000 : 12000, starRain: H ? 5600 : 5900, ember: H ? 17500 : 20000,
      coil: H ? 19800 : 21000, trail: H ? 9800 : 10500, constellation: H ? 60000 : 70000, horizon: H ? 25000 : 27000, burn: H ? 2000 : 2000, shower: H ? 2600 : 2700, glow: H ? 2400 : 2600,
      secondCoil: H ? 20000 : 0, chorus: H ? 19500 : 18500, darkEmber: H ? 2200 : 0,
    };
    if (!H) for (const k in dmg) if (!['night', 'ember', 'constellation'].includes(k)) dmg[k] = Math.round(dmg[k] * 1.08);   // (Normal hits 8% harder: 6% after the fun pass made the fight easier to survive; Nightfall, Embers of Heaven and Constellation Fall stay, so Hard keeps its 1.1x over them)
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
    const inShadow = (taken, minR, near) => {
      let best = null;
      if (near) for (let k = 0; k < 14; k++) {   // (near: the candidate closest to the boss; his tower is one a fighter beside him can take)
        const a = f.rng() * TAU, r = minR + f.rng() * Math.max(10, shadow.r - 55 - minR);
        const x = shadow.x + Math.cos(a) * r, y = shadow.y + Math.sin(a) * r;
        if (taken.every(q => Math.hypot(q.x - x, q.y - y) > 210) && (!best || Math.hypot(x - near.x, y - near.y) < best.d)) best = { x: Math.round(x), y: Math.round(y), d: Math.hypot(x - near.x, y - near.y) };
      }
      if (best) return { x: best.x, y: best.y };
      for (let k = 0; k < 40; k++) {
        const a = f.rng() * TAU, r = minR + f.rng() * Math.max(10, shadow.r - 55 - minR);
        const x = shadow.x + Math.cos(a) * r, y = shadow.y + Math.sin(a) * r;
        if (taken.every(q => Math.hypot(q.x - x, q.y - y) > 210)) return { x: Math.round(x), y: Math.round(y) };
      }
      return null;
    };

    // --- the afterimages ------------------------------------------------------------------------------------------------------
    // Glint: an afterimage at the end of a line toward a hero; the cut runs down the line and he is there
    // (o.tank: the line is aimed at the tank, who must step off it and then follow him to where he ends)
    const glint = (o = {}) => {
      const tgt = o.tank ? f.tank() : nonTank(); if (!tgt) return;
      const d = f.ct(2.6), a = Math.atan2(tgt.y - B.y, tgt.x - B.x), L = Math.max(150, Math.min(480, toWall(B.x, B.y, a) - 70));
      const from = { x: B.x, y: B.y }, end = { x: Math.round(B.x + Math.cos(a) * L), y: Math.round(B.y + Math.sin(a) * L) };
      f.cast('Glint', d, 'glint');
      hold(d + 0.3); B.lockFacing = true; B.facing = a;
      f.emit({ t: 'roomev', k: 'climgs:' + (++imgN), l: [[end.x, end.y, 1, +a.toFixed(2)]], dur: +(d + 0.4).toFixed(2) });
      seg(from, end, d, { tag: 'clGlint', dmg: dmg.glint, w: 120 });
      f.afterKeep(d, () => { B.x = end.x; B.y = end.y; B.lockFacing = false; });
    };
    // Trailing Cut: an afterimage always marks the tank. A red ring is drawn round the tank and keeps pace with them; a moment before
    // the cut it stops, a silver copy of him stands in it, and he cuts where the tank stood. The tank steps clear and takes care where
    // the copy is left: whoever stands close is cut too, and in a dance the painted cuts are still to read. Lighter than Cinder Crown
    // and Pinning Thrust, so it comes often. In a dance it is cast just after the dance's own bar (o.hosted: one ring only; the dance
    // names its bar's length with echoAt); on its own, Hard sends a second ring where the tank has stepped to.
    const ECHO_R = 135, ECHO_CAST = 2.8, ECHO_LOCK = 1.15, ECHO_TWIN = 1.7;
    const echo = (o = {}) => {
      if (!f.tank()) return;
      const d = f.ct(ECHO_CAST);
      f.cast('Trailing Cut', d, 'glint');
      const ring = (delay, lockAt, dm) => {
        const t = f.tank(); if (!t) return;
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(t.x), y: Math.round(t.y), r: ECHO_R }, delay, dmg: dm, follow: t.id, lockAt, tag: 'clEcho' });
        // (the copy stands where the ring stops, facing him; it comes apart as the cut lands)
        f.afterKeep(delay - lockAt, () => {
          if (f.state !== 'live') return;
          const x = Math.round(m.shape.x), y = Math.round(m.shape.y);
          f.emit({ t: 'roomev', k: 'climgs:' + (++imgN), l: [[x, y, 1, +Math.atan2(B.y - y, B.x - x).toFixed(2)]], dur: +(lockAt + 0.7).toFixed(2) });
        });
      };
      ring(d, ECHO_LOCK, dmg.trail);
      if (H && !o.hosted) f.afterKeep(d + 0.1, () => { if (f.state === 'live') ring(ECHO_TWIN, 1.05, Math.round(dmg.trail * 0.8)); });
    };
    // the Chorus of the Fallen (Hard): an afterimage of an earlier set 3 boss joins a dance with one of its own moves
    // (Normal: once, in the last dance, all three in turn; Hard: one in a dance of every act, and all three in the last)
    const chorusOrder = f.shuffle(['corvane', 'brannoc', 'morrowoak']);
    let chorusI = 0;
    const chorus = (lead, who = chorusOrder[chorusI++ % chorusOrder.length], later = 0) => {
      lead += later;
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
      // o.echo (1 or 2: in the first or the second pass of a mirrored dance): the tank's Trailing Cut is cast just after the lead
      const ep = o.echo ? ((o.mirror && H) ? o.echo : 1) : 0;
      if (!o.quiet) f.cast(name, (o.bar || ep === 1) ? lead + (o.echoAt ? o.echoAt - 0.05 : 0) : total, 'wake');   // (o.bar: the bar shows only the lead; the cuts run on, so a cast that begins during them does not cut it)
      if (ep === 1) f.afterKeep(lead + (o.echoAt || 0.25), () => { if (f.state === 'live') echo({ hosted: true }); }, 'Trailing Cut');
      B.lockFacing = true; hold(total + 0.8);
      const from = { x: Math.round(B.x), y: Math.round(B.y) };
      const flare = !o.noFlare;   // (Mirrored Wake: the flare closes each pass, so the healer has a beat in the middle of the long dance)
      f.emit({ t: 'roomev', k: 'climgs:' + (++imgN), l: pts.map((q, i) => { const nx = pts[i + 1]; return [q.x, q.y, i + 1, nx ? +Math.atan2(nx.y - q.y, nx.x - q.x).toFixed(2) : 0]; }), fl: flare ? 1 : 0, dur: +(total + 0.6).toFixed(2) });
      let prev = from;
      pts.forEach((q, i) => {
        seg(prev, q, lead + (i + 1) * step);
        f.afterKeep(lead + (i + 1) * step, () => { B.x = q.x; B.y = q.y; if (pts[i + 1]) B.facing = Math.atan2(pts[i + 1].y - q.y, pts[i + 1].x - q.x); });
        prev = q;
      });
      if (o.fallen) { chorus(lead, chorusOrder[0]); chorus(lead, chorusOrder[1], 2.4); chorus(lead, chorusOrder[2], 4.6); }
      else if (o.chorus && H) chorus(lead);
      // a flare closes the dance (Starlight, on the last afterimage): the healer's beat after every dance. Never on a hero already
      // held at nothing by Grace Withdrawn
      if (flare) f.afterKeep(total + 0.3, () => {
        if (f.state !== 'live' || f.t < graceUntil) return;
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.4, dmg: dmg.glow, hidden: true, tag: 'clGlow', from: 'Starlight' });
      });
      f.afterKeep(total + 0.1, () => { B.lockFacing = false; });
      // Mirrored Wake (Hard): the same dance again, mirrored across a line through the middle
      if (o.mirror && H) {
        const m = f.rng() * Math.PI, c = Math.cos(2 * m), s = Math.sin(2 * m);
        const mp = pts.map(q => ({ x: Math.round(q.x * c + q.y * s), y: Math.round(q.x * s - q.y * c) }));
        f.afterKeep(total + 0.3, () => { if (f.state === 'live') dance(mp, { quiet: true, lead: 2.6, echo: ep === 2 ? 1 : 0 }); }, 'Mirrored Wake');
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
      // (and the embers it throws up come down on everyone a moment after)
      f.afterKeep(d + 1.0, () => { if (f.state === 'live' && f.t + 0.4 >= graceUntil) f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.4, dmg: dmg.shower, hidden: true, tag: 'clShower', from: 'Cinder Crown' }); });   // (never on heroes held at nothing)
      const m = f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 160 }, delay: d, dmg: dmg.crown, target: tank.id, follow: tank.id, lockAt: 0.8, tag: 'clCrown',
        onResolve: () => f.zone({ shape: { kind: 'donut', x: Math.round(m.shape.x), y: Math.round(m.shape.y), r: 222, r2: 168 }, dur: 7, effect: 'burn', dmg: dmg.crownRing, tag: 'clCrownRing' }) });
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
    // (while everyone is held at nothing the floor's fire is held too: the burning shadow, Cinder Crown's ring and Dark Ember's
    // pool sit dim and do not burn; only a cut the party has already seen coming can still hurt them)
    let graceUntil = 0;
    const holdFire = len => {
      for (const z of f.zones) if (z.effect === 'burn') { z.startAt = Math.max(z.startAt, f.t + len); if (z.end < 9000) z.end += len; }
      for (const pd of f.puddles) { pd.end += len; for (const p of f.alive()) pd.last[p.id] = f.t + len - pd.every; }
    };
    const grace = (o = {}) => {
      const d = f.ct(o.quick ? 2.4 : 3.2), gap = 10;
      f.cast('Grace Withdrawn', d, 'grace');
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        graceUntil = f.t + gap + 0.6; holdFire(gap + 0.6);
        // (tools/check.js's timeline plays a clean party, whose healer has them back up: its dummies keep their health)
        if (!f.cleanRun) for (const p of f.alive()) {
          const s = p.s, lost = Math.max(0, s.hp - 1);
          s.hp = 1; s.shield = 0;
          f.emit({ t: 'pdmg', id: p.id, a: Math.round(lost), k: 'clGrace', hp: 1, dd: 0, n: 'Grace Withdrawn' });
        }
        f.emit({ t: 'roomev', k: 'clgrace', dur: gap });
        B.noAutoUntil = Math.max(B.noAutoUntil || 0, f.t + gap + 3);   // (no blade on anyone while they are held at nothing, nor in the breath after Nightfall: the healer's catch-up)
        f.cast('Nightfall', gap, 'night');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: gap, dmg: dmg.night, hidden: true, tag: 'clNight', from: 'Nightfall' });
      });
      f.afterKeep(d + 0.05, () => {}, 'Nightfall');   // (for the feed: Nightfall's cast begins as the grace leaves)
    };
    // Starfall: shards break off the meteor and fall as blue soaks inside its shadow (one hero each)
    const starfall = (n = 2) => {
      const d = f.ct(5), taken = [], minR = f.form ? 40 : 175;
      f.cast('Starfall', d, 'starfall');
      f.afterKeep(d - 0.4, () => { if (f.state === 'live' && f.t + 0.4 >= graceUntil) f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.4, dmg: dmg.starRain, hidden: true, tag: 'clStarRain' }); });
      for (let i = 0; i < n; i++) {
        const at = inShadow(taken, minR, i < 2 ? B : null); if (!at) break;
        taken.push(at);
        f.mech({ type: 'tower', shape: { kind: 'circle', x: at.x, y: at.y, r: 85 }, delay: d, dmg: dmg.star, need: 1, failDmg: dmg.starFail, tag: 'clStar' });
      }
    };
    // Dark Ember (Hard): a black ember rides a hero; set down at the shadow's edge, it pushes the shadow back a step (anywhere else
    // it burns where it falls). What the embers did stays: each one set at the edge keeps the sky that much smaller for the rest of
    // the fight (the second form's shadow and the burning shadow of the end), and each one missed lets it in a little further.
    let held = 0;
    const darkEmber = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(9);
      f.cast('Dark Ember', f.ct(2.4), 'ember');
      const m = f.mech({ type: 'drop', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 70 }, delay: d, dmg: 0, follow: tgt.id, lockAt: 0.6, tag: 'clEmber', avoidable: false,
        onResolve: () => {
          const x = m.shape.x, y = m.shape.y, edge = Math.abs(Math.hypot(x - shadow.x, y - shadow.y) - shadow.r);
          if (edge < 80) { held += 20; setShadow(Math.max(140, shadow.r - 55)); f.emit({ t: 'propfx', k: 'clember', x: Math.round(x), y: Math.round(y), ok: 1 }); }
          else { held = Math.max(-20, held - 20); f.puddle(x, y, 100, 10, dmg.darkEmber, 1, 'clEmberBurn'); f.emit({ t: 'propfx', k: 'clember', x: Math.round(x), y: Math.round(y), ok: 0 }); }
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
    const STARWYRM = 22;   // (the breath and Crown finish before the seal opens)
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
      f.afterKeep(16.7, crown, 'Cinder Crown');   // (after the breath's bar, and clear of Starfall's)
      f.afterKeep(STARWYRM, () => { B.lockFacing = false; if (f.wall) f.wallDown(); });
      // (and the Ascendant and his first dance up there are laid now, so the feed reads across the wall into Act III)
      f.afterKeep(STARWYRM + 0.5, ascend, 'Ascendant');
      f.afterKeep(STARWYRM + 9.5, () => wake({ rings: 2, chorus: true, echo: 1 }), H ? 'Chorus of the Fallen' : 'Eightfold Wake');
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
        setShadow(300 - held);
      });
      f.afterKeep(d, () => { B.untargetable = false; f.anim('ascendant', 2); });
    };
    // Horizon Cut: the whole room is cut across but for a gap (the gap moves every time; shards fall on everything else)
    // o.star: a shard of the meteor falls into the gap (a Starfall tower stands in the one safe lane, painted from the cast)
    // o.cross: two cuts at once at different angles, so the only bare floor is where the two gaps meet (the same name, the same sound)
    const horizon = (o = {}) => {
      const d = f.ct(5), FAR = 800, group = new Set(), hd = Math.round(dmg.horizon * (o.cross ? (H ? 0.8 : 0.65) : 1));   // (a cut that is harder to meet hits a little lighter)
      const cuts = [];
      if (o.cross) {
        // (the point where the gaps meet is somewhere in the middle of the room; the cuts cross at a good angle, so it is a clear diamond)
        const pr = Math.sqrt(f.rng()) * 230, pa = f.rng() * TAU, P = { x: Math.cos(pa) * pr, y: Math.sin(pa) * pr }, a1 = f.rng() * Math.PI, a2 = (a1 + 1.0 + f.rng() * 1.14) % Math.PI;
        for (const a of [a1, a2]) cuts.push({ a, g: Math.round(P.x * -Math.sin(a) + P.y * Math.cos(a)), gw: H ? 200 : 260 });
      } else if (o.rim) {
        // (the crater still has its star: the gap runs along the rim, clear of the core and its shards, so the lane is all open floor)
        const gw = H ? 170 : 230; let cut = null;   // (a first taste: a little wider than the later lanes, 135 and 190)
        const tang = Math.atan2(B.y, B.x) + Math.PI / 2;   // (the first tries run the lane along the rim where he stands, so the party that holds him need not cross the room)
        for (let k = 0; k < 90 && !cut; k++) {
          const a = k < 30 ? ((tang + (f.rng() - 0.5) * 0.9) % Math.PI + Math.PI) % Math.PI : f.rng() * Math.PI, nx = -Math.sin(a), ny = Math.cos(a);
          const g = k < 30 ? Math.round(B.x * nx + B.y * ny + (f.rng() - 0.5) * 50) : Math.round((f.rng() < 0.5 ? -1 : 1) * (200 + f.rng() * 140));
          if (f.props.every(pr => Math.abs(pr.x * nx + pr.y * ny - g) > gw / 2 + (pr.r || 40) + 25)) cut = { a, g, gw };
        }
        cuts.push(cut || { a: 0, g: 340, gw });
      } else {
        // (the gap is cut across where he stands, so the party that holds him is already in it; the rest read where it lies and cross to it)
        const a = f.rng() * Math.PI, gw = H ? 135 : 190, g = Math.round(B.x * -Math.sin(a) + B.y * Math.cos(a) + (f.rng() - 0.5) * gw * 0.5);
        cuts.push({ a, g: Math.max(-250, Math.min(250, g)), gw });
      }
      if (o.star) {
        const { a, g } = cuts[0], dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
        const reach = Math.sqrt(Math.max(0, (shadow.r - 60) ** 2 - g * g)), s0 = Math.round((f.rng() - 0.5) * 2 * Math.min(reach, 190));
        f.mech({ type: 'tower', shape: { kind: 'circle', x: Math.round(nx * g + dx * s0), y: Math.round(ny * g + dy * s0), r: 85 }, delay: d, dmg: dmg.star, need: 1, failDmg: dmg.starFail, tag: 'clStar' });
      }
      f.cast('Horizon Cut', d, 'horizon');
      hold(d + 0.4);
      for (const { a, g, gw } of cuts) {
        const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
        const band = (n0, n1) => { const mid = (n0 + n1) / 2, w = n1 - n0; return { kind: 'rect', x: Math.round(nx * mid - dx * FAR), y: Math.round(ny * mid - dy * FAR), angle: +a.toFixed(3), len: FAR * 2, w: Math.round(w) }; };
        f.aoe(band(-FAR, g - gw / 2), d, hd, { tag: 'clHorizon', group });
        f.aoe(band(g + gw / 2, FAR), d, hd, { tag: 'clHorizon', group });
        f.emit({ t: 'roomev', k: 'clhorizon:' + (++imgN), a: +a.toFixed(3), g, gw, at: +d.toFixed(2), dur: +(d + 0.8).toFixed(2) });
      }
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
    // Each act is a list of blocks (one move, or two moves a few seconds apart). On Normal they play in the order written. On Hard
    // the middle of every act is drawn again each pull; an order is kept only when no stretch goes long without the tank or the
    // healer having something to do, no two big tank hits sit close, and the act's own rules hold (nothing to read twice at once).
    // A block's lead is the time from the last step before it to its first. Written in order it is exactly that; behind any other
    // block it is the calm the block was written with (at least 3.4 s) on top of what the block before it holds the floor for.
    const MV = {   // what a move is: how long it holds the floor (tail), and when it lands for the tank (tank, bust) or the healer (heal)
      glint: () => ({ fn: () => glint(), name: 'Glint', tail: f.ct(2.6) + 0.4 }),
      glintT: () => ({ fn: () => glint({ tank: true }), name: 'Glint', tail: f.ct(2.6) + 0.4, tank: [f.ct(2.6)] }),
      crown: () => ({ fn: crown, name: 'Cinder Crown', tail: f.ct(4.2) + 0.6, tank: [f.ct(4.2)], bust: [f.ct(4.2)], heal: [f.ct(4.2) + 1] }),
      thrust: () => ({ fn: thrust, name: 'Pinning Thrust', tail: f.ct(3.8) + 0.6, tank: [f.ct(3.8)], bust: [f.ct(3.8)] }),
      starfall: (n = 2) => ({ fn: () => starfall(n), name: 'Starfall', tail: f.ct(5) }),
      ember: () => ({ fn: darkEmber, name: 'Dark Ember', tail: 7 }),   // (carried for ct(9); the next block begins just after it is set down)
      horizon: o => ({ fn: () => horizon(o), name: 'Horizon Cut', tail: f.ct(5) + 0.4 }),
      coil: () => ({ fn: secondCoil, name: 'Second Coil', tail: f.ct(4.6) }),
      grace: quick => ({ fn: () => grace({ quick }), name: 'Grace Withdrawn', nm: f.ct(quick ? 2.4 : 3.2) + 0.05, tail: f.ct(quick ? 2.4 : 3.2) + 10.4, heal: [f.ct(quick ? 2.4 : 3.2), f.ct(quick ? 2.4 : 3.2) + 10] }),
      // (o.echo: the tank's Trailing Cut inside the dance; it lands near the start of the pass it is in)
      wake: (o = {}, name = 'Eightfold Wake') => {
        const n = (o.rings === 2 ? 12 : 8), one = f.ct(3.4) + n * f.ct(0.6), total = (o.mirror && H) ? one + 0.3 + f.ct(2.6) + n * f.ct(0.6) : one;
        const ep = o.echo ? ((o.mirror && H) ? o.echo : 1) : 0;
        const at = o.echoAt || 0.25, tank = !ep ? [] : [ep === 1 ? f.ct(3.4) + at + f.ct(ECHO_CAST) : one + 0.3 + f.ct(2.6) + at + f.ct(ECHO_CAST)];
        // (nm: when its last named step fires, after its first: the feed must always have a named step within 16 s)
        const nm = (o.mirror && H) ? one + 0.3 + (ep === 2 ? f.ct(2.6) + at : 0) : ep === 1 ? f.ct(3.4) + at : 0;
        return { fn: () => wake(o), name, tail: total + 0.8, tank, nm, heal: o.noFlare ? [] : (o.mirror && H) ? [one + 0.7, total + 0.7] : [total + 0.7] };
      },
      // Trailing Cut on its own (Hard: the ring comes twice; one: the single ring, for a move that already asks a lot of the floor)
      echoOne: () => ({ fn: () => echo({ hosted: true }), name: 'Trailing Cut', tail: f.ct(ECHO_CAST) + 0.2, tank: [f.ct(ECHO_CAST)] }),
      echo: () => ({ fn: () => echo(), name: 'Trailing Cut', tail: f.ct(ECHO_CAST) + (H ? ECHO_TWIN + 0.6 : 0.6), tank: H ? [f.ct(ECHO_CAST), f.ct(ECHO_CAST) + 0.1 + ECHO_TWIN] : [f.ct(ECHO_CAST)] }),
    };
    // a block: its written lead, then a move and [gap, move] ...
    const BL = (lead, ...parts) => {
      const mv = parts.map(p => (Array.isArray(p) ? p[1] : p)), gaps = parts.map(p => (Array.isArray(p) ? p[0] : 0));
      let t = 0; const tank = [], bust = [], heal = [];
      mv.forEach((m, i) => { t += gaps[i]; for (const x of m.tank || []) tank.push(t + x); for (const x of m.bust || []) bust.push(t + x); for (const x of m.heal || []) heal.push(t + x); });
      return { lead, mv, gaps, tank, bust, heal, tail: mv[mv.length - 1].tail, nm: mv[mv.length - 1].nm || 0, span: t, names: mv.map(m => m.name), prev: null };
    };
    const plan = blocks => { blocks.forEach((b, i) => { b.prev = i ? blocks[i - 1] : null; b.calm = i ? Math.max(3.4, b.lead - b.prev.tail) : 0; }); return blocks; };
    const leadOf = (order, i) => (!i || order[i - 1] === order[i].prev) ? order[i].lead : Math.min(order[i].calm, has(order[i - 1], 'Grace Withdrawn') ? 2.3 : 9) + order[i - 1].tail;   // (what follows Grace has the short calm it was written with: Nightfall is the pause)
    // the sets of an order of blocks
    const lay = order => order.map((b, i) => { const lead = leadOf(order, i); return b.mv.map((m, j) => [j ? b.gaps[j] : lead, m.fn, m.name]); });
    // does the order leave the tank and the healer something to do, and keep the big tank hits apart?
    const HEALMAX = 28;   // (the longest the healer may go with no tank hit, raidwide or heal check, drawn or written)
    const orderOk = (order, rules, tankMax, next = 0, entry = []) => {
      let last = 0; const tank = [0], bust = [], heal = [0, ...entry], at = [];   // (the act is entered with the tank and the healer just busy)
      order.forEach((b, i) => {
        const start = last + leadOf(order, i); at.push(start);
        for (const x of b.tank) tank.push(start + x); for (const x of b.bust) bust.push(start + x); for (const x of b.heal) heal.push(start + x);
        last = start + b.span;
      });
      if (next) { const end = last + order[order.length - 1].tail + next; tank.push(end); heal.push(end); }   // (and what the next act opens with, next seconds after)
      const worst = list => { list.sort((a, b) => a - b); let w = 0; for (let i = 1; i < list.length; i++) w = Math.max(w, list[i] - list[i - 1]); return w; };
      if (worst(tank) > tankMax || worst(heal.concat(tank)) > HEALMAX || worst(heal) > 46) return false;
      bust.sort((a, b) => a - b); for (let i = 1; i < bust.length; i++) if (bust[i] - bust[i - 1] < 7) return false;
      for (let i = 1; i < order.length; i++) if (leadOf(order, i) - order[i - 1].nm > 15.8) return false;   // (a named step at least every 16 s: the upcoming feed)
      for (let i = 1; i < order.length; i++) if (isDance(order[i]) && isDance(order[i - 1])) return false;   // (two dances never run back to back)
      for (let i = 2; i < order.length; i++) if (isFloor(order[i]) && isFloor(order[i - 1]) && isFloor(order[i - 2])) return false;   // (nor three blocks in a row that only read the floor)
      return !rules || rules(order, at);
    };
    // Normal plays the blocks as written; Hard draws the middle (head and tail stay) until an order passes
    // (groups of block positions, drawn among themselves: the same load arrives at about the same time, so a party behind or ahead meets
    // the same fight. Threes by default over the middle of the act.)
    const threes = (from, to) => {   // (the windows start one or two blocks in on some pulls, so the same blocks do not always share a window)
      const g = [], o = Math.floor(f.rng() * 3); let i = from;
      for (const n of [o ? 3 - o : 3, ...Array(8).fill(3)]) { if (i >= to) break; g.push(Array.from({ length: Math.min(n, to - i) }, (_, k) => i + k)); i += n; }
      return g;
    };
    const sets = (blocks, groups, rules, tankMax, next, entry) => {
      plan(blocks);
      if (!H) return lay(blocks);
      let gs = typeof groups === 'function' ? groups() : groups;
      for (let k = 0; k < 12000; k++) {
        if (k && k % 1000 === 0 && typeof groups === 'function') gs = groups();   // (a window layout that cannot be made to fit is drawn again)
        const order = blocks.slice();
        for (const g of gs) { const d = f.shuffle(g.map(i => blocks[i])); g.forEach((pos, j) => { order[pos] = d[j]; }); }
        if (orderOk(order, rules, tankMax, next, entry)) return lay(order);
      }
      return lay(blocks);
    };
    const has = (b, n) => b.names.includes(n);
    const isFloor = b => b.names.every(n => /Wake|Chorus of the Fallen|Horizon Cut|Second Coil/.test(n));
    const isDance = b => !!b && b.names.some(n => /Wake|Chorus of the Fallen/.test(n));

    // I. Descent
    const descent = from => {
      const blocks = [
        BL(4, MV.glint()),
        BL(10, MV.wake({ echo: 1 })),
        BL(H ? 14 : 15, MV.crown()),
        BL(H ? 11 : 12, MV.glintT(), [6.5, MV.thrust()]),
        BL(H ? 12 : 14, MV.wake({ mirror: true, echo: H ? 2 : 0 }, H ? 'Mirrored Wake' : 'Eightfold Wake')),
        BL(H ? 16 : 15, MV.crown()),
        BL(H ? 9 : 11, MV.grace()),
        BL(H ? 14 : 16, MV.echo()),
        ...(H ? [BL(11, MV.wake({ chorus: true }, 'Chorus of the Fallen'))] : []),   // (Normal: two dances in this act, Hard three)
        BL(H ? 13 : 15, MV.thrust()),
      ];
      // (Grace and the Mirrored Wake wait until the party has seen a dance and a few moves, and a dance and Grace are not neighbours)
      const rules = (order, at) => {
        const g = order.findIndex(b => has(b, 'Grace Withdrawn')), m = order.findIndex(b => has(b, 'Mirrored Wake'));
        return at[g] >= 50 && at[m] >= 40 && !isDance(order[g - 1]) && !isDance(order[g + 1]);
      };
      return f.course({
        until: 0.76, onStart: () => setShadow(150),
        sets: sets(blocks, () => threes(1, blocks.length - 1), rules, 28),
        closing: [[10, glint, 'Glint'], [10, crown, 'Cinder Crown'], [12, () => wake(), 'Eightfold Wake']],
        next: starfallAct,
      }, from);
    };

    // II. Starfall (its gate is the Starwyrm's wall)
    const starfallAct = from => {
      const blocks = [
        BL(5, MV.starfall()),
        BL(H ? 10 : 12, MV.wake({ anchored: 2, echo: 1 }, 'Anchored Wake')),
        BL(H ? 12 : 14, MV.crown()),
        BL(H ? 11 : 12, MV.starfall(), ...(H ? [[4.6, MV.ember()], [4.4, MV.echoOne()]] : [])),
        BL(H ? 9 : 11, MV.glintT(), [7, MV.thrust()]),
        BL(H ? 11 : 13, MV.wake({ anchored: 2, chorus: true, echo: H ? 0 : 1 }, H ? 'Chorus of the Fallen' : 'Anchored Wake')),
        BL(H ? 11 : 14, MV.horizon({ rim: true })),
        BL(H ? 11 : 13, MV.crown()),
      ];
      return f.course({
        until: 0.52, onStart: () => setShadow(270),
        wall: { label: 'The Starwyrm', run: starwyrm, until: 'resolved', timeout: STARWYRM + 8 },
        sets: sets(blocks, () => threes(1, 7), null, 31),
        closing: [[10, () => starfall(2), 'Starfall'], [10, crown, 'Cinder Crown'], [12, () => wake({ anchored: 2 }), 'Anchored Wake']],
        next: ascendant,
      }, from);
    };

    // III. Ascendant
    const ascendant = from => {
      const blocks = [
        BL(22, MV.crown()),
        BL(H ? 11 : 12, MV.horizon({ star: true })),
        BL(H ? 12 : 13, MV.glintT(), [7, MV.thrust()]),
        BL(H ? 9 : 10, MV.echo()),
        BL(H ? 8 : 9, MV.starfall(3), [f.ct(5) + 0.1, MV.grace(true)]),   // a second Grace Withdrawn as the Starfall comes down (his cast begins as the towers land)
        BL(H ? 12 : 14, MV.crown()),
        BL(H ? 10 : 12, MV.horizon({ cross: !H }), ...(H ? [[7, MV.coil()]] : [])),   // (Normal: two cuts at once, the bare floor where the gaps meet)
        BL(H ? 11 : 13, MV.wake({ rings: 2, mirror: true, echo: 1 }, H ? 'Mirrored Wake' : 'Eightfold Wake')),
        BL(H ? 19 : 15, MV.crown()),
        BL(H ? 10 : 12, MV.starfall(3), ...(H ? [[5, MV.ember()], [4.4, MV.echoOne()]] : [])),
        BL(H ? 11 : 12, MV.thrust()),
        ...(H ? [BL(12, MV.wake({ rings: 2, noFlare: true, bar: true, echo: 0 }), [5, MV.grace(true)])] : []),   // (Hard: the dance that holds the second Grace)
        BL(H ? 12 : 14, MV.crown()),
        BL(H ? 10 : 12, MV.horizon()),
      ];
      // (Hard: the two Graces keep a quarter of the act apart, and a dive and a dance are not neighbours: one read at a time)
      const rules = (order, at) => {
        const gs = order.map((b, i) => (has(b, 'Grace Withdrawn') ? i : -1)).filter(i => i >= 0);
        if (gs.length === 2 && at[gs[1]] - at[gs[0]] < 50) return false;
        for (let i = 1; i < order.length; i++) if (has(order[i - 1], 'Second Coil') && (has(order[i], 'Mirrored Wake') || has(order[i], 'Eightfold Wake'))) return false;
        return true;
      };
      return f.course({
        until: 0.18, push: true,
        onStart: () => { if (!ascended) ascend(); },   // (practice from here: the wall that lays it was passed over)
        sets: sets(blocks, () => threes(1, blocks.length - 1), rules, 30, 9, [19]),   // (19: the flare that closes the dance laid at the wall)
        closing: [[10, crown, 'Cinder Crown'], [10, horizon, 'Horizon Cut'], [12, () => wake({ rings: 2 }), 'Eightfold Wake']],
        next: skyComes,
      }, from);
    };

    // IV. The Sky Comes Down: the shadow burns, and grows; the last dance runs round the clear ground left at the rim
    const skyComes = from => {
      const blocks = [
        BL(5, MV.crown()),
        BL(H ? 8 : 12, MV.horizon()),
        BL(H ? 10 : 14, MV.thrust()),
        BL(11, MV.wake({ ringR: 455, fallen: true, echo: 1, echoAt: 4.4 }, 'Chorus of the Fallen')),
        BL(H ? 14 : 16, MV.crown()),   // (the climax: the fallen's dance, a last Cinder Crown, then the party is taken to nothing and the sky comes down at once)
        BL(H ? 9 : 12, MV.grace()),
        BL(H ? 14 : 17, MV.horizon({ cross: H })),
      ];
      return f.course({
        onStart: () => { setShadow(340 - held, true); f.afterKeep(36, () => { if (f.state === 'live') setShadow(390 - held, true); }); },
        sets: sets(blocks, [[0, 1, 2], [4, 5, 6]], (order) => !has(order[6], 'Grace Withdrawn'), 31, 12),   // (the dance, then the last three in some order, but Grace never last: the closing passes would meet a party held at nothing)
        closing: [[10, crown, 'Cinder Crown'], [10, horizon, 'Horizon Cut'], [12, () => wake({ ringR: 455 }), 'Eightfold Wake']],
        ramp: 0.08,
      }, from);
    };

    descent(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.wake())
    f.moves = { glint, echo, wake, dance, crown, thrust, grace, starfall, darkEmber, coil, starwyrm, ascend, horizon, secondCoil, chorus, setShadow };
    f.caelumShadow = shadow;
  },
};

if (typeof module !== 'undefined') module.exports = { CAELUM };
