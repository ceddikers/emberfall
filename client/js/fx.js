// Visual effects shared by the town and the arena: ability visuals, floating numbers, rings, trails.
// Purely cosmetic. Game logic never reads anything in here.

// How each kind of floating text moves (FX.text). from/peak: the pop's start and overshoot scale; pop/hold: seconds of
// the pop and of the full-strength hold before the fade; rise: world px it drifts up over its life (negative sinks);
// dx/driftX: its side of the body and its sideways drift; floor: its smallest size in screen px; lanes: where the
// second, third... text spawned on the same spot sits (fanned left, right and up), busy for laneHold of a life.
const fxSmooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const TEXT_LANES = {
  out: [[0, 0], [-34, -17], [34, -17], [-17, -34], [17, -34], [-50, 2], [50, 2], [0, -50]],
  // (on a hero: below the name tag, fanned outward and down, never up into it)
  in: [[0, 0], [-6, 15], [0, 30], [-12, 45], [-4, 60]],
  heal: [[0, 0], [6, 15], [0, 30], [12, 45], [4, 60]],
  call: [[0, 0], [0, -22], [0, -44], [0, -66]],
};
const TEXT_KINDS = {
  '': { group: 'misc', from: 0.7, peak: 1.18, pop: 0.16, hold: 0.25, rise: 30, floor: 11 },
  auto: { group: 'out', lanes: TEXT_LANES.out, laneHold: 0.4, from: 0.8, peak: 1.1, pop: 0.1, hold: 0.1, rise: 22, floor: 10, alpha: 0.85, durK: 0.8, weight: 700 },
  dot: { group: 'out', lanes: TEXT_LANES.out, laneHold: 0.4, from: 0.85, peak: 1.08, pop: 0.1, hold: 0.12, rise: 16, floor: 10, alpha: 0.8, durK: 0.85, weight: 700 },
  hit: { group: 'out', lanes: TEXT_LANES.out, laneHold: 0.45, from: 0.6, peak: 1.3, pop: 0.16, hold: 0.28, rise: 32, floor: 12 },
  crit: { group: 'out', lanes: TEXT_LANES.out, laneHold: 0.45, from: 0.5, peak: 1.45, pop: 0.2, hold: 0.38, rise: 28, floor: 12.5, durK: 1.15, weight: 900 },
  ult: { group: 'out', lanes: TEXT_LANES.out, laneHold: 0.5, from: 0.3, peak: 1.75, pop: 0.26, hold: 0.75, rise: 30, floor: 26, durK: 1.6, weight: 900 },
  heal: { group: 'heal', lanes: TEXT_LANES.heal, laneHold: 0.45, dx: 16, align: 'left', from: 0.6, peak: 1.25, pop: 0.16, hold: 0.3, rise: 6, driftX: 12, floor: 12 },
  taken: { group: 'in', lanes: TEXT_LANES.in, laneHold: 0.45, dx: -16, align: 'right', from: 0.6, peak: 1.3, pop: 0.15, hold: 0.3, rise: -10, driftX: -10, floor: 12 },
  absorb: { group: 'in', lanes: TEXT_LANES.in, laneHold: 0.45, dx: -16, align: 'right', from: 0.8, peak: 1.12, pop: 0.12, hold: 0.3, rise: -8, driftX: -8, floor: 11, alpha: 0.9, weight: 700 },
  call: { group: 'call', lanes: TEXT_LANES.call, laneHold: 0.6, stamp: true, peak: 1.7, pop: 0.14, hold: 0.45, rise: 10, floor: 12 },
  quiet: { group: 'call', lanes: TEXT_LANES.call, laneHold: 0.6, from: 1, peak: 1, pop: 0.01, hold: 0.35, rise: 0, shake: true, floor: 11, weight: 700 },
};

