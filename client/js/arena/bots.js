// Bots that fill empty party slots (host only). They move by scoring candidate spots against every live
// telegraph, and fight with the real class kits using a simple "competent player" priority.

// do segments p1-p2 and q1-q2 cross?
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

// the bosses' tankbusters by cast name, and the tank cooldowns that answer them
const BUSTER_CASTS = /^(Tenderize|Silk Wrap|Titan Fist|Grave Cleave|Arcane Lance)$/;
// ... and the same for the tanks' own reading, without a hand list: every telegraph a boss lays as type 'buster' names the cast it
// came from (m.from), and the bots learn those names as they appear, so a boss's newer tank moves count from their first sighting
// (BUSTER_CASTS' five are known from the pull, as every player knows them). The set starts afresh with each fight (fight time
// running backwards), so a run never depends on the one before it. Tank code reads this; healer code still reads BUSTER_CASTS.
const BUSTER_SEEN = {
  known: null, lastT: 0,
  test(name) { return BUSTER_CASTS.test(name) || (!!this.known && this.known.has(name)); },
  learn(view) {
    if (!this.known || view.t < this.lastT - 1) this.known = new Set();
    this.lastT = view.t;
    for (const m of view.mechs) if (m.type === 'buster' && m.from) this.known.add(m.from);
  },
};
const TANK_CDS = ['bulwark', 'zeal', 'undying', 'banner', 'sanctum', 'warcry', 'mantle'];
// ... and the casts that hurt the whole party, which healers top people up for
const RAID_CASTS = /^(Grease Fire|Simmer|Venom Mist|Tightening Web|Thunderclap|Thunder Crash|Static Field|Polarity Surge|Skyfall|Barrow Knell|Grave Marks|Gathering Storm|Thunderhead|Royal Tithe|Dirge|Gut Blast|Flare-Up|Last Orders|Gorge|Boil Over|Heavens Fall|Twin Fall|Arcane Burst|Convergence|The Tide Rises)$/;

// the rings of spots move() tries round a bot and round its home (radius 60, 130, 220, 330, twelve each): cos and sin of the angle
// times the radius, as [dx, dy, dx, dy, ...], worked out once
const BOT_RING = [];
for (const r of [60, 130, 220, 330]) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + r * 0.01; BOT_RING.push(Math.cos(a) * r, Math.sin(a) * r); }

