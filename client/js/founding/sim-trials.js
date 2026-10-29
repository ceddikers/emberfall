// The Founding: Founder's Trials, host side. Opt-in modifiers that make a run harder and pay in titles, never in power.
// The host's town sets FoundingSim.trials = [ids] before a run starts (main.js); a run with none costs nothing (this module stays out).
// Names, texts and numbers: story.js (FOUNDING_STORY.TRIALS, .TUNE). Ids: quick, dry, dark, lean, bold.
//   quick  Short Days      the next wave comes sooner; the night keeps its place among the waves
//   dry    The Dry Spring  the spring heals no one (the fountain's trickle is taken back, the art shows a trickle)
//   dark   No Moon         dusk sooner and dawn later, the beacon cannot thin the night, every lamp reaches less
//   lean   A Lean Purse    less gold from the fallen
//   bold   The Ash, Bolder every ordinary lane enemy is born with the next step's look, a little more plate and pace
// Sent to every tab as fds.props.tr (the ids), so the clients can show them and earn the clear.

(function () {
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const ST = typeof FOUNDING_STORY !== 'undefined' ? FOUNDING_STORY : require('./story.js').FOUNDING_STORY;
  const hyp = Math.hypot, TN = ST.TUNE;
  FS.trials = FS.trials || [];

  (FS.mods = FS.mods || []).push(sim => {
    const ids = ST.validTrials(FS.trials);
    if (!ids.length) return null;
    const on = id => ids.includes(id);
    sim.trials = ids;

    // The Dry Spring: let the sim run a hero's turn, then take back exactly what the fountain gave in it
    if (on('dry')) {
      const upd = sim.updateHero.bind(sim);
      sim.updateHero = function (h, dt) {
        const before = h.hp, inF = !h.dead && hyp(h.x - M.P.spring[0], h.y - M.P.spring[1]) < D.TUNE.fountainR;
        upd(h, dt);
        if (inF && before < h.max) {
          const rate = (sim.spring === 2 ? D.TUNE.full : D.TUNE.trickle) * (sim.warm ? 1.3 : 1);
          h.hp = Math.max(before, h.hp - Math.min(rate * dt, h.max - before));
          h.drinkT = 0;
        }
      };
    }

    // how dark it is on the standard clock (Short Days runs the waves faster, so the clock the night follows is stretched to match)
    const stretch = on('quick') ? D.WAVE_GAP / TN.quickGap : 1;
    const nightAt = t => {
      const vt = D.WAVE_T0 + (t - D.WAVE_T0) * stretch;
      if (!on('dark')) return D.nightFrac(vt);
      return Math.max(D.nightFrac(vt - TN.nightShift), D.nightFrac(vt), D.nightFrac(vt + TN.nightShift));
    };

    return {
      wave(n) { if (on('quick')) sim.nextWaveAt = D.WAVE_T0 + n * TN.quickGap; },
      tick() {
        if (on('quick') || on('dark')) {
          if (on('dark') && sim.peak < D.TUNE.nightPeak) sim.peak = D.TUNE.nightPeak;
          sim.night = nightAt(sim.time) * sim.peak;
        }
        if (on('bold')) {
          const E = sim.enemies;
          for (let i = 0; i < E.length; i++) {
            const e = E[i];
            if (e._tb) continue;
            e._tb = 1;
            if (e.dead || e.mod || e.def.boss || e.def.inert || (e.lane !== 0 && e.lane !== 1)) continue;
            e.tier = Math.min(7, e.tier + TN.boldStep); e.arm = Math.min(0.5, e.arm + TN.boldArm); e.speed *= 1 + TN.boldSpeed;
          }
        }
      },
      recalc(h, s) { if (on('dark')) s.sight += TN.darkSight; if (on('lean')) s.gold += TN.leanGold; },
      // (the art draws the heal ring at fountainR: small enough to read as a dry spring, big enough for its arithmetic)
      props(p) { p.tr = ids; if (on('dry')) { p.spring = 'trickle'; p.fountainR = 30; } },
    };
  });
})();
