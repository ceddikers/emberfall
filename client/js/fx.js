// Visual effects shared by the town and the arena: ability visuals, floating numbers, rings, trails.
// Purely cosmetic. Game logic never reads anything in here.

const FX = {
  list: [], pending: [], now: 0, heroScale: 1.5, shake: 0,
  muted: false,   // a hidden tab spawns nothing (it would all play at once on the way back)
  GROUND: new Set(['zone', 'click', 'ring', 'puff', 'cone', 'aura', 'ghost', 'flash']),

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
  },

  text(x, y, text, color = '#ffffff', size = 16, dur = 0.9) {
    this.add({ type: 'text', x: x + (Math.random() - 0.5) * 24, y, text, color, size, dur });
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
        VFX.setScale(dim);
        try { recipe({ ent, x: ent.x, y: ent.y, tx, ty, ang: ent.angle, tent: opts.tent || null, mine: !!opts.mine, cam, later: (d, fn) => this.later(d, () => { VFX.setScale(dim); try { fn(); } finally { VFX.setScale(1); } }) }); }
        finally { VFX.setScale(1); }
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
    // (called every frame while dashing: at most ~45 afterimages a second, so a 144 Hz screen doesn't draw three times
    // as many full hero ghosts as a 60 Hz one)
    if (this.now - (ent._trailAt ?? -1) < 1 / 45) return;
    ent._trailAt = this.now;
    this.add({ type: 'ghost', cls: ent.cls, x: ent.x, y: ent.y, angle: ent.angle, dur: 0.25 });
    if (Math.random() < 0.5) this.add({ type: 'puff', x: ent.x + (Math.random() - 0.5) * 12, y: ent.y + (Math.random() - 0.5) * 12, r: 9, color: color || '#ffffff', dur: 0.5 });
  },

  draw(ctx, ground) {
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
        const r = f.r * (0.25 + 0.75 * q);
        glow(ctx, f.x, f.y, r * 1.2, f.color, 0.25 * a);
        circle(ctx, f.x, f.y, r, null, rgba(f.color, a), 4 * a + 1);
        if (f.style === 'rewind') for (let k = 0; k < 3; k++) {
          const ang = -now * 6 + k * TAU / 3;
          circle(ctx, f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r, 3, rgba('#ffffff', a));
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
      case 'puff': circle(ctx, f.x, f.y - p * 10, f.r * (0.6 + p * 0.8), rgba(f.color, 0.5 * a)); break;
      case 'ghost':
        ctx.save(); ctx.globalAlpha = 0.35 * a;
        drawHero(ctx, f.cls, f.x, f.y, f.angle, { t: now, moving: false, action: null }, this.heroScale, { ring: false, noShadow: true });
        ctx.restore();
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
          line(ctx, x - ux * 22, y - uy * 22, x, y, rgba(f.color, 0.5), 5);
          glow(ctx, x, y, 16, f.color, 0.7);
          circle(ctx, x, y, 5, '#ffffff');
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
        const y = e.y - 4 - (e.lift || 0);
        ctx.beginPath(); ctx.arc(e.x, y, 36, e.angle - 0.8, e.angle + 0.8);
        ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = rgba(f.color, 0.3 * k); ctx.stroke();
        ctx.lineWidth = 3.5; ctx.strokeStyle = rgba('#ffffff', 0.85 * k); ctx.stroke();
        glow(ctx, e.x + Math.cos(e.angle) * 36, y + Math.sin(e.angle) * 36, 26, f.color, 0.5 * k);
        break;
      }
      case 'text':
        ctx.save(); ctx.globalAlpha = a;
        label(ctx, f.text, f.x, f.y - easeOut(p) * 36, f.color, f.size, 'system-ui, sans-serif', 800);
        ctx.restore();
        break;
    }
  },
};