const BotAI = {
  isMelee(cls) { const r = KITS[cls.id].abilities[0].range; return r === 'melee' || (typeof r === 'number' && r <= 130); },   // (a Reaper's scythe reaches 1.5x melee: it still stands in)

  // where this bot would like to stand when nothing is happening
  // Which enemy to hit: tanks and healers stay on the boss. DPS split over a pair of adds (one each),
  // easing off when theirs gets well ahead of its sibling so the pair dies together. null = the boss.
  pickEnemy(bot, view) {
    // things you break (eggs, knots) only count while the room asks for them (prio); a coffin or cocoon always does
    const adds = (view.adds || []).filter(a => !a.inert || a.prio || a.kind === 'cocoon');
    if (!adds.length || bot.role !== 'dps') return null;
    // something holding a party member (Skitterra's cocoon) comes first; then whatever the room asks for (adds.prio)
    const coc = adds.find(a => a.kind === 'cocoon');
    if (coc) return coc.id;
    const pri = adds.filter(a => a.prio).sort((a, b) => b.prio - a.prio)[0];
    if (pri) return pri.id;
    const enr = adds.find(a => a.enraged);
    if (enr) return enr.id;
    const frac = a => a.hp / a.maxHp;
    const dps = view.players.filter(p => p.alive && p.role === 'dps').map(p => p.id).sort((a, b) => a - b);
    const sorted = [...adds].sort((a, b) => (a.id < b.id ? -1 : 1));
    if (dps.length < 2) return sorted.reduce((m, a) => (frac(a) > frac(m) ? a : m)).id;
    const mine = sorted[Math.max(0, dps.indexOf(bot.id)) % sorted.length];
    bot.addHome = mine.id;  // stay by it even while holding, so we don't wander across the room
    const sib = adds.find(a => a.id === mine.link);
    if (sib && frac(mine) < frac(sib) - 0.12) return 'hold';
    return mine.id;
  },

  // --- Volkar --------------------------------------------------------------------------------
  // polarity pairs: the living + and − players, each side in id order, matched one to one (leftovers stand alone)
  // One bot's think (move, below) asks the same questions of the same view dozens of times, once per candidate spot. The planners
  // that hand out jobs (towers, rods, bells, stones, cover, partners) answer for the whole party and don't depend on the spot, so
  // while move() runs their answers are kept in BotAI._mc (for that view only: any other view, or a call from outside move, works
  // everything out afresh). Nothing they read changes while a bot thinks.
  mcOf(view) { const mc = this._mc; return mc && mc.view === view ? mc : null; },
  partner(me, view) {
    const mc = this.mcOf(view);
    if (!mc) return this.partnerOf(me, view);
    if (!mc.partner) mc.partner = new Map();
    let p = mc.partner.get(me);
    if (p === undefined) { p = this.partnerOf(me, view); mc.partner.set(me, p); }
    return p;
  },
  partnerOf(me, view) {
    const pol = view.polarity;
    if (!pol || !pol.has(me)) return null;
    const al = view.players.filter(p => p.alive && pol.has(p.id)).sort((a, b) => a.id - b.id);
    const plus = al.filter(p => pol.get(p.id) > 0), minus = al.filter(p => pol.get(p.id) < 0);
    const mine = pol.get(me) > 0 ? plus : minus, theirs = pol.get(me) > 0 ? minus : plus;
    const i = mine.findIndex(p => p.id === me);
    return i >= 0 ? theirs[i] || null : null;
  },
  // anything standing that shelters from Gale Slam: the rods' posts and rods still waiting for their bolt
  covers(view) {
    const mc = this.mcOf(view);
    if (mc && mc.covers) return mc.covers;   // (only ever read)
    const out = (view.posts || []).map(c => ({ x: c.x, y: c.y }));
    for (const m of view.mechs) if (m.tag === 'rod') out.push({ x: m.shape.x, y: m.shape.y });
    if (mc) mc.covers = out;
    return out;
  },
  sheltered(px, py, view) {
    const b = view.boss;
    return this.covers(view).some(c => {
      const cx = c.x - b.x, cy = c.y - b.y, cd = hypot2(cx, cy);
      if (cd < 1) return false;
      const ux = cx / cd, uy = cy / cd, qx = px - b.x, qy = py - b.y;
      return qx * ux + qy * uy >= cd - 20 && Math.abs(-qx * uy + qy * ux) <= 34;   // a little inside the real shelter
    });
  },
  // which rod this bot should catch: players without Conductive take them in order, bots before humans (a bot can't
  // count on a person knowing which rod is "theirs"), tanks last
  rodFor(me, view) {
    const mc = this.mcOf(view);
    let mine = mc ? mc.rod : undefined;
    if (mine === undefined) { mine = this.rodPlan(view); if (mc) mc.rod = mine; }
    return mine === null ? null : (mine[me] ?? null);
  },
  rodPlan(view) {
    const rods = view.mechs.filter(m => m.tag === 'rod').sort((a, b) => a.id - b.id);
    if (!rods.length) return null;
    const deb = id => view.debuffs(id).conductive ? 1 : 0, human = p => (p.id < 1000 ? 1 : 0);
    const order = view.players.filter(p => p.alive).sort((a, b) => deb(a.id) - deb(b.id) || human(a) - human(b) || (a.role === 'tank') - (b.role === 'tank') || a.id - b.id);
    // nearest free rod for each catcher in turn
    const free = [...rods], mine = {};
    for (const p of order) {
      if (!free.length) break;
      let bi = 0;
      for (let i = 1; i < free.length; i++) if (hypot2(free[i].shape.x - p.x, free[i].shape.y - p.y) < hypot2(free[bi].shape.x - p.x, free[bi].shape.y - p.y)) bi = i;
      mine[p.id] = free.splice(bi, 1)[0].id;
    }
    return mine;
  },

  // Rod Strike: which standing stone this marked bot brings its bolt down on. The marked take the nearest uncharged
  // stone in turn (a charged one would discharge); null if this bot isn't marked
  stoneFor(me, view) {
    const mc = this.mcOf(view);
    let plan = mc ? mc.stone : undefined;
    if (plan === undefined) { plan = this.stonePlan(view); if (mc) mc.stone = plan; }
    return plan.marks.some(m => m.follow === me) ? plan.mine[me] || null : null;
  },
  stonePlan(view) {
    // people first (they'll take the stone nearest them), then the bots fit round them
    const marks = view.mechs.filter(m => m.tag === 'rodstrike').sort((a, b) => (a.follow >= 1000) - (b.follow >= 1000) || a.id - b.id);
    const free = (view.props || []).filter(p => p.kind === 'stone').sort((a, b) => (a.state > 0) - (b.state > 0));
    const mine = {};
    for (const m of marks) {
      const p = view.players.find(q => q.id === m.follow && q.alive);
      if (!p || !free.length) continue;
      const cool = free.filter(s => !(s.state > 0)), pool = cool.length ? cool : free;
      let best = pool[0];
      for (const s of pool) if (hypot2(s.x - p.x, s.y - p.y) < hypot2(best.x - p.x, best.y - p.y)) best = s;
      mine[m.follow] = best; free.splice(free.indexOf(best), 1);
    }
    return { marks, mine };
  },

  // any other one-person towers (Order Up!'s plates, Egg Sacs): the players take the nearest free one in turn, the
  // tank last (it holds the boss) and anyone Stuffed after everyone else
  // Towers that land one after another (Order Up!'s rail) are handed out in the order they land: each goes to whoever
  // can be standing in it in time (free by then, and not still Stuffed from an earlier one: m.stuff), nearest first.
  towerFor(me, view) {
    const mc = this.mcOf(view);
    let mine = mc ? mc.tower : undefined;
    if (mine === undefined) { mine = this.towerPlan(view); if (mc) mc.tower = mine; }
    return mine === null ? null : (mine[me] ?? null);
  },
  towerPlan(view) {
    const towers = view.mechs.filter(m => m.type === 'tower' && m.tag !== 'rod' && m.tag !== 'bell' && m.tag !== 'still' && m.tag !== 'arm').sort((a, b) => a.resolveAt - b.resolveAt || a.id - b.id);
    if (!towers.length) return null;
    const SPEED = 230;
    const al = view.players.filter(p => p.alive);
    const st = new Map(al.map(p => [p.id, { x: p.x, y: p.y, free: view.t, full: view.t + (view.debuffs(p.id).stuffed || 0), tank: p.role === 'tank', n: 0 }]));
    const mine = {};
    // (a tower that names its owner, the Anvil Count's: that hero takes it, whoever else could reach it)
    for (const m of towers) if (m.anvilFor != null) { const o = st.get(m.anvilFor); if (o) { mine[m.anvilFor] = m.id; o.n++; } }
    for (const m of towers) {
      if (m.anvilFor != null) continue;
      let best = null, bs = Infinity;
      for (const p of al) {
        const s = st.get(p.id);
        if (s.full > m.resolveAt - 0.05) continue;   // still Stuffed when it lands
        const arrive = s.free + hypot2(m.shape.x - s.x, m.shape.y - s.y) / SPEED, late = Math.max(0, arrive - (m.resolveAt - 0.35));
        const sc = late * 1000 + arrive + (s.tank ? 1.5 : 0) + s.n * 4;   // one each where it can be
        if (sc < bs) { bs = sc; best = p; }
      }
      if (!best) continue;
      const s = st.get(best.id);
      if (mine[best.id] == null) mine[best.id] = m.id;
      s.x = m.shape.x; s.y = m.shape.y; s.free = m.resolveAt; s.full = m.resolveAt + (m.stuff || 0); s.n++;
    }
    return mine;
  },

  // --- the room's props -----------------------------------------------------------------------
  // a cover mechanic: which prop this bot hides behind. Everyone takes a prop in id order, healthiest and nearest
  // first, at most `cap` to a prop (the mechanic's own cap, or enough to fit everyone, two at least)
  coverFor(me, view, m) {
    const mc = this.mcOf(view);
    let mine;
    if (mc) {
      if (!mc.cover) mc.cover = new Map();
      mine = mc.cover.get(m);
      if (mine === undefined) { mine = this.coverPlan(view, m); mc.cover.set(m, mine); }
    } else mine = this.coverPlan(view, m);
    return mine === null ? null : (mine[me] || null);
  },
  coverPlan(view, m) {
    const props = (view.props || []).filter(p => p.cover);
    if (!props.length) return null;
    const al = view.players.filter(p => p.alive).sort((a, b) => a.id - b.id);
    const cap = m.coverCap || Math.max(2, Math.ceil(al.length / props.length));
    const room = new Map(props.map(p => [p, cap])), mine = {};
    for (const p of al) {
      let best = null, bs = Infinity;
      for (const pr of props) {
        if (!room.get(pr)) continue;
        const spot = PROPS.shadowSpot(m.src.x, m.src.y, pr, 30), s = hypot2(spot.x - p.x, spot.y - p.y) - (pr.maxHp ? pr.hp * 90 : 200);
        if (ARENA.sd(spot.x, spot.y) > -16) continue;
        if (props.some(q => q !== pr && q.solid !== false && PROPS.sd(q, spot.x, spot.y) < 16)) continue;   // (its shadow falls into another prop: nowhere to stand)
        if ((view.puddles || []).some(pd => hypot2(pd.x - spot.x, pd.y - spot.y) < pd.r + 25)) continue;   // a pool in its shadow
        if (s < bs) { bs = s; best = pr; }
      }
      if (best) { mine[p.id] = best; room.set(best, room.get(best) - 1); }
    }
    return mine;
  },
  // Still Air (Volkar's Eye): each lit stone wants one person of its own charge. People keep the stone they're nearest
  // (of their charge); the bots take what's left of their charge, nearest first.
  stillFor(me, view) {
    const mc = this.mcOf(view);
    let mine = mc ? mc.still : undefined;
    if (mine === undefined) { mine = this.stillPlan(view); if (mc) mc.still = mine; }
    return mine === null ? null : (mine[me] ?? null);
  },
  stillPlan(view) {
    const pol = view.polarity, stones = view.mechs.filter(m => m.tag === 'still' || m.tag === 'arm');   // (Still Air's stones, and Reaching Arms' arms: one person of each one's charge)
    if (!pol || !stones.length) return null;
    const mine = {}, taken = new Set(), al = view.players.filter(p => p.alive);
    const order = [...al.filter(p => p.id < 1000), ...al.filter(p => p.id >= 1000).sort((a, b) => a.id - b.id)];
    for (const p of order) {
      let best = null, bd = Infinity;
      for (const m of stones) {
        if (taken.has(m.id) || m.charge !== pol.get(p.id)) continue;
        const d = hypot2(m.shape.x - p.x, m.shape.y - p.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) { mine[p.id] = best.id; taken.add(best.id); }
    }
    return mine;
  },
  // Butcher's Charge (Grubnak): where the tank stands so the charge runs into a brick wall, past no cask and away from
  // the stove line along the top wall
  chargeBait(view) {
    const b = view.boss;
    let best = null, bs = -Infinity;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
      let L = 0; while (L < 1400 && ARENA.sd(b.x + c * L, b.y + s * L) < -60) L += 20;
      const end = { x: b.x + c * L, y: b.y + s * L };
      if (end.y < -ARENA.hh + 90) continue;   // the stove line
      if (PROPS.ray(b.x, b.y, end.x, end.y, view.props || [], 50)) continue;
      const spot = { x: b.x + c * 170, y: b.y + s * 170 }, sc = Math.min(L, 500) - hypot2(spot.x - b.x, spot.y - (b.y + 125)) * 0.1;
      if (ARENA.sd(spot.x, spot.y) > -40) continue;
      if (sc > bs) { bs = sc; best = spot; }
    }
    return best;
  },

  // --- the Hollow King -------------------------------------------------------------------------
  // Barrow Bells: people go to the bell they're nearest, then the bots fill whatever is still short, nearest first
  bellFor(me, view) {
    const mc = this.mcOf(view);
    let mine = mc ? mc.bell : undefined;
    if (mine === undefined) { mine = this.bellPlan(view); if (mc) mc.bell = mine; }
    return mine === null ? null : (mine[me] ?? null);
  },
  bellPlan(view) {
    const bells = view.mechs.filter(m => m.tag === 'bell').sort((a, b) => a.id - b.id);
    if (!bells.length) return null;
    const need = bells[0].need || 1, room = bells.map(() => need), mine = {};
    const al = view.players.filter(p => p.alive);
    const dist = (p, m) => hypot2(m.shape.x - p.x, m.shape.y - p.y);
    for (const p of al.filter(q => q.id < 1000)) {
      let bi = 0; bells.forEach((m, i) => { if (dist(p, m) < dist(p, bells[bi])) bi = i; });
      mine[p.id] = bells[bi].id; room[bi]--;
    }
    for (const p of al.filter(q => q.id >= 1000).sort((a, b) => a.id - b.id)) {
      let bi = -1;
      bells.forEach((m, i) => { if (room[i] > 0 && (bi < 0 || dist(p, m) < dist(p, bells[bi]))) bi = i; });
      if (bi < 0) break;
      mine[p.id] = bells[bi].id; room[bi]--;
    }
    return mine;
  },
  // where Doom sends this bot, if anywhere: the doomed walk into the nearest light; a lantern carrier takes it to the
  // doomed; one bot fetches a lantern for a doomed person; in the Long Night one bot carries the last lantern
  lanternJob(bot, view) {
    const doomed = view.doomed, lants = view.lanterns || [];
    if (!lants.length) return null;
    const me = bot.id, al = view.players.filter(p => p.alive);
    const near = (p, list) => list.reduce((m, o) => (!m || hypot2(o.x - p.x, o.y - p.y) < hypot2(m.x - p.x, m.y - p.y) ? o : m), null);
    const doomedPs = doomed ? al.filter(p => doomed.has(p.id)) : [];
    const self = al.find(p => p.id === me);
    if (!self) return null;
    if (doomed && doomed.has(me)) { const l = near(self, lants); return l ? { x: l.x, y: l.y } : null; }
    const mine = lants.find(l => l.carrier === me);
    if (mine) { const d = near(self, doomedPs); return d ? { x: d.x, y: d.y } : null; }
    const free = lants.filter(l => l.carrier == null);
    if (!free.length) return null;
    const carriers = new Set(lants.map(l => l.carrier).filter(c => c != null));
    const helpers = al.filter(p => p.id >= 1000 && p.role !== 'tank' && !(doomed && doomed.has(p.id)) && !carriers.has(p.id));
    // the Long Night: someone has to carry the last lantern (a healer if there is one, they stay in the middle)
    const last = free.find(l => l.last);
    if (last) {
      const pick = helpers.find(p => p.role === 'healer') || helpers[0];
      return pick && pick.id === me ? { x: last.x, y: last.y } : null;
    }
    // a doomed person (not a bot, they walk themselves) needs a lantern brought: the nearest free helper goes
    if (!doomedPs.some(p => p.id < 1000) || carriers.size) return null;
    let best = null, bd = Infinity;
    for (const p of helpers) { const l = near(p, free), d = hypot2(l.x - p.x, l.y - p.y); if (d < bd) { bd = d; best = p; } }
    if (!best || best.id !== me) return null;
    const l = near(self, free);
    return { x: l.x, y: l.y };
  },

  // --- Hard's dance pieces (Snare Weave, Burial Rites, the Writ) ---------------------------------
  // a player's party slot (0-3), as FightSim.slotOf and the party frames count it
  slotOf(id, view) {
    const order = { tank: 0, healer: 1, dps: 2 };
    const list = view.players.filter(p => !p.left).sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.id - b.id);
    return Math.max(0, list.findIndex(p => p.id === id));
  },
  // the Writ: the plan. A fired line stays burning as a spoke out from him, so each line has to point between the
  // graves as seen from where he stands (with him held in the middle, the hall's corners), and away from the lines
  // already placed. In slot order (the shield first, staying close so he doesn't wander), each baited player takes the
  // direction farthest from every grave and every line placed before theirs, leaning toward where they already are.
  writSpot(me, view) {
    const b = view.boss, ad = (a, c) => { let d = Math.abs(a - c) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
    const used = view.mechs.filter(m => m.type === 'own').map(m => Math.atan2(m.shape.y - b.y, m.shape.x - b.x));
    const baits = view.mechs.filter(m => m.type === 'bait').sort((x, y) => this.slotOf(x.target, view) - this.slotOf(y.target, view));
    let mine = null;
    for (const m of baits) {
      const p = view.players.find(q => q.id === m.target);
      const cur = p ? Math.atan2(p.y - b.y, p.x - b.x) : 0;
      let best = 0, bs = -Infinity;
      for (let i = 0; i < 36; i++) {
        const a = i * Math.PI / 18, sc = Math.min(Math.PI, ...used.map(u => ad(a, u))) - 0.12 * ad(a, cur);
        if (sc > bs) { bs = sc; best = a; }
      }
      used.push(best);
      if (m.target === me) mine = { a: best, r: p && p.role === 'tank' ? 175 : 250 };
    }
    if (!mine) return { x: b.x, y: b.y + 200 };
    return ARENA.clamp({ x: b.x + Math.cos(mine.a) * mine.r, y: b.y + Math.sin(mine.a) * mine.r }, 60);
  },

  // the Dinner Rush (Grubnak, Hard): where this bot sets its plate. The plates come up nearest him first, on his three
  // beats: west chop (so the first is on his east side), east chop with the lid (the second on his west side, in close
  // but at the edge of the lid's quiet circle), then the ladle (the last two well out). By party place: the shield's plate nearest,
  // on his east flank; the third place's at his west flank; the healer's and the fourth's out east and west.
  rushSpot(me, view) {
    const half = view.mechs.find(m => m.tag === 'mince' && m.shape.kind === 'rect');
    const at = half ? { x: half.shape.x, y: half.shape.y } : view.boss;
    const OFF = [[95, 0], [320, -45], [-165, 30], [-320, -45]], [dx, dy] = OFF[this.slotOf(me, view) % OFF.length];
    return ARENA.clamp({ x: at.x + dx, y: at.y + dy }, 60);
  },
  // the Grounding Rods (Volkar, Hard): the + players plant theirs a cell either side of him, in the row through him
  // (the lower id west, the other east), so every lane of still air the fronts leave runs past his flanks
  // Morrow-Oak's Hunger Seed: the carrier takes its seed out to the edge, clear of the holes already made, of the other carrier's
  // spot and of him (a ring further in once the edge is full): the nearest such spot. Planned once a seed and kept on its
  // telegraph, so the carrier doesn't change its mind on the way.
  seedSpot(me, view) {
    const seeds = view.mechs.filter(m => m.tag === 'mgSeed' || m.tag === 'svSeed'), mine = seeds.find(m => m.follow === me);
    if (!mine) return null;
    if (mine.botSpot) return mine.botSpot;
    const holes = (view.floor || []).filter(fl => fl.kind === 'hole'), taken = seeds.filter(m => m.botSpot).map(m => m.botSpot);
    const p = view.players.find(q => q.id === me) || { x: 0, y: 0 }, b = view.boss;
    let best = null, bs = Infinity;
    // beside an old hole the seed feeds it instead of digging a new one: the nearest such place that is floor and clear of the rest
    for (const h of (mine.tag === 'svSeed' ? [] : holes)) for (let k = 0; k < 16; k++) {   // (the Sovereign's seeds always dig a new hole: no feeding an old one)
      const a = k * Math.PI / 8, x = h.x + Math.cos(a) * (h.r + 66), y = h.y + Math.sin(a) * (h.r + 66);
      if (hypot2(x, y) > ARENA.inner - 70 || holes.some(o => o !== h && hypot2(o.x - x, o.y - y) < o.r + 60) || taken.some(t => hypot2(t.x - x, t.y - y) < 360) || hypot2(b.x - x, b.y - y) < 260) continue;
      const v = hypot2(p.x - x, p.y - y);
      if (v < bs) { bs = v; best = { x, y }; }
    }
    for (let ring = 0; ring < 4 && !best; ring++) {
      const rr = ARENA.inner - 95 - ring * 165;
      if (rr < 120) break;
      for (let k = 0; k < 36; k++) {
        const a = k * Math.PI / 18, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (holes.some(h => hypot2(h.x - x, h.y - y) < h.r + 120) || taken.some(t => hypot2(t.x - x, t.y - y) < 360) || hypot2(b.x - x, b.y - y) < 260) continue;
        const v = hypot2(p.x - x, p.y - y);
        if (v < bs) { bs = v; best = { x, y }; }
      }
    }
    mine.botSpot = best || { x: p.x, y: p.y };
    return mine.botSpot;
  },
  // ... and its tank holds him where no hole is near, so an Inhale drags nobody over one (kept while it stays clear)
  clearSpot(view) {
    const holes = (view.floor || []).filter(fl => fl.kind === 'hole');
    if (!holes.length) return null;
    const clear = (x, y) => Math.min(...holes.map(h => hypot2(h.x - x, h.y - y) - h.r));
    const keep = this._mgSpot;
    if (keep && keep.n === holes.length && clear(keep.x, keep.y) > 260) return keep;
    let best = null, bv = -Infinity;
    for (let gx = -320; gx <= 320; gx += 80) for (let gy = -320; gy <= 320; gy += 80) {
      if (gx * gx + gy * gy > 340 * 340) continue;
      const v = Math.min(clear(gx, gy), 420) - hypot2(gx, gy) * 0.25;
      if (v > bv) { bv = v; best = { x: gx, y: gy, n: holes.length }; }
    }
    this._mgSpot = best;
    return best;
  },
  // Caelum's Dark Ember (Hard): the carrier sets it down on the shadow's edge, at the nearest point of it
  emberSpot(me, view) {
    const sh = view.room && view.room.shadow, p = view.players.find(q => q.id === me);
    if (!sh || !p) return null;
    const d = hypot2(p.x - sh.x, p.y - sh.y) || 1;
    return { x: sh.x + (p.x - sh.x) / d * sh.r, y: sh.y + (p.y - sh.y) / d * sh.r };
  },
  rodSpot(me, view) {
    const carriers = view.mechs.filter(m => m.tag === 'groundrod').map(m => m.follow).sort((a, b) => a - b);
    const i = carriers.indexOf(me), b = view.boss;
    if (i < 0) return null;
    return { x: b.x + (i ? 135 : -135), y: b.y };
  },

  home(bot, view) {
    const b = view.boss, idx = bot.slot || 0;
    // The Binding (Azerath): the shield leads each elemental into the sigil of its own element, the one due to blow up first
    if (bot.role === 'tank' && view.binding) {
      const it = view.binding.items.filter(i => !i.done).sort((p, q) => p.t0 - q.t0)[0], c = it && view.binding.circles.find(q => q.el === it.el);
      if (c) return { x: c.x, y: c.y };
    }
    const own = typeof BOT_CLASS !== 'undefined' && BOT_CLASS[bot.cls.id] && BOT_CLASS[bot.cls.id].home;   // a class with its own footwork
    if (own) { const h = own(bot, view); if (h) return h; }
    // The Lake Rises (Hrimgar): once most of the sheets are marked or under, everyone stands on the frozen ones nearest the boss
    if (view.bossId === 'titan') {
      const sh = (view.floor || []).filter(fl => fl.kind === 'sheet'), froz = sh.filter(fl => fl.st === 1);
      // (the Grasp that chooses the islands: everyone closes in, so the ice joins up)
      if ((view.next || []).some(n => n[0] === 'The Lake Rises') && !(view.bossCast && view.bossCast.name === 'The Lake Rises')) return { x: b.x + (idx % 2 ? 35 : -35), y: b.y + 110 + (idx > 1 ? 35 : 0) };
      if (froz.length && sh.filter(fl => fl.st >= 2).length >= 11) {
        froz.sort((p, q) => hypot2(p.x - b.x, p.y - b.y) - hypot2(q.x - b.x, q.y - b.y));
        const fl = froz[Math.min(froz.length - 1, bot.role === 'tank' ? 0 : idx % 2)], off = bot.role === 'tank' ? 0 : 60;
        return { x: fl.x + (idx % 2 ? off : -off), y: fl.y + (idx > 1 ? off : -off) };
      }
    }
    // Frostbite (Hrimgar): a chilled bot walks to the nearest brazier and stands in its warmth
    if (view.bossId === 'titan' && view.debuffs(bot.id).frostbite) {
      let nb = null;
      for (const p of view.props || []) if (p.kind === 'brazier' && (!nb || hypot2(p.x - bot.x, p.y - bot.y) < hypot2(nb.x - bot.x, nb.y - bot.y))) nb = p;
      if (nb) { const d = hypot2(bot.x - nb.x, bot.y - nb.y) || 1; return { x: nb.x + (bot.x - nb.x) / d * 55, y: nb.y + (bot.y - nb.y) / d * 55 }; }
    }
    // on an add: melee hug it, ranged stand off to one side of it (out of any beam to its sibling)
    const homeId = bot.wantEnemy === 'hold' ? bot.addHome : bot.wantEnemy;
    const add = homeId && (view.adds || []).find(a => a.id === homeId);
    if (add) {
      const toC = Math.atan2(-add.y, -add.x) + (idx % 2 ? 0.9 : -0.9);
      const d = this.isMelee(bot.cls) ? add.r + 40 : 230;
      return { x: add.x + Math.cos(toC) * d, y: add.y + Math.sin(toC) * d };
    }
    // Corvane: his Sundering Cut breaks any stone lantern it reaches, so the tank turns him away from them and the rest stand behind
    if (view.bossId === 'corvane') {
      const a = this.faceAway(view), c = Math.cos(a), sn = Math.sin(a);
      if (bot.role === 'tank') return { x: b.x + c * 125, y: b.y + sn * 125 };
      const side = idx % 2 ? 1 : -1, back = this.isMelee(bot.cls) ? 115 : 250, wide = this.isMelee(bot.cls) ? 40 : 170;
      return { x: b.x - c * back - sn * wide * side, y: b.y - sn * back + c * wide * side };
    }
    if (view.bossId === 'morrowoak' && bot.role === 'tank') { const c = this.clearSpot(view); if (c) return { x: c.x, y: c.y }; }
    // Caelum's Constellation Fall: the whole floor but the star's shadow, so everyone (the tank too) goes behind their piece of it
    if (view.bossId === 'caelum') {
      const big = view.mechs.find(m => m.cover && m.shape.r >= 1200 && m.resolveAt - view.t < 6);
      const pr = big && this.coverFor(bot.id, view, big);
      if (pr) return PROPS.shadowSpot(big.src.x, big.src.y, pr, 30 + (bot.slot || 0) % 2 * 25, 0);
    }
    if (bot.role === 'tank') return { x: b.x, y: b.y - 125 };
    if (this.isMelee(bot.cls)) return { x: b.x + (idx % 2 ? 40 : -40), y: b.y + 115 };
    // (Skitterra aims her Venom Spit and Fang Rush at whoever stands farthest from her: the healer stands nearer than the
    // damage dealers, so the party's one healer isn't the one they are aimed at)
    if (bot.role === 'healer' && view.bossId === 'skitterra') return { x: b.x + (idx % 2 ? 150 : -150), y: b.y + 175 };
    return { x: b.x + (idx % 2 ? 170 : -170), y: b.y + 250 };
  },
  // a spot kept out of every solid prop's footprint: danger() charges 9000 inside sd 16, so a home that lands in a cask or pillar leaves
  // the nearest candidate a ring step (60) away, and the bot parks there for as long as the boss stands still
  freeOfProps(h, view) {
    const solid = (view.props || []).filter(p => p.solid);
    if (!solid.length || !h) return h;
    const o = { x: h.x, y: h.y };
    for (let pass = 0; pass < 3; pass++) for (const pr of solid) {
      const d = PROPS.sd(pr, o.x, o.y);
      if (d >= 24) continue;
      const [nx, ny] = PROPS.normal(pr, o.x, o.y);
      o.x += nx * (26 - d); o.y += ny * (26 - d);
    }
    return o;
  },
  // which way Corvane's tank turns him (radians from the boss): a heading whose blow reaches no stone lantern, with room behind
  // the tank, kept while it still works so the tank doesn't dance about
  faceAway(view) {
    const b = view.boss, lan = (view.props || []).filter(p => p.kind === 'stonelantern');
    const bad = a => {
      let pen = 0;
      for (const p of lan) {
        const dx = p.x - b.x, dy = p.y - b.y;
        let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (hypot2(dx, dy) < 420 && Math.abs(da) < 0.85) pen += 1000;
      }
      return pen + Math.max(0, ARENA.sd(b.x + Math.cos(a) * 125, b.y + Math.sin(a) * 125) + 90) * 20;
    };
    const keep = this._corvA;
    if (keep != null && bad(keep) === 0) return keep;
    let best = -Math.PI / 2, bs = Infinity;
    for (let k = 0; k < 16; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 8, v = bad(a) + (keep != null ? Math.abs(Math.atan2(Math.sin(a - keep), Math.cos(a - keep))) * 30 : 0);
      if (v < bs) { bs = v; best = a; }
    }
    this._corvA = best;
    return best;
  },

  // (the memo's pieces for danger(): who is alive, the earliest wave still to land, the telegraphs within 11 s with their time
  // left and urgency, and the fires a Flambé or the stove line is about to light: none depends on the spot being scored)
  aliveOf(view) {
    const mc = this.mcOf(view);
    if (!mc) return view.players.filter(p => p.alive);
    return mc.alive || (mc.alive = view.players.filter(p => p.alive));
  },
  firstAoe(view) {
    const mc = this.mcOf(view);
    if (mc && mc.first !== undefined) return mc.first;
    let first = null;
    for (const m of view.mechs) if (m.type === 'aoe' && m.resolveAt > view.t && (!first || m.resolveAt < first.resolveAt)) first = m;
    if (mc) mc.first = first;
    return first;
  },
  soonMechs(view) {
    const mc = this.mcOf(view);
    if (mc && mc.soon) return mc.soon;
    const ms = [], dts = [], urg = [];
    for (const m of view.mechs) {
      const dt = Math.max(0, m.resolveAt - view.t);
      if (dt > 11) continue;
      ms.push(m); dts.push(dt); urg.push(1 / (0.4 + dt));
    }
    const out = { ms, dts, urg };
    if (mc) mc.soon = out;
    return out;
  },
  firesOf(view) {
    const mc = this.mcOf(view);
    if (mc && mc.fires) return mc.fires;   // (only ever read)
    const fires = view.mechs.filter(m => m.tag === 'flambe' && m.resolveAt - view.t < 4);
    for (const z of view.zones || []) if (z.tag === 'stovefire' && view.t > z.startAt - 3) fires.push(z);
    if (mc) mc.fires = fires;
    return fires;
  },

  // move() scores its candidate spots one after another and keeps the lowest score (score = danger + walk + distance terms, a and b
  // being the two distance terms, bs the best score so far). Every term danger() adds is at least 0 except a healing pool's
  // bonus (450 each, `negs` of them still to come), so once the running sum (taken down by every pool bonus it could still get,
  // rounding included: each rounded step is monotone) plus a and b is already at or past bs, the rest of the sum cannot bring the
  // spot back under it: it returns what it has, which the caller then throws away. past() is that test. Without a, b and bs (any
  // other caller) danger() always adds everything up.
  past(pen, negs, a, b, bs) {
    for (let i = 0; i < negs; i++) pen -= 450;
    return pen + a + b >= bs;
  },
  danger(bot, px, py, view, a = 0, b = 0, bs = NaN) {
    let pen = 0;
    const wall = ARENA.sd(px, py) + 45;   // how far past "45 from the wall" this spot is
    if (wall > 0) pen += 8000 + wall * 100;
    const me = bot.id;
    const bounded = bs === bs, negs = bot.role !== 'tank' ? (view.pools || []).length : 0;   // (the pool bonuses still to come)
    const alive = this.aliveOf(view);
    // The Rune Pair (Azerath): the two bearers stand together or well apart, whichever the coming spell wants (view.runes). When they
    // must meet, the higher id walks to the other, so a bot comes to a human bearer and not the other way round
    const rp = view.runes;
    if (rp && rp.on && rp.goal && rp.goal[me]) { const g = rp.goal[me]; pen += Math.max(0, hypot2(g.x - px, g.y - py) - g.r) * 25; }   // (the Sovereign's Twin Brands: each bearer has a spot to stand, the lit wall's circle or a far corner)
    else if (rp && rp.on && (rp.a === me || rp.b === me)) {
      const other = alive.find(o => o.id === (rp.a === me ? rp.b : rp.a));
      if (other) {
        const d = hypot2(other.x - px, other.y - py);
        if (rp.rule === 'pair') { if (me > other.id) pen += Math.max(0, d - 70) * 25; }
        else pen += Math.max(0, 380 - d) * 18;
      }
    }
    // Waves (Simmer etc.): the area the next hit covers is safe right after it lands. Waiting just outside it,
    // ready to step in, beats standing somewhere that gets hit later and having to cross waves to escape.
    const first = this.firstAoe(view);
    const besideFirst = first && first.resolveAt - view.t < 4 && !SHAPES.contains(first.shape, px, py, 22) && SHAPES.contains(first.shape, px, py, 75);
    const soon = this.soonMechs(view);
    const mawT = bot.cls && bot.cls.id === 'gorgemaw' ? this.mawTarget(bot, view) : null;   // (a teammate's circle it means to swallow: no penalty for standing in it)
    for (let mi = 0; mi < soon.ms.length; mi++) {
      if (bounded && mi > 0 && this.past(pen, negs, a, b, bs)) return pen;
      const m = soon.ms[mi], dt = soon.dts[mi], urgency = soon.urg[mi];
      const s = m.shape;
      // a blast you hide from behind a prop: be in your own prop's shadow (in someone else's will do, at a pinch)
      // (a line aimed at me follows me until it locks: wherever I go I am in it, so only cover will do)
      if (m.cover && (m.type === 'raidwide' || m.aimFromBoss === me || SHAPES.contains(s, px, py, 22))) {
        const pr = this.coverFor(me, view, m), props = view.props || [];
        const ok = pr && PROPS.blocks(pr, m.src.x, m.src.y, px, py, PROPS.COVER_SHRINK + 8);
        // (a cover across the room has to be set off for early: "too late" starts a walk and a second before it lands)
        const walk = pr ? hypot2(pr.x - bot.x, pr.y - bot.y) / 230 + 1 : 0;
        if (!ok) pen += (PROPS.shadowing(m.src.x, m.src.y, px, py, props) ? 1500 : 6000) * urgency + (dt < Math.max(2.5, walk) ? 5000 : 0);
        continue;
      }
      // the Writ (the Hollow King, Hard): bait your own line out to your corner (writSpot); keep out of everyone else's
      if (m.type === 'bait' || (m.type === 'safe' && m.aimFromBoss != null)) {
        if (m.aimFromBoss === me) {
          if (m.type === 'bait' && dt > (m.lockAt || 0.6) + 0.15) { const sp = this.writSpot(me, view); pen += hypot2(sp.x - px, sp.y - py) * 30 * Math.max(urgency, 0.4); }
          else if (m.type === 'bait' && SHAPES.contains(s, px, py, 22)) pen += 3000 * urgency;   // locked: step off it before it fires
        } else if (m.type === 'bait' && SHAPES.contains(s, px, py, 30)) pen += 6000 * urgency + (dt < 1.5 ? 5000 : 0);
        // (close to him, every line runs over you)
        if (m.type === 'bait' && dt < 2 && hypot2(px - view.boss.x, py - view.boss.y) < 120) pen += 6000;
        continue;
      }
      // Burial Rites: in your own grave when it closes (after the Crown of Graves has landed), out of everyone else's
      if (m.type === 'own') {
        const d = hypot2(s.x - px, s.y - py);
        if (m.target === me) { if (d > s.r - 28) pen += (d - s.r + 28) * (dt < 3.9 ? 45 : 1.5); }
        else if (d < s.r + 30 && dt < 3.5) pen += 5000;
        continue;
      }
      // Second Helping (Grubnak, Hard): the haul comes first (everyone dragged toward him by m.pull.dist, stopped by a solid cask) and the circle
      // at his feet lands where it leaves you: judge the spot you would be left at, not the one you stand on (m.pull is only on that blast)
      if (m.pull && m.tag === 'helping') {
        const bx = s.x, by = s.y, D = hypot2(bx - px, by - py);
        let qx = px, qy = py;
        if (D > m.pull.stop + 20) {
          const go = Math.min(m.pull.dist, D - m.pull.stop), to = { x: px + (bx - px) / D * go, y: py + (by - py) / D * go };
          PROPS.clipMove({ x: px, y: py }, to, view.props || [], 14);
          qx = to.x; qy = to.y;
        }
        if (SHAPES.contains(s, qx, qy, 22)) pen += 6000 * urgency + (dt < 2.5 ? 5000 : 0);
        continue;
      }
      // a pull toward him coming (m.pullDist, Morrow-Oak's Inhale): stand where the drag crosses no hole
      if (m.pullDist) {
        if (dt < 5 && view.room && view.room.safe) {
          const bx = view.boss.x, by = view.boss.y, D = hypot2(bx - px, by - py);
          if (D > 110) {
            const go = Math.min(m.pullDist, D - 95), ux = (bx - px) / D, uy = (by - py) / D;
            for (const q of [0.2, 0.4, 0.6, 0.8, 1]) if (!view.room.safe(px + ux * go * q, py + uy * go * q, true)) { pen += 7000 * Math.max(urgency, 0.5); break; }
          }
        }
        continue;
      }
      // Hard's placements with one right answer: the Dinner Rush's plates (rushSpot) and the Grounding Rods (rodSpot).
      // The carrier walks to its spot of the plan; everyone else keeps off a carrier as it sets down
      if (m.type === 'drop' && (m.tag === 'platedrop' || m.tag === 'groundrod' || m.tag === 'clEmber')) {
        if (m.follow === me) {
          const sp = m.tag === 'platedrop' ? this.rushSpot(me, view) : m.tag === 'clEmber' ? this.emberSpot(me, view) : this.rodSpot(me, view);
          if (sp) pen += hypot2(sp.x - px, sp.y - py) * 40 * Math.max(urgency, 0.5);
        } else {
          const owner = alive.find(o => o.id === m.follow);
          if (owner && dt < 1.5 && hypot2(owner.x - px, owner.y - py) < s.r + 20) pen += 1500 * urgency;
        }
        continue;
      }
      // Egg-Laden (Snare Weave): the carrier drops its pool in the pocket it has just left (where it stood when the first
      // layer landed); everyone else keeps clear of a carrier about to drop
      if (m.type === 'drop') {
        if (m.follow === me) {
          bot.dropAt = bot.dropAt || {};
          if (dt < 1.1 && !bot.dropAt[m.id]) bot.dropAt[m.id] = { x: bot.x, y: bot.y };
          const at = bot.dropAt[m.id];
          if (at) pen += hypot2(at.x - px, at.y - py) * 40;
        } else {
          const owner = alive.find(o => o.id === m.follow);
          if (owner && dt < 2.2 && hypot2(owner.x - px, owner.y - py) < s.r + 40) pen += 3000 * urgency;
        }
        continue;
      }
      // Lights Out (the Hollow King): be inside a light when it lands
      if (m.type === 'dark') {
        const L = m.lights ? m.lights() : [];
        if (!L.some(l => hypot2(l.x - px, l.y - py) <= m.lightR - 30)) pen += (L.length ? 6000 : 0) * urgency + (dt < 2 && L.length ? 5000 : 0);
        continue;
      }
      // a throw coming (m.throwDist): stand where it doesn't slam you into a wall or a prop
      if (m.throwDist && dt < 5) {
        const a = Math.atan2(py - s.y, px - s.x), to = { x: px + Math.cos(a) * m.throwDist, y: py + Math.sin(a) * m.throwDist };
        const over = ARENA.sd(to.x, to.y) + 30, hit = PROPS.ray(px, py, to.x, to.y, view.props || [], 14);
        if (over > 0 || hit) pen += (2500 + Math.max(0, over) * 8) * urgency;
      }
      // Butcher's Charge aimed at this bot (the tank): stand where it runs into a brick wall, then step aside at the lock
      if (m.tag === 'charge' && m.aimFromBoss === me && dt > (m.lockAt || 0.6) + 0.2) {
        const bait = this.chargeBait(view);
        if (bait) pen += hypot2(bait.x - px, bait.y - py) * 30 * urgency;
        continue;
      }
      switch (m.type) {
        case 'aoe':
          // a cone aimed at me (Venom Spit): bait it out at the edge, then step aside once it locks
          if (m.aimFromBoss === me && dt > (m.lockAt || 0.6) + 0.15) {
            pen += Math.max(0, ARENA.inner - 70 - hypot2(px - view.boss.x, py - view.boss.y)) * 6;
            break;
          }
          // a circle that follows me (Spice Rack's jar) goes wherever I go until it locks: nothing to dodge yet
          // ... so carry it where it lands on nobody else (a cask out where it can stand as cover, not in his lap)
          if (m.follow === me && dt > (m.lockAt || 0) + 0.1) {
            if (m.tag === 'mgSeed' || m.tag === 'svSeed') { const sp = this.seedSpot(me, view); if (sp) pen += hypot2(sp.x - px, sp.y - py) * 40 * Math.max(urgency, 0.5); }
            for (const o of alive) if (o.id !== me && hypot2(o.x - px, o.y - py) < s.r + 45) pen += 1500 * Math.max(urgency, 0.4);
            // (a circle that locks where you stand when it does: be on the move by then, so you are leaving it at full speed, not starting to)
            if (m.tag === 'glob') pen += Math.max(0, 150 - hypot2(px - bot.x, py - bot.y)) * 6 * Math.min(1, (dt - (m.lockAt || 0)) + 0.5);
            if (m.tag === 'cask' || m.tag === 'spit') { const db = hypot2(px - view.boss.x, py - view.boss.y); if (db < 240) pen += (240 - db) * 15; }
            break;
          }
          // Funeral March: the open lane (m.safe, a row of spots) is the place to be until the last rank has passed
          if (m.safe) { const d = Math.min(...m.safe.map(q => hypot2(q.x - px, q.y - py))); if (d > 100) pen += (d - 100) * 15 * urgency; }
          if (SHAPES.contains(s, px, py, 22) && !(mawT && (m === mawT || (m.id != null && m.id === mawT.id)))) {
            const waitIn = besideFirst && m !== first && m.resolveAt - first.resolveAt > 1;
            // (about to land: nothing else, not even a lantern errand, is worth standing in it)
            pen += 6000 * urgency * (waitIn ? 0.15 : 1) + (dt < 2.5 && !waitIn ? 5000 : 0);
          }
          break;
        case 'buster':
          if ((m.target ?? m.follow) !== me && SHAPES.contains(s, px, py, 30)) pen += 6000 * urgency;
          break;
        // Chain Lightning leaps from its target to anyone within its reach (s.r): like a spread, only much wider
        case 'chain':
        case 'spread': {
          if (m.follow === me) {
            for (const o of alive) if (o.id !== me && hypot2(o.x - px, o.y - py) < s.r + 50) pen += 2500 * urgency;
          } else {
            const owner = alive.find(o => o.id === m.follow);
            if (owner && hypot2(owner.x - px, owner.y - py) < s.r + 50 && !(mawT && (m === mawT || (m.id != null && m.id === mawT.id)))) pen += 3000 * urgency;
          }
          break;
        }
        case 'stack': {
          // Foretold's share (the Sovereign): only the tank and the healer are in it, and each walks to its own ghost (view.runes.goal); nobody else is drawn to it
          if (m.tag === 'svForeShare') break;
          // (a spread of my own landing first, or with it: drop that clear of everyone, then come in)
          if (view.mechs.some(o => o.type === 'spread' && o.follow === me && o.resolveAt < m.resolveAt + 1)) break;
          // Thunder Crash: each + player carries one; their partner stacks in, everyone else keeps out
          if (m.tag === 'crash') {
            const owner = alive.find(o => o.id === m.follow);
            if (!owner) break;
            const d = hypot2(owner.x - px, owner.y - py), pt = this.partner(me, view);
            // (a crash with nobody of the other charge left to share it: its owner brings it into the nearest other
            // pair's, where three or four split both, rather than take one alone)
            const lone = id => !this.partner(id, view);
            if (!pt) {
              const others = view.mechs.filter(o => o.tag === 'crash' && o.follow !== me).map(o => alive.find(q => q.id === o.follow)).filter(Boolean);
              const near = others.sort((a, b) => hypot2(a.x - bot.x, a.y - bot.y) - hypot2(b.x - bot.x, b.y - bot.y))[0];
              if (near && near.id === m.follow && d > s.r * 0.5) pen += (d - s.r * 0.5) * 30 * urgency;
            } else if (m.follow === me) {
              for (const o of view.mechs) {
                if (o.tag !== 'crash' || o.follow === me || lone(o.follow)) continue;
                const ow = alive.find(q => q.id === o.follow);
                if (ow && hypot2(ow.x - px, ow.y - py) < s.r * 2 + 50) pen += 3000 * urgency;
              }
            } else if (pt && pt.id === m.follow) { if (d > s.r * 0.5) pen += (d - s.r * 0.5) * 30 * urgency; }
            else if (lone(m.follow)) { /* (the lone crash comes to us) */ }
            else if (d < s.r + 45) pen += 3000 * urgency;
            break;
          }
          // Twin Fall (Volkar): each column wants a gold and a blue. The pairs (a pair first, anyone left over after) take the columns in order
          if (m.twin) {
            const keyOf = o => { const op = this.partner(o.id, view); return op ? [0, Math.min(o.id, op.id)] : [1, o.id]; };
            const ks = [...new Set(alive.map(o => keyOf(o).join(':')))].sort((x, y) => { const [x0, x1] = x.split(':').map(Number), [y0, y1] = y.split(':').map(Number); return x0 - y0 || x1 - y1; });
            // (only the set that lands first: a later pair of columns waits its turn)
            if (m.resolveAt > Math.min(...view.mechs.filter(o => o.twin).map(o => o.resolveAt)) + 0.5) break;
            const mine = ks.indexOf(keyOf(bot).join(':')) % 2 === (m.twin - 1) % 2;
            if (mine) { const dd = hypot2(s.x - px, s.y - py); if (dd > s.r * 0.55) pen += (dd - s.r * 0.55) * 30 * urgency; }
            break;
          }
          const owner = alive.find(o => o.id === m.follow);
          const cx = owner ? owner.x : s.x, cy = owner ? owner.y : s.y;
          const d = hypot2(cx - px, cy - py);
          if (d > s.r * 0.55) pen += (d - s.r * 0.55) * 30 * urgency;
          break;
        }
        case 'tower': {
          const mine = m.tag === 'rod' ? this.rodFor(me, view) === m.id : m.tag === 'bell' ? this.bellFor(me, view) === m.id
            : m.tag === 'still' || m.tag === 'arm' ? this.stillFor(me, view) === m.id : this.towerFor(me, view) === m.id;
          const inside = hypot2(s.x - px, s.y - py) < s.r - 18;
          // head for your own tower early: it may be across the room
          if (mine && !inside) pen += (hypot2(s.x - px, s.y - py)) * 12 * Math.max(urgency, 0.3) + (dt < hypot2(s.x - bot.x, s.y - bot.y) / 230 + 3 ? (view.room && view.room.threads ? 16000 : 4500) : 1200);   // (a failed tower hits the whole party: a sting or three from Skitterra's threads on the way beats it)
          // (a plate coming up in a moment is yours to serve: a later blow round it can wait until it has)
          if (mine && !inside && m.tag === 'plate' && dt < 2.5 && m.stuff) pen += dt < 1.2 ? 9000 : 4000;
          // (a plate that leaves you Stuffed is worse than useless if it isn't yours: you can't take your own after it)
          // (the host counts anyone touching it, so keep well clear)
          if (!mine && (m.stuff ? hypot2(s.x - px, s.y - py) < s.r + 30 : inside)) pen += (m.stuff ? 6000 : 2500) * urgency;
          // (my tower with a ball's lane over it just after it lands: stand on the side of it that is the shortest way off the lane)
          if (mine && inside) for (const rl of [...(view.rollers || []), ...(view.rollPre || [])]) {
            if (view.t > rl.end) continue;
            const cs = Math.cos(rl.angle), sn = Math.sin(rl.angle), perp = Math.abs(-(px - rl.x) * sn + (py - rl.y) * cs);
            const dxc = s.x - rl.x, dyc = s.y - rl.y, pc = Math.abs(-dxc * sn + dyc * cs);
            if (pc > rl.r + 60) continue;
            const along = dxc * cs + dyc * sn, arrive = rl.rollAt + Math.max(0, along) / rl.speed;
            if (arrive > m.resolveAt - 0.5 && arrive < m.resolveAt + 2.5) pen += Math.max(0, 85 - perp) * 25;
          }
          break;
        }
        case 'proximity':
          pen += (900 - Math.min(900, hypot2(px - s.x, py - s.y))) * 8 * urgency;
          break;
        // Polarity Surge: be with your opposite-charge partner and away from anyone of your own charge.
        // The pair member with the higher id walks to the other (bots have the higher ids, so they come to you).
        case 'polarity': {
          const pol = view.polarity;
          if (!pol) break;
          for (const o of alive) if (o.id !== me && pol.get(o.id) === pol.get(me) && hypot2(o.x - px, o.y - py) < s.r + 45) pen += 4000 * urgency;
          const pt = this.partner(me, view);
          if (pt && pt.id < me) { const d = hypot2(pt.x - px, pt.y - py); if (d > s.r * 0.45) pen += (d - s.r * 0.45) * 30 * urgency; }
          break;
        }
        // Gale Slam: either shelter behind a rod or stand where the throw doesn't reach the wall
        case 'gale': {
          if (dt > 7 || this.sheltered(px, py, view)) break;
          const a = Math.atan2(py - view.boss.y, px - view.boss.x), dist = m.dist || 300;
          const tx = px + Math.cos(a) * dist, ty = py + Math.sin(a) * dist;
          const over = ARENA.sd(tx, ty) + 20;
          if (over > 0) pen += (3000 + over * 10) * urgency;
          else if (PROPS.ray(px, py, tx, ty, view.props || [], 16)) pen += 3000 * urgency;   // thrown into a standing stone
          break;
        }
        // Rod Strike: the marked stand at their own stone; nobody else stands at a stone that's about to be struck
        case 'rodstrike': {
          if (m.follow === me) {
            const st = this.stoneFor(me, view);
            if (st) { const d = PROPS.sd(st, px, py); if (d > 40) pen += (d - 40) * 30 * Math.max(urgency, 0.3); }
          } else {
            const owner = alive.find(o => o.id === m.follow);
            const st = owner && this.stoneFor(m.follow, view);
            if (st && PROPS.sd(st, px, py) < 110) pen += 3000 * urgency;
            if (owner && hypot2(owner.x - px, owner.y - py) < 60) pen += 1500 * urgency;
          }
          break;
        }
      }
    }
    if (bounded && this.past(pen, negs, a, b, bs)) return pen;
    // Storm Walls: stay off where each wall will be over the next second
    for (const sw of view.sweeps || []) {
      // behind a boulder (Avalanche) the wall passes over you, once
      if (sw.cover && PROPS.shadowing(sw.x, sw.y, px, py, view.props || [], q => q.kind === sw.cover && PROPS.blocks(q, sw.x, sw.y, px, py, PROPS.COVER_SHRINK + 10))) continue;
      if (view.t > sw.end + 0.2) continue;
      for (const look of [0, 0.5, 1]) {
        const tt = Math.min(view.t + look, sw.end);   // the walls hold their last place until they're gone: don't cut back in early
        if (tt < sw.startAt - 0.8) continue;
        const a0 = sw.a0 + Math.max(0, tt - sw.startAt) * sw.spin;
        for (let k = 0; k < sw.arms; k++) {
          const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), sn = Math.sin(a), dx = px - sw.x, dy = py - sw.y;
          if (dx * c + dy * sn > -20 && Math.abs(-dx * sn + dy * c) < sw.w / 2 + 40) pen += look ? 4000 : 7000;
        }
      }
    }
    // the Echo Knights' replays: the bots remember what each knight saw, and keep clear before it even shows
    for (const e of view.echoPlan || []) {
      const dt = e.at - view.t;
      if (dt < 0 || dt > 7) continue;
      if (SHAPES.contains(e.shape, px, py, 30)) pen += 5000 / (0.6 + dt);
    }
    for (const e of bot.backs || []) if (view.t > e.from - 0.3 && view.t < e.until && SHAPES.contains(e.shape, px, py, 24)) pen += 7000;
    // Doom: wherever the lanterns send this bot (lanternJob, worked out once per think in move())
    if (bot.job) pen += Math.min(600, hypot2(bot.job.x - px, bot.job.y - py)) * 12;
    // a Sigilmancer's own Ember Circle: it's only strong inside, so leaving costs (but never more than real danger)
    const cir = bot.actor && bot.actor.kit.g.circle;
    if (cir && cir.end > view.t + 1 && hypot2(cir.x - px, cir.y - py) > cir.r - 18) pen += 700;
    if (bounded && this.past(pen, negs, a, b, bs)) return pen;
    // a friendly healing pool (Moonwell): worth stepping into if it's close, for everyone but the tank
    // (a Lanternkeeper's glows count once however many overlap, so stacked lights never outweigh a telegraph)
    if (bot.role !== 'tank') { let lit = false; for (const pl of view.pools || []) if (hypot2(pl.x - px, pl.y - py) < pl.r - 25 && hypot2(pl.x - bot.x, pl.y - bot.y) < pl.r + 260) { if (pl.lamp) { if (lit) continue; lit = true; } pen -= 450; } }
    if (bounded && this.past(pen, 0, a, b, bs)) return pen;   // (the pool bonuses are all in now)
    // the closing edge: be well inside where the wall is about to jump to
    const en = view.edgeNext;
    if (en && en.at - view.t < 6) { const over = hypot2(px, py) - (en.r - 60); if (over > 0) pen += 5000 + over * 50; }
    // (Hard) a wedge of the summit about to break away: off it
    const pc = view.pendingCut;
    if (pc && pc.at - view.t < 7) {
      let d = Math.atan2(py, px) - pc.a0; d -= Math.floor(d / (Math.PI * 2)) * Math.PI * 2;
      const over = hypot2(px, py) - (pc.r - 60);
      if (d <= pc.a1 - pc.a0 + 0.08 && over > 0) pen += 5000 + over * 50;
    }
    // (a pool over your own tower: a tick or two is cheaper than the tower failing on everyone)
    const inMine = (view.puddles.length || (view.room && view.room.threads)) && view.mechs.some(m => m.type === 'tower' && m.resolveAt - view.t < 5 && hypot2(m.shape.x - px, m.shape.y - py) < m.shape.r - 18 && this.towerFor(me, view) === m.id);
    for (const pd of view.puddles) if (hypot2(pd.x - px, pd.y - py) < pd.r + 28) pen += inMine ? 2200 : 4000;
    // rolling meatballs (and drifting orbs): their whole lane shows from the cast, so keep off any stretch a ball has
    // still to roll over, the more the sooner it gets there
    const rdt = this.rollerIn(view, px, py, 45);
    if (rdt < 1.5) pen += 7000;
    else if (rdt < 6) pen += 9000 / (rdt + 0.5);
    if (bounded && this.past(pen, 0, a, b, bs)) return pen;
    // her Eightfold Lunge: the lit legs show every strike's direction ahead of its telegraph
    for (const e of view.lungePlan || []) {
      const dt = e.at - view.t;
      if (dt < -0.1 || dt > 4.5) continue;
      if (SHAPES.contains(e.shape, px, py, 30)) pen += 6000 / (0.5 + Math.max(0, dt));
    }
    // being reeled in: get away from her mouth
    if ((view.reels || []).some(r => r.pid === me)) pen += Math.max(0, 420 - hypot2(px - view.boss.x, py - view.boss.y)) * 12;
    // tethers: stretch a long one, stay close on a short one
    for (const th of view.tethers || []) {
      if (th.a !== me && th.b !== me) continue;
      const other = alive.find(o => o.id === (th.a === me ? th.b : th.a));
      if (!other) continue;
      const d = hypot2(other.x - px, other.y - py);
      if (th.kind === 'long' && d < th.len + 70) pen += (th.len + 70 - d) * 25;
      if (th.kind === 'short' && d > th.len - 50) pen += (d - th.len + 50) * 25;
    }
    if (bounded && this.past(pen, 0, a, b, bs)) return pen;
    // sticky floor slows you down; beams between linked adds burn
    for (const z of view.zones || []) if (SHAPES.contains(z.shape, px, py, 10)) pen += z.effect === 'burn' ? (view.t > z.startAt - 2 ? 6000 : 400) : 350;
    // the room: nobody stands inside a solid prop; grease is best kept clear of, and burning grease avoided
    for (const pr of view.props || []) if (pr.solid && PROPS.sd(pr, px, py) < 16) pen += 9000;
    if (bounded && this.past(pen, 0, a, b, bs)) return pen;
    // Squall Line (Volkar): stay inside the safe circle as it drifts, where it will be in a moment
    if (view.room && view.room.inSquall && !(view.room.inSquall(px, py, view.t + 0.7, 40) && view.room.inSquall(px, py, view.t, 20))) pen += 7000;
    // floor that has fallen away, or is about to (Skitterra's collapse): stay on the silk
    if (view.room && view.room.safe && !view.room.safe(px, py, true)) pen += view.room.safe(px, py) ? 9000 : 20000;
    for (const th of (view.room && view.room.threads) || []) if (!th.cut && segDist(px, py, th.x1, th.y1, th.x2, th.y2) < 26 && hypot2(px - th.kx, py - th.ky) > 50) pen += inMine ? 600 : 3000;
    // (grease a fire is about to reach counts as burning: a Flambé stripe, the stove line catching)
    const fires = this.firesOf(view);
    for (const fl of view.floor || []) {
      if (fl.kind !== 'grease' || hypot2(fl.x - px, fl.y - py) >= fl.r + 26) continue;
      pen += view.burning(fl) || fires.some(m => SHAPES.contains(m.shape, fl.x, fl.y, fl.r)) ? 5000 : 250;
    }
    for (const a of view.adds || []) {
      const o = a.link && a.linkDmg ? view.adds.find(x => x.id === a.link) : null;
      if (o && segDist(px, py, a.x, a.y, o.x, o.y) < 50) pen += 5000;
    }
    return pen;
  },

  move(bot, view) {
    if (bot.human && !bot.human.inner) return BotHuman.move(bot, view);   // (human-like play, below: off unless a bot carries .human)
    const prev = this._mc;
    this._mc = { view };
    try { return this.think(bot, view); } finally { this._mc = prev; }
  },
  think(bot, view) {
    // a Gorgemaw heading for a teammate's circle (mawTarget) makes the owner's spot its home until the circle has landed
    const mawT = bot.cls && bot.cls.id === 'gorgemaw' ? this.mawTarget(bot, view) : null, mawO = mawT && view.players.find(p => p.id === mawT.follow);
    const home = mawO ? { x: mawO.x, y: mawO.y } : this.freeOfProps(this.home(bot, view), view);
    bot.job = this.lanternJob(bot, view);
    // a thrown cleaver comes back along its line (Cleaver Toss): remember each line until the return has passed
    bot.backs = (bot.backs || []).filter(e => e.until > view.t);
    for (const m of view.mechs) if (m.tag === 'cleaver' && !bot.backs.some(e => e.id === m.id)) bot.backs.push({ id: m.id, shape: m.shape, from: m.resolveAt, until: m.resolveAt + 1.7 });
    const cands = [home, { x: bot.x, y: bot.y }];
    const rpGoal = view.runes && view.runes.on && view.runes.goal ? view.runes.goal[bot.id] : null;   // (Twin Brands: the bearer's own spot, a candidate however far, and worth wading to)
    if (rpGoal) cands.push({ x: rpGoal.x, y: rpGoal.y });
    if (bot.job) cands.push({ x: bot.job.x, y: bot.job.y });
    const cir = bot.actor && bot.actor.kit.g.circle;
    if (cir && cir.end > view.t + 1) cands.push({ x: cir.x + (bot.x - cir.x) * 0.3, y: cir.y + (bot.y - cir.y) * 0.3 });
    if (bot.role !== 'tank') for (const pl of view.pools || []) cands.push({ x: pl.x + (bot.x - pl.x) * 0.3, y: pl.y + (bot.y - pl.y) * 0.3 });
    for (const c of [{ x: bot.x, y: bot.y }, home]) {
      for (let i = 0; i < BOT_RING.length; i += 2) cands.push({ x: c.x + BOT_RING[i], y: c.y + BOT_RING[i + 1] });
    }
    // cones out of the boss (Eightfold Lunge, the swings): a ring of spots close around it, where a safe side is
    // only a short walk away when it turns
    if (view.mechs.some(m => m.shape.kind === 'cone' && m.type === 'aoe' && hypot2(m.shape.x - view.boss.x, m.shape.y - view.boss.y) < 60)) {
      for (const r of [125, 190]) for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; cands.push(ARENA.clamp({ x: view.boss.x + Math.cos(a) * r, y: view.boss.y + Math.sin(a) * r }, 50)); }
    }
    // a Lunge on its way (her lit legs): the same ring round wherever it strikes from (her husk's too)
    const lsrc = [];
    for (const e of view.lungePlan || []) if (e.at > view.t && !lsrc.some(q => hypot2(q.x - e.shape.x, q.y - e.shape.y) < 20)) lsrc.push(e.shape);
    for (const q of lsrc) for (const r of [110, 170, 240]) for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + Math.PI / 16; cands.push(ARENA.clamp({ x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r }, 50)); }
    const lungeGo = lsrc.length ? this.lungeSpot(bot, view) : null;
    if (lungeGo) cands.push(lungeGo);
    // tower centers and the stack target are good candidates too
    for (const m of view.mechs) {
      if (m.type === 'tower') {
        cands.push({ x: m.shape.x, y: m.shape.y });
        // a ball's lane over the tower: the spot on its rim farthest from the lane's middle (the shortest way out of it afterwards)
        for (const rl of [...(view.rollers || []), ...(view.rollPre || [])]) {
          if (view.t > rl.end) continue;
          const cs = Math.cos(rl.angle), sn = Math.sin(rl.angle);
          if (Math.abs(-(m.shape.x - rl.x) * sn + (m.shape.y - rl.y) * cs) > rl.r + 60) continue;
          for (const sg of [-1, 1]) cands.push({ x: m.shape.x - sn * sg * (m.shape.r - 24), y: m.shape.y + cs * sg * (m.shape.r - 24) });
        }
      }
      if (m.type === 'stack') { const o = view.players.find(p => p.id === m.follow); if (o) cands.push({ x: o.x, y: o.y }); }
      if (m.shape.kind === 'donut') cands.push({ x: m.shape.x + (bot.x - m.shape.x) * 0.3, y: m.shape.y + (bot.y - m.shape.y) * 0.3 });
      if (m.safe) for (const q of m.safe) cands.push({ x: q.x, y: q.y });
      // Hard's dance: the snare pockets, your own grave, your corner for the Writ
      if (m.type === 'safe' && m.shape.kind === 'circle') for (const [dx, dy] of [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) cands.push({ x: m.shape.x + dx * m.shape.r, y: m.shape.y + dy * m.shape.r });
      // ... the Supercell's lanes of still air (a strip from a rod out to the wall): spots along it, near the rod first
      if (m.type === 'safe' && m.shape.kind === 'rect') for (const d of [30, 75, 130, 200, 290]) for (const off of [-0.2, 0.2]) {
        const s = m.shape, c = Math.cos(s.angle), sn = Math.sin(s.angle);
        cands.push({ x: s.x + c * d - sn * off * s.w, y: s.y + sn * d + c * off * s.w });
      }
      if ((m.tag === 'mgSeed' || m.tag === 'svSeed') && m.follow === bot.id && view.t < m.resolveAt - (m.lockAt || 0)) { const sp = this.seedSpot(bot.id, view); if (sp) cands.push(sp); }
      if (m.type === 'drop' && m.follow === bot.id && (m.tag === 'platedrop' || m.tag === 'groundrod' || m.tag === 'clEmber')) { const sp = m.tag === 'platedrop' ? this.rushSpot(bot.id, view) : m.tag === 'clEmber' ? this.emberSpot(bot.id, view) : this.rodSpot(bot.id, view); if (sp) cands.push(sp); }
      if (m.type === 'own' && m.target === bot.id) cands.push({ x: m.shape.x, y: m.shape.y });
      if (m.type === 'bait' && m.aimFromBoss === bot.id) cands.push(this.writSpot(bot.id, view));
      // cover: spots in the shadow of the prop this bot takes (and of the others, in case it's full)
      if (m.cover) {
        const mine = this.coverFor(bot.id, view, m);
        for (const pr of (view.props || []).filter(p => p.cover && (p === mine || hypot2(p.x - bot.x, p.y - bot.y) < 500))) {
          for (const back of [24, 55]) for (const side of [-0.5, 0, 0.5]) cands.push(PROPS.shadowSpot(m.src.x, m.src.y, pr, back, side));
        }
      }
      if (m.tag === 'charge' && m.aimFromBoss === bot.id) { const bt = this.chargeBait(view); if (bt) cands.push(bt); }
      if (m.type === 'dark' && m.lights) for (const l of m.lights()) for (let i = 0; i < 6; i++) cands.push({ x: l.x + Math.cos(i * 1.05 + bot.id) * 60, y: l.y + Math.sin(i * 1.05 + bot.id) * 60 });
      // Volkar: beside your polarity partner, and in the still air behind each rod (also the half of a rod's circle
      // away from him, for catching a rod and sheltering behind it at once)
      if (m.type === 'polarity' || m.tag === 'crash') { const pt = this.partner(bot.id, view); if (pt) cands.push({ x: pt.x + (bot.x > pt.x ? 30 : -30), y: pt.y }); }
      if (m.tag === 'rodstrike' && m.follow === bot.id) {
        const st = this.stoneFor(bot.id, view);
        if (st) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cands.push({ x: st.x + Math.cos(a) * (st.r + 28), y: st.y + Math.sin(a) * (st.r + 28) }); }
      }
      if (m.type === 'gale') {
        for (const c of this.covers(view)) {
          const a = Math.atan2(c.y - view.boss.y, c.x - view.boss.x);
          for (const d of [30, 70]) cands.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d });
        }
      }
    }
    // Skitterra's threads: their knots are the safe gaps to step through on the way somewhere
    if (view.mechs.some(m => m.type === 'tower')) for (const th of (view.room && view.room.threads) || []) if (!th.cut && th.kx != null) cands.push({ x: th.kx, y: th.ky });
    // Storm Walls with boulders down: the still air behind each one
    for (const sw of view.sweeps || []) if (sw.cover) for (const pr of (view.props || []).filter(p => p.kind === sw.cover)) for (const back of [26, 50]) cands.push(PROPS.shadowSpot(sw.x, sw.y, pr, back));
    // tether partner: right next to them, or straight away from them
    for (const th of view.tethers || []) {
      if (th.a !== bot.id && th.b !== bot.id) continue;
      const o = view.players.find(p => p.id === (th.a === bot.id ? th.b : th.a));
      if (!o) continue;
      if (th.kind === 'short') { cands.push({ x: o.x + (bot.x - o.x) * 0.3, y: o.y + (bot.y - o.y) * 0.3 }); continue; }
      const a = Math.atan2(bot.y - o.y, bot.x - o.x);
      for (const da of [0, 0.5, -0.5]) {
        const c = { x: o.x + Math.cos(a + da) * (th.len + 110), y: o.y + Math.sin(a + da) * (th.len + 110) };
        cands.push(ARENA.clamp(c, 60));
      }
    }
    // walking there: don't cross a burning beam, and don't wade through pools
    const beams = [];
    for (const a of view.adds || []) { const o = a.link && a.linkDmg ? view.adds.find(x => x.id === a.link) : null; if (o && a.id < o.id) beams.push([a, o]); }
    // Storm Walls: where each turning wall will be when we get to each point along the way (and a moment after)
    const sweeps = (view.sweeps || []).filter(sw => view.t > sw.startAt - 1.5 && view.t < sw.end);
    const inWall = (x, y, tt) => sweeps.some(sw => {
      if (tt < sw.startAt - 0.3 || tt > sw.end) return false;
      const a0 = sw.a0 + Math.max(0, tt - sw.startAt) * sw.spin;
      for (let k = 0; k < sw.arms; k++) {
        const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), s = Math.sin(a), dx = x - sw.x, dy = y - sw.y;
        if (dx * c + dy * s > -20 && Math.abs(-dx * s + dy * c) < sw.w / 2 + 34) return true;
      }
      return false;
    });
    // floor hits landing in the next few seconds: where along the way we'd be when each lands
    const speed = 230 * (view.debuffs(bot.id).slowed ? FIGHT.SLOWED : 1);
    const landing = view.mechs.filter(m => m.type === 'aoe' && m.resolveAt - view.t < 2.5 && !(m.follow === bot.id && m.resolveAt - view.t > (m.lockAt || 0)));
    const threads = (view.room && view.room.threads || []).filter(th => !th.cut);
    const rolling = (view.rollers || []).length + (view.rollPre || []).length > 0;
    // plates that leave you Stuffed (Order Up! on Hard) coming up soon that aren't ours: don't walk across one as it lands
    const myT = view.mechs.some(m => m.type === 'tower' && m.stuff) ? this.towerFor(bot.id, view) : null;
    const plates = view.mechs.filter(m => m.type === 'tower' && m.stuff && m.id !== myT && m.resolveAt - view.t < 3);
    const burns = (view.zones || []).filter(z => z.effect === 'burn' && (z.tag === 'writburn' || z.tag === 'drown' || z.tag === 'svSunk' || z.tag === 'svStump' || z.tag === 'svWall' || (bot.role === 'healer' && z.tag !== 'stovefire')) && view.t > z.startAt - 1);
    const pathCost = c => {
      let pen = 0;
      const dist = hypot2(c.x - bot.x, c.y - bot.y);
      for (const m of landing) {
        const q = Math.min(1, Math.max(0, m.resolveAt - view.t) * speed / Math.max(1, dist));
        if (SHAPES.contains(m.shape, bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, 22)) pen += 6000;
      }
      for (const [a, o] of beams) if (segsCross(bot.x, bot.y, c.x, c.y, a.x, a.y, o.x, o.y)) pen += 3000;
      for (const m of plates) {
        const q = Math.min(1, Math.max(0, m.resolveAt - view.t) * speed / Math.max(1, dist));
        if (hypot2(bot.x + (c.x - bot.x) * q - m.shape.x, bot.y + (c.y - bot.y) * q - m.shape.y) < m.shape.r + 24) pen += 5000;
      }
      // a ball's lane: don't be crossing it as the ball comes through
      if (rolling) for (const q of [0.2, 0.4, 0.6, 0.8, 1]) {
        const at = view.t + dist * q / speed;
        if (this.rollerSpans(view, bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, 30).some(([a, b]) => at > a - 0.35 && at < b + 0.25)) { pen += 6000; break; }
      }
      // Skitterra's threads sting and root whoever walks through them; her collapse leaves only the silk to walk on
      // (by its knot a thread is safe to step over)
      for (const th of threads) if (segsCross(bot.x, bot.y, c.x, c.y, th.x1, th.y1, th.x2, th.y2) && !(th.kx != null && segDist(th.kx, th.ky, bot.x, bot.y, c.x, c.y) < 38)) pen += 2500;
      if (view.room && view.room.safe && view.room.fallen !== Infinity) for (const q of [0.2, 0.4, 0.6, 0.8]) if (!view.room.safe(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q)) pen += 15000;
      for (const pd of view.puddles) if (hypot2(pd.x - bot.x, pd.y - bot.y) > pd.r + 20 && segDist(pd.x, pd.y, bot.x, bot.y, c.x, c.y) < pd.r + 20) pen += 1200;
      // burning strips (the Writ's spokes): don't walk through one
      for (const z of burns) for (const q of [0.25, 0.5, 0.75]) if (SHAPES.contains(z.shape, bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, 16)) { pen += rpGoal && z.tag === 'svSunk' ? 250 : 3000; break; }
      if (sweeps.length) {
        const d = hypot2(c.x - bot.x, c.y - bot.y), arrive = d / 230;
        for (const q of [0.25, 0.5, 0.75, 1]) if (inWall(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, view.t + arrive * q)) pen += 5000;
        // and the next half second by the clock (a long walk's quarter marks can all fall after the walls' last turn)
        for (const dt of [0.15, 0.3, 0.5]) { const q = dt / Math.max(0.01, arrive); if (q < 0.25 && inWall(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, view.t + dt)) pen += 5000; }
        for (const extra of [0.4, 0.9]) if (inWall(c.x, c.y, view.t + arrive + extra)) pen += 3000;
      }
      return pen;
    };
    let best = null, bs = Infinity, bd = 0;
    const score = c => {
      const a = hypot2(c.x - home.x, c.y - home.y) * 1.2, b = hypot2(c.x - bot.x, c.y - bot.y) * 0.6;
      const d = this.danger(bot, c.x, c.y, view, a, b, bs);
      // (pathCost only ever adds penalties, never less than 0, and a rounded sum can't shrink when a term that is at least 0 is
      // added: a spot that cannot beat the best so far even before the walk is priced cannot after it either)
      if (d + a + b >= bs) return;
      const s = d + pathCost(c) + a + b;
      if (s < bs) { bs = s; best = c; bd = d; }
    };
    for (const c of cands) score(c);
    // a Lunge being walked through (BotAI.lungeSpot): the spot that is clear of every strike goes unless something else
    // there is bad as well (the lunge's own cones are left out of that look)
    if (lungeGo && bd > 0) {
      const bare = Object.assign({}, view, { lungePlan: [] });
      if (this.danger(bot, lungeGo.x, lungeGo.y, bare) < 2500 && pathCost(lungeGo) < 5500) return lungeGo;
    }
    // nowhere close is safe (a knight's replayed sweep from the far wall covers everything near): look farther out
    if (bd > 4000) for (const r of [460, 600]) for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + 0.26;
      score(ARENA.clamp({ x: bot.x + Math.cos(a) * r, y: bot.y + Math.sin(a) * r }, 50));
    }
    // mid-cast where nothing is about to land: finish it there (a step would interrupt it), as a player would
    const kit = bot.actor && bot.actor.kit;
    if (kit && kit.cast && kit.cast.end - kit.now < 2.6 && hypot2(best.x - bot.x, best.y - bot.y) > 6 && this.danger(bot, bot.x, bot.y, view) < 400) return { x: bot.x, y: bot.y };
    return best;
  },

  // Tanks: what to taunt right now, if anything: the boss when it's on someone who isn't a tank (only while no tank
  // stood: fight.js tank()), otherwise an add in reach that's chewing on someone else. Nobody else can pull the boss off
  // a standing tank, so damage dealers' threat never holds the taunt back.
  tauntTarget(bot, view) {
    if (bot.role !== 'tank' || typeof TAUNT === 'undefined') return null;
    const al = view.players.filter(p => p.alive), byId = id => al.find(p => p.id === id);
    const notTank = id => { const p = byId(id); return !!p && p.role !== 'tank'; };
    const reach = (x, y, r) => hypot2(x - bot.x, y - bot.y) - r <= TAUNT.range;
    const b = view.boss;
    if (!b.untargetable && view.bossTarget != null && view.bossTarget !== bot.id && notTank(view.bossTarget) && reach(b.x, b.y, FIGHT.BOSS_R)) return 'boss';
    if (!byId(bot.id)) return null;
    for (const a of view.adds || []) if (a.target != null && a.target !== bot.id && notTank(a.target) && !(a.fix && a.fix.until > view.t) && reach(a.x, a.y, a.r)) return a.id;
    return null;
  },
  // Skitterra's Eightfold Lunge, planned through: her lit legs give every strike (a cone and its opposite, turning 45
  // degrees a step) and the moment it lands, so work out a path round her that is clear of each strike as it lands and
  // reachable from the last: the spot to stand at now (or null when no way through is found, or no lunge is coming).
  // Rings of spots round the strikes' source, each step's clear ones, the walk between two steps no longer than a bot's
  // legs allow; of the clear first spots the ones that stay clear a step longer, then the nearest, win.
  lungeSpot(bot, view) {
    const plan = (view.lungePlan || []).filter(e => e.at > view.t - 0.05 && e.at < view.t + 9);
    if (!plan.length) return null;
    const src = plan[0].shape, times = [...new Set(plan.map(e => Math.round(e.at * 20) / 20))].sort((a, b) => a - b);
    if (times.length > 12) times.length = 12;
    const spots = [];
    for (const r of [75, 120, 170, 230, 300]) for (let i = 0; i < 36; i++) {
      const a = i * Math.PI / 18 + (r % 3) * 0.04, p = { x: src.x + Math.cos(a) * r, y: src.y + Math.sin(a) * r };
      if (ARENA.sd(p.x, p.y) < -60 && !(view.props || []).some(pr => pr.solid && PROPS.sd(pr, p.x, p.y) < 20)) spots.push(p);
    }
    if (!spots.length) return null;
    const SPEED = 215, ok = spots.map(() => times.map(() => true));
    times.forEach((tk, k) => {
      const cones = plan.filter(e => Math.abs(e.at - tk) < 0.06);
      spots.forEach((p, j) => { if (cones.some(e => SHAPES.contains(e.shape, p.x, p.y, 20))) ok[j][k] = false; });
    });
    // from the last step back: a spot is good at step k if it is clear then and some good spot at k+1 is a walk away
    const good = spots.map(() => times.map(() => false));
    for (let k = times.length - 1; k >= 0; k--) for (let j = 0; j < spots.length; j++) {
      if (!ok[j][k]) continue;
      if (k === times.length - 1) { good[j][k] = true; continue; }
      const reach = Math.max(0, times[k + 1] - times[k] - 0.3) * SPEED;
      for (let j2 = 0; j2 < spots.length; j2++) if (good[j2][k + 1] && hypot2(spots[j2].x - spots[j].x, spots[j2].y - spots[j].y) <= reach) { good[j][k] = true; break; }
    }
    // the first step still ahead is the one to be clear at; the bot gets there in the time it has left
    let best = null, bs = Infinity;
    const lead = Math.max(0, times[0] - view.t - 0.25) * SPEED;
    for (let j = 0; j < spots.length; j++) {
      if (!good[j][0]) continue;
      const d = hypot2(spots[j].x - bot.x, spots[j].y - bot.y);
      if (d > lead + 20) continue;
      const stays = times.length > 1 && ok[j][1] ? 0 : 60;
      const s = d + stays;
      if (s < bs) { bs = s; best = spots[j]; }
    }
    return best;
  },
  // what the party is about to take, per player on average, from the telegraphs landing in the next  seconds
  // (raidwides, stacks, spreads and the like, before mitigation) as a share of a damage dealer's health
  incoming(view, secs) {
    const al = view.players.filter(p => p.alive && !p.left);
    if (!al.length || !view.dmgScale) return 0;
    let sum = 0;
    for (const m of view.mechs) {
      const dt = m.resolveAt - view.t;
      if (dt > secs || dt < -0.1 || !m.dmg) continue;
      const raw = m.dmg * view.dmgScale;
      if (m.type === 'raidwide') sum += raw;
      else if (m.type === 'stack') sum += raw * 0.9;
      else if (m.type === 'spread') sum += raw / Math.max(1, al.length - 1);
      else if (m.type === 'proximity') sum += raw * 0.4;
    }
    const mx = al.filter(p => p.role !== 'tank').reduce((a, p) => a + p.maxHp, 0) / Math.max(1, al.filter(p => p.role !== 'tank').length);
    return sum / (mx || 1050);
  },
  // something on the floor (or being cast) that will hurt most of the party within `s` seconds: a raidwide, a blast you
  // hide from, a stack, spreads, plates, the sky falling. Healers top everyone up ahead of it.
  partyHitSoon(view, s) {
    if (view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < s) return true;
    return view.mechs.some(m => m.resolveAt - view.t < s && (m.type === 'raidwide' || m.type === 'proximity' || m.type === 'stack' ||
      m.type === 'spread' || m.type === 'tower' || m.type === 'polarity' || (m.cover && m.type === 'aoe')));
  },
  // the rollers (live, and lanes still being cast: view.rollPre): when each would be over the spot (x, y), as
  // [enter, exit] in fight time; `pad` is the margin past the ball's own radius
  rollerSpans(view, x, y, pad) {
    const out = [];
    for (const rl of [...(view.rollers || []), ...(view.rollPre || [])]) {
      if (view.t > rl.end) continue;
      const c = Math.cos(rl.angle), s = Math.sin(rl.angle), dx = x - rl.x, dy = y - rl.y;
      const along = dx * c + dy * s, perp = Math.abs(-dx * s + dy * c), w = rl.r + pad;
      if (perp > w || along < -w) continue;
      const half = Math.sqrt(w * w - perp * perp), enter = rl.rollAt + Math.max(0, along - half) / rl.speed, exit = rl.rollAt + (along + half) / rl.speed;
      if (exit < view.t || enter > rl.end) continue;
      out.push([enter, exit]);
    }
    return out;
  },
  // seconds until a ball is over this spot (Infinity if none is coming)
  rollerIn(view, x, y, pad) {
    let best = Infinity;
    if (!(view.rollers || []).length && !(view.rollPre || []).length) return best;   // (no ball anywhere: nothing to find)
    for (const [enter] of this.rollerSpans(view, x, y, pad)) best = Math.min(best, Math.max(0, enter - view.t));
    return best;
  },

  // Should a bot press its Ultimate (T) now? ctx: { mods (the party's buffs), dpsCheck, healCheck, bossFrac } from
  // RaidHost. Damage classes open their window into the party's burst (a damage buff up), a damage check or the
  // boss's last 15%; tanks take it just before a tankbuster aimed at them lands, or in a heal check; healers when
  // three allies are under 60% or a raidwide is next in the feed. Nobody sits on a full one for long (held).
  ult(bot, k, view, ctx) {
    if (!k.ultFull()) { bot.ultFullAt = null; return false; }
    const t = view.t, held = t - (bot.ultFullAt ?? (bot.ultFullAt = t));
    if (k.cast) return false;
    // (ult.botOk: the class's own "worth pressing now", e.g. Focus pooled or a swing stored; ignored past 30s held)
    if (bot.role === 'dps') return (!k.ult.botOk || k.ult.botOk(k) || held > 30) && (ctx.mods.dmg > 0 || ctx.dpsCheck || ctx.bossFrac < 0.15 || held > 20 || !!(k.ult.burst && k.has(k.ult.burst)) || !!(view.posture && view.posture[2] > 0.5));   // (a Kenseier's Break is the party's window: cash in)
    const tid = bot.role === 'tank' && bot.cls && bot.cls.id;
    const onMe = m => (m.target ?? m.follow) == null || (m.target ?? m.follow) === bot.id;
    const buster = !!tid && (view.mechs.some(m => m.type === 'buster' && m.resolveAt - t < 3 && onMe(m)) ||
      !!(view.bossCast && BUSTER_SEEN.test(view.bossCast.name) && view.bossCast.left < 3 && view.bossTarget === bot.id));
    // (a Gorgemaw never bites with a tankbuster on its way: the lock would cost it the Open Wide that eats the buster)
    if (tid === 'gorgemaw' && buster) return false;
    // (a Kenseier's Flash of Ash is a Break on demand: into the party's burst, never into a Break already open, and not with a blow
    // inside its animation lock's reach, which a press would cost the deflect)
    if (tid === 'kenseier') return !(view.posture && view.posture[2] > 0) && !BotAI.kenHits(bot, view, 0).some(h => h.at - t < 1.3) && (!!view.burst || held > 12);
    if (held > 35) return true;
    if (bot.role === 'tank') {
      if (ctx.healCheck) return true;
      // the tanks whose Ultimate cashes in what they hold wait for something worth cashing (still inside the 35s):
      // the Oathbroker a Ledger of 15% of its HP (a buster just written in), the Gorgemaw a Spike in the Belly (a buster
      // just eaten) or a full one, the Runeguard a Rune before a buster or three Runes with its Ward up
      const mx = k.env.maxHp ? k.env.maxHp() : 0, belly = k.g.belly || [];
      if (tid === 'oathbroker') return mx > 0 && (k.g.total || 0) >= mx * 0.15;
      if (tid === 'gorgemaw') return belly.some(m => m.m === 'spike') || belly.length >= mawMax(k);
      if (tid === 'runeguard') return (buster && (k.g.runes || 0) >= 1) || ((k.g.runes || 0) >= 3 && !!k.g.selfWard);
      // the Gloomsworn pours out the vessel: worth pressing with real Gloom in it (and best just before a buster), never while Hollow
      if (tid === 'gloomsworn') return !k.has('hollow') && ((k.g.gloom || 0) >= 70 || (buster && (k.g.gloom || 0) >= 40));
      return buster;
    }
    const al = view.players.filter(p => p.alive && !p.left), low = al.filter(p => p.hp / p.maxHp < 0.6).length;
    // (a healer's Ultimate that heals what already happened, `after`: Dawn Breaks, Time Reversal, waits for the hurt)
    if (k.ult.after) return low >= 3 || (low >= 2 && al.some(p => p.hp / p.maxHp < 0.35));
    const nx = (view.next || [])[0];
    return low >= 3 || !!(nx && RAID_CASTS.test(nx[0]) && nx[1] < 6) || !!(view.bossCast && RAID_CASTS.test(view.bossCast.name));
  },

  // pick an ability index for this bot (or null)
  act(bot, k, view) {
    if (bot.human && !bot.human.inner) return BotHuman.act(bot, k, view);
    BUSTER_SEEN.learn(view);
    const ab = i => k.abilities[i];
    const readyIdx = i => { const a = ab(i); return a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);   // a spec's replacement answers to the base id
    const party = view.players.filter(p => !p.left);
    const hurt = party.filter(p => p.alive).map(p => ({ p, f: p.hp / p.maxHp })).sort((a, b) => a.f - b.f);
    const dead = party.filter(p => !p.alive);
    const moving = bot.moving;
    // the boss's next tankbuster in the upcoming-moves feed: [name, seconds until its cast starts]
    const nextBuster = (view.next || []).find(([n]) => BUSTER_CASTS.test(n));
    const nextTankBuster = (view.next || []).find(([n]) => BUSTER_SEEN.test(n));   // (tanks hold their cooldowns for every buster the boss has laid)
    // ... and party-wide damage being cast, or close in the feed
    const raidSoon = (view.next || []).some(([n, s]) => s < 6 && RAID_CASTS.test(n)) || !!(view.bossCast && RAID_CASTS.test(view.bossCast.name));
    if (bot.cls.id === 'alembist') return BotAI.alembist(bot, k, view);   // brews ahead and throws (below)
    if (bot.cls.id === 'threadweaver') return BotAI.threadweaver(bot, k, view);   // keeps a web (classes-c, below)
    if (bot.cls.id === 'tidecaller') return BotAI.tidecaller(bot, k, view);   // rides the tide (class 20, below)
    if (bot.cls.id === 'lanternkeeper') return BotAI.lanternkeeper(bot, k, view);   // lights the floor where the party stands (class 21, below)
    // healers: raise, then keep people up
    if (bot.role === 'healer') {
      if (dead.length) {
        // who first: whoever asked for it from the Down screen, then a human, then a healer, then a tank
        const asked = BotAI.raiseFirst(dead, view);
        const first = asked || dead.slice().sort((a, b) => (b.id < 1000) - (a.id < 1000) || (b.role === 'healer') - (a.role === 'healer') || (b.role === 'tank') - (a.role === 'tank'))[0];
        const r = k.abilities.findIndex(a => a.allowDead && a.type === 'gcd');
        // a raise is a long cast, and a healer shuffling after the boss is nearly always moving: rather than wait for a
        // still moment that never comes, stop and cast it whenever standing here is about as safe as where it's headed
        // (raid-host holds the bot still until stillUntil, and lets it go the moment that stops being true). Not while
        // someone still standing is about to drop: keep them up first (an asked-for raise waits only for someone lower).
        // (the target first: a raise's cast time can depend on who it's aimed at, kits.js targetDown)
        const was = bot.healTarget;
        bot.healTarget = first.id;   // (aimed first: whether the raise is ready can depend on who it lands on, kits.js Intervention's lockout)
        if (r >= 0 && readyIdx(r) && !(hurt[0] && hurt[0].f < (asked ? 0.25 : 0.35))) {
          const ct = k.castTime(ab(r)) || 0;
          if (!ct || BotAI.stillOk(bot, view)) { if (ct) bot.stillUntil = view.t + ct + 0.15; bot.raiseFor = { id: first.id, until: view.t + ct + 0.5 }; return r; }
        }
        bot.healTarget = was;
        const rw = idx('rewind');
        // (Rewind only brings back someone who fell in the last few seconds, and not the one a Recall is already on)
        const dsn = bot.deadSince || (bot.deadSince = {}); for (const d of dead) { const e = dsn[d.id]; if (!e || view.t - e.last > 1) dsn[d.id] = { first: view.t, last: view.t }; else e.last = view.t; }
        const rwD = dead.filter(d => view.t - dsn[d.id].first < 3.4 && !(bot.raiseFor && bot.raiseFor.until > view.t && bot.raiseFor.id === d.id));
        if (rw >= 0 && readyIdx(rw) && rwD.length) { bot.healTarget = (rwD.find(d => d.id === first.id) || rwD[0]).id; return rw; }
      }
      let low = hurt[0];
      // a Gloomsworn gone Hollow (held at 1 HP, its damage written down as a debt): heal it until the debt is covered
      const hollowN = BotAI.hollowNeed(view);
      if (hollowN) low = { p: hollowN.p, f: Math.min(low ? low.f : 1, 0.04) };
      // a tankbuster is coming (being cast, or next in the feed, any boss's): get the tank topped first. (Not earlier than 4s: a
      // longer look ahead kept the healer on the tank while the party sat low into the next raidwide, on a boss with frequent busters)
      const bEta = BotAI.busterEta(view), busterSoon = bEta < 5.5;
      const tankH = hurt.find(h => h.p.role === 'tank');
      if (bEta < 4 && tankH && tankH.f < 0.85 && (!low || low.f > 0.3)) low = { p: tankH.p, f: Math.min(tankH.f, 0.5) };
      // a raidwide is being cast, or about to land
      const raidBegins = !!(view.bossCast && RAID_CASTS.test(view.bossCast.name)) || view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 3);
      // (a raidwide is close and the healer is the one short of health: its own life first, unless the tank is nearly gone; a healer has no more health than a damage dealer)
      const meH = hurt.find(h => h.p.id === bot.id);
      if (meH && (raidBegins || raidSoon) && meH.f < 0.85 && low && low.p.id !== bot.id && low.f > 0.3) low = meH;
      // a chosen-ally buff (Benediction's Blessed, Rebirth's Wildheart, Accelerando's Quickened) on the top damage dealer
      const buffI = BotAI.allyBuff(bot, k, view, hurt, moving, busterSoon);
      if (buffI != null) return buffI;
      // talents of the cleric, grovekeeper and chronomancer that want their own play (BotAI.healerTalents, below)
      const talI = BotAI.healerTalents(bot, k, view, { hurt, low, busterSoon, raidBegins, moving, tankH });
      if (talI != null) return talI;
      // Grovekeeper plants Rejuvenate ahead of damage: always on the tank, and on anyone a bit hurt
      if (bot.cls.id === 'grovekeeper' && k.gcdRemaining() <= 0 && !k.cast) {
        const ri = idx('rejuv'), has = id => k.g.rejuvs.some(r => r.t === id);
        const tank = hurt.find(h => h.p.role === 'tank');
        const want = (tank && !has(tank.p.id)) ? tank : hurt.find(h => h.f < 0.85 && !has(h.p.id));
        if (want && readyIdx(ri)) { bot.healTarget = want.p.id; return ri; }
      }
      // a buster is coming: put a shield on the tank first (Benediction, an Aegis's Petals and Divine Barrier)
      if (busterSoon && tankH) {
        for (let i = 0; i < k.abilities.length; i++) {
          const a = ab(i);
          if (a.target !== 'ally' || !/shield|dome/i.test(a.desc) || !readyIdx(i)) continue;
          if (a.type === 'gcd' && (k.gcdRemaining() > 0 || k.cast || (moving && k.castTime(a)))) continue;
          bot.healTarget = tankH.p.id; return i;
        }
      }
      // Chronomancer: Bolts heal the link, and Rewind moves the link. Keep it on the tank: re-link before a buster
      // or when the tank sags, and only spend Rewind on someone else when they're in real danger.
      if (bot.cls.id === 'chronomancer' && tankH) {
        const rw = idx('rewind');
        if (rw >= 0 && readyIdx(rw) && k.g.link !== tankH.p.id && (busterSoon || tankH.f < 0.7 || (low && low.f > 0.45))) { bot.healTarget = tankH.p.id; return rw; }
        // Rewind is also the big heal (it turns the tank back to how healthy it was a few seconds ago), and on the tank
        // it keeps the link where it belongs
        if (rw >= 0 && readyIdx(rw) && tankH.f < 0.35) { bot.healTarget = tankH.p.id; return rw; }
        if (low && low.p.id !== tankH.p.id && low.f >= 0.4) low = tankH.f < 0.8 ? tankH : low;
      }
      if (bot.cls.id === 'grovekeeper' && readyIdx(idx('bloom')) && hurt.some(h => h.f < 0.8 && k.g.rejuvs.some(r => r.t === h.p.id))) return idx('bloom');
      // party-wide damage due soon: heal people up further ahead of it
      const top = raidSoon || BotAI.partyHitSoon(view, 5) ? 0.17 : 0;
      // (a healer spends its Smite and Dawnstar on the boss while nobody is truly hurt: on the two bursty fights that pays more than
      // topping people up from 80%; Grubnak's grease and fire chip at everyone all the time, so there they are kept topped up)
      const lazy = view.bossId === 'skitterra' || view.bossId === 'volkar' ? 0.1 : 0;
      if (low && low.f < 0.8 - lazy + top) {
        bot.healTarget = low.p.id;
        const avgLow = hurt.filter(h => h.f < 0.8).length >= 3;
        for (let i = 0; i < k.abilities.length; i++) {
          const a = ab(i);
          if (a.type !== 'ogcd' || !readyIdx(i)) continue;
          if ((a.replaces || a.id) === 'growth' && a.id !== 'growth') {   // Moonwell: on whoever has the most of the party around them
            if (!avgLow) continue;
            const near = q => party.filter(o => o.alive && hypot2(o.x - q.x, o.y - q.y) < 150).length;
            bot.healTarget = party.filter(q => q.alive).sort((x, y) => near(y) - near(x))[0].id;
            return i;
          }
          if (a.target === 'ally' && low.f < 0.6 && (a.replaces || a.id) !== 'accel') return i;   // (Accelerando's ally is for damage: BotAI.allyBuff)
          if (['prayer', 'growth', 'bloom', 'accel'].includes(a.replaces || a.id) && avgLow && !(BotAI.graceWindow(view).prep && low.f > 0.3)) return i;   // (kept for the party at 1 HP when Grace Withdrawn is close)
        }
        if (k.gcdRemaining() <= 0 && !k.cast) {
          // (Recall raises the dead but also heals the living heavily, so it counts as a heal here)
          const heals = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target === 'ally' && (!ab(i).allowDead || ab(i).id === 'recall') && readyIdx(i) &&
            !(k.talent('cleric_wings') && k.baseId(ab(i)) === 'petal' && low.p.id !== bot.id && (() => { const dx = low.p.x - bot.x, dy = low.p.y - bot.y, d = hypot2(dx, dy) || 1, go = Math.min(200, Math.max(0, d - 40)) / d; return BotAI.danger(bot, bot.x + dx * go, bot.y + dy * go, view) >= 400; })()));   // (Wings of Dawn: the Petal carries the cleric toward its ally, so not to a landing in a blast)
          const instant = heals.filter(i => !k.castTime(ab(i)));
          // (in real danger the quickest heal first; otherwise the big cast heal standing, the instant one on the move)
          if (low.f < 0.4 + top / 2 && instant.length) return instant[0];
          // (an instant heal first, a Petal say, which also builds toward damage; the cast heal is the fallback)
          // (a cast heal on the move: when this spot is clear and about as safe as the planned one, plant and cast it, as a player does for a heal that matters)
          const plant = i => { if (!moving) return i; const ct = k.castTime(ab(i)); if (ct && low.f < 0.55 && BotAI.stillOk(bot, view) && BotAI.danger(bot, bot.x, bot.y, view) < 400) { bot.stillUntil = view.t + ct + 0.15; return i; } return null; };
          if (low.f < 0.65 - lazy * 0.7 + top && heals.length) return instant.length && (moving || low.f > 0.55) ? instant[0] : plant(heals[0]);
          if (low.f < 0.78 - lazy + top && instant.length) return instant[0];
        }
      }
    }
    // a class with its own priority (BOT_CLASS, end of this file)
    const own = typeof BOT_CLASS !== 'undefined' && BOT_CLASS[bot.cls.id] && BOT_CLASS[bot.cls.id].act;
    if (own) return own(bot, k, view, moving);
    // the tank classes' talents (BotAI.tankTalents, below): null for a bot that holds none of them, so the rest plays as before
    if (bot.role === 'tank') { const tt = BotAI.tankTalents(bot, k, view); if (tt != null) return tt; }
    // a Ward that can go on an ally (Spellwarden): put it on whoever a heavy blow is about to land on
    const wardI = idx('ward');
    if (wardI >= 0 && k.abilities[wardI].target === 'ally' && readyIdx(wardI) && k.gcdRemaining() <= 0 && !k.cast) {
      const hit = view.mechs.find(m => m.type === 'buster' && m.resolveAt - view.t < 3 && (m.target ?? m.follow) != null && (m.target ?? m.follow) !== bot.id);
      if (hit) { bot.healTarget = hit.target ?? hit.follow; return wardI; }
      // ahead of a raidwide: the Ward goes on whoever it would help most (the lowest ally under 85%, else the healer), one Rune kept
      // back for a buster of its own; it refunds the Rune once it has taken half.
      const mineSoon = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4 && (m.target ?? m.follow) === bot.id);
      const raidIn = (view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 3) || BotAI.incoming(view, 4.5) >= 0.3;
      if (raidIn && !mineSoon && (k.g.runes || 0) >= 2 && view.t - (bot.wardAt ?? -99) > 7) {
        const allies = hurt.filter(h => h.p.id !== bot.id), low = allies[0], healer = allies.find(h => h.p.role === 'healer');
        const to = low && low.f < 0.85 ? low : healer || low;
        if (to) { bot.wardAt = view.t; bot.healTarget = to.p.id; return wardI; }
      }
    }
    // tanks: answer a buster aimed at them with a cooldown (and Brace timed for a Perfect Block)
    const myBuster = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id);
    if (bot.role === 'tank' && myBuster) {
      const left = myBuster.resolveAt - view.t;
      const mitigated = bot.mitUntil > view.t;
      for (let i = 0; i < k.abilities.length; i++) {
        const a = ab(i);
        if (!readyIdx(i)) continue;
        if (a.id === 'brace' && left < 0.6) return i;
        if (a.id === 'mirror' && left < 0.9 && !(view.t - (bot.mirrorAt ?? -9) < 3.2)) { bot.mirrorAt = view.t; return i; }   // (one Mirror Aegis per buster: with two charges the next tick would spend the second on the same blow)
        if (a.id === 'ward' && left < 3 && k.gcdRemaining() <= 0 && !k.cast) { bot.healTarget = bot.id; return i; }
        // (a blow a Perfect Block alone leaves most of the HP of is no reason to spend the big cooldown: it is kept for the one that would kill, e.g. the Sovereign's hot Brand)
        if (!mitigated && left < 3 && TANK_CDS.includes(a.id) && !BotAI.braceHolds(bot, k, view, myBuster) && !BotAI.reaverHolds(bot, k, view, myBuster, a)) { bot.mitUntil = view.t + 4; return i; }
      }
    }
    // a Pyromancer near overheating while badly hurt (the burn costs 15% of its HP): Vent, or let the Heat cool
    const meP = party.find(p => p.id === bot.id);
    const hotAndHurt = bot.cls.id === 'pyromancer' && k.g.heat >= 80 && meP && meP.hp / meP.maxHp < 0.35;
    // oGCDs: burst and damage when ready; mitigation when the tank is getting hit or a raidwide is coming
    const castingBig = view.bossCast && /Grease|Tenderize|Boil|Gorge|Last Call|Venom Mist|Silk Wrap|Tightening Web|Devour|Thunderclap|Titan Fist|Eye of the Storm|Skybreak|Skyfall|Barrow Knell|Grave Cleave|Moonset|Heavens Fall|Twin Fall|Gut Blast|Flare-Up|Last Orders|Boil Over|Thunderhead|Gorge|Family Meal/.test(view.bossCast.name);
    for (let i = 0; i < k.abilities.length; i++) {
      const a = ab(i);
      if (a.type !== 'ogcd' || !readyIdx(i)) continue;
      let markMit = false;
      // a Nightstalker's Shadowstep is a dodge too: take it just as a blow is about to land on this spot
      if (a.id === 'step' && k.def.spec === 'nightstalker' && BotAI.dollDanger(view, bot.x, bot.y, 0.8)) return i;
      // Shadow Dodge: the Shadowstep slips a blow only if it is taken as the cast ends (the last second and a half), so it waits for that
      if (a.id === 'step' && k.talent('shadowblade_dodge') && !(view.bossCast && view.bossCast.left < 1.5) && k.charges(a) < 2) continue;
      if (k.gcdRemaining() < 0.65 && !k.cast) continue;
      if (a.target === 'ally' || (hotAndHurt && a.id === 'fireblast')) continue;
      if (bot.role === 'tank' && BotAI.tankHold(k, a)) continue;   // (a tank talent's move with its own timing: BotAI.tankTalents)
      // a step that puts you behind the boss (Shadowstep) isn't taken with floor about to land: it could land you in it
      if (a.id === 'step' && view.mechs.some(m => ['aoe', 'safe', 'tower', 'proximity', 'gale', 'drop', 'gaze', 'stack', 'spread'].includes(m.type) && m.resolveAt - view.t < 2.5)) continue;
      // a Ranger pools Focus for Hunter's Mark: Rapid Fire only while it glows (90 Focus, or 25 inside the Mark, where it costs half)
      if ((a.id === 'rapid' || a.id === 'explosive') && !k.glows(a)) continue;
      // Focus Fire: a full quiver makes Quick Shot hit twice as hard, so the Focus is held for the Mark; Light Feet: Cloak is back often, so it tops the Focus up whenever there is room
      if ((a.id === 'rapid' || a.id === 'explosive') && k.talent('ranger_focusfire') && !k.has('markself')) continue;
      // Explosive Shot: a Piercing Arrow right after planting feeds the charge (as the simulator's pro does)
      if (a.id === 'pierce' && k.g.charge && k.talent('ranger_explosive') && (k.stacks('keen') || k.charges(a) === 2 || k.has('markself'))) return i;
      // (Disengage leaps 150 away from the boss: not into a telegraph about to land there)
      if (a.id === 'cloak' && (k.talent('ranger_lightfoot') || k.talent('ranger_disengage')) && k.g.focus <= 55 && !(k.talent('ranger_disengage') && (() => { const b = view.boss, dx = bot.x - b.x, dy = bot.y - b.y, d = hypot2(dx, dy) || 1; return BotAI.danger(bot, bot.x + dx / d * 150, bot.y + dy / d * 150, view) >= 400; })())) return i;
      // Firestep (a Pyromancer's blink, in Smolder's place): kept for the moment a mechanic sends the bot walking, for the instant Fireball on the way
      if (a.id === 'firestep' && !moving) continue;
      const defensive = a.id !== 'blossom' && a.id !== 'firestep' && /mitigate|party takes|less damage|immune|shield/i.test(a.desc) && !/Burst/.test(a.desc);   // (Death Blossom's smoke is a rider on a burst, not a reason to wait for damage)
      // Stasis is for the enrage; a tank's Undying and Mirror Aegis wait for the busters aimed at it (the tank branch above)
      // Stasis (the Chronomancer) holds the Bolts' heals: start it as party-wide damage comes in, let them go once it has landed
      if (a.id === 'stasis') { if (!k.g.stash ? raidSoon : k.now - k.g.stash.at > 2 && !raidSoon && hurt.filter(h => h.f < 0.85).length >= 2) return i; continue; }
      if (a.id === 'undying' || a.id === 'mirror') continue;
      // Brace is worth most as a Perfect Block: only right before a hit lands, and never spent while a buster is on the way
      if (a.id === 'brace') { if (!myBuster && castingBig && view.bossCast.left < 0.6) return i; continue; }
      // a cooldown that eases the whole party's damage (Prayer, Cloak of Shadows, Smolder, the banner): put up for the hits
      // the telegraphs show coming (BotAI.incoming), one more for each that is already running, not for every cast
      const partyMit = defensive && /party takes|whole party/i.test(a.desc) && !/Burst/.test(a.desc);
      if (partyMit && view.mitLog) {
        const running = view.mitLog.filter(t => t <= view.t && view.t - t < 9).length;
        const inc = BotAI.incoming(view, 4.5);
        if (!(inc >= 0.3 + running * 0.3 || (castingBig && view.bossCast.left < 3 && running === 0 && inc >= 0.15))) continue;
        markMit = true;
      } else if (defensive && !(castingBig && view.bossCast.left < 3)) continue;
      // a tank keeps what it answers busters with when the feed shows the next buster close
      if (bot.role === 'tank' && TANK_CDS.includes(a.id) && nextTankBuster && nextTankBuster[1] < 15 ) continue;
      if (a.id === 'shift') {
        const groupHurt = hurt.filter(h => h.f < 0.8).length >= 2;
        // (Haste heals the whole party: go early when party-wide damage is coming and people are already hurt)
        if (k.g.stance === 'slow' && ((k.g.flux >= 95 && !(k.talent('chronomancer_overwound') && raidSoon && !(view.bossCast && RAID_CASTS.test(view.bossCast.name)))) || (groupHurt && k.g.flux >= (raidSoon ? 25 : 40)) ||
          (k.def.spec === 'echoist' && view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left > 1.2 && k.g.flux >= 25) ||
          (BotAI.graceWindow(view).prep && BotAI.graceWindow(view).at < 4 && k.g.flux >= 40) || (view.bossCast && view.bossCast.name === 'Nightfall' && k.g.flux >= 20))) return i;   // (an Echoist's echoes come 3s after the Bolt: begin as the cast does. Grace Withdrawn: Haste as the party drops to 1 HP, so every Bolt heals all of them for Nightfall)
        // (back to Slow before the Flux runs dry, for Paradox)
        if (k.g.stance === 'haste' && ((k.talent('chronomancer_credit') ? !!k.g.owed && k.g.owed - k.now < 1.2 : k.g.flux < 14) || (!groupHurt && k.g.flux < 45 && hurt[0] && hurt[0].f < 0.6))) return i;
        continue;
      }
      if (markMit) view.mitLog.push(view.t);
      return i;
    }
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    if (hotAndHurt) { const v = idx('vent'); return readyIdx(v) ? v : null; }
    const gcds = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target !== 'ally' && readyIdx(i));
    const okToCast = i => !moving || !k.castTime(ab(i));
    // Opportunist: a Shadowblade's ready finisher waits for the boss's cast bar (a Strike meanwhile) and goes out inside it
    if (bot.cls.id === 'shadowblade' && k.talent('shadowblade_opportunist') && k.g.combo >= 4 && !view.bossCast && (view.next || []).some(([, s]) => s > 0 && s < 3)) { const s = idx('strike'); if (readyIdx(s)) return s; }
    // Phoenix Flight (a Pyromancer's talent in Vent's place) lights Hot Streak from 60 Heat: it goes out as soon as it is up
    if (bot.cls.id === 'pyromancer') { const v = idx('vent'); if (ab(v) && ab(v).id === 'phoenix' && readyIdx(v) && k.g.heat >= 60 && !k.has('hotstreak') && okToCast(v)) return v; }
    const glowing = gcds.filter(i => k.glows(ab(i)) && okToCast(i));
    if (glowing.length) return glowing[0];
    if (gcds.includes(0) && okToCast(0)) return 0;
    const inst = gcds.filter(i => okToCast(i));
    return inst.length ? inst[0] : null;
  },
};

