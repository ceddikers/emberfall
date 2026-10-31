// Boss III: Volkar, the Storm Titan — "The Summit". The storm front.
// One authored storm, the same on every pull: a steady crescendo, a short calm eye, then it all comes back. The question he
// keeps asking: who do I pair with, and where's cover? Everyone carries + or − all fight (polarity is the spine; the plan and
// the answers to the design questions are in docs/plans/rework-volkar.md).
//   The Front (100% → 55%): the gaps tighten from ~15 s to ~8 s. Thunderclap, Titan Fist, Polarity Surge (pair + with −),
//     Thunder Crash → Static Field, then the Squall Line early (the safe circle drifts round him for 30 s and the party walks
//     with it, a Static Field and a Surge landing inside it), Rod Strike (bring your bolt down on a stone), Gale Slam, Storm
//     Walls (Normal: a Surge lands in them), Lightning Rods + Gale (shelter behind your rod), Avalanche → Storm Walls (behind
//     a boulder), Surge and Crash at once.
//   The Eye (55%, ~20 s): the wind drops and the Pulse stops; he stays targetable. Still Air: the four stones light up,
//     two + and two −. When the Eye closes, be at a stone of your own charge.
//   The Back of the Storm (55% → 15%): the Front again, mirrored and doubled, while the electrified edge closes in (Normal), with
//     a second Squall Line (a Thunder Crash lands in it on Normal). Hard splits it in time: the first half is the doubled front
//     (rods with Gale Slam, Avalanche into Walls, Ball Lightning, Rod Strike, Gathering Storm); the second half is the summit
//     breaking away, wedge by wedge, with no Gale Slam to throw anyone at a wedge about to go.
//   Heavens Fall (15% → 0%): the summit closes to its last ring and the sky comes down on set spots round him; the whole
//     party holds each one up together, both charges in it, until the Twin Fall splits the sky in two: a gold and a blue
//     hold each column. Each is a little harder after the fifth, until he falls or calls Skybreak. (Hard: each Heavens Fall breaks
//     over the summit as it lands and marks everyone: hold it up together, then scatter apart.)
//     Hard: the Storm Unbound. A slow dread (the sky blackens, the stone groans, thunder comes nearer, then a dead calm), then his body
//     breaks apart into the storm (a raidwide as it bursts) and three bolts pour into the heart, each healing a bar (he heals three bars; out of reach until then), and he
//     rises over the summit as a huge face in the clouds with lightning arms (the second form, f.setForm 'storm'). What the party hits
//     from then on is the STORM HEART, the crackling core where his body stood: the same boss entity at the same spot (health, threat,
//     melee and ranged reach, the boss bar), only the face above is show and the source of every attack. Heavens Fall and Twin Fall go
//     on, now falling from the face, with three new moves in a fixed order: Storm Arm (an arm slams down on the tank), Crossing Arms
//     (arms rake the summit along lines through where players stand, a second line shown as the first lands) and Reaching Arms (an
//     arm of each charge comes down; one person of that charge must stand in each).
//   Gathering Storm (in the back half): a heal check. Static ticks on everyone every 1.5 s for 12 s, then one
//     Thunderhead: more than a whole health bar each in all, so it has to be healed through as it lands.
// The storm's Pulse hits everyone every 4 s, a twentieth harder each minute. A slow party runs each part's last set again,
// +10% each pass (f.course in fight.js). Every telegraph shows on the floor on every difficulty.
// Hard: casts 15% faster, 25% more damage; the charges flip as the Eye opens; three rods and three walls; Titan Fist
// leaves the tank Conductive; Chain Lightning on the healer as Titan Fist lands on the tank (once in the Front, once in the
// breaking); the summit breaks away a wedge at a time late in the back half (a fall hurts and holds you only a moment); the
// Twin Fall's second pair of columns (3.4 s behind the first) and the scatter after each Heavens Fall; and his moves: Chain Lightning, Ball Lightning, Skyfall (one, in the Front).
// The summit's four standing stones are solid, and Rod Strike and Still Air use them.
// Hard's dance, in the Front (in place of the first Rods + Gale): Grounding Rods (the + players plant them), Supercell
// (three squall fronts march past them; the cells past a rod stay dry), then a Thunderclap.
// Static Lash (the tank's lighter beat, between the Fists; Normal and Hard): a rope of lightning flung down the line to the tank, shown for
// the whole cast; it follows them and fixes a moment before it lands, so the tank steps out sideways (or takes it), and nobody stands
// behind the tank on that line. Hard casts it quicker and fixes it sooner. It sits in units like the Fists, so any Hard order keeps it.
// Beats for the tank and the healer (2026-10-26 pass): the script is laid out in units (U / lay below), each a few steps that belong
// together, with real moves only (a full Titan Fist about every 30 to 40 s for the tank; a Thunderclap, Crash, Static Field, Surge,
// Chain Lightning, the Gathering Storm or a Fall for the healer) and no step starting a cast while the one before is still on the bar
// (except the pairs the fight always had). Hard lays its units in a fresh order every pull in the Front (after the Squall Line and the
// first Rod Strike), in both halves of the Back and in the middle of the finale; each unit carries its own beats, so any order keeps
// the gaps. Hard's Pulse is 330 (Normal 300) and its Clap, Fist, Thunderhead and Heavens Fall hit about 15 percent harder than Normal's.

