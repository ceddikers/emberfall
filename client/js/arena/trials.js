// The specialization trials: one short story vignette per spec, a memory of the Hollow King's court fought against
// his Shade in the Barrow. Each fight is built so the spec's trick is the natural answer; nothing on screen says what
// to do (the spec page already explains the moves), and a failed try just goes back to town to try again.
// Clearing a spec's trial unlocks it for that hero (save.js); the trials open once any of the player's heroes has cleared the Hollow King.
//
// A trial: { cls, spec, name, lore: [two lines shown as it begins], outro (shown when it's won), allies: bot entries,
//   seconds (how long it should take: sizes the Shade), enrage, regen (share of max HP everyone gets back per second),
//   guard: 'allies' | 'tank' | null (who else must live), script(f, k, me) }.
// trialDef(specId) turns one into a boss definition for FightSim. It keeps the Hollow King's id, so his hall, art,
// telegraphs and effects all apply, and adds `trial` (the spec id), which skips loot and boss-clear records.

// a rough damage per second per role (the boss files' big-number units), to size the Shade for the party it meets
const TRIAL_RATE = { tank: 1300, healer: 800, dps: 2000 };

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
      // long, quiet stretches where nothing makes you move: the time to hold the edge for a full Corona
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

// ======================================================================= Alembist (classes-b)
Object.assign(TRIALS, {
  apothecary: {
    cls: 'alembist', spec: 'apothecary', name: 'The Long Vigil',
    lore: ['Through the siege, the bells were quiet for hours, then rang all at once.', 'The apothecary spent every quiet hour filling her shelves.'],
    outro: 'The bells are answered. The Apothecary is ready.',
    allies: ['bastion:base', 'ranger:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // a long hush, then the Night Bells: three knells two and a half seconds apart, more than anyone can heal live
      const toll = () => f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.1, dmg: 5400, hidden: true, tag: 'knell' });
      const bells = () => { k.knell(5400, 3, 'Night Bells'); f.after(f.ct(3) + 2.5, toll); f.after(f.ct(3) + 5, toll); };
      k.loop([[4, () => k.blow(8000, 4)], [10, () => {}], [2, bells], [12, () => k.blow(8000, 4)], [6, () => {}], [2, bells], [10, () => {}]]);
    },
  },
  volatile: {
    cls: 'alembist', spec: 'volatile', name: 'The Short Fuse',
    lore: ['The siege engineers mixed what no book allowed.', 'One of them learned to throw it before it learned to wait.'],
    outro: 'The fuse burns out. The Volatile is lit.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // no quiet to brew in: knells and marks one after another, so a vial is never kept long
      k.loop([[3, () => k.knell(3900, 3)], [4.5, () => k.blow(8500, 4)], [4.5, () => k.knell(3900, 3)], [4.5, () => k.marks(2600, 4)]]);
    },
  },
});

// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
Object.assign(TRIALS, {
  glutton: {
    cls: 'gorgemaw', spec: 'glutton', name: 'The Last Banquet',
    lore: ['The King\'s last feast ran seven courses and no one left the table.', 'One guest ate the cooks\' every trick, twice over, and asked for more.'],
    outro: 'The table is bare. The Glutton is not full.',
    allies: ['ranger:base'], seconds: 58, enrage: 64, regen: 0.01,
    script(f, k, me) {
      // the courses come in pairs: the same dish twice, and the second is always worse
      const twice = (fn) => { fn(); f.after(2.2, fn); };
      k.loop([[3, () => twice(() => k.swing('stomp', 7500, 3.5))], [8, () => twice(() => k.blow(8500, 3.5, 'Carving Knife', me.id))], [8, () => k.knell(3000)], [5, () => {}]]);
    },
  },
  gizzard: {
    cls: 'gorgemaw', spec: 'gizzard', name: 'The Lean Winter',
    lore: ['The winter the Barrow was sealed, the stores ran dry by midwinter.', 'One soldier ate the frost itself and kept the others warm with it.'],
    outro: 'The thaw comes. The Gizzard feeds them all.',
    allies: ['ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 58, enrage: 150, regen: 0.004,
    script(f, k, me) {
      // the cold bites the whole line, and only what the tank swallows comes back as warmth
      k.loop([[3, () => k.swing('stomp', 6000, 3.5)], [5, () => k.knell(4400)], [4, () => k.blow(8000, 3.5, 'Frostbite', me.id)], [5, () => k.knell(4400)], [4, () => k.swing('stomp', 6000, 3.5)]]);
    },
  },
  guarantor: {
    cls: 'oathbroker', spec: 'guarantor', name: 'The Debtor\'s Daughter',
    lore: ['The King sentenced a debtor\'s child for her father\'s bond.', 'A knight signed his own name under hers.'],
    outro: 'The bond is honoured. The Guarantor stands surety.',
    allies: ['pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0.018,
    script(f, k, me) {
      // the Shade keeps reaching past the knight for the girl
      const her = () => f.alive().find(p => p.id !== me.id);
      const sentence = () => { const h = her(); if (h) k.blow(12500, 4.5, 'Debtor\'s Sentence', h.id); };
      k.loop([[4, sentence], [7, () => k.blow(6000, 3)], [6, sentence], [7, () => k.knell(2500)], [3, () => {}]]);
    },
  },
  collector: {
    cls: 'oathbroker', spec: 'collector', name: 'The Debt Called In',
    lore: ['The Shade owed the realm a crown\'s worth of blood.', 'A collector came to the Barrow with the ledger, and every page was due.'],
    outro: 'The account is closed. The Collector moves on.',
    allies: [], seconds: 62, enrage: 75, regen: 0.01,
    script(f, k, me) {
      // heavy, steady blows: everything the Shade lands goes in the book, and the book gets paid
      k.loop([[3, () => k.blow(7500, 3.2, 'Grave Strike', me.id)], [5, () => k.swing('stomp', 4500, 3.5)], [5, () => k.blow(7500, 3.2, 'Grave Strike', me.id)], [6, () => k.knell(2500)]]);
    },
  },
});
// ======================================================================= Ironpalm
Object.assign(TRIALS, {
  stillwater: {
    cls: 'ironpalm', spec: 'stillwater', name: 'The Quiet Water',
    lore: ['The King\'s sword-master struck faster than any shield could rise.', 'A monk met every stroke with an open hand, and breathed.'],
    outro: 'The sword is still. The Still Water is calm.',
    allies: [], seconds: 60, enrage: 80, regen: 0.012,
    script(f, k, me) {
      // quick strokes at the tank, one after another, each plain to see: every one a chance to Read
      const stroke = () => k.blow(6600, 1.8, 'Sword Stroke', me.id);
      k.loop([[2.5, stroke], [3.1, stroke], [3.1, stroke], [3.4, () => k.blow(10000, 3, 'Grave Cleave', me.id)], [4.5, () => k.swing('stomp', 4500, 3.5)]]);
    },
  },
  avalanche: {
    cls: 'ironpalm', spec: 'avalanche', name: 'The Mountain Road',
    lore: ['The Barrow sits under a mountain, and a monk once came down it.', 'He did not stop once on the way, and neither did the mountain.'],
    outro: 'The road ends at the throne. The Avalanche Fist arrives.',
    allies: ['cleric:base'], seconds: 55, enrage: 66, regen: 0,
    script(f, k, me) {
      // long, open stretches at the boss's side, broken only by a stomp to step out of: strings that never stop
      f.boss.anchor = true;
      k.loop([[6, () => k.blow(9000, 4, 'Grave Cleave', me.id)], [9, () => k.swing('stomp', 5000, 4)], [8, () => k.knell(2500)]]);
    },
  },
});

// ======================================================================= Threadweaver and Marionettist (classes-c)
Object.assign(TRIALS, {
  loomwright: {
    cls: 'threadweaver', spec: 'loomwright', name: 'The Living Web',
    lore: ['The King passed sentence on one courtier at a time, and each blow was meant to kill.', 'The weaver tied the whole court together, so no one stood alone.'],
    outro: 'The sentence falls on everyone, and no one falls. The Loomwright\'s web holds.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // a Royal Sentence on someone who isn't the tank: more than one person can take, spread along a web it's nothing
      const sentence = () => {
        const al = f.alive().filter(p => p.role !== 'tank');
        const t = al.length ? f.pick(al) : null;
        if (t) k.blow(21000, 4, 'Royal Sentence', t.id);
      };
      k.loop([[3, sentence], [6, () => k.knell(3000)], [5, sentence], [6, () => k.blow(9000, 4)], [5, sentence], [5, () => k.knell(3000)]]);
    },
  },
  shears: {
    cls: 'threadweaver', spec: 'shears', name: 'The Cut Thread',
    lore: ['In the Barrow\'s last winter, the court wore down a little every hour.', 'Then the marks came, and the seamstress cut every thread at once.'],
    outro: 'Every thread cut on time. The Shears close.',
    allies: ['bastion:base', 'ranger:base', 'shadowblade:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // the knells wear everyone down while the web carries it; then the Grave Marks pull everyone apart
      k.loop([[3, () => k.knell(3400, 3)], [4, () => k.blow(9000, 3.5)], [3.5, () => k.knell(3400, 3)], [3.5, () => k.marks(4200, 4.5)], [5, () => k.knell(3000, 3)], [3, () => {}]]);
    },
  },
  cuttingline: {
    cls: 'marionettist', spec: 'cuttingline', name: 'The Bladed String',
    lore: ['The court puppeteer strung her doll with wire.', 'She never came within reach of the King, and he never escaped her lines.'],
    outro: 'The lines are drawn. The Cutting Line holds.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 68, regen: 0,
    script(f, k) {
      // he holds the middle and stamps the ground around him again and again: stand well back and reach in with long strings
      f.boss.anchor = true;
      k.loop([[3, () => k.swing('stomp', 6500, 3.5)], [5, () => k.blow(9000, 3.5)], [4, () => k.swing('stomp', 6500, 3.5)], [5, () => k.knell(2500)]]);
    },
  },
  understudy: {
    cls: 'marionettist', spec: 'understudy', name: 'Two Dolls on One Bar',
    lore: ['The King\'s players staged one last performance as the Barrow fell.', 'Two dolls on one bar, and the whole court dancing between them.'],
    outro: 'The curtain falls to applause. The Understudy takes the stage.',
    allies: ['bastion:base', 'cleric:base', 'ranger:base'], seconds: 50, enrage: 62, regen: 0,
    script(f, k) {
      // a party racing the memory's end: he holds his ground, and every second he stands on the Stage counts
      f.boss.anchor = true;
      k.loop([[3, () => k.blow(9000, 4)], [6, () => k.swing('sweep', 6000, 4, Math.PI / 2)], [6, () => k.knell(2800)], [5, () => k.swing('sweep', 6000, 4, -Math.PI / 2)]]);
    },
  },
});

// ======================================================================= Gloomsworn (tank, class 18)
Object.assign(TRIALS, {
  duskward: {
    cls: 'gloomsworn', spec: 'duskward', name: 'The Night Watch',
    lore: ['The night the Barrow was sealed, one knight took the watch for the whole court.', 'Whatever fell on the others fell on her barrier first.'],
    outro: 'Dawn comes to the Barrow. The Sentinel keeps her watch.',
    allies: ['cleric:base', 'ranger:base'], guard: 'allies', seconds: 58, enrage: 150, regen: 0.004,
    script(f, k, me) {
      // blows at the others as often as at the knight: her barriers have to be where the next one lands
      const other = () => f.alive().find(p => p.id !== me.id && p.role === 'dps') || f.alive().find(p => p.id !== me.id);
      const at = (dmg, name) => () => { const t = other(); if (t) k.blow(dmg, 4, name, t.id); };
      k.loop([[4, () => k.blow(6500, 3.5, 'Grave Strike', me.id)], [5, () => k.knell(3000)], [5, at(5000, 'Lunge at the Watch')], [5, () => k.swing('stomp', 4500, 3.5)], [5, () => k.knell(3000)]]);
    },
  },
  duskreaver: {
    cls: 'gloomsworn', spec: 'duskreaver', name: 'The Hollow Knight',
    lore: ['A knight was cut down in the Barrow and did not stop.', 'He kept swinging, and the dark kept count.'],
    outro: 'The count is settled. The Reaver walks on.',
    allies: ['cleric:base'], seconds: 52, enrage: 70, regen: 0,
    script(f, k, me) {
      // heavy blows one after another on the knight, with a knell between: the killing blow lands, and a Hollow is how it is answered
      k.loop([[3, () => k.blow(9500, 3.5, 'Grave Cleave', me.id)], [3, () => k.blow(9500, 3.2, 'Grave Cleave', me.id)], [6, () => k.knell(2800)], [5, () => k.swing('stomp', 5000, 3.5)]]);
    },
  },
});

// ======================================================================= Reaper (id thresher; damage, class 19)
Object.assign(TRIALS, {
  sower: {
    cls: 'thresher', spec: 'sower', name: 'The Swift Reckoning',
    lore: ['The Barrow\'s dead woke restless the night the King fell.', 'Whoever marked them fast enough walked out before dawn.'],
    outro: 'The names are struck. The Wraith walks on.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 66, regen: 0,
    script(f, k) {
      // short gaps between blows: the afflictions have to be laid quickly and reaped on the run
      k.loop([[3, () => k.swing('stomp', 5500, 3)], [4, () => k.knell(2500)], [4, () => k.blow(8500, 3.5)], [4, () => k.swing('sweep', 5500, 3.5, Math.PI / 2)]]);
    },
  },
  grim: {
    cls: 'thresher', spec: 'grim', name: 'The Long Wait',
    lore: ['The old reaper never hurried a soul.', 'Each came due at its hour, and he was there.'],
    outro: 'The last name is struck. The Grim waits for the next.',
    allies: ['bastion:base', 'cleric:base'], seconds: 56, enrage: 70, regen: 0,
    script(f, k) {
      // long quiet stretches and then a heavy blow: time to build every affliction deep, and a reason to hold a Bind's pop for the blow
      f.boss.anchor = true;
      k.loop([[6, () => k.blow(9500, 4)], [7, () => k.knell(2800)], [6, () => k.swing('stomp', 6500, 4)], [6, () => k.knell(2800)]]);
    },
  },
});

// ======================================================================= Tidecaller (healer, class 20)
Object.assign(TRIALS, {
  springtide: {
    cls: 'tidecaller', spec: 'springtide', name: 'The High Water',
    lore: ['The King\'s bells rang the court to its knees, and they rang on the hour.', 'The singer by the black lake let the water climb, and met every bell with the flood.'],
    outro: 'Every bell met at high water. The Spring Tide rises.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // heavy knells on a steady beat, quiet between: the whole party hurt at once, and time for the water to climb again
      k.loop([[4, () => k.knell(4200, 4)], [7, () => k.blow(8500, 4)], [7, () => k.knell(4200, 4)], [6, () => {}]]);
    },
  },
  undertow: {
    cls: 'tidecaller', spec: 'undertow', name: 'The Deep Pull',
    lore: ['The court wore away a little at a time, a cut here, a chill there.', 'The singer pulled each hurt down into the deep and gave it back slowly.'],
    outro: 'Nothing left to wear away. The Undertow holds.',
    allies: ['bastion:base', 'ranger:base', 'shadowblade:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // a long grind: small knells over and over and blows on the tank between them, never one great hit
      k.loop([[3, () => k.knell(2200, 3)], [4, () => k.blow(8000, 3.5)], [3, () => k.knell(2200, 3)], [4, () => k.swing('stomp', 4500, 3.5)]]);
    },
  },
});

