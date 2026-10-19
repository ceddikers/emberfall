// The one save for this browser: your name, your bag and gear, what each hero has cleared, and settings.
// It carries a version number. When the save format changes, bump VERSION and add an upgrade step to UPGRADES:
// old saves are upgraded one step at a time when the game loads (the original is copied to a backup key first),
// so an update never costs anyone their gear.
//
//   v1: { v, name, inv: { next, items: [{ uid, key, q }], equip: { classId: { slot: uid } } },
//         heroes: { classId: { clears: { bossId: { normal, hard } }, spec } }, settings: { debug } }
//   (spec was added later without a version bump: it's optional, and a missing one means the base kit)

const Save = (() => {
  const KEY = 'emberfall-save';
  const VERSION = 1;
  const fresh = () => ({ v: VERSION, name: '', inv: { next: 1, items: [], equip: {} }, heroes: {}, settings: {} });

  // UPGRADES[n] turns a version-n save into a version n+1 save
  const UPGRADES = {
    // 0 -> 1: before saves had versions, the bag lived under its own key and your name under another
    0: () => {
      const d = fresh();
      try { const inv = JSON.parse(localStorage.getItem('emberfall-inv-v1') || 'null'); if (inv && Array.isArray(inv.items)) d.inv = inv; } catch (e) { /* unreadable */ }
      try { d.name = localStorage.getItem('emberfall-name') || ''; } catch (e) { /* storage unavailable */ }
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
    d.inv.next = Math.max(d.inv.next || 1, ...d.inv.items.map(i => (i.uid || 0) + 1));
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
    // a boss clear counts for the hero you cleared it with (specializations will unlock from these)
    recordClear(classId, bossId, mode) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      const b = h.clears[bossId] = h.clears[bossId] || { normal: 0, hard: 0 };
      b[mode === 'hard' ? 'hard' : 'normal'] += 1;
      write();
    },
    clears: (classId, bossId) => ((data.heroes[classId] || { clears: {} }).clears[bossId] || { normal: 0, hard: 0 }),
    // each hero's chosen specialization (specs.js), or null for the base kit
    spec: classId => ((data.heroes[classId] || {}).spec || null),
    setSpec(classId, specId) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      h.spec = specId || null;
      write();
    },
  };
})();

if (typeof module !== 'undefined') module.exports = { Save };
