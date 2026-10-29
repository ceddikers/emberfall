// The Cinder Sovereign, Act III: Foretold (the dance pass's Fate Projection). Caelum's echo shows the future: four ghosts, each a translucent copy of one hero in the hero's own
// look, rise in the room, each marked with what will be done to that hero (a red spread, a blue share the tank and the healer take together, the seed). Contract and timings:
// docs/plans/2026-10-ultimate-build.md ("Built (Foretold)"); the script is sovereign.js `foretold`, which sends roomev 'svfore:<n>'
//   g: [[heroId, x, y, kind (0 share, 1 spread, 2 seed), facing], ...]   ox, oy: where the three fans come from   a: [the fans' middle angles]   arc: a fan's width
//   fan: seconds from the start to the fans landing   mark: to the marks landing   lead: how long the fans are painted before they land   dur
// A second svfore:<n> with no `g` is the end (the push into Act IV). What is drawn here is only the ghosts, their marks and a rift where the blades come from: the fans and the
// marks themselves are the telegraphs (red for damage, blue for the share), drawn by the arena as ever. Safe ground is never painted: the ghosts are the markers, and a ghost's footing
// is its own faint ring, not a shape of the floor. Nothing flashes the screen. Pure function of the clients' clock and the event.
// Layers: the ghosts and the rift go UNDER the telegraph fills (ArenaView.drawTelegraphs is wrapped, as sovereign-fx.js does), so the real heroes stand on top of their ghosts; the marks
// over their heads and the brief impacts go OVER (ArenaView.drawRoomOver, ours last).

