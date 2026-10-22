// Boss I: Grubnak, the Ogre Chef — "The Scullery". The dinner rush.
// One authored service, the same on every pull, that never lets up: four courses, each faster than the last, and a
// kitchen that catches fire half-way through. He never leaves the floor. The question is always where to stand: where
// your puddle goes down, where the casks land, which wall his charge hits, which plate is yours.
//   Appetiser (100% → 80%): his tools one at a time, with room to breathe. Grease Fire, Mince (half the room, told by
//     which cleaver glints), Ladle Spin (out), Lid Slam (in), Tenderize (tankbuster), Meat Toss (spread; each puddle
//     leaves a grease stain for good), Family Meal (stack), Larder Toss (casks land on the farthest two) and Gut Blast
//     (hide behind a cask).
//   Mains (80% → 50%): everything comes back in pairs. Butcher's Charge (bait it into brick), Chop Chop (Mince then
//     Ladle/Lid), the order rail (Order Up!: plates served one after another, the order shown by how fast each gold rim
//     fills), toss into meal, the charge with the casks already down, the rail again under Rolling Meatballs.
//   Flare-Up (50%): he heaves the stockpot onto the stove. The top third of the kitchen burns for the rest of the
//     fight and Flambé lights the grease stains you left; he drags the pot to the middle (solid, cover, and something
//     the charge can stop on) and it simmers over, out then in.
//   Second Sitting (50% → 18%): the smaller, burning kitchen. Whisk, Spice Rack, Boil Over arrive and pair at once.
//     Butcher's Charge into the pot is the short way (he's scalded and stuck, but the pot boils over).
//   Dessert (18% → 0%): the Dessert Trolley, a gauntlet of everything; silence; Last Orders; then he eats (Gorge)
//     until he drops or calls Last Call.
// A course ends at its HP gate, at the next set seam. If a slow party runs a course out, its last set runs again
// with +10% boss damage each time ("Behind on Orders", f.course in fight.js).
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Double Chop (both halves, the second drawn from the cast), Clogged Drains (grease round the drains for good), Belly
//   Flop (out from under him, thrown away; the tool on his back and the floor say what follows), Cleaver Toss (two
//   lines at the farthest, then back), Flambé in alternate stripes, Tenderized, two to a cask, toss and meal at once,
//   six plates for four on the rail with Stuffed for 4 s (no two in a row), Meat Hook on the healer as the tank takes
//   Tenderize, and Mise en Place: three tools laid out on the pass, served in that order much later (Service!).
//   The Dinner Rush (the Second Sitting's rail): the party sets the plates down itself, and they come up nearest him
//   first on his three beats (west chop, east chop with the lid, the ladle), so where each goes decides the order.