const FX = {
  list: [], pending: [], now: 0, heroScale: 1.5, shake: 0,
  muted: false,   // a hidden tab spawns nothing (it would all play at once on the way back)
  GROUND: new Set(['zone', 'click', 'ring', 'puff', 'cone', 'aura', 'ghost', 'flash', 'land', 'step']),

  add(f) { f.t0 = this.now; if (!this.muted) this.list.push(f); return f; },
  // the screen moments an Ultimate may use (main.js sets cam: { flash(color, a, dur), dim(a, dur), punch(amount, dur),
  // stop(dur) } and me: your hero). Only your own hero gets them: everyone else's Ultimate plays dimmed, camera still.
  cam: null, me: null,
  camFor(ent) { return ent && ent === this.me ? this.cam : null; },
  later(delay, fn) { if (!this.muted) this.pending.push({ t: this.now + delay, fn }); },
  clear() { this.list.length = 0; this.pending.length = 0; },

  update(now, dt) {
    this.now = now;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (now >= this.pending[i].t) { const p = this.pending[i]; this.pending.splice(i, 1); p.fn(); }
    }
    for (let i = this.list.length - 1; i >= 0; i--) if (now - this.list[i].t0 > this.list[i].dur) this.list.splice(i, 1);
    this.shake *= Math.pow(0.002, dt);
    // a dash that stopped this frame: the arrival (a ring of dust; the hero's settle is heroes.js heroPose)
    for (const e of this._dashers) if (now - e._dash.last > 0.05) { this._dashers.delete(e); if (e.cls) this.add({ type: 'land', x: e.x, y: e.y, color: '#d8ccb4', dur: 0.45 }); }
  },
  _dashers: new Set(),
  // The one way in for screen shake (px). source says whose it is: true / 'mine', an entity, or a recipe's context
  // ({ ent, mine }). Your own (or the boss's: no source) shake in full; a teammate's or a bot's only a little, and an
  // effect playing dimmed (VFX scale, someone else's cast) is scaled with it.
  vscale: 1,
  addShake(amount, source) {
    if (!(amount > 0) || this.muted) return;
    let k = this.vscale;
    if (source !== undefined && source !== null && source !== true && source !== 'mine') {
      const mine = source === false ? false : typeof source === 'object' && 'mine' in source ? !!source.mine : (source.ent || source) === this.me;
      if (!mine) k *= 0.2;
    }
    this.shake = Math.max(this.shake, Math.min(14, amount * k));
  },

  // A floating number or word. kind (opts.kind) sets how it moves:
  //  auto / dot: small, quick, muted · hit: an ability's hit · crit · ult: an Ultimate's own hit (the biggest pop)
  //  heal: to the right of the body · taken / absorb: damage on you (and what a shield ate), to the left of the body
  //  call: a stamped word ('Perfect!', 'Interrupted') · quiet: a grey refusal ('Not ready'), a small shake in place
  // Every kind pops in (a short overshoot), holds at full strength, then fades. Numbers spawned close together on the
  // same spot fan out into lanes instead of piling up. (No kind: a plain pop, for the effects' own captions.)
  text(x, y, text, color = '#ffffff', size = 16, dur = 0.9, opts) {
    const kind = (opts && opts.kind) || '';
    const K = TEXT_KINDS[kind] || TEXT_KINDS[''];
    if (kind === 'quiet') {
      // a refusal already showing just shakes again (no pile of "Not ready")
      for (const f of this.list) if (f.type === 'text' && f.kind === 'quiet' && f.text === text && Math.abs(f.ox - x) < 60 && Math.abs(f.oy - y) < 60) { f.t0 = this.now; return f; }
    }
    // the lowest free lane among live texts of this group that started near here (deterministic: no random jitter)
    let lane = 0;
    if (K.lanes) {
      const busy = new Set();
      for (const f of this.list) {
        if (f.type !== 'text' || f.group !== K.group || Math.abs(f.ox - x) > 60 || Math.abs(f.oy - y) > 60) continue;
        if (this.now - f.t0 < f.dur * K.laneHold) busy.add(f.lane);
      }
      while (busy.has(lane) && lane < K.lanes.length - 1) lane++;
      if (busy.has(lane)) lane = busy.size % K.lanes.length;
    }
    return this.add({ type: 'text', kind, group: K.group, lane, ox: x, oy: y, x, y, text, color, size, dur: dur * (K.durK || 1) });
  },

  // (drawn into a world zoomed by the arena camera: numbers never shrink below a readable size on screen)
  drawText(ctx, f) {
    const K = TEXT_KINDS[f.kind] || TEXT_KINDS[''], t = this.now - f.t0, p = Math.min(1, t / f.dur);
    if (t < 0) return;
    const z = this._z || 1, m = Math.max(1, 12 / (15 * z));   // (everything grows together, so the sizes keep their order)
    const size = Math.max(f.size * m, K.floor / z);
    const L = K.lanes ? K.lanes[f.lane % K.lanes.length] : null;
    let x = f.x + (K.dx || 0) * m + (L ? L[0] * m : 0), y = f.y + (K.dy || 0) * m + (L ? L[1] * m : 0);
    // pop: from a little small, past full size, back to 1; a stamp lands from big instead
    const u = Math.min(1, t / K.pop);
    let s;
    if (K.stamp) s = 1 + (K.peak - 1) * (1 - easeOut(u)) ** 2;
    else s = u < 0.4 ? K.from + (K.peak - K.from) * easeOut(u / 0.4) : K.peak + (1 - K.peak) * fxSmooth((u - 0.4) / 0.6);
    // alpha: full through the pop and the hold, then eases out (a stamp fades in over its landing)
    const hold = Math.min(f.dur * 0.7, K.pop + K.hold);
    const fade = t <= hold ? 1 : 1 - fxSmooth((t - hold) / Math.max(0.01, f.dur - hold));
    const a = (K.stamp ? Math.min(1, u * 2.5) : 1) * fade * (K.alpha || 1);
    if (a <= 0.01) return;
    // the drift: up for most, a slow sink for a hit you took; a quiet refusal stays put and shakes once
    const q = easeOut(p);
    x += (K.driftX || 0) * m * q;
    y -= (K.rise || 0) * m * q;
    if (K.shake && t < 0.24) x += Math.sin(t * 70) * 3 * (1 - t / 0.24);
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(x, y); if (s !== 1) ctx.scale(s, s);
    ctx.font = `${K.weight || 800} ${size.toFixed(1)}px system-ui, sans-serif`;
    ctx.textAlign = K.align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.2, size * 0.2); ctx.strokeStyle = 'rgba(10,8,14,0.9)';
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
    ctx.restore();
  },

  // Play an ability's visual. ent: { x, y, angle, st, cls, lift }. (tx, ty): where it lands.
  // opts: { tent: the ally entity it lands on, mine: true for your own casts (others' are dimmed) }
  // Every client runs this for every cast it hears about (yours, friends', bots'), so it all stays in sync.
  cast(ent, ab, tx, ty, opts = {}) {
    const f = ab.fx || {};
    const now = this.now;
    const ang = Math.atan2(ty - ent.y, tx - ent.x);
    if (!f.onTarget && ab.target !== 'ally' && (tx !== ent.x || ty !== ent.y)) { ent.faceTo = ang; ent.faceLock = now + 0.5; }   // turned toward over a few frames (see turnFacing in main.js)
    if (ab.anim && ab.anim !== 'dash' && ent.st) ent.st.action = { type: ab.anim, t0: now, dur: ANIM_DUR[ab.anim] };
    // (a window's empowered move looks like itself: fxId, engine.js ultOver)
    const recipe = ent.cls && typeof ABILITY_VFX !== 'undefined' && ABILITY_VFX[ent.cls.id] && ABILITY_VFX[ent.cls.id][ab.fxId || ab.id];
    if (recipe) {
      // an Ultimate's wind-up is its own (the recipe times it), so it isn't delayed by its animation
      const delay = ab.ult ? 0 : { attack: 0.1, bash: 0.06, cast: 0.16, big: 0.2 }[ab.anim] || 0;
      const dim = opts.mine ? 1 : 0.6;
      // cam: the screen moments (flash, dim, camera push, hit-stop) for your own Ultimates only; null for anyone else's
      const cam = this.camFor(ent);
      const run = () => {
        VFX.setScale(dim); this.vscale = dim;   // (vscale: addShake scales with it)
        try { recipe({ ent, x: ent.x, y: ent.y, tx, ty, ang: ent.angle, tent: opts.tent || null, mine: !!opts.mine, cam, step: Number.isInteger(opts.step) ? opts.step : null, later: (d, fn) => this.later(d, () => { VFX.setScale(dim); this.vscale = dim; try { fn(); } finally { VFX.setScale(1); this.vscale = 1; } }) }); }
        finally { VFX.setScale(1); this.vscale = 1; }
      };
      if (delay) this.later(delay, run); else run();
      return;
    }
    const dist = Math.hypot(tx - ent.x, ty - ent.y);
    const at = maxR => { const d = Math.min(dist, maxR); return { x: ent.x + Math.cos(ang) * d, y: ent.y + Math.sin(ang) * d }; };
    const ahead = d => ({ x: ent.x + Math.cos(ang) * d, y: ent.y + Math.sin(ang) * d });
    const delay = { attack: 0.13, bash: 0.08, cast: 0.2, big: 0.25 }[ab.anim] || 0;
    this.later(delay, () => {
      switch (f.type) {
        case 'slash': this.add({ type: 'slash', x: ent.x, y: ent.y, angle: ang, r: f.r, span: f.span || 1.6, color: f.color, dur: 0.32 }); break;
        case 'cone': this.add({ type: 'cone', x: ent.x, y: ent.y, angle: ang, r: f.r, span: f.span || 1.1, color: f.color, dur: 0.6 }); break;
        case 'projectile': {
          const p = at(f.range || 420), d = Math.hypot(p.x - ent.x, p.y - ent.y);
          const dur = Math.max(0.12, d / (f.speed || 650));
          this.add({ type: 'projectile', sx: ent.x, sy: ent.y, x: p.x, y: p.y, color: f.color, style: f.style, dur, src: ent });
          this.later(dur, () => this.add({ type: 'ring', x: p.x, y: p.y, r: 34, color: f.color, dur: 0.4 }));
          break;
        }
        case 'line': {
          const p = ahead(Math.min(f.range || 400, dist + 40));
          this.add({ type: 'line', sx: ent.x, sy: ent.y, x: p.x, y: p.y, color: f.color, dur: 0.4 });
          break;
        }
        case 'zone': {
          const p = f.onTarget ? { x: tx, y: ty } : at(f.range || 0);
          this.add({ type: 'zone', x: p.x, y: p.y, r: f.r, color: f.color, style: f.style, dur: f.dur || 2 });
          if (f.style === 'meteor') this.later((f.dur || 2) * 0.55, () => { this.shake = Math.max(this.shake, 7); });
          break;
        }
        case 'ring': {
          const p = f.onTarget ? { x: tx, y: ty } : f.range ? at(f.range) : { x: ent.x, y: ent.y };
          this.add({ type: 'ring', x: p.x, y: p.y, r: f.r || 40, color: f.color, style: f.style, dur: 0.6 });
          break;
        }
        case 'aura': this.add({ type: 'aura', follow: ent, r: f.r, color: f.color, style: f.style, dur: f.dur || 2 }); break;
        case 'shield': this.add({ type: 'shield', follow: ent, color: f.color, dur: f.dur || 1.2 }); break;
        case 'blink': this.add({ type: 'ring', x: ent.x, y: ent.y, r: 32, color: f.color, style: 'implode', dur: 0.4 }); break;
      }
    });
  },

  // Dash visuals: a quick trail of afterimages.
  dashTrail(ent, color) {
    if (!ent.cls) return;
    const now = this.now;
    if (ent.st) ent.st.dashT = now;   // the hero leans into it, and settles when it stops (heroes.js heroPose)
    // one picture of the hero per dash (taken at the first afterimage's draw): every afterimage is that one image,
    // tinted, instead of the whole hero redrawn at low alpha (which showed its insides and cost a hero per ghost)
    if (!ent._dash || now - ent._dash.last > 0.12) ent._dash = { last: now, snap: { cls: ent.cls, spec: ent.spec || null, angle: ent.angle, color: color || ent.cls.accent || '#ffffff', cv: null, owner: ent } };
    ent._dash.last = now;
    this._dashers.add(ent);
    // (called every frame while dashing: at most ~45 afterimages a second, so a 144 Hz screen doesn't make more)
    if (now - (ent._trailAt ?? -1) < 1 / 45) return;
    ent._trailAt = now;
    this.add({ type: 'ghost', snap: ent._dash.snap, x: ent.x, y: ent.y - (ent.lift || 0), dur: 0.25 });
    // (shared-fx polish) the class's own dash trail (DASH_VFX in ability-vfx.js); the plain dust puff is the fallback
    if (typeof DASH_VFX !== 'undefined' && DASH_VFX.trail(ent, color)) return;
    if (Math.random() < 0.5) this.add({ type: 'puff', x: ent.x + (Math.random() - 0.5) * 12, y: ent.y + (Math.random() - 0.5) * 12, r: 9, color: '#d8ccb8', dur: 0.5 });
  },

  draw(ctx, ground) {
    // the camera's zoom in screen pixels (the canvas is scaled by its pixel ratio, capped by the render quality: FX.dpr())
    if (!ground) { const a = ctx.getTransform ? ctx.getTransform().a : 1; this._z = clamp(a / this.dpr(), 0.3, 3); }
    for (const f of this.list) if (this.GROUND.has(f.type) === ground) this.drawOne(ctx, f);
  },

  drawZone(ctx, f, p) {
    const now = this.now;
    const t = p * f.dur;
    const k = Math.min(1, t / 0.15) * (p > 0.8 ? (1 - p) / 0.2 : 1);
    const r = f.r * easeOut(Math.min(1, t / 0.2));
    const { x, y, color } = f;
    if (f.style === 'meteor') {
      const IMP = 0.55;
      if (p < IMP) {
        const q = p / IMP;
        circle(ctx, x, y, f.r, rgba(color, 0.12), rgba(color, 0.9), 2.5);
        circle(ctx, x, y, f.r * q, 'rgba(0,0,0,0.25)');
        const mx = x - 220 * (1 - q), my = y - 320 * (1 - q);
        line(ctx, mx - 30, my - 45, mx, my, rgba('#ffb347', 0.6), 10);
        flame(ctx, mx, my, 14, now);
        circle(ctx, mx, my, 9, '#5a3a2a', OUT, 2);
      } else {
        const q = (p - IMP) / (1 - IMP), a = 1 - q;
        glow(ctx, x, y, f.r * 1.6, '#ff9a2a', 0.8 * a);
        circle(ctx, x, y, f.r * (0.6 + q * 0.6), null, rgba('#ffe27a', a), 6 * a + 1);
        for (let i = 0; i < 12; i++) {
          const ang = i * TAU / 12, d = f.r * (0.3 + q * 0.9);
          circle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 4 * a, rgba('#ffb347', a));
        }
      }
      return;
    }
    circle(ctx, x, y, r, rgba(color, (0.16 + Math.sin(now * 6) * 0.04) * k), rgba(color, 0.85 * k), 2.5);
    ctx.save(); ctx.translate(x, y); ctx.rotate(now * 0.8);
    ctx.setLineDash([6, 8]); circle(ctx, 0, 0, r * 0.78, null, rgba(color, 0.5 * k), 1.5); ctx.setLineDash([]);
    ctx.restore();
    switch (f.style) {
      case 'banner': {
        const wv = Math.sin(now * 5) * 3;
        line(ctx, x, y, x, y - 56, '#3a2a1a', 4);
        poly(ctx, [x, y - 56, x + 26 + wv, y - 50, x + 22 + wv * 0.5, y - 42, x + 26 + wv, y - 34, x, y - 36], rgba(color, k), rgba(OUT, k), 1.5);
        circle(ctx, x, y - 58, 3, '#e8c15a', OUT, 1);
        break;
      }
      case 'vortex':
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          for (let s = 0; s <= 20; s++) {
            const q = s / 20, ang = -now * 4 + i * TAU / 4 + q * 3, rr = r * (1 - q);
            const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
            s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.strokeStyle = rgba('#d8c8ff', 0.6 * k); ctx.lineWidth = 2; ctx.stroke();
        }
        break;
      case 'clock': {
        for (let i = 0; i < 12; i++) {
          const ang = i * TAU / 12;
          line(ctx, x + Math.cos(ang) * r * 0.85, y + Math.sin(ang) * r * 0.85, x + Math.cos(ang) * r * 0.95, y + Math.sin(ang) * r * 0.95, rgba('#ffffff', 0.7 * k), 2);
        }
        const h = now * 2;
        line(ctx, x, y, x + Math.cos(h) * r * 0.7, y + Math.sin(h) * r * 0.7, rgba('#ffffff', 0.8 * k), 3);
        line(ctx, x, y, x + Math.cos(h / 12) * r * 0.45, y + Math.sin(h / 12) * r * 0.45, rgba('#ffffff', 0.8 * k), 4);
        break;
      }
      case 'fire':
        ctx.save(); ctx.globalAlpha = k;
        for (let i = 0; i < 7; i++) {
          const ang = i * 2.4, d = r * 0.6 * (((i * 0.37) % 1) + 0.15);
          flame(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 4 + Math.sin(now * 9 + i) * 1.5, now + i);
        }
        ctx.restore();
        break;
      case 'arrows':
        for (let i = 0; i < 14; i++) {
          const q = (t * 2.2 + i * 0.13) % 1, ang = i * 2.39, d = r * 0.85 * Math.sqrt((i * 0.618) % 1);
          const ax = x + Math.cos(ang) * d, ay = y + Math.sin(ang) * d, h = (1 - q) * 40;
          line(ctx, ax - 4, ay - h - 10, ax, ay - h, rgba('#f5ecd0', k), 2);
        }
        break;
      case 'roots':
        for (let i = 0; i < 6; i++) {
          const ang = i * TAU / 6 + 0.3, grow = Math.min(1, t / 0.4);
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(ang + 0.6) * r * 0.5, y + Math.sin(ang + 0.6) * r * 0.5, x + Math.cos(ang) * r * 0.9 * grow, y + Math.sin(ang) * r * 0.9 * grow);
          ctx.lineCap = 'round';
          ctx.strokeStyle = rgba('#6b4a22', k); ctx.lineWidth = 4; ctx.stroke();
          ctx.strokeStyle = rgba('#8fd06a', k); ctx.lineWidth = 1.5; ctx.stroke();
        }
        break;
      case 'holy':
        for (let i = 0; i < 10; i++) {
          const q = (t * 0.8 + i * 0.1) % 1, ang = i * 2.4, d = r * 0.8 * ((i * 0.618) % 1);
          circle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d - q * 30, 2.2 * (1 - q) + 0.6, rgba('#fffbe0', k * (1 - q)));
        }
        break;
      case 'pillar': {
        const g = ctx.createLinearGradient(0, y - 220, 0, y);
        g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, 0.6 * k));
        ctx.fillStyle = g; ctx.fillRect(x - r * 0.6, y - 220, r * 1.2, 220);
        glow(ctx, x, y, r * 1.4, color, 0.6 * k);
        break;
      }
    }
  },

  drawOne(ctx, f) {
    const now = this.now;
    const p = Math.min(1, (now - f.t0) / f.dur), a = 1 - p;
    switch (f.type) {
      case 'click': {
        const s = 1 - easeOut(p);
        for (let k = 0; k < 4; k++) {
          const ang = k * TAU / 4 + Math.PI / 4, d = 6 + 14 * s;
          ctx.save(); ctx.translate(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.7); ctx.rotate(ang + Math.PI);
          poly(ctx, [0, -4, 7, 0, 0, 4], rgba('#7dff6a', a), rgba('#1a3a14', a), 1);
          ctx.restore();
        }
        break;
      }
      case 'ring': {
        const implode = f.style === 'implode' || f.style === 'rewind';
        const q = implode ? 1 - easeOut(p) : easeOut(p);
        // (shared-fx polish) the same look as the ability rings: a soft ink band under it so it reads on any floor,
        // then a neon rim (coloured glow, white-hot core) lying flat on the floor, and a light with a hot centre
        const r = f.r * (0.25 + 0.75 * q), fl = 0.78;
        ctx.save();
        ctx.globalAlpha = 0.3 * a; ctx.strokeStyle = '#140c18'; ctx.lineWidth = 3 + 5 * a;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r + 1.5, (r + 1.5) * fl, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        glow(ctx, f.x, f.y, r * 1.2, f.color, 0.22 * a, implode ? 0.6 * a : 0);
        VFX.neonRing(ctx, f.x, f.y, r, f.color, 1.2 + 2.6 * a, a, fl);
        if (f.style === 'rewind') for (let k = 0; k < 3; k++) {
          const ang = -now * 6 + k * TAU / 3;
          VFX.glowAt(ctx, f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r * fl, 7, f.color, a);
        }
        if (f.style === 'mark') {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(now * 3);
          for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); line(ctx, 0, f.r * 0.4, 0, f.r * 0.8, rgba(f.color, a), 3); }
          ctx.restore();
        }
        break;
      }
      case 'flash': {
        // a telegraph going off: the shape flashes white-hot and fades
        ctx.save();
        SHAPES.trace(ctx, f.shape);
        ctx.fillStyle = rgba(f.color || '#ffd8a0', (f.alpha || 0.45) * a * a); ctx.fill();
        ctx.restore();
        break;
      }
      case 'puff': {
        // (shared-fx polish) a little cartoon smoke puff (the VFX smoke sprite, lit from the top left), rising and fading
        const R = f.r * (0.7 + p * 0.9) * 1.7;
        ctx.save(); ctx.globalAlpha = 0.55 * a * a;
        ctx.drawImage(VFX.sprite('smoke', f.color || '#e8e0d0'), f.x - R, f.y - p * 14 - R * 1.1, R * 2, R * 2);
        ctx.restore();
        break;
      }
      case 'ghost': {
        // a dash afterimage: the dash's one picture of the hero, washed in its colour and laid on additively
        const sn = f.snap;
        if (!sn) break;
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(this.ghostScale || this.heroScale, this.ghostScale || this.heroScale);
        if (!sn.cv && typeof heroSnapshot === 'function') {
          const o = sn.owner, cv = heroSnapshot(ctx, sn.cls, sn.angle, { t: now, moving: true, action: null, dashT: now }, { spec: sn.spec }, o._ghostCv || (o._ghostCv = typeof document !== 'undefined' ? document.createElement('canvas') : null));
          if (cv) {
            const c = cv.getContext('2d');
            c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.6; c.fillStyle = sn.color; c.fillRect(0, 0, cv.width, cv.height);
            c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
          }
          sn.cv = cv || null; sn.tried = true;
        }
        if (sn.cv) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42 * a * a; blitHero(ctx, sn.cv); }
        ctx.restore();
        break;
      }
      case 'land': {
        // a dash's arrival: a low ring of dust kicked out round the feet and a few puffs
        const q = easeOut(p), rx = 10 + 22 * q;
        ellipse(ctx, f.x, f.y + 4, rx, rx * 0.5, 0, null, rgba(f.color, 0.45 * a), 2.2 * a + 0.4);
        for (let k = 0; k < 4; k++) {
          const ang = k * TAU / 4 + 0.6, d = 8 + 18 * q;
          circle(ctx, f.x + Math.cos(ang) * d, f.y + 4 + Math.sin(ang) * d * 0.5 - q * 5, 4 + 3 * q, rgba(f.color, 0.28 * a));
        }
        break;
      }
      case 'step':   // a footstep's puff of dust in town: small and faint
        ellipse(ctx, f.x, f.y - p * 3, 3 + 5 * easeOut(p), 1.8 + 2.6 * easeOut(p), 0, rgba(f.color, 0.3 * a * a));
        break;
      case 'cone': {
        const r = f.r * easeOut(Math.min(1, p * 3));
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, r, f.angle - f.span / 2, f.angle + f.span / 2); ctx.closePath();
        fillStroke(ctx, rgba(f.color, 0.28 * a), rgba(f.color, 0.8 * a), 2);
        for (let k = 0; k < 8; k++) {
          const ang = f.angle + (k / 7 - 0.5) * f.span * 0.9, d = r * (0.4 + 0.5 * ((k * 0.37 + p) % 1));
          circle(ctx, f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d, 2.5, rgba('#e8ffe0', a));
        }
        break;
      }
      case 'aura': {
        const e = f.follow, k = Math.min(1, (p * f.dur) / 0.15) * (p > 0.8 ? (1 - p) / 0.2 : 1);
        const r = f.r * (0.9 + Math.sin(now * 8) * 0.05), y = e.y - (e.lift || 0);
        glow(ctx, e.x, y, r * 1.5, f.color, 0.4 * k);
        if (f.style === 'hex') hexagon(ctx, e.x, y, r, rgba(f.color, 0.12 * k), rgba(f.color, 0.9 * k), 2.5, now);
        else if (f.style === 'stasis') {
          circle(ctx, e.x, y, r, rgba(f.color, 0.18 * k), rgba('#ffffff', 0.8 * k), 2);
          for (let i = 0; i < 6; i++) hexagon(ctx, e.x + Math.cos(i * TAU / 6 + now) * r * 0.6, y + Math.sin(i * TAU / 6 + now) * r * 0.6, 10, null, rgba('#ffffff', 0.6 * k), 1.5);
        } else circle(ctx, e.x, y, r, null, rgba(f.color, 0.8 * k), 2.5);
        for (let i = 0; i < 6; i++) {
          const q = (now * 0.9 + i / 6) % 1, ang = i * 1.7;
          circle(ctx, e.x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.5 - q * 30, 2 * (1 - q) + 0.5, rgba(f.color, k * (1 - q)));
        }
        break;
      }
      case 'zone': this.drawZone(ctx, f, p); break;
      case 'slash': {
        const sweep = Math.min(1, p / 0.35), a0 = f.angle - f.span / 2, a1 = a0 + f.span * sweep;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, a0, a1); ctx.arc(f.x, f.y, f.r * 0.55, a1, a0, true); ctx.closePath();
        fillStroke(ctx, rgba(f.color, 0.55 * a), rgba('#ffffff', 0.7 * a), 1.5);
        break;
      }
      case 'projectile': {
        const x = f.sx + (f.x - f.sx) * p, y = f.sy + (f.y - f.sy) * p - 10;
        const dx = f.x - f.sx, dy = f.y - f.sy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        if (f.style === 'fire') {
          for (let k = 1; k <= 4; k++) circle(ctx, x - ux * k * 7, y - uy * k * 7, 6 - k, rgba('#ff7a1a', 0.5 - k * 0.1));
          flame(ctx, x, y, 7, now);
        } else if (f.style === 'leaf') {
          glow(ctx, x, y, 14, f.color, 0.6);
          ctx.save(); ctx.translate(x, y); ctx.rotate(now * 12);
          ellipse(ctx, 0, 0, 6, 3, 0, '#8fff7a', OUT, 1);
          ctx.restore();
        } else {
          // (shared-fx polish) the same comet tail and hot-cored light as the ability missiles
          VFX.streakTo(ctx, x - ux * 26, y - uy * 26, x, y, 4, f.color, 0.85);
          glow(ctx, x, y, 16, f.color, 0.7, 0.9);
        }
        break;
      }
      case 'line': {
        const w = 10 * a + 1;
        line(ctx, f.sx, f.sy - 8, f.x, f.y - 8, rgba(f.color, 0.35 * a), w * 2.2);
        line(ctx, f.sx, f.sy - 8, f.x, f.y - 8, rgba('#ffffff', a), w * 0.6);
        const q = Math.min(1, p * 3);
        glow(ctx, f.sx + (f.x - f.sx) * q, f.sy + (f.y - f.sy) * q - 8, 14, f.color, a);
        break;
      }
      case 'shield': {
        const e = f.follow, k = Math.min(1, (p * f.dur) / 0.1) * (p > 0.85 ? (1 - p) / 0.15 : 1);
        // (shared-fx polish) a front ward like VFX.shield's: a tinted band, a neon rim and a hot light on its face
        const y = e.y - 4 - (e.lift || 0), a0 = e.angle - 0.8, a1 = e.angle + 0.8;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 * k; ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(e.x, y, 38, a0, a1); ctx.arc(e.x, y, 29, a1, a0, true); ctx.closePath(); ctx.fill();
        ctx.restore();
        VFX.neonPath(ctx, f.color, 3, k, () => ctx.arc(e.x, y, 36, a0, a1));
        VFX.glowAt(ctx, e.x + Math.cos(e.angle) * 36, y + Math.sin(e.angle) * 36, 24, f.color, 0.7 * k);
        break;
      }
      case 'text': this.drawText(ctx, f); break;
    }
  },
};

