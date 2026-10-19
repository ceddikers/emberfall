// One command that says whether the game is still healthy: `npm run check` (or `node tools/check.js`).
// It parses every script, checks the data and the shared math, compares class balance with the recorded baseline,
// and has a bot party clear every built boss on Normal. Exit code 0 means everything passed.
//   node tools/check.js --update-baseline   (after an intended balance change: record the new numbers)
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(__dirname, 'check-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');
const DPS_TOLERANCE = 0.08;   // a class's pro DPS may drift this far from the baseline before it counts as a change
const SPEC_TOLERANCE = 0.05;  // a specialization's pro DPS may differ this much from its own base class
const RAID_RUNS = 2;
const TALENT_MAX = 7;    // one talent may add at most this much pro DPS (%) to its class or spec (tools/talents.js)
const BUILD_MAX = 18;    // ... and the strongest pick of every row together at most this much
// bot raids: every boss, and every spec somewhere, with a fixed line-up so the result doesn't depend on a random spec
const RAIDS = [   // [boss name, boss id, tank, healer, two DPS]
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:aegis', 'ranger:sharpshooter', 'pyromancer:cataclysm'],
  ['Skitterra', 'skitterra', 'runeguard:runeblade', 'grovekeeper:moonwell', 'shadowblade:bladedancer', 'pyromancer:sigilmancer'],
  ['Volkar', 'volkar', 'bloodreaver:berserker', 'chronomancer:accelerant', 'ranger:venomstrike', 'pyromancer:base'],
  ['Volkar', 'volkar', 'bloodreaver:hemomancer', 'cleric:inquisitor', 'shadowblade:nightstalker', 'pyromancer:sigilmancer'],
  ['the Hollow King', 'hollowking', 'bastion:sentinel', 'grovekeeper:lifebinder', 'ranger:base', 'pyromancer:cataclysm'],
  ['the Hollow King', 'hollowking', 'bastion:crusader', 'chronomancer:echoist', 'shadowblade:base', 'ranger:sharpshooter'],
  ['the Hollow King', 'hollowking', 'runeguard:spellwarden', 'cleric:base', 'ranger:venomstrike', 'shadowblade:nightstalker'],
  // the advanced classes (classes-a): each spec somewhere
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:base', 'thermist:base', 'driftblade:base'],
  ['Skitterra', 'skitterra', 'bloodreaver:base', 'grovekeeper:base', 'thermist:pendulum', 'driftblade:orbit'],
  ['Volkar', 'volkar', 'bastion:base', 'chronomancer:accelerant', 'thermist:zenith', 'driftblade:comet'],
  ['the Hollow King', 'hollowking', 'runeguard:base', 'cleric:aegis', 'thermist:base', 'driftblade:base'],
];

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

// ---------------------------------------------------------------- 1. every script parses
function syntax() {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js')) files.push(p); } };
  walk(path.join(ROOT, 'client', 'js')); walk(path.join(ROOT, 'tools')); walk(path.join(ROOT, 'server'));
  const bad = [];
  for (const f of files) { const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); if (r.status !== 0) bad.push(`${path.relative(ROOT, f)}: ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || 'parse error'}`); }
  if (bad.length) fail('Scripts parse', bad.join('\n'));
  else pass('Scripts parse', `${files.length} files`);
}

