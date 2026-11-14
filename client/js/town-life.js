// Town life: the townsfolk of Emberfall (town-npcs.js) walking about, talking, keeping secrets and handing out the odd
// gift, and what each boss's first defeat changes in town: a newcomer walks in (with a few words for everyone), a
// trophy goes up on the boss's statue, a little decoration appears. The chef (after Grubnak) serves feasts: one
// person orders, everyone in town eats, and the meal lasts an hour.
// Progress here is this browser's own: flags and arrivals are the account's, gifts are once per hero.

const TownLife = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const NPCS = typeof TOWN_NPCS !== 'undefined' ? TOWN_NPCS : [];
  const GIFTS = typeof TOWN_GIFTS !== 'undefined' ? TOWN_GIFTS : {};
  const UNLOCKS = typeof TOWN_UNLOCKS !== 'undefined' ? TOWN_UNLOCKS : {};
  const MEALS = typeof FEASTS !== 'undefined' ? FEASTS : [];
  const FEAST_MS = 60 * 60 * 1000;
  const WARDLIST = typeof WARDS !== 'undefined' ? WARDS : [];     // Quill's wards (set 2)
  const WISH = typeof FOUNTAIN !== 'undefined' ? FOUNTAIN : null;   // the wishing pool (set 2)
  const WARD_MS = 60 * 60 * 1000;
  let deps = null;   // from main: { beaten(id), hero(), role(), now(), player, addItem(key), gold(), spendGold(n), toast(msg), orderFeast(id), focusCamera(x, y, secs), onFeast() }

  // ---------------------------------------------------------------- saved state
  function state() {
    let s = Save.get('town');
    if (!s || typeof s !== 'object') { s = {}; Save.set('town', s); }
    s.flags = s.flags || {}; s.gifts = s.gifts || {}; s.seen = s.seen || {};
    return s;
  }
  const commit = () => Save.commit();

  // ---------------------------------------------------------------- the townsfolk
  const folk = NPCS.map((d, i) => ({ d, x: d.at.x, y: d.at.y, angle: Math.PI / 2, st: { t: 0, moving: false, action: null }, home: d.at, goal: null, rest: 1 + i * 0.7, walk: null, bubble: null }));
  const present = f => !f.d.arrives || (deps && deps.beaten(f.d.arrives) && (state().seen[f.d.arrives] || f.walk));
  function matches(w) {
    if (!w) return true;
    const s = state(), hero = deps.hero(), role = deps.role();
    if (w.beaten && !w.beaten.every(b => deps.beaten(b))) return false;
    if (w.notBeaten && w.notBeaten.some(b => deps.beaten(b))) return false;
    if (w.hardBeaten && !w.hardBeaten.every(b => Save.hardBeaten(b))) return false;   // cleared on Hard by this account (the Ultimate's hints)
    if (w.flags && !w.flags.every(f => s.flags[f])) return false;
    if (w.notFlags && w.notFlags.some(f => s.flags[f])) return false;
    if (w.hero && w.hero !== hero) return false;
    if (w.role && w.role !== role) return false;
    return true;
  }

  // ---------------------------------------------------------------- arrivals and unlock moments
  let scene = null;   // { f, boss, at, lineAt, i }
  function startArrival(boss) {
    const s = state();
    s.seen[boss] = 1; commit();
    const u = UNLOCKS[boss];
    if (u && u.toast) banner(u.toast);
    const f = folk.find(x => x.d.arrives === boss);
    if (!f) return;
    const from = (f.d.entrance && f.d.entrance.from) || { x: f.home.x, y: f.home.y + 300 };
    const legs = ((f.d.entrance && f.d.entrance.via) || []).concat([f.home]);
    f.x = from.x; f.y = from.y; f.walk = { to: legs[0], next: legs.slice(1), best: Infinity, at: 0, ghost: false };
    scene = { f, i: -1, lineAt: 0, lines: (f.d.entrance && f.d.entrance.lines) || [] };
    deps.focusCamera(f, 999);
    if (typeof Sound !== 'undefined') Sound.play('arrival', { vol: 0.8 });
  }
  function bannerEl() {
    let el = document.getElementById('town-banner');
    if (!el) { el = document.createElement('div'); el.id = 'town-banner'; el.className = 'hidden'; document.body.appendChild(el); }
    return el;
  }
  let bannerTimer = null;
  function banner(text) {
    const el = bannerEl();
    el.innerHTML = `<small>Something has changed in Emberfall</small><p>${esc(text)}</p>`;
    el.classList.remove('hidden', 'out'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.classList.add('out'); bannerTimer = setTimeout(() => el.classList.add('hidden'), 900); }, 7000);
  }

  // ---------------------------------------------------------------- each frame (in town)
  // the feast you're full of, as a chip by your gold (with the minutes left)
  let chipKey = '';
  function chip() {
    let el = document.getElementById('fed-chip');
    if (!el) { el = document.createElement('div'); el.id = 'fed-chip'; el.className = 'hidden'; document.body.appendChild(el); }
    const f = feast(), key = f ? f.meal.id + Math.ceil(f.left / 60000) : '';
    if (key === chipKey) return;
    if (chipKey && !key && deps) deps.onFeast();   // (the meal ran out: gear numbers and the host's copy drop it)
    chipKey = key;
    el.classList.toggle('hidden', !f);
    if (f) { el.innerHTML = `Well fed<b>${Math.ceil(f.left / 60000)}m</b>`; Tip.set(el, `<b>${esc(f.meal.name)}</b><em>+${f.meal.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[f.meal.buff.stat] || ''}</em>${esc(f.meal.desc)}`); }
  }
  function update(dt, now, inTown) {
    if (deps && Math.floor(now) !== Math.floor(now - dt)) { chip(); wardChip(); }
    if (feastSc && (!deps || !inTown)) endFeastScene(true);   // (a fight or the portal ends it at once)
    if (!deps || !inTown) return;
    // a boss beaten that town hasn't marked yet: its moment, one at a time
    // (the finale's moment waits for its epilogue: that page is read first, the town's change after it)
    if (!scene) for (const b of Object.keys(UNLOCKS)) if (deps.beaten(b) && !state().seen[b] && !(b === 'maelis' && !storyRead('epilogue2'))) { startArrival(b); break; }
    if (!state().flags['moon-road'] && moonReady()) { state().flags['moon-road'] = 1; moonBorn = now; commit(); }   // (the way in to Season 2: the first visit after the Ultimate's epilogue has been read)
    const p = deps.player;
    for (const f of folk) {
      f.st.t = now;
      if (f.bubbleUntil && now > f.bubbleUntil) { f.bubble = null; f.bubbleUntil = 0; }
      if (!present(f)) continue;
      let moving = false;
      if (f.walk) {
        const dx = f.walk.to.x - f.x, dy = f.walk.to.y - f.y, d = Math.hypot(dx, dy);
        if (d < 4 && f.walk.next && f.walk.next.length) { f.walk.to = f.walk.next.shift(); f.walk.best = Infinity; }
        else if (d < 4) { f.walk = null; if (scene && scene.f === f) deps.focusCamera(null); }
        else {
          const st = Math.min(d, 95 * dt); f.x += dx / d * st; f.y += dy / d * st; f.angle = Math.atan2(dy, dx); moving = true;
          // no closer for a second (something solid in the line): walk through it, so an arrival never hangs with the camera on them
          if (d < f.walk.best - 1) { f.walk.best = d; f.walk.at = now; } else if (now - f.walk.at > 1) f.walk.ghost = true;
          if (!f.walk.ghost) deps.collide(f);
        }
      } else if (f.d.wander > 0 && !talking(f)) {
        if (f.goal) {
          const dx = f.goal.x - f.x, dy = f.goal.y - f.y, d = Math.hypot(dx, dy);
          if (d < 3) { f.goal = null; f.rest = now + 2 + Math.random() * 5; }
          else {
            const st = Math.min(d, 40 * dt), nx = f.x + dx / d * st, ny = f.y + dy / d * st;
            if (deps.blocked(nx, ny)) { f.goal = null; f.rest = now + 1; }   // (a wall or a tree in the way: stop and pick again)
            else { f.x = nx; f.y = ny; f.angle = Math.atan2(dy, dx); moving = true; }
          }
        } else if (now > f.rest) {
          // somewhere new nearby, on open ground, with nothing in the way
          for (let k = 0; k < 6; k++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * f.d.wander, g = { x: f.home.x + Math.cos(a) * r, y: f.home.y + Math.sin(a) * r };
            let clear = true;
            for (let j = 1; j <= 6 && clear; j++) if (deps.blocked(f.x + (g.x - f.x) * j / 6, f.y + (g.y - f.y) * j / 6)) clear = false;
            if (clear) { f.goal = g; break; }
          }
          if (!f.goal) f.rest = now + 2;
        }
      }
      f.st.moving = moving;
      // they turn to look at you when you're close
      if (!moving && !f.pose && p && Math.hypot(p.x - f.x, p.y - f.y) < 140) {
        let d = Math.atan2(p.y - f.y, p.x - f.x) - f.angle;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        f.angle += d * Math.min(1, dt * 5);
      }
    }
    // the camp kitchen's tables are solid once the chef is here; he cooks while nobody is talking to him
    const gs = folk.find(f => f.d.id === 'gaspard');
    if (gs && present(gs)) {
      addColliders();
      if (!feastSc) {
        if (!gs.walk && !talking(gs)) {
          const mode = now % 18 < 10 ? 'chop' : 'stir', ta = mode === 'chop' ? Math.atan2(1018 - gs.y, 785 - gs.x) : Math.atan2(K.stove.y - gs.y, K.stove.x - gs.x);
          gs.pose = mode; gs.angle = angTo(gs.angle, ta, Math.min(1, dt * 4));
        } else gs.pose = null;
      }
    }
    if (feastSc) tickFeast(dt, now);
    // the newcomer's walk-in, then their words, over their head
    if (scene) {
      const f = scene.f;
      if (!f.walk) {
        if (scene.i < 0 || now >= scene.lineAt) {
          scene.i += 1;
          if (scene.i >= scene.lines.length) { f.bubble = null; scene = null; deps.focusCamera(null); }
          else { f.bubble = scene.lines[scene.i]; scene.lineAt = now + Math.max(3, scene.lines[scene.i].length / 22); }
        }
      }
    }
    const pip = folk.find(f => f.d.id === 'pip');
    if (pip && strayHere()) tickStray(pip, dt, now);
    if (deps.beaten('vesper') && state().seen.vesper) tickGlass(now);
    chatter(now);
  }

  // ---------------------------------------------------------------- remarks and idle talk
  // One bubble at a time, from a queue: what the sergeant says about the pull you just played (and sometimes a neighbour's
  // word), and now and then an idle line from someone near you. Never during a conversation, an arrival or a feast.
  const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const numWord = n => NUMW[n] || 'many';
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let sayQ = [], saying = null, pullNote = null, nextIdle = 0, lastTick = 0, lastIdle = '';
  const PULL_POOLS = typeof TOWN_PULL_LINES !== 'undefined' ? TOWN_PULL_LINES : null;
  // lp: { boss, win, deaths, streak, first } from main.js (leaveRaid); said a moment after the party is back in town
  function remarkPull(lp) {
    if (!lp || !PULL_POOLS) return;
    pullNote = { lp, at: (deps ? deps.now() : 0) + 1.8 };
  }
  function sayPull(lp, now) {
    const kind = lp.win ? (lp.first ? 'first' : lp.deaths >= 3 ? 'rough' : lp.deaths > 0 ? 'some' : 'clean') : lp.streak >= 3 ? 'streak' : 'wipe';
    const pool = PULL_POOLS[kind], hask = folk.find(f => f.d.id === 'hask');
    if (!pool || !hask || !present(hask)) return;
    const fill = t => t.replace('{Out}', cap(numWord(Math.max(0, 4 - lp.deaths)))).replace('{out}', numWord(Math.max(0, 4 - lp.deaths))).replace('{streak}', numWord(lp.streak));
    sayQ.push({ f: hask, text: fill(pick(pool.hask)), secs: 5, gap: 0 });
    // sometimes someone close by adds a word
    const p = deps.player, near = folk.filter(f => f !== hask && present(f) && !f.walk && p && Math.hypot(p.x - f.x, p.y - f.y) < 420);
    near.sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y));
    if (near.length && Math.random() < 0.5) sayQ.push({ f: near[0], text: pick(pool.other), secs: 4, gap: 0.6 });
  }
  // the lines a townsperson might say to nobody in particular: the opening line of each plain talk entry that fits where the
  // account is (no hero, role or secret conditions), kept short
  function idleLines(f) {
    const out = [];
    for (const t of f.d.talk || []) {
      const w = t.when || {};
      if (w.flags || w.notFlags || w.hero || w.role || w.hardBeaten || !matches(w)) continue;
      const l = t.lines && t.lines[0];
      if (l && l.length <= 120 && !/(you|your|you're|yours)|\?/i.test(l)) out.push(l);   // (nothing said to "you": it is talk to nobody)
    }
    return out;
  }
  function chatter(now) {
    if (now - lastTick > 2) nextIdle = now + 50 + Math.random() * 50;   // (we were away: a quiet while after coming back)
    lastTick = now;
    if (talk || scene || feastSc) {   // (a conversation, an arrival or a meal: whatever was queued is dropped)
      sayQ = []; pullNote = null;
      if (saying) { if (saying.f.bubble === saying.text) { saying.f.bubble = null; saying.f.bubbleUntil = 0; } saying = null; }
      return;
    }
    if (saying) {
      if (now < saying.until && saying.f.bubble === saying.text) return;
      if (saying.f.bubble === saying.text) { saying.f.bubble = null; saying.f.bubbleUntil = 0; }
      saying = null;
    }
    if (pullNote && now >= pullNote.at) { sayPull(pullNote.lp, now); pullNote = null; }
    if (sayQ.length) {
      if (folk.some(f => f.bubble)) return;
      if (!sayQ[0].start) { sayQ[0].start = now + sayQ[0].gap; }
      if (now < sayQ[0].start) return;
      const q = sayQ.shift();
      q.f.bubble = q.text; q.f.bubbleUntil = now + q.secs; saying = { f: q.f, text: q.text, until: now + q.secs };
      return;
    }
    if (now < nextIdle) return;
    nextIdle = now + 75 + Math.random() * 75;   // (a word every minute or two, not a running commentary)
    const p = deps.player;
    if (!p || folk.some(f => f.bubble)) return;
    const cands = folk.filter(f => present(f) && !f.walk && !f.pose && Math.hypot(p.x - f.x, p.y - f.y) < 300 && idleLines(f).length);
    if (!cands.length) return;
    const a = pick(cands), la = idleLines(a).filter(l => l !== lastIdle);
    const text = pick(la.length ? la : idleLines(a));
    lastIdle = text;
    sayQ.push({ f: a, text, secs: Math.max(3.5, text.length / 16), gap: 0 });
    // now and then a neighbour answers with one of theirs
    const nb = folk.filter(f => f !== a && present(f) && !f.walk && !f.pose && Math.hypot(a.x - f.x, a.y - f.y) < 170 && idleLines(f).length);
    if (nb.length && Math.random() < 0.4) { const b = pick(nb), tb = pick(idleLines(b)); sayQ.push({ f: b, text: tb, secs: Math.max(3.5, tb.length / 16), gap: 0.7 }); }
  }

  // ---------------------------------------------------------------- drawing
  // a townsperson from their `look`: top-down, like the barkeep and the trainer
  function drawFolk(ctx, f, scale) {
    const L = f.d.look || {}, st = f.st, skin = L.skin || '#e0b48e', hair = L.hair || '#3a2416', coat = L.coat || '#6a5a48';
    const k = L.build === 'small' ? 0.72 : 1, wide = L.build === 'broad' ? 12 : L.build === 'slim' ? 8.5 : 10;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(scale * k, scale * k);
    ellipse(ctx, 2, 5, 15, 11, 0, 'rgba(0,0,0,0.28)');
    if (L.drip) drawPuddle(ctx, st.t);
    ctx.rotate(f.angle + (st.moving ? 0 : Math.sin(st.t * 0.6 + f.home.x) * 0.15));
    feet(ctx, st, '#2e2218');
    torso(ctx, coat, wide, 14);
    if (L.apron) ellipse(ctx, 3, 0, 6, 10, 0, L.apron, OUT, 1.5);
    // hands: at the sides, or busy (the chef chops, stirs, carries a dish, flourishes)
    const pz = f.pose, tt = st.t;
    let lh = [5, -12], rh = [5, 12];
    if (f.carry) { lh = [14, -9]; rh = [14, 9]; }
    else if (pz === 'chop') { const c = Math.max(0, Math.sin(tt * 8)); rh = [9 + 5 * c, 7]; lh = [12, -6]; }
    else if (pz === 'stir') { const a = tt * 3.4; rh = [12 + Math.cos(a) * 2.5, 6 + Math.sin(a) * 3]; }
    else if (pz === 'flourish') { rh = [9 + Math.sin(tt * 9) * 3, 17]; }
    if (pz === 'chop') { poly(ctx, [rh[0] + 1, rh[1] - 1.4, rh[0] + 11, rh[1] - 1, rh[0] + 11, rh[1] + 2, rh[0] + 1, rh[1] + 1.4], '#c4c8cc', OUT, 1); }
    else if (pz === 'stir') { line(ctx, rh[0], rh[1], rh[0] + 15, rh[1] - 3, OUT, 3.4); line(ctx, rh[0], rh[1], rh[0] + 15, rh[1] - 3, '#8a8f96', 1.8); circle(ctx, rh[0] + 15, rh[1] - 3, 3.2, '#7d838a', OUT, 1.2); }
    hand(ctx, lh[0], lh[1], skin); hand(ctx, rh[0], rh[1], skin);
    if (f.carry) { ctx.save(); ctx.translate(19, 0); drawCarried(ctx, f.carry); ctx.restore(); }
    const hat = L.hat || 'none';
    if (hat === 'hood') { circle(ctx, -1, 0, 9, coat, OUT, 2); circle(ctx, 3, 0, 5.5, skin); }
    else {
      circle(ctx, 0, 0, 7.5, hair, OUT, 2);
      circle(ctx, -1.5, -2.5, 2.4, 'rgba(255,255,255,0.18)');
      if (L.beard) ellipse(ctx, 6.5, 0, 5, 5.5, 0, hair, OUT, 1.5);
      else ellipse(ctx, 5.5, 0, 3, 4.5, 0, skin);
      if (hat === 'cap') { circle(ctx, -0.5, 0, 6.8, '#5a4a3a', OUT, 1.5); ellipse(ctx, 6, 0, 3.5, 6, 0, '#4a3a2a', OUT, 1.2); }
      else if (hat === 'chef') { circle(ctx, -1, 0, 7.5, '#f8f6f0', OUT, 1.5); circle(ctx, -3, -3, 4, '#ffffff'); circle(ctx, -3, 3, 4, '#ffffff'); circle(ctx, 1, 0, 4, '#ffffff'); }
      else if (hat === 'wide') { circle(ctx, 0, 0, 12, '#5a3e24', OUT, 1.5); circle(ctx, 0, 0, 6.5, '#6e4c2c', OUT, 1); }
      else if (hat === 'scarf') { circle(ctx, -1, 0, 7.8, coat, OUT, 1.5); ellipse(ctx, 5, 0, 3, 4.2, 0, skin); }
      else if (hat === 'pointed') { circle(ctx, -1, 0, 10.5, '#244a58', OUT, 1.5); circle(ctx, -1, 0, 6.2, '#2e6070', OUT, 1.2); circle(ctx, -1, 0, 1.8, '#cfe8e4'); }
      else if (hat === 'crown') { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circle(ctx, Math.cos(a) * 6, Math.sin(a) * 6, 1.8, '#e8c15a', OUT, 0.8); } }
    }
    ctx.restore();
  }
  // a damp townsperson's puddle, with a ring or two spreading in it
  function drawPuddle(ctx, t) {
    ellipse(ctx, 4, 8, 24, 13, 0, 'rgba(84,150,176,0.36)', 'rgba(210,238,248,0.35)', 1);
    for (let i = 0; i < 2; i++) { const q = (t * 0.7 + i * 0.5) % 1; ellipse(ctx, 4, 8, 6 + q * 18, 3 + q * 9, 0, null, 'rgba(220,244,252,' + (0.5 * (1 - q)).toFixed(2) + ')', 1); }
  }
  // the Silver Road's four trophies (set 6 has no statue terrace: they stand on one low dais in the Trophy Hall, drawSilverRoad below)
  const SILVER_ROAD = ['garrow', 'vesper', 'ormun', 'maelis'];
  const SILVER_TROPHY = { 'broken-chain': 1, 'mirror-shard': 1, 'tide-weight': 1, 'pale-crown': 1 };
  // trophies on beaten bosses' statues, and each unlock's little decoration
  function drawTrophy(ctx, kind, x, y, now) {
    ctx.save(); ctx.translate(x, y);
    glow(ctx, 0, 0, 22, SILVER_TROPHY[kind] ? '#cfe0f4' : '#ffd98a', 0.18 + Math.sin(now * 2) * 0.05);   // (the Silver Road's four glow cold: the only warm colour in the set is the town's windows)
    if (kind === 'cleaver') { rrect(ctx, -10, -7, 16, 11, 2, '#c8ccd0', OUT, 1.5); rrect(ctx, 6, -2, 9, 3, 1, '#6a4428', OUT, 1); }
    else if (kind === 'web') { ctx.strokeStyle = '#eef0ff'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); } for (const r of [4, 8, 11]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); } }
    else if (kind === 'storm-glass') { rrect(ctx, -5, -11, 10, 20, 4, 'rgba(160,220,255,0.55)', OUT, 1.5); line(ctx, -1, -6, 2, 0, '#fff7a0', 1.6); line(ctx, 2, 0, -1, 5, '#fff7a0', 1.6); }
    else if (kind === 'crown') { poly(ctx, [-10, 5, -11, -5, -5, 0, 0, -8, 5, 0, 11, -5, 10, 5], '#e8c15a', OUT, 1.5); }
    else if (kind === 'scale') { ctx.rotate(-0.4); ellipse(ctx, 0, 0, 8.5, 12, 0, '#b8381c', OUT, 1.6); ellipse(ctx, -1, -1.5, 5.2, 8, 0, '#d8541f'); for (const y of [-5, 0, 5]) line(ctx, -4, y + 2, 0, y - 1, 'rgba(90,20,10,0.55)', 1.2), line(ctx, 0, y - 1, 4, y + 2, 'rgba(90,20,10,0.55)', 1.2); }
    else if (kind === 'ice-shard') { poly(ctx, [0, -13, 5, -3, 3, 9, -3, 9, -5, -3], 'rgba(170,226,255,0.85)', OUT, 1.5); line(ctx, -1, -8, -1, 5, 'rgba(255,255,255,0.85)', 1.2); poly(ctx, [8, -2, 11, 5, 7, 9, 5, 4], 'rgba(200,240,255,0.8)', OUT, 1); }
    else if (kind === 'sigil') { circle(ctx, 0, 0, 10.5, null, '#8fe0d0', 1.6); circle(ctx, 0, 0, 6, null, '#8fe0d0', 1.2); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 - Math.PI / 2; circle(ctx, Math.cos(a) * 10.5, Math.sin(a) * 10.5, 1.9, ['#ff7a3a', '#8fd8ff', '#ffe45a', '#b07aff', '#dff7f0', '#dff7f0', '#dff7f0'][i], OUT, 0.8); } }
    else if (kind === 'fang') { poly(ctx, [-4, -11, 4, -11, 5, -4, 1, 11, -5, -4], '#ece4c4', OUT, 1.5); line(ctx, 0, -9, 1, 3, 'rgba(120,100,60,0.5)', 1); circle(ctx, 1, 13, 1.6, '#8ac04a'); }
    else if (kind === 'sunwheel') { circle(ctx, 0, 0, 11.5, '#c88a2a', OUT, 1.6); circle(ctx, 0, 0, 9.5, null, '#ffd55a', 1.8); circle(ctx, 0, 0, 7, '#e6aa44'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + now * 0.4; line(ctx, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * 12.5, Math.sin(a) * 12.5, 'rgba(255,214,90,0.8)', 1); } circle(ctx, 0, 0, 3.4, '#8a5a1c', OUT, 1.2); circle(ctx, -0.8, -0.8, 1.2, '#ffe9a0'); }
    else if (kind === 'sheathed-blade') { ctx.rotate(0.55); rrect(ctx, -3.2, -13, 6.4, 23, 2.4, '#1d2234', OUT, 1.5); line(ctx, -0.6, -9, -0.6, 6, '#bfe4ff', 1); line(ctx, 1.2, -4, 1.2, 4, 'rgba(240,248,255,0.8)', 0.8); rrect(ctx, -6.5, 9, 13, 3.2, 1.2, '#a8b2c4', OUT, 1.2); rrect(ctx, -2.2, 11.5, 4.4, 6, 1.2, '#4a3c34', OUT, 1.2); }
    else if (kind === 'heartwood') {
      rrect(ctx, -9, -12, 18, 24, 6, '#6b5640', OUT, 1.6); rrect(ctx, -6, -9, 5, 18, 2, '#85704f');
      poly(ctx, [1.5, -12, 4.5, -5, 1, -1, 4, 5, 1.5, 12, -1.5, 4, 1, -1, -2, -6], '#150a22', '#b07aff', 1.2);   // the split, and the dark in it
      poly(ctx, [7, -12, 12, -9, 9, -4, 6, -8], '#d8aa3c', OUT, 1); line(ctx, 7.5, -9, 10.5, -7.5, 'rgba(120,80,10,0.6)', 0.8);   // one dead gold leaf caught on it
    }
    else if (kind === 'silver-mask') {
      poly(ctx, [10, -14, 13, -7, 10, -1, 7, -7], '#dfe8f6', OUT, 1); poly(ctx, [-11, -10, -8, -4, -11, 1, -14, -4], '#c4d0e6', OUT, 1);   // two shards of the halo
      ellipse(ctx, 0, 0, 8, 11.5, 0, '#c9d2de', OUT, 1.6); ellipse(ctx, -2.4, -3, 2.8, 5.6, 0.2, 'rgba(255,255,255,0.6)');   // a smooth mask, no face on it
      line(ctx, 1.5, -9, 2, 8, 'rgba(110,122,150,0.55)', 0.8);
    }
    else if (kind === 'broken-chain') {
      // a short length of silver chain, links alternately flat and edge-on, the last one sprung open
      for (let i = 0; i < 5; i++) {
        const lx = -10 + i * 5, ly = Math.sin(i * 1.1) * 2.2;
        if (i % 2 === 0) ellipse(ctx, lx, ly, 3.9, 2.5, 0, null, OUT, 3.4), ellipse(ctx, lx, ly, 3.9, 2.5, 0, null, '#cdd5e0', 1.7);
        else line(ctx, lx - 2.4, ly, lx + 2.4, ly, OUT, 3.6), line(ctx, lx - 2.4, ly, lx + 2.4, ly, '#aeb8c6', 2);
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(13, 2.4, 3.2, 0.5, Math.PI * 1.7); ctx.stroke();
      ctx.strokeStyle = '#cdd5e0'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(13, 2.4, 3.2, 0.5, Math.PI * 1.7); ctx.stroke();
    }
    else if (kind === 'mirror-shard') {
      // one long shard of mirror-bright plate: a pale face, a line of light down it, a darker lower facet, a chip beside it, and in the glass one small window of the town
      poly(ctx, [-10, 8, -6, 5, -5, 10, -9, 12], '#bccadc', OUT, 1);
      poly(ctx, [1, -14, 8, -4, 5, 12, -2, 14, -8, 3], '#dfe9f5', OUT, 1.6);
      poly(ctx, [1, -14, 8, -4, 2, 0, -3, -7], 'rgba(255,255,255,0.8)');
      poly(ctx, [-8, 3, 2, 0, 5, 12, -2, 14], 'rgba(140,160,188,0.5)');
      line(ctx, -2, 3, 4, -8, 'rgba(255,255,255,0.9)', 1);
      rrect(ctx, 2.4, 5, 2.6, 3, 0.6, '#ffd08a');
    }
    else if (kind === 'tide-weight') {
      // a squat silver weight with a ring to lift it by, still damp, a pool of dark water at its foot
      ellipse(ctx, 1, 12.5, 12, 3, 0, 'rgba(14,26,44,0.7)');
      circle(ctx, 0, -11, 3.7, null, OUT, 3.2); circle(ctx, 0, -11, 3.7, null, '#cdd5e0', 1.6);
      poly(ctx, [-6.5, -8, 6.5, -8, 11, 9, -11, 9], '#aeb8c6', OUT, 1.6);
      ellipse(ctx, 0, 9, 11, 3, 0, '#8e9aae', OUT, 1.3);
      poly(ctx, [-5, -7, -2.2, -7, -4.4, 8, -8.2, 8], 'rgba(255,255,255,0.45)');
      line(ctx, -8.4, 0.5, 8.4, 0.5, 'rgba(70,86,110,0.7)', 1.2);
      circle(ctx, 6.5, 6, 1.1, 'rgba(120,160,200,0.8)'); circle(ctx, -9.6, 14.2, 1, 'rgba(40,70,104,0.85)');
    }
    else if (kind === 'pale-crown') {
      // a thin circlet of silver, five slender points, and over it a small moon where a jewel would sit: lit down one side, dark down the other
      poly(ctx, [-11, 7, -12, -3, -6.5, 1.5, -3.5, -6, 0, 1, 3.5, -6, 6.5, 1.5, 12, -3, 11, 7], '#c9d2de', OUT, 1.5);
      line(ctx, -10.5, 5, 10.5, 5, '#8e9aae', 1.4);
      circle(ctx, 0, -13, 5.4, '#242836', OUT, 1.3);
      ctx.fillStyle = '#eef2fa'; ctx.beginPath(); ctx.arc(0, -13, 4.6, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // The Cinder Sovereign's piece in the Trophy Hall (the Ultimate's, for the account): a plinth at the back of the runner, between the first
  // row's two middle statues, and over it a halo of twelve dead sigils, dark glass with a last red crack, turning very slowly round a single
  // cold ember. Shown once the Sovereign has fallen on this account (test flag: localStorage 'emberfall.svRewards' = '1', remove after testing).
  function drawSovereignPlinth(ctx, now) {
    const H = TOWN.hall, x = H.x + H.w / 2, y = H.rows[0] - 4, sc = PED_S;
    ctx.save(); ctx.translate(x, y);
    circle(ctx, 4, 5, 33 * sc, 'rgba(0,0,0,0.32)');
    circle(ctx, 0, 0, 31 * sc, '#4a4650', '#2a2630', 3); circle(ctx, 0, 0, 24 * sc, '#38343e'); circle(ctx, 0, 0, 28 * sc, null, 'rgba(201,166,90,0.45)', 1.2);
    // the ember at its heart: cold, nearly out, breathing once in a long while
    const br = 0.5 + 0.5 * Math.sin(now * 0.8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, 20, '#ff8a2a', 0.16 + 0.12 * br, 0.3 + 0.3 * br);
    ctx.restore();
    circle(ctx, 0, 0, 3.2, '#d9461a', '#2a0e0a', 1); circle(ctx, 0, 0, 1.4, '#ffe08a');
    // the twelve spent sigils
    const R = 44 * sc, spin = now * 0.05, live = Math.floor(now / 3.2) % 12;
    for (let i = 0; i < 12; i++) {
      const a = spin + i / 12 * Math.PI * 2, sx = Math.cos(a) * R, sy = Math.sin(a) * R * 0.92;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + Math.PI / 2); ctx.scale(1.3, 1.3);
      poly(ctx, [0, -7, 4.6, 0, 0, 7, -4.6, 0], '#17121c', '#6a4a5a', 1.2);
      const g = i % 4;   // each its own glyph
      ctx.strokeStyle = 'rgba(160,100,110,0.55)'; ctx.lineWidth = 0.9; ctx.beginPath();
      if (g === 0) { ctx.moveTo(0, -3.5); ctx.lineTo(0, 3.5); } else if (g === 1) { ctx.moveTo(-2.4, -2); ctx.lineTo(2.4, 2); ctx.moveTo(2.4, -2); ctx.lineTo(-2.4, 2); }
      else if (g === 2) { ctx.arc(0, 0, 2.4, 0, Math.PI * 2); } else { ctx.moveTo(-2.6, 2.4); ctx.lineTo(0, -3.2); ctx.lineTo(2.6, 2.4); }
      ctx.stroke();
      // a last red crack that wakes in one sigil after another, and goes out again
      if (i === live) { const f = 0.5 + 0.5 * Math.sin(now * 5); line(ctx, -1.2, -2.2, 1.4, 2.6, 'rgba(217,70,26,' + (0.35 + 0.4 * f).toFixed(2) + ')', 1.1); }
      ctx.restore();
    }
    ctx.restore();
  }
  // The Unspoken's piece in the Trophy Hall (for the account, once the last gate has fallen): a plinth in the middle of the second row, and on it a frost shard
  // with a broken gold ring turning very slowly round it, and a plate. Test flag: localStorage 'emberfall.unRewards' = '1' (local dev host; remove after testing).
  function drawUnspokenPlinth(ctx, now) {
    const H = TOWN.hall, x = H.x + H.w / 2, y = H.rows[1] - 4, sc = PED_S;
    ctx.save(); ctx.translate(x, y);
    circle(ctx, 4, 5, 33 * sc, 'rgba(0,0,0,0.32)');
    circle(ctx, 0, 0, 31 * sc, '#464c56', '#262a32', 3); circle(ctx, 0, 0, 24 * sc, '#343a44'); circle(ctx, 0, 0, 28 * sc, null, 'rgba(143,211,255,0.4)', 1.2);
    const br = 0.5 + 0.5 * Math.sin(now * 0.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -6, 24, '#8fd3ff', 0.12 + 0.08 * br, 0.3 + 0.2 * br); ctx.restore();
    // the shard: a tall pale crystal with a lit facet and a gold core
    poly(ctx, [0, -34, 8, -12, 5, 8, -5, 8, -9, -14], '#bfe0f2', '#2e4a5e', 1.6);
    poly(ctx, [0, -34, 8, -12, 3, 2, 0, -8], 'rgba(240,250,255,0.7)');
    line(ctx, 0, -24, 0, 2, 'rgba(216,184,106,0.8)', 1.4);
    // the broken ring: six arcs of gold with gaps, one of them frosted over, turning slowly
    const R = 40 * sc, spin = now * 0.04;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a0 = spin + i * Math.PI / 3 + 0.09, a1 = a0 + Math.PI / 3 - 0.3;
      ctx.strokeStyle = i === 2 ? 'rgba(143,211,255,0.8)' : 'rgba(216,184,106,0.85)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(0, -2, R, R * 0.92, 0, a0, a1); ctx.stroke();
    }
    // the plate
    ctx.font = '700 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText('The Unspoken').width + 22;
    ctx.fillStyle = '#2e2a26'; ctx.strokeStyle = '#c9a65a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(-tw / 2, 40 * sc, tw, 19, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0d48a'; ctx.fillText('The Unspoken', 0, 40 * sc + 10);
    ctx.restore();
  }
  // The Silver Road's piece in the Trophy Hall: set 6 has no statues (the hall's twelve pedestals are Season 1's), so its four trophies stand on one low dais of dark
  // slate in the third row's gap on the runner, with a silver rim and four shallow cups in a line; a cup is empty until its boss has fallen, and holds that boss's trophy
  // after (the Hard+ flame and the Extreme mark sit over and under each cup as on a pedestal). Shown once the first of them has fallen.
  function drawSilverRoad(ctx, now) {
    if (!SILVER_ROAD.some(b => deps.beaten(b) && state().seen[b])) return;
    const H = TOWN.hall, x = H.x + H.w / 2, y = H.rows[2] - 6, W = 78, D = 21;
    ctx.save(); ctx.translate(x, y);
    rrect(ctx, -W + 4, -D + 5, W * 2, D * 2, 10, 'rgba(0,0,0,0.3)');
    rrect(ctx, -W, -D, W * 2, D * 2, 9, '#3a3d4a', '#1f212b', 3);
    rrect(ctx, -W + 6, -D + 5, W * 2 - 12, D * 2 - 10, 6, '#2c2f3b');
    rrect(ctx, -W + 2, -D + 2, W * 2 - 4, D * 2 - 4, 8, null, 'rgba(190,206,226,0.5)', 1.2);
    ctx.restore();
    SILVER_ROAD.forEach((b, k) => {
      const cx = x - 57 + k * 38, cy = y;
      circle(ctx, cx, cy + 1, 14, '#1d1f29', 'rgba(190,206,226,0.45)', 1.3);
      const u = UNLOCKS[b], got = deps.beaten(b) && state().seen[b];
      if (!got) { circle(ctx, cx, cy + 1, 2, 'rgba(190,206,226,0.18)'); return; }
      if (u && u.trophy) drawTrophy(ctx, u.trophy, cx, cy, now);
      if (deps.heat && typeof HARDPLUS !== 'undefined') HARDPLUS.flame(ctx, cx, cy - 10 * PED_S, deps.heat(b), now, PED_S);
      if (deps.extreme && deps.extreme(b)) poly(ctx, [cx, cy + D - 1, cx + 2.8, cy + D + 2.6, cx, cy + D + 6.2, cx - 2.8, cy + D + 2.6], '#dcecf7', '#4a6378', 1);
    });
  }
  // The quiet change in town once the last gate has fallen (never told): a rim of frost on the stones round the first portal's ring that never melts, and by
  // night (the player's own clock, 21:00 to 06:00) a thin drift of snow over the terrace that falls upward.
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function drawFrostRim(ctx, now) {
    const P = TOWN.portals[0];
    ctx.save(); ctx.translate(P.x, P.y);
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * Math.PI * 2 + hash(i) * 0.12, d = P.r + 10 + hash(i + 50) * 22, w = 4 + hash(i + 100) * 9;
      const px = Math.cos(a) * d, py = Math.sin(a) * d * 0.96;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.fillStyle = 'rgba(190,225,245,' + (0.26 + hash(i + 150) * 0.2).toFixed(2) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, w, 1.8 + hash(i + 200) * 2.4, 0, 0, Math.PI * 2); ctx.fill();
      if (i % 3 === 0) { const tw = 0.5 + 0.5 * Math.sin(now * 1.4 + i); ctx.fillStyle = 'rgba(240,250,255,' + (0.25 + 0.4 * tw).toFixed(2) + ')'; ctx.fillRect(-w * 0.3, -0.6, 2.4, 1.2); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(160,210,240,0.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, P.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const nightNow = () => { const h = new Date().getHours(); return h >= 21 || h < 6; };
  function drawUpSnow(ctx, now) {
    const T = TOWN.terrace, N = 42;
    ctx.save();
    for (let i = 0; i < N; i++) {
      const sp = 0.035 + hash(i + 3) * 0.03, q = (now * sp + hash(i + 7)) % 1;   // 0 at the stones, 1 high above them
      const x = T.x + hash(i) * T.w + Math.sin(now * 0.5 + i) * 10, y = T.y + T.h - q * (T.h + 80);
      const a = Math.sin(q * Math.PI) * 0.5;
      ctx.fillStyle = 'rgba(236,246,255,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, 0.9 + hash(i + 11) * 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawDecor(ctx, kind, now) {
    if (kind === 'cookfire') {
      drawKitchen(ctx, now);
    } else if (kind === 'silk-lanterns') {
      for (const l of TOWN.lamps || []) glow(ctx, l.x, l.y - 28, 26, '#dfe6ff', 0.3 + Math.sin(now * 1.5 + l.x) * 0.06);
    } else if (kind === 'kites') {
      const spots = [[960, 810], [1480, 810], [1700, 1180]];
      spots.forEach(([x, y], i) => {
        const kx = x + Math.sin(now * 0.7 + i) * 18, ky = y - 120 + Math.cos(now * 0.9 + i * 2) * 10;
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 60, kx, ky); ctx.stroke(); ctx.restore();
        poly(ctx, [kx, ky - 12, kx + 8, ky, kx, ky + 12, kx - 8, ky], ['#e85a5a', '#5ab0e8', '#e8c15a'][i], OUT, 1.2);
      });
    } else if (kind === 'bunting') {
      // two swags along the Trophy Hall's front wall, one each side of its opening
      const H = TOWN.hall, fy = H.y + H.h - 18;
      for (const [x0, x1, sd] of [[H.x + 40, H.door.x - 40, 0], [H.door.x + H.door.w + 40, H.x + H.w - 40, 1]]) {
        ctx.save(); ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, fy); ctx.quadraticCurveTo((x0 + x1) / 2, fy + 40, x1, fy); ctx.stroke(); ctx.restore();
        for (let i = 1; i < 12; i++) {
          const t = i / 12, x = x0 + (x1 - x0) * t, y = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * (fy + 40) + t * t * fy;
          poly(ctx, [x - 6, y, x + 6, y, x, y + 11 + Math.sin(now * 3 + i + sd) * 1.5], ['#c84a4a', '#e8c15a', '#4a8ac8'][(i + sd) % 3], OUT, 0.8);
        }
      }
    } else if (kind === 'forge-embers') {
      decorSolid(kind, [{ x: SCALE_AT.x, y: SCALE_AT.y + 4, r: 15 }]);
      drawForgeHeat(ctx, now);
    } else if (kind === 'snowfall') {
      decorSolid(kind, SNOWMEN.map(m => ({ x: m.x, y: m.y, r: 11 * m.s })));
      drawFlurry(ctx, now);
    } else if (kind === 'chalk-circle') {
      drawChalkCircle(ctx, now);
    } else if (kind === 'wishing-pool') {
      drawWishingPool(ctx, now);
    } else if (kind === 'pass-lanterns') {
      decorSolid(kind, PASS_LANTERNS.map(l => ({ x: l.x, y: l.y, r: 9 })));
      for (const l of PASS_LANTERNS) drawLanternGround(ctx, l, now);
    } else if (kind === 'victory-banners') {
      decorSolid(kind, SUN_BANNERS.map(b => ({ x: b.x, y: b.y, r: 8 })));
      for (const b of SUN_BANNERS) drawBannerGround(ctx, b, now);
    } else if (kind === 'seedlings') {
      decorSolid(kind, SEEDLINGS.map(t => ({ x: t.x, y: t.y, r: 7 * t.k })));
      for (const t of SEEDLINGS) drawSeedlingGround(ctx, t, now);
    } else if (kind === 'tankard-glass') {
      decorSolid(kind, [{ x: GLASS.x, y: GLASS.y - 2, r: 13 }]);
    } else if (kind === 'moon-koi') {
      drawMoonKoi(ctx, now);
    } else if (kind === 'starfall') {
      const g = starGlassAt();
      if (g) decorSolid(kind, [{ x: g.x, y: g.y + 2, r: 8 }]);
      drawStarfall(ctx, now);
      if (g) drawStarGlassGround(ctx, g, now);
    }
  }

  // ---------------------------------------------------------------- set 3 decor
  // two stone lanterns flanking the road between the portals, above the plaza, snow-dusted and lit (the lantern itself is an entity, so heroes pass behind it)
  const PASS_LANTERNS = [{ x: 1126, y: 702, s: 0 }, { x: 1274, y: 702, s: 1 }];
  function drawLanternGround(ctx, l, now) {
    const fl = Math.sin(now * 7 + l.s * 2.3) * 0.04 + Math.sin(now * 17 + l.s) * 0.025;
    ellipse(ctx, l.x, l.y + 3, 26, 9, 0, 'rgba(226,236,250,0.5)');   // the snow that stays at its foot
    ellipse(ctx, l.x - 9 + l.s * 18, l.y + 8, 8, 3, 0, 'rgba(240,246,255,0.45)');
    glow(ctx, l.x, l.y - 22, 62, '#ffb45a', 0.2 + fl);
    glow(ctx, l.x, l.y + 2, 40, '#ffcf8a', 0.08 + fl * 0.5);
    for (let i = 0; i < 3; i++) {   // a few frost motes drifting down from the lamp
      const q = (now * 0.22 + i / 3 + l.s * 0.37) % 1;
      circle(ctx, l.x + Math.sin(now * 0.9 + i * 2.1 + l.s) * 12, l.y - 40 + q * 38, 1.1, 'rgba(236,246,255,' + (0.7 * (1 - q)).toFixed(2) + ')');
    }
  }
  function drawPassLantern(ctx, l, now) {
    const { x, y } = l, fl = Math.sin(now * 7 + l.s * 2.3) * 0.08 + Math.sin(now * 17 + l.s) * 0.05;
    ellipse(ctx, x + 4, y + 4, 15, 5, 0, 'rgba(0,0,0,0.28)');
    rrect(ctx, x - 10, y - 7, 20, 8, 2, '#8b909b', OUT, 1.6);
    rrect(ctx, x - 4.5, y - 22, 9, 16, 2, '#9a9fa9', OUT, 1.5);
    rrect(ctx, x - 9.5, y - 36, 19, 15, 2.5, '#a9aeb8', OUT, 1.6);
    rrect(ctx, x - 6, y - 33, 12, 9, 1.5, 'rgba(255,' + Math.round(196 + fl * 80) + ',110,1)', OUT, 1);
    circle(ctx, x, y - 28.5, 2.4, '#fff1c4');
    line(ctx, x, y - 33, x, y - 24, 'rgba(120,70,20,0.55)', 1);
    poly(ctx, [x - 15, y - 35, x - 6, y - 45, x + 6, y - 45, x + 15, y - 35], '#7d828d', OUT, 1.6);
    ellipse(ctx, x, y - 45, 7, 2.6, 0, '#f2f6fc');   // snow on the cap
    circle(ctx, x, y - 49, 2.2, '#9a9fa9', OUT, 1);
  }

  // two red sun-banners on tall poles where the road comes in from the south, a sandy patch at each foot (drawn as entities, so heroes pass behind)
  const SUN_BANNERS = [{ x: 1126, y: 1150, s: 0 }, { x: 1274, y: 1150, s: 1 }];
  function drawBannerGround(ctx, b, now) {
    ellipse(ctx, b.x, b.y + 4, 30, 10, 0, 'rgba(214,186,128,0.5)');
    for (let i = 0; i < 2; i++) {   // a few gold motes lifting off the banner's wheel
      const q = (now * 0.2 + i / 2 + b.s * 0.31) % 1;
      circle(ctx, b.x + Math.sin(now * 0.8 + i * 2.7 + b.s) * 10, b.y - 60 - q * 30, 1.2, 'rgba(255,214,110,' + (0.65 * (1 - q)).toFixed(2) + ')');
    }
  }
  function drawSunBanner(ctx, b, now) {
    const { x, y } = b, sw = Math.sin(now * 1.6 + b.s * 1.9) * 3.2;
    ellipse(ctx, x + 4, y + 4, 13, 5, 0, 'rgba(0,0,0,0.28)');
    rrect(ctx, x - 7, y - 5, 14, 7, 2, '#6a5a44', OUT, 1.5);
    rrect(ctx, x - 2, y - 82, 4, 78, 1.5, '#5a3e22', OUT, 1.4);
    circle(ctx, x, y - 84, 3.4, '#e2bb58', OUT, 1.2);
    rrect(ctx, x - 14, y - 78, 28, 3, 1.2, '#4a3018', OUT, 1);   // the cross-bar
    poly(ctx, [x - 12, y - 75, x + 12, y - 75, x + 12 + sw * 0.6, y - 42, x + sw, y - 33, x - 12 + sw * 0.6, y - 42], '#b8321e', OUT, 1.6);   // the cloth, swallow-tailed
    poly(ctx, [x - 12, y - 75, x + 12, y - 75, x + 12, y - 71, x - 12, y - 71], '#e2bb58');
    const wx = x + sw * 0.3, wy = y - 58;
    circle(ctx, wx, wy, 7.4, null, '#ffd55a', 1.6); circle(ctx, wx, wy, 2.4, '#ffd55a');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; line(ctx, wx + Math.cos(a) * 3, wy + Math.sin(a) * 3, wx + Math.cos(a) * 7.4, wy + Math.sin(a) * 7.4, '#ffd55a', 1); }
  }

  // two seedlings come up through the paving just east of the plaza, a dark cracked patch at each foot (the trees are entities, so heroes pass behind)
  const SEEDLINGS = [{ x: 1500, y: 1000, s: 0, k: 1 }, { x: 1548, y: 1040, s: 1, k: 0.78 }];
  function drawSeedlingGround(ctx, t, now) {
    ellipse(ctx, t.x, t.y + 3, 30 * t.k, 10 * t.k, 0, 'rgba(58,42,28,0.5)');
    line(ctx, t.x - 22 * t.k, t.y + 5, t.x - 9 * t.k, t.y + 2, 'rgba(24,14,10,0.55)', 1); line(ctx, t.x + 9 * t.k, t.y + 3, t.x + 24 * t.k, t.y + 8, 'rgba(24,14,10,0.55)', 1);
    for (let i = 0; i < 2; i++) {   // a mote of amber lifting off the new growth
      const q = (now * 0.18 + i / 2 + t.s * 0.4) % 1;
      circle(ctx, t.x + Math.sin(now * 0.8 + i * 2.4 + t.s) * 8, t.y - 40 * t.k - q * 26, 1.1, 'rgba(255,196,84,' + (0.6 * (1 - q)).toFixed(2) + ')');
    }
  }
  function drawSeedling(ctx, t, now) {
    const { x, y, k } = t, sw = Math.sin(now * 1.1 + t.s * 2.2) * 2.2 * k;
    ellipse(ctx, x + 3, y + 4, 11 * k, 4 * k, 0, 'rgba(0,0,0,0.26)');
    ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 5.4 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x - 3 * k, y - 20 * k, x + sw * 0.5, y - 40 * k); ctx.stroke();
    ctx.strokeStyle = '#7a6244'; ctx.lineWidth = 3 * k; ctx.stroke(); ctx.restore();
    line(ctx, x + sw * 0.25, y - 24 * k, x + 11 * k + sw, y - 33 * k, '#7a6244', 1.8 * k);
    line(ctx, x - 1.5 * k, y - 18 * k, x - 11 * k + sw * 0.6, y - 28 * k, '#7a6244', 1.6 * k);
    const leaves = [[0, -45, 1], [11, -35, 0.8], [-11, -30, 0.8], [5, -52, 0.6], [-5, -40, 0.7]];
    leaves.forEach(([lx, ly, ls], i) => {
      const px = x + (lx + sw * (0.6 + i * 0.12)) * k, py = y + ly * k, w = 5.6 * ls * k;
      poly(ctx, [px, py - w * 1.5, px + w, py, px, py + w * 1.2, px - w, py], i === 2 ? '#d8aa3c' : '#7fa84a', OUT, 1);
    });
    glow(ctx, x + sw * 0.5, y - 44 * k, 16 * k, '#ffc45a', 0.16 + Math.sin(now * 2 + t.s) * 0.04);
  }

  // the meteor has broken: slow stars drifting down over the whole town, and a splinter of black star-glass standing where the four set 3 statues meet
  // (the splinter is an entity, so heroes pass behind it; its spot follows the Trophy Hall, so it moves with the layout: the middle of the third row)
  function starGlassAt() {
    const T = typeof TOWN !== 'undefined' && TOWN, H = T && T.hall;
    if (!H || !H.rows || H.rows.length < 3) return null;
    return { x: H.x + H.w / 2, y: H.rows[2] - 8 };
  }
  function drawStarfall(ctx, now) {
    for (let i = 0; i < 34; i++) {
      const h1 = (i * 0.6180339) % 1, h2 = (i * 0.7548776 + 0.17) % 1, sp = 26 + (i % 6) * 7, big = i % 7 === 0;
      const x = ((h1 * 2400 - now * 9 + Math.sin(now * 0.4 + i) * 6) % 2400 + 2400) % 2400, y = (h2 * 1700 + now * sp) % 1700;
      const len = 16 + (i % 4) * 7, tw = 0.6 + 0.4 * Math.sin(now * 2.1 + i * 1.9);
      const bx = x + len * 0.3, by = y - len;   // the trail leans back toward where it came from
      ctx.save(); ctx.globalAlpha = 0.55 * tw; line(ctx, x, y, bx, by, 'rgba(214,228,255,0.9)', big ? 1.6 : 1); ctx.restore();
      if (big) glow(ctx, x, y, 14, '#cfe0ff', 0.2 * tw);
      circle(ctx, x, y, big ? 2 : 1.3, 'rgba(250,252,255,' + (0.75 * tw).toFixed(2) + ')');
      if (big && tw > 0.85) drawSpark(ctx, x, y, 4.5, (tw - 0.85) / 0.15);
    }
  }
  function drawStarGlassGround(ctx, g, now) {
    ellipse(ctx, g.x, g.y + 4, 24, 8, 0, 'rgba(20,18,34,0.4)');
    for (const [dx, dy] of [[-20, 3], [-9, 7], [11, 6], [22, 2]]) line(ctx, g.x + dx * 0.4, g.y + 4 + dy * 0.3, g.x + dx, g.y + 4 + dy * 0.6, 'rgba(236,242,255,0.5)', 0.9);   // hairline cracks in the stone
    glow(ctx, g.x, g.y - 8, 40, '#cfe0ff', 0.1 + Math.sin(now * 1.3) * 0.03);
  }
  function drawStarGlass(ctx, g, now) {
    const { x, y } = g, p = 0.5 + 0.5 * Math.sin(now * 1.3);
    poly(ctx, [x - 8, y + 3, x - 5, y - 14, x - 1, y - 30, x + 2, y - 15, x + 7, y - 21, x + 9, y + 3], '#0d0b18', OUT, 1.6);
    poly(ctx, [x - 2, y + 2, x - 1, y - 24, x + 2, y - 14], 'rgba(40,36,64,0.9)');
    line(ctx, x - 2.5, y - 1, x - 0.5, y - 26, 'rgba(240,246,255,' + (0.6 + p * 0.3).toFixed(2) + ')', 1.2);   // the white vein through it
    line(ctx, x + 4, y - 2, x + 5, y - 16, 'rgba(240,246,255,0.45)', 0.8);
    glow(ctx, x - 1, y - 14, 20, '#e4eeff', 0.12 + p * 0.1);
    const q = (now * 0.16) % 1;
    circle(ctx, x + Math.sin(now * 0.9) * 5, y - 30 - q * 22, 1.1, 'rgba(236,244,255,' + (0.7 * (1 - q)).toFixed(2) + ')');
  }

  // ---------------------------------------------------------------- set 2 decor (docs/plans/town-life.md, "Set 2 additions")
  // small solid things the new decor puts in the town, added once so nobody (and no NPC's walk) goes through them
  const decorOn = {};
  function decorSolid(kind, circles) {
    if (decorOn[kind] || typeof COLLIDERS === 'undefined') return;
    decorOn[kind] = true;
    for (const c of circles) COLLIDERS.circles.push(c);
  }
  const SCALE_AT = { x: 1962, y: 920 };   // leaning on the Forge's front wall, west of its door
  // the Forge burns hotter: embers lifting off the chimney, a warmer glow at the hearth and the door, the great scale by the wall
  function drawForgeHeat(ctx, now) {
    glow(ctx, 2124, 880, 78, '#ff6a1a', 0.2 + Math.sin(now * 6) * 0.05);
    glow(ctx, 2040, 912, 64, '#ff8a3a', 0.1 + Math.sin(now * 4.4) * 0.03);
    for (let i = 0; i < 16; i++) {
      const q = (now * 0.3 + i / 16) % 1, x = 1948 + Math.sin(now * 1.3 + i * 2.1) * 9 * q + q * q * 34, y = 690 - q * 125;
      glow(ctx, x, y, 7 + (1 - q) * 5, '#ff7a2a', (1 - q) * 0.35);
      circle(ctx, x, y, 1.6 + (1 - q) * 1.8, 'rgba(255,' + Math.round(210 - q * 90) + ',90,' + Math.min(1, (1 - q) * 1.3).toFixed(2) + ')');
    }
    glow(ctx, 1948, 692, 30, '#ff7a2a', 0.22 + Math.sin(now * 5) * 0.05);
    const { x, y } = SCALE_AT;
    ellipse(ctx, x + 5, y + 14, 22, 9, 0, 'rgba(0,0,0,0.28)');
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3);
    glow(ctx, 0, 0, 40, '#ff6a1a', 0.18 + Math.sin(now * 3) * 0.05);
    ellipse(ctx, 0, 0, 17, 25, 0, '#a8321a', OUT, 2.2); ellipse(ctx, -2, -2, 12, 19, 0, '#c8461f');
    for (const dy of [-12, -4, 4, 12]) { ctx.strokeStyle = 'rgba(70,14,8,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, dy + 4); ctx.quadraticCurveTo(0, dy - 4, 9, dy + 4); ctx.stroke(); }
    ellipse(ctx, 0, 0, 17, 25, 0, null, 'rgba(255,170,70,' + (0.5 + Math.sin(now * 3) * 0.15).toFixed(2) + ')', 1.6);
    ctx.restore();
  }
  // a light flurry drifting across the whole town
  function drawFlurry(ctx, now) {
    for (let i = 0; i < 90; i++) {
      const h1 = (i * 0.6180339) % 1, h2 = (i * 0.7548776 + 0.31) % 1, sp = 16 + (i % 5) * 5;
      const x = ((h1 * 2400 + now * 7 + Math.sin(now * 0.6 + i) * 14) % 2400 + 2400) % 2400, y = (h2 * 1700 + now * sp) % 1700;
      circle(ctx, x, y, 1.1 + (i % 3) * 0.45, 'rgba(244,250,255,' + (0.45 + (i % 4) * 0.08).toFixed(2) + ')');
    }
  }
  // the snow family by the Tankard (drawn as entities, so heroes pass in front of and behind them)
  const SNOWMEN = [{ x: 850, y: 812, s: 1.15, c: '#c84a4a' }, { x: 896, y: 836, s: 1, c: '#4a8ac8' }, { x: 824, y: 850, s: 0.68, c: '#e8c15a', grump: true }];
  function drawSnowman(ctx, m) {
    const { x, y, s } = m;
    ellipse(ctx, x + 3 * s, y + 4 * s, 13 * s, 6 * s, 0, 'rgba(0,0,0,0.22)');
    circle(ctx, x, y - 6 * s, 11 * s, '#f1f6fb', OUT, 1.8); circle(ctx, x - 3.5 * s, y - 9 * s, 4 * s, 'rgba(255,255,255,0.85)');
    circle(ctx, x, y - 19 * s, 8 * s, '#f6fafe', OUT, 1.6);
    line(ctx, x - 7.5 * s, y - 20 * s, x - 17 * s, y - 27 * s, '#4a3018', 1.7); line(ctx, x + 7.5 * s, y - 20 * s, x + 17 * s, y - 25 * s, '#4a3018', 1.7);
    circle(ctx, x, y - 29 * s, 6.3 * s, '#fcfeff', OUT, 1.6);
    rrect(ctx, x - 6.5 * s, y - 24.5 * s, 13 * s, 3 * s, 1.5, m.c, OUT, 1);
    circle(ctx, x - 2.3 * s, y - 30.5 * s, 0.9 * s, '#1c1c20'); circle(ctx, x + 2.3 * s, y - 30.5 * s, 0.9 * s, '#1c1c20');
    poly(ctx, [x - 0.9 * s, y - 28.3 * s, x + 0.9 * s, y - 28.3 * s, x, y - 24.6 * s], '#e8802a', OUT, 0.8);
    circle(ctx, x, y - 19 * s, 0.9 * s, '#1c1c20'); circle(ctx, x, y - 14 * s, 0.9 * s, '#1c1c20');
    if (m.grump) { line(ctx, x - 4 * s, y - 33 * s, x - 1 * s, y - 31.8 * s, '#1c1c20', 1); line(ctx, x + 4 * s, y - 33 * s, x + 1 * s, y - 31.8 * s, '#1c1c20', 1); }
  }
  // Quill's workshop on the bank: a chalk circle of seven small circles (four of them lit with an element), puddles, a pail, a chalk-box
  const CHALK = { x: 470, y: 1215 };
  const ELEM = ['#ff7a3a', '#8fd8ff', '#ffe45a', '#b07aff'];
  function drawChalkCircle(ctx, now) {
    const c = CHALK, T = Math.PI * 2;
    glow(ctx, c.x, c.y, 112, '#5ad0c0', 0.1 + Math.sin(now * 1.3) * 0.03);
    for (const [dx, dy, rx, ry] of [[-62, 46, 22, 9], [46, 62, 16, 7], [76, -18, 12, 6], [-16, -74, 14, 6], [-92, -10, 10, 5]]) ellipse(ctx, c.x + dx, c.y + dy, rx, ry, 0, 'rgba(84,150,176,0.34)', 'rgba(210,238,248,0.3)', 1);
    circle(ctx, c.x, c.y, 80, null, 'rgba(244,240,226,0.5)', 2); circle(ctx, c.x, c.y, 72, null, 'rgba(244,240,226,0.32)', 1.2);
    const pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * T - Math.PI / 2 + now * 0.12; pts.push([c.x + Math.cos(a) * 50, c.y + Math.sin(a) * 50]); }
    ctx.save(); ctx.strokeStyle = 'rgba(244,240,226,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 7; i++) { const [x, y] = pts[(i * 2) % 7]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    pts.forEach(([x, y], i) => {
      const lit = i < 4, col = lit ? ELEM[i] : '#e8e2d0';
      if (lit) glow(ctx, x, y, 17, col, 0.22 + Math.sin(now * 2 + i * 1.6) * 0.08);
      circle(ctx, x, y, 7, null, 'rgba(244,240,226,0.62)', 1.6); if (lit) circle(ctx, x, y, 2.4, col);
    });
    circle(ctx, c.x, c.y, 13, null, 'rgba(244,240,226,0.55)', 1.5); circle(ctx, c.x, c.y, 4, 'rgba(160,236,224,' + (0.5 + Math.sin(now * 2.4) * 0.2).toFixed(2) + ')');
    // the pail and the chalk-box at the circle's edge
    ellipse(ctx, c.x + 94, c.y + 56, 11, 5, 0, 'rgba(0,0,0,0.25)');
    circle(ctx, c.x + 92, c.y + 50, 9, '#8a5e32', OUT, 1.8); circle(ctx, c.x + 92, c.y + 50, 6, '#4a7a9a'); circle(ctx, c.x + 90, c.y + 48, 1.8, 'rgba(255,255,255,0.4)');
    rrect(ctx, c.x - 98, c.y + 46, 22, 12, 2, '#c8b48a', OUT, 1.4); line(ctx, c.x - 94, c.y + 49, c.x - 80, c.y + 49, '#f6f2e6', 1.6); line(ctx, c.x - 94, c.y + 53, c.x - 82, c.y + 53, '#f6f2e6', 1.6);
  }
  // the wishing pool: coins glinting on the basin floor, nine soft lights round the rim, a ripple when someone makes a wish
  const VOICE_COL = ['#a8e04a', '#4a9ae8', '#b05ae0', '#ff7a3a', '#bfe8ff', '#ffe45a', '#9a9a90', '#7a8a3a', '#e8c15a'];
  const POOL_AT = { x: 1200, y: 960 };
  let wishFx = null;   // { t0, col }: the ripple of the last toss
  function drawWishingPool(ctx, now) {
    const F = POOL_AT;
    for (let i = 0; i < 13; i++) {
      const a = i * 2.4 + 0.7, rr = 22 + (i * 37) % 40, tw = 0.5 + 0.5 * Math.sin(now * 2.2 + i * 1.7);
      circle(ctx, F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr, 2.1, 'rgba(236,196,90,' + (0.5 + tw * 0.3).toFixed(2) + ')');
      if (tw > 0.93) drawSpark(ctx, F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr, 3.4, (tw - 0.93) / 0.07);
    }
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 - Math.PI / 2, p = (Math.sin(now * 1.4 - k * 0.7) + 1) / 2, x = F.x + Math.cos(a) * 75, y = F.y + Math.sin(a) * 75;
      glow(ctx, x, y, 13, VOICE_COL[k], 0.14 + p * 0.26); circle(ctx, x, y, 2.2, VOICE_COL[k], OUT, 0.8);
    }
    if (wishFx) for (let i = 0; i < 3; i++) {
      const q = (now - wishFx.t0 - i * 0.28) / 1.7;
      if (q > 0 && q < 1) circle(ctx, F.x, F.y, 10 + q * 60, null, wishFx.col, 2.2 * (1 - q) + 0.5);
    }
  }
  // a boss cleared on Extreme: one quiet mark on its pedestal, a thin pale arc along the front rim with a small diamond at its middle. The trophy and the
  // Hard+ flame stand at the plinth's right edge, so the front of the rim is always clear of both
  function drawExtremeMark(ctx, x, y) {
    const R = 57 * PED_S;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(190,218,238,0.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, R, Math.PI * 0.36, Math.PI * 0.64); ctx.stroke();
    ctx.restore();
    poly(ctx, [x, y + R - 3.6, x + 2.8, y + R, x, y + R + 3.6, x - 2.8, y + R], '#dcecf7', '#4a6378', 1);
  }
  // ---------------------------------------------------------------- Season 2's way in: a line of moonlight on the pond
  // A single straight bar on the water beside Bram, lying where it lies whatever the hour. It shows once the Ultimate has been cleared and its epilogue read (the
  // first visit after: flag 'moon-road'); nothing of it before. Stepping onto its shore end (main.js) or using it opens the Raid Board on Season 2 alone.
  const POND_AT = { x: 590, y: 1370, rx: 120, ry: 62 };   // (pastimes.js POND: the water the line lies on)
  const MOON = { x: 650 };
  MOON.y0 = POND_AT.y - POND_AT.ry * Math.sqrt(1 - ((MOON.x - POND_AT.x) / POND_AT.rx) ** 2);   // where it meets the north shore, and where it leaves by the south
  MOON.y1 = 2 * POND_AT.y - MOON.y0;
  let moonBorn = null;   // (the moment it appeared in this session, so it comes up slowly; null once it was there before the page loaded)
  const storyRead = k => { const p = Save.get('pastimes'); return !!(p && p.story && p.story[k]); };
  const epilogueRead = () => storyRead('epilogue');
  // the Silver Road's own epilogue (pastimes.js, after the finale's first clear): the line is gone from then on, and a plain reflection of the Moon lies where it began
  const roadGone = () => !!deps && deps.beaten('maelis') && storyRead('epilogue2');
  let goneAt;   // (undefined until first asked; null while the line is there; a time once it went in this session; -Infinity if it was gone before the page loaded)
  function roadGoneK(now) {
    const g = roadGone();
    if (goneAt === undefined) goneAt = g ? -Infinity : null;
    else if (g && goneAt === null) goneAt = now;
    else if (!g) goneAt = null;
    return goneAt === null ? 0 : Math.min(1, (now - goneAt) / 6);
  }
  const moonReady = () => !!deps && deps.beaten('sovereign') && epilogueRead();
  const moonRoadOn = () => !!deps && deps.beaten('sovereign') && !!state().flags['moon-road'];
  // the stepping-on spot: the shore end, where you stand when you walk down the bank to it
  const moonRoad = () => (moonRoadOn() ? { x: MOON.x, y: MOON.y0 + 4, r: 26 } : null);
  // the player's own clock, as a smooth 0..1: the day is 0, 21:00 to 05:00 is 1, with two hours of dusk and of dawn
  function nightK() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    const k = h >= 21 || h < 5 ? 1 : h >= 19 ? (h - 19) / 2 : h < 7 ? 1 - (h - 5) / 2 : 0;
    return k * k * (3 - 2 * k);
  }
  function drawMoonRoad(ctx, now, fade = 1) {
    const t = moonBorn == null ? 1 : Math.min(1, (now - moonBorn) / 9), up = t * t * (3 - 2 * t) * fade;
    if (up <= 0) return;
    const n = nightK(), a = up * (0.55 + 0.45 * n), x = MOON.x, y0 = MOON.y0, y1 = MOON.y1, len = y1 - y0;
    const rgba = (c, al) => 'rgba(' + c + ',' + Math.max(0, al).toFixed(3) + ')';
    const vert = (ya, yb, stops) => { const g = ctx.createLinearGradient(0, ya, 0, yb); for (const [o, c, al] of stops) g.addColorStop(o, rgba(c, al)); return g; };
    ctx.save();
    ctx.beginPath(); ctx.ellipse(POND_AT.x, POND_AT.y, POND_AT.rx + 1.5, POND_AT.ry + 1.5, 0, 0, Math.PI * 2); ctx.clip();
    // the water either side of it lies darker, so the light is the only thing on it
    const dk = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
    dk.addColorStop(0, 'rgba(6,16,34,0)'); dk.addColorStop(0.5, rgba('6,16,34', 0.42 * (0.45 + 0.55 * n) * up)); dk.addColorStop(1, 'rgba(6,16,34,0)');
    ctx.fillStyle = dk; ctx.fillRect(x - 34, y0 - 4, 68, len + 8);
    // the bar: three thin layers, soft at the edge and bright in the middle, brightest at the shore and thinning out toward the far bank. Nothing in it moves
    for (const [hw, al] of [[11, 0.07], [8.5, 0.09], [6.2, 0.12], [4.2, 0.16], [2.6, 0.2], [1.3, 0.24]]) {
      ctx.fillStyle = vert(y0, y1, [[0, '226,236,250', al * a * 1.5], [0.5, '200,218,242', al * a], [0.86, '186,208,238', al * a * 0.55], [1, '186,208,238', 0]]);
      ctx.fillRect(x - hw, y0 - 4, hw * 2, len + 8);
    }
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y0 + 3, 30, '#bcd4f0', (0.09 + 0.2 * n) * up);   // where it meets the shore
    glow(ctx, x, y0 + len * 0.5, 40, '#a8c6ec', (0.025 + 0.06 * n) * up);
    ctx.restore();
    // a faint mist over it, drifting so slowly it hardly seems to, hanging a little over the bank at the near end
    for (let i = 0; i < 7; i++) {
      const p = (now * 0.012 + i / 7) % 1, my = y0 - 8 + p * (len + 14), mx = x + Math.sin(now * 0.12 + i * 2.3) * 10;
      glow(ctx, mx, my, 15 + (i % 3) * 5, '#d6e2f0', 0.11 * Math.sin(p * Math.PI) * (0.5 + 0.5 * n) * up);
    }
  }

  // what the pond holds once the line is gone (drawMoonRoad, drawGround): the ordinary reflection of the Moon at the shore end of where it lay, a soft smear of
  // pale light with a few glints that come and go, brighter at night. Nothing straight about it; stepping onto it still opens the board (moonRoad)
  function drawMoonPool(ctx, now, k) {
    const n = nightK(), x = MOON.x, y = MOON.y0 + 15, a = k * (0.5 + 0.5 * n);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(POND_AT.x, POND_AT.y, POND_AT.rx + 1.5, POND_AT.ry + 1.5, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 30, '#bcd0ec', (0.07 + 0.16 * n) * k);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 9; i++) {
      const gy = y - 15 + i * 4.2 + Math.sin(now * 0.5 + i * 1.7) * 1.4, w = 9 - Math.abs(i - 4) * 1.3 + Math.sin(now * 0.8 + i * 2.3) * 2, gx = x + Math.sin(now * 0.35 + i * 1.1) * 3;
      const al = a * (0.12 + 0.2 * (0.5 + 0.5 * Math.sin(now * 0.9 + i * 2.1)));
      ctx.fillStyle = 'rgba(232,240,252,' + Math.max(0, al).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(gx, gy, Math.max(1.5, w), 0.9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the stray (Garrow's town addition)
  // A lean, mist-grey hound with no collar that follows the child Pip about a little way behind her. It sits when she stops, and now and then turns its head
  // toward the pond. Drawn as an entity (heroes pass in front of and behind it).
  let stray = null;
  const strayHere = () => !!deps && deps.beaten('garrow') && !!state().seen.garrow;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  function tickStray(pip, dt, now) {
    if (!stray) stray = { x: pip.x - 52, y: pip.y + 40, angle: -0.6, moving: false, sit: 1, still: 2, born: now, yaw: 0, look: 0, nextLook: now + 5, step: 0 };
    const d = stray, dx = pip.x - d.x, dy = pip.y - d.y, dist = Math.hypot(dx, dy) || 1;
    if (dist > 340) { d.x = pip.x - 52; d.y = pip.y + 40; d.moving = false; }   // (left far behind: it is beside her again)
    if (!d.moving && dist > 58) d.moving = true; else if (d.moving && dist < 38) d.moving = false;
    if (d.moving) {
      const tx = pip.x - dx / dist * 34, ty = pip.y - dy / dist * 34, ex = tx - d.x, ey = ty - d.y, ed = Math.hypot(ex, ey) || 1;
      const st = Math.min(ed, Math.min(ed * 3.2, dist > 170 ? 130 : 68) * dt);
      d.x += ex / ed * st; d.y += ey / ed * st; d.step += st * 0.34;
      d.angle = angTo(d.angle, Math.atan2(ey, ex), Math.min(1, dt * 9));
      deps.collide(d);
    }
    d.still = d.moving ? 0 : d.still + dt;
    d.sit += ((d.still > 0.9 ? 1 : 0) - d.sit) * Math.min(1, dt * 5);
    if (!d.moving) {
      d.angle = angTo(d.angle, Math.atan2(dy, dx), Math.min(1, dt * 2.5));
      if (d.sit > 0.9 && now > d.nextLook) { d.look = now + 2.4 + Math.random() * 1.2; d.nextLook = now + 10 + Math.random() * 9; }
    }
    const yawTo = !d.moving && now < d.look ? clamp(angDiff(Math.atan2(POND_AT.y - d.y, POND_AT.x - d.x), d.angle), -1.1, 1.1) : 0;
    d.yaw += (yawTo - d.yaw) * Math.min(1, dt * 3);
  }
  function drawStray(ctx, d, scale, now) {
    const k = d.sit, FUR = '#aeb7c2', LIGHT = '#ccd4de', DARK = '#7f8a99', sw = d.moving ? Math.sin(d.step) : 0;
    ctx.save(); ctx.translate(d.x, d.y); ctx.scale(scale * 0.7, scale * 0.7); ctx.globalAlpha = Math.min(1, (now - d.born) / 3);
    ellipse(ctx, 1, 4, 15 - k * 3, 7, 0, 'rgba(0,0,0,0.26)');
    ctx.rotate(d.angle);
    const cx = -2 - k * 2.5, rx = 11 - k * 2.4, ry = 4.3 + k * 0.7, lerp = (a, b) => a + (b - a) * k;
    // four paws: a diagonal stride when it walks, the hind ones tucked wide and the fore ones set straight when it sits
    for (const sd of [-1, 1]) {
      const ph = sw * 3 * sd;
      ellipse(ctx, lerp(7 + ph, 8.5), sd * lerp(4.4, 2.8), 2.7, 1.9, 0, FUR, OUT, 1.2);
      ellipse(ctx, lerp(-7 - ph, -5.5), sd * lerp(4.4, 5.8), 2.9, 2, 0, FUR, OUT, 1.2);
    }
    // the tail: a thin trailing line, curled round to one side when it sits
    const tl = Math.sin(now * 2.1 + d.x * 0.01) * 1.6, tx = lerp(-19, -13), ty = lerp(tl + sw * 1.4, 7);
    limb(ctx, [cx - rx + 1, 0, (cx - rx + tx) / 2 - 1, lerp(tl * 0.4, 3.5), tx, ty], FUR, 2);
    circle(ctx, tx, ty, 1.5, DARK);
    ellipse(ctx, cx, 0, rx, ry, 0, FUR, OUT, 1.6);
    ellipse(ctx, cx - 0.5, -0.9, rx * 0.66, ry * 0.3, 0, LIGHT);
    // the head, turned about the neck by the look toward the pond
    ctx.save(); ctx.translate(lerp(8, 6.4), 0); ctx.rotate(d.yaw);
    poly(ctx, [2.6, -2.2, -0.4, -6.4, -1, -2.4], DARK, OUT, 1.2); poly(ctx, [2.6, 2.2, -0.4, 6.4, -1, 2.4], DARK, OUT, 1.2);
    circle(ctx, 3.2, 0, 4.4, FUR, OUT, 1.5);
    ellipse(ctx, 8.4, 0, 3.4, 2.3, 0, LIGHT, OUT, 1.3);
    circle(ctx, 11.2, 0, 1.15, '#2a2630');
    circle(ctx, 5.8, -1.9, 0.75, OUT); circle(ctx, 5.8, 1.9, 0.75, OUT);
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- the looking-glass (Vesper's town addition)
  // A tall standing glass in a plain silver frame at the Tankard's right-hand corner, where the deck begins. Whoever stands in front of it is in it, small and
  // pale, but where they were a moment ago. Drawn as an entity (heroes pass in front of and behind it) and solid.
  const GLASS = { x: 668, y: 772 };
  const GLASS_LAG = 1.15;
  const glassHist = [];   // the local hero's last moments: [time, x, y]
  function tickGlass(now) {
    const p = deps.player; if (!p) return;
    const last = glassHist[glassHist.length - 1];
    if (last && now < last[0]) glassHist.length = 0;   // (the clock went back: a new session of the town)
    if (!last || now - last[0] > 0.04) glassHist.push([now, p.x, p.y]);
    while (glassHist.length > 2 && glassHist[1][0] < now - GLASS_LAG - 0.6) glassHist.shift();
  }
  function lagged(now) {
    const t = now - GLASS_LAG;
    for (let i = glassHist.length - 1; i >= 0; i--) if (glassHist[i][0] <= t) return t - glassHist[i][0] < 0.7 ? glassHist[i] : null;
    return null;
  }
  function drawGlass(ctx, now) {
    const { x, y } = GLASS, W = 14, Hh = 34, cy = y - 42;   // (half-width, half-height of the glass, and its centre)
    ellipse(ctx, x + 3, y + 3, 21, 6, 0, 'rgba(0,0,0,0.26)');
    line(ctx, x - W, cy + Hh, x - W - 8, y + 1, OUT, 4); line(ctx, x - W, cy + Hh, x - W - 8, y + 1, '#8f9db1', 2);   // the two feet
    line(ctx, x + W, cy + Hh, x + W + 8, y + 1, OUT, 4); line(ctx, x + W, cy + Hh, x + W + 8, y + 1, '#8f9db1', 2);
    rrect(ctx, x - W - 4, cy - Hh - 4, (W + 4) * 2, (Hh + 4) * 2, 13, '#8f9db1', OUT, 2);
    circle(ctx, x, cy - Hh - 8, 3.3, '#d3dbe6', OUT, 1.4);   // a small finial on the frame
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x - W, cy - Hh, W * 2, Hh * 2, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - Hh, 0, cy + Hh);
    g.addColorStop(0, '#e6eef7'); g.addColorStop(0.55, '#b5c3d6'); g.addColorStop(1, '#8d9db4');
    ctx.fillStyle = g; ctx.fillRect(x - W, cy - Hh, W * 2, Hh * 2);
    // the room behind whoever looks: two lit windows, dim
    for (const wx of [-9, 5]) rrect(ctx, x + wx, cy - Hh + 5, 6, 8, 1, 'rgba(255,208,138,0.55)');
    // the one who stands there, a moment late
    const q = lagged(now);
    if (q) {
      const dx = q[1] - x, dy = q[2] - y;
      if (dy > 8 && dy < 260 && Math.abs(dx) < 150) {
        const sc = clamp(1.05 - dy / 330, 0.5, 1), fx = x + clamp(dx * 0.15, -W + 7, W - 7), fy = cy + Hh - 9 * sc;
        ctx.globalAlpha = 0.88;
        ellipse(ctx, fx, fy - 9 * sc, 6.5 * sc, 9.5 * sc, 0, '#f1f5fb', 'rgba(60,76,100,0.8)', 1.1);
        circle(ctx, fx, fy - 23 * sc, 4.4 * sc, '#f7f9fd', 'rgba(60,76,100,0.8)', 1.1);
        ctx.globalAlpha = 1;
      }
    }
    // a slant of light across the glass
    poly(ctx, [x - W, cy - 6, x - W, cy - 20, x + W, cy - Hh - 4, x + W, cy - Hh + 14], 'rgba(255,255,255,0.22)');
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x - W - 2.6, cy - Hh - 2.6, (W + 2.6) * 2, (Hh + 2.6) * 2, 12); ctx.stroke();
  }

  // ---------------------------------------------------------------- the tide-post (Ormun's town addition)
  // A weathered post driven into the shallows at the west end of the pond, with marks cut up one side and a thin silver collar at its head. A band of dark, wet wood
  // rises and falls up it over about four minutes, and the water round its foot is never quite still. Bram reads it (town-npcs.js). Drawn as an entity.
  const POST = { x: 486, y: 1394 };
  function drawTidePost(ctx, now) {
    const { x, y } = POST, T = Math.PI * 2;
    ellipse(ctx, x, y + 2, 17, 6.5, 0, 'rgba(10,28,44,0.45)');
    for (let i = 0; i < 2; i++) { const q = (now * 0.3 + i * 0.5) % 1; ellipse(ctx, x, y + 2, 8 + q * 20, 3 + q * 8, 0, null, 'rgba(220,238,250,' + (0.4 * (1 - q)).toFixed(2) + ')', 1); }
    const top = y - 84;
    rrect(ctx, x - 5, top, 10, 86, 2.5, '#9b8c76', OUT, 1.6);
    const lvl = 12 + 34 * (0.5 + 0.5 * Math.sin(now * T / 240 - 1));   // how high the wet runs (px above the water)
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 5, top, 10, 86, 2.5); ctx.clip();
    ctx.fillStyle = 'rgba(52,44,36,0.62)'; ctx.fillRect(x - 6, y - lvl, 12, lvl + 2);
    ctx.fillStyle = 'rgba(214,230,244,0.55)'; ctx.fillRect(x - 6, y - lvl - 1, 12, 1.4);
    line(ctx, x - 2.4, top + 3, x - 2.4, y, 'rgba(255,255,255,0.14)', 1.4);
    ctx.restore();
    // the marks: a notch to the right of the post every hand's breadth, longer at every third, and a small cut across the post at the long ones
    for (let i = 1; i <= 7; i++) {
      const my = y - 8 - i * 10, long = i % 3 === 0;
      line(ctx, x + 5, my, x + (long ? 13 : 9), my, OUT, 2.4); line(ctx, x + 5, my, x + (long ? 13 : 9), my, '#cfc4ae', 1.1);
      if (long) line(ctx, x - 5, my, x + 5, my, 'rgba(40,32,24,0.7)', 1);
    }
    rrect(ctx, x - 6.2, top - 1, 12.4, 5.5, 1.5, '#c9d2de', OUT, 1.3);   // the collar: the one bright thing on it
    line(ctx, x - 4.6, top + 0.8, x + 2, top + 0.8, 'rgba(255,255,255,0.75)', 1);
  }

  // ---------------------------------------------------------------- the Moon Koi (Maelis's town addition)
  // On clear nights (the player's own clock, dusk to dawn, as the line of light) a long pale fish comes up through the pond to its surface a little west of where
  // the line begins, turns a slow circle with the Moon on its back, and goes down again, a ring spreading where it was. Drawn on the ground layer, over the water.
  const KOI = { x: MOON.x - 36, y: POND_AT.y + 4, rx: 17, ry: 8, per: 41 };
  function drawMoonKoi(ctx, now) {
    const n = nightK();
    if (n < 0.45) return;
    const t = now % KOI.per, sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
    const up = sm((t - 4) / 3.4) * (1 - sm((t - 15) / 3.4));
    for (const [t0, big] of [[4, 1], [18.4, 0.7]]) {   // the ring where it comes up, and the one where it goes down
      const q = (t - t0) / 3.4;
      if (q > 0 && q < 1) ellipse(ctx, KOI.x + Math.cos(0.4) * KOI.rx, KOI.y + Math.sin(0.4) * KOI.ry, 4 + q * 34 * big, 2 + q * 16 * big, 0, null, 'rgba(226,238,252,' + (0.5 * (1 - q) * n).toFixed(2) + ')', 1.2);
    }
    if (up <= 0.01) return;
    const a = (t - 4) * 0.34 + 0.4, hx = KOI.x + Math.cos(a) * KOI.rx, hy = KOI.y + Math.sin(a) * KOI.ry, dir = Math.atan2(Math.cos(a) * KOI.ry, -Math.sin(a) * KOI.rx);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(POND_AT.x, POND_AT.y, POND_AT.rx - 2, POND_AT.ry - 2, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, hx, hy, 26, '#b8cdea', 0.1 * up * n); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(hx, hy); ctx.rotate(dir);
    ctx.globalAlpha = up * 0.85;
    // the tail, a fin each side, the body in three lengths swaying behind the head, and the head with two small dark eyes
    const sw = Math.sin(now * 1.6) * 2;
    poly(ctx, [-17, sw, -26, -5 + sw * 1.6, -24, sw * 0.8, -26, 5 + sw * 1.6], 'rgba(214,226,244,0.8)');
    poly(ctx, [-6, -2, -10, -9, -2, -3], 'rgba(214,226,244,0.8)'); poly(ctx, [-6, 2, -10, 9, -2, 3], 'rgba(214,226,244,0.8)');
    ellipse(ctx, -12, sw * 0.5, 7, 3, 0, '#d9e3f2'); ellipse(ctx, -4, sw * 0.2, 8, 4.2, 0, '#e8eef8'); ellipse(ctx, 4, 0, 6, 3.8, 0, '#f2f6fc');
    ellipse(ctx, -3, -1.5, 5, 1.3, 0, 'rgba(255,255,255,0.7)');
    circle(ctx, 6.5, -1.9, 0.9, '#2a3246'); circle(ctx, 6.5, 1.9, 0.9, '#2a3246');
    ctx.restore();
  }

  // the ground layer (decor and trophies) and the folk themselves (as entities sorted with everyone else)
  function drawGround(ctx, now, pedestals, bossIds) {
    if (!deps) return;
    for (const [b, u] of Object.entries(UNLOCKS)) {
      if (!deps.beaten(b) || !state().seen[b]) continue;
      if (u.decor) drawDecor(ctx, u.decor, now);
      const i = bossIds.indexOf(b);
      if (u.trophy && pedestals[i]) drawTrophy(ctx, u.trophy, pedestals[i].x + 52 * PED_S, pedestals[i].y + 18 * PED_S, now);
      if (u.trophy && pedestals[i] && deps.heat && typeof HARDPLUS !== 'undefined') HARDPLUS.flame(ctx, pedestals[i].x + 52 * PED_S, pedestals[i].y + 8 * PED_S, deps.heat(b), now, PED_S);   // (Hard+: a flame over the trophy, bigger with the best heat cleared)
      if (pedestals[i] && deps.extreme && deps.extreme(b)) drawExtremeMark(ctx, pedestals[i].x, pedestals[i].y);   // (Extreme: the quiet mark on the rim)
    }
    if (deps.beaten('sovereign') || (typeof SvRewards !== 'undefined' && SvRewards.TEST)) drawSovereignPlinth(ctx, now);
    if (deps.beaten('seraph') || (typeof UnRewards !== 'undefined' && UnRewards.TEST)) drawUnspokenPlinth(ctx, now);
    if (deps.beaten('seraph') || (typeof UnRewards !== 'undefined' && UnRewards.TEST)) { drawFrostRim(ctx, now); if (nightNow() || (typeof UnRewards !== 'undefined' && UnRewards.TEST)) drawUpSnow(ctx, now); }
    drawSilverRoad(ctx, now);
    if (moonRoadOn()) {
      // once the finale's epilogue has been read the straight line is gone and the pond holds a plain reflection of the Moon at the same spot (the way in stays, see moonRoad)
      const k = roadGoneK(now);
      if (k < 1) drawMoonRoad(ctx, now, 1 - k);
      if (k > 0) drawMoonPool(ctx, now, k);
    }
    groundMeal(ctx, now);
  }
  function entities(scale) {
    const out = folk.filter(f => deps && present(f)).map(f => ({ kind: 'stagecraft', y: f.y, draw: ctx => drawFolk(ctx, f, scale) }));
    if (stray && strayHere()) out.push({ kind: 'stagecraft', y: stray.y, draw: ctx => drawStray(ctx, stray, scale, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('titan') && state().seen.titan) for (const m of SNOWMEN) out.push({ kind: 'stagecraft', y: m.y, draw: ctx => drawSnowman(ctx, m) });
    if (deps && deps.beaten('corvane') && state().seen.corvane) for (const l of PASS_LANTERNS) out.push({ kind: 'stagecraft', y: l.y, draw: ctx => drawPassLantern(ctx, l, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('brannoc') && state().seen.brannoc) for (const b of SUN_BANNERS) out.push({ kind: 'stagecraft', y: b.y, draw: ctx => drawSunBanner(ctx, b, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('morrowoak') && state().seen.morrowoak) for (const t of SEEDLINGS) out.push({ kind: 'stagecraft', y: t.y, draw: ctx => drawSeedling(ctx, t, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('vesper') && state().seen.vesper) out.push({ kind: 'stagecraft', y: GLASS.y, draw: ctx => drawGlass(ctx, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('ormun') && state().seen.ormun) out.push({ kind: 'stagecraft', y: POST.y, draw: ctx => drawTidePost(ctx, deps.now ? deps.now() : 0) });
    if (deps && deps.beaten('caelum') && state().seen.caelum) { const g = starGlassAt(); if (g) out.push({ kind: 'stagecraft', y: g.y, draw: ctx => drawStarGlass(ctx, g, deps.now ? deps.now() : 0) }); }
    if (feastSc) {
      for (const d of feastSc.diners) out.push({ kind: 'stagecraft', y: d.y, draw: ctx => drawDiner(ctx, d, scale) });
      out.push({ kind: 'stagecraft', y: 99999, draw: ctx => drawMealOver(ctx, feastSc ? feastSc.now : 0) });
    }
    return out;
  }
  // names over the folk you're near, and anyone's speech bubble
  function drawLabels(ctx, label, near) {
    for (const f of folk) {
      if (!deps || !present(f)) continue;
      if (near(f)) label(ctx, f.d.name, f.x, f.y - 34, '#cfe0b0', 11);
      if (f.bubble) bubble(ctx, f.x, f.y - (feastSc ? 92 : 52), f.bubble);
    }
    if (feastSc) for (const d of feastSc.diners) label(ctx, d.name.slice(0, 14), d.x, d.i < 2 ? d.y - 36 - (d.i % 2) * 12 : d.y + 38 + (d.i % 2) * 12, d.me ? '#fff3d8' : (typeof ROLES !== 'undefined' && ROLES[d.cls.role] ? ROLES[d.cls.role].color : '#dffaff'), 11);
  }
  function bubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '13px Georgia, serif';
    const words = text.split(' '), lines = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 240 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12;
    ctx.fillStyle = 'rgba(16,13,10,0.92)'; ctx.strokeStyle = '#c89a5a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y); ctx.fill();
    ctx.fillStyle = '#f2e6c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, y - h + 6 + i * 17));
    ctx.restore();
  }

  // ---------------------------------------------------------------- the camp kitchen
  // Gaspard's corner of the town (south-west of the plaza): a chopping table, the stove and its pot, a rack of pans and
  // herbs, and the long table where a feast is eaten. It stands once he has arrived. Everything is in world coordinates.
  const K = {
    chop: { x: 752, y: 1000, w: 64, h: 36 },
    stove: { x: 838, y: 1048, r: 20 },
    rack: { l: 748, r: 862, base: 1000, bar: 962 },
    table: { x: 846, y: 1092, w: 154, h: 50 },
    benchN: { x: 852, y: 1070, w: 142, h: 14 }, benchS: { x: 852, y: 1150, w: 142, h: 14 },
    seats: [{ x: 888, y: 1078, a: Math.PI / 2 }, { x: 958, y: 1078, a: Math.PI / 2 }, { x: 888, y: 1156, a: -Math.PI / 2 }, { x: 958, y: 1156, a: -Math.PI / 2 }],
    plates: [{ x: 888, y: 1108 }, { x: 958, y: 1108 }, { x: 888, y: 1126 }, { x: 958, y: 1126 }],
    dish: { x: 923, y: 1117 },
    cookAt: { x: 824, y: 1117 },   // where he sets the dish down from
  };
  let collidersOn = false;
  function addColliders() {
    if (collidersOn || typeof COLLIDERS === 'undefined') return;
    collidersOn = true;
    for (const r of [K.chop, K.table, K.benchN, K.benchS]) COLLIDERS.rects.push({ x: r.x, y: r.y, w: r.w, h: r.h });
    COLLIDERS.circles.push({ x: K.stove.x, y: K.stove.y, r: K.stove.r }, { x: K.rack.l, y: K.rack.base, r: 6 }, { x: K.rack.r, y: K.rack.base, r: 6 },
      { x: 736, y: 1024, r: 12 }, { x: 884, y: 1036, r: 11 });
  }
  function wisps(ctx, x, y, now, n, h, w, a, seed = 0) {
    for (let i = 0; i < n; i++) {
      const p = (now * 0.42 + i / n + seed) % 1;
      circle(ctx, x + Math.sin(now * 1.7 + i * 2.3 + seed * 9) * w * p, y - p * h, 2 + p * 5, `rgba(246,240,228,${(a * Math.sin(p * Math.PI)).toFixed(3)})`);
    }
  }
  function drawKitchen(ctx, now) {
    const fl = Math.sin(now * 7) * 0.05 + Math.sin(now * 11.3) * 0.03, sw = Math.sin(now * 1.3) * 1.5;
    // trampled earth under the camp, flagstones round the fire
    glow(ctx, 880, 1086, 200, '#6e5232', 0.5); glow(ctx, 880, 1086, 130, '#8e6c42', 0.32);
    for (const [dx, dy, w, h] of [[-26, 22, 15, 10], [-8, 28, 13, 9], [14, 26, 15, 10], [-30, -4, 11, 14], [30, 8, 12, 12]]) rrect(ctx, K.stove.x + dx - w / 2, K.stove.y + dy - h / 2, w, h, 3, '#9a9488', 'rgba(26,18,10,0.7)', 1.2);
    glow(ctx, 880, 1050, 170, '#ffb060', 0.1 + fl * 0.4);
    // sacks of flour and grain
    ellipse(ctx, 738, 1030, 14, 12, 0, 'rgba(0,0,0,0.25)');
    ellipse(ctx, 736, 1022, 13, 12, 0, '#c9ac78', OUT, 2); ellipse(ctx, 733, 1019, 6, 5, 0, '#dcc392');
    line(ctx, 730, 1011, 742, 1011, '#6a4a2a', 3); circle(ctx, 726, 1036, 9, '#bfa06c', OUT, 2); circle(ctx, 723, 1033, 4, '#d6bd8a');
    // chopping table: board, vegetables, a knife by the board
    const c = K.chop;
    rrect(ctx, c.x + 5, c.y + 8, c.w, c.h, 4, 'rgba(0,0,0,0.25)');
    rrect(ctx, c.x + 3, c.y + c.h - 5, 7, 12, 2, '#4a3018', OUT, 1.5); rrect(ctx, c.x + c.w - 10, c.y + c.h - 5, 7, 12, 2, '#4a3018', OUT, 1.5);
    rrect(ctx, c.x, c.y, c.w, c.h, 3, '#9d7142', OUT, 2.5);
    rrect(ctx, c.x, c.y + c.h - 9, c.w, 9, [0, 0, 3, 3], '#6e4a28');
    for (const py of [c.y + 11, c.y + 22]) line(ctx, c.x + 3, py, c.x + c.w - 3, py, 'rgba(60,36,16,0.35)', 1);
    rrect(ctx, c.x + 18, c.y + 5, 32, 20, 3, '#d3b57a', OUT, 1.5);
    for (let i = 0; i < 5; i++) { circle(ctx, c.x + 24 + i * 5, c.y + 10 + (i % 2) * 6, 2.4, '#e8802a', OUT, 0.8); circle(ctx, c.x + 24 + i * 5, c.y + 10 + (i % 2) * 6, 0.8, '#f6b36a'); }
    circle(ctx, c.x + 9, c.y + 12, 5.5, '#caa2b8', OUT, 1.5); circle(ctx, c.x + 8, c.y + 11, 2, '#e4c4d4');
    circle(ctx, c.x + 10, c.y + 26, 6, '#7fa24e', OUT, 1.5); line(ctx, c.x + 6, c.y + 26, c.x + 14, c.y + 26, '#a3c070', 1.2); line(ctx, c.x + 10, c.y + 21, c.x + 10, c.y + 31, '#a3c070', 1.2);
    ellipse(ctx, c.x + 56, c.y + 26, 3.5, 2.4, 0, '#b8a888', OUT, 1); ellipse(ctx, c.x + 53, c.y + 14, 3, 2, 0.4, '#ece6d0', OUT, 1);
    poly(ctx, [c.x + 40, c.y + 29, c.x + 53, c.y + 27, c.x + 53, c.y + 31], '#c4c8cc', OUT, 1); rrect(ctx, c.x + 53, c.y + 27.5, 8, 3.4, 1, '#6a4428', OUT, 1);
    // the rack behind: two posts, a beam, pans and herbs on hooks, a lantern at each end
    const R = K.rack;
    for (const px of [R.l, R.r]) { line(ctx, px, R.base, px, R.bar - 4, OUT, 8); line(ctx, px, R.base, px, R.bar - 4, '#6e4a28', 5); circle(ctx, px, R.base, 5, '#4a3018', OUT, 1.5); }
    line(ctx, R.l - 8, R.bar, R.r + 8, R.bar, OUT, 8); line(ctx, R.l - 8, R.bar, R.r + 8, R.bar, '#835a32', 5);
    for (const [hx, kind] of [[768, 'pan'], [790, 'ladle'], [812, 'pan2'], [834, 'herb'], [850, 'chilli']]) {
      const sx = sw * (hx - R.l) / 110;
      line(ctx, hx, R.bar + 2, hx + sx * 0.4, R.bar + 11, '#3a3a40', 1.4);
      if (kind === 'pan' || kind === 'pan2') {
        const r = kind === 'pan' ? 9 : 7;
        line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx * 0.4 + 1, R.bar + 11 + r + 6, OUT, 4); line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx * 0.4 + 1, R.bar + 11 + r + 6, '#5a5a62', 2);
        circle(ctx, hx + sx, R.bar + 24 + r * 0.6, r, '#45454d', OUT, 2); circle(ctx, hx + sx - 1, R.bar + 24 + r * 0.6 - 1, r - 3, '#5f5f69');
      } else if (kind === 'ladle') {
        line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx, R.bar + 30, OUT, 4); line(ctx, hx + sx * 0.4, R.bar + 11, hx + sx, R.bar + 30, '#8a8f96', 2); circle(ctx, hx + sx, R.bar + 33, 4.5, '#7d838a', OUT, 1.5);
      } else if (kind === 'herb') {
        for (const [ox, oy, col] of [[-4, 12, '#5f8a3a'], [3, 14, '#78a04a'], [0, 18, '#4f7a30'], [-3, 20, '#6c9640']]) ellipse(ctx, hx + sx + ox, R.bar + 8 + oy, 3.4, 6.5, ox * 0.06, col, OUT, 1);
        line(ctx, hx + sx - 4, R.bar + 15, hx + sx + 4, R.bar + 15, '#c8a868', 1.6);
      } else {
        for (const [ox, col] of [[-3, '#c8381e'], [3, '#d8481e']]) ellipse(ctx, hx + sx + ox, R.bar + 22, 2.4, 8, ox * 0.05, col, OUT, 1);
        line(ctx, hx + sx - 4, R.bar + 13, hx + sx + 4, R.bar + 13, '#c8a868', 1.6);
      }
    }
    for (const lx of [R.l, R.r]) {
      const lsx = lx + sw * 0.5;
      glow(ctx, lsx, R.bar + 22, 46, '#ffc060', 0.34 + fl);
      line(ctx, lsx, R.bar, lsx, R.bar + 9, '#3a3a40', 1.4);
      rrect(ctx, lsx - 4.5, R.bar + 9, 9, 13, 2, '#ffd98a', OUT, 1.6); line(ctx, lsx - 4.5, R.bar + 15, lsx + 4.5, R.bar + 15, '#5a3d22', 1.2);
      circle(ctx, lsx, R.bar + 16, 2.4, '#fff3c0');
    }
    // the stove: a ring of stones, the fire under a big pot that steams and bubbles
    const S = K.stove;
    ellipse(ctx, S.x + 3, S.y + 6, S.r + 4, S.r, 0, 'rgba(0,0,0,0.28)');
    glow(ctx, S.x, S.y, 58, '#ff9a3a', 0.34 + fl);
    circle(ctx, S.x, S.y, S.r, '#8a8478', OUT, 2.5);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2; line(ctx, S.x + Math.cos(a) * (S.r - 7), S.y + Math.sin(a) * (S.r - 7), S.x + Math.cos(a) * S.r, S.y + Math.sin(a) * S.r, 'rgba(26,18,10,0.65)', 1.4); }
    circle(ctx, S.x, S.y, S.r - 7, '#2a1c14');
    for (let i = 0; i < 3; i++) circle(ctx, S.x + Math.sin(now * 9 + i * 2) * 2.5 + (i - 1) * 6, S.y + 8 - (i % 2) * 2, 3.6 - i * 0.4, ['#ff6a1a', '#ffb03a', '#ffe68a'][i]);
    circle(ctx, S.x, S.y - 2, 15, '#3c3c44', OUT, 2.5);
    circle(ctx, S.x, S.y - 2, 12, '#a85a2a', OUT, 1.2); circle(ctx, S.x - 2, S.y - 4, 8, '#bc6c34');
    for (let i = 0; i < 5; i++) {
      const p = (now * 0.8 + i * 0.37) % 1, a = i * 2.1 + Math.floor(now * 0.8 + i * 0.37) * 1.3, rr = 3 + (i % 3) * 2.6;
      ctx.save(); ctx.globalAlpha = 1 - p; circle(ctx, S.x + Math.cos(a) * rr, S.y - 2 + Math.sin(a) * rr, 0.8 + p * 2.6, null, 'rgba(255,226,170,0.9)', 1); ctx.restore();
    }
    for (const sd of [-1, 1]) rrect(ctx, S.x + sd * 15 - 2.5, S.y - 5, 5, 6, 1.5, '#2c2c32', OUT, 1);
    // wood stacked by the fire
    for (const [dx, dy] of [[-4, 4], [4, 4], [0, -3]]) { ellipse(ctx, 884 + dx, 1038 + dy, 9, 4.5, 0.1, '#7a5230', OUT, 1.6); circle(ctx, 884 + dx + 8, 1038 + dy + 0.5, 3.4, '#c9a46a', OUT, 1); }
    // the communal table, a bench each side, plates and cups set for four
    const T = K.table;
    rrect(ctx, T.x + 6, T.y + 10, T.w, T.h, 5, 'rgba(0,0,0,0.26)');
    for (const b of [K.benchN, K.benchS]) {
      rrect(ctx, b.x, b.y + 4, b.w, b.h, 3, 'rgba(0,0,0,0.22)');
      for (const lx of [b.x + 6, b.x + b.w - 12]) rrect(ctx, lx, b.y + b.h - 3, 6, 9, 1.5, '#4a3018', OUT, 1.2);
      rrect(ctx, b.x, b.y, b.w, b.h, 3, '#8a6038', OUT, 2); line(ctx, b.x + 4, b.y + 4.5, b.x + b.w - 4, b.y + 4.5, 'rgba(255,230,180,0.18)', 1.2);
    }
    for (const lx of [T.x + 8, T.x + T.w - 15]) rrect(ctx, lx, T.y + T.h - 4, 8, 12, 2, '#4a3018', OUT, 1.5);
    rrect(ctx, T.x, T.y, T.w, T.h, 4, '#9d7142', OUT, 2.5);
    rrect(ctx, T.x, T.y + T.h - 9, T.w, 9, [0, 0, 4, 4], '#6e4a28');
    for (const py of [T.y + 12, T.y + 25, T.y + 38]) line(ctx, T.x + 3, py, T.x + T.w - 3, py, 'rgba(60,36,16,0.33)', 1);
    rrect(ctx, T.x + 14, T.y + 17, T.w - 28, 16, 2, '#e8dcc0'); line(ctx, T.x + 14, T.y + 17, T.x + T.w - 14, T.y + 17, '#b2403a', 1.6); line(ctx, T.x + 14, T.y + 33, T.x + T.w - 14, T.y + 33, '#b2403a', 1.6);
    K.plates.forEach((p, i) => {
      const n = i < 2 ? -1 : 1;
      circle(ctx, p.x, p.y, 8.5, '#ece4d0', OUT, 1.5); circle(ctx, p.x, p.y, 5.6, '#f8f2e4', 'rgba(60,40,20,0.35)', 0.8);
      line(ctx, p.x - 11, p.y - n * 4, p.x - 11, p.y + n * 4, '#b8bcc2', 1.6); line(ctx, p.x + 11, p.y - n * 4, p.x + 11, p.y + n * 4, '#b8bcc2', 1.6);
      circle(ctx, p.x + 16, p.y - n, 2.8, '#b8845a', OUT, 1);
    });
    // a lantern at the west end, a jug and a loaf basket at the east
    glow(ctx, T.x + 12, T.y + 25, 34, '#ffc060', 0.3 + fl);
    rrect(ctx, T.x + 8, T.y + 20, 8, 10, 2, '#ffd98a', OUT, 1.5); circle(ctx, T.x + 12, T.y + 25, 1.8, '#fff3c0');
    circle(ctx, T.x + T.w - 12, T.y + 31, 6, '#4f6e9a', OUT, 1.5); circle(ctx, T.x + T.w - 12, T.y + 31, 3, '#6a8ab8');
    ellipse(ctx, T.x + T.w - 11, T.y + 16, 8, 5.5, 0, '#a07a40', OUT, 1.5); ellipse(ctx, T.x + T.w - 11, T.y + 15, 5.5, 3, 0, '#d8a860');
    wisps(ctx, S.x, S.y - 14, now, 6, 46, 9, 0.5);
  }

  // ---------------------------------------------------------------- the meal itself: what each dish looks like
  // left: how much of it is still on the plate (1 whole ... 0 gone)
  function drawFood(ctx, id, x, y, s, left) {
    if (id === 'stew') {
      circle(ctx, x, y, 8.4 * s, '#e0d6bc', OUT, 1.5);
      if (left > 0.04) {
        circle(ctx, x, y, (3.2 + 3.4 * left) * s, '#a8582a');
        for (const [a, r, col] of [[0.4, 3, '#d08a4a'], [2.2, 3.8, '#7a9a3a'], [4, 2.6, '#d8a050'], [5.3, 4, '#c8783a']]) if (r * 0.9 < 3.6 * left + 1.5) circle(ctx, x + Math.cos(a) * r * s * left, y + Math.sin(a) * r * s * left, 1.3 * s, col);
      } else circle(ctx, x, y, 3 * s, 'rgba(150,80,40,0.45)');
    } else if (id === 'pie') {
      const r = 9 * s, a0 = -Math.PI / 2 - 0.4;
      if (left < 0.04) { circle(ctx, x, y, r, '#cbbfa0', OUT, 1.5); return; }
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a0, a0 + Math.PI * 2 * Math.min(1, left) - 0.001); ctx.closePath();
      ctx.fillStyle = '#c4803c'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.clip(); circle(ctx, x, y, r * 0.78, '#d9a054');
      for (let k = -2; k <= 2; k++) { line(ctx, x - r, y + k * 3 * s, x + r, y + k * 3 * s + 3 * s, 'rgba(130,70,24,0.55)', 1); line(ctx, x + k * 3 * s, y - r, x + k * 3 * s + 3 * s, y + r, 'rgba(130,70,24,0.55)', 1); }
      ctx.restore();
      if (left > 0.5) circle(ctx, x, y, 1.6 * s, '#5a2a14');
    } else if (id === 'broth') {
      circle(ctx, x, y, 6 * s, '#d9c8a0', OUT, 1.5);
      ellipse(ctx, x + 7.6 * s, y, 2.6 * s, 3.4 * s, 0, null, OUT, 2);
      circle(ctx, x, y, 4.6 * s, left > 0.05 ? '#e0a83a' : '#bda47a');
      if (left > 0.05) { circle(ctx, x - 1.2 * s, y - 1.2 * s, 1.6 * s, 'rgba(255,240,190,0.6)'); ctx.save(); ctx.globalAlpha = 0.6; circle(ctx, x, y, (1 - left) * 4.6 * s, '#bda47a'); ctx.restore(); }
    } else if (id === 'tarts') {
      circle(ctx, x, y, 9.4 * s, '#e8e0d0', OUT, 1.4);
      const N = s > 1.2 ? 5 : 3, n = Math.ceil(left * N - 0.001);
      for (let i = 0; i < n; i++) {
        const a = i / N * Math.PI * 2 + 0.5, rr = (N === 5 ? 4.6 : 3.4) * s * 0.9, tx = x + Math.cos(a) * rr, ty = y + Math.sin(a) * rr;
        circle(ctx, tx, ty, 3.3 * s, '#d8a050', OUT, 1); circle(ctx, tx, ty, 1.9 * s, i % 2 ? '#c0384a' : '#e8c15a');
      }
    }
  }
  // a dish in the chef's hands (drawn in his local space)
  function drawCarried(ctx, id) { ellipse(ctx, 1.5, 2.5, 8, 6, 0, 'rgba(0,0,0,0.22)'); circle(ctx, 0, 0, 7.2, '#ece4d0', OUT, 1.4); drawFood(ctx, id, 0, 0, 0.62, 1); }

  // ---------------------------------------------------------------- the eating cutscene
  // Someone orders: the camera eases to the long table, Gaspard carries the dish over and sets it down with a flourish, and
  // everyone in town (you and every other player's hero) sits and eats. About six seconds; moving, a key or a click skips
  // it, and leaving town (a fight, the portal) ends it at once. The real heroes are hidden meanwhile (hides) and a seated
  // copy of each is drawn in their place; an empty seat is just an empty seat.
  const WALK = 0.9, SERVE = 1.45, EAT0 = 1.7, HAPPY = 4.3, RET0 = 5.0, END = 5.8;
  const STAT_WORD = { hp: 'health', power: 'power', heal: 'healing', speed: 'speed' };
  const SAY = {
    stew: { serve: ['Scullery Stew! Thick enough to stand a spoon in.', 'Eleven years of peeling, now in a bowl. Eat!'], done: ['Not a drop left. The ogre never once cleared a bowl.', 'Hot, thick, gone. That is how stew should end.'] },
    pie: { serve: ['Pepper Pie, fresh. Mind the steam, mind your tongue.', 'Pepper Pie! Cry if you must. It is allowed.'], done: ['See? Nobody hits softly after a slice.', 'Crust, pepper, silence. The best review.'] },
    broth: { serve: ['Honeyroot Broth. Sip, do not gulp. It is not a race.', "Grandmother's broth, as it should taste. Mostly."], done: ['Healers ask for seconds. Always the healers.', 'Warm hands, warm hearts. Now go.'] },
    tarts: { serve: ['Quickfoot Tarts! Eat standing, run sitting. Whatever.', 'Tarts! Little, crisp, gone in two bites.'], done: ['The plate is empty before I turn around. Good.', 'Crumbs on the floor. Wonderful. Go!'] },
  };
  const BITE = { stew: 0.95, pie: 1.0, broth: 1.2, tarts: 0.72 };
  let feastSc = null;
  const ease = q => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
  const lerp = (a, b, k) => a + (b - a) * k;
  function angTo(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; }
  const snd = (n, o) => { try { if (typeof Sound !== 'undefined') Sound.play(n, o); } catch (e) { /* sound never stops a scene */ } };
  const mealLine = (m, by) => `${by ? `${by} ordered` : 'You ordered'} ${m.name}: +${m.buff.pct}% ${STAT_WORD[m.buff.stat] || ''} for the hour.`;

  function startFeastScene(m, by) {
    const g = folk.find(f => f.d.id === 'gaspard');
    if (!g || !present(g) || scene || !deps.diners) return false;
    endFeastScene(false);
    let list = [];
    try { list = deps.diners() || []; } catch (e) { list = []; }
    const diners = [];
    for (const d of list) {
      if (diners.length >= K.seats.length) break;
      if (!d || !d.ent || !d.cls || !isFinite(d.ent.x) || !isFinite(d.ent.y)) continue;
      diners.push({ ent: d.ent, cls: d.cls, spec: d.spec || null, name: d.name || 'Hero', me: !!d.me, i: diners.length, sx: d.ent.x, sy: d.ent.y, x: d.ent.x, y: d.ent.y, angle: d.ent.angle || 0, k: 0, left: 1, bites: 0, st: { t: 0, moving: false, action: null } });
    }
    if (!diners.length) return false;
    if (talk) endTalk();
    const p = deps.player;
    if (p) { p.target = null; p.interact = null; }
    const say = SAY[m.id] || SAY.stew;
    feastSc = { m, by, g, diners, t0: deps.now(), now: deps.now(), cue: {}, serve: say.serve[Math.floor(Math.random() * say.serve.length)], done: say.done[Math.floor(Math.random() * say.done.length)] };
    deps.holdCamera({ x: 890, y: 1100 }, 9, 1.35);
    return true;
  }
  function endFeastScene(announce) {
    const s = feastSc;
    if (!s) return;
    feastSc = null;
    const H = s.g.home;
    s.g.x = H.x; s.g.y = H.y; s.g.angle = Math.PI / 2; s.g.bubble = null; s.g.carry = null; s.g.pose = null; s.g.st.moving = false;
    if (deps) { deps.holdCamera(null); if (announce) deps.toast(mealLine(s.m, s.by)); }
  }
  // the real heroes seated at the table are not drawn (nor their name tags)
  const hides = ent => !!feastSc && feastSc.diners.some(d => d.ent === ent);

  function tickFeast(dt, now) {
    const s = feastSc, T = now - s.t0, g = s.g, H = g.home, m = s.m;
    s.now = now;
    if (T >= END) { endFeastScene(true); return; }
    const mv = deps.moving ? deps.moving() : null;
    if (T > 0.15 && mv) { endFeastScene(true); return; }
    // Gaspard: out to the table with the dish, the flourish, then he watches them eat and walks home
    const p1 = ease((T - 0.2) / 0.7), p2 = ease((T - 4.9) / 0.7);
    const out = T < 4.9 ? p1 : 1 - p2, px = g.x, py = g.y;
    g.x = lerp(H.x, K.cookAt.x, out); g.y = lerp(H.y, K.cookAt.y, out);
    const walking = (T >= 0.2 && T < 0.9) || (T >= 4.9 && T < 5.6);
    if (walking) g.angle = angTo(g.angle, Math.atan2(g.y - py, g.x - px) || 0, 0.4); else g.angle = angTo(g.angle, T < 4.9 ? 0 : Math.PI / 2, Math.min(1, dt * 6));
    g.st.moving = walking;
    g.carry = T >= 0.2 && T < SERVE ? m.id : null;
    g.pose = T >= SERVE && T < SERVE + 0.8 ? 'flourish' : null;
    g.goal = null;
    g.bubble = T >= 1.55 && T < 4.0 ? s.serve : T >= 4.4 && T < END - 0.2 ? s.done : null;
    // sounds
    const cue = (k, at, fn) => { if (T >= at && !s.cue[k]) { s.cue[k] = 1; fn(); } };
    cue('serve', 1.3, () => snd('feast-serve', { vol: 0.9 }));
    cue('clink1', 1.9, () => snd('feast-clink', { vol: 0.8 }));
    cue('clink2', 3.4, () => snd('feast-clink', { vol: 0.6, rate: 1.08 }));
    cue('sting', HAPPY, () => snd('feast-sting', { vol: 0.9 }));
    // the diners: walk to the seat, sit, eat, stand and go back where they were
    const P = BITE[m.id] || 1;
    for (const d of s.diners) {
      const seat = K.seats[d.i], st = d.st, ox = d.x, oy = d.y;
      st.t = now;
      if (T < WALK) {
        const q = ease(T / WALK);
        d.x = lerp(d.sx, seat.x, q); d.y = lerp(d.sy, seat.y, q);
        d.angle = q < 0.7 ? angTo(d.angle, Math.atan2(seat.y - d.sy, seat.x - d.sx), 0.35) : angTo(d.angle, seat.a, 0.3);
        st.moving = q < 0.97;
      } else if (T < RET0) {
        d.x = seat.x; d.y = seat.y; d.angle = seat.a; st.moving = false;
      } else {
        const q = ease((T - RET0) / (END - RET0)), e = d.ent;
        d.x = lerp(seat.x, isFinite(e.x) ? e.x : d.sx, q); d.y = lerp(seat.y, isFinite(e.y) ? e.y : d.sy, q);
        d.angle = angTo(d.angle, Math.atan2(d.y - oy, d.x - ox) || seat.a, 0.35);
        st.moving = q < 0.97;
      }
      d.k = T < RET0 ? ease((T - (WALK - 0.35)) / 0.4) : 1 - ease((T - RET0) / 0.3);
      d.left = 1 - Math.min(1, Math.max(0, (T - EAT0 - d.i * 0.12) / (HAPPY - EAT0 - 0.2)));
      if (T >= EAT0 && T < HAPPY && d.left > 0.02) {
        const n = Math.floor((T - EAT0) / P + d.i * 0.27);
        if (n > d.bites) { d.bites = n; if (d.i === 0 || d.i === 2) snd('feast-chew', { vol: 0.5, key: 'feast-chew' + d.i, minGap: 0.3 }); }
      }
    }
  }
  // what's on the table during the scene: the dish set down, then a portion on each plate shrinking as they eat
  function groundMeal(ctx, now) {
    const s = feastSc;
    if (!s) return;
    const T = now - s.t0, id = s.m.id;
    if (T >= SERVE && T < EAT0 + 0.5) { ctx.save(); ctx.globalAlpha = T < EAT0 ? 1 : 1 - (T - EAT0) / 0.5; drawFood(ctx, id, K.dish.x, K.dish.y, 1.5, 1); ctx.restore(); }
    if (T >= EAT0 - 0.1) for (const d of s.diners) {
      const pl = K.plates[d.i];
      ctx.save(); ctx.globalAlpha = Math.min(1, (T - EAT0 + 0.1) / 0.4); drawFood(ctx, id, pl.x, pl.y, 1, d.left); ctx.restore();
    }
  }
  function drawSpark(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a;
    poly(ctx, [x, y - r, x + r * 0.3, y - r * 0.3, x + r, y, x + r * 0.3, y + r * 0.3, x, y + r, x - r * 0.3, y + r * 0.3, x - r, y, x - r * 0.3, y - r * 0.3], '#ffe68a', OUT, 0.8);
    ctx.restore();
  }
  // steam over everything, and the happy sparkles
  function drawMealOver(ctx, now) {
    const s = feastSc;
    if (!s) return;
    const T = now - s.t0;
    if (T >= SERVE && T < EAT0 + 0.6) wisps(ctx, K.dish.x, K.dish.y - 4, now, 4, 30, 7, 0.45 * (T < EAT0 ? 1 : 1 - (T - EAT0) / 0.6));
    if (T >= EAT0 && T < HAPPY) for (const d of s.diners) if (d.left > 0.12) { const pl = K.plates[d.i]; wisps(ctx, pl.x, pl.y - 4, now, 3, 22, 5, 0.42 * Math.min(1, d.left * 1.6), d.i * 0.13); }
    if (T >= HAPPY && T < HAPPY + 1.2) for (const d of s.diners) {
      const q = (T - HAPPY) / 1.2;
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + T * 2.2 + d.i; drawSpark(ctx, d.x + Math.cos(a) * (16 + q * 18), d.y - 22 + Math.sin(a) * (10 + q * 8) - q * 10, 3.4 - q * 1.6, 1 - q); }
    }
  }
  // a seated hero (their own picture, sat down) and the arm bringing the food up to the mouth
  function drawDiner(ctx, d, scale) {
    const s = feastSc;
    if (!s) return;
    const T = s.now - s.t0, id = s.m.id, P = BITE[id] || 1;
    const eating = T >= EAT0 - 0.2 && T < HAPPY + 0.15 && d.k > 0.9 && d.left > 0.02;
    const u = eating ? ((T - EAT0) / P + d.i * 0.27 + 10) % 1 : 0;
    const hop = T >= HAPPY && T < HAPPY + 0.75 ? Math.abs(Math.sin((T - HAPPY) / 0.75 * Math.PI * 2)) * 5 : 0;
    const bob = eating && u > 0.6 && u < 0.85 ? Math.abs(Math.sin(T * 17)) * 0.9 : 0;
    drawHero(ctx, d.cls, d.x, d.y, d.angle, d.st, scale, { spec: d.spec, emote: d.k > 0.001 ? { kind: 'sit', t: T, k: d.k } : null, lift: hop + bob });
    if (!eating) return;
    const a = d.angle, dx = Math.cos(a), dy = Math.sin(a), qx = -dy, qy = dx, pl = K.plates[d.i];
    const mouth = { x: d.x + dx * 15 + qx * 2, y: d.y + dy * 15 + qy * 2 - 3 - hop };
    const e = u < 0.3 ? 0 : u < 0.6 ? ease((u - 0.3) / 0.3) : u < 0.82 ? 1 : 1 - ease((u - 0.82) / 0.18);
    const dip = u < 0.3 ? Math.sin(u / 0.3 * Math.PI) * 1.5 : 0;
    const hx = lerp(pl.x, mouth.x, e), hy = lerp(pl.y, mouth.y, e) - Math.sin(e * Math.PI) * 5 + dip;
    const sh = { x: d.x + qx * 13 + dx * 2, y: d.y + qy * 13 + dy * 2 - 4 - hop };
    const el = { x: (sh.x + hx) / 2 + qx * 6, y: (sh.y + hy) / 2 + qy * 6 };
    limb(ctx, [sh.x, sh.y, el.x, el.y, hx, hy], '#d9b490', 3.2);
    const loaded = u >= 0.12 && u < 0.64;
    if (id === 'broth') {
      circle(ctx, hx, hy, 4.2, '#d9c8a0', OUT, 1.3); circle(ctx, hx, hy, 3, loaded ? '#e0a83a' : '#bda47a'); circle(ctx, hx - 0.8, hy - 0.8, 1, 'rgba(255,240,190,0.6)');
    } else if (id === 'tarts') {
      if (u < 0.66) { circle(ctx, hx, hy, 3.6, '#d8a050', OUT, 1.2); circle(ctx, hx, hy, 2.1, d.i % 2 ? '#c0384a' : '#e8c15a'); }
      circle(ctx, hx + 1.5, hy + 1.5, 3, '#ecc8a2', OUT, 1.2);
    } else {
      line(ctx, hx + dx * 5, hy + dy * 5, hx - dx * 6, hy - dy * 6, OUT, 3.6);
      line(ctx, hx + dx * 5, hy + dy * 5, hx - dx * 6, hy - dy * 6, '#b9bec4', 1.8);
      if (id === 'stew') { circle(ctx, hx - dx * 7, hy - dy * 7, 2.7, '#b9bec4', OUT, 1); if (loaded) circle(ctx, hx - dx * 7, hy - dy * 7, 1.8, '#a8582a'); }
      else { for (const o of [-1.6, 0, 1.6]) line(ctx, hx - dx * 6 + qx * o, hy - dy * 6 + qy * o, hx - dx * 9.5 + qx * o, hy - dy * 9.5 + qy * o, '#b9bec4', 1); if (loaded) circle(ctx, hx - dx * 8, hy - dy * 8, 1.9, '#d9a054'); }
      circle(ctx, hx + dx * 1.5, hy + dy * 1.5, 3, '#ecc8a2', OUT, 1.2);
    }
  }

  // ---------------------------------------------------------------- talking
  let talk = null;   // { f, lines, i, choices, node }
  const talking = f => talk && talk.f === f;
  const box = () => {
    let el = document.getElementById('dialogue');
    if (!el) {
      el = document.createElement('div'); el.id = 'dialogue'; el.className = 'hidden';
      document.body.appendChild(el);
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.addEventListener('click', e => {
        const c = e.target.closest('[data-c]');
        if (c) { choose(Number(c.dataset.c)); return; }
        if (e.target.closest('.dl-next') || e.target.closest('.dl-line')) next();
        if (e.target.closest('.dl-x')) endTalk();
      });
    }
    return el;
  };
  function interactables() {
    const out = folk.filter(f => deps && present(f) && !f.walk).map(f => ({ get x() { return f.x; }, get y() { return f.y; }, r: 22, reach: 80, label: f.d.name, open: () => startTalk(f) }));
    // the town fountain, once it has something to say (reach is from its middle: the basin is solid out to about 90)
    if (deps && WISH && deps.beaten('hydra') && state().seen.hydra) out.push({ x: POOL_AT.x, y: POOL_AT.y, r: 70, reach: 125, label: 'Wishing pool', open: () => startTalk(POOL) });
    const mr = moonRoad();
    if (mr && deps.moonRoad) out.push({ x: mr.x, y: mr.y, r: 34, reach: 120, label: "The Moon's Road", open: () => deps.moonRoad() });   // (the way in to Season 2, as the portals are: main.js)
    return out;
  }
  // the pool talks like a townsperson (the same dialogue box), but it is not one of the folk
  const POOL = {
    x: POOL_AT.x, y: POOL_AT.y + 80,
    d: {
      id: 'pool', name: 'The Fountain', title: 'Wishing pool', wander: 0,
      talk: [
        { when: { flags: ['fountain-nine'] },
          lines: ["The water is still. Nine small ripples, then none. It seems to know you now."],
          choices: [{ text: `Toss a coin in (${WISH ? WISH.cost : 5} gold)`, next: 'wish' }, { text: 'Goodbye' }] },
        { when: {},
          lines: ["The basin is clear and still, with a little gold shining at the bottom. It looks like it is waiting for something."],
          choices: [{ text: `Toss a coin in (${WISH ? WISH.cost : 5} gold)`, next: 'wish' }, { text: 'Goodbye' }] },
      ],
      nodes: { wish: { action: 'wish' } },
    },
  };
  function startTalk(f) {
    const entry = f.d.talk.find(t => matches(t.when)) || f.d.talk[f.d.talk.length - 1];
    if (entry.set) { state().flags[entry.set] = 1; commit(); }   // (a line that is told once, with no choice to set it: heard now, never again)
    talk = { f, lines: entry.lines || [], i: 0, choices: entry.choices || null, node: entry };
    render();
  }
  function enterNode(id) {
    const n = talk && talk.f.d.nodes && talk.f.d.nodes[id];
    if (!n) { endTalk(); return; }
    if (n.action === 'wish') { toss(); return; }
    talk.lines = n.lines || []; talk.i = 0; talk.choices = n.choices || null; talk.node = n;
    if (n.set) { state().flags[n.set] = 1; commit(); }
    if (n.give) give(n.give);
    render();
    if (n.action === 'ward' && !(n.lines && n.lines.length)) openWards();
    if (n.action === 'feast' && !(n.lines && n.lines.length)) openFeasts();
    if (n.action === 'fish-shop' && !(n.lines && n.lines.length)) { endTalk(); deps.fishShop(); }
  }
  function give(id) {
    const g = GIFTS[id], hero = deps.hero(), s = state();
    if (!g || !hero) return;
    s.gifts[hero] = s.gifts[hero] || {};
    if (s.gifts[hero][id]) return;
    s.gifts[hero][id] = 1; commit();
    deps.addItem('gift_' + id);
    deps.toast(`You received ${g.name}.`);
  }
  function next() {
    if (!talk) return;
    if (talk.i < talk.lines.length - 1) { talk.i += 1; render(); return; }
    if (talk.node && talk.node.action === 'feast') { openFeasts(); return; }
    if (talk.node && talk.node.action === 'ward') { openWards(); return; }
    if (talk.node && talk.node.action === 'fish-shop') { endTalk(); deps.fishShop(); return; }
    if (!talk.choices || !talk.choices.length) endTalk();
  }
  function choose(i) {
    const c = talk && talk.choices && talk.choices[i];
    if (!c) return;
    if (c.next) enterNode(c.next); else endTalk();
  }
  function endTalk() { talk = null; box().classList.add('hidden'); }
  function render() {
    const el = box();
    if (!talk) { el.classList.add('hidden'); return; }
    const last = talk.i >= talk.lines.length - 1, d = talk.f.d;
    const choices = last && talk.choices && talk.choices.length ? `<div class="dl-choices">${talk.choices.map((c, i) => `<button type="button" data-c="${i}">${esc(c.text)}</button>`).join('')}</div>` : '';
    el.innerHTML = `<header><b>${esc(d.name)}</b><small>${esc(d.title || '')}</small><button type="button" class="dl-x" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      <p class="dl-line">${esc(talk.lines[talk.i] || '')}</p>${choices || `<button type="button" class="dl-next">${last ? (talk.node && talk.node.action === 'feast' ? 'See the board' : talk.node && talk.node.action === 'ward' ? 'Choose a ward' : talk.node && talk.node.action === 'fish-shop' ? 'Show the catch' : 'Goodbye') : 'Next'}</button>`}`;
    el.classList.remove('hidden');
    if (typeof Sound !== 'undefined' && talk.lines[talk.i]) Sound.play('npc-talk', { vol: 0.6, key: 'npc-talk', minGap: 0.15 });
  }
  const isTalking = () => !!talk;
  // walk away and the conversation ends
  function checkDistance() { if (talk && deps.player && Math.hypot(deps.player.x - talk.f.x, deps.player.y - talk.f.y) > 200) endTalk(); }

  // ---------------------------------------------------------------- feasts
  function feast() {
    const f = state().feast;
    if (!f || !(f.until > Date.now())) return null;
    const m = MEALS.find(x => x.id === f.id);
    return m ? { meal: m, left: f.until - Date.now() } : null;
  }
  function openFeasts() {
    const el = box(), g = deps.gold(), cur = feast();
    el.innerHTML = `<header><b>Gaspard's board</b><small>Feast · for the whole town, an hour · <i class="coin"></i>${g}</small><button type="button" class="dl-x" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      ${cur ? `<p class="dl-line">Well fed: <b>${esc(cur.meal.name)}</b> · ${Math.ceil(cur.left / 60000)}m left. A new order replaces it.</p>` : ''}
      <div class="dl-feasts">${MEALS.map(m => `<button type="button" class="dl-feast" data-f="${m.id}"${g < m.cost ? ` disabled data-tip="${m.cost - g} gold short"` : ''}>
        <b>${esc(m.name)}</b><span>${esc(m.desc)}</span><em>+${m.buff.pct}% ${{ hp: 'health', power: 'power', heal: 'healing', speed: 'speed' }[m.buff.stat] || ''}</em><i class="coin"></i><u>${m.cost}</u></button>`).join('')}</div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('.dl-feast').forEach(b => b.addEventListener('click', () => {
      const m = MEALS.find(x => x.id === b.dataset.f);
      if (!m || deps.gold() < m.cost) return;
      if (deps.orderFeast(m.id) === false) return;
      deps.spendGold(m.cost);
      endTalk();
    }));
  }
  // someone ordered: everyone in town eats
  function eat(id, by) {
    const m = MEALS.find(x => x.id === id);
    if (!m) return;
    state().feast = { id, until: Date.now() + FEAST_MS }; commit();
    deps.onFeast();
    // in town the meal is a little scene (the toast comes when it ends); anywhere else, just the toast
    if (!(deps.inTown && deps.inTown() && startFeastScene(m, by))) deps.toast(mealLine(m, by));
  }
  // the feast's bonus (and a ward's, if you wear one) as gear totals (inventory.js adds it)
  function feastTotals(clsId) {
    const f = feast(), w = ward();
    let out = null;
    if (f) {
      const { stat, pct } = f.meal.buff;
      if (stat === 'hp') out = { hp: Math.round(1100 * pct / 100) };
      else if (stat === 'speed') out = { haste: pct };
      else if (stat === 'heal') { const c = CLASSES.find(x => x.id === clsId); out = c && c.role === 'healer' ? { main: pct * 10 } : { hp: Math.round(1100 * pct / 200) }; }
      else out = { main: pct * 10 };
    }
    if (w) { out = out || {}; const { stat, pts } = w.ward.buff, k = WARD_KEY[stat], v = stat === 'def' || stat === 'power' ? pts * 10 : pts; out[k] = (out[k] || 0) + v; }
    return out;
  }

  // ---------------------------------------------------------------- Quill's wards (set 2)
  // One at a time, an hour each, on you alone (no host or network: the totals go out with your gear like a feast's).
  const WARD_KEY = { crit: 'crit', def: 'def', haste: 'haste', power: 'main' };
  const WARD_WORD = { crit: 'critical chance', def: 'less damage taken', haste: 'haste', power: 'power' };
  const WARD_COL = { cinder: ['#ff7a3a', '#ffd27a'], rime: ['#8fd8ff', '#ffffff'], storm: ['#ffe45a', '#ffffff'], void: ['#b07aff', '#2a1050'] };
  const wardText = w => (w.buff.stat === 'def' ? `${w.buff.pts}% less damage taken` : `+${w.buff.pts}% ${WARD_WORD[w.buff.stat] || ''}`);
  function ward() {
    const w = state().ward;
    if (!w || !(w.until > Date.now())) return null;
    const d = WARDLIST.find(x => x.id === w.id);
    return d ? { ward: d, left: w.until - Date.now() } : null;
  }
  // the ward you wear, as a chip above the feast's (with the minutes left)
  let wardKey = '';
  function wardChip() {
    let el = document.getElementById('ward-chip');
    if (!el) { el = document.createElement('div'); el.id = 'ward-chip'; el.className = 'hidden'; document.body.appendChild(el); }
    const w = ward(), key = w ? w.ward.id + Math.ceil(w.left / 60000) : '';
    if (key === wardKey) return;
    if (wardKey && !key && deps) deps.onFeast();   // (the ward rubbed out: gear numbers and the host's copy drop it)
    wardKey = key;
    el.classList.toggle('hidden', !w);
    if (w) { el.innerHTML = `Warded<b>${Math.ceil(w.left / 60000)}m</b>`; Tip.set(el, `<b>${esc(w.ward.name)}</b><em>${esc(wardText(w.ward))}</em>${esc(w.ward.desc)}`); }
  }
  function openWards() {
    const el = box(), g = deps.gold(), cur = ward();
    el.innerHTML = `<header><b>Quill's wards</b><small>Ward · on you alone, an hour · <i class="coin"></i>${g}</small><button type="button" class="dl-x" aria-label="Close" data-tip="Close (Esc)">×</button></header>
      ${cur ? `<p class="dl-line">Warded: <b>${esc(cur.ward.name)}</b> · ${Math.ceil(cur.left / 60000)}m left. A new one rubs it out.</p>` : ''}
      <div class="dl-feasts">${WARDLIST.map(w => `<button type="button" class="dl-feast" data-w="${w.id}"${g < w.cost ? ` disabled data-tip="${w.cost - g} gold short"` : ''}>
        <b>${esc(w.name)}</b><span>${esc(w.desc)}</span><em>${esc(wardText(w))}</em><i class="coin"></i><u>${w.cost}</u></button>`).join('')}</div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('.dl-feast').forEach(b => b.addEventListener('click', () => {
      const w = WARDLIST.find(x => x.id === b.dataset.w);
      if (!w || deps.gold() < w.cost) return;
      deps.spendGold(w.cost);
      state().ward = { id: w.id, until: Date.now() + WARD_MS }; commit();
      deps.onFeast(); wardChip();
      const q = talk && talk.f;
      if (q && q.d.id === 'quill') { q.bubble = ['There. Don\'t scuff it.', 'Hold still... done. It tickles, I\'m told.', 'Chalk\'s dry. Go on, before it smudges.'][Math.floor(Math.random() * 3)]; q.bubbleUntil = deps.now() + 3.5; }
      const p = deps.player, col = WARD_COL[w.id] || ['#ffffff', '#ffffff'];
      try { if (p && typeof VFX !== 'undefined') VFX.burst(p.x, p.y, { color: col[0], color2: col[1], n: 22, speed: 170 }); } catch (e) { /* a flourish never blocks a purchase */ }
      deps.toast(`Quill draws a ${w.name} on you: ${wardText(w)} for the hour.`);
      endTalk();
    }));
  }

  // ---------------------------------------------------------------- the wishing pool (set 2)
  // A toss costs a little and brings one of nine voices, never the same one twice until all nine have spoken; now and then the
  // water gives some gold back. Hearing all nine sets 'fountain-nine' (Tobble has a line for it).
  function setTalk(lines, choices) { talk.lines = lines; talk.i = 0; talk.choices = choices; talk.node = null; render(); }
  function toss() {
    if (!talk || !WISH) return;
    const s = state(), more = [{ text: `Toss another (${WISH.cost} gold)`, next: 'wish' }, { text: 'Goodbye' }];
    if (deps.gold() < WISH.cost) { setTalk(['You have no coin to spare. The water waits, and does not seem offended.'], [{ text: 'Goodbye' }]); return; }
    deps.spendGold(WISH.cost);
    const n = WISH.voices.length;
    let heard = Array.isArray(s.heard) ? s.heard : [], left = [];
    for (let i = 0; i < n; i++) if (!heard.includes(i)) left.push(i);
    if (!left.length) { heard = []; for (let i = 0; i < n; i++) left.push(i); }
    const v = left[Math.floor(Math.random() * left.length)];
    heard.push(v); s.heard = heard;
    const lines = [WISH.voices[v]];
    if (heard.length >= n && !s.flags['fountain-nine']) { s.flags['fountain-nine'] = 1; lines.push('That was the ninth. Every ripple settles at once, and the pool is very still.'); }
    const gb = WISH.giveBack;
    if (gb && Math.random() < gb.chance) { lines.push(`Something glints. The water gives ${gb.gold} gold back.`); try { if (typeof Inventory !== 'undefined') Inventory.addGold(gb.gold); } catch (e) { /* the wallet is the save's own */ } }
    commit();
    wishFx = { t0: deps.now(), col: VOICE_COL[v] };
    snd('feast-clink', { vol: 0.6, rate: 1.15 });
    setTalk(lines, more);
  }

  let listening = false;
  // any key or click skips the scene (after a beat: the click that ordered it is still settling)
  function skipInput(e) {
    if (!feastSc || e.repeat || (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key))) return;
    if (deps.now() - feastSc.t0 > 0.25) endFeastScene(true);
  }
  return { init(d) { deps = d; if (!listening && typeof window !== 'undefined') { listening = true; window.addEventListener('keydown', skipInput, true); window.addEventListener('mousedown', skipInput, true); } }, update, entities, drawGround, drawLabels, interactables, moonRoad, isTalking, endTalk, remarkPull, checkDistance, feast, feastTotals, eat, startArrival, hides, feastScene: () => feastSc,
    // a boss's own town moment is playing or still due (the Barrow Gate, barrow-gate.js, waits its turn), and the banner they share
    busy: () => !!scene || !!feastSc || Object.keys(UNLOCKS).some(b => deps && deps.beaten(b) && !state().seen[b]), banner };
})();
