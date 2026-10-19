// Bots that fill empty party slots (host only). They move by scoring candidate spots against every live
// telegraph, and fight with the real class kits using a simple "competent player" priority.

// do segments p1-p2 and q1-q2 cross?
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

const BotAI = {
  isMelee(cls) { return KITS[cls.id].abilities[0].range === 'melee'; },

  // where this bot would like to stand when nothing is happening
  // Which enemy to hit: tanks and healers stay on the boss. DPS split over a pair of adds (one each),
  // easing off when theirs gets well ahead of its sibling so the pair dies together. null = the boss.
  pickEnemy(bot, view) {
    const adds = view.adds || [];
    if (!adds.length || bot.role !== 'dps') return null;
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
    const myIdx = alive.map(p => p.id).sort((a, b) => a - b).indexOf(me);
    const towers = view.mechs.filter(m => m.type === 'tower').sort((a, b) => Math.atan2(a.shape.y, a.shape.x) - Math.atan2(b.shape.y, b.shape.x));
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
      switch (m.type) {
        case 'aoe':
          // a cone aimed at me (Venom Spit): bait it out at the edge, then step aside once it locks
          if (m.aimFromBoss === me && dt > (m.lockAt || 0.6) + 0.15) {
            pen += Math.max(0, ARENA.inner - 70 - Math.hypot(px - view.boss.x, py - view.boss.y)) * 6;
            break;
          }
          if (SHAPES.contains(s, px, py, 22)) {
            const waitIn = besideFirst && m !== first && m.resolveAt - first.resolveAt > 1;
            pen += 6000 * urgency * (waitIn ? 0.15 : 1);
          }
          break;
        case 'buster':
          if ((m.target ?? m.follow) !== me && SHAPES.contains(s, px, py, 30)) pen += 6000 * urgency;
          break;
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
          const ti = towers.indexOf(m);
          const mine = m.tag === 'rod' ? this.rodFor(me, view) === m.id : m.tag === 'bell' ? this.bellFor(me, view) === m.id
            : ti === myIdx % Math.max(1, towers.length) && !(view.debuffs(me).stuffed);
          const inside = Math.hypot(s.x - px, s.y - py) < s.r - 18;
          if (mine && !inside) pen += (Math.hypot(s.x - px, s.y - py)) * 12 * urgency;
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
          const over = ARENA.sd(px + Math.cos(a) * dist, py + Math.sin(a) * dist) + 20;
          if (over > 0) pen += (3000 + over * 10) * urgency;
          break;
        }
      }
    }
    // Storm Walls: stay off where each wall will be over the next second
    for (const sw of view.sweeps || []) {
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
    // the closing edge: be well inside where the wall is about to jump to
    const en = view.edgeNext;
    if (en && en.at - view.t < 6) { const over = Math.hypot(px, py) - (en.r - 60); if (over > 0) pen += 5000 + over * 50; }
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
    for (const z of view.zones || []) if (SHAPES.contains(z.shape, px, py, 10)) pen += 350;
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
    for (const c of [{ x: bot.x, y: bot.y }, home]) {
      for (const r of [60, 130, 220, 330]) for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + r * 0.01;
        cands.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
      }
    }
    // tower centers and the stack target are good candidates too
    for (const m of view.mechs) {
      if (m.type === 'tower') cands.push({ x: m.shape.x, y: m.shape.y });
      if (m.type === 'stack') { const o = view.players.find(p => p.id === m.follow); if (o) cands.push({ x: o.x, y: o.y }); }
      if (m.shape.kind === 'donut') cands.push({ x: m.shape.x + (bot.x - m.shape.x) * 0.3, y: m.shape.y + (bot.y - m.shape.y) * 0.3 });
      // Volkar: beside your polarity partner, and in the still air behind each rod (also the half of a rod's circle
      // away from him, for catching a rod and sheltering behind it at once)
      if (m.type === 'polarity' || m.tag === 'crash') { const pt = this.partner(bot.id, view); if (pt) cands.push({ x: pt.x + (bot.x > pt.x ? 30 : -30), y: pt.y }); }
      if (m.type === 'gale') {
        for (const c of this.covers(view)) {
          const a = Math.atan2(c.y - view.boss.y, c.x - view.boss.x);
          for (const d of [30, 70]) cands.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d });
        }
      }
    }
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
    const pathCost = c => {
      let pen = 0;
      for (const [a, o] of beams) if (segsCross(bot.x, bot.y, c.x, c.y, a.x, a.y, o.x, o.y)) pen += 3000;
      for (const pd of view.puddles) if (Math.hypot(pd.x - bot.x, pd.y - bot.y) > pd.r + 20 && segDist(pd.x, pd.y, bot.x, bot.y, c.x, c.y) < pd.r + 20) pen += 1200;
      if (sweeps.length) {
        const d = Math.hypot(c.x - bot.x, c.y - bot.y), arrive = d / 230;
        for (const q of [0.25, 0.5, 0.75, 1]) if (inWall(bot.x + (c.x - bot.x) * q, bot.y + (c.y - bot.y) * q, view.t + arrive * q)) pen += 5000;
        for (const extra of [0.4, 0.9]) if (inWall(c.x, c.y, view.t + arrive + extra)) pen += 3000;
      }
      return pen;
    };
    let best = null, bs = Infinity;
    for (const c of cands) {
      const s = this.danger(bot, c.x, c.y, view) + pathCost(c) + Math.hypot(c.x - home.x, c.y - home.y) * 1.2 + Math.hypot(c.x - bot.x, c.y - bot.y) * 0.6;
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  },

  // pick an ability index for this bot (or null)
  act(bot, k, view) {
    const ab = i => k.abilities[i];
    const readyIdx = i => { const a = ab(i); return a && k.usable(a) && k.readyIn(a) <= 0.0001 && k.available(a); };
    const idx = id => k.abilities.findIndex(a => a.id === id);
    const party = view.players.filter(p => !p.left);
    const hurt = party.filter(p => p.alive).map(p => ({ p, f: p.hp / p.maxHp })).sort((a, b) => a.f - b.f);
    const dead = party.filter(p => !p.alive);
    const moving = bot.moving;
    // healers: raise, then keep people up
    if (bot.role === 'healer') {
      if (dead.length) {
        const r = k.abilities.findIndex(a => a.allowDead && a.type === 'gcd');
        if (r >= 0 && readyIdx(r) && !moving) { bot.healTarget = dead[0].id; return r; }
        const rw = idx('rewind');
        if (rw >= 0 && readyIdx(rw)) { bot.healTarget = dead[0].id; return rw; }
      }
      let low = hurt[0];
      // a tankbuster is coming: get the tank topped first
      const busterSoon = view.mechs.some(m => m.type === 'buster' && m.resolveAt - view.t < 4);
      const tankH = hurt.find(h => h.p.role === 'tank');
      if (busterSoon && tankH && tankH.f < 0.85 && (!low || low.f > 0.4)) low = { p: tankH.p, f: Math.min(tankH.f, 0.5) };
      // Grovekeeper plants Rejuvenate ahead of damage: always on the tank, and on anyone a bit hurt
      if (bot.cls.id === 'grovekeeper' && k.gcdRemaining() <= 0 && !k.cast) {
        const ri = idx('rejuv'), has = id => k.g.rejuvs.some(r => r.t === id);
        const tank = hurt.find(h => h.p.role === 'tank');
        const want = (tank && !has(tank.p.id)) ? tank : hurt.find(h => h.f < 0.85 && !has(h.p.id));
        if (want && readyIdx(ri)) { bot.healTarget = want.p.id; return ri; }
      }
      if (bot.cls.id === 'grovekeeper' && readyIdx(idx('bloom')) && hurt.some(h => h.f < 0.8 && k.g.rejuvs.some(r => r.t === h.p.id))) return idx('bloom');
      if (low && low.f < 0.8) {
        bot.healTarget = low.p.id;
        const avgLow = hurt.filter(h => h.f < 0.8).length >= 3;
        for (let i = 0; i < k.abilities.length; i++) {
          const a = ab(i);
          if (a.type !== 'ogcd' || !readyIdx(i)) continue;
          if (a.target === 'ally' && low.f < 0.6) return i;
          if (['prayer', 'growth', 'bloom', 'accel'].includes(a.id) && avgLow) return i;
        }
        if (k.gcdRemaining() <= 0 && !k.cast) {
          // (Recall raises the dead but also heals the living heavily, so it counts as a heal here)
          const heals = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target === 'ally' && (!ab(i).allowDead || ab(i).id === 'recall') && readyIdx(i));
          const instant = heals.filter(i => !k.castTime(ab(i)));
          if (low.f < 0.55 && heals.length) return (moving && instant.length) ? instant[0] : (moving ? null : heals[0]);
          if (low.f < 0.75 && instant.length) return instant[0];
        }
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
        if (a.id === 'mirror' && left < 0.9) return i;
        if (a.id === 'ward' && left < 3 && k.gcdRemaining() <= 0 && !k.cast) return i;
        if (!mitigated && left < 3 && ['bulwark', 'zeal', 'undying', 'banner', 'sanctum', 'warcry'].includes(a.id)) { bot.mitUntil = view.t + 4; return i; }
      }
    }
    // oGCDs: burst and damage when ready; mitigation when the tank is getting hit or a raidwide is coming
    const castingBig = view.bossCast && /Grease|Tenderize|Boil|Gorge|Last Call|Venom Mist|Silk Wrap|Tightening Web|Devour|Thunderclap|Titan Fist|Eye of the Storm|Skybreak|Barrow Knell|Grave Cleave|Moonset/.test(view.bossCast.name);
    for (let i = 0; i < k.abilities.length; i++) {
      const a = ab(i);
      if (a.type !== 'ogcd' || !readyIdx(i)) continue;
      if (k.gcdRemaining() < 0.65 && !k.cast) continue;
      if (a.target === 'ally') continue;
      const defensive = /mitigate|party takes|less damage|immune|shield/i.test(a.desc) && !/Burst/.test(a.desc);
      if (a.id === 'stasis' || a.id === 'undying' || a.id === 'mirror') { if (castingBig && view.bossCast.left < 1.2 && (a.id === 'stasis' ? /Last Call|Devour|Skybreak|Moonset/.test(view.bossCast.name) : bot.role === 'tank')) return i; continue; }
      if (defensive && !(castingBig && view.bossCast.left < 3)) continue;
      if (a.id === 'shift') {
        const groupHurt = hurt.filter(h => h.f < 0.8).length >= 2;
        if (k.g.stance === 'slow' && (k.g.flux >= 95 || (groupHurt && k.g.flux >= 40))) return i;
        if (k.g.stance === 'haste' && (k.g.flux < 10 || (!groupHurt && k.g.flux < 45 && hurt[0] && hurt[0].f < 0.6))) return i;
        continue;
      }
      return i;
    }
    if (k.gcdRemaining() > 0 || k.cast || k.lockUntil > k.now) return null;
    const gcds = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target !== 'ally' && readyIdx(i));
    const okToCast = i => !moving || !k.castTime(ab(i));
    const glowing = gcds.filter(i => k.glows(ab(i)) && okToCast(i));
    if (glowing.length) return glowing[0];
    if (gcds.includes(0) && okToCast(0)) return 0;
    const inst = gcds.filter(i => okToCast(i));
    return inst.length ? inst[0] : null;
  },
};

if (typeof module !== 'undefined') module.exports = { BotAI };
