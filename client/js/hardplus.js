// Hard+: an opt-in way to make a Hard pull harder, boss by boss. Before the pull the host picks modifiers; each adds heat.
// It opens for a boss once that boss has fallen on Hard (the host's road decides, as for Hard itself). It is for the twelve
// bosses of the three sets only: not the Ultimate, not a trial, not the Arena, not a practice run. No gear: the reward is a
// flame on the boss's trophy that grows with the best heat cleared, gold (+4% per heat point) and a title per set.
//
// This file holds everything shared and most of the screen side, so the fight, the host and the town carry only small hooks:
//   FightSim (fight.js)   this.mods, ct() (Quick Casts), enrageAt() (Short Fuse), damagePlayer() (Heavy Hands, Brittle),
//                         revive() (No Second Chances), onEvent 'lb' (Bare Hands), resolveMech() (Scorched Earth)
//   RaidHost (raid-host.js)  passes opts.mods on; bots hold Ultimates and the Limit Break under Bare Hands
//   main.js               picker in the raid setup, mods in the 'raid' enter message (mods: [ids]), raid.mods on every client,
//                         Bare Hands / No Second Chances refusals, the clear record, gold, Hall flame
// Mods travel as an array of ids in the 'raid' message and live as { id: true } (clean()) on the host's sim and on every client.

