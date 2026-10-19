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
          const owner = alive.find(o => o.id === m.follow);
          const cx = owner ? owner.x : s.x, cy = owner ? owner.y : s.y;
          const d = Math.hypot(cx - px, cy - py);
          if (d > s.r * 0.55) pen += (d - s.r * 0.55) * 30 * urgency;
          break;
        }
        case 'tower': {
          const ti = towers.indexOf(m);
          const mine = ti === myIdx % Math.max(1, towers.length) && !(view.debuffs(me).stuffed);
          const inside = Math.hypot(s.x - px, s.y - py) < s.r - 18;
          if (mine && !inside) pen += (Math.hypot(s.x - px, s.y - py)) * 12 * urgency;
          if (!mine && inside) pen += 2500 * urgency;
          break;
        }
        case 'proximity':
          pen += (900 - Math.min(900, Math.hypot(px - s.x, py - s.y))) * 8 * urgency;
          break;
      }
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
    for (const z of view.zones || []) if (SHAPES.contains(z.shape, px, py, 10)) pen += 350;
    for (const a of view.adds || []) {
      const o = a.link && a.linkDmg ? view.adds.find(x => x.id === a.link) : null;
      if (o && segDist(px, py, a.x, a.y, o.x, o.y) < 50) pen += 5000;
    }
    return pen;
  },

  move(bot, view) {
    const home = this.home(bot, view);
    const cands = [home, { x: bot.x, y: bot.y }];
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
    const pathCost = c => {
      let pen = 0;
      for (const [a, o] of beams) if (segsCross(bot.x, bot.y, c.x, c.y, a.x, a.y, o.x, o.y)) pen += 3000;
      for (const pd of view.puddles) if (Math.hypot(pd.x - bot.x, pd.y - bot.y) > pd.r + 20 && segDist(pd.x, pd.y, bot.x, bot.y, c.x, c.y) < pd.r + 20) pen += 1200;
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
          const heals = k.abilities.map((a, i) => i).filter(i => ab(i).type === 'gcd' && ab(i).target === 'ally' && !ab(i).allowDead && readyIdx(i));
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
        if (!mitigated && left < 3 && ['bulwark', 'undying', 'banner', 'sanctum', 'warcry'].includes(a.id)) { bot.mitUntil = view.t + 4; return i; }
      }
    }
    // oGCDs: burst and damage when ready; mitigation when the tank is getting hit or a raidwide is coming
    const castingBig = view.bossCast && /Grease|Tenderize|Boil|Gorge|Last Call|Venom Mist|Silk Wrap|Tightening Web|Devour/.test(view.bossCast.name);
    for (let i = 0; i < k.abilities.length; i++) {
      const a = ab(i);
      if (a.type !== 'ogcd' || !readyIdx(i)) continue;
      if (k.gcdRemaining() < 0.65 && !k.cast) continue;
      if (a.target === 'ally') continue;
      const defensive = /mitigate|party takes|less damage|immune|shield/i.test(a.desc) && !/Burst/.test(a.desc);
      if (a.id === 'stasis' || a.id === 'undying' || a.id === 'mirror') { if (castingBig && view.bossCast.left < 1.2 && (a.id === 'stasis' ? /Last Call|Devour/.test(view.bossCast.name) : bot.role === 'tank')) return i; continue; }
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
