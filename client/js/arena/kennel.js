// The Houndmaster's hounds on screen (kits.js houndmaster kit, host rules in fight.js). Drawing and bookkeeping only; the host keeps the
// rules (it damages hounds with boss telegraphs, and holds each player's hounds the way it holds the Marionettist's Dolls). Every client draws:
//   - every Houndmaster's hounds: your own straight from your kit (smooth, no lag), everyone else's from the host's 'hounds' list
//     (about 10 a second, eased). Rust and Ash are lean grey-brown lurchers in a few curves, with a long thin tail and soft ears that move
//     (a rust collar, an ash-grey collar); Greyfang, the Lone Wolf's one hound, is bigger and greyer with a studded rust collar and old scars;
//     Wild Hunt's four are ghosts, pale and glowing, trailing wisps. A hound that is Holding crouches with its ears up and a faint ring
//     under it, one that is Guarding stands by its master, one that bites snaps its jaws, one that pounces is stretched in the air with a
//     shadow left on the ground, and a downed hound lies on its side, grey and still.
//   - for your own hounds, a faint arc on the floor round the boss for each one's position (left flank, right flank, front, behind) in its
//     collar colour; the two arcs light in the pair's colour (Rend gold, Hamstring green, Bring Down lilac) and a thin line joins them. Faint,
//     and under every telegraph; never red or blue.
// The wire (main.js): the host's { t: 'hounds', l: [[owner, [[x, y, mode, slot, houndId], ...]], ...] }; your own go up as
// { t: 'hound', l: [[x, y, mode, slot, houndId], ...] } at most ten a second.
const Kennel = (() => {
  const TAU2 = Math.PI * 2;
  const S = { mine: null, mineSeen: -9, sentAt: -9, others: new Map(), acts: new Map(), rec: new Map(), now: 0, env: null };
  const COAT = { rust: ['#8f7a63', '#6c5845'], ash: ['#948f86', '#6f6a62'], greyfang: ['#8b8e93', '#5f6368'], sp: ['#cfe4f2', '#9cbdd6'] };
  const COLLAR = { rust: '#c46a3a', ash: '#b8b2a8', greyfang: '#c46a3a', sp: '#eaf7ff' };
  const PAIR = { rend: '#f0c050', hamstring: '#9ad46a', bringdown: '#c8a8ff' };
  const MODES = new Set(['run', 'hold', 'guard', 'pounce', 'bite', 'down']);
  const SLOTS = new Set(['left', 'right', 'front', 'behind']);
  const ok = Number.isFinite;
  const lerp = (a, b, k) => a + (b - a) * k;
  const angLerp = (a, b, k) => { let d = (b - a) % TAU2; if (d > Math.PI) d -= TAU2; else if (d < -Math.PI) d += TAU2; return a + d * k; };
  const isSp = id => typeof id === 'string' && id.startsWith('sp');
  const HS = () => (typeof FX !== 'undefined' && FX.heroScale) || 1.5;
  const BR = () => (typeof FIGHT !== 'undefined' && FIGHT.BOSS_R) || 70;

  // ---------------------------------------------------------------- bookkeeping
  function reset() { S.mine = null; S.mineSeen = -9; S.others.clear(); S.acts.clear(); S.rec.clear(); }
  function endFight() { S.others.clear(); S.acts.clear(); S.rec.clear(); }
  // the host's list: [[owner, [[x, y, mode, slot, houndId], ...]], ...]; your own hounds come from your kit instead
  function onHounds(msg, now, me) {
    const seen = new Set();
    for (const row of (msg && msg.l) || []) {
      if (!Array.isArray(row) || row[0] === me || !Array.isArray(row[1])) continue;
      const pid = row[0];
      seen.add(pid);
      const cur = S.others.get(pid) || { m: new Map() }, ids = new Set();
      for (const a of row[1].slice(0, 8)) {
        if (!Array.isArray(a) || !ok(a[0]) || !ok(a[1]) || typeof a[4] !== 'string') continue;
        const id = a[4]; ids.add(id);
        const o = cur.m.get(id) || { id, dx: a[0], dy: a[1] };
        o.x = a[0]; o.y = a[1]; o.mode = MODES.has(a[2]) ? a[2] : 'run'; o.slot = SLOTS.has(a[3]) ? a[3] : null;
        cur.m.set(id, o);
      }
      for (const id of [...cur.m.keys()]) if (!ids.has(id)) cur.m.delete(id);
      cur.at = now;
      S.others.set(pid, cur);
    }
    for (const pid of [...S.others.keys()]) if (!seen.has(pid)) S.others.delete(pid);
  }
  // your kit reports its hounds every tick (env.hounds: the kit's list of { id, x, y, face, slot, mode, bond, hp, maxHp, downUntil, spectral })
  function setMine(list, cls, kit) { S.mine = { l: Array.isArray(list) ? list : [], cls, kit: kit || null }; S.mineSeen = S.now; }
  function mineOn() { return !!S.mine && S.mine.cls === 'houndmaster' && S.now - S.mineSeen < 1; }
  // due to be sent to the host (at most ten a second)
  function dueMine(now) {
    if (!mineOn() || !S.mine.l.length || now - S.sentAt < 0.1) return false;
    S.sentAt = now; return true;
  }
  // your hounds as the wire carries them: [[x, y, mode, slot, houndId], ...]
  function wireMine() {
    return S.mine.l.filter(h => h && ok(h.x) && ok(h.y) && typeof h.id === 'string').slice(0, 8)
      .map(h => [Math.round(h.x), Math.round(h.y), isDown(h) ? 'down' : (MODES.has(h.mode) ? h.mode : 'run'), SLOTS.has(h.slot) ? h.slot : null, h.id]);
  }
  function isDown(h) { return h.mode === 'down' || (ok(h.downUntil) && h.downUntil > 0 && S.mine && S.mine.kit && h.downUntil > S.mine.kit.now); }
  // a hound's move for drawing (ability-vfx.js calls it): kind 'bite' | 'leap' | 'bark' | 'howl'. houndId null = every one of theirs
  function act(ownerId, houndId, kind, now) { S.acts.set(ownerId + ':' + (houndId == null ? '*' : houndId), { kind, t0: now }); }
  function actOf(ownerId, id, now) {
    const a1 = S.acts.get(ownerId + ':' + id), a2 = S.acts.get(ownerId + ':*'), a = !a1 ? a2 : !a2 ? a1 : a1.t0 >= a2.t0 ? a1 : a2;
    return a && now - a.t0 < 1.4 ? a : null;
  }
  // where someone's hounds are right now (for effects): [{ id, x, y, mode, slot, down, spectral }]
  function houndsOf(ownerId, me) {
    if (ownerId === me) return mineOn() ? S.mine.l.filter(h => h && ok(h.x) && ok(h.y)).map(h => ({ id: h.id, x: h.x, y: h.y, mode: h.mode, slot: h.slot || null, down: isDown(h), spectral: !!h.spectral || isSp(h.id) })) : [];
    const D = S.others.get(ownerId);
    return D ? [...D.m.values()].map(o => ({ id: o.id, x: o.dx, y: o.dy, mode: o.mode, slot: o.slot, down: o.mode === 'down', spectral: isSp(o.id) })) : [];
  }
  function update(now, dt) {
    S.now = now;
    const k = Math.min(1, dt * 11);
    for (const D of S.others.values()) for (const o of D.m.values()) {
      const far = Math.hypot(o.x - o.dx, o.y - o.dy) > 220;   // a pounce, a recall or a respawn: jump, don't glide across the room
      o.dx = far ? o.x : lerp(o.dx, o.x, k); o.dy = far ? o.y : lerp(o.dy, o.y, k);
    }
  }

  // every hound to draw: { owner, id, x, y, face (or null), mode, slot, down, spectral, mine }
  function allHounds(env) {
    const out = [];
    if (mineOn()) for (const h of S.mine.l) if (h && ok(h.x) && ok(h.y) && typeof h.id === 'string') out.push({ owner: env.me, id: h.id, x: h.x, y: h.y, face: ok(h.face) ? h.face : null, mode: isDown(h) ? 'down' : (h.mode || 'run'), slot: h.slot || null, down: isDown(h), spectral: !!h.spectral || isSp(h.id), shield: !!h.shield, mine: true });
    if (!env.town) for (const [pid, D] of S.others) for (const o of D.m.values()) out.push({ owner: pid, id: o.id, x: o.dx, y: o.dy, face: null, mode: o.mode, slot: o.slot, down: o.mode === 'down', spectral: isSp(o.id), mine: false });
    return out;
  }

  // ---------------------------------------------------------------- the floor: where your hounds stand round the boss
  function drawFloor(ctx, now, env) {
    S.env = env;   // ability-vfx.js looks entities up through this
    if (env.town || !env.boss || !mineOn()) return;
    const B = env.boss, kit = S.mine.kit, R = BR() + 9;
    const hs = S.mine.l.filter(h => h && ok(h.x) && ok(h.y) && h.slot && !isDown(h) && !h.spectral && !isSp(h.id));
    if (!hs.length) return;
    const all = !!(kit && kit.g && kit.g.all), pair = kit && kit.g ? kit.g.pair : null, pc = all ? '#fff4d0' : pair && PAIR[pair], lit = hs.length >= 2 && !!pc;
    const pulse = 0.65 + 0.35 * Math.sin(now * 5);
    const pts = [];
    ctx.save(); ctx.lineCap = 'round';
    for (const h of hs) {
      const a = ok(h.ring) ? h.ring : Math.atan2(h.y - B.y, h.x - B.x), col = lit ? pc : (COLLAR[h.id] || '#b8b2a8'), half = 0.34;
      pts.push([B.x + Math.cos(a) * R, B.y + Math.sin(a) * R, col]);
      // a dark underline, then the collar's colour (or the pair's), and two short ticks at its ends
      ctx.beginPath(); ctx.arc(B.x, B.y, R, a - half, a + half);
      ctx.globalAlpha = 0.16; ctx.strokeStyle = '#14100c'; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = lit ? 0.3 + 0.12 * pulse : 0.2; ctx.strokeStyle = col; ctx.lineWidth = lit ? 4 : 3; ctx.stroke();
      ctx.globalAlpha = lit ? 0.4 : 0.26; ctx.lineWidth = 1.4;
      for (const e of [-half, half]) { ctx.beginPath(); ctx.moveTo(B.x + Math.cos(a + e) * (R - 6), B.y + Math.sin(a + e) * (R - 6)); ctx.lineTo(B.x + Math.cos(a + e) * (R + 6), B.y + Math.sin(a + e) * (R + 6)); ctx.stroke(); }
      // a pip on the arc for the hound's own collar, so two lit arcs still say which is which
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(B.x + Math.cos(a) * R, B.y + Math.sin(a) * R, 3, 0, TAU2); ctx.fillStyle = COLLAR[h.id] || '#b8b2a8'; ctx.fill();
    }
    if (lit && pts.length >= 2) {   // the word: a thin line from one arc to the other
      ctx.globalAlpha = 0.16 + 0.1 * pulse; ctx.strokeStyle = pc; ctx.lineWidth = 1.6; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -now * 14;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the hounds
  // sorted in with everyone else by y; each draws itself
  function entities(now, env) {
    const hs = HS(), boss = env.boss;
    return allHounds(env).map(h => ({
      kind: 'stagecraft', y: h.y,
      draw: ctx => {
        const key = h.owner + ':' + h.id, dtt = Math.max(0, Math.min(0.1, now - ((S.rec.get(key) || {}).t || now)));
        const r = S.rec.get(key) || { x: h.x, y: h.y, face: h.face != null ? h.face : 0, sp: 0, ph: Math.random() * 6, t: now };
        if (dtt > 0) {
          const v = Math.hypot(h.x - r.x, h.y - r.y) / dtt;
          r.sp = lerp(r.sp, Math.min(600, v), Math.min(1, dtt * 10));
          r.ph += dtt * (4 + r.sp * 0.075);
          if (v > 30 && h.mode !== 'bite' && h.mode !== 'hold') r.mv = Math.atan2(h.y - r.y, h.x - r.x);
        }
        r.x = h.x; r.y = h.y; r.t = now;
        // facing: the kit's own, else at the boss while it works or holds, else the way it is running
        const own = env.entById ? env.entById(h.owner) : null;
        let want = r.face;
        if (h.face != null) want = h.face;
        else if (boss && !env.town && (h.mode === 'bite' || h.mode === 'pounce' || h.mode === 'hold')) want = Math.atan2(boss.y - h.y, boss.x - h.x);
        else if (r.sp > 40 && r.mv != null) want = r.mv;
        else if (h.mode === 'guard' && own) want = own.angle || r.face;
        else if (boss && !env.town) want = Math.atan2(boss.y - h.y, boss.x - h.x);
        r.face = angLerp(r.face, want, Math.min(1, dtt * 12));
        S.rec.set(key, r);
        const a = actOf(h.owner, h.id, now), ap = a ? (now - a.t0) : 9;
        drawHound(ctx, h.x, h.y, {
          id: h.id, t: now, seed: (h.owner * 1.3 + (h.id.charCodeAt(0) || 0) * 0.37) || 0, scale: hs * 0.85, face: r.face, mode: h.mode, down: h.down, spectral: h.spectral, shield: h.shield, speed: h.down ? 0 : r.sp, ph: r.ph,
          bite: a && a.kind === 'bite' ? Math.max(0, 1 - ap / 0.32) : h.mode === 'bite' ? 0.6 + 0.4 * Math.sin(now * 14) : 0,
          leap: a && a.kind === 'leap' ? Math.sin(Math.min(1, ap / 0.55) * Math.PI) : h.mode === 'pounce' ? 0.6 : 0,
          bark: a && (a.kind === 'bark' || a.kind === 'howl') ? Math.max(0, 1 - ap / (a.kind === 'howl' ? 1.2 : 0.35)) : 0, howl: a && a.kind === 'howl' ? Math.max(0, 1 - ap / 1.2) : 0,
        });
      },
    }));
  }

  // one hound, in its own place: (x, y) on the ground, o.face the way it looks. Local space faces +x; the left side is -y.
  function drawHound(ctx, x, y, o) {
    const id = o.id, grey = id === 'greyfang', sp = !!o.spectral, down = !!o.down, t = o.t, sd = o.seed || 0;
    const co = sp ? COAT.sp : COAT[id] || COAT.rust, c1 = co[0], c2 = co[1], collar = sp ? COLLAR.sp : COLLAR[id] || COLLAR.rust;
    const run = Math.min(1, (o.speed || 0) / 170), hold = o.mode === 'hold', guard = o.mode === 'guard';
    const air = !down ? Math.max(o.leap || 0, 0) : 0, lift = air * 22, stretch = 1 + air * 0.16;
    const sc = o.scale * (grey ? 1.32 : sp ? 0.95 : 1), bite = o.bite || 0, bark = o.bark || 0, howl = o.howl || 0;
    const breathe = 1 + Math.sin(t * 2.3 + sd) * 0.02;
    ctx.save();
    ctx.translate(x, y);
    // the ground under it: a shadow that stays put and shrinks as it leaps; a faint ring while it holds or guards
    ctx.save(); ctx.globalAlpha = (sp ? 0.14 : 0.3) * (1 - air * 0.4); ellipse(ctx, 0, 4 * sc, 15 * sc * (down ? 1.05 : 1), 6 * sc * (1 - air * 0.2), 0, '#0c0a08'); ctx.restore();
    if ((hold || guard) && !down) {
      ctx.save(); ctx.globalAlpha = sp ? 0.25 : 0.32; ctx.strokeStyle = collar; ctx.lineWidth = 1.4; if (guard) ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.ellipse(0, 3 * sc, 19 * sc, 8 * sc, 0, 0, TAU2); ctx.stroke(); ctx.restore();
    }
    if (sp) {
      glow(ctx, 0, -lift, 24 * sc, '#9fd8ff', 0.3);
      // wisps drawn trailing behind it
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#d8efff';
      for (let i = 1; i <= 4; i++) { const w = i * 6 * sc * (0.4 + run), q = Math.sin(t * 3 + i + sd); ctx.beginPath(); ctx.arc(-Math.cos(o.face) * w, -Math.sin(o.face) * w - lift - i * 1.5 + q, (4.2 - i * 0.7) * sc, 0, TAU2); ctx.fill(); }
      ctx.restore();
    }
    if (o.shield && !down) {   // Call Off's small shield: a pale ring of light round it
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.15 * Math.sin(t * 6); ctx.strokeStyle = '#f2e6c8'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, -lift * 0.5, 21 * sc, 14 * sc, 0, 0, TAU2); ctx.stroke(); ctx.globalAlpha *= 0.4; ctx.fillStyle = '#f2e6c8'; ctx.fill(); ctx.restore();
    }
    ctx.translate(0, -lift);
    ctx.rotate(o.face || 0);
    ctx.scale(sc * stretch, sc);
    if (sp) ctx.globalAlpha = 0.66 + 0.1 * Math.sin(t * 4 + sd);
    else if (down) ctx.globalAlpha = 0.9;
    if (down) { ctx.rotate(0.35); ctx.scale(1, 0.82); }
    const OUTL = sp ? 'rgba(60,90,120,0.9)' : OUT;
    // --- legs: four slender ones, striding with its speed; stretched fore and aft in the air; splayed when down
    const sw = (o.ph || 0);
    const legs = [[7.5, -4.4, 0], [7.5, 4.4, Math.PI], [-8.5, -4.2, Math.PI * 0.55], [-8.5, 4.2, Math.PI * 1.55]];
    for (const [lx, ly, off] of legs) {
      let px, py;
      if (down) { px = lx + (lx > 0 ? 6 : -4); py = ly + Math.sign(ly) * 6; }
      else if (air > 0.05) { px = lx + (lx > 0 ? 8 : -9) * air; py = ly * (1 + air * 0.3); }
      else { const sg = Math.sin(sw + off) * (hold ? 0 : 5.5) * run; px = lx + sg; py = ly + Math.sign(ly) * (hold ? 1.2 : 0); }
      limb(ctx, [lx, ly * 0.8, (lx + px) / 2, (ly + py) / 2, px, py], c2, 2.1);
      ellipse(ctx, px + 0.8, py, 2.3, 1.5, 0, shade(c2, -0.12), OUTL, 0.9);
    }
    // --- tail: long, thin and curved; wagging when it runs, low and still when it holds, limp when it is down
    const wag = down ? 0 : hold ? 0.12 * Math.sin(t * 2 + sd) : Math.sin(t * (6 + run * 6) + sd) * (0.45 + run * 0.5);
    const tx = down ? -23 : -25 - air * 3, ty = down ? 5 : wag * 8 + (hold ? 1 : 0);
    limb(ctx, [-13, 0, -19, down ? 1 : wag * 3, tx, ty], c2, 1.9);
    // --- the body: three shapes (haunch, waist, deep chest) outlined together and then filled, so there is one outline round the lot
    const parts = [[-8, 0, 6.3, 5.1, c1], [-1, 0, 6.4, 3.9, c1], [5.6, 0, 7, 5.6 * breathe, shade(c1, 0.07)]];
    for (const [px, py, rx, ry] of parts) ellipse(ctx, px, py, rx, ry, 0, null, OUTL, 3.2);
    for (const [px, py, rx, ry, fc] of parts) ellipse(ctx, px, py, rx, ry, 0, fc);
    ellipse(ctx, -2.5, 0, 9.5, 2, 0, c2);   // the darker line down the back
    if (!sp) { ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = c2; ctx.lineWidth = 0.8; ctx.lineCap = 'round'; for (const rx of [3, 5.5, 8]) { ctx.beginPath(); ctx.moveTo(rx, -4.3); ctx.quadraticCurveTo(rx - 0.8, -2.6, rx, -1.4); ctx.moveTo(rx, 4.3); ctx.quadraticCurveTo(rx - 0.8, 2.6, rx, 1.4); ctx.stroke(); } ctx.restore(); }
    // coat markings, as in the painted portraits: Rust and Greyfang are brindled (dark tiger stripes across the back), Ash is a
    // merle (dark patches scattered over the grey); fixed shapes, so the coat doesn't shimmer as the hound moves
    if (!sp) {
      ctx.save(); ctx.globalAlpha = down ? 0.35 : 0.45;
      if (id === 'ash') {
        for (const [mx, my, mr] of [[-9, -2.4, 1.6], [-5.5, 2.6, 1.3], [-1.5, -2.2, 1.1], [2.5, 3, 1.5], [6.5, -3.2, 1.2], [-11.5, 1.8, 1]]) ellipse(ctx, mx, my, mr * 1.3, mr, 0.4, '#4e4a45');
      } else {
        ctx.strokeStyle = shade(c2, -0.25); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
        for (const bx of [-12, -9.5, -6.5, -3.5, -0.5, 2.5, 6]) { ctx.beginPath(); ctx.moveTo(bx, -4.4); ctx.quadraticCurveTo(bx + 1.2, -2.2, bx + 0.4, -0.8); ctx.moveTo(bx + 0.6, 4.4); ctx.quadraticCurveTo(bx + 1.6, 2.2, bx + 0.8, 0.8); ctx.stroke(); }
      }
      ctx.restore();
    }
    if (grey) {   // Greyfang's old scars across the shoulder and flank, a pale chest
      ctx.save(); ctx.strokeStyle = '#d6d8da'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(1, -3.6); ctx.lineTo(3.4, -1.6); ctx.moveTo(-0.6, -2.4); ctx.lineTo(1.8, -0.5); ctx.moveTo(-7, 3.2); ctx.lineTo(-5, 1.2); ctx.stroke(); ctx.restore();
      ellipse(ctx, 9.5, 0, 2.8, 3.6, 0, '#b4b8bc');
    }
    // --- the collar, round the neck: a band in its own colour with a tag
    const cx = 10.6;
    line(ctx, cx, -4.1, cx, 4.1, OUTL, grey ? 4.4 : 3.8); line(ctx, cx, -4, cx, 4, collar, grey ? 3 : 2.3);
    if (grey) { circle(ctx, cx, -3.2, 0.9, '#b9b3a6'); circle(ctx, cx, 3.2, 0.9, '#b9b3a6'); circle(ctx, cx, 0, 1.1, '#b9b3a6'); }
    else circle(ctx, cx + 1.3, 3.4, 1.15, sp ? '#ffffff' : '#d8b25a', OUTL, 0.6);
    // --- the neck and head; a bite thrusts the head out and opens the jaws, a bark opens them a little, a howl throws the head up
    const reach = bite * 4.5 + howl * -1.5;
    ellipse(ctx, 11.5, 0, 4.6, 3.5, 0, c1, OUTL, 1.4);
    const hx = 15.6 + reach, gape = Math.max(bite * 0.55, bark * 0.3, howl * 0.4);
    // jaws: two narrow halves hinged behind the muzzle; the dark of the mouth shows between them
    if (gape > 0.04) poly(ctx, [hx + 3, 0, hx + 11, -gape * 7, hx + 11, gape * 7], '#2a1214');
    for (const s of [-1, 1]) {
      const ang = s * gape * 0.5;
      ctx.save(); ctx.translate(hx + 2, 0); ctx.rotate(ang);
      poly(ctx, [0, s * 0.2, 7.2, s * 0.5, 9.6, s * 0.12, 7.2, s * 1.6, 0, s * 2.1], shade(c1, 0.1), OUTL, 1);
      ctx.restore();
    }
    ellipse(ctx, hx, 0, 4.6, 3.7, 0, c1, OUTL, 1.5);   // the skull over the jaws' hinge
    ellipse(ctx, hx + 8.8, 0, 1.4, 1.2, 0, '#1a1416');   // the nose
    // the ears: soft, folded back and flapping with its speed; pricked up (shorter, forward) when it holds or guards; flat when down
    const flap = Math.sin(t * 9 + sd) * 0.18 * run + Math.sin(t * 1.7 + sd * 2) * 0.05;
    for (const s of [-1, 1]) {
      const rot = down ? s * 1.5 : (hold || guard) ? s * 0.55 : s * (0.95 + flap * s) - air * s * 0.2;
      const ex = hx - 1.8, ey = s * 3.4;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot);
      poly(ctx, [1.2, 0, -2.4, s * 1.7, -5.4, s * 0.9, -2.6, -s * 0.5], c2, OUTL, 1.1);
      if (grey && s < 0) line(ctx, -3.6, s * 1.1, -4.6, s * 0.5, '#d6d8da', 0.8);   // (an old nick in Greyfang's left ear)
      ctx.restore();
    }
    // eyes
    if (down) { ctx.save(); ctx.strokeStyle = '#1a1416'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 1.6, s * 1.9 - 0.7); ctx.lineTo(hx + 3, s * 1.9 + 0.7); ctx.stroke(); } ctx.restore(); }
    else for (const s of [-1, 1]) { if (sp) glow(ctx, hx + 2.4, s * 1.9, 3.2, '#bfe9ff', 0.8); circle(ctx, hx + 2.4, s * 1.9, 0.8, sp ? '#f4fbff' : '#15100c'); }
    ctx.restore();
    // a bark or a howl: curved lines going out from its mouth, in the air above it
    if (bark > 0.05 && !down) {
      ctx.save(); ctx.translate(x, y - lift - 4 * sc); ctx.rotate(o.face || 0); ctx.strokeStyle = sp ? '#eaf7ff' : '#f2e6c8'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const r = (22 + i * 6 + (1 - bark) * 14) * sc; ctx.globalAlpha = bark * (0.7 - i * 0.18); ctx.beginPath(); ctx.arc(0, 0, r, -0.42, 0.42); ctx.stroke(); }
      ctx.restore();
    }
  }

  return { S, reset, endFight, onHounds, setMine, mineOn, dueMine, wireMine, act, houndsOf, update, drawFloor, entities, drawHound, PAIR, COLLAR };
})();

if (typeof module !== 'undefined') module.exports = { Kennel };
