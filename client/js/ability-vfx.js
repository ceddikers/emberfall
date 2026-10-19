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
  function lob(sx, sy, tx, ty, cols, onHit) {
    const d = Math.hypot(tx - sx, ty - sy), dur = ALEMBIC.FLIGHT, arc = 36 + d * 0.18;
    const pos = p => ({ x: sx + (tx - sx) * p, y: sy + (ty - sy) * p, z: 22 + Math.sin(p * Math.PI) * arc - p * 14 });
    V.fx({ dur, layer: 'air', tick: () => {}, draw: (c, p, t, e) => {
      const q = pos(p), y = q.y - q.z;
      if (Math.random() < 0.5) V.spawn({ x: q.x, y: q.y, z: q.z, vz: -40, g: 300, life: 0.35, size: 6, color: cols[0], kind: 'drop', add: false });
      V.glowAt(c, q.x, y, 16, cols[0], 0.55 * e.a);
      c.save(); c.globalAlpha = e.a; c.translate(q.x, y); c.rotate(t * 16);
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
        V.ink(x, y, { r: R, dur: 0.9 }); V.shock(x, y, { r: R, color: col, dur: 0.55, w: 6 });
        V.sigil(x, y, { r: R * 0.9, style: 'petals', color: col, dur: 0.9, spin: 1.2 });
        V.plus(x, y, { color: shade(col, 0.3), n: big ? 9 : 6 }); V.motes(x, y, { color: col, n: 10, r: R * 0.7, rise: 0.8 });
        if (r === 'DE' || r === 'DDD') steam(x, y, r === 'DDD' ? 150 : 120, r === 'DDD' ? 6 : 9 * m, '#d8f2f2', fol ? tent : null);
        break;
      }
      case 'bomb': {
        const s = big ? 1.5 : 1;
        V.spikeburst(x, y, { r: 46 * s, n: 14, color: '#ff6a1a', core: '#ffe08a', ink: '#3a0806', dur: 0.36 });
        V.flare(x, y, { n: 14 * s, r: 20 * s, color: col === '#fff070' ? '#ffd23a' : '#ff5a1a' });
        V.debris(x, y, { n: 5, hot: true, color: '#5a3a2a' });
        V.smoke(x, y, { n: 6, color: '#3a2a2a', size: 30 * s, a: 0.55, speed: 50, life: 1.4 });
        if (big) V.crater(x, y, { r: 54, color: '#ff4a1a', dur: 3, flames: 4, a: 0.5 });
        if (r === 'EQ') V.lightning(x - 30, y - 10, x + 30, y + 6, { color: '#fff4c0', jag: 10 });
        if (r === 'EES') { V.burst(x, y, { color: '#fff070', n: 14, speed: 260, kind: 'star' }); }
        shake(big ? 5 : 3);
        break;
      }
      case 'ward': {
        const R = r === 'SSS' ? 160 : 120, dur = (r === 'SSS' ? 8 : 6) * m;
        V.ink(x, y, { r: R, dur });
        V.sigil(x, y, { r: R, style: r === 'QQ' ? 'runes' : 'hex', color: r === 'QQ' ? '#dfe6f2' : '#f4ecd2', dur, spin: 0.35 });
        V.crystals(x, y, { color: r === 'QQ' ? '#dfe6f2' : '#fff8e8', n: 8, r: R * 0.85, h: 26, dur: 0.9 });
        // salt glitter hanging in the circle for its whole life
        V.fx({ dur, layer: 'ground', tick: () => { if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R; V.spawn({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, z: rand(0, 20), vz: rand(10, 30), life: 0.9, size: rand(4, 7), color: '#ffffff', kind: 'star' }); } }, draw: () => {} });
        break;
      }
      case 'salve': {
        const R = big ? 130 : 110;
        for (let i = 0; i < 3; i++) V.shock(x, y, { r: R * (0.5 + i * 0.25), color: col, dur: 0.6, w: 4, delay: i * 0.08 });
        V.lightfall(x, y, { color: shade(col, 0.4), r: 34, h: 160, dur: 0.6, feathers: 0 });
        V.burst(x, y - 10, { color: col, color2: '#ffffff', n: 12, speed: 180, kind: 'star', flash: false });
        if (tent) V.shield(tent, { shape: 'bubble', color: col, dur: 1.2, r: 34 });
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
      const go = (x, y) => { glass(x, y); for (const r of parts) burst(r, x, y, m, target && target !== e ? target : null, d.fol); };
      if (d.self) { V.spawn({ x: e.x, y: e.y, z: 20, life: 0.3, size: 50, size1: 10, color: '#ffb040' }); go(e.x, e.y); return; }
      const hx = e.x + Math.cos(e.angle || 0) * 12, hy = e.y + Math.sin(e.angle || 0) * 12;
      const t = target || { x: e.x + Math.cos(e.angle || 0) * 140, y: e.y + Math.sin(e.angle || 0) * 140 };
      if (e.st) e.st.action = { type: 'cast', t0: FX.now, dur: 0.4 };
      lob(hx, hy, t.x, t.y, cols, (x, y) => go(target ? target.x : x, target ? target.y : y));
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
    // a fire glyph on the boss, then a bold orange starburst, flame tongues and a scorch that smokes
    flare: c => { V.sigil(c.tx, c.ty, { r: 40, style: 'star5', color: '#ff9a3a', dur: 0.35, spin: 5 });
      c.later(0.12, () => { V.spikeburst(c.tx, c.ty, { r: 58, n: 14, ...FIRE, dur: 0.36 }); V.flare(c.tx, c.ty, { n: 12, r: 18, color: '#ff6a1a' }); V.burst(c.tx, c.ty, { color: '#ffd070', n: 8, speed: 220, flashR: 60 }); shake(2); });
      c.later(0.4, () => { V.decal(c.tx, c.ty, { r: 34, embers: true, dur: 2.2 }); V.smoke(c.tx, c.ty, { n: 4, r: 24, color: '#5a4a48', size: 26, a: 0.4, speed: 30, life: 1.6 }); }); },
    // an ice glyph at the hand, a long lance of ice, crystals bursting where it lands and frost left on the floor
    lance: c => { const h = ahead(c, 18); V.sigil(h.x, h.y, { r: 22, style: 'hex', color: '#9fd8ff', dur: 0.3, spin: 4 });
      V.missile(c.x, c.y, c.tx, c.ty, { style: 'helix', color: '#7ac0f0', speed: 1300, size: 1.2, onHit: (x, y) => { V.crystals(x, y, { color: '#9fd8ff', n: 7, r: 38, h: 54, dur: 0.9 }); V.spikeburst(x, y, { r: 52, n: 12, ...ICE, dur: 0.34 }); V.shock(x, y, { r: 80, color: '#bfe6ff', dur: 0.4, w: 4 }); shake(2); FX.later(0.4, () => V.smoke(x, y, { n: 4, r: 30, color: '#cfe6f0', size: 24, a: 0.3, speed: 20, life: 1.8 })); } }); },
    // both hands meet: a half-blue half-orange seal at the feet, a shield closing over, steam rising after
    equil: c => { V.ink(c.x, c.y, { r: 56, dur: 0.9, follow: c.ent }); V.sigil(c.x, c.y, { r: 56, style: 'hex', color: '#ffb08a', dur: 0.9, spin: 3, follow: c.ent }); V.sigil(c.x, c.y, { r: 44, style: 'hex', color: '#8fd0ff', dur: 0.9, spin: -3, follow: c.ent });
      c.later(0.1, () => { V.shield(c.ent, { color: '#e8d8ff', dur: 1.4, r: 40 }); V.shock(c.x, c.y, { r: 90, color: '#f2e6c8', dur: 0.4, w: 4 }); });
      c.later(0.5, () => V.smoke(c.ent.x, c.ent.y, { n: 5, r: 30, color: '#e0e8f0', size: 24, a: 0.3, speed: 25, life: 1.6 })); },
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
    hook: c => { const col = windCol(c.ent), a0 = Math.atan2(c.y - c.ty, c.x - c.tx), r = Math.max(40, Math.hypot(c.x - c.tx, c.y - c.ty));
      ribbon(loop(c.tx, c.ty, r, a0, Math.PI), { color: col, w: 3.5, dur: 0.6 });
      c.later(0.1, () => { V.slash(c.tx, c.ty + 10, a0 + Math.PI / 2, { r: 54, span: 2, color: '#e8fff8', w: 0.4, dur: 0.24 }); V.hit(c.tx, c.ty, col, 0.8); }); },
    // a wind glyph at the blade, then a great crescent of wind flies out and bursts on the target; leaves and grit swirl after
    cross: c => { const col = windCol(c.ent), h = ahead(c, 20); V.sigil(h.x, h.y, { r: 24, style: 'star4', color: col, dur: 0.3, spin: 6 });
      c.later(0.08, () => V.missile(c.x, c.y, c.tx, c.ty, { style: 'blade', color: col, speed: 1300, size: 1.5, onHit: (x, y) => { V.slash(x, y + 10, Math.atan2(c.ty - c.y, c.tx - c.x), { r: 70, span: 2.6, color: col, w: 0.6, dur: 0.32 });
        V.spikeburst(x, y, { r: 54, n: 12, color: col, core: '#ffffff', ink: '#0a2a24', dur: 0.32 }); V.tornado(x, y, { color: '#e8fff8', h: 70, r: 24, dur: 0.7 }); shake(3);
        FX.later(0.3, () => V.smoke(x, y, { n: 4, r: 30, color: '#c8d0c0', size: 22, a: 0.35, speed: 40, life: 1.3 })); } })); },
    // the blade held flat across: a thin bright line, a still ring at the feet
    still: c => { const fx = c.x + Math.cos(c.ang) * 26, fy = c.y + Math.sin(c.ang) * 26; V.glint(fx, fy, { color: '#ffffff', size: 26 }); V.shield(c.ent, { shape: 'front', color: '#e8fff8', dur: 2, r: 38 });
      V.sigil(c.x, c.y, { r: 40, style: 'star4', color: windCol(c.ent), dur: 2, spin: 0.2, follow: c.ent }); },
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
      const R = (echo ? 24 : 34) + s * (echo ? 3 : 8);
      V.fx({ dur: 0.16, layer: 'ground', draw: (c, p, tt, fx) => { V.neonRing(c, t.x, t.y, R * 1.3 * (1 - p), to.color, 3, fx.a * p, 0.7); V.neonRing(c, t.x, t.y, R * 1.1 * (1 - p), other.color, 3, fx.a * p, 0.7); } });
      FX.later(0.15, () => {
        V.spikeburst(t.x, t.y, { r: R, n: 12 + Math.round(s), ...to, dur: 0.34 + s * 0.02 });
        V.spikeburst(t.x, t.y, { r: R * 1.35, n: 16, hole: 0.7, ...other, dur: 0.4, layer: 'ground', z: 0, flat: 0.7 });
        V.burst(t.x, t.y, { color: to.core, color2: other.color, n: 8 + s * 2, speed: 160 + s * 25, flashR: R * 1.2 });
        V.shock(t.x, t.y, { r: R * 2, color: to.color, dur: 0.5, w: 4 + s * 0.5 });
        if (to === ICE) V.crystals(t.x, t.y, { color: '#bfe6ff', n: 4 + Math.round(s / 2), r: R * 0.7, h: 30 + s * 4, dur: 1 }); else V.flare(t.x, t.y, { n: 6 + s, r: 14 + s, color: '#ff6a1a' });
        if (!echo) { shake(2 + s * 0.5); FX.text(t.x, t.y - 70, s >= 8 ? 'Thermal Shock!' : 'Shock', to.core, 11 + Math.min(8, s), 0.9); }
      });
      if (!echo) FX.later(0.5, () => { V.smoke(t.x, t.y, { n: 3 + Math.round(s / 2), r: R * 0.6, color: '#e0e4e8', size: 22 + s * 2, a: 0.3, speed: 25, life: 2 }); if (s >= 6) V.decal(t.x, t.y, { style: 'crack', r: R * 0.8, dur: 2.4, a: 0.5, seed: Math.random() * 6 }); });
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
      const col = windCol(e), a = e.angle || 0, t = target || e, gale = d && d.g;
      ribbon(line2(t.x - Math.cos(a) * 60, t.y - Math.sin(a) * 60, t.x + Math.cos(a) * 60, t.y + Math.sin(a) * 60, 6, 0), { color: gale ? '#ffffff' : col, w: gale ? 5 : 3, dur: 0.35, wob: 1 });
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
        V.spawn({ x, y, z: 4, vx: (m.x - x) * 3.2, vy: (m.y - y) * 3.2, vz: m.z * 3, life: 0.3, size: rand(7, 11), size1: 2, color: i % 2 ? col : '#ffffff', stretch: 3 }); }); }
  };
  const gulp = (e, m, big) => {
    const col = MCOL(m);
    FX.later(0.3, () => { const q = mouth(e); chomp(q.x, q.y, q.z, big ? 1.5 : 1.1, col); FX.later(0.12, () => { crumbs(q.x, q.y, q.z, col, big ? 12 : 7); V.shock(e.x, e.y, { r: big ? 70 : 46, color: col, dur: 0.3, w: 4 });
      V.flash(e.x, e.y - 24, 30, col, 0.25); if (big) shake(3); }); });
    // the belly glows with what went down
    FX.later(0.5, () => V.fx({ dur: 0.9, layer: 'air', draw: (c, p, t, fx) => V.glowAt(c, e.x, e.y - 14, 22, col, (1 - p) * 0.7 * fx.a) }));
  };

  ABILITY_VFX.gorgemaw = {
    // a bite: the jaw snaps on the target, a few chips fly
    gnash: c => { const h = ahead(c, 34); chomp(h.x, h.y, 22, 0.9, '#ffd8a0', 0.22); c.later(0.08, () => { V.hit(c.tx, c.ty, '#ffe0b0', 0.6); crumbs(c.tx, c.ty, 16, '#c8a070', 4); }); },
    // the jaw swings open: a wide mouth of teeth in front, air rushing in for as long as it's open
    wide: c => { const e = c.ent, dur = 1.6; if (e.st) e.st.jawUntil = FX.now + 1.5;
      V.fx({ dur, layer: 'air', draw: (ctx, p, t, fx) => {
        const m = mouth(e), open = Math.min(1, t / 0.12) * (p > 0.85 ? (1 - p) / 0.15 : 1), k = fx.a * open, yy = m.y - m.z, a = e.angle || 0;
        ctx.save(); ctx.translate(m.x, yy); ctx.rotate(a);
        V.neonPath(ctx, '#ffb070', 3, k, () => { ctx.ellipse(10, 0, 18, 6 + 16 * open, 0, -Math.PI / 2, Math.PI / 2); });
        ctx.fillStyle = 'rgba(40,10,6,' + (0.55 * k).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(10, 0, 14, 4 + 13 * open, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }, tick: () => { if (Math.random() < 0.6) { const m = mouth(e), a = (e.angle || 0) + rand(-1, 1), d = rand(60, 120), x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d * 0.6;
        V.spawn({ x, y, z: rand(10, 40), vx: (m.x - x) * 4, vy: (m.y - y) * 4, vz: 0, life: 0.25, size: 6, size1: 1, color: '#ffe8c8', stretch: 4 }); } } });
      V.swirl(e.x, e.y, { r: 50, color: '#ffb070', dur: 0.5, inward: true, follow: e }); },
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
    // Dun, Levy, Collect: the sealing mace comes down; the last of the three stamps a seal
    collect: c => { V.slash(c.x, c.y, c.ang, { r: 56, span: 1.6, color: '#d8d0e8', w: 0.5, dur: 0.24, flip: Math.random() < 0.5 });
      c.later(0.09, () => { const third = c.ent.st && c.ent.st.combo === 2; stamp(c.tx, c.ty, third ? WAX : LIL, third); }); },
    // Renegotiate: pages riffle forward round the knight, a lilac clock face turns back
    reneg: c => { V.sigil(c.x, c.y, { r: 46, style: 'clock', color: LIL, dur: 0.9, spin: -4, follow: c.ent }); pages(c.x, c.y, 6); },
    // Settle: a gold seal stamped at the feet, coins thrown up
    settle: c => { seal(c.x, c.y, 40, GOLD, 1.6); V.burst(c.x, c.y - 10, { color: GOLD, color2: '#fff6d0', n: 14, speed: 220, kind: 'star' }); V.shock(c.x, c.y, { r: 90, color: GOLD, dur: 0.4, w: 5 }); shake(2); },
    audit: c => { seal(c.x, c.y, 28, GOLD, 1); V.sigil(c.x, c.y, { r: 36, style: 'hex', color: GOLD, dur: 0.6, spin: 3 }); },
    // Lien: a chain of light run out to the boss and a lock-seal on it
    lien: c => { V.beam(c.x, c.y, c.tx, c.ty, { color: LIL, w: 4, dur: 0.6 }); c.later(0.15, () => { seal(c.tx, c.ty, 36, LIL, 2); V.sigil(c.tx, c.ty, { r: 50, style: 'runes', color: LIL, dur: 1.2, spin: 1 }); }); },
    // Co-Sign: a line of ink to the ally, their name sealed under them
    cosign: c => { const w = c.tent || c.ent; V.beam(c.x, c.y, w.x, w.y, { color: LIL, w: 3, dur: 0.5 }); c.later(0.12, () => { seal(w.x, w.y, 26, LIL, 1.4); V.shield(w, { color: LIL, dur: 1.2, r: 36 }); }); },
    // Writ of Protection: a scroll unrolled in front of the knight
    writ: c => { V.shield(c.ent, { shape: 'front', color: '#f0e8d8', dur: 2, r: 44 }); V.sigil(c.x, c.y, { r: 50, style: 'runes', color: '#e8dcc0', dur: 1.4, spin: 0.6, follow: c.ent }); pages(c.x, c.y, 4); },
    // Default: the book torn open, pages flung everywhere, smoke
    default: c => { pages(c.x, c.y, 18); V.shock(c.x, c.y, { r: 120, color: WAX, dur: 0.5, w: 6 }); V.smoke(c.x, c.y, { n: 6, color: '#6a6070', size: 26, a: 0.45, speed: 50 }); shake(4); },
    // Foreclose: a great seal slams down onto the boss
    foreclose: c => { V.lightfall(c.tx, c.ty, { color: WAX, r: 34, h: 220, dur: 0.5, feathers: 0 }); c.later(0.2, () => { stamp(c.tx, c.ty, WAX, true); seal(c.tx, c.ty, 60, WAX, 1.8); pages(c.tx, c.ty, 10); shake(5); }); },
    // Moratorium: an hourglass seal, the Ledger held
    moratorium: c => { V.sigil(c.x, c.y, { r: 56, style: 'clock', color: '#e8dcc0', dur: 5, spin: 0, follow: c.ent }); V.dome(c.ent, { color: LIL, r: 46, dur: 1 }); },
  };

  Object.assign(KIT_VFX, {
    // a morsel spat at the boss (d: { m: shape, f: fused, n: order in a Regurgitate volley })
    spit: Object.assign((e, target, d) => {
      const m = (d && d.m) || 'ring', f = d && d.f, s = f ? 1.7 : 1, col = MCOL(m), t = target || { x: e.x + Math.cos(e.angle || 0) * 200, y: e.y + Math.sin(e.angle || 0) * 200 };
      const go = () => {
        const q = mouth(e);
        chomp(q.x, q.y, q.z, 0.8 * s, col, 0.2);
        if (m === 'ring') V.missile(q.x, q.y, t.x, t.y, { style: 'orb', color: col, speed: 650, arc: 60, size: 1.3 * s, onHit: (x, y) => { for (let i = 0; i < (f ? 3 : 2); i++) V.shock(x, y, { r: (60 + i * 30) * s, color: col, dur: 0.45, w: 6, delay: i * 0.08 }); V.splash(x, y, { n: 10, color: col }); V.debris(x, y, { n: 4, color: '#7a5a3a' }); shake(2 * s); } });
        else if (m === 'lance') V.missile(q.x, q.y, t.x, t.y, { style: 'blade', color: col, speed: 1500, size: 1.4 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 36 * s, n: 10, color: col, core: '#ffffff', ink: '#0a2030', dur: 0.3 }); V.beam(q.x, q.y, x, y, { color: col, w: 6 * s, dur: 0.25 }); shake(2 * s); } });
        else if (m === 'fang') { V.breath(q.x, q.y, Math.atan2(t.y - q.y, t.x - q.x), { len: Math.min(220, Math.hypot(t.x - q.x, t.y - q.y) + 20) * s, span: 0.6 * s, color: col });
          FX.later(0.15, () => { chomp(t.x, t.y, 20, 1.2 * s, col, 0.3); V.splash(t.x, t.y, { n: 8 }); }); }
        else V.missile(q.x, q.y, t.x, t.y, { style: 'meteor', color: col, speed: 900, arc: 30, size: 1.2 * s, onHit: (x, y) => { V.spikeburst(x, y, { r: 64 * s, n: 16, color: '#ffd23a', core: '#fffbe0', ink: '#3a2a08', dur: 0.4 }); V.crystals(x, y, { color: col, n: 6, r: 40 * s, h: 60 * s, dur: 0.9 }); V.shock(x, y, { r: 120 * s, color: col, dur: 0.5, w: 7 }); shake(5 * s); } });
        if (f) FX.later(0.3, () => FX.text(t.x, t.y - 80, MAW.FUSION[m], '#fff0c8', 15, 0.9));
      };
      const n = (d && d.n) || 0; if (n) FX.later(n * 0.14, go); else go();
    }, { atTarget: true }),
    // Digest: the belly churns (d: { n eaten, m: their shapes' first letters }) and the warmth comes out of it
    digest: (e, target, d) => {
      const n = (d && d.n) || 0, letters = (d && d.m) || '';
      V.swirl(e.x, e.y, { r: 40, color: '#ffc070', dur: 0.7, inward: true, follow: e });
      for (let i = 0; i < n; i++) { const col = MCOL({ r: 'ring', l: 'lance', f: 'fang', s: 'spike' }[letters[i]] || 'ring');
        FX.later(i * 0.1, () => { V.fx({ dur: 0.5, layer: 'air', draw: (c, p, t, fx) => V.glowAt(c, e.x + Math.sin(t * 20 + i) * 6, e.y - 14, 18 + 10 * Math.sin(p * Math.PI), col, (1 - p) * 0.8 * fx.a) }); }); }
      FX.later(0.3, () => { V.plus(e.x, e.y, { color: '#ffd8a0', n: 3 + n }); if (e.spec === 'gizzard' && n) V.shock(e.x, e.y, { r: 160, color: '#ffc070', dur: 0.6, w: 5 }); });
    },
  });

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
})();