// ---------------------------------------------------------------- advanced classes: their own footwork and priorities
// BOT_CLASS[classId] = { home(bot, view) -> where to stand (optional), act(bot, k, view, moving) -> ability index or null }
const BOT_CLASS = {
  // Thermist: follow the swing (thermPlan, the glowing button), never cast into an overload, Inversion far out
  thermist: {
    act(bot, k, view, moving) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const t = k.g.temp, weave = k.gcdRemaining() > 0.65 && !k.cast;
      const inv = idx('invert'), eq = idx('equil');
      // (Red Giant, Zenith's move in Inversion's place: at the edge with the Corona building)
      if (weave && ok(inv) && (k.abilities[inv].id === 'redgiant' ? Math.abs(t) >= 5 && k.stacks('corona') >= 2 : Math.abs(t) >= 4)) return inv;
      if (weave && ok(eq)) {
        // Equilibrium as mitigation: a big hit on the way and the dial near 0 anyway (or in real trouble)
        const big = view.bossCast && view.bossCast.left < 2.5 && /Knell|Boil|Thunderclap|Eye of the Storm|Skybreak|Moonset|Last Call|Devour/.test(view.bossCast.name);
        const me = view.players.find(p => p.id === bot.id);
        // (Zenith's Sunset: also when the Corona is full and a big hit is coming, the stars and the shield at once)
        if ((big && (Math.abs(t) <= 2 || (k.def.corona && k.stacks('corona') >= 3))) || (me && me.hp / me.maxHp < 0.35)) return eq;
        // the talents on Equilibrium: Cold Front (a big hit coming with the dial 4 or more out, or 2 stars to drop), Equilibrium Pulse (a Shock
        // from 4 or more out) and Red Alert (a Corona held when the boss begins a cast refills Sunset: keep it on cooldown going into casts)
        if ((big || (view.bossCast && view.bossCast.left < 2.5)) && k.talent('thermist_front') && (k.def.corona ? k.stacks('corona') >= 1 : Math.abs(t) >= 3)) return eq;   // (Cold Front: any boss cast with a star to drop or the dial 3 out)
        if (k.talent('thermist_pulse') && Math.abs(t) >= 4) return eq;
        if (k.talent('thermist_deadcentre') && k.stacks('momentum') < 4) return eq;   // (Dead Centre: Equilibrium fills the Momentum)
        if (k.talent('thermist_alert') && k.stacks('corona') >= 2 && view.bossCast) return eq;   // (Red Alert: Sunset goes out inside a cast, after the cast has begun and refilled it; pressed earlier it would spend the Corona the refill needs)
      }
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      // Latent Heat: past the edge opens a short window of free casts: fire the edge spell once more to open it, then swing back inside the edge before it closes
      if (k.talent('thermist_latent') && Math.abs(t) === 5 && k.has('brink') && (k.g.lwin ? k.remaining('latentwin') > 2.9 : thermLatentReady(k))) { const e = idx(t > 0 ? 'flare' : 'lance'); if (ok(e)) return e; }
      // Crescendo (Pendulum): a Shock that counts its own crossing and 3 Momentum is a sure crit: with fewer than 2 held, quick spells back and forth across 0 build it first
      if (k.talent('thermist_crescendo') && k.stacks('momentum') < 2 && Math.abs(t) <= 2 && t !== 0) {
        const q = idx(t > 0 ? 'rime' : 'cinder'), qa = k.abilities[q];
        if (qa && !qa.hold && ok(q) && !(k.has('brink') && k.buffs.get('brink').data.el === (qa.el || 0))) return q;
      }
      // Thermocline (a Zenith's, in Cinder Bolt's place): held at the edge it lights a Corona by itself, once every 4s
      const tcI = idx('cinder'), tcA = tcI >= 0 ? k.abilities[tcI] : null;
      if (tcA && tcA.hold && Math.abs(t) === 5 && k.stacks('corona') < 1 && ok(tcI) && k.glows(tcA)) return tcI;
      // Absolute Zero (in Rime Shard's place): not a step on the way, a plunge. From 4 or more on the hot side (a Zenith with its Corona built) it is the Shock; otherwise it waits
      const azI = idx('rime'), azA = azI >= 0 ? k.abilities[azI] : null;
      if (azA && azA.id === 'zero' && t >= 4 && (!k.def.corona || k.stacks('corona') >= 2) && ok(azI)) return azI;
      const plan = thermPlan(k), dir = plan === 'cinder' || plan === 'flare' ? 1 : -1;
      const brink = k.has('brink') ? k.buffs.get('brink').data.el : 0, sb = k.def.stepBonus || 0;
      // (Latent Heat: the window is short, a big spell would land after it closed: swing back with the instant one)
      const order = [plan, dir > 0 ? 'cinder' : 'rime', 'rime', 'cinder', 'lance', 'flare'];
      if (k.g.lwin) order.unshift(dir > 0 ? 'cinder' : 'rime');
      for (const id of [...new Set(order)]) {
        const i = idx(id), a = k.abilities[i];
        if (!ok(i) || a.hold || a.id === 'zero' || (moving && k.castTime(a))) continue;   // (Absolute Zero is pressed above, never as an ordinary rime step)
        const el = a.el || 0, big = id === 'flare' || id === 'lance';
        // Thermocline (a Pendulum's or the base kit's, in Cinder Bolt's place) swings two steps AWAY from the side the dial is on: only when that is the way the plan goes
        if (a.id === 'thermocline' && (Math.abs(t) < 1 || (t > 0 ? -1 : 1) !== dir)) continue;
        if (el && brink === el) continue;
        if (el && !(big && thermEdgeCast(k, el)) && Math.abs(t + el * ((big ? 2 : 1) + sb)) > 5) continue;
        return i;
      }
      return null;
    },
  },
  // Driftblade: never stand still. Weave back and forth through the boss's body across its flanks (every pass is a
  // Passing Strike), Hook Turn from a flank (so it lands on the other flank, not in front), Crosswind when full.
  driftblade: {
    home(bot, view) {
      const b = view.boss, f = b.facing || 0, busy = view.mechs.some(m => m.type !== 'raidwide' && m.resolveAt - view.t < (m.type === 'aoe' ? 2.5 : 5)) || (view.rollers || []).length || (view.sweeps || []).some(s => view.t < s.end);
      const side = (bot.slot || 0) % 2 ? 40 : -40;
      // on an add: sweep back and forth round its near side (Passing Strikes through it now and then)
      const addId = bot.wantEnemy === 'hold' ? bot.addHome : bot.wantEnemy, add = addId && (view.adds || []).find(a => a.id === addId);
      if (bot.wantEnemy && !add) return null;
      const at = ahead => {
        const th = (view.t + ahead) * 1.5 + bot.id * 1.7;
        if (add) { const a = Math.atan2(-add.y, -add.x) + Math.sin(th) * 1.1, d = add.r + 30 + Math.cos(th * 2) * 25; return { x: add.x + Math.cos(a) * d, y: add.y + Math.sin(a) * d }; }
        // with a telegraph on the floor: a short shuffle round where a melee would stand (still walking, so Drift holds;
        // the dodging scores pull it wherever is safe), instead of standing still and bleeding Drift
        if (busy) return { x: b.x + side + Math.sin(th * 1.4) * 55, y: b.y + 110 + Math.cos(th * 1.4) * 20 };
        // Orbit: fly whole loops round it close in (each one ends in a Full Circle dive), not a line through it
        if (bot.actor && bot.actor.kit.def.orbit) { const r = FIGHT.BOSS_R + 50; return { x: b.x + Math.cos(th) * r, y: b.y + Math.sin(th) * r }; }
        // a long, thin loop through its middle, wide enough to run clean through the body, never so wide that the far
        // ends are out of sabre reach
        const s = Math.sin(th) * 115, u = Math.cos(th) * 40 - 20;
        return { x: b.x + Math.cos(f) * u - Math.sin(f) * s, y: b.y + Math.sin(f) * u + Math.cos(f) * s };
      };
      // aimed far enough ahead along the loop that the bot never catches the point and stops (it walks faster than the
      // loop turns at its ends)
      let p = at(0.8);
      for (let ahead = 1.2; ahead <= 2.4 && hypot2(p.x - bot.x, p.y - bot.y) < 75; ahead += 0.4) p = at(ahead);
      return p;
    },
    act(bot, k, view, moving) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const weave = k.gcdRemaining() > 0.65 && !k.cast, full = driftMax(k), flank = k.env.positional() === 'flank';
      const gale = idx('gale'), hook = idx('hook'), slip = idx('slip'), still = idx('still');
      const myHit = view.mechs.some(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 0.7);
      // no flashy moves while there's something on the floor to dodge: a dash or a swing round can land you in it
      const calm = !view.mechs.some(m => m.type !== 'raidwide' && m.resolveAt - view.t < 3) && !(view.rollers || []).length && !(view.sweeps || []).some(s => view.t < s.end) && !view.puddles.some(p => hypot2(p.x - view.boss.x, p.y - view.boss.y) < p.r + 240);
      if (weave && ok(still) && (myHit || k.abilities[still].id === 'tailspin')) return still;
      if (weave && ok(still) && k.ultWin && calm) return still;   // (Eye of the Gale: Eye Step is a blink through the boss)
      // the talents that are a timing: Eye of the Storm (the party's 10% for the raidwide), Sidestep (a Hook Turn as the blow on you lands), Gust Guard (a Slipstream then)
      const rw = view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 2.2;
      if (weave && rw && ok(still) && k.talent('driftblade_calm')) return still;
      if (weave && myHit && ok(hook) && k.talent('driftblade_sidestep')) return hook;
      if (weave && myHit && ok(slip) && k.talent('driftblade_gust')) return slip;
      if (weave && ok(gale) && (k.abilities[gale].id !== 'starfall' || k.g.drift >= 150)) return gale;   // (Starfall waits for a big charge, as the simulator's pro does)
      if (weave && ok(hook) && (k.abilities[hook].id === 'gyre' ? k.g.drift >= 75 || (k.g.drift >= 50 && k.charges(k.abilities[hook]) === 2) : k.g.drift >= 70 && flank && calm)) return hook;
      if (weave && ok(hook) && k.talent('driftblade_ricochet') && k.has('ricochet') && calm) return hook;   // (Ricochet: the Hook Turn that flings it back through the boss)
      if (weave && calm && ok(slip) && (k.charges(k.abilities[slip]) === 2 || k.g.drift < full * 0.5)) return slip;
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      const cross = idx('cross'), impact = k.abilities[cross].id === 'impact';
      // Galeforce: the Drift held when Gale Run ends is the closing blade, so Crosswind waits out the last seconds of the run
      if (k.talent('driftblade_galeforce') && ['gale', 'roost', 'starwind'].some(r => k.has(r) && k.remaining(r) < 3) && ok(0)) return 0;
      if (ok(cross) && (k.g.drift >= full * 0.92 && (!impact || (flank && calm)))) return cross;
      if (k.ultWin && ok(cross) && k.g.drift >= 60) return cross;   // (Gale Line spends only 30)
      if (ok(0)) return 0;
      return ok(cross) && k.g.drift >= full * 0.6 && (!impact || calm) ? cross : null;
    },
  },
};

