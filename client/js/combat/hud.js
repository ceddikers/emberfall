// Combat HUD for the local player: ability bar (Q W E R D F + Space), class gauge, cast bar, buffs.

const SLOT_KEYS = ['Q', 'W', 'E', 'R', 'D', 'F', 'SPC', 'T'];   // 7: the Ultimate (engine.js, kits.js ULTIMATES)
// (the bar is updated every frame: text and the cooldown sweep are only written to the page when they change)
const hudText = (el, v) => { v = String(v); if (el._t !== v) { el._t = v; el.textContent = v; } };
const hudCd = (el, v) => { v = String(v); if (el._cd !== v) { el._cd = v; el.style.setProperty('--cd', v); } };
// a class whose icons aren't all painted yet draws its own: ICON_ART in gauges.js (the Alembist), or drawnIcon below
// for classes flagged art.icons === false in data.js (Thermist, Driftblade)
const abilityIcon = (classId, abilityId) => (typeof ICON_ART !== 'undefined' && ICON_ART[classId] && ICON_ART[classId](abilityId)) || drawnIcon(classId, abilityId) || paintedIcon(classId, abilityId);
// a painted class's icon file, or (once ArtProbe knows it's missing) its drawn letter, so a gap never 404s twice
function paintedIcon(classId, abilityId) {
  const path = `icons/${classId}/${abilityId}.png`;
  return typeof ArtProbe === 'undefined' || ArtProbe.ok(path) !== false ? path : drawnIcon(classId, abilityId, true);
}

const BUFF_NAMES = {
  oath: 'Oath of Valor', frenzy: 'Frenzy', gorge: 'Gorged', undying: 'Undying', overload: 'Runic Overload',
  markself: "Hunter's Mark", keen: 'Keen Eye', barrage: 'Barrage', truenorth: 'Shadowstep', dance: 'Shadow Dance',
  combust: 'Combustion', heating: 'Heating Up', hotstreak: 'Hot Streak', burnt: 'Burnt Out', growth: 'Wild Growth',
  awaken: 'Awakened', surge: 'Surge', lag: 'Time Lag', radiant: 'Radiant', verdict: 'Swift Verdict', chamber: 'Echo Chamber', moonlit: 'Moonlit', aim: 'Steady Aim', incircle: 'Ember Circle',
  // the advanced classes
  brink: 'On the Brink', overheat: 'Overheat', frostbite: 'Frostbite', attuned: 'Attuned', momentum: 'Momentum', corona: 'Corona', redgiant: 'Red Giant', rebound: 'Rebound', flicker: 'Flicker',
  still: 'Stillpoint', gale: 'Gale Run', orbit: 'Orbit', tailwind: 'Tailwind',
  looseend: 'Loose End',
};
const BAD_BUFFS = new Set(['burnt', 'lag', 'overheat', 'frostbite']);
// which ability's icon a buff wears
const BUFF_ICON = {
  oath: 'oath', frenzy: 'frenzy', gorge: 'drain', undying: 'undying', overload: 'overload', markself: 'mark', keen: 'pierce',
  barrage: 'barrage', truenorth: 'step', dance: 'dance', combust: 'combust', heating: 'fireblast', hotstreak: 'pyro', burnt: 'vent',
  growth: 'growth', awaken: 'bloom', surge: 'shift', lag: 'shift', radiant: 'edge', verdict: 'smite', chamber: 'accel', moonlit: 'growth', aim: 'pierce', incircle: 'combust',
  brink: 'flare', overheat: 'cinder', frostbite: 'rime', attuned: 'invert', momentum: 'equil', corona: 'flare', redgiant: 'invert', rebound: 'lance', flicker: 'rime',
  still: 'still', gale: 'gale', orbit: 'slip', tailwind: 'hook',
  looseend: 'needle',
};

// hover text for each class gauge: what fills it, what spends it, and (state) a live readout under the name
const GAUGE_TIPS = {
  bastion: { desc: 'Judgment (the third Blade Chain hit) gives 25, or 50 during Oath of Valor. A Perfect Block gives 20 (30 under Rally Banner). Holy Edge spends 50, or nothing after a Perfect Block on a tankbuster. Rally Banner takes up to 50.',
    state: k => (k.has('turned') ? 'next Holy Edge free' : k.has('banner') ? 'Banner: Perfect Blocks +10' : `${Math.floor(k.g.resolve)} Resolve`) },
  bloodreaver: { desc: 'Hack gives 10, Maul 15 and Bloodletting 20; under Undying every hit you take gives 1 for each 1% of your HP. Crimson Drain spends 40; Frenzy makes your next three Drains free, War Cry the next one, Undying every one while it lasts. The number under the heart is the bank: the damage you took since your last Drain (6s at most), what the next one cashes.',
    state: k => `bank ${Math.round(k.g.bank || 0)}` + (k.env.maxHp && k.g.bank >= k.env.maxHp() * REAVER.GLOW ? ' · Drain it' : '') },
  runeguard: { desc: 'Rune Strike gives 1 (2 during Runic Overload), a Ward broken all the way refunds its Rune (a sanctified one always does), and Mirror Aegis reflecting a tankbuster gives 1. Runic Ward spends 1, Glyph Burst spends all 3.' },
  ranger: { desc: 'Quick Shot gives 10, or 30 with Barrage, and Hunter\'s Cloak 40. Rapid Fire spends 50, or 25 while Hunter\'s Mark is up. Anything past 100 is lost. The eye is Keen Eye; ×2 means a second one is banked.' },
  shadowblade: { desc: 'Strike gives 1 point, or 2 from behind. Eviscerate spends every point and hits for {d:115} more for each, with a {d:160} bonus at 5. A sixth point is lost. Shadow Dance entered at 5 points lets the first Eviscerate in it keep them.' },
  pyromancer: {
    desc: 'Fireball gives 12, Pyroblast 20 (10 with Hot Streak) and Fire Blast 6. Every point of Heat adds 0.3% damage. At 100 you overheat: you lose 15% of your HP, Heat resets and you deal 20% less damage for 5s. Heat cools slowly while you aren\'t casting. Vent spends it all (at 90 or more it also lights Hot Streak). While Smolder is up it can\'t boil over: it stops at 99.',
    state: k => `+${Math.round(k.g.heat * 0.3)}% damage`,
  },
  cleric: {
    desc: 'You get a Petal every 15s, up to 3; one that grows past 3 blooms by itself onto the most hurt ally. Dawn Petal spends one. Every third Petal spent turns your next Smite into Dawnstar, and a Mend counts as half a Petal (a whole one with none in hand).',
    state: k => (k.g.bloom >= 3 ? 'Dawnstar ready' : `Dawnstar ${k.g.bloom} / 3`) + (k.g.petals < 3 && k.g.petalAt != null ? ` · next Petal ${Math.max(0, Math.ceil(k.g.petalAt - k.now))}s` : ''),
  },
  grovekeeper: { desc: 'Each Rejuvenate tick gives 5. Bloom spends 50.' },
  chronomancer: {
    desc: 'Fills by 3 a second in Slow stance and drains by 5 a second in Haste. Shifting into Haste needs 20. Run dry in Haste and you drop back to Slow with slower casts for 3s.',
    state: k => (k.g.stance === 'haste' ? 'Haste' : 'Slow') + ' stance',
  },
  thermist: {
    desc: 'Fire spells push the dial right, frost spells push it left. Each step from 0 makes that side\'s spells 8% stronger. Cross 0 after reaching 3 or more and the swing detonates as a Thermal Shock. Past +5 you overheat, past -5 you freeze.',
    state: k => (k.g.peak >= 3 && k.g.side ? `Shock armed (${k.g.peak})` : 'Shock not armed') + (k.def.corona && k.stacks('corona') ? ` · Corona ${k.stacks('corona')}` : ''),
  },
  driftblade: {
    desc: 'A Passing Strike gives 10, Hook Turn 15, Slipstream 15, and walking 15 a second. After 1.5s standing still it drains 15 a second. Most of your cuts hit harder the fuller it is. Crosswind spends it all.',
    state: k => `+${Math.round(Math.min(1, (k.g.drift || 0) / 100) * 100)}% to Drift moves`,
  },
};

// moves a talent grants (kits.js TALENT_ABILITIES) show under their own name. Some ride on the buff of the move they
// replaced (Avatar of Dawn also sets Oath of Valor's buff, so everything keyed to the Oath still works): while the
// move's own buff is up, the tracker hides the borrowed one
Object.assign(BUFF_NAMES, { avatar: 'Avatar of Dawn', bloodmoon: 'Blood Moon', living: 'Living Rune', falconHunt: 'Falcon', firestep: 'Firestep', treant: 'Treant', warp: 'Time Warp' });
Object.assign(BUFF_ICON, { avatar: 'oath', bloodmoon: 'undying', living: 'overload', falconHunt: 'barrage', firestep: 'smolder', treant: 'thorn', warp: 'accel' });
const BUFF_HIDES = { avatar: 'oath', bloodmoon: 'undying', living: 'overload', warp: 'chamber' };

// Alembist (classes-b): the bandolier's tooltip lists the recipes (and the Volatile's Reactions, sealed until found)
Object.assign(BUFF_NAMES, { distill: 'Distill', catalyst: 'Catalyst' });
Object.assign(BUFF_ICON, { distill: 'distill', catalyst: 'distill' });
GAUGE_TIPS.alembist = {
  desc: 'Two reagents brew a vial into your bandolier (three after Catalyst). Throw takes the vial on the left, or the one you marked with its number key; the mark holds until you throw. Vials grow 30% stronger over their first 10s and spoil after 40s. The three coals under the still are the Kiln: every vial you throw that is not a bomb lights one, and with all three lit your next Throw also launches a free Kiln Bomb for {d:900}.',
  state: k => {
    const i = alemPick(k), v = i >= 0 ? k.g.vials[i] : null, raise = Math.ceil(k.g.raiseAt - k.now);
    const parts = [v ? `next: ${v.parts ? 'Grand Blend' : alemInfo(v.r).name} ${Math.round((alemStrength(k, v) - 1) * 100)}%` : 'empty', `Kiln ${k.g.kiln || 0} / ${ALEMBIC.KILN}`];
    if (raise > 0) parts.push(`raise in ${raise}s`);
    return parts.join(' · ');
  },
  extra: k => `<div class="alem-book">${alemBook(null, false)}${k.def.alem.fuse ? alemBook(alemKnown(k), true) : ''}</div>`,
};

// Ironpalm: Breath, and the move list (every string the kit knows, with its talent-made alternatives)
Object.assign(BUFF_NAMES, { read: 'Read', wall: 'Tiger Wall', opening: 'Opening', wind: 'Second Wind', skin: 'Iron Skin', rush: 'Momentum', stagger: 'Staggered',
  guard: 'Guard Open', pond: 'Still Pond', slide: 'Landslide', bellows: 'Bellows Stance' });
BAD_BUFFS.add('stagger');
Object.assign(BUFF_ICON, { read: 'read', wall: 'kick', opening: 'fist', wind: 'bell', skin: 'skin', rush: 'fist', stagger: 'kick', guard: 'palm', pond: 'pond', slide: 'slide', bellows: 'bellows' });
// Houndmaster: Mark the Quarry, Call Off's guard, and the bleed that sharpens the bites (the loot)
Object.assign(BUFF_NAMES, { mounted: 'Riding Greyfang', quarry: 'Quarry Marked', guarded: 'Hounds on Guard', rendbite: 'Bloodied Bites' });
Object.assign(BUFF_ICON, { mounted: 'mount', quarry: 'quarry', guarded: 'calloff', rendbite: 'finisher' });
// Marionettist: Strung, one stack per String still tied (no timer: it lasts as long as the Strings do)
Object.assign(BUFF_NAMES, { strung: 'Strung' });
Object.assign(BUFF_ICON, { strung: 'pull' });
GAUGE_TIPS.ironpalm = {
  desc: `Every press costs Breath: Light ${IP_INPUT.L.cost}, Heavy ${IP_INPUT.H.cost}, Kick ${IP_INPUT.K.cost} (${Math.round(IRONPALM.CRISP_SAVE * 100)}% less when Crisp). It refills ${IRONPALM.pool.regen} a second while you fight and ${IRONPALM.pool.rest} a second once you stop for half a moment. Below ${IRONPALM.WINDED} you're winded until it's back to ${IRONPALM.RECOVER}: every press is a weak tap, and it refills at the resting pace (${Math.round(IRONPALM.TAP_REFILL * 100)}% of it while you keep tapping). Crane Step gives some back, Flowing Palms with all three palms Crisp gives ${IRONPALM.FLOW_BREATH} back when it leaves you under ${IRONPALM.FLOW_LOW}, and a Read gives 15.`,
  state: k => (k.has('opening') ? 'Opening: Heavy is Thousand Palms' : k.has('offbal') ? 'Off balance: Read the next blow' : k.g.winded ? 'Winded: breathe' : k.has('wind') ? 'Second Wind' : 'Steady'),
  extra: k => `<div class="ip-moves">${ipMoves(k).map(e => `<div><b>${[...e.seq].join(' ')}</b> ${e.mv.name}<i> · ${e.mv.desc}</i></div>`).join('')}</div>`,
};

// talents whose proc shows in the tracker (named after the talent)
Object.assign(BUFF_NAMES, { answer: 'Answering Rune', beat: 'Skipped Beat', feint: 'Feint', haze: 'Heat Haze', pinned: 'Pinning Shot', quickmend: 'Quick Mend',
  secondwind: 'Second Wind', sharpen: 'Sharpened Shadows', steady: 'Steady Hands', unbreak: 'Unbreakable', tempo: 'Tempo', oncue: 'Stage Cross', smoulder: 'Smoulder', stalk: 'Stalking' });
Object.assign(BUFF_ICON, { tempo: 'fury', oncue: 'swap', smoulder: 'smolder', stalk: 'step', answer: 'strike', beat: 'bolt', feint: 'strike', haze: 'fireball', pinned: 'quick', quickmend: 'mend', secondwind: 'cloak', sharpen: 'evis', steady: 'brace', unbreak: 'bulwark' });

