// The specialization trials: one short story vignette per spec, a memory of the Hollow King's court fought against
// his Shade in the Barrow. Each fight is built so the spec's trick is the natural answer; nothing on screen says what
// to do (the spec page already explains the moves), and a failed try just goes back to town to try again.
// Clearing a spec's trial unlocks it for that hero (save.js); the trials open once that hero has cleared the Hollow King.
//
// A trial: { cls, spec, name, lore: [two lines shown as it begins], outro (shown when it's won), allies: bot entries,
//   seconds (how long it should take: sizes the Shade), enrage, regen (share of max HP everyone gets back per second),
//   guard: 'allies' | 'tank' | null (who else must live), script(f, k, me) }.
// trialDef(specId) turns one into a boss definition for FightSim. It keeps the Hollow King's id, so his hall, art,
// telegraphs and effects all apply, and adds `trial` (the spec id), which skips loot and boss-clear records.

// a rough damage per second per role (the boss files' big-number units), to size the Shade for the party it meets
const TRIAL_RATE = { tank: 1300, healer: 800, dps: 2000 };
const TRIAL_HP_SCALE = [0.42, 0.62, 0.82, 1];   // fight.js scale.hp by party size

// the Hollow King's moves, with the tags his telegraphs and effects already know
function trialMoves(f) {
  const B = f.boss;
  const SWING = { sweep: 'Sceptre Sweep', stomp: 'Barrow Stomp', ring: 'Crown of Graves' };
  const swingShape = (kind, angle) => (kind === 'sweep' ? { kind: 'cone', x: B.x, y: B.y, r: 1100, arc: 2.0, angle: angle ?? B.facing }
    : kind === 'stomp' ? { kind: 'circle', x: B.x, y: B.y, r: 300 } : { kind: 'donut', x: B.x, y: B.y, r: 1100, r2: 220 });
  const k = {
    knell(dmg, d = 4, name = 'Barrow Knell') {
      f.cast(name, f.ct(d), 'knell');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: f.ct(d), dmg, hidden: true, tag: 'knell' });
    },
    // a heavy blow at one player (the tank unless named), aimed from the Shade
    blow(dmg, d = 4, name = 'Grave Cleave', target) {
      // (the party's tank, not whoever has his attention this second: early on an ally can out-damage the tank)
      const t = target ? f.alive().find(p => p.id === target) : (f.alive().find(p => p.role === 'tank') || f.tank()); if (!t) return;
      if (name) f.cast(name, f.ct(d), 'cleave');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 320, arc: 1.4, angle: B.facing }, delay: f.ct(d), dmg, target: t.id, aimFromBoss: t.id, tag: 'buster' });
    },
    swing(kind, dmg, d = 4.5, angle) {
      f.cast(SWING[kind], f.ct(d), kind);
      if (kind === 'sweep') B.lockFacing = true;
      f.mech({ type: 'aoe', shape: swingShape(kind, angle), delay: f.ct(d), dmg, tag: kind, onResolve: () => { if (kind === 'sweep') B.lockFacing = false; } });
    },
    marks(dmg, d = 5) {
      f.cast('Grave Marks', f.ct(d), 'marks');
      for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 120 }, delay: f.ct(d), dmg, follow: p.id, tag: 'marks' });
    },
    bells(dmg, failDmg, d = 8) {
      f.cast('Barrow Bells', f.ct(3), 'bells');
      const a = f.rng() * Math.PI * 2, need = Math.min(2, f.alive().length);
      for (const s of [1, -1]) f.mech({ type: 'tower', shape: { kind: 'circle', x: Math.cos(a) * 280 * s, y: Math.sin(a) * 200 * s, r: 85 }, delay: f.ct(d), dmg, failDmg, need, tag: 'bell' });
    },
    gaze(dmg, d = 4) {
      f.cast('Royal Gaze', f.ct(d), 'gaze');
      f.mech({ type: 'gaze', shape: { kind: 'circle', x: B.x, y: B.y, r: 0 }, delay: f.ct(d), dmg: 0, tag: 'gaze', avoidable: false,
        onResolve: () => {
          for (const p of f.alive()) {
            let a = Math.atan2(B.y - p.y, B.x - p.x) - (p.a || 0);
            while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
            if (Math.abs(a) >= 1.2) continue;
            f.damagePlayer(p, dmg, { kind: 'gaze', avoidable: true }); f.debuff(p.id, 'rooted', 2);
            f.emit({ t: 'gazed', id: p.id });
          }
        } });
    },
    // a share of someone's max HP, straight off (the Berserker's opening wound)
    wound(id, frac, name) {
      const p = f.alive().find(q => q.id === id); if (!p) return;
      if (name) f.cast(name, 1.2, 'cleave');
      f.afterKeep(name ? 1.2 : 0, () => { const q = f.alive().find(o => o.id === id); if (q) f.damagePlayer(q, q.s.maxHp * frac, { kind: 'wound', raw: true }); });
    },
    // repeat a list of [delay, fn] steps for the whole fight
    loop(steps) { const go = () => f.seq([...steps, [0.01, go]]); go(); },
  };
  return k;
}

