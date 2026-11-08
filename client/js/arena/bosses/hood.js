// The Hollow Hood (boss id hood): gate 1 of a two-gate fight (contract: docs/plans/secret-raid-build.md). One difficulty (run as 'normal'; 'hard' is the same), a fixed script.
// Mechanics only. The health bar is a count of 60 bars (def.bars); every gate is a bar and the window behind it is one course (push: true), so crossing a bar starts the next
// pattern at once. Thirteen windows (twelve gates), phase 1..13:
//   1 Pale Waltz · 2 Severance · 3 Hollow Procession · 4 The Tolling · 5 Pursuit · 6 Rimelight · 7 Hollowing · 8 The Scales · 9 Dead Calm · 10 Interment · 11 Two Hands
//   12 Communion · 13 Pale Waltz twice, then Verdict (no gate: the kill)
// A window opens with its pattern (the hands come out first: roomev hdhand blade/light, 0.6 to 1 s before the floor), then its plain moves in a fixed order (Hollow Step,
// Cold Breath, Frostfall), then the same plain moves as the closing passes (10% harder a pass). Nothing shuffles.
// Hits: a frost hit takes a share of CURRENT health (opts.pct, 0.7; Cold Breath 0.3) and shows in blue; a fixed hit is a raw number (below). A blade freezes what it hits
// until the pattern's follow-up lands (f.freeze / f.thaw; a tank thaws in half the time); a blade line is stopped by the first tank in it (f.bladeLine).
// No move picks the tank: B.target is always the closest living hero (a ticker), the boss's own swings and its walk go to the closest hero, and Hollow Step walks to them.
//
// Follow-ups a push could cut are laid with afterKeep and an era guard (as the Sovereign's): each window bumps `era` as it starts, and a kept step laid in an earlier window does
// nothing. A telegraph already on the floor still resolves. Each window's start also thaws everyone and clears the hands, the clones, the eyes and the halves.
//
// Pattern clocks (seconds from the pattern's step, which fires on the bar):
//   Pale Waltz     hands at 0 / 1.8 / 3.6 / 5.4 (blade, light, blade, both); floors 0.6 / 2.4 / 4.2 / 6.0, each 1.6 s (the last 2.0); ends 8.0
//   Severance      hand 0; lines 1.0 (locked 3.0, dash 3.6 and 4.2); Echo cast 4.8, lands 8.0; thaw 8.05
//   Procession     hand 0; clones and the boss at the real figure 0.8; cast 1.1; lines 1.4 (dash 4.6); Shatter cast 5.2, lands 8.0; the boss home 8.4
//   The Tolling    hand 0; lantern 1.0; tolls 3 / 6 / 9; Last Toll cast 9.8, lands 11.5
//   Pursuit        hand 0; circles appear 2.0 / 4.2 / 6.4, each lands 1.4 later (3.4 / 5.6 / 7.8); a tank in a circle catches it (3500) and the hunt ends
//   Rimelight      hand 0; beam 1.0; pulses 4 / 7 / 10; Rimeburst cast 10.4, lands 12.2; thaw 12.3
//   Hollowing      hand 0; cast 0.8, lands 3.0 (70%); Hollow Echo cast 5.4, lands 8.5
//   The Scales     hand 0; halves 1.0 (resolve 4.0), turned 4.6 (resolve 7.6); Weighing cast 7.9, lands 9.4
//   Dead Calm      hand 0; eyes 1.0; rings 1.0 (resolve 4.6); patch 2.2 to 3.9; Calm Breaks cast 4.9, lands 7.4
//   Interment      hand 0; seal 0.7 (closes 1.5); Burial cast 1.5, lands 9.5 if the coffin stands; lines 2.6 (dash 4.5)
//   Two Hands      hand 0; cast 0; Severance's lines (1.0, dash 3.6 / 4.2, Echo 4.8 to 8.0) and the Tolling's lantern (1.0; tolls 4.6 / 8.1 / 10.6; Last Toll 13.0)
//   Communion      hand 0; cast 1.0; the ring and column land 5.5; 70% on those inside 5.6
//   Verdict        Pale Waltz, Pale Waltz (light first), Verdict (cast 3.0); anyone cut in the second Waltz stays frozen until Verdict has landed
// What the bots read: m.real on Procession's hdLine (1 the figure with the blade, 0 a copy), m.n on hdHunt (the landing, 1..3), the tags below, `hdPatch` zones.
// Tuning (2026-11-08, GEAR=post5, default line-up, bots holding the bar, 24 runs over seeds 1000 and 2000): health 7.8M (5.5M at the build), fixed hits 16500 (14000),
// Verdict 18500, Frostfall 5000, swings 3500, vuln 0.5. Perfect bots clear 88% (kill at about 7:10, enrage 9:30), HUMAN=dps 71% (kill at about 7:50): the party on pace
// kills a minute and a half before the enrage, as the design asks, but a perfect healer heals every frost share back before its fixed blow, so the human-like damage dealers
// rarely die to a pattern (what kills: Hollow Echo, swings on whoever stands closest, the enrage). The design's targets (15 to 25% human-like, 50 to 70% perfect) are not met;
// the levers left are the follow-up windows (the showcase's timings) or a human-like healer. Measured with HUMAN=dps,healer below in the contract.
// Tags: hdCone hdCircle hdRing hdWaltzEnd · hdLine hdEcho · hdShatter · hdLantern hdGuard hdToll · hdHunt · hdBeam hdBurst · hdHollow hdHollowEcho · hdBladeHalf hdLightHalf hdWeigh ·
//   hdCalm hdPatch hdCalmBreak · hdSeal hdBurial · hdCommune · hdVerdict · hdBreath hdFall.