// Ironpalm (no GCD, kits.js): Read a tankbuster aimed at it in the last moment (and its autos and big shared hits when no buster is close), the Bell
// and Iron Skin ahead of a blow a caught Read would not survive (the big one kept for the hot Brand), Tiger Wall
// strung ahead of busters, the Bruise kept up, Rising Gate into Heaven's Drop otherwise. Waits out each recovery so its
// presses land Crisp, cashes an Opening at once, and stops for breath rather than run dry mid-string.
BOT_CLASS.ironpalm = {
  act(bot, k, view) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const P = bot.ip || (bot.ip = { plan: null, resting: false, done: false });
    const g = k.g, free = k.lockUntil <= k.now;
    const mine = view.mechs.filter(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id).sort((a, b) => a.resolveAt - b.resolveAt)[0];
    const hitIn = mine ? mine.resolveAt - view.t : Infinity;
    const next = (view.next || []).find(([n]) => BUSTER_SEEN.test(n)), toBuster = Math.min(hitIn, next ? next[1] + 3 : Infinity);
    const ri = idx('read'), si = idx('skin'), bi = idx('bell');
    if (free && ok(ri) && hitIn < 0.3 && hitIn > 0.03) return ri;   // (as late as the window allows: a burn's tick or a swing landing just before the blow would eat the stance)
    // the boss's autos are read too (a blow read lands at half, or a quarter with Deflect, and a Still Water Read of any blow fills the Breath), keeping Read for a buster that is close
    const autoIn = view.autoAt != null && view.bossTarget === bot.id && !view.boss.untargetable ? view.autoAt - view.t : Infinity;
    if (free && ok(ri) && autoIn < 0.36 && autoIn > 0.03 && (toBuster > 7 || k.has('pond') || k.has('offbal') || k.charges(k.abilities[ri]) === 2)) return ri;
    // Still Water: Read has two charges and comes back with Still Pond, so the raidwide is read too (a full Breath and a counter), keeping a charge for the buster
    if (free && ok(ri) && k.def.stillWater && (k.has('pond') || k.charges(k.abilities[ri]) === 2) && view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 0.36 && m.resolveAt - view.t > 0.03)) return ri;
    const me = view.players.find(p => p.id === bot.id);
    // a big shared hit it stands in (a stack) or a spread that is its own is read too, as long as a buster is not close behind it
    const shared = view.mechs.some(m => { const d = m.resolveAt - view.t; return d > 0.03 && d < 0.36 && ((m.type === 'stack' && m.shape && hypot2(bot.x - m.shape.x, bot.y - m.shape.y) <= (m.shape.r || 0)) || (m.type === 'spread' && (m.follow ?? m.target) === bot.id)); });
    if (free && shared && ok(ri) && (toBuster > 7 || k.has('pond') || k.has('offbal') || k.charges(k.abilities[ri]) === 2)) return ri;
    // A tankbuster on it: what a caught Read (40% of the blow) leaves of its health decides the cooldowns. Read alone if that is plenty; the Bell (or Landslide,
    // 20% less for 10s) when it is not; Iron Skin too only if even that would not do, so the big one is kept for the blow that would kill (the Sovereign's hot Brand)
    if (free && hitIn < 3 && mine && me && mine.dmg && view.dmgScale && ri >= 0 && k.usable(k.abilities[ri]) && k.readyIn(k.abilities[ri]) <= 0.0001) {
      const room = Math.max(me.hp, me.maxHp * 0.9) - me.maxHp * 0.05, caught = mine.dmg * view.dmgScale * 0.9 * 0.4;   // (a healer tops a tank up in the seconds before a blow)
      if (ok(bi) && caught >= room && k.abilities[bi].id !== 'dragon') return bi;
      if (ok(si) && caught * (ok(bi) || k.has('wind') || k.has('slide') ? 0.65 : 1) >= room) return si;   // (the Bell's 15% and 20%, Landslide's 15% and 30%, near enough; Second Wind runs longer than its 10s, near enough)
    } else if (free && ok(si) && hitIn < 3) return si;
    // in real trouble with no buster close: Iron Skin now rather than hold it for one that may come too late
    if (free && ok(si) && me && me.hp / me.maxHp < 0.35 && toBuster > 20) return si;
    const raid = view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 3;
    // (the Bell also goes up for party damage the telegraphs show coming, unless a tankbuster is close: it is kept for that)
    // (Landslide, which also builds Momentum, goes up for a long wait too: 20s ready and unused)
    if (!ok(bi)) P.bellSince = null; else if (P.bellSince == null) P.bellSince = view.t;
    if (free && ok(bi) && (raid || k.abilities[bi].id === 'dragon' || (BotAI.incoming(view, 4.5) >= 0.3 && !(next && next[1] < 12)) || (k.abilities[bi].id === 'slide' && view.t - P.bellSince > 20 && !(next && next[1] < 12)))) return bi;
    if (!free) return null;
    const live = ipLive(k) ? g.str : '';
    if (k.has('opening')) return IP_SLOT.H;
    // Calm Before the Blow: Breath is full again when a cast aimed at it begins, so with that cast close it spends what it has and does not stop to breathe
    const castSoon = k.talent('ironpalm_calm') && (view.next || []).some(([n, s]) => s < 3 && (BUSTER_SEEN.test(n) || RAID_CASTS.test(n)));
    if (P.resting) { if (g.breath < 75 && !castSoon) return null; P.resting = false; }
    if (!P.plan || !(P.plan.startsWith(live) && P.plan.length > live.length) || (!live && P.done)) {
      P.done = false;
      if (live && !g.clean) { const on = ipMoves(k).filter(e => e.seq.startsWith(live) && e.seq.length > live.length).sort((a, b) => b.seq.length - a.seq.length); P.plan = on.length ? on[0].seq : null; }
      else {
        const swallow = k.talent('ironpalm_swallow'), cost = s => [...s].reduce((a, x) => a + IP_INPUT[x].cost * 0.6, 0);
        // (Tiger Wall lasts 5s and its string takes about a second and a half: start it no earlier than that allows)
        if (toBuster < 6.2 && toBuster > 1.8 && !k.has('wall')) P.plan = 'HKK';
        else if (k.dotRemaining('bruise') < 2.5) P.plan = 'HHK';
        else P.plan = swallow ? 'KLHKK' : 'LLHKK';
        if (g.breath < cost(P.plan) + (castSoon ? 0 : 2)) { if (g.breath >= cost('KL') && !swallow) P.plan = 'KL'; else { P.resting = true; P.plan = null; return null; } }
      }
    }
    if (!P.plan) return null;
    const x = P.plan[live.length];
    if (live.length + 1 >= P.plan.length) P.done = true;
    // don't start a press whose recovery would still be running when the Read has to go out (a third of a second
    // before the buster lands, inside the stance's catching window)
    if (ok(ri) && hitIn > 0.03 && hitIn < IP_INPUT[x].lock + 0.4) return null;
    if (ok(ri) && autoIn > 0.03 && autoIn < IP_INPUT[x].lock + 0.4 && (toBuster > 7 || k.has('pond') || k.has('offbal') || k.charges(k.abilities[ri]) === 2)) return null;
    return ok(IP_SLOT[x]) ? IP_SLOT[x] : null;
  },
};

