// Buffs on the raid party frames: a hero's frame shows what that hero's own buff row shows (combat/hud.js), in the same
// order, with the same icons, timers, stacks and hover text. Each status has ONE source of truth, so nothing shows twice:
//
//   kit buffs (k.buffs: War Cry, procs, haste, a shield's mark...) and item-effect buffs (k.itemBuffs())
//        -> only the hero's own client (or the host, for a bot) can read them: it tells the others over a 'pbf' message
//   everything the host already tells every client about a hero (raid.party: HoTs, debuffs, Damage Down, Vulnerability, the
//        total mitigation %, Raise Sickness) and the party-wide lists (raid.pbuffs, raid.abuffs, gear bonds)
//        -> read by every client from that shared data, through hostRow() below. main.js feeds the same function to your own
//        row (Hud.extra), so your row and the frames cannot drift apart. (The total mitigation chip is the host's sum; the
//        kit buffs that give some of it are the individual sources: both show on the own row today, and the frames copy it.)
//   host-only chips with no row equivalent (Away, Raise?, the Hollow debt bar) stay in raid-ui.js.
//
// The order on a frame is the row's: kit buffs, then hostRow(), then item buffs. Your own frame reads your row directly (Hud.rowModel).
// 'pbf' = { t, id, b: [[buff id, seconds left (-1: no timer), stacks, flags (1 bad, 2 bond, 4 item effect), name (item effects only)], ...],
// tp?: { buff id: tooltip text } }. A message goes out only when the set of buffs or a stack count changes, or a timer is
// refreshed or cut (not as it ticks down: the frames count down on their own), at most every 0.4 s, plus a slow refresh
// (3 s; 9 s with nothing up) so a tab that came back catches up. The tooltip text rides along when a buff is first seen or its
// text changes, and with every 12th second's refresh; the host asks everyone to send it all again when someone rejoins or
// resyncs ('pbq', main.js). Purely cosmetic: nothing here is read by the fight.
// (main.js feeds the messages in and sends your own; raid-host.js sends the bots'; net.js relays and cleans them.)

