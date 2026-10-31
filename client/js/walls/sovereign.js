// The Cinder Sovereign's wall (wall-fx.js): The Heart Remembers (50%), the moment that is already scored and painted by the fight itself.
//   What plays without us: sound-hooks.js (svheart) swaps the music to the heart track on the next bar line and starts the heartbeat loop, stops it dead for the held breath
//   (sv-heart-breath), and svseal silences the music and plays sv-seal-shatter; sovereign-fx.js (FX3) closes a dark vignette on the beat, seals him in a bell of glass and
//   embers on a rune ring, paints each pillar, and breaks the glass in a white-gold ring across the floor with shards flung low and fast.
//   So the plain fallback (a gold flash, a second glass skin, wall-up / wall-break and a music muffle) would only fight it. This moment adds nothing to the picture or the
//   sound: no music muffle, swell or duck, no loop, no sting, no body or floor overlay. It adds only what the fight has no hand in, the camera and the body of the room:
//   - the seal: the camera leans in a hair as the dark closes, a held beat as the glass is set (the bell finishes forming 0.9 s in), a low thud to go with it;
//   - the break: a short hitstop on the shatter, a punch outward, a little gold from where the glass stood, and a few embers settling after it. The glass's flash, ring and
//     shards are the fight's own; the music is already cut to silence by svseal and Rebirth opens the next act, so nothing here swells.
// Presentation only; every sound here is the fight's, so there are no wall-sovereign recipes.

(() => {
  if (typeof WallFx === 'undefined') return;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // the bell stands over him (sovereign-fx.js sealGeom: dropped 56, 170 wide, 230 high); its middle is the place the light leaves from
  const bellAt = bd => ({ x: bd.x, y: bd.y + 56 - 90 });

  WallFx.moment('sovereign', 'The Heart Remembers', {
    up(S) {
      const bd = S.bd;
      S.cam('stop', 0.07);
      S.lean(0.035, 0.7, 1.4, 1.6);
      S.shake(6);
      // the glass is set: a low thud as the bell closes over him (the fight's bell is full at 0.9 s)
      S.later(0.9, () => {
        const q = bellAt(S.bd || bd);
        S.shake(4);
        VFX.motes(q.x, q.y + 70, { color: '#ffb060', n: 10, r: 90, rise: 1, life: 1.3 });
      });
    },
    broke(S) {
      const bd = S.bd, q = bellAt(bd);
      S.cam('stop', 0.11); S.cam('punch', 0.03, 0.45); S.cam('flash', '#fff1c8', 0.14, 0.3);
      S.shake(12);
      VFX.sparks(q.x, q.y, { color: '#ffe3a0', n: 26, speed: 560, up: 220 });
      // a few embers coming down where the glass stood, sparse and brief (Rebirth draws every fire in the room into the blade a moment later)
      const R = typeof ARENA !== 'undefined' && ARENA.inner ? ARENA.inner : 520;
      for (let k = 0; k < 3; k++) S.later(0.15 + k * 0.3, () => {
        for (let i = 0; i < 6; i++) {
          const a = rand(0, TAU), d = Math.sqrt(Math.random()) * R * 0.7;
          VFX.spawn({ x: bd.x + Math.cos(a) * d * 0.5, y: bd.y + Math.sin(a) * d * 0.4, z: rand(120, 260), vx: rand(-12, 12), vy: rand(-6, 8), vz: -rand(50, 90), drag: 0,
            life: rand(1.4, 2.2), size: rand(2, 4), size1: 0, color: Math.random() < 0.5 ? '#ffb040' : '#ffe3a0' });
        }
      });
    },
  });
})();
