// Bots that fill empty party slots (host only). They move by scoring candidate spots against every live
// telegraph, and fight with the real class kits using a simple "competent player" priority.

// do segments p1-p2 and q1-q2 cross?
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

// the bosses' tankbusters by cast name, and the tank cooldowns that answer them
const BUSTER_CASTS = /^(Tenderize|Silk Wrap|Titan Fist|Grave Cleave)$/;
const TANK_CDS = ['bulwark', 'zeal', 'undying', 'banner', 'sanctum', 'warcry'];
// ... and the casts that hurt the whole party, which healers top people up for
const RAID_CASTS = /^(Grease Fire|Simmer|Venom Mist|Tightening Web|Thunderclap|Thunder Crash|Static Field|Polarity Surge|Skyfall|Barrow Knell|Grave Marks)$/;

const BotAI = {
  isMelee(cls) { return KITS[cls.id].abilities[0].range === 'melee'; },

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
  partner(me, view) {
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
    const out = (view.posts || []).map(c => ({ x: c.x, y: c.y }));
    for (const m of view.mechs) if (m.tag === 'rod') out.push({ x: m.shape.x, y: m.shape.y });
    return out;
  },
  sheltered(px, py, view) {
    const b = view.boss;
    return this.covers(view).some(c => {
      const cx = c.x - b.x, cy = c.y - b.y, cd = Math.hypot(cx, cy);
      if (cd < 1) return false;
      const ux = cx / cd, uy = cy / cd, qx = px - b.x, qy = py - b.y;
      return qx * ux + qy * uy >= cd - 20 && Math.abs(-qx * uy + qy * ux) <= 34;   // a little inside the real shelter
    });
  },
  // which rod this bot should catch: players without Conductive take them in order, bots before humans (a bot can't
  // count on a person knowing which rod is "theirs"), tanks last
  rodFor(me, view) {
    const rods = view.mechs.filter(m => m.tag === 'rod').sort((a, b) => a.id - b.id);
    if (!rods.length) return null;
    const deb = id => view.debuffs(id).conductive ? 1 : 0, human = p => (p.id < 1000 ? 1 : 0);
    const order = view.players.filter(p => p.alive).sort((a, b) => deb(a.id) - deb(b.id) || human(a) - human(b) || (a.role === 'tank') - (b.role === 'tank') || a.id - b.id);
    // nearest free rod for each catcher in turn
    const free = [...rods], mine = {};
    for (const p of order) {
      if (!free.length) break;
      let bi = 0;
      for (let i = 1; i < free.length; i++) if (Math.hypot(free[i].shape.x - p.x, free[i].shape.y - p.y) < Math.hypot(free[bi].shape.x - p.x, free[bi].shape.y - p.y)) bi = i;
      mine[p.id] = free.splice(bi, 1)[0].id;
    }
    return mine[me] ?? null;
  },

  // Rod Strike: which standing stone this marked bot brings its bolt down on. The marked take the nearest uncharged
  // stone in turn (a charged one would discharge); null if this bot isn't marked
  stoneFor(me, view) {
    // people first (they'll take the stone nearest them), then the bots fit round them
    const marks = view.mechs.filter(m => m.tag === 'rodstrike').sort((a, b) => (a.follow >= 1000) - (b.follow >= 1000) || a.id - b.id);
    if (!marks.some(m => m.follow === me)) return null;
    const free = (view.props || []).filter(p => p.kind === 'stone').sort((a, b) => (a.state > 0) - (b.state > 0));
    const mine = {};
    for (const m of marks) {
      const p = view.players.find(q => q.id === m.follow && q.alive);
      if (!p || !free.length) continue;
      const cool = free.filter(s => !(s.state > 0)), pool = cool.length ? cool : free;
      let best = pool[0];
      for (const s of pool) if (Math.hypot(s.x - p.x, s.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = s;
      mine[m.follow] = best; free.splice(free.indexOf(best), 1);
    }
    return mine[me] || null;
  },

  // any other one-person towers (Order Up!'s plates, Egg Sacs): the players take the nearest free one in turn, the
  // tank last (it holds the boss) and anyone Stuffed after everyone else
  // Towers that land one after another (Order Up!'s rail) are handed out in the order they land: each goes to whoever
  // can be standing in it in time (free by then, and not still Stuffed from an earlier one: m.stuff), nearest first.
  towerFor(me, view) {
    const towers = view.mechs.filter(m => m.type === 'tower' && m.tag !== 'rod' && m.tag !== 'bell').sort((a, b) => a.resolveAt - b.resolveAt || a.id - b.id);
    if (!towers.length) return null;
    const SPEED = 230;
    const al = view.players.filter(p => p.alive);
    const st = new Map(al.map(p => [p.id, { x: p.x, y: p.y, free: view.t, full: view.t + (view.debuffs(p.id).stuffed || 0), tank: p.role === 'tank', n: 0 }]));
    const mine = {};
    for (const m of towers) {
      let best = null, bs = Infinity;
      for (const p of al) {
        const s = st.get(p.id);
        if (s.full > m.resolveAt - 0.05) continue;   // still Stuffed when it lands
        const arrive = s.free + Math.hypot(m.shape.x - s.x, m.shape.y - s.y) / SPEED, late = Math.max(0, arrive - (m.resolveAt - 0.35));
        const sc = late * 1000 + arrive + (s.tank ? 1.5 : 0) + s.n * 4;   // one each where it can be
        if (sc < bs) { bs = sc; best = p; }
      }
      if (!best) continue;
      const s = st.get(best.id);
      if (mine[best.id] == null) mine[best.id] = m.id;
      s.x = m.shape.x; s.y = m.shape.y; s.free = m.resolveAt; s.full = m.resolveAt + (m.stuff || 0); s.n++;
    }
    return mine[me] ?? null;
  },

  // --- the room's props -----------------------------------------------------------------------
  // a cover mechanic: which prop this bot hides behind. Everyone takes a prop in id order, healthiest and nearest
  // first, at most `cap` to a prop (the mechanic's own cap, or enough to fit everyone, two at least)
  coverFor(me, view, m) {
    const props = (view.props || []).filter(p => p.cover);
    if (!props.length) return null;
    const al = view.players.filter(p => p.alive).sort((a, b) => a.id - b.id);
    const cap = m.coverCap || Math.max(2, Math.ceil(al.length / props.length));
    const room = new Map(props.map(p => [p, cap])), mine = {};
    for (const p of al) {
      let best = null, bs = Infinity;
      for (const pr of props) {
        if (!room.get(pr)) continue;
        const spot = PROPS.shadowSpot(m.src.x, m.src.y, pr, 30), s = Math.hypot(spot.x - p.x, spot.y - p.y) - (pr.maxHp ? pr.hp * 90 : 200);
        if (ARENA.sd(spot.x, spot.y) > -16) continue;
        if (s < bs) { bs = s; best = pr; }
      }
      if (best) { mine[p.id] = best; room.set(best, room.get(best) - 1); }
    }
    return mine[me] || null;
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
      const spot = { x: b.x + c * 170, y: b.y + s * 170 }, sc = Math.min(L, 500) - Math.hypot(spot.x - b.x, spot.y - (b.y + 125)) * 0.1;
      if (ARENA.sd(spot.x, spot.y) > -40) continue;
      if (sc > bs) { bs = sc; best = spot; }
    }
    return best;
  },

  // --- the Hollow King -------------------------------------------------------------------------
  // Barrow Bells: people go to the bell they're nearest, then the bots fill whatever is still short, nearest first
  bellFor(me, view) {
    const bells = view.mechs.filter(m => m.tag === 'bell').sort((a, b) => a.id - b.id);
    if (!bells.length) return null;
    const need = bells[0].need || 1, room = bells.map(() => need), mine = {};
    const al = view.players.filter(p => p.alive);
    const dist = (p, m) => Math.hypot(m.shape.x - p.x, m.shape.y - p.y);
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
    return mine[me] ?? null;
  },
  // where Doom sends this bot, if anywhere: the doomed walk into the nearest light; a lantern carrier takes it to the
  // doomed; one bot fetches a lantern for a doomed person; in the Long Night one bot carries the last lantern
  lanternJob(bot, view) {
    const doomed = view.doomed, lants = view.lanterns || [];
    if (!lants.length) return null;
    const me = bot.id, al = view.players.filter(p => p.alive);
    const near = (p, list) => list.reduce((m, o) => (!m || Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(m.x - p.x, m.y - p.y) ? o : m), null);
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
    for (const p of helpers) { const l = near(p, free), d = Math.hypot(l.x - p.x, l.y - p.y); if (d < bd) { bd = d; best = p; } }
    if (!best || best.id !== me) return null;
    const l = near(self, free);
    return { x: l.x, y: l.y };
  },

  home(bot, view) {
    const b = view.boss, idx = bot.slot || 0;
    const own = typeof BOT_CLASS !== 'undefined' && BOT_CLASS[bot.cls.id] && BOT_CLASS[bot.cls.id].home;   // a class with its own footwork
    if (own) { const h = own(bot, view); if (h) return h; }
    // on an add: melee hug it, ranged stand off to one side of it (out of any beam to its sibling)
    const homeId = bot.wantEnemy === 'hold' ? bot.addHome : bot.wantEnemy;
    const add = homeId && (view.adds || []).find(a => a.id === homeId);
    if (add) {
      const toC = Math.atan2(-add.y, -add.x) + (idx % 2 ? 0.9 : -0.9);
      const d = this.isMelee(bot.cls) ? add.r + 40 : 230;
      return { x: add.x + Math.cos(toC) * d, y: add.y + Math.sin(toC) * d };
    }
    if (bot.role === 'tank') return { x: b.x, y: b.y - 125 };
    if (this.isMelee(bot.cls)) return { x: b.x + (idx % 2 ? 40 : -40), y: b.y + 115 };
    return { x: b.x + (idx % 2 ? 170 : -170), y: b.y + 250 };
  },

  danger(bot, px, py, view) {
    let pen = 0;
    const wall = ARENA.sd(px, py) + 45;   // how far past "45 from the wall" this spot is
    if (wall > 0) pen += 8000 + wall * 100;
    const me = bot.id;
    const alive = view.players.filter(p => p.alive);
    // Waves (Simmer etc.): the area the next hit covers is safe right after it lands. Waiting just outside it,
    // ready to step in, beats standing somewhere that gets hit later and having to cross waves to escape.
    let first = null;
    for (const m of view.mechs) if (m.type === 'aoe' && m.resolveAt > view.t && (!first || m.resolveAt < first.resolveAt)) first = m;
    const besideFirst = first && first.resolveAt - view.t < 4 && !SHAPES.contains(first.shape, px, py, 22) && SHAPES.contains(first.shape, px, py, 75);
    for (const m of view.mechs) {
      const dt = Math.max(0, m.resolveAt - view.t);
      if (dt > 11) continue;
      const urgency = 1 / (0.4 + dt);
      const s = m.shape;
      // a blast you hide from behind a prop: be in your own prop's shadow (in someone else's will do, at a pinch)
      if (m.cover && (m.type === 'raidwide' || SHAPES.contains(s, px, py, 22))) {
        const pr = this.coverFor(me, view, m), props = view.props || [];
        const ok = pr && PROPS.blocks(pr, m.src.x, m.src.y, px, py, PROPS.COVER_SHRINK + 8);
        // (a cover across the room has to be set off for early: "too late" starts a walk and a second before it lands)
        const walk = pr ? Math.hypot(pr.x - bot.x, pr.y - bot.y) / 230 + 1 : 0;
        if (!ok) pen += (PROPS.shadowing(m.src.x, m.src.y, px, py, props) ? 1500 : 6000) * urgency + (dt < Math.max(2.5, walk) ? 5000 : 0);
        continue;
      }
      // Lights Out (the Hollow King): be inside a light when it lands
      if (m.type === 'dark') {
        const L = m.lights ? m.lights() : [];
        if (!L.some(l => Math.hypot(l.x - px, l.y - py) <= m.lightR - 30)) pen += (L.length ? 6000 : 0) * urgency + (dt < 2 && L.length ? 5000 : 0);
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
        if (bait) pen += Math.hypot(bait.x - px, bait.y - py) * 30 * urgency;
        continue;
      }
      switch (m.type) {
        case 'aoe':
          // a cone aimed at me (Venom Spit): bait it out at the edge, then step aside once it locks
          if (m.aimFromBoss === me && dt > (m.lockAt || 0.6) + 0.15) {
            pen += Math.max(0, ARENA.inner - 70 - Math.hypot(px - view.boss.x, py - view.boss.y)) * 6;
            break;
          }
          // a circle that follows me (Spice Rack's jar) goes wherever I go until it locks: nothing to dodge yet
          if (m.follow === me && dt > (m.lockAt || 0) + 0.1) break;
          // Funeral March: the open lane (m.safe, a row of spots) is the place to be until the last rank has passed
          if (m.safe) { const d = Math.min(...m.safe.map(q => Math.hypot(q.x - px, q.y - py))); if (d > 100) pen += (d - 100) * 15 * urgency; }
          if (SHAPES.contains(s, px, py, 22)) {
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
            for (const o of alive) if (o.id !== me && Math.hypot(o.x - px, o.y - py) < s.r + 50) pen += 2500 * urgency;
          } else {
            const owner = alive.find(o => o.id === m.follow);
            if (owner && Math.hypot(owner.x - px, owner.y - py) < s.r + 50) pen += 3000 * urgency;
          }
          break;
        }
        case 'stack': {
          if (view.mechs.some(o => o.type === 'spread' && o.follow === me && Math.abs(o.resolveAt - m.resolveAt) < 1)) break;
          // Thunder Crash: each + player carries one; their partner stacks in, everyone else keeps out
          if (m.tag === 'crash') {
            const owner = alive.find(o => o.id === m.follow);
            if (!owner) break;
            const d = Math.hypot(owner.x - px, owner.y - py), pt = this.partner(me, view);
            if (m.follow === me) {
              for (const o of view.mechs) {
                if (o.tag !== 'crash' || o.follow === me) continue;
                const ow = alive.find(q => q.id === o.follow);
                if (ow && Math.hypot(ow.x - px, ow.y - py) < s.r * 2 + 50) pen += 3000 * urgency;
              }
            } else if (pt && pt.id === m.follow) { if (d > s.r * 0.5) pen += (d - s.r * 0.5) * 30 * urgency; }
            else if (d < s.r + 45) pen += 3000 * urgency;
            break;
          }
          const owner = alive.find(o => o.id === m.follow);
          const cx = owner ? owner.x : s.x, cy = owner ? owner.y : s.y;
          const d = Math.hypot(cx - px, cy - py);
          if (d > s.r * 0.55) pen += (d - s.r * 0.55) * 30 * urgency;
          break;
        }
        case 'tower': {
          const mine = m.tag === 'rod' ? this.rodFor(me, view) === m.id : m.tag === 'bell' ? this.bellFor(me, view) === m.id
            : this.towerFor(me, view) === m.id;
          const inside = Math.hypot(s.x - px, s.y - py) < s.r - 18;
          // head for your own tower early: it may be across the room
          if (mine && !inside) pen += (Math.hypot(s.x - px, s.y - py)) * 12 * Math.max(urgency, 0.3);
          if (!mine && inside) pen += 2500 * urgency;
          break;
        }
        case 'proximity':
          pen += (900 - Math.min(900, Math.hypot(px - s.x, py - s.y))) * 8 * urgency;
          break;
        // Polarity Surge: be with your opposite-charge partner and away from anyone of your own charge.
        // The pair member with the higher id walks to the other (bots have the higher ids, so they come to you).
        case 'polarity': {
          const pol = view.polarity;
          if (!pol) break;
          for (const o of alive) if (o.id !== me && pol.get(o.id) === pol.get(me) && Math.hypot(o.x - px, o.y - py) < s.r + 45) pen += 4000 * urgency;
          const pt = this.partner(me, view);
          if (pt && pt.id < me) { const d = Math.hypot(pt.x - px, pt.y - py); if (d > s.r * 0.45) pen += (d - s.r * 0.45) * 30 * urgency; }
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
            if (owner && Math.hypot(owner.x - px, owner.y - py) < 60) pen += 1500 * urgency;
          }
          break;
        }
      }
    }
    // Storm Walls: stay off where each wall will be over the next second
    for (const sw of view.sweeps || []) {
      // behind a boulder (Avalanche) the wall passes over you, once
      if (sw.cover && PROPS.shadowing(sw.x, sw.y, px, py, view.props || [], q => q.kind === sw.cover && PROPS.blocks(q, sw.x, sw.y, px, py, PROPS.COVER_SHRINK + 10))) continue;
      for (const look of [0, 0.5, 1]) {
        const tt = view.t + look;
        if (tt < sw.startAt - 0.8 || tt > sw.end) continue;
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
    // Doom: wherever the lanterns send this bot (lanternJob, worked out once per think in move())
    if (bot.job) pen += Math.min(600, Math.hypot(bot.job.x - px, bot.job.y - py)) * 12;
    // a Sigilmancer's own Ember Circle: it's only strong inside, so leaving costs (but never more than real danger)
    const cir = bot.actor && bot.actor.kit.g.circle;
    if (cir && cir.end > view.t + 1 && Math.hypot(cir.x - px, cir.y - py) > cir.r - 18) pen += 700;
    // a friendly healing pool (Moonwell): worth stepping into if it's close, for everyone but the tank
    if (bot.role !== 'tank') for (const pl of view.pools || []) if (Math.hypot(pl.x - px, pl.y - py) < pl.r - 25 && Math.hypot(pl.x - bot.x, pl.y - bot.y) < pl.r + 260) pen -= 450;
    // the closing edge: be well inside where the wall is about to jump to
    const en = view.edgeNext;
    if (en && en.at - view.t < 6) { const over = Math.hypot(px, py) - (en.r - 60); if (over > 0) pen += 5000 + over * 50; }
    // (Hard) a wedge of the summit about to break away: off it
    const pc = view.pendingCut;
    if (pc && pc.at - view.t < 7) {
      let d = Math.atan2(py, px) - pc.a0; d -= Math.floor(d / (Math.PI * 2)) * Math.PI * 2;
      const over = Math.hypot(px, py) - (pc.r - 60);
      if (d <= pc.a1 - pc.a0 + 0.08 && over > 0) pen += 5000 + over * 50;
    }
    for (const pd of view.puddles) if (Math.hypot(pd.x - px, pd.y - py) < pd.r + 28) pen += 4000;
    // rolling meatballs: stay off the stretch of path each one covers in the next second and a half
    for (const rl of view.rollers || []) {
      const from = Math.max(0, view.t - rl.rollAt), to = view.t + 1.5 - rl.rollAt;
      if (to <= 0 || view.t > rl.end) continue;
      const c = Math.cos(rl.angle), s = Math.sin(rl.angle);
      const ax = rl.x + c * from * rl.speed, ay = rl.y + s * from * rl.speed, bx = rl.x + c * to * rl.speed, by = rl.y + s * to * rl.speed;
      if (segDist(px, py, ax, ay, bx, by) < rl.r + 45) pen += 7000;
    }
    // being reeled in: get away from her mouth
    if ((view.reels || []).some(r => r.pid === me)) pen += Math.max(0, 420 - Math.hypot(px - view.boss.x, py - view.boss.y)) * 12;
    // tethers: stretch a long one, stay close on a short one
    for (const th of view.tethers || []) {
      if (th.a !== me && th.b !== me) continue;
      const other = alive.find(o => o.id === (th.a === me ? th.b : th.a));
      if (!other) continue;
      const d = Math.hypot(other.x - px, other.y - py);
      if (th.kind === 'long' && d < th.len + 70) pen += (th.len + 70 - d) * 25;
      if (th.kind === 'short' && d > th.len - 50) pen += (d - th.len + 50) * 25;
    }
    // sticky floor slows you down; beams between linked adds burn
    for (const z of view.zones || []) if (SHAPES.contains(z.shape, px, py, 10)) pen += z.effect === 'burn' ? (view.t > z.startAt - 2 ? 6000 : 400) : 350;
    // the room: nobody stands inside a solid prop; grease is best kept clear of, and burning grease avoided
    for (const pr of view.props || []) if (pr.solid && PROPS.sd(pr, px, py) < 16) pen += 9000;
    // floor that has fallen away, or is about to (Skitterra's collapse): stay on the silk
    if (view.room && view.room.safe && !view.room.safe(px, py, true)) pen += view.room.safe(px, py) ? 9000 : 20000;
    for (const th of (view.room && view.room.threads) || []) if (!th.cut && segDist(px, py, th.x1, th.y1, th.x2, th.y2) < 26 && Math.hypot(px - th.kx, py - th.ky) > 50) pen += 3000;
    // (grease a fire is about to reach counts as burning: a Flambé stripe, the stove line catching)
    const fires = view.mechs.filter(m => m.tag === 'flambe' && m.resolveAt - view.t < 4);
    for (const z of view.zones || []) if (z.tag === 'stovefire' && view.t > z.startAt - 3) fires.push(z);
    for (const fl of view.floor || []) {
      if (fl.kind !== 'grease' || Math.hypot(fl.x - px, fl.y - py) >= fl.r + 26) continue;
      pen += view.burning(fl) || fires.some(m => SHAPES.contains(m.shape, fl.x, fl.y, fl.r)) ? 5000 : 250;
    }
    for (const a of view.adds || []) {
      const o = a.link && a.linkDmg ? view.adds.find(x => x.id === a.link) : null;
      if (o && segDist(px, py, a.x, a.y, o.x, o.y) < 50) pen += 5000;
    }
    return pen;
  },

  move(bot, view) {
    const home = this.home(bot, view);
    bot.job = this.lanternJob(bot, view);
    const cands = [home, { x: bot.x, y: bot.y }];
    if (bot.job) cands.push({ x: bot.job.x, y: bot.job.y });
    const cir = bot.actor && bot.actor.kit.g.circle;
    if (cir && cir.end > view.t + 1) cands.push({ x: cir.x + (bot.x - cir.x) * 0.3, y: cir.y + (bot.y - cir.y) * 0.3 });
    if (bot.role !== 'tank') for (const pl of view.pools || []) cands.push({ x: pl.x + (bot.x - pl.x) * 0.3, y: pl.y + (bot.y - pl.y) * 0.3 });
    for (const c of [{ x: bot.x, y: bot.y }, home]) {
      for (const r of [60, 130, 220, 330]) for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + r * 0.01;
        cands.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
      }
    }
    // cones out of the boss (Eightfold Lunge, the swings): a ring of spots close around it, where a safe side is
    // only a short walk away when it turns
    if (view.mechs.some(m => m.shape.kind === 'cone' && m.type === 'aoe' && Math.hypot(m.shape.x - view.boss.x, m.shape.y - view.boss.y) < 60)) {
      for (const r of [125, 190]) for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; cands.push(ARENA.clamp({ x: view.boss.x + Math.cos(a) * r, y: view.boss.y + Math.sin(a) * r }, 50)); }
    }
    // tower centers and the stack target are good candidates too
    for (const m of view.mechs) {
      if (m.type === 'tower') cands.push({ x: m.shape.x, y: m.shape.y });
      if (m.type === 'stack') { const o = view.players.find(p => p.id === m.follow); if (o) cands.push({ x: o.x, y: o.y }); }
      if (m.shape.kind === 'donut') cands.push({ x: m.shape.x + (bot.x - m.shape.x) * 0.3, y: m.shape.y + (bot.y - m.shape.y) * 0.3 });
      if (m.safe) for (const q of m.safe) cands.push({ x: q.x, y: q.y });
      // cover: spots in the shadow of the prop this bot takes (and of the others, in case it's full)
      if (m.cover) {
        const mine = this.coverFor(bot.id, view, m);
        for (const pr of (view.props || []).filter(p => p.cover && (p === mine || Math.hypot(p.x - bot.x, p.y - bot.y) < 500))) {
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
    const pathCost = c => {
      let pen = 0;
      const dist = Math.hypot(c.x - bot.x, c.y - bot.y);
      for (const m of landing) {
        const q = Math.min(1, Math.max(0, m.resolveAt - view.t) * speed / Math.max(1, dist));
        if (SHAPES.contains(m.shape, bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, 22)) pen += 6000;
      }
      for (const [a, o] of beams) if (segsCross(bot.x, bot.y, c.x, c.y, a.x, a.y, o.x, o.y)) pen += 3000;
      // Skitterra's threads sting and root whoever walks through them; her collapse leaves only the silk to walk on
      for (const th of threads) if (segsCross(bot.x, bot.y, c.x, c.y, th.x1, th.y1, th.x2, th.y2)) pen += 2500;
      if (view.room && view.room.safe && view.room.fallen !== Infinity) for (const q of [0.2, 0.4, 0.6, 0.8]) if (!view.room.safe(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q)) pen += 15000;
      for (const pd of view.puddles) if (Math.hypot(pd.x - bot.x, pd.y - bot.y) > pd.r + 20 && segDist(pd.x, pd.y, bot.x, bot.y, c.x, c.y) < pd.r + 20) pen += 1200;
      if (sweeps.length) {
        const d = Math.hypot(c.x - bot.x, c.y - bot.y), arrive = d / 230;
        for (const q of [0.25, 0.5, 0.75, 1]) if (inWall(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, view.t + arrive * q)) pen += 5000;
        for (const extra of [0.4, 0.9]) if (inWall(c.x, c.y, view.t + arrive + extra)) pen += 3000;
      }
      return pen;
    };
    let best = null, bs = Infinity, bd = 0;
    const score = c => {
      const d = this.danger(bot, c.x, c.y, view), s = d + pathCost(c) + Math.hypot(c.x - home.x, c.y - home.y) * 1.2 + Math.hypot(c.x - bot.x, c.y - bot.y) * 0.6;
      if (s < bs) { bs = s; best = c; bd = d; }
    };
    for (const c of cands) score(c);
    // nowhere close is safe (a knight's replayed sweep from the far wall covers everything near): look farther out
    if (bd > 4000) for (const r of [460, 600]) for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + 0.26;
      score(ARENA.clamp({ x: bot.x + Math.cos(a) * r, y: bot.y + Math.sin(a) * r }, 50));
    }
    return best;
  },

  // Tanks: what to taunt right now, if anything: the boss when it's on someone who isn't a tank, otherwise an add in
  // reach that's chewing on someone else. An add only gets the taunt while nobody is close to pulling the boss, so the
  // taunt is still there when the boss needs it.
  tauntTarget(bot, view) {
    if (bot.role !== 'tank' || typeof TAUNT === 'undefined') return null;
    const al = view.players.filter(p => p.alive), byId = id => al.find(p => p.id === id);
    const notTank = id => { const p = byId(id); return !!p && p.role !== 'tank'; };
    const reach = (x, y, r) => Math.hypot(x - bot.x, y - bot.y) - r <= TAUNT.range;
    const b = view.boss;
    if (!b.untargetable && view.bossTarget != null && view.bossTarget !== bot.id && notTank(view.bossTarget) && reach(b.x, b.y, FIGHT.BOSS_R)) return 'boss';
    const me = byId(bot.id);
    if (!me || al.some(p => p.role !== 'tank' && p.threat > me.threat * 0.85)) return null;
    for (const a of view.adds || []) if (a.target != null && a.target !== bot.id && notTank(a.target) && !(a.fix && a.fix.until > view.t) && reach(a.x, a.y, a.r)) return a.id;
    return null;
  },

  // pick an ability index for this bot (or null)
  act(bot, k, view) {
    const ab = i => k.abilities[i];
    const readyIdx = i => { const a = ab(i); return a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);   // a spec's replacement answers to the base id
    const party = view.players.filter(p => !p.left);
    const hurt = party.filter(p => p.alive).map(p => ({ p, f: p.hp / p.maxHp })).sort((a, b) => a.f - b.f);
    const dead = party.filter(p => !p.alive);
    const moving = bot.moving;
    // the boss's next tankbuster in the upcoming-moves feed: [name, seconds until its cast starts]
    const nextBuster = (view.next || []).find(([n]) => BUSTER_CASTS.test(n));
    // ... and party-wide damage being cast, or close in the feed
    const raidSoon = (view.next || []).some(([n, s]) => s < 6 && RAID_CASTS.test(n)) || !!(view.bossCast && RAID_CASTS.test(view.bossCast.name));
    if (bot.cls.id === 'alembist') return BotAI.alembist(bot, k, view);   // brews ahead and throws (below)
    if (bot.cls.id === 'threadweaver') return BotAI.threadweaver(bot, k, view);   // keeps a web (classes-c, below)
    // healers: raise, then keep people up
    if (bot.role === 'healer') {
      if (dead.length) {
        const r = k.abilities.findIndex(a => a.allowDead && a.type === 'gcd');
        if (r >= 0 && readyIdx(r) && !moving) { bot.healTarget = dead[0].id; return r; }
        const rw = idx('rewind');
        if (rw >= 0 && readyIdx(rw)) { bot.healTarget = dead[0].id; return rw; }
      }
      let low = hurt[0];
      // a tankbuster is coming (being cast, or next in the feed): get the tank topped first
      const busterSoon = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4) || (nextBuster && nextBuster[1] < 4);
      const tankH = hurt.find(h => h.p.role === 'tank');
      if (busterSoon && tankH && tankH.f < 0.85 && (!low || low.f > 0.3)) low = { p: tankH.p, f: Math.min(tankH.f, 0.5) };
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
      const top = raidSoon ? 0.15 : 0;
      if (low && low.f < 0.8 + top) {
        bot.healTarget = low.p.id;
        const avgLow = hurt.filter(h => h.f < 0.8).length >= 3;
        for (let i = 0; i < k.abilities.length; i++) {
          const a = ab(i);
          if (a.type !== 'ogcd' || !readyIdx(i)) continue;
          if ((a.replaces || a.id) === 'growth' && a.id !== 'growth') {   // Moonwell: on whoever has the most of the party around them
            if (!avgLow) continue;
            const near = q => party.filter(o => o.alive && Math.hypot(o.x - q.x, o.y - q.y) < 150).length;
            bot.healTarget = party.filter(q => q.alive).sort((x, y) => near(y) - near(x))[0].id;
            return i;
          }
          if (a.target === 'ally' && low.f < 0.6) return i;
          if (['prayer', 'growth', 'bloom', 'accel'].includes(a.replaces || a.id) && avgLow) return i;
        }
        if (k.gcdRemaining() <= 0 && !k.cast) {
          // (Recall raises the dead but also heals the living heavily, so it counts as a heal here)
          const heals = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target === 'ally' && (!ab(i).allowDead || ab(i).id === 'recall') && readyIdx(i));
          const instant = heals.filter(i => !k.castTime(ab(i)));
          if (low.f < 0.55 + top && heals.length) return (moving && instant.length) ? instant[0] : (moving ? null : heals[0]);
          if (low.f < 0.75 + top && instant.length) return instant[0];
        }
      }
    }
    // a class with its own priority (BOT_CLASS, end of this file)
    const own = typeof BOT_CLASS !== 'undefined' && BOT_CLASS[bot.cls.id] && BOT_CLASS[bot.cls.id].act;
    if (own) return own(bot, k, view, moving);
    // a Ward that can go on an ally (Spellwarden): put it on whoever a heavy blow is about to land on
    const wardI = idx('ward');
    if (wardI >= 0 && k.abilities[wardI].target === 'ally' && readyIdx(wardI) && k.gcdRemaining() <= 0 && !k.cast) {
      const hit = view.mechs.find(m => m.type === 'buster' && m.resolveAt - view.t < 3 && (m.target ?? m.follow) != null && (m.target ?? m.follow) !== bot.id);
      if (hit) { bot.healTarget = hit.target ?? hit.follow; return wardI; }
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
        if (a.id === 'mirror' && left < 0.9) return i;
        if (a.id === 'ward' && left < 3 && k.gcdRemaining() <= 0 && !k.cast) return i;
        if (!mitigated && left < 3 && TANK_CDS.includes(a.id)) { bot.mitUntil = view.t + 4; return i; }
      }
    }
    // a Pyromancer near overheating while badly hurt (the burn costs 15% of its HP): Vent, or let the Heat cool
    const meP = party.find(p => p.id === bot.id);
    const hotAndHurt = bot.cls.id === 'pyromancer' && k.g.heat >= 80 && meP && meP.hp / meP.maxHp < 0.35;
    // oGCDs: burst and damage when ready; mitigation when the tank is getting hit or a raidwide is coming
    const castingBig = view.bossCast && /Grease|Tenderize|Boil|Gorge|Last Call|Venom Mist|Silk Wrap|Tightening Web|Devour|Thunderclap|Titan Fist|Eye of the Storm|Skybreak|Skyfall|Barrow Knell|Grave Cleave|Moonset/.test(view.bossCast.name);
    for (let i = 0; i < k.abilities.length; i++) {
      const a = ab(i);
      if (a.type !== 'ogcd' || !readyIdx(i)) continue;
      if (k.gcdRemaining() < 0.65 && !k.cast) continue;
      if (a.target === 'ally' || (hotAndHurt && a.id === 'fireblast')) continue;
      const defensive = /mitigate|party takes|less damage|immune|shield/i.test(a.desc) && !/Burst/.test(a.desc);
      // Stasis is for the enrage; a tank's Undying and Mirror Aegis wait for the busters aimed at it (the tank branch above)
      if (a.id === 'stasis' || a.id === 'undying' || a.id === 'mirror') { if (a.id === 'stasis' && castingBig && view.bossCast.left < 1.2 && /Last Call|Devour|Skybreak|Moonset/.test(view.bossCast.name)) return i; continue; }
      // Brace is worth most as a Perfect Block: only right before a hit lands, and never spent while a buster is on the way
      if (a.id === 'brace') { if (!myBuster && castingBig && view.bossCast.left < 0.6) return i; continue; }
      if (defensive && !(castingBig && view.bossCast.left < 3)) continue;
      // a tank keeps what it answers busters with when the feed shows the next buster close
      if (bot.role === 'tank' && TANK_CDS.includes(a.id) && nextBuster && nextBuster[1] < 15) continue;
      if (a.id === 'shift') {
        const groupHurt = hurt.filter(h => h.f < 0.8).length >= 2;
        // (Haste heals the whole party: go early when party-wide damage is coming and people are already hurt)
        if (k.g.stance === 'slow' && (k.g.flux >= 95 || (groupHurt && k.g.flux >= (raidSoon ? 25 : 40)))) return i;
        if (k.g.stance === 'haste' && (k.g.flux < 10 || (!groupHurt && k.g.flux < 45 && hurt[0] && hurt[0].f < 0.6))) return i;
        continue;
      }
      return i;
    }
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    if (hotAndHurt) { const v = idx('vent'); return readyIdx(v) ? v : null; }
    const gcds = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target !== 'ally' && readyIdx(i));
    const okToCast = i => !moving || !k.castTime(ab(i));
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
      if (weave && ok(inv) && Math.abs(t) >= 4) return inv;
      if (k.def.redline) { if (weave && ok(eq) && (k.g.strain || 0) >= 50 && Math.abs(t) >= 5) return eq; }
      else if (weave && ok(eq)) {
        // Equilibrium as mitigation: a big hit on the way and the dial near 0 anyway (or in real trouble)
        const big = view.bossCast && view.bossCast.left < 2.5 && /Knell|Boil|Thunderclap|Eye of the Storm|Skybreak|Moonset|Last Call|Devour/.test(view.bossCast.name);
        const me = view.players.find(p => p.id === bot.id);
        if ((big && Math.abs(t) <= 2) || (me && me.hp / me.maxHp < 0.35)) return eq;
      }
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      const plan = thermPlan(k), dir = plan === 'cinder' || plan === 'flare' ? 1 : -1;
      const brink = k.has('brink') ? k.buffs.get('brink').data.el : 0, sb = k.def.stepBonus || 0;
      // Zenith: Strain building with Bleed Off still cooling: step off the edge with the quick spell of the other element, in time
      if (k.def.redline && Math.abs(t) >= 5 && (k.g.strain || 0) >= 45 && !ok(eq)) { const q = idx(t > 0 ? 'rime' : 'cinder'); if (ok(q) && !(moving && k.castTime(k.abilities[q]))) return q; }
      for (const id of [...new Set([plan, dir > 0 ? 'cinder' : 'rime', 'rime', 'cinder', 'lance', 'flare'])]) {
        const i = idx(id), a = k.abilities[i];
        if (!ok(i) || (moving && k.castTime(a))) continue;
        const el = a.el || 0, big = id === 'flare' || id === 'lance';
        if (el && brink === el) continue;
        if (el && !(big && thermEdgeCast(k, el)) && !k.def.redline && Math.abs(t + el * ((big ? 2 : 1) + sb)) > 5) continue;
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
        // a long, thin loop through its middle, wide enough to run clean through the body, never so wide that the far
        // ends are out of sabre reach
        const s = Math.sin(th) * 115, u = Math.cos(th) * 40 - 20;
        return { x: b.x + Math.cos(f) * u - Math.sin(f) * s, y: b.y + Math.sin(f) * u + Math.cos(f) * s };
      };
      // aimed far enough ahead along the loop that the bot never catches the point and stops (it walks faster than the
      // loop turns at its ends)
      let p = at(0.8);
      for (let ahead = 1.2; ahead <= 2.4 && Math.hypot(p.x - bot.x, p.y - bot.y) < 75; ahead += 0.4) p = at(ahead);
      return p;
    },
    act(bot, k, view, moving) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const weave = k.gcdRemaining() > 0.65 && !k.cast, full = driftMax(k), flank = k.env.positional() === 'flank';
      const gale = idx('gale'), hook = idx('hook'), slip = idx('slip'), still = idx('still');
      const myHit = view.mechs.some(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 0.7);
      // no flashy moves while there's something on the floor to dodge: a dash or a swing round can land you in it
      const calm = !view.mechs.some(m => m.type !== 'raidwide' && m.resolveAt - view.t < 3) && !(view.rollers || []).length && !(view.sweeps || []).some(s => view.t < s.end) && !view.puddles.some(p => Math.hypot(p.x - view.boss.x, p.y - view.boss.y) < p.r + 240);
      if (weave && ok(still) && (myHit || k.abilities[still].id === 'tailspin')) return still;
      if (weave && ok(gale)) return gale;
      if (weave && ok(hook) && (k.abilities[hook].id === 'gyre' ? k.g.drift >= 50 : k.g.drift >= 70 && flank && calm)) return hook;
      if (weave && calm && ok(slip) && (k.charges(k.abilities[slip]) === 2 || k.g.drift < full * 0.5)) return slip;
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      const cross = idx('cross'), impact = k.abilities[cross].id === 'impact';
      if (ok(cross) && (k.g.drift >= full * 0.92 && (!impact || (flank && calm)))) return cross;
      if (ok(0)) return 0;
      return ok(cross) && k.g.drift >= full * 0.6 && (!impact || calm) ? cross : null;
    },
  },
};

