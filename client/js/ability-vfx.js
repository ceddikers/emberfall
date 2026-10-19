// What every ability looks like. One recipe per class skill, built from VFX's building blocks.
// recipe(c) gets c = { ent, x, y (caster), tx, ty (where it lands), tent (the ally it lands on, if any), ang (facing), later(delay, fn) }.
// Spammed GCD fillers stay small and quick; cooldowns and big hits get the show.

const ABILITY_VFX = (() => {
  const V = VFX;

  return {
    bastion: {
      blade: c => { V.slash(c.x, c.y, c.ang, { r: 58, span: 2.1, color: '#9fc4ff', flip: Math.random() < 0.5 }); c.later(0.08, () => V.hit(c.tx, c.ty, '#cfe0ff', 0.7)); },
      edge: c => { V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#ffe08a', speed: 900, onHit: (x, y) => { V.burst(x, y, { color: '#ffe9a0', color2: '#ffffff', n: 14, speed: 200 }); V.sigil(x, y, { r: 44, style: 'star4', color: '#ffd65a', dur: 0.6, spin: 3 }); } }); V.motes(c.x, c.y, { color: '#ffe9a0', n: 4 }); },
      brace: c => { V.shield(c.ent, { shape: 'front', color: '#7fb2ff', dur: 1.2, r: 40 }); V.sparks(c.x + Math.cos(c.ang) * 34, c.y + Math.sin(c.ang) * 34, { color: '#cfe0ff', n: 5, angle: c.ang, spread: 0.7, speed: 200 }); },
      oath: c => { V.sigil(c.x, c.y, { r: 56, style: 'star4', color: '#ffd65a', dur: 1.4, spin: 1.5 }); V.pillar(c.x, c.y, { r: 30, h: 160, color: '#ffe08a', dur: 1, follow: c.ent }); V.aura(c.ent, { color: '#ffd65a', dur: 15, r: 30, rate: 0.12 }); V.burst(c.x, c.y - 30, { color: '#fff2b0', n: 12, speed: 160 }); },
      banner: c => { V.sigil(c.x, c.y, { r: 150, style: 'star5', color: '#f2c84b', dur: 3, spin: 0.4 }); V.pillar(c.x, c.y, { r: 26, h: 220, color: '#ffe08a', dur: 1.4 }); V.shock(c.x, c.y, { r: 160, color: '#ffe08a', dur: 0.6, w: 6 }); },
      bulwark: c => { V.shield(c.ent, { shape: 'hex', color: '#8fc0ff', dur: 3, r: 42 }); V.shock(c.x, c.y, { r: 110, color: '#9fc4ff', dur: 0.5, w: 7 }); V.burst(c.x, c.y - 20, { color: '#cfe0ff', n: 16, speed: 240, kind: 'star' }); },
    },
    bloodreaver: {
      hack: c => { V.slash(c.x, c.y, c.ang, { r: 66, span: 2.4, color: '#ff3a3a', w: 0.55, flip: Math.random() < 0.5 }); c.later(0.08, () => { V.splash(c.tx, c.ty, { n: 6 }); V.hit(c.tx, c.ty, '#ff5a5a', 0.6); }); },
      drain: c => { V.slash(c.x, c.y, c.ang, { r: 74, span: 2.6, color: '#ff1a3a', w: 0.6, dur: 0.38 }); c.later(0.1, () => { V.splash(c.tx, c.ty, { n: 12, speed: 1.3 }); V.hit(c.tx, c.ty, '#ff2a4a', 1.1); V.stream(c.tx, c.ty, c.ent, { color: '#ff2a4a', n: 12 }); }); c.later(0.5, () => V.swirl(c.ent.x, c.ent.y, { r: 44, color: '#ff2a4a', dur: 0.6, follow: c.ent, inward: true })); },
      letting: c => { V.slash(c.x, c.y, c.ang + 0.4, { r: 50, span: 1.3, color: '#ff6a6a', dur: 0.22 }); c.later(0.07, () => V.slash(c.x, c.y, c.ang - 0.4, { r: 50, span: 1.3, color: '#ff6a6a', dur: 0.22, flip: true })); c.later(0.12, () => V.splash(c.tx, c.ty, { n: 5 })); },
      frenzy: c => { V.aura(c.ent, { color: '#ff2a1a', style: 'flame', dur: 12, r: 30, rate: 0.35 }); V.shock(c.x, c.y, { r: 120, color: '#ff3a2a', dur: 0.45, w: 8 }); V.flare(c.x, c.y, { color: '#ff3a1a', n: 18 }); },
      warcry: c => { for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 140 + i * 50, color: '#ff8a5a', dur: 0.6, w: 7 - i * 2, delay: i * 0.12 }); V.burst(c.x, c.y - 30, { color: '#ffb08a', n: 12, speed: 260 }); FX.shake = Math.max(FX.shake, 4); },
      undying: c => { V.sigil(c.x, c.y, { r: 60, style: 'runes', color: '#c01a2a', dur: 8, spin: -0.8, follow: c.ent }); V.aura(c.ent, { color: '#8a0010', style: 'shadow', dur: 8, r: 30, rate: 0.3 }); V.shield(c.ent, { color: '#ff2a3a', dur: 1, r: 44 }); },
    },
    runeguard: {
      strike: c => c.later(0.06, () => { V.hit(c.tx, c.ty, '#b18cff', 0.75); V.sigil(c.tx, c.ty, { r: 26, style: 'runes', color: '#c8a8ff', dur: 0.4, spin: 6 }); }),
      ward: c => { V.shield(c.ent, { shape: 'hex', color: '#a88cff', dur: 8, r: 40 }); V.aura(c.ent, { color: '#b18cff', style: 'runes', dur: 1.2, r: 34 }); },
      glyph: c => { V.sigil(c.tx, c.ty, { r: 64, style: 'runes', color: '#9a6bff', dur: 0.5, spin: 8 }); c.later(0.4, () => { V.crystals(c.tx, c.ty, { color: '#b28cff', n: 9, r: 46, h: 58 }); V.burst(c.tx, c.ty, { color: '#d8c4ff', n: 16, speed: 260 }); FX.shake = Math.max(FX.shake, 3); }); },
      overload: c => { V.aura(c.ent, { color: '#a070ff', style: 'runes', dur: 15, r: 32, rate: 0.25 }); V.sigil(c.x, c.y, { r: 70, style: 'runes', color: '#a070ff', dur: 1.2, spin: 3 }); for (let i = 0; i < 4; i++) c.later(i * 0.12, () => { const a = Math.random() * Math.PI * 2; V.lightning(c.ent.x, c.ent.y, c.ent.x + Math.cos(a) * 60, c.ent.y + Math.sin(a) * 40, { color: '#d0b8ff', jag: 10 }); }); },
      sanctum: c => { V.sigil(c.x, c.y, { r: 150, style: 'runes', color: '#9f7aff', dur: 3, spin: 0.5 }); V.pillar(c.x, c.y, { r: 50, h: 160, color: '#b8a0ff', dur: 1.2 }); },
      mirror: c => { V.shield(c.ent, { shape: 'front', color: '#e0d4ff', dur: 3, r: 44 }); V.crystals(c.x + Math.cos(c.ang) * 30, c.y + Math.sin(c.ang) * 30, { color: '#e8e0ff', n: 5, r: 18, h: 40, dur: 0.6 }); },
    },
    ranger: {
      quick: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#bfff9a', speed: 1300, onHit: (x, y) => V.hit(x, y, '#d8ffc0', 0.5) }),
      pierce: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'helix', color: '#7dffb0', speed: 1500, size: 1.2, onHit: (x, y) => { V.hit(x, y, '#b0ffd0', 1); V.shock(x, y, { r: 60, color: '#7dffb0', dur: 0.35 }); } }),
      rapid: c => { V.rain(c.tx, c.ty, { n: 9, r: 50, color: '#e8ffb0' }); },
      mark: c => { V.sigil(c.tx, c.ty, { r: 70, style: 'star4', color: '#ff9d3d', dur: 1.4, spin: 2 }); V.burst(c.tx, c.ty - 40, { color: '#ffb060', n: 10, speed: 140 }); },
      cloak: c => { for (let i = 0; i < 14; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 20, life: 1.2, size: 12, color: '#5fbf4a', kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.45, r: 20, w: 5, dr: 90, flat: 0.6 } }); V.shock(c.x, c.y, { r: 120, color: '#8fdf7a', dur: 0.6 }); },
      barrage: c => { V.aura(c.ent, { color: '#c8ff7a', dur: 2, r: 28, rate: 0.6 }); V.charge(c.ent.x, c.ent.y, { color: '#d8ff9a', r: 50, follow: c.ent }); },
    },
    shadowblade: {
      strike: c => { V.slash(c.x, c.y, c.ang, { r: 44, span: 1.4, color: '#c58aff', dur: 0.2, flip: Math.random() < 0.5 }); c.later(0.06, () => V.hit(c.tx, c.ty, '#e0c0ff', 0.5)); },
      evis: c => { V.slash(c.x, c.y, c.ang + 0.5, { r: 58, span: 1.7, color: '#ff4d9a', dur: 0.28 }); c.later(0.08, () => V.slash(c.x, c.y, c.ang - 0.5, { r: 58, span: 1.7, color: '#ff4d9a', dur: 0.28, flip: true })); c.later(0.16, () => { V.burst(c.tx, c.ty, { color: '#ff7ac0', color2: '#ffffff', n: 16, speed: 240 }); V.hit(c.tx, c.ty, '#ff9ad0', 1.1); }); },
      step: c => { V.smoke(c.x, c.y, { n: 8, color: '#5a3a7a', size: 26, a: 0.75 }); V.swirl(c.x, c.y, { r: 40, color: '#b070ff', dur: 0.4, inward: true }); },
      dance: c => { V.aura(c.ent, { color: '#b04dff', style: 'shadow', dur: 10, r: 30, rate: 0.3 }); V.shock(c.x, c.y, { r: 90, color: '#c070ff', dur: 0.4 }); V.burst(c.x, c.y - 20, { color: '#d8a0ff', n: 12, speed: 180 }); },
      venom: c => { V.slash(c.x, c.y, c.ang, { r: 48, span: 1.6, color: '#8aff4a', dur: 0.24 }); c.later(0.08, () => { V.splash(c.tx, c.ty, { color: '#7adf3a', n: 8 }); for (let i = 0; i < 6; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 30, y: c.ty, z: 10, vz: 40 + Math.random() * 40, life: 0.9, size: 10, size1: 16, color: '#9adf3a', kind: 'soft' }); }); },
      smoke: c => { V.smoke(c.x, c.y, { n: 16, color: '#6a5a7a', size: 40, speed: 120, life: 1.6, a: 0.8 }); V.shock(c.x, c.y, { r: 140, color: '#a08ac0', dur: 0.5 }); },
    },
    pyromancer: {
      fireball: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8c2a', speed: 700, arc: 16, onHit: (x, y) => { V.flare(x, y, { n: 12, r: 12 }); V.hit(x, y, '#ffb050', 0.9); } }),
      pyro: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'meteor', color: '#ff5a1a', speed: 560, arc: 50, onHit: (x, y) => { V.flare(x, y, { n: 26, r: 24, size: 1.3, h: 1.3 }); V.shock(x, y, { r: 110, color: '#ff8a3a', dur: 0.5, w: 8 }); V.burst(x, y, { color: '#ffd070', n: 14, speed: 300, flashR: 70 }); V.decal(x, y, { r: 46, embers: true, dur: 3 }); FX.shake = Math.max(FX.shake, 6); } }),
      fireblast: c => { V.flare(c.tx, c.ty, { n: 10, r: 10, h: 0.8 }); V.hit(c.tx, c.ty, '#ffd070', 0.8); V.spawn({ x: c.tx, y: c.ty, z: 18, life: 0.25, size: 60, size1: 24, color: '#ffb050', kind: 'star', vr: 6 }); },
      combust: c => { V.aura(c.ent, { color: '#ff6a1a', style: 'flame', dur: 10, r: 30, rate: 0.5 }); V.sigil(c.x, c.y, { r: 66, style: 'star5', color: '#ff7a1a', dur: 1.2, spin: 2.5 }); V.flare(c.x, c.y, { n: 20, r: 20 }); V.shock(c.x, c.y, { r: 100, color: '#ffa040', dur: 0.4, w: 6 }); },
      vent: c => { V.sigil(c.tx, c.ty, { r: 70, style: 'star5', color: '#ff3a1a', dur: 0.6, spin: 6 }); c.later(0.3, () => { V.tornado(c.tx, c.ty, { color: '#ff8a3a', h: 170, r: 46, dur: 0.9 }); V.flare(c.tx, c.ty, { n: 30, r: 30, size: 1.4, h: 1.5 }); V.shock(c.tx, c.ty, { r: 130, color: '#ff6a1a', dur: 0.5, w: 8 }); V.decal(c.tx, c.ty, { r: 60, embers: true }); FX.shake = Math.max(FX.shake, 7); }); },
      smolder: c => { V.smoke(c.x, c.y, { n: 12, color: '#5a3a5a', size: 34, speed: 110, a: 0.6 }); V.shock(c.x, c.y, { r: 130, color: '#ff8a5a', dur: 0.6 }); for (let i = 0; i < 12; i++) V.spawn({ x: c.x + (Math.random() - 0.5) * 160, y: c.y + (Math.random() - 0.5) * 100, z: 0, vz: 30 + Math.random() * 40, life: 1.4, size: 6, size1: 0, color: '#ff8a3a' }); },
    },
    cleric: {
      smite: c => { V.beam(c.tx, c.ty - 260, c.tx, c.ty, { color: '#fff0a8', w: 9, dur: 0.35 }); c.later(0.05, () => V.burst(c.tx, c.ty, { color: '#fff4c0', n: 10, speed: 160 })); },
      mend: c => { V.sigil(c.tx, c.ty, { r: 40, style: 'petals', color: '#ffe680', dur: 0.9, spin: 2 }); V.motes(c.tx, c.ty, { color: '#fff4c0', n: 10, r: 22 }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 4 }); },
      petal: c => { for (let i = 0; i < 10; i++) V.spawn({ x: c.tx, y: c.ty, z: 8 + i * 3, life: 1, size: 12, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 5, flutter: 6, orbit: { x: c.tx, y: c.ty, a: i * 0.63, r: 30, w: 4, dr: -20, flat: 0.55 } }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 3 }); },
      prayer: c => { V.sigil(c.x, c.y, { r: 160, style: 'hex', color: '#ffe680', dur: 3, spin: 0.4 }); V.pillar(c.x, c.y, { r: 60, h: 240, color: '#fff0b0', dur: 1.4 }); },
      intervene: c => { V.pillar(c.tx, c.ty, { r: 44, h: 320, color: '#fff6c8', dur: 1.8 }); for (let i = 0; i < 12; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 80, y: c.ty + (Math.random() - 0.5) * 30, z: 160 + Math.random() * 80, vz: -60, vx: (Math.random() - 0.5) * 30, life: 2, size: 12, color: '#ffffff', kind: 'petal', add: false, vr: 2, flutter: 3 }); c.later(0.2, () => V.burst(c.tx, c.ty - 40, { color: '#ffffff', color2: '#ffe680', n: 20, speed: 200, flashR: 80 })); },
      bene: c => { if (c.tent) V.shield(c.tent, { color: '#ffe680', dur: 1.6, r: 40 }); V.burst(c.tx, c.ty - 10, { color: '#fff0a8', color2: '#ffffff', n: 18, speed: 220, kind: 'star' }); V.shock(c.tx, c.ty, { r: 70, color: '#ffe680', dur: 0.4 }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 6 }); },
    },
    grovekeeper: {
      wrath: c => { V.crystals(c.tx, c.ty, { color: '#6aff4a', n: 7, r: 30, h: 44, dur: 0.6 }); V.burst(c.tx, c.ty, { color: '#b0ff8a', n: 8, speed: 140, flash: false }); },
      rejuv: c => { for (let i = 0; i < 8; i++) V.spawn({ x: c.tx, y: c.ty, z: 6 + i * 3, life: 1.1, size: 11, color: '#8fff7a', kind: 'leaf', add: false, vr: 5, orbit: { x: c.tx, y: c.ty, a: i * 0.8, r: 26, w: 4.5, dr: 4, flat: 0.55 } }); V.plus(c.tx, c.ty, { color: '#7dff8a', n: 3 }); },
      thorn: c => { V.crystals(c.tx, c.ty, { color: '#5a8a2a', n: 6, r: 36, h: 36, dur: 1 }); V.splash(c.tx, c.ty, { color: '#4a7a2a', n: 5, size: 0.8 }); },
      growth: c => { V.sigil(c.x, c.y, { r: 170, style: 'petals', color: '#7ee06a', dur: 2.4, spin: 0.5 }); for (let i = 0; i < 18; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 20, life: 1.4, size: 13, color: i % 2 ? '#8fff7a' : '#c8ff8a', kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.35, r: 10, w: 3, dr: 130, flat: 0.6 } }); V.plus(c.x, c.y, { n: 8 }); },
      bloom: c => { V.sigil(c.x, c.y, { r: 60, style: 'petals', color: '#c8ff8a', dur: 0.9, spin: 3 }); V.burst(c.x, c.y - 10, { color: '#d8ffb0', color2: '#fff0a8', n: 20, speed: 240, kind: 'star', flashR: 70 }); V.shock(c.x, c.y, { r: 140, color: '#a8ff9a', dur: 0.5 }); },
      rebirth: c => { V.pillar(c.tx, c.ty, { r: 40, h: 260, color: '#a8ff9a', dur: 1.6 }); V.swirl(c.tx, c.ty, { r: 50, color: '#8fff7a', dur: 1.4 }); V.motes(c.tx, c.ty, { kind: 'leaf', color: '#8fff7a', n: 10 }); },
    },
    chronomancer: {
      bolt: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#5ff0ff', speed: 900, onHit: (x, y) => { V.hit(x, y, '#a0f8ff', 0.8); V.spawn({ x, y, z: 14, life: 0.3, size: 50, size1: 20, color: '#5ff0ff', kind: 'star', vr: -5 }); } }),
      rewind: c => { V.sigil(c.tx, c.ty, { r: 50, style: 'clock', color: '#c8fbff', dur: 1, spin: -6 }); V.swirl(c.tx, c.ty, { r: 50, color: '#9ff4ff', dur: 0.7, dir: -1, inward: true }); c.later(0.5, () => V.burst(c.tx, c.ty - 16, { color: '#e0ffff', n: 12, speed: 180 })); },
      shift: c => { V.sigil(c.x, c.y, { r: 44, style: 'gears', color: '#3fd0d0', dur: 0.7, spin: 5 }); V.burst(c.x, c.y - 20, { color: '#9ff4ff', n: 8, speed: 120, flash: false }); },
      accel: c => { V.sigil(c.x, c.y, { r: 160, style: 'clock', color: '#3fd0d0', dur: 2.2, spin: 3 }); for (let i = 0; i < 16; i++) V.spawn({ x: c.x + (Math.random() - 0.5) * 220, y: c.y + (Math.random() - 0.5) * 140, z: 0, vz: 260 + Math.random() * 120, life: 0.6, size: 9, color: '#9ff4ff', stretch: 5 }); },
      stasis: c => { V.shock(c.x, c.y, { r: 180, color: '#c8fbff', dur: 0.7, w: 9 }); V.sigil(c.x, c.y, { r: 120, style: 'hex', color: '#9ff4ff', dur: 2, spin: 0 }); V.crystals(c.x, c.y, { color: '#c8f4ff', n: 10, r: 110, h: 50, dur: 2 }); },
      recall: c => { V.swirl(c.tx, c.ty, { r: 60, color: '#5ff0ff', dur: 1.6, arms: 5 }); V.pillar(c.tx, c.ty, { r: 34, h: 220, color: '#9ff4ff', dur: 1.4 }); },
    },
  };
})();

