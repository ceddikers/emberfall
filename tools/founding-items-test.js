// The Founding: the items test. Checks the item list (ids, rarities, prices, shop and drop shape, secret items kept out of drops, forge and
// shop), that every passive key in data.js has an implementation in sim-items.js (and the other way round), and then pokes each passive
// in a small live sim to see that it does what its line says. Ends "Items OK".
// Usage: node tools/founding-items-test.js

const path = require('path');
const { FoundingMap: M } = require(path.join(__dirname, '../client/js/founding/map-data.js'));
const { FOUNDING_DATA: D } = require(path.join(__dirname, '../client/js/founding/data.js'));
const { FoundingSim } = require(path.join(__dirname, '../client/js/founding/sim.js'));
require(path.join(__dirname, '../client/js/founding/sim-items.js'));   // registers on FoundingSim.mods
const { FoundingArt } = require(path.join(__dirname, '../client/js/founding/map-art.js'));
FoundingArt.layoutOnly();

const hyp = Math.hypot, DT = 0.05;
let failures = 0, passed = 0;
function check(cond, msg) { if (cond) passed++; else { failures++; console.log('  FAIL: ' + msg); } return !!cond; }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function mk(heroes, seed, extra) {
  const players = heroes.map((_, i) => ({ id: 'p' + i, name: 'P' + i }));
  const sim = new FoundingSim(Object.assign({ players, emit() {}, emitTo() {}, seed: seed || 1, noSpawn: true }, extra || {}));
  heroes.forEach((hero, i) => sim.intent('p' + i, { k: 'pick', hero }));
  sim.intent('p0', { k: 'ready' });
  run(sim, 1);
  for (const h of sim.heroes) { h.level = 10; h.ranks = [3, 3, 3, 1]; h.xp = 0; h.gold = 0; sim.recalc(h); h.hp = h.max; }
  return sim;
}
function run(sim, secs) { const n = Math.round(secs / DT); for (let i = 0; i < n && sim.st === 'live'; i++) sim.tick(DT); }
function wear(sim, h, ids) { h.items = new Array(D.ITEM_SLOTS).fill(null); ids.forEach((id, i) => { h.items[i] = { uid: ++sim.uid, id }; }); sim.recalc(h); h.hp = Math.min(h.hp, h.max); }
function put(h, x, y) { h.x = x; h.y = y; h.path = null; }
function foe(sim, x, y, hp, kind) { const e = sim.spawnEnemy(kind || 'streak', 0, [x, y]); e.x = x; e.y = y; e.hp = e.max = hp === undefined ? 1e6 : hp; e.arm = 0; e.atk = null; e.stun = 0; sim.buildHash(); return e; }
function freeze(sim) { sim.updateNight = () => {}; }
const OPEN = [3230, 3400];   // open ground south of the junction

