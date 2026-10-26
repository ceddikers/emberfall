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
//     fills), toss into meal, the charge with the casks already down, the rail again under Rolling Meatballs. Normal adds
//     casks with a Mince behind them and a Family Meal with a Ladle Spin behind it. On Normal each course casts a little
//     quicker than the last (`pace`); Hard is quick from the pull.
//   Flare-Up (50%): he heaves the stockpot onto the stove. The top third of the kitchen burns for the rest of the
//     fight and Flambé lights the grease stains you left; he drags the pot to the middle (solid, cover, and something
//     the charge can stop on) and it simmers over, out then in.
//   Second Sitting (50% → 18%): the smaller, burning kitchen. Whisk, Spice Rack, Boil Over arrive and pair at once.
//     Butcher's Charge into the pot is the short way (he's scalded and stuck, but the pot boils over).
//   Dessert (18% → 0%): the Dessert Trolley, a gauntlet of everything; silence; Last Orders; then he eats (Gorge)
//     until he drops or calls Last Call.
// The tank's own small move, all the way through: Skewer. He hurls a skewer along a line from himself through his tank (the
// line follows them until just before it flies). A light hit on the tank; anyone else on the line takes it worse. The tank
// takes it, or steps off the line once it locks. It's the answer to "where do I stand?" for the one who holds him: the line
// runs out from wherever the tank stood, so the tank decides which side of the room it sweeps. It sits in the quiet stretches
// between the cleavers and the charges so the tank always has a beat of their own coming, never inside a cleaver's cooldown and never
// on top of a rail (Order Up!) or the Dinner Rush.
// A course ends at its HP gate, at the next set seam. If a slow party runs a course out, its last set runs again
// with +10% boss damage each time ("Behind on Orders", f.course in fight.js).
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Double Chop (both halves, the second drawn from the cast), Clogged Drains (grease round the drains for good), Belly
//   Flop (out from under him, thrown away; the tool on his back and the floor say what follows), Cleaver Toss (two
//   lines at the farthest, then back), Flambé in alternate stripes, Tenderized, two to a cask, toss and meal at once,
//   six plates for four on the rail with Stuffed for 4 s (no two in a row), Meat Hook on the healer as the tank takes
//   Tenderize, and Mise en Place: three tools laid out on the pass, served in that order much later (Service!).
//   The Dinner Rush (the Second Sitting's rail, on both difficulties): three beats (west chop, east chop with the lid, the
//   ladle) with the plates coming up nearest him first. Hard: the party sets the plates down itself, so where each goes
//   decides the order. Normal: the four plates are already laid in the right places and nobody is Stuffed.

