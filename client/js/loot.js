// The boss's chest. A clear bursts the boss into a chest where it fell (rollChest in items.js: 4 items on Normal, 5 on
// Hard). Anyone who was in the raid opens it (click it, or the Spoils panel that comes up with the results) and takes
// what they like: first come, first served, straight into the bags of the hero they raided with. Anyone can also put
// an item of their own in, to trade: someone else takes it out. When the raid ends, what's left is salvaged into a
// little gold for each player, and anything a player put in goes back to them. Bots don't loot.
// Need-rolls: anyone whose hero can use a piece may Roll for it (1-100, rolled on the host). Until someone rolls, Take is
// first come, first served as before. The first roll opens a short window (ROLL_WINDOW) in which no one can Take it, so
// the others get to roll too; after it, the highest roller holds the piece: only they can Take it. Decline (or leaving)
// passes the hold to the next-highest roller, and once no roller is left the piece is open to everyone again.
// Works the same solo (the host alone with bots) and with 2-4 people.
//
// Messages:
//   host -> all    { t: 'chest', id, boss, mode, items: [[n, key, by]], who: [[playerId, classId]], gold, at: [x, y] }
//   host -> all    { t: 'cst', id, items }                 the chest's contents changed
//   host -> all    { t: 'cgot', id, pid, key, by }         pid took key out (by: who had put it in, 0 = the boss)
//   host -> all    { t: 'cputok', id, pid, uid }           pid's item uid went in (they drop it from their bags)
//   host -> all    { t: 'csalv', id, g }                   the chest is gone: g gold each for what was left
//   host -> all    { t: 'crolled', id, n, pid, v }          pid rolled v for item n
//   (chest and cst also carry rolls: [[n, [[pid, v]], [passed pids], holder pid or 0, ms left in the window]])
//   player -> host { t: 'ctake', id, n }  /  { t: 'cput', id, key, uid }  /  { t: 'croll', id, n }  /  { t: 'cpass', id, n }
// The clear's gold rides on 'chest'; each player adds it to their own save.

