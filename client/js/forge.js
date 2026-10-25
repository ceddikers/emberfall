// The Forge: move an old item's passive onto a newer item, so a favourite effect is not lost when better gear drops.
// Opened at the Forge's door in town. You pick the item that receives (it keeps its own stats, name, look and boss, so its
// party bonus is still its own boss's), then a donor from your bags; the donor is used up and the item carries its passive.
// The rules live in items.js (forgeCheck: same slot, at least as rare, a class piece only with its own class's) and the act in
// Inventory.fuse; this file is only the screen. An item instance gains `fx: <donor item key>` (saved with the bags).

const Forge = (() => {
  let deps = null;   // from main: { cls() -> class id or null, toast(msg) }
  const coin = '<i class="coin" aria-hidden="true"></i>';
  const GROUPS = [['weapon', 'Weapons'], ['armor', 'Armor'], ['accessory', 'Accessories']];

  const el = document.createElement('div');
  el.id = 'forge'; el.className = 'hidden';
  el.innerHTML = `
    <div class="fg-page">
      <button class="sel-close fg-close" aria-label="Close" data-tip="Close (Esc)">×</button>
      <header class="sel-head"><h2>Forge</h2><div class="sel-rule"></div></header>
      <div class="fg-top"><div class="fg-hero"></div><span class="fg-gold" data-tip="Gold"></span></div>
      <div class="fg-grid">
        <section class="box fg-recv"><h4>Receiving item</h4><div class="fg-body"></div></section>
        <section class="box fg-donor"><h4>Passive from</h4><div class="fg-body"></div></section>
        <section class="box fg-result"><h4>Result</h4><div class="fg-body"></div></section>
      </div>
    </div>`;
  document.body.appendChild(el);
  const $q = s => el.querySelector(s);
  const isOpen = () => !el.classList.contains('hidden');
  let recv = null, donor = null;   // the chosen instances

  function open() {
    const id = deps && deps.cls(); if (!id) return false;
    recv = donor = null; el.classList.remove('hidden'); render(); return true;
  }
  function close() { el.classList.add('hidden'); Tip.hide(); }
  $q('.fg-close').addEventListener('click', close);
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });

  // the passive an instance carries, as one line for a list (the tooltip has the whole text)
  function passiveLine(inst) {
    const src = passiveKey(inst); if (!src) return '';
    const text = ITEM_PERKS[src] ? ITEM_PERKS[src].text : String(ITEMS[src].fxText || '').split('<br>')[0];
    return text + (src !== inst.key ? ` <span class="it-from">(from ${ITEMS[src].name})</span>` : '');
  }
  const rarityOf = inst => RARITY[ITEMS[inst.key].rarity];

  function render() {
    const clsId = deps && deps.cls(); if (!clsId) return;
    const cls = CLASSES.find(c => c.id === clsId);
    el.style.setProperty('--a', cls.accent);
    $q('.fg-hero').innerHTML = `<b>${cls.name}</b><small>${cls.title}</small>`;
    const gold = Save.gold();
    $q('.fg-gold').innerHTML = `${coin}${gold.toLocaleString('en-US')}`;
    const bag = Inventory.bag(clsId);
    if (recv && !bag.includes(recv)) recv = null;
    if (donor && !bag.includes(donor)) donor = null;
    if (!recv) donor = null;
    const worn = new Set(Object.values(Inventory.loadout(clsId)).filter(Boolean).map(i => i.uid));
    const sorted = list => list.slice().sort((a, b) => ITEMS[b.key].rarity - ITEMS[a.key].rarity || ITEMS[a.key].name.localeCompare(ITEMS[b.key].name));

    // ---- the receiving item: only Rare and better can take a passive (a lower item is never at least as rare as a donor)
    const cand = bag.filter(i => ITEMS[i.key].rarity >= R_RARE && !ITEMS[i.key].gift);
    const rb = $q('.fg-recv .fg-body');
    rb.innerHTML = !cand.length ? '<p class="fg-none">Nothing here yet.</p>' : GROUPS.map(([slot, label]) => {
      const here = sorted(cand.filter(i => ITEMS[i.key].slot === slot)); if (!here.length) return '';
      return `<h5>${label}</h5><div class="fg-cells">${here.map(i => `<button class="cell${recv === i ? ' sel' : ''}${worn.has(i.uid) ? ' worn' : ''}${i.fx ? ' fused' : ''}" data-uid="${i.uid}"><img src="${Inventory.iconURL(i)}" alt=""></button>`).join('')}</div>`;
    }).join('');
    rb.querySelectorAll('.cell').forEach(b => {
      const inst = bag.find(i => i.uid === Number(b.dataset.uid));
      Tip.set(b, () => Inventory.itemTip(inst, clsId));
      b.addEventListener('click', () => { recv = inst; donor = null; render(); });
    });

    // ---- the donors: items of the same slot that carry a passive; the ones the rules refuse stay in view with the reason
    const db = $q('.fg-donor .fg-body');
    let rows = [];
    if (recv) {
      const slot = ITEMS[recv.key].slot;
      rows = bag.filter(i => i !== recv && ITEMS[i.key].slot === slot && passiveKey(i) && !ITEMS[i.key].gift)
        .map(i => ({ inst: i, chk: forgeCheck(recv, i) }))
        .sort((a, b) => b.chk.ok - a.chk.ok || ITEMS[passiveKey(b.inst)].rarity - ITEMS[passiveKey(a.inst)].rarity || ITEMS[a.inst.key].name.localeCompare(ITEMS[b.inst.key].name));
    }
    db.innerHTML = !recv ? '<p class="fg-none">Choose the item that will receive it.</p>'
      : !rows.length ? '<p class="fg-none">Nothing in your bags carries a passive it could take.</p>'
      : rows.map(({ inst, chk }, n) => {
        const rar = rarityOf(inst), price = chk.ok ? chk.cost : FORGE_COST[ITEMS[passiveKey(inst)].rarity];
        return `<button class="fg-row${chk.ok ? '' : ' no'}${donor === inst ? ' sel' : ''}" data-n="${n}" style="--rc:${rar.color}"${chk.ok ? '' : ' aria-disabled="true"'}>
          <img src="${Inventory.iconURL(inst)}" alt=""><span><b>${ITEMS[inst.key].name}</b><p>${passiveLine(inst)}</p>${chk.ok ? '' : `<small class="why">${chk.why}</small>`}</span>
          <u>${coin}${price}</u></button>`;
      }).join('');
    db.querySelectorAll('.fg-row').forEach(b => {
      const { inst, chk } = rows[Number(b.dataset.n)];
      Tip.set(b, () => Inventory.itemTip(inst, clsId));
      if (chk.ok) b.addEventListener('click', () => { donor = inst; render(); });
    });

    // ---- the result: the receiving item as it will read, the cost, and the button
    const out = $q('.fg-result .fg-body');
    const chk = recv && donor ? forgeCheck(recv, donor) : null;
    if (!chk || !chk.ok) { out.innerHTML = `<p class="fg-none">${recv ? 'Choose a donor.' : '&nbsp;'}</p>`; return; }
    const after = { uid: recv.uid, key: recv.key, owner: recv.owner };
    if (chk.src !== recv.key) after.fx = chk.src;
    const short = chk.cost - gold;
    const note = worn.has(donor.uid) ? 'It comes off first.' : '';
    out.innerHTML = `<div class="fg-prev"><img src="${Inventory.iconURL(after)}" alt=""><div class="det-text">${Inventory.itemTip(after, clsId)}</div></div>
      <div class="fg-cost"><span>Uses up <i style="color:${rarityOf(donor).color}">${ITEMS[donor.key].name}</i>${note ? `<small>${note}</small>` : ''}</span><b>${coin}${chk.cost}</b></div>
      <button class="cta fg-go" ${short > 0 ? 'disabled' : ''}>${short > 0 ? 'Not enough gold' : 'Fuse'}</button>`;
    const go = out.querySelector('.fg-go');
    if (short > 0) go.dataset.tip = `${short} gold short`;
    go.addEventListener('click', () => {
      const name = ITEMS[recv.key].name;
      if (Inventory.fuse(clsId, recv, donor)) { donor = null; if (deps.toast) deps.toast(`${name} carries it now.`); render(); }
    });
  }

  return { init(d) { deps = d; }, open, close, isOpen, refresh() { if (isOpen()) render(); } };
})();