const GRUBNAK = {
  id: 'grubnak', name: 'Grubnak', title: 'The Ogre Chef',
  hp: { normal: 3415000, hard: 4225000 },
  autoDmg: { normal: 1750, hard: 1750 },
  enrage: { normal: 592, hard: 607 },   // the cast starts here and lands 8 s later (10:00 / 10:15)
  enrageName: 'Last Call',
  vuln: 0.5,   // every avoidable hit leaves you taking half again as much for a while
  arena: { theme: 'kitchen' },
  gates: [0.8, 0.5, 0.18],   // where the courses change (ticks on the boss bar; fight.js course)

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const dmg = {
      grease: H ? 9800 : 9800, buster: H ? 29900 : 29900, mince: H ? 14950 : 14950, ladle: H ? 14950 : 14950, spread: H ? 7900 : 8650, stack: H ? 23500 : 25300,
      puddle: H ? 2850 : 3000, tower: H ? 5750 : 5750, towerFail: H ? 16100 : 16100, stuffed: H ? 16100 : 16100, simmer: H ? 14950 : 14950, whisk: H ? 14950 : 14950, spice: H ? 14950 : 14950, boil: H ? 50150 : 46000,
      gorge: H ? 7450 : 7450, heat: H ? 7450 : 7450, orders: H ? 12650 : 12650, meatball: H ? 14950 : 14950, flop: H ? 14950 : 14950, cleaver: H ? 14950 : 14950, flambe: H ? 15250 : 16100,
      skewer: H ? 6100 : 5500, charge: H ? 15250 : 16100, cask: H ? 9800 : 10350, gut: H ? 17450 : 17250, stove: H ? 4900 : 5200, burn: H ? 4350 : 4600, slam: H ? 5450 : 5750, hook: H ? 7650 : 8050,
    };
    const HW = ARENA.hw, HH = ARENA.hh;
    const LL = { ladle: 'Ladle Spin', lid: 'Lid Slam' };
    const MINCE = H ? 'Double Chop' : 'Mince';
    const STUFF = 4;   // Hard: Stuffed after a plate, so nobody takes two in a row
    const coin = (a, b) => (f.rng() < 0.5 ? a : b);
    const S = (...steps) => steps.filter(Boolean);
    // Normal: each course is a little quicker than the last ("four courses, each faster than the last"); Hard is fast from the start
    let pace = 1;
    const ct = sec => f.ct(sec) * pace;
    const quicker = k => () => { if (!H) pace = k; };
    let hot = false;   // the Flare-Up has set the stove line burning for good
    let pot = null;    // the stockpot in the middle, after the Flare-Up

    // --- building blocks ------------------------------------------------------------------
    const grease = () => {
      f.cast('Grease Fire', ct(4), 'raise');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: ct(4), dmg: dmg.grease, hidden: true, tag: 'grease' });
    };
    const tenderize = () => {
      const tank = f.tank(); if (!tank) return;
      const d = ct(4.5);
      f.cast('Tenderize', d, 'cleaver');
      const vuln = H && f.hasDebuff(tank.id, 'tenderized');
      // the cleaver comes down on the tank: a circle that follows them until just before it lands (anyone else in it
      // takes a share of the blow)
      f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 95 }, delay: d,
        dmg: dmg.buster * (vuln ? 1.6 : 1), target: tank.id, follow: tank.id, lockAt: 0.5, tag: 'buster',
        onResolve: () => { if (H) f.debuff(tank.id, 'tenderized', 30); } });
    };
    // Skewer: a line from him through his tank, out to the far wall (it follows the tank until 1.3 s before on Normal, 1 s on Hard, so
    // there is a moment to step off it). A light hit on the tank, worse for anyone else on it; the boss stands his ground while it flies.
    const skewer = () => {
      const tank = f.tank(); if (!tank) return;
      const d = ct(3.4), lock = H ? 1.0 : 1.3;
      f.cast('Skewer', d, 'throw');
      hold(d);
      f.mech({ type: 'buster', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tank.y - B.y, tank.x - B.x), len: 1400, w: 90 }, delay: d,
        dmg: dmg.skewer, target: tank.id, aimFromBoss: tank.id, lockAt: lock, tag: 'skewer' });
    };
    const halfRoom = side => {
      const a = B.facing + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
      return { kind: 'rect', x: B.x, y: B.y, angle: a, len: 1300, w: 2600 };
    };
    // he stands his ground until a combo he's started has landed, so what's drawn round him stays true
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    // Mince: one cleaver glints; that side of the room gets chopped. Hard (Double Chop): the other side 2.2 s later,
    // drawn from the start as a ghost behind the first.
    const mince = (delay = ct(4.5), side = coin('left', 'right')) => {
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
    const ladleOrLid = (delay = ct(4), which = coin('ladle', 'lid')) => {
      f.cast(LL[which], delay, which);
      f.aoe(which === 'ladle' ? ladleShape() : lidShape(), delay, dmg.ladle, { tag: which });
      hold(delay);
    };
    // Chop Chop: Mince, then the tool on his back right after (both drawn from the cast)
    const chopChop = (second = coin('ladle', 'lid')) => {
      const d = ct(5), side = coin('left', 'right');
      B.lockFacing = true;
      f.cast('Chop Chop', d, 'mince', { side, then: second });
      f.aoe(halfRoom(side), d, dmg.mince, { tag: 'mince' });
      f.aoe(second === 'ladle' ? ladleShape() : lidShape(), d + 2.4, dmg.ladle, { tag: second });
      hold(d + 2.4);
      f.afterKeep(d - 0.01, () => { B.lockFacing = false; f.anim(second, 2.4); });
    };
    // where a Meat Toss puddle was stays greasy, harmless until fire reaches it and burns it off. The stain does not last
    // for ever: it dulls and shrinks over its last 14 s (fade 1, then 2) and is gone STAIN_LIFE s after the puddle dried.
    const STAIN_LIFE = H ? 70 : 45;
    const stain = (x, y) => {
      const stains = f.floor.filter(fl => fl.stain);
      if (stains.length >= 8) f.removeFloor(stains[0]);
      f.addFloor({ kind: 'grease', stain: 1, x: Math.round(x), y: Math.round(y), r: 62, dmg: dmg.burn, fade: 0, born: f.t });
    };
    f.ticker(() => {
      for (const fl of f.floor) {
        if (!fl.stain) continue;
        if (f.burning(fl)) fl.burnt = 1;
        else if (fl.burnt) { f.removeFloor(fl); break; }   // (a stain that has burnt is gone)
        const left = STAIN_LIFE - (f.t - fl.born);
        if (left <= 0 && !f.burning(fl)) { f.removeFloor(fl); break; }
        const stage = left <= 6 ? 2 : left <= 14 ? 1 : 0;
        if (stage !== fl.fade) { fl.fade = stage; fl.r = stage === 2 ? 40 : 52; f.floorVer++; }
      }
    });
    // Meat Toss: spread circles on players; where they land, a grease puddle stays for a while, then a stain.
    const meatToss = (targets) => {
      const d = ct(5.5);
      targets = targets || (f.alive().length > 1 ? f.nonTanks() : f.alive());
      if (!targets.length) return;
      f.cast('Meat Toss', d, 'toss');
      for (const p of targets) {
        f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: d, dmg: dmg.spread, follow: p.id, tag: 'spread',
          onResolve: () => {
            const q = f.alive().find(z => z.id === p.id);
            if (!q) return;
            const dur = H ? 28 : 24, x = q.x, y = q.y;
            f.puddle(x, y, H ? 95 : 80, dur, dmg.puddle, 1, 'grease', { ddown: true });
            f.afterKeep(dur, () => stain(x, y));
          } });
      }
    };
    const familyMeal = (target, delay = ct(5.5)) => {
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
      if (H) f.afterKeep(0.01, () => familyMeal(f.alive().length > 1 ? f.tank() : null, ct(5.5) + 2.5));
      else f.afterKeep(ct(5.5) + 0.2, () => familyMeal(null, ct(3.5)));
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
        if (!inside.length) return;   // (nobody served it: failDmg already landed on everyone)
        if (!H) return;
        for (const p of inside) {
          if (f.hasDebuff(p.id, 'stuffed')) f.damagePlayer(p, dmg.stuffed, { kind: 'stuffed' });
          f.debuff(p.id, 'stuffed', STUFF);
        }
      } });
    const orderUp = () => {
      const k = Math.max(1, f.alive().length), n = H ? k + (k === 4 ? 2 : k === 3 ? 1 : 0) : k;
      const d = ct(7.5), gap = H ? 1.5 : 1.6;
      f.cast('Order Up!', d, 'bell');
      plateSpots(n).forEach(([x, y], i) => plate(x, y, d + i * gap));
      return d + (n - 1) * gap;   // when the last plate lands
    };
    // Dinner Rush (the Second Sitting; on Normal the plates are laid for you, see dinnerRush): the rail again, but the party lays it. He plants himself south of the
    // stockpot, facing it, and a hot plate hangs over every hero; where each stands when it comes down, the plate is
    // set down. Then he works the line in three beats, RUSH_BEAT apart, and the plates come up with them, nearest him
    // first: the first with Double Chop's west half, the second with its east half and a Lid Slam at once (only the
    // west side of the quiet circle by him is safe), the last two together with a Ladle Spin (well out).
    // The thinking: the plate for the first beat goes nearest him, on his east side; the second a little farther, on
    // his west side but inside the lid's reach, at its edge (whoever served the first is Stuffed and needs room there);
    // the other two out of the ladle's reach. The order follows the distances, so setting them down decides it: a
    // plate set nearer than it should be comes up on the wrong beat. Known, it is a short walk: two serve at his side
    // and never leave him, two serve from range. The same spot, facing and beats every pull.
    const RUSH_AT = { x: 0, y: 175 }, RUSH_BEAT = H ? 2.2 : 2.6, RUSH_FIRST = H ? 4 : 4.8, RUSH_LID = 230;   // (a wider quiet circle than the plain Lid Slam's: a plate has to fit in its west half with room beside it)
    const RUSH_PLATES = [[95, 0], [-165, 30], [320, -45], [-320, -45]];   // (Normal: where the plates lie, in the order they come up)
    const rushHalf = side => ({ kind: 'rect', x: RUSH_AT.x, y: RUSH_AT.y, angle: side === 'west' ? Math.PI : 0, len: 1300, w: 2600 });
    const dinnerRush = () => {
      const d = f.ct(4), at = RUSH_AT, al = f.alive();   // (not the course's pace: the beats that follow are fixed)
      f.moveBoss(at.x, at.y, 700);
      B.lockFacing = true; B.facing = -Math.PI / 2;
      hold(d + RUSH_FIRST + RUSH_BEAT * 2 + 0.3);
      f.afterKeep(d + RUSH_FIRST + RUSH_BEAT * 2 + 0.3, () => { B.lockFacing = false; });
      f.cast('Dinner Rush', d, 'bell');
      // the double chop is drawn from the cast: the west half with the first plate, the east half with the second
      f.aoe(rushHalf('west'), d + RUSH_FIRST, dmg.mince, { tag: 'mince' });
      f.aoe(rushHalf('east'), d + RUSH_FIRST + RUSH_BEAT, dmg.mince, { tag: 'mince' });
      // Normal: the plates are already laid, from the cast, at the places the dance wants them (nearest him first), and
      // nobody is Stuffed. The beats are the same: the party only has to get to the right plate on each.
      if (!H) {
        al.forEach((_, i) => { const [dx, dy] = RUSH_PLATES[Math.min(i, RUSH_PLATES.length - 1)]; plate(at.x + dx, at.y + dy, d + RUSH_FIRST + Math.min(i, 2) * RUSH_BEAT); });
        f.afterKeep(d, () => f.aoe({ kind: 'donut', x: at.x, y: at.y, r: 1300, r2: RUSH_LID }, RUSH_FIRST + RUSH_BEAT, dmg.ladle, { tag: 'lid' }));
        f.afterKeep(d + RUSH_FIRST, () => f.aoe({ kind: 'circle', x: at.x, y: at.y, r: 240 }, RUSH_BEAT * 2, dmg.ladle, { tag: 'ladle' }));
        return;
      }
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
      const d = ct(6);
      f.cast('Spice Rack', d, 'toss');
      for (const [x, y] of spots.slice(0, count)) f.aoe({ kind: 'circle', x, y, r: 140 }, d, dmg.spice, { tag: 'spice', ddown: true });
      for (const p of f.nonTanks()) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.spice, tag: 'spice', ddown: true, follow: p.id, lockAt: 2.5 });
    };
    // Whisk: a cross of beams through him that turns 30° four times. Walk with it. (dir and start angle are set)
    const whisk = (dir, a0) => {
      f.cast('Whisk', ct(3), 'whisk');
      hold(ct(3) + 4.5);
      for (let i = 0; i < 4; i++) {
        f.afterKeep(i * 1.5, () => f.aoe({ kind: 'cross', x: B.x, y: B.y, angle: a0 + dir * i * Math.PI / 6, len: 1300, w: 130 }, ct(3), dmg.whisk, { tag: 'whisk' }));
      }
    };
    const boilOver = () => {
      const d = ct(6);
      f.cast('Boil Over', d, 'boil');
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: B.x, y: B.y, r: 520 }, delay: d, dmg: dmg.boil, falloff: 680, tag: 'boil' });
    };
    // Mains pairs (Normal): two of his tools called at once, the second drawn while the first is still in the air
    // Larder Toss with a Mince right behind it: the casks fall on the two farthest as the glint shows which half to leave
    const larderChop = () => { larderToss(); f.afterKeep(1.4, () => mince()); };
    // Family Meal with a Ladle Spin right behind it: the stack has to be made out past his reach
    const mealLadle = () => { familyMeal(); f.afterKeep(2.4, () => ladleOrLid(ct(4), 'ladle')); };
    // Normal's tighter pairs: the same tools, the second landing close behind the first
    // Soup's On: Ladle Spin, and the Lid Slam lands just after it: out, and straight back in
    const soupsOn = () => {
      const d = ct(4), gap = 1.25;
      f.cast('Ladle Spin', d, 'ladle');
      f.aoe(ladleShape(), d, dmg.ladle, { tag: 'ladle' });
      f.aoe(lidShape(), d + gap, dmg.ladle, { tag: 'lid' });
      hold(d + gap);
      f.afterKeep(d, () => f.cast('Lid Slam', gap, 'lid'));
    };
    // Mince with the Tenderize cleaver called the moment its cast is done: the tank takes the half that is left and keeps the cleaver off the rest
    const minceBuster = () => { mince(); f.afterKeep(ct(4.5) + 0.1, tenderize); };
    // Butcher's Charge and, a breath later, Meat Toss: clear the line, then spread
    const chargeToss = () => { butcherCharge(); f.afterKeep(0.1, () => meatToss()); };
    // Order Up! with Larder Toss landing on the first plates: the marked two still have a plate to serve
    const orderCask = () => { const end = orderUp(); f.afterKeep(Math.max(0.5, ct(7.5) + 0.8 - ct(4.5)), larderToss); return end; };
    // Larder Toss with Boil Over landing a few seconds behind the casks: the marked two take theirs out toward the walls, the rest follow them out
    const caskBoil = () => { larderToss(); f.afterKeep(1.4, boilOver); };
    // Whisk with Boil Over landing between its last beams: out to the walls, and between the wires
    const whiskBoil = () => { whisk(1, 0.3); f.afterKeep(1.2, boilOver); };
    // Tank and healer beats are laid with moves the fight already has (no new casts): the cleaver is called only once the move before it
    // has finished its cast and is left its own 4.5 s before the next one, and a raidwide lands while the party dodges.
    const busterWith = (fn, after = 1.2) => () => { fn(); f.afterKeep(after, tenderize); };
    const greaseWith = (fn, after = 1.5) => () => { fn(); f.afterKeep(after, grease); };
    // Tank beats are the cleaver (Tenderize) and the charge. tankScan walks a list of sets and reports the longest stretch between beats
    // and the closest two cleavers (Hard: a second one inside the 30 s of Tenderized hits for more), so Hard's shuffles can be refused
    // an order that leaves the tank idle or stacks two cleavers. lead: how long ago the last beat was when the act began.
    const tankScan = (sets, lead = 0) => {
      let t = 0, last = -lead, mx = 0, lastTen = lead ? -lead : -99, minTen = 99, minSk = 99, lastBig = -99, lastSk = -99;
      for (const set of sets) {
        let at = t;
        for (const st of set) {
          at += st[0];
          if (st[2] === 'Tenderize' || st[2] === "Butcher's Charge" || st[2] === 'Skewer') {
            mx = Math.max(mx, at - last); last = at;
            if (st[2] === 'Tenderize') { minTen = Math.min(minTen, at - lastTen); lastTen = at; }
            if (st[2] === 'Skewer') { minSk = Math.min(minSk, at - lastBig); lastSk = at; } else { minSk = Math.min(minSk, at - lastSk); lastBig = at; }
          }
        }
        t = at;
      }
      return { mx: Math.max(mx, t - last), minTen, minSk };
    };
    // the best of up to 80 orders: one with no cleaver inside another's 30 s and no stretch over `limit`, else the shortest stretch
    const bestOrder = (cands, build, limit, lead) => {
      let best = null;
      for (const o of cands) {
        const r = tankScan(build(o), lead);
        if (r.minTen < 30 || r.minSk < 8) continue;
        if (!best || r.mx < best.mx) best = { o, mx: r.mx };
        if (r.mx <= limit) break;
      }
      return best ? best.o : cands[0];
    };
    // Hard: a set that ends on a Skewer (sk) fills the calm after it, so the next set's opening delay gives back what the skewer took (never under 4.4 s)
    const sk = (set, x) => { if (H) { set.push([x, skewer, 'Skewer']); set.sk = x; } return set; };
    // (and a cleaver or a charge never follows a skewer closer than 8.5 s)
    const fit = sets => sets.map((set, i) => {
      const pv = sets[i - 1]; if (!H || !pv || !pv.sk || !set || !set.length) return set;
      let c = 0, floor = ['Order Up!', 'Dinner Rush', 'Belly Flop'].includes(set[0][2]) ? 8.5 : 4.4;   // (a rail or a flop is never called while a skewer is still in the air)
      for (let k = 0; k < set.length; k++) { if (k) c += set[k][0]; if (set[k][2] === 'Tenderize' || set[k][2] === "Butcher's Charge") { floor = Math.max(floor, 8.5 - c); break; } }
      return [[Math.max(floor, set[0][0] - pv.sk), ...set[0].slice(1)], ...set.slice(1)];
    });
    const perms = a => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
    // Hard: the middle sets of an act come in a new order each pull (the head and tail stay put), so the fight is read, not memorised.
    // mid: [key, set] pairs; ok(keys) can refuse an order (two rails side by side, a set that has to come before another).
    const mix = (head, mid, tail, ok, limit = 0, lead = 0) => {
      mid = mid.filter(m => m && m[1]);
      let order = mid;
      if (H) {
        const orders = f.shuffle(perms(mid).filter(o => !ok || ok(o.map(m => m[0]))));
        if (orders.length) order = limit ? bestOrder(orders, o => fit([...head, ...o.map(m => m[1]), ...tail].filter(Boolean)), limit, lead) : orders[0];
      }
      return fit([...head, ...order.map(m => m[1]), ...tail].filter(Boolean));
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
      const d = ct(4.5);
      B.lockFacing = true;
      f.cast("Butcher's Charge", d, 'charge');
      const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: B.facing, len: 1400, w: 150 }, delay: d, dmg: dmg.charge, tag: 'charge',
        aimFromBoss: tank.id, lockAt: 1.0, onResolve: () => charge(m.shape.angle) });
    };
    const stuck = (dur = 4, up = 0.2) => { B.stunUntil = f.t + dur; B.exposedUntil = f.t + dur; B.exposed = up; f.emit({ t: 'roomev', k: 'stuck', dur }); };
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
          stuck(5, 0.3);   // (scalded: stuck longer and taking more, but the ring round the pot has to be left first, so the wall is the safe, plain choice)
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
      const d = ct(4.5);
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
      const d = ct(5);
      f.cast('Gut Blast', d, 'gut');
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: B.x, y: B.y, r: 2400 }, delay: d, dmg: dmg.gut, tag: 'gut', cover: true, chip: 'all', coverCap: H ? 2 : 0 });
    };
    // Clogged Drains (Hard): the drains back up and grease spills out round them, for good
    const DRAINS = [[0, 0], [-HW * 0.55, HH * 0.35], [HW * 0.55, HH * 0.35]];
    const drains = () => {
      const d = ct(4);
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
      const d = ct(4.5);
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
      const d = ct(3);
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
      const d = ct(4);
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
      const d = ct(4.5);
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
      const d = ct(5);
      f.cast('Flambé', d, 'flambe');
      const burn = s => ({ tag: 'flambe', ddown: true, onResolve: () => f.ignite(s, 4) });
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
      const d = ct(3);
      f.cast('Mise en Place', d, 'serve');
      plan = { tools: f.shuffle(['cleaver', 'ladle', 'lid']), side: coin('left', 'right') };
      f.afterKeep(d, () => f.emit({ t: 'roomev', k: 'mise', tools: plan.tools, side: plan.side, dur: 120 }));
    };
    const service = () => {
      if (!plan) return;
      const d = ct(3.5), beat = 2;
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
      const d = ct(6);
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
      f.cast('Last Orders', ct(5), 'raise');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0, look: 'orders' }, delay: ct(5), dmg: dmg.orders, hidden: true, tag: 'grease' });   // (look: visual only)
    };
    // Gorge: he eats, hitting everyone and getting stronger each time
    const gorge = () => {
      f.cast('Gorge', 2, 'gorge');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2, dmg: dmg.gorge, hidden: true, tag: 'gorge' });
      B.dmgUp += 0.1;
    };

    // --- the service ----------------------------------------------------------------------------
    const appetiser = from => {
      const tossMeal = S([12, () => meatToss(), 'Meat Toss'], [H ? 6.2 : 6, skewer, 'Skewer'], [H ? 5.8 : 6, () => familyMeal(), 'Family Meal']);
      return f.course({
        until: 0.8,
        seam: H ? 8 : 14,   // (Normal: the Gut Blast that goes with the casks is never cut off by the gate)
        // (Hard shuffles the middle of the course; Normal's Lid Slam carries a cleaver)
        sets: mix(
          H ? [S([3, drains, 'Clogged Drains'], [3, grease, 'Grease Fire'], [11, tenderize, 'Tenderize']), tossMeal]
            : [S([4, grease, 'Grease Fire'], [5.5, skewer, 'Skewer'], [3.9, () => mince(), MINCE], [9, () => ladleOrLid(ct(4), 'ladle'), 'Ladle Spin'], [8, () => ladleOrLid(ct(4), 'lid'), 'Lid Slam']), S([9, tenderize, 'Tenderize'])],
          [
            H && ['soup', S([10, () => mince(), MINCE], [ct(4.5) + 0.1, tenderize, 'Tenderize'], [12 - ct(4.5) - 0.1, soupsOn, 'Ladle Spin'])],
            !H && ['toss', tossMeal],
            ['larder', S([12, larderToss, 'Larder Toss'], [H ? 5 : 5.2, skewer, 'Skewer'], [H ? 5 : 4.8, gutBlast, 'Gut Blast'])],
            // (Normal: one more round of the plain tools before the Mains, a little quicker each)
            !H && ['soup', S([8, soupsOn, 'Ladle Spin'], [5.4, tenderize, 'Tenderize'], [4.7, () => mince(), 'Mince'])],
          ],
          [S([H ? 11 : 9, grease, 'Grease Fire'])], null, H ? 50 : 0),
        closing: [[9, larderToss, 'Larder Toss'], [10, gutBlast, 'Gut Blast'], [10, grease, 'Grease Fire']],
        next: mains,
      }, from);
    };

    const mains = from => f.course({
      until: 0.5,
      onStart: quicker(0.92),
      // (Hard: the middle of the course comes in a new order each pull; the two rails never sit side by side)
      sets: mix(
        [S([5, H ? butcherCharge : chargeToss, "Butcher's Charge"]), S([13, () => chopChop(), 'Chop Chop']), S([13, tenderize, 'Tenderize'])],
        [
          ['rail', S(!H && [11, skewer, 'Skewer'], [H ? 12 : 8.5, H ? orderUp : orderCask, 'Order Up!'])],
          ['toss', sk(S([15, tossThenMeal, 'Meat Toss'], !H && [10, skewer, 'Skewer']), 8.7)],
          // (Normal: the casks come down with a Mince right behind them, then the charge with the casks already down)
          ['larder', S(H && [10, () => bellyFlop(), 'Belly Flop'], H ? [12, larderToss, 'Larder Toss'] : [5, larderChop, 'Larder Toss'], [8, butcherCharge, "Butcher's Charge"], [10, gutBlast, 'Gut Blast'], !H && [5.8, skewer, 'Skewer'])],
          // (Normal: a Family Meal with a Ladle Spin behind it, the stack made out past his reach)
          !H && ['meal', S([5.2, mealLadle, 'Family Meal'])],
          ['grease', S([12, grease, 'Grease Fire'], H && [ct(4) + 0.2, tenderize, 'Tenderize'], !H && [5, skewer, 'Skewer'])],
          ['rail', S([H ? 12 : 8.5, orderUp, 'Order Up!'], [6, () => meatballs(LANES.rail), 'Rolling Meatballs'], H && [2.5, cleaverToss, 'Cleaver Toss'])],
        ],
        [S([H ? 11.5 : 14, H ? tenderize : minceBuster, H ? 'Tenderize' : 'Mince']), sk(S([10, () => chopChop(), 'Chop Chop'], !H && [8.6, skewer, 'Skewer']), 7.8), S([H ? 12 : 5.4, tossThenMeal, 'Meat Toss'])],
        keys => keys.every((k, i) => !(k === 'rail' && ['rail', 'larder', 'grease'].includes(keys[i + 1]))), 30),
      closing: [[10, orderUp, 'Order Up!'], [6, () => meatballs(LANES.rail), 'Rolling Meatballs'], [16, () => chopChop(), 'Chop Chop'], [10, grease, 'Grease Fire']],
      next: flare,
    }, from);

    // no downtime: he stays on the floor while the kitchen catches
    const flare = from => f.course({
      sets: [
        S([6, flareUp, 'Flare-Up']),
        // (the cleaver is called once the Flambé's cast is done, so the tank has a beat in the burning room; Normal has a second one at the end,
        // Hard's Tenderized rule leaves room for one)
        S([8, busterWith(() => flambe({ dir: 1, tall: true, first: 0 }), ct(5) + 0.1), 'Flambé']),
        S([12, potToMiddle, 'Stockpot'], [2.5, () => simmerCast(true), 'Simmer'], [7.2, () => simmerCast(false), 'Simmer']),
        H ? S([8.4, skewer, 'Skewer'], [3.6]) : S([6, tenderize, 'Tenderize'], [4]),
      ],
      next: secondSitting,
    }, from);

    // (Normal: the long gaps between the Second Sitting's calls close up a little; the Dinner Rush's own beats are fixed)
    const closeUp = sets => (H ? sets : sets.filter(Boolean).map(set => set.map(st => (st && st[0] >= 8 ? [st[0] * 0.93, ...st.slice(1)] : st))));
    // the Second Sitting's sets by name. Normal runs them in one order. Hard runs them in blocks of two that trade places inside the block
    // (so a pull never opens the same way and the fight is read, not memorised), each block built so the tank and the healer always have a job
    // coming: Mise en Place comes two blocks before Service!, and the cleaver (30 s of Tenderized) never lands twice inside the debuff.
    const SS = {
      spice: sk(S([10, () => { spiceRack(SPICE.a); f.afterKeep(ct(6) + 0.3, () => ladleOrLid(ct(3))); }, 'Spice Rack'], !H && [9.8, skewer, 'Skewer']), 8.3),
      larder: sk(S([H ? 14 : 4.5, H ? larderToss : caskBoil, 'Larder Toss'], H && [6, boilOver, 'Boil Over']), 6.6),
      busters: S([10, () => { tenderize(); if (H) meatHook(); }, 'Tenderize'], [8, gutBlast, 'Gut Blast'], !H && [5.6, skewer, 'Skewer']),
      mise: H && sk(S([8, greaseWith(mise, 3.0), 'Mise en Place']), 7.2),
      // the Dinner Rush: three beats at the stove, the plates coming up nearest him first (Hard: the party sets them down;
      // the cast names come with each beat)
      rush: sk(S([H ? 10 : 8.5, dinnerRush, 'Dinner Rush'], [f.ct(4), () => f.cast(MINCE, RUSH_FIRST, 'mince', { side: 'left', second: 'right' }), MINCE],
        [RUSH_FIRST + 0.05, () => f.cast('Lid Slam', RUSH_BEAT - 0.1, 'lid'), 'Lid Slam'], [RUSH_BEAT, () => { f.cast('Ladle Spin', RUSH_BEAT - 0.1, 'ladle'); f.anim('ladle', RUSH_BEAT); }, 'Ladle Spin']), 5.5),
      charge: S([H ? 13 : 10, butcherCharge, "Butcher's Charge"]),
      grease: S([H ? 12 : 11, grease, 'Grease Fire'], H && [ct(4) + 0.2, tenderize, 'Tenderize'], !H && [5.2, skewer, 'Skewer']),
      service: H && S([8, service, 'Service!']),
      whisk: sk(S([H ? 8.8 : 6.8, () => whisk(-1, 0.9), 'Whisk'], [3, () => meatballs(LANES.b), 'Rolling Meatballs']), 8.5),
      meal: sk(S([10, () => { familyMeal(); f.afterKeep(1.5, () => spiceRack(SPICE.b, 2)); }, 'Family Meal'], H && [7.5, grease, 'Grease Fire'], !H && [8, skewer, 'Skewer']), H ? 9 : 7.5),
      chop: S([H ? 14 : 5.5, () => (H ? mince() : chopChop()), H ? 'Double Chop' : 'Chop Chop'], H && [9, () => bellyFlop(), 'Belly Flop'], H && [ct(4) + 0.2, tenderize, 'Tenderize']),
    };
    const ssFirst = S([H ? 4.6 : 4, () => (H ? whisk(1, 0.3) : whiskBoil()), 'Whisk']), ssLast = S([10, tenderize, 'Tenderize']);
    const ssSets = order => fit([ssFirst, ...order.map(k => SS[k]).filter(Boolean), ssLast]);
    // (Hard: refused any order that leaves the tank more than 45 s between cleavers and charges)
    const secondOrder = () => (H
      ? bestOrder(Array.from({ length: 120 }, () => [['spice', 'grease'], ['larder', 'busters'], ['mise', 'rush'], ['charge', 'chop'], ['whisk', 'meal'], ['service']].flatMap(b => f.shuffle(b))), ssSets, 45, 27)
      : ['spice', 'larder', 'busters', 'rush', 'charge', 'grease', 'whisk', 'meal', 'chop']);
    const secondSitting = from => f.course({
      until: 0.18,
      onStart: quicker(0.87),
      sets: closeUp(ssSets(secondOrder())),
      closing: [[10, () => whisk(1, 0.3), 'Whisk'], [3, () => meatballs(LANES.b), 'Rolling Meatballs'], [14, () => chopChop(), 'Chop Chop'], [10, grease, 'Grease Fire']],
      next: dessert,
    }, from);

    // the Dessert Trolley: everything at once, then quiet, then Last Orders, then he eats until he drops
    const dessert = from => {
      const k = H ? 0.85 : 0.76, w = coin('ladle', 'lid');
      const A = [() => mince(), MINCE], B = [H ? () => ladleOrLid(ct(4), w) : soupsOn, H ? LL[w] : 'Ladle Spin'];
      return f.course({
        onStart: quicker(0.85),
        sets: [
          // each beat lands just as the next is called: the fire passes, then the toss, the balls, the chop...; Last Orders follows the
          // Whisk straight on (no quiet between), then Gorge
          S([ct(4.5) + 0.2, () => flambe({ dir: -1, tall: false, first: 1 }), 'Flambé'],
            [7 * k, () => meatToss(), 'Meat Toss'],
            [2.5 * k, () => meatballs(LANES.c), 'Rolling Meatballs'],
            H && [1.5, cleaverToss, 'Cleaver Toss'],
            [H ? 2.5 : 3.4, A[0], A[1]],
            [3.5 * k, B[0], B[1]],
            [4 * k, () => spiceRack(SPICE.c), 'Spice Rack'],
            [4 * k, () => familyMeal(), 'Family Meal'],
            [4 * k, () => whisk(H ? -1 : 1, 0), 'Whisk'],
            [11.5, lastOrders, 'Last Orders']),
        ],
        closing: H ? [[6.5, skewer, 'Skewer'], [5.5, gorge, 'Gorge']] : [[5.5, skewer, 'Skewer'], [9.5, gorge, 'Gorge']],
        ramp: 0,   // Gorge brings its own
      }, from);
    };

    appetiser(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.gutBlast())
    f.moves = { grease, tenderize, mince, ladleOrLid, chopChop, meatToss, tossThenMeal, familyMeal, orderUp, spiceRack, whisk, boilOver,
      meatballs, bellyFlop, cleaverToss, flambe, butcherCharge, larderToss, gutBlast, drains, meatHook, charge, flareUp, potToMiddle,
      mise, service, dinnerRush, lastOrders, gorge, simmerCast, skewer };
  },
};

if (typeof module !== 'undefined') module.exports = { GRUBNAK };
