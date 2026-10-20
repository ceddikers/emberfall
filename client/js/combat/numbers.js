// Exact numbers in move text. A description writes a hit's potency as a token and the tooltip shows what that hit
// does for your hero right now (your gear's power, your class's and spec's damage scale), before the boss, buffs,
// vulnerability, crits and the ±5% roll:
//   {d:220}  a hit of potency 220      {h:180}  a heal of potency 180      {s:300}  a shield of potency 300
//   {b:8500} a boss hit, its raw value from the boss's dmg table ({b:7500/6500}: Normal / Hard raw values when they
//            differ). Shown for a party of four: raw × NUM_SCALE, and × 1.25 on Hard (fight.js damagePlayer).
// The engine's own sums (engine.js damage / healAmount / shield): potency × POT_SCALE × potMult (hits) × (1 + power).
// Main sets the hero the numbers are for (setContext); a page about another hero passes its own { cls, spec }.

const Num = (() => {
  let ctx = () => ({ cls: null, spec: null });
  const TOKEN = /\{([dhs]):(\d+(?:\.\d+)?)\}/g, BOSS = /\{b:(\d+)(?:\/(\d+))?\}/g;
  const NUM_SCALE = 0.05, HARD = 1.25;   // (fight.js FIGHT.NUM_SCALE, and Hard's extra in damagePlayer)
  const bossNums = (n, h) => [Math.round(n * NUM_SCALE), Math.round((h != null ? h : n) * NUM_SCALE * HARD)];

  function value(kind, pot, o) {
    const c = o || ctx() || {};
    const kit = c.cls && typeof kitFor === 'function' ? kitFor(c.cls, c.spec || null) : null;
    const power = c.cls && typeof Inventory !== 'undefined' && Inventory.mods ? (Inventory.mods(c.cls).power || 0) : 0;
    const mult = kind === 'd' ? ((kit && kit.potMult) || 1) : 1;
    return Math.max(1, Math.round(pot * ENGINE.POT_SCALE * mult * (1 + power)));
  }
  const fmt = n => n.toLocaleString('en-US');
  // tooltips and pages (HTML): the number in bold, coloured by what it is
  function fill(text, o) {
    if (typeof text !== 'string' || text.indexOf('{') < 0) return text;
    return text.replace(TOKEN, (m, k, p) => `<b class="num num-${k}">${fmt(value(k, +p, o))}</b>`)
      .replace(BOSS, (m, n, h) => { const [a, b] = bossNums(+n, h != null ? +h : null); return `<b class="num num-b">${fmt(a)}</b> <small class="num-hard">(Hard ${fmt(b)})</small>`; });
  }
  // plain text (anything escaped, or read by code)
  function plain(text, o) {
    if (typeof text !== 'string' || text.indexOf('{') < 0) return text;
    return text.replace(TOKEN, (m, k, p) => fmt(value(k, +p, o)))
      .replace(BOSS, (m, n, h) => { const [a, b] = bossNums(+n, h != null ? +h : null); return `${fmt(a)} (Hard ${fmt(b)})`; });
  }
  return { setContext(fn) { ctx = fn; }, value, bossNums, fill, plain, TOKEN, BOSS };
})();

if (typeof module !== 'undefined') module.exports = { Num };