// Class-specific moments (perfect block, overheat...) and the shared dash.
const KIT_VFX = {
  // an item enhancement firing: a quick golden flare in the hero's colour
  empower: e => { VFX.flash(e.x, e.y - 20, 40, '#ffd27a', 0.25); VFX.motes(e.x, e.y, { color: (e.cls && e.cls.accent) || '#ffd27a', n: 6, r: 22, kind: 'star' }); VFX.shock(e.x, e.y, { r: 46, color: '#ffd27a', w: 3, dur: 0.3 }); },
  perfect: e => { VFX.shock(e.x, e.y, { r: 90, color: '#ffe27a', dur: 0.4, w: 7 }); VFX.spawn({ x: e.x + Math.cos(e.angle) * 30, y: e.y + Math.sin(e.angle) * 30, z: 18, life: 0.3, size: 80, size1: 30, color: '#ffe27a', kind: 'star', vr: 5 }); VFX.sparks(e.x + Math.cos(e.angle) * 30, e.y + Math.sin(e.angle) * 30, { color: '#fff2b0', n: 12, angle: e.angle, spread: 1, speed: 420 }); FX.shake = Math.max(FX.shake, 4); },
  'rune-echo': e => { VFX.crystals(e.x, e.y, { color: '#b28cff', n: 8, r: 44, h: 50 }); VFX.burst(e.x, e.y, { color: '#d8c4ff', n: 14, speed: 240 }); },
  reflect: (e, target) => { if (target) VFX.beam(e.x, e.y, target.x, target.y, { color: '#e8e0ff', w: 12, dur: 0.4 }); VFX.burst(e.x, e.y, { color: '#ffffff', color2: '#e0d4ff', n: 16, speed: 260, kind: 'star' }); },
  overheat: e => { VFX.flare(e.x, e.y, { n: 24, color: '#ff2a1a', r: 18 }); VFX.shock(e.x, e.y, { r: 90, color: '#ff3a1a', dur: 0.4 }); },
  dawnstar: (e, target) => { const t = target || e; VFX.beam(t.x, t.y - 300, t.x, t.y, { color: '#fff6c8', w: 18, dur: 0.5 }); VFX.burst(t.x, t.y, { color: '#ffe680', color2: '#ffffff', n: 26, speed: 320, kind: 'star', flashR: 110 }); VFX.sigil(t.x, t.y, { r: 90, style: 'star4', color: '#ffe680', dur: 0.9, spin: 4 }); FX.shake = Math.max(FX.shake, 5); },
  lag: e => { VFX.smoke(e.x, e.y, { n: 6, color: '#8aa0a8', size: 22, a: 0.5 }); },
  dash: (e, color) => { VFX.smoke(e.x, e.y, { n: 4, color: '#d8ccb8', size: 18, a: 0.6, speed: 40 }); VFX.shock(e.x, e.y, { r: 36, color: color || '#ffffff', dur: 0.3, w: 3 }); },
};

