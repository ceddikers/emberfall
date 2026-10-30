// Party cooldowns on the raid party frames: the few moves of a teammate that help the whole party (cutting the
// party's damage, shielding or healing it, hastening it, raising the fallen), shown as small icons that dim while they
// recover. Each hero's own client reads its kit and tells the others, and the host does the same for its bots, through
// the existing 'kfx' relay (k 'pcd', d.c = [slot, seconds left, full length, ...], at most two moves). A message goes
// out only when a cooldown starts, is cut or is refunded (not as it ticks down), and every 15 s as a refresh so a
// tab that joined late or came back catches up. Purely cosmetic: nothing here is read by the fight.
// (raid-ui.js draws the icons; main.js feeds the messages in and sends your own; raid-host.js sends the bots'.)

// id: the move's id in the kit ('~raise' = the healer's raise lockout kept in the kit as g.raiseAt), cd: its usual
// length (the fallback when the kit does not say), raise: draws the raise mark instead of the move's icon.
// Kept short on purpose: only moves that help the whole party, at most two a hero, and none for a move that is
// mostly the hero's own (a personal defence, a short-cooldown heal).
const PARTY_CD = (() => {
  const mv = (id, name, what, cd) => ({ id, name, what, cd });
  const raise = (id, cd) => ({ id, name: 'Raise', what: 'Brings a fallen ally back to their feet.', cd, raise: 1 });
  const cut = (id, name, cd) => mv(id, name, 'The party takes less damage.', cd);
  return {
    // tanks
    bastion: [cut('banner', 'Rally Banner', 90)],
    bloodreaver: [mv('warcry', 'War Cry', 'Shields the party, and it takes less damage.', 90)],
    runeguard: [cut('sanctum', 'Sanctum', 90)],
    gorgemaw: [mv('bottomless', 'Bottomless', 'The party takes half from raidwide attacks.', 90)],
    ironpalm: [cut('bell', 'Temple Bell', 60)],
    gloomsworn: [cut('pall', 'Black Pall', 60)],
    // damage
    ranger: [mv('mark', "Hunter's Mark", 'The boss takes more damage from everyone.', 60), cut('cloak', "Hunter's Cloak", 90)],
    shadowblade: [cut('smoke', 'Smoke Bomb', 90)],
    pyromancer: [cut('smolder', 'Smolder', 90)],
    thresher: [mv('frenzy', 'Insane Reaper', 'The whole party acts faster.', 60)],
    // healers
    cleric: [mv('prayer', 'Prayer Circle', 'The party takes less damage and heals over time.', 60), raise('~raise', 30)],
    grovekeeper: [mv('growth', 'Wild Growth', 'Heals the whole party over time.', 60), raise('rebirth', 30)],
    chronomancer: [mv('accel', 'Accelerando', 'The whole party attacks faster.', 60), raise('recall', 30)],
    threadweaver: [mv('tapestry', 'Tapestry', 'Damage to one of the party is split among them all.', 120), raise('~raise', 30)],
    tidecaller: [cut('breakwater', 'Breakwater', 45), raise('~raise', 30)],
    lanternkeeper: [raise('~raise', 30)],
    alembist: [raise('~raise', 15)],
  };
})();

const PartyCd = (() => {
  const SCAN = 0.2, REFRESH = 15, MOVED = 1.2;

  // Sender side. st is the caller's own state for one hero ({}), kit that hero's Kit, now a steady clock in seconds
  // (not the kit's: that one only runs in a fight). Returns the message's d.c, or null when nothing changed.
  function scan(kit, cls, st, now) {
    const list = PARTY_CD[cls];
    if (!list || !kit || !kit.abilities) return null;
    if (st.at != null && now - st.at < SCAN) return null;
    st.at = now;
    const kn = kit.now, cur = [], c = [];
    let changed = !st.ready || now - st.sent >= REFRESH;
    const base = kit.baseAbilities || kit.abilities;
    list.forEach((d, i) => {
      let left, total = d.cd;
      if (d.id === '~raise') left = Math.max(0, ((kit.g && kit.g.raiseAt) || 0) - kn);
      else {
        const ab = base.find(a => a.id === d.id || a.replaces === d.id) || kit.abilities.find(a => a.id === d.id || a.replaces === d.id);
        if (!ab) left = -1;
        else {
          left = kit.cdRemaining(ab);
          const r = kit.recast(ab);
          if (r > 0) total = r;
        }
      }
      if (!Number.isFinite(left)) left = -1;
      cur[i] = left < 0 ? -1 : left > 0 ? kn + left : 0;   // (0: ready, whatever the time)
      let was = st.ready ? st.ready[i] : undefined;
      if (was > 0 && was <= kn + 0.05) was = 0;   // (it ran out by itself: nothing to tell)
      if (was === undefined || (was < 0) !== (cur[i] < 0) || (cur[i] >= 0 && Math.abs(cur[i] - was) > MOVED)) changed = true;
      c.push(i, left < 0 ? -1 : Math.min(999, Math.round(left)), Math.min(999, Math.round(total)));
    });
    if (!changed) return null;
    st.ready = cur; st.sent = now;
    return c.slice(0, 8);
  }

  // Receiver side. store is a Map on the raid (id -> { slot: { until, total } | null }), now the game clock.
  function recv(store, id, c, now) {
    if (!store || !Number.isInteger(id) || !Array.isArray(c)) return;
    let e = store.get(id);
    if (!e) store.set(id, e = {});
    for (let j = 0; j + 2 < c.length; j += 3) {
      const i = c[j], left = c[j + 1], total = c[j + 2];
      if (!Number.isInteger(i) || i < 0 || i > 3 || !Number.isFinite(left) || !Number.isFinite(total)) continue;
      e[i] = left < 0 ? null : { until: now + left, total: Math.max(1, total) };
    }
  }

  // What a frame shows for slot i of hero id: { left, total } in seconds, or null (not reported yet, or the hero has no such move).
  function view(store, id, i, now) {
    const o = store && store.get(id), v = o && o[i];
    return v ? { left: Math.max(0, v.until - now), total: v.total } : null;
  }

  return { scan, recv, view };
})();

if (typeof module !== 'undefined') module.exports = { PartyCd, PARTY_CD };
