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
// bot raids: every boss, and every tank and healer spec somewhere, with a fixed line-up so the result doesn't depend on a random spec
const RAIDS = [
  ['Grubnak', 'grubnak', 'bastion:base', 'cleric:aegis'],
  ['Skitterra', 'skitterra', 'runeguard:runeblade', 'grovekeeper:moonwell'],
  ['Volkar', 'volkar', 'bloodreaver:berserker', 'chronomancer:accelerant'],
  ['Volkar', 'volkar', 'bloodreaver:hemomancer', 'cleric:inquisitor'],
  ['the Hollow King', 'hollowking', 'bastion:sentinel', 'grovekeeper:lifebinder'],
  ['the Hollow King', 'hollowking', 'bastion:crusader', 'chronomancer:echoist'],
  ['the Hollow King', 'hollowking', 'runeguard:spellwarden', 'cleric:base'],
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
  Object.assign(global, load('arena/shapes.js'), load('data.js'), load('combat/engine.js'), load('combat/kits.js'), load('combat/specs.js'), load('items.js'), load('interp.js'));
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
  const [sim, ...raids] = await Promise.all([
    run([path.join(__dirname, 'simulate.js')]),
    ...RAIDS.map(([, boss, tank, healer]) => run([path.join(__dirname, 'bot-raid.js'), 'normal', String(RAID_RUNS), boss, `${tank},${healer},ranger,pyromancer`])),
  ]);

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

  // bot raids: a bot party clears each boss on Normal every time
  RAIDS.forEach(([boss, , tank, healer], i) => {
    const r = raids[i], m = r.out.match(/cleared (\d+) of (\d+)/), name = `Bots clear ${boss} (Normal, ${tank} + ${healer})`;
    if (r.code === 0 && m && m[1] === m[2]) pass(name, `${m[1]} of ${m[2]}`);
    else fail(name, m ? `${m[1]} of ${m[2]}\n` + r.out.split('\n').filter(l => /^run /.test(l)).join('\n') : r.out.slice(-800));
  });
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