// the boss definition FightSim runs for a trial
function trialDef(specId) {
  const T = TRIALS[specId];
  if (!T) return null;
  const party = [CLASSES.find(c => c.id === T.cls).role, ...T.allies.map(a => CLASSES.find(c => c.id === a.split(':')[0]).role)];
  const hp = Math.round(T.seconds * party.reduce((s, r) => s + TRIAL_RATE[r], 0));
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

// ======================================================================= Lanternkeeper (healer, class 21)
Object.assign(TRIALS, {
  beacon: {
    cls: 'lanternkeeper', spec: 'beacon', name: 'The Fixed Star',
    lore: ['The court gathered where the old fires had burned, and the bells rang them down.', 'The keeper raised two tall lights and the court stood fast in them.'],
    outro: 'Two lights stood, and nobody left them. The Beacon burns.',
    allies: ['bastion:base', 'ranger:base', 'pyromancer:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // the whole party hurt together, again and again: a light everyone stands in pays for itself
      k.loop([[4, () => k.knell(3200, 4)], [6, () => k.blow(8000, 4)], [5, () => k.knell(3200, 4)], [5, () => {}]]);
    },
  },
  wayfarer: {
    cls: 'lanternkeeper', spec: 'wayfarer', name: 'The Road Lamp',
    lore: ['The court was never still: the dead walked, and the living had to walk with them.', 'The keeper walked ahead, and the light came after.'],
    outro: 'Every road lit behind you. The Wayfarer walks on.',
    allies: ['bastion:base', 'ranger:base', 'shadowblade:base'], guard: 'allies', seconds: 60, enrage: 150, regen: 0,
    script(f, k) {
      // steady knells and blows on the tank: healing that keeps up while you move
      k.loop([[3, () => k.knell(2400, 3)], [4, () => k.blow(8000, 3.5)], [3, () => k.knell(2400, 3)], [4, () => k.swing('stomp', 4500, 3.5)]]);
    },
  },
});

// ======================================================================= Kenseier (tank, class 22)
Object.assign(TRIALS, {
  deathblade: {
    cls: 'kenseier', spec: 'deathblade', name: 'The Last Duel',
    lore: ['The King\'s champion never raised his voice, and never missed a beat.', 'He let every stroke come, and answered the one that broke the other man\'s guard.'],
    outro: 'The guard breaks, and the duel with it. The Deathblade finishes what it began.',
    allies: ['ranger:base'], seconds: 55, enrage: 80, regen: 0.01,
    script(f, k, me) {
      // quick strokes at the knight on an even count, a heavy cleave among them: every one is a beat to catch, and a guard that breaks is the opening for the stroke that ends it
      const stroke = () => k.blow(5200, 2, 'Sword Stroke', me.id);
      k.loop([[2.5, stroke], [3, stroke], [3.2, stroke], [3.5, () => k.blow(9000, 3, 'Grave Cleave', me.id)], [4.5, () => k.swing('stomp', 4500, 3.5)]]);
    },
  },
  warden: {
    cls: 'kenseier', spec: 'warden', name: 'The Turned Blade',
    lore: ['The King\'s court was never safe from its own guards.', 'The warden stepped between each blade and the one it was meant for, and sent it home.'],
    outro: 'Every blade finds its way home. The Warden of the Ash holds the line.',
    allies: ['cleric:base', 'shadowblade:base'], guard: 'allies', seconds: 58, enrage: 150, regen: 0.004,
    script(f, k, me) {
      // heavy strokes at the others as often as at the knight: the blade has to be where the next one lands
      const other = () => f.alive().find(p => p.id !== me.id && p.role === 'dps') || f.alive().find(p => p.id !== me.id);
      const at = (dmg, name) => () => { const t = other(); if (t) k.blow(dmg, 3.2, name, t.id); };
      k.loop([[3, () => k.blow(6000, 3, 'Grave Strike', me.id)], [4, at(5200, 'Lunge at the Court')], [4, () => k.knell(2800)], [4, at(5200, 'Lunge at the Court')], [4, () => k.swing('stomp', 4500, 3.5)]]);
    },
  },
});

// ======================================================================= Houndmaster (melee damage, class 23)
Object.assign(TRIALS, {
  packleader: {
    cls: 'houndmaster', spec: 'packleader', name: 'The Court Hunt',
    lore: ['The court hunted on the barrow downs, two hounds to a huntsman.', 'The huntsman lost neither: whichever stood in the red went to the other\'s side before it fell.'],
    outro: 'Both hounds home, and the quarry down. The Pack Leader whistles them in.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 65, regen: 0,
    script(f, k) {
      // snares dropped on the flanks of the Shade, one side then the other: the hound that stands in one has to be somewhere else by the time it springs
      const B = f.boss;
      const snare = (side, dmg) => () => {
        const a = B.facing + side * Math.PI / 2, x = B.x + Math.cos(a) * 125, y = B.y + Math.sin(a) * 125;
        f.cast('Hound Snare', f.ct(3.5), 'stomp');
        f.mech({ type: 'aoe', shape: { kind: 'circle', x, y, r: 105 }, delay: f.ct(3.5), dmg, tag: 'stomp' });
      };
      k.loop([[3, snare(-1, 4000)], [5, snare(1, 4000)], [5, () => k.blow(9000, 4)], [5, snare(1, 4000)], [5, () => k.knell(2500)]]);
    },
  },
  lonewolf: {
    cls: 'houndmaster', spec: 'lonewolf', name: 'The Long Ride',
    lore: ['The King\'s riders crossed the barrow downs in a single run, and none of them looked back.', 'One huntsman rode a hound as big as a horse, and got off only to strike.'],
    outro: 'The ride is run. The Lone Wolf gets down and walks home.',
    allies: ['bastion:base', 'cleric:base'], seconds: 55, enrage: 70, regen: 0,
    script(f, k) {
      // in close, then far out, then in again: long runs across the hall, and a rider covers them
      k.loop([[3, () => k.swing('ring', 6000, 4)], [5.5, () => k.swing('stomp', 6000, 4)], [5.5, () => k.blow(9000, 4)], [5, () => k.swing('ring', 6000, 4)], [5.5, () => k.knell(2500)]]);
    },
  },
});

if (typeof module !== 'undefined') module.exports = { TRIALS, trialDef, trialMoves };
