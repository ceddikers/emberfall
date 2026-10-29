// The Founding: the founders' voice, the Trials chip, the founders' book and the results card's extras, on every tab.
// Loaded after founding/client.js (it adds a layer) and story.js. main.js owns the gate panel (the Trials picker) and the end-of-run
// record; this file is the part that lives inside a run, plus the book itself (readable from the gate panel and the results card).
//
//   FoundingBook.progress()          the account's Founding record (Save 'founding'): wins, runs, best, pages, trials, quests, on
//   FoundingBook.openBook()          the founders' book panel (works in town and in a run); closeBook(), bookOpen()
//   FoundingBook.runTrials()         the Trials on in the run being played (from the host's props), [] outside a run
//   FoundingBook.record(res)         main.js calls this once when a run's fdend arrives -> { first, cleared, marks, newPages }
//   FoundingBook.last                what record() returned for the run just ended (the results card reads it)
// All files LF.

const FoundingBook = (() => {
  const ST = FOUNDING_STORY;
  const KEY = 'founding';
  let last = null, runTr = [], K = null;

  // ---------------------------------------------------------------- the record
  function progress() {
    const raw = typeof Save !== 'undefined' ? Save.get(KEY) : null, f = ST.fixProgress(raw);
    if (raw !== f && typeof Save !== 'undefined') Save.set(KEY, f);
    return f;
  }
  const commit = () => { try { if (typeof Save !== 'undefined') Save.commit(); } catch (e) { /* storage may be unavailable */ } };
  function takePages(list) { const f = progress(), n = ST.addPages(f, list); if (n) commit(); return n; }
  function record(res) {
    const f = progress(), D = FOUNDING_DATA;
    const newPages = ST.addPages(f, K && K.S && K.S.sheet && K.S.sheet.pg);
    const players = res && res.stats ? Object.keys(res.stats).length : 1;
    const out = ST.record(f, res, runTr, D.QUEST_ORDER.slice(), players);
    out.newPages = newPages; out.won = !!res.won; out.trials = runTr.slice();
    last = out; commit();
    return out;
  }

  // ---------------------------------------------------------------- the book
  const ROMAN = n => { const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let panel = null;
  function bookHtml() {
    const f = progress(), have = new Set(f.pages);
    const nums = [...new Set([...ST.PAGES.map(p => p.n), ...f.pages])].sort((a, b) => a - b);
    const pages = nums.map(n => {
      if (!have.has(n)) return `<article class="fb-page blank"><h4><i>${ROMAN(n)}</i><span>&nbsp;</span></h4><p>Not found yet.</p></article>`;
      const p = ST.pageOf(n), by = ST.FOUNDERS[p.by] || ST.FOUNDERS.steward;
      return `<article class="fb-page"><h4><i>${ROMAN(n)}</i><span>${esc(p.title)}</span></h4><p>${esc(p.text)}</p>${p.words ? `<blockquote>${p.words.map(w => `<div>${esc(w)}</div>`).join('')}</blockquote>` : ''}<footer style="color:${by.col}">${esc(by.name)}</footer></article>`;
    }).join('');
    return `<header><h3>The Founders' Book</h3><span class="fb-count">${f.pages.length} of ${nums.length}</span><button type="button" class="close" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      <p class="fb-note">Pages the founders left in the valley. Each run finds what it finds, and what you have found stays with you.</p><div class="fb-pages">${pages}</div>`;
  }
  function openBook() {
    css();
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'fd-book'; panel.className = 'hidden';
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.addEventListener('click', e => { const t = e.target.closest('button'); if (t && t.classList.contains('close')) closeBook(); });
      panel.addEventListener('contextmenu', e => e.preventDefault());
      panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
      window.addEventListener('keydown', e => { if (e.key === 'Escape' && bookOpen()) { closeBook(); e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    }
    if (!panel.parentNode) document.body.appendChild(panel);
    panel.innerHTML = bookHtml();
    panel.classList.remove('hidden');
    try { if (typeof Sound !== 'undefined') Sound.play('fd-page', { bus: 'ui', key: 'fd-page', minGap: 0.2 }); } catch (e) { /* sound is optional */ }
  }
  function closeBook() { if (panel) panel.classList.add('hidden'); }
  const bookOpen = () => !!panel && !panel.classList.contains('hidden');

  // ---------------------------------------------------------------- styles (injected: this file draws into the run's HUD and into town)
  let styled = false;
  function css() {
    if (styled || typeof document === 'undefined') return; styled = true;
    const s = document.createElement('style'); s.id = 'fd-trials-css';
    s.textContent = `
#fd-voice { position: absolute; left: 50%; bottom: 196px; transform: translate(-50%, 6px); max-width: min(560px, 86vw); padding: 7px 16px 8px; text-align: center; background: #15120fe6; border: 1px solid #5a4630; border-radius: 3px; box-shadow: 0 6px 18px #000a; opacity: 0; transition: opacity .35s, transform .35s; pointer-events: none; z-index: 5; }
#fd-voice.on { opacity: 1; transform: translate(-50%, 0); }
#fd-voice.up { bottom: auto; top: 64px; }
#fd-voice b { display: block; font: 700 10px Cinzel, Georgia, serif; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 2px; }
#fd-voice span { display: block; font: italic 13.5px/1.4 Georgia, serif; color: #eadfc4; }
#fd-trialchip { position: absolute; left: 50%; top: 82px; transform: translateX(-50%); display: flex; gap: 6px; align-items: center; padding: 2px 10px; background: #15120fcc; border: 1px solid #5a4630; border-radius: 10px; font: 10.5px system-ui; letter-spacing: .04em; color: #d9b56a; z-index: 3; }
#fd-trialchip em { font-style: normal; color: #9a8a6a; text-transform: uppercase; letter-spacing: .16em; font-size: 9px; }
.fd-ft { margin: 0 0 12px; padding: 9px 12px; border: 1px solid #3a2a1c; border-radius: 3px; background: #0d0b0a99; text-align: center; font-size: 12.5px; color: #cfc4aa; }
.fd-ft b { color: #e6c98a; font-weight: 600; } .fd-ft.good b { color: #9ed7a6; } .fd-ft .dim { display: block; margin-top: 3px; color: #8d8068; font-size: 11.5px; font-style: italic; }
.fd-ft button { margin-top: 7px; background: #1b1511; color: #e6c98a; border: 1px solid #6a5232; border-radius: 3px; padding: 5px 14px; font: 12px system-ui; cursor: pointer; } .fd-ft button:hover { background: #2a2018; border-color: #a8864a; }
#fd-book { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 60; width: min(640px, 94vw); max-height: 86vh; overflow: auto; padding: 14px 18px 18px; background: #0d0b0af6; border: 1px solid #4a3822; border-radius: 3px; box-shadow: 0 0 0 1px #000, 0 18px 44px #000d; color: #d8cdb8; font-family: system-ui, sans-serif; }
#fd-book.hidden { display: none; }
#fd-book header { display: flex; align-items: center; gap: 12px; }
#fd-book h3 { margin: 0; flex: 1; font: 13px Cinzel, Georgia, serif; letter-spacing: .18em; text-transform: uppercase; color: #e6c98a; }
#fd-book .fb-count { font-size: 11px; color: #8d8068; letter-spacing: .06em; }
#fd-book .close { background: none; border: 0; color: #9a8a6a; font-size: 20px; cursor: pointer; line-height: 1; }
#fd-book .fb-note { margin: 6px 0 12px; font-size: 11.5px; line-height: 1.5; color: #8d8068; }
#fd-book .fb-pages { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: start; }
@media (max-width: 560px) { #fd-book .fb-pages { grid-template-columns: 1fr; } }
#fd-book .fb-page { padding: 10px 12px 9px; background: linear-gradient(#e9dcb9, #d9c9a0); color: #2c2214; border: 1px solid #8b7448; border-radius: 2px; box-shadow: inset 0 0 18px #8b744855; }
#fd-book .fb-page h4 { margin: 0 0 5px; display: flex; gap: 8px; align-items: baseline; font: 700 11px Cinzel, Georgia, serif; letter-spacing: .1em; color: #5a3f1c; }
#fd-book .fb-page h4 i { font-style: normal; color: #8b6a34; min-width: 22px; } #fd-book .fb-page h4 span { text-transform: uppercase; }
#fd-book .fb-page p { margin: 0; font: italic 12.5px/1.5 Georgia, serif; }
#fd-book .fb-page blockquote { margin: 7px 0 2px; padding: 5px 8px; border-left: 2px solid #8b6a34; font: 700 11px Cinzel, Georgia, serif; letter-spacing: .12em; color: #3f2c10; }
#fd-book .fb-page footer { margin-top: 6px; text-align: right; font: 700 9.5px Cinzel, Georgia, serif; letter-spacing: .16em; text-transform: uppercase; filter: brightness(.45) saturate(1.4); }
#fd-book .fb-page.blank { background: #15120f; border: 1px dashed #3a2c1c; box-shadow: none; color: #6a5c46; } #fd-book .fb-page.blank h4 { color: #5a4a34; } #fd-book .fb-page.blank h4 i { color: #5a4a34; }`;
    document.head.appendChild(s);
  }

  return { progress, takePages, record, openBook, closeBook, bookOpen, bookHtml, runTrials: () => runTr, setRunTrials: t => { runTr = Array.isArray(t) ? t : []; }, get last() { return last; }, clearLast: () => { last = null; }, _bind: k => { K = k; css(); } };
})();

if (typeof Founding !== 'undefined' && Founding.addLayer) (() => {
  let K = null;
  // the layer's small state, one per run (it lives on the run's state object, so a new run starts clean)
  const st = () => (K && K.S ? (K.S.__trials || (K.S.__trials = { queue: [], cur: null, t: 0, heardPart: -1, heardStart: 0, chipSig: '', pgN: -1 })) : null);
  function speak(l) { const T = st(); if (!T || !l) return; if (T.queue.length > 3) T.queue.shift(); T.queue.push(l); }

  function tick(dt) {
    const S = K && K.S, T = st(), root = document.getElementById('fd-root'); if (!S || !T || !root) return;
    // the Trials on in this run (the host's props), kept for the record
    const tr = Array.isArray(S.props && S.props.tr) ? S.props.tr : [];
    FoundingBook.setRunTrials(tr);
    const sig = tr.join(',');
    if (sig !== T.chipSig || !!root.querySelector('#fd-trialchip') !== !!sig) {
      T.chipSig = sig;
      let chip = root.querySelector('#fd-trialchip');
      if (!sig) { if (chip) chip.remove(); }
      else {
        if (!chip) { chip = document.createElement('div'); chip.id = 'fd-trialchip'; root.appendChild(chip); }
        chip.innerHTML = `<em>Trials</em>${tr.map(id => FOUNDING_STORY.TRIAL[id] ? FOUNDING_STORY.TRIAL[id].name : '').filter(Boolean).join(' &middot; ')}`;
        chip.setAttribute('data-tip', 'Founder\'s Trials, chosen at the post. A run won with them on clears them.');
      }
    }
    // pages read in this run keep coming from the sheet (a rejoin or a missed event cannot lose one)
    const pg = S.sheet && S.sheet.pg;
    if (pg && pg.length !== T.pgN) { T.pgN = pg.length; FoundingBook.takePages(pg); }
    // the results card is up: the voice and the chip step aside
    const E = document.getElementById('fd-end'), card = !!E && E.style.display !== 'none';
    const chipEl = root.querySelector('#fd-trialchip'); if (chipEl) chipEl.style.display = card ? 'none' : '';
    if (card) { T.queue.length = 0; T.cur = null; const v0 = document.getElementById('fd-voice'); if (v0) v0.classList.remove('on'); }
    // the voice
    { const v1 = document.getElementById('fd-voice'); if (v1) { const UI = typeof FoundingUI !== 'undefined' ? FoundingUI : null, bx = document.getElementById('fd-buildx'); v1.classList.toggle('up', !!((UI && UI.isOpen && (UI.isOpen('tent') || UI.isOpen('forge'))) || (bx && bx.offsetParent))); } }   // a shop or the board is open: the voice speaks from the top instead
    if (T.cur) { T.t -= dt; if (T.t <= 0) { const v = document.getElementById('fd-voice'); if (v) v.classList.remove('on'); if (T.t < -0.5) T.cur = null; } }
    if (!T.cur && T.queue.length && S.phase === 'live') {
      const l = T.queue.shift(); T.cur = l; T.t = Math.min(6.5, 3 + l.t.length * 0.045);
      let v = document.getElementById('fd-voice');
      if (!v) { v = document.createElement('div'); v.id = 'fd-voice'; root.appendChild(v); }
      v.innerHTML = `<b style="color:${l.col}">${l.name}</b><span>${l.t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
      v.classList.remove('on'); void v.offsetWidth; v.classList.add('on');
    }
    // the results card: what the run counted for, and the book
    if (card) {
      const box = E.querySelector('.fd-end-box'), ok = box && box.querySelector('#fd-endok'), L = FoundingBook.last;
      if (box && ok && !box.querySelector('.fd-ft') && (L || tr.length)) {
        const won = box.classList.contains('won');
        const names = (L ? L.trials : tr).map(id => FOUNDING_STORY.TRIAL[id] && FOUNDING_STORY.TRIAL[id].name).filter(Boolean);
        let h = '';
        if (names.length) h += won ? `<b>Trials cleared:</b> ${names.join(', ')}<span class="dim">A title is yours for each, in the Logbook.</span>` : `<b>Trials:</b> ${names.join(', ')}<span class="dim">A trial is cleared by winning with it on.</span>`;
        if (L && L.first) h += `<span class="dim">Something in the town remembers this.</span>`;
        const f = FoundingBook.progress();
        const d = document.createElement('div'); d.className = 'fd-ft' + (won && names.length ? ' good' : '');
        d.innerHTML = `${h}<button type="button" data-book="1">The founders' book (${f.pages.length})</button>`;
        d.querySelector('[data-book]').addEventListener('click', () => FoundingBook.openBook());
        box.insertBefore(d, ok);
      }
    }
  }

  Founding.addLayer({
    init(kit) { K = kit; FoundingBook._bind(kit); },
    // the founders speak at the moments the run already marks: a quest offered, done or missed, a new part, a main boss, the end beat
    event(ev) {
      const T = st(); if (!T) return false;
      const tag = ev[0];
      if (tag === 'start' && !T.heardStart) { T.heardStart = 1; FoundingBook.clearLast(); speak(FOUNDING_STORY.line('start')); }
      else if (tag === 'q') speak(FOUNDING_STORY.line('q', ev[1], ev[2]));
      else if (tag === 'w') { const part = ev[4] | 0; if (part !== T.heardPart) { T.heardPart = part; speak(FOUNDING_STORY.line('part', part)); } }
      else if (tag === 'boss') { const id = FOUNDING_DATA.ENEMY_IDS[ev[2]]; if (id) speak(FOUNDING_STORY.line('boss', id)); }
      else if (tag === 'end') speak(FOUNDING_STORY.line('end', ev[1]));
      else if (tag === 'pg' && ev[1] === K.S.myId) FoundingBook.takePages([ev[2]]);
      return false;   // (the core still shows its own banners, sounds and effects)
    },
    // (the core calls `screen` every frame and never `update`, so the layer's own clock is the run's: S.T)
    screen() {
      const S = K && K.S; if (!S) return;
      const dt = Math.min(0.25, Math.max(0, S.T - (tick.last === undefined || S.T < tick.last ? S.T : tick.last))); tick.last = S.T;
      try { tick(dt); } catch (e) { if (!tick.err) { tick.err = 1; console.error('Founding trials layer', e); } }
    },
  });
})();
if (typeof module !== 'undefined') module.exports = { FoundingBook };