// ======================================================================= healers: the next tankbuster
// every boss's tankbuster cast by name (BUSTER_CASTS at the top only knows the first sets'), for the healers' look ahead
const HEAL_BUSTERS = /^(Tenderize|Skewer|Silk Wrap|Titan Fist|Grave Cleave|Sceptre Rebuke|Rending Claws|Rending Maul|Icebreaker|Glacial Fist|Arcane Lance|Sundering Cut|Cracked Guard|Answering Cut|Hammer Heel|Root Lash|Cinder Crown|Pinning Thrust)$/;
// seconds until the next tankbuster lands (Infinity if none is known): a telegraph already down, a buster being cast, or the next one in
// the upcoming-moves feed (view.next gives when its cast starts; the blow lands at least 1.6s after that)
BotAI.busterEta = function (view) {
  let eta = Infinity;
  for (const m of view.mechs) if (m.type === 'buster' && m.resolveAt >= view.t - 0.05) eta = Math.min(eta, m.resolveAt - view.t);
  if (view.bossCast && HEAL_BUSTERS.test(view.bossCast.name)) eta = Math.min(eta, view.bossCast.left);
  for (const [nm, sec] of view.next || []) if (HEAL_BUSTERS.test(nm)) { eta = Math.min(eta, sec + 1.6); break; }
  return eta;
};

// Grace Withdrawn (the Sovereign's act check: the whole party drops to 1 HP, Nightfall lands 8s later): { prep: it is within 9s of being cast (or is being cast),
// at: seconds until the party drops }. A healer in the window keeps its big heals and brews for the climb back instead of spending them on small hurts.
BotAI.graceWindow = function (view) {
  const n = (view.next || []).find(([nm]) => nm === 'Grace Withdrawn'), c = !!(view.bossCast && view.bossCast.name === 'Grace Withdrawn');
  return { prep: c || (!!n && n[1] < 9), at: c ? view.bossCast.left : n ? n[1] + 3.2 : 0 };
};

// a tank with a Brace ready answers a buster with it alone when a Perfect Block (40% of the blow) leaves it over a tenth of its health, so the big
// cooldown is still there for the blow that would kill (a telegraph's raw dmg times view.dmgScale, less the 10% a full set of gear takes off)
BotAI.braceHolds = function (bot, k, view, m) {
  const me = view.players.find(p => p.id === bot.id), bi = k.abilities.findIndex(a => a.id === 'brace');
  if (!me || bi < 0 || !view.dmgScale || !m.dmg || !k.usable(k.abilities[bi]) || k.charges(k.abilities[bi]) < 1) return false;
  return m.dmg * view.dmgScale * 0.9 * 0.4 < me.hp - me.maxHp * 0.03;
};

// a Bloodreaver bot keeps Undying (150 s) for the blow that a Rampage thrown into the cast (60% off, and its 15% guard) would not leave it standing through:
// True: hold it (the tankTalents block above throws the Rampage)
// War Cry (a roar that shields the party and takes 10% off its damage) is for the party's blows, so a buster aimed at it leaves it alone unless Undying is not up for a lethal one.
BotAI.reaverHolds = function (bot, k, view, m, a) {
  if (k.def.spec !== 'berserker' || (a.id !== 'undying' && a.id !== 'warcry')) return false;   // (the Hemomancer answers a buster as before)
  const me = view.players.find(p => p.id === bot.id);
  if (!me || !view.dmgScale || !m.dmg) return false;
  const lethal = m.dmg * view.dmgScale * 0.9 * 0.4 * 0.85 >= me.hp - me.maxHp * 0.03;
  if (a.id === 'undying') return !lethal;
  const ui = k.abilities.findIndex(x => x.id === 'undying');
  return !(lethal && ui >= 0 && k.readyIn(k.abilities[ui]) > 0.0001);
};

// an Oathbroker bot keeps Writ of Protection (90 s) for the blow that would bury the Ledger: one worth two of its whole HP or more (what gear leaves of the
// telegraph's raw dmg), or a harder one than the same move had before (the Sovereign's Brand inside the burn). True: hold it.
BotAI.writHolds = function (bot, view, m, H) {
  const key = m.from || m.tag || 'buster', id = m.id ?? m.resolveAt, seen = bot.obBusters || (bot.obBusters = []);
  if (!seen.some(s => s.id === id)) seen.push({ id, key, dmg: m.dmg || 0 });
  const total = (m.dmg || 0) * (view.dmgScale || 0) * 0.9;
  const hotter = seen.some(s => s.id !== id && s.key === key && (m.dmg || 0) > s.dmg * 1.25);
  return !(hotter || total >= H * 2);
};

// ======================================================================= chosen-ally buffs (engine.js ALLY_BUFFS)
// The damage dealer who has dealt the most so far and doesn't already have this kind of buff (anyone else but you if
// the party has no damage dealer up), or null.
BotAI.topDps = function (bot, view, def) {
  const has = p => !!(def && view.allyMods && view.allyMods(p.id)[def.kind] >= def.value);
  const up = view.players.filter(p => p.alive && !p.left && !has(p));
  const dps = up.filter(p => p.role === 'dps'), pool = dps.length ? dps : up.filter(p => p.id !== bot.id);
  const dealt = id => (view.dealt ? view.dealt(id) : 0);
  pool.sort((a, b) => dealt(b.id) - dealt(a.id));
  return pool.length ? pool[0].id : null;
};
// A healer's move that buffs one chosen ally: spent on the top damage dealer while the party's burst is on (a damage
// buff or a vulnerability on the boss), or on cooldown for a long party burst of its own (Accelerando). Never while
// someone is low, and a heal that shields (Benediction) waits while a tankbuster is coming.
BotAI.allyBuff = function (bot, k, view, hurt, moving, busterSoon) {
  if (hurt.length && hurt[0].f < 0.6) return null;
  for (let i = 0; i < k.abilities.length; i++) {
    const a = k.abilities[i], def = a.allyBuff && ALLY_BUFFS[a.allyBuff];
    if (!def || !k.usable(a) || k.readyIn(a) > 0.0001) continue;
    const long = k.recast(a) >= 60;
    if (!long && (!view.burst || busterSoon || hurt.filter(h => h.f < 0.8).length >= 2)) continue;
    // a move that is also the tank's shield (Benediction) keeps a charge back, or waits if a tankbuster is due before it's back
    const nb = (view.next || []).find(([n]) => BUSTER_CASTS.test(n));
    if (!long && (a.charges ? k.charges(a) < 2 : /shield/i.test(a.desc) && nb && nb[1] < k.recast(a))) continue;
    if (a.type === 'gcd' && (k.cast || (moving && a.id !== 'rebirth'))) continue;   // (Rebirth on the living is instant)
    const to = BotAI.topDps(bot, view, def);
    if (to == null) continue;
    const was = bot.healTarget;
    bot.healTarget = to;
    if (k.available(a)) return i;
    bot.healTarget = was;
  }
  return null;
};

// ======================================================================= healer talents (cleric, grovekeeper, chronomancer)
// What a good player does with the talents of these three that want their own play. All of it sits behind k.talent(...) or a
// granted move's id, so a bot without the talent plays exactly as before. c: what the healer block has worked out. An ability index, or null.
BotAI.healerTalents = function (bot, k, view, c) {
  const cls = bot.cls.id, { hurt, low, busterSoon, raidBegins, moving, tankH } = c;
  if (cls !== 'cleric' && cls !== 'grovekeeper' && cls !== 'chronomancer') return null;
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const bs = k.env.boss ? k.env.boss() : null, castLeft = bs && bs.casting ? bs.castLeft : 0;
  const big = !!(view.bossCast && (RAID_CASTS.test(view.bossCast.name) || BUSTER_CASTS.test(view.bossCast.name)));
  const gcdFree = k.gcdRemaining() <= 0 && !k.cast && k.lockUntil <= k.now;
  const alive = view.players.filter(p => p.alive && !p.left);
  const crowd = () => alive.map(q => ({ q, n: alive.filter(o => hypot2(o.x - q.x, o.y - q.y) <= 150).length })).sort((a, b) => b.n - a.n)[0].q;
  const to = (i, p) => { bot.healTarget = p.id; return i; };
  if (cls === 'cleric') {
    // Bloom of Dawn: the whole stack of Petals into one big heal on whoever is lowest
    const di = idx('intervene');
    if (di >= 0 && k.abilities[di].id === 'dawnbloom' && gcdFree && low && low.f < 0.7 && ready(di) && (k.g.petals >= 3 || (k.g.petals >= 2 && low.f < 0.5))) return to(di, low.p);
    // Intervention on the living (the big cast heal, back every 15s): on someone well under half, standing, or planted where this spot is about as safe as the planned one
    if (di >= 0 && k.abilities[di].id === 'intervene' && gcdFree && low && low.f < 0.5) {
      const was = bot.healTarget; bot.healTarget = low.p.id;   // (aimed first: the move's cooldown and the raise's lockout both depend on who it lands on)
      if (ready(di)) {
        if (!moving) return di;
        if (BotAI.stillOk(bot, view) && BotAI.danger(bot, bot.x, bot.y, view) < 400) { bot.stillUntil = view.t + (k.castTime(k.abilities[di]) || 0) + 0.15; return di; }
      }
      bot.healTarget = was;
    }
    // Foresight (Aegis): a Petal or a Divine Barrier that lands while the boss is casting has its shield half again as strong
    if (k.talent('cleric_foresight') && big && castLeft > 0.3 && gcdFree && view.t - (bot.foreAt ?? -99) > 4) {
      const who = busterSoon && tankH ? tankH : hurt[0], pi = idx('petal'), mi = idx('mend');
      if (who && ready(pi)) { bot.foreAt = view.t; return to(pi, who.p); }
      if (who && !moving && castLeft > 1.7 && ready(mi)) { bot.foreAt = view.t; return to(mi, who.p); }   // (the Barrier's cast must end inside the boss's)
    }
  } else if (cls === 'grovekeeper') {
    // Seed of Renewal: planted on the tank ahead of a buster, or on someone close to falling
    const si = idx('rebirth');
    if (si >= 0 && k.abilities[si].id === 'seed' && gcdFree && !k.g.seed && k.g.bloom >= 60 && ready(si)) {
      if (busterSoon && tankH) return to(si, tankH.p);
      if (low && low.f < 0.4) return to(si, low.p);
    }
    // Argent Veil (Moonwell): set down as the boss begins a big cast, where most of the party stands
    const gi = idx('growth');
    if (k.talent('grovekeeper_veil') && big && castLeft > 0.3 && gi >= 0 && k.abilities[gi].id === 'moonwell' && ready(gi)) return to(gi, crowd());
    // Moonwell: a pool under the tank when it is the one going down (the party rule below wants three hurt), and set down where the party stands as a raidwide begins
    if (gi >= 0 && k.abilities[gi].id === 'moonwell' && ready(gi)) {
      if (tankH && tankH.f < 0.6) return to(gi, tankH.p);
      if (raidBegins && alive.length >= 3 && alive.filter(o => hypot2(o.x - crowd().x, o.y - crowd().y) <= 150).length >= 3) return to(gi, crowd());
    }
    // Rebirth on the living is a big instant heal: when the lowest ally is close to falling and nobody is waiting to be raised, it goes there (else it stays for a damage dealer's Wildheart)
    if (si >= 0 && k.abilities[si].id === 'rebirth' && gcdFree && low && low.f < 0.4 && ready(si) && !view.players.some(p => !p.alive && !p.left)) return to(si, low.p);
    // Ironbark: a Rejuvenate (Lifebind) cast while the boss is casting wraps the ally in bark: the tank for a buster, else whoever is lowest
    if (k.talent('grovekeeper_ironbark') && big && castLeft > 0.3 && gcdFree && view.t - (bot.barkAt ?? -99) > 4) {
      const who = busterSoon && tankH ? tankH : hurt[0], ri = idx('rejuv');
      if (who && ready(ri)) { bot.barkAt = view.t; return to(ri, who.p); }
    }
  } else {
    // Time Bubble: on the tank as a buster comes in, else where most of the party stands as a raidwide does
    const bi = idx('stasis');
    if (bi >= 0 && k.abilities[bi].id === 'bubble' && view.t - (bot.bubbleAt ?? -99) > 8 && ready(bi)) {
      if (tankH && BotAI.busterEta(view) < 3) { bot.bubbleAt = view.t; return to(bi, tankH.p); }
      if (raidBegins && big) { bot.bubbleAt = view.t; return to(bi, crowd()); }
    }
  }
  return null;
};

// ======================================================================= Alembist (classes-b)
// Keeps a heal or two brewed for what's coming (a Salve before a tankbuster, a Salt Ward before a raidwide), brews
// bombs when everyone is well, and throws a vial where its splash catches the most of whoever needs it. Pros' habits:
// heals held until needed, bombs thrown ripe, Volatile fuses never left to run out, Catalyst on cooldown.
BotAI.alembist = function (bot, k, view) {
  const A = k.def.alem, vials = k.g.vials, idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const party = view.players.filter(p => !p.left), alive = party.filter(p => p.alive), dead = party.filter(p => !p.alive);
  const frac = p => p.hp / p.maxHp, hurt = alive.filter(p => frac(p) < 0.82).sort((a, b) => frac(a) - frac(b));
  const tank = alive.find(p => p.role === 'tank');
  // (a cure is about 4s from the first reagent to the splash: brew 9s ahead through the feed, and throw the shields nearer the blow)
  const bEta = BotAI.busterEta(view), busterNear = bEta < 9, busterSoon = bEta < 5;
  const raidwideSoon = view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 3.5) ||
    (view.bossCast && view.bossCast.left < 3.5 && /Grease|Venom Mist|Thunderclap|Knell|Gorge|Dead Wind|Twin Knell|Pulse/.test(view.bossCast.name));
  const room = vials.length < A.slots, gcdFree = k.gcdRemaining() <= 0 && !k.cast && k.lockUntil <= k.now;
  const near = (q, r) => alive.filter(o => hypot2(o.x - q.x, o.y - q.y) <= r);
  // where a heal splash does the most: the ally with the most missing health around them
  const healSpot = () => alive.map(q => ({ q, v: near(q, 105).reduce((s, o) => s + (1 - frac(o)), 0) })).sort((a, b) => b.v - a.v)[0];
  const crowdSpot = () => alive.map(q => ({ q, n: near(q, 115).length })).sort((a, b) => b.n - a.n)[0];
  const kindOf = v => (v.parts ? 'blend' : alemInfo(v.r).kind);
  const enemyNear = !!k.env.target({ target: 'enemy', range: RANGED });
  const hollowN = BotAI.hollowNeed(view);   // (a Hollow Gloomsworn: heals on it pay its debt)
  // (a lone tank also counts: it is the one the blows land on)
  const gw = BotAI.graceWindow(view); const raiseWanted = dead.length > 0 && k.now + 4 >= k.g.raiseAt && !vials.some(v => ['DD', 'DQ', 'DDD'].includes(v.r));   // (Grace Withdrawn: the cures are brewed ahead and held for the climb back from 1 HP; a fallen ally and the raise nearly ready: a Draught is wanted in the bandolier)
  const needHeal = !!hollowN || gw.prep || hurt.length >= 2 || (hurt[0] && frac(hurt[0]) < 0.62) || !!(tank && frac(tank) < (busterNear ? 0.95 : 0.82));

  // oGCDs: Catalyst whenever a brew is about to start; Distill when healing is urgent; Grand Batch / Blend in a crunch
  const di = idx('distill'), bi = idx('batch');
  if (k.gcdRemaining() > 0.15 && !k.cast) {
    if (k.abilities[di].id === 'catalyst') { if (ready(di) && !k.g.half.length && room) return di; }
    else if (ready(di) && !k.g.half.length && room && (needHeal || raiseWanted || vials.length === 0 || (k.talent('alembist_fume') && raidwideSoon))) return di;   // (Fume: Distill cloaks the party, so ahead of a raidwide)
    if (ready(bi)) {
      if (k.abilities[bi].id === 'blend') { if (vials.length >= 2 && needHeal && vials.some(alemIsHeal)) return bi; }
      else if (vials.length <= 1 && k.g.last && ((needHeal && alemInfo(k.g.last).kind === 'heal') || (!hurt.length && alemInfo(k.g.last).kind === 'bomb'))) return bi;
    }
  }
  if (!gcdFree) return null;
  const th = idx('throw');
  // a bot marks the vial it wants, the way a player's number key does (kits.js alemMark), and aims at who should get it
  const throwAt = (i, who) => { alemMark(k, i); bot.healTarget = who; return ready(th) ? th : null; };

  // a fallen ally and a Draught (or anything that raises) ready to go: throw it on them
  if (dead.length && k.now >= k.g.raiseAt) {
    const ri = vials.findIndex(v => ['DD', 'DQ', 'DDD'].includes(v.r));
    if (ri >= 0) return throwAt(ri, (BotAI.raiseFirst(dead, view) || dead[0]).id);
  }
  // pick the vial to throw now, if any: the bot's own choice (players mark theirs by hand; Throw alone takes the oldest)
  const cands = vials.map((v, i) => i);
  const top = 1 + ALEMBIC.GROW + (k.talent('alembist_cask') ? (A.fuse ? ALEMBIC.GROW : 0.5) : 0);
  let best = null;
  for (const i of cands) {
    // (Cask: a vial left to age keeps gaining past ripe. White-Hot: a vial in the 2s after it reaches full heat is stronger, so bombs wait for that window)
    const v = vials[i], kind = kindOf(v), ripe = alemStrength(k, v) >= top - 0.001, wh = k.talent('alembist_whitehot');
    const fuseLow = v.fuse && v.fuse - k.now < (wh ? 3 : 1.4), spoiling = !v.fuse && !v.keep && alemSpoilTime(k) - (k.now - v.born) < 3;
    let score = 0, who = bot.id;
    if ((kind === 'heal' || kind === 'blend') && hollowN) { score = 10; who = hollowN.p.id; }
    else if (kind === 'heal' || kind === 'blend') {
      const s = healSpot();
      if (s && (needHeal || s.v > 0.2)) { score = 5 + s.v * 4; who = s.q.id; }
      if (busterNear && tank && frac(tank) < 0.9) { score = Math.max(score, 6); who = tank.id; }   // (a blow coming: the cure goes to the tank)
      if (gw.prep && !(hurt[0] && frac(hurt[0]) < 0.5)) score = 0;
    }
    else if (kind === 'salve' && hollowN) { score = 6; who = hollowN.p.id; }
    else if (kind === 'salve') { if (busterSoon && tank) { score = 7; who = tank.id; } else if (hurt.length >= 2) { const s = healSpot(); score = 4; who = s.q.id; } }
    else if (kind === 'ward') { if (raidwideSoon || (busterSoon && tank)) { const s = raidwideSoon ? crowdSpot() : { q: tank }; score = 6; who = s.q.id; } }
    else if (kind === 'quick') { score = hurt.length ? 1 : view.burst ? 4 : 3; const top = BotAI.topDps(bot, view, ALLY_BUFFS.galvanized); who = top != null ? top : crowdSpot().q.id; }   // (Galvanized: the top damage dealer)
    else if (kind === 'bomb') { if (enemyNear && ((ripe && !(wh && v.fuse && !alemWhite(k, v))) || !room)) score = needHeal ? 1 : 3; who = tank ? tank.id : bot.id; }
    if (fuseLow || spoiling) { score = Math.max(score, 8); if (who === bot.id) { const s = kind === 'bomb' ? null : (needHeal ? healSpot() : crowdSpot()); if (s) who = s.q.id; } }
    if (!room && !k.g.half.length && score < 2) { score = 2; if (who === bot.id && kind !== 'bomb') who = (crowdSpot() || { q: { id: bot.id } }).q.id; }
    if (score > 0 && (!best || score > best.score)) best = { i, who, score };
  }
  // a heal is needed and none is brewed: brew one before throwing a bomb
  if (best && (best.score >= 2 || !room)) return throwAt(best.i, best.who);

  // brew: the plan is set when a brew starts and kept until it's done
  if (!room) return null;
  const need = k.has('catalyst') ? 3 : 2, have = k.g.half.length;
  if (!have || !k.g.botPlan || k.g.botPlan.length !== need) {
    const heals = vials.filter(alemIsHeal).length, shields = vials.filter(v => ['salve', 'ward'].includes(kindOf(v))).length;
    const S = idx('salt') >= 0 && k.abilities[idx('salt')].reagent === 'Q' ? 'Q' : 'S';
    let plan;
    const bombs = vials.filter(v => kindOf(v) === 'bomb').length, under = alive.some(p => frac(p) < 0.9);
    if (raiseWanted) plan = need === 3 ? 'DDD' : 'DD';
    else if (gw.prep && A.fuse && need === 3 && !vials.some(v => v.r === 'DES')) plan = 'DES';   // (Grace Withdrawn: a Volatile's fuse is short, so one Philosopher's Draught, brewed ahead, for the whole party at 1 HP)
    else if (gw.prep && !A.fuse && heals < Math.min(A.slots, 4)) plan = need === 3 ? 'DDD' : 'DD';   // (an Apothecary's bandolier stocked with cures: the party climbs back from 1 HP before the blow, a splash at a time)
    else if (needHeal && heals < 2) plan = need === 3 ? 'DDD' : (hurt.length >= 3 ? 'DE' : 'DD');
    else if (busterNear && !shields) plan = need === 3 ? 'DD' + S : 'D' + S;
    else if (heals < 1) plan = need === 3 ? 'DDD' : 'DD';
    else if (busterNear && heals < 2) plan = need === 3 ? 'DDD' : 'DD';   // (a Draught and a Salve or Ward stocked for the blow)
    else if (need === 3 && raidwideSoon && !shields) plan = 'DES';
    else if (need === 2 && view.burst && !vials.some(v => kindOf(v) === 'quick')) plan = 'ES';   // (a Quickpowder for the burst: Galvanized)
    else if (under && bombs >= 1) plan = need === 3 ? 'DDD' : 'DD';   // (never a second bomb held while someone is hurt)
    else plan = need === 3 ? 'EEE' : S === 'Q' ? 'EQ' : 'EE';   // (Quicksilver: Ember + Quicksilver goes off twice)
    k.g.botPlan = plan.replace(/S/g, S);
  }
  const letter = k.g.botPlan[have] || 'E';
  const ri = k.abilities.findIndex(a => a.reagent === letter);
  return ready(ri) ? ri : null;
};

