// DOM parts of the raid: boss bar + cast bar, party frames, countdown, results screen, and the
// training-dummy meter in town. main.js feeds it data every frame.

const RaidUI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // small line icons for party-frame chips (12x12, drawn in the chip's text color)
  const svg = d => `<svg viewBox="0 0 12 12" aria-hidden="true">${d}</svg>`;
  const GLYPH = {
    shield: svg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="none" stroke="currentColor" stroke-width="1.4"/>'),
    down: svg('<path d="M6 1.5v8M2.5 6 6 9.5 9.5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    vuln: svg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.6 2.5 5 5.6l2 .8-1.4 3" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
    weak: svg('<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.6"/>'),
    tenderized: svg('<path d="M1.5 3.5h6.5v4.5H1.5Z M8 4.5h2.5v2.5H8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="3.6" cy="5.7" r=".9" fill="currentColor"/>'),
    stuffed: svg('<ellipse cx="6" cy="7.5" rx="4.6" ry="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 6.6a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
    slowed: svg('<path d="M6 1v10M1 6h10M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width=".9"/><circle cx="6" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width=".9"/><circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width=".9"/>'),
    rooted: svg('<path d="M2 3c2.5 1.2 5.5-1.2 8 0M2 6c2.5 1.2 5.5-1.2 8 0M2 9c2.5 1.2 5.5-1.2 8 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'),
    conductive: svg('<path d="M7 1 3 6.5h3L5 11l4-5.5H6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
    doom: svg('<path d="M6 1.5c-2.3 0-4 1.6-4 3.8 0 1.3.6 2.2 1.5 2.8V10h5V8.1c.9-.6 1.5-1.5 1.5-2.8 0-2.2-1.7-3.8-4-3.8Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="4.4" cy="5.5" r="1" fill="currentColor"/><circle cx="7.6" cy="5.5" r="1" fill="currentColor"/>'),
    dread: svg('<path d="M1 6c1.6-2.6 3.2-3.6 5-3.6S9.4 3.4 11 6c-1.6 2.6-3.2 3.6-5 3.6S2.6 8.6 1 6Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3 9 9 3" stroke="currentColor" stroke-width="1.2"/>'),
    bleed: svg('<path d="M6 1.5C4.5 4 3 5.6 3 7.4a3 3 0 0 0 6 0C9 5.6 7.5 4 6 1.5Z" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
    static: svg('<path d="M7 1 3 6.5h3L5 11l4-5.5H6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M1.5 3.5h1.5M9 8.5h1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'),
    aggro: svg('<path d="M1 6c1.6-2.6 3.2-3.6 5-3.6S9.4 3.4 11 6c-1.6 2.6-3.2 3.6-5 3.6S2.6 8.6 1 6Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.7" fill="currentColor"/>'),
    // on the boss: hitting harder, and the enrage
    fury: svg('<path d="M6 1.2 7.4 4.6 11 6 7.4 7.4 6 10.8 4.6 7.4 1 6 4.6 4.6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 4.4v3.2" stroke="currentColor" stroke-width="1.2"/>'),
    enrage: svg('<path d="M6 1c.4 2-1.8 3-1.8 5a1.8 1.8 0 0 0 3.6 0c0-.8-.4-1.4-.4-1.4S9.5 5.5 9.5 7.8A3.5 3.5 0 0 1 2.5 7.8C2.5 4.4 6 3.6 6 1Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
  };
  // your own damage over time on the boss, by the kit's DoT id (the icon is the ability that put it there)
  const DOT_INFO = { poison: ['Poison', 'Venom from your blade, ticking every 3s.'], thorn: ['Thorns', 'Your thorns, biting every 3s.'],
    acid: ['Acid', 'Your acid burn, stronger with every stack.'], brand: ['Burning Rune', 'Your rune, burning every 3s.'],
    crater: ['Scorched Earth', 'The ground you set alight, burning every 3s.'], pyroburn: ['Pyroburn', 'Your fire, burning every 3s.'] };
  const ROLE_GLYPH = {
    tank: svg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="currentColor"/>'),
    healer: svg('<path d="M4.5 1.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" fill="currentColor"/>'),
    dps: svg('<path d="M10.5 1.5 9.8 4 4.6 9.2 2.8 7.4 8 2.2ZM2.8 7.4 1.5 10.5l3.1-1.3" fill="currentColor"/>'),
  };
  const DEBUFF_INFO = { tenderized: 'Tenderized: the next cleaver blow hits much harder', stuffed: 'Stuffed: you can\'t eat another plate',
    slowed: 'Slowed: stuck in silk or venom', rooted: 'Rooted: you can\'t move',
    conductive: 'Conductive: the next strike you catch hurts far more', doom: 'Royal Doom: when this runs out, so do you',
    dread: 'Dread: you met his eyes. Meeting them again hurts far more', bleed: 'Bleeding: losing health over time',
    static: 'Static: the storm is building on you, a jolt every 1.5s' };
  // heals over time wear their ability's icon: [class, ability, name]
  const HOT_ICON = { petal: ['cleric', 'petal', 'Dawn Petal'], prayer: ['cleric', 'prayer', 'Prayer Circle'], rejuv: ['grovekeeper', 'rejuv', 'Rejuvenate'], growth: ['grovekeeper', 'growth', 'Wild Growth'] };

  let docked = 'left', onDock = null, hudObserved = false, lastState = '';
  let root, frames = {}, onFrame = null, rosterKey = '', lastT = 0, bossTrail = 1, roster = [], threatKey = '', nextKey = '', statusKey = '';

  function init(handlers) {
    onFrame = handlers.onFrame;
    root = document.createElement('div');
    root.id = 'raid-ui';
    root.className = 'hidden';
    root.innerHTML = `
      <div id="boss-bar">
        <div class="bb-top"><b class="bb-name"></b><span class="bb-mode"></span><span class="bb-time"></span></div>
        <div class="bb-hp"><div class="trail"></div><div class="fill"></div><div class="ticks"></div><div class="vuln"></div><div class="goal hidden"></div><span></span></div>
        <div class="bb-status"></div>
        <div class="bb-next hidden"></div>
      </div>
      <div id="boss-cast" class="hidden"><i class="bc-icon"></i><div class="bc-body"><small>Next</small><b class="bc-name"></b><div class="bc-bar"><div class="fill"></div></div></div><em class="bc-left"></em></div>
      <div id="raid-left"><div id="pf-wrap"><button id="pf-dock" class="pf-dock" type="button"></button><div id="party-frames"></div><div id="lb-gauge" class="hidden"><small>Limit</small><div class="lb-bars"><i><b></b></i><i><b></b></i><i><b></b></i></div><kbd>G</kbd></div></div><div id="threat-meter" class="hidden"></div><div id="prog" class="hidden"></div></div>
      <div id="party-strip"></div>
      <div id="countdown" class="hidden"></div>
      <div id="boss-intro" class="hidden"><small></small><b></b><i></i><q></q></div>
      <div id="trial-lore" class="hidden"><b></b><p></p><p></p></div>
      <div id="down-veil" class="hidden"><span>Down</span><div class="recap"></div></div>
      <div id="waymarks" class="hidden">${['A', 'B', 'C', 'D', '1', '2', '3', '4'].map(k => `<button type="button" class="wm wm-${/\d/.test(k) ? 'sq' : 'ci'}" data-k="${k}">${k}</button>`).join('')}<button type="button" class="wm wm-clear" data-k="*">${svg('<path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')}</button><button type="button" class="wm wm-pull" data-k="#">${svg('<circle cx="6" cy="6.6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 4.2v2.6l1.6 1M4.6 1.2h2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>')}</button><button type="button" class="wm wm-callouts" data-k="@">${svg('<path d="M2 2.5h8v5H5.5L3 9.5v-2H2Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>')}</button></div>
      <button id="raid-leave" class="btn2" type="button">Leave raid</button>`;
    document.body.appendChild(root);
    // in a live fight, leaving takes a second click (so a stray click doesn't walk you out of a pull)
    let leaveArmed = 0;
    $('raid-leave').addEventListener('click', () => {
      const btn = $('raid-leave');
      if (lastState === 'live' && performance.now() - leaveArmed > 3000) {
        leaveArmed = performance.now(); btn.textContent = 'Leave? Click again'; btn.classList.add('armed');
        setTimeout(() => { if (performance.now() - leaveArmed >= 2900) { btn.textContent = 'Leave raid'; btn.classList.remove('armed'); } }, 3000);
        return;
      }
      leaveArmed = 0; btn.textContent = 'Leave raid'; btn.classList.remove('armed');
      handlers.onLeave();
    });
    // waymarks: click one, then the floor; right-click one to pick it up; the cross picks them all up
    const wm = $('waymarks');
    wm.addEventListener('mousedown', e => e.stopPropagation());
    wm.addEventListener('click', e => { const b = e.target.closest('.wm'); if (!b) return; if (b.dataset.k === '*') handlers.onWaymark({ all: 'clear' }); else if (b.dataset.k === '@') handlers.onCallouts(); else if (b.dataset.k === '#') handlers.onPullIn(); else handlers.onPlaceMark(b.dataset.k); });
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

  // 'left' (under the corner, with the threat meter) or 'strip' (a row above the hotbar, close to where you look)
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

  function show(v) { if (v) trackHud(); root.classList.toggle('hidden', !v); document.body.classList.toggle('in-raid', !!v); if (!v) { $('countdown').classList.add('hidden'); $('down-veil').classList.add('hidden'); $('trial-lore').classList.add('hidden'); } }

  function setRoster(list0) {
    const key = list0.map(r => r.id).join(',');
    if (key === rosterKey) return;
    rosterKey = key; roster = list0; threatKey = '';   // (kept for the threat meter's names and roles)
    const order = { tank: 0, healer: 1, dps: 2 };
    const list = [...roster].sort((a, b) => order[a.role] - order[b.role] || a.id - b.id);
    $('party-frames').innerHTML = list.map((r, i) => `
      <div class="pf" data-id="${r.id}" style="--rc:${ROLES[r.role].color}">
        <kbd class="pf-key">${i + 1}</kbd>
        <div class="pf-main">
          <div class="pf-name"><i class="pf-role">${ROLE_GLYPH[r.role] || ''}</i><span>${esc(r.name)}</span><b class="pf-aggro" data-tip="The boss is attacking them">${GLYPH.aggro}</b><small>${esc(CLASSES.find(c => c.id === r.cls)?.name || '')}${r.bot ? ' · bot' : ''}</small></div>
          <div class="pf-hp"><div class="trail"></div><div class="hp"></div><div class="sh"></div><span></span></div>
          <div class="pf-cast"><i></i></div>
          <div class="pf-st"></div>
        </div>
      </div>`).join('');
    frames = {};
    for (const row of $('party-frames').children) frames[row.dataset.id] = { row, hp: row.querySelector('.hp'), sh: row.querySelector('.sh'), trail: row.querySelector('.trail'),
      txt: row.querySelector('.pf-hp span'), cast: row.querySelector('.pf-cast i'), st: row.querySelector('.pf-st'), key: '', trailV: 1, txtKey: '' };
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
  function update(raid, now, myId, marks = {}) {
    const dt = Math.min(0.1, Math.max(0, now - lastT)); lastT = now;
    lastState = raid.state;
    liveMeter(raid, myId);
    const b = raid.boss;
    setText(q('.bb-name'), raid.def.name);
    const mode = q('.bb-mode');
    setText(mode, raid.mode === 'hard' ? 'Hard' : 'Normal');
    mode.classList.toggle('hard', raid.mode === 'hard');
    setText(q('.bb-time'), raid.state === 'live' || raid.state === 'clear' || raid.state === 'wipe' ? mmss(raid.fightTime || 0) : raid.state === 'prepull' ? 'Unengaged' : '');
    const frac = b.mx ? b.hp / b.mx : 1;
    bossTrail = frac > bossTrail ? frac : Math.max(frac, bossTrail - dt * 0.08 - (bossTrail - frac) * dt * 1.5);
    setW(q('.bb-hp .fill'), (frac * 100).toFixed(2) + '%');
    setW(q('.bb-hp .trail'), (bossTrail * 100).toFixed(2) + '%');
    q('.bb-hp .vuln').classList.toggle('on', !!b.v);
    // a damage check running: where her health has to be when the cast ends
    const goal = raid.cast && raid.cast.goal != null && now < raid.cast.start + raid.cast.dur ? raid.cast.goal : null, gEl = q('.bb-hp .goal');
    gEl.classList.toggle('hidden', goal == null);
    if (goal != null) { const v = (goal * 100).toFixed(2) + '%'; if (gEl._l !== v) { gEl._l = v; gEl.style.left = v; } }
    setText(q('.bb-hp span'), `${(frac * 100).toFixed(1)}%`);
    q('#boss-bar').classList.toggle('untargetable', !!b.u);
    castFrame(raid, now);
    upcoming(raid, now);
    bossStatus(raid, now, myId, marks);
    threatMeter(raid, myId);
    limitGauge(raid, myId);

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
      f.trailV = p.alive ? trailStep(f.trailV, hpF, p.hitAt, now, dt) : 0;
      setW(f.hp, (hpF * 100).toFixed(1) + '%');
      setW(f.trail, (f.trailV * 100).toFixed(1) + '%');
      setW(f.sh, (shF * 100).toFixed(1) + '%');
      const shL = Math.min(100 - shF * 100, hpF * 100).toFixed(1) + '%';
      if (f.sh._l !== shL) { f.sh._l = shL; f.sh.style.left = shL; }
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
      f.row.classList.toggle('mid', p.alive && hpF < 0.6 && hpF >= 0.35);
      f.row.classList.toggle('low', p.alive && hpF < 0.35);
      f.row.classList.toggle('hit', p.alive && now - (p.hitAt || -9) < 0.2);
      f.row.classList.toggle('cleanse', !!marks.cleanse && p.alive && !!(p.dd || p.vuln || (p.debuffs || []).some(([k]) => k === 'slowed' || k === 'rooted')));
      const casting = marks.casting && marks.casting.id === id;
      setW(f.cast, casting ? (marks.casting.frac * 100).toFixed(1) + '%' : '0%');
      f.row.classList.toggle('casting', !!casting);
      const chips = [];
      for (const [hid, secs, from] of p.hots || []) {
        const h = HOT_ICON[hid];
        if (h) chips.push(`<b class="chip hot${from === myId ? '' : ' theirs'}" data-tip="${h[2]}: healing over time"><u style="background-image:url(${abilityIcon(h[0], h[1])})"></u>${secs}</b>`);
      }
      if (p.mit) chips.push(`<b class="chip mit" data-tip="Taking ${p.mit}% less damage">${GLYPH.shield}${p.mit}%</b>`);
      if (p.dd) chips.push(`<b class="chip bad" data-tip="Damage Down: dealing 10% less damage">${GLYPH.down}${p.dd}</b>`);
      if (p.vuln) chips.push(`<b class="chip bad" data-tip="Vulnerability: taking ${p.vuln}% more damage">${GLYPH.vuln}${p.vuln}%</b>`);
      if (p.weak) chips.push(`<b class="chip bad" data-tip="Weakness: recently revived, dealing less damage">${GLYPH.weak}</b>`);
      for (const [k, s] of p.debuffs || []) chips.push(`<b class="chip bad" data-tip="${DEBUFF_INFO[k] || k}">${GLYPH[k] || ''}${s}</b>`);
      const key = chips.join('');
      if (key !== f.key) { f.key = key; f.st.innerHTML = key; }
    }
    const me = raid.party.get(myId);
    const down = !!me && !me.alive && raid.state === 'live';
    $('down-veil').classList.toggle('hidden', !down);
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
  };
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
    introTimer = setTimeout(() => { el.classList.add('out'); introTimer = setTimeout(() => el.classList.add('hidden'), 900); }, line ? 4200 : 2600);
  }

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

  // ---------------------------------------------------------------- Limit Break
  // the party's gauge under the frames: three bars, each lit as it fills (the effect is your role's: see limitTip)
  let lbKey = '', lbRole = 'dps', lbBars = 0;
  function limitGauge(raid, myId) {
    const el = $('lb-gauge'), show = !raid.def.trial && (raid.state === 'live' || raid.state === 'prepull');
    const me = roster.find(r => r.id === myId); if (me) lbRole = me.role;
    const v = Math.max(0, Math.min(300, raid.lb || 0)), key = show ? String(Math.round(v)) : '-';
    if (key === lbKey) return;
    lbKey = key;
    el.classList.toggle('hidden', !show);
    if (!show) return;
    lbBars = Math.floor(v / 100);
    el.classList.toggle('ready', lbBars >= 1);
    [...el.querySelectorAll('.lb-bars i')].forEach((seg, i) => {
      const f = Math.max(0, Math.min(1, (v - i * 100) / 100));
      seg.classList.toggle('full', f >= 1);
      seg.firstChild.style.width = (f * 100).toFixed(1) + '%';
    });
  }
  function limitTip() {
    const L = FIGHT.LB, pct = a => a.slice(1).map(x => Math.round(x * 1000) / 10).join(' / ') + '%';
    const what = lbRole === 'tank' ? `<b>Stand Fast</b>The party takes ${pct(L.TANK)} less damage for ${L.TANK_DUR}s.`
      : lbRole === 'healer' ? `<b>Rekindle</b>Heals the party for ${pct(L.HEAL)} of their health. Three bars also raise the fallen.`
      : `<b>Emberfall</b>One blow worth ${pct(L.DPS)} of the boss's health.`;
    return `<b>Limit Break</b><em>${lbBars} of 3 bars · G</em>Every whole bar is spent at once, by whoever presses first. Filled by mechanics met cleanly and checks passed.<br><br>${what}`;
  }

  // ---------------------------------------------------------------- the live meter (M)
  // Everyone's damage (or healing) per second so far, from the host once a second. Click the header to switch.
  let meterOn = false, meterHeal = false, meterKey = '';
  try { meterOn = localStorage.getItem('emberfall.meter') === '1'; } catch (e) { /* off */ }
  function toggleMeter() { meterOn = !meterOn; meterKey = ''; try { localStorage.setItem('emberfall.meter', meterOn ? '1' : '0'); } catch (e) { /* not remembered */ } }
  function liveMeter(raid, myId) {
    let el = $('live-meter');
    if (!el) {
      el = document.createElement('div'); el.id = 'live-meter'; el.className = 'hidden'; root.appendChild(el);
      el.addEventListener('mousedown', e => { e.stopPropagation(); if (e.target.closest('h6')) { meterHeal = !meterHeal; meterKey = ''; } });
    }
    const m = raid.meter, show = meterOn && !!m && (raid.state === 'live' || raid.state === 'clear' || raid.state === 'wipe');
    el.classList.toggle('hidden', !show);
    if (!show) return;
    const ft = Math.max(1, m.ft), rows = m.d.map(([id, d, h]) => ({ id, v: (meterHeal ? h : d) / ft, r: roster.find(x => x.id === id) })).filter(x => x.r && (x.v > 0 || !meterHeal)).sort((a, b) => b.v - a.v);
    const top = rows.length ? Math.max(1, rows[0].v) : 1;
    const key = (meterHeal ? 'h' : 'd') + rows.map(x => x.id + ':' + Math.round(x.v)).join('|');
    if (key === meterKey) return;
    meterKey = key;
    el.innerHTML = `<h6>${meterHeal ? 'Healing' : 'Damage'}<span>per second</span></h6>` + rows.map(x => `
      <div class="lm-row${x.id === myId ? ' me' : ''}" style="--rc:${ROLES[x.r.role].color}"><i style="width:${(x.v / top * 100).toFixed(1)}%"></i><span>${esc(x.r.name)}</span><b>${fmt(x.v)}</b></div>`).join('');
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
  function castFrame(raid, now) {
    const el = $('boss-cast'), c = raid.cast, n = raid.bnext;
    let mode = '', name = '', frac = 0, left = 0;
    if (c && now < c.start + c.dur + 0.25) { mode = now >= c.start + c.dur ? 'done' : 'cast'; name = c.name; frac = Math.min(1, (now - c.start) / c.dur); left = Math.max(0, c.start + c.dur - now); }
    else if (raid.state === 'live' && n && n.l.length && now - n.at <= 3) {
      const [nm, sec] = n.l[0]; left = Math.max(0, sec - (now - n.at));
      if (left <= 15) { mode = 'next'; name = nm; }
    }
    el.classList.toggle('hidden', !mode);
    if (!mode) { castKey = ''; return; }
    const key = mode + '|' + name;
    if (key !== castKey) {
      castKey = key;
      el.className = mode;
      el.querySelector('.bc-icon').style.backgroundImage = typeof BossIcons !== 'undefined' ? BossIcons.css(raid.def.id, name) : '';
      setText(el.querySelector('.bc-name'), name);
    }
    setW(el.querySelector('.bc-bar .fill'), (frac * 100).toFixed(1) + '%');
    setText(el.querySelector('.bc-left'), mode === 'cast' ? left.toFixed(1) : mode === 'next' ? Math.ceil(left) + 's' : '');
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
    const rows = fresh ? n.l.map(([name, s]) => [name, s - (now - n.at)]).filter(([, s]) => s > -0.5).slice(0, 3) : [];
    const key = rows.map(([name, s]) => name + ':' + Math.max(0, Math.ceil(s))).join('|');
    if (key === nextKey) return;
    nextKey = key;
    el.classList.toggle('hidden', !rows.length);
    const icon = name => (typeof BossIcons !== 'undefined' ? `<u style="background-image:${BossIcons.css(raid.def.id, name)}"></u>` : '');
    el.innerHTML = rows.map(([name, s]) => `<span>${icon(name)}<b>${esc(name)}</b><i>${Math.max(0, Math.ceil(s))}</i></span>`).join('');
  }

  // icons under the boss's health: Hunter's Mark, a damage-up, a taunt's fixation, the Inquisitor's brand and the last
  // minute before the enrage (all from the host), then your own damage over time (from your kit)
  const iconBg = (cls, id) => `url(${abilityIcon(cls, id)})`;
  function bossStatus(raid, now, myId, marks) {
    const el = root.querySelector('.bb-status'), items = [];
    if (raid.state === 'live') {
      for (const [kind, secs, val, who] of raid.bossStatus || []) {
        if (kind === 'vuln') items.push({ k: kind, c: 'debuff', bg: iconBg('ranger', 'mark'), n: secs, tip: `<b>Hunter's Mark</b><em>${secs}s</em>Takes ${val}% more damage from everyone.` });
        else if (kind === 'stun') items.push({ k: kind, c: 'debuff', glyph: GLYPH.vuln, n: secs, tip: `<b>Staggered</b><em>${secs}s</em>${raid.def.id === 'skitterra' ? 'Torn out of her chrysalis' : 'Stuck in the wall'}: takes ${val}% more damage.` });
        else if (kind === 'dmg') items.push({ k: kind, c: 'buff', glyph: GLYPH.fury, n: `+${val}%`, tip: `<b>Fury</b><em>+${val}% damage</em>Every blow from the boss lands harder.` });
        else if (kind === 'brand') {
          const mine = who === myId;
          items.push({ k: kind, c: 'debuff' + (mine ? '' : ' theirs'), bg: iconBg('cleric', 'smite'), n: val,
            tip: `<b>Judgment</b><em>${val} charge${val === 1 ? '' : 's'} · ${secs}s${mine ? ' · yours' : ''}</em>Each hit from an ally bursts a charge in holy fire.` });
        } else if (kind === 'fix') {
          const r = roster.find(x => x.id === who), t = r && typeof TAUNT !== 'undefined' && TAUNT[r.cls];
          items.push({ k: kind, c: 'buff', bg: t ? tauntIconBg(r.cls) : '', glyph: GLYPH.aggro, n: secs, tip: `<b>${t ? t.name : 'Taunted'}</b><em>${secs}s</em>Fixed on ${esc(r ? r.name : 'a tank')}.` });
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

  // threat on the boss as a share of the top (the tank at 100%); your row is lit, and a non-tank at 90% or more of
  // the tank's threat turns amber
  function threatMeter(raid, myId) {
    const el = $('threat-meter'), rows = [];
    for (const r of roster) { const p = raid.party.get(r.id); if (p && p.alive && !p.left) rows.push({ r, th: p.threat || 0 }); }
    const top = rows.reduce((m, x) => Math.max(m, x.th), 0);
    const tankTh = rows.reduce((m, x) => (x.r.role === 'tank' ? Math.max(m, x.th) : m), 0);
    const show = raid.state === 'live' && rows.length >= 2 && top > 0;
    rows.sort((a, b) => b.th - a.th || a.r.id - b.r.id);
    const view = show ? rows.map(x => ({ x, pct: Math.round(x.th / top * 100), warn: x.r.role !== 'tank' && tankTh > 0 && x.th >= tankTh * 0.9 })) : [];
    const key = view.map(v => `${v.x.r.id}:${v.pct}:${v.warn ? 1 : 0}`).join('|');
    if (key === threatKey) return;
    threatKey = key;
    el.classList.toggle('hidden', !show);
    el.innerHTML = show ? `<h6>Threat</h6>` + view.map(({ x, pct, warn }) => `
      <div class="tm-row${x.r.id === myId ? ' me' : ''}${warn ? ' warn' : ''}" style="--rc:${ROLES[x.r.role].color}">
        <i class="pf-role">${ROLE_GLYPH[x.r.role] || ''}</i><span>${esc(x.r.name)}</span><b>${pct}%</b>
        <div class="tm-bar"><i style="width:${pct}%"></i></div>
      </div>`).join('') : '';
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
    // who fell, when, and to what
    const deathName = d => d.k === 'enrage' ? (raid.def.enrageName || 'Enrage') : d.n || HIT_KIND[d.k] || d.cast || (d.k ? d.k[0].toUpperCase() + d.k.slice(1) : 'A hit');
    const deaths = (raid.deaths || []).map(d => ({ d, s: msg.stats[d.id] })).filter(x => x.s);
    const deathLog = deaths.length ? `<div class="res-deaths"><h6>Deaths</h6>${deaths.map(({ d, s }) => `<p><em>${mmss(d.t)}</em><i style="background:${ROLES[s.role].color}"></i><b>${esc(s.name)}</b><span>${esc(deathName(d))}</span></p>`).join('')}</div>` : '';
    // a pull that beat the record
    const lastPull = raid.prog && raid.prog.pulls && raid.prog.pulls[raid.prog.pulls.length - 1];
    const best = !clear && lastPull && lastPull.prev != null && lastPull.pct < lastPull.prev ? `<p class="res-best">New best: ${lastPull.pct.toFixed(1)}%<span>was ${lastPull.prev.toFixed(1)}%</span></p>` : '';
    el.innerHTML = `
      <div class="res-card">
        <h2 class="${clear ? 'win' : 'lose'}">${clear ? 'Cleared!' : 'Wiped'}</h2>
        <p class="res-sub">${esc(raid.def.name)} · ${msg.mode === 'hard' ? 'Hard' : 'Normal'} · ${mmss(dur)}${clear ? '' : ` · boss at ${(msg.hp / msg.maxHp * 100).toFixed(1)}%`}</p>
        <table class="res-table">
          <thead><tr><th>Player</th><th>Class</th><th>DPS</th><th>HPS</th><th>Taken</th><th data-tip="Hits from attacks that could have been avoided">Avoidable</th><th>Deaths</th></tr></thead>
          <tbody>${table}</tbody>
        </table>
        ${best}${deathLog}
        ${report}
        <div class="res-actions">
          ${isHost ? '<button class="cta" data-a="retry">Try again</button><button class="btn2" data-a="town">Back to town</button>'
                   : '<p class="res-wait">Waiting for the host to choose: try again or head back to town.</p><button class="btn2" data-a="leave">Leave to town</button>'}
        </div>
      </div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => actions[b.dataset.a] && actions[b.dataset.a]()));
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
      out.push(['Positionals', `${r.toFixed(0)}%`, r >= 85 ? 'good' : r >= 65 ? 'ok' : 'bad', r >= 85 ? 'Sharp footwork.' : 'Watch the ring around the boss: the purple arc is his back, the white arcs his sides.']);
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
      if (st.avoidable) out.push(['Avoidable hits', String(st.avoidable), st.avoidable <= 2 ? 'ok' : 'bad', 'Each one gives Damage Down and Vulnerability.']);
      if (st.deaths) out.push(['Deaths', String(st.deaths), 'bad', '']);
    }
    return `<div class="res-report"><h3>Your fight · ${esc(mine.cls.name)}</h3>${out.map(([n, v, cls, tip]) =>
      `<div class="rr ${cls}"><b>${n}</b><span>${esc(v)}</span><small>${esc(tip)}</small></div>`).join('')}</div>`;
  }

  return { waymarks, prog, intro, toggleMeter, init, show, setRoster, update, meter, showResults, hideResults, dock, resetRoster: () => { rosterKey = ''; } };
})();
