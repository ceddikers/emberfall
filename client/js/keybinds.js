// Options (K): your own keys for every skill and panel (keyboard keys or a mouse's side buttons), and the HUD
// arranged where you like it. Both stay in this browser.

const Keybinds = (() => {
  const KEY = 'emberfall.binds', LAYOUT_KEY = 'emberfall.layout';
  // what can be bound, in the order the panel lists them (s0-s7: the hotbar's slots)
  const ACTIONS = [
    { id: 's0', def: 'q' }, { id: 's1', def: 'w' }, { id: 's2', def: 'e' }, { id: 's3', def: 'r' },
    { id: 's4', def: 'd' }, { id: 's5', def: 'f' }, { id: 's6', def: ' ', name: 'Dash' }, { id: 's7', def: 't', name: 'Taunt' },
    { id: 'focus', def: 'v', name: 'Set focus' }, { id: 'limit', def: 'g', name: 'Limit Break' }, { id: 'meter', def: 'm', name: 'Damage meter' },
    { id: 'bags', def: 'i', name: 'Bags' }, { id: 'talents', def: 'n', name: 'Talents' },
    { id: 'journal', def: 'j', name: 'Journal' }, { id: 'options', def: 'k', name: 'Options' },
  ];
  // keys the game keeps for itself (chat, targeting, menus)
  const RESERVED = new Set(['enter', 'escape', 'tab', '`', '1', '2', '3', '4', 'shift', 'alt', 'control', 'meta', 'mouse0', 'mouse1', 'mouse2']);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let binds = {};
  function load() {
    binds = {};
    for (const a of ACTIONS) binds[a.id] = a.def;
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && typeof v === 'object') for (const a of ACTIONS) if (typeof v[a.id] === 'string' && v[a.id].length <= 12 && !RESERVED.has(v[a.id])) binds[a.id] = v[a.id];
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
  // which action this key is bound to, or null
  function actionOf(k) { for (const a of ACTIONS) if (binds[a.id] === k) return a.id; return null; }
  const keyFor = id => binds[id];

  // ---------------------------------------------------------------- the HUD layout
  // Each piece can be nudged anywhere on screen; the offsets are applied as a CSS translate (the docking and the
  // game's own positioning stay as they are underneath).
  const PIECES = [
    { sel: '#combat-hud', name: 'Hotbar' }, { sel: '#pf-wrap', name: 'Party frames' }, { sel: '#boss-bar', name: 'Boss bar' },
    { sel: '#raid-left', name: 'Threat & progress' }, { sel: '#live-meter', name: 'Damage meter' }, { sel: '#waymarks', name: 'Markers' },
    { sel: '#lb-gauge', name: 'Limit Break' }, { sel: '#minimap', name: 'Minimap' }, { sel: '#target-frame', name: 'Target' }, { sel: '#focus-frame', name: 'Focus' }, { sel: '#boss-cast', name: 'Boss cast' },
  ];
  let layout = {};
  try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); if (v && typeof v === 'object') layout = v; } catch (e) { /* none */ }
  const saveLayout = () => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (e) { /* not remembered */ } };
  let arranging = false, ghosts = [];
  // called every frame: keeps each piece where it was put (pieces can be rebuilt by the game)
  function applyLayout() {
    for (const p of PIECES) {
      const el = document.querySelector(p.sel);
      if (!el) continue;
      const o = layout[p.sel], v = o ? `${Math.round(o[0])}px ${Math.round(o[1])}px` : '';
      if (el.style.translate !== v) el.style.translate = v;
    }
    if (arranging) for (const g of ghosts) {
      const el = document.querySelector(g.dataset.sel), r = el && el.getBoundingClientRect();
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
      g.className = 'hud-ghost hidden'; g.dataset.sel = p.sel; g.innerHTML = `<span>${esc(p.name)}</span>`;
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
  let panel = null, capturing = null, namer = () => null, onChange = () => {};
  function render() {
    panel.querySelector('.kb-list').innerHTML = ACTIONS.map(a => {
      const n = a.name || namer(Number(a.id.slice(1))) || `Skill ${Number(a.id.slice(1)) + 1}`;
      return `<div class="kb-row"><span>${esc(n)}</span><button type="button" class="kb-key${capturing === a.id ? ' wait' : ''}" data-a="${a.id}">${capturing === a.id ? 'Press a key…' : esc(label(binds[a.id]))}</button></div>`;
    }).join('');
  }
  function bind(id, k) {
    if (RESERVED.has(k)) return false;
    const other = actionOf(k);
    if (other && other !== id) binds[other] = binds[id];   // the two swap
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
  }
  function openPanel(opts = {}) {
    namer = opts.namer || namer; onChange = opts.onChange || onChange;
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'options'; panel.className = 'hidden';
      panel.innerHTML = `<header><h3>Options</h3><button type="button" class="close" aria-label="Close">×</button></header>
        <h4>Keys</h4><p class="kb-note">Click a key, then press the new one (a mouse's side buttons work too). Taking a key another action had swaps them.</p>
        <div class="kb-list"></div>
        <div class="kb-foot"><button type="button" class="btn2 kb-reset">Default keys</button></div>
        <h4>Interface</h4>
        <div class="kb-foot"><button type="button" class="btn2 kb-arrange">Arrange the HUD</button><span class="kb-note">Best done in a raid, where every piece shows.</span></div>`;
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => {
        e.stopPropagation();
        if (capturing && e.button >= 3) capture(e);
      });
      panel.addEventListener('click', e => {
        const t = e.target;
        if (t.classList.contains('close')) { closePanel(); return; }
        if (t.classList.contains('kb-reset')) { for (const a of ACTIONS) binds[a.id] = a.def; save(); labels(); onChange(); render(); return; }
        if (t.classList.contains('kb-arrange')) { closePanel(); arrange(true); return; }
        if (t.dataset.a) { capturing = capturing === t.dataset.a ? null : t.dataset.a; render(); }
      });
      addEventListener('keydown', capture, true);
    }
    capturing = null;
    render();
    panel.classList.remove('hidden');
  }
  function closePanel() { if (panel) panel.classList.add('hidden'); capturing = null; }
  const panelOpen = () => !!panel && !panel.classList.contains('hidden');

  load();
  return { ACTIONS, keyOf, actionOf, keyFor, label, openPanel, closePanel, panelOpen, applyLayout, arrange, isArranging: () => arranging, isCapturing: () => !!capturing };
})();
