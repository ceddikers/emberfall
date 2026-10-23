// The one save for this browser: your name, your bag and gear, what each hero has cleared, and settings.
// It carries a version number. When the save format changes, bump VERSION and add an upgrade step to UPGRADES:
// old saves are upgraded one step at a time when the game loads (the original is copied to a backup key first),
// so an update never costs anyone their gear.
//
//   v1: { v, name, inv: { next, items: [{ uid, key, q }], equip: { classId: { slot: uid } } },
//         heroes: { classId: { clears: { bossId: { normal, hard } }, spec } }, settings: { debug } }
//   (spec and trials were added later without a version bump: both optional; a missing spec means the base kit,
//   missing trials mean none passed: heroes[classId].trials = { specId: 1 }; likewise heroes[classId].found = [ids],
//   the hidden recipes a hero has brewed, the Alembist's Reactions)
//   v2: + gold (the account-wide wallet); items lose `q`: rarity is now part of each item (items.js), so a Heroic copy
//       is simply that item. Each Heroic item you owned pays HEROIC_REFUND gold once, for the bonus it no longer has.
//       inv.lost holds items whose key the game doesn't know (kept, never deleted; they come back if the key returns).
//   v3: + heroes[classId].talents = { rows, picks }: how many talent rows the hero has unlocked with gold (0-5) and
//       the column picked in each row (null for none). See combat/talents.js.
//   v4: + talents.ids: the id of the talent picked in each row, so a pick follows its talent when the tree changes. A
//       pick whose id is no longer in its row is cleared on reading (the row stays bought). v3 picks were columns of the
//       first talent tree (V3_TALENT_IDS below), so the upgrade names them from that table.

