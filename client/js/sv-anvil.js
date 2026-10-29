// The Cinder Sovereign, Act II: The Anvil Count (the Sovereign's own move; the Program Loop of the dance pass, docs/plans/2026-10-ultimate-raid.md).
// Messages (sovereign.js `anvilCount`):
//   svanvil:<n>    { ids, slots, at: [seconds from the message each tower can be soaked], r, dur }   the count: every hero's pips, in the order they soak
//   svanvilt:<m>   { x, y, id, slot, pips, at, dur }   a tower rising for hero `id` (their pip number is `pips`, their colour is slot `slot`), soakable `at` s after the message
// and the host's own blue tower telegraph (tag svAnvil, drawn by boss-tells.js) over it. Drawn here:
//   over a head   the pips the hero still has to wait: gold rings with a dot of the hero's own colour, one fewer after every tower, the last one beating when it is that hero's turn
//   on the floor  a heated forge sheet, an anvil in the hero's colour, its pips floating over it, the colour rim building to the strike; a clang of light and sparks when it lands
// Only the tower in play is ever on the floor (the later ones are not sent yet), so nothing here shows the whole chain. No safe ground is painted. Layers as sovereign-fx.js:
// under the telegraph fills (ArenaView.drawTelegraphs is wrapped) and over the units (ArenaView.drawRoomOver). Every value is a pure function of the clients' clock and the events.

