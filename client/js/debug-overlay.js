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

  return {
    init(fn) { info = fn; if (Save.setting('debug', false)) toggle(true); },
    frame(dt) { frames++; worst = Math.max(worst, dt * 1000); },
    toggle,
  };
})();
