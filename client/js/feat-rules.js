// Feat rules: what a finished fight (or bout) says about the player, as a list of marks the Feats read (pastimes.js).
// Pure functions of what the host sent every client (the fight's stats, the roster, the result), so each player earns
// their own feats on their own tab, joined players included. Nothing here touches the save or the page.
//   FeatRules.clear(d, env)  -> mark keys for a boss clear. d: { boss, mode, secs, deaths, avoidable, stats, myId, alive }.
//                               env: { set (the boss's set), wipes (wipes on this boss since its last clear), score (Scoring) }
//   FeatRules.pvp(d)         -> mark keys for a finished bout. d: { won, draw, mode, stats, teams, myTeam, myId }
//   FeatRules.party(stats)   -> [{ id, role, cls, bot, deaths, avoidable, raises }]
// A mark is a plain string; the feats in feats-data.js name the ones they want ({ type: 'mark', k }).

const FeatRules = (() => {
  const N = x => (x | 0);
  function party(stats) {
    return Object.entries(stats || {}).map(([id, s]) => ({ id: Number(id), role: s.role, cls: s.cls, bot: !!s.bot, deaths: N(s.deaths), avoidable: N(s.avoidable), raises: N(s.raises) }));
  }
  const count = (list, role) => list.filter(p => p.role === role).length;

  function clear(d, env = {}) {
    const marks = [], list = party(d.stats), me = list.find(p => p.id === d.myId), n = list.length;
    const hard = d.mode === 'hard';
    marks.push(`clear:${d.boss}:${hard ? 'hard' : 'normal'}`);
    // the party that stood there (bots count: a party is who was in the fight)
    const healers = count(list, 'healer'), tanks = count(list, 'tank'), dps = count(list, 'dps');
    if (healers === 2) marks.push('comp:twoHealers');
    if (tanks === 2) marks.push('comp:twoTanks');
    if (n >= 3 && healers === 0 && env.set === 1 && !hard) marks.push('comp:noHealer');
    if (n >= 3 && dps === n) marks.push('comp:allDps');
    if (n === 1) { marks.push('comp:solo'); if (hard) marks.push('comp:soloHard'); }
    if (n === 4 && list.every(p => !p.bot)) marks.push('comp:fullTable');
    // the whole party's record
    const avoid = list.reduce((a, p) => a + p.avoidable, 0), deaths = list.reduce((a, p) => a + p.deaths, 0);
    if (hard && !avoid && !deaths) marks.push('party:spotlessHard');
    if (!me) return marks;   // (not in the tally: nothing personal to read)
    // what this player did
    if (!me.avoidable) marks.push('me:spotless');
    if (hard) { marks.push(`hardcls:${me.cls}`); marks.push(`hardrole:${me.role}`); }
    const alive = Array.isArray(d.alive) ? d.alive : null;
    if (n >= 2 && alive && alive.length === 1 && alive[0] === d.myId) marks.push('me:lastEmber');
    if ((env.wipes | 0) >= 5) marks.push('me:comeback');
    if (env.score && n >= 2) {
      try { const sc = env.score.score(d.stats, { time: d.secs }); if (env.score.mvp(d.stats, sc) === d.myId) marks.push('me:mvp'); } catch (e) { /* no scoring: no mark */ }
    }
    return marks;
  }

  function pvp(d) {
    const marks = [], list = party(d.stats), me = list.find(p => p.id === d.myId);
    if (!me || d.draw || !d.won) return marks;
    marks.push(`pvp:win:${d.mode}`);
    const foes = list.filter(p => d.teams[p.id] !== d.myTeam);
    if (foes.some(p => !p.bot)) marks.push('pvp:win:human');
    return marks;
  }

  return { party, clear, pvp };
})();

if (typeof module !== 'undefined') module.exports = { FeatRules };