// ---------------------------------------------------------------- the list
function sectionList() {
  console.log('The item list:');
  const I = D.ITEMS, ids = new Set(), names = new Set();
  let dupId = 0, dupName = 0; for (const x of I) { if (ids.has(x.id)) dupId++; ids.add(x.id); if (names.has(x.name)) dupName++; names.add(x.name); }
  check(!dupId && !dupName, 'every item id and name is unique');
  const real = I.filter(x => !x.sec);
  check(real.length >= 38 && real.length <= 52, `about forty items (${real.length}, plus ${I.length - real.length} found-only)`);
  const byRar = [0, 1, 2, 3, 4].map(r => real.filter(x => x.rar === r));
  check(byRar.every(a => a.length >= 5), 'every rarity has at least five items: ' + byRar.map(a => a.length).join('/'));
  check(I.every(x => x.rar >= 0 && x.rar <= 4 && D.RARITIES[x.rar] && D.RARITY_COLORS[x.rar]), 'rarities are 0..4 with a name and a colour (no Epic)');
  const PRICE = [[10, 20], [35, 50], [90, 110], [200, 240], [450, 550]];
  check(real.every(x => x.price >= PRICE[x.rar][0] && x.price <= PRICE[x.rar][1]), 'prices follow the rarity: ' + real.filter(x => !(x.price >= PRICE[x.rar][0] && x.price <= PRICE[x.rar][1])).map(x => x.id).join());
  check(real.every(x => x.shop === 'basic' || x.shop === 'forged' || x.shop === 0), "shop is 'basic', 'forged' or 0");
  check(real.filter(x => x.shop === 'basic').every(x => x.rar <= 1), 'only Commons and Uncommons are sold from the start');
  check(real.filter(x => x.shop === 'forged').every(x => x.rar >= 2 && x.rar <= 3), 'the forged stock is Rare and Legendary');
  check(real.filter(x => x.rar === 4).every(x => x.shop === 0), 'Mythics are drop or forge only');
  check(real.filter(x => x.rar <= 1).every(x => x.price > 0 && D.sellPrice(x) > 0 && D.canSell(x.rar)), 'Commons and Uncommons sell for something');
  check(I.filter(x => x.sec).every(x => x.shop === 0 && x.price === 0), 'found-only items are not in the shop');
  check(real.every(x => typeof x.text === 'string' && x.text.length > 3 && x.text.length < 110), 'every item has a short stat line');
  // text: short, plain, no spelled-out arithmetic
  check(real.every(x => !x.pas || (x.pas.length > 15 && x.pas.length < 150)), 'passive lines are one or two short sentences');
  // passives
  const keys = D.passiveKeys(), impl = FoundingSim.itemPassives || {};
  check(keys.every(k => impl[k]), 'every passive key in data.js has an implementation: ' + keys.filter(k => !impl[k]).join());
  check(Object.keys(impl).every(k => keys.includes(k)), 'every implemented passive is used by an item: ' + Object.keys(impl).filter(k => !keys.includes(k)).join());
  check(real.filter(x => x.ip).every(x => x.pas), 'an item with a passive says what it does');
  const withP = real.filter(x => x.ip).length;
  check(withP >= 28 && withP / real.length >= 0.55, `most items have a real passive (${withP}/${real.length})`);
  check(real.filter(x => x.rar >= 2).filter(x => x.ip).length >= real.filter(x => x.rar >= 2).length * 0.7, 'Rare and better are mostly passives');
  check(real.filter(x => x.rar <= 1).filter(x => x.ip).length >= 5, 'a few cheap passives too');
  const ipCount = {}; for (const x of real) if (x.ip) ipCount[x.ip] = (ipCount[x.ip] || 0) + 1;
  check(Object.values(ipCount).every(n => n === 1), 'each passive key belongs to one item');
  // the four heroes
  for (const hero of D.HERO_IDS) {
    const own = D.itemsFor(hero);
    check(own.length >= 3 && own.some(x => x.rar === 2) && own.some(x => x.rar === 3) && own.some(x => x.rar === 4), `${hero} has Rare, Legendary and Mythic pieces (${own.map(x => x.id).join()})`);
    check(own.every(x => x.ip && Object.keys(x.stats).length), `${hero}'s pieces carry a passive and a stat`);
  }
  check(real.every(x => !x.hero || D.KITS[x.hero]), 'an item for a hero names a real hero');
  // forged-stock heroes' pieces can be bought once the forge is open
  const s = mk(['bastion'], 3);
  s.forge = 0; const basic = s.shopStock(); s.forge = 2; const forged = s.shopStock();
  check(basic.length >= 10 && basic.every(x => x.shop === 'basic'), `the early shop sells ${basic.length} basics`);
  check(forged.length > basic.length && forged.every(x => !x.sec) && forged.length <= 32, `the forged shop adds ${forged.length - basic.length} (${forged.length} wares)`);
  check(['ramhorn', 'petalpouch', 'coalpouch', 'houndcollar'].every(id => forged.some(x => x.id === id)), "each hero's Rare piece is in the forged stock");
  // drops: weights, shape, never the found-only items
  const w = D.dropWeights;
  let okW = true; for (let wave = 1; wave <= 30; wave++) { const a = w(wave); if (a.length !== 5 || a.some(v => v < 0) || a.reduce((p, q) => p + q, 0) <= 0) okW = false; }
  check(okW, 'drop weights are five non-negative numbers for every wave');
  check(w(1)[3] === 0 && w(1)[4] === 0 && w(3)[4] === 0 && w(6)[4] === 0, 'no Legendary or Mythic in the first waves');
  check(w(28)[4] > 0 && w(28)[3] > w(28)[0], 'the last night drops the good things');
  const richer = (a, b) => (a[3] + a[4] * 2) / a.reduce((p, q) => p + q, 0) >= (b[3] + b[4] * 2) / b.reduce((p, q) => p + q, 0) - 1e-9;
  check([[1, 4], [4, 8], [8, 12], [12, 17], [17, 22], [22, 27]].every(([a, b]) => richer(w(b), w(a))), 'drops get richer as the run goes on');
  const sim = mk(['bastion', 'cleric'], 5), got = {}; sim.heroes.forEach(h => { h.items = new Array(6).fill(null); });
  let secDrop = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    sim.wave = [3, 8, 14, 20, 27][i % 5]; for (const h of sim.heroes) h.items = new Array(6).fill(null);
    sim.dropItem({ def: { drop: 2 }, x: 0, y: 0 });
    for (const h of sim.heroes) for (const x of h.items) if (x) { n++; got[x.id] = 1; if (D.ITEM[x.id].sec) secDrop++; }
  }
  check(n > 600 && secDrop === 0, `400 drop rolls gave ${n} items, none found-only`);
  check(Object.keys(got).length >= 36, `drops reach most of the list (${Object.keys(got).length} different items)`);
  // forging: never to a found-only item
  const f = mk(['ranger'], 6), g = f.heroes[0]; f.forge = 2; put(g, M.P.forge[0], M.P.forge[1] - 60);
  let secF = 0, rarOK = true;
  for (let i = 0; i < 300; i++) {
    const A = i % 3 === 0 ? ['emberblade', 'longlens'] : i % 3 === 1 ? ['aegis', 'tallytooth'] : ['emberheart', 'lodestar'];
    g.items = new Array(6).fill(null); g.items[0] = { uid: 1, id: A[0] }; g.items[1] = { uid: 2, id: A[1] }; f.forgeItems(g, 1, 2);
    const r = g.items[0] && D.ITEM[g.items[0].id]; if (!r) { rarOK = false; continue; }
    if (r.sec) secF++; if (r.rar < D.ITEM[A[0]].rar) rarOK = false;
    if (i % 3 === 2 && (r.id === A[0] || r.id === A[1] || r.rar !== 4)) rarOK = false;
  }
  check(secF === 0 && rarOK, 'forging never makes a found-only item, never goes down, and two Mythics make a different Mythic');
}