// what each buff does while it's up, for its hover text. n(id) is the move's name as this hero has it (a spec may rename it).
const BUFF_TIPS = {
  oath: n => `You deal 10% more damage. Judgment gives double Resolve and ${n('edge')} hits harder.`,
  avatar: n => `You deal 10% more damage, Judgment gives double Resolve and ${n('edge')} hits harder. Every Perfect Block calls a pillar of light down on the boss.`,
  radiant: n => `Your next ${n('edge')} is a beam of light, 50% stronger.`,
  steady: n => `${n('edge')} costs 35 Resolve instead of 50.`,
  unbreak: () => 'Every Perfect Block gives its Brace charge straight back.',
  frenzy: () => 'You deal 15% more damage.',
  gorge: n => `Your next ${n('drain')} costs no Blood and hits harder.`,
  undying: () => 'You can\'t drop below 1 HP, and every heal and shield you give is doubled.',
  bloodmoon: () => 'You can\'t drop below 1 HP and your heals are doubled. When the moon sets, the boss takes damage for the hits you took, and you heal for a quarter of them.',
  overload: n => `You deal 10% more damage. ${n('strike')} gives 2 Runes, and ${n('glyph')} and Ward blasts hit harder.`,
  living: n => `You deal 10% more damage, ${n('strike')} gives 2 Runes, and ${n('glyph')} and Ward blasts hit harder. Every Rune you spend fires a bolt at the boss.`,
  answer: n => `Your next ${n('strike')} gives an extra Rune.`,
  markself: n => `Keen Eye lights up more often, your critical chance is 10% higher, and ${n('rapid')} costs 25 Focus. A Keen Eye cashed while a second is banked readies ${n('barrage')} again.`,
  keen: n => `Your next ${n('pierce')} hits harder and gives its charge back. Banks up to two.`,
  smoulder: () => 'Your Heat can\'t boil over: it stops at 99.',
  oncue: n => `Your next ${n('cross')} cuts twice as hard and gives 1 more Encore.`,
  strung: () => 'Each String still tied to the Doll gives you 5% more damage and makes its Jabs 5% faster. A torn String takes its share with it.',
  tempo: n => `At three Tempo your next ${n('step')} is a Flourish. A spilled combo point loses them all.`,
  stalk: n => `Your next ${n('evis')} hits 6% harder.`,
  barrage: n => `Your next ${n('quick')} hits three times as hard and gives triple Focus.`,
  falconHunt: () => 'Your falcon is hunting: every Keen Eye you light sends it diving at the boss.',
  pinned: n => `Your next ${n('quick')} is a critical hit.`,
  secondwind: n => `Your next ${n('quick')} also heals you for 15% of your HP.`,
  aim: () => 'You deal 4% more damage for each stack. Moving loses them all.',
  truenorth: () => 'Every hit counts as a positional, wherever you stand.',
  dance: n => `Your attacks are faster, every positional lands, and ${n('evis')} hits 25% harder.`,
  feint: n => `Your next ${n('evis')} lands as a hit from the side, wherever you stand.`,
  sharpen: n => `Your next ${n('evis')} hits 12% harder for each stack.`,
  combust: () => 'Everything you cast is a critical hit.',
  heating: n => `Your next critical hit gives you Hot Streak. A ${n('fireball')} or ${n('pyro')} that doesn't crit loses it.`,
  hotstreak: n => `Your next ${n('pyro')} is instant and hits harder.`,
  burnt: () => 'You overheated: you deal 20% less damage.',
  haze: n => `Your next ${n('fireball')} is instant.`,
  firestep: n => `Your next ${n('fireball')} is instant.`,
  incircle: () => 'While you stand in your circle you cast 20% faster and deal 15% more damage.',
  quickmend: n => `Your next ${n('mend')} is instant.`,
  verdict: n => `Your next ${n('smite')} is instant.`,
  growth: n => `Your heals are 25% stronger, and ${n('bloom')} heals the whole party.`,
  moonlit: n => `Your heals are 25% stronger, and ${n('bloom')} heals the whole party.`,
  awaken: n => `Your next ${n('wrath')} is instant and 50% stronger.`,
  treant: () => 'Your treant slams the boss every 3s, and every slam heals your most hurt ally.',
  surge: n => `Your next ${n('bolt')} is instant.`,
  beat: n => `Your next ${n('bolt')} is instant.`,
  lag: () => 'You ran out of Flux: your casts are 20% slower.',
  chamber: () => 'Your echoes are full strength.',
  warp: () => 'A great clock hangs over the party: everyone acts faster, and every 3s it strikes the boss and heals the party.',
  distill: () => 'Your next two reagents recover almost at once.',
  catalyst: () => 'Your next brew takes three reagents. Three that make a Reaction brew it; three that don\'t brew the pair you put in twice, fully heated.',
  brink: () => 'If your next spell is the same element, you overload. The other element, or letting this run out, is safe.',
  flicker: n => `Your next ${n('flare')} or ${n('lance')} is instant.`,
  overheat: n => `You can't cast ${n('cinder')} or ${n('flare')}.`,
  frostbite: () => 'Your casts are 30% slower.',
  attuned: () => 'Every step from 0 makes both fire and frost spells stronger.',
  momentum: () => 'You deal 4% more damage for each stack. Cross 0 again within 6s to keep them.',
  corona: n => `Your next Thermal Shock is 25% stronger for each stack. ${n('equil')} drops them on the target as stars instead.`,
  redgiant: () => 'You can hold up to 5 Corona at the edge, and the 4th and 5th edge casts hit half again as hard.',
  rebound: () => 'Your next spell is instant.',
  still: () => 'Your Drift holds instead of draining.',
  gale: () => 'Your Drift can\'t drain, and Passing Strikes hit three times as hard.',
  orbit: n => `At 5 stacks, ${n('carve')} cuts on its own every moment or so while you keep circling. Every whole loop round your target ends in a Full Circle dive.`,
  tailwind: n => `Your next ${n('carve')} is a critical hit.`,
  read: () => 'You take 20% less damage. A hit in the first 0.4s is read.',
  wall: () => 'You take 25% less damage.',
  opening: () => 'Your next Heavy is a free Thousand Palms, 30% stronger.',
  wind: () => 'Breath refills twice as fast, and you deal 10% more damage.',
  skin: () => 'You take 40% less damage, and your Breath refills at its resting pace.',
  rush: () => 'You deal 3% more damage for each stack. Break or drop a string and it\'s gone.',
  stagger: () => 'You lost your string: you can\'t act for a moment.',
  guard: () => 'Your Light presses hit 30% harder.',
  pond: () => 'You take 25% less damage, and Read comes back moments after you use it.',
  slide: () => 'A broken or dropped string doesn\'t stagger you, and your Momentum holds.',
  bellows: () => 'You take 30% less damage, Breath refills half again as fast, and every named move you finish sends out a shockwave and gives back 6 Breath.',
};
// buffs refreshed every moment while a condition holds (the timer means nothing there)
const BUFF_UNTIMED = new Set(['incircle', 'strung']);
// the damage classes' Ultimates (kits.js "ULTIMATES · DAMAGE CLASSES"): what they leave on you
Object.assign(BUFF_NAMES, { starfall: 'Starfall', curtaincall: 'Curtain Call' });
Object.assign(BUFF_ICON, { starfall: 'barrage', curtaincall: 'swap' });
Object.assign(BUFF_TIPS, {
  starfall: n => `Every ${n('quick')} lights Keen Eye while the stars fall.`,
  curtaincall: n => `Your next ${n('swap')} is the bow: the Strings snap taut across the target as you trade places.`,
});
// the tanks' Ultimates (kits.js "TANK ULTIMATES"): Crimson Eclipse's bank
// the Chronomancer's Stasis, holding the Bolts' heals (kits.js chronoStasis)
Object.assign(BUFF_NAMES, { stasis: 'Stasis' });
Object.assign(BUFF_ICON, { stasis: 'stasis' });
Object.assign(BUFF_TIPS, { stasis: n => `Your ${n('bolt')}s' heals are held, 25% stronger. Press ${n('stasis')} again (or wait) to release them all to the party.` });
Object.assign(BUFF_NAMES, { eclipse: 'Crimson Eclipse' });
Object.assign(BUFF_ICON, { eclipse: 'undying' });
Object.assign(BUFF_TIPS, {
  eclipse: n => `Every hit you take is banked. When the eclipse ends it erupts on your target and heals you for 30% of it, the party for 10%. Your ${n('drain')}s cost no Blood while Gorged.`,
});
// the tanks' kit links (round 2): the buffs one button leaves for another
Object.assign(BUFF_NAMES, { turned: 'Turned Aside', banner: 'Rally Banner', roar: 'War Cry', sanctified: 'Sanctified', offbal: 'Off Balance', acid: 'Acid', irongut: 'Iron Gut' });
Object.assign(BUFF_ICON, { turned: 'edge', banner: 'banner', roar: 'warcry', sanctified: 'sanctum', offbal: 'fist', acid: 'digest', irongut: 'iron' });
Object.assign(BUFF_TIPS, {
  acid: n => `Your next ${n('spit')} carries the acid of your last ${n('digest')}: it hits harder.`,
  irongut: n => `${n('digest')} works in any moment, and every Morsel it digests counts twice.`,
  offbal: n => `Iron Ox has the boss off balance: the next blow you ${n('read')} opens it up like a tankbuster (your next Heavy is a free Thousand Palms).`,
  sanctified: n => `The next ${n('ward')} you raise keeps its Rune however little it soaks, and its blast heals the whole party for a third of what it absorbed.`,
  roar: n => `Your next ${n('drain')} costs no Blood, and the party heals for a quarter of what it heals you.`,
  undying: n => (n('undying') === 'Undying' ? `You can't drop below 1 HP, and every heal and shield you give is doubled. ${n('drain')} costs no Blood, and every hit you take fills Blood.` : 'You can\'t drop below 1 HP, and every heal and shield you give is doubled.'),
  turned: n => `You turned a tankbuster aside: your next ${n('edge')} costs no Resolve.`,
  banner: () => 'The banner stands: every Perfect Block gives 10 more Resolve.',
});
// the spec rows (VI, VII) of the Driftblade and the Ironpalm: the windows a talent leaves open
Object.assign(BUFF_NAMES, { ricochet: 'Ricochet', zenith: 'Zenith', roost: 'Roost', flood: 'Flood Tide' });
Object.assign(BUFF_ICON, { ricochet: 'hook', zenith: 'cross', roost: 'gale', flood: 'palm' });
Object.assign(BUFF_TIPS, {
  ricochet: n => `Impact lit the way back: your next ${n('hook')} also flings you back through the boss, a Passing Strike, and gives 20 more Drift.`,
  zenith: n => `Your charge hangs at its peak: Drift cannot drain, and ${n('cross')} needs only 60.`,
  roost: () => 'Settled on the wind: your Orbit stays full whether you circle or not, Carve cuts on its own every second, and your Drift holds.',
  flood: () => 'The tide is in: your next named moves each wash out a second blow.',
});
const tipAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// the system's reduced-motion setting (the slot's denied shake stays still under it; style.css stops the loops)
const HUD_CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

