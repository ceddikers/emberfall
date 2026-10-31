// The Ultimate: The Cinder Sovereign, the Ember the realm is named for (docs/plans/2026-10-ultimate-raid.md, the contract is docs/plans/2026-10-ultimate-build.md).
// One fight, about 15 minutes, 100% fixed (nothing shuffles), one difficulty (run as 'normal'; 'hard' is the same). Every telegraph is shown, red is
// damage, blue is a stack or soak, safe ground is never painted, and no text teaches anything: the cast names are the only words.
// The question: who is answering, and what did they always want from us? The Sovereign calls a fallen boss by name; its flame leaves the halo (a ring of
// twelve sigils, one per boss), an echo rises where the sigil burns on the floor, and that echo answers with its boss's rule in a NEW move.
//
// Its own kit (small and plain, so the echoes are the stars and the damage windows stay open):
//   Kindling      raidwide, opens every act            Brand         the blade cuts the tank and leaves a long burn; the next Brand inside it hits harder
//   Ashen Sweep   half the room on the blade's side; the blade passes to the other hand before some sweeps (roomev 'svside'), which is the tell
//   Cupped Ember  a blue stack on a random non-tank    Scatter       a spread circle on every hero
//   Halo Turn     a red line outward from each LIT sigil (the lines sweep round first, then lock and fire); a dark sigil fires nothing
// The halo: f.sv.lit (12 bits, bit i = sigil i, all lit at the end of the descent), sent as roomev 'svhalo' { lit, call, wheel } whenever it changes.
//
// Act I, The Kindling (100% -> 78%), built in two halves:
//   S1a (this file, up to TODO(S1b)): the descent (set piece 'svdescent', the halo lighting one flame per half second), Kindling, Ashen Sweep, Brand,
//     Call: Grubnak (Flambé Service: four plates served in order, a flambé line from each served plate to the next, and a Mince on the half the last
//     plate is not on), Halo Turn, Cupped Ember, Call: Skitterra (Burning Web: three fire threads wall to wall cutting the room, a knot to break on each;
//     a broken knot's thread burns out from the knot toward both walls like a fuse; every thread left whole goes up at once with her shadow racing along it),
//     Brand, Ashen Sweep.
//   S1b: Volkar, the Hollow King, the Royal Tithe, the 78% burnback set piece.
// Times in the course are the design's (docs/plans/2026-10-ultimate-raid.md "Timeline"): the descent (0:00-0:06) stops the course clock, so a step the
// design puts at 0:08 is 2 s after it ends.

