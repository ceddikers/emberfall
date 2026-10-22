// Boss III: Volkar, the Storm Titan — "The Summit". The storm front.
// One authored storm, the same on every pull: a steady crescendo, a calm eye, then it all comes back. The question he
// keeps asking: who do I pair with, and where's cover? Everyone carries + or − all fight (polarity is the spine).
//   The Front (100% → 55%): the gaps tighten from ~15 s to ~8 s. Thunderclap, Titan Fist, Polarity Surge (pair + with −),
//     Thunder Crash → Static Field, Rod Strike (bring your bolt down on a stone), Gale Slam, Storm Walls, Lightning Rods +
//     Gale (shelter behind your rod), Avalanche → Storm Walls (behind a boulder), Surge and Crash at once, and the
//     Squall Line: the safe circle drifts round him for 30 s and the party walks with it.
//   The Eye (55%, 40 s): the wind drops and the Pulse stops; he stays targetable. Still Air: the four stones light up,
//     two + and two −. When the Eye closes, be at a stone of your own charge.
//   The Back of the Storm (55% → 15%): the Front again, mirrored and doubled, while the electrified edge closes in.
//   Heavens Fall (15% → 0%): the summit closes to its last ring and the sky comes down on set spots round him; the whole
//     party holds each one up together, both charges in it, each a little harder, until he falls or calls Skybreak.
//   Gathering Storm (in the back half): a heal check. Static ticks on everyone every 1.5 s for 12 s, then one
//     Thunderhead: more than a whole health bar each in all, so it has to be healed through as it lands.
// The storm's Pulse hits everyone every 4 s, a twentieth harder each minute. A slow party runs each part's last set again,
// +10% each pass (f.course in fight.js). Every telegraph shows on the floor on every difficulty.
// Hard: casts 15% faster, 25% more damage; the charges flip as the Eye opens; three rods and three walls; Titan Fist
// leaves the tank Conductive; Chain Lightning on the healer as Titan Fist lands on the tank; the summit breaks away a
// wedge at a time late in the back half; Heavens Fall comes faster; and his three moves: Chain Lightning, Ball Lightning,
// Skyfall. The summit's four standing stones are solid, and Rod Strike and Still Air use them.
// Hard's dance, in the Front (in place of the first Rods + Gale): Grounding Rods (the + players plant them), Supercell
// (three squall fronts march past them; the cells past a rod stay dry), then a Thunderclap.

