// The fourth portal: the town's way down to the Cinder Sovereign (the Ultimate). It is the shrouded, chained portal on the terrace until every
// boss of the three sets has fallen on HARD on this account (Save.hardBeaten for all twelve BOSSES); then, once, in town, the camera goes to it,
// the shroud and chains are gone, its stones glow faintly from below and embers drift up out of it (town.js drawSovereignPortal). No text says
// anything. After that, stepping into it opens a small card (the Practice Hall's style) to start the raid: "From the start" is a real pull; an act
// is a Reach start (no loot, never a clear: main.js startRaid's practiceFrom, which marks the run as practice so Save.recordClear skips it).
// An act is offered once a real pull has reached it: main.js hands every roomev `svact` of a non-practice run to SvPortal.reached(act), and
// Save.recordSvReach keeps the furthest per account. Party, bot fill and the ready check are the raid's own (startRaid).
//
// TEST FLAG (remove after testing): localStorage 'emberfall.svUnlock' = '1' opens the portal at once (no twelve Hard clears, and its town moment
// does not play) and enables all four acts on the Reach card. Nothing else reads this key. Remove it with localStorage.removeItem('emberfall.svUnlock').

const SvPortal = (() => {
  const FLAG = 'emberfall.svUnlock';
  const SEEN = 'svportal';       // town state: seen[SEEN] once the reveal has played (town-life.js and barrow-gate.js keep the same book)
  const QUIET = 8;               // a boss's own town moment (or the Barrow Gate's banner) has to be over this long first
  const ACTS = ['The Kindling', 'The Forge', 'The Fall', 'Every Name'];
  const NUMERALS = ['I', 'II', 'III', 'IV'];
  const SHOW_UNREACHED_NAMES = false;   // (an act not yet reached shows only its numeral: the later acts stay a surprise)
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const flag = () => { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } };
  const portal = () => TOWN.portals[3];

  let deps = null;   // { now(), busy(), focus(pt), rebuild(), sound(), party(fill), isHost(), hasHero(), start(fill, fromAct), toast(msg) } from main
  let shown = false, quietSince = null, panel = null, fill = true;

  // every boss of sets 1-3 beaten on Hard on this account
  const earned = () => typeof BOSSES !== 'undefined' && BOSSES.length > 0 && BOSSES.every(b => Save.hardBeaten(b.id));
  const unlocked = () => flag() || earned();
  const book = () => {
    let s = Save.get('town');
    if (!s || typeof s !== 'object') { s = {}; Save.set('town', s); }
    s.seen = s.seen || {};
    return s;
  };
  // the portal is open (enterable, in its ember look): unlocked AND its reveal has been played (or the test flag)
  const isOpen = () => shown;
  const reach = () => (flag() ? 4 : Save.svReach());

  function setLook(on) {
    if (shown === on) return;
    shown = on;
    townOpenFourthPortal(on);
    if (deps && deps.rebuild) deps.rebuild();
  }

  // main.js: before the first frame (so the static town layer is built with the right look); the portal is open at once for a reveal already seen
  function init(d) {
    deps = d;
    if (flag() || (earned() && book().seen[SEEN])) { setLook(true); const P = portal(); if (P) P.openAt = null; }
  }

  // each frame in town: the reveal, once, when the unlock is earned and nothing else is going on in town
  function update(dt, now, inTown) {
    if (!deps || shown) return;
    if (!earned()) { quietSince = null; return; }
    if (!inTown || deps.busy() || (Save.trialsOpen() && !book().seen.barrowgate)) { quietSince = null; return; }   // (the Barrow Gate's own moment, if due, goes first)
    if (quietSince == null) quietSince = now;
    if (now - quietSince < QUIET) return;
    book().seen[SEEN] = 1; Save.commit();
    const P = portal();
    P.openAt = now;
    setLook(true);
    deps.focus({ x: P.x, y: P.y + 10 });
    if (deps.sound) deps.sound();
  }

  // main.js's roomev handler, for a real (non-practice) pull
  function reached(act) { if (Number.isInteger(act) && act >= 1 && act <= 4) Save.recordSvReach(act); }

  // ------------------------------------------------------------------ the card
  function ensure() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'svportal'; panel.className = 'hidden';
    document.body.appendChild(panel);
    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('click', e => {
      const t = e.target.closest('button, input');
      if (!t) return;
      if (t.classList.contains('close')) { close(); return; }
      if (t.matches('.sv-fill input')) { fill = t.checked; render(); return; }
      if (t.classList.contains('sv-go')) {
        if (t.getAttribute('aria-disabled') === 'true') return;
        if (!deps.isHost()) { deps.toast('Only the host can start the raid.'); return; }
        if (!deps.hasHero()) { deps.toast('Pick a hero first.'); return; }
        const from = Number(t.dataset.act) || 0;
        close();
        deps.start(fill, from);
      }
    });
  }
  function render() {
    const r = reach(), party = deps.party(fill);
    const roster = party.humans.map(h => { const c = CLASSES.find(x => x.id === h.cls); return c ? `<span style="--c:${ROLES[c.role].color}">${esc(h.name)}<small>${esc(c.name)}</small></span>` : ''; }).join('')
      + party.bots.map(id => { const c = CLASSES.find(x => x.id === id); return c ? `<span class="bot" style="--c:${ROLES[c.role].color}">Bot<small>${esc(c.name)}</small></span>` : ''; }).join('');
    const dim = deps.isHost() ? '' : ' aria-disabled="true"';
    panel.innerHTML = `<header><h3>${esc(portal().name || '')}</h3><button type="button" class="close" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      <div class="raid-roster">${roster}</div>
      <label class="sv-fill"><input type="checkbox"${fill ? ' checked' : ''}${deps.isHost() ? '' : ' disabled'}> Fill empty slots with bots</label>
      <button type="button" class="sv-go sv-start" data-act="0"${dim}><b>From the start</b></button>
      <div class="sv-acts">${ACTS.map((n, i) => {
        const on = i + 1 <= r;
        return on ? `<button type="button" class="sv-go sv-act" data-act="${i + 1}"${dim}><i>${NUMERALS[i]}</i><b>${esc(n)}</b></button>`
          : `<div class="sv-act off"><i>${NUMERALS[i]}</i><b>${SHOW_UNREACHED_NAMES ? esc(n) : ''}</b></div>`;
      }).join('')}</div>`;
  }
  function show() {
    if (!deps || !shown) return;
    ensure(); render();
    panel.classList.remove('hidden');
  }
  function close() { if (panel) panel.classList.add('hidden'); }
  const isShown = () => !!panel && !panel.classList.contains('hidden');

  return { init, update, show, close, isOpen, isShown, reached, reach, unlocked, FLAG };
})();
