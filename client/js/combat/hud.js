// Combat HUD for the local player: ability bar (Q W E R D F + Space), class gauge, cast bar, buffs.

const SLOT_KEYS = ['Q', 'W', 'E', 'R', 'D', 'F', 'SPC', 'T'];   // 7: a tank's taunt
// a class whose icons aren't all painted yet draws its own: ICON_ART in gauges.js (the Alembist), or drawnIcon below
// for classes flagged art.icons === false in data.js (Thermist, Driftblade)
const abilityIcon = (classId, abilityId) => (typeof ICON_ART !== 'undefined' && ICON_ART[classId] && ICON_ART[classId](abilityId)) || drawnIcon(classId, abilityId) || `icons/${classId}/${abilityId}.png`;

const BUFF_NAMES = {
  oath: 'Oath of Valor', frenzy: 'Frenzy', gorge: 'Gorged', undying: 'Undying', overload: 'Runic Overload',
  markself: "Hunter's Mark", keen: 'Keen Eye', barrage: 'Barrage', truenorth: 'Shadowstep', dance: 'Shadow Dance',
  combust: 'Combustion', heating: 'Heating Up', hotstreak: 'Hot Streak', burnt: 'Burnt Out', growth: 'Wild Growth',
  awaken: 'Awakened', surge: 'Surge', lag: 'Time Lag', radiant: 'Radiant', verdict: 'Swift Verdict', chamber: 'Echo Chamber', moonlit: 'Moonlit', aim: 'Steady Aim', incircle: 'Ember Circle',
  // the advanced classes
  brink: 'On the Brink', overheat: 'Overheat', frostbite: 'Frostbite', attuned: 'Attuned', momentum: 'Momentum', redline: 'Redline', rebound: 'Rebound',
  still: 'Stillpoint', gale: 'Gale Run', orbit: 'Orbit', tailwind: 'Tailwind',
};
const BAD_BUFFS = new Set(['burnt', 'lag', 'overheat', 'frostbite']);
// which ability's icon a buff wears
const BUFF_ICON = {
  oath: 'oath', frenzy: 'frenzy', gorge: 'drain', undying: 'undying', overload: 'overload', markself: 'mark', keen: 'pierce',
  barrage: 'barrage', truenorth: 'step', dance: 'dance', combust: 'combust', heating: 'fireblast', hotstreak: 'pyro', burnt: 'vent',
  growth: 'growth', awaken: 'bloom', surge: 'shift', lag: 'shift', radiant: 'edge', verdict: 'smite', chamber: 'accel', moonlit: 'growth', aim: 'pierce', incircle: 'combust',
  brink: 'flare', overheat: 'cinder', frostbite: 'rime', attuned: 'invert', momentum: 'equil', redline: 'flare', rebound: 'lance',
  still: 'still', gale: 'gale', orbit: 'slip', tailwind: 'hook',
};

