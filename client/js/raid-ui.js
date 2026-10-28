// DOM parts of the raid: boss bar + cast bar, party frames, countdown, results screen, and the
// training-dummy meter in town. main.js feeds it data every frame.

const RaidUI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // small line icons for party-frame chips (12x12, drawn in the chip's text color)
  // line icons for party-frame chips and the boss's statuses (shared with the hotbar's row: status-icons.js)
  const svg = stSvg, GLYPH = STATUS_GLYPH;
  // your own damage over time on the boss, by the kit's DoT id (the icon is the ability that put it there)
  const DOT_INFO = { poison: ['Poison', 'Venom from your blade, ticking every 3s.'], thorn: ['Thorns', 'Your thorns, biting every 3s.'],
    acid: ['Acid', 'Your acid burn, stronger with every stack.'], brand: ['Burning Rune', 'Your rune, burning every 3s.'],
    crater: ['Scorched Earth', 'The ground you set alight, burning every 3s.'], pyroburn: ['Pyroburn', 'Your fire, burning every 3s.'] };
  const ROLE_GLYPH = {
    tank: svg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="currentColor"/>'),
    healer: svg('<path d="M4.5 1.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" fill="currentColor"/>'),
    dps: svg('<path d="M10.5 1.5 9.8 4 4.6 9.2 2.8 7.4 8 2.2ZM2.8 7.4 1.5 10.5l3.1-1.3" fill="currentColor"/>'),
  };
  let docked = 'left', onDock = null, hudObserved = false, lastState = '';
  let root, frames = {}, onFrame = null, rosterKey = '', lastT = 0, roster = [], nextKey = '', statusKey = '';

  function init(handlers) {
    onFrame = handlers.onFrame;
    root = document.createElement('div');
    root.id = 'raid-ui';
    root.className = 'hidden';
    root.innerHTML = `
      <div id="boss-bar">
        <div class="bb-top"><b class="bb-name"></b><i class="bb-title"></i><span class="bb-mode"></span><em class="bb-tot"></em><span class="bb-time"></span></div>
        <div class="bb-hp"><div class="under"></div><div class="trail"></div><div class="fill"></div><div class="ticks"></div><div class="gates"></div><div class="vuln"></div><div class="goal hidden"></div><span></span><b class="bb-x"></b></div>
        <div class="bb-post hidden"><div class="back"></div><div class="fill"></div><div class="crack"></div></div>
        <div class="bb-status"></div>
        <div class="bb-next hidden"></div>
      </div>
      <div id="boss-cast" class="hidden"><i class="bc-icon"></i><div class="bc-body"><small>Next</small><b class="bc-name"></b><div class="bc-bar"><div class="fill"></div></div></div><em class="bc-left"></em></div>
      <div id="raid-left"><div id="pf-wrap"><button id="pf-dock" class="pf-dock" type="button"></button><div id="party-frames"></div><div id="lb-gauge" class="hidden"><small>Limit</small><div class="lb-bars"><i><b></b></i><i><b></b></i><i><b></b></i></div><kbd class="lb-key">G</kbd></div></div><div id="prog" class="hidden"></div></div>
      <div id="party-strip"></div>
      <div id="countdown" class="hidden"></div>
      <div id="boss-intro" class="hidden"><small></small><b></b><i></i><q></q></div>
      <div id="trial-lore" class="hidden"><b></b><p></p><p></p></div>
      <div id="down-veil" class="hidden"><span>Down</span><button id="rez-ask" class="rez-ask hidden" type="button"></button><div class="recap"></div></div>
      <div id="waymarks" class="hidden">${['A', 'B', 'C', 'D', '1', '2', '3', '4'].map(k => `<button type="button" class="wm wm-${/\d/.test(k) ? 'sq' : 'ci'}" data-k="${k}">${k}</button>`).join('')}<button type="button" class="wm wm-clear" data-k="*">${svg('<path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')}</button><button type="button" class="wm wm-pull" data-k="#">${svg('<circle cx="6" cy="6.6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 4.2v2.6l1.6 1M4.6 1.2h2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>')}</button><button type="button" class="wm wm-callouts" data-k="@">${svg('<path d="M2 2.5h8v5H5.5L3 9.5v-2H2Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>')}</button></div>
      <button id="raid-leave" class="btn2" type="button">Leave raid</button>`;
    document.body.appendChild(root);
    // the ready check: a prompt with the party's answers (readyCheck below), and its button on the waymark bar
    root.insertAdjacentHTML('beforeend', `<div id="ready-check" class="hidden"><div class="rc-head"><b>Ready check</b><span></span></div><div class="rc-row"></div>
      <div class="rc-act"><button type="button" class="rc-yes">Ready <kbd></kbd></button><button type="button" class="rc-no">Not ready <kbd></kbd></button></div><div class="rc-bar"><i></i></div></div>`);
    $('ready-check').addEventListener('mousedown', e => e.stopPropagation());
    $('ready-check').addEventListener('click', e => { const bt = e.target.closest('button'); if (bt && handlers.onReady) handlers.onReady(bt.classList.contains('rc-yes')); });
    $('waymarks').insertAdjacentHTML('beforeend', `<button type="button" class="wm wm-ready" data-k="!" data-tip="Ready check: everyone answers, and when all are ready the pull countdown starts">${svg('<path d="M2.4 6.3 5 8.8 9.7 3.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>')}</button>`);
    $('waymarks').querySelector('.wm-ready').addEventListener('click', e => { e.stopPropagation(); if (handlers.onReadyCheck) handlers.onReadyCheck(); });
    $('waymarks').querySelector('.wm-ready').addEventListener('contextmenu', e => e.stopPropagation());
    // in a live fight, leaving takes a second click (so a stray click doesn't walk you out of a pull)
    let leaveArmed = 0;
    $('raid-leave').addEventListener('click', () => {
      const btn = $('raid-leave');
      if (lastState === 'live' && performance.now() - leaveArmed > 3000) {
        leaveArmed = performance.now(); btn.textContent = 'Leave? Click again'; btn.classList.add('armed');
        setTimeout(() => { if (performance.now() - leaveArmed >= 2900) { btn.textContent = leaveLabel(); btn.classList.remove('armed'); } }, 3000);
        return;
      }
      leaveArmed = 0; btn.textContent = leaveLabel(); btn.classList.remove('armed');
      handlers.onLeave();
    });
    // waymarks: click one, then the floor; right-click one to pick it up; the cross picks them all up
    const wm = $('waymarks');
    wm.addEventListener('mousedown', e => e.stopPropagation());
    wm.addEventListener('click', e => { const b = e.target.closest('.wm'); if (!b) return; if (b.dataset.k === '*') handlers.onWaymark({ all: 'clear' }); else if (b.dataset.k === '@') handlers.onCallouts(); else if (b.dataset.k === '#') handlers.onPullIn(); else handlers.onPlaceMark(b.dataset.k); });
    $('rez-ask').addEventListener('click', () => { if (handlers.onRezAsk) handlers.onRezAsk(); });
    wm.addEventListener('contextmenu', e => { const b = e.target.closest('.wm'); if (b && !'*@#'.includes(b.dataset.k)) { e.preventDefault(); handlers.onWaymark({ k: b.dataset.k, clear: true }); } });
    for (const b of wm.children) b.dataset.tip = b.dataset.k === '*' ? 'Pick up every waymark' : b.dataset.k === '@' ? 'Callouts: the ping wheel (Alt + drag). Middle-click pings.' : b.dataset.k === '#' ? 'Pull in 5: the boss engages when the count runs out' : `Waymark ${b.dataset.k}: click, then click the floor. Right-click to pick it up.`;
    castFrameDrag();
    $('party-frames').addEventListener('mousedown', e => {
      const row = e.target.closest('.pf');
      if (row) { e.stopPropagation(); onFrame(Number(row.dataset.id)); }
    });
    // the frames live top-left or in a strip just above the hotbar (healers start there); the little button swaps
    onDock = handlers.onDock || null;
    $('pf-dock').addEventListener('mousedown', e => e.stopPropagation());
    $('pf-dock').addEventListener('click', () => { dock(docked === 'strip' ? 'left' : 'strip'); if (onDock) onDock(docked); });
    dock('left');
    Tip.set($('lb-gauge'), () => limitTip());
    Tip.set(root.querySelector('.bb-post'), () => postureTip());   // (a Kenseier in the party: the boss's Posture)
    // the sparring dummy's Posture in the yard, for a Kenseier practising on it (main.js townKenStep)
    const tp = document.createElement('div');
    tp.id = 'town-posture'; tp.className = 'hidden';
    tp.innerHTML = '<small>Posture</small><div class="bb-post"><div class="back"></div><div class="fill"></div><div class="crack"></div></div>';
    document.body.appendChild(tp);
    Tip.set(tp.querySelector('.bb-post'), () => postureTip());
    // the boss plate grows with its status row and upcoming moves: keep the target frame just below it (style.css)
    if (typeof ResizeObserver !== 'undefined') {
      const bb = $('boss-bar');
      new ResizeObserver(() => {
        const r = bb.getBoundingClientRect();
        if (r.height > 0) document.documentElement.style.setProperty('--bb-bottom', Math.round(r.bottom) + 'px');
        else document.documentElement.style.removeProperty('--bb-bottom');
      }).observe(bb);
    }

    const meter = document.createElement('div');
    meter.id = 'dps-meter'; meter.className = 'hidden';
    document.body.appendChild(meter);

    const res = document.createElement('div');
    res.id = 'results'; res.className = 'hidden';
    document.body.appendChild(res);
  }

  // 'left' (under the corner, with the progress record) or 'strip' (a row above the hotbar, close to where you look)
  const DOCK_ICON = {
    left: svg('<path d="M1.5 9.5h9M3.5 7.5l2.5 2 2.5-2M6 2v7.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'),
    strip: svg('<path d="M1.5 2.5h9M3.5 4.5 6 2.5l2.5 2M6 10V2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  function dock(where) {
    docked = where === 'strip' ? 'strip' : 'left';
    const wrap = $('pf-wrap'), home = docked === 'strip' ? $('party-strip') : $('raid-left');
    if (wrap.parentNode !== home) home.insertBefore(wrap, home.firstChild);
    root.classList.toggle('pf-strip', docked === 'strip');
    const btn = $('pf-dock');
    btn.innerHTML = DOCK_ICON[docked];
    btn.dataset.tip = docked === 'strip' ? 'Move the party frames back to the corner' : 'Move the party frames above your skills';
  }
  // keep the strip just above the hotbar, however tall the hotbar's rows get
  function trackHud() {
    const hud = document.getElementById('combat-hud');
    if (!hud || hudObserved || typeof ResizeObserver === 'undefined') return;
    hudObserved = true;
    new ResizeObserver(() => {
      const r = hud.getBoundingClientRect();
      if (r.height > 0) document.documentElement.style.setProperty('--hud-top', Math.round(window.innerHeight - r.top) + 'px');
    }).observe(hud);
  }

  const leaveLabel = () => (document.body.classList.contains('in-pvp') ? 'Leave bout' : 'Leave raid');   // (a PvP bout: pvp-ui.js)
  function show(v) { if (v) { trackHud(); const b = $('raid-leave'); if (b && !b.classList.contains('armed')) b.textContent = leaveLabel(); } root.classList.toggle('hidden', !v); document.body.classList.toggle('in-raid', !!v); if (!v) { $('countdown').classList.add('hidden'); $('down-veil').classList.add('hidden'); $('trial-lore').classList.add('hidden'); } }

  function setRoster(list0) {
    const key = list0.map(r => r.id).join(',');
    if (key === rosterKey) return;
    rosterKey = key; roster = list0;
    const order = { tank: 0, healer: 1, dps: 2 };
    const list = [...roster].sort((a, b) => order[a.role] - order[b.role] || a.id - b.id);
    $('party-frames').innerHTML = list.map((r, i) => `
      <div class="pf" data-id="${r.id}" style="--rc:${ROLES[r.role].color};--pc:${FIGHT.SLOTS[i % 4]}">
        <kbd class="pf-key" style="color:var(--pc);border-color:var(--pc)">${i + 1}</kbd>
        <div class="pf-main">
          <div class="pf-name"><i class="pf-role">${ROLE_GLYPH[r.role] || ''}</i><span>${esc(r.name)}</span><b class="pf-aggro" data-tip="The boss is attacking them">${GLYPH.aggro}</b><i class="pf-ult" data-tip="Their Ultimate is ready"></i><small>${esc(CLASSES.find(c => c.id === r.cls)?.name || '')}${r.bot ? ' · bot' : ''}</small></div>
          <div class="pf-hp"><div class="trail"></div><div class="hp"></div><div class="inc"></div><div class="sh"></div><div class="hl"></div><span></span></div>
          <div class="pf-cast"><i></i></div>
          <div class="pf-st"></div>
        </div>
      </div>`).join('');
    frames = {};
    for (const row of $('party-frames').children) frames[row.dataset.id] = { row, hp: row.querySelector('.hp'), sh: row.querySelector('.sh'), inc: row.querySelector('.inc'), trail: row.querySelector('.trail'),
      hl: row.querySelector('.hl'), bar: row.querySelector('.pf-hp'), txt: row.querySelector('.pf-hp span'), cast: row.querySelector('.pf-cast i'), st: row.querySelector('.pf-st'), key: '', trailV: 1, txtKey: '',
      hpV: null, alive: null, healAt: -9 };
  }

  // a teammate's Ultimate: their frame rings in their class's colour and a light sweeps across it, once
  function ultFlash(id, color) {
    const f = frames[id];
    if (!f) return;
    if (color) f.row.style.setProperty('--uc', color);
    f.row.classList.remove('ulted'); void f.row.offsetWidth; f.row.classList.add('ulted');
    clearTimeout(f.ultT); f.ultT = setTimeout(() => f.row.classList.remove('ulted'), 1000);
  }

  // a lighter chunk that lingers where health just was, then drains away: shows who just got hit and how hard
  function trailStep(v, cur, hitAt, now, dt) {
    if (cur >= v) return cur;
    return now - (hitAt || 0) > 0.45 ? Math.max(cur, v - dt * 0.7) : v;
  }

  // raid: the client raid state from main.js
  // marks: { healer, locked, heal, casting: { id, frac }, aggro, cleanse } (see frameMarks in main.js)
  // (this runs every frame: elements are looked up once, and text and widths are written only when they change)
  const els = {}, q = sel => els[sel] || (els[sel] = root.querySelector(sel));
  const setText = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
  const setW = (el, v) => { if (el._w !== v) { el._w = v; el.style.width = v; } };
  // a bar's fill slid along instead of resized (no layout per frame; its gradient and leading edge keep their shape).
  // The fill spans the whole track (style.css) and its track clips it.
  const setX = (el, f) => { const v = ((Math.max(0, Math.min(1, f)) - 1) * 100).toFixed(2); if (el._x !== v) { el._x = v; el.style.transform = `translateX(${v}%)`; } };
  const setS = (el, f) => { const v = Math.max(0, Math.min(1, f)).toFixed(3); if (el._s !== v) { el._s = v; el.style.transform = `scaleX(${v})`; } };
  function update(raid, now, myId, marks = {}) {
    const dt = Math.min(0.1, Math.max(0, now - lastT)); lastT = now;
    lastState = raid.state;
    liveMeter(raid, myId);
    const b = raid.boss;
    // a boss with a second form (def.forms, fight.js setForm; raid.form is set in main.js when the form moment arrives): the bar shows that form's name and title
    // and its own look (a sea-teal fill, a bronze edge: style.css #boss-bar.form), the same health bar, no reset
    const fm = raid.form && raid.def.forms && raid.def.forms[raid.form];
    setText(q('.bb-name'), fm ? fm.name : raid.def.name);
    setText(q('.bb-title'), fm && fm.title ? fm.title : '');
    q('#boss-bar').classList.toggle('form', !!fm);
    if (fm) q('#boss-bar').dataset.form = raid.form; else delete q('#boss-bar').dataset.form;
    const mode = q('.bb-mode');
    setText(mode, raid.mode === 'hard' ? 'Hard' : 'Normal');
    mode.classList.toggle('hard', raid.mode === 'hard');
    // who the boss is on, right in its bar (so targeting the boss needs no second frame)
    const totR = raid.state === 'live' && b.tg != null ? raid.roster.find(x => x.id === b.tg) : null, tot = q('.bb-tot');
    setText(tot, totR ? `→ ${totR.id === myId ? 'You' : totR.name}` : '');
    if (totR) tot.style.setProperty('--rc', ROLES[totR.role].color);
    setText(q('.bb-time'), raid.state === 'live' || raid.state === 'clear' || raid.state === 'wipe' ? mmss(raid.fightTime || 0) : raid.state === 'prepull' ? 'Waiting for the pull' : '');
    layeredHp(raid, now, dt, fm);
    q('#boss-bar').classList.toggle('untargetable', !!b.u);
    q('#boss-bar').classList.toggle('walled', !!raid.wallLabel);   // sealed at a gate (fight.js raiseWall)
    posture(raid, now, dt);
    gateTicks(raid);
    q('#boss-bar').classList.toggle('stopped', paused(raid, now));   // a Time Stop (fight.js pauseBoss)
    castFrame(raid, now);
    upcoming(raid, now);
    bossStatus(raid, now, myId, marks);
    limitGauge(raid, myId, dt);
    recoverCue(raid);
    deathCounter(raid);

    // countdown before the pull
    const cd = $('countdown');
    if (raid.state === 'prepull' && raid.pullAt) {
      const left = Math.ceil(raid.pullAt - now);
      cd.classList.toggle('hidden', left <= 0);
      setText(cd, String(Math.max(1, left)));
    } else if (raid.state === 'countdown') {
      const left = Math.ceil(raid.countdownEnd - now);
      cd.classList.toggle('hidden', left > 5 || left <= 0);
      setText(cd, String(left));
    } else cd.classList.add('hidden');
    // a trial opens on its memory: two lines of lore while the countdown runs
    const lore = $('trial-lore'), T = raid.def.trial && TRIALS[raid.def.trial];
    if (T && raid.state === 'countdown') {
      if (lore.dataset.k !== T.spec) {
        lore.dataset.k = T.spec;
        lore.querySelector('b').textContent = T.name;
        lore.querySelectorAll('p').forEach((p, i) => { p.textContent = T.lore[i] || ''; });
      }
      lore.classList.remove('hidden');
      lore.classList.toggle('out', raid.countdownEnd - now < 1.2);
    } else { lore.classList.add('hidden'); lore.dataset.k = ''; }

    for (const [id, p] of raid.party) {
      const f = frames[id];
      if (!f) continue;
      const hpF = p.maxHp ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0, shF = p.maxHp ? Math.min(1, p.shield / p.maxHp) : 0;
      // (dead: what was left drains away quickly instead of vanishing)
      f.trailV = p.alive ? trailStep(f.trailV, hpF, p.hitAt, now, dt) : Math.max(0, f.trailV - dt * 2.2);
      // healed: a soft green sweep along the bar (a HoT's ticks share one every 0.4s at most)
      if (p.alive && f.alive && f.hpV != null && p.maxHp > 1 && hpF > f.hpV + 0.004 && now - f.healAt > 0.4 && f.hl.animate) {
        f.healAt = now;
        f.hl.animate([{ transform: 'translateX(-100%)', opacity: 0.85 }, { transform: 'translateX(100%)', opacity: 0 }], { duration: 480, easing: 'ease-out' });
      }
      // down: the bar dips once as the frame greys out (style.css .pf transition)
      if (f.alive === true && !p.alive && f.bar.animate) f.bar.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)', offset: 0.3 }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
      f.hpV = hpF; f.alive = p.alive;
      setX(f.hp, hpF);
      setX(f.trail, f.trailV);
      setW(f.sh, (shF * 100).toFixed(1) + '%');
      // several shields: each its own run in its caster's class colour, the one that runs out first at the far end (style.css keeps the stripes)
      const shKey = p.shs && p.shs.length ? p.shs.map(q => q.c + ':' + q.a).join(',') : '';
      if (f.sh._k !== shKey) {
        f.sh._k = shKey;
        if (!shKey) f.sh.style.backgroundImage = '';
        else {
          const parts = p.shs.slice().reverse(), tot = parts.reduce((q, x) => q + x.a, 0) || 1; let at = 0;
          const stops = parts.map(x => { const a0 = at; at += x.a / tot * 100; return `${x.c}e0 ${a0.toFixed(1)}% ${at.toFixed(1)}%`; }).join(', ');
          f.sh.style.backgroundImage = `repeating-linear-gradient(-45deg, #ffffff40 0 3px, #ffffff00 3px 6px), linear-gradient(90deg, ${stops})`;
        }
      }
      const shL = Math.min(100 - shF * 100, hpF * 100).toFixed(1) + '%';
      if (f.sh._l !== shL) { f.sh._l = shL; f.sh.style.left = shL; }
      // a heal being cast on them: a lighter green run on from their health, its expected size (up to full)
      const incF = p.alive && p.maxHp > 1 && marks.incoming ? Math.max(0, Math.min(1 - hpF, (marks.incoming.get(id) || 0) / p.maxHp)) : 0;
      setW(f.inc, (incF * 100).toFixed(1) + '%');
      const incL = (hpF * 100).toFixed(1) + '%';
      if (f.inc._l !== incL) { f.inc._l = incL; f.inc.style.left = incL; }
      // healers read the missing health (what a heal would fill); everyone else reads current health
      const missing = p.maxHp - p.hp;
      // (maxHp is 1 until the host's first party update arrives)
      const txt = p.left ? 'Left' : p.maxHp <= 1 ? '' : !p.alive ? 'Down' : marks.healer && missing >= 1 ? '−' + fmt(missing) : fmt(p.hp);
      if (txt !== f.txtKey) { f.txtKey = txt; f.txt.textContent = txt; f.txt.classList.toggle('def', txt[0] === '−'); }
      f.row.classList.toggle('dead', !p.alive);
      f.row.classList.toggle('me', id === myId);
      f.row.classList.toggle('target', id === marks.locked);
      f.row.classList.toggle('healnext', id === marks.heal && id !== marks.locked);
      f.row.classList.toggle('aggro', id === marks.aggro && p.alive);
      f.row.classList.toggle('ult', !!(marks.ult && marks.ult.has(id)) && p.alive);   // (their Ultimate is full)
      f.row.classList.toggle('mid', p.alive && hpF < 0.6 && hpF >= 0.35);
      f.row.classList.toggle('low', p.alive && hpF < 0.35);
      f.row.classList.toggle('hit', p.alive && now - (p.hitAt || -9) < 0.2);
      f.row.classList.toggle('cleanse', !!marks.cleanse && p.alive && !!(p.dd || p.vuln || (p.debuffs || []).some(([k]) => k === 'slowed' || k === 'rooted')));
      const casting = marks.casting && marks.casting.id === id;
      setS(f.cast, casting ? marks.casting.frac : 0);
      f.row.classList.toggle('casting', !!casting);
      const chips = [];
      if (raid.away && raid.away.has(id) && !p.left) chips.push(`<b class="chip away" data-tip="Their connection dropped. A stand-in plays their hero until they are back.">Away</b>`);
      if (!p.alive && !p.left && raid.rezAsks && raid.rezAsks[id]) chips.push(`<b class="chip rez" data-tip="Asked for a raise">Raise?</b>`);
      for (const [hid, secs, from] of p.hots || []) {
        const h = HOT_ICON[hid];
        if (h) chips.push(`<b class="chip hot${from === myId ? '' : ' theirs'}" data-tip="${h[2]}: healing over time"><u style="background-image:url(${abilityIcon(h[0], h[1])})"></u>${secs}</b>`);
      }
      // a healer's buff on this one ally (engine.js ALLY_BUFFS: Blessed, Quickened...), wearing the move's icon
      for (const b of raid.abuffs || []) {
        const d = b.to === id && b.end > now && typeof ALLY_BUFFS !== 'undefined' ? ALLY_BUFFS[b.id] : null;
        if (d) chips.push(`<b class="chip hot${b.from === myId ? '' : ' theirs'}" data-tip="${d.name}: ${d.text}"><u style="background-image:url(${abilityIcon(d.cls, d.icon)})"></u>${Math.ceil(b.end - now)}</b>`);
      }
      // a Gloomsworn's Hollow: held at 1 HP while the damage it takes is written down as a debt; the bar is what has been healed back against it
      f.row.classList.toggle('hollow', !!p.hollow && p.alive);
      if (p.hollow && p.alive) {
        const hl = p.hollow, paid = hl.debt > 0 ? Math.min(1, hl.healed / hl.debt) : 1, secs = Math.ceil(Math.max(0, hl.left > 0 ? hl.left : hl.grace));
        chips.push(`<b class="chip hollow" data-tip="Hollow: held at 1 HP, dealing 30% more damage. Everything it takes is a debt of ${Math.round(hl.debt)}; ${Math.round(hl.healed)} healed back so far. Heal at least the debt before the ${hl.left > 0 ? 'Hollow and its grace end' : 'grace ends'} or it falls.">Hollow ${Math.round(hl.debt)}<i><s style="width:${Math.round(paid * 100)}%"></s></i>${Math.round(hl.healed)} · ${secs}s</b>`);
      }
      // the statuses wear the same icons as the row over your hotbar (status-icons.js)
      const ic = id => `<u class="st-ic">${statusIcon(id)}</u>`;
      if (p.mit) chips.push(`<b class="chip mit ic" data-tip="Taking ${p.mit}% less damage">${ic('mit')}${p.mit}%</b>`);
      if (p.dd) chips.push(`<b class="chip bad ic" data-tip="Damage Down: dealing 10% less damage">${ic('dd')}${p.dd}</b>`);
      if (p.vuln) chips.push(`<b class="chip bad ic" data-tip="Vulnerability: taking ${p.vuln}% more damage">${ic('vuln')}${p.vuln}%</b>`);
      if (p.weak) { const [wp, ws] = Array.isArray(p.weak) ? p.weak : [0, 0]; chips.push(`<b class="chip bad ic" data-tip="Raise Sickness: just raised, dealing and healing ${wp}% less for ${ws}s more">${ic('weak')}${wp ? wp + '%' : ''}</b>`); }
      for (const [k, s] of p.debuffs || []) { const d = STATUS_INFO[k]; chips.push(`<b class="chip bad ic" data-tip="${d ? d[0] + ': ' + d[1] : k}">${ic(k)}${s}</b>`); }
      const key = chips.join('');
      if (key !== f.key) { f.key = key; f.st.innerHTML = key; }
    }
    const me = raid.party.get(myId);
    const down = !!me && !me.alive && raid.state === 'live';
    $('down-veil').classList.toggle('hidden', !down);
    rezAsk(down ? raid : null, myId);
    deathRecap(down ? raid : null, now);
  }

  // the progression record for this boss and difficulty: pull count, the best pull, and the last pulls as bars
  // (taller = further; a clear is full and gold). prog null: hidden (a trial, a practice run)
  let progKey = '';
  function prog(r) {
    const el = $('prog'), key = r ? r.n + ':' + (r.best ? r.best.pct : '-') : '-';
    if (key === progKey) return;
    progKey = key;
    el.classList.toggle('hidden', !r);
    if (!r) return;
    const b = r.best, last = r.pulls.slice(-24);
    const head = !r.n ? 'First pull' : b && b.clear ? `Cleared · pull ${b.n}` : `Best ${b.pct.toFixed(1)}% · phase ${b.ph}`;
    el.innerHTML = `<h6>Progress<span>Pull ${r.n + 1}</span></h6><b>${head}</b>` +
      (last.length ? `<div class="pg-bars">${last.map(p => `<i class="${p.clear ? 'clear' : ''}${b && p.n === b.n ? ' best' : ''}" style="height:${Math.max(6, 100 - p.pct).toFixed(0)}%"></i>`).join('')}</div>` : '');
    [...el.querySelectorAll('.pg-bars i')].forEach((bar, i) => {
      const p = last[i];
      Tip.set(bar, `<b>Pull ${p.n}</b><em>${p.clear ? 'Cleared' : p.pct.toFixed(1) + '% · phase ' + p.ph} · ${mmss(p.time)}</em>`);
    });
  }

  // the boss's title card as the room loads: its name, its title, and (the first time you ever meet it) a line from it
  const INTRO_LINES = {
    grubnak: "Service started an hour ago. You're late, and you're the special.",
    skitterra: 'Hush now. The web hears every step you take.',
    volkar: 'You climbed all this way to stand in my storm?',
    hollowking: 'The court is in session. Kneel, or be judged standing.',
    titan: 'The ice remembers every step. Mind where you put yours.',
  };
  INTRO_LINES.archmage = 'Seven circles, and a place for each of you in them. Mind where you stand.';
  let introTimer = null;
  function intro(def, mode, firstMeet) {
    const el = $('boss-intro');
    clearTimeout(introTimer);
    el.querySelector('small').textContent = mode === 'hard' ? 'Hard' : '';
    el.querySelector('b').textContent = def.name;
    el.querySelector('i').textContent = def.title || '';
    const line = firstMeet && INTRO_LINES[def.id];
    el.querySelector('q').textContent = line || '';
    el.classList.toggle('line', !!line);
    el.classList.remove('hidden', 'out');
    void el.offsetWidth;   // restart the fade-in
    el.classList.add('in');
    // [boss presentation] the name lands on his entrance's beat (BOSS_VFX.intro: the pot slammed down, her landing, the
    // storm crashing in, his eyes lighting): a hit-stop-like punch, then his title slides in under it. Cosmetic only.
    const beat = INTRO_BEAT[def.id] ?? 0.4, nameEl = el.querySelector('b'), titleEl = el.querySelector('i');
    if (nameEl.animate) {
      nameEl.animate([{ opacity: 0, transform: 'scale(1.35)', letterSpacing: '.3em' }, { opacity: 1, transform: 'scale(0.96)', letterSpacing: '.1em', offset: 0.55 }, { opacity: 1, transform: 'scale(1.02)', offset: 0.62 }, { opacity: 1, transform: 'scale(1)', letterSpacing: '.12em' }],
        { duration: 420, delay: beat * 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      titleEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: beat * 1000 + 180, easing: 'ease-out', fill: 'backwards' });
    }
    introTimer = setTimeout(() => { el.classList.add('out'); introTimer = setTimeout(() => el.classList.add('hidden'), 900); }, (line ? 4200 : 2600) + beat * 1000);
  }
  const INTRO_BEAT = { grubnak: 0.7, skitterra: 0.9, volkar: 0.3, hollowking: 1.6 };   // [boss presentation] (boss-vfx.js intro)

  // the waymark bar: lit for each marker on the floor, and for the one being placed (marks null: hidden, e.g. a trial)
  let wmKey = '';
  function waymarks(marks, placing) {
    const el = $('waymarks'), key = marks ? Object.keys(marks).sort().join('') + '|' + (placing || '') : '-';
    if (key === wmKey) return;
    wmKey = key;
    el.classList.toggle('hidden', !marks);
    if (!marks) return;
    for (const b of el.children) { b.classList.toggle('on', !!marks[b.dataset.k]); b.classList.toggle('placing', b.dataset.k === placing); }
  }

  // the ready check (raid.rc, main.js): a small prompt with a row for each hero (bots are always ready), your Ready / Not ready
  // while you have not answered, and the outcome for a moment once it closes
  const RC_MARK = {
    yes: svg('<path d="M2.4 6.3 5 8.8 9.7 3.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    no: svg('<path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    wait: svg('<circle cx="6" cy="6" r="1.5" fill="currentColor"/>'),
  };
  let rcId = -1;
  function readyCheck(raid, now, myId) {
    const el = $('ready-check'), c = raid.rc;
    const res = c && c.res, show = !!c && raid.state === 'prepull' && (!res || now - c.resAt < (res.ok ? 1.3 : 3.4));
    if (!show) { if (rcId !== -1) { el.classList.add('hidden'); rcId = -1; } return; }
    const list = [...raid.roster].sort((a, b) => ({ tank: 0, healer: 1, dps: 2 }[a.role] - { tank: 0, healer: 1, dps: 2 }[b.role]) || a.id - b.id);
    if (rcId !== c.id) {   // a new check: the rows
      rcId = c.id;
      const by = list.find(r => r.id === c.by);
      setText(el.querySelector('.rc-head span'), by ? `Called by ${by.name}` : '');
      el.querySelector('.rc-row').innerHTML = list.map(r => `<span class="rc-m" data-id="${r.id}" style="--rc:${(ROLES[r.role] || ROLES.dps).color}"><em>${esc(r.name)}</em><u></u></span>`).join('');
      el.classList.remove('hidden');
    }
    const no = new Set(res && res.no || []);
    for (const m of el.querySelector('.rc-row').children) {
      const id = Number(m.dataset.id), r = list.find(x => x.id === id);
      const st = res && res.ok ? 'yes' : no.has(id) ? 'no' : r && r.bot ? 'yes' : c.ans.has(id) ? (c.ans.get(id) ? 'yes' : 'no') : 'wait';
      if (m._s !== st) { m._s = st; m.className = 'rc-m ' + st; m.querySelector('u').innerHTML = RC_MARK[st]; }
    }
    el.classList.toggle('ok', !!(res && res.ok)); el.classList.toggle('bad', !!(res && !res.ok));
    if (res) {
      const names = [...no].map(id => (list.find(r => r.id === id) || {}).name).filter(Boolean);
      setText(el.querySelector('.rc-head span'), res.ok ? 'Everyone is ready' : names.length ? `Not ready: ${names.join(', ')}` : 'Called off');
    }
    const mine = c.ans.has(myId) || c.sent;
    el.querySelector('.rc-act').classList.toggle('hidden', !!res || mine);
    el.querySelector('.rc-bar').classList.toggle('hidden', !!res);
    if (!res) {
      el.querySelector('.rc-bar i').style.width = Math.max(0, Math.min(1, (c.end - now) / c.dur)) * 100 + '%';
      const kb = typeof Keybinds !== 'undefined' ? Keybinds : null, kyes = kb ? kb.label(kb.keyFor('rcyes')) : 'Y', kno = kb ? kb.label(kb.keyFor('rcno')) : 'X';
      const ks = el.querySelectorAll('.rc-act kbd');
      setText(ks[0], kyes); setText(ks[1], kno);
      ks[0].classList.toggle('hidden', kyes === '—'); ks[1].classList.toggle('hidden', kno === '—');
    }
  }

  // ---------------------------------------------------------------- Limit Break
  // the party's gauge under the frames: three bars, each lit as it fills (the effect is your role's: see limitTip)
  // (the fill eases toward the gauge's value over ~0.15s; a bar that fills lights once, and the key breathes while ready)
  let lbKey = '', lbRole = 'dps', lbBars = 0, lbShown = 0, lbSegs = null, lbLevel = -1;
  function limitGauge(raid, myId, dt = 0) {
    const el = $('lb-gauge'), show = !raid.def.trial && (raid.state === 'live' || raid.state === 'prepull');
    const me = roster.find(r => r.id === myId); if (me) lbRole = me.role;
    const v = Math.max(0, Math.min(300, raid.lb || 0));
    // three bars with someone down: the gauge calls for the raise (any role's Limit Break raises the fallen)
    const raise = show && v >= 300 && [...raid.party.values()].some(q => !q.alive && !q.left) && !(me && !raid.party.get(myId)?.alive);
    const kk = typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('limit')) : 'G';
    // the ease: close to an exponential approach, snapped once within a hair (a spend drops at the same pace)
    lbShown = !show ? v : Math.abs(v - lbShown) < 0.3 ? v : lbShown + (v - lbShown) * (1 - Math.exp(-dt / 0.05));
    const key = show ? lbShown.toFixed(1) : '-';
    if (key + kk + raise === lbKey) return;
    lbKey = key + kk + raise;
    el.classList.toggle('raise', raise);
    const sm = el.querySelector('small'); if (sm) sm.textContent = raise ? 'Raise' : 'Limit';
    el.classList.toggle('hidden', !show);
    const kb = el.querySelector('.lb-key'); if (kb && kb.textContent !== kk) kb.textContent = kk;
    if (!show) { lbLevel = -1; return; }
    lbBars = Math.floor(v / 100);
    el.classList.toggle('ready', lbBars >= 1);
    if (!lbSegs || !lbSegs[0].isConnected) lbSegs = [...el.querySelectorAll('.lb-bars i')];
    lbSegs.forEach((seg, i) => {
      const f = Math.max(0, Math.min(1, (lbShown - i * 100) / 100));
      seg.classList.toggle('full', f >= 1);
      const s = f.toFixed(3);
      if (seg._s !== s) { seg._s = s; seg.firstChild.style.transform = `scaleX(${s})`; }
    });
    // a level reached (not on the first look at it): that bar lights once and the gauge's frame pulses
    const lv = Math.floor(lbShown / 100 + 1e-6);
    if (lbLevel >= 0 && lv > lbLevel && lbSegs[lv - 1] && lbSegs[lv - 1].animate) {
      lbSegs[lv - 1].animate([{ filter: 'brightness(2.1)', boxShadow: '0 0 0 1px #ffe9b0, 0 0 10px #ffd27a' }, { filter: 'brightness(1)', boxShadow: '0 0 0 0 #ffe9b000, 0 0 0 #ffd27a00' }], { duration: 700, easing: 'ease-out' });
      el.animate([{ boxShadow: '0 0 0 1px #f2d38aa0, 0 0 14px #ffd27a60' }, { boxShadow: '0 0 0 1px #f2d38a00, 0 0 0 #ffd27a00' }], { duration: 900, easing: 'ease-out' });
    }
    lbLevel = lv;
  }
  // After a death on Hard the boss hits lighter for a few seconds (fight.js FIGHT.REC): say so, beside the gauge
  let rcShown = -1;
  function recoverCue(raid) {
    const gauge = $('lb-gauge'); if (!gauge) return;
    let el = $('rc-cue');
    if (!el) { el = document.createElement('div'); el.id = 'rc-cue'; el.className = 'hidden'; gauge.insertAdjacentElement('afterend', el); Tip.set(el, () => `<b>Recovering</b>A fall steadies the party: the boss's hits land ${Math.round(FIGHT.REC.CUT * 100)}% lighter for a few seconds. Raise your fallen now.`); }
    const rc = raid.state === 'live' && !raid.def.trial ? (raid.rc || 0) : 0;
    if (rc === rcShown) return;
    rcShown = rc;
    el.classList.toggle('hidden', rc <= 0);
    if (rc > 0) el.innerHTML = `Recovering<b>${rc}s</b>`;
  }
  // the party's deaths this pull, beside the gauge (shared by everyone); its tip says what the next raise will cost
  // (fight.js FIGHT.SICK: the same sum as FightSim.sickness)
  let dcShown = '', dcRaid = null;
  function nextSickness(deaths, kind) {
    const S = FIGHT.SICK, b = S[kind], n = Math.max(0, deaths);   // (the next death is the one the raise answers)
    return { pct: Math.round(Math.min(S.MAX.pct, b.pct + n * S.PER_DEATH.pct) * 100), dur: Math.min(S.MAX.dur, b.dur + n * S.PER_DEATH.dur) };
  }
  function deathCounter(raid) {
    const gauge = $('lb-gauge'); if (!gauge) return;
    let el = $('dc-count');
    if (!el) {
      el = document.createElement('div'); el.id = 'dc-count'; el.className = 'hidden';
      ($('rc-cue') || gauge).insertAdjacentElement('afterend', el);
      Tip.set(el, () => {
        const raid = dcRaid, d = (raid && raid.dc) || 0, down = raid ? [...raid.party.values()].some(q => !q.alive && !q.left) : false;
        const n = down ? d : d + 1, c = nextSickness(n - 1, 'cast'), i = nextSickness(n - 1, 'instant');
        return `<b>Deaths</b>The party has fallen ${d === 1 ? 'once' : d + ' times'} this pull. Every fall makes the next raise cost more.`
          + `<br><br>${down ? 'The next raise' : 'A raise after the next fall'}:<br>Cast raise: ${c.pct}% less damage and healing for ${c.dur}s<br>Instant raise: ${i.pct}% less for ${i.dur}s<br>Limit Break: none`;
      });
    }
    dcRaid = raid;
    const show = raid.state === 'live' && !raid.def.trial && !raid.pvp, d = raid.dc || 0, key = show + ':' + d;
    if (key === dcShown) return;
    dcShown = key;
    el.classList.toggle('hidden', !show);
    if (show) el.innerHTML = `Deaths<b>${d}</b>`;
  }
  // a Kenseier in the party: the boss's Posture under its name (main.js raid.posture from the 'fb' message: p, max, broken (seconds of the
  // Break left), hold (full, held until a cast ends), rec (recovering), by). White-gold fill; a grey back-fill holds the level it is
  // recovering from; a Break flashes the bar and cracks it, then drains it over the Break's seconds; a held bar pulses full.
  let postTrail = 0, postBroke = false, postBrkMax = 4;
  function posture(raid, now, dt) { postureBar(q('.bb-post'), raid.posture, raid.state === 'live', dt); }
  // (the bar itself: the boss's, and the sparring dummy's in the yard, townPosture)
  function postureBar(bar, P, live, dt) {
    const on = !!P && live;
    bar.classList.toggle('hidden', !on);
    if (!on) { postTrail = 0; postBroke = false; return; }
    const frac = P.max ? Math.max(0, Math.min(1, P.p / P.max)) : 0, brk = P.broken > 0;
    if (brk && !postBroke) {
      postBrkMax = Math.max(0.5, P.broken);
      if (bar.animate) bar.animate([{ filter: 'brightness(3.2)', transform: 'scaleY(1.9)' }, { filter: 'brightness(1.6)', transform: 'scaleY(1.2)', offset: 0.3 }, { filter: 'brightness(1)', transform: 'scaleY(1)' }], { duration: 520, easing: 'ease-out' });
    }
    postBroke = brk;
    if (brk) postTrail = 0;
    else if (P.rec && postTrail > frac) { /* recovering: the grey keeps the level it is draining from */ }
    else postTrail = frac >= postTrail ? frac : Math.max(frac, postTrail - dt * 3);
    setX(bar.querySelector('.fill'), brk ? Math.min(1, P.broken / postBrkMax) : frac);
    setX(bar.querySelector('.back'), postTrail);
    bar.classList.toggle('brk', brk);
    bar.classList.toggle('hold', !!P.hold && !brk);
    bar.classList.toggle('rec', !!P.rec && !brk);
  }
  // the yard's plate: P is { p, max, broken, hold, rec } or null (hidden)
  function townPosture(P, dt = 0.016) {
    const el = $('town-posture'); if (!el) return;
    el.classList.toggle('hidden', !P);
    postureBar(el.querySelector('.bb-post'), P, true, dt);
  }
  function postureTip() {
    return '<b>Posture</b>Only a Kenseier\'s deflects fill it. When it is full the boss Breaks: it staggers and casts nothing, and the party hits harder until the Break ends or a Deathblow lands. It holds full through a cast and breaks when the cast ends. It drains slowly if nothing adds to it; the grey is what is draining away.';
  }
  function limitTip() {
    const L = FIGHT.LB, pct = a => a.slice(1).map(x => Math.round(x * 1000) / 10).join(' / ') + '%';
    const what = lbRole === 'tank' ? `<b>Stand Fast</b>The party takes ${pct(L.TANK)} less damage for ${L.TANK_DUR}s.`
      : lbRole === 'healer' ? `<b>Rekindle</b>Heals the party for ${pct(L.HEAL)} of their health.`
      : `<b>Emberfall</b>One blow worth ${pct(L.DPS)} of the boss's health.`;
    const raise = '<br><br><b>Raise</b>With all three bars, a Limit Break from any role also raises every fallen ally, with no Raise Sickness.';
    return `<b>Limit Break</b><em>${lbBars} of 3 bars · ${typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('limit')) : 'G'}</em>Every whole bar is spent at once, by whoever presses first. Filled by mechanics met cleanly and checks passed.<br><br>${what}${raise}`;
  }

  // ---------------------------------------------------------------- the live meter (M)
  // Everyone's running tally from the host twice a second (raid.meter: Scoring.pack rows, [id, damage, healing, taken, ...], at fight time ft).
  // Rates are the total over the fight so far. Damage, Healing, Output (both, stacked: a healer's smite and heals
  // add up), Damage taken, and Score (contribution points so far, scoring.js: partial until the fight ends); click a tab or
  // press the view key. On and view are saved with the settings.
  const METER_MODES = [['dmg', 'Damage'], ['heal', 'Heal'], ['out', 'Output'], ['taken', 'Taken'], ['score', 'Score']];
  let meterOn = true, meterMode = 'dmg', meterKey = '', meterLoaded = false;
  function meterLoad() {
    if (meterLoaded || typeof Save === 'undefined') return;
    meterLoaded = true;
    const v = Save.setting('meter', null);
    if (v && typeof v === 'object') { meterOn = v.on !== false; if (METER_MODES.some(m => m[0] === v.mode)) meterMode = v.mode; }
  }
  function meterSave() { meterKey = ''; if (typeof Save !== 'undefined') Save.setSetting('meter', { on: meterOn, mode: meterMode }); syncMeterBtn(); }
  function toggleMeter() { meterLoad(); meterOn = !meterOn; meterSave(); }
  function setMeterMode(m) { meterLoad(); meterMode = m; meterOn = true; meterSave(); }
  function cycleMeter() { meterLoad(); if (!meterOn) { meterOn = true; meterSave(); return; } setMeterMode(METER_MODES[(METER_MODES.findIndex(m => m[0] === meterMode) + 1) % METER_MODES.length][0]); }
  function syncMeterBtn() { const b = $('meter-btn'); if (b) { b.classList.toggle('on', meterOn); b.dataset.tip = `Damage meter: ${meterOn ? 'shown' : 'hidden'} (${typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('meter')) : 'M'}). ${typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('metermode')) : 'B'} switches the view.`; } }
  function meterBtn() {
    const b = $('meter-btn');
    if (!b || b._wired) return;
    b._wired = true; meterLoad(); syncMeterBtn();
    b.addEventListener('mousedown', e => e.stopPropagation());
    b.addEventListener('click', toggleMeter);
  }
  const rate = n => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : fmt(n));
  function liveMeter(raid, myId) {
    meterLoad(); meterBtn();
    let el = $('live-meter');
    if (!el) {
      el = document.createElement('div'); el.id = 'live-meter'; el.className = 'hidden'; root.appendChild(el);
      el.addEventListener('mousedown', e => {
        e.stopPropagation();
        const t = e.target.closest('[data-m]');
        if (t) setMeterMode(t.dataset.m);
      });
    }
    const m = raid.meter, show = meterOn && !!m && (raid.state === 'live' || raid.state === 'clear' || raid.state === 'wipe');
    el.classList.toggle('hidden', !show);
    if (!show) return;
    const ft = Math.max(1, m.ft || 0), b = raid.boss, enr = raid.def.enrage && raid.def.enrage[raid.mode];
    // Score: the same function that picks the MVP, on the stats so far
    const scoreOn = meterMode === 'score';
    let sc = null;
    if (scoreOn) {
      const stats = {};
      for (const row of m.d) { const r = roster.find(x => x.id === row[0]); if (r) stats[row[0]] = Scoring.unpack(row, { role: r.role }); }
      sc = Scoring.score(stats, { time: ft });
    }
    const rows = m.d.map(([id, d, h, tk]) => ({ id, d: d / ft, h: h / ft, tk: tk || 0, r: roster.find(x => x.id === id) })).filter(x => x.r)
      .map(x => ({ ...x, v: scoreOn ? (sc[x.id] ? sc[x.id].total : 0) : meterMode === 'dmg' ? x.d : meterMode === 'heal' ? x.h : meterMode === 'out' ? x.d + x.h : x.tk }))
      .sort((a, c) => c.v - a.v || a.id - c.id);
    const top = Math.max(1, rows.length ? rows[0].v : 1), sumD = rows.reduce((n, x) => n + x.d, 0), sumV = rows.reduce((n, x) => n + x.v, 0);
    // what the party still has to do: the boss's health left over the time before the enrage
    const left = b && b.mx > 0 ? Math.max(0, b.hp) : 0, tl = enr ? Math.max(0, enr - ft) : 0, live = raid.state === 'live' && left > 0;
    const need = live && enr ? left / Math.max(1, tl) : 0;
    const key = [meterMode, Math.round(ft), rows.map(x => `${x.id}:${Math.round(x.d)}:${Math.round(x.h)}:${x.tk}:${scoreOn ? x.v : ''}`).join('|'), live ? Math.round(left / 10) : 'e', myId].join(';');
    if (key === meterKey) return;
    meterKey = key;
    const unit = meterMode === 'taken' || scoreOn ? '' : '/s';
    const tabs = METER_MODES.map(([k, n]) => `<button type="button" class="lm-tab${k === meterMode ? ' on' : ''}" data-m="${k}">${n}</button>`).join('');
    const body = rows.map((x, i) => {
      const w = x.v / top * 100, dw = meterMode === 'out' && x.v > 0 ? w * x.d / x.v : 0;
      const bar = meterMode === 'out' ? `<i class="d" style="width:${dw.toFixed(1)}%"></i><i class="h" style="left:${dw.toFixed(1)}%;width:${(w - dw).toFixed(1)}%"></i>`
        : `<i class="${meterMode === 'heal' ? 'h' : meterMode === 'taken' ? 't' : 'd'}" style="width:${w.toFixed(1)}%"></i>`;
      const s0 = scoreOn && sc[x.id];
      const tip = `<b>${esc(x.r.name)}</b><em>${esc(CLASSES.find(c => c.id === x.r.cls)?.name || '')}${x.r.bot ? ' · bot' : ''}</em>` + (s0
        ? Object.entries(s0.pts).map(([k, v]) => `${Scoring.LABEL[k]} ${Math.round(v)}`).join('<br>') + (s0.pen.avoid ? `<br>Avoidable hits -${s0.pen.avoid}` : '') + (s0.pen.deaths ? `<br>Deaths -${s0.pen.deaths}` : '') + '<br><em>Live: settles when the fight ends</em>'
        : `Damage ${fmt(x.d)}/s<br>Healing ${fmt(x.h)}/s<br>Taken ${fmt(x.tk)}`);
      return `<div class="lm-row${x.id === myId ? ' me' : ''}" style="--rc:${ROLES[x.r.role].color}" data-th="${esc(tip)}"><small>${i + 1}</small><i class="pf-role">${ROLE_GLYPH[x.r.role] || ''}</i><span>${esc(x.r.name)}</span><b>${scoreOn ? Math.round(x.v) : rate(x.v)}<u>${unit}</u></b><div class="lm-bar">${bar}</div></div>`;
    }).join('');
    // the pace: ahead of or behind the damage the boss's remaining health asks for before the enrage
    let pace = '';
    if (live) {
      const proj = sumD > 0 ? left / sumD : Infinity, ok = enr ? sumD >= need : true;
      pace = `<div class="lm-need ${ok ? 'ahead' : 'behind'}"><span>Boss ${fmt(left)}</span>${enr ? `<b>Need ${rate(need)}/s <em>${ok ? '▲' : '▼'}</em></b>` : `<b>${proj < 5999 ? mmss(proj) + ' to kill' : ''}</b>`}</div>${enr ? `<div class="lm-need"><span>Enrage in ${mmss(tl)}</span>${proj < 5999 ? `<b>Kill in ${mmss(proj)}</b>` : ''}</div>` : ''}`;
    }
    el.innerHTML = `<h6>${tabs}</h6>${body}<div class="lm-sum"><span>${mmss(ft)}</span><b>${scoreOn ? 'Contribution so far' : `Party ${rate(sumV)}${unit}`}</b></div>${pace}`;
    el.querySelectorAll('[data-th]').forEach(r => Tip.set(r, r.dataset.th));   // (the tips carry markup: Tip.set, not data-tip, which is escaped)
  }

  // ---------------------------------------------------------------- asking for a raise
  // On the Down screen, while a healer stands: ask them to raise you (main.js askRaise). Once asked it says so, and your
  // frame carries the ask for everyone until you're back up.
  let rezKey = '';
  function rezAsk(raid, myId) {
    const el = $('rez-ask');
    const healer = !!raid && !raid.def.trial && !raid.pvp && roster.some(r => r.role === 'healer' && r.id !== myId && (p => p && p.alive && !p.left)(raid.party.get(r.id)));
    const asked = healer && !!(raid.rezAsks && raid.rezAsks[myId]);
    const kk = typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('rezask')) : 'H';
    const key = !healer ? '' : asked ? 'asked' : 'ask:' + kk;
    if (key === rezKey) return;
    rezKey = key;
    el.classList.toggle('hidden', !healer);
    el.classList.toggle('asked', asked);
    el.disabled = asked;
    el.innerHTML = asked ? 'Raise asked for' : `Ask for a raise${kk !== '—' ? ` <kbd>${esc(kk)}</kbd>` : ''}`;
    Tip.set(el, asked ? '<b>Raise asked for</b>Your healers see it on your frame.' : '<b>Ask for a raise</b>Your healers see it on your frame; a healer bot raises you first once it can stand for the cast.');
  }

  // ---------------------------------------------------------------- the death recap
  // On the Down screen: the hits in the last 10 s before you fell, the killing blow on top. Each is named by the move it
  // came from; hits that aren't part of a move are named by what they are.
  const HIT_KIND = { auto: 'Auto-attack', pulse: 'Storm Pulse', static: 'Static', bite: 'Spiderling', addspit: 'Spit', silkbeam: 'Silk Beam',
    bleed: 'Bleed', thread: 'Shared Thread', tithe: 'Royal Tithe', fall: 'The Fall', burn: 'Fire', grease: 'Grease Fire', fury: 'Fury',
    skeleton: 'Skeleton', spiderling: 'Spiderling', edge: 'The Edge', pit: 'Acid Pit', 'stack-miss': 'Missed Stack', 'tower-fail': 'Missed Tower' };
  let recapKey = '';
  function deathRecap(raid, now) {
    const el = root.querySelector('#down-veil .recap');
    if (!raid) { if (recapKey) { recapKey = ''; el.innerHTML = ''; } return; }
    const hits = raid.hits || [];
    const last = hits.length ? hits[hits.length - 1].t : 0;
    const key = hits.length + ':' + last;
    if (key === recapKey) return;
    recapKey = key;
    const list = hits.filter(h => h.t >= last - 10).slice(-5).reverse();
    if (!list.length) { el.innerHTML = ''; return; }
    const name = h => h.k === 'enrage' ? (raid.def.enrageName || 'Enrage') : h.n || HIT_KIND[h.k] || h.cast || (h.k ? h.k[0].toUpperCase() + h.k.slice(1) : 'A hit');
    el.innerHTML = `<h6>What hit you</h6>` + list.map((h, i) => `
      <div class="rc-row${i === 0 ? ' kill' : ''}${h.dd ? ' dd' : ''}">
        <b>${esc(name(h))}</b><i>${fmt(h.a)}</i><small>${i === 0 ? 'killing blow' : (h.hp != null ? fmt(h.hp) + ' left' : '')}</small><em>${(h.t - last).toFixed(1)}s</em>
      </div>`).join('');
    [...el.querySelectorAll('.rc-row.dd')].forEach(r => Tip.set(r, '<b>Avoidable</b>This one could have been dodged.'));
  }

  // ---------------------------------------------------------------- boss plate extras
  // the boss's next moves (the host's 'bnext' feed: [[name, seconds until], ...]), counting down between updates.
  // Nothing shows without fresh data (none yet, or older than 3s).
  // The boss's cast, big and near the middle of the screen: the move's icon, its name, and a bar with the seconds left;
  // it flashes as the cast goes off. Between casts it shows the next move coming, dimmed, counting down. Drag it
  // anywhere (it remembers); double-click puts it back.
  let castKey = '';
  // seconds left on a feed entry: one the host marked held ([name, secs, 1]: a Time Stop on the boss, fight.js
  // pauseBoss) only counts down once the stop is over
  const paused = (raid, now) => !!(raid.bossPause && now < raid.bossPause.end);
  function feedLeft(raid, e, at, now) {
    const p = raid.bossPause;
    let gone = now - at;
    if (e[2] && p) gone -= Math.max(0, Math.min(now, p.end) - Math.max(at, p.at));
    return e[1] - gone;
  }
  function castFrame(raid, now) {
    const el = $('boss-cast'), c = raid.cast, n = raid.bnext;
    let mode = '', name = '', frac = 0, left = 0;
    if (c && now < c.start + c.dur + 0.25) { mode = now >= c.start + c.dur ? 'done' : 'cast'; name = c.name; frac = Math.min(1, (now - c.start) / c.dur); left = Math.max(0, c.start + c.dur - now); }
    else if (raid.state === 'live' && n && n.l.length && now - n.at <= 3) {
      const nm = n.l[0][0]; left = Math.max(0, feedLeft(raid, n.l[0], n.at, now));
      if (left <= 15 || paused(raid, now)) { mode = 'next'; name = nm; }
    }
    el.classList.toggle('hidden', !mode);
    if (!mode) { castKey = ''; return; }
    const key = mode + '|' + name;
    if (key !== castKey) {
      castKey = key;
      // what kind of move: a damage check (a goal on the boss bar), the enrage, a hit for the tank, a hit for everyone
      const kind = mode === 'cast' && c && c.goal != null ? 'check'
        : name === (raid.def.enrageName || 'Enrage') ? 'enrage'
        : typeof BUSTER_CASTS !== 'undefined' && BUSTER_CASTS.test(name) ? 'buster'
        : typeof RAID_CASTS !== 'undefined' && RAID_CASTS.test(name) ? 'raid' : '';
      el.className = mode + (kind ? ' k-' + kind : '');
      el.dataset.kind = { check: 'Damage check', enrage: 'Enrage', buster: 'Tank hit', raid: 'Hits everyone' }[kind] || '';
      el.querySelector('.bc-icon').style.backgroundImage = typeof BossIcons !== 'undefined' ? BossIcons.css(raid.def.id, name) : '';
      setText(el.querySelector('.bc-name'), name);
    }
    setX(el.querySelector('.bc-bar .fill'), frac);
    setText(el.querySelector('.bc-left'), mode === 'cast' ? left.toFixed(1) : mode === 'next' ? Math.ceil(left) + 's' : '');
    // a Time Stop: the frame turns pale and says so, its count held (a cast already running keeps going: its hit is out)
    const stop = paused(raid, now);
    el.classList.toggle('stopped', stop);
    setText(el.querySelector('small'), stop ? 'Time Stop' : 'Next');
  }
  function castFrameDrag() {
    const el = $('boss-cast'), KEY = 'emberfall.castFrame';
    const place = pos => { el.style.left = pos ? (pos.x * 100).toFixed(2) + '%' : ''; el.style.top = pos ? (pos.y * 100).toFixed(2) + '%' : ''; };
    let pos = null;
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) pos = v; } catch (e) { /* no storage: the default spot */ }
    place(pos);
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      const r = el.getBoundingClientRect(), ox = e.clientX - (r.left + r.width / 2), oy = e.clientY - (r.top + r.height / 2);
      el.classList.add('dragging');
      const move = ev => { pos = { x: clamp((ev.clientX - ox) / innerWidth, 0.06, 0.94), y: clamp((ev.clientY - oy) / innerHeight, 0.05, 0.95) }; place(pos); };
      const up = () => {
        removeEventListener('mousemove', move); removeEventListener('mouseup', up); el.classList.remove('dragging');
        try { if (pos) localStorage.setItem(KEY, JSON.stringify(pos)); } catch (err) { /* it just won't be remembered */ }
      };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
    el.addEventListener('dblclick', e => { e.stopPropagation(); pos = null; place(null); try { localStorage.removeItem(KEY); } catch (err) { /* nothing kept */ } });
  }

  function upcoming(raid, now) {
    const el = root.querySelector('.bb-next'), n = raid.bnext;
    const fresh = n && raid.state === 'live' && now - n.at <= 3;
    const rows = fresh ? n.l.map(e => [e[0], feedLeft(raid, e, n.at, now)]).filter(([, s]) => s > -0.5).slice(0, 3) : [];
    const key = rows.map(([name, s]) => name + ':' + Math.max(0, Math.ceil(s))).join('|');
    if (key === nextKey) return;
    nextKey = key;
    el.classList.toggle('hidden', !rows.length);
    const icon = name => (typeof BossIcons !== 'undefined' ? `<u style="background-image:${BossIcons.css(raid.def.id, name)}"></u>` : '');
    el.innerHTML = rows.map(([name, s]) => `<span>${icon(name)}<b>${esc(name)}</b><i>${Math.max(0, Math.ceil(s))}</i></span>`).join('');
  }

  // The boss's health in stacked bars of BAR_HP each, counted down (×N): every blow takes a real bite out of the bar on
  // top, and the one below shows through in its own colour. The colours just cycle (they say nothing about the acts).
  // A pale ghost lingers where the health just was, holds a beat after a big blow, then drains after it; a blow that
  // breaks several bars leaves the whole top bar ghosted until it catches up.
  const BAR_HP = 10000;
  const BAR_COLS = ['#c2412c', '#c7772a', '#b39a2e', '#5f9a3c', '#2f8f88', '#3f6fb3', '#7d52b0', '#b04a86'];
  const FORM_COLS = ['#37a7a4', '#3f86b8', '#4aa67e', '#6e86c4', '#2f9890', '#5a9ab0'];   // (a second form: sea tones)
  const GORGED_COLS = ['#c9852a', '#a8521e', '#d8a63a', '#8a5a1e', '#b8742a'];   // (Grubnak gorged: gravy, crust and fat)
  let ghostHp = 0, ghostHold = 0, lastHp = 0, shownHp = 0;
  function layeredHp(raid, now, dt, fm) {
    const b = raid.boss, mx = b.mx || 0, real = Math.max(0, Math.min(mx, b.hp || 0));
    // a big heal (a second form healing back) refills the bars one after another over a moment instead of all at once
    if (!mx || real <= shownHp || real - shownHp < BAR_HP * 0.5 && real - shownHp < mx * 0.02) shownHp = real;
    else shownHp = Math.min(real, shownHp + dt * Math.max(BAR_HP * 2.5, (real - shownHp) * 1.6));
    const hp = shownHp;
    // the bars are counted up from the bottom: every bar below the top one is a whole BAR_HP, and only the top bar is short
    // when the boss's health is not a whole number of bars (counting from the top left a bar empty until a whole BAR_HP was gone)
    const cur = hp > 0 ? Math.ceil(hp / BAR_HP) : 0, base = Math.max(0, cur - 1) * BAR_HP;
    const within = hp > 0 ? Math.min(1, (hp - base) / BAR_HP) : 0;
    if (lastHp - hp > BAR_HP * 0.25) ghostHold = now + 0.35;
    lastHp = hp;
    if (hp > ghostHp || !mx || ghostHp - hp > mx * 0.1) ghostHp = hp;   // (healed, a new pull, or joined mid-fight)
    // the ghost belongs to the bar on top: once a bar breaks it starts again at the new bar's top
    if (ghostHp > cur * BAR_HP) ghostHp = cur * BAR_HP;
    else if (now >= ghostHold) ghostHp = Math.max(hp, ghostHp - dt * (BAR_HP * 0.6 + (ghostHp - hp) * 3));
    const ghost = Math.min(1, (ghostHp - base) / BAR_HP);
    const cols = fm ? (raid.form === 'gorged' ? GORGED_COLS : FORM_COLS) : BAR_COLS, col = n => cols[(n - 1) % cols.length];
    const fill = q('.bb-hp .fill'), under = q('.bb-hp .under'), ckey = cur + '|' + (fm ? raid.form : '');   // (the colour is kept per bar AND per form: the form arrives mid-bar)
    if (fill._c !== ckey) { fill._c = ckey; fill.style.setProperty('--lc', col(Math.max(1, cur))); under.style.setProperty('--lc', cur > 1 ? col(cur - 1) : 'transparent'); }
    setX(fill, within);
    setX(q('.bb-hp .trail'), hp > 0 ? ghost : 0);
    q('.bb-hp .vuln').classList.toggle('on', !!b.v);
    // a damage check running: where her health has to be when the cast ends (on the bar once it's the bar on top; the count to reach until then)
    const goal = raid.cast && raid.cast.goal != null && now < raid.cast.start + raid.cast.dur ? raid.cast.goal : null, gEl = q('.bb-hp .goal');
    let goalCur = 0;
    if (goal != null) {
      const gh = mx * goal;
      goalCur = Math.max(1, Math.ceil(gh / BAR_HP));
      if (goalCur === cur) { const v = ((gh - (goalCur - 1) * BAR_HP) / BAR_HP * 100).toFixed(2) + '%'; if (gEl._l !== v) { gEl._l = v; gEl.style.left = v; } }
    }
    gEl.classList.toggle('hidden', goal == null || goalCur !== cur);
    setText(q('.bb-hp span'), mx ? `${fmt(hp)} / ${fmt(mx)}` : '');
    setText(q('.bb-x'), mx ? `×${cur}${goal != null && goalCur < cur ? ` → ×${goalCur}` : ''}` : '');
  }

  // the HP gates (where the acts change) as ticks on the boss's health; a gate with a wall on it is marked, and lit while it holds
  // (hidden while the health is shown in stacked bars: players learn where the acts turn)
  let gateKey = '';
  function gateTicks(raid) {
    const g = Array.isArray(raid.gates) ? raid.gates : [], key = g.map(x => x[0] + ':' + x[1]).join('|') + (raid.wallLabel ? '!' : '');
    if (key === gateKey) return;
    gateKey = key;
    root.querySelector('.bb-hp .gates').innerHTML = g.map(([f, wall]) => `<i class="${wall ? 'wall' : ''}${wall && raid.wallLabel ? ' up' : ''}" style="left:${(f * 100).toFixed(2)}%"></i>`).join('');
  }

  // icons under the boss's health: Hunter's Mark, a damage-up, the Inquisitor's brand and the last
  // minute before the enrage (all from the host), then your own damage over time (from your kit)
  const iconBg = (cls, id) => `url(${abilityIcon(cls, id)})`;
  function bossStatus(raid, now, myId, marks) {
    const el = root.querySelector('.bb-status'), items = [];
    if (raid.state === 'live') {
      for (const [kind, secs, val, who] of raid.bossStatus || []) {
        if (kind === 'vuln') items.push({ k: kind, c: 'debuff', bg: iconBg('ranger', 'mark'), n: secs, tip: `<b>Hunter's Mark</b><em>${secs}s</em>Takes ${val}% more damage from everyone.` });
        else if (kind === 'pause') items.push({ k: kind, c: 'debuff pause', glyph: GLYPH.hourglass, n: secs, tip: `<b>Time Stop</b><em>${secs}s</em>Frozen: its next move waits. What is already on the floor lands on time.` });
        else if (kind === 'wall') items.push({ k: kind, c: 'debuff wall', glyph: GLYPH.shield, n: '', tip: `<b>${esc(who || 'Sealed')}</b><em>Invulnerable</em>Nothing hurts it until the seal breaks.` });
        else if (kind === 'stun') items.push({ k: kind, c: 'debuff', glyph: GLYPH.vuln, n: secs, tip: `<b>Staggered</b><em>${secs}s</em>${raid.def.id === 'skitterra' ? 'Torn out of her chrysalis' : 'Stuck in the wall'}: takes ${val}% more damage.` });
        else if (kind === 'dmg') items.push({ k: kind, c: 'buff', glyph: GLYPH.fury, n: `+${val}%`, tip: `<b>Fury</b><em>+${val}% damage</em>Every blow from the boss lands harder.` });
        else if (kind === 'brand') {
          const mine = who === myId;
          items.push({ k: kind, c: 'debuff' + (mine ? '' : ' theirs'), bg: iconBg('cleric', 'smite'), n: val,
            tip: `<b>Judgment</b><em>${val} charge${val === 1 ? '' : 's'} · ${secs}s${mine ? ' · yours' : ''}</em>Each hit from an ally bursts a charge in holy fire.` });
        }
      }
      const enr = raid.def.enrage && raid.def.enrage[raid.mode];
      if (enr) {
        const left = Math.ceil(enr + 8 - (raid.fightTime || 0));   // the enrage is an 8s cast (fight.js enrage)
        if (left <= 60 && left > 0) items.push({ k: 'enrage', c: 'buff', glyph: GLYPH.enrage, n: left, tip: `<b>${esc(raid.def.enrageName || 'Enrage')}</b><em>${left}s</em>When this runs out, the fight is lost.` });
      }
      const k = marks.kit;
      if (k && k.dots && marks.cls) for (const [id, d] of k.dots) {
        if (d.end <= k.now) continue;
        const secs = Math.ceil(d.end - k.now), info = DOT_INFO[id] || [d.ab ? d.ab.name : id, 'Your damage over time, ticking every 3s.'];
        const stack = id === 'acid' && k.g.acid > 1 ? k.g.acid : 0;
        items.push({ k: 'dot:' + id, c: 'debuff mine', bg: d.ab ? iconBg(marks.cls, abilityIconId(d.ab)) : '', glyph: GLYPH.bleed, n: secs, stack,
          tip: `<b>${info[0]}${stack ? ` ×${stack}` : ''}</b><em>${secs}s · yours</em>${info[1]}` });
      }
    }
    const key = items.map(it => `${it.k}:${it.n}:${it.c}:${it.stack || ''}`).join('|');
    if (key === statusKey) return;
    statusKey = key;
    el.innerHTML = items.map(it => `<b class="bst ${it.c}">${it.bg ? `<u style="background-image:${it.bg}"></u>` : `<u class="g">${it.glyph}</u>`}<i>${it.n}</i>${it.stack ? `<s>${it.stack}</s>` : ''}</b>`).join('');
    [...el.children].forEach((ch, i) => Tip.set(ch, items[i].tip));
  }

  // ---------------------------------------------------------------- town training meter
  function meter(text) {
    const el = $('dps-meter');
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (el.innerHTML !== text) el.innerHTML = text;
  }

  // ---------------------------------------------------------------- results
  // msg: the host's 'fight' message. mine: { kit stats, cls, fightTime }. actions: { retry, town } (host only)
  function showResults(msg, raid, myId, mine, isHost, actions) {
    const el = $('results');
    const clear = msg.s === 'clear';
    if (raid.def.trial) return trialResults(el, raid.def, clear, actions);
    const dur = Math.max(1, msg.time || 1);
    const rows = Object.entries(msg.stats).map(([id, s]) => ({ id: Number(id), ...s }))
      .sort((a, b) => (b.damage / dur + b.healing / dur) - (a.damage / dur + a.healing / dur));
    const table = rows.map(s => `
      <tr class="${s.id === myId ? 'me' : ''}">
        <td><i style="background:${ROLES[s.role].color}"></i>${esc(s.name)}${s.bot ? ' <em>bot</em>' : ''}</td>
        <td>${esc(CLASSES.find(c => c.id === s.cls)?.name || '')}</td>
        <td>${fmt(s.damage / dur)}</td><td>${fmt(s.healing / dur)}</td>
        <td>${fmt(s.taken)}</td><td>${s.avoidable}</td><td>${s.deaths}</td>
      </tr>`).join('');
    const report = mine ? personalReport(mine, msg.stats[myId], dur) : '';
    const honors = honorsBlock(msg, clear, dur, myId);
    // who fell, when, and to what
    const deathName = d => d.k === 'enrage' ? (raid.def.enrageName || 'Enrage') : d.n || HIT_KIND[d.k] || d.cast || (d.k ? d.k[0].toUpperCase() + d.k.slice(1) : 'A hit');
    const deaths = (raid.deaths || []).map(d => ({ d, s: msg.stats[d.id] })).filter(x => x.s);
    const deathLog = deaths.length ? `<div class="res-deaths"><h6>Deaths</h6>${deaths.map(({ d, s }) => `<p><em>${mmss(d.t)}</em><i style="background:${ROLES[s.role].color}"></i><b>${esc(s.name)}</b><span>${esc(deathName(d))}</span></p>`).join('')}</div>` : '';
    // a pull that beat the record
    const lastPull = raid.prog && raid.prog.pulls && raid.prog.pulls[raid.prog.pulls.length - 1];
    const best = !clear && lastPull && lastPull.prev != null && lastPull.pct < lastPull.prev ? `<p class="res-best">New best: ${lastPull.pct.toFixed(1)}%<span>was ${lastPull.prev.toFixed(1)}%</span></p>` : '';
    el.innerHTML = `
      <div class="res-card">
        <h2 class="${clear ? 'win' : 'lose'}">${clear ? 'Cleared' : 'Wiped'}</h2>
        <p class="res-sub">${esc(raid.def.name)} · ${msg.mode === 'hard' ? 'Hard' : 'Normal'} · ${mmss(dur)}${clear ? '' : ` · boss at ${(msg.hp / msg.maxHp * 100).toFixed(1)}%`}</p>
        ${honors}
        <table class="res-table">
          <thead><tr><th>Player</th><th>Class</th><th>DPS</th><th>HPS</th><th>Taken</th><th data-tip="Hits from attacks that could have been avoided">Avoidable</th><th>Deaths</th></tr></thead>
          <tbody>${table}</tbody>
        </table>
        ${best}${pullTimeline(raid, dur, deaths, deathName, msg)}${deathLog}
        ${raid.newPages && raid.newPages.length ? `<p class="res-pages">New in your journal: ${raid.newPages.map(n => `<b>${esc(n)}</b>`).join(', ')}<kbd>${typeof Keybinds !== 'undefined' ? Keybinds.label(Keybinds.keyFor('journal')) : 'J'}</kbd></p>` : ''}
        ${report}
        <div class="res-actions">
          ${isHost ? '<button class="cta" data-a="retry">Try again</button><button class="btn2" data-a="town">Back to town</button>'
                   : '<p class="res-wait">Waiting for the host to choose: try again or head back to town.</p><button class="btn2" data-a="leave">Back to town</button>'}
        </div>
      </div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => actions[b.dataset.a] && actions[b.dataset.a]()));
    el.querySelectorAll('.res-tl [data-t]').forEach(m => Tip.set(m, m.dataset.t));
    el.querySelectorAll('.res-awards [data-th]').forEach(m => Tip.set(m, m.dataset.th));   // (award tips carry markup)
    const tlEl = el.querySelector('.res-tl.pr');
    if (tlEl) tlEl.addEventListener('click', e => prClick(e, tlEl));
  }
  // The MVP (a clear only) and the category awards, from the contribution points (scoring.js). Only what went well: a wipe
  // shows the awards that were earned, or nothing. The full breakdown lives in the Logbook.
  const CROWN = '<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M1.5 10.5 0.8 3.2 4.6 6.4 8 1.5 11.4 6.4 15.2 3.2 14.5 10.5Z" fill="currentColor"/></svg>';
  function honorsBlock(msg, clear, dur, myId) {
    if (typeof Scoring === 'undefined' || !msg.stats) return '';
    const sc = Scoring.score(msg.stats, { time: dur }), mv = clear ? Scoring.mvp(msg.stats, sc) : null;
    const aw = Scoring.awards(msg.stats, sc, { clear, time: dur });
    const who = id => msg.stats[id];
    const mvp = mv != null ? `<p class="res-mvp${mv === myId ? ' me' : ''}" style="--rc:${ROLES[who(mv).role].color}"><i class="crown">${CROWN}</i><small>MVP</small><b>${esc(who(mv).name)}</b><em>${esc(CLASSES.find(c => c.id === who(mv).cls)?.name || '')} · ${sc[mv].total} contribution</em></p>` : '';
    const row = aw.length ? `<div class="res-awards">${aw.map(a => `<span class="${a.who === myId ? 'me' : ''}" data-th="${esc(`<b>${a.name}</b>${a.tip}`)}"><small>${a.name}</small><b>${esc(who(a.who).name)}</b></span>`).join('')}</div>`
      : '';
    return mvp || row ? `<div class="res-honors">${mvp}${row}</div>` : '';
  }
  // the pull at a glance: the boss's health over time, every cast he made (coloured by kind), and every death
  function castKind(raid, name, goal) {
    if (goal) return 'check';
    if (name === (raid.def.enrageName || 'Enrage')) return 'enrage';
    if (typeof BUSTER_CASTS !== 'undefined' && BUSTER_CASTS.test(name)) return 'buster';
    if (typeof RAID_CASTS !== 'undefined' && RAID_CASTS.test(name)) return 'raid';
    return 'mech';
  }
  function pullTimeline(raid, dur, deaths, deathName, msg) {
    const pr = msg && msg.pr && Array.isArray(msg.pr.h) ? msg.pr : null;   // (the host's record, sent with the result: every player has the same one)
    prCtx = pr ? { pr, msg, raid, dur, deathName } : null;
    const tl = pr ? { hp: pr.hp.map((v, i) => [i * 2, v / 1000]).concat([[pr.he[0] / 10, pr.he[1] / 1000]]), casts: pr.c.map(([t, n, g]) => [t / 10, pr.nm[n], g]) } : raid.tl;
    if (!tl || (!tl.hp.length && !tl.casts.length)) return '';
    const W = 600, X = t => (Math.max(0, Math.min(dur, t)) / dur * W).toFixed(1), Y = f => (8 + (1 - f) * 40).toFixed(1);
    const line = tl.hp.length ? `<polyline class="tl-hp" points="0,${Y(1)} ${tl.hp.map(([t, f]) => `${X(t)},${Y(f)}`).join(' ')}"/>` : '';
    const ticks = [];
    for (let m = 60; m < dur; m += 60) ticks.push(`<line class="tl-min" x1="${X(m)}" x2="${X(m)}" y1="4" y2="66"/><text class="tl-lbl" x="${X(m)}" y="78">${m / 60}:00</text>`);
    const casts = tl.casts.map(([t, n, g]) => `<circle class="tl-c k-${castKind(raid, n, g)}" cx="${X(t)}" cy="58" r="3.4" data-t="${esc(`<b>${esc(n)}</b><em>${mmss(t)}</em>`)}"/>`).join('');
    const dead = deaths.map(({ d, s }) => `<g class="tl-d" transform="translate(${X(d.t)},8)" data-t="${esc(`<b>${esc(s.name)} fell</b><em>${mmss(d.t)} · ${esc(deathName(d))}</em>`)}"><rect x="-5" y="-5" width="10" height="10" fill="transparent"/><path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"/></g>`).join('');
    return `<div class="res-tl${pr ? ' pr' : ''}"><h6>The pull${pr ? '<button class="pr-open" type="button">Review the pull</button>' : ''}</h6><svg viewBox="-6 0 612 82" preserveAspectRatio="none">${ticks.join('')}${line}${casts}${dead}</svg>${pr ? pullReview() : ''}</div>`;
  }

  // ---------------------------------------------------------------- the pull review
  // The results card's timeline of the pull, read from the host's record (raid-host.js PullLog): the boss's health, every move
  // he made, and per player the hits they took (the avoidable ones lit), where they fell, were raised, or a Limit Break went
  // off. Hover a mark for its name; click one for who was hit and for how much.
  let prCtx = null;
  const PR_KIND = { self: 'Self-inflicted', raidwide: 'Raid-wide blow', buster: 'Tank buster', stack: 'Stack', spread: 'Spread', tower: 'Tower', aoe: 'Ground blast', bait: 'Bait', cleave: 'Cleave', proximity: 'Blast', hit: 'A hit', doom: 'Doom' };
  const SKULL = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .7C3.2.7 1.3 2.6 1.3 5.2c0 1.5.7 2.6 1.7 3.2v2.1h6V8.4c1-.6 1.7-1.7 1.7-3.2C10.7 2.6 8.8.7 6 .7Z" fill="currentColor"/><circle cx="4.2" cy="5.2" r="1.1" fill="#0a0908"/><circle cx="7.8" cy="5.2" r="1.1" fill="#0a0908"/><path d="M5.2 7.6h1.6v1.5H5.2z" fill="#0a0908"/></svg>';
  // what a hit is called: the move that threw it, else what kind of blow it was (a bare kind borrows the name of a move that contains it)
  function prName(pr, mi, ki, raid) {
    if (mi >= 0) return pr.nm[mi];
    const k = pr.ki[ki] || 'hit';
    if (k === 'enrage') return raid.def.enrageName || 'Enrage';
    if (HIT_KIND[k]) return HIT_KIND[k];
    return pr.nm.find(n => n.toLowerCase().includes(k)) || PR_KIND[k] || (k[0].toUpperCase() + k.slice(1));
  }
  function pullReview() {
    const { pr, msg, raid, dur } = prCtx, nm = (mi, ki) => prName(pr, mi, ki, raid);
    const X = t => (Math.max(0, Math.min(dur, t / 10)) / dur * 100).toFixed(2);   // (t in tenths of a second -> percent along the axis)
    const who = id => msg.stats[id];
    const order = { tank: 0, healer: 1 };
    const people = Object.entries(msg.stats).map(([id, st]) => ({ id: Number(id), st })).sort((a, b) => (order[a.st.role] ?? 2) - (order[b.st.role] ?? 2) || a.id - b.id);
    // the boss's health, with the phase changes marked in time (no HP lines: players learn where the acts turn)
    const hpPts = pr.hp.map((v, i) => [i * 20, v]).concat([pr.he]).map(([t, v]) => `${X(t)},${((1 - v / 1000) * 100).toFixed(1)}`);
    const hpLane = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon class="pr-area" points="0,100 ${hpPts.join(' ')} ${X(pr.he[0])},100"/><polyline class="pr-line" points="${hpPts.join(' ')}"/></svg>${pr.ph.map(([t, n]) => `<span class="pr-ph" style="left:${X(t)}%"><i>${n}</i></span>`).join('')}`;
    const tip = (a, b) => esc(`<b>${esc(a)}</b><em>${esc(b)}</em>`);
    const casts = pr.c.map(([t, mi, g], i) => `<span class="pr-c k-${castKind(raid, pr.nm[mi], g)}" style="left:${X(t)}%" data-k="c${i}" data-t="${tip(pr.nm[mi], mmss(t / 10))}"></span>`).join('');
    const rowFor = ({ id, st }) => {
      const hits = pr.h.map((h, i) => [h, i]).filter(([h]) => h[1] === id).map(([h, i]) => {
        const span = h[7] > 0 ? `;width:max(4px,${(h[7] / 10 / dur * 100).toFixed(2)}%)` : '';
        return `<span class="pr-h${h[5] ? ' av' : h[7] > 0 ? ' run' : ''}" style="left:${X(h[0])}%${span}" data-k="h${i}" data-t="${tip(nm(h[2], h[3]), `${mmss(h[0] / 10)} · ${fmt(h[4])}${h[6] > 1 ? ` over ${h[6]} hits` : ''}${h[5] ? ' · avoidable' : ''}`)}"></span>`;
      }).join('');
      const marks = pr.e.map((e, i) => [e, i]).filter(([e]) => e[1] === 0 ? e[3] === id : e[2] === id).map(([e, i]) => e[1] === 0
        ? `<span class="pr-r" style="left:${X(e[0])}%" data-k="r${i}" data-t="${tip('Raised', `${mmss(e[0] / 10)}${who(e[2]) && e[2] !== id ? ' by ' + who(e[2]).name : ''}`)}"></span>`
        : `<span class="pr-l" style="left:${X(e[0])}%" data-k="l${i}" data-t="${tip('Limit Break', `${mmss(e[0] / 10)} · ${e[3]} bar${e[3] > 1 ? 's' : ''}`)}"></span>`).join('');
      const dead = pr.d.map((d, i) => [d, i]).filter(([d]) => d[1] === id).map(([d, i]) => `<span class="pr-d" style="left:${X(d[0])}%" data-k="d${i}" data-t="${tip(st.name + ' fell', `${mmss(d[0] / 10)}${d[2] < 0 && d[3] < 0 ? '' : ' · ' + nm(d[2], d[3])}`)}">${SKULL}</span>`).join('');
      return `<div class="pr-row"><span class="pr-who" style="--rc:${ROLES[st.role].color}"><i></i>${esc(st.name)}</span><div class="pr-lane">${hits}${marks}${dead}</div></div>`;
    };
    const step = dur > 240 ? 60 : dur > 100 ? 30 : 15;
    const grid = [], axis = [];
    for (let m = step; m < dur; m += step) { grid.push(`<i style="left:${X(m * 10)}%"></i>`); axis.push(`<span style="left:${X(m * 10)}%">${mmss(m)}</span>`); }
    return `<div class="pr-body">
      <div class="pr-plot"><div class="pr-grid">${grid.join('')}</div>
        <div class="pr-row pr-hp"><span class="pr-who">Boss</span><div class="pr-lane">${hpLane}</div></div>
        <div class="pr-row pr-mv"><span class="pr-who">Moves</span><div class="pr-lane">${casts}</div></div>
        ${people.map(rowFor).join('')}
        <div class="pr-row pr-ax"><span class="pr-who"></span><div class="pr-lane">${axis.join('')}</div></div>
      </div>
      <p class="pr-key"><span class="av">Avoidable hit</span><span class="ok">Other hit</span><span class="sk">${SKULL}Fell</span><span class="lb">Limit Break</span><span class="rz">Raised</span></p>
      <div class="pr-detail"><em>Click a mark to see who was hit.</em></div>
    </div>`;
  }
  function prClick(e, tlEl) {
    if (e.target.closest('.pr-open')) { const open = tlEl.classList.toggle('open'); Tip.hide(); if (open) tlEl.scrollIntoView({ block: 'nearest' }); return; }
    const n = e.target.closest('[data-k]');
    if (!n || !prCtx) return;
    const { pr, msg, raid } = prCtx, nm = (mi, ki) => prName(pr, mi, ki, raid), kind = n.dataset.k[0], i = Number(n.dataset.k.slice(1));
    tlEl.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
    n.classList.add('sel');
    const person = id => { const st = msg.stats[id]; return st ? `<b style="color:${ROLES[st.role].color}">${esc(st.name)}</b>` : '<b>Someone</b>'; };
    const line = h => `<p class="${h[5] ? 'av' : ''}">${person(h[1])}<span>${fmt(h[4])}${h[6] > 1 ? ` <small>over ${h[6]} hits</small>` : ''}</span><em>${h[5] ? 'avoidable' : ''}</em></p>`;
    const head = (title, sub) => `<h5>${esc(title)}<small>${esc(sub)}</small></h5>`;
    let html = '';
    if (kind === 'c') {
      const [t, mi] = pr.c[i], nextSame = (pr.c.slice(i + 1).find(c => c[1] === mi) || [0, 0, 0])[0] || t + 250, end = Math.min(nextSame, t + 250);
      const hits = pr.h.filter(h => h[2] === mi && h[0] >= t && h[0] < end);
      html = head(pr.nm[mi], mmss(t / 10)) + (hits.length ? hits.map(line).join('') : '<p class="none">Nobody was hit by it.</p>');
    } else if (kind === 'h') {
      const r = pr.h[i], hits = r[2] >= 0 ? pr.h.filter(h => h[2] === r[2] && Math.abs(h[0] - r[0]) <= 30) : [r];
      html = head(nm(r[2], r[3]), r[7] > 0 ? `${mmss(r[0] / 10)} to ${mmss((r[0] + r[7]) / 10)}` : mmss(r[0] / 10)) + hits.map(line).join('');
    } else if (kind === 'd') {
      const d = pr.d[i], st = msg.stats[d[1]];
      const last = pr.h.filter(h => h[1] === d[1] && h[0] <= d[0] && h[0] + (h[7] || 0) >= d[0] - 100).slice(-4).reverse();
      html = head(`${st ? st.name : 'Someone'} fell`, `${mmss(d[0] / 10)}${d[2] < 0 && d[3] < 0 ? '' : ' · ' + nm(d[2], d[3])}`)
        + last.map(h => `<p class="dl${h[5] ? ' av' : ''}"><span class="when">${mmss(h[0] / 10)}</span><b>${esc(nm(h[2], h[3]))}</b><span>${fmt(h[4])}</span><em>${h[5] ? 'avoidable' : ''}</em></p>`).join('');
    } else if (kind === 'r') {
      const e2 = pr.e[i];
      html = head('Raised', mmss(e2[0] / 10)) + `<p>${person(e2[3])}<span>got back up${msg.stats[e2[2]] && e2[2] !== e2[3] ? ' by ' + esc(msg.stats[e2[2]].name) : ''}</span></p>`;
    } else if (kind === 'l') {
      const e2 = pr.e[i];
      html = head('Limit Break', mmss(e2[0] / 10)) + `<p>${person(e2[2])}<span>spent ${e2[3]} bar${e2[3] > 1 ? 's' : ''}</span></p>`;
    }
    tlEl.querySelector('.pr-detail').innerHTML = html;
  }
  // a specialization trial ends on its memory, not a damage table
  function trialResults(el, def, clear, actions) {
    const T = TRIALS[def.trial], sp = specOf(T.cls, T.spec);
    el.innerHTML = `
      <div class="res-card trial">
        <h2 class="${clear ? 'win' : 'lose'}">${clear ? `${esc(sp.name)} unlocked` : 'The memory fades'}</h2>
        <p class="res-sub">${esc(T.name)}</p>
        <p class="res-lore">${esc(clear ? T.outro : T.lore[1])}</p>
        <div class="res-actions">
          ${clear ? '' : '<button class="cta" data-a="retry">Try again</button>'}
          <button class="${clear ? 'cta' : 'btn2'}" data-a="town">Back to town</button>
        </div>
      </div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => actions[b.dataset.a] && actions[b.dataset.a]()));
  }
  function hideResults() { $('results').classList.add('hidden'); }

  // What went well and what to work on. Post-fight coaching is fine; mid-fight instructions are not.
  function personalReport(mine, st, dur) {
    const k = mine.stats, out = [];
    const gcdUp = Math.min(100, k.gcdTime / Math.max(1, dur) * 100);
    out.push(['GCD uptime', `${gcdUp.toFixed(0)}%`, gcdUp >= 92 ? 'good' : gcdUp >= 80 ? 'ok' : 'bad',
      gcdUp >= 92 ? 'Always casting. Great.' : 'Time with nothing on the GCD is lost damage. Keep pressing through the mechanics, and press the next button early: inputs queue up to half a second ahead.']);
    if (k.posHit + k.posMiss > 0) {
      const r = k.posHit / (k.posHit + k.posMiss) * 100;
      out.push(['Positionals', `${r.toFixed(0)}%`, r >= 85 ? 'good' : r >= 65 ? 'ok' : 'bad', r >= 85 ? 'Sharp footwork.' : 'Watch the ring around the boss: the purple arc is its back, the white arcs its sides.']);
    }
    const over = Object.entries(k.overcap).filter(([, v]) => v >= 5);
    if (over.length) out.push(['Overcapped', over.map(([key, v]) => `${Math.round(v)} ${key}`).join(', '), 'bad', 'Resource gained past the cap is thrown away. Spend just before you\'d hit the top.']);
    const wasted = Object.entries(k.wasted);
    if (wasted.length) out.push(['Wasted procs', wasted.map(([key, v]) => `${v}× ${BUFF_NAMES[key] || key}`).join(', '), 'bad', 'A proc that triggers while you already have it is lost. Spend glowing buttons soon after they light up.']);
    if (k.interrupts) out.push(['Cancelled casts', String(k.interrupts), k.interrupts <= 2 ? 'ok' : 'bad', 'Moving during a cast cancels it, except in its last half second. Plan your casts around movement.']);
    if (k.damage > 0 && k.burstDamage >= 0) {
      const share = k.burstDamage / k.damage * 100;
      out.push(['Damage in raid buffs', `${share.toFixed(0)}%`, share >= 30 ? 'good' : 'ok', 'Damage dealt while a party damage buff or Hunter\'s Mark was up. Line your burst up with your party\'s.']);
    }
    if (k.perfects != null) out.push(['Perfect Blocks', String(k.perfects), k.perfects >= dur / 20 ? 'good' : 'ok', 'Brace in the last moment before a hit lands.']);
    if (k.wardBreaks != null) out.push(['Full Ward breaks', String(k.wardBreaks), 'good', 'A Ward that soaks all it can refunds its Rune.']);
    if (k.overheats) out.push(['Overheats', String(k.overheats), 'bad', 'Vent before Heat reaches 100.']);
    if (k.lags) out.push(['Ran out of Flux', String(k.lags), 'bad', 'Shift back to Slow before Flux hits zero.']);
    if (st) {
      if (st.avoidable) out.push(['Avoidable hits', String(st.avoidable), st.avoidable <= 2 ? 'ok' : 'bad', 'Each one gives Vulnerability, and some moves Damage Down too.']);
      if (st.deaths) out.push(['Deaths', String(st.deaths), 'bad', '']);
    }
    return `<div class="res-report"><h3>Your fight · ${esc(mine.cls.name)}</h3>${out.map(([n, v, cls, tip]) =>
      `<div class="rr ${cls}"><b>${n}</b><span>${esc(v)}</span><small>${esc(tip)}</small></div>`).join('')}</div>`;
  }

  return { waymarks, readyCheck, prog, intro, toggleMeter, cycleMeter, init, show, setRoster, update, ultFlash, meter, showResults, hideResults, townPosture, dock, resetRoster: () => { rosterKey = ''; } };
})();
