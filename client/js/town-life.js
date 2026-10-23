// Town life: the townsfolk of Emberfall (town-npcs.js) walking about, talking, keeping secrets and handing out the odd
// gift, and what each boss's first defeat changes in town: a newcomer walks in (with a few words for everyone), a
// trophy goes up on the boss's statue, a little decoration appears. The chef (after Grubnak) serves feasts: one
// person orders, everyone in town eats, and the meal lasts an hour.
// Progress here is this browser's own: flags and arrivals are the account's, gifts are once per hero.

const TownLife = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const NPCS = typeof TOWN_NPCS !== 'undefined' ? TOWN_NPCS : [];
  const GIFTS = typeof TOWN_GIFTS !== 'undefined' ? TOWN_GIFTS : {};
  const UNLOCKS = typeof TOWN_UNLOCKS !== 'undefined' ? TOWN_UNLOCKS : {};
  const MEALS = typeof FEASTS !== 'undefined' ? FEASTS : [];
  const FEAST_MS = 60 * 60 * 1000;
  let deps = null;   // from main: { beaten(id), hero(), role(), now(), player, addItem(key), gold(), spendGold(n), toast(msg), orderFeast(id), focusCamera(x, y, secs), onFeast() }

  // ---------------------------------------------------------------- saved state
  function state() {
    let s = Save.get('town');
    if (!s || typeof s !== 'object') { s = {}; Save.set('town', s); }
    s.flags = s.flags || {}; s.gifts = s.gifts || {}; s.seen = s.seen || {};
    return s;
  }
  const commit = () => Save.commit();

  // ---------------------------------------------------------------- the townsfolk
  const folk = NPCS.map((d, i) => ({ d, x: d.at.x, y: d.at.y, angle: Math.PI / 2, st: { t: 0, moving: false, action: null }, home: d.at, goal: null, rest: 1 + i * 0.7, walk: null, bubble: null }));
  const present = f => !f.d.arrives || (deps && deps.beaten(f.d.arrives) && (state().seen[f.d.arrives] || f.walk));
  function matches(w) {
    if (!w) return true;
    const s = state(), hero = deps.hero(), role = deps.role();
    if (w.beaten && !w.beaten.every(b => deps.beaten(b))) return false;
    if (w.notBeaten && w.notBeaten.some(b => deps.beaten(b))) return false;
    if (w.flags && !w.flags.every(f => s.flags[f])) return false;
    if (w.notFlags && w.notFlags.some(f => s.flags[f])) return false;
    if (w.hero && w.hero !== hero) return false;
    if (w.role && w.role !== role) return false;
    return true;
  }

  // ---------------------------------------------------------------- arrivals and unlock moments
  let scene = null;   // { f, boss, at, lineAt, i }
  function startArrival(boss) {
    const s = state();
    s.seen[boss] = 1; commit();
    const u = UNLOCKS[boss];
    if (u && u.toast) banner(u.toast);
    const f = folk.find(x => x.d.arrives === boss);
    if (!f) return;
    const from = (f.d.entrance && f.d.entrance.from) || { x: f.home.x, y: f.home.y + 300 };
    const legs = ((f.d.entrance && f.d.entrance.via) || []).concat([f.home]);
    f.x = from.x; f.y = from.y; f.walk = { to: legs[0], next: legs.slice(1), best: Infinity, at: 0, ghost: false };
    scene = { f, i: -1, lineAt: 0, lines: (f.d.entrance && f.d.entrance.lines) || [] };
    deps.focusCamera(f, 999);
    if (typeof Sound !== 'undefined') Sound.play('arrival', { vol: 0.8 });
  }
  function bannerEl() {
    let el = document.getElementById('town-banner');
    if (!el) { el = document.createElement('div'); el.id = 'town-banner'; el.className = 'hidden'; document.body.appendChild(el); }
    return el;
  }
  let bannerTimer = null;
  function banner(text) {
    const el = bannerEl();
    el.innerHTML = `<small>Something has changed in Emberfall</small><p>${esc(text)}</p>`;
    el.classList.remove('hidden', 'out'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.classList.add('out'); bannerTimer = setTimeout(() => el.classList.add('hidden'), 900); }, 7000);
  }

  // ---------------------------------------------------------------- each frame (in town)
  // the feast you're full of, as a chip by your gold (with the minutes left)
  let chipKey = '';
  function chip() {
    let el = document.getElementById('fed-chip');
    if (!el) { el = document.createElement('div'); el.id = 'fed-chip'; el.className = 'hidden'; document.body.appendChild(el); }
    const f = feast(), key = f ? f.meal.id + Math.ceil(f.left / 60000) : '';
    if (key === chipKey) return;
    if (chipKey && !key && deps) deps.onFeast();   // (the meal ran out: gear numbers and the host's copy drop it)
    chipKey = key;
    el.classList.toggle('hidden', !f);
    if (f) { el.innerHTML = `Well fed<b>${Math.ceil(f.left / 60000)}m</b>`; Tip.set(el, `<b>${esc(f.meal.name)}</b><em>+${f.meal.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[f.meal.buff.stat] || ''}</em>${esc(f.meal.desc)}`); }
  }
  function update(dt, now, inTown) {
    if (deps && Math.floor(now) !== Math.floor(now - dt)) chip();
    if (feastSc && (!deps || !inTown)) endFeastScene(true);   // (a fight or the portal ends it at once)
    if (!deps || !inTown) return;
    // a boss beaten that town hasn't marked yet: its moment, one at a time
    if (!scene) for (const b of Object.keys(UNLOCKS)) if (deps.beaten(b) && !state().seen[b]) { startArrival(b); break; }
    const p = deps.player;
    for (const f of folk) {
      f.st.t = now;
      if (!present(f)) continue;
      let moving = false;
      if (f.walk) {
        const dx = f.walk.to.x - f.x, dy = f.walk.to.y - f.y, d = Math.hypot(dx, dy);
        if (d < 4 && f.walk.next && f.walk.next.length) { f.walk.to = f.walk.next.shift(); f.walk.best = Infinity; }
        else if (d < 4) { f.walk = null; if (scene && scene.f === f) deps.focusCamera(null); }
        else {
          const st = Math.min(d, 95 * dt); f.x += dx / d * st; f.y += dy / d * st; f.angle = Math.atan2(dy, dx); moving = true;
          // no closer for a second (something solid in the line): walk through it, so an arrival never hangs with the camera on them
          if (d < f.walk.best - 1) { f.walk.best = d; f.walk.at = now; } else if (now - f.walk.at > 1) f.walk.ghost = true;
          if (!f.walk.ghost) deps.collide(f);
        }
      } else if (f.d.wander > 0 && !talking(f)) {
        if (f.goal) {
          const dx = f.goal.x - f.x, dy = f.goal.y - f.y, d = Math.hypot(dx, dy);
          if (d < 3) { f.goal = null; f.rest = now + 2 + Math.random() * 5; }
          else {
            const st = Math.min(d, 40 * dt), nx = f.x + dx / d * st, ny = f.y + dy / d * st;
            if (deps.blocked(nx, ny)) { f.goal = null; f.rest = now + 1; }   // (a wall or a tree in the way: stop and pick again)
            else { f.x = nx; f.y = ny; f.angle = Math.atan2(dy, dx); moving = true; }
          }
        } else if (now > f.rest) {
          // somewhere new nearby, on open ground, with nothing in the way
          for (let k = 0; k < 6; k++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * f.d.wander, g = { x: f.home.x + Math.cos(a) * r, y: f.home.y + Math.sin(a) * r };
            let clear = true;
            for (let j = 1; j <= 6 && clear; j++) if (deps.blocked(f.x + (g.x - f.x) * j / 6, f.y + (g.y - f.y) * j / 6)) clear = false;
            if (clear) { f.goal = g; break; }
          }
          if (!f.goal) f.rest = now + 2;
        }
      }
      f.st.moving = moving;
      // they turn to look at you when you're close
      if (!moving && !f.pose && p && Math.hypot(p.x - f.x, p.y - f.y) < 140) {
        let d = Math.atan2(p.y - f.y, p.x - f.x) - f.angle;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        f.angle += d * Math.min(1, dt * 5);
      }
    }
    // the camp kitchen's tables are solid once the chef is here; he cooks while nobody is talking to him
    const gs = folk.find(f => f.d.id === 'gaspard');
    if (gs && present(gs)) {
      addColliders();
      if (!feastSc) {
        if (!gs.walk && !talking(gs)) {
          const mode = now % 18 < 10 ? 'chop' : 'stir', ta = mode === 'chop' ? Math.atan2(1018 - gs.y, 785 - gs.x) : Math.atan2(K.stove.y - gs.y, K.stove.x - gs.x);
          gs.pose = mode; gs.angle = angTo(gs.angle, ta, Math.min(1, dt * 4));
        } else gs.pose = null;
      }
    }
    if (feastSc) tickFeast(dt, now);
    // the newcomer's walk-in, then their words, over their head
    if (scene) {
      const f = scene.f;
      if (!f.walk) {
        if (scene.i < 0 || now >= scene.lineAt) {
          scene.i += 1;
          if (scene.i >= scene.lines.length) { f.bubble = null; scene = null; deps.focusCamera(null); }
          else { f.bubble = scene.lines[scene.i]; scene.lineAt = now + Math.max(3, scene.lines[scene.i].length / 22); }
        }
      }
    }
  }

  // ---------------------------------------------------------------- drawing
  // a townsperson from their `look`: top-down, like the barkeep and the trainer
  function drawFolk(ctx, f, scale) {
    const L = f.d.look || {}, st = f.st, skin = L.skin || '#e0b48e', hair = L.hair || '#3a2416', coat = L.coat || '#6a5a48';
    const k = L.build === 'small' ? 0.72 : 1, wide = L.build === 'broad' ? 12 : L.build === 'slim' ? 8.5 : 10;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(scale * k, scale * k);
    ellipse(ctx, 2, 5, 15, 11, 0, 'rgba(0,0,0,0.28)');
    ctx.rotate(f.angle + (st.moving ? 0 : Math.sin(st.t * 0.6 + f.home.x) * 0.15));
    feet(ctx, st, '#2e2218');
    torso(ctx, coat, wide, 14);
    if (L.apron) ellipse(ctx, 3, 0, 6, 10, 0, L.apron, OUT, 1.5);
    // hands: at the sides, or busy (the chef chops, stirs, carries a dish, flourishes)
    const pz = f.pose, tt = st.t;
    let lh = [5, -12], rh = [5, 12];
    if (f.carry) { lh = [14, -9]; rh = [14, 9]; }
    else if (pz === 'chop') { const c = Math.max(0, Math.sin(tt * 8)); rh = [9 + 5 * c, 7]; lh = [12, -6]; }
    else if (pz === 'stir') { const a = tt * 3.4; rh = [12 + Math.cos(a) * 2.5, 6 + Math.sin(a) * 3]; }
    else if (pz === 'flourish') { rh = [9 + Math.sin(tt * 9) * 3, 17]; }
    if (pz === 'chop') { poly(ctx, [rh[0] + 1, rh[1] - 1.4, rh[0] + 11, rh[1] - 1, rh[0] + 11, rh[1] + 2, rh[0] + 1, rh[1] + 1.4], '#c4c8cc', OUT, 1); }
    else if (pz === 'stir') { line(ctx, rh[0], rh[1], rh[0] + 15, rh[1] - 3, OUT, 3.4); line(ctx, rh[0], rh[1], rh[0] + 15, rh[1] - 3, '#8a8f96', 1.8); circle(ctx, rh[0] + 15, rh[1] - 3, 3.2, '#7d838a', OUT, 1.2); }
    hand(ctx, lh[0], lh[1], skin); hand(ctx, rh[0], rh[1], skin);
    if (f.carry) { ctx.save(); ctx.translate(19, 0); drawCarried(ctx, f.carry); ctx.restore(); }
    const hat = L.hat || 'none';
    if (hat === 'hood') { circle(ctx, -1, 0, 9, coat, OUT, 2); circle(ctx, 3, 0, 5.5, skin); }
    else {
      circle(ctx, 0, 0, 7.5, hair, OUT, 2);
      circle(ctx, -1.5, -2.5, 2.4, 'rgba(255,255,255,0.18)');
      if (L.beard) ellipse(ctx, 6.5, 0, 5, 5.5, 0, hair, OUT, 1.5);
      else ellipse(ctx, 5.5, 0, 3, 4.5, 0, skin);
      if (hat === 'cap') { circle(ctx, -0.5, 0, 6.8, '#5a4a3a', OUT, 1.5); ellipse(ctx, 6, 0, 3.5, 6, 0, '#4a3a2a', OUT, 1.2); }
      else if (hat === 'chef') { circle(ctx, -1, 0, 7.5, '#f8f6f0', OUT, 1.5); circle(ctx, -3, -3, 4, '#ffffff'); circle(ctx, -3, 3, 4, '#ffffff'); circle(ctx, 1, 0, 4, '#ffffff'); }
      else if (hat === 'wide') { circle(ctx, 0, 0, 12, '#5a3e24', OUT, 1.5); circle(ctx, 0, 0, 6.5, '#6e4c2c', OUT, 1); }
      else if (hat === 'scarf') { circle(ctx, -1, 0, 7.8, coat, OUT, 1.5); ellipse(ctx, 5, 0, 3, 4.2, 0, skin); }
      else if (hat === 'crown') { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circle(ctx, Math.cos(a) * 6, Math.sin(a) * 6, 1.8, '#e8c15a', OUT, 0.8); } }
    }
    ctx.restore();
  }
  // trophies on beaten bosses' statues, and each unlock's little decoration
  function drawTrophy(ctx, kind, x, y, now) {
    ctx.save(); ctx.translate(x, y);
    glow(ctx, 0, 0, 22, '#ffd98a', 0.18 + Math.sin(now * 2) * 0.05);
    if (kind === 'cleaver') { rrect(ctx, -10, -7, 16, 11, 2, '#c8ccd0', OUT, 1.5); rrect(ctx, 6, -2, 9, 3, 1, '#6a4428', OUT, 1); }
    else if (kind === 'web') { ctx.strokeStyle = '#eef0ff'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); } for (const r of [4, 8, 11]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); } }
    else if (kind === 'storm-glass') { rrect(ctx, -5, -11, 10, 20, 4, 'rgba(160,220,255,0.55)', OUT, 1.5); line(ctx, -1, -6, 2, 0, '#fff7a0', 1.6); line(ctx, 2, 0, -1, 5, '#fff7a0', 1.6); }
    else if (kind === 'crown') { poly(ctx, [-10, 5, -11, -5, -5, 0, 0, -8, 5, 0, 11, -5, 10, 5], '#e8c15a', OUT, 1.5); }
    ctx.restore();
  }
  function drawDecor(ctx, kind, now) {
    if (kind === 'cookfire') {
      drawKitchen(ctx, now);
    } else if (kind === 'silk-lanterns') {
      for (const l of TOWN.lamps || []) glow(ctx, l.x, l.y - 28, 26, '#dfe6ff', 0.3 + Math.sin(now * 1.5 + l.x) * 0.06);
    } else if (kind === 'kites') {
      const spots = [[980, 760], [1460, 700], [1700, 1180]];
      spots.forEach(([x, y], i) => {
        const kx = x + Math.sin(now * 0.7 + i) * 18, ky = y - 120 + Math.cos(now * 0.9 + i * 2) * 10;
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 60, kx, ky); ctx.stroke(); ctx.restore();
        poly(ctx, [kx, ky - 12, kx + 8, ky, kx, ky + 12, kx - 8, ky], ['#e85a5a', '#5ab0e8', '#e8c15a'][i], OUT, 1.2);
      });
    } else if (kind === 'bunting') {
      const p = TOWN.portal, a = { x: p.x - 170, y: p.y + 110 }, b = { x: p.x + 170, y: p.y + 110 };
      ctx.save(); ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(p.x, p.y + 150, b.x, b.y); ctx.stroke(); ctx.restore();
      for (let i = 1; i < 12; i++) {
        const t = i / 12, x = a.x + (b.x - a.x) * t, y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * (p.y + 150) + t * t * b.y;
        poly(ctx, [x - 6, y, x + 6, y, x, y + 11 + Math.sin(now * 3 + i) * 1.5], ['#c84a4a', '#e8c15a', '#4a8ac8'][i % 3], OUT, 0.8);
      }
    }
  }
  // the ground layer (decor and trophies) and the folk themselves (as entities sorted with everyone else)
  function drawGround(ctx, now, pedestals, bossIds) {
    if (!deps) return;
    for (const [b, u] of Object.entries(UNLOCKS)) {
      if (!deps.beaten(b) || !state().seen[b]) continue;
      if (u.decor) drawDecor(ctx, u.decor, now);
      const i = bossIds.indexOf(b);
      if (u.trophy && pedestals[i]) drawTrophy(ctx, u.trophy, pedestals[i].x + 52, pedestals[i].y + 18, now);
    }
    groundMeal(ctx, now);
  }
  function entities(scale) {
    const out = folk.filter(f => deps && present(f)).map(f => ({ kind: 'stagecraft', y: f.y, draw: ctx => drawFolk(ctx, f, scale) }));
    if (feastSc) {
      for (const d of feastSc.diners) out.push({ kind: 'stagecraft', y: d.y, draw: ctx => drawDiner(ctx, d, scale) });
      out.push({ kind: 'stagecraft', y: 99999, draw: ctx => drawMealOver(ctx, feastSc ? feastSc.now : 0) });
    }
    return out;
  }
  // names over the folk you're near, and anyone's speech bubble
  function drawLabels(ctx, label, near) {
    for (const f of folk) {
      if (!deps || !present(f)) continue;
      if (near(f)) label(ctx, f.d.name, f.x, f.y - 34, '#cfe0b0', 11);
      if (f.bubble) bubble(ctx, f.x, f.y - (feastSc ? 92 : 52), f.bubble);
    }
    if (feastSc) for (const d of feastSc.diners) label(ctx, d.name.slice(0, 14), d.x, d.i < 2 ? d.y - 36 - (d.i % 2) * 12 : d.y + 38 + (d.i % 2) * 12, d.me ? '#fff3d8' : (typeof ROLES !== 'undefined' && ROLES[d.cls.role] ? ROLES[d.cls.role].color : '#dffaff'), 11);
  }
  function bubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '13px Georgia, serif';
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 240 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12;
    ctx.fillStyle = 'rgba(16,13,10,0.92)'; ctx.strokeStyle = '#c89a5a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y); ctx.fill();
    ctx.fillStyle = '#f2e6c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, y - h + 6 + i * 17));
    ctx.restore();
  }

  // ---------------------------------------------------------------- the camp kitchen
  // Gaspard's corner of the town (south-west of the plaza): a chopping table, the stove and its pot, a rack of pans and
  // herbs, and the long table where a feast is eaten. It stands once he has arrived. Everything is in world coordinates.
  const K = {
    chop: { x: 752, y: 1000, w: 64, h: 36 },
    stove: { x: 838, y: 1048, r: 20 },
    rack: { l: 748, r: 862, base: 1000, bar: 962 },
    table: { x: 846, y: 1092, w: 154, h: 50 },
    benchN: { x: 852, y: 1070, w: 142, h: 14 }, benchS: { x: 852, y: 1150, w: 142, h: 14 },
    seats: [{ x: 888, y: 1078, a: Math.PI / 2 }, { x: 958, y: 1078, a: Math.PI / 2 }, { x: 888, y: 1156, a: -Math.PI / 2 }, { x: 958, y: 1156, a: -Math.PI / 2 }],
    plates: [{ x: 888, y: 1108 }, { x: 958, y: 1108 }, { x: 888, y: 1126 }, { x: 958, y: 1126 }],
    dish: { x: 923, y: 1117 },
    cookAt: { x: 824, y: 1117 },   // where he sets the dish down from
  };
  let collidersOn = false;
  function addColliders() {
    if (collidersOn || typeof COLLIDERS === 'undefined') return;
    collidersOn = true;
    for (const r of [K.chop, K.table, K.benchN, K.benchS]) COLLIDERS.rects.push({ x: r.x, y: r.y, w: r.w, h: r.h });
    COLLIDERS.circles.push({ x: K.stove.x, y: K.stove.y, r: K.stove.r }, { x: K.rack.l, y: K.rack.base, r: 6 }, { x: K.rack.r, y: K.rack.base, r: 6 },
      { x: 736, y: 1024, r: 12 }, { x: 884, y: 1036, r: 11 });
  }
  function wisps(ctx, x, y, now, n, h, w, a, seed = 0) {
    for (let i = 0; i < n; i++) {
      const p = (now * 0.42 + i / n + seed) % 1;
      circle(ctx, x + Math.sin(now * 1.7 + i * 2.3 + seed * 9) * w * p, y - p * h, 2 + p * 5, `rgba(246,240,228,${(a * Math.sin(p * Math.PI)).toFixed(3)})`);
    }
  }
  function drawKitchen(ctx, now) {
    const fl = Math.sin(now * 7) * 0.05 + Math.sin(now * 11.3) * 0.03, sw = Math.sin(now * 1.3) * 1.5;
    // trampled earth under the camp, flagstones round the fire
    glow(ctx, 880, 1086, 200, '#6e5232', 0.5); glow(ctx, 880, 1086, 130, '#8e6c42', 0.32);
    for (const [dx, dy, w, h] of [[-26, 22, 15, 10], [-8, 28, 13, 9], [14, 26, 15, 10], [-30, -4, 11, 14], [30, 8, 12, 12]]) rrect(ctx, K.stove.x + dx - w / 2, K.stove.y + dy - h / 2, w, h, 3, '#9a9488', 'rgba(26,18,10,0.7)', 1.2);
    glow(ctx, 880, 1050, 170, '#ffb060', 0.1 + fl * 0.4);
    // sacks of flour and grain
    ellipse(ctx, 738, 1030, 14, 12, 0, 'rgba(0,0,0,0.25)');
    ellipse(ctx, 736, 1022, 13, 12, 0, '#c9ac78', OUT, 2); ellipse(ctx, 733, 1019, 6, 5, 0, '#dcc392');
    line(ctx, 730, 1011, 742, 1011, '#6a4a2a', 3); circle(ctx, 726, 1036, 9, '#bfa06c', OUT, 2); circle(ctx, 723, 1033, 4, '#d6bd8a');
    // chopping table: board, vegetables, a knife by the board
    const c = K.chop;
    rrect(ctx, c.x + 5, c.y + 8, c.w, c.h, 4, 'rgba(0,0,0,0.25)');
    rrect(ctx, c.x + 3, c.y + c.h - 5, 7, 12, 2, '#4a3018', OUT, 1.5); rrect(ctx, c.x + c.w - 10, c.y + c.h - 5, 7, 12, 2, '#4a3018', OUT, 1.5);
    rrect(ctx, c.x, c.y, c.w, c.h, 3, '#9d7142', OUT, 2.5);
    rrect(ctx, c.x, c.y + c.h - 9, c.w, 9, [0, 0, 3, 3], '#6e4a28');
    for (const py of [c.y + 11, c.y + 22]) line(ctx, c.x + 3, py, c.x + c.w - 3, py, 'rgba(60,36,16,0.35)', 1);
    rrect(ctx, c.x + 18, c.y + 5, 32, 20, 3, '#d3b57a', OUT, 1.5);
    for (let i = 0; i < 5; i++) { circle(ctx, c.x + 24 + i * 5, c.y + 10 + (i % 2) * 6, 2.4, '#e8802a', OUT, 0.8); circle(ctx, c.x + 24 + i * 5, c.y + 10 + (i % 2) * 6, 0.8, '#f6b36a'); }
    circle(ctx, c.x + 9, c.y + 12, 5.5, '#caa2b8', OUT, 1.5); circle(ctx, c.x + 8, c.y + 11, 2, '#e4c4d4');
    circle(ctx, c.x + 10, c.y + 26, 6, '#7fa24e', OUT, 1.5); line(ctx, c.x + 6, c.y + 26, c.x + 14, c.y + 26, '#a3c070', 1.2); line(ctx, c.x + 10, c.y + 21, c.x + 10, c.y + 31, '#a3c070', 1.2);
    ellipse(ctx, c.x + 56, c.y + 26, 3.5, 2.4, 0, '#b8a888', OUT, 1); ellipse(ctx, c.x + 53, c.y + 14, 3, 2, 0.4, '#ece6d0', OUT, 1);
    poly(ctx, [c.x + 40, c.y + 29, c.x + 53, c.y + 27, c.x + 53, c.y + 31], '#c4c8cc', OUT, 1); rrect(ctx, c.x + 53, c.y + 27.5, 8, 3.4, 1, '#6a4428', OUT, 1);
    // the rack behind: two posts, a beam, pans and herbs on hooks, a lantern at each end
    const R = K.rack;
    for (const px of [R.l, R.r]) { line(ctx, px, R.base, px, R.bar - 4, OUT, 8); line(ctx, px, R.base, px, R.bar - 4, '#6e4a28', 5); circle(ctx, px, R.base, 5, '#4a3018', OUT, 1.5); }
    line(ctx, R.l - 8, R.bar, R.r + 8, R.bar, OUT, 8); line(ctx, R.l - 8, R.bar, R.r + 8, R.bar, '#835a32', 5);
    for (const [hx, kind] of [[768, 'pan'], [790, 'ladle'], [812, 'pan2'], [834, 'herb'], [850, 'chilli']]) {
      const sx = sw * (hx - R.l) / 110;
      line(ctx, hx, R.bar + 2, hx + sx * 0.4, R.bar + 11, '#3a3a40', 1.4);
      if (kind === 'pan' || kind === 'pan2') {
        const r = kind === 'pan' ? 9 : 7;
        line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx * 0.4 + 1, R.bar + 11 + r + 6, OUT, 4); line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx * 0.4 + 1, R.bar + 11 + r + 6, '#5a5a62', 2);
        circle(ctx, hx + sx, R.bar + 24 + r * 0.6, r, '#45454d', OUT, 2); circle(ctx, hx + sx - 1, R.bar + 24 + r * 0.6 - 1, r - 3, '#5f5f69');
      } else if (kind === 'ladle') {
        line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx, R.bar + 30, OUT, 4); line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx, R.bar + 30, '#8a8f96', 2); circle(ctx, hx + sx, R.bar + 33, 4.5, '#7d838a', OUT, 1.5);
      } else if (kind === 'herb') {
        for (const [ox, oy, col] of [[-4, 12, '#5f8a3a'], [3, 14, '#78a04a'], [0, 18, '#4f7a30'], [-3, 20, '#6c9640']]) ellipse(ctx, hx + sx + ox, R.bar + 8 + oy, 3.4, 6.5, ox * 0.06, col, OUT, 1);
        line(ctx, hx + sx - 4, R.bar + 15, hx + sx + 4, R.bar + 15, '#c8a868', 1.6);
      } else {
        for (const [ox, col] of [[-3, '#c8381e'], [3, '#d8481e']]) ellipse(ctx, hx + sx + ox, R.bar + 22, 2.4, 8, ox * 0.05, col, OUT, 1);
        line(ctx, hx + sx - 4, R.bar + 13, hx + sx + 4, R.bar + 13, '#c8a868', 1.6);
      }
    }
    for (const lx of [R.l, R.r]) {
      const lsx = lx + sw * 0.5;
      glow(ctx, lsx, R.bar + 22, 46, '#ffc060', 0.34 + fl);
      line(ctx, lsx, R.bar, lsx, R.bar + 9, '#3a3a40', 1.4);
      rrect(ctx, lsx - 4.5, R.bar + 9, 9, 13, 2, '#ffd98a', OUT, 1.6); line(ctx, lsx - 4.5, R.bar + 15, lsx + 4.5, R.bar + 15, '#5a3d22', 1.2);
      circle(ctx, lsx, R.bar + 16, 2.4, '#fff3c0');
    }
    // the stove: a ring of stones, the fire under a big pot that steams and bubbles
    const S = K.stove;
    ellipse(ctx, S.x + 3, S.y + 6, S.r + 4, S.r, 0, 'rgba(0,0,0,0.28)');
    glow(ctx, S.x, S.y, 58, '#ff9a3a', 0.34 + fl);
    circle(ctx, S.x, S.y, S.r, '#8a8478', OUT, 2.5);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2; line(ctx, S.x + Math.cos(a) * (S.r - 7), S.y + Math.sin(a) * (S.r - 7), S.x + Math.cos(a) * S.r, S.y + Math.sin(a) * S.r, 'rgba(26,18,10,0.65)', 1.4); }
    circle(ctx, S.x, S.y, S.r - 7, '#2a1c14');
    for (let i = 0; i < 3; i++) circle(ctx, S.x + Math.sin(now * 9 + i * 2) * 2.5 + (i - 1) * 6, S.y + 8 - (i % 2) * 2, 3.6 - i * 0.4, ['#ff6a1a', '#ffb03a', '#ffe68a'][i]);
    circle(ctx, S.x, S.y - 2, 15, '#3c3c44', OUT, 2.5);
    circle(ctx, S.x, S.y - 2, 12, '#a85a2a', OUT, 1.2); circle(ctx, S.x - 2, S.y - 4, 8, '#bc6c34');
    for (let i = 0; i < 5; i++) {
      const p = (now * 0.8 + i * 0.37) % 1, a = i * 2.1 + Math.floor(now * 0.8 + i * 0.37) * 1.3, rr = 3 + (i % 3) * 2.6;
      ctx.save(); ctx.globalAlpha = 1 - p; circle(ctx, S.x + Math.cos(a) * rr, S.y - 2 + Math.sin(a) * rr, 0.8 + p * 2.6, null, 'rgba(255,226,170,0.9)', 1); ctx.restore();
    }
    for (const sd of [-1, 1]) rrect(ctx, S.x + sd * 15 - 2.5, S.y - 5, 5, 6, 1.5, '#2c2c32', OUT, 1);
    // wood stacked by the fire
    for (const [dx, dy] of [[-4, 4], [4, 4], [0, -3]]) { ellipse(ctx, 884 + dx, 1038 + dy, 9, 4.5, 0.1, '#7a5230', OUT, 1.6); circle(ctx, 884 + dx + 8, 1038 + dy + 0.5, 3.4, '#c9a46a', OUT, 1); }
    // the communal table, a bench each side, plates and cups set for four
    const T = K.table;
    rrect(ctx, T.x + 6, T.y + 10, T.w, T.h, 5, 'rgba(0,0,0,0.26)');
    for (const b of [K.benchN, K.benchS]) {
      rrect(ctx, b.x, b.y + 4, b.w, b.h, 3, 'rgba(0,0,0,0.22)');
      for (const lx of [b.x + 6, b.x + b.w - 12]) rrect(ctx, lx, b.y + b.h - 3, 6, 9, 1.5, '#4a3018', OUT, 1.2);
      rrect(ctx, b.x, b.y, b.w, b.h, 3, '#8a6038', OUT, 2); line(ctx, b.x + 4, b.y + 4.5, b.x + b.w - 4, b.y + 4.5, 'rgba(255,230,180,0.18)', 1.2);
    }
    for (const lx of [T.x + 8, T.x + T.w - 15]) rrect(ctx, lx, T.y + T.h - 4, 8, 12, 2, '#4a3018', OUT, 1.5);
    rrect(ctx, T.x, T.y, T.w, T.h, 4, '#9d7142', OUT, 2.5);
    rrect(ctx, T.x, T.y + T.h - 9, T.w, 9, [0, 0, 4, 4], '#6e4a28');
    for (const py of [T.y + 12, T.y + 25, T.y + 38]) line(ctx, T.x + 3, py, T.x + T.w - 3, py, 'rgba(60,36,16,0.33)', 1);
    rrect(ctx, T.x + 14, T.y + 17, T.w - 28, 16, 2, '#e8dcc0'); line(ctx, T.x + 14, T.y + 17, T.x + T.w - 14, T.y + 17, '#b2403a', 1.6); line(ctx, T.x + 14, T.y + 33, T.x + T.w - 14, T.y + 33, '#b2403a', 1.6);
    K.plates.forEach((p, i) => {
      const n = i < 2 ? -1 : 1;
      circle(ctx, p.x, p.y, 8.5, '#ece4d0', OUT, 1.5); circle(ctx, p.x, p.y, 5.6, '#f8f2e4', 'rgba(60,40,20,0.35)', 0.8);
      line(ctx, p.x - 11, p.y - n * 4, p.x - 11, p.y + n * 4, '#b8bcc2', 1.6); line(ctx, p.x + 11, p.y - n * 4, p.x + 11, p.y + n * 4, '#b8bcc2', 1.6);
      circle(ctx, p.x + 16, p.y - n, 2.8, '#b8845a', OUT, 1);
    });
    // a lantern at the west end, a jug and a loaf basket at the east
    glow(ctx, T.x + 12, T.y + 25, 34, '#ffc060', 0.3 + fl);
    rrect(ctx, T.x + 8, T.y + 20, 8, 10, 2, '#ffd98a', OUT, 1.5); circle(ctx, T.x + 12, T.y + 25, 1.8, '#fff3c0');
    circle(ctx, T.x + T.w - 12, T.y + 31, 6, '#4f6e9a', OUT, 1.5); circle(ctx, T.x + T.w - 12, T.y + 31, 3, '#6a8ab8');
    ellipse(ctx, T.x + T.w - 11, T.y + 16, 8, 5.5, 0, '#a07a40', OUT, 1.5); ellipse(ctx, T.x + T.w - 11, T.y + 15, 5.5, 3, 0, '#d8a860');
    wisps(ctx, S.x, S.y - 14, now, 6, 46, 9, 0.5);
  }

  // ---------------------------------------------------------------- the meal itself: what each dish looks like
  // left: how much of it is still on the plate (1 whole ... 0 gone)
  function drawFood(ctx, id, x, y, s, left) {
    if (id === 'stew') {
      circle(ctx, x, y, 8.4 * s, '#e0d6bc', OUT, 1.5);
      if (left > 0.04) {
        circle(ctx, x, y, (3.2 + 3.4 * left) * s, '#a8582a');
        for (const [a, r, col] of [[0.4, 3, '#d08a4a'], [2.2, 3.8, '#7a9a3a'], [4, 2.6, '#d8a050'], [5.3, 4, '#c8783a']]) if (r * 0.9 < 3.6 * left + 1.5) circle(ctx, x + Math.cos(a) * r * s * left, y + Math.sin(a) * r * s * left, 1.3 * s, col);
      } else circle(ctx, x, y, 3 * s, 'rgba(150,80,40,0.45)');
    } else if (id === 'pie') {
      const r = 9 * s, a0 = -Math.PI / 2 - 0.4;
      if (left < 0.04) { circle(ctx, x, y, r, '#cbbfa0', OUT, 1.5); return; }
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a0 + Math.PI * 2 * Math.min(1, left) - 0.001); ctx.closePath();
      ctx.fillStyle = '#c4803c'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.clip(); circle(ctx, x, y, r * 0.78, '#d9a054');
      for (let k = -2; k <= 2; k++) { line(ctx, x - r, y + k * 3 * s, x + r, y + k * 3 * s + 3 * s, 'rgba(130,70,24,0.55)', 1); line(ctx, x + k * 3 * s, y - r, x + k * 3 * s + 3 * s, y + r, 'rgba(130,70,24,0.55)', 1); }
      ctx.restore();
      if (left > 0.5) circle(ctx, x, y, 1.6 * s, '#5a2a14');
    } else if (id === 'broth') {
      circle(ctx, x, y, 6 * s, '#d9c8a0', OUT, 1.5);
      ellipse(ctx, x + 7.6 * s, y, 2.6 * s, 3.4 * s, 0, null, OUT, 2);
      circle(ctx, x, y, 4.6 * s, left > 0.05 ? '#e0a83a' : '#bda47a');
      if (left > 0.05) { circle(ctx, x - 1.2 * s, y - 1.2 * s, 1.6 * s, 'rgba(255,240,190,0.6)'); ctx.save(); ctx.globalAlpha = 0.6; circle(ctx, x, y, (1 - left) * 4.6 * s, '#bda47a'); ctx.restore(); }
    } else if (id === 'tarts') {
      circle(ctx, x, y, 9.4 * s, '#e8e0d0', OUT, 1.4);
      const N = s > 1.2 ? 5 : 3, n = Math.ceil(left * N - 0.001);
      for (let i = 0; i < n; i++) {
        const a = i / N * Math.PI * 2 + 0.5, rr = (N === 5 ? 4.6 : 3.4) * s * 0.9, tx = x + Math.cos(a) * rr, ty = y + Math.sin(a) * rr;
        circle(ctx, tx, ty, 3.3 * s, '#d8a050', OUT, 1); circle(ctx, tx, ty, 1.9 * s, i % 2 ? '#c0384a' : '#e8c15a');
      }
    }
  }
  // a dish in the chef's hands (drawn in his local space)
  function drawCarried(ctx, id) { ellipse(ctx, 1.5, 2.5, 8, 6, 0, 'rgba(0,0,0,0.22)'); circle(ctx, 0, 0, 7.2, '#ece4d0', OUT, 1.4); drawFood(ctx, id, 0, 0, 0.62, 1); }

  // ---------------------------------------------------------------- the eating cutscene
  // Someone orders: the camera eases to the long table, Gaspard carries the dish over and sets it down with a flourish, and
  // everyone in town (you and every other player's hero) sits and eats. About six seconds; moving, a key or a click skips
  // it, and leaving town (a fight, the portal) ends it at once. The real heroes are hidden meanwhile (hides) and a seated
  // copy of each is drawn in their place; an empty seat is just an empty seat.
  const WALK = 0.9, SERVE = 1.45, EAT0 = 1.7, HAPPY = 4.3, RET0 = 5.0, END = 5.8;
  const STAT_WORD = { hp: 'health', power: 'power', heal: 'healing', speed: 'speed' };
  const SAY = {
    stew: { serve: ['Scullery Stew! Thick enough to stand a spoon in.', 'Eleven years of peeling, now in a bowl. Eat!'], done: ['Not a drop left. The ogre never once cleared a bowl.', 'Hot, thick, gone. That is how stew should end.'] },
    pie: { serve: ['Pepper Pie, fresh. Mind the steam, mind your tongue.', 'Pepper Pie! Cry if you must. It is allowed.'], done: ['See? Nobody hits softly after a slice.', 'Crust, pepper, silence. The best review.'] },
    broth: { serve: ['Honeyroot Broth. Sip, do not gulp. It is not a race.', "Grandmother's broth, as it should taste. Mostly."], done: ['Healers ask for seconds. Always the healers.', 'Warm hands, warm hearts. Now go.'] },
    tarts: { serve: ['Quickfoot Tarts! Eat standing, run sitting. Whatever.', 'Tarts! Little, crisp, gone in two bites.'], done: ['The plate is empty before I turn around. Good.', 'Crumbs on the floor. Wonderful. Go!'] },
  };
  const BITE = { stew: 0.95, pie: 1.0, broth: 1.2, tarts: 0.72 };
  let feastSc = null;
  const ease = q => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
  const lerp = (a, b, k) => a + (b - a) * k;
  function angTo(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; }
  const snd = (n, o) => { try { if (typeof Sound !== 'undefined') Sound.play(n, o); } catch (e) { /* sound never stops a scene */ } };
  const mealLine = (m, by) => `${by ? `${by} ordered` : 'You ordered'} ${m.name}: +${m.buff.pct}% ${STAT_WORD[m.buff.stat] || ''} for the hour.`;

  function startFeastScene(m, by) {
    const g = folk.find(f => f.d.id === 'gaspard');
    if (!g || !present(g) || scene || !deps.diners) return false;
    endFeastScene(false);
    let list = [];
    try { list = deps.diners() || []; } catch (e) { list = []; }
    const diners = [];
    for (const d of list) {
      if (diners.length >= K.seats.length) break;
      if (!d || !d.ent || !d.cls || !isFinite(d.ent.x) || !isFinite(d.ent.y)) continue;
      diners.push({ ent: d.ent, cls: d.cls, spec: d.spec || null, name: d.name || 'Hero', me: !!d.me, i: diners.length, sx: d.ent.x, sy: d.ent.y, x: d.ent.x, y: d.ent.y, angle: d.ent.angle || 0, k: 0, left: 1, bites: 0, st: { t: 0, moving: false, action: null } });
    }
    if (!diners.length) return false;
    if (talk) endTalk();
    const p = deps.player;
    if (p) { p.target = null; p.interact = null; }
    const say = SAY[m.id] || SAY.stew;
    feastSc = { m, by, g, diners, t0: deps.now(), now: deps.now(), cue: {}, serve: say.serve[Math.floor(Math.random() * say.serve.length)], done: say.done[Math.floor(Math.random() * say.done.length)] };
    deps.holdCamera({ x: 890, y: 1100 }, 9, 1.35);
    return true;
  }
  function endFeastScene(announce) {
    const s = feastSc;
    if (!s) return;
    feastSc = null;
    const H = s.g.home;
    s.g.x = H.x; s.g.y = H.y; s.g.angle = Math.PI / 2; s.g.bubble = null; s.g.carry = null; s.g.pose = null; s.g.st.moving = false;
    if (deps) { deps.holdCamera(null); if (announce) deps.toast(mealLine(s.m, s.by)); }
  }
  // the real heroes seated at the table are not drawn (nor their name tags)
  const hides = ent => !!feastSc && feastSc.diners.some(d => d.ent === ent);

  function tickFeast(dt, now) {
    const s = feastSc, T = now - s.t0, g = s.g, H = g.home, m = s.m;
    s.now = now;
    if (T >= END) { endFeastScene(true); return; }
    const mv = deps.moving ? deps.moving() : null;
    if (T > 0.15 && mv) { endFeastScene(true); return; }
    // Gaspard: out to the table with the dish, the flourish, then he watches them eat and walks home
    const p1 = ease((T - 0.2) / 0.7), p2 = ease((T - 4.9) / 0.7);
    const out = T < 4.9 ? p1 : 1 - p2, px = g.x, py = g.y;
    g.x = lerp(H.x, K.cookAt.x, out); g.y = lerp(H.y, K.cookAt.y, out);
    const walking = (T >= 0.2 && T < 0.9) || (T >= 4.9 && T < 5.6);
    if (walking) g.angle = angTo(g.angle, Math.atan2(g.y - py, g.x - px) || 0, 0.4); else g.angle = angTo(g.angle, T < 4.9 ? 0 : Math.PI / 2, Math.min(1, dt * 6));
    g.st.moving = walking;
    g.carry = T >= 0.2 && T < SERVE ? m.id : null;
    g.pose = T >= SERVE && T < SERVE + 0.8 ? 'flourish' : null;
    g.goal = null;
    g.bubble = T >= 1.55 && T < 4.0 ? s.serve : T >= 4.4 && T < END - 0.2 ? s.done : null;
    // sounds
    const cue = (k, at, fn) => { if (T >= at && !s.cue[k]) { s.cue[k] = 1; fn(); } };
    cue('serve', 1.3, () => snd('feast-serve', { vol: 0.9 }));
    cue('clink1', 1.9, () => snd('feast-clink', { vol: 0.8 }));
    cue('clink2', 3.4, () => snd('feast-clink', { vol: 0.6, rate: 1.08 }));
    cue('sting', HAPPY, () => snd('feast-sting', { vol: 0.9 }));
    // the diners: walk to the seat, sit, eat, stand and go back where they were
    const P = BITE[m.id] || 1;
    for (const d of s.diners) {
      const seat = K.seats[d.i], st = d.st, ox = d.x, oy = d.y;
      st.t = now;
      if (T < WALK) {
        const q = ease(T / WALK);
        d.x = lerp(d.sx, seat.x, q); d.y = lerp(d.sy, seat.y, q);
        d.angle = q < 0.7 ? angTo(d.angle, Math.atan2(seat.y - d.sy, seat.x - d.sx), 0.35) : angTo(d.angle, seat.a, 0.3);
        st.moving = q < 0.97;
      } else if (T < RET0) {
        d.x = seat.x; d.y = seat.y; d.angle = seat.a; st.moving = false;
      } else {
        const q = ease((T - RET0) / (END - RET0)), e = d.ent;
        d.x = lerp(seat.x, isFinite(e.x) ? e.x : d.sx, q); d.y = lerp(seat.y, isFinite(e.y) ? e.y : d.sy, q);
        d.angle = angTo(d.angle, Math.atan2(d.y - oy, d.x - ox) || seat.a, 0.35);
        st.moving = q < 0.97;
      }
      d.k = T < RET0 ? ease((T - (WALK - 0.35)) / 0.4) : 1 - ease((T - RET0) / 0.3);
      d.left = 1 - Math.min(1, Math.max(0, (T - EAT0 - d.i * 0.12) / (HAPPY - EAT0 - 0.2)));
      if (T >= EAT0 && T < HAPPY && d.left > 0.02) {
        const n = Math.floor((T - EAT0) / P + d.i * 0.27);
        if (n > d.bites) { d.bites = n; if (d.i === 0 || d.i === 2) snd('feast-chew', { vol: 0.5, key: 'feast-chew' + d.i, minGap: 0.3 }); }
      }
    }
  }
  // what's on the table during the scene: the dish set down, then a portion on each plate shrinking as they eat
  function groundMeal(ctx, now) {
    const s = feastSc;
    if (!s) return;
    const T = now - s.t0, id = s.m.id;
    if (T >= SERVE && T < EAT0 + 0.5) { ctx.save(); ctx.globalAlpha = T < EAT0 ? 1 : 1 - (T - EAT0) / 0.5; drawFood(ctx, id, K.dish.x, K.dish.y, 1.5, 1); ctx.restore(); }
    if (T >= EAT0 - 0.1) for (const d of s.diners) {
      const pl = K.plates[d.i];
      ctx.save(); ctx.globalAlpha = Math.min(1, (T - EAT0 + 0.1) / 0.4); drawFood(ctx, id, pl.x, pl.y, 1, d.left); ctx.restore();
    }
  }
  function drawSpark(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a;
    poly(ctx, [x, y - r, x + r * 0.3, y - r * 0.3, x + r, y, x + r * 0.3, y + r * 0.3, x, y + r, x - r * 0.3, y + r * 0.3, x - r, y, x - r * 0.3, y - r * 0.3], '#ffe68a', OUT, 0.8);
    ctx.restore();
  }
  // steam over everything, and the happy sparkles
  function drawMealOver(ctx, now) {
    const s = feastSc;
    if (!s) return;
    const T = now - s.t0;
    if (T >= SERVE && T < EAT0 + 0.6) wisps(ctx, K.dish.x, K.dish.y - 4, now, 4, 30, 7, 0.45 * (T < EAT0 ? 1 : 1 - (T - EAT0) / 0.6));
    if (T >= EAT0 && T < HAPPY) for (const d of s.diners) if (d.left > 0.12) { const pl = K.plates[d.i]; wisps(ctx, pl.x, pl.y - 4, now, 3, 22, 5, 0.42 * Math.min(1, d.left * 1.6), d.i * 0.13); }
    if (T >= HAPPY && T < HAPPY + 1.2) for (const d of s.diners) {
      const q = (T - HAPPY) / 1.2;
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + T * 2.2 + d.i; drawSpark(ctx, d.x + Math.cos(a) * (16 + q * 18), d.y - 22 + Math.sin(a) * (10 + q * 8) - q * 10, 3.4 - q * 1.6, 1 - q); }
    }
  }
  // a seated hero (their own picture, sat down) and the arm bringing the food up to the mouth
  function drawDiner(ctx, d, scale) {
    const s = feastSc;
    if (!s) return;
    const T = s.now - s.t0, id = s.m.id, P = BITE[id] || 1;
    const eating = T >= EAT0 - 0.2 && T < HAPPY + 0.15 && d.k > 0.9 && d.left > 0.02;
    const u = eating ? ((T - EAT0) / P + d.i * 0.27 + 10) % 1 : 0;
    const hop = T >= HAPPY && T < HAPPY + 0.75 ? Math.abs(Math.sin((T - HAPPY) / 0.75 * Math.PI * 2)) * 5 : 0;
    const bob = eating && u > 0.6 && u < 0.85 ? Math.abs(Math.sin(T * 17)) * 0.9 : 0;
    drawHero(ctx, d.cls, d.x, d.y, d.angle, d.st, scale, { spec: d.spec, emote: d.k > 0.001 ? { kind: 'sit', t: T, k: d.k } : null, lift: hop + bob });
    if (!eating) return;
    const a = d.angle, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx, pl = K.plates[d.i];
    const mouth = { x: d.x + dx * 15 + qx * 2, y: d.y + dy * 15 + qy * 2 - 3 - hop };
    const e = u < 0.3 ? 0 : u < 0.6 ? ease((u - 0.3) / 0.3) : u < 0.82 ? 1 : 1 - ease((u - 0.82) / 0.18);
    const dip = u < 0.3 ? Math.sin(u / 0.3 * Math.PI) * 1.5 : 0;
    const hx = lerp(pl.x, mouth.x, e), hy = lerp(pl.y, mouth.y, e) - Math.sin(e * Math.PI) * 5 + dip;
    const sh = { x: d.x + qx * 13 + dx * 2, y: d.y + qy * 13 + dy * 2 - 4 - hop };
    const el = { x: (sh.x + hx) / 2 + qx * 6, y: (sh.y + hy) / 2 + qy * 6 };
    limb(ctx, [sh.x, sh.y, el.x, el.y, hx, hy], '#d9b490', 3.2);
    const loaded = u >= 0.12 && u < 0.64;
    if (id === 'broth') {
      circle(ctx, hx, hy, 4.2, '#d9c8a0', OUT, 1.3); circle(ctx, hx, hy, 3, loaded ? '#e0a83a' : '#bda47a'); circle(ctx, hx - 0.8, hy - 0.8, 1, 'rgba(255,240,190,0.6)');
    } else if (id === 'tarts') {
      if (u < 0.66) { circle(ctx, hx, hy, 3.6, '#d8a050', OUT, 1.2); circle(ctx, hx, hy, 2.1, d.i % 2 ? '#c0384a' : '#e8c15a'); }
      circle(ctx, hx + 1.5, hy + 1.5, 3, '#ecc8a2', OUT, 1.2);
    } else {
      line(ctx, hx + dx * 5, hy + dy * 5, hx - dx * 6, hy - dy * 6, OUT, 3.6);
      line(ctx, hx + dx * 5, hy + dy * 5, hx - dx * 6, hy - dy * 6, '#b9bec4', 1.8);
      if (id === 'stew') { circle(ctx, hx - dx * 7, hy - dy * 7, 2.7, '#b9bec4', OUT, 1); if (loaded) circle(ctx, hx - dx * 7, hy - dy * 7, 1.8, '#a8582a'); }
      else { for (const o of [-1.6, 0, 1.6]) line(ctx, hx - dx * 6 + qx * o, hy - dy * 6 + qy * o, hx - dx * 9.5 + qx * o, hy - dy * 9.5 + qy * o, '#b9bec4', 1); if (loaded) circle(ctx, hx - dx * 8, hy - dy * 8, 1.9, '#d9a054'); }
      circle(ctx, hx + dx * 1.5, hy + dy * 1.5, 3, '#ecc8a2', OUT, 1.2);
    }
  }

  // ---------------------------------------------------------------- talking
  let talk = null;   // { f, lines, i, choices, node }
  const talking = f => talk && talk.f === f;
  const box = () => {
    let el = document.getElementById('dialogue');
    if (!el) {
      el = document.createElement('div'); el.id = 'dialogue'; el.className = 'hidden';
      document.body.appendChild(el);
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.addEventListener('click', e => {
        const c = e.target.closest('[data-c]');
        if (c) { choose(Number(c.dataset.c)); return; }
        if (e.target.closest('.dl-next') || e.target.closest('.dl-line')) next();
        if (e.target.closest('.dl-x')) endTalk();
      });
    }
    return el;
  };
  function interactables() {
    return folk.filter(f => deps && present(f) && !f.walk).map(f => ({ get x() { return f.x; }, get y() { return f.y; }, r: 22, reach: 80, label: f.d.name, open: () => startTalk(f) }));
  }
  function startTalk(f) {
    const entry = f.d.talk.find(t => matches(t.when)) || f.d.talk[f.d.talk.length - 1];
    talk = { f, lines: entry.lines || [], i: 0, choices: entry.choices || null, node: entry };
    render();
  }
  function enterNode(id) {
    const n = talk && talk.f.d.nodes && talk.f.d.nodes[id];
    if (!n) { endTalk(); return; }
    talk.lines = n.lines || []; talk.i = 0; talk.choices = n.choices || null; talk.node = n;
    if (n.set) { state().flags[n.set] = 1; commit(); }
    if (n.give) give(n.give);
    render();
    if (n.action === 'feast' && !(n.lines && n.lines.length)) openFeasts();
    if (n.action === 'fish-shop' && !(n.lines && n.lines.length)) { endTalk(); deps.fishShop(); }
  }
  function give(id) {
    const g = GIFTS[id], hero = deps.hero(), s = state();
    if (!g || !hero) return;
    s.gifts[hero] = s.gifts[hero] || {};
    if (s.gifts[hero][id]) return;
    s.gifts[hero][id] = 1; commit();
    deps.addItem('gift_' + id);
    deps.toast(`You received ${g.name}.`);
  }
  function next() {
    if (!talk) return;
    if (talk.i < talk.lines.length - 1) { talk.i += 1; render(); return; }
    if (talk.node && talk.node.action === 'feast') { openFeasts(); return; }
    if (talk.node && talk.node.action === 'fish-shop') { endTalk(); deps.fishShop(); return; }
    if (!talk.choices || !talk.choices.length) endTalk();
  }
  function choose(i) {
    const c = talk && talk.choices && talk.choices[i];
    if (!c) return;
    if (c.next) enterNode(c.next); else endTalk();
  }
  function endTalk() { talk = null; box().classList.add('hidden'); }
  function render() {
    const el = box();
    if (!talk) { el.classList.add('hidden'); return; }
    const last = talk.i >= talk.lines.length - 1, d = talk.f.d;
    const choices = last && talk.choices && talk.choices.length ? `<div class="dl-choices">${talk.choices.map((c, i) => `<button type="button" data-c="${i}">${esc(c.text)}</button>`).join('')}</div>` : '';
    el.innerHTML = `<header><b>${esc(d.name)}</b><small>${esc(d.title || '')}</small><button type="button" class="dl-x" aria-label="Close">×</button></header>
      <p class="dl-line">${esc(talk.lines[talk.i] || '')}</p>${choices || `<button type="button" class="dl-next">${last ? (talk.node && talk.node.action === 'feast' ? 'See the board' : talk.node && talk.node.action === 'fish-shop' ? 'Show the catch' : 'Goodbye') : 'Next'}</button>`}`;
    el.classList.remove('hidden');
    if (typeof Sound !== 'undefined' && talk.lines[talk.i]) Sound.play('npc-talk', { vol: 0.6, key: 'npc-talk', minGap: 0.15 });
  }
  const isTalking = () => !!talk;
  // walk away and the conversation ends
  function checkDistance() { if (talk && deps.player && Math.hypot(deps.player.x - talk.f.x, deps.player.y - talk.f.y) > 200) endTalk(); }

  // ---------------------------------------------------------------- feasts
  function feast() {
    const f = state().feast;
    if (!f || !(f.until > Date.now())) return null;
    const m = MEALS.find(x => x.id === f.id);
    return m ? { meal: m, left: f.until - Date.now() } : null;
  }
  function openFeasts() {
    const el = box(), g = deps.gold(), cur = feast();
    el.innerHTML = `<header><b>Gaspard's board</b><small>One order feeds everyone in town, for an hour · <i class="coin"></i>${g}</small><button type="button" class="dl-x" aria-label="Close">×</button></header>
      ${cur ? `<p class="dl-line">Well fed: <b>${esc(cur.meal.name)}</b> · ${Math.ceil(cur.left / 60000)}m left. A new order replaces it.</p>` : ''}
      <div class="dl-feasts">${MEALS.map(m => `<button type="button" class="dl-feast" data-f="${m.id}"${g < m.cost ? ` disabled data-tip="${m.cost - g} gold short"` : ''}>
        <b>${esc(m.name)}</b><span>${esc(m.desc)}</span><em>+${m.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[m.buff.stat] || ''}</em><i class="coin"></i><u>${m.cost}</u></button>`).join('')}</div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('.dl-feast').forEach(b => b.addEventListener('click', () => {
      const m = MEALS.find(x => x.id === b.dataset.f);
      if (!m || deps.gold() < m.cost) return;
      if (deps.orderFeast(m.id) === false) return;
      deps.spendGold(m.cost);
      endTalk();
    }));
  }
  // someone ordered: everyone in town eats
  function eat(id, by) {
    const m = MEALS.find(x => x.id === id);
    if (!m) return;
    state().feast = { id, until: Date.now() + FEAST_MS }; commit();
    deps.onFeast();
    // in town the meal is a little scene (the toast comes when it ends); anywhere else, just the toast
    if (!(deps.inTown && deps.inTown() && startFeastScene(m, by))) deps.toast(mealLine(m, by));
  }
  // the feast's bonus as gear totals (inventory.js adds it)
  function feastTotals(clsId) {
    const f = feast();
    if (!f) return null;
    const { stat, pct } = f.meal.buff;
    if (stat === 'hp') return { hp: Math.round(1100 * pct / 100) };
    if (stat === 'speed') return { haste: pct };
    if (stat === 'heal') { const c = CLASSES.find(x => x.id === clsId); return c && c.role === 'healer' ? { main: pct * 10 } : { hp: Math.round(1100 * pct / 200) }; }
    return { main: pct * 10 };
  }

  let listening = false;
  // any key or click skips the scene (after a beat: the click that ordered it is still settling)
  function skipInput(e) {
    if (!feastSc || e.repeat || (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key))) return;
    if (deps.now() - feastSc.t0 > 0.25) endFeastScene(true);
  }
  return { init(d) { deps = d; if (!listening && typeof window !== 'undefined') { listening = true; window.addEventListener('keydown', skipInput, true); window.addEventListener('mousedown', skipInput, true); } }, update, entities, drawGround, drawLabels, interactables, isTalking, endTalk, checkDistance, feast, feastTotals, eat, startArrival, hides, feastScene: () => feastSc };
})();