// Ironpalm (no GCD, kits.js): Read a tankbuster aimed at it in the last moment, Iron Skin a little before, Tiger Wall
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
    const next = (view.next || []).find(([n]) => BUSTER_CASTS.test(n)), toBuster = Math.min(hitIn, next ? next[1] + 3 : Infinity);
    const ri = idx('read'), si = idx('skin'), bi = idx('bell');
    if (free && ok(ri) && hitIn < 0.36 && hitIn > 0.03) return ri;
    if (free && ok(si) && hitIn < 3) return si;
    // in real trouble with no buster close: Iron Skin now rather than hold it for one that may come too late
    const me = view.players.find(p => p.id === bot.id);
    if (free && ok(si) && me && me.hp / me.maxHp < 0.35 && toBuster > 20) return si;
    const raid = view.bossCast && RAID_CASTS.test(view.bossCast.name) && view.bossCast.left < 3;
    if (free && ok(bi) && (raid || k.abilities[bi].id === 'slide' || k.abilities[bi].id === 'dragon')) return bi;
    if (!free) return null;
    const live = ipLive(k) ? g.str : '';
    if (k.has('opening')) return IP_SLOT.H;
    if (P.resting) { if (g.breath < 75) return null; P.resting = false; }
    if (!P.plan || !(P.plan.startsWith(live) && P.plan.length > live.length) || (!live && P.done)) {
      P.done = false;
      if (live && !g.clean) { const on = ipMoves(k).filter(e => e.seq.startsWith(live) && e.seq.length > live.length).sort((a, b) => b.seq.length - a.seq.length); P.plan = on.length ? on[0].seq : null; }
      else {
        const swallow = k.talent('ironpalm_swallow'), cost = s => [...s].reduce((a, x) => a + IP_INPUT[x].cost * 0.6, 0);
        // (Tiger Wall lasts 5s and its string takes about a second and a half: start it no earlier than that allows)
        if (toBuster < 6.2 && toBuster > 1.8 && !k.has('wall')) P.plan = 'HKK';
        else if (k.dotRemaining('bruise') < 2.5) P.plan = 'HHK';
        else P.plan = swallow ? 'KLHKK' : 'LLHKK';
        if (g.breath < cost(P.plan) + 2) { if (g.breath >= cost('KL') && !swallow) P.plan = 'KL'; else { P.resting = true; P.plan = null; return null; } }
      }
    }
    if (!P.plan) return null;
    const x = P.plan[live.length];
    if (live.length + 1 >= P.plan.length) P.done = true;
    // don't start a press whose recovery would still be running when the Read has to go out (a third of a second
    // before the buster lands, inside the stance's catching window)
    if (ok(ri) && hitIn > 0.03 && hitIn < IP_INPUT[x].lock + 0.4) return null;
    return ok(IP_SLOT[x]) ? IP_SLOT[x] : null;
  },
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
  const busterSoon = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4);
  const raidwideSoon = view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 3.5) ||
    (view.bossCast && view.bossCast.left < 3.5 && /Grease|Venom Mist|Thunderclap|Knell|Gorge|Dead Wind|Twin Knell|Pulse/.test(view.bossCast.name));
  const room = vials.length < A.slots, gcdFree = k.gcdRemaining() <= 0 && !k.cast && k.lockUntil <= k.now;
  const near = (q, r) => alive.filter(o => Math.hypot(o.x - q.x, o.y - q.y) <= r);
  // where a heal splash does the most: the ally with the most missing health around them
  const healSpot = () => alive.map(q => ({ q, v: near(q, 105).reduce((s, o) => s + (1 - frac(o)), 0) })).sort((a, b) => b.v - a.v)[0];
  const crowdSpot = () => alive.map(q => ({ q, n: near(q, 115).length })).sort((a, b) => b.n - a.n)[0];
  const kindOf = v => (v.parts ? 'blend' : alemInfo(v.r).kind);
  const enemyNear = !!k.env.target({ target: 'enemy', range: RANGED });
  const needHeal = hurt.length >= 2 || (hurt[0] && frac(hurt[0]) < 0.62);

  // oGCDs: Catalyst whenever a brew is about to start; Distill when healing is urgent; Grand Batch / Blend in a crunch
  const di = idx('distill'), bi = idx('batch');
  if (k.gcdRemaining() > 0.15 && !k.cast) {
    if (k.abilities[di].id === 'catalyst') { if (ready(di) && !k.g.half.length && room) return di; }
    else if (ready(di) && !k.g.half.length && room && (needHeal || vials.length === 0)) return di;
    if (ready(bi)) {
      if (k.abilities[bi].id === 'blend') { if (vials.length >= 2 && needHeal && vials.some(alemIsHeal)) return bi; }
      else if (vials.length <= 1 && k.g.last && ((needHeal && alemInfo(k.g.last).kind === 'heal') || (!hurt.length && alemInfo(k.g.last).kind === 'bomb'))) return bi;
    }
  }
  if (!gcdFree) return null;
  const th = idx('throw');
  const throwAt = (i, who) => { if (A.pick) k.g.sel = i; bot.healTarget = who; return ready(th) ? th : null; };

  // a fallen ally and a Draught (or anything that raises) ready to go: throw it on them
  if (dead.length && k.now >= k.g.raiseAt) {
    const ri = vials.findIndex(v => ['DD', 'DQ', 'DDD'].includes(v.r));
    if (ri >= 0 && (A.pick || ri === 0)) return throwAt(ri, dead[0].id);
  }
  // pick the vial to throw now, if any (only the oldest unless the Apothecary can pick)
  const cands = A.pick ? vials.map((v, i) => i) : vials.length ? [0] : [];
  let best = null;
  for (const i of cands) {
    const v = vials[i], kind = kindOf(v), ripe = alemStrength(k, v) >= 1 + ALEMBIC.GROW - 0.001;
    const fuseLow = v.fuse && v.fuse - k.now < 1.4, spoiling = !v.fuse && !v.keep && alemSpoilTime(k) - (k.now - v.born) < 3;
    let score = 0, who = bot.id;
    if (kind === 'heal' || kind === 'blend') { const s = healSpot(); if (s && (needHeal || s.v > 0.5)) { score = 5 + s.v * 4; who = s.q.id; } }
    else if (kind === 'salve') { if (busterSoon && tank) { score = 7; who = tank.id; } else if (hurt.length >= 2) { const s = healSpot(); score = 4; who = s.q.id; } }
    else if (kind === 'ward') { if (raidwideSoon || (busterSoon && tank)) { const s = raidwideSoon ? crowdSpot() : { q: tank }; score = 6; who = s.q.id; } }
    else if (kind === 'quick') { score = hurt.length ? 1 : 3; const s = crowdSpot(); who = s.q.id; }
    else if (kind === 'bomb') { if (enemyNear && (ripe || !room)) score = needHeal ? 1 : 3; who = tank ? tank.id : bot.id; }
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
    if (needHeal && heals < 2) plan = need === 3 ? 'DDD' : (hurt.length >= 3 ? 'DE' : 'DD');
    else if (busterSoon && !shields) plan = need === 3 ? 'DD' + S : 'D' + S;
    else if (heals < 1) plan = need === 3 ? 'DDD' : 'DD';
    else if (need === 3 && raidwideSoon && !shields) plan = 'DES';
    else plan = need === 3 ? 'EEE' : 'EE';
    k.g.botPlan = plan.replace(/S/g, S);
  }
  const letter = k.g.botPlan[have] || 'E';
  const ri = k.abilities.findIndex(a => a.reagent === letter);
  return ready(ri) ? ri : null;
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
Object.assign(BOT_CLASS, {
  gorgemaw: {
    act(bot, k, view) {
      const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
      const ok = i => { const a = k.abilities[i]; return !!a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
      const me = view.players.find(p => p.id === bot.id), hp = me ? me.hp / me.maxHp : 1, b = k.g.belly, max = mawMax(k);
      const wide = idx('wide'), open = (k.g.jawUntil || 0) > k.now + 0.05;
      const soon = view.mechs.filter(m => m.resolveAt - view.t < 0.6 && m.resolveAt - view.t > 0.03);
      if (!open && ok(wide) && soon.some(m => botEdible(bot, m))) return wide;
      const bott = idx('bottomless');
      if (ok(bott) && soon.some(m => m.type === 'raidwide')) return bott;
      const myBuster = view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) === bot.id && m.resolveAt - view.t < 2.5);
      const iron = idx('iron');
      if (myBuster && ok(iron) && (k.abilities[iron].id === 'stonebelly' || k.charges(k.abilities[wide]) === 0 || hp < 0.55)) return iron;
      const dig = idx('digest'), giz = k.def.spec === 'gizzard';
      const partySoon = view.mechs.some(m => (m.type === 'raidwide' || m.type === 'buster') && m.resolveAt - view.t < 3) || (view.next || []).some(([n, s]) => s < 4 && (RAID_CASTS.test(n) || BUSTER_CASTS.test(n)));
      if (ok(dig) && b.length && k.gcdRemaining() > 0.4 && (hp < 0.45 || (giz ? (b.length >= 2 && partySoon) || b.length >= max : b.length >= max && hp < 0.85))) return dig;
      if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
      const sp = idx('spit'), regur = k.abilities[sp].id === 'regurgitate';
      if (ok(sp) && (regur ? b.length >= Math.min(3, max) : giz ? b.length >= max : k.def.fuse ? (b.length >= 2 && b[0].m === b[1].m) || b.length >= max - 1 : b.length >= 1)) return sp;
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
      const partySoon = view.mechs.some(m => m.type === 'raidwide' && m.resolveAt - view.t < 3) || (view.next || []).some(([n, s]) => s < 4 && RAID_CASTS.test(n));
      const df = idx('default'), fore = k.abilities[df].id === 'foreclose';
      if (ok(df) && (tot > hp * 0.8 || (fore && tot > H * 0.32))) return df;
      const writ = idx('writ');
      if (myBuster && ok(writ)) return writ;
      const rn = idx('reneg');
      if (ok(rn) && weave && oathDueSoon(k, 1.5) > H * 0.1 && (partySoon || myBuster || hp < H * 0.6)) return rn;
      const st = idx('settle'), audit = k.abilities[st].id === 'audit';
      if (ok(st) && weave && !fore && !partySoon && !myBuster && (audit ? oathAuditable(k).reduce((s, e) => s + e.a, 0) > H * 0.1 : (tot > H * 0.22 && hp > H * 0.6) || tot > H * 0.4)) return st;
      const li = idx('lien');
      if (k.abilities[li].id === 'cosign') {
        if (ok(li) && weave && !(k.g.cosign != null && k.g.cosignUntil > k.now + 2)) {
          // the one about to take a heavy blow, else the healer, else whoever is most hurt
          const others = view.players.filter(p => p.alive && !p.left && p.id !== bot.id);
          const hitId = (view.mechs.find(m => m.type === 'buster' && (m.target ?? m.follow) !== bot.id && (m.target ?? m.follow) != null) || {}).target;
          const pick = others.find(p => p.id === hitId) || others.find(p => p.role === 'healer') || others.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          bot.healTarget = pick ? pick.id : null;
          if (pick) return li;
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
    for (const look of [0, 0.6, 1.2]) {
      const tt = view.t + look;
      if (tt < sw.startAt - 0.5 || tt > sw.end) continue;
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
// Tapestry for a tankbuster or a raidwide, Tighten to pull a tied ally out of what's about to land on them; Mend Seam
// (instant on Spool) on whoever is low, aimed at a tied ally so it runs down the web; Needle the rest of the time.
BotAI.threadweaver = function (bot, k, view) {
  const idx = id => k.abilities.findIndex(a => a.id === id || a.replaces === id);
  const ready = i => { const a = k.abilities[i]; return i >= 0 && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
  const alive = view.players.filter(p => p.alive && !p.left), frac = p => p.hp / p.maxHp;
  const me = alive.find(p => p.id === bot.id);
  if (!me) return null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
  const tie = idx('tie'), snip = idx('snip'), tight = idx('tighten'), tap = idx('tapestry'), mend = idx('mend'), needle = idx('needle');
  const shears = (k.def.store || 1) > 1, cradle = k.abilities[tight].id === 'cradle';
  // a heavy blow about to land on someone who isn't the tank (or on a tank already low): that's what Tapestry is for
  const sentence = view.mechs.find(m => m.type === 'buster' && m.resolveAt - view.t < 2.2 && (() => { const t = alive.find(p => p.id === (m.target ?? m.follow)); return t && (t.role !== 'tank' || frac(t) < 0.7); })());
  if (free && ready(tap) && (sentence || busterSoon || (raidSoon && hurt.filter(p => frac(p) < 0.85).length >= 2))) return tap;
  if (weave) {
    if (cradle && ready(tight) && raidSoon) return tight;
    // cut the web ourselves before a spread tears it (or when a thread is about to snap anyway, or someone tied is low)
    if (ready(snip) && mine.length) {
      const strained = mine.some(th => lenOf(th) > 225);
      const lowTied = low && frac(low) < (shears ? 0.8 : 0.55) && linked(low.id);
      if (tearing || strained || lowTied) { bot.healTarget = lowTied ? low.id : bot.id; return snip; }
    }
    // pull a tied ally out of what's about to land on them
    if (!cradle && ready(tight)) {
      for (const p of alive) {
        if (p.id === bot.id || !linked(p.id)) continue;
        const inIt = view.mechs.some(m => m.type === 'aoe' && m.resolveAt - view.t < 1.4 && m.follow !== p.id && SHAPES.contains(m.shape, p.x, p.y, 10)) || view.puddles.some(pd => Math.hypot(pd.x - p.x, pd.y - p.y) < pd.r);
        if (inIt) { bot.healTarget = p.id; return tight; }
      }
    }
  }
  if (free) {
    // a heavy blow aimed at someone: tie them to us, or (too far from us) to whoever stands nearest them, two Ties in a row
    if (bot.tiePair && view.t - bot.tiePair.at < 3 && ready(tie)) { bot.healTarget = bot.tiePair.b; bot.tiePair = null; return tie; }
    if (ready(tie)) {
      for (const m of view.mechs) {
        if (m.type !== 'buster' || m.resolveAt - view.t > 4.5) continue;
        const t = alive.find(p => p.id === (m.target ?? m.follow));
        if (!t || (tank && t.id === tank.id) || linked(t.id) || [...this.partnersOf(view, t.id)].length) continue;
        if (t.id === bot.id) { if (tank && dist(me, tank) < 245) { bot.healTarget = tank.id; k.g.tie = null; return tie; } continue; }
        if (dist(me, t) < 200) { bot.healTarget = t.id; k.g.tie = null; return tie; }
        const near = alive.filter(p => p.id !== t.id && p.id !== bot.id && dist(p, t) < 200).sort((a, b) => dist(a, t) - dist(b, t))[0];
        if (near && k.charges(k.abilities[tie]) >= 2) { bot.tiePair = { b: t.id, at: view.t }; bot.healTarget = near.id; k.g.tie = null; return tie; }
      }
    }
    // keep the tank tied to us, then whoever stands closest (never while a spread is coming, nor with a Tie owed to a blow)
  }
  if (weave) {
    const owed = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4.5 && (m.target ?? m.follow) !== bot.id && !linked(m.target ?? m.follow) && !(tank && (m.target ?? m.follow) === tank.id));
    if (!tearing && !owed && weave && ready(tie)) {
      if (tank && !linked(tank.id) && dist(me, tank) < 240) { bot.healTarget = tank.id; k.g.tie = null; return tie; }
      const loose = alive.filter(p => p.id !== bot.id && !linked(p.id) && dist(me, p) < 215).sort((a, b) => frac(a) - frac(b))[0];
      if (loose && mine.length < weaveMax(k) && (k.charges(k.abilities[tie]) === 2 || frac(loose) < 0.7)) { bot.healTarget = loose.id; k.g.tie = null; return tie; }
    }
  }
  if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
  const moving = bot.moving;
  // heal: whoever is low (the tank first before a buster), aimed through the web
  let want = low && frac(low) < (raidSoon ? 0.85 : 0.72) ? low : null;
  if (busterSoon && tank && frac(tank) < 0.92) want = tank;
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

// (her threads reach 260 px: she stands off the boss's flank, close enough to the tank to keep them tied)
BOT_CLASS.threadweaver = {
  home(bot, view) {
    const b = view.boss, f = b.facing || 0, side = (bot.slot || 0) % 2 ? 1 : -1, a = f + side * 1.6;
    // a heavy blow coming at someone she can't reach: go and stand just behind them, outside its cone, to tie them
    const me = view.players.find(p => p.id === bot.id);
    for (const m of view.mechs) {
      if (m.type !== 'buster' || m.resolveAt - view.t > 4.5 || (m.target ?? m.follow) === bot.id) continue;
      const t = view.players.find(p => p.id === (m.target ?? m.follow) && p.alive);
      if (!t || t.role === 'tank' || !me) continue;
      const o = m.shape, ta = Math.atan2(t.y - o.y, t.x - o.x), back = Math.max((o.r || 320) + 70, Math.hypot(t.x - o.x, t.y - o.y) + 80);
      return ARENA.clamp({ x: o.x + Math.cos(ta) * back, y: o.y + Math.sin(ta) * back }, 60);
    }
    return { x: b.x + Math.cos(a) * 165, y: b.y + Math.sin(a) * 165 };
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
    const pull = idx('pull'), cross = idx('cross'), pir = idx('pirouette'), fin = idx('finale'), jab = idx('jab');
    const e = mariEnemy(k), me = { x: bot.x, y: bot.y };
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
          const safe = cands.filter(c => Math.hypot(c.x - me.x, c.y - me.y) <= lim && ARENA.sd(c.x, c.y) < -30 && !BotAI.dollDanger(view, c.x, c.y, 4.5))
            .sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y));
          // (W moves the Doll nearest the aim: aim from beside this one)
          if (safe.length) { bot.aim = safe[0]; if (k.g.dolls.length > 1 && mariPick(k, safe[0]) !== i) bot.aim = { x: (safe[0].x + d.x * 3) / 4, y: (safe[0].y + d.y * 3) / 4 }; return pull; }
        }
        const land = view.mechs.some(m => m.resolveAt - view.t < 1);
        if (land && ok(pir) && k.gcdRemaining() <= 0 && !k.cast && k.abilities[pir].id === 'pirouette') return pir;
      }
    }
    if (weave && ok(cross) && k.abilities[cross].type === 'ogcd' && mariLineOn(k)) return cross;
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    const dollsSafe = k.g.dolls.every(d => !BotAI.dollDanger(view, d.x, d.y, 3.2));
    if (ok(fin) && k.g.encore >= 5 && dollsSafe) return fin;
    if (ok(cross) && k.abilities[cross].type === 'gcd' && mariLineOn(k)) return cross;
    if (ok(pir)) return pir;
    if (ok(jab)) return jab;
    return null;
  },
};

if (typeof module !== 'undefined') module.exports = { BotAI };
