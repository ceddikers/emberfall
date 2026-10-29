// The Cinder Sovereign (the Ultimate), Act I: Halo Procession (Pantokrator), the drawing. The host is `procession` in arena/bosses/sovereign.js; the contract is the
// "Built (Halo Procession)" note in docs/plans/2026-10-ultimate-build.md.
// What the host sends: roomev `svproc:<n>` { x, y (the wedges' centre), a0 (where slice 0 of the first wedge stands), dir (+1 or -1: the way the wedges turn), arc (one slice's
// angle), step (seconds between slices landing), first (when slice 0 lands), n (slices), lead (how long a slice is painted before it lands), ids (the heroes, in ring order),
// at (when each hero's ring closes), r (the burst's radius), dur }, and the telegraphs svWedge (a narrow red cone, drawn by boss-tells.js) and svBurst (a red circle on a hero).
// What is drawn here (nothing paints a safe place; red stays the damage, and everything here is light laid on or beside it):
//   the lit arcs   two arcs of the halo, glowing at the Sovereign's feet, standing where the wedges start and then moving with the painted wedge (the way they move IS the direction)
//   the edges      a hot line along each wedge's advancing edge, a flare as each slice strikes, and a scorch left behind it
//   the rings      a countdown ring on every hero (one to four pips: the order), full until its last seconds, then draining; the next one to close is bright, the rest quiet
//   the burst      embers drawn in along the red circle as a ring closes, then a ring of fire thrown out of the hero
// Hooks itself in from this file (ArenaView.drawTelegraphs: ours before, the edges after; ArenaView.drawRoomOver: the rings and the burst) and only acts when `env.bossId` is
// 'sovereign'. A throw inside is caught and warned once. Everything is a function of the clients' clock, the event and the remembered telegraphs.

