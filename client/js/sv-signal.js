// The Cinder Sovereign, Act IV: the First Signal (Diamond Dust, Heavensfall). In each pass of Every Name the first echo's answer sets the frame and the other two answers
// land on it, turned by the pass's fixed angle. The host sends roomev 'svsignal:<n>' { who, x, y, turn, at, dur } as that first echo is called: `at` is the second its sigil
// flares (as the echo stands), `dur` how long the message lives. All this file does is the flare: a thin gold ring running out of the sigil, a four-pointed glint over it and a
// few embers lifting. Nothing here is a telegraph and nothing paints safe ground; it is a pure function of the clients' clock and the event (a scrubbed clock draws the same).
// Contract: docs/plans/2026-10-ultimate-build.md ("Built (First Signal)"). Hooked in the way sovereign-fx.js is (ArenaView.drawRoomOver, ours last); load it after that file.

const SV_SIGNAL = (() => {
  const GOLD = '#ffd05a', HOT = '#fff2b0', WHITE = '#fffdf0', AMBER = '#ffa83a';
  const c01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  let warned = false;
  const warn = e => { if (!warned) { warned = true; if (typeof console !== 'undefined') console.warn('sv-signal', e); } };
  const glow = (c, x, y, r, col, a) => {
    if (a <= 0.01 || r < 1) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  const LIFE = 2.2;   // (seconds the flare plays from its start)

  function flare(c, ev, t, low) {
    const u = t - ev.start - (+ev.at || 0); if (u < 0 || u > LIFE) return;
    const x = +ev.x || 0, y = +ev.y || 0, q = c01(u / 0.9), fade = 1 - c01((u - 0.9) / (LIFE - 0.9)), pop = Math.exp(-u * 3.2);
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, x, y, 70 + 90 * eo3(q), AMBER, 0.34 * pop + 0.1 * fade);
    glow(c, x, y, 26 + 20 * pop, HOT, 0.5 * pop);
    for (const [r0, r1, w, a] of [[16, 190, 3.4, 0.85], [10, 120, 1.8, 0.6]]) {   // the ring, and a finer one inside it
      const k = eo3(q), ra = (1 - c01((u - 0.15) / 0.9)) * a; if (ra <= 0.02) continue;
      c.beginPath(); c.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); c.lineWidth = w * (1 - 0.5 * q); c.strokeStyle = rgba(GOLD, ra); c.stroke();
    }
    const ga = pop * 0.95, gr = 54 + 30 * (1 - pop);   // the glint: a long thin four-pointed star
    if (ga > 0.03) {
      c.save(); c.translate(x, y); c.rotate(0.3 * u);
      for (const [R, w, col] of [[gr * 1.7, 0.1, GOLD], [gr, 0.26, WHITE]]) {
        c.beginPath();
        for (let i = 0; i < 8; i++) { const rr = i % 2 ? R * w : R, an = i * Math.PI / 4; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(rr, 0); }
        c.closePath(); c.fillStyle = rgba(col, Math.min(1, ga)); c.fill();
      }
      c.restore();
    }
    const n = low ? 3 : 9;
    for (let i = 0; i < n; i++) {   // a few embers lifting off the sigil
      const ph = c01((u - hs(i, 3) * 0.3) / 1.4); if (ph <= 0 || ph >= 1) continue;
      glow(c, x + (hs(i, 1) - 0.5) * 70, y - ph * (60 + 50 * hs(i, 2)), 5 * (1.2 - 0.6 * ph), ph < 0.4 ? HOT : AMBER, Math.sin(ph * Math.PI) * 0.8);
    }
    c.restore();
  }

  function over(ctx, room, t, env) {
    if (!room || !room.ev) return;
    for (const k in room.ev) if (k.charCodeAt(0) === 115 && k.startsWith('svsignal:')) flare(ctx, room.ev[k], t, !!(env && env.low));
  }

  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svSignal) return;
    const dro = ArenaView.drawRoomOver;
    if (typeof dro !== 'function') return;
    ArenaView.drawRoomOver = function (ctx, room, t, env) {
      const res = dro.apply(this, arguments);
      if (env && env.bossId === 'sovereign') { try { over(ctx, room, t, env); } catch (e) { warn(e); } }
      return res;
    };
    ArenaView.__svSignal = 1;
  }
  hook();

  return { flare, over };
})();
