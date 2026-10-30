// The Practice Hall: any fight, from any phase, with a few aids. No loot, no clears, nothing on the progression record or in the Bests.
//
// Anyone in the party can ask for a run. The host starts their own at once; a guest's click goes to the host as a request ('prreq'), which
// the host's game shows ("Mira asks to practise ...") for a few seconds with a Cancel button before starting it: the host keeps the say.
//
// The aids (remembered on this machine), sent with the raid's start message (field `pr`, main.js startRaid) so every client shows them:
//   noEnrage  the boss never enrages (fight.js: noEnrage)           cantDie  nobody dies: a fall is counted, the hero stays on 1 HP (fight.js: cantDie)
//   slow      1 | 0.75 | 0.5: the host's fight ticks at that speed, and each client scales its own clock the same (main.js frame())
//   loop      the run starts again from its phase when it moves past it, and after a wipe or a clear (main.js startRaid's host loop)
//
// The Ultimate is offered here too, from the acts a real pull has reached (SvPortal.reach).

const PracticeHall = (() => {
  const PHASES = {
    grubnak: ['Appetiser', 'Mains', 'Flare-Up', 'Second Sitting', 'Dessert'],
    skitterra: ['The Web', 'The Dark Between', 'The Brood', 'The Collapse'],
    volkar: ['The Front', 'The Eye', 'Back of the Storm', 'Heavens Fall'],
    hollowking: ['The Summons', 'Testimony', 'Court of Bones', 'The Verdict', 'Judgement', 'The Long Night'],
    wyrm: ['Ground', 'First Flight', 'The Roost', 'Final Flight', 'Last Ember'],
    titan: ['The Thaw', 'The Freeze', 'The Crack', 'The Avalanche', 'Last Winter'],
    hydra: ['Three Heads', 'Six Heads', 'The Submerge', 'Nine Heads', 'Last Heads'],
    archmage: ['Fire', 'Frost', 'The Binding', 'Void', 'Convergence'],
    corvane: ['The Pass', 'The Shrine', 'The Whetted Edge', 'The Last Vigil'],
    brannoc: ['First Blood', 'Crowd-Pleaser', 'The Tide Rises', 'The Tidewrought', 'Last Round'],
    morrowoak: ['The Grove', 'Hollowing', 'The Grove Remade', 'Last Bloom'],
    caelum: ['Descent', 'Starfall', 'Ascendant', 'The Sky Comes Down'],
  };
  const ULT = 'sovereign', NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'], SLOWS = [1, 0.75, 0.5], KEY = 'emberfall.practice.v1', ASK_SECS = 5;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const OPTS = [
    ['noEnrage', 'Enrage off', 'The boss never enrages. Everything else in the fight stays as it is.'],
    ['cantDie', "Can't die", 'Nobody falls: a hero who would have died stays on 1 HP. Each fall is counted on the results card.'],
    ['loop', 'Loop this phase', 'When the fight moves past the phase you started from, or ends, it starts again from that phase after a short beat.'],
  ];

  let deps = null, panel = null, pick = { boss: 'grubnak', mode: 'normal' }, ask = null, tagEl = null;
  let px = { noEnrage: false, cantDie: false, slow: 1, loop: false };
  // the saved aids, cleaned (a bad or old save gives the defaults)
  const clean = o => ({ noEnrage: !!(o && o.noEnrage), cantDie: !!(o && o.cantDie), loop: !!(o && o.loop), slow: SLOWS.includes(o && Number(o.slow)) ? Number(o.slow) : 1 });
  try { px = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { px = clean(null); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(px)); } catch (e) { /* private window: the aids just don't stick */ } };

  const bossIds = () => {
    const ids = Object.keys(PHASES).filter(id => deps.bossOpen(id));
    if (typeof SvPortal !== 'undefined' && SvPortal.reach() > 0) ids.push(ULT);
    return ids;
  };
  const phasesOf = id => (id === ULT ? SvPortal.ACTS : PHASES[id]) || [];
  const reachOf = id => (id === ULT ? SvPortal.reach() : 99);
  const label = (boss, mode, from) => `${deps.name(boss)}${boss === ULT ? '' : mode === 'hard' ? ', Hard' : ', Normal'}, from ${phasesOf(boss)[from - 1] || 'the start'}`;

  // a request, checked: the host starts only what it could have started itself
  function sane(m, hostSide) {
    const boss = String(m && m.boss), mode = m && m.mode === 'hard' ? 'hard' : 'normal', from = Math.floor(Number(m && m.from));
    if (!(boss in PHASES) && boss !== ULT) return null;
    if (!(from >= 1 && from <= phasesOf(boss).length)) return null;
    if (hostSide && boss !== ULT && !deps.bossOpen(boss)) return null;
    return { boss, mode: boss === ULT ? 'normal' : mode, from, px: clean(m && m.px) };
  }

  // the Ultimate's acts: a request may ask only for an act the host has reached itself (the panel offers it nothing further) and the guest says it
  // has reached too ('reach' in the request: their SvPortal.reach(); it is their word, but it keeps an honest client from the later acts). '' when fine
  function actWhy(o, guestReach) {
    if (o.boss !== ULT) return '';
    if (o.from > Math.max(0, reachOf(ULT))) return 'The host has not reached that act yet.';
    const g = Math.min(phasesOf(ULT).length, Math.floor(Number(guestReach)));
    if (!(g >= o.from)) return g >= 1 ? `You have only reached act ${NUMERALS[g - 1]} of that fight.` : 'You have not reached any act of that fight yet.';
    return '';
  }

  // ------------------------------------------------------------ the panel
  function open() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'practice'; panel.className = 'hidden';
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('close')) { close(); return; }
        if (t.dataset.boss) pick.boss = t.dataset.boss;
        if (t.dataset.mode) pick.mode = t.dataset.mode;
        if (t.dataset.opt) px[t.dataset.opt] = !px[t.dataset.opt];
        if (t.dataset.slow) px.slow = Number(t.dataset.slow);
        if (t.dataset.opt || t.dataset.slow) save();
        if (t.dataset.ph) {
          if (t.getAttribute('aria-disabled') === 'true') return;
          if (!deps.hasHero()) { deps.toast('Pick a hero first.'); return; }
          const o = { boss: pick.boss, mode: pick.mode, from: Number(t.dataset.ph), px: clean(px) };
          close();
          if (deps.isHost()) deps.start(o);
          else { deps.request(o.boss === ULT ? Object.assign({ reach: reachOf(ULT) }, o) : o); deps.toast('Asked the host to start it.'); }
          return;
        }
        render();
      });
    }
    render();
    panel.classList.remove('hidden');
  }
  function render() {
    const ids = bossIds();
    if (!ids.includes(pick.boss)) pick.boss = ids[0];
    const ult = pick.boss === ULT, hard = !ult && deps.hardOpen(pick.boss);
    if (!hard) pick.mode = 'normal';
    const reach = reachOf(pick.boss);
    const phases = phasesOf(pick.boss).map((n, i) => i + 1 <= reach
      ? `<button type="button" class="px-ph" data-ph="${i + 1}"><i>${NUMERALS[i]}</i><b>${esc(n)}</b></button>`
      : `<div class="px-ph off"><i>${NUMERALS[i]}</i><b></b></div>`).join('');   // (an act of the Ultimate not yet reached shows only its numeral)
    panel.innerHTML = `<header><h3>Practice Hall</h3><button type="button" class="close" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      <p class="px-note">Any fight, from any phase. No loot, no clears; the progression record and your bests don't see it.${deps.isHost() ? '' : ' Anyone can ask; the host starts it.'}</p>
      <h4>Fight</h4><div class="px-row">${ids.map(id => `<button type="button" class="btn2${pick.boss === id ? ' on' : ''}" data-boss="${id}">${esc(deps.name(id))}</button>`).join('')}</div>
      ${ult ? '' : `<h4>Difficulty</h4><div class="px-row">${['normal', 'hard'].map(m => `<button type="button" class="btn2${pick.mode === m ? ' on' : ''}"${m === 'hard' && !hard ? ' disabled data-tip="Hard is still locked"' : ''} data-mode="${m}">${m === 'hard' ? 'Hard' : 'Normal'}</button>`).join('')}</div>`}
      <h4>Aids</h4><div class="px-row px-opts">${OPTS.map(([k, n, tip]) => `<button type="button" class="btn2${px[k] ? ' on' : ''}" data-opt="${k}" aria-pressed="${px[k]}" data-tip="${esc(tip)}">${n}</button>`).join('')}
        <span class="px-speed" data-tip="Slows the whole fight, for everyone: the boss, the telegraphs, and your own hands.">Speed${SLOWS.map(v => `<button type="button" class="btn2${px.slow === v ? ' on' : ''}" data-slow="${v}" aria-pressed="${px.slow === v}">${Math.round(v * 100)}%</button>`).join('')}</span></div>
      <h4>Start from</h4><div class="px-phases">${phases}</div>`;
  }
  function close() { if (panel) panel.classList.add('hidden'); }
  const isOpen = () => !!panel && !panel.classList.contains('hidden');

  // ------------------------------------------------------------ a guest's request, on the host
  function onRequest(pid, msg) {
    const reply = (why) => deps.reply(pid, { t: 'prno', why });
    const o = sane(msg, true);
    if (!o) { reply('That fight is not open on the host\'s road.'); return; }
    const why = actWhy(o, msg && msg.reach);
    if (why) { reply(why); return; }
    if (ask) { reply('The host already has a request waiting.'); return; }
    if (deps.busy()) { reply('The host is in a fight.'); return; }
    if (!deps.hasHero()) { reply('The host has not picked a hero.'); return; }
    const el = document.createElement('div');
    el.id = 'px-ask';
    document.body.appendChild(el);
    ask = { pid, o, el, left: ASK_SECS, timer: 0 };
    const draw = () => {
      el.innerHTML = `<p><b>${esc(deps.nameOf(pid))}</b> asks to practise ${esc(label(o.boss, o.mode, o.from))}.</p><div><span>Starting in ${Math.max(1, Math.ceil(ask.left))}</span><button type="button" class="btn2">Cancel</button></div>`;
    };
    el.addEventListener('mousedown', e => e.stopPropagation());
    el.addEventListener('click', e => { if (e.target.closest('button')) { reply('The host called it off.'); endAsk(); } });
    draw();
    if (typeof Sound !== 'undefined') Sound.play('ui-feat', { bus: 'ui', vol: 0.5 });
    ask.timer = setInterval(() => {
      ask.left -= 0.25;
      if (ask.left <= 0) { const a = ask.o; endAsk(); if (deps.busy()) reply('The host is in a fight.'); else deps.start(a); }
      else draw();
    }, 250);
  }
  function endAsk() { if (!ask) return; clearInterval(ask.timer); ask.el.remove(); ask = null; }

  // ------------------------------------------------------------ the tag under the top of the screen while a practice run is on
  // (restart: the Loop aid's run has ended and starts again in a moment; the results card is skipped, main.js frame(), and the strip says so)
  function tag(p, restart) {
    const on = p && (p.noEnrage || p.cantDie || p.loop || (p.slow && p.slow < 1));
    if (!on) { if (tagEl) tagEl.classList.add('hidden'); return; }
    if (!tagEl) { tagEl = document.createElement('div'); tagEl.id = 'px-tag'; document.body.appendChild(tagEl); }
    const bits = [p.noEnrage && 'No enrage', p.cantDie && "Can't die", p.slow < 1 && `${Math.round(p.slow * 100)}% speed`, p.loop && 'Looping'].filter(Boolean);
    tagEl.innerHTML = `<b>Practice</b>${bits.map(b => `<span>${b}</span>`).join('')}${restart ? '<span class="px-restart">Restarting…</span>' : ''}`;
    tagEl.classList.remove('hidden');
  }

  function init(d) { deps = d; }
  return { init, open, close, isOpen, onRequest, endAsk, tag, clean, sane, actWhy, PHASES };
})();
