// The Founding: the mode's data (kits, upgrades, enemies, waves, quests, items, boons, gold). Pure data plus small pure
// helpers, no DOM and no Net, so the host's sim (founding/sim.js), the client UI and tools/founding-test.js all read it.
// Numbers are small, as in the game: a hero has hundreds of health, hits are in tens. Rank arrays are indexed rank-1.
// Ranks (2026-10-29): Q W E take five ranks, R three, and the passive two upgrade ranks (rank 0 is the passive as it always was). The level each
// rank opens at is LEVELS.gate(slot, rank). A skill's rank arrays are as long as its maxRank (rk() clamps, so a rank 0 reads rank 1).

const FOUNDING_DATA = (() => {
  const SLOTS = ['q', 'w', 'e', 'r'];
  const rk = (arr, r) => arr[Math.max(1, Math.min(r, arr.length)) - 1];
  const pct = x => Math.round(x * 100);

  // ---------------------------------------------------------------- the four kits
  // type: unit (locks on; tgt says which side), ground (reticle at the cursor), shot (skillshot toward the cursor), self.
  // shape is what the client's reticle draws: circle | ball | line | wall | blink. range may be a number or a rank array.
  const KITS = {
    bastion: {
      id: 'bastion', name: 'Bastion', title: 'Holds the lane', role: 'tank', hp: 230, hpL: 22, range: 32, aaCd: 0.9, aaDmg: 15, speed: 150,
      passive: { name: 'Perfect Block', text: 'Enemies wind up their blows in red. A hit that lands inside your Brace is blocked outright: a cone of holy light bursts out ahead of you, damaging and knocking back what stands in it and flinging the fallen away. It also resets Shield Bash.',
        maxRank: 2, pb: [{ half: Math.PI / 4, reach: 150, dmg: 14, shield: 0 }, { half: Math.PI / 3, reach: 180, dmg: 22, shield: 0 }, { half: Math.PI, reach: 200, dmg: 30, shield: 30 }],
        ranks: ['The cone widens and reaches farther, and it hits harder.', 'The burst rings out all around you and wraps you in a shield.'] },
      skills: {
        q: { name: 'Shield Bash', type: 'unit', tgt: 'enemy', shape: null, maxRank: 5, range: 42, wind: 0.18, cd: [7, 7, 6.5, 6, 5.5], dmg: [24, 28, 32, 36, 40], stun: [1, 1.5, 2, 2.4, 2.8],
          text: 'Slam the target with your shield: a little damage and a stun. Walks into reach first. A Perfect Block resets this at once.', rank: r => `${rk([24, 28, 32, 36, 40], r)} damage, stun ${rk([1, 1.5, 2, 2.4, 2.8], r)} s`,
          ups: [
            { id: 'ricochet', name: 'Ricochet', text: 'The shield bounces on to a second enemy nearby and stuns it briefly.' },
            { id: 'concussive', name: 'Concussive', text: 'Enemies around the target are knocked back.' },
            { id: 'shieldcharge', name: 'Shield Charge', text: 'Cast from afar: Bastion charges to the target.' }] },
        w: { name: 'Hold the Line', type: 'ground', shape: 'circle', maxRank: 5, range: 200, wind: 0.3, cd: [14, 14, 14, 13, 12], rad: [80, 100, 120, 135, 150], slow: [0.3, 0.4, 0.5, 0.55, 0.6], dur: [5, 5, 5.5, 6, 7],
          text: 'Plant a banner. Enemies inside are taunted onto you and slowed.', rank: r => `Radius ${rk([80, 100, 120, 135, 150], r)}, slow ${pct(rk([0.3, 0.4, 0.5, 0.55, 0.6], r))}%, ${rk([5, 5, 5.5, 6, 7], r)} s` + (r >= 5 ? ', you take less damage inside it' : ''),
          ups: [
            { id: 'rally', name: 'Rallying Banner', text: 'Allies inside the banner move and attack faster.' },
            { id: 'ironground', name: 'Iron Ground', text: 'Planting it roots the elites inside for a moment.' },
            { id: 'longwatch', name: 'Long Watch', text: 'Lasts twice as long, and can be picked up and planted again once.' }] },
        e: { name: 'Brace', type: 'self', shape: null, maxRank: 5, wind: 0, cd: [6, 4.5, 3, 2.6, 2.2], window: [0.45, 0.45, 0.5, 0.55, 0.6],
          text: 'Raise your shield for a split second. Any blow that lands in that window is a Perfect Block. Time it to the red wind-up.', rank: r => `Cooldown ${rk([6, 4.5, 3, 2.6, 2.2], r)} s, window ${rk([0.45, 0.45, 0.5, 0.55, 0.6], r)} s`,
          ups: [
            { id: 'bulwarkstep', name: 'Bulwark Step', text: 'Brace works on the move and lunges a short way forward.' },
            { id: 'sharedshield', name: 'Shared Shield', text: 'Also shields the nearest ally.' },
            { id: 'secondwind', name: 'Second Wind', text: 'Each Perfect Block heals Bastion.' }] },
        r: { name: 'The Wall', type: 'ground', shape: 'wall', maxRank: 3, range: 260, wind: 0.4, cd: [40, 36, 32], len: [270, 330, 390], hp: [450, 650, 900], dur: [8, 9, 10],
          text: 'Raise a shield wall across the lane at the cursor. The wave piles up behind it and has to break it down.', rank: r => `Wall ${rk([270, 330, 390], r)} wide, ${rk([450, 650, 900], r)} strength, ${rk([8, 9, 10], r)} s` + (r >= 2 ? ', shoves back what it lands on' : '') + (r >= 3 ? ' and stuns it' : ''),
          ups: [
            { id: 'spikedwall', name: 'Spiked Wall', text: 'Enemies pressing on the wall take damage.' },
            { id: 'longwall', name: 'Long Wall', text: 'Half again as long, and it lasts longer.' },
            { id: 'collapse', name: 'Collapse', text: 'When it ends it falls forward and stuns everything in front.' }] },
      },
    },
    cleric: {
      id: 'cleric', name: 'Cleric', title: 'Keeps everyone standing', role: 'heal', hp: 150, hpL: 12, range: 160, aaCd: 1, aaDmg: 10, speed: 150,
      passive: { name: 'Dawn Petals', text: 'A petal regrows every few seconds (up to three). Mend spends one. Petals regrow far faster while you stand at the fountain.',
        maxRank: 2, petal: [{ t: 6, smite: 0, free: false }, { t: 4, smite: 1.5, free: false }, { t: 3, smite: 1.5, free: true }],
        ranks: ['A petal regrows in four seconds, and every Smite that lands brings the next one sooner.', 'A petal regrows in three seconds, and a Mend cast while all three petals are up costs none.'] },
      skills: {
        q: { name: 'Mend', type: 'unit', tgt: 'ally', shape: null, maxRank: 5, range: 220, wind: 0.2, cd: [1.5, 1.5, 1.5, 1.5, 1.5], heal: [60, 90, 120, 150, 180], dur: 4,
          text: 'Spend a petal: the ally heals over time. With no ally chosen it mends you.', rank: r => `Heals ${rk([60, 90, 120, 150, 180], r)} over 4 s` + (r >= 5 ? ', and keeps its petal on an ally under half health' : ''),
          ups: [
            { id: 'chainmend', name: 'Chain Mend', text: 'Jumps to a second ally nearby.' },
            { id: 'swiftmend', name: 'Swift Mend', text: 'Instant, and you can cast it on the move.' },
            { id: 'overflow', name: 'Overflow', text: 'Healing past full becomes a shield.' }] },
        w: { name: 'Smite', type: 'unit', tgt: 'enemy', shape: null, maxRank: 5, range: 230, wind: 0.25, cd: [4.5, 4.5, 4.5, 4.2, 4], dmg: [22, 32, 42, 52, 62], splash: [8, 12, 16, 20, 24], splashR: 90,
          text: 'Call down a column of light on the target. Allies near the target are healed a little.', rank: r => `${rk([22, 32, 42, 52, 62], r)} damage, heals allies near it for ${rk([8, 12, 16, 20, 24], r)}`,
          ups: [
            { id: 'searing', name: 'Searing', text: 'Leaves a burn on the target.' },
            { id: 'judgement', name: 'Judgement', text: 'Stuns an elite briefly.' },
            { id: 'radiant', name: 'Radiant', text: 'The splash heal becomes a wide ring that also hurts the enemies around the target.' }] },
        e: { name: 'Sanctum', type: 'ground', shape: 'circle', maxRank: 5, range: 220, wind: 0.3, cd: [14, 14, 14, 13, 12], rad: [80, 100, 120, 135, 150], heal: [8, 12, 16, 20, 24], burn: [6, 9, 12, 15, 18], dur: [6, 6, 6, 7, 8],
          text: 'Consecrate the ground: allies inside are healed each second, enemies inside are burned.', rank: r => `Radius ${rk([80, 100, 120, 135, 150], r)}, heals ${rk([8, 12, 16, 20, 24], r)}/s, burns ${rk([6, 9, 12, 15, 18], r)}/s, ${rk([6, 6, 6, 7, 8], r)} s`,
          ups: [
            { id: 'hallowed', name: 'Hallowed', text: 'Enemies inside are slowed.' },
            { id: 'wanderinglight', name: 'Wandering Light', text: 'Cast again to move it once.' },
            { id: 'twinsanctum', name: 'Twin Sanctum', text: 'Two charges.' }] },
        r: { name: 'Dawn Breaks', type: 'ground', shape: 'circle', maxRank: 3, range: 240, wind: 0.7, cd: [60, 54, 48], rad: [150, 190, 230], heal: [50, 90, 140], raise: [0.6, 0.8, 1], safe: [0.6, 1.5, 2.5],
          text: 'A pillar of dawn: every fallen hero in the circle is raised at once, and everyone inside is healed.', rank: r => `Radius ${rk([150, 190, 230], r)}, raises the fallen at ${pct(rk([0.6, 0.8, 1], r))}% health` + (r >= 2 ? ` and safe for ${rk([0.6, 1.5, 2.5], r)} s` : '') + `, heals ${rk([50, 90, 140], r)}`,
          ups: [
            { id: 'morningglory', name: 'Morning Glory', text: 'The raised rise at full health and cannot be hurt for a moment.' },
            { id: 'blindingdawn', name: 'Blinding Dawn', text: 'Enemies in the circle stop attacking for a moment.' },
            { id: 'earlylight', name: 'Early Light', text: 'A much shorter cooldown.' }] },
      },
    },
    pyromancer: {
      id: 'pyromancer', name: 'Pyromancer', title: 'Wave clear', role: 'dps', hp: 135, hpL: 11, range: 175, aaCd: 1, aaDmg: 8, speed: 150,
      passive: { name: 'Hot Streak', text: 'Your bolts and Fireballs can crit. Two crits in a row make the next Fireball instant, with double the blast.',
        maxRank: 2, crit: [0.4, 0.5, 0.5], hot: [1, 1, 2], ground: [0, 1, 1],
        ranks: ['Crits come half again as often, and a Hot Streak Fireball leaves burning ground where it lands.', 'A Hot Streak lasts for your next two Fireballs.'] },
      skills: {
        q: { name: 'Fireball', type: 'shot', shape: 'ball', maxRank: 5, range: 380, wind: 0.45, cd: [3.5, 3, 2.5, 2.3, 2.1], dmg: [28, 38, 48, 58, 68], rad: [50, 62, 74, 82, 90], speed: 470,
          text: 'Hurl a fireball toward the cursor. It bursts on the first enemy it meets. Instant on Hot Streak, with a double blast.', rank: r => `${rk([28, 38, 48, 58, 68], r)} damage, blast ${rk([50, 62, 74, 82, 90], r)}, cooldown ${rk([3.5, 3, 2.5, 2.3, 2.1], r)} s`,
          ups: [
            { id: 'split', name: 'Split', text: 'On impact it splits into three small fireballs.' },
            { id: 'scorchedpath', name: 'Scorched Path', text: 'Leaves a line of fire along its flight.' },
            { id: 'twinflame', name: 'Twin Flame', text: 'Two charges.' }] },
        w: { name: 'Flame Circle', type: 'ground', shape: 'circle', maxRank: 5, range: 220, wind: 0.3, cd: [9, 9, 9, 8.5, 8], rad: [70, 80, 90, 100, 110], dmg: [30, 40, 50, 60, 70], delay: 0.9, stun: [0, 1, 1.5, 1.8, 2],
          text: 'Light a circle of fire. It erupts a moment later. Higher ranks add a stun, then leave burning ground.', rank: r => `${rk([30, 40, 50, 60, 70], r)} damage, radius ${rk([70, 80, 90, 100, 110], r)}` + (r >= 2 ? `, stun ${rk([0, 1, 1.5, 1.8, 2], r)} s` : '') + (r >= 3 ? ', burning ground' : ''),
          ups: [
            { id: 'wildfire', name: 'Wildfire', text: 'A wider ring.' },
            { id: 'updraft', name: 'Updraft', text: 'Draws enemies to the centre before it erupts.' },
            { id: 'aftershock', name: 'Aftershock', text: 'Erupts a second time.' }] },
        e: { name: 'Firestep', type: 'ground', shape: 'blink', maxRank: 5, range: [130, 160, 190, 215, 240], wind: 0, cd: [9, 8, 7, 6.5, 6], trail: [2, 3, 4, 4.5, 5],
          text: 'Blink toward the cursor, leaving a trail of fire that burns anything crossing it.', rank: r => `Hop ${rk([130, 160, 190, 215, 240], r)}, trail ${rk([2, 3, 4, 4.5, 5], r)} s, cooldown ${rk([9, 8, 7, 6.5, 6], r)} s`,
          ups: [
            { id: 'doublestep', name: 'Double Step', text: 'Two charges.' },
            { id: 'landingblast', name: 'Landing Blast', text: 'Bursts where you land.' },
            { id: 'longstride', name: 'Long Stride', text: 'Twice the range, and a longer, hotter trail.' }] },
        r: { name: 'Meteor', type: 'ground', shape: 'circle', maxRank: 3, range: 300, wind: 0.6, cd: [45, 42, 38], rad: [120, 135, 150], dmg: [420, 650, 950], crater: [10, 14, 18], delay: 1.6,
          text: 'Call a meteor: a growing shadow, then a huge impact and a burning crater. The big damage of your kit.', rank: r => `${rk([420, 650, 950], r)} damage at the centre, radius ${rk([120, 135, 150], r)}, cooldown ${rk([45, 42, 38], r)} s, crater burns ${rk([10, 14, 18], r)}/s`,
          ups: [
            { id: 'shower', name: 'Shower', text: 'Three smaller meteors fall around it.' },
            { id: 'plummet', name: 'Plummet', text: 'Lands sooner.' },
            { id: 'moltencrater', name: 'Molten Crater', text: 'The crater burns much longer and slows.' }] },
      },
    },
    ranger: {
      id: 'ranger', name: 'Ranger', title: 'Elites and bosses', role: 'dps', hp: 150, hpL: 12, range: 230, aaCd: 0.85, aaDmg: 9, speed: 155,
      passive: { name: 'Keen Eye', text: 'Shots at one target come faster and faster. Every fourth shot pierces in a line. Changing target resets it.',
        maxRank: 2, every: [4, 3, 3], pierce: [1.3, 1.3, 1.8], keep: [0, 0, 3],
        ranks: ['Every third shot pierces, not every fourth.', 'The piercing shot hits much harder, and changing target keeps part of your speed.'] },
      skills: {
        q: { name: 'Piercing Arrow', type: 'shot', shape: 'line', maxRank: 5, range: 300, wind: 0.28, cd: [4, 4, 4, 3.7, 3.4], len: [320, 400, 480, 540, 600], wid: 16, dmg: [30, 42, 54, 66, 78],
          text: 'Loose a heavy arrow along a line toward the cursor, hitting everything it passes through.', rank: r => `${rk([30, 42, 54, 66, 78], r)} damage, length ${rk([320, 400, 480, 540, 600], r)}`,
          ups: [
            { id: 'longshot', name: 'Longshot', text: 'Hits harder the farther it has flown.' },
            { id: 'splinter', name: 'Splinter', text: 'Each enemy pierced throws splinters sideways.' },
            { id: 'twinarrow', name: 'Twin Arrow', text: 'Two arrows in a narrow V.' }] },
        w: { name: 'Explosive Trap', type: 'ground', shape: 'circle', maxRank: 5, range: 200, wind: 0.2, cd: [6, 6, 6, 5.5, 5], rad: [70, 85, 100, 110, 120], dmg: [25, 35, 45, 55, 65], slow: [0.4, 0.5, 0.6, 0.65, 0.7], slowT: [2, 3, 4, 4.5, 5], cap: [3, 3, 3, 4, 4], arm: 0.8,
          text: 'Set a trap that arms, then bursts when an enemy comes near, slowing everything in the blast. Up to three at once.', rank: r => `${rk([25, 35, 45, 55, 65], r)} damage, radius ${rk([70, 85, 100, 110, 120], r)}, slow ${pct(rk([0.4, 0.5, 0.6, 0.65, 0.7], r))}%, up to ${rk([3, 3, 3, 4, 4], r)} down`,
          ups: [
            { id: 'tripwire', name: 'Tripwire', text: 'Two traps laid at once, joined by a wire that also sets them off.' },
            { id: 'cluster', name: 'Cluster', text: 'The burst throws three bomblets.' },
            { id: 'hairtrigger', name: 'Hair Trigger', text: 'Arms at once, and up to five can be down.' }] },
        e: { name: "Hunter's Mark", type: 'unit', tgt: 'enemy', shape: null, maxRank: 5, range: 320, wind: 0.2, cd: [10, 10, 10, 9, 8], mult: [1.25, 1.35, 1.45, 1.55, 1.65], dur: [6, 8, 10, 11, 12],
          text: 'Mark the target. It takes extra damage from everyone for a time.', rank: r => `+${pct(rk([1.25, 1.35, 1.45, 1.55, 1.65], r) - 1)}% damage taken for ${rk([6, 8, 10, 11, 12], r)} s`,
          ups: [
            { id: 'bounty', name: 'Bounty', text: 'A marked kill drops extra gold.' },
            { id: 'passingmark', name: 'Passing Mark', text: 'When the marked enemy dies, the mark jumps to the nearest one.' },
            { id: 'exposed', name: 'Exposed', text: 'The marked enemy is also slowed and takes more.' }] },
        r: { name: 'Starfall Volley', type: 'ground', shape: 'circle', maxRank: 3, range: 320, wind: 0.45, cd: [40, 36, 32], rad: [130, 145, 160], dmg: [100, 150, 220], dur: [3, 3.5, 4], blast: 38,
          text: 'Call a storm of arrows over an area for a few seconds, each landing with its own blast. The big damage of your kit.', rank: r => `${rk([100, 150, 220], r)} damage per arrow, radius ${rk([130, 145, 160], r)}, ${rk([3, 3.5, 4], r)} s of arrows, cooldown ${rk([40, 36, 32], r)} s`,
          ups: [
            { id: 'pinningstars', name: 'Pinning Stars', text: 'The arrows pin enemies in place.' },
            { id: 'longrain', name: 'Long Rain', text: 'Lasts much longer.' },
            { id: 'guidedstars', name: 'Guided Stars', text: 'The volley follows your cursor while it falls.' }] },
      },
    },
  };
  const HERO_IDS = ['bastion', 'cleric', 'pyromancer', 'ranger'];
  for (const id of HERO_IDS) { const K = KITS[id]; K.skills.p = K.passive; K.passive.rank = r => (r >= 1 ? K.passive.ranks[Math.min(r, K.passive.ranks.length) - 1] : 'Always on.'); }

  // every upgrade by id, with where it lives
  const UPGRADES = {};
  for (const hid of HERO_IDS) for (const s of SLOTS) KITS[hid].skills[s].ups.forEach((u, i) => { u.hero = hid; u.slot = s; u.idx = i; UPGRADES[u.id] = u; });
  // price of the next upgrade on a skill: the order you buy them in is the choice (R's cost a little more)
  const UP_PRICE = [50, 85, 130], UP_PRICE_R = [80, 120, 170];
  const upgradePrice = (slot, ownedOnSkill) => (slot === 'r' ? UP_PRICE_R : UP_PRICE)[Math.min(2, ownedOnSkill)];

  // ---------------------------------------------------------------- enemies (founding originals)
  // atk: wind (red wind-up, s), cd, dmg, hitR (strike radius), reach (gap to the target), off (strike centre ahead of it).
  // tele: the strike also sends a telegraph event (heavy blows); the rest set the winding flag and the client draws a small red circle.
  const ENEMIES = {
    ashling: { name: 'Ashling', r: 14, hp: 55, speed: 52, aggro: 100, xp: 12, gold: 3, atk: { wind: 0.55, cd: 1.3, dmg: 7, hitR: 24, reach: 14, off: 22 } },
    streak: { name: 'Ember Streak', r: 11, hp: 32, speed: 118, aggro: 90, xp: 8, gold: 3, runner: true, atk: { wind: 0.4, cd: 1.0, dmg: 5, hitR: 20, reach: 12, off: 18 } },
    slagback: { name: 'Slagback', r: 19, hp: 120, speed: 40, aggro: 110, xp: 20, gold: 6, shield: { half: 1.2, mult: 0.5 }, atk: { wind: 0.7, cd: 1.6, dmg: 9, hitR: 34, reach: 16, off: 26 } },
    spitter: { name: 'Cinderspitter', r: 13, hp: 40, speed: 44, aggro: 260, xp: 16, gold: 5, ranged: true, atk: { wind: 1.2, cd: 2.6, dmg: 12, hitR: 50, range: 240, tele: true } },
    brute: { name: 'Ashen Brute', r: 26, hp: 300, speed: 36, aggro: 140, xp: 60, gold: 25, elite: true, kbRes: 0.4, drop: 1, atk: { wind: 1.0, cd: 2.4, dmg: 22, hitR: 72, reach: 14, off: 40, tele: true } },
    tunnelmaw: { name: 'Tunnelmaw', r: 40, hp: 3300, speed: 50, aggro: 0, xp: 500, gold: 100, elite: true, boss: true, kbRes: 1, drop: 2, atk: { wind: 1.1, cd: 2.0, dmg: 26, hitR: 90, reach: 20, off: 0, tele: true } },
    // ---- later waves (new kinds are appended: the numeric type index of the older ones never changes)
    // hide: only seen in light (the sim sets FLAG.HIDDEN in the dark; its strikes always send a telegraph). hunt: goes for heroes who carry quest objects.
    stalker: { name: 'Night Stalker', r: 12, hp: 46, speed: 96, aggro: 150, xp: 14, gold: 4, hide: true, atk: { wind: 0.5, cd: 1.2, dmg: 7, hitR: 24, reach: 12, off: 20, tele: true } },
    cartburner: { name: 'Cart-Burner', r: 13, hp: 62, speed: 88, aggro: 90, xp: 14, gold: 5, runner: true, hunt: true, objMul: 2, atk: { wind: 0.5, cd: 1.0, dmg: 6, hitR: 22, reach: 12, off: 18 } },
    husk: { name: 'Ash Husk', r: 22, hp: 220, speed: 38, aggro: 120, xp: 40, gold: 14, elite: true, kbRes: 0.3, drop: 1, shield: { half: 1.0, mult: 0.55 }, atk: { wind: 0.9, cd: 2.0, dmg: 16, hitR: 56, reach: 14, off: 34, tele: true } },
    whelp: { name: 'Ash-Whelp', r: 10, hp: 24, speed: 106, aggro: 130, xp: 4, gold: 1, atk: { wind: 0.4, cd: 1.0, dmg: 4, hitR: 18, reach: 10, off: 16 } },
    wickeater: { name: 'The Wick-Eater', r: 34, hp: 5800, speed: 44, aggro: 0, xp: 600, gold: 120, elite: true, boss: true, kbRes: 1, drop: 2, atk: { wind: 1.1, cd: 2.0, dmg: 24, hitR: 80, reach: 20, off: 0, tele: true } },
    wickshade: { name: 'Wick Shade', r: 16, hp: 140, speed: 58, aggro: 200, devour: true, xp: 30, gold: 10, hide: true, kbRes: 0.5, atk: { wind: 0.9, cd: 2.4, dmg: 12, hitR: 60, reach: 14, off: 30, tele: true } },
    mirebull: { name: 'The Mirebull', r: 48, hp: 8500, speed: 42, aggro: 0, xp: 750, gold: 140, elite: true, boss: true, kbRes: 1, drop: 2, atk: { wind: 1.2, cd: 2.0, dmg: 26, hitR: 90, reach: 20, off: 0, tele: true } },
    damlog: { name: 'Dam Log', r: 26, hp: 3500, speed: 0, aggro: 0, xp: 40, gold: 10, inert: true, kbRes: 1, atk: { wind: 1, cd: 9, dmg: 0, hitR: 1, reach: 1, off: 0 } },
    oldgnaw: { name: 'Old Gnaw', r: 72, hp: 205000, speed: 28, aggro: 0, xp: 1500, gold: 300, elite: true, boss: true, kbRes: 1, drop: 3, atk: { wind: 1.4, cd: 2.0, dmg: 30, hitR: 170, reach: 20, off: 0, tele: true } },
  };
  const ENEMY_IDS = Object.keys(ENEMIES);   // the numeric `type` in fds is an index into this
  ENEMY_IDS.forEach((id, i) => { ENEMIES[id].id = id; ENEMIES[id].idx = i; });
  // feature modules (sim-wild.js, sim-chain.js) add their kinds at load, before any run; host and guests load the same scripts, so indexes match
  const addEnemy = (id, def) => { if (ENEMIES[id]) return ENEMIES[id]; def.id = id; def.idx = ENEMY_IDS.length; ENEMIES[id] = def; ENEMY_IDS.push(id); return def; };

  // ---------------------------------------------------------------- waves (the hour run). lane 0 = North Road, 1 = East Ford.
  // Thirty waves about 100 s apart. Each lane has its own fixed line-up that steps up at waves 5, 9, 13, 17, 21, 25 and 29 (tier 1..7),
  // one clear change per lane per step: kind 0 a unit added, 1 armour, 2 speed, 3 an elite. Night parts swap light-only enemies in
  // for some of the roster; cart-burners come with the hauling quests; the four main bosses come on top of the line-up.
  // Waves do not grow with the party (user, 2026-10-29): every party meets the same waves. A roster count is multiplied by WAVE_TUNE.mul
  // (elites by mulEl); growth comes from the tier steps and the slow crowd creep.
  const WAVE_T0 = 20, WAVE_GAP = 100;   // seconds: wave 1 arrives 20 s after the run starts, then one every 100 s (wave 30 at 49 min)
  const TIER_AT = [5, 9, 13, 17, 21, 25, 29];
  const tierOf = wave => { let t = 0; for (const w of TIER_AT) if (wave >= w) t++; return t; };
  const g = (lane, kind, n, at, gap, el) => ({ lane, kind, n, at, gap, el: !!el });
  // a roster entry is [kind, count for one hero, first spawn (s into the wave), gap between spawns, first wave it comes, elite?]
  const ro = (kind, n, at, gap, from, el) => ({ kind, n, at, gap, from: from || 1, el: !!el });
  const LANES = [
    { name: 'North Road',
      base: [ro('ashling', 4, 0, 1.8, 1), ro('streak', 2, 10, 1.8, 2), ro('slagback', 1, 8, 3, 3), ro('spitter', 1, 10, 3, 4)],
      steps: [
        { kind: 0, add: ro('slagback', 1, 6, 3) },
        { kind: 3, add: ro('brute', 1, 14, 1, 1, true) },
        { kind: 1, arm: 0.10 },
        { kind: 0, add: ro('spitter', 2, 12, 3) },
        { kind: 2, spd: 0.12 },
        { kind: 3, add: ro('husk', 2, 16, 4, 1, true) },
        { kind: 0, add: ro('slagback', 3, 8, 2.5) }] },
    { name: 'East Ford',
      base: [ro('ashling', 3, 6, 2.4, 1), ro('streak', 2, 9, 1.8, 3), ro('spitter', 1, 8, 3, 4), ro('slagback', 1, 12, 3, 4)],
      steps: [
        { kind: 3, add: ro('brute', 1, 18, 1, 1, true) },
        { kind: 0, add: ro('ashling', 3, 2, 1.6) },
        { kind: 2, spd: 0.12 },
        { kind: 0, add: ro('slagback', 2, 12, 3) },
        { kind: 1, arm: 0.10 },
        { kind: 3, add: ro('husk', 2, 14, 4, 1, true) },
        { kind: 0, add: ro('spitter', 2, 10, 3) }] },
  ];
  // armour (damage an enemy shrugs off) and speed an ordinary enemy of this lane carries at a tier
  const laneMods = (lane, tier) => { let arm = 0, spd = 0; for (let s = 0; s < tier; s++) { const st = LANES[lane].steps[s]; if (st.arm) arm += st.arm; if (st.spd) spd += st.spd; } return { arm, spd }; };
  const stepKind = (lane, tier) => LANES[lane].steps[tier - 1].kind;
  // the four main bosses [kind, lane, seconds into the wave]
  const BOSS_WAVES = { 8: ['tunnelmaw', 0, 5], 15: ['wickeater', 0, 5], 23: ['mirebull', 1, 5], 30: ['oldgnaw', 0, 10] };
  // WAVE_TUNE.crowd: ordinary groups grow this much per wave on top of the tiers (a slow creep); the boss lane is thinner on a boss wave
  const WAVE_TUNE = { mul: 2.8, mulEl: 1.8, crowd: 0.08, bossLane: 0.5, bossOther: 0.4, lateFrom: 17, late: 1.2 };   // late: from wave lateFrom on every group is this much bigger
  const CB_WAVES = [6, 9, 11, 13, 16, 18, 21];        // cart-burners ride with the hauling quests
  // the six parts of the run: [first wave, last wave, name, night?]
  const PARTS = [[1, 5, 'Day one', 0], [6, 10, 'Night one', 1], [11, 15, 'Day two', 0], [16, 20, 'Night two', 1], [21, 25, 'Day three', 0], [26, 30, 'The last night', 1]];
  const partOf = wave => { for (let i = 0; i < PARTS.length; i++) if (wave <= PARTS[i][1]) return i; return PARTS.length - 1; };
  const isNightWave = wave => !!PARTS[partOf(wave)][3];
  const NIGHT_STALK = [0.6, 0.6, 0.4];   // the stalkers' share of the fodder on night one, two and the last night (towers cannot see them in the dark)
  function buildWave(n) {
    const tier = tierOf(n), night = isNightWave(n), bw = BOSS_WAVES[n], groups = [];
    for (let lane = 0; lane < 2; lane++) {
      const ent = LANES[lane].base.slice(); for (let s = 0; s < tier; s++) if (LANES[lane].steps[s].add) ent.push(LANES[lane].steps[s].add);
      let mul = 1, delay = 0;
      if (bw) { if (bw[1] === lane) { mul = n === 30 ? 0 : WAVE_TUNE.bossLane; delay = 6; } else { mul = WAVE_TUNE.bossOther; delay = n === 30 ? 20 : 0; } }
      if (mul <= 0) continue;
      if (n >= WAVE_TUNE.lateFrom) mul *= WAVE_TUNE.late;
      for (const r of ent) {
        if (n < r.from) continue;
        const c = Math.max(1, Math.round(r.n * mul * (r.el ? WAVE_TUNE.mulEl : WAVE_TUNE.mul) * (r.el || !(r.kind === 'ashling' || r.kind === 'streak') ? 1 : 1 + WAVE_TUNE.crowd * (n - 1)))), at = r.at + delay;   // (only the fodder creeps up)
        if (night && r.kind === 'ashling') {   // the dark brings its own: half the fodder is swapped for stalkers
          groups.push(g(lane, 'ashling', Math.max(1, Math.ceil(c * 0.5)), at, r.gap, false));
          groups.push(g(lane, 'stalker', Math.max(1, Math.round(c * NIGHT_STALK[(partOf(n) - 1) >> 1])), at + 4, r.gap * 0.9, false));
        } else groups.push(g(lane, r.kind, c, at, r.gap, r.el));
      }
    }
    if (CB_WAVES.includes(n) && !bw) groups.push(g(n % 2, 'cartburner', n >= 16 ? 3 : 2, 5, 3, false));
    if (n >= 28 && n < 30) groups.push(g(0, 'wickshade', n >= 29 ? 2 : 1, 12, 5, true));   // the last night: shades that put the lamps out
    const w = { n, tier, part: partOf(n), groups };
    if (bw) { w.boss = bw[0]; w.bossLane = bw[1]; w.bossAt = bw[2]; }
    return w;
  }
  const WAVES = []; const rebuildWaves = () => { WAVES.length = 0; for (let n = 1; n <= 30; n++) WAVES.push(buildWave(n)); };   // (the tuning tool changes WAVE_TUNE and rebuilds)
  rebuildWaves();
  const LAST_WAVE = WAVES.length;
  const waveStartAt = n => WAVE_T0 + (n - 1) * WAVE_GAP;   // run seconds when wave n arrives
  // how dark it is, 0..1 (the sim multiplies by a peak): dusk into wave 6, dawn into 11, dusk into 16, dawn into 21, dusk into 26
  const nightFrac = t => {
    const ramp = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))), w6 = waveStartAt(6), w11 = waveStartAt(11), w16 = waveStartAt(16), w21 = waveStartAt(21), w26 = waveStartAt(26);
    return Math.max(0, Math.min(1, ramp(w6 - 35, w6 + 25) - ramp(w11 - 40, w11 + 30) + ramp(w16 - 35, w16 + 25) - ramp(w21 - 40, w21 + 30) + ramp(w26 - 35, w26 + 25)));
  };
  const CAMP_TAKE = 0.6;   // the camp is sturdier than a hero: strikes on it count for less
  // an ordinary enemy's health: gentle at first, then from wave HPS.lateFrom it climbs (levelled heroes and ultimates outgrow the tiers),
  // and from wave HPS.tailFrom the climb eases to HPS.tail of that (the heroes are at their best by then, so the last waves are not one wall). Not by party size.
  const HPS = { early: 0.06, lateFrom: 12, late: 0.48, tailFrom: 24, tail: 0.25 };
  const hpScale = wave => 1 + HPS.early * Math.max(0, wave - 1) + HPS.late * (Math.max(0, Math.min(wave, HPS.tailFrom) - HPS.lateFrom) + HPS.tail * Math.max(0, wave - HPS.tailFrom));
  const CAMP_HP = [3000, 1300, 850, 700];   // by party size: one hero cannot be in both lanes, so the camp lasts longer for a small party
  const campHp = players => CAMP_HP[Math.max(1, Math.min(4, players)) - 1];
  // a multiplier on the experience a dying enemy gives by party size (before the equal split among the heroes near it)
  const XP_MUL = [0.8, 1.1, 1.5, 1.7];
  const bySize = (a, n) => a[Math.max(1, Math.min(4, n)) - 1];
  // a main boss's (and a dam log's) health: a base (set for four heroes) times a gentle party step (user, 2026-10-29: 1x, 1.25x, 1.5x, 1.75x for 1-4 heroes)
  const BOSS_BASE = 1.5, LOG_BASE = 1.4, BOSS_SIZE = [1, 1.25, 1.5, 1.75];
  const DMG_PER_WAVE = 0.16;   // ordinary enemies hit harder as the run goes on, x(1 + this per wave after the first)
  const dmgScale = wave => 1 + DMG_PER_WAVE * Math.max(0, wave - 1);
  const SOLO_DMG = { bastion: 21.9, cleric: 14.3, pyromancer: 8.5, ranger: 7.7 };   // a lone hero deals this much more (the tank has no one to hit for him)
  const SOLO_CAMP = { bastion: 1.25, cleric: 1, pyromancer: 1, ranger: 1 };   // a lone melee tank cannot reach the spitters shooting the camp: it is sturdier for him
  const PARTY_DMG = [1, 2.1, 1.95, 1];   // by party size 1-4 (a lone hero has SOLO_DMG): a smaller party's heroes deal this much more, since the waves are the same for everyone
  const NO_DPS_DMG = 2.4;   // a pair with no damage dealer (tank and healer) deals this much more
  const SOLO_CLEAVE = 0.8;   // a lone Bastion's blows sweep: enemies beside the target take this share
  const bossHpMul = n => BOSS_BASE * bySize(BOSS_SIZE, n), logHpMul = n => LOG_BASE * bySize(BOSS_SIZE, n), xpMul = n => bySize(XP_MUL, n);

  // ---------------------------------------------------------------- quests (Day one)
  // states in fds: 0 not yet offered, 1 active, 2 done, 3 missed. A quest is offered when its wave spawns and judged when
  // its deadline wave spawns (deadline 7 = the end of Day one).
  const QUESTS = {
    spring: { id: 'spring', name: 'The Spring', giver: 'The Digger', offerWave: 1, deadlineWave: 4, gold: 12, xp: 60,
      text: 'The Digger has struck warm water. Stand by the dig and keep the leakers off it until the well is open.',
      done: 'The spring runs full: the fountain heals fully.', missed: 'The spring stays a trickle.',
      boons: ['wellspring', 'springstep', 'carriedwater'] },
    gate: { id: 'gate', name: 'Stone for the Gate', giver: 'The Steward', offerWave: 2, deadlineWave: 6, gold: 12, xp: 60,
      text: 'Stone carts climb the North Road to the gate site. A cart only rolls while a hero walks beside it, and the hungry things go for it.',
      done: 'A timber palisade stands across the North Road; its enemies must break it.', missed: 'The North Road stays open.',
      boons: ['stonemason', 'carthand', 'hardground'] },
    fire: { id: 'fire', name: 'The First Fire', giver: 'The Smith', offerWave: 3, deadlineWave: 7, gold: 12, xp: 60,
      text: 'The Smith lights the first forge on the river bank. Guard her while it catches; the East Ford turns toward her.',
      done: 'The forge opens and the shop stocks forged gear.', missed: 'The shop keeps only basics.',
      boons: ['tempered', 'emberedge', 'bellows'] },
  };
  Object.assign(QUESTS, {
    beacon: { id: 'beacon', name: 'The Beacon', giver: 'The Steward', offerWave: 5, deadlineWave: 9, gold: 12, xp: 70,
      text: 'Carry jars of lamp oil from the camp up to the beacon hill before the night grows. A jar slows you; set it down to fight, and pick it up again.',
      done: 'The beacon burns: the night is lit.', missed: 'The beacon stays cold: the nights are darker.',
      boons: ['lamplighter', 'steadyhands', 'brandbearer'] },
    road: { id: 'road', name: 'The Road', giver: 'The Steward', offerWave: 9, deadlineWave: 13, gold: 12, xp: 70,
      text: 'Plant lantern posts along the North Road. The founders lay the road to lead the hungry things away from the warmth.',
      done: 'The road leads part of every wave the long way round.', missed: 'They all come straight.',
      boons: ['roadwarden', 'pathfinder', 'stragglersbane'] },
    graves: { id: 'graves', name: 'The First Graves', giver: 'The Digger', offerWave: 11, deadlineWave: 15, gold: 12, xp: 70,
      text: 'Carry the founders lost in the night to the meadow and plant bluebells over them.',
      done: 'The meadow blesses the camp: once, a fallen hero rises by themselves.', missed: 'No blessing.',
      boons: ['lastrites', 'quiethands', 'bluebellbloom'] },
    stonegate: { id: 'stonegate', name: 'The Stone Gate', giver: 'The Steward', offerWave: 16, deadlineWave: 20, gold: 12, xp: 80,
      text: 'Haul the dressed stone to the gate, then stand at its back and carve the Words. A blow makes you lose your place.',
      done: 'A stone gate that holds far longer, and a page of the story.', missed: 'The palisade stays.',
      boons: ['stoneskin', 'chisel', 'laststand'] },
    roof: { id: 'roof', name: 'The Roof', giver: 'The Smith', offerWave: 18, deadlineWave: 22, gold: 12, xp: 80,
      text: 'Haul timber from the woods past the ford to raise the first roof in camp.',
      done: 'The hall stands: the camp mends a little between waves.', missed: 'No camp healing.',
      boons: ['hearthside', 'axehand', 'rafters'] },
    cover: { id: 'cover', name: 'The Covering', giver: 'The Steward', offerWave: 26, deadlineWave: 30, gold: 12, xp: 100, judgeAt: 'siege',
      text: 'Stand by the founders at the Hearth while they lay the capstone. Every hungry thing turns for the camp until it is done.',
      done: 'The Hearth is covered: the siege goes for the gate and the camp, not the Hearth.', missed: 'The siege comes for the uncovered Hearth with every strike.',
      boons: ['keeper', 'capstoneward', 'longnight'] },
  });
  const QUEST_ORDER = ['spring', 'gate', 'fire', 'beacon', 'road', 'graves', 'stonegate', 'roof', 'cover'];
  // feature modules (sim-quests.js) add their quests and boons at load: def as QUESTS above; it goes into QUEST_ORDER sorted by offerWave
  const addQuest = (def, boons) => { if (QUESTS[def.id]) return QUESTS[def.id]; QUESTS[def.id] = def; QUEST_ORDER.push(def.id); QUEST_ORDER.sort((x, y) => QUESTS[x].offerWave - QUESTS[y].offerWave); for (const b of boons || []) { b.quest = def.id; BOONS[b.id] = b; } return def; };
  const QUEST_TUNE = {
    digSecs: 36, digPerExtra: 6,          // seconds of an unbroken dig, + per extra hero
    cartSpeed: 40, cartHp: 150, cartNear: 100,
    carts: players => (players >= 3 ? 3 : 2),
    palHp: 140, palPerExtra: 60,          // palisade strength per delivered cart, + per extra hero
    smithHp: 150, smithPerExtra: 50, fireSecs: 50, firePerExtra: 6,
    // hauling quests: what is carried, how many for 1-4 heroes, where it is picked up and put down (the sim snaps these to walkable ground)
    carrySlow: 0.25,
    haul: {
      beacon: { kind: 'jar', code: 2, need: [3, 3, 4, 4], from: [3810, 4020], to: [1400, 1400], toR: 100 },
      graves: { kind: 'bier', code: 3, need: [2, 3, 4, 5], from: [2770, 3900], to: [1330, 3930], toR: 110, plantSecs: 1.6 },
      stonegate: { kind: 'stone', code: 4, need: [2, 3, 3, 4], from: [3970, 3590], to: [2620, 1745], toR: 100 },
      roof: { kind: 'timber', code: 5, need: [2, 3, 3, 4], from: [5700, 1170], to: [2660, 3930], toR: 110 },
    },
    posts: [4, 5, 6, 7], postSecs: 1.2,       // lantern posts to plant for 1-4 heroes
    carve: [2660, 1745], carveSecs: 30, carveRad: 70, carvePerExtra: 5,   // the Words: seconds of an unbroken channel; a hit loses back to the last quarter
    cover: [3200, 3780], coverSecs: 40, coverRad: 130, coverHelp: 0.4,   // the Covering: more hands speed it
    stoneGateHp: 900, stoneGatePerExtra: 250, roofHeal: 14, pickR: 90, dropHp: 40,
    brandSecs: 45, brandR: 190, lampR: 150, relightSecs: 0.8,
    fires: [[3760, 3764], [3400, 4300]],      // the camp fires a brand is lit from
  };

  // ---------------------------------------------------------------- boons (three per quest, each unique)
  const BOONS = {
    wellspring: { id: 'wellspring', quest: 'spring', name: 'Wellspring', text: 'Standing still heals you slowly anywhere.' },
    springstep: { id: 'springstep', quest: 'spring', name: 'Spring Step', text: 'After drinking at the fountain you move faster for a while.' },
    carriedwater: { id: 'carriedwater', quest: 'spring', name: 'Carried Water', text: 'A flask that refills at the fountain. Drink it anywhere.' },
    stonemason: { id: 'stonemason', quest: 'gate', name: 'Stonemason', text: 'Your stuns and roots last longer.' },
    carthand: { id: 'carthand', quest: 'gate', name: 'Cart Hand', text: 'You move faster while near an ally.' },
    hardground: { id: 'hardground', quest: 'gate', name: 'Hard Ground', text: 'You take less damage while you are alone in a lane.' },
    tempered: { id: 'tempered', quest: 'fire', name: 'Tempered', text: 'Your first hit on each enemy is a critical hit.' },
    emberedge: { id: 'emberedge', quest: 'fire', name: 'Ember Edge', text: 'Your attacks leave enemies smouldering.' },
    bellows: { id: 'bellows', quest: 'fire', name: 'Bellows', text: 'After you use R, your other cooldowns are cut short.' },
    lamplighter: { id: 'lamplighter', quest: 'beacon', name: 'Lamplighter', text: 'Your lamp shines nearly twice as wide, and enemies standing in it take a little more damage from you.' },
    steadyhands: { id: 'steadyhands', quest: 'beacon', name: 'Steady Hands', text: 'Carrying almost never slows you.' },
    brandbearer: { id: 'brandbearer', quest: 'beacon', name: 'Brandbearer', text: 'Your brand burns twice as long, and enemies that strike you while you hold one catch fire.' },
    roadwarden: { id: 'roadwarden', quest: 'road', name: 'Waywarden', text: 'In the glow of a lit post you deal more damage and take less.' },
    pathfinder: { id: 'pathfinder', quest: 'road', name: 'Pathfinder', text: 'After running for a couple of seconds without stopping, you move faster until you do.' },
    stragglersbane: { id: 'stragglersbane', quest: 'road', name: "Straggler's Bane", text: 'Enemies that come the long way round take more damage from you.' },
    lastrites: { id: 'lastrites', quest: 'graves', name: 'Last Rites', text: 'When an ally falls near you, you rage for a few seconds and deal more damage.' },
    quiethands: { id: 'quiethands', quest: 'graves', name: 'Quiet Hands', text: 'Four seconds without being hit, and you mend steadily.' },
    bluebellbloom: { id: 'bluebellbloom', quest: 'graves', name: 'Bluebell Bloom', text: 'When you rise from a fall, bluebells bloom: allies near you are healed and you cannot be hurt for a moment.' },
    stoneskin: { id: 'stoneskin', quest: 'stonegate', name: 'Stoneskin', text: 'After six quiet seconds, the next blow you take is cut to a third.' },
    chisel: { id: 'chisel', quest: 'stonegate', name: 'Chisel', text: 'Your hits crack what they strike: it takes a little more damage from everyone for a moment.' },
    laststand: { id: 'laststand', quest: 'stonegate', name: 'Last Stand', text: 'A blow that would kill you leaves you at one health instead. Once a minute.' },
    hearthside: { id: 'hearthside', quest: 'roof', name: 'Hearthside', text: 'In camp you mend quickly and your skills recharge faster.' },
    axehand: { id: 'axehand', quest: 'roof', name: 'Axe-Hand', text: 'Your basic attacks cleave: enemies beside the target take half.' },
    rafters: { id: 'rafters', quest: 'roof', name: 'Rafters', text: 'Coming back into camp after a long absence wraps you in a shield for a few seconds.' },
    keeper: { id: 'keeper', quest: 'cover', name: 'Keeper of the Flame', text: 'A brand you light at the camp fire never burns out.' },
    capstoneward: { id: 'capstoneward', quest: 'cover', name: 'Capstone Ward', text: 'After you cast R, allies around you are shielded.' },
    longnight: { id: 'longnight', quest: 'cover', name: 'Long Night', text: 'At night you take less damage and deal a little more.' },
  };

  // ---------------------------------------------------------------- items
  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythic'];
  const RARITY_COLORS = ['#b9b2a2', '#6fd08c', '#5b8def', '#c78bff', '#ffb048'];
  // stat keys: hp (flat), dmg/as/ms/cdr/armor/heal/range/area/gold/xp/leech (fractions), reg (hp per s), burn/echo (switches).
  // shop: 'basic' sells from the start, 'forged' only once The First Fire is done, 0 = found or forged only.
  // text is the stat line; pas is the passive (sim-items.js runs it, keyed by ip); hero marks an item that is about one hero's kit.
  const it = (id, rar, name, text, stats, price, shop, use, sec) => ({ id, rar, name, text, stats, price, shop, use: use || 0, sec: !!sec, ip: '', pas: '', hero: '' });   // sec: found only (a secret's reward), never dropped or forged
  const P = (x, ip, pas, hero) => { x.ip = ip; x.pas = pas; if (hero) x.hero = hero; return x; };   // give an item its passive (and, if it is a hero's, the hero)
  const ITEMS = [
    // ---- Common: plain and cheap, bought early and sold later
    it('jerkin', 0, 'Hide Jerkin', '+25 health.', { hp: 25 }, 18, 'basic'),
    it('whetstone', 0, 'Whetstone', '+8% damage.', { dmg: 0.08 }, 18, 'basic'),
    it('roadboots', 0, 'Road Boots', '+8% move speed.', { ms: 0.08 }, 18, 'basic'),
    it('cord', 0, "Fletcher's Cord", '+10% attack speed.', { as: 0.10 }, 18, 'basic'),
    it('draught', 0, 'Healing Draught', 'Use: heal 70. Used up.', {}, 15, 'basic', { heal: 70 }),
    // ---- Uncommon: a stat or one small trick
    it('ironvest', 1, 'Ironbound Vest', '+45 health, heals a little over time.', { hp: 45, reg: 0.8 }, 45, 'basic'),
    it('keenedge', 1, 'Keen Edge', '+14% damage.', { dmg: 0.14 }, 45, 'basic'),
    it('hawkfeather', 1, 'Hawk Feather', '+16% attack speed.', { as: 0.16 }, 45, 'basic'),
    it('thickdraught', 1, 'Thick Draught', 'Use: heal 130. Used up.', {}, 40, 'basic', { heal: 130 }),
    it('lampcharm', 1, 'Lamp Charm', '-10% cooldowns.', { cdr: 0.10 }, 45, 'basic'),
    P(it('owlcharm', 1, 'Owl Charm', '+15 health.', { hp: 15 }, 45, 'basic'), 'owl', 'At night you hit 14% harder.'),
    P(it('flintring', 1, 'Flint Ring', '+5% attack speed.', { as: 0.05 }, 45, 'basic'), 'flint', 'Every fourth basic attack hits half again as hard.'),
    P(it('wardthread', 1, 'Warding Thread', '+20 health.', { hp: 20 }, 45, 'basic'), 'ward', 'Casting a skill wraps you in a thin shield for a few seconds.'),
    P(it('porterstrap', 1, "Porter's Strap", '+20 health.', { hp: 20 }, 45, 0), 'porter', 'While you carry something you take 15% less damage and walk 12% faster.'),
    P(it('pilgrimcup', 1, "Pilgrim's Cup", '+25 health.', { hp: 25 }, 45, 0), 'cup', 'After a drink at the fountain you move 20% faster for a while.'),
    P(it('satchel', 1, "Scavenger's Satchel", '+10% gold.', { gold: 0.10 }, 45, 0), 'scav', 'Each kill you land pays 2 more gold.'),
    // ---- Rare: the first real passives, and a piece for each hero
    it('wardenplate', 2, "Warden's Plate", '+80 health, 8% less damage taken.', { hp: 80, armor: 0.08 }, 100, 'forged'),
    it('emberblade', 2, 'Ember Blade', '+20% damage. Your attacks leave a burn.', { dmg: 0.20, burn: 1 }, 100, 'forged'),
    it('longlens', 2, 'Long Lens', 'Skills reach 10% farther and blast 12% wider.', { range: 0.10, area: 0.12 }, 100, 'forged'),
    it('anklet', 2, "Sprinter's Anklet", '+18% move speed, +10% attack speed.', { ms: 0.18, as: 0.10 }, 100, 'forged'),
    P(it('watchlamp', 2, "Watchman's Lamp", 'Your lamp shines 40% wider, and you heal a little over time.', { sight: 0.4, reg: 1 }, 100, 'forged'), 'lampdmg', 'In the light of a lit post you hit 12% harder.'),
    P(it('ramhorn', 2, "Ram's Horn", '+60 health.', { hp: 60 }, 100, 'forged'), 'ram', 'Shield Bash also stuns the enemies beside its target.', 'bastion'),
    P(it('petalpouch', 2, 'Petal Pouch', '+12% healing.', { heal: 0.12 }, 100, 'forged'), 'petal', 'Dawn Petals regrow twice as fast.', 'cleric'),
    P(it('coalpouch', 2, 'Coal Pouch', '+8% damage.', { dmg: 0.08 }, 100, 'forged'), 'coal', 'Your basic attacks crit more often, so Hot Streak comes sooner.', 'pyromancer'),
    P(it('houndcollar', 2, "Hound's Collar", '+8% attack speed.', { as: 0.08 }, 100, 'forged'), 'hound', "Marked enemies take 20% more from you, and killing one takes 3 seconds off Hunter's Mark.", 'ranger'),
    P(it('thornmantle', 2, 'Thorn Mantle', '+50 health, 4% less damage taken.', { hp: 50, armor: 0.04 }, 100, 0), 'thorn', 'A third of the damage you take is dealt back to whatever struck you.'),
    P(it('oldgrudge', 2, 'Old Grudge', '+30 health.', { hp: 30 }, 100, 0), 'grudge', 'A single blow that takes a fifth of your health fills you with rage: 20% more damage for six seconds.'),
    P(it('sparkring', 2, 'Spark Ring', '-5% cooldowns.', { cdr: 0.05 }, 100, 0), 'spark', 'Casting a skill makes your next basic attack hit 80% harder.'),
    P(it('restlantern', 2, 'Rest Lantern', '+30 health.', { hp: 30 }, 100, 0), 'lantern', 'You and the allies close by mend a little every second.'),
    // ---- Legendary: a passive that changes the rhythm of a fight
    it('aegis', 3, "Founder's Aegis", '+60 health, 15% less damage taken.', { hp: 60, armor: 0.15 }, 220, 'forged'),
    it('hourglass', 3, 'Twin Hourglass', '-20% cooldowns.', { cdr: 0.20 }, 220, 'forged'),
    P(it('wardensigil', 3, "Warden's Sigil", '+100 health, 5% less damage taken.', { hp: 100, armor: 0.05 }, 220, 'forged'), 'sigil', 'A Perfect Block stuns the enemies around you and wraps you in a shield.', 'bastion'),
    P(it('censer', 3, "Pilgrim's Censer", '+20% healing, heals over time.', { heal: 0.20, reg: 1.5 }, 220, 'forged'), 'censer', 'Mend also wraps its target in a shield.', 'cleric'),
    P(it('cindermitt', 3, 'Cinder Mitt', '+12% damage, +10% attack speed.', { dmg: 0.12, as: 0.10 }, 220, 'forged'), 'mitt', 'A Hot Streak fireball costs no cooldown.', 'pyromancer'),
    P(it('thirdarrow', 3, 'Third Arrow', '+15% attack speed.', { as: 0.15 }, 220, 'forged'), 'third', 'Every third basic attack sends a second shot at another foe nearby.', 'ranger'),
    P(it('tallytooth', 3, 'Tally Tooth', '+40 health.', { hp: 40 }, 220, 0), 'tally', 'Each kill adds a stack of 2% damage, up to ten. A quiet few seconds clears them.'),
    P(it('standard', 3, "Founder's Standard", '+60 health.', { hp: 60 }, 220, 0), 'standard', 'You and the allies close by hit 8% harder.'),
    P(it('brinkstone', 3, 'Brinkstone', '+80 health.', { hp: 80 }, 220, 0), 'brink', 'Once every half minute, a blow that would leave you under a quarter of your health is halved.'),
    P(it('moonsilver', 3, 'Moonsilver', '+50 health.', { hp: 50 }, 220, 0), 'moon', 'At night you hit 20% harder and attack 15% faster.'),
    // ---- Mythic: they change a skill or a rule. Forge or drop only.
    it('emberheart', 4, 'Emberheart', '+20% damage, +20% attack speed, -10% cooldowns, attacks burn.', { dmg: 0.20, as: 0.20, cdr: 0.10, burn: 1 }, 500, 0),
    it('lodestar', 4, 'Lodestar', '+25% damage. Every fourth skill echoes at half strength.', { dmg: 0.25, echo: 1 }, 500, 0),
    P(it('unbowed', 4, 'The Unbowed', '+220 health, heals over time, 15% less damage taken.', { hp: 220, reg: 3, armor: 0.15 }, 500, 0), 'unbowed', 'Under a third of your health you take a quarter less again.'),
    P(it('oath', 4, "Wall-Warden's Oath", '+180 health, 10% less damage taken.', { hp: 180, armor: 0.10 }, 500, 0), 'oath', "Each Perfect Block takes six seconds off The Wall's cooldown.", 'bastion'),
    P(it('chalice', 4, 'Dawn Chalice', '+25% healing, +60 health.', { heal: 0.25, hp: 60 }, 500, 0), 'chalice', 'Mend also heals the weakest other ally in reach, for half.', 'cleric'),
    P(it('phoenixash', 4, 'Phoenix Ash', '+15% damage, +40 health.', { dmg: 0.15, hp: 40 }, 500, 0), 'phoenix', 'Once in two minutes a blow that would fell you leaves you at a third of your health and bursts into flame.', 'pyromancer'),
    P(it('packhorn', 4, "Pack-Hunter's Horn", '+20% attack speed, +10% damage.', { as: 0.20, dmg: 0.10 }, 500, 0), 'pack', "Hunter's Mark spreads to the enemies around its target.", 'ranger'),
    P(it('crownechoes', 4, 'Crown of Echoes', '-15% cooldowns, +80 health.', { cdr: 0.15, hp: 80 }, 500, 0), 'crown', 'Your ultimate is cast a second time three seconds later, at half strength.'),
    // ---- found only (a secret's reward): never dropped, forged or sold in the shop
    it('circlet', 2, 'Silver Circlet', 'Your lamp shines twice as wide in the dark. +10% damage.', { sight: 1, dmg: 0.10 }, 0, 0, 0, true),
    it('silverheads', 2, 'Silver Arrowheads', 'Your attacks slow enemies briefly. +8% attack speed.', { slowhit: 1, as: 0.08 }, 0, 0, 0, true),
  ];
  const ITEM = {}; ITEMS.forEach(x => { ITEM[x.id] = x; });
  // feature modules add their own found-only items at load (the chain's drops): it(id, rar, name, text, stats, price, shop, use, sec)
  const addItem = (...a) => { const x = it(...a); if (ITEM[x.id]) return ITEM[x.id]; ITEMS.push(x); ITEM[x.id] = x; return x; };
  // every passive key an item carries (sim-items.js must run each one), and the items that belong to one hero
  const passiveKeys = () => [...new Set(ITEMS.map(x => x.ip).filter(Boolean))];
  const itemsFor = hero => ITEMS.filter(x => x.hero === hero);
  const ITEM_SLOTS = 6;
  // forge result rarity: one up, or (hyper, 1 in 10, Rare only) straight to Mythic. Two Mythics make a different Mythic.
  const HYPER_CHANCE = 0.10;
  const FORGE_MIN = 2;   // only Rare and up can be forged: Rare -> Legendary (hyper: Mythic), Legendary -> Mythic, Mythic + Mythic -> a different Mythic
  const canForge = rar => rar >= FORGE_MIN;
  const forgeTargetRarity = (rar, hyper) => (rar >= 3 ? 4 : rar === 2 ? (hyper ? 4 : 3) : rar + 1);
  // selling an item (Common or Uncommon only) pays half its price
  const canSell = rar => rar < FORGE_MIN, sellPrice = it => Math.floor((it.price || 0) / 2);
  // what an elite or boss drops, by wave: weights over rarities
  const dropWeights = wave => (wave >= 26 ? [0, 0, 2, 5, 4] : wave >= 21 ? [0, 1, 3, 5, 3] : wave >= 16 ? [0, 2, 4, 4, 2] : wave >= 11 ? [1, 3, 4, 3, 1] : wave >= 7 ? [2, 3, 4, 2, 0] : wave >= 4 ? [3, 4, 3, 1, 0] : wave >= 2 ? [4, 4, 2, 0, 0] : [6, 4, 0, 0, 0]);

  // ---------------------------------------------------------------- the rest of the economy and the run
  // Levels to 20, one skill point each (a hero starts with one). A rank opens at a level: Q W E rank k at 2k-1 (1 3 5 7 9), R ranks at 6 11 16, the passive's two at 8 and 14.
  // XP is shared WC3-style: an enemy that dies gives its XP, split equally, to every living hero within `share` px of it; the rest get none. `need(lv)` is the XP from level lv to lv+1.
  const GATES = { q: [1, 3, 5, 7, 9], w: [1, 3, 5, 7, 9], e: [1, 3, 5, 7, 9], r: [6, 11, 16], p: [8, 14] };
  const LEVELS = { max: 20, rLevel: 6, share: 1000, hpPer: 0.6, dmgPer: 0.03, need: lv => Math.round(132 * Math.pow(1.14, lv - 1)), gates: GATES, gate: (slot, rank) => (GATES[slot] || [])[rank - 1] || 99 };
  // gold to the account: wave w survived pays 6 + round(w/2), holding the whole run 40, each quest done 12 (and, later, the secret chain)
  const GOLD = { perWave: w => 6 + Math.round(w / 2), perQuest: 12, hold: 40 };
  const payoutParts = (survivedWaves, questsDone, held, chain) => { let waves = 0; for (let w = 1; w <= survivedWaves; w++) waves += GOLD.perWave(w); return { waves, quests: GOLD.perQuest * questsDone, hold: held ? GOLD.hold : 0, chain: chain || 0 }; };
  const payout = (survivedWaves, questsDone, held, chain) => { const p = payoutParts(survivedWaves, questsDone, held, chain); return p.waves + p.quests + p.hold + p.chain; };
  const TUNE = { nightPeak: 1, nightPeakLit: 0.82, siegeEnrage: 420, fountainR: 150, trickle: 3, full: 22, respawn: 8, respawnPer: 4, respawnMax: 30 };

  return { addEnemy, addItem, addQuest, passiveKeys, itemsFor, SLOTS, KITS, HERO_IDS, UPGRADES, UP_PRICE, UP_PRICE_R, upgradePrice, ENEMIES, ENEMY_IDS, WAVES, LAST_WAVE, PARTS, partOf, isNightWave, TIER_AT, tierOf, LANES, laneMods, stepKind, BOSS_WAVES, WAVE_TUNE, rebuildWaves, waveStartAt, nightFrac, WAVE_T0, WAVE_GAP, hpScale, HPS, campHp, CAMP_TAKE, bossHpMul, BOSS_BASE, LOG_BASE, BOSS_SIZE, logHpMul, xpMul, dmgScale, SOLO_DMG, SOLO_CAMP, NO_DPS_DMG, PARTY_DMG, SOLO_CLEAVE,
    QUESTS, QUEST_ORDER, QUEST_TUNE, BOONS, RARITIES, RARITY_COLORS, ITEMS, ITEM, ITEM_SLOTS, HYPER_CHANCE, FORGE_MIN, canForge, canSell, sellPrice, forgeTargetRarity, dropWeights, LEVELS, GOLD, payout, payoutParts, TUNE, rk };
})();

if (typeof module !== 'undefined') module.exports = { FOUNDING_DATA };