const HOOD = {
  id: 'hood', name: 'The Hollow Hood', title: 'the Unspoken',
  hp: { normal: 7800000, hard: 7800000 }, normalDmg: 1, hardDmg: 1,
  autoDmg: { normal: 3500, hard: 3500 },   // (a plain swing: about 10% of a post5 tank, 15% of a damage dealer who stands closest)
  enrage: { normal: 570, hard: 570 }, enrageName: 'Verdict Eternal',   // (9:30; lands 8 s later)
  practiceCut: { 2: 40, 3: 80, 4: 120, 5: 160, 6: 200, 7: 240, 8: 280, 9: 320, 10: 360, 11: 400, 12: 440, 13: 480 },   // (about 40 s of the fight behind each window)
  bars: 60, noSlipCap: true, push: true, vuln: 0.5,   // (an avoidable hit bites hard, as the Sovereign's: the fixed blow that follows a slip is the kill)
  gates: [55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2].map(b => b / 60),
  spawn: { x: 0, y: 0 }, arena: { theme: 'court' },

  script(f) {
    const B = f.boss;
    const TAU = Math.PI * 2;
    // fixed damage, raw (party of four at post5: f.scale.dmg is 0.05; a DPS has about 1175 max health, a healer 1150, a tank 1790)
    const dmg = { fix: 16500, verdict: 18500, light: 5000 };
    const PCT = 0.7;   // a frost hit: this share of CURRENT health
    const hyp = Math.hypot;
    const alive = () => f.alive();
    const byId = id => alive().find(p => p.id === id) || null;
    const idCmp = (a, z) => (a.id > z.id) - (a.id < z.id);
    const healer = () => alive().find(p => p.role === 'healer') || f.nonTanks()[0] || alive()[0] || null;
    // the damage dealers in a fixed order (by id); a missing one is covered by the next, then by anyone who is left
    const dpsList = () => alive().filter(p => p.role === 'dps').sort(idCmp);
    const dpsAt = i => {
      const l = dpsList();
      if (l.length) return l[i % l.length];
      const h = healer(), o = f.nonTanks().filter(p => !h || p.id !== h.id).sort(idCmp);
      return o.length ? o[i % o.length] : alive()[0] || null;
    };
    const closestTo = (x, y) => alive().slice().sort((a, z) => hyp(a.x - x, a.y - y) - hyp(z.x - x, z.y - y))[0] || null;
    const farthestFrom = (x, y, n) => alive().slice().sort((a, z) => hyp(z.x - x, z.y - y) - hyp(a.x - x, a.y - y)).slice(0, n);
    const hold = d => { B.holdUntil = Math.max(B.holdUntil || 0, f.t + d); };
    const hurt = (p, amount, kind, extra) => f.damagePlayer(p, amount, Object.assign({ kind, avoidable: false }, extra));
    const frostHit = (p, kind, extra) => f.damagePlayer(p, 0, Object.assign({ kind, pct: PCT, avoidable: true }, extra));
    const faceTo = (x, y) => { B.facing = Math.atan2(y - B.y, x - B.x); };
    const nowhere = () => ({ kind: 'circle', x: 99999, y: 99999, r: 1 });

    // An era belongs to a window: every afterKeep the script lays is tagged with it and does nothing once the next window has begun (so a kept follow-up never fires in a later window).
    let era = 1;
    const afterKeep0 = f.afterKeep.bind(f);
    f.afterKeep = (dt, fn, name) => { const mine = era, w = () => { if (era === mine && f.state === 'live') fn(); }; w.era = mine; afterKeep0(dt, w, name); };
    const later = (dt, fn, name) => { if (dt <= 0) fn(); else f.afterKeep(dt, fn, name); };
    let over = false;   // the boss has fallen

    // --- the room's moments --------------------------------------------------------------------------------------------------
    const hand = (blade, light) => f.emit({ t: 'roomev', k: 'hdhand', blade, light, dur: 9999 });
    const bell = n => f.emit({ t: 'roomev', k: 'hdbell', n, dur: 2 });
    const thawAll = () => { for (const p of alive()) if (p.s.debuffs.frozen > f.t) f.thaw(p.id); };
    const clearRoom = () => {
      hand(0, 0);
      f.emit({ t: 'roomev', k: 'hdclones', c: [], dur: 0.1 });
      f.emit({ t: 'roomev', k: 'hdeyes', shut: 0, dur: 9999 });
      f.emit({ t: 'roomev', k: 'hdhalves', blade: 0, dur: 0.1 });
    };
    let away = false;   // the boss stands out at a figure of the Procession
    const goHome = () => { if (!away) return; away = false; B.x = 0; B.y = 0; B.moveTo = null; };

    // --- the boss's own behaviour: no tank targeting anywhere ------------------------------------------------------------------
    // B.target is the closest living hero. The engine's swings and walk follow its tank, so they are switched off here (anchor, noAutoUntil) and done below.
    B.anchor = true; B.noAutoUntil = 1e9;
    let nextAuto = 4;
    const swing = who => {
      const t = (who != null && byId(who)) || closestTo(B.x, B.y);
      if (!t || hyp(t.x - B.x, t.y - B.y) > FIGHT.MELEE * 1.8) return;
      faceTo(t.x, t.y);
      f.emit({ t: 'banim', name: 'auto', dur: 0.5 });
      hurt(t, f.def.autoDmg[f.mode], 'auto');
    };
    f.ticker(dt => {
      if (over || f.state !== 'live') return;
      const c = closestTo(B.x, B.y);
      B.target = c ? c.id : null;
      B.autoAt = nextAuto;
      if (!c) return;
      const d = hyp(c.x - B.x, c.y - B.y);
      if (!B.cast && !B.lockFacing && !B.moveTo && !B.untargetable && !(B.holdUntil > f.t) && d > FIGHT.MELEE) {
        const a = Math.atan2(c.y - B.y, c.x - B.x), step = Math.min(d - FIGHT.MELEE * 0.85, B.speed * dt);
        B.x += Math.cos(a) * step; B.y += Math.sin(a) * step;
        ARENA.clamp(B, 110);
      }
      if (f.t >= nextAuto && !B.untargetable) { nextAuto = f.t + FIGHT.AUTO_EVERY; if (d < FIGHT.MELEE * 1.5) swing(c.id); }
    });
    // a short position history per hero (Dead Calm judges "moving" from it)
    const hist = new Map();
    f.ticker(() => {
      for (const p of alive()) {
        let h = hist.get(p.id); if (!h) hist.set(p.id, h = []);
        h.push([f.t, p.x, p.y]);
        while (h.length && h[0][0] < f.t - 1.5) h.shift();
      }
    });
    const movedLately = (p, win, px) => {
      const h = hist.get(p.id) || [];
      return h.some(([t, x, y]) => t >= f.t - win && hyp(x - p.x, y - p.y) > px);
    };
    // a telegraph moved by the script (a ring beside a hero): kept on the host and told to the clients (tgmod) until it locks
    const steered = [];
    f.ticker(() => {
      for (let i = steered.length - 1; i >= 0; i--) {
        const s = steered[i], m = s.m;
        if (!f.mechs.has(m.id) || f.t >= m.resolveAt - s.lock) { steered.splice(i, 1); continue; }
        const p = byId(s.id); if (!p) continue;
        const a = Math.atan2(p.y - B.y, p.x - B.x) + Math.PI / 2;
        const x = Math.round(p.x + Math.cos(a) * s.off), y = Math.round(p.y + Math.sin(a) * s.off);
        if (Math.abs(x - m.shape.x) > 6 || Math.abs(y - m.shape.y) > 6) {
          m.shape.x = x; m.shape.y = y;
          if (f.t - (s.sent || -9) >= 0.1) { s.sent = f.t; f.emit({ t: 'tgmod', id: m.id, shape: { kind: 'circle', x, y, r: m.shape.r } }); }
        }
      }
    });

    // --- plain moves ------------------------------------------------------------------------------------------------------------
    // Hollow Step: it walks to the closest hero and swings twice
    const hollowStep = () => {
      const c = closestTo(B.x, B.y); if (!c) return;
      const id = c.id;
      faceTo(c.x, c.y);
      f.cast('Hollow Step', 0.8, 'strike');
      hold(4);
      later(0.8, () => {
        const t = byId(id) || closestTo(B.x, B.y); if (!t) return;
        const a = Math.atan2(B.y - t.y, B.x - t.x), go = { x: t.x + Math.cos(a) * 95, y: t.y + Math.sin(a) * 95 };
        const e = era;
        f.moveBoss(go.x, go.y, 520);
        const land = () => {
          if (era !== e || over) return;
          swing(t.id);
          later(0.55, () => { swing(t.id); nextAuto = f.t + FIGHT.AUTO_EVERY; });
        };
        if (B.moveTo) B.moveTo.done = land; else land();
      });
    };
    // Cold Breath: a cone at the closest hero, a small frost share, no freeze
    const coldBreath = () => {
      const c = closestTo(B.x, B.y); if (!c) return;
      const a = Math.atan2(c.y - B.y, c.x - B.x);
      B.facing = a;
      f.cast('Cold Breath', 1.4);
      f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, angle: a, arc: 0.8, r: 360 }, delay: 1.4, dmg: 0, pct: 0.3, aimFromBoss: c.id, lockAt: 0.5, tag: 'hdBreath' });
    };
    // Frostfall: three circles on the three farthest heroes
    const frostfall = () => {
      f.cast('Frostfall', 1.6);
      for (const p of farthestFrom(B.x, B.y, 3)) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 90 }, delay: 1.6, dmg: dmg.light, follow: p.id, lockAt: 0.5, tag: 'hdFall' });
    };
    const PLAIN = { S: [hollowStep, 'Hollow Step'], C: [coldBreath, 'Cold Breath'], F: [frostfall, 'Frostfall'] };

    // --- Pale Waltz (windows 1 and 13) -------------------------------------------------------------------------------------------
    // Four beats: a cone at a DPS (freezes), a circle on the healer, a cone at the other DPS, then the finale (a ring round the boss and a hit on everyone).
    // o.second: the second Waltz of the last window starts on the light (circle, cone, cone, finale). o.hold: seconds from now until a freeze ends (frozen through Verdict).
    const waltz = (o = {}) => {
      const seq = o.second ? ['circle', 'cone', 'cone', 'end'] : ['cone', 'circle', 'cone', 'end'];
      const base = f.t;
      let cones = 0;
      seq.forEach((b, i) => {
        later(i * 1.8, () => hand(b === 'cone' ? 1 : b === 'circle' ? 0 : 1, b === 'cone' ? 0 : 1));
        later(0.6 + i * 1.8, () => {
          if (b === 'cone') {
            const t = dpsAt(cones++); if (!t) return;
            const a = Math.atan2(t.y - B.y, t.x - B.x);
            B.facing = a; hold(2);
            f.cast('Pale Waltz', 1.6);
            f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, angle: a, arc: 0.75, r: 500 }, delay: 1.6, dmg: 0, pct: PCT, aimFromBoss: t.id, lockAt: 0.6, tag: 'hdCone',
              onResolve: (inside, hits) => { for (const id of hits) f.freeze(id, o.hold ? Math.max(0.5, base + o.hold - f.t) : 1.2); } });
          } else if (b === 'circle') {
            const h = healer(); if (!h) return;
            hold(2);
            f.cast('Pale Waltz', 1.6);
            f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 60 }, delay: 1.6, dmg: 0, pct: PCT, follow: h.id, lockAt: 0.5, tag: 'hdCircle' });
          } else {
            hold(2.4);
            f.cast('Pale Waltz', 2.0);
            f.mech({ type: 'aoe', shape: { kind: 'donut', x: B.x, y: B.y, r: 260, r2: 92 }, delay: 2.0, dmg: dmg.light, tag: 'hdRing' });
            f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2.0, dmg: dmg.light, hidden: true, tag: 'hdWaltzEnd' });
          }
        });
      });
      if (!o.keepHands) later(8.0, () => hand(0, 0));
      return 8.0;
    };

    // --- Severance (window 2, and inside Two Hands) --------------------------------------------------------------------------------
    // Two DPS are lined: the blade dashes down each, 70% and frozen; then both lines come back as echoes (fixed) while the frozen stand in them.
    const severance = o => {
      const a = dpsAt(0), b = dpsAt(1); if (!a || !b) return;
      const echoes = [], frozen = new Set();
      later(1.0, () => {
        if (o.cast) f.cast('Severance', 3.2);
        [[a, 3.6, 0], [b, 4.2, 1]].forEach(([who, dash, i]) => {
          const m = f.bladeLine({ to: who.id, delay: dash - 1.0, lock: dash - 3.0, tag: 'hdLine', pct: PCT, freeze: 4.8,
            onResolve: (hit, stopAt) => { echoes[i] = { x: m.shape.x, y: m.shape.y, to: stopAt, stopped: hit.length && hit.some(p => p.role === 'tank') }; for (const p of hit) frozen.add(p.id); } });
        });
      }, o.cast ? 'Severance' : undefined);
      later(4.8, () => {
        f.cast('Echo', 3.2);
        for (const e of echoes) {
          if (!e) continue;
          const len = hyp(e.to.x - e.x, e.to.y - e.y) + (e.stopped ? 36 : 0);
          f.mech({ type: 'aoe', shape: { kind: 'rect', x: e.x, y: e.y, angle: Math.atan2(e.to.y - e.y, e.to.x - e.x), len, w: 96 }, delay: 3.2, dmg: dmg.fix, tag: 'hdEcho' });
        }
      }, 'Echo');
      later(8.05, () => { for (const id of frozen) f.thaw(id); });
    };
    // --- The Tolling (window 4, and inside Two Hands) --------------------------------------------------------------------------------
    // A lantern over the healer tolls (70% on the lantern's target); beside the healer a blue ring: whoever stands in it takes the toll instead. Last Toll is fixed.
    // Called at the pattern's 1.0 s; the tolls and the last are seconds from the pattern's start.
    const lantern = (start, tolls, last) => {
      const h0 = healer(); if (!h0) return;
      const id = h0.id, rel = last - start;
      f.mech({ type: 'drop', shape: { kind: 'circle', x: h0.x, y: h0.y, r: 60 }, delay: rel + 0.1, follow: id, tag: 'hdLantern', from: 'The Tolling' });
      tolls.forEach((tt, i) => {
        const from = i === 0 ? start : tolls[i - 1];
        later(from - start, () => {
          const h = byId(id); if (!h) return;
          const a = Math.atan2(h.y - B.y, h.x - B.x) + Math.PI / 2;
          const m = f.mech({ type: 'guard', shape: { kind: 'circle', x: Math.round(h.x + Math.cos(a) * 60), y: Math.round(h.y + Math.sin(a) * 60), r: 56 }, target: id, delay: tt - from, dmg: 0, pct: PCT, need: 1, tag: 'hdGuard', from: 'The Tolling',
            onResolve: () => bell(i + 1) });
          steered.push({ m, id, off: 60, lock: 0.5 });
        });
      });
      later(last - 1.7 - start, () => {
        const h = byId(id); if (!h) return;
        f.cast('Last Toll', 1.7);
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 60 }, delay: 1.7, dmg: dmg.fix, follow: id, lockAt: 0.5, tag: 'hdToll' });
      }, 'Last Toll');
    };

    // --- the patterns ----------------------------------------------------------------------------------------------------------------
    const oath = () => { waltz({}); };

    const sev = () => {
      hand(1, 0); hold(8.6);
      severance({ cast: true });
      later(8.2, () => hand(0, 0));
    };

    const procession = () => {
      hand(1, 0); hold(8.8);
      const R = 380, spot = a => ({ x: Math.round(Math.cos(a) * R), y: Math.round(Math.sin(a) * R) });
      const real = spot(-Math.PI / 6), c1 = spot(Math.PI * 7 / 6), c2 = spot(Math.PI / 2);
      const face = s => +Math.atan2(-s.y, -s.x).toFixed(2);
      later(0.8, () => {
        away = true; B.moveTo = null; B.x = real.x; B.y = real.y; B.facing = face(real);
        f.emit({ t: 'roomev', k: 'hdclones', c: [[real.x, real.y, face(real), 1, 1], [c1.x, c1.y, face(c1), 0, 0], [c2.x, c2.y, face(c2), 0, 0]], dur: 4.4 });
      });
      later(1.1, () => f.cast('Hollow Procession', 3.5), 'Hollow Procession');
      later(1.4, () => {
        const d1 = dpsAt(0), d2 = dpsAt(1), h = healer();
        const who = [d1, h, d2].filter(Boolean).filter((p, i, l) => l.findIndex(q => q.id === p.id) === i);
        for (const p of alive()) if (who.length < 3 && !who.some(q => q.id === p.id)) who.push(p);
        [[real, 1], [c1, 0], [c2, 0]].forEach(([s, isReal], i) => {
          const p = who[i]; if (!p) return;
          const m = f.bladeLine({ src: { x: s.x, y: s.y }, to: p.id, delay: 3.2, lock: 0.6, tag: 'hdLine', pct: PCT, freeze: isReal ? 3.8 : 0 });
          m.real = isReal;
        });
      });
      later(5.2, () => {
        f.cast('Shatter', 2.8);
        for (const p of alive()) if (p.s.debuffs.frozen > f.t) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: 2.8, dmg: dmg.fix, follow: p.id, lockAt: 0.6, tag: 'hdShatter' });
      }, 'Shatter');
      later(8.1, () => { thawAll(); hand(0, 0); });
      later(8.4, goHome);
    };

    const tolling = () => {
      hand(0, 1); hold(11.8);
      later(1.0, () => f.cast('The Tolling', 8.0), 'The Tolling');
      later(1.0, () => lantern(1.0, [3, 6, 9], 11.5));
      later(11.6, () => hand(0, 0));
    };

    // Pursuit: it hunts one DPS. A circle locks where they stand and the boss lands in it, three times; a tank standing in a circle catches it (and the hunt ends).
    const pursuit = () => {
      hand(1, 0); hold(8.2);
      const hunted = dpsAt(0); if (!hunted) return;
      let ended = false;
      const finish = () => { if (ended) return; ended = true; hand(0, 0); };
      const one = k => {
        if (ended) return;
        const t = byId(hunted.id) || dpsAt(0); if (!t) return;
        const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: t.x, y: t.y, r: 120 }, delay: 1.4, dmg: 0, pct: PCT, follow: t.id, lockAt: 0.6, tag: 'hdHunt', from: 'Pursuit' });
        m.n = k;
        m.tick = mm => {
          if (mm.decided || f.t < mm.resolveAt - 0.12) return;
          mm.decided = true;
          B.moveTo = null; B.x = mm.shape.x; B.y = mm.shape.y; ARENA.clamp(B, 110);
          const tank = alive().find(p => p.role === 'tank' && SHAPES.contains(mm.shape, p.x, p.y, 14));
          if (tank) {
            ended = true;
            mm.shape = nowhere();
            hurt(tank, dmg.light, 'hdCatch', { n: 'Pursuit' });
            if (B.cast && B.cast.name === 'Pursuit') { f.emit({ t: 'bcastend', name: 'Pursuit', ok: 1 }); B.cast = null; }
            later(0.4, () => hand(0, 0));
          }
        };
      };
      later(2.0, () => f.cast('Pursuit', 5.8), 'Pursuit');
      [2.0, 4.2, 6.4].forEach((tt, i) => later(tt, () => one(i + 1)));
      later(8.0, finish);
    };

    // Rimelight: a beam from the boss through the healer pulses three times; the first hero in it takes 70% and is frozen until the move ends. Rimeburst is fixed on everyone.
    const rimelight = () => {
      hand(0, 1); hold(12.6);
      later(1.0, () => f.cast('Rimelight', 9.0), 'Rimelight');
      [[1.0, 4], [4.0, 7], [7.0, 10]].forEach(([laid, pulse]) => later(laid, () => {
        const h = healer(); if (!h) return;
        f.bladeLine({ to: h.id, delay: pulse - laid, lock: 0.35, tag: 'hdBeam', w: 70, pct: PCT, stop: 'first', freeze: 12.6 - pulse });
      }));
      later(10.4, () => {
        f.cast('Rimeburst', 1.8);
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 1.8, dmg: dmg.fix, hidden: true, tag: 'hdBurst' });
      }, 'Rimeburst');
      later(12.3, () => { thawAll(); hand(0, 0); });
    };

    const hollowing = () => {
      hand(1, 1); hold(8.8);
      later(0.8, () => {
        f.cast('Hollowing', 2.2);
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2.2, dmg: 0, pct: PCT, hidden: true, tag: 'hdHollow' });
      }, 'Hollowing');
      later(5.4, () => {
        f.cast('Hollow Echo', 3.1);
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 3.1, dmg: dmg.fix, hidden: true, tag: 'hdHollowEcho' });
      }, 'Hollow Echo');
      later(8.6, () => hand(0, 0));
    };

    // The Scales: the room splits in two halves, a blade half and a light half. A DPS inside the blade half, or the healer inside the light half, takes 70% when it resolves
    // (the blade half also freezes 2 s); a tank is never hit by either. Then the halves turn and it happens again.
    const scales = () => {
      hand(1, 1); hold(9.6);
      const halves = (bladeLeft, dur) => {
        const left = { kind: 'rect', x: -600, y: 0, angle: 0, len: 600, w: 1300 }, right = { kind: 'rect', x: 0, y: 0, angle: 0, len: 600, w: 1300 };
        f.emit({ t: 'roomev', k: 'hdhalves', blade: bladeLeft ? -1 : 1, dur });
        const blade = (inside) => { for (const p of inside) if (p.role === 'dps') { frostHit(p, 'hdBladeHalf', { n: 'The Scales' }); f.freeze(p.id, 2); } };
        const light = (inside) => { for (const p of inside) if (p.role === 'healer') frostHit(p, 'hdLightHalf', { n: 'The Scales' }); };
        f.mech({ type: 'drop', shape: bladeLeft ? left : right, delay: dur, tag: 'hdBladeHalf', from: 'The Scales', onResolve: blade });
        f.mech({ type: 'drop', shape: bladeLeft ? right : left, delay: dur, tag: 'hdLightHalf', from: 'The Scales', onResolve: light });
      };
      later(1.0, () => { f.cast('The Scales', 3.0); halves(true, 3.0); }, 'The Scales');
      later(4.6, () => { f.cast('The Scales', 3.0); halves(false, 3.0); }, 'The Scales');
      later(7.9, () => {
        f.cast('Weighing', 1.5);
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 1.5, dmg: dmg.fix, hidden: true, tag: 'hdWeigh' });
      }, 'Weighing');
      later(9.45, () => { f.emit({ t: 'roomev', k: 'hdhalves', blade: 0, dur: 0.1 }); hand(0, 0); });
    };

    // Dead Calm: its eyes close and a ring settles on each DPS; when the rings close, any DPS who moved more than 25 px in the last 0.8 s is cut (70% and frozen), and
    // Calm Breaks follows on whoever was cut. A frost patch opens under one of them first.
    const deadCalm = () => {
      hand(1, 0); hold(7.6);
      const cut = [];
      later(1.0, () => {
        f.emit({ t: 'roomev', k: 'hdeyes', shut: 1, dur: 9999 });
        f.cast('Dead Calm', 3.6);
        for (const i of [0, 1]) {
          const p = dpsAt(i); if (!p || (i === 1 && p.id === dpsAt(0).id)) continue;
          f.mech({ type: 'drop', shape: { kind: 'circle', x: p.x, y: p.y, r: 70 }, delay: 3.6, follow: p.id, tag: 'hdCalm', from: 'Dead Calm',
            onResolve: () => {
              const q = byId(p.id); if (!q || !movedLately(q, 0.8, 25)) return;
              frostHit(q, 'hdCalm', { n: 'Dead Calm' }); f.freeze(q.id, 2.8); cut.push(q.id);
            } });
        }
      }, 'Dead Calm');
      later(2.2, () => {
        const p = dpsAt(1); if (!p) return;
        f.zone({ shape: { kind: 'circle', x: p.x, y: p.y, r: 60 }, dur: 1.7, effect: 'burn', dmg: dmg.light, tag: 'hdPatch' });
      });
      later(4.6, () => f.emit({ t: 'roomev', k: 'hdeyes', shut: 0, dur: 9999 }));
      later(4.9, () => {
        f.cast('Calm Breaks', 2.5);
        for (const id of cut) { const p = byId(id); if (p) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 70 }, delay: 2.5, dmg: dmg.fix, tag: 'hdCalmBreak' }); }
      }, 'Calm Breaks');
      later(7.45, () => { for (const id of cut) f.thaw(id); hand(0, 0); });
    };

    // Interment: the healer is sealed in an ice coffin (70%, held, no heals); Burial lands on them if the coffin still stands. Meanwhile two blade lines at the DPS.
    const interment = () => {
      hand(1, 1); hold(9.8);
      later(0.7, () => {
        const h = healer(); if (!h) return;
        f.cast('Interment', 0.8);
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 70 }, delay: 0.8, dmg: 0, pct: PCT, follow: h.id, lockAt: 0.3, tag: 'hdSeal',
          onResolve: () => {
            const q = byId(h.id); if (!q) return;
            const c = f.coffin(q.id, { hp: 60000, dur: 8.3, name: 'Burial' }); if (!c) return;
            f.cast('Burial', 8.0);
            const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: q.x, y: q.y, r: 60 }, delay: 8.0, dmg: dmg.verdict, tag: 'hdBurial', from: 'Burial' });
            m.tick = mm => {
              if (mm.decided || f.t < mm.resolveAt - 0.12) return;
              mm.decided = true;
              if (!f.coffinOf(q.id)) mm.shape = nowhere();
              else later(0.2, () => f.breakCoffin(q.id));
            };
          } });
      }, 'Interment');
      later(2.6, () => {
        for (const i of [0, 1]) { const p = dpsAt(i); if (p && !(i === 1 && p.id === dpsAt(0).id)) f.bladeLine({ to: p.id, delay: 1.9, lock: 0.8, tag: 'hdLine', pct: PCT, freeze: 2 }); }
      });
      later(9.7, () => hand(0, 0));
    };

    // Two Hands: Severance's lines and the Tolling's lantern at once
    const twoHands = () => {
      hand(1, 1); hold(13.2);
      f.cast('Two Hands', 1.0);
      severance({ cast: false });
      later(1.0, () => lantern(1.0, [4.6, 8.1, 10.6], 13.0));
      later(13.2, () => hand(0, 0));
    };

    // Communion: a blue ring opens round the healer and a column lands: fixed damage split among those inside, then 70% on each of them
    const communion = () => {
      hand(0, 1); hold(6);
      later(1.0, () => {
        const h = healer(); if (!h) return;
        f.cast('Communion', 4.5);
        f.emit({ t: 'roomev', k: 'hdcolumn', id: h.id, dur: 4.5 });
        f.mech({ type: 'stack', shape: { kind: 'circle', x: h.x, y: h.y, r: 150 }, delay: 4.5, dmg: dmg.fix, need: 4, follow: h.id, lockAt: 1.0, tag: 'hdCommune',
          onResolve: inside => { const ids = inside.map(p => p.id); later(0.1, () => { for (const id of ids) { const p = byId(id); if (p) frostHit(p, 'hdCommune', { n: 'Communion', avoidable: false }); } }); } });
      }, 'Communion');
      later(5.8, () => hand(0, 0));
    };

    // Verdict: fixed damage on all four
    const verdict = () => {
      hand(1, 1); hold(4);
      later(0.6, () => {
        f.cast('Verdict', 3.0);
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 3.0, dmg: dmg.verdict, hidden: true, tag: 'hdVerdict' });
      }, 'Verdict');
      later(3.75, () => { thawAll(); hand(0, 0); });
    };

    // --- the windows -------------------------------------------------------------------------------------------------------------------
    // [pattern, name, length (the pattern's last follow-up), plain moves in order]
    const ORDER = ['SCFSC', 'CFSCF', 'FSCFS', 'SFCSF', 'CSFCS', 'FCSFC', 'SCFCS', 'CFSFC', 'FSCSF', 'SFCFS', 'CSFSC', 'FCSCF'];
    const WINDOWS = [
      [oath, 'Pale Waltz', 8.2],
      [sev, 'Severance', 8.2],
      [procession, 'Hollow Procession', 8.6],
      [tolling, 'The Tolling', 11.7],
      [pursuit, 'Pursuit', 8.2],
      [rimelight, 'Rimelight', 12.4],
      [hollowing, 'Hollowing', 8.7],
      [scales, 'The Scales', 9.5],
      [deadCalm, 'Dead Calm', 7.5],
      [interment, 'Interment', 9.8],
      [twoHands, 'Two Hands', 13.3],
      [communion, 'Communion', 5.9],
    ];
    const window_ = (k, from) => {
      const last = k === 13;
      const o = {
        onStart: () => {
          era++;
          thawAll(); clearRoom(); goHome();
          B.holdUntil = 0; B.lockFacing = false;
          if (k === 1 && !f.skipTo) f.emit({ t: 'roomev', k: 'hdopen', gate: 1, dur: 9999 });
        },
        push: true,
      };
      if (!last) {
        const [pattern, name, len] = WINDOWS[k - 1], ord = ORDER[k - 1];
        o.until = HOOD.gates[k - 1];
        const steps = [[k === 1 ? 2.5 : 0, pattern, name]];
        [...ord].forEach((c, i) => steps.push([i === 0 ? len + 1.5 : 6.5, PLAIN[c][0], PLAIN[c][1]]));
        o.sets = [steps];
        o.closing = ['S', 'C', 'F'].map((c, i) => [i === 0 ? 4 : 8, PLAIN[c][0], PLAIN[c][1]]);
        o.next = t => window_(k + 1, t);
      } else {
        o.sets = [[[0, () => waltz({}), 'Pale Waltz'], [8.6, () => waltz({ second: true, hold: 12.7 }), 'Pale Waltz'], [8.8, verdict, 'Verdict']]];
        o.closing = [[12, () => waltz({}), 'Pale Waltz']];
      }
      return f.course(o, from);
    };

    // The enrage: the default one lays its sentence with f.after, which a window starting inside its 8 s would drop. Same cast, kept.
    f.enrage = () => {
      if (f.state !== 'live' || over) return;
      f.cast(f.def.enrageName || 'Enrage', 8, 'enrage');
      f.atKeep(f.t + 8, () => { if (f.state !== 'live' || over) return; for (const p of alive()) f.damagePlayer(p, 9999999, { kind: 'enrage' }); });
    };

    // The kill: it kneels. Everything on the floor goes, and 4 s later the fight is won.
    f.onFell = () => {
      over = true;
      f.events = [];
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      for (const z of f.zones) z.end = Math.min(z.end, f.t);
      f.emit({ t: 'zone', clear: true });
      for (const a of [...f.adds.values()]) { f.adds.delete(a.id); f.emit({ t: 'addev', k: 'gone', id: a.id }); }
      f.addsDirty = true;
      for (const p of alive()) { delete p.s.debuffs.coffin; f.thaw(p.id); }
      if (B.cast) f.emit({ t: 'bcastend', name: B.cast.name, ok: 0 });
      B.cast = null; B.moveTo = null; B.noAutoUntil = f.t + 99;
      goHome(); clearRoom();
      f.emit({ t: 'roomev', k: 'hdkneel', dur: 9999 });
      f.atKeep(f.t + 4, () => f.end('clear'));
    };

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.waltz())
    f.moves = { hollowStep, coldBreath, frostfall, waltz, severance, procession, tolling, pursuit, rimelight, hollowing, scales, deadCalm, interment, twoHands, communion, verdict };

    window_(1, 0);
  },
};

if (typeof module !== 'undefined') module.exports = { HOOD };
