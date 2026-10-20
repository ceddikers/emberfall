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

  // gifts are real items: registered with the rest (items.js) as gift_<id>
  const GIFT_BASE = { hp: { hp: 30, main: 8 }, power: { main: 14 }, heal: { main: 10, crit: 2 }, speed: { haste: 3, main: 6 } };
  if (typeof ITEMS !== 'undefined') for (const [id, g] of Object.entries(GIFTS)) {
    const key = 'gift_' + id;
    if (!ITEMS[key]) ITEMS[key] = { key, name: g.name, slot: 'accessory', atype: 'amulet', tier: 1, rarity: R_RARE, base: GIFT_BASE[g.stat] || GIFT_BASE.power, fxText: `<i>${esc(g.flavor || '')}</i>`, gift: true };
  }

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
    f.x = from.x; f.y = from.y; f.walk = { to: f.home };
    scene = { f, i: -1, lineAt: 0, lines: (f.d.entrance && f.d.entrance.lines) || [] };
    deps.focusCamera(f, 999);
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
    chipKey = key;
    el.classList.toggle('hidden', !f);
    if (f) { el.innerHTML = `Well fed<b>${Math.ceil(f.left / 60000)}m</b>`; Tip.set(el, `<b>${esc(f.meal.name)}</b><em>+${f.meal.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[f.meal.buff.stat] || ''}</em>${esc(f.meal.desc)}`); }
  }
  function update(dt, now, inTown) {
    if (deps && Math.floor(now) !== Math.floor(now - dt)) chip();
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
        if (d < 4) { f.walk = null; if (scene && scene.f === f) deps.focusCamera(null); }
        else { const st = Math.min(d, 95 * dt); f.x += dx / d * st; f.y += dy / d * st; f.angle = Math.atan2(dy, dx); moving = true; }
      } else if (f.d.wander > 0 && !talking(f)) {
        if (f.goal) {
          const dx = f.goal.x - f.x, dy = f.goal.y - f.y, d = Math.hypot(dx, dy);
          if (d < 3) { f.goal = null; f.rest = now + 2 + Math.random() * 5; }
          else { const st = Math.min(d, 40 * dt); f.x += dx / d * st; f.y += dy / d * st; f.angle = Math.atan2(dy, dx); moving = true; }
        } else if (now > f.rest) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * f.d.wander;
          f.goal = { x: f.home.x + Math.cos(a) * r, y: f.home.y + Math.sin(a) * r };
        }
      }
      f.st.moving = moving;
      // they turn to look at you when you're close
      if (!moving && p && Math.hypot(p.x - f.x, p.y - f.y) < 140) {
        let d = Math.atan2(p.y - f.y, p.x - f.x) - f.angle;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        f.angle += d * Math.min(1, dt * 5);
      }
    }
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
    hand(ctx, 5, -12, skin); hand(ctx, 5, 12, skin);
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
      const g = folk.find(f => f.d.id === 'gaspard'), x = (g ? g.home.x : 800) + 46, y = (g ? g.home.y : 1060) + 6;
      glow(ctx, x, y, 34, '#ff9a3a', 0.35 + Math.sin(now * 7) * 0.08);
      circle(ctx, x, y, 9, '#3a2a20', OUT, 1.5);
      for (let i = 0; i < 3; i++) circle(ctx, x + Math.sin(now * 9 + i * 2) * 2, y - 2 - i * 2, 4 - i, ['#ff6a1a', '#ffb03a', '#ffe68a'][i]);
      circle(ctx, x, y - 1, 7, 'rgba(40,40,46,0.9)', OUT, 1.5);   // the pot over it
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
  }
  function entities(scale) {
    return folk.filter(f => deps && present(f)).map(f => ({ kind: 'stagecraft', y: f.y, draw: ctx => drawFolk(ctx, f, scale) }));
  }
  // names over the folk you're near, and anyone's speech bubble
  function drawLabels(ctx, label, near) {
    for (const f of folk) {
      if (!deps || !present(f)) continue;
      if (near(f)) label(ctx, f.d.name, f.x, f.y - 34, '#cfe0b0', 11);
      if (f.bubble) bubble(ctx, f.x, f.y - 52, f.bubble);
    }
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
      <p class="dl-line">${esc(talk.lines[talk.i] || '')}</p>${choices || `<button type="button" class="dl-next">${last ? (talk.node && talk.node.action === 'feast' ? 'See the board' : 'Goodbye') : 'Next'}</button>`}`;
    el.classList.remove('hidden');
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
    el.innerHTML = `<header><b>Gaspard's board</b><small>One order feeds everyone in town, for an hour</small><button type="button" class="dl-x" aria-label="Close">×</button></header>
      ${cur ? `<p class="dl-line">You've eaten: <b>${esc(cur.meal.name)}</b>, ${Math.ceil(cur.left / 60000)} more minutes.</p>` : ''}
      <div class="dl-feasts">${MEALS.map(m => `<button type="button" class="dl-feast" data-f="${m.id}"${g < m.cost ? ' disabled' : ''}>
        <b>${esc(m.name)}</b><span>${esc(m.desc)}</span><em>+${m.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[m.buff.stat] || ''}</em><i class="coin"></i><u>${m.cost}</u></button>`).join('')}</div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('.dl-feast').forEach(b => b.addEventListener('click', () => {
      const m = MEALS.find(x => x.id === b.dataset.f);
      if (!m || deps.gold() < m.cost) return;
      deps.spendGold(m.cost);
      deps.orderFeast(m.id);
      endTalk();
    }));
  }
  // someone ordered: everyone in town eats
  function eat(id, by) {
    const m = MEALS.find(x => x.id === id);
    if (!m) return;
    state().feast = { id, until: Date.now() + FEAST_MS }; commit();
    deps.toast(`${by ? `${by} ordered` : 'You ordered'} ${m.name}. Everyone eats.`);
    deps.onFeast();
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

  return { init(d) { deps = d; }, update, entities, drawGround, drawLabels, interactables, isTalking, endTalk, checkDistance, feast, feastTotals, eat, startArrival };
})();