const TRIALS = {
  // ======================================================================= TANKS (alone, or with one ally)
  sentinel: {
    cls: 'bastion', spec: 'sentinel', name: 'The Gate',
    lore: ['Before the Barrow, the King\'s gate never fell.', 'Its keeper took every blow the rams could give, three at a time.'],
    outro: 'The gate holds. The Sentinel stands.',
    allies: ['ranger:base'], seconds: 55, enrage: 150, regen: 0.015,
    script(f, k, me) {
      // the battering ram: three blows in a row on whoever holds the gate
      const ram = () => { f.cast('Battering Ram', f.ct(2.6), 'cleave'); for (let i = 0; i < 3; i++) k.blow(8000, 2.6 + i * 0.8, null, me.id); };
      k.loop([[3, ram], [7, () => k.knell(3500)], [6, ram], [8, () => k.swing('stomp', 6000)], [4, () => {}]]);
    },
  },
  crusader: {
    cls: 'bastion', spec: 'crusader', name: 'Dawn Over the Barrow',
    lore: ['The last dawn the Barrow ever saw came on a blade.', 'Every blow the Crusader turned aside became light.'],
    outro: 'The dawn breaks again. The Crusader rises.',
    allies: [], seconds: 65, enrage: 80, regen: 0.01,
    script(f, k, me) {
      // quick, readable swings at the tank, over and over: each one is a chance to block
      k.loop([[2.5, () => k.blow(6500, 2.2, 'Grave Strike', me.id)], [3.2, () => k.blow(6500, 2.2, 'Grave Strike', me.id)], [3.2, () => k.blow(6500, 2.2, 'Grave Strike', me.id)], [4, () => k.swing('stomp', 5000, 3.5)]]);
    },
  },
  berserker: {
    cls: 'bloodreaver', spec: 'berserker', name: 'The Red Hour',
    lore: ['They left him for dead at the foot of the throne.', 'He was never more dangerous than then.'],
    outro: 'The red hour ends. The Berserker walks away.',
    allies: [], seconds: 60, enrage: 70, regen: 0,
    script(f, k, me) {
      k.wound(me.id, 0.6, 'Kingsblood');
      f.after(4, () => k.loop([[4, () => k.blow(5000, 3, 'Grave Strike', me.id)], [6, () => k.knell(2500)], [5, () => k.swing('stomp', 4000, 3.5)]]));
    },
  },
  hemomancer: {
    cls: 'bloodreaver', spec: 'hemomancer', name: 'The Blood Vow',
    lore: ['No healer came to the siege of the Barrow.', 'One knight bled for all of them, and none of them fell.'],
    outro: 'The vow is kept. The Hemomancer remains.',
    allies: ['ranger:base', 'shadowblade:base'], guard: 'allies', seconds: 55, enrage: 150, regen: 0,
    script(f, k) {
      // the whole line is worn down, and only the tank's blood can mend it
      k.loop([[3, () => k.knell(4300)], [5, () => k.blow(4500, 3.5)], [4, () => k.knell(4300)], [6, () => k.swing('stomp', 5000, 4)]]);
    },
  },
  spellwarden: {
    cls: 'runeguard', spec: 'spellwarden', name: 'The Warded Heir',
    lore: ['The King had an heir once, small and brave and breakable.', 'Her warden wrote runes on the air between her and every blade.'],
    outro: 'The heir lives. The Spellwarden keeps her circle.',
    allies: ['pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0.02,
    script(f, k, me) {
      // the Shade keeps reaching past the tank for the heir
      const heir = () => f.alive().find(p => p.id !== me.id);
      const sentence = () => { const h = heir(); if (h) k.blow(16000, 4.5, 'Royal Sentence', h.id); };
      k.loop([[4, sentence], [7, () => k.blow(6000, 3)], [6, sentence], [7, () => k.knell(3000)], [3, () => {}]]);
    },
  },
  runeblade: {
    cls: 'runeguard', spec: 'runeblade', name: 'The Carved Oath',
    lore: ['A runesmith swore to carve the King\'s name into his own blade.', 'He finished the last rune on the King himself.'],
    outro: 'The oath is carved. The Runeblade is drawn.',
    allies: [], seconds: 65, enrage: 75, regen: 0.012,
    script(f, k, me) {
      k.loop([[3, () => k.blow(7000, 3.5, 'Grave Strike', me.id)], [6, () => k.swing('stomp', 4000, 3.5)], [5, () => k.blow(7000, 3.5, 'Grave Strike', me.id)], [6, () => k.knell(2500)]]);
    },
  },

  // ======================================================================= HEALERS (with a tank and an ally)
  aegis: {
    cls: 'cleric', spec: 'aegis', name: 'The Golden Wall',
    lore: ['The Executioner\'s axe never missed and never needed two strokes.', 'A priest put a wall of light in its way, again and again.'],
    outro: 'The axe is turned. The Aegis shines.',
    allies: ['bloodreaver:base', 'ranger:base'], guard: 'allies', seconds: 50, enrage: 150, regen: 0,
    script(f, k) {
      // the axe falls on the tank, slow and plain to see, harder than any heal can answer afterwards
      k.loop([[5, () => k.blow(35000, 5, 'Executioner\'s Axe')], [8, () => k.knell(3000)], [5, () => k.blow(35000, 5, 'Executioner\'s Axe')], [7, () => k.swing('stomp', 4000)]]);
    },
  },
  inquisitor: {
    cls: 'cleric', spec: 'inquisitor', name: 'Judgment',
    lore: ['When the court turned on the King, one priest led the charge.', 'Every blade that struck him carried her verdict.'],
    outro: 'The verdict stands. The Inquisitor judges.',
    allies: ['bastion:base', 'shadowblade:base', 'ranger:base'], seconds: 55, enrage: 65, regen: 0.004,
    script(f, k) {
      k.loop([[4, () => k.blow(9000, 4)], [6, () => k.knell(3000)], [6, () => k.swing('stomp', 4000)]]);
    },
  },
  lifebinder: {
    cls: 'grovekeeper', spec: 'lifebinder', name: 'Deep Roots',
    lore: ['The Barrow\'s dead wind blows without end.', 'A druid grew roots under her friends before it ever reached them.'],
    outro: 'The roots hold. The Lifebinder endures.',
    allies: ['bastion:base', 'ranger:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // the dead wind: one knell after another, steady as breathing
      k.loop([[3, () => k.knell(4200, 3.5, 'Dead Wind')], [3.5, () => k.knell(4200, 3.5, 'Dead Wind')], [3.5, () => k.blow(9000, 3.5)], [3.5, () => k.knell(4200, 3.5, 'Dead Wind')]]);
    },
  },
  moonwell: {
    cls: 'grovekeeper', spec: 'moonwell', name: 'The Silver Pool',
    lore: ['On the last night, the court gathered under the bells.', 'The moon came down to meet them there.'],
    outro: 'The pool is still. The Moonwell glows.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // everyone gathers under the bells, and the knell follows right after
      k.loop([[3, () => k.bells(3000, 4000, 7)], [7.5, () => k.knell(4000, 2)], [4, () => k.blow(8000, 4)], [6, () => k.knell(3500)]]);
    },
  },
  echoist: {
    cls: 'chronomancer', spec: 'echoist', name: 'The Second Voice',
    lore: ['The Barrow\'s bells always rang twice.', 'A mage learned to answer twice as well.'],
    outro: 'The bells fall quiet. The Echoist answers.',
    allies: ['bastion:base', 'ranger:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // a knell, and its echo three seconds later
      const twin = () => { k.knell(4200, 4, 'Twin Knell'); f.after(f.ct(4) + 3, () => f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.1, dmg: 4200, hidden: true, tag: 'knell' })); };
      k.loop([[3, twin], [10, () => k.blow(9000, 4)], [6, twin], [10, () => k.swing('stomp', 4000)]]);
    },
  },
  accelerant: {
    cls: 'chronomancer', spec: 'accelerant', name: 'The Quickened Hour',
    lore: ['The court had one hour before the moon set.', 'A mage made it last, and made them fast.'],
    outro: 'The hour is enough. The Accelerant keeps time.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], seconds: 55, enrage: 70, regen: 0,
    script(f, k) {
      k.loop([[3, () => k.knell(3200)], [5, () => k.blow(8000, 4)], [5, () => k.knell(3200)], [5, () => k.swing('stomp', 4000)]]);
    },
  },

  // ======================================================================= DPS (with a tank and a healer)
  sharpshooter: {
    cls: 'ranger', spec: 'sharpshooter', name: 'The Still Eye',
    lore: ['One archer watched the whole siege from the far wall.', 'She did not move once, and did not miss once.'],
    outro: 'The shot is true. The Sharpshooter watches.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 65, regen: 0,
    script(f, k) {
      // his swings stay close to him; the far end of the hall stays quiet
      k.loop([[3, () => k.swing('stomp', 6000)], [6, () => k.blow(9000, 4)], [6, () => k.swing('stomp', 6000)], [6, () => k.knell(2500)]]);
    },
  },
  venomstrike: {
    cls: 'ranger', spec: 'venomstrike', name: 'The Green Death',
    lore: ['The King\'s champion could not be wounded by one arrow.', 'So the hunter sent a hundred, and let them work.'],
    outro: 'The champion falls. The Venomstrike moves on.',
    allies: ['bastion:base', 'cleric:base'], seconds: 70, enrage: 80, regen: 0,
    script(f, k) {
      k.loop([[4, () => k.blow(9000, 4)], [6, () => k.knell(2500)], [6, () => k.swing('stomp', 5000)], [5, () => k.marks(3000)]]);
    },
  },
  bladedancer: {
    cls: 'shadowblade', spec: 'bladedancer', name: 'The Whirling Edge',
    lore: ['The Shade turns and turns, and has no back.', 'A dancer never needed one.'],
    outro: 'The Shade is still at last. The Bladedancer bows.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 65, regen: 0,
    script(f, k) {
      // he never stops turning, so no side of him stays his back for long
      f.ticker(() => { if (!f.boss.cast) { f.boss.lockFacing = true; f.boss.facing += 0.05; } });
      k.loop([[4, () => k.knell(2500)], [6, () => k.swing('stomp', 5000)], [6, () => k.knell(2500)], [5, () => {}]]);
    },
  },
  nightstalker: {
    cls: 'shadowblade', spec: 'nightstalker', name: 'The Knife Behind',
    lore: ['No one could look the King in the eye and live.', 'So the assassin never did.'],
    outro: 'The King never saw it coming. The Nightstalker fades.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 65, regen: 0,
    script(f, k) {
      k.loop([[3, () => k.gaze(7000, 3.5)], [5, () => k.blow(9000, 4)], [6, () => k.gaze(7000, 3.5)], [5, () => k.knell(2500)]]);
    },
  },
  cataclysm: {
    cls: 'pyromancer', spec: 'cataclysm', name: 'The Falling Star',
    lore: ['The siege engines broke on the Barrow\'s walls.', 'A mage called down the sky instead.'],
    outro: 'The walls are rubble. The Cataclysm burns on.',
    allies: ['bastion:base', 'cleric:base'], seconds: 60, enrage: 70, regen: 0,
    script(f, k) {
      // he holds the middle of the hall and barely moves: a fine place for a star to land
      f.boss.anchor = true;
      k.loop([[4, () => k.blow(9000, 4)], [6, () => k.knell(2500)], [7, () => k.swing('stomp', 5000)]]);
    },
  },
  sigilmancer: {
    cls: 'pyromancer', spec: 'sigilmancer', name: 'The Burning Circle',
    lore: ['The court mages drew their circles where the King\'s sceptre could not reach.', 'One stood in hers and burned brighter than the throne.'],
    outro: 'The circle holds. The Sigilmancer burns.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 65, regen: 0,
    script(f, k) {
      // his sceptre sweeps one side of the hall, then the other; the far end, straight behind him, never burns
      k.loop([[3, () => k.swing('sweep', 7000, 4, 0)], [7, () => k.swing('sweep', 7000, 4, Math.PI)], [6, () => k.blow(9000, 4)], [6, () => k.knell(2500)]]);
    },
  },
};