// ---------------------------------------------------------------- the passives
function sectionPassives() {
  console.log('The passives:');
  let s, h, o, e, e2;
  // ---- stats that depend on the moment
  s = mk(['ranger'], 11); h = s.heroes[0]; freeze(s); put(h, ...OPEN);
  wear(s, h, ['owlcharm']); s.night = 0; run(s, 0.2); const d0 = h.S.dmg; s.night = 0.9; run(s, 0.2);
  check(near(h.S.dmg - d0, 0.14, 1e-6), 'Owl Charm: +14% damage once night falls');
  s.night = 0; run(s, 0.2); check(near(h.S.dmg, d0, 1e-6), 'Owl Charm: gone with the dawn');
  wear(s, h, ['moonsilver']); s.night = 0.9; run(s, 0.2);
  check(near(h.S.dmg, 0.20, 1e-6) && near(h.S.as, 0.15, 1e-6), 'Moonsilver: +20% damage and +15% attack speed at night');
  s.night = 0; run(s, 0.2); check(h.S.dmg === 0 && h.S.as === 0, 'Moonsilver: nothing by day');
  wear(s, h, ['porterstrap']); run(s, 0.2); check(h.S.armor === 0 && h.S.ms === 0, "Porter's Strap: nothing while empty-handed");
  h.carry = 'jar'; run(s, 0.2); check(near(h.S.armor, 0.15, 1e-6) && near(h.S.ms, 0.12, 1e-6), "Porter's Strap: 15% less damage and +12% speed while carrying");
  h.carry = null; run(s, 0.2); check(h.S.armor === 0, "Porter's Strap: put it down and it is gone");
  wear(s, h, ['watchlamp']); const base = h.S.dmg; run(s, 0.2);
  s.posts.push({ x: h.x, y: h.y, lit: true, slot: 0 }); run(s, 0.2); check(near(h.S.dmg - base, 0.12, 1e-6), "Watchman's Lamp: +12% damage inside a lit post's light");
  s.posts.length = 0; run(s, 0.2); check(near(h.S.dmg, base, 1e-6), "Watchman's Lamp: no bonus out of the light");
  wear(s, h, ['pilgrimcup']); put(h, M.P.spring[0] + 20, M.P.spring[1] + 20); run(s, 1); check(h.S.ms === 0, "Pilgrim's Cup: a moment at the fountain is not yet a drink");
  run(s, 1.5); check(near(h.S.ms, 0.20, 1e-6), "Pilgrim's Cup: +20% speed after drinking");
  put(h, ...OPEN); run(s, 6); check(near(h.S.ms, 0.20, 1e-6), "Pilgrim's Cup: it lasts a while after leaving"); run(s, 4); check(h.S.ms === 0, "Pilgrim's Cup: and then ends");
  // ---- on kill
  s = mk(['ranger'], 12); h = s.heroes[0]; freeze(s); put(h, ...OPEN);
  wear(s, h, ['tallytooth']); for (let i = 0; i < 3; i++) { e = foe(s, h.x + 60, h.y, 5); s.dmgE(e, 50, h); }
  run(s, 0.2); check(near(h.S.dmg, 0.06, 1e-6), 'Tally Tooth: three kills, three stacks of 2%');
  for (let i = 0; i < 14; i++) { e = foe(s, h.x + 60, h.y, 5); s.dmgE(e, 50, h); } run(s, 0.2);
  check(near(h.S.dmg, 0.20, 1e-6), 'Tally Tooth: ten stacks at most');
  run(s, 9); check(h.S.dmg === 0, 'Tally Tooth: a quiet few seconds clears them');
  { const a = mk(['ranger'], 13), b = mk(['ranger'], 13); for (const [sim, ids] of [[a, ['satchel']], [b, ['jerkin']]]) { const hh = sim.heroes[0]; freeze(sim); put(hh, ...OPEN); wear(sim, hh, ids); hh.gold = 0; const ee = foe(sim, hh.x + 60, hh.y, 5, 'brute'); sim.dmgE(ee, 50, hh); }
    check(a.heroes[0].gold - b.heroes[0].gold >= 2, "Scavenger's Satchel: a kill pays at least 2 more gold (" + a.heroes[0].gold + ' against ' + b.heroes[0].gold + ')'); }
  h = s.heroes[0]; wear(s, h, ['houndcollar']); h.ch[2] = 0; h.cdT[2] = 10; e = foe(s, h.x + 60, h.y, 5); e.mark = { m: 1.2, t: 5, src: h }; s.dmgE(e, 50, h);
  check(near(h.cdT[2], 7, 1e-6), "Hound's Collar: killing a marked enemy takes 3 seconds off Hunter's Mark");
  // ---- basic attacks
  const AUTO = { kb: 5 };
  s = mk(['ranger'], 14); h = s.heroes[0]; freeze(s); put(h, ...OPEN); wear(s, h, ['flintring']); e = foe(s, h.x + 80, h.y);
  const hits = []; for (let i = 0; i < 8; i++) hits.push(s.dmgE(e, 10, h, AUTO));
  check(hits[3] > hits[0] * 1.4 && hits[7] > hits[4] * 1.4 && hits[1] === hits[0] && hits[2] === hits[0], 'Flint Ring: every fourth basic attack hits harder (' + hits.join(',') + ')');
  const sk = s.dmgE(e, 10, h, { pw: 1, kb: 5 }); check(sk <= hits[0] + 1, 'Flint Ring: skills do not count');
  wear(s, h, ['sparkring']); const plain = s.dmgE(e, 10, h, AUTO);
  s.release(h, 'q', { x: h.x + 100, y: h.y }, 1);
  const sp = s.dmgE(e, 10, h, AUTO), after = s.dmgE(e, 10, h, AUTO);
  check(sp > plain * 1.7 && after === plain, 'Spark Ring: a cast makes the next basic attack hit 80% harder, once (' + [plain, sp, after].join(',') + ')');
  wear(s, h, ['thirdarrow']); e2 = foe(s, h.x + 120, h.y + 40); const hp2 = e2.hp; for (let i = 0; i < 3; i++) s.dmgE(e, 10, h, AUTO);
  check(e2.hp < hp2, 'Third Arrow: the third basic attack sends a second shot at another foe');
  const hp3 = e2.hp; for (let i = 0; i < 2; i++) s.dmgE(e, 10, h, AUTO); check(e2.hp === hp3, 'Third Arrow: and not before the third');
  // ---- casting
  s = mk(['bastion', 'cleric', 'pyromancer', 'ranger'], 15); freeze(s); const [bas, clr, pyr, rng] = s.heroes; for (const x of s.heroes) put(x, OPEN[0] + (x.hk - 1.5) * 40, OPEN[1]);
  wear(s, bas, ['wardthread']); s.release(bas, 'e', {}, 1); check(bas.shield >= 14 && bas.shieldT >= 2.9, 'Warding Thread: casting wraps you in a shield');
  wear(s, bas, ['ramhorn']); e = foe(s, bas.x, bas.y - 50); e2 = foe(s, bas.x + 40, bas.y - 70); const far = foe(s, bas.x + 400, bas.y - 70);
  s.release(bas, 'q', { e }, 1); check(e2.stun > 0.5 && far.stun <= 0, "Ram's Horn: Shield Bash stuns the enemies beside its target");
  wear(s, clr, ['censer']); clr.shield = 0; s.release(clr, 'q', { u: bas }, 1); check(bas.shield >= 30, "Pilgrim's Censer: Mend shields its target");
  wear(s, clr, ['chalice']); bas.hp = 100; rng.hp = 40; const bh = bas.hp, rh = rng.hp; s.release(clr, 'q', { u: bas }, 1);
  check(rng.hp > rh && bas.hots.length > 0, 'Dawn Chalice: Mend also heals the weakest other ally (' + Math.round(rng.hp - rh) + ' on the Ranger)');
  wear(s, pyr, ['cindermitt']); pyr.ch[0] = 0; pyr.cdT[0] = 3; s.release(pyr, 'q', { x: pyr.x, y: pyr.y - 200, hot: true }, 1); check(pyr.ch[0] === pyr.chMax[0], 'Cinder Mitt: a Hot Streak fireball is free');
  pyr.ch[0] = 0; pyr.cdT[0] = 3; s.release(pyr, 'q', { x: pyr.x, y: pyr.y - 200 }, 1); check(pyr.ch[0] === 0, 'Cinder Mitt: an ordinary fireball is not');
  wear(s, rng, ['packhorn']); e = foe(s, rng.x, rng.y - 120); e2 = foe(s, rng.x + 60, rng.y - 130); s.release(rng, 'e', { e }, 1);
  check(e.mark && e2.mark && e2.mark.src === rng, "Pack-Hunter's Horn: Hunter's Mark spreads to the enemies around the target");
  wear(s, rng, ['crownechoes']); const c0 = s.casts; s.release(rng, 'r', { x: rng.x, y: rng.y - 200 }, 1); check(s.casts === c0 + 1, 'Crown of Echoes: the first cast is at once'); run(s, 3.2);
  check(s.casts === c0 + 2, 'Crown of Echoes: the ultimate goes off a second time three seconds later');
  // ---- coal pouch: the crit chance
  s = mk(['pyromancer'], 16); h = s.heroes[0]; { let a = 0, b = 0; const N = 6000; wear(s, h, ['jerkin']); for (let i = 0; i < N; i++) if (s.pyroRoll(h)) a++; wear(s, h, ['coalpouch']); for (let i = 0; i < N; i++) if (s.pyroRoll(h)) b++;
    check(near(a / N, 0.40, 0.03) && near(b / N, 0.55, 0.03), `Coal Pouch: the crit chance goes from 40% to 55% (${Math.round(a / N * 100)}% to ${Math.round(b / N * 100)}%)`); }
  // ---- hound collar, standard
  s = mk(['ranger', 'bastion'], 17); freeze(s); h = s.heroes[0]; o = s.heroes[1]; put(h, ...OPEN); put(o, OPEN[0] + 100, OPEN[1]); e = foe(s, h.x + 80, h.y); e.mark = { m: 1, t: 30, src: h };
  wear(s, h, ['jerkin']); const hb = s.dmgE(e, 10, h, AUTO); wear(s, h, ['houndcollar']); const hc = s.dmgE(e, 10, h, AUTO);
  check(near(hc / hb, 1.2, 0.08), "Hound's Collar: marked enemies take 20% more (" + hb + ' to ' + hc + ')');
  wear(s, h, ['jerkin']); wear(s, o, ['standard']); const st1 = s.dmgE(e, 100, h, AUTO); put(o, OPEN[0] + 1000, OPEN[1]); const st0 = s.dmgE(e, 100, h, AUTO);
  check(near(st1 / st0, 1.08, 0.02), "Founder's Standard: allies close by hit 8% harder (" + st0 + ' to ' + st1 + ')');
  // ---- taking damage
  s = mk(['bastion', 'cleric'], 18); freeze(s); [h, o] = s.heroes; put(h, ...OPEN); put(o, OPEN[0] + 60, OPEN[1]); e = foe(s, h.x + 40, h.y);
  wear(s, h, ['thornmantle']); h.S.armor = 0; const e0 = e.hp; const took = s.hurtHero(h, 30, e, {}); check(e0 - e.hp > 0 && near(e0 - e.hp, took * 0.33, 3), `Thorn Mantle: a third of a ${took} blow comes back (${Math.round(e0 - e.hp)})`);
  wear(s, h, ['oldgrudge']); h.hp = h.max; h.rage = 0; s.hurtHero(h, 10, e, {}); check(h.rage <= 0, 'Old Grudge: a small blow does nothing'); s.hurtHero(h, h.max * 0.3, e, {}); check(h.rage > 5, 'Old Grudge: a heavy blow brings rage');
  wear(s, h, ['brinkstone']); h.hp = h.max; h.S.armor = 0; const l1 = s.hurtHero(h, h.max * 0.9, e, {}); check(l1 < h.max * 0.9 * 0.55, 'Brinkstone: the blow that would leave you under a quarter is halved (' + l1 + ')');
  h.hp = h.max; const l2 = s.hurtHero(h, h.max * 0.9, e, {}); check(l2 > h.max * 0.85, 'Brinkstone: and not again at once');
  s.time += 31; h.hp = h.max; const l3 = s.hurtHero(h, h.max * 0.9, e, {}); check(l3 < h.max * 0.55, 'Brinkstone: it is back after half a minute');
  wear(s, h, ['unbowed']); h.hp = h.max; const u0 = s.hurtHero(h, 40, e, {}); h.hp = h.max * 0.3; const u1 = s.hurtHero(h, 40, e, {}); check(near(u1 / u0, 0.75, 0.1), 'The Unbowed: a quarter less under a third of health (' + u0 + ' then ' + u1 + ')');
  wear(s, h, ['phoenixash']); h.hp = 20; h.shield = 0; h.invul = 0; const ne = foe(s, h.x + 80, h.y, 1e6); const nh = ne.hp; s.hurtHero(h, 500, e, {});
  check(!h.dead && h.hp >= h.max / 3 && ne.hp < nh, 'Phoenix Ash: a felling blow leaves a third of your health and bursts into flame');
  h.hp = 20; h.invul = 0; s.hurtHero(h, 500, e, {}); check(h.dead, 'Phoenix Ash: but only once in two minutes');
  h.dead = false; h.hp = h.max;
  // ---- a Perfect Block
  s = mk(['bastion'], 19); freeze(s); h = s.heroes[0]; put(h, ...OPEN); e = foe(s, h.x + 60, h.y);
  wear(s, h, ['wardensigil']); h.shield = 0; h.braceT = 1; s.hurtHero(h, 30, e, { block: true }); check(e.stun > 1 && h.shield >= 30, "Warden's Sigil: a Perfect Block stuns the enemies around you and shields you");
  wear(s, h, ['oath']); h.ch[3] = 0; h.cdT[3] = 30; h.braceT = 1; s.hurtHero(h, 30, e, { block: true }); check(near(h.cdT[3], 24, 1e-6), "Wall-Warden's Oath: a Perfect Block takes six seconds off The Wall");
  // ---- auras and recovery
  s = mk(['cleric', 'bastion'], 20); freeze(s); [h, o] = s.heroes; put(h, ...OPEN); put(o, OPEN[0] + 100, OPEN[1]); wear(s, h, ['restlantern']); o.hp = 50; h.hp = 100; run(s, 4);
  check(o.hp > 55 && h.hp > 105, `Rest Lantern: you and the allies near you mend (${Math.round(o.hp - 50)} on the ally)`);
  put(o, OPEN[0] + 1000, OPEN[1]); o.hp = 50; run(s, 4); check(o.hp === 50, 'Rest Lantern: not for those far away');
  s = mk(['cleric'], 21); freeze(s); h = s.heroes[0]; put(h, ...OPEN); const petalTime = () => { h.st.petals = 0; h.st.pt = 0; let t = 0; while (h.st.petals < 1 && t < 12) { run(s, 0.1); t += 0.1; } return t; };
  wear(s, h, ['jerkin']); const pt0 = petalTime(); wear(s, h, ['petalpouch']); const pt1 = petalTime();
  check(near(pt0, 6, 0.3) && near(pt1, 3, 0.4), `Petal Pouch: a petal regrows in ${pt1.toFixed(1)} s instead of ${pt0.toFixed(1)} s`);
}

