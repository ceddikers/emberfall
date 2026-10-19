// Debug overlay (F3): frame rate, the worst frame, ping to the host, network traffic and what's loaded.
// For pinning down problems in testing; hidden by default and remembered per browser (save.js settings).
// main.js calls DebugOverlay.frame(dt) every frame and supplies the game-side lines through init(info).

const DebugOverlay = (() => {
  const el = document.createElement('div');
  el.id = 'debug-overlay';
  el.hidden = true;
  document.body.appendChild(el);

  let info = () => [];
  let frames = 0, worst = 0, fps = null, worstShown = 0, lastIn = 0, lastOut = 0, rateIn = 0, rateOut = 0, last = performance.now();

  function toggle(on = el.hidden) {
    el.hidden = !on;
    Save.setSetting('debug', on);
    if (on) render();
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'F3') return;
    e.preventDefault();   // browsers use F3 for "find next"
    toggle();
  });

  // once a second: fps, worst frame and message rates
  setInterval(() => {
    const t = performance.now(), secs = (t - last) / 1000;
    last = t;
    fps = frames / secs; worstShown = worst; frames = 0; worst = 0;
    rateIn = (Net.stats.in - lastIn) / secs; rateOut = (Net.stats.out - lastOut) / secs;
    lastIn = Net.stats.in; lastOut = Net.stats.out;
    if (!el.hidden) render();
  }, 1000);

  const row = (k, v, warn) => `<div${warn ? ' class="warn"' : ''}><span>${k}</span><b>${v}</b></div>`;
  function render() {
    const role = Net.solo ? 'solo' : !Net.online ? 'offline' : Net.isHost ? `host · room ${Net.room}` : `guest · room ${Net.room}`;
    const rtt = Net.stats.rtt;
    const lines = [
      row('FPS', fps == null ? '…' : fps.toFixed(0), fps != null && fps < 50),
      row('Worst frame', fps == null ? '…' : `${worstShown.toFixed(0)} ms`, worstShown > 50),
      row('Network', role),
      row('Ping to host', Net.isHost || Net.solo ? '—' : rtt == null ? 'measuring…' : `${rtt.toFixed(0)} ms`, rtt != null && rtt > 150),
      row('Messages/s', `${rateIn.toFixed(0)} in · ${rateOut.toFixed(0)} out`),
    ];
    for (const [k, v, warn] of info()) lines.push(row(k, v, warn));
    el.innerHTML = `<header>Debug · F3</header>${lines.join('')}`;
  }

  // Testing aid: with ?bnext-demo in the address, feed this tab a made-up 'bnext' (the boss's upcoming moves) once a
  // second, so the list under the boss cast bar can be checked before the bosses send the real one. Nothing is sent.
  if (/[?&]bnext-demo\b/.test(location.search)) {
    const moves = [['Tenderize', 7], ['Mince', 5], ['Grease Fire', 9], ['Boil Over', 6]];
    let t0 = performance.now() / 1000;
    setInterval(() => {
      const fn = Net.handlers.bnext; if (!fn) return;
      let t = (performance.now() / 1000 - t0) % 27, i = 0, l = [];
      while (t > moves[i % 4][1]) { t -= moves[i % 4][1]; i++; }
      let at = moves[i % 4][1] - t;
      for (let k = 1; k <= 3; k++) { l.push([moves[(i + k) % 4][0], +at.toFixed(1)]); at += moves[(i + k) % 4][1]; }
      fn({ t: 'bnext', l });
    }, 1000);
  }

  return {
    init(fn) { info = fn; if (Save.setting('debug', false)) toggle(true); },
    frame(dt) { frames++; worst = Math.max(worst, dt * 1000); },
    toggle,
  };
})();
