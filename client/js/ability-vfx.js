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
      fireball: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffb040', size: 18, z: 24 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8c2a', speed: 700, arc: 16, onHit: (x, y) => { V.spikeburst(x, y, { r: 30, n: 10, color: '#ff8a2a', dur: 0.26 }); V.shock(x, y, { r: 46, color: '#ffa040', dur: 0.3, w: 3 }); V.flare(x, y, { n: 6, r: 10, size: 0.8 }); V.smoke(x, y, { n: 2, color: '#4a3a3a', size: 18, a: 0.4, speed: 30 }); } }); },
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
      // (Wrath, Rejuvenate, Wild Growth, Bloom and Moonwell are in the Grovekeeper block of 'ULTIMATES · healers', with
      // the helpers they share with World Tree)
      // brambles burst out of the floor, sap splashes, leaves flutter, the ground is left cracked
      thorn: c => { V.glint(c.tx, c.ty, { color: '#c8ff8a', size: 20, z: 10 }); c.later(0.06, () => { const m = between(c, 0.7); V.crystals(c.tx, c.ty, { color: '#5a8a2a', n: 6, r: 36, h: 40, dur: 1 }); V.splash(c.tx, c.ty, { color: '#4a7a2a', n: 4, size: 0.8 });
        V.motes(c.tx, c.ty, { kind: 'leaf', color: '#6fbf4a', n: 4, r: 30, rise: 0.5 }); V.decal(m.x, m.y, { style: 'crack', r: 34, dur: 1.6, a: 0.45, seed: Math.random() * 6 }); }); },
      // a shaft of green light, a flower circle under the ally, a swirl, and leaves drifting off as they rise
      rebirth: c => { V.lightfall(c.tx, c.ty, { color: '#a8ff9a', r: 40, h: 280, dur: 1.6, feathers: 0 }); V.grove(c.tx, c.ty, { r: 60, dur: 2.2, color: '#8fff7a', color2: '#ffd0e8', flowers: 5, rate: 0.4, tint: '#1a3a10' }); V.swirl(c.tx, c.ty, { r: 50, color: '#8fff7a', dur: 1.4 });
        c.later(1.4, () => V.motes(c.tx, c.ty, { kind: 'leaf', color: '#8fff7a', n: 10, r: 40 })); },
      // Lifebinder: a small blooming circle under the ally, vines curling, flowers opening
      lifebind: c => { V.grove(c.tx, c.ty, { r: 44, dur: 1.8, color: '#6fffb0', color2: '#ffd0e8', flowers: 4, follow: c.tent, rate: 0.5 }); V.plus(c.tx, c.ty, { color: '#7dff9a', n: 3 }); },
    },
    chronomancer: {
      bolt: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#a0f8ff', size: 18 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#5ff0ff', speed: 900, onHit: (x, y) => { V.hit(x, y, '#a0f8ff', 0.7); V.spawn({ x, y, z: 14, life: 0.3, size: 50, size1: 20, color: '#5ff0ff', kind: 'star', vr: -5 }); } }); },
      // (Rewind, Shift and Stasis are in the Chronomancer block of 'ULTIMATES · healers', with Time Reversal's helpers)
      // a great clock on the floor, song ribbons sweeping round the party, streaks of speed shooting up
      accel: c => { V.ink(c.x, c.y, { r: 160, dur: 2.2 }); V.sigil(c.x, c.y, { r: 160, style: 'clock', color: '#3fd0d0', dur: 2.2, spin: 3 }); V.ribbons(c.x, c.y, { r: 100, dur: 1.6, n: 4, colors: ['#5ff0d0', '#b48cff', '#ffd27a', '#5ff0ff'] });
        for (let i = 0; i < 12; i++) V.spawn({ x: c.x + (Math.random() - 0.5) * 220, y: c.y + (Math.random() - 0.5) * 140, z: 0, vz: 260 + Math.random() * 120, life: 0.6, size: 9, color: '#9ff4ff', stretch: 5 }); },
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

// ======================================================================= Alembist (classes-b)
// Glassware and liquids after the painted sheets: a small wind-up (a puff at the still, a flick of the wrist), a bold
// climax (the vial arcs over and shatters: glass, a coloured splash shaped by the recipe), and a slow aftermath (steam,
// salt glitter, a ward circle that lingers as long as it works). Each reagent puffs its colour out of the copper still.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  // the still on the hero's back (local -x), where brewing shows
  const still = e => ({ x: e.x - Math.cos(e.angle || 0) * 16, y: e.y - Math.sin(e.angle || 0) * 16 });
  const puff = (e, color, n = 3, big = 1) => {
    const s = still(e);
    for (let i = 0; i < n; i++) V.spawn({ x: s.x + rand(-4, 4), y: s.y + rand(-3, 3), z: 30, vx: rand(-15, 15), vy: rand(-10, 10), vz: rand(30, 60), drag: 0.04, life: rand(0.7, 1.1) * big,
      size: rand(10, 15) * big, size1: 26 * big, color: i ? '#e8e4dc' : color, kind: 'smoke', add: false, a: i ? 0.45 : 0.7, fadeIn: 0.05 });
    V.spawn({ x: s.x, y: s.y, z: 26, life: 0.25, size: 18 * big, size1: 4, color });
  };
  // ---- Alembist painted-sheet pieces (docs/art/vfx-reference/alembist.png): green cure, red bomb, blue shield.
  // Floor marks flare for a moment, then settle low (boss telegraphs must stay readable through them).
  const ALEM_BLUE = '#4fa8ff', ALEM_KILN = '#ff7a1a', ALEM_TAU = Math.PI * 2;
  // a floor mark's strength: fades in, flares at `peak` for its first ~0.6s, settles to `settle`, fades out at the end
  const alemMarkK = (p, t, dur, peak, settle) => Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.6) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.7));
  // cure: thin shafts of light rising out of the splash
  function alemRays(x, y, col, n, R) {
    const rays = Array.from({ length: n }, () => { const a = rand(0, ALEM_TAU), d = Math.sqrt(Math.random()) * R; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, h: rand(55, 105), w: rand(2, 4), dl: rand(0, 0.12) }; });
    V.fx({ dur: 0.6, layer: 'air', draw: (c, p, t, e) => {
      for (const r of rays) { const q = Math.max(0, Math.min(1, (t - r.dl) / 0.18)), k = e.a * (1 - p) * q; if (k < 0.02) continue;
        V.neonPath(c, col, r.w, k, () => { c.moveTo(r.x, r.y); c.lineTo(r.x, r.y - r.h * q); }); }
    } });
  }
  // cure aftermath: a ring with a healing plus in the middle and small pluses round it
  function alemCureMark(x, y, R, col, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.9, 0.35), g = easeOut(Math.min(1, t / 0.2)), RR = R * (0.7 + 0.3 * g);
      if (k < 0.02) return;
      V.neonRing(c, x, y, RR, col, 3, k, 0.78); V.neonRing(c, x, y, RR * 0.72, col, 1.4, k * 0.6, 0.78);
      const pl = (px, py, s, w) => V.neonPath(c, col, w, k, () => { c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s * 0.78); c.lineTo(px, py + s * 0.78); });
      V.glowAt(c, x, y, RR * 0.35, col, 0.35 * k); pl(x, y, RR * 0.24, 4);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; pl(x + Math.cos(a) * RR * 0.86, y + Math.sin(a) * RR * 0.86 * 0.78, 7, 1.9); }
    } });
  }
  // shield aftermath: a ring of ticks with a shield emblem in the middle (its size and life are the ward's)
  function alemShieldSeal(x, y, R, col, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.85, 0.3), g = easeOut(Math.min(1, t / 0.25)), RR = R * (0.75 + 0.25 * g);
      if (k < 0.02) return;
      V.neonRing(c, x, y, RR, col, 3, k, 0.78); V.neonRing(c, x, y, RR * 0.84, col, 1.4, k * 0.6, 0.78);
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * 0.2);
      for (let i = 0; i < 12; i++) { const a = i * ALEM_TAU / 12; V.neonPath(c, col, 1.6, k * 0.7, () => { c.moveTo(Math.cos(a) * RR * 0.86, Math.sin(a) * RR * 0.86); c.lineTo(Math.cos(a) * RR * 0.96, Math.sin(a) * RR * 0.96); }); }
      c.restore();
      const s = Math.min(34, RR * 0.28);
      V.glowAt(c, x, y, s * 1.6, col, 0.35 * k);
      V.neonPath(c, col, 3.2, k, () => { c.moveTo(x - s, y - s * 0.7); c.lineTo(x + s, y - s * 0.7); c.lineTo(x + s * 0.9, y + s * 0.05); c.quadraticCurveTo(x + s * 0.5, y + s * 0.6, x, y + s * 0.85); c.quadraticCurveTo(x - s * 0.5, y + s * 0.6, x - s * 0.9, y + s * 0.05); c.closePath(); });
    } });
  }
  // Reaction: a rune circle in the two reagents' colours, segments alternating, turning slowly
  function alemReactRune(x, y, R, colA, colB, dur) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.9, 0.3), g = easeOut(Math.min(1, t / 0.2)), RR = R * (0.6 + 0.4 * g);
      if (k < 0.02) return;
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * 0.6);
      for (let i = 0; i < 6; i++) { const a = i * ALEM_TAU / 6; V.neonPath(c, i % 2 ? colB : colA, 3, k, () => c.arc(0, 0, RR, a + 0.06, a + ALEM_TAU / 6 - 0.06)); }
      for (let i = 0; i < 6; i++) { const a = i * ALEM_TAU / 6 + 0.5, px = Math.cos(a) * RR * 0.68, py = Math.sin(a) * RR * 0.68, s = RR * 0.09;
        V.neonPath(c, i % 2 ? colA : colB, 1.9, k * 0.8, () => { c.moveTo(px - s, py + s); c.lineTo(px, py - s); c.lineTo(px + s, py + s); c.moveTo(px - s * 0.5, py); c.lineTo(px + s * 0.5, py); }); }
      V.neonPath(c, colA, 1.6, k * 0.8, () => c.arc(0, 0, RR * 0.32, 0, ALEM_TAU));
      V.neonPath(c, colB, 1.2, k * 0.7, () => { c.ellipse(0, 0, RR * 0.32, RR * 0.14, t * 1.4, 0, ALEM_TAU); });
      c.restore();
    } });
  }
  // Steam: faint white spiral arms turning in the cloud for its whole life (follows an ally under Cling)
  function alemSteamSwirl(x, y, R, dur, follow) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * alemMarkK(p, t, dur, 0.6, 0.22), cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      if (k < 0.02) return;
      for (let i = 0; i < 3; i++) V.neonPath(c, '#e8f4f4', 2.2, k, () => {
        for (let s = 0; s <= 16; s++) { const q = s / 16, a = t * 0.9 + i * ALEM_TAU / 3 + q * 3, rr = R * (0.2 + q * 0.75); const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
    } });
  }
  // Kiln Bomb wind-up: the coals under the still flare orange and spit sparks
  function alemKilnGlow(e) {
    V.fx({ dur: ALEMBIC.FLIGHT + 0.1, layer: 'air', draw: (c, p, t, f) => { const s = still(e), k = f.a * Math.sin(Math.PI * p);
      V.glowAt(c, s.x, s.y - 10, 42, ALEM_KILN, 0.85 * k); V.glowAt(c, s.x, s.y - 10, 14, '#fff0b0', k); },
    tick: () => { if (Math.random() < 0.4) { const s = still(e); V.spawn({ x: s.x + rand(-6, 6), y: s.y, z: 14, vx: rand(-20, 20), vz: rand(60, 140), g: 120, life: rand(0.3, 0.6), size: rand(3, 5), size1: 0, color: '#ffb040' }); } } });
  }
  // Kiln Bomb: a big orange kiln blast, hot shards, and a cracked crater glowing as it cools
  function alemKilnBlast(x, y) {
    V.flash(x, y - 14, 90, ALEM_KILN, 0.16);
    V.spikeburst(x, y, { r: 96, n: 20, color: '#ff6a1a', core: '#fff0b0', ink: '#3a1006', dur: 0.45 });
    V.spikeburst(x, y, { r: 54, n: 12, color: '#ffb040', core: '#ffffff', ink: '#3a1006', dur: 0.36, z: 18 });
    V.flare(x, y, { n: 18, r: 30, color: '#ff5a1a' });
    V.debris(x, y, { n: 10, hot: true, color: '#5a3a2a' });
    V.shock(x, y, { r: 140, color: '#ff9a3a', dur: 0.5, w: 7 });
    V.crater(x, y, { r: 80, color: ALEM_KILN, dur: 3, flames: 5, a: 0.65, cracks: 12 });
    V.smoke(x, y, { n: 6, color: '#3a2a2a', size: 40, a: 0.5, speed: 60, life: 1.5 });
    shake(5);
  }
  ABILITY_VFX.alembist = {
    ember: c => puff(c.ent, ALEMBIC.reagents.E.color),
    dew: c => puff(c.ent, ALEMBIC.reagents.D.color),
    salt: c => puff(c.ent, ALEMBIC.reagents.S.color),
    quicksilver: c => puff(c.ent, ALEMBIC.reagents.Q.color),
    throw: () => {},   // the vial itself is KIT_VFX.vial (it knows what it carries)
    // a gush of white steam out of the still, a little rune of glass at the feet
    distill: c => { puff(c.ent, '#dff4f4', 6, 1.4); V.sigil(c.x, c.y, { r: 34, style: 'hex', color: '#cfeff0', dur: 0.7, spin: 3 }); },
    catalyst: c => { puff(c.ent, '#ff8a3a', 4, 1.2); const s = still(c.ent); for (let i = 0; i < 3; i++) c.later(i * 0.06, () => { const a = Math.random() * Math.PI * 2; V.lightning(s.x, s.y, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 20, { color: '#ffb070', jag: 6, dur: 0.18 }); }); },
    batch: c => { for (let i = 0; i < 4; i++) c.later(i * 0.12, () => puff(c.ent, '#ffd27a', 2, 1)); V.shock(c.x, c.y, { r: 60, color: '#ffd27a', dur: 0.4, w: 3 }); },
    blend: c => { V.swirl(c.x, c.y, { r: 36, color: '#ffe0a8', dur: 0.7, follow: c.ent, inward: true }); puff(c.ent, '#ffe0a8', 5, 1.3); },
  };

  // the vial in the air: a little glass bottle in the recipe's colour, spinning end over end, dripping as it goes
  // (the painted sheet's long glowing arc: a comet trail in the vial's colour follows it; o.arc scales the height)
  function lob(sx, sy, tx, ty, cols, onHit, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = ALEMBIC.FLIGHT, arc = (36 + d * 0.18) * (o.arc ?? 1);
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * arc - p * 14 });
    let last = 0;
    V.fx({ dur, layer: 'air', tick: () => {
      if (Math.random() < 0.4) { const q = pos(last); V.spawn({ x: q.x, y: q.y, z: q.z, vz: -40, g: 300, life: 0.35, size: 6, color: cols[0], kind: 'drop', add: false }); }
    }, draw: (c, p, t, e) => {
      const q = pos(p), y = q.y - q.z; last = p;
      const p0 = Math.max(0, p - 0.38);
      V.neonPath(c, cols[0], 3.2, 0.6 * e.a, () => { for (let i = 0; i <= 8; i++) { const r = pos(p0 + (p - p0) * i / 8); i ? c.lineTo(r.x, r.y - r.z) : c.moveTo(r.x, r.y - r.z); } });
      V.glowAt(c, q.x, y, 22, cols[0], 0.6 * e.a);
      c.save(); c.globalAlpha = e.a; c.translate(q.x, y); c.scale(1.3, 1.3); c.rotate(t * 16);
      c.fillStyle = cols[0]; c.strokeStyle = OUT; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(0, 2, 5, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (cols.length > 1) { c.fillStyle = cols[1]; c.beginPath(); c.ellipse(1.5, 2, 2.5, 5, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(220,240,250,0.8)'; c.fillRect(-2, -7, 4, 5); c.fillStyle = '#9a6a3a'; c.fillRect(-2.2, -9, 4.4, 2.6);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-3, -1, 1.5, 4);
      c.restore();
    }, done: () => onHit(tx, ty) });
  }
  // glass: shards that skitter and glint, a white flash
  function glass(x, y) {
    V.flash(x, y - 10, 30, '#ffffff', 0.12);
    for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, sp = rand(80, 220);
      V.spawn({ x, y, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 200), g: 600, bounce: true, life: rand(0.5, 0.9), size: rand(6, 9), color: '#e8f6ff', kind: 'shard', add: false, vr: rand(-14, 14), fadePow: 3 }); }
  }
  // the splash of one recipe where it broke. m: strength (bigger, longer); tent: the ally it landed on (clouds follow them)
  function burst(r, x, y, m, tent, fol) {
    const info = alemInfo(r), col = info.color, kind = info.kind, big = r.length === 3;
    V.splash(x, y, { n: big ? 16 : 10, color: col, size: 1.1, speed: 1.1 });
    if (r === 'DES') {   // Philosopher's Draught: a lilac star that rings out across the whole room
      V.spikeburst(x, y, { r: 50, n: 14, color: col, core: '#ffffff', ink: '#2a1840', dur: 0.4 });
      for (let i = 0; i < 3; i++) V.shock(x, y, { r: 260 + i * 90, color: col, dur: 0.8, w: 5 - i, delay: i * 0.12 });
      V.burst(x, y, { color: col, color2: '#ffffff', n: 22, speed: 300, kind: 'star', flashR: 90 }); V.plus(x, y, { color: '#e6c8ff', n: 8 });
      return;
    }
    switch (kind) {
      case 'heal': {
        const R = big ? 150 : 110;
        if (r === 'DE') {   // Steam: a white cloud billows up with swirls, and turns on the floor for the cloud's life
          const dur = 9 * m, f = fol ? tent : null;
          V.smoke(x, y, { n: 9, r: 38, color: '#eef6f6', size: 50, a: 0.5, speed: 100, life: 1.5 });
          V.swirl(x, y, { r: 115, color: '#e8f4f4', dur: 1, arms: 3 });
          alemSteamSwirl(x, y, 114, dur, f);   // the cloud's own 120 radius
          V.plus(x, y, { color: '#9affd8', n: 4 });
          steam(x, y, 120, dur, '#d8f2f2', f);
          break;
        }
        // a cure: shafts of light rise out of the splash, a ring with a healing plus settles on the floor
        V.shock(x, y, { r: R, color: col, dur: 0.5, w: 5 });
        alemRays(x, y, col, big ? 9 : 6, R * 0.7);
        alemCureMark(x, y, R * 0.92, col, big ? 1.8 : 1.4);
        V.plus(x, y, { color: shade(col, 0.3), n: big ? 8 : 5 }); V.motes(x, y, { color: col, n: 8, r: R * 0.6, rise: 0.8 });
        if (r === 'DDD') steam(x, y, 150, 6, '#d8f2f2', fol ? tent : null);
        break;
      }
      case 'bomb': {
        // red arc, a fiery blast with hot rubble, and a scorched crater whose cracks glow as it cools
        const s = (big ? 1.5 : 1) * 1.25;
        V.flash(x, y - 12, 44 * s, '#ff5a2a', 0.14);
        V.spikeburst(x, y, { r: 50 * s, n: 16, color: '#ff4a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 });
        V.flare(x, y, { n: big ? 18 : 12, r: 20 * s, color: col === '#fff070' ? '#ffd23a' : '#ff5a1a' });
        V.debris(x, y, { n: big ? 7 : 5, hot: true, color: '#5a3a2a' });
        V.smoke(x, y, { n: 5, color: '#3a2a2a', size: 30 * s, a: 0.5, speed: 50, life: 1.4 });
        V.crater(x, y, { r: big ? 68 : 46, color: '#ff4a1a', dur: big ? 3 : 2, flames: big ? 4 : 3, a: 0.5, cracks: big ? 10 : 8 });
        if (r === 'EQ') V.lightning(x - 30, y - 10, x + 30, y + 6, { color: '#fff4c0', jag: 10 });
        if (r === 'EES') { V.burst(x, y, { color: '#fff070', n: 14, speed: 260, kind: 'star' }); }
        shake(big ? 5 : 3);
        break;
      }
      case 'ward': {
        // a blue dome closes over the splash, then a shield seal stays (low) on the floor as long as the ward works
        const R = r === 'SSS' ? 160 : 120, dur = (r === 'SSS' ? 8 : 6) * m, blue = r === 'QQ' ? '#a8c8ff' : ALEM_BLUE;
        V.dome({ x, y }, { color: blue, r: R * 0.62, dur: 1.2 });
        alemShieldSeal(x, y, R, blue, dur);
        V.burst(x, y - 20, { color: '#cfe4ff', color2: '#ffffff', n: 10, speed: 160, kind: 'star', flash: false });
        // salt glitter hanging in the circle for its whole life
        V.fx({ dur, layer: 'ground', tick: () => { if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: rand(0, 20), vz: rand(10, 30), life: 0.9, size: rand(4, 7), color: '#ffffff', kind: 'star' }); } }, draw: () => {} });
        break;
      }
      case 'salve': {
        const R = big ? 130 : 110;
        // a shield too: a small dome over the ally it lands on (blue-rimmed), rings of the salve's colour
        for (let i = 0; i < 2; i++) V.shock(x, y, { r: R * (0.6 + i * 0.3), color: i ? ALEM_BLUE : col, dur: 0.6, w: 4, delay: i * 0.08 });
        V.dome(tent || { x, y }, { color: col, r: 40, dur: 1.2 });
        V.burst(x, y - 10, { color: col, color2: '#cfe4ff', n: 10, speed: 180, kind: 'star', flash: false });
        break;
      }
      case 'quick': {
        V.burst(x, y, { color: '#ffd23a', color2: '#ffffff', n: 18, speed: 300, kind: 'star' });
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rand(-0.4, 0.4); V.lightning(x, y, x + Math.cos(a) * 90, y + Math.sin(a) * 60, { color: '#fff0a0', jag: 12, dur: 0.22 }); }
        V.shock(x, y, { r: 120, color: '#ffd23a', dur: 0.4, w: 4 }); V.motes(x, y, { color: '#ffe680', n: 12, r: 80, rise: 1.4 });
        break;
      }
    }
  }
  // a lingering healing cloud: soft puffs that billow and drift for its whole life (it can follow an ally)
  function steam(x, y, R, dur, col, follow) {
    V.fx({ dur, layer: 'air', tick: () => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      if (Math.random() < 0.45) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.85;
        V.spawn({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, z: rand(0, 14), vx: rand(-12, 12), vz: rand(8, 22), drag: 0.03, life: rand(1.2, 1.8), size: rand(26, 40), size1: 56, color: col, kind: 'smoke', add: false, a: 0.32, fadeIn: 0.25, fadePow: 2 }); }
      if (Math.random() < 0.12) V.plus(cx + rand(-R, R) * 0.5, cy + rand(-R, R) * 0.35, { color: '#9affd8', n: 1 });
    }, draw: () => {} });
  }

  Object.assign(KIT_VFX, {
    // a vial thrown (data: { r, p (a Blend's parts), to, en, self, m, fol }): it arcs to target and shatters there.
    // self: its fuse ran out (or it spoiled into a spill) in the bandolier, so it bursts right on the hero.
    vial: (e, target, d) => {
      if (!d) return;
      const parts = d.p || [d.r], cols = parts.map(r => alemInfo(r).color), m = d.m || 1;
      // a Reaction (three reagents) or a Grand Blend: two vials fly on their own arcs and collide where they land,
      // a two-coloured burst and a rune circle in both colours (alemReactRune) under the recipe's own splash
      const rk = typeof d.r === 'string' ? d.r : '';
      const react = parts.length > 1 || !!(ALEMBIC.reactions && ALEMBIC.reactions[rk]);
      let pair = null;
      if (react) {
        const ls = [...new Set(rk.split(''))].map(L => ALEMBIC.reagents[L] && ALEMBIC.reagents[L].color).filter(Boolean);
        pair = parts.length > 1 ? [cols[0], cols[1]] : ls.length > 1 ? [ls[0], ls[1]] : [cols[0], shade(cols[0], 0.45)];
      }
      const kiln = !!d.kiln;
      const go = (x, y) => {
        glass(x, y);
        if (kiln) { alemKilnBlast(x, y); return; }
        if (pair) { V.spikeburst(x, y, { r: 76, n: 14, color: pair[0], core: '#ffffff', ink: '#1a1020', dur: 0.36 }); V.spikeburst(x, y, { r: 52, n: 12, color: pair[1], core: '#ffffff', ink: '#1a1020', dur: 0.32, z: 18 });
          alemReactRune(x, y, 104, pair[0], pair[1], 1.8); }
        for (const r of parts) burst(r, x, y, m, target && target !== e ? target : null, d.fol);
      };
      if (d.self) { V.spawn({ x: e.x, y: e.y, z: 20, life: 0.3, size: 50, size1: 10, color: '#ffb040' }); go(e.x, e.y); return; }
      const ca = Math.cos(e.angle || 0), sa = Math.sin(e.angle || 0), hx = e.x + ca * 12, hy = e.y + sa * 12;
      const t = target || { x: e.x + ca * 140, y: e.y + sa * 140 };
      if (e.st) e.st.action = { type: 'cast', t0: FX.now, dur: 0.4 };
      const land = (x, y) => go(target ? target.x : x, target ? target.y : y);
      if (kiln) { alemKilnGlow(e); lob(hx, hy, t.x, t.y, [ALEM_KILN, '#ffd08a'], land, { arc: 1.2 }); return; }
      if (pair) {   // the two vials leave from either hand
        lob(hx - sa * 10, hy + ca * 10, t.x, t.y, [pair[0]], land, { arc: 1.35 });
        lob(hx + sa * 10, hy - ca * 10, t.x, t.y, [pair[1]], () => {}, { arc: 0.6 });
        return;
      }
      lob(hx, hy, t.x, t.y, cols, land);
    },
    // a vial finished brewing: the still pops, a ring and a jet of coloured steam out of the chimney
    brew: (e, target, d) => {
      const col = d ? alemInfo(d.r).color : '#ffffff', s = still(e);
      puff(e, col, 4, 1.15);
      V.shock(s.x, s.y, { r: 30, color: col, dur: 0.3, w: 3, layer: 'air' });
      for (let i = 0; i < 6; i++) V.spawn({ x: s.x, y: s.y, z: 30, vx: rand(-60, 60), vy: rand(-40, 40), vz: rand(80, 160), g: 260, life: 0.5, size: rand(4, 6), color: col, kind: 'glow' });
    },
    // a Reaction found for the first time: a gold starburst over the still and its name, once
    discover: (e, target, d) => {
      const s = still(e), info = d ? alemInfo(d.r) : null;
      V.burst(s.x, s.y, { color: '#ffd27a', color2: '#ffffff', n: 20, speed: 240, kind: 'star', flashR: 60 });
      V.sigil(e.x, e.y, { r: 44, style: 'star5', color: '#ffd27a', dur: 1.2, spin: 2 });
      if (info) FX.text(e.x, e.y - 70, info.name, '#ffe2a0', 16, 1.6);
    },
    fizzle: e => { const s = still(e); V.smoke(s.x, s.y, { n: 4, color: '#8a8478', size: 16, a: 0.6, speed: 30 }); },
    spoil: (e, target, d) => { const s = still(e); V.smoke(s.x, s.y, { n: 3, color: '#6a5a3a', size: 14, a: 0.5, speed: 20 }); V.splash(s.x, s.y, { n: 4, color: '#6a5a3a', size: 0.7, speed: 0.5 }); },
    kindle: e => { const s = still(e); V.sparks(s.x, s.y, { color: '#ffb040', n: 5, angle: e.angle || 0, spread: 0.5, speed: 240 }); },
    ricochet: (e, target) => { if (target) { V.hit(target.x, target.y, '#ffb050', 0.8); V.flare(target.x, target.y, { n: 6, r: 12 }); } },
    leap: (e, target) => { if (target) V.splash(target.x, target.y, { n: 8, color: '#4fe0c0', speed: 1.4 }); },
  });
})();

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

// ======================================================================= Talents
// The moves a talent grants (combat/talents.js `grants`, kits.js TALENT_ABILITIES) and the moments talents add
// (k.fx names). Capstone moves (row V) leave a signature shape on the field for as long as they last: wings, a blood
// moon, a standing rune, a falcon, a phoenix, a treant, a great clock.
(() => {
  // the talent moments that land on the enemy: flagged atTarget, so main.js hands them the boss / the target dummy
  const AIMED = ['sunlit', 'edgeShard', 'edgeReturn', 'dawnPillar', 'moonburst', 'bloodlust', 'hemorrhage', 'glyphEcho', 'binding', 'runeBolt',
  'mirrorShards', 'runeOverflow', 'wardNova', 'whirl', 'explode', 'falconDive', 'ricochetArrow', 'stormArc', 'volley', 'deathmark', 'toxicBurst', 'shadowClone',
  'garrote', 'ambush', 'blossomEnd', 'twinFlame', 'chainReact', 'bomb', 'bombPlant', 'flashpoint', 'petalfall', 'sunfall', 'natureWrath', 'treantSlam',
  'clockStrike', 'futureMark', 'futureBurst'];
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  const fade = (p, i = 0.1, o = 0.2) => Math.min(1, p / i, (1 - p) / o);
  // a moment aimed at the enemy, with a spot ahead of the hero when there's no enemy to hand
  const at = (e, t) => t || { x: e.x + Math.cos(e.angle || 0) * 160, y: e.y + Math.sin(e.angle || 0) * 160 };
  const longFor = (ent, spec, a, b) => (ent && ent.spec === spec ? b : a);

  // ---- shapes the capstones leave on the field
  // a pair of feathered wings behind a hero (drawn on the floor layer, so they sit behind the sprite)
  function wings(ent, dur, color) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = fade(p, 0.06, 0.12) * e.a, open = Math.min(1, p * dur / 0.4), bx = ent.x, by = ent.y - 30, flap = Math.sin(t * 2.4) * 0.12;
      V.glowAt(c, bx, by - 6, 60, color, 0.3 * k);
      for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + sd * (0.3 + i * 0.18 * open + flap), L = (34 - i * 2) * (0.5 + 0.5 * open);
        c.save(); c.translate(bx + sd * 5, by); c.rotate(a);
        c.globalAlpha = 0.4 * k; c.fillStyle = i % 2 ? '#fff6d8' : color; c.beginPath(); c.ellipse(L / 2, 0, L / 2, 4.5 + i * 0.4, 0, 0, TAU); c.fill();
        V.neonPath(c, color, 1.3, k * 0.8, () => c.ellipse(L / 2, 0, L / 2, 4.5 + i * 0.4, 0, 0, TAU));
        c.restore();
      }
      c.globalAlpha = 1;
    }, tick: () => { if (Math.random() < 0.15) V.spawn({ x: ent.x + rand(-40, 40), y: ent.y + rand(-4, 4), z: rand(30, 60), vz: rand(-40, -20), vx: rand(-15, 15), life: 1.3, size: 11, color: '#fff8e6', kind: 'feather', add: false, vr: rand(-2, 2), flutter: 3, fadeIn: 0.1 }); } });
  }
  // a bird seen from above: s scale, flap phase, facing ang
  function bird(c, x, y, s, flap, ang, body, edge, a) {
    const span = 0.55 + 0.45 * Math.cos(flap);
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.globalAlpha = a;
    c.fillStyle = body; c.strokeStyle = OUT; c.lineWidth = 1.2 / s;
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(3, sd * 14 * span, -7, sd * 21 * span); c.lineTo(-3, sd * 5); c.closePath(); c.fill(); c.stroke(); }
    c.beginPath(); c.moveTo(-8, 0); c.lineTo(-16, -5); c.lineTo(-14, 0); c.lineTo(-16, 5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 10, 3.6, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = edge; c.beginPath(); c.moveTo(10, 0); c.lineTo(13, -1.5); c.lineTo(13, 1.5); c.closePath(); c.fill();
    c.restore(); c.globalAlpha = 1;
  }
  // a rune standing up in the air: a tall diamond with strokes inside
  function standingRune(c, x, y, h, color, k, t) {
    const w = h * 0.42;
    V.glowAt(c, x, y, h * 0.9, color, 0.45 * k);
    V.neonPath(c, color, 2.4, k, () => { c.moveTo(x, y - h / 2); c.lineTo(x + w, y); c.lineTo(x, y + h / 2); c.lineTo(x - w, y); c.closePath(); });
    V.neonPath(c, color, 1.6, k * 0.85, () => { c.moveTo(x, y - h * 0.32); c.lineTo(x, y + h * 0.32); c.moveTo(x - w * 0.45, y - h * 0.08); c.lineTo(x + w * 0.45, y + h * 0.1); c.moveTo(x - w * 0.3, y + h * 0.2); c.lineTo(x + w * 0.3, y - h * 0.22); });
    V.glowAt(c, x, y, 8 + Math.sin(t * 6) * 2, '#ffffff', k);
  }

  Object.assign(ABILITY_VFX.bastion, {
    // Hallowed Ground: light falls on the spot and the floor is consecrated for 10s, embers rising off it, a pulse every 2s
    hallowed: c => { const x = c.x, y = c.y, r = 110;
      V.lightfall(x, y, { color: '#ffe08a', r: 34, h: 260, dur: 0.9, feathers: 3 });
      V.ink(x, y, { r, dur: 10 }); V.sigil(x, y, { r, style: 'star5', color: '#f2c84b', dur: 10, spin: 0.3 });
      c.later(0.15, () => { V.spikeburst(x, y, { r: 70, n: 16, hole: 0.6, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', layer: 'ground', z: 0, flat: 0.6, dur: 0.5 }); V.debris(x, y, { n: 5, color: '#8a7a68' }); shake(3); });
      V.fx({ dur: 10, layer: 'ground', draw: () => {}, tick: (p, dt, e) => {
        if (Math.random() < 0.45) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.95; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: 0, vz: rand(40, 90), life: rand(0.7, 1.1), size: rand(6, 10), size1: 0, color: Math.random() < 0.6 ? '#ffd65a' : '#fff6d0', kind: Math.random() < 0.3 ? 'star' : 'glow' }); }
        e.n = e.n || 0; if (p * 10 >= (e.n + 1) * 2) { e.n++; V.shock(x, y, { r: r * 0.95, r0: 20, color: '#ffe08a', dur: 0.6, w: 4 }); }
      } }); },
    // Avatar of Dawn: a shaft of dawn, then wings of light on the back for the whole burst
    avatar: c => { const dur = longFor(c.ent, 'crusader', 15, 20);
      V.lightfall(c.x, c.y, { color: '#ffe08a', r: 36, h: 300, dur: 1.1, feathers: 8 });
      c.later(0.2, () => { wings(c.ent, dur, '#ffd65a'); V.aura(c.ent, { color: '#ffd65a', dur, r: 32, rate: 0.15 });
        V.burst(c.ent.x, c.ent.y - 30, { color: '#ffe9a0', color2: '#ffffff', n: 24, speed: 300, kind: 'star', flashR: 110 }); V.shock(c.ent.x, c.ent.y, { r: 160, color: '#ffe08a', dur: 0.6, w: 7 }); shake(5); }); },
  });

  Object.assign(ABILITY_VFX.bloodreaver, {
    // Scab: blood drawn back in and hardening into dark red plates over a crusted shield
    scab: c => { V.swirl(c.x, c.y, { r: 60, color: '#c01a2a', dur: 0.5, follow: c.ent, inward: true }); V.charge(c.x, c.y, { color: '#ff3a4a', r: 60, n: 10, dur: 0.35, follow: c.ent });
      c.later(0.3, () => { V.shield(c.ent, { shape: 'hex', color: '#b01a2a', dur: 8, r: 40 }); V.crystals(c.ent.x, c.ent.y, { color: '#8a1020', n: 6, r: 26, h: 26, dur: 0.8 }); V.spikeburst(c.ent.x, c.ent.y, { r: 44, n: 10, color: '#a01028', core: '#ffb0b0', ink: '#2a0408', dur: 0.3, z: 18 }); }); },
    // Blood Moon: a red moon hangs over the reaver for 10s; blood rises off the floor into it
    moon: c => { const ent = c.ent;
      V.ink(c.x, c.y, { r: 70, dur: 10, follow: ent, a: 0.3 }); V.sigil(c.x, c.y, { r: 70, style: 'runes', color: '#c01a2a', dur: 10, spin: -0.6, follow: ent });
      V.aura(ent, { color: '#8a0010', style: 'shadow', dur: 10, r: 30, rate: 0.25 });
      V.fx({ dur: 10, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.08, 0.1) * e.a, rise = Math.min(1, p * 10 / 0.6), mx = ent.x, my = ent.y - 70 - 40 * rise, R = 22;
        V.glowAt(c2, mx, my, 70, '#ff1a2a', 0.45 * k);
        c2.globalAlpha = 0.9 * k; c2.fillStyle = '#9a1020'; c2.beginPath(); c2.arc(mx, my, R, 0, TAU); c2.fill();
        c2.fillStyle = '#c8303a'; c2.beginPath(); c2.arc(mx - 4, my - 4, R * 0.8, 0, TAU); c2.fill();
        c2.fillStyle = '#6a0810'; for (const [dx, dy, rr] of [[6, 5, 5], [-8, 2, 3.5], [2, -9, 3]]) { c2.beginPath(); c2.arc(mx + dx, my + dy, rr, 0, TAU); c2.fill(); }
        c2.globalAlpha = 1; V.neonRing(c2, mx, my, R + 2, '#ff4a5a', 2, k);
      }, tick: () => { if (Math.random() < 0.35) { const a = Math.random() * TAU; V.spawn({ x: ent.x + Math.cos(a) * 40, y: ent.y + Math.sin(a) * 22, z: 0, vz: rand(90, 140), vx: -Math.cos(a) * 20, life: 0.9, size: rand(5, 8), size1: 0, color: '#ff2a3a' }); } } });
      V.shock(c.x, c.y, { r: 140, color: '#ff2a3a', dur: 0.6, w: 6 }); shake(4); },
  });

  Object.assign(ABILITY_VFX.runeguard, {
    // Whirling Runes: the held runes tear loose in a burst of violet (the blades themselves are KIT_VFX.whirl)
    whirl: c => { V.sigil(c.x, c.y, { r: 60, style: 'runes', color: '#a070ff', dur: 0.8, spin: 6, follow: c.ent }); V.crystals(c.x, c.y, { color: '#c8a8ff', n: 6, r: 34, h: 34, dur: 0.5 });
      V.burst(c.x, c.y - 20, { color: '#d8c4ff', color2: '#ffffff', n: 16, speed: 260, kind: 'star' }); },
    // Living Rune: a great rune rises behind the warder and stands there, pulsing, for 15s
    living: c => { const ent = c.ent;
      V.pillar(c.x, c.y, { r: 40, h: 200, color: '#b8a0ff', dur: 1 }); V.ink(c.x, c.y, { r: 80, dur: 1.4 }); V.sigil(c.x, c.y, { r: 80, style: 'runes', color: '#9f7aff', dur: 1.4, spin: 2 });
      V.fx({ dur: 15, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.05, 0.08) * e.a, rise = Math.min(1, p * 15 / 0.5), a = ent.angle || 0;
        standingRune(c2, ent.x - Math.cos(a) * 22, ent.y - 40 - 30 * rise + Math.sin(t * 2) * 3, 46, '#b18cff', k, t);
      }, tick: () => { if (Math.random() < 0.2) { const a = ent.angle || 0; V.spawn({ x: ent.x - Math.cos(a) * 22 + rand(-10, 10), y: ent.y, z: 60, vz: rand(-20, 20), life: 0.8, size: 6, size1: 0, color: '#d8c4ff', kind: 'star' }); } } });
      c.later(0.3, () => { V.spikeburst(ent.x, ent.y, { r: 50, n: 12, color: '#a070ff', core: '#f0e8ff', ink: '#1e0e3a', dur: 0.34, z: 20 }); shake(4); }); },
  });

  Object.assign(ABILITY_VFX.ranger, {
    // Explosive Shot: an arrow that sticks in the boss with a charge blinking faster and faster (the blast is KIT_VFX.explode)
    explosive: c => V.missile(c.x, c.y, c.tx, c.ty, { style: 'arrow', color: '#ff8a3a', speed: 1400, onHit: (x, y) => {
      V.hit(x, y, '#ffb060', 0.6);
      V.fx({ dur: 2.4, layer: 'air', draw: (c2, p, t, e) => { const blink = Math.sin(t * (6 + p * 20)) > 0 ? 1 : 0.35; V.glowAt(c2, x, y - 24, 14 + p * 10, '#ff5a1a', blink * e.a); V.glowAt(c2, x, y - 24, 5, '#ffffff', blink * e.a); } });
    } }),
    // Falcon: the falcon dives from the bow to the boss and circles over it for 10s, swooping low every 2s
    falcon: c => { const tx = c.tx, ty = c.ty;
      V.glint(c.x, c.y, { color: '#ffe27a', size: 26, z: 30 });
      V.fx({ dur: 10.5, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.02, 0.05) * e.a;
        let x, y, ang;
        if (t < 0.5) { const q = t / 0.5; x = c.x + (tx - c.x) * q; y = c.y + (ty - c.y) * q - 60 - Math.sin(q * Math.PI) * 30; ang = Math.atan2(ty - c.y, tx - c.x); }
        else { const s = t - 0.5, sw = Math.max(0, Math.sin(((s % 2) / 2) * Math.PI)) ** 6, a = s * 2.2, R = 70 - 40 * sw;
          x = tx + Math.cos(a) * R; y = ty + Math.sin(a) * R * 0.5 - 90 + 60 * sw; ang = a + Math.PI / 2; }
        V.glowAt(c2, x, y, 22, '#ffe27a', 0.35 * k);
        bird(c2, x, y, 1.1, t * 11, ang, '#8a5a32', '#ffd27a', k);
      } });
      c.later(0.5, () => { V.hit(tx, ty, '#ffe27a', 1); V.sparks(tx, ty, { color: '#fff2c0', n: 8 }); for (let i = 0; i < 4; i++) V.spawn({ x: tx, y: ty, z: 30, vx: rand(-60, 60), vy: rand(-30, 30), vz: rand(20, 80), g: 80, life: 1.2, size: 11, color: '#c8a070', kind: 'feather', add: false, vr: rand(-3, 3), flutter: 3 }); }); },
  });

  Object.assign(ABILITY_VFX.shadowblade, {
    // Rupture: a deep opening cut, then the wound keeps bleeding onto the floor
    rupture: c => { V.slash(c.x, c.y, c.ang, { r: 62, span: 1.2, color: '#ff2a4a', w: 0.7, dur: 0.26 });
      c.later(0.08, () => { const tx = c.tx, ty = c.ty; V.spikeburst(tx, ty, { r: 46, n: 12, color: '#c01a3a', core: '#ffe0ec', ink: '#2a0410', dur: 0.32 }); V.splash(tx, ty, { n: 10, speed: 1.2 });
        V.puddle(tx + (c.x - tx) * 0.35, ty + (c.y - ty) * 0.35, { r: 24, color: '#a01028', dark: '#3a0610', dur: 6, bubbles: false, fumes: false });
        V.fx({ dur: 6, layer: 'air', draw: () => {}, tick: () => { if (Math.random() < 0.3) V.spawn({ x: tx + rand(-12, 12), y: ty, z: rand(20, 40), vz: -20, g: 500, life: 0.5, size: 7, color: '#c01a2a', kind: 'drop', add: false, rot: Math.PI / 2 }); } }); }); },
    // Death Blossom: gone in a puff of smoke, then six cuts flash round the boss from every side and a red flower of steel opens
    blossom: c => { const tx = c.tx, ty = c.ty;
      V.smokebomb(c.x, c.y, { r: 60, dur: 1.4, toss: 0 });
      V.vortex(tx, ty, { r: 70, color: '#c01a5a', steel: '#ffe0ec', dur: 1.6, n: 6 });
      for (let i = 0; i < 6; i++) c.later(i * 0.25, () => { const a = rand(0, TAU); V.slash(tx - Math.cos(a) * 30, ty - Math.sin(a) * 30, a, { r: 60, span: 1.4, color: i % 2 ? '#ff4d9a' : '#e8e0ff', dur: 0.22, w: 0.5, flip: i % 2 === 1, sparks: 3 }); V.splash(tx, ty, { n: 3, size: 0.7 }); }); },
  });

  Object.assign(ABILITY_VFX.pyromancer, {
    // Firestep: the pyromancer bursts into flame and blinks forward, a line of fire left burning along the way
    firestep: c => { const ent = c.ent, a = c.ang, ex = ent.x, ey = ent.y, sx = ex - Math.cos(a) * 150, sy = ey - Math.sin(a) * 150;
      V.flare(sx, sy, { n: 14, r: 16, color: '#ff6a1a' }); V.flare(ex, ey, { n: 18, r: 18, color: '#ff8a2a' }); V.shock(ex, ey, { r: 70, color: '#ffb040', dur: 0.35, w: 5 });
      V.blaze(ent, { r: 36, dur: 0.8 });
      V.fx({ dur: 1.6, layer: 'ground', draw: (c2, p, t, e) => { const k = (1 - p) * e.a; c2.globalAlpha = 0.4 * k; c2.strokeStyle = '#2a0e04'; c2.lineWidth = 12; c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(sx, sy); c2.lineTo(ex, ey); c2.stroke(); c2.globalAlpha = 1;
        V.neonPath(c2, '#ff7a1a', 3, k, () => { c2.moveTo(sx, sy); c2.lineTo(ex, ey); }); },
        tick: () => { for (let i = 0; i < 2; i++) { const q = Math.random(); V.spawn({ x: sx + (ex - sx) * q + rand(-6, 6), y: sy + (ey - sy) * q + rand(-4, 4), z: 0, vz: rand(60, 140), life: rand(0.3, 0.6), size: rand(10, 16), size1: 2, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffd070' }); } } }); },
    // Phoenix Flight: a great bird of fire sweeps out through the boss and wheels back for a second pass
    phoenix: c => { const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty, ang = Math.atan2(ty - sy, tx - sx), L = Math.hypot(tx - sx, ty - sy) + 80, nx = -Math.sin(ang), ny = Math.cos(ang);
      // the path: out past the boss, a wide turn, back through it to the caster
      const path = q => { const s = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5, side = Math.sin(q * TAU) * 70; return { x: sx + Math.cos(ang) * L * s + nx * side, y: sy + Math.sin(ang) * L * s + ny * side - 40 }; };
      V.charge(sx, sy, { color: '#ffb040', r: 50, n: 10, dur: 0.25 });
      V.fx({ dur: 1.5, layer: 'air', draw: (c2, p, t, e) => {
        const q = path(p), b = path(Math.min(1, p + 0.01)), k = fade(p, 0.05, 0.1) * e.a, fa = Math.atan2(b.y - q.y, b.x - q.x);
        V.glowAt(c2, q.x, q.y, 70, '#ff6a1a', 0.55 * k); V.glowAt(c2, q.x, q.y, 30, '#ffe08a', 0.7 * k);
        bird(c2, q.x, q.y, 2.2, t * 9, fa, '#ff8a2a', '#fff2b0', k);
      }, tick: p => { const q = path(p); for (let i = 0; i < 3; i++) V.spawn({ x: q.x + rand(-14, 14), y: q.y + 40 + rand(-8, 8), z: 40, vx: rand(-30, 30), vz: rand(10, 60), life: rand(0.4, 0.8), size: rand(12, 22), size1: 2, color: Math.random() < 0.5 ? '#ff6a1a' : '#ffc040' }); } });
      for (const d of [0.38, 1.12]) c.later(d, () => { V.spikeburst(tx, ty, { r: 60, n: 14, color: '#ff6a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 }); V.flare(tx, ty, { n: 16, r: 20 }); shake(4); }); },
  });

  Object.assign(ABILITY_VFX.cleric, {
    // Bloom of Dawn: light falls on the ally and a flower of petals opens round them
    dawnbloom: c => { const w = c.tent || c.ent;
      V.lightfall(w.x, w.y, { color: '#ffe680', r: 32, h: 260, dur: 0.9, feathers: 4 });
      c.later(0.2, () => { V.ink(w.x, w.y, { r: 90, dur: 1.4 }); V.sigil(w.x, w.y, { r: 90, style: 'petals', color: '#ffb8d8', dur: 1.4, spin: 1.5 });
        V.burst(w.x, w.y - 20, { color: '#ffd0e4', color2: '#ffffff', n: 14, speed: 220, kind: 'petal', flashR: 90 }); V.plus(w.x, w.y, { color: '#fff2a0', n: 8 });
        V.motes(w.x, w.y, { kind: 'petal', color: '#ffc0dc', n: 10, r: 60, rise: 0.6 }); }); },
    // Dawn Sanctum: a great circle of dawn at the cleric's feet for 12s, petals and light drifting up out of it
    dawnsanctum: c => { const x = c.x, y = c.y, r = 130;
      V.pillar(x, y, { r: 50, h: 220, color: '#ffe680', dur: 1.2 });
      V.ink(x, y, { r, dur: 12 }); V.sigil(x, y, { r, style: 'star4', color: '#ffd65a', dur: 12, spin: 0.25 }); V.sigil(x, y, { r: r * 0.6, style: 'petals', color: '#ffc0dc', dur: 12, spin: -0.4 });
      V.shock(x, y, { r: r + 30, color: '#ffe680', dur: 0.6, w: 7 });
      V.fx({ dur: 12, layer: 'ground', draw: () => {}, tick: (p, dt, e) => {
        if (Math.random() < 0.4) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.9, pet = Math.random() < 0.35;
          V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: 0, vz: rand(25, 60), vx: rand(-10, 10), life: rand(1, 1.6), size: pet ? 10 : rand(5, 8), size1: pet ? 10 : 0, color: pet ? '#ffc0dc' : '#fff2a0', kind: pet ? 'petal' : 'glow', add: pet ? false : undefined, flutter: pet ? 5 : 0 }); }
        e.n = e.n || 0; if (p * 12 >= (e.n + 1) * 1.5) { e.n++; V.shock(x, y, { r: r * 0.9, r0: 30, color: '#fff2a0', dur: 0.5, w: 3 }); }
      } }); },
  });

  Object.assign(ABILITY_VFX.grovekeeper, {
    // Seed of Renewal: a glowing seed sinks into the ally and a sprout grows at their feet while it lasts
    seed: c => { const w = c.tent || c.ent;
      V.missile(c.x, c.y, w.x, w.y, { style: 'leaf', color: '#9aff7a', speed: 700, arc: 40 });
      c.later(0.2, () => { V.sigil(w.x, w.y, { r: 50, style: 'petals', color: '#8aff6a', dur: 1, spin: 2, follow: w }); V.burst(w.x, w.y - 10, { color: '#b0ff9a', n: 10, speed: 160, kind: 'leaf', flash: false }); });
      V.fx({ dur: 20, layer: 'ground', draw: (c2, p, t, e) => {
        const k = fade(p, 0.03, 0.05) * e.a, g = Math.min(1, p * 20 / 2), x = w.x + 14, y = w.y + 6, h = 6 + 12 * g;
        V.glowAt(c2, x, y - h * 0.5, 16, '#8aff6a', 0.4 * k);
        V.neonPath(c2, '#7ee06a', 1.6, k, () => { c2.moveTo(x, y); c2.quadraticCurveTo(x - 3, y - h * 0.5, x, y - h); });
        for (const sd of [-1, 1]) V.neonPath(c2, '#b0ff8a', 1.4, k, () => c2.ellipse(x + sd * 4, y - h * 0.8, 4.5 * g + 1, 2, sd * 0.5, 0, TAU));
      } }); },
    // Treant: roots burst up beside the boss and a treant stands there for 15s, raising its arms to slam every 3s
    treant: c => { const x = c.tx + 56, y = c.ty + 14;
      V.grove(x, y, { r: 50, dur: 1.4, flowers: 4 }); V.debris(x, y, { n: 6, color: '#6a5034' }); V.crystals(x, y, { color: '#6abf4a', n: 6, r: 30, h: 40, dur: 0.6 });
      V.fx({ dur: 15.2, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.03, 0.04) * e.a, rise = Math.min(1, t / 0.6), q = (t % 3) / 3, lift = q > 0.6 ? (q - 0.6) / 0.4 : 0, sway = Math.sin(t * 1.5) * 2;
        const H = 54 * rise, top = y - H;
        c2.globalAlpha = 0.35 * k; c2.fillStyle = '#000'; c2.beginPath(); c2.ellipse(x, y, 22, 7, 0, 0, TAU); c2.fill();
        c2.globalAlpha = k; c2.fillStyle = '#6a4a2a'; c2.strokeStyle = OUT; c2.lineWidth = 2;
        c2.beginPath(); c2.moveTo(x - 12, y); c2.lineTo(x - 7 + sway, top + 6); c2.lineTo(x + 7 + sway, top + 6); c2.lineTo(x + 12, y); c2.closePath(); c2.fill(); c2.stroke();
        for (const sd of [-1, 1]) { const ax = x + sd * 8 + sway, ay = top + 16, th = 1 - lift * 2.3, hx = ax + sd * Math.cos(th) * 24, hy = ay + Math.sin(th) * 24;
          c2.lineWidth = 6; c2.strokeStyle = OUT; c2.beginPath(); c2.moveTo(ax, ay); c2.lineTo(hx, hy); c2.stroke();
          c2.lineWidth = 3.5; c2.strokeStyle = '#7a5a34'; c2.beginPath(); c2.moveTo(ax, ay); c2.lineTo(hx, hy); c2.stroke(); }
        c2.fillStyle = '#3f8a34'; for (const [dx, dy, rr] of [[-12, 4, 12], [12, 4, 12], [0, -6, 15], [0, 8, 11]]) { c2.beginPath(); c2.arc(x + dx + sway, top + dy - 4, rr * rise, 0, TAU); c2.fill(); c2.lineWidth = 1.5; c2.stroke(); }
        c2.fillStyle = '#5fbf4a'; c2.beginPath(); c2.arc(x - 4 + sway, top - 10, 7 * rise, 0, TAU); c2.fill(); c2.globalAlpha = 1;
        for (const sd of [-1, 1]) V.glowAt(c2, x + sd * 4 + sway, top + 16, 5, '#d8ff7a', k);
      }, tick: () => { if (Math.random() < 0.08) V.spawn({ x: x + rand(-14, 14), y, z: rand(40, 60), vz: rand(-30, -10), vx: rand(-15, 15), life: 1.4, size: 10, color: '#6fbf5a', kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5 }); } });
      shake(3); },
  });

  Object.assign(ABILITY_VFX.chronomancer, {
    // Time Bubble: a big pale bubble of slowed time round the ally, a clock turning slowly under it, for 6s
    bubble: c => { const w = c.tent || c.ent;
      V.shield(w, { shape: 'bubble', color: '#9fe8ff', dur: 6, r: 62 }); V.ink(w.x, w.y, { r: 70, dur: 6, follow: w, a: 0.25 }); V.sigil(w.x, w.y, { r: 70, style: 'clock', color: '#9fe8ff', dur: 6, spin: 0.3, follow: w });
      V.ribbons(w.x, w.y, { r: 60, dur: 1, dir: -1, follow: w, colors: ['#9fe8ff', '#e0d4ff', '#ffffff'] }); V.shock(w.x, w.y, { r: 90, color: '#bff0ff', dur: 0.5, w: 4 }); },
    // Time Warp: a great golden clock hangs over the party, its hands racing, for the whole burst
    warp: c => { const ent = c.ent, dur = longFor(ent, 'accelerant', 15, 20);
      V.ink(c.x, c.y, { r: 150, dur: 1.6 }); V.sigil(c.x, c.y, { r: 150, style: 'clock', color: '#ffd27a', dur: 1.6, spin: 2 });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 200 + i * 60, color: '#9fe8ff', dur: 0.7, w: 5 - i, delay: i * 0.12 });
      V.fx({ dur, layer: 'air', draw: (c2, p, t, e) => {
        const k = fade(p, 0.04, 0.06) * e.a, x = ent.x, y = ent.y - 120 + Math.sin(t * 1.5) * 4, R = 40 * Math.min(1, t / 0.4);
        V.glowAt(c2, x, y, R * 2, '#ffd27a', 0.35 * k);
        c2.globalAlpha = 0.45 * k; c2.fillStyle = '#1a1a34'; c2.beginPath(); c2.arc(x, y, R, 0, TAU); c2.fill(); c2.globalAlpha = 1;
        V.neonRing(c2, x, y, R, '#ffd27a', 3, k); V.neonRing(c2, x, y, R * 0.84, '#9fe8ff', 1.2, k * 0.8);
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12; V.neonPath(c2, '#ffe6a8', i % 3 ? 1 : 2, k, () => { c2.moveTo(x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7); c2.lineTo(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8); }); }
        V.neonPath(c2, '#ffffff', 2, k, () => { c2.moveTo(x, y); c2.lineTo(x + Math.cos(t * 8) * R * 0.66, y + Math.sin(t * 8) * R * 0.66); });
        V.neonPath(c2, '#ffd27a', 3, k, () => { c2.moveTo(x, y); c2.lineTo(x + Math.cos(t * 1.4) * R * 0.42, y + Math.sin(t * 1.4) * R * 0.42); });
      }, tick: () => { if (Math.random() < 0.2) V.spawn({ x: ent.x + rand(-40, 40), y: ent.y, z: 120 + rand(-30, 30), vz: rand(-30, -10), life: 1, size: 7, size1: 0, color: Math.random() < 0.5 ? '#ffd27a' : '#9fe8ff', kind: 'star' }); } });
      shake(4); },
  });

  // ---- the moments talents add (k.fx). target: the enemy for AIMED names, the ally for data.to, else null.
  Object.assign(KIT_VFX, {
    // Bastion
    sunlit: (e, t) => { const T = at(e, t); V.beam(e.x, e.y, T.x, T.y, { color: '#ffe9a0', w: 8, dur: 0.35 }); V.spawn({ x: T.x, y: T.y, z: 16, life: 0.3, size: 50, size1: 16, color: '#ffe27a', kind: 'star', vr: 5 }); },
    edgeShard: (e, t) => { const T = at(e, t); V.missile(e.x, e.y, T.x, T.y, { style: 'blade', color: '#ffe08a', speed: 1000, size: 0.6, onHit: (x, y) => V.hit(x, y, '#ffe9a0', 0.5) }); },
    edgeReturn: (e, t) => { const T = at(e, t); V.missile(T.x, T.y, e.x, e.y, { style: 'blade', color: '#ffe08a', speed: 900, size: 0.8, arc: 30, onHit: () => V.glint(e.x, e.y, { color: '#ffe08a', size: 24 }) }); V.hit(T.x, T.y, '#ffd65a', 0.7); },
    dawnPillar: (e, t) => { const T = at(e, t); V.lightfall(T.x, T.y, { color: '#ffe08a', r: 38, h: 320, dur: 0.8, feathers: 2 });
      FX.later(0.18, () => { V.spikeburst(T.x, T.y, { r: 56, n: 14, color: '#ffc840', core: '#fffbe0', ink: '#3a2a08', dur: 0.36 }); V.shock(T.x, T.y, { r: 90, color: '#ffe08a', dur: 0.4, w: 5 }); shake(3); }); },
    readSwing: e => { const a = e.angle || 0, fx = e.x + Math.cos(a) * 30, fy = e.y + Math.sin(a) * 30; V.glint(fx, fy, { color: '#ffffff', size: 30 }); V.shock(e.x, e.y, { r: 70, color: '#9fc4ff', dur: 0.35, w: 4 }); V.sparks(fx, fy, { color: '#dbe9ff', n: 8, angle: a, spread: 0.6, speed: 340 }); },
    lastStand: e => { V.dome(e, { color: '#ffb84a', r: 46, dur: 1.6 }); V.spikeburst(e.x, e.y, { r: 54, n: 14, color: '#ff9a3a', core: '#fff2c0', ink: '#3a1a06', dur: 0.36, z: 18 }); shake(4); },
    faith: e => { V.motes(e.x, e.y, { color: '#ffe08a', n: 10, r: 30, kind: 'star' }); V.sigil(e.x, e.y, { r: 40, style: 'star4', color: '#ffd65a', dur: 0.6, spin: 4, follow: e }); },
    // Bloodreaver
    secondHelping: e => { V.swirl(e.x, e.y, { r: 46, color: '#ff2a4a', dur: 0.5, follow: e, inward: true }); V.plus(e.x, e.y, { color: '#ff8a8a', n: 4 }); },
    hemorrhage: (e, t) => { const T = at(e, t); V.splash(T.x, T.y, { n: 12, speed: 1.2 }); V.puddle(T.x, T.y + 10, { r: 26, color: '#a01028', dark: '#3a0610', dur: 3, bubbles: false, fumes: false }); V.hit(T.x, T.y, '#ff4a5a', 0.7); },
    cauterize: e => { V.flare(e.x, e.y, { n: 10, r: 14, color: '#ff7a1a' }); V.shock(e.x, e.y, { r: 50, color: '#ffb040', dur: 0.3, w: 3 }); V.plus(e.x, e.y, { color: '#ffd070', n: 3 }); },
    bloodlust: (e, t) => { const T = at(e, t); V.aura(e, { color: '#ff2a1a', style: 'flame', dur: 1.2, r: 30, rate: 0.6 }); V.stream(T.x, T.y, e, { color: '#ff2a4a', n: 8 }); V.spikeburst(T.x, T.y, { r: 40, n: 10, color: '#d0203a', core: '#ffd0d0', ink: '#2a0408', dur: 0.3 }); },
    // the blood moon sets: a tide of blood rolls into the boss and runs back to the reaver
    moonburst: (e, t) => { const T = at(e, t), ang = Math.atan2(T.y - e.y, T.x - e.x), L = Math.hypot(T.x - e.x, T.y - e.y);
      V.flash(e.x, e.y - 90, 80, '#ff2a3a', 0.3);
      for (let i = 0; i < 26; i++) { const sp = rand(500, 800), s = rand(-0.35, 0.35); V.spawn({ x: e.x, y: e.y, z: rand(10, 30), vx: Math.cos(ang + s) * sp, vy: Math.sin(ang + s) * sp, vz: rand(20, 80), g: 200, life: Math.min(1, L / sp + 0.1), size: rand(8, 14), color: '#c01a2a', kind: 'drop', add: false, rot: ang + Math.PI / 2 }); }
      FX.later(Math.min(0.6, L / 650), () => { V.spikeburst(T.x, T.y, { r: 80, n: 16, color: '#c01a2a', core: '#ffd0d0', ink: '#2a0408', dur: 0.45 }); V.splash(T.x, T.y, { n: 18, speed: 1.4 }); V.shock(T.x, T.y, { r: 130, color: '#ff2a3a', dur: 0.5, w: 7 }); V.stream(T.x, T.y, e, { color: '#ff3a4a', n: 12 }); shake(6); }); },
    // Runeguard
    runeOverflow: (e, t) => { const T = at(e, t); V.missile(e.x, e.y, T.x, T.y, { style: 'orb', color: '#c8a8ff', speed: 850, size: 0.8, onHit: (x, y) => { V.hit(x, y, '#e0d0ff', 0.6); V.sigil(x, y, { r: 26, style: 'runes', color: '#c8a8ff', dur: 0.4, spin: 6 }); } }); },
    runeBolt: (e, t) => { const T = at(e, t), a = e.angle || 0, sx = e.x - Math.cos(a) * 22, sy = e.y - 30;
      V.missile(sx, sy, T.x, T.y, { style: 'helix', color: '#b18cff', speed: 1000, size: 0.8, onHit: (x, y) => V.hit(x, y, '#d8c4ff', 0.7) }); },
    emergency: e => { V.shield(e, { shape: 'hex', color: '#c8a8ff', dur: 0.8, r: 44 }); V.shock(e.x, e.y, { r: 80, color: '#b18cff', dur: 0.4, w: 5 }); V.burst(e.x, e.y - 20, { color: '#e0d0ff', n: 10, speed: 200, kind: 'star' }); },
    glyphEcho: (e, t) => { const T = at(e, t); V.sigil(T.x, T.y, { r: 40, style: 'runes', color: '#9a6bff', dur: 0.4, spin: 8 }); FX.later(0.3, () => V.crystals(T.x, T.y, { color: '#b28cff', n: 4, r: 28, h: 36, dur: 0.6 })); },
    shatter: e => { for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, sp = rand(120, 260); V.spawn({ x: e.x, y: e.y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 180), g: 500, bounce: true, life: rand(0.5, 0.9), size: rand(7, 11), color: '#e8e0ff', kind: 'shard', add: false, vr: rand(-12, 12) }); }
      V.flash(e.x, e.y - 20, 50, '#e0d4ff', 0.2); V.shock(e.x, e.y, { r: 90, color: '#e0d4ff', dur: 0.4, w: 5 }); },
    wardLeap: e => { V.sigil(e.x, e.y, { r: 46, style: 'hex', color: '#b18cff', dur: 0.6, spin: 4, follow: e }); V.shock(e.x, e.y, { r: 70, color: '#c8a8ff', dur: 0.35, w: 4 }); },
    wardNova: (e, t) => { const T = at(e, t); for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 120 + i * 40, color: '#b18cff', dur: 0.5, w: 6 - i * 2, delay: i * 0.08 }); V.lightning(e.x, e.y, T.x, T.y, { color: '#d8c4ff', jag: 12, dur: 0.3 }); FX.later(0.05, () => V.hit(T.x, T.y, '#c8a8ff', 0.9)); },
    binding: (e, t) => { const T = at(e, t); V.ink(T.x, T.y, { r: 56, dur: 1 }); V.sigil(T.x, T.y, { r: 56, style: 'runes', color: '#b18cff', dur: 1, spin: -3 }); V.lightning(e.x, e.y, T.x, T.y, { color: '#c8a8ff', jag: 8, dur: 0.25 }); },
    mirrorShards: (e, t) => { const T = at(e, t); for (let i = 0; i < 5; i++) FX.later(i * 0.05, () => V.missile(e.x + rand(-16, 16), e.y + rand(-10, 10), T.x + rand(-14, 14), T.y + rand(-8, 8), { style: 'blade', color: '#e8e0ff', speed: 1100, size: 0.5, onHit: (x, y) => V.sparks(x, y, { color: '#ffffff', n: 3 }) })); },
    // Whirling Runes: n rune blades spinning round the warder for 12s, one flashing out at the boss every 2s
    whirl: (e, t, d) => { const n = Math.max(1, Math.min(8, (d && d.n) || 1)), T = t;
      V.fx({ dur: 12, layer: 'air', draw: (c, p, tt, fx) => {
        const k = fade(p, 0.03, 0.05) * fx.a;
        for (let i = 0; i < n; i++) { const a = tt * 3 + i * TAU / n, x = e.x + Math.cos(a) * 46, y = e.y - 18 + Math.sin(a) * 22;
          c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
          V.glowAt(c, 0, 0, 14, '#a070ff', 0.5 * k);
          V.neonPath(c, '#c8a8ff', 1.8, k, () => { c.moveTo(0, -10); c.lineTo(4, 0); c.lineTo(0, 10); c.lineTo(-4, 0); c.closePath(); });
          c.restore(); }
      }, tick: (p, dt, fx) => { fx.s = fx.s || 0; if (T && p * 12 >= (fx.s + 1) * 2) { fx.s++; V.lightning(e.x, e.y, T.x, T.y, { color: '#d0b8ff', jag: 10, dur: 0.22 }); V.hit(T.x, T.y, '#c8a8ff', 0.6); }
        if (Math.random() < 0.2) { const a = Math.random() * TAU; V.spawn({ x: e.x + Math.cos(a) * 46, y: e.y + Math.sin(a) * 22, z: 18, vz: 20, life: 0.5, size: 5, size1: 0, color: '#d8c4ff', kind: 'star' }); } } }); },
    // Ranger
    explode: (e, t, d) => { const T = at(e, t), s = 1 + 0.3 * ((d && d.n) || 0);
      V.spikeburst(T.x, T.y, { r: 56 * s, n: 16, color: '#ff6a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.4 }); V.flare(T.x, T.y, { n: Math.round(14 * s), r: 20 * s });
      V.shock(T.x, T.y, { r: 100 * s, color: '#ffb040', dur: 0.45, w: 6 }); V.debris(T.x, T.y, { n: 6, hot: true, color: '#5a3a2a' }); V.smoke(T.x, T.y, { n: 6, color: '#3a2a2a', size: 30 * s, a: 0.5, speed: 50, life: 1.3 }); shake(3 + 2 * s); },
    falconDive: (e, t) => { const T = at(e, t);
      V.fx({ dur: 0.35, layer: 'air', draw: (c, p, tt, fx) => { const x = T.x - 60 * (1 - p), y = T.y - 30 - 150 * (1 - p); V.glowAt(c, x, y, 20, '#ffe27a', 0.5 * fx.a); bird(c, x, y, 1.1, 0, Math.atan2(150, 60), '#8a5a32', '#ffd27a', fx.a); },
        done: () => { V.hit(T.x, T.y, '#ffe27a', 0.9); V.spawn({ x: T.x, y: T.y, z: 30, vx: rand(-60, 60), vz: rand(30, 80), g: 80, life: 1.1, size: 11, color: '#c8a070', kind: 'feather', add: false, vr: 2, flutter: 3 }); } }); },
    ricochetArrow: (e, t) => { const T = at(e, t), a = Math.random() * TAU; V.missile(T.x, T.y, T.x + Math.cos(a) * 90, T.y + Math.sin(a) * 60, { style: 'arrow', color: '#bfff9a', speed: 1100, onHit: (x, y) => V.hit(x, y, '#d8ffc0', 0.4) }); },
    stormArc: (e, t) => { const T = at(e, t); V.lightning(e.x, e.y, T.x, T.y, { color: '#c8ffb0', jag: 14, dur: 0.25 }); V.hit(T.x, T.y, '#e0ffd0', 0.6); },
    volley: (e, t) => { const T = at(e, t); V.volley(T.x, T.y, { n: 8, r: 46, color: '#bfff9a', wind: 0.12, stay: 1.2 }); },
    deathmark: (e, t) => { const T = at(e, t); V.ink(T.x, T.y, { r: 60, dur: 1.2 }); V.sigil(T.x, T.y, { r: 60, style: 'star4', color: '#ff4a3a', dur: 1.2, spin: -2 }); V.spikeburst(T.x, T.y, { r: 30, n: 8, color: '#ff4a3a', core: '#ffe0d0', ink: '#3a0806', dur: 0.3, z: 40 }); },
    secondWind: e => { V.swirl(e.x, e.y, { r: 50, color: '#8fdf7a', dur: 0.6, follow: e }); V.plus(e.x, e.y, { color: '#9aff8a', n: 5 }); V.motes(e.x, e.y, { kind: 'leaf', color: '#6fbf5a', n: 6, r: 36 }); },
    // Shadowblade
    feint: e => { const a = (e.angle || 0) + Math.PI / 2; V.shadowdash(e.x - Math.cos(a) * 30, e.y - Math.sin(a) * 30, e.x, e.y, { dur: 0.3 }); },
    toxicBurst: (e, t) => { const T = at(e, t); V.splash(T.x, T.y, { color: '#7adf3a', n: 12, speed: 1.2 }); V.puddle(T.x, T.y + 8, { r: 34, color: '#9aff4a', dark: '#1e3a0a', dur: 2.4 }); V.shock(T.x, T.y, { r: 60, color: '#9aff4a', dur: 0.35, w: 4 }); },
    shadowClone: (e, t) => { const T = at(e, t); V.shadowdash(e.x, e.y, T.x, T.y, { color: '#6a3dcf', dur: 0.4 }); FX.later(0.15, () => { V.slash(T.x, T.y, Math.random() * TAU, { r: 50, span: 1.6, color: '#8a5dff', dur: 0.24 }); V.smoke(T.x, T.y, { n: 4, color: '#4a3060', size: 22, a: 0.5, speed: 40 }); }); },
    ambush: (e, t) => { const T = at(e, t); V.spawn({ x: T.x, y: T.y, z: 18, life: 0.3, size: 64, size1: 22, color: '#ff3a5a', kind: 'star', vr: 5 }); V.splash(T.x, T.y, { n: 6 }); },
    dodge: e => { V.smoke(e.x, e.y, { n: 5, color: '#4a3060', size: 22, a: 0.55, speed: 50 }); V.shock(e.x, e.y, { r: 46, color: '#c58aff', dur: 0.3, w: 3 }); },
    garrote: (e, t) => { const T = at(e, t);
      V.fx({ dur: 0.6, layer: 'air', draw: (c, p, tt, fx) => { const k = (1 - p) * fx.a, R = 34 * (1 - p * 0.5); V.neonPath(c, '#ff3a5a', 1.6, k, () => c.ellipse(T.x, T.y - 30, R, R * 0.4, 0, 0, TAU)); } });
      FX.later(0.3, () => { V.splash(T.x, T.y, { n: 8 }); V.hit(T.x, T.y, '#ff6a7a', 0.6); }); },
    blossomEnd: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 80, n: 18, color: '#d0204a', core: '#ffe0ec', ink: '#2a0410', dur: 0.45 }); V.splash(T.x, T.y, { n: 16, speed: 1.4 });
      V.burst(T.x, T.y - 20, { color: '#ff7ab0', color2: '#ffffff', n: 16, speed: 260, kind: 'petal' }); V.shock(T.x, T.y, { r: 120, color: '#ff4d9a', dur: 0.5, w: 6 }); shake(6); },
    // Pyromancer
    haze: e => { for (let i = 0; i < 6; i++) V.spawn({ x: e.x + rand(-20, 20), y: e.y + rand(-6, 6), z: rand(0, 20), vz: rand(20, 50), life: 1, size: 20, size1: 36, color: '#ffb070', kind: 'smoke', add: false, a: 0.25 }); },
    hurry: e => { V.shock(e.x, e.y, { r: 50, color: '#ffb040', dur: 0.3, w: 3 }); V.sparks(e.x, e.y, { color: '#ffd070', n: 6, speed: 260 }); },
    flashpoint: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 60, n: 14, color: '#ff5a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 }); V.flare(T.x, T.y, { n: 14, r: 18 }); shake(4); },
    chainReact: (e, t) => { const T = at(e, t); for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; V.lightning(T.x, T.y, T.x + Math.cos(a) * 70, T.y + Math.sin(a) * 45, { color: '#ffb070', jag: 8, dur: 0.2 }); } V.flare(T.x, T.y, { n: 8, r: 14 }); },
    twinFlame: (e, t) => { const T = at(e, t); for (const s of [-1, 1]) V.missile(e.x, e.y, T.x, T.y, { style: 'fire', color: '#ff7a1a', speed: 800, arc: 30 * s, onHit: (x, y) => V.flare(x, y, { n: 8, r: 14 }) }); },
    bombPlant: (e, t) => { const T = at(e, t); V.sigil(T.x, T.y, { r: 44, style: 'runes', color: '#ff8a2a', dur: 0.8, spin: 4 }); V.glint(T.x, T.y, { color: '#ffb040', size: 26, z: 30 }); },
    bomb: (e, t) => { const T = at(e, t); V.spikeburst(T.x, T.y, { r: 70, n: 16, color: '#ff5a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.4 }); V.crater(T.x, T.y, { r: 50, color: '#ff4a1a', dur: 2.2, flames: 3, a: 0.5 }); V.flare(T.x, T.y, { n: 18, r: 22 }); shake(5); },
    // Cleric
    petalBloom: e => { V.motes(e.x, e.y, { kind: 'petal', color: '#ffc0dc', n: 8, r: 34, rise: 0.6 }); V.shock(e.x, e.y, { r: 50, color: '#ffc0dc', dur: 0.35, w: 3 }); },
    sunfall: (e, t) => { const T = at(e, t); V.lightfall(T.x, T.y, { color: '#ffe680', r: 30, h: 280, dur: 0.6, feathers: 0 }); FX.later(0.15, () => V.burst(T.x, T.y, { color: '#ffe680', color2: '#ffffff', n: 12, speed: 220, kind: 'star' })); },
    petalfall: (e, t) => { const T = at(e, t); for (let i = 0; i < 12; i++) V.spawn({ x: T.x + rand(-40, 40), y: T.y + rand(-12, 12), z: rand(80, 140), vz: rand(-90, -60), vx: rand(-20, 20), life: 1.2, size: 11, color: i % 2 ? '#ffc0dc' : '#fff2a0', kind: 'petal', add: false, vr: rand(-3, 3), flutter: 5 }); FX.later(0.5, () => V.hit(T.x, T.y, '#ffd0e4', 0.6)); },
    purify: (e, t) => { const w = t || e; V.sigil(w.x, w.y, { r: 40, style: 'star4', color: '#ffffff', dur: 0.6, spin: 4, follow: w }); V.burst(w.x, w.y - 20, { color: '#ffffff', color2: '#fff2a0', n: 10, speed: 180, kind: 'star' }); },
    chorus: e => { V.ribbons(e.x, e.y, { r: 60, dur: 1.2, follow: e, colors: ['#ffe680', '#ffffff', '#ffc0dc'] }); V.shock(e.x, e.y, { r: 160, color: '#ffe680', dur: 0.6, w: 5 }); },
    twinBless: (e, t) => { if (t && t !== e) V.beam(e.x, e.y, t.x, t.y, { color: '#fff2b0', w: 6, dur: 0.35 }); const w = t || e; V.plus(w.x, w.y, { color: '#fff2a0', n: 5 }); V.burst(w.x, w.y - 20, { color: '#ffe680', n: 8, speed: 160, kind: 'star', flash: false }); },
    // Grovekeeper
    lastBlossom: (e, t) => { const w = t || e; V.burst(w.x, w.y - 10, { color: '#ffb8e0', color2: '#ffffff', n: 10, speed: 160, kind: 'petal', flash: false }); V.plus(w.x, w.y, { color: '#9aff8a', n: 4 }); },
    spill: e => { V.splash(e.x, e.y, { color: '#8aff6a', n: 10, speed: 0.8 }); V.shock(e.x, e.y, { r: 110, color: '#8aff6a', dur: 0.5, w: 4 }); V.motes(e.x, e.y, { kind: 'leaf', color: '#6fbf5a', n: 8, r: 80 }); },
    ironbark: (e, t) => { const w = t || e; V.shield(w, { shape: 'hex', color: '#b08a5a', dur: 5, r: 38 }); V.crystals(w.x, w.y, { color: '#8a6a3a', n: 5, r: 24, h: 30, dur: 0.6 }); },
    pulse: e => { for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 140 + i * 40, color: '#8aff6a', dur: 0.55, w: 5 - i * 2, delay: i * 0.1 }); V.plus(e.x, e.y, { color: '#9aff8a', n: 4 }); },
    natureWrath: (e, t) => { const T = at(e, t); V.crystals(T.x, T.y, { color: '#5fbf4a', n: 8, r: 40, h: 56, dur: 0.8 }); V.spikeburst(T.x, T.y, { r: 46, n: 12, color: '#4fa03a', core: '#e8ffc0', ink: '#0e2a08', dur: 0.32 }); shake(3); },
    thickBark: e => { V.shield(e, { shape: 'hex', color: '#b08a5a', dur: 1.2, r: 40 }); V.debris(e.x, e.y, { n: 4, color: '#6a5034' }); },
    seedBurst: (e, t) => { const w = t || e; V.lightfall(w.x, w.y, { color: '#b0ff8a', r: 30, h: 220, dur: 0.8, feathers: 0 }); V.grove(w.x, w.y, { r: 70, dur: 1.6, flowers: 6, follow: w }); V.plus(w.x, w.y, { color: '#9aff8a', n: 8 }); },
    treantSlam: (e, t) => { const T = at(e, t), x = T.x + 30, y = T.y + 10; V.shock(x, y, { r: 80, color: '#8aff6a', dur: 0.4, w: 5 }); V.decal(x, y, { style: 'crack', r: 44, dur: 2, a: 0.55, seed: Math.random() * 6 });
      V.debris(x, y, { n: 5, color: '#6a5034' }); V.motes(x, y, { kind: 'leaf', color: '#6fbf5a', n: 5, r: 30 }); shake(3); },
    // Chronomancer
    dejavu: e => { V.ribbons(e.x, e.y, { r: 46, dur: 0.9, dir: -1, follow: e, colors: ['#9fe8ff', '#e0d4ff', '#ffd27a'] }); },
    futureMark: (e, t) => { const T = at(e, t); V.ink(T.x, T.y, { r: 50, dur: 6 }); V.sigil(T.x, T.y, { r: 50, style: 'clock', color: '#9fe8ff', dur: 6, spin: 0.6 }); },
    futureBurst: (e, t) => { const T = at(e, t); V.burst(T.x, T.y, { color: '#9fe8ff', color2: '#ffffff', n: 16, speed: 240, kind: 'star' }); V.shock(T.x, T.y, { r: 80, color: '#9fe8ff', dur: 0.4, w: 5 }); },
    clockStrike: (e, t) => { const T = at(e, t); V.lightning(e.x, e.y - 104, T.x, T.y, { color: '#ffe6a8', jag: 12, dur: 0.3 }); V.hit(T.x, T.y, '#ffd27a', 0.8); V.plus(e.x, e.y, { color: '#ffe6a8', n: 3 }); },
    secondChance: (e, t) => { const w = t || e; V.sigil(w.x, w.y, { r: 60, style: 'clock', color: '#9fe8ff', dur: 1, spin: -4, follow: w }); V.lightfall(w.x, w.y, { color: '#bff0ff', r: 30, h: 240, dur: 0.7, feathers: 0 }); },
  });
  for (const n of AIMED) KIT_VFX[n].atTarget = true;
})();

// ======================================================================= painted pass: Marionettist, Thermist, Driftblade
// Building blocks for these three classes' moves and Ultimates, after their reference sheets in docs/art/vfx-reference
// (marionettist.png, thermist.png, driftblade.png: WINDUP, IMPACT, AFTERMATH). Floor marks that linger stay faint, so a
// boss telegraph under them still reads; the bright shapes are short. Particle counts are capped per call.
// MARI_PAINT: red velvet, rose petals, footlights, a spotlight, gold strings, little ivory dolls, a rose sigil.
const MARI_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const C = { CRIM: '#e0203c', ROSE: '#ff5a7a', PINK: '#ffb0c4', GOLD: '#ffd27a', AMBER: '#ffcf6a', VEL: '#8a1028', VEL2: '#c0203a', INK: '#2a0410', CORE: '#fff0e6', IVORY: '#f4e4d2' };
  const PET = [C.CRIM, C.ROSE, C.VEL2, '#ff7a94'];
  // rose petals: 'burst' flings them out of (x, y) to settle round it; 'fall' lets them drift down over a radius r
  function petals(x, y, o = {}) {
    const n = Math.min(24, o.n ?? 10), fall = o.mode === 'fall', r = o.r ?? 0;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU2, sp = rand(0.4, 1) * (o.speed ?? 200), d = Math.sqrt(Math.random()) * r;
      V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.62, z: fall ? rand(50, 110) : (o.z ?? 20), vx: fall ? rand(-20, 20) : Math.cos(a) * sp, vy: fall ? rand(-6, 6) : Math.sin(a) * sp * 0.62,
        vz: fall ? rand(-30, -10) : rand(60, 200), g: fall ? 40 : 320, drag: fall ? 0.03 : 0.05, life: rand(0.75, 1) * (o.life ?? 1.7), size: rand(8, 12) * (o.size ?? 1),
        color: PET[i % PET.length], kind: 'petal', add: false, a: o.a ?? 0.9, vr: rand(-5, 5), flutter: rand(4, 9), fadeIn: 0.04, fadePow: 4 });
    }
  }
  // a little marionette (ivory, crimson skirt) standing at (x, y): s scales it, lean tips it into a lunge
  function doll(c, x, y, s, a, lean = 0, body = C.IVORY) {
    if (a <= 0.02) return;
    V.glowAt(c, x, y - 14 * s, 15 * s, C.ROSE, 0.3 * a);
    c.save(); c.translate(x, y); c.rotate(lean); c.scale(s, s); c.globalAlpha = Math.min(1, a);
    const limbs = () => { c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, -10); c.moveTo(3, 0); c.lineTo(1, -10); c.moveTo(0, -12); c.lineTo(0, -19);
      c.moveTo(-8, -26); c.lineTo(0, -18); c.lineTo(8, -26); c.stroke(); };
    // (scale-up pass) a dark ink outline under the limbs, skirt and head so the doll reads on any floor
    c.lineCap = 'round'; c.strokeStyle = C.INK; c.lineWidth = 4.2; limbs();
    c.fillStyle = C.INK; c.beginPath(); c.ellipse(0, -11, 8.4, 4.2, 0, 0, TAU2); c.fill(); c.beginPath(); c.arc(0, -23.4, 4.8, 0, TAU2); c.fill();
    c.strokeStyle = body; c.lineWidth = 2.2; limbs();
    c.fillStyle = C.VEL2; c.beginPath(); c.ellipse(0, -11, 7, 3, 0, 0, TAU2); c.fill();
    c.fillStyle = C.GOLD; c.fillRect(-6, -11.6, 12, 1.2);
    c.fillStyle = body; c.beginPath(); c.arc(0, -23, 3.4, 0, TAU2); c.fill();
    c.fillStyle = C.CRIM; c.beginPath(); c.arc(0, -24.5, 3.6, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.restore(); c.globalAlpha = 1;
  }
  // a bright crimson X: two blades flash out from the middle, white at the heart, ink under; o.scar leaves faint cuts on the floor
  function xcut(x, y, o = {}) {
    const r = o.r ?? 60, a = o.a ?? 0.6, w = o.w ?? 7, dur = o.dur ?? 0.36, z = o.z ?? 12, col = o.color || C.CRIM, angs = [a, Math.PI - a];
    const lens = (c, L, ww) => { c.beginPath(); c.moveTo(-L, 0); c.quadraticCurveTo(0, -ww, L, 0); c.quadraticCurveTo(0, ww, -L, 0); c.fill(); };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.18)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7)), L = r * q;
      c.save(); c.translate(x, y - z);
      for (const an of angs) {
        c.save(); c.rotate(an);
        c.globalAlpha = 0.3 * k; c.fillStyle = C.INK; lens(c, L * 1.04, w * 1.5);
        c.globalCompositeOperation = 'lighter';
        for (const [cl, ww, al] of [[col, w * 2.2, 0.35], [col, w, 0.9], ['#ffffff', w * 0.35, 0.95]]) { c.globalAlpha = al * k; c.fillStyle = cl; lens(c, L, ww); }
        c.restore();
      }
      c.restore();
      V.glowAt(c, x, y - z, r * 0.45, col, 0.6 * k);
    } });
    if (o.scar) V.fx({ dur: o.scar, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * (o.scarA ?? 0.55);
      for (const an of angs) { const dx = Math.cos(an) * r * 0.9, dy = Math.sin(an) * r * 0.9 * 0.62; V.neonPath(c, col, 1.7, k, () => { c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); }); }
    } });
  }
  // the stage: a gold ring with a compass on its floor and footlights round its front, velvet drapes framing it at the
  // back (they swing open over the first 0.35s), the valance across the top
  function stage(x, y, o = {}) {
    const R = o.r ?? 110, dur = o.dur ?? 1.1, F = 0.62, sk = R / 110, adur = o.airDur ?? dur;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.15, (dur - t) / 0.3) * e.a, open = easeOut(Math.min(1, t / 0.3)), RR = R * (0.7 + 0.3 * open);
      c.globalAlpha = 0.18 * k; c.fillStyle = '#1a0408'; c.beginPath(); c.ellipse(x, y, RR, RR * F, 0, 0, TAU2); c.fill(); c.globalAlpha = 1;
      V.neonRing(c, x, y, RR, C.GOLD, 1.8 * sk, 0.85 * k, F);
      V.neonRing(c, x, y, RR * 0.88, C.GOLD, 0.8 * sk, 0.5 * k, F);
      V.neonRing(c, x, y, RR * 0.34, C.GOLD, 0.8 * sk, 0.4 * k, F);
      c.save(); c.translate(x, y); c.scale(1, F);
      V.neonPath(c, C.GOLD, 0.9 * sk, 0.42 * k, () => { for (let i = 0; i < 8; i++) { const a = i * TAU2 / 8 + t * 0.3, r1 = RR * (i % 2 ? 0.45 : 0.8); c.moveTo(Math.cos(a) * RR * 0.12, Math.sin(a) * RR * 0.12); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } });
      c.restore();
      // footlights: little dark lamp housings with a warm flame in each, round the front of the ring
      for (let i = 0; i < 13; i++) {
        const a = -0.15 * Math.PI + i * 1.3 * Math.PI / 12, px = x + Math.cos(a) * RR * 1.04, py = y + Math.sin(a) * RR * F * 1.04, fl = 0.7 + 0.15 * Math.sin(t * 13 + i * 1.7);
        c.globalAlpha = 0.8 * k * open; c.fillStyle = C.INK; c.fillRect(px - 4 * sk, py - 2 * sk, 8 * sk, 5 * sk); c.globalAlpha = 1;
        V.glowAt(c, px, py - 3 * sk, 15 * sk, C.AMBER, k * fl * open); V.glowAt(c, px, py - 3 * sk, 4.5 * sk, '#ffffff', k * open);
      }
    } });
    V.fx({ dur: adur, layer: 'air', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.12, (adur - t) / 0.3) * e.a, open = 0.35 + 0.65 * easeOut(Math.min(1, t / 0.35));
      const H = R * 1.05, top = y - R * F - H + 20, bot = top + H, W = R + 24, io = (W - R * 0.42) * open;
      c.save();
      for (const s of [-1, 1]) {
        const xo = x + s * W, xi = x + s * io, g = c.createLinearGradient(xi, 0, xo, 0);
        g.addColorStop(0, C.VEL2); g.addColorStop(1, '#4a0614');
        c.globalAlpha = 0.85 * k; c.fillStyle = g;
        c.beginPath(); c.moveTo(xo, top); c.lineTo(xi, top); c.quadraticCurveTo(xi + s * 8, top + H * 0.55, xi - s * 4 + Math.sin(t * 3) * 2, bot); c.lineTo(xo, bot + 6); c.closePath(); c.fill();
        c.globalAlpha = 0.5 * k; c.strokeStyle = '#ff6a7e'; c.lineWidth = 1.2 * sk;
        for (let i = 1; i < 5; i++) { const fx = xi + (xo - xi) * i / 5; c.beginPath(); c.moveTo(fx, top + 6); c.quadraticCurveTo(fx + s * 3 * sk, top + H * 0.5, fx - s * 2 * sk, bot); c.stroke(); }
        c.globalAlpha = 0.6 * k; c.strokeStyle = '#2a0410'; c.lineWidth = 1.6 * sk;
        for (let i = 1; i < 5; i++) { const fx = xi + (xo - xi) * (i - 0.5) / 5; c.beginPath(); c.moveTo(fx, top + 6); c.quadraticCurveTo(fx + s * 3 * sk, top + H * 0.5, fx - s * 2 * sk, bot); c.stroke(); }
        c.globalAlpha = 0.9 * k; c.strokeStyle = C.GOLD; c.lineWidth = 2 * sk; c.beginPath(); c.moveTo(xi - s * 4, bot); c.lineTo(xo, bot + 6); c.stroke();
        V.glowAt(c, xi - s * 4, bot - H * 0.35, 6 * sk, C.GOLD, 0.8 * k);   // a gold tie-back on each drape
      }
      const x0 = x - W - 6, x1 = x + W + 6, step = (x1 - x0) / 8, vh = 14 * sk;
      c.globalAlpha = 0.9 * k; c.fillStyle = C.VEL;
      c.beginPath(); c.moveTo(x0, top - vh); c.lineTo(x1, top - vh); c.lineTo(x1, top + 2);
      for (let i = 1; i <= 8; i++) { const fx = x1 - step * i; c.quadraticCurveTo(fx + step / 2, top + vh, fx, top + 2); }
      c.closePath(); c.fill();
      c.strokeStyle = C.GOLD; c.lineWidth = 1.5 * sk; c.stroke();
      c.restore();
    } });
  }
  // phantom dolls let down on gold strings round a ring; at `hit` they lunge across the middle in pairs (an X of cuts)
  function troupe(x, y, o = {}) {
    const R = o.r ?? 90, n = o.n ?? 4, hit = o.hit ?? 0.45, F = 0.62, dur = hit + 0.22, ds = o.ds ?? 1.15;
    const pos = Array.from({ length: n }, (_, i) => { const a = Math.PI / 4 + i * TAU2 / n; return [x + Math.cos(a) * R, y + Math.sin(a) * R * F]; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      for (let i = 0; i < n; i++) {
        const [px, py] = pos[i], [qx, qy] = pos[(i + Math.floor(n / 2)) % n];
        if (t < hit) {
          // let down on gold strings from a little wooden control bar (the cross of a marionette) that sways above it
          const q = easeOut(Math.min(1, t / (hit * 0.75))), z = 60 * ds * (1 - q), k = e.a * Math.min(1, t / 0.12), sw = Math.sin(t * 9 + i) * 0.12;
          const hy = py - z - 26 * ds, by = hy - 70 * ds, bx = px + sw * 30 * ds, bw = 11 * ds;
          V.neonPath(c, C.GOLD, 0.7 * ds, 0.7 * k, () => { c.moveTo(px, by - 160); c.lineTo(bx, by); c.moveTo(bx - bw, by); c.lineTo(px - 8 * ds, hy); c.moveTo(bx + bw, by); c.lineTo(px + 8 * ds, hy); c.moveTo(bx, by); c.lineTo(px, hy + 2 * ds); });
          c.globalAlpha = 0.95 * k; c.strokeStyle = '#7a4a22'; c.lineWidth = 2.6 * ds; c.lineCap = 'round';
          c.beginPath(); c.moveTo(bx - bw, by); c.lineTo(bx + bw, by); c.moveTo(bx, by - bw * 0.6); c.lineTo(bx, by + bw * 0.6); c.stroke(); c.globalAlpha = 1;
          V.glowAt(c, bx, by, 6 * ds, C.GOLD, 0.6 * k);
          doll(c, px, py - z, ds, 0.95 * k, sw);
        } else {
          const u = Math.min(1, (t - hit) / 0.2), m = easeOut(u), dx = px + (qx - px) * m, dy = py + (qy - py) * m, k = e.a * (1 - u);
          V.neonPath(c, i % 2 ? C.ROSE : C.GOLD, 3 * ds / 1.15, 0.75 * k, () => { c.moveTo(px, py - 14 * ds); c.lineTo(dx, dy - 14 * ds); });
          doll(c, dx, dy, ds, k, (qx > px ? 1 : -1) * 0.35);
        }
      }
    } });
  }
  // a spotlight from above: a soft warm cone and a pool of light on the floor (lighter, faint: it lingers)
  function spotlight(x, y, o = {}) {
    const r = o.r ?? 60, h = o.h ?? 300, dur = o.dur ?? 2.2, al = o.a ?? 0.18;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = Math.min(1, t / 0.25, (dur - t) / 0.8) * e.a * al;
      if (k < 0.01) return;
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, rgba(C.AMBER, 0)); g.addColorStop(1, rgba(C.AMBER, Math.min(1, k)));
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 10, y - h); c.lineTo(x + 10, y - h); c.lineTo(x + r, y); c.lineTo(x - r, y); c.closePath(); c.fill();
      c.globalAlpha = Math.min(1, 0.8 * k); c.fillStyle = C.AMBER; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, TAU2); c.fill();
      c.globalAlpha = 1;
    } });
  }
  // the rose sigil: a gold ring and a crimson one, four spokes, and a rose of three whorls in the middle
  function roseSigil(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 2.6, al = o.a ?? 0.5, F = 0.62, spin = rand(0, TAU2), sk = Math.max(1, r / 90), posts = o.posts ?? 0;
    V.fx({ dur, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, k = Math.min(1, t / 0.3, (dur - t) / 0.9) * e.a * al, R = r * (0.85 + 0.15 * easeOut(Math.min(1, t / 0.4)));
      if (k < 0.01) return;
      V.neonRing(c, cx, cy, R, C.GOLD, 1.4 * sk, k, F);
      V.neonRing(c, cx, cy, R * 0.8, C.CRIM, 0.9 * sk, 0.7 * k, F);
      // (scale-up pass) o.posts: little gold stanchions round the rim with velvet-gold ropes drooping between them
      if (posts) {
        const pp = Array.from({ length: posts }, (_, i) => { const a = spin + (i + 0.5) * TAU2 / posts; return [cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12 * F]; });
        V.neonPath(c, C.GOLD, 0.9 * sk, 0.75 * k, () => { for (let i = 0; i < posts; i++) { const [ax, ay] = pp[i], [bx, by] = pp[(i + 1) % posts]; c.moveTo(ax, ay - 22 * sk); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - 8 * sk, bx, by - 22 * sk); } });
        for (const [px, py] of pp) { V.neonPath(c, C.GOLD, 1.3 * sk, k, () => { c.moveTo(px, py); c.lineTo(px, py - 26 * sk); }); V.glowAt(c, px, py - 27 * sk, 6 * sk, C.AMBER, k); }
      }
      c.save(); c.translate(cx, cy); c.scale(1, F);
      V.neonPath(c, C.GOLD, 0.8 * sk, 0.6 * k, () => { for (let i = 0; i < 4; i++) { const a = spin + i * TAU2 / 4 + t * 0.15; c.moveTo(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32); c.lineTo(Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08); } });
      const rr = R * 0.28;
      for (let j = 0; j < 3; j++) {
        const rad = rr * (1 - j * 0.3); c.fillStyle = [C.VEL, C.VEL2, C.ROSE][j]; c.globalAlpha = Math.min(0.62, 1.1 * k);
        for (let i = 0; i < 5; i++) { const a = spin + i * TAU2 / 5 + j * 0.63; c.beginPath(); c.ellipse(Math.cos(a) * rad * 0.42, Math.sin(a) * rad * 0.42, rad * 0.55, rad * 0.36, a, 0, TAU2); c.fill(); }
      }
      c.globalAlpha = 1; c.restore();
      V.glowAt(c, cx, cy, rr * 1.6, C.ROSE, 0.6 * k);
    } });
  }
  // Pirouette: tilted rings of light spinning round a Doll, rose, gold and crimson
  function spinRings(x, y, o = {}) {
    const r = o.r ?? 56, dur = o.dur ?? 0.7;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.4), grow = easeOut(Math.min(1, p / 0.35));
      const sk = Math.max(1, r / 56);
      for (let i = 0; i < 4; i++) {
        const R = r * (0.6 + 0.2 * i) * (0.6 + 0.4 * grow), tilt = [-0.25, 0.15, 0, -0.08][i], a0 = t * (14 - i * 3) * (i % 2 ? -1 : 1) + i * 2, zz = 12 + i * 6;
        V.neonPath(c, [C.ROSE, C.GOLD, C.CRIM, C.PINK][i], (2.8 - i * 0.5) * sk, k * 0.9, () => c.ellipse(x, y - zz, R, R * 0.36, tilt, a0, a0 + 2.6));
      }
      V.neonRing(c, x, y, r * 0.95 * (0.6 + 0.4 * grow), C.ROSE, 1.2 * sk, 0.5 * k, 0.62);
      V.glowAt(c, x, y - 16, r * 0.6, C.ROSE, 0.35 * k);
    } });
  }
  // Swap: pale afterimages strung along the way from a to b, with a thin rose string through them
  function ghostTrail(ax, ay, bx, by, o = {}) {
    const dur = o.dur ?? 0.45, n = 4, mx = (ax + bx) / 2, my = (ay + by) / 2 - 30, s = o.s ?? 1.5;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p);
      V.neonPath(c, C.ROSE, 1.4, 0.6 * k, () => { c.moveTo(ax, ay - 16); c.quadraticCurveTo(mx, my - 16, bx, by - 16); });
      for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, u = 1 - q, gx = u * u * ax + 2 * u * q * mx + q * q * bx, gy = u * u * ay + 2 * u * q * my + q * q * by;
        doll(c, gx, gy + 6, s, k * (0.15 + 0.35 * q), 0, C.PINK); }
    } });
  }
  // Doll Summon: three gold strings let down onto a Doll and a crimson ribbon spiralling down round it as it lands
  function dollDrop(x, y, o = {}) {
    const dur = o.dur ?? 0.55, s1 = o.s ?? 1.3;   // (scale-up pass) s1: overall size, 1.3 by default
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.4), drop = easeOut(Math.min(1, p / 0.5));
      V.neonPath(c, C.GOLD, 1.1, 0.75 * k, () => { for (const dx of [-7, 0, 7]) { c.moveTo(x + dx * 1.6 * s1, y - 240); c.lineTo(x + dx * s1, y - 26 * s1); } });
      for (const [col, w, ph] of [[C.CRIM, 2.4, 0], [C.ROSE, 1.2, Math.PI]]) V.neonPath(c, col, w * s1, k, () => { for (let s = 0; s <= 20; s++) { const q = s / 20, a = q * 9 + t * 10 + ph, rr = (14 + 8 * q) * s1, px = x + Math.cos(a) * rr, py = y - 6 - 84 * s1 * (1 - q) * (1.2 - drop) + Math.sin(a) * rr * 0.35; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      V.glowAt(c, x, y - 20 * s1, 22 * s1, C.ROSE, 0.35 * k);
    } });
    V.fx({ dur: 0.55, delay: 0.12, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * (1 - p); V.neonRing(c, x, y, (26 + 18 * easeOut(p)) * s1, C.ROSE, 1.8, k, 0.62); V.neonRing(c, x, y, (18 + 10 * easeOut(p)) * s1, C.GOLD, 1.2, 0.8 * k, 0.62); } });
  }
  return { C, petals, doll, xcut, stage, troupe, spotlight, roseSigil, spinRings, ghostTrail, dollDrop };
})();

// THERM_PAINT: frost blue against orange fire: a clock dial, a crown of rising ice, shards, steam, lava cracks, a frost rim
const THERM_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), F = 0.62;
  const FIRE = '#ff8a3a', ICE = '#6fb2f0';
  // ice shards flung out of (x, y) (o.angle aims them in a cone); they tumble, fall and break
  function shards(x, y, o = {}) {
    const n = Math.min(18, o.n ?? 10), aim = o.angle;
    for (let i = 0; i < n; i++) {
      const a = aim != null ? aim + rand(-1, 1) * (o.spread ?? 0.6) : Math.random() * TAU2, sp = rand(0.4, 1) * (o.speed ?? 300);
      V.spawn({ x, y, z: o.z ?? 16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.62, vz: rand(80, 260), g: 600, drag: 0.03, life: rand(0.5, 0.9) * (o.life ?? 1), size: rand(9, 15) * (o.size ?? 1),
        color: i % 3 ? (o.color || '#9fd8ff') : '#e8f8ff', kind: 'shard', add: false, vr: rand(-10, 10), fadePow: 3 });
    }
  }
  const steam = (x, y, o = {}) => V.smoke(x, y, { n: Math.min(8, o.n ?? 4), r: o.r ?? 30, color: '#e8eef4', size: o.size ?? 26, a: o.a ?? 0.3, speed: 25, life: o.life ?? 1.8 });
  // glowing cracks in the floor that cool (Flare's aftermath): ink first, the heat inside them fading out
  function lavaCracks(x, y, o = {}) {
    const r = o.r ?? 40, dur = o.dur ?? 2, n = o.n ?? 7;
    const cr = Array.from({ length: n }, (_, i) => { const a = i / n * TAU2 + rand(-0.3, 0.3); let px = 0, py = 0; const pts = [[0, 0]]; for (let s = 0; s < 3; s++) { const aa = a + rand(-0.6, 0.6), L = r * rand(0.25, 0.4); px += Math.cos(aa) * L; py += Math.sin(aa) * L * F; pts.push([px, py]); } return pts; });
    const trace = c => { for (const pts of cr) { c.moveTo(x + pts[0][0], y + pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(x + pts[i][0], y + pts[i][1]); } };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * (o.a ?? 0.6), heat = Math.max(0, 1 - p * 1.2);
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha = k * 0.7; c.strokeStyle = '#1a0a04'; c.lineWidth = 3; c.beginPath(); trace(c); c.stroke();
      if (heat > 0.02) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * heat; c.strokeStyle = o.color || '#ff6a1a'; c.lineWidth = 1.8; c.beginPath(); trace(c); c.stroke();
        c.strokeStyle = '#ffd070'; c.lineWidth = 0.7; c.beginPath(); trace(c); c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha = 1;
      V.glowAt(c, x, y, r * 0.5, '#ff6a1a', 0.3 * k * heat);
    } });
  }
  // a frosted rim round a crater: a pale band and a ring of little ice spikes pointing out
  function frostRim(x, y, o = {}) {
    const r = o.r ?? 80, dur = o.dur ?? 3, n = o.n ?? 18;
    const sp = Array.from({ length: n }, (_, i) => ({ a: i / n * TAU2 + rand(-0.12, 0.12), l: rand(0.12, 0.3), w: rand(0.05, 0.09) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.2, (1 - p) / 0.5) * (o.a ?? 0.45);
      if (k < 0.01) return;
      c.save(); c.translate(x, y); c.scale(1, F);
      c.globalAlpha = k * 0.35; c.fillStyle = '#cfeeff'; c.beginPath(); c.arc(0, 0, r * 1.12, 0, TAU2); c.arc(0, 0, r * 0.9, 0, TAU2, true); c.fill();
      c.globalAlpha = k; c.fillStyle = '#e8f8ff'; c.strokeStyle = 'rgba(40,80,120,0.6)'; c.lineWidth = 1;
      for (const s of sp) { const r0 = r * 0.95, r1 = r * (1 + s.l); c.beginPath(); c.moveTo(Math.cos(s.a - s.w) * r0, Math.sin(s.a - s.w) * r0); c.lineTo(Math.cos(s.a) * r1, Math.sin(s.a) * r1); c.lineTo(Math.cos(s.a + s.w) * r0, Math.sin(s.a + s.w) * r0); c.closePath(); c.fill(); c.stroke(); }
      c.restore(); c.globalAlpha = 1;
      V.neonRing(c, x, y, r, '#8fd0ff', 1.2 * Math.max(1, r / 80), 0.6 * k, F);
    } });
  }
  // the dial: a frost clock face, its hands racing, an orange and a blue arc whirling round its rim
  function dialSeal(x, y, o = {}) {
    const r = o.r ?? 100, dur = o.dur ?? 0.75, follow = o.follow, sk = Math.max(1, r / 100);
    V.ink(x, y, { r: r * 1.05, dur, flat: F, a: 0.4, follow });
    V.fx({ dur, layer: 'ground', follow, draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, t / 0.12, (1 - p) / 0.2), R = r * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3)));
      V.neonRing(c, cx, cy, R, '#8fd0ff', 2.2 * sk, k, F); V.neonRing(c, cx, cy, R * 0.72, '#bfe6ff', 1 * sk, 0.7 * k, F);
      c.save(); c.translate(cx, cy); c.scale(1, F);
      V.neonPath(c, '#cfeeff', 1.2 * sk, 0.8 * k, () => { for (let i = 0; i < 12; i++) { const a = i * TAU2 / 12, r1 = R * (i % 3 ? 0.84 : 0.76); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); } });
      V.neonPath(c, '#ffffff', 2 * sk, k, () => { c.moveTo(0, 0); c.lineTo(Math.cos(t * 9) * R * 0.62, Math.sin(t * 9) * R * 0.62); c.moveTo(0, 0); c.lineTo(Math.cos(t * 2) * R * 0.4, Math.sin(t * 2) * R * 0.4); });
      const a = t * (o.spin ?? 8);
      V.neonPath(c, FIRE, 4 * sk, k, () => c.arc(0, 0, R * 1.15, a, a + 1.4));
      V.neonPath(c, ICE, 4 * sk, k, () => c.arc(0, 0, R * 1.15, a + Math.PI, a + Math.PI + 1.4));
      // (scale-up pass) a big seal gets a second, wider pair of arcs whirling the other way
      if (sk > 1.2) { const b = -t * (o.spin ?? 8) * 0.7 + 1; V.neonPath(c, FIRE, 2.6 * sk, 0.8 * k, () => c.arc(0, 0, R * 1.34, b, b + 1.1)); V.neonPath(c, ICE, 2.6 * sk, 0.8 * k, () => c.arc(0, 0, R * 1.34, b + Math.PI, b + Math.PI + 1.1)); }
      c.restore();
    } });
  }
  // a crown of frost crystals rising round a ring, leaning out; they shatter into shards when it ends
  function crystalCrown(x, y, o = {}) {
    const r = o.r ?? 80, n = Math.min(20, o.n ?? 10), dur = o.dur ?? 0.72, h = o.h ?? 70, ws = o.ws ?? 1, lean = o.lean ?? 0.45;
    const cs = Array.from({ length: n }, (_, i) => { const a = i / n * TAU2 + rand(-0.15, 0.15); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * F, a, h: h * rand(0.7, 1.25), w: rand(7, 11) * ws, d: rand(0, 0.25) }; }).sort((u, v) => u.y - v.y);
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1);
      for (const s of cs) {
        const g = easeOut(Math.max(0, Math.min(1, (t - s.d) / 0.4))); if (g <= 0) continue;
        const hh = s.h * g, tx = s.x + Math.cos(s.a) * lean * hh, ty = s.y - hh;
        c.globalAlpha = k * 0.9; c.fillStyle = '#5fb4f0'; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w, s.y); c.lineTo(s.x, s.y + s.w * 0.4); c.closePath(); c.fill();
        c.fillStyle = 'rgba(240,250,255,0.75)'; c.beginPath(); c.moveTo(s.x - s.w * 0.15, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w * 0.55, s.y); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(8,32,58,0.75)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - s.w, s.y); c.lineTo(tx, ty); c.lineTo(s.x + s.w, s.y); c.stroke();
        c.globalAlpha = 1;
        V.glowAt(c, tx, ty, 8 * ws, '#e8f8ff', 0.6 * k * g);
      }
      c.globalAlpha = 1;
    }, done: () => { for (let i = 0; i < cs.length; i += 2) shards(cs[i].x, cs[i].y, { n: 2, z: cs[i].h * 0.5, speed: 220 }); } });
  }
  // fire and frost wound together: two orange and two blue arms spiralling in on (x, y)
  function swirl2(x, y, o = {}) {
    const r = o.r ?? 70, dur = o.dur ?? 0.2, z = o.z ?? 14;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.05), R = r * (1 - p * 0.55);
      for (let i = 0; i < 4; i++) V.neonPath(c, i % 2 ? ICE : FIRE, 3 * Math.sqrt(Math.max(1, r / 70)), k, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, a = t * 12 + i * TAU2 / 4 + q * 2.6, rr = R * (0.2 + q * 0.8), px = x + Math.cos(a) * rr, py = y - z + Math.sin(a) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
    } });
  }
  // two flame crescents (or frost ones) whirling round the mage's hand: the wind-up of a spell
  function handArcs(ent, o = {}) {
    const r = o.r ?? 30, dur = o.dur ?? 0.3, col = o.color || FIRE, col2 = o.color2 || col;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.06, (1 - p) / 0.4), x = ent.x, y = ent.y - 20 - (ent.lift || 0), a = t * 16, R = r * (1 - 0.3 * p);
      V.neonPath(c, col, 2.6, k, () => c.ellipse(x, y, R, R * 0.7, 0, a, a + 1.6));
      V.neonPath(c, col2, 2.6, k, () => c.ellipse(x, y, R, R * 0.7, 0, a + Math.PI, a + Math.PI + 1.6));
    } });
  }
  // a four-point star cross, long on the vertical
  function crossStar(c, x, y, s, col, a) {
    if (a <= 0.01) return;
    V.neonPath(c, col, 1.6, a, () => { c.moveTo(x, y - s * 1.5); c.lineTo(x, y + s * 1.5); c.moveTo(x - s, y); c.lineTo(x + s, y); });
    V.glowAt(c, x, y, s * 1.2, col, 0.7 * a);
  }
  // Equilibrium: a frost half (left) and a fire half (right) swing together into one ring at the feet, star crosses where
  // they meet and at either side; it settles to a faint ring before it goes
  function dualRing(ent, o = {}) {
    const r = o.r ?? 56, dur = o.dur ?? 1.3;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const x = ent.x, y = ent.y, close = easeOut(Math.min(1, t / 0.25)), R = r * (1.25 - 0.25 * close), g = (1 - close) * 16;
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.45) * (1 - 0.55 * Math.min(1, Math.max(0, (t - 0.45) / 0.3)));
      c.save(); c.translate(x, y); c.scale(1, F);
      const sk = Math.max(1, r / 56);
      V.neonPath(c, ICE, 3 * sk, k, () => c.arc(-g, 0, R, Math.PI / 2 + 0.12, Math.PI * 1.5 - 0.12));
      V.neonPath(c, FIRE, 3 * sk, k, () => c.arc(g, 0, R, -Math.PI / 2 + 0.12, Math.PI / 2 - 0.12));
      // (scale-up pass) a thinner inner pair of arcs, the other way round, like the sheet's double crescents
      V.neonPath(c, ICE, 1.4 * sk, 0.7 * k, () => c.arc(-g * 1.5, 0, R * 0.8, Math.PI / 2 + 0.4, Math.PI * 1.5 - 0.4));
      V.neonPath(c, FIRE, 1.4 * sk, 0.7 * k, () => c.arc(g * 1.5, 0, R * 0.8, -Math.PI / 2 + 0.4, Math.PI / 2 - 0.4));
      c.restore();
      const s = (6 + 5 * close) * sk;
      crossStar(c, x, y - R * F, s, '#ffffff', k); crossStar(c, x, y + R * F, s, '#ffffff', k);
      crossStar(c, x - R - g, y, s * 0.8, '#8fd0ff', k); crossStar(c, x + R + g, y, s * 0.8, '#ffb070', k);
    } });
  }
  // a spear of ice flying from s to t with a frost trail; onHit(x, y) where it lands; a faint frost streak stays on the floor
  function iceSpear(sx, sy, tx, ty, o = {}) {
    const d = Math.hypot(tx - sx, ty - sy), dur = Math.max(0.08, d / (o.speed ?? 1300)), a = Math.atan2(ty - sy, tx - sx), L = o.len ?? 64, W = o.w ?? 8, z = 18;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const x = sx + (tx - sx) * p, y = sy + (ty - sy) * p - z, k = e.a, bx = x - Math.cos(a) * L, by = y - Math.sin(a) * L;
      V.neonPath(c, '#8fd0ff', 3, 0.5 * k, () => { c.moveTo(sx + (bx - sx) * 0.4, sy - z + (by - sy + z) * 0.4); c.lineTo(bx, by); });
      c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = k;
      c.fillStyle = '#5fb4f0'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W); c.lineTo(-L, 0); c.lineTo(-L * 0.35, W); c.closePath(); c.fill();
      c.fillStyle = 'rgba(240,250,255,0.85)'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W * 0.4); c.lineTo(-L * 0.8, 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(8,32,58,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(12, 0); c.lineTo(-L * 0.35, -W); c.lineTo(-L, 0); c.lineTo(-L * 0.35, W); c.closePath(); c.stroke();
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y, 18, '#cfeeff', 0.6 * k);
    }, tick: (p) => { if (Math.random() < 0.7) { const x = sx + (tx - sx) * p, y = sy + (ty - sy) * p; V.spawn({ x: x + rand(-6, 6), y: y + rand(-4, 4), z: z + rand(-6, 6), vx: rand(-20, 20), vz: rand(-20, 20), life: rand(0.3, 0.6), size: rand(4, 8), size1: 0, color: Math.random() < 0.4 ? '#ffffff' : '#9fd8ff', kind: Math.random() < 0.3 ? 'star' : 'glow' }); } },
    done: () => { if (o.onHit) o.onHit(tx, ty); } });
    if (o.trail !== false) V.fx({ dur: o.trail ?? 1.6, delay: dur * 0.5, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1, (1 - p) / 0.5) * 0.35, ax = sx + (tx - sx) * 0.25, ay = sy + (ty - sy) * 0.25;
      V.neonPath(c, '#9fd8ff', 1.4, k, () => { c.moveTo(ax, ay); c.lineTo(tx, ty); });
      for (let i = 1; i < 6; i++) { const q = 0.25 + i * 0.13; V.glowAt(c, sx + (tx - sx) * q + Math.sin(i * 7) * 6, sy + (ty - sy) * q + Math.cos(i * 5) * 4, 5, '#e8f8ff', k * 1.4); }
    } });
  }
  return { FIRE, ICE, shards, steam, lavaCracks, frostRim, dialSeal, crystalCrown, swirl2, handArcs, crossStar, dualRing, iceSpear };
})();

// DRIFT_PAINT: jade and white wind: tapered ribbons, a cyclone, a twister with debris, leaves, a spiral scar on the floor
const DRIFT_PAINT = (() => {
  const V = VFX, TAU2 = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), F = 0.62;
  const WHITE = '#e8fff8', INK = '#0a2a24', LEAF = ['#8fe0b0', '#5fc890', '#b8f0c8'];
  // leaves: flung out of (x, y) (o.angle aims them), or (o.orbit) whirling round it
  function leaves(x, y, o = {}) {
    const n = Math.min(12, o.n ?? 6);
    for (let i = 0; i < n; i++) {
      const base = { z: rand(8, 50), life: rand(0.6, 1) * (o.life ?? 1.1), size: rand(7, 10), color: LEAF[i % 3], kind: 'leaf', add: false, vr: rand(-8, 8), flutter: rand(5, 9), fadePow: 3 };
      if (o.orbit) V.spawn(Object.assign(base, { x, y, orbit: { x, y, a: rand(0, TAU2), r: rand(0.4, 1) * o.orbit, w: rand(4, 7), dr: o.dr ?? 20, flat: F, follow: o.follow } }));
      else { const a = o.angle != null ? o.angle + rand(-0.7, 0.7) : rand(0, TAU2), sp = rand(0.4, 1) * (o.speed ?? 200); V.spawn(Object.assign(base, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(-20, 60), drag: 0.04 })); }
    }
  }
  // a point a fraction q of the way along a polyline
  const along = (pts, q) => { const f = Math.max(0, Math.min(1, q)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; };
  // a filled band along pts, w half-wide, tapering at both ends ('mid') or thickest near its leading end ('head')
  function strip(c, pts, w, taper) {
    const n = pts.length; if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, q = i / (n - 1);
      const ww = w * (taper === 'head' ? Math.pow(q, 1.2) * Math.min(1, (1 - q) * 6 + 0.15) : Math.sin(Math.PI * q));
      L.push([pts[i][0] - dy / d * ww, pts[i][1] + dx / d * ww]); R.push([pts[i][0] + dy / d * ww, pts[i][1] - dx / d * ww]);
    }
    c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) c.lineTo(L[i][0], L[i][1]); for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill();
  }
  // a painted wind ribbon: ink under, a jade body, a white-hot core
  function paint(c, pts, w, col, k, taper, ink = true) {
    if (ink) { c.globalAlpha = 0.22 * k; c.fillStyle = INK; strip(c, pts, w * 1.3, taper); }
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.55 * k; c.fillStyle = col; strip(c, pts, w, taper);
    c.globalAlpha = 0.85 * k; c.fillStyle = '#ffffff'; strip(c, pts, w * 0.32, taper);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  // a ribbon racing along pts (world, lifted by z): the head runs out over the first 35%, the tail follows it in
  function windStrip(pts, o = {}) {
    const dur = o.dur ?? 0.4, z = o.z ?? 14, w = o.w ?? 6, col = o.color || '#8ff0d8', N = 14;
    V.fx({ dur, layer: o.layer || 'air', draw: (c, p, t, e) => {
      const s1 = easeOut(Math.min(1, p / 0.35)), s0 = Math.pow(Math.max(0, (p - 0.3) / 0.7), 1.2), k = e.a * (1 - Math.max(0, (p - 0.6) / 0.4));
      if (s1 - s0 < 0.02) return;
      const sub = Array.from({ length: N + 1 }, (_, i) => { const [x, y] = along(pts, s0 + (s1 - s0) * i / N); return [x, y - z]; });
      paint(c, sub, w, col, k, 'head');
    } });
  }
  const straight = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });
  const arcPts = (x, y, r, a0, span, n = 16, flat = F) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + span * i / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r * flat]; });
  // a faint mark left on the floor along pts (low alpha: it lingers over telegraphs)
  function scuff(pts, o = {}) {
    const dur = o.dur ?? 1, col = o.color || '#8ff0d8';
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.5) * (o.a ?? 0.3);
      V.neonPath(c, col, o.w ?? 1.4, k, () => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))));
    } });
  }
  // long wind streaks through (x, y) along angle a: a few parallel blades racing past, leaves flung ahead, faint scuffs left
  function streaks(x, y, a, o = {}) {
    const back = o.back ?? 90, on = o.on ?? 110, n = Math.min(5, o.n ?? 3), col = o.color || '#8ff0d8', w = o.w ?? 6, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (o.gap ?? 10) + rand(-3, 3), b0 = back + rand(-14, 14), b1 = on + rand(-14, 14);
      const pts = straight(x - ca * b0 - sa * off, y - sa * b0 + ca * off, x + ca * b1 - sa * off, y + sa * b1 + ca * off, 10, rand(-6, 6));
      windStrip(pts, { w: i === Math.floor(n / 2) ? w : w * 0.6, color: i % 2 ? WHITE : col, dur: (o.dur ?? 0.38) * rand(0.9, 1.1), z: 14 + off * 0.2 });
      if (o.scuff !== false && i === Math.floor(n / 2)) scuff(pts, { color: col, dur: o.stay ?? 0.9, a: 0.25 });
    }
    leaves(x, y, { n: o.leaves ?? 3, angle: a, speed: 260 });
  }
  // a jade cyclone wound round someone: tilted ribbons at several heights spinning up the body, leaves caught in it
  function cyclone(ent, o = {}) {
    const r = o.r ?? 46, h = o.h ?? 90, dur = o.dur ?? 0.5, col = o.color || '#8ff0d8', x0 = ent.x, y0 = ent.y;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const x = o.follow === false ? x0 : ent.x, y = o.follow === false ? y0 : ent.y, k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.4));
      const sk = Math.max(1, r / 46), nb = sk > 1.2 ? 6 : 4;
      for (let i = 0; i < nb; i++) {
        const q = i / (nb - 1), R = r * (0.65 + 0.5 * q) * (0.7 + 0.3 * g), a0 = t * (10 - i) + i * 1.3, zz = 6 + q * h * g;
        const pts = Array.from({ length: 13 }, (_, j) => { const a = a0 + 2.6 * j / 12; return [x + Math.cos(a) * R, y - zz + Math.sin(a) * R * 0.32 + Math.cos(a) * 6 * sk * (i % 2 ? 1 : -1)]; });
        paint(c, pts, (6 - q * 2) * Math.sqrt(sk), i % 2 ? WHITE : col, k * (0.6 + 0.4 * (1 - q)), 'head');
      }
    } });
    leaves(x0, y0, { n: o.leaves ?? 6, orbit: r, dr: 30, follow: o.follow === false ? null : ent });
  }
  // a twister: stacked spinning bands widening as they climb, a swirl of ribbons round its foot, rocks whirling in it
  function twister(x, y, o = {}) {
    const r = o.r ?? 70, h = o.h ?? 170, dur = o.dur ?? 1, col = o.color || '#8ff0d8', sk = Math.max(1, r / 70), sw = Math.pow(sk, 0.75);
    const nb = sk > 1.3 ? 9 : 6, nf = sk > 1.3 ? 4 : 3;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.08, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.25));
      // (scale-up pass) a big twister gets a faint funnel body behind its bands, so it reads as one column of wind
      if (sk > 1.3) {
        const H = h * g, w0 = r * 0.2, w1 = r * 0.85 * (0.6 + 0.4 * g), sway = Math.sin(t * 3 + 3) * 6;
        const fg = c.createLinearGradient(0, y - H * 1.05, 0, y);
        fg.addColorStop(0, rgba(col, 0)); fg.addColorStop(0.45, rgba(col, 0.2)); fg.addColorStop(1, rgba(col, 0.08));
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k); c.fillStyle = fg;
        c.beginPath(); c.moveTo(x - w0, y - 4); c.quadraticCurveTo(x - w0 * 1.6, y - H * 0.55, x - w1 + sway, y - H); c.quadraticCurveTo(x + sway, y - H * 1.12, x + w1 + sway, y - H); c.quadraticCurveTo(x + w0 * 1.6, y - H * 0.55, x + w0, y - 4); c.closePath(); c.fill();
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      for (let i = 0; i < nf; i++) { const a0 = t * 7 + i * TAU2 / nf, R = r * (1.1 + 0.25 * Math.sin(t * 3 + i)) * g; paint(c, arcPts(x, y - 6, R, a0, 2.2, 14, 0.5), 7 * sw, i % 2 ? WHITE : col, k * 0.85, 'head'); }
      for (let i = 0; i < nb; i++) {
        const q = i / (nb - 1), R = r * (0.22 + q * (sk > 1.3 ? 0.68 : 0.55)) * (0.6 + 0.4 * g), a0 = t * (12 - q * 4) + i * 0.8, yy = y - q * h * g;
        paint(c, arcPts(x + Math.sin(t * 3 + q * 3) * 6 * q, yy, R, a0, 4.4, 14, 0.28), (5 - q * 1.5) * sw, i % 2 ? WHITE : col, k * (0.55 + 0.45 * (1 - q)), 'head', i < 2);
      }
      V.glowAt(c, x, y - h * 0.3, r * 0.5, WHITE, 0.3 * k);
    } });
    const nr = Math.min(12, o.rocks ?? 8);
    for (let i = 0; i < nr; i++) V.spawn({ x, y, z: rand(10, h * 0.5), life: dur * rand(0.6, 0.9), size: rand(6, 10) * sw, color: i % 2 ? '#3a4440' : '#56605a', kind: 'shard', add: false, vr: rand(-10, 10), fadePow: 3,
      orbit: { x, y, a: rand(0, TAU2), r: rand(0.6, 1.1) * r, w: rand(5, 8), dr: 30, flat: F } });
    leaves(x, y, { n: o.leaves ?? 8, orbit: r * 0.9, dr: 50 });
  }
  // the scar it leaves: a faint spiral of wind cut into the floor, turning slowly as it fades
  function spiralScar(x, y, o = {}) {
    const r = o.r ?? 80, dur = o.dur ?? 2.4, col = o.color || '#8ff0d8', arms = o.arms ?? 3, a0 = rand(0, TAU2);
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.2, (1 - p) / 0.6) * (o.a ?? 0.4), rot = a0 + t * 0.4;
      if (k < 0.01) return;
      const trace = i => () => { for (let s = 0; s <= 22; s++) { const q = s / 22, a = rot + i * TAU2 / arms + q * 4, rr = r * (0.08 + q * 0.92), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } };
      c.lineCap = 'round';
      const sk = Math.max(1, r / 80);
      for (let i = 0; i < arms; i++) { c.globalAlpha = 0.5 * k; c.strokeStyle = INK; c.lineWidth = 5 * sk; c.beginPath(); trace(i)(); c.stroke(); c.globalAlpha = 1; V.neonPath(c, col, 1.4 * sk, k, trace(i)); }
    } });
  }
  // a curved sickle of wind round (x, y) from a0 through span: thick at the leading end, a faint arc left on the floor
  function hookArc(x, y, r, a0, span, o = {}) {
    const col = o.color || '#8ff0d8', pts = arcPts(x, y, r, a0, span, 18);
    windStrip(pts, { w: o.w ?? 10, color: col, dur: o.dur ?? 0.5, z: 12 });
    windStrip(arcPts(x, y, r * 0.86, a0 + 0.2, span * 0.9, 16), { w: (o.w ?? 10) * 0.5, color: WHITE, dur: (o.dur ?? 0.5) * 0.9, z: 14 });
    scuff(pts, { color: col, dur: o.stay ?? 1.1, a: 0.28 });
    const [ex, ey] = pts[pts.length - 1];
    leaves(ex, ey, { n: 4, angle: a0 + span + Math.PI / 2 * Math.sign(span), speed: 180 });
  }
  // four small whirls round someone and a ring seal binding them (Stillpoint): it holds for dur, faint after the first beat
  function stillSeal(ent, o = {}) {
    const r = o.r ?? 54, dur = o.dur ?? 2, col = o.color || '#8ff0d8';
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const x = ent.x, y = ent.y, k = e.a * Math.min(1, t / 0.12, (1 - p) / 0.3) * (1 - 0.5 * Math.min(1, Math.max(0, (t - 0.5) / 0.4))), g = easeOut(Math.min(1, t / 0.3)), R = r * (0.8 + 0.2 * g), sk = Math.max(1, r / 54);
      V.neonRing(c, x, y, R, col, 1.4 * sk, 0.8 * k, F); V.neonRing(c, x, y, R * 0.55, WHITE, 0.8 * sk, 0.5 * k, F);
      // (scale-up pass) a slow spiral in the middle of the seal, as on the sheet's aftermath
      V.neonPath(c, col, 1 * sk, 0.6 * k, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, aa = t * 1.5 + q * 5, rr = R * 0.08 + q * R * 0.36; const px = x + Math.cos(aa) * rr, py = y + Math.sin(aa) * rr * F; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2, vx = x + Math.cos(a) * R, vy = y + Math.sin(a) * R * F;
        for (let j = 0; j < 2; j++) V.neonPath(c, j ? WHITE : col, 1.4 * sk, k, () => { for (let s = 0; s <= 10; s++) { const q = s / 10, aa = -t * 9 + j * Math.PI + q * 4, rr = (3 + q * 11) * sk; const px = vx + Math.cos(aa) * rr, py = vy + Math.sin(aa) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
        V.glowAt(c, vx, vy, 10 * sk, col, 0.5 * k);
      }
    } });
  }
  return { WHITE, INK, leaves, strip, paint, windStrip, straight, arcPts, scuff, streaks, cyclone, twister, spiralScar, hookArc, stillSeal };
})();

// ---------------------------------------------------------------- the advanced DPS: Thermist and Driftblade
// Three beats on every big move, like the painted reference sheets: a wind-up glyph, a bold main shape (hot core, saturated
// middle, dark ink edge), then a slow aftermath. Thermist fire is orange, frost is blue, and the Shock mixes both.
// Driftblade wind is pale jade (Orbit mint, Comet gold); its dashes leave lanes and ribbons that hang in the air.
const WIND_LANES = [];   // live Slipstream lanes: { ax, ay, bx, by, end } (anyone moving along one runs faster)
// speed factor for something at (x, y) moving along (vx, vy): 1.3 on a lane and roughly following it, else 1
function windLaneBoost(x, y, vx, vy, now) {
  for (let i = WIND_LANES.length - 1; i >= 0; i--) if (WIND_LANES[i].end < now) WIND_LANES.splice(i, 1);
  const sp = Math.hypot(vx, vy);
  if (!sp) return 1;
  for (const l of WIND_LANES) {
    const dx = l.bx - l.ax, dy = l.by - l.ay, L = Math.hypot(dx, dy) || 1;
    if (Math.abs((vx * dx + vy * dy) / (sp * L)) < 0.6) continue;   // crossing it, not running along it
    if (kitSegDist(x, y, l.ax, l.ay, l.bx, l.by) < 34) return 1.3;
  }
  return 1;
}
(() => {
  const V = VFX;
  const FIRE = { color: '#ff7a2a', core: '#fff0b0', ink: '#3a1004' }, ICE = { color: '#5fb4f0', core: '#f0faff', ink: '#08203a' };
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  const windCol = ent => (ent && ent.spec === 'comet' ? '#ffd08a' : ent && ent.spec === 'orbit' ? '#a8f0c8' : '#8ff0d8');
  // a ribbon of wind drawn along a path (pts in world space), flowing toward its end and fading out over dur
  const ribbon = (pts, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: o.layer || 'air', draw: (c, p, t, e) => {
    const k = (1 - p) * e.a, col = o.color || '#8ff0d8';
    V.neonPath(c, col, (o.w ?? 3) * (1 - p * 0.5), k, () => { pts.forEach(([x, y], i) => { const wob = Math.sin(i * 0.9 + t * 14) * (o.wob ?? 3); i ? c.lineTo(x, y - (o.z ?? 14) + wob) : c.moveTo(x, y - (o.z ?? 14) + wob); }); });
  } });
  const line2 = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });
  const loop = (x, y, r, a0, span, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + span * i / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62]; });

  ABILITY_VFX.thermist = {
    // a spark in the right hand, a small fire bolt, a little burst
    cinder: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#ffb050', size: 16 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: '#ff8a3a', speed: 900, size: 0.8, onHit: (x, y) => { V.spikeburst(x, y, { r: 26, n: 9, ...FIRE, dur: 0.24 }); V.smoke(x, y, { n: 1, color: '#4a3a3a', size: 14, a: 0.35, speed: 20 }); } }); },
    // frost on the left hand, a shard of ice, a few chips where it breaks
    rime: c => { const h = ahead(c, 16); V.glint(h.x, h.y, { color: '#cfeeff', size: 16 }); V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: '#8fd0ff', speed: 1000, size: 0.75, onHit: (x, y) => { V.spikeburst(x, y, { r: 24, n: 8, ...ICE, dur: 0.24 }); V.crystals(x, y, { color: '#bfe6ff', n: 3, r: 14, h: 20, dur: 0.5 }); } }); },
    // (painted pass, thermist.png) Flare: flame crescents whirl round the hand and a fire glyph opens on the boss; a bold
    // orange starburst with flame tongues leaping out of it; then cracks glowing in the floor that cool, and a little smoke
    flare: c => { const TP = THERM_PAINT; TP.handArcs(c.ent, { r: 36, dur: 0.3 }); V.sigil(c.tx, c.ty, { r: 52, style: 'star5', color: '#ff9a3a', dur: 0.35, spin: 5 });
      c.later(0.12, () => { V.spikeburst(c.tx, c.ty, { r: 82, n: 18, ...FIRE, dur: 0.38 }); V.spikeburst(c.tx, c.ty, { r: 44, n: 10, color: '#ffb050', core: '#fff6d0', ink: '#3a1004', dur: 0.28, z: 26 }); V.flare(c.tx, c.ty, { n: 16, r: 28, color: '#ff6a1a', h: 1.4, size: 1.2 }); V.burst(c.tx, c.ty, { color: '#ffd070', n: 10, speed: 280, flashR: 70 }); V.shock(c.tx, c.ty, { r: 96, color: '#ff9a5a', dur: 0.35, w: 4 }); shake(2); });
      c.later(0.4, () => { TP.lavaCracks(c.tx, c.ty, { r: 62, dur: 2.4, n: 9, a: 0.7 }); V.smoke(c.tx, c.ty, { n: 4, r: 30, color: '#5a4a48', size: 28, a: 0.35, speed: 30, life: 1.7 }); }); },
    // Glacier Lance: frost crescents at the hand, then a long faceted spear of ice with a frost trail; ice bursts
    // out ahead of it where it lands, shards flung on, and a faint frost streak and mist stay along its path
    lance: c => { const TP = THERM_PAINT, a = Math.atan2(c.ty - c.y, c.tx - c.x); TP.handArcs(c.ent, { r: 34, dur: 0.27, color: '#6fb2f0', color2: '#cfeeff' });
      TP.iceSpear(c.x + Math.cos(a) * 16, c.y + Math.sin(a) * 16, c.tx, c.ty, { speed: 1300, len: 84, w: 10, onHit: (x, y) => { V.spikeburst(x, y, { r: 68, n: 14, ...ICE, dur: 0.36 }); V.crystals(x, y, { color: '#9fd8ff', n: 6, r: 38, h: 58, dur: 0.9 });
        TP.shards(x, y, { n: 11, angle: a, spread: 0.7, speed: 360, size: 1.15 }); V.shock(x, y, { r: 100, color: '#bfe6ff', dur: 0.42, w: 4.5 }); shake(2); FX.later(0.4, () => TP.steam(x, y, { n: 4, r: 32, size: 26, life: 1.7 })); } }); },
    // Equilibrium: a frost half and a fire half swing together into one ring at the feet, star crosses where they meet,
    // the shield closing over; the ring settles faint and steam rises off it
    equil: c => { const TP = THERM_PAINT; TP.dualRing(c.ent, { r: 70, dur: 1.4 });
      c.later(0.15, () => { V.shield(c.ent, { color: '#e8d8ff', dur: 1.4, r: 40 }); V.shock(c.ent.x, c.ent.y, { r: 110, color: '#f2e6c8', dur: 0.42, w: 3.5 }); });
      c.later(0.55, () => TP.steam(c.ent.x, c.ent.y, { n: 4, r: 30, size: 22, life: 1.5, a: 0.25 })); },
    // the dial turns over: two coloured arcs wheel round the mage and swap sides, then a ring in both colours
    invert: c => { V.charge(c.x, c.y, { color: '#e8d8ff', r: 56, n: 10, dur: 0.25, follow: c.ent });
      V.fx({ dur: 0.7, layer: 'ground', follow: c.ent, draw: (ctx, p, t, e) => { const x = e.follow.x, y = e.follow.y, k = Math.min(1, (1 - p) / 0.4) * e.a, a = easeOut(Math.min(1, p / 0.6)) * Math.PI;
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62);
        V.neonPath(ctx, '#ff8a3a', 5, k, () => ctx.arc(0, 0, 52, a - 1.2, a + 1.2));
        V.neonPath(ctx, '#6fb2f0', 5, k, () => ctx.arc(0, 0, 52, a + Math.PI - 1.2, a + Math.PI + 1.2));
        ctx.restore(); } });
      c.later(0.35, () => { V.shock(c.ent.x, c.ent.y, { r: 110, color: '#ff9a5a', dur: 0.5, w: 5 }); V.shock(c.ent.x, c.ent.y, { r: 90, color: '#7ac0f0', dur: 0.5, w: 5, delay: 0.06 }); V.aura(c.ent, { color: '#e8d8ff', dur: 10, r: 28, rate: 0.15 }); }); },
    // Thermocline (talent): a bolt that changes colour in flight, from the side it left to the side it swings toward
    thermocline: c => { V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#ffb08a', speed: 1100, size: 0.9, onHit: (x, y) => { V.spikeburst(x, y, { r: 30, n: 10, ...ICE, dur: 0.26 }); V.flare(x, y, { n: 4, r: 8, color: '#ff8a3a', size: 0.6 }); } });
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'orb', color: '#7ac0f0', speed: 1050, size: 0.6, arc: 10 }); },
    // Absolute Zero (talent): a frost glyph opens under the boss, a pillar of cold drops, a ring of ice and a hanging mist
    zero: c => { V.ink(c.tx, c.ty, { r: 70, dur: 0.6 }); V.sigil(c.tx, c.ty, { r: 70, style: 'hex', color: '#cfeeff', dur: 0.6, spin: 6 });
      c.later(0.25, () => { V.pillar(c.tx, c.ty, { r: 40, h: 240, color: '#bfe6ff', dur: 0.9 }); V.crystals(c.tx, c.ty, { color: '#d8f2ff', n: 10, r: 60, h: 64, dur: 1.4 }); V.spikeburst(c.tx, c.ty, { r: 70, n: 16, ...ICE, dur: 0.4 }); V.shock(c.tx, c.ty, { r: 140, color: '#cfeeff', dur: 0.6, w: 7 }); shake(4); });
      c.later(0.7, () => V.smoke(c.tx, c.ty, { n: 7, r: 60, color: '#d8e8f0', size: 32, a: 0.3, speed: 20, life: 2.2 })); },
    // Zenith's Bleed Off: steam blasting off the mage, a pale shield, and the red Strain venting upward
    bleed: c => { V.smoke(c.x, c.y, { n: 9, r: 26, color: '#e8e0e0', size: 30, a: 0.45, speed: 70, life: 1.3 }); V.shock(c.x, c.y, { r: 80, color: '#ff8a8a', dur: 0.4, w: 4 }); V.shield(c.ent, { color: '#ffd0c0', dur: 1.2, r: 38 });
      for (let i = 0; i < 8; i++) V.spawn({ x: c.x + (Math.random() - 0.5) * 30, y: c.y, z: 10, vz: 120 + Math.random() * 80, life: 0.7, size: 8, size1: 0, color: '#ff5a6a' }); },
  };

  ABILITY_VFX.driftblade = {
    // a crescent sabre cut in jade, a sharp white edge, a few sparks
    carve: c => { const col = windCol(c.ent), f = Math.random() < 0.5; V.slash(c.x, c.y, c.ang, { r: 60, span: 2.2, color: col, w: 0.4, dur: 0.24, flip: f, sparks: 3 }); c.later(0.08, () => V.hit(c.tx, c.ty, '#e8fff8', 0.5)); },
    // a burst of wind at the start, a ribbon along the dash, and the lane left glowing on the floor for 6s
    slip: c => { const col = windCol(c.ent), sx = c.x, sy = c.y; V.smoke(sx, sy, { n: 3, color: '#d8e8e0', size: 16, a: 0.5, speed: 50 }); V.shock(sx, sy, { r: 34, color: col, dur: 0.25, w: 3 });
      c.later(0.22, () => {
        const ex = c.ent.x, ey = c.ent.y;
        if (Math.hypot(ex - sx, ey - sy) < 20) return;
        const lane = { ax: sx, ay: sy, bx: ex, by: ey, end: FX.now + 6 };
        WIND_LANES.push(lane);
        ribbon(line2(sx, sy, ex, ey, 12, 10), { color: col, w: 3, dur: 0.6 }); ribbon(line2(sx, sy, ex, ey, 12, -10), { color: '#ffffff', w: 1.5, dur: 0.5 });
        const dx = ex - sx, dy = ey - sy, L = Math.hypot(dx, dy);
        V.fx({ dur: 6, layer: 'ground', draw: (ctx, p, t, e) => {
          const k = Math.min(1, p / 0.04, (1 - p) / 0.15) * e.a;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(dy, dx));
          ctx.globalAlpha = 0.12 * k; ctx.fillStyle = col; ctx.fillRect(0, -16, L, 32); ctx.globalAlpha = 1;
          for (let i = 0; i < 6; i++) { const q = ((t * 0.9 + i / 6) % 1), x = q * L, y = (i % 3 - 1) * 9;
            V.neonPath(ctx, col, 1.6, k * Math.sin(q * Math.PI) * 0.8, () => { ctx.moveTo(x, y); ctx.lineTo(Math.min(L, x + 26), y); }); }
          ctx.restore();
        } });
      }); },
    // a swing round the target: a curved ribbon from where you were to its far side, a cut as you pass
    // (painted pass, driftblade.png) Hook Turn: a curl of wind gathers on the blade, then a great sickle of wind swings
    // round the target from where you were to its far side (thick at its leading edge), a cut as you pass, a faint arc stays
    hook: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), a0 = Math.atan2(c.y - c.ty, c.x - c.tx), r = Math.max(40, Math.hypot(c.x - c.tx, c.y - c.ty));
      DP.windStrip(DP.arcPts(c.x, c.y, 34, c.ang + 2.2, -2.6, 10, 0.7), { w: 6.5, color: col, dur: 0.26, z: 20 });
      DP.windStrip(DP.arcPts(c.x, c.y, 26, c.ang + 1.6, -2.2, 10, 0.7), { w: 3.5, color: DP.WHITE, dur: 0.22, z: 24 });
      DP.hookArc(c.tx, c.ty, r, a0, Math.PI, { color: col, w: 13, dur: 0.52, stay: 1.3 });
      c.later(0.1, () => { V.slash(c.tx, c.ty + 10, a0 + Math.PI / 2, { r: 68, span: 2, color: '#e8fff8', w: 0.45, dur: 0.26 }); V.hit(c.tx, c.ty, col, 0.95); }); },
    // Crosswind: two loops of wind cross round the blade, the crescent flies, and on the target it opens into an X of
    // long wind blades through it, leaves and grit flung off; the X stays a moment, faint, on the floor
    cross: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), aim = Math.atan2(c.ty - c.y, c.tx - c.x);
      for (const s of [-1, 1]) DP.windStrip(Array.from({ length: 17 }, (_, i) => { const a = c.ang + i / 16 * 5.4; return [c.x + Math.cos(a) * 44 * Math.cos(s * 0.7) - Math.sin(a) * 18 * Math.sin(s * 0.7), c.y + Math.cos(a) * 44 * Math.sin(s * 0.7) * 0.62 + Math.sin(a) * 18 * Math.cos(s * 0.7)]; }), { w: 5, color: s > 0 ? col : '#e8fff8', dur: 0.34, z: 20 });
      c.later(0.08, () => V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: col, speed: 1300, size: 1.6, onHit: (x, y) => {
        for (const s of [-1, 1]) DP.streaks(x, y, aim + s * 0.7, { n: 3, back: 130, on: 130, w: 9.5, gap: 9, color: col, dur: 0.44, stay: 1.4, leaves: 2 });
        V.spikeburst(x, y, { r: 64, n: 14, color: col, core: '#ffffff', ink: '#0a2a24', dur: 0.32 }); shake(3);
        FX.later(0.3, () => V.smoke(x, y, { n: 3, r: 30, color: '#c8d0c0', size: 22, a: 0.3, speed: 40, life: 1.3 })); } })); },
    // Stillpoint: the blade held flat across (a glint and the parry face), four little whirls round you bound by a ring seal,
    // a shaft of pale light down the middle; the seal goes faint and holds while it lasts
    still: c => { const DP = DRIFT_PAINT, col = windCol(c.ent), fx = c.x + Math.cos(c.ang) * 26, fy = c.y + Math.sin(c.ang) * 26; V.glint(fx, fy, { color: '#ffffff', size: 26 }); V.shield(c.ent, { shape: 'front', color: '#e8fff8', dur: 2, r: 38 });
      DP.stillSeal(c.ent, { r: 70, dur: 2, color: col });
      c.later(0.12, () => { V.pillar(c.ent.x, c.ent.y, { r: 16, h: 185, color: '#d8fff0', dur: 0.5 }); V.shock(c.ent.x, c.ent.y, { r: 96, color: col, dur: 0.38, w: 3.5 }); DP.leaves(c.ent.x, c.ent.y, { n: 6, orbit: 64, dr: 10, follow: c.ent }); }); },
    // a gust spirals up round the duellist, streaks shoot out, and the wind aura stays on
    gale: c => { const col = windCol(c.ent); V.charge(c.x, c.y, { color: col, r: 60, n: 10, dur: 0.25, follow: c.ent }); V.tornado(c.x, c.y, { color: '#e8fff8', h: 120, r: 36, dur: 0.9 });
      c.later(0.2, () => { V.shock(c.x, c.y, { r: 140, color: col, dur: 0.5, w: 6 }); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; ribbon(line2(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 12, c.x + Math.cos(a) * 120, c.y + Math.sin(a) * 74, 6, 12), { color: col, w: 2, dur: 0.6 }); } });
      V.aura(c.ent, { color: col, dur: 12, r: 28, rate: 0.25 }); },
    // Comet's Impact: a gold glyph, a straight streak through the target, a burst, sparks thrown forward
    impact: c => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), ex = c.tx + Math.cos(a) * 120, ey = c.ty + Math.sin(a) * 120; V.sigil(c.x, c.y, { r: 30, style: 'star4', color: '#ffd08a', dur: 0.3, spin: 6 });
      V.beam(c.x, c.y, ex, ey, { color: '#ffd08a', w: 12, dur: 0.4 }); c.later(0.06, () => { V.spikeburst(c.tx, c.ty, { r: 64, n: 14, color: '#ffb84a', core: '#fff6d0', ink: '#3a2404', dur: 0.36 }); V.sparks(c.tx, c.ty, { color: '#ffe0a0', n: 14, angle: a, spread: 0.6, speed: 520 }); shake(4); });
      c.later(0.3, () => ribbon(line2(c.x, c.y, ex, ey, 10, 0), { color: '#ffd08a', w: 2, dur: 1, wob: 5 })); },
    // Gyre (talent): a full loop of ribbon round the target, a cut at each quarter
    gyre: c => { const col = windCol(c.ent), r = 70; ribbon(loop(c.tx, c.ty, r, 0, Math.PI * 2, 28), { color: col, w: 3, dur: 0.8 });
      for (let i = 0; i < 4; i++) c.later(0.08 + i * 0.09, () => V.slash(c.tx, c.ty + 10, i * Math.PI / 2, { r: 50, span: 1.4, color: '#e8fff8', w: 0.35, dur: 0.2 })); },
    // Tailspin (talent): three blade arcs whirling in place, a wind ring, then the spring away leaves a ribbon
    tailspin: c => { const col = windCol(c.ent); for (let i = 0; i < 3; i++) c.later(i * 0.2, () => V.slash(c.ent.x, c.ent.y, c.ang + i * 2.1, { r: 60, span: 2.6, color: i % 2 ? '#e8fff8' : col, w: 0.45, dur: 0.24 }));
      V.swirl(c.x, c.y, { r: 56, color: col, dur: 0.8, arms: 3, follow: c.ent }); },
  };

  // class moments sent from the kits (k.fx): Thermal Shock and its cousins, Passing Strikes and the wind's tricks
  Object.assign(KIT_VFX, {
    // the payoff: both colours collapse onto the target, then a burst in the colour it swung to, sized by the swing,
    // with a ring of the other colour shattering round it, and steam and a crack left behind
    shock: Object.assign((e, target, d) => {
      const t = target || { x: e.x + Math.cos(e.angle || 0) * 120, y: e.y + Math.sin(e.angle || 0) * 120 };
      const s = Math.max(3, Math.min(12, (d && d.s) || 5)), to = d && d.c < 0 ? ICE : FIRE, other = to === ICE ? FIRE : ICE, echo = d && d.echo;
      const R = ((echo ? 24 : 34) + s * (echo ? 3 : 8)) * (echo ? 1.1 : 1.2), TP = THERM_PAINT;   // (scale-up pass) x1.2
      // (painted pass) wind-up: fire and frost spiral in together with a breath of steam
      TP.swirl2(t.x, t.y, { r: R * 1.4, dur: 0.17 });
      V.fx({ dur: 0.16, layer: 'ground', draw: (c, p, tt, fx) => { V.neonRing(c, t.x, t.y, R * 1.3 * (1 - p), to.color, 3, fx.a * p, 0.7); V.neonRing(c, t.x, t.y, R * 1.1 * (1 - p), other.color, 3, fx.a * p, 0.7); } });
      if (!echo) TP.steam(t.x, t.y, { n: 3, r: R * 0.8, size: 20, life: 0.8, a: 0.3 });
      FX.later(0.15, () => {
        V.spikeburst(t.x, t.y, { r: R, n: 12 + Math.round(s), ...to, dur: 0.34 + s * 0.02 });
        V.spikeburst(t.x, t.y, { r: R * 1.35, n: 16, hole: 0.7, ...other, dur: 0.4, layer: 'ground', z: 0, flat: 0.7 });
        V.burst(t.x, t.y, { color: to.core, color2: other.color, n: 6 + s, speed: 160 + s * 25, flashR: R * 1.1 });
        V.shock(t.x, t.y, { r: R * 2, color: to.color, dur: 0.5, w: 4 + s * 0.5 });
        if (to === ICE) V.crystals(t.x, t.y, { color: '#bfe6ff', n: 4 + Math.round(s / 2), r: R * 0.7, h: 30 + s * 4, dur: 1 }); else V.flare(t.x, t.y, { n: 6 + s, r: 14 + s, color: '#ff6a1a' });
        // both elements break out of it whichever way it swung: shards of ice and embers, rocks for a big one
        TP.shards(t.x, t.y, { n: Math.min(12, 3 + Math.round(s / 2)), speed: 180 + s * 15 });
        if (to === ICE) V.flare(t.x, t.y, { n: 3 + Math.round(s / 3), r: 10 + s, color: '#ff8a3a', size: 0.7 });
        if (!echo && s >= 6) V.debris(t.x, t.y, { n: Math.min(8, s - 2), hot: to === FIRE, color: '#4a3a32', speed: 0.8 });
        if (!echo) { shake(2 + s * 0.5); FX.text(t.x, t.y - 70, s >= 8 ? 'Thermal Shock!' : 'Shock', to.core, 11 + Math.min(8, s), 0.9); }
      });
      // aftermath: steam rolling off, frost at the rim and the heat cooling in cracks
      if (!echo) FX.later(0.5, () => { V.smoke(t.x, t.y, { n: 3 + Math.round(s / 2), r: R * 0.6, color: '#e0e4e8', size: 22 + s * 2, a: 0.3, speed: 25, life: 2 });
        if (s >= 6) { TP.lavaCracks(t.x, t.y, { r: R * 0.8, dur: 2.2, a: 0.5, color: to === FIRE ? '#ff6a1a' : '#ff8a4a' }); TP.frostRim(t.x, t.y, { r: R * 0.9, dur: 2.2, a: 0.3, n: 12 }); } });
    }, { atTarget: true }),
    // Ember Store (talent): banked embers fly from the mage into the target after a Shock
    embers: Object.assign((e, target, d) => { if (!target) return; for (let i = 0; i < ((d && d.n) || 1); i++) FX.later(i * 0.08, () => V.missile(e.x, e.y, target.x, target.y, { style: 'fire', color: '#ff8a3a', speed: 800, size: 0.6, arc: 30 + i * 12, onHit: (x, y) => V.hit(x, y, '#ffb050', 0.5) })); }, { atTarget: true }),
    // Latent Charge (talent): an overload banked instead of burned: a pale bead sinking into the mage
    latent: e => { V.swirl(e.x, e.y, { r: 36, color: '#e8d8ff', dur: 0.5, inward: true, follow: e }); V.flash(e.x, e.y - 20, 30, '#e8d8ff', 0.3); },
    frostbite: e => { V.crystals(e.x, e.y, { color: '#bfe6ff', n: 6, r: 24, h: 30, dur: 1 }); V.shock(e.x, e.y, { r: 70, color: '#9ad8ff', dur: 0.4 }); },
    // Twin Spell (talent): a smaller copy of the edge spell follows the first
    twin: Object.assign((e, target, d) => { if (!target) return; const ice = d && d.el < 0; V.missile(e.x, e.y, target.x, target.y, { style: ice ? 'helix' : 'fire', color: ice ? '#9fd8ff' : '#ff9a3a', speed: 1000, size: 0.7, onHit: (x, y) => V.spikeburst(x, y, { r: 30, n: 9, ...(ice ? ICE : FIRE), dur: 0.26 }) }); }, { atTarget: true }),
    invert: e => { V.shock(e.x, e.y, { r: 80, color: '#ff9a5a', dur: 0.4, w: 4 }); V.shock(e.x, e.y, { r: 64, color: '#7ac0f0', dur: 0.4, w: 4, delay: 0.05 }); },
    // a Passing Strike: a straight white cut through the body of the enemy, along the way you were running
    pass: Object.assign((e, target, d) => {
      // (painted pass) long streaks of wind through the body along the way you ran, leaves flung ahead, faint scuffs left
      const col = windCol(e), a = e.angle || 0, t = target || e, gale = d && d.g;
      DRIFT_PAINT.streaks(t.x, t.y, a, { n: gale ? 4 : 3, back: 105, on: 130, w: gale ? 8.5 : 6.5, gap: 11, color: gale ? '#ffffff' : col, dur: 0.36, stay: 0.9, leaves: gale ? 3 : 2 });
      V.hit(t.x, t.y, col, gale ? 1 : 0.6); if (gale) shake(2);
    }, { atTarget: true }),
    lane: e => { V.shock(e.x, e.y, { r: 30, color: windCol(e), dur: 0.25, w: 2 }); },
    orbitcut: Object.assign((e, target) => { const t = target || e; V.slash(t.x, t.y + 10, Math.random() * 6.28, { r: 46, span: 1.6, color: '#a8f0c8', w: 0.35, dur: 0.2 }); }, { atTarget: true }),
    crescent: Object.assign((e, target) => { const t = target || e; V.slash(e.x, e.y, Math.atan2(t.y - e.y, t.x - e.x), { r: 80, span: 2.8, color: windCol(e), w: 0.55, dur: 0.3, sparks: 5 }); }, { atTarget: true }),
    afterimage: Object.assign((e, target) => { const t = target || e; V.slash(t.x, t.y + 10, (e.angle || 0) + Math.PI, { r: 54, span: 1.8, color: '#d8e8e0', w: 0.4, dur: 0.3 }); V.smoke(t.x, t.y, { n: 2, color: '#c8d8d0', size: 18, a: 0.35, speed: 20 }); }, { atTarget: true }),
    riposte: Object.assign((e, target) => { const t = target || e; V.glint(e.x + Math.cos(e.angle || 0) * 26, e.y + Math.sin(e.angle || 0) * 26, { color: '#ffffff', size: 30 }); FX.later(0.06, () => { V.slash(t.x, t.y + 10, (e.angle || 0), { r: 60, span: 1.2, color: '#ffffff', w: 0.5, dur: 0.24, sparks: 8 }); V.hit(t.x, t.y, '#e8fff8', 1); shake(3); }); }, { atTarget: true }),
    galeforce: Object.assign((e, target) => { if (target) V.missile(e.x, e.y, target.x, target.y, { style: 'blade', color: windCol(e), speed: 1200, size: 1.2, onHit: (x, y) => V.tornado(x, y, { color: '#e8fff8', h: 60, r: 20, dur: 0.6 }) }); }, { atTarget: true }),
  });

  // autos: the Thermist's alternate fire and frost sparks; the Driftblade's quick sabre flick
  Object.assign(AUTO_VFX, {
    thermo: c => { const ice = c.alt; V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'orb', color: ice ? '#8fd0ff' : '#ff9a4a', speed: 950, size: 0.5, onHit: (x, y) => V.hit(x, y, ice ? '#cfeeff' : '#ffc080', 0.35) }); },
    sabre: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 50, span: 1.5, color: windCol(c.ent), dur: 0.2, w: 0.3, flip: c.alt, sparks: 2 }); },
  });
})();
// ======================================================================= Gorgemaw, Oathbroker (tanks-2)
// Gorgemaw: eating is the show. A telegraph that lands in an open jaw doesn't go off: the whole shape is sucked into
// the mouth (shrinking toward it, its colour streaming in), the jaw snaps shut on it with a chomp of teeth and crumbs,
// and the morsel's colour glows in the belly. Spat back, each shape keeps its look (Ring a lobbed glob that lands as a
// ring, Lance a straight bolt, Fang a cone of teeth, Spike a great yellow spike); a Glutton's Fusion is twice the size.
// Oathbroker: grey vellum and lilac seal-wax. Its hits are stamps; a bill coming due is a red seal pressed at its feet,
// Settle a gold one, Default the book torn and the pages flung out.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => { FX.shake = Math.max(FX.shake, s); };
  const MCOL = m => (MAW.COLOR[m] || '#ff9a3a');
  const mouth = e => ({ x: e.x + Math.cos(e.angle || 0) * 12, y: e.y + Math.sin(e.angle || 0) * 6, z: 30 });
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  // the jaw: two rows of teeth snapping together at (x, y - z), size s
  const chomp = (x, y, z, s, col, dur = 0.28) => V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
    const close = p < 0.45 ? 1 - p / 0.45 : 0, k = (p < 0.7 ? 1 : (1 - p) / 0.3) * e.a, gap = 4 + close * 16 * s, yy = y - z;
    c.save(); c.translate(x, yy);
    for (const dir of [-1, 1]) {
      c.globalAlpha = k; c.fillStyle = '#fff4e0'; c.strokeStyle = '#2a1408'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-14 * s, dir * gap);
      for (let i = 0; i <= 6; i++) { const tx = -14 * s + i * 28 * s / 6; c.lineTo(tx, dir * gap); if (i < 6) c.lineTo(tx + 14 * s / 6, dir * (gap - 7 * s)); }
      c.lineTo(14 * s, dir * (gap + 4 * s)); c.lineTo(-14 * s, dir * (gap + 4 * s)); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
    if (p > 0.4 && p < 0.6) V.glowAt(c, x, yy, 26 * s, col, 0.6 * e.a);
  } });
  const crumbs = (x, y, z, col, n = 8) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 180);
    V.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(40, 160), g: 500, bounce: true, life: rand(0.4, 0.8), size: rand(4, 7), color: i % 3 ? col : '#ffe8c8', kind: 'shard', add: false, vr: rand(-12, 12) }); } };
  // a telegraph's shape pulled into the mouth: it shrinks toward the mouth, stretching, its colour pouring in
  const swallowShape = (shape, e, col, dur = 0.38) => {
    if (!shape) return;
    const s = Object.assign({}, shape);
    V.fx({ dur, layer: 'ground', draw: (c, p, t, fx) => {
      const m = mouth(e), q = p * p, k = (1 - p * 0.6) * fx.a;
      c.save(); c.translate(m.x, m.y); c.scale(1 - q, 1 - q); c.translate(-m.x, -m.y);
      SHAPES.trace(c, s); c.globalAlpha = 0.35 * k; c.fillStyle = col; c.fill();
      c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = 3 / Math.max(0.2, 1 - q); c.stroke();
      c.restore();
    } });
    // streams of its colour flowing into the jaw from round the shape's edge
    const cx = s.x, cy = s.y, R = Math.min(260, s.r || s.len || 120);
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, d = R * rand(0.4, 1);
      FX.later(rand(0, 0.18), () => { const m = mouth(e), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
        V.spawn({ x, y, z: 4, vx: (m.x - x) * 3.2, vy: (m.y - y) * 3.2, vz: m.z * 1.5, life: 0.3, size: rand(5, 8), size1: 2, color: i % 2 ? col : '#ffffff', stretch: i % 3 ? 2 : 0 }); }); }
  };
  const gulp = (e, m, big) => {
    const col = MCOL(m);
    FX.later(0.3, () => { const q = mouth(e); chomp(q.x, q.y, q.z, big ? 1.5 : 1.1, col); FX.later(0.12, () => { crumbs(q.x, q.y, q.z, col, big ? 12 : 7); V.shock(e.x, e.y, { r: big ? 70 : 46, color: col, dur: 0.3, w: 4 });
      V.flash(e.x, e.y - 24, 30, col, 0.25); if (big) shake(3); }); });
    // the belly glows with what went down
    FX.later(0.5, () => V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => V.glowAt(c, e.x, e.y - 14, 22, col, (1 - p) * 0.7 * fx.a) }));
  };

  ABILITY_VFX.gorgemaw = {
    // (Gnash, Open Wide, and KIT_VFX.spit / digest: VFX PASS · GORGEMAW, after the Ultimates)
    spit: () => {},          // the morsel flying is KIT_VFX.spit (it knows the shape)
    regurgitate: c => { V.shock(c.x, c.y, { r: 70, color: '#ffb070', dur: 0.35, w: 5 }); shake(2); },
    digest: () => {},        // KIT_VFX.digest (it knows what was eaten)
    // bronze plates over the gut: a hex shield, sparks, a heavy stamp of dust
    iron: c => { V.shield(c.ent, { shape: 'hex', color: '#d89a5a', dur: 1.6, r: 42 }); V.sparks(c.x, c.y - 10, { color: '#ffd090', n: 10, speed: 260 }); V.smoke(c.x, c.y, { n: 4, color: '#a08a70', size: 22, a: 0.5, speed: 50 }); shake(2); },
    // Stone Belly: grey stone crusts over it, chips falling
    stonebelly: c => { V.crystals(c.x, c.y, { color: '#b8b0a4', n: 8, r: 34, h: 40, dur: 1.2 }); V.shield(c.ent, { shape: 'hex', color: '#c8c0b0', dur: 2, r: 44 }); V.debris(c.x, c.y, { n: 6, color: '#8a8278' }); shake(3); },
    // Bottomless: the room is pulled toward the jaw: a great inward vortex, the floor's dust streaming in
    bottomless: c => { const e = c.ent; if (e.st) { e.st.jawUntil = FX.now + 4; e.st.jawAll = FX.now + 4; } V.ink(c.x, c.y, { r: 170, dur: 4, follow: e, a: 0.25 }); V.vortex(c.x, c.y, { r: 170, color: '#ff8a3a', dur: 4, follow: e });
      V.fx({ dur: 4, layer: 'ground', tick: () => { for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, d = rand(150, 320), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.7;
        V.spawn({ x, y, z: 2, vx: (e.x - x) * 2.2, vy: (e.y - y) * 2.2, vz: 30, life: 0.45, size: rand(8, 12), size1: 2, color: i ? '#ffd0a0' : '#c87a4a', stretch: 3 }); } }, draw: () => {} });
      V.shock(c.x, c.y, { r: 200, color: '#ffb070', dur: 0.6, w: 7 }); shake(5); },
  };

  // Oathbroker: ink, vellum, seal-wax
  const INK = '#2a2034', WAX = '#c04a5a', LIL = '#b8a8e0', GOLD = '#ffd27a';
  // a seal pressed into the floor: a disc of wax, the stamp's rim and a cross in it
  const seal = (x, y, r, col, dur = 1.2) => V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
    const k = Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.4) * e.a, s = p < 0.08 ? 1.4 - p * 5 : 1;
    c.save(); c.translate(x, y); c.scale(s, s * 0.7);
    c.globalAlpha = 0.75 * k; c.fillStyle = col; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, rr = r * (i % 2 ? 0.92 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.globalAlpha = k; c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.moveTo(-r * 0.4, 0); c.lineTo(r * 0.4, 0); c.moveTo(0, -r * 0.4); c.lineTo(0, r * 0.4); c.stroke();
    c.restore();
  } });
  const pages = (x, y, n, col = '#f0e8d8') => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(80, 220);
    V.spawn({ x, y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(60, 180), g: 140, drag: 0.04, life: rand(0.9, 1.5), size: rand(9, 13), color: col, kind: 'petal', add: false, vr: rand(-6, 6), flutter: 5 }); } };
  // the mace's stamp head coming down on (x, y)
  const stamp = (x, y, col, big) => { V.spikeburst(x, y, { r: big ? 46 : 28, n: 10, color: col, core: '#ffffff', ink: INK, dur: 0.28 }); seal(x, y, big ? 30 : 18, col, big ? 1.4 : 0.8); if (big) shake(3); };
  ABILITY_VFX.oathbroker = {
    // (Collect, Settle, Lien, Co-Sign, Writ: VFX PASS · OATHBROKER, after the Ultimates)
    // Renegotiate: pages riffle forward round the knight, a lilac clock face turns back
    reneg: c => { V.sigil(c.x, c.y, { r: 46, style: 'clock', color: LIL, dur: 0.9, spin: -4, follow: c.ent }); pages(c.x, c.y, 6); },
    audit: c => { seal(c.x, c.y, 28, GOLD, 1); V.sigil(c.x, c.y, { r: 36, style: 'hex', color: GOLD, dur: 0.6, spin: 3 }); },
    // Default: the book torn open, pages flung everywhere, smoke
    default: c => { pages(c.x, c.y, 18); V.shock(c.x, c.y, { r: 120, color: WAX, dur: 0.5, w: 6 }); V.smoke(c.x, c.y, { n: 6, color: '#6a6070', size: 26, a: 0.45, speed: 50 }); shake(4); },
    // Foreclose: a great seal slams down onto the boss
    foreclose: c => { V.lightfall(c.tx, c.ty, { color: WAX, r: 34, h: 220, dur: 0.5, feathers: 0 }); c.later(0.2, () => { stamp(c.tx, c.ty, WAX, true); seal(c.tx, c.ty, 60, WAX, 1.8); pages(c.tx, c.ty, 10); shake(5); }); },
    // Moratorium: an hourglass seal, the Ledger held
    moratorium: c => { V.sigil(c.x, c.y, { r: 56, style: 'clock', color: '#e8dcc0', dur: 5, spin: 0, follow: c.ent }); V.dome(c.ent, { color: LIL, r: 46, dur: 1 }); },
  };

  // (KIT_VFX.spit and KIT_VFX.digest: VFX PASS · GORGEMAW, after the Ultimates)

  // the tanks' taunts: Gorgemaw's Bellow (a roar that rolls out of the jaw), Oathbroker's Summons (a seal on the foe)
  const baseTaunt = KIT_VFX.taunt;
  KIT_VFX.taunt = (e, target) => {
    const id = e.cls && e.cls.id;
    if (id === 'gorgemaw') {
      if (e.st) e.st.jawUntil = FX.now + 1;
      const q = mouth(e); chomp(q.x, q.y, q.z, 1.3, '#ff9a3a', 0.4);
      for (let i = 0; i < 3; i++) V.shock(e.x, e.y, { r: 70 + i * 40, color: '#ffb070', w: 5 - i, dur: 0.45, delay: i * 0.08 });
      if (target) FX.later(0.15, () => V.hit(target.x, target.y, '#ffb070', 0.8));
      return;
    }
    if (id === 'oathbroker') {
      V.shock(e.x, e.y, { r: 60, color: LIL, w: 3, dur: 0.3 });
      if (target) { V.beam(e.x, e.y - 4, target.x, target.y - 10, { color: LIL, w: 4, dur: 0.35 }); FX.later(0.12, () => { seal(target.x, target.y, 34, WAX, 1.6); V.sigil(target.x, target.y - 60, { r: 20, style: 'runes', color: LIL, dur: 1, spin: -2, flat: 1, layer: 'air' }); }); }
      return;
    }
    baseTaunt(e, target);
  };

  Object.assign(AUTO_VFX, {
    // a gauntleted cuff with the jaw-plate snapping
    maw: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 54, span: 1.5, color: '#e8c8a0', dur: 0.22, w: 0.4, flip: c.alt, sparks: 2 }); },
    // a tap of the stamp-mace: a small lilac seal
    stamp: c => { V.slash(c.ent.x, c.ent.y, c.ang, { r: 50, span: 1.2, color: '#d8d0e8', dur: 0.22, w: 0.35, flip: c.alt }); c.later(0.08, () => { const d = Math.min(64, Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y)); seal(c.ent.x + Math.cos(c.ang) * d, c.ent.y + Math.sin(c.ang) * d, 10, LIL, 0.5); }); },
  });

  // ---------------------------------------------------------------- host moments (fev, main.js) and the training yard
  // eat: { id, m: shape, mid: telegraph, w: whole (a teammate's circle, gone for everyone), r: a raidwide (Bottomless), f: whose it was }
  // bill: { id, a: amount, s: Settle }  default: { id, b: what the boss paid (Foreclose) }
  globalThis.CLASS_FEV = {
    eat(msg, e, o) {
      const tg = o.tgs && msg.mid != null ? o.tgs.get(msg.mid) : null, col = MCOL(msg.m);
      if (tg && msg.w) tg.gone = o.now;   // swallowed whole: it never goes off (tgx skips its impact)
      if (msg.r) {   // a raidwide: the whole room's air pulled into the jaw
        V.shock(e.x, e.y, { r: 260, color: col, dur: 0.4, w: 6 });
        V.swirl(e.x, e.y, { r: 120, color: col, dur: 0.5, inward: true, follow: e });
      } else if (tg) swallowShape(tg.live || tg.shape, e, col);
      else V.swirl(e.x, e.y, { r: 60, color: col, dur: 0.35, inward: true, follow: e });
      gulp(e, msg.m, msg.m === 'spike' || msg.w);
      if (e.st) FX.later(0.3, () => { e.st.chompAt = FX.now; });
      if (o.mine) shake(2);
    },
    bill(msg, e) { const big = msg.s; seal(e.x, e.y + 4, big ? 30 : 16 + Math.min(14, (msg.a || 0) / 8), big ? GOLD : WAX, 0.9); if (!big) V.flash(e.x, e.y - 10, 20, WAX, 0.15); },
    default(msg, e, o) { pages(e.x, e.y, 14); V.shock(e.x, e.y, { r: 110, color: WAX, dur: 0.45, w: 5 }); if (msg.b > 0 && o.boss) { stamp(o.boss.x, o.boss.y, WAX, true); pages(o.boss.x, o.boss.y, 8); } },
  };

  // the sparring dummy: the yard plays the host's part for the jaw and the Ledger
  globalThis.CLASS_TOWN = {
    cls: actor => actor && actor.cls && actor.cls.id,
    send(town, actor, now, bill) { const L = town.led; if (L) actor.notify('ledger', Object.assign(OATH.pack(L, now), bill ? { bill } : {})); },
    event(town, ev, now, actor) {
      const id = this.cls(actor);
      if (ev.type === 'maw' && id === 'gorgemaw') { town.maw = { until: now + Math.min(4.2, ev.dur || 0), all: !!ev.all }; return; }
      if (ev.type !== 'ledger' || id !== 'oathbroker') return;
      const L = town.led || (town.led = OATH.make()), maxHp = actor.kit.env.maxHp() || 1;
      if (ev.op === 'terms') { OATH.terms(L, ev, maxHp); return; }
      if (ev.op === 'cosign') return;   // nobody here to co-sign for
      const r = OATH.op(L, ev, now, maxHp), e = actor.ent;
      if (r.self > 0) { FX.text(e.x, e.y - 46, '-' + Math.round(r.self), '#ff7a6a', 14); CLASS_FEV.bill({ a: r.self, s: 1 }, e); }
      if (ev.op === 'default' || ev.op === 'foreclose') CLASS_FEV.default({ b: r.boss }, e, {});
      this.send(town, actor, now, r.self > 0 ? Math.round(r.self) : 0);
    },
    hit(town, amt, now, actor, player) {
      const id = this.cls(actor);
      if (id === 'gorgemaw' && town.maw && town.maw.until > now && amt > 0) {
        amt *= 0.25;
        actor.notify('eat', { m: 'ring' });
        CLASS_FEV.eat({ m: 'ring' }, player, { mine: true });
      }
      if (id === 'oathbroker' && amt > 0) { const L = town.led || (town.led = OATH.make()); amt -= OATH.write(L, amt, now); this.send(town, actor, now); }
      return amt;
    },
    tick(town, now, actor, player) {
      const L = town.led; if (!L || this.cls(actor) !== 'oathbroker') return;
      const dt = Math.max(0, Math.min(0.5, now - (town.ledT ?? now))); town.ledT = now;
      const bills = OATH.bills(L, now, dt);
      if (!bills.length) return;
      let self = 0; for (const b of bills) self += b.self;
      if (self > 0) { FX.text(player.x, player.y - 46, '-' + Math.round(self), '#ff7a6a', 13); CLASS_FEV.bill({ a: self }, player); }
      this.send(town, actor, now, Math.round(self));
    },
  };
  // the pieces the tanks' Ultimates reuse (the Ultimates block at the bottom of this file)
  globalThis.GORGEMAW_VFX = { MCOL, mouth, chomp, crumbs };
  globalThis.OATHBROKER_VFX = { INK, WAX, LIL, GOLD, seal, pages, stamp };
})();

// ======================================================================= Ironpalm (tank)
// Barehanded impact, after the painted sheets: no wind-up glyphs on the small hits (they come several a second), just a
// knuckle flash and a ring where they land, and a hit-stop that freezes the swing for a beat (hitStop, draw-util.js).
// The named moves get the show: a launch and a column of dust for Rising Gate, a cracked crater for Heaven's Drop, a
// storm of palm prints for Thousand Palms. Saffron by default; Still Water is pale water-blue, Avalanche Fist is earth.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  const col = e => (e && e.spec === 'stillwater' ? '#9fd8f0' : e && e.spec === 'avalanche' ? '#e09a5a' : '#ffb84a');
  const hot = e => (e && e.spec === 'stillwater' ? '#e8fbff' : '#fff0c8');
  // where a blow lands: toward the target, no further than an arm (or a leg) reaches past the boss's edge
  const at = (c, d = 52) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x), dist = Math.hypot(c.tx - c.x, c.ty - c.y), r = Math.min(dist, d); return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, a }; };
  const stop = (c, s) => { if (c.ent && c.ent.st) hitStop(c.ent.st, s, FX.now); };
  // one blow connecting: a white-hot flash, a ring, a few sparks thrown back along the line of the strike
  function impact(c, size, o = {}) {
    const p = at(c, o.reach), k = col(c.ent);
    V.spawn({ x: p.x, y: p.y, z: 16, life: 0.16 + size * 0.06, size: 30 + size * 30, size1: 8, color: hot(c.ent), kind: 'star', vr: 6 });
    V.shock(p.x, p.y, { r: 26 + size * 26, color: k, dur: 0.22 + size * 0.08, w: 2 + size * 2 });
    V.sparks(p.x, p.y, { color: k, n: 3 + Math.round(size * 5), angle: p.a, spread: 0.7, speed: 220 + size * 160 });
    stop(c, 0.04 + size * 0.05);
    if (size >= 1) shake(1.5 + size * 1.5);
    return p;
  }
  // an open palm: a five-fingered print of light pressed into the air where it lands
  function print(x, y, a, color, size = 1, dur = 0.35) {
    V.fx({ dur, layer: 'air', draw: (ctx, p, t, e) => {
      const k = (1 - p) * e.a, s = size * (1 + p * 0.4);
      ctx.save(); ctx.translate(x, y - 18); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
      V.neonPath(ctx, color, 2.2, k, () => {
        ctx.moveTo(6 * s, 0); ctx.ellipse(0, 0, 6 * s, 7 * s, 0, 0, Math.PI * 2);
        for (let i = 0; i < 4; i++) { const fy = (-4.5 + i * 3) * s; ctx.moveTo(6 * s, fy); ctx.lineTo((12 - Math.abs(i - 1.5) * 1.5) * s, fy); }
        ctx.moveTo(2 * s, -6 * s); ctx.lineTo(6 * s, -10 * s);   // the thumb
      });
      ctx.restore();
    } });
  }

  ABILITY_VFX.ironpalm = {
    // the three inputs: tiny and quick (they come several a second)
    palm: c => c.later(0.08, () => { const p = impact(c, 0.25); print(p.x, p.y, p.a, col(c.ent), 0.8, 0.25); }),
    fist: c => c.later(0.13, () => { const p = impact(c, 0.55); V.smoke(p.x, p.y, { n: 1, color: '#d8ccb8', size: 14, a: 0.4, speed: 30, life: 0.5 }); }),
    kick: c => { V.slash(c.x, c.y, c.ang, { r: 46, span: 1.5, color: col(c.ent), w: 0.35, dur: 0.18, flip: true }); c.later(0.1, () => impact(c, 0.4, { reach: 58 })); },
    // (Crane Step, Rising Gate, Thousand Palms, Read: VFX PASS · IRONPALM, after the Ultimates)
    // Flowing Palms: three prints in a row, the last one pushed through
    flow: c => { for (let i = 0; i < 3; i++) c.later(0.03 + i * 0.05, () => { const p = at(c), o = (i - 1) * 9; print(p.x + Math.sin(p.a) * o, p.y - Math.cos(p.a) * o, p.a, col(c.ent), 0.8 + i * 0.15, 0.3); });
      c.later(0.14, () => impact(c, 0.7)); },
    // Heaven's Drop: an axe kick down onto the airborne boss: a slash from above, a crater, the floor cracks, a big stop
    drop: c => { V.slash(c.x, c.y, c.ang, { r: 70, span: 2.2, color: hot(c.ent), w: 0.6, dur: 0.24 });
      c.later(0.18, () => {
        const k = col(c.ent); impact(c, 1.6, { reach: 60 }); stop(c, 0.14);
        V.spikeburst(c.tx, c.ty, { r: 64, n: 14, color: k, core: hot(c.ent), ink: '#2a1408', dur: 0.36 });
        V.decal(c.tx, c.ty, { style: 'crack', r: 60, dur: 2.4, a: 0.6, seed: Math.random() * 6 });
        V.shock(c.tx, c.ty, { r: 120, color: k, dur: 0.45, w: 7 });
        V.debris(c.tx, c.ty, { n: 8, color: '#7a6a58' }); V.smoke(c.tx, c.ty, { n: 6, r: 30, color: '#a89880', size: 30, a: 0.45, speed: 60, life: 1.4 });
        shake(6);
      }); },
    // Tiger Wall: a low stance; a shield of striped light across the front, dust swept out to the sides
    wall: c => { c.later(0.12, () => impact(c, 0.5)); V.shield(c.ent, { shape: 'front', color: col(c.ent), dur: 5, r: 40 });
      V.smoke(c.x, c.y, { n: 4, color: '#d8ccb8', size: 18, a: 0.45, speed: 50 }); V.glint(c.x + Math.cos(c.ang) * 30, c.y + Math.sin(c.ang) * 30, { color: hot(c.ent), size: 24 }); },
    // Stone Breaker: a crushing low kick; stone shards and a dark bruise ring on the boss
    breaker: c => c.later(0.12, () => {
      const p = impact(c, 0.9, { reach: 58 });
      V.crystals(c.tx, c.ty, { color: '#a89480', n: 5, r: 26, h: 28, dur: 0.6 });
      V.sigil(c.tx, c.ty, { r: 40, style: 'runes', color: '#b05a5a', dur: 1, spin: 1.5 });
      V.debris(p.x, p.y, { n: 4, color: '#6a5a48', speed: 0.6 });
    }),
    // Iron Ox: a heavy straight with the whole body: a fat ring, a dust cone thrown out behind the boss
    ox: c => c.later(0.16, () => {
      const p = impact(c, 1.3), k = col(c.ent);
      V.shock(c.tx, c.ty, { r: 90, color: k, dur: 0.4, w: 6, delay: 0.04 });
      for (let i = 0; i < 6; i++) { const a = p.a + rand(-0.6, 0.6), sp = rand(120, 240); V.spawn({ x: c.tx, y: c.ty, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(20, 60), drag: 0.06, life: 0.8, size: 18, size1: 34, color: '#c8b8a0', kind: 'smoke', add: false, a: 0.4 }); }
    }),
    // Iron Skin: the skin goes dark iron: a metal sheen ring, rivet sparks, a grey aura that stays the 10s
    skin: c => { V.glint(c.x, c.y, { color: '#e8eef6', size: 30, z: 30 }); V.aura(c.ent, { color: '#9aa8b8', dur: 10, r: 28, rate: 0.15 });
      V.shock(c.x, c.y, { r: 70, color: '#c8d4e2', dur: 0.4, w: 5 }); V.sparks(c.x, c.y - 16, { color: '#ffffff', n: 8, speed: 220 }); shake(2); },
    // Temple Bell: the chest struck like a bell: three gold rings of sound roll out over the party
    bell: c => { V.glint(c.x, c.y, { color: '#ffe08a', size: 32, z: 34 });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 150 + i * 40, color: '#ffd27a', dur: 0.7, w: 6 - i * 1.5, delay: i * 0.18 });
      V.sigil(c.x, c.y, { r: 120, style: 'star5', color: '#ffd27a', dur: 1.6, spin: 0.6 }); V.aura(c.ent, { color: '#ffd27a', dur: 15, r: 28, rate: 0.12 }); shake(2); },
    // Still Pond: the floor goes still as water: a pale pool spreads, rings on it, the monk calm in the middle
    pond: c => { V.ink(c.x, c.y, { r: 90, dur: 8, follow: c.ent, a: 0.25 }); V.sigil(c.x, c.y, { r: 90, style: 'hex', color: '#9fd8f0', dur: 8, spin: 0.2, follow: c.ent });
      for (let i = 0; i < 3; i++) V.shock(c.x, c.y, { r: 60 + i * 30, color: '#cfeeff', dur: 0.9, w: 3, delay: i * 0.25 }); },
    // Landslide: the floor heaves; boulders, a rolling dust wall over the party, the earth aura
    slide: c => { V.crater(c.x, c.y, { r: 70, color: '#c07a3a', dur: 2.4, flames: 0, a: 0.4 }); V.debris(c.x, c.y, { n: 10, color: '#7a6a58' });
      V.shock(c.x, c.y, { r: 170, color: '#e09a5a', dur: 0.6, w: 7 }); V.smoke(c.x, c.y, { n: 8, r: 80, color: '#a89070', size: 34, a: 0.4, speed: 60, life: 1.6 });
      V.aura(c.ent, { color: '#e09a5a', dur: 15, r: 30, rate: 0.2 }); shake(6); },
    // Bellows Stance (talent): a great breath in, heat rising off the monk, an orange aura
    bellows: c => { V.swirl(c.x, c.y, { r: 50, color: '#ffb070', dur: 0.6, inward: true, follow: c.ent }); V.aura(c.ent, { color: '#ff9a4a', style: 'flame', dur: 10, r: 28, rate: 0.2 }); V.shock(c.x, c.y, { r: 80, color: '#ffb070', dur: 0.4, w: 4, delay: 0.5 }); },
    // Dragon Ascends (talent): a leap, a coiling streak of gold up and over, and a great blow on the target
    dragon: c => { V.smoke(c.x, c.y, { n: 4, color: '#d8ccb8', size: 20, a: 0.5, speed: 50 }); V.tornado(c.x, c.y, { color: '#ffd27a', h: 120, r: 18, dur: 0.5 });
      c.later(0.3, () => { V.lightfall(c.tx, c.ty, { color: '#ffd27a', r: 30, h: 260, dur: 0.6, feathers: 0 }); V.spikeburst(c.tx, c.ty, { r: 70, n: 16, color: '#ffb84a', core: '#fff6d0', ink: '#3a2408', dur: 0.4 });
        V.shock(c.tx, c.ty, { r: 140, color: '#ffd27a', dur: 0.5, w: 7 }); V.debris(c.tx, c.ty, { n: 6, color: '#7a6a58' }); stop(c, 0.12); shake(6); }); },
  };

  Object.assign(KIT_VFX, {
    // a Crisp press (only you see it): a thin bright ring snapping shut on the hand
    crisp: e => { const x = e.x + Math.cos(e.angle || 0) * 22, y = e.y + Math.sin(e.angle || 0) * 22; V.shock(x, y, { r: 22, color: '#fff6d8', dur: 0.16, w: 2 }); V.spawn({ x, y, z: 18, life: 0.12, size: 22, size1: 4, color: '#ffffff', kind: 'star' }); },
    // Read: the blow is caught. A white flash in front, a still ring, and on a tankbuster a gold star and a long stop
    read: (e, target, d) => {
      const b = d && d.b, x = e.x + Math.cos(e.angle || 0) * 24, y = e.y + Math.sin(e.angle || 0) * 24;
      V.spawn({ x, y, z: 20, life: 0.25, size: b ? 90 : 60, size1: 20, color: '#ffffff', kind: 'star', vr: 5 });
      V.shock(e.x, e.y, { r: b ? 110 : 70, color: b ? '#ffd27a' : '#e8f4ff', dur: 0.4, w: b ? 7 : 4 });
      V.sparks(x, y, { color: '#fff2c8', n: b ? 14 : 8, angle: e.angle || 0, spread: 1, speed: 360 });
      if (e.st) hitStop(e.st, b ? 0.18 : 0.08, FX.now);
      if (b) { V.sigil(e.x, e.y, { r: 70, style: 'star4', color: '#ffd27a', dur: 0.8, spin: 3 }); FX.shake = Math.max(FX.shake, 4); }
    },
    // Avalanche Fist: a dropped string staggers you: grit and a dull ring
    stagger: e => { V.smoke(e.x, e.y, { n: 4, color: '#8a7a68', size: 18, a: 0.5, speed: 30 }); V.shock(e.x, e.y, { r: 40, color: '#8a6a50', dur: 0.3, w: 3 }); },
    // Heaven's Drop (Mountain Falls talent): the ground under the boss gives a second later
    aftershock: Object.assign((e, target) => { const t = target || e; V.shock(t.x, t.y, { r: 110, color: '#c8a070', dur: 0.5, w: 6 }); V.debris(t.x, t.y, { n: 6, color: '#7a6a58' }); V.decal(t.x, t.y, { style: 'crack', r: 50, dur: 1.8, a: 0.5, seed: Math.random() * 6 }); shake(3); }, { atTarget: true }),
    // Thousand Palms (Echoing Palm talent): three faint palm prints, half a second behind
    'echo-palm': Object.assign((e, target) => { const t = target || e; for (let i = 0; i < 3; i++) FX.later(i * 0.08, () => print(t.x + rand(-16, 16), t.y + rand(-10, 10), Math.atan2(t.y - e.y, t.x - e.x), '#ffe0b0', 0.9, 0.35)); }, { atTarget: true }),
    // Temple Bell (Resounding Gong talent): the bell rings again 8s later
    gong: e => { for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 140 + i * 40, color: '#ffd27a', dur: 0.6, w: 5 - i * 2, delay: i * 0.15 }); },
  });

  // the taunt: Beckoning Palm. A palm print held out toward the target, a line of breath to it, the print pressed on it
  const baseTaunt = KIT_VFX.taunt;
  KIT_VFX.taunt = (e, target) => {
    if (!(e.cls && e.cls.id === 'ironpalm')) return baseTaunt(e, target);
    const a = target ? Math.atan2(target.y - e.y, target.x - e.x) : (e.angle || 0);
    print(e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, a, '#ffd9a0', 1.3, 0.6);
    V.shock(e.x, e.y, { r: 70, color: '#ffb84a', w: 3, dur: 0.35 });
    if (!target) return;
    V.beam(e.x, e.y - 4, target.x, target.y - 12, { color: '#ffe0b0', w: 4, dur: 0.3 });
    FX.later(0.12, () => { print(target.x, target.y, a, '#ffb84a', 2, 0.7); V.shock(target.x, target.y, { r: 60, color: '#ffb84a', w: 3, dur: 0.35 }); });
  };

  // autos: a quick knuckle flash where the jab lands
  AUTO_VFX.fist = c => { const d = Math.min(Math.hypot(c.tx - c.ent.x, c.ty - c.ent.y), 50), x = c.ent.x + Math.cos(c.ang) * d, y = c.ent.y + Math.sin(c.ang) * d;
    V.hit(x, y, '#ffe0b0', 0.4); if (c.ent.st) hitStop(c.ent.st, 0.03, FX.now); };
  // (Hundred Palms, the Ultimates block at the bottom of this file, reuses these)
  globalThis.IRONPALM_VFX = { col, hot, print, impact, at };
})();
// ======================================================================= Threadweaver and Marionettist (classes-c)
// Threads are lilac light with a running bead, like a needle drawing a seam; a snap flicks the two halves apart. The
// Doll's moves play on the Doll (stagecraft.js keeps where each one is and plays its pose); the strings flash as blades
// for Cross-Cut. Big moves keep the three beats: a glyph, a bold shape, a slow aftermath.
(() => {
  const V = VFX, TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  const idOf = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  const dollsOf = ent => (typeof Stagecraft !== 'undefined' ? Stagecraft.dollsOf(idOf(ent), typeof Net !== 'undefined' ? Net.id : 0) : []);
  const act = (ent, kind) => { if (typeof Stagecraft !== 'undefined') Stagecraft.act(idOf(ent), kind, FX.now || 0); };
  // a thread drawn out from a to b over `grow` s, then fading
  const threadOut = (a, b, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: 'air', draw: (c, p, t, e) => {
    const q = Math.min(1, t / (o.grow ?? 0.22)), k = Math.min(1, (1 - p) / 0.4) * e.a, ax = a.x, ay = a.y - 14, bx = ax + (b.x - ax) * q, by = ay + (b.y - 14 - ay) * q;
    V.neonPath(c, o.color || '#cbb8ff', o.w ?? 2, k, () => { c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 16 * (1 - q), bx, by); });
    V.glowAt(c, bx, by, 8, '#f2e6ff', 0.8 * k);
  } });
  // a bead of light running along every thread on this ally, out to whoever is on the far end
  const runDown = (who, col) => {
    if (typeof Stagecraft === 'undefined' || !who) return;
    const id = idOf(who);
    for (const [a, b] of Stagecraft.S.threads) {
      if (a !== id && b !== id) continue;
      const env = Stagecraft.S.env, other = env ? env.entById(a === id ? b : a) : null;
      if (!other) continue;
      V.fx({ dur: 0.45, layer: 'air', draw: (c, p, t, e) => { const x = who.x + (other.x - who.x) * p, y = who.y - 12 + (other.y - who.y) * p; V.glowAt(c, x, y, 10, col, e.a); V.glowAt(c, x, y, 4, '#ffffff', e.a); },
        done: () => V.plus(other.x, other.y, { color: col, n: 3 }) });
    }
  };

  // ---- Threadweaver painted-sheet pieces (docs/art/vfx-reference/threadweaver.png): crimson and gold threads.
  // Floor marks flare, then settle low so boss telegraphs read through them. Grand Loom (the Ultimates block at the
  // bottom of this file) reuses them through THREADWEAVER_VFX.
  const TW_CRIM = '#e8203a', TW_ROSE = '#ff5a6a', TW_GOLD = '#ffcf7a', TW_HOT = '#fff0ea';
  // the woven diamond seal: a gold diamond round a crimson one, lens-shaped petals woven through it, spikes past its
  // points (Tapestry, Snap's aftermath, Grand Loom's aftermath)
  function weaveDiamond(x, y, R, dur, o = {}) {
    const peak = o.peak ?? 0.85, settle = o.settle ?? 0.28, W = o.w ?? 1;   // o.w: line weight
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.12) * Math.min(1, (1 - p) * dur / 0.6) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.7));
      if (k < 0.02) return;
      const RR = R * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.25)));
      const dia = r => { c.moveTo(0, -r); c.lineTo(r, 0); c.lineTo(0, r); c.lineTo(-r, 0); c.closePath(); };
      const lens = (a, L, wd, col, w) => V.neonPath(c, col, w * W, k, () => { const ca = Math.cos(a), sa = Math.sin(a), px = -sa * wd, py = ca * wd; c.moveTo(0, 0); c.quadraticCurveTo(ca * L / 2 + px, sa * L / 2 + py, ca * L, sa * L); c.quadraticCurveTo(ca * L / 2 - px, sa * L / 2 - py, 0, 0); });
      c.save(); c.translate(x, y); c.scale(1, 0.78);
      c.globalAlpha = 0.14 * k; c.fillStyle = '#5a0a18'; c.beginPath(); dia(RR); c.fill(); c.globalAlpha = 1;
      V.neonPath(c, TW_GOLD, 2 * W, k, () => dia(RR));
      V.neonPath(c, TW_CRIM, 1 * W, k * 0.7, () => dia(RR * 0.92));
      V.neonPath(c, TW_CRIM, 1.6 * W, k, () => dia(RR * 0.74));
      for (let i = 0; i < 4; i++) lens(i * Math.PI / 2, RR * 0.95, RR * 0.16, TW_CRIM, 1.6);
      for (let i = 0; i < 4; i++) lens(Math.PI / 4 + i * Math.PI / 2, RR * 0.5, RR * 0.12, TW_GOLD, 1.3);
      V.neonPath(c, TW_GOLD, 1.4 * W, k, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(Math.cos(a) * RR, Math.sin(a) * RR); c.lineTo(Math.cos(a) * RR * 1.2, Math.sin(a) * RR * 1.2); } });
      V.neonPath(c, TW_GOLD, 1.4 * W, k, () => dia(RR * 0.14));
      c.restore();
      V.glowAt(c, x, y, RR * 0.3, TW_CRIM, 0.5 * k);
    } });
  }
  // a thread snapping: thin crimson rays shooting out of a point, white-hot in the middle
  function weaveSnapBurst(x, y, o = {}) {
    const R = o.r ?? 60, n = o.n ?? 12, rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), l: rand(0.55, 1) }));
    V.fx({ dur: 0.4, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, p / 0.35)), k = e.a * (1 - Math.max(0, (p - 0.3) / 0.7));
      for (const r of rays) { const ca = Math.cos(r.a), sa = Math.sin(r.a) * 0.8, L = R * r.l * q;
        V.neonPath(c, r.l > 0.8 ? TW_ROSE : TW_CRIM, r.l > 0.8 ? 2.8 : 2.2, k, () => { c.moveTo(x + ca * L * 0.3, y + sa * L * 0.3); c.lineTo(x + ca * L, y + sa * L); }); }
      V.glowAt(c, x, y, R * 0.6, TW_CRIM, 0.6 * k); V.glowAt(c, x, y, R * 0.35, TW_ROSE, 0.8 * k); V.glowAt(c, x, y, R * 0.2, '#ffffff', k);
    } });
  }
  // two bright lances crossing through a point (Grand Loom on the boss): each shoots through end to end, then fades
  function weaveCross(x, y, o = {}) {
    const L = o.L ?? 150, a0 = rand(-0.15, 0.15), cy = y - 24, W = o.w ?? 1;   // o.w: the lances' thickness
    V.fx({ dur: o.dur ?? 0.45, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.7);
      for (let i = 0; i < 2; i++) {
        const q = easeOut(Math.max(0, Math.min(1, (t - i * 0.05) / 0.1))); if (q <= 0) continue;
        const a = a0 + (i ? 0.7 : -0.7), ca = Math.cos(a), sa = Math.sin(a) * 0.78;
        const x0 = x - ca * L, y0 = cy - sa * L, x1 = x0 + ca * 2 * L * q, y1 = y0 + sa * 2 * L * q, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const [col, w, al] of [[TW_CRIM, 12 * W, 0.35], [TW_CRIM, 7 * W, 0.7], [TW_GOLD, 3.6 * W, 0.6], [TW_HOT, 2.2 * W, 1]]) { c.globalAlpha = al * k; c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(mx - sa * w, my + ca * w); c.lineTo(x1, y1); c.lineTo(mx + sa * w, my - ca * w); c.closePath(); c.fill(); }
        c.restore();
        V.glowAt(c, x1, y1, 16 * W, TW_HOT, k);
      }
      V.glowAt(c, x, cy, 44 * W, TW_CRIM, 0.8 * k);
    } });
  }
  // Tie: a loop of thread flies from her hand to the ally, its line trailing back to her
  function weaveLoopFly(a, b, o = {}) {
    const fly = o.fly ?? 0.24, dur = fly + 0.3;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, t / fly)), k = e.a * Math.min(1, (dur - t) / 0.3);
      const ax = a.x, ay = a.y - 18, bx = b.x, by = b.y - 18, hx = ax + (bx - ax) * q, hy = ay + (by - ay) * q - Math.sin(q * Math.PI) * 30;
      V.neonPath(c, TW_CRIM, 2.2, k, () => { c.moveTo(ax, ay); c.quadraticCurveTo((ax + hx) / 2, Math.min(ay, hy) - 24 * (1 - q * 0.5), hx, hy); });
      V.neonPath(c, TW_ROSE, 1, k * 0.7, () => { c.moveTo(ax, ay - 3); c.quadraticCurveTo((ax + hx) / 2, Math.min(ay, hy) - 34 * (1 - q * 0.5), hx, hy); });
      if (q < 1) { V.neonPath(c, TW_ROSE, 2.6, k, () => c.ellipse(hx, hy, 13, 7, t * 10, 0, TAU)); V.neonPath(c, TW_CRIM, 1.4, k, () => c.ellipse(hx, hy, 8, 12, -t * 8, 0, TAU)); }
      V.glowAt(c, hx, hy, 16, TW_GOLD, 0.7 * k);
    } });
  }
  // a thread coiled round an ally: a helix from their feet to their shoulders that pulls tight, then fades slowly
  function weaveCoil(w, o = {}) {
    const dur = o.dur ?? 1;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const tight = easeOut(Math.min(1, t / 0.25)), rx = 30 - 12 * tight, k = e.a * Math.min(1, t / 0.06) * Math.min(1, (1 - p) / 0.5), x = w.x, y = w.y - (w.lift || 0);
      const helix = (ph, col, wd, kk) => V.neonPath(c, col, wd, kk, () => { for (let s = 0; s <= 40; s++) { const q = s / 40, a = q * TAU * 3.5 + t * 6 + ph, px = x + Math.cos(a) * rx, py = y - 4 - q * 50 + Math.sin(a) * rx * 0.3; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      V.glowAt(c, x, y - 28, 30, TW_CRIM, 0.35 * k);
      helix(0, TW_CRIM, 2.2, k); helix(Math.PI, TW_ROSE, 1.2, k * 0.7);
      V.glowAt(c, x + rx, y - 28, 12, TW_GOLD, 0.8 * k);
    } });
  }
  // Needle: a sharp lance of thread shoots at the target, a crimson spiral thread trailing behind it; onHit where it bites
  function weaveLance(sx, sy, tx, ty, onHit) {
    const d = Math.hypot(tx - sx, ty - sy), fly = Math.max(0.08, d / 1500), dur = fly + 0.25, ang = Math.atan2(ty - sy, tx - sx), ca = Math.cos(ang), sa = Math.sin(ang);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / fly), k = e.a * (t < fly ? 1 : Math.max(0, 1 - (t - fly) / 0.25)), hx = sx + (tx - sx) * q, hy = sy - 16 + (ty - sy) * q;
      V.neonPath(c, TW_CRIM, 2.3, k * 0.9, () => { for (let s = 0; s <= 20; s++) { const f = s / 20, L = d * q * f, w = 7 * Math.sin(f * Math.PI) * Math.sin(f * 18 - t * 30); const px = sx + ca * L - sa * w, py = sy - 16 + sa * L + ca * w; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      if (t >= fly) return;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [col, len, w, al] of [[TW_CRIM, 56, 6, 0.45], [TW_ROSE, 44, 3.4, 0.9], ['#ffffff', 28, 1.3, 1]]) { c.globalAlpha = al * k; c.fillStyle = col; c.beginPath(); c.moveTo(hx + ca * 13, hy + sa * 13); c.lineTo(hx - sa * w, hy + ca * w); c.lineTo(hx - ca * len, hy - sa * len); c.lineTo(hx + sa * w, hy - ca * w); c.closePath(); c.fill(); }
      c.restore();
      V.glowAt(c, hx, hy, 18, TW_ROSE, 0.85 * k);
    } });
    V.fx({ dur: fly, layer: 'air', draw: () => {}, done: () => onHit(tx, ty) });
  }
  // where a Needle bites: a small crimson star, and a faint eight-point star etched on the floor for a moment
  function weaveStar(x, y) {
    V.spikeburst(x, y, { r: 40, n: 10, color: TW_CRIM, core: TW_HOT, ink: '#2a0410', dur: 0.3 });
    V.sparks(x, y, { color: TW_ROSE, n: 5, speed: 260 });
    V.fx({ dur: 0.9, layer: 'ground', draw: (c, p, t, e) => { const k = e.a * 0.6 * (1 - p); V.neonPath(c, TW_CRIM, 1.7, k, () => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, L = i % 2 ? 18 : 36; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L * 0.78); } }); } });
  }
  // Shuttle: two threads loop over each other in a chain of figure-eights from her to the target, the gold shuttle at
  // their head; onHit where it strikes
  function weaveShuttleLoops(sx, sy, tx, ty, onHit) {
    const d = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx), ca = Math.cos(ang), sa = Math.sin(ang), fly = 0.3, dur = fly + 0.35, A = Math.min(44, 13 + d * 0.1);
    const pt = (f, s) => { const al = d * (f - 0.1 * Math.sin(f * TAU * 2)), lat = s * A * Math.sin(f * TAU * 1.5); return [sx + ca * al - sa * lat, sy - 16 + sa * al + ca * lat]; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = easeOut(Math.min(1, t / fly)), k = e.a * Math.min(1, (dur - t) / 0.3);
      for (const s of [1, -1]) V.neonPath(c, s > 0 ? TW_CRIM : TW_ROSE, 2.8, k, () => { for (let i = 0; i <= 30; i++) { const [px, py] = pt(q * i / 30, s); i ? c.lineTo(px, py) : c.moveTo(px, py); } });
      if (t < fly) { const [hx, hy] = pt(q, 0); V.glowAt(c, hx, hy, 26, TW_CRIM, 0.6 * k); V.glowAt(c, hx, hy, 16, TW_GOLD, k); V.glowAt(c, hx, hy, 6, '#ffffff', k); }
    } });
    V.fx({ dur: fly, layer: 'air', draw: () => {}, done: () => onHit(tx, ty) });
  }
  // crossed threads left lying on the floor a moment (Shuttle's aftermath): faint, short
  function weaveFloorThreads(x, y, n, dur) {
    const ls = Array.from({ length: n }, () => ({ a: rand(0, Math.PI), L: rand(75, 125), o: rand(-18, 18) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1) * (1 - p) * 0.62; if (k < 0.02) return;
      for (const l of ls) { const ca = Math.cos(l.a), sa = Math.sin(l.a) * 0.78, ox = -sa * l.o, oy = ca * l.o; V.neonPath(c, TW_CRIM, 2.2, k, () => { c.moveTo(x + ox - ca * l.L, y + oy - sa * l.L); c.lineTo(x + ox + ca * l.L, y + oy + sa * l.L); }); }
    } });
  }
  globalThis.THREADWEAVER_VFX = { diamond: weaveDiamond, snapBurst: weaveSnapBurst, cross: weaveCross, CRIM: TW_CRIM, ROSE: TW_ROSE, GOLD: TW_GOLD, HOT: TW_HOT };

  ABILITY_VFX.threadweaver = {
    // Needle (painted sheet): a sharp crimson lance with a spiral thread trailing it, a small star where it bites
    needle: c => { const hx = c.x + Math.cos(c.ang || 0) * 12, hy = c.y + Math.sin(c.ang || 0) * 12; weaveLance(hx, hy, c.tx, c.ty, (x, y) => weaveStar(x, y)); },
    // Tie (painted sheet): a loop of thread flies to the ally and coils round them, pulling tight, then fades
    tie: c => { const w = c.tent || c.ent; weaveLoopFly(c.ent, w);
      c.later(0.24, () => { weaveCoil(w, { dur: 1.2 }); V.glint(w.x, w.y, { color: TW_GOLD, size: 28, z: 24 }); V.sparks(w.x, w.y, { color: TW_ROSE, n: 5, speed: 190, z: 22 }); }); },
    // a running stitch of light closes over the ally, then beads run down each of their threads
    mend: c => { const w = c.tent || c.ent;
      V.sigil(w.x, w.y, { r: 42, style: 'runes', color: '#e4d8ff', dur: 0.7, spin: 2, follow: w }); V.plus(w.x, w.y, { color: '#e4d8ff', n: 5 });
      V.fx({ dur: 0.6, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a; cc.save(); cc.setLineDash([5, 4]); cc.lineDashOffset = -t * 40; V.neonPath(cc, '#f2e6ff', 1.6, k, () => cc.ellipse(w.x, w.y - 20, 22, 26, 0, 0, TAU)); cc.restore(); } });
      c.later(0.15, () => runDown(w, '#e4d8ff')); },
    // the shears close over the threads: a flash of silver, and the cut threads let go their heal (thrs plays the snaps)
    snip: c => { const w = c.tent || c.ent;
      V.fx({ dur: 0.4, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a, o = 0.7 * (1 - Math.min(1, p * 2.5)); for (const s of [-1, 1]) V.neonPath(cc, s > 0 ? TW_HOT : TW_ROSE, 3.2, k, () => { const a = -Math.PI / 4 + s * o; cc.moveTo(w.x - Math.cos(a) * 28, w.y - 30 - Math.sin(a) * 28); cc.lineTo(w.x + Math.cos(a) * 28, w.y - 30 + Math.sin(a) * 28); }); } });
      V.glint(w.x, w.y, { color: '#ffffff', size: 38, z: 30 });
      // (painted sheet) the threads snap in a crimson starburst, then a small woven diamond under the ally
      c.later(0.12, () => { weaveSnapBurst(w.x, w.y - 24, { r: 84, n: 16 }); V.sparks(w.x, w.y, { color: TW_ROSE, n: 7, speed: 280, z: 24 }); weaveDiamond(w.x, w.y, 72, 1.4, { peak: 0.8, settle: 0.32, w: 1.3 }); }); },
    // Shuttle (painted sheet): two threads loop over each other in figure-eights out to the boss with the gold shuttle
    // at their head; beads run down her threads (one strike per thread); crossed threads lie a moment where it strikes
    shuttle: c => { runDown(c.ent, TW_ROSE); weaveShuttleLoops(c.x, c.y, c.tx, c.ty, (x, y) => { V.hit(x, y, TW_ROSE, 0.85); weaveSnapBurst(x, y - 20, { r: 50, n: 10 }); V.glint(x, y, { color: TW_GOLD, size: 30, z: 20 }); weaveFloorThreads(x, y, 4, 1.2); }); },
    // Tapestry (painted sheet): a snapping starburst of thread, then a great woven diamond seal under her, ribbons of
    // crimson and gold wheeling out to the party (stagecraft.js draws the web itself while it lasts)
    tapestry: c => { weaveSnapBurst(c.x, c.y - 24, { r: 118, n: 18 }); weaveDiamond(c.x, c.y, 175, 2.4, { peak: 0.9, settle: 0.36, w: 1.4 });
      V.ribbons(c.x, c.y, { r: 112, dur: 1.3, follow: c.ent, colors: [TW_GOLD, TW_CRIM, '#ffffff'] }); V.shock(c.x, c.y, { r: 240, color: TW_GOLD, dur: 0.6, w: 6 }); shake(3); },
    // Embroider: a flower of stitches blooms over the ally and every thread on them lights up
    embroider: c => { const w = c.tent || c.ent; V.sigil(w.x, w.y, { r: 56, style: 'petals', color: '#f0d8ff', dur: 0.9, spin: 3, follow: w }); V.burst(w.x, w.y - 20, { color: '#f0d8ff', color2: '#ffffff', n: 12, speed: 180, kind: 'star', flash: false }); V.plus(w.x, w.y, { color: '#f0d8ff', n: 6 }); c.later(0.1, () => runDown(w, '#f0d8ff')); },
    // Cat's Cradle: a web strung at her feet for 9s, glinting where its strands cross
    cradle: c => { const x = c.x, y = c.y, r = 150;
      V.shock(x, y, { r: r + 20, color: '#cbb8ff', dur: 0.5, w: 5 });
      V.fx({ dur: 9, layer: 'ground', draw: (cc, p, t, e) => {
        const k = Math.min(1, p / 0.04, (1 - p) / 0.06) * e.a, pts = [];
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + Math.sin(t * 0.5) * 0.04; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.78]); }
        for (let i = 0; i < 8; i++) for (const j of [3, 5]) { const A = pts[i], B = pts[(i + j) % 8]; V.neonPath(cc, '#cbb8ff', 1.2, k * 0.6, () => { cc.moveTo(A[0], A[1]); cc.lineTo(B[0], B[1]); }); }
        V.neonRing(cc, x, y, r, '#e8deff', 1.4, k * 0.5);
        for (const [px, py] of pts) V.glowAt(cc, px, py, 6, '#f2e6ff', k * 0.7);
      } }); },
  };

  ABILITY_VFX.marionettist = {
    // (painted pass, marionettist.png: crimson velvet, rose petals, gold strings and footlights)
    // the Doll stabs: a quick crimson cut from where it stands
    jab: c => { act(c.ent, 'jab'); for (const d of dollsOf(c.ent)) { const a = Math.atan2(c.ty - d.y, c.tx - d.x); V.slash(d.x, d.y, a, { r: 46, span: 0.9, color: '#ff5a7a', w: 0.4, dur: 0.2, sparks: 2 }); c.later(0.08, () => V.hit(d.x + Math.cos(a) * 40, d.y + Math.sin(a) * 40, '#ffb0c4', 0.5)); } },
    // Pull Strings (the Doll Summon panel): the string from the bar draws taut in gold, then the Doll is let down on three
    // gold strings with a crimson ribbon spiralling round it, rings where it lands and a few petals settling
    pull: c => { act(c.ent, 'pull'); const MP = MARI_PAINT; c.later(0.03, () => { for (const d of dollsOf(c.ent)) { threadOut(c.ent, d, { color: '#ffd27a', w: 1.4, grow: 0.12, dur: 0.4 }); MP.dollDrop(d.x, d.y, { dur: 0.5 });
      V.smoke(d.x, d.y, { n: 3, color: '#f0d8e8', size: 20, a: 0.3, speed: 50 }); MP.petals(d.x, d.y, { n: 9, speed: 150, life: 1.3 }); V.glint(d.x, d.y, { color: '#ffffff', size: 26, z: 34 }); } }); },
    // Cross-Cut: every string goes rigid and bright crimson for a moment, a blade from the bar to the Doll; where the line
    // crosses the enemy a bright crimson X flashes, rose petals burst off it and a faint X stays scored on the floor
    cross: c => { act(c.ent, 'cut'); const MP = MARI_PAINT, ds = dollsOf(c.ent), ox = c.ent.x, oy = c.ent.y;
      V.fx({ dur: 0.42, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a, w = 5.5 * (1 - p) + 1.2; for (const d of ds) { V.neonPath(cc, '#e0203c', w, k, () => { cc.moveTo(ox, oy - 12); cc.lineTo(d.x, d.y - 12); }); V.neonPath(cc, '#ffd27a', 1.3, k, () => { cc.moveTo(ox, oy - 12); cc.lineTo(d.x, d.y - 12); }); } } });
      for (const d of ds) { V.sparks((ox + d.x) / 2, (oy + d.y) / 2, { color: '#ff9ab0', n: 5, angle: Math.atan2(d.y - oy, d.x - ox) + Math.PI / 2, spread: 0.6, speed: 240 }); }
      // the X goes on the enemy when it stands on a string's line, otherwise halfway along the longest string
      let at = null, best = null;
      for (const d of ds) { if (kitSegDist(c.tx, c.ty, ox, oy, d.x, d.y) < 70) at = { x: c.tx, y: c.ty }; const L = Math.hypot(d.x - ox, d.y - oy); if (!best || L > best.L) best = { L, x: (ox + d.x) / 2, y: (oy + d.y) / 2 }; }
      const hit = at || best || { x: c.tx, y: c.ty }, big = !!at || !ds.length;
      c.later(0.05, () => { MP.xcut(hit.x, hit.y, { r: big ? 82 : 52, w: big ? 10 : 6, dur: 0.38, scar: big ? 1.3 : 0.7 }); MP.petals(hit.x, hit.y, { n: big ? 14 : 6, speed: 260, life: 1.4 }); if (big) { V.hit(hit.x, hit.y, '#ff5a7a', 0.9); V.sparks(hit.x, hit.y - 12, { color: '#ffd27a', n: 6, speed: 360 }); } }); },
    // Pirouette: tilted rings of rose and gold light spin round the Doll, two cuts sweep it, petals fly; a small rose
    // sigil is left a moment under where it spun
    pirouette: c => { act(c.ent, 'spin'); const MP = MARI_PAINT; for (const d of dollsOf(c.ent)) { MP.spinRings(d.x, d.y, { r: 76, dur: 0.8 });
      for (let i = 0; i < 2; i++) c.later(i * 0.12, () => V.slash(d.x, d.y, i * Math.PI, { r: 70, span: 2.6, color: i ? '#ffd27a' : '#e0203c', w: 0.5, dur: 0.26 }));
      c.later(0.2, () => MP.petals(d.x, d.y, { n: 12, speed: 230, life: 1.4 })); c.later(0.35, () => MP.roseSigil(d.x, d.y, { r: 62, dur: 1.4, a: 0.45 })); } },
    // Swap: pale afterimages strung along both ways, a pillar of rose light where each of them reappears, and a gold
    // string left between them a moment
    swap: c => { act(c.ent, 'swap'); const MP = MARI_PAINT; c.later(0.03, () => { const ex = c.ent.x, ey = c.ent.y;
      for (const d of dollsOf(c.ent)) { MP.ghostTrail(ex, ey, d.x, d.y, { s: 1.4 }); MP.ghostTrail(d.x, d.y, ex, ey, { s: 1.9 }); V.pillar(d.x, d.y, { r: 18, h: 140, color: '#ff7a94', dur: 0.5 }); V.shock(d.x, d.y, { r: 54, color: '#ffd27a', dur: 0.35, w: 3 }); threadOut(c.ent, d, { color: '#ffd27a', w: 1.4, grow: 0.15, dur: 0.8 }); MP.petals(d.x, d.y, { n: 6, speed: 140, life: 1.2 }); }
      V.pillar(ex, ey, { r: 20, h: 160, color: '#ff7a94', dur: 0.5, follow: c.ent }); V.shock(ex, ey, { r: 60, color: '#e0203c', dur: 0.38, w: 3.5 }); MP.petals(ex, ey, { n: 7, speed: 160, life: 1.2 }); }); },
    // Grand Finale: the footlights come up round the Doll, five crimson cuts in time, a bow and a burst of rose petals
    finale: c => { act(c.ent, 'finale'); const ds = dollsOf(c.ent), MP = MARI_PAINT;
      for (const d of ds) V.fx({ dur: 2.6, layer: 'ground', draw: (cc, p, t, e) => { const k = Math.min(1, p / 0.05, (1 - p) / 0.1) * e.a; for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.7 / 6 + Math.PI / 2; V.glowAt(cc, d.x + Math.cos(a) * 60, d.y + Math.sin(a) * 40, 14, '#ffcf6a', k * (0.5 + Math.sin(t * 9 + i) * 0.15)); } } });
      for (let i = 0; i < 5; i++) c.later(0.45 * i + 0.05, () => { for (const d of dollsOf(c.ent)) { const a = Math.atan2(c.ty - d.y, c.tx - d.x) + (i % 2 ? 0.5 : -0.5); V.slash(d.x, d.y, a, { r: 60, span: 1.6, color: i === 4 ? '#ffd27a' : '#e0203c', w: 0.5, dur: 0.24, flip: i % 2 === 1, sparks: 3 }); } V.hit(c.tx, c.ty, '#ff9ab0', i === 4 ? 1.2 : 0.6); if (i === 4) { shake(4); MP.xcut(c.tx, c.ty, { r: 56, w: 7, dur: 0.34 }); } });
      c.later(2.3, () => { for (const d of dollsOf(c.ent)) MP.petals(d.x, d.y, { n: 16, speed: 230, life: 1.6 }); }); },
    // Tangle: the Doll lunges and its strings wind round the enemy in rose and gold loops that tighten
    tangle: c => { act(c.ent, 'jab'); const tx = c.tx, ty = c.ty;
      V.fx({ dur: 0.9, layer: 'air', draw: (cc, p, t, e) => { const k = Math.min(1, (1 - p) / 0.3) * e.a; for (let i = 0; i < 4; i++) { const R = 44 * (1 - p * 0.45); V.neonPath(cc, i % 2 ? '#ffd27a' : '#ff5a7a', 1.4, k, () => cc.ellipse(tx, ty - 30, R, R * 0.35, i * Math.PI / 4 + t * 2, 0, TAU)); } } });
      c.later(0.3, () => V.hit(tx, ty, '#ff9ab0', 0.7)); },
    // Red Curtain: velvet drops in a ring round the puppeteer, gold fringe glinting, for 8s
    redcurtain: c => { const ent = c.ent;
      V.fx({ dur: 8, layer: 'ground', draw: (cc, p, t, e) => {
        const k = Math.min(1, p / 0.04, (1 - p) / 0.06) * e.a, x = ent.x, y = ent.y, r = 140;
        cc.globalAlpha = 0.18 * k; cc.fillStyle = '#d03050'; cc.beginPath(); cc.ellipse(x, y, r, r * 0.78, 0, 0, TAU); cc.fill(); cc.globalAlpha = 1;
        for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + Math.sin(t + i) * 0.03; V.neonPath(cc, i % 2 ? '#d03050' : '#a01838', 5, k * 0.8, () => { cc.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.67); cc.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.78); }); }
        V.neonRing(cc, x, y, r, '#ffd27a', 1.4, k * 0.7);
      } });
      V.shock(ent.x, ent.y, { r: 160, color: '#d03050', dur: 0.5, w: 6 }); },
  };

  Object.assign(KIT_VFX, {
    // a thread snapping: the two halves recoil toward their ends; a cut one lets go a little shower of light (its heal)
    threadSnap: (a, b, kind) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 14, col = kind === 1 ? TW_ROSE : kind === 2 ? '#cbb8ff' : '#f2e6ff';
      if (kind === 1) weaveSnapBurst(mx, my, { r: 44, n: 10 });   // cut by Snap: the painted sheet's crimson starburst
      if (kind === 2) { V.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => { const x = a.x + (b.x - a.x) * p, y = a.y - 12 + (b.y - a.y) * p; V.glowAt(c, x, y, 12, '#cbb8ff', e.a); } }); return; }
      V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, e) => {
        const k = (1 - p) * e.a;
        for (const [ex, ey] of [[a.x, a.y - 14], [b.x, b.y - 14]]) { const q = 0.5 + p * 0.5, sx = mx + (ex - mx) * q, sy = my + (ey - my) * q + Math.sin(p * 20) * 6 * (1 - p); V.neonPath(c, col, 1.6, k, () => { c.moveTo(ex, ey); c.quadraticCurveTo((ex + sx) / 2, (ey + sy) / 2 + 8 * p, sx, sy); }); }
      } });
      V.glint(mx, my + 14, { color: '#ffffff', size: kind === 1 ? 30 : 18, z: 14 });
      V.sparks(mx, my + 14, { color: col, n: kind === 1 ? 10 : 5, speed: 200 });
      for (const w of [a, b]) V.plus(w.x, w.y, { color: col, n: kind === 1 ? 4 : 2 });
    },
    tapestryEnd: e => { V.shock(e.x, e.y, { r: 250, color: TW_GOLD, dur: 0.6, w: 6 }); weaveDiamond(e.x, e.y, 140, 1.2, { peak: 0.7, settle: 0.34, w: 1.3 }); V.motes(e.x, e.y, { color: TW_GOLD, n: 10, r: 120, kind: 'star' }); },
    // a String tears: a spark at the bar and the frayed end whipping loose
    strtear: (e, t, d) => { const a = e.angle || 0, x = e.x + Math.cos(a) * 24, y = e.y + Math.sin(a) * 24; V.sparks(x, y, { color: d && d.w ? '#ff8a9a' : '#f6e6f0', n: 6, speed: 220 }); V.glint(x, y, { color: '#ff9ab0', size: 18, z: 16 }); },
    limp: e => { for (const dl of dollsOf(e)) { V.smoke(dl.x, dl.y, { n: 5, color: '#8a7a78', size: 20, a: 0.45, speed: 30 }); V.debris(dl.x, dl.y, { n: 3, color: '#c89a64', speed: 0.5 }); } },
    // (painted pass) the Doll comes back to life: let down again on gold strings (the Doll Summon panel)
    unlimp: e => { for (const dl of dollsOf(e)) { V.glint(dl.x, dl.y, { color: '#ffffff', size: 22, z: 30 }); threadOut(e, dl, { color: '#ffd27a', w: 1.2, grow: 0.2, dur: 0.5 }); MARI_PAINT.dollDrop(dl.x, dl.y, { dur: 0.5 }); MARI_PAINT.petals(dl.x, dl.y, { n: 5, speed: 110, life: 1.1 }); } },
    flourish: (e, t) => { for (const dl of dollsOf(e)) V.slash(dl.x, dl.y, (t ? Math.atan2(t.y - dl.y, t.x - dl.x) : 0) + 0.6, { r: 42, span: 1, color: '#ff9ab0', w: 0.35, dur: 0.18, flip: true }); },
    standin: e => { for (const dl of dollsOf(e)) V.shield(dl, { shape: 'hex', color: '#f0a8cc', dur: 0.5, r: 30 }); },
    mend: e => { for (const dl of dollsOf(e)) V.glint(dl.x, dl.y, { color: '#ffffff', size: 18, z: 26 }); },
  });
  KIT_VFX.flourish.atTarget = true;

  // autos: a needle-glint flicked at the enemy; the Doll's idle slap
  Object.assign(AUTO_VFX, {
    needle: c => V.missile(c.ent.x, c.ent.y, c.tx, c.ty, { style: 'blade', color: '#d8c8ff', speed: 1300, size: 0.4, onHit: (x, y) => V.hit(x, y, '#e8ddff', 0.3) }),
    doll: c => { for (const d of dollsOf(c.ent)) { const a = Math.atan2(c.ty - d.y, c.tx - d.x); V.slash(d.x, d.y, a, { r: 40, span: 1.1, color: '#ff7a94', dur: 0.18, w: 0.28, flip: c.alt }); } },
  });
})();

// ======================================================================= ULTIMATES (kits.js ULTIMATES)
// Recipe conventions for an Ultimate (ABILITY_VFX[class][ult id]; a window's empowered moves under their fxId):
//  - a short wind-up (0.3-0.5s, timed by the recipe: FX.cast doesn't delay an Ultimate), then ONE impact;
//  - the screen moments go through c.cam, which is set only for your own hero (FX.camFor): c.cam.dim(a, dur) under
//    the effects, c.cam.stop(dur) a cosmetic hit-stop at the impact, c.cam.punch(amount, dur) a small push in, and
//    c.cam.flash(color, a, dur). Everyone else's Ultimate plays dimmed (FX.cast's 0.6) with no camera at all;
//  - a mark on the floor that lingers (a sigil, a crater) for as long as the moment lasts.
// The parts that land later are KIT_VFX moments (k.fx(name), atTarget when they land on the enemy); they find the
// camera with FX.camFor(ent) the same way.
(() => {
  const V = VFX, shake = s => { FX.shake = Math.max(FX.shake, s); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const ahead = (c, d) => { const a = Math.atan2(c.ty - c.y, c.tx - c.x); return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; };
  const GOLD = '#ffd65a', DAWN = '#ffe9a8', FIRE = '#ff6a1a', EMBER = '#ffb040', ASH = '#ffe0a0';
  const feathers = (x, y, n, col) => { for (let i = 0; i < n; i++) V.spawn({ x, y, z: 30, vx: rand(-160, 160), vy: rand(-70, 70), vz: rand(60, 200), g: 220, drag: 0.03, life: rand(1, 1.6), size: rand(10, 15), color: col, kind: 'feather', vr: rand(-4, 4), flutter: 4 }); };

  // Bastion · Last Bastion: light gathers on the blade, it's driven into the floor, and a dome of dawn rises over a
  // great star that stays on the floor for the dome's 8s. When the dome falls it slams down on the enemy (bastion-slam).
  ABILITY_VFX.bastion.lastbastion = c => {
    const at = { x: c.x, y: c.y };   // (the dome stays where it was raised)
    if (c.cam) c.cam.dim(0.32, 1.3);
    V.charge(c.x, c.y, { color: DAWN, r: 70, n: 12, dur: 0.35, follow: c.ent });
    V.glint(c.x, c.y - 60, { color: '#ffffff', size: 40, z: 40 });
    V.lightfall(c.x, c.y, { color: DAWN, r: 26, h: 300, dur: 0.5, feathers: 0 });
    c.later(0.38, () => {
      if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.07, 0.6); c.cam.flash('#fff0c8', 0.22, 0.35); }
      shake(7);
      V.spikeburst(at.x, at.y, { r: 80, n: 18, color: GOLD, core: '#fffbe0', ink: '#4a3408', dur: 0.42, z: 4 });
      for (let i = 0; i < 3; i++) V.shock(at.x, at.y, { r: 150 + i * 60, color: i ? DAWN : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      V.debris(at.x, at.y, { n: 10, color: '#8a7a68' });
      V.decal(at.x, at.y, { style: 'crack', r: 60, dur: 8, a: 0.55, seed: Math.random() * 6 });
      V.ink(at.x, at.y, { r: 160, dur: 8, a: 0.25 });
      V.sigil(at.x, at.y, { r: 160, style: 'star5', color: GOLD, dur: 8, spin: 0.25 });
      V.dome(at, { color: DAWN, r: 130, dur: 8 });
      V.burst(at.x, at.y - 30, { color: DAWN, color2: '#ffffff', n: 24, speed: 300, kind: 'star', flashR: 120 });
    });
  };
  KIT_VFX['bastion-slam'] = Object.assign((e, target) => {
    const t = target || e, cam = FX.camFor(e);
    if (cam) { cam.stop(0.08); cam.punch(0.05, 0.45); cam.flash('#fff2c8', 0.18, 0.3); }
    shake(6);
    V.lightfall(t.x, t.y, { color: DAWN, r: 44, h: 340, dur: 0.6, feathers: 6 });
    V.spikeburst(t.x, t.y, { r: 90, n: 16, color: GOLD, core: '#fffbe0', ink: '#4a3408', dur: 0.4, z: 6 });
    V.shock(t.x, t.y, { r: 170, color: DAWN, dur: 0.55, w: 8 });
    V.sigil(t.x, t.y, { r: 90, style: 'star4', color: GOLD, dur: 2.4, spin: 1.2 });
    V.decal(t.x, t.y, { style: 'crack', r: 56, dur: 3, a: 0.55, seed: Math.random() * 6 });
    V.debris(t.x, t.y, { n: 8, color: '#8a7a68' });
  }, { atTarget: true });

  // Pyromancer · Phoenix Dive: heat spirals up the mage, flame wings open on its back (they stay for the window), a
  // phoenix climbs off it and dives through the enemy: a fire burst, a ring of feathers, a burning crater left behind.
  ABILITY_VFX.pyromancer.phoenixdive = c => {
    if (c.cam) c.cam.dim(0.38, 1.4);
    V.charge(c.x, c.y, { color: EMBER, r: 60, n: 12, dur: 0.4, follow: c.ent });
    V.blaze(c.ent, { r: 56, dur: 0.9 });
    V.sigil(c.x, c.y, { r: 70, style: 'star5', color: FIRE, dur: 1, spin: 3 });
    V.emberWings(c.ent, { dur: 8 });
    V.aura(c.ent, { color: '#ff8a2a', style: 'flame', dur: 8, r: 30, rate: 0.35 });
    c.later(0.4, () => V.phoenix(c.x, c.y, c.tx, c.ty, { s: 1.3, dur: 0.55, onHit: (x, y) => {
      if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.08, 0.55); c.cam.flash('#ffb060', 0.28, 0.35); }
      shake(8);
      V.flash(x, y - 20, 160, '#ffc060', 0.3);
      V.spikeburst(x, y, { r: 96, n: 18, color: FIRE, core: ASH, dur: 0.45 });
      V.shock(x, y, { r: 200, color: '#ffa040', dur: 0.6, w: 9 });
      V.shock(x, y, { r: 130, color: ASH, dur: 0.45, w: 5, delay: 0.06 });
      V.flare(x, y, { n: 20, r: 30, size: 1.3, h: 1.3 });
      V.crater(x, y, { r: 70, color: '#ff4a1a', dur: 6, flames: 5, a: 0.55 });
      V.debris(x, y, { n: 10, hot: true, color: '#4a3226' });
      feathers(x, y, 12, ASH);
    } }));
  };
  // the window's moves: Phoenix Flame (a lance of gold fire shedding feathers), Phoenix Blast (a smaller phoenix)
  ABILITY_VFX.pyromancer.phoenixflame = c => {
    const h = ahead(c, 16);
    V.glint(h.x, h.y, { color: ASH, size: 24, z: 24 });
    V.missile(c.x, c.y, c.tx, c.ty, { style: 'fire', color: EMBER, speed: 1100, size: 1.3, arc: 10, onHit: (x, y) => {
      V.spikeburst(x, y, { r: 42, n: 12, color: '#ffa030', core: '#fff2c0', dur: 0.28 });
      V.shock(x, y, { r: 60, color: ASH, dur: 0.3, w: 3 });
      feathers(x, y, 3, ASH);
    } });
  };
  ABILITY_VFX.pyromancer.phoenixblast = c => V.phoenix(c.x, c.y, c.tx, c.ty, { s: 0.6, dur: 0.42, onHit: (x, y) => {
    V.spikeburst(x, y, { r: 64, n: 14, color: FIRE, core: ASH, dur: 0.36 });
    V.shock(x, y, { r: 110, color: '#ffa040', dur: 0.45, w: 6 });
    V.flare(x, y, { n: 12, r: 18, size: 1 });
    V.decal(x, y, { r: 40, embers: true, dur: 2.5 });
    shake(4);
  } });
  // the window ends: the mage bursts from the ashes (a pillar of flame, feathers), and the fire runs to the enemy
  KIT_VFX['phoenix-rebirth'] = Object.assign((e, target) => {
    const cam = FX.camFor(e);
    if (cam) { cam.punch(0.04, 0.4); cam.flash('#ffb060', 0.15, 0.3); }
    shake(4);
    V.pillar(e.x, e.y, { r: 46, h: 220, color: '#ff8a2a', dur: 0.9 });
    V.blaze(e, { r: 60, dur: 1 });
    V.burst(e.x, e.y - 30, { color: ASH, color2: FIRE, n: 22, speed: 280 });
    feathers(e.x, e.y, 10, ASH);
    if (target) V.missile(e.x, e.y, target.x, target.y, { style: 'fire', color: '#ff9a3a', speed: 900, size: 1.4, arc: 40, onHit: (x, y) => {
      V.spikeburst(x, y, { r: 60, n: 14, color: FIRE, core: ASH, dur: 0.34 });
      V.shock(x, y, { r: 100, color: EMBER, dur: 0.4, w: 6 });
    } });
  }, { atTarget: true });
})();

// ======================================================================= ULTIMATES · damage classes (Driftblade, Shadowblade, Ranger, Marionettist, Thermist)
// Same three beats as the block above: a 0.3-0.5s wind-up, one impact (the only hit-stop, through c.cam / FX.camFor),
// and a mark on the floor that lasts as long as the moment. Each keeps its class's colours: Driftblade jade wind,
// Shadowblade violet and rose steel, Ranger gold starlight, Marionettist velvet, rose and gold, Thermist orange and
// blue. The moments that land later (KIT_VFX) replay their delayed parts at the caster's intensity (dmgUltLater).
(() => {
  const V = VFX, TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a);
  const shake = s => { FX.shake = Math.max(FX.shake, s); };
  // a delayed part of a KIT_VFX moment, at the caster's intensity (your own: full; anyone else's: 0.6)
  const dmgUltLater = (e, d, fn) => { const s = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(s); try { fn(); } finally { V.setScale(1); } }); };
  const dmgUltLine = (ax, ay, bx, by, n = 10, bow = 0) => Array.from({ length: n + 1 }, (_, i) => { const q = i / n, nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1, b = Math.sin(q * Math.PI) * bow; return [ax + (bx - ax) * q + nx / L * b, ay + (by - ay) * q + ny / L * b]; });

  // ---- Driftblade · Eye of the Gale: a cyclone gathers on the duellist, it blows clean through the target (a long
  // jade line and a twister there), and for the 8s a ring of gusts wheels round the duellist: the eye. Gale lines
  // during the window are long double ribbons through the body; it ends in a tempest on the target sized by Drift.
  const driftUltCol = ent => (ent && ent.spec === 'comet' ? '#ffd08a' : ent && ent.spec === 'orbit' ? '#a8f0c8' : '#8ff0d8');
  const driftUltRibbon = (pts, o = {}) => V.fx({ dur: o.dur ?? 0.7, layer: 'air', draw: (c, p, t, e) => {
    const k = (1 - p) * e.a;
    V.neonPath(c, o.color || '#8ff0d8', (o.w ?? 3) * (1 - p * 0.5), k, () => { pts.forEach(([x, y], i) => { const wob = Math.sin(i * 0.9 + t * 14) * (o.wob ?? 3); i ? c.lineTo(x, y - (o.z ?? 14) + wob) : c.moveTo(x, y - (o.z ?? 14) + wob); }); });
  } });
  // a gale line: from 140 px before the body to 160 px past it along a, with a pale streak left on the floor
  const driftUltGaleLine = (x, y, a, col, o = {}) => {
    const L0 = o.back ?? 140, L1 = o.on ?? 160, ax = x - Math.cos(a) * L0, ay = y - Math.sin(a) * L0, bx = x + Math.cos(a) * L1, by = y + Math.sin(a) * L1;
    driftUltRibbon(dmgUltLine(ax, ay, bx, by, 12, 8), { color: col, w: o.w ?? 4, dur: 0.5, wob: 2 });
    driftUltRibbon(dmgUltLine(ax, ay, bx, by, 12, -8), { color: '#ffffff', w: (o.w ?? 4) * 0.45, dur: 0.42, wob: 2 });
    V.fx({ dur: o.stay ?? 1.4, layer: 'ground', draw: (c, p, t, e) => { const k = Math.min(1, p / 0.05, (1 - p) / 0.5) * e.a; c.save(); c.translate(ax, ay); c.rotate(a); c.globalAlpha = 0.14 * k; c.fillStyle = col; c.fillRect(0, -7, L0 + L1, 14); c.globalAlpha = 1; V.neonPath(c, col, 1.2, k * 0.7, () => { c.moveTo(0, 0); c.lineTo(L0 + L1, 0); }); c.restore(); } });
    V.hit(x, y, '#e8fff8', o.hit ?? 0.8);
    V.sparks(x, y, { color: col, n: 6, angle: a, spread: 0.5, speed: 380 });
  };
  // (scale-up pass) DRIFT_ULT_SCALE sizes Eye of the Gale's twister, scar and the closing tempest; DRIFT_ULT_HIT is the impact
  const DRIFT_ULT_SCALE = 1.8, DRIFT_ULT_HIT = 0.45;
  Object.assign(ABILITY_VFX.driftblade, {
    // (painted pass, driftblade.png) WINDUP: a jade cyclone of wind ribbons winds up round the duellist and the blade,
    // leaves caught in it, and a gust runs out to the target. IMPACT (0.3s): a twister stands on the target with rocks
    // and leaves whirling in it, long slashing streaks cut through it from every side. AFTERMATH: a spiral wind scar on
    // the floor (faint), turning slowly as it fades. The eye stays as a quiet ring of gusts for the window.
    eyeofthegale: c => {
      const DP = DRIFT_PAINT, col = driftUltCol(c.ent), sx = c.x, sy = c.y, a = Math.atan2(c.ty - sy, c.tx - sx), tx = c.tx, ty = c.ty, SC = DRIFT_ULT_SCALE, HIT = DRIFT_ULT_HIT;
      if (c.cam) c.cam.dim(0.3, 1.3);
      // WINDUP: a tall cyclone winds up round the duellist; on the target the wind starts to turn in on itself
      V.charge(sx, sy, { color: col, r: 90, n: 10, dur: 0.35, follow: c.ent });
      DP.cyclone(c.ent, { r: 50 * 1.35, h: 130, dur: HIT + 0.2, color: col, leaves: 8 });
      V.swirl(tx, ty, { r: 75 * SC, color: col, dur: HIT, arms: 3, inward: true });
      c.later(HIT - 0.16, () => DP.windStrip(dmgUltLine(sx, sy, tx + Math.cos(a) * 60, ty + Math.sin(a) * 60, 14, 16), { w: 10, color: col, dur: 0.4, z: 18 }));
      // IMPACT: a great twister on the target, a bright eye at its foot, slashing streaks through it, rocks and leaves flung
      c.later(HIT, () => {
        if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.07, 0.5); c.cam.flash('#e8fff8', 0.16, 0.28); }
        shake(6);
        DP.twister(tx, ty, { r: 78 * SC, h: 190 * (1 + (SC - 1) * 0.6), dur: 1.25, color: col, rocks: 12, leaves: 10 });
        for (let i = 0; i < 4; i++) c.later(0.04 + i * 0.07, () => DP.streaks(tx, ty, a + i * 0.8 + rand(-0.2, 0.2), { n: 2, back: 120 * SC * 0.85, on: 120 * SC * 0.85, w: 9, gap: 16, color: i % 2 ? '#e8fff8' : col, dur: 0.4, scuff: false, leaves: 1 }));
        V.flash(tx, ty - 24, 44 * SC, '#ffffff', 0.18);
        V.spikeburst(tx, ty, { r: 70 * SC * 0.85, n: 16, color: col, core: '#ffffff', ink: '#0a2a24', dur: 0.38 });
        V.shock(tx, ty, { r: 180 * SC * 0.85, color: col, dur: 0.6, w: 9 });
        V.shock(tx, ty, { r: 120 * SC * 0.85, color: '#ffffff', dur: 0.45, w: 4, delay: 0.06 });
        V.debris(tx, ty, { n: 10, color: '#4a524c', speed: 1.1 * SC * 0.8, size: 1.3 });
        V.smoke(tx, ty, { n: 6, r: 50 * SC, color: '#c8d8d0', size: 34, a: 0.3, speed: 80, life: 1.4 });
      });
      // AFTERMATH: a spiral wind scar on the floor (ink and jade lines, no fill), turning slowly as it fades
      c.later(HIT + 0.6, () => DP.spiralScar(tx, ty, { r: 90 * SC, dur: 3, color: col, a: 0.56, arms: 4 }));
      // the eye: a few gusts wheeling round the duellist for the window, kept quiet (the floor stays readable)
      V.aura(c.ent, { color: col, dur: 8, r: 30, rate: 0.15 });
      V.fx({ dur: 8, layer: 'ground', follow: c.ent, draw: (cc, p, t, e) => {
        const x = e.follow.x, y = e.follow.y, k = Math.min(1, p / 0.04, (1 - p) / 0.08) * e.a, R = 70;
        for (let i = 0; i < 4; i++) { const a0 = t * 3.2 + i * TAU / 4; V.neonPath(cc, i % 2 ? '#e8fff8' : col, 1.5, k * 0.45, () => cc.ellipse(x, y, R, R * 0.62, 0, a0, a0 + 0.5)); }
      } });
    },
    // Gale Line: a wind blade that cuts a long straight line through the target and well past it
    galeline: c => { const col = driftUltCol(c.ent), a = Math.atan2(c.ty - c.y, c.tx - c.x);
      V.sigil(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 20, { r: 22, style: 'star4', color: col, dur: 0.25, spin: 8 });
      c.later(0.06, () => { driftUltGaleLine(c.tx, c.ty, a, col, { back: Math.min(260, Math.hypot(c.tx - c.x, c.ty - c.y)), on: 220, w: 5, hit: 1 }); V.slash(c.tx, c.ty + 10, a, { r: 66, span: 2.4, color: col, w: 0.5, dur: 0.28 }); shake(3); }); },
    // Eye Step: a glint, a straight blink-ribbon through the body, a puff of wind where it lands
    eyestep: c => { const col = driftUltCol(c.ent), sx = c.x, sy = c.y;
      V.glint(sx, sy, { color: '#ffffff', size: 26, z: 20 }); V.shock(sx, sy, { r: 40, color: col, dur: 0.25, w: 3 });
      c.later(0.08, () => { const ex = c.ent.x, ey = c.ent.y; driftUltRibbon(dmgUltLine(sx, sy, ex, ey, 10, 0), { color: '#ffffff', w: 4, dur: 0.4, wob: 1 }); driftUltRibbon(dmgUltLine(sx, sy, ex, ey, 10, 10), { color: col, w: 3, dur: 0.5 }); V.smoke(ex, ey, { n: 3, color: '#d8e8e0', size: 16, a: 0.45, speed: 50 }); }); },
  });
  Object.assign(KIT_VFX, {
    // a Passing Strike inside the eye: a long gale line along the way you were running (Gale Run makes it white-hot)
    'drift-gale': Object.assign((e, target, d) => { const t = target || e, col = d && d.g ? '#ffffff' : driftUltCol(e); driftUltGaleLine(t.x, t.y, e.angle || 0, col, { w: d && d.g ? 6 : 4 });
      DRIFT_PAINT.streaks(t.x, t.y, e.angle || 0, { n: 3, back: 145, on: 180, w: 7, gap: 14, color: col, dur: 0.42, scuff: false, leaves: 2 }); if (d && d.g) shake(2); }, { atTarget: true }),
    // the tempest that ends the window: a great twister on the target, gusts flung out, sized by the Drift you kept
    'drift-tempest': Object.assign((e, target, d) => {
      const t = target || e, col = driftUltCol(e), q0 = 0.6 + 0.4 * Math.min(1, ((d && d.d) || 0) / 100), q = q0 * DRIFT_ULT_SCALE * 0.9, cam = FX.camFor(e);
      // (painted pass) a great twister on the target with rocks and leaves in it, gusts flung out in ribbons, a spiral scar after
      if (cam) { cam.punch(0.05, 0.45); cam.flash('#e8fff8', 0.14, 0.28); }
      shake(5);
      DRIFT_PAINT.twister(t.x, t.y, { r: 80 * q, h: 210 * q0 * 1.35, dur: 1.3, color: col, rocks: 12, leaves: 10 });
      V.flash(t.x, t.y - 24, 40 * q, '#ffffff', 0.16);
      V.shock(t.x, t.y, { r: 210 * q * 0.66, color: col, dur: 0.6, w: 9 });
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + rand(-0.2, 0.2); DRIFT_PAINT.windStrip(dmgUltLine(t.x + Math.cos(a) * 30, t.y + Math.sin(a) * 18, t.x + Math.cos(a) * 160 * q, t.y + Math.sin(a) * 100 * q, 8, 18), { color: i % 2 ? '#ffffff' : col, w: 7, dur: 0.6, z: 16 }); }
      V.debris(t.x, t.y, { n: 8, color: '#4a524c', speed: 1.3, size: 1.2 });
      dmgUltLater(e, 0.4, () => { V.smoke(t.x, t.y, { n: 6, r: 60 * q, color: '#c8d0c0', size: 32, a: 0.3, speed: 50, life: 1.8 }); DRIFT_PAINT.spiralScar(t.x, t.y, { r: 85 * q, dur: 3, color: col, a: 0.54, arms: 4 }); });
    }, { atTarget: true }),
  });

  // ---- Shadowblade · Thousand Cuts: a smoke bomb bursts at the rogue's feet, a violet smear streaks to the target's
  // back, and a rune of shadow opens under it for the window. Each Shadow Cut blinks round the target in a slash
  // trail; the finisher leaves an echo; at the end every cut comes due at once in a storm of rose and steel.
  const BL = { VIO: '#b04dff', ROSE: '#ff4d8a', STEEL: '#e8e0ff', INK: '#1e0e3a' };
  Object.assign(ABILITY_VFX.shadowblade, {
    thousandcuts: c => {
      const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty;
      if (c.cam) c.cam.dim(0.4, 1.3);
      V.smokebomb(sx, sy, { r: 130, dur: 2.6, toss: 0.2, color: '#6a5a7a', ring: BL.VIO });
      V.charge(sx, sy, { color: BL.VIO, r: 56, n: 10, dur: 0.3 });
      c.later(0.35, () => {
        V.shadowdash(sx, sy, c.ent.x, c.ent.y, { color: '#8a4dff', dur: 0.4 });
        if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.07, 0.5); c.cam.flash('#d8b8ff', 0.22, 0.3); }
        shake(6);
        for (let i = 0; i < 3; i++) c.later(i * 0.05, () => V.slash(tx, ty + 6, rand(0, TAU), { r: 70, span: 2.2, color: i % 2 ? BL.STEEL : BL.ROSE, w: 0.5, dur: 0.26, flip: i % 2 === 1, sparks: 4 }));
        V.spikeburst(tx, ty, { r: 70, n: 14, color: BL.VIO, core: '#f0e8ff', ink: BL.INK, dur: 0.36, z: 18 });
        V.shock(tx, ty, { r: 170, color: BL.VIO, dur: 0.55, w: 7 });
        V.ink(tx, ty, { r: 100, dur: 7, a: 0.3 });
        V.sigil(tx, ty, { r: 100, style: 'runes', color: BL.VIO, dur: 7, spin: -0.7 });
        V.aura(c.ent, { color: '#8a00c0', style: 'shadow', dur: 7, r: 28, rate: 0.3 });
      });
    },
    // Shadow Cut: a violet smear to the target's back and a cut that curls round it
    shadowcut: c => { const sx = c.x, sy = c.y, tx = c.tx, ty = c.ty;
      c.later(0.05, () => { const ex = c.ent.x, ey = c.ent.y; if (Math.hypot(ex - sx, ey - sy) > 20) V.shadowdash(sx, sy, ex, ey, { color: '#8a4dff', dur: 0.32 });
        const a = Math.atan2(ty - ey, tx - ex);
        V.slash(tx, ty + 6, a + Math.PI / 2, { r: 58, span: 3, color: BL.STEEL, w: 0.45, dur: 0.26, sparks: 4 });
        c.later(0.06, () => V.hit(tx, ty, BL.ROSE, 0.7)); }); },
    // the finisher inside the window: two crossing rose cuts and a pale echo of them a moment later
    shadowedge: c => { const tx = c.tx, ty = c.ty, a = c.ang || 0;
      V.slash(c.x, c.y, a + 0.4, { r: 62, span: 1.6, color: BL.ROSE, w: 0.6, dur: 0.24, sparks: 4 });
      c.later(0.06, () => V.slash(c.x, c.y, a - 0.4, { r: 62, span: 1.6, color: BL.ROSE, w: 0.6, dur: 0.24, flip: true }));
      c.later(0.1, () => { V.spikeburst(tx, ty, { r: 48, n: 12, color: BL.ROSE, core: '#ffe0ec', ink: '#2a0410', dur: 0.3 }); shake(3); });
      c.later(0.28, () => { V.slash(tx, ty + 6, a + Math.PI / 2, { r: 54, span: 2, color: '#d8c8ff', w: 0.35, dur: 0.3 }); V.smoke(tx, ty, { n: 2, color: '#4a3060', size: 18, a: 0.4, speed: 30 }); }); },
  });
  // Thousand Cuts comes due: a flurry of cuts from every side (one per cut you made), then one great X and a burst
  KIT_VFX['blade-thousand'] = Object.assign((e, target, d) => {
    const t = target || e, n = Math.max(4, Math.min(12, (d && d.n) || 6)), cam = FX.camFor(e);
    V.vortex(t.x, t.y, { r: 80, color: '#c01a5a', steel: BL.STEEL, dur: 0.9, n: 6 });
    for (let i = 0; i < n; i++) dmgUltLater(e, i * 0.035, () => { const a = rand(0, TAU); V.slash(t.x - Math.cos(a) * 26, t.y - Math.sin(a) * 26, a, { r: 64, span: 1.3, color: i % 3 ? BL.STEEL : BL.ROSE, w: 0.45, dur: 0.2, flip: i % 2 === 1, sparks: 2 }); });
    dmgUltLater(e, n * 0.035 + 0.08, () => {
      if (cam) { cam.punch(0.06, 0.45); cam.flash('#ffd0e8', 0.18, 0.3); }
      shake(6);
      for (const s of [-1, 1]) V.slash(t.x, t.y + 6, Math.PI / 4 * s, { r: 96, span: 1.2, color: BL.ROSE, w: 0.7, dur: 0.32, flip: s > 0, sparks: 6 });
      V.spikeburst(t.x, t.y, { r: 92, n: 18, color: BL.ROSE, core: '#ffe0ec', ink: '#2a0410', dur: 0.42, z: 16 });
      V.shock(t.x, t.y, { r: 190, color: BL.VIO, dur: 0.55, w: 8 });
      V.splash(t.x, t.y, { n: 12, speed: 1.3 });
      V.decal(t.x, t.y, { style: 'crack', r: 60, dur: 3, a: 0.5, seed: Math.random() * 6 });
    });
  }, { atTarget: true });

  // ---- Ranger · Starfall Volley: the ranger draws and looses straight up (a shaft of light), a first star drops onto
  // the target, then a ring of gold opens on the floor there, as wide as the Focus spent, and six volleys of
  // starlit arrows fall into it over 3s. Loosed under Hunter's Cloak, green motes rise off the party with each one.
  const RG = { GOLD: '#ffe27a', STAR: '#fff6d0', DEEP: '#ffb84a' };
  ABILITY_VFX.ranger.starfall = c => {
    if (c.cam) c.cam.dim(0.36, 3.6);
    V.glint(c.x, c.y, { color: RG.STAR, size: 34, z: 50 });
    V.charge(c.x, c.y, { color: RG.GOLD, r: 56, n: 10, dur: 0.3, follow: c.ent });
    c.later(0.12, () => V.pillar(c.x, c.y, { r: 14, h: 300, color: RG.STAR, dur: 0.45 }));
    c.later(0.4, () => {
      if (c.cam) { c.cam.stop(0.09); c.cam.punch(0.06, 0.5); c.cam.flash('#fff6d0', 0.2, 0.3); }
      shake(6);
      V.lightfall(c.tx, c.ty, { color: RG.STAR, r: 40, h: 380, dur: 0.5, feathers: 0 });
      V.spikeburst(c.tx, c.ty, { r: 80, n: 16, color: RG.GOLD, core: '#ffffff', ink: '#3a2404', dur: 0.4, z: 8 });
      V.shock(c.tx, c.ty, { r: 180, color: RG.GOLD, dur: 0.55, w: 7 });
      V.burst(c.tx, c.ty - 20, { color: RG.STAR, color2: RG.GOLD, n: 20, speed: 280, kind: 'star', flashR: 100 });
    });
  };
  KIT_VFX['ranger-stars'] = Object.assign((e, target, d) => {
    const t = target || e, x = t.x, y = t.y, f = Math.max(0, Math.min(100, (d && d.f) || 0)), r = 70 + 0.6 * f, heal = d && d.c;
    V.ink(x, y, { r, dur: 3.6, a: 0.3 });
    V.sigil(x, y, { r, style: 'star5', color: RG.GOLD, dur: 3.6, spin: 0.4 });
    V.fx({ dur: 3.6, layer: 'ground', draw: (cc, p, tt, fx) => { const k = Math.min(1, p / 0.05, (1 - p) / 0.15) * fx.a; for (let i = 0; i < 9; i++) { const a = i * 2.4 + tt * 0.3, q = ((i * 0.37) % 1) * 0.85; V.glowAt(cc, x + Math.cos(a) * r * q, y + Math.sin(a) * r * q * 0.62, 8, RG.STAR, k * (0.4 + 0.4 * Math.sin(tt * 5 + i))); } } });
    for (let i = 1; i <= 6; i++) dmgUltLater(e, 0.4 + 0.5 * i - 0.2, () => {
      V.volley(x, y, { n: 8 + Math.round(f / 12), r: r * 0.85, color: RG.GOLD, wind: 0.02, gap: 0.02, stay: 1.1, ring: false });
      V.missile(x + rand(-70, 70), y - 320, x + rand(-r * 0.4, r * 0.4), y + rand(-r * 0.2, r * 0.2), { style: 'comet', color: RG.STAR, speed: 1500, size: 0.9, onHit: (hx, hy) => V.hit(hx, hy, RG.STAR, 0.6) });
      FX.later(0.2, () => V.shock(x, y, { r: r * 1.1, color: RG.DEEP, dur: 0.35, w: 3 }));
      if (heal) V.motes(e.x, e.y, { color: '#9fdc8a', n: 4, r: 60, kind: 'star' });
    });
  }, { atTarget: true });

  // ---- Marionettist · Curtain Call: velvet drapes part over the target, the footlights come up, every Doll leaps to
  // its mark and the whole troupe strikes at once while the Strings flash as blades; the drapes fall closed again
  // and a gold spotlight stays on the floor. The bow (the next Swap) snaps the Strings across the target.
  const MU = { ROSE: '#ffd8ec', GOLD: '#ffd27a', VEL: '#a01838', VEL2: '#d03050', CRIM: '#e0203c', ROSE2: '#ff5a7a' };
  const mariUltId = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  const mariUltDolls = ent => (typeof Stagecraft !== 'undefined' ? Stagecraft.dollsOf(mariUltId(ent), typeof Net !== 'undefined' ? Net.id : 0) : []);
  const mariUltAct = (ent, kind) => { if (typeof Stagecraft !== 'undefined') Stagecraft.act(mariUltId(ent), kind, FX.now || 0); };
  // (painted pass, marionettist.png) WINDUP: a stage opens on the target, a gold ring with a compass on its floor, the
  // footlights round its front, red velvet drapes swinging open behind it, and four phantom dolls let down on gold
  // strings round the ring. IMPACT (0.45s): the dolls lunge across in an X of cuts with the real Dolls, two crimson Xs
  // flash, rose petals explode. AFTERMATH: a rose sigil under a lingering spotlight, petals drifting down (all faint).
  // (scale-up pass) MARI_ULT_SCALE sizes the whole Curtain Call (stage, troupe, cuts, sigil); MARI_ULT_HIT is the impact
  const MARI_ULT_SCALE = 1.65, MARI_ULT_HIT = 0.5;
  ABILITY_VFX.marionettist.curtaincall = c => {
    const tx = c.tx, ty = c.ty, MP = MARI_PAINT, SC = MARI_ULT_SCALE, R = 108 * SC, HIT = MARI_ULT_HIT;
    if (c.cam) c.cam.dim(0.45, 1.6);
    mariUltAct(c.ent, 'finale');
    // WINDUP: the stage (ring, compass, footlights) and the drapes, which fall away just after the strike
    MP.stage(tx, ty, { r: R, dur: HIT + 0.75, airDur: HIT + 0.38 });
    MP.troupe(tx, ty, { r: R * 0.8, n: 4, hit: HIT, ds: 1.15 * SC * 1.05 });
    MP.spotlight(tx, ty, { r: 56 * SC, h: 340, dur: HIT + 0.2, a: 0.3 });
    MP.petals(tx, ty, { mode: 'fall', n: 8, r: R * 0.9, life: 1.2 });
    c.later(0.1, () => { for (const d of mariUltDolls(c.ent)) { V.smoke(d.x, d.y, { n: 2, color: '#f0d8e8', size: 18, a: 0.35, speed: 40 }); V.glint(d.x, d.y, { color: '#ffffff', size: 24, z: 30 }); } });
    // IMPACT: the troupe lunges through, two great crimson Xs, a brief white-hot heart, petals everywhere
    c.later(HIT, () => {
      if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.07, 0.5); c.cam.flash('#ffd8c8', 0.18, 0.28); }
      shake(7);
      for (const d of mariUltDolls(c.ent)) { const a = Math.atan2(ty - d.y, tx - d.x); V.slash(d.x, d.y, a, { r: 74 * 1.3, span: 1.8, color: MU.CRIM, w: 0.6, dur: 0.3, sparks: 5 }); }
      MP.xcut(tx, ty, { r: R * 1.05, a: 0.62, w: 10 * SC, dur: 0.44, z: 14 });
      c.later(0.06, () => MP.xcut(tx, ty, { r: R * 0.85, a: 0.62 + Math.PI / 4, w: 7 * SC, dur: 0.38, z: 14, color: MU.ROSE2 }));
      V.flash(tx, ty - 20, 46 * SC, '#fff0e6', 0.18);
      V.spikeburst(tx, ty, { r: 72 * SC, n: 18, color: MU.CRIM, core: '#fff0e6', ink: '#2a0410', dur: 0.4, z: 12 });
      V.shock(tx, ty, { r: 175 * SC, color: MU.ROSE2, dur: 0.55, w: 7 });
      V.shock(tx, ty, { r: 130 * SC, color: MU.GOLD, dur: 0.5, w: 4, delay: 0.06 });
      V.burst(tx, ty, { color: MU.GOLD, color2: '#ffffff', n: 12, speed: 320, kind: 'star', flash: false });
      MP.petals(tx, ty, { n: 24, speed: 300 * SC, life: 1.8, size: 1.3 });
      MP.petals(tx, ty, { n: 14, speed: 170 * SC, life: 2, size: 1.1 });
    });
    // AFTERMATH: a rose sigil with gold stanchions round it under a warm spotlight, petals drifting down (rims, not fills)
    c.later(HIT + 0.35, () => { MP.roseSigil(tx, ty, { r: 92 * SC, dur: 3, a: 0.65, posts: 6 }); MP.spotlight(tx, ty, { r: 64 * SC, h: 340, dur: 2.8, a: 0.19 }); MP.petals(tx, ty, { mode: 'fall', n: 16, r: 90 * SC, life: 2.4 }); });
  };
  Object.assign(KIT_VFX, {
    // the Strings go rigid and bright crimson as the troupe strikes: one blade per taut String to every Doll
    'mari-curtain': (e, target, d) => {
      const s = Math.max(0, Math.min(3, (d && d.s) || 0));
      dmgUltLater(e, MARI_ULT_HIT, () => {
        const ds = mariUltDolls(e), ox = e.x, oy = e.y;
        V.fx({ dur: 0.5, layer: 'air', draw: (cc, p, t, fx) => { const k = (1 - p) * fx.a; for (const dl of ds) for (let i = 0; i < s; i++) { const off = (i - (s - 1) / 2) * 5; V.neonPath(cc, i === 1 ? MU.GOLD : MU.CRIM, 3 * (1 - p) + 1, k, () => { cc.moveTo(ox, oy - 12 + off); cc.lineTo(dl.x, dl.y - 12 + off); }); } } });
        for (const dl of ds) V.sparks((ox + dl.x) / 2, (oy + dl.y) / 2, { color: MU.ROSE2, n: 4 + 2 * s, angle: Math.atan2(dl.y - oy, dl.x - ox) + Math.PI / 2, spread: 0.7, speed: 260 });
      });
    },
    // the bow: a Swap after the curtain snaps every String across the target in crimson, a crimson X and a shower of petals
    'mari-bow': Object.assign((e, target) => {
      const t = target || e;
      V.fx({ dur: 0.45, layer: 'air', draw: (cc, p, tt, fx) => { const k = (1 - p) * fx.a; V.neonPath(cc, MU.CRIM, 4 * (1 - p) + 1, k, () => { cc.moveTo(e.x, e.y - 12); cc.lineTo(t.x, t.y - 12); }); } });
      V.hit(t.x, t.y, MU.ROSE2, 1.2);
      MARI_PAINT.xcut(t.x, t.y, { r: 76, w: 9, dur: 0.36, scar: 1 });
      MARI_PAINT.petals(t.x, t.y, { n: 16, speed: 260, life: 1.6, size: 1.15 });
      shake(3);
    }, { atTarget: true }),
  });

  // ---- Thermist · Supernova: both coloured arcs of the dial wheel round the mage at once, a frost seal opens on the
  // target and shatters into a crown of ice, then fire bursts up through the shards; a scorched, steaming crater
  // stays. The size of every shape follows the stored swing (d.s, 0-5).
  const TH = { FIRE: { color: '#ff7a2a', core: '#fff0b0', ink: '#3a1004' }, ICE: { color: '#5fb4f0', core: '#f0faff', ink: '#08203a' } };
  // (painted pass, thermist.png) WINDUP: the orange and blue arcs whirl round the mage over a small dial; on the target a
  // frost clock-seal opens with its own arcs racing round it and a crown of ice crystals rises from its rim. IMPACT
  // (0.7s): the crown shatters in a fire-and-ice explosion: a fire starburst, a ring of ice spikes, shards, burning rocks,
  // smoke. AFTERMATH: a scorched crater with frost at its edge (faint) and steam rising off it.
  // (scale-up pass) THERM_ULT_SCALE sizes Supernova's seal, crown, explosion and crater; THERM_ULT_HIT is the impact
  const THERM_ULT_SCALE = 1.7, THERM_ULT_HIT = 0.7;
  ABILITY_VFX.thermist.supernova = c => {
    if (c.cam) c.cam.dim(0.42, 1.6);
    V.charge(c.x, c.y, { color: '#e8d8ff', r: 80, n: 12, dur: 0.4, follow: c.ent });
    THERM_PAINT.dialSeal(c.x, c.y, { r: 60, dur: THERM_ULT_HIT + 0.05, follow: c.ent, spin: 11 });
    THERM_PAINT.handArcs(c.ent, { r: 40, dur: THERM_ULT_HIT, color: '#ff8a3a', color2: '#6fb2f0' });
    V.aura(c.ent, { color: '#e8d8ff', dur: 6, r: 28, rate: 0.15 });
    c.later(THERM_ULT_HIT, () => { if (c.cam) { c.cam.stop(0.1); c.cam.punch(0.08, 0.55); c.cam.flash('#ffc890', 0.2, 0.32); } shake(8); });
  };
  KIT_VFX['therm-nova'] = Object.assign((e, target, d) => {
    const t = target || e, x = t.x, y = t.y, s = Math.max(0, Math.min(5, (d && d.s) || 0)), SC = THERM_ULT_SCALE, HIT = THERM_ULT_HIT, TP = THERM_PAINT;
    const q = (0.75 + 0.05 * s) * SC, qr = (0.75 + 0.05 * s) * (1 + (SC - 1) * 0.6);   // shapes grow by the full scale, the outer rings by less
    // WINDUP: a big frost clock-seal, a spiky crown of ice round its rim and a ring of tall spears rising inside it
    TP.dialSeal(x, y, { r: 96 * q, dur: HIT + 0.05 });
    TP.crystalCrown(x, y, { r: 82 * q, n: 12 + 2 * s, h: 66 * q, dur: HIT + 0.02, ws: 1.5 });
    TP.crystalCrown(x, y, { r: 44 * q, n: 7, h: 100 * q, dur: HIT - 0.26, delay: 0.28, ws: 1.8, lean: 0.25 });
    TP.swirl2(x, y, { r: 120 * q, dur: 0.3, z: 20 });
    dmgUltLater(e, 0.35, () => V.shock(x, y, { r: 120 * q, color: '#bfe6ff', dur: 0.35, w: 5 }));
    dmgUltLater(e, HIT - 0.3, () => TP.swirl2(x, y, { r: 110 * q, dur: 0.3, z: 24 }));
    // IMPACT: a fire-and-ice explosion: a white-hot heart, a fire starburst and a column of flame through a ring of ice
    // spikes, shards and burning rocks flung out, smoke rolling
    dmgUltLater(e, HIT, () => {
      V.flash(x, y - 30, 70 * q, '#ffffff', 0.16);
      V.flash(x, y - 20, 110 * q, '#ffc060', 0.24);
      V.spikeburst(x, y, { r: 115 * q, n: 22, ...TH.FIRE, dur: 0.48 });
      V.spikeburst(x, y, { r: 140 * q, n: 20, hole: 0.68, ...TH.ICE, dur: 0.48, layer: 'ground', z: 0, flat: 0.7 });
      V.spikeburst(x, y, { r: 70 * q, n: 12, ...TH.ICE, dur: 0.32, z: 30 });
      V.pillar(x, y, { r: 34 * q, h: 300, color: '#ffb060', dur: 0.45 });
      V.flare(x, y, { n: 16 + 2 * s, r: 40 * q, color: '#ff6a1a', size: 1.5, h: 1.6 });
      TP.shards(x, y, { n: 18, speed: 360 * SC * 0.8, size: 1.5, z: 24 });
      TP.shards(x, y, { n: 10, speed: 200 * SC * 0.8, size: 1.1, z: 40, color: '#cfeeff' });
      V.shock(x, y, { r: 210 * qr, color: '#ff9a5a', dur: 0.6, w: 10 });
      V.shock(x, y, { r: 175 * qr, color: '#7ac0f0', dur: 0.6, w: 7, delay: 0.07 });
      V.burst(x, y, { color: '#fff0b0', color2: '#8fd0ff', n: 16, speed: 320 * SC * 0.8, flash: false });
      V.debris(x, y, { n: 12, hot: true, color: '#3a2a22', speed: 1.2 * SC * 0.8, size: 1.4 });
      V.smoke(x, y, { n: 8, r: 50 * q, color: '#b8b4b0', size: 34 * SC * 0.8, a: 0.42, speed: 90 * SC * 0.8, life: 1.4 });
    });
    // AFTERMATH: a scorched crater ringed with frost spikes, the heat cooling in its cracks, steam rising (kept to rims)
    dmgUltLater(e, HIT + 0.15, () => { V.crater(x, y, { r: 70 * q, color: '#ff5a1a', dur: 4.5, flames: 6, a: 0.48, cracks: 10 }); TP.frostRim(x, y, { r: 78 * q, dur: 4.5, a: 0.6, n: 26 }); });
    dmgUltLater(e, HIT + 0.4, () => TP.steam(x, y, { n: 7, r: 60 * q, size: 36, life: 2.4, a: 0.32 }));
    dmgUltLater(e, HIT + 1.3, () => TP.steam(x, y, { n: 5, r: 70 * q, size: 30, life: 2.2, a: 0.24 }));
  }, { atTarget: true });
})();

// ======================================================================= ULTIMATES · TANKS (Bloodreaver, Runeguard, Ironpalm, Gorgemaw, Oathbroker)
// Same conventions as the block above: a 0.3-0.5s wind-up, one impact (c.cam: stop + punch + flash, your own hero only),
// a mark on the floor for as long as the moment lasts. The kit's later beats are KIT_VFX moments (k.fx in kits.js).
// Each keeps its class's own palette and shapes: blood and a red moon, violet rune stones, saffron palm prints, the
// Maw's morsel colours, ink, wax and gold seals.
(() => {
  const V = VFX, shake = s => { FX.shake = Math.max(FX.shake, s); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };

  // ---- Bloodreaver · Crimson Eclipse: blood spirals in, a red moon closes over the sun above the reaver (it hangs
  // there the eclipse's 10s), the roar throws a ring of red spikes over the party; the bank erupts later on the enemy.
  const BLOOD = '#ff2a3a', GORE = '#a01028', CLOT = '#3a0610';
  const reaverMoon = (ent, dur) => V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
    const k = Math.min(1, t / 0.4) * Math.min(1, (1 - p) / 0.06) * e.a * (t < 1.2 ? 1 : 0.55), x = ent.x, y = ent.y - 112 - (ent.lift || 0), pulse = 1 + 0.06 * Math.sin(t * 3);
    V.glowAt(c, x, y, 54 * pulse, BLOOD, 0.55 * k);
    V.neonRing(c, x, y, 22 * pulse, '#ff6a6a', 2.5, k, 1);
    c.save(); c.globalAlpha = 0.92 * k; c.fillStyle = '#12020a'; c.beginPath(); c.arc(x + 3 * Math.min(1, t), y, 20, 0, Math.PI * 2); c.fill(); c.restore();
  }, tick: p => { if (Math.random() < 0.25 * (1 - p)) V.spawn({ x: ent.x + rand(-14, 14), y: ent.y, z: 100, vz: rand(-90, -50), life: 0.8, size: rand(4, 7), color: BLOOD, kind: 'drop', add: false }); } });
  ABILITY_VFX.bloodreaver.crimsoneclipse = c => {
    const e = c.ent;
    if (c.cam) c.cam.dim(0.42, 1.4);
    V.charge(c.x, c.y, { color: BLOOD, r: 80, n: 14, dur: 0.38, follow: e });
    V.swirl(c.x, c.y, { r: 70, color: BLOOD, dur: 0.45, inward: true, follow: e });
    reaverMoon(e, 10);
    c.later(0.4, () => {
      camHit(c.cam, '#ff5a5a', 1);
      shake(7);
      V.ink(e.x, e.y, { r: 120, dur: 10, follow: e, a: 0.3 });
      V.sigil(e.x, e.y, { r: 120, style: 'runes', color: BLOOD, dur: 10, spin: -0.5, follow: e });
      V.spikeburst(e.x, e.y, { r: 150, n: 24, hole: 0.62, color: '#ff3a2a', core: '#ffb0a0', ink: CLOT, fill: GORE, dur: 0.6, layer: 'ground', z: 0, flat: 0.6 });
      for (let i = 0; i < 3; i++) V.shock(e.x, e.y, { r: 170 + i * 50, color: i ? '#ff8a7a' : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      V.splash(e.x, e.y, { n: 14, speed: 1.4 });
      V.aura(e, { color: '#8a0010', style: 'shadow', dur: 10, r: 32, rate: 0.25 });
      V.burst(e.x, e.y - 30, { color: BLOOD, color2: '#ffd0d0', n: 20, speed: 280, flashR: 110 });
    });
  };
  // the eclipse ends: the bank comes up out of the floor under the enemy as a geyser of blood, and flows back
  KIT_VFX['reaver-eclipse'] = Object.assign((e, target) => {
    const t = target || e, cam = FX.camFor(e);
    camHit(cam, '#ff5a5a', 0.8);
    shake(6);
    V.ink(t.x, t.y, { r: 90, dur: 4, a: 0.35 });
    V.pillar(t.x, t.y, { r: 44, h: 260, color: BLOOD, dur: 0.8 });
    V.spikeburst(t.x, t.y, { r: 100, n: 18, color: '#d0203a', core: '#ffd0d0', ink: CLOT, dur: 0.45 });
    V.shock(t.x, t.y, { r: 170, color: '#ff5a6a', dur: 0.55, w: 8 });
    V.splash(t.x, t.y, { n: 18, speed: 1.6, size: 1.3 });
    V.puddle(t.x, t.y, { r: 60, color: GORE, dark: CLOT, dur: 4, bubbles: true, fumes: false });
    V.stream(t.x, t.y, e, { color: BLOOD, n: 16 });
    FX.later(0.45, () => V.plus(e.x, e.y, { color: '#ff8a8a', n: 6 }));
  }, { atTarget: true });

  // ---- Runeguard · Runic Cataclysm: the held rune stones tear free off the guard and climb, a great rune circle
  // spins up under the enemy, and the runes come down on it as a violet starfall of crystal; a Sanctum of shattered
  // runes settles round the guard for the party's Wards' 8s.
  const RUNE = '#9a6bff', RUNE2 = '#c8a8ff', RCORE = '#f0e8ff', RINK = '#1e0e3a';
  ABILITY_VFX.runeguard.runecataclysm = c => {
    if (c.cam) c.cam.dim(0.4, 1.4);
    V.charge(c.x, c.y, { color: RUNE2, r: 60, n: 12, dur: 0.35, follow: c.ent });
    V.ink(c.tx, c.ty, { r: 110, dur: 0.6 });
    V.sigil(c.tx, c.ty, { r: 110, style: 'runes', color: RUNE, dur: 0.6, spin: 7 });
    for (let i = 0; i < 4; i++) c.later(0.05 + i * 0.08, () => { const a = Math.random() * Math.PI * 2; V.lightning(c.ent.x, c.ent.y, c.ent.x + Math.cos(a) * 70, c.ent.y + Math.sin(a) * 45, { color: '#d0b8ff', jag: 12 }); });
    c.later(0.42, () => {
      camHit(c.cam, '#d8c4ff', 1);
      shake(8);
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, d = rand(20, 60); V.lightning(c.tx + Math.cos(a) * d, c.ty - 260, c.tx + Math.cos(a) * d * 0.4, c.ty + Math.sin(a) * d * 0.3, { color: i % 2 ? RUNE2 : '#ffffff', jag: 16, dur: 0.3 }); }
      V.crystals(c.tx, c.ty, { color: '#b28cff', n: 11, r: 72, h: 96, dur: 1.4 });
      V.spikeburst(c.tx, c.ty, { r: 110, n: 18, color: RUNE, core: RCORE, ink: RINK, dur: 0.45 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: 180 + i * 60, color: i ? RUNE2 : '#ffffff', dur: 0.6, w: 8 - i * 3, delay: i * 0.08 });
      V.decal(c.tx, c.ty, { style: 'crack', r: 70, dur: 4, a: 0.6, seed: Math.random() * 6 });
      V.sigil(c.tx, c.ty, { r: 80, style: 'runes', color: RUNE, dur: 4, spin: 0.4 });
      V.debris(c.tx, c.ty, { n: 10, color: '#6a5a88' });
      // the Sanctum the shattered runes settle into, round the guard (the party's Wards)
      V.ink(c.ent.x, c.ent.y, { r: 150, dur: 8, a: 0.25 });
      V.sigil(c.ent.x, c.ent.y, { r: 150, style: 'runes', color: '#9f7aff', dur: 8, spin: 0.35 });
      V.pillar(c.ent.x, c.ent.y, { r: 46, h: 170, color: '#b8a0ff', dur: 1 });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; V.crystals(c.ent.x + Math.cos(a) * 140, c.ent.y + Math.sin(a) * 109, { color: '#b8a0ff', n: 3, r: 14, h: 44, dur: 2.4 }); }
    });
  };
  // the stones themselves: one rune per Rune held (d.n) flies off the guard to the enemy; a Ward lending its blast (d.w)
  // cracks open on the guard in a hex flash
  KIT_VFX['rune-cataclysm'] = Object.assign((e, target, d) => {
    const n = (d && d.n) || 0, t = target || e;
    for (let i = 0; i < n; i++) FX.later(0.05 * i, () => { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7, sx = e.x + Math.cos(a) * 30, sy = e.y + Math.sin(a) * 20 - 30;
      V.glint(sx, sy, { color: RCORE, size: 22, z: 30 }); V.missile(sx, sy, t.x, t.y, { style: 'helix', color: RUNE2, speed: 900, arc: 120, size: 1.3 }); });
    if (d && d.w) { V.shield(e, { shape: 'hex', color: '#a88cff', dur: 0.5, r: 44 }); V.burst(e.x, e.y - 20, { color: '#d8c4ff', n: 12, speed: 220, kind: 'star' }); }
  }, { atTarget: true });

  // (Ironpalm · Hundred Palms, Gorgemaw · Maw of Ruin, Oathbroker · Final Reckoning: their own VFX PASS blocks below)
})();

// ======================================================================= VFX PASS · IRONPALM (docs/art/vfx-reference/ironpalm.png)
// Gold and saffron light on dark stone, every move in three beats (wind-up, impact, aftermath). Hundred Palms: a tiger
// spirit coils round the monk, the blows burst out as glowing hands with speed lines and rock, and a giant handprint is
// left cracked into the floor. Crane Step: feather arcs and afterimages. Rising Gate: a torii of light rises, cloud
// scrolls on the floor after. Thousand Palms: hands orbit the monk, then flurry out, leaving small prints. Read Stance:
// concentric rings and eye glyphs. Floor marks stay faint and short so boss telegraphs read through them.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => { FX.shake = Math.max(FX.shake, s); };
  const P = () => globalThis.IRONPALM_VFX || { col: () => '#ffb84a', hot: () => '#fff0c8', print: () => {}, impact: () => ({ x: 0, y: 0, a: 0 }), at: () => ({ x: 0, y: 0, a: 0 }) };
  const IP_INK = '#140a04', IP_ROCK = '#5a4a3a';
  // the size knobs: Hundred Palms' footprint (tiger, burst, the print left), and the supporting moves'
  const IRONPALM_ULT_SCALE = 1.8, IRONPALM_MOVE_SCALE = 1.3;
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  const stopE = (e, s) => { if (e && e.st && typeof hitStop === 'function') hitStop(e.st, s, FX.now); };
  const toward = (c, f) => ({ x: c.x + (c.tx - c.x) * f, y: c.y + (c.ty - c.y) * f });

  // ---- primitives
  // an open hand pointing along +x, palm on the origin: the palm filled, fingers and thumb as round strokes
  const IP_FINGERS = [[-4.8, 8.5], [-1.6, 10.5], [1.6, 10], [4.8, 8]];   // [across, length past the palm]
  function ironpalmHandShape(c, s, g = 0) {
    c.beginPath(); c.ellipse(0, 0, 6.5 * s + g, 7 * s + g, 0, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round'; c.lineWidth = 2.8 * s + g * 2; c.beginPath();
    for (const [fy, L] of IP_FINGERS) { c.moveTo(4 * s, fy * s); c.lineTo((4 + L) * s, fy * s * 1.12); }
    c.moveTo(-1 * s, -6 * s); c.lineTo(5 * s, -11.5 * s);   // the thumb
    c.stroke();
  }
  // a glowing hand of light: a soft halo, the saffron body, a white-hot core
  function ironpalmHand(c, x, y, a, s, col, k) {
    if (k <= 0.01 || s <= 0) return;
    c.save(); c.translate(x, y); c.rotate(a); c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, 0.28 * k); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s, 2.2 * s);
    c.globalAlpha = Math.min(1, 0.8 * k); ironpalmHandShape(c, s);
    c.scale(0.55, 0.55); c.globalAlpha = Math.min(1, 0.55 * k); c.fillStyle = c.strokeStyle = '#ffffff'; ironpalmHandShape(c, s);
    c.restore();
  }
  // a hand thrown from (x0, y0) to (x1, y1) at height z, growing as it goes, three speed lines streaming behind it
  function ironpalmHandFly(x0, y0, x1, y1, s, col, dur = 0.3, delay = 0, z = 18) {
    const a = Math.atan2(y1 - y0, x1 - x0), ca = Math.cos(a), sa = Math.sin(a);
    V.fx({ dur, delay, layer: 'air', draw: (c, p, t, e) => {
      const q = 1 - Math.pow(1 - p, 2.2), hx = x0 + (x1 - x0) * q, hy = y0 + (y1 - y0) * q - z, k = e.a * Math.min(1, p / 0.15) * (1 - Math.max(0, (p - 0.6) / 0.4)), S = s * (0.7 + 0.5 * q);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = 1.6; c.globalAlpha = Math.min(1, 0.55 * k); c.beginPath();
      for (let i = -1; i <= 1; i++) { const ox = -sa * i * 5 * S, oy = ca * i * 5 * S, L = (16 + 12 * (1 - Math.abs(i))) * S * (1.2 - p * 0.6);
        c.moveTo(hx + ox - ca * 7 * S, hy + oy - sa * 7 * S); c.lineTo(hx + ox - ca * L, hy + oy - sa * L); }
      c.stroke(); c.restore();
      ironpalmHand(c, hx, hy, a, S, col, k);
    } });
  }
  // a handprint pressed into the floor: a dark dent, gold heat in it that cools, cracks running out of the palm.
  // o.cracks: how many (0 for the small prints)
  function ironpalmFloorPrint(x, y, a, s, col, dur = 4, o = {}) {
    const nc = o.cracks ?? 9;
    const cracks = Array.from({ length: nc }, (_, i) => { const ca = i / nc * Math.PI * 2 + rand(-0.2, 0.2); let px = Math.cos(ca) * 5 * s, py = Math.sin(ca) * 5 * s; const pts = [[px, py]];
      for (let j = 0; j < 3; j++) { const aa = ca + rand(-0.5, 0.5), L = s * rand(3, 5.5); px += Math.cos(aa) * L; py += Math.sin(aa) * L; pts.push([px, py]); } return pts; });
    const inner = nc ? Array.from({ length: 4 }, () => [rand(-5, 3) * s, rand(-5, 5) * s, rand(-5, 3) * s, rand(-5, 5) * s]) : [];
    const trace = c => { for (const pts of cracks) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); } for (const l of inner) { c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); } };
    V.fx({ dur, delay: o.delay, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.04) * Math.min(1, (1 - p) / 0.35), heat = Math.max(0, 1 - t / (o.heatT ?? Math.min(2.6, dur * 0.55)));
      c.save(); c.translate(x, y); c.scale(1, 0.62); c.rotate(a);
      if (o.rim) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, o.rim * k); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s, 1.6 * s); c.globalCompositeOperation = 'source-over'; }   // a warm glow round its edge
      c.globalAlpha = Math.min(1, (o.ink ?? 0.26) * k); c.fillStyle = c.strokeStyle = IP_INK; ironpalmHandShape(c, s, 0.8 * s);   // the dent
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * ((o.warm ?? 0.07) + 0.4 * heat); c.fillStyle = c.strokeStyle = col; ironpalmHandShape(c, s);   // the heat in it
      c.globalCompositeOperation = 'source-over';
      if (nc) {
        c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = Math.min(1, (o.crackA ?? 0.42) * k); c.strokeStyle = IP_INK; c.lineWidth = o.crackW ?? 2.4; c.beginPath(); trace(c); c.stroke();
        const ch = Math.max(heat, o.ember ?? 0);   // (o.ember: the cracks keep a faint glow after the heat's gone)
        if (ch > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * k * ch; c.strokeStyle = col; c.lineWidth = 1.1; c.beginPath(); trace(c); c.stroke(); }
      }
      c.restore();
      if (o.ring) V.neonRing(c, x, y, o.ring, col, 1.6, k * 0.3, 0.62);   // the shock's rim cut round it
      if (heat > 0.02) V.glowAt(c, x, y, 12 * s, col, 0.3 * k * heat);
    } });
  }
  // the tiger spirit: striped bands of gold coiling up round the monk, a tiger's mask looming over its shoulder
  function ironpalmTigerMask(c, x, y, s, col, hot, k) {
    if (k <= 0.02) return;
    V.glowAt(c, x, y, 46 * s, col, 0.4 * k);
    c.save(); c.translate(x, y); c.scale(s, s);
    const head = () => {
      c.moveTo(-22, -6); c.quadraticCurveTo(-24, -24, -12, -26); c.lineTo(-17, -38); c.lineTo(-4, -28);   // left ear
      c.quadraticCurveTo(0, -30, 4, -28); c.lineTo(17, -38); c.lineTo(12, -26); c.quadraticCurveTo(24, -24, 22, -6);   // crown, right ear
      c.lineTo(31, -1); c.lineTo(25, 4); c.lineTo(32, 10); c.lineTo(21, 13); c.lineTo(24, 20); c.lineTo(12, 21);   // the right ruff
      c.quadraticCurveTo(0, 33, -12, 21); c.lineTo(-24, 20); c.lineTo(-21, 13); c.lineTo(-32, 10); c.lineTo(-25, 4); c.lineTo(-31, -1); c.closePath();   // jaw, the left ruff
    };
    // the face's light: a saffron body behind the lines, so the head reads as a solid shape and not a doodle
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.3 * k); c.fillStyle = col; c.beginPath(); head(); c.fill(); c.restore();
    c.save(); c.globalAlpha = Math.min(1, 0.55 * k); c.strokeStyle = '#2a1408'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath();   // the dark stripes
    for (const d of [-1, 1]) { c.moveTo(d * 29, 0); c.lineTo(d * 17, 2); c.moveTo(d * 29, 8); c.lineTo(d * 18, 8); c.moveTo(d * 21, 16); c.lineTo(d * 14, 13); c.moveTo(d * 20, -17); c.lineTo(d * 13, -12); }
    c.moveTo(-6, -27); c.lineTo(-3, -19); c.moveTo(6, -27); c.lineTo(3, -19);
    c.stroke(); c.restore();
    V.neonPath(c, col, 2.4, k, head);
    // the open jaw and its fangs
    c.save(); c.globalAlpha = Math.min(1, 0.85 * k); c.fillStyle = '#2a0c04'; c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(0, 9, 10, 12); c.quadraticCurveTo(0, 29, -10, 12); c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = hot; c.beginPath(); for (const d of [-1, 1]) { c.moveTo(d * 8, 12); c.lineTo(d * 5.5, 21); c.lineTo(d * 3.5, 11.5); c.moveTo(d * 6, 25); c.lineTo(d * 4, 19); c.lineTo(d * 2, 25.5); } c.fill(); c.restore();
    V.neonPath(c, hot, 1.7, k, () => {
      c.moveTo(-15, -10); c.lineTo(-5, -5); c.lineTo(-13, -4); c.moveTo(15, -10); c.lineTo(5, -5); c.lineTo(13, -4);   // the eyes, narrowed and burning
      c.moveTo(-4, 4); c.lineTo(0, 8); c.lineTo(4, 4);   // the nose
      c.moveTo(-3, -25); c.lineTo(0, -17); c.lineTo(3, -25); c.moveTo(-11, -20); c.lineTo(-7, -13); c.moveTo(11, -20); c.lineTo(7, -13);   // brow stripes
      c.moveTo(-11, 7); c.lineTo(-27, 4); c.moveTo(-11, 9); c.lineTo(-26, 11); c.moveTo(11, 7); c.lineTo(27, 4); c.moveTo(11, 9); c.lineTo(26, 11);   // whiskers
    });
    V.glowAt(c, -10, -7, 7, '#ffffff', 0.7 * k); V.glowAt(c, 10, -7, 7, '#ffffff', 0.7 * k);
    c.restore();
  }
  // a tiger's forepaw of light at (x, y), reaching along a: the pad, the toes and three hooked claws
  function ironpalmPaw(c, x, y, a, s, col, hot, k) {
    if (k <= 0.02) return;
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.32 * k); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2); for (const t of [-5.5, 0, 5.5]) { c.moveTo(16, t); c.arc(13, t, 3, 0, Math.PI * 2); } c.fill(); c.restore();
    V.neonPath(c, col, 2, k, () => { c.moveTo(9, 0); c.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2); });
    V.neonPath(c, hot, 1.6, k, () => { for (const t of [-5, 0, 5]) { c.moveTo(16, t); c.quadraticCurveTo(24, t * 1.3 - 1, 25, t * 1.5 + 4); } });
    c.restore();
  }
  function ironpalmTiger(ent, dur, col, hot, S = 1) {
    const back = (ent.angle || 0) + Math.PI;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) / 0.25), x = ent.x, y = ent.y, fa = ent.angle || 0;
      // the striped body: three bands of gold coiling up round the monk, the middle one white-hot
      for (let i = 0; i < 3; i++) {
        const a0 = t * 7 + i * 2.1, R = (42 + i * 15 + 6 * Math.sin(t * 5 + i)) * S, z = (6 + i * 16 + t * 12) * S, span = 2.5, W = 11 * S;
        c.save(); c.translate(x, y - z); c.scale(1, 0.55);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.55 * k); c.fillStyle = i === 1 ? hot : col;
        c.beginPath(); c.arc(0, 0, R, a0, a0 + span);
        for (let j = 12; j >= 0; j--) { const q = j / 12, aa = a0 + span * q, rr = R - W * Math.sin(Math.PI * Math.min(1, q * 1.25)); c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        c.closePath(); c.fill();
        // the tiger's stripes: dark cuts across the band
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.62 * k; c.strokeStyle = '#2a1408'; c.lineWidth = 2.4 * Math.sqrt(S); c.beginPath();
        for (let j = 1; j < 7; j++) { const sa = a0 + j * 0.34; c.moveTo(Math.cos(sa) * (R + 1), Math.sin(sa) * (R + 1)); c.lineTo(Math.cos(sa + 0.12) * (R - W * 0.9), Math.sin(sa + 0.12) * (R - W * 0.9)); }
        c.stroke(); c.restore();
      }
      // the forepaws come down either side of the monk, claws reaching for the enemy
      const pk = k * Math.min(1, Math.max(0, (t - 0.12) / 0.2)), reach = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.12) / 0.3)), 2);
      for (const d of [-1, 1]) { const px = x + Math.cos(fa) * (6 + 16 * reach) * S - Math.sin(fa) * d * 26 * S, py = y + (Math.sin(fa) * (6 + 16 * reach) * S + Math.cos(fa) * d * 26 * S) * 0.6 - 10 * S;
        ironpalmPaw(c, px, py, Math.atan2(Math.sin(fa) * 0.6, Math.cos(fa)) + d * 0.25, 1.1 * S, col, hot, pk * 0.9); }
      // the head looms over the monk's shoulder, growing as it forms
      const form = 1 - Math.pow(1 - Math.min(1, t / 0.35), 2);
      ironpalmTigerMask(c, x + Math.cos(back) * 20 * S, y + Math.sin(back) * 10 * S - (60 + 26 * form) * S - t * 10, (0.8 + 0.25 * form) * S, col, hot, k * Math.min(1, t / 0.25) * 0.9);
    }, tick: p => { if (p < 0.8 && Math.random() < 0.3) { const a = Math.random() * Math.PI * 2, d = rand(60, 90) * S;   // grit swept up into the coil
      V.spawn({ x: ent.x + Math.cos(a) * d, y: ent.y + Math.sin(a) * d * 0.6, z: 4, life: 0.5, size: rand(4, 7), color: IP_ROCK, kind: 'shard', add: false, vr: 8, orbit: { x: ent.x, y: ent.y, a, r: d, w: 7, dr: -60 * S, flat: 0.6, follow: ent } }); } } });
  }
  // a torii of light standing on (x, y), w wide, h tall: it rises out of the floor, holds a beat and fades
  function ironpalmTorii(x, y, w, h, col, hot, dur = 0.6) {
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const q = 1 - Math.pow(1 - Math.min(1, p / 0.35), 3), hh = h * q, k = e.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.4), L = x - w / 2, Rr = x + w / 2;
      const g = c.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.32 * k));
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(L + w * 0.14, y - hh, w * 0.72, hh); c.restore();
      V.neonPath(c, col, 3.2, k, () => { c.moveTo(L + w * 0.14, y); c.lineTo(L + w * 0.16, y - hh); c.moveTo(Rr - w * 0.14, y); c.lineTo(Rr - w * 0.16, y - hh); });   // the posts
      V.neonPath(c, hot, 3, k, () => { c.moveTo(L - w * 0.06, y - hh - 7); c.quadraticCurveTo(x, y - hh + 5, Rr + w * 0.06, y - hh - 7);   // the kasagi, ends upturned
        c.moveTo(L + w * 0.05, y - hh * 0.8); c.lineTo(Rr - w * 0.05, y - hh * 0.8); c.moveTo(x, y - hh * 0.8); c.lineTo(x, y - hh + 2); });   // the nuki and its strut
    } });
  }
  // the gate's shadow left on the floor: two post marks, the beam between, cloud scrolls curling off the posts
  const ironpalmCurl = (c, x, y, s, dir) => { for (let j = 0; j <= 12; j++) { const a = dir * j * 0.5, r = s * (1 + j * 0.45), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.6; j ? c.lineTo(px, py) : c.moveTo(px, py); } c.lineTo(x + dir * s * 12, y + s * 2); };
  function ironpalmToriiMark(x, y, w, col, dur = 2.2, A = 0.5) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.5) * A, L = x - w * 0.36, Rr = x + w * 0.36, s = w / 76;
      V.neonPath(c, col, 1.8, k, () => { c.moveTo(L, y); c.lineTo(L - 4 * s, y - 10 * s); c.moveTo(Rr, y); c.lineTo(Rr + 4 * s, y - 10 * s); c.moveTo(L - 12 * s, y - 12 * s); c.quadraticCurveTo(x, y - 6 * s, Rr + 12 * s, y - 12 * s); c.moveTo(L - 2 * s, y - 6 * s); c.lineTo(Rr + 2 * s, y - 6 * s); });
      V.neonPath(c, col, 1.3, k * 0.85, () => { ironpalmCurl(c, L - 10 * s, y + 4, 3 * s, -1); ironpalmCurl(c, Rr + 10 * s, y + 4, 3 * s, 1); });
    } });
  }
  // an eye glyph (an almond and its pupil)
  const ironpalmEye = (c, x, y, s) => { c.moveTo(x - 7 * s, y); c.quadraticCurveTo(x, y - 6 * s, x + 7 * s, y); c.quadraticCurveTo(x, y + 6 * s, x - 7 * s, y); c.moveTo(x + 2 * s, y); c.arc(x, y, 2 * s, 0, Math.PI * 2); };

  const GRAND = ['Crane Step', 'Flowing Palms', 'Rising Gate', 'Heaven\'s Drop', 'Tiger Wall', 'Stone Breaker', 'Iron Ox', 'Thousand Palms'];

  // ---- Hundred Palms (the Ultimate). Wind-up and the eight named strikes here; the last palm's shockwave is ip-hundred
  ABILITY_VFX.ironpalm.hundredpalms = c => {
    const I = P(), k = I.col(c.ent), h = I.hot(c.ent), e = c.ent;
    const S = IRONPALM_ULT_SCALE;
    if (c.cam) c.cam.dim(0.4, 1.6);
    ironpalmTiger(e, 1.15, k, h, S);
    V.charge(c.x, c.y, { color: h, r: 70 * S, n: 10, dur: 0.4, follow: e });
    V.swirl(e.x, e.y, { r: 60 * S, color: k, dur: 0.5, inward: true, follow: e });
    V.shield(e, { shape: 'front', color: k, dur: 5, r: 40 });   // (Tiger Wall's stance, held)
    GRAND.forEach((name, i) => c.later(0.1 * (i + 1), () => {
      const a = Math.atan2(c.ty - e.y, c.tx - e.x) + rand(-0.6, 0.6), sx = e.x + Math.cos(a) * 12, sy = e.y + Math.sin(a) * 8;
      const x = c.tx - Math.cos(a) * rand(6, 22) + rand(-10, 10), y = c.ty - Math.sin(a) * rand(6, 18) + rand(-8, 8);
      ironpalmHandFly(sx, sy, x, y, rand(1, 1.3), i % 2 ? h : k, 0.13, 0, 20);
      c.later(0.1, () => {
        V.spawn({ x, y, z: 18, life: 0.16, size: 44, size1: 10, color: h, kind: 'star', vr: 6 });
        V.shock(x, y, { r: 44, color: k, dur: 0.22, w: 3 });
        if (i % 2) V.debris(x, y, { n: 2, color: IP_ROCK, speed: 0.6 });
        if (c.cam) c.cam.stop(0.03);
        shake(1.5);
      });
      FX.text(c.tx + (i % 2 ? 26 : -26), c.ty - 70 - (i % 3) * 14, name, i % 2 ? h : k, c.mine ? 13 : 11, 0.7);
    }));
  };
  // the giant palm driven through, hands bursting out of the blow, the handprint left cracked in the floor
  KIT_VFX['ip-hundred'] = Object.assign((e, target) => {
    const I = P(), k = I.col(e), h = I.hot(e), t = target || e, cam = FX.camFor(e), a = Math.atan2(t.y - e.y, t.x - e.x), S = IRONPALM_ULT_SCALE;
    camHit(cam, '#fff0c8', 1.2);
    shake(9);
    stopE(e, 0.16);
    ironpalmHandFly(e.x, e.y, t.x, t.y, 3.4 * S * 0.8, h, 0.32, 0, 30);
    V.flash(t.x, t.y - 24, 60 * S, '#fff6e0', 0.16);   // the white-hot core of the blow, brief
    // the giant palm of light stands up out of the blow, fingers to the sky, with light raying out round it
    const rays = Array.from({ length: 18 }, (_, i) => ({ a: i / 18 * Math.PI * 2 + rand(-0.1, 0.1), L: rand(0.6, 1) }));
    V.fx({ dur: 0.5, layer: 'air', draw: (c, p, tt, fx) => {
      const q = 1 - Math.pow(1 - Math.min(1, p / 0.3), 3), kk = fx.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.45);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = k;
      c.globalAlpha = Math.min(1, 0.5 * kk); c.beginPath();   // tapered wedges of light
      for (const r of rays) { const r0 = 16 * S * q, r1 = (36 + 64 * r.L) * S * q, w = 0.07, cy = t.y - 20;
        c.moveTo(t.x + Math.cos(r.a - w) * r0, cy + Math.sin(r.a - w) * r0 * 0.7); c.lineTo(t.x + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1 * 0.7); c.lineTo(t.x + Math.cos(r.a + w) * r0, cy + Math.sin(r.a + w) * r0 * 0.7); c.closePath(); }
      c.fill(); c.restore();
      ironpalmHand(c, t.x, t.y - 10 - 44 * S * q, -Math.PI / 2, 2.6 * S * (0.6 + 0.4 * q), k, kk * 0.75);
    } });
    V.spikeburst(t.x, t.y, { r: 62 * S, n: 18, color: k, core: h, ink: '#2a1408', dur: 0.32 });
    V.shock(t.x, t.y, { r: 120 * S, color: '#ffffff', dur: 0.4, w: 8 });
    V.shock(t.x, t.y, { r: 90 * S, color: k, dur: 0.55, w: 5, delay: 0.06 });
    for (let i = 0; i < 12; i++) { const ra = i / 12 * Math.PI * 2 + rand(-0.15, 0.15), d = rand(110, 150) * S;
      ironpalmHandFly(t.x + Math.cos(ra) * 18 * S, t.y + Math.sin(ra) * 12 * S, t.x + Math.cos(ra) * d, t.y + Math.sin(ra) * d * 0.62, rand(1.5, 1.9) * Math.sqrt(S), i % 2 ? h : k, 0.45, 0.03 + i * 0.01, 28); }
    V.burst(t.x, t.y, { color: k, color2: '#ffffff', n: 16, speed: 280 * S, kind: 'star', flashR: 50 * S });
    V.debris(t.x, t.y, { n: 16, color: IP_ROCK, speed: 1.4, size: 1.3 });
    V.smoke(t.x, t.y, { n: 6, r: 40 * S, color: '#a89880', size: 30 * S, a: 0.35, speed: 70 * S, life: 1.2 });
    // the aftermath: the giant print in the floor between the monk and the enemy, fingers toward the enemy; its
    // fill stays a faint dent, the glow is round its rim and in the cracks, so telegraphs read through it
    const m = { x: e.x + (t.x - e.x) * 0.3, y: e.y + (t.y - e.y) * 0.3 }, ps = 7 * S * 0.75;
    ironpalmFloorPrint(m.x - Math.cos(a) * 16 * S, m.y - Math.sin(a) * 10 * S, Math.atan2(Math.sin(a) / 0.62, Math.cos(a)), ps, k, 5, { delay: 0.1, rim: 0.12, ink: 0.26, warm: 0.04, crackA: 0.55, crackW: 3, ember: 0.35, ring: 12 * ps, heatT: 1.4 });
    // the bell over the party (Temple Bell's 15% for 8s): two gold rings
    for (let i = 0; i < 2; i++) V.shock(e.x, e.y, { r: 160 + i * 50, color: '#ffd27a', dur: 0.7, w: 6 - i * 2, delay: 0.1 + i * 0.16 });
    FX.text(t.x, t.y - 100 * S, 'Hundred Palms', '#fff0c8', 17, 1.1);
  }, { atTarget: true });

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.ironpalm, {
    // Crane Step: feather arcs sweep round the monk, afterimages trail the hop, a flicked palm, feathers drift down
    crane: c => {
      const I = P(), k = I.col(c.ent), e = c.ent, sx = c.x, sy = c.y, M = IRONPALM_MOVE_SCALE;
      V.smoke(sx, sy, { n: 3, color: '#d8ccb8', size: 16 * M, a: 0.45, speed: 40 * M });
      for (let i = 0; i < 3; i++) V.slash(sx, sy, c.ang + Math.PI * (0.7 + i * 0.45), { r: (36 + i * 10) * M, span: 2.4, color: i === 1 ? '#fff0c8' : k, w: 0.16, dur: 0.3 + i * 0.04, flip: i === 1, sparks: 0 });
      V.fx({ dur: 0.4, layer: 'ground', draw: (ctx, p, t, fx) => {   // the feather-edged sweep round the feet: a crane's wing of streaks
        const kk = fx.a * Math.min(1, p / 0.1) * (1 - p), a0 = c.ang + Math.PI * 0.6 + p * 2.2;
        V.neonPath(ctx, k, 1.4, kk * 0.7, () => { for (let j = 0; j < 7; j++) { const a = a0 + j * 0.28, r0 = 30 * M, r1 = (44 + j * 2.5) * M; ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0 * 0.6); ctx.quadraticCurveTo(sx + Math.cos(a + 0.2) * r1, sy + Math.sin(a + 0.2) * r1 * 0.6, sx + Math.cos(a + 0.42) * r1 * 1.05, sy + Math.sin(a + 0.42) * r1 * 0.63); } });
      } });
      V.fx({ dur: 0.45, layer: 'air', draw: (ctx, p, t, fx) => {   // afterimages: pale ghosts of the monk between where it left and where it is
        const dx = e.x - sx, dy = e.y - sy, moved = Math.hypot(dx, dy) > 10, kk = fx.a * (1 - p);
        for (let i = 0; i < 3; i++) { const f = moved ? i / 3 : 0, x = sx + dx * f - (moved ? 0 : Math.cos(c.ang) * (8 + i * 9)), y = sy + dy * f - (moved ? 0 : Math.sin(c.ang) * (5 + i * 6)), a = kk * (0.35 - i * 0.08);
          V.glowAt(ctx, x, y - 22, 18, k, a); ctx.globalAlpha = Math.max(0, a * 0.7); ctx.fillStyle = '#fff0c8'; ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.ellipse(x, y - 16, 7, 12, 0, 0, Math.PI * 2); ctx.moveTo(x + 5, y - 34); ctx.arc(x, y - 34, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      } });
      c.later(0.08, () => { const p = I.impact(c, 0.45); I.print(p.x, p.y, p.a, k, 1, 0.35); });
      c.later(0.16, () => { for (let i = 0; i < 6; i++) V.spawn({ x: e.x + rand(-34, 34), y: e.y + rand(-18, 18), z: rand(26, 50), vx: rand(-36, 36), vy: rand(-12, 12), vz: rand(-10, 20), g: 30, drag: 0.05,
        life: rand(1.1, 1.6), size: rand(18, 24), color: i % 2 ? '#ffe0a0' : k, kind: 'feather', vr: rand(-2, 2), flutter: 4 }); });
    },
    // Rising Gate: the uppercut; a torii of light rises over the boss, rock thrown up, cloud scrolls left on the floor
    gate: c => c.later(0.14, () => {
      const I = P(), k = I.col(c.ent), h = I.hot(c.ent), M = IRONPALM_MOVE_SCALE;
      I.impact(c, 1.1);
      ironpalmTorii(c.tx, c.ty + 6, 76 * M, 104 * M, k, h, 0.65);
      V.pillar(c.tx, c.ty, { r: 22 * M, h: 120 * M, color: k, dur: 0.45 });
      V.shock(c.tx, c.ty, { r: 70 * M, color: k, dur: 0.35, w: 4 });
      V.sparks(c.tx, c.ty, { color: h, n: 8, speed: 300, up: 380, spread: 0.6, angle: -Math.PI / 2 });
      V.debris(c.tx, c.ty, { n: 8, color: IP_ROCK, speed: 0.75, up: 1.4 });
      V.smoke(c.tx, c.ty, { n: 4, color: '#c8b8a0', size: 22 * M, a: 0.4, speed: 60 * M });
      const m = toward(c, 0.72); c.later(0.3, () => ironpalmToriiMark(m.x, m.y + 8, 76 * M, k, 2.4, 0.7));
    }),
    // Thousand Palms: hands circle the monk, then flurry out one by one onto the boss, small prints left on the floor
    palms: c => {
      const I = P(), k = I.col(c.ent), h = I.hot(c.ent), e = c.ent, n = 6, gap = 0.07, a0 = Math.random() * Math.PI * 2, M = IRONPALM_MOVE_SCALE;
      const orbit = (i, t) => { const a = a0 + i * Math.PI * 2 / n + t * 9; return { x: e.x + Math.cos(a) * 34 * M, y: e.y + Math.sin(a) * 20 * M, a }; };
      V.fx({ dur: 0.02 + n * gap, layer: 'air', draw: (ctx, p, t, fx) => { const kk = fx.a * Math.min(1, t / 0.06);
        V.neonRing(ctx, e.x, e.y - 22, 34 * M, k, 1.4, kk * 0.4, 0.59);   // the orbit's trail
        for (let i = 0; i < n; i++) { if (t > 0.02 + i * gap) continue; const o = orbit(i, t); ironpalmHand(ctx, o.x, o.y - 22, o.a + Math.PI / 2, 0.75 * M, i % 2 ? h : k, kk * 0.9); } } });
      for (let i = 0; i < n; i++) c.later(0.02 + i * gap, () => {
        const o = orbit(i, 0.02 + i * gap), a = Math.atan2(c.ty - c.y, c.tx - c.x) + rand(-0.8, 0.8), x = c.tx - Math.cos(a) * rand(10, 26) + rand(-10, 10), y = c.ty - Math.sin(a) * rand(10, 26) + rand(-8, 8);
        ironpalmHandFly(o.x, o.y + 2, x, y, M, i % 2 ? h : k, 0.1, 0, 20);
        c.later(0.09, () => {
          I.print(x, y, a, i % 2 ? h : k, rand(0.9, 1.3), 0.35);
          V.spawn({ x, y, z: 16, life: 0.14, size: 36, size1: 8, color: h, kind: 'star', vr: 6 });
          const f = { x: c.x + (x - c.x) * 0.8, y: c.y + (y - c.y) * 0.8 };   // (short of the boss's feet, so its sprite doesn't hide the print)
          ironpalmFloorPrint(f.x + rand(-18, 18), f.y + rand(-12, 12), a + rand(-0.5, 0.5), 1.15 * M, k, 2.4, { cracks: 0, rim: 0.18, ink: 0.3, warm: 0.1 });
          stopE(c.ent, 0.04); shake(1.5);
        });
      });
      c.later(0.12 + n * gap, () => { V.spikeburst(c.tx, c.ty, { r: 60 * M, n: 16, color: k, core: h, ink: '#2a1408', dur: 0.34 }); V.shock(c.tx, c.ty, { r: 100 * M, color: k, dur: 0.4, w: 5 });
        for (let i = 0; i < 5; i++) { const ra = c.ang + (i - 2) * 0.5; ironpalmHandFly(c.tx, c.ty, c.tx + Math.cos(ra) * 70 * M, c.ty + Math.sin(ra) * 44 * M, 0.9 * M, i % 2 ? h : k, 0.3, i * 0.015, 22); }   // the flurry bursting through
        V.debris(c.tx, c.ty, { n: 5, color: IP_ROCK, speed: 0.8 });
        V.burst(c.tx, c.ty, { color: k, color2: '#ffffff', n: 12, speed: 240 * M, kind: 'star', flashR: 50 * M }); stopE(c.ent, 0.1); shake(5); });
    },
    // Read Stance: still rings open round the monk one inside the other, a cross of ticks and an eye at each point
    read: c => {
      const I = P(), k = I.col(c.ent), e = c.ent, M = IRONPALM_MOVE_SCALE;
      V.fx({ dur: 1.2, layer: 'ground', draw: (ctx, p, t, fx) => {
        const kk = fx.a * Math.min(1, (1 - p) / 0.45), x = e.x, y = e.y, F = 0.6;
        V.glowAt(ctx, x, y, 40 * M, k, 0.18 * kk);
        for (let i = 0; i < 4; i++) { const q = Math.min(1, Math.max(0, (t - i * 0.06) / 0.18)); if (q <= 0) continue; V.neonRing(ctx, x, y, (22 + i * 16) * M * (0.8 + 0.2 * q), k, 1.7 - i * 0.3, kk * q * (0.62 - i * 0.11), F); }
        const q = Math.min(1, Math.max(0, (t - 0.18) / 0.15)); if (q <= 0) return;
        V.neonPath(ctx, k, 1.3, kk * q * 0.6, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a) * F; ctx.moveTo(x + cx * 76 * M, y + cy * 76 * M); ctx.lineTo(x + cx * 100 * M, y + cy * 100 * M);
          for (let j = 0; j < 3; j++) { const r = (30 + j * 14) * M; ctx.moveTo(x + cx * r - cy / F * 3, y + cy * r + cx * 3 * F); ctx.lineTo(x + cx * r + cy / F * 3, y + cy * r - cx * 3 * F); } } });   // the cross, ticked along its arms
        V.neonPath(ctx, '#fff0c8', 1.3, kk * q * 0.7, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ironpalmEye(ctx, x + Math.cos(a) * 68 * M, y + Math.sin(a) * 68 * M * F, 0.8 * M); } });
      } });
      V.shock(c.x, c.y, { r: 50 * M, color: '#fff0c8', dur: 0.35, w: 2 });
      V.shock(c.x, c.y, { r: 90 * M, color: k, dur: 0.5, w: 2, delay: 0.1 });
    },
  });
})();

// ======================================================================= VFX PASS · GORGEMAW (docs/art/vfx-reference/gorgemaw.png)
// Purple-magenta flesh, glowing orange teeth, lava in the cracks; Morsels as little spirits in their own colours.
// Maw of Ruin: a huge jaw opens round the Gorgemaw toward the enemy with the debris streaming in, a ring of teeth slams
// shut round the enemy, a ring of tooth marks is left scorched in the floor and the Morsel spirits fly home. Gnash: a
// crescent bite. Spit: a green slime glob with the Morsel glowing in it, splashing into puddles. Digest: the Morsels
// spiral in and a spiral seal glows under the belly. Open Wide: a wind funnel into the jaw, a dark spiral on the floor.
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => { FX.shake = Math.max(FX.shake, s); };
  const G = () => globalThis.GORGEMAW_VFX;
  const FLESH = '#5a1648', RIM = '#e0508a', TOOTH = '#ffd8b0', TGLOW = '#ff8a3a', LAVA = '#ff6a2a', GINK = '#1e0618', SLIME = '#8ee03a', SLIME_D = '#3e7a18';
  const LETTER = { r: 'ring', l: 'lance', f: 'fang', s: 'spike' };
  const mcol = m => (G() ? G().MCOL(m) : TGLOW);
  const mouthOf = e => (G() ? G().mouth(e) : { x: e.x, y: e.y, z: 30 });
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  // the size knobs: Maw of Ruin's footprint (the jaw, the bite, the scorch left), and the supporting moves'
  const GORGEMAW_ULT_SCALE = 1.8, GORGEMAW_MOVE_SCALE = 1.3;

  // ---- primitives
  // the Maw: a band of purple flesh with dark spines on its back and glowing teeth along its inside, open by `gap`
  // radians toward world angle `ang` (gap 0: a closed ring of teeth). Flattened onto the floor round (x, y - z)
  function gorgemawMaw(c, x, y, R, ang, gap, k, o = {}) {
    if (k <= 0.01 || R <= 1) return;
    const flat = o.flat ?? 0.7, T = R * (o.thick ?? 0.3), n = o.teeth ?? 18, la = Math.atan2(Math.sin(ang) / flat, Math.cos(ang));
    const a1 = la + gap / 2, span = Math.PI * 2 - gap, ns = Math.max(4, Math.round(n * 0.6));
    c.save(); c.translate(x, y - (o.z || 0)); c.scale(1, flat);
    c.globalAlpha = Math.min(1, k); c.fillStyle = GINK; c.beginPath();   // the spines
    for (let i = 0; i < ns; i++) { const a = a1 + span * (i + 0.5) / ns, w = span / ns * 0.3; c.moveTo(Math.cos(a - w) * R, Math.sin(a - w) * R); c.lineTo(Math.cos(a) * (R + T * 0.75), Math.sin(a) * (R + T * 0.75)); c.lineTo(Math.cos(a + w) * R, Math.sin(a + w) * R); }
    c.fill();
    c.fillStyle = FLESH; c.strokeStyle = GINK; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R, a1, a1 + span); c.arc(0, 0, R - T, a1 + span, a1, true); c.closePath(); c.fill(); c.stroke();   // the flesh
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, 0.8 * k); c.strokeStyle = RIM; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 0, R - T * 0.88, a1, a1 + span); c.stroke();   // the hot gum
    c.globalAlpha = Math.min(1, 0.55 * k); c.strokeStyle = LAVA; c.lineWidth = 1.3; c.beginPath();   // lava in the cracks of the flesh
    for (let i = 0; i < ns; i += 2) { const a = a1 + span * (i + 0.2) / ns; c.moveTo(Math.cos(a) * (R - T * 0.15), Math.sin(a) * (R - T * 0.15)); c.lineTo(Math.cos(a + 0.08) * (R - T * 0.55), Math.sin(a + 0.08) * (R - T * 0.55)); c.lineTo(Math.cos(a + 0.02) * (R - T * 0.75), Math.sin(a + 0.02) * (R - T * 0.75)); }
    c.stroke();
    c.globalCompositeOperation = 'source-over'; c.beginPath();   // the teeth, pointing in
    for (let i = 0; i < n; i++) { const a = a1 + span * (i + 0.5) / n, w = span / n * 0.42, L = T * (i % 2 ? 0.85 : 1.25) * (o.bite ?? 1), r0 = R - T * 0.8;
      c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * (r0 - L), Math.sin(a) * (r0 - L)); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath(); }
    c.globalAlpha = Math.min(1, k); c.fillStyle = TOOTH; c.fill(); c.strokeStyle = '#4a1206'; c.lineWidth = 1.1; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.5 * k); c.fillStyle = TGLOW; c.fill();
    c.restore();
  }
  // tooth marks scorched into the floor where the Maw shut: dark fang-shaped burns, their edges still glowing a moment
  function gorgemawScorch(x, y, R, dur, o = {}) {
    const n = o.teeth ?? 18, a0 = o.a0 ?? 0, span = o.span ?? Math.PI * 2, rr = Array.from({ length: n }, () => rand(0.85, 1.15));
    // o.cracks: lava cracks running out from the ring (the Ultimate's); o.glow: the teeth's edges keep a faint glow
    const cracks = Array.from({ length: o.cracks || 0 }, (_, i) => { const ca = a0 + span * (i + rand(0.2, 0.8)) / (o.cracks || 1); let px = Math.cos(ca) * R * 1.02, py = Math.sin(ca) * R * 1.02; const pts = [[px, py]];
      for (let j = 0; j < 3; j++) { const aa = ca + rand(-0.4, 0.4), L = R * rand(0.08, 0.16); px += Math.cos(aa) * L; py += Math.sin(aa) * L; pts.push([px, py]); } return pts; });
    V.fx({ dur, delay: o.delay, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.05) * Math.min(1, (1 - p) / 0.4), heat = Math.max(0, 1 - t / 1.2);
      c.save(); c.translate(x, y); c.scale(1, 0.7);
      c.globalAlpha = 0.16 * k; c.strokeStyle = GINK; c.lineWidth = R * 0.22; c.beginPath(); c.arc(0, 0, R * 0.95, a0, a0 + span); c.stroke();   // the charred band
      if (cracks.length) { c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); for (const pts of cracks) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }
        c.globalAlpha = 0.4 * k; c.strokeStyle = GINK; c.lineWidth = 3; c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * (0.22 + 0.5 * heat); c.strokeStyle = LAVA; c.lineWidth = 1.3; c.stroke(); c.globalCompositeOperation = 'source-over'; }
      c.beginPath();
      for (let i = 0; i < n; i++) { const a = a0 + span * (i + 0.5) / n, w = span / n * 0.32, r0 = R * 1.02, L = R * 0.26 * rr[i];
        c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * (r0 - L), Math.sin(a) * (r0 - L)); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath(); }
      c.globalAlpha = (o.ink ?? 0.34) * k; c.fillStyle = GINK; c.fill();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * ((o.glow ?? 0.08) + 0.45 * heat); c.strokeStyle = TGLOW; c.lineWidth = o.lw ?? 1.4; c.stroke();
      c.restore();
    } });
  }
  // a Morsel spirit: a glowing little ghost with a tail, flying along path(p) -> { x, y, z }
  function gorgemawSpirit(path, col, dur, delay = 0, s = 1) {
    V.fx({ dur, delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.15);
      for (let i = 5; i >= 1; i--) { const pt = path(Math.max(0, p - i * 0.035)); V.glowAt(c, pt.x, pt.y - pt.z, (10 - i) * s * 1.3, col, k * 0.5 * (1 - i / 6)); }
      const h = path(p), h2 = path(Math.min(1, p + 0.02)), x = h.x, y = h.y - h.z, a = Math.atan2(h2.y - h2.z - y, h2.x - x || 0.001);
      V.glowAt(c, x, y, 16 * s, col, 0.7 * k);
      c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, k);
      c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 7 * s, 5.5 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = GINK; c.beginPath(); c.arc(2.5 * s, -2 * s, 1.4 * s, 0, Math.PI * 2); c.moveTo(4 * s, 2 * s); c.arc(2.5 * s, 2 * s, 1.4 * s, 0, Math.PI * 2); c.fill();
      c.restore();
    } });
  }
  // a curved path from a to b (either may be a function, read live: a mouth that moves), bent sideways and lifted
  const gorgemawArc = (a, b, bend, lift) => p => {
    const A = typeof a === 'function' ? a() : a, B = typeof b === 'function' ? b() : b, u = 1 - p;
    const mx = (A.x + B.x) / 2 - (B.y - A.y) * bend, my = (A.y + B.y) / 2 + (B.x - A.x) * bend;
    return { x: u * u * A.x + 2 * u * p * mx + p * p * B.x, y: u * u * A.y + 2 * u * p * my + p * p * B.y, z: (A.z || 0) * u + (B.z || 0) * p + Math.sin(p * Math.PI) * lift };
  };
  // a green slime glob with the Morsel glowing inside it, lobbed from q to t, dripping as it goes
  function gorgemawGlob(q, t, col, s, onHit) {
    const d = Math.hypot(t.x - q.x, t.y - q.y), dur = Math.max(0.12, d / 650), arc = 60;
    const pos = p => ({ x: q.x + (t.x - q.x) * p, y: q.y + (t.y - q.y) * p, z: (q.z || 0) * (1 - p) + 10 * p + Math.sin(p * Math.PI) * arc });
    V.fx({ dur, layer: 'air', draw: (c, p, tt, e) => {
      for (let i = 1; i <= 3; i++) { const b = pos(Math.max(0, p - i * 0.07)); V.glowAt(c, b.x, b.y - b.z, (12 - i * 2) * s, SLIME, e.a * 0.45); }
      const h = pos(p), x = h.x, y = h.y - h.z, wob = Math.sin(tt * 30) * 0.15, r = 9 * s;
      V.glowAt(c, x, y, r * 2.4, SLIME, 0.55 * e.a);
      c.save(); c.translate(x, y); c.globalAlpha = Math.min(1, e.a);
      c.fillStyle = SLIME_D; c.beginPath(); c.ellipse(0, 0, r * (1 + wob), r * (1 - wob), 0, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = SLIME; c.globalAlpha = Math.min(1, 0.7 * e.a); c.beginPath(); c.ellipse(-r * 0.15, -r * 0.2, r * 0.75, r * 0.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(0, r * 0.1, r * 0.42, 0, Math.PI * 2); c.fill();   // the Morsel in it
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, e.a); c.fillStyle = GINK; c.beginPath(); c.arc(-r * 0.35, -r * 0.35, r * 0.13, 0, Math.PI * 2); c.moveTo(r * 0.5, -r * 0.35); c.arc(r * 0.35, -r * 0.35, r * 0.13, 0, Math.PI * 2); c.fill();
      c.restore();
    }, tick: p => { if (Math.random() < 0.3) { const h = pos(p); V.spawn({ x: h.x, y: h.y, z: h.z, vz: -40, g: 400, life: 0.4, size: 5 * s, size1: 2, color: SLIME, kind: 'drop', add: false }); } }, done: () => onHit(t.x, t.y) });
  }
  // slime splashed over the floor: a few puddles, one with the Morsel's colour glowing in it, bubbling a moment
  function gorgemawPuddles(x, y, col, s = 1, dur = 2) {
    const blobs = Array.from({ length: 4 }, (_, i) => { const a = Math.random() * Math.PI * 2, d = i ? rand(14, 34) * s : 0; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, r: (i ? rand(6, 11) : 13) * s, ph: rand(0, 6) }; });
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.45);
      for (let i = 0; i < blobs.length; i++) { const b = blobs[i];
        c.globalAlpha = 0.42 * k; c.fillStyle = SLIME_D; c.beginPath(); c.ellipse(b.x, b.y, b.r * 1.15, b.r * 0.65, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.5 * k; c.strokeStyle = SLIME; c.lineWidth = 1.2; c.stroke();   // a bright wet rim
        V.glowAt(c, b.x, b.y, b.r * 1.3, i ? SLIME : col, (i ? 0.32 : 0.5) * k * (0.8 + 0.2 * Math.sin(t * 6 + b.ph))); }
      c.globalAlpha = 1;
    } });
  }
  // a spiral glyph on the floor: dark arms turning, a glowing line in them (Digest's seal, Open Wide's aftermath)
  function gorgemawSpiral(x, y, R, dur, o = {}) {
    V.fx({ dur, delay: o.delay, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.45), cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y, spin = t * (o.spin ?? 2);
      c.save(); c.translate(cx, cy); c.scale(1, 0.65);
      c.globalAlpha = 0.28 * k; c.fillStyle = o.ink || GINK; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
      if (o.veins) { c.strokeStyle = RIM; c.lineWidth = 1.2; c.globalAlpha = 0.35 * k; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a + 0.15) * R * 1.25, Math.sin(a + 0.15) * R * 1.25); } c.stroke(); }
      c.rotate(spin); c.lineCap = 'round';
      for (let arm = 0; arm < (o.arms ?? 1); arm++) {
        c.beginPath(); for (let j = 0; j <= 28; j++) { const q = j / 28, a = arm * Math.PI * 2 / (o.arms ?? 1) + q * Math.PI * 3.2, r = R * 0.9 * q; j ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(0, 0); }
        c.globalAlpha = 0.4 * k; c.strokeStyle = GINK; c.lineWidth = 5; c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (o.glow ?? 0.5) * k; c.strokeStyle = o.color || TGLOW; c.lineWidth = 1.6; c.stroke(); c.globalCompositeOperation = 'source-over';
      }
      c.restore();
    } });
  }

  // ---- Maw of Ruin (the Ultimate). The jaw, the bite and the scorch here; the Morsels themselves are maw-ruin
  ABILITY_VFX.gorgemaw.mawofruin = c => {
    const g = G(), e = c.ent, a = Math.atan2(c.ty - c.y, c.tx - c.x), S = GORGEMAW_ULT_SCALE, R = 80 * S, LAND = 0.48;
    if (c.cam) c.cam.dim(0.42, 1.4);
    if (g) { const q = g.mouth(e); g.chomp(q.x, q.y, q.z, 1.6, TGLOW, 0.42); }
    // wind-up: the jaw unhinges round the Gorgemaw, open on the enemy, the throat glowing, the air torn into it
    V.fx({ dur: LAND + 0.06, layer: 'ground', draw: (ctx, p, t, fx) => {
      const open = 1 - Math.pow(1 - Math.min(1, p / 0.5), 2), shut = p > 0.84 ? (p - 0.84) / 0.16 : 0, k = fx.a * Math.min(1, p / 0.1) * (1 - shut * 0.6);
      const x = e.x - Math.cos(a) * 14 * S, y = e.y - Math.sin(a) * 9 * S, Rj = (44 + 20 * open) * S;
      V.glowAt(ctx, x + Math.cos(a) * 30 * S, y + Math.sin(a) * 20 * S, 60 * S, '#ff3a6a', 0.32 * k);
      V.glowAt(ctx, x, y, Rj * 0.6, '#3a0420', 0.5 * k);   // the dark throat
      // the wind: streaks curving in from in front of it, into the jaw
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 2;
      for (let j = 0; j < 9; j++) { const off = (j - 4) * 0.16, u0 = (t * 2.2 + j * 0.29) % 1; ctx.globalAlpha = Math.min(1, 0.4 * k * Math.sin(u0 * Math.PI)); ctx.beginPath();
        for (let i = 0; i <= 5; i++) { const u = Math.min(1, u0 + i * 0.05), r = (140 * (1 - u) + 30) * S * 0.8, aa = a + off * Math.pow(1 - u, 0.6) * 2.4; const px = x + Math.cos(aa) * r, py = y + Math.sin(aa) * r * 0.7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); }
      ctx.restore();
      gorgemawMaw(ctx, x, y, Rj, a, (0.5 + 1.4 * open) * (1 - shut), k, { teeth: 20, thick: 0.38 });
    } });
    // everything in front of it streams in: rock and torn air
    for (let i = 0; i < 18; i++) { const s = rand(0.3, 1), aa = a + rand(-0.7, 0.7), d = 40 * S + Math.hypot(c.tx - c.x, c.ty - c.y) * s + rand(0, 60 * S), x = c.x + Math.cos(aa) * d, y = c.y + Math.sin(aa) * d * 0.8, rock = i % 3 === 0;
      V.spawn({ x, y, z: rock ? 8 : rand(6, 30), vx: (c.x - x) * 2.2, vy: (c.y - y) * 2.2, vz: 20, life: 0.42, size: rock ? rand(7, 11) : rand(8, 13), size1: rock ? 4 : 2, color: rock ? '#3a2a30' : '#f0dce8', kind: rock ? 'shard' : undefined, add: rock ? false : undefined, stretch: rock ? 0 : 5, vr: rock ? 10 : 0 }); }
    c.later(LAND, () => {
      camHit(c.cam, '#ffc080', 1.1);
      shake(10);
      // the ring of teeth slams shut round the enemy
      V.fx({ dur: 0.5, layer: 'ground', draw: (ctx, p, t, fx) => {
        const q = Math.min(1, p / 0.22), k = fx.a * Math.min(1, (1 - p) / 0.35);
        V.glowAt(ctx, c.tx, c.ty, R * 1.1, '#ff5a3a', 0.35 * k * (1 - p));
        gorgemawMaw(ctx, c.tx, c.ty, R * (1.35 - 0.35 * q), a + Math.PI, 1.6 * (1 - q), k, { teeth: 24, thick: 0.32, bite: 0.8 + 0.4 * q });
      } });
      V.flash(c.tx, c.ty - 20, 46 * S, '#ffe0b0', 0.15);   // the bright core of the bite, brief
      if (g) g.crumbs(c.tx, c.ty, 20 * S, '#c8a070', 14);
      V.spikeburst(c.tx, c.ty, { r: 56 * S, n: 18, color: '#d0306a', core: '#ffe0b0', ink: GINK, dur: 0.3 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: (110 + i * 40) * S, color: i ? TGLOW : '#ffffff', dur: 0.55, w: 8 - i * 3, delay: 0.08 + i * 0.08 });
      V.debris(c.tx, c.ty, { n: 16, color: '#3a2a30', hot: true, speed: 1.5, size: 1.4 });
      gorgemawScorch(c.tx, c.ty, R * 0.9, 4.5, { teeth: 24, delay: 0.3, cracks: 14, ink: 0.42, glow: 0.2, lw: 2 });
      // the warmth spills over the party: a gold ring off the Gorgemaw
      V.shock(e.x, e.y, { r: 170, color: '#ffd27a', dur: 0.7, w: 5, delay: 0.1 });
      V.plus(e.x, e.y, { color: '#ffd8a0', n: 5 });
    });
    c.later(0.7, () => { if (ABILITY_VFX.gorgemaw.wide) ABILITY_VFX.gorgemaw.wide(Object.assign({}, c, { x: e.x, y: e.y })); });
  };
  // the Morsels (d.m: their shapes' first letters): each flies out of the belly into the bite, and after it the spirits
  // fly home round the teeth (the warmth: the heal and the party's shields)
  KIT_VFX['maw-ruin'] = Object.assign((e, target, d) => {
    const letters = String((d && d.m) || '').slice(0, 6), t = target || e, mouth = () => mouthOf(e);
    const S = GORGEMAW_ULT_SCALE, ss = Math.sqrt(S);
    for (let i = 0; i < letters.length; i++) gorgemawSpirit(gorgemawArc(mouth, { x: t.x, y: t.y, z: 16 }, i % 2 ? 0.25 : -0.25, 30 * ss), mcol(LETTER[letters[i]] || 'ring'), 0.3, 0.06 + i * 0.05, ss);
    const home = letters || 'rr';
    for (let i = 0; i < home.length; i++) { const a = Math.random() * Math.PI * 2;
      gorgemawSpirit(gorgemawArc({ x: t.x + Math.cos(a) * 72 * S, y: t.y + Math.sin(a) * 50 * S, z: 10 }, mouth, i % 2 ? 0.3 : -0.3, 50 * ss), letters ? mcol(LETTER[home[i]] || 'ring') : TGLOW, 0.7, 1 + i * 0.08, ss); }
  }, { atTarget: true });

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.gorgemaw, {
    // Gnash: a crescent of jaw and teeth sweeps onto the target and bites, a scorched crescent left a moment
    gnash: c => {
      const g = G(), M = GORGEMAW_MOVE_SCALE, a = Math.atan2(c.ty - c.y, c.tx - c.x), dist = Math.hypot(c.tx - c.x, c.ty - c.y), d = Math.min(dist, 48), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      V.fx({ dur: 0.3, layer: 'air', draw: (ctx, p, t, fx) => {
        const q = Math.min(1, p / 0.4), k = fx.a * Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.4);
        // the swing: pale streaks trailing the jaw's sweep
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 1.8; ctx.globalAlpha = Math.min(1, 0.45 * k * (1 - q * 0.5)); ctx.beginPath();
        for (let j = 0; j < 4; j++) { const r = (22 + j * 7) * M, a1 = a + 0.5 * (1 - q) + 1.2, a2 = a1 + 1.1; ctx.moveTo(x + Math.cos(a1) * r, y - 14 + Math.sin(a1) * r * 0.75); ctx.quadraticCurveTo(x + Math.cos((a1 + a2) / 2) * r * 1.1, y - 14 + Math.sin((a1 + a2) / 2) * r * 0.8, x + Math.cos(a2) * r, y - 14 + Math.sin(a2) * r * 0.75); }
        ctx.stroke(); ctx.restore();
        gorgemawMaw(ctx, x, y, 30 * M * (1.25 - 0.25 * q), a + 0.5 * (1 - q), 3.2 - 0.9 * q, k, { teeth: 11, thick: 0.4, z: 14, flat: 0.75 });
      } });
      c.later(0.1, () => { V.hit(c.tx, c.ty, '#ffe0b0', 0.7); if (g) g.crumbs(c.tx, c.ty, 16 * M, '#c8a070', 5); V.debris(c.tx, c.ty, { n: 3, color: '#3a2a30', speed: 0.6 });
        gorgemawScorch(x, y, 26 * M, 1.3, { teeth: 9, a0: Math.atan2(Math.sin(a) / 0.7, Math.cos(a)) + 1.45, span: Math.PI * 2 - 2.9, glow: 0.18, cracks: 4, lw: 1.8 }); });
    },
    // Open Wide: the jaw opens on the front, a funnel of wind pours into it, a dark spiral is left on the floor
    wide: c => { const e = c.ent, dur = 1.6, M = GORGEMAW_MOVE_SCALE; if (e.st) e.st.jawUntil = FX.now + 1.5;
      V.fx({ dur, layer: 'ground', draw: (ctx, p, t, fx) => {   // the funnel: streaks of air running in along a cone
        const m = mouthOf(e), a = e.angle || 0, k = fx.a * Math.min(1, t / 0.12) * Math.min(1, (1 - p) / 0.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 2;
        for (let j = 0; j < 9; j++) { const off = (j - 4) * 0.16, sw = j % 2 ? 1 : -1;
          for (let s = 0; s < 2; s++) { const u0 = (t * 1.6 + j * 0.37 + s * 0.5) % 1; ctx.globalAlpha = Math.min(1, 0.5 * k * Math.sin(u0 * Math.PI)); ctx.beginPath();
            for (let i = 0; i <= 4; i++) { const u = Math.min(1, u0 + i * 0.04), r = 150 * M * (1 - u) + 10, aa = a + off * Math.pow(1 - u, 0.7) + sw * 0.4 * u; const px = m.x + Math.cos(aa) * r, py = m.y + Math.sin(aa) * r * 0.7; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.stroke(); } }
        ctx.restore();
      } });
      V.fx({ dur, layer: 'air', draw: (ctx, p, t, fx) => {   // the jaw itself, open toward the front
        const m = mouthOf(e), open = Math.min(1, t / 0.12) * (p > 0.85 ? (1 - p) / 0.15 : 1), k = fx.a * Math.min(1, t / 0.08) * (p > 0.85 ? (1 - p) / 0.15 : 1), a = e.angle || 0;
        V.glowAt(ctx, m.x + Math.cos(a) * 10, m.y - m.z + Math.sin(a) * 6, 22 * M, '#ff3a6a', 0.35 * k);
        gorgemawMaw(ctx, m.x - Math.cos(a) * 4, m.y, (16 + 6 * open) * M, a, 0.4 + 1.5 * open, k, { teeth: 12, thick: 0.42, z: m.z, flat: 0.8 });
      }, tick: () => { if (Math.random() < 0.55) { const m = mouthOf(e), a = (e.angle || 0) + rand(-0.7, 0.7), d = rand(70, 140) * M, x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d * 0.7, rock = Math.random() < 0.3;
        V.spawn({ x, y, z: rock ? 6 : rand(10, 34), vx: (m.x - x) * 3.5, vy: (m.y - y) * 3.5, vz: rock ? 30 : 0, life: 0.28, size: rock ? 7 : 7, size1: rock ? 3 : 1, color: rock ? '#3a2a30' : '#ffe8d8', kind: rock ? 'shard' : undefined, add: rock ? false : undefined, stretch: rock ? 0 : 4, vr: rock ? 10 : 0 }); } } });
      V.swirl(e.x, e.y, { r: 44 * M, color: '#ffb070', dur: 0.45, inward: true, follow: e });
      c.later(dur * 0.75, () => { const a = e.angle || 0; gorgemawSpiral(e.x + Math.cos(a) * 44 * M, e.y + Math.sin(a) * 28 * M, 34 * M, 1.8, { arms: 4, color: '#a04a9a', glow: 0.48, spin: -1.5 }); });
    },
  });

  // Spit: the Morsel goes back out in its shape (d: { m: shape, f: fused, n: order in a Regurgitate volley }). A Ring is a
  // green slime glob with the Morsel glowing in it, splashing into puddles; a Lance a straight bolt, a Fang a cone of
  // teeth (slime spattered where it bites), a Spike a great yellow spike
  KIT_VFX.spit = Object.assign((e, target, d) => {
    const g = G(); if (!g) return;
    const m = (d && d.m) || 'ring', f = d && d.f, s = (f ? 1.7 : 1) * GORGEMAW_MOVE_SCALE, col = g.MCOL(m), t = target || { x: e.x + Math.cos(e.angle || 0) * 200, y: e.y + Math.sin(e.angle || 0) * 200 };
    const go = () => {
      const q = g.mouth(e);
      g.chomp(q.x, q.y, q.z, 0.8 * s, col, 0.2);
      for (let i = 0; i < 3; i++) V.spawn({ x: q.x + rand(-6, 6), y: q.y, z: q.z, vx: rand(-20, 20), vz: rand(-20, 30), g: 400, life: 0.45, size: rand(4, 6), color: SLIME, kind: 'drop', add: false });   // drool
      if (m === 'ring') gorgemawGlob(q, t, col, 1.2 * s, (x, y) => { for (let i = 0; i < (f ? 3 : 2); i++) V.shock(x, y, { r: (60 + i * 30) * s, color: col, dur: 0.45, w: 6, delay: i * 0.08 });
        V.spikeburst(x, y, { r: 38 * s, n: 14, color: SLIME, core: '#f0ffb0', ink: '#14300a', dur: 0.3 }); V.splash(x, y, { n: 10, color: SLIME }); V.flash(x, y - 12, 26 * s, '#f0ffb0', 0.14); gorgemawPuddles(x, y, col, s * 1.35, 2.4); shake(2 * s); });
      else if (m === 'lance') V.missile(q.x, q.y, t.x, t.y, { style: 'blade', color: col, speed: 1500, size: 1.4 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 36 * s, n: 10, color: col, core: '#ffffff', ink: '#0a2030', dur: 0.3 }); V.beam(q.x, q.y, x, y, { color: col, w: 6 * s, dur: 0.25 }); shake(2 * s); } });
      else if (m === 'fang') { V.breath(q.x, q.y, Math.atan2(t.y - q.y, t.x - q.x), { len: Math.min(220, Math.hypot(t.x - q.x, t.y - q.y) + 20) * s, span: 0.6 * s, color: col });
        FX.later(0.15, () => { g.chomp(t.x, t.y, 20, 1.2 * s, col, 0.3); V.splash(t.x, t.y, { n: 6, color: SLIME }); gorgemawPuddles((q.x + t.x) / 2, (q.y + t.y) / 2, col, 0.7 * s, 1.6); }); }
      else V.missile(q.x, q.y, t.x, t.y, { style: 'meteor', color: col, speed: 900, arc: 30, size: 1.2 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 64 * s, n: 16, color: '#ffd23a', core: '#fffbe0', ink: '#3a2a08', dur: 0.4 }); V.crystals(x, y, { color: col, n: 6, r: 40 * s, h: 60 * s, dur: 0.9 }); V.shock(x, y, { r: 120 * s, color: col, dur: 0.5, w: 7 }); shake(5 * s); } });
      if (f) FX.later(0.3, () => FX.text(t.x, t.y - 80, MAW.FUSION[m], '#fff0c8', 15, 0.9));
    };
    const n = (d && d.n) || 0; if (n) FX.later(n * 0.14, go); else go();
  }, { atTarget: true });
  // Digest (d: { n eaten, m: their shapes' first letters }): the Morsels spiral into the belly, a spiral seal glows under it
  KIT_VFX.digest = (e, target, d) => {
    const n = Math.min(6, (d && d.n) || 0), letters = String((d && d.m) || ''), M = GORGEMAW_MOVE_SCALE;
    V.swirl(e.x, e.y, { r: 46 * M, color: '#ffc070', dur: 0.6, inward: true, follow: e });
    V.fx({ dur: 0.6, layer: 'ground', follow: e, draw: (ctx, p, t, fx) => {   // the eddy: pale streaks spiralling in round the belly
      const kk = fx.a * Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0dce8'; ctx.lineWidth = 1.8; ctx.globalAlpha = Math.min(1, 0.35 * kk); ctx.beginPath();
      for (let j = 0; j < 5; j++) { const b = j * Math.PI * 2 / 5 + t * 5; for (let i = 0; i <= 8; i++) { const q = i / 8, aa = b + q * 1.6, r = (90 - 50 * q) * M; const px = e.x + Math.cos(aa) * r, py = e.y + Math.sin(aa) * r * 0.6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
      ctx.stroke(); ctx.restore();
    } });
    for (let i = 0; i < n; i++) { const a0 = i * Math.PI * 2 / Math.max(1, n), col = mcol(LETTER[letters[i]] || 'ring');
      gorgemawSpirit(p => { const a = a0 + p * 4.5, r = 80 * M * (1 - p) + 4; return { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6, z: 22 + 10 * (1 - p) }; }, col, 0.6, i * 0.06, 1.15); }
    gorgemawSpiral(e.x, e.y, 40 * M, 1.7, { follow: e, veins: true, ink: '#3a0a34', delay: 0.45, spin: 2.5, glow: 0.62 });
    FX.later(0.5, () => { V.plus(e.x, e.y, { color: '#ffd8a0', n: 3 + n }); if (e.spec === 'gizzard' && n) V.shock(e.x, e.y, { r: 160, color: '#ffc070', dur: 0.6, w: 5 }); });
  };
})();

// ======================================================================= VFX PASS · OATHBROKER (docs/art/vfx-reference/oathbroker.png)
// Lilac light, gold coins, parchment pages, a dark red wax seal bearing the scales. Final Reckoning: a clock dial with a
// vortex of pages round the knight, a great wax-seal stamp let down on a golden chain slams onto the enemy, and a big
// seal is left on the floor with coins and pages scattered round it. Collect: coins arcing back. Lien: golden chains
// wrap the target round a seal. Settle: a stamp comes down, coins fly. Writ: a glowing contract is written out on the
// floor. Co-Sign: two seals linked by a line. The wax on the floor is kept dark and faint (red telegraphs must read).
(() => {
  const V = VFX, rand = (a, b) => a + Math.random() * (b - a), shake = s => { FX.shake = Math.max(FX.shake, s); };
  const O = () => globalThis.OATHBROKER_VFX;
  const LIL = '#b8a8e0', GOLD = '#ffd27a', GOLD2 = '#d8a038', WAX = '#7a1a2a', WAXL = '#c0485a', WAXD = '#3e0a14', PAPER = '#efe4cc', INK = '#2a2034';
  const camHit = (cam, col, s = 1) => { if (cam) { cam.stop(0.08 + 0.03 * s); cam.punch(0.05 + 0.025 * s, 0.55); cam.flash(col, 0.18 + 0.06 * s, 0.35); } };
  // the size knobs: Final Reckoning's footprint (the clock, the stamp, the seal left), and the supporting moves'
  const OATHBROKER_ULT_SCALE = 1.8, OATHBROKER_MOVE_SCALE = 1.3;

  // ---- primitives
  // the scales (a sword for the post): traced at the origin, s per unit
  function oathScales(c, s) {
    c.moveTo(0, -10 * s); c.lineTo(0, 9 * s); c.moveTo(-4 * s, 9 * s); c.lineTo(4 * s, 9 * s); c.moveTo(-3 * s, -6.5 * s); c.lineTo(3 * s, -6.5 * s);
    c.moveTo(-9 * s, -3 * s); c.lineTo(9 * s, -3 * s);
    for (const d of [-1, 1]) { c.moveTo(d * 9 * s, -3 * s); c.lineTo(d * 5.5 * s, 3 * s); c.moveTo(d * 9 * s, -3 * s); c.lineTo(d * 12.5 * s, 3 * s); c.moveTo(d * 5 * s, 3 * s); c.quadraticCurveTo(d * 9 * s, 7.5 * s, d * 13 * s, 3 * s); }
  }
  // gold coins: flipping discs thrown from (x, y) (vx, vy: a push toward somewhere; else all round)
  function oathCoins(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 200) * (o.speed ?? 1);
      V.spawn({ x: x + rand(-6, 6), y, z: o.z ?? 20, vx: (o.vx ?? 0) * rand(0.8, 1.2) + Math.cos(a) * sp * (o.vx != null ? 0.3 : 1), vy: (o.vy ?? 0) * rand(0.8, 1.2) + Math.sin(a) * sp * 0.6 * (o.vx != null ? 0.3 : 1), vz: rand(140, 260), g: 600, bounce: true,
        life: rand(0.7, 1.1) * (o.life ?? 1), size: rand(7, 9) * (o.size ?? 1), color: i % 3 ? GOLD : '#fff2c0', kind: 'petal', add: false, vr: rand(-4, 4), flutter: 11 }); }
  }
  // a chain of gold links from (x1, y1) to (x2, y2): flat links and edge-on links in turn, a faint glow along it
  function oathChain(c, x1, y1, x2, y2, k, L = 9) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.min(48, Math.floor(d / L)), a = Math.atan2(y2 - y1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a);
    if (n < 1 || k <= 0.01) return;
    c.save(); c.lineCap = 'round';
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.22 * k); c.strokeStyle = GOLD; c.lineWidth = 8; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, k);
    c.beginPath(); for (let i = 0; i < n; i += 2) { const cx = x1 + ca * (i + 0.5) * L, cy = y1 + sa * (i + 0.5) * L; c.moveTo(cx + ca * L * 0.62, cy + sa * L * 0.62); c.ellipse(cx, cy, L * 0.62, L * 0.32, a, 0, Math.PI * 2); }
    c.strokeStyle = GOLD2; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); for (let i = 1; i < n; i += 2) { const cx = x1 + ca * (i + 0.5) * L, cy = y1 + sa * (i + 0.5) * L; c.moveTo(cx - ca * L * 0.6, cy - sa * L * 0.6); c.lineTo(cx + ca * L * 0.6, cy + sa * L * 0.6); }
    c.lineWidth = 3; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.6 * k); c.strokeStyle = '#fff2c0'; c.lineWidth = 1; c.stroke();
    c.restore();
  }
  // a loop of chain round (x, y - z): rx by ry, its back half dimmer (behind the target)
  function oathChainLoop(c, x, y, rx, ry, k, rot = 0) {
    const n = 18; c.save(); c.lineCap = 'round';
    for (const back of [true, false]) {
      c.beginPath();
      for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2, s = Math.sin(a); if ((s < 0) !== back) continue;
        const px = x + Math.cos(a) * rx, py = y + s * ry, ta = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
        if (i % 2) { c.moveTo(px + Math.cos(ta) * 5, py + Math.sin(ta) * 5); c.ellipse(px, py, 5, 2.6, ta, 0, Math.PI * 2); } else { c.moveTo(px - Math.cos(ta) * 5, py - Math.sin(ta) * 5); c.lineTo(px + Math.cos(ta) * 5, py + Math.sin(ta) * 5); } }
      c.globalAlpha = Math.min(1, k * (back ? 0.45 : 1)); c.strokeStyle = GOLD2; c.lineWidth = 2.2; c.stroke();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k * (back ? 0.3 : 0.7)); c.strokeStyle = '#fff2c0'; c.lineWidth = 0.9; c.stroke(); c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }
  // a wax seal on the floor: a lumpy dark-red round with drips, a raised rim, the scales pressed in it, gold while it's
  // hot; o.coins / o.pages scatter a few round it. o.a: how strong (kept low: red marks must not read as telegraphs)
  function oathWaxSeal(x, y, R, o = {}) {
    const dur = o.dur ?? 3, A = o.a ?? 0.45, nb = 22, bumps = Array.from({ length: nb }, () => rand(0.94, 1.1));
    const drips = Array.from({ length: 5 }, () => ({ a: rand(0, Math.PI * 2), L: rand(0.1, 0.22) }));
    const litter = Array.from({ length: (o.coins || 0) + (o.pages || 0) }, (_, i) => { const a = rand(0, Math.PI * 2), d = R * rand(0.95, 1.5); return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: rand(0, 3), coin: i < (o.coins || 0) }; });
    // o.fill: the wax body's share of the strength (the rims, the scales and the litter keep all of it); o.gold: the
    // gold of the rim and scales stays this strong after the heat has gone (the mark reads by its outline, not its red)
    const ls = Math.max(1, R / 60);
    V.fx({ dur, delay: o.delay, layer: 'ground', follow: o.follow, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.03) * Math.min(1, (1 - p) / 0.35) * A, sq = t < 0.1 ? 1.2 - t * 2 : 1, heat = Math.max(0, 1 - t / 0.9), cx = e.follow ? e.follow.x : x, cy = e.follow ? e.follow.y : y;
      c.save(); c.translate(cx, cy); c.scale(sq, sq * 0.7);
      for (const l of litter) { c.save(); c.translate(l.x, l.y); c.rotate(l.r); c.scale(ls, ls);
        if (l.coin) { c.globalAlpha = Math.min(1, k * 1.6); c.fillStyle = GOLD2; c.beginPath(); c.ellipse(0, 0, 4.5, 3.2, 0, 0, Math.PI * 2); c.fill(); }
        else { c.globalAlpha = Math.min(1, k * 1.1); c.fillStyle = PAPER; c.fillRect(-7, -5, 14, 10); c.fillStyle = INK; c.globalAlpha *= 0.5; c.fillRect(-5, -2, 9, 1); c.fillRect(-5, 1, 7, 1); }
        c.restore(); }
      c.globalAlpha = Math.min(1, k * (o.fill ?? 1)); c.fillStyle = WAX; c.beginPath();
      for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2, r = R * bumps[i]; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); for (const d of drips) { const dx = Math.cos(d.a) * R * (1 + d.L * 0.5), dy = Math.sin(d.a) * R * (1 + d.L * 0.5); c.moveTo(dx + R * d.L * 0.5, dy); c.arc(dx, dy, R * d.L * 0.5, 0, Math.PI * 2); } c.fill();
      c.globalAlpha = Math.min(1, k); c.lineWidth = Math.max(1.5, R * 0.06); c.strokeStyle = WAXD; c.beginPath(); c.arc(0, 0, R * 0.78, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = WAXL; c.beginPath(); c.arc(0, 0, R * 0.66, 0, Math.PI * 2); c.stroke();
      c.lineWidth = Math.max(1.2, R * 0.04); c.strokeStyle = WAXD; c.beginPath(); oathScales(c, R / 24); c.stroke();
      const gk = Math.max(heat * 1.4, o.gold ?? 0);
      if (gk > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k * gk); c.strokeStyle = GOLD; c.lineWidth = Math.max(1.4, R * 0.018); c.beginPath(); c.arc(0, 0, R * 0.78, 0, Math.PI * 2); oathScales(c, R / 24); c.stroke();
        if (o.gold) { c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R * 1.04, 0, Math.PI * 2); c.stroke(); } }
      c.restore();
    } });
  }
  // the stamp: a red-handled seal with a gold face let down onto (x, y) (on a gold chain from `from`, if given),
  // slamming at `fall` seconds, then lifting off and fading
  function oathStamp(x, y, R, o = {}) {
    const fall = o.fall ?? 0.3, dur = fall + (o.hold ?? 0.25), H = o.h ?? 220, from = o.from;
    V.fx({ dur, delay: o.delay, layer: 'air', draw: (c, p, t, e) => {
      const q = Math.min(1, t / fall), after = Math.max(0, t - fall), z = H * (1 - q * q) + after * 60, k = e.a * Math.min(1, t / 0.08) * (after > 0 ? 1 - after / (dur - fall) : 1), sy = y - z;
      c.save(); c.globalAlpha = Math.min(1, 0.35 * k * q); c.fillStyle = '#000000'; c.beginPath(); c.ellipse(x, y, R * (0.5 + 0.5 * q), R * 0.35 * (0.5 + 0.5 * q), 0, 0, Math.PI * 2); c.fill(); c.restore();   // its shadow
      if (from) oathChain(c, from.x, from.y - 24, x, sy - R * 1.9, k * Math.min(1, t / 0.15), o.link ?? 9);
      c.save(); c.globalAlpha = Math.min(1, k);
      const hw = R * 0.3, g = c.createLinearGradient(x - hw, 0, x + hw, 0); g.addColorStop(0, WAXD); g.addColorStop(0.4, WAXL); g.addColorStop(1, WAXD);
      c.fillStyle = g; c.fillRect(x - hw, sy - R * 1.85, hw * 2, R * 1.5);   // the handle
      c.beginPath(); c.ellipse(x, sy - R * 1.85, hw * 1.25, hw * 0.55, 0, 0, Math.PI * 2); c.fill();   // its knob
      c.fillStyle = GOLD2; c.beginPath(); c.ellipse(x, sy - R * 0.32, hw * 1.5, hw * 0.5, 0, 0, Math.PI * 2); c.fill();   // the collar
      c.fillStyle = '#6a4410'; c.beginPath(); c.ellipse(x, sy + 4, R, R * 0.4, 0, 0, Math.PI * 2); c.fill();   // the face's edge
      c.fillStyle = GOLD; c.beginPath(); c.ellipse(x, sy, R, R * 0.4, 0, 0, Math.PI * 2); c.fill();   // the gold face
      c.strokeStyle = '#6a4410'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, sy, R * 0.72, R * 0.29, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
      if (q >= 1 && after < 0.12) V.glowAt(c, x, y, R * 1.6, GOLD, k * (1 - after / 0.12));
    } });
  }
  // a parchment of light lying on the floor, written out line by line, a little seal in its corner
  function oathParchment(x, y, ang, w, h, dur, s = 1) {
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) / 0.4), write = Math.min(1, t / 0.55);
      V.glowAt(c, x, y, w * 0.7 * s, LIL, 0.25 * k);
      c.save(); c.translate(x, y); c.scale(s, 0.7 * s); c.rotate(ang);
      c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.quadraticCurveTo(w / 2 + 6, 0, w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.quadraticCurveTo(-w / 2 - 6, 0, -w / 2, -h / 2); c.closePath();
      c.globalAlpha = Math.min(1, 0.45 * k); c.fillStyle = PAPER; c.fill();
      V.neonPath(c, LIL, 1.4, k * 0.8, () => { c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.quadraticCurveTo(w / 2 + 6, 0, w / 2, h / 2); c.lineTo(-w / 2, h / 2); c.quadraticCurveTo(-w / 2 - 6, 0, -w / 2, -h / 2); });
      c.globalAlpha = Math.min(1, 0.7 * k); c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath();
      for (let i = 0; i < 4; i++) { const q = Math.min(1, Math.max(0, write * 4 - i)), x0 = -w / 2 + 6, L = (w * (i === 3 ? 0.4 : 0.62)) * q, yy = -h / 2 + 8 + i * 7;
        for (let s = 0; s <= 10; s++) { const xx = x0 + L * s / 10; s ? c.lineTo(xx, yy + Math.sin(s * 2.1 + i) * 1.4) : c.moveTo(xx, yy); } }
      c.stroke();
      if (write >= 1) V.neonPath(c, LIL, 1.2, k, () => { c.moveTo(w / 2 - 4, h / 2 - 11); c.arc(w / 2 - 12, h / 2 - 11, 8, 0, Math.PI * 2); oathScalesAt(c, w / 2 - 12, h / 2 - 11, 0.35); });
      c.restore();
    } });
  }
  const oathScalesAt = (c, x, y, s) => { c.save(); c.translate(x, y); oathScales(c, s); c.restore(); };
  // the dial of a clock on the floor round `ent`: Roman ticks, its hands spinning back, pages whirled round it
  function oathClock(ent, R0, dur, nPages = 10) {
    const u = Math.max(1, R0 / 72), NUM = ['XII', 'III', 'VI', 'IX'];
    V.fx({ dur, layer: 'ground', follow: ent, draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.1) * Math.min(1, (1 - p) / 0.3), x = ent.x, y = ent.y, F = 0.62, R = R0 * (0.7 + 0.3 * (1 - Math.pow(1 - Math.min(1, t / 0.22), 2)));
      V.glowAt(c, x, y, R * 1.1, '#8a5ad8', 0.38 * k);
      V.neonRing(c, x, y, R, '#9a6ad8', 2.6 * Math.sqrt(u), k, F); V.neonRing(c, x, y, R * 1.08, LIL, 1.2, k * 0.5, F); V.neonRing(c, x, y, R * 0.8, LIL, 1.2, k * 0.6, F);
      V.neonPath(c, LIL, 1.3, k * 0.85, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, m = i % 3 === 0 ? 3 : 1, ca = Math.cos(a), sa = Math.sin(a);
        if (i % 3 === 0) continue;   // (the quarters carry numerals)
        for (let j = 0; j < m; j++) { const off = (j - (m - 1) / 2) * 3.2 * u, px = x + ca * R * 0.9 - sa * off, py = y + (sa * R * 0.9 + ca * off) * F; c.moveTo(px - ca * 4 * u, py - sa * 4 * u * F); c.lineTo(px + ca * 4 * u, py + sa * 4 * u * F); } } });
      // the Roman numerals at the quarters, laid flat on the floor
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.85 * k); c.fillStyle = '#e6dcff'; c.font = 'bold ' + Math.round(10 * u) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + i * Math.PI / 2, px = x + Math.cos(a) * R * 0.9, py = y + Math.sin(a) * R * 0.9 * F; c.save(); c.translate(px, py); c.scale(1, F); c.fillText(NUM[i], 0, 0); c.restore(); }
      c.restore();
      V.neonPath(c, '#efe4ff', 2.6 * Math.sqrt(u), k, () => { const a1 = -t * 14, a2 = -t * 3.5; c.moveTo(x, y); c.lineTo(x + Math.cos(a1) * R * 0.7, y + Math.sin(a1) * R * 0.7 * F); c.moveTo(x, y); c.lineTo(x + Math.cos(a2) * R * 0.45, y + Math.sin(a2) * R * 0.45 * F); });
    } });
    for (let i = 0; i < nPages; i++) { const a = Math.random() * Math.PI * 2, r = R0 * rand(0.8, 1.3);
      V.spawn({ x: ent.x, y: ent.y, z: rand(10, 50 * u), life: dur * rand(0.8, 1.1), size: rand(13, 17) * Math.sqrt(u), color: i % 3 ? PAPER : '#e6dcff', kind: 'petal', add: false, flutter: 6, vr: rand(-5, 5), orbit: { x: ent.x, y: ent.y, a, r, w: -rand(5, 8), dr: -r * 0.6 / dur, flat: 0.6, follow: ent } }); }
  }

  // ---- Final Reckoning (the Ultimate). The clock, the chain, the stamp and the seal here; oath-reckoning is the
  // settled account going out to the party as shields
  ABILITY_VFX.oathbroker.reckoning = c => {
    const e = c.ent, S = OATHBROKER_ULT_SCALE, R = 44 * S * 0.8, LAND = 0.5;
    if (c.cam) c.cam.dim(0.4, 1.4);
    oathClock(e, 72 * S * 0.85, LAND + 0.15, 20);
    oathStamp(c.tx, c.ty, R, { fall: LAND, hold: 0.32, h: 210 * S * 0.8, from: e, link: 12 });
    c.later(LAND, () => {
      const g = O();
      camHit(c.cam, '#ffd27a', 1.1);
      shake(9);
      V.flash(c.tx, c.ty - 20, 60 * S, '#fff6e0', 0.16);   // the white-hot core of the stamp's blow, brief
      V.spikeburst(c.tx, c.ty, { r: 96 * S * 0.85, n: 20, color: WAXL, core: '#fff0d0', ink: INK, dur: 0.4 });
      for (let i = 0; i < 2; i++) V.shock(c.tx, c.ty, { r: (120 + i * 45) * S, color: i ? GOLD : '#ffffff', dur: 0.6, w: 8 - i * 3, delay: i * 0.08 });
      oathCoins(c.tx, c.ty, 18, { speed: 1.2 * S, size: 1.3 });
      if (g) g.pages(c.tx, c.ty, 16);
      V.debris(c.tx, c.ty, { n: 12, color: '#4a4050', speed: 1.4, size: 1.3 });
      // the seal left: its wax kept faint, its gold rim and scales carrying it (red marks must not read as telegraphs)
      oathWaxSeal(c.tx, c.ty, 84 * S * 0.8, { dur: 4.5, a: 0.5, fill: 0.42, gold: 0.7, coins: 12, pages: 8 });
    });
  };
  KIT_VFX['oath-reckoning'] = (e) => {
    const g = O();
    FX.later(0.5, () => {
      oathWaxSeal(e.x, e.y, 30, { dur: 1.8, a: 0.4, coins: 4 });
      V.shock(e.x, e.y, { r: 170, color: GOLD, dur: 0.7, w: 6 });
      oathCoins(e.x, e.y, 8);
      if (g) g.pages(e.x, e.y, 8, '#ffe6a0');
    });
  };

  // ---- the moves on the sheet
  Object.assign(ABILITY_VFX.oathbroker, {
    // Dun, Levy, Collect: the mace sweeps, coins arc back off the target to the knight; the third stamps a seal
    collect: c => { const g = O(), third = c.ent.st && c.ent.st.combo === 2, M = OATHBROKER_MOVE_SCALE;
      V.slash(c.x, c.y, c.ang, { r: 56 * M, span: 1.6, color: '#e8d8b0', w: 0.45, dur: 0.24, flip: Math.random() < 0.5 });
      c.later(0.09, () => {
        if (g) g.stamp(c.tx, c.ty, third ? WAXL : LIL, third);
        V.glint(c.tx, c.ty, { color: GOLD, size: (third ? 30 : 20) * M });
        oathCoins(c.tx, c.ty, third ? 7 : 3, { vx: (c.x - c.tx) * 1.4, vy: (c.y - c.ty) * 1.4, life: 0.7, size: 1.2 });
        // the debt drawn home: a lilac ribbon curling from the target back to the knight
        const bend = Math.random() < 0.5 ? 1 : -1;
        V.fx({ dur: 0.32, layer: 'air', draw: (ctx, p, t, fx) => { const q = Math.min(1, p / 0.5), k = fx.a * Math.min(1, (1 - p) / 0.4), nx = -(c.ty - c.y), ny = c.tx - c.x;
          V.neonPath(ctx, third ? GOLD : LIL, 2, k * 0.75, () => { for (let i = 0; i <= 14; i++) { const s = i / 14 * q, x = c.tx + (c.x - c.tx) * s + nx * 0.35 * bend * Math.sin(s * Math.PI), y = c.ty - 22 + (c.y - c.ty) * s + ny * 0.35 * bend * Math.sin(s * Math.PI) * 0.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); } });
      }); },
    // Settle: coins whirl in a lilac eddy, the stamp comes down beside the knight, a seal with coins and pages is left
    settle: c => { const g = O(), M = OATHBROKER_MOVE_SCALE, x = c.x + Math.cos(c.ang) * 34 * M, y = c.y + Math.sin(c.ang) * 22 * M;
      V.swirl(x, y, { r: 46 * M, color: LIL, dur: 0.32, inward: true });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; V.spawn({ x, y, z: 26, life: 0.32, size: 9, color: GOLD, kind: 'petal', add: false, flutter: 11, orbit: { x, y, a, r: 44 * M, w: 9, dr: -100 * M, flat: 0.6 } }); }
      oathStamp(x, y, 24 * M, { fall: 0.28, hold: 0.2, h: 140 * M });
      c.later(0.28, () => {
        V.spikeburst(x, y, { r: 44 * M, n: 14, color: WAXL, core: '#fff0d0', ink: INK, dur: 0.3 });
        V.shock(x, y, { r: 90 * M, color: GOLD, dur: 0.4, w: 5 });
        oathCoins(x, y, 10, { size: 1.15 }); if (g) g.pages(x, y, 6);
        oathWaxSeal(x, y, 30 * M, { dur: 2.6, a: 0.5, fill: 0.7, gold: 0.6, coins: 5, pages: 3 });
        shake(2);
      }); },
    // Lien: a golden chain is thrown to the boss and wraps it round a seal; a ring of runes is left under it
    lien: c => { const g = O(), tx = c.tx, ty = c.ty, M = OATHBROKER_MOVE_SCALE;
      if (g) g.pages(c.x, c.y, 5);
      V.fx({ dur: 0.22, layer: 'air', draw: (ctx, p, t, fx) => { const x = c.x + (tx - c.x) * p, y = c.y - 24 + (ty - 30 - c.y + 24) * p; oathChain(ctx, c.x, c.y - 24, x, y, fx.a, 11); V.glowAt(ctx, x, y, 18 * M, GOLD, fx.a); } });
      c.later(0.2, () => {
        V.fx({ dur: 1.4, layer: 'air', draw: (ctx, p, t, fx) => {
          const q = Math.min(1, p / 0.15), k = fx.a * Math.min(1, (1 - p) / 0.35), r = (48 - 14 * q) * M;
          for (let i = 0; i < 3; i++) oathChainLoop(ctx, tx, ty - 16 - i * 20 * M, r * (1 - i * 0.08), r * 0.36, k, t * (i % 2 ? 1.5 : -1.5) + i);
          ctx.save(); ctx.translate(tx, ty - 36 * M); ctx.globalAlpha = Math.min(1, k * 0.9); ctx.fillStyle = WAXL; ctx.beginPath(); ctx.arc(0, 0, 10 * M, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); oathScales(ctx, 0.5 * M); ctx.stroke(); ctx.restore();
        } });
        V.spikeburst(tx, ty - 30, { r: 34 * M, n: 12, color: GOLD, core: '#fff6d0', ink: INK, dur: 0.26 });
        oathCoins(tx, ty, 3);
        V.fx({ dur: 1.8, layer: 'ground', draw: (ctx, p, t, fx) => {   // a faint ring of runes under it, the seal's mark
          const k = fx.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.4) * 0.65, R = 50 * M;
          V.neonRing(ctx, tx, ty, R, WAXL, 1.8, k, 0.62); V.neonRing(ctx, tx, ty, R * 0.8, WAXL, 1, k * 0.7, 0.62); V.neonRing(ctx, tx, ty, R * 1.12, GOLD, 1, k * 0.5, 0.62);
          V.neonPath(ctx, WAXL, 1.1, k * 0.85, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.6, x = tx + Math.cos(a) * R * 0.9, y = ty + Math.sin(a) * R * 0.9 * 0.62; ctx.moveTo(x - 3, y + 2.4); ctx.lineTo(x, y - 3); ctx.lineTo(x + 3, y + 2.4); } });
        } });
      }); },
    // Co-Sign: a ribbon of lilac ink runs to the ally, a seal under each of you, linked by a gold line a moment
    cosign: c => { const w = c.tent || c.ent, e = c.ent, M = OATHBROKER_MOVE_SCALE, Rs = 22 * M;
      V.fx({ dur: 0.3, layer: 'air', draw: (ctx, p, t, fx) => { const q = Math.min(1, p / 0.7), kk = fx.a * Math.min(1, (1 - p) / 0.3);
        for (const [col, wd, ph] of [[LIL, 2.6, 0], ['#efe4ff', 1.4, 1.3]]) V.neonPath(ctx, col, wd, kk * (ph ? 0.6 : 1), () => { for (let i = 0; i <= 16; i++) { const s = i / 16 * q, x = e.x + (w.x - e.x) * s, y = e.y - 20 + (w.y - e.y) * s + Math.sin(s * Math.PI * 3 + t * 20 + ph) * 9 * M * Math.sin(s * Math.PI); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); } });
      c.later(0.22, () => {
        V.fx({ dur: 1.6, layer: 'ground', draw: (ctx, p, t, fx) => { const k = fx.a * Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.45);
          V.neonRing(ctx, e.x, e.y, Rs, LIL, 1.8, k * 0.85, 0.62); V.neonRing(ctx, w.x, w.y, Rs, WAXL, 1.8, k * 0.85, 0.62);
          V.neonRing(ctx, e.x, e.y, Rs * 0.75, LIL, 1, k * 0.5, 0.62); V.neonRing(ctx, w.x, w.y, Rs * 0.75, GOLD, 1, k * 0.5, 0.62);
          V.neonPath(ctx, GOLD, 1.5, k * 0.75, () => { const a = Math.atan2(w.y - e.y, w.x - e.x); ctx.moveTo(e.x + Math.cos(a) * Rs, e.y + Math.sin(a) * Rs * 0.62); ctx.lineTo(w.x - Math.cos(a) * Rs, w.y - Math.sin(a) * Rs * 0.62); oathScalesAt(ctx, w.x, w.y, 0.6 * M); oathScalesAt(ctx, e.x, e.y, 0.6 * M); });
        } });
        V.shield(w, { color: LIL, dur: 1.2, r: 36 });
      }); },
    // Writ of Protection: a lilac scribble runs from the knight's hand to the floor, where a contract writes itself out
    writ: c => { const g = O(), M = OATHBROKER_MOVE_SCALE, a = (c.ang || 0) - 1.1, x = c.x + Math.cos(a) * 58 * M, y = c.y + Math.sin(a) * 40 * M;
      V.shield(c.ent, { shape: 'front', color: PAPER, dur: 2, r: 44 });
      V.lightning(c.x + Math.cos(a) * 14, c.y - 20, x, y, { color: LIL, jag: 8 });
      V.glint(x, y, { color: LIL, size: 26 });
      oathParchment(x, y, a * 0.3, 64, 42, 2.1, M);
      if (g) g.pages(c.x, c.y, 4);
    },
  });
})();

// ======================================================================= ULTIMATES · healers (kits.js HEALER ULTIMATES)
// Cleric · Dawn Breaks, Grovekeeper · World Tree, Chronomancer · Time Reversal, Alembist · Magnum Opus, Threadweaver ·
// Grand Loom. Each: a 0.4s wind-up on the caster, ONE impact at HEAL_ULT_LAND (the hit-stop, the camera push and the
// flash: your own hero only, c.cam), a mark on the floor that lingers as long as the moment does, and a KIT_VFX
// moment (atTarget) for the blow on the boss, sent by the kit as it lands (k.fx). Everyone else's plays at 0.6.
// The primitives here are local to this block and prefixed with their class.
(() => {
  const V = VFX, TAU = Math.PI * 2, shake = s => { FX.shake = Math.max(FX.shake, s); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const LAND = 0.4;
  const impact = (cam, col, a = 0.2, stop = 0.08) => { if (cam) { cam.stop(stop); cam.punch(0.06, 0.5); cam.flash(col, a, 0.32); } };

  // ---------------------------------------------------------------- Cleric · Dawn Breaks (gold and white, the sun)
  const SUN = '#ffd65a', DAWN = '#ffe9a8', PETAL = '#ffd0e0';
  // a sun climbing over the cleric: a white core, slow-turning rays, a wide halo
  function clericSunrise(x, y, o = {}) {
    const dur = o.dur ?? 1.1, H = o.h ?? 150;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const rise = 1 - Math.pow(1 - Math.min(1, p / 0.38), 3), k = e.a * Math.min(1, (1 - p) / 0.4), sy = y - 40 - H * rise, R = 22 + 18 * rise;
      V.glowAt(c, x, sy, R * 3.4, SUN, 0.45 * k);
      c.save(); c.translate(x, sy); c.rotate(t * 0.7); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, L = R * (i % 2 ? 1.8 : 2.6);
        c.globalAlpha = 0.5 * k; c.fillStyle = DAWN; c.beginPath();
        c.moveTo(Math.cos(a - 0.1) * R, Math.sin(a - 0.1) * R); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + 0.1) * R, Math.sin(a + 0.1) * R); c.closePath(); c.fill();
      }
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, sy, R, '#fff6d8', k); V.glowAt(c, x, sy, R * 0.5, '#ffffff', k);
    } });
  }
  const clericPetals = (x, y, n, sp) => { for (let i = 0; i < n; i++) { const a = i * TAU / n + rand(-0.2, 0.2), s = rand(0.6, 1) * sp; V.spawn({ x, y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(80, 200), g: 150, drag: 0.04, life: rand(1.2, 1.8), size: rand(10, 14), color: i % 3 ? PETAL : DAWN, kind: 'petal', add: false, vr: rand(-6, 6), flutter: 6, fadeIn: 0.02 }); } };
  // a sun rises over the cleric, then a great pillar of dawn falls on the party: a five-point star on the floor for the
  // 12s of regen, petals thrown wide. The smite on the boss is KIT_VFX['cleric-dawn'].
  ABILITY_VFX.cleric.dawnbreaks = c => {
    const at = { x: c.x, y: c.y };
    if (c.cam) c.cam.dim(0.3, 1.4);
    V.charge(c.x, c.y, { color: DAWN, r: 80, n: 14, dur: LAND, follow: c.ent });
    clericSunrise(c.x, c.y, { dur: 1.2 });
    V.glint(c.x, c.y - 50, { color: '#ffffff', size: 34, z: 40 });
    c.later(LAND, () => {
      impact(c.cam, '#fff2c8', 0.24);
      shake(6);
      V.lightfall(at.x, at.y, { color: DAWN, r: 70, h: 420, dur: 1.1, feathers: 10 });
      V.pillar(at.x, at.y, { r: 60, h: 380, color: '#fff6c8', dur: 1 });
      for (let i = 0; i < 3; i++) V.shock(at.x, at.y, { r: 170 + i * 50, color: i ? DAWN : '#ffffff', dur: 0.6 + i * 0.1, w: 8 - i * 2, delay: i * 0.08 });
      V.ink(at.x, at.y, { r: 170, dur: 12, a: 0.22 });
      V.sigil(at.x, at.y, { r: 170, style: 'star5', color: SUN, dur: 12, spin: 0.2 });
      V.sigil(at.x, at.y, { r: 110, style: 'petals', color: DAWN, dur: 12, spin: -0.35 });
      V.burst(at.x, at.y - 40, { color: DAWN, color2: '#ffffff', n: 26, speed: 320, kind: 'star', flashR: 140 });
      clericPetals(at.x, at.y, 16, 260);
    });
  };
  // the dawn smites the boss: a broad beam from the sky, a gold starburst, a seal; a Dawnstar that rose with it (d.s)
  // lands as a second, whiter star. The Petals growing back glint round the cleric.
  KIT_VFX['cleric-dawn'] = Object.assign((e, target, d) => {
    const t = target || e, star = d && d.s;
    V.beam(t.x, t.y - 360, t.x, t.y, { color: '#fff6c8', w: star ? 30 : 22, dur: 0.55 });
    V.spikeburst(t.x, t.y, { r: star ? 110 : 90, n: 18, color: SUN, core: '#fffbe0', ink: '#4a3408', dur: 0.45, z: 8 });
    V.shock(t.x, t.y, { r: 180, color: DAWN, dur: 0.55, w: 8 });
    V.sigil(t.x, t.y, { r: 90, style: 'star4', color: SUN, dur: 2.4, spin: 1.4 });
    V.decal(t.x, t.y, { style: 'crack', r: 56, dur: 3, a: 0.5, seed: Math.random() * 6 });
    if (star) V.burst(t.x, t.y - 30, { color: '#ffffff', color2: DAWN, n: 22, speed: 300, kind: 'star', flashR: 120 });
    shake(star ? 6 : 4);
    for (let i = 0; i < 3; i++) V.spawn({ x: e.x, y: e.y, z: 26, life: 1.1, size: 13, color: i % 2 ? PETAL : DAWN, kind: 'petal', add: false, vr: 4, flutter: 4, orbit: { x: e.x, y: e.y, a: i * TAU / 3, r: 34, w: 3, dr: -10, flat: 0.55, follow: e } });
  }, { atTarget: true });

  // ---------------------------------------------------------------- Grovekeeper (greens, bark, golden fruit, a teal moon pool)
  // After the painted sheet (docs/art/vfx-reference/grovekeeper.png), each move in three beats (wind-up, impact,
  // aftermath). World Tree: leaves spiral in and roots crack the floor; the tree rises and sways, golden fruit hanging
  // from its crown and light pouring through it (thinning after 1.6s so the floor stays readable); a faint canopy grove
  // with a teal pool among the roots stays for the 12s. Its moves (Rejuvenate, Bloom, Wild Growth, Moonwell, Wrath) are
  // in this block too, below the Ultimate. Everything left on the floor draws over the telegraphs: it stays faint.
  const LEAF = '#8fff7a', MOSS = '#2f6a22', BARK = '#3a2a18';
  const GROVE_GOLD = '#ffd66a', GROVE_TEAL = '#5ff0d0', GROVE_SHADE = '#06140a', GROVE_CREAM = '#fff6c8';
  // leaves (and a few gold motes) spiralling in to a point, with three swept streaks turning with them: a wind-up
  function groveLeafSpiral(x, y, o = {}) {
    const R = o.r ?? 150, dur = o.dur ?? 0.5, n = Math.min(o.n ?? 16, 20), follow = o.follow;
    for (let i = 0; i < n; i++) {
      const r0 = R * rand(0.75, 1.05), star = i % 5 === 4;
      V.spawn({ x, y, z: rand(6, 40), life: dur + 0.05, size: star ? 9 : rand(10, 14), color: star ? GROVE_GOLD : i % 3 ? LEAF : '#c8ff8a', kind: star ? 'star' : 'leaf', add: star ? undefined : false, vr: rand(4, 8), fadeIn: 0.15,
        orbit: { x, y, a: i * TAU / n + rand(-0.2, 0.2), r: r0, w: rand(3.5, 5), dr: -r0 * 0.9 / dur, flat: 0.55, follow } });
    }
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.2, (1 - p) / 0.25);
      for (let j = 0; j < 3; j++) {
        const a0 = j * TAU / 3 + t * 5;
        V.neonPath(c, j === 1 ? GROVE_TEAL : LEAF, 2.4, k * 0.7, () => { for (let s = 0; s <= 16; s++) { const q = s / 16, a = a0 + q * 2.6, rr = R * (1 - p * 0.75) * (1 - q * 0.75), px = cx + Math.cos(a) * rr, py = cy - 20 + Math.sin(a) * rr * 0.55; s ? c.lineTo(px, py) : c.moveTo(px, py); } });
      }
    } });
  }
  // roots tearing outward through the floor: dark bark ridges with gold light in them. They grow in `grow` seconds, glow
  // for `glow` more, then lie at strength o.a (faint) for the rest of `dur`
  function groveRoots(x, y, o = {}) {
    const R = o.r ?? 120, n = Math.min(o.n ?? 7, 10), dur = o.dur ?? 3, grow = o.grow ?? 0.35, glowFor = o.glow ?? 0.9, rest = o.a ?? 0.3, flat = 0.6;
    const roots = Array.from({ length: n }, (_, i) => {
      const a0 = i * TAU / n + rand(-0.25, 0.25), L = R * rand(0.6, 1), pts = [[0, 0]];
      let a = a0, px = 0, py = 0;
      for (let s = 1; s <= 5; s++) { a += rand(-0.35, 0.35); px += Math.cos(a) * L / 5; py += Math.sin(a) * L / 5; pts.push([px, py]); }
      const b = pts[2 + (Math.random() * 2 | 0)], ba = a0 + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.9);
      return { pts, br: [b, [b[0] + Math.cos(ba) * L * 0.25, b[1] + Math.sin(ba) * L * 0.25]], w: rand(3.5, 6) };
    });
    const trace = (c, pts, f) => { const m = Math.max(1, Math.ceil((pts.length - 1) * f)); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= m && i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = Math.min(1, T / grow), hot = Math.max(0, 1 - Math.max(0, T - grow) / glowFor), k = e.a * Math.min(1, (dur - T) / 0.6) * (rest + (1 - rest) * hot);
      if (k <= 0.01) return;
      c.save(); c.translate(x, y); c.scale(1, flat); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const r of roots) {
        c.globalAlpha = k; c.strokeStyle = '#140c06'; c.lineWidth = r.w + 3; trace(c, r.pts, g); c.stroke();
        c.strokeStyle = '#5a3c20'; c.lineWidth = r.w; trace(c, r.pts, g); c.stroke();
        if (g >= 1) { c.strokeStyle = '#140c06'; c.lineWidth = r.w * 0.7 + 2; trace(c, r.br, 1); c.stroke(); c.strokeStyle = '#5a3c20'; c.lineWidth = r.w * 0.7; trace(c, r.br, 1); c.stroke(); }
      }
      if (hot > 0) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = GROVE_GOLD; c.lineWidth = 1.6; for (const r of roots) { c.globalAlpha = k * hot * 0.9; trace(c, r.pts, g); c.stroke(); } }
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // a little five-petal flower lying on the floor (s: petal size)
  function groveFlower(c, x, y, s, rot, a, col = GROVE_GOLD) {
    if (a <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(rot); c.globalAlpha = Math.min(1, a); c.fillStyle = col;
    for (let i = 0; i < 5; i++) { const pa = i * TAU / 5; c.beginPath(); c.ellipse(Math.cos(pa) * s, Math.sin(pa) * s, s * 0.9, s * 0.5, pa, 0, TAU); c.fill(); }
    c.restore(); c.globalAlpha = 1;
    V.glowAt(c, x, y, s * 1.6, GROVE_CREAM, a * 0.8);
  }
  // thorned roots bursting up out of the floor: curved bark spikes lit gold along one edge, a barb on each, hot tips
  function groveThorns(x, y, o = {}) {
    const n = Math.min(o.n ?? 6, 12), r = o.r ?? 40, h = o.h ?? 50, dur = o.dur ?? 0.8;
    const sp = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.3, 0.3), d = rand(0.25, 1) * r;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: h * rand(0.6, 1.15), w: rand(4, 8), lean: Math.cos(a) * rand(0.3, 0.6) + rand(-0.15, 0.15), at: rand(0, 0.08) }; }).sort((a, b) => a.y - b.y);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35);
      V.glowAt(c, x, y - 10, r * 1.2, GROVE_GOLD, 0.3 * k * (1 - p));
      c.lineJoin = 'round';
      for (const s of sp) {
        const g = easeOut(Math.min(1, Math.max(0, t - s.at) / 0.14)); if (g <= 0) continue;
        const hh = s.h * g, tx = s.x + s.lean * hh, ty = s.y - hh, mx = s.x + s.lean * hh * 0.2, my = s.y - hh * 0.55;
        c.globalAlpha = k; c.fillStyle = '#5a3c1c'; c.strokeStyle = '#140c06'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(s.x - s.w, s.y); c.quadraticCurveTo(mx - s.w * 0.6, my, tx, ty); c.quadraticCurveTo(mx + s.w * 0.6, my, s.x + s.w, s.y); c.closePath(); c.fill(); c.stroke();
        const bx = s.x + (tx - s.x) * 0.45, by = s.y + (ty - s.y) * 0.45, sd = s.lean > 0 ? -1 : 1;
        c.fillStyle = '#4a6a22'; c.beginPath(); c.moveTo(bx, by - 3); c.lineTo(bx + sd * s.w * 1.3, by - 9); c.lineTo(bx, by + 3); c.closePath(); c.fill();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.75; c.strokeStyle = GROVE_GOLD; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(s.x - s.w * 0.4, s.y - 2); c.quadraticCurveTo(mx - s.w * 0.3, my, tx, ty); c.stroke(); c.globalCompositeOperation = 'source-over';
        V.glowAt(c, tx, ty, 8, '#fff2b0', k * 0.8);
      }
      c.globalAlpha = 1;
    } });
  }
  // GROVE_ULT_SCALE sizes the World Tree (trunk, crown, roots, wind-up and burst). The heal's 180 canopy ring is fixed.
  const GROVE_ULT_SCALE = 1.8;
  // the World Tree, painted once into a sprite (the same tree every cast, so a frame only blits it): roots clawing out
  // from a thick gnarled trunk with bark ridges and a knot, branches up into a crown of many overlapping leaf clusters,
  // each with an ink edge, a dark underside, a mid green and a lit top, a shadow under the crown and warm light on it.
  let groveTreeArt = null;
  function groveTreeSprite(H, R) {
    if (groveTreeArt && groveTreeArt.H === H && groveTreeArt.R === R) return groveTreeArt;
    const W = Math.ceil(R * 2.6 + 40), SH = Math.ceil(H + R * 0.95 + 40), fx = W / 2, fy = SH - 30, cy = fy - H, ry = R * 0.7;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = SH;
    const c = cv.getContext('2d'); c.lineJoin = 'round'; c.lineCap = 'round';
    const tw = R * 0.21, quad = (a, b, d, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * b + q * q * d;
    // a tapering limb along a quadratic curve: ink, bark, a lit line on its upper edge
    const limb = (x0, y0, x1, y1, x2, y2, w0, w1) => {
      for (const [col, add, off] of [['#0e0804', 3, 0], ['#4a3220', 0, 0], ['#8a6a3e', -w0 * 0.65, -1]]) {
        c.strokeStyle = col;
        for (let s = 0; s < 7; s++) { const q0 = s / 7, q1 = (s + 1) / 7, lw = w0 + (w1 - w0) * q0 + add; if (lw <= 0.5) continue; c.lineWidth = lw;
          c.beginPath(); c.moveTo(quad(x0, x1, x2, q0), quad(y0, y1, y2, q0) + off); c.lineTo(quad(x0, x1, x2, q1), quad(y0, y1, y2, q1) + off); c.stroke(); }
      }
    };
    // roots clawing out across the floor, a smaller one off each
    for (const s of [-1, -0.7, -0.35, 0.3, 0.68, 1]) {
      const L = R * rand(0.8, 1.15), ex = fx + s * L, ey = fy + rand(-4, 14) + (1 - Math.abs(s)) * 16;
      limb(fx + s * tw * 0.7, fy - tw, fx + s * L * 0.45, fy - 4, ex, ey, tw * 0.9, 2);
      const q = 0.55, bx = quad(fx + s * tw * 0.7, fx + s * L * 0.45, ex, q), by = quad(fy - tw, fy - 4, ey, q);
      limb(bx, by, bx + s * L * 0.15, by + 10, bx + s * L * rand(0.2, 0.35), by + rand(12, 22), tw * 0.35, 1);
    }
    // the trunk: gnarled edges narrowing up, shaded dark on its right, bark ridges and a knot
    const top = fy - H * 0.8, edge = (side, q) => fx + side * tw * (1.25 - 0.6 * q) + Math.sin(q * 7 + side) * tw * 0.12 + (q > 0.85 ? side * (q - 0.85) * tw * 4 : 0);
    c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12; c.lineTo(edge(-1, q), fy - (fy - top) * q); } for (let i = 12; i >= 0; i--) { const q = i / 12; c.lineTo(edge(1, q), fy - (fy - top) * q); } c.closePath();
    const bark = c.createLinearGradient(fx - tw * 1.3, 0, fx + tw * 1.3, 0); bark.addColorStop(0, '#7a5a34'); bark.addColorStop(0.35, '#4a3220'); bark.addColorStop(1, '#1a1008');
    c.fillStyle = bark; c.fill(); c.strokeStyle = '#0e0804'; c.lineWidth = 3; c.stroke();
    c.save(); c.clip();
    for (let j = 0; j < 7; j++) { const f = -0.85 + j * 0.28, ph = rand(0, 6);
      c.strokeStyle = '#1a1008'; c.lineWidth = 1.8; c.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12, ex = edge(-1, q) + (edge(1, q) - edge(-1, q)) * (f + 1) / 2; c.lineTo(ex + Math.sin(q * 9 + ph) * 3, fy - (fy - top) * q); } c.stroke();
      c.strokeStyle = 'rgba(160,124,74,0.5)'; c.lineWidth = 1; c.stroke(); }
    c.fillStyle = '#140c06'; c.beginPath(); c.ellipse(fx - tw * 0.2, fy - H * 0.42, tw * 0.28, tw * 0.4, 0.2, 0, TAU); c.fill(); c.strokeStyle = '#7a5a34'; c.lineWidth = 1.4; c.stroke();
    c.restore();
    // branches up into the crown
    for (const [dx, dy] of [[-0.75, 0.05], [-0.4, -0.35], [0.05, -0.55], [0.45, -0.3], [0.8, 0.08]]) limb(fx + dx * tw, top + tw, fx + dx * R * 0.35, cy + R * 0.2, fx + dx * R * 0.8, cy + dy * ry, tw * 0.75, 3);
    // the crown: loose leaves peeking out at its edge, then clusters back to front
    const greens = ['#0f280c', '#173a12', '#21521a', '#2c6a20', '#3a8428', '#4f9e32', '#6cba40', '#94d85a'];
    for (let i = 0; i < 46; i++) { const a = rand(0, TAU), lx = fx + Math.cos(a) * R * 1.04, ly = cy + Math.sin(a) * ry * 1.06;
      c.save(); c.translate(lx, ly); c.rotate(a + rand(-0.6, 0.6)); c.fillStyle = '#081406'; c.beginPath(); c.ellipse(0, 0, 9, 4.5, 0, 0, TAU); c.fill(); c.fillStyle = greens[2 + (Math.random() * 4 | 0)]; c.beginPath(); c.ellipse(0, 0, 7.5, 3.2, 0, 0, TAU); c.fill(); c.restore(); }
    const cl = [];
    for (let i = 0; i < 48; i++) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * 0.82; cl.push({ x: fx + Math.cos(a) * d * R, y: cy + Math.sin(a) * d * ry, s: R * rand(0.2, 0.3) * (1.1 - d * 0.25) }); }
    for (let i = 0; i < 10; i++) { const a = Math.PI * (0.1 + i * 0.09); cl.push({ x: fx + Math.cos(a) * R * 0.86, y: cy + Math.sin(a) * ry * 0.82, s: R * rand(0.18, 0.24) }); }   // (a full lower rim)
    cl.sort((a, b) => a.y - b.y);
    const blob = (x, y, s, grow) => { c.beginPath(); c.arc(x, y, s * 0.6 + grow, 0, TAU); for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + s; c.moveTo(x + Math.cos(a) * s * 0.55 + s * 0.48 + grow, y + Math.sin(a) * s * 0.55); c.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.48 + grow, 0, TAU); } c.fill(); };
    for (const b of cl) {
      const tone = 0.55 - (b.y - cy) / ry * 0.38 - (b.x - fx) / R * 0.16 + rand(-0.12, 0.12), gi = Math.max(1, Math.min(5, Math.round(tone * 7)));
      c.fillStyle = '#061004'; blob(b.x, b.y, b.s, 2.5);
      c.fillStyle = greens[gi - 1]; blob(b.x, b.y, b.s, 0);
      c.fillStyle = greens[gi]; blob(b.x - b.s * 0.1, b.y - b.s * 0.14, b.s * 0.82, 0);
      c.fillStyle = greens[gi + 2]; blob(b.x - b.s * 0.24, b.y - b.s * 0.3, b.s * 0.42, 0);
      c.fillStyle = 'rgba(200,250,140,0.55)';
      for (let j = 0; j < 3; j++) { c.save(); c.translate(b.x - b.s * rand(0.1, 0.5), b.y - b.s * rand(0.25, 0.6)); c.rotate(rand(-1, 1)); c.beginPath(); c.ellipse(0, 0, b.s * 0.16, b.s * 0.07, 0, 0, TAU); c.fill(); c.restore(); }
    }
    // a shadow under the crown, and warm light falling on its top
    c.globalCompositeOperation = 'source-atop';
    const sh = c.createLinearGradient(0, cy, 0, cy + ry * 1.15); sh.addColorStop(0, 'rgba(2,10,2,0)'); sh.addColorStop(1, 'rgba(2,10,2,0.55)'); c.fillStyle = sh; c.fillRect(0, cy, W, ry * 1.15);
    const lit = c.createRadialGradient(fx - R * 0.35, cy - ry * 0.7, 0, fx - R * 0.35, cy - ry * 0.7, R * 1.1); lit.addColorStop(0, 'rgba(255,236,150,0.32)'); lit.addColorStop(1, 'rgba(255,236,150,0)'); c.fillStyle = lit; c.fillRect(0, 0, W, fy);
    c.globalCompositeOperation = 'source-over';
    return (groveTreeArt = { cv, H, R, fx, fy });
  }
  // the World Tree standing over the druid: it shoots up out of its roots in half a second (a little overshoot) and
  // sways, golden lanterns hanging from its crown on threads, light pouring down through it; it fades out entirely by
  // `dur` (from `fade`) so nothing leafy hangs over the party or the boss for the heal's 12s.
  function groveWorldTree(x, y, o = {}) {
    const dur = o.dur ?? 2.7, fade = o.fade ?? 1.9, H = o.h ?? 150, R = o.r ?? 78, art = groveTreeSprite(H, R);
    const fruit = Array.from({ length: 11 }, (_, i) => { const u = -0.84 + i * 0.168 + rand(-0.05, 0.05); return { x: u * R, y: R * 0.7 * rand(0.35, 0.9) * (1 - Math.abs(u) * 0.35), len: rand(12, 34), ph: rand(0, 6) }; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const T = p * dur, q = Math.min(1, T / 0.5), g = (1 - Math.pow(1 - q, 3)) * (1 + 0.08 * Math.sin(q * Math.PI)), gx = 0.55 + 0.45 * g;
      const k = e.a * Math.min(1, T / 0.06) * Math.max(0, Math.min(1, (dur - T) / (dur - fade)));
      if (k <= 0.01) return;
      const sway = Math.sin(t * 1.3) * R * 0.04 * g;
      V.glowAt(c, x, y - 10, R * 1.1, GROVE_GOLD, k * 0.3 * Math.max(0.3, 1 - T / 1.5));
      c.save(); c.globalAlpha = k; c.translate(x, y); c.transform(gx, 0, -sway / H, g, 0, 0); c.drawImage(art.cv, -art.fx, -art.fy); c.restore();
      // golden light pouring down through the crown, the first moments
      const shaft = e.a * Math.min(1, T / 0.25) * Math.max(0, 1 - T / 1.7);
      if (shaft > 0.01) {
        const top = y - (H - R * 0.25) * g;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = -2; i <= 2; i++) { const sx = x + sway + i * R * 0.3, w = R * (0.1 + 0.04 * Math.abs(i)), gr = c.createLinearGradient(0, top, 0, y + 10);
          gr.addColorStop(0, rgba(GROVE_GOLD, 0)); gr.addColorStop(0.3, rgba(GROVE_GOLD, 0.24 * shaft)); gr.addColorStop(1, rgba(GROVE_GOLD, 0));
          c.fillStyle = gr; c.beginPath(); c.moveTo(sx - w * 0.5, top); c.lineTo(sx + w * 0.5, top); c.lineTo(sx + w * 1.2 + i * 6, y + 10); c.lineTo(sx - w * 1.2 + i * 6, y + 10); c.closePath(); c.fill(); }
        c.restore();
      }
      // golden lanterns on threads under the crown
      const fk = k * Math.min(1, Math.max(0, T - 0.3) / 0.25); if (fk <= 0.01) return;
      c.strokeStyle = '#d8b060'; c.lineWidth = 1; c.globalAlpha = fk * 0.8;
      const ls = fruit.map(f => { const bx = x + f.x * gx + sway, by = y + (-H + f.y) * g, lx = bx + Math.sin(t * 1.6 + f.ph) * 2, ly = by + f.len * g; c.beginPath(); c.moveTo(bx, by); c.lineTo(lx, ly); c.stroke(); return [lx, ly, 0.7 + 0.3 * Math.sin(t * 2.4 + f.ph)]; });
      c.globalAlpha = 1;
      for (const [lx, ly, pulse] of ls) { V.glowAt(c, lx, ly + 3, 18, GROVE_GOLD, fk * 0.7 * pulse); c.globalAlpha = fk; c.fillStyle = '#ffcf4a'; c.beginPath(); c.ellipse(lx, ly + 3, 3.4, 4.4, 0, 0, TAU); c.fill(); c.globalAlpha = 1; V.glowAt(c, lx, ly + 3, 5, GROVE_CREAM, fk * pulse); }
    }, tick: p => {
      const T = p * dur; if (T < 0.45 || T > fade + 0.3) return;
      if (Math.random() < 0.3) V.spawn({ x: x + rand(-R, R), y: y + rand(-R * 0.3, R * 0.2), z: H * rand(0.55, 1.05), vz: rand(-55, -25), vx: rand(-25, 25), life: rand(1.4, 2.2), size: rand(9, 13), color: Math.random() < 0.7 ? (Math.random() < 0.5 ? LEAF : '#5fb03a') : '#ffe0a0', kind: 'leaf', add: false, vr: rand(-3, 3), flutter: 5, fadeIn: 0.1 });
      if (Math.random() < 0.2) V.spawn({ x: x + rand(-R, R) * 0.8, y: y + rand(-10, 10), z: H * rand(0.4, 0.9), vz: rand(-20, 10), life: rand(0.8, 1.4), size: rand(5, 8), size1: 0, color: Math.random() < 0.6 ? GROVE_GOLD : GROVE_CREAM, kind: 'star' });
    } });
  }
  // the grove the tree leaves: the ring of its reach (r: the heal's 180) with a dashed inner leaf ring and flowers on
  // it, and a teal pool among the roots at its foot (rim-led, its middle barely tinted), ripples running out across it.
  // No fill over the party: everything here is a rim or a glow, so the telegraphs under it read.
  function groveCanopy(x, y, o = {}) {
    const R = o.r ?? 180, dur = o.dur ?? 12, pool = o.pool ?? R * 0.42, flat = 0.55;
    const flowers = Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 + rand(-0.15, 0.15), d: rand(0.86, 0.98), s: rand(3, 4.5) }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = easeOut(Math.min(1, T / 0.5)), k = e.a * Math.min(1, T / 0.3, (dur - T) / 0.8);
      V.neonRing(c, x, y, R * g, LEAF, 2, k * 0.5, flat);
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(t * 0.08); c.setLineDash([10, 14]); V.neonPath(c, '#5fb03a', 1, k * 0.35, () => c.arc(0, 0, R * g * 0.9, 0, TAU)); c.setLineDash([]); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(x, y, 0, x, y, pool); gr.addColorStop(0, rgba(GROVE_TEAL, 0.05 * k)); gr.addColorStop(0.75, rgba(GROVE_TEAL, 0.1 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0.2 * k));
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, pool * g, pool * g * flat, 0, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 2; i++) { const q = (t * 0.35 + i * 0.5) % 1; V.neonRing(c, x, y, pool * (0.3 + 0.7 * q), GROVE_TEAL, 1.2, k * 0.35 * (1 - q), flat); }
      V.neonRing(c, x, y, pool * g, GROVE_TEAL, 2, k * 0.55, flat);
      for (const f of flowers) groveFlower(c, x + Math.cos(f.a) * R * f.d * g, y + Math.sin(f.a) * R * f.d * flat * g, f.s, f.a + t * 0.3, k * 0.65);
    }, tick: () => { if (Math.random() < 0.1) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * pool; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * flat, z: 2, vz: rand(15, 35), life: rand(1, 1.6), size: rand(5, 8), size1: 0, color: Math.random() < 0.6 ? GROVE_TEAL : GROVE_GOLD }); } } });
  }
  // leaves spiral in and roots tear through the floor at the druid's feet; the World Tree shoots up out of them, stands
  // for about two seconds and fades away, leaving only the canopy ring, the teal pool and the roots (rims, low) for the
  // 12s of healing, gold and teal motes rising off them. Its thorns on the boss: KIT_VFX['grove-tree'].
  ABILITY_VFX.grovekeeper.worldtree = c => {
    const at = { x: c.x, y: c.y }, S = GROVE_ULT_SCALE;
    if (c.cam) c.cam.dim(0.28, 1.3);
    groveLeafSpiral(at.x, at.y, { r: 110 * S, dur: LAND + 0.05, n: 20 });
    groveRoots(at.x, at.y, { r: 130 * S, n: 10, dur: 12 + LAND, grow: LAND + 0.25, glow: 1.4, a: 0.28 });
    V.fx({ dur: LAND, layer: 'ground', draw: (cx, p, t, e) => { V.glowAt(cx, at.x, at.y, 30 + 60 * S * p, GROVE_GOLD, e.a * 0.5 * p); V.neonRing(cx, at.x, at.y, 90 * S * (1 - 0.7 * p), LEAF, 2, e.a * p, 0.55); } });
    c.later(LAND, () => {
      impact(c.cam, '#e8ffc0', 0.18);
      shake(7);
      groveWorldTree(at.x, at.y, { h: 112 * S, r: 78 * S, dur: 2.3, fade: 1.55 });
      groveCanopy(at.x, at.y, { r: 180, dur: 12, pool: 42 * S });
      V.shock(at.x, at.y, { r: 120 * S, color: '#fff2b0', dur: 0.55, w: 7 });
      V.shock(at.x, at.y, { r: 150 * S, color: LEAF, dur: 0.75, w: 5, delay: 0.08 });
      V.debris(at.x, at.y, { n: 10, color: '#5a4a32' });
      V.burst(at.x, at.y - 90 * S, { color: GROVE_GOLD, color2: GROVE_CREAM, n: 16, speed: 260, kind: 'star', flashR: 70 * S });
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14, s = rand(160, 300); V.spawn({ x: at.x, y: at.y, z: 60 * S, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(40, 140), g: 140, drag: 0.04, life: rand(1.1, 1.6), size: rand(11, 15), color: i % 3 ? (i % 2 ? LEAF : '#5fb03a') : GROVE_GOLD, kind: 'leaf', add: false, vr: rand(-6, 6), flutter: 5 }); }
    });
  };
  // thorned roots burst out of the floor under the boss with a spray of earth; with Thornlash on it (d.s) more and taller
  KIT_VFX['grove-tree'] = Object.assign((e, target, d) => {
    const t = target || e, thorn = d && d.s;
    groveThorns(t.x, t.y, { n: thorn ? 10 : 7, r: 66, h: thorn ? 76 : 58, dur: 1.1 });
    groveRoots(t.x, t.y, { r: 90, n: 6, dur: 2.6, grow: 0.18, glow: 0.6, a: 0.25 });
    if (thorn) V.spikeburst(t.x, t.y, { r: 84, n: 16, color: '#8adf4a', core: GROVE_CREAM, ink: '#0e2208', dur: 0.36, z: 6 });
    V.debris(t.x, t.y, { n: 6, color: '#5a4a32' });
    V.shock(t.x, t.y, { r: 140, color: GROVE_GOLD, dur: 0.5, w: 5 });
    V.motes(t.x, t.y, { kind: 'leaf', color: '#6fbf4a', n: 6, r: 50, rise: 0.6 });
    shake(4);
  }, { atTarget: true });

  // ---- Grovekeeper's moves (the sheet's rows under the Ultimate)
  // a stream of leaves blown along a curve from the druid to the ally, its head a soft green light
  function groveLeafStream(sx, sy, w, o = {}) {
    const dur = o.dur ?? 0.32, side = Math.random() < 0.5 ? -1 : 1;
    const at = q => { const tx = w.x, ty = w.y, L = Math.hypot(tx - sx, ty - sy), nx = -(ty - sy) / (L || 1), ny = (tx - sx) / (L || 1), b = Math.sin(q * Math.PI) * Math.min(80, L * 0.3) * side;
      return { x: sx + (tx - sx) * q + nx * b, y: sy + (ty - sy) * q + ny * b - 24 }; };
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.2 + 0.3), q0 = Math.max(0, p - 0.4);
      V.neonPath(c, LEAF, 3.2, k * 0.7, () => { for (let s = 0; s <= 10; s++) { const P = at(q0 + (p - q0) * s / 10); s ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); } });
      V.neonPath(c, GROVE_GOLD, 1.4, k * 0.6, () => { for (let s = 0; s <= 10; s++) { const P = at(q0 + (p - q0) * s / 10), wv = Math.sin(s * 1.3 + t * 20) * 7; s ? c.lineTo(P.x, P.y + wv) : c.moveTo(P.x, P.y + wv); } });
      const h = at(p); V.glowAt(c, h.x, h.y, 30, LEAF, k * 0.8); V.glowAt(c, h.x, h.y, 9, GROVE_CREAM, k);
    }, tick: p => { if (Math.random() < 0.6) { const h = at(p); V.spawn({ x: h.x, y: h.y + 24, z: 24, vx: rand(-30, 30), vy: rand(-20, 20), vz: rand(-10, 30), life: rand(0.4, 0.6), size: rand(9, 12), color: Math.random() < 0.3 ? GROVE_GOLD : LEAF, kind: 'leaf', add: false, vr: rand(-8, 8), flutter: 6 }); } } });
  }
  // a ring of small flowers and a vine circle opening round the ally's feet (follows them)
  function groveFlowerRing(x, y, o = {}) {
    const r = o.r ?? 34, dur = o.dur ?? 1.6, n = o.n ?? 6, follow = o.follow, col = o.color || GROVE_GOLD;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.1, (1 - p) / 0.35), g = easeOut(Math.min(1, p / 0.2));
      V.neonRing(c, cx, cy, r * g, LEAF, 1.6, k * 0.7, 0.55);
      for (let i = 0; i < n; i++) { const a = i * TAU / n + t * 0.5; groveFlower(c, cx + Math.cos(a) * r * g, cy + Math.sin(a) * r * g * 0.55, 3.2 * g + 0.5, a, k, col); }
    } });
  }
  // thin shafts of light rising round a point: the heal landing
  function groveRays(x, y, o = {}) {
    const n = o.n ?? 6, r = o.r ?? 26, h = o.h ?? 70, col = o.color || LEAF, dur = o.dur ?? 0.55;
    const rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.3, 0.3), h: h * rand(0.6, 1), d: rand(0.4, 1) }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12, (1 - p) / 0.5), g = easeOut(Math.min(1, p / 0.3));
      V.glowAt(c, x, y - 16, 30, col, 0.5 * k);
      for (const ry of rays) { const rx = x + Math.cos(ry.a) * r * ry.d, rb = y + Math.sin(ry.a) * r * ry.d * 0.55; V.neonPath(c, col, 2, k * 0.8, () => { c.moveTo(rx, rb); c.lineTo(rx, rb - ry.h * g); }); }
    } });
  }
  // a small golden cross glyph rising over the ally's head, two sparkles beside it
  function groveCross(w, o = {}) {
    const dur = o.dur ?? 1.1;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.4), x = w.x, y = w.y - 84 - 16 * p;
      V.glowAt(c, x, y, 26, GROVE_GOLD, 0.55 * k);
      V.neonPath(c, GROVE_GOLD, 2.8, k, () => { c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.moveTo(x - 8, y - 4); c.lineTo(x + 8, y - 4); });
      for (const s of [-1, 1]) { const sx = x + s * 19, sy = y + 5 - s * 8, tw = k * (0.6 + 0.4 * Math.sin(t * 9 + s)); V.glowAt(c, sx, sy, 6, GROVE_CREAM, tw); V.neonPath(c, GROVE_CREAM, 1.2, tw * 0.8, () => { c.moveTo(sx - 4, sy); c.lineTo(sx + 4, sy); c.moveTo(sx, sy - 4); c.lineTo(sx, sy + 4); }); }
    } });
  }
  // Rejuvenate: leaves spiral along to the ally, a flower ring bursts open round them with light rising, a cross glyph
  ABILITY_VFX.grovekeeper.rejuv = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    const land = () => {
      groveFlowerRing(w.x, w.y, { r: 46, dur: 1.7, n: 8, follow });
      groveRays(w.x, w.y, { n: 9, r: 34, h: 92 });
      V.lightfall(w.x, w.y, { color: '#b8ff9a', r: 24, h: 170, dur: 0.6, feathers: 0 });
      V.shock(w.x, w.y, { r: 62, color: LEAF, dur: 0.4, w: 3 });
      groveCross(w);
      for (let i = 0; i < 7; i++) V.spawn({ x: w.x, y: w.y, z: 6 + i * 4, life: 1.1, size: 12, color: i % 3 ? (i % 2 ? LEAF : '#c8ff8a') : GROVE_GOLD, kind: 'leaf', add: false, vr: 5, orbit: { x: w.x, y: w.y, a: i * 0.9, r: 36, w: 4.5, dr: 8, flat: 0.55, follow: follow || undefined } });
    };
    if (Math.hypot(w.x - c.x, w.y - c.y) < 30) land(); else { groveLeafStream(c.x, c.y, w, { dur: 0.32 }); c.later(0.32, land); }
  };
  // a golden lotus lying open on the floor: green leaves under gold petals under cream ones, a bud for its first moment
  function groveLotus(x, y, o = {}) {
    const r = o.r ?? 48, dur = o.dur ?? 1.1, flat = 0.62;
    const petal = (c, L, W) => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -W, L, 0); c.quadraticCurveTo(L * 0.5, W, 0, 0); };
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, open = easeOut(Math.min(1, Math.max(0, T - 0.12) / 0.3)), k = e.a * Math.min(1, T / 0.08, (dur - T) / 0.35);
      V.glowAt(c, x, y, r * (0.8 + open), GROVE_GOLD, 0.45 * k);
      c.save(); c.translate(x, y); c.scale(1, flat); c.globalAlpha = k; c.lineJoin = 'round';
      const layer = (n, L, W, off, fill, edge) => { for (let i = 0; i < n; i++) { c.save(); c.rotate(off + i * TAU / n); petal(c, L, W); c.fillStyle = fill; c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = 1.4; c.stroke(); } c.restore(); } };
      layer(10, r * (0.5 + 0.6 * open), r * 0.22, 0.2, '#2f7a22', '#0e2208');
      layer(10, r * (0.4 + 0.42 * open), r * 0.12, 0.2, '#6cba40');
      layer(8, r * (0.35 + 0.5 * open), r * 0.2, 0.2 + TAU / 16, GROVE_GOLD, '#6a4a10');
      layer(8, r * (0.25 + 0.36 * open), r * 0.17, 0.2, '#ffe9a0', '#8a6a20');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.6;
      layer(6, r * (0.2 + 0.28 * open), r * 0.14, 0.5, GROVE_CREAM);
      c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y, r * 0.3, '#ffffff', k * 0.8);
    } });
  }
  // a mandala seal left on the floor where the lotus was: gold rings, eight petals, eight leaves, a flower at its heart
  function groveMandala(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 1.6, cap = o.a ?? 0.55, flat = 0.6;
    V.fx({ dur, layer: 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.15, (1 - p) / 0.45), R = r * (0.85 + 0.15 * easeOut(Math.min(1, p / 0.3)));
      V.neonRing(c, x, y, R, GROVE_GOLD, 2, k, flat); V.neonRing(c, x, y, R * 0.86, LEAF, 1, k * 0.7, flat);
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(t * 0.4);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8;
        V.neonPath(c, GROVE_GOLD, 1.4, k, () => c.ellipse(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * 0.3, R * 0.12, a, 0, TAU));
        V.neonPath(c, LEAF, 1.2, k * 0.8, () => c.ellipse(Math.cos(a + TAU / 16) * R * 0.7, Math.sin(a + TAU / 16) * R * 0.7, R * 0.12, R * 0.05, a + TAU / 16, 0, TAU)); }
      c.restore();
      groveFlower(c, x, y, R * 0.08, t, k);
    } });
  }
  // Bloom: a golden lotus bursts open at the druid's feet, petals thrown out, and a mandala seal stays behind
  ABILITY_VFX.grovekeeper.bloom = c => {
    const x = c.x, y = c.y;
    groveLotus(x, y, { r: 66, dur: 1.15 });
    V.shock(x, y, { r: 190, color: GROVE_GOLD, dur: 0.5, w: 5, delay: 0.14 });
    c.later(0.14, () => {
      V.flash(x, y - 20, 70, GROVE_GOLD, 0.2);
      groveRays(x, y, { n: 8, r: 40, h: 110, color: GROVE_GOLD, dur: 0.6 });
      for (let i = 0; i < 16; i++) { const a = i * TAU / 16, sp = rand(140, 260); V.spawn({ x, y, z: 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(80, 200), g: 160, drag: 0.05, life: 1.3, size: 13, color: i % 3 ? GROVE_GOLD : (i % 2 ? GROVE_CREAM : LEAF), kind: i % 4 === 3 ? 'leaf' : 'petal', add: false, vr: 6, flutter: 6, fadeIn: 0.02 }); }
    });
    groveMandala(x, y, { r: 122, dur: 1.7, delay: 0.7 });
  };
  // vines surging up out of the floor round a point: each a curling green tendril with a leaf or two
  function groveVines(x, y, o = {}) {
    const n = Math.min(o.n ?? 8, 12), r = o.r ?? 120, h = o.h ?? 50, dur = o.dur ?? 1.1, s = Math.max(1, h / 50);
    const vs = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.2, 0.2); return { x: x + Math.cos(a) * r * rand(0.75, 1), y: y + Math.sin(a) * r * 0.55 * rand(0.75, 1), h: h * rand(0.7, 1.2), curl: Math.random() < 0.5 ? -1 : 1, at: rand(0, 0.15) }; }).sort((a, b) => a.y - b.y);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35);
      c.lineCap = 'round';
      for (const v of vs) {
        const g = easeOut(Math.min(1, Math.max(0, t - v.at) / 0.3)); if (g <= 0) continue;
        const tip = { x: v.x + v.curl * 10 * s * g, y: v.y - v.h * g }, path = () => { c.beginPath(); c.moveTo(v.x, v.y); c.quadraticCurveTo(v.x - v.curl * 12 * s, v.y - v.h * 0.5 * g, tip.x, tip.y); c.arc(tip.x - v.curl * 5 * s, tip.y, 5 * s * g, v.curl > 0 ? 0 : Math.PI, v.curl > 0 ? -Math.PI * 1.2 : Math.PI * 2.2, v.curl > 0); };
        c.globalAlpha = k; c.strokeStyle = '#0e2208'; c.lineWidth = 5 * s; path(); c.stroke(); c.strokeStyle = '#5fbf3a'; c.lineWidth = 2.6 * s; path(); c.stroke();
        c.strokeStyle = '#a8f070'; c.lineWidth = 0.9 * s; c.globalAlpha = k * 0.7; path(); c.stroke(); c.globalAlpha = k;
        c.fillStyle = LEAF; c.beginPath(); c.ellipse(v.x - v.curl * 6 * s, v.y - v.h * 0.4 * g, 5 * s * g, 2.5 * s * g, v.curl * 0.6, 0, TAU); c.fill();
        c.fillStyle = '#4f9e32'; c.beginPath(); c.ellipse(v.x - v.curl * 2 * s, v.y - v.h * 0.7 * g, 4 * s * g, 2 * s * g, -v.curl * 0.6, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    } });
  }
  // Wild Growth: vines surge up in a ring round the druid, a leafy circle of the party's heal grows, leaves flung outward
  ABILITY_VFX.grovekeeper.growth = c => {
    groveVines(c.x, c.y, { r: 160, n: 11, h: 70, dur: 1.3 });
    groveRoots(c.x, c.y, { r: 150, n: 7, dur: 1.6, grow: 0.25, glow: 0.6, a: 0.25 });
    groveFlowerRing(c.x, c.y, { r: 64, dur: 1.4, n: 8 });
    V.grove(c.x, c.y, { r: 170, dur: 3, color: '#7ee06a', color2: '#ffe0a0', flowers: 8, rate: 0.3 });
    V.shock(c.x, c.y, { r: 200, color: LEAF, dur: 0.55, w: 6 });
    for (let i = 0; i < 14; i++) V.spawn({ x: c.x, y: c.y, z: 10 + Math.random() * 24, life: 1.4, size: 14, color: i % 3 ? (i % 2 ? LEAF : '#5fb03a') : GROVE_GOLD, kind: 'leaf', add: false, vr: 6, orbit: { x: c.x, y: c.y, a: i * 0.45, r: 10, w: 3, dr: 150, flat: 0.6 } });
    V.plus(c.x, c.y, { n: 5 });
  };
  // a crescent moon hanging over a point, pale teal light falling from it onto the floor
  function groveMoon(x, y, o = {}) {
    const dur = o.dur ?? 1.3, H = o.h ?? 150, M = o.r ?? 20;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.2, (1 - p) / 0.4), my = y - H - 10 * p;
      const gr = c.createLinearGradient(0, my, 0, y); gr.addColorStop(0, rgba(GROVE_TEAL, 0.3 * k)); gr.addColorStop(0.7, rgba(GROVE_TEAL, 0.14 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0));
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.beginPath(); c.moveTo(x - M * 1.1, my); c.lineTo(x + M * 1.1, my); c.lineTo(x + M * 2.2, y); c.lineTo(x - M * 2.2, y); c.closePath(); c.fill();
      for (const s of [-1, 1]) V.neonPath(c, '#bfffee', 1, k * 0.4, () => { c.moveTo(x + s * M * 0.6, my + M); c.lineTo(x + s * M * 1.6, y - 6); });
      c.restore();
      V.glowAt(c, x, my, M * 2.8, GROVE_TEAL, 0.55 * k); V.glowAt(c, x, y, M * 2.4, GROVE_TEAL, 0.35 * k);
      c.save(); c.translate(x, my); c.rotate(-0.6); c.globalAlpha = k; c.fillStyle = '#dffff6';
      c.beginPath(); c.arc(0, 0, M, 0.7, TAU - 0.7); c.arc(M * 0.45, 0, M * 0.8, TAU - 1.15, 1.15, true); c.closePath(); c.fill();
      c.restore(); c.globalAlpha = 1;
    } });
  }
  // the moon pool: a teal pool ringed with stones and small flowers, ripples running across it and a crescent shining
  // in it, inside a faint ring of its reach (r)
  function groveMoonPool(x, y, o = {}) {
    const r = o.r ?? 150, dur = o.dur ?? 12, pr = r * 0.5, flat = 0.55;
    const stones = Array.from({ length: 9 }, (_, i) => ({ a: i * TAU / 9 + rand(-0.15, 0.15), s: rand(5, 8), at: 0.1 + i * 0.03, pts: [rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1), rand(0.7, 1)] }));
    const blooms = Array.from({ length: 6 }, (_, i) => ({ a: i * TAU / 6 + 0.35, col: i % 2 ? '#ffc0dc' : GROVE_CREAM }));
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const T = p * dur, g = easeOut(Math.min(1, T / 0.5)), k = e.a * Math.min(1, T / 0.2, (dur - T) / 0.8);
      V.neonRing(c, x, y, r * g, GROVE_TEAL, 1.6, k * 0.35, flat);
      c.save(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(x, y, 0, x, y, pr); gr.addColorStop(0, rgba(GROVE_TEAL, 0.22 * k)); gr.addColorStop(1, rgba(GROVE_TEAL, 0.06 * k));
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, pr * g, pr * g * flat, 0, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 2; i++) { const q = (t * 0.4 + i * 0.5) % 1; V.neonRing(c, x, y, pr * (0.2 + 0.75 * q), GROVE_TEAL, 1, k * 0.35 * (1 - q), flat); }
      V.neonRing(c, x, y, pr * g, GROVE_TEAL, 1.8, k * 0.55, flat);
      // the crescent shining in the water
      c.save(); c.translate(x, y); c.scale(1, flat); c.rotate(-0.6); c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * (0.3 + 0.08 * Math.sin(t * 2)); c.fillStyle = '#bfffee';
      c.beginPath(); c.arc(0, 0, pr * 0.3, 0.7, TAU - 0.7); c.arc(pr * 0.135, 0, pr * 0.24, TAU - 1.15, 1.15, true); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1;
      // stones round the rim, flowers between them
      for (const s of stones) { if (T < s.at) continue; const sg = easeOut(Math.min(1, (T - s.at) / 0.15)), sx = x + Math.cos(s.a) * pr * 1.06, sy = y + Math.sin(s.a) * pr * 1.06 * flat, sz = s.s * sg;
        c.globalAlpha = k * 0.6; c.fillStyle = '#7a8088'; c.strokeStyle = '#1a1622'; c.lineWidth = 1.2; c.beginPath();
        for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.lineTo(sx + Math.cos(a) * sz * s.pts[i], sy + Math.sin(a) * sz * s.pts[i] * 0.7); }
        c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(200,255,240,0.5)'; c.fillRect(sx - sz * 0.4, sy - sz * 0.45, sz * 0.5, sz * 0.25); }
      c.globalAlpha = 1;
      for (const b of blooms) groveFlower(c, x + Math.cos(b.a) * pr * 1.2 * g, y + Math.sin(b.a) * pr * 1.2 * flat * g, 3, b.a + t * 0.2, k * 0.7, b.col);
    }, tick: () => { if (Math.random() < 0.15) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * pr; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * flat, z: 2, vz: rand(18, 40), life: rand(1, 1.6), size: rand(5, 8), size1: 0, color: Math.random() < 0.7 ? GROVE_TEAL : '#eaffff', kind: Math.random() < 0.4 ? 'star' : 'glow' }); } } });
  }
  // Moonwell: plants surge up round the ally's spot, a crescent moon pours its light down, and the moon pool stays
  // for its whole 12s
  ABILITY_VFX.grovekeeper.moonwell = c => {
    const x = c.tx, y = c.ty;
    groveVines(x, y, { r: 120, n: 10, h: 64, dur: 1.2 });
    groveMoon(x, y, { dur: 1.4, h: 180, r: 27 });
    c.later(0.25, () => {
      groveMoonPool(x, y, { r: 150, dur: 11.75 });
      V.shock(x, y, { r: 160, color: GROVE_TEAL, dur: 0.5, w: 5 });
      V.burst(x, y - 20, { color: GROVE_TEAL, color2: '#eaffff', n: 10, speed: 160, kind: 'star', flash: false });
    });
  };
  // Wrath: thorned roots burst up under the target, a little earth thrown up, the floor cracked for a moment
  ABILITY_VFX.grovekeeper.wrath = c => {
    V.glint(c.tx, c.ty, { color: '#e8ffb0', size: 18, z: 12 });
    c.later(0.05, () => {
      groveThorns(c.tx, c.ty, { n: 7, r: 36, h: 54, dur: 0.65 });
      groveRoots(c.tx, c.ty, { r: 62, n: 6, dur: 1.3, grow: 0.1, glow: 0.35, a: 0.22 });
      V.shock(c.tx, c.ty, { r: 70, color: GROVE_GOLD, dur: 0.3, w: 3 });
      V.debris(c.tx, c.ty, { n: 4, color: '#5a4a32', up: 0.7 });
    });
  };

  // ---------------------------------------------------------------- Chronomancer (violet, deep blue, gold)
  // After the painted sheet (docs/art/vfx-reference/chronomancer.png), each move in three beats. Time Reversal: a great
  // dial spins backwards with ribbon arrows round the caster; crystals and debris implode and burst with ring arrows; a
  // large faint clock face stays on the floor. Its moves (Shift's Slow / Haste rings, Rewind, Paradox, Stasis) are in this
  // block too, below the Ultimate; the boss's Time Stop is BOSS_VFX.timeStop (boss-vfx.js).
  const CHRONO_VIO = '#b48cff', CHRONO_BLUE = '#7aa0ff', CHRONO_GOLD = '#ffd27a', CHRONO_PALE = '#e0d4ff', CHRONO_INK = '#120c28', CHRONO_HASTE = '#ffa63a', CHRONO_DARK = '#2a2050';
  const CHRONO_NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  // CHRONO_ULT_SCALE sizes Time Reversal: its wind-up dial and ribbon arrows, the implosion and burst, the clock left
  // on the floor (the boss's Time Stop face has its own TS_SCALE in boss-vfx.js)
  const CHRONO_ULT_SCALE = 1.6;
  // the twelve numerals painted once per colour, so a dial blits them rather than setting text every frame
  const chronoNumArt = {};
  function chronoNumerals(col) {
    if (chronoNumArt[col]) return chronoNumArt[col];
    const fs = 40;
    return (chronoNumArt[col] = CHRONO_NUM.map(s => {
      const cv = document.createElement('canvas'); let g = cv.getContext('2d'); g.font = `600 ${fs}px Georgia, serif`;
      const w = Math.ceil((g.measureText(s).width || fs) + 14), h = fs + 14; cv.width = w; cv.height = h; g = cv.getContext('2d');
      g.font = `600 ${fs}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = col; g.fillText(s, w / 2, h / 2); g.shadowBlur = 0; g.globalAlpha = 0.55; g.fillStyle = '#fffbe8'; g.fillText(s, w / 2, h / 2 - 1);
      return { cv, w, h, fs };
    }));
  }
  // a clock face on the floor: a gold rim, violet and blue inner rings, roman numerals, two hands turning at `spin`
  // (negative: backwards). o.a caps its strength: a face left lying on the floor stays faint over the telegraphs, and
  // its dark middle is only a tint (it is led by its rims). o.form: the rings sweep round into being (alternating ways)
  // and the numerals stamp in one by one over that many seconds. o.rich adds an outer band, minute ticks, a counter-
  // turning gear ring and a small inner ring.
  function chronoDial(x, y, o = {}) {
    const r = o.r ?? 150, dur = o.dur ?? 1, spin = o.spin ?? -1, cap = o.a ?? 1, flat = o.flat ?? 0.62, fin = o.fadeIn ?? 0.12, fout = o.fadeOut ?? 0.4, follow = o.follow, form = o.form || 0, rich = o.rich;
    const nums = o.numerals !== false ? chronoNumerals(o.numCol || CHRONO_GOLD) : null;
    return V.fx({ dur, layer: 'ground', delay: o.delay, draw: (c, p, t, e) => {
      const T = p * dur, cx = follow ? follow.x : x, cy = follow ? follow.y : y;
      const k = e.a * cap * Math.min(1, T / fin, (dur - T) / fout), R = r * (form ? 0.9 + 0.1 * easeOut(Math.min(1, T / form)) : 0.8 + 0.2 * easeOut(Math.min(1, T / 0.3)));
      if (k <= 0.01) return;
      const sweep = i => (form ? Math.max(0, Math.min(1, (T - i * form * 0.12) / (form * 0.55))) : 1);
      const ring = (i, rr, col, w, a) => { const f = sweep(i); if (f <= 0) return; if (f >= 1) { V.neonRing(c, cx, cy, rr, col, w, a, flat); return; }
        const a0 = -Math.PI / 2, dir = i % 2 ? -1 : 1; V.neonPath(c, col, w, a, () => c.ellipse(cx, cy, rr, rr * flat, 0, a0, a0 + dir * TAU * f, dir < 0)); };
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.globalAlpha = 0.16 * k * sweep(0); c.fillStyle = '#1a1648'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.restore();
      ring(0, R, CHRONO_GOLD, 2.6, k);
      if (rich) ring(1, R * 1.07, CHRONO_VIO, 1, k * 0.7);
      ring(2, R * 0.9, CHRONO_VIO, 1.2, k * 0.8);
      if (rich) ring(3, R * 0.62, CHRONO_BLUE, 1.2, k * 0.7);
      ring(4, R * 0.45, CHRONO_BLUE, 1, k * 0.6);
      if (rich) ring(5, R * 0.18, CHRONO_GOLD, 1.2, k * 0.8);
      c.save(); c.translate(cx, cy); c.scale(1, flat); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      c.strokeStyle = CHRONO_GOLD; c.globalAlpha = 0.8 * k * sweep(1);
      c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i < 12; i += 3) { const a = i * TAU / 12 - Math.PI / 2; c.moveTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88); c.lineTo(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99); } c.stroke();
      c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 12; i++) { if (i % 3 === 0) continue; const a = i * TAU / 12 - Math.PI / 2; c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97); } c.stroke();
      if (rich) {
        c.globalAlpha = 0.55 * k * sweep(2); c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i * TAU / 60; c.moveTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); } c.stroke();
        c.strokeStyle = CHRONO_BLUE; c.globalAlpha = 0.6 * k * sweep(3); c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24 - t * spin * 0.6; c.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55); c.lineTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62); } c.stroke();
      }
      if (nums) {
        const sz = Math.max(10, R * 0.12);
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 - Math.PI / 2, at0 = form ? form * (0.15 + 0.6 * ((12 - i) % 12) / 12) : 0, q = form ? Math.min(1, Math.max(0, (T - at0) / 0.08)) : 1; if (q <= 0) continue;
          const n = nums[i], sc = sz / n.fs * (1 + 0.6 * (1 - q));
          c.save(); c.translate(Math.cos(a) * R * 0.77, Math.sin(a) * R * 0.77); c.rotate(a + Math.PI / 2); c.globalAlpha = 0.9 * k * q; c.drawImage(n.cv, -n.w * sc / 2, -n.h * sc / 2, n.w * sc, n.h * sc); c.restore();
        }
      }
      const hand = (a, len, w, col) => { c.globalAlpha = k; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke(); };
      hand(-Math.PI / 2 + t * spin * 6, R * 0.7, rich ? 2.6 : 2, '#ffffff'); hand(-Math.PI / 2 + 2 + t * spin, R * 0.45, rich ? 5 : 4, CHRONO_GOLD);
      c.restore();
      V.glowAt(c, cx, cy, rich ? 16 : 10, '#ffffff', k);
    } });
  }
  // a band along an arc, thin at its tail (a1) and full at its head (a2); with dir it ends in an arrowhead
  function chronoBand(c, R, a1, a2, w, dir) {
    c.beginPath();
    for (let i = 0; i <= 10; i++) { const q = i / 10, a = a1 + (a2 - a1) * q, rr = R + w * 0.5 * q; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    if (dir) { const s = Math.sign(a2 - a1) || 1, hw = w * 1.1; c.lineTo(Math.cos(a2) * (R + hw), Math.sin(a2) * (R + hw)); c.lineTo(Math.cos(a2 + s * 0.22) * R, Math.sin(a2 + s * 0.22) * R); c.lineTo(Math.cos(a2) * (R - hw), Math.sin(a2) * (R - hw)); }
    for (let i = 10; i >= 0; i--) { const q = i / 10, a = a1 + (a2 - a1) * q, rr = R - w * 0.5 * q; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  // ribbon arrows sweeping round a point (dir -1: backwards), gold, violet, blue; o.inward draws them in to the centre
  function chronoArrows(x, y, o = {}) {
    const r = o.r ?? 120, dur = o.dur ?? 1, dir = o.dir ?? -1, n = Math.min(o.n ?? 4, 6), sp = o.speed ?? 6, follow = o.follow, inward = o.inward, ws = o.w ?? 1;
    const cols = o.cols || [CHRONO_GOLD, CHRONO_VIO, CHRONO_BLUE, CHRONO_PALE];
    const arr = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.2, 0.2), rr: rand(0.8, 1.12), h: rand(6, 30) * ws, w: rand(8, 12) * ws, col: cols[i % cols.length], span: rand(1.4, 2) }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const cx = follow ? follow.x : x, cy = follow ? follow.y : y, k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.3);
      const shrink = inward ? 1 - 0.6 * easeOut(p) : 0.85 + 0.15 * easeOut(Math.min(1, p / 0.3));
      for (const b of arr) {
        const R = r * b.rr * shrink, a2 = b.a + dir * t * sp, a1 = a2 - dir * b.span;
        c.save(); c.translate(cx, cy - b.h); c.scale(1, 0.5);
        c.globalAlpha = 0.35 * k; c.fillStyle = CHRONO_INK; chronoBand(c, R, a1, a2, b.w + 4, dir);
        c.globalAlpha = 0.85 * k; c.fillStyle = b.col; chronoBand(c, R, a1, a2, b.w, dir);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 * k; c.fillStyle = '#ffffff'; chronoBand(c, R, a1 + (a2 - a1) * 0.3, a2, b.w * 0.25, 0);
        c.restore();
      }
      c.globalAlpha = 1;
    } });
  }
  // big faceted crystal shards flung out from a point along the floor, turning and falling: a violet or blue body, a
  // white lit facet and edge (o.n at most 14)
  function chronoCrystals(x, y, o = {}) {
    const n = Math.min(o.n ?? 10, 14), sp = o.speed ?? 320, sz = o.size ?? 16, dur = o.dur ?? 0.75, cols = o.cols || [CHRONO_VIO, CHRONO_BLUE, CHRONO_PALE, CHRONO_DARK];
    const sh = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + rand(-0.25, 0.25), s = sp * rand(0.6, 1.1); return { vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(120, 260), r0: rand(0, TAU), vr: rand(-9, 9), L: sz * rand(0.8, 1.4), W: sz * rand(0.35, 0.5), col: cols[i % cols.length] }; });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.35), dr = (1 - Math.exp(-2.2 * t)) / 2.2;
      c.lineJoin = 'round';
      for (const s of sh) {
        const z = Math.max(0, s.vz * t - 420 * t * t), px = x + s.vx * dr, py = y + s.vy * dr - 24 - z;
        c.save(); c.translate(px, py); c.rotate(s.r0 + s.vr * t);
        c.globalAlpha = k * 0.85; c.fillStyle = s.col; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W, 0); c.lineTo(0, s.L * 0.6); c.lineTo(-s.W, 0); c.closePath(); c.fill();
        c.globalAlpha = k * 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W * 0.5, -s.L * 0.1); c.lineTo(0, 0); c.closePath(); c.fill();
        c.globalAlpha = k; c.strokeStyle = s.col === CHRONO_DARK ? CHRONO_VIO : '#f4eeff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -s.L); c.lineTo(s.W, 0); c.lineTo(0, s.L * 0.6); c.lineTo(-s.W, 0); c.closePath(); c.stroke();
        c.restore();
      }
      c.globalAlpha = 1;
    } });
  }
  // crystals and dark debris pulled in to a point, then flung back out with a white-gold pop (o.s scales the shards)
  function chronoImplode(x, y, o = {}) {
    const r = o.r ?? 160, n = Math.min(o.n ?? 14, 20), T = o.t ?? 0.28, s0 = o.s ?? 1, cols = [CHRONO_VIO, CHRONO_BLUE, CHRONO_DARK, CHRONO_GOLD];
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), d = r * rand(0.6, 1), col = cols[i % 4];
      V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: rand(10, 50), vx: -Math.cos(a) * d / T, vy: -Math.sin(a) * d * 0.6 / T, life: T, size: rand(9, 15) * s0, color: col, kind: 'shard', add: col === CHRONO_DARK ? false : undefined, vr: rand(-10, 10), fadeIn: 0.3 }); }
    V.fx({ dur: T, layer: 'air', draw: (c, p, t, e) => V.glowAt(c, x, y - 30, (30 + 50 * p) * s0, CHRONO_PALE, e.a * p * 0.8), done: () => {
      V.flash(x, y - 30, 90 * s0, '#fff2c8', 0.22);
      for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(180, 380) * s0, col = cols[i % 4];
        V.spawn({ x, y, z: 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(60, 200), g: 500, drag: 0.03, life: rand(0.5, 0.8), size: rand(8, 13) * s0, color: col, kind: 'shard', add: col === CHRONO_DARK ? false : undefined, vr: rand(-12, 12) }); }
      V.debris(x, y, { n: 6, color: '#2e2a4a' });
    } });
  }
  // which stance a chronomancer is in isn't sent with the cast: each client keeps a guess on the hero, flipped by each
  // Shift and set by Paradox (back to Slow), Time Lag (Slow) and Time Reversal (Haste). A wrong guess only shows the other colour.
  function chronoStanceFlip(ent) { let h = !ent._chronoHaste; if (FX.now - (ent._chronoSlowAt ?? -9) < 0.6) h = false; ent._chronoHaste = h; return h; }
  // Haste held: a faint orange ring at the feet and speed streaks now and then, until the guess says Slow (30s at most)
  function chronoHasteAura(ent) {
    const id = (ent._chronoAura = (ent._chronoAura || 0) + 1);
    V.fx({ dur: 30, layer: 'ground', draw: (c, p, t, e) => {
      if (ent._chronoAura !== id || !ent._chronoHaste) { e.dur = 0; return; }
      const k = e.a * Math.min(1, t / 0.3, (30 - t) / 1);
      V.neonRing(c, ent.x, ent.y, 30, CHRONO_HASTE, 1.4, k * 0.4, 0.55);
      c.save(); c.translate(ent.x, ent.y); c.scale(1, 0.55); c.rotate(t * 3); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CHRONO_HASTE; c.lineWidth = 1.5; c.globalAlpha = k * 0.5;
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4; c.beginPath(); c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); c.lineTo(Math.cos(a) * 35, Math.sin(a) * 35); c.stroke(); }
      c.restore();
    }, tick: (p, dt, e) => { if (ent._chronoAura === id && ent._chronoHaste && Math.random() < 0.05) V.spawn({ x: ent.x + rand(-20, 20), y: ent.y + rand(-6, 6), z: 4, vz: rand(90, 140), life: 0.45, size: 7, color: CHRONO_HASTE, stretch: 4 }); } });
  }
  // an hourglass (two triangles meeting at the waist), s tall
  function chronoHourglass(c, s) { c.beginPath(); c.moveTo(-s * 0.4, -s * 0.5); c.lineTo(s * 0.4, -s * 0.5); c.lineTo(0, 0); c.closePath(); c.moveTo(-s * 0.4, s * 0.5); c.lineTo(s * 0.4, s * 0.5); c.lineTo(0, 0); c.closePath(); }
  // a translucent figure of light the shape of a hero: an afterimage of a moment ago
  function chronoGhost(c, x, y, s, col, a) {
    if (a <= 0.01) return;
    c.save(); c.translate(x, y); c.scale(s, s); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    c.globalAlpha = Math.min(1, a * 0.35); c.fillStyle = col;
    c.beginPath(); c.arc(0, -36, 6, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-9, -28); c.lineTo(9, -28); c.lineTo(7, -10); c.lineTo(9, 0); c.lineTo(3, 0); c.lineTo(0, -10); c.lineTo(-3, 0); c.lineTo(-9, 0); c.lineTo(-7, -10); c.closePath(); c.fill();
    c.globalAlpha = Math.min(1, a * 0.8); c.strokeStyle = col; c.lineWidth = 1.2 / s; c.stroke();
    c.restore(); c.globalAlpha = 1;
  }
  // the stance taken: a ring under the chronomancer (violet ticking slowly for Slow, orange spinning for Haste), its
  // glyph over the head (an hourglass, or two up arrows), then slow motes hanging or speed streaks shooting up
  function chronoStance(ent, haste) {
    const col = haste ? CHRONO_HASTE : CHRONO_VIO, dur = 1.5, gx = ent.x, gy = ent.y;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.12, (1 - p) / 0.35), x = ent.x, y = ent.y, R = 58 * (0.8 + 0.2 * easeOut(Math.min(1, p / 0.2)));
      V.neonRing(c, x, y, R, col, 2.4, k, 0.55); V.neonRing(c, x, y, R * 0.78, col, 1, k * 0.6, 0.55); V.neonRing(c, x, y, R * 1.12, haste ? '#ffe0a0' : CHRONO_PALE, 0.8, k * 0.45, 0.55);
      c.save(); c.translate(x, y); c.scale(1, 0.55); c.rotate((haste ? 4 : -0.5) * t); c.globalCompositeOperation = 'lighter'; c.strokeStyle = col; c.globalAlpha = k * 0.8;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.lineWidth = i % 3 ? 1 : 2.4; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); c.stroke(); }
      // a short arrow riding the rim the way the stance turns time (Haste forwards, fast; Slow backwards)
      c.fillStyle = col; c.globalAlpha = k * 0.9; chronoBand(c, R * 1.12, haste ? -1.2 : 1.2, 0, 5, haste ? 1 : -1);
      c.restore();
    } });
    V.fx({ dur: 1.1, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.15, (1 - p) / 0.4), x = ent.x, y = ent.y - 84 - (haste ? 18 : 4) * p;
      V.glowAt(c, x, y, 24, col, 0.55 * k);
      c.save(); c.translate(x, y); c.scale(1.35, 1.35);
      if (haste) for (const dx of [-7, 7]) V.neonPath(c, col, 2, k, () => { c.moveTo(dx - 6, 3); c.lineTo(dx, -4); c.lineTo(dx + 6, 3); });
      else V.neonPath(c, col, 1.8, k, () => chronoHourglass(c, 18));
      c.restore();
    } });
    if (haste) for (let i = 0; i < 10; i++) V.spawn({ x: ent.x + rand(-30, 30), y: ent.y + rand(-10, 10), z: rand(4, 34), vx: rand(-40, 40), vz: rand(200, 300), life: 0.42, size: 11, color: i % 2 ? CHRONO_HASTE : '#ffe0a0', stretch: 5 });
    else {
      for (let i = 0; i < 7; i++) V.spawn({ x: ent.x + rand(-32, 32), y: ent.y + rand(-10, 10), z: rand(20, 64), vz: -rand(8, 16), life: 1.2, size: rand(6, 10), size1: 0, color: i % 2 ? CHRONO_VIO : CHRONO_PALE });
      V.fx({ dur: 0.8, layer: 'air', draw: (c, p, t, e) => { chronoGhost(c, gx - 10, gy, 1.3, CHRONO_VIO, e.a * (1 - p) * 0.8); chronoGhost(c, gx - 22, gy, 1.3, CHRONO_BLUE, e.a * (1 - p) * 0.45); } });   // (afterimages left where it stood)
    }
  }
  // the dial spins backwards round the party with ribbon arrows; at the impact the moment freezes (the longest hit-stop
  // of the healers), crystals implode and burst with ring arrows drawn in, and a large faint clock face stays on the floor
  // for the 6s it reached back through. The boss's stutter is KIT_VFX['chrono-undo']; its Time Stop is BOSS_VFX.timeStop.
  ABILITY_VFX.chronomancer.timereversal = c => {
    const at = { x: c.x, y: c.y }, S = CHRONO_ULT_SCALE;
    if (c.cam) c.cam.dim(0.36, 1.4);
    // wind-up: the great dial forms round the caster (rings sweeping round, numerals stamping in), hands racing back;
    // two layers of ribbon arrows counter-turn over it, light gathering in the middle
    chronoDial(at.x, at.y, { r: 150 * S, dur: LAND + 0.25, spin: -9, a: 0.95, fadeOut: 0.25, form: LAND * 0.85, rich: true });
    chronoArrows(at.x, at.y, { r: 135 * S, n: 4, dur: LAND + 0.15, dir: -1, speed: 6, follow: c.ent, w: 1.4 });
    chronoArrows(at.x, at.y, { r: 85 * S, n: 3, dur: LAND + 0.1, dir: 1, speed: 8, follow: c.ent, w: 1.1, cols: [CHRONO_VIO, CHRONO_PALE, CHRONO_BLUE] });
    V.charge(c.x, c.y, { color: CHRONO_PALE, r: 80 * S, n: 12, dur: LAND, follow: c.ent });
    c.later(LAND, () => {
      impact(c.cam, '#e0d4ff', 0.2, 0.12);
      shake(6);
      // impact: everything pulled in, then a white-gold pop, crystal shards and ring arrows thrown back out
      chronoImplode(at.x, at.y, { r: 170 * S, n: 20, s: 1.25 });
      chronoArrows(at.x, at.y, { r: 120 * S, n: 4, dur: 0.6, dir: -1, speed: 10, inward: true, w: 1.3 });
      V.shock(at.x, at.y, { r0: 150 * S, r: 20, color: CHRONO_PALE, dur: 0.3, w: 8 });
      V.fx({ dur: 0.3, layer: 'air', done: () => {
        chronoCrystals(at.x, at.y, { n: 12, speed: 330 * S, size: 20, dur: 0.85 });
        V.shock(at.x, at.y, { r: 140 * S, color: '#fff2c8', dur: 0.45, w: 6 });
        V.shock(at.x, at.y, { r: 175 * S, color: CHRONO_VIO, dur: 0.65, w: 5, delay: 0.06 });
        V.burst(at.x, at.y - 30, { color: '#fff2c8', color2: CHRONO_VIO, n: 16, speed: 320, kind: 'star', flashR: 110 });
      }, draw() {} });
      // aftermath: the clock lies on the floor, rim-led, its hands creeping back, for the 6s it reached through
      chronoDial(at.x, at.y, { r: 170 * S, dur: 6, spin: -0.5, a: 0.4, fadeIn: 0.4, fadeOut: 1, rich: true });
      V.decal(at.x, at.y, { style: 'crack', r: 70 * S, dur: 3, a: 0.3, seed: Math.random() * 6 });
      c.ent._chronoHaste = true; chronoHasteAura(c.ent);   // (it slips the chronomancer into Haste)
    });
  };
  // the boss stutters: a small dial spinning back on it, ring arrows drawn in, glitching streaks, a violet starburst
  KIT_VFX['chrono-undo'] = Object.assign((e, target) => {
    const t = target || e;
    chronoDial(t.x, t.y, { r: 115, dur: 1.3, spin: -8, a: 0.75, numerals: false, rich: true });
    chronoArrows(t.x, t.y, { r: 100, n: 3, dur: 0.8, dir: -1, speed: 9, inward: true, w: 1.2 });
    for (let i = 0; i < 4; i++) { const a = rand(0, TAU), L = rand(50, 90); V.lightning(t.x + Math.cos(a) * L, t.y + Math.sin(a) * L * 0.6, t.x, t.y, { color: i % 2 ? CHRONO_GOLD : CHRONO_VIO, jag: 12, dur: 0.3 }); }
    V.spikeburst(t.x, t.y, { r: 80, n: 14, color: CHRONO_VIO, core: '#ffffff', ink: CHRONO_INK, dur: 0.4, z: 10 });
    V.shock(t.x, t.y, { r: 130, color: CHRONO_PALE, dur: 0.5, w: 6 });
    shake(4);
  }, { atTarget: true });

  // ---- Chronomancer's moves (the sheet's rows under the Ultimate)
  // Shift: the stance's ring and glyph (chronoStance), and Haste's faint ring kept while it lasts
  ABILITY_VFX.chronomancer.shift = c => { const haste = chronoStanceFlip(c.ent); chronoStance(c.ent, haste); if (haste) chronoHasteAura(c.ent); };
  // Rewind: afterimages of light along the path back to the ally, small rings marking each step, a clock turning back
  // under them and a burst as their moment snaps back
  function chronoTrail(sx, sy, w, o = {}) {
    const n = Math.min(o.n ?? 4, 6), dur = o.dur ?? 1.1, tx = w.x, ty = w.y;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, p / 0.1, (1 - p) / 0.4);
      V.neonPath(c, CHRONO_BLUE, 1.6, k * 0.65, () => { c.moveTo(sx, sy); c.lineTo(tx, ty); });
      for (let i = 1; i <= n; i++) { const q = i / (n + 1), px = sx + (tx - sx) * q, py = sy + (ty - sy) * q; V.neonRing(c, px, py, 8, CHRONO_PALE, 1.2, k * 0.75, 0.6); V.glowAt(c, px, py, 4, '#ffffff', k * 0.8); }
    } });
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      for (let i = 0; i < n; i++) {
        const T = p * dur - i * 0.07; if (T <= 0) continue;
        const q = 1 - (i + 1) / (n + 1), a = e.a * Math.min(1, T / 0.12) * Math.min(1, (1 - p) / 0.45) * (1 - i * 0.15);
        chronoGhost(c, sx + (tx - sx) * q, sy + (ty - sy) * q, 1.35, i % 2 ? CHRONO_VIO : CHRONO_BLUE, a);
      }
    } });
  }
  ABILITY_VFX.chronomancer.rewind = c => {
    const w = c.tent || { x: c.tx, y: c.ty }, follow = c.tent || null;
    if (Math.hypot(w.x - c.x, w.y - c.y) > 40) chronoTrail(c.x, c.y, w, { n: 4, dur: 1.1 });
    chronoDial(w.x, w.y, { r: 62, dur: 1.05, spin: -6, a: 0.85, numerals: false, follow, rich: true });
    chronoArrows(w.x, w.y, { r: 52, n: 2, dur: 0.6, dir: -1, speed: 9, follow: follow || undefined, w: 0.8 });
    c.later(0.45, () => { V.burst(w.x, w.y - 16, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 12, speed: 190, flashR: 60 }); V.shock(w.x, w.y, { r: 80, color: CHRONO_VIO, dur: 0.38, w: 4 }); V.fx({ dur: 0.35, layer: 'air', draw: (c, p, t, e) => chronoGhost(c, w.x, w.y, 1.35 + 0.4 * p, '#ffffff', e.a * (1 - p)) }); });
  };
  // thin rays of light flung out from a point, violet, gold and white
  function chronoRays(x, y, o = {}) {
    const n = Math.min(o.n ?? 10, 16), r = o.r ?? 100, dur = o.dur ?? 0.35, cols = [CHRONO_VIO, CHRONO_GOLD, '#ffffff', CHRONO_BLUE];
    const rays = Array.from({ length: n }, (_, i) => ({ a: i * TAU / n + rand(-0.15, 0.15), L: r * rand(0.6, 1.1), col: cols[i % 4] }));
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (1 - p), g = easeOut(Math.min(1, p / 0.4));
      for (const ry of rays) V.neonPath(c, ry.col, 2, k, () => { c.moveTo(x + Math.cos(ry.a) * ry.L * 0.2 * g, y + Math.sin(ry.a) * ry.L * 0.12 * g); c.lineTo(x + Math.cos(ry.a) * ry.L * g, y + Math.sin(ry.a) * ry.L * 0.6 * g); });
    } });
  }
  // two orbits crossing on the floor, small nodes riding them
  function chronoOrbits(x, y, o = {}) {
    const R = o.r ?? 100, dur = o.dur ?? 1.6, cap = o.a ?? 0.5;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.15, (1 - p) / 0.45);
      for (let j = 0; j < 2; j++) {
        const rot = j ? 0.45 : -0.45, col = j ? CHRONO_GOLD : CHRONO_VIO;
        c.save(); c.translate(x, y); c.scale(1, 0.6); c.rotate(rot); V.neonPath(c, col, 1.6, k, () => c.ellipse(0, 0, R, R * 0.45, 0, 0, TAU)); c.restore();
        for (let i = 0; i < 2; i++) { const th = t * (j ? 1.8 : -1.8) + i * Math.PI, ex = Math.cos(th) * R, ey = Math.sin(th) * R * 0.45;
          V.glowAt(c, x + ex * Math.cos(rot) - ey * Math.sin(rot), y + (ex * Math.sin(rot) + ey * Math.cos(rot)) * 0.6, 7, col, k); }
      }
    } });
  }
  // Paradox: four afterimages (violet and blue) on a diamond of light close in on the boss, it bursts in a starburst of
  // rays, and two crossing orbits are left on the floor; bigger for more Flux spent. The shift back to Slow.
  KIT_VFX.paradox = Object.assign((e, target, d) => {
    const t = target || e, big = Math.min(1.5, 0.7 + ((d && d.n) || 0) / 120);
    e._chronoHaste = false; e._chronoSlowAt = FX.now;
    const corners = [[-1, 0], [0, -1], [1, 0], [0, 1]].map(([dx, dy], i) => ({ x: t.x + dx * 150 * big, y: t.y + dy * 88 * big, col: i % 2 ? CHRONO_BLUE : CHRONO_VIO }));
    V.shock(e.x, e.y, { r: 85, color: CHRONO_PALE, w: 3, dur: 0.35 });
    V.fx({ dur: 0.3, layer: 'air', draw: (c, p, tt, ef) => {
      const q = easeOut(p) * 0.85, k = ef.a * Math.min(1, p / 0.2), at = g => ({ x: g.x + (t.x - g.x) * q, y: g.y + (t.y - g.y) * q });
      c.setLineDash([8, 6]); V.neonPath(c, CHRONO_PALE, 1.4, k * 0.6, () => { corners.forEach((g, i) => { const P = at(g); i ? c.lineTo(P.x, P.y) : c.moveTo(P.x, P.y); }); c.closePath(); }); c.setLineDash([]);
      for (const g of corners) { const P = at(g); V.glowAt(c, P.x, P.y - 20, 22, g.col, k * 0.5); chronoGhost(c, P.x, P.y, 1.35, g.col, k * (1 - p * 0.4)); }
    }, done: () => {
      V.spikeburst(t.x, t.y, { r: 90 * big, n: 18, color: CHRONO_VIO, core: '#ffffff', ink: CHRONO_INK, dur: 0.4, z: 14 });
      chronoRays(t.x, t.y - 14, { n: 14, r: 145 * big, dur: 0.38 });
      V.burst(t.x, t.y - 14, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 14, speed: 300, kind: 'star', flash: false });
      chronoCrystals(t.x, t.y, { n: 6, speed: 240, size: 12, dur: 0.6 });
      chronoOrbits(t.x, t.y, { r: 130 * big, dur: 1.7, a: 0.5 });
      V.debris(t.x, t.y, { n: 4, color: '#2e2a4a' });
      shake(3);
    } });
  }, { atTarget: true });
  // the Time Lag (Haste run dry): the guess goes back to Slow
  const chronoLag0 = KIT_VFX.lag;
  KIT_VFX.lag = e => { e._chronoHaste = false; if (chronoLag0) chronoLag0(e); };
  // Stasis: the press itself is a glint; holding is a bubble of slowed time round the chronomancer, two orbits riding
  // it, for as long as it holds (KIT_VFX['stasis-hold']); the release bursts it and leaves an hourglass seal on the
  // floor (KIT_VFX['stasis-release'])
  ABILITY_VFX.chronomancer.stasis = c => { V.glint(c.x, c.y - 30, { color: CHRONO_PALE, size: 24, z: 30 }); };
  function chronoShell(ent, dur) {
    const id = (ent._chronoShell = (ent._chronoShell || 0) + 1);
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      if (ent._chronoShell !== id) { e.dur = 0; return; }
      const k = e.a * Math.min(1, t / 0.25) * (t < 0.6 ? 1 : 0.6) * Math.min(1, (dur - t) / 0.3), x = ent.x, y = ent.y - 30, R = 68 * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3)));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, R * 0.5, x, y, R); g.addColorStop(0, rgba(CHRONO_VIO, 0)); g.addColorStop(1, rgba(CHRONO_VIO, 0.22 * k));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); c.restore();
      V.neonRing(c, x, y, R, CHRONO_VIO, 1.6, k * 0.8, 1);
      V.neonRing(c, x, y, R, CHRONO_PALE, 1, k * 0.45, 0.25);
      const mer = Math.cos(t * 1.1);   // (a meridian turning round the bubble, so it reads as a sphere)
      c.save(); c.translate(x, y); V.neonPath(c, CHRONO_PALE, 1, k * 0.4, () => c.ellipse(0, 0, Math.max(1, R * Math.abs(mer)), R, 0, 0, TAU)); c.restore();
      V.neonRing(c, ent.x, ent.y, R * 0.9, CHRONO_VIO, 1.2, k * 0.5, 0.5);
      for (let j = 0; j < 2; j++) {
        const rot = j ? 0.5 : -0.5, col = j ? CHRONO_GOLD : CHRONO_BLUE;
        c.save(); c.translate(x, y); c.rotate(rot); V.neonPath(c, col, 1.4, k * 0.8, () => c.ellipse(0, 0, R * 1.18, R * 0.32, 0, 0, TAU)); c.restore();
        for (let i = 0; i < 2; i++) { const th = t * (j ? 1.6 : -1.3) + i * Math.PI, ex = Math.cos(th) * R * 1.18, ey = Math.sin(th) * R * 0.32;
          const nx = x + ex * Math.cos(rot) - ey * Math.sin(rot), ny = y + ex * Math.sin(rot) + ey * Math.cos(rot);
          V.glowAt(c, nx, ny, 8, col, k); V.neonRing(c, nx, ny, 4, '#ffffff', 1, k * 0.8, 1); }
      }
    } });
  }
  // an hourglass seal on the floor: gold and violet rings, ticks, an hourglass with sand glowing at its foot
  function chronoSeal(x, y, o = {}) {
    const r = o.r ?? 90, dur = o.dur ?? 1.8, cap = o.a ?? 0.6, flat = 0.6;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * cap * Math.min(1, p / 0.12, (1 - p) / 0.45), R = r * (0.85 + 0.15 * easeOut(Math.min(1, p / 0.25)));
      V.neonRing(c, x, y, R, CHRONO_GOLD, 2.2, k, flat); V.neonRing(c, x, y, R * 0.84, CHRONO_VIO, 1.2, k * 0.8, flat);
      c.save(); c.translate(x, y); c.scale(1, flat);
      c.save(); c.rotate(t * 0.5); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CHRONO_GOLD; c.globalAlpha = k * 0.8;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.lineWidth = i % 3 ? 1 : 2; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); c.lineTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); c.stroke(); }
      c.restore();
      V.neonPath(c, CHRONO_GOLD, 1.8, k, () => chronoHourglass(c, R * 0.9));
      c.restore();
      V.glowAt(c, x, y + R * 0.3 * flat, R * 0.2, CHRONO_GOLD, k * 0.7);
    } });
  }
  KIT_VFX['stasis-hold'] = e => {
    chronoShell(e, 8);
    V.shock(e.x, e.y, { r: 80, color: CHRONO_VIO, dur: 0.4, w: 3 });
    V.motes(e.x, e.y, { color: CHRONO_PALE, n: 8, r: 34 });
  };
  KIT_VFX['stasis-release'] = e => {
    e._chronoShell = (e._chronoShell || 0) + 1;   // (ends the bubble)
    V.flash(e.x, e.y - 28, 60, CHRONO_PALE, 0.2);
    V.burst(e.x, e.y - 28, { color: CHRONO_PALE, color2: CHRONO_GOLD, n: 14, speed: 260, kind: 'star', flash: false });
    V.shock(e.x, e.y, { r: 190, color: CHRONO_PALE, w: 6, dur: 0.6 });
    chronoCrystals(e.x, e.y, { n: 8, speed: 260, size: 12, dur: 0.6, cols: [CHRONO_VIO, CHRONO_PALE, CHRONO_GOLD] });
    chronoSeal(e.x, e.y, { r: 118, dur: 1.9 });
    V.motes(e.x, e.y, { color: '#fff2c8', n: 10, r: 70 });
  };

  // ---------------------------------------------------------------- Alembist · Magnum Opus (brass and glass, every reagent)
  // After the painted sheet (docs/art/vfx-reference/alembist.png): a great brass-and-glass flask hovers over the party
  // in a turning hex circle, ribbons of green, red and blue round it (wind-up); beams and vials of every colour rain
  // down onto the party while the flask hurls its orb at the boss (impact); a wide multicolour hex seal stays on the
  // floor, low, for the shield's 10s (aftermath).
  // ALEM_ULT_SCALE: the whole Ultimate's size (flask, circle, beams, seal, orb burst). 1 = the first painted pass.
  const ALEM_ULT_SCALE = 1.4;
  const AMBER = '#ffd27a', BRASS = '#d9a54a', TEAL = '#4fe0cc', OPUS3 = ['#5ff08a', '#ff4a32', '#4fa8ff'];
  // OPUS_H: the flask's height over the party's feet; OPUS_FS: the flask drawing's scale; OPUS_TIP: its spout's tip
  const OPUS_FS = 1.6 * ALEM_ULT_SCALE, OPUS_H = 120 + 45 * ALEM_ULT_SCALE, OPUS_TIP = OPUS_H - 30 * OPUS_FS;
  // the party as live entities (Stagecraft's view of the raid; capped), else just the alembist
  function alemOpusParty(ent) {
    const sc = typeof Stagecraft !== 'undefined' && Stagecraft.S ? Stagecraft.S.env : null, out = [];
    if (sc && !sc.town && Array.isArray(sc.units) && sc.entById) for (const u of sc.units) { const w = sc.entById(u.id) || u; if (w && Number.isFinite(w.x)) out.push(w); if (out.length >= 8) break; }
    return out.length ? out : [ent];
  }
  // where the flask hangs: over the middle of the party, never more than 200 px from the alembist
  function alemOpusCentre(ent) {
    const ps = alemOpusParty(ent); let x = 0, y = 0;
    for (const w of ps) { x += w.x; y += w.y; }
    x /= ps.length; y /= ps.length;
    const dx = x - ent.x, dy = y - ent.y, d = Math.hypot(dx, dy), m = d > 200 ? 200 / d : 1;
    return { x: ent.x + dx * m, y: ent.y + dy * m };
  }
  // the great flask at (at.x, at.y - OPUS_H), drawn OPUS_FS times its sketch size: a teal glass bulb with green, red and
  // blue liquid swirling inside, a dark rim and brass cage, collar, cap and a long brass spout (the beams leave from its
  // tip, OPUS_TIP over the floor), glints running over the glass, two brass armillary rings turning round it (their back
  // halves behind the glass) and ribbons of green, red and blue circling. After o.hold s it fades back to half so the
  // boss and the party read through it
  function alemOpusFlask(at, o = {}) {
    const dur = o.dur ?? 1, hold = o.hold ?? dur, F = OPUS_FS, RX = 44 * F * 0.62, RY = 13 * F * 0.62;
    const ring = (x, y, i, t, k, back) => {
      c0.save(); c0.translate(x, y); c0.rotate(i ? 0.5 + t * 0.8 : -0.4 - t * 0.6); c0.globalAlpha = k * (back ? 0.55 : 1);
      const a0 = back ? Math.PI : 0;
      c0.strokeStyle = '#4a3010'; c0.lineWidth = 5.5; c0.beginPath(); c0.ellipse(0, 0, RX, RY, 0, a0, a0 + Math.PI); c0.stroke();
      c0.strokeStyle = BRASS; c0.lineWidth = 3.6; c0.stroke(); c0.strokeStyle = '#fff0c0'; c0.lineWidth = 1.1; c0.stroke();
      if (!back) for (let j = 0; j < 4; j++) { const a = 0.4 + j * 0.75; c0.fillStyle = '#ffe9a8'; c0.beginPath(); c0.arc(Math.cos(a) * RX, Math.sin(a) * RY, 2.4, 0, TAU); c0.fill(); }
      c0.restore(); c0.globalAlpha = 1;
    };
    let c0 = null;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      c0 = c;
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.3) * (t > hold ? Math.max(0.5, 1 - (t - hold) / 0.4) : 1), rise = easeOut(Math.min(1, t / 0.35));
      const x = at.x, y = at.y - OPUS_H * (0.8 + 0.2 * rise) + Math.sin(t * 3) * 3;
      V.glowAt(c, x, y, 70 * F, TEAL, 0.45 * k); V.glowAt(c, x, y, 26 * F, '#ffffff', 0.3 * k);
      for (let i = 0; i < 2; i++) ring(x, y, i, t, k, true);
      c.save(); c.translate(x, y); c.scale(F, F); c.globalAlpha = k;
      // the spout: a long brass cone, its tip glowing
      c.fillStyle = '#8a5e22'; c.strokeStyle = '#2a1a08'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-7, 12); c.lineTo(7, 12); c.lineTo(0, 30); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = BRASS; c.fillRect(-8, 11, 16, 3);
      const g = c.createRadialGradient(-5, -5, 2, 0, 0, 17);
      g.addColorStop(0, '#e8fffa'); g.addColorStop(0.4, '#4fd4c2'); g.addColorStop(1, '#0a3236');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
      // the liquid: three colours swirling in the lower half, a bright surface line
      c.save(); c.beginPath(); c.arc(0, 0, 14.5, 0, TAU); c.clip(); c.globalCompositeOperation = 'lighter';
      OPUS3.forEach((col, i) => { c.globalAlpha = 0.85 * k; c.fillStyle = col; c.beginPath(); c.ellipse(Math.cos(t * 5 + i * 2.1) * 6, 5 + Math.sin(t * 4 + i) * 4, 10, 4.5, t * 3 + i, 0, TAU); c.fill(); });
      c.globalAlpha = 0.7 * k; c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.beginPath();
      for (let j = 0; j <= 12; j++) { const px = -15 + j * 2.5, py = -1 + Math.sin(j * 0.9 + t * 7) * 1.2; j ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      c.restore(); c.globalAlpha = k;
      c.strokeStyle = '#1a2a24'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.stroke();
      // the brass cage: an equator band and two meridians
      c.strokeStyle = BRASS; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 2, 16, 4.5, 0, 0, Math.PI); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 6, 16, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); c.beginPath(); c.ellipse(0, 0, 6, 16, 0, Math.PI / 2, Math.PI * 1.5); c.stroke();
      c.fillStyle = 'rgba(200,240,240,0.8)'; c.fillRect(-4, -27, 8, 13); c.strokeStyle = '#1a2a24'; c.lineWidth = 1; c.strokeRect(-4, -27, 8, 13);
      c.fillStyle = BRASS; c.fillRect(-7, -17, 14, 3.5); c.fillRect(-5.5, -30, 11, 4.5); c.beginPath(); c.arc(0, -32, 2.8, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-7, -6, 3, 6.5, -0.5, 0, TAU); c.fill();
      c.restore(); c.globalAlpha = 1;
      for (let i = 0; i < 2; i++) ring(x, y, i, t, k, false);
      // glints sliding over the glass and the spout's tip burning
      for (let i = 0; i < 2; i++) { const a = t * 2.2 + i * 2.8, gx = x + Math.cos(a) * 11 * F, gy = y + Math.sin(a) * 9 * F, s = (7 + 3 * Math.sin(t * 9 + i)) * F * 0.5;
        V.neonPath(c, '#ffffff', 1.4, k * 0.9, () => { c.moveTo(gx - s, gy); c.lineTo(gx + s, gy); c.moveTo(gx, gy - s); c.lineTo(gx, gy + s); }); }
      V.glowAt(c, x, y + 30 * F, 9 * F, TEAL, k); V.glowAt(c, x, y + 30 * F, 4 * F, '#ffffff', k);
      OPUS3.forEach((col, i) => { const a0 = t * 4.5 + i * 2.09; V.neonPath(c, col, 5, 0.9 * k, () => { for (let j = 0; j <= 14; j++) { const a = a0 - 2.1 + 2.1 * j / 14, px = x + Math.cos(a) * 34 * F, py = y + 8 * F - j * 1.6 + Math.sin(a) * 11 * F; j ? c.lineTo(px, py) : c.moveTo(px, py); } }); });
    }, tick: () => { if (Math.random() < 0.35) V.spawn({ x: at.x + rand(-1, 1) * 22 * F, y: at.y, z: OPUS_H + rand(-14, 14) * F, vz: rand(-20, 20), life: 0.6, size: rand(6, 10), size1: 0, color: OPUS3[Math.floor(Math.random() * 3)], kind: 'star' }); } });
  }
  // the hex seal: brass rings, a hexagram of a green and a red triangle, a blue inner hexagon, little reagent circles at
  // its points. o.mono: all brass (the wind-up circle). It flares, then settles to o.settle (floor-low)
  // (o.w: a line-weight multiplier)
  function alemOpusSeal(x, y, R, dur, o = {}) {
    const peak = o.peak ?? 0.8, settle = o.settle ?? 0.26, W = o.w ?? 1;
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, t / 0.15) * Math.min(1, (1 - p) * dur / 0.8) * (settle + (peak - settle) * Math.max(0, 1 - t / 0.8));
      if (k < 0.02) return;
      const RR = R * (0.7 + 0.3 * easeOut(Math.min(1, t / 0.3))), cs = o.mono ? [BRASS, BRASS, BRASS] : OPUS3;
      V.neonRing(c, x, y, RR, BRASS, 2.6 * W, k, 0.78); V.neonRing(c, x, y, RR * 0.9, AMBER, 1.2 * W, k * 0.7, 0.78);
      c.save(); c.translate(x, y); c.scale(1, 0.78); c.rotate(t * (o.spin ?? 0.15));
      const poly = (n, off, r, col, w) => V.neonPath(c, col, w * W, k, () => { for (let i = 0; i < n; i++) { const a = off + i * TAU / n; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); });
      poly(3, -Math.PI / 2, RR * 0.78, cs[0], 2); poly(3, Math.PI / 2, RR * 0.78, cs[1], 2); poly(6, 0, RR * 0.45, cs[2], 1.6);
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; V.neonPath(c, cs[i % 3], 1.4 * W, k, () => c.arc(Math.cos(a) * RR * 0.78, Math.sin(a) * RR * 0.78, RR * 0.09, 0, TAU)); }
      V.neonPath(c, AMBER, 1.2 * W, k * 0.8, () => c.arc(0, 0, RR * 0.16, 0, TAU));
      // tick marks round the rim (the sheet's dial), and a small hex at the heart
      V.neonPath(c, BRASS, 0.9 * W, k * 0.6, () => { for (let i = 0; i < 24; i++) { const a = i * TAU / 24, r0 = RR * (i % 2 ? 0.93 : 0.9); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * RR * 0.98, Math.sin(a) * RR * 0.98); } });
      poly(6, Math.PI / 6, RR * 0.2, AMBER, 1);
      c.restore();
    } });
  }
  // a beam of one reagent from the flask's spout down onto an ally
  // a beam of one reagent from the flask's spout down onto an ally: a thick tapered shaft of the colour with a white
  // core, a pool of its light round their feet
  function alemOpusBeam(tip, w, col, delay) {
    const AS = ALEM_ULT_SCALE, d0 = Math.hypot(w.x - tip.x, w.y - tip.y) || 1, from = { x: tip.x + (w.x - tip.x) / d0 * 10 * AS, y: tip.y + (w.y - tip.y) / d0 * 10 * AS };   // fanned out off the spout
    V.fx({ dur: 0.7, delay, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * Math.min(1, (1 - p) / 0.6) * Math.min(1, t / 0.05), tx = w.x, ty = w.y - 6, q = Math.min(1, t / 0.08);
      const ex = from.x + (tx - from.x) * q, ey = from.y + (ty - from.y) * q, L = Math.hypot(ex - from.x, ey - from.y) || 1, nx = -(ey - from.y) / L, ny = (ex - from.x) / L;
      const W0 = 3 * AS * (1 - p * 0.5), W1 = 12 * AS * (1 - p * 0.5);
      // the colour body is painted over (not added) so green, red and blue crossing stay their own colours, not white
      c.save();
      for (const [cc, f, al, add] of [[col, 1.8, 0.3, 1], [col, 1, 0.85, 0], ['#ffffff', 0.2, 0.75, 1]]) { c.globalCompositeOperation = add ? 'lighter' : 'source-over'; c.globalAlpha = al * k; c.fillStyle = cc; c.beginPath();
        c.moveTo(from.x + nx * W0 * f, from.y + ny * W0 * f); c.lineTo(ex + nx * W1 * f, ey + ny * W1 * f); c.lineTo(ex - nx * W1 * f, ey - ny * W1 * f); c.lineTo(from.x - nx * W0 * f, from.y - ny * W0 * f); c.closePath(); c.fill(); }
      c.restore(); c.globalAlpha = 1;
      if (q >= 1) { V.glowAt(c, tx, ty, 34 * AS, col, 0.8 * k); V.glowAt(c, tx, ty, 12 * AS, '#ffffff', 0.7 * k); }
    } });
  }
  // a vial of one colour streaking down out of the flask's light and popping on the floor
  function alemOpusDrop(x, y, col, delay) {
    const AS = ALEM_ULT_SCALE;
    V.fx({ dur: 0.3, delay, layer: 'air', draw: (c, p, t, e) => { const z = 240 * AS * (1 - p * p); V.neonPath(c, col, 3 * AS, e.a, () => { c.moveTo(x, y - z - 40 * AS); c.lineTo(x, y - z); });
      c.save(); c.globalAlpha = e.a; c.fillStyle = col; c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - z, 3.5 * AS, 4.5 * AS, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); c.globalAlpha = 1;
      V.glowAt(c, x, y - z, 10 * AS, '#ffffff', e.a); },
      done: () => { V.spawn({ x, y, z: 4, life: 0.35, size: 30 * AS, size1: 6, color: col }); V.sparks(x, y, { color: col, n: 3, speed: 160, z: 2 }); } });
  }
  // wind-up: the flask hovers in over the party in a brass hex circle; impact: beams of green, red and blue onto every
  // ally and vials raining across the circle; aftermath: the multicolour seal. Its orb on the boss is KIT_VFX['alem-opus'].
  ABILITY_VFX.alembist.magnumopus = c => {
    const at = alemOpusCentre(c.ent);
    if (c.cam) c.cam.dim(0.3, 1.3);
    const AS = ALEM_ULT_SCALE;
    alemOpusFlask(at, { dur: LAND + 1.1, hold: LAND + 0.45 });
    alemOpusSeal(at.x, at.y, 120 * AS, LAND + 0.2, { mono: true, peak: 0.95, settle: 0.95, spin: 1.2, w: 1.3 });
    OPUS3.forEach(col => V.charge(at.x, at.y, { color: col, r: 80 * AS, n: 4, dur: LAND, z: OPUS_H }));
    V.ribbons(at.x, at.y, { r: 70 * AS, dur: LAND + 0.3, colors: OPUS3 });
    V.swirl(c.x, c.y, { r: 46, color: AMBER, dur: LAND, follow: c.ent, inward: true, arms: 3 });
    c.later(LAND, () => {
      impact(c.cam, '#eafff4', 0.2);
      shake(5);
      const tip = { x: at.x, y: at.y - OPUS_TIP };
      V.flash(tip.x, tip.y - 20 * AS, 70 * AS, TEAL, 0.2);
      // every ally gets a thick beam of one colour and a thinner one of the next (green, red, blue round the party)
      alemOpusParty(c.ent).forEach((w, i) => {
        const col = OPUS3[i % 3];
        alemOpusBeam(tip, w, col, i * 0.05);
        alemOpusBeam({ x: tip.x + (i % 2 ? 8 : -8) * AS, y: tip.y }, { x: w.x + (i % 2 ? -10 : 10), y: w.y + 4 }, OPUS3[(i + 1) % 3], i * 0.05 + 0.1);
        c.later(i * 0.05 + 0.08, () => { V.plus(w.x, w.y, { color: col, n: 3 }); V.shock(w.x, w.y, { r: 46 * AS, color: col, dur: 0.4, w: 4 }); });
      });
      for (let i = 0; i < 12; i++) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * 140 * AS; alemOpusDrop(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.7, OPUS3[i % 3], 0.04 + i * 0.035); }
      V.shock(at.x, at.y, { r: 170 * AS, color: BRASS, dur: 0.6, w: 7 });
      c.later(0.5, () => V.burst(at.x, at.y, { color: TEAL, color2: '#ffffff', n: 10, speed: 160, z: OPUS_TIP, kind: 'star', flash: false }));
      alemOpusSeal(at.x, at.y, 150 * AS, 10, { peak: 0.95, settle: 0.36, w: 1.4 });
    });
  };
  // the flask hurls its orb at the boss: it bursts in red, green and blue (layered spikebursts), sparks of every vial
  // poured in (d.p: their recipes), three coloured rings and a small scorch that cools quickly
  KIT_VFX['alem-opus'] = Object.assign((e, target, d) => {
    const t = target || e, ps = d && Array.isArray(d.p) ? d.p.slice(0, 5) : [], at = alemOpusCentre(e);
    const cols = ps.length ? ps.map(r => (typeof alemInfo !== 'undefined' ? alemInfo(r).color : AMBER)) : OPUS3;
    const AS = ALEM_ULT_SCALE;
    V.missile(at.x, at.y - OPUS_TIP, t.x, t.y, { style: 'orb', color: TEAL, speed: 1500, size: 1.6 * AS, arc: 30, onHit: (x, y) => {
      V.flash(x, y - 20, 90 * AS, '#ffffff', 0.16);
      V.spikeburst(x, y, { r: 92 * AS, n: 18, color: OPUS3[1], core: '#fff6d8', ink: '#3a0a08', dur: 0.5 });
      V.spikeburst(x, y, { r: 62 * AS, n: 14, color: OPUS3[0], core: '#ffffff', ink: '#0a2a10', dur: 0.45, z: 20 });
      V.spikeburst(x, y, { r: 38 * AS, n: 12, color: OPUS3[2], core: '#ffffff', ink: '#0a1a3a', dur: 0.4, z: 26 });
      V.fx({ dur: 0.45, layer: 'air', draw: (c, p, tt, ee) => { const k = ee.a * (1 - p); OPUS3.forEach((col, i) => V.glowAt(c, x + Math.cos(i * 2.1 + p * 3) * 18 * AS, y - 30 + Math.sin(i * 2.1 + p * 3) * 10 * AS, 46 * AS, col, 0.7 * k)); } });
      cols.forEach(col => V.burst(x, y, { color: col, n: 5, speed: 340, flash: false }));
      OPUS3.forEach((col, i) => V.shock(x, y, { r: (120 + i * 30) * AS, color: col, dur: 0.55, w: 7 - i, delay: i * 0.06 }));
      V.crater(x, y, { r: 50 * AS, color: '#ff8a3a', dur: 2.5, flames: 2, a: 0.35 });
      V.smoke(x, y, { n: 5, r: 40, color: '#5a4a3a', size: 30, a: 0.4, speed: 50, life: 1.4 });
      shake(5);
    } });
  }, { atTarget: true });

  // ---------------------------------------------------------------- Threadweaver · Grand Loom (crimson and gold threads)
  // After the painted sheet (docs/art/vfx-reference/threadweaver.png): five spear-tip anchors stab up round the party
  // and crimson threads draw a taut pentagram between them, tied to every ally (wind-up); the web flares white and two
  // bright lances cross through the boss (impact, KIT_VFX['weave-loom']); a woven diamond sigil of crimson and gold
  // stays on the floor, low, for the Tapestry's 6s (aftermath; THREADWEAVER_VFX, from the class block).
  const CRIM = '#e8203a', ROSE = '#ff5a6a', SEAM = '#ffcf7a', HOT = '#fff0ea', SILK = '#ffe0e4';
  // WEAVE_ULT_SCALE: the whole Ultimate's size (web, anchors, lances, seal). 1 = the first painted pass.
  const WEAVE_ULT_SCALE = 1.3;
  // the party as live entities (Stagecraft's view of the raid; capped), else just the weaver
  function weaveParty(ent) {
    const sc = typeof Stagecraft !== 'undefined' && Stagecraft.S ? Stagecraft.S.env : null, out = [];
    if (sc && !sc.town && Array.isArray(sc.units) && sc.entById) for (const u of sc.units) { const w = sc.entById(u.id) || u; if (w && Number.isFinite(w.x)) out.push(w); if (out.length >= 8) break; }
    return out.length ? out : [ent];
  }
  // the web's frame: the party's middle (near the weaver) and five anchors round it, wide enough to take everyone in
  function weaveLoomFrame(ent) {
    const ps = weaveParty(ent); let x = 0, y = 0;
    for (const w of ps) { x += w.x; y += w.y; }
    x /= ps.length; y /= ps.length;
    const dx = x - ent.x, dy = y - ent.y, dd = Math.hypot(dx, dy), m = dd > 200 ? 200 / dd : 1;
    x = ent.x + dx * m; y = ent.y + dy * m;
    const WS = WEAVE_ULT_SCALE;
    let R = 120 * WS; for (const w of ps) R = Math.max(R, Math.hypot(w.x - x, (w.y - y) / 0.78) + 50 * WS);
    R = Math.min(R, 200 * WS);
    const anchors = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * TAU / 5; return { x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 0.78 }; });
    return { x, y, R, ps, anchors };
  }
  // the web on the floor: a pentagram between the anchors, a gold pentagon round them and a thread from every ally to
  // the two anchors nearest them; drawn out through the wind-up, growing tauter, flaring white at the impact
  // (painted sheet: bold doubled crimson threads with a gold core, slack at first and pulled taut through the wind-up,
  // spokes from the middle, a dark red ground under the star for the wind-up only; at the impact every line flares
  // white-hot and wide for a moment, glowing at the anchors, then cools)
  function weaveLoomWeb(F, dur) {
    const A = F.anchors, WS = WEAVE_ULT_SCALE, C = { x: F.x, y: F.y };
    const star = A.map((a, i) => [a, A[(i + 2) % 5]]), rim = A.map((a, i) => [a, A[(i + 1) % 5]]), spokes = A.map(a => [C, a]);
    const links = [];
    for (const u of F.ps) { const near = A.map(a => [Math.hypot(a.x - u.x, a.y - u.y), a]).sort((m, n) => m[0] - n[0]); links.push([u, near[0][1]], [u, near[1][1]]); }
    V.fx({ dur, layer: 'ground', draw: (c, p, t, e) => {
      const grow = easeOut(Math.min(1, t / (LAND * 0.6))), tight = easeOut(Math.max(0, Math.min(1, (t - 0.1) / (LAND - 0.12))));
      const hot = Math.max(0, Math.min(1, (t - LAND + 0.06) / 0.08)), flare = hot * (1 - Math.max(0, Math.min(1, (t - LAND) / 0.35)));
      const k = e.a * Math.min(1, t / 0.08) * Math.min(1, (dur - t) / 0.3);
      const sag = 18 * WS * (1 - tight) + Math.sin(t * 50) * 1.2 * tight * (1 - hot);   // slack, then trembling taut
      const trace = (segs, off) => () => { for (const [a, b] of segs) {
        const bx = a.x + (b.x - a.x) * grow, by = a.y + (b.y - a.y) * grow, L = Math.hypot(bx - a.x, by - a.y) || 1, nx = -(by - a.y) / L, ny = (bx - a.x) / L;
        c.moveTo(a.x + nx * off, a.y + ny * off); c.quadraticCurveTo((a.x + bx) / 2 + nx * (off + 2 * sag), (a.y + by) / 2 + ny * (off + 2 * sag), bx + nx * off, by + ny * off); } };
      const w = (2.2 + 1.4 * tight) * WS, col = hot > 0.5 ? HOT : CRIM;
      if (t < LAND + 0.25) { c.save(); c.globalAlpha = 0.16 * k * grow * Math.min(1, (LAND + 0.25 - t) / 0.2); c.fillStyle = '#5a0a18'; c.beginPath(); A.forEach((a, i) => (i ? c.lineTo(a.x, a.y) : c.moveTo(a.x, a.y))); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; }
      V.neonPath(c, ROSE, w * 0.35, k * 0.55, trace(spokes, 0));
      V.neonPath(c, hot > 0.5 ? HOT : SEAM, w * 0.6 + 3 * WS * flare, k * 0.85, trace(rim, 0));
      V.neonPath(c, CRIM, w * 0.4, k * 0.6, trace(rim, -4 * WS));
      V.neonPath(c, col, w + 4 * WS * flare, k, trace(star, 0));
      V.neonPath(c, CRIM, w * 0.45, k * 0.8, trace(star, 4.5 * WS));
      V.neonPath(c, SEAM, 1.1 * WS, k * (1 - hot * 0.5), trace(star, 0));
      V.neonPath(c, col, w * 0.5, k * 0.8, trace(links, 0));
      if (flare > 0.01) for (const a of A) { V.glowAt(c, a.x, a.y, 44 * WS, HOT, flare * k); V.glowAt(c, a.x, a.y, 70 * WS, CRIM, 0.6 * flare * k); }
    } });
  }
  // the anchors: a crimson spear tip on a thread shaft standing at each point of the web
  function weaveLoomSpears(F, dur) {
    const WS = WEAVE_ULT_SCALE;
    V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      // each spear stabs down out of the air into its anchor point (staggered), then stands glowing
      const k = e.a * Math.min(1, (dur - t) / 0.25), hot = t > LAND - 0.05, H = 46 * WS, TL = 24 * WS, TW = 7 * WS;
      F.anchors.forEach((a, i) => {
        const q = easeOut(Math.max(0, Math.min(1, (t - i * 0.03) / 0.14))); if (q <= 0) return;
        const drop = (1 - q) * 60 * WS, top = a.y - H - drop, base = a.y - drop * 0.3;
        V.neonRing(c, a.x, a.y, 15 * WS * q, CRIM, 1.6, k * 0.8, 0.5); V.neonRing(c, a.x, a.y, 9 * WS * q, SEAM, 1, k * 0.6, 0.5);
        V.glowAt(c, a.x, top - TL * 0.4, 28 * WS, CRIM, 0.8 * k); V.glowAt(c, a.x, a.y, 20 * WS, ROSE, 0.5 * k * q);
        V.neonPath(c, CRIM, 2.4 * WS, k, () => { c.moveTo(a.x, base); c.lineTo(a.x, top); });
        c.save(); c.globalAlpha = k; c.fillStyle = hot ? HOT : ROSE; c.strokeStyle = '#3a0610'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(a.x, top - TL); c.lineTo(a.x + TW, top - TL * 0.2); c.lineTo(a.x + TW * 0.35, top - TL * 0.1); c.lineTo(a.x, top + 4); c.lineTo(a.x - TW * 0.35, top - TL * 0.1); c.lineTo(a.x - TW, top - TL * 0.2); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = SEAM; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a.x, top - TL + 3); c.lineTo(a.x, top); c.stroke(); c.restore();
        V.glowAt(c, a.x, top - TL * 0.5, 12 * WS, hot ? '#ffffff' : HOT, 0.8 * k);
      });
    } });
  }
  const weaveMe = ent => (ent && ent.kind === 'player' ? (typeof Net !== 'undefined' ? Net.id : 0) : ent && ent.id);
  // this weaver's threads as pairs of entities (the host's list, drawn by stagecraft.js); none outside a raid
  function weaveMine(ent) {
    if (typeof Stagecraft === 'undefined' || !Stagecraft.S || !Stagecraft.S.env) return [];
    const id = weaveMe(ent), env = Stagecraft.S.env, out = [];
    for (const th of Stagecraft.S.threads || []) {
      if (th[2] !== id) continue;
      const A = env.entById(th[0]), B = env.entById(th[1]);
      if (A && B) out.push([A, B]);
    }
    return out;
  }
  // every thread pulled taut and burning: a bright line growing hotter through the wind-up, flaring white at the end
  function weaveTaut(pairs, o = {}) {
    const dur = o.dur ?? LAND;
    for (const [A, B] of pairs) V.fx({ dur, layer: 'air', draw: (c, p, t, e) => {
      const k = e.a * (0.4 + 0.6 * p), w = 1.5 + 4 * p * p;
      V.neonPath(c, p > 0.85 ? '#ffffff' : SILK, w, k, () => { c.moveTo(A.x, A.y - 16); c.lineTo(B.x, B.y - 16); });
      const q = (t * 3) % 1; V.glowAt(c, A.x + (B.x - A.x) * q, A.y - 16 + (B.y - A.y) * q, 8, SEAM, k);
    } });
  }
  // wind-up: the anchors and the web drawn out round the party, her own threads (the host's list) pulled taut; impact:
  // the web and her threads flare white, sparks off the anchors; aftermath: the woven diamond seal. The lances through
  // the boss are KIT_VFX['weave-loom'].
  ABILITY_VFX.threadweaver.grandloom = c => {
    const F = weaveLoomFrame(c.ent), W = globalThis.THREADWEAVER_VFX;
    if (c.cam) c.cam.dim(0.3, 1.3);
    const WS = WEAVE_ULT_SCALE;
    V.charge(c.x, c.y, { color: ROSE, r: 60 * WS, n: 10, dur: LAND, follow: c.ent });
    weaveLoomWeb(F, LAND + 0.55);
    weaveLoomSpears(F, LAND + 0.5);
    weaveTaut(weaveMine(c.ent), { dur: LAND });
    c.later(LAND, () => {
      impact(c.cam, '#ffe8ec', 0.2);
      shake(5);
      for (const [A, B] of weaveMine(c.ent)) {
        V.fx({ dur: 0.45, layer: 'air', draw: (cc, p, t, e) => { const k = (1 - p) * e.a; V.neonPath(cc, HOT, 7 * WS * (1 - p * 0.6), k, () => { cc.moveTo(A.x, A.y - 16); cc.lineTo(B.x, B.y - 16); }); } });
        for (const w of [A, B]) V.burst(w.x, w.y - 16, { color: ROSE, color2: SEAM, n: 6, speed: 200, kind: 'star', flash: false });
      }
      F.anchors.forEach((a, i) => { V.sparks(a.x, a.y, { color: i % 2 ? SEAM : ROSE, n: 7, speed: 300, z: 30 });
        V.spikeburst(a.x, a.y - 30 * WS, { r: 30 * WS, n: 8, color: CRIM, core: HOT, ink: '#2a0410', dur: 0.3 }); });
      for (const w of F.ps) V.plus(w.x, w.y, { color: '#ffb0bc', n: 2 });
      V.shock(F.x, F.y, { r: F.R + 40 * WS, color: CRIM, dur: 0.55, w: 7 });
      if (W) W.diamond(F.x, F.y, F.R * 0.95, 6, { peak: 0.95, settle: 0.4, w: 1.5 });
    });
  };
  // one strike per thread (d.n, at least one) runs from her to the boss on its own arc, then two bright lances cross
  // through the boss with a crimson star where they meet
  KIT_VFX['weave-loom'] = Object.assign((e, target, d) => {
    const t = target || e, n = Math.max(1, Math.min(5, Number(d && d.n) || 1)), W = globalThis.THREADWEAVER_VFX;
    for (let i = 0; i < n; i++) weaveLater(e, i * 0.05, () => V.missile(e.x, e.y, t.x, t.y, { style: 'blade', color: i % 2 ? SEAM : ROSE, speed: 1300, size: 0.9, arc: 20 + i * 28, onHit: (x, y) => V.hit(x, y, ROSE, 0.6) }));
    weaveLater(e, 0.3, () => {
      const WS = WEAVE_ULT_SCALE;
      if (W) W.cross(t.x, t.y, { L: (150 + n * 20) * WS, w: 1.4 * WS, dur: 0.6 });
      V.spikeburst(t.x, t.y, { r: (60 + n * 6) * WS, n: 14, color: CRIM, core: HOT, ink: '#2a0410', dur: 0.4, z: 16 });
      V.shock(t.x, t.y, { r: 140 * WS, color: SEAM, dur: 0.5, w: 6 });
      shake(4);
    });
  }, { atTarget: true });
  // (a KIT_VFX moment has no c.later: FX.later keeps it on the effects clock, at the strength main.js plays it at:
  // your own at full, anyone else's at 0.6)
  function weaveLater(e, d, fn) { const sc = FX.camFor(e) ? 1 : 0.6; FX.later(d, () => { V.setScale(sc); try { fn(); } finally { V.setScale(1); } }); }
})();

// (Chronomancer's Paradox and Stasis hold / release moments are in its block of 'ULTIMATES · healers')
// Tanks (round 2): the moments one button leaves for another. A tankbuster turned aside (Bastion), War Cry's Drain
// spilling to the party (Bloodreaver), a reflected buster carving a Rune and a sanctified Ward (Runeguard), Crisp
// Flowing Palms breathing and Iron Ox throwing the boss off balance (Ironpalm)
Object.assign(KIT_VFX, {
  turnedEdge: e => { VFX.glint(e.x, e.y - 24, { color: '#fff3c0', size: 34 }); VFX.motes(e.x, e.y, { color: '#ffe08a', n: 8, r: 26, kind: 'star' }); },
  warcryDrain: e => { VFX.shock(e.x, e.y, { r: 150, color: '#ff6a6a', w: 4, dur: 0.5 }); VFX.plus(e.x, e.y, { color: '#ff9a9a', n: 5 }); },
  mirrorRune: e => { VFX.sigil(e.x, e.y, { r: 34, style: 'runes', color: '#e0d4ff', dur: 0.6, spin: 6, follow: e }); VFX.motes(e.x, e.y, { color: '#c8a8ff', n: 6, r: 22 }); },
  sanctWard: e => { VFX.sigil(e.x, e.y, { r: 44, style: 'clock', color: '#9f7aff', dur: 0.7, spin: 2, follow: e }); },
  sanctBlast: e => { VFX.shock(e.x, e.y, { r: 160, color: '#c8b0ff', w: 5, dur: 0.6 }); VFX.plus(e.x, e.y, { color: '#d8c8ff', n: 5 }); },
  flowBreath: e => { VFX.swirl(e.x, e.y, { r: 36, color: '#bfe8ff', dur: 0.45, follow: e, inward: true }); },
  oxStagger: Object.assign((e, target) => { const t = target || e; VFX.shock(t.x, t.y, { r: 80, color: '#e0b070', w: 5, dur: 0.4 }); VFX.sparks(t.x, t.y, { color: '#ffe0a0', n: 8 }); }, { atTarget: true }),
});