// hover text for each class gauge: what fills it, what spends it, and (state) a live readout under the name
const GAUGE_TIPS = {
  bastion: { desc: 'Judgment (the third Blade Chain hit) gives 25, or 50 during Oath of Valor. A Perfect Block gives 20. Holy Edge spends 50.' },
  bloodreaver: { desc: 'Hack gives 10, Maul 15 and Bloodletting 20. Crimson Drain spends 40, or nothing while Frenzy lasts.' },
  runeguard: { desc: 'Rune Strike gives 1 (2 during Runic Overload), and a Ward broken all the way refunds its Rune. Runic Ward spends 1, Glyph Burst spends all 3.' },
  ranger: { desc: 'Quick Shot gives 10, or 30 with Barrage. Rapid Fire spends 50. Anything past 100 is lost.' },
  shadowblade: { desc: 'Strike gives 1 point, or 2 from behind. Eviscerate spends every point and hits harder for each, with a bonus at 5. A sixth point is lost.' },
  pyromancer: {
    desc: 'Fireball gives 12, Pyroblast 20 (10 with Hot Streak) and Fire Blast 6. Every point of Heat adds 0.3% damage. At 100 you overheat: you lose 15% of your HP, Heat resets and you deal 20% less damage for 5s. Heat cools slowly while you aren\'t casting. Vent spends it all.',
    state: k => `+${Math.round(k.g.heat * 0.3)}% damage`,
  },
  cleric: {
    desc: 'You get a Petal every 15s, up to 3. Dawn Petal spends one. Every third Petal spent turns your next Smite into Dawnstar.',
    state: k => (k.g.bloom >= 3 ? 'Dawnstar ready' : `Dawnstar ${k.g.bloom} / 3`) + (k.g.petals < 3 && k.g.petalAt != null ? ` · next Petal ${Math.max(0, Math.ceil(k.g.petalAt - k.now))}s` : ''),
  },
  grovekeeper: { desc: 'Each Rejuvenate tick gives 5. Bloom spends 50.' },
  chronomancer: {
    desc: 'Fills by 3 a second in Slow stance and drains by 5 a second in Haste. Shifting into Haste needs 20. Run dry in Haste and you drop back to Slow with slower casts for 3s.',
    state: k => (k.g.stance === 'haste' ? 'Haste' : 'Slow') + ' stance',
  },
  thermist: {
    desc: 'Fire spells push the dial right, frost spells push it left. Each step from 0 makes that side\'s spells 8% stronger. Cross 0 after reaching 3 or more and the swing detonates as a Thermal Shock. Past +5 you overheat, past -5 you freeze.',
    state: k => (k.g.peak >= 3 && k.g.side ? `Shock armed (${k.g.peak})` : 'Shock not armed') + (k.def.redline ? ` · Strain ${Math.floor(k.g.strain || 0)}` : ''),
  },
  driftblade: {
    desc: 'Moving fills it by 20 a second; standing still drains it by 30. Most of your cuts hit harder the fuller it is. Crosswind spends it all.',
    state: k => `+${Math.round(Math.min(1, (k.g.drift || 0) / 100) * 100)}% to Drift moves`,
  },
};

// Alembist (classes-b): the bandolier's tooltip lists the recipes (and the Volatile's Reactions, sealed until found)
Object.assign(BUFF_NAMES, { distill: 'Distill', catalyst: 'Catalyst' });
Object.assign(BUFF_ICON, { distill: 'distill', catalyst: 'distill' });
GAUGE_TIPS.alembist = {
  desc: 'Two reagents brew a vial into your bandolier (three after Catalyst). Throw takes the oldest. Vials grow 30% stronger over their first 10s and spoil after 40s.',
  state: k => {
    const i = alemPick(k), v = i >= 0 ? k.g.vials[i] : null, raise = Math.ceil(k.g.raiseAt - k.now);
    const parts = [v ? `next: ${alemInfo(v.r).name} ${Math.round((alemStrength(k, v) - 1) * 100)}%` : 'empty'];
    if (raise > 0) parts.push(`raise in ${raise}s`);
    return parts.join(' · ');
  },
  extra: k => `<div class="alem-book">${alemBook(null, false)}${k.def.alem.fuse ? alemBook(alemKnown(k), true) : ''}</div>`,
};

