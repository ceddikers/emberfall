// The Founding, in today's town: what the first win leaves behind. Quiet by design: nothing announces it, it is simply there the next
// time you walk past, and it is the town's own way of remembering. Drawn in code in the town's style (iron, stone, a warm light).
// It only exists on an account that has won The Founding once (FoundingBook.progress().wins). Not told to anyone beforehand.
//
//   TownMark.init({ open(), busy() })  main.js; open() opens the founders' book
//   TownMark.update(dt, now, inTown)   each frame: it rises once, when the town is quiet, and plays a short arrival
//   TownMark.drawGround(ctx, now)      under the walkers
//   TownMark.entities(now)             depth-sorted with them (kind 'stagecraft')
//   TownMark.interactables()           what the cursor can find
//   TownMark.isOpen()                  whether it has arrived
// All files LF.

const TownMark = (() => {
  const SEEN = 'foundersmark';   // town state: seen[SEEN] once its arrival has played (the same book the Barrow Gate and the bosses use)
  const ARRIVE = 3.2, QUIET = 5;
  const RING = 108;              // from the fountain's centre
  const OUT = '#1d1913';
  const SPOTS = [{ a: -2.356, who: 'steward' }, { a: -0.785, who: 'smith' }, { a: 0.785, who: 'digger' }, { a: 2.356, who: 'warden' }];
  let deps = null, bornAt = -999, quietSince = null, T = 0, earnedAt = -9, earnedV = false, colliders = null;

  const centre = () => TOWN.fountain;
  const spots = () => { const F = centre(); return SPOTS.map(s => ({ who: s.who, x: Math.round(F.x + Math.cos(s.a) * RING), y: Math.round(F.y + Math.sin(s.a) * RING * 0.92) })); };
  let cached = null;
  const where = () => cached || (cached = spots());
  // earned on this account; looked up once a second, not every frame
  function earned(now) {
    if (now - earnedAt > 1 || now < earnedAt) {
      earnedAt = now;
      try { earnedV = typeof FoundingBook !== 'undefined' && FoundingBook.progress().wins > 0; } catch (e) { earnedV = false; }
    }
    return earnedV;
  }
  const rise = now => { const q = Math.max(0, Math.min(1, (now - bornAt) / ARRIVE)); return 1 - Math.pow(1 - q, 3); };
  const exists = () => earnedV && bornAt !== Infinity;

  function townBook() {
    let s = Save.get('town');
    if (!s || typeof s !== 'object') { s = {}; Save.set('town', s); }
    s.seen = s.seen || {};
    return s;
  }
  // small solid feet so nobody walks through a lamp post
  function sync(on) {
    if (on && !colliders) {
      colliders = { circles: where().map(p => ({ x: p.x, y: p.y - 2, r: 7 })) };
      COLLIDERS.circles.push(...colliders.circles);
    } else if (!on && colliders) {
      for (const c of colliders.circles) { const i = COLLIDERS.circles.indexOf(c); if (i >= 0) COLLIDERS.circles.splice(i, 1); }
      colliders = null;
    }
  }

  function update(dt, now, inTown) {
    T = now;
    const on = earned(now);
    sync(on);
    if (!on) return;
    const book = townBook();
    if (book.seen[SEEN]) { if (bornAt === Infinity) bornAt = -999; return; }
    // not yet seen: hidden until a quiet moment in town (never while a panel, a talk or a boss's own arrival is up)
    bornAt = Infinity;
    if (!inTown || !deps || deps.busy()) { quietSince = null; return; }
    if (quietSince == null) quietSince = now;
    if (now - quietSince < QUIET) return;
    book.seen[SEEN] = 1; Save.commit();
    bornAt = now;
  }

  const interactables = () => (exists() && rise(T) > 0.9 ? where().map(p => ({ x: p.x, y: p.y - 14, r: 20, reach: 78, label: 'A founder\'s lamp', open: () => deps && deps.open() })) : []);

  // ---------------------------------------------------------------- drawing
  // what lies at each lamp's foot, on a flat stone: the Steward's iron ring, the Smith's hammer-head, the Digger's spade, the Warden's tally
  function token(ctx, who) {
    ctx.lineCap = 'round';
    if (who === 'steward') { circle(ctx, 0, 0, 4.2, null, '#c9b98a', 1.8); circle(ctx, 0, 0, 4.2, null, 'rgba(0,0,0,.35)', 0.6); }
    else if (who === 'smith') { line(ctx, -6, 1, 5, 1, '#6b4a2a', 1.8); rrect(ctx, 3, -3, 6, 6, 1, '#7d838c', OUT, 1); }
    else if (who === 'digger') { line(ctx, -6, 0, 2, 0, '#6b4a2a', 1.8); poly(ctx, [1, -3.4, 8, -2.4, 8, 2.4, 1, 3.4], '#8a8f96', OUT, 1); }
    else { line(ctx, -7, 0, 7, 0, '#8a6a3c', 2.4); for (let i = -2; i <= 2; i++) line(ctx, i * 2.8, -2.6, i * 2.8, 2.6, '#3a2a14', 1); }
  }
  function bluebells(ctx, x, y, seed) {
    for (let i = 0; i < 6; i++) {
      const a = seed * 2.1 + i * 1.07, dx = Math.cos(a) * (6 + (i % 3) * 3), dy = Math.sin(a) * 3 + 2;
      line(ctx, x + dx, y + dy, x + dx, y + dy - 5, '#4f7a3e', 1.1);
      circle(ctx, x + dx, y + dy - 5.6, 1.5, '#7b86d8');
      circle(ctx, x + dx + 0.9, y + dy - 4.4, 1.2, '#98a3ea');
    }
  }
  function drawGround(ctx, now) {
    if (!exists()) return;
    T = now;
    const e = rise(now);
    for (const [i, p] of where().entries()) {
      ctx.save(); ctx.globalAlpha *= e;
      glow(ctx, p.x, p.y + 4, 62, '#ffb860', (0.17 + Math.sin(now * 2 + i * 1.7) * 0.015) * e);   // a warm pool of light on the stones
      rrect(ctx, p.x - 15, p.y + 6, 30, 14, 3, '#77705f', OUT, 1.8);
      rrect(ctx, p.x - 13, p.y + 7.5, 26, 5, 2, 'rgba(255,255,255,0.10)');
      ctx.save(); ctx.translate(p.x - 3, p.y + 13); token(ctx, p.who); ctx.restore();
      bluebells(ctx, p.x + 14, p.y + 12, i);
      ctx.restore();
    }
  }
  function lamp(ctx, p, e, t, i) {
    const h = 36 * e, fl = 0.9 + Math.sin(t * 5.3 + i * 2.1) * 0.05 + Math.sin(t * 11.7 + i) * 0.03;
    ctx.save();
    ellipse(ctx, p.x + 3, p.y + 3, 8, 3.4, 0, 'rgba(0,0,0,0.28)');
    ellipse(ctx, p.x, p.y, 6.5, 3.6, 0, '#4a463e', OUT, 1.6);           // the foot
    ctx.fillStyle = '#2a2620'; ctx.fillRect(p.x - 1.8, p.y - h, 3.6, h);   // the post
    ctx.fillStyle = '#3a352d'; ctx.fillRect(p.x - 1.8, p.y - h, 1.3, h);
    if (e > 0.55) {
      const q = Math.min(1, (e - 0.55) / 0.45), ly = p.y - h - 4;
      line(ctx, p.x, p.y - h, p.x, ly + 6, '#2a2620', 1.6);
      poly(ctx, [p.x - 6, ly - 6, p.x + 6, ly - 6, p.x + 3, ly - 11, p.x - 3, ly - 11], '#2a2620', OUT, 1.2);   // the cap
      rrect(ctx, p.x - 5, ly - 6, 10, 13, 2, rgba('#ffcf7a', (0.85 + (fl - 0.9)) * q), OUT, 1.5);               // the light itself
      line(ctx, p.x, ly - 6, p.x, ly + 7, 'rgba(40,28,12,0.6)', 1);
      rrect(ctx, p.x - 6, ly + 6, 12, 3, 1, '#2a2620');
      glow(ctx, p.x, ly, 38 * fl, '#ffb860', 0.5 * q * fl);
      glow(ctx, p.x, ly, 9, '#fff1c8', 0.75 * q);
    }
    ctx.restore();
  }
  let ents = null;
  function entities(now) {
    if (!exists()) return [];
    T = now;
    if (!ents) ents = where().map((p, i) => ({ kind: 'stagecraft', y: p.y, draw: ctx => lamp(ctx, p, rise(T), T, i) }));
    return ents;
  }

  return { init(d) { deps = d; }, update, drawGround, entities, interactables, isOpen: exists, sync };
})();