// ======================================================================= ADVANCED CLASSES (Thermist, Driftblade)
Object.assign(TRIALS, {
  pendulum: {
    cls: 'thermist', spec: 'pendulum', name: 'The Swinging Weight',
    lore: ['The Barrow\'s great clock ran on a pendulum of frost and fire.', 'Its keeper never let it rest, and it never missed a beat.'],
    outro: 'The clock strikes. The Pendulum swings on.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 66, regen: 0,
    script(f, k) {
      // the court never stands still for long: short stretches between the marks, no room for long, slow casts
      k.loop([[3, () => k.marks(3500, 4)], [4.5, () => k.blow(9000, 3.5)], [4, () => k.swing('stomp', 5000, 3.5)], [4.5, () => k.marks(3500, 4)], [5, () => k.knell(2500)]]);
    },
  },
  zenith: {
    cls: 'thermist', spec: 'zenith', name: 'The Burning Edge',
    lore: ['One mage held the Barrow\'s gate at the edge of burning.', 'She let go a moment before it took her, every time.'],
    outro: 'The edge holds. The Zenith burns bright.',
    allies: ['bastion:base', 'cleric:base'], seconds: 60, enrage: 70, regen: 0,
    script(f, k) {
      // long, quiet stretches where nothing makes you move: the time to hold the edge
      f.boss.anchor = true;
      k.loop([[5, () => k.blow(9000, 4)], [9, () => k.knell(2500)], [9, () => k.swing('stomp', 5000, 4)]]);
    },
  },
  orbit: {
    cls: 'driftblade', spec: 'orbit', name: 'The Circling Hawk',
    lore: ['The King\'s falconer was a swordswoman first.', 'She circled her quarry like her hawks did, and never landed.'],
    outro: 'The quarry falls. The Orbit circles on.',
    allies: ['bastion:base', 'cleric:base'], seconds: 52, enrage: 72, regen: 0,
    script(f, k) {
      // his sceptre sweeps one side, then the other: whoever keeps circling round him stays out of it
      k.loop([[3, () => k.swing('sweep', 6500, 4, 0)], [6, () => k.swing('sweep', 6500, 4, Math.PI / 2)], [6, () => k.swing('sweep', 6500, 4, Math.PI)], [6, () => k.knell(2500)]]);
    },
  },
  comet: {
    cls: 'driftblade', spec: 'comet', name: 'The Long Charge',
    lore: ['A rider crossed the whole Barrow in one charge.', 'Nothing in the hall was standing when she reached the far wall.'],
    outro: 'The charge lands. The Comet burns out, and rises again.',
    allies: ['bastion:base', 'cleric:base'], seconds: 52, enrage: 72, regen: 0,
    script(f, k) {
      // in close, then far out, then in again: long straight runs across the hall
      k.loop([[3, () => k.swing('ring', 6000, 4)], [5.5, () => k.swing('stomp', 6000, 4)], [5.5, () => k.blow(9000, 4)], [5, () => k.swing('ring', 6000, 4)], [5.5, () => k.knell(2500)]]);
    },
  },
});