// ---------------------------------------------------------------- 2. data and shared math
function data() {
  const load = p => require(path.join(ROOT, 'client/js', p));
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'), load('combat/talents.js'), load('items.js'), load('interp.js'));
  global.TAU = Math.PI * 2;

  // every class has a kit, gear for each tier and enhancements that point at real abilities
  const probs = [];
  for (const c of CLASSES) {
    const kit = KITS[c.id];
    if (!kit) { probs.push(`${c.id}: no kit`); continue; }
    if (kit.abilities.length !== 6) probs.push(`${c.id}: ${kit.abilities.length} abilities (want 6)`);
    for (const key of [`${c.id}_w0`, `${c.id}_w1`, `${c.id}_w2`, `${c.id}_w3`, `${c.id}_a1`, `${c.id}_a2`, `${c.id}_a3`]) if (!ITEMS[key]) probs.push(`missing item ${key}`);
  }
  for (const [key, p] of Object.entries(ITEM_PERKS)) {
    const it = ITEMS[key];
    if (!it) { probs.push(`enhancement on unknown item ${key}`); continue; }
    if (!KITS[it.cls].abilities.some(a => a.id === p.ab)) probs.push(`${key} enhances unknown ability ${p.ab}`);
  }
  if (probs.length) fail('Classes, items and enhancements line up', probs.join('\n')); else pass('Classes, items and enhancements line up', `${CLASSES.length} classes, ${Object.keys(ITEMS).length} items, ${Object.keys(ITEM_PERKS).length} enhancements`);

  items();
  saveUpgrade();
  talents();

  // party bonuses: nothing for one person, the right totals for groups, junk from clients cleaned out
  const b1 = partyBonus({ 1: 1 }), b4 = partyBonus({ 1: 4, 2: 2 });
  const bondOk = !b1.active.length && b4.hp === 0.05 && b4.dmg === 0.03 && b4.crit === 0.02 && b4.active.length === 2 &&
    JSON.stringify(sanitizeSources([1, '2', 2, 9, 'x'])) === '[1,2]' && sanitizeSources('junk').length === 0;
  if (bondOk) pass('Party bonuses add up'); else fail('Party bonuses add up', JSON.stringify({ b1, b4 }));

  // arena shapes: clamping always lands inside, and the wall distance matches the shape
  const shapeProbs = [];
  for (const id of [...Object.keys(ARENA_DEFS), 'any-round-boss']) {
    ARENA.use(id);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let i = 0; i < 3000; i++) { const p = ARENA.clamp({ x: rnd() * 1200, y: rnd() * 1200 }, 12); if (ARENA.sd(p.x, p.y) > -11.5) { shapeProbs.push(`${id}: clamp left (${p.x | 0}, ${p.y | 0}) outside`); break; } }
    for (let a = 0; a < TAU; a += 0.37) { const e = ARENA.edge(a); if (Math.abs(ARENA.sd(Math.cos(a) * e, Math.sin(a) * e)) > 1) { shapeProbs.push(`${id}: edge() off at angle ${a.toFixed(2)}`); break; } }
  }
  if (shapeProbs.length) fail('Arena shapes hold players in', shapeProbs.join('\n')); else pass('Arena shapes hold players in', Object.keys(ARENA_DEFS).join(', ') + ', circle');

  // smoothing: a unit moving at a steady speed is drawn at a steady speed, never past where it really is
  // updates arrive 10 times a second as time passes (like the host's boss updates); frames run at 60 fps
  const tr = new Track(0, 0, 0);
  let sent = 0;
  const feed = t => { while (sent <= 20 && sent * 0.1 <= t) { tr.push(sent * 0.1, sent * 20, 0, 0); sent++; } };
  feed(0.3);
  const steps = []; let last = tr.at(0.3).x, overshoot = false;
  for (let t = 0.3 + 1 / 60; t < 2.0; t += 1 / 60) { feed(t); const x = tr.at(t).x; steps.push(x - last); last = x; if (x > 400.01) overshoot = true; }
  const spread = Math.max(...steps) - Math.min(...steps);
  if (!overshoot && spread < 0.05) pass('Network smoothing is even', `step ${steps[0].toFixed(2)} Â± ${(spread / 2).toFixed(3)}`);
  else fail('Network smoothing is even', `spread ${spread.toFixed(3)}, overshoot ${overshoot}`);

  // ... and stays even over a wobbly connection: 40-75 ms delivery, noticed only on the receiver's next frame,
  // timed by the sender's clock (SendClock). Speed should hold within 10% once the first second has passed.
  // With `stall`, the sender's tab freezes for 0.6 s at the 3 s mark (its clock stops, then carries on from there):
  // it should be smooth again 2.5 s later.
  const wob = (stamp, stall) => {
    const tw = new Track(0, 0, 0), clk = new SendClock();
    let js = 3, k = 0; const jit = () => ((js = (js * 16807) % 2147483647) / 2147483647) * 0.035;
    const msgs = [];
    for (let i = 0; i <= 90; i++) {
      const real = i * 0.1;
      if (stall && real > 3 && real < 3.6) continue;
      msgs.push({ sent: 50 + real - (stall && real >= 3.6 ? 0.6 : 0), x: i * 20, arrive: Math.ceil((real + 0.04 + jit()) * 60) / 60 });
    }
    const speeds = []; let lx = null;
    const from = stall ? 6.1 : 1.5;
    for (let t = 0; t < 8.5; t += 1 / 60) {
      while (k < msgs.length && msgs[k].arrive <= t + 1e-9) { const m = msgs[k++]; tw.push(stamp ? clk.map(m.sent, t) : t, m.x, 0, 0); }
      const x = tw.at(t).x;
      if (lx != null && t > from && t < 8.5) speeds.push((x - lx) * 60);
      lx = x;
    }
    return { lo: Math.min(...speeds), hi: Math.max(...speeds) };
  };
  const ws = wob(true), wa = wob(false), wst = wob(true, true);
  const okRange = w => w.lo > 180 && w.hi < 220;
  if (okRange(ws) && okRange(wst)) pass('Smoothing holds over a wobbly connection', `speed ${ws.lo.toFixed(0)}-${ws.hi.toFixed(0)}, ${wst.lo.toFixed(0)}-${wst.hi.toFixed(0)} after a stall; by arrival time alone ${wa.lo.toFixed(0)}-${wa.hi.toFixed(0)}`);
  else fail('Smoothing holds over a wobbly connection', `speed ${ws.lo.toFixed(0)}-${ws.hi.toFixed(0)}, after a stall ${wst.lo.toFixed(0)}-${wst.hi.toFixed(0)}; want 180-220`);
}