const Save = (() => {
  const KEY = 'emberfall-save';
  const VERSION = 4;
  const freshTalents = () => ({ rows: 0, picks: [null, null, null, null, null], ids: [null, null, null, null, null] });
  // the talent trees v3 saves were made with (2026-10-19), row by row, for naming v3 picks (the Alembist's, Thermist's
  // and Driftblade's trees haven't changed since, so their picks carry over whole)
  const V3_TALENT_IDS = {
    thermist: 'embers flicker afterglow / front phase skin / thermocline latent rebound / vortex pulse solstice / zero conduct twin',
    driftblade: 'crescent eddies tailwind / calm gust sidestep / gyre second hover / galeforce jet hurricane / tailspin razor after',
    bastion: 'judgment counter lightforged / steadfast mercy sanctuary / unshaken riposte tithe / vigil wall standard / sunlit echo hallowed',
    bloodreaver: 'maul vein glutton / thirst iron scar / hunger quickvein feast / carnage roar deathless / rend tide frenzied',
    runeguard: 'etched afterglyph volatile / thick sanctum mirror / overflow reclaim thirdmark / long mirrorsedge well / glyphguard shards storm',
    ranger: 'rhythm keen markedvolley / shelter dressing lightfoot / quiver keenfocus trail / longhunt barrage rush / pin arrowstorm falcon',
    shadowblade: 'serrated cruel lasting / smoke evasion leech / relentless envenom quicken / longdance sprint vanish / toxic clone garrote',
    pyromancer: 'firestarter pyroclasm flashfire / heatshield tempered smolder / heatsink pressure kindling / longburn fuel afterburn / phoenix twin bomb',
    cleric: 'burning radiant petalfall / mending benevolence swift / fresh dew favour / widecircle devotion grace / sunfall twin judgment',
    grovekeeper: 'sunwrath awakened deepthorn / verdant bark rebirth / fertile harvest sap / lush seed oldgrowth / vines blossom naturewrath',
    chronomancer: 'honed double skip / practiced stasis recall / well borrowed paradox / allegro fermata crescendo / phase hourglass second',
    alembist: 'ricochet scorch kindle / flask cling spill / blend cask echo / flash reserve fume / quicksilver chain residue',
  };
  const v3Id = (cls, r, c) => { const t = V3_TALENT_IDS[cls], row = t && t.split(' / ')[r], id = row && row.split(' ')[c]; return id ? `${cls}_${id}` : null; };
  // the talent tree (combat/talents.js loads after this file; only read when someone asks)
  const tree = cls => (typeof TALENTS !== 'undefined' ? TALENTS[cls] : null);
  // a spec's rows VI-VII (SPEC_TALENTS), or null
  const specTree = (cls, spec) => (typeof specTalentRows === 'function' ? specTalentRows(cls, spec) : null);
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
    // 2 -> 3: talents; every hero starts with no rows unlocked
    2: d => {
      for (const h of Object.values(d.heroes || {})) if (h && typeof h === 'object' && !h.talents) h.talents = { rows: 0, picks: [null, null, null, null, null] };
      return d;
    },
    // 3 -> 4: name every pick (columns of the first tree) by its talent id; rows bought are untouched
    3: d => {
      for (const [cls, h] of Object.entries(d.heroes || {})) {
        const t = h && h.talents;
        if (!t || typeof t !== 'object') continue;
        const picks = Array.isArray(t.picks) ? t.picks : [];
        t.ids = [0, 1, 2, 3, 4].map(r => (Number.isInteger(picks[r]) ? v3Id(cls, r, picks[r]) : null));
      }
      return d;
    },
  };

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  let failed = false;
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); failed = false; }
    catch (e) { if (!failed && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('emberfall-save-failed')); failed = true; }   // storage unavailable or full
  }

  let upgradedFree = false;
  function load() {
    let d = read();
    let v = d && Number.isInteger(d.v) ? d.v : 0;
    if (d && v < VERSION) try { localStorage.setItem(`${KEY}-backup-v${v}`, JSON.stringify(d)); } catch (e) { /* no room for a backup */ }
    const upgraded = v < VERSION;
    while (v < VERSION) { d = UPGRADES[v](d); v += 1; d.v = v; }
    // fill in anything missing (a newer save keeps fields this version doesn't know about)
    d = Object.assign(fresh(), d);
    if (!d.inv || !Array.isArray(d.inv.items)) d.inv = fresh().inv;
    d.inv.items = d.inv.items.filter(i => i && typeof i === 'object');
    d.inv.equip = d.inv.equip && typeof d.inv.equip === 'object' ? d.inv.equip : {};
    if (!Array.isArray(d.inv.lost)) d.inv.lost = [];
    d.inv.lost = d.inv.lost.filter(i => i && typeof i === 'object');
    if (Array.isArray(d.inv.escrow)) d.inv.escrow = d.inv.escrow.filter(i => i && typeof i === 'object');
    if (!d.heroes || typeof d.heroes !== 'object') d.heroes = {};
    if (!d.settings || typeof d.settings !== 'object') d.settings = {};
    d.gold = Math.max(0, Math.floor(Number(d.gold) || 0));
    // the first talent row became free (2026-10-21): heroes who paid 60 for it get that gold back, once
    if (!d.talentRowFree) {
      for (const h of Object.values(d.heroes)) if (h && h.talents && (h.talents.rows | 0) >= 1) d.gold += 60;
      d.talentRowFree = 1; upgradedFree = true;
    }
    d.inv.next = Math.max(d.inv.next || 1, ...d.inv.items.map(i => (i.uid || 0) + 1), ...d.inv.lost.map(i => (i.uid || 0) + 1), ...(d.inv.escrow || []).map(i => (i.uid || 0) + 1));
    return { d, upgraded };
  }

  const { d: data, upgraded } = load();
  if (upgraded || upgradedFree) write();

  return {
    VERSION,
    get: k => data[k],
    set(k, v) { data[k] = v; write(); },
    commit: write,
    setting: (k, fallback) => (k in data.settings ? data.settings[k] : fallback),
    setSetting(k, v) { data.settings[k] = v; write(); },
    // sound (audio.js): settings.audio, added without a version bump; anything missing reads as its default
    AUDIO_DEFAULTS: { master: 0.7, sfx: 0.8, ui: 0.6, voice: 0.9, music: 0.5, amb: 0.5, mute: false, captions: true, speech: false },
    audio() {
      const a = data.settings.audio && typeof data.settings.audio === 'object' ? data.settings.audio : {}, o = {};
      for (const [k, d] of Object.entries(this.AUDIO_DEFAULTS)) o[k] = typeof a[k] === typeof d && (typeof d !== 'number' || Number.isFinite(a[k])) ? a[k] : d;
      return o;
    },
    // the account-wide wallet (boss clears, salvage and selling add to it; talent rows spend it)
    gold: () => data.gold,
    addGold(n) { n = Math.floor(Number(n) || 0); data.gold = Math.max(0, data.gold + n); write(); return data.gold; },
    // a boss clear counts for the hero you cleared it with (specializations will unlock from these)
    recordClear(classId, bossId, mode) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      const b = h.clears[bossId] = h.clears[bossId] || { normal: 0, hard: 0 };
      b[mode === 'hard' ? 'hard' : 'normal'] += 1;
      write();
    },
    // the boss journal (journal.js), per hero: { met: {boss: 1}, won: {boss: 1}, moves: {boss: {cast name: {seen, pass}}} }
    journal(classId) {
      const h = data.heroes[classId];
      const j = h && h.journal && typeof h.journal === 'object' ? h.journal : {};
      return { met: j.met || {}, won: j.won || {}, moves: j.moves || {} };
    },
    _jr(classId) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      const j = h.journal = h.journal && typeof h.journal === 'object' ? h.journal : {};
      j.met = j.met || {}; j.won = j.won || {}; j.moves = j.moves || {};
      return j;
    },
    // first meeting / first win: true when it's new
    journalMark(classId, bossId, kind) {
      const j = this._jr(classId), m = kind === 'won' ? j.won : j.met;
      if (m[bossId]) return false;
      m[bossId] = 1; write(); return true;
    },
    // a move seen (true the first time) / lived through (true the first time)
    journalSeen(classId, bossId, name) {
      const j = this._jr(classId), b = j.moves[bossId] = j.moves[bossId] || {}, e = b[name] = b[name] || { seen: 0, pass: 0 };
      e.seen += 1; write(); return e.seen === 1;
    },
    journalPass(classId, bossId, name) {
      const j = this._jr(classId), b = j.moves[bossId] = j.moves[bossId] || {}, e = b[name] = b[name] || { seen: 1, pass: 0 };
      e.pass += 1; write(); return e.pass === 1;
    },
    // has any hero on this account cleared this boss (either difficulty)? The next boss opens on it, and the Hollow
    // King's first fall reveals the specializations.
    bossBeaten: bossId => Object.values(data.heroes).some(h => h && h.clears && h.clears[bossId] && (h.clears[bossId].normal | 0) + (h.clears[bossId].hard | 0) > 0),
    // Hard opens once every boss has fallen on Normal (any hero on this account), then one boss at a time from Grubnak:
    // each Hard fight opens on the Hard clear of the one before it.
    normalBeaten: bossId => Object.values(data.heroes).some(h => h && h.clears && h.clears[bossId] && (h.clears[bossId].normal | 0) > 0),
    hardBeaten: bossId => Object.values(data.heroes).some(h => h && h.clears && h.clears[bossId] && (h.clears[bossId].hard | 0) > 0),
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
    // talents (combat/talents.js): { rows: unlocked rows 0-7, picks: [column or null per row I-V] }. Rows VI-VII are the
    // spec rows (bought once per hero, after V; only with a spec): their picks live per spec in talents.specIds =
    // { specId: [id VI, id VII] } (added without a version bump: missing means none), and talents() reads the active
    // spec's as { spec, specPicks: [column or null, column or null] }. Rows are bought with
    // gold in order; picks are free to change (the game only lets you change them in town).
    // A pick names its talent (ids): if that talent moved within its row the pick follows it, if it left the row the
    // pick reads as none. (A pick with no id, from before v4, keeps its column.)
    talents(classId) {
      const t = (data.heroes[classId] || {}).talents || freshTalents();
      const rows = Math.max(1, Math.min(7, t.rows | 0)), T = tree(classId);   // (row I is free: always open)
      const picks = [0, 1, 2, 3, 4].map(r => {
        const id = Array.isArray(t.ids) ? t.ids[r] : null;
        if (typeof id === 'string' && T && T[r]) { const c = T[r].findIndex(x => x.id === id); return c >= 0 ? c : null; }
        return Number.isInteger(t.picks && t.picks[r]) && t.picks[r] >= 0 && t.picks[r] < 3 ? t.picks[r] : null;
      });
      const spec = this.spec(classId), ST = specTree(classId, spec), sids = (t.specIds && spec && t.specIds[spec]) || [];
      const specPicks = [0, 1].map(i => { const id = sids[i]; if (typeof id !== 'string' || !ST || !ST[i]) return null; const c = ST[i].findIndex(x => x.id === id); return c >= 0 ? c : null; });
      return { rows, picks, spec, specPicks };
    },
    heroTalents(classId) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      if (!h.talents) h.talents = freshTalents();
      if ((h.talents.rows | 0) < 1) h.talents.rows = 1;   // (the first row is free: every hero starts with it open)
      return h.talents;
    },
    // unlock the next row for `cost` gold; false if the wallet is short or every row is open
    unlockTalentRow(classId, cost) {
      const t = this.heroTalents(classId);
      if ((t.rows | 0) >= 7 || data.gold < cost) return false;
      if ((t.rows | 0) >= 5 && !specTree(classId, this.spec(classId))) return false;   // (the spec rows: only once a spec is chosen)
      data.gold -= cost; t.rows = (t.rows | 0) + 1;
      write();
      return true;
    },
    pickTalent(classId, row, col) {
      const t = this.heroTalents(classId);
      if (row >= 5 && row < (t.rows | 0)) {   // a spec row: the active spec's own pick
        const spec = this.spec(classId), ST = specTree(classId, spec), r = row - 5;
        if (!ST || !ST[r] || !ST[r][col] || col < 0) return false;
        if (!t.specIds || typeof t.specIds !== 'object') t.specIds = {};
        const cur = Array.isArray(t.specIds[spec]) ? t.specIds[spec] : (t.specIds[spec] = [null, null]);
        cur[r] = ST[r][col].id;
        write();
        return true;
      }
      if (row < 0 || row >= Math.min(5, t.rows | 0) || col < 0 || col > 2) return false;
      if (!Array.isArray(t.picks)) t.picks = freshTalents().picks;
      if (!Array.isArray(t.ids)) t.ids = freshTalents().ids;
      const T = tree(classId);
      t.picks[row] = col;
      t.ids[row] = T && T[row] && T[row][col] ? T[row][col].id : null;
      write();
      return true;
    },
    resetTalents(classId) { const t = this.heroTalents(classId); t.picks = freshTalents().picks; t.ids = freshTalents().ids; const sp = this.spec(classId); if (sp && t.specIds) delete t.specIds[sp]; write(); },
    // hidden recipes a hero has found (the Alembist's Volatile Reactions): heroes[classId].found = [ids], added
    // without a version bump (optional; missing means none found)
    found: classId => { const f = (data.heroes[classId] || {}).found; return Array.isArray(f) ? f.filter(x => typeof x === 'string') : []; },
    discover(classId, id) {
      const h = data.heroes[classId] = data.heroes[classId] || { clears: {} };
      if (!Array.isArray(h.found)) h.found = [];
      if (typeof id !== 'string' || h.found.includes(id)) return false;
      h.found.push(id); write();
      return true;
    },
  };
})();

if (typeof module !== 'undefined') module.exports = { Save };