// the boss definition FightSim runs for a trial
function trialDef(specId) {
  const T = TRIALS[specId];
  if (!T) return null;
  const party = [CLASSES.find(c => c.id === T.cls).role, ...T.allies.map(a => CLASSES.find(c => c.id === a.split(':')[0]).role)];
  const n = Math.min(4, party.length);
  const hp = Math.round(T.seconds * party.reduce((s, r) => s + TRIAL_RATE[r], 0) / TRIAL_HP_SCALE[n - 1]);
  return {
    id: 'hollowking', trial: specId, name: `Shade of the Hollow King`, title: T.name,
    hp: { normal: hp, hard: hp }, autoDmg: { normal: 1300, hard: 1300 },
    enrage: { normal: T.enrage, hard: T.enrage }, enrageName: 'The Memory Fades',
    spawn: { x: 0, y: -80 }, arena: { theme: 'barrow' },
    script(f) {
      const players = f.players();
      // the one taking the trial (a human; in the headless tools, the first of that class)
      const me = players.find(p => p.cls === T.cls && !p.bot) || players.find(p => p.cls === T.cls);
      f.trialTaker = me && me.id;
      f.ticker(dt => {
        // the memory's allies (and the trial taker) mend a little on their own where the vignette says so
        if (T.regen) for (const p of f.alive()) p.s.hp = Math.min(p.s.maxHp, p.s.hp + p.s.maxHp * T.regen * dt);
        if (f.state !== 'live') return;
        // the trial is lost if you fall, or anyone it asks you to protect does
        const mine = f.ps.get(f.trialTaker);
        if (mine && !mine.alive) { f.end('wipe'); return; }
        if (T.guard === 'allies' && players.some(p => p.id !== f.trialTaker && f.ps.get(p.id) && !f.ps.get(p.id).alive)) f.end('wipe');
      });
      T.script(f, trialMoves(f), me || players[0]);
    },
  };
}

if (typeof module !== 'undefined') module.exports = { TRIALS, trialDef, trialMoves };