const SV_FORETOLD = (() => {
  const TAU = Math.PI * 2;
  const c01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const sm = q => q * q * (3 - 2 * q);
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const K = { silv: '#e4eeff', mid: '#9db8e8', dk: '#1d2a4a', blue: '#3a86ff', blueMid: '#5db0ff', blueHi: '#b8e2ff', red: '#d83a14', ember: '#ff7a22', gold: '#ffd05a', hot: '#fff2b0', ink: '#0c0503' };
  const HERO_SCALE = 1.85;   // (main.js ARENA_HERO_SCALE: the raid room's hero size)
  const KIND_COL = [K.blueMid, K.ember, K.gold];
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
  const glow = (c, x, y, r, hex, a) => {
    if (a <= 0.01 || r < 1) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(hex, a)); g.addColorStop(1, rgba(hex, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  const add = (c, fn) => { c.save(); c.globalCompositeOperation = 'lighter'; fn(); c.restore(); };
  let LOW = false;
  const CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const readLow = () => { try { return !!((typeof Save !== 'undefined' && Save.setting && Save.setting('lowFx', false)) || (CALM && CALM.matches)); } catch (e) { return false; } };
  const cnt = n => (LOW ? Math.max(1, Math.ceil(n * 0.4)) : n);
  let warned = false;
  const warn = e => { if (!warned) { warned = true; if (typeof console !== 'undefined') console.warn('sv-foretold', e); } };

  // ---------------------------------------------------------------------------------------------------------------- the ghost's body
  // Each ghost is drawn once a frame into a small canvas of its own with the hero's own art, then washed cold silver-blue and laid on the floor translucent.
  const PIC = new Map();
  const SIZE = 240;
  function picture(key, e, face, t, ph) {
    if (typeof document === 'undefined' || typeof drawHero !== 'function' || !e || !e.cls) return null;
    let p = PIC.get(key);
    if (!p) {
      const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
      p = { cv, cx: cv.getContext('2d'), st: { t: 0, moving: false, action: null, phase: ph } };
      PIC.set(key, p);
      if (PIC.size > 24) PIC.delete(PIC.keys().next().value);
    }
    const c = p.cx; p.st.t = t;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    try { drawHero(c, e.cls, SIZE / 2, SIZE / 2 + 24, face, p.st, HERO_SCALE, { spec: e.spec, ring: false, noShadow: true, sv: e.sv || null }); } catch (err) { c.restore(); warn(err); return null; }
    c.restore();
    c.save();
    c.globalCompositeOperation = 'source-atop';   // (cold: the hero's own colours under a silver-blue wash, lighter towards the top)
    const g = c.createLinearGradient(0, 0, 0, SIZE); g.addColorStop(0, 'rgba(228,238,255,0.6)'); g.addColorStop(1, 'rgba(120,150,215,0.5)');
    c.fillStyle = g; c.fillRect(0, 0, SIZE, SIZE);
    c.restore();
    return p.cv;
  }
  function ghost(c, ev, i, G, t, u, env, a) {
    const [id, x, y, kind, face] = G, un = env && env.entById ? env.entById(id) : null;
    const col = KIND_COL[kind] || K.silv, bob = Math.sin(t * 1.7 + i * 1.3) * 3;
    // the footing: a soft silver ring with the mark's colour in it (a footprint, not a shape of the floor), and a thin glow
    add(c, () => { glow(c, x, y + 4, 62, K.mid, 0.2 * a); glow(c, x, y + 4, 34, col, 0.16 * a); });
    c.save(); c.translate(x, y + 6); c.scale(1, 0.62);
    c.beginPath(); c.arc(0, 0, 27, 0, TAU); c.lineWidth = 3; c.strokeStyle = rgba(K.ink, 0.35 * a); c.stroke();
    c.beginPath(); c.arc(0, 0, 27, 0, TAU); c.lineWidth = 1.6; c.strokeStyle = rgba(K.silv, 0.75 * a); c.setLineDash([5, 5]); c.lineDashOffset = -t * 6; c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.lineWidth = 1.2; c.strokeStyle = rgba(col, 0.7 * a); c.stroke();
    c.restore();
    const pic = picture('f' + ev.start.toFixed(2) + ':' + i, un, face, t, i * 0.7);
    if (pic) {
      c.save(); c.globalAlpha = 0.58 * a;
      const lift = 10 * (1 - eo3(c01(u / 1.2))) + bob;   // (rises a little as it forms)
      c.drawImage(pic, x - SIZE / 2, y - SIZE / 2 - 24 - lift, SIZE, SIZE);
      c.restore();
    } else {   // (a hero we cannot draw: a plain silver standing shape, so the spot still reads)
      c.save(); c.globalAlpha = 0.4 * a; c.beginPath(); c.ellipse(x, y - 18 - bob, 13, 22, 0, 0, TAU); c.fillStyle = rgba(K.mid, 0.8); c.fill(); c.restore();
    }
    // motes rising off it as it holds
    const N = cnt(6);
    add(c, () => { for (let m = 0; m < N; m++) { const ph = (t * 0.45 + hs(m, i + 3)) % 1, mx = x + (hs(m, i + 9) - 0.5) * 36, my = y - 6 - ph * 78; glow(c, mx, my, 3.4, K.blueHi, 0.7 * Math.sin(ph * Math.PI) * a); } });
    // a thread from the real hero to their ghost (faint; the local hero's is the clearest)
    if (un && un.x != null && Math.hypot(un.x - x, un.y - y) > 40) {
      const mine = typeof Net !== 'undefined' && Net.id != null && un.id === Net.id, k = (mine ? 0.5 : 0.18) * a;
      c.save(); c.setLineDash([4, 9]); c.lineDashOffset = -t * 22; c.lineCap = 'round';
      c.beginPath(); c.moveTo(un.x, un.y + 2); c.lineTo(x, y + 4);
      c.lineWidth = mine ? 3 : 2; c.strokeStyle = rgba(K.ink, 0.25 * k / 0.5); c.stroke();
      c.lineWidth = mine ? 1.6 : 1; c.strokeStyle = rgba(K.silv, k); c.stroke();
      c.restore();
    }
  }

  // ---------------------------------------------------------------------------------------------------------------- the marks over the heads
  function markSpread(c, x, y, t, a, seed) {   // a red ring with spikes bursting outward
    const r = 11 + Math.sin(t * 3 + seed) * 1.2;
    add(c, () => { glow(c, x, y, 26, K.red, 0.4 * a); });
    c.save(); c.translate(x, y); c.rotate(t * 0.5);
    c.lineCap = 'round';
    for (let m = 0; m < 8; m++) { const an = m * TAU / 8; c.beginPath(); c.moveTo(Math.cos(an) * (r + 3), Math.sin(an) * (r + 3)); c.lineTo(Math.cos(an) * (r + 11), Math.sin(an) * (r + 11)); c.lineWidth = 4.2; c.strokeStyle = rgba(K.ink, 0.6 * a); c.stroke(); c.lineWidth = 2.2; c.strokeStyle = rgba(K.ember, 0.95 * a); c.stroke(); }
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = 5; c.strokeStyle = rgba(K.ink, 0.65 * a); c.stroke(); c.lineWidth = 3; c.strokeStyle = rgba(K.red, a); c.stroke(); c.lineWidth = 1; c.strokeStyle = rgba(K.hot, 0.8 * a); c.stroke();
    c.restore();
  }
  function markShare(c, x, y, t, a, seed) {   // two blue rings linked
    add(c, () => { glow(c, x, y, 26, K.blue, 0.4 * a); });
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.4 + seed) * 0.12);
    for (const [ox, w, col] of [[-6.5, 5, K.ink], [-6.5, 3, K.blueMid], [-6.5, 1, K.blueHi], [6.5, 5, K.ink], [6.5, 3, K.blueMid], [6.5, 1, K.blueHi]]) {
      c.beginPath(); c.arc(ox, 0, 9, 0, TAU); c.lineWidth = w; c.strokeStyle = rgba(col, (col === K.ink ? 0.6 : 0.95) * a); c.stroke();
    }
    c.restore();
  }
  function markSeed(c, x, y, t, a, seed) {   // the dark seed, split along its length with the fire inside (the Seeds of Ash glyph)
    const beat = Math.exp(-((t * 1.1 + seed) % 1) * 6), sz = 1.15 + 0.15 * beat;
    add(c, () => { glow(c, x, y, 24 + 6 * beat, K.red, (0.3 + 0.3 * beat) * a); });
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.7 + seed) * 0.14);
    c.beginPath(); c.moveTo(0, -10 * sz); c.bezierCurveTo(8 * sz, -5 * sz, 7 * sz, 6 * sz, 0, 10 * sz); c.bezierCurveTo(-7 * sz, 6 * sz, -8 * sz, -5 * sz, 0, -10 * sz); c.closePath();
    c.fillStyle = rgba('#120a06', 0.96 * a); c.fill(); c.lineWidth = 2; c.strokeStyle = rgba(K.ink, a); c.stroke();
    c.beginPath(); c.moveTo(0, -8 * sz); c.bezierCurveTo(2.4 * sz, -2 * sz, -2.4 * sz, 2 * sz, 0, 8 * sz);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = rgba(K.red, (0.5 + 0.5 * beat) * a); c.lineWidth = 3; c.stroke(); c.strokeStyle = rgba(K.gold, (0.35 + 0.65 * beat) * a); c.lineWidth = 1.4; c.stroke(); c.restore();
    c.restore();
  }
  const MARK = [markShare, markSpread, markSeed];

  // ---------------------------------------------------------------------------------------------------------------- the rift the blades come from, and the blades
  function rift(c, ev, u, t) {
    const out = (+ev.fan || 6.8) + 0.5;
    if (u < 0.2 || u > out + 0.9) return;
    const k = sm(c01((u - 0.2) / 1.2)) * (1 - sm(c01((u - out) / 0.9))), ox = +ev.ox || 0, oy = +ev.oy || 0, land = Math.exp(-Math.max(0, u - (+ev.fan || 6.8)) * 4) * (u >= (+ev.fan || 6.8) ? 1 : 0);
    if (k <= 0.02) return;
    add(c, () => { glow(c, ox, oy, 70 + 40 * land, K.mid, 0.28 * k); glow(c, ox, oy, 26 + 20 * land, K.silv, 0.5 * k + 0.4 * land); });
    c.save(); c.translate(ox, oy); c.rotate(t * 0.4); c.lineCap = 'round';
    for (let m = 0; m < 6; m++) {   // six thin blades of silver light turning about the point
      const an = m * TAU / 6, L = (34 + 22 * Math.sin(t * 2 + m)) * k * (1 + 0.5 * land);
      c.beginPath(); c.moveTo(Math.cos(an) * 8, Math.sin(an) * 8); c.lineTo(Math.cos(an) * L, Math.sin(an) * L);
      c.lineWidth = 5; c.strokeStyle = rgba(K.ink, 0.35 * k); c.stroke(); c.lineWidth = 2.2; c.strokeStyle = rgba(K.silv, 0.9 * k); c.stroke();
    }
    c.restore();
  }
  function blades(c, ev, u) {   // as the fans land: a silver streak out along each fan's middle, and a few cinders
    const T = +ev.fan || 6.8, age = u - T; if (age < -0.05 || age > 0.8 || !ev.a) return;
    const ox = +ev.ox || 0, oy = +ev.oy || 0, R = 900, head = eo3(c01(age / 0.14)), tail = c01((age - 0.04) / 0.35), al = 1 - c01((age - 0.08) / 0.7);
    c.save(); c.lineCap = 'round';
    for (const an of ev.a) {
      const cs = Math.cos(an), sn = Math.sin(an), x2 = ox + cs * R * head, y2 = oy + sn * R * head, x1 = ox + cs * R * tail * head, y1 = oy + sn * R * tail * head;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = 14; c.strokeStyle = rgba(K.ink, 0.3 * al); c.stroke();
      c.lineWidth = 6; c.strokeStyle = rgba(K.mid, 0.7 * al); c.stroke(); c.lineWidth = 2; c.strokeStyle = rgba(K.silv, 0.95 * al); c.stroke();
    }
    c.restore();
  }
  function landing(c, ev, G, kind, u, t) {   // the mark landing on the ghost's spot: a ring and a puff, in the mark's own colour
    const T = +ev.mark || 7.8, age = u - T; if (age < -0.02 || age > 0.8) return;
    const [, x, y] = G, col = KIND_COL[kind] || K.silv, q = c01(age / 0.5);
    add(c, () => {
      c.beginPath(); c.arc(x, y + 4, 14 + 64 * eo3(q), 0, TAU); c.lineWidth = 5 * (1 - q) + 1; c.strokeStyle = rgba(col, 0.85 * (1 - q)); c.stroke();
      glow(c, x, y, 40 * (1 - q) + 8, K.hot, 0.5 * (1 - q));
    });
  }

  // ---------------------------------------------------------------------------------------------------------------- the frame
  function life(ev, u, i) {   // how formed the ghost is (0..1): rises one after another, goes when the marks have landed
    const born = sm(c01((u - 0.25 - i * 0.22) / 1.3)), T = +ev.mark || 7.8, gone = sm(c01((u - T - 0.35) / 1.1));
    return born * (1 - gone);
  }
  function each(room, fn) { for (const k in room.ev) if (k.charCodeAt(0) === 115 && k.startsWith('svfore:')) { const ev = room.ev[k]; if (ev && Array.isArray(ev.g)) fn(ev); } }
  function under(ctx, room, t, env) {
    if (!room || !room.ev) return;
    LOW = env && env.low != null ? !!env.low : readLow();
    each(room, ev => {
      const u = t - ev.start; if (u < -0.1 || u > (+ev.dur || 10) + 0.5) return;
      ctx.save();
      rift(ctx, ev, u, t);
      // the bond between the two that share, under both
      const sh = ev.g.filter(G => G[3] === 0);
      if (sh.length === 2) {
        const a = Math.min(life(ev, u, 0), life(ev, u, 1)) * 0.8;
        if (a > 0.02) add(ctx, () => { ctx.beginPath(); ctx.moveTo(sh[0][1], sh[0][2]); ctx.lineTo(sh[1][1], sh[1][2]); ctx.lineWidth = 7; ctx.strokeStyle = rgba(K.blue, 0.35 * a); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(K.blueHi, 0.8 * a); ctx.stroke(); });
      }
      ev.g.forEach((G, i) => { const a = life(ev, u, i); if (a > 0.02) ghost(ctx, ev, i, G, t, u, env, a); });
      ctx.restore();
    });
  }
  function over(ctx, room, t, env) {
    if (!room || !room.ev) return;
    LOW = env && env.low != null ? !!env.low : readLow();
    each(room, ev => {
      const u = t - ev.start; if (u < -0.1 || u > (+ev.dur || 10) + 0.5) return;
      ctx.save();
      blades(ctx, ev, u);
      ev.g.forEach((G, i) => {
        const a = life(ev, u, i), kind = G[3];
        if (a > 0.05) { const hover = Math.sin(t * 2.1 + i * 1.7) * 3; MARK[kind] && MARK[kind](ctx, G[1], G[2] - 76 - hover, t, Math.min(1, a * 1.2), i * 1.9); }
        landing(ctx, ev, G, kind, u, t);
      });
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------------------------------------------- hooks
  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svFore) return;
    const dt = ArenaView.drawTelegraphs, dro = ArenaView.drawRoomOver;
    ArenaView.drawTelegraphs = function (ctx, tgs, t, env) {
      if (env && env.bossId === 'sovereign') { try { under(ctx, this.liveRoom || env.room, t, env); } catch (e) { warn(e); } }
      return dt.apply(this, arguments);
    };
    ArenaView.drawRoomOver = function (ctx, room, t, env) {
      const res = dro.apply(this, arguments);
      if (env && env.bossId === 'sovereign') { try { over(ctx, room, t, env); } catch (e) { warn(e); } }
      return res;
    };
    ArenaView.__svFore = 1;
  }
  hook();
  return { under, over, life, hook };
})();

if (typeof module !== 'undefined') module.exports = { SV_FORETOLD };
