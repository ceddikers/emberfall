// The Tutorial (opt-in, from the Raid Board): every lesson worth knowing before a pull, and a briefing for each boss
// you can fight (its phases, and every move with what it does and what to do). Content: tutorial-data.js.

const Tutorial = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const T = typeof TUTORIAL !== 'undefined' ? TUTORIAL : { lessons: [], bosses: {} };
  let panel = null, at = { kind: 'lesson', id: (T.lessons[0] || {}).id }, opts = { bosses: () => [] };

  // a key written in the data is the default; the page shows whatever the player has bound to that action now
  function boundKey(k) {
    if (typeof Keybinds === 'undefined') return k;
    const a = Keybinds.ACTIONS.find(x => String(x.def).toLowerCase() === k.toLowerCase());
    return a ? Keybinds.label(Keybinds.keyFor(a.id)) : k;
  }
  function navHtml() {
    const bosses = opts.bosses().filter(b => T.bosses[b.id]);
    return `<h6>Lessons</h6>${T.lessons.map((l, i) => `<button type="button" class="tu-nav${at.kind === 'lesson' && at.id === l.id ? ' on' : ''}" data-l="${l.id}"><i>${i + 1}</i>${esc(l.title)}</button>`).join('')}
      ${bosses.length ? `<h6>Bosses</h6>${bosses.map(b => `<button type="button" class="tu-nav${at.kind === 'boss' && at.id === b.id ? ' on' : ''}" data-b="${b.id}">${esc(b.name)}</button>`).join('')}` : ''}`;
  }
  function lessonHtml(l) {
    const i = T.lessons.indexOf(l), nx = T.lessons[i + 1];
    return `<h3>${esc(l.title)}</h3>${l.pages.map(p => `<section><h4>${esc(p.h)}</h4>${p.keys && p.keys.length ? `<div class="tu-keys">${p.keys.map(k => `<kbd>${esc(boundKey(k))}</kbd>`).join('')}</div>` : ''}${p.body.map(b => `<p>${esc(b.replace(/(^|\. )([A-Z]): /g, (m, pre, k) => pre + boundKey(k) + ': '))}</p>`).join('')}</section>`).join('')}
      ${nx ? `<button type="button" class="btn2 tu-next" data-l="${nx.id}">Next: ${esc(nx.title)}</button>` : ''}`;
  }
  function bossHtml(id) {
    const d = T.bosses[id], b = opts.bosses().find(x => x.id === id);
    if (!d || !b) return '';
    const icon = n => (typeof BossIcons !== 'undefined' ? `<i class="tu-ic" style="background-image:${BossIcons.css(id, n)}"></i>` : '');
    const moves = Object.entries(d.moves);
    return `<h3>${esc(b.name)}</h3><p class="tu-intro">${esc(d.intro)}</p>
      <h4>How it goes</h4><ol class="tu-phases">${d.phases.map(p => `<li><b>${esc(p.name)}</b><span>${esc(p.body)}</span></li>`).join('')}</ol>
      <h4>Every move</h4><div class="tu-moves">${moves.map(([n, m]) => `<div class="tu-move">${icon(n)}<div><h5>${esc(n)}${m.hard ? '<em>Hard</em>' : ''}</h5><p>${esc(m.what)}</p><p class="tu-ans">${esc(m.answer)}</p>${m.hardNote ? `<p class="tu-hard"><u>Hard</u> ${esc(m.hardNote)}</p>` : ''}</div></div>`).join('')}</div>`;
  }
  function render() {
    const page = at.kind === 'boss' ? bossHtml(at.id) : lessonHtml(T.lessons.find(l => l.id === at.id) || T.lessons[0]);
    panel.querySelector('.tu-side').innerHTML = navHtml();
    const main = panel.querySelector('.tu-main');
    main.innerHTML = page;
    main.scrollTop = 0;
  }
  function open(o = {}) {
    opts = Object.assign(opts, o);
    if (o.boss && T.bosses[o.boss]) at = { kind: 'boss', id: o.boss };
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tutorial'; panel.className = 'hidden';
      panel.innerHTML = `<header><h3>Tutorial</h3><small>Everything worth knowing before a pull</small><button type="button" class="close" aria-label="Close">×</button></header><div class="tu-body"><nav class="tu-side"></nav><article class="tu-main"></article></div>`;
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.addEventListener('click', e => {
        if (e.target.closest('.close')) { close(); return; }
        const t = e.target.closest('[data-l],[data-b]');
        if (!t) return;
        at = t.dataset.b ? { kind: 'boss', id: t.dataset.b } : { kind: 'lesson', id: t.dataset.l };
        render();
      });
    }
    render();
    panel.classList.remove('hidden');
  }
  function close() { if (panel) panel.classList.add('hidden'); }
  const isOpen = () => !!panel && !panel.classList.contains('hidden');
  return { open, close, isOpen };
})();