const Hud = {
  el: null, slots: [], actor: null, gaugeCanvas: null, castFill: null, castName: null, buffRow: null, extra: () => [],

  init() {
    const el = document.createElement('div');
    el.id = 'combat-hud';
    el.className = 'hidden';
    el.innerHTML = `
      <div id="buff-row"></div>
      <div id="cast-bar" class="hidden"><div class="fill"></div><span></span></div>
      <div class="hud-main">
        <div class="gauge-wrap"><canvas id="gauge-canvas"></canvas></div>
        <div id="ability-row"></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.gaugeCanvas = el.querySelector('#gauge-canvas');
    this.castBar = el.querySelector('#cast-bar');
    this.castFill = this.castBar.querySelector('.fill');
    this.castName = this.castBar.querySelector('span');
    this.buffRow = el.querySelector('#buff-row');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gaugeCanvas.width = 130 * dpr; this.gaugeCanvas.height = 116 * dpr;
    this.gaugeCanvas.style.width = '130px'; this.gaugeCanvas.style.height = '116px';
  },

  setActor(actor, onPress) {
    this.actor = actor;
    const row = this.el.querySelector('#ability-row');
    const cls = actor.cls;
    // a gauge can ask for a wider canvas (the Alembist's bandolier)
    const gw = (actor.kit.def.gauge && actor.kit.def.gauge.w) || 130;
    if (gw !== this.gw) {
      this.gw = gw;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.gaugeCanvas.width = gw * dpr; this.gaugeCanvas.style.width = gw + 'px';
      this.el.querySelector('.gauge-wrap').style.width = gw + 'px';
    }
    const items = [...actor.abilities, { id: 'dash', name: 'Dash', type: 'ogcd', desc: 'Dash in the direction you are moving (or toward the cursor). Two charges.', fx: { color: cls.accent } }];
    // a tank's taunt (slot 7, key T), drawn just before the dash
    const taunt = actor.taunt ? tauntAbility(cls.id) : null;
    if (taunt) items.push(taunt);
    // painted icons live in icons/<class>/<ability id>.png; the dash (and anything without art) shows its letter
    const art = (ab, i) => (i < 6 ? `url(${abilityIcon(cls.id, abilityIconId(ab))})` : ab.taunt ? tauntIconBg(cls.id) : '');
    row.innerHTML = items.map((ab, i) => `
      <div class="slot ${ab.type}${art(ab, i) ? ' has-art' : ''}${ab.taunt ? ' taunt' : ''}" data-i="${i}" style="--a:${cls.accent};--fx:${(ab.fx && ab.fx.color) || cls.accent}">
        <div class="icon"${art(ab, i) ? ` style="background-image:${art(ab, i)}"` : ''}>${art(ab, i) ? '' : ab.name.replace(/^The /, '')[0]}</div>
        <kbd>${SLOT_KEYS[i]}</kbd>
        <div class="sweep"></div>
        <div class="cdtext"></div>
        <div class="charges"></div>
        <div class="name">${ab.name}</div>
      </div>`).join('');
    this.slots = [...row.children].map(el => ({ el, sweep: el.querySelector('.sweep'), cd: el.querySelector('.cdtext'), ch: el.querySelector('.charges'), name: el.querySelector('.name'), icon: el.querySelector('.icon') }));
    if (taunt) row.insertBefore(this.slots[7].el, this.slots[6].el);
    // in-game tooltips (shows the current label, e.g. Riposte / Dawnstar)
    this.slots.forEach((s, i) => Tip.set(s.el, () => {
      const ab = items[i], k = this.actor && this.actor.kit;
      const name = k && i < 6 ? k.label(ab) : ab.name;
      const icon = art(ab, i) ? `<i class="ab-icon ${ab.type}" style="background-image:${art(ab, i)}"></i>` : '<i class="ab-icon dash">»</i>';
      const meta = [ab.type === 'gcd' ? 'GCD' : 'oGCD'];
      if (typeof ab.cast === 'number' && ab.cast) meta.push(`${ab.cast}s cast`);
      if (ab.charges) meta.push(`${ab.charges} charges · ${ab.cd}s`); else if (typeof ab.cd === 'number' && ab.cd) meta.push(`${ab.cd}s cooldown`);
      const perks = k ? [...(k.gear().perks || [])].filter(p => ITEM_PERKS[p] && ITEM_PERKS[p].ab === (ab.replaces || ab.id)) : [];
      const enh = perks.map(p => `<div class="it-perk"><span><u>Enhanced (${ITEMS[p].name}):</u> ${ITEM_PERKS[p].text}</span></div>`).join('');
      // talents (talents.js) that change this move, or the move its spec version replaced
      const held = k && k.env.talents && typeof TALENT_BY_ID !== 'undefined' ? [...(k.env.talents() || [])].map(id => TALENT_BY_ID[id]).filter(d => d && d.t.ab === (ab.replaces || ab.id)) : [];
      const tal = held.map(d => `<div class="it-talent"><span><u>Talent · ${d.t.name}:</u> ${talentText(d.t, this.actor.spec)}</span></div>`).join('');
      return `<div class="tip-ab">${icon}<div><b>${name}</b><em>${meta.join(' · ')}</em></div></div>${ab.desc || ''}${enh}${tal}`;
    }));
    this.slots.forEach((s, i) => s.el.addEventListener('mousedown', e => { e.stopPropagation(); onPress(i); }));
    Tip.set(this.el.querySelector('.gauge-wrap'), () => {
      const k = this.actor && this.actor.kit, g = k && k.def.gauge, sp = this.actor && specOf(cls.id, this.actor.spec);
      const info = sp && sp.gaugeTip ? Object.assign({}, GAUGE_TIPS[cls.id], { desc: sp.gaugeTip }) : GAUGE_TIPS[cls.id];
      if (!g || !info) return '';
      const val = Math.floor(k.g[g.key] || 0);
      const meta = [`${val} / ${g.max}`];
      if (info.state) meta.push(info.state(k));
      return `<b>${g.label}</b><em>${meta.join(' · ')}</em>${info.desc}${info.extra ? info.extra(k) : ''}`;
    });
    this.el.classList.remove('hidden');
  },

  hide() { this.el.classList.add('hidden'); this.actor = null; },

  update(now, t) {
    const a = this.actor;
    if (!a) return;
    const k = a.kit;
    const enhanced = new Set([...(k.gear().perks || [])].map(p => ITEM_PERKS[p] && ITEM_PERKS[p].ab));
    const talented = new Set(k.env.talents && typeof TALENT_BY_ID !== 'undefined' ? [...(k.env.talents() || [])].map(id => TALENT_BY_ID[id] && TALENT_BY_ID[id].t.ab) : []);
    a.abilities.forEach((ab, i) => {
      const s = this.slots[i];
      s.el.classList.toggle('enhanced', enhanced.has(ab.replaces || ab.id));
      s.el.classList.toggle('talented', talented.has(ab.replaces || ab.id));
      const usable = k.usable(ab);
      let frac = 0, txt = '';
      const cdLeft = k.cdRemaining(ab);
      if (ab.charges) {
        const ch = k.charges(ab);
        s.ch.textContent = ch;
        frac = ch === 0 ? k.cdFraction(ab) : 0;
        if (ch === 0) txt = cdLeft < 1 ? cdLeft.toFixed(1) : Math.ceil(cdLeft);
        s.el.classList.toggle('partial', ch > 0 && ch < ab.charges);
      } else if (k.recast(ab) && cdLeft > 0) {
        frac = k.cdFraction(ab);
        txt = cdLeft < 1 ? cdLeft.toFixed(1) : Math.ceil(cdLeft);
      }
      if (ab.type === 'gcd' && k.gcdRemaining() > 0 && cdLeft <= 0) frac = Math.max(frac, k.gcdRemaining() / k.gcdLen);
      s.sweep.style.setProperty('--cd', frac.toFixed(3));
      s.cd.textContent = txt;
      s.el.classList.toggle('glow', usable && cdLeft <= 0 && k.glows(ab));
      s.el.classList.toggle('dim', !usable);
      s.el.classList.toggle('queued', !!(k.queued && k.queued.ab === ab));
      s.el.classList.toggle('casting', !!(k.cast && k.cast.ab === ab));
      const lbl = k.label(ab);
      if (s.name.textContent !== lbl) s.name.textContent = lbl;
    });
    // dash
    const ds = this.slots[6];
    a.dashReady(now);
    ds.ch.textContent = a.dash.charges;
    ds.sweep.style.setProperty('--cd', a.dash.charges === 0 ? a.dashFraction(now).toFixed(3) : 0);
    ds.cd.textContent = a.dash.charges === 0 ? Math.ceil(a.dash.next - now) : '';
    // taunt (tanks)
    const ts = a.taunt && this.slots[7];
    if (ts) {
      const left = a.tauntLeft(now);
      ts.sweep.style.setProperty('--cd', (left / TAUNT.cd).toFixed(3));
      ts.cd.textContent = left > 0 ? (left < 1 ? left.toFixed(1) : Math.ceil(left)) : '';
    }
    // cast bar
    if (k.cast) {
      this.castBar.classList.remove('hidden');
      this.castFill.style.width = (Math.min(1, (now - k.cast.start) / (k.cast.end - k.cast.start)) * 100).toFixed(1) + '%';
      if (this._castAb !== k.cast.ab) {
        this._castAb = k.cast.ab;
        this.castName.innerHTML = `<i class="cb-icon" style="background-image:url(${abilityIcon(a.cls.id, abilityIconId(k.cast.ab))})"></i>${k.cast.ab.name}`;
      }
    } else { this.castBar.classList.add('hidden'); this._castAb = null; }
    // gauge
    const c = this.gaugeCanvas.getContext('2d');
    const gw = this.gw || 130, dpr = this.gaugeCanvas.width / gw;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, gw, 116);
    drawGauge(c, k, gw, 116, t);
    // buffs (rebuilt only when the set changes)
    const list = [];
    for (const [id, b] of k.buffs) if (b.end > now && BUFF_NAMES[id]) list.push({ id, name: BUFF_NAMES[id], left: b.end - now, stacks: b.stacks, bad: BAD_BUFFS.has(id) });
    for (const x of this.extra()) list.push(x);
    for (const x of k.itemBuffs()) list.push(x);   // buffs from item effects
    const key = list.map(b => b.id + ':' + (b.left != null ? Math.ceil(b.left) : '') + ':' + b.stacks).join('|');
    if (key !== this._buffKey) {
      this._buffKey = key;
      const icon = b => (BUFF_ICON[b.id] ? `<u class="bf-icon" style="background-image:url(${abilityIcon(a.cls.id, BUFF_ICON[b.id])})"></u>` : '');
      // entries with no timer (left undefined) just show their name
      this.buffRow.innerHTML = list.map(b => `<span class="buff ${b.bad ? 'bad' : ''}${b.bond ? ' bond' : ''}"${b.tip ? ` data-tip="${b.tip}"` : ''}>${icon(b)}${b.name}${b.stacks > 1 ? ' ×' + b.stacks : ''}${b.left != null ? ` <i>${Math.ceil(b.left)}</i>` : ''}</span>`).join('');
    }
  },
};

// ---------------------------------------------------------------- drawn ability icons (classes without painted icons yet)
// A dark tile in the class accent with a simple glyph per move. Cached as data URLs; null for classes that have art.
const DRAWN_ICONS = {};
const ICON_GLYPHS = {
  thermist: {
    cinder: c => { c.fillStyle = '#ff8a3a'; c.beginPath(); c.arc(30, 34, 9, 0, TAU); c.fill(); c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(32, 32, 4, 0, TAU); c.fill(); c.strokeStyle = '#ff8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 40); c.lineTo(10, 52); c.stroke(); },
    rime: c => { c.fillStyle = '#9ad8ff'; c.beginPath(); c.moveTo(32, 10); c.lineTo(40, 32); c.lineTo(32, 54); c.lineTo(24, 32); c.closePath(); c.fill(); c.fillStyle = '#e8f8ff'; c.fillRect(31, 18, 2, 28); },
    flare: c => { c.fillStyle = '#ffa64a'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 9 : 22; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.fill(); c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); },
    lance: c => { c.fillStyle = '#7ac0f0'; c.beginPath(); c.moveTo(8, 56); c.lineTo(56, 8); c.lineTo(46, 26); c.lineTo(14, 58); c.closePath(); c.fill(); c.strokeStyle = '#e8f8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 52); c.lineTo(52, 12); c.stroke(); },
    equil: c => { c.fillStyle = '#4f94d8'; c.beginPath(); c.arc(32, 32, 18, Math.PI / 2, Math.PI * 1.5); c.fill(); c.fillStyle = '#f08236'; c.beginPath(); c.arc(32, 32, 18, -Math.PI / 2, Math.PI / 2); c.fill(); c.fillStyle = '#f2e6c8'; c.fillRect(30, 10, 4, 44); },
    invert: c => { c.lineWidth = 5; c.strokeStyle = '#f08236'; c.beginPath(); c.arc(32, 32, 17, -Math.PI * 0.9, -0.1); c.stroke(); c.strokeStyle = '#6fb2f0'; c.beginPath(); c.arc(32, 32, 17, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); c.fillStyle = '#f08236'; c.beginPath(); c.moveTo(50, 26); c.lineTo(56, 38); c.lineTo(43, 36); c.fill(); c.fillStyle = '#6fb2f0'; c.beginPath(); c.moveTo(14, 38); c.lineTo(8, 26); c.lineTo(21, 28); c.fill(); },
    thermocline: c => { c.lineWidth = 5; const g = c.createLinearGradient(8, 0, 56, 0); g.addColorStop(0, '#ffa64a'); g.addColorStop(1, '#6fb2f0'); c.strokeStyle = g; c.beginPath(); for (let x = 8; x <= 56; x += 2) c.lineTo(x, 32 + Math.sin(x / 6) * 10); c.stroke(); },
    zero: c => { c.strokeStyle = '#d8f0ff'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(32 - Math.cos(a) * 20, 32 - Math.sin(a) * 20); c.lineTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); c.stroke(); } c.fillStyle = '#9ad8ff'; c.beginPath(); c.arc(32, 32, 5, 0, TAU); c.fill(); },
    bleed: c => { c.strokeStyle = '#ff7a7a'; c.lineWidth = 3; for (const x of [22, 32, 42]) { c.beginPath(); c.moveTo(x, 50); c.bezierCurveTo(x - 6, 40, x + 6, 30, x, 14); c.stroke(); } },
  },
  driftblade: {
    carve: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(30, 36, 20, -2.4, 0.2); c.stroke(); c.strokeStyle = '#7fe8cc'; c.lineWidth = 2; c.beginPath(); c.arc(30, 36, 14, -2.2, 0); c.stroke(); },
    slip: c => { c.strokeStyle = '#7fe8cc'; c.lineWidth = 3; c.lineCap = 'round'; for (const [y, l] of [[22, 30], [32, 40], [42, 26]]) { c.beginPath(); c.moveTo(10, y); c.lineTo(10 + l, y); c.stroke(); } c.fillStyle = '#e8fff8'; c.beginPath(); c.moveTo(56, 32); c.lineTo(44, 24); c.lineTo(44, 40); c.fill(); },
    hook: c => { c.fillStyle = '#c86a5a'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); c.strokeStyle = '#7fe8cc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(32, 32, 18, Math.PI * 0.8, Math.PI * 2.1); c.stroke(); c.fillStyle = '#7fe8cc'; c.beginPath(); c.moveTo(50, 36); c.lineTo(56, 24); c.lineTo(44, 26); c.fill(); },
    cross: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(12, 32, 30, -0.8, 0.8); c.stroke(); c.strokeStyle = '#7fe8cc'; c.beginPath(); c.arc(52, 32, 30, Math.PI - 0.8, Math.PI + 0.8); c.stroke(); },
    still: c => { c.strokeStyle = '#f2e6c8'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 18, 0, TAU); c.stroke(); c.strokeStyle = '#e8fff8'; c.lineWidth = 4; c.beginPath(); c.moveTo(14, 46); c.lineTo(50, 18); c.stroke(); },
    gale: c => { c.strokeStyle = '#7fe8cc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.32, r = 3 + i * 0.55; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.stroke(); },
    impact: c => { const g = c.createLinearGradient(8, 56, 46, 18); g.addColorStop(0, 'rgba(255,208,138,0)'); g.addColorStop(1, '#ffd08a'); c.strokeStyle = g; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, 56); c.lineTo(44, 20); c.stroke(); c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(46, 18, 7, 0, TAU); c.fill(); },
    gyre: c => { c.strokeStyle = '#a8f0c8'; c.lineWidth = 4; c.lineCap = 'round'; for (const o of [0, Math.PI]) { c.beginPath(); c.arc(32, 32, 18, o, o + 2.4); c.stroke(); } c.fillStyle = '#e8fff8'; c.beginPath(); c.arc(32, 32, 4, 0, TAU); c.fill(); },
    tailspin: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; c.beginPath(); c.arc(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6, 16, a, a + 1.6); c.stroke(); } },
  },
};
function drawnIcon(classId, abilityId) {
  if (typeof document === 'undefined' || typeof CLASSES === 'undefined') return null;
  const key = classId + '/' + abilityId;
  if (key in DRAWN_ICONS) return DRAWN_ICONS[key];
  const cls = CLASSES.find(x => x.id === classId);
  if (!cls || !cls.art || cls.art.icons !== false) return (DRAWN_ICONS[key] = null);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const bg = c.createRadialGradient(32, 26, 4, 32, 32, 46);
  bg.addColorStop(0, shade(cls.accent, -0.35)); bg.addColorStop(1, '#14111a');
  c.fillStyle = bg; c.fillRect(0, 0, 64, 64);
  const g = ICON_GLYPHS[classId] && ICON_GLYPHS[classId][abilityId];
  if (g) g(c);
  else { c.fillStyle = '#f2e6c8'; c.font = '700 30px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(abilityId[0].toUpperCase(), 32, 34); }
  c.strokeStyle = rgba(cls.accent, 0.6); c.lineWidth = 2; c.strokeRect(1, 1, 62, 62);
  return (DRAWN_ICONS[key] = cv.toDataURL());
}

// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
Object.assign(BUFF_NAMES, { jaw: 'Open Wide', bottomless: 'Bottomless', stone: 'Stone Belly', ironjaw: 'Iron Gut', digest: 'Digest' });
Object.assign(BUFF_ICON, { jaw: 'wide', bottomless: 'bottomless', stone: 'stonebelly', ironjaw: 'iron', digest: 'digest' });
GAUGE_TIPS.gorgemaw = {
  desc: 'An edible hit that lands in your open jaw deals a quarter of its damage and goes in as a Morsel of its shape: circles are Rings, lines Lances, cones Fangs, a tankbuster a Spike. Spit fires the oldest back at the boss; Digest heals you on all of them. A full Belly wastes what you eat next.',
  state: k => (k.g.belly.length ? 'next Spit: ' + MAW.NAMES[k.g.belly[0].m] + (k.def.fuse && k.g.belly.length > 1 && k.g.belly[0].m === k.g.belly[1].m ? ' (' + MAW.FUSION[k.g.belly[0].m] + ')' : '') : 'empty'),
};
GAUGE_TIPS.oathbroker = {
  desc: '60% of every hit you take is written here instead, and billed to you when it comes due. Your combo pays the oldest lines down. Lines in the last 2s are red.',
  state: k => `${Math.round(k.g.total || 0)} owed · ${Math.round(oathDueSoon(k, 3))} due in 3s`,
};
(() => {
  const ink = (c, w = 3, col = '#f2e6c8') => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const teeth = (c, y, dir, x0 = 14, x1 = 50, n = 5, col = '#fff4e0') => { c.fillStyle = col; const s = (x1 - x0) / n; for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(x0 + i * s, y); c.lineTo(x0 + (i + 1) * s, y); c.lineTo(x0 + (i + 0.5) * s, y + dir * 9); c.closePath(); c.fill(); } };
  const jaw = (c, gape, col = '#d0743a') => { c.fillStyle = '#2a0e08'; c.beginPath(); c.ellipse(32, 32, 20, 4 + gape, 0, 0, TAU); c.fill(); ink(c, 4, col); c.beginPath(); c.ellipse(32, 32, 20, 4 + gape, 0, 0, TAU); c.stroke(); teeth(c, 32 - 4 - gape + 1, 1, 16, 48, 4); teeth(c, 32 + 4 + gape - 1, -1, 16, 48, 4); };
  const sealG = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, rr = r * (i % 2 ? 0.88 : 1); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); ink(c, 2, '#2a1424'); c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.moveTo(x - r * 0.35, y); c.lineTo(x + r * 0.35, y); c.moveTo(x, y - r * 0.35); c.lineTo(x, y + r * 0.35); c.stroke(); };
  const page = (c, x, y, w, h) => { c.fillStyle = '#e8e0cc'; c.fillRect(x, y, w, h); ink(c, 1.5, '#5a4a6a'); for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + 4, y + i * h / 5); c.lineTo(x + w - 4, y + i * h / 5); c.stroke(); } };
  ICON_GLYPHS.gorgemaw = {
    gnash: c => jaw(c, 3, '#e8c8a0'),
    wide: c => jaw(c, 14),
    spit: c => { jaw(c, 6); c.fillStyle = '#ff9a3a'; c.beginPath(); c.arc(54, 18, 7, 0, TAU); c.fill(); c.fillStyle = '#ffe0b0'; c.beginPath(); c.arc(52, 16, 3, 0, TAU); c.fill(); },
    regurgitate: c => { jaw(c, 9); for (const [x, y, col] of [[50, 12, '#ff9a3a'], [56, 26, '#7fd0ff'], [46, 22, '#ffe27a']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill(); } },
    digest: c => { c.fillStyle = '#5a3020'; c.beginPath(); c.ellipse(32, 36, 20, 16, 0, 0, TAU); c.fill(); ink(c, 3, '#ffc070'); c.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.42, r = 2 + i * 0.5; c.lineTo(32 + Math.cos(a) * r, 36 + Math.sin(a) * r * 0.8); } c.stroke(); },
    iron: c => { c.fillStyle = '#b8743a'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); } c.closePath(); c.fill(); ink(c, 2.5, '#ffd8a0'); c.stroke(); c.fillStyle = '#ffd8a0'; for (const [x, y] of [[24, 26], [40, 26], [32, 40]]) { c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill(); } },
    stonebelly: c => { c.fillStyle = '#8a8278'; c.beginPath(); c.ellipse(32, 34, 20, 17, 0, 0, TAU); c.fill(); ink(c, 2, '#d8d0c4'); c.beginPath(); c.moveTo(18, 28); c.lineTo(28, 34); c.lineTo(26, 44); c.moveTo(38, 22); c.lineTo(36, 34); c.lineTo(46, 40); c.stroke(); },
    bottomless: c => { ink(c, 3, '#ff8a3a'); c.beginPath(); for (let i = 0; i < 50; i++) { const a = i * 0.36, r = 24 - i * 0.45; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.stroke(); teeth(c, 10, 1, 12, 52, 6); teeth(c, 54, -1, 12, 52, 6); },
    taunt: c => { jaw(c, 10); ink(c, 2.5, '#ffb070'); for (const r of [24, 29]) { c.beginPath(); c.arc(32, 32, r, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(32, 32, r, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); } },
  };
  ICON_GLYPHS.oathbroker = {
    collect: c => { c.fillStyle = '#8a8098'; c.fillRect(30, 26, 4, 30); c.fillStyle = '#b8a8e0'; c.fillRect(20, 12, 24, 16); ink(c, 2, '#2a1424'); c.strokeRect(20, 12, 24, 16); sealG(c, 32, 44, 8, '#c04a5a'); },
    reneg: c => { page(c, 16, 14, 30, 38); ink(c, 3, '#b8a8e0'); c.beginPath(); c.arc(32, 33, 12, -2.6, 1.2); c.stroke(); c.fillStyle = '#b8a8e0'; c.beginPath(); c.moveTo(18, 22); c.lineTo(24, 30); c.lineTo(14, 30); c.fill(); },
    settle: c => sealG(c, 32, 32, 20, '#ffd27a'),
    audit: c => { page(c, 14, 12, 28, 36); ink(c, 3.5, '#ffd27a'); c.beginPath(); c.arc(38, 36, 9, 0, TAU); c.moveTo(45, 43); c.lineTo(54, 52); c.stroke(); },
    lien: c => { ink(c, 3.5, '#b8a8e0'); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(14 + i * 11, 44 - i * 8, 7, 4, -0.6, 0, TAU); c.stroke(); } sealG(c, 50, 16, 8, '#c04a5a'); },
    cosign: c => { page(c, 12, 14, 24, 32); page(c, 28, 20, 24, 32); ink(c, 3, '#b8a8e0'); c.beginPath(); c.moveTo(18, 52); c.bezierCurveTo(26, 40, 34, 58, 48, 46); c.stroke(); },
    writ: c => { c.fillStyle = '#f0e8d8'; c.fillRect(18, 12, 28, 40); c.fillStyle = '#c8b898'; c.beginPath(); c.ellipse(32, 12, 16, 4, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(32, 52, 16, 4, 0, 0, TAU); c.fill(); ink(c, 1.5, '#5a4a6a'); for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(22, 12 + i * 7); c.lineTo(42, 12 + i * 7); c.stroke(); } },
    default: c => { page(c, 14, 14, 18, 36); page(c, 34, 16, 18, 34); ink(c, 3, '#c04a5a'); c.beginPath(); c.moveTo(32, 10); c.lineTo(28, 22); c.lineTo(36, 32); c.lineTo(30, 44); c.lineTo(34, 56); c.stroke(); },
    foreclose: c => { c.fillStyle = '#8a8098'; c.fillRect(29, 8, 6, 18); c.fillStyle = '#c04a5a'; c.fillRect(16, 24, 32, 12); sealG(c, 32, 48, 10, '#c04a5a'); },
    moratorium: c => { c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(18, 12); c.lineTo(46, 12); c.lineTo(32, 32); c.closePath(); c.fill(); c.beginPath(); c.moveTo(18, 52); c.lineTo(46, 52); c.lineTo(32, 32); c.closePath(); c.fill(); ink(c, 2.5, '#b8a8e0'); c.beginPath(); c.moveTo(14, 12); c.lineTo(50, 12); c.moveTo(14, 52); c.lineTo(50, 52); c.stroke(); },
    taunt: c => { sealG(c, 32, 30, 16, '#c04a5a'); ink(c, 2.5, '#b8a8e0'); c.beginPath(); c.moveTo(10, 54); c.lineTo(54, 54); c.stroke(); },
  };
})();
