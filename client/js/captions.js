// Captions: one or two subtitle lines at the bottom centre, above the hotbar and the party strip.
// Captions.show(speaker, text, seconds) is called by audio.js (Sound.say) for every voice line. The speaker's name is
// tinted in its own colour (a boss's palette, a hero's class accent, both muted); boss lines are a little larger.
// At most two lines show at once: a third pushes the oldest out. Off when Sound.get('captions') is false.

const Captions = (() => {
  const MAX = 2;
  let box = null;
  const live = [];   // { el, timer }

  function root() {
    if (box && box.isConnected) return box;
    if (typeof document === 'undefined' || !document.body) return null;
    box = document.getElementById('captions');
    if (!box) {
      box = document.createElement('div');
      box.id = 'captions';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    return box;
  }
  function enabled() {
    try {
      if (typeof Sound !== 'undefined' && Sound && typeof Sound.get === 'function') return Sound.get('captions') !== false;
    } catch (e) { /* fall through */ }
    return true;
  }
  function styleFor(speaker, opts) {
    const s = (typeof VoiceLines !== 'undefined' && VoiceLines.speakerStyle && VoiceLines.speakerStyle(speaker)) || {};
    return { color: (opts && opts.color) || s.color || '', boss: opts && opts.boss != null ? !!opts.boss : !!s.boss };
  }
  function drop(item, now) {
    const i = live.indexOf(item);
    if (i < 0) return;
    live.splice(i, 1);
    clearTimeout(item.timer);
    item.el.classList.remove('in');
    item.el.classList.add('out');
    const el = item.el;
    if (now) el.remove(); else setTimeout(() => el.remove(), 320);
  }

  function show(speaker, text, seconds, opts) {
    if (!text || !enabled()) return;
    const r = root();
    if (!r) return;
    const st = styleFor(speaker, opts);
    // the same line twice in a row (a retry, a double event) only refreshes it
    const last = live[live.length - 1];
    if (last && last.speaker === speaker && last.text === text) { clearTimeout(last.timer); last.timer = setTimeout(() => drop(last), hold(text, seconds)); return; }
    while (live.length >= MAX) drop(live[0], true);
    const el = document.createElement('div');
    el.className = 'cap' + (st.boss ? ' boss' : '');
    if (st.color) el.style.setProperty('--c', st.color);
    if (speaker) {
      const b = document.createElement('b');
      b.textContent = speaker;
      el.appendChild(b);
    }
    const s = document.createElement('span');
    s.textContent = String(text);
    el.appendChild(s);
    r.appendChild(el);
    void el.offsetWidth;   // start the fade from 0
    el.classList.add('in');
    const item = { el, speaker, text, timer: 0 };
    item.timer = setTimeout(() => drop(item), hold(text, seconds));
    live.push(item);
  }
  // on screen for the line plus a moment to finish reading it
  function hold(text, seconds) {
    const words = String(text).split(/\s+/).length;
    const s = +seconds > 0 ? +seconds : words / 2.6 + 0.6;
    return Math.round(Math.max(1.6, s + 0.9, words * 0.28 + 1) * 1000);
  }
  function clear() { while (live.length) drop(live[0], true); }

  return { show, clear };
})();
