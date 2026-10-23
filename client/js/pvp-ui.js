// PvP Arena (phase B): the client side. The Arena building in town (PvpView.drawBuilding, on the static town layer),
// the ring's floor (PvpView.drawRing), the lobby panel, the match HUD and the result card (PvpUI).
// main.js owns the scene: a match runs in the 'arena' scene with raid.pvp set (see startPvp / enterPvp there). Nothing
// here runs unless the Arena is opened or a match is on. Design note: docs/plans/2026-10-pvp-arena.md.

const PvpView = {
  // a small stone fighting pit: an oval of tiered seats round a sand floor, a gatehouse on the north rim (its door
  // faces the Training Yard), pennants in the two sides' colours
  drawBuilding(g, A) {
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 6, rx = A.w / 2 - 4, ry = A.h / 2 - 12;
    g.save();
    ellipse(g, cx + 10, cy + 16, rx + 4, ry + 6, 0, 'rgba(0,0,0,0.28)');
    // the outer wall: its face (the south half shows in this view), then the top of the rim
    ellipse(g, cx, cy + 16, rx, ry, 0, '#8f8370', OUT, 2.5);
    g.save(); g.beginPath(); g.ellipse(cx, cy + 16, rx, ry, 0, 0, Math.PI); g.clip();
    for (let k = -4; k <= 4; k++) {   // arches round the face
      const ax = cx + k * rx * 0.2, ay = cy + 16 + Math.sqrt(Math.max(0, 1 - (k * 0.2) ** 2)) * ry - 12;
      rrect(g, ax - 7, ay - 6, 14, 16, [7, 7, 0, 0], '#3a3024', OUT, 1.2);
    }
    g.restore();
    ellipse(g, cx, cy, rx, ry, 0, '#b8aa8e', OUT, 2.5);
    // tiers of stone seats
    ellipse(g, cx, cy + 2, rx - 12, ry - 9, 0, '#a39478', 'rgba(0,0,0,0.25)', 1.5);
    ellipse(g, cx, cy + 4, rx - 24, ry - 18, 0, '#968769', 'rgba(0,0,0,0.25)', 1.5);
    ellipse(g, cx, cy + 6, rx - 36, ry - 27, 0, '#7d6f55', OUT, 2);
    // the sand: raked, scuffed, a ring drawn in it
    ellipse(g, cx, cy + 7, rx - 42, ry - 31, 0, '#d8bf8a');
    ellipse(g, cx, cy + 7, rx - 60, ry - 43, 0, null, 'rgba(120,90,50,0.45)', 1.5);
    const r = rng(7);
    for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()); circle(g, cx + Math.cos(a) * d * (rx - 46), cy + 7 + Math.sin(a) * d * (ry - 34), 0.8 + r() * 1.2, r() < 0.5 ? 'rgba(140,105,60,0.45)' : 'rgba(250,235,200,0.5)'); }
    line(g, cx - 18, cy + 7, cx + 18, cy + 7, 'rgba(120,90,50,0.35)', 1.2);
    // posts with pennants on the rim: gold on the west, ash on the east
    for (const [k, col] of [[-0.8, '#e8c15a'], [-0.45, '#e8c15a'], [0.45, '#9fb4c8'], [0.8, '#9fb4c8']]) {
      const px = cx + k * rx, py = cy + Math.sqrt(1 - k * k) * ry * 0.98 - 2;
      line(g, px, py, px, py - 26, '#4a3a28', 2.5);
      poly(g, [px, py - 26, px + (k < 0 ? -16 : 16), py - 21, px, py - 16], col, OUT, 1.2);
    }
    // the gatehouse on the north rim, door toward the yard
    const gx = cx, gy = A.y + 10;
    rrect(g, gx - 30, gy - 6, 60, 34, 3, '#a89a80', OUT, 2.5);
    for (let k = 0; k < 5; k++) rrect(g, gx - 30 + k * 13, gy - 13, 8, 9, 1.5, '#a89a80', OUT, 1.5);
    rrect(g, gx - 12, gy + 4, 24, 24, [12, 12, 0, 0], '#2e2418', OUT, 2);
    for (let k = -1; k <= 1; k++) line(g, gx + k * 6, gy + 8, gx + k * 6, gy + 28, '#6a5a44', 1.5);   // the portcullis
    line(g, gx - 11, gy + 15, gx + 11, gy + 15, '#6a5a44', 1.5);
    glow(g, gx - 22, gy + 8, 12, '#ffcf6a', 0.4); glow(g, gx + 22, gy + 8, 12, '#ffcf6a', 0.4);
    circle(g, gx - 22, gy + 8, 2.5, '#ffd98a'); circle(g, gx + 22, gy + 8, 2.5, '#ffd98a');
    // the name on the face
    g.font = '700 14px Cinzel, Georgia, serif';
    const tw = g.measureText('The Arena').width + 30;
    rrect(g, cx - tw / 2, cy + ry + 2, tw, 24, 5, '#3a2a1a', '#c9a65a', 2);
    g.fillStyle = '#f0d48a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('The Arena', cx, cy + ry + 14);
    g.restore();
  },

  // the ring in a match: packed sand inside a low stone kerb, the two gates' marks where the sides start
  drawRing(ctx, now) {
    const R = ARENA.r || 380;
    ctx.save();
    const grd = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R + 160);
    grd.addColorStop(0, '#3a2c1c'); grd.addColorStop(0.7, '#21180f'); grd.addColorStop(1, '#0e0a07');
    circle(ctx, 0, 0, R + 160, grd);
    // the stands: dark tiers beyond the kerb
    for (let k = 3; k >= 1; k--) circle(ctx, 0, 0, R + 18 + k * 30, null, 'rgba(160,140,110,' + (0.05 + k * 0.03) + ')', 18);
    circle(ctx, 0, 0, R + 10, '#6d6150', OUT, 3);
    const sand = ctx.createRadialGradient(-R * 0.2, -R * 0.3, 20, 0, 0, R);
    sand.addColorStop(0, '#d9c18e'); sand.addColorStop(1, '#a88d62');
    circle(ctx, 0, 0, R, sand);
    if (!this.specks) { const r = rng(11); this.specks = []; for (let i = 0; i < 260; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (R - 8); this.specks.push([Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 1.8, r() < 0.5]); } }
    for (const [x, y, s, dk] of this.specks) circle(ctx, x, y, s, dk ? 'rgba(120,92,58,0.35)' : 'rgba(250,236,204,0.35)');
    circle(ctx, 0, 0, R * 0.42, null, 'rgba(110,82,48,0.35)', 3);
    circle(ctx, 0, 0, 10, 'rgba(110,82,48,0.35)');
    // the gates' marks
    for (const [sx, col] of [[-1, '#e8c15a'], [1, '#9fb4c8']]) {
      ctx.save(); ctx.globalAlpha = 0.55 + 0.1 * Math.sin(now * 2 + sx);
      ellipse(ctx, sx * PVP.SPAWN_R, 0, 54, 80, 0, null, col, 2.5);
      ctx.restore();
      ctx.save(); ctx.translate(sx * (R + 8), 0);
      rrect(ctx, -14, -46, 28, 92, 4, '#2a2018', OUT, 2);
      rrect(ctx, -9, -40, 18, 80, 3, rgba(col, 0.75));
      ctx.restore();
    }
    ctx.restore();
  },

  // capture the flag's field: a long sand floor in a rounded kerb, each end tinted in its side's colour with a stone
  // stand for its flag (the flags themselves: drawFlags, over the fighters)
  drawField(ctx, now) {
    const HW = CTF.HW, HH = CTF.HH, C = CTF.CORNER;
    ctx.save();
    const grd = ctx.createRadialGradient(0, 0, HH * 0.4, 0, 0, HW + 200);
    grd.addColorStop(0, '#3a2c1c'); grd.addColorStop(0.7, '#21180f'); grd.addColorStop(1, '#0e0a07');
    ctx.fillStyle = grd; ctx.fillRect(-HW - 260, -HH - 260, (HW + 260) * 2, (HH + 260) * 2);
    for (let k = 3; k >= 1; k--) { const o = 18 + k * 30; rrect(ctx, -HW - o, -HH - o, (HW + o) * 2, (HH + o) * 2, C + o, null, 'rgba(160,140,110,' + (0.05 + k * 0.03) + ')', 18); }
    rrect(ctx, -HW - 10, -HH - 10, (HW + 10) * 2, (HH + 10) * 2, C + 10, '#6d6150', OUT, 3);
    const sand = ctx.createLinearGradient(0, -HH, 0, HH);
    sand.addColorStop(0, '#d9c18e'); sand.addColorStop(1, '#a88d62');
    rrect(ctx, -HW, -HH, HW * 2, HH * 2, C, sand);
    if (!this.fspecks) { const r = rng(13); this.fspecks = []; for (let i = 0; i < 420; i++) { this.fspecks.push([(r() * 2 - 1) * (HW - 10), (r() * 2 - 1) * (HH - 10), 1 + r() * 1.8, r() < 0.5]); } }
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-HW, -HH, HW * 2, HH * 2, C) : ctx.rect(-HW, -HH, HW * 2, HH * 2); ctx.clip();
    for (const [x, y, s, dk] of this.fspecks) circle(ctx, x, y, s, dk ? 'rgba(120,92,58,0.35)' : 'rgba(250,236,204,0.35)');
    // each side's end, faintly in its colour
    for (const [sx, col] of [[-1, '#e8c15a'], [1, '#9fb4c8']]) {
      const g2 = ctx.createLinearGradient(sx * HW, 0, sx * (HW - 360), 0);
      g2.addColorStop(0, rgba(col, 0.2)); g2.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g2; ctx.fillRect(sx < 0 ? -HW : HW - 360, -HH, 360, HH * 2);
    }
    ctx.restore();
    line(ctx, 0, -HH + 30, 0, HH - 30, 'rgba(110,82,48,0.35)', 3);
    circle(ctx, 0, 0, 90, null, 'rgba(110,82,48,0.35)', 3);
    // the stands: a round stone dais ringed in the side's colour
    for (const [sx, col] of [[-1, '#e8c15a'], [1, '#9fb4c8']]) {
      const x = sx * CTF.STAND_X;
      ellipse(ctx, x, 6, CTF.TOUCH + 8, (CTF.TOUCH + 8) * 0.72, 0, 'rgba(0,0,0,0.25)');
      ellipse(ctx, x, 0, CTF.TOUCH + 6, (CTF.TOUCH + 6) * 0.72, 0, '#9a8c74', OUT, 2.5);
      ellipse(ctx, x, -2, CTF.TOUCH - 6, (CTF.TOUCH - 6) * 0.72, 0, '#b8aa8e', rgba(col, 0.6 + 0.15 * Math.sin(now * 2 + sx)), 2.5);
      ctx.save(); ctx.translate(sx * (HW + 8), 0);
      rrect(ctx, -14, -46, 28, 92, 4, '#2a2018', OUT, 2);
      rrect(ctx, -9, -40, 18, 80, 3, rgba(col, 0.75));
      ctx.restore();
    }
    ctx.restore();
  },

  // one flag: a pole and a waving pennant in the side's colour (tilt: lying on the ground)
  flag(ctx, x, y, col, now, tilt) {
    ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
    line(ctx, 0, 0, 0, -58, '#3a2a18', 3.5);
    const w = Math.sin(now * 5 + x * 0.01) * 4;
    poly(ctx, [1, -56, 30, -50 + w, 26, -44 + w * 0.6, 32, -36 + w, 1, -32], col, OUT, 1.5);
    circle(ctx, 0, -59, 3.5, '#f0d48a', OUT, 1);
    ctx.restore();
  },
  // the flags: on their stands, lying where they fell (a ring running down to their return), or over a carrier's head
  // with a trail of the side's colour behind them
  drawFlags(ctx, C, now, entById) {
    if (!this.trails) this.trails = [[], []];
    C.f.forEach((f, tm) => {
      const [st, x, y, by, ret] = f, col = tm === 0 ? '#e8c15a' : '#9fb4c8', tr = this.trails[tm];
      const e = st === 1 ? entById(by) : null;
      if (e) { if (!tr.length || Math.hypot(tr[tr.length - 1].x - e.x, tr[tr.length - 1].y - e.y) > 10) tr.push({ x: e.x, y: e.y, t: now }); }
      while (tr.length && (tr.length > 40 || now - tr[0].t > 1.6 || !e)) tr.shift();
      for (const p of tr) circle(ctx, p.x, p.y + 4, 9 * (1 - (now - p.t) / 1.6), rgba(col, 0.35 * (1 - (now - p.t) / 1.6)));
      if (st === 1 && e) {
        glow(ctx, e.x, e.y, 46, col, 0.35 + 0.1 * Math.sin(now * 6));
        this.flag(ctx, e.x + 12, e.y - 56 - (e.lift || 0), col, now);
      } else if (st === 2) {
        const left = Math.max(0, ret - (now - C.at)), k = Math.min(1, left / CTF.RETURN);
        ellipse(ctx, x, y + 4, CTF.TOUCH, CTF.TOUCH * 0.72, 0, rgba(col, 0.12), rgba(col, 0.5), 1.5);
        ctx.save(); ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 4, CTF.TOUCH, CTF.TOUCH * 0.72, 0, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); ctx.restore();
        this.flag(ctx, x - 20, y + 2, col, now, -1.1);
      } else this.flag(ctx, x, y - 4, col, now);
    });
  },

  // a ring in the side's colour under every fighter (foes in red over it, so the enemy reads at a glance)
  drawSides(ctx, units, teams, myTeam, now) {
    for (const u of units) {
      const tm = teams[u.id]; if (tm == null) continue;
      const col = tm === 0 ? '#e8c15a' : '#9fb4c8';
      ellipse(ctx, u.x, u.y + 4, 30, 21, 0, null, rgba(col, 0.7), 2);
      if (tm !== myTeam) ellipse(ctx, u.x, u.y + 4, 36, 26, 0, null, rgba('#ff5a4a', 0.35 + 0.15 * Math.sin(now * 4)), 1.5);
    }
  },
};