const Hud = {
  el: null, slots: [], actor: null, gaugeCanvas: null, castFill: null, castName: null, buffRow: null, extra: () => [],

  init() {
    const el = document.createElement('div');
    el.id = 'combat-hud';
    el.className = 'hidden';
    el.innerHTML = `
      <div id="buff-row"></div>
      <div id="cast-bar" class="hidden"><div class="fill"></div><span></span></div>
      <div class="hud-main">
        <div class="gauge-wrap"><canvas id="gauge-canvas"></canvas></div>
        <div id="ability-row"></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.gaugeCanvas = el.querySelector('#gauge-canvas');
    this.castBar = el.querySelector('#cast-bar');
    this.castFill = this.castBar.querySelector('.fill');
    this.castName = this.castBar.querySelector('span');
    this.buffRow = el.querySelector('#buff-row');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gaugeCanvas.width = 130 * dpr; this.gaugeCanvas.height = 116 * dpr;
    this.gaugeCanvas.style.width = '130px'; this.gaugeCanvas.style.height = '116px';
  },

  setActor(actor, onPress) {
    this.actor = actor;
    const row = this.el.querySelector('#ability-row');
    const cls = actor.cls;
    // a gauge can ask for a wider canvas (the Alembist's bandolier)
    const gw = (actor.kit.def.gauge && actor.kit.def.gauge.w) || 130;
    if (gw !== this.gw) {
      this.gw = gw;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.gaugeCanvas.width = gw * dpr; this.gaugeCanvas.style.width = gw + 'px';
      this.el.querySelector('.gauge-wrap').style.width = gw + 'px';
    }
    const items = [...actor.abilities, { id: 'dash', name: 'Dash', type: 'ogcd', desc: 'A quick dash toward where you\'re heading (or the cursor). Two charges, 12s each.', fx: { color: cls.accent } }];
    // the Ultimate (slot 7, key T), drawn just before the dash; a hero without one yet has no T slot
    const ult = actor.kit.ult;
    if (ult) items.push(ult);
    // painted icons live in icons/<class>/<ability id>.png; the dash (and anything without art) shows its letter
    // (i < 6 reads the bar as it is now: an Ultimate's window swaps empowered moves in)
    const art = (ab, i) => (i < 6 ? `url(${abilityIcon(cls.id, abilityIconId(ab))})` : ab.ult ? ultIconBg(cls.id) : '');
    row.innerHTML = items.map((ab, i) => `
      <div class="slot ${ab.type}${art(ab, i) ? ' has-art' : ''}${ab.ult ? ' ult' : ''}" data-i="${i}" style="--a:${cls.accent};--fx:${(ab.fx && ab.fx.color) || cls.accent}">
        <div class="icon"${art(ab, i) ? ` style="background-image:${art(ab, i)}"` : ''}>${art(ab, i) ? '' : ab.id === 'dash' ? '»' : ab.name.replace(/^The /, '')[0]}</div>
        <kbd>${SLOT_KEYS[i]}</kbd>
        <div class="sweep"></div>
        <span class="gl" aria-hidden="true"></span><span class="fl" aria-hidden="true"></span>
        <div class="cdtext"></div>
        <div class="charges"></div>${ab.ult ? '<div class="ring"></div>' : ''}${i < 6 ? '<i class="tb"></i>' : ''}
        <div class="name">${ab.name}</div>
      </div>`).join('');
    this.slots = [...row.children].map(el => ({ el, sweep: el.querySelector('.sweep'), cd: el.querySelector('.cdtext'), ch: el.querySelector('.charges'), name: el.querySelector('.name'), icon: el.querySelector('.icon'), ring: el.querySelector('.ring'), tb: el.querySelector('.tb'), fl: el.querySelector('.fl'),
      onCd: false, blocked: false, ch0: null, pressAt: -9 }));
    this._sets = -9;   // (the gear perks and talents marks are re-read now)
    if (ult) row.insertBefore(this.slots[7].el, this.slots[6].el);
    this._abs = actor.kit.abilities; this._ultFull = null; this._ultBg = null;
    // in-game tooltips (shows the current label, e.g. Riposte / Dawnstar; a window's empowered move; a taunt carrier)
    this.slots.forEach((s, i) => Tip.set(s.el, () => {
      const k = this.actor && this.actor.kit, ab = i < 6 && k ? k.abilities[i] : items[i];
      const name = k && i < 6 ? k.label(ab) : ab.name;
      const icon = art(ab, i) ? `<i class="ab-icon ${ab.type}${ab.ult ? ' ult' : ''}" style="background-image:${art(ab, i)}"></i>` : '<i class="ab-icon dash">»</i>';
      if (ab.ult) {
        const meta = [ultMeta(ab), k.ultWin ? `${Math.ceil(k.ultLeft())}s left` : `${Math.floor(k.ultCharge())}%`];
        return `<div class="tip-ab">${icon}<div><b>${name}</b><em>${meta.join(' · ')}</em></div></div>${ab.desc || ''}`;
      }
      const meta = [ab.meta || (ab.type === 'gcd' ? 'GCD' : 'oGCD')];   // (a paced kit's moves say what limits them instead)
      if (ab.ultOf) meta.unshift('Ultimate');
      if (typeof ab.cast === 'number' && ab.cast) meta.push(`${ab.cast}s cast`);
      if (ab.charges) meta.push(`${ab.charges} charges · ${ab.cd}s`); else if (typeof ab.cd === 'number' && ab.cd) meta.push(`${ab.cd}s cooldown`);
      const perks = k ? [...(k.gear().perks || [])].filter(p => ITEM_PERKS[p] && ITEM_PERKS[p].ab === (ab.replaces || ab.id)) : [];
      const enh = perks.map(p => `<div class="it-perk"><span><u>Enhanced (${ITEMS[p].name}):</u> ${ITEM_PERKS[p].text}</span></div>`).join('');
      // talents (talents.js) that change this move, or the move its spec version replaced
      // (a move a talent granted says so, and doesn't repeat that talent's own words)
      const granted = ab.talent || ab.fromTalent;
      if (granted) meta.push('Talent');
      const held = k && k.env.talents && typeof TALENT_BY_ID !== 'undefined' ? [...(k.env.talents() || [])].map(id => TALENT_BY_ID[id]).filter(d => d && d.t.ab === (ab.replaces || ab.id) && !(d.t.grants && granted)) : [];
      const tal = held.map(d => `<div class="it-talent"><span><u>Talent · ${d.t.name}:</u> ${talentText(d.t, this.actor.spec)}</span></div>`).join('');
      return `<div class="tip-ab">${icon}<div><b>${name}</b><em>${meta.join(' · ')}</em></div></div>${ab.desc || ''}${enh}${tal}${i < 6 ? tauntNote(cls.id, ab) : ''}`;
    }));
    this.slots.forEach((s, i) => s.el.addEventListener('mousedown', e => { e.stopPropagation(); onPress(i); }));
    this.slots.forEach(s => { s.el.setAttribute('role', 'button'); s.el.setAttribute('aria-label', s.name.textContent); });
    Tip.set(this.el.querySelector('.gauge-wrap'), () => {
      const k = this.actor && this.actor.kit, g = k && k.def.gauge, sp = this.actor && specOf(cls.id, this.actor.spec);
      const info = sp && sp.gaugeTip ? Object.assign({}, GAUGE_TIPS[cls.id], { desc: sp.gaugeTip }) : GAUGE_TIPS[cls.id];
      if (!g || !info) return '';
      const val = Math.floor(k.g[g.key] || 0);
      const meta = [`${val} / ${g.max}`];
      if (info.state) meta.push(info.state(k));
      return `<b>${g.label}</b><em>${meta.join(' · ')}</em>${info.desc}${info.extra ? info.extra(k) : ''}`;
    });
    this.el.classList.remove('hidden');
    this.centre();
  },

  // the skills sit at the screen's centre, not the bar's: the bar steps left by half the gauge (never off a narrow screen)
  centre() {
    const main = this.el.querySelector('.hud-main'), z = parseFloat(this.el.style.zoom) || 1;
    const room = Math.max(0, (window.innerWidth / z - main.offsetWidth) / 2 - 8);
    main.style.translate = `${-Math.round(Math.min(((this.gw || 130) + 10) / 2, room))}px 0`;
    if (!this._centred) { this._centred = true; window.addEventListener('resize', () => this.actor && this.centre()); }
  },

  hide() { this.el.classList.add('hidden'); this.actor = null; },

  // a slot pressed (key or click, main.js pressSlot): a quick light on it, or a small shake when it's still cooling
  // (Web Animations: nothing to reset, and a held key re-flashes at most every 0.15s)
  pressed(i) {
    const s = this.slots[i], now = performance.now() / 1000;
    if (!s || !s.el.animate || now - s.pressAt < 0.15) return;
    s.pressAt = now;
    if (s.blocked) {
      if (HUD_CALM && HUD_CALM.matches) return;   // (reduced motion: no shake)
      s.el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
      return;
    }
    s.el.animate([{ transform: 'scale(0.93)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' });
    s.fl.animate([{ opacity: 0.7, transform: 'scale(0.9)' }, { opacity: 0, transform: 'scale(1.06)' }], { duration: 240, easing: 'ease-out' });
  },
  // a move off cooldown (or a charge back): one soft ring that swells out from the slot
  readyFlash(s) {
    if (!s.fl || !s.fl.animate) return;
    s.fl.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 0.85, transform: 'scale(1)', offset: 0.25 }, { opacity: 0, transform: 'scale(1.2)' }], { duration: 420, easing: 'ease-out' });
  },

  update(now, t) {
    const a = this.actor;
    if (!a) return;
    const k = a.kit;
    // which moves gear perks and talents touch (they change out of combat: re-read twice a second, not every frame)
    if (Math.abs(now - this._sets) > 0.5) {
      this._sets = now;
      this._enh = new Set([...(k.gear().perks || [])].map(p => ITEM_PERKS[p] && ITEM_PERKS[p].ab));
      this._tal = new Set(k.env.talents && typeof TALENT_BY_ID !== 'undefined' ? [...(k.env.talents() || [])].map(id => TALENT_BY_ID[id] && TALENT_BY_ID[id].t.ab) : []);
    }
    const enhanced = this._enh, talented = this._tal;
    // an Ultimate's window opened or closed: the bar's icons follow its moves
    if (k.abilities !== this._abs) {
      this._abs = k.abilities;
      k.abilities.forEach((ab, i) => {
        const s = this.slots[i];
        if (!s) return;
        s.icon.style.backgroundImage = `url(${abilityIcon(a.cls.id, abilityIconId(ab))})`;
        s.el.classList.toggle('empowered', !!ab.ultOf);
      });
    }
    // the taunt carrier (a tank): a mark when the taunt is ready, its seconds while it cools
    const carry = a.taunt && k.def.tauntOn ? k.abilities.findIndex(ab => k.baseId(ab) === k.def.tauntOn) : -1;
    for (let i = 0; i < a.abilities.length; i++) {
      const ab = a.abilities[i], s = this.slots[i];
      if (!s) continue;
      if (s.tb) {
        const on = i === carry, left = on ? a.tauntLeft(now) : 0;
        s.el.classList.toggle('carrier', on);
        if (on) { s.tb.classList.toggle('ready', left <= 0); hudText(s.tb, left > 0 ? Math.ceil(left) : ''); }
      }
      s.el.classList.toggle('enhanced', enhanced.has(ab.replaces || ab.id));
      s.el.classList.toggle('talented', talented.has(ab.replaces || ab.id));
      const usable = k.usable(ab);
      let frac = 0, txt = '';
      const cdLeft = k.cdRemaining(ab);
      let onCd = false;
      if (ab.charges) {
        const ch = k.charges(ab);
        hudText(s.ch, ch);
        frac = ch === 0 ? k.cdFraction(ab) : 0;
        if (ch === 0) txt = cdLeft < 1 ? cdLeft.toFixed(1) : Math.ceil(cdLeft);
        s.el.classList.toggle('partial', ch > 0 && ch < ab.charges);
        // a charge back: the ready ring (same move only: an Ultimate's window swapping moves in isn't a charge)
        if (s.ch0 != null && ch > s.ch0 && s.ab0 === ab) this.readyFlash(s);
        s.ch0 = ch; onCd = ch === 0;
      } else if (k.recast(ab) && cdLeft > 0) {
        frac = k.cdFraction(ab);
        txt = cdLeft < 1 ? cdLeft.toFixed(1) : Math.ceil(cdLeft);
        onCd = true;
      } else s.ch0 = null;
      // off its own cooldown (not the GCD): one soft ring
      if (s.onCd && !onCd && s.ab0 === ab) this.readyFlash(s);
      s.onCd = onCd; s.ab0 = ab;
      if (ab.type === 'gcd' && k.gcdRemaining() > 0 && cdLeft <= 0) frac = Math.max(frac, k.gcdRemaining() / k.gcdLen);
      // no GCD (a paced kit): its moves show the recovery of the last press instead
      if (ab.type === 'gcd' && k.gcdFree() && cdLeft <= 0 && k.lockUntil > now) frac = Math.max(frac, (k.lockUntil - now) / Math.max(0.1, k.lockLen));
      hudCd(s.sweep, frac.toFixed(3));
      hudText(s.cd, txt);
      // the sweep's bright leading edge, only while it turns
      s.sweep.classList.toggle('sw', frac > 0.002);
      s.blocked = onCd || !usable;
      s.el.classList.toggle('glow', usable && cdLeft <= 0 && k.glows(ab));
      s.el.classList.toggle('dim', !usable);
      let queued = !!((k.queued && k.queued.ab === ab) || (k.queuedO && k.queuedO.ab === ab));
      if (!queued) for (let j = 0; j < k.inbuf.length; j++) if (k.inbuf[j].ab === ab) { queued = true; break; }
      s.el.classList.toggle('queued', queued);
      s.el.classList.toggle('casting', !!(k.cast && k.cast.ab === ab));
      const lbl = k.label(ab);
      if (s.name.textContent !== lbl) { s.name.textContent = lbl; s.el.setAttribute('aria-label', lbl); }
    }
    // dash
    const ds = this.slots[6];
    a.dashReady(now);
    hudText(ds.ch, a.dash.charges);
    if (ds.ch0 != null && a.dash.charges > ds.ch0) this.readyFlash(ds);
    ds.ch0 = a.dash.charges; ds.blocked = a.dash.charges === 0;
    ds.sweep.classList.toggle('sw', a.dash.charges === 0);
    hudCd(ds.sweep, a.dash.charges === 0 ? a.dashFraction(now).toFixed(3) : 0);
    hudText(ds.cd, a.dash.charges === 0 ? Math.ceil(a.dash.next - now) : '');
    // the Ultimate (T): the ring fills with its charge; while its window is open the ring drains with the seconds left
    const us = k.ult && this.slots[7];
    if (us) {
      const win = k.ultWin, full = k.ultFull();
      const v = win ? k.ultLeft() / win.dur : k.ultCharge() / 100;
      if (us.ring._v !== v.toFixed(3)) { us.ring._v = v.toFixed(3); us.ring.style.setProperty('--ult', us.ring._v); }
      hudText(us.cd, win ? Math.ceil(k.ultLeft()) : '');
      us.el.classList.toggle('full', full);
      us.el.classList.toggle('active', !!win);
      // the last tenth before it's full: the ring brightens (anticipation, not yet the cue)
      us.el.classList.toggle('near', !win && !full && v >= 0.9);
      us.blocked = !win && !full;
      // one cue when it fills (the soft glow then stays: .full)
      if (full && this._ultFull === false) { us.el.classList.remove('cue'); void us.el.offsetWidth; us.el.classList.add('cue'); }
      this._ultFull = full;
      const bg = ultIconBg(a.cls.id);   // (its own painting, once that's in)
      if (bg !== this._ultBg) { this._ultBg = bg; us.icon.style.backgroundImage = bg; }
    }
    // cast bar
    // (the fill is scaled, never resized: no layout per frame. A cast that runs to its end flashes and fades; one
    // cut short goes red and drops away)
    const cb = this.castBar;
    if (k.cast) {
      if (this._castOut) { this._castOut = 0; cb.classList.remove('done', 'broke'); }
      cb.classList.remove('hidden');
      const f = Math.min(1, (now - k.cast.start) / (k.cast.end - k.cast.start));
      const v = f.toFixed(3);
      if (this._castV !== v) { this._castV = v; this.castFill.style.transform = `scaleX(${v})`; }
      this._castEnd = k.cast.end;
      if (this._castAb !== k.cast.ab) {
        this._castAb = k.cast.ab;
        this.castName.innerHTML = `<i class="cb-icon" style="background-image:url(${abilityIcon(a.cls.id, abilityIconId(k.cast.ab))})"></i>${k.cast.ab.name}`;
      }
    } else if (this._castAb) {
      const broke = now < (this._castEnd || 0) - 0.1;
      this._castAb = null; this._castOut = now || 1e-6;
      if (!broke) { this._castV = '1.000'; this.castFill.style.transform = 'scaleX(1)'; }
      cb.classList.add(broke ? 'broke' : 'done');
    } else if (this._castOut && (now - this._castOut > 0.45 || now < this._castOut)) {
      this._castOut = 0; cb.classList.remove('done', 'broke'); cb.classList.add('hidden');
    } else if (!this._castOut) cb.classList.add('hidden');
    // gauge
    const c = this.gaugeCanvas.getContext('2d');
    const gw = this.gw || 130, dpr = this.gaugeCanvas.width / gw;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, gw, 116);
    drawGauge(c, k, gw, 116, t);
    this.buffs(k, now, a);
  },

  // The buff row. Rebuilt only when which buffs are up changes (ids and kinds); the seconds and stacks are written in
  // place, a new buff pops in, a refreshed one pulses, and the last 3s blink softly. Tooltips are live (read on hover).
  // (items are pooled objects: nothing is allocated per frame beyond what extra() and itemBuffs() hand over)
  buffs(k, now, a) {
    const pool = this._bPool || (this._bPool = []);
    let n = 0;
    for (const [id, b] of k.buffs) {
      if (!(b.end > now && BUFF_NAMES[id]) || (BUFF_HIDDEN_BY[id] && k.has(BUFF_HIDDEN_BY[id]))) continue;
      this._bput(pool, n++, id, BUFF_NAMES[id], BUFF_UNTIMED.has(id) ? undefined : b.end - now, b.stacks, BAD_BUFFS.has(id), false, '', '', '', true);
    }
    for (const x of this.extra()) this._bput(pool, n++, x.id, x.name, x.left, x.stacks, !!x.bad, !!x.bond, x.label || '', x.img || '', x.tip || '', false);
    for (const x of k.itemBuffs()) this._bput(pool, n++, x.id, x.name, x.left, x.stacks, !!x.bad, !!x.bond, x.label || '', x.img || '', x.tip || '', false);   // buffs from item effects
    const R = this._bR || [];
    let rebuild = n !== R.length || this._bCls !== a.cls.id;
    for (let i = 0; i < n && !rebuild; i++) { const r = R[i], b = pool[i]; if (r.id !== b.id || r.bad !== b.bad || r.bond !== b.bond || r.img !== b.img) rebuild = true; }
    if (rebuild) {
      const had = new Set(R.map(r => r.id)), first = !this._bR;
      this._bCls = a.cls.id;
      const icon = b => {
        if (b.img) return `<u class="bf-icon" style="background-image:url(${b.img})"></u>`;   // (another class's art: an ally's buff on you)
        if (BUFF_ICON[b.id]) return `<u class="bf-icon" style="background-image:url(${abilityIcon(a.cls.id, BUFF_ICON[b.id])})"></u>`;
        // the shared status icons (status-icons.js): painted once its file is in, a drawn glyph until then
        const sid = String(b.id), st = STATUS_GLYPH[sid] ? sid : sid.startsWith('d-') ? sid.slice(2) : b.bond ? 'bond' : sid.startsWith('fx-') ? 'fx' : '';
        return `<u class="bf-icon g">${st ? statusIcon(st) : `<em>${(b.name || '?')[0]}</em>`}</u>`;
      };
      const live = pool.slice(0, n);
      this.buffRow.innerHTML = live.map(b => `<span class="buff${b.bad ? ' bad' : ''}${b.bond ? ' bond' : ''}${!first && !had.has(b.id) ? ' gain' : ''}">${icon(b)}<s></s><i></i></span>`).join('');
      // the name lives in the tooltip (bound once per chip, read live on hover)
      this._bR = live.map((b, i) => {
        const el = this.buffRow.children[i], id = b.id;
        Tip.set(el, () => this._buffTip(id));
        return { id, bad: b.bad, bond: b.bond, img: b.img, el, t: el.querySelector('i'), s: el.querySelector('s'), u: el.querySelector('u'), left: b.left, stacks: b.stacks, exp: false };
      });
    }
    // the seconds and stacks, in place; a refresh (more time or another stack) pulses the icon once
    for (let i = 0; i < n; i++) {
      const b = pool[i], r = this._bR[i];
      // under each icon: the seconds left, or a short label (2/4, +50%) for the ones with no timer
      hudText(r.t, b.left != null ? Math.ceil(b.left) : b.label);
      hudText(r.s, b.stacks > 1 ? b.stacks : '');
      if (!rebuild && r.u.animate && ((b.left != null && r.left != null && b.left > r.left + 0.6) || b.stacks > r.stacks)) {
        r.u.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
      }
      r.left = b.left; r.stacks = b.stacks;
      const exp = b.left != null && b.left <= 3;
      if (exp !== r.exp) { r.exp = exp; r.el.classList.toggle('exp', exp); }
    }
  },
  _bput(pool, i, id, name, left, stacks, bad, bond, label, img, tip, own) {
    const b = pool[i] || (pool[i] = {});
    b.id = id; b.name = name; b.left = left; b.stacks = stacks || 1; b.bad = bad; b.bond = bond; b.label = label; b.img = img; b.tip = tip; b.own = own;
  },
  // a buff's tooltip, from what's up right now (an ability's name as this hero has it: a spec may rename it)
  _buffTip(id) {
    const pool = this._bPool || [], R = this._bR || [], k = this.actor && this.actor.kit;
    let b = null;
    for (let i = 0; i < R.length; i++) if (pool[i] && pool[i].id === id) { b = pool[i]; break; }
    if (!b) return '';
    if (b.own && BUFF_TIPS[id] && k) {
      const nm = base => { const ab = k.abilities.find(x => (x.replaces || x.id) === base); return ab ? ab.name : base; };
      return `<b>${BUFF_NAMES[id]}${b.stacks > 1 ? ` ×${b.stacks}` : ''}</b>${b.left != null ? `<em>${Math.ceil(b.left)}s</em>` : ''}${BUFF_TIPS[id](nm)}`;
    }
    const head = `<b>${b.name}${b.stacks > 1 ? ` ×${b.stacks}` : ''}</b>${b.left != null ? `<em>${Math.ceil(b.left)}s</em>` : b.label ? `<em>${b.label}</em>` : ''}`;
    return head + (b.tip ? tipAttr(b.tip) : '');
  },
};
// the borrowed buff each talent move hides while its own is up (BUFF_HIDES, the other way round)
const BUFF_HIDDEN_BY = {};
for (const [own, base] of Object.entries(BUFF_HIDES)) BUFF_HIDDEN_BY[base] = own;

// ---------------------------------------------------------------- drawn ability icons (classes without painted icons yet)
// A dark tile in the class accent with a simple glyph per move. Cached as data URLs; null for classes that have art.
const DRAWN_ICONS = {};
const ICON_GLYPHS = {
  thermist: {
    cinder: c => { c.fillStyle = '#ff8a3a'; c.beginPath(); c.arc(30, 34, 9, 0, TAU); c.fill(); c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(32, 32, 4, 0, TAU); c.fill(); c.strokeStyle = '#ff8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 40); c.lineTo(10, 52); c.stroke(); },
    rime: c => { c.fillStyle = '#9ad8ff'; c.beginPath(); c.moveTo(32, 10); c.lineTo(40, 32); c.lineTo(32, 54); c.lineTo(24, 32); c.closePath(); c.fill(); c.fillStyle = '#e8f8ff'; c.fillRect(31, 18, 2, 28); },
    flare: c => { c.fillStyle = '#ffa64a'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 9 : 22; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.fill(); c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); },
    lance: c => { c.fillStyle = '#7ac0f0'; c.beginPath(); c.moveTo(8, 56); c.lineTo(56, 8); c.lineTo(46, 26); c.lineTo(14, 58); c.closePath(); c.fill(); c.strokeStyle = '#e8f8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 52); c.lineTo(52, 12); c.stroke(); },
    equil: c => { c.fillStyle = '#4f94d8'; c.beginPath(); c.arc(32, 32, 18, Math.PI / 2, Math.PI * 1.5); c.fill(); c.fillStyle = '#f08236'; c.beginPath(); c.arc(32, 32, 18, -Math.PI / 2, Math.PI / 2); c.fill(); c.fillStyle = '#f2e6c8'; c.fillRect(30, 10, 4, 44); },
    invert: c => { c.lineWidth = 5; c.strokeStyle = '#f08236'; c.beginPath(); c.arc(32, 32, 17, -Math.PI * 0.9, -0.1); c.stroke(); c.strokeStyle = '#6fb2f0'; c.beginPath(); c.arc(32, 32, 17, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); c.fillStyle = '#f08236'; c.beginPath(); c.moveTo(50, 26); c.lineTo(56, 38); c.lineTo(43, 36); c.fill(); c.fillStyle = '#6fb2f0'; c.beginPath(); c.moveTo(14, 38); c.lineTo(8, 26); c.lineTo(21, 28); c.fill(); },
    thermocline: c => { c.lineWidth = 5; const g = c.createLinearGradient(8, 0, 56, 0); g.addColorStop(0, '#ffa64a'); g.addColorStop(1, '#6fb2f0'); c.strokeStyle = g; c.beginPath(); for (let x = 8; x <= 56; x += 2) c.lineTo(x, 32 + Math.sin(x / 6) * 10); c.stroke(); },
    zero: c => { c.strokeStyle = '#d8f0ff'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(32 - Math.cos(a) * 20, 32 - Math.sin(a) * 20); c.lineTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); c.stroke(); } c.fillStyle = '#9ad8ff'; c.beginPath(); c.arc(32, 32, 5, 0, TAU); c.fill(); },
    bleed: c => { c.strokeStyle = '#ff7a7a'; c.lineWidth = 3; for (const x of [22, 32, 42]) { c.beginPath(); c.moveTo(x, 50); c.bezierCurveTo(x - 6, 40, x + 6, 30, x, 14); c.stroke(); } },
  },
  driftblade: {
    carve: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(30, 36, 20, -2.4, 0.2); c.stroke(); c.strokeStyle = '#7fe8cc'; c.lineWidth = 2; c.beginPath(); c.arc(30, 36, 14, -2.2, 0); c.stroke(); },
    slip: c => { c.strokeStyle = '#7fe8cc'; c.lineWidth = 3; c.lineCap = 'round'; for (const [y, l] of [[22, 30], [32, 40], [42, 26]]) { c.beginPath(); c.moveTo(10, y); c.lineTo(10 + l, y); c.stroke(); } c.fillStyle = '#e8fff8'; c.beginPath(); c.moveTo(56, 32); c.lineTo(44, 24); c.lineTo(44, 40); c.fill(); },
    hook: c => { c.fillStyle = '#c86a5a'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); c.strokeStyle = '#7fe8cc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(32, 32, 18, Math.PI * 0.8, Math.PI * 2.1); c.stroke(); c.fillStyle = '#7fe8cc'; c.beginPath(); c.moveTo(50, 36); c.lineTo(56, 24); c.lineTo(44, 26); c.fill(); },
    cross: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(12, 32, 30, -0.8, 0.8); c.stroke(); c.strokeStyle = '#7fe8cc'; c.beginPath(); c.arc(52, 32, 30, Math.PI - 0.8, Math.PI + 0.8); c.stroke(); },
    still: c => { c.strokeStyle = '#f2e6c8'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 18, 0, TAU); c.stroke(); c.strokeStyle = '#e8fff8'; c.lineWidth = 4; c.beginPath(); c.moveTo(14, 46); c.lineTo(50, 18); c.stroke(); },
    gale: c => { c.strokeStyle = '#7fe8cc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.32, r = 3 + i * 0.55; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.stroke(); },
    impact: c => { const g = c.createLinearGradient(8, 56, 46, 18); g.addColorStop(0, 'rgba(255,208,138,0)'); g.addColorStop(1, '#ffd08a'); c.strokeStyle = g; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, 56); c.lineTo(44, 20); c.stroke(); c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(46, 18, 7, 0, TAU); c.fill(); },
    gyre: c => { c.strokeStyle = '#a8f0c8'; c.lineWidth = 4; c.lineCap = 'round'; for (const o of [0, Math.PI]) { c.beginPath(); c.arc(32, 32, 18, o, o + 2.4); c.stroke(); } c.fillStyle = '#e8fff8'; c.beginPath(); c.arc(32, 32, 4, 0, TAU); c.fill(); },
    tailspin: c => { c.strokeStyle = '#e8fff8'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; c.beginPath(); c.arc(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6, 16, a, a + 1.6); c.stroke(); } },
  },
};
// Ironpalm: iron, cloth wraps, saffron light
ICON_GLYPHS.ironpalm = (() => {
  const wrap = '#d8c0a0', iron = '#9aa6b4', saf = '#f0a73a';
  const knuckles = (c, x, y, s = 1) => { for (let i = 0; i < 4; i++) { c.fillStyle = iron; c.beginPath(); c.arc(x + (i - 1.5) * 7 * s, y, 3.4 * s, 0, TAU); c.fill(); } };
  return {
    palm: c => { c.fillStyle = wrap; c.beginPath(); c.ellipse(32, 36, 13, 15, 0, 0, TAU); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(21 + i * 7, 18, 3.2, 8, 0, 0, TAU); c.fill(); } c.strokeStyle = saf; c.lineWidth = 2; c.beginPath(); c.arc(32, 36, 22, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(32, 36, 27, -0.4, 0.4); c.stroke(); },
    fist: c => { c.fillStyle = wrap; c.beginPath(); c.roundRect(16, 22, 32, 26, 7); c.fill(); c.strokeStyle = 'rgba(90,60,40,0.6)'; c.lineWidth = 1.5; for (const y of [32, 38, 44]) { c.beginPath(); c.moveTo(16, y); c.lineTo(48, y); c.stroke(); } knuckles(c, 32, 22); c.fillStyle = saf; c.beginPath(); c.moveTo(52, 14); c.lineTo(58, 8); c.lineTo(56, 18); c.fill(); },
    kick: c => { c.fillStyle = wrap; c.beginPath(); c.moveTo(10, 44); c.lineTo(34, 40); c.lineTo(50, 26); c.lineTo(56, 32); c.lineTo(40, 50); c.lineTo(10, 52); c.closePath(); c.fill(); c.strokeStyle = saf; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.arc(22, 54, 30, -1.4, -0.5); c.stroke(); },
    read: c => { c.strokeStyle = '#f2e6c8'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 20, 0, TAU); c.stroke(); c.fillStyle = wrap; c.beginPath(); c.ellipse(32, 34, 9, 12, 0, 0, TAU); c.fill(); c.fillStyle = saf; c.beginPath(); c.arc(32, 12, 4, 0, TAU); c.fill(); c.strokeStyle = saf; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 16); c.lineTo(32, 22); c.stroke(); },
    skin: c => { c.fillStyle = '#6a7684'; c.beginPath(); c.moveTo(32, 8); c.lineTo(52, 18); c.lineTo(48, 44); c.lineTo(32, 56); c.lineTo(16, 44); c.lineTo(12, 18); c.closePath(); c.fill(); c.strokeStyle = '#c8d2dc'; c.lineWidth = 2; c.stroke(); knuckles(c, 32, 30, 0.8); },
    bell: c => { c.fillStyle = '#c8943a'; c.beginPath(); c.moveTo(20, 44); c.quadraticCurveTo(20, 16, 32, 14); c.quadraticCurveTo(44, 16, 44, 44); c.closePath(); c.fill(); c.fillStyle = '#8a5a20'; c.fillRect(17, 43, 30, 4); c.strokeStyle = saf; c.lineWidth = 2; for (const r of [26, 31]) { c.beginPath(); c.arc(32, 34, r, -0.5, 0.5); c.stroke(); c.beginPath(); c.arc(32, 34, r, Math.PI - 0.5, Math.PI + 0.5); c.stroke(); } },
    pond: c => { c.strokeStyle = '#8fc8e8'; for (const [r, w] of [[8, 3], [15, 2], [22, 1.5]]) { c.lineWidth = w; c.beginPath(); c.ellipse(32, 38, r, r * 0.55, 0, 0, TAU); c.stroke(); } c.fillStyle = '#e8f6ff'; c.beginPath(); c.arc(32, 22, 4, 0, TAU); c.fill(); },
    slide: c => { c.fillStyle = '#8a6a50'; for (const [x, y, r] of [[22, 44, 9], [36, 40, 11], [46, 50, 7], [28, 26, 6]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } c.strokeStyle = '#d08a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 14); c.lineTo(54, 56); c.stroke(); },
    bellows: c => { c.fillStyle = '#7a5434'; c.beginPath(); c.moveTo(14, 20); c.lineTo(40, 26); c.lineTo(40, 38); c.lineTo(14, 44); c.closePath(); c.fill(); c.fillStyle = '#ff9a4a'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(46 + i * 5, 32 + (i - 1) * 5, 3 - i * 0.6, 0, TAU); c.fill(); } },
    dragon: c => { c.strokeStyle = saf; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 20; i++) { const q = i / 20; c.lineTo(12 + q * 40, 52 - q * 40 + Math.sin(q * 9) * 6); } c.stroke(); c.fillStyle = '#ffe0a0'; c.beginPath(); c.arc(52, 12, 5, 0, TAU); c.fill(); },
    taunt: c => { c.fillStyle = wrap; c.beginPath(); c.ellipse(30, 38, 12, 13, 0, 0, TAU); c.fill(); c.lineCap = 'round'; c.strokeStyle = wrap; c.lineWidth = 5; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(24 + i * 7, 28); c.quadraticCurveTo(26 + i * 7, 14, 34 + i * 7, 16); c.stroke(); } c.strokeStyle = saf; c.lineWidth = 2; c.beginPath(); c.arc(30, 36, 24, -2.2, -1.2); c.stroke(); },
  };
})();
// Threadweaver and Marionettist (classes-c): drawn icons, gauge tooltips
Object.assign(ICON_GLYPHS, {
  threadweaver: {
    needle: c => { c.strokeStyle = '#e8eef4'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(12, 52); c.lineTo(54, 10); c.stroke(); c.fillStyle = '#c8a24a'; c.beginPath(); c.ellipse(14, 50, 5, 3, -0.78, 0, TAU); c.fill(); c.strokeStyle = '#cbb8ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(14, 50); c.bezierCurveTo(30, 58, 20, 30, 42, 36); c.stroke(); },
    tie: c => { c.strokeStyle = '#cbb8ff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, 44); c.bezierCurveTo(24, 20, 40, 44, 54, 20); c.stroke(); c.fillStyle = '#f2e6ff'; for (const [x, y] of [[10, 44], [54, 20]]) { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); } c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 5, 0, TAU); c.stroke(); },
    mend: c => { c.strokeStyle = '#e4d8ff'; c.lineWidth = 3; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(14, 50); c.lineTo(50, 14); c.stroke(); c.setLineDash([]); c.fillStyle = '#b89cff'; c.fillRect(28, 16, 8, 32); c.fillRect(16, 28, 32, 8); },
    snip: c => { c.strokeStyle = '#e8eef4'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(14, 14); c.lineTo(46, 46); c.moveTo(14, 50); c.lineTo(46, 18); c.stroke(); c.strokeStyle = '#ff9ab8'; c.lineWidth = 2.5; for (const y of [14, 50]) { c.beginPath(); c.arc(12, y, 6, 0, TAU); c.stroke(); } c.strokeStyle = '#cbb8ff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(42, 32); c.lineTo(58, 28); c.moveTo(42, 34); c.lineTo(58, 40); c.stroke(); },
    // a weaver's shuttle: a pointed wooden boat with its bobbin, thread trailing off behind it
    shuttle: c => { c.fillStyle = '#c8a24a'; c.strokeStyle = '#6a4a20'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8, 40); c.quadraticCurveTo(32, 18, 56, 24); c.quadraticCurveTo(34, 46, 8, 40); c.fill(); c.stroke(); c.fillStyle = '#f2e6ff'; c.beginPath(); c.ellipse(32, 33, 7, 3.5, -0.3, 0, TAU); c.fill(); c.strokeStyle = '#cbb8ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(26, 35); c.bezierCurveTo(18, 50, 34, 54, 22, 60); c.stroke(); },
    tapestry: c => { c.strokeStyle = '#ffd89a'; c.lineWidth = 1.6; const p = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; p.push([32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20]); } for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { c.beginPath(); c.moveTo(p[i][0], p[i][1]); c.lineTo(p[j][0], p[j][1]); c.stroke(); } c.fillStyle = '#f2e6ff'; for (const [x, y] of p) { c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); } },
    embroider: c => { c.strokeStyle = '#f0d8ff'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.moveTo(32, 32); c.quadraticCurveTo(32 + Math.cos(a + 0.6) * 16, 32 + Math.sin(a + 0.6) * 16, 32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); c.stroke(); } c.fillStyle = '#b89cff'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); },
    cradle: c => { c.strokeStyle = '#cbb8ff'; c.lineWidth = 2; for (const [a, b] of [[[12, 20], [52, 44]], [[12, 44], [52, 20]], [[20, 12], [44, 52]], [[44, 12], [20, 52]]]) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } c.beginPath(); c.arc(32, 32, 22, 0, TAU); c.stroke(); },
  },
  marionettist: {
    jab: c => { c.fillStyle = '#e8eef4'; c.beginPath(); c.moveTo(10, 54); c.lineTo(54, 10); c.lineTo(16, 58); c.fill(); c.fillStyle = '#c89a64'; c.beginPath(); c.arc(14, 54, 6, 0, TAU); c.fill(); },
    // Cue (until its painted icon exists): a finger snap, one gold string down to the Doll's stiletto lunging
    cue: c => { c.strokeStyle = '#ffd27a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, 6); c.lineTo(30, 34); c.stroke(); c.fillStyle = '#e8eef4'; c.beginPath(); c.moveTo(24, 58); c.lineTo(56, 26); c.lineTo(30, 60); c.fill(); c.fillStyle = '#c89a64'; c.beginPath(); c.arc(27, 57, 5, 0, TAU); c.fill(); c.strokeStyle = '#fff4dc'; c.lineWidth = 2.5; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.5 + (i > 2 ? Math.PI : 0); c.beginPath(); c.moveTo(20 + Math.cos(a) * 6, 14 + Math.sin(a) * 6); c.lineTo(20 + Math.cos(a) * 12, 14 + Math.sin(a) * 12); c.stroke(); } },
    pull: c => { c.strokeStyle = '#f6e6f0'; c.lineWidth = 1.5; for (const x of [18, 32, 46]) { c.beginPath(); c.moveTo(x, 8); c.lineTo(32 + (x - 32) * 0.3, 40); c.stroke(); } c.fillStyle = '#9a6a3c'; c.fillRect(12, 6, 40, 5); c.fillStyle = '#f8efe8'; c.beginPath(); c.arc(32, 46, 9, 0, TAU); c.fill(); c.strokeStyle = '#d0507e'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 58); c.lineTo(24, 50); c.stroke(); },
    cross: c => { c.strokeStyle = '#ffd8ec'; c.lineWidth = 3; c.beginPath(); c.moveTo(8, 50); c.lineTo(56, 14); c.stroke(); c.fillStyle = '#c86a5a'; c.beginPath(); c.arc(32, 32, 8, 0, TAU); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, 46); c.lineTo(54, 12); c.stroke(); },
    pirouette: c => { c.strokeStyle = '#f0c8dc'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(32, 32, 20, -0.3, Math.PI * 1.5); c.stroke(); c.fillStyle = '#f8efe8'; c.beginPath(); c.arc(32, 32, 8, 0, TAU); c.fill(); c.fillStyle = '#d0507e'; c.beginPath(); c.moveTo(50, 20); c.lineTo(56, 32); c.lineTo(44, 30); c.fill(); },
    swap: c => { c.fillStyle = '#1c1a22'; c.beginPath(); c.arc(20, 32, 9, 0, TAU); c.fill(); c.fillStyle = '#f8efe8'; c.beginPath(); c.arc(44, 32, 9, 0, TAU); c.fill(); c.strokeStyle = '#f0a8cc'; c.lineWidth = 2.5; c.beginPath(); c.arc(32, 32, 18, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.beginPath(); c.arc(32, 32, 18, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); },
    finale: c => { c.fillStyle = '#ffd27a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(12 + i * 10, 52, 4, 2.5, 0, 0, TAU); c.fill(); } c.fillStyle = '#d03050'; c.beginPath(); c.moveTo(6, 8); c.quadraticCurveTo(20, 30, 12, 46); c.lineTo(6, 46); c.fill(); c.beginPath(); c.moveTo(58, 8); c.quadraticCurveTo(44, 30, 52, 46); c.lineTo(58, 46); c.fill(); c.fillStyle = '#f8efe8'; c.beginPath(); c.arc(32, 28, 8, 0, TAU); c.fill(); },
    tangle: c => { c.strokeStyle = '#f0c8dc'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(32, 32, 20, 8, i * Math.PI / 4, 0, TAU); c.stroke(); } c.fillStyle = '#c86a5a'; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); },
    redcurtain: c => { c.fillStyle = '#d03050'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(32 + s * 26, 6); c.quadraticCurveTo(32 + s * 6, 30, 32 + s * 16, 58); c.lineTo(32 + s * 26, 58); c.fill(); } c.fillStyle = '#ffd27a'; c.fillRect(6, 6, 52, 4); },
  },
});
GAUGE_TIPS.threadweaver = {
  desc: 'Fills as your threads carry damage: about 1 for every 1% of your health they carry. Mend Seam spends 35 to land at once and stronger. The knots above it are your threads; they redden as their ends pull apart.',
  state: k => { const n = weaveCount(k); return `${n} thread${n === 1 ? '' : 's'}` + (k.g.spool >= WEAVE.MEND_COST ? ' · Mend Seam instant' : ''); },
};
GAUGE_TIPS.marionettist = {
  desc: 'Strings (top): three tie you to the Doll. One tears if it strays past their reach or a blow lands on it, and grows back after 15s; with none left the Doll lies limp for 4s. Pull Strings ties all three back and gets a limp Doll up at once. Encore (the footlights) builds from Cue and the Doll\'s other moves (not its own Jabs), and 1 more for a blow it spins through under Pirouette; Grand Finale spends all 5. Strung: each String still tied gives you 5% more damage and 5% faster Jabs.',
  state: k => (mariLimp(k) ? 'Limp' : `${k.g.strings} String${k.g.strings === 1 ? '' : 's'}`) + ` · Encore ${k.g.encore || 0} / 5` + (k.g.quick ? ` · ${k.g.quick} quick Jab${k.g.quick === 1 ? '' : 's'}` : ''),
};
function drawnIcon(classId, abilityId, force = false) {
  if (typeof document === 'undefined' || typeof CLASSES === 'undefined') return null;
  const key = classId + '/' + abilityId + (force ? '!' : '');
  if (key in DRAWN_ICONS) return DRAWN_ICONS[key];
  const cls = CLASSES.find(x => x.id === classId);
  if (!cls || (!force && (!cls.art || cls.art.icons !== false))) return (DRAWN_ICONS[key] = null);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const bg = c.createRadialGradient(32, 26, 4, 32, 32, 46);
  bg.addColorStop(0, shade(cls.accent, -0.35)); bg.addColorStop(1, '#14111a');
  c.fillStyle = bg; c.fillRect(0, 0, 64, 64);
  const g = ICON_GLYPHS[classId] && ICON_GLYPHS[classId][abilityId];
  if (g) g(c);
  else { c.fillStyle = '#f2e6c8'; c.font = '700 30px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(abilityId[0].toUpperCase(), 32, 34); }
  c.strokeStyle = rgba(cls.accent, 0.6); c.lineWidth = 2; c.strokeRect(1, 1, 62, 62);
  return (DRAWN_ICONS[key] = cv.toDataURL());
}

// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
Object.assign(BUFF_NAMES, { jaw: 'Open Wide', bottomless: 'Bottomless', stone: 'Stone Belly', ironjaw: 'Iron Gut', digest: 'Digest' });
Object.assign(BUFF_ICON, { jaw: 'wide', bottomless: 'bottomless', stone: 'stonebelly', ironjaw: 'iron', digest: 'digest' });
Object.assign(BUFF_TIPS, {
  jaw: () => 'Your jaw is open: an edible hit that lands on you deals a quarter of its damage and goes into your Belly. Step into a teammate\'s circle to swallow it for them.',
  bottomless: () => 'Your jaw is open, raidwides too: they go into your Belly like any other edible hit.',
  stone: () => 'You take less damage, and everything you eat becomes a Spike.',
});
GAUGE_TIPS.gorgemaw = {
  desc: 'An edible hit that lands in your open jaw deals a quarter of its damage and goes in as a Morsel of its shape: circles are Rings, lines Lances, cones Fangs, a tankbuster a Spike. Gulp swallows a Ring into an empty Belly (once every 20s). Spit fires the oldest back at the boss; Digest takes all of them, and its acid makes the next Spit 50% harder for each (up to twice as hard). A full Belly wastes what you eat next.',
  state: k => (k.g.belly.length ? 'next Spit: ' + MAW.NAMES[k.g.belly[0].m] + (k.def.fuse && k.g.belly.length > 1 && k.g.belly[0].m === k.g.belly[1].m ? ' (' + MAW.FUSION[k.g.belly[0].m] + ')' : '') + (k.has('acid') ? ` +${Math.round(k.buffs.get('acid').data.x * 100)}% acid` : '') : 'empty'),
};
GAUGE_TIPS.oathbroker = {
  desc: '60% of every hit you take is written here instead, and billed to you when it comes due. Your combo pays the oldest lines down (under Lien each payment also strikes the boss). Lines in the last 2s are red; renegotiated lines carry a », and come due cheaper under Lien and Writ and count in full for Default.',
  state: k => `${Math.round(k.g.total || 0)} owed · ${Math.round(oathDueSoon(k, 3))} due in 3s`,
};
(() => {
  const ink = (c, w = 3, col = '#f2e6c8') => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const teeth = (c, y, dir, x0 = 14, x1 = 50, n = 5, col = '#fff4e0') => { c.fillStyle = col; const s = (x1 - x0) / n; for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(x0 + i * s, y); c.lineTo(x0 + (i + 1) * s, y); c.lineTo(x0 + (i + 0.5) * s, y + dir * 9); c.closePath(); c.fill(); } };
  const jaw = (c, gape, col = '#d0743a') => { c.fillStyle = '#2a0e08'; c.beginPath(); c.ellipse(32, 32, 20, 4 + gape, 0, 0, TAU); c.fill(); ink(c, 4, col); c.beginPath(); c.ellipse(32, 32, 20, 4 + gape, 0, 0, TAU); c.stroke(); teeth(c, 32 - 4 - gape + 1, 1, 16, 48, 4); teeth(c, 32 + 4 + gape - 1, -1, 16, 48, 4); };
  const sealG = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, rr = r * (i % 2 ? 0.88 : 1); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); ink(c, 2, '#2a1424'); c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.moveTo(x - r * 0.35, y); c.lineTo(x + r * 0.35, y); c.moveTo(x, y - r * 0.35); c.lineTo(x, y + r * 0.35); c.stroke(); };
  const page = (c, x, y, w, h) => { c.fillStyle = '#e8e0cc'; c.fillRect(x, y, w, h); ink(c, 1.5, '#5a4a6a'); for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + 4, y + i * h / 5); c.lineTo(x + w - 4, y + i * h / 5); c.stroke(); } };
  ICON_GLYPHS.gorgemaw = {
    gnash: c => jaw(c, 3, '#e8c8a0'),
    wide: c => jaw(c, 14),
    spit: c => { jaw(c, 6); c.fillStyle = '#ff9a3a'; c.beginPath(); c.arc(54, 18, 7, 0, TAU); c.fill(); c.fillStyle = '#ffe0b0'; c.beginPath(); c.arc(52, 16, 3, 0, TAU); c.fill(); },
    regurgitate: c => { jaw(c, 9); for (const [x, y, col] of [[50, 12, '#ff9a3a'], [56, 26, '#7fd0ff'], [46, 22, '#ffe27a']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill(); } },
    digest: c => { c.fillStyle = '#5a3020'; c.beginPath(); c.ellipse(32, 36, 20, 16, 0, 0, TAU); c.fill(); ink(c, 3, '#ffc070'); c.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.42, r = 2 + i * 0.5; c.lineTo(32 + Math.cos(a) * r, 36 + Math.sin(a) * r * 0.8); } c.stroke(); },
    iron: c => { c.fillStyle = '#b8743a'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); } c.closePath(); c.fill(); ink(c, 2.5, '#ffd8a0'); c.stroke(); c.fillStyle = '#ffd8a0'; for (const [x, y] of [[24, 26], [40, 26], [32, 40]]) { c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill(); } },
    stonebelly: c => { c.fillStyle = '#8a8278'; c.beginPath(); c.ellipse(32, 34, 20, 17, 0, 0, TAU); c.fill(); ink(c, 2, '#d8d0c4'); c.beginPath(); c.moveTo(18, 28); c.lineTo(28, 34); c.lineTo(26, 44); c.moveTo(38, 22); c.lineTo(36, 34); c.lineTo(46, 40); c.stroke(); },
    bottomless: c => { ink(c, 3, '#ff8a3a'); c.beginPath(); for (let i = 0; i < 50; i++) { const a = i * 0.36, r = 24 - i * 0.45; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.stroke(); teeth(c, 10, 1, 12, 52, 6); teeth(c, 54, -1, 12, 52, 6); },
    taunt: c => { jaw(c, 10); ink(c, 2.5, '#ffb070'); for (const r of [24, 29]) { c.beginPath(); c.arc(32, 32, r, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(32, 32, r, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); } },
  };
  ICON_GLYPHS.oathbroker = {
    collect: c => { c.fillStyle = '#8a8098'; c.fillRect(30, 26, 4, 30); c.fillStyle = '#b8a8e0'; c.fillRect(20, 12, 24, 16); ink(c, 2, '#2a1424'); c.strokeRect(20, 12, 24, 16); sealG(c, 32, 44, 8, '#c04a5a'); },
    reneg: c => { page(c, 16, 14, 30, 38); ink(c, 3, '#b8a8e0'); c.beginPath(); c.arc(32, 33, 12, -2.6, 1.2); c.stroke(); c.fillStyle = '#b8a8e0'; c.beginPath(); c.moveTo(18, 22); c.lineTo(24, 30); c.lineTo(14, 30); c.fill(); },
    settle: c => sealG(c, 32, 32, 20, '#ffd27a'),
    audit: c => { page(c, 14, 12, 28, 36); ink(c, 3.5, '#ffd27a'); c.beginPath(); c.arc(38, 36, 9, 0, TAU); c.moveTo(45, 43); c.lineTo(54, 52); c.stroke(); },
    lien: c => { ink(c, 3.5, '#b8a8e0'); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(14 + i * 11, 44 - i * 8, 7, 4, -0.6, 0, TAU); c.stroke(); } sealG(c, 50, 16, 8, '#c04a5a'); },
    cosign: c => { page(c, 12, 14, 24, 32); page(c, 28, 20, 24, 32); ink(c, 3, '#b8a8e0'); c.beginPath(); c.moveTo(18, 52); c.bezierCurveTo(26, 40, 34, 58, 48, 46); c.stroke(); },
    writ: c => { c.fillStyle = '#f0e8d8'; c.fillRect(18, 12, 28, 40); c.fillStyle = '#c8b898'; c.beginPath(); c.ellipse(32, 12, 16, 4, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(32, 52, 16, 4, 0, 0, TAU); c.fill(); ink(c, 1.5, '#5a4a6a'); for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(22, 12 + i * 7); c.lineTo(42, 12 + i * 7); c.stroke(); } },
    default: c => { page(c, 14, 14, 18, 36); page(c, 34, 16, 18, 34); ink(c, 3, '#c04a5a'); c.beginPath(); c.moveTo(32, 10); c.lineTo(28, 22); c.lineTo(36, 32); c.lineTo(30, 44); c.lineTo(34, 56); c.stroke(); },
    foreclose: c => { c.fillStyle = '#8a8098'; c.fillRect(29, 8, 6, 18); c.fillStyle = '#c04a5a'; c.fillRect(16, 24, 32, 12); sealG(c, 32, 48, 10, '#c04a5a'); },
    moratorium: c => { c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(18, 12); c.lineTo(46, 12); c.lineTo(32, 32); c.closePath(); c.fill(); c.beginPath(); c.moveTo(18, 52); c.lineTo(46, 52); c.lineTo(32, 32); c.closePath(); c.fill(); ink(c, 2.5, '#b8a8e0'); c.beginPath(); c.moveTo(14, 12); c.lineTo(50, 12); c.moveTo(14, 52); c.lineTo(50, 52); c.stroke(); },
    taunt: c => { sealG(c, 32, 30, 16, '#c04a5a'); ink(c, 2.5, '#b8a8e0'); c.beginPath(); c.moveTo(10, 54); c.lineTo(54, 54); c.stroke(); },
  };
})();

// ======================================================================= Gloomsworn (tank, class 18)
// Placeholder drawn icons (art.icons === false in data.js) and the gauge's tooltip; the painted set replaces them later.
Object.assign(BUFF_NAMES, { hollow: 'Hollow', shade: 'Shade', mantle: 'Black Mantle', omen: 'Ill Omen' });
Object.assign(BUFF_ICON, { hollow: 'rite', shade: 'shade', mantle: 'mantle', omen: 'rend' });
Object.assign(BUFF_TIPS, {
  hollow: n => `You cannot fall below 1 HP and you deal 30% more damage. Everything you take is written down as a debt: your healer must heal at least that much before the grace after it ends, or you fall. A Sentinel covers the party (15% less damage) while it lasts; a Reaver of Dusk's ${n('strike')} echoes and Dusk Reave costs nothing.`,
  shade: n => `Your next ${n('strike')}s echo, hitting again for 85%.`,
  mantle: () => 'You take 40% less damage.',
  omen: n => `Your next ${n('rend')} strike builds 12 extra Gloom.`,
});
GAUGE_TIPS.gloomsworn = {
  desc: 'Every hit of yours fills 8 Gloom, every hit you take 6. Gloom Strike spends 40, Black Pall 30, Last Rite all of it. Out of combat it drains slowly. When Gloom is full and a blow would kill you, you go Hollow instead: held at 1 HP for 8s, 30% more damage, every wound written down as a debt that your healer must heal back in the 4s after, or you fall. Once a minute.',
  state: k => {
    const h = k.g.hl, hw = k.has('hollow') || (k.g.graceUntil || 0) > k.now;
    if (hw && h) return `Hollow: debt ${Math.round(h.debt)} · healed ${Math.round(h.healed)}`;
    return `${Math.floor(k.g.gloom || 0)} Gloom` + ((k.g.gloom || 0) >= 100 ? ' · full: Hollow is ready' : '');
  },
};
(() => {
  // ink-black and bruised violet for the dark, a cold teal-white for the light that leaks from it
  const K = '#120a1e', D = '#2a1450', B = '#6a3aba', L = '#a98ae8', G = '#bff8ee', W = '#f4fffb';
  const ink = (c, w = 3, col = G) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const glowDot = (c, x, y, r, col = G) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(191,248,238,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  // the duskblade from (x0, y0) to its tip (x1, y1): an ink body, a violet edge and a pale light in the fuller; a jagged guard
  const sword = (c, x0, y0, x1, y1, w = 5, ghost = false) => {
    const a = Math.atan2(y1 - y0, x1 - x0), L2 = Math.hypot(x1 - x0, y1 - y0);
    c.save(); c.translate(x0, y0); c.rotate(a);
    if (ghost) { c.globalAlpha = 0.5; c.fillStyle = 'rgba(95,216,200,0.35)'; c.strokeStyle = G; c.lineWidth = 1.6; }
    else { c.fillStyle = '#1a1230'; c.strokeStyle = L; c.lineWidth = 1.6; }
    c.beginPath(); c.moveTo(L2 * 0.18, -w); c.lineTo(L2 * 0.9, -w * 0.9); c.lineTo(L2, 0); c.lineTo(L2 * 0.9, w * 0.9); c.lineTo(L2 * 0.18, w); c.closePath(); c.fill(); c.stroke();
    if (!ghost) {
      ink(c, 1.6, G); c.beginPath(); c.moveTo(L2 * 0.24, 0); c.lineTo(L2 * 0.88, 0); c.stroke();
      c.fillStyle = D; c.strokeStyle = K; c.lineWidth = 1; c.beginPath(); c.moveTo(L2 * 0.12, -w * 1.9); c.lineTo(L2 * 0.2, -w * 0.9); c.lineTo(L2 * 0.2, w * 0.9); c.lineTo(L2 * 0.12, w * 1.9); c.lineTo(L2 * 0.06, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = K; c.fillRect(-1, -w * 0.4, L2 * 0.14, w * 0.8);
    }
    c.restore();
  };
  // a cracked vessel: a dark sphere with pale light leaking from its cracks
  const vessel = (c, x, y, r, lit = 1) => {
    glowDot(c, x, y, r * 1.5, `rgba(95,216,200,${0.35 * lit})`);
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r); g.addColorStop(0, '#3a2468'); g.addColorStop(1, K);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); ink(c, 1.4, L); c.stroke();
    ink(c, 1.8, G); c.globalAlpha = lit; c.beginPath(); c.moveTo(x - r * 0.1, y - r); c.lineTo(x + r * 0.15, y - r * 0.45); c.lineTo(x - r * 0.2, y - r * 0.05); c.lineTo(x + r * 0.2, y + r * 0.4); c.lineTo(x, y + r);
    c.moveTo(x + r * 0.15, y - r * 0.45); c.lineTo(x + r * 0.7, y - r * 0.6); c.moveTo(x - r * 0.2, y - r * 0.05); c.lineTo(x - r * 0.75, y + r * 0.1); c.stroke(); c.globalAlpha = 1;
  };
  const figure = (c, x, y, s, fill, a = 1) => {   // a hooded, cloaked figure seen from the front
    c.save(); c.globalAlpha = a; c.fillStyle = fill; c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, -22); c.quadraticCurveTo(10, -22, 10, -10); c.lineTo(15, 14); c.lineTo(10, 11); c.lineTo(6, 16); c.lineTo(2, 12); c.lineTo(-2, 16); c.lineTo(-6, 11); c.lineTo(-10, 14); c.lineTo(-15, 14); c.lineTo(-10, -10); c.quadraticCurveTo(-10, -22, 0, -22); c.closePath(); c.fill(); c.restore();
  };
  ICON_GLYPHS.gloomsworn = {
    // three swings, each bigger, a dark trail behind the blade
    rend: c => {
      for (const [r, a, w, col] of [[12, 0.5, 3, B], [18, 0.75, 4.5, L], [24, 1, 6, G]]) { c.globalAlpha = a; ink(c, w, col); c.beginPath(); c.arc(14, 54, r + 14, -1.35, -0.2); c.stroke(); }
      c.globalAlpha = 1; sword(c, 12, 56, 54, 14, 5);
    },
    // the blade driven down, a pale blade still hanging behind it, the floor cracked open
    strike: c => {
      sword(c, 40, 6, 24, 44, 4.5, true);
      sword(c, 32, 4, 32, 46, 5);
      ink(c, 2.2, G); c.beginPath(); c.moveTo(32, 50); c.lineTo(14, 56); c.moveTo(32, 50); c.lineTo(52, 56); c.moveTo(32, 50); c.lineTo(28, 60); c.moveTo(32, 50); c.lineTo(42, 60); c.stroke();
      glowDot(c, 32, 50, 9);
    },
    // a dark knight stepping through: a pale ghost left behind, streaks
    shade: c => {
      ink(c, 2, L); for (const [y, l] of [[22, 12], [34, 18], [46, 10]]) { c.globalAlpha = 0.6; c.beginPath(); c.moveTo(6, y); c.lineTo(6 + l, y); c.stroke(); } c.globalAlpha = 1;
      figure(c, 22, 36, 1, 'rgba(95,216,200,0.35)', 0.8);
      figure(c, 42, 36, 1.05, '#1a1230'); ink(c, 1.5, L); c.beginPath(); c.moveTo(42, 14); c.quadraticCurveTo(53, 14, 53, 26); c.stroke(); glowDot(c, 40, 24, 3, W); glowDot(c, 45, 24, 3, W);
    },
    // a bell of shadow standing over a ground ring
    pall: c => {
      c.fillStyle = D; c.beginPath(); c.moveTo(6, 52); c.quadraticCurveTo(10, 14, 32, 12); c.quadraticCurveTo(54, 14, 58, 52); c.closePath(); c.fill(); ink(c, 2.4, L); c.stroke();
      ink(c, 1.4, B); for (const x of [18, 32, 46]) { c.beginPath(); c.moveTo(32, 12); c.quadraticCurveTo(x, 30, x + (x - 32) * 0.5, 50); c.stroke(); }
      ink(c, 2, G); c.beginPath(); c.ellipse(32, 52, 26, 6, 0, 0, TAU); c.stroke();
      glowDot(c, 32, 12, 7); c.fillStyle = W; c.beginPath(); c.arc(32, 12, 2.5, 0, TAU); c.fill();
    },
    // a cloak streaming back from the shoulders
    mantle: c => {
      c.fillStyle = '#1e1236'; c.beginPath(); c.moveTo(32, 6); c.quadraticCurveTo(46, 8, 50, 22); c.quadraticCurveTo(58, 40, 52, 58); c.lineTo(46, 50); c.lineTo(40, 58); c.lineTo(34, 50); c.lineTo(28, 58); c.lineTo(22, 50); c.lineTo(16, 58); c.quadraticCurveTo(6, 40, 14, 22); c.quadraticCurveTo(18, 8, 32, 6); c.closePath(); c.fill(); ink(c, 2.2, L); c.stroke();
      ink(c, 1.4, B); c.beginPath(); c.moveTo(32, 12); c.quadraticCurveTo(26, 34, 30, 52); c.moveTo(32, 12); c.quadraticCurveTo(40, 34, 38, 52); c.stroke();
      glowDot(c, 32, 14, 6); c.fillStyle = W; c.beginPath(); c.arc(32, 14, 2.2, 0, TAU); c.fill();
    },
    // the vessel with the dark collapsing in upon it
    rite: c => {
      ink(c, 2.4, L); c.setLineDash([5, 4]); c.beginPath(); c.arc(32, 32, 27, 0, TAU); c.stroke(); c.setLineDash([]);
      ink(c, 2.4, G); for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.7; c.beginPath(); c.moveTo(Math.cos(a) * 28 + 32, Math.sin(a) * 28 + 32); c.lineTo(Math.cos(a) * 19 + 32, Math.sin(a) * 19 + 32); c.stroke(); }
      vessel(c, 32, 32, 14);
    },
    // a lantern of pale watch inside a black arch
    vigil: c => {
      ink(c, 3, L); c.beginPath(); c.moveTo(8, 56); c.lineTo(8, 28); c.quadraticCurveTo(8, 6, 32, 6); c.quadraticCurveTo(56, 6, 56, 28); c.lineTo(56, 56); c.stroke();
      c.fillStyle = K; c.fillRect(24, 22, 16, 26); ink(c, 2, B); c.strokeRect(24, 22, 16, 26); c.beginPath(); c.moveTo(28, 22); c.lineTo(32, 14); c.lineTo(36, 22); c.stroke();
      glowDot(c, 32, 36, 14); c.fillStyle = W; c.beginPath(); c.moveTo(32, 28); c.quadraticCurveTo(38, 38, 32, 44); c.quadraticCurveTo(26, 38, 32, 28); c.fill();
    },
    // the vessel broken over the target in black fire
    pyre: c => {
      c.fillStyle = D; c.beginPath(); c.moveTo(32, 4); c.quadraticCurveTo(54, 24, 46, 44); c.quadraticCurveTo(52, 36, 42, 30); c.quadraticCurveTo(46, 50, 32, 58); c.quadraticCurveTo(18, 50, 22, 30); c.quadraticCurveTo(12, 36, 18, 44); c.quadraticCurveTo(10, 24, 32, 4); c.closePath(); c.fill(); ink(c, 2.2, L); c.stroke();
      c.fillStyle = '#4a2a8a'; c.beginPath(); c.moveTo(32, 20); c.quadraticCurveTo(42, 34, 32, 50); c.quadraticCurveTo(22, 34, 32, 20); c.fill();
      glowDot(c, 32, 42, 9); c.fillStyle = W; c.beginPath(); c.arc(32, 42, 3, 0, TAU); c.fill();
    },
    // the Dread Mark: an eye cracked open on a dark disc
    taunt: c => {
      c.fillStyle = K; c.beginPath(); c.arc(32, 32, 24, 0, TAU); c.fill(); ink(c, 2.4, L); c.stroke();
      ink(c, 2.4, G); c.beginPath(); c.moveTo(12, 32); c.quadraticCurveTo(32, 12, 52, 32); c.quadraticCurveTo(32, 52, 12, 32); c.stroke();
      glowDot(c, 32, 32, 10); c.fillStyle = W; c.beginPath(); c.arc(32, 32, 4, 0, TAU); c.fill();
      ink(c, 1.6, G); c.beginPath(); c.moveTo(32, 8); c.lineTo(36, 18); c.moveTo(32, 56); c.lineTo(28, 46); c.stroke();
    },
    // the black sun and its corona, the pale light cracking through it
    eclipsevigil: c => {
      glowDot(c, 32, 32, 30, 'rgba(95,216,200,0.5)');
      ink(c, 1.8, G); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r0 = 17, r1 = i % 2 ? 24 : 30; c.beginPath(); c.moveTo(32 + Math.cos(a) * r0, 32 + Math.sin(a) * r0); c.lineTo(32 + Math.cos(a) * r1, 32 + Math.sin(a) * r1); c.stroke(); }
      c.fillStyle = K; c.beginPath(); c.arc(32, 32, 16, 0, TAU); c.fill(); ink(c, 2.6, W); c.stroke();
      ink(c, 1.4, G); c.beginPath(); c.moveTo(30, 17); c.lineTo(34, 27); c.lineTo(28, 35); c.lineTo(35, 47); c.stroke();
    },
  };
})();

