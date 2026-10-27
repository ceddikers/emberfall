// Threads and Dolls on screen (classes-c). Everything here is drawing and bookkeeping; the host owns the rules
// (fight.js, the weave block). Every client draws:
//   - the Threadweavers' threads ('thr' from the host): glowing lines between allies that bow loose when slack and
//     pull straight, brighten and shiver as they near their snapping length (550 px); a snap ('thrs') flicks apart.
//     Tapestry ties everyone: a woven ring of gold-lilac threads round the party while it lasts.
//   - every Marionettist's Doll(s): your own straight from your kit (smooth, no lag), everyone else's from the host's
//     'dolls' list (10 a second, eased). Strings run from the control bar to each Doll, one line per String left,
//     drawn taut and reddening as the Doll nears the strings' reach. An Understudy's Stage is chalked on the floor
//     between the three of them, and lit while the boss stands in it.
const Stagecraft = (() => {
  const SNAP = 550;   // (fight.js WEAVE_HOST.SNAP)
  const S = {
    threads: [], tapestry: null, dolls: new Map(), stage: 0, mine: null, sentAt: -9, acts: new Map(),
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const posOf = (env, id) => { const e = env.entById(id); return e ? { x: e.x, y: e.y - (e.lift || 0) } : null; };

  // ---------------------------------------------------------------- bookkeeping
  function reset() { S.threads = []; S.tapestry = null; S.dolls.clear(); S.stage = 0; S.mine = null; S.acts.clear(); }
  function endFight() { S.threads = []; S.tapestry = null; S.dolls.clear(); S.stage = 0; }
  function onThreads(msg, now) {
    S.threads = Array.isArray(msg.l) ? msg.l.filter(t => Array.isArray(t) && t.length >= 3) : [];
    S.tapestry = Array.isArray(msg.tp) ? { from: msg.tp[0], end: now + Math.min(16, Number(msg.tp[1]) || 0) } : null;
  }
  function onSnaps(msg, now, entById) {
    for (const s of msg.l || []) {
      const a = entById(s[0]), b = entById(s[1]);
      if (!a || !b || typeof KIT_VFX === 'undefined' || !KIT_VFX.threadSnap) continue;
      KIT_VFX.threadSnap(a, b, s[2] | 0);
    }
  }
  // the host's list: [[owner, [[x, y, state, strings], ...]], ...]; your own Dolls come from your kit instead
  function onDolls(msg, now, me) {
    const seen = new Set();
    for (const [pid, l] of msg.l || []) {
      if (pid === me || !Array.isArray(l)) continue;
      seen.add(pid);
      const cur = S.dolls.get(pid) || { l: [] };
      cur.l = l.map((d, i) => {
        const o = cur.l[i] || { dx: d[0], dy: d[1], a: 0 };
        return Object.assign(o, { x: d[0], y: d[1], st: d[2] | 0, s: d[3] == null ? 3 : d[3] | 0 });
      });
      cur.at = now;
      S.dolls.set(pid, cur);
    }
    for (const pid of [...S.dolls.keys()]) if (!seen.has(pid)) S.dolls.delete(pid);
    S.stage = msg.s || 0;
  }
  // your kit reports its Dolls every tick (kits.js mariShare)
  function setMine(list, cls, kit) {
    S.mine = { l: list, cls, s: kit && kit.g ? kit.g.strings : 3, stretch: kit && kit.def ? kit.def.stretch || 300 : 300, spec: kit && kit.def ? kit.def.spec : null };
  }
  function dueMine(now) {
    if (!S.mine || !S.mine.l.length || now - S.sentAt < 0.1) return false;
    S.sentAt = now; return true;
  }
  // this weaver's threads as the kit asks for them: { me, l: [[a, b, length]] } (always an object in a raid)
  function threadsOf(me, entById) {
    const l = [];
    for (const [a, b, from] of S.threads) {
      if (from !== me) continue;
      const A = entById(a), B = entById(b);
      l.push([a, b, A && B ? Math.hypot(A.x - B.x, A.y - B.y) : 0]);
    }
    return { me, l };
  }
  // a Doll move for drawing (ability-vfx.js calls it when anyone's Doll acts): kind 'jab' | 'spin' | 'cut' | 'finale' | 'pull' | 'swap' | 'hit'
  function act(ownerId, kind, now, i) { S.acts.set(ownerId + ':' + (i == null ? '*' : i), { kind, t0: now }); }
  function actOf(ownerId, i, now) {
    const a1 = S.acts.get(ownerId + ':' + i), a2 = S.acts.get(ownerId + ':*'), a = !a1 ? a2 : !a2 ? a1 : a1.t0 >= a2.t0 ? a1 : a2;   // (the newer act wins)
    return a && now - a.t0 < 2.6 ? a : null;
  }
  // where someone's Dolls are right now (for effects): [{ x, y }]
  function dollsOf(ownerId, me) {
    if (ownerId === me) return S.mine ? S.mine.l.map(d => ({ x: d.x, y: d.y })) : [];
    const D = S.dolls.get(ownerId);
    return D ? D.l.map(d => ({ x: d.dx, y: d.dy })) : [];
  }
  function update(now, dt) {
    const k = Math.min(1, dt * 11);
    for (const D of S.dolls.values()) for (const d of D.l) {
      const far = Math.hypot(d.x - d.dx, d.y - d.dy) > 160;   // a fling or a swap: jump, don't glide across the room
      d.dx = far ? d.x : lerp(d.dx, d.x, k); d.dy = far ? d.y : lerp(d.dy, d.y, k);
    }
  }

  // every Doll to draw: [{ owner, i, x, y, st, s (strings), small, mine }]
  function allDolls(env) {
    const out = [];
    if (S.mine && S.mine.cls === 'marionettist') S.mine.l.forEach((d, i) => out.push({ owner: env.me, i, x: d.x, y: d.y, st: d.st, s: S.mine.s, small: S.mine.l.length > 1, mine: true }));
    if (!env.town) for (const [pid, D] of S.dolls) D.l.forEach((d, i) => out.push({ owner: pid, i, x: d.dx, y: d.dy, st: d.st, s: d.s, small: D.l.length > 1, mine: false }));
    return out;
  }

  // ---------------------------------------------------------------- drawing
  // the floor: an Understudy's Stage (chalk lines between you and both Dolls; footlights while the boss is on it)
  function drawFloor(ctx, now, env) {
    S.env = env;   // ability-vfx.js looks entities up through this
    const groups = new Map();
    for (const d of allDolls(env)) { if (!groups.has(d.owner)) groups.set(d.owner, []); groups.get(d.owner).push(d); }
    for (const [pid, ds] of groups) {
      if (ds.length < 2) continue;
      const o = posOf(env, pid);
      if (!o) continue;
      const lit = !env.town && S.stage === pid, limp = ds.some(d => d.st === 2);
      const pts = [o, ds[0], ds[1]];
      ctx.save();
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
      const g = ctx.createLinearGradient(o.x, o.y, (ds[0].x + ds[1].x) / 2, (ds[0].y + ds[1].y) / 2);
      g.addColorStop(0, rgba('#e8a0ff', lit ? 0.04 : 0.015)); g.addColorStop(1, rgba('#ffd27a', lit ? 0.2 + Math.sin(now * 5) * 0.04 : 0.04));
      ctx.fillStyle = limp ? 'rgba(0,0,0,0)' : g; ctx.fill();
      ctx.setLineDash(lit ? [] : [7, 9]); ctx.lineDashOffset = -now * 12;
      ctx.strokeStyle = rgba(lit ? '#ffe2a0' : '#e8c8ff', limp ? 0.12 : lit ? 0.75 : 0.28); ctx.lineWidth = lit ? 2.2 : 1.4; ctx.stroke();
      ctx.setLineDash([]);
      if (lit) {   // footlights along the far edge, between the two Dolls
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < 6; i++) { const q = i / 6, x = lerp(ds[0].x, ds[1].x, q), y = lerp(ds[0].y, ds[1].y, q); glow(ctx, x, y, 14, '#ffcf6a', 0.35 + Math.sin(now * 7 + i) * 0.1); }
      }
      ctx.restore();
    }
  }
  // the Dolls themselves, sorted in with everyone else by y
  function entities(now, env) {
    const hs = (typeof FX !== 'undefined' && FX.heroScale) || 1.5;
    const boss = env.boss;
    return allDolls(env).map(d => ({
      kind: 'stagecraft', y: d.y,
      draw: ctx => {
        const o = posOf(env, d.owner);
        const face = boss && !env.town ? Math.atan2(boss.y - d.y, boss.x - d.x) : o ? Math.atan2(d.y - o.y, d.x - o.x) : 0;
        drawDoll(ctx, d.x, d.y, face, { t: now, st: d.st, act: actOf(d.owner, d.i, now), small: d.small, seed: d.owner * 1.7 + d.i, scale: hs * (d.small ? 0.84 : 1) });
      },
    }));
  }
  // above everyone: the strings from each control bar to its Dolls, and every thread
  function drawOver(ctx, now, env) {
    const hs = (typeof FX !== 'undefined' && FX.heroScale) || 1.5;
    for (const d of allDolls(env)) {
      const o = env.entById(d.owner);
      if (!o) continue;
      const ang = o.angle || 0, bx = o.x + Math.cos(ang) * 13 * hs, by = o.y - (o.lift || 0) + Math.sin(ang) * 13 * hs;
      const dist = Math.hypot(d.x - bx, d.y - by), reach = d.mine && S.mine ? S.mine.stretch : 300, strain = Math.min(1, dist / reach);
      const n = d.st === 2 ? 0 : Math.max(0, Math.min(3, d.s == null ? 3 : d.s));
      const col = strain > 0.82 ? '#ff8a9a' : '#f6e6f0';
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 4.5 * hs, nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
        const torn = k >= n;
        const sag = torn ? 0 : (1 - strain) * 22 + Math.sin(now * 2 + k) * 1.5;
        const mx = (bx + d.x) / 2 + nx * 0.6, my = (by + d.y) / 2 + ny * 0.6 + sag;
        ctx.beginPath(); ctx.moveTo(bx + nx, by + ny);
        if (torn) {   // a torn String: a short frayed end hanging off the bar
          ctx.quadraticCurveTo(bx + nx + (d.x - bx) * 0.08, by + ny + 10, bx + nx + (d.x - bx) * 0.12, by + ny + 16);
          ctx.strokeStyle = rgba('#d8c8d0', 0.35); ctx.lineWidth = 1;
        } else {
          ctx.quadraticCurveTo(mx, my, d.x + nx * 0.5, d.y + ny * 0.5 - 6 * hs);
          ctx.strokeStyle = rgba(col, 0.42 + strain * 0.35); ctx.lineWidth = 1 + strain * 0.6;
        }
        ctx.stroke();
      }
      if (strain > 0.9 && n) glow(ctx, (bx + d.x) / 2, (by + d.y) / 2, 10, '#ff6a8a', (strain - 0.9) * 4 * (0.6 + Math.sin(now * 30) * 0.4));
      ctx.restore();
    }
    // threads: bow when slack, pull straight and brighten near the snap, shiver right at the edge
    const drawThread = (A, B, col, w, seed) => {
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, k = Math.min(1, L / SNAP);
      const nx = -dy / L, ny = dx / L, bow = (1 - k) * Math.min(40, L * 0.22), shiv = k > 0.82 ? Math.sin(now * 48 + seed) * (k - 0.82) * 18 : 0;
      const mx = (A.x + B.x) / 2 + nx * (bow + shiv), my = (A.y + B.y) / 2 + ny * (bow + shiv) + bow * 0.4;
      const hot = k > 0.8 ? (k - 0.8) / 0.2 : 0;
      ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y);
      ctx.strokeStyle = rgba(hot > 0.5 ? '#ff9ad8' : col, 0.22 + hot * 0.2); ctx.lineWidth = w * 3.2 + hot * 3; ctx.stroke();
      ctx.strokeStyle = rgba(hot > 0.5 ? '#fff0fa' : shade(col, -0.35), 0.75 + hot * 0.25); ctx.lineWidth = w; ctx.stroke();
      // a bead of light running along it, the way a needle runs a seam
      const q = (now * 0.6 + seed * 0.37) % 1, px = (1 - q) * (1 - q) * A.x + 2 * (1 - q) * q * mx + q * q * B.x, py = (1 - q) * (1 - q) * A.y + 2 * (1 - q) * q * my + q * q * B.y;
      glow(ctx, px, py, 6 + hot * 4, hot > 0.5 ? '#ffd8f0' : col, 0.55);
      ctx.restore();
    };
    S.threads.forEach(([a, b, from], i) => {
      const A = posOf(env, a), B = posOf(env, b);
      if (A && B) drawThread(A, B, '#c8b0ff', 1.6, a * 3 + b + i);
    });
    // Tapestry: everyone in the party woven into one ring for a few seconds
    if (S.tapestry && S.tapestry.end > now && !env.town) {
      const left = S.tapestry.end - now, fade = Math.min(1, left / 0.6);
      const units = [];
      const ids = env.units ? env.units.map(u => u.id) : [];
      for (const id of ids) { const p = posOf(env, id); if (p) units.push(p); }
      if (units.length > 1) {
        const cx = units.reduce((s, p) => s + p.x, 0) / units.length, cy = units.reduce((s, p) => s + p.y, 0) / units.length;
        units.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
        ctx.save(); ctx.globalAlpha = fade;
        for (let i = 0; i < units.length; i++) drawThread(units[i], units[(i + 1) % units.length], '#ffd89a', 1.4, 90 + i);
        for (let i = 0; i < units.length; i++) for (let j = i + 2; j < units.length; j++) if (!(i === 0 && j === units.length - 1)) drawThread(units[i], units[j], '#e8c8ff', 0.9, 40 + i * 5 + j);
        ctx.restore();
      }
    }
  }

  return { S, reset, endFight, onThreads, onSnaps, onDolls, setMine, dueMine, threadsOf, act, dollsOf, update, drawFloor, entities, drawOver };
})();

if (typeof module !== 'undefined') module.exports = { Stagecraft };