// ---------------------------------------------------------------- 2b. items: rarities, effects, loot tables, chests
function items() {
  const probs = [];
  const RARITY_N = RARITY.length;
  // every item: a known rarity, Common only for Recruit gear, effects only from known hooks, text for every effect
  for (const it of Object.values(ITEMS)) {
    if (!Number.isInteger(it.rarity) || it.rarity < 0 || it.rarity >= RARITY_N) probs.push(`${it.key}: bad rarity ${it.rarity}`);
    if ((it.rarity === 0) !== (it.tier === 0)) probs.push(`${it.key}: Common is for Recruit gear only (tier ${it.tier}, rarity ${it.rarity})`);
    if (ITEM_PERKS[it.key] && it.rarity !== 3) probs.push(`${it.key}: an enhancement should be Legendary`);
    if (it.rarity === 1 && it.fx) probs.push(`${it.key}: Uncommon items are a clean stat line (no effect)`);
    if (it.rarity >= 2 && !it.fx && !ITEM_PERKS[it.key]) probs.push(`${it.key}: a ${RARITY[it.rarity].name} item needs an effect or an enhancement`);
    if (it.fx && !it.fxText) probs.push(`${it.key}: has effects but no fxText for its tooltip`);
    for (const e of it.fx || []) {
      const where = `${it.key} effect ${e.id}`;
      for (const k of Object.keys(e)) if (!FX_KEYS.has(k)) probs.push(`${where}: unknown field "${k}"`);
      if (!!e.on === !!e.while) { probs.push(`${where}: needs exactly one of on / while`); continue; }
      if (e.on) {
        if (!FX_TRIGGERS[e.on]) probs.push(`${where}: unknown trigger "${e.on}"`);
        if (!FX_ACTIONS.some(a => e[a])) probs.push(`${where}: a trigger needs an action (${FX_ACTIONS.join(', ')})`);
        if (FX_MODS.some(m => e[m])) probs.push(`${where}: mods belong in a condition or a buff`);
        if (e.buff) {
          if (!(e.dur > 0) || !e.name) probs.push(`${where}: a buff needs dur and name`);
          for (const m of Object.keys(e.buff)) if (!FX_MODS.includes(m)) probs.push(`${where}: unknown buff mod "${m}"`);
        }
        if (e.chance != null && !(e.chance > 0 && e.chance <= 1)) probs.push(`${where}: chance must be in (0, 1]`);
      } else {
        if (!FX_CONDITIONS[e.while]) probs.push(`${where}: unknown condition "${e.while}"`);
        if (!FX_MODS.some(m => e[m])) probs.push(`${where}: a condition needs a mod (${FX_MODS.join(', ')})`);
        if (FX_ACTIONS.some(a => e[a])) probs.push(`${where}: actions need a trigger`);
        if (e.while !== 'always' && !(e.frac > 0 && e.frac < 1)) probs.push(`${where}: ${e.while} needs a frac between 0 and 1`);
      }
      // modest numbers: effects stay small next to the stat line
      for (const m of FX_MODS) { const v = (e[m] || 0) + ((e.buff && e.buff[m]) || 0) * (e.stacks || 1); if (v > 0.15) probs.push(`${where}: ${m} ${v} is more than +15%`); }
    }
  }
  // loot tables: every entry exists and belongs there; every rarity has something anyone can get; two Mythics a boss
  for (const [boss, table] of Object.entries(LOOT_TABLES)) {
    for (const r of [1, 2, 3, 4]) {
      const keys = table[r] || [];
      for (const k of keys) {
        if (!ITEMS[k]) probs.push(`${boss}: loot table has unknown item ${k}`);
        else if (ITEMS[k].rarity !== r || ITEMS[k].tier !== BOSS_TIER[boss]) probs.push(`${boss}: ${k} is in the wrong table`);
      }
      if (!keys.length) probs.push(`${boss}: no ${RARITY[r].name} items`);
      else if (!keys.some(k => ITEMS[k] && !ITEMS[k].cls)) probs.push(`${boss}: every ${RARITY[r].name} item is class-locked (a party could roll an empty pool)`);
    }
    if ((table[4] || []).length !== 2) probs.push(`${boss}: ${(table[4] || []).length} Mythics (want 2)`);
  }
  for (const it of Object.values(ITEMS)) if (it.tier > 0 && !Object.values(LOOT_TABLES).some(t => (t[it.rarity] || []).includes(it.key))) probs.push(`${it.key} never drops`);
  // chests: the right size, real items, class items only for the classes in the run, rarities about as advertised
  let seed = 11; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const boss of Object.keys(LOOT_TABLES)) for (const mode of ['normal', 'hard']) {
    const counts = [0, 0, 0, 0, 0]; let n = 0;
    for (let i = 0; i < 1500; i++) {
      const classes = i % 3 ? ['bastion'] : ['cleric', 'ranger', 'pyromancer'];
      const chest = rollChest(boss, mode, classes, rng);
      if (chest.length !== CHEST_SIZE[mode]) { probs.push(`${boss} ${mode}: chest of ${chest.length}`); break; }
      for (const k of chest) {
        if (!ITEMS[k]) { probs.push(`${boss} ${mode}: chest rolled ${k}`); continue; }
        if (ITEMS[k].cls && !classes.includes(ITEMS[k].cls)) probs.push(`${boss} ${mode}: ${k} rolled for ${classes.join('/')}`);
        counts[ITEMS[k].rarity]++; n++;
      }
    }
    CHEST_ODDS[mode].forEach((pct, i) => { const got = counts[i + 1] / n * 100; if (Math.abs(got - pct) > 4) probs.push(`${boss} ${mode}: ${RARITY[i + 1].name} ${got.toFixed(1)}% (want about ${pct}%)`); });
  }
  // Need / Greed / Pass: Need beats Greed, all passing salvages, and who may Need what
  const w1 = lootWinner([[1, LOOT_GREED], [2, LOOT_NEED], [3, LOOT_PASS]], rng), w0 = lootWinner([[1, LOOT_PASS], [2, LOOT_PASS]], rng), wg = lootWinner([[4, LOOT_GREED]], rng);
  if (!w1 || w1.w !== 2 || w1.c !== LOOT_NEED || !(w1.r >= 1 && w1.r <= 100) || w0 !== null || !wg || wg.w !== 4) probs.push(`lootWinner: ${JSON.stringify({ w1, w0, wg })}`);
  const needs = [['bastion_w1', 'bastion', true], ['bastion_w1', 'cleric', false], ['g_cleaver', 'ranger', true], ['g_cleaver', 'cleric', false],
    ['g_apron', 'cleric', true], ['m_crown', 'bastion', true], ['cleric_a2', 'grovekeeper', false]];
  for (const [k, c, want] of needs) if (canNeed(k, c) !== want) probs.push(`canNeed(${k}, ${c}) should be ${want}`);
  // gold: per boss, doubled on Hard; selling follows rarity
  if (clearGold('grubnak', 'normal') !== 40 || clearGold('hollowking', 'hard') !== 120 || clearGold('nobody', 'normal') !== 0) probs.push('clear gold is off');
  if (RARITY.map(r => r.sell).join() !== '2,8,15,30,60') probs.push('sell prices are off');

  // the engine runs effects: a Mythic's shorter oGCD cooldowns, its buff on an oGCD, and a crit's strike
  const fakeEnv = (keys, hp = 1) => {
    let t = 0; const events = [];
    const mods = gearMods('bastion', gearTotals('bastion', keys.map(key => ({ key }))), keys.map(key => ({ key })));
    return { events, tick: d => { t += d; }, env: { now: () => t, emit: e => events.push(e), rng: () => 0.05, moving: () => false, target: () => ({ id: 'boss', x: 0, y: 0 }),
      positional: () => 'rear', partyMods: () => ({}), targetMods: () => ({}), selfMods: () => ({}), recentDamage: () => 0, maxHp: () => 1000, hpFrac: () => hp,
      gearMods: () => mods, isDead: () => false, defaultLink: () => 1, pos: () => ({ x: 0, y: 0 }) } };
  };
  const og = KITS.bastion.abilities.find(a => a.type === 'ogcd' && typeof a.cd === 'number' && !a.charges);
  const plain = new Kit(KITS.bastion, fakeEnv([]).env), court = new Kit(KITS.bastion, fakeEnv(['m_deadcourt']).env);
  if (Math.abs(court.recast(og) - plain.recast(og) * 0.9) > 1e-9) probs.push(`Dead Court: ${og.id} recast ${court.recast(og)} vs ${plain.recast(og)}`);
  court.itemHook('ogcd', og); court.itemHook('ogcd', og); court.itemHook('ogcd', og); court.itemHook('ogcd', og);
  if (Math.abs(court.fxMod('dmg') - 0.06) > 1e-9) probs.push(`Dead Court: 4 oGCDs give +${court.fxMod('dmg')} damage (want 0.06, 3 stacks)`);
  const fv = fakeEnv(['g_venom']), venom = new Kit(KITS.bastion, fv.env);
  venom.damage(100); const hits = fv.events.filter(e => e.type === 'damage').length;
  venom.damage(100); const hits2 = fv.events.filter(e => e.type === 'damage').length;
  if (hits !== 2 || hits2 !== 3) probs.push(`Venom Pendant: crit strikes ${hits}, then ${hits2} (want 2 then 3: once every 3 s)`);
  const low = new Kit(KITS.bastion, fakeEnv(['m_crown'], 0.3).env), high = new Kit(KITS.bastion, fakeEnv(['m_crown'], 0.9).env);
  if (low.fxMod('dmg') !== 0.12 || high.fxMod('dmg') !== 0) probs.push('Crown of the Barrow: hpBelow is off');

  if (probs.length) fail('Items, loot tables and effects', probs.join('\n'));
  else {
    const per = Object.entries(LOOT_TABLES).map(([b, t]) => `${b} ${[1, 2, 3, 4].map(r => t[r].length).join('/')}`).join(', ');
    pass('Items, loot tables and effects', `U/R/L/M per boss: ${per}`);
  }
}