const SV_PROC = (() => {
  const PI2 = Math.PI * 2;
  const c01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const lerp = (a, b, q) => a + (b - a) * q;
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const K = { ink: '#0c0503', dark: '#4a1608', red: '#c23a12', ember: '#ff7a22', amber: '#ffa83a', gold: '#ffd05a', hot: '#fff2b0', white: '#fffdf0' };
  const RING = 6.0;   // seconds a ring takes to drain
  let S = { recs: [], seen: new WeakSet(), last: -1e9 };
  let warned = false;
  const warn = e => { if (!warned) { warned = true; if (typeof console !== 'undefined') console.warn('sv-procession', e); } };
  // exception-safe (sovereign-fx.js guarded: a throw is logged once and every canvas state it saved is restored)
  const guard = (ctx, fn) => { if (typeof SV_FX !== 'undefined' && SV_FX.guarded) return SV_FX.guarded(ctx, fn); ctx.save(); try { fn(); } catch (e) { warn(e); } finally { ctx.restore(); } };
  const add = (c, fn) => { c.save(); c.globalCompositeOperation = 'lighter'; fn(); c.restore(); };
  const clipRoom = c => { ARENA.trace(c, 3); c.clip(); };
  const haloR = env => {
    const st = env.boss && env.boss.st;
    const k = env.bossScale > 0 ? env.bossScale : (typeof SV_ART !== 'undefined' && SV_ART.DRAW) || 1.3;   // (the halo as drawn: the raid draws the Sovereign at 1.3)
    return st && typeof SV_ART !== 'undefined' && SV_ART.sigilPos ? SV_ART.sigilPos(st, 0, k).r : 150 * k;
  };

  // where the procession stands at clock t: its slices landed (< kLand), laid (<= kLay)
  function state(ev, t) {
    const u = t - ev.start, n = ev.n | 0;
    const kLand = Math.max(0, Math.min(n, Math.floor((u - ev.first) / ev.step) + 1));
    const kLay = Math.min(n - 1, Math.floor((u - (ev.first - ev.lead)) / ev.step));
    const end = ev.first + (n - 1) * ev.step;
    return { u, kLand, kLay, n, out: 1 - c01((u - end - 0.2) / 1.6), pre: kLay < 0 };
  }
  const ang = (ev, w, k) => ev.a0 + w * Math.PI + ev.dir * k * ev.arc;
  const sector = (c, x, y, a0, a1, r0, r1) => {   // (a ring sector between two angles, either way round)
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    c.beginPath(); c.arc(x, y, r1, lo, hi); c.arc(x, y, r0, hi, lo, true); c.closePath();
  };
  const ray = (c, x, y, a, r0, r1) => { c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); };

  // before the telegraphs: the scorch each wedge leaves behind it
  function scorch(c, ev, st, t) {
    if (st.pre || st.kLand <= 0) return;
    c.save(); clipRoom(c);
    for (let w = 0; w < 2; w++) {
      for (let k = Math.max(0, st.kLand - 10); k < st.kLand; k++) {
        const age = st.u - (ev.first + k * ev.step), a = (1 - c01(age / 4.6)) * st.out;
        if (a <= 0.01) continue;
        const A = ang(ev, w, k), h = ev.arc * 0.5 * 1.04;
        sector(c, ev.x, ev.y, A - h, A + h, 40, 700); c.fillStyle = rgba(K.ink, 0.24 * a); c.fill();
        const heat = 1 - c01(age / 1.3);
        if (heat > 0.02) { ray(c, ev.x, ev.y, A, 150, 640); c.strokeStyle = rgba(K.ember, 0.4 * heat * st.out); c.lineWidth = 3; c.stroke(); }
      }
    }
    c.restore();
  }

  // after the telegraphs: the lit arcs of the halo, the advancing edges, the flare of a slice striking
  function lit(c, env, ev, st, t) {
    const R = haloR(env), b = env.boss && Number.isFinite(env.boss.x) ? env.boss : { x: ev.x, y: ev.y }, hx = b.x, hy = b.y;
    if (st.out <= 0.01 || st.kLand >= st.n && st.out <= 0.01) return;
    const born = c01((st.u - 0.2) / 0.6), pulse = 0.82 + 0.18 * Math.sin(t * 9);
    c.save(); clipRoom(c);
    for (let w = 0; w < 2; w++) {
      // the painted wedge's two ends (before the first slice is laid: the arc standing where it starts)
      const kLo = st.pre ? 0 : Math.min(st.kLand, st.n - 1), kHi = st.pre ? 0 : Math.max(kLo, st.kLay);
      const aLo = ang(ev, w, kLo) - ev.dir * ev.arc * 0.52, aHi = ang(ev, w, kHi) + ev.dir * ev.arc * 0.52;
      const a = born * st.out;
      add(c, () => {
        // the halo's lit arc: round the Sovereign's feet, a hot core on the warm band
        for (const [lw, col, al] of [[15, K.red, 0.5], [8, K.amber, 0.8], [3.2, K.hot, 1]]) {
          c.beginPath(); c.arc(hx, hy, R, Math.min(aLo, aHi), Math.max(aLo, aHi)); c.lineCap = 'round'; c.lineWidth = lw; c.strokeStyle = rgba(col, al * a * pulse); c.stroke();
        }
        glow(c, hx + Math.cos(aHi) * R, hy + Math.sin(aHi) * R, 26, K.hot, 0.6 * a * pulse);   // (its head)
        if (!st.pre) {
          // the advancing edge of the wedge: a thin hot line, brightest near the Sovereign
          ray(c, ev.x, ev.y, aHi, 150, 640); c.lineWidth = 6; c.strokeStyle = rgba(K.ember, 0.4 * a); c.stroke();
          c.lineWidth = 2; c.strokeStyle = rgba(K.hot, 0.85 * a); c.stroke();
          // the slice that struck last: a flare down its length
          if (st.kLand > 0) {
            const age = st.u - (ev.first + (st.kLand - 1) * ev.step), f = Math.exp(-age * 5.5);
            if (f > 0.03) { const A = ang(ev, w, st.kLand - 1); sector(c, ev.x, ev.y, A - ev.arc * 0.5, A + ev.arc * 0.5, 150, 700); c.fillStyle = rgba(K.gold, 0.32 * f * st.out); c.fill(); ray(c, ev.x, ev.y, A, 150, 700); c.lineWidth = 3 * f + 1; c.strokeStyle = rgba(K.white, 0.8 * f * st.out); c.stroke(); }
          }
        }
      });
    }
    c.restore();
  }

  // the burst: remembered the first time its red circle is seen, so its landing still plays after the telegraph is gone
  function scan(env, t, room) {
    if (t < S.last - 1 || (room && S.rr !== room)) S = { recs: [], seen: new WeakSet(), last: t, rr: room };   // (a new pull is a new room object: the clock never rewinds on a retry)
    S.last = t;
    if (env.tgs) for (const tg of env.tgs.values()) {
      if (tg.tag !== 'svBurst' || S.seen.has(tg)) continue;
      S.seen.add(tg); S.recs.push({ tg, start: tg.start, dur: tg.dur, land: tg.start + tg.dur, s: tg.live || tg.shape, cancel: false, id: +tg.id || S.recs.length });
    }
    for (let i = S.recs.length - 1; i >= 0; i--) {
      const r = S.recs[i], tg = r.tg;
      r.s = tg.live || tg.shape || r.s;
      if (tg.gone != null) { r.cancel = tg.gone < tg.start + tg.dur - 0.45; r.land = tg.gone; } else r.land = tg.start + tg.dur;
      if (t > r.land + 1.4) S.recs.splice(i, 1);
    }
  }
  // the red circle closing: embers drawn in along its rim toward the hero, a hot core growing in them (the red fill and rim are the telegraph's own)
  function gather(c, r, t) {
    const u = t - r.start, p = c01(u / r.dur); if (u < 0 || t >= r.land || !r.s) return;
    const x = r.s.x, y = r.s.y, R = r.s.r, n = 14;
    c.save(); clipRoom(c);
    add(c, () => {
      for (let i = 0; i < n; i++) {
        const ph = ((t * 0.9 + hs(i, r.id)) % 1), th = i / n * PI2 + hs(i, r.id + 3) * 0.4, rr = R * (1 - ph * 0.92);
        glow(c, x + Math.cos(th) * rr, y + Math.sin(th) * rr, 4 + 4 * ph, ph < 0.5 ? K.ember : K.hot, 0.5 * p * Math.sin(ph * Math.PI));
      }
      glow(c, x, y, 30 + 50 * p, K.red, 0.14 + 0.3 * p);
    });
    c.restore();
  }
  function burstOver(c, r, t) {
    const age = t - r.land; if (age < 0 || age > 0.9 || r.cancel || !r.s) return;
    const x = r.s.x, y = r.s.y, R = r.s.r, q = c01(age / 0.7), a = 1 - q * q;
    c.save(); clipRoom(c);
    add(c, () => {
      glow(c, x, y, R * 0.8 * (1 - 0.3 * q), K.ember, 0.5 * a);
      c.beginPath(); c.arc(x, y, R * (0.25 + 0.75 * eo3(q)), 0, PI2);
      c.lineWidth = 9 * (1 - q) + 2; c.strokeStyle = rgba(K.amber, 0.9 * a); c.stroke();
      c.lineWidth = 3 * (1 - q) + 1; c.strokeStyle = rgba(K.white, a); c.stroke();
      for (let i = 0; i < 12; i++) { const th = i / 12 * PI2 + hs(i, r.id) * 0.5, d = R * (0.2 + 0.8 * eo3(q)) * (0.7 + 0.3 * hs(i, 9)); glow(c, x + Math.cos(th) * d, y + Math.sin(th) * d - 14 * q, 6 * (1 - q) + 2, K.hot, 0.8 * a); }
    });
    c.restore();
  }

  // over the units: a countdown ring on every hero
  function rings(c, env, ev, st, t) {
    if (!ev.ids || !env.entById) return;
    let next = -1;
    for (let i = 0; i < ev.ids.length; i++) if (ev.at[i] > st.u - 0.05) { next = i; break; }
    for (let i = 0; i < ev.ids.length; i++) {
      const left = ev.at[i] - st.u, since = -left;
      if (since > 0.7) continue;
      const e = env.entById(ev.ids[i]); if (!e || e.alive === false || e.dead) continue;
      const x = e.x, y = e.y + 6, born = c01((st.u - 0.1) / 0.5), main = i === next ? 1 : 0.45, frac = c01(left / RING), hot = left < 2.6 && left > -0.1;
      const R0 = i === next ? 38 : 32, a0 = -Math.PI / 2, ae = a0 + PI2 * frac, pulse = hot ? 0.75 + 0.25 * Math.sin(t * 15) : 1;
      if (since > 0) {   // (it closes: a hot ring thrown off the hero)
        const q = c01(since / 0.55);
        add(c, () => { c.beginPath(); c.arc(x, y, R0 + 70 * eo3(q), 0, PI2); c.lineWidth = 6 * (1 - q); c.strokeStyle = rgba(K.ember, 0.9 * (1 - q)); c.stroke(); });
        continue;
      }
      const k = born * main;
      c.save(); c.lineCap = 'round';
      c.beginPath(); c.arc(x, y, R0, 0, PI2); c.lineWidth = 7; c.strokeStyle = rgba(K.ink, 0.45 * k); c.stroke(); c.lineWidth = 2.4; c.strokeStyle = rgba(K.dark, 0.9 * k); c.stroke();
      if (frac > 0.004) add(c, () => {
        c.beginPath(); c.arc(x, y, R0, a0, ae); c.lineWidth = 7; c.strokeStyle = rgba(hot ? K.ember : K.amber, 0.75 * k * pulse); c.stroke();
        c.lineWidth = 3; c.strokeStyle = rgba(hot ? K.hot : K.gold, k); c.stroke();
        glow(c, x + Math.cos(ae) * R0, y + Math.sin(ae) * R0, 12, K.hot, 0.8 * k);   // (the head of what is left)
      });
      // the pips: the ring's place in the order (one to four), over the top of the ring
      for (let j = 0; j <= i; j++) {
        const px = x + (j - i / 2) * 9, py = y - R0 - 9;
        c.beginPath(); c.arc(px, py, 3, 0, PI2); c.fillStyle = rgba(K.ink, 0.6 * k); c.fill();
        c.beginPath(); c.arc(px, py, 2, 0, PI2); c.fillStyle = rgba(hot ? K.hot : K.gold, 0.95 * k); c.fill();
      }
      c.restore();
    }
  }

  const eventsOf = room => { const out = []; if (room && room.ev) for (const k in room.ev) if (k.startsWith('svproc:')) out.push(room.ev[k]); return out; };
  const live = (ev, t) => { const u = t - ev.start; return u > -0.1 && u < (+ev.dur || 30) + 2; };

  function under(ctx, room, t, env) {
    scan(env, t, room);
    for (const ev of eventsOf(room)) { if (!live(ev, t)) continue; scorch(ctx, ev, state(ev, t), t); }
    for (const r of S.recs) gather(ctx, r, t);
  }
  function post(ctx, room, t, env) {
    for (const ev of eventsOf(room)) { if (!live(ev, t)) continue; lit(ctx, env, ev, state(ev, t), t); }
  }
  function over(ctx, room, t, env) {
    for (const ev of eventsOf(room)) { if (!live(ev, t)) continue; rings(ctx, env, ev, state(ev, t), t); }
    for (const r of S.recs) burstOver(ctx, r, t);
  }

  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svProc) return;
    const dt = ArenaView.drawTelegraphs, dro = ArenaView.drawRoomOver;
    ArenaView.drawTelegraphs = function (ctx, tgs, t, env) {
      const room = env && env.bossId === 'sovereign' ? (this.liveRoom || env.room) : null;
      if (room && room.ev) guard(ctx, () => under(ctx, room, t, env));
      const res = dt.apply(this, arguments);
      if (room && room.ev) guard(ctx, () => post(ctx, room, t, env));
      return res;
    };
    ArenaView.drawRoomOver = function (ctx, room, t, env) {
      const res = dro.apply(this, arguments);
      if (env && env.bossId === 'sovereign' && room && room.ev) guard(ctx, () => over(ctx, room, t, env));
      return res;
    };
    ArenaView.__svProc = 1;
  }
  hook();

  return { state, under, post, over };
})();

if (typeof module !== 'undefined') module.exports = { SV_PROC };