const Loot = (() => {
  const MAX = 12;        // a chest holds this many at most (the boss's, plus anything put in)
  const ROLL_WINDOW = 8000;   // ms after a piece's first roll in which no one can Take it
  let deps = null;       // from main: { broadcast, send, myId, nameOf, inRaid, addItem(key), addGold(n), itemTip(key, cls), iconURL(key), myItems(), dropItem(uid) }

  // ---------------------------------------------------------------- host
  let hc = null, seq = 0, nseq = 0;
  // run: the raid run's id (main.js raidRid), so a chest id is scoped to its run
  function hostOpen(boss, mode, humans, at, run = 0, heat = 0) {
    if (hc) hostClose();
    const classes = [...new Set(humans.map(h => h[1]))];
    const keys = rollChest(boss, mode, classes, Math.random);
    const id = ((Date.now() / 1000) | 0) % 100000 * 100 + (++seq % 100);
    hc = { id, boss, who: new Map(humans), items: keys.map(key => [++nseq, key, 0]), acked: new Set(), rolls: new Map(), gone: new Set(),
      msg: { t: 'chest', id, run, boss, mode, who: humans, gold: Math.round(clearGold(boss, mode) * (typeof HARDPLUS !== 'undefined' ? HARDPLUS.goldMult(heat) : 1)), at: at ? [Math.round(at.x), Math.round(at.y)] : null } };
    deps.broadcast(Object.assign({ items: hc.items, rolls: [] }, hc.msg));
  }
  // a piece's rolls: { r: [[pid, v]] in the order rolled, passed: Set, t0: first roll's time }. The holder is the highest
  // roller who hasn't passed or left (a tie goes to whoever rolled first).
  function holderOf(c, rl) {
    let best = null;
    for (const [pid, v] of rl.r) if (!rl.passed.has(pid) && !c.gone.has(pid) && (!best || v > best[1])) best = [pid, v];
    return best ? best[0] : 0;
  }
  const windowLeft = rl => Math.max(0, ROLL_WINDOW - (Date.now() - rl.t0));
  const rollsOut = c => [...c.rolls].map(([n, rl]) => [n, rl.r.map(x => x.slice()),
    rl.r.map(x => x[0]).filter(pid => rl.passed.has(pid) || c.gone.has(pid)), holderOf(c, rl), windowLeft(rl)]);   // (a roller who left reads as passed)
  const sendState = c => deps.broadcast({ t: 'cst', id: c.id, items: c.items, rolls: rollsOut(c) });
  function hostRoll(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid) || c.gone.has(pid)) return;
    const it = c.items.find(x => x[0] === m.n);
    if (!it || !canUse(it[1], c.who.get(pid))) return;
    let rl = c.rolls.get(m.n);
    if (!rl) c.rolls.set(m.n, rl = { r: [], passed: new Set(), t0: Date.now() });
    if (rl.r.some(x => x[0] === pid)) return;   // (one roll each)
    const v = 1 + Math.floor(Math.random() * 100);
    rl.r.push([pid, v]);
    deps.broadcast({ t: 'crolled', id: c.id, n: m.n, pid, v });
    sendState(c);
  }
  function hostPass(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id) return;
    const rl = c.rolls.get(m.n);
    if (!rl || !rl.r.some(x => x[0] === pid) || rl.passed.has(pid)) return;
    rl.passed.add(pid);
    sendState(c);
  }
  // a player left the raid (or dropped for good): any hold of theirs goes to the next roller
  function hostLeft(pid) {
    const c = hc;
    if (!c || !c.who.has(pid) || c.gone.has(pid)) return;
    c.gone.add(pid);
    if ([...c.rolls.values()].some(rl => rl.r.some(x => x[0] === pid))) sendState(c);
  }
  // a player says the chest reached them (gold paid, panel ready): it is never sent to them again
  function hostAck(pid, m) { if (hc && m && m.id === hc.id) hc.acked.add(pid); }
  // The chest as it stands now, for a player who rejoined and never confirmed it (null: nothing to send). Not for a Resync:
  // a player who has the chest keeps it, and the client ignores a chest it has already opened (onChest) in any case.
  function hostChestFor(pid) {
    if (!hc || !hc.who.has(pid) || hc.acked.has(pid)) return null;
    return Object.assign({ items: hc.items.map(x => x.slice()), rolls: rollsOut(hc) }, hc.msg);
  }
  function hostTake(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid) || c.gone.has(pid)) return;
    const i = c.items.findIndex(x => x[0] === m.n);
    if (i < 0) return;
    const rl = c.rolls.get(m.n), h = rl ? holderOf(c, rl) : 0;
    if (rl && (windowLeft(rl) > 0 || (h && h !== pid))) return;   // (still rolling, or someone else holds it)
    c.rolls.delete(m.n);
    const [, key, by] = c.items.splice(i, 1)[0];
    deps.broadcast({ t: 'cgot', id: c.id, pid, key, by });
    sendState(c);
  }
  function hostPut(pid, m) {
    const c = hc;
    if (!c || !m || m.id !== c.id || !c.who.has(pid) || !ITEMS[m.key] || !Number.isInteger(m.uid) || c.items.length >= MAX) return;
    c.puts = c.puts || new Set();
    if (c.puts.has(pid + ':' + m.uid)) return;   // (the same item twice: a double click)
    c.puts.add(pid + ':' + m.uid);
    c.items.push([++nseq, m.key, pid]);
    deps.broadcast({ t: 'cputok', id: c.id, pid, uid: m.uid });
    sendState(c);
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
  let ch = null;         // { id, boss, items, rolls, cls, gold, at, open, putting }
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
  const names = new Map();   // pid -> name, so a roller who has left keeps theirs on the chart
  const nameOf = pid => { const n = deps.nameOf(pid); if (n !== 'Someone') names.set(pid, n); return names.get(pid) || n; };
  const itemSpan = key => `<span style="color:${RARITY[ITEMS[key].rarity].color}">[${esc(ITEMS[key].name)}]</span>`;
  const cleanItems = items => (Array.isArray(items) ? items.filter(x => Array.isArray(x) && Number.isInteger(x[0]) && ITEMS[x[1]]).slice(0, MAX) : []);
  // rolls from the host: Map n -> { r: [[pid, v]], passed: Set, holder, until: when the window closes here }
  function cleanRolls(rolls) {
    const out = new Map(), now = performance.now();
    if (!Array.isArray(rolls)) return out;
    for (const x of rolls.slice(0, MAX)) {
      if (!Array.isArray(x) || !Number.isInteger(x[0]) || !Array.isArray(x[1])) continue;
      const r = x[1].filter(y => Array.isArray(y) && Number.isInteger(y[1])).slice(0, 8).map(y => [y[0], Math.max(1, Math.min(100, y[1]))]);
      out.set(x[0], { r, passed: new Set(Array.isArray(x[2]) ? x[2] : []), holder: x[3] || 0, until: now + Math.max(0, Math.min(ROLL_WINDOW, +x[4] || 0)) });
    }
    return out;
  }
  let tick = 0;   // re-renders while a roll window is counting down
  function schedule() {
    clearTimeout(tick);
    if (!ch || !ch.open) return;
    const now = performance.now(), next = [...ch.rolls.values()].map(rl => rl.until - now).filter(t => t > 0);
    if (next.length) tick = setTimeout(render, Math.min(...next) % 1000 + 30);
  }

  const opened = new Set();   // chests this tab has opened (run:id): the gold is paid once, however many times the host sends one
  function onChest(m) {
    if (!m || !Array.isArray(m.who)) return;
    const me = m.who.find(w => Array.isArray(w) && w[0] === deps.myId());
    if (!me) return;   // you weren't in that raid
    const key = (m.run || 0) + ':' + m.id;
    if (opened.has(key)) { deps.send({ t: 'cack', id: m.id }); return; }   // (already opened here: no gold, no new panel)
    opened.add(key);
    if (opened.size > 40) opened.delete(opened.values().next().value);
    deps.send({ t: 'cack', id: m.id });
    ch = { id: m.id, boss: m.boss, items: cleanItems(m.items), rolls: cleanRolls(m.rolls), cls: me[1], gold: Math.max(0, Math.min(1000, m.gold | 0)),
      at: Array.isArray(m.at) && m.at.every(Number.isFinite) ? { x: m.at[0], y: m.at[1] } : null, open: false, putting: false, born: performance.now() };
    if (ch.gold) { deps.addGold(ch.gold); chatLine(`<b>You</b> received <span class="gold-txt">${ch.gold} gold</span>`); }
    // (the results may already be up: the chest's panel comes with them)
    const r = document.getElementById('results');
    if (r && !r.classList.contains('hidden')) reveal();
  }
  function onState(m) { if (ch && m && m.id === ch.id) { ch.items = cleanItems(m.items); ch.rolls = cleanRolls(m.rolls); render(); } }
  function onRolled(m) {
    if (!ch || !m || m.id !== ch.id || !Number.isInteger(m.v)) return;
    const x = ch.items.find(i => i[0] === m.n);
    if (x) chatLine(`<b>${esc(nameOf(m.pid))}</b> rolled <b>${Math.max(1, Math.min(100, m.v))}</b> for ${itemSpan(x[1])}`);
  }
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
  function roll(n) { if (ch) deps.send({ t: 'croll', id: ch.id, n }); }
  function pass(n) { if (ch) deps.send({ t: 'cpass', id: ch.id, n }); }
  const pending = new Set();   // put in, waiting for the host to say so
  function put(inst) { if (!ch || !inst || pending.has(inst.uid)) return; pending.add(inst.uid); deps.send({ t: 'cput', id: ch.id, key: inst.key, uid: inst.uid }); render(); }

  function open() { if (!ch) return; ch.open = true; render(); }
  function close() { clearTimeout(tick); root.classList.add('hidden'); root.innerHTML = ''; Tip.hide(); if (ch) { ch.open = false; ch.putting = false; } }
  const isOpen = () => !root.classList.contains('hidden');

  function render() {
    if (!ch || !ch.open) return;
    const boss = (typeof BOSSES !== 'undefined' && BOSSES.find(b => b.id === ch.boss)) || null;
    const clsName = (CLASSES.find(c => c.id === ch.cls) || {}).name || 'hero';
    const me = deps.myId(), now = performance.now();
    const cards = ch.items.length ? ch.items.map(([n, key, by]) => {
      const it = ITEMS[key], rar = RARITY[it.rarity], use = canUse(key, ch.cls);
      const rl = ch.rolls.get(n), mine = rl && rl.r.find(x => x[0] === me);
      const wait = rl ? Math.ceil((rl.until - now) / 1000) : 0, holder = rl && wait <= 0 ? rl.holder : 0;
      const hv = holder && (rl.r.find(x => x[0] === holder) || [])[1];
      // Take: open to all with no rolls; shut while the window counts down, and for everyone but the holder after it
      const takeOff = wait > 0 || (holder && holder !== me);
      const takeTip = wait > 0 ? `Rolls are open for ${wait}s` : holder && holder !== me ? `${esc(nameOf(holder))} rolled ${hv} and holds it` : use ? '' : `Your ${esc(clsName)} can't use this`;
      const takeBtn = `<button class="lc-btn${use ? ' usable' : ''}" data-take="${n}"${takeOff ? ' disabled' : ''}${takeTip ? ` data-tip="${takeTip}"` : ''}>Take</button>`;
      const rollTip = !use ? `Your ${esc(clsName)} can't use this` : mine ? `You rolled ${mine[1]}` : 'Roll for it. The highest roll holds it';
      const second = holder === me
        ? `<button class="lc-btn" data-pass="${n}" data-tip="Pass it to the next-highest roll">Decline</button>`
        : `<button class="lc-btn${use && !mine ? ' usable' : ''}" data-roll="${n}"${!use || mine ? ' disabled' : ''} data-tip="${rollTip}">Roll</button>`;
      let chart = '';
      if (rl && rl.r.length) {
        const rows = rl.r.slice().sort((a, b) => b[1] - a[1]).map(([pid, v]) => {
          const st = pid === holder ? ' hold' : rl.passed.has(pid) ? ' out' : '';
          return `<div class="lr-row${st}"><span class="lr-name">${esc(nameOf(pid))}</span><span class="lr-bar"><i style="width:${v}%"></i></span><span class="lr-v">${v}</span></div>`;
        }).join('');
        chart = `<div class="lc-rolls">${rows}${wait > 0 ? `<div class="lr-note">Rolling · ${wait}</div>` : !holder ? '<div class="lr-note">Open to all</div>' : ''}</div>`;
      }
      return `<div class="loot-card" data-n="${n}" style="--rc:${rar.color}">
        <div class="lc-item"><img src="${deps.iconURL(key)}" alt=""><div><b>${esc(it.name)}</b><small>${rar.name} · ${SLOT_NAME[it.slot]}${by ? ` · from ${esc(deps.nameOf(by))}` : ''}</small></div></div>
        <div class="lc-acts two">${takeBtn}${second}</div>${chart}</div>`;
    }).join('') : '<p class="loot-empty">Nothing left in the chest.</p>';
    let putting = '';
    if (ch.putting) {
      const mine = deps.myItems();
      putting = `<div class="loot-put">${mine.length ? mine.filter(i => !pending.has(i.uid)).map(i => `<button class="lp-item" data-uid="${i.uid}" style="--rc:${RARITY[ITEMS[i.key].rarity].color}"><img src="${deps.iconURL(i.key)}" alt=""></button>`).join('') : '<p class="loot-empty">Nothing to put in (worn gear stays on).</p>'}</div>`;
    }
    root.innerHTML = `<div class="loot-head"><h4>Spoils</h4>${boss ? `<small>${esc(boss.name)}</small>` : ''}<button class="loot-x" type="button" aria-label="Close" data-tip="Close (Esc)">×</button></div>
      <div class="loot-cards">${cards}</div>
      <div class="loot-foot"><button class="btn2 loot-putbtn" type="button"${ch.items.length >= MAX ? ' disabled data-tip="The chest is full"' : ''}>${ch.putting ? 'Done' : 'Put something in'}</button><small>Take what you like, or roll for it. Put an item in to trade it.</small></div>${putting}`;
    root.classList.remove('hidden');
    root.querySelector('.loot-x').addEventListener('click', close);
    root.querySelector('.loot-putbtn').addEventListener('click', () => { ch.putting = !ch.putting; render(); });
    root.querySelectorAll('.loot-card').forEach(el => {
      const n = Number(el.dataset.n), x = ch.items.find(i => i[0] === n);
      if (x) Tip.set(el.querySelector('.lc-item'), () => deps.itemTip(x[1], ch && ch.cls));
    });
    root.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => take(Number(b.dataset.take))));
    root.querySelectorAll('[data-roll]').forEach(b => b.addEventListener('click', () => roll(Number(b.dataset.roll))));
    root.querySelectorAll('[data-pass]').forEach(b => b.addEventListener('click', () => pass(Number(b.dataset.pass))));
    schedule();
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

  return { init(d) { deps = d; }, hostOpen, hostAck, hostChestFor, hostTake, hostPut, hostRoll, hostPass, hostLeft, hostClose, onChest, onState, onRolled, onGot, onPutOk, onSalvage, open, close, isOpen, reveal, chestAt, leave };
})();