// the save upgrade keeps every item, drops the Heroic flag and pays for it
function saveUpgrade() {
  const store = {
    'emberfall-save': JSON.stringify({ v: 1, name: 'Ava', inv: { next: 4, items: [{ uid: 1, key: 'bastion_w1', q: 1 }, { uid: 2, key: 'g_coat', q: 0 }, { uid: 3, key: 'gone_item' }],
      equip: { bastion: { weapon: 1, armor: 2 } } }, heroes: {}, settings: {} }),
  };
  global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const p = path.join(ROOT, 'client/js/save.js');
  delete require.cache[require.resolve(p)];
  const { Save: S } = require(p);
  delete global.localStorage;
  const inv = S.get('inv'), saved = JSON.parse(store['emberfall-save']);
  const ok = S.VERSION === 3 && saved.v === 3 && S.gold() === 10 && inv.items.length === 3 && inv.items.every(i => !('q' in i)) &&
    inv.equip.bastion.weapon === 1 && !!store['emberfall-save-backup-v1'] && Array.isArray(inv.lost);
  if (ok) pass('Save upgrade keeps items', 'v1 -> v3: Heroic flag dropped, 10 gold per Heroic item, gear still equipped');
  else fail('Save upgrade keeps items', JSON.stringify({ v: saved.v, gold: S.gold(), inv }));

  // v2 -> v3: every hero gets an empty talent tree; rows cost gold in order, picks only in unlocked rows, reset is free
  const store2 = { 'emberfall-save': JSON.stringify({ v: 2, name: 'Bo', gold: 130, inv: { next: 1, items: [], equip: {}, lost: [] },
    heroes: { ranger: { clears: { grubnak: { normal: 1, hard: 0 } }, spec: null } }, settings: {} }) };
  global.localStorage = { getItem: k => (k in store2 ? store2[k] : null), setItem: (k, v) => { store2[k] = String(v); } };
  delete require.cache[require.resolve(p)];
  const { Save: S2 } = require(p);
  const probs = [], up = JSON.parse(store2['emberfall-save']);
  if (up.v !== 3 || !up.heroes.ranger.talents || up.heroes.ranger.talents.rows !== 0 || up.heroes.ranger.clears.grubnak.normal !== 1) probs.push(`upgrade: ${JSON.stringify(up.heroes)}`);
  if (S2.pickTalent('ranger', 0, 1)) probs.push('picked in a locked row');
  if (!S2.unlockTalentRow('ranger', 60) || !S2.unlockTalentRow('ranger', 60) || S2.unlockTalentRow('ranger', 60) || S2.gold() !== 10) probs.push(`unlocking: gold ${S2.gold()}, rows ${S2.talents('ranger').rows}`);
  if (!S2.pickTalent('ranger', 1, 2) || S2.pickTalent('ranger', 2, 0) || S2.pickTalent('ranger', 0, 3)) probs.push('picks: wrong rows or columns allowed');
  const held = talentSet('ranger', S2.talents('ranger'));
  if (held.size !== 1 || !held.has(TALENTS.ranger[1][2].id)) probs.push(`talentSet: ${[...held]}`);
  S2.resetTalents('ranger');
  if (S2.talents('ranger').picks.some(x => x != null) || S2.talents('ranger').rows !== 2) probs.push('reset should clear picks and keep rows');
  if (S2.talents('cleric').rows !== 0 || talentSet('cleric', S2.talents('cleric')).size) probs.push('a fresh hero should hold no talents');
  delete global.localStorage;
  if (probs.length) fail('Save keeps talents', probs.join('\n')); else pass('Save keeps talents', 'v2 -> v3 adds talents; rows cost gold in order, picks free');
}

