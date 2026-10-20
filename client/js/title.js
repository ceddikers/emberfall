// The title screen: Emberfall at dusk, seen from the hills. A dark sky going to ember at the horizon, the far peak
// with Volkar's storm flickering over it, the Barrow's hill, the town's roofs and lit windows, and embers drifting up.
// Any key or click opens the way in (the join card); it fades out on its own once you're in.

const Title = (() => {
  // the road so far: each boss is named once the one before it has fallen (the rest stay a surprise)
  function road() {
    const all = [['grubnak', 'Grubnak'], ['skitterra', 'Skitterra'], ['volkar', 'Volkar'], ['hollowking', 'the Hollow King']];
    let open = true;
    try { if (localStorage.getItem('emberfall.unlockAll') === '1') return all.map(b => b[1]).join(' · '); } catch (e) { /* no storage */ }
    return all.map(([id, name]) => { const show = open; open = open && typeof Save !== 'undefined' && Save.bossBeaten(id); return show ? name : '?'; }).join(' · ');
  }
  const el = document.createElement('div');
  el.id = 'title';
  el.innerHTML = `<canvas></canvas>
    <div class="ti-mark"><small>A raid for four</small><h1>Emberfall</h1><i class="ti-rule"></i></div>
    <p class="ti-press">Press any key</p>
    <p class="ti-foot">${road()}</p>`;
  document.body.appendChild(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, on = true, t0 = performance.now(), mx = 0, my = 0, raf = 0;

  // the landscape, fixed per load (seeded so it doesn't shift between visits)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ridge = (n, base, amp, rough) => { const pts = []; let v = 0; for (let i = 0; i <= n; i++) { v = v * 0.6 + (rnd() - 0.5) * rough; pts.push(base + Math.sin(i / n * Math.PI * 2.3 + base) * amp + v * amp); } return pts; };
  const far = ridge(48, 0.6, 0.06, 1.6), mid = ridge(40, 0.7, 0.04, 1.2);
  const stars = Array.from({ length: 140 }, () => [rnd(), rnd() * 0.55, rnd() * 1.2 + 0.2, rnd() * 6]);
  const houses = Array.from({ length: 26 }, (_, i) => ({ x: 0.08 + i * 0.034 + rnd() * 0.012, w: 0.018 + rnd() * 0.016, h: 0.035 + rnd() * 0.04, roof: rnd() < 0.5, win: rnd() < 0.75, flick: rnd() * 6 }));
  const embers = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), s: rnd() * 1.8 + 0.6, v: rnd() * 0.03 + 0.012, w: rnd() * 6 }));

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function line(pts, y0, color, par) {
    ctx.beginPath(); ctx.moveTo(-20, H);
    pts.forEach((v, i) => ctx.lineTo(-20 + i / (pts.length - 1) * (W + 40) + mx * par, (v + y0) * H + my * par * 0.4));
    ctx.lineTo(W + 20, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function frame(now) {
    if (!on) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky: night above, ember at the horizon
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07060c'); sky.addColorStop(0.45, '#1a1220'); sky.addColorStop(0.68, '#4a2418'); sky.addColorStop(0.78, '#a2481e'); sky.addColorStop(1, '#1a0c08');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (const [x, y, r, p] of stars) { ctx.globalAlpha = 0.25 + 0.35 * (0.5 + Math.sin(t * 0.8 + p) * 0.5); ctx.fillStyle = '#f2e6c8'; ctx.fillRect(x * W + mx * 0.1, y * H, r, r); }
    ctx.globalAlpha = 1;
    // the far peak, and the storm that lives over it (a flicker now and then)
    const px = W * 0.7 + mx * 0.15, py = H * 0.4;
    const flash = Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 2.7 + 1) - 0.82) * 5;
    if (flash > 0) { const g = ctx.createRadialGradient(px, py - H * 0.06, 0, px, py - H * 0.06, H * 0.3); g.addColorStop(0, `rgba(170,210,255,${0.35 * flash})`); g.addColorStop(1, 'rgba(170,210,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.beginPath(); ctx.moveTo(px - W * 0.24, H * 0.72); ctx.lineTo(px - W * 0.04, py + H * 0.02); ctx.lineTo(px, py); ctx.lineTo(px + W * 0.03, py + H * 0.03); ctx.lineTo(px + W * 0.26, H * 0.72); ctx.closePath();
    ctx.fillStyle = '#1c1420'; ctx.fill();
    ctx.fillStyle = 'rgba(16,12,20,0.9)';   // the storm cloud over it
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(px + (i - 2.5) * W * 0.03 + Math.sin(t * 0.2 + i) * 6, py - H * 0.07 + Math.cos(i * 1.7) * 6, W * 0.045, H * 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
    line(far, 0.06, '#170f18', 0.25);
    // the Barrow's hill with its lone green light
    const bx = W * 0.2 + mx * 0.3, by = H * 0.66;
    ctx.beginPath(); ctx.moveTo(bx - W * 0.2, H); ctx.quadraticCurveTo(bx - W * 0.1, by - H * 0.005, bx, by - H * 0.012); ctx.quadraticCurveTo(bx + W * 0.1, by - H * 0.005, bx + W * 0.2, H); ctx.closePath(); ctx.fillStyle = '#140d14'; ctx.fill();
    const gl = 0.5 + Math.sin(t * 1.3) * 0.25, gg = ctx.createRadialGradient(bx, by - H * 0.005, 0, bx, by - H * 0.005, 26);
    gg.addColorStop(0, `rgba(110,255,154,${0.5 * gl})`); gg.addColorStop(1, 'rgba(110,255,154,0)'); ctx.fillStyle = gg; ctx.fillRect(bx - 30, by - 30, 60, 60);
    line(mid, 0.08, '#0f0a0c', 0.45);
    // the town: roofs against the glow, warm windows
    const ty = H * 0.86 + my * 0.2;
    for (const h of houses) {
      const x = h.x * W + mx * 0.6, w = h.w * W, hh = h.h * H;
      ctx.fillStyle = '#0a0607';
      ctx.fillRect(x, ty - hh, w, hh + H * 0.2);
      if (h.roof) { ctx.beginPath(); ctx.moveTo(x - 3, ty - hh); ctx.lineTo(x + w / 2, ty - hh - w * 0.55); ctx.lineTo(x + w + 3, ty - hh); ctx.fill(); }
      if (h.win) { ctx.fillStyle = `rgba(255,190,110,${0.65 + Math.sin(t * 3 + h.flick) * 0.12})`; ctx.fillRect(x + w * 0.35, ty - hh * 0.6, Math.max(3, w * 0.22), Math.max(3, hh * 0.22)); }
    }
    ctx.fillStyle = '#060404'; ctx.fillRect(0, ty + H * 0.02, W, H);
    // embers rising out of the town
    for (const e of embers) {
      e.y -= e.v / 60; if (e.y < -0.05) { e.y = 1.02; e.x = Math.random(); }
      const x = e.x * W + Math.sin(t * 0.8 + e.w) * 18 + mx * 0.8, y = e.y * H;
      ctx.globalAlpha = Math.min(1, (1 - e.y) * 1.6) * (0.5 + Math.sin(t * 4 + e.w) * 0.3);
      ctx.fillStyle = e.s > 1.8 ? '#ffd08a' : '#ff8a3a';
      ctx.fillRect(x, y, e.s, e.s);
    }
    ctx.globalAlpha = 1;
    // a soft vignette
    const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // the way in: the title steps back and the join card comes up over the same view
  let opened = false;
  function open() {
    if (opened) return;
    opened = true;
    el.classList.add('opened');
    const join = document.getElementById('join');
    if (join) join.classList.add('over-title');
    setTimeout(() => { const n = document.getElementById('name-input'); if (n && !n.value) n.focus(); }, 500);
  }
  // in the game: the title goes for good
  function hide() {
    if (!on) return;
    el.classList.add('gone');
    const join = document.getElementById('join');
    if (join) join.classList.remove('over-title');   // (if the join card comes back later, it's on its own)
    setTimeout(() => { on = false; cancelAnimationFrame(raf); el.remove(); }, 800);
  }
  addEventListener('resize', resize);
  addEventListener('mousemove', e => { mx = (e.clientX / (W || 1) - 0.5) * -24; my = (e.clientY / (H || 1) - 0.5) * -16; });
  addEventListener('keydown', e => { if (on && !opened && !e.altKey && !e.ctrlKey && !e.metaKey && !/^F\d{1,2}$/.test(e.key)) { e.preventDefault(); open(); } }, true);
  el.addEventListener('click', open);
  resize();
  raf = requestAnimationFrame(frame);
  return { open, hide, isOn: () => on };
})();