const VOLKAR = {
  id: 'volkar', name: 'Volkar', title: 'The Storm Titan',
  normalDmg: 1.08,   // (Normal's damage multiplier, fight.js default 1; 2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven))
  hp: { normal: 4220000, hard: 3840000 },   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 3800000 / 3400000; Hard 4.6M before 2026-10-27; 4.4M until the Storm Unbound healed three bars, 2026-10-28)
  hardDmg: 1.23,   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 1.06; 1.02 until the heal: 96 runs HUMAN=dps GEAR=mid about 30% a pull, mean clear 556 s of 607; perfect bots 69%; Hard's damage multiplier, fight.js default 1.25, tuned for a human party rather than perfect bots, CLAUDE.md)
  autoDmg: { normal: 1450, hard: 1550 },
  enrage: { normal: 592, hard: 607 },   // the cast starts here and lands 8 s later (10:00 / 10:15)
  enrageName: 'Skybreak',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'peak' },
  gates: [0.55, 0.15],   // where the movements change (ticks on the boss bar; fight.js course)
  // Hard's second form (fight.js setForm 'storm', room 'volkar:storm' in shapes.js): from Heavens Fall he is a face in the clouds and the
  // party hits his Storm Heart (the same boss entity, in the middle). The bar shows the form's name and title (raid-ui.js reads forms).
  forms: { storm: { name: 'The Storm Heart', title: 'Volkar, Unbound' } },

  // four standing stones on the summit, at the cardinal points (clear of where the party stands round him)
  room(f) {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      f.addProp({ kind: 'stone', x: Math.round(Math.cos(a) * 260), y: Math.round(Math.sin(a) * 260), r: 30, solid: true, cover: false, state: 0 });
    }
  },

  script(f) {
    const H = f.hard;
    const B = f.boss;
    const TAU = Math.PI * 2;
    const dmg = {
      clap: H ? 8600 : 7450, fist: H ? 26500 : 23000, surgeAlone: H ? 10800 : 9800, surgeSame: H ? 19100 : 17250, surgePair: H ? 2500 : 2300,
      lash: H ? 9000 : 7800,
      storm: H ? 2100 : 1850, thunderhead: H ? 6700 : 5750,
      crash: H ? 16500 : 14950, field: H ? 7000 : 6300, rod: H ? 6400 : 5750, rodAgain: H ? 15300 : 13800, rodFail: H ? 15300 : 13800, slam: H ? 11400 : 10350, wall: H ? 12100 : 12650, edge: H ? 15300 : 13800, pulse: H ? 330 : 300,
      chain: H ? 8900 : 8050, orb: H ? 15300 : 13800, skyfall: H ? 45800 : 41400,
      strike: H ? 11400 : 9200, strikeOpen: H ? 22900 : 17250, discharge: H ? 15300 : 13800, grounded: H ? 11400 : 10350, boulder: H ? 15300 : 12650, fall: H ? 19100 : 17250,
      squall: H ? 7600 : 6900, still: H ? 11400 : 10350, stillWrong: H ? 15300 : 13800, heavens: H ? 37000 : 32200, front: H ? 9500 : 8650,
      // the Storm Unbound's moves (Hard only; tuned 2026-10-28 so a human-like party clears Hard about a third of its pulls: 144 runs over three seed sets)
      burst: 15000, armSlam: 36000, cross: 27000, armFail: 24000, armWrong: 28000, armSoak: 6000,
    };
    const S = (...steps) => steps.filter(Boolean);
    const room = f.room = { squall: null, eye: false };
    const STONE_REACH = 70;  // how near a stone (from its face) a marked player stands to bring the bolt down on it
    const DISCHARGE = 180;   // how far a stone's discharge reaches
    const GROUND = 250;      // Grounded (Hard): how far it leaps on
    const WEDGE = Math.PI * 2 / 5, CUT_R = 310;   // Crumbling Summit (Hard): five wedges, each leaving the floor 310 out
    const PAIR = 150;        // how close a polarity partner has to stand
    const ROD_R = 70;        // a rod's catch circle
    const GALE = 300;        // how far Gale Slam throws you
    const COVER_W = 46;      // half the width of the still air behind a rod
    const CHAIN = 300;       // how far Chain Lightning leaps
    const RINGS = [470, 400, 330];

    // shared with the bots and the host's view (raid-host.js)
    f.polarity = new Map(); f.posts = []; f.edgeNext = null; f.pendingCut = null;
    // how far the floor reaches along angle a, counting the closing edge and a wedge about to break
    const inArc = (a, c) => { let d = a - c.a0; d -= Math.floor(d / TAU) * TAU; return d <= c.a1 - c.a0; };
    const roomAt = a => {
      let r = Math.min(f.edgeNext ? f.edgeNext.r : ARENA.r, ARENA.radiusAt(a));
      if (f.pendingCut && inArc(a, f.pendingCut)) r = Math.min(r, f.pendingCut.r);
      return r;
    };
    const stones = () => f.props.filter(pr => pr.kind === 'stone');
    const charge = id => f.polarity.get(id) || 1;
    const sendPolarity = flip => f.emit({ t: 'pol', m: [...f.polarity].map(([id, s]) => [id, s]), flip: flip ? 1 : 0 });

    // --- building blocks ------------------------------------------------------------------
    // half the party +, half −, shuffled (the dead keep theirs for when they're raised)
    const assignPolarity = () => {
      f.shuffle(f.players()).forEach((p, i) => f.polarity.set(p.id, i % 2 ? -1 : 1));
      sendPolarity(false);
    };
    const flipPolarity = () => { for (const [id, s] of f.polarity) f.polarity.set(id, -s); sendPolarity(true); };

    const thunderclap = () => {
      f.cast('Thunderclap', f.ct(4), 'clap');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(4), dmg: dmg.clap, hidden: true, tag: 'clap' });
    };

    const titanFist = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.5);
      f.cast('Titan Fist', d, 'fist');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 1.3, angle: B.facing }, delay: d,
        dmg: dmg.fist, target: tank.id, aimFromBoss: tank.id, tag: 'buster',
        onResolve: () => { if (H) f.debuff(tank.id, 'conductive', 20); } });
    };

    // Static Lash (the tank's lighter beat, between the Fists): a rope of lightning flung down the line to the tank. It follows them, then
    // fixes with a moment to spare (LASH_LOCK): step out of the lane sideways, or take it with a mitigation. Anyone standing in the lane
    // takes it too, so nobody stands behind the tank. Hard: cast quicker and fixed sooner (a polarity fork to the tank's own charge was
    // tried and cost the bots about 20 points of Hard clears, so it is not in).
    const LASH_LOCK = H ? 1.0 : 1.4;
    const lash = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(3.2);
      f.cast('Static Lash', d, 'chain');
      f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tank.y - B.y, tank.x - B.x), len: 640, w: 100 }, delay: d, dmg: dmg.lash,
        tag: 'lash', aimFromBoss: tank.id, lockAt: LASH_LOCK });
    };

    // Polarity Surge: same charges together arc; opposite charges together cancel out; alone takes it all
    const surge = () => {
      const d = f.ct(6);
      f.cast('Polarity Surge', d, 'surge');
      f.mech({ type: 'polarity', shape: { kind: 'circle', x: 0, y: 0, r: PAIR }, delay: d, dmg: 0, tag: 'surge', avoidable: false,
        onResolve: () => {
          const al = f.alive();
          for (const p of al) {
            const near = al.filter(o => o.id !== p.id && Math.hypot(o.x - p.x, o.y - p.y) <= PAIR);
            if (near.some(o => charge(o.id) === charge(p.id))) f.damagePlayer(p, dmg.surgeSame, { kind: 'arc', avoidable: true, ddown: true });
            else if (near.length) f.damagePlayer(p, dmg.surgePair, { kind: 'surge' });
            else f.damagePlayer(p, dmg.surgeAlone, { kind: 'surge' });
          }
        } });
      return d;
    };
    // pair, then split at once: a Surge wants a partner within 150, and the Static Field that follows wants everyone 115 apart, so for a
    // moment the partner stands in the one ring of ground (115 to 150 away) that answers both (the field shows once the Surge has landed)
    const surgeField = () => { const d = surge(); f.afterKeep(d + 0.1, () => field(H ? 2.8 : 3.4, true, H ? 0.55 : 0.55)); };

    // Thunder Crash: a stack on every + player, so pairs stack together and keep apart from the other pair
    const crash = (d = f.ct(5.5)) => {
      const al = f.alive();
      const owners = al.filter(p => charge(p.id) > 0);
      f.cast('Thunder Crash', d, 'crash');
      for (const p of (owners.length ? owners : al.slice(0, 1))) {
        f.mech({ type: 'stack', shape: { kind: 'circle', x: p.x, y: p.y, r: 110 }, delay: d, dmg: dmg.crash, follow: p.id, need: 2, tag: 'crash' });
      }
      return d;
    };
    // Static Field: everyone spreads
    const field = (d = f.ct(5), noCast, mult = 1) => {
      if (noCast) f.anim('field', d); else f.cast('Static Field', d, 'field');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.field * mult, follow: p.id, tag: 'static', ddown: true });
    };
    // stack in pairs, then scatter (Normal leaves a moment to heal in between)
    const crashField = () => { const d = crash(); f.afterKeep(d + 0.1, () => (H ? field(3.3, true, 0.55) : field(3.8, true, 0.6))); };

    // Lightning Rods, and the posts they leave behind
    const post = (x, y, dur = 30) => {
      const id = f.nextMechId++;
      f.posts.push({ id, x, y, end: f.t + dur });
      f.emit({ t: 'post', id, x: Math.round(x), y: Math.round(y), dur });
    };
    const rods = (a0 = 0, n = H ? 3 : 2, d = f.ct(8)) => {
      n = Math.min(n, Math.max(1, f.alive().length));
      f.cast('Lightning Rods', f.ct(3), 'rods');
      for (let i = 0; i < n; i++) {
        let a = a0 + i * TAU / n;
        // not on top of a standing stone
        for (const st of stones()) { let d = a - Math.atan2(st.y, st.x); d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 0.36) a += Math.sign(d || 1) * (0.36 - Math.abs(d)); }
        const r = Math.max(150, (roomAt(a) - 110) * 0.75);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: ROD_R }, delay: d, dmg: dmg.rod, failDmg: dmg.rodFail, need: 1, tag: 'rod',
          onResolve: inside => {
            for (const p of inside) {
              if (f.hasDebuff(p.id, 'conductive')) f.damagePlayer(p, dmg.rodAgain, { kind: 'conductive' });
              f.debuff(p.id, 'conductive', 32);
            }
            post(x, y);
          } });
      }
      return d;
    };
    // still air: anything standing (posts, and rods waiting for their bolt) shelters whoever is right behind it
    const covers = () => {
      f.posts = f.posts.filter(c => c.end > f.t);
      const out = f.posts.map(c => ({ x: c.x, y: c.y }));
      for (const m of f.mechs.values()) if (m.tag === 'rod') out.push({ x: m.shape.x, y: m.shape.y });
      return out;
    };
    const shelterOf = p => covers().find(c => {
      const cx = c.x - B.x, cy = c.y - B.y, cd = Math.hypot(cx, cy);
      if (cd < 1) return false;
      const ux = cx / cd, uy = cy / cd, px = p.x - B.x, py = p.y - B.y;
      return px * ux + py * uy >= cd - 30 && Math.abs(-px * uy + py * ux) <= COVER_W;
    });
    const sheltered = p => !!shelterOf(p);

    // off the edge where the summit has broken away (Hard): heavy damage, and held a moment while the wind drags you back up
    const fall = p => {
      f.damagePlayer(p, dmg.fall, { kind: 'fall', avoidable: true });
      f.debuff(p.id, 'rooted', 2.5);
      f.emit({ t: 'propfx', k: 'fall', x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
    };
    // Gale Slam: everyone is thrown away from him, except whoever stands behind a rod. Thrown into the wall, or into a
    // standing stone, hurts and dazes you; thrown off a broken edge (Hard) is a fall.
    const galeSlam = (d = f.ct(5)) => {
      f.cast('Gale Slam', d, 'gale');
      f.mech({ type: 'gale', shape: { kind: 'circle', x: B.x, y: B.y, r: 120 }, delay: d, dmg: 0, dist: GALE, tag: 'gale', avoidable: false,
        onResolve: () => {
          for (const p of f.alive()) {
            const lee = shelterOf(p);
            if (lee) { f.emit({ t: 'propfx', k: 'lee', x: Math.round(lee.x), y: Math.round(lee.y), pid: p.id }); continue; }   // (the wind parts round the rod: a beat to show it)
            const res = f.knock(p, B.x, B.y, GALE);
            if (!res.slam) continue;
            const a = Math.atan2(res.dest.y, res.dest.x);
            if (!res.prop && ARENA.cuts.length && ARENA.radiusAt(a) < ARENA.r - 1) { fall(p); continue; }
            f.damagePlayer(p, dmg.slam, { kind: 'slam', avoidable: true });
            f.debuff(p.id, 'rooted', 1.2);
            f.emit({ t: 'propfx', k: 'slam', x: Math.round(res.dest.x), y: Math.round(res.dest.y), a: +Math.atan2(p.y - B.y, p.x - B.x).toFixed(2), id: res.prop ? res.prop.id : null, pid: p.id });
          }
        } });
    };

    // Rod Strike: marked players bring the bolt down on the stone nearest them, if they stand at it. A stone struck
    // twice within 10 s discharges into everyone near it (Hard, Grounded: and leaps to the nearest player beyond).
    const struck = new Map();   // stone id -> when it last caught a bolt
    const strikeAt = p => {
      let st = null, sd = Infinity;
      for (const s of stones()) { const d = PROPS.sd(s, p.x, p.y); if (d < sd) { sd = d; st = s; } }
      if (!st || sd > STONE_REACH) {
        f.emit({ t: 'propfx', k: 'bolt', x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
        f.damagePlayer(p, dmg.strikeOpen, { kind: 'strike', avoidable: true, eat: 'lance' });   // (a Gorgemaw can swallow the bolt)
        return;
      }
      f.emit({ t: 'propfx', k: 'bolt', kind: 'stone', id: st.id, x: st.x, y: st.y });
      for (const q of f.alive()) if (PROPS.sd(st, q.x, q.y) <= STONE_REACH) f.damagePlayer(q, dmg.strike, { kind: 'strike' });
      if (struck.get(st.id) > f.t - 10) {
        // already charged: it discharges
        struck.delete(st.id); f.setPropState(st, 0);
        f.emit({ t: 'propfx', k: 'discharge', kind: 'stone', id: st.id, x: st.x, y: st.y, r: DISCHARGE });
        const near = f.alive().filter(q => Math.hypot(q.x - st.x, q.y - st.y) <= DISCHARGE);
        for (const q of near) f.damagePlayer(q, dmg.discharge, { kind: 'discharge', avoidable: true });
        if (H) {
          let to = null, td = GROUND;
          for (const q of f.alive()) { if (near.includes(q)) continue; const d = Math.hypot(q.x - st.x, q.y - st.y); if (d < td) { td = d; to = q; } }
          if (to) { f.damagePlayer(to, dmg.grounded, { kind: 'grounded', avoidable: true }); f.emit({ t: 'propfx', k: 'arc', x: st.x, y: st.y, pid: to.id }); }
        }
        return;
      }
      const at = f.t;
      struck.set(st.id, at); f.setPropState(st, 1);
      f.afterKeep(10, () => { if (struck.get(st.id) === at) { struck.delete(st.id); f.setPropState(st, 0); } });
    };
    const rodStrike = () => {
      const d1 = f.ct(6), d2 = f.ct(5);
      const order = f.shuffle(f.alive()), first = order.slice(0, 2), second = order.slice(2, 4);
      const mark = (ps, d) => {
        if (!ps.length) return;
        f.cast('Rod Strike', d, 'rods');
        f.emit({ t: 'roomev', k: 'rodmark', ids: ps.map(p => p.id), dur: d });
        for (const p of ps) f.mech({ type: 'rodstrike', shape: { kind: 'circle', x: p.x, y: p.y, r: STONE_REACH }, delay: d, dmg: 0, follow: p.id, tag: 'rodstrike', avoidable: false,
          onResolve: () => { const q = f.alive().find(o => o.id === p.id); if (q) strikeAt(q); } });
      };
      mark(first, d1);
      f.afterKeep(d1 + 0.1, () => mark(f.alive().filter(p => second.some(q => q.id === p.id)), d2));
    };

    // Avalanche: he stamps, and boulders roll in from one side of the summit in lanes, coming to rest past the middle
    const avalanche = (th = 0) => {
      const d = f.ct(3.5);
      f.cast('Avalanche', d, 'avalanche');
      const c = Math.cos(th), s = Math.sin(th), nx = -s, ny = c;
      const k = Math.min(1, (f.edgeNext ? f.edgeNext.r : ARENA.r) / 540);
      const offs = (H ? [-300, -150, 150, 300] : [-300, -150, 300]);
      for (const o0 of offs) {
        const o = o0 * k;
        const R = (f.edgeNext ? f.edgeNext.r : ARENA.r) + 60, E = Math.sqrt(Math.max(0, R * R - o * o));   // in from past the edge
        let along = 100 * k;
        const restAt = () => ({ x: c * along + nx * o, y: s * along + ny * o });
        let rest = restAt();
        for (let tries = 0; tries < 4 && f.props.some(pr => Math.hypot(pr.x - rest.x, pr.y - rest.y) < (pr.r || 30) + 50); tries++) { along += 70; rest = restAt(); }
        ARENA.clamp(rest, 80);
        if (f.pendingCut) { const a = Math.atan2(rest.y, rest.x); if (inArc(a, f.pendingCut) && Math.hypot(rest.x, rest.y) > f.pendingCut.r - 80) continue; }
        const sx = -c * E + nx * o, sy = -s * E + ny * o, len = Math.hypot(rest.x - sx, rest.y - sy) + 40;
        f.mech({ type: 'aoe', shape: { kind: 'rect', x: sx, y: sy, angle: th, len, w: 100 }, delay: d, dmg: dmg.boulder, tag: 'avalanche',
          rest: { x: Math.round(rest.x), y: Math.round(rest.y) },
          onResolve: inside => {
            for (const p of inside) {
              const side = (p.x - sx) * nx + (p.y - sy) * ny >= 0 ? 1 : -1;   // thrown off the lane, to their own side
              f.knock(p, p.x - nx * side * 30, p.y - ny * side * 30, 110);
            }
            f.addProp({ kind: 'boulder', x: Math.round(rest.x), y: Math.round(rest.y), r: 40, hp: 1, solid: true, cover: true });
          } });
      }
    };

    // Crumbling Summit (Hard, phase 2): a wedge of the peak cracks, then breaks away for good
    const crumble = (a0, warn = 6) => {
      const cut = { a0: +a0.toFixed(3), a1: +(a0 + WEDGE).toFixed(3), r: CUT_R, at: f.t + warn };
      f.pendingCut = cut;
      f.emit({ t: 'roomev', k: 'crumble', a0: cut.a0, a1: cut.a1, r: CUT_R, dur: warn });
      f.afterKeep(warn, () => {
        for (const p of f.alive()) if (inArc(Math.atan2(p.y, p.x), cut) && Math.hypot(p.x, p.y) > CUT_R - 14) fall(p);
        ARENA.cuts.push({ a0: cut.a0, a1: cut.a1, r: CUT_R });
        f.addFloor({ kind: 'wedge', a0: cut.a0, a1: cut.a1, r: CUT_R });
        f.emit({ t: 'propfx', k: 'crumble', a0: cut.a0, a1: cut.a1, r: CUT_R });
        for (const pr of [...f.props]) if (ARENA.sd(pr.x, pr.y) > -pr.r) f.breakProp(pr, 'fall');
        f.posts = f.posts.filter(c => ARENA.sd(c.x, c.y) < -30);
        if (f.pendingCut === cut) f.pendingCut = null;
      });
    };
    // rods, then the gale once they stand (Hard: both at once, so you shelter behind the rod you're catching)
    const rodsGale = (a0 = 0) => {
      if (H) { const d = rods(a0); f.after(0.01, () => galeSlam(d - 0.01)); }
      else { rods(a0); f.after(f.ct(5), () => galeSlam()); }
    };

    const stormWalls = (a0 = 0, dir = 1) => {
      const d = f.ct(3);
      f.cast('Storm Walls', d, 'walls');
      f.sweep({ x: B.x, y: B.y, arms: H ? 3 : 2, a0, spin: dir * (H ? 0.56 : 0.5),
        w: 150, delay: d, dur: H ? 12 : 10, dmg: dmg.wall, tag: 'storm', cover: 'boulder' });   // boulders shelter, once
    };

    // the storm's light: constant damage on everyone, a twentieth stronger every minute; it stops in the Eye
    const pulse = () => {
      if (f.state !== 'live') return;
      const k = 1 + 0.05 * Math.floor(f.t / 60);
      if (!room.eye && !room.hush) {   // (it stops in the Eye, and in the dead calm before the Storm Unbound bursts)
        f.emit({ t: 'pulse', k: +k.toFixed(2) });
        for (const p of f.alive()) f.damagePlayer(p, dmg.pulse * k, { kind: 'pulse' });
      }
      f.afterKeep(4, pulse);
    };

    // the electrified edge closes in: sparks mark the new wall, then it jumps there
    const edgeStep = (r, warn = 5) => {
      f.edgeNext = { r, at: f.t + warn };
      f.emit({ t: 'edgewarn', r, dur: warn });
      f.afterKeep(warn, () => {
        for (const p of f.alive()) if (Math.hypot(p.x - 0, p.y - 0) > r - 16) f.damagePlayer(p, dmg.edge, { kind: 'edge', avoidable: true });
        ARENA.resize(r);
        f.edgeGrace = f.t + 2.5; f.edgeNext = null;
        f.posts = f.posts.filter(c => Math.hypot(c.x, c.y) < r - 30);
        for (const pr of [...f.props]) if (Math.hypot(pr.x, pr.y) > r - pr.r) f.breakProp(pr, 'storm');
        f.emit({ t: 'edge', r });
      });
    };

    // --- Hard only ------------------------------------------------------------------------------
    // Chain Lightning: a bolt gathers over one player. It strikes them, then leaps to the nearest player within CHAIN of
    // the last one struck, up to three more times. Keep your distance from them, and from each other.
    const chainLightning = (role = null) => {
      const d = f.ct(6);
      const pool = f.nonTanks().length ? f.nonTanks() : f.alive();
      const target = (role && pool.find(p => p.role === role)) || f.pick(pool);
      if (!target) return;
      f.cast('Chain Lightning', d, 'chain');
      const cm = f.mech({ type: 'chain', shape: { kind: 'circle', x: target.x, y: target.y, r: CHAIN }, delay: d, dmg: 0, follow: target.id, tag: 'chain', avoidable: false,
        onResolve: () => {
          let from = f.alive().find(p => p.id === target.id);
          const struck = new Set(), path = [];
          for (let jump = 0; from && jump < 4; jump++) {
            struck.add(from.id); path.push(from.id);
            // (a Gorgemaw with its jaw open swallows the bolt: the chain ends in its mouth)
            const ate = f.canEat && f.canEat(from);
            f.damagePlayer(from, dmg.chain, { kind: 'chain', avoidable: jump > 0 && !ate, ddown: true, eat: 'lance', mid: cm && cm.id });
            if (ate) break;
            let next = null, nd = CHAIN + 14;
            for (const p of f.alive()) { if (struck.has(p.id)) continue; const dd = Math.hypot(p.x - from.x, p.y - from.y); if (dd < nd) { nd = dd; next = p; } }
            from = next;
          }
          f.emit({ t: 'chain', ids: path });
        } });
    };
    // Ball Lightning: orbs gather at the edge of the peak, then drift slowly across it. Touch one and it bursts.
    const ballLightning = (a0 = 0, cast = true) => {
      const d = f.ct(3);
      if (cast) f.cast('Ball Lightning', d, 'orbs');
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n, R = roomAt(a) - 50;
        const dir = a + Math.PI + (i % 2 ? 0.35 : -0.35);
        f.rollerPreview({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: dir, speed: 135, r: 40, delay: d - 1.2 + i * 0.4 + 2.2, tag: 'orb' });   // (visual only: the lane shows from the cast start)
        f.afterKeep(d - 1.2 + i * 0.4, () => f.roller({ x: Math.cos(a) * R, y: Math.sin(a) * R, angle: dir, speed: 135, delay: 2.2, dmg: dmg.orb, r: 40, kb: 120, tag: 'orb' }));
      }
    };
    // Skyfall: the sky falls on where a player stood when he called it; the nearer you are, the harder it hits
    const skyfall = () => {
      const d = f.ct(6);
      const p = f.pick(f.alive());
      if (!p) return;
      f.cast('Skyfall', d, 'skyfall');
      const at = ARENA.clamp({ x: p.x, y: p.y }, 80);
      f.mech({ type: 'proximity', shape: { kind: 'circle', x: at.x, y: at.y, r: 260 }, delay: d, dmg: dmg.skyfall, falloff: 520, tag: 'skyfall' });
    };

    // --- Squall Line: the safe circle drifts round him ---------------------------------------------
    // The electrified edge closes in on one side and opens on the other, so the safe circle (radius R, its centre D
    // from him) orbits him once over `dur` seconds. He's always inside it. Outside: a jolt every second. Clients get one
    // message and move it on their own clock; the circle shows from the cast, with a ghost of where it's going.
    // (the quiet circle also draws in over the last of the walk: from the middle of the run it narrows from R to R1, shown by the red edge
    // closing on it; the client draws the same curve from the same two numbers)
    const squallR = (q, t) => q.R - (q.R - q.R1) * Math.max(0, Math.min(1, ((t - q.start) / q.dur - 0.35) / 0.65));
    const squallAt = (q, t) => { const a = q.a0 + q.dir * TAU * Math.max(0, Math.min(1, (t - q.start) / q.dur)); return { x: Math.cos(a) * q.D, y: Math.sin(a) * q.D }; };
    const squall = (dir, a0, R, D, dur = 30, R1 = R) => {
      const d = f.ct(4);
      f.cast('Squall Line', d, 'storm');
      const q = { dir, a0, R, R1, D, dur, start: f.t + d, end: f.t + d + dur, last: {} };
      room.squall = q;
      f.emit({ t: 'roomev', k: 'squall', dir, a0: +a0.toFixed(3), R, R1, D, sdur: dur, at: d, dur: d + dur });
    };
    f.ticker(() => {
      const q = room.squall;
      if (!q || f.t < q.start) return;
      if (f.t > q.end) { room.squall = null; return; }
      const c = squallAt(q, f.t);
      for (const p of f.alive()) {
        if (Math.hypot(p.x - c.x, p.y - c.y) <= squallR(q, f.t) - 10 || f.t - (q.last[p.id] ?? -9) < 1) continue;
        q.last[p.id] = f.t;
        f.damagePlayer(p, dmg.squall, { kind: 'edge', avoidable: true, noVuln: true });
      }
    });
    room.inSquall = (x, y, t, pad = 0) => { const q = room.squall; if (!q || t < q.start - 1 || t > q.end) return true; const c = squallAt(q, t); return Math.hypot(x - c.x, y - c.y) <= squallR(q, t) - pad; };

    // --- Supercell (Hard, the Front): the party plants the rods, and the storm fronts march past them ---------------
    // Grounding Rods: an iron rod hangs over each + player; where they stand when it comes down, it's driven into the
    // rock (a post: it stands to the end of the set). Then Supercell: three
    // squall fronts march across the summit in a fixed order every pull, a wall of lightning a cell at a time (cells
    // CELL across, on one grid round him): from the west (marching east), then the north (marching south), then the east
    // (marching west), each starting before the last has finished. A front's bolt runs along each row (or column) of
    // cells until it strikes a rod; it strikes the rod's own cell, then goes to ground, so every cell past a rod, on
    // the far side from where the front comes, stays dry: a lane of still air (drawn blue while its front passes).
    // The dance: in the lane east of a rod for the first front, south of it for the second, west of it for the third:
    // round your rod with your partner. The thinking is where the rods go: planted in the row through him, a cell
    // either side, the first and last lanes run past his flanks and the middle ones down beside him, so nobody leaves
    // him; planted anywhere else the lanes run off to the edge. As the last front passes the cell breaks over the
    // whole summit (a Thunderclap).
    const CELL = 135, FRONT_STEP = 0.5, FRONT_N = 9;
    let rodsDown = [];
    const groundingRods = () => {
      const d = f.ct(4.5), al = f.alive(), plus = al.filter(p => charge(p.id) > 0);
      f.cast('Grounding Rods', d, 'rods');
      rodsDown = [];
      for (const p of (plus.length ? plus : al).slice(0, 2)) {
        const m = f.mech({ type: 'drop', shape: { kind: 'circle', x: p.x, y: p.y, r: 60 }, delay: d, dmg: 0, follow: p.id, tag: 'groundrod', avoidable: false,
          onResolve: () => { const at = ARENA.clamp({ x: m.shape.x, y: m.shape.y }, 40); rodsDown.push(at); post(at.x, at.y, 18); } });
      }
    };
    // the fronts: { axis, dir, at } — axis 'x' marches along x (a column of cells at a time), 'y' along y
    const FRONTS = [{ axis: 'x', dir: 1, at: 0 }, { axis: 'y', dir: 1, at: 3 }, { axis: 'x', dir: -1, at: 6.5 }];
    const supercell = () => {
      const d = f.ct(3), R = ARENA.r;
      f.cast('Supercell', d, 'storm');
      const rods = rodsDown.map(r => ({ x: r.x, y: r.y, c: Math.round(r.x / CELL), r: Math.round(r.y / CELL) }));
      const H2 = CELL / 2, reach = v => Math.sqrt(Math.max(0, R * R - Math.max(0, Math.abs(v) - H2) ** 2));   // how far a strip at v runs
      FRONTS.forEach((fr, fi) => {
        const group = new Set(), along = fr.axis;   // one hit a front at most
        // each front is laid (drawn) a little before it starts, so the three read as three waves, not one lattice
        const show = Math.max(0, d + fr.at - 2.5), last = d + fr.at + (FRONT_N - 1) * FRONT_STEP;
        f.afterKeep(show, () => { for (let k = 0; k < FRONT_N; k++) {
          const i = fr.dir > 0 ? k - 4 : 4 - k, at = d + fr.at + k * FRONT_STEP - show;
          // rows (or columns) a rod has already grounded: past the rod, on the far side from where the front came
          const cut = new Set(rods.filter(rd => (along === 'x' ? (fr.dir > 0 ? rd.c < i : rd.c > i) : rd.r < i)).map(rd => (along === 'x' ? rd.r : rd.c)));
          const lim = reach(i * CELL);
          let j0 = null;
          for (let j = -4; j <= 5; j++) {
            const open = j <= 4 && !cut.has(j) && Math.abs(j * CELL) - H2 < lim;
            if (open && j0 == null) j0 = j;
            if (!open && j0 != null) {
              const a = Math.max((j0 - 0.5) * CELL, -lim), b = Math.min((j - 0.5) * CELL, lim);
              const shape = along === 'x' ? { kind: 'rect', x: i * CELL, y: a, angle: Math.PI / 2, len: b - a, w: CELL }
                : { kind: 'rect', x: a, y: i * CELL, angle: 0, len: b - a, w: CELL };
              f.aoe(shape, at, dmg.front, { tag: 'squallcell', group });
              j0 = null;
            }
          }
          // a rod in this file takes the bolt
          for (const rd of rods) if ((along === 'x' ? rd.c : rd.r) === i) f.afterKeep(at, () => f.emit({ t: 'propfx', k: 'bolt', kind: 'post', x: Math.round(rd.x), y: Math.round(rd.y) }));
        } });
        // the still air behind each rod, shown blue while its front passes (laid with the front)
        for (const rd of rods) {
          const shape = along === 'x'
            ? { kind: 'rect', x: (rd.c + 0.5 * fr.dir) * CELL, y: rd.r * CELL, angle: fr.dir > 0 ? 0 : Math.PI, len: R * 2, w: CELL }
            : { kind: 'rect', x: rd.c * CELL, y: (rd.r + 0.5) * CELL, angle: Math.PI / 2, len: R * 2, w: CELL };
          f.afterKeep(show, () => f.mech({ type: 'safe', shape, delay: last - show, dmg: 0, tag: 'stilllane' }));
        }
        void fi;
      });
    };

    // --- The Eye: Still Air ------------------------------------------------------------------------
    // The wind drops and the Pulse stops. The four stones light up, two + (gold) and two − (blue), opposite stones alike.
    // When the Eye closes each lit stone wants one person of its own charge at it: a wrong charge there is struck, and a
    // stone nobody answers discharges across the summit. (Fewer than four alive: only as many stones light.)
    const EYE = 18;   // how long the Eye lasts (from Eye of the Storm to the end of Eye Closes)
    const eyeOpen = () => {
      f.cast('Eye of the Storm', 4, 'storm');
      room.eye = true;
      f.emit({ t: 'roomev', k: 'eye', dur: EYE });
      if (H) f.afterKeep(2, flipPolarity);
    };
    const stillAir = (close = 30) => {
      f.cast('Still Air', 3, 'rods');
      const n = Math.min(4, Math.max(1, f.alive().length)), list = stones().slice(0, 4);
      list.forEach((st, i) => {
        if (i >= n) return;
        const sign = i % 2 ? -1 : 1;
        f.setPropState(st, sign > 0 ? 2 : 3);
        f.mech({ type: 'tower', shape: { kind: 'circle', x: st.x, y: st.y, r: st.r + STONE_REACH }, delay: close, dmg: 0, failDmg: dmg.still, need: 1, tag: 'still', charge: sign, color: sign > 0 ? '#ffd84a' : '#6ab8ff',
          onResolve: inside => {
            f.setPropState(st, 0);
            for (const p of inside) if (charge(p.id) !== sign) { f.damagePlayer(p, dmg.stillWrong, { kind: 'discharge', avoidable: true }); f.emit({ t: 'propfx', k: 'arc', x: st.x, y: st.y, pid: p.id }); }
            f.emit({ t: 'propfx', k: 'discharge', kind: 'stone', id: st.id, x: st.x, y: st.y, r: inside.length ? 60 : DISCHARGE });
          } });
      });
    };
    const eyeCloses = () => {
      f.cast('Eye Closes', 2, 'storm');
      f.afterKeep(2.2, () => { room.eye = false; });
    };

    // --- Heavens Fall: the sky comes down, and everyone holds it up together ----------------------
    // A column of sky on a set spot round him, shown 5 s ahead: the whole party in it splits the blow, and it wants both
    // charges in it (all one charge: it surges through them). Each one lands harder (the closing ramp).
    let fallN = 0;
    const heavensFall = () => {
      const d = f.ct(5), a = fallN++ * Math.PI * 0.75 + Math.PI / 4, at = { x: Math.cos(a) * 140, y: Math.sin(a) * 140 };
      const n = f.alive().length;
      f.cast('Heavens Fall', d, 'skyfall');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: at.x, y: at.y, r: 120 }, delay: d, dmg: dmg.heavens * Math.min(n, 4) / 4, need: n, tag: 'heavens',
        onResolve: inside => {
          const signs = new Set(inside.map(p => charge(p.id))), both = new Set(f.alive().map(p => charge(p.id))).size > 1;
          if (both && inside.length && signs.size < 2) for (const p of inside) f.damagePlayer(p, dmg.surgeSame, { kind: 'arc', avoidable: true });
        } });
      // (Hard: the sky that came down breaks over the summit as it lands: everyone is marked, and the party that held it up scatters)
      if (H && n > 1) f.afterKeep(d + 0.1, () => field(3.3, true, 0.72));
    };

    // Twin Fall: the sky splits in two. Two columns on opposite sides of him, shown 5.5 s ahead; each wants a pair, one gold and one
    // blue (the same rule as the Surge: like charges arc). Hard: a second pair of columns, a quarter-turn round, lands a few seconds
    // after the first, both shown from the start, so the pairs hold one and then run to the next.
    const TWIN = 150;
    const twinCols = (a0, d, base, mul) => {
      const n = f.alive().length;
      [0, 1].forEach(i => {
        const a = a0 + i * Math.PI, need = i ? Math.floor(n / 2) : Math.ceil(n / 2), at = { x: Math.cos(a) * TWIN, y: Math.sin(a) * TWIN };
        f.mech({ type: 'stack', shape: { kind: 'circle', x: at.x, y: at.y, r: 105 }, delay: d, dmg: dmg.heavens * mul * need / 4, need, tag: 'heavens', twin: base + i,
          onResolve: inside => {
            const signs = new Set(inside.map(p => charge(p.id)));
            if (need > 1 && inside.length > 1 && signs.size < 2) for (const p of inside) f.damagePlayer(p, dmg.surgeSame, { kind: 'arc', avoidable: true });
          } });
      });
    };
    const twinFall = () => {
      if (f.alive().length < 2) { heavensFall(); return; }
      const d = f.ct(5.5), a0 = fallN++ * Math.PI * 0.75 + Math.PI / 4 + 0.4;
      f.cast('Twin Fall', d, 'skyfall');
      twinCols(a0, d, 1, 1);
      if (H) twinCols(a0 + Math.PI / 2, d + 3.4, 3, 0.5);
      else twinCols(a0 + Math.PI / 2, d + 4.4, 3, 0.45);   // (Normal: a lighter second pair too, a little later)
    };


    // --- the Storm Unbound (Hard, from Heavens Fall): a face in the clouds, a heart in the middle ------------------------
    // The body breaks apart into the storm and he rises over the summit. The boss entity stays where it was, in the middle: it is now the
    // STORM HEART (a crackling core hanging low over where he stood), so targeting, threat, reach and the boss bar are unchanged; the face
    // overhead is only show, the source of the arms. Client events (the later art): roomev 'volbreak' {dur} (the body cracks and sheds
    // into the storm), roomev 'volrise' {dur} (it bursts apart, the face rises), the room's form 'storm' (fight.js setForm: raid.form),
    // banim 'risen' (the heart is whole again, reachable), and for each arm roomev 'volarm' (below).
    // The change is a slow dread, then a payoff (volkar-storm.js draws it, main.js and sfx-synth.js bm-volkar-storm-* sound it). From the cast
    // (UNB s): the sky blackens over the summit, the stone starts to groan and crack and thunder comes closer, a sound and a flash at a time. HUSH s
    // before the burst the wind dies (roomev 'volhush': the Pulse stops too, an unnatural calm and a beat of near-silence while the stone groans).
    // The body is out of reach from OUT s before the burst. Then it bursts (the raidwide), the form changes and the face rises with its eyes
    // shut. As the eyes open it roars, and three bolts of lightning pour down out of it into the Storm Heart: each fills a bar of its health
    // (STORM_BARS of them, roomev 'volcharge'). Out of reach until the third has landed (the heart is charged and whole: 'risen').
    // The heal is the form's own: the party that got him this low (the bar is stacked bars of raid-ui.js BAR_HP, in these units too) has to do
    // those bars again, and the fight is tuned for it (hp.hard above).
    const UNB = f.ct(11), UNB_HUSH = 3.8, UNB_OUT = 2.0, UNB_FILL = 3.0, UNB_STEP = 0.8, UNB_DONE = 5.4;
    const STORM_BARS = 3, BAR = 10000;
    let storm = false;
    const unbound = () => {
      if (storm) return;
      storm = true;
      const d = UNB;   // (cast d; the burst lands as it ends)
      f.cast('Storm Unbound', d, 'unbound');
      f.emit({ t: 'roomev', k: 'volbreak', dur: +d.toFixed(2) });
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.burst, hidden: true, tag: 'volBurst' });
      f.afterKeep(d - UNB_HUSH, () => { room.hush = true; f.emit({ t: 'roomev', k: 'volhush', dur: +(UNB_HUSH - 0.6).toFixed(2) }); });
      f.afterKeep(d - UNB_OUT, () => { B.untargetable = true; B.lockFacing = true; });
      f.afterKeep(d - 0.6, () => {
        // the form changes as the body bursts (the summit is the same: its broken wedges stay, and the clients are told the floor again)
        const cuts = ARENA.cuts.map(c => ({ a0: c.a0, a1: c.a1, r: c.r }));
        f.setForm('storm');
        for (const c of cuts) ARENA.cuts.push(c);
        f.floorVer++; f.propsDirty = true;
        f.emit({ t: 'roomev', k: 'volrise', dur: 7 });
      });
      f.afterKeep(d, () => {
        room.hush = false;
        f.emit({ t: 'roomev', k: 'volcharge', at: UNB_FILL, every: UNB_STEP, n: STORM_BARS });
      });
      // a bar for each bolt, as it lands (the host's own hp: B.hp is def.hp * NUM_SCALE, capped at the full health)
      for (let i = 0; i < STORM_BARS; i++) f.afterKeep(d + UNB_FILL + i * UNB_STEP, () => { B.hp = Math.min(B.maxHp, B.hp + BAR); });
      f.afterKeep(d + UNB_DONE, () => { B.untargetable = false; B.facing = Math.PI / 2; f.anim('risen', 2); });
    };
    // an arm reaching down, for the art: what 'slam' (on the tank), 'cross' (a raking line, a: its angle) or 'reach' (a tower, sign: its charge);
    // x, y where it comes down (a slam follows the tank: the mech's own follow says so), dur how long until it lands
    const armEv = (what, o) => f.emit(Object.assign({ t: 'roomev', k: 'volarm', what }, o));

    // Storm Arm (the tank's beat in the storm form, in place of Titan Fist): an arm of lightning slams down on the tank. It follows them and
    // fixes a moment before it lands, so the tank can bait it out of the party's way; anyone else in the circle takes a cleave. Conductive, as the Fist.
    const stormArm = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4);
      f.cast('Storm Arm', d, 'arm');
      armEv('slam', { x: Math.round(tank.x), y: Math.round(tank.y), pid: tank.id, dur: +d.toFixed(2) });
      f.mech({ type: 'buster', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 115 }, delay: d, dmg: dmg.armSlam, target: tank.id, follow: tank.id, lockAt: 1.0, tag: 'armslam',
        onResolve: () => { f.debuff(tank.id, 'conductive', 20); } });
    };

    // Crossing Arms: two arms rake the whole summit, each along a line through where a player stands (a line through the middle, the heart's
    // feet, so nobody stays at the heart). The first is shown from the cast; the second, through another player, is shown as the first lands.
    const CROSS_W = 130;
    const crossingArms = () => {
      const d = f.ct(4.5), gap = f.ct(3), R = Math.min(ARENA.R, 360);
      const pool = () => (f.nonTanks().length ? f.nonTanks() : f.alive());
      const p1 = f.pick(pool()); if (!p1) return;
      f.cast('Crossing Arms', d, 'arm');
      const strip = (p, delay) => {
        const a = Math.atan2(p.y - B.y, p.x - B.x), c = Math.cos(a), sn = Math.sin(a);
        armEv('cross', { a: +a.toFixed(3), x: Math.round(B.x), y: Math.round(B.y), dur: +delay.toFixed(2) });
        f.mech({ type: 'aoe', shape: { kind: 'rect', x: Math.round(B.x - c * R), y: Math.round(B.y - sn * R), angle: +a.toFixed(3), len: R * 2, w: CROSS_W }, delay, dmg: dmg.cross, tag: 'armcross' });
      };
      strip(p1, d);
      f.afterKeep(d, () => {
        const rest = pool().filter(p => p.id !== p1.id), p2 = f.pick(rest.length ? rest : pool());
        if (p2) strip(p2, gap);
      });
    };

    // Reaching Arms (polarity): an arm of each charge comes down on opposite sides of the summit, gold and blue. One person of that charge
    // has to stand in each (wrong charge in one is struck; an arm nobody answers discharges across the whole party). Only the charges still alive.
    const ARM_R = 85, ARM_AT = 205;
    const reachingArms = () => {
      const d = f.ct(6), al = f.alive();
      const signs = [1, -1].filter(sg => al.some(p => charge(p.id) === sg));
      if (!signs.length) return;
      const a0 = Math.PI / 4 + Math.floor(f.rng() * 4) * Math.PI / 2 + (f.rng() - 0.5) * 0.4;   // (on the diagonals, clear of the four standing stones)
      if (f.rng() < 0.5) signs.reverse();
      f.cast('Reaching Arms', d, 'arm');
      signs.forEach((sign, i) => {
        const a = a0 + (signs.length > 1 ? i * Math.PI : 0), x = Math.round(Math.cos(a) * ARM_AT), y = Math.round(Math.sin(a) * ARM_AT);
        armEv('reach', { x, y, sign, dur: +d.toFixed(2) });
        f.mech({ type: 'tower', shape: { kind: 'circle', x, y, r: ARM_R }, delay: d, dmg: dmg.armSoak, failDmg: dmg.armFail, need: 1, tag: 'arm', charge: sign, color: sign > 0 ? '#ffd84a' : '#6ab8ff',
          onResolve: inside => { for (const p of inside) if (charge(p.id) !== sign) f.damagePlayer(p, dmg.armWrong, { kind: 'discharge', avoidable: true }); } });
      });
    };

    // --- the storm -----------------------------------------------------------------------------------
    assignPolarity();
    f.afterKeep(6, pulse);
    const AV = 0.7, WALL = 0.4, RODS = 0.3;   // the front comes from here; the back of the storm from the other side
    // A unit is the steps that belong together, [offset, fn, name] from its first step; P is the time from its first step to the next
    // unit's first step. Units are laid end to end (lay), so Hard can shuffle them and the gaps stay as they were.
    // Every unit has work for the healer (a clap, a crash, a check), and about every other one has a Titan Fist for the tank,
    // so neither stands idle for more than about half a minute whatever the order.
    const U = (P, ...steps) => ({ P, steps });
    const lay = (units, lead) => {
      let gap = lead;
      return units.map(u => u.steps.map(([off, fn, name], j) => {
        const d = j === 0 ? gap : off - u.steps[j - 1][0];
        if (j === u.steps.length - 1) gap = u.P - off;
        return [d, fn, name];
      }));
    };
    // Hard: a two-group shuffle, one group with a tank beat and one without, taken in turn
    const weave = (a, b) => { const out = []; for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); } return out; };
    const CLAP = [0, thunderclap, 'Thunderclap'];
    const CLAP_AT = off => [off, thunderclap, 'Thunderclap'];
    const stepFist = off => [off, titanFist, 'Titan Fist'];
    const stepLash = off => [off, lash, 'Static Lash'];
    const stepSurge = off => [off, surge, 'Polarity Surge'];
    const stepField = off => [off, () => field(), 'Static Field'];
    const stepCF = off => [off, crashField, 'Thunder Crash'];
    const stepSC = off => [off, () => { surge(); crash(f.ct(6)); }, 'Polarity Surge'];
    const stepSF = off => [off, surgeField, 'Polarity Surge'];
    const stepWalls = (off, a0, dir) => [off, () => stormWalls(a0, dir), 'Storm Walls'];
    const stepGale = off => [off, () => galeSlam(), 'Gale Slam'];
    const stepRods = (off, a0) => [off, () => rodsGale(a0), 'Lightning Rods'];
    const stepAv = (off, th) => [off, () => avalanche(th), 'Avalanche'];
    const stepStrike = off => [off, rodStrike, 'Rod Strike'];
    const stepSquall = off => [off, () => squall(1, Math.PI / 2, 360, 150, 30, H ? 260 : 300), 'Squall Line'];
    const stepArm = off => [off, stormArm, 'Storm Arm'];
    const stepCross = off => [off, crossingArms, 'Crossing Arms'];
    const stepReach = off => [off, reachingArms, 'Reaching Arms'];
    const stepHF = off => [off, heavensFall, 'Heavens Fall'];
    const stepTwin = off => [off, twinFall, 'Twin Fall'];

    const front = at => f.course({
      until: 0.55,
      sets: lay(H ? [
        // (de-cook pass: Hard keeps the layers and the dances, but a move stands on its own with room after it; the pairs left are the
        // Squall Line's Surge, the Surge and the Crash at once, the Chain Lightning on the healer as the fist lands, and the Supercell)
        U(12, CLAP),
        U(15, stepFist(0)),
        U(15, stepSurge(0), stepLash(9.8)),
        U(14.5, stepCF(0)),
        // (the Squall Line comes early: the storm's circle drifts round him and the pairs walk it, the fist and a Surge landing inside)
        U(30, stepSquall(0), stepFist(9.5), stepSurge(18.5)),
        U(15.2, stepStrike(0), stepLash(11.2)),
        // (Hard: the rest comes in a fresh order each pull, one group without a Titan Fist and one with, taken in turn)
        // (a Thunderclap first and the Supercell dance in the middle, so the party always has a raidwide to heal within a couple of minutes)
        ...weave([U(13, CLAP, stepFist(7.5)), ...f.shuffle([
          U(15, stepGale(0), stepFist(8)),
          U(13, [0, () => { titanFist(); chainLightning('healer'); }, 'Chain Lightning']),
          U(16, stepRods(0, RODS + 1), stepFist(9.5)),
          U(14, [0, skyfall, 'Skyfall'], stepFist(8.5)),
        ]).flatMap((u, i) => (i === 2 ? [
          // the Supercell instead of the first Rods + Gale: the + players plant the rods, three fronts march past them, and the cell breaks
          // over the summit as the last one passes
          U(43, stepFist(0), stepLash(7.5), [12, groundingRods, 'Grounding Rods'], [12 + f.ct(4.5) + 0.6, supercell, 'Supercell'], [12 + f.ct(4.5) + 0.6 + f.ct(3) + 11, thunderclap, 'Thunderclap'], stepFist(34)), u] : [u]))],
        f.shuffle([
          U(12, stepWalls(0, WALL, 1)),
          U(20, stepAv(0, AV), stepLash(4.5), stepWalls(8.5, WALL + 1, -1)),   // (the lash between the boulders and the walls)
          U(14, stepSC(0), stepLash(8.8)),
          U(15, stepSF(0), stepLash(11)),
        ])),
      ] : [
        // (de-cook pass: the Front keeps three pairs, the Crash into the Field, the Surge inside the Squall Line and the Surge in the turning
        // Storm Walls; everything else stands alone with room after it, and a breather opens about every 40 s)
        U(12, CLAP),
        U(15, stepFist(0)),
        U(16, stepSurge(0), stepLash(10.5)),
        U(13, stepCF(0)),
        U(33.5, stepSquall(0), stepFist(10), stepSurge(19), stepLash(27.5)),
        U(16, stepStrike(0)),
        U(16, stepGale(0), stepFist(7)),
        U(18, stepWalls(0, WALL, 1), stepSurge(4)),   // (Surge lands in the walls: pair up and walk the gap together)
        U(14, stepLash(0), CLAP_AT(6)),
        U(15.8, stepRods(0, RODS)),
        U(13, stepFist(0)),
        U(24, stepAv(0, AV), stepLash(4.8), stepWalls(9, WALL + 1, -1)),
        U(14, stepSC(0), stepFist(8.5)),
        U(14, stepSF(0), stepLash(11)),
        U(15.8, stepRods(0, RODS + 1)),
        U(11, CLAP, stepFist(7)),
      ], 4),
      closing: [[8, surge, 'Polarity Surge'], [8, thunderclap, 'Thunderclap']],
      next: eye,
    }, at);


    const eye = at => f.course({
      onStart: () => { f.clearSweeps(); f.clearRollers(); },
      sets: [
        S([0.3, lash, 'Static Lash']),   // (a lone lash as the storm drops, so the tank has a beat across the calm)
        S([3.3, eyeOpen, 'Eye of the Storm']),
        S([5, () => stillAir(13), 'Still Air']),
        S([11, eyeCloses, 'Eye Closes']),
        S([4]),
      ],
      next: back,
    }, at);

    // Gathering Storm (a heal check): static builds on everyone, a tick every 1.5 s for 12 s, then breaks as one
    // Thunderhead. More than anyone's whole health in all: it is healed through as it lands, or it isn't.
    const gatheringStorm = () => {
      const d = f.ct(3), N = 8, EVERY = 1.5, end = f.t + d + N * EVERY;
      f.cast('Gathering Storm', d, 'clap');
      f.healCheck(d + N * EVERY + 0.6);   // to just after the Thunderhead lands
      f.afterKeep(d, () => { for (const p of f.alive()) { const s = f.ps.get(p.id); if (s) s.debuffs.static = end; } });
      // (kept: the ticks run out even if the course moves on meanwhile)
      for (let i = 0; i < N; i++) f.afterKeep(d + i * EVERY, () => {
        f.emit({ t: 'pulse', k: 1 });
        for (const p of f.alive()) f.damagePlayer(p, dmg.storm, { kind: 'static' });
      });
    };
    // ... and it breaks: laid out in the same set, 12 s after the storm begins (it lands 3 s later)
    const thunderhead = () => {
      f.cast('Thunderhead', 3, 'clap');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 3, dmg: dmg.thunderhead, hidden: true, tag: 'clap' });
    };

    // the back of the storm: the front again, mirrored and doubled, while the room closes in. (Hard: the first half is the doubled
    // front with its rods and gale; the second half is the summit breaking, wedge by wedge, with no gale to throw anyone at a wedge.)
    // Hard lays each half in a fresh order every pull (units, with the Titan Fists spread through them: see lay above); a wedge
    // goes with the unit that breaks it, so it breaks near its own rods or orbs whatever the order.
    const brk = (slot, after = 3) => f.afterKeep(after, () => crumble(0.2 + slot * WEDGE, 6));
    const GS_P = f.ct(3) + 9;   // Gathering Storm to its Thunderhead
    const gsUnit = (P, ...more) => U(P, [0, gatheringStorm, 'Gathering Storm'], [GS_P, thunderhead, 'Thunderhead'], ...more);
    const back = at => f.course({
      until: 0.15,
      onStart: () => { if (!H) { f.afterKeep(60, () => edgeStep(470, 5)); f.afterKeep(150, () => edgeStep(400, 5)); } },
      sets: lay(H ? [
        // (de-cook pass: Hard's Back keeps the Fist with the Surge, the rods with the Surge after the gale, the Chain Lightning on the healer
        // as the fist lands, the Squall Line's Surge and Field, and one wedge with each unit; the rest stands alone with room after it)
        U(14.5, stepLash(0), [5.5, () => crash(f.ct(6)), 'Thunder Crash']),   // straight off the stones: a lash, then into pairs
        // (the doubled front: the ones with a Titan Fist in them and the Ball Lightning, taken in turn)
        ...weave([U(15, CLAP, stepFist(8)), ...f.shuffle([
          U(13, [0, () => { titanFist(); surge(); }, 'Titan Fist']),
          U(16, [0, rodStrike, 'Rod Strike'], stepLash(11)),
        ])], f.shuffle([
          U(20, stepAv(0, AV + Math.PI), stepLash(4.5), stepWalls(8.5, WALL + Math.PI, -1)),
          U(13, [0, () => ballLightning(0.3), 'Ball Lightning'], [7, thunderclap, 'Thunderclap']),
          U(21.5, stepRods(0, RODS + Math.PI), stepSurge(9.8), stepLash(17.3)),
        ])),
        gsUnit(GS_P + 9, stepLash(3.4)),
        // --- the breaking of the summit begins here
        U(12, [0, () => { titanFist(); chainLightning('healer'); }, 'Chain Lightning']),
        U(28, [0, () => { squall(-1, -Math.PI / 2, 320, 120, 24, 232); brk(0); }, 'Squall Line'], stepFist(9), stepSF(17)),
        ...weave(f.shuffle([
          U(14, stepFist(0), [7, () => { rods(RODS + 2); brk(2, 4); }, 'Lightning Rods']),
          U(11, stepFist(0), [6, () => { thunderclap(); brk(3, 5); }, 'Thunderclap']),
        ]), f.shuffle([
          U(14.2, [0, () => { crashField(); brk(1, 6); }, 'Thunder Crash']),
          U(13, [0, () => { ballLightning(2.2); brk(4, 5); }, 'Ball Lightning'], stepField(7)),
        ])),
      ] : [
        // (de-cook pass: the Back keeps the Rods and then a Surge after the gale, the Surge in the turning walls and the Crash in the Squall Line
        // as its pairs; the rest stands alone with room after it)
        U(16, stepLash(0), [6.8, () => crash(f.ct(6)), 'Thunder Crash']),   // straight off the stones: a lash, then into pairs
        U(12, stepFist(0)),
        U(14, CLAP, stepLash(8)),
        U(27, stepRods(0, RODS + Math.PI), stepFist(15.5)),
        U(28, stepAv(0, AV + Math.PI), stepLash(4.8), stepWalls(9, WALL + Math.PI, -1), stepSurge(16)),   // (the marked run for a stone with the walls turning: the Surge)
        U(22, stepLash(0), [9.5, rodStrike, 'Rod Strike']),   // (a lone lash in the calm after the Surge, then the Rod Strike)
        gsUnit(GS_P + 9.5, stepLash(4.5)),
        U(15, [0, () => squall(-1, -Math.PI / 2, 320, 120, 24, 270), 'Squall Line'], stepFist(7)),
        U(15.5, stepCF(0)),
        U(17, stepSF(0), stepLash(11)),
        U(15.8, stepRods(0, RODS + 2)),
        U(13, stepFist(0)),
        U(13, stepCF(0)),
        U(12, CLAP, stepFist(7.2)),
        U(11, stepField(0)),
      ], 3),
      closing: [[10, surge, 'Polarity Surge'], [8, thunderclap, 'Thunderclap']],
      next: finale,
    }, at);

    // the sky coming down: the summit closes to its last ring; the whole party holds each fall up together, and then the sky splits
    // in two and a gold and a blue hold each half. A Titan Fist follows each Heavens Fall once it has landed (Hard: once the scatter
    // has too), while the next column is still to be shown.
    const finale = at => f.course({
      onStart: () => { if (!H) edgeStep(330, 5); },
      sets: lay(H ? [
        // Hard: a lash, then the Storm Unbound (his body breaks apart and he rises as a face over the summit; the party now hits the Storm Heart),
        // then the sky comes down from the face in a fixed order, each Heavens Fall and Twin Fall as it was, with Reaching Arms and Crossing Arms
        // coming in behind a Heavens Fall (after the scatter has gone off) and a tank beat (a lash, or the Storm Arm) in the units between.
        // (the change takes its time: the build-up, the calm, the burst and the three bolts; the Arm falls once the heart is charged)
        U(3 + UNB + 4.2 + 4.3, stepLash(0), [3, unbound, 'Storm Unbound'], stepArm(3 + UNB + 4.2)),
        U(14.5, stepHF(0), stepReach(9.5)),
        U(14.5, stepTwin(0), stepLash(10.3)),
        U(14.5, stepHF(0), stepCross(9.5)),
        U(13, stepTwin(0)),
      ] : [
        U(13.5, stepLash(0), [6.5, heavensFall, 'Heavens Fall']),
        U(14, [0, heavensFall, 'Heavens Fall'], stepFist(7.5)),
        U(15.95, [0, twinFall, 'Twin Fall']),
        U(15, [0, heavensFall, 'Heavens Fall'], stepLash(8)),
        U(14, [0, twinFall, 'Twin Fall']),
      ], 3),
      closing: H ? [[13, heavensFall, 'Heavens Fall'], [8.5, lash, 'Static Lash'], [5.5, crossingArms, 'Crossing Arms'], [10, twinFall, 'Twin Fall'], [10.3, reachingArms, 'Reaching Arms'], [9.5, stormArm, 'Storm Arm']]
        : [[15, heavensFall, 'Heavens Fall'], [5.2, lash, 'Static Lash'], [4.3, titanFist, 'Titan Fist'], [5.5, twinFall, 'Twin Fall']],
      ramp: H ? 0.07 : 0.1,   // (Hard: the ramp is gentler; the scatter after each Heavens Fall is what bites)
    }, at);


    front(0);

    f.moves = { thunderclap, titanFist, lash, surge, surgeField, crash, field, rods, galeSlam, rodsGale, stormWalls, chainLightning, ballLightning, skyfall, rodStrike, avalanche, crumble,
      edgeStep, squall, eyeOpen, stillAir, eyeCloses, heavensFall, twinFall, groundingRods, supercell, unbound, stormArm, crossingArms, reachingArms };
  },
};

if (typeof module !== 'undefined') module.exports = { VOLKAR };