// Auto-attacks: small, quick and frequent, so they stay well below the abilities visually.
// c: { ent, tx, ty, ang, alt (alternates swing direction), color (class accent) }
const AUTO_VFX = (() => {
  const V = VFX;
  // where a melee swing connects: toward the target, but no further than the weapon reaches
  const reach = (c, d) => { const dist = Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y), r = Math.min(dist, d); return { x: c.ent.x + Math.cos(c.ang) * r, y: c.ent.y + Math.sin(c.ang) * r }; };
  return {
    slash: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 52, span: 1.4, color: '#dfe8ff', dur: 0.22, w: 0.32, flip: c.alt, sparks: 3 }); c.later(0.08, () => { const p = reach(c, 70); V.hit(p.x, p.y, '#e8f0ff', 0.45); }); },
    chop: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 60, span: 1.7, color: '#ff8a7a', dur: 0.26, w: 0.42, flip: c.alt, sparks: 4 }); c.later(0.1, () => { const p = reach(c, 76); V.hit(p.x, p.y, '#ffb0a0', 0.55); V.splash(p.x, p.y, { n: 3, size: 0.6 }); }); },
    stab: c => { const p = reach(c, 62); V.slash(c.ent.x, c.ent.y, c.ang + (c.alt ? 0.35 : -0.35), { r: 40, span: 0.8, color: '#e0b0ff', dur: 0.18, w: 0.3, flip: c.alt, sparks: 2 }); c.later(0.06, () => V.sparks(p.x, p.y, { color: '#f0d8ff', n: 4, angle: c.ang, spread: 0.6, speed: 260 })); },
    rune: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: '#b18cff', speed: 900, size: 0.55, onHit: (x, y) => V.hit(x, y, '#c9b0ff', 0.45) }),
    shot: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'arrow', color: '#e8e0c0', speed: 1500, size: 0.8, onHit: (x, y) => V.hit(x, y, '#fff2c0', 0.4) }),
    spark: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: c.color, speed: 950, size: 0.5, onHit: (x, y) => V.hit(x, y, c.color, 0.35) }),
  };
})();
