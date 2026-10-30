// The Founding: the opening scene, host side. A run starts with the founders and the heroes coming into the empty valley at dusk;
// the world holds still until the scene ends, then control (and the wave clock) begins as if the run had just started.
//
//   FoundingSim.intro            true: always on (tests), false: always off, undefined: on in the browser, off in Node (headless runs)
//   FoundingSim.INTRO_TOTAL      the scene's length in seconds (client-intro.js plays its script against the same number)
//
// How it holds the world: while the scene runs the module takes over sim.tick(dt), so no time passes in the run (sim.time stays 0, no
// wave, no enemy, no quest clock); it only advances its own clock and keeps the snapshots flowing. The heroes stay where start() put
// them; the clients draw the walk-in from the scene clock, so the host moves nothing.
//
// Messages
//   snapshot  fds.in = [t, total, [voter ids], need]   while the scene runs (absent when it is over)
//   intent    skipIntro {off?}   cast a vote to skip (off: take it back). Every other intent is ignored while the scene runs.
//   events    ['in', 'skip', pid, 1|0] a vote cast or withdrawn · ['in', 'end', 1|0] the scene is over (1: skipped)
// Skip: a lone player skips at once; the host skips for everyone; otherwise most of the players (more than half) must vote.
// All files LF. Uses only sim.rand (it uses none: the scene is a script).

(function () {
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const r1 = v => Math.round(v * 10) / 10;
  FS.INTRO_TOTAL = 58;

  (FS.mods = FS.mods || []).push(sim => {
    const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!(FS.intro === true || (FS.intro !== false && browser))) return null;
    let I = null;   // the running scene: { t, total, votes: Set, done }

    // players who are really in the run (a guest who left mid-scene no longer counts, nor holds a vote)
    const present = () => sim.players.filter(p => sim.hmap[p.id]);
    const needed = () => Math.floor(present().length / 2) + 1;
    const hostId = () => (sim.players[0] ? sim.players[0].id : null);
    sim.introActive = () => !!(I && !I.done);   // (the solo pause is refused while the scene runs: Esc is the skip then)

    function end(skipped) {
      if (!I || I.done) return;
      I.done = true;
      sim.nextWaveAt = D.WAVE_T0;   // (the clock never moved: wave 1 still comes the usual 20 s after control)
      sim.ev(['in', 'end', skipped ? 1 : 0]);
      for (const h of sim.heroes) h.dirty = true;
      sim.sendSnapshot(); sim.flushEvents();
    }
    function judge() {
      if (!I || I.done) return;
      for (const id of [...I.votes]) if (!sim.hmap[id]) I.votes.delete(id);
      if (I.votes.has(hostId()) || I.votes.size >= needed()) end(true);
    }

    const origTick = sim.tick.bind(sim);
    sim.tick = function (dt) {
      if (!I || I.done || sim.st !== 'live') return origTick(dt);
      I.t += dt;
      judge();
      if (I.done) return;
      if (I.t >= I.total) { end(false); return; }
      if (sim.snapN++ % 2 === 0) sim.sendSnapshot();
      sim.flushEvents();
    };

    return {
      start() { I = { t: 0, total: FS.INTRO_TOTAL, votes: new Set(), done: false }; },
      // the scene holds the heroes' hands: nothing but the skip vote gets through
      intent(h, m) {
        if (!I || I.done) return undefined;
        if (m.k === 'skipIntro') {
          const was = I.votes.has(h.id), on = !m.off;
          if (on) I.votes.add(h.id); else I.votes.delete(h.id);
          if (was !== on) sim.ev(['in', 'skip', h.id, on ? 1 : 0]);
          judge();
        }
        return true;
      },
      snapshot(s) { if (I && !I.done) s.in = [r1(I.t), I.total, [...I.votes], needed()]; },
    };
  });
})();
