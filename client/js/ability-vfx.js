// What every ability looks like. One recipe per class skill, built from VFX's building blocks.
// recipe(c) gets c = { ent, x, y (caster), tx, ty (where it lands), tent (the ally it lands on, if any), ang (facing), later(delay, fn) }.
// Spammed GCD fillers stay small and quick; cooldowns and big hits get the show.

const ABILITY_VFX = (() => {
  const V = VFX;
  // a point d px from the caster toward where the ability lands (a hand, a bow, a blade)
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  // a point part way from the caster (0) to the target (1): floor marks at a boss's feet go here so its sprite doesn't hide them
  const between = (c, f) => ({ x: c.x + (c.tx - c.x) * f, y: c.y + (c.ty - c.y) * f });
  const shake = s => { FX.shake = Math.max(FX.shake, s); };

  return {
    bastion: {
      blade: c => { V.slash(c.x, c.y, c.ang, { r: 58, span: 2.1, color: '#9fc4ff', flip: Math.random() < 0.5, sparks: 4 }); c.later(0.08, () => V.hit(c.tx, c.ty, '#cfe0ff', 0.65)); },
      // a glint on the sword, a radiant blade thrown, a golden starburst and a small seal where it lands
      edge: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffe08a', size: 26 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#ffe08a', speed: 900, onHit: (x, y) => { V.spikeburst(x, y, { r: 44, n: 12, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.32 });
        V.burst(x, y, { color: '#ffe9a0', color2: '#ffffff', n: 8, speed: 180, flash: false }); V.sigil(x, y, { r: 44, style: 'star4', color: '#ffd65a', dur: 0.6, spin: 3 }); } }); },
      // a glint on the shield face, the shield up, a few sparks and a scuff of dust at the feet
      brace: c => { const fx = c.x + Math.cos(c.ang) * 34, fy = c.y + Math.sin(c.ang) * 34; V.glint(fx, fy, { color: '#dbe9ff', size: 24 }); V.shield(c.ent, { shape: 'front', color: '#7fb2ff', dur: 1.2, r: 40 });
        V.sparks(fx, fy, { color: '#cfe0ff', n: 4, angle: c.ang, spread: 0.7, speed: 200 }); V.smoke(c.x, c.y, { n: 3, color: '#c8c0b0', size: 16, a: 0.45, speed: 35 }); },
      // a shaft of light slams down (Divine Leap): a golden starburst, a seal on the floor, stones kicked up, then the aura
      oath: c => { V.lightfall(c.x, c.y, { color: '#ffe08a', r: 30, h: 240, dur: 0.8, feathers: 0 }); V.aura(c.ent, { color: '#ffd65a', dur: 15, r: 30, rate: 0.12 });
        c.later(0.2, () => { V.ink(c.x, c.y, { r: 60, dur: 1.4 }); V.sigil(c.x, c.y, { r: 60, style: 'star4', color: '#ffd65a', dur: 1.4, spin: 1.5 }); V.spikeburst(c.x, c.y, { r: 50, n: 12, color: '#ffd65a', core: '#fffbe0', ink: '#4a3408', dur: 0.36, z: 4 }); V.debris(c.x, c.y, { n: 6, color: '#8a7a68' }); shake(3); }); },
      // a glint where the banner goes in, light falling onto it, and a great gold circle on the floor
      banner: c => { V.glint(c.x, c.y, { color: '#ffe08a', size: 30, z: 60 }); V.ink(c.x, c.y, { r: 150, dur: 3 }); V.sigil(c.x, c.y, { r: 150, style: 'star5', color: '#f2c84b', dur: 3, spin: 0.4 });
        c.later(0.1, () => { V.lightfall(c.x, c.y, { color: '#ffe08a', r: 26, h: 260, dur: 1.2, feathers: 4 }); V.shock(c.x, c.y, { r: 160, color: '#ffe08a', dur: 0.6, w: 6 }); V.debris(c.x, c.y, { n: 5, color: '#8a7a68', speed: 0.7 }); }); },
      // a glint, then a blue dome over a rune circle, sparkles scattering when it lifts
      bulwark: c => { V.glint(c.x, c.y, { color: '#cfe0ff', size: 30, z: 40 }); V.ink(c.x, c.y, { r: 62, dur: 3, flat: 0.5, follow: c.ent }); V.dome(c.ent, { color: '#8fc0ff', r: 48, dur: 3 });
        V.shock(c.x, c.y, { r: 110, color: '#9fc4ff', dur: 0.5, w: 7 }); V.burst(c.x, c.y - 20, { color: '#cfe0ff', n: 12, speed: 220, kind: 'star' }); },
      // Sentinel: the tower shield slams forward, a blue shockwave off its face, dust kicked up
      bash: c => {
        const fx = c.x + Math.cos(c.ang) * 34, fy = c.y + Math.sin(c.ang) * 34;
        V.shield(c.ent, { shape: 'front', color: '#bcd8ff', dur: 0.5, r: 42 });
        c.later(0.06, () => { V.spawn({ x: fx, y: fy, z: 18, life: 0.25, size: 70, size1: 26, color: '#dbe9ff', kind: 'star', vr: 4 }); V.shock(fx, fy, { r: 80, color: '#7fb2ff', dur: 0.35, w: 6 });
          V.sparks(fx, fy, { color: '#ffffff', n: 8, angle: c.ang, spread: 0.8, speed: 360 }); V.smoke(fx, fy, { n: 4, color: '#c8c0b0', size: 20, a: 0.5, speed: 50 }); FX.shake = Math.max(FX.shake, 3); });
      },
      // Crusader: a consecrated dome of dawn light over a rune circle
      zeal: c => { V.dome(c.ent, { color: '#ffd65a', r: 46, dur: 2.6 }); V.sigil(c.x, c.y, { r: 70, style: 'star4', color: '#ffe27a', dur: 1, spin: 2 }); V.burst(c.x, c.y - 30, { color: '#fff2b0', color2: '#ffffff', n: 14, speed: 200, kind: 'star' }); },
    },
    bloodreaver: {
      hack: c => { V.slash(c.x, c.y, c.ang, { r: 66, span: 2.4, color: '#ff3a3a', w: 0.55, flip: Math.random() < 0.5 }); c.later(0.08, () => { V.splash(c.tx, c.ty, { n: 6 }); V.hit(c.tx, c.ty, '#ff5a5a', 0.6); }); },
      // a heavy cut, blood streaming back into the reaver, and a splatter left on the floor
      drain: c => { V.slash(c.x, c.y, c.ang, { r: 74, span: 2.6, color: '#ff1a3a', w: 0.6, dur: 0.38 }); c.later(0.1, () => { const m = between(c, 0.6); V.splash(c.tx, c.ty, { n: 10, speed: 1.3 }); V.hit(c.tx, c.ty, '#ff2a4a', 1); V.stream(c.tx, c.ty, c.ent, { color: '#ff2a4a', n: 10 });
        V.puddle(m.x, m.y, { r: 22, color: '#a01028', dark: '#3a0610', dur: 1.8, bubbles: false, fumes: false }); }); c.later(0.5, () => V.swirl(c.ent.x, c.ent.y, { r: 44, color: '#ff2a4a', dur: 0.6, follow: c.ent, inward: true })); },
      letting: c => { V.slash(c.x, c.y, c.ang + 0.4, { r: 50, span: 1.3, color: '#ff6a6a', dur: 0.22 }); c.later(0.07, () => V.slash(c.x, c.y, c.ang - 0.4, { r: 50, span: 1.3, color: '#ff6a6a', dur: 0.22, flip: true }));
        c.later(0.12, () => { V.splash(c.tx, c.ty, { n: 5 }); V.spikeburst(c.tx, c.ty, { r: 32, n: 10, color: '#d0203a', core: '#ffd0d0', ink: '#2a0408', dur: 0.26 }); }); },
      // power gathers, then a ground slam: a starburst, the floor cracks with glowing lava, rocks fly; the flame aura stays on
      frenzy: c => { V.charge(c.x, c.y, { color: '#ff5a2a', r: 50, n: 8, dur: 0.25, follow: c.ent }); V.aura(c.ent, { color: '#ff2a1a', style: 'flame', dur: 12, r: 30, rate: 0.3 });
        c.later(0.18, () => { V.crater(c.ent.x, c.ent.y, { r: 64, color: '#ff4a1a', dur: 2.6, flames: 4, a: 0.55 }); V.spikeburst(c.ent.x, c.ent.y, { r: 60, n: 14, color: '#ff3a1a', core: '#ffd070', ink: '#3a0806', dur: 0.36, z: 6 });
          V.flare(c.ent.x, c.ent.y, { color: '#ff3a1a', n: 12, r: 22 }); V.debris(c.ent.x, c.ent.y, { n: 8, hot: true, color: '#5a3a2a' }); V.shock(c.ent.x, c.ent.y, { r: 120, color: '#ff3a2a', dur: 0.45, w: 8 }); shake(5); }); },
      // a roar: a ring of red spikes bursts across the floor, shockwaves roll out, a dust cloud and embers settle
      warcry: c => { V.glint(c.x, c.y, { color: '#ffb08a', size: 26, z: 40 });
        c.later(0.1, () => { V.spikeburst(c.x, c.y, { r: 120, n: 22, hole: 0.62, color: '#ff4a1a', core: '#ffb070', ink: '#3a0806', fill: '#8a1a0a', dur: 0.55, layer: 'ground', z: 0, flat: 0.6 });
          for (let i = 0; i < 2; i++) V.shock(c.x, c.y, { r: 160 + i * 50, color: '#ff8a5a', dur: 0.6, w: 6 - i * 2, delay: i * 0.12 }); shake(4); });
        c.later(0.45, () => { V.smoke(c.x, c.y, { n: 7, r: 70, color: '#8a5a40', size: 34, a: 0.35, speed: 40, life: 1.8 }); V.motes(c.x, c.y, { color: '#ff8a3a', n: 8, r: 90, rise: 0.5, life: 1.4 }); }); },
      // a blood-red rune circle that stays under the reaver, a red dome flaring up, shadows rising
      undying: c => { V.ink(c.x, c.y, { r: 60, dur: 8, follow: c.ent, a: 0.3 }); V.sigil(c.x, c.y, { r: 60, style: 'runes', color: '#c01a2a', dur: 8, spin: -0.8, follow: c.ent }); V.aura(c.ent, { color: '#8a0010', style: 'shadow', dur: 8, r: 30, rate: 0.3 });
        V.dome(c.ent, { color: '#ff2a3a', r: 44, dur: 1.4 }); c.later(1.2, () => V.motes(c.ent.x, c.ent.y, { color: '#ff2a3a', n: 8, r: 30 })); },
      // Berserker: a wild double swing of burning orange, the floor cracking and smoking where it lands
      rampage: c => {
        V.slash(c.x, c.y, c.ang + 0.3, { r: 80, span: 2.8, color: '#ff7a2a', w: 0.7, dur: 0.34 });
        c.later(0.1, () => V.slash(c.x, c.y, c.ang - 0.3, { r: 84, span: 2.8, color: '#ffb050', w: 0.6, dur: 0.34, flip: true }));
        c.later(0.16, () => { V.flare(c.tx, c.ty, { n: 16, r: 18, color: '#ff5a1a' }); V.hit(c.tx, c.ty, '#ffb060', 1.2); V.decal(c.tx, c.ty, { style: 'crack', r: 50, dur: 2.5, a: 0.6, seed: Math.random() * 6 }); V.decal(c.tx, c.ty, { r: 36, embers: true, dur: 2 }); FX.shake = Math.max(FX.shake, 4); });
      },
      // Hemomancer: a spear of liquid blood, droplets trailing, a splash where it strikes
      lance: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#ff2d4b', speed: 1000, onHit: (x, y) => { V.splash(x, y, { n: 12, speed: 1.2 }); V.hit(x, y, '#ff5a6a', 0.9); V.spawn({ x, y, z: 16, life: 0.3, size: 54, size1: 18, color: '#c0204a', kind: 'star', vr: 6 }); } }),
    },
    runeguard: {
      strike: c => c.later(0.06, () => { V.hit(c.tx, c.ty, '#b18cff', 0.75); V.sigil(c.tx, c.ty, { r: 26, style: 'runes', color: '#c8a8ff', dur: 0.4, spin: 6 }); }),
      // a rune circle turns under the guard, the hex ward closes over, rune sparks scatter
      ward: c => { const w = c.tent || c.ent; V.sigil(w.x, w.y, { r: 40, style: 'runes', color: '#b18cff', dur: 0.7, spin: 4, follow: w }); V.shield(w, { shape: 'hex', color: '#a88cff', dur: 8, r: 40 }); V.burst(w.x, w.y - 20, { color: '#d8c4ff', n: 8, speed: 140, kind: 'star', flash: false }); },
      // a glyph spins up on the target, then rune crystals erupt in a violet starburst and leave the floor cracked
      glyph: c => { V.ink(c.tx, c.ty, { r: 64, dur: 0.5 }); V.sigil(c.tx, c.ty, { r: 64, style: 'runes', color: '#9a6bff', dur: 0.5, spin: 8 });
        c.later(0.4, () => { V.crystals(c.tx, c.ty, { color: '#b28cff', n: 7, r: 46, h: 58 }); V.spikeburst(c.tx, c.ty, { r: 50, n: 12, color: '#9a6bff', core: '#f0e8ff', ink: '#1e0e3a', dur: 0.32 }); V.decal(c.tx, c.ty, { style: 'crack', r: 50, dur: 1.8, a: 0.55, seed: Math.random() * 6 }); shake(3); }); },
      // runes spiral in, a rune circle, crackling bolts, a violet burst; motes drift off afterwards
      overload: c => { V.charge(c.x, c.y, { color: '#c8a8ff', r: 50, n: 10, dur: 0.3, follow: c.ent }); V.aura(c.ent, { color: '#a070ff', style: 'runes', dur: 15, r: 32, rate: 0.2 }); V.ink(c.x, c.y, { r: 70, dur: 1.2 }); V.sigil(c.x, c.y, { r: 70, style: 'runes', color: '#a070ff', dur: 1.2, spin: 3 });
        for (let i = 0; i < 4; i++) c.later(i * 0.12, () => { const a = Math.random() * Math.PI * 2; V.lightning(c.ent.x, c.ent.y, c.ent.x + Math.cos(a) * 60, c.ent.y + Math.sin(a) * 40, { color: '#d0b8ff', jag: 10 }); });
        c.later(0.3, () => V.spikeburst(c.ent.x, c.ent.y, { r: 46, n: 12, color: '#a070ff', core: '#f0e8ff', ink: '#1e0e3a', dur: 0.32, z: 20 })); c.later(1, () => V.motes(c.ent.x, c.ent.y, { color: '#c8a8ff', n: 8, r: 34 })); },
      // a great rune circle, a pillar of light, and a ring of rune stones bursting up round its edge
      sanctum: c => { V.glint(c.x, c.y, { color: '#e0d4ff', size: 30, z: 40 }); V.ink(c.x, c.y, { r: 150, dur: 3 }); V.sigil(c.x, c.y, { r: 150, style: 'runes', color: '#9f7aff', dur: 3, spin: 0.5 }); V.pillar(c.x, c.y, { r: 50, h: 160, color: '#b8a0ff', dur: 1.2 });
        c.later(0.15, () => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; V.crystals(c.x + Math.cos(a) * 140, c.y + Math.sin(a) * 109, { color: '#b8a0ff', n: 3, r: 14, h: 40, dur: 2.2 }); } }); },
      // a glint on the mirror, a crystal plane in front, shards falling away
      mirror: c => { const fx = c.x + Math.cos(c.ang) * 30, fy = c.y + Math.sin(c.ang) * 30; V.glint(fx, fy, { color: '#ffffff', size: 30 }); V.shield(c.ent, { shape: 'front', color: '#e0d4ff', dur: 3, r: 44 }); V.crystals(fx, fy, { color: '#e8e0ff', n: 5, r: 18, h: 40, dur: 0.6 }); },
      // Runeblade: a rune-etched sword cut with a lavender trail (Carve, the second hit, cuts wider)
      cut: c => { const carve = Math.random() < 0.5; V.slash(c.x, c.y, c.ang, { r: carve ? 64 : 54, span: carve ? 2.2 : 1.6, color: '#c58cff', w: 0.5, dur: 0.24, flip: carve });
        c.later(0.07, () => { V.hit(c.tx, c.ty, '#e0c8ff', 0.7); V.sigil(c.tx, c.ty, { r: 22, style: 'runes', color: '#d8b8ff', dur: 0.35, spin: 8 }); }); },
      // Rune Cleave: a wide sweep that leaves a burning rune hanging in the air
      cleave: c => {
        V.slash(c.x, c.y, c.ang, { r: 76, span: 2.8, color: '#e0b8ff', w: 0.65, dur: 0.32 });
        c.later(0.12, () => { V.sigil(c.tx, c.ty - 30, { r: 34, style: 'runes', color: '#b070ff', dur: 1.6, spin: 1.5, flat: 1, layer: 'air' }); V.burst(c.tx, c.ty - 20, { color: '#d8c4ff', n: 14, speed: 220 });
          for (let i = 0; i < 8; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 40, y: c.ty, z: 20, vz: 40 + Math.random() * 50, life: 1.2, size: 7, size1: 0, color: '#c58cff' }); FX.shake = Math.max(FX.shake, 3); });
      },
    },
    ranger: {
      // a glint on the bow, the arrow, a puff of dust where it bites
      quick: c => { const b = ahead(c, 16); V.glint(b.x, b.y, { color: '#e8ffb0', size: 16 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#bfff9a', speed: 1300, onHit: (x, y) => { V.hit(x, y, '#d8ffc0', 0.4); V.smoke(x, y, { n: 2, color: '#c8b898', size: 14, a: 0.5, speed: 40, life: 0.6 }); } }); },
      // a golden glint on the drawn bow, the arrow wrapped in spirals, a little whirlwind where it lands
      pierce: c => { const b = ahead(c, 18); V.glint(b.x, b.y, { color: '#ffe27a', size: 30 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'helix', color: '#7dffb0', speed: 1500, size: 1.2, onHit: (x, y) => { V.hit(x, y, '#b0ffd0', 0.9); V.tornado(x, y, { color: '#e8f4ff', h: 70, r: 22, dur: 0.6 }); V.smoke(x, y, { n: 3, color: '#d8d0c0', size: 18, a: 0.45, speed: 50 }); } }); },
      // a target ring, a volley dropping in, and the arrows left standing in the ground
      rapid: c => V.volley(c.tx, c.ty, { n: 10, r: 52, color: '#bfff9a', wind: 0.18, stay: 1.8 }),
      // a hunter's reticle on the boss with golden starbursts popping round it
      mark: c => { V.ink(c.tx, c.ty, { r: 70, dur: 1.4 }); V.sigil(c.tx, c.ty, { r: 70, style: 'star4', color: '#ff9d3d', dur: 1.4, spin: 2 });
        for (let i = 0; i < 4; i++) c.later(0.2 + i * 0.08, () => { const a = i * Math.PI / 2 + 0.6; V.spikeburst(c.tx + Math.cos(a) * 34, c.ty + Math.sin(a) * 20, { r: 22, n: 8, color: '#ffb040', core: '#fffbe0', ink: '#4a2a08', dur: 0.3, z: 30 }); });
        c.later(0.3, () => V.burst(c.tx, c.ty - 40, { color: '#ffb060', n: 8, speed: 120, flash: false })); },
      // a leafy dome over the ranger, leaves whirling out, and leaves drifting down after
      cloak: c => { V.dome(c.ent, { color: '#8fdf7a', r: 50, dur: 1.8 }); for (let i = 0; i < 12; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 20, life: 1.2, size: 12, color: '#5fbf4a', kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.52, r: 20, w: 5, dr: 90, flat: 0.6 } });
        V.shock(c.x, c.y, { r: 120, color: '#8fdf7a', dur: 0.6 }); c.later(1.6, () => V.motes(c.ent.x, c.ent.y, { kind: 'leaf', color: '#6fbf5a', n: 8, r: 50, rise: 0.4 })); },
      // a glint, power spiralling into the bow over a small circle, then the aura
      barrage: c => { V.glint(c.x, c.y, { color: '#ffe27a', size: 30, z: 30 }); V.charge(c.ent.x, c.ent.y, { color: '#d8ff9a', r: 50, follow: c.ent }); V.sigil(c.x, c.y, { r: 40, style: 'star4', color: '#c8ff7a', dur: 0.8, spin: 4, follow: c.ent }); V.aura(c.ent, { color: '#c8ff7a', dur: 2, r: 28, rate: 0.4 }); },
    },
    shadowblade: {
      // two daggers cross in an X (violet and steel), a few red sparks and drops
      strike: c => { const f = Math.random() < 0.5; V.slash(c.x, c.y, c.ang + 0.25, { r: 44, span: 1.3, color: '#c58aff', dur: 0.2, flip: f, sparks: 3 }); c.later(0.04, () => V.slash(c.x, c.y, c.ang - 0.25, { r: 44, span: 1.3, color: '#e8e0ff', dur: 0.2, w: 0.35, flip: !f, sparks: 2 }));
        c.later(0.08, () => { V.hit(c.tx, c.ty, '#e0c0ff', 0.4); V.splash(c.tx, c.ty, { n: 2, size: 0.6 }); }); },
      // a double cut, then a crimson starburst, a spray of blood and a splatter left on the floor
      evis: c => { V.slash(c.x, c.y, c.ang + 0.5, { r: 58, span: 1.7, color: '#ff4d9a', dur: 0.28 }); c.later(0.08, () => V.slash(c.x, c.y, c.ang - 0.5, { r: 58, span: 1.7, color: '#ff4d9a', dur: 0.28, flip: true }));
        c.later(0.16, () => { const m = between(c, 0.6); V.spikeburst(c.tx, c.ty, { r: 54, n: 12, color: '#d0204a', core: '#ffe0ec', ink: '#2a0410', dur: 0.36 }); V.splash(c.tx, c.ty, { n: 10, speed: 1.2 }); V.hit(c.tx, c.ty, '#ff9ad0', 0.8);
          V.puddle(m.x, m.y, { r: 20, color: '#a01028', dark: '#3a0610', dur: 1.6, bubbles: false, fumes: false }); }); },
      // a dark smear slipping round the target, purple smoke hanging where you land
      step: c => { const d = Math.hypot(c.x - c.tx, c.y - c.ty) || 1; V.shadowdash(c.tx - (c.x - c.tx) / d * 60, c.ty - (c.y - c.ty) / d * 60, c.x, c.y); V.swirl(c.x, c.y, { r: 36, color: '#b070ff', dur: 0.4, inward: true });
        c.later(0.2, () => V.smoke(c.x, c.y, { n: 5, color: '#5a3a7a', size: 24, a: 0.65, speed: 45, life: 1.3 })); },
      // two dagger glints, a whirl of blades round the rogue, scratch marks left glinting, then the shadow aura
      dance: c => { V.glint(c.x - 14, c.y, { color: '#e8e0ff', size: 20, z: 34 }); V.glint(c.x + 14, c.y, { color: '#e8e0ff', size: 20, z: 34 }); c.later(0.08, () => V.vortex(c.x, c.y, { r: 72, color: '#9a4dff', dur: 0.9, follow: c.ent }));
        V.aura(c.ent, { color: '#b04dff', style: 'shadow', dur: 10, r: 30, rate: 0.25 }); },
      // a dripping green cut, and a poison puddle bubbling at the target's feet
      venom: c => { V.slash(c.x, c.y, c.ang, { r: 48, span: 1.6, color: '#8aff4a', dur: 0.24 }); c.later(0.08, () => { const m = between(c, 0.6); V.splash(c.tx, c.ty, { color: '#7adf3a', n: 6 }); V.puddle(m.x, m.y, { r: 26, color: '#7adf3a', dark: '#1e3a0a', dur: 2.6 }); }); },
      // a little bomb tossed down, a pop, and a big cartoon cloud that hangs over the party, then drifts apart
      smoke: c => V.smokebomb(c.x, c.y, { r: 62, color: '#8a7a9a', dur: 1.8, a: 0.6,   // kept small and see-through: it sits over the floor, where telegraphs are
        sx: c.x + Math.cos(c.ang) * 10, sy: c.y - 6 }),
    },
    pyromancer: {
      // a flame flickers in the hand, the fireball streaks over, and pops in a small spiky burst
      fireball: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffb040', size: 18, z: 24 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8c2a', speed: 700, arc: 16, onHit: (x, y) => { V.spikeburst(x, y, { r: 30, n: 10, color: '#ff8a2a', dur: 0.26 }); V.flare(x, y, { n: 6, r: 10, size: 0.8 }); V.smoke(x, y, { n: 2, color: '#4a3a3a', size: 18, a: 0.4, speed: 30 }); } }); },
      // heat gathers at the hand, a burning rock arcs over, a big starburst, flying rocks and a smoking scorch
      pyro: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffd070', size: 30, z: 26 }); V.charge(c.x, c.y, { color: '#ff8a3a', r: 40, n: 8, dur: 0.25 });
        V.missile(c.x, c.y, c.tx, c.ty, { style: 'meteor', color: '#ff5a1a', speed: 560, arc: 50, onHit: (x, y) => { V.spikeburst(x, y, { r: 70, n: 16, color: '#ff6a1a', dur: 0.42 }); V.flare(x, y, { n: 16, r: 22, size: 1.2, h: 1.2 }); V.shock(x, y, { r: 110, color: '#ff8a3a', dur: 0.5, w: 7 });
          V.burst(x, y, { color: '#ffd070', n: 8, speed: 280, flashR: 70 }); V.debris(x, y, { n: 6, hot: true, color: '#4a3226' }); V.decal(x, y, { r: 46, embers: true, dur: 3 }); V.smoke(x, y, { n: 5, r: 30, color: '#5a4a48', size: 30, a: 0.45, speed: 55, life: 1.6 }); shake(6); } }); },
      // a spark at the fingertips, then a fat starburst on the boss that leaves a cloud of grey smoke
      fireblast: c => { const h = ahead(c, 18); V.glint(h.x, h.y, { color: '#ffb040', size: 24 }); c.later(0.06, () => { V.spikeburst(c.tx, c.ty, { r: 58, n: 14, color: '#ff8a1a', dur: 0.34 }); V.flash(c.tx, c.ty - 14, 60, '#ffb050', 0.2); V.sparks(c.tx, c.ty, { color: '#ffd070', n: 8, speed: 380 }); });
        c.later(0.22, () => V.smoke(c.tx, c.ty, { n: 6, r: 26, color: '#5a5050', size: 28, a: 0.5, speed: 55, life: 1.5 })); },
      // heat spirals in, then a fire spiral wraps the mage and flies apart into embers; the flame aura stays on
      combust: c => { V.charge(c.x, c.y, { color: '#ffb040', r: 50, n: 10, dur: 0.3, follow: c.ent }); V.sigil(c.x, c.y, { r: 66, style: 'star5', color: '#ff7a1a', dur: 1.2, spin: 2.5 }); V.blaze(c.ent, { r: 50, dur: 1.6 }); V.aura(c.ent, { color: '#ff6a1a', style: 'flame', dur: 10, r: 30, rate: 0.3 }); },
      // a meteor called down on a rune circle: a cracked, burning crater is left behind
      vent: c => V.meteor(c.tx, c.ty, { r: 64, wind: 0.32, fall: 0.28, onHit: () => shake(7) }),
      // a cone of fire breathed at the boss, then embers, scorch and a smoky haze over the party
      smolder: c => { const L = Math.min(240, Math.max(120, Math.hypot(c.tx - c.x, c.ty - c.y))); V.breath(c.x, c.y, Math.atan2(c.ty - c.y, c.tx - c.x), { len: L, span: 0.75 }); V.shock(c.x, c.y, { r: 130, color: '#ff8a5a', dur: 0.6 });
        c.later(0.7, () => V.smoke(c.x, c.y, { n: 6, r: 60, color: '#5a3a4a', size: 34, speed: 40, a: 0.35, life: 1.8 })); },
    },
    cleric: {
      smite: c => {
        V.beam(c.tx, c.ty - 260, c.tx, c.ty, { color: '#fff0a8', w: 9, dur: 0.35 }); c.later(0.05, () => { V.burst(c.tx, c.ty, { color: '#fff4c0', n: 8, speed: 160 }); V.shock(c.tx, c.ty, { r: 40, color: '#ffe680', dur: 0.3, w: 3 }); });
        // Inquisitor: the strike leaves a burning brand on the boss
        if (c.ent.spec === 'inquisitor') c.later(0.1, () => { V.sigil(c.tx, c.ty, { r: 36, style: 'star4', color: '#ff9a3c', dur: 1.2, spin: 2 }); V.flare(c.tx, c.ty, { n: 6, r: 10, color: '#ff8a2a', size: 0.7 }); });
      },
      // Aegis: holy light falls on the ally and hardens into a golden dome
      barrier: c => { V.lightfall(c.tx, c.ty, { color: '#ffe9a8', r: 30, h: 220, dur: 0.9, feathers: 5 }); const w = c.tent || c.ent; c.later(0.25, () => V.dome(w, { color: '#ffd86a', r: 52, dur: 2.6 })); },
      // Inquisitor: a lance of holy fire that scorches a brand into the boss
      condemn: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ffb04a', speed: 1100, size: 1.2, onHit: (x, y) => {
        V.flare(x, y, { n: 18, r: 16, color: '#ff9a3c' }); V.sigil(x, y, { r: 54, style: 'star4', color: '#ff9a3c', dur: 1.6, spin: 1.5 }); V.shock(x, y, { r: 90, color: '#ffc070', dur: 0.4, w: 5 });
        V.burst(x, y, { color: '#ffe0a0', color2: '#ffffff', n: 14, speed: 260, flashR: 60 }); V.decal(x, y, { r: 40, embers: true, dur: 3 }); FX.shake = Math.max(FX.shake, 4); } }),
      // holy light falls on the ally in shafts, a few feathers drift down, a golden ring lingers
      mend: c => { V.lightfall(c.tx, c.ty, { color: '#ffe680', r: 26, h: 200, dur: 0.9, feathers: 3 }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 3 }); },
      // a glint, petals whirling round the ally, then a few drifting down after
      petal: c => { V.glint(c.tx, c.ty, { color: '#ffe9a8', size: 22, z: 34 }); for (let i = 0; i < 10; i++) V.spawn({ x: c.tx, y: c.ty, z: 8 + i * 3, life: 1, size: 12, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 5, flutter: 6, orbit: { x: c.tx, y: c.ty, a: i * 0.63, r: 30, w: 4, dr: -20, flat: 0.55 } }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 3 });
        c.later(0.9, () => { for (let i = 0; i < 4; i++) V.spawn({ x: c.tx + (Math.random() - 0.5) * 50, y: c.ty + (Math.random() - 0.5) * 16, z: 40 + Math.random() * 20, vz: -25, vx: (Math.random() - 0.5) * 30, life: 1.4, size: 10, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 2, flutter: 4 }); });
        if (c.ent.spec === 'aegis' && c.tent) c.later(0.3, () => V.shield(c.tent, { color: '#ffe9a8', dur: 1.4, r: 38 })); },
      // a great holy circle on the floor, light and feathers falling into its middle
      prayer: c => { V.ink(c.x, c.y, { r: 160, dur: 3 }); V.sigil(c.x, c.y, { r: 160, style: 'hex', color: '#ffe680', dur: 3, spin: 0.4 }); V.lightfall(c.x, c.y, { color: '#fff0b0', r: 50, h: 260, dur: 1.4, feathers: 8 }); c.later(0.3, () => V.shock(c.x, c.y, { r: 170, color: '#ffe680', dur: 0.6, w: 5 })); },
      // a towering column of light and feathers, a holy seal under the ally, a white burst as they rise
      intervene: c => { V.lightfall(c.tx, c.ty, { color: '#fff6c8', r: 44, h: 340, dur: 1.8, feathers: 10 }); V.pillar(c.tx, c.ty, { r: 40, h: 320, color: '#fff6c8', dur: 1.6 });
        c.later(0.2, () => { V.ink(c.tx, c.ty, { r: 70, dur: 1.6 }); V.sigil(c.tx, c.ty, { r: 70, style: 'star4', color: '#ffe680', dur: 1.6, spin: 1 }); V.burst(c.tx, c.ty - 40, { color: '#ffffff', color2: '#ffe680', n: 14, speed: 200, flashR: 80 }); }); },
      // light falls on the ally, then a golden bubble, a burst of stars and rising crosses
      bene: c => { V.lightfall(c.tx, c.ty, { color: '#ffe680', r: 30, h: 240, dur: 0.8, feathers: 4 });
        c.later(0.15, () => { if (c.tent) V.shield(c.tent, { color: '#ffe680', dur: 1.6, r: 40 }); V.burst(c.tx, c.ty - 10, { color: '#fff0a8', color2: '#ffffff', n: 12, speed: 220, kind: 'star' }); V.shock(c.tx, c.ty, { r: 70, color: '#ffe680', dur: 0.4 }); V.plus(c.tx, c.ty, { color: '#ffe680', n: 5 }); }); },
    },
    grovekeeper: {
      // a green glint, then a small cluster of thorny crystals
      wrath: c => { V.glint(c.tx, c.ty, { color: '#c8ff8a', size: 18, z: 12 }); c.later(0.05, () => V.crystals(c.tx, c.ty, { color: '#6aff4a', n: 5, r: 28, h: 42, dur: 0.6 })); },
      // a little swirling flower circle under the ally, leaves whirling round them
      rejuv: c => { V.grove(c.tx, c.ty, { r: 32, dur: 1.5, color: '#8fff7a', color2: '#ffd0e8', flowers: 3, follow: c.tent, rate: 0.2 }); for (let i = 0; i < 6; i++) V.spawn({ x: c.tx, y: c.ty, z: 6 + i * 3, life: 1.1, size: 11, color: '#8fff7a', kind: 'leaf', add: false, vr: 5, orbit: { x: c.tx, y: c.ty, a: i * 1.05, r: 26, w: 4.5, dr: 4, flat: 0.55 } }); V.plus(c.tx, c.ty, { color: '#7dff8a', n: 2 }); },
      // brambles burst out of the floor, sap splashes, leaves flutter, the ground is left cracked
      thorn: c => { V.glint(c.tx, c.ty, { color: '#c8ff8a', size: 20, z: 10 }); c.later(0.06, () => { const m = between(c, 0.7); V.crystals(c.tx, c.ty, { color: '#5a8a2a', n: 6, r: 36, h: 40, dur: 1 }); V.splash(c.tx, c.ty, { color: '#4a7a2a', n: 4, size: 0.8 });
        V.motes(c.tx, c.ty, { kind: 'leaf', color: '#6fbf4a', n: 4, r: 30, rise: 0.5 }); V.decal(m.x, m.y, { style: 'crack', r: 34, dur: 1.6, a: 0.45, seed: Math.random() * 6 }); }); },
      // a great vine-and-flower circle grows across the floor, leaves whirling out from the druid
      growth: c => { V.grove(c.x, c.y, { r: 170, dur: 3, color: '#7ee06a', color2: '#ffe0a0', flowers: 8, rate: 0.4, tint: '#1a3a10' }); for (let i = 0; i < 14; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 20, life: 1.4, size: 13, color: i % 2 ? '#8fff7a' : '#c8ff8a', kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.45, r: 10, w: 3, dr: 130, flat: 0.6 } }); V.plus(c.x, c.y, { n: 6 }); },
      // a flower circle snaps open and throws out a burst of petals that flutter down
      bloom: c => { V.sigil(c.x, c.y, { r: 60, style: 'petals', color: '#c8ff8a', dur: 0.9, spin: 3 }); V.flash(c.x, c.y - 20, 70, '#d8ffb0', 0.25); V.shock(c.x, c.y, { r: 140, color: '#a8ff9a', dur: 0.5 });
        for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14, sp = 120 + Math.random() * 120; V.spawn({ x: c.x, y: c.y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 80 + Math.random() * 120, g: 160, drag: 0.05, life: 1.3, size: 12, color: i % 3 ? '#ffd0e8' : '#fff0a8', kind: 'petal', add: false, vr: 6, flutter: 6, fadeIn: 0.02 }); }
        V.burst(c.x, c.y - 10, { color: '#d8ffb0', color2: '#fff0a8', n: 8, speed: 200, kind: 'star', flash: false }); },
      // a shaft of green light, a flower circle under the ally, a swirl, and leaves drifting off as they rise
      rebirth: c => { V.lightfall(c.tx, c.ty, { color: '#a8ff9a', r: 40, h: 280, dur: 1.6, feathers: 0 }); V.grove(c.tx, c.ty, { r: 60, dur: 2.2, color: '#8fff7a', color2: '#ffd0e8', flowers: 5, rate: 0.4, tint: '#1a3a10' }); V.swirl(c.tx, c.ty, { r: 50, color: '#8fff7a', dur: 1.4 });
        c.later(1.4, () => V.motes(c.tx, c.ty, { kind: 'leaf', color: '#8fff7a', n: 10, r: 40 })); },
      // Lifebinder: a small blooming circle under the ally, vines curling, flowers opening
      lifebind: c => { V.grove(c.tx, c.ty, { r: 44, dur: 1.8, color: '#6fffb0', color2: '#ffd0e8', flowers: 4, follow: c.tent, rate: 0.5 }); V.plus(c.tx, c.ty, { color: '#7dff9a', n: 3 }); },
      // Moonwell: a pool of moonlight on the floor where the ally stood, for its whole 12s
      moonwell: c => { V.lightfall(c.tx, c.ty, { color: '#c8d8ff', r: 50, h: 300, dur: 0.8, feathers: 0 }); V.grove(c.tx, c.ty, { r: 150, dur: 12, color: '#a9c4ff', color2: '#eef2ff', moon: true, flowers: 8, mist: '#c8d4ff', rate: 0.5, tint: '#1c2a66' }); V.shock(c.tx, c.ty, { r: 160, color: '#c8d8ff', dur: 0.5, w: 5 }); },
    },
    chronomancer: {
      bolt: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#a0f8ff', size: 18 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#5ff0ff', speed: 900, onHit: (x, y) => { V.hit(x, y, '#a0f8ff', 0.7); V.spawn({ x, y, z: 14, life: 0.3, size: 50, size1: 20, color: '#5ff0ff', kind: 'star', vr: -5 }); } }); },
      // a clock face under the ally, song ribbons winding backwards and in, a burst as the moment snaps back
      rewind: c => { V.ink(c.tx, c.ty, { r: 50, dur: 1 }); V.sigil(c.tx, c.ty, { r: 50, style: 'clock', color: '#c8fbff', dur: 1, spin: -6 }); V.ribbons(c.tx, c.ty, { r: 46, dur: 0.9, dir: -1, follow: c.tent, colors: ['#5ff0ff', '#b48cff', '#ffd27a'] });
        c.later(0.6, () => V.burst(c.tx, c.ty - 16, { color: '#e0ffff', n: 10, speed: 180 })); },
      shift: c => { V.glint(c.x, c.y, { color: '#9ff4ff', size: 22, z: 30 }); V.sigil(c.x, c.y, { r: 44, style: 'gears', color: '#3fd0d0', dur: 0.7, spin: 5, follow: c.ent }); V.motes(c.x, c.y, { color: '#9ff4ff', n: 5, r: 26 }); },
      // a great clock on the floor, song ribbons sweeping round the party, streaks of speed shooting up
      accel: c => { V.ink(c.x, c.y, { r: 160, dur: 2.2 }); V.sigil(c.x, c.y, { r: 160, style: 'clock', color: '#3fd0d0', dur: 2.2, spin: 3 }); V.ribbons(c.x, c.y, { r: 100, dur: 1.6, n: 4, colors: ['#5ff0d0', '#b48cff', '#ffd27a', '#5ff0ff'] });
        for (let i = 0; i < 12; i++) V.spawn({ x: c.x + (Math.random() - 0.5) * 220, y: c.y + (Math.random() - 0.5) * 140, z: 0, vz: 260 + Math.random() * 120, life: 0.6, size: 9, color: '#9ff4ff', stretch: 5 }); },
      // a ring of frozen light, crystals round the party under a pale dome, a hex seal on the floor
      stasis: c => { V.shock(c.x, c.y, { r: 180, color: '#c8fbff', dur: 0.7, w: 9 }); V.ink(c.x, c.y, { r: 120, dur: 2 }); V.sigil(c.x, c.y, { r: 120, style: 'hex', color: '#9ff4ff', dur: 2, spin: 0 }); V.dome(c.ent, { color: '#9ff4ff', r: 60, dur: 2 }); V.crystals(c.x, c.y, { color: '#c8f4ff', n: 10, r: 110, h: 50, dur: 2 }); },
      // a shaft of time-light on the ally, ribbons winding round them, a swirl at their feet
      recall: c => { V.lightfall(c.tx, c.ty, { color: '#9ff4ff', r: 34, h: 260, dur: 1.4, feathers: 0 }); V.ribbons(c.tx, c.ty, { r: 50, dur: 1.6, follow: c.tent, colors: ['#5ff0ff', '#b48cff', '#ffd27a'] }); V.swirl(c.tx, c.ty, { r: 56, color: '#5ff0ff', dur: 1.6, arms: 5 }); },
      // Echoist: the clock face rings out three times, each ring a softer echo of the last
      chamber: c => { V.sigil(c.x, c.y, { r: 160, style: 'clock', color: '#c4a8ff', dur: 2.2, spin: 2 }); for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 150 + i * 30, color: '#d8c8ff', dur: 0.6, w: 6 - i * 1.5, delay: i * 0.35 }); V.burst(c.x, c.y - 20, { color: '#e8dcff', n: 12, speed: 180, kind: 'star' }); },
    },
  };
})();