const PvpUI = (() => {
  // the bouts (phase C adds capture the flag here: { id: 'ctf', size: 2, ... })
  const MODES = [
    { id: 'duel', name: 'Duel', tag: '1 v 1', size: 1, note: 'One against one. The first to fall loses.' },
    { id: 'team', name: 'Team', tag: '2 v 2', size: 2, note: 'Two against two. The last side standing wins.' },
    { id: 'ctf', name: 'Capture the Flag', tag: '2 v 2', size: 2, note: 'Two against two on a longer field. Take their flag from its stand and bring it to yours while your own is home. First to three captures wins. The fallen come back at their own end.' },
  ];
  const SIDES = ['Gold Gate', 'Ash Gate'], SIDE_COL = ['#e8c15a', '#9fb4c8'];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const clsName = id => (CLASSES.find(c => c.id === id) || {}).name || '';
  let deps = null, panel = null, hud = null, card = null, lobby = null;

  function init(d) {
    deps = d;
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.stopImmediatePropagation(); close(); } }, true);
  }

  // ---------------------------------------------------------------- the lobby (the host's copy is the real one)
  // lobby: { mode, sides: [[slot, slot], [slot, slot]] }, a slot { h: playerId } or { b: classId | 'random' }
  const modeOf = id => MODES.find(m => m.id === id) || MODES[0];
  function fresh(mode) { return { mode, sides: [[{ b: 'random' }, { b: 'random' }], [{ b: 'random' }, { b: 'random' }]] }; }
  // the host's lobby against who is in town now: gone players' slots become bots, new ones take a free slot
  function settle(L) {
    const humans = deps.humans(), ids = new Set(humans.map(h => h.id)), size = modeOf(L.mode).size;
    for (const side of L.sides) for (let i = 0; i < side.length; i++) if (side[i].h != null && !ids.has(side[i].h)) side[i] = { b: 'random' };
    const placed = () => new Set(L.sides.flatMap(s => s.slice(0, size)).filter(s => s.h != null).map(s => s.h));
    // a human sitting in a slot past this mode's size (Team back to Duel) is moved into a live one
    for (const side of L.sides) for (let i = size; i < side.length; i++) if (side[i].h != null && !placed().has(side[i].h)) { const id = side[i].h; side[i] = { b: 'random' }; place(L, id, size); }
    for (const h of humans) if (!placed().has(h.id)) place(L, h.id, size);
    return L;
  }
  function place(L, id, size) {
    const humansOn = s => L.sides[s].slice(0, size).filter(x => x.h != null).length;
    const order = humansOn(0) <= humansOn(1) ? [0, 1] : [1, 0];
    for (const s of order) { const i = L.sides[s].slice(0, size).findIndex(x => x.h == null); if (i >= 0) { L.sides[s][i] = { h: id }; return true; } }
    return false;   // (no room: they watch this one)
  }
  function hostLobby() { if (!lobby) lobby = fresh('duel'); return settle(lobby); }
  function publish() { if (deps.isHost()) deps.broadcast({ t: 'pvpLobby', l: hostLobby() }); }
  // a player asks to change sides: they swap with the first bot (or the first slot) on the other side
  function hostMove(pid) {
    const L = hostLobby(), size = modeOf(L.mode).size;
    for (const s of [0, 1]) {
      const i = L.sides[s].slice(0, size).findIndex(x => x.h === pid); if (i < 0) continue;
      const o = L.sides[1 - s], j = o.slice(0, size).findIndex(x => x.h == null), k = j >= 0 ? j : 0;
      const tmp = o[k]; o[k] = L.sides[s][i]; L.sides[s][i] = tmp;
      break;
    }
    publish();
  }
  function onLobby(l) {
    if (!l || !Array.isArray(l.sides) || l.sides.length !== 2) return;
    if (!deps.isHost()) lobby = l;
    if (isOpen()) render();
  }

  function open() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'pvp-lobby'; panel.className = 'hidden';
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.addEventListener('change', e => {
        const t = e.target; if (!t.dataset.slot || !deps.isHost()) return;
        const [s, i] = t.dataset.slot.split(':').map(Number), L = hostLobby();
        if (L.sides[s][i].h == null) L.sides[s][i] = { b: t.value };
        publish();
      });
      panel.addEventListener('click', e => {
        const t = e.target.closest('button'); if (!t) return;
        if (deps.sound) deps.sound('ui-click');
        if (t.classList.contains('close')) return close();
        if (t.dataset.mode && deps.isHost()) { const L = hostLobby(); L.mode = t.dataset.mode; publish(); }
        if (t.dataset.swap != null && deps.isHost()) hostMove(Number(t.dataset.swap));
        if (t.dataset.act === 'side') { if (deps.isHost()) hostMove(deps.myId()); else deps.send({ t: 'pvpSide' }); }
        if (t.dataset.act === 'start') {
          if (!deps.isHost()) return;
          if (!deps.ready()) return;
          const L = hostLobby(), size = modeOf(L.mode).size;
          const pick = () => { const pool = CLASSES.filter(c => c.id !== 'threadweaver'); return pool[Math.floor(Math.random() * pool.length)].id; };   // (no Threadweaver by chance: its bot plays a support web that has nothing to web in a bout)
          const teams = {}, bots = [];
          L.sides.forEach((side, s) => side.slice(0, size).forEach(x => { if (x.h != null) teams[x.h] = s; else bots.push({ cls: x.b && x.b !== 'random' ? x.b : pick(), team: s }); }));
          close();
          deps.start({ mode: L.mode, teams, bots });
          return;
        }
        render();
      });
    }
    if (deps.isHost()) publish(); else deps.send({ t: 'pvpAsk' });
    render();
    panel.classList.remove('hidden');
  }
  function close() { if (panel) panel.classList.add('hidden'); }
  function isOpen() { return !!panel && !panel.classList.contains('hidden'); }

  function render() {
    const host = deps.isHost(), L = host ? hostLobby() : lobby, me = deps.myId();
    if (!L) { panel.innerHTML = `<header><h3>The Arena</h3><button type="button" class="close" aria-label="Close">×</button></header><p class="pr-note">Asking the host for the bout…</p>`; return; }
    const m = modeOf(L.mode), humans = deps.humans(), who = id => humans.find(h => h.id === id);
    const opts = sel => `<option value="random"${sel === 'random' ? ' selected' : ''}>Any hero</option>` + CLASSES.map(c => `<option value="${c.id}"${sel === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
    const slot = (x, s, i) => {
      if (x.h != null) {
        const h = who(x.h);
        return `<li class="pv-slot${x.h === me ? ' me' : ''}"><i style="--rc:${h && ROLES[h.role] ? ROLES[h.role].color : '#888'}"></i><b>${esc(h ? (x.h === me ? h.name + ' (you)' : h.name) : '…')}</b><small>${esc(h ? clsName(h.cls) : '')}</small>${host ? `<button type="button" class="pv-swap" data-swap="${x.h}" data-tip="Move to the other side">⇄</button>` : ''}</li>`;
      }
      return `<li class="pv-slot bot"><i></i>${host ? `<select data-slot="${s}:${i}" aria-label="Bot hero">${opts(x.b || 'random')}</select>` : `<b>${esc(x.b && x.b !== 'random' ? clsName(x.b) : 'Any hero')}</b>`}<small>bot</small></li>`;
    };
    const placed = new Set(L.sides.flatMap(sd => sd.slice(0, m.size)).filter(x => x.h != null).map(x => x.h));
    const watching = humans.filter(h => !placed.has(h.id));
    panel.innerHTML = `<header><h3>The Arena</h3><button type="button" class="close" aria-label="Close">×</button></header>
      <p class="pr-note">${esc(m.note)} A short bout, then back to town. Nothing is won but the bout.</p>
      <div class="pv-modes">${MODES.map(x => `<button type="button" class="btn2${x.id === L.mode ? ' on' : ''}" data-mode="${x.id}"${host ? '' : ' disabled'}><b>${x.name}</b><small>${x.tag}</small></button>`).join('')}</div>
      <div class="pv-sides">${L.sides.map((sd, s) => `<section style="--sc:${SIDE_COL[s]}"><h4>${SIDES[s]}</h4><ul>${sd.slice(0, m.size).map((x, i) => slot(x, s, i)).join('')}</ul></section>`).join('<em class="pv-vs">vs</em>')}</div>
      ${watching.length ? `<p class="pr-note">Watching: ${watching.map(h => esc(h.name)).join(', ')}</p>` : ''}
      <footer>${placed.has(me) && !host ? '<button type="button" class="btn2" data-act="side">Change sides</button>' : ''}${host ? '<button type="button" class="cta" data-act="start">Start the bout</button>' : '<p class="pr-note">The host starts the bout.</p>'}</footer>`;
  }

  // ---------------------------------------------------------------- in the ring: the HUD
  function hudEl() {
    if (!hud) {
      hud = document.createElement('div'); hud.id = 'pvp-hud'; hud.className = 'hidden';
      // (.pv-score: an empty slot for a mode with a score, e.g. capture the flag's captures)
      hud.innerHTML = `<div class="pv-team t0"></div><div class="pv-mid"><b class="pv-clock">0:00</b><small class="pv-sd"></small><div class="pv-score"></div></div><div class="pv-team t1"></div>`;
      document.body.appendChild(hud);
    }
    return hud;
  }
  // every frame in a match (main.js updateArena): P = raid.pvp, party = raid.party, names: id -> name
  function frame(P, party, now, names) {
    const el = hudEl(); el.classList.remove('hidden');
    let left;
    if (P.state === 'countdown') left = P.round;
    else if (P.left != null) left = Math.max(0, P.left - (P.state === 'live' ? now - P.leftAt : 0));
    else left = P.round;
    const c = el.querySelector('.pv-clock'), txt = mmss(Math.ceil(left));
    if (c.textContent !== txt) c.textContent = txt;
    c.classList.toggle('sd', !!P.sd);
    const sd = el.querySelector('.pv-sd'), sdt = P.sd ? (P.ctf ? 'Overtime' : 'Sudden death') : P.mode === 'ctf' ? 'Capture the flag' : P.mode === 'team' ? 'Team bout' : 'Duel';
    if (sd.textContent !== sdt) sd.textContent = sdt;
    sd.classList.toggle('on', !!P.sd);
    for (const tm of [0, 1]) {
      const box = el.querySelector('.t' + tm), ids = Object.keys(P.teams).map(Number).filter(id => P.teams[id] === tm);
      const key = ids.join(',');
      if (box.dataset.k !== key) {
        box.dataset.k = key;
        box.innerHTML = `<h5>${SIDES[tm]}${tm === P.myTeam ? ' · you' : ''}</h5>` + ids.map(id => `<div class="pv-hp" data-id="${id}"><span>${esc(names(id))}</span><div class="bar"><div class="fill"></div></div></div>`).join('');
      }
      for (const row of box.querySelectorAll('.pv-hp')) {
        const s = party.get(Number(row.dataset.id)), f = s && s.maxHp > 1 ? Math.max(0, s.hp / s.maxHp) : 1;
        row.querySelector('.fill').style.transform = `scaleX(${(s && s.alive === false ? 0 : f).toFixed(3)})`;
        row.classList.toggle('down', !!(s && s.alive === false));
      }
    }
    if (P.ctf) ctfHud(el, P, now, names);
  }
  // capture the flag: the score, each flag's state, and how long until you are back
  function ctfHud(el, P, now, names) {
    const C = P.ctf, me = deps.myId();
    const st = (f, tm) => {
      if (f[0] === 1) return `<em>${f[3] === me ? 'you carry it' : 'carried by ' + esc(names(f[3]))}</em>`;
      if (f[0] === 2) return `down · ${Math.ceil(Math.max(0, f[4] - (now - C.at)))}`;
      return 'home';
    };
    const back = C.down[me] > now ? `<span class="pv-back">Back in ${Math.ceil(C.down[me] - now)}</span>` : '';
    const html = `<div class="pv-caps"><b style="--sc:${SIDE_COL[0]}">${C.caps[0]}</b><i>·</i><b style="--sc:${SIDE_COL[1]}">${C.caps[1]}</b></div>` +
      C.f.map((f, tm) => `<small style="--sc:${SIDE_COL[tm]}">${tm === P.myTeam ? 'Your' : 'Their'} flag: ${st(f, tm)}</small>`).join('') + back;
    const box = el.querySelector('.pv-score');
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  // ---------------------------------------------------------------- the result card
  function result(msg, P, names, actions) {
    if (!card) {
      card = document.createElement('div'); card.id = 'pvp-result'; card.className = 'hidden';
      document.body.appendChild(card);
      card.addEventListener('mousedown', e => e.stopPropagation());
      card.addEventListener('click', e => { const t = e.target.closest('button'); if (t && card._town) card._town(); });
    }
    card._town = actions.town;
    const won = msg.winner != null && msg.winner === P.myTeam, draw = msg.winner == null;
    const head = draw ? 'Draw' : won ? 'Victory' : 'Defeat';
    const caps = P.ctf ? ` ${P.ctf.caps[0]} to ${P.ctf.caps[1]}` : '';
    const how = draw ? (P.ctf ? `Level on captures after overtime,${caps}` : msg.reason === 'time' ? 'Too close to call when the clock ran out' : 'Both sides fell together')
      : `${SIDES[msg.winner]} wins ${msg.reason === 'caps' ? 'by captures,' + caps : msg.reason === 'time' ? 'on the clock' : 'by knockout'}`;
    const stats = msg.stats || {}, ids = Object.keys(P.teams).map(Number).sort((a, b) => P.teams[a] - P.teams[b]);
    card.className = draw ? 'draw' : won ? 'won' : 'lost';
    card.innerHTML = `<small>The Arena · ${P.mode === 'ctf' ? 'Capture the flag' : P.mode === 'team' ? 'Team bout' : 'Duel'}</small><h2>${head}</h2><p>${esc(how)} · ${mmss(Math.round(msg.time || 0))}</p>
      <table><thead><tr><th></th><th>Damage</th><th>Healing</th><th>Taken</th></tr></thead><tbody>${ids.map(id => { const st = stats[id] || {}; return `<tr style="--sc:${SIDE_COL[P.teams[id]]}"><td><i></i>${esc(names(id))}</td><td>${Math.round(st.damage || 0)}</td><td>${Math.round(st.healing || 0)}</td><td>${Math.round(st.taken || 0)}</td></tr>`; }).join('')}</tbody></table>
      <button type="button" class="cta">Back to town</button>`;
  }

  function leave() { if (hud) { hud.classList.add('hidden'); hud.querySelector('.pv-score').innerHTML = ''; } if (card) card.className = 'hidden'; }

  return { MODES, SIDES, SIDE_COL, init, open, close, isOpen, onLobby, hostMove, publish, frame, result, leave };
})();