// ======================================================================= tank talents (Bastion, Bloodreaver, Runeguard)
// A tank bot that holds one of these talents plays it as a player would. Every rule below sits behind k.talent(...) or the
// granted move's own id, so a bot without the talent plays exactly as before. tankTalents gives the ability to press now
// (or null); tankHold names the moves the plain priority must leave alone because they are pressed here, at their moment.
BotAI.tankTalents = function (bot, k, view) {
  const ab = i => k.abilities[i];
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ok = id => { const i = idx(id), a = ab(i); return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a) ? i : -1; };
  const gcdFree = k.gcdRemaining() <= 0 && !k.cast && k.lockUntil <= k.now;
  const weave = k.gcdRemaining() >= 0.65 && !k.cast;   // (the plain priority's own rule for an oGCD)
  const bn = k.env.boss ? k.env.boss() : null, t = view.t, cls = bot.cls.id;
  const me = view.players.find(p => p.id === bot.id), hp = me && me.maxHp ? me.hp / me.maxHp : 1;
  const myBust = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - t > -0.2);
  const blowSoon = within => view.mechs.some(m => (m.type === 'buster' || m.type === 'raidwide') && m.resolveAt - t < within && m.resolveAt - t > -0.2);
  const raidIn = (view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 2.4) || view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - t < 2.4 && m.resolveAt - t > 0);
  if (cls === 'bastion') {
    // a guard that pays for every Perfect Block (Unbreakable, Zealous Guard's Pyre, Aegis's dome): Brace for each swing at us, autos too.
    // Likewise a window a talent opens on Perfect Blocks (Avatar of Dawn's pillars, Hallowed Ground's circle, Phalanx's line of shields), while a
    // charge is spare (both up, or no tankbuster close). Outside such windows the plain priority blocks busters and big casts only.
    const br = idx('brace'), swing = bn && bn.hitIn != null && bn.hitIn < 0.45 && bn.hitIn > 0.08;
    const guard = k.has('unbreak') || k.has('pyre') || k.has('aegis');
    const ph = k.talent('bastion_phalanx') ? k.stacks('phalanx') : 0;
    const window = k.has('avatar') || (k.g.hallow && k.now < k.g.hallow.end) || (ph >= 1 && ph < 3);
    const nextBust = (view.next || []).find(([n]) => BUSTER_SEEN.test(n));
    // A charge is always kept for a tankbuster: Brace goes on an auto only with both charges up, or with no buster close (the feed shows the next within a
    // recharge, one is laid on us, or the boss is casting at us). A Brace spent on autos leaves the buster unblocked: far worse than the guard's gain.
    const bustClose = (nextBust && nextBust[1] < 8) || !!myBust || (view.bossCast && view.bossTarget === bot.id && BUSTER_SEEN.test(view.bossCast.name));
    const bustNext = !!myBust && myBust.resolveAt - t < 1.2;   // (a buster right behind the swing needs the Brace, and Brace has a short lock after each press)
    if (swing && !bustNext && ok('brace') >= 0 && (guard || window) && (k.charges(ab(br)) >= 2 || !bustClose)) return br;
    // Hold Fast: a cast aimed at us with time on it and both charges up: the guard goes up early and holds until it lands (half a Perfect Block);
    // the second charge is kept for the Perfect Block itself
    if (k.talent('bastion_holdfast') && bn && bn.casting && bn.onMe && bn.castLeft > 0.9 && ok('brace') >= 0 && k.charges(ab(br)) >= 2) return br;
    const ed = ok('edge');
    if (ed >= 0 && gcdFree) {
      if (k.talent('bastion_steady') && k.has('steady')) return ed;   // (Steady Hands: the cheap Edge in the six seconds after a Perfect Block)
      if (k.talent('bastion_rebuke') && k.has('rebuke')) return ed;   // (Rebuke: the free, harder Shield Bash after Bulwark)
      if (ph >= 3 || (ph >= 1 && k.remaining('phalanx') < 2.5)) return ed;   // (Phalanx: the line of shields goes out full, or before it fades)
      if (k.talent('bastion_interpose') && raidIn && hp > 0.65) return ed;   // (Interpose: the Bash that eases the whole party, ahead of a raidwide)
    }
    // Hallowed Ground: poured out when the gauge is full (it glows at 90), never at a trickle
    const hl = idx('banner');
    if (k.talent('bastion_hallowed') && ab(hl).id === 'hallowed' && k.glows(ab(hl)) && weave && ok('banner') >= 0) return hl;
    // Aegis stands in Bulwark's place: put up for a blow at us as Bulwark is
    const bw = idx('bulwark');
    if (k.talent('bastion_aegis') && ab(bw).id === 'aegis' && myBust && myBust.resolveAt - t < 3 && !(bot.mitUntil > t) && weave && ok('bulwark') >= 0) { bot.mitUntil = t + 4; return bw; }
  }
  if (cls === 'bloodreaver') {
    // A tankbuster aimed at us. A Rampage thrown into the cast makes that blow land 60% lighter and its guard (15% for 2s) covers the landing, so one goes out
    // in the last 2.7s of the cast (a Hack before it would leave the next free GCD too late); Undying is kept for the blow that would still kill after both
    // (the Sovereign's hot Brand) and goes up as it nears.
    if (k.def.spec === 'berserker' && myBust && myBust.dmg && view.dmgScale && me && me.maxHp) {   // (the Hemomancer's Drain has no such cut)
      const raw = myBust.dmg * view.dmgScale * 0.9, left = myBust.resolveAt - t, um = idx('undying');
      const cut = 0.4 * 0.85;
      if (raw * cut >= me.hp - me.maxHp * 0.03 && ab(um).id === 'undying' && left < 2.2 && weave && ok('undying') >= 0) return um;
      if (gcdFree && left < 2.7 && left > 0.25 && bot.brRamp !== myBust.resolveAt && ok('drain') >= 0) { bot.brRamp = myBust.resolveAt; return idx('drain'); }
    }
    // War Cry for the party's big blow (a stack or raidwide worth most of a damage dealer's health), so its shield and its 10% cut are up when it lands
    if (k.def.spec === 'berserker' && weave && !myBust && ab(idx('warcry')).id === 'warcry' && BotAI.incoming(view, 3.2) >= 0.8 && ok('warcry') >= 0) return idx('warcry');
    // Bloodletting at the moment a talent pays for it: Retaliation (within 4s of a heavy hit: twice as deep, twice the Blood), Cauterize (a tankbuster's
    // Vulnerability on us: the cut washes it off), Bleed the Cast (Blood Lance thrown into a cast wards the party)
    const le = ok('letting');
    if (le >= 0 && weave && k.g.blood <= 80 && ((k.talent('bloodreaver_retaliate') && k.env.recentDamage(4) >= k.env.maxHp() * 0.1) ||
      (k.talent('bloodreaver_cauterize') && bn && bn.selfVuln && k.now >= (k.g.cautAt || 0)) || (k.talent('bloodreaver_bleedcast') && bn && bn.casting))) return le;
    // Blood Moon (Undying's place) soaks a tankbuster at us; Scab (War Cry's place) is worth what was just taken, so it goes on after a heavy blow
    const mn = idx('undying');
    if (ab(mn).id === 'moon' && myBust && myBust.resolveAt - t < 2 && weave && ok('undying') >= 0) return mn;
    const sc = idx('warcry');
    if (ab(sc).id === 'scab' && k.env.recentDamage(6) >= k.env.maxHp() * 0.25 && weave && ok('warcry') >= 0) return sc;
  }
  if (cls === 'runeguard') {
    const wd = idx('ward'), wA = ab(wd), onSelf = wA && wA.target !== 'ally';
    // when the Ward went up (the kit says only that one stands), for Shatter
    if (k.g.selfWard) { if (bot.rgWardAt == null) bot.rgWardAt = t; } else bot.rgWardAt = null;
    // Shatter: a Ward raised over a live one blasts the old as if broken all the way (once every 10s); recast it while it has time left
    if (k.talent('runeguard_shatter') && onSelf && gcdFree && k.g.selfWard && bot.rgWardAt != null && t - bot.rgWardAt < 5 && k.now >= (k.g.shAt || 0) && (k.g.runes || 0) >= (k.def.spec === 'runeblade' ? 3 : 1) && ok('ward') >= 0) { bot.rgWardAt = t; return wd; }   // (a Runeblade's Cleave is worth more per Rune than the blast: only from a full gauge)
    // Emergency Ward and Foreseen Ward: a cast coming and no Rune in hand, the Ward still goes up (on credit; free after a cast was seen)
    if (onSelf && gcdFree && !k.g.selfWard && bn && bn.casting && bn.castLeft < 3 && (k.g.runes || 0) < 1 &&
      ((k.talent('runeguard_emergency') && ok('ward') >= 0) || (k.has('foreseen') && ok('ward') >= 0))) return wd;
    // Whirling Runes (Sanctum's place): three Runes spun out when no blow is near
    const sa = idx('sanctum');
    if (ab(sa).id === 'whirl' && (k.g.runes || 0) >= 3 && weave && !blowSoon(6) && ok('sanctum') >= 0) return sa;
  }
  return null;
};
BotAI.tankHold = function (k, a) {
  if (a.id === 'hallowed') return !k.glows(a);   // (Hallowed Ground only with the gauge full)
  if (a.id === 'moon' || a.id === 'scab' || a.id === 'whirl' || (a.id === 'warcry' && k.def.spec === 'berserker')) return true;   // (pressed in tankTalents, at their moment)
  return false;
};

// ======================================================================= advanced tanks (tanks-2)
// Gorgemaw: the jaw opens just before anything edible lands on it (its busters above all; Bottomless on a raidwide),
// Spits what it eats, Digests to heal or (Gizzard) before party damage. Oathbroker: Writ on its busters, Renegotiate a
// big bill about to land with more damage, Settle once it's healthy, Lien while bills come in, Default before it drowns.
const botEdible = (bot, m) => {
  if (typeof MAW_HOST === 'undefined' || !MAW_HOST.typeOf(m) || m.cover || m.throwDist || m.type === 'raidwide') return false;
  if (m.type === 'buster') return (m.target ?? m.follow) === bot.id;
  if (m.type === 'proximity') return true;
  if (m.follow != null && m.follow !== bot.id && m.type === 'spread') return false;
  return SHAPES.contains(m.shape, bot.x, bot.y, 8);
};
// a teammate's circle a Gorgemaw means to swallow for them (a spread, or a circle chasing one person) landing soon with its owner near:
// the bot walks into it (think, danger) and opens the jaw as it lands. One at a time, the earliest; none with a buster of its own coming.
BotAI.mawTarget = function (bot, view) {
  if (!bot.cls || bot.cls.id !== 'gorgemaw' || typeof MAW_HOST === 'undefined' || !bot.actor) return null;
  const k = bot.actor.kit, wide = k.abilities.find(a => a.id === 'wide' || a.replaces === 'wide');
  if (!wide || !(k.charges(wide) > 0)) return null;
  const me = bot.id;
  if (view.mechs.some(m => (m.type === 'buster' && (m.target ?? m.follow) === me && m.resolveAt - view.t < 5) || (m.type === 'spread' && m.follow === me))) return null;
  let best = null, bestD = 0;
  for (const m of view.mechs) {
    if (!(m.type === 'spread' || (m.type === 'aoe' && m.shape.kind === 'circle')) || m.follow == null || m.follow === me || m.cover || m.eat === false || !MAW_HOST.typeOf(m)) continue;
    const dt = m.resolveAt - view.t;
    if (dt < 0.03 || dt > 4.5) continue;
    const o = view.players.find(p => p.id === m.follow);
    const dist = o ? hypot2(o.x - bot.x, o.y - bot.y) : 1e9;
    if (!o || !o.alive || (dt > 1.2 ? dist / 230 > dt - 0.15 : dist > 260)) continue;   // (near enough to walk there before it lands; once on the way, kept to the end)
    if (!best || m.resolveAt < best.resolveAt - 0.2 || (m.resolveAt < best.resolveAt + 0.2 && dist < bestD)) { best = m; bestD = dist; }
  }
  return best;
};
Object.assign(BOT_CLASS, {
  gorgemaw: {
    act(bot, k, view) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const me = view.players.find(p => p.id === bot.id), hp = me ? me.hp / me.maxHp : 1, b = k.g.belly, max = mawMax(k);
      const wide = idx('wide'), open = (k.g.jawUntil || 0) > k.now + 0.05;
      const soon = view.mechs.filter(m => m.resolveAt - view.t < 0.6 && m.resolveAt - view.t > 0.03);
      if (!open && ok(wide) && soon.some(m => botEdible(bot, m))) return wide;
      // a teammate's circle landing on the spot it stands in: swallow it for them
      const take = BotAI.mawTarget(bot, view);
      if (take && !open && ok(wide) && take.resolveAt - view.t < 0.6 && take.resolveAt - view.t > 0.03 && SHAPES.contains(take.shape, bot.x, bot.y, 8)) return wide;
      const bott = idx('bottomless');
      if (ok(bott) && soon.some(m => m.type === 'raidwide')) return bott;
      const myBuster = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 2.5);
      const iron = idx('iron');
      if (myBuster && ok(iron) && (k.abilities[iron].id === 'stonebelly' || k.charges(k.abilities[wide]) === 0 || hp < 0.55)) return iron;
      // Iron Jaw: Iron Gut opens the jaw for 2s and doubles what it eats, so it is pressed just ahead of the buster in place of Open Wide
      if (myBuster && !open && ok(iron) && k.talent('gorgemaw_ironjaw') && myBuster.resolveAt - view.t < 1.7 && myBuster.resolveAt - view.t > 0.1) return iron;
      const dig0 = idx('digest');
      if (k.has('stone') && k.has('irongut') && ok(dig0) && b.length && k.gcdRemaining() > 0.4) return dig0;   // (Stone Belly grinds like Iron Gut: Digest inside it counts twice)
      const dig = idx('digest'), giz = k.def.spec === 'gizzard';
      const partySoon = view.mechs.some(m => (m.type === 'raidwide' || m.type === 'buster') && m.resolveAt - view.t < 3) || (view.next || []).some(([n, s]) => s < 4 && (RAID_CASTS.test(n) || BUSTER_SEEN.test(n)));
      // Digest on every buster: whatever is banked goes into the heal and the cut as it comes, and the Spike it eats is spat back with the acid
      if (ok(dig) && b.length && k.gcdRemaining() > 0.4 && myBuster && myBuster.resolveAt - view.t < 1.6 && (!giz || b.length >= 2 || k.has('irongut'))) return dig;
      if (ok(dig) && b.length && k.gcdRemaining() > 0.4 && (hp < 0.45 || (giz ? (b.length >= 2 && partySoon) || b.length >= max : b.length >= max && hp < 0.85))) return dig;
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      const sp = idx('spit'), regur = k.abilities[sp].id === 'regurgitate';
      // Sour Stomach: a Morsel kept 15s turns sour (spat 40% harder), so each waits until it has (a full Belly or Digest's acid ends the wait);
      // Triple Course: a pair of one shape waits for its third, which makes a Feast; Regurgitate brings two up in one press (the best count measured)
      const sour = k.talent('gorgemaw_sour') && b.length > 0 && b.length < max && k.now - b[0].at < 15 && !k.has('acid');
      const feastWait = k.talent('gorgemaw_triple') && b.length === 2 && b[0].m === b[1].m && max >= 3;
      // banking: a lone Morsel is kept (for the Digest, a pair, the Cud) and spat at two or more, a full Belly, a held Spike, or with the acid on it
      const spikeHeld = b.some(m => m.m === 'spike'), acidUp = k.has('acid') && b.length > 0;
      if (ok(sp) && !sour && !feastWait && (acidUp || (regur ? b.length >= Math.min(2, max) : giz ? b.length >= max : k.def.fuse ? (b.length >= 2 && b[0].m === b[1].m) || b.length >= max - 1 || spikeHeld : k.talent('gorgemaw_overflow') ? b.length >= max || spikeHeld : b.length >= 2 || spikeHeld))) return sp;   // (Second Stomach: a Morsel eaten into a full Belly is spat back at once, so a bot holding it keeps the Belly full)
      return ok(0) ? 0 : null;
    },
  },
  oathbroker: {
    act(bot, k, view) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const me = view.players.find(p => p.id === bot.id), H = me ? me.maxHp : 1, hp = me ? me.hp : 1, tot = oathTotal(k);
      const weave = k.gcdRemaining() > 0.5 && !k.cast;
      const myBuster = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 2.5);
      const holdWrit = myBuster ? BotAI.writHolds(bot, view, myBuster, H) : true;
      const partySoon = view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 3) || (view.next || []).some(([n, s]) => s < 4 && RAID_CASTS.test(n));
      const df = idx('default'), fore = k.abilities[df].id === 'foreclose';
      if (ok(df) && (tot > hp * 0.8 || (fore && tot > H * 0.32) || (k.talent('oathbroker_slate') && tot > H * 0.31) || (k.talent('oathbroker_receivership') && partySoon && tot > H * 0.15))) return df;
      const writ = idx('writ'), wid = k.abilities[writ] && k.abilities[writ].id;
      // Warrant (the Collector's damage move in Writ's place) goes with the party's burst or a blow aimed at it; Blanket Surety (the Guarantor's) covers a raidwide
      if (wid === 'warrant') { if (ok(writ) && weave && (view.burst || myBuster)) return writ; }
      else if (wid === 'blanket') { if (ok(writ) && weave && (partySoon || myBuster) && hp > H * 0.6 && tot < H * 0.3) return writ; }
      else if (myBuster && ok(writ) && !holdWrit) return writ;   // (Writ of Protection is kept for the blow that would bury the Ledger: a bigger one than its kind before, as the Sovereign's hot Brand, or one worth two of the tank's whole HP)
      const rn = idx('reneg');
      if (k.abilities[rn].id === 'moratorium' && ok(rn) && weave && (myBuster || partySoon) && tot > H * 0.05) return rn;   // (Moratorium cuts damage taken too: pressed into a blow aimed at it or a raidwide)
      if (ok(rn) && weave && oathDueSoon(k, 1.5) > H * 0.1 && (partySoon || myBuster || hp < H * 0.6)) return rn;
      // Amnesty erases the smallest entry every time it goes (Moratorium's too), so a bot holding it presses it whenever the Ledger has lines to spare
      if (ok(rn) && weave && k.talent('oathbroker_amnesty') && k.g.ledger.length >= 2 && !myBuster) return rn;
      // Consolidate folds a long Ledger on every press, haggled down: a bot holding it presses it when the Ledger has three lines or more
      if (ok(rn) && weave && k.talent('oathbroker_consolidate') && k.g.ledger.length >= 3 && tot > H * 0.12 && !myBuster) return rn;
      const st = idx('settle'), audit = k.abilities[st].id === 'audit';
      // (Escrow and Tithe pay for a long Ledger left to come due, so a bot holding either lets it grow before it settles)
      const books = k.talent('oathbroker_escrow') || k.talent('oathbroker_tithe');
      if (ok(st) && weave && (!fore || (k.talent('oathbroker_stamp') && k.cdRemaining(k.abilities[df]) > 14)) && !partySoon && !myBuster && (audit ? oathAuditable(k).reduce((s, e) => s + e.a, 0) > H * (books ? 0.15 : 0.1) : (tot > H * (books ? 0.32 : 0.22) && hp > H * 0.6) || tot > H * (books ? 0.5 : 0.4))) return st;
      const li = idx('lien');
      if (k.abilities[li].id === 'cosign') {
        const held = k.g.cosign != null && k.g.cosignUntil > k.now + 2;
        // (Foresight: Co-Sign is ready again when the boss begins a cast, so it is pointed anew at the one the blow is for)
        if (ok(li) && weave && (!held || (k.talent('oathbroker_foresight') && view.bossCast))) {
          // the one about to take a heavy blow, else the healer, else whoever is most hurt
          const others = view.players.filter(p => p.alive && !p.left && p.id !== bot.id);
          const hitId = (view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) !== bot.id && (m.target ?? m.follow) != null) || {}).target;
          const pick = others.find(p => p.id === hitId) || others.find(p => p.role === 'healer') || others.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          bot.healTarget = pick ? pick.id : null;
          if (pick && !(held && pick.id === k.g.cosign)) return li;
        }
      } else if (ok(li) && weave && oathDueSoon(k, 9) > H * 0.08) return li;
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      return ok(0) ? 0 : null;
    },
  },
});
// ======================================================================= Threadweaver and Marionettist (classes-c)
// is something about to land on this spot that would catch a Doll? (the shapes the host judges on a Doll: fight.js dollMech)
// everyone threaded to this player (any weaver's threads)
BotAI.partnersOf = function (view, id) {
  const out = new Set();
  for (const th of view.threads || []) { if (th.a === id) out.add(th.b); else if (th.b === id) out.add(th.a); }
  return out;
};
// the fallen player a healer bot raises first: the earliest who asked for it from the Down screen (raid-host rezAsk), or null
BotAI.raiseFirst = function (dead, view) {
  for (const id of view.rezAsks || []) { const p = dead.find(q => q.id === id); if (p) return p; }
  return null;
};
// standing where it is costs the bot little more than walking to its planned spot (the planner's own danger score, which
// knows every mechanic): safe enough to stand still for a cast
BotAI.stillOk = function (bot, view) {
  const p = bot.plan;
  return !p || BotAI.danger(bot, bot.x, bot.y, view) <= BotAI.danger(bot, p.x, p.y, view) + 1200;
};
BotAI.dollDanger = function (view, x, y, within = 2.6) {
  const props = (view.props || []).filter(p => p.cover);
  for (const m of view.mechs) {
    const dt = m.resolveAt - view.t;
    if (dt > within) continue;
    if ((m.type === 'aoe' || m.type === 'spread' || m.type === 'buster') && SHAPES.contains(m.shape, x, y, 34) && !(m.cover && PROPS.shadowing(m.src.x, m.src.y, x, y, props))) return true;
    if (m.type === 'raidwide' && m.cover && !PROPS.shadowing(m.src.x, m.src.y, x, y, props)) return true;
  }
  for (const rl of view.rollers || []) {
    const from = Math.max(0, view.t - rl.rollAt), to = view.t + 1.6 - rl.rollAt;
    if (to <= 0 || view.t > rl.end) continue;
    const c = Math.cos(rl.angle), s = Math.sin(rl.angle);
    if (segDist(x, y, rl.x + c * from * rl.speed, rl.y + s * from * rl.speed, rl.x + c * to * rl.speed, rl.y + s * to * rl.speed) < rl.r + 40) return true;
  }
  for (const sw of view.sweeps || []) {
    if (view.t > sw.end + 0.2) continue;
    for (const look of [0, 0.6, 1.2]) {
      const tt = Math.min(view.t + look, sw.end);
      if (tt < sw.startAt - 0.5) continue;
      const a0 = sw.a0 + Math.max(0, tt - sw.startAt) * sw.spin;
      for (let k = 0; k < sw.arms; k++) {
        const a = a0 + k * Math.PI * 2 / sw.arms, c = Math.cos(a), sn = Math.sin(a), dx = x - sw.x, dy = y - sw.y;
        if (dx * c + dy * sn > -20 && Math.abs(-dx * sn + dy * c) < sw.w / 2 + 40 && !(sw.cover && PROPS.shadowing(sw.x, sw.y, x, y, view.props || [], q => q.kind === sw.cover))) return true;
      }
    }
  }
  return false;
};

// Threadweaver: the tank tied to her and the web kept full while it's calm; her threads cut on purpose just before a
// spread or a knockback would tear them (a big heal instead of a small one) and re-tied once the party gathers again;
// Tapestry for a tankbuster or a raidwide, Tie on a tied ally to pull them out of what's about to land on them, Shuttle
// with two threads or more (a Shears: right after a Snap too, it runs the cut ends); Mend Seam
// (instant on Spool) on whoever is low, aimed at a tied ally so it runs down the web; Needle the rest of the time.
BotAI.threadweaver = function (bot, k, view) {
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const alive = view.players.filter(p => p.alive && !p.left), frac = p => p.hp / p.maxHp;
  const me = alive.find(p => p.id === bot.id);
  if (!me) return null;
  const dist = (a, b) => hypot2(a.x - b.x, a.y - b.y);
  const tank = alive.find(p => p.role === 'tank' && p.id !== bot.id);
  const hurt = [...alive].sort((a, b) => frac(a) - frac(b)), low = hurt[0];
  const mine = (view.threads || []).filter(th => th.from === bot.id);
  const linked = id => mine.some(th => th.a === id || th.b === id);
  const lenOf = th => { const a = alive.find(p => p.id === th.a), b = alive.find(p => p.id === th.b); return a && b ? dist(a, b) : 0; };
  const soon = (type, s) => view.mechs.some(m => m.type === type && m.resolveAt - view.t < s);
  const tearing = soon('spread', 2.2) || soon('knockback', 1.6) || view.mechs.some(m => m.tag === 'chain' && m.resolveAt - view.t < 2.2) || (view.sweeps || []).some(sw => view.t > sw.startAt - 1.5 && view.t < sw.end);
  const busterSoon = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 2.5) || !!(view.bossCast && BUSTER_CASTS.test(view.bossCast.name) && view.bossCast.left < 2.5);
  const raidSoon = soon('raidwide', 2.5) || soon('proximity', 2.5) || !!(view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 2.5);
  // (urgent answers go in whenever she isn't mid-cast, even if it clips the next GCD; the rest weave)
  const free = !k.cast && k.lockUntil <= k.now, weave = free && k.gcdRemaining() > 0.45;
  const tie = idx('tie'), snip = idx('snip'), shut = idx('shuttle'), tap = idx('tapestry'), mend = idx('mend'), needle = idx('needle');
  const shears = (k.def.store || 1) > 1, cradle = k.abilities[shut].id === 'cradle';
  // a fallen ally and the raise (Mend Seam aimed at them) ready: bring them back, as the other healers do (whoever asked first, a human, a healer, a tank),
  // unless someone still standing is about to drop; the cast is a long one, so she stops for it where standing is about as safe as where she is headed
  const down = view.players.filter(p => !p.alive && !p.left);
  if (down.length && mend >= 0 && k.now >= (k.g.raiseAt || 0) && free && !(low && frac(low) < 0.35)) {
    const asked = BotAI.raiseFirst(down, view);
    const first = asked || down.slice().sort((a, b) => (b.id < 1000) - (a.id < 1000) || (b.role === 'healer') - (a.role === 'healer') || (b.role === 'tank') - (a.role === 'tank'))[0];
    const was = bot.healTarget;
    bot.healTarget = first.id;
    if (ready(mend)) {
      const ct = k.castTime(k.abilities[mend]) || 0;
      if (!ct || BotAI.stillOk(bot, view)) { if (ct) bot.stillUntil = view.t + ct + 0.15; bot.raiseFor = { id: first.id, until: view.t + ct + 0.5 }; return mend; }
    }
    bot.healTarget = was;
  }
  const tw = id => k.talent('threadweaver_' + id);   // (the talents' plays below sit behind this: without the talent she plays as before)
  // a heavy blow about to land on someone who isn't the tank (or on a tank already low): that's what Tapestry is for
  const sentence = view.mechs.find(m => m.type === 'buster' && m.resolveAt - view.t < 2.2 && (() => { const t = alive.find(p => p.id === (m.target ?? m.follow)); return t && (t.role !== 'tank' || frac(t) < 0.7); })());
  if (free && ready(tap) && (sentence || busterSoon || (raidSoon && hurt.filter(p => frac(p) < 0.85).length >= 2))) return tap;
  // Selvedge: Tapestry holds every thread through a move that would tear the web (a spread, a knockback): she raises it just before
  if (free && tw('selvedge') && k.abilities[tap].id === 'tapestry' && ready(tap) && mine.length >= 2 && tearing) return tap;
  if (weave) {
    if (cradle && ready(shut) && raidSoon) return shut;
    // Thrum plucks every thread and leaves it whole: a heal down each and a cut in the party's damage, so it goes before a hard hit or when several are hurt
    if (k.abilities[snip].id === 'thrum' && ready(snip) && mine.length >= 2 && (raidSoon || busterSoon || hurt.filter(p => frac(p) < 0.75).length >= 2)) return snip;
    if (!cradle && ready(shut) && weaveShuttleN(k) >= 2) return shut;
    // cut the web ourselves before a spread tears it (or when a thread is about to snap anyway, or someone tied is low)
    if (ready(snip) && mine.length && k.abilities[snip].id !== 'thrum') {
      const strained = mine.some(th => lenOf(th) > WEAVE.SNAP * 0.75), stretched = mine.some(th => lenOf(th) > WEAVE.SNAP * 0.5);   // (the snapping length is 550: cut early only when a thread is really being pulled)
      const lowTied = low && frac(low) < (shears ? 0.8 : 0.55) && linked(low.id);
      if ((tearing && stretched) || strained || lowTied) { bot.healTarget = lowTied ? low.id : bot.id; return snip; }
    }
    // Stitched Ahead: a Tie (on anyone) while she holds two threads or more readies a free instant heal, so with someone hurt she ties an ally who is not on a
    // thread yet (or, with every ally already tied, pulls one who stands close, which moves them little: never the tank), then heals whoever needs it
    if (tw('ahead') && !k.has('ahead') && mine.length >= 2 && ready(tie) && !tearing && low && frac(low) < 0.85) {
      const pick = alive.filter(p => p.id !== bot.id && p.role !== 'tank' && (linked(p.id) ? dist(me, p) < 130 : dist(me, p) < WEAVE.SNAP * 0.5)).sort((a, b) => (linked(a.id) ? 1 : 0) - (linked(b.id) ? 1 : 0) || frac(a) - frac(b))[0];
      if (pick) { bot.healTarget = pick.id; k.g.tie = null; return tie; }
    }
    // pull a tied ally out of what's about to land on them (Tie on someone already on our threads)
    if (ready(tie)) {
      for (const p of alive) {
        if (p.id === bot.id || !linked(p.id)) continue;
        const inIt = view.mechs.some(m => m.type === 'aoe' && m.resolveAt - view.t < 1.4 && m.follow !== p.id && SHAPES.contains(m.shape, p.x, p.y, 10)) || view.puddles.some(pd => hypot2(pd.x - p.x, pd.y - p.y) < pd.r);
        if (inIt) { bot.healTarget = p.id; k.g.tie = null; return tie; }
      }
    }
  }
  if (free) {
    // a heavy blow aimed at someone: tie them to us, or (too far from us) to whoever stands nearest them, two Ties in a row
    if (bot.tiePair && view.t - bot.tiePair.at < 1.6 && ready(tie)) { bot.healTarget = bot.tiePair.b; bot.tiePair = null; return tie; }
    if (ready(tie)) {
      for (const m of view.mechs) {
        if (m.type !== 'buster' || m.resolveAt - view.t > 4.5) continue;
        const t = alive.find(p => p.id === (m.target ?? m.follow));
        if (!t || (tank && t.id === tank.id) || linked(t.id) || [...this.partnersOf(view, t.id)].length) continue;
        if (t.id === bot.id) { if (tank && dist(me, tank) < WEAVE.SNAP * 0.6) { bot.healTarget = tank.id; k.g.tie = null; return tie; } continue; }
        if (dist(me, t) < WEAVE.SNAP * 0.5) { bot.healTarget = t.id; k.g.tie = null; return tie; }
        const near = alive.filter(p => p.id !== t.id && p.id !== bot.id && dist(p, t) < WEAVE.SNAP * 0.4).sort((a, b) => dist(a, t) - dist(b, t))[0];
        if (near && k.charges(k.abilities[tie]) >= 2) { bot.tiePair = { b: t.id, at: view.t }; bot.healTarget = near.id; k.g.tie = null; return tie; }
      }
    }
    // keep the tank tied to us, then whoever stands closest (never while a spread is coming, nor with a Tie owed to a blow)
  }
  if (weave) {
    const owed = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4.5 && (m.target ?? m.follow) !== bot.id && !linked(m.target ?? m.follow) && !(tank && (m.target ?? m.follow) === tank.id));
    if (!tearing && !owed && weave && ready(tie)) {
      if (tank && !linked(tank.id) && dist(me, tank) < WEAVE.SNAP * 0.6) { bot.healTarget = tank.id; k.g.tie = null; return tie; }
      const loose = alive.filter(p => p.id !== bot.id && !linked(p.id) && dist(me, p) < WEAVE.SNAP * 0.5).sort((a, b) => frac(a) - frac(b))[0];
      if (loose && mine.length < weaveMax(k) && (k.charges(k.abilities[tie]) === 2 || frac(loose) < 0.7)) { bot.healTarget = loose.id; k.g.tie = null; return tie; }
    }
  }
  if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
  const moving = bot.moving;
  // heal: whoever is low (the tank first before a buster), aimed through the web
  let want = low && frac(low) < (raidSoon || k.has('ahead') ? 0.85 : 0.72) ? low : null;   // (Stitched Ahead's free instant heal is spent on the first ally who needs it)
  if (busterSoon && tank && frac(tank) < 0.92) want = tank;
  const hollowN = BotAI.hollowNeed(view);   // (a Hollow Gloomsworn: heals on it pay its debt)
  if (hollowN) want = alive.find(p => p.id === hollowN.p.id) || want;
  if (want && ready(mend)) {
    const a = k.abilities[mend], instant = !k.castTime(a);
    if (instant || !moving) {
      // a heal on a tied ally runs down the web: pick the tied ally whose threads reach the most hurt
      bot.healTarget = want.id;
      return mend;
    }
  }
  if (ready(needle) && (!moving || !k.castTime(k.abilities[needle]))) return needle;
  return null;
};

