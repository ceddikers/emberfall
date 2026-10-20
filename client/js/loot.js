// The boss's chest. A clear bursts the boss into a chest where it fell (rollChest in items.js: 4 items on Normal, 5 on
// Hard). Anyone who was in the raid opens it (click it, or the Spoils panel that comes up with the results) and takes
// what they like: first come, first served, straight into the bags of the hero they raided with. Anyone can also put
// an item of their own in, to trade: someone else takes it out. When the raid ends, what's left is salvaged into a
// little gold for each player, and anything a player put in goes back to them. Bots don't loot.
// Works the same solo (the host alone with bots) and with 2-4 people.
//
// Messages:
//   host -> all    { t: 'chest', id, boss, mode, items: [[n, key, by]], who: [[playerId, classId]], gold, at: [x, y] }
//   host -> all    { t: 'cst', id, items }                 the chest's contents changed
//   host -> all    { t: 'cgot', id, pid, key, by }         pid took key out (by: who had put it in, 0 = the boss)
//   host -> all    { t: 'cputok', id, pid, uid }           pid's item uid went in (they drop it from their bags)
//   host -> all    { t: 'csalv', id, g }                   the chest is gone: g gold each for what was left
//   player -> host { t: 'ctake', id, n }  /  { t: 'cput', id, key, uid }
// The clear's gold rides on 'chest'; each player adds it to their own save.

