// The talent screen: your hero's five rows of three talents (combat/talents.js). Opened at the Talent Trainer in
// town or with N. Rows unlock in order with gold from the account-wide wallet; you can read the next row you could
// unlock, and the rows past it stay sealed (dark shapes, no text) until you get there. Picks are free and can only be
// changed in town. Saved per hero (save.js); the kit reads them through world.talents (main.js).
// Under them, once the hero has a spec, the two spec rows (VI, VII: SPEC_TALENTS, two talents each) in the spec's
// accent. They are bought once per hero; each spec keeps its own picks there, so the cards follow the active spec.

const TalentPanel = (() => {
  let deps = null;   // from main: { cls() -> class or null, spec() -> spec id or null, locked() -> bool, onChange(), onGold() }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const coin = '<i class="coin" aria-hidden="true"></i>';

  const el = document.createElement('div');
  el.id = 'talents'; el.className = 'hidden';
  el.innerHTML = `
    <div class="tal-page">
      <button class="sel-close tal-close" aria-label="Close" data-tip="Close (Esc)">×</button>
      <header class="sel-head"><h2>Talents</h2><div class="sel-rule"></div></header>
      <div class="tal-top"><div class="tal-hero"></div><span class="tal-gold" data-tip="Gold"></span></div>
      <div class="tal-rows"></div>
      <div class="tal-foot"></div>
    </div>`;
  document.body.appendChild(el);
  const $q = s => el.querySelector(s);
  const isOpen = () => !el.classList.contains('hidden');
  function open() { if (!deps || !deps.cls()) return false; el.classList.remove('hidden'); render(); return true; }
  function close() { el.classList.add('hidden'); Tip.hide(); }
  $q('.tal-close').addEventListener('click', close);
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });

  // what each row is about, in this hero's words (the gauge row uses the gauge's name: Resolve, Rage, Heat...)
  const rowName = (r, kit, sp) => (r >= 5 ? (sp ? sp.name : '') : ['Rhythm', 'Guard', (kit.gauge && kit.gauge.label) || 'Gauge', 'Cooldowns', 'Mastery'][r]);
  // the move a talent changes, as this hero's spec has it (a replacement move shows under its own name)
  const abFor = (kit, id) => kit.abilities.find(a => (a.replaces || a.id) === id) || null;

  // the talent's numbers as the hero would see them ({d:150} -> the hit it really does, as in ability tooltips)
  const numText = (text, cls, spec) => (typeof Num !== 'undefined' ? Num.fill(text, { cls, spec }) : text);
  function cardTip(cls, kit, spec, t, r) {
    const ab = abFor(kit, t.ab);
    const where = ab ? ab.name : '';
    // a talent that puts a new move on a button: show the move itself (kits.js TALENT_ABILITIES); its own description
    // follows unless the talent's text already tells the whole move
    const mv = t.grants && typeof talentMoveFor === 'function' ? talentMoveFor(cls.id, spec, t.id) : null;
    const text = numText(talentText(t, spec), cls.id, spec);
    if (mv) return `<div class="tip-ab"><i class="ab-icon ${mv.type}" style="background-image:url(${abilityIcon(cls.id, abilityIconId(Object.assign({ fromTalent: t.id }, mv)))})"></i><div><b>${t.name}</b><em>${ROMAN[r]} · ${mv.name === where ? 'rides on' : 'new move, replaces'} ${where}</em></div></div>${text}${text.includes(mv.name) ? '' : `<div class="it-talent"><span><u>${mv.name}:</u> ${mv.desc}</span></div>`}`;
    return `<div class="tip-ab"><i class="ab-icon ${ab ? ab.type : ''}" style="background-image:url(${abilityIcon(cls.id, t.ab)})"></i><div><b>${t.name}</b><em>${ROMAN[r]} · ${where}</em></div></div>${text}`;
  }

  function render() {
    if (!deps) return;
    const cls = deps.cls(); if (!cls) return;
    const spec = deps.spec(), sp = specOf(cls.id, spec), kit = kitFor(cls.id, spec);
    const st = Save.talents(cls.id), gold = Save.gold(), locked = deps.locked();
    const specRows = specTalentRows(cls.id, spec);   // (rows VI-VII, this spec's; null without a spec)
    el.style.setProperty('--a', (sp && sp.accent) || cls.accent);
    $q('.tal-hero').innerHTML = `<b>${cls.name}</b><small>${sp ? `${sp.name} · ${sp.title}` : cls.title}</small>`;
    $q('.tal-gold').innerHTML = `${coin}${gold.toLocaleString('en-US')}`;
    const rows = specRows ? [...TALENTS[cls.id], ...specRows] : TALENTS[cls.id];
    const pickOf = r => (r >= 5 ? st.specPicks[r - 5] : st.picks[r]);
    $q('.tal-rows').innerHTML = rows.map((row, r) => {
      const open = r < st.rows, next = r === st.rows, sealed = r > st.rows;
      const cost = TALENT_COSTS[r];
      let tier = `<div class="tal-tier"><b>${ROMAN[r]}</b><small>${sealed && r < 5 ? '' : rowName(r, kit, sp)}</small>`;
      if (next) tier += `<button class="tal-unlock" data-r="${r}" ${gold < cost || locked ? 'disabled' : ''}${gold < cost ? ` data-tip="${cost - gold} gold short"` : locked ? ' data-tip="Locked during a raid"' : ''}>${coin}${cost}</button>`;
      tier += '</div>';
      const cards = sealed ? `<div class="tal-card tal-lock" aria-disabled="true"><span>Opens after row ${ROMAN[r - 1]}</span><u>${coin}${cost}</u></div>` : row.map((t, c) => {
        const picked = open && pickOf(r) === c;
        return `<button class="tal-card${picked ? ' picked' : ''}${next ? ' preview' : ''}" data-r="${r}" data-c="${c}"${!open || locked ? ' aria-disabled="true"' : ''}>
          <i class="ab-icon" style="background-image:url(${abilityIcon(cls.id, (mv => (mv ? abilityIconId(Object.assign({ fromTalent: t.id }, mv)) : t.ab))(typeof talentMoveFor === 'function' && talentMoveFor(cls.id, spec, t.id)))})"></i>
          <span><b>${t.name}</b><p>${numText(talentText(t, spec), cls.id, spec)}</p></span></button>`;
      }).join('');
      return `${r === 5 ? '<div class="tal-spec-rule"><span>' + sp.name + '</span></div>' : ''}<section class="tal-row ${open ? 'open' : next ? 'next' : 'sealed'}${r >= 5 ? ' spec' : ''}">${tier}<div class="tal-cards${row.length === 2 ? ' two' : ''}">${cards}</div></section>`;
    }).join('') + (spec || !specTalentRows(cls.id, (SPECS[cls.id] || [{}])[0].id) ? '' : '<p class="tal-spec-hint">A specialization opens two more rows.</p>');
    const any = st.picks.some((p, r) => p != null && r < st.rows) || st.specPicks.some((p, i) => p != null && i + 5 < st.rows);
    $q('.tal-foot').innerHTML = `<span class="tal-count">${Math.min(st.rows, rows.length)} of ${rows.length} rows</span>
      ${locked ? '<span class="tal-locked">Locked during a raid.</span>' : ''}
      <button class="btn2 tal-reset" ${!any || locked ? 'disabled' : ''}>Reset picks</button>`;

    el.querySelectorAll('.tal-card[data-c]').forEach(b => {
      const r = Number(b.dataset.r), c = Number(b.dataset.c);
      Tip.set(b, () => cardTip(cls, kit, spec, rows[r][c], r));
      b.addEventListener('click', () => {
        if (deps.locked() || r >= Save.talents(cls.id).rows || pickOf(r) === c) return;
        if (Save.pickTalent(cls.id, r, c)) { deps.onChange(); render(); }
      });
    });
    const ub = $q('.tal-unlock');
    if (ub) ub.addEventListener('click', () => {
      const r = Number(ub.dataset.r);
      if (deps.locked() || Save.talents(cls.id).rows !== r) return;
      if (Save.unlockTalentRow(cls.id, TALENT_COSTS[r])) { deps.onGold(); deps.onChange(); render(); if (typeof Sound !== 'undefined') Sound.play('ui-buy', { bus: 'ui' }); }
    });
    $q('.tal-reset').addEventListener('click', () => {
      if (deps.locked()) return;
      Save.resetTalents(cls.id); deps.onChange(); render();
    });
  }

  return {
    init(d) { deps = d; },
    open, close, isOpen, render,
    toggle() { if (isOpen()) { close(); return true; } return open(); },
  };
})();
