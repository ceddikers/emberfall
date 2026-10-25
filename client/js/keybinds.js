// Options (K): your own keys for every skill and panel (keyboard keys or a mouse's side buttons), and the HUD
// arranged where you like it. Both stay in this browser.

const Keybinds = (() => {
  const KEY = 'emberfall.binds', LAYOUT_KEY = 'emberfall.layout';
  // what can be bound, in the order the panel lists them (s0-s7: the hotbar's slots). cls: live only while you play
  // that class; not: live for every class but that one. Two actions clash only if some hero has both live at once.
  const ACTIONS = [
    { id: 's0', def: 'q' }, { id: 's1', def: 'w' }, { id: 's2', def: 'e' }, { id: 's3', def: 'r' },
    { id: 's4', def: 'd' }, { id: 's5', def: 'f' }, { id: 's6', def: ' ', name: 'Dash' }, { id: 's7', def: 't', name: 'Ultimate' },
    { id: 'focus', def: 'v', name: 'Set focus' }, { id: 'limit', def: 'g', name: 'Limit Break' }, { id: 'meter', def: 'm', name: 'Damage meter' }, { id: 'metermode', def: 'b', name: 'Meter: next view' },
    { id: 'rezask', def: 'h', name: 'Ask for a raise' },
    { id: 'resync', def: '', name: 'Resync with the host' },   // (unbound until you choose a key)
    { id: 'bags', def: 'i', name: 'Inventory' }, { id: 'talents', def: 'n', name: 'Talents' },
    { id: 'journal', def: 'j', name: 'Journal' }, { id: 'logbook', def: 'l', name: 'Logbook' }, { id: 'options', def: 'k', name: 'Options' },
    { id: 'cycle', def: 'tab', name: 'Next enemy' }, { id: 'hurt', def: '`', name: 'Most hurt ally' }, { id: 'chat', def: 'enter', name: 'Chat' },
    { id: 'ally1', def: '1', name: 'Party member 1', not: 'alembist' }, { id: 'ally2', def: '2', name: 'Party member 2', not: 'alembist' },
    { id: 'ally3', def: '3', name: 'Party member 3', not: 'alembist' }, { id: 'ally4', def: '4', name: 'Party member 4', not: 'alembist' },
    // the Alembist's own: the number keys mark the vial Throw takes (main.js), so party selection moves to F1-F4
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'vial' + i, def: String(i), name: `Mark vial ${i}`, cls: 'alembist' })),
    ...[1, 2, 3, 4].map(i => ({ id: 'alemAlly' + i, def: 'f' + i, name: `Party member ${i}`, cls: 'alembist' })),
  ];
  const CLASS_KEYS = { alembist: { name: 'Alembist', note: 'Number keys mark a vial for Throw; the party moves to F1-F4.' } };
  const live = (a, cls) => (!a.cls || a.cls === cls) && a.not !== cls;
  const clash = (a, b) => (a.cls ? live(b, a.cls) : b.cls ? live(a, b.cls) : true);
  // keys the game keeps for itself (chat, targeting, menus)
  const RESERVED = new Set(['escape', 'shift', 'alt', 'control', 'meta', 'mouse0', 'mouse1', 'mouse2', 'f3', 'f5', 'f11', 'f12']);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let binds = {};
  function load() {
    binds = {};
    for (const a of ACTIONS) binds[a.id] = a.def;
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && typeof v === 'object') for (const a of ACTIONS) if (typeof v[a.id] === 'string' && v[a.id].length <= 12 && !RESERVED.has(v[a.id])) binds[a.id] = v[a.id];
      // (an action newer than the saved keys starts unbound if its default is already taken by one it clashes with)
      if (v && typeof v === 'object') for (const a of ACTIONS) if (!(a.id in v) && ACTIONS.some(o => o !== a && binds[o.id] === a.def && clash(o, a))) binds[a.id] = '';
    } catch (e) { /* the defaults */ }
    labels();
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(binds)); } catch (e) { /* not remembered */ } };

  // a key as written on a keycap
  function label(k, short) {
    if (k == null || k === '') return '—';
    if (k === ' ') return short ? 'SPC' : 'Space';
    if (k === 'mouse3') return 'M4';
    if (k === 'mouse4') return 'M5';
    const named = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', backspace: 'Bksp', delete: 'Del', capslock: 'Caps', pageup: 'PgUp', pagedown: 'PgDn', home: 'Home', end: 'End', insert: 'Ins' };
    if (named[k]) return named[k];
    return k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1);
  }
  // the hotbar and the hero pages read their key names from KEYS (data.js) and SLOT_KEYS (hud.js)
  function labels() {
    for (let i = 0; i < 8; i++) {
      const k = binds['s' + i];
      if (typeof KEYS !== 'undefined') KEYS[i] = label(k);
      if (typeof SLOT_KEYS !== 'undefined') SLOT_KEYS[i] = label(k, true);
    }
  }
  // the key from an event (keyboard: e.key lower-cased; mouse: 'mouse' + button)
  const keyOf = e => (e.type && e.type.startsWith('mouse') ? 'mouse' + e.button : (e.key || '').toLowerCase());
  // which action this key is bound to for a hero of class cls (the class-only keys: CLASS_KEYS), or null
  function actionOf(k, cls) { if (!k) return null; for (const a of ACTIONS) if (binds[a.id] === k && live(a, cls)) return a.id; return null; }
  const keyFor = id => binds[id];

  // ---------------------------------------------------------------- the HUD layout
  // Each piece can be nudged anywhere on screen; the offsets are applied as a CSS translate (the docking and the
  // game's own positioning stay as they are underneath).
  const PIECES = [
    { sel: '#combat-hud', fit: '#combat-hud .hud-main', name: 'Hotbar' }, { sel: '#pf-wrap', name: 'Party frames' }, { sel: '#boss-bar', name: 'Boss bar' },
    { sel: '#raid-left', name: 'Progress' }, { sel: '#live-meter', name: 'Damage meter' }, { sel: '#waymarks', name: 'Markers' },
    { sel: '#lb-gauge', name: 'Limit Break' }, { sel: '#minimap', name: 'Minimap' }, { sel: '#target-frame', name: 'Target' }, { sel: '#focus-frame', name: 'Focus' },
  ];
  let layout = {};
  try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); if (v && typeof v === 'object') layout = v; } catch (e) { /* none */ }
  const saveLayout = () => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (e) { /* not remembered */ } };
  let arranging = false, ghosts = [];
  // called every frame: keeps each piece where it was put (pieces can be rebuilt by the game)
  function applyLayout() {
    applyScale();
    for (const p of PIECES) {
      const el = document.querySelector(p.sel);
      if (!el) continue;
      const o = layout[p.sel], v = o ? `${Math.round(o[0])}px ${Math.round(o[1])}px` : '';
      if (el.style.translate !== v) el.style.translate = v;
      // (a smaller window never leaves a piece off-screen: it's nudged back until 24 px of it shows)
      if (o && !arranging) {
        const r = el.getBoundingClientRect();
        if (r.width && r.height) {
          const dx = r.right < 24 ? 24 - r.right : r.left > innerWidth - 24 ? innerWidth - 24 - r.left : 0;
          const dy = r.bottom < 24 ? 24 - r.bottom : r.top > innerHeight - 24 ? innerHeight - 24 - r.top : 0;
          if (dx || dy) { o[0] += dx; o[1] += dy; el.style.translate = `${Math.round(o[0])}px ${Math.round(o[1])}px`; }
        }
      }
    }
    if (arranging) for (const g of ghosts) {
      const el = document.querySelector(g.dataset.sel), fit = document.querySelector(g.dataset.fit) || el, r = el && fit.getBoundingClientRect();   // (the outline hugs what you see: the hotbar's box is wider than its bar)
      const show = !!(r && r.width && r.height && !el.closest('.hidden'));   // (fixed pieces have no offsetParent)
      g.classList.toggle('hidden', !show);
      if (show) Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    }
  }
  function arrange(on) {
    arranging = on;
    for (const g of ghosts) g.remove();
    ghosts = [];
    document.body.classList.toggle('arranging', on);
    if (!on) return;
    for (const p of PIECES) {
      const g = document.createElement('div');
      g.className = 'hud-ghost hidden'; g.dataset.sel = p.sel; g.dataset.fit = p.fit || p.sel; g.innerHTML = `<span>${esc(p.name)}</span>`;
      g.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        const o = layout[p.sel] || [0, 0], x0 = e.clientX, y0 = e.clientY;
        const move = ev => { layout[p.sel] = [o[0] + ev.clientX - x0, o[1] + ev.clientY - y0]; applyLayout(); };
        const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); saveLayout(); };
        addEventListener('mousemove', move); addEventListener('mouseup', up);
      });
      g.addEventListener('dblclick', () => { delete layout[p.sel]; saveLayout(); applyLayout(); });
      document.body.appendChild(g);
      ghosts.push(g);
    }
    const bar = document.createElement('div');
    bar.className = 'hud-ghost-bar';
    bar.innerHTML = `<b>Arranging the HUD</b><span>Drag a piece to move it · double-click to put it back</span><button type="button" class="btn2 hg-reset">Reset all</button><button type="button" class="cta hg-done">Done</button>`;
    bar.querySelector('.hg-reset').addEventListener('click', () => { layout = {}; saveLayout(); applyLayout(); });
    bar.querySelector('.hg-done').addEventListener('click', () => arrange(false));
    bar.addEventListener('mousedown', e => e.stopPropagation());
    document.body.appendChild(bar);
    ghosts.push(bar);
  }

  // ---------------------------------------------------------------- the Options panel
  let panel = null, capturing = null, namer = () => null, onChange = () => {}, heroCls = null;
  // game settings shown here (main.js): { get() -> { frames, role, mouseover }, set(key, value) }
  let prefs = null;
  // Resync (main.js requestResync): asks the host for the fight as it stands
  let resync = null, canResync = () => true, callouts = null, inRaid = () => false;
  const TABS = [['keys', 'Keys'], ['ui', 'Interface'], ['audio', 'Audio'], ['data', 'Data']];
  let tab = 'keys';
  try { const v = localStorage.getItem('emberfall.optionsTab'); if (TABS.some(t => t[0] === v)) tab = v; } catch (e) { /* the first tab */ }
  function showTab(id) {
    tab = id; capturing = null;
    try { localStorage.setItem('emberfall.optionsTab', id); } catch (e) { /* not remembered */ }
    panel.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
    panel.querySelectorAll('[data-page]').forEach(p => p.classList.toggle('off', p.dataset.page !== id));
  }
  function render() {
    // a class's own keys show only while you play that class (CLASS_KEYS)
    panel.querySelector('.kb-list').innerHTML = ACTIONS.map((a, i) => {
      if (!live(a, heroCls) || (a.id === 'resync' && !canResync())) return '';   // (the other class's keys; Resync for a host or solo player, who always sees the fight as it is)
      const n = a.name || namer(Number(a.id.slice(1))) || `Skill ${Number(a.id.slice(1)) + 1}`;
      const head = a.cls && (i === 0 || ACTIONS[i - 1].cls !== a.cls) && CLASS_KEYS[a.cls] ? `<div class="kb-sub"><b>${esc(CLASS_KEYS[a.cls].name)}</b><span class="kb-note">${esc(CLASS_KEYS[a.cls].note)}</span></div>` : '';
      return `${head}<div class="kb-row"><span>${esc(n)}</span><button type="button" class="kb-key${capturing === a.id ? ' wait' : ''}" data-a="${a.id}">${capturing === a.id ? 'Press a key…' : esc(label(binds[a.id]))}</button></div>`;
    }).join('');
  }
  function bind(id, k) {
    if (RESERVED.has(k)) return false;
    // an action that clashes with this one and has the key gives it up: the two swap (or, if the freed key clashes for it
    // in turn, it's left unbound). The Alembist's own keys and the party keys they replace never clash.
    const A = ACTIONS.find(a => a.id === id), old = binds[id];
    for (const o of ACTIONS) {
      if (o.id === id || binds[o.id] !== k || !clash(o, A)) continue;
      binds[o.id] = ACTIONS.some(x => x.id !== o.id && x.id !== id && binds[x.id] === old && clash(x, o)) ? '' : old;
    }
    binds[id] = k;
    save(); labels(); onChange();
    return true;
  }
  function capture(e) {
    if (!capturing) return;
    e.preventDefault(); e.stopPropagation();
    const k = keyOf(e);
    if (k === 'escape') { capturing = null; render(); return; }
    if (bind(capturing, k)) { capturing = null; render(); }
    else {
      const id = capturing, b = panel.querySelector(`[data-a="${id}"]`);
      if (b) { b.textContent = `${label(k)} is kept`; setTimeout(() => { if (capturing === id && b.isConnected) b.textContent = 'Press a key…'; }, 1500); }
    }
  }
  function openPanel(opts = {}) {
    heroCls = opts.cls !== undefined ? opts.cls : heroCls; namer = opts.namer || namer; onChange = opts.onChange || onChange; prefs = opts.prefs || prefs; resync = opts.resync || resync; canResync = opts.canResync || canResync; callouts = opts.callouts || callouts; inRaid = opts.inRaid || inRaid;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'options'; panel.className = 'hidden';
      // four tabs; every page shares one cell, so the panel keeps one size whichever tab is open
      const vols = [['master', 'Master'], ['sfx', 'Effects'], ['ui', 'Menus'], ['voice', 'Voices'], ['music', 'Music'], ['amb', 'Ambience']];
      panel.innerHTML = `<header><h3>Options</h3><button type="button" class="close" aria-label="Close" data-tip="Close (Esc)">×</button></header>
        <nav class="inv-tabs kb-tabs">${TABS.map(([id, n]) => `<button type="button" data-tab="${id}">${n}</button>`).join('')}</nav>
        <div class="kb-pages">
          <section data-page="keys">
            <div class="kb-list"></div>
            <div class="kb-foot"><button type="button" class="btn2 kb-reset">Reset keys</button><span class="kb-note">Click a key, then press the new one. Taking a key swaps it.</span></div>
            <p class="kb-note kb-fixed">Alt-drag: ping wheel · Middle-click: ping · Shift + skill: on yourself · Shift + next enemy: back</p>
          </section>
          <section data-page="ui">
            <div class="kb-foot kb-scale"><label for="kb-scale">Interface size</label><input id="kb-scale" type="range" min="80" max="140" step="5"><b class="kb-scale-v"></b></div>
            <div class="kb-foot"><button type="button" class="btn2 kb-arrange">Arrange the HUD</button><button type="button" class="btn2 kb-callouts" data-tip="Edit the pings and callouts you send to your party.">Callouts…</button></div>
            <div class="kb-foot kb-resync-row"><button type="button" class="btn2 kb-resync" data-tip="If what you see in a raid looks off, this asks the host for the fight as it stands and redraws it, without leaving. A key can be set for it under Keys.">Resync with the host</button></div>
            <div class="kb-foot kb-pref"><label for="kb-frames">Party frames</label><select id="kb-frames"><option value="left">In the corner</option><option value="strip">Above your skills</option></select><span class="kb-note kb-frames-note"></span></div>
            <div class="kb-foot kb-pref"><label class="kb-check" data-tip="Point at a party frame or an ally and press a heal: it goes to them. Off: heals go to the ally you selected, or to you."><input type="checkbox" id="kb-mouseover"> Mouseover casting</label></div>
            <div class="kb-foot kb-pref"><label class="kb-check" data-tip="A small bar over your hero in a raid, like the one over your allies."><input type="checkbox" id="kb-selfbar"> Your own health bar</label></div>
          </section>
          <section data-page="audio">
            ${vols.map(([k, n]) => `<div class="kb-foot kb-scale kb-vol"><label for="kb-vol-${k}">${n}</label><input id="kb-vol-${k}" type="range" min="0" max="100" step="5" data-vol="${k}"><b></b></div>`).join('')}
            <div class="kb-foot"><label class="kb-check"><input type="checkbox" id="kb-mute"> Mute all sound</label></div>
            <div class="kb-foot"><label class="kb-check"><input type="checkbox" id="kb-captions"> Subtitles for voice lines</label></div>
            <div class="kb-foot"><label class="kb-check" data-tip="Your browser's own voice reads lines that have no recording. It sounds robotic."><input type="checkbox" id="kb-speech"> Device speech for missing voices</label></div>
          </section>
          <section data-page="data">
            <div class="kb-foot"><button type="button" class="btn2 kb-wipe">Delete all data</button></div>
            <p class="kb-note">Heroes, gear, gold, journals, progress and settings in this browser. It can't be undone.</p>
          </section>
        </div>`;
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => {
        e.stopPropagation();
        if (capturing && e.button >= 3) capture(e);
      });
      panel.addEventListener('click', e => {
        const t = e.target;
        if (t.classList.contains('close')) { closePanel(); return; }
        if (t.dataset.tab) { showTab(t.dataset.tab); render(); return; }
        if (t.classList.contains('kb-reset')) { for (const a of ACTIONS) binds[a.id] = a.def; save(); labels(); onChange(); render(); return; }
        if (t.classList.contains('kb-arrange')) { closePanel(); arrange(true); return; }
        if (t.classList.contains('kb-callouts')) { closePanel(); if (callouts) callouts(); return; }
        if (t.classList.contains('kb-resync')) { if (resync) resync(); return; }
        if (t.classList.contains('kb-wipe')) {
          // two presses, the second within five seconds (the button disarms itself after that)
          if (!t.dataset.armed) {
            t.dataset.armed = '1'; t.textContent = 'Press again to delete everything'; t.classList.add('armed');
            setTimeout(() => { delete t.dataset.armed; t.textContent = 'Delete all data'; t.classList.remove('armed'); }, 5000);
            return;
          }
          try { for (const k of Object.keys(localStorage)) if (k.startsWith('emberfall')) localStorage.removeItem(k); } catch (e) { /* storage unavailable */ }
          location.reload();
          return;
        }
        if (t.dataset.a) { capturing = capturing === t.dataset.a ? null : t.dataset.a; render(); }
      });
      addEventListener('keydown', capture, true);
      const sc = panel.querySelector('#kb-scale');
      sc.value = Math.round(uiScale * 100);
      panel.querySelector('.kb-scale-v').textContent = sc.value + '%';
      sc.addEventListener('input', () => { setScale(Number(sc.value) / 100); panel.querySelector('.kb-scale-v').textContent = sc.value + '%'; });
      panel.querySelector('#kb-frames').addEventListener('change', e => { if (prefs) prefs.set('frames', e.target.value); });
      panel.querySelector('#kb-mouseover').addEventListener('change', e => { if (prefs) prefs.set('mouseover', e.target.checked); });
      panel.querySelector('#kb-selfbar').addEventListener('change', e => { if (prefs) prefs.set('selfbar', e.target.checked); });
      // sound (audio.js): every change applies at once and is saved with the game
      panel.querySelectorAll('[data-vol]').forEach(el => el.addEventListener('input', () => {
        if (typeof Sound !== 'undefined') Sound.set(el.dataset.vol, Number(el.value) / 100);
        el.nextElementSibling.textContent = el.value + '%';
      }));
      for (const [id, k] of [['kb-mute', 'mute'], ['kb-captions', 'captions'], ['kb-speech', 'speech']]) panel.querySelector('#' + id).addEventListener('change', e => { if (typeof Sound !== 'undefined') Sound.set(k, e.target.checked); });
    }
    // the settings as they stand now (the frames are kept per role: a healer's and a tank's can differ)
    const pv = prefs ? prefs.get() : null;
    panel.querySelectorAll('.kb-pref').forEach(el => el.classList.toggle('hidden', !pv));
    if (pv) {
      panel.querySelector('#kb-frames').value = pv.frames;
      panel.querySelector('.kb-frames-note').textContent = pv.role ? `For your ${pv.role} heroes.` : '';
      panel.querySelector('#kb-mouseover').checked = !!pv.mouseover;
      panel.querySelector('#kb-selfbar').checked = !!pv.selfbar;
    }
    if (typeof Sound !== 'undefined') {
      panel.querySelectorAll('[data-vol]').forEach(el => { el.value = Math.round((Sound.get(el.dataset.vol) ?? 0) * 100); el.nextElementSibling.textContent = el.value + '%'; });
      panel.querySelector('#kb-mute').checked = !!Sound.get('mute');
      panel.querySelector('#kb-captions').checked = !!Sound.get('captions');
      panel.querySelector('#kb-speech').checked = !!Sound.get('speech');
    }
    panel.querySelector('.kb-resync-row').classList.toggle('hidden', !canResync());
    panel.querySelector('.kb-arrange').dataset.tip = inRaid() ? 'Drag any piece of the HUD where you like it.' : 'Drag any piece of the HUD where you like it. The boss bar, meter and markers only show in a raid.';
    panel.querySelector('.kb-callouts').classList.toggle('hidden', !callouts);
    showTab(tab);
    render();
    panel.classList.remove('hidden');
  }
  function closePanel() { if (panel) panel.classList.add('hidden'); capturing = null; }
  const panelOpen = () => !!panel && !panel.classList.contains('hidden');

  // the interface size (HUD and raid frames), for small laptops and big screens
  let uiScale = 1;
  try { uiScale = Math.max(0.8, Math.min(1.4, Number(localStorage.getItem('emberfall.uiscale')) || 1)); } catch (e) { /* 100% */ }
  function setScale(v) {
    uiScale = Math.max(0.8, Math.min(1.4, v));
    try { localStorage.setItem('emberfall.uiscale', String(uiScale)); } catch (e) { /* not remembered */ }
    applyScale();
  }
  function applyScale() {
    for (const sel of ['#combat-hud', '#raid-ui', '#hud-tl', '#party']) { const el = document.querySelector(sel); if (el && el.style.zoom !== String(uiScale)) el.style.zoom = uiScale === 1 ? '' : String(uiScale); }
  }
  load();
  return { ACTIONS, keyOf, actionOf, keyFor, label, openPanel, closePanel, panelOpen, applyLayout, arrange, isArranging: () => arranging, isCapturing: () => !!capturing };
})();