// Class-specific moments (perfect block, overheat...) and the shared dash.
const KIT_VFX = {
  // an item enhancement firing: a quick golden flare in the hero's colour
  empower: e => { VFX.flash(e.x, e.y - 20, 40, '#ffd27a', 0.25); VFX.motes(e.x, e.y, { color: (e.cls && e.cls.accent) || '#ffd27a', n: 6, r: 22, kind: 'star' }); VFX.shock(e.x, e.y, { r: 46, color: '#ffd27a', w: 3, dur: 0.3 }); },
  perfect: e => { VFX.shock(e.x, e.y, { r: 90, color: '#ffe27a', dur: 0.4, w: 7 }); VFX.spawn({ x: e.x + Math.cos(e.angle) * 30, y: e.y + Math.sin(e.angle) * 30, z: 18, life: 0.3, size: 80, size1: 30, color: '#ffe27a', kind: 'star', vr: 5 }); VFX.sparks(e.x + Math.cos(e.angle) * 30, e.y + Math.sin(e.angle) * 30, { color: '#fff2b0', n: 12, angle: e.angle, spread: 1, speed: 420 }); FX.shake = Math.max(FX.shake, 4); },
  // Crusader: a Radiant Holy Edge leaves as a beam of light toward the boss
  radiant: (e, target) => { const t = target || { x: e.x + Math.cos(e.angle) * 200, y: e.y + Math.sin(e.angle) * 200 }; VFX.beam(e.x, e.y, t.x, t.y, { color: '#fff2b0', w: 14, dur: 0.4 }); VFX.burst(e.x, e.y, { color: '#ffe27a', color2: '#ffffff', n: 14, speed: 240, kind: 'star' }); },
  'rune-echo': e => { VFX.crystals(e.x, e.y, { color: '#b28cff', n: 8, r: 44, h: 50 }); VFX.burst(e.x, e.y, { color: '#d8c4ff', n: 14, speed: 240 }); },
  reflect: (e, target) => { if (target) VFX.beam(e.x, e.y, target.x, target.y, { color: '#e8e0ff', w: 12, dur: 0.4 }); VFX.burst(e.x, e.y, { color: '#ffffff', color2: '#e0d4ff', n: 16, speed: 260, kind: 'star' }); },
  overheat: e => { VFX.flare(e.x, e.y, { n: 24, color: '#ff2a1a', r: 18 }); VFX.shock(e.x, e.y, { r: 90, color: '#ff3a1a', dur: 0.4 }); },
  dawnstar: (e, target) => { const t = target || e; VFX.beam(t.x, t.y - 300, t.x, t.y, { color: '#fff6c8', w: 18, dur: 0.5 }); VFX.burst(t.x, t.y, { color: '#ffe680', color2: '#ffffff', n: 26, speed: 320, kind: 'star', flashR: 110 }); VFX.sigil(t.x, t.y, { r: 90, style: 'star4', color: '#ffe680', dur: 0.9, spin: 4 }); FX.shake = Math.max(FX.shake, 5); },
  lag: e => { VFX.smoke(e.x, e.y, { n: 6, color: '#8aa0a8', size: 22, a: 0.5 }); },
  // Aegis: a Petal shield that held comes back as a petal drifting home
  'petal-back': e => { for (let i = 0; i < 6; i++) VFX.spawn({ x: e.x, y: e.y, z: 30 + i * 4, life: 0.9, size: 12, color: i % 2 ? '#ffd0e0' : '#fff0a8', kind: 'petal', add: false, vr: 5, flutter: 6, orbit: { x: e.x, y: e.y, a: i, r: 40, w: 5, dr: -40, flat: 0.55 } }); VFX.flash(e.x, e.y - 20, 30, '#ffe9a8', 0.25); },
  // Echoist: a fainter copy of the Bolt, three seconds late
  echo: (e, target) => { if (target) VFX.missile(e.x, e.y, target.x, target.y, { style: 'orb', color: '#c4a8ff', speed: 800, size: 0.75, onHit: (x, y) => VFX.hit(x, y, '#e0d4ff', 0.6) }); },
  // Inquisitor: an ally's hit bursts a charge of the brand on the boss
  brandHit: (e, target) => { if (target) { VFX.flare(target.x, target.y, { n: 5, r: 12, color: '#ff9a3c', size: 0.6, h: 0.7 }); VFX.hit(target.x, target.y, '#ffc070', 0.5); } },
  dash: (e, color) => { VFX.smoke(e.x, e.y, { n: 4, color: '#d8ccb8', size: 18, a: 0.6, speed: 40 }); VFX.shock(e.x, e.y, { r: 36, color: color || '#ffffff', dur: 0.3, w: 3 }); },
  // the tanks' taunts, one per class (TAUNT in kits.js), built from each class's own look:
  //   Bastion's Challenge: steel on the shield, gold rings of sound and a line of gold light that lands as a star
  //   Bloodreaver's Reaver's Hook: a red chain thrown out to the target, a hook-bite of blood, then it snaps back
  //   Runeguard's Binding Rune: a lilac rune stamped on the target, its light running back to the warder
  taunt: (e, target) => {
    const id = e.cls && e.cls.id, col = (e.cls && e.cls.accent) || '#ffd27a';
    const sx = e.x, sy = e.y - 18, tx = target ? target.x : e.x, ty = target ? target.y - 26 : e.y;
    const L = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx);
    if (id === 'bloodreaver') {
      VFX.shock(e.x, e.y, { r: 60, color: '#ff5a5a', w: 4, dur: 0.3 });
      if (!target || L < 10) return;
      const n = Math.max(4, Math.floor(L / 18));
      // out in 0.2s, holds, then reels back in toward the hero
      VFX.fx({ dur: 0.75, layer: 'air', draw: (c, p, t, fx) => {
        const reach = p < 0.22 ? p / 0.22 : p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5, k = (p < 0.7 ? 1 : (1 - p) / 0.3) * fx.a;
        c.save(); c.translate(sx, sy); c.rotate(ang);
        VFX.neonPath(c, '#ff3a3a', 2.2, k, () => {
          for (let i = 0; i < n * reach; i++) {
            const x = (i + 0.5) * L / n;
            if (i % 2) { c.moveTo(x - 6, 0); c.lineTo(x + 6, 0); } else { c.moveTo(x + 8, 0); c.ellipse(x, 0, 8, 4, 0, 0, Math.PI * 2); }
          }
          const hx = L * reach;   // the hook at the chain's head
          c.moveTo(hx - 4, -9); c.quadraticCurveTo(hx + 10, -6, hx + 6, 4); c.lineTo(hx - 2, 2);
        });
        c.restore();
      } });
      FX.later(0.17, () => { VFX.hit(tx, ty, '#ff4a4a', 0.8); VFX.sparks(tx, ty, { color: '#c0101a', n: 9, angle: ang + Math.PI, spread: 0.8, speed: 260 }); });
      return;
    }
    if (id === 'runeguard') {
      VFX.crystals(e.x, e.y, { color: '#b18cff', n: 5, r: 30, h: 30 });
      if (!target) return;
      VFX.lightning(sx, sy + 16, tx, ty + 16, { color: '#c8a8ff', jag: 8, dur: 0.3 });
      FX.later(0.1, () => {
        VFX.sigil(target.x, target.y, { r: 64, style: 'runes', color: '#b18cff', dur: 1.3, spin: 2 });
        VFX.sigil(target.x, target.y - 70, { r: 22, style: 'runes', color: '#e0d0ff', dur: 1, spin: -3, flat: 1, layer: 'air' });
        VFX.shock(target.x, target.y, { r: 70, color: '#b18cff', w: 3, dur: 0.35 });
      });
      return;
    }
    // Bastion (and the fallback)
    VFX.shock(e.x, e.y, { r: 72, color: '#ffe27a', w: 4, dur: 0.35 });
    VFX.shock(e.x, e.y, { r: 112, color: col, w: 2.5, dur: 0.45, delay: 0.08 });
    VFX.sparks(e.x + Math.cos(e.angle || 0) * 24, e.y + Math.sin(e.angle || 0) * 24, { color: '#fff2b0', n: 8, speed: 300 });
    if (!target || L < 10) return;
    VFX.beam(sx, sy + 14, tx, ty + 14, { color: '#ffe9a0', w: 5, dur: 0.35 });
    FX.later(0.12, () => {
      VFX.spawn({ x: tx, y: ty, z: 10, life: 0.35, size: 56, size1: 18, color: '#ffe27a', kind: 'star', vr: 4 });
      VFX.shock(tx, target.y, { r: 50, color: '#ffe27a', w: 3, dur: 0.3 });
    });
  },
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