const VOLKAR = {
  id: 'volkar', name: 'Volkar', title: 'The Storm Titan',
  hp: { normal: 3620000, hard: 3800000 },
  autoDmg: { normal: 1300, hard: 1400 },
  enrage: { normal: 592, hard: 607 },   // the cast starts here and lands 8 s later (10:00 / 10:15)
  enrageName: 'Skybreak',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'peak' },

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
      clap: 6500, fist: H ? 22000 : 20000, surgeAlone: 8500, surgeSame: 15000, surgePair: 2000,
      storm: 1600, thunderhead: 5000,
      crash: 13000, field: 5500, rod: 5000, rodAgain: 12000, rodFail: 12000, slam: 9000, wall: H ? 9500 : 11000, edge: 12000, pulse: H ? 300 : 260,
      chain: 7000, orb: 12000, skyfall: 36000,
      strike: H ? 9000 : 8000, strikeOpen: H ? 18000 : 15000, discharge: 12000, grounded: 9000, boulder: H ? 12000 : 11000, fall: 15000,
      squall: 6000, still: 9000, stillWrong: 12000, heavens: 28000, front: 7500,
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

    // Polarity Surge: same charges together arc; opposite charges together cancel out; alone takes it all
    const surge = () => {
      const d = f.ct(6);
      f.cast('Polarity Surge', d, 'surge');
      f.mech({ type: 'polarity', shape: { kind: 'circle', x: 0, y: 0, r: PAIR }, delay: d, dmg: 0, tag: 'surge', avoidable: false,
        onResolve: () => {
          const al = f.alive();
          for (const p of al) {
            const near = al.filter(o => o.id !== p.id && Math.hypot(o.x - p.x, o.y - p.y) <= PAIR);
            if (near.some(o => charge(o.id) === charge(p.id))) f.damagePlayer(p, dmg.surgeSame, { kind: 'arc', avoidable: true });
            else if (near.length) f.damagePlayer(p, dmg.surgePair, { kind: 'surge' });
            else f.damagePlayer(p, dmg.surgeAlone, { kind: 'surge' });
          }
        } });
    };

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
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 115 }, delay: d, dmg: dmg.field * mult, follow: p.id, tag: 'static' });
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
    const sheltered = p => covers().some(c => {
      const cx = c.x - B.x, cy = c.y - B.y, cd = Math.hypot(cx, cy);
      if (cd < 1) return false;
      const ux = cx / cd, uy = cy / cd, px = p.x - B.x, py = p.y - B.y;
      return px * ux + py * uy >= cd - 30 && Math.abs(-px * uy + py * ux) <= COVER_W;
    });

    // off the edge where the summit has broken away (Hard): heavy damage, and held while the wind drags you back up
    const fall = p => {
      f.damagePlayer(p, dmg.fall, { kind: 'fall', avoidable: true });
      f.debuff(p.id, 'rooted', 5);
      f.emit({ t: 'propfx', k: 'fall', x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
    };
    // Gale Slam: everyone is thrown away from him, except whoever stands behind a rod. Thrown into the wall, or into a
    // standing stone, hurts and dazes you; thrown off a broken edge (Hard) is a fall.
    const galeSlam = (d = f.ct(5)) => {
      f.cast('Gale Slam', d, 'gale');
      f.mech({ type: 'gale', shape: { kind: 'circle', x: B.x, y: B.y, r: 120 }, delay: d, dmg: 0, dist: GALE, tag: 'gale', avoidable: false,
        onResolve: () => {
          for (const p of f.alive()) {
            if (sheltered(p)) continue;
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
      if (!room.eye) {
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
            f.damagePlayer(from, dmg.chain, { kind: 'chain', avoidable: jump > 0 && !ate, eat: 'lance', mid: cm && cm.id });
            if (ate) break;
            let next = null, nd = CHAIN + 14;
            for (const p of f.alive()) { if (struck.has(p.id)) continue; const dd = Math.hypot(p.x - from.x, p.y - from.y); if (dd < nd) { nd = dd; next = p; } }
            from = next;
          }
          f.emit({ t: 'chain', ids: path });
        } });
    };
    // Ball Lightning: orbs gather at the edge of the peak, then drift slowly across it. Touch one and it bursts.
    const ballLightning = (a0 = 0) => {
      const d = f.ct(3);
      f.cast('Ball Lightning', d, 'orbs');
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
    const squallAt = (q, t) => { const a = q.a0 + q.dir * TAU * Math.max(0, Math.min(1, (t - q.start) / q.dur)); return { x: Math.cos(a) * q.D, y: Math.sin(a) * q.D }; };
    const squall = (dir, a0, R, D, dur = 30) => {
      const d = f.ct(4);
      f.cast('Squall Line', d, 'storm');
      const q = { dir, a0, R, D, dur, start: f.t + d, end: f.t + d + dur, last: {} };
      room.squall = q;
      f.emit({ t: 'roomev', k: 'squall', dir, a0: +a0.toFixed(3), R, D, sdur: dur, at: d, dur: d + dur });
    };
    f.ticker(() => {
      const q = room.squall;
      if (!q || f.t < q.start) return;
      if (f.t > q.end) { room.squall = null; return; }
      const c = squallAt(q, f.t);
      for (const p of f.alive()) {
        if (Math.hypot(p.x - c.x, p.y - c.y) <= q.R - 10 || f.t - (q.last[p.id] ?? -9) < 1) continue;
        q.last[p.id] = f.t;
        f.damagePlayer(p, dmg.squall, { kind: 'edge', avoidable: true, noVuln: true });
      }
    });
    room.inSquall = (x, y, t, pad = 0) => { const q = room.squall; if (!q || t < q.start - 1 || t > q.end) return true; const c = squallAt(q, t); return Math.hypot(x - c.x, y - c.y) <= q.R - pad; };

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
    const eyeOpen = () => {
      f.cast('Eye of the Storm', 4, 'storm');
      room.eye = true;
      f.emit({ t: 'roomev', k: 'eye', dur: 40 });
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
    const distantThunder = () => f.cast('Distant Thunder', 3, 'clap');   // the storm gathering beyond the eye: nothing lands
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
    };

    // --- the storm -----------------------------------------------------------------------------------
    assignPolarity();
    f.afterKeep(6, pulse);
    const AV = 0.7, WALL = 0.4, RODS = 0.3;   // the front comes from here; the back of the storm from the other side
    const front = at => f.course({
      until: 0.55,
      sets: [
        S([4, thunderclap, 'Thunderclap']),
        S([15, titanFist, 'Titan Fist']),
        S([15, surge, 'Polarity Surge']),
        S([15, crashField, 'Thunder Crash']),
        S([15, rodStrike, 'Rod Strike']),
        S([14, () => galeSlam(), 'Gale Slam']),
        S([13, () => stormWalls(WALL, 1), 'Storm Walls']),
        H && S([12, () => { titanFist(); chainLightning('healer'); }, 'Chain Lightning']),
        S([H ? 10 : 14, thunderclap, 'Thunderclap']),
        S([12, titanFist, 'Titan Fist']),
        // (Hard: the Supercell instead: the + players plant the rods, three fronts march past them, and the cell breaks
        // over the summit as the last one passes)
        H ? S([12, groundingRods, 'Grounding Rods'], [f.ct(4.5) + 0.6, supercell, 'Supercell'], [f.ct(3) + 11, thunderclap, 'Thunderclap'])
          : S([12, () => rodsGale(RODS), 'Lightning Rods']),
        S([H ? 13 : 14, () => avalanche(AV), 'Avalanche'], [5, () => stormWalls(WALL + 1, -1), 'Storm Walls']),
        S([14, () => { surge(); crash(f.ct(6)); }, 'Polarity Surge']),
        S([11, () => squall(1, Math.PI / 2, 360, 150), 'Squall Line'], [12, () => field(), 'Static Field'], [12, surge, 'Polarity Surge']),
        H && S([12, () => ballLightning(0.3), 'Ball Lightning']),
        S([H ? 9 : 14, titanFist, 'Titan Fist']),
        S([9, () => rodsGale(RODS + 1), 'Lightning Rods']),
        S([12, crashField, 'Thunder Crash']),
        S([9, thunderclap, 'Thunderclap']),
      ].filter(Boolean),
      closing: [[8, surge, 'Polarity Surge'], [8, thunderclap, 'Thunderclap']],
      next: eye,
    }, at);

    const eye = at => f.course({
      onStart: () => { f.clearSweeps(); f.clearRollers(); },
      sets: [
        S([2, eyeOpen, 'Eye of the Storm']),
        S([8, () => stillAir(30), 'Still Air']),
        S([14, distantThunder, 'Distant Thunder']),
        S([14, eyeCloses, 'Eye Closes']),
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

    // the back of the storm: the front again, mirrored and doubled, while the room closes in
    const back = at => f.course({
      until: 0.15,
      onStart: () => {
        if (!H) { f.afterKeep(60, () => edgeStep(470, 5)); f.afterKeep(150, () => edgeStep(400, 5)); }
        else [0, 2, 4, 1, 3].forEach((slot, i) => f.afterKeep(140 + i * 20, () => crumble(0.2 + slot * WEDGE, 6)));
      },
      sets: [
        S([3, () => crash(f.ct(6)), 'Thunder Crash']),   // straight off the stones, into pairs
        S([12, () => { titanFist(); surge(); }, 'Titan Fist']),
        S([12, thunderclap, 'Thunderclap']),
        S([15, () => rodsGale(RODS + Math.PI), 'Lightning Rods'], [9, surge, 'Polarity Surge']),   // the rods land, then pair up behind them
        S([15, () => avalanche(AV + Math.PI), 'Avalanche'], [5, () => stormWalls(WALL + Math.PI, -1), 'Storm Walls']),
        H && S([12, skyfall, 'Skyfall']),
        S([H ? 10 : 14, () => { rodStrike(); titanFist(); }, 'Rod Strike']),
        S([14, gatheringStorm, 'Gathering Storm'], [f.ct(3) + 9, thunderhead, 'Thunderhead']),
        S([7, () => { if (H) { titanFist(); chainLightning('healer'); } else field(); }, H ? 'Titan Fist' : 'Static Field']),
        S([10, () => squall(-1, -Math.PI / 2, 320, 120, 24), 'Squall Line'], [13, surge, 'Polarity Surge']),
        S([11, () => rodsGale(RODS + 2), 'Lightning Rods']),
        H && S([12, () => ballLightning(2.2), 'Ball Lightning']),
        S([H ? 10 : 14, () => { crashField(); if (H) stormWalls(WALL + 2, 1); }, 'Thunder Crash']),
        S([12, thunderclap, 'Thunderclap']),
        H && S([10, skyfall, 'Skyfall']),
        S([10, titanFist, 'Titan Fist']),
        S([10, surge, 'Polarity Surge']),
      ].filter(Boolean),
      closing: [[10, surge, 'Polarity Surge'], [8, thunderclap, 'Thunderclap']],
      next: finale,
    }, at);

    // the sky coming down: the summit closes to its last ring and the whole party holds each fall up together
    const finale = at => f.course({
      onStart: () => { if (!H) edgeStep(330, 5); },
      sets: [
        S([10, heavensFall, 'Heavens Fall']),   // once the last set has landed
        S([H ? 13 : 15, heavensFall, 'Heavens Fall']),
      ],
      closing: [[H ? 13 : 15, heavensFall, 'Heavens Fall']],
      ramp: 0.1,
    }, at);

    front(0);

    f.moves = { thunderclap, titanFist, surge, crash, field, rods, galeSlam, rodsGale, stormWalls, chainLightning, ballLightning, skyfall, rodStrike, avalanche, crumble,
      edgeStep, squall, eyeOpen, stillAir, eyeCloses, heavensFall, groundingRods, supercell };
  },
};

if (typeof module !== 'undefined') module.exports = { VOLKAR };
