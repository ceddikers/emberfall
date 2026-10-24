// The Lanternkeeper's lanterns on screen (kits.js LANTERN, host rules in fight.js LANTERNS). Drawing and bookkeeping
// only: your own lanterns come straight from your kit (smooth, no lag) and go to the host 10 times a second; everyone
// else's come from the host's 'lamps' list. Each lantern is a warm, faint disc of glow on the floor (a heal zone: amber,
// never red or blue, and kept faint so it never hides a telegraph: it is drawn under them) and a small iron lantern
// whose flame shrinks from tall gold to a red stub as its wick burns down. A hand lantern hangs beside its ally.
// The looks: a squat iron cage lantern (floor), a Great Beacon (an iron post with a brass-collared lantern head on a stone footing),
// a brass hand lantern swinging on a hook, a small votive in an iron cup (Lamplighter's Stride), a paper lantern bobbing in the air
// (Lantern Festival) and the Eternal Lamp (brass and glass, a pale flame that never dims, three motes circling). Inside each cage a
// wick shows, and it is the wick that burns down: its cord shortens, the flame sinks and goes from gold to amber to a red stub with a
// thread of smoke. The glow is a cached-sprite pool: cheap, faint (never above a tenth), amber, and under every telegraph.
const Lamps = (() => {
  const S = { mine: null, mineAt: -9, sentAt: -9, others: new Map() };
  const KIND = ['floor', 'beacon', 'hand', 'small', 'float', 'eternal'];

  function reset() { S.mine = null; S.others.clear(); }
  // your kit's report (kits.js lkShare), every kit tick
  function setMine(list, now) { S.mine = Array.isArray(list) ? list : null; S.mineAt = now; }
  function dueMine(now) {
    if (!S.mine || now - S.sentAt < 0.1) return false;
    S.sentAt = now; return true;
  }
  // the host's list: [[owner, [[x, y, r, w, k, on, ox, oy, all], ...]], ...]
  function onList(msg, me) {
    S.others.clear();
    for (const e of msg.l || []) {
      if (!Array.isArray(e) || e[0] === me || !Array.isArray(e[1])) continue;
      S.others.set(e[0], e[1].map(a => ({ x: a[0], y: a[1], r: a[2], w: a[3], k: a[4], on: a[5], ox: a[6], oy: a[7], all: a[8] })));
    }
  }
  // every lantern to draw: { x, y, r, w, kind, hung, all }
  function list(env, now) {
    const out = [];
    const add = (owner, l) => {
      let x = l.x, y = l.y, hung = false;
      if (l.on === 'c') {
        const us = (env.party || []).filter(Boolean);
        if (us.length) { x = us.reduce((s, u) => s + u.x, 0) / us.length + (l.ox || 0); y = us.reduce((s, u) => s + u.y, 0) / us.length + (l.oy || 0); }
        else { const o = env.entById(owner); if (!o) return; x = o.x + (l.ox || 0); y = o.y + (l.oy || 0); }
      } else if (l.on != null) {
        const e = env.entById(l.on === 'self' ? owner : l.on);
        if (!e) return;
        x = e.x; y = e.y; hung = true;
      }
      out.push({ x, y, r: l.r || 0, w: (l.w ?? 100) / 100, kind: KIND[l.k] || 'floor', hung, all: !!l.all });
    };
    if (S.mine && now - S.mineAt < 1) for (const l of S.mine) add(env.me, l);
    if (!env.town) for (const [pid, l] of S.others) for (const o of l) add(pid, o);
    return out;
  }
  // the colour of a flame by its wick: gold at full, amber, then a red stub
  function flameCol(w) { return w > 0.66 ? '#ffd27a' : w > 0.33 ? '#ffa94a' : w > 0.02 ? '#ff7a3a' : '#c8452a'; }
  const TAU2 = Math.PI * 2;
  const IRON = '#2b2620', IRON2 = '#4a4238', BRASS = '#b98f45', BRASS2 = '#e0b866', WICK = '#6a5848', WAX = '#d9c9a0', OUTL = 'rgba(14,10,8,0.9)';

  // the faint pool of light on the floor: a cached glow sprite squashed to the floor's slant (cheap), amber (a heal zone: never red or
  // blue), never above a tenth of opacity, and a thin warm edge so you can see where it ends. Drawn under the telegraphs
  function drawGlow(ctx, L, now) {
    if (L.r <= 0) return;
    const fl = 0.92 + Math.sin(now * 7 + L.x * 0.05) * 0.04 + Math.sin(now * 13 + L.y * 0.07) * 0.03;
    const a = (L.all ? 0.07 : 0.1) * (0.55 + 0.45 * L.w) * fl;
    ctx.save();
    ctx.translate(L.x, L.y); ctx.scale(1, 0.75);
    glow(ctx, 0, 0, L.r, '#ffc46b', a);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = `rgba(255,200,120,${(0.14 * (0.6 + 0.4 * L.w)).toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(L.x, L.y, L.r, L.r * 0.75, 0, 0, TAU2); ctx.stroke();
    ctx.restore();
  }
  // a small warm pool right at a lantern's foot (it sits on the floor, under the lantern itself)
  function pool(ctx, x, y, r, w) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.7); glow(ctx, 0, 0, r, '#ffc46b', 0.13 * (0.5 + 0.5 * w)); ctx.restore();
  }
  // a flame standing on the wick's tip at (x, y), h tall; a white heart in it while the wick is long
  function flameAt(ctx, x, y, h, wd, col, now, ph, hot) {
    const fl = 1 + Math.sin(now * 11 + ph) * 0.07 + Math.sin(now * 19 + ph * 2) * 0.05, sw = Math.sin(now * 5 + ph) * 0.7, hh = h * fl;
    glow(ctx, x, y - hh * 0.5, 6 + hh * 1.2, col, 0.45);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x + sw, y - hh); ctx.quadraticCurveTo(x + wd, y - hh * 0.4, x, y); ctx.quadraticCurveTo(x - wd, y - hh * 0.4, x + sw, y - hh); ctx.fill();
    if (hot) {
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath(); ctx.moveTo(x + sw * 0.6, y - hh * 0.62); ctx.quadraticCurveTo(x + wd * 0.5, y - hh * 0.2, x, y - 0.5); ctx.quadraticCurveTo(x - wd * 0.5, y - hh * 0.2, x + sw * 0.6, y - hh * 0.62); ctx.fill();
    }
  }
  // the thread of smoke off a wick that has burned out
  function smoke(ctx, x, y, now, ph) {
    ctx.save(); ctx.strokeStyle = 'rgba(160,150,140,0.5)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const q = (now * 0.6 + ph + i * 0.5) % 1;
      ctx.globalAlpha = (1 - q) * 0.6; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.sin(q * 6 + ph) * 3, y - 5 * q - 2, x + Math.sin(q * 5 + ph) * 4, y - 9 - 9 * q); ctx.stroke();
    }
    ctx.restore();
  }
  // the wick and its flame, standing in a lump of wax: the cord is long and the flame tall and gold when the wick is full; as it burns
  // down the cord shortens, the flame sinks and goes amber, then a red stub with smoke
  function wickAndFlame(ctx, x, y, s, w, col, now, ph, hot) {
    const wl = (0.6 + 4.6 * w) * s;
    ctx.fillStyle = WAX; ctx.beginPath(); ctx.ellipse(x, y, 2.6 * s, 1.1 * s, 0, 0, TAU2); ctx.fill();
    ctx.strokeStyle = WICK; ctx.lineWidth = Math.max(0.8, 0.9 * s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - wl); ctx.stroke();
    const tip = y - wl;
    if (w > 0.02) flameAt(ctx, x, tip, (2.5 + 7.5 * w) * s, (1.3 + 1.6 * w) * s, col, now, ph, hot && w > 0.34);
    else { flameAt(ctx, x, tip, 1.5 * s, 0.9 * s, col, now, ph, false); smoke(ctx, x, tip - 2 * s, now, ph); }
  }
  // the height of a cage lantern from its base to the top of its ring
  const cageH = (s, tall) => (2.5 + 12 * (tall || 1) + 10.6) * s;
  // an iron (or brass) cage lantern standing on (x, y): a base plate, a dark warm glass cage with the wax, wick and flame inside, bars, a
  // top rail, a domed roof and a ring. st: { w, now, ph, bars, trim, tall, all, noShadow }
  function cage(ctx, x, y, s, st) {
    const hgt = 12 * s * (st.tall || 1), hw = 5.6 * s, w = st.w, col = st.all ? '#fff0c8' : flameCol(w), top = y - 2.5 * s - hgt;
    if (!st.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 1, hw + 2.5, 2.8 * s, 0, 0, TAU2); ctx.fill(); }
    ctx.fillStyle = st.bars; ctx.strokeStyle = OUTL; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, hw + 1.2 * s, 2.6 * s, 0, 0, TAU2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(40,26,14,0.82)'; ctx.fillRect(x - hw, top, hw * 2, y - 2.5 * s - top);
    ctx.fillStyle = `rgba(255,170,70,${(0.14 + 0.2 * w).toFixed(3)})`; ctx.fillRect(x - hw, top, hw * 2, y - 2.5 * s - top);
    wickAndFlame(ctx, x, y - 4.2 * s, s, w, col, st.now, st.ph, true);
    ctx.strokeStyle = st.bars; ctx.lineWidth = 1.3 * Math.max(0.8, s); ctx.lineCap = 'butt';
    ctx.beginPath(); for (const bx of [-hw, -hw / 3, hw / 3, hw]) { ctx.moveTo(x + bx, y - 2.5 * s); ctx.lineTo(x + bx, top); } ctx.stroke();
    ctx.fillStyle = st.bars; ctx.fillRect(x - hw - 1 * s, top - 1.2 * s, 2 * hw + 2 * s, 2.4 * s);
    ctx.fillStyle = st.bars; ctx.strokeStyle = st.trim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - hw - 1.5 * s, top - 1.2 * s); ctx.quadraticCurveTo(x - hw * 0.5, top - 5.5 * s, x, top - 7 * s); ctx.quadraticCurveTo(x + hw * 0.5, top - 5.5 * s, x + hw + 1.5 * s, top - 1.2 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = st.trim; ctx.lineWidth = 1.3 * Math.max(0.8, s); ctx.beginPath(); ctx.arc(x, top - 8.4 * s, 2.2 * s, 0, TAU2); ctx.stroke();
  }

  function floorLamp(ctx, L, now, ph) {
    pool(ctx, L.x, L.y, 20, L.w);
    cage(ctx, L.x, L.y, 1, { w: L.w, now, ph, bars: IRON, trim: BRASS, all: L.all });
  }
  // a Great Beacon: an iron post on a stone footing, brass collars, struts, and a bigger lantern head
  function beaconLamp(ctx, L, now, ph) {
    const x = L.x, y = L.y;
    pool(ctx, x, y, 34, L.w);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 1.5, 11, 4, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#4a443c'; ctx.strokeStyle = OUTL; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 9, 3.6, 0, 0, TAU2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5c564b'; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 6.4, 2.4, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = IRON; ctx.fillRect(x - 1.9, y - 32, 3.8, 31);
    ctx.strokeStyle = IRON; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 1.5, y - 20); ctx.lineTo(x - 7, y - 31); ctx.moveTo(x + 1.5, y - 20); ctx.lineTo(x + 7, y - 31); ctx.stroke();
    ctx.fillStyle = BRASS; ctx.fillRect(x - 3.2, y - 11, 6.4, 2.4); ctx.fillRect(x - 3.2, y - 21, 6.4, 2.4); ctx.fillStyle = BRASS2; ctx.fillRect(x - 3.2, y - 11, 6.4, 0.9); ctx.fillRect(x - 3.2, y - 21, 6.4, 0.9);
    cage(ctx, x, y - 32, 1.35, { w: L.w, now, ph, bars: IRON, trim: BRASS2, tall: 1.15, all: L.all, noShadow: true });
  }
  // a brass hand lantern on a hook, beside whoever bears it, swinging a little
  function handLamp(ctx, L, now, ph) {
    const s = 0.82, H = cageH(s, 1), base = L.y - 22, hx = L.x + 17, hy = base - H, sway = Math.sin(now * 2.3 + ph) * 0.1 + Math.sin(now * 3.7 + ph * 2) * 0.03;
    ctx.strokeStyle = BRASS; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L.x + 6, L.y - 14); ctx.quadraticCurveTo(L.x + 9, hy - 6, hx, hy - 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy - 0.2, 1.6, 0, TAU2); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy + 1.4); ctx.rotate(sway); ctx.translate(0, H);
    cage(ctx, 0, 0, s, { w: L.w, now, ph, bars: '#6b5531', trim: BRASS2, all: L.all, noShadow: true });
    ctx.restore();
  }
  // a small light left behind by Lamplighter's Stride: a votive in an iron cup
  function smallLamp(ctx, L, now, ph) {
    const x = L.x, y = L.y;
    pool(ctx, x, y, 13, L.w);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 0.8, y + 0.8, 4.6, 1.8, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = IRON; ctx.strokeStyle = OUTL; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x - 3.8, y - 5); ctx.lineTo(x + 3.8, y - 5); ctx.lineTo(x + 2.7, y); ctx.lineTo(x - 2.7, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = BRASS; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3.9, y - 5); ctx.lineTo(x + 3.9, y - 5); ctx.stroke();
    wickAndFlame(ctx, x, y - 5.2, 0.8, L.w, L.all ? '#fff0c8' : flameCol(L.w), now, ph, true);
  }
  // a paper lantern bobbing in the air (Lantern Festival): warm paper over a flame, ribs, a cap and a tassel
  function floatLamp(ctx, L, now, ph) {
    const x = L.x, y = L.y - 30 + Math.sin(now * 1.6 + ph) * 2, w = L.w, dim = w > 0.33;
    glow(ctx, x, y, 17, '#ffb450', 0.28 * (0.5 + 0.5 * w));
    ctx.fillStyle = dim ? '#f2b46a' : '#c98a50'; ctx.strokeStyle = 'rgba(120,64,24,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 6.4, 7.4, 0, 0, TAU2); ctx.fill(); ctx.stroke();
    glow(ctx, x, y, 7, '#fff0c8', 0.55 * (0.5 + 0.5 * w));
    ctx.strokeStyle = 'rgba(120,64,24,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(x, y, 3.2, 7.4, 0, 0, TAU2); ctx.moveTo(x - 6.4, y); ctx.lineTo(x + 6.4, y); ctx.stroke();
    ctx.fillStyle = IRON; ctx.fillRect(x - 3, y - 8.4, 6, 2); ctx.fillRect(x - 3, y + 6.4, 6, 2);
    ctx.strokeStyle = '#a8483a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 8.4); ctx.lineTo(x + Math.sin(now * 3 + ph) * 1.2, y + 13); ctx.stroke();
    ctx.fillStyle = '#a8483a'; ctx.beginPath(); ctx.arc(x + Math.sin(now * 3 + ph) * 1.2, y + 13.4, 1.3, 0, TAU2); ctx.fill();
  }
  // the Eternal Lamp: brass and glass, a pale flame that never dims, three motes of light circling it
  function eternalLamp(ctx, L, now, ph) {
    const x = L.x, y = L.y;
    pool(ctx, x, y, 24, 1);
    cage(ctx, x, y, 1.15, { w: 1, now, ph, bars: '#6b5531', trim: BRASS2, all: true });
    for (let i = 0; i < 3; i++) {
      const a = now * 1.1 + i * TAU2 / 3, mx = x + Math.cos(a) * 11, my = y - 14 + Math.sin(a) * 4.5 - 4 + Math.sin(a * 2) * 1.5;
      glow(ctx, mx, my, 4.5, '#fff0c8', 0.7); ctx.fillStyle = '#fffbea'; ctx.beginPath(); ctx.arc(mx, my, 1, 0, TAU2); ctx.fill();
    }
  }
  function drawLamp(ctx, L, now) {
    const ph = L.x * 0.031 + L.y * 0.017;
    ctx.save();
    switch (L.kind) {
      case 'beacon': beaconLamp(ctx, L, now, ph); break;
      case 'hand': handLamp(ctx, L, now, ph); break;
      case 'small': smallLamp(ctx, L, now, ph); break;
      case 'float': floatLamp(ctx, L, now, ph); break;
      case 'eternal': eternalLamp(ctx, L, now, ph); break;
      default: floorLamp(ctx, L, now, ph);
    }
    ctx.restore();
  }
  // under the telegraphs: the glows, and the lanterns standing on the floor
  function drawFloor(ctx, now, env) {
    const all = list(env, now);
    for (const L of all) drawGlow(ctx, L, now);
    for (const L of all) if (!L.hung && L.kind !== 'float') drawLamp(ctx, L, now);
  }
  // over the heroes: lanterns hung on someone, and the floating ones
  function drawOver(ctx, now, env) {
    for (const L of list(env, now)) if (L.hung || L.kind === 'float') drawLamp(ctx, L, now);
  }
  return { S, reset, setMine, dueMine, onList, list, drawFloor, drawOver };
})();

if (typeof module !== 'undefined') module.exports = { Lamps };