// DPS specialization moves (kept in their own block; the class recipes above stay as they were).
(() => {
  const V = VFX;
  Object.assign(ABILITY_VFX.ranger, {
    // Sharpshooter: a glint on the string, then a golden spiralling shot and a puff of dust where it lands
    aimed: c => { V.spawn({ x: c.x + Math.cos(c.ang) * 18, y: c.y + Math.sin(c.ang) * 18, z: 20, life: 0.25, size: 34, size1: 8, color: '#fff2c0', kind: 'star', vr: 6 });
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'helix', color: '#f2d27a', speed: 1700, size: 1.3, onHit: (x, y) => { V.hit(x, y, '#fff2c0', 1.2); V.shock(x, y, { r: 70, color: '#ffe9a0', dur: 0.35, w: 5 }); V.smoke(x, y, { n: 4, color: '#d8ccb0', size: 22, a: 0.5, speed: 50 }); FX.shake = Math.max(FX.shake, 3); } }); },
    // Venomstrike: a dripping green arrow that splashes acid, which bubbles for a moment
    caustic: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#9aff4a', speed: 1400, size: 1.2, onHit: (x, y) => {
      V.splash(x, y, { color: '#7adf3a', n: 12, speed: 1.2 }); V.puddle(x, y, { r: 40, color: '#9aff4a', dark: '#1e3a0a', dur: 3 }); V.hit(x, y, '#c8ff8a', 1); V.shock(x, y, { r: 60, color: '#9aff4a', dur: 0.35, w: 4 });
      for (let i = 0; i < 10; i++) V.spawn({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 24, z: 4, vz: 20 + Math.random() * 40, life: 0.8 + Math.random() * 0.6, size: 7, size1: 12, color: '#9adf3a', kind: 'soft' }); } }),
  });
  Object.assign(ABILITY_VFX.shadowblade, {
    // Bladedancer: three silver-violet cuts all the way around, a whirl of steel, sparks flung out
    fury: c => { for (let i = 0; i < 3; i++) c.later(i * 0.06, () => V.slash(c.x, c.y, c.ang + i * 2.1, { r: 64, span: 2.4, color: i % 2 ? '#c58aff' : '#e8ecff', w: 0.5, dur: 0.26, flip: i % 2 === 1, sparks: 4 }));
      V.swirl(c.x, c.y, { r: 66, color: '#d8c0ff', dur: 0.5, arms: 4, layer: 'air' }); },
    // Nightstalker: a deep crimson thrust from behind, a red flash and a spray at the wound
    backstab: c => { V.slash(c.x, c.y, c.ang, { r: 56, span: 0.9, color: '#ff3a5a', w: 0.7, dur: 0.22 });
      c.later(0.07, () => { V.spawn({ x: c.tx, y: c.ty, z: 18, life: 0.3, size: 70, size1: 24, color: '#ff3a5a', kind: 'star', vr: 5 }); V.splash(c.tx, c.ty, { n: 10, speed: 1.2 }); V.hit(c.tx, c.ty, '#ff8a9a', 1.2); FX.shake = Math.max(FX.shake, 3); }); },
  });
  Object.assign(ABILITY_VFX.pyromancer, {
    // Cataclysm: a big rune circle marks the spot, a meteor falls onto it 1.5s later (when the damage lands) and leaves a crater that burns for the 9s burn
    meteor: c => V.meteor(c.tx, c.ty, { r: 88, color: '#ff4a2a', wind: 1.15, fall: 0.35, from: 220, onHit: (x, y) => { V.crater(x, y, { r: 62, dur: 9, color: '#ff5a1a' }); FX.shake = Math.max(FX.shake, 9); } }),
    // Sigilmancer: a ring of ember glyphs on the floor for the circle's whole life, embers rising off its rim
    circle: c => {
      const x = c.x, y = c.y, r = 95;
      V.sigil(x, y, { r, style: 'runes', color: '#ffb347', dur: 20, spin: 0.25 });
      V.shock(x, y, { r: r + 20, color: '#ffcf7a', dur: 0.5, w: 6 }); V.flare(x, y, { n: 14, r: 20, color: '#ff9a3a' });
      V.fx({ dur: 20, layer: 'ground', draw: (ctx, p, t, e) => {
        const k = Math.min(1, p / 0.05, (1 - p) / 0.05) * e.a;
        ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = 'rgba(40,16,4,1)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(x, y, r + 3, (r + 3) * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }, tick: () => { if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2; V.spawn({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.78, z: 0, vz: 40 + Math.random() * 60, life: 0.9, size: 7, size1: 0, color: Math.random() < 0.5 ? '#ffb347' : '#ffe08a' }); } } });
    },
  });
})();