const SOVEREIGN = {
  id: 'sovereign', name: 'The Cinder Sovereign', title: 'the Ember',
  hp: { normal: 14000000, hard: 14000000 },   // (2026-10-31: bots and parties hold every talent row here, so 9.0M became 14.0M; 8.64M until 2026-10-29; 9.0M at GEAR=post5: perfect bots kill at about 14:30, the gates at about 3:20, 7:35 and 11:45; humans at about 16:00)
  normalDmg: 1, hardDmg: 1,   // (the dmg table below is the real number: tuned 2026-10-29 at GEAR=post5, default line-up, then ACT_DMG per act)
  autoDmg: { normal: 2400, hard: 2400 },   // (was 2600 at normalDmg 0.78)
  enrage: { normal: 1012, hard: 1012 },   // the cast starts here and lands 8 s later (17:00; the user, 2026-10-29: human parties need the time)
  enrageName: 'Emberfall',
  practiceCut: { 2: 212, 3: 482, 4: 718 },   // (a practice start counts the enrage from its act: the design times its course starts at, so the act has the time it would have left in a full pull; fight.js enrageAt)
  vuln: 0.5,
  spawn: { x: 0, y: -60 },
  arena: { theme: 'hall' },
  gates: [0.78, { f: 0.5, wall: 1 }, { f: 0.2, push: 1 }],

  script(f) {
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      kindling: 12000, brand: 17700, burn: 650, sweep: 67900, ember: 20000, scatter: 11000, line: 48950, wedge: 6000, ringBurst: 3440,   // (Halo Procession's wedges and a ring's burst: both scaled by ACT_DMG; `burst` below is the Sunwheel's own, unscaled)
      plate: 7000, plateFail: 39500, flambe: 45850, mince: 53750,
      sting: 5400, fuse: 36300, whole: 55300, knotHp: 16000,
      surgeAlone: 25200, surgeSame: 56850, surgePair: 5050, dirge: 8000,
      shatter: 39500, sunk: 2800, bite: 28400, headHp: 90000, stump: 3250, diveLand: 75800, divePass: 56850, after: 13500, steam: 44200,   // (Act II: Hrimgar's wave and water, the Hydra's heads, Vhalgrath's dive)
      twinStack: 27000, twinBrand: 69550, bloom: 53750, twinSpread: 27000, pillar: 63200, rebirth: 9000,   // (Azerath's Twin Brands, the wall's pillars, Rebirth)
    };
    const live = id => f.alive().find(p => p.id === id);
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    const R = () => ARENA.r - 12;

    // --- the Sovereign's state: the halo, the blade's hand, the echoes --------------------------------------------------------
    const sv = f.sv = { lit: 0, call: -1, side: 1, echoN: 0, echoes: new Set(), wheel: 0, sealed: false, quiet: false, busy: 0 };
    // An act belongs to what it lays: every afterKeep the script makes is tagged with the era it was made in and does nothing once an act has turned (cutAct, below), so Act III's Grace
    // cannot land in Act IV nor Halo Procession's wedges in Act II. (The courses' own steps and the enrage are laid by fight.js with atKeep/at, and are untouched.)
    let era = 1;
    const afterKeep0 = f.afterKeep.bind(f);
    f.afterKeep = (dt, fn, name) => { const mine = era, w = () => { if (era === mine) fn(); }; w.era = mine; afterKeep0(dt, w, name); };
    f.room = {};   // (the bots read f.room.threads while the web stands, and Act III's holes: f.room.holes and f.room.safe)
    Object.assign(sv, { dark: [], relit: new Set(), echoSig: new Map(), graceUntil: 0, seedLast: -1, holes: [], pushed: false, fallen: null });   // (S3b: the order sigils went dark, the ones relit by a sapling, echo number -> sigil, Grace's window, the last seed carrier, Act III's holes, the push, the first hero to fall)
    const halo = () => f.emit({ t: 'roomev', k: 'svhalo', lit: sv.lit, call: sv.call, wheel: sv.wheel ? 1 : 0, dur: 9999 });
    const setSide = s => { sv.side = s; f.emit({ t: 'roomev', k: 'svside', side: s, dur: 9999 }); };
    // the echo order: the sigil index is the order the party first met them
    const ECHO = ['grubnak', 'skitterra', 'volkar', 'hollowking', 'wyrm', 'titan', 'archmage', 'hydra', 'corvane', 'brannoc', 'morrowoak', 'caelum'];
    const NAMES = { grubnak: 'Grubnak, the Ogre Chef', skitterra: 'Skitterra, the Spider Broodmother', volkar: 'Volkar, the Storm Titan', hollowking: 'The Hollow King',
      archmage: 'Azerath, Master of the Seven Circles', titan: 'Hrimgar, Warden of the White Reach', hydra: 'The Hydra, Mother of Nine Heads', wyrm: 'Vhalgrath, Tyrant of the Cinder Peaks',
      corvane: 'Corvane, the Unburied Blade', brannoc: 'Brannoc, the Undefeated', caelum: 'Caelum Vey, the Starborn', morrowoak: 'Morrow-Oak, the Starved Grove' };
    // where an echo rises: on the floor under its own sigil, near the rim
    const spot = i => { const a = (i + 0.5) / 12 * TAU - Math.PI / 2; return { x: Math.round(Math.cos(a) * 400), y: Math.round(Math.sin(a) * 400), face: +(a + Math.PI).toFixed(2) }; };
    const FLY = 1.1, RISE = 2.3;
    // Call echo i: the Sovereign's cast names the fallen, the flame flies from the halo, the echo rises (about 3.4 s). Returns { n, d } (n names the
    // echo for svecho:<n>; d is when it stands, the answer's telegraphs begin then)
    const call = (i, stay = 40, fly = FLY, home = null) => {   // (fly 0 and a home: a second call from the floor sigil, the halo already dark there)
      const who = ECHO[i], at = home || spot(i), n = ++sv.echoN, d = f.ct(fly + RISE);
      f.cast(NAMES[who] || who, d, 'call');
      if (fly > 0) { sv.call = i; halo(); }
      f.emit({ t: 'roomev', k: 'svecho:' + n, who, sig: i, x: at.x, y: at.y, fly, rise: RISE, dur: stay, face: at.face ?? +Math.atan2(-at.y, -at.x).toFixed(2), kneel: who === 'hollowking' ? 0 : 1 });
      sv.echoes.add(n); sv.echoSig.set(n, i);
      if (fly > 0) f.afterKeep(fly, () => { sv.lit &= ~(1 << i); sv.call = -1; if (!sv.dark.includes(i)) sv.dark.push(i); halo(); });   // (the flame has left: its place on the halo stays dark)
      return { n, d };
    };
    // the echo goes: it crumbles at once (a svecho message with no `who`)
    const endEcho = (n, delay) => f.afterKeep(Math.max(0.01, delay), () => { sv.echoes.delete(n); f.emit({ t: 'roomev', k: 'svecho:' + n, dur: 0.1 }); });
    // a move on the floor until then. The wall (heartRun) waits for what plays out whole (busyPlay); the moves the wall cuts (the Anvil Count, Twin Brands: cut = true) do not hold it
    const busy = (d, cut) => { sv.busy = Math.max(sv.busy || 0, f.t + d); if (!cut) sv.busyPlay = Math.max(sv.busyPlay || 0, f.t + d); };

    // the echo's own move: once the echo stands, a short cast under its move's name (the journal keys its pages on cast names)
    const answer = (name, d = 1.6) => f.cast(name, d, 'call');
    // a standing zone is told to the clients too (a `zone` message: the default zone drawing shows it even without sovereign-fx.js; telegraphs are never hidden)
    const zoneMsg = (z, dur, delay = 0) => f.emit({ t: 'zone', id: z.id, shape: z.shape, dur, tag: z.tag, delay });

    // --- the descent (the pull) -----------------------------------------------------------------------------------------------
    // The party stands on a copy of the square's flagstones, which crack and sink a step; the halo lights one flame per half second, twelve beats.
    // The course clock is stopped, so the beats ride the set piece's own time (f.onSetPiece).
    const desc = { on: false, acc: 0, n: 0 };
    f.onSetPiece(a => {
      if (!desc.on) return;
      desc.acc += a;
      while (desc.n < 12 && desc.acc >= 0.5 * (desc.n + 1) - 0.02) { sv.lit |= 1 << desc.n; desc.n++; halo(); }
      if (desc.n >= 12) desc.on = false;
    });
    const descent = () => {
      sv.lit = 0; sv.call = -1; sv.side = 1; desc.on = true; desc.acc = 0; desc.n = 0;
      f.emit({ t: 'roomev', k: 'svact', act: 1, dur: 9999 });
      setSide(1); halo();
      f.setPiece({ id: 'svdescent', dur: 6, invul: 6 });
    };

    // --- the Sovereign's own moves --------------------------------------------------------------------------------------------
    const kindling = () => {
      if (desc.on) { sv.lit = 0xfff; desc.on = false; halo(); }
      const d = f.ct(3.4);
      f.cast('Kindling', d, 'kindling');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.kindling, hidden: true, tag: 'svKindling', from: 'Kindling' });
    };
    // Brand: a buster on the tank, and a burn that stays (a light tick) for a long while; a Brand that lands inside it hits harder
    const BURN = 90, burn = { until: -1, next: 0, who: null };
    f.onSetPiece(a => { burn.until += a; burn.next += a; });
    f.ticker(() => {
      if (f.t >= burn.until || f.t < burn.next) return;
      burn.next = f.t + 3;
      if (f.t < sv.graceUntil) return;   // (held at nothing by Grace Withdrawn: the burn waits)
      const p = live(burn.who);
      if (p) f.damagePlayer(p, dmg.burn, { kind: 'svBurn', avoidable: false, noVuln: true });
    });
    const brand = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(3.8), hot = f.t + d < burn.until;
      f.cast('Brand', d, 'brand');
      f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 130 }, delay: d, dmg: hot ? Math.round(dmg.brand * 1.55) : dmg.brand, target: tank.id, follow: tank.id, lockAt: 0.7, tag: 'svBrand', from: 'Brand',
        onResolve: () => { burn.until = f.t + BURN; burn.next = f.t + 3; burn.who = tank.id; f.debuff(tank.id, 'svbrand', BURN); } });
    };
    // Ashen Sweep: the half of the room on the blade's side. o.swap: the blade passes to the other hand first (roomev 'svside', which the art turns
    // smoothly), and the sweep is cast a moment after, so the hand is the tell
    const sweep = (o = {}) => {
      const go = () => {
        if (f.state !== 'live') return;
        const d = f.ct(3.6);
        B.lockFacing = true;
        f.cast('Ashen Sweep', d, 'sweep', { side: sv.side });
        hold(d + 0.8);
        const a = B.facing + sv.side * Math.PI / 2;   // (the blade's side: right of the way he faces is +1)
        sv.lastSweep = { x: Math.round(B.x), y: Math.round(B.y), angle: +a.toFixed(3) };   // (the Hollow King's knights replay it: the Crier)
        f.aoe({ kind: 'rect', x: Math.round(B.x), y: Math.round(B.y), angle: +a.toFixed(3), len: 1300, w: 2600 }, d, dmg.sweep, { tag: 'svSweep', from: 'Ashen Sweep' });
        f.afterKeep(d + 0.4, () => { B.lockFacing = false; });
      };
      if (o.swap) { setSide(-sv.side); f.afterKeep(1.3, go); } else go();
    };
    // Cupped Ember: the ember in its hand is thrown as a blue stack on a random non-tank
    const ember = () => {
      const tgt = nonTank(); if (!tgt) return;
      const d = f.ct(4.0);
      f.cast('Cupped Ember', d, 'ember');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: tgt.x, y: tgt.y, r: 125 }, delay: d, dmg: dmg.ember, follow: tgt.id, lockAt: 0.9, need: Math.min(3, f.alive().length), tag: 'svEmber', from: 'Cupped Ember' });
    };
    // Scatter: a spread circle on every hero
    const scatter = () => {
      const d = f.ct(4.2);
      f.cast('Scatter', d, 'scatter');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 150 }, delay: d, dmg: dmg.scatter, follow: p.id, lockAt: 0.7, tag: 'svScatter', from: 'Scatter' });
    };
    // Halo Turn: a red line outward from every LIT sigil (dark ones fire nothing). The lines are drawn from the cast where they will lock; the beams
    // sweep round to them first (roomev 'svturn': a0 is where sigil 0's line locks, sweep how far the beams come round to it, the fx's)
    let turnN = 0;
    const haloTurn = (a0 = 0.26) => {
      const d = f.ct(4.2), lit = sv.lit;
      f.cast('Halo Turn', d, 'haloturn');
      hold(d + 0.6);
      f.emit({ t: 'roomev', k: 'svturn:' + (++turnN), a0: +a0.toFixed(3), sweep: 1.1, lit, dur: +(d + 1).toFixed(2) });
      for (let i = 0; i < 12; i++) {
        if (!(lit & (1 << i))) continue;
        const a = a0 + i * TAU / 12, c = Math.cos(a), s = Math.sin(a);
        f.aoe({ kind: 'rect', x: Math.round(B.x + c * 150), y: Math.round(B.y + s * 150), angle: +a.toFixed(3), len: 1300, w: 64 }, d, dmg.line, { tag: 'svLine', from: 'Halo Turn' });
      }
    };

    // --- Halo Procession (Act I's dance block, Pantokrator) --------------------------------------------------------------------
    // The first Halo Turn grown up: two lit arcs of the halo sweep round the Sovereign as red wedges (opposite each other; each is a run of narrow cones
    // laid a beat ahead of where it lands, so the painted wedge advances; the way they turn, a random one per pull, shows in the first slices laid). The
    // party walks a lap ahead of them. Every hero also carries a countdown ring (roomev 'svproc', the clients draw it), a few seconds apart in a random
    // order: when a ring closes that hero bursts a red circle on themselves that hurts everyone else in it (the hero themselves takes nothing), so they step
    // out of the group just before and come back after. It ends on a Cupped Ember, which pulls them together again. About 27 s in all.
    const PROC = { a0: 0.3, step: 0.5, arc: 0.15, lead: 2.4, first: 4.2, n: 38, ring0: 7.0, gap: 5.5, burstR: 150, burstLead: 2.6, emberAt: 23.0 };
    let procN = 0;
    const procession = () => {
      if (f.state !== 'live') return;
      const P = PROC, n = ++procN, dir = f.rng() < 0.5 ? 1 : -1, c0 = { x: Math.round(B.x), y: Math.round(B.y) };
      const ids = f.shuffle(f.alive().map(p => p.id)).slice(0, 4), at = ids.map((_, i) => +(P.ring0 + i * P.gap).toFixed(2));
      f.cast('Halo Procession', 2.4, 'haloturn');
      hold(P.emberAt + 5);
      f.emit({ t: 'roomev', k: 'svproc:' + n, x: c0.x, y: c0.y, a0: P.a0, dir, arc: P.arc, step: P.step, first: P.first, n: P.n, lead: P.lead, ids, at, r: P.burstR, dur: +(P.emberAt + 5).toFixed(2) });
      // the wedges: slice k of each lands at first + k x step, laid `lead` before (afterKeep: the sweep runs on whatever the act does)
      for (let k = 0; k < P.n; k++) {
        f.afterKeep(P.first + k * P.step - P.lead, () => {
          if (f.state !== 'live') return;
          for (const w of [0, 1]) f.mech({ type: 'aoe', shape: { kind: 'cone', x: c0.x, y: c0.y, r: 760, angle: +(P.a0 + w * Math.PI + dir * k * P.arc).toFixed(3), arc: +(P.arc * 1.04).toFixed(3) }, delay: P.lead, dmg: dmg.wedge, tag: 'svWedge', from: 'Halo Procession' });
        });
      }
      // the rings: the red circle goes down on the hero a beat before the ring closes and follows them until just before it bursts
      ids.forEach((id, i) => f.afterKeep(at[i] - P.burstLead, () => {
        const p = live(id); if (f.state !== 'live' || !p) return;
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: P.burstR }, delay: P.burstLead, dmg: dmg.ringBurst, follow: id, lockAt: 0.7, group: new Set([id]), tag: 'svBurst', from: 'Halo Procession' });
      }));
      f.afterKeep(P.emberAt, ember);
    };

    // --- Call: Grubnak. Flambé Service ----------------------------------------------------------------------------------------
    // Four cloches come up round the room, one hero to a plate, served in the order their rims fill (the delays: the next to serve is the one
    // soonest). Each plate served lifts its lid and sends a line of flambé racing to the NEXT plate in the order, so the order also draws the burning
    // path between plates (the line starts at the served plate and stops short of the next one: whoever waits there is safe). Stand on yours, then step
    // off the line that leaves it. As the last plate is served a Mince falls on the half of the room the last plate is not on.
    const PLATE_R = 85, PLATE_AT = [[-212, -212], [212, -212], [212, 212], [-212, 212]];   // clockwise from the top left
    const flambe = () => {
      const c = call(0);
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Flambé Service');
        const n = Math.max(1, Math.min(4, f.alive().length)), spots = PLATE_AT.slice(0, n), first = 5.0, gap = f.ct(2.4), T = k => first + k * gap;
        hold(T(n - 1) + 3.2); B.lockFacing = true;
        f.afterKeep(T(n - 1) + 3.2, () => { B.lockFacing = false; });
        f.emit({ t: 'roomev', k: 'svflambe:' + c.n, plates: spots, at: spots.map((_, k) => +T(k).toFixed(2)), r: PLATE_R, dur: +(T(n - 1) + 3).toFixed(2) });
        spots.forEach(([x, y], k) => f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: PLATE_R }, delay: T(k), dmg: dmg.plate, failDmg: dmg.plateFail, need: 1, tag: 'svPlate', from: 'Flambé Service' }));
        for (let k = 0; k + 1 < n; k++) {
          const [x0, y0] = spots[k], [x1, y1] = spots[k + 1], L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
          f.aoe({ kind: 'rect', x: x0, y: y0, angle: +a.toFixed(3), len: Math.round(L - PLATE_R - 12), w: 70 }, T(k) + 1.7, dmg.flambe, { tag: 'svFlambe', from: 'Flambé Service' });
        }
        const last = spots[n - 1], mAt = T(n - 1) + f.ct(2.6);
        f.aoe({ kind: 'rect', x: 0, y: 0, angle: last[0] < 0 ? 0 : Math.PI, len: 1300, w: 2600 }, mAt, dmg.mince, { tag: 'svMince', from: 'Flambé Service' });
        endEcho(c.n, mAt + 0.2);
      });
    };

    // --- Call: Skitterra. Burning Web -----------------------------------------------------------------------------------------
    // Three threads of fire wall to wall, 260 from the middle, cut the room into four pieces; each has a knot (an inert add) at the point nearest the
    // middle. Crossing a thread stings and roots. Break a knot and its thread burns out from the knot toward both walls like a fuse (a red band racing
    // ahead, shown from the break: where you cut decides where the fire runs). Every thread left whole goes up at once, her shadow racing along it.
    const WEB_G = 260, FUSE = 230, FUSE_LEAD = 1.5, WEB = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].map((na, i) => {
      const g = WEB_G, r = ARENA.r - 12, nx = Math.cos(na), ny = Math.sin(na), tx = -ny, ty = nx, h = Math.sqrt(r * r - g * g);
      return { id: i, order: i, x1: Math.round(nx * g - tx * h), y1: Math.round(ny * g - ty * h), x2: Math.round(nx * g + tx * h), y2: Math.round(ny * g + ty * h), kx: Math.round(nx * g), ky: Math.round(ny * g), len: Math.round(2 * h) };
    });
    let webN = 0, fuseN = 0;
    const threads = () => (f.room.threads || []);
    const dropThread = th => {   // (the thread is gone: its floor and its knot)
      th.cut = true;
      if (th.fl) f.removeFloor(th.fl);
      if (th.knot && f.adds.has(th.knot.id)) { f.adds.delete(th.knot.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: th.knot.id }); }
      if (threads().every(t => t.cut)) delete f.room.threads;
    };
    // a knot is broken: the thread burns out from it
    const fuse = th => {
      if (th.cut || th.burning) return;
      th.burning = true; th.cut = true;   // (it no longer stings: the band that races along it does the hurting)
      const ux = (th.x2 - th.x1) / th.len, uy = (th.y2 - th.y1) / th.len, s0 = (th.kx - th.x1) * ux + (th.ky - th.y1) * uy;
      let end = 0;
      for (const dir of [-1, 1]) {
        const far = dir > 0 ? th.len - s0 : s0;
        for (let a = 50; a < far; a += 150) {
          const b = Math.min(a + 150, far), p = s => ({ x: th.x1 + ux * (s0 + dir * s), y: th.y1 + uy * (s0 + dir * s) }), A = p(a), Bp = p(b), delay = FUSE_LEAD + a / FUSE;
          f.aoe({ kind: 'rect', x: Math.round(A.x), y: Math.round(A.y), angle: +Math.atan2(Bp.y - A.y, Bp.x - A.x).toFixed(3), len: Math.round(b - a) + 4, w: 84 }, delay, dmg.fuse, { tag: 'svFuse', from: 'Burning Web' });
          end = Math.max(end, delay);
        }
      }
      f.emit({ t: 'roomev', k: 'svfuse:' + (++fuseN), x1: th.x1, y1: th.y1, x2: th.x2, y2: th.y2, kx: th.kx, ky: th.ky, sp: FUSE, at: FUSE_LEAD, dur: +(end + 1).toFixed(2) });
      f.afterKeep(end + 0.5, () => dropThread(th));
    };
    f.ticker(() => {
      for (const th of threads()) {
        if (th.cut) continue;
        // walking through one stings and roots (the knot itself is safe to stand by)
        for (const p of f.alive()) {
          if (PROPS.segDist(p.x, p.y, th.x1, th.y1, th.x2, th.y2) > 14 || f.t - (th.last[p.id] ?? -9) < 2) continue;
          if (Math.hypot(p.x - th.kx, p.y - th.ky) < 50) continue;
          th.last[p.id] = f.t;
          f.damagePlayer(p, dmg.sting, { kind: 'svThread', avoidable: true, noVuln: true });
          f.debuff(p.id, 'rooted', 0.7);
        }
        // what the bots break: the knots (once nothing hostile is loose)
        if (th.knot && f.adds.has(th.knot.id)) th.knot.prio = 6;
      }
    });
    const layWeb = list => {   // (the threads and their knots stand: Act I lays all three, Act IV two of them)
      f.room.threads = list.map(w => {
        const th = Object.assign({ cut: false, burning: false, last: {} }, w);
        th.fl = f.addFloor({ kind: 'thread', x: Math.round((w.x1 + w.x2) / 2), y: Math.round((w.y1 + w.y2) / 2), r: Math.round(w.len / 2), x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
        th.knot = f.spawnAdd({ kind: 'knot', x: w.kx, y: w.ky, hp: dmg.knotHp, r: 24, inert: true, fixed: true, prio: 6, onDeath: () => fuse(th) });
        return th;
      });
      f.emit({ t: 'roomev', k: 'svweb:' + (++webN), l: list.map(w => [w.x1, w.y1, w.x2, w.y2, w.kx, w.ky]), dur: 9999 });
    };
    const web = () => {
      const c = call(1);
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Burning Web');
        layWeb(WEB);
        sv.webN = c.n;
      });
    };
    // her shadow drops along every thread left whole: all of each goes up at once, a shadow racing along it first
    // (dd: the seconds to the landing; noCast: Act IV keeps the Sovereign's own cast bar, the dance, and the echo's move shows as its telegraph)
    const shadowDrop = (dd = 4.0, noCast = false) => {
      const left = threads().filter(th => !th.cut);
      if (!left.length) { if (sv.webN) endEcho(sv.webN, 0.1); return; }
      const d = f.ct(dd);
      if (!noCast) f.cast('Burning Web', d, 'call');
      f.emit({ t: 'roomev', k: 'svshadow:' + (++webN), l: left.map(th => [th.x1, th.y1, th.x2, th.y2]), at: +(d - 1.6).toFixed(2), sp: 700, dur: +(d + 1).toFixed(2) });
      for (const th of left) {
        th.cut = true;   // (it will not sting again: it is about to go up)
        f.aoe({ kind: 'rect', x: th.x1, y: th.y1, angle: +Math.atan2(th.y2 - th.y1, th.x2 - th.x1).toFixed(3), len: th.len, w: 100 }, d, dmg.whole, { tag: 'svShadow', from: 'Burning Web' });
        f.afterKeep(d + 0.1, () => dropThread(th));
      }
      if (sv.webN) endEcho(sv.webN, d + 0.2);
    };
    // (a web the party cut entirely: its echo goes once the last fuse has burnt)
    f.ticker(() => {
      if (!sv.webN || sv.webEnded) return;
      const th = f.room.threads;
      if (th && th.length && th.every(t => t.cut) && th.every(t => !f.floor.includes(t.fl))) { sv.webEnded = true; endEcho(sv.webN, 0.1); }
    });

    // --- Call: Volkar. Ember and Ash ------------------------------------------------------------------------------------------
    // Every hero is fire (+) or ash (-) from the echo's rising until the act ends (f.polarity, the same Map Volkar's charges live in, so the clients
    // draw them as his and the bots' partner logic reads them). The charges PULL: opposite charges drift toward each other and the same charges drift
    // apart, all the time, gently (a small velocity host-side: the bots are moved by raid-host.js, a player's client adds it to their own walking, roomev
    // 'svdrift'; walking beats it). A Surge lands on pairs: an opposite charge within PAIR is the safe place, the same charge close is punished, alone hurts.
    const PAIR = 150, DRIFT = { v: 34, range: 440, hold: 70, every: 0.2 };
    f.polarity = new Map();
    const charge = id => f.polarity.get(id) || 1;
    const sendPol = clear => f.emit({ t: 'pol', m: [...f.polarity].map(([id, s]) => [id, s]), flip: 0, clear: clear ? 1 : 0 });
    let driftAt = 0;
    f.ticker(() => {
      if (!f.polarity.size || f.t < driftAt || f.setPieceHold()) return;
      driftAt = f.t + DRIFT.every;
      const al = f.alive(), v = [];
      for (const p of al) {
        let vx = 0, vy = 0;
        for (const o of al) {
          if (o.id === p.id) continue;
          const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
          if (d < 1 || d > DRIFT.range) continue;
          const w = 1 - d / DRIFT.range;
          if (charge(o.id) === charge(p.id)) { vx -= dx / d * w; vy -= dy / d * w; }
          else if (d > DRIFT.hold) { vx += dx / d * w; vy += dy / d * w; }
        }
        const m = Math.hypot(vx, vy), k = m > 1 ? 1 / m : 1;
        v.push([p.id, Math.round(vx * k * DRIFT.v), Math.round(vy * k * DRIFT.v)]);
      }
      f.emit({ t: 'svdrift', v, dt: DRIFT.every, dur: 0.35 });
    });
    const volkar = () => {
      const c = call(2);
      sv.volkarN = c.n;
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Ember and Ash');
        f.shuffle(f.players()).forEach((p, i) => f.polarity.set(p.id, i % 2 ? -1 : 1));
        sendPol(false);
      });
    };
    // the Surge (the echo's answer): same charges together arc; opposite charges together cancel out; alone takes it all
    const surge = () => {
      if (!f.polarity.size) return;
      const d = f.ct(6);
      f.mech({ type: 'polarity', shape: { kind: 'circle', x: 0, y: 0, r: PAIR }, delay: d, dmg: 0, tag: 'svSurge', avoidable: false, from: 'Ember and Ash',
        onResolve: () => {
          const al = f.alive();
          for (const p of al) {
            const near = al.filter(o => o.id !== p.id && Math.hypot(o.x - p.x, o.y - p.y) <= PAIR);
            if (near.some(o => charge(o.id) === charge(p.id))) f.damagePlayer(p, dmg.surgeSame, { kind: 'svArc', avoidable: true, ddown: true });
            else if (near.length) f.damagePlayer(p, dmg.surgePair, { kind: 'svSurge' });
            else f.damagePlayer(p, dmg.surgeAlone, { kind: 'svSurge' });
          }
        } });
      if (sv.volkarN) endEcho(sv.volkarN, d + 0.3);
    };
    // the act's end: the charges go with it (the 'pol' message carries clear: 1 for the clients)
    const clearCharges = () => { if (f.polarity.size) { f.polarity.clear(); sendPol(true); } };

    // --- Call: the Hollow King. The Crier -------------------------------------------------------------------------------------
    // He does not kneel and he does not swing: his echo rings its bell (svechoact 'bell'). Royal Doom falls on a random non-tank (its sigil and burning
    // ring are the clients' own doomed display), and one lantern lights: its flame flies from the halo's Hollow King sigil to the floor. Carry the lantern
    // to the doomed, or the doomed walks into its light, before the Doom runs out. A beat later his two knights replay the Sovereign's LAST Ashen Sweep,
    // standing at the two ends of the line it was cut along (the same half falls again: what did you just see?). The lanterns, Doom and the knights share
    // the Hollow King's own state on f (lanterns, doomed, knights, echoPlan), so the clients' lantern/doom/knight drawing and the bots' lantern job work.
    const LANT_PICK = 40, LANT_CURE = 85, DOOM_DUR = 13, REPLAY_WARN = 3.2;
    f.lanterns = []; f.doomed = new Map(); f.knights = []; f.echoPlan = [];
    f.noPause = () => f.doomed.size > 0 || !!f.runePair || sv.sealed;   // (no Time Stop on Royal Doom, on Twin Brands or on the wall)
    const sendLanterns = () => f.emit({ t: 'lant', l: f.lanterns.map(l => [l.id, Math.round(l.x), Math.round(l.y), l.carrier ?? null, l.last ? 1 : 0]) });
    const sendKnights = () => f.emit({ t: 'knights', k: f.knights.map(k => [k.id, k.x, k.y, +k.f.toFixed(2)]) });
    const bell = (n, d) => f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'bell', dur: d });
    // a script's own timers stand still through a set piece (the lanterns' fade and the Doom clocks)
    f.onSetPiece(a => { for (const [id, e] of f.doomed) f.doomed.set(id, e + a); for (const l of f.lanterns) if (isFinite(l.fade)) l.fade += a; });
    // a lantern goes to whoever walks over it (not the doomed); its light cures Doom and a cure uses it up
    f.ticker(() => {
      if (!f.lanterns.length && !f.doomed.size) return;
      let dirty = false;
      const al = f.alive();
      for (const l of f.lanterns) {
        if (l.carrier == null) continue;
        const c = al.find(p => p.id === l.carrier);
        if (c) { l.x = c.x; l.y = c.y; } else { l.carrier = null; dirty = true; }
      }
      for (const [id, end] of f.doomed) {
        const p = al.find(q => q.id === id);
        if (!p) { f.doomed.delete(id); continue; }
        const l = f.lanterns.find(o => Math.hypot(o.x - p.x, o.y - p.y) < LANT_CURE);
        if (l) {
          f.doomed.delete(id); delete p.s.debuffs.doom;
          f.emit({ t: 'cure', id, l: l.id });
          if (!l.last) f.lanterns = f.lanterns.filter(o => o !== l);   // (Act IV's lantern is the last one: it is never used up, it passes to whoever it cures, as the Long Night's)
          else if (!f.lanterns.some(o => o !== l && o.carrier === id)) l.carrier = id;
          dirty = true;
        } else if (f.t >= end) {
          f.doomed.delete(id);
          f.damagePlayer(p, 9999999, { kind: 'doom' });
        }
      }
      for (const l of f.lanterns) {
        if (l.carrier != null) continue;
        const p = al.find(q => !f.doomed.has(q.id) && !f.lanterns.some(o => o.carrier === q.id) && Math.hypot(q.x - l.x, q.y - l.y) < LANT_PICK);
        if (p) { l.carrier = p.id; dirty = true; }
      }
      if (!f.doomed.size) {   // (a spare lantern gutters out once nobody is doomed)
        const keep = f.lanterns.filter(l => l.last || f.t < l.fade);
        if (keep.length !== f.lanterns.length) { f.lanterns = keep; dirty = true; }
      }
      if (dirty) sendLanterns();
    });
    // a course that is cut at its HP gate waits for the next seam up to this long: a move that must play out whole holds it (the Hollow King's Tithe)
    const seamHold = on => { const c = f.curCourse; if (c && c.o) c.o.seam = on ? 20 : 8; };
    let lanternN = 0;
    const doomLands = () => {
      if (f.state !== 'live') return;
      const pool = f.shuffle(f.nonTanks().filter(p => !f.doomed.has(p.id)));
      if (!pool.length) return;
      const p = pool[0];
      f.doomed.set(p.id, f.t + DOOM_DUR); f.debuff(p.id, 'doom', DOOM_DUR);
      f.emit({ t: 'doomed', ids: [p.id], dur: DOOM_DUR });
      // one lantern lights, its flame taken from the halo: it flies from the Hollow King's sigil (3) to a spot in the hall, then the lantern stands
      const a = f.rng() * TAU;
      let x = Math.cos(a) * 330, y = Math.sin(a) * 250;
      if (ARENA.sd(x, y) > -70) { x *= 0.8; y *= 0.8; }
      x = Math.round(x); y = Math.round(y);
      f.emit({ t: 'roomev', k: 'svlantern:' + (++lanternN), sig: 3, x, y, fly: 1.1, dur: 18 });
      f.afterKeep(1.1, () => {
        if (f.state !== 'live' || !f.doomed.size) return;
        f.lanterns.push({ id: f.nextMechId++, x, y, carrier: null, last: false, fade: f.t + DOOM_DUR + 2 });
        sendLanterns();
      });
    };
    const placeKnights = sw => {
      const a = sw.angle, px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
      f.knights = [-1, 1].map(s => { const q = ARENA.clamp({ x: sw.x + px * s * 400, y: sw.y + py * s * 400 }, 40); return { id: f.nextMechId++, x: Math.round(q.x), y: Math.round(q.y), f: a }; });
      sendKnights();
    };
    const replay = sw => {
      if (f.state !== 'live' || !f.knights.length) return;
      for (const k of f.knights) f.emit({ t: 'kswing', id: k.id, kind: 'sweep', dur: REPLAY_WARN });
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: sw.x, y: sw.y, angle: sw.angle, len: 1300, w: 2600 }, delay: REPLAY_WARN, dmg: dmg.sweep, tag: 'svReplay', from: 'The Crier',
        onResolve: () => { f.echoPlan = []; f.afterKeep(1.2, () => { f.knights = []; sendKnights(); }); } });
    };
    const crier = () => {
      const c = call(3), t0 = f.t;
      const sw = sv.lastSweep || { x: Math.round(B.x), y: Math.round(B.y), angle: +(B.facing + sv.side * Math.PI / 2).toFixed(3) };
      sv.hkN = c.n; sv.hkEnded = false;
      seamHold(true);
      // (the bots keep clear of the replay before it shows)
      f.echoPlan = [{ knight: -1, kind: 'sweep', at: t0 + c.d + 4.0 + REPLAY_WARN, shape: { kind: 'rect', x: sw.x, y: sw.y, angle: sw.angle, len: 1300, w: 2600 } }];
      f.afterKeep(c.d, () => { if (f.state !== 'live') return; answer('The Crier', 1.2); bell(c.n, 1.6); placeKnights(sw); });
      f.afterKeep(c.d + 1.2, () => { if (f.state === 'live') answer('Royal Doom', 1.0); });
      f.afterKeep(c.d + 2.2, doomLands);
      f.afterKeep(c.d + 4.0, () => replay(sw));
      f.afterKeep(c.d + DOOM_DUR + 3.4, () => seamHold(false));
    };
    // --- Royal Tithe, and the Dirge eight seconds later (the Hollow King's, as the heal check of Act I) ----------------------
    // Everyone drops to a third of their health (shields are not life, so they stay); the Sovereign holds its blows on the tank until then. His bell rings
    // with the cast, and the echo goes when the Dirge has tolled.
    const tithe = () => {
      const d = f.ct(5);
      f.cast('Royal Tithe', d, 'call');
      f.healCheck(d + 8.6);
      seamHold(true);
      f.afterKeep(d + 8.5, () => seamHold(false));
      if (sv.hkN) bell(sv.hkN, 1.6);
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        B.noAutoUntil = f.t + 9;
        f.emit({ t: 'roomev', k: 'tithe' });
        for (const p of f.alive()) {
          const s = f.ps.get(p.id);
          if (!s || s.mits.some(m => m.kind === 'invuln')) continue;
          const a = Math.round(s.hp - s.maxHp * 0.33);
          if (a <= 0) continue;
          s.hp -= a; f.stats[p.id].taken += a; s.hist = [];   // (hist: the health a Rewind reaches back to: the Tithe is a set number, not damage to undo)
          f.emit({ t: 'pdmg', id: p.id, a, k: 'tithe', hp: Math.round(s.hp), dd: 0 });
        }
      });
    };
    const dirge = () => {
      const d = 5;
      f.cast('Dirge', d, 'call');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.dirge, hidden: true, tag: 'svDirge', from: 'Royal Tithe' });
      if (sv.hkN && !sv.hkEnded) { sv.hkEnded = true; endEcho(sv.hkN, d + 0.4); }
    };

    // --- The road burns back (78%, into Act II) -------------------------------------------------------------------------------
    // Set piece 'svburnback' (8 s, the Sovereign immune for the first 3): the act turns, the room becomes the forge, and what Act I held is let go (the
    // charges, a Doom, the lantern, the knights, an echo still standing). The halo keeps its four dark sigils.
    // cutAct: an act turns (here, the rebirth and Every Name), and what the act before it still had in flight is cut at once, not let to land in the next one: the script's own
    // afterKeeps of the old era (they are dropped, and would do nothing anyway), the telegraphs on the floor, the threads with their floors and knots, the charges, every echo still
    // standing and the moves' own marks. (A set piece stops the clocks, so without this an Act I move laid with a long delay would land 8 s late in Act II.)
    const cutAct = () => {
      era++;
      f.events = f.events.filter(e => !(e.keep && e.fn && e.fn.era !== undefined && e.fn.era < era));
      f.mechs.clear(); f.emit({ t: 'tgclear' }); f.emit({ t: 'roomev', k: 'svactcut' });   // (the client drops the cut moves' own timelines: main.js SV_CUT)
      f.puddles = []; f.tethers.clear();
      for (const th of threads().slice()) dropThread(th);
      delete f.room.threads;
      clearCharges();
      for (const n of sv.echoes) f.emit({ t: 'roomev', k: 'svecho:' + n, dur: 0.1 });
      sv.echoes.clear(); sv.call = -1;
      sv.webN = 0; sv.webEnded = false; sv.volkarN = 0; sv.hkN = 0; sv.hkEnded = true; sv.busy = 0; sv.busyPlay = 0;
      B.lockFacing = false; B.holdUntil = 0; B.moveTo = null;
      f.runePair = null;
    };
    const burnback = () => f.setPiece({ id: 'svburnback', dur: 8, invul: 3, run: () => {
      cutAct();
      for (const id of f.doomed.keys()) { const s = f.ps.get(id); if (s) delete s.debuffs.doom; f.emit({ t: 'cure', id, l: 0 }); }
      f.doomed.clear(); f.lanterns = []; sendLanterns();
      f.knights = []; f.echoPlan = []; sendKnights();
      sv.lit = 0xff0; sv.dark = [0, 1, 2, 3];   // (the four dark sigils of set 1, whatever calls the party cut short)
      sv.act = 2;
      f.emit({ t: 'roomev', k: 'svact', act: 2, dur: 9999 });
      f.setForm('forge');
      halo();
    } });

    // --- Act I ------------------------------------------------------------------------------------------------------------------
    // A timeline of [design time, step, name]; the descent stops the course clock for 6 s, so every design time after it is 6 less on the course.
    const line = list => { let prev = 0; return list.map(([T, fn, name]) => { const c = T > 0 ? T - 6 : 0, dt = c - prev; prev = c; return [dt, fn, name]; }); };
    const actI = from => {
      // (one list, cut into sets after: each step's delay is from the step before it, across the sets)
      const all = line([
        [0, descent, 'The Way Down'], [8, kindling, 'Kindling'], [18, () => sweep(), 'Ashen Sweep'], [28, brand, 'Brand'],
        [40, flambe, 'Grubnak, the Ogre Chef'], [65, procession, 'Halo Procession'],   // (the first Halo Turn, grown: it ends on its own Cupped Ember at about 92)
        [93, web, 'Skitterra, the Spider Broodmother'], [110, brand, 'Brand'], [125, shadowDrop, 'Burning Web'], [130, () => sweep({ swap: true }), 'Ashen Sweep'],
        [140, volkar, 'Volkar, the Storm Titan'], [150, surge, 'Polarity Surge'], [160, scatter, 'Scatter'], [172, brand, 'Brand'],
        [180, crier, 'The Hollow King'], [200, tithe, 'Royal Tithe'], [208, dirge, 'Dirge'],
      ]);
      const sets = [all.slice(0, 4), all.slice(4, 6), all.slice(6, 10), all.slice(10, 14), all.slice(14, 15), all.slice(15)];
      return f.course({
        onStart: () => actDmg(1),
        until: 0.78,
        sets,
        closing: [[10, kindling, 'Kindling'], [12, brand, 'Brand']],   // (a slow party's soft enrage: Kindling and Brand, a little harder each pass)
        next: t => actII(t),
      }, from);
    };

    // --- Act II, The Forge (78% -> 50%) -----------------------------------------------------------------------------------------
    // The echoes now change the room, and the change outlasts them (the act's sunk sheets, its stumps, the scorched spots). The forge floor is a grid of
    // sheets (SH wide; the middle one stands under the origin) and three scorched spots glow in it (0.52 R, at -90, 30 and 150 degrees: spotXY).
    //   Hrimgar, Glass Floor: he stamps and a crack RIPPLES out from the sheet under his foot, sheet by sheet, each shattering as the wave reaches it
    //     (the whole wave is painted from the stamp; svGlass fades the later rings so the next is the one drawn in full). A shattered sheet is SUNK until
    //     the act ends: black water that hurts and slows whoever stays in it. Outrun the wave, or cross the sunk water once it has passed.
    //   The Hydra, Heads of Flame: three heads of fire rise from floor sigils one at a time. A head is a killable inert add that bites a random hero every
    //     few seconds until it is cut; a cut head's stump stays alight as a small fire pool. The ORDER the heads are cut in is f.sv.cutOrder (the wall
    //     replays it). The Hydra's own echo stands for as long as it is wanted (S2b ends it).
    //   Vhalgrath, Cinder Dive: he dives along a line of embers onto a scorched spot (the spot is painted first, the line a beat after). Where the line
    //     crosses a sunk sheet the water boils; the landing rings out as an Aftershock (stand in the quiet middle), and a beat later steam bursts up in
    //     a small circle at every crossing.
    const SH = 150, SH_R = 500, SH_REACH = 3.0, GLASS_LEAD = 2.6, GLASS_STEP = 0.8;
    const sheets = sv.sheets = [];   // [{ cx, cy, st: 0 whole | 1 cracking | 2 sunk, z }]  (z: the zone of the water, which the bots read)
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) if (Math.hypot(i * SH, j * SH) <= SH_R) sheets.push({ cx: i * SH, cy: j * SH, st: 0, z: null });
    const sheetAt = (x, y) => { const cx = Math.round(x / SH) * SH, cy = Math.round(y / SH) * SH; return sheets.find(s => s.cx === cx && s.cy === cy) || null; };
    const spotXY = i => { const a = (-90 + i * 120) * Math.PI / 180, r = 0.52 * ARENA.r; return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) }; };
    const sheetRect = s => ({ kind: 'rect', x: s.cx - SH / 2, y: s.cy, angle: 0, len: SH, w: SH });
    let sheetsDirty = false;   // (a wave sinks many sheets in one tick: the state goes out once a tick)
    const sendSheets = () => { sheetsDirty = true; };
    f.ticker(() => { if (sheetsDirty) { sheetsDirty = false; f.emit({ t: 'roomev', k: 'svsheets', w: SH, sunk: sheets.filter(s => s.st === 2).map(s => [s.cx, s.cy]), dur: 9999 }); } });
    // a sheet goes under: black water for the rest of the act (a zone that hurts a tick a second, the way Hrimgar's does; the slow is the ticker below)
    const sinkSheet = s => {
      if (s.st === 2) return;
      s.st = 2;
      const z = { id: f.nextMechId++, effect: 'burn', tag: 'svSunk', ddown: true, last: {}, shape: sheetRect(s), dmg: dmg.sunk, startAt: f.t, end: 1e9 };
      f.zones.push(z); s.z = z; zoneMsg(z, 9999);
      sendSheets();
    };
    // the act ends and the water goes with it (S2b calls it at the turn into Act III)
    const mendSheets = () => { for (const s of sheets) { s.st = 0; if (s.z) s.z.end = f.t; s.z = null; } sendSheets(); };
    // black water numbs whoever lingers in it: a quick crossing is at full pace, the legs go heavy after a heartbeat
    const wade = new Map();
    f.ticker(dtT => {
      if (!sheets.some(s => s.st === 2)) return;
      for (const p of f.alive()) {
        const s = sheetAt(p.x, p.y), w = !!s && s.st === 2, t0 = wade.get(p.id) || 0;
        wade.set(p.id, w ? t0 + dtT : Math.max(0, t0 - dtT * 2));
        if (w && t0 > 0.55) f.debuff(p.id, 'slowed', 0.35);
      }
    });
    // the wave from the sheet at (fx, fy): every whole sheet within `reach` sheets of it is painted at once, each shattering GLASS_STEP s after the one a
    // step nearer (the foot first, GLASS_LEAD s after now). Returns { n, end, foot, list } (end: seconds from now the last one lands)
    let glassN = 0;
    const glassWave = (fx, fy, o = {}) => {
      const foot = sheetAt(fx, fy); if (!foot) return null;
      const reach = o.reach ?? SH_REACH, lead = f.ct(o.lead ?? GLASS_LEAD), step = o.step ?? GLASS_STEP;
      const list = [];
      for (const s of sheets) {
        if (s.st !== 0) continue;
        const dd = Math.hypot(s.cx - foot.cx, s.cy - foot.cy) / SH;
        if (dd > reach + 1e-6) continue;
        list.push({ s, at: +(lead + Math.round(dd * 2) / 2 * step).toFixed(2) });
      }
      list.sort((a, b) => a.at - b.at);
      const n = ++glassN, end = list.length ? list[list.length - 1].at : 0;
      for (const e of list) {
        e.s.st = 1;
        f.aoe(sheetRect(e.s), e.at, dmg.shatter, { tag: 'svGlass', from: 'Glass Floor', onResolve: () => { if (o.sink === false) e.s.st = 0; else sinkSheet(e.s); } });   // (o.sink false, Act IV: the pane shatters and the floor stays whole)
      }
      f.emit({ t: 'roomev', k: 'svglass:' + n, foot: [foot.cx, foot.cy], w: SH, s: list.map(e => [e.s.cx, e.s.cy, e.at]), dur: +(end + 2).toFixed(2) });
      return { n, end, foot, list };
    };
    // Call: Hrimgar. He rises at his sigil, stamps (the echo's swing), and the wave runs from the sheet under his foot; he goes once the last has landed
    const glassFloor = (o = {}) => {   // o: { fly: 0 (a second call), home: { x, y } (where he stands: the foot), reach, lead }
      const c = call(5, 40, o.fly ?? FLY, o.home);
      busy(c.d + (o.lead ?? GLASS_LEAD) + 3.0);
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Glass Floor');
        f.emit({ t: 'roomev', k: 'svechoact:' + c.n, anim: 'attack', dur: 1.2 });
        const at = o.home || spot(5), w = glassWave(at.x, at.y, { reach: o.reach, lead: o.lead });
        endEcho(c.n, (w ? w.end : 1.6) + 0.5);
      });
    };

    // Call: the Hydra. Three floor sigils (NE, NW and W, far from the first wave), a head rising from each in turn. headRise(k) lights the sigil and the
    // head stands RISE_H s later; S2b lays the third (k = 2) at 5:45.
    const HEAD_AT = [-45, -135, 180].map(a => ({ x: Math.round(Math.cos(a * Math.PI / 180) * 340), y: Math.round(Math.sin(a * Math.PI / 180) * 340) }));
    const heads = sv.heads = [];   // [{ k, add, x, y, nextBite, dead }]
    sv.cutOrder = []; sv.stumps = [];   // the order the heads were cut in (head numbers 0..2), and the stumps' fire pools
    const BITE = { every: 5.0, warn: 2.0, r: 100 };
    let biteN = 0, biteLast = null, biteGate = 0;
    f.onSetPiece(a => { biteGate += a; for (const h of heads) h.nextBite += a; });
    const headCut = h => {
      h.dead = true; sv.cutOrder.push(h.k);
      // the stump stays alight: a small fire pool, for the rest of the act (the wall of S2b may stir it again)
      const z = { id: f.nextMechId++, effect: 'burn', tag: 'svStump', ddown: true, last: {}, shape: { kind: 'circle', x: h.x, y: h.y, r: 70 }, dmg: dmg.stump, startAt: f.t, end: 1e9 };
      f.zones.push(z); sv.stumps.push({ k: h.k, x: h.x, y: h.y, z }); zoneMsg(z, 9999);
      f.emit({ t: 'roomev', k: 'svcut:' + (h.k + 1), x: h.x, y: h.y, order: sv.cutOrder.length, dur: 9999 });
    };
    const bite = h => {
      const al = f.alive(); if (!al.length) return;
      const p = f.pick(al.length > 1 ? al.filter(q => q.id !== biteLast) : al);
      biteLast = p.id; biteGate = f.t + 1.6;
      const d = f.ct(BITE.warn);
      f.emit({ t: 'roomev', k: 'svbite:' + (++biteN), head: h.k + 1, x: h.x, y: h.y, id: p.id, dur: +(d + 0.8).toFixed(2) });
      f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: BITE.r }, delay: d, dmg: dmg.bite, follow: p.id, lockAt: 0.7, tag: 'svBite', from: 'Heads of Flame' });
    };
    f.ticker(() => {
      if (f.t < biteGate || f.setPieceHold() || sv.quiet) return;
      for (const h of heads) {
        if (h.dead || f.t < h.nextBite || !f.adds.has(h.add.id)) continue;
        h.nextBite = f.t + BITE.every; bite(h);
        return;
      }
    });
    const RISE_H = 2.2;
    const headRise = (k, rise = RISE_H) => {
      const at = HEAD_AT[k]; if (!at) return;
      f.emit({ t: 'roomev', k: 'svhead:' + (k + 1), x: at.x, y: at.y, rise, dur: 9999 });
      f.afterKeep(rise, () => {
        if (f.state !== 'live' || sv.quiet) return;   // (the wall seals the Sovereign: a head that has not risen by then never does)
        const a = f.spawnAdd({ kind: 'hy-flame', x: at.x, y: at.y, hp: dmg.headHp, r: 36, inert: true, fixed: true, prio: 5 });
        a.facing = Math.atan2(at.y, at.x);
        const h = { k, add: a, x: at.x, y: at.y, nextBite: f.t + 3 + k * 1.2, dead: false };
        heads.push(h);
        a.onDeath = () => headCut(h);
      });
    };
    const headCall = k => { f.cast('Heads of Flame', f.ct(2.0), 'call'); headRise(k, f.ct(2.0)); };   // (the second and later heads: a short cast, then it rises)
    const flameHeads = () => {
      const c = call(7, -1);   // (the Hydra's echo stays: its heads stay until they are cut)
      sv.hydraN = c.n;
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Heads of Flame');
        f.emit({ t: 'roomev', k: 'svechoact:' + c.n, anim: 'roar', dur: 1.6 });
        headRise(0, 1.6);
      });
    };
    const hydraEnd = () => { if (sv.hydraN) { endEcho(sv.hydraN, 0.1); sv.hydraN = 0; } };

    // Call: Vhalgrath. landI / fromI: which scorched spot he lands on, and which spot's rim the line starts past (the fight is fixed: the first dive
    // lands on the 30 degree spot from the 150 degree side, across the sunk sheets of the first wave)
    const DIVE = { landR: 120, pathW: 140, steamR: 85, quiet: 240, wait: 5.4, pathLate: 1.3, steamLate: 1.0, steamWait: 3.6 };
    // a segment's stretch inside a sheet: [t0, t1] along it, or null
    const clipSheet = (a, b, s) => {
      let t0 = 0, t1 = 1; const h = SH / 2;
      for (const [p, d, lo, hi] of [[a.x, b.x - a.x, s.cx - h, s.cx + h], [a.y, b.y - a.y, s.cy - h, s.cy + h]]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
        let u0 = (lo - p) / d, u1 = (hi - p) / d; if (u0 > u1) [u0, u1] = [u1, u0];
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
      }
      return t0 < t1 ? [t0, t1] : null;
    };
    let diveN = 0;
    // one dive at a scorched spot: returns { E, L, d (seconds to the landing), cross: [{ x, y, cx, cy }] }
    const dive = (landI, fromI, c, wait = DIVE.wait) => {
      const L = typeof landI === 'object' ? landI : spotXY(landI), P = typeof fromI === 'object' ? fromI : spotXY(fromI), ap = Math.atan2(P.y, P.x), E = { x: Math.round(Math.cos(ap) * (ARENA.r + 40)), y: Math.round(Math.sin(ap) * (ARENA.r + 40)) };
      const ang = Math.atan2(L.y - E.y, L.x - E.x), len = Math.hypot(L.x - E.x, L.y - E.y), d = f.ct(wait), late = DIVE.pathLate;
      const group = new Set();
      f.aoe({ kind: 'circle', x: L.x, y: L.y, r: DIVE.landR }, d, dmg.diveLand, { tag: 'svDiveLand', group, from: 'Cinder Dive' });   // (the spot, painted first)
      f.afterKeep(late, () => f.aoe({ kind: 'rect', x: E.x, y: E.y, angle: +ang.toFixed(3), len: Math.round(len), w: DIVE.pathW }, d - late, dmg.divePass, { tag: 'svDivePath', group, from: 'Cinder Dive' }));
      // where the line crosses sunk water: the water boils, and steam will burst there
      const cross = [];
      for (const s of sheets) {
        if (s.st !== 2) continue;
        const q = clipSheet(E, L, s);
        if (!q || (q[1] - q[0]) * len < 40) continue;
        const m = (q[0] + q[1]) / 2;
        cross.push({ x: Math.round(E.x + (L.x - E.x) * m), y: Math.round(E.y + (L.y - E.y) * m), cx: s.cx, cy: s.cy });
      }
      f.emit({ t: 'roomev', k: 'svdive:' + (++diveN), x1: E.x, y1: E.y, x2: L.x, y2: L.y, at: +d.toFixed(2), fly: 1.4, boil: cross.map(q => [q.cx, q.cy, q.x, q.y]), dur: +(d + 7).toFixed(2) });
      return { E, L, d, cross };
    };
    const cinderDive = (landI = 1, fromI = 2, o = {}) => {   // o: { fly: 0 (a second call), wait (seconds from the stamp to the landing) }
      const c = call(4, 40, o.fly ?? FLY);
      busy(c.d + f.ct(o.wait ?? DIVE.wait) + 4.0);
      f.afterKeep(c.d, () => {
        if (f.state !== 'live') return;
        answer('Cinder Dive', 1.6);
        const r = dive(landI, fromI, c, o.wait);
        // he lands: the ground rings out from the landing (only the middle, by it, is quiet), and a beat after the ring the steam bursts
        f.afterKeep(r.d + 0.03, () => {
          if (f.state !== 'live') return;
          f.emit({ t: 'roomev', k: 'svechoact:' + c.n, anim: 'attack', dur: 1.2 });
          f.afterKeep(0.4, () => {
            if (f.state !== 'live') return;
            const ad = f.ct(2.8);
            f.cast('Aftershock', ad, 'call');
            f.aoe({ kind: 'donut', x: r.L.x, y: r.L.y, r: 1400, r2: DIVE.quiet }, ad, dmg.after, { tag: 'svAfter', from: 'Cinder Dive' });
          });
          f.afterKeep(DIVE.steamLate, () => {
            if (f.state !== 'live') return;
            for (const q of r.cross) f.aoe({ kind: 'circle', x: q.x, y: q.y, r: DIVE.steamR }, f.ct(DIVE.steamWait), dmg.steam, { tag: 'svSteam', from: 'Cinder Dive' });
          });
          endEcho(c.n, DIVE.steamLate + f.ct(DIVE.steamWait) + 0.6);
        });
      });
    };

    // Call: Azerath. Twin Brands (the Rune Pair, as the Sovereign reads it). Azerath's four elements live on the four walls (his own sigil order: fire north, frost
    // east, lightning south, the void west). Two brands go on two non-tanks, the TWO NEAREST THE MIDDLE OF THE ROOM when his echo stands (the fight is fixed: a rule,
    // not a draw; the tank is never branded unless fewer than two others live), and one wall lights in its element. Frost and lightning (a wall to MEET at) paint a blue
    // circle at the lit wall: both bearers must stand in it when it closes, and the brand burns a bearer who is not. Fire and the void (a wall to FLEE from) paint a red
    // bloom at the lit wall and a red circle on each bearer: leave the wall for the two far corners, apart (a circle on a bearer hurts the other one standing in it).
    // The shifted cast (Twin Brands again, later in the act): the first wall is only LIT (no damage is laid for it), then at 2.8 s the lit wall changes once and the
    // telegraphs of the new wall are painted in full, with 5.0 s to reach them.
    // The bots read it as f.runePair (the Rune Pair's own field, plus `goal`: { id: { x, y, r } }, where each bearer is to stand).
    const TWIN = { fire: { a: -90, rule: 'split' }, frost: { a: 0, rule: 'pair' }, bolt: { a: 90, rule: 'pair' }, void: { a: 180, rule: 'split' } };
    const TW = { r: 380, meet: 150, bloom: 290, spread: 125, corner: 360 };
    let twinRot = 0;   // (degrees: Act IV's pass three turns the four walls with its frame, the First Signal; Act III's Twin Brands never sets it)
    const wallPoint = el => { const a = (TWIN[el].a + twinRot) * Math.PI / 180; return { x: Math.round(Math.cos(a) * TW.r), y: Math.round(Math.sin(a) * TW.r) }; };
    const cornersFor = el => [-45, 45].map(d => { const b = (TWIN[el].a + twinRot + 180 + d) * Math.PI / 180; return { x: Math.round(Math.cos(b) * TW.corner), y: Math.round(Math.sin(b) * TW.corner) }; });
    const twinPair = () => {
      const nts = f.nonTanks(), pool = nts.length >= 2 ? nts : f.alive();
      return pool.slice().sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y) || p.id - q.id).slice(0, 2);
    };
    let twinN = 0;
    // where each bearer stands for this wall (what the bots read): the wall's circle for both, or one far corner each (the nearer corner to each)
    const setTwin = (ids, el, rule0) => {   // (rule0: Act IV reads the rule by the bearers' charges, not by the wall's element)
      const W = wallPoint(el), rule = rule0 || TWIN[el].rule, goal = {};
      if (rule === 'pair') ids.forEach(id => { goal[id] = { x: W.x, y: W.y, r: 70 }; });
      else {
        const cs = cornersFor(el), ps = ids.map(live), d = (p, c) => (p ? Math.hypot(p.x - c.x, p.y - c.y) : 0);
        const straight = ps.length < 2 || d(ps[0], cs[0]) + d(ps[1], cs[1]) <= d(ps[0], cs[1]) + d(ps[1], cs[0]);
        ids.forEach((id, i) => { const c = cs[(i + (straight ? 0 : 1)) % 2]; goal[id] = { x: c.x, y: c.y, r: 60 }; });
      }
      f.runePair = { a: ids[0], b: ids[1] ?? null, ea: el, eb: el, el, rule, on: 1, goal };
      return { W, rule };
    };
    // paint the wall's telegraphs (d seconds) for these bearers
    const layTwin = (ids, el, d, rule0) => {
      const { W, rule } = setTwin(ids, el, rule0);
      if (rule === 'pair') {
        f.mech({ type: 'stack', shape: { kind: 'circle', x: W.x, y: W.y, r: TW.meet }, delay: d, dmg: dmg.twinStack, need: Math.min(2, f.alive().length), tag: 'svMeet', from: 'Twin Brands',
          onResolve: () => { for (const id of ids) { const q = live(id); if (q && Math.hypot(q.x - W.x, q.y - W.y) > TW.meet + 14) f.damagePlayer(q, dmg.twinBrand, { kind: 'svTwin', avoidable: true, ddown: true }); } } });
      } else {
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: W.x, y: W.y, r: TW.bloom }, delay: d, dmg: dmg.bloom, tag: 'svBloom', from: 'Twin Brands' });
        for (const id of ids) { const q = live(id); if (q) f.mech({ type: 'spread', shape: { kind: 'circle', x: Math.round(q.x), y: Math.round(q.y), r: TW.spread }, delay: d, dmg: dmg.twinSpread, follow: id, lockAt: 0.8, tag: 'svTwin', from: 'Twin Brands' }); }
      }
      return { W, rule };
    };
    // o.el: the wall lit at first; o.to: the wall it changes to (once, mid-cast); o.fly 0: a second call
    const twinBrands = (o = {}) => {
      const c = call(6, 40, o.fly ?? FLY);
      const first = o.to ? 2.8 : 0, last = o.to ? 5.0 : 7.0;
      busy(c.d + first + last + 1.2, true);   // (the wall cuts it, heartRun)
      sv.twinEcho = c.n;
      f.afterKeep(c.d, () => {
        if (f.state !== 'live' || sv.quiet) return;
        answer('Twin Brands');
        f.emit({ t: 'roomev', k: 'svechoact:' + c.n, anim: 'attack', dur: 1.2 });
        const pair = twinPair();
        if (!pair.length) { endEcho(c.n, 0.5); return; }
        const ids = pair.map(p => p.id), n = ++twinN;
        const msg = (el, at, shift, from) => {
          const W = wallPoint(el);
          f.emit({ t: 'roomev', k: 'svtwin:' + n, el, wall: TWIN[el].a, x: W.x, y: W.y, rule: TWIN[el].rule, ids, corners: TWIN[el].rule === 'split' ? cornersFor(el).map(q => [q.x, q.y]) : null,
            r: TWIN[el].rule === 'pair' ? TW.meet : TW.bloom, at: +at.toFixed(2), shift: shift ? 1 : 0, from: from || null, dur: +(at + 1.5).toFixed(2) });
        };
        if (o.to) {
          // the first wall is only lit (the brands are on, the wall glows; nothing is laid for it); the bots head for it all the same
          setTwin(ids, o.el); msg(o.el, first + last, false);
          f.afterKeep(first, () => { if (f.state !== 'live' || sv.quiet) return; layTwin(ids, o.to, last); msg(o.to, last, true, o.el); });
        } else { layTwin(ids, o.el, last); msg(o.el, last, false); }
        f.afterKeep(first + last + 0.15, () => { f.runePair = null; });
        endEcho(c.n, first + last + 0.5);
      });
    };

    // The act's one pair (6:15): Vhalgrath's second dive and Hrimgar's second wave. He lands on the second scorched spot (the first dive landed on the first, from this
    // one's side; this one comes from the first's side), 7 s after his stamp; Hrimgar stamps 3.9 s after Vhalgrath's, on the sheet diagonal to the landing sheet, so the
    // landing sheet is the wave's edge: it is whole when he lands and shatters 0.7 s after (a sheet about to sink). The whole wave has gone 1.1 s after the landing, 2 s
    // before the Aftershock: the two whole sheets (-300,0) and (-450,150) lie inside its quiet middle, out of the wave.
    const pairMove = () => {
      cinderDive(2, 1, { fly: 0, wait: 7.0 });
      f.afterKeep(f.ct(3.9), () => { if (f.state === 'live') glassFloor({ fly: 0, home: { x: -150, y: 300 }, reach: 2 }); });
    };

    // --- The Anvil Count (Act II's dance block: Program Loop; docs/plans/2026-10-ultimate-raid.md "The dance pass") -------------------------------------------------
    // The Sovereign's own move. Every hero is given 1 to 4 pips over their head: their place in the count (the healer is never the last, so never waits longest). Blue towers then rise
    // one at a time in pip order, each 7.4 s after the last; the tower for pip k is placed 5.2 s before it can be soaked, on a whole forge sheet on the far side of the room from where its
    // hero stands then (the point opposite them through the middle, the nearest whole sheet 320 to 620 away), and it glows in that hero's own colour. So each soak is a run across a
    // floor Hrimgar's water has cut up. A tower soaked by the wrong hero, or by no one, is a raidwide (not a wipe). Only the tower in play is on the floor: the later ones do not exist yet.
    // The Hydra's heads hold their bites for the count. 3.6 s cast, towers at 9.0, 16.4, 23.8 and 31.2 s: about 32 s in all with four heroes.
    // The bots read each tower's owner as m.anvilFor (bots.js towerPlan).
    Object.assign(dmg, { anvil: 3000, anvilFail: 8000 });   // (the soak's tick and the raidwide of a bad soak: neither is scaled by the act, see actDmg)
    const ANVIL = { cast: 3.6, first: 5.4, gap: 7.4, lead: 5.2, r: 85, rim: 380, hold: 1.2, wet: 400 };
    let anvilN = 0;
    sv.anvil = { done: 0, bad: 0, skip: 0 };
    // a tower whose hero falls before it can be soaked is taken off the floor at once (nobody is left to soak it: it is no raidwide; the bots' plan skips it too)
    const anvilLive = [];
    f.ticker(() => {
      for (let i = anvilLive.length - 1; i >= 0; i--) {
        const e = anvilLive[i];
        if (!f.mechs.has(e.m.id)) anvilLive.splice(i, 1);
        else if (!live(e.id)) { f.cancel(e.m); sv.anvil.skip++; anvilLive.splice(i, 1); }
      }
    });
    // who has which pip: a shuffle, then the healer moved off the last place (2 or 3 of 4; the middle of 3; first of 2)
    const anvilOrder = al => {
      const ord = al.slice();
      for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(f.rng() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
      const n = ord.length, hi = ord.findIndex(p => p.s.role === 'healer');
      if (hi >= 0 && n >= 2) {
        const okay = n === 2 ? [0] : n === 3 ? [1] : [1, 2];
        if (!okay.includes(hi)) { const to = okay[Math.floor(f.rng() * okay.length)]; [ord[hi], ord[to]] = [ord[to], ord[hi]]; }
      }
      return ord;
    };
    // the sheet for a tower: whole (never a sunk or cracking one), well inside the rim, clear of a head or a stump, and across the room from the hero
    const anvilSpot = (p, used = []) => {
      const busyAt = heads.filter(h => !h.dead && f.adds.has(h.add.id)).map(h => ({ x: h.x, y: h.y })).concat(sv.stumps.map(s => ({ x: s.x, y: s.y })));
      const free = s => s.st === 0 && !busyAt.some(b => Math.hypot(b.x - s.cx, b.y - s.cy) < 150) && !used.some(b => Math.hypot(b.x - s.cx, b.y - s.cy) < 200);   // (and not near an earlier tower of this count: each rises on a sheet of its own)
      for (const [lo, hi, rim] of [[320, 620, ANVIL.rim], [240, 760, ANVIL.rim], [150, 1400, 440]]) {
        let best = null, bd = Infinity;
        for (const s of sheets) {
          if (!free(s) || Math.hypot(s.cx, s.cy) > rim) continue;
          const d = Math.hypot(s.cx - p.x, s.cy - p.y); if (d < lo || d > hi) continue;
          let o = Math.hypot(s.cx + p.x, s.cy + p.y);   // (the distance from the point opposite the hero, and every sunk sheet the straight run crosses counts against a sheet: the run is across cut-up floor, not through the worst of it)
          for (const w of sheets) { if (w.st !== 2) continue; const q = clipSheet(p, { x: s.cx, y: s.cy }, w); if (q && (q[1] - q[0]) * d > 40) o += ANVIL.wet; }
          if (o < bd - 1e-6) { bd = o; best = s; }
        }
        if (best) return { x: best.cx, y: best.cy };
      }
      return { x: Math.round(-p.x * 0.8), y: Math.round(-p.y * 0.8) };   // (every sheet that far out is under water: the far side anyway)
    };
    const anvilCount = () => {
      if (f.state !== 'live' || sv.quiet) return;
      const al = f.alive(); if (!al.length) return;
      const ord = anvilOrder(al), n = ord.length, d = f.ct(ANVIL.cast), N = ++anvilN, used = [], R = k => d + ANVIL.first + k * ANVIL.gap, total = R(n - 1) + ANVIL.hold;
      const slots = ord.map(p => f.slotOf(p.id));
      f.cast('The Anvil Count', d, 'call');
      hold(total); busy(total + 0.5, true);   // (the wall cuts it, heartRun)
      biteGate = Math.max(biteGate, f.t + total + 0.5);
      for (const h of heads) h.nextBite = Math.max(h.nextBite, f.t + total + 2.0);
      f.emit({ t: 'roomev', k: 'svanvil:' + N, ids: ord.map(p => p.id), slots, at: ord.map((_, k) => +R(k).toFixed(2)), r: ANVIL.r, dur: +(total + 0.6).toFixed(2) });
      ord.forEach((p, k) => {
        const rise = R(k) - ANVIL.lead;
        f.afterKeep(rise, () => {
          if (f.state !== 'live' || sv.quiet) return;
          const q = live(p.id);
          if (!q) { sv.anvil.skip++; return; }   // (the hero it belongs to has fallen: nothing rises for them)
          const at = anvilSpot(q, used), delay = ANVIL.lead;
          used.push(at);
          f.emit({ t: 'roomev', k: 'svanvilt:' + (N * 10 + k), x: at.x, y: at.y, id: p.id, slot: slots[k], pips: k + 1, at: +delay.toFixed(2), dur: +(delay + 2.4).toFixed(2) });
          const m = f.mech({ type: 'tower', shape: { kind: 'circle', x: at.x, y: at.y, r: ANVIL.r }, delay, dmg: dmg.anvil, failDmg: dmg.anvilFail, need: 1, tag: 'svAnvil', from: 'The Anvil Count', anvilFor: p.id,
            onResolve: inside => {
              if (inside.some(o => o.id === p.id)) { sv.anvil.done++; return; }
              sv.anvil.bad++;
              // nobody inside: the engine has already hit everyone for failDmg. Someone else inside: the raidwide is laid here.
              if (inside.length) for (const o of f.alive()) f.damagePlayer(o, dmg.anvilFail, { kind: 'tower-fail', avoidable: false, n: 'The Anvil Count' });
            } });
          anvilLive.push({ m, id: p.id });
        });
      });
      return total;
    };

    // --- The wall at 50%: The Heart Remembers ---------------------------------------------------------------------------------
    // Not a set piece: the clocks keep running. The Sovereign is sealed (fight.js wall). The heads the party cut answer again from their stumps as PILLARS of fire, in the
    // order they were cut (f.sv.cutOrder), each painted 2.2 s before it erupts, 2.7 s apart (only the next is in full: the tag fades the later ones); a head still alive
    // erupts last from its own sigil and is gone. After the last, a held breath, then the blade sweeps (Ashen Sweep), and Kindling lands as the seal breaks. A move that was
    // on the floor when the seal came (a dive, a wave: up to 7 s) plays out first; the Anvil Count and Twin Brands are cut at once (their telegraphs come off the floor, Azerath's echo goes).
    const PIL = { r: 150, lead: 2.2, gap: 2.7, first: 4.0, breath: 1.0 };
    let pillarN = 0;
    const burnOut = h => { if (h && h.add && f.adds.has(h.add.id)) { h.dead = true; f.adds.delete(h.add.id); f.addsDirty = true; f.emit({ t: 'roomev', k: 'svcut:' + (h.k + 1), x: h.x, y: h.y, order: 0, burnt: 1, dur: 9999 }); f.emit({ t: 'addev', k: 'gone', id: h.add.id }); } };
    const heartRun = () => {
      const lag = Math.min(7, Math.max(0, (sv.busyPlay || 0) - f.t));   // (what plays out whole: a dive, a wave on the floor. The Anvil Count and Twin Brands do not: they are cut here, with Azerath's echo)
      sv.sealed = true; sv.quiet = true; B.lockFacing = false; f.runePair = null;
      for (const m of [...f.mechs.values()]) if (m.from === 'The Anvil Count' || m.from === 'Twin Brands') f.cancel(m);
      if (sv.twinEcho) { endEcho(sv.twinEcho, 0.1); sv.twinEcho = 0; }
      const list = sv.cutOrder.map(k => ({ k, live: false })).concat(heads.filter(h => !h.dead && f.adds.has(h.add.id)).sort((a, b) => a.k - b.k).map(h => ({ k: h.k, live: true, h })));
      const n = list.length, tLast = lag + PIL.first + PIL.gap * Math.max(0, n - 1);
      const tSweep = tLast + PIL.breath, tKind = tSweep + f.ct(3.6) + 0.8, tEnd = tKind + f.ct(3.4) + 0.1;
      f.emit({ t: 'roomev', k: 'svheart', n, pillars: list.map((e, i) => [HEAD_AT[e.k].x, HEAD_AT[e.k].y, +(lag + PIL.first + i * PIL.gap).toFixed(2), e.live ? 1 : 0]), sweep: +tSweep.toFixed(2), kindling: +tKind.toFixed(2), sealAt: +tEnd.toFixed(2), r: PIL.r, dur: +(tEnd + 1).toFixed(2) });
      f.afterKeep(lag, () => { if (f.state === 'live') f.cast('The Heart Remembers', 3.0, 'call'); });
      list.forEach((e, i) => {
        const at = HEAD_AT[e.k], erupt = lag + PIL.first + i * PIL.gap;
        f.afterKeep(erupt - PIL.lead, () => {
          if (f.state !== 'live') return;
          f.emit({ t: 'roomev', k: 'svpillar:' + (++pillarN), head: e.k + 1, x: at.x, y: at.y, order: i + 1, live: e.live ? 1 : 0, r: PIL.r, at: PIL.lead, dur: PIL.lead + 1.2 });
          f.aoe({ kind: 'circle', x: at.x, y: at.y, r: PIL.r }, PIL.lead, dmg.pillar, { tag: 'svPillar', from: 'The Heart Remembers', onResolve: () => { if (e.live) burnOut(e.h); } });
        });
      });
      f.afterKeep(tSweep, () => { if (f.state === 'live') sweep(); });
      f.afterKeep(tKind, () => { if (f.state === 'live') kindling(); });
      f.afterKeep(tEnd, () => { if (f.state !== 'live') return; f.emit({ t: 'roomev', k: 'svseal', broken: 1, dur: 3 }); sv.sealed = false; f.wallDown(); });
    };

    // --- Rebirth (50%, into Act III) --------------------------------------------------------------------------------------------
    // Set piece 'svrebirth' (12 s, the Sovereign immune for the first 3; nothing damages the party inside it). Act II is let go (the water, the stumps' fire, the heads,
    // any echo still standing), the room becomes the crater, the halo opens into the wheel. The Rebirth cast is the raidwide that opens the second form: it is laid inside the
    // piece to land 0.05 s after it, and its cast bar fills the last 3.4 s. The script's own beats ride f.onSetPiece (a script's afterKeep timers stand still inside one).
    const rb = { on: false, acc: 0, step: 0 };
    f.onSetPiece(a => {
      if (!rb.on) return;
      rb.acc += a;
      if (rb.step === 0 && rb.acc >= 4.0) { rb.step = 1; sv.wheel = 1; sv.lit = 0xf00; halo(); }   // (eight sigils dark: set 1 and set 2's four)
      if (rb.step === 1 && rb.acc >= 5.0) { rb.step = 2; sv.act = 3; f.emit({ t: 'roomev', k: 'svact', act: 3, dur: 9999 }); f.setForm('crater'); }
      if (rb.step === 2 && rb.acc >= 8.6) { rb.step = 3; f.cast('Rebirth', 3.4, 'rebirth'); }
      if (rb.acc >= 12) rb.on = false;
    });
    const rebirth = () => f.setPiece({ id: 'svrebirth', dur: 12, invul: 3, run: () => {
      cutAct();
      sv.sealed = false; sv.quiet = true; f.runePair = null;
      mendSheets();
      for (const s of sv.stumps) if (s.z) s.z.end = f.t;
      sv.stumps = [];
      f.emit({ t: 'zone', clear: true });   // (the water and the stumps' fire go from the clients too)
      for (const h of heads) burnOut(h);
      heads.length = 0;
      if (sv.hydraN) { f.emit({ t: 'roomev', k: 'svecho:' + sv.hydraN, dur: 0.1 }); sv.echoes.delete(sv.hydraN); sv.hydraN = 0; }
      for (const n of sv.echoes) f.emit({ t: 'roomev', k: 'svecho:' + n, dur: 0.1 });
      sv.echoes.clear();
      f.emit({ t: 'roomev', k: 'svrebirth', dark: [2.5, 4.0], halo: 4.0, crater: 5.0, choir: 6.0, dur: 12 });
      rb.on = true; rb.acc = 0; rb.step = 0;
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 12.05, dmg: dmg.rebirth, hidden: true, tag: 'svRebirth', from: 'Rebirth' });
    } });

    // --- Act III, The Fall (50% -> 20%), first half: 8:05 to 9:20 (S3a) ------------------------------------------------------------
    // The echoes of Act III STAY for the act and join the Sovereign's own moves. Its three unleashings (Crescent, Lance, Pyre) and its Dance are its own; Corvane (a stance that
    // NAMES the unleashing, then both perform it) and Caelum Vey (afterimages that lay the dance out, and who steps in on the last beats) are called and stay; Brannoc answers once
    // (the Sunwheel of Embers: the whole bounce path painted, a blue catch point, and a wall of fire left along every leg it ran).
    const toWall = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); let d = 0; while (d < 2400 && ARENA.sd(x + c * d, y + s * d) < -12) d += 12; return Math.max(60, d); };
    Object.assign(dmg, { crescent: 82150, lance: 75800, pyre: 69550, dance: 63200, wheel: 72650, catch: 14200, burst: 11350, wall: 5050 });   // (Normal's Rising Crane, Comet Draw, Parting, Caelum's Wake, Brannoc's Sunwheel and catch)
    const seg = (a, b, delay, dm, o) => {   // a red line from a to b (a rect w wide), landing `delay` s from now
      const len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 20) return null;
      return f.aoe({ kind: 'rect', x: Math.round(a.x), y: Math.round(a.y), angle: +Math.atan2(b.y - a.y, b.x - a.x).toFixed(3), len: Math.round(len), w: o.w }, delay, dm, { tag: o.tag, group: o.group, from: o.from });
    };
    const farthest = (x, y, skip) => f.alive().filter(p => !skip.has(p.id)).reduce((m, p) => (!m || Math.hypot(p.x - x, p.y - y) > Math.hypot(m.x - x, m.y - y) ? p : m), null);

    // --- Call: Corvane. Crossed Blades ----------------------------------------------------------------------------------------------
    // He kneels beside the Sovereign (on his own sigil's side, inside the room) and STAYS for the act. Before each unleashing he takes a stance (svechoact: his art's own
    // crane, comet or parting) that names it: blade low for Crescent, blade drawn for Lance, blade sheathed for Pyre. Then BOTH perform it, his half mirrored.
    //   Crescent: the Sovereign's fan, then a second fan turned a quarter; his two fans are a quarter round from them, crossing as they turn (both beats are wide, one wedge of floor is safe in both).
    //   Lance:    the Sovereign dashes through the hero farthest from it, to the wall; a beat later he dashes through the hero farthest from him (never the same hero).
    //   Pyre:     the Sovereign blink-cuts through every hero in order, numbered; his cut runs the same marks from the OTHER end of the order at the same time. All shown before the first cut.
    const STANCE = { crescent: 'crane', lance: 'comet', pyre: 'parting' }, STANCE_T = 2.2;
    const corvane = () => {
      const a = (8 + 0.5) / 12 * TAU - Math.PI / 2, x = Math.round(Math.cos(a) * 240), y = Math.round(Math.sin(a) * 240);
      const c = call(8, -1, FLY, { x, y, face: +Math.atan2(-y, -x).toFixed(2) });
      sv.corvane = { n: c.n, x, y };
      f.afterKeep(c.d, () => { if (f.state === 'live') answer('Crossed Blades'); });
    };
    const kPos = () => (sv.corvane ? { x: sv.corvane.x, y: sv.corvane.y } : { x: Math.round(B.x), y: Math.round(B.y) });
    let crossN = 0;
    const crescent = () => {
      const C = kPos(), tgt = nonTank(), a = tgt ? Math.atan2(tgt.y - B.y, tgt.x - B.x) : B.facing, ac = a + Math.PI / 2, turn = Math.PI / 4;
      const d = f.ct(3.4), gap = f.ct(1.4), bx = Math.round(B.x), by = Math.round(B.y), g1 = new Set(), g2 = new Set();
      f.cast('Crescent', d + gap, 'crescent');
      B.lockFacing = true; B.facing = a; hold(d + gap + 0.3);
      const fan = (x, y, ang, at, group) => f.aoe({ kind: 'cone', x, y, r: 1500, arc: 2.0, angle: +ang.toFixed(3) }, at, dmg.crescent, { tag: 'svCrescent', group, from: 'Crescent' });
      fan(bx, by, a, d, g1); fan(C.x, C.y, ac, d, g1);
      fan(bx, by, a + turn, d + gap, g2); fan(C.x, C.y, ac + turn, d + gap, g2);
      f.emit({ t: 'roomev', k: 'svcrescent:' + (++crossN), x: bx, y: by, kx: C.x, ky: C.y, a: [+a.toFixed(3), +(a + turn).toFixed(3)], ka: [+ac.toFixed(3), +(ac + turn).toFixed(3)], arc: 2.0, at: [+d.toFixed(2), +(d + gap).toFixed(2)], dur: +(d + gap + 1.2).toFixed(2) });
      f.afterKeep(d + gap + 0.1, () => { B.lockFacing = false; });
      return d + gap;
    };
    const lance = () => {
      const C = kPos(), skip = new Set(), t1 = farthest(B.x, B.y, skip); if (!t1) return 0;
      skip.add(t1.id);
      const t2 = farthest(C.x, C.y, skip) || t1, d = f.ct(3.6), d2 = d + f.ct(1.4), bx = Math.round(B.x), by = Math.round(B.y), g = new Set();
      const a1 = Math.atan2(t1.y - by, t1.x - bx), a2 = Math.atan2(t2.y - C.y, t2.x - C.x), L1 = Math.round(toWall(bx, by, a1)), L2 = Math.round(toWall(C.x, C.y, a2));
      f.cast('Lance', d, 'lance');
      B.lockFacing = true; B.facing = a1; hold(d2 + 0.4);
      f.aoe({ kind: 'rect', x: bx, y: by, angle: +a1.toFixed(3), len: L1, w: 150 }, d, dmg.lance, { tag: 'svLance', group: g, from: 'Lance' });
      f.aoe({ kind: 'rect', x: C.x, y: C.y, angle: +a2.toFixed(3), len: L2, w: 150 }, d2, dmg.lance, { tag: 'svLance', group: g, from: 'Lance' });
      f.emit({ t: 'roomev', k: 'svlance:' + (++crossN), l: [[bx, by, Math.round(bx + Math.cos(a1) * L1), Math.round(by + Math.sin(a1) * L1), +d.toFixed(2)], [C.x, C.y, Math.round(C.x + Math.cos(a2) * L2), Math.round(C.y + Math.sin(a2) * L2), +d2.toFixed(2)]], w: 150, dur: +(d2 + 1.2).toFixed(2) });
      f.afterKeep(d2 + 0.2, () => { B.lockFacing = false; });
      return d2;
    };
    const pyre = () => {
      const al = f.alive(), tank = f.tank(), ids = al.filter(p => !tank || p.id !== tank.id).sort((p, q) => p.id - q.id).concat(tank && al.some(p => p.id === tank.id) ? [tank] : []);
      if (!ids.length) return 0;
      const C = kPos(), home = { x: Math.round(B.x), y: Math.round(B.y) }, m = ids.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })), n = m.length;
      const lead = f.ct(3.4), step = f.ct(1.0), at = k => lead + k * step, ss = [], cs = [];
      f.cast('Pyre', at(n - 1), 'pyre');
      B.lockFacing = true; hold(at(n) + 0.6);
      for (let k = 0; k < n; k++) {
        const g = new Set();
        const sa = k === 0 ? home : m[k - 1], sb = m[k];            // his cut: home, then 1, 2, 3 ...
        const ca = k === 0 ? C : m[n - k], cb = m[n - 1 - k];       // Corvane's: from the other end, n, n-1 ...
        seg(sa, sb, at(k), dmg.pyre, { tag: 'svPyre', w: 96, group: g, from: 'Pyre' }); ss.push([sa.x, sa.y, sb.x, sb.y, +at(k).toFixed(2)]);
        seg(ca, cb, at(k), dmg.pyre, { tag: 'svPyre', w: 96, group: g, from: 'Pyre' }); cs.push([ca.x, ca.y, cb.x, cb.y, +at(k).toFixed(2)]);
      }
      f.emit({ t: 'roomev', k: 'svpyre:' + (++crossN), m: m.map((q, i) => [q.x, q.y, i + 1]), s: ss, c: cs, from: [home.x, home.y], cfrom: [C.x, C.y], lead: +lead.toFixed(2), step: +step.toFixed(2), dur: +(at(n) + 1.2).toFixed(2) });
      f.afterKeep(at(n - 1) + 0.3, () => { B.lockFacing = false; });
      return at(n - 1);
    };
    // the stance alone (the cast names the move, his pose names the unleashing), then the Sovereign's own cast begins
    const unleash = st => {
      if (f.state !== 'live') return;
      f.cast('Crossed Blades', STANCE_T, 'call'); hold(STANCE_T + 0.2);
      if (sv.corvane) f.emit({ t: 'roomev', k: 'svechoact:' + sv.corvane.n, anim: STANCE[st], dur: STANCE_T + 7 });
      f.afterKeep(STANCE_T, () => { if (f.state === 'live') (st === 'crescent' ? crescent : st === 'lance' ? lance : pyre)(); });
    };

    // --- Call: Caelum Vey. Two Dancers ----------------------------------------------------------------------------------------------
    // He stays. His afterimages (svdance: numbered, silver) stand where the SOVEREIGN will be: six cuts, each a line painted from the cast, the next brightest. On the last three
    // beats Caelum steps in and cuts alongside, from the point opposite (the same cut turned half a circle about the middle), so two lines fall on each of those beats.
    const DANCE_A = [-90, 60, 210, 0, 150, 300];   // (degrees at radius 380; the dance is fixed)
    const caelum = () => {
      const c = call(11, -1);
      sv.caelum = { n: c.n };
      f.afterKeep(c.d, () => { if (f.state === 'live') answer('Two Dancers'); });
    };
    const dancePts = rotDeg => { const R = 380, rot = (rotDeg || 0) * Math.PI / 180; return DANCE_A.map(a => ({ x: Math.round(Math.cos(a * Math.PI / 180 + rot) * R), y: Math.round(Math.sin(a * Math.PI / 180 + rot) * R) })); };   // (the six points, turned by rotDeg)
    const dance = (o = {}) => {   // o: { rot (degrees), lead (s to the first cut, 3.4), step (s a cut, 0.65: Act IV's passes slow it to 1.5 so the answers fall between the cuts) }
      const pts = dancePts(o.rot);
      const lead = f.ct(o.lead || 3.4), step = f.ct(o.step || 0.65), n = pts.length, total = lead + n * step, from = { x: Math.round(B.x), y: Math.round(B.y) }, cs = [], from0 = from;
      f.cast("The Sovereign's Dance", total, 'dance');
      B.lockFacing = true; hold(total + 0.8);
      let prev = from;
      pts.forEach((q, i) => {
        const at = lead + (i + 1) * step, g = new Set();
        seg(prev, q, at, dmg.dance, { tag: 'svDance', w: 96, group: g, from: "The Sovereign's Dance" });
        if (i >= n - 3 && sv.caelum) {   // Caelum steps in: the same cut about the middle
          const ra = { x: -prev.x, y: -prev.y }, rb = { x: -q.x, y: -q.y };
          seg(ra, rb, at, dmg.dance, { tag: 'svDance', w: 96, group: g, from: "The Sovereign's Dance" });
          cs.push([ra.x, ra.y, rb.x, rb.y, i + 1]);
        }
        f.afterKeep(at, () => { B.x = q.x; B.y = q.y; if (pts[i + 1]) B.facing = Math.atan2(pts[i + 1].y - q.y, pts[i + 1].x - q.x); });
        prev = q;
      });
      f.emit({ t: 'roomev', k: 'svdance:' + (++crossN), l: pts.map((q, i) => { const nx = pts[i + 1]; return [q.x, q.y, i + 1, nx ? +Math.atan2(nx.y - q.y, nx.x - q.x).toFixed(2) : 0]; }), c: cs, from: [from0.x, from0.y], lead: +lead.toFixed(2), step: +step.toFixed(2), dur: +(total + 0.8).toFixed(2) });
      if (cs.length && sv.caelum) f.afterKeep(lead + (n - 3) * step, () => { if (f.state === 'live') f.emit({ t: 'roomev', k: 'svechoact:' + sv.caelum.n, anim: 'attack', dur: +(step * 3 + 1).toFixed(2) }); });   // (he steps in as the last three beats begin)
      f.afterKeep(total + 0.1, () => { B.lockFacing = false; });
      return total;
    };

    // --- Call: Brannoc. Sunwheel of Embers ------------------------------------------------------------------------------------------
    // He answers once and goes. The wheel's whole bounce path is painted off the room's walls (red pieces landing as it passes, the whole path shown), with a blue catch point where
    // it comes to rest. Every bounce leaves a WALL OF FIRE along the leg it just ran, for WH.life s, so the path becomes the room's walls. A catch puts the fire out at once and costs the
    // catcher a heavy hit; a missed one bursts on the whole room and the walls burn their time. The throw is fixed: from his sigil, three bounces.
    const WH = { speed: 950, w: 130, fireW: 70, life: 7.0, r: 95, pad: 40, frac: 0.3, hold: 2.0, aim: { x: 100, y: -200 }, n: 3 };
    const wheelHit = (x, y, dx, dy, RW) => { const b = x * dx + y * dy, c = x * x + y * y - RW * RW; return -b + Math.sqrt(Math.max(0, b * b - c)); };
    const wheelPath = (x, y, a, n) => {
      const RW = ARENA.r - WH.pad, pts = [[x, y]];
      let dx = Math.cos(a), dy = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const t = wheelHit(x, y, dx, dy, RW);
        x += dx * t; y += dy * t; pts.push([x, y]);
        const nx = x / RW, ny = y / RW, dd = dx * nx + dy * ny;
        dx -= 2 * dd * nx; dy -= 2 * dd * ny;
      }
      const [lx, ly] = pts[n], t = wheelHit(lx, ly, dx, dy, RW);
      pts.push([lx + dx * t * WH.frac, ly + dy * t * WH.frac]);   // (the catch point: partway down the line after the last bounce)
      return pts;
    };
    let wheelN = 0;
    // the throw itself (c: the echo, { n }). o: { n (bounces), d (s to the first piece), path (a ready path), noCast (the Sovereign's cast bar belongs to a dance), fire false (no walls of fire) }
    const wheelThrow = (c, o = {}) => {
      {
        if (f.state !== 'live') return;
        const d = f.ct(o.d ?? 4.6), at = spot(9), n = ++wheelN, pts = o.path || wheelPath(at.x, at.y, Math.atan2(WH.aim.y - at.y, WH.aim.x - at.x), o.n ?? WH.n), last = pts.length - 1, burns = o.fire !== false;
        if (!o.noCast) f.cast('Sunwheel of Embers', d, 'call');
        f.emit({ t: 'roomev', k: 'svechoact:' + c.n, anim: 'throw', dur: 1.2 });
        const along = [0];
        for (let i = 1; i <= last; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const group = new Set(), zones = [], fire = [], tEnd = along[last] / WH.speed;
        for (let i = 1; i <= last; i++) {
          const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax), run = i === last ? L - WH.r : L;   // (the last leg stops at the catch ring)
          for (let u0 = 0; run - u0 > 12;) {
            const u = Math.min(run, u0 + 260);
            f.aoe({ kind: 'rect', x: Math.round(ax + Math.cos(ang) * u0), y: Math.round(ay + Math.sin(ang) * u0), angle: +ang.toFixed(3), len: Math.round(u - u0), w: WH.w }, d + (along[i - 1] + u) / WH.speed, dmg.wheel, { tag: 'svWheel', group, from: 'Sunwheel of Embers' });
            u0 = u;
          }
          if (!burns) continue;
          // the wall of fire: lit when the wheel has run the leg, a zone the bots read (not a telegraph: the path under it was painted in full)
          const ig = d + (i === last ? along[i] - WH.r : along[i]) / WH.speed, z = { id: f.nextMechId++, effect: 'burn', tag: 'svWall', ddown: true, last: {}, shape: { kind: 'rect', x: Math.round(ax), y: Math.round(ay), angle: +ang.toFixed(3), len: Math.round(Math.max(20, run - 8)), w: WH.fireW }, dmg: dmg.wall, startAt: f.t + ig, end: f.t + ig + WH.life };
          f.zones.push(z); zones.push(z);
          f.afterKeep(ig, () => { if (f.state === 'live' && z.end > f.t + 0.2) zoneMsg(z, z.end - f.t); });   // (told when it is lit: the fire is there from then)
          fire.push([Math.round(ax), Math.round(ay), Math.round(ax + Math.cos(ang) * Math.max(20, run - 8)), Math.round(ay + Math.sin(ang) * Math.max(20, run - 8)), +ig.toFixed(2)]);
        }
        const [ex, ey] = pts[last];
        f.emit({ t: 'roomev', k: 'svwheel:' + n, l: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), c: [[Math.round(ex), Math.round(ey)]], sp: WH.speed, at: +d.toFixed(2), w: WH.w, r: WH.r, fire, fw: WH.fireW, life: WH.life, hold: WH.hold, dur: +(d + tEnd + WH.hold + WH.life + 1).toFixed(2) });
        f.mech({ type: 'tower', shape: { kind: 'circle', x: Math.round(ex), y: Math.round(ey), r: WH.r }, delay: d + tEnd + WH.hold, dmg: dmg.catch, failDmg: dmg.burst, need: 1, tag: 'svCatch', from: 'Sunwheel of Embers',
          onResolve: inside => {
            if (!inside.length) return;
            for (const z of zones) if (z.end > f.t) { const lit = f.t >= z.startAt; z.end = f.t; if (lit) zoneMsg(z, 0.3); }   // (caught: the fire goes out now)
            f.emit({ t: 'roomev', k: 'svwallout:' + n, dur: 1.5 });
          } });
        endEcho(c.n, d + tEnd + WH.hold + 0.8);
        sv.brannocN = 0;
      }
    };
    const sunwheel = (o = {}) => {   // o.n: how many bounces (a sapling's relight throws a short one)
      const c = call(9, -1);
      sv.brannocN = c.n;
      f.afterKeep(c.d, () => wheelThrow(c, o));
    };

    // --- Act III, the rest (S3b): Grace Withdrawn, Morrow-Oak's seeds, holes and saplings, and the push into Act IV ----------------------
    Object.assign(dmg, { night: 9000, seed: 60000, fall: 69550, sapHp: 55000 });   // (Caelum's Nightfall and Morrow-Oak's seed and fall, Normal)

    // Grace Withdrawn (9:25): the Sovereign's grace leaves the whole party: everyone drops to 1 HP (never lethal) and Nightfall lands on them all GAP s later. The healer's check of the act;
    // it comes alone (never during a dance: the timeline keeps it clear of one). While they are held at nothing the fire on the floor and the Brand's burn are held too, and the Sovereign
    // swings at nobody. (tools/check.js's clean run keeps its dummies' health: f.cleanRun.)
    const GRACE = { cast: 3.2, gap: 8 };
    const holdFire = len => { for (const z of f.zones) if (z.effect === 'burn') { z.startAt = Math.max(z.startAt, f.t + len); if (z.end < 9000) z.end += len; } };
    const grace = () => {
      const d = f.ct(GRACE.cast), gap = GRACE.gap;
      f.cast('Grace Withdrawn', d, 'call');
      f.healCheck(d + gap + 2);
      hold(d + gap + 0.5);
      f.afterKeep(d, () => {
        if (f.state !== 'live') return;
        sv.graceUntil = f.t + gap + 0.6; holdFire(gap + 0.6);
        if (!f.cleanRun) for (const p of f.alive()) {
          const s = p.s, lost = Math.max(0, s.hp - 1);
          for (const e of (s.shields || []).slice()) f.endShieldEntry(p.id, s, e);   // (every shield ends the normal way, so its caster's kit hears it: a Ward's blast and Rune, the petal and scab give-backs)
          s.hp = 1; s.hist = [];   // (hist: nothing before Grace's 1 HP for a Rewind to restore)
          f.emit({ t: 'pdmg', id: p.id, a: Math.round(lost), k: 'svGrace', hp: 1, dd: 0, n: 'Grace Withdrawn' });
        }
        f.emit({ t: 'roomev', k: 'svgrace', dur: gap });
        B.noAutoUntil = Math.max(B.noAutoUntil || 0, f.t + gap + 3);
        f.cast('Nightfall', gap, 'call');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: gap, dmg: dmg.night, hidden: true, tag: 'svNight', from: 'Nightfall' });
      });
      f.afterKeep(d + 0.05, () => {}, 'Nightfall');   // (for the feed: Nightfall's cast begins as the grace leaves)
    };

    // --- Call: Morrow-Oak. Seeds of Ash ---------------------------------------------------------------------------------------------
    // He rises at his sigil and STAYS for the act. A seed rides a hero (a red circle that follows them until 1.6 s before it bursts); where it bursts the floor burns through to the town
    // below: a HOLE, for the rest of the fight (f.sv.holes, f.floor entries of kind 'hole', kept into Act IV's square). Anyone who steps into a hole falls: a heavy blow, rooted a moment,
    // then climbs out on the side nearer the middle. A burning sapling climbs out of each new hole and walks toward the Sovereign; if it arrives, it relights the most recently darkened
    // sigil on the halo and that name is called again for one short answer (recall, below).
    // WHO CARRIES A SEED (fixed, the party can plan it): the non-tanks in id order, round and round, each batch starting after the last carrier of the one before.
    const HOLE_R = 80, SEED = { r: 95, lock: 1.6 };
    const holes = sv.holes;
    Object.assign(f.room, { fallen: 0, holes, safe: (x, y, soon) => !holes.some(h => Math.hypot(x - h.x, y - h.y) < h.r + (soon ? 30 : 6)) });   // (the bots keep off the holes)
    const inHole = (x, y, pad = 0) => holes.find(h => Math.hypot(x - h.x, y - h.y) < h.r - pad);
    const climbOut = h => {   // the way out of a hole: the nearest floor on the side toward the middle
      const base = Math.atan2(-h.y, -h.x);
      for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
        const a = base + off, ex = h.x + Math.cos(a) * (h.r + 34), ey = h.y + Math.sin(a) * (h.r + 34);
        if (ARENA.sd(ex, ey) < -20 && !inHole(ex, ey, -24)) return { x: ex, y: ey };
      }
      return null;
    };
    const fellAt = {}, climbing = new Set();
    let fallN = 0;
    const fall = (p, h) => {
      fellAt[p.id] = f.t; climbing.add(p.id);
      f.damagePlayer(p, dmg.fall, { kind: 'svFall', avoidable: true, noVuln: true, n: 'The Hunger' });
      f.debuff(p.id, 'rooted', 2.6);
      f.emit({ t: 'roomev', k: 'svfall:' + (++fallN), id: p.id, x: Math.round(p.x), y: Math.round(p.y), hx: h.x, hy: h.y, dur: 3 });
      // (the climb-out rides afterKeep0, not the era-tagged f.afterKeep: an act turning right after the fall (the push into Act IV) must not cut it, or the hero is left in the hole
      // when the set piece ends and falls again. The set piece holds it still with the root, so both run out together.)
      afterKeep0(2.7, () => {
        climbing.delete(p.id); fellAt[p.id] = f.t;
        const q = f.alive().find(o => o.id === p.id); if (!q) return;
        const at = inHole(q.x, q.y, -6) || h, e = climbOut(at); if (!e) return;
        const dd = Math.hypot(e.x - q.x, e.y - q.y) || 1;
        f.knock(q, q.x - (e.x - q.x) / dd, q.y - (e.y - q.y) / dd, dd, { rescue: true });
      });
    };
    f.ticker(() => {
      if (!holes.length || f.state !== 'live' || f.setPieceHold()) return;
      for (const p of f.alive()) {
        const h = inHole(p.x, p.y, 10);
        if (h && !(climbing.has(p.id) && f.t - (fellAt[p.id] ?? -9) < 60) && f.t - (fellAt[p.id] ?? -9) >= 3.5) fall(p, h);
      }
    });
    // the first hero to fall this pull (the Sovereign's second line in Act IV names them)
    f.ticker(() => {
      if (sv.fallen || f.state !== 'live') return;
      for (const p of f.players()) if (p.s && !p.s.alive) { sv.fallen = { id: p.id, name: p.name || null }; break; }
    });
    let holeN = 0;
    const digHole = (x, y) => {
      const q = ARENA.clamp({ x, y }, 10), h = f.addFloor({ kind: 'hole', x: Math.round(q.x), y: Math.round(q.y), r: HOLE_R });
      holes.push(h);
      f.emit({ t: 'roomev', k: 'svhole:' + (++holeN), id: h.id, x: h.x, y: h.y, r: h.r, n: holes.length, dur: 9999 });
      return h;
    };

    // a burning sapling: climbs out of the new hole (1.5 s), walks to the Sovereign (SAP.speed px/s), and if it gets within SAP.arrive it is gone and a name is called again
    const SAP = { speed: 24, arrive: 90, wait: 1.5 };
    let sapN = 0;
    const dropSap = a => { if (f.adds.has(a.id)) { f.adds.delete(a.id); f.addsDirty = true; f.emit({ t: 'addev', k: 'gone', id: a.id }); } };
    const sprout = h => {
      if (f.state !== 'live' || sv.pushed) return;
      const n = ++sapN;
      const a = f.spawnAdd({ kind: 'sapling', x: h.x, y: h.y, hp: dmg.sapHp, r: 24, inert: true, prio: 7,
        onTick: (s, dt) => {
          if (f.setPieceHold() || sv.pushed) return;
          if (s.wait == null) s.wait = f.t + SAP.wait;
          if (f.t < s.wait) return;
          const dx = B.x - s.x, dy = B.y - s.y, D = Math.hypot(dx, dy) || 1;
          if (D < SAP.arrive) { s.onDeath = null; dropSap(s); f.emit({ t: 'roomev', k: 'svsaparr:' + n, x: Math.round(s.x), y: Math.round(s.y), dur: 3 }); recall(); return; }
          const sp = SAP.speed * dt * f.addSpeedMult(s);   // (a Reaper's Bind holds it and Shade Step slows it, as for any add)
          s.x += dx / D * sp; s.y += dy / D * sp; s.facing = Math.atan2(dy, dx);
        },
        onDeath: s => f.emit({ t: 'roomev', k: 'svsapdie:' + n, x: Math.round(s.x), y: Math.round(s.y), dur: 2 }) });
      f.emit({ t: 'roomev', k: 'svsapling:' + n, id: a.id, x: h.x, y: h.y, hole: holes.indexOf(h) + 1, speed: SAP.speed, dur: 45 });
    };
    // where a seed bursts: a hole for good, and a sapling out of it
    const burst = (x, y) => {
      if (f.state !== 'live') return;
      const h = digHole(x, y);
      // a lantern nobody carries that stands where it opens is set down on the nearest floor with room (Act IV's last lantern: a hole must never take the cure)
      if (f.lanterns.some(l => l.carrier == null && Math.hypot(l.x - h.x, l.y - h.y) < h.r + 30)) {
        for (const l of f.lanterns) {
          if (l.carrier != null || Math.hypot(l.x - h.x, l.y - h.y) >= h.r + 30) continue;
          const near = [...ring(300, 12), ...ring(190, 8, 0.3), ...ring(100, 6, 0.5)].sort((p, q) => Math.hypot(p.x - l.x, p.y - l.y) - Math.hypot(q.x - l.x, q.y - l.y)), q = pickFree(near, 75);
          if (q) { l.x = q.x; l.y = q.y; }
        }
        sendLanterns();
      }
      // whoever stands where it opens is thrown clear to the rim (the seed's own blow is their price; they do not fall: only a step into a hole later does)
      for (const p of f.alive()) {
        const dd = Math.hypot(p.x - h.x, p.y - h.y);
        if (dd >= h.r + 6) continue;
        fellAt[p.id] = f.t - 2.3;
        f.knock(p, dd < 2 ? h.x - 1 : h.x, h.y, h.r + 30 - dd, { rescue: true });
      }
      f.afterKeep(0.4, () => sprout(h));
    };
    // the carriers, by the rule above
    const seedPick = n => {
      const nts = f.nonTanks(), pool = (nts.length >= n ? nts : f.alive()).slice().sort((p, q) => p.id - q.id), out = [];
      if (!pool.length) return out;
      let i = pool.findIndex(p => p.id > sv.seedLast); if (i < 0) i = 0;
      for (let k = 0; k < Math.min(n, pool.length); k++) out.push(pool[(i + k) % pool.length]);
      sv.seedLast = out[out.length - 1].id;
      return out;
    };
    let seedN = 0;
    // n seeds, bursting d s from now
    const seeds = (n, d) => {
      const pool = seedPick(n); if (!pool.length) return;
      busy(d + 1.0);
      for (const p of pool) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: SEED.r }, delay: d, dmg: dmg.seed, follow: p.id, lockAt: SEED.lock, tag: 'svSeed', from: 'Seeds of Ash',
          onResolve: () => burst(m.shape.x, m.shape.y) });
      }
      f.emit({ t: 'roomev', k: 'svseed:' + (++seedN), ids: pool.map(p => p.id), at: +d.toFixed(2), lock: SEED.lock, r: SEED.r, dur: +(d + 1).toFixed(2) });
      if (sv.morrow) f.emit({ t: 'roomev', k: 'svechoact:' + sv.morrow.n, anim: 'attack', dur: 1.2 });
    };
    const morrow = () => {
      const c = call(10, -1);
      sv.morrow = { n: c.n };
      f.afterKeep(c.d, () => { if (f.state !== 'live') return; answer('Seeds of Ash'); seeds(2, f.ct(6)); });
    };
    // one more seed (11:35): the echo stands, a short cast, one hero
    const seedOne = () => { answer('Seeds of Ash', f.ct(2)); seeds(1, f.ct(6)); };
    // the act's one pair: the Sovereign's Dance, and the seeds burst as it ends
    const dancePair = () => { const total = dance(); seeds(2, total + 0.2); };

    // --- Foretold (Act III, 11:30; the dance pass's Fate Projection) -------------------------------------------------------------------
    // Caelum's echo shows the future: four GHOSTS, each a translucent copy of one hero, stand in three pockets of the room, each marked with what will be done to that hero:
    //   the tank and the healer carry the blue SHARE (their two ghosts stand 100 apart in one pocket), a DPS carries a red SPREAD, the other DPS carries the SEED (the next one in id
    //   order after the last carrier, as at every seed: sv.seedLast). Every hero walks into their own ghost. FORE.walk s after the ghosts rise the Sovereign's three fans arrive from the
    //   middle (red, painted for FORE.lead s, as ever: the pockets are the gaps between them and nothing marks them); one second after, the marks land on the ghosts' spots: the share
    //   (a blue circle on the tank, the healer inside it), the spread (red, on its hero) and the seed (red; it bursts where the ghost stood: a hole, as every seed, so the party sees
    //   Act IV's next hole before it opens). Whoever is not in a pocket is cut down by a fan. The layout is the same every pull (the first of 24 turns of it, 15 degrees apart, that keeps
    //   every ghost clear of the holes already made and of the Sovereign). The bots read it as f.runePair.goal (one spot for each hero).
    Object.assign(dmg, { foreFan: 76000, foreSpread: 2200, foreSeed: 2200, foreShare: 5200 });   // (the marks are small on purpose: they land on a hero who did the right thing; the fan is the check. They are Normal's numbers before ACT_DMG)
    const FORE = { walk: 6.8, lead: 3.4, lag: 1.0, gap: 0.6, span: 2.0 * Math.PI, spreadR: 100, seedR: 95, shareR: 140, goalR: 26 };
    const fore = { n: 0 };
    let foreN = 0;
    f.ticker(() => { if (fore.n && sv.pushed) { f.emit({ t: 'roomev', k: 'svfore:' + fore.n, dur: 0.1 }); fore.n = 0; } });   // (the push into Act IV takes the ghosts off at once)
    const foretold = () => {
      if (f.state !== 'live' || sv.pushed) return;
      const al = f.alive(); if (!al.length) return;
      const F = f.ct(FORE.walk), lead = f.ct(FORE.lead), lag = f.ct(FORE.lag);
      // the marks: share on the first two (tank, healer), the seed on one of the rest (the next carrier in id order), the spread on whoever is left
      const rank = { tank: 0, healer: 1 }, order = al.slice().sort((p, q) => (rank[p.role] ?? 2) - (rank[q.role] ?? 2) || p.id - q.id);
      const share = order.length >= 3 ? order.slice(0, 2) : [], rest = order.slice(share.length).sort((p, q) => p.id - q.id);
      let si = rest.findIndex(p => p.id > sv.seedLast); if (si < 0) si = 0;
      const seedP = rest[si]; sv.seedLast = seedP.id;
      const spreadP = rest.filter(p => p !== seedP);
      // the layout: three pockets between three fans, round the middle; the first turn that keeps every ghost off the holes and the Sovereign
      // the fans come out of a point between the middle and the Sovereign (never farther than 190 from the middle), so the ghosts stand about as near the Sovereign as the room allows
      const bd = Math.hypot(B.x, B.y) || 1, ok = Math.min(0.5, 190 / bd), Ox = Math.round(B.x * ok), Oy = Math.round(B.y * ok);
      const arc = (FORE.span - 3 * FORE.gap) / 3, base = -100 * Math.PI / 180;
      const spots = a0 => {
        const A = [a0, a0 + FORE.span / 3, a0 + 2 * FORE.span / 3], at = (a, r) => ({ x: Math.round(Ox + Math.cos(a) * r), y: Math.round(Oy + Math.sin(a) * r) }), out = [];
        share.forEach((p, i) => out.push({ p, kind: 0, a: A[0], r: i ? 190 : 290 }));   // (the tank outer, the healer inner)
        spreadP.forEach(p => out.push({ p, kind: 1, a: A[1], r: 255 }));
        out.push({ p: seedP, kind: 2, a: A[2], r: 255 });
        return out.map(o => Object.assign(o, at(o.a, o.r)));
      };
      let a0 = base, lay = spots(base), best = Infinity, spare = Infinity;
      // (a turn's clearance: the least of every ghost's gap to the holes' rims (70 wanted), to the Sovereign (110) and to the rim of the room (80); a turn that fits has none below zero)
      const gapOf = L => L.reduce((m, o) => Math.min(m, ...holes.map(h => Math.hypot(o.x - h.x, o.y - h.y) - h.r - 70), Math.hypot(o.x - B.x, o.y - B.y) - 110, -ARENA.sd(o.x, o.y) - 80), Infinity);
      const holeGap = L => L.reduce((m, o) => Math.min(m, ...holes.map(h => Math.hypot(o.x - h.x, o.y - h.y) - h.r)), Infinity);
      for (let k = 0; k < 24; k++) {   // (of the turns that fit, the one that keeps everybody nearest the Sovereign, the tank most of all: nobody is out of reach for long)
        const t0 = base + k * 15 * Math.PI / 180, L = spots(t0), gap = gapOf(L);
        const cost = L.reduce((sum, o) => sum + Math.hypot(o.x - B.x, o.y - B.y) * (o.p.role === 'tank' ? 2 : 1), 0);
        if (gap < 0) {   // (none fits yet: the fallback is a turn that still keeps every ghost 20 clear of the holes, then the cheapest one once each shortfall is paid for)
          const hg = holeGap(L), sc = (hg >= 20 ? 0 : 1e5 + (20 - hg) * 1000) + cost - gap * 15;
          if (best === Infinity && sc < spare) { spare = sc; a0 = t0; lay = L; }
          continue;
        }
        if (cost < best - 1) { best = cost; a0 = t0; lay = L; }
      }
      // (if even the fallback has a ghost within a hole's reach, it is moved off it: never left inside)
      if (best === Infinity) for (const o of lay) for (const h of holes) {
        const d = Math.hypot(o.x - h.x, o.y - h.y);
        if (d < h.r + 36) { const q = ARENA.clamp({ x: h.x + (o.x - h.x) / (d || 1) * (h.r + 36), y: h.y + (o.y - h.y) / (d || 1) * (h.r + 36) }, 40); o.x = Math.round(q.x); o.y = Math.round(q.y); }
      }
      const n = ++foreN, fanA = [0, 1, 2].map(i => a0 + FORE.span / 3 * i + FORE.gap / 2 + arc / 2);   // (the fans' middles: halfway between one gap and the next)
      fore.n = n; busy(F + lag + 2.0); hold(F + lag + 0.6);
      B.noAutoUntil = Math.max(B.noAutoUntil || 0, f.t + F + lag + 1.0);
      f.cast('Foretold', F, 'dance');
      f.emit({ t: 'roomev', k: 'svfore:' + n, g: lay.map(o => [o.p.id, o.x, o.y, o.kind, +Math.atan2(Oy - o.y, Ox - o.x).toFixed(2)]), ox: Ox, oy: Oy, a: fanA.map(a => +a.toFixed(3)), arc: +arc.toFixed(3), fan: +F.toFixed(2), mark: +(F + lag).toFixed(2), lead: +lead.toFixed(2), sr: FORE.spreadR, hr: FORE.shareR, dur: +(F + lag + 3).toFixed(2) });
      if (sv.caelum) f.emit({ t: 'roomev', k: 'svechoact:' + sv.caelum.n, anim: 'attack', dur: 2.4 });
      const goal = {}; for (const o of lay) goal[o.p.id] = { x: o.x, y: o.y, r: FORE.goalR };
      f.runePair = { a: null, b: null, on: 1, rule: 'fore', goal };
      f.afterKeep(F + lag + 0.5, () => { if (f.runePair && f.runePair.rule === 'fore') f.runePair = null; });
      // the fans and the marks are laid `lead` s before the fans land (the marks one second after them: they follow their hero until the fans land, then hold)
      f.afterKeep(Math.max(0.01, F - lead), () => {
        if (f.state !== 'live' || sv.pushed) return;
        const grp = new Set();
        for (const a of fanA) f.aoe({ kind: 'cone', x: Ox, y: Oy, r: 1100, arc: +arc.toFixed(3), angle: +a.toFixed(3) }, lead, dmg.foreFan, { tag: 'svForeFan', group: grp, from: 'Foretold' });
        const at = lead + lag, tank = share[0];
        if (tank) f.mech({ type: 'stack', shape: { kind: 'circle', x: Math.round(tank.x), y: Math.round(tank.y), r: FORE.shareR }, delay: at, dmg: dmg.foreShare, need: Math.min(2, share.length), follow: tank.id, lockAt: lag, tag: 'svForeShare', from: 'Foretold' });
        for (const p of spreadP) f.mech({ type: 'spread', shape: { kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: FORE.spreadR }, delay: at, dmg: dmg.foreSpread, follow: p.id, lockAt: lag, tag: 'svForeSpread', from: 'Foretold' });
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(seedP.x), y: Math.round(seedP.y), r: FORE.seedR }, delay: at, dmg: dmg.foreSeed, follow: seedP.id, lockAt: lag, tag: 'svForeSeed', from: 'Foretold', avoidable: false,
          onResolve: () => { const g = lay.find(o => o.p === seedP), near = g && Math.hypot(m.shape.x - g.x, m.shape.y - g.y) < 45; burst(near ? g.x : m.shape.x, near ? g.y : m.shape.y); } });   // (it opens where the ghost stood, if the hero stands in it)
        f.emit({ t: 'roomev', k: 'svseed:' + (++seedN), ids: [seedP.id], at: +at.toFixed(2), lock: lag, r: FORE.seedR, dur: +(at + 1).toFixed(2) });   // (the seed over its carrier's head: the Seeds of Ash drawing, and its pulse)
      });
    };

    // A sapling that arrives relights the most recently darkened sigil that has not been relit yet (the order they first went dark: Morrow-Oak's own, then Brannoc's, Caelum's...), and
    // that name is called again for one short answer: the flame flies from the halo (into the echo if it stands, or a new one rises), then:
    //   Morrow-Oak: one seed.   Brannoc: a Sunwheel with one bounce.   anyone else: the Sovereign's Cupped Ember, a blue stack.
    // It waits its turn: not inside a dance or an unleashing, not in Grace's window, not on top of another move of an echo (sv.busy).
    const standingEcho = i => { for (const n of sv.echoes) if (sv.echoSig.get(n) === i) return n; return 0; };
    const nextRelight = () => {
      for (const i of [...sv.dark].reverse()) if (!sv.relit.has(i)) return i;
      for (let i = 11; i >= 0; i--) if (!(sv.lit & (1 << i)) && !sv.relit.has(i)) return i;
      return -1;
    };
    let recallN = 0;
    const recallAnswer = (i, n, stands) => {
      if (f.state !== 'live' || sv.pushed) return;
      if (i === 10) { answer('Seeds of Ash'); seeds(1, f.ct(6)); } else ember();
      if (!stands && n) endEcho(n, 6);
    };
    const recall = () => {
      const go = () => {
        if (f.state !== 'live' || sv.pushed) return;
        if (B.lockFacing || f.t < sv.busy || f.t < sv.graceUntil + 3 || f.setPieceHold() || sv.sealed) { f.afterKeep(0.8, go); return; }
        const i = nextRelight(); if (i < 0) return;
        sv.relit.add(i);
        const who = ECHO[i], n0 = standingEcho(i);
        sv.lit |= 1 << i; halo();   // the sigil relights on the halo
        f.emit({ t: 'roomev', k: 'svrecall:' + (++recallN), sig: i, who, dur: 8 });
        if (i === 9 && !n0) { busy(f.ct(FLY + RISE) + f.ct(4.6) + 10); sunwheel({ n: 1 }); return; }   // (his own call: the throw, one bounce)
        if (n0) {   // (his echo already stands: the flame flies into it)
          const d = f.ct(FLY + 1.0);
          f.cast(NAMES[who] || who, d, 'call');
          sv.call = i; halo(); busy(d + 8);
          f.afterKeep(FLY, () => { sv.lit &= ~(1 << i); sv.call = -1; halo(); });
          f.afterKeep(d, () => { if (f.state !== 'live') return; f.emit({ t: 'roomev', k: 'svechoact:' + n0, anim: 'attack', dur: 1.2 }); recallAnswer(i, n0, true); });
        } else {
          const c = call(i, 14);
          busy(c.d + 8);
          f.afterKeep(c.d, () => recallAnswer(i, c.n, false));
        }
      };
      go();
    };

    // --- Every Name (20%, into Act IV): set piece 'sveveryname' (10 s, the Sovereign immune for the first 3) -----------------------------
    // Act III is let go (Corvane's, Caelum's and Morrow-Oak's echoes end, the saplings and the fire are gone; the HOLES STAY in f.sv.holes and f.floor), the act turns (svact 4), the
    // camera pulls back (svcam), the crater peels into the square (form 'square'), the halo is fully dark and stays a wheel, and the Hollow King's echo rises UNCALLED from the portal
    // ring (no kneel, his lantern lit; f.sv.hk4 = { n, x, y }; it stays for the act). Six seconds in, the Sovereign's second line goes out once: roomev 'svline' { name } with the name of the
    // first hero who fell this pull, or null. Act IV's course is below (S4a: the Doom relay and the first two passes; S4b: the rest, the enrage and the kill).
    const PORTAL = () => { const a = -0.62, r = ARENA.r * 0.74; return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) }; };
    const en = { on: false, acc: 0, said: false };
    f.onSetPiece(a => {
      if (!en.on) return;
      en.acc += a;
      if (!en.said && en.acc >= 6.0) { en.said = true; f.emit({ t: 'roomev', k: 'svline', name: sv.fallen ? sv.fallen.name : null, dur: 8 }); }
      if (en.acc >= 10) en.on = false;
    });
    const everyName = () => f.setPiece({ id: 'sveveryname', dur: 10, invul: 3, run: () => {
      cutAct();   // (Grace, a dance's cuts, the seeds, an unleashing: whatever Act III had in flight is cut, so none of it lands in Act IV)
      sv.pushed = true; sv.act = 4; sv.quiet = true; sv.sealed = false; sv.graceUntil = 0;
      B.lockFacing = false; B.moveTo = null; B.x = 0; B.y = -60;
      f.runePair = null;
      for (const n of sv.echoes) f.emit({ t: 'roomev', k: 'svecho:' + n, dur: 0.1 });
      sv.echoes.clear(); sv.corvane = null; sv.caelum = null; sv.morrow = null; sv.brannocN = 0;
      for (const a of [...f.adds.values()]) if (a.kind === 'sapling') { a.onDeath = null; dropSap(a); }
      for (const z of f.zones) z.end = Math.min(z.end, f.t);
      f.emit({ t: 'zone', clear: true });
      f.emit({ t: 'roomev', k: 'svact', act: 4, dur: 9999 });
      f.emit({ t: 'roomev', k: 'svcam', zoom: 0.72, dur: 3 });
      const P = PORTAL(), n = ++sv.echoN;
      f.setForm('square');
      sv.lit = 0; sv.call = -1; sv.wheel = 1; halo();
      f.emit({ t: 'roomev', k: 'svecho:' + n, who: 'hollowking', sig: 3, x: P.x, y: P.y, fly: 0, rise: RISE, dur: -1, face: +Math.atan2(-P.y, -P.x).toFixed(2), kneel: 0 });
      f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'lantern', dur: 9999 });
      sv.echoes.add(n); sv.echoSig.set(n, 3); sv.hk4 = { n, x: P.x, y: P.y };
      en.on = true; en.acc = 0; en.said = false;
    } });

    // --- Act IV, Every Name (S4a: the Doom relay, 12:00, pass one 12:15, Brand 12:40, pass two 12:55, Brand 13:20; S4b: the Tithe 13:30, pass three 13:50, Grace 14:30, pass four 14:50, Kindlings from 15:20) -----------------------
    // The halo is dark, so the fallen are called up from the floor sigils they left behind (svecho with fly 0), three at a time, one from each set, in the order the party first met them.
    // Each pass is three casts (the three names, 1.2 s each, the echoes rising 2.3 s after their names), then the Sovereign's Dance, slowed to a cut every 1.5 s, and the three answers
    // land 3.0 s apart, each in the quiet half-way between two cuts (D0 = the dance's cast begins; the cuts land at D0 + 4.9, 6.4, 7.9, 9.4, 10.9, 12.4; the answers at D0 + 5.65, 8.65, 11.65).
    // Only the next answer is painted in full (each is laid as the one before it lands, and the tags fade later landings). Nothing in a pass needs the floor of a hole: the plates, the
    // dive's spot, the knots, the wheel's catch ring and the lantern are all picked clear of f.sv.holes.
    const ring = (rad, n, a0 = 0) => Array.from({ length: n }, (_, i) => ({ x: Math.round(Math.cos(a0 + i * TAU / n) * rad), y: Math.round(Math.sin(a0 + i * TAU / n) * rad) }));
    const clearOf = (x, y) => holes.reduce((m, h) => Math.min(m, Math.hypot(x - h.x, y - h.y) - h.r), 1e9);   // (the gap from a point to the nearest hole's rim)
    // the first candidate with at least r of floor round it (and passing ok), else the one with the most room, else null
    const pickFree = (cands, r, ok) => { let best = null, bs = -Infinity; for (const c of cands) { if (ok && !ok(c)) continue; const m = clearOf(c.x, c.y); if (m >= r) return c; if (m > bs) { bs = m; best = c; } } return best; };

    // the lantern and Doom, throughout the act: one lantern (the last one: it passes to whoever it cures), Doom hopping from hero to hero in a fixed order (the tank only if nobody else is left),
    // the next one's sigil glowing 6.5 s ahead (roomev doomnext, the Hollow King's own). A carrier is never the next doomed unless the party is too small. The clocks stand still in a set piece.
    const DOOM_IV = 11, GLOW = 6.5, dm = { k: 0, next: [] };
    const relayOrder = () => { const al = f.alive().map(p => p.id).sort((x, y) => x - y), tank = f.tank(), non = al.filter(id => !tank || id !== tank.id); return non.length >= 2 ? non : al; };
    const pickNext = (n = 1) => {   // (n 2: the Hollow King's last Doom, on two at once)
      const order = relayOrder(), carrying = new Set(f.lanterns.map(l => l.carrier).filter(c => c != null)), out = [];
      for (let i = 0; i < order.length * 2 && out.length < n; i++) {
        const id = order[dm.k % order.length]; dm.k++;
        if (f.doomed.has(id) || out.includes(id) || (carrying.has(id) && order.length > 2)) continue;
        out.push(id);
      }
      return out;
    };
    const doomGlow = (n = 1) => {
      if (f.state !== 'live') return;
      dm.next = pickNext(typeof n === 'number' ? n : 1);
      if (dm.next.length) f.emit({ t: 'roomev', k: 'doomnext', ids: dm.next, dur: GLOW + 1.5 });   // (the sigil stays until the Doom lands, a cast's second after the glow's own 6.5 s included: doomLand ends it)
    };
    const doomLand = () => {
      if (f.state !== 'live') return;
      const ids = dm.next.filter(id => live(id) && !f.doomed.has(id));   // (only who was glowed: a Doom is always announced first, so if every glowed hero has fallen it does not land)
      if (dm.next.length) f.emit({ t: 'roomev', k: 'doomnext', ids: [], dur: 0.1 });
      dm.next = [];
      for (const id of ids) { f.doomed.set(id, f.t + DOOM_IV); f.debuff(id, 'doom', DOOM_IV); }
      if (ids.length) f.emit({ t: 'doomed', ids, dur: DOOM_IV });
    };
    // a pass of Doom: the glow step and the landing step (T, the design time it lands; cast: a one second "Royal Doom" cast first, only where nothing else is being cast)
    const doomAt = (T, cast) => [[T - GLOW - (cast ? 1 : 0), doomGlow, null], [T, () => {
      if (cast && (!B.cast || f.t > B.cast.end)) { answer('Royal Doom', 1.0); f.afterKeep(1.0, doomLand); } else doomLand();
    }, 'Royal Doom']];
    // the last lantern is lit by the Hollow King's echo as the act begins: it stands a little in from the portal ring, clear of the holes
    const lanternOn = () => {
      const P = sv.hk4 || PORTAL(), q = pickFree([{ x: Math.round(P.x * 0.78), y: Math.round(P.y * 0.78) }, ...ring(300, 12), ...ring(190, 8, 0.3)], 75) || { x: 0, y: 160 };
      f.lanterns = [{ id: f.nextMechId++, x: q.x, y: q.y, carrier: null, last: true, fade: Infinity }];
      sendLanterns();
    };

    // a call from the floor: the name (1.2 s) and the echo rising from its sigil
    const floorCall = (i, home, len) => {
      if (i === 3 && sv.hk4 && sv.echoes.has(sv.hk4.n)) { f.cast(NAMES.hollowking, len, 'call'); bell(sv.hk4.n, 1.2); return sv.hk4.n; }   // (the Hollow King already stands: his name is cast and his bell rings, nobody rises)
      const who = ECHO[i], at = home || spot(i), n = ++sv.echoN;
      f.cast(NAMES[who] || who, len, 'call');
      f.emit({ t: 'roomev', k: 'svecho:' + n, who, sig: i, x: at.x, y: at.y, fly: 0, rise: RISE, dur: 40, face: at.face ?? +Math.atan2(-at.y, -at.x).toFixed(2), kneel: 1 });
      sv.echoes.add(n); sv.echoSig.set(n, i);
      return n;
    };
    // the three names in turn, then then(ns) as the third cast ends (D0: the dance begins). list: [[sigil, home, stand(n) (runs as that echo stands)]]
    // THE FIRST SIGNAL (Diamond Dust, Heavensfall): in each pass the first echo's answer is the frame, and the other two answers land on the same frame turned by the pass's fixed angle
    // (FRAME, degrees, passes one to four; the fight is fixed, so a party that has learned it reads the first answer and knows where the next two go). The first echo's sigil flares as
    // it stands (roomev svsignal { x, y, turn, at, dur }, nothing else). The second and third echoes stand on their sigils turned by the angle (nudged a few degrees to clear any hole),
    // and each answer's geometry is turned with them (the pass functions below). Who is targeted is untouched.
    const FRAME = [0, 90, 45, 180];
    const turnPt = (p, deg) => {
      if (!deg) return p;
      const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x = Math.round(p.x * c - p.y * s), y = Math.round(p.x * s + p.y * c);
      return { x, y, face: +Math.atan2(-y, -x).toFixed(2) };
    };
    const framePt = (p, deg) => { const c = [0, 12, -12, 24, -24].map(o => turnPt(p, deg + o)); return pickFree(c, 100) || c[0]; };   // (a turned place that is not over a hole, if one is near)
    let signalN = 0;
    const signal = (i, at, turn) => {
      const hk = i === 3 && sv.hk4, q = hk || at || spot(i), t0 = hk ? 0.5 : RISE;
      f.emit({ t: 'roomev', k: 'svsignal:' + (++signalN), name: 'The First Signal', who: ECHO[i], x: q.x, y: q.y, turn, at: t0, dur: t0 + 2.6 });
    };
    // then(ns, ats): ats[k] is where echo k stands (null: on its own sigil)
    const callThree = (list, then, turn = 0) => {
      const L = f.ct(1.2), ns = [], ats = list.map(([i, home], k) => (k && turn ? framePt(home || spot(i), turn) : home || null));
      list.forEach(([i], k) => {
        const go = () => {
          if (f.state !== 'live') return;
          ns[k] = floorCall(i, ats[k], L);
          if (k === 0) signal(i, ats[k], turn);
          const stand = list[k][2]; if (stand) f.afterKeep(RISE, () => { if (f.state === 'live') stand(ns[k]); });
        };
        if (k === 0) go(); else f.afterKeep(k * L, go);
      });
      f.afterKeep(list.length * L, () => { if (f.state === 'live') then(ns, ats); });
    };
    const CORVANE_AT = (() => { const a = (8 + 0.5) / 12 * TAU - Math.PI / 2, x = Math.round(Math.cos(a) * 240), y = Math.round(Math.sin(a) * 240); return { x, y, face: +Math.atan2(-y, -x).toFixed(2) }; })();   // (where he knelt in Act III)

    // Grubnak, Flambé Service shortened: two plates (served 3.0 s apart, the second at the answer's beat) and the flambé line from the first to the second (it stops short of the second plate)
    const platePair = (from, firstCut) => {
      const cands = [...ring(250, 12, 0.26), ...ring(340, 12, 0), ...ring(160, 6, 0.5)];
      const p1 = pickFree(cands, PLATE_R + 25) || cands[0];
      const far = c => Math.hypot(c.x - p1.x, c.y - p1.y) >= 320;
      const offCut = c => PROPS.segDist(c.x, c.y, from.x, from.y, firstCut.x, firstCut.y) >= 150;   // (the second plate is served after the dance's first cut has landed)
      const p2 = pickFree(cands, PLATE_R + 25, c => far(c) && offCut(c)) || pickFree(cands, PLATE_R + 25, far) || cands[6];
      return [p1, p2];
    };
    let plateN = 0;
    const flambeTwo = (D, ns) => {   // (called at D0: the plates are served at D0 + 2.65 and D0 + 5.65, the line lands at D0 + 4.35)
      const [p1, p2] = platePair({ x: B.x, y: B.y }, D.pts[0]), T1 = 2.65, T2 = 5.65, a = Math.atan2(p2.y - p1.y, p2.x - p1.x), Ld = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      f.emit({ t: 'roomev', k: 'svflambe:' + (1000 + ++plateN), plates: [[p1.x, p1.y], [p2.x, p2.y]], at: [T1, T2], r: PLATE_R, dur: T2 + 3 });
      for (const [k, p] of [[0, p1], [1, p2]]) f.mech({ type: 'tower', shape: { kind: 'circle', x: p.x, y: p.y, r: PLATE_R }, delay: k ? T2 : T1, dmg: dmg.plate, failDmg: dmg.plateFail, need: 1, tag: 'svPlate', from: 'Flambé Service' });
      f.aoe({ kind: 'rect', x: p1.x, y: p1.y, angle: +a.toFixed(3), len: Math.round(Ld - PLATE_R - 12), w: 70 }, T1 + 1.7, dmg.flambe, { tag: 'svFlambe', from: 'Flambé Service' });
      endEcho(ns[0], T2 + 0.4);
    };
    // Vhalgrath, Cinder Dive shortened: onto the scorched spot (of the three) with the most floor round it, from another spot's side; the landing alone (no Aftershock, no steam: the floor has no sheets)
    const diveShort = (ns, wait, T = 0) => {
      const spots = [0, 1, 2].map(i => turnPt(spotXY(i), T)), L = pickFree(spots, 130) || spots[0], P = spots[(spots.indexOf(L) + 1) % 3];
      const r = dive(L, P, null, wait);
      f.afterKeep(r.d + 0.03, () => { if (f.state === 'live') f.emit({ t: 'roomev', k: 'svechoact:' + ns[1], anim: 'attack', dur: 1.2 }); });
      endEcho(ns[1], r.d + 0.7);
    };
    // Corvane, Crossed Blades shortened to the Lance: his stance names it (the comet), then the Sovereign's lance (from the dance point it stands on) lands at D0 + 10.15 and his own 1.5 s later,
    // each through the hero farthest from its blade (never the same hero twice), aimed when laid
    const lanceTwo = (D, ns, C = CORVANE_AT) => {
      const O = D.pts[3], skip = new Set(), g = new Set();   // (the Sovereign has cut to the fourth point by 10.15)
      f.afterKeep(5.55, () => { if (f.state === 'live') f.emit({ t: 'roomev', k: 'svechoact:' + ns[2], anim: 'comet', dur: 7.5 }); });
      const one = (from, d) => {
        const t = farthest(from.x, from.y, skip) || farthest(from.x, from.y, new Set()); if (!t) return;
        skip.add(t.id);
        const a = Math.atan2(t.y - from.y, t.x - from.x), L = Math.round(toWall(from.x, from.y, a));
        f.aoe({ kind: 'rect', x: from.x, y: from.y, angle: +a.toFixed(3), len: L, w: 150 }, d, dmg.lance, { tag: 'svLance', group: g, from: 'Crossed Blades' });
        f.emit({ t: 'roomev', k: 'svlance:' + (++crossN), l: [[from.x, from.y, Math.round(from.x + Math.cos(a) * L), Math.round(from.y + Math.sin(a) * L), +d.toFixed(2)]], w: 150, dur: +(d + 1.2).toFixed(2) });
      };
      f.afterKeep(7.75, () => { if (f.state === 'live') one(O, 2.4); });
      f.afterKeep(8.75, () => { if (f.state === 'live') one(C, 2.9); });
      endEcho(ns[2], 11.65 + 0.9);
    };
    // pass one: Grubnak, Vhalgrath, Corvane
    // (the First Signal: the plates are the signal, the dive's three spots and Corvane's place are turned by FRAME[0], and so is the dance)
    const passOne = () => callThree([[0], [4], [8, CORVANE_AT]], (ns, ats) => {
      const T = FRAME[0], D = { pts: dancePts(T) };
      dance({ rot: T, lead: 3.4, step: 1.5 });
      flambeTwo(D, ns);
      f.afterKeep(5.25, () => { if (f.state === 'live') diveShort(ns, 3.4, T); });
      lanceTwo(D, ns, ats[2]);
    }, FRAME[0]);

    // Skitterra, Burning Web shortened: two threads with a knot each (two of the three canonical threads, or turns of them, whose knots stand clear of the holes). Break a knot and its thread burns
    // out from it; a thread left whole goes up at D0 + 5.65 with her shadow racing along it (laid at D0 + 2.65)
    const webTwo = () => {
      const cands = [];
      for (const base of [-90, 30, 150]) for (const off of [0, 20, -20, 40, -40]) cands.push(base + off);
      const mk = deg => {
        const na = deg * Math.PI / 180, g = WEB_G, r = ARENA.r - 12, nx = Math.cos(na), ny = Math.sin(na), tx = -ny, ty = nx, h = Math.sqrt(r * r - g * g);
        return { deg, x1: Math.round(nx * g - tx * h), y1: Math.round(ny * g - ty * h), x2: Math.round(nx * g + tx * h), y2: Math.round(ny * g + ty * h), kx: Math.round(nx * g), ky: Math.round(ny * g), len: Math.round(2 * h) };
      };
      const ok = w => clearOf(w.kx, w.ky) >= 80;   // (room to stand by the knot and break it)
      const all = cands.map(mk), a = all.find(ok) || all[0];
      const sep = (u, v) => { const d = Math.abs(u.deg - v.deg) % 360; return d > 180 ? 360 - d : d; };
      const b = all.find(w => ok(w) && sep(w, a) >= 100) || all.find(w => sep(w, a) >= 100) || all[1];
      return [a, b].map((w, i) => Object.assign(w, { id: i, order: i }));
    };
    // Hrimgar, Glass Floor shortened: a small patch of the floor (the nine sheets round the one under his foot) shatters in three beats, then the floor is whole again (no sinking)
    const glassPatch = (ns, at0) => {
      const at = at0 || spot(5), foot = sheetAt(at.x, at.y) || sheets.reduce((m, s) => (!m || Math.hypot(s.cx - at.x, s.cy - at.y) < Math.hypot(m.cx - at.x, m.cy - at.y) ? s : m), null);   // (a turned place can fall between the sheets: the nearest one is the foot)
      const w = foot && glassWave(foot.cx, foot.cy, { reach: 1.5, lead: 2.6, step: 0.5, sink: false });
      f.emit({ t: 'roomev', k: 'svechoact:' + ns[1], anim: 'attack', dur: 1.2 });
      endEcho(ns[1], (w ? w.end : 1.5) + 0.7);
    };
    // Brannoc, Sunwheel shortened: the wheel is thrown from his sigil and bounces off the walls AND THE HOLES' RIMS (the threads are not used: a thread can be cut by the party between the paint and the
    // wheel, and the whole path is painted in full; a hole is fixed, so the path reads the same every pull). No walls of fire. The catch ring is clear of the holes.
    const wheelPathH = (x, y, a, n) => {
      const RW = ARENA.r - WH.pad, obs = holes.map(h => ({ x: h.x, y: h.y, r: h.r + 38 })), pts = [[x, y]];
      let dx = Math.cos(a), dy = Math.sin(a), hitsH = 0;
      const next = () => {
        let t = wheelHit(x, y, dx, dy, RW), o = null;
        for (const q of obs) {
          const px = x - q.x, py = y - q.y, b = px * dx + py * dy, c = px * px + py * py - q.r * q.r, disc = b * b - c;
          if (disc <= 0) continue;
          const t1 = -b - Math.sqrt(disc);
          if (t1 > 0.5 && t1 < t) { t = t1; o = q; }
        }
        return { t, o };
      };
      for (let i = 0; i < n; i++) {
        const { t, o } = next();
        let nx, ny;
        x += dx * t; y += dy * t; pts.push([x, y]);
        if (o) { nx = (x - o.x) / o.r; ny = (y - o.y) / o.r; hitsH++; } else { nx = x / RW; ny = y / RW; }
        const dd = dx * nx + dy * ny;
        dx -= 2 * dd * nx; dy -= 2 * dd * ny;
      }
      const { t } = next();
      pts.push([x + dx * t * WH.frac, y + dy * t * WH.frac]);
      return { pts, hitsH };
    };
    const wheelPlan = (at0, T = 0) => {
      const at = at0 || spot(9), aims = [], hs = holes.slice().sort((p, q) => Math.hypot(p.x - at.x, p.y - at.y) - Math.hypot(q.x - at.x, q.y - at.y));
      for (const h of hs) for (const off of [0, 0.1, -0.1, 0.2, -0.2]) aims.push(Math.atan2(h.y - at.y, h.x - at.x) + off);
      const wa = turnPt(WH.aim, T);
      aims.push(Math.atan2(wa.y - at.y, wa.x - at.x));
      let best = null;
      for (const a of aims) for (const n of [3, 2]) {
        const r = wheelPathH(at.x, at.y, a, n), e = r.pts[r.pts.length - 1];
        if (!isFinite(e[0]) || Math.hypot(e[0], e[1]) > ARENA.r - 130 || clearOf(e[0], e[1]) < WH.r + 40) continue;
        if (r.pts.some((q, i) => i > 0 && i < r.pts.length - 1 && Math.hypot(q[0] - r.pts[i - 1][0], q[1] - r.pts[i - 1][1]) < 240)) continue;   // (no stub legs: every run between bounces is long enough to read)
        if (r.hitsH >= 1) return r.pts;
        if (!best) best = r.pts;
      }
      return best || wheelPath(at.x, at.y, Math.atan2(wa.y - at.y, wa.x - at.x), 3);
    };
    // pass two: Skitterra, Hrimgar, Brannoc
    // (the First Signal: the threads are the signal; Hrimgar's patch, Brannoc's throw (from where he stands) and the dance are turned by FRAME[1])
    const passTwo = () => callThree([[1, null, n => { layWeb(webTwo()); sv.webN = n; sv.webEnded = false; }], [5], [9]], (ns, ats) => {
      const T = FRAME[1];
      dance({ rot: 30 + T, lead: 3.4, step: 1.5 });
      f.afterKeep(2.65, () => { if (f.state === 'live') shadowDrop(3.0, true); });
      f.afterKeep(5.65, () => { if (f.state === 'live') glassPatch(ns, ats[1]); });
      f.afterKeep(8.7, () => { if (f.state === 'live') wheelThrow({ n: ns[2] }, { d: 2.7, noCast: true, fire: false, path: wheelPlan(ats[2], T) }); });
    }, FRAME[1]);

    // ---- S4b: the end of the fight --------------------------------------------------------------------------------------------------------
    // The Royal Tithe of Act IV (13:30): the Hollow King's echo already stands (f.sv.hk4) and keeps standing, so the Dirge must not end it (sv.hkEnded stays true).
    const tithe4 = () => { sv.hkN = sv.hk4 ? sv.hk4.n : 0; sv.hkEnded = true; tithe(); };

    // Pass three (13:50): Volkar, Azerath, Morrow-Oak. D0 = the dance's cast begins (rot 60); the answers land at D0 + 5.65, 8.65, 11.65.
    //   Volkar: his echo stands at D0 - 1.3 and every hero is given a charge (fixed: by id, fire and ash in turn); the gentle drift (svdrift) runs until D0 + 9 and the charges go then. No Surge.
    //   Azerath: reads the charges. His echo stands at D0 - 0.1: two brands go on the two non-tanks nearest the middle and one wall lights (roomev svtwin, `rule` says what the charges ask).
    //     Bearers with OPPOSITE charges MEET at the lit wall (blue circle, the wall is frost in the east or lightning in the south), bearers with the SAME charge FLEE it to the two far
    //     corners (red bloom on the wall, a red circle on each; the wall is fire in the north or the void in the west). The wall is the first of its two whose ground is clear of the holes.
    //     The telegraphs are laid at D0 + 5.65 and land 3.0 s later (D0 + 8.65), shown in full from then like every answer.
    //   Morrow-Oak: one seed (seeds(1, 6)), laid at D0 + 5.65, bursts at D0 + 11.65 (a hole; no sapling in Act IV: sv.pushed).
    const giveCharges = () => {
      f.players().slice().sort((p, q) => p.id - q.id).forEach((p, i) => f.polarity.set(p.id, i % 2 ? -1 : 1));
      sendPol(false);
    };
    const twinRead = n => {
      if (f.state !== 'live') return;
      const pair = twinPair();
      if (pair.length < 2) { endEcho(n, 0.5); return; }
      const ids = pair.map(p => p.id), same = charge(ids[0]) === charge(ids[1]), rule = same ? 'split' : 'pair', els = same ? ['fire', 'void'] : ['frost', 'bolt'];
      const room = el => { const W = wallPoint(el); return rule === 'pair' ? clearOf(W.x, W.y) - 90 : Math.min(...cornersFor(el).map(q => clearOf(q.x, q.y))) - 70; };
      const el = els.find(e => room(e) >= 0) || els.slice().sort((a, b) => room(b) - room(a))[0];
      const W = wallPoint(el), tn = ++twinN, lead = 5.75, last = f.ct(3.0);
      busy(lead + last + 1.2);
      f.emit({ t: 'roomev', k: 'svtwin:' + tn, el, wall: TWIN[el].a + twinRot, x: W.x, y: W.y, rule, ids, corners: rule === 'split' ? cornersFor(el).map(q => [q.x, q.y]) : null,
        r: rule === 'pair' ? TW.meet : TW.bloom, at: +(lead + last).toFixed(2), shift: 0, from: null, dur: +(lead + last + 1.5).toFixed(2) });
      f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'attack', dur: 1.2 });
      f.afterKeep(lead, () => { if (f.state === 'live') layTwin(ids, el, last, rule); });
      f.afterKeep(lead + last + 0.15, () => { f.runePair = null; });
      endEcho(n, lead + last + 0.5);
    };
    const morrowSeed = n => {
      if (f.state !== 'live') return;
      f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'attack', dur: 1.2 });
      seeds(1, f.ct(6));
      endEcho(n, f.ct(6) + 0.8);
    };
    // (the First Signal: Volkar's charges are the signal; the lit wall (the four walls turn together) and the dance are turned by FRAME[2]. Morrow-Oak's seed falls on whoever carries it)
    const passThree = () => {
      twinRot = FRAME[2]; f.afterKeep(20, () => { twinRot = 0; });
      callThree([[2, null, n => { f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'howl', dur: 1.6 }); giveCharges(); }], [6, null, twinRead], [10]], ns => {
        dance({ rot: 60 + FRAME[2], lead: 3.4, step: 1.5 });
        f.afterKeep(5.65, () => morrowSeed(ns[2]));
        f.afterKeep(9.0, clearCharges);
        endEcho(ns[0], 9.3);
      }, FRAME[2]);
    };

    // Pass four (14:50): the Hollow King, the Hydra, Caelum Vey (D0 as above, rot 90).
    //   The Hollow King (already standing: his name is cast and his bell rings) answers at D0 + 5.65 with the LAST Doom: two heroes at once (the glow, 6.5 s ahead, is a course step), one lantern, so the
    //     lantern has to pass from the first cured to the second.
    //   The Hydra: the heads the party cut in Act II come back as PILLARS (circle r 150, tag svPillar) in the order they were cut (f.sv.cutOrder; a head never cut follows in head order, so three
    //     always stand), each at a FRESH spot clear of the holes (not the head's sigil), painted 2.2 s ahead, 1.5 s apart: erupting at D0 + 8.65, 10.15 and 11.65.
    //   Caelum Vey: the Sovereign's Dance runs through whatever floor is left and he cuts alongside on its last three beats (the S3a dance; sv.caelum is set before it begins).
    const pillarSpots = (T = 0) => {
      const order = sv.cutOrder.slice();
      for (const k of [0, 1, 2]) if (!order.includes(k)) order.push(k);
      const out = [];
      for (const k of order.slice(0, 3)) {
        const a0 = Math.atan2(HEAD_AT[k].y, HEAD_AT[k].x) + 1.05 + T * Math.PI / 180, cands = [...ring(300, 12, a0), ...ring(190, 8, a0 + 0.2)];
        const q = pickFree(cands, PIL.r * 0.5 + 30, c => out.every(o => Math.hypot(c.x - o.x, c.y - o.y) >= 300)) || cands[0];
        out.push({ k, x: q.x, y: q.y });
      }
      return out;
    };
    const hydraPillars = (n, T = 0) => {
      if (f.state !== 'live') return;
      f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'roar', dur: 1.6 });
      pillarSpots(T).forEach((e, i) => f.afterKeep(i * 1.5, () => {
        if (f.state !== 'live') return;
        f.emit({ t: 'roomev', k: 'svpillar:' + (++pillarN), head: e.k + 1, x: e.x, y: e.y, order: i + 1, live: 0, r: PIL.r, at: PIL.lead, dur: PIL.lead + 1.2 });
        f.aoe({ kind: 'circle', x: e.x, y: e.y, r: PIL.r }, PIL.lead, dmg.pillar, { tag: 'svPillar', from: 'Heads of Flame' });
      }));
      endEcho(n, 2 * 1.5 + PIL.lead + 1.2);
    };
    // (the First Signal: the Hollow King's Doom is the signal; the pillars' places and the dance (Caelum's cuts with it) are turned by FRAME[3])
    const passFour = () => callThree([[3], [7], [11]], ns => {
      const T = FRAME[3];
      sv.caelum = { n: ns[2] };
      dance({ rot: 90 + T, lead: 3.4, step: 1.5 });
      f.afterKeep(5.65, () => { if (f.state === 'live') { if (sv.hk4) bell(sv.hk4.n, 1.6); doomLand(); } });
      f.afterKeep(6.45, () => hydraPillars(ns[1], T));
      f.afterKeep(f.ct(3.4) + 6 * f.ct(1.5) + 0.3, () => { sv.caelum = null; endEcho(ns[2], 0.3); });
    }, FRAME[3]);

    // The enrage, Emberfall: set piece 'svemberfall' (8 s, nothing hits, the boss is NOT immune). roomev svemberfall { seams, ignite, ash, dur } in seconds from the message: the flagstone seams
    // go white-gold, the town ignites from below, the ash closes in from the edges. At its end everyone dies (kind 'enrage'), unless the Sovereign has fallen meanwhile.
    const em = { on: false, acc: 0, fired: false };
    f.onSetPiece(a => {
      if (!em.on) return;
      em.acc += a;
      if (!em.fired && em.acc >= 8 - 1e-6) {
        em.fired = true; em.on = false;
        f.afterKeep(0.05, () => { if (f.state !== 'live' || sv.killed) return; for (const p of f.alive()) f.damagePlayer(p, 9999999, { kind: 'enrage' }); });
      }
    });
    f.enrage = () => {
      if (f.state !== 'live' || sv.killed) return;
      f.cast('Emberfall', 8, 'enrage');
      em.on = true; em.acc = 0; em.fired = false;
      f.setPiece({ id: 'svemberfall', dur: 8, invul: 0, run: () => f.emit({ t: 'roomev', k: 'svemberfall', seams: 0.8, ignite: 2.4, ash: 4.4, dur: 8 }) });
    };
    // a wipe: the halo relights in full and the fire flares before the wipe card (the client shows the card 2.8 s after the wipe message, so the beat plays inside that)
    const end0 = f.end.bind(f);
    f.end = result => {
      if (f.state === 'live' && result === 'wipe') f.emit({ t: 'roomev', k: 'svwipe', lit: 0xfff, enrage: em.fired || em.on ? 1 : 0, dur: 2.6 });
      end0(result);
    };

    // The kill, the last flame: set piece 'svlastflame' (14 s, invul 14 so nothing at all lands and the boss takes nothing more; the party keeps control). fight.js holds the clear: bossFell() calls
    // f.onFell instead of ending the fight, and the script ends it with end('clear') as the set piece ends (the clients show the results card 3.4 s after that message).
    //   0.3 s     roomev svgutter { dur 8.5 } (the art reads svGutter 0..1 from it); the halo is dark
    //   1.8 s on  the echoes lie down one every 0.62 s in the order first met (sigil 0, 1, 2, 4 ... 11), the Hollow King last (3) at 9.3 s, setting the lantern down at his feet
    //   10.4 s    the fire has drained: svact 'night', form 'night', the holes close, the camera returns to 1
    //   14 s      end('clear')
    const LIE = { start: 1.8, step: 0.62, hk: 1.3, night: 10.4, end: 14 };
    const lf = { on: false, acc: 0, k: 0, hk: false, night: false, gut: false, done: false };
    const lieOrder = () => [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 3];
    const lieDown = i => { const n = standingEcho(i); if (n) f.emit({ t: 'roomev', k: 'svechoact:' + n, anim: 'liedown', dur: 9999 }); };
    const hkDown = () => {
      const hk = sv.hk4; if (!hk) return;
      f.emit({ t: 'roomev', k: 'svechoact:' + hk.n, anim: 'liedown', dur: 9999 });
      lf.hkAt = lf.acc;   // (the host's lantern is set down on the stones 0.9 s later: lantDown(), below, so it does not overlap the fx carrying his lantern down)
    };
    const lantDown = () => {
      const hk = sv.hk4; if (!hk) return;
      f.lanterns = [{ id: f.nextMechId++, x: Math.round(hk.x + 34), y: Math.round(hk.y + 18), carrier: null, last: true, fade: Infinity }];
      sendLanterns();
    };
    const nightFall = () => {
      f.emit({ t: 'roomev', k: 'svact', act: 'night', dur: 9999 });
      f.emit({ t: 'roomev', k: 'svcam', zoom: 1, dur: 3 });
      for (const h of holes) f.removeFloor(h);
      holes.length = 0;
      f.setForm('night');
      sv.lit = 0; sv.call = -1; sv.wheel = 0; halo();
    };
    f.onSetPiece(a => {
      if (!lf.on) return;
      lf.acc += a;
      if (!lf.gut && lf.acc >= 0.3) { lf.gut = true; f.emit({ t: 'roomev', k: 'svgutter', dur: 8.5 }); }
      const ord = lieOrder();
      while (lf.k < 11 && lf.acc >= LIE.start + lf.k * LIE.step - 1e-6) { lieDown(ord[lf.k]); lf.k++; }
      if (!lf.hk && lf.acc >= LIE.start + 10 * LIE.step + LIE.hk - 1e-6) { lf.hk = true; hkDown(); }
      if (lf.hkAt != null && !lf.lant && lf.acc >= lf.hkAt + 0.9 - 1e-6) { lf.lant = true; lantDown(); }
      if (!lf.night && lf.acc >= LIE.night) { lf.night = true; nightFall(); }
      if (!lf.done && lf.acc >= LIE.end - 1e-6) { lf.done = true; lf.on = false; f.afterKeep(0.05, () => f.end('clear')); }
    });
    f.onFell = () => {
      sv.killed = true; em.on = false; burn.until = -1;
      // everything on the floor goes (nothing may be left to resolve, and the clients fade their telegraphs)
      f.events = [];
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      f.puddles = []; f.tethers.clear();
      for (const z of f.zones) z.end = Math.min(z.end, f.t);
      f.emit({ t: 'zone', clear: true });
      for (const a of [...f.adds.values()]) { f.adds.delete(a.id); f.emit({ t: 'addev', k: 'gone', id: a.id }); }
      f.addsDirty = true;
      for (const th of threads()) if (th.fl) f.removeFloor(th.fl);
      delete f.room.threads;
      if (B.cast) f.emit({ t: 'bcastend', name: B.cast.name, ok: 0 });
      B.cast = null; B.lockFacing = false; B.moveTo = null; B.noAutoUntil = f.t + 99;
      f.runePair = null; f.knights = []; f.echoPlan = []; sendKnights();
      clearCharges();
      for (const id of f.doomed.keys()) { const s = f.ps.get(id); if (s) delete s.debuffs.doom; f.emit({ t: 'cure', id, l: 0 }); }
      f.doomed.clear();
      f.setPiece({ id: 'svlastflame', dur: LIE.end, invul: LIE.end, run: () => {
        lf.on = true; lf.acc = 0; lf.k = 0;
        sv.lit = 0; sv.call = -1; halo();
        const ord = lieOrder(), hk = sv.hk4;
        f.emit({ t: 'roomev', k: 'svlie', order: ord, start: LIE.start, step: LIE.step, hk: LIE.hk, night: LIE.night, echo: ord.map(i => standingEcho(i)),
          pos: ord.map(i => { const q = i === 3 && hk ? { x: hk.x, y: hk.y, face: +Math.atan2(-hk.y, -hk.x).toFixed(2) } : i === 8 ? CORVANE_AT : spot(i); return [q.x, q.y, q.face]; }), dur: LIE.end });
      } });
    };

    // The act (design times, c = T - 718: the push's set piece stops the course clock, so 12:00 is 2 s after it ends). The Doom passes land at 12:07 (quiet), 12:25.75 (half-way between two
    // answers of pass one), 12:44, 13:05.75 (the same gap in pass two) and 13:17 (it was 13:26: that one ran into the Tithe at 13:30); each glows 6.5 s ahead. S4b adds 13:30 on (below).
    const lineIV = list => { let prev = 0; return list.slice().sort((p, q) => p[0] - q[0]).map(([T, fn, name]) => { const c = T - 718, dt = c - prev; prev = c; return [dt, fn, name]; }); };
    const actIV = from => {
      const all = lineIV([
        [720, kindling, 'Kindling'],
        ...doomAt(727, true),
        [735, passOne, 'Grubnak, the Ogre Chef'],
        ...doomAt(745.75, false),
        [760, brand, 'Brand'],
        ...doomAt(764, true),
        [775, passTwo, 'Skitterra, the Spider Broodmother'],
        ...doomAt(785.75, false),
        [800, brand, 'Brand'],
        ...doomAt(797, true),   // (13:17, as the pass-two Doom ends: it runs out at 13:28, clear of the Tithe's drop at 13:30; it was 13:26)
        // S4b. 13:30 the Royal Tithe (the Dirge 8 s later), 13:50 pass three (the Doom that follows lands half-way between its first two answers; the next one is before the Brand so that nothing
        //   runs into Grace Withdrawn), 14:20 Brand, 14:30 Grace Withdrawn (60 s after the Tithe, a dance's length from both passes), 14:50 pass four (the Hollow King's two-hero Doom glows 6.5 s ahead of
        //   its answer, D0 + 5.65 = 14:59.25, and lands inside the pass), a last single Doom after the dance, 15:20 Kindling (the closing loop takes it on every fifteen seconds, each harder).
        [810, tithe4, 'Royal Tithe'], [818, dirge, 'Dirge'],
        [830, passThree, 'Volkar, the Storm Titan'],
        ...doomAt(840.75, false),
        ...doomAt(852, true),
        [860, brand, 'Brand'], [870, grace, 'Grace Withdrawn'],
        [890, passFour, 'The Hollow King'], [892.75, () => doomGlow(2), null],
        ...doomAt(913, true),
        [920, kindling, 'Kindling'],
      ]);
      all[0][0] -= 0.5;   // (Kindling stays at 12:00: the lantern step is a half second after the set piece)
      return f.course({
        onStart: () => { actDmg(4); if (f.skipTo >= 4 && f.t < 1 && !holes.length) for (const [x, y] of [[-190, 150], [215, 215]]) digHole(x, y); },   // (a practice start has no holes: two fixed ones stand in)
        sets: [[[0, everyName, 'Every Name'], [0.5, lanternOn, null], ...all]],
        ramp: 0.15,
        closing: [[15, kindling, 'Kindling']],   // (15:20 on: a Kindling every fifteen seconds, 15% harder each, until it falls or Emberfall comes)
      }, from);
    };

    // --- Act III, The Fall (50% -> 20%): the first half (S3a), 7:50 to 9:20 --------------------------------------------------------
    // Times are the design's. Rebirth is the first step (its set piece stops the course clock for 12 s, so 8:05 is 3 s after it ends: c = T - 482).
    const lineIII = list => { let prev = 0; return list.map(([T, fn, name]) => { const c = T - 482, dt = c - prev; prev = c; return [dt, fn, name]; }); };
    const actIII = from => {
      const all = lineIII([
        [482, rebirth, 'Rebirth'],
        [485, corvane, 'Corvane, the Unburied Blade'], [492, () => unleash('crescent'), 'Crescent'], [505, brand, 'Brand'],
        [515, caelum, 'Caelum Vey, the Starborn'], [522, () => dance(), "The Sovereign's Dance"],
        [540, sunwheel, 'Brannoc, the Undefeated'], [555, brand, 'Brand'],
        // (S3b) Grace Withdrawn comes alone, a dance's length clear of the Dance at 8:42 and of the next at 10:40; Nightfall lands GRACE.gap s after it has taken everyone to 1 HP
        [565, grace, 'Grace Withdrawn'], [590, morrow, 'Morrow-Oak, the Starved Grove'], [610, () => unleash('lance'), 'Lance'], [625, kindling, 'Kindling'],
        [640, dancePair, "The Sovereign's Dance"], [665, brand, 'Brand'], [675, () => unleash('pyre'), 'Pyre'], [690, foretold, 'Foretold'], [710, kindling, 'Kindling'],
      ]);
      return f.course({
        onStart: () => { actDmg(3); if (f.skipTo >= 3 && f.t < 1) { sv.lit = 0xf00; halo(); } },   // (eight sigils dark: set 1 and set 2's four)
        until: 0.2, push: true,   // (the push: the gate cuts the act at once and Act IV's set piece begins)
        next: t => actIV(t),
        sets: [all.slice(0, 1), all.slice(1, 3), all.slice(3, 4), all.slice(4, 6), all.slice(6, 7), all.slice(7, 8), all.slice(8, 9), all.slice(9, 10), all.slice(10, 12), all.slice(12, 13), all.slice(13, 15), all.slice(15, 16), all.slice(16)],
        // a slow party's soft enrage: one Brand a pass, a pass about 48 s long, so the tank has the time to plan a cooldown for the hot Brand (the burn is 90 s: every Brand after the first is hot)
        closing: [[12, kindling, 'Kindling'], [11, () => sweep(), 'Ashen Sweep'], [10, ember, 'Cupped Ember'], [15, brand, 'Brand']],
      }, from);
    };

    // (a practice start at Act II lands in actII: Act I is passed over, so the halo is set to the four dark sigils the act would have left)
    // Design times are the Act II table's (3:35 Kindling is 215; the burnback runs first, 3 s before it).
    const lineII = list => { let prev = 0; return list.map(([T, fn, name]) => { const c = T - 212, dt = c - prev; prev = c; return [dt, fn, name]; }); };
    const actII = from => {
      const all = lineII([
        [212, burnback, 'The Road Burns Back'], [215, kindling, 'Kindling'],
        [228, glassFloor, 'Hrimgar, Warden of the White Reach'], [245, brand, 'Brand'],
        [250, flameHeads, 'The Hydra, Mother of Nine Heads'], [270, () => cinderDive(1, 2), 'Vhalgrath, Tyrant of the Cinder Peaks'],
        [290, anvilCount, 'The Anvil Count'], [323, () => headCall(1), 'Heads of Flame'],   // (4:50 The Anvil Count replaces the first Halo Turn: about 32 s, the Hydra's bites held; the second head rises as it ends, 5:23 instead of 5:05, and the steps after it close up)
        [328, brand, 'Brand'], [340, () => twinBrands({ el: 'frost' }), 'Azerath, Master of the Seven Circles'],
        [355, () => sweep(), 'Ashen Sweep'], [359, () => headCall(2), 'Heads of Flame'],
        [367, brand, 'Brand'], [379, pairMove, 'Vhalgrath, Tyrant of the Cinder Peaks'],
        [400, kindling, 'Kindling'], [415, () => haloTurn(0.7), 'Halo Turn'],
        [430, () => twinBrands({ el: 'void', to: 'frost', fly: 0 }), 'Azerath, Master of the Seven Circles'], [455, ember, 'Cupped Ember'],
        // (5:25 Twin Brands lights frost, a wall to meet at; 7:10's lights the void, a wall to flee, and changes once to frost, the east wall again (the south is under the first waves' water by then). Cupped Ember, the
        //  design's 7:10, is pushed to 7:35 so the second Twin Brands has the slot; the wall usually comes before it.)
      ]);
      return f.course({
        onStart: () => { actDmg(2); if (f.skipTo >= 2 && f.t < 1) { sv.lit = 0xff0; halo(); } },
        until: 0.5,
        seam: 0,   // (the wall takes the act at its gate: no waiting for a seam after it)
        wall: { label: 'The Heart Remembers', run: heartRun, until: 'resolved', timeout: 60 },
        sets: [all.slice(0, 2), all.slice(2, 4), all.slice(4, 5), all.slice(5, 6), all.slice(6, 8), all.slice(8, 10), all.slice(10, 12), all.slice(12, 13), all.slice(13, 14), all.slice(14, 16), all.slice(16, 17), all.slice(17)],
        closing: [[14, brand, 'Brand'], [12, kindling, 'Kindling']],
        next: t => actIII(t),
      }, from);
    };
    // Per-act damage (tuning): the `dmg` table (damage, not the adds' health, and not the plate, the Aftershock, Scatter, the catch, the burst or the raidwides (Kindling, Dirge, Rebirth, Nightfall), which must stay survivable: each takes under about 65% of a full-health hero's health) is scaled by the act's number at the act's start, so each act can be set to
    // its own rate with a human party (a practice start runs the onStart of the acts it passes over, so the act it begins in is the last set).
    // (2026-10-31: [3.3, 3.5, 4.5, 4.4] until bots and parties held every talent row here; the health went 9.0M -> 14.0M with it.)
    const ACT_DMG = [3.5, 3.85, 5.18, 4.95], dmg0 = Object.assign({}, dmg);
    const actDmg = n => { B.dmgUp = 0; for (const k in dmg0) dmg[k] = /Hp$|^(catch|burst|plate|anvil|anvilFail|after|scatter|kindling|dirge|rebirth|night)$/.test(k) ? dmg0[k] : Math.round(dmg0[k] * ACT_DMG[n - 1]); };
    actI(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.sweep())
    f.moves = { kindling, brand, sweep, ember, scatter, haloTurn, procession,flambe, web, shadowDrop, call, endEcho, halo, setSide, volkar, surge, crier, tithe, dirge, burnback, clearCharges, glassFloor, glassWave, mendSheets, flameHeads, headRise, headCall, hydraEnd, cinderDive, dive, sinkSheet, twinBrands, pairMove, anvilCount, heartRun, rebirth, corvane, unleash, crescent, lance, pyre, caelum, dance, sunwheel, grace, morrow, seeds, seedOne, foretold, dancePair, burst, sprout, recall, everyName, digHole, floorCall, callThree, doomAt, doomGlow, doomLand, lanternOn, passOne, passTwo, passThree, passFour, twinRead, giveCharges, pillarSpots, tithe4, dancePts, wheelPlan, webTwo, glassPatch, lastFlame: () => f.bossFell() };
  },
};

if (typeof module !== 'undefined') module.exports = { SOVEREIGN };