const SV_ANVIL = (() => {
  const TAU = Math.PI * 2;
  const c01 = q => (q < 0 ? 0 : q > 1 ? 1 : q);
  const eo3 = q => 1 - Math.pow(1 - q, 3);
  const hs = (i, n = 0) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const K = { ink: '#0c0503', char: '#241008', ember: '#ff7a22', amber: '#ffa83a', gold: '#ffd05a', hot: '#fff2b0', white: '#fffdf0', iron: '#3a3030', ironHi: '#8a7a70', blue: '#5db0ff', blueHi: '#b8e2ff' };
  const SLOTS = () => (typeof FIGHT !== 'undefined' && FIGHT.SLOTS) || ['#5fe36a', '#b26cff', '#ff6fd2', '#f2eee4'];
  const heroCol = slot => { const s = SLOTS(); return s[((+slot || 0) % s.length + s.length) % s.length]; };
  const ent = (env, id) => (env && env.entById ? env.entById(id) : null) || (env && env.units ? env.units.find(u => u.id === id) : null);
  let warned = false;
  const warn = e => { if (!warned) { warned = true; if (typeof console !== 'undefined') console.warn('sv-anvil', e); } };
  const add = (c, fn) => { c.save(); c.globalCompositeOperation = 'lighter'; fn(); c.restore(); };
  const glw = (c, x, y, r, col, a) => { if (a > 0.01 && r > 0.5) glow(c, x, y, r, col, a); };

  // an anvil seen a little from above, centred at (x, y), `s` wide: iron with a lit top face and a horn, outlined in ink; `col` is a thin rim light (the hero's colour)
  function anvil(c, x, y, s, a, col, heat) {
    if (a <= 0.02) return;
    const u = s / 100;
    c.save(); c.translate(x, y); c.scale(u, u); c.globalAlpha = a; c.lineJoin = 'round';
    const body = () => {
      c.beginPath();
      c.moveTo(-46, -12); c.lineTo(-20, -18); c.lineTo(40, -18); c.lineTo(46, -8); c.lineTo(22, -2);   // the horn (left) and the face
      c.lineTo(14, 4); c.lineTo(20, 16); c.lineTo(34, 24); c.lineTo(34, 32); c.lineTo(-34, 32); c.lineTo(-34, 24); c.lineTo(-20, 16); c.lineTo(-14, 4); c.lineTo(-24, -2); c.closePath();
    };
    body(); c.fillStyle = K.iron; c.fill();
    c.lineWidth = 7; c.strokeStyle = 'rgba(12,5,3,0.9)'; c.stroke();
    c.beginPath(); c.moveTo(-46, -12); c.lineTo(-20, -18); c.lineTo(40, -18); c.lineTo(46, -8); c.lineTo(22, -2); c.lineTo(-24, -2); c.closePath();
    c.fillStyle = K.ironHi; c.fill();
    if (heat > 0.02) { c.fillStyle = rgba(K.ember, 0.75 * heat); c.fill(); c.beginPath(); c.moveTo(-18, -14); c.lineTo(36, -14); c.lineWidth = 4; c.strokeStyle = rgba(K.hot, 0.9 * heat); c.stroke(); }
    body(); c.lineWidth = 2.4; c.strokeStyle = rgba(col, 0.95); c.stroke();
    c.restore();
  }
  // a pip: an ink-edged gold ring with a dot of the hero's colour (hot: bigger, bright, beating)
  function pip(c, x, y, r, a, col, hot, t) {
    if (a <= 0.02) return;
    const k = hot ? 1 + 0.16 * Math.sin(t * 9) : 1, R = r * k;
    if (hot) add(c, () => glw(c, x, y, R * 3.2, col, 0.5 * a));
    c.save(); c.globalAlpha = a;
    c.beginPath(); c.arc(x, y, R + 2, 0, TAU); c.strokeStyle = 'rgba(12,5,3,0.75)'; c.lineWidth = 4.2; c.stroke();
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.fillStyle = 'rgba(30,14,8,0.7)'; c.fill(); c.strokeStyle = hot ? K.hot : K.gold; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); c.arc(x, y, R * 0.46, 0, TAU); c.fillStyle = col; c.fill();
    c.restore();
  }
  // a row of n pips centred on (x, y)
  function pipRow(c, x, y, n, a, col, hotLast, t) {
    const gap = 17, x0 = x - (n - 1) * gap / 2;
    for (let i = 0; i < n; i++) pip(c, x0 + i * gap, y, 5.6, a, col, hotLast && i === n - 1, t);
  }

  // ---- the floor: one tower (svanvilt:<m>)
  function towerUnder(c, ev, t, env) {
    const u = t - ev.start, tR = ev.at, r = 85, col = heroCol(ev.slot), x = ev.x, y = ev.y;
    if (u < -0.05 || u > tR + 2.4) return;
    const rise = eo3(c01(u / 0.9)), build = c01((u - (tR - 2.4)) / 2.4), pre = u < tR;
    if (pre) {
      // the heated sheet: a square of forge glow under the tower, brightening to the strike, and the hero's colour running round the rim
      add(c, () => {
        glw(c, x, y, r * 1.5, K.ember, (0.1 + 0.2 * build) * rise);
        glw(c, x, y, r * 1.1, col, (0.1 + 0.2 * build) * rise);
        c.beginPath(); c.arc(x, y, r - 3, 0, TAU); c.lineWidth = 3 + 2 * build; c.strokeStyle = rgba(col, (0.4 + 0.5 * build) * rise); c.stroke();
        for (let i = 0; i < 10; i++) {
          const an = i * TAU / 10 + u * (0.5 + build), fl = 0.5 + 0.5 * Math.sin(u * 5 + i * 2);
          glw(c, x + Math.cos(an) * (r - 6), y + Math.sin(an) * (r - 6), 3.5 + 2.5 * fl, i % 2 ? col : K.blueHi, rise * (0.35 + 0.5 * fl) * (0.4 + 0.6 * build));
        }
      });
      anvil(c, x, y + 4, 62 + 6 * Math.sin(u * 4) * build, rise * 0.95, col, build);
    } else {
      // the strike: the anvil rung, a ring of white-gold running out across the sheet, sparks thrown up
      const w = u - tR, q = c01(w / 0.5), fade = 1 - c01((w - 0.2) / 1.6);
      anvil(c, x, y + 4 + 4 * (1 - q), 62, fade, col, 1 - q * 0.6);
      add(c, () => {
        glw(c, x, y, 70 + 160 * q, K.hot, 0.55 * (1 - q));
        c.beginPath(); c.arc(x, y, 14 + (r + 40) * eo3(q), 0, TAU); c.lineWidth = 7 * (1 - q) + 1.5; c.strokeStyle = rgba(K.white, 0.9 * (1 - q)); c.stroke();
        c.beginPath(); c.arc(x, y, 8 + (r + 10) * eo3(q), 0, TAU); c.lineWidth = 4 * (1 - q) + 1; c.strokeStyle = rgba(col, 0.8 * (1 - q)); c.stroke();
        for (let i = 0; i < 14; i++) {
          const an = hs(i, 11) * TAU, sp = 70 + 120 * hs(i, 12), d = sp * eo3(c01(w / 0.9)), h = 90 * Math.sin(Math.PI * c01(w / 0.9)) * (0.5 + hs(i, 13));
          glw(c, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.6 - h, 3.2 * (1 - 0.6 * c01(w / 0.9)), i % 3 ? K.gold : K.hot, (1 - c01(w / 0.9)) * 0.95);
        }
      });
    }
  }

  // ---- over the heads and the tower (svanvil:<n>, svanvilt:<m>)
  function over(c, room, t, env) {
    if (!room || !room.ev) return;
    c.save();
    for (const k in room.ev) {
      if (k.charCodeAt(0) !== 115 || k.charCodeAt(1) !== 118 || k.charCodeAt(2) !== 97) continue;   // ('sva')
      const ev = room.ev[k];
      try {
        if (k.startsWith('svanvilt:')) {
          const u = t - ev.start;
          if (u < -0.05 || u > ev.at + 0.6) continue;
          const fa = c01(u / 0.5) * (1 - c01((u - ev.at) / 0.5));
          pipRow(c, ev.x, ev.y - 62, ev.pips, fa, heroCol(ev.slot), true, t);
        } else if (k.startsWith('svanvil:')) {
          const u = t - ev.start;
          if (u < -0.05 || u > ev.dur || !ev.ids) continue;
          const a = c01(u / 0.5) * (1 - c01((u - (ev.dur - 0.6)) / 0.6));
          let done = 0; for (const at of ev.at) if (u >= at + 0.1) done++;
          ev.ids.forEach((id, i) => {
            const e = ent(env, id); if (!e) return;
            const left = i + 1 - done; if (left <= 0) return;
            // whose turn it is: the tower for them is up (their last pip beats from the moment it rises)
            const turn = left === 1 && u >= ev.at[i] - 5.2;
            pipRow(c, e.x, e.y - (e.lift || 0) - 58, left, a, heroCol(ev.slots[i]), turn, t);
          });
        }
      } catch (e) { warn(e); }
    }
    c.restore();
  }
  function under(c, room, t, env) {
    if (!room || !room.ev) return;
    c.save();
    for (const k in room.ev) {
      if (!k.startsWith('svanvilt:')) continue;
      try { towerUnder(c, room.ev[k], t, env); } catch (e) { warn(e); }
    }
    c.restore();
  }

  // ---- hooks (as sovereign-fx.js: ours under the telegraph fills, and over the units)
  function hook() {
    if (typeof ArenaView === 'undefined' || ArenaView.__svAnvil) return;
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
    ArenaView.__svAnvil = 1;
  }
  hook();
  return { under, over, anvil, pip, pipRow };
})();