// ---------------------------------------------------------------- 2c. talents: shape, links to the kits, code and data agree
function talents() {
  const probs = [], ids = new Set(), src = ['combat/kits.js', 'combat/specs.js', 'combat/engine.js'].map(f => fs.readFileSync(path.join(ROOT, 'client/js', f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/talent\('(\w+)'\)/g)].map(m => m[1]));
  if (JSON.stringify(TALENT_COSTS) !== '[60,120,200,300,400]') probs.push(`row costs ${TALENT_COSTS}`);
  for (const c of CLASSES) {
    const rows = TALENTS[c.id];
    if (!rows || rows.length !== 5) { probs.push(`${c.id}: ${rows ? rows.length : 0} rows (want 5)`); continue; }
    const specIds = (SPECS[c.id] || []).map(s => s.id);
    rows.forEach((row, r) => {
      if (row.length !== 3) probs.push(`${c.id} row ${r + 1}: ${row.length} talents (want 3)`);
      for (const t of row) {
        const where = `${c.id} ${t.id}`;
        if (ids.has(t.id)) probs.push(`${where}: duplicate id`); ids.add(t.id);
        if (!t.id.startsWith(c.id + '_')) probs.push(`${where}: id should start with ${c.id}_`);
        if (!t.name || !t.text) probs.push(`${where}: needs a name and text`);
        if (!KITS[c.id].abilities.some(a => a.id === t.ab)) probs.push(`${where}: unknown ability ${t.ab}`);
        for (const k of Object.keys(t)) if (!['id', 'name', 'ab', 'text', 'spec', 'cd', 'cast', 'specMods'].includes(k)) probs.push(`${where}: unknown field "${k}"`);
        for (const s of Object.keys(t.spec || {})) if (!specIds.includes(s)) probs.push(`${where}: text for unknown spec ${s}`);
        for (const [s, m] of Object.entries(t.specMods || {})) {
          if (!specIds.includes(s)) probs.push(`${where}: specMods for unknown spec ${s}`);
          for (const k of Object.keys(m)) if (!['cd', 'cast'].includes(k)) probs.push(`${where}: specMods field "${k}"`);
        }
        const grant = typeof TALENT_ABILITIES !== 'undefined' && TALENT_ABILITIES[t.id];   // a talent that puts a new move on a key
        if (grant && (grant.cls !== c.id || !KITS[c.id].abilities.some(a => a.id === grant.ab.replaces) || grant.ab.replaces !== t.ab)) probs.push(`${where}: its new move should replace ${t.ab}, a ${c.id} ability`);
        if (!used.has(t.id) && t.cd == null && t.cast == null && !grant) probs.push(`${where}: does nothing (no k.talent('${t.id}') in the kits, no cd/cast)`);
      }
    });
  }
  for (const id of used) if (!TALENT_BY_ID[id]) probs.push(`k.talent('${id}') in the kits has no talent in talents.js`);
  // without talents a kit plays exactly as before: the class balance check below compares base kits with the baseline
  if (probs.length) fail('Talents line up with the kits', probs.join('\n'));
  else pass('Talents line up with the kits', `${ids.size} talents, ${used.size} read by the kits`);
}

