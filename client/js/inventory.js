// Inventory: each hero's own bags and equipped gear, and the screen for it. (Gold is the account's.)
// Saved in this browser as part of the versioned save (save.js). Gear numbers reach the fight through Inventory.mods()
// (your own damage/healing/haste/crit, computed on your machine) and the host (HP and Defense, capped there).

const Inventory = (() => {
  const SLOTS = [['weapon', 'Weapon'], ['armor', 'Armor'], ['acc1', 'Accessory I'], ['acc2', 'Accessory II']];
  // an empty slot's outline: a blade, a breastplate, a ring
  const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const EMPTY_ICON = {
    weapon: svg('M17.5 3.5h3v3L10 17l-3-3zM6 15l3 3M4.5 16.5l3 3M3.5 20.5l2-2'),
    armor: svg('M8 3.5 4 5.5v5c0 5 3.5 8 8 10 4.5-2 8-5 8-10v-5l-4-2-4 2.5z'),
    acc: svg('M12 9.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM9.5 9.8 12 4.5l2.5 5.3'),
  };
  const data = Save.get('inv');   // changed in place; save() writes the whole save
  // items whose key this version doesn't know wait in inv.lost (never deleted) and come back if the key returns
  const known = i => i && ITEMS[i.key];
  data.lost = data.lost.concat(data.items.filter(i => !known(i)));
  data.items = data.items.filter(known).concat(data.lost.filter(known));
  data.lost = data.lost.filter(i => !known(i));
  const save = () => Save.commit();

  let deps = null;           // from main: { cls(), locked(), drawFigure(ctx, cls, w, h), onChange(), toast(msg) }
  let modsCache = new Map();
  const changed = () => { modsCache.clear(); save(); if (deps) deps.onChange(); if (isOpen()) render(); };

  const byUid = uid => data.items.find(i => i.uid === uid) || null;
  // Every hero has their own bags (item.owner = class id). Gear a hero was already wearing is theirs (a piece two
  // heroes shared is copied for the second); anything else waits, unclaimed, for the first hero to open their bags.
  (function ownership() {
    let any = false;
    for (const [cls, e] of Object.entries(data.equip)) for (const sl in e) {
      const it = e[sl] != null ? byUid(e[sl]) : null;
      if (!it) continue;
      if (!it.owner) { it.owner = cls; any = true; }
      else if (it.owner !== cls) { const copy = { uid: data.next++, key: it.key, owner: cls }; data.items.push(copy); e[sl] = copy.uid; any = true; }
    }
    if (any) save();
  })();
  // unclaimed items go to the first hero who could use them: a class's own gear to that class, a weapon only to a hero
  // who can wield it, anything else to whoever opens their bags first
  function claim(clsId) {
    if (!clsId) return;
    let any = false;
    for (const i of data.items) {
      if (i.owner || !ITEMS[i.key]) continue;
      const it = ITEMS[i.key];
      if (it.cls) { i.owner = it.cls; any = true; continue; }
      if (it.slot === 'weapon' && !slotsFor(i).some(sl => canEquip(i, clsId, sl))) continue;
      i.owner = clsId; any = true;
    }
    if (any) save();
  }
  // move an item to another of your heroes' bags (taken off first)
  function sendTo(inst, clsId) {
    if (!data.items.includes(inst) || !CLASSES.some(c => c.id === clsId)) return;
    for (const e of Object.values(data.equip)) for (const sl in e) if (e[sl] === inst.uid) e[sl] = null;
    inst.owner = clsId; selected = null; changed();
  }
  // the chest: an item put in waits here (still in the save) until someone takes it, or it comes back
  if (!Array.isArray(data.escrow)) data.escrow = [];
  function escrow(uid) {
    const inst = byUid(uid);
    if (!inst) return;
    data.items = data.items.filter(i => i !== inst);
    for (const e of Object.values(data.equip)) for (const sl in e) if (e[sl] === uid) e[sl] = null;
    data.escrow.push(inst);
    if (selected && selected.inst === inst) selected = null;
    changed();
  }
  // someone else took it: gone for good. (Returns whether there was one.)
  function settle(key) { const i = data.escrow.findIndex(x => x.key === key); if (i < 0) return false; data.escrow.splice(i, 1); changed(); return true; }
  // it came back (or the chest is gone): back in the bags
  function unescrow(key) { const i = data.escrow.findIndex(x => x.key === key); if (i < 0) return false; data.items.push(data.escrow.splice(i, 1)[0]); changed(); return true; }
  function unescrowAll() { if (!data.escrow.length) return; data.items.push(...data.escrow); data.escrow = []; changed(); }
  unescrowAll();   // (a page closed with something in a chest: it's back on the next visit)
  const mine = clsId => data.items.filter(i => i.owner === clsId);
  function loadout(clsId) {
    const e = data.equip[clsId] || {};
    const out = {};
    for (const [s] of SLOTS) { const it = e[s] != null ? byUid(e[s]) : null; out[s] = it && it.owner === clsId && canEquip(it, clsId, s) ? it : null; }
    return out;
  }
  function add(key, owner) { const inst = { uid: data.next++, key, owner: owner || (deps && deps.cls()) || null }; data.items.push(inst); changed(); return inst; }
  // take an item out of the bags for good (it went into a chest)
  function drop(uid) {
    const inst = byUid(uid);
    if (!inst) return;
    data.items = data.items.filter(i => i !== inst);
    for (const e of Object.values(data.equip)) for (const sl in e) if (e[sl] === uid) e[sl] = null;
    if (selected && selected.inst === inst) selected = null;
    changed();
  }
  // a hero's items that aren't being worn (what they can trade)
  function spare(clsId) { claim(clsId); const worn = new Set(Object.values(loadout(clsId)).filter(Boolean).map(i => i.uid)); return mine(clsId).filter(i => !worn.has(i.uid)); }
  function equip(clsId, slot, inst) {
    if (!canEquip(inst, clsId, slot) || inst.owner !== clsId) return false;
    const e = data.equip[clsId] = data.equip[clsId] || {};
    // the same ring can't be in both accessory slots
    for (const s of ['acc1', 'acc2']) if (s !== slot && e[s] === inst.uid) e[s] = null;
    e[slot] = inst.uid; changed();
    if (typeof Sound !== 'undefined') Sound.play('ui-equip', { bus: 'ui', key: 'ui-equip', minGap: 0.15 });
    return true;
  }
  function unequip(clsId, slot) { const e = data.equip[clsId]; if (e) { e[slot] = null; changed(); } }
  // sell an item for gold (RARITY[r].sell); anyone wearing it takes it off first
  function sell(inst) {
    if (!data.items.includes(inst)) return;
    data.items = data.items.filter(i => i !== inst);
    for (const e of Object.values(data.equip)) for (const s in e) if (e[s] === inst.uid) e[s] = null;
    Save.addGold(sellPrice(inst));
    if (typeof Sound !== 'undefined') Sound.play('ui-gold', { bus: 'ui', key: 'ui-gold', minGap: 0.1 });
    changed(); showGold();
  }
  const wornBy = inst => Object.entries(data.equip).filter(([, e]) => Object.values(e).includes(inst.uid)).map(([c]) => c);

  // ---------------------------------------------------------------- gold: in the bag, and quietly on the town HUD
  const coin = '<i class="coin" aria-hidden="true"></i>';
  const goldHud = document.createElement('div');
  goldHud.id = 'gold-hud'; goldHud.className = 'hidden'; goldHud.dataset.tip = 'Gold';
  document.body.appendChild(goldHud);
  function showGold() {
    const g = Save.gold().toLocaleString('en-US');
    goldHud.innerHTML = `${coin}${g}`;
    if (isOpen()) { const b = el.querySelector('.inv-gold'); if (b) b.innerHTML = `${coin}${g}`; }
  }
  function addGold(n) { if (n > 0) { Save.addGold(n); showGold(); if (typeof Sound !== 'undefined') Sound.play('ui-gold', { bus: 'ui', key: 'ui-gold', minGap: 0.1 }); } }
  // (extra: something besides gear adding to the totals, like a feast; main sets it)
  let extra = () => null;
  function totals(clsId) {
    const l = loadout(clsId), t = gearTotals(clsId, Object.values(l)), x = extra(clsId);
    if (x) { const main = CLASS_MAIN[clsId] || 'phys'; for (const [k, v] of Object.entries(x)) { const kk = k === 'main' ? main : k; t[kk] = (t[kk] || 0) + v; } }
    return t;
  }
  function mods(clsId) {
    if (!clsId) return {};
    if (!modsCache.has(clsId)) modsCache.set(clsId, gearMods(clsId, totals(clsId), Object.values(loadout(clsId))));
    return modsCache.get(clsId);
  }
  // a new hero gets their recruit weapon and a coat, put on right away
  function grantStarter(clsId) {
    claim(clsId);
    const own = k => data.items.find(i => i.key === k && i.owner === clsId);
    const w = own(`${clsId}_w0`) || add(`${clsId}_w0`, clsId);
    const c = own('g_coat') || add('g_coat', clsId);
    const l = loadout(clsId);
    if (!l.weapon) equip(clsId, 'weapon', w);
    if (!l.armor) equip(clsId, 'armor', c);
  }

  // ---------------------------------------------------------------- item icons (drawn; cached as images)
  const iconCache = new Map();
  function iconURL(inst) {
    const id = inst.key + ':' + itemRarity(inst);
    if (!iconCache.has(id)) iconCache.set(id, drawIcon(inst));
    return iconCache.get(id);
  }
  // Painted icons live in items/<key>.png (briefs in docs/art/item-icons.md). items/manifest.json lists the keys
  // that have one, so missing art costs a single request; anything without art keeps its drawn icon.
  const art = {};
  fetch('items/manifest.json').then(r => (r.ok ? r.json() : [])).then(keys => {
    for (const key of keys) {
      if (!ITEMS[key]) continue;
      const im = new Image();
      im.onload = () => {
        art[key] = im;
        for (const id of [...iconCache.keys()]) if (id.startsWith(key + ':')) iconCache.delete(id);
        if (isOpen()) render();
      };
      im.src = `items/${key}.png`;
    }
  }).catch(() => {});
  function drawIcon(inst) {
    const it = ITEMS[inst.key], rar = RARITY[itemRarity(inst)], S = 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
    const c = cv.getContext('2d'); c.scale(2, 2);
    if (art[inst.key]) {
      c.imageSmoothingQuality = 'high';
      c.drawImage(art[inst.key], 0, 0, S, S);
      const rg = c.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
      rg.addColorStop(0, rgba(rar.color, 0)); rg.addColorStop(1, rgba(rar.color, 0.28));
      c.fillStyle = rg; c.fillRect(0, 0, S, S);
      c.strokeStyle = rar.color; c.lineWidth = 2; c.strokeRect(1, 1, S - 2, S - 2);
      c.strokeStyle = '#00000088'; c.lineWidth = 1; c.strokeRect(3, 3, S - 6, S - 6);
      return cv.toDataURL();
    }
    const g = c.createRadialGradient(S / 2, S * 0.45, 4, S / 2, S / 2, S * 0.7);
    g.addColorStop(0, '#2a241d'); g.addColorStop(1, '#0d0b09');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    const rg = c.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S * 0.55);
    rg.addColorStop(0, rgba(rar.color, 0.22)); rg.addColorStop(1, rgba(rar.color, 0));
    c.fillStyle = rg; c.fillRect(0, 0, S, S);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const accent = it.cls ? (CLASSES.find(x => x.id === it.cls) || {}).accent : null;
    const OUTL = '#0a0806';
    const shape = (fn, fill, w = 2.5) => { c.beginPath(); fn(); c.fillStyle = fill; c.fill(); c.strokeStyle = OUTL; c.lineWidth = w; c.stroke(); };
    const stroke = (fn, col, w) => { c.beginPath(); fn(); c.strokeStyle = OUTL; c.lineWidth = w + 3; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    const metal = '#d6dce4', wood = '#8a5a32', gold = '#e2bb58';
    c.save(); c.translate(S / 2, S / 2);
    switch (it.wtype || it.atype) {
      case 'sword': case 'fang':
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-3, -6); c.lineTo(-3, -24); c.lineTo(0, it.wtype === 'fang' ? -27 : -29); c.lineTo(3, -24); c.lineTo(3, -6); }, it.wtype === 'fang' ? '#e8e2cf' : metal);
        shape(() => c.rect(-10, -7, 20, 4), gold, 2);
        shape(() => c.rect(-2.5, -3, 5, 14), wood, 2);
        shape(() => c.arc(0, 13, 3.5, 0, Math.PI * 2), gold, 2);
        break;
      case 'axe':
        c.rotate(-Math.PI / 4);
        shape(() => c.rect(-2.5, -22, 5, 46), wood, 2);
        shape(() => { c.moveTo(2, -20); c.quadraticCurveTo(20, -24, 20, -10); c.quadraticCurveTo(20, 2, 2, -2); }, metal);
        shape(() => { c.moveTo(-2, -20); c.quadraticCurveTo(-14, -18, -13, -10); c.quadraticCurveTo(-12, -4, -2, -4); }, '#aab2bd');
        break;
      case 'cleaver':
        c.rotate(-Math.PI / 5);
        shape(() => c.rect(-3, 4, 6, 20), wood, 2);
        shape(() => { c.moveTo(-12, 6); c.lineTo(-12, -22); c.lineTo(10, -22); c.lineTo(10, 6); }, metal);
        shape(() => c.arc(-5, -15, 3, 0, Math.PI * 2), '#1a1612', 1.5);
        break;
      case 'maul':   // Thunderstone Maul: a slab of slate on a haft, a crack of lightning in it
        c.rotate(-Math.PI / 4);
        shape(() => c.rect(-2.5, -14, 5, 40), wood, 2);
        shape(() => c.rect(-14, -26, 28, 16), '#6a7480');
        stroke(() => { c.moveTo(-8, -24); c.lineTo(-2, -18); c.lineTo(-6, -16); c.lineTo(2, -11); }, '#7fe8ff', 1.5);
        break;
      case 'scepter':   // Lightning Rod Scepter: an iron rod with a crown of spikes
        c.rotate(-Math.PI / 4);
        stroke(() => { c.moveTo(0, 26); c.lineTo(0, -14); }, '#8a96a4', 4);
        c.fillStyle = rgba('#7fe8ff', 0.4); c.beginPath(); c.arc(0, -20, 11, 0, Math.PI * 2); c.fill();
        for (const x of [-5, 0, 5]) shape(() => { c.moveTo(x - 2, -14); c.lineTo(x, x ? -24 : -28); c.lineTo(x + 2, -14); }, '#c8d2dc', 1.5);
        break;
      case 'greatsword':   // Hollow Crown Greatsword: a long dark blade with a green fuller and a crowned guard
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-4, -4); c.lineTo(-4, -26); c.lineTo(0, -31); c.lineTo(4, -26); c.lineTo(4, -4); }, '#5a6270');
        stroke(() => { c.moveTo(0, -6); c.lineTo(0, -26); }, '#6dff9a', 1.2);
        shape(() => { c.moveTo(-12, -6); c.lineTo(-8, -9); c.lineTo(-4, -6); c.lineTo(0, -10); c.lineTo(4, -6); c.lineTo(8, -9); c.lineTo(12, -6); c.lineTo(12, -3); c.lineTo(-12, -3); c.closePath(); }, gold, 2);
        shape(() => c.rect(-2.5, -3, 5, 18), '#2a1d14', 2);
        shape(() => c.arc(0, 17, 3.5, 0, Math.PI * 2), gold, 2);
        break;
      case 'royal':   // Sceptre of the Barrow: a gold rod topped with a little crown around a grave-light gem
        c.rotate(-Math.PI / 4);
        stroke(() => { c.moveTo(0, 26); c.lineTo(0, -12); }, gold, 4);
        c.fillStyle = rgba('#6dff9a', 0.4); c.beginPath(); c.arc(0, -18, 12, 0, Math.PI * 2); c.fill();
        shape(() => { c.moveTo(-9, -12); c.lineTo(-9, -22); c.lineTo(-5, -17); c.lineTo(0, -25); c.lineTo(5, -17); c.lineTo(9, -22); c.lineTo(9, -12); c.closePath(); }, gold, 1.8);
        shape(() => c.arc(0, -16, 3.5, 0, Math.PI * 2), '#9affc0', 1.5);
        break;
      case 'shroud':   // Royal Burial Shroud: pale linen wound round, a gold band and a faded crest
        shape(() => { c.moveTo(-10, -22); c.quadraticCurveTo(0, -26, 10, -22); c.lineTo(16, 20); c.quadraticCurveTo(0, 26, -16, 20); c.closePath(); }, '#cfc8b6');
        c.strokeStyle = rgba('#6a6250', 0.6); c.lineWidth = 1.2;
        for (const y of [-12, -4, 4, 12]) { c.beginPath(); c.moveTo(-13, y); c.quadraticCurveTo(0, y + 5, 13, y - 2); c.stroke(); }
        c.fillStyle = gold; c.fillRect(-12, -1, 24, 3);
        shape(() => c.arc(0, -10, 4, 0, Math.PI * 2), '#4a9a6a', 1.5);
        break;
      case 'lantern':   // Last Lantern Charm: a tiny iron lantern with a warm flame
        stroke(() => { c.moveTo(-6, -24); c.quadraticCurveTo(0, -30, 6, -24); }, '#3a322a', 2);
        c.fillStyle = rgba('#ffcf70', 0.4); c.beginPath(); c.arc(0, 2, 20, 0, Math.PI * 2); c.fill();
        shape(() => c.rect(-11, -18, 22, 6), '#3a322a', 2);
        shape(() => c.rect(-9, -12, 18, 26), rgba('#ffd68c', 0.45), 2);
        c.fillStyle = '#fff0c0'; c.beginPath(); c.ellipse(0, 1, 3.5, 7, 0, 0, Math.PI * 2); c.fill();
        for (const x of [-4, 4]) stroke(() => { c.moveTo(x, -12); c.lineTo(x, 14); }, '#3a322a', 1.2);
        shape(() => c.rect(-11, 14, 22, 5), '#3a322a', 2);
        break;
      case 'ladle':
        c.rotate(-Math.PI / 5);
        stroke(() => { c.moveTo(0, 26); c.lineTo(0, -10); }, '#c9cfd8', 4);
        shape(() => c.ellipse(0, -16, 12, 9, 0, 0, Math.PI * 2), '#c9cfd8');
        shape(() => c.ellipse(0, -16, 8, 5, 0, 0, Math.PI * 2), '#ff8a3a', 1.5);
        break;
      case 'crux':   // Thermist: a brass ring with a fire half and a frost half, a needle across it
        c.fillStyle = rgba('#ffb08a', 0.25); c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
        shape(() => c.arc(0, 0, 19, Math.PI / 2, Math.PI * 1.5), '#4f94d8');
        shape(() => c.arc(0, 0, 19, -Math.PI / 2, Math.PI / 2), '#f08236');
        shape(() => c.arc(0, 0, 11, 0, Math.PI * 2), '#2a2026', 2);
        stroke(() => { c.moveTo(-6, 9); c.lineTo(7, -10); }, '#f2e6c8', 2);
        shape(() => c.arc(0, 0, 2.5, 0, Math.PI * 2), gold, 1.5);
        break;
      case 'sabre':   // Driftblade: a curved sabre, a ribbon tied at the hilt
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-2.5, -4); c.quadraticCurveTo(-4, -18, 4, -30); c.quadraticCurveTo(4, -16, 2.5, -4); c.closePath(); }, metal, 2);
        shape(() => c.ellipse(0, -4, 8, 2.5, 0, 0, Math.PI * 2), gold, 2);
        shape(() => c.rect(-2.2, -2, 4.4, 14), '#2a1d14', 2);
        stroke(() => { c.moveTo(0, 12); c.quadraticCurveTo(8, 18, 4, 26); }, accent || '#4fd0b0', 2.5);
        break;
      case 'needle':   // Threadweaver: a rapier-long needle, a glowing thread looped through its eye
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-2.2, 14); c.lineTo(-1.6, -22); c.lineTo(0, -30); c.lineTo(1.6, -22); c.lineTo(2.2, 14); c.closePath(); }, metal, 2);
        shape(() => c.ellipse(0, 18, 4, 6, 0, 0, Math.PI * 2), gold, 2);
        c.fillStyle = '#0d0b09'; c.beginPath(); c.ellipse(0, 18, 1.6, 3.2, 0, 0, Math.PI * 2); c.fill();
        stroke(() => { c.moveTo(0, 15); c.bezierCurveTo(14, 10, -12, -4, 10, -14); }, accent || '#b89cff', 1.6);
        break;
      case 'controlbar':   // Marionettist: a wooden cross-bar with three strings hanging off it
        c.rotate(-0.25);
        for (const x of [-12, 0, 12]) { c.strokeStyle = rgba('#f4e8d8', 0.85); c.lineWidth = 1; c.beginPath(); c.moveTo(x, -6); c.lineTo(x * 0.7, 26); c.stroke(); }
        shape(() => c.rect(-18, -10, 36, 6), wood, 2);
        shape(() => c.rect(-3, -24, 6, 30), wood, 2);
        shape(() => c.arc(0, -24, 3.5, 0, Math.PI * 2), accent || '#c84a8c', 1.5);
        for (const x of [-15, 15]) shape(() => c.arc(x, -7, 2.5, 0, Math.PI * 2), gold, 1.2);
        break;
      case 'focus':
        c.fillStyle = rgba('#a98bff', 0.35); c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
        shape(() => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); } c.closePath(); }, '#5b3fa0');
        shape(() => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } c.closePath(); }, '#d9c8ff', 2);
        break;
      case 'bow':
        c.rotate(-Math.PI / 4);
        stroke(() => { c.moveTo(-4, -26); c.quadraticCurveTo(18, 0, -4, 26); }, '#9a6a3a', 4);
        c.beginPath(); c.moveTo(-4, -26); c.lineTo(-4, 26); c.strokeStyle = '#efe8d8'; c.lineWidth = 1.2; c.stroke();
        stroke(() => { c.moveTo(-14, 0); c.lineTo(16, 0); }, '#d8c8a0', 2);
        shape(() => { c.moveTo(16, -4); c.lineTo(22, 0); c.lineTo(16, 4); }, metal, 1.5);
        break;
      case 'daggers':
        for (const r of [-0.7, 0.7]) {
          c.save(); c.rotate(r);
          shape(() => { c.moveTo(-2.5, -4); c.lineTo(0, -26); c.lineTo(2.5, -4); }, metal, 2);
          shape(() => c.rect(-7, -5, 14, 3), '#7b3fa0', 1.5);
          shape(() => c.rect(-2, -2, 4, 12), '#2b2433', 1.5);
          c.restore();
        }
        break;
      case 'tome':
        shape(() => c.rect(-17, -21, 34, 42), '#6a2a6b');
        shape(() => c.rect(-13, -21, 4, 42), '#3e1640', 1.5);
        c.strokeStyle = gold; c.lineWidth = 1.5; c.strokeRect(-7, -15, 20, 30);
        c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(3, -8); c.quadraticCurveTo(12, 2, 3, 9); c.quadraticCurveTo(-6, 2, 3, -8); c.fill();
        c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(3, 3, 3, 0, Math.PI * 2); c.fill();
        break;
      case 'sunstaff': case 'branch':
        c.rotate(-Math.PI / 4);
        stroke(() => { c.moveTo(0, 28); if (it.wtype === 'branch') { c.quadraticCurveTo(5, 10, -2, -2); c.quadraticCurveTo(-6, -12, 0, -16); } else c.lineTo(0, -14); }, '#8a6a3a', 4);
        if (it.wtype === 'sunstaff') {
          c.fillStyle = rgba('#ffe680', 0.4); c.beginPath(); c.arc(0, -20, 15, 0, Math.PI * 2); c.fill();
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; stroke(() => { c.moveTo(Math.cos(a) * 8, -20 + Math.sin(a) * 8); c.lineTo(Math.cos(a) * 13, -20 + Math.sin(a) * 13); }, gold, 2); }
          shape(() => c.arc(0, -20, 6.5, 0, Math.PI * 2), gold, 2);
        } else {
          for (const [x, y, r] of [[-7, -8, -0.8], [6, 2, 0.7], [-5, 10, -0.6]]) shape(() => c.ellipse(x, y, 6, 3, r, 0, Math.PI * 2), '#5fbf4a', 1.5);
          c.fillStyle = rgba('#8fff7a', 0.5); c.beginPath(); c.arc(0, -19, 9, 0, Math.PI * 2); c.fill();
          shape(() => c.arc(0, -19, 4.5, 0, Math.PI * 2), '#b8ff9a', 1.5);
        }
        break;
      case 'wraps': {   // Ironpalm: a coil of cloth knuckle wraps with iron plates over the knuckles
        c.rotate(-0.3);
        c.fillStyle = rgba(accent || '#f0a73a', 0.28); c.beginPath(); c.arc(0, 2, 22, 0, Math.PI * 2); c.fill();
        shape(() => c.roundRect(-14, -8, 28, 24, 7), '#d8c0a0');
        for (const y of [0, 6, 12]) stroke(() => { c.moveTo(-14, y); c.lineTo(14, y); }, '#a88a68', 1.2);
        for (let i = 0; i < 4; i++) shape(() => c.arc(-10.5 + i * 7, -10, 4, 0, Math.PI * 2), ['#9aa6b4', '#a8b4c2', '#c8b07a', '#d0d8e2', '#8ae0b0'][it.tier] || metal, 1.8);
        stroke(() => { c.moveTo(14, 12); c.quadraticCurveTo(24, 18, 18, 26); }, '#d8c0a0', 3);
        break;
      }
      case 'retort': {   // Alembist: a glass retort with a copper collar, its long neck bent down, a coloured mix inside
        c.rotate(-0.2);
        c.fillStyle = rgba(accent || '#d08a3a', 0.3); c.beginPath(); c.arc(-4, 6, 20, 0, Math.PI * 2); c.fill();
        stroke(() => { c.moveTo(4, -6); c.quadraticCurveTo(14, -22, 24, -12); }, '#cfe6ee', 4);
        shape(() => c.arc(-4, 6, 14, 0, Math.PI * 2), rgba('#dff6ff', 0.5));
        c.save(); c.beginPath(); c.arc(-4, 6, 13, 0, Math.PI * 2); c.clip(); c.fillStyle = ['#4fe0c0', '#ff5a1a', '#f4ecd2', '#ffd23a', '#9fe8ff'][it.tier] || '#4fe0c0'; c.fillRect(-20, 6, 32, 16); c.restore();
        shape(() => c.rect(-1, -10, 9, 6), '#b8743a', 1.8);
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-9, 0, 2.5, 5, 0.4, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'gauntlet':   // Gorgemaw: a great bronze fist, knuckles studded, a band of hide at the wrist
        c.rotate(-0.25);
        shape(() => c.rect(-9, 6, 18, 14), '#7a4a30', 2);
        shape(() => { c.moveTo(-15, 8); c.lineTo(-17, -12); c.quadraticCurveTo(0, -26, 17, -12); c.lineTo(15, 8); c.closePath(); }, '#b8743a', 2);
        for (let i = 0; i < 4; i++) shape(() => c.arc(-10.5 + i * 7, -12, 2.6, 0, Math.PI * 2), i % 2 ? gold : metal, 1.2);
        stroke(() => { c.moveTo(-12, -2); c.lineTo(12, -2); }, '#5a3420', 1.5);
        break;
      case 'duskblade':   // Gloomsworn: a black greatsword with a violet edge, a guard like folded wings and a vessel-stone in the pommel
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-5, -4); c.lineTo(-5, -26); c.lineTo(0, -32); c.lineTo(5, -26); c.lineTo(5, -4); }, '#262030');
        stroke(() => { c.moveTo(-5, -6); c.lineTo(-5, -26); c.lineTo(0, -32); }, '#9a7ad8', 1.4);
        stroke(() => { c.moveTo(0, -6); c.lineTo(0, -24); }, '#6a4aa0', 1.2);
        shape(() => { c.moveTo(-13, -3); c.lineTo(-8, -8); c.lineTo(-3, -5); c.lineTo(3, -5); c.lineTo(8, -8); c.lineTo(13, -3); c.lineTo(8, -1); c.lineTo(-8, -1); c.closePath(); }, '#4a3a68', 2);
        shape(() => c.rect(-2.5, -1, 5, 16), '#1a1420', 2);
        shape(() => c.arc(0, 17, 3.8, 0, Math.PI * 2), '#b08aff', 2);
        break;
      case 'ashblade':   // Kenseier: a long, slightly curved single-edged blade, ash-grey with an ember-orange edge, a round charcoal guard and a wrapped grip
        c.rotate(-Math.PI / 4);
        shape(() => { c.moveTo(-3.5, -4); c.lineTo(-3.5, -26); c.quadraticCurveTo(-2.5, -32, 3.5, -34); c.lineTo(3.5, -4); c.closePath(); }, '#b4b0a8');
        stroke(() => { c.moveTo(3.2, -6); c.lineTo(3.2, -32); }, '#ff8a3d', 1.6);
        stroke(() => { c.moveTo(-1, -6); c.lineTo(-1, -28); }, '#8a867e', 1);
        shape(() => c.ellipse(0, -2, 8, 2.6, 0, 0, Math.PI * 2), '#3a3836', 1.8);
        shape(() => c.rect(-2.5, -0.5, 5, 15), '#2a2826', 1.8);
        for (const y of [3, 7, 11]) stroke(() => { c.moveTo(-2.5, y); c.lineTo(2.5, y + 2); }, '#8a867e', 1);
        shape(() => c.arc(0, 16, 2.6, 0, Math.PI * 2), '#ff8a3d', 1.5);
        break;
      case 'scythe':   // Reaper: a long black snath ringed with violet, a slender pale crescent blade with a teal edge
        c.rotate(0.35);
        stroke(() => { c.moveTo(-1, 30); c.lineTo(1, -22); }, '#0c0a14', 3);
        stroke(() => { c.moveTo(-1, 30); c.lineTo(1, -22); }, '#4a2a6a', 1);
        shape(() => { c.moveTo(1, -22); c.quadraticCurveTo(24, -36, 33, -10); c.quadraticCurveTo(20, -25, 1, -17); c.closePath(); }, '#e4eaf2');
        stroke(() => { c.moveTo(3, -18); c.quadraticCurveTo(20, -26, 32, -11); }, '#8fd8e8', 1.4);
        shape(() => c.rect(-3.5, -10, 7, 3), '#7a5aa8', 1.5);
        break;
      case 'stampmace':   // Oathbroker:a mace whose head is a square seal, a dab of red wax on its face
        c.rotate(-Math.PI / 4);
        shape(() => c.rect(-2.5, -6, 5, 32), '#5a4a3a', 2);
        shape(() => c.rect(-10, -26, 20, 20), metal, 2);
        shape(() => c.rect(-7, -29, 14, 4), '#c04a5a', 1.5);
        stroke(() => { c.moveTo(-6, -16); c.lineTo(6, -16); c.moveTo(0, -22); c.lineTo(0, -10); }, '#2a2034', 1.5);
        break;
      case 'hourglass': case 'wand':
        if (it.wtype === 'wand') {
          c.rotate(-Math.PI / 4);
          stroke(() => { c.moveTo(0, 24); c.lineTo(0, -12); }, '#e8e2f4', 3);
          c.fillStyle = rgba('#ffffff', 0.45); c.beginPath(); c.arc(0, -18, 10, 0, Math.PI * 2); c.fill();
          shape(() => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 4 : 9; c.lineTo(Math.cos(a) * r, -18 + Math.sin(a) * r); } c.closePath(); }, '#f4f0ff', 1.5);
        } else {
          shape(() => c.rect(-15, -24, 30, 5), '#c8d4dc', 2);
          shape(() => c.rect(-15, 19, 30, 5), '#c8d4dc', 2);
          shape(() => { c.moveTo(-11, -19); c.lineTo(11, -19); c.lineTo(2, 0); c.lineTo(11, 19); c.lineTo(-11, 19); c.lineTo(-2, 0); c.closePath(); }, rgba('#dff6ff', 0.55), 2);
          c.fillStyle = gold; c.beginPath(); c.moveTo(-7, 18); c.lineTo(7, 18); c.lineTo(0, 9); c.fill();
          c.fillStyle = rgba('#5ff0ff', 0.5); c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
        }
        break;
      // the Mythics (drawn until their painted icons arrive)
      case 'pot':   // The Ogre's Stockpot: a squat iron pot, soup bubbling over
        shape(() => c.ellipse(0, 4, 20, 16, 0, 0, Math.PI * 2), '#3a3430');
        shape(() => c.ellipse(0, -8, 18, 6, 0, 0, Math.PI * 2), '#ff8a3a', 2);
        for (const [x, r] of [[-7, 3], [3, 4], [10, 2.5]]) shape(() => c.arc(x, -10, r, 0, Math.PI * 2), '#ffb066', 1.2);
        for (const x of [-22, 22]) stroke(() => { c.moveTo(x, -4); c.lineTo(x * 1.15, -10); }, '#3a3430', 3);
        break;
      case 'broodeye':   // Eye of the Broodmother: a gold pendant set with a cluster of red spider eyes
        stroke(() => { c.moveTo(-14, -24); c.quadraticCurveTo(0, -4, 14, -24); }, gold, 2);
        shape(() => c.arc(0, 6, 14, 0, Math.PI * 2), '#1c1418', 2);
        for (const [x, y, r] of [[0, 2, 4.5], [-6, 9, 3], [6, 9, 3], [-8, 1, 2], [8, 1, 2], [0, 12, 2]]) shape(() => c.arc(x, y, r, 0, Math.PI * 2), '#ff3a3a', 1.2);
        break;
      case 'torc':   // Stormcaller's Torc: an open neck-ring of twisted iron with lightning-blue ends
        stroke(() => c.arc(0, 2, 18, Math.PI * 0.65, Math.PI * 2.35), '#8a96a4', 5);
        for (const a of [Math.PI * 0.65, Math.PI * 2.35]) shape(() => c.arc(Math.cos(a) * 18, 2 + Math.sin(a) * 18, 5, 0, Math.PI * 2), '#7fe8ff', 1.5);
        stroke(() => { c.moveTo(-4, -10); c.lineTo(2, -2); c.lineTo(-2, 0); c.lineTo(4, 8); }, '#7fe8ff', 1.5);
        break;
      case 'crown':   // Crown of the Barrow: a tarnished gold crown with a grave-green gem
        shape(() => { c.moveTo(-20, 12); c.lineTo(-20, -8); c.lineTo(-10, 2); c.lineTo(0, -16); c.lineTo(10, 2); c.lineTo(20, -8); c.lineTo(20, 12); c.closePath(); }, '#c9a04a');
        shape(() => c.rect(-20, 8, 40, 7), '#a8823a', 2);
        shape(() => c.arc(0, 2, 4.5, 0, Math.PI * 2), '#6dff9a', 1.5);
        break;
      case 'class': case 'coat': case 'apron': case 'chitin': case 'scale': case 'whites': case 'venomweave': case 'thunderhead': case 'deadcourt': {
        const col = { coat: '#7a5a3a', apron: '#e8e2d4', chitin: '#3d5a3a', scale: '#5a6676', whites: '#f2eee4', venomweave: '#2f4a30', thunderhead: '#4a5666', deadcourt: '#3a2f4a' }[it.atype] || accent || '#888';
        shape(() => { c.moveTo(-12, -20); c.lineTo(-4, -16); c.lineTo(4, -16); c.lineTo(12, -20); c.lineTo(22, -12); c.lineTo(16, -2); c.lineTo(12, -6); c.lineTo(12, 22); c.lineTo(-12, 22); c.lineTo(-12, -6); c.lineTo(-16, -2); c.lineTo(-22, -12); c.closePath(); }, col);
        c.strokeStyle = rgba('#000000', 0.35); c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -16); c.lineTo(0, 22); c.stroke();
        if (it.atype === 'class') { c.strokeStyle = gold; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 8); c.lineTo(12, 8); c.stroke(); shape(() => c.arc(0, -4, 4, 0, Math.PI * 2), gold, 1.5); }
        if (it.atype === 'apron') { c.fillStyle = '#c0353d'; c.fillRect(-12, 6, 24, 3); }
        if (it.atype === 'scale') for (const y of [-8, -1, 6, 13]) for (const x of [-7, 0, 7]) { c.strokeStyle = '#2a323e'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI); c.stroke(); }
        if (it.atype === 'chitin') for (const y of [-6, 2, 10]) { c.strokeStyle = '#1d2a1c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-11, y); c.quadraticCurveTo(0, y + 4, 11, y); c.stroke(); }
        if (it.atype === 'whites') { shape(() => { c.moveTo(-6, -16); c.lineTo(6, -16); c.lineTo(0, -6); c.closePath(); }, '#c0353d', 1.5); for (const y of [-2, 6, 14]) shape(() => c.arc(-5, y, 1.6, 0, Math.PI * 2), gold, 1); }
        if (it.atype === 'venomweave') for (const x of [-7, 0, 7]) stroke(() => { c.moveTo(x, -10); c.lineTo(x, 4 + Math.abs(x) / 2); }, '#7ae03a', 1.5);
        if (it.atype === 'thunderhead') stroke(() => { c.moveTo(-4, -12); c.lineTo(3, -2); c.lineTo(-2, 0); c.lineTo(5, 12); }, '#7fe8ff', 2);
        if (it.atype === 'deadcourt') { c.fillStyle = gold; c.fillRect(-12, 4, 24, 3); shape(() => c.arc(0, -6, 3.5, 0, Math.PI * 2), '#6dff9a', 1.5); }
        break;
      }
      case 'ring':
        stroke(() => c.ellipse(0, 6, 15, 13, 0, 0, Math.PI * 2), gold, 4);
        shape(() => { c.moveTo(0, -18); c.lineTo(8, -9); c.lineTo(0, -1); c.lineTo(-8, -9); c.closePath(); }, it.base.crit ? '#ff5a3a' : '#5ad0ff', 2);
        break;
      case 'amulet':
        stroke(() => { c.moveTo(-14, -24); c.quadraticCurveTo(0, -2, 14, -24); }, gold, 2);
        shape(() => c.arc(0, 6, 11, 0, Math.PI * 2), gold, 2);
        shape(() => c.arc(0, 6, 6.5, 0, Math.PI * 2), it.base.crit ? '#7ae03a' : '#5ad0ff', 1.5);
        break;
      case 'charm':
        shape(() => { c.moveTo(0, -22); c.lineTo(16, -14); c.lineTo(13, 8); c.lineTo(0, 22); c.lineTo(-13, 8); c.lineTo(-16, -14); c.closePath(); }, '#e8e2f4');
        c.strokeStyle = '#9a8ab8'; c.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5, -16); c.lineTo(i * 3, 14); c.stroke(); }
        break;
    }
    c.restore();
    c.strokeStyle = rar.color; c.lineWidth = 2; c.strokeRect(1, 1, S - 2, S - 2);
    c.strokeStyle = '#00000088'; c.lineWidth = 1; c.strokeRect(3, 3, S - 6, S - 6);
    return cv.toDataURL();
  }

  // ---------------------------------------------------------------- tooltip text for an item (with a comparison)
  function itemTip(inst, clsId, compareTo) {
    const it = ITEMS[inst.key], rar = RARITY[itemRarity(inst)];
    const st = itemStats(inst, clsId), cmp = compareTo ? itemStats(compareTo, clsId) : null;
    const who = it.cls ? CLASSES.find(c => c.id === it.cls).name + ' only' : it.slot === 'weapon' ? (it.main === 'phys' ? 'Physical classes' : 'Magical classes') : 'Any hero';
    const lines = Object.keys(STAT_INFO).filter(s => st[s] || (cmp && cmp[s])).map(s => {
      const v = st[s] || 0, d = cmp ? v - (cmp[s] || 0) : 0;
      const diff = cmp && d ? ` <span class="${d > 0 ? 'up' : 'down'}">(${d > 0 ? '+' : ''}${d}${s === 'haste' || s === 'crit' ? '%' : ''})</span>` : '';
      return `<div class="st-line">${v ? STAT_INFO[s].fmt(v) : '—'} ${STAT_INFO[s].name}${diff}</div>`;
    }).join('');
    const ok = clsId && slotsFor(inst).some(s => canEquip(inst, clsId, s));
    const fxLine = it.fxText ? `<div class="it-fx" style="--rc:${rar.color}">${it.fxText}</div>` : '';
    const perk = ITEM_PERKS[inst.key];
    // your specialization may have replaced that move: name both
    const baseAb = perk && KITS[it.cls].abilities.find(a => a.id === perk.ab);
    const specAb = perk && kitFor(it.cls, Save.spec(it.cls)).abilities.find(a => (a.replaces || a.id) === perk.ab);
    const perkName = perk && (specAb && specAb.name !== baseAb.name ? `${baseAb.name} (your ${specAb.name})` : baseAb.name);
    const perkLine = perk ? `<div class="it-perk"><i style="background-image:url(${abilityIcon(it.cls, perk.ab)})"></i><span><u>Enhances ${perkName}:</u> ${perk.text}</span></div>` : '';
    // the boss's party bonus: what 2, 3 and 4 people wearing its gear give the whole group
    const pb = PARTY_BONUS[it.tier];
    const bondLine = pb ? `<div class="it-bond"><u>Party bonus: ${pb.name}</u>${[2, 3, 4].map(n => `<span><i>${n}</i> ${bonusText(pb.tiers[n])}</span>`).join('')}<small>When that many in your group wear ${pb.boss} gear.</small></div>` : '';
    return `<b style="color:${rar.color}">${it.name}</b><em><span style="color:${rar.color}">${rar.name}</span> · ${it.slot === 'accessory' ? 'Accessory' : it.slot === 'weapon' ? 'Weapon' : 'Armor'} · Item level ${itemLevel(inst)}</em>${lines}${fxLine}${perkLine}${bondLine}<div class="it-who ${ok ? '' : 'no'}">${who}</div><div class="it-sell">Sells for ${sellPrice(inst)} gold</div>`;
  }

  // ---------------------------------------------------------------- the screen
  const el = document.createElement('div');
  el.id = 'inventory'; el.className = 'hidden';
  el.innerHTML = `
    <div class="inv-page">
      <button class="sel-close inv-close" aria-label="Close" data-tip="Close (Esc)">×</button>
      <header class="sel-head"><h2>Inventory</h2><div class="sel-rule"></div></header>
      <div class="inv-grid">
        <section class="inv-char box">
          <div class="inv-figure"><canvas id="inv-figure"></canvas></div>
          <h3 class="inv-name"></h3>
          <div class="inv-equip"></div>
        </section>
        <section class="inv-stats box"><h4>Attributes</h4><div class="inv-statlist"></div></section>
        <section class="inv-bag box">
          <div class="inv-tabs"></div>
          <div class="inv-cells"></div>
          <div class="inv-detail"></div>
        </section>
      </div>
    </div>`;
  document.body.appendChild(el);
  const $q = s => el.querySelector(s);
  let filter = 'all', selected = null;   // selected: { inst, slot? }
  const isOpen = () => !el.classList.contains('hidden');
  function open() { if (!deps || !deps.cls()) return; el.classList.remove('hidden'); selected = null; render(); }
  function close() { el.classList.add('hidden'); Tip.hide(); }
  $q('.inv-close').addEventListener('click', close);
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });   // (a click beside the page closes it, like the talents)
  const fig = $q('#inv-figure'); fig.width = 220 * 2; fig.height = 220 * 2; fig.style.width = '220px'; fig.style.height = '220px';

  const STAT_ROWS = [
    ['hp', 'HP', 'Your maximum health.'],
    ['phys', 'Physical', 'Physical classes deal more damage (and heal more): each point is +0.1%.'],
    ['mag', 'Magical', 'Magical classes deal more damage and heal more: each point is +0.1%.'],
    ['def', 'Defense', 'Each point reduces the damage you take by 0.1% (up to 10%).'],
    ['haste', 'Haste', 'Shortens your global cooldown and cast times.'],
    ['crit', 'Critical', 'Chance for attacks and heals to hit 50% harder.'],
  ];
  function statValue(key, clsId, t) {
    const main = CLASS_MAIN[clsId], role = CLASSES.find(c => c.id === clsId).role;
    switch (key) {
      case 'hp': return [`${(playerBaseHp(role) + t.hp).toLocaleString('en-US')}`, t.hp ? `+${t.hp} from gear` : 'Base'];
      case 'phys': case 'mag': {
        const v = (key === main ? 100 : 0) + t[key];
        return [String(v), key === main ? `+${(t[key] / 10).toFixed(1)}% damage & healing` : 'Not used by this hero'];
      }
      case 'def': return [String(t.def), `−${(t.def / 10).toFixed(1)}% damage taken`];
      case 'haste': return [`${t.haste}%`, `GCD ${(ENGINE.GCD * (1 - t.haste / 100)).toFixed(2)}s`];
      case 'crit': return [`${10 + t.crit}%`, t.crit ? `10% base +${t.crit}%` : '10% base'];
    }
    return ['', ''];
  }

  function render() {
    const clsId = deps.cls(); if (!clsId) return;
    claim(clsId);
    const cls = CLASSES.find(c => c.id === clsId), l = loadout(clsId), t = totals(clsId), locked = deps.locked();
    el.style.setProperty('--a', cls.accent);
    $q('.inv-name').innerHTML = `${cls.name}<small>${cls.title}</small>`;
    // equipment slots
    const eq = $q('.inv-equip');
    eq.innerHTML = SLOTS.map(([s, label]) => {
      const inst = l[s];
      return `<button class="eq-slot ${inst ? 'filled' : ''} ${selected && selected.slot === s ? 'sel' : ''}" data-slot="${s}">
        ${inst ? `<img src="${iconURL(inst)}" alt="">` : `<span class="eq-empty">${EMPTY_ICON[s.startsWith('acc') ? 'acc' : s]}</span>`}
        <small>${label.replace('Accessory', 'Acc.')}</small></button>`;
    }).join('');
    eq.querySelectorAll('.eq-slot').forEach(b => {
      const s = b.dataset.slot, inst = l[s];
      if (inst) Tip.set(b, () => itemTip(inst, clsId)); else b.dataset.tip = `${SLOTS.find(x => x[0] === s)[1]} (empty)`;
      b.addEventListener('click', () => { selected = inst ? { inst, slot: s } : null; render(); });
    });
    // attributes
    $q('.inv-statlist').innerHTML = STAT_ROWS.map(([k, name, help]) => {
      const [v, sub] = statValue(k, clsId, t);
      const dim = (k === 'phys' || k === 'mag') && CLASS_MAIN[clsId] !== k;
      return `<div class="stat-row ${dim ? 'dim' : ''}" data-tip="${help}${GEAR_CAPS[k] ? ` Gear cap: ${GEAR_CAPS[k]}${k === 'haste' || k === 'crit' ? '%' : ''}.` : ''}"><span>${name}</span><b>${v}</b><small>${sub}</small></div>`;
    }).join('');
    // bag
    const tabs = [['all', 'All'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['accessory', 'Accessories']];
    $q('.inv-tabs').innerHTML = tabs.map(([k, n]) => `<button class="${filter === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('') +
      `<span class="inv-gold" data-tip="Gold">${coin}${Save.gold().toLocaleString('en-US')}</span>`;
    $q('.inv-tabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
    const eqUids = new Set(Object.values(l).filter(Boolean).map(i => i.uid));
    // best first: rarity, then weapon / armour / accessory, then name
    const SLOT_ORDER = { weapon: 0, armor: 1, accessory: 2 };
    const list = mine(clsId).filter(i => filter === 'all' || ITEMS[i.key].slot === filter)
      .sort((a, b) => itemRarity(b) - itemRarity(a) || SLOT_ORDER[ITEMS[a.key].slot] - SLOT_ORDER[ITEMS[b.key].slot] || ITEMS[a.key].name.localeCompare(ITEMS[b.key].name));
    const cells = $q('.inv-cells');
    const n = Math.max(24, Math.ceil(list.length / 6) * 6);
    cells.innerHTML = Array.from({ length: n }, (_, i) => {
      const inst = list[i];
      if (!inst) return '<div class="cell empty"></div>';
      const usable = slotsFor(inst).some(s => canEquip(inst, clsId, s));
      return `<button class="cell ${usable ? '' : 'unusable'} ${eqUids.has(inst.uid) ? 'worn' : ''} ${selected && selected.inst === inst ? 'sel' : ''}" data-uid="${inst.uid}"><img src="${iconURL(inst)}" alt=""></button>`;
    }).join('');
    cells.querySelectorAll('.cell[data-uid]').forEach(b => {
      const inst = byUid(Number(b.dataset.uid));
      const cmpSlot = slotsFor(inst).find(s => canEquip(inst, clsId, s));
      Tip.set(b, () => itemTip(inst, clsId, cmpSlot && l[cmpSlot] !== inst ? l[cmpSlot] : null));
      b.addEventListener('click', () => { selected = { inst }; render(); });
      b.addEventListener('dblclick', () => { if (!locked) quickEquip(inst, clsId); });
    });
    // selected item: details and actions
    const det = $q('.inv-detail');
    if (!selected || !data.items.includes(selected.inst)) { det.innerHTML = '<p class="inv-hint">Select an item. Double-click to equip.</p>'; return; }
    const inst = selected.inst, worn = Object.entries(l).filter(([, v]) => v === inst).map(([s]) => s);
    const slots = slotsFor(inst).filter(s => canEquip(inst, clsId, s));
    const btns = [];
    if (worn.length) btns.push(`<button class="btn2" data-act="unequip" data-slot="${worn[0]}" ${locked ? 'disabled' : ''}>Unequip</button>`);
    else if (slots.length === 1) btns.push(`<button class="cta" data-act="equip" data-slot="${slots[0]}" ${locked ? 'disabled' : ''}>Equip</button>`);
    else if (slots.length === 2) btns.push(...slots.map((s, i) => `<button class="cta" data-act="equip" data-slot="${s}" ${locked ? 'disabled' : ''}>Equip in ${['I', 'II'][i]}</button>`));
    // selling: a second press confirms for Legendary and Mythic items, or anything another hero is wearing
    const others = wornBy(inst).filter(c => c !== clsId);
    const careful = itemRarity(inst) >= R_LEGENDARY || others.length;
    const sellTip = others.length ? `Worn by your ${others.map(c => CLASSES.find(x => x.id === c).name).join(', ')}` : '';
    btns.push(`<select class="send-to" ${locked || worn.length ? 'disabled' : ''} aria-label="Send to another hero"><option value="">Send to…</option>${CLASSES.filter(c => c.id !== clsId).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>`);
    btns.push(`<button class="btn2 sell" data-act="sell" ${locked || worn.length ? 'disabled' : ''}${sellTip ? ` data-tip="${sellTip}"` : ''}>Sell ${coin}${sellPrice(inst)}</button>`);
    det.innerHTML = `<img src="${iconURL(inst)}" alt=""><div class="det-text">${itemTip(inst, clsId)}</div><div class="det-btns">${btns.join('')}</div>
      ${locked ? '<p class="inv-hint">Gear is locked during a raid.</p>' : ''}`;
    const st = det.querySelector('.send-to');
    if (st) st.addEventListener('change', () => { if (st.value) { const c = CLASSES.find(x => x.id === st.value); sendTo(inst, st.value); deps.toast && deps.toast(`Sent to your ${c ? c.name : 'hero'}.`); } });
    det.querySelectorAll('button[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'equip') equip(clsId, b.dataset.slot, inst);
      else if (act === 'unequip') { unequip(clsId, b.dataset.slot); }
      else if (act === 'sell') {
        if (!careful || b.dataset.confirm) { selected = null; sell(inst); }
        else { b.dataset.confirm = '1'; b.innerHTML = `Sell for ${coin}${sellPrice(inst)}?`; b.classList.add('armed'); }
      }
    }));
  }
  function quickEquip(inst, clsId) {
    const l = loadout(clsId);
    const slots = slotsFor(inst).filter(s => canEquip(inst, clsId, s));
    if (!slots.length) return;
    const s = slots.find(x => !l[x]) || slots[0];
    equip(clsId, s, inst);
  }
  // the hero figure, drawn each frame while open
  function frame(now) {
    if (!isOpen() || !deps) return;
    const clsId = deps.cls(); if (!clsId) return;
    const c = fig.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 220, 230);
    deps.drawFigure(c, CLASSES.find(x => x.id === clsId), 220, 220, now);
  }

  showGold();

  return {
    init(d) { deps = d; },
    open, close, isOpen, toggle() { if (isOpen()) close(); else open(); }, frame,
    setExtra(fn) { extra = fn; modsCache.clear(); }, refresh() { modsCache.clear(); if (deps) deps.onChange(); },
    add, drop, spare, sendTo, escrow, settle, unescrow, unescrowAll, equip, unequip, mods, totals, grantStarter, loadout, items: () => data.items,
    itemName: inst => ITEMS[inst.key].name, rarityColor: inst => RARITY[itemRarity(inst)].color, iconURL, itemTip,
    addGold, showGoldHud(v) { goldHud.classList.toggle('hidden', !v); }, refreshGold: showGold,
  };
})();
