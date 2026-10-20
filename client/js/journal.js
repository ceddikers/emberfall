// The boss journal (J): every hero keeps their own. The first pull of a boss writes their first impression; living
// through one of its moves writes how they got through it, in their own words (journal/*.js); beating it writes the
// last page. Kept per hero in the save (Save.journal).

const Journal = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const DATA = () => (typeof window !== 'undefined' && window.JOURNAL_DATA) || {};
  const MASTER = 5;   // lived through this many times: the entry gets its seal

  // ---------------------------------------------------------------- recording (main.js calls these)
  // the moves this fight's boss has cast that are still waiting to see if you live through them
  let watch = [], fresh = [];
  function fightStart() { watch = []; fresh = []; }
  // a boss cast began (name as on the cast bar); it counts once you're still standing a few seconds after it lands
  function castStart(cls, bossId, name, dur, now) {
    const d = DATA()[bossId];
    if (!cls || !d || !d.moves || !d.moves[name]) return;
    if (Save.journalSeen(cls, bossId, name)) fresh.push({ kind: 'seen', name });
    watch.push({ cls, bossId, name, at: now + dur + 3 });
  }
  // each frame: alive = you're up
  function tick(now, alive) {
    if (!watch.length) return;
    for (let i = watch.length - 1; i >= 0; i--) {
      const w = watch[i];
      if (!alive) { watch.splice(i, 1); continue; }   // (down when it landed: it doesn't count)
      if (now < w.at) continue;
      watch.splice(i, 1);
      if (Save.journalPass(w.cls, w.bossId, w.name)) fresh.push({ kind: 'learned', name: w.name });
    }
  }
  // the first pull and the first win (true when this is new for the hero)
  const met = (cls, bossId) => Save.journalMark(cls, bossId, 'met');
  const won = (cls, bossId) => Save.journalMark(cls, bossId, 'won');
  // new pages written this fight, for the results screen
  function newPages() { const n = fresh.filter(f => f.kind === 'learned').map(f => f.name); fresh = []; return n; }

  // ---------------------------------------------------------------- the book
  let panel = null, heroId = null, bossId = null, opts = { bosses: [], open: () => true, heroes: [] };
  function entryCount(cls, b) {
    const d = DATA()[b], j = Save.journal(cls), moves = (j.moves && j.moves[b]) || {};
    if (!d) return [0, 0];
    return [Object.keys(d.moves).filter(n => moves[n] && moves[n].pass > 0).length, Object.keys(d.moves).length];
  }
  function render() {
    const heroes = opts.heroes(), cls = heroId && heroes.find(h => h.id === heroId) ? heroId : (heroes[0] && heroes[0].id);
    heroId = cls;
    const bosses = opts.bosses.filter(b => opts.open(b) && DATA()[b.id]);
    if (!bosses.some(b => b.id === bossId)) bossId = bosses[0] && bosses[0].id;
    const hero = heroes.find(h => h.id === cls);
    if (!hero) { panel.querySelector('.jr-book').innerHTML = '<p class="jr-empty">Pick a hero first: every hero keeps their own journal.</p>'; return; }
    const j = Save.journal(cls), d = DATA()[bossId], b = bosses.find(x => x.id === bossId);
    const moves = (j.moves && j.moves[bossId]) || {}, met = j.met && j.met[bossId], won = j.won && j.won[bossId];
    const heroTabs = heroes.length > 1 ? `<select class="jr-hero">${heroes.map(h => `<option value="${h.id}"${h.id === cls ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select>` : `<b class="jr-hero-name">${esc(hero.name)}</b>`;
    const tabs = bosses.map(x => { const [n, t] = entryCount(cls, x.id); return `<button type="button" class="jr-boss${x.id === bossId ? ' on' : ''}" data-b="${x.id}"><b>${esc(x.name)}</b><small>${n} of ${t}</small></button>`; }).join('');
    let pages = '';
    if (!d || !met) pages = `<p class="jr-empty">${esc(hero.name)} hasn't faced ${b ? esc(b.name) : 'this one'} yet. The pages are blank.</p>`;
    else {
      const names = Object.keys(d.moves);
      const learned = names.filter(n => moves[n] && moves[n].pass > 0), seen = names.filter(n => moves[n] && !(moves[n].pass > 0));
      const icon = n => (typeof BossIcons !== 'undefined' ? `<i class="jr-ic" style="background-image:${BossIcons.css(bossId, n)}"></i>` : '');
      pages = `<p class="jr-meet">${esc(d.meet[cls] || '')}</p>` +
        learned.map(n => `<div class="jr-entry${moves[n].pass >= MASTER ? ' seal' : ''}">${icon(n)}<div><h5>${esc(n)}${d.moves[n].hard ? '<em>Hard</em>' : ''}</h5><p>${esc((d.moves[n].learned || {})[cls] || '')}</p></div></div>`).join('') +
        seen.map(n => `<div class="jr-entry blank">${icon(n)}<div><h5>${esc(n)}</h5><p>Not figured out yet.</p></div></div>`).join('') +
        (names.length > learned.length + seen.length ? `<p class="jr-more">${names.length - learned.length - seen.length} more ${names.length - learned.length - seen.length === 1 ? 'page' : 'pages'} still blank.</p>` : '') +
        (won ? `<p class="jr-win">${esc(d.win[cls] || '')}</p>` : '');
    }
    panel.querySelector('.jr-book').innerHTML = `<nav class="jr-nav">${heroTabs}${tabs}</nav><div class="jr-pages">${pages}</div>`;
    const sel = panel.querySelector('.jr-hero');
    if (sel) sel.addEventListener('change', () => { heroId = sel.value; render(); });
  }
  function open(o) {
    opts = Object.assign(opts, o || {});
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'journal'; panel.className = 'hidden';
      panel.innerHTML = `<header><h3>Journal</h3><button type="button" class="close" aria-label="Close">×</button></header><div class="jr-book"></div>`;
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.addEventListener('click', e => {
        if (e.target.closest('.close')) { close(); return; }
        const t = e.target.closest('.jr-boss');
        if (t) { bossId = t.dataset.b; render(); }
      });
    }
    if (o && o.hero) heroId = o.hero;
    if (o && o.boss) bossId = o.boss;
    render();
    panel.classList.remove('hidden');
  }
  function close() { if (panel) panel.classList.add('hidden'); }
  const isOpen = () => !!panel && !panel.classList.contains('hidden');
  let lastOpts = null;
  function toggle() { if (isOpen()) close(); else if (lastOpts) open(lastOpts()); }
  const setOpener = fn => { lastOpts = fn; };

  return { fightStart, castStart, tick, met, won, newPages, open, close, isOpen, toggle, setOpener };
})();