// ======================================================================= Reaper (id thresher; damage, class 19)
// Drawn icons (art.icons === false in data.js) and the gauge's tooltip; the painted set replaces them later.
Object.assign(BUFF_NAMES, { frenzy: 'Insane Reaper', deathmark: 'Death Mark', gatebreaker: 'Gatebreaker', blinked: 'Blinked', stepthrough: 'Step Through', afterimage: 'Afterimage' });
Object.assign(BUFF_ICON, { frenzy: 'wisp', deathmark: 'slash', gatebreaker: 'reapersgate', blinked: 'blink', stepthrough: 'blink', afterimage: 'blink' });
Object.assign(BUFF_TIPS, {
  frenzy: () => 'Insane Reaper: the party acts 10% faster (it stacks with other party haste), and your own swings come faster still.',
  deathmark: () => 'Your next hits strike 30% harder (each swing or finisher uses one).',
  gatebreaker: () => 'Gatebreaker: your finishers, Snaps and the release strike 25% harder until the Gate closes.',
  blinked: () => 'Phantom: your next finisher teleports you to the far side of the target.',
  stepthrough: () => 'Your next string starts at swing 2.',
  afterimage: () => 'An afterimage waits: your next finisher is repeated at 50%.',
});
GAUGE_TIPS.thresher = {
  desc: 'The crescent fills with every mark a Snap pops (more for a Full Harvest). When it is full the next Snap is a Harvest Moon and pops every mark twice. The four runes under it are the marks on your target: Drain, Bind, Death Mark and Thread. The pips are the swings of your string.',
  state: k => {
    const n = reapN(k), m = reapTargetMarks(k).length;
    if (k.has('gatebreaker')) return 'Gatebreaker';
    return `${n ? 'swing ' + n + ' · ' : ''}${m} mark${m === 1 ? '' : 's'} on target${(k.g.moon || 0) >= 100 ? ' · Harvest Moon ready' : ''}`;
  },
};
(() => {
  // void black for the dark, deep violet and a pale soul-fire teal light, gold for what is due, a violet vein, pale silver for the edge
  const K = '#0c0a14', D = '#2a1840', M = '#5a3a8a', S = '#8fd8e8', W = '#e0f6ff', V = '#a77ae8', G = '#ffd65a', G2 = '#fff1a8', A = '#4a2a6a', R = '#8a82a0';
  const ink = (c, w = 3, col = S) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const glowDot = (c, x, y, r, col = S, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(143,216,232,0)'); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
  const dot = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  // the scythe: a snath from (x0, y0) toward (x1, y1) and a long curved blade swept from its head, `flip` turning the blade the other way
  const scythe = (c, x0, y0, x1, y1, o = {}) => {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), fl = o.flip ? -1 : 1, edge = o.edge || S, body = o.body || '#e4eaf2';
    c.save(); c.translate(x0, y0); c.rotate(a);
    ink(c, 3.6, K); c.beginPath(); c.moveTo(-3, 0); c.lineTo(L, 0); c.stroke();
    ink(c, 2.2, A); c.beginPath(); c.moveTo(-2, 0); c.lineTo(L, 0); c.stroke();
    c.fillStyle = body; c.strokeStyle = K; c.lineWidth = 1.6; c.beginPath();
    // (the hero's blade, heroes.js: a crescent hooked off the head and curling back towards the hands)
    c.moveTo(L - 3, fl * 3); c.bezierCurveTo(L + 10, fl * -2, L + 10, fl * -16, L - 2, fl * -21); c.bezierCurveTo(L - 8, fl * -23, L - 14, fl * -22, L - 18, fl * -19);
    c.bezierCurveTo(L - 12, fl * -19, L - 1, fl * -15, L + 1, fl * -6); c.closePath(); c.fill(); c.stroke();
    ink(c, 1.5, edge); c.beginPath(); c.moveTo(L + 1, fl * -6); c.bezierCurveTo(L - 1, fl * -15, L - 12, fl * -19, L - 17, fl * -19); c.stroke();
    glowDot(c, L - 4, fl * -15, 9, edge, 0.5);
    c.restore();
  };
  // a swoosh: the wide crescent a swing leaves, pointed at both ends, from angle a0 to a1 on a circle (cx, cy, r)
  const swoosh = (c, cx, cy, r, a0, a1, w, col, a = 1) => {
    c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath();
    for (let i = 0; i <= 14; i++) { const q = i / 14, an = a0 + (a1 - a0) * q; c.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); }
    for (let i = 14; i >= 0; i--) { const q = i / 14, an = a0 + (a1 - a0) * q, th = w * Math.pow(Math.sin(Math.PI * q), 0.8); c.lineTo(cx + Math.cos(an) * (r - th), cy + Math.sin(an) * (r - th)); }
    c.closePath(); c.fill(); c.restore();
  };
  // the four afflictions, small: a red rune, a rose drop, a violet knot, a pale chain
  const glyphIcon = (c, id, x, y, s, col) => {
    c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => {
      c.beginPath();
      if (id === 'mark') { c.moveTo(0, -s); c.lineTo(s * 0.68, 0); c.lineTo(0, s); c.lineTo(-s * 0.68, 0); c.closePath(); c.moveTo(0, -s * 0.55); c.lineTo(0, s * 0.55); c.moveTo(-s * 0.3, -s * 0.05); c.lineTo(s * 0.3, -s * 0.05); }
      else if (id === 'drain') { c.moveTo(0, -s * 1.05); c.bezierCurveTo(s * 0.9, -s * 0.1, s * 0.8, s * 0.8, 0, s * 0.8); c.bezierCurveTo(-s * 0.8, s * 0.8, -s * 0.9, -s * 0.1, 0, -s * 1.05); }
      else if (id === 'bind') { for (let i = 0; i < 3; i++) { const an = i * TAU / 3 - Math.PI / 2; c.save(); c.rotate(an); c.moveTo(s * 1.04, 0); c.ellipse(s * 0.42, 0, s * 0.62, s * 0.34, 0, 0, TAU); c.restore(); } }
      else { for (let i = 0; i < 3; i++) { const lx = (i - 1) * s * 0.62, ly = (i - 1) * s * 0.62, rx = s * (i % 2 ? 0.42 : 0.3), ry = s * (i % 2 ? 0.3 : 0.42); c.moveTo(lx + rx, ly); c.ellipse(lx, ly, rx, ry, 0.6, 0, TAU); } }
    };
    c.strokeStyle = K; c.lineWidth = 5; path(); c.stroke();
    c.fillStyle = col; c.globalAlpha = 0.3; path(); c.fill(); c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 2.4; path(); c.stroke();
    c.restore();
  };
  // a little flame spirit: a round head and a curling tail, two eyes
  const spirit = (c, x, y, s, col = '#7ec4ff', rot = 0) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    glowDot(c, 0, 0, 22, col, 0.55);
    c.fillStyle = col; c.strokeStyle = K; c.lineWidth = 1.6 / s;
    c.beginPath(); c.moveTo(-22, 8); c.quadraticCurveTo(-12, 2, -8, -7); c.quadraticCurveTo(-1, -15, 7, -9); c.quadraticCurveTo(13, -1, 6, 7); c.quadraticCurveTo(-2, 12, -22, 8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8f6ff'; c.beginPath(); c.moveTo(-10, 5); c.quadraticCurveTo(-5, 0, -3, -5); c.quadraticCurveTo(2, -8, 5, -3); c.quadraticCurveTo(6, 3, 1, 6); c.quadraticCurveTo(-4, 7, -10, 5); c.closePath(); c.fill();
    c.fillStyle = '#0d2238'; c.beginPath(); c.arc(2, -3.4, 1.3, 0, TAU); c.arc(5.6, -1.6, 1.3, 0, TAU); c.fill();
    c.restore();
  };
  const ICONS = {
    // an outward swing and the thinner return behind it, the scythe at the head of both
    slash: c => {
      swoosh(c, 30, 52, 40, -2.5, -0.15, 15, 'rgba(90,58,138,0.75)'); swoosh(c, 30, 52, 40, -1.6, -0.15, 5, S);
      swoosh(c, 32, 56, 26, -0.4, -2.4, 7, 'rgba(167,122,232,0.7)');
      scythe(c, 10, 56, 32, 28, { flip: false });
      glowDot(c, 54, 18, 8, W, 0.8);
    },
    // a chain of links flying out to a hooked blade, drag lines behind it
    hook: c => {
      ink(c, 2, 'rgba(143,216,232,0.5)'); for (const [y, l] of [[44, 10], [52, 16], [58, 8]]) { c.beginPath(); c.moveTo(6, y); c.lineTo(6 + l, y); c.stroke(); }
      const pts = [[14, 50], [21, 43], [28, 38], [35, 33], [42, 26], [48, 20]];
      pts.forEach(([x, y], i) => { c.save(); c.translate(x, y); c.rotate(-0.7 + (i % 2) * Math.PI / 2); ink(c, 4.2, K); c.beginPath(); c.ellipse(0, 0, 5.4, 3, 0, 0, TAU); c.stroke(); ink(c, 2, i % 2 ? S : '#dff2f0'); c.beginPath(); c.ellipse(0, 0, 5.4, 3, 0, 0, TAU); c.stroke(); c.restore(); });
      c.fillStyle = '#e4eaf2'; c.strokeStyle = K; c.lineWidth = 1.8; c.beginPath(); c.moveTo(46, 24); c.quadraticCurveTo(60, 22, 58, 4); c.quadraticCurveTo(52, 12, 42, 14); c.closePath(); c.fill(); c.stroke();
      ink(c, 1.6, S); c.beginPath(); c.moveTo(47, 22); c.quadraticCurveTo(58, 20, 57, 7); c.stroke(); glowDot(c, 54, 14, 9, S, 0.6);
    },
    // a great sweep through rising soul-wisps, the cut souls flying gold
    reap: c => {
      for (const [x, h] of [[12, 22], [22, 28], [32, 24], [42, 30], [52, 20]]) { ink(c, 2, 'rgba(143,216,232,0.8)'); c.beginPath(); c.moveTo(x, 62); c.bezierCurveTo(x - 5, 62 - h * 0.4, x + 5, 62 - h * 0.7, x, 62 - h); c.stroke(); glowDot(c, x, 62 - h, 5, S, 0.7); dot(c, x, 62 - h, 1.6, W); }
      swoosh(c, 30, 46, 38, -2.9, -0.2, 18, 'rgba(255,214,90,0.75)'); swoosh(c, 30, 46, 38, -2.0, -0.2, 6, G2);
      scythe(c, 8, 38, 26, 16, { edge: G2, body: '#e8dcb0' });
      for (const [x, y] of [[44, 14], [52, 24], [48, 34]]) { glowDot(c, x, y, 6, G, 0.7); dot(c, x, y, 2, G2); }
      glowDot(c, 50, 12, 10, G2, 0.7);
    },
    // Sever (the move's id stays gather, its icon is sever): one sigil torn out on the hook of a blade, the other three dim behind it
    sever: c => {
      for (const [x, y, id] of [[12, 50, 'drain'], [30, 56, 'bind'], [48, 52, 'thread']]) { c.save(); c.globalAlpha = 0.4; glyphIcon(c, id, x, y, 6, S); c.restore(); }
      ink(c, 5, K); c.beginPath(); c.moveTo(6, 40); c.lineTo(58, 12); c.stroke(); ink(c, 2.4, W); c.beginPath(); c.moveTo(6, 40); c.lineTo(58, 12); c.stroke();
      glowDot(c, 34, 22, 16, '#ff6a6a', 0.55); glyphIcon(c, 'mark', 34, 22, 11, '#ff6a6a');
      scythe(c, 4, 60, 18, 36, { edge: G2 });
      for (const [x, y] of [[48, 18], [54, 28], [44, 8]]) { glowDot(c, x, y, 5, G, 0.7); dot(c, x, y, 1.6, G2); }
    },
    // a flickering cut: a pale scythe left standing and the cuts that crossed the foe
    blink: c => {
      ink(c, 2, 'rgba(143,216,232,0.5)'); for (const [y, l] of [[18, 12], [28, 20], [38, 10]]) { c.beginPath(); c.moveTo(4, y); c.lineTo(4 + l, y); c.stroke(); }
      c.globalAlpha = 0.45; scythe(c, 10, 52, 28, 30, { edge: V, body: 'rgba(167,122,232,0.5)' }); c.globalAlpha = 1;
      scythe(c, 20, 56, 38, 34, {});
      for (const [x0, y0, x1, y1, col] of [[34, 10, 58, 36, W], [30, 30, 56, 14, V]]) { ink(c, 5, K); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); ink(c, 2.4, col); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      glowDot(c, 46, 24, 9, W, 0.8);
    },
    // the spirit and its tail, sparks about it
    wisp: c => {
      spirit(c, 34, 34, 1.2);
      for (const [x, y, r] of [[12, 16, 2.4], [52, 12, 2], [54, 50, 2.2], [10, 48, 1.8]]) { glowDot(c, x, y, r * 3, '#9ad0ff', 0.7); dot(c, x, y, r, W); }
    },
    // Shroud (icon key stays sowing): a shroud of dark mist falling over the foe, four sigils laid out beneath its hem
    sowing: c => {
      const hem = x => 36 + Math.sin(x * 0.45) * 3.5, g = c.createLinearGradient(0, 4, 0, 40); g.addColorStop(0, 'rgba(12,10,20,0.35)'); g.addColorStop(1, 'rgba(42,24,64,0.95)');
      c.fillStyle = g; c.strokeStyle = K; c.lineWidth = 1.6; c.beginPath(); c.moveTo(22, 4); c.lineTo(42, 4); c.lineTo(58, hem(58)); for (let x = 58; x >= 6; x -= 4) c.lineTo(x, hem(x) + (x % 8 ? 3 : 0)); c.closePath(); c.fill(); c.stroke();
      ink(c, 1.6, S); c.beginPath(); for (let x = 6; x <= 58; x += 4) { const y = hem(x) + (x % 8 ? 3 : 0); if (x === 6) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
      ink(c, 1.4, 'rgba(143,216,232,0.4)'); for (const x of [20, 32, 44]) { c.beginPath(); c.moveTo(x, 8); c.quadraticCurveTo(x + 3, 22, x - 1, 34); c.stroke(); }
      for (const [x, id] of [[12, 'mark'], [26, 'drain'], [40, 'bind'], [54, 'thread']]) { glowDot(c, x, 52, 9, S, 0.3); glyphIcon(c, id, x, 52, 5, S); }
    },
    // the great cut: a falling blade, a line struck across, four glyphs thrown out gold
    cull: c => {
      ink(c, 4, K); c.beginPath(); c.moveTo(6, 40); c.lineTo(58, 40); c.stroke(); ink(c, 2.2, G2); c.beginPath(); c.moveTo(6, 40); c.lineTo(58, 40); c.stroke();
      glowDot(c, 32, 40, 16, G, 0.6);
      scythe(c, 32, 2, 32, 28, { edge: G2, body: '#e8dcb0', flip: true });
      for (const [x, y, id] of [[12, 54, 'mark'], [26, 56, 'drain'], [40, 56, 'bind'], [54, 54, 'thread']]) glyphIcon(c, id, x, y, 5.2, G);
    },
    // a tall arch of pale light, the dark beyond it, five pips round the curve, the last gold
    gate: c => {
      ink(c, 6, K); c.beginPath(); c.moveTo(12, 60); c.lineTo(12, 28); c.quadraticCurveTo(12, 4, 32, 4); c.quadraticCurveTo(52, 4, 52, 28); c.lineTo(52, 60); c.stroke();
      const g = c.createLinearGradient(0, 4, 0, 60); g.addColorStop(0, 'rgba(12,10,20,0.9)'); g.addColorStop(1, 'rgba(90,58,138,0.55)');
      c.fillStyle = g; c.beginPath(); c.moveTo(12, 60); c.lineTo(12, 28); c.quadraticCurveTo(12, 4, 32, 4); c.quadraticCurveTo(52, 4, 52, 28); c.lineTo(52, 60); c.closePath(); c.fill();
      ink(c, 2.6, S); c.beginPath(); c.moveTo(12, 60); c.lineTo(12, 28); c.quadraticCurveTo(12, 4, 32, 4); c.quadraticCurveTo(52, 4, 52, 28); c.lineTo(52, 60); c.stroke();
      c.save(); c.globalAlpha = 0.4; ink(c, 5, W); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(20 + i * 12, 58); c.quadraticCurveTo(14 + i * 14, 40, 22 + i * 10, 22); c.stroke(); } c.restore();
      for (let i = 0; i < 5; i++) { const an = Math.PI + (i + 0.5) * Math.PI / 5, x = 32 + Math.cos(an) * 28, y = 30 + Math.sin(an) * 26; glowDot(c, x, y, i === 4 ? 9 : 6, i === 4 ? G : S, 0.9); dot(c, x, y, i === 4 ? 3 : 2.2, i === 4 ? G2 : W); }
      scythe(c, 26, 56, 36, 34, { edge: S });
    },
    // the afflictions on their own (their painted status icons, later)
    mark: c => { glowDot(c, 32, 32, 26, '#ff6a6a', 0.35); glyphIcon(c, 'mark', 32, 32, 20, '#ff6a6a'); },
    drain: c => { glowDot(c, 32, 32, 26, '#ff8fd0', 0.35); glyphIcon(c, 'drain', 32, 30, 20, '#ff8fd0'); dot(c, 22, 56, 2.4, '#ff8fd0'); dot(c, 42, 52, 2, '#ff8fd0'); },
    bind: c => { glowDot(c, 32, 32, 26, '#b88cff', 0.35); glyphIcon(c, 'bind', 30, 32, 20, '#b88cff'); },
    thread: c => { glowDot(c, 32, 32, 26, '#dff2f0', 0.35); glyphIcon(c, 'thread', 32, 32, 18, '#dff2f0'); },
  };
  ICONS.reapersgate = ICONS.gate;
  ICON_GLYPHS.thresher = ICONS;
  // Sever has no painting yet: its drawn icon until icons/thresher/sever.png loads (the rest of the class is painted)
  if (typeof ICON_ART !== 'undefined') ICON_ART.thresher = id => (id === 'sever' && typeof ArtProbe !== 'undefined' && ArtProbe.ok('icons/thresher/sever.png') !== true ? drawnIcon('thresher', 'sever', true) : null);
})();

