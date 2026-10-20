// Pastimes: everything to do in Emberfall between pulls.
//   Feats and titles (FEATS in feats-data.js): achievements, some granting a title shown under your name.
//   Secrets (TOWN_SECRETS in town-secrets.js): little finds around town, only noticed up close; more after each boss.
//   The bounty board (BOUNTIES in bounty-data.js): three notices a week, gold for each one done.
//   Fishing (FISH in fish-data.js): cast into the pond, wait for the bite, click. The angler buys your catch.
//   Emotes: /sit /wave /dance /cheer /bow /point /laugh in chat.
//   The Logbook (L): feats (and your title), secrets found, the Armory (every item you've held), your catch.
//   The story (STORY in story-data.js): a prologue on your first visit, why things are as they are.
// Progress lives in the save under 'pastimes'.

const Pastimes = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const D = name => (typeof window !== 'undefined' && typeof window[name] !== 'undefined' ? window[name] : null);
  const FEATS_ = () => (typeof FEATS !== 'undefined' ? FEATS : []);
  const SECRETS_ = () => (typeof TOWN_SECRETS !== 'undefined' ? TOWN_SECRETS : []);
  const BOUNTIES_ = () => (typeof BOUNTIES !== 'undefined' ? BOUNTIES : []);
  const FISH_ = () => (typeof FISH !== 'undefined' ? FISH : []);
  const STORY_ = () => (typeof STORY !== 'undefined' ? STORY : null);
  let deps = null;   // from main: see init

  // ---------------------------------------------------------------- saved state
  function st() {
    let s = Save.get('pastimes');
    if (!s || typeof s !== 'object') { s = {}; Save.set('pastimes', s); }
    s.feats = s.feats || {}; s.secrets = s.secrets || {}; s.stats = s.stats || {}; s.creel = s.creel || {};
    s.seenItems = s.seenItems || {}; s.flawless = s.flawless || {}; s.best = s.best || {}; s.story = s.story || {};
    s.bounty = s.bounty || { week: -1, prog: {}, done: {} };
    return s;
  }
  const commit = () => Save.commit();
  const bump = (k, n = 1) => { const s = st(); s.stats[k] = (s.stats[k] || 0) + n; commit(); };
  const stat = k => st().stats[k] || 0;

  // ---------------------------------------------------------------- a small card that rises for a moment (a feat, a find)
  function notice(kind, title, sub) {
    let el = document.getElementById('pt-notice');
    if (!el) { el = document.createElement('div'); el.id = 'pt-notice'; document.body.appendChild(el); }
    const card = document.createElement('div');
    card.className = 'pt-card';
    card.innerHTML = `<small>${esc(kind)}</small><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    el.appendChild(card);
    setTimeout(() => card.classList.add('out'), 4200);
    setTimeout(() => card.remove(), 5000);
  }

  // ---------------------------------------------------------------- feats and titles
  const anyClear = (boss, mode) => Object.values(Save.get('heroes') || {}).some(h => {
    const c = h && h.clears && h.clears[boss];
    return c && (mode ? (c[mode] | 0) > 0 : (c.normal | 0) + (c.hard | 0) > 0);
  });
  const BOSS_IDS = () => (typeof BOSSES !== 'undefined' ? BOSSES.map(b => b.id) : []);
  function journalPages() {
    let n = 0;
    for (const h of Object.values(Save.get('heroes') || {})) for (const b of Object.values((h && h.journal && h.journal.moves) || {})) for (const m of Object.values(b || {})) if (m && m.pass > 0) n++;
    return n;
  }
  function giftCount() { const g = (Save.get('town') || {}).gifts || {}; return Object.values(g).reduce((n, h) => n + Object.keys(h || {}).length, 0); }
  function trialCount() { let n = 0; for (const h of Object.values(Save.get('heroes') || {})) n += Object.keys((h && h.trials) || {}).length; return n; }
  function heroesCleared() { return Object.values(Save.get('heroes') || {}).filter(h => h && h.clears && Object.values(h.clears).some(c => c && (c.normal || c.hard))).length; }
  function maxRarity() { let r = -1; for (const i of deps.items()) { const it = ITEMS[i.key]; if (it && it.rarity > r) r = it.rarity; } for (const k of Object.keys(st().seenItems)) { const it = ITEMS[k]; if (it && it.rarity > r) r = it.rarity; } return r; }
  function met(c) {
    const s = st();
    switch (c && c.type) {
      case 'clear': return c.boss ? anyClear(c.boss, c.mode) : BOSS_IDS().some(b => anyClear(b, c.mode));
      case 'clearAll': return BOSS_IDS().every(b => anyClear(b, c.mode));
      case 'clearNoDeaths': return c.boss ? !!(s.flawless[c.boss] && (c.mode ? s.flawless[c.boss][c.mode] : Object.values(s.flawless[c.boss]).some(Boolean))) : Object.values(s.flawless).some(f => c.mode ? f[c.mode] : Object.values(f).some(Boolean));
      case 'clearUnder': return (s.best[c.boss] || Infinity) <= c.secs;
      case 'pulls': return stat('pulls') >= c.n;
      case 'secrets': return Object.keys(s.secrets).length >= c.n;
      case 'gifts': return giftCount() >= c.n;
      case 'feasts': return stat('feasts') >= c.n;
      case 'fish': return c.fish ? (s.stats['fish:' + c.fish] || 0) > 0 : stat('fish') >= (c.n || 1);
      case 'journal': return journalPages() >= c.n;
      case 'bounties': return stat('bounties') >= c.n;
      case 'heroes': return heroesCleared() >= c.n;
      case 'emotes': return stat('emotes') >= c.n;
      case 'items': return maxRarity() >= c.rarity;
      case 'practice': return stat('practice') >= c.n;
      case 'trial': return trialCount() >= c.n;
      default: return false;
    }
  }
  function checkFeats(quiet) {
    const s = st();
    let any = false;
    for (const f of FEATS_()) {
      if (s.feats[f.id] || !met(f.check)) continue;
      s.feats[f.id] = Date.now(); any = true;
      if (!quiet) notice('Feat', f.name, f.title ? `Title: ${f.title}` : f.desc);
    }
    if (any) commit();
  }
  function grantFeat(id) {
    const f = FEATS_().find(x => x.id === id), s = st();
    if (!f || s.feats[id]) return;
    s.feats[id] = Date.now(); commit();
    notice('Feat', f.name, f.title ? `Title: ${f.title}` : f.desc);
  }
  function title() { const s = st(), f = s.title && FEATS_().find(x => x.id === s.title && x.title); return f && s.feats[f.id] ? f.title : null; }
  function setTitle(id) { st().title = id || null; commit(); deps.onTitle(title()); }

  // ---------------------------------------------------------------- events from the game
  function event(type, d = {}) {
    const s = st();
    if (type === 'pull') { if (d.practice) bump('practice'); else bump('pulls'); }
    if (type === 'clear' && !d.practice) {
      if (!d.deaths) { const f = s.flawless[d.boss] = s.flawless[d.boss] || {}; f[d.mode] = 1; }
      if (d.secs > 0 && d.secs < (s.best[d.boss] || Infinity)) s.best[d.boss] = d.secs;
      commit();
      progress('clear', d);
    }
    if (type === 'feast') { bump('feasts'); progress('feast', d); }
    if (type === 'fish') { bump('fish'); bump('fish:' + d.id); progress('fish', d); }
    if (type === 'emote') bump('emotes');
    if (type === 'item' && d.key) { s.seenItems[d.key] = 1; commit(); }
    if (type === 'secret') progress('secrets', d);
    checkFeats();
    renderBook();
  }

  // ---------------------------------------------------------------- secrets around town
  function secretsHere() {
    const s = st();
    return SECRETS_().filter(x => !s.secrets[x.id] && deps.matches(x.when || {}));
  }
  function drawSecrets(ctx, now) {
    const p = deps.player;
    for (const x of secretsHere()) {
      const d = Math.hypot(p.x - x.at.x, p.y - x.at.y);
      if (d > 160) continue;
      const a = Math.max(0, 1 - d / 160) * (0.55 + Math.sin(now * 3 + x.at.x) * 0.25);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x.at.x, x.at.y);
      const look = x.look || 'glint';
      if (look === 'loose-stone') { ctx.fillStyle = '#8a8070'; ctx.fillRect(-7, -4, 14, 8); ctx.strokeStyle = '#3a3024'; ctx.strokeRect(-7, -4, 14, 8); }
      else if (look === 'carving') { ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 1.6); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke(); }
      else if (look === 'hollow') { ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (look === 'coin') { ctx.fillStyle = '#e8c15a'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill(); }
      else if (look === 'flowers') { for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#e87aa8', '#f2e6c8', '#b89cff'][i % 3]; ctx.beginPath(); ctx.arc(Math.cos(i * 1.3) * 7, Math.sin(i * 1.3) * 5, 2, 0, Math.PI * 2); ctx.fill(); } }
      else if (look === 'footprints') { ctx.fillStyle = '#2a1e12'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(i * 9 - 13, (i % 2) * 6 - 3, 2.5, 4, 0.3, 0, Math.PI * 2); ctx.fill(); } }
      else if (look === 'note') { ctx.fillStyle = '#efe2c0'; ctx.rotate(0.2); ctx.fillRect(-6, -4, 12, 8); }
      // and always a faint glint, so a sharp eye catches it
      ctx.globalAlpha = a * (0.4 + Math.max(0, Math.sin(now * 2.2 + x.at.y)) * 0.6);
      ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.moveTo(0, -15); ctx.lineTo(0, -5); ctx.stroke();
      ctx.restore();
    }
  }
  function secretInteractables() {
    return secretsHere().map(x => ({ x: x.at.x, y: x.at.y, r: x.r || 24, reach: 70, label: 'Something here', open: () => find(x) }));
  }
  function find(x) {
    const s = st();
    if (s.secrets[x.id]) return;
    s.secrets[x.id] = Date.now();
    if (x.set) { const t = Save.get('town') || {}; t.flags = t.flags || {}; t.flags[x.set] = 1; Save.set('town', t); }
    commit();
    const r = x.reward || {};
    let got = '';
    if (r.gold) { deps.addGold(r.gold); got = `${r.gold} gold`; }
    if (r.gift && deps.giveGift(r.gift)) got = (typeof TOWN_GIFTS !== 'undefined' && TOWN_GIFTS[r.gift] ? TOWN_GIFTS[r.gift].name : 'a gift');
    if (r.title) grantFeat(r.title);
    card(x.name, x.lines || [], got);
    event('secret', { id: x.id });
  }
  // the find, told in the same box the townsfolk use
  function card(name, lines, got) {
    let el = document.getElementById('find-card');
    if (!el) {
      el = document.createElement('div'); el.id = 'find-card'; el.className = 'hidden'; document.body.appendChild(el);
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.addEventListener('click', e => { if (e.target.closest('button')) el.classList.add('hidden'); });
    }
    const n = Object.keys(st().secrets).length, of = SECRETS_().length;
    el.innerHTML = `<header><small>A secret · ${n} of ${of}</small><b>${esc(name)}</b></header>${lines.map(l => `<p>${esc(l)}</p>`).join('')}${got ? `<p class="fc-got">Found: ${esc(got)}</p>` : ''}<button type="button" class="btn2">Close</button>`;
    el.classList.remove('hidden');
  }

  // ---------------------------------------------------------------- the bounty board
  const BOARD = { x: 1380, y: 300 };
  const week = () => Math.floor((Date.now() / 86400000 + 3) / 7);   // weeks turn over on Monday
  function rngFor(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296); }
  function weekly() {
    const s = st(), w = week();
    // the week's three notices are pinned when the week starts, so beating a boss mid-week doesn't reshuffle the board
    if (s.bounty.week !== w || !Array.isArray(s.bounty.ids)) {
      const pool = BOUNTIES_().filter(b => (!b.goal.boss || deps.bossOpen(b.goal.boss)) && (b.goal.type !== 'feast' || deps.beaten('grubnak')));
      const r = rngFor(w), copy = pool.slice(), ids = [];
      while (ids.length < 3 && copy.length) ids.push(copy.splice(Math.floor(r() * copy.length), 1)[0].id);
      s.bounty = { week: w, ids, prog: s.bounty.week === w ? s.bounty.prog || {} : {}, done: s.bounty.week === w ? s.bounty.done || {} : {} };
      commit();
    }
    return s.bounty.ids.map(id => BOUNTIES_().find(b => b.id === id)).filter(Boolean);
  }
  function progress(kind, d) {
    const s = st(), list = weekly();
    let any = false;
    for (const b of list) {
      const g = b.goal;
      if (s.bounty.done[b.id] || (s.bounty.prog[b.id] || 0) >= (g.n || 1)) continue;
      let hit = false;
      if (kind === 'clear') {
        const bossOk = !g.boss || g.boss === d.boss, modeOk = !g.mode || g.mode === d.mode;
        if (g.type === 'clear') hit = bossOk && modeOk;
        if (g.type === 'clearNoDeaths') hit = bossOk && !d.deaths;
        if (g.type === 'clearUnder') hit = bossOk && d.secs <= g.secs;
        if (g.type === 'noAvoidable') hit = bossOk && !d.avoidable;
      }
      if (kind === 'fish' && g.type === 'fish') hit = true;
      if (kind === 'feast' && g.type === 'feast') hit = true;
      if (kind === 'secrets' && g.type === 'secrets') hit = true;
      if (kind === 'practice' && g.type === 'practice') hit = true;
      if (hit) { s.bounty.prog[b.id] = (s.bounty.prog[b.id] || 0) + 1; any = true; if (s.bounty.prog[b.id] >= (g.n || 1)) notice('Bounty done', b.name, 'Collect it at the notice board'); }
    }
    if (any) commit();
  }
  function openBoard() {
    const s = st(), list = weekly(), el = panel('bounties', 'The notice board');
    const daysLeft = 7 - Math.floor((Date.now() / 86400000 + 3) % 7);
    el.querySelector('.pt-body').innerHTML = `<p class="pt-note">New notices in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.</p>` + (list.length ? list.map(b => {
      const n = s.bounty.prog[b.id] || 0, need = b.goal.n || 1, done = s.bounty.done[b.id], ready = !done && n >= need;
      return `<div class="pt-bounty${done ? ' done' : ''}"><div><b>${esc(b.name)}</b><p>${esc(b.desc)}</p><small>${done ? 'Paid' : `${Math.min(n, need)} of ${need}`}</small></div>
        <button type="button" class="${ready ? 'cta' : 'btn2'}" data-claim="${b.id}"${ready ? '' : ' disabled'}><i class="coin"></i>${b.reward.gold}</button></div>`;
    }).join('') : '<p class="pt-note">The board is bare this week.</p>');
    el.querySelectorAll('[data-claim]').forEach(btn => btn.addEventListener('click', () => {
      const b = list.find(x => x.id === btn.dataset.claim);
      if (!b || s.bounty.done[b.id] || (s.bounty.prog[b.id] || 0) < (b.goal.n || 1)) return;
      s.bounty.done[b.id] = 1; commit();
      deps.addGold(b.reward.gold); bump('bounties'); checkFeats();
      openBoard();
    }));
  }
  function drawBoard(ctx) {
    const { x, y } = BOARD;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 14, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3c24'; ctx.fillRect(-20, -6, 4, 22); ctx.fillRect(16, -6, 4, 22);
    ctx.fillStyle = '#7a5432'; ctx.fillRect(-24, -28, 48, 26); ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 2; ctx.strokeRect(-24, -28, 48, 26);
    const s = st(), list = weekly(), ready = list.some(b => !s.bounty.done[b.id] && (s.bounty.prog[b.id] || 0) >= (b.goal.n || 1));
    [[-18, -25, '#efe2c0'], [-3, -24, '#e6d6b0'], [9, -26, '#efe2c0']].forEach(([px, py, c], i) => { ctx.fillStyle = s.bounty.done[(list[i] || {}).id] ? '#9a8a6a' : c; ctx.fillRect(px, py, 11, 14); });
    if (ready) { ctx.fillStyle = '#ffd65a'; ctx.font = '800 16px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -34 + Math.sin(Date.now() / 250) * 2); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- fishing
  const POND = { x: 590, y: 1370, rx: 120, ry: 62 };
  const inPond = (x, y) => ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 < 1;
  let rod = null;   // { x, y, state: 'wait' | 'bite' | 'reel', at, fish, need }
  function pondClick(m, now) {
    const p = deps.player;
    if (rod && rod.state === 'bite') { hook(now); return true; }
    if (rod && rod.state === 'reel') { reelClick(now); return true; }
    if (!inPond(m.x, m.y)) { if (rod) rod = null; return false; }
    if (Math.hypot(p.x - m.x, p.y - m.y) > 260) { deps.toast('Get closer to the water to cast.'); return true; }
    if (!FISH_().length) return true;
    rod = { x: m.x, y: m.y, state: 'wait', at: now + 2.5 + Math.random() * 6 };
    p.angle = Math.atan2(m.y - p.y, m.x - p.x);
    return true;
  }
  function pickFish() {
    const can = FISH_().filter(f => !f.when || deps.matches(f.when)), W = [60, 28, 10, 2];
    const tot = can.reduce((n, f) => n + W[f.rarity | 0], 0);
    let r = Math.random() * tot;
    for (const f of can) { r -= W[f.rarity | 0]; if (r <= 0) return f; }
    return can[0];
  }
  function hook(now) {
    const f = pickFish();
    if (!f) { rod = null; return; }
    if ((f.rarity | 0) >= 2) { rod = Object.assign(rod, { state: 'reel', fish: f, at: now + 4, need: f.rarity === 3 ? 3 : 2, got: 0, ring: now }); return; }
    land(f);
  }
  // a rare fish fights: three quick, timed clicks while the ring is small
  function reelClick(now) {
    const ph = ((now - rod.ring) % 1.1) / 1.1, good = ph > 0.72 && ph < 0.95;
    if (good) { rod.got++; rod.ring = now; if (rod.got >= rod.need) land(rod.fish); }
    else { deps.toast('It slipped the hook.'); rod = null; }
  }
  function land(f) {
    const s = st();
    s.creel[f.id] = (s.creel[f.id] || 0) + 1; commit();
    notice('Caught', f.name, f.desc);
    event('fish', { id: f.id });
    rod = null;
  }
  function tickFish(now) {
    if (!rod) return;
    const p = deps.player;
    if (p.target || p.dashMove || Math.hypot(p.x - rod.x, p.y - rod.y) > 300) { rod = null; return; }   // (walking off reels in)
    if (rod.state === 'wait' && now >= rod.at) { rod.state = 'bite'; rod.at = now + 0.9; }
    else if (rod.state === 'bite' && now >= rod.at) { deps.toast('Too slow: it got away.'); rod = null; }
    else if (rod.state === 'reel' && now >= rod.at) { deps.toast('It slipped the hook.'); rod = null; }
  }
  function drawPond(ctx, now) {
    ctx.save();
    ctx.fillStyle = '#5a7a3a'; ctx.beginPath(); ctx.ellipse(POND.x, POND.y + 4, POND.rx + 10, POND.ry + 9, 0, 0, Math.PI * 2); ctx.fill();   // the reedy bank
    const g = ctx.createRadialGradient(POND.x, POND.y, 10, POND.x, POND.y, POND.rx);
    g.addColorStop(0, '#2e6a8a'); g.addColorStop(1, '#1f4a64');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const k = (now * 0.25 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(POND.x - 30 + i * 30, POND.y - 10 + i * 8, 6 + k * 18, 3 + k * 8, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const [dx, dy] of [[-110, -20], [-96, 30], [104, -26], [112, 18], [-40, -60], [50, 58]]) { ctx.strokeStyle = '#4a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(POND.x + dx, POND.y + dy); ctx.lineTo(POND.x + dx - 2, POND.y + dy - 14); ctx.stroke(); }
    ctx.restore();
  }
  function drawRod(ctx, now) {
    if (!rod) return;
    const p = deps.player, dip = rod.state === 'bite' ? 3 + Math.sin(now * 30) * 2 : Math.sin(now * 2) * 1.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(240,240,230,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26 - 18); ctx.quadraticCurveTo((p.x + rod.x) / 2, Math.min(p.y, rod.y) - 30, rod.x, rod.y + dip); ctx.stroke();
    ctx.fillStyle = '#e85a4a'; ctx.beginPath(); ctx.arc(rod.x, rod.y + dip, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rod.x, rod.y + dip - 2, 2, Math.PI, 0); ctx.fill();
    if (rod.state === 'bite') { ctx.fillStyle = '#ffd65a'; ctx.font = '800 22px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText('!', rod.x, rod.y - 16); }
    if (rod.state === 'reel') {
      const ph = ((now - rod.ring) % 1.1) / 1.1, r = 34 - ph * 26;
      ctx.strokeStyle = ph > 0.72 && ph < 0.95 ? '#5fd0ff' : '#ff6a5a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(rod.x, rod.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(95,208,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rod.x, rod.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f2e6c8'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${rod.got} / ${rod.need}`, rod.x, rod.y - 40);
    }
    ctx.restore();
  }
  // the angler's stall: sell what you caught
  function openFishShop() {
    const s = st(), el = panel('fish-shop', 'Your catch');
    const rows = FISH_().filter(f => s.creel[f.id] > 0);
    const total = rows.reduce((n, f) => n + f.sell * s.creel[f.id], 0);
    el.querySelector('.pt-body').innerHTML = rows.length
      ? rows.map(f => `<div class="pt-fish r${f.rarity | 0}"><b>${esc(f.name)}</b><span>× ${s.creel[f.id]}</span><button type="button" class="btn2" data-sell="${f.id}"><i class="coin"></i>${f.sell}</button></div>`).join('') + `<div class="pt-foot"><button type="button" class="cta" data-sell="*"><i class="coin"></i>Sell all · ${total}</button></div>`
      : '<p class="pt-note">Nothing in your creel. The pond is south-west of the tavern.</p>';
    el.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => {
      const ids = b.dataset.sell === '*' ? rows.map(f => f.id) : [b.dataset.sell];
      let g = 0;
      for (const id of ids) { const f = FISH_().find(x => x.id === id); if (!f || !s.creel[id]) continue; if (b.dataset.sell === '*') { g += f.sell * s.creel[id]; s.creel[id] = 0; } else { g += f.sell; s.creel[id] -= 1; } }
      commit(); if (g) deps.addGold(g);
      openFishShop();
    }));
  }

  // ---------------------------------------------------------------- emotes
  const EMOTES = { sit: 'sits down', wave: 'waves', dance: 'dances', cheer: 'cheers', bow: 'bows', point: 'points', laugh: 'laughs' };
  function emote(e, kind, now) {
    if (!EMOTES[kind]) return false;
    e.emote = { kind, t0: now };
    return true;
  }
  // a little motion for each: drawn as an offset/rotation the main draw applies, and a word over the head
  function emoteLook(e, now) {
    const m = e.emote;
    if (!m) return null;
    const t = now - m.t0;
    if (m.kind !== 'sit' && t > 3.2) { e.emote = null; return null; }
    if (m.kind === 'sit' && (e.st.moving || t > 120)) { e.emote = null; return null; }
    const look = { dx: 0, dy: 0, rot: 0, squash: 1, word: t < 2.2 ? EMOTES[m.kind] : '' };
    if (m.kind === 'dance') { look.rot = Math.sin(t * 9) * 0.5; look.dy = -Math.abs(Math.sin(t * 9)) * 4; }
    if (m.kind === 'cheer') look.dy = -Math.abs(Math.sin(t * 7)) * 8;
    if (m.kind === 'bow') look.squash = 0.82 + Math.abs(Math.cos(Math.min(t, 1.2) * 2.6)) * 0.18;
    if (m.kind === 'sit') { look.squash = 0.78; look.dy = 4; }
    if (m.kind === 'laugh') look.dy = Math.sin(t * 22) * 1.2;
    if (m.kind === 'wave' || m.kind === 'point') look.rot = Math.sin(t * 8) * 0.08;
    return look;
  }

  // ---------------------------------------------------------------- the Logbook (L)
  let bookTab = 'feats';
  function panel(id, heading) {
    let el = document.getElementById('pt-' + id);
    if (!el) {
      el = document.createElement('div'); el.id = 'pt-' + id; el.className = 'pt-panel hidden';
      el.innerHTML = `<header><h3>${esc(heading)}</h3><button type="button" class="close" aria-label="Close">×</button></header><div class="pt-body"></div>`;
      document.body.appendChild(el);
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.querySelector('.close').addEventListener('click', () => el.classList.add('hidden'));
    }
    el.classList.remove('hidden');
    return el;
  }
  function closeAll() { document.querySelectorAll('.pt-panel').forEach(p => p.classList.add('hidden')); }
  const anyOpen = () => [...document.querySelectorAll('.pt-panel')].some(p => !p.classList.contains('hidden'));
  function openBook() { panel('book', 'Logbook'); renderBook(); }
  function renderBook() {
    const el = document.getElementById('pt-book');
    if (!el || el.classList.contains('hidden')) return;
    const s = st();
    const tabs = [['feats', 'Feats'], ['secrets', 'Secrets'], ['armory', 'Armory'], ['catch', 'Catch']];
    let body = '';
    if (bookTab === 'feats') {
      const fs = FEATS_(), got = fs.filter(f => s.feats[f.id]).length, titles = fs.filter(f => f.title && s.feats[f.id]);
      body = `<div class="pt-title"><label>Title</label><select class="pt-title-pick"><option value="">None</option>${titles.map(f => `<option value="${f.id}"${s.title === f.id ? ' selected' : ''}>${esc(f.title)}</option>`).join('')}</select><small>${got} of ${fs.length} feats</small></div>
        <div class="pt-feats">${[...fs.filter(f => s.feats[f.id]), ...fs.filter(f => !s.feats[f.id])].map(f => {
          // (a feat for a boss you haven't reached keeps that boss a surprise)
          const has = s.feats[f.id], hid = (f.hidden || (f.check && f.check.boss && !deps.bossOpen(f.check.boss))) && !has; return `<div class="pt-feat${has ? ' got' : ''}"><b>${hid ? '???' : esc(f.name)}</b><span>${hid ? 'A hidden feat.' : esc(f.desc)}</span>${f.title && !hid ? `<em>Title: ${esc(f.title)}</em>` : ''}</div>`; }).join('')}</div>`;
    } else if (bookTab === 'secrets') {
      const all = SECRETS_(), got = all.filter(x => s.secrets[x.id]);
      body = `<p class="pt-note">${got.length} of ${all.length} found. Some only appear after a boss falls.</p><div class="pt-feats">${all.map(x => s.secrets[x.id] ? `<div class="pt-feat got"><b>${esc(x.name)}</b><span>${esc((x.lines || [])[0] || '')}</span></div>` : `<div class="pt-feat"><b>???</b><span>Not found yet.</span></div>`).join('')}</div>`;
    } else if (bookTab === 'armory') {
      const keys = Object.keys(ITEMS).filter(k => !ITEMS[k].gift && ITEMS[k].tier > 0), seen = new Set([...Object.keys(s.seenItems), ...deps.items().map(i => i.key)]);
      const have = keys.filter(k => seen.has(k)).length;
      body = `<p class="pt-note">${have} of ${keys.length} pieces held at least once.</p><div class="pt-armory">${keys.map(k => { const it = ITEMS[k], on = seen.has(k); return `<i class="${on ? 'on' : ''}" style="--rc:${RARITY[it.rarity].color}${on ? `;background-image:url(${deps.iconURL(k)})` : ''}" data-tip="${on ? esc(it.name) : '???'}"></i>`; }).join('')}</div>`;
    } else {
      const fish = FISH_();
      body = `<p class="pt-note">Caught ${stat('fish')} in all. Sell your catch to the angler by the pond.</p><div class="pt-feats">${fish.map(f => { const n = s.stats['fish:' + f.id] || 0; return n ? `<div class="pt-feat got r${f.rarity | 0}"><b>${esc(f.name)}</b><span>${esc(f.desc)}</span><em>Caught ${n}</em></div>` : `<div class="pt-feat"><b>???</b><span>${['Common', 'Uncommon', 'Rare', 'Legendary'][f.rarity | 0]}</span></div>`; }).join('')}</div>`;
    }
    el.querySelector('.pt-body').innerHTML = `<nav class="pt-tabs">${tabs.map(([k, n]) => `<button type="button" data-tab="${k}" class="${bookTab === k ? 'on' : ''}">${n}</button>`).join('')}</nav>${body}`;
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { bookTab = b.dataset.tab; renderBook(); }));
    const pick = el.querySelector('.pt-title-pick');
    if (pick) pick.addEventListener('change', () => setTitle(pick.value));
  }

  // ---------------------------------------------------------------- the story
  function storyPages(which, done) {
    const S = STORY_(), pages = S && S[which];
    if (!pages || !pages.length) { if (done) done(); return; }
    let i = 0;
    const el = document.createElement('div');
    el.id = 'story';
    document.body.appendChild(el);
    const show = () => {
      const p = pages[i];
      el.innerHTML = `<div class="sy-page"><small>Emberfall</small><h2>${esc(p.h)}</h2>${p.body.map(b => `<p>${esc(b)}</p>`).join('')}
        <div class="sy-foot"><button type="button" class="linkish sy-skip">Skip</button><span>${pages.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span><button type="button" class="cta sy-next">${i < pages.length - 1 ? 'Next' : 'Into town'}</button></div></div>`;
      el.querySelector('.sy-next').addEventListener('click', () => { i++; if (i >= pages.length) end(); else show(); });
      el.querySelector('.sy-skip').addEventListener('click', end);
    };
    const end = () => { st().story[which] = 1; commit(); el.classList.add('out'); setTimeout(() => el.remove(), 500); if (done) done(); };
    el.addEventListener('mousedown', e => e.stopPropagation());
    show();
  }
  const storyOpen = () => !!document.getElementById('story');
  // the prologue, on your first visit to town
  function storyCheck() {
    if (storyOpen() || !STORY_() || st().story.prologue) return;
    storyPages('prologue');
  }

  // ---------------------------------------------------------------- each frame / drawing hooks
  let lastCheck = 0;
  function update(now, inTown) {
    tickFish(now);
    if (inTown && now - lastCheck > 1) { lastCheck = now; storyCheck(); }
  }
  function drawGround(ctx, now) { drawPond(ctx, now); drawBoard(ctx); drawSecrets(ctx, now); }
  function drawOver(ctx, now) { drawRod(ctx, now); }
  function interactables() {
    return [{ x: BOARD.x, y: BOARD.y - 10, r: 30, reach: 90, label: 'Notice board', open: openBoard }, ...secretInteractables()];
  }

  function init(d) {
    deps = d;
    // the pond is water: nobody walks across it
    for (const k of [-0.62, -0.2, 0.2, 0.62]) COLLIDERS.circles.push({ x: POND.x + k * POND.rx, y: POND.y, r: POND.ry * (1 - Math.abs(k) * 0.35) });
    checkFeats(true);
  }
  return { init, event, update, drawGround, drawOver, interactables, pondClick, emote, emoteLook, EMOTES, title, setTitle, openBook, closeAll, anyOpen, openFishShop, storyOpen, grantFeat, fishing: () => !!rod, rod: () => rod, notice };
})();
