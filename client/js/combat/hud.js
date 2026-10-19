// Combat HUD for the local player: ability bar (Q W E R D F + Space), class gauge, cast bar, buffs.

const SLOT_KEYS = ['Q', 'W', 'E', 'R', 'D', 'F', 'SPC', 'T'];   // 7: a tank's taunt
const abilityIcon = (classId, abilityId) => `icons/${classId}/${abilityId}.png`;

const BUFF_NAMES = {
  oath: 'Oath of Valor', frenzy: 'Frenzy', gorge: 'Gorged', undying: 'Undying', overload: 'Runic Overload',
  markself: "Hunter's Mark", keen: 'Keen Eye', barrage: 'Barrage', truenorth: 'Shadowstep', dance: 'Shadow Dance',
  combust: 'Combustion', heating: 'Heating Up', hotstreak: 'Hot Streak', burnt: 'Burnt Out', growth: 'Wild Growth',
  awaken: 'Awakened', surge: 'Surge', lag: 'Time Lag', radiant: 'Radiant', verdict: 'Swift Verdict', chamber: 'Echo Chamber', moonlit: 'Moonlit', aim: 'Steady Aim', incircle: 'Ember Circle',
};
const BAD_BUFFS = new Set(['burnt', 'lag']);
// which ability's icon a buff wears
const BUFF_ICON = {
  oath: 'oath', frenzy: 'frenzy', gorge: 'drain', undying: 'undying', overload: 'overload', markself: 'mark', keen: 'pierce',
  barrage: 'barrage', truenorth: 'step', dance: 'dance', combust: 'combust', heating: 'fireblast', hotstreak: 'pyro', burnt: 'vent',
  growth: 'growth', awaken: 'bloom', surge: 'shift', lag: 'shift', radiant: 'edge', verdict: 'smite', chamber: 'accel', moonlit: 'growth', aim: 'pierce', incircle: 'combust',
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
      return `<b>${g.label}</b><em>${meta.join(' · ')}</em>${info.desc}`;
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
    const dpr = this.gaugeCanvas.width / 130;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, 130, 116);
    drawGauge(c, k, 130, 116, t);
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