const GRUBNAK = {
  id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef',
  hp: { normal: 3350000, hard: 3300000 },
  autoDmg: { normal: 1600, hard: 1600 },
  enrage: { normal: 592, hard: 607 },   // the cast starts here and lands 8 s later (10:00 / 10:15)
  enrageName: 'Last Call',
  vuln: 0.5,   // every avoidable hit leaves you taking half again as much for a while
  arena: { theme: 'kitchen' },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const dmg = {
      grease: 8500, buster: 26000, mince: 13000, ladle: 13000, spread: H ? 6500 : 7500, stack: H ? 20000 : 22000,
      puddle: 2600, tower: 5000, towerFail: 14000, stuffed: 14000, simmer: 13000, whisk: 13000, spice: 13000, boil: H ? 46000 : 40000,
      gorge: 6500, heat: 6500, orders: 11000, meatball: 13000, flop: 13000, cleaver: 13000, flambe: 14000,
      charge: 14000, cask: 9000, gut: H ? 16000 : 15000, stove: 4500, burn: 4000, slam: 5000, hook: 7000,
    };
    const HW = ARENA.hw, HH = ARENA.hh;
    const LL = { ladle: 'Ladle Spin', lid: 'Lid Slam' };
    const MINCE = H ? 'Double Chop' : 'Mince';
    const STUFF = 4;   // Hard: Stuffed after a plate, so nobody takes two in a row
    const coin = (a, b) => (f.rng() < 0.5 ? a : b);
    const S = (...steps) => steps.filter(Boolean);
    let hot = false;   // the Flare-Up has set the stove line burning for good
    let pot = null;    // the stockpot in the middle, after the Flare-Up

    // --- building blocks ------------------------------------------------------------------
    const grease = () => {
      f.cast('Grease Fire', f.ct(4), 'raise');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.grease, hidden: true, tag: 'grease' });
    };
    const tenderize = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      f.cast('Tenderize', d, 'cleaver');
      const vuln = H && f.hasDebuff(tank.id, 'tenderized');
      // the cleave sits on the boss and turns to follow the tank until just before it lands
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 320, arc: 1.5, angle: B.facing }, delay: d,
        dmg: dmg.buster * (vuln ? 1.6 : 1), target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => { if (H) f.debuff(tank.id, 'tenderized', 30); } });
    };
    const halfRoom = side => {
      const a = B.facing + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
      return { kind: 'rect', x: B.x, y: B.y, angle: a, len: 1300, w: 2600 };
    };
    // he stands his ground until a combo he's started has landed, so what's drawn round him stays true
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    // Mince: one cleaver glints; that side of the room gets chopped. Hard (Double Chop): the other side 2.2 s later,
    // drawn from the start as a ghost behind the first.
    const mince = (delay = f.ct(4.5), side = coin('left', 'right')) => {
      const second = side === 'left' ? 'right' : 'left';
      B.lockFacing = true;
      f.cast(MINCE, delay, 'mince', { side, second: H ? second : null });
      f.aoe(halfRoom(side), delay, dmg.mince, { tag: 'mince' });
      if (H) f.aoe(halfRoom(second), delay + 2.2, dmg.mince, { tag: 'mince' });
      hold(delay + (H ? 2.2 : 0));
      f.afterKeep(delay + (H ? 2.3 : 0.1), () => { B.lockFacing = false; });
    };
    // Ladle Spin: stay out (point-blank circle). Lid Slam: get in (donut, safe under him).
    const ladleShape = () => ({ kind: 'circle', x: B.x, y: B.y, r: 240 });
    const lidShape = () => ({ kind: 'donut', x: B.x, y: B.y, r: 1300, r2: 190 });
    const ladleOrLid = (delay = f.ct(4), which = coin('ladle', 'lid')) => {
      f.cast(LL[which], delay, which);
      f.aoe(which === 'ladle' ? ladleShape() : lidShape(), delay, dmg.ladle, { tag: which });
      hold(delay);
    };
    // Chop Chop: Mince, then the tool on his back right after (both drawn from the cast)
    const chopChop = (second = coin('ladle', 'lid')) => {
      const d = f.ct(5), side = coin('left', 'right');
      B.lockFacing = true;
      f.cast('Chop Chop', d, 'mince', { side, then: second });
      f.aoe(halfRoom(side), d, dmg.mince, { tag: 'mince' });
      f.aoe(second === 'ladle' ? ladleShape() : lidShape(), d + 2.4, dmg.ladle, { tag: second });
      hold(d + 2.4);
      f.afterKeep(d - 0.01, () => { B.lockFacing = false; f.anim(second, 2.4); });
    };
    // where a Meat Toss puddle was stays greasy: harmless, until fire reaches it and burns it off
    const stain = (x, y) => {
      const stains = f.floor.filter(fl => fl.stain);
      if (stains.length >= 8) f.removeFloor(stains[0]);
      f.addFloor({ kind: 'grease', stain: 1, x: Math.round(x), y: Math.round(y), r: 62, dmg: dmg.burn });
    };
    // a stain that has burnt is gone (the drains' grease, on Hard, stays and burns again)
    f.ticker(() => {
      for (const fl of f.floor) if (fl.stain) { if (f.burning(fl)) fl.burnt = 1; else if (fl.burnt) { f.removeFloor(fl); break; } }
    });
    // Meat Toss: spread circles on players; where they land, a grease puddle stays for a while, then a stain.
    const meatToss = (targets) => {
      const d = f.ct(5.5);
      targets = targets || (f.alive().length > 1 ? f.nonTanks() : f.alive());
      if (!targets.length) return;
      f.cast('Meat Toss', d, 'toss');
      for (const p of targets) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.spread, follow: p.id, tag: 'spread',
          onResolve: () => {
            const q = f.alive().find(z => z.id === p.id);
            if (!q) return;
            const dur = H ? 28 : 24, x = q.x, y = q.y;
            f.puddle(x, y, H ? 95 : 80, dur, dmg.puddle, 1, 'grease');
            f.afterKeep(dur, () => stain(x, y));
          } });
      }
    };
    const familyMeal = (target, delay = f.ct(5.5)) => {
      const pool = f.alive().length > 1 ? f.nonTanks() : f.alive();
      target = target || f.pick(pool);
      if (!target) return;
      f.cast('Family Meal', delay, 'serve');
      // Normal forgives the tank staying on the boss; Hard wants everyone in
      const n = f.alive().length;
      f.mech({ type: 'stack', shape: { kind: 'circle', x: target.x, y: target.y, r: 115 }, delay, dmg: dmg.stack * Math.min(n, 4) / 4, follow: target.id,
        need: H ? n : Math.max(1, n - 1), tag: 'stack' });
    };
    // spread, then the stack right after it (Hard: both called at once; the meal is served to the tank, who wasn't
    // tossed, and lands a moment after the toss)
    const tossThenMeal = () => {
      meatToss();
      if (H) f.afterKeep(0.01, () => familyMeal(f.alive().length > 1 ? f.tank() : null, f.ct(5.5) + 2.5));
      else f.afterKeep(f.ct(5.5) + 0.2, () => familyMeal(null, f.ct(3.5)));
    };
    // Order Up! — the order rail: a plate (tower) per player round the kitchen, served one after another clockwise
    // from the top left. Every cloche's gold rim fills toward its own moment, so the next one up is always the fullest.
    // Hard: six plates for four (five for three), and a plate leaves you Stuffed for 4 s: a second one while Stuffed
    // hurts, so nobody takes two in a row and the party works out who takes the extra ones.
    const plateSpots = n => {
      const cy = hot ? 120 : 0, rx = hot ? HW - 170 : HW - 210, ry = hot ? 175 : HH - 120, base = -Math.PI / 2 - Math.PI / Math.max(n, 1);
      const out = [];
      for (let i = 0; i < n; i++) { const a = base + i * Math.PI * 2 / Math.max(n, 2); out.push([Math.round(Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)]); }
      return out;
    };
    // one plate on the rail: a cloche that wants one person when it comes up (Hard: and leaves them Stuffed)
    const plate = (x, y, delay) => f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: 72 }, delay, dmg: dmg.tower, failDmg: dmg.towerFail, need: 1, tag: 'plate',
      stuff: H ? STUFF : 0,
      onResolve: inside => {
        if (!H) return;
        for (const p of inside) {
          if (f.hasDebuff(p.id, 'stuffed')) f.damagePlayer(p, dmg.stuffed, { kind: 'stuffed' });
          f.debuff(p.id, 'stuffed', STUFF);
        }
      } });
    const orderUp = () => {
      const k = Math.max(1, f.alive().length), n = H ? k + (k === 4 ? 2 : k === 3 ? 1 : 0) : k;
      const d = f.ct(7.5), gap = H ? 1.5 : 1.6;
      f.cast('Order Up!', d, 'bell');
      plateSpots(n).forEach(([x, y], i) => plate(x, y, d + i * gap));
      return d + (n - 1) * gap;   // when the last plate lands
    };
    // Dinner Rush (Hard, the Second Sitting): the rail again, but the party lays it. He plants himself south of the
    // stockpot, facing it, and a hot plate hangs over every hero; where each stands when it comes down, the plate is
    // set down. Then he works the line in three beats, RUSH_BEAT apart, and the plates come up with them, nearest him
    // first: the first with Double Chop's west half, the second with its east half and a Lid Slam at once (only the
    // west side of the quiet circle by him is safe), the last two together with a Ladle Spin (well out).
    // The thinking: the plate for the first beat goes nearest him, on his east side; the second a little farther, on
    // his west side but inside the lid's reach, at its edge (whoever served the first is Stuffed and needs room there);
    // the other two out of the ladle's reach. The order follows the distances, so setting them down decides it: a
    // plate set nearer than it should be comes up on the wrong beat. Known, it is a short walk: two serve at his side
    // and never leave him, two serve from range. The same spot, facing and beats every pull.
    const RUSH_AT = { x: 0, y: 175 }, RUSH_BEAT = 2.2, RUSH_FIRST = 4, RUSH_LID = 230;   // (a wider quiet circle than the plain Lid Slam's: a plate has to fit in its west half with room beside it)
    const rushHalf = side => ({ kind: 'rect', x: RUSH_AT.x, y: RUSH_AT.y, angle: side === 'west' ? Math.PI : 0, len: 1300, w: 2600 });
    const dinnerRush = () => {
      const d = f.ct(4), at = RUSH_AT, al = f.alive();
      f.moveBoss(at.x, at.y, 700);
      B.lockFacing = true; B.facing = -Math.PI / 2;
      hold(d + RUSH_FIRST + RUSH_BEAT * 2 + 0.3);
      f.afterKeep(d + RUSH_FIRST + RUSH_BEAT * 2 + 0.3, () => { B.lockFacing = false; });
      f.cast('Dinner Rush', d, 'bell');
      // the double chop is drawn from the cast: the west half with the first plate, the east half with the second
      f.aoe(rushHalf('west'), d + RUSH_FIRST, dmg.mince, { tag: 'mince' });
      f.aoe(rushHalf('east'), d + RUSH_FIRST + RUSH_BEAT, dmg.mince, { tag: 'mince' });
      // once every plate is down (the last drop to land lays the rail): nearest him first, the last two together
      const down = [];
      let left = al.length;
      const lay = () => {
        down.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
        down.forEach((q, i) => plate(q.x, q.y, RUSH_FIRST + Math.min(i, 2) * RUSH_BEAT));
        f.aoe({ kind: 'donut', x: at.x, y: at.y, r: 1300, r2: RUSH_LID }, RUSH_FIRST + RUSH_BEAT, dmg.ladle, { tag: 'lid' });
      };
      for (const p of al) {
        const m = f.mech({ type: 'drop', shape: { kind: 'circle', x: p.x, y: p.y, r: 72 }, delay: d, dmg: 0, follow: p.id, tag: 'platedrop', avoidable: false, color: '#3d8bff',
          onResolve: () => {
            if (f.alive().some(q => q.id === p.id)) down.push({ x: Math.round(m.shape.x), y: Math.round(m.shape.y) });
            if (--left === 0) lay();
          } });
      }
      // the ladle shows as the first half lands
      f.afterKeep(d + RUSH_FIRST, () => f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 240 }, RUSH_BEAT * 2, dmg.ladle, { tag: 'ladle' }));
    };
    // Spice Rack: jars pour onto set spots (a pattern for each time he uses it), and one locks under each DPS / healer
    const SPICE = { a: [[-300, 40], [0, 220], [300, 40]], b: [[-220, 210], [220, 210]], c: [[-340, 190], [0, 10], [340, 190]] };
    const spiceRack = (spots, count = spots.length) => {
      const d = f.ct(6);
      f.cast('Spice Rack', d, 'toss');
      for (const [x, y] of spots.slice(0, count)) f.aoe({ kind: 'circle', x, y, r: 140 }, d, dmg.spice, { tag: 'spice' });
      for (const p of f.nonTanks()) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.spice, tag: 'spice', follow: p.id, lockAt: 2.5 });
    };
    // Whisk: a cross of beams through him that turns 30° four times. Walk with it. (dir and start angle are set)
    const whisk = (dir, a0) => {
      f.cast('Whisk', f.ct(3), 'whisk');
      hold(f.ct(3) + 4.5);
      for (let i = 0; i < 4; i++) {
        f.afterKeep(i * 1.5, () => f.aoe({ kind: 'cross', x: B.x, y: B.y, angle: a0 + dir * i * Math.PI / 6, len: 1300, w: 130 }, f.ct(3), dmg.whisk, { tag: 'whisk' }));
      }
    };
    const boilOver = () => {
      const d = f.ct(6);
      f.cast('Boil Over', d, 'boil');
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: B.x, y: B.y, r: 520 }, delay: d, dmg: dmg.boil, falloff: 680, tag: 'boil' });
    };
    const farthest = (pool, n) => [...pool].sort((a, b) => Math.hypot(b.x - B.x, b.y - B.y) - Math.hypot(a.x - B.x, a.y - B.y)).slice(0, n);
    // --- the room ---------------------------------------------------------------------------------
    // the stove line runs along the top wall; a fire there fills the top third of the kitchen
    const stoveZone = () => ({ kind: 'rect', x: -HW, y: -HH + HH * 2 / 6, angle: 0, len: HW * 2, w: HH * 2 / 3 });
    const casks = () => f.props.filter(p => p.kind === 'cask');
    // Butcher's Charge: he lowers his head at his tank (the line follows them until a second before) and charges until
    // he hits something. Anyone on the line is run over. A brick wall: stuck for 4 s, taking 20% more damage. The stove
    // line: the burners erupt into a wall of fire across the top of the room for 10 s. A cask: smashed to splinters.
    // The stockpot (after the Flare-Up): he's scalded and stuck the same, but the pot boils over round itself.
    const butcherCharge = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      B.lockFacing = true;
      f.cast("Butcher's Charge", d, 'charge');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: B.facing, len: 1400, w: 150 }, delay: d, dmg: dmg.charge, tag: 'charge',
        aimFromBoss: tank.id, lockAt: 1.0, onResolve: () => charge(m.shape.angle) });
    };
    const stuck = () => { B.stunUntil = f.t + 4; B.exposedUntil = f.t + 4; B.exposed = 0.2; f.emit({ t: 'roomev', k: 'stuck', dur: 4 }); };
    const charge = a => {
      const c = Math.cos(a), s = Math.sin(a);
      let L = 0; while (L < 1500 && ARENA.sd(B.x + c * (L + 10), B.y + s * (L + 10)) < -FIGHT.BOSS_R) L += 10;
      const hit = PROPS.ray(B.x, B.y, B.x + c * L, B.y + s * L, f.props, FIGHT.BOSS_R * 0.7);
      const stop = hit ? hit.t * L : L, end = ARENA.clamp({ x: B.x + c * stop, y: B.y + s * stop }, FIGHT.BOSS_R);
      f.anim('charge', 0.5);
      B.moveTo = { x: end.x, y: end.y, speed: 1150, done: () => {
        B.lockFacing = false;
        const wx = end.x + c * FIGHT.BOSS_R, wy = end.y + s * FIGHT.BOSS_R;
        f.emit({ t: 'propfx', k: 'slam', x: Math.round(wx), y: Math.round(wy), a: +a.toFixed(2), boss: 1 });
        if (hit && hit.prop.kind === 'pot') {
          // scalded: stuck, and the pot slops over in a ring round itself
          stuck();
          f.aoe({ kind: 'circle', x: hit.prop.x, y: hit.prop.y, r: 230 }, 2.4, dmg.simmer, { tag: 'simmer' });
          return;
        }
        if (hit) { f.breakProp(hit.prop, 'charge'); return; }
        if (wy < -HH + 40 && !hot) {
          // the stove line: every burner erupts
          f.emit({ t: 'roomev', k: 'stove', x: Math.round(wx), dur: 11.2 });
          f.zone({ shape: stoveZone(), dur: 10, delay: 1.2, effect: 'burn', dmg: dmg.stove, tag: 'stovefire' });
          f.afterKeep(1.2, () => f.ignite(stoveZone()));
          return;
        }
        // a brick wall (or the burning stove line, after the Flare-Up): he's stuck in it, dazed
        stuck();
      } };
    };
    // Larder Toss: he rips casks off the side shelves and throws them at the two farthest players (each circle follows
    // its player until 1.6 s before). A cask stays where it lands: solid, and the only shelter from Gut Blast.
    const larderToss = () => {
      const d = f.ct(4.5);
      const pool = f.alive().length > 2 ? f.nonTanks() : f.alive();
      const far = farthest(pool, 2);
      if (!far.length) return;
      f.cast('Larder Toss', d, 'larder');
      for (const p of far) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 85 }, delay: d, dmg: dmg.cask, tag: 'cask', follow: p.id, lockAt: 1.6,
          onResolve: () => {
            // it rolls to a stop well off the wall, so there's room to stand behind it
            const at = ARENA.clamp({ x: m.shape.x, y: m.shape.y }, 120);
            if (hot) at.y = Math.max(at.y, -60);   // not into the fire
            for (let i = 0; i < 3; i++) for (const o of f.props) {   // not on top of another cask
              const dd = Math.hypot(o.x - at.x, o.y - at.y), min = (o.r || 40) + 30 + 26;
              if (dd >= min) continue;
              if (dd < 1) at.x += min; else { const k = (min - dd) / dd; at.x += (at.x - o.x) * k; at.y += (at.y - o.y) * k; }
              ARENA.clamp(at, 120);
            }
            if (Math.hypot(at.x - B.x, at.y - B.y) < FIGHT.BOSS_R + 40) return;   // he caught it himself
            while (casks().length >= 4) f.breakProp(casks()[0], 'room');
            f.addProp({ kind: 'cask', x: at.x, y: at.y, r: 30, hp: 2, solid: true, cover: true });
          } });
      }
    };
    // Gut Blast: a roar across the whole kitchen. Hide behind a cask or the pot (Hard: two to each). Every cask takes a hit.
    const gutBlast = () => {
      const d = f.ct(5);
      f.cast('Gut Blast', d, 'gut');
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: B.x, y: B.y, r: 2400 }, delay: d, dmg: dmg.gut, tag: 'gut', cover: true, chip: 'all', coverCap: H ? 2 : 0 });
    };
    // Clogged Drains (Hard): the drains back up and grease spills out round them, for good
    const DRAINS = [[0, 0], [-HW * 0.55, HH * 0.35], [HW * 0.55, HH * 0.35]];
    const drains = () => {
      const d = f.ct(4);
      f.cast('Clogged Drains', d, 'drains');
      f.emit({ t: 'roomev', k: 'drains', dur: d });   // (visual only: the grates bubble and steam until they spill)
      f.afterKeep(d, () => {
        for (const [x, y] of DRAINS) {
          const n = f.floor.filter(fl => fl.kind === 'grease' && Math.hypot(fl.x - x, fl.y - y) < 160).length;
          const a = f.rng() * Math.PI * 2, off = n ? 60 + n * 30 : 0;
          f.addFloor({ kind: 'grease', x: Math.round(x + Math.cos(a) * off), y: Math.round(y + Math.sin(a) * off * 0.7), r: 70 + Math.round(f.rng() * 20), dmg: dmg.burn });
        }
      });
    };
    // Meat Hook (Hard): a chain off the ceiling rail hooks a player (the healer, as the tank takes Tenderize) and drags
    // them 210 toward the stove. Through burning grease, or into the burners at the end of it, they catch fire.
    const meatHook = () => {
      const d = f.ct(4.5);
      const pool = f.nonTanks().length ? f.nonTanks() : f.alive(), p = pool.find(q => q.role === 'healer') || pool[0];
      if (!p) return;
      const m = f.mech({ type: 'hook', shape: { kind: 'rect', x: p.x, y: p.y, angle: -Math.PI / 2, len: 210, w: 80 }, delay: d, dmg: 0, follow: p.id, lockAt: 1.2,
        tag: 'hook', avoidable: false,
        onResolve: () => {
          const q = f.alive().find(z => z.id === p.id);
          if (!q) return;
          const from = { x: q.x, y: q.y }, res = f.knock(q, q.x, q.y + 20, 210, { slam: dmg.hook, slamAt: 30 });
          const burnt = f.floor.some(fl => fl.kind === 'grease' && f.burning(fl) && PROPS.segDist(fl.x, fl.y, from.x, from.y, res.dest.x, res.dest.y) < fl.r);
          const inFire = hot && res.dest.y < -HH + HH * 2 / 3;
          if (burnt || inFire || (res.slam && res.dest.y < -HH + 50)) { f.damagePlayer(q, dmg.burn * 2, { kind: 'burn', avoidable: true }); f.emit({ t: 'propfx', k: 'ignite', x: Math.round(res.dest.x), y: Math.round(res.dest.y), r: 40 }); }
          void m;
        } });
    };
    // the stockpot's rings: the coils go dull, red, white-hot, ring by ring out from the pot (or in to it)
    const simmer = (outward, at = { x: 0, y: 0 }) => {
      const rings = [[0, 130], [130, 260], [260, 390], [390, Math.max(560, ARENA.R + 20)]];
      if (!outward) rings.reverse();
      const step = H ? 1.15 : 1.35;
      rings.forEach(([r2, r], i) => {
        const shape = r2 === 0 ? { kind: 'circle', x: at.x, y: at.y, r } : { kind: 'donut', x: at.x, y: at.y, r, r2 };
        f.aoe(shape, 3 + i * step, dmg.simmer, { tag: 'simmer' });
      });
    };
    const simmerCast = outward => { f.cast('Simmer', 3, 'boil'); simmer(outward, pot || { x: 0, y: 0 }); };

    // Rolling Meatballs: he lobs giant meatballs against the walls. Each one wobbles where it landed (chevrons and a
    // lane across the room), then rolls straight across the kitchen. The lanes are set for each time he does it.
    const LANES = {
      rail: [-Math.PI / 2, 0, Math.PI, Math.PI / 2],             // between the plates
      b: [0.6, Math.PI - 0.6, Math.PI / 2, 0],
      c: [Math.PI, 0.35, Math.PI / 2 + 0.9, -0.35],
    };
    const meatballs = lanes => {
      const d = f.ct(3);
      f.cast('Rolling Meatballs', d, 'meatballs');
      lanes.slice(0, H ? 4 : 3).forEach((a, i) => {
        const R = ARENA.edge(a) - 50;
        f.rollerPreview({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: a + Math.PI, speed: H ? 330 : 300, r: 44, delay: d - 1.4 + i * (H ? 0.5 : 0.7) + 1.7 });   // (the lane shows from the cast start)
        f.afterKeep(d - 1.4 + i * (H ? 0.5 : 0.7), () => f.roller({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: a + Math.PI,
          speed: H ? 330 : 300, delay: 1.7, dmg: dmg.meatball, r: 44 }));
      });
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Belly Flop: he flops down where he stands (get out from under him), and the shock throws everyone away from him.
    // The tool on his back says what comes straight after, and it's drawn on the floor from the start: the Ladle Spin
    // (stay out) or the Lid Slam (run back in).
    const bellyFlop = (then = coin('ladle', 'lid')) => {
      const d = f.ct(4);
      f.cast('Belly Flop', d, 'flop', { then });
      hold(d + 2.8);
      f.aoe(then === 'ladle' ? ladleShape() : lidShape(), d + 2.8, dmg.ladle, { tag: then });
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: B.x, y: B.y, r: 230 }, delay: d, dmg: dmg.flop, tag: 'flop', throwDist: 200,
        onResolve: () => {
          // thrown into a wall or a cask, it hurts
          for (const p of f.alive()) f.knock(p, B.x, B.y, 200, { slam: dmg.slam });
          f.anim(then, 2.8);
        } });
    };
    // Cleaver Toss: a cleaver flies along a line at each of the two farthest players (the line follows them until a
    // second before it flies), then comes back along the same line to his hand.
    const cleaverToss = () => {
      const d = f.ct(4.5);
      const far = farthest(f.nonTanks().length ? f.nonTanks() : f.alive(), 2);
      if (!far.length) return;
      f.cast('Cleaver Toss', d, 'throw');
      for (const p of far) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: 0, len: 1300, w: 120 }, delay: d, dmg: dmg.cleaver,
          tag: 'cleaver', aimFromBoss: p.id, lockAt: 1.0,
          onResolve: () => f.aoe(Object.assign({}, m.shape), 1.5, dmg.cleaver, { tag: 'cleaverback' }) });
      }
    };
    // Flambé: brandy splashes in stripes across the kitchen and goes up in flames. Any stripe that burns sets the grease
    // in it alight. Normal: six stripes from the stove down, catching one after another from one side (dir); stay behind
    // the fire. Hard: every other stripe (first: which set), then the rest 2.2 s later; step into a burnt stripe.
    const flambe = ({ dir = 1, tall = true, first = 0 } = {}) => {
      const d = f.ct(5);
      f.cast('Flambé', d, 'flambe');
      const burn = s => ({ tag: 'flambe', onResolve: () => f.ignite(s, 4) });
      if (!H) {
        const n = 6, w = ARENA.hw * 2 / n;
        for (let k = 0; k < n; k++) {
          const i = dir > 0 ? k : n - 1 - k, s = { kind: 'rect', x: -ARENA.hw + w * (i + 0.5), y: -ARENA.hh, angle: Math.PI / 2, len: ARENA.hh * 2, w };
          f.aoe(s, d + k * 0.85, dmg.flambe, burn(s));
        }
        return;
      }
      const n = tall ? 6 : 4, span = tall ? ARENA.hw * 2 : ARENA.hh * 2, len = tall ? ARENA.hh * 2 : ARENA.hw * 2, w = span / n;
      const lane = i => (tall ? { kind: 'rect', x: -ARENA.hw + w * (i + 0.5), y: -ARENA.hh, angle: Math.PI / 2, len, w }
        : { kind: 'rect', x: -ARENA.hw, y: -ARENA.hh + w * (i + 0.5), angle: 0, len, w });
      for (let i = 0; i < n; i++) f.aoe(lane(i), i % 2 === first ? d : d + 2.2, dmg.flambe, burn(lane(i)));
    };
    // Mise en Place (Hard): he lays three tools out on the pass, left to right: a cleaver lying on one side of its board
    // (that half gets chopped), the ladle, the lid. Much later, Service! brings them out in that order, 2 s apart.
    let plan = null;
    const mise = () => {
      const d = f.ct(3);
      f.cast('Mise en Place', d, 'serve');
      plan = { tools: f.shuffle(['cleaver', 'ladle', 'lid']), side: coin('left', 'right') };
      f.afterKeep(d, () => f.emit({ t: 'roomev', k: 'mise', tools: plan.tools, side: plan.side, dur: 120 }));
    };
    const service = () => {
      if (!plan) return;
      const d = f.ct(3.5), beat = 2;
      f.cast('Service!', d, 'bell');
      f.emit({ t: 'roomev', k: 'mise', tools: plan.tools, side: plan.side, dur: d + beat * 2 + 0.6, serve: d, beat });
      B.lockFacing = true;
      hold(d + beat * 2 + 0.2);
      plan.tools.forEach((tool, i) => {
        const at = d + i * beat;
        if (tool === 'cleaver') f.aoe(halfRoom(plan.side), at, dmg.mince, { tag: 'mince' });
        else f.aoe(tool === 'ladle' ? ladleShape() : lidShape(), at, dmg.ladle, { tag: tool });
      });
      f.afterKeep(d + beat * 2 + 0.2, () => { B.lockFacing = false; });
      plan = null;
    };

    // --- set pieces -----------------------------------------------------------------------------
    // Flare-Up: he heaves the stockpot onto the stove; the burners catch and the top third of the kitchen burns for the
    // rest of the fight, lighting any grease it touches.
    const flareUp = () => {
      const d = f.ct(6);
      f.cast('Flare-Up', d, 'boil');
      f.zone({ shape: stoveZone(), dur: 9999, delay: d, effect: 'burn', dmg: dmg.stove, tag: 'stovefire' });
      // the blast of heat as it catches reaches the whole kitchen
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0, look: 'heat' }, delay: d, dmg: dmg.heat, hidden: true, tag: 'grease' });   // (look: how the tell draws it; visual only)
      f.afterKeep(d, () => {
        hot = true;
        f.emit({ t: 'roomev', k: 'stove', x: 0, dur: 9999 });
        f.ignite(stoveZone(), 8);
      });
    };
    // then he drags the pot down to the middle of what's left: solid, cover, and something to charge into
    const potToMiddle = () => {
      const at = { x: 0, y: 60 };
      f.anim('leap', 1.2);
      f.moveBoss(at.x, at.y + 48 + FIGHT.BOSS_R * 0.7 + 8, 700);
      f.afterKeep(0.9, () => {
        pot = f.addProp({ kind: 'pot', x: at.x, y: at.y, r: 48, hp: 0, solid: true, cover: true, rubble: false });
        f.emit({ t: 'propfx', k: 'slam', x: at.x, y: at.y + 40, a: Math.PI / 2, boss: 1 });
      });
    };
    const lastOrders = () => {
      f.cast('Last Orders', f.ct(5), 'raise');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0, look: 'orders' }, delay: f.ct(5), dmg: dmg.orders, hidden: true, tag: 'grease' });   // (look: visual only)
    };
    // Gorge: he eats, hitting everyone and getting stronger each time
    const gorge = () => {
      f.cast('Gorge', 2, 'gorge');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2, dmg: dmg.gorge, hidden: true, tag: 'gorge' });
      B.dmgUp += 0.1;
    };

    // --- the service ----------------------------------------------------------------------------
    const appetiser = from => f.course({
      until: 0.8,
      sets: [
        S(H && [3, drains, 'Clogged Drains'], [H ? 3 : 6, grease, 'Grease Fire'],
          [10, () => mince(), MINCE], [H ? 12 : 11, () => ladleOrLid(f.ct(4), 'ladle'), 'Ladle Spin'], [10, () => ladleOrLid(f.ct(4), 'lid'), 'Lid Slam']),
        S([11, tenderize, 'Tenderize']),
        S([12, () => meatToss(), 'Meat Toss'], [12, () => familyMeal(), 'Family Meal']),
        S([12, larderToss, 'Larder Toss'], [10, gutBlast, 'Gut Blast']),
        S([11, grease, 'Grease Fire']),
      ],
      closing: [[9, larderToss, 'Larder Toss'], [10, gutBlast, 'Gut Blast'], [10, grease, 'Grease Fire']],
      next: mains,
    }, from);

    const mains = from => f.course({
      until: 0.5,
      sets: [
        S([5, butcherCharge, "Butcher's Charge"]),
        S([13, () => chopChop(), 'Chop Chop']),
        S([13, tenderize, 'Tenderize']),
        S([12, orderUp, 'Order Up!']),
        S([15, tossThenMeal, 'Meat Toss']),
        S(H && [10, () => bellyFlop(), 'Belly Flop'], [H ? 12 : 15, larderToss, 'Larder Toss'], [8, butcherCharge, "Butcher's Charge"], [10, gutBlast, 'Gut Blast']),
        S([12, grease, 'Grease Fire']),
        S([12, orderUp, 'Order Up!'], [6, () => meatballs(LANES.rail), 'Rolling Meatballs'], H && [2.5, cleaverToss, 'Cleaver Toss']),
        S([H ? 11.5 : 14, tenderize, 'Tenderize']),
        S([10, () => chopChop(), 'Chop Chop']),
        S([12, tossThenMeal, 'Meat Toss']),
      ],
      closing: [[10, orderUp, 'Order Up!'], [6, () => meatballs(LANES.rail), 'Rolling Meatballs'], [16, () => chopChop(), 'Chop Chop'], [10, grease, 'Grease Fire']],
      next: flare,
    }, from);

    // no downtime: he stays on the floor while the kitchen catches
    const flare = from => f.course({
      sets: [
        S([6, flareUp, 'Flare-Up']),
        S([8, () => flambe({ dir: 1, tall: true, first: 0 }), 'Flambé']),
        S([12, potToMiddle, 'Stockpot'], [2.5, () => simmerCast(true), 'Simmer'], [7.2, () => simmerCast(false), 'Simmer']),
        S([9]),
      ],
      next: secondSitting,
    }, from);

    const secondSitting = from => f.course({
      until: 0.18,
      sets: [
        S([4, () => whisk(1, 0.3), 'Whisk']),
        S([10, () => { spiceRack(SPICE.a); f.afterKeep(f.ct(6) + 0.3, () => ladleOrLid(f.ct(3))); }, 'Spice Rack']),
        S([14, larderToss, 'Larder Toss'], [6, boilOver, 'Boil Over']),
        S([10, () => { tenderize(); if (H) meatHook(); }, 'Tenderize'], [8, gutBlast, 'Gut Blast']),
        H && S([8, mise, 'Mise en Place']),
        // the rail with Meat Toss landing just after the last plate (Hard: the Dinner Rush instead, the plates set by the
        // party, served on his three beats; the cast names come with each beat)
        H ? S([10, dinnerRush, 'Dinner Rush'], [f.ct(4), () => f.cast('Double Chop', RUSH_FIRST, 'mince', { side: 'left', second: 'right' }), 'Double Chop'],
          [RUSH_FIRST + 0.05, () => f.cast('Lid Slam', RUSH_BEAT - 0.1, 'lid'), 'Lid Slam'], [RUSH_BEAT, () => { f.cast('Ladle Spin', RUSH_BEAT - 0.1, 'ladle'); f.anim('ladle', RUSH_BEAT); }, 'Ladle Spin'])
          : S([10, () => { const last = orderUp(); f.afterKeep(Math.max(0.5, last - f.ct(5.5) + 1), () => meatToss()); }, 'Order Up!']),   // the toss lands just after the last plate
        S([15, butcherCharge, "Butcher's Charge"]),
        S([12, grease, 'Grease Fire']),
        H && S([8, service, 'Service!']),
        S([12, () => whisk(-1, 0.9), 'Whisk'], [3, () => meatballs(LANES.b), 'Rolling Meatballs']),
        S([10, () => { familyMeal(); f.afterKeep(1.5, () => spiceRack(SPICE.b, 2)); }, 'Family Meal']),
        S([14, () => (H ? mince() : chopChop()), H ? 'Double Chop' : 'Chop Chop'], H && [9, () => bellyFlop(), 'Belly Flop']),
        S([10, tenderize, 'Tenderize']),
      ].filter(Boolean),
      closing: [[10, () => whisk(1, 0.3), 'Whisk'], [3, () => meatballs(LANES.b), 'Rolling Meatballs'], [14, () => chopChop(), 'Chop Chop'], [10, grease, 'Grease Fire']],
      next: dessert,
    }, from);

    // the Dessert Trolley: everything at once, then quiet, then Last Orders, then he eats until he drops
    const dessert = from => {
      const k = H ? 0.85 : 1, w = coin('ladle', 'lid');
      return f.course({
        sets: [
          // each beat lands just as the next is called: the fire passes, then the toss, the balls, the chop...
          S([3, () => flambe({ dir: -1, tall: false, first: 1 }), 'Flambé'],
            [7 * k, () => meatToss(), 'Meat Toss'],
            [2.5 * k, () => meatballs(LANES.c), 'Rolling Meatballs'],
            H && [1.5, cleaverToss, 'Cleaver Toss'],
            [H ? 2.5 : 4, () => mince(), MINCE],
            [3.5 * k, () => ladleOrLid(f.ct(4), w), LL[w]],
            [4 * k, () => spiceRack(SPICE.c), 'Spice Rack'],
            [4 * k, () => familyMeal(), 'Family Meal'],
            [4 * k, () => whisk(H ? -1 : 1, 0), 'Whisk']),
          S([12, lastOrders, 'Last Orders']),
        ],
        closing: [[15, gorge, 'Gorge']],
        ramp: 0,   // Gorge brings its own
      }, from);
    };

    appetiser(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.gutBlast())
    f.moves = { grease, tenderize, mince, ladleOrLid, chopChop, meatToss, tossThenMeal, familyMeal, orderUp, spiceRack, whisk, boilOver,
      meatballs, bellyFlop, cleaverToss, flambe, butcherCharge, larderToss, gutBlast, drains, meatHook, charge, flareUp, potToMiddle,
      mise, service, dinnerRush, lastOrders, gorge, simmerCast };
  },
};

if (typeof module !== 'undefined') module.exports = { GRUBNAK };