const Loot = (() => {
  const MAX = 12;        // a chest holds this many at most (the boss's, plus anything put in)
  let deps = null;       // from main: { broadcast, send, myId, nameOf, inRaid, addItem(key), addGold(n), itemTip(key, cls), iconURL(key), myItems(), dropItem(uid) }

  // ---------------------------------------------------------------- host
  let hc = null, seq = 0, nseq = 0;
  function hostOpen(boss, mode, humans, at) {
    if (hc) hostClose();
    const classes = [...new Set(humans.map(h => h[1]))];
    const keys = rollChest(boss, mode, classes, Math.random);
    const id = ((Date.now() / 1000) | 0) % 100000 * 100 + (++seq % 100);
    hc = { id, boss, who: new Map(humans), items: keys.map(key => [++nseq, key, 0]) };
    deps.broadcast({ t: 'chest', id, boss, mode, items: hc.items, who: humans, gold: clearGold(boss, mode), at: at ? [Math.round(at.x), Math.round(at.y)] : null });
  }
  function hostTake(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid)) return;
    const i = c.items.findIndex(x => x[0] === m.n);
    if (i < 0) return;
    const [, key, by] = c.items.splice(i, 1)[0];
    deps.broadcast({ t: 'cgot', id: c.id, pid, key, by });
    deps.broadcast({ t: 'cst', id: c.id, items: c.items });
  }
  function hostPut(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid) || !ITEMS[m.key] || !Number.isInteger(m.uid) || c.items.length >= MAX) return;
    c.puts = c.puts || new Set();
    if (c.puts.has(pid + ':' + m.uid)) return;   // (the same item twice: a double click)
    c.puts.add(pid + ':' + m.uid);
    c.items.push([++nseq, m.key, pid]);
    deps.broadcast({ t: 'cputok', id: c.id, pid, uid: m.uid });
    deps.broadcast({ t: 'cst', id: c.id, items: c.items });
  }
  // the raid is over: the boss's leftovers are salvaged for everyone, players' own items go back to them
  function hostClose() {
    const c = hc;
    if (!c) return;
    hc = null;
    let g = 0;
    for (const [, key, by] of c.items) {
      if (by && c.who.has(by)) deps.broadcast({ t: 'cgot', id: c.id, pid: by, key, by, back: 1 });
      else if (!by) g += RARITY[ITEMS[key].rarity].salvage;
    }
    deps.broadcast({ t: 'csalv', id: c.id, g });
  }

  // ---------------------------------------------------------------- every player
  let ch = null;         // { id, boss, items, cls, gold, at, open, putting }
  const root = document.createElement('div');
  root.id = 'loot'; root.className = 'hidden';
  document.body.appendChild(root);
  root.addEventListener('mousedown', e => e.stopPropagation());
  const esc = s => String(s).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
  const SLOT_NAME = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory' };

  function chatLine(html) {
    if (!html) return;
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
  const cleanItems = items => (Array.isArray(items) ? items.filter(x => Array.isArray(x) && Number.isInteger(x[0]) && ITEMS[x[1]]).slice(0, MAX) : []);

  function onChest(m) {
    if (!m || !Array.isArray(m.who)) return;
    const me = m.who.find(w => Array.isArray(w) && w[0] === deps.myId());
    if (!me) return;   // you weren't in that raid
    ch = { id: m.id, boss: m.boss, items: cleanItems(m.items), cls: me[1], gold: Math.max(0, Math.min(1000, m.gold | 0)),
      at: Array.isArray(m.at) && m.at.every(Number.isFinite) ? { x: m.at[0], y: m.at[1] } : null, open: false, putting: false, born: performance.now() };
    if (ch.gold) { deps.addGold(ch.gold); chatLine(`<b>You</b> received <span class="gold-txt">${ch.gold} gold</span>`); }
    // (the results may already be up: the chest's panel comes with them)
    const r = document.getElementById('results');
    if (r && !r.classList.contains('hidden')) reveal();
  }
  function onState(m) { if (ch && m && m.id === ch.id) { ch.items = cleanItems(m.items); render(); } }
  function onGot(m) {
    if (!m || !ITEMS[m.key]) return;
    const mine = m.pid === deps.myId(), me = deps.myId();
    // something of mine that was in the chest: taken by someone else (gone), or back to me (out of escrow)
    if (m.by === me && !mine) deps.settle(m.key);
    if (ch && m.id === ch.id) chatLine(m.back ? (mine ? `${itemSpan(m.key)} came back to your bags` : '')
      : `<b>${esc(deps.nameOf(m.pid))}</b> took ${itemSpan(m.key)}${m.by && m.by !== m.pid ? ` <small>(from ${esc(deps.nameOf(m.by))})</small>` : ''}`);
    if (mine && m.by === me) { if (!deps.unescrow(m.key)) deps.addItem(m.key, ch ? ch.cls : null); }
    else if (mine && (ch && m.id === ch.id || m.back)) deps.addItem(m.key, ch ? ch.cls : null);
  }
  function onPutOk(m) { if (ch && m && m.id === ch.id && m.pid === deps.myId()) { pending.delete(m.uid); deps.escrow(m.uid); render(); } }
  function onSalvage(m) {
    if (!ch || !m || m.id !== ch.id) return;
    const g = Math.max(0, Math.min(500, m.g | 0));
    if (g) { deps.addGold(g); chatLine(`What was left in the chest was salvaged: <span class="gold-txt">${g} gold</span> each`); }
    deps.unescrowAll();
    close(); ch = null;
  }

  function take(n) { if (ch) deps.send({ t: 'ctake', id: ch.id, n }); }
  const pending = new Set();   // put in, waiting for the host to say so
  function put(inst) { if (!ch || !inst || pending.has(inst.uid)) return; pending.add(inst.uid); deps.send({ t: 'cput', id: ch.id, key: inst.key, uid: inst.uid }); render(); }

  function open() { if (!ch) return; ch.open = true; render(); }
  function close() { root.classList.add('hidden'); root.innerHTML = ''; Tip.hide(); if (ch) { ch.open = false; ch.putting = false; } }
  const isOpen = () => !root.classList.contains('hidden');

  function render() {
    if (!ch || !ch.open) return;
    const boss = (typeof BOSSES !== 'undefined' && BOSSES.find(b => b.id === ch.boss)) || null;
    const clsName = (CLASSES.find(c => c.id === ch.cls) || {}).name || 'hero';
    const cards = ch.items.length ? ch.items.map(([n, key, by]) => {
      const it = ITEMS[key], rar = RARITY[it.rarity], use = canNeed(key, ch.cls);
      return `<div class="loot-card" data-n="${n}" style="--rc:${rar.color}">
        <div class="lc-item"><img src="${deps.iconURL(key)}" alt=""><div><b>${esc(it.name)}</b><small>${rar.name} · ${SLOT_NAME[it.slot]}${by ? ` · from ${esc(deps.nameOf(by))}` : ''}</small></div></div>
        <div class="lc-acts one"><button class="lc-btn${use ? ' need' : ''}" data-take="${n}"${use ? '' : ` data-tip="Your ${esc(clsName)} can't use this"`}>Take</button></div></div>`;
    }).join('') : '<p class="loot-empty">Nothing left in the chest.</p>';
    let putting = '';
    if (ch.putting) {
      const mine = deps.myItems();
      putting = `<div class="loot-put">${mine.length ? mine.filter(i => !pending.has(i.uid)).map(i => `<button class="lp-item" data-uid="${i.uid}" style="--rc:${RARITY[ITEMS[i.key].rarity].color}"><img src="${deps.iconURL(i.key)}" alt=""></button>`).join('') : '<p class="loot-empty">Nothing to put in (worn gear stays on).</p>'}</div>`;
    }
    root.innerHTML = `<div class="loot-head"><h4>Spoils</h4>${boss ? `<small>${esc(boss.name)}</small>` : ''}<button class="loot-x" type="button" aria-label="Close">×</button></div>
      <div class="loot-cards">${cards}</div>
      <div class="loot-foot"><button class="btn2 loot-putbtn" type="button"${ch.items.length >= MAX ? ' disabled data-tip="The chest is full"' : ''}>${ch.putting ? 'Done' : 'Put something in'}</button><small>Take what you like. Put an item in to trade it.</small></div>${putting}`;
    root.classList.remove('hidden');
    root.querySelector('.loot-x').addEventListener('click', close);
    root.querySelector('.loot-putbtn').addEventListener('click', () => { ch.putting = !ch.putting; render(); });
    root.querySelectorAll('.loot-card').forEach(el => {
      const n = Number(el.dataset.n), x = ch.items.find(i => i[0] === n);
      if (x) Tip.set(el.querySelector('.lc-item'), () => deps.itemTip(x[1], ch && ch.cls));
    });
    root.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => take(Number(b.dataset.take))));
    root.querySelectorAll('.lp-item').forEach(b => {
      const inst = deps.myItems().find(i => i.uid === Number(b.dataset.uid));
      if (inst) Tip.set(b, () => deps.itemTip(inst.key, ch && ch.cls));
      b.addEventListener('click', () => { if (inst) put(inst); });
    });
  }

  // the chest in the room (main draws it; null when there's none)
  const chestAt = () => (ch && ch.at && deps.inRaid() ? Object.assign({ born: ch.born, n: ch.items.length }, ch.at) : null);
  // the results screen is up: the chest's panel comes with it (once)
  function reveal() { if (ch && !ch.revealed) { ch.revealed = true; open(); } }
  // leaving the raid: the panel goes (the host settles the chest)
  function leave() { close(); ch = null; pending.clear(); deps && deps.unescrowAll(); }

  return { init(d) { deps = d; }, hostOpen, hostTake, hostPut, hostClose, onChest, onState, onGot, onPutOk, onSalvage, open, close, isOpen, reveal, chestAt, leave };
})();