const HARDPLUS = (() => {
  const sv = d => `<svg viewBox="0 0 12 12" aria-hidden="true">${d}</svg>`;
  const S = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
  const MODS = [
    { id: 'shortfuse', name: 'Short Fuse', heat: 2, tip: 'The enrage comes 30 seconds sooner.',
      glyph: sv(`<circle cx="5" cy="7.4" r="3.4" ${S}/><path d="M7.4 4.9 9.4 2.9" ${S}/><path d="M10 1v1.8M9.1 1.9h1.8" ${S}/>`) },
    { id: 'heavyhands', name: 'Heavy Hands', heat: 2, tip: 'The boss hits 10% harder.',
      glyph: sv(`<path d="M2.5 5.2h7v3.6a1.6 1.6 0 0 1-1.6 1.6H4.1a1.6 1.6 0 0 1-1.6-1.6Z" ${S}/><path d="M4.2 5.2V3.4M6 5.2V2.8M7.8 5.2V3.4" ${S}/>`) },
    { id: 'nosecondchances', name: 'No Second Chances', heat: 3, tip: 'Nobody can be raised. The fallen stay down.',
      glyph: sv(`<path d="M4.6 1.8h2.8v2.8h2.8v2.8H7.4v2.8H4.6V7.4H1.8V4.6h2.8Z" ${S}/><path d="M1.6 10.4 10.4 1.6" ${S}/>`) },
    { id: 'scorchedearth', name: 'Scorched Earth', heat: 1, tip: 'Ground the boss strikes keeps burning for a few seconds.',
      glyph: sv(`<path d="M6 1.2c.4 1.8-1.7 2.8-1.7 4.6a1.7 1.7 0 0 0 3.4 0c0-.8-.4-1.3-.4-1.3S9.2 5.2 9.2 7.2" ${S}/><path d="M1.6 10.6h8.8" ${S}/>`) },
    { id: 'brittle', name: 'Brittle', heat: 1, tip: 'Every avoidable hit you take makes you take 10% more damage, up to three times over, for 12 seconds.',
      glyph: sv(`<path d="M6 1 10.4 6 6 11 1.6 6Z" ${S}/><path d="M6 1.4 5 4.6l1.8 1.2-1.4 4.4" ${S}/>`) },
    { id: 'barehands', name: 'Bare Hands', heat: 4, tip: 'Ultimates and the Limit Break cannot be used.',
      glyph: sv(`<path d="M6 1.4 7.2 4.8 10.6 6 7.2 7.2 6 10.6 4.8 7.2 1.4 6 4.8 4.8Z" ${S}/><path d="M1.8 10.2 10.2 1.8" ${S}/>`) },
    { id: 'quickcasts', name: 'Quick Casts', heat: 2, tip: 'The boss winds up 15% faster, never to under 1.2 seconds.',
      glyph: sv(`<path d="M2 2.5 5.5 6 2 9.5M6.5 2.5 10 6 6.5 9.5" ${S}/>`) },
  ];
  const BY = {}; for (const m of MODS) BY[m.id] = m;
  const ALIAS = { fuse: 'shortfuse', hands: 'heavyhands', nosecond: 'nosecondchances', nosecondchance: 'nosecondchances', noraise: 'nosecondchances', scorch: 'scorchedearth',
    scorched: 'scorchedearth', bare: 'barehands', quick: 'quickcasts', quickcast: 'quickcasts' };
  const T = { SHORT_FUSE: 30, ENRAGE_MIN: 60, HANDS: 0.10, BRITTLE: { PER: 0.10, MAX: 3, DUR: 12 }, QUICK: { CUT: 0.15, FLOOR: 1.2 }, GOLD_PER_HEAT: 0.04,
    SCORCH: { DUR: 6, EVERY: 1, DMG: 1400, MAX: 14 } };
  const SET_TITLES = { 1: 'Kindled', 2: 'Stoked', 3: 'White-Hot' };

  // ---------------------------------------------------------------- the pick
  // anything a message or a tool hands over (an array of ids, 'all', 'a,b,c', or an { id: true } object) as { id: true } for the known ones
  function clean(x) {
    let ids = [];
    if (typeof x === 'string') ids = x.split(',');
    else if (Array.isArray(x)) ids = x;
    else if (x && typeof x === 'object') ids = Object.keys(x).filter(k => x[k]);
    const out = {};
    for (const raw of ids) {
      const s = String(raw).trim().toLowerCase();
      if (s === 'all') { for (const m of MODS) out[m.id] = true; continue; }
      const id = BY[s] ? s : ALIAS[s];
      if (id) out[id] = true;
    }
    return out;
  }
  const ids = m => MODS.filter(d => m && m[d.id]).map(d => d.id);
  const heat = m => MODS.reduce((n, d) => n + (m && m[d.id] ? d.heat : 0), 0);
  // the twelve bosses of the sets (data.js: playable, set 1-3); the Ultimate is set 4 and not playable on the board, trials are 'trial:...'
  const eligible = id => typeof BOSSES !== 'undefined' && BOSSES.some(b => b.id === id && b.playable && (b.set || 1) <= 3);
  const goldMult = h => 1 + T.GOLD_PER_HEAT * h;

  // ---------------------------------------------------------------- the sim's side (fight.js)
  // the enrage, from the pull
  const enrage = (e, m) => (e && m && m.shortfuse ? Math.max(T.ENRAGE_MIN, e - T.SHORT_FUSE) : e);
  // a wind-up of sec seconds under Quick Casts: 15% shorter, never to under 1.2 s (a wind-up already under that is left as it is)
  const quick = (sec, m) => (m && m.quickcasts && sec > T.QUICK.FLOOR ? Math.max(T.QUICK.FLOOR, sec * (1 - T.QUICK.CUT)) : sec);
  // Scorched Earth: the patches a resolved ground hit leaves ({ x, y, r } circles; a line leaves a few along it, a cone one in its body)
  function patches(s) {
    const out = [], cl = (v, a, b) => Math.max(a, Math.min(b, v));
    if (!s) return out;
    if (s.kind === 'circle') { if (s.r >= 30 && s.r <= 700) out.push({ x: s.x, y: s.y, r: cl(s.r, 40, 110) }); }
    else if (s.kind === 'rect') {
      const n = cl(Math.round(s.len / 320), 1, 3), r = cl(s.w / 2, 40, 90), c = Math.cos(s.angle), sn = Math.sin(s.angle);
      for (let i = 0; i < n; i++) { const d = s.len * (i + 0.5) / n; out.push({ x: s.x + c * d, y: s.y + sn * d, r }); }
    } else if (s.kind === 'cone') { const d = s.r * 0.6; out.push({ x: s.x + Math.cos(s.angle) * d, y: s.y + Math.sin(s.angle) * d, r: cl(s.r * 0.25, 45, 90) }); }
    return out;
  }

  // ---------------------------------------------------------------- this tab: the armed pick, the memory, the records
  const PICK_KEY = 'emberfall.hardplus';
  const mem = () => { try { const v = JSON.parse(localStorage.getItem(PICK_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const pickOf = bossId => clean(mem()[bossId]);
  function savePick(bossId, m) { try { const a = mem(); a[bossId] = ids(m); localStorage.setItem(PICK_KEY, JSON.stringify(a)); } catch (e) { /* not remembered */ } }
  let armed = null;   // { boss, mods }: set by the raid setup's start button, read by startRaid (and so by a retry after a wipe)
  const arm = (bossId, m) => { armed = m && ids(m).length ? { boss: bossId, mods: m } : null; };
  const armedFor = bossId => (armed && armed.boss === bossId ? armed.mods : null);

  const book = () => { const v = typeof Save !== 'undefined' ? Save.get('hplus') : null; return v && typeof v === 'object' ? v : {}; };
  // { heat, stand (1: set with a bot in the party), at } or null
  const best = bossId => { const r = book()[bossId]; return r && r.heat > 0 ? r : null; };
  const heatOf = bossId => (best(bossId) || { heat: 0 }).heat;
  // a clear is kept when it is hotter than the best, or equal to it with only people in the party where the best had stand-ins
  function record(bossId, h, stand) {
    if (!(h > 0) || typeof Save === 'undefined' || !eligible(bossId)) return null;
    const all = book(), old = all[bossId], st = stand ? 1 : 0;
    if (old && old.heat > 0 && !(h > old.heat || (h === old.heat && old.stand && !st))) return { kept: false, heat: old.heat };
    all[bossId] = { heat: h, stand: st, at: Date.now() };
    Save.set('hplus', all);
    return { kept: true, heat: h, stand: st, up: !old || h > old.heat };
  }
  // every boss of a set at heat n or more (the set titles)
  function setDone(set, n) {
    if (typeof BOSSES === 'undefined') return false;
    const list = BOSSES.filter(b => b.playable && (b.set || 1) === set);
    return list.length > 0 && list.every(b => heatOf(b.id) >= n);
  }
  const bestLine = bossId => { const b = best(bossId); return b ? `Best heat ${b.heat}${b.stand ? ' · with stand-ins' : ''}` : ''; };
  // the statue's label in town
  const tag = bossId => { const b = best(bossId); return b ? ` · Heat ${b.heat}${b.stand ? ' (stand-ins)' : ''}` : ''; };
  // the statue's hover tip in the Trophy Hall (main.js, Tip on the town canvas): '' for a boss with no Hard+ clear
  const statueTip = (bossId, name) => {
    const b = best(bossId);
    if (!b) return '';
    return `<b>${esc(name)}</b><em>Hard+ · Best heat ${b.heat}</em>${b.stand ? 'With stand-ins: a bot was in the party. A clear with only people in it, at this heat or higher, replaces it.' : 'Cleared with people alone.'}`;
  };

  // ---------------------------------------------------------------- the picker (the raid setup, main.js renderRaidSetup)
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const modTip = d => `<b>${esc(d.name)}</b><em>${d.heat} heat</em>${esc(d.tip)}`;
  // hardOn: Hard is the chosen difficulty (the picker); off, a quiet one-line entry shows (so Hard+ is found before Hard is chosen)
  const LOCK_TIP = '<b>Hard+</b>Locked. Defeat this boss on Hard to open it: then pick modifiers, each adds heat, for a flame on its trophy and more gold.';
  function panelHtml(boss, sel, open, hardOn = true) {
    if (!eligible(boss.id)) return '';
    if (!open) return `<div class="hp-box off hp-fold" data-fold="lock"><div class="hp-head"><b>Hard+</b><span>${hardOn ? 'Defeat this boss on Hard to open it.' : 'Locked'}</span></div></div>`;
    if (!hardOn) {
      const bl = bestLine(boss.id);
      return `<button type="button" class="hp-box hp-fold" data-fold="open"><span class="hp-head"><b>Hard+</b><span>${bl ? esc(bl) : 'Add modifiers on Hard for more heat'}</span><i>Open</i></span></button>`;
    }
    const h = heat(sel), bl = bestLine(boss.id);
    return `<div class="hp-box" data-boss="${boss.id}">
      <div class="hp-head"><b>Hard+</b><span class="hp-heat">${h ? `Heat ${h} · +${Math.round(h * T.GOLD_PER_HEAT * 100)}% gold` : 'Pick modifiers to add heat'}</span>${h ? '<button type="button" class="hp-reset">Clear</button>' : ''}</div>
      <div class="hp-mods">${MODS.map(d => `<button type="button" class="hp-mod${sel[d.id] ? ' on' : ''}" data-mod="${d.id}"><u>${d.glyph}</u>${esc(d.name)}<i>+${d.heat}</i></button>`).join('')}</div>
      ${bl ? `<p class="hp-best">${esc(bl)}</p>` : ''}</div>`;
  }
  // wires the box inside el; onChange(sel) redraws the setup
  // (a folded entry: onFold() picks Hard for the open one; the locked one only explains itself)
  function wirePanel(el, boss, sel, onChange, onFold) {
    const fold = el.querySelector('.hp-fold');
    if (fold) {
      if (fold.dataset.fold === 'lock') { if (typeof Tip !== 'undefined') Tip.set(fold, LOCK_TIP); }
      else {
        if (typeof Tip !== 'undefined') Tip.set(fold, '<b>Hard+</b>Pick modifiers before a Hard pull. Each adds heat; the best heat you clear burns on the boss\'s trophy, and gold grows with it.');
        fold.addEventListener('click', () => { if (onFold) onFold(); });
      }
      return;
    }
    const box = el.querySelector('.hp-box[data-boss]');
    if (!box) return;
    box.querySelectorAll('.hp-mod').forEach(b => {
      const d = BY[b.dataset.mod];
      if (typeof Tip !== 'undefined') Tip.set(b, modTip(d));
      b.addEventListener('click', () => { const n = Object.assign({}, sel); if (n[d.id]) delete n[d.id]; else n[d.id] = true; savePick(boss.id, n); onChange(n); });
    });
    const rs = box.querySelector('.hp-reset');
    if (rs) rs.addEventListener('click', () => { savePick(boss.id, {}); onChange({}); });
    const bt = box.querySelector('.hp-best');
    if (bt && typeof Tip !== 'undefined') { const b = best(boss.id); if (b && b.stand) Tip.set(bt, '<b>With stand-ins</b>A bot was in the party. A clear with only people in it, at this heat or higher, replaces it.'); }
  }

  // ---------------------------------------------------------------- the boss bar's icons (raid-ui.js)
  let hudKey = '';
  function hud(el, m) {
    const key = ids(m).join(',');
    if (!el || key === hudKey && el.dataset.k === key) return;
    hudKey = key; el.dataset.k = key;
    el.innerHTML = MODS.filter(d => m && m[d.id]).map(d => `<b class="hp-chip" data-mod="${d.id}">${d.glyph}</b>`).join('');
    el.querySelectorAll('.hp-chip').forEach(c => { if (typeof Tip !== 'undefined') Tip.set(c, modTip(BY[c.dataset.mod])); });
  }
  const resetHud = () => { hudKey = ''; };

  // ---------------------------------------------------------------- drawing
  // Scorched Earth's patch on the floor (arena-view.js drawPuddles, tag 'scorch'): cooled stone, a red rim and a live red heat in it
  function puddle(ctx, p, r, k, t) {
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, 'rgba(255,112,52,0.60)'); g.addColorStop(0.6, 'rgba(176,36,20,0.55)'); g.addColorStop(1, 'rgba(70,10,8,0.62)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = i * Math.PI * 2 / 20, w = 1 + Math.sin(a * 3 + p.id) * 0.05 + Math.sin(a * 5 + t * 2) * 0.025;
      const x = p.x + Math.cos(a) * r * w, y = p.y + Math.sin(a) * r * w;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,59,47,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,150,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.62 + Math.sin(t * 3 + p.id) * 2, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const q = (t * 0.8 + i / 5 + p.id * 0.17) % 1, a = i * 2.3 + p.id;
      ctx.fillStyle = `rgba(255,${170 + i * 14},90,${0.75 * (1 - q)})`;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.55 - q * r * 0.5, 1.8 + (1 - q) * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // the flame on a boss's trophy in the Trophy Hall: bigger with the best heat cleared; from heat 10 it burns white-hot
  function flame(ctx, x, y, h, now, scale = 1) {
    if (!(h > 0)) return;
    const k = Math.min(1, h / 15), fh = (11 + 27 * k) * scale, fw = (4.5 + 8 * k) * scale, hot = h >= 10;
    const layers = hot ? [['rgba(255,150,60,0.9)', 1], ['rgba(255,232,170,0.95)', 0.74], ['rgba(244,250,255,0.98)', 0.46]]
      : [['rgba(210,52,22,0.9)', 1], ['rgba(255,142,40,0.95)', 0.72], ['rgba(255,226,120,0.95)', 0.42]];
    ctx.save(); ctx.translate(x, y);
    const gr = fh * 1.4, g = ctx.createRadialGradient(0, -fh * 0.4, 1, 0, -fh * 0.4, gr);
    g.addColorStop(0, hot ? 'rgba(200,225,255,0.34)' : 'rgba(255,150,60,0.30)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -fh * 0.4, gr, 0, Math.PI * 2); ctx.fill();
    layers.forEach(([col, s], i) => {
      const hh = fh * s, ww = fw * s, sway = Math.sin(now * 5.2 + i * 1.7 + x * 0.05) * ww * 0.25, flick = 1 + Math.sin(now * 9 + i * 2.3 + y * 0.07) * 0.06;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-ww, -hh * 0.2, -ww * 0.8, -hh * 0.65 * flick, sway, -hh * flick);
      ctx.bezierCurveTo(ww * 0.8, -hh * 0.65 * flick, ww, -hh * 0.2, 0, 0);
      ctx.fill();
    });
    if (h >= 5) for (let i = 0; i < 3 + (h >= 10 ? 3 : 0); i++) {
      const q = (now * 0.7 + i / 6 + x * 0.013) % 1;
      ctx.fillStyle = `rgba(${hot ? '225,238,255' : '255,200,110'},${0.8 * (1 - q)})`;
      ctx.beginPath(); ctx.arc(Math.sin(i * 2.7 + x) * fw * 1.1 + Math.sin(now * 3 + i) * 2, -fh * (0.4 + q * 0.9), 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  return { MODS, BY, T, SET_TITLES, clean, ids, heat, eligible, goldMult, enrage, quick, patches, pickOf, savePick, arm, armedFor, best, heatOf, record, setDone, bestLine, tag, statueTip,
    panelHtml, wirePanel, hud, resetHud, puddle, flame };
})();

if (typeof module !== 'undefined') module.exports = { HARDPLUS };