// ======================================================================= Tidecaller (healer, class 20)
// Drawn icons (art.icons === false in data.js) and the gauge's tooltip; the painted set replaces them later.
GAUGE_TIPS.tidecaller = {
  desc: 'The tide rises from low to high over 12s, holds at the crest for 2s, then ebbs over 6s, and loops. Salt Spray pushes it up a little, Sip takes a slice, Surge spends all of it. Current bends it; Breakwater stops the ebb.',
  state: k => {
    const g = k.g, now = k.now, nc = typeof tideNextCrest === 'function' ? tideNextCrest(k) : 0;
    if (now < (g.floodUntil || 0)) return `Spring Flood: ${Math.ceil(g.floodUntil - now)}s of high water`;
    const word = g.tphase === 'hold' ? 'at the crest' : g.tphase === 'ebb' ? 'ebbing' : (g.tide || 0) < 35 ? 'low water' : 'rising';
    return word + (g.tphase === 'hold' ? '' : ` · crest in ${Math.ceil(nc)}s`) + (now < (g.wallUntil || 0) ? ' · held by Breakwater' : '') + (g.mark && now < g.mark.until ? ` · Mark ${nc <= g.mark.until - now + 0.2 ? 'pops at the crest' : 'lapses first'}` : '');
  },
  extra: k => `<div style="margin-top:6px;opacity:.85">The vial is the water. Its tinted foot is low water, where Sip heals 30% more; the pearl at its head is the crest. The ring is the Riptide Mark: green when it will pop at the next crest, rust when it will lapse first. ${k && k.def && k.def.markDeep ? 'The dark bar is your Deep Shield. ' : ''}${k && k.talent && k.talent('tidecaller_table') ? 'The strip shows the next 20s, with a pearl tick where the next crest lands.' : ''}</div>`,
};
(() => {
  // deep teal for the sea, foam white for the crest, a pearl for the glint, moon-gold only for the flood, slate for stone
  const T = '#3fb8a8', T2 = '#8fe8d8', D = '#17606c', INK = '#0c1c26', F = '#eaf8f5', P = '#d7f2ee', M = '#fff0b8', SL = '#7a8e9a', SLD = '#4a5d6a';
  const ink = (c, w = 3, col = F) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const glowDot = (c, x, y, r, col = T2, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(63,184,168,0)'); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
  const dot = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  // a water drop: pointed at the top, round at the bottom, a hard highlight
  const drop = (c, x, y, s, col = T2) => {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2 / s;
    c.beginPath(); c.moveTo(0, -12); c.bezierCurveTo(9, -2, 8, 8, 0, 8); c.bezierCurveTo(-8, 8, -9, -2, 0, -12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-3, 1, 1.8, 3.4, 0.4, 0, TAU); c.fill(); c.restore();
  };
  // a rolling wave line across the icon: (x0..x1) at height y, n crests of height a
  const ripple = (c, x0, x1, y, a, n, col, w = 3, ph = 0) => { ink(c, w, col); c.beginPath(); for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / (x1 - x0) * n * TAU + ph) * a; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); };
  // a spiral from the centre outward: turns, max radius, start angle
  const spiral = (c, cx, cy, r, turns, a0, col, w) => { ink(c, w, col); c.beginPath(); const N = 40 * turns; for (let i = 0; i <= N; i++) { const q = i / N, a = a0 + q * turns * TAU, rr = 2 + q * r; i ? c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.stroke(); };
  const arrow = (c, x, y, dir, s, col) => { c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1.8; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x, y - dir * s * 1.2); c.lineTo(x + s * 0.9, y + dir * s * 0.1); c.lineTo(x + s * 0.34, y + dir * s * 0.1); c.lineTo(x + s * 0.34, y + dir * s * 1.2); c.lineTo(x - s * 0.34, y + dir * s * 1.2); c.lineTo(x - s * 0.34, y + dir * s * 0.1); c.lineTo(x - s * 0.9, y + dir * s * 0.1); c.closePath(); c.fill(); c.stroke(); };
  // the cresting wave: a curling swell with a foam lip, a body dark at the foot and bright at the lip
  const wave = (c, x, y, s, col = T) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2.4 / s; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-26, 18); c.bezierCurveTo(-24, 0, -12, -14, 4, -18); c.bezierCurveTo(16, -22, 26, -14, 24, -4); c.bezierCurveTo(18, -12, 10, -10, 8, -2); c.bezierCurveTo(10, 8, 18, 14, 26, 18); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = D; c.beginPath(); c.moveTo(-26, 18); c.bezierCurveTo(-24, 8, -14, 0, -4, -2); c.bezierCurveTo(-2, 8, 6, 14, 14, 18); c.closePath(); c.fill();
    ink(c, 1.6 / s, F); c.beginPath(); c.moveTo(-14, -6); c.bezierCurveTo(-8, -14, 0, -18, 6, -18); c.stroke();
    c.fillStyle = F; for (const [fx, fy, fr] of [[20, -12, 3], [24, -4, 2.4], [14, -17, 2.2], [26, -9, 1.6]]) { c.beginPath(); c.arc(fx, fy, fr, 0, TAU); c.fill(); }
    c.restore();
  };
  const ICONS = {
    // a thin lash of salt water flying up-right and breaking into foam and drops
    spray: c => {
      for (const [dy, w, col] of [[10, 5, D], [4, 4, T], [-2, 3, T2]]) { ink(c, w, col); c.beginPath(); c.moveTo(8, 52 + dy * 0.2); c.bezierCurveTo(20, 46 - dy * 0.3, 32, 36 + dy * 0.2, 46, 22 + dy * 0.3); c.stroke(); }
      glowDot(c, 50, 20, 14, F, 0.7); c.save(); c.translate(50, 20); ink(c, 2.4, F); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); c.lineTo(Math.cos(a) * (i % 2 ? 8 : 12), Math.sin(a) * (i % 2 ? 8 : 12)); c.stroke(); } c.restore();
      for (const [x, y, r] of [[40, 14, 2.6], [58, 32, 2.4], [30, 22, 2], [56, 10, 1.8]]) dot(c, x, y, r, T2);
    },
    // one drop falling into a cupped hand of water
    sip: c => {
      drop(c, 32, 20, 1.15);
      c.fillStyle = D; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(10, 38); c.bezierCurveTo(12, 56, 52, 56, 54, 38); c.bezierCurveTo(44, 46, 20, 46, 10, 38); c.closePath(); c.fill(); c.stroke();
      ink(c, 2, T2); c.beginPath(); c.ellipse(32, 42, 14, 4, 0, 0, TAU); c.stroke(); ink(c, 1.4, F); c.beginPath(); c.ellipse(32, 42, 7, 2, 0, 0, TAU); c.stroke();
    },
    // a whirl set in a ring (the mark on a shoulder)
    riptide: c => {
      glowDot(c, 32, 32, 28, T, 0.35); c.fillStyle = INK; c.beginPath(); c.arc(32, 32, 22, 0, TAU); c.fill(); ink(c, 3, T); c.beginPath(); c.arc(32, 32, 22, 0, TAU); c.stroke();
      spiral(c, 32, 32, 17, 2.1, 0.4, T2, 3.4); spiral(c, 32, 32, 14, 1.7, 3.5, F, 1.6); dot(c, 32, 32, 3.4, F);
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; dot(c, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28, 2, P); }
    },
    // the great cresting wave
    surge: c => { glowDot(c, 32, 36, 30, T, 0.3); wave(c, 32, 36, 1.2); ripple(c, 4, 60, 56, 1.8, 3, T2, 2.4); },
    // an arrow up and an arrow down over a water line: the tide turned
    current: c => {
      ripple(c, 6, 58, 46, 2.5, 3, T2, 3.2); ripple(c, 6, 58, 54, 2, 3, D, 2.6, 1.4);
      arrow(c, 22, 24, -1, 9, '#8fe8d8'); arrow(c, 42, 22, 1, 9, '#ffb8a0');
      ink(c, 1.8, F); c.beginPath(); c.arc(32, 14, 6, 3.4, 5.9); c.stroke();
    },
    // a stone wall of blocks standing in the sea, foam breaking on its face
    breakwater: c => {
      c.fillStyle = SL; c.strokeStyle = INK; c.lineWidth = 2.2; c.lineJoin = 'round';
      for (let r = 0; r < 3; r++) for (let b = 0; b < 3 - (r === 1 ? 1 : 0); b++) { const bw = r === 1 ? 17 : 15, bx = r === 1 ? 9 + b * 22 : 6 + b * 18; c.fillStyle = r === 0 ? SL : SLD; c.beginPath(); c.roundRect(bx + (r === 1 ? 4 : 0), 8 + r * 14, bw + 7, 13, 2); c.fill(); c.stroke(); }
      c.fillStyle = D; c.strokeStyle = INK; c.beginPath(); c.moveTo(2, 50); for (let x = 2; x <= 62; x += 4) c.lineTo(x, 48 + Math.sin(x * 0.4) * 2); c.lineTo(62, 62); c.lineTo(2, 62); c.closePath(); c.fill(); c.stroke();
      ripple(c, 4, 60, 48, 2, 4, F, 2.4); for (const [x, y] of [[14, 44], [30, 42], [48, 44], [58, 40]]) dot(c, x, y, 2.2, F);
    },
    // the flooded arena under a full moon
    springflood: c => {
      glowDot(c, 32, 20, 26, M, 0.5); dot(c, 32, 20, 12, M); c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.arc(32, 20, 12, 0, TAU); c.stroke(); dot(c, 28, 17, 3, '#fffbe6'); dot(c, 37, 24, 2, '#e8d890');
      c.fillStyle = D; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.ellipse(32, 46, 27, 12, 0, 0, TAU); c.fill(); c.stroke();
      ink(c, 2, T2); c.beginPath(); c.ellipse(32, 46, 21, 8, 0, 0, TAU); c.stroke(); ink(c, 1.6, F); c.beginPath(); c.ellipse(32, 46, 12, 4.4, 0, 0, TAU); c.stroke();
      ripple(c, 12, 52, 46, 1.6, 3, F, 1.6);
      ink(c, 2.2, M); c.beginPath(); c.moveTo(26, 36); c.lineTo(24, 56); c.moveTo(32, 34); c.lineTo(32, 58); c.moveTo(38, 36); c.lineTo(40, 56); c.stroke();
    },
    // Swell: a drop on a rising swell (a cheap heal that lifts the tide)
    swell: c => { drop(c, 32, 22, 1.1); ripple(c, 6, 58, 46, 3, 2.5, T2, 3.4); ripple(c, 6, 58, 54, 2, 2.5, D, 2.6, 1); arrow(c, 52, 24, -1, 6, '#8fe8d8'); },
    // Undertow: a hand-like swirl dragged down into dark water, an arrow sinking with it
    undertow: c => {
      c.fillStyle = '#10343f'; c.beginPath(); c.arc(32, 36, 24, 0, TAU); c.fill(); ink(c, 2.6, D); c.beginPath(); c.arc(32, 36, 24, 0, TAU); c.stroke();
      spiral(c, 32, 40, 18, 1.8, 1.2, '#2c8fa6', 3.4); spiral(c, 32, 40, 14, 1.4, 4.4, T2, 1.8);
      c.save(); c.translate(32, 18); ink(c, 3.4, P); c.beginPath(); c.moveTo(-6, -10); c.lineTo(-6, 4); c.moveTo(0, -12); c.lineTo(0, 4); c.moveTo(6, -10); c.lineTo(6, 4); c.stroke(); ink(c, 3.6, '#2c8fa6'); c.beginPath(); c.moveTo(-8, 6); c.quadraticCurveTo(0, 14, 8, 6); c.stroke(); c.restore();
      arrow(c, 52, 48, 1, 6, '#2c8fa6'); for (const [x, y, r] of [[14, 52, 2.2], [18, 44, 1.6], [48, 20, 1.8]]) { ink(c, 1.2, F); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
    },
    // Maelstrom: a wide whirlpool, foam arms turning into the dark eye
    maelstrom: c => {
      c.fillStyle = D; c.strokeStyle = INK; c.lineWidth = 2.6; c.beginPath(); c.ellipse(32, 34, 28, 22, 0, 0, TAU); c.fill(); c.stroke();
      for (let i = 0; i < 3; i++) spiral(c, 32, 34, 24, 1.5, i * TAU / 3, i % 2 ? T2 : F, 3 - i * 0.5);
      c.fillStyle = INK; c.beginPath(); c.ellipse(32, 34, 5, 4, 0, 0, TAU); c.fill(); ink(c, 1.6, T); c.beginPath(); c.ellipse(32, 34, 5, 4, 0, 0, TAU); c.stroke();
    },
    // Tidal Bore: a long wave front driven to the right, a chevron of foam at its head
    bore: c => {
      for (const [y, col, w] of [[44, D, 7], [34, T, 6], [24, T2, 5]]) { ink(c, w, col); c.beginPath(); c.moveTo(6, y + 4); c.bezierCurveTo(18, y - 4, 30, y + 6, 44, y - 2); c.stroke(); }
      c.fillStyle = F; c.strokeStyle = INK; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(60, 34); c.lineTo(44, 14); c.lineTo(46, 24); c.lineTo(38, 34); c.lineTo(46, 44); c.lineTo(44, 54); c.closePath(); c.fill(); c.stroke();
      for (const [x, y] of [[30, 12], [18, 16], [34, 56]]) dot(c, x, y, 2, T2);
    },
  };
  ICON_GLYPHS.tidecaller = ICONS;
})();