// (her threads reach 550 px: she stands off the boss's flank, close enough to the tank to keep them tied)
// Tidecaller (healer, class 20): Surge at high water when a raidwide is casting or the party is low (and anything in a
// Spring Flood), Sip at low tide on whoever is hurt, a Riptide Mark kept on the tank, Current to turn an ebbing tide before
// a raidwide, Breakwater as one lands. Salt Spray the rest of the time.
BotAI.tidecaller = function (bot, k, view) {
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const alive = view.players.filter(p => p.alive && !p.left), frac = p => p.hp / p.maxHp;
  if (!alive.length) return null;
  const hurt = [...alive].sort((a, b) => frac(a) - frac(b)), low = hurt[0];
  const tank = alive.find(p => p.role === 'tank' && p.id !== bot.id);
  const avg = alive.reduce((s, p) => s + frac(p), 0) / alive.length, hurtN = alive.filter(p => frac(p) < 0.8).length;
  const casting = !!(view.bossCast && RAID_CASTS.test(view.bossCast.name));
  const raidSoon = casting || (view.next || []).some(([n, s]) => s < 6 && RAID_CASTS.test(n)) || view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 5);
  const raidNow = casting || view.mechs.some(m => (m.type === 'raidwide' || m.type === 'stack') && m.resolveAt - view.t < 2.5);   // (a stack shared out over the party is a raidwide to the one who tops them up)
  // party-wide damage due soon (a raidwide, a stack, spreads, towers): the Sips go on to people who are not yet badly hurt, as the other healers do
  const top = raidSoon || BotAI.partyHitSoon(view, 5) ? 0.17 : 0;
  const free = !k.cast && k.lockUntil <= k.now, weave = free && k.gcdRemaining() > 0.45;
  const g = k.g, tide = g.tide || 0, tc = id => k.talent('tidecaller_' + id);   // (the talents' plays below sit behind tc: without the talent she plays as before)
  const spray = idx('spray'), sip = idx('sip'), rip = idx('riptide'), surge = idx('surge'), cur = idx('current'), wall = idx('breakwater');
  const bEta = BotAI.busterEta(view);
  if (weave) {
    // Breakwater as a raidwide lands, or ahead of a tankbuster when no raidwide wants it (or the tank is already hurt)
    if (ready(wall) && ((raidNow && tide >= 50) || (bEta < 2.5 && tank && (frac(tank) < 0.8 || !raidSoon)))) return wall;
    // (Tide Table: a Current on a rising tide is the crest itself, so it is worth pressing at any height once the raidwide is near)
    if (ready(cur) && raidSoon && !tideFlood(k) && (g.tphase === 'ebb' || (g.tphase === 'rise' && (tide > 55 || tc('table'))))) return cur;
    // Slack Water: a Current while the Deep Shield stands holds its drain
    if (tc('slack') && ready(cur) && !tideFlood(k) && k.now < (g.deepUntil || 0) - 0.5) return cur;
  }
  if (k.gcdRemaining() > 0.0001 || k.cast) return null;
  // a fallen ally: Sip (Swell) is the raise, a 5s cast, so it is begun where standing still is about as safe as where she is headed
  // (raid-host holds her still until stillUntil), and never while someone still standing is about to drop (an asked-for raise waits only for someone lower)
  const dead = view.players.filter(p => !p.alive && !p.left);
  if (dead.length && sip >= 0 && !tideFlood(k)) {
    const asked = BotAI.raiseFirst(dead, view);
    const first = asked || dead.slice().sort((a, b) => (b.id < 1000) - (a.id < 1000) || (b.role === 'healer') - (a.role === 'healer') || (b.role === 'tank') - (a.role === 'tank'))[0];
    if (!(low && frac(low) < (asked ? 0.25 : 0.35))) {
      const was = bot.healTarget;
      bot.healTarget = first.id;
      if (ready(sip)) {
        const rct = k.castTime(k.abilities[sip]) || 0;
        if (!rct || BotAI.stillOk(bot, view)) { if (rct) bot.stillUntil = view.t + rct + 0.15; bot.raiseFor = { id: first.id, until: view.t + rct + 0.5 }; return sip; }
      }
      bot.healTarget = was;
    }
  }
  const ct = k.castTime(k.abilities[surge]) || 0;
  // Sea Legs: the first wave under Breakwater is instant and costs no tide, so it goes out at once while the party is hurt
  const legs = tc('sealegs') && tideWall(k) && g.legsFree && tide >= 40 && (hurtN >= 2 || avg < 0.85);
  const wantSurge = tideFlood(k) || legs || (tide >= 70 && (raidNow || avg < 0.65 || hurtN >= 3)) || (tideFull(k) && hurtN >= 2) || (avg < 0.45 && tide >= 35);
  if (wantSurge && ready(surge)) {
    if (!ct) return surge;
    if (BotAI.stillOk(bot, view)) { bot.stillUntil = view.t + ct + 0.15; return surge; }
  }
  if (low && ready(sip)) {
    // Low Water: the ebb has touched the floor, so this Sip costs no tide and heals half again as much
    if (g.lowWater && frac(low) < 0.9) { bot.healTarget = low.id; return sip; }
    // Seawall: a Sip while Breakwater stands raises a wall around its ally too
    if (tc('seawall') && tideWall(k) && frac(low) < 0.9) { bot.healTarget = low.id; return sip; }
    // Foam: a Sip on the ally who wears the Riptide Mark foams over onto the most hurt other
    if (tc('foam') && tideMarked(k) && hurtN >= 2) { const m = alive.find(p => p.id === g.mark.t); if (m && frac(m) < 0.7) { bot.healTarget = m.id; return sip; } }
  }
  if (low && frac(low) < 0.4 + top / 2 && ready(sip)) { bot.healTarget = low.id; return sip; }
  if (bEta < 6 && tank && frac(tank) < 0.9 && ready(sip) && !(low && frac(low) < 0.5)) { bot.healTarget = tank.id; return sip; }   // (the tank topped up ahead of the blow)
  const ripAb = k.abilities[rip];
  if (ripAb && ripAb.id === 'maelstrom') { if (ready(rip) && hurtN >= 2) return rip; }
  else if (ready(rip) && (!tideMarked(k) || (bEta < 6 && tank))) { const t = tank && frac(tank) < 0.97 ? tank : (low && frac(low) < 0.9 ? low : tank); if (t) { bot.healTarget = t.id; return rip; } }
  if (low && frac(low) < (tideLow(k) ? 0.78 : 0.6) + top && ready(sip)) { bot.healTarget = low.id; return sip; }
  return ready(spray) ? spray : null;
};

// Lanternkeeper (healer, class 21): stands among the party and sets a lantern wherever two or more allies gather with
// none lit yet, keeps a Hand Lantern on the tank, carries a lantern left behind (lighting no one) to where the party has
// moved, Flares as a raidwide lands (or when the party is low) with two allies in a glow, and Relights two stubs, or the
// most hurt ally in an emergency. Trim the Wick the rest of the time. A Wayfarer walks its Stride through the party;
// a Festival is released when the party is hurt.
BotAI.lanternkeeper = function (bot, k, view) {
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const alive = view.players.filter(p => p.alive && !p.left), frac = p => p.hp / p.maxHp;
  if (!alive.length) return null;
  const hurt = [...alive].sort((a, b) => frac(a) - frac(b)), low = hurt[0];
  const tank = alive.find(p => p.role === 'tank' && p.id !== bot.id);
  const avg = alive.reduce((s, p) => s + frac(p), 0) / alive.length, hurtN = alive.filter(p => frac(p) < 0.85).length;
  const raidNow = !!(view.bossCast && RAID_CASTS.test(view.bossCast.name)) || view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 2.5);
  const free = !k.cast && k.lockUntil <= k.now, weave = free && k.gcdRemaining() > 0.45;
  const g = k.g, me = { x: bot.x, y: bot.y }, lt = id => k.talent('lanternkeeper_' + id);   // (the talents' plays below sit behind lt: without the talent she plays as before)
  const at = l => { if (l.on == null) return l; const p = alive.find(q => q.id === l.on); return p ? { x: p.x + l.ox, y: p.y + l.oy } : null; };
  const covers = l => { const c = at(l); return c ? alive.filter(p => hypot2(p.x - c.x, p.y - c.y) <= l.r).length : 0; };
  const floor = g.lan.filter(l => l.on == null && l.kind !== 'eternal');
  const lit = new Set();
  for (const l of g.lan) { const c = at(l); if (c) for (const p of alive) if (hypot2(p.x - c.x, p.y - c.y) <= l.r) lit.add(p.id); }
  const nearMe = alive.filter(p => p.role !== 'tank' && hypot2(p.x - me.x, p.y - me.y) <= LANTERN.R * 0.9).length;
  const flare = idx('flare'), carry = idx('carry'), set = idx('set'), hand = idx('hand'), rel = idx('relight'), trim = idx('trim');
  const bEta = BotAI.busterEta(view);
  // Grace Withdrawn (the Sovereign's act check: the party drops to 1 HP and Nightfall lands 8s later): from a few seconds before it is cast she keeps Flare
  // (12s to come back) and her Embers for the climb back, and lights a lantern over the party that will still burn when the wick matters
  const gw = BotAI.graceWindow(view), prep = gw.prep, lastFor = prep ? gw.at + 8.5 : 3;
  if (weave) {
    // Flare as a raidwide lands, or as soon as the hurt stand in the light (it is back every 12s: use it); the tank hung with a Hand Lantern
    // and hurt by a blow is the best of those
    const hurtLit = alive.filter(p => lit.has(p.id) && frac(p) < 0.85).length;
    const tankLit = !!tank && lit.has(tank.id) && frac(tank) < 0.7;
    // Breadcrumbs: Flare bursts the newest small light a second time, so outside a raidwide she waits until someone hurt stands in that lead light
    const lead = lt('breadcrumbs') ? g.lan.filter(l => l.kind === 'small').pop() : null;
    const crumbs = !lead || raidNow || alive.some(p => hypot2(p.x - lead.x, p.y - lead.y) <= lead.r && frac(p) < 0.85);
    // (a raidwide on its way: Flare waits until it has landed, its heal then has something to heal; fired early it only lays a small shield and is on cooldown for the blow. Unless someone is low enough to fall to the blow)
    const holdRaid = raidNow && frac(low) > 0.45 && !lkLight(k);
    if (ready(flare) && !prep && !holdRaid && g.lan.length && crumbs && (lit.size >= 2 || lkLight(k) || tankLit) && (hurtLit >= 2 || (hurtLit >= 1 && avg < 0.9) || lkLight(k) || tankLit)) return flare;
    // a lantern left behind: carry it to where the party is now
    const ca = k.abilities[carry];
    if (ca && ca.id === 'carry' && ready(carry) && nearMe >= 2) {
      const n = lkNearest(k, me, l => lkCarryable(k)(l) && hypot2(l.x - me.x, l.y - me.y) <= lkCarryReach(k));
      if (n && n.d > 110 && covers(n.l) < 2 && !BotAI.danger(bot, me.x, me.y, view)) return carry;
      // (Long Toss: each Carry lands with a pulse, so with the talent it goes on cooldown while someone is hurt and a lantern is in reach)
      if (n && lt('longtoss') && hurtN >= 1 && !BotAI.danger(bot, me.x, me.y, view)) return carry;
    }
    // (Trailblaze is a dash: never while turning walls are up, Volkar's Storm Walls, where it can carry her into an arm)
    if (ca && ca.id === 'trail' && ready(carry) && g.lan.filter(l => l.kind === 'small').length >= 3 && covers(g.lan.filter(l => l.kind === 'small').slice(-1)[0]) < 2 && nearMe < 2 && !(view.sweeps || []).some(sw => view.t > sw.startAt - 1.5 && view.t < sw.end)) return carry;
    // Pathfinder: Trailblaze drops two small lights that heal double, so it goes in while the Stride runs and someone is hurt; Night Walk: it tops up every light it drags
    if (ca && ca.id === 'trail' && ready(carry) && nearMe >= 1 && !(view.sweeps || []).some(sw => view.t > sw.startAt - 1.5 && view.t < sw.end) && ((lt('pathfinder') && k.now < (g.strideUntil || 0) && hurtN >= 1) || (lt('nightwalk') && g.lan.filter(l => l.kind === 'small' && l.wick < 0.6).length >= 2)) && !BotAI.danger(bot, me.x, me.y, view)) return carry;
    // Night Walk: the slide leaves nothing able to touch her, so a blow about to land on the spot she stands on is slid through (a lantern in reach is all it needs)
    if (ca && lt('nightwalk') && ready(carry) && view.mechs.some(m => m.shape && m.type !== 'raidwide' && m.resolveAt - view.t > 0 && m.resolveAt - view.t < 0.45 && SHAPES.contains(m.shape, me.x, me.y, 22))) return carry;
  }
  if (k.gcdRemaining() > 0.0001 || k.cast) return null;
  // a fallen ally: the Hand Lantern is the raise, a 5s cast, so it is begun where standing still is about as safe as where she is headed
  // (raid-host holds her still until stillUntil), and never while someone still standing is about to drop (an asked-for raise waits only for someone lower)
  const downed = view.players.filter(p => !p.alive && !p.left);
  if (downed.length && hand >= 0 && !prep) {
    const asked = BotAI.raiseFirst(downed, view);
    const first = asked || downed.slice().sort((a, b) => (b.id < 1000) - (a.id < 1000) || (b.role === 'healer') - (a.role === 'healer') || (b.role === 'tank') - (a.role === 'tank'))[0];
    if (!(low && frac(low) < (asked ? 0.25 : 0.35))) {
      const was = bot.healTarget;
      bot.healTarget = first.id;
      if (ready(hand)) {
        const rct = k.castTime(k.abilities[hand]) || 0;
        if (!rct || BotAI.stillOk(bot, view)) { if (rct) bot.stillUntil = view.t + rct + 0.15; bot.raiseFor = { id: first.id, until: view.t + rct + 0.5 }; return hand; }
      }
      bot.healTarget = was;
    }
  }
  // an emergency: Relight's heal (or a wisp) on the most hurt
  const ra = k.abilities[rel];
  const keepEmb = prep && frac(low) > 0.3;   // (Embers are kept for Grace Withdrawn, unless someone is nearly down)
  if (ready(rel) && !keepEmb && ra.id === 'relight' && tank && low === tank && (frac(tank) < 0.5 || (bEta < 6 && frac(tank) < 0.8)) && g.emb >= 2) return rel;   // (the tank after a blow: Relight heals the most hurt, and it is that one)
  if (ready(rel) && !keepEmb && low && frac(low) < (g.emb >= 4 ? 0.85 : g.emb >= 3 ? 0.6 : 0.25)) return rel;   // (spare Embers are spent: they come back every 5s and stop at 4)
  if (ready(rel) && !keepEmb && ra.id === 'relight' && floor.filter(l => lkStub(l)).length >= 2 && avg < 0.8) return rel;
  if (ready(rel) && ra.id === 'wisp' && low && frac(low) < 0.6) return rel;
  const handUp = g.lan.some(l => l.kind === 'hand' && l.end - k.now > 1.5);
  if (ready(hand) && tank && !handUp && (frac(tank) < 0.8 || g.emb >= 3 || (bEta < 7 && frac(tank) < 0.97))) { bot.healTarget = tank.id; return hand; }   // (hung before the blow, so the Flare after it reaches the tank)
  // someone hurt and out of every glow: the Hand Lantern goes to them (the tank is fine)
  const lost = hurt.find(p => p.id !== bot.id && p.role !== 'tank' && frac(p) < 0.55 && !lit.has(p.id));
  if (ready(hand) && lost && (!tank || frac(tank) > 0.6)) { bot.healTarget = lost.id; return hand; }
  const sa = k.abilities[set];
  if (ready(set) && sa) {
    if (sa.id === 'stride') { if (k.now >= (g.strideUntil || 0) && (hurtN >= 1 || g.emb >= 3 || (lt('emberward') && view.bossCast && view.bossCast.left > 0.4 && view.bossCast.left < 3 && g.emb >= 2))) return set; }   // (Ember Ward: a Stride begun as a cast starts shields every light it drops in it)
    else if (sa.id === 'festival') { if (!g.lan.some(l => l.kind === 'float' && l.end - k.now > 1.5)) return set; }   // (Lantern Festival: released on cooldown, a lantern over every ally)
    else {
      // somewhere two allies stand with no lantern lit over them, or a lantern about to go out over them
      // (the party comes to a glow: bots step into healing on the floor, bots.js move)
      const here = floor.filter(l => hypot2(l.x - me.x, l.y - me.y) < l.r * 0.6 && l.end - k.now > lastFor);
      const lighting = floor.filter(l => l.end - k.now > lastFor && covers(l) >= 2).length;
      // (a party under steady raidwides gets a second light right over the first: glows stack, so long as none is snuffed for it)
      const cap = sa.id === 'beacon' ? LANTERN.BEACON_MAX : LANTERN.MAX, fresh = floor.filter(l => l.kind === 'floor' || l.kind === 'beacon').length < cap;
      // (Ember Ward: a lantern set down while the boss is casting pulses a shield as the cast lands, so a cast is a reason to light one)
      const casting = !!(view.bossCast && view.bossCast.left > 0.4 && view.bossCast.left < 3);
      if (!BotAI.danger(bot, me.x, me.y, view) && ((!here.length && lighting < 1) || (fresh && nearMe >= 2 && hurtN >= 2 && here.length < 2) || (lt('emberward') && casting && fresh && g.emb >= 2 && nearMe >= 1 && here.length < 2))) return set;
    }
  }
  if (low && frac(low) < 0.55 && g.emb >= 2 && ready(rel)) return rel;
  return ready(trim) ? trim : null;
};

// she stands among the party (the middle of everyone but the tank), so a lantern at her feet lights the most of them
BOT_CLASS.lanternkeeper = {
  home(bot, view) {
    const b = view.boss, others = view.players.filter(p => p.alive && !p.left && p.id !== bot.id && p.role !== 'tank');
    if (!others.length) return null;
    // (leaning toward whoever is hurt: the middle of the party weighted by missing health, the tank counting once it is low)
    const wt = p => 1 + 4 * Math.max(0, 1 - p.hp / p.maxHp), tk = view.players.find(p => p.alive && !p.left && p.role === 'tank' && p.hp / p.maxHp < 0.6), pool = tk ? [...others, tk] : others;
    const wsum = pool.reduce((a, p) => a + wt(p), 0);
    const c = pool.reduce((a, p) => ({ x: a.x + p.x * wt(p) / wsum, y: a.y + p.y * wt(p) / wsum }), { x: 0, y: 0 });
    const k = bot.actor && bot.actor.kit;
    const d = hypot2(c.x - b.x, c.y - b.y) || 1, keep = Math.max(d, 210);
    // a Wayfarer keeps walking a small loop through them while its Stride is lit, so its lights fall among them
    // (Trailing Sparks: it paces a line instead, back through the lights it has just dropped)
    const walk = bot.spec === 'wayfarer' && k && k.now < (k.g.strideUntil || 0) ? 55 : 0, a = view.t * 1.6, pace = k && k.talent('lanternkeeper_sparks');
    return ARENA.clamp({ x: b.x + (c.x - b.x) / d * keep + Math.cos(a) * walk, y: b.y + (c.y - b.y) / d * keep + (pace ? 0 : Math.sin(a) * walk) }, 60);
  },
};

BOT_CLASS.threadweaver = {
  home(bot, view) {
    const b = view.boss, f = b.facing || 0, side = (bot.slot || 0) % 2 ? 1 : -1, a = f + side * 1.6;
    // a heavy blow coming at someone she can't reach: go and stand just behind them, outside its cone, to tie them
    const me = view.players.find(p => p.id === bot.id);
    for (const m of view.mechs) {
      if (m.type !== 'buster' || m.resolveAt - view.t > 4.5 || (m.target ?? m.follow) === bot.id) continue;
      const t = view.players.find(p => p.id === (m.target ?? m.follow) && p.alive);
      if (!t || t.role === 'tank' || !me) continue;
      const o = m.shape, ta = Math.atan2(t.y - o.y, t.x - o.x), back = Math.max((o.r || 320) + 70, hypot2(t.x - o.x, t.y - o.y) + 80);
      return ARENA.clamp({ x: o.x + Math.cos(ta) * back, y: o.y + Math.sin(ta) * back }, 60);
    }
    return { x: b.x + Math.cos(a) * 165, y: b.y + Math.sin(a) * 165 };
  },
};

// Nightstalker: stands behind the boss, where Backstab pays the most (Shadowstep as a dodge is in the general oGCD pass above)
BOT_CLASS.shadowblade = {
  home(bot, view) {
    const k = bot.actor && bot.actor.kit;
    if (!k || k.def.spec !== 'nightstalker') return null;
    const b = view.boss, a = (b.facing || 0) + Math.PI;
    return { x: b.x + Math.cos(a) * 110, y: b.y + Math.sin(a) * 110 };
  },
};

// Marionettist: stands off a flank of the boss at a comfortable reach (so the Doll's station is across it and the line
// crosses the boss), keeps the Doll out of telegraphs with Pull Strings (Pirouette at the last moment when no charge is
// left), never starts Grand Finale with something about to land on the Doll, and Cross-Cuts whenever the line is on.
BOT_CLASS.marionettist = {
  home(bot, view) {
    const b = view.boss, f = b.facing || 0, side = (bot.slot || 0) % 2 ? 1 : -1;
    const k = bot.actor && bot.actor.kit, far = k && k.def.stretch > 300 ? 230 : 175;
    const a = f + side * 1.6;
    return { x: b.x + Math.cos(a) * far, y: b.y + Math.sin(a) * far };
  },
  act(bot, k, view, moving) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const weave = k.gcdRemaining() > 0.55 && !k.cast;
    const pull = idx('pull'), cross = idx('cross'), pir = idx('pirouette'), fin = idx('finale'), cue = idx('cue');
    const e = mariEnemy(k), me = { x: bot.x, y: bot.y };
    const lineOn = () => (cross >= 0 && k.abilities[cross].id === 'crossfire' ? mariChordOn(k) : mariLineOn(k));   // (Crossfire cuts along the line between the Dolls)
    bot.aim = null;
    // keep every Doll out of the red
    if (e && !mariLimp(k)) {
      for (let i = 0; i < k.g.dolls.length; i++) {
        const d = k.g.dolls[i];
        if (!BotAI.dollDanger(view, d.x, d.y)) continue;
        if (ok(pull)) {
          const R = mariER(e), lim = mariStretch(k) - 40, cands = [];
          for (const r of [R + 24, R + 55]) for (let s = 0; s < 16; s++) { const a = s * Math.PI / 8; cands.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r }); }
          for (let s = 0; s < 8; s++) { const a = s * Math.PI / 4; cands.push({ x: me.x + Math.cos(a) * 60, y: me.y + Math.sin(a) * 60 }); }
          const safe = cands.filter(c => hypot2(c.x - me.x, c.y - me.y) <= lim && ARENA.sd(c.x, c.y) < -30 && !BotAI.dollDanger(view, c.x, c.y, 4.5))
            .sort((a, b) => hypot2(a.x - d.x, a.y - d.y) - hypot2(b.x - d.x, b.y - d.y));
          // (W flings the Doll nearest you: with two Dolls, only when that is this one)
          if (safe.length && (k.g.dolls.length < 2 || mariPick(k, me) === i)) { bot.aim = safe[0]; return pull; }
        }
        const land = view.mechs.some(m => m.resolveAt - view.t < 1);
        if (land && ok(pir) && k.gcdRemaining() <= 0 && !k.cast && k.abilities[pir].id === 'pirouette') return pir;
      }
    }
    // a torn String or a limp Doll: Pull Strings ties all three back (it flings the Doll onto its mark across the boss)
    if (e && ok(pull) && (mariLimp(k) || k.g.strings < 3) && (weave || mariLimp(k)) && !k.cast) {
      const st = mariStation(k, 0, me, e);
      if (!BotAI.dollDanger(view, st.x, st.y, 3)) { bot.aim = st; return pull; }
    }
    if (weave && ok(cross) && k.abilities[cross].type === 'ogcd' && lineOn()) return cross;
    // Red Curtain (the talent in Swap's place): up for the raidwide, 15% less for everyone inside
    const sw = idx('swap');
    if (weave && sw >= 0 && ok(sw) && k.abilities[sw].id === 'redcurtain' && ((view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 2.5) || BotAI.incoming(view, 3) >= 0.3)) return sw;
    // (Stand-In, Stand Together, Red Curtain: a Swap / curtain a moment before Cross-Cut comes up, so the cut lands twice as hard; Stand-In and Stand Together pay on the Swap itself)
    if (weave && sw >= 0 && cross >= 0 && ok(sw) && !k.has('oncue') && (k.abilities[sw].id === 'redcurtain' || k.talent('marionettist_standin') || k.talent('marionettist_together')) && k.readyIn(k.abilities[cross]) < 4 && k.readyIn(k.abilities[cross]) > 1.5) return sw;
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    const dollsSafe = k.g.dolls.every(d => !BotAI.dollDanger(view, d.x, d.y, 3.2));
    // (Final Bow: nothing can touch the Doll during the show, so it starts with a blow on the way; Full House: with the Strings tied, or the pull far off)
    if (ok(fin) && k.g.encore >= (k.talent('marionettist_intermission') ? 4 : 5) && (dollsSafe || k.talent('marionettist_bow')) && (!k.talent('marionettist_fullhouse') || k.g.strings >= 3 || k.readyIn(k.abilities[pull]) > 2)) return fin;
    if (ok(cross) && k.abilities[cross].type === 'gcd' && lineOn()) return cross;
    // (Cut the Cord snips a String, and a Pull Strings ties it back: with all three tied and a pull to follow)
    if (ok(pir) && (k.abilities[pir].id !== 'cutcord' || (k.g.strings >= 3 && k.charges(k.abilities[pull]) >= 1))) return pir;
    if (ok(cue)) return cue;   // (the filler: the Doll jabs on its own, Cue speeds it up)
    return null;
  },
};

// ======================================================================= Gloomsworn (tank, class 18)
// A Gloomsworn gone Hollow is held at 1 HP while the damage it takes is written down as a debt (fight.js HOLLOW_HOST); it
// lives only if what is healed back (shields at half) covers the debt by the end of the grace. The healers see it in the
// view (view.players[].hollow, debt, healed, hollowLeft, graceLeft): this names the one that still needs healing, and by
// how much (a margin on top: more damage is still coming), or null.
BotAI.hollowNeed = function (view) {
  let best = null;
  for (const p of view.players) {
    if (!p.alive || p.left || !p.hollow) continue;
    const short = p.debt - p.healed + p.maxHp * 0.08;
    if (short > 0 && (!best || short > best.short)) best = { p, short, debt: p.debt, healed: p.healed, left: p.hollowLeft, grace: p.graceLeft };
  }
  return best;
};

// Gloomsworn: Black Mantle for a buster aimed at it, Black Pall for a raidwide that hurts, Last Rite when it is low, Shade Step on
// cooldown (it opens the echo for the next two strikes), Gloom Strike when the vessel is high, except in the few seconds before a
// tankbuster: there the vessel is held full, because a full vessel is what turns the killing blow into a Hollow.
BOT_CLASS.gloomsworn = {
  act(bot, k, view) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const me = view.players.find(p => p.id === bot.id), hp = me ? me.hp / me.maxHp : 1, gloom = k.g.gloom || 0;
    const weave = k.gcdRemaining() > 0.5 && !k.cast && k.lockUntil <= k.now;
    const myBuster = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 3);
    const nb = (view.next || []).find(([n]) => BUSTER_SEEN.test(n));
    const busterSoon = !!myBuster || !!(nb && nb[1] < 9) || !!(view.bossCast && BUSTER_SEEN.test(view.bossCast.name));
    const hollow = k.has('hollow') || (k.g.graceUntil || 0) > k.now;
    const mantle = idx('mantle'), pall = idx('pall'), rite = idx('rite'), shade = idx('shade'), strike = idx('strike');
    // Vigil Ward (in Black Pall's place) stands watch over whoever is hurt most: it goes when a tankbuster is aimed at someone else
    const otherBuster = view.mechs.some(m => m.type === 'buster' && (m.target ?? m.follow) != null && (m.target ?? m.follow) !== bot.id && m.resolveAt - view.t < 3);
    // Talents that pay for a full vessel (Waking Dead, Brimming Vessel: a trigger on a rest; Wall Within before a raidwide; Spill before a tankbuster): near the brim,
    // the Strikes wait for it (and the Shade Step with them) rather than spend at 85
    const raidSoon = !!(view.bossCast && RAID_CASTS.test(view.bossCast.name)) || (view.next || []).some(([n, s]) => s < 8 && RAID_CASTS.test(n));
    const brimWait = (k.talent('gloomsworn_spill') && busterSoon) ||   // (Waking Dead and Brimming Vessel fire at 80, which the Strikes' own rhythm reaches; Black Pall is free from 60)
      false;
    const holdFull = brimWait && gloom >= 70 && gloom < 99.5 && !hollow;
    if (weave || (myBuster && k.gcdRemaining() > 0.1)) {
      // (the Mantle waits for the buster when one is in the feed: it was once spent at half health on a small blow and missing for the hot Brand)
      if (ok(mantle) && (myBuster || (hp < 0.5 && !hollow && !((k.def.sentinel || k.def.hollowEcho) && nb && nb[1] < 25)))) return mantle;
      // a blow worth more than the Mantle can stand against (the Sovereign's hot Brand is two and a half times the knight's health): the cuts are layered, as a player would,
      // the Pall (or what stands in its place) and then the Rite's barrier, unless the Hollow is the better answer (a full vessel that cannot be saved by the layers keeps its Gloom)
      if ((k.def.sentinel || k.def.hollowEcho) && myBuster && me && me.maxHp > 0 && !hollow && myBuster.dmg && view.dmgScale) {
        const mx = me.maxHp, est = myBuster.dmg * view.dmgScale * 0.9 * (gloom >= 99.5 ? 0.9 : 1) * (k.has('mantle') || ok(mantle) ? 0.6 : 1), safe = mx * (k.def.hollowEcho ? 0.02 : 0.1);   // (a Reaver has the Hollow to fall back on, so the Rite is kept for a blow that would really kill through the Mantle)
        if (me.hp - est < safe) {
          const pa = k.abilities[pall], ra = k.abilities[rite], pid = pa ? pa.id : '';
          const pc = pid === 'pall' ? 0.64 : pid === 'vigil' ? (k.def.hollowEcho ? 0.85 : 0.68) : (k.def.hollowEcho ? 0.72 : 0.9);
          const pallOk = !!pa && ok(pall) && gloom >= gloomPallCost(k), riteOk = !!ra && ok(rite) && gloom >= (ra.id === 'pyre' ? 30 : 20);
          const g2 = gloom - (pallOk ? gloomPallCost(k) : 0), sh = riteOk ? (ra.id === 'pyre' ? (150 + 5 * g2) * 0.5 + mx * 0.06 : (220 + 7 * g2) * 0.5 + mx * (0.05 + 0.0007 * g2)) : 0;
          const survives = me.hp - est * (pallOk ? pc : 1) + sh > mx * 0.03, hollowReady = gloom >= 99.5 && k.now >= (k.g.hollowCdAt || 0);
          if (survives || !hollowReady) {
            if (pallOk) return pall;
            if (riteOk && me.hp - est * (pallOk ? pc : 1) < safe) return rite;
          }
        }
      }
      if (k.abilities[pall] && k.abilities[pall].id === 'vigil' && otherBuster && ok(pall) && gloom >= gloomPallCost(k) && !hollow) return pall;
      // (Black Pyre stands where Last Rite was: the vessel broken over the boss with the party's burst, or when it is full)
      if (k.abilities[rite] && k.abilities[rite].id === 'pyre' && ok(rite) && gloom >= 70 && !hollow && (view.burst || gloom >= 95) && !myBuster) return rite;
      if (ok(rite) && hp < 0.35 && !hollow && gloom >= 20 && !myBuster) return rite;
      // (a Reaver of Dusk's Dusk Reave stands in Black Pall's place: a cut on cooldown, free in a Hollow, and not out of the Gloom a tankbuster is coming for)
      // (the Reaver's Vigil Ward is a Dusk Reave with a ward on someone: pressed the same way, and for a buster at someone else above)
      // (Dusk Reave also lays a cut on the whole party: it is held a few seconds for a raidwide, never longer than ten once ready, and pressed freely in a Hollow)
      if (k.abilities[pall] && k.abilities[pall].id === 'reave') {
        if (!ok(pall)) bot.rvSince = 0;
        else {
          if (!bot.rvSince) bot.rvSince = view.t;
          const inc = BotAI.incoming(view, 4.5) >= 0.3 || !!(view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 3);
          if (hollow || (gloom >= 25 && inc && !busterSoon) || (gloom >= 55 && !busterSoon && view.t - bot.rvSince > 10)) { bot.rvSince = 0; return pall; }
        }
      }
      else if (k.abilities[pall] && (k.abilities[pall].id === 'vigil' && k.def.hollowEcho)) { if (ok(pall) && (hollow || (gloom >= 55 && !busterSoon))) return pall; }
      // (a Sentinel's Pall is kept for the hit that would kill: 60s is long, and it was once spent on a Kindling with the Twin Brands' stack 20s away)
      else if (ok(pall) && gloom >= 30 && !hollow && (BotAI.incoming(view, 4.5) >= (k.def.sentinel ? 0.6 : 0.3) || (view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 3 && BotAI.incoming(view, 4.5) >= (k.def.sentinel ? 0.6 : 0.12)))) return pall;
      if (ok(shade) && !k.has('shade') && gloom >= 50 && !hollow && !holdFull) return shade;   // (the echoes are for Gloom Strikes: step when the vessel can pay for two)
    }
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    // Cover (the Sentinel): a cast aimed at someone else makes the next Strike free, so it goes at once
    if (k.talent('gloomsworn_cover') && k.has('cover') && ok(strike)) return strike;
    const hold = busterSoon && gloom >= 70 && !hollow;
    const cost = k.talent('gloomsworn_hunger') ? gloomStrikeCost(k) : 40;   // (Hollow Hunger: 25 under the shade, 20 in a Hollow)
    if (ok(strike) && gloom >= cost && !hold && !holdFull && (gloom >= 85 || hollow || k.has('shade'))) return strike;
    return ok(0) ? 0 : null;
  },
};

