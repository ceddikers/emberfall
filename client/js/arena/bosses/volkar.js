// Boss III: Volkar, the Storm Titan — "The Peak".
// Polarity, knockbacks, rods that become cover, and a room that closes in. The hardest healing fight.
// He is a giant who never leaves the middle of the peak; everything comes out of him.
//   Every player carries a charge, + or − (an aura in its colour). Polarity Surge: stand with someone of the
//     opposite charge; two of the same charge together arc, and anyone alone takes the full surge.
//   Thunder Crash: a stack on every + player, so each +/− pair stacks together and pairs keep apart; Static Field
//     (everyone spreads) follows straight after.
//   Static Field: spread out. Thunderclap: raidwide. Titan Fist: tankbuster that cleaves.
//   Lightning Rods: each rod wants one person under it when the bolt lands. Catching one leaves you Conductive,
//     and the next one you catch hurts far more, so people take turns. An uncaught rod strikes everyone.
//     After the strike the rod stays planted for 30 s: still air behind it shelters you from Gale Slam.
//   Gale Slam: a blast of wind throws everyone away from him. Slammed into the wall hurts; behind a rod you stay put.
//   Storm Walls: walls of wind turn slowly around him. Walk with them.
//   Pulse: the storm's light, constant damage on everyone, stepping up every minute.
//   Phase 2 at 50%: the edge of the peak electrifies and closes in, three warned steps, to about 60% of the room.
//     Everything happens in less space; late in the fight nobody survives a Gale Slam without a rod.
// Hard: charges flip at 50%; the rods land together with a Gale Slam (shelter behind the rod you're catching);
// three storm walls that turn faster; Titan Fist leaves the tank Conductive. Three moves only Hard has:
//   Chain Lightning: a bolt gathers over one player; when it strikes it leaps to whoever stands nearest them (within
//     300), and on from there, up to three more times.
//   Ball Lightning: crackling orbs gather at the cliff edge, then drift slowly across the peak. Touching one hurts and
//     throws you aside.
//   Skyfall (phase 2): the sky comes down on the spot where a player stood when he called it. The closer you are to
//     it, the harder it hits.
// The summit (props, see PROPS in shapes.js):
//   Standing Stones: four menhirs, solid (a throw that hits one is a slam) but no cover from anything.
//   Rod Strike (takes phase 1's first Lightning Rods): two players are marked, then the other two. The bolt hits the
//     stone nearest each marked player, if they stand at it; otherwise it hits them in the open. A stone keeps the
//     charge for 10 s: struck again in that time it discharges into everyone near it. So the second pair takes the
//     other two stones. Hard (Grounded): a discharge also leaps to the nearest player.
//   Gale Slam throws into the wall (or a stone) hard enough to daze; Hard: thrown off a broken edge is a fall.
//   Avalanche (takes Static Field's place, just before Storm Walls): boulders roll in from one side in lanes and come
//     to rest on the summit. They're cover from the next Storm Walls, which smash each one as they pass.
//   Hard, phase 2 (Crumbling Summit): instead of the edge closing in evenly, the summit breaks away one wedge at a
//     time, cracks showing 6 s ahead. Anyone on it falls (heavy damage, held 5 s while the wind drags them back up).