// ======================================================================= Lanternkeeper (healer, class 21)
GAUGE_TIPS.lanternkeeper = {
  desc: 'Embers light your lanterns. One comes back every 5s, and every third Trim the Wick gives one more. Wicks burn down while a lantern is lit; a short wick heals less.',
  state: k => {
    const g = k.g, now = k.now, max = typeof lkEmbMax === 'function' ? lkEmbMax(k) : 4, lit = (g.lan || []).length;
    return `${g.emb || 0} of ${max} Embers · ${lit} ${lit === 1 ? 'light' : 'lights'} out` + (now < (g.lightUntil || 0) ? ` · Lighthouse ${Math.ceil(g.lightUntil - now)}s` : '') + (now < (g.strideUntil || 0) ? ` · Stride ${Math.ceil(g.strideUntil - now)}s` : '');
  },
  extra: () => '<div style="margin-top:6px;opacity:.85">The coals in the cage are your Embers; the ring on the next one closes as it comes back. The sparks are your Trims toward the next Ember. Each small lantern beside it is a light you have out, its flame its wick: red is nearly a stub.</div>',
};

// ======================================================================= Kenseier (tank, class 22)
// Drawn icons (art.icons === false in data.js) and the gauge's tooltip; the painted set replaces them later. Ash grey, charcoal, ember orange.
GAUGE_TIPS.kenseier = {
  desc: 'The ring is your Poise. A deflect with no blow to meet costs 12, a blow that hits you without one 15 (30 for a tankbuster); it refills once nothing has hit you for a moment. At nothing you are Off-balance for 2s: no deflects, 10% more damage taken.',
  state: k => {
    const g = k.g, now = k.now;
    if (now < (g.offUntil || 0)) return `Off-balance: ${Math.ceil(g.offUntil - now)}s`;
    if (now < (g.breakUntil || 0)) return `The boss is Broken: ${Math.ceil(g.breakUntil - now)}s · Deathblow`;
    return `${Math.floor(g.poise || 0)} Poise` + (now < (g.noDefl || 0) ? ' · blade resting' : '');
  },
  extra: () => '<div style="margin-top:6px;opacity:.85">The white-gold bar under the boss\'s name is its Posture: only your deflects fill it. The ring that closes on your feet is the next blow aimed at you; press W as it lands.</div>',
};
(() => {
  const AS = '#a29d94', AL = '#d8d3c9', CH = '#2b2b31', EM = '#ff8a3d', HOT = '#ffd9b0', GD = '#ffe2a0', INK = '#0e0e12';
  const ink = (c, w = 3, col = AL) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const glowDot = (c, x, y, r, col = EM, a = 1) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,138,61,0)'); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); };
  // a blade lying from (x0, y0) to (x1, y1): a pale body, an ember edge on one side
  const blade = (c, x0, y0, x1, y1, wd = 4, edge = EM) => {
    const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    c.save(); c.translate(x0, y0); c.rotate(a);
    c.fillStyle = AL; c.strokeStyle = INK; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, -wd / 2); c.lineTo(len - 4, -wd / 2); c.lineTo(len, wd * 0.15); c.lineTo(len - 4, wd / 2); c.lineTo(0, wd / 2); c.closePath(); c.fill(); c.stroke();
    ink(c, 1.6, edge); c.beginPath(); c.moveTo(2, wd / 2 - 0.4); c.lineTo(len - 3, wd / 2 - 0.4); c.stroke();
    c.fillStyle = '#d8b25a'; c.fillRect(-1, -wd / 2 - 1.5, 3, wd + 3); c.restore();
  };
  const spark = (c, x, y, r, col = '#ffffff') => { glowDot(c, x, y, r * 1.8, EM, 0.7); ink(c, 1.8, col); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2, r1 = i % 2 ? r * 0.6 : r; c.beginPath(); c.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke(); } };
  ICON_GLYPHS.kenseier = {
    // an ember-edged cut: one blade sweeping across, three trailing arcs
    cut: c => {
      glowDot(c, 34, 32, 26, EM, 0.3);
      for (const [r, w, col] of [[22, 3, '#9a4a20'], [18, 2.6, EM], [14, 2, HOT]]) { ink(c, w, col); c.beginPath(); c.arc(30, 40, r, -2.5, -0.9); c.stroke(); }
      blade(c, 10, 52, 52, 12, 5);
    },
    // a blade meeting a claw: a pale blade rising to meet three dark claws, a white spark between them
    deflect: c => {
      blade(c, 12, 54, 44, 22, 5);
      c.fillStyle = '#4a3a3a'; c.strokeStyle = INK; c.lineWidth = 2; c.lineJoin = 'round';
      for (const dx of [-8, 0, 8]) { c.beginPath(); c.moveTo(34 + dx, 6); c.quadraticCurveTo(38 + dx, 16, 40 + dx, 26 - Math.abs(dx) * 0.3); c.quadraticCurveTo(32 + dx, 18, 34 + dx, 6); c.closePath(); c.fill(); c.stroke(); }
      spark(c, 40, 24, 11);
    },
    // a footstep through a red line: two footprints, a red stripe cut across the middle
    mikiri: c => {
      c.save(); c.globalAlpha = 0.85; ink(c, 5, '#c43a30'); c.beginPath(); c.moveTo(6, 30); c.lineTo(58, 22); c.stroke(); ink(c, 1.6, '#ff9a86'); c.beginPath(); c.moveTo(6, 30); c.lineTo(58, 22); c.stroke(); c.restore();
      for (const [x, y, a, al] of [[20, 52, -0.2, 0.55], [30, 40, -0.2, 0.8], [42, 12, -0.2, 1]]) { c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al; c.fillStyle = AL; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.ellipse(0, 0, 5, 9, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(0, -11, 3.4, 3.4, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
    },
    // a single killing slash across a cracked bar: a bar split by a bright diagonal stroke
    deathblow: c => {
      glowDot(c, 32, 32, 28, GD, 0.28);
      c.fillStyle = '#2a2024'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect(6, 24, 52, 14, 3); c.fill(); c.stroke();
      c.fillStyle = '#f0d28a'; c.beginPath(); c.roundRect(7, 25, 22, 12, 2); c.fill(); c.beginPath(); c.roundRect(35, 25, 22, 12, 2); c.fill();
      ink(c, 1.4, INK); c.beginPath(); c.moveTo(30, 24); c.lineTo(27, 31); c.lineTo(33, 34); c.lineTo(31, 38); c.stroke();
      blade(c, 8, 58, 56, 6, 5, '#ffffff');
    },
    // a cloak of ash: a pale hooded drape with a dark hem, ember flecks on it
    mantle: c => {
      glowDot(c, 32, 34, 26, EM, 0.25);
      c.fillStyle = AS; c.strokeStyle = INK; c.lineWidth = 2.4; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(32, 6); c.bezierCurveTo(46, 8, 52, 24, 56, 54); c.lineTo(8, 54); c.bezierCurveTo(12, 24, 18, 8, 32, 6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#6c6861'; c.beginPath(); c.moveTo(32, 12); c.bezierCurveTo(40, 14, 44, 26, 46, 54); c.lineTo(32, 54); c.closePath(); c.fill();
      ink(c, 1.2, '#6c6861'); for (const x of [18, 25, 39, 46]) { c.beginPath(); c.moveTo(x, 30); c.lineTo(x - (32 - x) * 0.1, 52); c.stroke(); }
      ink(c, 2.2, EM); c.beginPath(); c.moveTo(8, 54); c.lineTo(56, 54); c.stroke();
      for (const [x, y, r] of [[22, 22, 1.8], [44, 34, 1.6], [16, 42, 1.4], [50, 14, 1.5], [36, 46, 1.4]]) { c.fillStyle = HOT; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    },
    // a blade held across an ally: a pale blade laid across the top, a small figure sheltered beneath it, a gold arc over them
    guard: c => {
      ink(c, 2.4, GD); c.beginPath(); c.arc(32, 44, 20, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.fillStyle = '#6a8fb6'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(32, 36, 6, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(22, 58); c.quadraticCurveTo(22, 44, 32, 44); c.quadraticCurveTo(42, 44, 42, 58); c.closePath(); c.fill(); c.stroke();
      blade(c, 6, 22, 58, 22, 5);
    },
  };
})();

// ======================================================================= Houndmaster (melee DPS, class 23)
// Drawn icons (art.icons === false in data.js) and the gauge's tooltip; the painted set (docs/art/paint-next.md) replaces them later.
// Moss green, tan leather, ash grey, one rust-orange accent.
GAUGE_TIPS.houndmaster = {
  desc: 'Your two hounds (Lone Wolf: Greyfang alone, with you as the second piece) move on their own and take the places you whistle them to: left flank, right flank, front or behind the boss. Where they stand when you finish is the pair: both on the flanks is Rend, front and behind is Hamstring, both behind is Bring Down. Each portrait\'s bar is its Bond; the long bar is the Bond your finisher spends (40). A hound a telegraph catches is downed until its timer runs out.',
  state: k => {
    const g = k.g, now = k.now, n = { rend: 'Rend', hamstring: 'Hamstring', bringdown: 'Bring Down' };
    if (g.all) return 'Wild Hunt: every pair at once';
    return (g.pair ? 'Pair: ' + n[g.pair] : 'No pair: Snap') + (now < (g.markUntil || 0) ? ' · quarry marked' : '') + (now < (g.mountUntil || 0) ? ' · riding' : '');
  },
  extra: () => '<div style="margin-top:6px;opacity:.85">The faint arcs round the boss are where your hounds stand, in their collar colours; when they make a pair both light in its colour (gold Rend, green Hamstring, lilac Bring Down). Whistle: Hold keeps them where they are while the boss turns.</div>',
};
(() => {
  const MS = '#5a7a46', TN = '#b08a5a', AS = '#b8b2a8', RU = '#c46a3a', HD = '#8f7a63', HD2 = '#6c5845', IV = '#f2e6c8', GR = '#8b8e93', INK = '#10140c';
  const ink = (c, w = 3, col = IV) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  // a lean hound in side view facing right, centred on (x, y), s its length/40, tilted by rot; leg swing lg (-1..1); collar colour
  const hound = (c, x, y, s = 1, rot = 0, col = RU, o = {}) => {
    const coat = o.coat || HD, dark = o.dark || HD2, lg = o.lg == null ? 0.6 : o.lg;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
    // legs, tail
    ink(c, 3, dark); c.beginPath(); c.moveTo(-9, 3); c.lineTo(-13 - lg * 5, 11); c.moveTo(-5, 4); c.lineTo(-6 + lg * 4, 12); c.moveTo(9, 3); c.lineTo(13 + lg * 5, 10); c.moveTo(5, 4); c.lineTo(6 - lg * 4, 11); c.stroke();
    ink(c, 2.2, dark); c.beginPath(); c.moveTo(-14, -3); c.quadraticCurveTo(-21, -4, -23, -11); c.stroke();
    // body: deep chest, tucked waist
    c.fillStyle = coat; c.strokeStyle = INK; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-14, -2); c.quadraticCurveTo(-8, -9, 0, -6); c.quadraticCurveTo(8, -9, 13, -5); c.lineTo(13, 4); c.quadraticCurveTo(6, 7, 1, 2); c.quadraticCurveTo(-6, 6, -14, 3); c.closePath(); c.fill(); c.stroke();
    // neck, head, narrow muzzle, ear, collar
    c.beginPath(); c.moveTo(11, -5); c.lineTo(16, -11); c.lineTo(21, -12); c.lineTo(31, -8.5); c.lineTo(31, -6.5); c.lineTo(21, -5); c.lineTo(15, 2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = dark; c.beginPath(); c.moveTo(17, -11); c.lineTo(14, -6); c.lineTo(19, -8); c.closePath(); c.fill();
    ink(c, 3, col); c.beginPath(); c.moveTo(13.5, -4); c.lineTo(16, 1); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(31, -8, 1.3, 0, TAU); c.fill(); c.beginPath(); c.arc(23, -9, 1, 0, TAU); c.fill();
    c.restore();
  };
  const ghost = (c, x, y, s, a = 0.8) => { c.save(); c.globalAlpha = a; hound(c, x, y, s, 0, '#eaf7ff', { coat: '#cfe4f2', dark: '#9cbdd6' }); c.restore(); };
  const star = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); ink(c, 1.4, INK); c.stroke(); };
  const arrow = (c, x0, y0, x1, y1, col = IV, w = 3) => { ink(c, w, col); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); c.fillStyle = col; c.beginPath(); c.moveTo(x1 + Math.cos(a) * 5, y1 + Math.sin(a) * 5); c.lineTo(x1 + Math.cos(a + 2.5) * 6, y1 + Math.sin(a + 2.5) * 6); c.lineTo(x1 + Math.cos(a - 2.5) * 6, y1 + Math.sin(a - 2.5) * 6); c.closePath(); c.fill(); };
  const whistle = (c, x, y, s = 1) => { c.save(); c.translate(x, y); c.scale(s, s); ink(c, 1.4, TN); c.beginPath(); c.arc(-8, -6, 7, 0.3, 4.2); c.stroke(); c.fillStyle = '#efe4c6'; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, 0, 9, 5, -0.3, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(4, -1.5, 1.3, 0, TAU); c.fill(); c.restore(); };
  ICON_GLYPHS.houndmaster = {
    // a skinning knife swung across, three arcs behind it, a rust thong
    knife: c => {
      for (const [r, w, col] of [[22, 2.4, 'rgba(184,178,168,0.45)'], [17, 2.4, 'rgba(184,178,168,0.7)'], [12, 2.4, AS]]) { ink(c, w, col); c.beginPath(); c.arc(30, 42, r, -2.6, -1.0); c.stroke(); }
      c.save(); c.translate(12, 54); c.rotate(-0.78); ink(c, 1, INK);
      c.fillStyle = TN; c.fillRect(0, -3, 12, 6); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(0, -3, 12, 6);
      c.fillStyle = '#c9a23f'; c.fillRect(12, -5, 3, 10); c.strokeRect(12, -5, 3, 10);
      c.fillStyle = '#d4d8dc'; c.beginPath(); c.moveTo(15, -4); c.lineTo(42, -4); c.quadraticCurveTo(50, -1, 48, 3); c.lineTo(15, 3); c.closePath(); c.fill(); c.stroke();
      ink(c, 1, '#ffffff'); c.beginPath(); c.moveTo(17, -1.5); c.lineTo(40, -1.5); c.stroke();
      ink(c, 2, RU); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-6, 5, -9, 2); c.stroke();
      c.restore();
      for (const [x, y] of [[44, 12], [50, 18], [40, 8]]) { c.fillStyle = RU; c.fillRect(x, y, 3, 3); }
    },
    // a whistle with a curved arrow going round to the right
    flank: c => {
      whistle(c, 18, 50, 0.95);
      ink(c, 3.2, AS); c.beginPath(); c.moveTo(24, 40); c.bezierCurveTo(30, 14, 58, 10, 56, 40); c.stroke();
      ink(c, 2, 'rgba(184,178,168,0.6)'); c.beginPath(); c.moveTo(26, 46); c.bezierCurveTo(36, 24, 50, 24, 50, 42); c.stroke();
      arrow(c, 56, 36, 56, 44, AS, 3); c.strokeStyle = AS; c.lineWidth = 2; c.beginPath(); c.arc(56, 50, 4, 0, TAU); c.stroke();
    },
    // two lean muzzles meeting, a rust starburst between, two claw lines under it
    finisher: c => {
      star(c, 32, 28, 15, RU);
      for (const s of [-1, 1]) {
        c.save(); c.translate(32 + s * 3, 29); c.scale(s, 1); c.fillStyle = HD; c.strokeStyle = INK; c.lineWidth = 1.8; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(0, -5); c.lineTo(-12, -9); c.lineTo(-22, -3); c.lineTo(-22, 8); c.lineTo(-10, 12); c.lineTo(0, 6); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#f6f2e8'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-1 - i * 3.4, -3); c.lineTo(-3 - i * 3.4, 2.5); c.lineTo(-4.4 - i * 3.4, -3); c.closePath(); c.fill(); }
        ink(c, 3, s < 0 ? RU : AS); c.beginPath(); c.moveTo(-8, 4); c.lineTo(-11, 12); c.stroke();
        c.restore();
      }
      ink(c, 2.6, IV); for (const dx of [-7, 7]) { c.beginPath(); c.moveTo(32 + dx - 6, 50); c.lineTo(32 + dx + 6, 60); c.stroke(); }
    },
    // a hound mid-leap, a dotted arc, a dust ring where it lands
    pounce: c => {
      c.save(); c.strokeStyle = AS; c.lineWidth = 1.6; c.setLineDash([2.5, 3.5]); c.beginPath(); c.moveTo(6, 52); c.quadraticCurveTo(26, 4, 52, 46); c.stroke(); c.restore();
      c.save(); c.strokeStyle = 'rgba(184,178,168,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(52, 53, 8, 3.2, 0, 0, TAU); c.stroke(); c.restore();
      hound(c, 29, 26, 0.95, -0.55, RU, { lg: 1.1 });
      ink(c, 1.8, AS); for (const y of [34, 40, 46]) { c.beginPath(); c.moveTo(6, y); c.lineTo(14, y - 2); c.stroke(); }
    },
    // two hounds, a rust collar and an ash one, running to a boot
    calloff: c => {
      hound(c, 20, 20, 0.62, 0.2, RU, { lg: 0.8 }); hound(c, 30, 34, 0.62, 0.2, AS, { lg: -0.8, coat: '#948f86', dark: '#6f6a62' });
      c.fillStyle = TN; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(42, 38); c.lineTo(50, 38); c.lineTo(52, 52); c.lineTo(60, 54); c.lineTo(60, 58); c.lineTo(40, 58); c.closePath(); c.fill(); c.stroke();
      c.save(); c.strokeStyle = AS; c.lineWidth = 1.6; c.beginPath(); c.ellipse(50, 58, 12, 4, 0, 0, TAU); c.stroke(); c.restore();
      ink(c, 1.8, 'rgba(242,230,200,0.7)'); for (const y of [16, 24, 30]) { c.beginPath(); c.moveTo(2, y); c.lineTo(8, y); c.stroke(); }
    },
    // a rust cloth knotted on a bare branch
    quarry: c => {
      ink(c, 4.5, '#2a2018'); c.beginPath(); c.moveTo(8, 58); c.lineTo(30, 30); c.lineTo(52, 8); c.stroke(); ink(c, 2.6, '#6a5238'); c.beginPath(); c.moveTo(8, 58); c.lineTo(30, 30); c.lineTo(52, 8); c.stroke();
      ink(c, 2.4, '#2a2018'); c.beginPath(); c.moveTo(30, 30); c.lineTo(14, 22); c.moveTo(38, 22); c.lineTo(42, 38); c.stroke();
      c.fillStyle = RU; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(24, 36); c.quadraticCurveTo(26, 26, 36, 24); c.lineTo(58, 32); c.quadraticCurveTo(52, 36, 56, 44); c.lineTo(36, 38); c.quadraticCurveTo(30, 44, 24, 36); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = RU; for (const [x, y] of [[16, 40], [20, 50], [44, 14]]) { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); c.stroke(); }
    },
    // a ghostly pack of four under the moon
    wildhunt: c => {
      c.fillStyle = '#f2ecd2'; c.beginPath(); c.arc(46, 14, 8, 0, TAU); c.fill(); c.fillStyle = 'rgba(40,52,38,1)'; c.beginPath(); c.arc(50, 12, 7, 0, TAU); c.fill();
      glow(c, 32, 40, 30, '#9fd8ff', 0.25);
      ghost(c, 16, 52, 0.5, 0.5); ghost(c, 30, 46, 0.58, 0.65); ghost(c, 22, 34, 0.6, 0.8); ghost(c, 40, 38, 0.66, 0.95);
    },
    // two hounds changing places along crossing curves
    relay: c => {
      c.fillStyle = RU; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.arc(14, 46, 7, 0, TAU); c.fill(); c.stroke(); c.fillStyle = AS; c.beginPath(); c.arc(50, 46, 7, 0, TAU); c.fill(); c.stroke();
      ink(c, 3, RU); c.beginPath(); c.moveTo(16, 38); c.bezierCurveTo(16, 10, 44, 10, 48, 30); c.stroke(); arrow(c, 47, 24, 48, 33, RU, 3);
      ink(c, 3, AS); c.beginPath(); c.moveTo(48, 38); c.bezierCurveTo(48, 20, 20, 20, 17, 32); c.stroke(); arrow(c, 18, 27, 17, 35, AS, 3);
    },
    // a figure riding a huge grey hound
    mount: c => {
      hound(c, 30, 40, 1.15, 0, '#d6d0c4', { coat: GR, dark: '#5f6368', lg: 0.7 });
      c.fillStyle = MS; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.ellipse(28, 22, 6, 9, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = TN; c.beginPath(); c.arc(28, 11, 4.4, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#b08a5a'; c.fillRect(21, 29, 14, 4); ink(c, 1.6, RU); c.beginPath(); c.moveTo(34, 20); c.lineTo(42, 28); c.stroke();
      ink(c, 1.8, 'rgba(242,230,200,0.7)'); for (const y of [34, 42, 50]) { c.beginPath(); c.moveTo(3, y); c.lineTo(9, y); c.stroke(); }
    },
    // a figure dropping off the hound with a slash arrow down
    ridedown: c => {
      hound(c, 20, 50, 0.7, 0, '#d6d0c4', { coat: GR, dark: '#5f6368' });
      c.fillStyle = MS; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.ellipse(40, 22, 5.5, 8, 0.5, 0, TAU); c.fill(); c.stroke(); c.fillStyle = TN; c.beginPath(); c.arc(44, 11, 4.2, 0, TAU); c.fill(); c.stroke();
      arrow(c, 52, 20, 56, 52, AS, 3.4); ink(c, 2.2, '#ffffff'); c.beginPath(); c.moveTo(46, 34); c.lineTo(58, 36); c.stroke();
      c.save(); c.strokeStyle = 'rgba(184,178,168,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(54, 57, 9, 3.2, 0, 0, TAU); c.stroke(); c.restore();
    },
    // a hound's head thrown back, notes sweeping out from it
    howl: c => {
      c.save(); c.translate(26, 46); c.rotate(-1.05); c.fillStyle = HD; c.strokeStyle = INK; c.lineWidth = 1.8; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-10, 12); c.lineTo(-6, -4); c.lineTo(4, -8); c.lineTo(22, -3); c.lineTo(22, 0); c.lineTo(6, 3); c.lineTo(4, 14); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = HD2; c.beginPath(); c.moveTo(-2, -6); c.lineTo(-9, -1); c.lineTo(-4, 3); c.closePath(); c.fill();
      ink(c, 3.2, RU); c.beginPath(); c.moveTo(-8, 9); c.lineTo(3, 10); c.stroke();
      c.restore();
      ink(c, 2.6, IV); for (const [r, a] of [[12, 1], [19, 0.75], [26, 0.5]]) { c.save(); c.globalAlpha = a; c.beginPath(); c.arc(40, 14, r, 3.3, 4.2); c.stroke(); c.restore(); }
      c.fillStyle = '#f2ecd2'; c.beginPath(); c.arc(52, 12, 5, 0, TAU); c.fill();
    },
    // a lap round a dot, a hound at the front of it
    longchase: c => {
      ink(c, 3, AS); c.beginPath(); c.arc(32, 34, 20, 0.5, TAU - 0.9); c.stroke(); arrow(c, 52, 24, 52, 32, AS, 3);
      c.fillStyle = '#5a3a2a'; c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.arc(32, 34, 8, 0, TAU); c.fill(); c.stroke();
      hound(c, 17, 20, 0.55, -0.5, RU, { lg: 1 });
      ink(c, 1.8, 'rgba(242,230,200,0.7)'); for (const [x, y] of [[8, 34], [10, 40], [16, 47]]) { c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.stroke(); }
    },
  };
})();
