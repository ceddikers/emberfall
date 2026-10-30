// The Founding: the valley's loose things, drawing (sim-world.js). A layer on Founding.addLayer (see docs/plans/founding-pass3.md).
// Items that lie where they fell (a glow in the item's rarity colour with its icon on a plate; a right-click or a walk over it takes it;
// pointing at one shows the supply tent's item card), and the seven waystones (painted standing stones with a rune that glows once a hero
// has stood beside it; click a lit one, or press Shift+B anywhere, for the small picker that travels between lit stones and the camp).
// Props from the host: wd [[id, itemId, x, y, expiresAt (run clock, 0 never)]], wy (bit mask of lit stones). Events: wdrop wpk wfull wgone wsl.
// Everything outside the party's sight stays unseen (K.visAt); the minimap marks lit stones always, dark ones once seen, and drops in sight.
(function () {
  'use strict';
  if (typeof Founding === 'undefined' || typeof FoundingSim === 'undefined' || !FoundingSim.WORLD) return;
  const WD = FoundingSim.WORLD, TN = WD.TUNE, WAYS = WD.WAYS;
  const PI = Math.PI, TAU = PI * 2, OUT = '#1a130c', hyp = Math.hypot;
  let K = null;
  const S = () => K && K.S;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const seen = WAYS.map(() => false);        // the party has laid eyes on this stone (minimap)
  const flash = WAYS.map(() => -9);          // when it was lit, on the client clock
  const born = new Map();                    // drop id -> client time it first showed (the toss)
  const known = new Map(), goneAt = new Map();   // drop id -> its last row (for the pick-up flourish), and when its row left the props
  const imgs = new Map();
  let snapT = 0, snapTm = 0, litWas = 0, hover = null, pending = null, ui = null, panelSig = '';

  const cv = () => (K.dep && K.dep.canvas) || document.getElementById('game');   // (the kit's dep is taken at load, before the game hands it over)
  const now = () => { const s = S(); return snapTm + (s.T - snapT); };
  const D = () => K.D;
  const rcOf = it => D().RARITY_COLORS[it.rar] || '#b9b2a2';
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
  const myHero = () => { const s = S(); return s && s.sheet ? s.sheet.hero : null; };
  const litMask = () => (S().props.wy | 0);
  const isLit = i => !!(litMask() & (1 << i));
  const keyLbl = id => { const KB = typeof Keybinds !== 'undefined' ? Keybinds : null; return (KB && KB.label && KB.keyFor ? KB.label(KB.keyFor(id)) : null) || 'B'; };
  const rcLeft = () => { const s = S(), sh = s && s.sheet; return sh && sh.rc > 0 ? Math.max(0, sh.rc - (s.T - s.sheetT)) : 0; };
  const icon = id => {
    let o = imgs.get(id);
    if (!o) {
      o = { img: new Image(), ok: false }; imgs.set(id, o);
      try { const it = D().ITEM[id]; o.img.onload = () => { o.ok = true; }; o.img.src = FoundingUI.icons.item(id, it); } catch (e) { /* no icon: the plate is enough */ }
    }
    return o.ok ? o.img : null;
  };

  // ---------------------------------------------------------------- the things on the ground
  function alphaOf(d, t) {
    if (!d[4]) return 1;
    const left = d[4] - t;
    if (left <= 0) return clamp(1 - (-left) / TN.fade, 0, 1);
    if (left < TN.blink) { const f = 4 + (1 - left / TN.blink) * 10; return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(S().T * f)); }
    return 1;
  }
  function drawDrop(c, d, t, near) {
    const s = S(), it = D().ITEM[d[1]]; if (!it) return;
    const col = rcOf(it), rgb = hexRgb(col), T = s.T, mine = !it.hero || it.hero === myHero();
    if (!born.has(d[0])) born.set(d[0], T);
    const age = T - born.get(d[0]), toss = age < 0.55 ? Math.sin(age / 0.55 * PI) * 20 * (1 - age / 0.55 * 0.4) : 0, grow = age < 0.25 ? 0.5 + age * 2 : 1;
    const a = alphaOf(d, t) * (mine ? 1 : 0.6), x = d[2], y = d[3], bob = Math.sin(T * 2.6 + d[0]) * 2 + 3;
    c.save(); c.globalAlpha = a;
    // the soft glow on the ground, and a thin shadow under the plate
    const pulse = 0.82 + 0.18 * Math.sin(T * 3 + d[0] * 1.7);
    c.save(); c.translate(x, y + 3); c.scale(1, 0.5); const gr = c.createRadialGradient(0, 0, 2, 0, 0, 40 * grow); gr.addColorStop(0, `rgba(${rgb},${0.62 * pulse})`); gr.addColorStop(0.5, `rgba(${rgb},${0.22 * pulse})`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 40 * grow, 0, TAU); c.fill(); c.restore();
    K.ell(c, x, y + 4, 12 * grow, 4.4 * grow, 0, 'rgba(0,0,0,.35)', null);
    // motes drifting up from the better ones
    if (it.rar >= 2) for (let i = 0; i < it.rar - 1; i++) { const ph = (T * 0.55 + i / (it.rar - 1) + d[0] * 0.13) % 1; K.ell(c, x + Math.sin(ph * 7 + i * 2 + d[0]) * 9, y - 8 - ph * 40, 1.6, 1.6, 0, `rgba(${rgb},${(1 - ph) * 0.9})`, null); }
    // the plate with the icon
    const py = y - 16 - bob - toss, R = 15 * grow;
    c.beginPath(); c.arc(x, py, R + 1.6, 0, TAU); c.fillStyle = 'rgba(12,9,6,.9)'; c.fill();
    c.lineWidth = 2.2; c.strokeStyle = col; c.stroke();
    K.ell(c, x, py, R - 2, R - 2, 0, `rgba(${rgb},.16)`, null);
    const im = icon(d[1]); if (im) c.drawImage(im, x - 13 * grow, py - 13 * grow, 26 * grow, 26 * grow);
    if (hover && hover.kind === 'drop' && hover.d === d) { c.lineWidth = 1.4; c.strokeStyle = '#fff'; c.globalAlpha = a * 0.9; c.beginPath(); c.arc(x, py, R + 4.5, 0, TAU); c.stroke(); c.globalAlpha = a; }
    // whose it is, when it is one hero's
    if (it.hero) { const hc = FoundingUI.icons.HERO_COL[it.hero] || '#c9a45c'; c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, py + R + 3); c.lineTo(x + 5, py + R + 8); c.lineTo(x, py + R + 13); c.lineTo(x - 5, py + R + 8); c.closePath(); c.fill(); c.stroke(); }
    // its name, when the party is close or it is pointed at
    if (near || (hover && hover.d === d)) { c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; c.fillStyle = col; c.strokeText(it.name, x, py - R - 7); c.fillText(it.name, x, py - R - 7); }
    c.restore();
  }

  // ---------------------------------------------------------------- the waystones
  // a standing slab from its base centre: width, height, lean; a little lighter on the left, darker on the right
  function slab(c, w, h, lean, key, lit) {
    c.save(); c.rotate(lean);
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#9a968a'); g.addColorStop(0.5, '#716e65'); g.addColorStop(1, '#46443e');
    const pts = [[-w / 2, 0], [-w / 2 - 2, -h * 0.42], [-w * 0.34, -h * 0.9], [-w * 0.06, -h], [w * 0.32, -h * 0.94], [w / 2 + 1, -h * 0.5], [w / 2, 0]];
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    c.fillStyle = g; c.fill(); c.lineWidth = 2.4; c.lineJoin = 'round'; c.strokeStyle = OUT; c.stroke();
    // the lit top facet and a seam or two
    c.beginPath(); c.moveTo(-w * 0.34, -h * 0.9); c.lineTo(-w * 0.06, -h); c.lineTo(w * 0.32, -h * 0.94); c.lineTo(w * 0.1, -h * 0.82); c.closePath(); c.fillStyle = 'rgba(255,255,240,.16)'; c.fill();
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(30,28,24,.55)'; c.beginPath(); c.moveTo(-w * 0.16, -h * 0.34); c.lineTo(-w * 0.05, -h * 0.5); c.lineTo(-w * 0.2, -h * 0.66); c.stroke();
    c.beginPath(); c.moveTo(w * 0.18, -h * 0.2); c.lineTo(w * 0.08, -h * 0.34); c.stroke();
    // lichen low down
    for (let i = 0; i < 3; i++) K.ell(c, -w * 0.3 + hash(key, i) * w * 0.6, -3 - hash(key, i + 9) * h * 0.2, 4 + hash(key, i + 3) * 4, 2 + hash(key, i + 5) * 2, 0, 'rgba(98,120,76,.55)', null);
    c.restore();
  }
  // the rune: a ring with a staff and a chevron (a road and a way)
  function rune(c, cx, cy, s, col, w) {
    c.save(); c.translate(cx, cy); c.scale(s, s); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, -17); c.lineTo(0, -11); c.moveTo(0, 11); c.lineTo(0, 19); c.moveTo(-7, -3); c.lineTo(0, 5); c.lineTo(7, -3); c.stroke();
    c.restore();
  }
  function drawStone(c, i, near) {
    const s = S(), W = WAYS[i], x = W.x, y = W.y, T = s.T, lit = isLit(i), fl = clamp(1 - (T - flash[i]) / 1.6, 0, 1);
    const glow = lit ? 0.8 + 0.2 * Math.sin(T * 2.2 + i) + fl * 0.5 : 0;
    c.save(); c.translate(x, y);
    // the shadow, and the ring of fallen stones
    K.ell(c, 6, 8, 74, 21, 0, 'rgba(0,0,0,.30)', null);
    if (lit) { c.save(); c.scale(1, 0.34); const g = c.createRadialGradient(0, 14, 4, 0, 14, 96); g.addColorStop(0, `rgba(255,190,90,${0.42 * glow})`); g.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 14, 96, 0, TAU); c.fill(); c.restore(); }
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * TAU + hash(i, k) * 0.4, rx = 58 + hash(i, k + 20) * 8, bx = Math.cos(a) * rx, by = 6 + Math.sin(a) * rx * 0.3;
      if (by < 4 && Math.abs(bx) < 30) continue;
      K.ell(c, bx, by, 6 + hash(i, k + 40) * 5, 3 + hash(i, k + 60) * 2.4, hash(i, k) * 0.6 - 0.3, '#6d6a61', OUT, 1.3);
      K.ell(c, bx - 1, by - 1.4, 3, 1.2, 0, 'rgba(255,255,240,.18)', null);
    }
    // the flanking stones, then the tall one in front
    c.save(); c.translate(-42, 3); slab(c, 25, 62, -0.1, i * 3 + 1, lit); c.restore();
    c.save(); c.translate(40, 5); slab(c, 22, 46, 0.13, i * 3 + 2, lit); c.restore();
    c.save(); c.translate(0, 8); slab(c, 46, 120, 0.015, i * 3, lit); c.restore();
    // the rune on the tall stone's face
    const ry = -64;
    if (!lit) {
      rune(c, 1, ry + 1.2, 1, 'rgba(180,176,160,.30)', 2.4); rune(c, 0, ry, 1, '#2b2924', 2.6);
    } else {
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, ry, 2, 0, ry, 62); g.addColorStop(0, `rgba(255,190,90,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, ry, 62, 0, TAU); c.fill(); c.restore();
      c.save(); c.shadowColor = 'rgba(255,170,60,1)'; c.shadowBlur = 10 + 8 * glow; rune(c, 0, ry, 1, '#ffe3a3', 2.8); c.restore();
      // the seam above the rune glows too
      c.save(); c.globalAlpha = 0.5 * glow; c.strokeStyle = '#ffcf7a'; c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, -48 - 52); c.lineTo(2, -62 - 52); c.lineTo(-9, -78 - 52); c.stroke(); c.restore();
      for (let k = 0; k < 4; k++) { const ph = (T * 0.32 + k * 0.25 + hash(i, k) * 0.1) % 1; K.ell(c, Math.sin(ph * 6 + k * 1.7 + i) * 14, -118 - ph * 52, 1.8, 1.8, 0, `rgba(255,214,140,${(1 - ph) * 0.85})`, null); }
      if (fl > 0) { const r = 20 + (1 - fl) * 150; K.ell(c, 0, 10, r, r * 0.3, 0, null, `rgba(255,220,150,${fl * 0.85})`, 2.5); }
    }
    // the name, when the party stands near or points at it
    if (near || (hover && hover.kind === 'stone' && hover.i === i)) { c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.85)'; c.fillStyle = lit ? '#f3dfa4' : '#a8a291'; const nm = lit ? W.name : 'Waystone'; c.strokeText(nm, 0, 30); c.fillText(nm, 0, 30); }
    c.restore();
  }

  // ---------------------------------------------------------------- what the mouse is over, and the tooltip that follows it
  const mouseWorld = () => { const s = S(), m = s.mouse, cam = s.cam; return [cam.x + (m.sx - K.W() / 2) / cam.zoom, cam.y + (m.sy - K.H() / 2) / cam.zoom]; };
  function enemyUnder(wx, wy) { for (const u of S().units.values()) if (u.kind === 'e' && !(u.f & K.FLAG.DEAD) && u.fogT !== 0 && hyp(u.x - wx, u.y - wy) < (u.def ? u.def.r : 12) + 6) return true; return false; }
  function pickAt(wx, wy) {
    const s = S(), P = s.props, t = now(); let best = null, bd = 1e9;
    for (const d of P.wd || []) {
      if (d[4] && t > d[4]) continue;
      const dd = hyp(d[2] - wx, d[3] - 16 - wy); if (dd < 24 && dd < bd && K.visAt(d[2], d[3], 12)) { bd = dd; best = { kind: 'drop', d }; }
    }
    if (best) return best;
    for (let i = 0; i < WAYS.length; i++) { const W = WAYS[i]; if (Math.abs(wx - W.x) < 52 && wy > W.y - 128 && wy < W.y + 20 && K.visAt(W.x, W.y, 40)) return { kind: 'stone', i }; }
    return null;
  }
  function tipHtml() {
    if (!hover) return '';
    const s = S(), D_ = D();
    if (hover.kind === 'drop') {
      const it = D_.ITEM[hover.d[1]]; if (!it) return '';
      const sh = s.sheet, full = sh && sh.it.every(Boolean), mine = !it.hero || (sh && it.hero === sh.hero), hn = it.hero && D_.KITS[it.hero] ? D_.KITS[it.hero].name : '';
      let foot;
      if (!mine) foot = `<div class="dt-n"><b>Made for the ${hn}.</b> Only a ${hn} can take it.</div>`;
      else if (full) foot = '<div class="dt-f"><em class="no">Your pack is full.</em></div>';
      else foot = '<div class="dt-f"><em class="go">Right-click it, or walk over it</em></div>';
      const left = hover.d[4] ? hover.d[4] - now() : 999;
      if (left < 45 && left > 0) foot += '<div class="dt-n">It will not lie here much longer.</div>';
      return FoundingUI.itemDetail ? FoundingUI.itemDetail(it, foot) : `<b>${it.name}</b>`;
    }
    const W = WAYS[hover.i], lit = isLit(hover.i);
    if (!lit) return '<b>A waystone</b><em>Dark</em>An old stone, cold under the hand. Stand beside it and it wakes, for the whole party.';
    return `<b>${W.name}</b><em>Waystone &middot; lit</em>${W.note}<div class="fd-t-n">Click it, or press Shift+${keyLbl('fdRecall')} anywhere, to travel between the lit stones and the camp.</div>`;
  }

  // ---------------------------------------------------------------- the DOM: the hit box that carries the tooltip, and the picker
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style'); st.id = 'fd-world-css';
    st.textContent = `
#fd-world-hit { position: fixed; display: none; pointer-events: auto; cursor: pointer; z-index: 0; }
#fd-ways { left: 50%; top: 17%; transform: translateX(-50%); width: 320px; padding: 0 14px 12px; z-index: 3; background: linear-gradient(#1b1713f8, #13100df8); }
#fd-ways .wh { display: flex; align-items: center; gap: 8px; margin: 0 -14px 10px; padding: 9px 12px 9px 14px; background: linear-gradient(#262016, #1a150e); border-bottom: 1px solid var(--fd-line); border-radius: 3px 3px 0 0; }
#fd-ways .wh b { font: 600 15px var(--fd-fantasy); letter-spacing: .12em; color: var(--fd-gold-hi); }
#fd-ways .wh span { color: var(--fd-muted); font-size: 13px; flex: 1; text-align: right; }
#fd-ways .wn { color: var(--fd-muted); font-size: 13.5px; line-height: 1.4; margin: 0 1px 9px; }
#fd-ways .wl { display: flex; flex-direction: column; gap: 4px; }
#fd-ways .wr { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font: 500 14px var(--fd-body); color: var(--fd-ink); background: var(--fd-panel2); border: 1px solid var(--fd-line); border-radius: 3px; padding: 7px 10px; cursor: pointer; transition: border-color .12s, background .12s, color .12s; }
#fd-ways .wr svg { width: 18px; height: 18px; flex: none; color: var(--fd-gold); }
#fd-ways .wr .nm { flex: 1; font-size: 14.5px; }
#fd-ways .wr .st { font-size: 12.5px; color: var(--fd-muted); }
#fd-ways .wr:hover:not(:disabled) { border-color: var(--fd-gold); background: #261f14; } #fd-ways .wr:hover:not(:disabled) .nm { color: #fff; }
#fd-ways .wr:active:not(:disabled) { transform: translateY(1px); }
#fd-ways .wr:focus-visible { outline: 1px solid var(--fd-gold-hi); outline-offset: 2px; }
#fd-ways .wr:disabled { opacity: .5; cursor: default; }
#fd-ways .wr.camp svg { color: #d9703a; }
#fd-ways .wf { color: var(--fd-muted); font-size: 13px; margin: 10px 1px 0; padding-top: 8px; border-top: 1px solid var(--fd-line-soft); line-height: 1.4; display: flex; justify-content: space-between; gap: 10px; }
#fd-ways .wf em { font-style: normal; color: var(--fd-gold); }
body:not(.in-founding) #fd-ways, body:not(.in-founding) #fd-world-hit { display: none !important; }`;
    document.head.appendChild(st);
  }
  const RUNE_SVG = '<svg viewBox="-14 -20 28 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle r="11"/><path d="M0 -19V-11M0 11V19M-7 -3L0 5L7 -3"/></svg>';
  function ensureUi() {
    const root = document.getElementById('fd-root'); if (!root) return null;
    if (ui && ui.hit.parentNode === root) return ui;
    css();
    const hit = document.createElement('div'); hit.id = 'fd-world-hit';
    const panel = document.createElement('div'); panel.id = 'fd-ways'; panel.className = 'fd-pn'; panel.style.display = 'none';
    root.insertBefore(hit, root.firstChild); root.appendChild(panel);
    if (typeof Tip !== 'undefined') Tip.set(hit, tipHtml);
    hit.addEventListener('contextmenu', e => e.preventDefault());
    hit.addEventListener('mousemove', e => { const s = S(), r = cv().getBoundingClientRect(); s.mouse.sx = e.clientX - r.left; s.mouse.sy = e.clientY - r.top; const w = mouseWorld(); s.mouse.wx = w[0]; s.mouse.wy = w[1]; });
    hit.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); if (hover) activate(hover); });
    hit.addEventListener('wheel', e => { e.preventDefault(); cv().dispatchEvent(new WheelEvent('wheel', e)); }, { passive: false });
    panel.addEventListener('mousedown', e => e.stopPropagation()); panel.addEventListener('contextmenu', e => e.preventDefault());
    panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    panel.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('x')) { closePicker(); return; }
      if (b.classList.contains('wr') && !b.disabled) { K.send({ k: 'wtravel', to: +b.dataset.to }); K.snd('ui-open'); closePicker(); }
    });
    ui = { hit, panel };
    return ui;
  }
  function activate(h) {
    const s = S();
    if (h.kind === 'drop') {
      const it = D().ITEM[h.d[1]], sh = s.sheet; if (!it || !sh) return;
      if (it.hero && it.hero !== sh.hero) { K.say('That was made for the ' + D().KITS[it.hero].name); return; }
      if (sh.it.every(Boolean)) { K.say('Your pack is full'); return; }
      K.send({ k: 'pick', id: h.d[0] }); s.marker = { x: h.d[2], y: h.d[3], t: 0 };
      return;
    }
    const W = WAYS[h.i], m = K.me(); if (!m) return;
    if (!isLit(h.i)) { K.say('A cold stone. Walk up to it and it wakes'); K.send({ k: 'move', x: W.x + 48, y: W.y + 34 }); s.marker = { x: W.x + 48, y: W.y + 34, t: 0 }; return; }
    if (hyp(m.x - W.x, m.y - W.y) <= 260) { openPicker(); return; }
    pending = { t0: s.T, i: h.i }; K.send({ k: 'move', x: W.x + 48, y: W.y + 34 }); s.marker = { x: W.x + 48, y: W.y + 34, t: 0 };
  }

  function pickerHtml() {
    const s = S(), m = K.me(), sp = K.M.P.spring, mask = litMask(), cd = Math.ceil(rcLeft()), busy = s.rc.has(s.myId);
    const home = !!m && hyp(m.x - sp[0], m.y - sp[1]) < 140, off = busy || cd > 0;
    const row = (to, nm, note, here, camp) => `<button type="button" class="wr${camp ? ' camp' : ''}" data-to="${to}" data-tip="${note}"${here || off ? ' disabled' : ''}>${RUNE_SVG}<span class="nm">${nm}</span><span class="st">${here ? 'You are here' : ''}</span></button>`;
    let rows = row(-1, 'The Camp', 'The spring, the Hearth and the supply tent.', home, true), n = 0;
    WAYS.forEach((W, i) => { if (!(mask & (1 << i))) return; n++; rows += row(i, W.name, W.note, !!m && hyp(m.x - W.x, m.y - W.y) < TN.near, false); });
    const foot = busy ? '<em>Gathering the way...</em>' : cd > 0 ? `<em>Ready in ${cd} s</em>` : `<span>Hold still ${TN.secs} s; a blow breaks it.</span>`;
    return `<div class="wh"><b>WAYSTONES</b><span>${n} of ${WAYS.length} lit</span><button type="button" class="x" aria-label="Close" data-tip="Close (Esc)">×</button></div>
      <div class="wn">${n ? 'Pick where to go. The channel is the same as a Recall.' : 'No stone is awake yet. Walk up to one and stand beside it.'}</div><div class="wl">${rows}</div>
      <div class="wf">${foot}<span>Shift+${keyLbl('fdRecall')} anywhere</span></div>`;
  }
  const pickerOpen = () => !!ui && ui.panel.style.display !== 'none';
  function openPicker() {
    const u = ensureUi(); if (!u) return;
    u.panel.style.display = ''; panelSig = ''; refreshPicker(true); K.snd('ui-open');
  }
  function closePicker() { if (ui) ui.panel.style.display = 'none'; pending = null; panelSig = ''; if (typeof Tip !== 'undefined' && Tip.hide) Tip.hide(); }
  function refreshPicker(force) {
    if (!pickerOpen()) return;
    const s = S(), m = K.me();
    const sig = [litMask(), Math.ceil(rcLeft()), s.rc.has(s.myId) ? 1 : 0, m ? Math.round(m.x / 40) + ',' + Math.round(m.y / 40) : ''].join('|');
    if (!force && sig === panelSig) return;
    panelSig = sig; ui.panel.innerHTML = pickerHtml();
  }
  if (typeof window !== 'undefined') window.addEventListener('keydown', e => { if (e.key === 'Escape' && pickerOpen()) { closePicker(); e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  // ---------------------------------------------------------------- the layer
  const LAYER = {
    init(kit) { K = kit; },
    snap(m) { const s = S(); snapT = s.T; snapTm = m.tm; },
    event(ev) {
      const tag = ev[0], s = S();
      if (tag === 'wdrop') {
        const it = K.D.ITEM[ev[4]]; if (!it) return true;
        if (K.visAt(ev[2], ev[3], 40)) { const rgb = hexRgb(rcOf(it)); K.burst(ev[2], ev[3] - 6, 4 + it.rar * 2, { color: rcOf(it), spd: 60, dur: 0.5, size: 2.2, kind: 'dot', vy: -50, g: 120 }); if (it.rar >= 2) K.fxRing(ev[2], ev[3], 6, 38 + it.rar * 5, 0.7, rgb, 2, 0); K.sndAt('fd-loot-land', ev[2], ev[3], { vol: 0.4, key: 'fd-wdrop', minGap: 0.15 }); }
        return true;
      }
      if (tag === 'wpk') { const d = known.get(ev[1]); if (d) { const it = K.D.ITEM[d[1]]; if (it && K.visAt(d[2], d[3], 30)) K.burst(d[2], d[3] - 14, 6, { color: rcOf(it), spd: 70, dur: 0.45, size: 2, kind: 'dot', vy: -40 }); known.delete(ev[1]); } born.delete(ev[1]); return true; }
      if (tag === 'wgone') { known.delete(ev[1]); born.delete(ev[1]); return true; }
      if (tag === 'wfull') { if (ev[1] === s.myId) K.say('Your pack is full'); return true; }
      if (tag === 'wsl') {
        const W = WAYS[ev[1]]; if (!W) return true;
        flash[ev[1]] = s.T; seen[ev[1]] = true;
        K.fxRing(W.x, W.y + 6, 14, 150, 0.9, '255,200,120', 3, 0); K.burst(W.x, W.y - 60, 14, { color: '#ffd68a', spd: 90, dur: 1.0, size: 2.4, kind: 'dot', vy: -70, g: -40 });
        if (K.visAt(W.x, W.y, 120)) { K.sndAt('fd-waystone-wake', W.x, W.y, { vol: 0.9, key: 'fd-wsl', minGap: 0.3, reach: 1.5 }); K.shake(2, 0.2); }
        K.ftxt(W.x, W.y - 138, W.name + ' wakes', '#f3dfa4', 13, 2.2);
        K.say('The ' + W.name + ' wakes. The party can travel to it'); if (pickerOpen()) refreshPicker(true);
        return true;
      }
      return false;
    },
    update() {
      const s = S(); if (!s || s.phase !== 'live') { if (pickerOpen()) closePicker(); hover = null; if (ui) ui.hit.style.display = 'none'; return; }
      const u = ensureUi(), t = now(), P = s.props, m = K.me();
      WAYS.forEach((W, i) => { if (!seen[i] && K.visAt(W.x, W.y, 50)) seen[i] = true; });
      const cur = new Set(); for (const d of P.wd || []) { known.set(d[0], d); cur.add(d[0]); goneAt.delete(d[0]); }
      for (const id of known.keys()) if (!cur.has(id)) { if (!goneAt.has(id)) goneAt.set(id, s.T); else if (s.T - goneAt.get(id) > 2) { known.delete(id); goneAt.delete(id); born.delete(id); } }   // (a taken drop's row lingers a moment for its flourish)
      if (litMask() !== litWas) litWas = litMask();
      if (pending) {
        const W = WAYS[pending.i];
        if (!m || s.T - pending.t0 > 12) pending = null; else if (hyp(m.x - W.x, m.y - W.y) < 200) { pending = null; openPicker(); }
      }
      refreshPicker(false);
      // what the mouse is over (not through a panel, not when an enemy stands under it)
      hover = null;
      if (u && !s.aim && !s.ended && !s.end) {
        const w = mouseWorld(); if (!enemyUnder(w[0], w[1])) hover = pickAt(w[0], w[1]);
      }
      if (u) {
        if (!hover) { if (u.hit.style.display !== 'none') u.hit.style.display = 'none'; }
        else {
          const r = cv().getBoundingClientRect(), z = s.cam.zoom;
          let cx, cy, w, h;
          if (hover.kind === 'drop') { cx = hover.d[2]; cy = hover.d[3] - 16; w = 46; h = 54; } else { const W = WAYS[hover.i]; cx = W.x; cy = W.y - 58; w = 104; h = 142; }
          const sx = r.left + (cx - s.cam.x) * z + K.W() / 2 - w * z / 2, sy = r.top + (cy - s.cam.y) * z + K.H() / 2 - h * z / 2;
          const st = u.hit.style; st.display = 'block'; st.left = Math.round(sx) + 'px'; st.top = Math.round(sy) + 'px'; st.width = Math.round(w * z) + 'px'; st.height = Math.round(h * z) + 'px';
        }
      }
    },
    ground(c, inV) {
      const s = S(), P = s.props; if (!P.wd || !P.wd.length) return;
      const t = now(), m = K.me();
      for (const d of P.wd) {
        if (!inV(d[2], d[3]) || !K.visAt(d[2], d[3], 14)) continue;
        drawDrop(c, d, t, !!m && hyp(m.x - d[2], m.y - d[3]) < 230);
      }
    },
    units(L, inV) {
      const m = K.me();
      WAYS.forEach((W, i) => {
        if (!inV(W.x, W.y) || !K.visAt(W.x, W.y, 50)) return;
        L.push([W.y + 20, 9, { draw: c => drawStone(c, i, !!m && hyp(m.x - W.x, m.y - W.y) < 260) }]);
      });
    },
    lights(add) { WAYS.forEach((W, i) => { if (isLit(i)) add(W.x, W.y - 50, 66, 0.55); }); },
    click(wx, wy, button) {
      if (pickerOpen() && button !== 2) closePicker();
      if (button !== 2 && button !== 0) return false;
      if (K.S.aim) return false;
      if (enemyUnder(wx, wy)) return false;
      const h = pickAt(wx, wy); if (!h) return false;
      if (h.kind === 'drop' && button !== 2) return false;
      activate(h); return true;
    },
    key(act, ev) {
      if (act === 'fdRecall' && ev.shiftKey) { if (!ev.repeat) { if (pickerOpen()) closePicker(); else openPicker(); } return true; }
      return false;
    },
    mini(g, kx, ky) {
      const s = S(), t = s.T, P = s.props;
      WAYS.forEach((W, i) => {
        const lit = isLit(i); if (!lit && !seen[i]) return;
        const x = W.x * kx, y = W.y * ky;
        g.save(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - 5.5); g.lineTo(x + 4, y); g.lineTo(x, y + 5.5); g.lineTo(x - 4, y); g.closePath();
        if (lit) { const p = 0.75 + 0.25 * Math.sin(t * 3 + i); g.fillStyle = `rgba(255,205,120,${p})`; g.strokeStyle = '#000'; g.fill(); g.stroke(); }
        else { g.fillStyle = 'rgba(30,26,20,.7)'; g.strokeStyle = 'rgba(190,184,168,.75)'; g.fill(); g.stroke(); }
        g.restore();
      });
      if (P.wd) for (const d of P.wd) { const it = K.D.ITEM[d[1]]; if (!it || !K.visAt(d[2], d[3], 12)) continue; g.fillStyle = rcOf(it); g.strokeStyle = '#000'; g.lineWidth = 0.8; g.beginPath(); g.arc(d[2] * kx, d[3] * ky, 2.3, 0, TAU); g.fill(); g.stroke(); }
    },
  };
  Founding.addLayer(LAYER);
})();