// ---------------------------------------------------------------- everything at once
function sectionSmoke() {
  console.log('A whole run with the items on:');
  const rnd = (() => { let a = 99; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const pool = D.ITEMS.filter(x => !x.sec && !x.use);
  let bad = 0, errs = 0;
  for (const heroes of [['bastion', 'cleric', 'pyromancer', 'ranger'], ['pyromancer', 'ranger'], ['cleric']]) {
    const sim = new FoundingSim({ players: heroes.map((_, i) => ({ id: 'p' + i, name: 'P' + i })), emit() {}, emitTo() {}, seed: 31 });
    heroes.forEach((hero, i) => sim.intent('p' + i, { k: 'pick', hero })); sim.intent('p0', { k: 'ready' });
    for (const h of sim.heroes) { h.level = 10; h.ranks = [3, 3, 3, 1]; const own = D.itemsFor(h.hero), mine = own.concat(pool).sort(() => rnd() - 0.5).slice(0, 6); wear(sim, h, mine.map(x => x.id)); h.hp = h.max; }
    try {
      sim.tick(DT);
      for (let t = 0; t < 4200 && sim.st === 'live'; t++) {   // 210 s of waves, the heroes casting where they stand
        if (t % 12 === 0) for (const h of sim.heroes) { if (h.dead) continue; const tg = sim.nearestEnemy(h.x, h.y, 500); if (tg) for (const s of 'qwer') sim.intent(h.id, { k: 'cast', s, id: tg.id, x: tg.x, y: tg.y }); }
        if (t % 40 === 0) for (const h of sim.heroes) if (!h.dead) { const tg = sim.nearestEnemy(h.x, h.y, 600); if (tg) sim.intent(h.id, { k: 'attack', id: tg.id }); }
        if (t === 1500) sim.night = 1;
        sim.tick(DT);
        if (t % 100 === 0) for (const h of sim.heroes) if (![h.hp, h.max, h.shield, h.dmgMul, h.asMul, h.msMul, h.cdrMul].every(Number.isFinite)) bad++;
      }
    } catch (e) { errs++; console.log(e.stack); }
  }
  check(errs === 0 && bad === 0, 'three parties in full kit played on with no throw and no NaN');
}

// ---------------------------------------------------------------- the pack: what the panels are sent, tossing and swapping
function sectionPack() {
  console.log('The pack (the sheet the forge and tent read, tossing, swapping):');
  require(path.join(__dirname, '../client/js/founding/sim-world.js'));   // ground drops, toss and swap
  const sheets = {};
  const sim = mk(['bastion', 'cleric'], 5, { emitTo(id, m) { if (m.t === 'fdp') sheets[id] = m; } });
  const h = sim.hmap.p1;   // (the second player: an intent from p1 is exactly what a guest's tab sends)
  put(h, OPEN[0], OPEN[1]);
  const common = D.ITEMS.find(x => x.rar === 0 && !x.hero), rare = D.ITEMS.filter(x => x.rar === 2 && !x.hero && !x.sec).slice(0, 2), mine = D.ITEMS.find(x => x.hero === 'cleric' && x.rar >= 1 && !x.sec);
  wear(sim, h, [common.id, rare[0].id, rare[1].id, mine.id]);
  sim.sendSheet(h);
  const it = (sheets.p1 || {}).it;
  check(Array.isArray(it) && it.length === D.ITEM_SLOTS && it.slice(0, 4).every((x, i) => Array.isArray(x) && x[0] === h.items[i].uid && x[1] === h.items[i].id) && it.slice(4).every(x => x === 0), 'the sheet a guest gets lists every worn item as [uid, id] (what the forge, tent and bar read)');
  // swap
  const ids = () => h.items.map(x => (x ? x.id : null));
  const before = ids();
  sim.intent('p1', { k: 'swap', a: 0, b: 2 }); check(ids()[0] === before[2] && ids()[2] === before[0] && ids()[1] === before[1], 'swap trades two slots');
  sim.intent('p1', { k: 'swap', a: 3, b: 5 }); check(h.items[3] === null && h.items[5] && h.items[5].id === mine.id, 'swapping with an empty slot moves the item');
  const snap = ids(); for (const m of [{ k: 'swap', a: 1, b: 1 }, { k: 'swap', a: -1, b: 2 }, { k: 'swap', a: 1, b: 6 }, { k: 'swap', a: 0.5, b: 2 }, { k: 'swap', a: '1', b: 2 }, { k: 'swap' }]) sim.intent('p1', m);
  check(JSON.stringify(ids()) === JSON.stringify(snap), 'a swap with a bad slot changes nothing');
  run(sim, 0.5); sim.sendSheet(h); check(sheets.p1.it[5] && sheets.p1.it[5][1] === mine.id && sheets.p1.it[3] === 0, 'the sheet after a swap shows the new order');
  // toss
  const slot = h.items.findIndex(x => x && x.id === rare[0].id), uid = h.items[slot].uid, n0 = sim.groundDrops.length;
  sim.intent('p1', { k: 'toss', slot, uid: uid + 99 }); check(h.items[slot] && sim.groundDrops.length === n0, 'a toss with the wrong uid (the slot changed meanwhile) does nothing');
  sim.intent('p1', { k: 'toss', slot, uid });
  check(h.items[slot] === null && sim.groundDrops.length === n0 + 1, 'toss empties the slot and puts the item on the ground');
  const dr = sim.groundDrops[sim.groundDrops.length - 1];
  check(dr.item === rare[0].id && hyp(dr.x - h.x, dr.y - h.y) < 120, "it lies at the hero's feet");
  const had = h.items.filter(Boolean).length;
  run(sim, 2); check(sim.groundDrops.includes(dr) && h.items.filter(Boolean).length === had, 'standing on it does not scoop it up again');
  put(h, OPEN[0] + 400, OPEN[1]); run(sim, 0.5); put(h, dr.x, dr.y); run(sim, 0.3); check(sim.groundDrops.includes(dr), 'nor does walking away and back');
  sim.intent('p1', { k: 'pick', id: dr.id }); run(sim, 0.1);
  check(!sim.groundDrops.includes(dr) && h.items.some(x => x && x.id === rare[0].id), 'a right-click takes it up');
  // a class piece stays what it is; a fallen hero tosses and swaps nothing; bad slots add nothing
  const ms = h.items.findIndex(x => x && x.id === mine.id); sim.intent('p1', { k: 'toss', slot: ms });
  const dm = sim.groundDrops[sim.groundDrops.length - 1]; check(h.items[ms] === null && dm.item === mine.id, 'a class piece tossed stays that item');
  const bag = JSON.stringify(ids()), n1 = sim.groundDrops.length;
  h.dead = true; sim.intent('p1', { k: 'toss', slot: h.items.findIndex(Boolean) }); sim.intent('p1', { k: 'swap', a: 0, b: 1 }); h.dead = false;
  check(JSON.stringify(ids()) === bag && sim.groundDrops.length === n1, 'a fallen hero tosses and swaps nothing');
  for (const s of [5, 9, -1, 'x', null, 1.5]) sim.intent('p1', { k: 'toss', slot: s });
  check(JSON.stringify(ids()) === bag && sim.groundDrops.length === n1, 'a toss of an empty or bad slot adds nothing');
}

// ---------------------------------------------------------------- the panels' markup must not meet the game's own styles
// (a Founding panel body was once called .pb, which is also the raid's buff pip: the stylesheet shrank the tent, the forge and the builder's board to an 18 px box)
function sectionStyles() {
  console.log("The panels and the game's other styles:");
  const fs = require('fs'), dir = path.join(__dirname, '../client/js/founding'), cls = new Set();
  const attr = /class(?:Name)?\s*=\s*["'`]([^"'`]*)["'`]/g;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(attr)) for (const t of m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) if (/^[a-z][\w-]*$/i.test(t)) cls.add(t);
  const OK = new Set(['hidden', 'close', 'sub', 'chip']);   // (known, harmless overlaps)
  const hits = [];
  for (const f of fs.readdirSync(path.join(__dirname, '../client')).filter(x => x.endsWith('.css') && x !== 'founding.css')) {
    const css = fs.readFileSync(path.join(__dirname, '../client', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/(^|[},])\s*\.([a-z][\w-]*)\b[^{,]*\{/g)) if (cls.has(m[2]) && !OK.has(m[2])) hits.push(m[2] + ' (' + f + ')');
  }
  check(cls.has('pbody') && !cls.has('pb'), 'the shop panels use their own body class');
  check(hits.length === 0, 'no class the Founding writes into its markup is also a bare class rule in another stylesheet: ' + [...new Set(hits)].join(', '));
}

sectionList();
sectionPassives();
sectionSmoke();
sectionPack();   // (last: it loads sim-world.js, which puts drops on the ground, and the sections above roll them straight into packs)
sectionStyles();
console.log(failures ? `\n${failures} failed, ${passed} passed` : `\n${passed} checks`);
if (failures) process.exit(1);
console.log('Items OK');
