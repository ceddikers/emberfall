// The Founding: item passives, host side (pass 3). Every item in data.js carries a passive key (`ip`); this module reads which keys a
// hero wears (recalc puts them in the stat sheet as s.ip) and runs each one through the hooks: stats that depend on the moment
// (night, a lit post, a load, the fountain) through recalc, behaviour through hit / hurt / kill / tick and by wrapping the sim's own
// release (a skill goes off), perfectBlock and pyroRoll. Per-hero memory lives on h._ip. No visuals of its own: it uses the core's
// numbers, shields and burns, and the 'im' impact ring for the Phoenix Ash burst. One of an item's passive counts however many are worn.
(function () {
  const FS = typeof FoundingSim !== 'undefined' ? FoundingSim : require('./sim.js').FoundingSim;
  const D = typeof FOUNDING_DATA !== 'undefined' ? FOUNDING_DATA : require('./data.js').FOUNDING_DATA;
  const M = typeof FoundingMap !== 'undefined' ? FoundingMap : require('./map-data.js').FoundingMap;
  const hyp = Math.hypot;

  // the passive keys this module implements, with a line each (tools/founding-items-test.js checks data.js against this list)
  FS.itemPassives = {
    owl: 'night: +14% damage', flint: 'every 4th basic attack +50%', ward: 'casting shields 14 for 3 s', porter: 'carrying: 15% less damage, +12% speed',
    cup: 'after the fountain +20% speed for 8 s', scav: 'kills pay +2 gold', lampdmg: 'in a lit post\'s light +12% damage',
    ram: 'Shield Bash stuns the enemies beside the target', petal: 'petals regrow twice as fast', coal: 'basic-attack crit chance 40% to 55%',
    hound: 'marked enemies take +20%; killing one takes 3 s off Hunter\'s Mark', thorn: 'a third of damage taken is dealt back', grudge: 'a blow of a fifth of your health: rage 6 s',
    spark: 'casting: next basic attack +80%', lantern: 'you and allies near mend 2/s', sigil: 'Perfect Block stuns near enemies and shields you',
    censer: 'Mend shields its target', mitt: 'Hot Streak fireball costs no cooldown', third: 'every 3rd basic attack sends a second shot',
    tally: 'kills stack +2% damage (ten), clear after 8 quiet seconds', standard: 'you and allies near +8% damage', brink: 'a blow under a quarter health is halved (30 s)',
    moon: 'night: +20% damage, +15% attack speed', unbowed: 'under a third health: 25% less damage', oath: 'Perfect Block takes 6 s off The Wall',
    chalice: 'Mend heals the weakest other ally for half', phoenix: 'a felling blow leaves a third health and bursts (2 min)', pack: 'Hunter\'s Mark spreads around the target',
    crown: 'the ultimate casts again 3 s later at half strength',
  };

  (FS.mods = FS.mods || []).push(sim => {
    const spring = M.P.spring, fountR = D.TUNE.fountainR;
    const st = h => h._ip || (h._ip = { n4: 0, n3: 0, spark: 0, brink: 0, ash: 0, cup: 0, tally: 0, lastKill: -99, sig: '', lantT: 0 });
    const ipOf = h => (h && h.S && h.S.ip) || null;
    const isAuto = o => !!(o && o.kb && o.pw === undefined && !o.aoe && !o.quiet);   // the core's basic attacks: knockback, no power factor, not a blast
    const inFount = h => hyp(h.x - spring[0], h.y - spring[1]) < fountR;
    // the conditions that change a hero's stat sheet from moment to moment; a change of signature triggers a recalc
    function cond(h, ip) {
      const s = st(h);
      const night = !!((ip.owl || ip.moon) && sim.night > 0.5);
      const lit = !!(ip.lampdmg && sim.inPostLight(h.x, h.y));
      const load = !!(ip.porter && h.carry);
      const cup = !!(ip.cup && s.cup > sim.time);
      const tally = ip.tally ? s.tally : 0;
      return { night, lit, load, cup, tally, sig: (night ? 'n' : '') + (lit ? 'l' : '') + (load ? 'c' : '') + (cup ? 'u' : '') + tally };
    }
    const wrap = (name, fn) => { const orig = sim[name].bind(sim); sim[name] = (...a) => fn(orig, ...a); };

    // a skill goes off (pw 1 is the cast itself; the echo and Crown of Echoes recasts come in as other powers)
    wrap('release', (orig, h, s, a, pw) => {
      orig(h, s, a, pw);
      const ip = ipOf(h); if (!ip || pw !== 1 || h.dead) return;
      const me = st(h);
      if (ip.ward) { h.shield = Math.max(h.shield, 14); h.shieldT = Math.max(h.shieldT, 3); h.dirty = true; }
      if (ip.spark) me.spark = sim.time + 10;
      if (h.hero === 'bastion' && s === 'q' && a.e && ip.ram) for (const n of sim.inCircle(a.e.x, a.e.y, 95)) if (n !== a.e) sim.stunE(n, 0.8, h);
      if (h.hero === 'cleric' && s === 'q') {
        if (ip.censer && a.u) { a.u.shield = Math.max(a.u.shield, 30); a.u.shieldT = Math.max(a.u.shieldT, 5); a.u.dirty = true; }
        if (ip.chalice) {
          let low = null, lf = 2; for (const u of sim.heroes) if (!u.dead && u !== a.u && u !== h && hyp(u.x - h.x, u.y - h.y) < 320 && u.hp / u.max < lf) { lf = u.hp / u.max; low = u; }
          if (low && lf < 1) sim.heal(low, D.rk(h.K.skills.q.heal, h.ranks[0]) * 0.5, h);
        }
      }
      if (h.hero === 'pyromancer' && s === 'q' && ip.mitt && a.hot) { h.ch[0] = h.chMax[0]; h.cdT[0] = 0; h.dirty = true; }
      if (h.hero === 'ranger' && s === 'e' && ip.pack && a.e && a.e.mark) for (const n of sim.inCircle(a.e.x, a.e.y, 190)) if (n !== a.e && !n.mark) n.mark = { m: a.e.mark.m, t: a.e.mark.t, src: h, slow: a.e.mark.slow };
      if (s === 'r' && ip.crown) sim.after(3, () => { if (!h.dead && sim.st === 'live') orig(h, 'r', a, 0.5); });
    });
    // a Perfect Block lands
    wrap('perfectBlock', (orig, h, src) => {
      orig(h, src);
      const ip = ipOf(h); if (!ip) return;
      if (ip.sigil) { for (const n of sim.inCircle(h.x, h.y, 150)) sim.stunE(n, 1.2, h); h.shield = Math.max(h.shield, 30); h.shieldT = Math.max(h.shieldT, 4); h.dirty = true; }
      if (ip.oath && h.ch[3] < h.chMax[3]) { h.cdT[3] = Math.max(0.05, h.cdT[3] - 6); h.dirty = true; }
    });
    // the Pyromancer's crit roll (Hot Streak): the Coal Pouch lifts the chance
    wrap('pyroRoll', (orig, h) => {
      const ip = ipOf(h); if (!ip || !ip.coal) return orig(h);
      const crit = sim.rand() < Math.max(0.55, sim.critChance(h));
      sim.streak(h, crit);
      return crit;
    });

    return {
      // stats that depend on the moment, and the passive set the hero wears
      recalc(h, s) {
        const ip = {}; for (const x of h.items) if (x) { const k = D.ITEM[x.id] && D.ITEM[x.id].ip; if (k) ip[k] = 1; }
        const me = st(h); if (!Object.keys(ip).length) { s.ip = null; me.sig = ''; return; }
        s.ip = ip;
        const c = cond(h, ip); me.sig = c.sig;
        if (ip.owl && c.night) s.dmg += 0.14;
        if (ip.moon && c.night) { s.dmg += 0.20; s.as += 0.15; }
        if (ip.lampdmg && c.lit) s.dmg += 0.12;
        if (ip.porter && c.load) { s.armor += 0.15; s.ms += 0.12; }
        if (ip.cup && c.cup) s.ms += 0.20;
        if (ip.tally && c.tally) s.dmg += 0.02 * c.tally;
      },
      tick(dt) {
        for (const h of sim.heroes) {
          const ip = ipOf(h); if (!ip) continue;
          if (h.dead) continue;
          const me = st(h);
          if (ip.cup && h.drinkT >= 1.5 && inFount(h)) me.cup = sim.time + 8;
          if (ip.tally && me.tally && sim.time - me.lastKill > 8) me.tally = 0;
          if (ip.petal && h.hero === 'cleric' && h.st.petals < 3) h.st.pt += dt * (inFount(h) ? 4 : 1);
          if (ip.lantern) {
            me.lantT += dt;
            if (me.lantT >= 0.5) { me.lantT -= 0.5; for (const u of sim.heroes) if (!u.dead && u.hp < u.max && hyp(u.x - h.x, u.y - h.y) < 280) sim.heal(u, 1, { healMul: 1 }, true); }
          }
          if (cond(h, ip).sig !== me.sig) sim.recalc(h);
        }
      },
      // damage dealt by a hero
      hit(a, e, h, o) {
        if (!h || h.tk !== 'hero' || !h.S) return;
        let m = 1; const ip = h.S.ip;
        if (ip) {
          const me = st(h);
          if (ip.hound && e.mark && e.mark.src === h) m *= 1.2;
          if (isAuto(o)) {
            if (ip.flint && ++me.n4 % 4 === 0) m *= 1.5;
            if (ip.spark && me.spark > sim.time) { me.spark = 0; m *= 1.8; }
            if (ip.third && ++me.n3 % 3 === 0) { const n = sim.nearestEnemy(e.x, e.y, 210, e); if (n) sim.dmgE(n, h.K.aaDmg * 0.6, h, { aoe: 1 }); }
          }
        }
        for (const u of sim.heroes) if (!u.dead && u.S && u.S.ip && u.S.ip.standard && hyp(u.x - h.x, u.y - h.y) < 320) { m *= 1.08; break; }
        return m !== 1 ? a * m : undefined;
      },
      // damage taken by a hero
      hurt(a, h, src) {
        const ip = ipOf(h); if (!ip) return;
        const me = st(h); let out = a;
        if (ip.unbowed && h.hp < h.max / 3) out *= 0.75;
        if (ip.brink && sim.time >= me.brink && h.hp - out < h.max * 0.25) { out *= 0.5; me.brink = sim.time + 30; }
        if (ip.phoenix && sim.time >= me.ash && out >= h.hp + h.shield) {
          me.ash = sim.time + 120; out = 1; h.hp = Math.max(h.hp, h.max / 3 + 1); h.invul = Math.max(h.invul, 1.2); h.dirty = true;
          for (const n of sim.inCircle(h.x, h.y, 200)) sim.dmgE(n, 60, h, { kb: 40, aoe: 1, fire: 1 });
          sim.impact(h, 1, h.x, h.y, 200);
        }
        if (ip.grudge && out >= h.max * 0.2) { h.rage = Math.max(h.rage, 6); h.dirty = true; }
        if (ip.thorn && src && src.tk === 'enemy' && !src.dead) sim.dmgE(src, out * 0.33 / (h.dmgMul || 1), h, { quiet: 1, aoe: 1 });
        return out !== a ? Math.round(out) : undefined;
      },
      kill(e, k) {
        const ip = ipOf(k); if (!ip) return;
        const me = st(k);
        if (ip.scav && sim.stats[k.id]) { k.gold += 2; sim.stats[k.id].gold += 2; k.dirty = true; }
        if (ip.tally) { me.tally = Math.min(10, me.tally + 1); me.lastKill = sim.time; }
        if (ip.hound && e.mark && e.mark.src === k && k.ch[2] < k.chMax[2]) k.cdT[2] = Math.max(0.05, k.cdT[2] - 3);
      },
    };
  });
})();
