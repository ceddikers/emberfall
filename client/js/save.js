// The one save for this browser: your name, your bag and gear, what each hero has cleared, and settings.
// It carries a version number. When the save format changes, bump VERSION and add an upgrade step to UPGRADES:
// old saves are upgraded one step at a time when the game loads (the original is copied to a backup key first),
// so an update never costs anyone their gear.
//
//   v1: { v, name, inv: { next, items: [{ uid, key, q }], equip: { classId: { slot: uid } } },
//         heroes: { classId: { clears: { bossId: { normal, hard } }, spec } }, settings: { debug } }
//   (spec and trials were added later without a version bump: both optional; a missing spec means the base kit,
//   missing trials mean none passed: heroes[classId].trials = { specId: 1 })
//   v2: + gold (the account-wide wallet); items lose `q`: rarity is now part of each item (items.js), so a Heroic copy
//       is simply that item. Each Heroic item you owned pays HEROIC_REFUND gold once, for the bonus it no longer has.
//       inv.lost holds items whose key the game doesn't know (kept, never deleted; they come back if the key returns).

const Save = (() => {
  const KEY = 'emberfall-save';
  const VERSION = 2;
  const HEROIC_REFUND = 10;
  const fresh = () => ({ v: VERSION, name: '', gold: 0, inv: { next: 1, items: [], equip: {}, lost: [] }, heroes: {}, settings: {} });

  // UPGRADES[n] turns a version-n save into a version n+1 save
  const UPGRADES = {
    // 0 -> 1: before saves had versions, the bag lived under its own key and your name under another
    0: () => {
      const d = fresh();
      try { const inv = JSON.parse(localStorage.getItem('emberfall-inv-v1') || 'null'); if (inv && Array.isArray(inv.items)) d.inv = inv; } catch (e) { /* unreadable */ }
      try { d.name = localStorage.getItem('emberfall-name') || ''; } catch (e) { /* storage unavailable */ }
      return d;
    },
    // 1 -> 2: the gold wallet; the Heroic flag goes (every item keeps its key, uid and place in your gear)
    1: d => {
      let heroic = 0;
      const items = d.inv && Array.isArray(d.inv.items) ? d.inv.items : [];
      for (const it of items) { if (it && it.q) heroic++; if (it) delete it.q; }
      d.gold = (Number(d.gold) || 0) + heroic * HEROIC_REFUND;
      return d;
    },
  };

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable or full */ } }

  function load() {
    let d = read();
    let v = d && Number.isInteger(d.v) ? d.v : 0;
    if (d && v < VERSION) try { localStorage.setItem(`${KEY}-backup-v${v}`, JSON.stringify(d)); } catch (e) { /* no room for a backup */ }
    const upgraded = v < VERSION;
    while (v < VERSION) { d = UPGRADES[v](d); v += 1; d.v = v; }
    // fill in anything missing (a newer save keeps fields this version doesn't know about)
    d = Object.assign(fresh(), d);
    if (!d.inv || !Array.isArray(d.inv.items)) d.inv = fresh().inv;
    d.inv.equip = d.inv.equip || {};
    if (!Array.isArray(d.inv.lost)) d.inv.lost = [];
    d.gold = Math.max(0, Math.floor(Number(d.gold) || 0));
    d.inv.next = Math.max(d.inv.next || 1, ...d.inv.items.map(i => (i.uid || 0) + 1), ...d.inv.lost.map(i => (i.uid || 0) + 1));
    return { d, upgraded };
  }

  const { d: data, upgraded } = load();
  if (upgraded) write();

  return {
    VERSION,
    get: k => data[k],
    set(k, v) { data[k] = v; write(); },
    commit: write,
    setting: (k, fallback) => (k in data.settings ? data.settings[k] : fallback),
    setSetting(k, v) { data.settings[k] = v; write(); },
    // the account-wide wallet (boss clears, salvage and selling add to it; talents will spend it)
    gold: () => data.gold,
    addGold(n) { n = Math.floor(Number(n) || 0); data.gold = Math.max(0, data.gold + n); write(); return data.gold; },
    // a boss clear counts for the hero you cleared it with (specializations will unlock from these)
    recordClear(classId, bossId, mode) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      const b = h.clears[bossId] = h.clears[bossId] || { normal: 0, hard: 0 };
      b[mode === 'hard' ? 'hard' : 'normal'] += 1;
      write();
    },
    clears: (classId, bossId) => ((data.heroes[classId] || { clears: {} }).clears[bossId] || { normal: 0, hard: 0 }),
    // specializations: a hero's trials open once it has cleared the Hollow King (any difficulty), and passing a
    // spec's trial unlocks that spec for the hero (trials.js)
    trialsOpen(classId) { const c = this.clears(classId, 'hollowking'); return c.normal + c.hard > 0; },
    trialDone: (classId, specId) => !!(((data.heroes[classId] || {}).trials || {})[specId]),
    recordTrial(classId, specId) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      h.trials = h.trials || {}; h.trials[specId] = 1;
      write();
    },
    // 'open' (playable), 'trial' (its trial is open) or 'locked'
    specState(classId, specId) { return !specId || this.trialDone(classId, specId) ? 'open' : this.trialsOpen(classId) ? 'trial' : 'locked'; },
    // each hero's chosen specialization (specs.js), or null for the base kit (a spec it hasn't unlocked reads as none)
    spec(classId) { const s = (data.heroes[classId] || {}).spec || null; return s && this.trialDone(classId, s) ? s : null; },
    setSpec(classId, specId) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      h.spec = specId || null;
      write();
    },
  };
})();

if (typeof module !== 'undefined') module.exports = { Save };
