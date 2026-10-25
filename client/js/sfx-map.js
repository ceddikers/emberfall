// SfxMap: which synthesized recipe (client/js/sfx-synth.js) plays for which game event. Data only; the hooks in the
// game ask it and hand the answer to Sound. Every answer is a recipe name, an array of names to layer, or null.
//
//   SfxMap.forAbility(classId, abilityId, kind)  ability use. Per-class table first (every ability, spec swap, talent
//                                                move and Ultimate in combat/kits.js and specs.js), then `kind` (a
//                                                family like 'fire', an anim like 'attack', an fx type like 'slash',
//                                                an auto-attack kind like 'sabre'), then the class's own idiom, then
//                                                ab-melee-generic / ab-magic-generic.
//   SfxMap.forBossMove(bossId, moveName)         the move's signature (bm-<boss>-<slug>) or null (the hook then plays
//                                                the telegraph cue for its type)
//   SfxMap.forBossIntro(bossId)                  the boss's own intro sting, else 'boss-intro'
//   SfxMap.forTelegraph(type)                    the telegraph cue for a warning type (raidwide, buster, aoe, ...)
//   SfxMap.category(name) / SfxMap.priority(name) the mix layer of a recipe (see MIX)
//
// Mix rule: telegraph cues and boss-move cues carry information, so they are the clearest, most prominent layer:
// highest priority, never stolen, and the engine may duck everything below them a little. Your own abilities come
// next; other players' sit at about half (the engine's remote dimming); town ambience stays well under everything.
// Loudness is already balanced inside the recipes (sfx-synth.js TRIM: telegraphs and impacts about -14 LUFS,
// abilities -18, interface -22, ambience -34), so MIX only ranks layers; it adds no gain.
(function (G) {
  'use strict';

  // ---------------------------------------------------------------------------------------------- mix layers
  const MIX = {
    tg: { priority: 5, duck: true },      // telegraph cues
    bm: { priority: 5, duck: true },      // boss-move signatures
    alert: { priority: 4 },               // low-hp heartbeat
    imp: { priority: 4 },                 // hits you take, boss impacts, the pull, the Limit Break
    sting: { priority: 3 },               // intros, death, clear, wipe
    ult: { priority: 3 },
    hud: { priority: 2 },                 // heal landing, buffs, pings
    ab: { priority: 2 },                  // abilities
    ui: { priority: 1 }, town: { priority: 1 }, step: { priority: 0 }, loop: { priority: 1 }, amb: { priority: 0 },
  };
  function category(name) {
    const c = G.SfxSynth && G.SfxSynth.CAT && G.SfxSynth.CAT[name];
    if (c) return c;
    if (/^tg-/.test(name)) return 'tg';
    if (/^bm-/.test(name)) return /-intro$/.test(name) ? 'sting' : 'bm';
    if (/^ult-/.test(name)) return 'ult';
    if (/^ab-/.test(name)) return 'ab';
    if (/^amb-/.test(name)) return 'amb';
    if (/^(ui-|story-)/.test(name)) return 'ui';
    return 'ab';
  }
  const priority = name => (MIX[category(name)] || MIX.ab).priority;

  // ---------------------------------------------------------------------------------------------- abilities
  const L = (...a) => a;   // a layered answer
  const ULT = cls => L('ult-fire', 'ult-' + cls);
  // each class: [melee/physical family, magic/signature family]
  const IDIOM = {
    bastion: ['ab-slash', 'ab-holy'], bloodreaver: ['ab-slash', 'ab-dot'], runeguard: ['ab-rune', 'ab-rune'],
    ranger: ['ab-shot', 'ab-shot'], shadowblade: ['ab-stab', 'ab-stab'], pyromancer: ['ab-fire', 'ab-fire'],
    cleric: ['ab-holy', 'ab-holy'], grovekeeper: ['ab-nature', 'ab-nature'], chronomancer: ['ab-time', 'ab-time'],
    thermist: ['ab-fire', 'ab-frost'], driftblade: ['ab-slash', 'ab-wind'], alembist: ['ab-alchemy', 'ab-alchemy'],
    gorgemaw: ['ab-maw', 'ab-maw'], oathbroker: ['ab-ledger', 'ab-ledger'], ironpalm: ['ab-punch', 'ab-punch'],
    threadweaver: ['ab-thread', 'ab-thread'], marionettist: ['ab-stab', 'ab-thread'],
    gloomsworn: ['ab-slash', 'ab-shield'],
    thresher: ['ab-slash', 'ab-wind'],
    tidecaller: ['ab-heal', 'ab-wind'],
    lanternkeeper: ['ab-heal', 'ab-buff'],
    kenseier: ['ab-slash', 'ab-shield'],
    houndmaster: ['ab-slash', 'ab-wind'],
  };
  // every ability id per class: base kit, spec replacements (specs.js), talent moves, Ultimate, taunt, auto-attack
  const CLASS = {
    bastion: {
      blade: 'ab-slash', edge: L('ab-holy', 'ab-slash'), brace: 'ab-shield', oath: L('ab-buff', 'ab-holy'), banner: L('ab-buff', 'ab-taunt'), bulwark: L('ab-shield', 'ab-heavy'),
      bash: 'ab-heavy', zeal: L('ab-holy', 'ab-shield'), hallowed: L('ab-holy', 'ab-shield'), avatar: L('ab-holy', 'ab-buff'),
      aegis: L('ab-shield', 'ab-holy'), lastbastion: ULT('bastion'), taunt: 'ab-taunt', auto: 'ab-slash',
    },
    bloodreaver: {
      hack: 'ab-slash', drain: L('ab-heavy', 'ab-dot'), letting: L('ab-slash', 'ab-dot'), frenzy: 'ab-buff', warcry: L('ab-taunt', 'ab-buff'), undying: L('ab-buff', 'ab-dot'),
      rampage: 'ab-heavy', lance: L('ab-shot', 'ab-dot'), scab: 'ab-shield', moon: L('ab-buff', 'ab-dot'),
      bloodbath: L('ab-slash', 'ab-heavy', 'ab-dot'), pact: L('ab-buff', 'ab-heal', 'ab-dot'),
      crimsoneclipse: ULT('bloodreaver'), taunt: 'ab-taunt', auto: 'ab-slash',
    },
    runeguard: {
      strike: L('ab-rune', 'ab-punch'), ward: L('ab-rune', 'ab-shield'), glyph: L('ab-rune', 'ab-heavy'), overload: L('ab-rune', 'ab-buff'), sanctum: L('ab-rune', 'ab-shield'), mirror: L('ab-shield', 'ab-rune'),
      cut: L('ab-rune', 'ab-slash'), cleave: L('ab-rune', 'ab-heavy'), whirl: 'ab-rune', living: L('ab-rune', 'ab-heavy'),
      wardglyph: L('ab-rune', 'ab-heal', 'ab-shield'),
      runecataclysm: ULT('runeguard'), taunt: 'ab-taunt', auto: 'ab-rune',
    },
    ranger: {
      quick: 'ab-shot', pierce: 'ab-shot', mark: L('ab-shot', 'ab-dot'), cloak: L('ab-nature', 'ab-shield'), rapid: 'ab-shot', barrage: 'ab-buff', aimed: 'ab-shot', caustic: L('ab-shot', 'ab-dot'),
      explosive: L('ab-shot', 'ab-fire'), falcon: L('ab-wind', 'ab-shot'),
      starfall: ULT('ranger'), starvolley: ULT('ranger'), auto: 'ab-shot',
    },
    shadowblade: {
      strike: 'ab-stab', evis: 'ab-slash', step: L('dash', 'ab-stab'), dance: 'ab-buff', venom: L('ab-stab', 'ab-dot'), smoke: L('ab-alchemy', 'ab-wind'),
      fury: 'ab-slash', backstab: 'ab-stab', rupture: L('ab-stab', 'ab-dot'), blossom: 'ab-slash',
      thousandcuts: ULT('shadowblade'), shadowcut: L('dash', 'ab-stab'), shadowedge: L('ab-slash', 'ab-stab'), auto: 'ab-stab',
    },
    pyromancer: {
      fireball: 'ab-fire', pyro: 'ab-fire', fireblast: 'ab-fire', combust: L('ab-fire', 'ab-buff'), vent: 'ab-fire', smolder: 'ab-fire',
      meteor: L('ab-fire', 'ab-heavy'), circle: L('ab-fire', 'ab-rune'), firestep: L('dash', 'ab-fire'), phoenix: 'ab-fire',
      phoenixdive: ULT('pyromancer'), phoenixflame: L('ab-fire', 'ab-shot'), phoenixblast: L('ab-fire', 'ab-heavy'), auto: 'ab-fire',
    },
    cleric: {
      smite: 'ab-holy', mend: 'ab-heal', petal: L('ab-holy', 'ab-heal'), prayer: L('ab-heal', 'ab-holy'), intervene: L('ab-holy', 'ab-shield'), bene: L('ab-heal', 'ab-buff'),
      barrier: 'ab-shield', condemn: L('ab-holy', 'ab-fire'), dawnbloom: L('ab-holy', 'ab-heal'), dawnsanctum: L('ab-holy', 'ab-shield'),
      dawnbreaks: ULT('cleric'), auto: 'ab-holy',
    },
    grovekeeper: {
      wrath: 'ab-nature', rejuv: L('ab-nature', 'ab-heal'), thorn: L('ab-nature', 'ab-slash'), growth: L('ab-nature', 'ab-heal'), bloom: L('ab-nature', 'ab-heal'), rebirth: L('ab-nature', 'ab-holy'),
      lifebind: L('ab-nature', 'ab-heal'), moonwell: L('ab-heal', 'ab-holy'), seed: L('ab-nature', 'ab-heal'), treant: L('ab-nature', 'ab-heavy'),
      canopy: L('ab-nature', 'ab-heal'), worldtree: ULT('grovekeeper'), auto: 'ab-nature',
    },
    chronomancer: {
      bolt: 'ab-time', rewind: L('ab-time', 'ab-heal'), shift: 'ab-time', accel: L('ab-time', 'ab-buff'), stasis: L('ab-time', 'ab-shield'), recall: L('ab-time', 'ab-heal'),
      chamber: L('ab-time', 'ab-buff'), bubble: L('ab-time', 'ab-shield'), warp: L('ab-time', 'ab-buff'),
      timereversal: ULT('chronomancer'), auto: 'ab-time',
    },
    thermist: {
      cinder: 'ab-fire', rime: 'ab-frost', flare: 'ab-fire', lance: L('ab-frost', 'ab-shot'), equil: 'ab-shield', invert: L('ab-fire', 'ab-frost'), shock: L('ab-fire', 'ab-frost'),
      sunset: L('ab-holy', 'ab-shield'), thermocline: L('ab-fire', 'ab-frost'), zero: L('ab-frost', 'ab-heavy'),
      redgiant: L('ab-fire', 'ab-buff'), supernova: ULT('thermist'), novafrost: ULT('thermist'), auto: 'ab-fire',
    },
    driftblade: {
      carve: 'ab-slash', slip: 'dash', hook: L('ab-slash', 'ab-wind'), cross: L('ab-wind', 'ab-slash'), still: 'ab-shield', gale: L('ab-wind', 'ab-buff'), pass: L('ab-slash', 'ab-wind'), stoop: L('ab-wind', 'ab-heavy'),
      impact: L('ab-wind', 'ab-heavy'), gyre: L('ab-wind', 'ab-slash'), tailspin: L('ab-wind', 'ab-slash'),
      roost: L('ab-wind', 'ab-buff'), starfall: L('ab-slash', 'ab-heavy'), eyeofthegale: ULT('driftblade'), galeline: L('ab-wind', 'ab-slash'), eyestep: L('dash', 'ab-slash'), auto: 'ab-slash',
    },
    alembist: {
      throw: 'ab-alchemy', distill: 'ab-alchemy', ember: L('ab-alchemy', 'ab-fire'), dew: L('ab-alchemy', 'ab-heal'), salt: L('ab-alchemy', 'ab-shield'), quicksilver: L('ab-alchemy', 'ab-time'), batch: L('ab-alchemy', 'ab-buff'), catalyst: 'ab-alchemy', blend: L('ab-alchemy', 'ab-buff'),
      magnumopus: ULT('alembist'), auto: 'ab-alchemy',
    },
    gorgemaw: {
      gnash: 'ab-maw', wide: L('ab-maw', 'ab-taunt'), spit: L('ab-maw', 'ab-shot'), digest: L('ab-maw', 'ab-heal'), iron: L('ab-shield', 'ab-maw'), bottomless: L('ab-maw', 'ab-buff'),
      regurgitate: L('ab-maw', 'ab-heavy'), stonebelly: L('ab-shield', 'ab-heavy'),
      feedingfrenzy: L('ab-maw', 'ab-buff', 'ab-heavy'), banquet: L('ab-maw', 'ab-heal', 'ab-shield'),
      mawofruin: ULT('gorgemaw'), taunt: 'ab-taunt', auto: 'ab-maw',
    },
    oathbroker: {
      collect: L('ab-ledger', 'ab-slash'), reneg: L('ab-ledger', 'ab-taunt'), settle: 'ab-ledger', lien: L('ab-ledger', 'ab-dot'), writ: L('ab-ledger', 'ab-shield'), default: L('ab-ledger', 'ab-heavy'),
      audit: 'ab-ledger', moratorium: L('ab-ledger', 'ab-shield'), cosign: L('ab-ledger', 'ab-shield'), foreclose: L('ab-ledger', 'ab-heavy'),
      blanket: L('ab-ledger', 'ab-shield'), warrant: L('ab-ledger', 'ab-heavy'), reckoning: ULT('oathbroker'), taunt: 'ab-taunt', auto: 'ab-ledger',
    },
    ironpalm: {
      palm: 'ab-punch', fist: 'ab-punch', kick: 'ab-punch',
      crane: L('ab-punch', 'ab-wind'), flow: 'ab-punch', gate: L('ab-punch', 'ab-heavy'), drop: L('ab-heavy', 'ab-punch'), wall: L('ab-punch', 'ab-shield'), breaker: 'ab-heavy', ox: L('ab-heavy', 'ab-punch'), palms: L('ab-punch', 'ab-punch'),
      read: 'ab-shield', skin: L('ab-shield', 'ab-buff'), bell: 'ab-buff', bellows: L('ab-buff', 'ab-wind'), dragon: L('ab-heavy', 'ab-wind'), pond: L('ab-shield', 'ab-heal'), slide: L('ab-heavy', 'ab-punch'),
      hundredpalms: ULT('ironpalm'), taunt: 'ab-taunt', auto: 'ab-punch',
    },
    threadweaver: {
      needle: L('ab-thread', 'ab-stab'), tie: 'ab-thread', mend: L('ab-thread', 'ab-heal'), snip: 'ab-thread', shuttle: L('ab-thread', 'ab-shot'), tapestry: L('ab-thread', 'ab-shield'),
      embroider: L('ab-thread', 'ab-heal'), cradle: L('ab-thread', 'ab-shield'), thrum: L('ab-thread', 'ab-heal'), severance: L('ab-thread', 'ab-shield'),
      grandloom: ULT('threadweaver'), auto: 'ab-thread',
    },
    marionettist: {
      jab: 'ab-stab', cue: L('ab-thread', 'ab-stab'), pull: 'ab-thread', cross: L('ab-thread', 'ab-stab'), pirouette: L('ab-slash', 'ab-thread'), swap: L('ab-thread', 'dash'), finale: L('ab-thread', 'ab-heavy'),
      tangle: L('ab-thread', 'ab-dot'), cutcord: L('ab-thread', 'ab-heavy'), redcurtain: L('ab-thread', 'ab-buff'), string: 'ab-thread', strum: L('ab-thread', 'ab-stab'), crossfire: L('ab-thread', 'ab-heavy'),
      curtaincall: ULT('marionettist'), auto: 'ab-thread',
    },
    // Gloomsworn: heavy, low and metallic with a hollow breath under it; every move has its own voice (sfx-synth.js ABIL.gloomsworn)
    gloomsworn: {
      rend: 'ab-slash', strike: 'ab-heavy', shade: L('dash', 'ab-wind'), pall: L('ab-shield', 'ab-buff'), mantle: L('ab-shield', 'ab-buff'),
      rite: L('ab-shield', 'ab-heal'), vigil: L('ab-shield', 'ab-holy'), pyre: L('ab-heavy', 'ab-fire'), reave: L('ab-slash', 'ab-heavy'),
      wardmantle: L('ab-shield', 'ab-wind'), pact: L('ab-heavy', 'ab-buff'), eclipsevigil: ULT('gloomsworn'), taunt: 'ab-taunt', auto: 'ab-slash',
    },
    // Reaper (class id thresher): inky black smoke with blue lightning, a quick scythe through low muffled air with glassy blue crackle; every move has its own voice (sfx-synth.js ABIL.thresher), and the moments
    // the kit sends (a swing's rising note, the four finishers, runes, the Snap's pops, the Void Star, the Gate's strikes and release) go through SoundHooks.thresher
    thresher: {
      string: L('ab-slash', 'ab-wind'), finish: L('ab-heavy', 'ab-slash'), snap: L('ab-buff', 'ab-stab'), star: L('ab-wind', 'ab-time'), veil: L('ab-shield', 'ab-wind'), frenzy: L('ab-buff', 'ab-slash'),
      arcanegate: ULT('thresher'), gatecut: L('ab-slash', 'ab-stab'), twinstar: L('ab-wind', 'ab-time'), gravewalk: L('ab-wind', 'dash'), auto: 'ab-melee-generic',
    },
    // Tidecaller (class id tidecaller): sea water, surf, a conch, droplets and a bell under the waves; every move has its own voice (sfx-synth.js ABIL.tidecaller)
    tidecaller: {
      spray: L('ab-wind', 'ab-heal'), sip: L('ab-heal', 'ab-wind'), riptide: L('ab-heal', 'ab-wind'), surge: L('ab-heal', 'ab-wind'), current: L('ab-wind', 'ab-heal'),
      breakwater: L('ab-shield', 'ab-wind'), springflood: ULT('tidecaller'), swell: L('ab-heal', 'ab-wind'), undertow: L('ab-heal', 'ab-shield'),
      maelstrom: L('ab-wind', 'ab-heal'), bore: L('ab-wind', 'ab-heal'), auto: 'ab-ranged-generic',
    },
    // Lanternkeeper (class id lanternkeeper): iron and brass, a struck match and a flame taking hold, chains, a bell and glass chimes; every move has its own voice (sfx-synth.js ABIL.lanternkeeper)
    lanternkeeper: {
      trim: L('ab-stab', 'ab-fire'), set: L('ab-shield', 'ab-fire'), beacon: L('ab-heavy', 'ab-fire'), hand: L('ab-buff', 'ab-heal'), flare: L('ab-fire', 'ab-heal'),
      carry: L('ab-thread', 'dash'), trail: L('dash', 'ab-wind'), stride: L('ab-heal', 'ab-wind'), relight: L('ab-fire', 'ab-heal'), wisp: L('ab-wind', 'ab-heal'),
      festival: L('ab-buff', 'ab-wind'), lighthouse: ULT('lanternkeeper'), beaconflare: L('ab-fire', 'ab-holy'), auto: 'ab-magic-generic',
    },
    // Kenseier (class id kenseier): steel on ash and ember, a blade drawn and a blow met; every move has its own voice (sfx-synth.js ABIL.kenseier), and the moments the kit
    // sends (a Perfect's clang, a Good's clank, a Break's crack, the Deathblow's whoosh and thump) go through SoundHooks.kenseier
    kenseier: {
      cut: L('ab-slash', 'ab-fire'), deflect: L('ab-shield', 'ab-slash'), mikiri: L('dash', 'ab-wind'), deathblow: L('ab-slash', 'ab-heavy'), mantle: L('ab-shield', 'ab-buff'),
      guard: L('ab-shield', 'ab-heavy'), iai: L('ab-shield', 'ab-stab'), flashofash: ULT('kenseier'), whirlwind: L('ab-slash', 'ab-wind'), duel: L('ab-buff', 'ab-fire'),
      taunt: 'ab-taunt', auto: 'ab-slash',
    },
    // Houndmaster (class id houndmaster): bone whistles, leather, fur and a brass horn; every move has its own voice (sfx-synth.js ABIL.houndmaster) and the moments the kit sends (Hold's and
    // Pounce's whistles, a bark for each hound, the bites, the pair finishers, the horn of Wild Hunt) go through SoundHooks.houndmaster
    houndmaster: {
      knife: L('ab-slash', 'ab-melee-generic'), flank: L('ab-wind', 'ab-buff'), finisher: L('ab-heavy', 'ab-slash'), pounce: L('ab-wind', 'ab-melee-generic'), calloff: L('ab-wind', 'ab-buff'),
      quarry: L('ab-buff', 'ab-wind'), wildhunt: ULT('houndmaster'), relay: L('ab-wind', 'dash'), mount: L('dash', 'ab-heavy'), ridedown: L('ab-slash', 'ab-heavy'), howl: L('ab-buff', 'ab-wind'),
      longchase: L('dash', 'ab-wind'), auto: 'ab-slash',
    },
  };
  // Every ability has its own voice, ab-<class>-<id> (sfx-synth.js ABIL: the families above layered at their own
  // pitch, timing and variant, plus accents), so the table above now documents each one's character; the taunt and
  // the Ultimate (ult-fire + ult-<class>) stay shared.
  for (const cls in CLASS) for (const id in CLASS[cls]) {
    const a = CLASS[cls][id];
    if (id === 'taunt' || (Array.isArray(a) && a[0] === 'ult-fire')) continue;
    CLASS[cls][id] = 'ab-' + cls + '-' + id;
  }
  // ids that mean the same thing in every class
  const SHARED = { dash: 'dash', taunt: 'ab-taunt', limit: 'lb-fire', lb: 'lb-fire', crit: 'crit' };
  const FAMILIES = new Set(['slash', 'heavy', 'stab', 'punch', 'shot', 'fire', 'frost', 'holy', 'nature', 'time', 'rune', 'thread', 'alchemy', 'wind', 'maw', 'ledger', 'taunt', 'heal', 'shield', 'buff', 'dot', 'magic-generic', 'melee-generic', 'ranged-generic']);
  // anims (kits.js `anim`), fx types (`fx.type`) and auto-attack kinds (`auto.kind`): 0 = the class's physical idiom,
  // 1 = its magic idiom, or a fixed family
  const KIND = {
    attack: 0, swing: 0, cast: 1, big: 1, zone: 1, cone: 1, projectile: 1,
    bash: 'ab-heavy', axe: 'ab-heavy', uppercut: 'ab-punch', palm: 'ab-punch', fist: 'ab-punch', kick: 'ab-punch', flurry: 'ab-punch',
    brace: 'ab-shield', guard: 'ab-shield', shield: 'ab-shield', aura: 'ab-buff', ring: 'ab-heal', line: 'ab-shot', blink: 'dash', dash: 'dash',
    slash: 'ab-slash', sabre: 'ab-slash', spark: 'ab-alchemy', thermo: 'ab-fire', maw: 'ab-maw', stamp: 'ab-ledger', doll: 'ab-thread',
    melee: 'ab-melee-generic', ranged: 'ab-ranged-generic', magic: 'ab-magic-generic', spell: 'ab-magic-generic',
  };
  function forAbility(classId, abilityId, kind) {
    const c = CLASS[classId], id = abilityId == null ? '' : String(abilityId);
    // the auto-attack: its own kind (kits.js auto.kind) first, the class's table entry second
    if (id === 'auto' && kind && String(kind).toLowerCase() !== 'spark' && Object.prototype.hasOwnProperty.call(KIND, String(kind).toLowerCase()) && typeof KIND[String(kind).toLowerCase()] === 'string') return KIND[String(kind).toLowerCase()];   // ('spark' is shared by five casters: their own table entry decides)
    if (c && Object.prototype.hasOwnProperty.call(c, id)) return c[id];
    if (/^ult(-|$)|^ultimate$/.test(id) && IDIOM[classId]) return ULT(classId);
    if (Object.prototype.hasOwnProperty.call(SHARED, id)) return SHARED[id];
    const idiom = IDIOM[classId];
    const kinds = Array.isArray(kind) ? kind : [kind];
    for (const kd of kinds) {
      if (kd == null) continue;
      const k = String(kd).toLowerCase().replace(/^ab-/, '');
      if (FAMILIES.has(k)) return 'ab-' + k;
      if (Object.prototype.hasOwnProperty.call(KIND, k)) { const m = KIND[k]; if (typeof m === 'string') return m; return idiom ? idiom[m] : (m ? 'ab-magic-generic' : 'ab-melee-generic'); }
    }
    if (idiom) return idiom[0];
    return kinds.some(k => /cast|spell|magic|big/.test(String(k))) ? 'ab-magic-generic' : 'ab-melee-generic';
  }

  // ---------------------------------------------------------------------------------------------- boss moves
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/\+/g, ' plus ').replace(/−/g, ' minus ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const MOVES = {
    grubnak: 'grease-fire tenderize mince double-chop chop-chop ladle-spin lid-slam meat-toss family-meal larder-toss gut-blast butchers-charge order-up rolling-meatballs flare-up flambe stockpot simmer whisk spice-rack boil-over last-orders gorge clogged-drains belly-flop cleaver-toss mise-en-place service dinner-rush',
    skitterra: 'cocoon-drop venom-mist silk-wrap eightfold-lunge silk-lines spin venom-spit strand-reel silk-reel brood acid-deluge into-the-dark from-the-dark venom-drip tightening-web the-swarm spiderlings chrysalis the-web-gives-way egg-sacs fang-rush spinneret-volley molt ceiling-ambush snare-weave',
    volkar: 'pulse thunderclap titan-fist polarity-surge polarity-plus polarity-minus thunder-crash static-field rod-strike gale-slam storm-walls lightning-rods grounding-rods avalanche squall-line eye-of-the-storm still-air eye-closes gathering-storm thunderhead heavens-fall twin-fall chain-lightning ball-lightning skyfall supercell',
    hollowking: 'sceptre-throw grave-summons barrow-knell royal-gaze grave-cleave royal-doom lantern echo-knights barrow-bells coffin-lids the-long-night judgement sceptre-sweep barrow-stomp crown-of-graves the-charge-sheet royal-decree lights-out court-of-bones grave-marks the-king-rises royal-tithe dirge royal-audience funeral-march gravebind burial-rites writ-of-execution',
    wyrm: 'tyrants-roar rending-claws ember-breath tail-lash magma-burst cinder-feast take-flight dragonfall twin-pass the-roost crater-boils twin-breath heart-burn wingbeat cinder-rain heart-flare talon-dive aftershock cinder-run ashfall',
    hydra: 'mothers-cry rending-maul acid-spray tidal-line venom-bloom flame-gout rime-crown stormcall stonegaze mire-spit searing submerge mothers-heart the-drowning regrowth tidal-dance hydras-gaze tail-thrash stump-echo undertow',
    titan: 'winters-howl glacial-fist rime-slam twin-slam fault-line icefall titans-sweep winters-grasp frostbite whiteout the-long-night avalanche glacial-stomp breath-of-winter titans-grip the-lake-rises endless-winter',
    archmage: 'arcane-burst arcane-lance rune-mark cinder-rune rime-rune storm-rune rift-rune pyre-rings ice-lances leaping-bolt void-rifts the-binding call-of-the-circle convergence sigil-flare counterspell rune-swap arcane-mark the-tide-rises',
    corvane: 'white-gale sundering-cut cracked-guard draw-cut scabbard-sweep still-water hollow-breath cold-sheathe rising-crane comet-draw comet-volley hundredfold-parting false-stance whetted-edge overwhet returning-parting the-vigil the-last-vigil last-light-of-the-pass',
    brannoc: 'sunwheel twin-wheels riposte victory-leap hammer-heel roar-of-the-stands sand-furrow the-tide-rises fist-slam breaker undertow-grip double-grip sunwheel-unbound deep-call the-final-bell',
    morrowoak: 'hunger-seed twin-seed inhale fourfold-bloom root-lash sap-tide saplings hungering-dark the-swallowing the-grove-remade deeper-roots cleaver-bough brood-roots storm-knot barrow-lantern wyrm-wing frost-fist archmage-rune hydra-head nothing-left',
    caelum: 'glint eightfold-wake anchored-wake mirrored-wake chorus-of-the-fallen cinder-crown pinning-thrust grace-withdrawn nightfall starfall dark-ember the-starwyrm embers-of-heaven constellation-fall ascendant horizon-cut second-coil the-sky-comes-down',
  };
  const ALIAS = {
    grubnak: { 'butcher-s-charge': 'butchers-charge', 'order-up-plus': 'order-up', 'flame': 'flambe', 'meatballs': 'rolling-meatballs' },
    skitterra: { lunge: 'eightfold-lunge', 'web-gives-way': 'the-web-gives-way', swarm: 'the-swarm', 'egg-sac': 'egg-sacs', eggs: 'egg-sacs', 'silk-reel-in': 'silk-reel', webs: 'silk-lines' },
    volkar: { polarity: 'polarity-surge', surge: 'polarity-surge', 'polarity-positive': 'polarity-plus', 'polarity-negative': 'polarity-minus', plus: 'polarity-plus', minus: 'polarity-minus', 'heavens-fall-plus': 'heavens-fall', 'the-pulse': 'pulse', eye: 'eye-of-the-storm', rods: 'lightning-rods' },
    hollowking: { 'long-night': 'the-long-night', 'charge-sheet': 'the-charge-sheet', 'king-rises': 'the-king-rises', knell: 'barrow-knell', bells: 'barrow-bells', 'royal-lantern': 'lantern', judgment: 'judgement', doom: 'royal-doom', gaze: 'royal-gaze' },
    wyrm: { roar: 'tyrants-roar', claws: 'rending-claws', breath: 'ember-breath', tail: 'tail-lash', magma: 'magma-burst', feast: 'cinder-feast', flight: 'take-flight', dive: 'dragonfall', roost: 'the-roost', boils: 'crater-boils', 'heart-burn-wave': 'heart-burn', rain: 'cinder-rain', flare: 'heart-flare' },
    titan: { howl: 'winters-howl', fist: 'glacial-fist', slam: 'rime-slam', fault: 'fault-line', sweep: 'titans-sweep', grasp: 'winters-grasp', stomp: 'glacial-stomp', breath: 'breath-of-winter', grip: 'titans-grip', 'long-night': 'the-long-night' },
  };
  const BOSS_ALIAS = { 'hollow-king': 'hollowking', 'the-hollow-king': 'hollowking', 'queen-skitterra': 'skitterra', vhalgrath: 'wyrm', azerath: 'archmage', 'the-sunken-archmage': 'archmage', 'the-ember-wyrm': 'wyrm', hrimgar: 'titan', 'the-frost-titan': 'titan', 'the-unburied-blade': 'corvane', 'brannoc-the-undefeated': 'brannoc', 'the-tidewrought': 'brannoc', tidewrought: 'brannoc', 'morrow-oak': 'morrowoak', 'the-starved-grove': 'morrowoak', 'starved-grove': 'morrowoak', 'caelum-vey': 'caelum', 'the-starborn': 'caelum', starborn: 'caelum' };
  const TABLE = {};
  for (const b in MOVES) { TABLE[b] = {}; for (const s of MOVES[b].split(' ')) TABLE[b][s] = 'bm-' + b + '-' + s; for (const a in ALIAS[b]) TABLE[b][a] = TABLE[b][ALIAS[b][a]]; }
  // (anim: the boss animation the hook may pass along; unused for now, kept for move-less casts later)
  function forBossMove(bossId, moveName, anim) {
    let b = norm(bossId); b = BOSS_ALIAS[b] || b.replace(/-/g, '');
    const t = TABLE[b]; if (!t) return null;
    const m = norm(moveName);
    if (t[m]) return t[m];
    const bare = m.replace(/^the-/, ''); if (t[bare]) return t[bare];
    if (t['the-' + m]) return t['the-' + m];
    return null;
  }
  function forBossIntro(bossId) { let b = norm(bossId); b = BOSS_ALIAS[b] || b.replace(/-/g, ''); return TABLE[b] ? 'bm-' + b + '-intro' : 'boss-intro'; }

  // ---------------------------------------------------------------------------------------------- telegraphs
  const TELEGRAPH = {
    raidwide: 'tg-raidwide', buster: 'tg-buster', tankbuster: 'tg-buster', aoe: 'tg-aoe', circle: 'tg-aoe', rect: 'tg-aoe', line: 'tg-aoe', cone: 'tg-aoe', donut: 'tg-aoe', drop: 'tg-aoe', safe: 'tg-aoe', proximity: 'tg-aoe', own: 'tg-aoe', rodstrike: 'tg-aoe',
    stack: 'tg-stack', share: 'tg-stack', spread: 'tg-spread', chain: 'tg-spread', tower: 'tg-tower', soak: 'tg-tower',
    gaze: 'tg-gaze', dark: 'tg-gaze', audience: 'tg-gaze', knockback: 'tg-knockback', hook: 'tg-knockback', gale: 'tg-knockback', pull: 'tg-knockback',
    charge: 'tg-charge', polarity: 'tg-stack', enrage: 'boss-enrage',
  };
  const forTelegraph = type => TELEGRAPH[norm(type)] || 'tg-aoe';

  const SfxMap = { forAbility, forBossMove, forBossIntro, forTelegraph, category, priority, MIX, CLASS, IDIOM, MOVES: TABLE, TELEGRAPH, norm };
  G.SfxMap = SfxMap;
  if (typeof module !== 'undefined' && module.exports) module.exports = SfxMap;
})(typeof globalThis !== 'undefined' ? globalThis : this);
