// The gallery's in-page runner. The game scripts are loaded as they are in the game (index.html order, minus the UI and
// network layer); this file stages each effect the way the arena draws it (arena floor, telegraphs, FX/VFX layers,
// heroes and the boss y-sorted, screen flashes) and steps time at a fixed 60 Hz.
//
// Every effect is run twice with the same seed: a probe pass (every frame drawn small, counting canvas calls, NaN
// arguments, particles, effects, and how long it all stays alive) that picks the frame times, then a full-size pass
// that keeps the frames. Gallery.run(job) returns { pages: [png base64...], summary }.
(() => {
  const H = window.__H;
  const DT = 1 / 60;
  const MAXT = 30;          // no effect is followed past this many seconds
  const LINGER = 3;         // alive this long past its declared duration is a leak
  const VI = () => window.__vfxInternals || null;
  const TAU2 = Math.PI * 2;
  const FONT = '600 12px "Segoe UI", system-ui, sans-serif', FONT_B = '700 14px "Segoe UI", system-ui, sans-serif', FONT_S = '11px "Segoe UI", system-ui, sans-serif';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const newSt = (phase = 0) => ({ t: 0, moving: false, action: null, phase, props: {} });
  const clsById = id => CLASSES.find(c => c.id === id);
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const Gallery = window.Gallery = { ready: false };
  const loadWarns = H.warns.splice(0);
  Gallery.loadReport = () => ({ errors: H.loadErrors.concat(loadWarns).map(e => e.msg + ' @' + e.at), vfxInternals: !!VI() });

  // ================================================================== the stage: a slice of a raid as the arena draws it
  function makeStage(job) {
    const S = {
      zoom: job.zoom, units: [], byId: new Map(), boss: null, bossDef: null, floorId: null, room: null,
      cam: null, screen: { flash: null, dim: null }, punch: null, hitStopUntil: -9, vclock: 0, now: 0,
      tele: false, teleTgs: null, raid: null, extraDraw: null, dash: null,
    };
    S.entById = id => (id === 'boss' ? S.boss : S.byId.get(id) || (S.raid && S.raid.adds.get(id)) || null);
    S.addUnit = (id, clsId, spec, x, y, a) => {
      const e = { id, kind: 'player', cls: clsById(clsId), spec: spec || null, x, y, angle: a || 0, st: newSt(id * 0.37), lift: 0, mine: id === 1000 };
      S.units.push(e); S.byId.set(id, e); return e;
    };
    S.setBoss = (bossId, x, y, f) => {
      S.bossDef = BOSSES.find(b => b.id === bossId);
      S.boss = { id: 'boss', x, y, f, angle: f, st: newSt(), fade: 1 };
    };
    // the camera's screen moments (main.js screenFlash / screenDim / zoomPunch / hitStop)
    S.cam = {
      flash(color = '#ffffff', alpha = 0.35, dur = 0.3) { S.screen.flash = { color, alpha: 0.1 * (1 - Math.exp(-Math.max(0, alpha) / 0.1)), dur, t0: S.now }; },   // (main.js screenFlash's soft cap)
      dim(alpha = 0.35, dur = 0.8) { S.screen.dim = { color: '#05030a', alpha: Math.min(0.26, alpha * 0.6), dur: Math.min(0.8, dur * 0.55), t0: S.now }; },
      punch(amount = 0.06, dur = 0.5) { S.punch = { a: Math.min(0.15, amount), dur, t0: S.now }; },
      stop(dur = 0.1) { S.hitStopUntil = Math.max(S.hitStopUntil, S.now + Math.min(0.2, dur)); },
    };
    S.punchNow = () => {
      const p = S.punch; if (!p) return 0;
      const q = (S.now - p.t0) / p.dur; if (q >= 1) return 0;
      return p.a * (q < 0.18 ? easeOut(q / 0.18) : 1 - easeOut((q - 0.18) / 0.82));
    };
    return S;
  }

  // the frame: world (cx, cy) at its centre, fw x fh world px at the camera zoom
  function frameTransform(ctx, S, view, scale) {
    const z = S.zoom * scale * (1 + S.punchNow());
    const hero = S.units[0], px = S.punch && hero ? hero.x : view.cx, py = S.punch && hero ? hero.y : view.cy;
    // (a camera punch pushes in toward your hero, as zoomPunch does)
    const k = 1 + S.punchNow(), cx = px + (view.cx - px) / k, cy = py + (view.cy - py) / k;
    ctx.setTransform(z, 0, 0, z, view.fw * S.zoom * scale / 2 - cx * z, view.fh * S.zoom * scale / 2 - cy * z);
  }

  function screenFx(ctx, S, kind, w, h) {
    const f = S.screen[kind];
    if (!f) return;
    const age = S.now - f.t0, q = age / f.dur;
    if (q >= 1) { S.screen[kind] = null; return; }
    const a = f.alpha * (kind === 'dim' ? Math.min(1, age / 0.1) * Math.min(1, (1 - q) / 0.45) : (1 - q) * (1 - q));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = kind === 'flash' ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = f.color; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // effect layers are what gets counted (canvas calls, NaN arguments); the stage around them is not
  function counted(fn) { H.counting = true; try { fn(); } finally { H.counting = false; } }

  // a red danger circle and a blue stack marker drawn under the aftermath frames (are they still readable under it?)
  function teleTgs(S, at) {
    const hero = S.units[0], b = S.boss;
    const tgs = new Map();
    tgs.set(-1, { id: -1, type: 'aoe', start: at - 2.4, dur: 4, live: { kind: 'circle', x: (hero.x + b.x) / 2 + 40, y: (hero.y + b.y) / 2, r: 95 } });
    tgs.set(-2, { id: -2, type: 'stack', start: at - 2.4, dur: 4, live: { kind: 'circle', x: hero.x - 30, y: hero.y + 10, r: 70 } });
    return tgs;
  }

  // draws one frame of a class stage
  function drawClassStage(ctx, S, view, scale) {
    const now = S.now;
    frameTransform(ctx, S, view, scale);
    if (!S.lite) ArenaView.drawFloor(ctx, S.floorId, Math.min(1.5, S.zoom * scale));
    if (S.tele && !S.lite) ArenaView.drawTelegraphs(ctx, S.teleTgs, now, null);
    if (!S.lite) ArenaView.drawBossRing(ctx, { x: S.boss.x, y: S.boss.y, f: S.boss.f });
    counted(() => { FX.draw(ctx, true); VFX.draw(ctx, 'ground'); });
    const scEnv = { entById: S.entById, me: 1000, boss: S.boss, units: S.units };
    counted(() => Stagecraft.drawFloor(ctx, now, scEnv));
    const all = [...S.units.map(u => ({ y: u.y, u })), { y: S.boss.y, boss: true }, ...Stagecraft.entities(now, scEnv)].sort((a, b) => a.y - b.y);
    for (const e of all) { if (S.lite && e.kind !== 'stagecraft') continue;
      if (e.boss) drawBoss(ctx, S.bossDef, S.boss.x, S.boss.y, S.boss.f, S.boss.st, 1.3);
      else if (e.kind === 'stagecraft') counted(() => e.draw(ctx));
      else drawHero(ctx, e.u.cls, e.u.x, e.u.y, e.u.angle, e.u.st, 1.85, { lift: e.u.lift, spec: e.u.spec });
    }
    counted(() => Stagecraft.drawOver(ctx, now, scEnv));
    screenFx(ctx, S, 'dim', view.fw * S.zoom * scale, view.fh * S.zoom * scale);
    frameTransform(ctx, S, view, scale);
    counted(() => { FX.draw(ctx, false); VFX.draw(ctx, 'air'); });
    screenFx(ctx, S, 'flash', view.fw * S.zoom * scale, view.fh * S.zoom * scale);
  }

  // ================================================================== running one effect
  // row: { name, kind, note, plan(S) -> [[t, fn]...], impact?, times?(endT) }
  function runRow(row, S, view, opts) {
    const probe = !opts.snaps;
    const scale = probe ? 0.25 : 1;
    const cv = opts.canvas;
    cv.width = Math.max(1, Math.round(view.fw * S.zoom * scale)); cv.height = Math.max(1, Math.round(view.fh * S.zoom * scale));
    const ctx = cv.getContext('2d');
    // reset the world
    VFX.clear(); FX.clear(); FX.shake = 0; VFX.setScale(1); VFX.mute(false); FX.muted = false;
    H.reseed(hash(row.name)); H.time = 0; S.now = 0; S.vclock = 0; FX.now = 0; VFX.update(0, 0);
    S.screen = { flash: null, dim: null }; S.punch = null; S.hitStopUntil = -9; S.dash = null; S.tele = false;
    S.reset && S.reset();
    const errs = [], nan0 = H.nan.length, warn0 = H.warns.length;
    const safe = (fn, what) => { try { fn(); } catch (e) { if (errs.length < 6) errs.push(what + ': ' + e.message + ' @' + H.where(e.stack)); } };
    let plan = [];
    safe(() => { plan = row.plan(S).sort((a, b) => a[0] - b[0]); }, 'setup');
    FX.me = S.units[0]; FX.cam = S.cam; FX.heroScale = 1.85;
    const lastTrigger = plan.length ? plan[plan.length - 1][0] : 0;
    const rec = { calls: [], parts: [], effs: [] };
    let declEnd = lastTrigger, peakParts = 0, peakCalls = 0, totalCalls = 0, peakEffs = 0, endT = null, leak = null, badDur = null;
    const shots = [];
    let si = 0, pi = 0;
    const snaps = opts.snaps || [];
    const stopAt = probe ? MAXT : (snaps.length ? snaps[snaps.length - 1] + DT / 2 : 0);
    for (let f = 0; ; f++) {
      const now = f * DT;
      if (now > stopAt + 1e-9) break;
      H.time = now; S.now = now;
      while (pi < plan.length && plan[pi][0] <= now + 1e-9) { const p = plan[pi++]; safe(p[1], 'trigger'); }
      if (f > 0) {
        safe(() => FX.update(now, DT), 'FX.update');
        const vdt = now < S.hitStopUntil ? DT * 0.08 : DT;
        S.vclock += vdt;
        safe(() => VFX.update(S.vclock, vdt), 'VFX.update');
      }
      S.tick && safe(() => S.tick(now, DT), 'stage');
      for (const u of S.units) u.st.t = now;
      if (S.boss) S.boss.st.t = now;
      if (S.declared) declEnd = Math.max(declEnd, S.declared());
      if (opts.teleAt != null) S.tele = now >= opts.teleAt - 1e-9;
      // what is declared to be alive, and what is
      const vi = VI();
      if (vi) for (const e of vi.effects) { const end = e.t0 + e.dur; if (!Number.isFinite(end)) badDur = badDur || 'an effect with a non-finite duration (' + e.dur + ')'; else declEnd = Math.max(declEnd, end); }
      for (const x of FX.list) if (Number.isFinite(x.t0 + x.dur)) declEnd = Math.max(declEnd, x.t0 + x.dur);
      for (const x of FX.pending) if (Number.isFinite(x.t)) declEnd = Math.max(declEnd, x.t);
      const parts = VFX.count, effs = vi ? vi.effects.length : 0, alive = parts + effs + FX.list.length + FX.pending.length + (S.busy ? S.busy() : 0);
      // draw (the probe draws every frame small; the keeping pass draws every frame up to its last shot)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      const c0 = H.calls;
      S.lite = probe || !(si < snaps.length && now >= snaps[si] - 1e-9);
      safe(() => S.draw(ctx, S, view, scale), 'draw');
      const calls = H.calls - c0;
      if (probe) {
        rec.calls.push(calls); rec.parts.push(parts); rec.effs.push(effs);
        peakParts = Math.max(peakParts, parts); peakCalls = Math.max(peakCalls, calls); peakEffs = Math.max(peakEffs, effs); totalCalls += calls;
        if (now > lastTrigger && alive === 0 && f > 0) { endT = now; break; }
        // (floor state the stage keeps on its own, a roller still rolling, isn't the effect's: only particles / effects /
        // FX items count as a leak)
        if (S.vclock > declEnd + LINGER + DT && parts + effs + FX.list.length + FX.pending.length === 0) { endT = now; break; }
        if (S.vclock > declEnd + LINGER + DT) { leak =`${parts} particles, ${effs} effects still alive ${(S.vclock - declEnd).toFixed(1)}s after the declared end (${declEnd.toFixed(2)}s)`; endT = now; break; }
      } else {
        while (si < snaps.length && now >= snaps[si] - 1e-9) {
          const shot = document.createElement('canvas'); shot.width = cv.width; shot.height = cv.height;
          shot.getContext('2d').drawImage(cv, 0, 0);
          shots.push({ cv: shot, t: snaps[si], parts, effs, calls });
          si++;
        }
      }
    }
    if (probe && endT == null) { endT = MAXT; if (declEnd < MAXT - LINGER) leak = 'still alive after ' + MAXT + 's'; }
    const nan = H.nan.slice(nan0), warns = H.warns.slice(warn0);
    return { errs, nan, warns, rec, endT, declEnd, leak, badDur, peakParts, peakCalls, peakEffs, totalCalls, shots };
  }

  // the frame times: windup, impact, mid, aftermath, end (from the probe; a row can name its own)
  function pickTimes(row, r) {
    const n = r.rec.calls.length, endT = Math.max(DT * 3, Math.min(r.endT, MAXT));
    const snap = t => Math.round(Math.max(DT, Math.min(endT, t)) / DT) * DT;
    let impact = row.impact;
    if (impact == null) {
      // the busiest frame (canvas calls, plus new particles) in the first part of its life
      let best = 0, bi = 0;
      const lim = Math.max(2, Math.min(n, Math.round(Math.min(endT * 0.75, 4) / DT)));
      for (let i = 1; i < lim; i++) { const s = r.rec.calls[i] + 4 * Math.max(0, r.rec.parts[i] - r.rec.parts[i - 1]); if (s > best) { best = s; bi = i; } }
      impact = bi * DT;
    }
    let ts;
    if (row.times) ts = row.times(impact, endT);
    else {
      const life = Math.max(0, endT - impact);
      ts = [impact > 0.2 ? impact * 0.5 : Math.min(impact, 0.05), impact, impact + Math.max(0.12, life * 0.18), impact + Math.max(0.3, life * 0.5), endT - Math.min(0.3, life * 0.12)];
      if (life < 0.35) ts = [Math.min(impact, 0.05), impact + 0.03, endT - 0.05];
    }
    const out = [];
    for (const t of ts.map(snap)) if (!out.length || t > out[out.length - 1] + DT / 2) out.push(t);
    return out.slice(0, 5);
  }
  const FRAME_NAMES = n => (n >= 5 ? ['windup', 'impact', 'mid', 'aftermath', 'end'] : n === 4 ? ['windup', 'impact', 'aftermath', 'end'] : n === 3 ? ['windup', 'impact', 'end'] : n === 2 ? ['start', 'end'] : ['frame']);

  // ================================================================== class rows
  function classRows(job, S) {
    const clsId = job.id, cls = clsById(clsId), kit = KITS[clsId];
    const hero = S.units[0], ally = S.units[1], boss = S.boss;
    const rows = [], seen = new Set();
    const specs = [null, ...((typeof SPECS !== 'undefined' && SPECS[clsId]) || []).map(s => s.id)];
    const recipes = (ABILITY_VFX && ABILITY_VFX[clsId]) || {};
    const castRow = (ab, spec, note) => {
      const vid = ab.fxId || ab.id, has = !!recipes[vid];
      const key = has ? vid : vid + '|' + JSON.stringify(ab.fx || null) + '|' + ab.anim;
      if (seen.has(key)) return;
      seen.add(key);
      const tgt = ab.target === 'ally' ? ally : ab.target === 'self' ? hero : boss;
      rows.push({
        name: (ab.name || vid) + ' [' + vid + ']', kind: ab.ult ? 'ultimate' : ab.ultOf ? 'ult move' : note || 'ability',
        note: (spec ? spec + ' · ' : '') + (has ? 'recipe' : ab.fx ? 'generic fx:' + (ab.fx.type || '?') : 'no visual') + (ab.anim ? ' · anim ' + ab.anim : ''),
        noVisual: !has && !ab.fx, spec,
        plan: S2 => [[0, () => { S2.units[0].spec = spec; S2.units[0].angle = Math.atan2(tgt.y - hero.y, tgt.x - hero.x); FX.cast(S2.units[0], ab, tgt.x, tgt.y, { mine: true, tent: ab.target === 'ally' ? ally : null }); }]],
      });
    };
    for (const spec of specs) {
      const k = typeof specKit === 'function' ? specKit(clsId, spec) : kit;
      if (!k) continue;
      for (const ab of k.abilities || []) castRow(ab, spec);
      for (const ab of k.moves || []) castRow(ab, spec, 'move');
      const u = k.ultimate;
      if (u) {
        castRow(u, spec);
        for (const o of Object.values((u.window && u.window.over) || {})) if (o.fxId) { const ab = ultAbilityById(k, o.fxId); if (ab) castRow(Object.assign({}, ab, { fxId: o.fxId, ultOf: u.id }), spec); }
      }
      if (typeof TALENT_ABILITIES !== 'undefined') for (const [tid, g] of Object.entries(TALENT_ABILITIES)) {
        if (!g || g.cls !== clsId) continue;
        if (g.ab) castRow(g.ab, null, 'talent move');
        if (spec && g.spec && g.spec[spec]) castRow(g.spec[spec], spec, 'talent move');
      }
      for (const ab of Object.values(k.talentAbilities || {})) castRow(ab, spec, 'talent move');
    }
    // recipes no ability points at
    for (const vid of Object.keys(recipes)) if (!seen.has(vid)) castRow({ id: vid, name: vid, anim: 'cast', target: 'enemy' }, null, 'recipe only');
    // the auto-attack (main.js playAuto)
    const auto = kit.auto && kit.auto.kind;
    if (auto && AUTO_VFX[auto]) rows.push({ name: 'auto-attack [' + auto + ']', kind: 'auto', note: 'AUTO_VFX.' + auto, plan: S2 => [[auto === 'spark' || auto === 'rune' ? 0.1 : auto === 'shot' ? 0.16 : 0.1, () => {
      const e = S2.units[0], ang = Math.atan2(boss.y - e.y, boss.x - e.x); e.angle = ang;
      VFX.setScale(0.85); try { AUTO_VFX[auto]({ ent: e, tx: boss.x, ty: boss.y, ang, alt: false, color: cls.accent, later: (d, f) => FX.later(d, () => { VFX.setScale(0.85); try { f(); } finally { VFX.setScale(1); } }) }); } finally { VFX.setScale(1); }
    }]] });
    // the dash (main.js doDash: KIT_VFX.dash, then afterimages while moving)
    rows.push({ name: 'dash', kind: 'dash', note: 'KIT_VFX.dash + FX.dashTrail', plan: S2 => [[0, () => {
      const e = S2.units[0], a = Math.atan2(ally.y - e.y, ally.x - e.x); e.angle = a;
      KIT_VFX.dash(e, cls.accent);
      S2.dash = { sx: e.x, sy: e.y, tx: e.x + Math.cos(a) * 170, ty: e.y + Math.sin(a) * 170, t0: S2.now, dur: 0.18 };
    }]] });
    if (typeof TAUNT_CARRY !== 'undefined' && TAUNT_CARRY[clsId] && KIT_VFX.taunt) rows.push({ name: 'taunt', kind: 'taunt', note: 'KIT_VFX.taunt (carried by ' + TAUNT_CARRY[clsId] + ')', plan: S2 => [[0, () => {
      const e = S2.units[0]; e.st.action = { type: 'big', t0: S2.now, dur: ANIM_DUR.big || 0.6 }; e.angle = Math.atan2(boss.y - e.y, boss.x - e.x);
      KIT_VFX.taunt(e, boss);
    }]] });
    for (const m of job.moments || []) rows.push(momentRow(m, S, job));
    return rows;
  }

  // a class moment (KIT_VFX[name]) aimed as main.js playKitFx aims it
  function momentRow(m, S, job) {
    const hero = S.units[0], boss = S.boss;
    const f = Object.prototype.hasOwnProperty.call(KIT_VFX, m.name) ? KIT_VFX[m.name] : null;
    const fev = !f && typeof CLASS_FEV !== 'undefined' && CLASS_FEV[m.name];
    const d = m.data;
    const dataTxt = d == null ? '' : ' ' + short(JSON.stringify(d), 46);
    return {
      name: m.name + dataTxt, kind: 'moment', note: (f ? 'KIT_VFX' : fev ? 'CLASS_FEV' : (job.mainHandled || []).includes(m.name) ? 'handled inside main.js only' : 'MISSING: no KIT_VFX entry') + ' · data from ' + (m.src || 'code') + (m.classes ? ' · ' + m.classes.join(',') : ''),
      missing: !f && !fev && !(job.mainHandled || []).includes(m.name),
      mainOnly: !f && !fev && (job.mainHandled || []).includes(m.name),
      plan: S2 => [[0, () => {
        const e = S2.units[0];
        if (fev) { CLASS_FEV[m.name](Object.assign({ k: m.name, id: e.id }, d || {}), e, { mine: true, tgs: new Map(), now: S2.now, boss }); return; }
        if (!f && (job.mainHandled || []).includes(m.name)) return;   // main.js's own (ultReadyCue...): can't be reached from here
        if (!f) throw new Error('KIT_VFX has no "' + m.name + '" (the kit emits it: ' + (m.src || 'code') + ')');
        let target = m.name === 'reflect' || m.name === 'dawnstar' || m.name === 'radiant' || m.name === 'echo' || f.atTarget ? boss : null;
        if (d && typeof d === 'object') {
          if (d.en != null) target = boss;
          else if (d.to != null) { const a = S2.entById(d.to); if (a) target = a; }
          if (!target && d.self) target = e;
        }
        e.angle = Math.atan2(boss.y - e.y, boss.x - e.x);
        f(e, target, d || null);
      }]],
    };
  }

  function setupClassStage(job) {
    const S = makeStage(job);
    const clsId = job.kind === 'class' ? job.id : 'bastion';
    const kit = KITS[clsId] || {};
    S.floorId = job.floor || 'grubnak';
    ARENA.use(S.floorId);
    S.setBoss(S.floorId, 0, -110, Math.PI / 2);
    // melee heroes stand at the boss, ranged ones back; three allies of other roles round them
    const melee = kit.auto && (kit.auto.range === 'melee' || kit.auto.range <= 120);
    const hx = melee ? -30 : -10, hy = melee ? -10 : 140;
    S.addUnit(1000, clsId, null, hx, hy, Math.atan2(-110 - hy, -hx));
    const others = ['cleric', 'ranger', 'bastion', 'pyromancer', 'grovekeeper'].filter(c => c !== clsId && clsById(c)).slice(0, 3);
    [[-180, 60], [150, 120], [-120, 205]].forEach(([x, y], i) => S.addUnit(1001 + i, others[i], null, x, y, Math.atan2(-110 - y, -x)));
    const home = S.units.map(u => [u.x, u.y, u.angle]);
    S.reset = () => {
      S.units.forEach((u, i) => { u.x = home[i][0]; u.y = home[i][1]; u.angle = home[i][2]; u.st = newSt(u.id * 0.37); u.spec = null; u.faceTo = null; });
      S.boss.st = newSt();
      // the classes-c stage: a Threadweaver's threads to two allies, a Marionettist's two Dolls by the boss
      if (typeof Stagecraft !== 'undefined') {
        Stagecraft.reset();
        if (clsId === 'threadweaver') Stagecraft.S.threads = [[1000, 1001, 1000], [1000, 1002, 1000]];
        if (clsId === 'marionettist') Stagecraft.setMine([{ x: -70, y: -40, st: 0 }, { x: 70, y: -30, st: 0 }], 'marionettist', { g: { strings: 3 }, def: {} });
        Stagecraft.S.env = { entById: S.entById, me: 1000, boss: S.boss, units: S.units };
      }
    };
    S.tick = (now) => {
      const d = S.dash, e = S.units[0];
      if (d) {
        const q = Math.min(1, (now - d.t0) / d.dur);
        e.x = d.sx + (d.tx - d.sx) * q; e.y = d.sy + (d.ty - d.sy) * q;
        FX.dashTrail(e, e.cls.accent);
        if (q >= 1) S.dash = null;
      }
    };
    S.busy = () => (S.dash ? 1 : 0);
    S.draw = drawClassStage;
    return S;
  }

  // ================================================================== boss rows: the host's messages replayed into the arena's view code
  function setupBossStage(job) {
    const S = makeStage(job);
    const bossId = job.id;
    S.floorId = bossId;
    ARENA.use(bossId);
    S.setBoss(bossId, 0, -40, Math.PI / 2);
    S.reset = () => {
      ARENA.use(bossId);
      S.units.length = 0; S.byId.clear();
      S.raid = { tgs: new Map(), rollers: new Map(), sweeps: new Map(), zones: new Map(), puddles: new Map(), tethers: new Map(), reels: new Map(), posts: new Map(),
        lunges: [], husks: [], knights: new Map(), doom: new Map(), pol: new Map(), adds: new Map(), lanterns: [], eggs: null, edgeWarn: null, night: false, mode: 'normal' };
      S.room = ArenaView.newRoom();
      if (typeof Stagecraft !== 'undefined') Stagecraft.reset();
      // his body's state (BOSS_VFX.drawBody: poses, flinch, enrage, entrance, fall) runs on the stage clock, new per row
      S.boss.show = null; S.boss.st = newSt(); S.props = {}; S.propsUntil = {};
      if (BOSS_VFX.setClock) BOSS_VFX.setClock(() => S.now);
    };
    S.applyCtx = (c) => {
      const R = S.raid;
      R.mode = c.mode;
      for (const [id, cl, spec, x, y, a] of c.units) S.addUnit(id, cl, spec, x, y, a);
      S.boss.x = c.boss.x; S.boss.y = c.boss.y; S.boss.f = c.boss.f; S.boss.tg = c.boss.tg;
      if (c.arena && ARENA.kind === 'circle' && c.arena.r) ARENA.resize(c.arena.r);
      if (c.props) { S.room.floorSynced = false; ArenaView.roomProps(S.room, c.props, 0); }
      if (c.adds) for (const [id, kind, x, y, hp, mx, enr, link, f] of c.adds.l || []) R.adds.set(id, { id, kind, x, y, hp, mx, enr, link, f: f || 0, st: newSt(), born: -9 });
      if (c.pol && Array.isArray(c.pol.m)) for (const [id, s] of c.pol.m) R.pol.set(id, s > 0 ? 1 : -1);
      if (c.knights) for (const [id, x, y, f] of c.knights.k || []) R.knights.set(id, { id, x, y, f, born: -9, st: Object.assign(newSt(), { props: {} }) });
      if (c.lant && Array.isArray(c.lant.l)) R.lanterns = c.lant.l.map(([id, x, y, carrier, last]) => ({ id, x, y, carrier, last: !!last }));
    };
    S.tick = (now) => {
      const R = S.raid, bd = S.boss;
      for (const [id, tg] of R.tgs) {
        const end = tg.start + tg.dur;
        if (tg.gone != null) { if (now > tg.gone + 0.25) R.tgs.delete(id); continue; }
        if (tg.follow != null && now < end - (tg.lockAt || 0)) { const e = S.entById(tg.follow); if (e) { tg.live.x = e.x; tg.live.y = e.y; } }
        if (tg.aim != null && now < end - (tg.lockAt || 0.6)) { const e = S.entById(tg.aim); tg.live.x = bd.x; tg.live.y = bd.y; if (e) tg.live.angle = Math.atan2(e.y - bd.y, e.x - bd.x); }
        if (now > end + 1.5) R.tgs.delete(id);
      }
      for (const [id, p] of R.puddles) if (now > p.end) R.puddles.delete(id);
      for (const key of Object.keys(S.propsUntil)) if (now > S.propsUntil[key]) { delete S.props[key]; delete S.propsUntil[key]; }
      bd.st.props = S.props;
      for (const a of R.adds.values()) a.st.t = now;
      for (const k of R.knights.values()) k.st.t = now;
      for (const [id, th] of R.tethers) if (now > th.end + 1) R.tethers.delete(id);
      for (const [id, z] of R.zones) if (now > z.end + 1) R.zones.delete(id);
    };
    // the arena is "busy" while a telegraph, zone, roller... is still on the floor
    S.busy = () => { const R = S.raid; return R.tgs.size + R.zones.size + R.puddles.size + R.rollers.size + R.tethers.size + R.reels.size + R.lunges.filter(l => S.now - l.start < 4).length + (R.eggs && S.now < R.eggs.end + 0.5 ? 1 : 0); };
    // what the floor itself is declared to hold, and until when (zones, pools, telegraphs, rollers...)
    S.declared = () => { const R = S.raid; let m = 0; for (const z of R.zones.values()) m = Math.max(m, z.end); for (const p of R.puddles.values()) m = Math.max(m, p.end); for (const t of R.tgs.values()) m = Math.max(m, t.start + t.dur + 1.5); for (const th of R.tethers.values()) m = Math.max(m, th.end + 1); for (const r of R.reels.values()) m = Math.max(m, r.end); if (R.eggs) m = Math.max(m, R.eggs.end + 0.5); return Number.isFinite(m) ? m : 0; };
    S.draw = drawBossStage;
    return S;
  }

  function vctx(S) {
    const R = S.raid;
    return { entById: S.entById, boss: S.floorId, pol: R.pol, units: S.units, props: S.room.props, room: S.room, bossDraw: S.boss };
  }

  // main.js's Net.on handlers, the visual part of each
  function handle(S, msg) {
    const R = S.raid, now = S.now, bd = S.boss, later = (d, fn) => FX.later(d, fn);
    switch (msg.t) {
      case 'tg': R.tgs.set(msg.id, Object.assign({}, msg, { start: now, live: Object.assign({}, msg.shape) })); break;
      case 'tgx': {
        const tg = R.tgs.get(msg.id);
        if (!tg || tg.gone != null) return;
        tg.gone = now;
        BOSS_VFX.impact(tg, msg, vctx(S));
        if (msg.fail) BOSS_VFX.failed(tg);
        break;
      }
      case 'bcast': {
        const castPose = BOSS_VFX.castStart(S.floorId, msg.anim, msg.dur, bd, msg.name);
        // what the cast shows on his body (main.js Net.on('bcast'): the same props, held the same time)
        const end = now + msg.dur, prop = (k, v, until) => { S.props[k] = v; S.propsUntil[k] = until; };
        switch (msg.anim) {
          case 'mince': prop('mince', { side: msg.side, second: msg.second || null }, end + (msg.second ? 2.2 : 0.2)); if (msg.then) prop('next', msg.then, end + 0.3); break;
          case 'ladle': prop('held', 'ladle', end + 0.4); later(msg.dur - 0.5, () => prop('spin', true, S.now + 0.9)); break;
          case 'lid': prop('held', 'lid', end + 0.2); break;
          case 'boil': prop('steam', true, end + 0.5); break;
          case 'spit': case 'mist': prop('venom', true, end + 0.3); break;
          case 'wrap': case 'silk': case 'web': prop('silk', true, end + 0.3); break;
          case 'brood': prop('brood', true, end + 0.6); break;
          case 'lunge': case 'molt': prop('rear', true, end + 0.5); break;
          case 'reel': prop('silk', true, end + 4.5); prop('rear', true, end + 0.5); break;
          case 'meatballs': prop('meat', true, end + 0.3); break;
          case 'clap': case 'storm': prop('sky', true, end + 0.4); break;
          case 'fist': case 'avalanche': prop('fist', true, end + 0.2); break;
          case 'surge': prop('polar', true, end + 0.3); break;
          case 'rods': case 'crash': case 'field': prop('charge', true, end + 0.4); break;
          case 'gale': prop('inhale', true, end + 0.1); break;
          case 'walls': prop('spin', true, end + 10); break;
          case 'gaze': case 'lightsout': prop('gaze', true, end + 0.3); break;
          case 'lids': case 'decree': prop('raise', true, end - 0.3); break;
          case 'doom': prop('doom', true, end + 0.4); break;
          case 'knell': case 'bells': prop('knell', true, end + 0.3); break;
          case 'stomp': case 'ring': prop('graves', true, end + 0.2); break;
          case 'rise': case 'night': prop('rise', true, end + 0.3); break;
          case 'sweep': prop('raise', true, end - 0.45); break;
          case 'flop': prop('flop', true, end); if (msg.then) prop('next', msg.then, end + 1.6); later(msg.dur, () => prop('flat', true, S.now + 1.3)); break;
          case 'throw': case 'larder': case 'hook': prop('toss', true, end + 0.1); break;
          case 'gut': prop('steam', true, end + 0.3); break;
          case 'flambe': prop('brandy', true, end + 0.3); break;
          case 'eggs': prop('brood', true, end + 0.6); break;
          case 'fang': prop('rear', true, end + 0.4); prop('venom', true, end + 0.2); break;
          case 'volley': prop('silk', true, end + 4.5); prop('rear', true, end + 0.5); break;
          case 'deluge': prop('venom', true, end + 0.3); prop('rear', true, end + 0.3); break;
          case 'strand': case 'cocoon': case 'ambush': prop('silk', true, end + 0.4); prop('rear', true, end + 0.3); break;
          case 'chain': case 'orbs': prop('charge', true, end + 0.4); break;
          case 'skyfall': prop('sky', true, end + 0.4); break;
          case 'audience': prop('audience', true, end + 0.3); break;
          case 'march': prop('rise', true, end + 0.3); break;
          case 'bind': prop('graves', true, end + 0.3); break;
        }
        for (const [k, aft] of castPose || []) prop(k, true, end + aft);
        bd.st.props = S.props;
        if (msg.anim !== 'mince' && msg.anim !== 'boil') bd.st.action = { type: 'attack', t0: now + msg.dur - 0.45, dur: 1.2 };
        break;
      }
      // the boss's presentation moments (main.js: pdmg 'enrage', fev 'behind', the fight's end, the title card)
      case 'show':
        if (msg.k === 'intro') BOSS_VFX.intro(S.floorId, bd);
        else if (msg.k === 'death') { BOSS_VFX.bossDeath(S.floorId, bd); BOSS_VFX.victory(S.units, 2.2); }
        else if (msg.k === 'wipe') BOSS_VFX.wipe(bd, S.floorId);
        else if (msg.k === 'enrageLand') BOSS_VFX.enrageLand(S.floorId, bd);
        else if (msg.k === 'behind') BOSS_VFX.behind(bd, msg.n || 1);
        else if (msg.k === 'hit') BOSS_VFX.bossHit(bd, msg.v || 0.45);
        break;
      case 'banim':
        if (msg.name === 'ladle') { S.props.held = 'ladle'; S.propsUntil.held = now + msg.dur + 0.3; later(msg.dur - 0.5, () => { S.props.spin = true; S.propsUntil.spin = S.now + 0.9; }); }
        else if (msg.name === 'lid') { S.props.held = 'lid'; S.propsUntil.held = now + msg.dur + 0.2; }
        else if (msg.name === 'wrap') { S.props.silk = true; S.propsUntil.silk = now + msg.dur + 0.3; }
        else if (msg.name === 'field') { S.props.charge = true; S.propsUntil.charge = now + msg.dur + 0.3; }
        else if (msg.name === 'leap' && S.floorId === 'grubnak' && !S.room.props.some(p => p.kind === 'pot')) { S.props.carry = true; S.propsUntil.carry = now + 0.9; }
        if (msg.name === 'auto') { bd.st.action = { type: 'attack', t0: now - 0.45, dur: 1.0 }; const tgt = bd.tg != null ? S.entById(bd.tg) : S.units[0]; later(0.08, () => BOSS_VFX.auto(bd, tgt)); }
        else if (msg.name === 'leap') later(msg.dur || 0.6, () => BOSS_VFX.leap(bd.x, bd.y));
        else if (msg.name === 'gorge' || msg.name === 'roar') { bd.st.action = { type: 'attack', t0: now, dur: 1.4 }; BOSS_VFX.roar(bd.x, bd.y, S.floorId); }
        break;
      case 'addev': {
        const a = R.adds.get(msg.id);
        if (msg.k === 'spawn') BOSS_VFX.addSpawn(msg.x, msg.y, msg.kind);
        else if (msg.k === 'death') BOSS_VFX.addDeath(a ? a.x : msg.x, a ? a.y : msg.y);
        else if (msg.k === 'enrage') BOSS_VFX.addEnrage(a || { x: msg.x, y: msg.y });
        else if (msg.k === 'fury') BOSS_VFX.fury(msg.x, msg.y);
        else if (msg.k === 'spit') { const e = S.entById(msg.tg); if (a) a.st.action = { type: 'attack', t0: now, dur: 0.5 }; if (e && a) BOSS_VFX.spit(a, e); else if (e) BOSS_VFX.spit({ x: msg.x || bd.x, y: msg.y || bd.y }, e); }
        break;
      }
      case 'teth': R.tethers.set(msg.id, { a: msg.a, b: msg.b, kind: msg.kind, len: msg.len, tag: msg.tag, start: now, end: now + msg.dur }); break;
      case 'tethx': { const th = R.tethers.get(msg.id); R.tethers.delete(msg.id); if (th) for (const id of [th.a, th.b]) { const e = S.entById(id); if (e) BOSS_VFX.tetherSnap(e, msg.ok); } break; }
      case 'zone': R.zones.set(msg.id, { shape: msg.shape, tag: msg.tag, start: now, end: now + (msg.delay || 0) + msg.dur, at: now + (msg.delay || 0) }); break;
      case 'pud': R.puddles.set(msg.id, { id: msg.id, x: msg.x, y: msg.y, r: msg.r, start: now, end: now + msg.dur, tag: msg.tag }); break;
      case 'lunge': R.lunges.push({ who: msg.who, x: msg.x, y: msg.y, a0: msg.a0, dir: msg.dir, n: msg.n, step: msg.step, delay: msg.delay, start: now }); break;
      case 'husk': R.husks.push({ x: msg.x, y: msg.y, f: msg.f, end: now + msg.dur, st: Object.assign(newSt(), { props: { husk: true } }) }); BOSS_VFX.husk(msg.x, msg.y); break;
      case 'eggs': R.eggs = { pts: msg.pts, start: now, end: now + msg.dur }; later(msg.dur, () => msg.pts.forEach(([x, y]) => BOSS_VFX.hatch(x, y))); break;
      case 'roll':
        if (msg.clear) { R.rollers.clear(); break; }
        R.rollers.set(msg.id, { x: msg.x, y: msg.y, a: msg.a, sp: msg.sp, r: msg.r, delay: msg.delay, start: now, tag: msg.tag, pre: !!msg.pre });
        if (msg.pre) break;   // (a lane preview: just the path; the ball comes with its own message)
        if (msg.tag === 'orb') BOSS_VFX.orbForm(msg.x, msg.y); else later(0.5, () => BOSS_VFX.meatballLand(msg.x, msg.y));
        break;
      case 'rollhit': { const e = S.entById(msg.pid), r = R.rollers.get(msg.id); if (e) (r && r.tag === 'orb' ? BOSS_VFX.orbHit : BOSS_VFX.meatballHit)(e); break; }
      case 'chain': BOSS_VFX.chain((msg.ids || []).map(id => S.entById(id)).filter(Boolean)); break;
      case 'reel': R.reels.set(msg.id, { id: msg.id, pid: msg.pid, start: now, pullAt: now + msg.windup, end: now + msg.windup + msg.dur, sp: msg.sp }); break;
      case 'reelx': { const rl = R.reels.get(msg.id); R.reels.delete(msg.id); const e = S.entById(msg.pid); if (e && rl) { if (msg.ok) BOSS_VFX.silkSnap(e, bd); else BOSS_VFX.reelBite(e); } break; }
      case 'pol':
        if (Array.isArray(msg.m)) for (const [id, s] of msg.m) R.pol.set(id, s > 0 ? 1 : -1);
        if (msg.flip) for (const id of R.pol.keys()) { const e = S.entById(id); if (e) BOSS_VFX.polarityFlip(e, R.pol.get(id)); }
        break;
      case 'post': R.posts.set(msg.id, { x: msg.x, y: msg.y, start: now, end: now + msg.dur }); break;
      case 'sweep': R.sweeps.set(msg.id, { x: msg.x, y: msg.y, arms: msg.arms, a0: msg.a0, spin: msg.spin, w: msg.w, start: now, at: now + msg.delay, end: now + msg.delay + msg.dur, cover: msg.cover || null }); break;
      case 'edgewarn': R.edgeWarn = { r: msg.r, from: ARENA.r, start: now, end: now + msg.dur }; break;
      case 'edge': { const from = R.edgeWarn ? R.edgeWarn.from : ARENA.r; ARENA.resize(msg.r); R.edgeWarn = null; BOSS_VFX.edgeClose(from, msg.r); break; }
      case 'pulse': BOSS_VFX.pulse(S.units); break;
      case 'bcastend': BOSS_VFX.cocoonEnd(bd, !!msg.ok); break;
      case 'props': ArenaView.roomProps(S.room, msg, now); break;
      case 'propfx': BOSS_VFX.propFx(msg, S.room, S.entById, S.floorId); break;
      case 'roomev': ArenaView.roomEvent(S.room, msg, now, S.entById); break;
      case 'doomed': for (const id of msg.ids || []) { R.doom.set(id, { start: now, end: now + (msg.dur || 14) }); const e = S.entById(id); if (e) BOSS_VFX.doomed(e); } break;
      case 'cure': { R.doom.delete(msg.id); const e = S.entById(msg.id); if (e) BOSS_VFX.cure(e); break; }
      case 'gazed': { const e = S.entById(msg.id); if (e) BOSS_VFX.gazed(e, bd); break; }
      case 'knights':
        for (const [id, x, y, f] of msg.k || []) if (!R.knights.has(id)) { R.knights.set(id, { id, x, y, f, born: now, st: Object.assign(newSt(), { props: {} }) }); BOSS_VFX.knightRise({ x, y }); }
        break;
      case 'kmem': { const k = R.knights.get(msg.id) || [...R.knights.values()][0]; if (k) { k.mem = now; BOSS_VFX.knightMemory(k); } break; }
      case 'kswing': { const k = R.knights.get(msg.id) || [...R.knights.values()][0]; if (k) { k.ready = now + msg.dur; k.st.action = { type: 'attack', t0: now + msg.dur - 0.4, dur: 1.0 }; } break; }
      case 'night': R.night = !!msg.on; if (R.night) BOSS_VFX.nightFall(); break;
      case 'fev': {
        const e = S.entById(msg.id) || S.units[0];
        if (msg.k === 'death') BOSS_VFX.playerDeath(e);
        if (msg.k === 'raised') BOSS_VFX.playerRaised(e);
        if (msg.k === 'pause' && msg.dur > 0) BOSS_VFX.timeStop(bd, Math.min(2.5, +msg.dur));
        break;
      }
      case 'call': msg.fn(S); break;   // a direct BOSS_VFX call (rows for exports no message reached)
    }
  }

  function drawBossStage(ctx, S, view, scale) {
    const now = S.now, R = S.raid, bd = S.boss;
    frameTransform(ctx, S, view, scale);
    if (!S.lite) ArenaView.drawFloor(ctx, S.floorId, Math.min(1.5, S.zoom * scale));
    if (!S.lite) ArenaView.drawAmbient(ctx, now);
    ArenaView.drawEdge(ctx, now, R.edgeWarn);
    if (!S.lite) ArenaView.drawRoomUnder(ctx, S.room, now, { W: view.fw * S.zoom * scale, H: view.fh * S.zoom * scale, DPR: 1, zoom: S.zoom * scale, cam: { x: view.cx - view.fw / 2, y: view.cy - view.fh / 2 }, units: S.units, entById: S.entById, boss: bd });
    const tellEnv = { tgs: R.tgs, boss: bd, bossId: S.floorId, entById: S.entById, hard: R.mode === 'hard', pol: R.pol, units: S.units, covers: [...R.posts.values()].map(p => ({ x: p.x, y: p.y })), props: S.room.props, room: S.room };
    // (the same order as main.js renderArena: the floor effects go under the telegraphs, the rims over everything)
    counted(() => {
      ArenaView.drawZones(ctx, R.zones, now);
      ArenaView.drawPuddles(ctx, R.puddles, now);
      if (R.eggs) ArenaView.eggs(ctx, R.eggs.pts, clamp((now - R.eggs.start) / Math.max(0.1, R.eggs.end - R.eggs.start), 0, 1), now);
      FX.draw(ctx, true); VFX.draw(ctx, 'ground');
      ArenaView.drawTelegraphs(ctx, R.tgs, now, tellEnv);
      BossTells.drawRollers(ctx, R.rollers, now, tellEnv);
      BossTells.drawSweeps(ctx, R.sweeps, now, tellEnv);
      BossTells.air(ctx, R.tgs, now, tellEnv);
    });
    const ringA = BOSS_VFX.presence ? BOSS_VFX.presence(bd) : 1;
    if (!S.lite && ringA > 0.02) { ctx.save(); ctx.globalAlpha = ringA; ArenaView.drawBossRing(ctx, { x: bd.x, y: bd.y, f: bd.f }); ctx.restore(); }
    counted(() => { BossTells.rims(ctx, R.tgs, now, tellEnv); if (R.pol.size) ArenaView.polarityAuras(ctx, S.units, R.pol, now); });
    const all = [...S.units.map(u => ({ y: u.y, u })), { y: bd.y, boss: true }, ...[...R.adds.values()].map(a => ({ y: a.y, a })), ...R.husks.filter(h => now < h.end).map(h => ({ y: h.y, h })),
      ...[...R.posts.values()].filter(p => now < p.end).map(p => ({ y: p.y, p })), ...[...R.knights.values()].map(k => ({ y: k.y, k })),
      ...R.lanterns.filter(l => l.carrier == null).map(l => ({ y: l.y, l })), ...S.room.props.map(pr => ({ y: pr.y + (pr.shape === 'rect' ? 0 : pr.r * 0.4), pr }))].sort((a, b) => a.y - b.y);
    for (const e of all) { if (S.lite) break;
      if (e.boss) { if (BOSS_VFX.drawBody) BOSS_VFX.drawBody(ctx, S.bossDef, bd, { scale: 1.3, alpha: 1 }); else drawBoss(ctx, S.bossDef, bd.x, bd.y, bd.f, bd.st, 1.3); }
      else if (e.u) drawHero(ctx, e.u.cls, e.u.x, e.u.y, e.u.angle, e.u.st, 1.85, { lift: e.u.lift, spec: e.u.spec });
      else if (e.a) drawAdd(ctx, e.a.kind, e.a.x, e.a.y, e.a.f, e.a.st, e.a.enr, 1.5);
      else if (e.h) { ctx.save(); ctx.globalAlpha = 0.8; drawBoss(ctx, S.bossDef, e.h.x, e.h.y, e.h.f, e.h.st, 1.3); ctx.restore(); }
      else if (e.p) BossTells.rodPost(ctx, e.p.x, e.p.y, now, Math.min(1, (now - e.p.start) / 0.3, Math.max(0, (e.p.end - now) / 0.5)));
      else if (e.k) drawEchoKnight(ctx, e.k.x, e.k.y, e.k.f, e.k.st, Math.min(1, (now - e.k.born) / 0.6));
      else if (e.l) ArenaView.lantern(ctx, e.l.x, e.l.y, now, false, e.l.last);
      else if (e.pr) ArenaView.drawProp(ctx, e.pr, now, S.room);
    }
    counted(() => {
      for (const [id, d] of R.doom) { const e = S.entById(id); if (e) ArenaView.doomMark(ctx, e.x, e.y - 92, (d.end - now) / Math.max(0.1, d.end - d.start), now); }
      for (const lg of R.lunges) ArenaView.lungeLegs(ctx, lg.x, lg.y, lg, now);
      ArenaView.drawRoomOver(ctx, S.room, now, tellEnv);
      BossTells.drawReels(ctx, R.reels, now, tellEnv);
      for (const th of R.tethers.values()) { const a = S.entById(th.a), b = S.entById(th.b); if (a && b && now <= th.end) ArenaView.tether(ctx, a, b, th, now, R.mode === 'hard'); }
    });
    screenFx(ctx, S, 'dim', view.fw * S.zoom * scale, view.fh * S.zoom * scale);
    frameTransform(ctx, S, view, scale);
    counted(() => { FX.draw(ctx, false); VFX.draw(ctx, 'air'); });
    for (const tg of R.tgs.values()) if (tg.type === 'buster' && tg.target != null && tg.gone == null) { const e = S.entById(tg.target); if (e) ArenaView.busterIcon(ctx, e.x, e.y, now); }
    screenFx(ctx, S, 'flash', view.fw * S.zoom * scale, view.fh * S.zoom * scale);
  }

  function bossRows(job, S) {
    const rows = [], skipped = [];
    rows.skipped = skipped;
    const used = new Set();
    for (const ev of job.events) {
      const items = ev.items;
      const tgMsg = items.find(([, m]) => m.t === 'tg'), tgx = items.find(([, m]) => m.t === 'tgx');
      for (const [, m] of items) { if (m.t === 'tgx') used.add('impact'); if (m.t === 'bcast') used.add('castStart'); }
      const dur = tgMsg ? tgMsg[1].dur : null;
      const impact = tgx ? tgx[0] + 0.05 : null;
      const lastAt = items[items.length - 1][0];
      rows.push({
        name: ev.key + (tgMsg && tgMsg[1].name ? ' · ' + tgMsg[1].name : ev.cast ? ' · ' + ev.cast : ''),
        kind: ev.key.split(':')[0], note: ev.mode + ' @' + ev.t0.toFixed(0) + 's · ' + items.map(([dt, m]) => m.t + (dt ? '+' + dt.toFixed(2) : '')).join(' '),
        impact,
        times: impact != null ? (imp, endT) => [dur * 0.55, imp, imp + 0.35, imp + Math.max(1, (endT - imp) * 0.45), endT - 0.1] : null,
        teleAt: null,
        plan: S2 => { S2.applyCtx(ev.ctx); return items.map(([dt, m]) => [dt, () => handle(S2, m)]); },
      });
    }
    // rollers: the lane previews from the cast start, the hand-over to each ball, and the floor once they've all gone
    for (const r of rows) {
      if (r.kind !== 'roll') continue;
      const ev = job.events.find(e => e.key === r.name.split(' · ')[0]);
      const real = ev ? ev.items.filter(([, m]) => m.t === 'roll' && !m.pre && !m.clear) : [];
      if (!real.length) continue;
      const first = real[0][0], last = real[real.length - 1][0] + real[real.length - 1][1].delay;
      r.impact = first; r.times = () => [Math.max(0.3, first * 0.4), first - 0.05, real[0][0] + real[0][1].delay + 0.4, last + 0.05, last + 1.6];
    }
    // his presentation (BOSS_VFX.drawBody): the entrance, the fall, the wipe, the enrage to its lethal moment, a soft
    // enrage pass, his flinch. main.js plays these off the title card, the fight's end, pdmg 'enrage', fev 'behind', hits.
    const def0 = (typeof BOSSES !== 'undefined' && BOSSES.find(b => b.id === job.id)) || {};
    const SHOWS = [
      ['show:intro', 'the entrance (title card)', [[0, { t: 'show', k: 'intro' }]], [0.15, 0.55, 0.95, 1.4, 2.4]],
      ['show:death', 'his fall (fight clear), then the confetti', [[0, { t: 'show', k: 'death' }]], [0.4, 0.85, 1.3, 2.1, 3.2]],
      ['show:wipe', 'the wipe', [[0, { t: 'show', k: 'wipe' }]], [0.3, 1.0, 2.2, 4, 8.7]],
      ['show:enrage', 'the enrage cast (8 s), its lethal moment, then the wipe', [[0, { t: 'bcast', anim: 'enrage', dur: 8, name: def0.enrageName || 'Enrage' }], [8, { t: 'show', k: 'enrageLand' }], [9, { t: 'show', k: 'wipe' }]], [1.2, 5, 7.9, 8.2, 10.5]],
      ['show:behind', 'the soft enrage pass', [[0, { t: 'show', k: 'behind', n: 2 }]], [0.1, 0.3, 0.6, 1.5, 3]],
      ['show:hit', 'flinches: a hit, a crit, an Ultimate', [[0, { t: 'show', k: 'hit', v: 0.45 }], [0.5, { t: 'show', k: 'hit', v: 0.75 }], [1.0, { t: 'show', k: 'hit', v: 1 }]], [0.02, 0.1, 0.52, 1.02, 1.3]],
    ];
    for (const [name, note, items, ts] of SHOWS) {
      rows.push({
        name, kind: 'show', note, impact: ts[1], times: () => ts,
        plan: S2 => { const ev0 = job.events.find(e => e.ctx); if (ev0) S2.applyCtx(ev0.ctx); return items.map(([dt, m]) => [dt, () => handle(S2, m)]); },
      });
    }
    // BOSS_VFX exports the fight never reached: called directly with stand-in arguments
    for (const n of ['intro', 'bossDeath', 'wipe', 'enrageLand', 'behind', 'bossHit', 'bossHp', 'victory']) used.add(n);   // (the show rows above)
    const reached = new Set();
    for (const name of Object.keys(BOSS_VFX)) {
      if (used.has(name)) continue;
      const hit = { castStart: 'bcast', impact: 'tgx', failed: 'tgx', auto: 'banim', leap: 'banim', roar: 'banim', addSpawn: 'addev', addDeath: 'addev', addEnrage: 'addev', fury: 'addev', spit: 'addev',
        tetherSnap: 'tethx', husk: 'husk', hatch: 'eggs', orbForm: 'roll', meatballLand: 'roll', meatballHit: 'rollhit', orbHit: 'rollhit', chain: 'chain', silkSnap: 'reelx', reelBite: 'reelx',
        polarityFlip: 'pol', edgeClose: 'edge', pulse: 'pulse', cocoonEnd: 'bcastend', propFx: 'propfx', doomed: 'doomed', cure: 'cure', gazed: 'gazed', knightRise: 'knights', knightMemory: 'kmem',
        nightFall: 'night', playerDeath: 'fev', playerRaised: 'fev', timeStop: 'fev', stoveBurst: 'roomev', snuff: 'roomev' }[name];
      if (hit && job.events.some(ev => ev.items.some(([, m]) => m.t === hit))) continue;
      reached.add(name);
    }
    for (const name of reached) {
      const fn = BOSS_VFX[name];
      if (typeof fn !== 'function') continue;
      const params = (String(fn).match(/^[^(]*\(([^)]*)\)/) || [, ''])[1].split(',').map(s => s.trim().split('=')[0].trim()).filter(Boolean);
      // only things that spawn an effect: not drawing helpers (they take a canvas), setters or hooks (they take a function)
      if (/^(draw|set|get|is|has|on)[A-Z]/.test(name) || params.some(p => /^(ctx|c|fn|cb|hook)$/.test(p) || /[^\w]/.test(p))) { skipped.push(name); continue; }
      rows.push({
        name: 'BOSS_VFX.' + name + '(' + params.join(', ') + ')', kind: 'direct', note: 'not sent by this fight: called with stand-in arguments',
        direct: true,
        plan: S2 => {
          const ev0 = job.events.find(e => e.ctx) || null;
          if (ev0) S2.applyCtx(ev0.ctx);
          const hero = S2.units[0] || S2.addUnit(1000, 'bastion', null, 0, 160, -Math.PI / 2), bd = S2.boss;
          const arg = p => {
            // (exports whose parameters mean something else than the names suggest: the real call sites' values)
            if (name === 'edgeClose') return p === 'from' ? ARENA.r + 80 : ARENA.r;
            if (name === 'meatballWall') return { x: ARENA.hw - 40, y: hero.y, a: 0, sx: -ARENA.hw + 60, sy: hero.y }[p];
            if (/^(x|sx|hitX)$/.test(p)) return hero.x; if (/^(y|sy)$/.test(p)) return hero.y;
            if (/^(e|ent|target|a|k|from)$/.test(p)) return hero; if (/^(ents|units|pts)$/.test(p)) return p === 'pts' ? S2.units.map(u => ({ x: u.x, y: u.y })) : S2.units;
            if (/^(b|boss|bossDraw)$/.test(p)) return bd; if (/^(dur|sec)$/.test(p)) return 2; if (/^r$/.test(p)) return 120; if (/^(to)$/.test(p)) return { x: hero.x + 120, y: hero.y };
            if (p === 'room') return S2.room; if (p === 'bossKind') return S2.floorId; if (p === 'ok' || p === 'torn') return true; if (p === 's') return 1;
            if (p === 'color') return '#ffffff'; if (p === 'fl') return { id: 1, kind: 'thread', x: hero.x, y: hero.y, x1: hero.x - 100, y1: hero.y, x2: hero.x + 100, y2: hero.y, r: name === 'floorFalls' ? ARENA.R : 60, r2: ARENA.R * 0.62, paths: [] };
            return undefined;
          };
          return [[0, () => handle(S2, { t: 'call', fn: () => fn(...params.map(arg)) })]];
        },
      });
    }
    return rows;
  }

  // ================================================================== contact sheet
  function compose(job, results, view) {
    const fw = Math.round(view.fw * job.zoom), fh = Math.round(view.fh * job.zoom);
    const GAP = 6, HEAD = 40, PAD = 10, TITLE = 34;
    const cols = 5, W = PAD * 2 + cols * fw + (cols - 1) * GAP;
    const per = job.rows || (job.kind === 'boss' ? (job.zoom >= 1 ? 3 : 5) : (job.zoom >= 1 ? 8 : 12));
    const pages = [];
    for (let p0 = 0; p0 < results.length; p0 += per) {
      const chunk = results.slice(p0, p0 + per);
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = TITLE + chunk.length * (HEAD + fh + GAP) + PAD;
      const c = cv.getContext('2d');
      c.fillStyle = '#16181d'; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = '#f2ead8'; c.font = FONT_B; c.textBaseline = 'middle';
      c.fillText(`${job.id} · zoom ${job.zoom} · frame ${view.fw}×${view.fh} world px · page ${pages.length + 1}/${Math.ceil(results.length / per)}`, PAD, TITLE / 2);
      c.font = FONT_S; c.fillStyle = '#9aa0aa';
      c.textAlign = 'right'; c.fillText('label: frame · time (s) · live particles / effects · canvas calls this frame', W - PAD, TITLE / 2); c.textAlign = 'left';
      chunk.forEach((r, i) => {
        const y0 = TITLE + i * (HEAD + fh + GAP);
        const bad = r.fail;
        c.fillStyle = bad ? '#3a1618' : r.warn ? '#2e2a18' : '#20242b'; c.fillRect(PAD, y0, W - PAD * 2, HEAD - 4);
        c.fillStyle = bad ? '#ff8a80' : '#f2ead8'; c.font = FONT_B;
        c.fillText(short(r.name, 70), PAD + 8, y0 + 11);
        c.font = FONT_S; c.fillStyle = '#b8c0cc';
        c.fillText(short(r.kind + ' · ' + r.note, 120), PAD + 8, y0 + 27);
        c.textAlign = 'right'; c.fillStyle = bad ? '#ff8a80' : r.warn ? '#ffd27a' : '#9ad8a0';
        const stat = `peak ${r.peakParts} particles · ${r.peakEffs} effects · ${r.peakCalls} calls/frame · lives ${r.endT.toFixed(2)}s`;
        c.fillText(stat, W - PAD - 8, y0 + 11);
        if (bad || r.warn) c.fillText(short(bad || r.warn, 110), W - PAD - 8, y0 + 27);
        c.textAlign = 'left';
        const names = FRAME_NAMES(r.shots.length);
        r.shots.forEach((s, j) => {
          const x = PAD + j * (fw + GAP), y = y0 + HEAD;
          c.drawImage(s.cv, x, y, fw, fh);
          c.strokeStyle = '#000'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
          const txt = `${names[j] || ''} ${s.t.toFixed(2)}s · ${s.parts}p/${s.effs}e · ${s.calls}c`;
          c.font = FONT; const tw = c.measureText(txt).width + 10;
          c.fillStyle = 'rgba(0,0,0,0.62)'; c.fillRect(x + 3, y + 3, tw, 18);
          c.fillStyle = '#ffffff'; c.fillText(txt, x + 8, y + 12);
        });
        if (!r.shots.length) { c.fillStyle = '#ff8a80'; c.font = FONT; c.fillText('(nothing rendered: ' + (r.fail || 'no frames') + ')', PAD + 8, y0 + HEAD + 20); }
      });
      pages.push(cv);
    }
    return pages;
  }

  // ================================================================== entry point
  Gallery.run = async (job) => {
    const t0 = H.realNow();
    // the checker's own test: four broken moments it must catch (only added for 'render.js selftest')
    if (job.selftest) Object.assign(KIT_VFX, {
      __throws: () => { null.boom(); },
      __nan: e => VFX.fx({ dur: 0.5, draw: c => { c.beginPath(); c.arc(e.x, e.y, 20, 0, NaN); c.moveTo(NaN, e.y); c.stroke(); } }),
      __leak: e => VFX.spawn({ x: e.x, y: e.y, life: 60, size: 20, color: '#ff00ff' }),
      __dropped: e => VFX.fx({ dur: 0.5, draw: c => { c.arc(e.x, e.y, -5, 0, 1); } }),
    });
    const S = job.kind === 'boss' ? setupBossStage(job) : setupClassStage(job);
    let view;
    if (job.kind === 'boss') {
      ARENA.use(job.id);
      const ex = ARENA.kind === 'circle' ? ARENA.full : ARENA.kind === 'poly' ? ARENA.R : ARENA.hw, ey = ARENA.kind === 'circle' ? ARENA.full : ARENA.kind === 'poly' ? ARENA.R : ARENA.hh;
      view = { fw: Math.round(ex * 2 + 60), fh: Math.round(ey * 2 + 100), cx: 0, cy: -20 };
    } else view = { fw: job.frame[0], fh: job.frame[1], cx: 0, cy: 10 };
    S.reset();
    let rows = job.kind === 'boss' ? bossRows(job, S) : job.kind === 'shared' ? (job.moments || []).map(m => momentRow(m, S, job)) : classRows(job, S);
    const skippedList = rows.skipped || [];
    if (job.only) rows = rows.filter(r => job.only.some(o => r.name.toLowerCase().includes(o) || r.kind.toLowerCase().includes(o)));
    const probeCv = document.createElement('canvas'), fullCv = document.createElement('canvas');
    const results = [];
    for (const row of rows) {
      const rt0 = H.realNow();
      const p = runRow(row, S, view, { canvas: probeCv });
      const times = pickTimes(row, p);
      // the red/blue telegraph goes under the aftermath frames (classes: is the floor still readable under it?)
      const teleAt = job.kind === 'boss' ? null : times[Math.max(1, times.length - 2)];
      if (S.teleTgs == null && job.kind !== 'boss') S.teleTgs = teleTgs(S, 0);
      if (teleAt != null) S.teleTgs = teleTgs(S, teleAt);
      const full = job.png ? runRow(row, S, view, { canvas: fullCv, snaps: times, teleAt }) : { shots: [], errs: [], nan: [], warns: [] };
      const errs = [...new Set([...p.errs, ...full.errs])];
      const nan = p.nan.concat(full.nan.filter(n => !p.nan.some(m => m.key === n.key)));
      const warns = p.warns.concat(full.warns);
      const dropped = warns.filter(w => /effect dropped/.test(w.msg));
      let fail = null, warn = null;
      if (errs.length) fail = 'throws: ' + errs[0];
      else if (dropped.length) fail = 'an effect threw while drawing (dropped): ' + dropped[0].msg + ' @' + dropped[0].at;
      else if (nan.length) fail = 'non-finite canvas argument: ' + nan[0].what + '(' + nan[0].args + ') @' + nan[0].at;
      else if (p.badDur) fail = p.badDur;
      else if (p.leak) fail = 'leak: ' + p.leak;
      else if (row.missing) fail = 'the kit emits it but KIT_VFX has no entry';
      // a direct call's arguments are guesses: what goes wrong with them is noted, not counted as the effect's fault
      if (fail && row.direct) { warn = 'with stand-in arguments: ' + fail; fail = null; }
      else if (!fail) {
        if (warns.length) warn = 'console: ' + warns[0].msg + ' @' + warns[0].at;
        else if (row.mainOnly) warn = 'drawn by main.js itself (not reachable headless)';
        else if (row.noVisual) warn = 'no recipe and no fx: nothing is drawn';
        else if (p.peakCalls === 0 && p.peakParts === 0 && !(S.busy && job.kind === 'boss')) warn = 'draws nothing';
      }
      results.push({
        name: row.name, kind: row.kind, note: row.note, ms: Math.round(H.realNow() - rt0), fail, warn, endT: p.endT, declaredEnd: +p.declEnd.toFixed(2),
        peakParts: p.peakParts, peakEffs: p.peakEffs, peakCalls: p.peakCalls, totalCalls: p.totalCalls,
        errors: errs, nan: nan.map(n => n.what + '(' + n.args + ') @' + n.at), warnings: warns.map(w => w.msg + ' @' + w.at).slice(0, 4),
        times: full.shots.map(s => +s.t.toFixed(3)), shots: full.shots,
      });
      if (job.verbose) console.log('[gallery] ' + Math.round(H.realNow() - rt0) + 'ms ' + row.name);
    }
    const tc = H.realNow();
    Gallery.pages = job.png ? compose(job, results, view) : [];
    if (job.verbose) console.log('[gallery] compose ' + Math.round(H.realNow() - tc) + 'ms');
    const summary = {
      frame: { worldW: view.fw, worldH: view.fh, px: [Math.round(view.fw * job.zoom), Math.round(view.fh * job.zoom)] },
      vfxInternals: !!VI(),
      notRendered: skippedList.map(n => 'BOSS_VFX.' + n + ': a drawing helper / setter, not an effect (takes a canvas or a function)'),
      maxParticles: Math.max(0, ...results.map(r => r.peakParts)),
      effects: results.map(r => { const o = Object.assign({}, r); delete o.shots; return o; }),
      renderMs: Math.round(H.realNow() - t0),
    };
    return { pages: Gallery.pages.length, summary };
  };

  // a page's PNG, fetched one at a time (one big reply for a whole sheet is slow over the DevTools socket)
  Gallery.page = i => Gallery.pages[i].toDataURL('image/png').split(',')[1];
  Gallery.ready = true;
})();
