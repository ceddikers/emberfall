// Contribution points: what each player did that their ROLE should be doing, on one 0-100 scale so roles compete fairly.
// A pure function of the fight's stats (fight.js stats[pid], the same on every client): no randomness, no clock.
//   score(stats, { time })       -> { [id]: { total, role, pts: { key: points }, pen: { avoid, deaths } } }
//   mvp(stats, scores)           -> the id with the most points (ties: fewer deaths, then more raises)
//   awards(stats, scores, opts)  -> [{ k, name, tip, who }] category awards, one winner each, only if earned
//   pack / unpack                -> the live meter's rows (raid-host 'mtr'), so the Score tab uses this same function
//   record(...)                  -> the compact entry the Logbook keeps
// Each role has a list of components (WEIGHTS: weights add to 100). A component fills 0..1 against what the fight asked for;
// one the whole party had no chance at (no deaths to raise, no tower to soak, a tank with no Brace) is left out and the rest
// rescale, so nobody is marked down for a mechanic that never came. Avoidable hits and deaths then take points off.

const Scoring = (() => {
  // the stats a live-meter row carries, in order after the id (damage, healing, taken stay first: the meter reads them by place)
  const KEYS = ['damage', 'healing', 'taken', 'overheal', 'mitigated', 'deaths', 'avoidable', 'aggro', 'up', 'soaked', 'raises', 'saves',
    'perfects', 'busters', 'ults', 'burst', 'wards', 'closer'];
  const pack = (id, st) => [id, ...KEYS.map(k => Math.round((st[k] || 0) * 10) / 10)];
  const unpack = (row, base) => { const st = Object.assign({}, base); KEYS.forEach((k, i) => { st[k] = row[i + 1] || 0; }); return st; };

  // points per component, by role (each role's add to 100)
  const WEIGHTS = {
    dps: { damage: 40, uptime: 20, ults: 10, burst: 10, soaked: 12, raises: 8 },
    healer: { healing: 30, overheal: 14, saves: 16, raises: 10, wards: 10, damage: 8, soaked: 12 },
    tank: { aggro: 22, mitigated: 22, perfects: 12, busters: 12, damage: 14, soaked: 12, raises: 6 },
  };
  const LABEL = { damage: 'Damage', uptime: 'Boss uptime', ults: 'Ultimates', burst: 'Burst windows', soaked: 'Mechanics', raises: 'Raises', healing: 'Healing',
    overheal: 'Efficiency', saves: 'Saves', wards: 'Shields & cuts', aggro: 'Aggro', mitigated: 'Mitigation', perfects: 'Perfect blocks', busters: 'Tankbusters' };
  // what takes points off, each with a cap so one bad stretch can't bury a whole fight
  const PENALTY = { avoid: { each: 2, cap: 18 }, deaths: { each: 7, cap: 21 } };
  // how much of a DPS's damage the other roles are expected to do
  const DMG_SHARE = { dps: 1, tank: 0.55, healer: 0.45 };
  // the dials: what a full bar of each component asks for
  const ASK = {
    dmgTop: 1.15,      // damage: this multiple of the average DPS (times the role's DMG_SHARE) fills it
    upTime: 0.9,       // uptime: this share of the fight with a blow on the boss
    ults: 200,         // Ultimates: one per this many seconds fills it (at least one)
    burst: 16,         // burst-window hits (only for a player whose Ultimate opens a window)
    raises: 2,         // raises given
    healShare: 1,      // healing: this share of the party's damage taken, split among the healers
    overheal: [0.4, 0.9],   // efficiency: effective / total healing, from empty to full
    saves: [2, 0.4],   // saves: at least this many, or this many per minute
    wards: [3, 1.5],   // shields and cuts on allies: the same
    mitigated: 0.45,   // mitigation: this share of the damage that came at the tank
    perfects: [3, 2],   // perfect blocks / reads: at least this many, or this many per minute
  };

  const clamp = x => (x > 1 ? 1 : x > 0 ? x : 0);
  const sum = (list, k) => list.reduce((n, s) => n + (s[k] || 0), 0);

  function score(stats, o = {}) {
    const ids = Object.keys(stats), all = ids.map(i => stats[i]);
    const time = Math.max(1, o.time || 1), mins = time / 60;
    const byRole = r => all.filter(s => s.role === r);
    const dpsList = byRole('dps'), healers = byRole('healer'), tanks = byRole('tank');
    const dpsAvg = (dpsList.length ? sum(dpsList, 'damage') / dpsList.length : sum(all, 'damage') / Math.max(1, all.length)) || 1;
    const n = Math.max(1, all.length);
    const tot = {};
    for (const k of KEYS) tot[k] = sum(all, k);
    const scores = {};
    for (const id of ids) {
      const s = stats[id], W = WEIGHTS[s.role] || WEIGHTS.dps;
      const roleSum = k => sum(byRole(s.role), k);
      const ratio = s.mitigated / Math.max(1, s.mitigated + s.taken);
      const eff = s.healing / Math.max(1, s.healing + s.overheal);
      // [fill 0..1, whether the fight offered it]
      const C = {
        damage: [clamp(s.damage / (dpsAvg * (DMG_SHARE[s.role] || 1)) / ASK.dmgTop), true],
        uptime: [clamp(s.up / time / ASK.upTime), true],
        ults: [clamp(s.ults / Math.max(1, time / ASK.ults)), tot.ults > 0],
        burst: [clamp(s.burst / ASK.burst), s.burst > s.ults * 1.5],
        soaked: [clamp(s.soaked / Math.max(1, tot.soaked / n)), tot.soaked > 0],
        raises: [clamp(s.raises / ASK.raises), tot.deaths > 0],
        healing: [clamp(s.healing / Math.max(1, tot.taken * ASK.healShare / Math.max(1, healers.length))), tot.taken > 0],
        overheal: [clamp((eff - ASK.overheal[0]) / (ASK.overheal[1] - ASK.overheal[0])), s.healing + s.overheal > 0],
        saves: [clamp(s.saves / Math.max(ASK.saves[0], mins * ASK.saves[1])), tot.saves > 0],
        wards: [clamp(s.wards / Math.max(ASK.wards[0], mins * ASK.wards[1])), roleSum('wards') > 0],
        aggro: [clamp(s.aggro / Math.max(1, tot.aggro / Math.max(1, tanks.length))), tot.aggro > 0],
        mitigated: [clamp(ratio / ASK.mitigated), s.mitigated + s.taken > 0],
        perfects: [clamp(s.perfects / Math.max(ASK.perfects[0], mins * ASK.perfects[1])), roleSum('perfects') > 0],
        busters: [clamp(s.busters / Math.max(1, tot.busters)), tot.busters > 0],
      };
      let live = 0;
      for (const k in W) if (C[k][1]) live += W[k];
      const pts = {};
      let raw = 0;
      for (const k in W) if (C[k][1] && live > 0) { pts[k] = C[k][0] * W[k] / live * 100; raw += pts[k]; }
      const pen = { avoid: Math.min(PENALTY.avoid.cap, (s.avoidable || 0) * PENALTY.avoid.each), deaths: Math.min(PENALTY.deaths.cap, (s.deaths || 0) * PENALTY.deaths.each) };
      scores[id] = { role: s.role, total: Math.round(Math.max(0, Math.min(100, raw - pen.avoid - pen.deaths))), pts, pen };
    }
    return scores;
  }

  // the best score; ties go to fewer deaths, then more raises, then the lower id
  function mvp(stats, scores) {
    const ids = Object.keys(scores).sort((a, b) => scores[b].total - scores[a].total || stats[a].deaths - stats[b].deaths || stats[b].raises - stats[a].raises || a - b);
    return ids.length ? Number(ids[0]) : null;
  }

  const AWARD_MIN = 30;   // nobody who contributed less than this is praised for a category

  // Category awards: one winner each, only when earned, and only for what went well. Wipes keep the ones about what was done
  // (no Spotless, no Closer). o: { clear, time }
  function awards(stats, scores, o = {}) {
    const ids = Object.keys(stats), out = [];
    const best = (pool, key, min) => {
      const c = pool.filter(i => scores[i].total >= AWARD_MIN && (stats[i][key] || 0) >= min).sort((a, b) => (stats[b][key] || 0) - (stats[a][key] || 0) || scores[b].total - scores[a].total || a - b);
      return c.length ? Number(c[0]) : null;
    };
    const add = (k, name, tip, who) => { if (who != null) out.push({ k, name, tip, who }); };
    add('heavy', 'Heavy Hitter', 'The most damage dealt.', best(ids, 'damage', 1));
    if (o.clear) add('closer', 'Closer', 'The most damage in the boss\'s last fifth.', best(ids, 'closer', 1));
    add('ironwall', 'Iron Wall', 'The most damage mitigated.', best(ids.filter(i => stats[i].role === 'tank'), 'mitigated', 1));
    add('lifeline', 'Lifeline', 'The most allies pulled back from the brink.', best(ids, 'saves', 2));
    add('secondwind', 'Second Wind', 'The most fallen allies raised.', best(ids, 'raises', 1));
    add('surefooted', 'Sure Footed', 'The most towers and stacks soaked.', best(ids, 'soaked', 2));
    if (o.clear && (o.time || 0) >= 60) {
      const clean = ids.filter(i => !stats[i].deaths && !stats[i].avoidable);
      if (clean.length && (clean.length < ids.length || ids.length === 1)) add('spotless', 'Spotless', 'No avoidable hits and no deaths.', best(clean, 'damage', 0));
    }
    return out;
  }

  // the Logbook's compact entry: players as [name, class, role, total, points by component (whole numbers), avoidable, deaths]
  function record(stats, scores, o = {}) {
    const ids = Object.keys(stats).sort((a, b) => scores[b].total - scores[a].total || a - b);
    const m = o.clear ? mvp(stats, scores) : null;
    return {
      b: o.boss, m: o.mode, c: o.clear ? 1 : 0, t: Math.round(o.time || 0), at: o.at || 0,
      p: ids.map(i => { const s = stats[i], sc = scores[i], pts = {}; for (const k in sc.pts) pts[k] = Math.round(sc.pts[k]); return [s.name, s.cls, s.role, sc.total, pts, s.avoidable | 0, s.deaths | 0]; }),
      mvp: m == null ? -1 : ids.indexOf(String(m)),
      aw: (o.awards || []).map(a => [a.k, ids.indexOf(String(a.who))]),
    };
  }

  return { KEYS, WEIGHTS, LABEL, PENALTY, ASK, DMG_SHARE, AWARD_MIN, pack, unpack, score, mvp, awards, record };
})();

if (typeof module !== 'undefined') module.exports = { Scoring };
