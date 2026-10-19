// Smooth motion for things we only hear about a few times a second: other players (12/s), bots, the boss and
// adds (10/s). Chasing each new position makes them lurch: a burst of speed after every update, then a stop.
// Instead every update is kept with the time it arrived, and the thing is drawn TRACK.DELAY seconds in the past,
// blended between the two updates on either side of that moment ("entity interpolation", as in the Source
// engine and Gabriel Gambetta's Fast-Paced Multiplayer articles). It moves at an even speed, at the cost of being
// shown about a tenth of a second late.

const TRACK = {
  DELAY: 0.13,   // a bit more than one update interval, so there's nearly always a newer update to blend toward
  SNAP: 330,     // a jump this big in one update is a teleport: go straight there
  EXTRA: 0.1,    // if updates run late, keep gliding on the last known velocity for at most this long
};

class Track {
  constructor(x, y, a = 0) { this.s = [{ t: -1e9, x, y, a }]; }

  push(t, x, y, a = 0) {
    const s = this.s, last = s[s.length - 1];
    if (Math.hypot(x - last.x, y - last.y) > TRACK.SNAP) { this.s = [{ t: -1e9, x, y, a }]; return; }
    // after standing still (no updates are sent then), start the move one interval ago instead of
    // crawling across the whole quiet gap
    if (t - last.t > TRACK.DELAY * 2) s.push({ t: t - 0.1, x: last.x, y: last.y, a: last.a });
    s.push({ t, x, y, a });
    while (s.length > 3 && s[1].t < t - 1) s.shift();
  }

  // where it should be drawn at time t
  at(t) {
    const s = this.s, rt = t - TRACK.DELAY;
    let i = s.length - 1;
    while (i > 0 && s[i].t > rt) i--;
    const p = s[i], q = s[i + 1];
    if (!q) {
      // past the newest update: drift on briefly, then hold
      const o = s[i - 1];
      if (!o || p.t - o.t <= 0 || p.t < 0) return p;
      const k = Math.min(rt - p.t, TRACK.EXTRA) / (p.t - o.t);
      return { x: p.x + (p.x - o.x) * k, y: p.y + (p.y - o.y) * k, a: p.a };
    }
    const k = Math.max(0, Math.min(1, (rt - p.t) / Math.max(1e-6, q.t - p.t)));
    let da = q.a - p.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, a: p.a + da * k };
  }

  // the newest known position (for gameplay checks that shouldn't lag)
  latest() { return this.s[this.s.length - 1]; }
}

if (typeof module !== 'undefined') module.exports = { Track, TRACK };