// ======================================================================= Reaper (id thresher; damage, class 19)
// Reaper: swings a four-swing string and finishes it (a shorter one when a telegraph is about to land, so the marks are still laid and
// there is room to move), Snaps when it holds three marks on something, a full crescent or marks about to run out, Void Star on a
// marked target (or with the party's burst), Insane Reaper with the burst, Dusk Veil as a hit lands. Inside Arcane Gate it only swings
// (five swings: the fifth is the release). The Ultimate itself is pressed through BotAI.ult. Oh GCD moves go in the gap after a finisher.
// A Blink out of the red (Step Through, Flicker): the spot nearest the bot's plan that is on the floor and that no telegraph is about to cover.
// The bot walks, so the host's dash does not move it: the bot is put there itself. Null: nowhere to go (the Blink is kept).
function reapEscape(bot, view) {
  let best = null, bd = Infinity;
  const p = bot.plan || view.boss;
  for (let s = 0; s < 16; s++) for (const r of [120, 170]) {
    const a = s * Math.PI / 8, x = bot.x + Math.cos(a) * r, y = bot.y + Math.sin(a) * r;
    if (ARENA.sd(x, y) > -40 || BotAI.dollDanger(view, x, y, 2.0)) continue;
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
BOT_CLASS.thresher = {
  act(bot, k, view) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const open = reapOpen(k), n = reapN(k), gate = !!k.ultWin;
    const q = idx('string'), w = idx('finish'), snap = idx('snap'), star = idx('star'), veil = idx('veil'), frenzy = idx('frenzy');
    const hit = view.mechs.some(m => m.resolveAt - view.t < 1.6 && m.resolveAt > view.t);
    const marks = reapMostMarks(k), tm = reapTargetMarks(k).length;
    const ending = reapAllMarks(k).some(e => e.kinds.some(kd => k.g.marks[e.id][kd].until - k.now < 3));
    // a Phantom blinks about every 7s between strings (in place: a bot walks, it does not dash), so its next finisher is the teleport slash
    if (k.def.phantom && !open && k.now >= (bot.rpBlink || 0) && bot.actor.dashReady(k.now)) { bot.rpBlink = k.now + 7; bot.actor.useDash(k.now, { from: { x: bot.x, y: bot.y }, to: { x: bot.x, y: bot.y }, through: false }); }
    // (a finisher locks 0.55s inside a 1.0s GCD, so a gate of "lock over and 0.4s of GCD left" was one 0.05s tick wide: ok() already
    // waits for the lock, so all that is asked of the GCD is that one is running, for a window of about 0.4s)
    // the talents that use the Blink (the dash: two charges, 12s each; the bot walks, so it blinks in place and the kit is told where from and to). Through the
    // telegraph on its feet (Step Through, Flicker); a swing added to a short string (Unbroken Step); a slash through the boss whenever a charge is spare (Moonrise).
    // A charge is kept for the dodge.
    if (bot.actor.dashReady(k.now) && (k.talent('thresher_step') || k.talent('thresher_flicker') || k.talent('thresher_unbroken') || k.talent('thresher_moonrise'))) {
      const spare = bot.actor.dash.charges >= 2, from = { x: bot.x, y: bot.y }, bb = view.boss, fl = Math.atan2(bb.y - bot.y, bb.x - bot.x);
      if (BotAI.dollDanger(view, bot.x, bot.y, 1.0) && (k.talent('thresher_step') || k.talent('thresher_flicker'))) {
        // (it leaves the ring: a Blink that stays in it is dodged by nothing, and Flicker's charge back would only be spent in it again)
        const to = view.t - (bot.rpDodge ?? -9) > 1.5 ? reapEscape(bot, view) : null;
        if (to) { bot.rpDodge = view.t; bot.actor.useDash(k.now, { from, to, through: true }); bot.x = to.x; bot.y = to.y; }
      }
      else if (spare && k.talent('thresher_unbroken') && open && n >= 1 && n < 3 && bot.rpUnb !== k.g.str.start) { bot.rpUnb = k.g.str.start; bot.actor.useDash(k.now, { from, to: from, through: false }); }
      else if (spare && k.talent('thresher_moonrise') && Math.hypot(bb.x - bot.x, bb.y - bot.y) < 260) bot.actor.useDash(k.now, { from, to: { x: bot.x + Math.cos(fl) * 200, y: bot.y + Math.sin(fl) * 200 }, through: false });
    }
    if (!open && k.gcdRemaining() > 0.1 && !k.cast) {
      if (ok(frenzy) && view.burst) return frenzy;
      if (ok(veil) && hit) return veil;
      if (ok(star) && (tm >= (k.talent('thresher_linger') ? 2 : 3) || (view.burst && tm >= 2))) return star;   // (Lingering Star fills the marks a stack of two is missing)
      if (ok(snap) && (marks >= 4 || ((k.g.moon || 0) >= 100 && marks >= 2) || (ending && marks >= 1) || (k.talent('thresher_quick') && marks >= 1))) return snap;   // (Quick Harvest: each Snap pops one mark, so it comes on every cooldown)
    }
    if (k.gcdRemaining() > 0 && !open) return null;
    if (k.cast || k.lockUntil > k.now) return null;
    if (gate) return ok(q) ? q : null;
    // the finisher the target is missing a mark for (the longest first); four marks make a Full Harvest
    const have = reapTargetMarks(k), missing = [4, 3, 2, 1].filter(i => !have.includes(REAP.KINDS[i - 1]));
    const want = missing[0] || 4;   // (swings are instant: it can walk through a string, so a telegraph does not shorten it)
    if (open && n >= want && ok(w)) return w;
    return ok(q) ? q : (open && ok(w) ? w : null);
  },
};

// ======================================================================= Houndmaster (damage, class 23)
// Cycles the pairs Pincer (Rend) > Surround (Hamstring) > Pack (Bring Down): points the Whistle at the side each hound is missing from
// the pair (the hound it sends is the next one: bot.shift stays off), a Hold and a pounce for the Pack when the key is ready; Call Off
// the moment a telegraph is about to land on a hound; the finisher once its pair stands (or Bond is going to waste); Mark the Quarry
// with the party's burst. Wild Hunt is pressed through BotAI.ult (burst: with the Quarry up) and its free finishers are simply pressed.
const HD_BOT_WANT = [['left', 'right'], ['front', 'behind'], ['behind', 'behind']];
const HD_BOT_PAIR = ['rend', 'hamstring', 'bringdown'];
// A Lone Wolf bot (Greyfang alone, so the pair is its place and the bot's own): it stands on the flank opposite Greyfang's (any flank when Greyfang
// is behind, which is a Pack), puts Greyfang behind with a Hold and a pounce in the party's burst, rides on every Mount, charges with the knife and
// leaps off (Ride Down) after two charges or just before the ride ends. Call Off the moment a telegraph is about to land on Greyfang, Mark the Quarry with the burst.
function hdSoloAct(bot, k, view) {
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const weave = k.gcdRemaining() > 0.55 && !k.cast && k.lockUntil <= k.now;
  const W = idx('flank'), E = idx('finisher'), R = idx('pounce'), D = idx('calloff'), F = idx('quarry'), Q = idx('knife');
  const e = hdEnemy(k), gf = hdLiveReal(k)[0], g = k.g, riding = hdMounted(k);
  if (weave && e) {
    if (riding) {
      if (ok(W) && ((!k.talent('houndmaster_saddleborn') && k.now - g.mountAt >= 4.6) || g.mountUntil - k.now < 1.3)) return W;   // (Saddle Born: the ride runs to its end, not the base ride's 4.6s)   // (Ride Down)
    } else {
      if (ok(D) && gf && gf.mode !== 'guard' && gf.mode !== 'pounce' && BotAI.dollDanger(view, gf.x, gf.y, 1.6)) return D;
      if (W >= 0 && k.abilities[W].id === 'howl' && ok(W) && (view.burst || view.t - (bot.hdHAt || 0) > 20)) { bot.hdHAt = view.t; return W; }
      if (ok(F)) {
        if (bot.hdQAt == null) bot.hdQAt = view.t;
        if (view.burst || view.t - bot.hdQAt > 20) { bot.hdQAt = null; return F; }
      } else bot.hdQAt = null;
      if (view.burst && gf && ok(R) && (hdHolding(k) || gf.slot !== 'behind')) return R;   // (a hold, then the pounce that puts Greyfang behind)
      if (W >= 0 && k.abilities[W].id === 'mount' && ok(W) && gf && gf.mode !== 'guard' && gf.mode !== 'pounce') return W;
    }
  }
  if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
  const bond = g.bond || 0, pair = hdPairNow(k);
  if (!riding && ok(E) && (hdWild(k) || (bond >= 40 && (pair || bond >= 90)))) return E;
  return ok(Q) ? Q : null;
}
BOT_CLASS.houndmaster = {
  home(bot, view) {
    const b = view.boss, f = b.facing || 0, k = bot.actor && bot.actor.kit;
    let a = f + Math.PI;
    if (k && k.def.solo) {   // (the other half of the pair: the flank across from Greyfang's, or either flank if it is behind)
      const gf = hdLiveReal(k)[0], s = gf && (gf.goal || gf.slot);
      if (s === 'left') a = f + HD_OFF.right; else if (s === 'right') a = f + HD_OFF.left; else if (s === 'behind') a = f + HD_OFF[(bot.slot || 0) % 2 ? 'right' : 'left'];
    }
    return { x: b.x + Math.cos(a) * 105, y: b.y + Math.sin(a) * 105 };
  },
  act(bot, k, view, moving) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const weave = k.gcdRemaining() > 0.55 && !k.cast && k.lockUntil <= k.now;
    const W = idx('flank'), E = idx('finisher'), R = idx('pounce'), D = idx('calloff'), F = idx('quarry'), Q = idx('knife');
    const e = hdEnemy(k), live = hdLiveReal(k), g = k.g;
    bot.aim = null; bot.shift = false;
    if (k.def.solo) return hdSoloAct(bot, k, view);
    if (g.lastFin && g.lastFin.at !== bot.hdFinAt) { bot.hdFinAt = g.lastFin.at; bot.hdPlan = ((bot.hdPlan || 0) + 1) % 3; }   // (the next pair after each finisher)
    const plan = bot.hdPlan || 0, want = HD_BOT_WANT[plan];
    // (Call Off the moment a hound stands in the red: an oGCD, so it does not wait for the weave window)
    if (e && ok(D) && live.some(h => h.mode !== 'guard' && h.mode !== 'pounce' && BotAI.dollDanger(view, h.x, h.y, 1.6))) return D;
    if (weave && e) {
      if (W >= 0 && k.abilities[W].id === 'howl' && ok(W) && (view.burst || view.t - (bot.hdHAt || 0) > 20)) { bot.hdHAt = view.t; return W; }   // (a Howl on W, if a bot holds the talent: with the party's burst. The Long Chase on F goes through the Quarry's own line)
      // (The Long Chase, in the Mark's place: on every cooldown, and the lap ends in a Bring Down pair. Drive: the Mark holds the hounds where they stand,
      // so with the burst the bot puts them behind the boss first (the pounce below), for up to 5s, and marks then)
      const chase = F >= 0 && k.abilities[F].id === 'longchase', behind = live.length === 2 && live.every(h => h.goal === 'behind');
      if (ok(F)) {
        if (bot.hdQAt == null) bot.hdQAt = view.t;
        if (chase) { bot.hdQAt = null; bot.hdPlan = 2; return F; }
        if (view.burst || view.t - bot.hdQAt > 20) {
          if (k.talent('houndmaster_drive') && !behind) { if (bot.hdGoAt == null) bot.hdGoAt = view.t; bot.hdPlan = 2; }
          if (!k.talent('houndmaster_drive') || behind || view.t - (bot.hdGoAt ?? view.t) > 5) { bot.hdQAt = null; bot.hdGoAt = null; return F; }
        }
      } else { bot.hdQAt = null; bot.hdGoAt = null; }
      // (Running Bond: with the finisher far off, a hound is whistled across to the other flank: Bond comes while it runs)
      if (k.talent('houndmaster_runningbond') && W >= 0 && k.abilities[W].id === 'flank' && ok(W) && live.length === 2 && (g.bond || 0) < 25 && !hdHolding(k) && !view.burst) {
        const h = live.find(x => x.id === g.next) || live[0], f = hdFace(k, e) + HD_OFF[h.goal === 'left' ? 'right' : 'left'], r = mariER(e) + 90;
        bot.aim = { x: e.x + Math.cos(f) * r, y: e.y + Math.sin(f) * r };
        return W;
      }
      if (live.length === 2 && !hdWild(k) && live.map(h => h.goal).sort().join() !== want.slice().sort().join()) {
        if (plan === 2 && ok(R)) return R;   // (a hold, then the pounce that lands both behind)
        if (!(plan === 2 && hdHolding(k)) && ok(W) && k.abilities[W].id === 'flank') {
          const h = live.find(x => x.id === g.next) || live[0], o = live.find(x => x !== h), rest = want.slice();
          const oi = o ? rest.indexOf(o.goal) : -1;
          if (oi >= 0) rest.splice(oi, 1);
          const f = hdFace(k, e) + HD_OFF[rest[0] || want[0]], r = mariER(e) + 90;
          bot.aim = { x: e.x + Math.cos(f) * r, y: e.y + Math.sin(f) * r };
          return W;
        }
      }
    }
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    const bond = g.bond || 0, pair = hdPairNow(k);
    if (ok(E) && (hdWild(k) || (bond >= 40 && ((pair && (pair === HD_BOT_PAIR[plan] || bond >= 60)) || bond >= 90)))) return E;
    return ok(Q) ? Q : null;
  },
};

// ======================================================================= Kenseier (tank, class 22)
// Every blow aimed at the bot has a beat: the boss's next auto (view.autoAt, the moment the host will swing, held back by a
// Break, a stun or a pause) and every tankbuster telegraph on it. A Warden's deflect also reaches an ally in range, so a buster on
// one of them close enough is a beat too. Each beat gets ONE planned press at (its time + a skill jitter): a pro is about
// +-0.08 s (a bell of 0.045 s, never past 0.08), a sloppy bot (bot.sloppy = true) a flat +-0.3 s and lets one in seven go by.
// The jitter comes from the beat's time, not the host's dice, so a seed replays the same way. A press after the blow still
// counts too (the host gives the blow back, and the Poise), but a press a hair before the blow reads better than one a hair after, so the plan sits 0.045 s early.
BotAI.kenHits = function (bot, view, reach) {
  const out = [], t = view.t;
  // (a Break holds the autos back, and the first swing comes KENSEI.RESUME after it ends: the host's autoAt is only the Break's end, so the beat is that much later; a press at the bare end is a miss and its lockout runs over the real swing)
  const brk = view.posture && view.posture[2] > 0 ? t + view.posture[2] + KENSEI.RESUME : 0;
  const autoAt = view.autoAt != null && brk ? Math.max(view.autoAt, brk) : view.autoAt;
  if (autoAt != null && view.bossTarget === bot.id && !view.boss.untargetable && autoAt > t - 0.01) out.push({ at: autoAt, kind: 'auto', own: true });
  const me = view.players.find(p => p.id === bot.id);
  // (a Warden covers its co-tank too: the boss's swing at an ally within reach is a beat of its own, Long Guard widening the reach)
  if (reach > 0 && me && autoAt != null && view.bossTarget != null && view.bossTarget !== bot.id && !view.boss.untargetable && autoAt > t - 0.01) {
    const a = view.players.find(p => p.id === view.bossTarget);
    if (a && a.alive && hypot2(a.x - me.x, a.y - me.y) <= reach - 10) out.push({ at: autoAt, kind: 'auto', own: false });
  }
  for (const m of view.mechs) {
    if (m.type !== 'buster' || m.resolveAt <= t) continue;
    const tg = m.target ?? m.follow;
    if (tg === bot.id) out.push({ at: m.resolveAt, kind: 'buster', own: true });
    else if (reach > 0 && tg != null && me) {
      const a = view.players.find(p => p.id === tg);
      if (a && a.alive && hypot2(a.x - me.x, a.y - me.y) <= reach - 10) out.push({ at: m.resolveAt, kind: 'buster', own: false });
    }
  }
  return out.sort((a, b) => a.at - b.at);
};
BOT_CLASS.kenseier = {
  act(bot, k, view) {
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
    const ok = i => { const a = k.abilities[i]; return i >= 0 && !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const t = view.t, K = bot.ken || (bot.ken = { plans: [] });
    const hits = BotAI.kenHits(bot, view, kenCross(k));
    const same = (p, h) => Math.abs(h.at - p.for) < 0.04;
    // (a done plan stays while its blow is still ahead, so it is not made twice; an undone one whose blow has gone stays a moment for a late press)
    const broken = !!(view.posture && view.posture[2] > 0);   // (a Break holds the boss's autos back: a press planned for one would meet nothing)
    K.plans = K.plans.filter(p => (p.done ? hits.some(h => same(p, h)) : hits.some(h => same(p, h)) || (t - p.at < 0.4 && t >= p.at - 0.02 && !(broken && p.kind === 'auto'))));
    const u = (at, n) => { const x = Math.sin((at + n * 0.37) * 91.7 + bot.id * 7.13) * 43758.5453; return x - Math.floor(x); };
    for (const h of hits) {
      if (h.at - t > 1.2 || K.plans.some(p => same(p, h) || (!p.skip && Math.abs(p.for - h.at) < 0.35))) continue;
      const g = Math.sqrt(-2 * Math.log(1 - u(h.at, 2) * 0.999999)) * Math.cos(2 * Math.PI * u(h.at, 3));
      const jit = bot.sloppy ? (u(h.at, 1) * 2 - 1) * 0.3 : Math.max(-0.22, Math.min(0.22, g * 0.075));
      K.plans.push({ kind: h.kind, for: h.at, at: h.at + jit - 0.045, skip: u(h.at, 4) < (bot.sloppy ? 0.15 : h.kind === 'buster' ? 0 : 0.05), done: false });   // (a pro never lets a tankbuster go by: the chance is drawn from the beat's time, so a skipped buster would be the same one in every run, a thousand damage whenever the fight's timing puts it on one)
    }
    const planNear = within => K.plans.some(p => !p.done && !p.skip && p.at - t < within && p.at - t > -0.1);
    const defl = idx('deflect'), cut = idx('cut'), db = idx('deathblow'), mantle = idx('mantle'), guard = idx('guard'), mk = idx('mikiri');
    // the press itself (it queues behind a short animation lock; a locked or Off-balance Kenseier lets the beat go)
    const due = K.plans.find(p => !p.done && !p.skip && t >= p.at);
    if (due) {
      due.done = true;
      const a = k.abilities[defl];
      if (a && k.usable(a) && k.available(a) && !k.cast) return defl;
    }
    // Feint (row I): right after a Good deflect the Pommel (a Warden's Redirect) is off the global cooldown and turns it into a Perfect
    if (k.talent('kenseier_feint') && !kenBroken(k) && k.now < (k.g.feintUntil || 0) && ok(db)) return db;
    const weave = k.gcdRemaining() > 0.5 && !k.cast && k.lockUntil <= k.now;
    const ownBuster = hits.find(h => h.own && h.kind === 'buster');
    // Ash Mantle ahead of a tankbuster aimed at it (after a deflect press's lock, before the next beat)
    if (k.lockUntil <= k.now && !k.cast && ownBuster && ownBuster.at - t < 2.6 && ownBuster.at - t > 0.8 && ok(mantle) && !planNear(0.65)) return mantle;
    if (weave && !planNear(0.65)) {
      // Guard Stance / Iai Stance / Ember Duel: up as a blow of its own is about to come
      if (ok(guard) && hits.some(h => h.own && h.at - t < 2.5)) return guard;
      if (ok(mk)) {
        if (k.abilities[mk].id === 'whirlwind') { if ((k.env.enemiesNear ? k.env.enemiesNear(110) : [1]).length > 0) return mk; }
        else {
          // Mikiri Step through a frontal that is about to land where it stands (it passes through: no hit, +Posture)
          const me = view.players.find(p => p.id === bot.id);
          const land = me && view.mechs.some(m => m.type === 'aoe' && m.avoidable !== false && !m.cover && m.resolveAt - t > 0.1 && m.resolveAt - t < 0.4 && SHAPES.contains(m.shape, me.x, me.y, 14));
          if (land) return mk;
        }
      }
    }
    if (k.gcdRemaining() > 0.0001 || k.cast || k.lockUntil > k.now || planNear(0.35)) return null;
    if (kenBroken(k)) {   // (Grand Deathblow: a Cut while it fits, then the Deathblow as the Break runs out)
      const left = k.g.breakUntil - k.now;
      if (k.talent('kenseier_patient') && !k.talent('kenseier_grand') && k.g.patientAt !== k.g.breakAt && left > 0.9) return ok(cut) ? cut : null;   // (Patient Edge: a Cut while the wait is paid, then the stroke)
      if (k.talent('kenseier_grand') && left > KENSEI.GRAND_WINDOW) return left > KENSEI.GRAND_WINDOW + 0.7 && ok(cut) ? cut : null;
      return ok(db) ? db : null;
    }
    // (Pommel; a Warden's Redirect only for a blow worth sending back, a tankbuster's)
    if (ok(db) && (!k.def.warden || (k.g.lastDef && k.g.lastDef.a >= 0.15 * k.env.maxHp()))) return db;
    return ok(cut) ? cut : null;
  },
};

// ------------------------------------------------------------------------------------------------------------------------------
// Human-like play (a measurement tool, off unless a bot carries `bot.human`: tools/bot-raid.js HUMAN=..., tools/comp-sweep.js human=...).
// A "human" bot runs the same AI as any bot, but through a filter that loses what a decent (not newbie) player loses: it only sees a
// telegraph after a reaction time, now and then notices one late and dodges short or the wrong way, waits out the end of a cast rather
// than slidecasting, stays a moment where it dodged to before heading back, is a little late on each global cooldown (with the odd
// longer lapse), is slower to start again after a walk, and sometimes presses the plain filler instead of the best button.
// Everything is drawn from the host's seeded rng, so a run is the same every time. Tune with the HUMANP env (JSON) or HUMAN_DEFAULTS.
const HUMAN_DEFAULTS = {
  react: [0.40, 0.65],       // seconds from a telegraph appearing to the bot acting on it
  misjudge: 0.18,            // chance per telegraph that it is only noticed late ...
  misjudgeLeft: 0.45,        // ... this many seconds before it lands
  wrongWay: 0.30,            // of the late ones, the chance the first step goes the wrong way (for 0.3 s)
  shortFrac: [0.6, 0.9],     // of the late ones that go the right way, how much of the dodge's distance is covered at first
  returnDelay: [0.6, 1.8],   // seconds spent where it dodged to before heading back
  castHold: 0.5,             // a cast with this many seconds left (and nothing landing first) is waited out, not slid out of
  gcdSlop: [0.05, 0.30],     // seconds late on each global cooldown
  lapseChance: 0.12,         // chance a global cooldown is a longer lapse (looking at the floor, the feed) ...
  lapse: [0.8, 2.2],         // ... of this many seconds
  fillerChance: 0.15,        // chance a damage dealer's global cooldown is the plain first button instead of the best one
  reengage: [0.30, 0.80],    // seconds before pressing again after a walk of more than 0.4 s
};
const BotHuman = {
  rand(h, r) { return r[0] + h.rng() * (r[1] - r[0]); },
  // who plays human: 'dps' | 'tank' | 'healer' | 'all' | 'none' (or a comma list); params override HUMAN_DEFAULTS
  attach(host, who, params) {
    const want = String(who || 'none').split(',');
    if (want.includes('none') && want.length === 1) return;
    let env = null;
    try { if (typeof process !== 'undefined' && process.env && process.env.HUMANP) env = JSON.parse(process.env.HUMANP); } catch (e) { env = null; }
    const p = Object.assign({}, HUMAN_DEFAULTS, env || {}, params || {});
    for (const b of host.bots) if (want.includes('all') || want.includes(b.role)) b.human = { p, rng: host.rng, seen: new Map(), gate: 0, reGate: 0, holdUntil: 0, sig: null, late: null, vc: null, filler: false, mvStart: null, evading: false };
  },
  // the view as this player sees it: a telegraph shows up after a reaction time (a late one, only just before it lands)
  view(bot, view) {
    const h = bot.human, P = h.p, t = view.t;
    if (h.vc && h.vc.view === view) return h.vc.hv;
    const seen = h.seen;
    if (seen.size > 300) for (const id of seen.keys()) if (!view.mechs.some(m => m.id === id)) seen.delete(id);
    const mechs = [];
    for (const m of view.mechs) {
      let s = seen.get(m.id);
      if (!s) {
        const free = m.type === 'raidwide' || m.type === 'buster';   // (nothing to step out of)
        const late = !free && h.rng() < P.misjudge;
        s = { at: late ? Math.max(m.start + 0.1, m.resolveAt - P.misjudgeLeft) : m.start + BotHuman.rand(h, P.react), late, fired: false };
        seen.set(m.id, s);
      }
      if (t < s.at) continue;
      if (s.late && !s.fired) {
        s.fired = true;
        h.late = { until: t + 0.3, wrong: h.rng() < P.wrongWay, frac: BotHuman.rand(h, P.shortFrac) };
      }
      mechs.push(m);
    }
    const hv = Object.assign({}, view, { mechs });
    h.vc = { view, hv };
    return hv;
  },
  move(bot, view) {
    const h = bot.human, P = h.p, t = view.t, hv = BotHuman.view(bot, view);
    let plan;
    h.inner = true;
    try { plan = BotAI.move(bot, hv); } finally { h.inner = false; }
    const here = { x: bot.x, y: bot.y };
    const unsafe = BotAI.danger(bot, bot.x, bot.y, hv) >= 400;
    // having dodged: stay where you are a moment before going back
    if (unsafe) { h.evading = true; h.holdUntil = 0; }
    else if (h.evading) { h.evading = false; h.holdUntil = t + BotHuman.rand(h, P.returnDelay); }
    if (!unsafe && t < h.holdUntil) plan = here;
    // a telegraph noticed late: a short first step, or one the wrong way
    if (unsafe && h.late && t < h.late.until && plan) {
      const dx = plan.x - bot.x, dy = plan.y - bot.y;
      plan = h.late.wrong ? ARENA.clamp({ x: bot.x - dx * 0.6, y: bot.y - dy * 0.6 }, 50) : { x: bot.x + dx * h.late.frac, y: bot.y + dy * h.late.frac };
    }
    // no slidecasting: with the end of a cast near and nothing landing on this spot first, finish it
    const k = bot.actor && bot.actor.kit;
    if (k && k.cast && plan && Math.hypot(plan.x - bot.x, plan.y - bot.y) > 6) {
      const left = k.cast.end - k.now;
      if (left <= P.castHold) {
        let hit = Infinity;
        for (const m of view.mechs) if (m.type === 'aoe' && m.resolveAt > t && SHAPES.contains(m.shape, bot.x, bot.y, 22)) hit = Math.min(hit, m.resolveAt - t);
        if (hit > left + 0.25) plan = here;
      }
    }
    return plan;
  },
  act(bot, k, view) {
    const h = bot.human, P = h.p, t = view.t;
    // a walk just ended: a moment before pressing again
    if (bot.moving) { if (h.mvStart == null) h.mvStart = t; }
    else if (h.mvStart != null) { if (t - h.mvStart > 0.4) h.reGate = t + BotHuman.rand(h, P.reengage); h.mvStart = null; }
    // each global cooldown: a little late, now and then a lot, now and then the filler
    const sig = k.gcdFree() ? k.lockUntil : k.gcdReady;
    if (sig !== h.sig) {
      h.sig = sig;
      const slop = h.rng() < P.lapseChance ? BotHuman.rand(h, P.lapse) : BotHuman.rand(h, P.gcdSlop);
      h.gate = Math.max(h.gate, Math.max(k.gcdReady, k.lockUntil, k.cast ? k.cast.end : 0) + slop);
      h.filler = bot.role === 'dps' && h.rng() < P.fillerChance;
    }
    if (t < h.reGate) return null;
    const hv = BotHuman.view(bot, view);
    let i;
    h.inner = true;
    try { i = BotAI.act(bot, k, hv); } finally { h.inner = false; }
    if (i != null && t < h.gate) { const g = k.abilities[i]; if (g && g.type === 'gcd') return null; }   // (late on the global cooldown: the weaves are not held)
    if (h.filler && i != null && i !== 0) {
      const a = k.abilities[i], a0 = k.abilities[0];
      if (a && a.type === 'gcd' && !a.allowDead && a0 && a0.type === 'gcd' && a0.target === 'enemy' && !a0.ult && k.usable(a0) && k.readyIn(a0) <= 0.0001 && k.available(a0)) { i = 0; h.filler = false; }
    }
    return i;
  },
};

// DPS-loss breakdown per player (tools/bot-raid.js BREAKDOWN=1, tools/comp-sweep.js breakdown=1): call sample(dt) after every host.tick(dt).
// dead: seconds down. out: alive but with nothing of the first damaging button's reach to hit (the boss untargetable counts for nobody).
// moving: seconds walking. idle: alive, in reach, standing, not casting, global cooldown up and still no press. interrupts: casts cancelled.
const BotBreakdown = {
  make(host) {
    const per = {};
    for (const b of host.bots) per[b.id] = { name: b.name, cls: b.cls.id, role: b.role, human: !!b.human, alive: 0, dead: 0, out: 0, moving: 0, idle: 0, interrupts: 0, avoidable: 0, damage: 0 };
    return {
      per,
      sample(dt) {
        const sim = host.sim;
        if (sim.state !== 'live') return;
        for (const b of host.bots) {
          const r = per[b.id], s = sim.ps.get(b.id);
          if (!s || !s.alive) { r.dead += dt; continue; }
          r.alive += dt;
          const k = b.actor.kit;
          if (b.moving) r.moving += dt;
          if (sim.boss.untargetable) continue;
          const ab = k.abilities.find(a => a.target === 'enemy' && !a.ult);
          if (!ab) continue;
          if (!k.env.target(ab)) { r.out += dt; continue; }
          if (!b.moving && !k.cast && k.now >= k.lockUntil && k.gcdRemaining() <= 0) r.idle += dt;
        }
      },
      result() {
        const out = {};
        for (const b of host.bots) {
          const r = per[b.id], st = host.sim.stats[b.id] || {};
          out[b.id] = Object.assign({}, r, { interrupts: (b.actor.kit.stats && b.actor.kit.stats.interrupts) || 0, avoidable: st.avoidable || 0, damage: st.damage || 0 });
        }
        return out;
      },
    };
  },
  // one line per player, seconds as a share of the time alive where that reads better
  format(res, dur) {
    return Object.values(res).map(r => `${r.name}/${r.cls}${r.human ? '*' : ''}: ${(r.damage / dur).toFixed(0)} dps | dead ${r.dead.toFixed(0)}s, out of reach ${r.out.toFixed(0)}s, moving ${r.moving.toFixed(0)}s, gcd idle ${r.idle.toFixed(0)}s, casts cancelled ${r.interrupts}, avoidable hits ${r.avoidable}`).join('\n   ');
  },
};

if (typeof module !== 'undefined') module.exports = { BotAI, BotHuman, BotBreakdown, HUMAN_DEFAULTS };
