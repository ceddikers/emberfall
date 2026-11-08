// The Six-Winged Seraph (boss id seraph): gate 2 of a two-gate fight (docs/plans/secret-raid-build.md).
// One difficulty (run as 'normal'; 'hard' is the same), fully fixed: nothing shuffles. The boss bar is a count of 40 bars with a gate every four (the last two
// windows are five and three bars); each window is one pushed course whose first set is the window's pattern, followed by the plain moves in a fixed order.
// A pattern fires on the bar: the hands come out (roomev hdhand) 0.6 s before the floor is drawn; hands are empty between patterns.
//
// Rules: a percentage hit (pct 0.75) takes that share of current health (frost-blue number); a fixed hit is raw (14000 follow-ups, 16500 for The Unsaid and Burial,
// 3500 light hits) and lands 0.5 s sooner than gate 1's. Blade dashes freeze what they hit (rooted until the move's fixed follow-up lands; a tank stops a dash and
// thaws in half the time). Broken Halo throws a shard at the FARTHEST hero and a frost pillar (solid, cover) stands where it lands: light moves (rays, Benediction,
// Absolution) are blocked for anyone whose line to the source passes through a pillar; blade lines shatter any pillar they cross. Six shards in all (hdgaps).
// The boss has no tank targeting: f.tank() is overridden to the closest living hero (autos, walking and B.target all follow it).
//
// Windows (phase = window): 1 x40 Broken Halo, Returning Edge · 2 x36 Radiance · 3 x32 Wingfall · 4 x28 Broken Halo, Following Light · 5 x24 Benediction ·
//   6 x20 Broken Halo, The Scales · 7 x16 Last Rites · 8 x12 Broken Halo x2, Hollowing · 9 x8 Broken Halo, Cold Sermon · 10 x3 Six Wings, The Unsaid.
// Plain moves (every window): Hollow Step, Cold Breath, Frostfall (15% faster than gate 1's) and, from window 2, Wingbeat (a throw from the boss to the walls).
// Kept follow-ups (afterKeep) carry an era: a window turning cuts every follow-up the old window had laid (openWindow); telegraphs already on the floor resolve.
//
// Tuning (2026-11-08, GEAR=post5, default line-up, bots holding the bar, 24 runs over seeds 1000 and 2000): health 5.6M (4.0M at the build), fixed hits 15000 (14000),
// The Unsaid and Burial 17000, swings 2500, vuln 0.5. Perfect bots clear 50% (kill at about 4:55, enrage 7:00), HUMAN=dps 29%; what kills: swings on whoever stands
// closest, Absolution and Burial, Hollow Echo. The design asks for 10 to 20% human-like and 50 to 70% perfect.
const SERAPH = {
  id: 'seraph', name: 'The Six-Winged Seraph', title: 'the Unspoken',
  hp: { normal: 5600000, hard: 5600000 }, normalDmg: 1, hardDmg: 1,
  autoDmg: { normal: 2500, hard: 2500 },   // (a plain swing: about 7% of a post5 tank)
  enrage: { normal: 420, hard: 420 }, enrageName: 'The Unsaid',
  practiceCut: { 2: 36, 3: 72, 4: 108, 5: 144, 6: 180, 7: 216, 8: 252, 9: 288, 10: 324 },   // (about 36 s of the fight behind each window at pace)
  bars: 40, noSlipCap: true, push: true, vuln: 0.5,
  gates: [36, 32, 28, 24, 20, 16, 12, 8, 3].map(b => b / 40),
  spawn: { x: 0, y: 0 }, arena: { theme: 'court' },

  script(f) {
    const B = f.boss;
    const PCT = 0.75;
    const dmg = { fixed: 15000, last: 17000, light: 3500, patch: 3500 };
    const GATE = [36, 32, 28, 24, 20, 16, 12, 8, 3].map(b => b / 40);
    const SHARDS_BEFORE = [0, 1, 1, 1, 2, 2, 3, 3, 5, 6];   // (shards thrown before each window: a practice start stands that many pillars)
    const sh = { n: 0 };
    f.room = {};

    // an era guard on every kept follow-up (as the Ultimate's): a window turning drops what the old window laid
    let era = 1;
    const afterKeep0 = f.afterKeep.bind(f);
    f.afterKeep = (dt, fn, name) => { const mine = era, w = () => { if (era === mine) fn(); }; w.era = mine; afterKeep0(dt, w, name); };
    // local time inside a pattern: L = 0 is the step that opens it (the hands come out)
    const at = (L, fn, name) => { if (L <= 0.001) fn(); else f.afterKeep(L, fn, name); };

    // --- who -----------------------------------------------------------------------------------------------------------------------
    const live = id => f.alive().find(p => p.id === id) || null;
    const dpsOf = () => f.alive().filter(p => p.role === 'dps').sort((a, z) => a.id - z.id);
    const healPick = () => f.alive().find(p => p.role === 'healer') || f.alive().find(p => p.role !== 'tank') || f.alive()[0] || null;
    const dpsPick = i => { const d = dpsOf(); if (d.length) return d[i % d.length]; return f.alive().find(p => p.role !== 'healer') || f.alive()[0] || null; };
    const distB = p => Math.hypot(p.x - B.x, p.y - B.y);
    const closest = () => f.alive().sort((a, z) => distB(a) - distB(z))[0] || null;
    const farthest = (n = 1) => f.alive().sort((a, z) => distB(z) - distB(a)).slice(0, n);
    const face = (x, y) => { B.facing = Math.atan2(y - B.y, x - B.x); };
    const pillars = () => f.props.filter(p => p.kind === 'pillar');

    // The boss takes the closest living hero (hysteresis so two equal heroes do not flip it): autos, its walk and B.target.
    f.tank = function () {
      const al = this.alive(), b = this.boss;
      if (!al.length) { b.on = null; return null; }
      let best = null, bd = Infinity, cur = null, cd = 0;
      for (const p of al) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (p.id === b.on) { cur = p; cd = d; } if (d < bd) { bd = d; best = p; } }
      if (cur && cd <= bd + 30) best = cur;
      b.on = best.id;
      return best;
    };
    f.ticker(() => { const p = closest(); if (p) B.target = p.id; });

    // --- the room's events ---------------------------------------------------------------------------------------------------------
    const hand = (blade, light) => f.emit({ t: 'roomev', k: 'hdhand', blade, light, dur: 9999 });
    const halves = s => f.emit({ t: 'roomev', k: 'hdhalves', blade: s, dur: 9999 });
    const gaps = () => f.emit({ t: 'roomev', k: 'hdgaps', n: sh.n, dur: 9999 });
    const pctHit = (p, name, kind) => f.damagePlayer(p, 0, { kind, pct: PCT, avoidable: true, n: name });
    const freezeAll = ids => { for (const id of ids) f.freeze(id, 2); };
    const thawAll = () => { for (const p of f.alive()) f.thaw(p.id); };

    // --- pillars -------------------------------------------------------------------------------------------------------------------
    const placePillar = (x, y) => {
      const R = ARENA.r - 50;
      let px = x, py = y; const d = Math.hypot(px, py);
      if (d > R) { px *= R / d; py *= R / d; }
      for (let k = 0; k < 8; k++) {   // (clear of the boss's body and of other pillars)
        const near = pillars().find(q => Math.hypot(q.x - px, q.y - py) < 80) || (Math.hypot(px - B.x, py - B.y) < 115 ? B : null);
        if (!near) break;
        const a = Math.atan2(py - near.y, px - near.x);
        px = near.x + Math.cos(a) * (near === B ? 120 : 90); py = near.y + Math.sin(a) * (near === B ? 120 : 90);
        const dd = Math.hypot(px, py); if (dd > R) { px *= R / dd; py *= R / dd; }
      }
      return f.addProp({ kind: 'pillar', x: Math.round(px), y: Math.round(py), r: 34, hp: 1, solid: true, cover: true, rubble: false });
    };
    // where a DPS bot should stand to be the farthest: about 220 px from the boss on the side away from most of the party, clear of standing pillars
    const wantSpot = () => {
      const al = f.alive();
      let cx = 0, cy = 0; for (const p of al) { cx += p.x; cy += p.y; }
      if (al.length) { cx /= al.length; cy /= al.length; }
      const a0 = al.length ? Math.atan2(B.y - cy, B.x - cx) : 0;
      for (let k = 0; k < 13; k++) {
        const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5;
        let x = B.x + Math.cos(a) * 220, y = B.y + Math.sin(a) * 220; const d = Math.hypot(x, y), R = ARENA.r - 90;
        if (d > R) { x *= R / d; y *= R / d; }
        if (!pillars().some(q => Math.hypot(q.x - x, q.y - y) < 90)) return { x: Math.round(x), y: Math.round(y) };
      }
      return { x: Math.round(B.x + 220), y: Math.round(B.y) };
    };
    const SEED = Array.from({ length: 6 }, (_, k) => { const a = (15 + 60 * k) * Math.PI / 180; return [Math.round(Math.cos(a) * 300), Math.round(Math.sin(a) * 300)]; });
    const seed = n => { for (let i = 0; i < n; i++) f.addProp({ kind: 'pillar', x: SEED[i][0], y: SEED[i][1], r: 34, hp: 1, solid: true, cover: true, rubble: false }); sh.n = n; if (n) gaps(); };

    // --- shared mechanics ----------------------------------------------------------------------------------------------------------
    // a light move out of one spot: the whole floor, pillars cutting shadows; the healer is always hit (src is where they stood at the cast)
    const lightWave = (h, delay, tag, name, opts) => {
      const src = { x: h.x, y: h.y };
      return f.mech(Object.assign({ type: 'raidwide', shape: { kind: 'circle', x: src.x, y: src.y, r: ARENA.r + 60 }, delay, hidden: true, tag, from: name, cover: true, src,
        onResolve: (inside, hits) => { const hh = live(h.id); if (hh && !hits.includes(hh.id)) f.damagePlayer(hh, opts.dmg || 0, { kind: tag, pct: opts.pct, avoidable: false, n: name }); } }, opts));
    };
    // a guard ring beside a hero (it follows them, 60 px to their side, until half a second before it lands)
    const guardRing = (h, delay, pct, onResolve) => {
      const off = p => { const a = Math.atan2(p.y - B.y, p.x - B.x) + Math.PI / 2; return { x: Math.round(p.x + Math.cos(a) * 60), y: Math.round(p.y + Math.sin(a) * 60) }; };
      const o0 = off(h);
      const m = f.mech({ type: 'guard', shape: { kind: 'circle', x: o0.x, y: o0.y, r: 56 }, delay, target: h.id, pct, tag: 'hdGuard', need: 1, avoidable: false, onResolve });
      let last = 0;
      m.tick = mm => {
        if (f.t >= mm.resolveAt - 0.5) return;
        const hh = live(h.id); if (!hh) return;
        const o = off(hh); mm.shape.x = o.x; mm.shape.y = o.y;
        if (f.t - last >= 0.1) { last = f.t; f.emit({ t: 'tgmod', id: mm.id, shape: { kind: 'circle', x: o.x, y: o.y, r: 56 } }); }
      };
      return m;
    };

    // --- plain moves ---------------------------------------------------------------------------------------------------------------
    const hollowStep = () => {
      const t = closest(); if (!t) return;
      f.cast('Hollow Step', 0.68, 'strike');
      face(t.x, t.y);
      if (distB(t) > 150) { const a = Math.atan2(t.y - B.y, t.x - B.x); f.moveBoss(t.x - Math.cos(a) * 100, t.y - Math.sin(a) * 100, 800); }
      const swing = () => {
        const q = closest(); if (!q || distB(q) > 260) return;
        f.emit({ t: 'banim', name: 'auto', dur: 0.5 });
        f.damagePlayer(q, f.def.autoDmg[f.mode], { kind: 'auto', n: 'Hollow Step' });
        B.autoAt = Math.max(B.autoAt, f.t + 1.6);
      };
      f.afterKeep(0.68, swing); f.afterKeep(1.1, swing);
    };
    const coldBreath = () => {
      const t = closest(); if (!t) return;
      f.cast('Cold Breath', 1.19, 'cast');
      face(t.x, t.y);
      f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 0.9, angle: Math.atan2(t.y - B.y, t.x - B.x) }, delay: 1.19, pct: 0.3, aimFromBoss: t.id, lockAt: 0.45, tag: 'hdBreath' });
    };
    const frostfall = () => {
      f.cast('Frostfall', 1.36, 'cast');
      for (const p of farthest(3)) f.mech({ type: 'aoe', shape: { kind: 'circle', x: p.x, y: p.y, r: 90 }, delay: 1.36, dmg: dmg.light, follow: p.id, lockAt: 0.5, tag: 'hdFall' });
    };
    // Wingbeat: everyone thrown 230 px away from the boss; stopped short by a wall or a pillar it is a slam (and a short daze)
    const wingbeat = () => {
      f.cast('Wingbeat', 1.4, 'cast');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 1.4, dmg: 0, hidden: true, avoidable: false, tag: 'hdWingbeat',
        onResolve: () => { for (const p of f.alive()) f.knock(p, B.x, B.y, 230, { slam: dmg.light, daze: 0.6 }); } });
    };
    const plainSet = (n, first) => {
      const list = [[first, hollowStep, 'Hollow Step'], [4.6, coldBreath, 'Cold Breath'], [4.6, frostfall, 'Frostfall']];
      if (n >= 2) list.push([4.6, wingbeat, 'Wingbeat']);
      return list;
    };

    // --- Broken Halo: a shard at the farthest hero, a pillar where it lands ----------------------------------------------------------
    // o: when the pattern part begins; castL: when the shard is thrown (the target is the farthest hero then, and the circle stays where they stood)
    const halo = (o, castL = 1.8, first = true) => {
      if (first) at(o, () => hand(1, 1));
      at(o + Math.max(0, castL - 2.4), () => { f.room.pillarWant = wantSpot(); });
      at(o + castL, () => {
        const t = farthest(1)[0]; if (!t) return;
        const x = Math.round(t.x), y = Math.round(t.y);
        sh.n = Math.min(6, sh.n + 1);
        face(x, y);
        f.cast('Broken Halo', 2.0, 'cast');
        f.emit({ t: 'roomev', k: 'hdshard', x, y, land: 2, dur: 2.5 });
        gaps();
        f.mech({ type: 'aoe', shape: { kind: 'circle', x, y, r: 70 }, delay: 2.0, dmg: dmg.light, tag: 'hdShard',
          onResolve: inside => { for (const p of inside) f.knock(p, x, y, 80); placePillar(x, y); delete f.room.pillarWant; } });
      }, 'Broken Halo');
    };

    // --- Returning Edge: the thrown blade buries itself in the wall; its way back is a curve of circles ------------------------------
    const returnCurve = (W, delay) => {
      const E = { x: B.x, y: B.y }, mx = (W.x + E.x) / 2, my = (W.y + E.y) / 2, dx = E.x - W.x, dy = E.y - W.y, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L, bend = 0.45 * L;
      let side = 1;
      if (Math.hypot(mx - nx * bend, my - ny * bend) < Math.hypot(mx + nx * bend, my + ny * bend)) side = -1;
      const C = { x: mx + nx * bend * side, y: my + ny * bend * side };
      const group = new Set(), n = Math.max(8, Math.round(L * 1.15 / 46));
      for (let i = 0; i <= n; i++) {
        const q = i / n, u = 1 - q;
        const x = u * u * W.x + 2 * u * q * C.x + q * q * E.x, y = u * u * W.y + 2 * u * q * C.y + q * q * E.y;
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(x), y: Math.round(y), r: 60 }, delay, dmg: dmg.fixed, tag: 'hdReturn', group });
      }
    };
    const edge = o => {
      at(o, () => hand(1, 0));
      at(o + 0.4, () => {
        const t = dpsPick(0); if (!t) return;
        face(t.x, t.y);
        f.cast('Returning Edge', 2.0, 'cast');
        f.bladeLine({ to: t, delay: 2.0, lock: 0.6, tag: 'hdLine', pct: PCT, freeze: 2, stop: 'none', shatter: true,
          onResolve: (hit, stopAt) => {
            const d = Math.hypot(stopAt.x, stopAt.y) || 1, W = { x: stopAt.x * (d - 18) / d, y: stopAt.y * (d - 18) / d };
            f.afterKeep(0.4, () => { f.cast('Return', 2.0, 'cast'); returnCurve(W, 2.0); }, 'Return');
          } });
      }, 'Returning Edge');
      at(o + 4.8, () => hand(0, 0));
    };

    // --- Radiance: six rays out of the healer, cover from the pillars --------------------------------------------------------------
    const rayShape = (h, ang) => { const x = h.x + Math.cos(ang) * 50, y = h.y + Math.sin(ang) * 50; return { kind: 'rect', x: Math.round(x), y: Math.round(y), angle: ang, len: Math.round(f.wallDist(x, y, ang)), w: 80 }; };
    const radiance = o => {
      at(o, () => hand(0, 1));
      at(o + 0.4, () => { const h = healPick(); if (!h) return; f.emit({ t: 'roomev', k: 'hdglow', id: h.id, dur: 4.6 }); f.cast('Radiance', 4.5, 'cast'); }, 'Radiance');
      at(o + 2.3, () => {
        const h = healPick(); if (!h) return;
        const group = new Set();
        for (let i = 0; i < 6; i++) {
          const ang = -Math.PI / 2 + i * Math.PI / 3;
          const m = f.mech({ type: 'aoe', shape: rayShape(h, ang), delay: 2.6, pct: PCT, tag: 'hdRay', cover: true, src: { x: h.x, y: h.y }, group });
          let last = 0;
          m.tick = mm => {   // (the ray stays on the healer until a second before it lands; the cover point goes with it)
            if (f.t >= mm.resolveAt - 1.0) return;
            const hh = live(h.id); if (!hh) return;
            const s = rayShape(hh, ang);
            if (Math.abs(s.x - mm.shape.x) + Math.abs(s.y - mm.shape.y) < 2) return;
            Object.assign(mm.shape, s); mm.src.x = hh.x; mm.src.y = hh.y;
            if (f.t - last >= 0.1) { last = f.t; f.emit({ t: 'tgmod', id: mm.id, shape: s }); }
          };
        }
      });
      at(o + 5.1, () => {
        const h = healPick(); if (!h) return;
        f.cast('Afterglow', 1.2, 'cast');
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 80 }, delay: 1.2, dmg: dmg.fixed, follow: h.id, lockAt: 0.3, tag: 'hdAfterglow' });
      });
      at(o + 6.3, () => hand(0, 0));
    };

    // --- Wingfall: three dives from the edge, then Ash Landing where the last one ended -----------------------------------------------
    const wingfall = o => {
      let landing = null;
      const R = ARENA.r - 110;
      at(o, () => hand(1, 0));
      at(o + 0.4, () => { B.hover = 1; f.cast('Wingfall', 7.4, 'cast'); }, 'Wingfall');
      [0.4, 2.4, 4.4].forEach((L, i) => at(o + L, () => {
        const t = i === 0 ? dpsPick(0) : i === 1 ? dpsPick(1) : healPick(); if (!t) return;
        const a = Math.atan2(t.y, t.x) + Math.PI, src = { x: Math.round(Math.cos(a) * R), y: Math.round(Math.sin(a) * R) };
        f.moveBoss(src.x, src.y, 1800); face(t.x, t.y);
        f.bladeLine({ src, to: t, delay: 2.6, lock: 0.8, tag: 'hdDive', pct: PCT, freeze: 8, stop: 'tank', shatter: true,
          onResolve: (hit, stopAt) => { if (i === 2) { const last = hit[hit.length - 1]; landing = last ? { x: last.x, y: last.y } : { x: stopAt.x, y: stopAt.y }; } } });
      }));
      at(o + 7.2, () => {
        const c = landing || { x: B.x, y: B.y };
        f.moveBoss(c.x, c.y, 1800);
        f.cast('Ash Landing', 1.4, 'cast');
        f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(c.x), y: Math.round(c.y), r: 140 }, delay: 1.4, dmg: dmg.fixed, tag: 'hdAsh', onResolve: () => { B.hover = 0; thawAll(); } });
      }, 'Ash Landing');
      at(o + 8.8, () => hand(0, 0));
    };

    // --- Following Light: a slow light toward the healer leaving frost; it flares where it stops ------------------------------------
    const light = { on: false, m: null, x: 0, y: 0, nextPatch: 0, tgAt: 0 };
    f.ticker(dt => {
      if (!light.on || !light.m) return;
      const h = healPick();
      if (h) { const dx = h.x - light.x, dy = h.y - light.y, d = Math.hypot(dx, dy); if (d > 2) { const s = Math.min(d, 60 * dt); light.x += dx / d * s; light.y += dy / d * s; } }
      light.m.shape.x = light.x; light.m.shape.y = light.y;
      if (f.t - light.tgAt >= 0.1) { light.tgAt = f.t; f.emit({ t: 'tgmod', id: light.m.id, shape: { kind: 'circle', x: Math.round(light.x), y: Math.round(light.y), r: 50 } }); }
      if (f.t >= light.nextPatch) {
        light.nextPatch = f.t + 0.6;
        f.zone({ shape: { kind: 'circle', x: Math.round(light.x), y: Math.round(light.y), r: 55 }, effect: 'burn', dmg: dmg.patch, tag: 'hdPatch', dur: 9999 });
      }
    });
    const following = o => {
      at(o, () => hand(0, 1));
      at(o + 0.4, () => f.cast('Following Light', 8.8, 'cast'), 'Following Light');
      at(o + 0.6, () => {
        face(B.x, B.y);
        light.x = B.x; light.y = B.y; light.on = true; light.nextPatch = f.t + 0.3;
        light.m = f.mech({ type: 'drop', shape: { kind: 'circle', x: Math.round(B.x), y: Math.round(B.y), r: 50 }, delay: 8.4, dmg: 0, avoidable: false, tag: 'hdFollow',
          onResolve: () => {
            light.on = false;
            const x = Math.round(light.x), y = Math.round(light.y);
            f.mech({ type: 'aoe', shape: { kind: 'circle', x, y, r: 120 }, delay: 0.7, pct: PCT, tag: 'hdFlare', from: 'Following Light' });
          } });
      });
      at(o + 9.7, () => hand(0, 0));
    };

    // --- Benediction: a column on the healer; only a pillar between you and the healer saves you -----------------------------------
    const benediction = o => {
      at(o, () => hand(0, 1));
      at(o + 0.4, () => {
        const h = healPick(); if (!h) return;
        f.emit({ t: 'roomev', k: 'hdcolumn', id: h.id, dur: 3.6 });
        f.cast('Benediction', 3.4, 'cast');
        lightWave(h, 3.4, 'hdBenediction', 'Benediction', { pct: PCT });
      }, 'Benediction');
      at(o + 4.0, () => {
        const h = healPick(); if (!h) return;
        f.cast('Absolution', 1.8, 'cast');
        lightWave(h, 1.8, 'hdAbsolve', 'Absolution', { dmg: dmg.fixed });
      }, 'Absolution');
      at(o + 5.8, () => hand(0, 0));
    };

    // --- The Scales: DPS cross to the light, the healer to the blade, the tank anywhere -------------------------------------------------
    const half = (left, tag, delay, onResolve) => {
      const R = ARENA.r + 40;
      return f.mech({ type: 'aoe', shape: { kind: 'rect', x: left ? -R : 0, y: 0, angle: 0, len: R, w: 2 * R + 40 }, delay, dmg: 0, avoidable: false, tag, onResolve });
    };
    const scalesRound = (bladeLeft, name) => {
      f.cast(name, 3.0, 'cast');
      half(bladeLeft, 'hdBladeHalf', 3.0, inside => { for (const p of inside) if (p.role === 'dps') { pctHit(p, 'The Scales', 'hdBladeHalf'); f.freeze(p.id, 2); } });
      half(!bladeLeft, 'hdLightHalf', 3.0, inside => { for (const p of inside) if (p.role === 'healer') pctHit(p, 'The Scales', 'hdLightHalf'); });
    };
    const scales = o => {
      at(o, () => hand(1, 1));
      at(o + 0.4, () => { halves(-1); scalesRound(true, 'The Scales'); }, 'The Scales');
      at(o + 4.0, () => { halves(1); scalesRound(false, 'The Scales'); }, 'The Scales');
      at(o + 7.2, () => {
        f.cast('Weighing', 1.1, 'cast');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 1.1, dmg: dmg.fixed, hidden: true, tag: 'hdWeigh', onResolve: () => thawAll() });
      }, 'Weighing');
      at(o + 8.3, () => { halves(0); hand(0, 0); });
    };

    // --- Last Rites: coffins on the healer and a DPS, a blade at the free DPS ------------------------------------------------------------
    const lastRites = o => {
      at(o, () => hand(1, 1));
      at(o + 0.4, () => f.cast('Last Rites', 1.0, 'cast'), 'Last Rites');
      at(o + 1.4, () => {
        const victims = [healPick(), dpsPick(0)].filter((p, i, a) => p && a.indexOf(p) === i);
        f.cast('Burial', 8.5, 'cast');
        for (const v of victims) {
          pctHit(v, 'Last Rites', 'hdCoffin');
          if (!f.coffin(v.id, { hp: 60000, dur: 9, name: 'Burial' })) continue;
          const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: v.x, y: v.y, r: 60 }, delay: 8.5, dmg: dmg.last, follow: v.id, lockAt: 0.3, avoidable: false, tag: 'hdBurial' });
          f.afterKeep(8.35, () => { if (!f.coffinOf(v.id)) f.cancel(m); });
        }
      }, 'Burial');
      at(o + 2.4, () => {
        const free = f.alive().find(p => p.role === 'dps' && !f.coffinOf(p.id)) || f.alive().find(p => p.role !== 'healer' && p.role !== 'tank' && !f.coffinOf(p.id));
        if (!free) return;
        face(free.x, free.y);
        f.bladeLine({ to: free, delay: 2.0, lock: 0.6, tag: 'hdLine', pct: PCT, freeze: 2, stop: 'tank' });
      });
      at(o + 9.9, () => hand(0, 0));
    };

    // --- Hollowing -----------------------------------------------------------------------------------------------------------------
    const hollowing = o => {
      at(o, () => hand(1, 1));
      at(o + 0.2, () => {
        f.cast('Hollowing', 2.2, 'cast');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2.2, pct: PCT, hidden: true, avoidable: false, tag: 'hdHollow' });
      }, 'Hollowing');
      at(o + 4.8, () => {
        f.cast('Hollow Echo', 2.6, 'cast');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2.6, dmg: dmg.fixed, hidden: true, tag: 'hdHollowEcho' });
      }, 'Hollow Echo');
      at(o + 7.4, () => hand(0, 0));
    };

    // --- Cold Sermon: a shadow thrown straight away from the boss by every standing pillar ------------------------------------------------
    const sermon = o => {
      let rects = [];
      at(o, () => hand(1, 1));
      at(o + 0.4, () => {
        rects = pillars().map(pr => { const a = Math.atan2(pr.y - B.y, pr.x - B.x); return { kind: 'rect', x: pr.x, y: pr.y, angle: +a.toFixed(3), len: Math.round(f.wallDist(pr.x, pr.y, a)), w: 90 }; });
        f.cast('Cold Sermon', 3.0, 'cast');
        for (const s of rects) f.mech({ type: 'aoe', shape: Object.assign({}, s), delay: 3.0, pct: PCT, tag: 'hdSermon', onResolve: (inside, hits) => freezeAll(hits) });
      }, 'Cold Sermon');
      at(o + 3.4, () => {
        f.cast('Frost Shadow', 1.5, 'cast');
        for (const s of rects) f.mech({ type: 'aoe', shape: Object.assign({}, s), delay: 1.5, dmg: dmg.fixed, tag: 'hdSermonEcho', onResolve: () => thawAll() });
        if (!rects.length) f.afterKeep(1.5, thawAll);
      }, 'Frost Shadow');
      at(o + 4.9, () => hand(0, 0));
    };

    // --- Six Wings: six beats 1.6 s apart (the Waltz grown), then The Unsaid ---------------------------------------------------------------
    const sixWings = (o, full) => {
      const beat = [
        () => { hand(1, 0); const t = dpsPick(0); if (!t) return; face(t.x, t.y);
          f.mech({ type: 'aoe', shape: { kind: 'cone', x: B.x, y: B.y, r: 340, arc: 0.8, angle: Math.atan2(t.y - B.y, t.x - B.x) }, delay: 1.6, pct: PCT, aimFromBoss: t.id, lockAt: 0.5, tag: 'hdCone', onResolve: (inside, hits) => { for (const id of hits) f.freeze(id, 1.2); } }); },
        () => { hand(0, 1); const h = healPick(); if (!h) return;
          f.mech({ type: 'aoe', shape: { kind: 'circle', x: h.x, y: h.y, r: 60 }, delay: 1.6, pct: PCT, follow: h.id, lockAt: 0.5, tag: 'hdCircle' }); },
        () => { hand(1, 0); const t = dpsPick(1); if (!t) return; face(t.x, t.y);
          f.bladeLine({ to: t, delay: 1.6, lock: 0.5, tag: 'hdLine', pct: PCT, freeze: 1.2, stop: 'tank', shatter: true }); },
        () => { hand(0, 1); const h = healPick(); if (!h) return;
          f.mech({ type: 'drop', shape: { kind: 'circle', x: h.x, y: h.y, r: 60 }, delay: 1.6, dmg: 0, follow: h.id, lockAt: 0.5, avoidable: false, tag: 'hdLantern' });
          guardRing(h, 1.6, PCT, () => f.emit({ t: 'roomev', k: 'hdbell', n: 1, dur: 2 })); },
        () => { hand(1, 1); f.mech({ type: 'aoe', shape: { kind: 'donut', x: B.x, y: B.y, r: 260, r2: 92 }, delay: 1.6, dmg: dmg.light, tag: 'hdRing' }); },
        () => { hand(1, 1); wingbeat(); },
      ];
      beat.forEach((fn, i) => at(o + 0.4 + i * 1.6, () => {
        f.emit({ t: 'roomev', k: 'hdwing', n: i + 1, dur: 1.6 });
        if (i < 5) f.cast('Six Wings', 1.6, 'cast');
        fn();
      }, i === 0 ? 'Six Wings' : null));
      if (!full) { at(o + 9.8, () => hand(0, 0)); return; }
      at(o + 10.0, () => {
        f.cast('The Unsaid', 2.6, 'cast');
        f.mech({ type: 'raidwide', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: 2.6, dmg: dmg.last, hidden: true, tag: 'hdVerdict' });
        for (const pr of pillars()) f.mech({ type: 'aoe', shape: { kind: 'circle', x: pr.x, y: pr.y, r: 120 }, delay: 2.6, dmg: dmg.fixed, tag: 'hdPillarBurst', onResolve: () => f.breakProp(pr, 'burst') });
      }, 'The Unsaid');
      at(o + 12.6, () => hand(0, 0));
    };

    // --- windows ---------------------------------------------------------------------------------------------------------------------
    // the window turns: what the old one had laid is cut, the room is cleared of its leavings
    const openWindow = n => {
      era++;
      f.events = f.events.filter(e => !(e.keep && e.fn && e.fn.era !== undefined && e.fn.era < era));
      hand(0, 0); halves(0);
      B.hover = 0; B.lockFacing = false; B.holdUntil = 0;
      light.on = false; if (light.m) { f.cancel(light.m); light.m = null; }
      delete f.room.pillarWant;
      f.clearZones();
      for (const p of f.alive()) { f.breakCoffin(p.id); f.thaw(p.id); }
      if (f.skipTo && f.skipTo === n && f.t < 1) seed(SHARDS_BEFORE[n - 1]);   // (a practice start: the pillars the earlier windows would have left)
    };
    const WIN = [
      { name: 'Broken Halo', len: 9.0, run: () => { halo(0); edge(4.2); } },
      { name: 'Radiance', len: 6.3, run: () => radiance(0) },
      { name: 'Wingfall', len: 8.8, run: () => wingfall(0) },
      { name: 'Broken Halo', len: 13.9, run: () => { halo(0); following(4.2); } },
      { name: 'Benediction', len: 5.8, run: () => benediction(0) },
      { name: 'Broken Halo', len: 12.5, run: () => { halo(0); scales(4.2); } },
      { name: 'Last Rites', len: 9.9, run: () => lastRites(0) },
      { name: 'Broken Halo', len: 15.2, run: () => { halo(0); halo(0, 5.4, false); hollowing(7.8); } },
      { name: 'Broken Halo', len: 9.1, run: () => { halo(0); at(3.8, () => { sh.n = 6; gaps(); }); sermon(4.2); } },
      { name: 'Six Wings', len: 12.6, run: () => sixWings(0, true) },
    ];
    const winCourse = (n, from) => {
      const w = WIN[n - 1], last = n === 10;
      const first = n === 1 ? 3.6 : 0.6;
      const o = {
        onStart: () => openWindow(n),
        sets: [[[first, () => w.run(), w.name]], plainSet(n, w.len + 1.2)],
        closing: plainSet(n, 4.6),
      };
      if (last) {
        o.sets = [[[first, () => w.run(), w.name]], plainSet(n, w.len + 1.2)];
        o.closing = [[4.6, () => sixWings(0, false), 'Six Wings'], [10.6, hollowStep, 'Hollow Step'], [4.6, coldBreath, 'Cold Breath'], [4.6, frostfall, 'Frostfall'], [4.6, wingbeat, 'Wingbeat']];
      } else { o.until = GATE[n - 1]; o.push = true; o.next = t => winCourse(n + 1, t); }
      return f.course(o, from);
    };

    // --- the kill: the wings fold and it lies down in the snow ------------------------------------------------------------------------------
    f.onFell = () => {
      f.events = [];
      f.mechs.clear(); f.emit({ t: 'tgclear' });
      f.puddles = []; light.on = false; f.clearZones(); f.clearAdds();
      hand(0, 0); halves(0);
      B.hover = 0; B.lockFacing = false; B.moveTo = null; B.noAutoUntil = f.t + 99;
      if (B.cast) f.emit({ t: 'bcastend', name: B.cast.name, ok: 0 });
      B.cast = null;
      thawAll();
      f.emit({ t: 'roomev', k: 'hdlie', dur: 5 });
      f.afterKeep(5, () => f.end('clear'));
    };

    f.emit({ t: 'roomev', k: 'hdopen', gate: 2, dur: 4 });
    winCourse(1, 0);
    f.moves = { hollowStep, coldBreath, frostfall, wingbeat, halo, edge, radiance, wingfall, following, benediction, scales, lastRites, hollowing, sermon, sixWings, placePillar, seed };
  },
};
if (typeof module !== 'undefined') module.exports = { SERAPH };