const PartyBuffs = (() => {
  const SCAN = 0.2, GAP = 0.4, REFRESH = 3, REFRESH_IDLE = 9, FULL = 12, STALE = 16, MAXB = 24, MAXTIP = 360, JUMP = 1.2, TIMER_GAP = 1.5;
  const PBUFF_NAMES = { dmg: 'Party damage up', crit: 'Party crit up', haste: 'Party haste', rhaste: 'Insane Reaper' };
  const r1 = v => Math.max(0, Math.min(9999, Math.round(v * 10) / 10));
  const sigOf = e => e[0] + ':' + e[2] + ':' + e[3];
  const clean = s => String(s).replace(/[<>]/g, '').slice(0, MAXTIP);

  // Sender side. st is the caller's own state for one hero ({}), kit that hero's Kit, now a steady clock in seconds.
  // Returns the message's { b, tp? }, or null when there is nothing to say.
  function scan(kit, clsId, st, now) {
    if (!kit || !kit.buffs || typeof kitBuffName === 'undefined') return null;
    if (st.at != null && now - st.at < SCAN) return null;
    st.at = now;
    const kn = kit.now, b = [], bodies = {};
    for (const [id, x] of kit.buffs) {
      if (b.length >= MAXB) break;
      if (!kitBuffName(kit, clsId, id, x, kn)) continue;
      b.push([id, BUFF_UNTIMED.has(id) ? -1 : r1(x.end - kn), x.stacks || 1, BAD_BUFFS.has(id) ? 1 : 0]);
      bodies[id] = buffBody(clsId, id, kit, true, '');
    }
    for (const x of kit.itemBuffs()) {
      if (b.length >= MAXB) break;
      b.push([x.id, x.left == null ? -1 : r1(x.left), x.stacks || 1, (x.bad ? 1 : 0) | (x.bond ? 2 : 0) | 4, String(x.name || '').slice(0, 24)]);
      bodies[x.id] = x.tip ? tipAttr(x.tip) : '';
    }
    const first = st.sent == null, dt = first ? 0 : now - st.sent;
    // what the others still hold: a buff that simply ran out needs no message (their copy counts down to the same moment)
    let changed = first || !!st.full, timerOnly = false;
    if (!changed) {
      const was = (st.list || []).filter(e => e[1] < 0 || e[1] - dt > 0.3);
      if (was.length !== b.length) changed = true;
      else for (let i = 0; i < b.length && !changed; i++) if (sigOf(was[i]) !== sigOf(b[i])) changed = true;
      if (!changed) for (let i = 0; i < b.length; i++) if (b[i][1] >= 0 && was[i][1] >= 0 && Math.abs(b[i][1] - (was[i][1] - dt)) > JUMP) timerOnly = true;   // (a timer refreshed, extended or cut)
    }
    // a tooltip that changed with nothing else (a move renamed under it, e.g. Pyroblast as Phoenix Blast while the Ultimate is up) is a change too
    if (!changed && st.tips) for (const e of b) if (bodies[e[0]] && st.tips[e[0]] !== bodies[e[0]]) { changed = true; break; }
    const due = first || dt >= (b.length ? REFRESH : REFRESH_IDLE);
    if (!changed && !timerOnly && !due) return null;
    if (!first && !st.full && dt < (changed ? GAP : timerOnly ? TIMER_GAP : GAP)) return null;   // (changes within a moment of each other go out together on the next scan; a timer alone can wait a little longer)
    const full = first || !!st.full || now - (st.fullAt || 0) >= FULL;
    const tips = st.tips || (st.tips = {});
    let tp = null;
    for (const e of b) {
      const body = bodies[e[0]];
      if (body && (full || tips[e[0]] !== body)) (tp || (tp = {}))[e[0]] = clean(body);
      tips[e[0]] = body;
    }
    if (full) { st.fullAt = now; st.full = false; }
    st.sent = now; st.list = b;
    const m = { b };
    if (tp) m.tp = tp;
    return m;
  }

  // Receiver side. store is a Map on the raid (hero id -> that hero's last report), now the game clock.
  function recv(store, m, now) {
    if (!store || !m || !Number.isInteger(m.id) || !Array.isArray(m.b)) return;
    let e = store.get(m.id);
    if (!e) store.set(m.id, e = { tips: {}, list: [], at: now });
    e.at = now; e.list = [];
    for (const r of m.b) {
      if (!Array.isArray(r) || typeof r[0] !== 'string' || e.list.length >= MAXB) continue;
      const left = Number(r[1]), fl = r[3] | 0;
      e.list.push({ id: r[0], until: left >= 0 ? now + left : null, stacks: Math.max(1, r[2] | 0), bad: !!(fl & 1), bond: !!(fl & 2), item: !!(fl & 4), name: typeof r[4] === 'string' ? r[4] : '' });
    }
    if (m.tp && typeof m.tp === 'object') for (const k of Object.keys(m.tp).slice(0, MAXB)) if (typeof m.tp[k] === 'string') e.tips[k] = clean(m.tp[k]);
  }

  // The kit's part of a teammate's row, as pooled-row-shaped items: { kit: [...], item: [...] }.
  function view(store, id, clsId, now) {
    const out = { kit: [], item: [] }, e = store && store.get(id);
    if (!e || now - e.at > STALE) return out;
    for (const x of e.list) {
      if (x.until != null && x.until <= now) continue;
      const ow = typeof buffOwn === 'function' ? buffOwn(clsId, x.id) : null;
      const name = x.item ? x.name || x.id : ow ? ow.name : (typeof BUFF_NAMES !== 'undefined' && BUFF_NAMES[x.id]) || x.id;
      (x.item ? out.item : out.kit).push({ id: x.id, name, left: x.until == null ? undefined : x.until - now, stacks: x.stacks, bad: x.bad, bond: x.bond, label: '', img: '', body: e.tips[x.id] || '', own: !x.item });
    }
    return out;
  }

  // The host-fed part of any hero's row (see the top). c = { now, id (the hero), pbuffs, abuffs, s (their raid.party entry, or null), bond }.
  // Items: { id, name, left?, stacks, bad?, bond?, label?, img?, tip?, from? }; main.js hands the same list to your own row.
  function hostRow(c) {
    const out = [], now = c.now, seen = new Set();
    for (const b of c.pbuffs || []) if (b.end > now && !seen.has(b.kind)) { seen.add(b.kind); out.push({ id: 'p-' + b.kind, name: PBUFF_NAMES[b.kind] || b.kind, left: b.end - now, stacks: 1 }); }
    // a healer's buff on this one ally (engine.js ALLY_BUFFS), wearing the icon of the move that gave it
    for (const b of c.abuffs || []) {
      const d = ALLY_BUFFS[b.id];
      if (d && b.to === c.id && b.end > now) out.push({ id: 'a-' + b.id, name: d.name, left: b.end - now, stacks: 1, img: abilityIcon(d.cls, d.icon), tip: d.text, from: b.from });
    }
    const s = c.s;
    if (s) {
      if (s.dd) out.push({ id: 'dd', name: 'Damage Down', left: s.dd, stacks: 1, bad: true, tip: 'Dealing 10% less damage.' });
      if (s.vuln) out.push({ id: 'vuln', name: 'Vulnerability', label: `+${s.vuln}%`, stacks: 1, bad: true, tip: `Taking ${s.vuln}% more damage.` });
      if (s.alive && s.mit) out.push({ id: 'mit', name: 'Mitigation', label: `-${s.mit}%`, stacks: 1, tip: `Taking ${s.mit}% less damage.` });
      if (s.weak) { const [wp, ws] = Array.isArray(s.weak) ? s.weak : [0, 0]; out.push({ id: 'weak', name: 'Raise Sickness', left: ws || undefined, label: wp ? `-${wp}%` : '', stacks: 1, bad: true, tip: `Just raised: dealing and healing ${wp}% less.` }); }
      for (const [k, secs, n] of s.debuffs || []) { const d = STATUS_INFO[k]; out.push({ id: 'd-' + k, name: d ? d[0] : k, left: secs, stacks: n || 1, bad: true, tip: d ? d[1] : '' }); }
      for (const [hid, secs, from] of s.hots || []) { const h = HOT_ICON[hid]; if (h) out.push({ id: 'h-' + hid, name: h[2], left: secs, stacks: 1, img: abilityIcon(h[0], h[1]), tip: 'Healing over time.', from }); }
    }
    // gear party bonuses last the whole fight (no timer)
    for (const b of c.bond || []) out.push({ id: 'bond' + b.tier, name: b.name, label: `${b.n}/4`, stacks: 1, bond: true, tip: `${b.name}: ${b.n} in your group wear ${PARTY_BONUS[b.tier].boss} gear. Everyone gets ${b.text}.` });
    return out;
  }

  // One hero's whole row for their frame, in the row's order. Your own frame reads your row as it is drawn.
  function compose(raid, id, clsId, myId, now, p) {
    if (id === myId && typeof Hud !== 'undefined' && Hud.actor) return Hud.rowModel();
    const v = view(raid.pbf, id, clsId, now);
    const host = hostRow({ now, id, pbuffs: raid.pbuffs, abuffs: raid.abuffs, s: p, bond: raid.bond && raid.bond.active });
    for (const x of host) x.body = x.tip ? tipAttr(x.tip) : '';
    return v.kit.concat(host, v.item);
  }

  // The tooltip of an item from compose() (not your own: those read your kit, Hud._buffTip).
  const tipHtml = b => buffTipHtml(b.name, b.stacks, b.left, b.label, b.body);

  return { scan, recv, view, hostRow, compose, tipHtml, clean };
})();

if (typeof module !== 'undefined') module.exports = { PartyBuffs };