// ---------------------------------------------------------------- 3 + 4. balance sim and bot raids (run side by side)
function run(args) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, args, { cwd: ROOT });
    let out = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('close', code => resolve({ code, out }));
  });
}
async function heavy() {
  const trialIds = Object.values(SPECS).flat().map(s => s.id);
  const [sim, tal, ...raids] = await Promise.all([
    run([path.join(__dirname, 'simulate.js')]),
    run([path.join(__dirname, 'talents.js')]),
    ...RAIDS.map(([, boss, ...comp]) => run([path.join(__dirname, 'bot-raid.js'), 'normal', String(RAID_RUNS), boss, comp.join(',')])),
    ...trialIds.map(id => run([path.join(__dirname, 'bot-raid.js'), 'normal', '2', 'trial:' + id])),
  ]);
  const trials = raids.splice(RAIDS.length);

  // balance: each class's pro DPS against the baseline
  const now = {};
  for (const line of sim.out.split('\n')) { const m = line.match(/^(\w+)\s+(\d+)\s+(\d+)\s+(\d+)%/); if (m) now[m[1]] = { newbie: +m[2], pro: +m[3] }; }
  if (sim.code !== 0 || !Object.keys(now).length) fail('Class balance', 'the simulator failed:\n' + sim.out.slice(-800));
  else if (UPDATE || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify(now, null, 2) + '\n');
    pass('Class balance', `baseline recorded for ${Object.keys(now).length} classes`);
  } else {
    const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), drift = [];
    for (const [c, b] of Object.entries(base)) {
      const n = now[c];
      if (!n) { drift.push(`${c}: missing from the simulator`); continue; }
      const d = (n.pro - b.pro) / b.pro;
      if (Math.abs(d) > DPS_TOLERANCE) drift.push(`${c}: pro DPS ${b.pro} -> ${n.pro} (${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%)`);
      if (n.newbie > n.pro) drift.push(`${c}: a newbie out-damages a pro (${n.newbie} vs ${n.pro})`);
    }
    if (drift.length) fail('Class balance', drift.join('\n') + '\n(if that change was intended: node tools/check.js --update-baseline)');
    else pass('Class balance', `all ${Object.keys(base).length} classes within ${DPS_TOLERANCE * 100}% of the baseline`);
  }

  // specializations: each spec's pro DPS stays close to its own base class (same simulator run)
  const specRows = [];
  for (const line of sim.out.split('\n')) { const m = line.match(/^(\w+):(\w+)\s+(\d+)\s+(\d+)/); if (m) specRows.push({ c: m[1], s: m[2], pro: +m[4] }); }
  if (specRows.length) {
    // a spec can aim off its class on purpose (a damage-leaning healer): spec.balance is the share it aims for
    const want = r => now[r.c].pro * ((specOf(r.c, r.s) || {}).balance || 1);
    const off = specRows.filter(r => now[r.c] && Math.abs(r.pro - want(r)) / want(r) > SPEC_TOLERANCE)
      .map(r => `${r.c}:${r.s}: pro DPS ${r.pro} vs ${Math.round(want(r))} aimed for`);
    if (off.length) fail('Specializations balanced', off.join('\n'));
    else pass('Specializations balanced', `${specRows.length} specs within ${SPEC_TOLERANCE * 100}% of their class`);
  }

  // talents: one talent adds a few percent, a full build stays a modest step over the base kit
  const talRows = tal.out.split('\n').map(l => l.match(/^TALENT (\S+) (\w+) (-?[\d.]+)/)).filter(Boolean);
  const buildRows = tal.out.split('\n').map(l => l.match(/^BUILD (\S+) (\d+) (\d+) (-?[\d.]+)/)).filter(Boolean);
  if (tal.code !== 0 || !talRows.length || !buildRows.length) fail('Talents balanced', 'tools/talents.js failed:\n' + tal.out.slice(-800));
  else {
    const off = [
      ...talRows.filter(m => +m[3] > TALENT_MAX).map(m => `${m[1]} ${m[2]}: +${m[3]}% DPS on its own (max ${TALENT_MAX}%)`),
      ...buildRows.filter(m => +m[4] > BUILD_MAX).map(m => `${m[1]}: full build ${m[2]} -> ${m[3]} pro DPS (+${m[4]}%, max ${BUILD_MAX}%)`),
    ];
    const top = Math.max(...buildRows.map(m => +m[4]));
    if (off.length) fail('Talents balanced', off.join('\n'));
    else pass('Talents balanced', `${talRows.length} talent runs, every one at most +${TALENT_MAX}%; best full build +${top.toFixed(1)}%`);
  }

  // bot raids: a bot party clears each boss on Normal every time
  RAIDS.forEach(([boss, , ...comp], i) => {
    const r = raids[i], m = r.out.match(/cleared (\d+) of (\d+)/), name = `Bots clear ${boss} (Normal, ${comp.join(' ')})`;
    if (r.code === 0 && m && m[1] === m[2]) pass(name, `${m[1]} of ${m[2]}`);
    else fail(name, m ? `${m[1]} of ${m[2]}\n` + r.out.split('\n').filter(l => /^run /.test(l)).join('\n') : r.out.slice(-800));
  });

  // spec trials: a bot playing the spec can pass each one (a bot isn't a careful player, so one clear of two is enough)
  const stuck = trialIds.filter((id, i) => { const m = trials[i].out.match(/cleared (\d+) of/); return trials[i].code !== 0 || !m || +m[1] < 1; });
  if (stuck.length) fail('Spec trials can be passed', stuck.map(id => `${id}: ${(trials[trialIds.indexOf(id)].out.split('\n').filter(l => /^run /.test(l)).join(' | ') || trials[trialIds.indexOf(id)].out.slice(-300))}`).join('\n'));
  else pass('Spec trials can be passed', `all ${trialIds.length}, by a bot playing the spec`);
}

(async () => {
  const t0 = Date.now();
  syntax();
  try { data(); } catch (e) { fail('Data checks ran', e.stack); }
  await heavy();
  console.log('');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && r.ok ? `  (${r.detail})` : ''}`);
    if (!r.ok && r.detail) console.log(r.detail.split('\n').map(l => '      ' + l).join('\n'));
  }
  const bad = results.filter(r => !r.ok).length;
  console.log(`\n${bad ? `${bad} check${bad > 1 ? 's' : ''} failed` : 'All checks passed'} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(bad ? 1 : 0);
})();