// ---- Comfort (Options > Interface): screen shake, flashes and render quality. They live in the save's settings (so
// the Data tab's export carries them): shake 0..1, reduceFlashes, quality. First run only: the system's "reduce motion"
// starts shake at 30% and reduce-flashes on; after that only the player's own choice counts.
// Reduce flashes scales the bright full-screen washes (FX.flashK); telegraphs, rings and ground markings are never touched.
// Light quality also raises the older 'lowFx' setting, which the Sovereign's rooms and the Ultimate echoes already read.
FX.QUALITY = { full: { dpr: 2, name: 'Full' }, balanced: { dpr: 1.5, name: 'Balanced' }, light: { dpr: 1, name: 'Light' } };
FX.shakeK = 1; FX.flashK = 1; FX.flashLow = 0.25; FX.quality = 'full';
FX.onQuality = null;   // (main.js sets it: the canvases are resized when the quality changes)
// the canvas pixel ratio: the screen's, capped by the quality
FX.dpr = function () { return Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, FX.QUALITY[FX.quality].dpr); };
// the strength of a full-screen wash: 1, or the reduced share when it is bright (a 'screen'/'lighter' blend or a pale colour)
FX.washK = function (color, op) {
  if (FX.flashK >= 1) return 1;
  if (op === 'screen' || op === 'lighter') return FX.flashK;
  const m = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) > 150 ? FX.flashK : 1;
};
FX.comfort = (() => {
  const S = typeof Save !== 'undefined' && Save.setting && Save.setSetting ? Save : null;
  const calm = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const apply = () => {
    const sh = S ? Number(S.setting('shake', 1)) : 1;
    FX.shakeK = Number.isFinite(sh) ? Math.max(0, Math.min(1, sh)) : 1;
    FX.flashK = S && S.setting('reduceFlashes', false) === true ? FX.flashLow : 1;
    const q = S ? S.setting('quality', 'full') : 'full';
    FX.quality = FX.QUALITY[q] ? q : 'full';
  };
  if (S && !S.setting('comfortSet', false)) {
    if (calm()) { S.setSetting('shake', 0.3); S.setSetting('reduceFlashes', true); }
    S.setSetting('comfortSet', true);
  }
  apply();
  return {
    get: () => ({ shake: FX.shakeK, reduceFlashes: FX.flashK < 1, quality: FX.quality }),
    set(k, v) {
      if (!S) return;
      if (k === 'shake') S.setSetting('shake', Math.max(0, Math.min(1, Number(v) || 0)));
      else if (k === 'reduceFlashes') S.setSetting('reduceFlashes', !!v);
      else if (k === 'quality' && FX.QUALITY[v]) { S.setSetting('quality', v); S.setSetting('lowFx', v === 'light'); }
      else return;
      const was = FX.quality;
      apply();
      if (k === 'quality' && was !== FX.quality && typeof FX.onQuality === 'function') FX.onQuality();
    },
  };
})();
