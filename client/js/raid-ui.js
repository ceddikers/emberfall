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
    aggro: svg('<path d="M1 6c1.6-2.6 3.2-3.6 5-3.6S9.4 3.4 11 6c-1.6 2.6-3.2 3.6-5 3.6S2.6 8.6 1 6Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.7" fill="currentColor"/>'),
  };
  const ROLE_GLYPH = {
    tank: svg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="currentColor"/>'),
    healer: svg('<path d="M4.5 1.5h3v3h3v3h-3v3h-3v-3h-3v-3h3Z" fill="currentColor"/>'),
    dps: svg('<path d="M10.5 1.5 9.8 4 4.6 9.2 2.8 7.4 8 2.2ZM2.8 7.4 1.5 10.5l3.1-1.3" fill="currentColor"/>'),
  };
  const DEBUFF_INFO = { tenderized: 'Tenderized: the next cleaver blow hits much harder', stuffed: 'Stuffed: you can\'t eat another plate',
    slowed: 'Slowed: stuck in silk or venom', rooted: 'Rooted: wrapped in silk, you can\'t move' };
  // heals over time wear their ability's icon: [class, ability, name]
  const HOT_ICON = { petal: ['cleric', 'petal', 'Dawn Petal'], prayer: ['cleric', 'prayer', 'Prayer Circle'], rejuv: ['grovekeeper', 'rejuv', 'Rejuvenate'], growth: ['grovekeeper', 'growth', 'Wild Growth'] };

  let root, frames = {}, onFrame = null, rosterKey = '', lastT = 0, bossTrail = 1;

  function init(handlers) {
    onFrame = handlers.onFrame;
    root = document.createElement('div');
    root.id = 'raid-ui';
    root.className = 'hidden';
    root.innerHTML = `
      <div id="boss-bar">
        <div class="bb-top"><b class="bb-name"></b><span class="bb-mode"></span><span class="bb-time"></span></div>
        <div class="bb-hp"><div class="trail"></div><div class="fill"></div><div class="ticks"></div><div class="vuln"></div><span></span></div>
        <div class="bb-cast hidden"><div class="fill"></div><span></span></div>
      </div>
      <div id="party-frames"></div>
      <div id="countdown" class="hidden"></div>
      <div id="down-veil" class="hidden"><span>Down</span></div>
      <button id="raid-leave" class="btn2" type="button">Leave raid</button>`;
    document.body.appendChild(root);
    $('raid-leave').addEventListener('click', handlers.onLeave);
    $('party-frames').addEventListener('mousedown', e => {
      const row = e.target.closest('.pf');
      if (row) { e.stopPropagation(); onFrame(Number(row.dataset.id)); }
    });

    const meter = document.createElement('div');
    meter.id = 'dps-meter'; meter.className = 'hidden';
    document.body.appendChild(meter);

    const res = document.createElement('div');
    res.id = 'results'; res.className = 'hidden';
    document.body.appendChild(res);
  }

  function show(v) { root.classList.toggle('hidden', !v); if (!v) { $('countdown').classList.add('hidden'); $('down-veil').classList.add('hidden'); } }

  function setRoster(roster) {
    const key = roster.map(r => r.id).join(',');
    if (key === rosterKey) return;
    rosterKey = key;
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
  // marks: { healer, locked, heal, casting: { id, frac }, aggro } (see frameMarks in main.js)
  function update(raid, now, myId, marks = {}) {
    const dt = Math.min(0.1, Math.max(0, now - lastT)); lastT = now;
    const b = raid.boss;
    root.querySelector('.bb-name').textContent = raid.def.name;
    const mode = root.querySelector('.bb-mode');
    mode.textContent = raid.mode === 'hard' ? 'Hard' : 'Normal';
    mode.classList.toggle('hard', raid.mode === 'hard');
    root.querySelector('.bb-time').textContent = raid.state === 'live' || raid.state === 'clear' || raid.state === 'wipe' ? mmss(raid.fightTime || 0) : '';
    const frac = b.mx ? b.hp / b.mx : 1;
    bossTrail = frac > bossTrail ? frac : Math.max(frac, bossTrail - dt * 0.08 - (bossTrail - frac) * dt * 1.5);
    root.querySelector('.bb-hp .fill').style.width = (frac * 100).toFixed(2) + '%';
    root.querySelector('.bb-hp .trail').style.width = (bossTrail * 100).toFixed(2) + '%';
    root.querySelector('.bb-hp .vuln').classList.toggle('on', !!b.v);
    root.querySelector('.bb-hp span').textContent = `${(frac * 100).toFixed(1)}%`;
    root.querySelector('#boss-bar').classList.toggle('untargetable', !!b.u);
    // the boss's cast bar; it flashes for a moment when the cast goes off
    const cb = root.querySelector('.bb-cast');
    const c = raid.cast;
    if (c && now < c.start + c.dur + 0.25) {
      cb.classList.remove('hidden');
      cb.classList.toggle('done', now >= c.start + c.dur);
      cb.querySelector('.fill').style.width = (Math.min(1, (now - c.start) / c.dur) * 100).toFixed(1) + '%';
      const sp = cb.querySelector('span');
      if (sp.textContent !== c.name) sp.textContent = c.name;
    } else cb.classList.add('hidden');

    // countdown before the pull
    const cd = $('countdown');
    if (raid.state === 'countdown') {
      const left = Math.ceil(raid.countdownEnd - now);
      cd.classList.toggle('hidden', left > 5 || left <= 0);
      cd.textContent = left;
    } else cd.classList.add('hidden');

    for (const [id, p] of raid.party) {
      const f = frames[id];
      if (!f) continue;
      const hpF = p.maxHp ? Math.max(0, Math.min(1, p.hp / p.maxHp)) : 0, shF = p.maxHp ? Math.min(1, p.shield / p.maxHp) : 0;
      f.trailV = p.alive ? trailStep(f.trailV, hpF, p.hitAt, now, dt) : 0;
      f.hp.style.width = (hpF * 100).toFixed(1) + '%';
      f.trail.style.width = (f.trailV * 100).toFixed(1) + '%';
      f.sh.style.width = (shF * 100).toFixed(1) + '%';
      f.sh.style.left = Math.min(100 - shF * 100, hpF * 100).toFixed(1) + '%';
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
      const casting = marks.casting && marks.casting.id === id;
      f.cast.style.width = casting ? (marks.casting.frac * 100).toFixed(1) + '%' : '0%';
      f.row.classList.toggle('casting', !!casting);
      const chips = [];
      for (const [hid, secs, from] of p.hots || []) {
        const h = HOT_ICON[hid];
        if (h) chips.push(`<b class="chip hot${from === myId ? '' : ' theirs'}" data-tip="${h[2]}: healing over time"><u style="background-image:url(icons/${h[0]}/${h[1]}.png)"></u>${secs}</b>`);
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
    $('down-veil').classList.toggle('hidden', !me || me.alive || raid.state !== 'live');
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
    el.innerHTML = `
      <div class="res-card">
        <h2 class="${clear ? 'win' : 'lose'}">${clear ? 'Cleared!' : 'Wiped'}</h2>
        <p class="res-sub">${esc(raid.def.name)} · ${msg.mode === 'hard' ? 'Hard' : 'Normal'} · ${mmss(dur)}${clear ? '' : ` · boss at ${(msg.hp / msg.maxHp * 100).toFixed(1)}%`}</p>
        <table class="res-table">
          <thead><tr><th>Player</th><th>Class</th><th>DPS</th><th>HPS</th><th>Taken</th><th data-tip="Hits from attacks that could have been avoided">Avoidable</th><th>Deaths</th></tr></thead>
          <tbody>${table}</tbody>
        </table>
        ${report}
        <div class="res-actions">
          ${isHost ? '<button class="cta" data-a="retry">Try again</button><button class="btn2" data-a="town">Back to town</button>'
                   : '<p class="res-wait">Waiting for the host to choose: try again or head back to town.</p><button class="btn2" data-a="leave">Leave to town</button>'}
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

  return { init, show, setRoster, update, meter, showResults, hideResults, resetRoster: () => { rosterKey = ''; } };
})();