const VOLKAR = {
  id: 'volkar', name: 'Volkar', title: 'The Storm Titan',
  hp: { normal: 1650000, hard: 2200000 },
  autoDmg: { normal: 1550, hard: 1550 },
  enrage: { normal: 390, hard: 420 },
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
      clap: 7500, fist: H ? 22000 : 20000, surgeAlone: 8500, surgeSame: 15000, surgePair: 2000,
      crash: 15000, field: 6500, rod: 5000, rodAgain: 12000, rodFail: 12000, slam: 9000, wall: H ? 9500 : 11000, edge: 12000, pulse: H ? 480 : 420,
      chain: 7000, orb: 12000, skyfall: 36000,
      strike: H ? 9000 : 8000, strikeOpen: H ? 18000 : 15000, discharge: 12000, grounded: 9000, boulder: H ? 12000 : 11000, fall: 15000,
    };
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
    const rods = (n = H ? 3 : 2, d = f.ct(8)) => {
      n = Math.min(n, Math.max(1, f.alive().length));
      f.cast('Lightning Rods', f.ct(3), 'rods');
      const a0 = f.rng() * TAU;
      for (let i = 0; i < n; i++) {
        let a = a0 + i * TAU / n + (f.rng() - 0.5) * 0.4;
        // not on top of a standing stone
        for (const st of stones()) { let d = a - Math.atan2(st.y, st.x); d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 0.36) a += Math.sign(d || 1) * (0.36 - Math.abs(d)); }
        const r = Math.max(150, (roomAt(a) - 110) * (0.62 + f.rng() * 0.28));
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
        f.damagePlayer(p, dmg.strikeOpen, { kind: 'strike', avoidable: true });
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
    const avalanche = () => {
      const d = f.ct(3.5);
      f.cast('Avalanche', d, 'avalanche');
      const th = f.rng() * TAU, c = Math.cos(th), s = Math.sin(th), nx = -s, ny = c;
      const k = Math.min(1, (f.edgeNext ? f.edgeNext.r : ARENA.r) / 540);
      const offs = f.shuffle([-300, -150, 150, 300]).slice(0, H ? 4 : 3);
      for (const o0 of offs) {
        const o = o0 * k;
        const R = (f.edgeNext ? f.edgeNext.r : ARENA.r) + 60, E = Math.sqrt(Math.max(0, R * R - o * o));   // in from past the edge
        let along = (60 + f.rng() * 90) * k;
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
    const rodsGale = () => {
      if (H) { const d = rods(); f.after(0.01, () => galeSlam(d - 0.01)); }
      else { rods(); f.after(f.ct(5), () => galeSlam()); }
    };

    const stormWalls = () => {
      const d = f.ct(3);
      f.cast('Storm Walls', d, 'walls');
      f.sweep({ x: B.x, y: B.y, arms: H ? 3 : 2, a0: f.rng() * TAU, spin: (f.rng() < 0.5 ? 1 : -1) * (H ? 0.56 : 0.5),
        w: 150, delay: d, dur: H ? 12 : 10, dmg: dmg.wall, tag: 'storm', cover: 'boulder' });   // boulders shelter, once
    };

    // the storm's light: constant damage on everyone, a fifth stronger every minute
    const pulse = () => {
      if (f.state !== 'live') return;
      const k = 1 + 0.2 * Math.floor(f.t / 60);
      f.emit({ t: 'pulse', k: +k.toFixed(2) });
      for (const p of f.alive()) f.damagePlayer(p, dmg.pulse * k, { kind: 'pulse' });
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
    const chainLightning = () => {
      const d = f.ct(6);
      const pool = f.nonTanks().length ? f.nonTanks() : f.alive();
      const target = f.pick(pool);
      if (!target) return;
      f.cast('Chain Lightning', d, 'chain');
      f.mech({ type: 'chain', shape: { kind: 'circle', x: target.x, y: target.y, r: CHAIN }, delay: d, dmg: 0, follow: target.id, tag: 'chain', avoidable: false,
        onResolve: () => {
          let from = f.alive().find(p => p.id === target.id);
          const struck = new Set(), path = [];
          for (let jump = 0; from && jump < 4; jump++) {
            struck.add(from.id); path.push(from.id);
            f.damagePlayer(from, dmg.chain, { kind: 'chain', avoidable: jump > 0 });
            let next = null, nd = CHAIN + 14;
            for (const p of f.alive()) { if (struck.has(p.id)) continue; const dd = Math.hypot(p.x - from.x, p.y - from.y); if (dd < nd) { nd = dd; next = p; } }
            from = next;
          }
          f.emit({ t: 'chain', ids: path });
        } });
    };
    // Ball Lightning: orbs gather at the edge of the peak, then drift slowly across it. Touch one and it bursts.
    const ballLightning = () => {
      const d = f.ct(3);
      f.cast('Ball Lightning', d, 'orbs');
      const n = 4, a0 = f.rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * TAU / n + (f.rng() - 0.5) * 0.4, R = roomAt(a) - 50;
        const dir = a + Math.PI + (f.rng() - 0.5) * 0.9;
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

    // --- phase 1 ----------------------------------------------------------------------------
    assignPolarity();
    f.afterKeep(6, pulse);
    // (the summit: Rod Strike takes the first Lightning Rods' place, and Avalanche Static Field's, just before the walls)
    f.loop(n => [
      [4, thunderclap, 'Thunderclap'],
      [7, titanFist, 'Titan Fist'],
      [8, surge, 'Polarity Surge'],
      [9, rodStrike, 'Rod Strike'],
      [12, () => galeSlam(), 'Gale Slam'],
      [9, crashField, 'Thunder Crash'],
      H && [11, chainLightning, 'Chain Lightning'],
      [H ? 10 : 11, avalanche, 'Avalanche'],
      [7, stormWalls, 'Storm Walls'],
      H && [14, () => field(), 'Static Field'],   // (Hard keeps it as well)
      [H ? 8 : 14, titanFist, 'Titan Fist'],
      [8, rodsGale, 'Lightning Rods'],
      H && [14, ballLightning, 'Ball Lightning'],
      [H ? 10 : 14, surge, 'Polarity Surge'],
      [10, thunderclap, 'Thunderclap'],
      [7],
    ].filter(Boolean));

    // --- phase 2: the sky closes in --------------------------------------------------------------
    f.onHp(0.5, () => {
      f.setPhase(2);
      f.mechs.clear();
      f.emit({ t: 'tgclear' });
      f.clearSweeps();
      f.clearRollers();
      B.cast = null; B.lockFacing = false;
      f.cast('Eye of the Storm', 4, 'storm');
      if (H) f.afterKeep(2, flipPolarity);
      // Normal: the electrified edge closes in, three steps. Hard: the summit breaks away a wedge at a time instead
      if (!H) RINGS.forEach((r, i) => f.afterKeep(4 + i * 40, () => edgeStep(r, 5)));
      else {
        const base = f.rng() * TAU;
        [0, 2, 4, 1, 3].forEach((slot, i) => f.afterKeep(4 + i * 20, () => crumble(base + slot * WEDGE, 6)));
      }
      f.seq([[6, () => p2()]]);
    });

    // (Avalanche takes Static Field's place, just before the walls)
    const p2 = () => f.loop(n => [
      [2, thunderclap, 'Thunderclap'],
      [7, titanFist, 'Titan Fist'],
      [9, crashField, 'Thunder Crash'],
      [11, rodsGale, 'Lightning Rods'],
      H && [14, skyfall, 'Skyfall'],
      [H ? 10 : 14, surge, 'Polarity Surge'],
      [10, avalanche, 'Avalanche'],
      [7, stormWalls, 'Storm Walls'],
      [14, titanFist, 'Titan Fist'],
      H && [8, () => field(), 'Static Field'],
      H && [9, chainLightning, 'Chain Lightning'],
      [H ? 9 : 10, thunderclap, 'Thunderclap'],
      [8, rodsGale, 'Lightning Rods'],
      H && [14, n % 2 ? skyfall : ballLightning, n % 2 ? 'Skyfall' : 'Ball Lightning'],
      [H ? 11 : 14, crashField, 'Thunder Crash'],
      [11, surge, 'Polarity Surge'],
      [9],
    ].filter(Boolean));

    f.moves = { thunderclap, titanFist, surge, crash, field, rods, galeSlam, rodsGale, stormWalls, chainLightning, ballLightning, skyfall, rodStrike, avalanche, crumble, edgeStep };
  },
};

if (typeof module !== 'undefined') module.exports = { VOLKAR };
