// Loot chests and Need / Greed / Pass.
// A clear drops a chest (rollChest in items.js). Once the results screen is up, each item shows as a card: everyone
// who was in the raid picks Need (only if the hero they raided with can use it), Greed or Pass before the timer runs
// out (no pick = Pass). The host rolls 1-100 for everyone who didn't pass: the best Need wins, otherwise the best
// Greed. Bots don't roll. If everyone passes, the item is salvaged into a little gold for each player.
// Works the same solo (the host alone with bots) and with 2-4 people.
//
// Messages:
//   host -> all    { t: 'chest', id, boss, mode, k: [item keys], who: [[playerId, classId]], gold, secs }
//   player -> host { t: 'lootc', id, i, c }      c: 0 pass, 1 greed, 2 need. The host checks the chest id, the item
//                                                index, that the player was in the raid and hasn't picked yet, and
//                                                turns a Need the player's hero can't use into Greed.
//   host -> all    { t: 'lootw', id, i, k, w, c, r, g }   w: the winner's id with their choice c and roll r,
//                                                         or w = 0: salvaged, g gold for each player in the chest
// The clear's gold rides on 'chest'; each player adds it to their own save.

const Loot = (() => {
  const SECS = 25;       // time to pick
  const GRACE = 8;       // the host waits this much longer (results delay, slow links) before it rolls for the silent
  let deps = null;       // from main: { broadcast(msg), send(msg), myId(), nameOf(id), inRaid(), addItem(key), addGold(n), itemTip(key, cls) }

  // ---------------------------------------------------------------- host
  let hc = null;         // the open chest: { id, keys, who: Map(id -> class), picks: [Map(id -> choice)], done: [], timer }
  let seq = 0;
  function hostOpen(boss, mode, humans) {
    if (hc) hostFinish();   // a new chest settles the old one first
    const classes = [...new Set(humans.map(h => h[1]))];
    const keys = rollChest(boss, mode, classes, Math.random);
    const id = ((Date.now() / 1000) | 0) % 100000 * 100 + (++seq % 100);
    const c = hc = { id, keys, who: new Map(humans), picks: keys.map(() => new Map()), done: keys.map(() => false) };
    c.timer = setTimeout(() => { if (hc === c) hostFinish(); }, (SECS + GRACE) * 1000);
    deps.broadcast({ t: 'chest', id, boss, mode, k: keys, who: humans, gold: clearGold(boss, mode), secs: SECS });
  }
  function hostChoice(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid)) return;
    const i = m.i;
    if (!Number.isInteger(i) || i < 0 || i >= c.keys.length || c.done[i] || c.picks[i].has(pid)) return;
    if (m.c !== LOOT_PASS && m.c !== LOOT_GREED && m.c !== LOOT_NEED) return;
    c.picks[i].set(pid, m.c === LOOT_NEED && !canNeed(c.keys[i], c.who.get(pid)) ? LOOT_GREED : m.c);
    if (c.picks[i].size >= c.who.size) resolve(c, i);
  }
  function resolve(c, i) {
    if (c.done[i]) return;
    c.done[i] = true;
    const key = c.keys[i], res = lootWinner([...c.picks[i]], Math.random);
    deps.broadcast(res ? { t: 'lootw', id: c.id, i, k: key, w: res.w, c: res.c, r: res.r }
      : { t: 'lootw', id: c.id, i, k: key, w: 0, g: RARITY[ITEMS[key].rarity].salvage });
    if (c.done.every(Boolean)) { clearTimeout(c.timer); if (hc === c) hc = null; }
  }
  function hostFinish() { const c = hc; if (!c) return; hc = null; c.keys.forEach((_, i) => resolve(c, i)); }

  // ---------------------------------------------------------------- every player
  let ch = null;         // { id, boss, keys, cls, picks: [], res: [], gold, shown, ends, wait }
  let ticker = null, closeAt = 0;
  const root = document.createElement('div');
  root.id = 'loot'; root.className = 'hidden';
  document.body.appendChild(root);
  const esc = s => String(s).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
  const resultsUp = () => { const r = document.getElementById('results'); return !!r && !r.classList.contains('hidden'); };
  const CHOICE = ['Pass', 'Greed', 'Need'];
  const SLOT_NAME = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };

  function chatLine(html) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const row = document.createElement('div');
    row.className = 'loot-line';
    row.innerHTML = html;
    log.appendChild(row);
    while (log.children.length > 7) log.firstChild.remove();
    setTimeout(() => row.classList.add('old'), 15000);
  }
  const itemSpan = key => `<span style="color:${RARITY[ITEMS[key].rarity].color}">[${esc(ITEMS[key].name)}]</span>`;

  function onChest(m) {
    if (!m || !Array.isArray(m.k) || !Array.isArray(m.who) || !m.k.every(k => ITEMS[k])) return;
    const me = m.who.find(w => Array.isArray(w) && w[0] === deps.myId());
    if (!me) return;   // you weren't in that raid
    if (ch && ch.wait) clearTimeout(ch.wait);
    ch = { id: m.id, boss: m.boss, keys: m.k, cls: me[1], picks: m.k.map(() => null), res: m.k.map(() => null),
      gold: Math.max(0, Math.min(1000, m.gold | 0)), secs: Math.max(5, Math.min(60, m.secs | 0 || SECS)), shown: false };
    if (ch.gold) deps.addGold(ch.gold);   // banked right away, announced when the chest opens
    // the cards come up with the results screen (main calls reveal); this is only a fallback
    if (!deps.inRaid() || resultsUp()) reveal(); else ch.wait = setTimeout(reveal, 4000);
  }
  function reveal() {
    if (!ch || ch.shown) return;
    clearTimeout(ch.wait);
    ch.shown = true;
    ch.ends = performance.now() + ch.secs * 1000;
    closeAt = 0;
    if (ch.gold) chatLine(`<b>You</b> received <span class="gold-txt">${ch.gold} gold</span>`);
    render();
    clearInterval(ticker);
    ticker = setInterval(tick, 200);
  }
  function choose(i, c) {
    if (!ch || ch.picks[i] != null || ch.res[i]) return;
    if (c === LOOT_NEED && !canNeed(ch.keys[i], ch.cls)) return;
    ch.picks[i] = c;
    deps.send({ t: 'lootc', id: ch.id, i, c });
    render();
  }
  function onWin(m) {
    if (!m || !ITEMS[m.k] || !Number.isInteger(m.i)) return;
    const mine = ch && ch.id === m.id;
    if (m.w) {
      chatLine(`<b>${esc(deps.nameOf(m.w))}</b> won ${itemSpan(m.k)} (${CHOICE[m.c] || 'Greed'} ${m.r | 0})`);
      if (m.w === deps.myId()) deps.addItem(m.k);
    } else if (mine) {
      const g = Math.max(0, Math.min(100, m.g | 0));
      chatLine(`${itemSpan(m.k)} was salvaged: <span class="gold-txt">${g} gold</span> each`);
      deps.addGold(g);
    }
    if (!mine || m.i < 0 || m.i >= ch.keys.length) return;
    ch.res[m.i] = m;
    if (!ch.shown) reveal();
    if (ch.res.every(Boolean)) closeAt = performance.now() + 6000;
    render();
  }

  function tick() {
    if (!ch || !ch.shown) { clearInterval(ticker); return; }
    const t = performance.now();
    if (closeAt && t > closeAt) { close(); return; }
    const left = Math.max(0, (ch.ends - t) / 1000);
    if (left <= 0) ch.picks.forEach((p, i) => { if (p == null && !ch.res[i]) choose(i, LOOT_PASS); });   // out of time: pass
    const frac = Math.min(1, left / ch.secs);
    root.querySelectorAll('.lc-bar i').forEach(b => { b.style.width = (frac * 100).toFixed(1) + '%'; });
    const tm = root.querySelector('.loot-time');
    if (tm) tm.textContent = left > 0 && !ch.res.every(Boolean) ? Math.ceil(left) : '';
  }
  function close() {
    clearInterval(ticker); ticker = null;
    root.classList.add('hidden'); root.innerHTML = '';
    Tip.hide();
    ch = null;
  }

  function render() {
    if (!ch || !ch.shown) return;
    const boss = (typeof BOSSES !== 'undefined' && BOSSES.find(b => b.id === ch.boss)) || null;
    root.innerHTML = `<div class="loot-head"><h4>Spoils</h4>${boss ? `<small>${esc(boss.name)}</small>` : ''}<span class="loot-time"></span></div>
      <div class="loot-cards">${ch.keys.map((key, i) => card(key, i)).join('')}</div>`;
    root.classList.remove('hidden');
    root.querySelectorAll('.loot-card').forEach(el => {
      const i = Number(el.dataset.i), key = ch.keys[i];
      Tip.set(el.querySelector('.lc-item'), () => deps.itemTip(key, ch && ch.cls));
      el.querySelectorAll('button[data-c]').forEach(b => b.addEventListener('click', () => choose(i, Number(b.dataset.c))));
    });
    tick();
  }
  function card(key, i) {
    const it = ITEMS[key], rar = RARITY[it.rarity], res = ch.res[i], pick = ch.picks[i];
    const need = canNeed(key, ch.cls);
    const clsName = (CLASSES.find(c => c.id === ch.cls) || {}).name || 'hero';
    let foot;
    if (res) foot = res.w ? `<div class="lc-res${res.w === deps.myId() ? ' me' : ''}"><b>${esc(deps.nameOf(res.w))}</b><span>${CHOICE[res.c] || ''} ${res.r | 0}</span></div>`
      : `<div class="lc-res salv"><span>Salvaged</span><span>${res.g | 0} gold each</span></div>`;
    else if (pick != null) foot = `<div class="lc-res wait"><span>${CHOICE[pick]}</span></div>`;
    else foot = `<div class="lc-acts">
        <button class="lc-btn need" data-c="${LOOT_NEED}" ${need ? '' : `disabled data-tip="Your ${esc(clsName)} can't use this"`}>Need</button>
        <button class="lc-btn" data-c="${LOOT_GREED}">Greed</button>
        <button class="lc-btn pass" data-c="${LOOT_PASS}">Pass</button></div>`;
    return `<div class="loot-card${res ? ' done' : ''}" data-i="${i}" style="--rc:${rar.color}">
      <div class="lc-item"><img src="${deps.iconURL(key)}" alt=""><div><b>${esc(it.name)}</b><small>${rar.name} · ${SLOT_NAME[it.slot]}</small></div></div>
      ${foot}${res ? '' : '<div class="lc-bar"><i></i></div>'}</div>`;
  }

  return { init(d) { deps = d; }, hostOpen, hostChoice, onChest, onWin, reveal };
})();
