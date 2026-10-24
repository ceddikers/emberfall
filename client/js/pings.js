// Pings: a mark on the floor everyone in the raid sees for a few seconds, from the one who placed it.
//   Middle-click: a plain ping where you click.
//   Alt + left-drag: a wheel of eight callouts round the cursor; let go over one to ping it where you pressed.
// The callouts are yours to change (Callouts panel): each slot is a short line of text, or a small image you load from
// your own computer. Images stay in this browser and go out to the party only inside the pings you send.

const Pings = (() => {
  const KEY = 'emberfall.callouts', N = 8, LIFE = 4, IMG_MAX = 24000;
  const DEFAULTS = ['Stack', 'Spread', 'Move', 'On me', 'Danger', 'Go here', 'Wait', 'Nice'].map(text => ({ text }));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // a callout as it travels: { text } or { img } (a small data: image); anything else is dropped
  const clean = c => {
    if (!c || typeof c !== 'object') return null;
    if (typeof c.img === 'string' && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(c.img) && c.img.length <= IMG_MAX) return { img: c.img };
    if (typeof c.text === 'string' && c.text.trim()) return { text: c.text.trim().slice(0, 24) };
    return null;
  };

  let slots = DEFAULTS.map(x => Object.assign({}, x));
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(v)) slots = Array.from({ length: N }, (_, i) => clean(v[i]) || Object.assign({}, DEFAULTS[i]));
  } catch (e) { /* the defaults */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch (e) { /* not remembered */ } };

  // ---------------------------------------------------------------- the wheel
  let wheel = null, wheelEl = null;
  const R = 92;
  function slotHtml(c) { return c.img ? `<u style="background-image:url(${c.img})"></u>` : `<b>${esc(c.text)}</b>`; }
  function wheelOpen(sx, sy) {
    if (!wheelEl) { wheelEl = document.createElement('div'); wheelEl.id = 'ping-wheel'; document.body.appendChild(wheelEl); }
    wheel = { sx, sy, pick: -1 };
    wheelEl.innerHTML = `<i class="pw-hub"></i>` + slots.map((c, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / N;
      return `<span class="pw-slot" style="left:${(Math.cos(a) * R).toFixed(1)}px;top:${(Math.sin(a) * R).toFixed(1)}px">${slotHtml(c)}</span>`;
    }).join('');
    wheelEl.style.left = sx + 'px'; wheelEl.style.top = sy + 'px';
    wheelEl.classList.add('on');
  }
  function wheelMove(x, y) {
    if (!wheel) return;
    const dx = x - wheel.sx, dy = y - wheel.sy;
    let pick = -1;
    if (Math.hypot(dx, dy) > 26) pick = ((Math.round((Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2 / N)) % N) + N) % N;
    if (pick === wheel.pick) return;
    wheel.pick = pick;
    [...wheelEl.querySelectorAll('.pw-slot')].forEach((el, i) => el.classList.toggle('pick', i === pick));
  }
  // let go: the callout picked, or null (back in the middle)
  function wheelClose() {
    if (!wheel) return null;
    const c = wheel.pick >= 0 ? slots[wheel.pick] : null;
    wheel = null;
    if (wheelEl) wheelEl.classList.remove('on');
    return c ? Object.assign({}, c) : null;
  }

  // ---------------------------------------------------------------- the pings on the floor
  const live = [], imgs = new Map();
  const imgOf = src => { if (!imgs.has(src)) { const im = new Image(); im.src = src; imgs.set(src, im); if (imgs.size > 64) imgs.delete(imgs.keys().next().value); } return imgs.get(src); };
  // p: { x, y, c (callout or null), name, color }
  function add(p, now) {
    live.push(Object.assign({ t: now }, p, { c: clean(p.c) }));
    if (live.length > 24) live.shift();
  }
  function draw(ctx, now) {
    for (let i = live.length - 1; i >= 0; i--) if (now - live[i].t > LIFE) live.splice(i, 1);
    for (const p of live) {
      const age = now - p.t, k = Math.min(1, age / 0.12) * Math.min(1, (LIFE - age) / 0.6), col = p.color || '#e8c15a';
      ctx.save();
      ctx.globalAlpha = k;
      // the spot: a ring that lands, then two that ripple out of it for the first second
      for (let j = 0; j < 2; j++) {
        const q = (age - j * 0.35) / 0.9;
        if (q <= 0 || q >= 1) continue;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 18 + 40 * q, (18 + 40 * q) * 0.55, 0, 0, Math.PI * 2);
        ctx.lineWidth = 2.5 * (1 - q); ctx.strokeStyle = col; ctx.globalAlpha = k * (1 - q); ctx.stroke();
      }
      ctx.globalAlpha = k;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 16, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
      // the pin and its callout above it
      const top = p.y - 34;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 2); ctx.lineTo(p.x, top + 6); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      if (p.c && p.c.img) {
        const im = imgOf(p.c.img), S = 44;
        ctx.fillStyle = 'rgba(10,8,7,0.85)'; ctx.fillRect(p.x - S / 2 - 3, top - S - 3, S + 6, S + 6);
        ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.strokeRect(p.x - S / 2 - 3, top - S - 3, S + 6, S + 6);
        if (im.complete && im.naturalWidth) ctx.drawImage(im, p.x - S / 2, top - S, S, S);
      } else {
        const text = p.c && p.c.text ? p.c.text : '!';
        ctx.font = `700 ${p.c ? 14 : 18}px Cinzel, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = Math.max(22, ctx.measureText(text).width + 16), h = 22;
        ctx.fillStyle = 'rgba(10,8,7,0.88)'; ctx.fillRect(p.x - w / 2, top - h, w, h);
        ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.strokeRect(p.x - w / 2, top - h, w, h);
        ctx.fillStyle = '#fff3e0'; ctx.fillText(text, p.x, top - h / 2 + 1);
      }
      // who placed it
      if (p.name) { ctx.font = '600 10px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = col; ctx.fillText(p.name, p.x, p.y + 12); }
      ctx.restore();
    }
  }
  const clear = () => { live.length = 0; };

  // ---------------------------------------------------------------- the Callouts panel
  let panel = null;
  // a picked image, shrunk to 64 px (it has to fit in a ping)
  function shrink(file, done) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const c = cv.getContext('2d'), s = Math.min(64 / im.width, 64 / im.height), w = im.width * s, h = im.height * s;
        c.drawImage(im, (64 - w) / 2, (64 - h) / 2, w, h);
        let url = cv.toDataURL('image/webp', 0.85);
        if (!/^data:image\/webp/.test(url) || url.length > IMG_MAX) url = cv.toDataURL('image/png');
        done(url.length <= IMG_MAX ? url : null);
      };
      im.onerror = () => done(null);
      im.src = fr.result;
    };
    fr.onerror = () => done(null);
    fr.readAsDataURL(file);
  }
  // ---- the emote library: images cut from a sheet (or loaded one by one), kept in this browser
  const LIB_KEY = 'emberfall.emotes', LIB_MAX = 160;
  let lib = [];
  try { const v = JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); if (Array.isArray(v)) lib = v.filter(u => clean({ img: u })); } catch (e) { /* none yet */ }
  const saveLib = () => { try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); } catch (e) { /* too big to keep: the rest stays for this visit */ } };
  // a region of a canvas, its outer background (white, or clear) knocked out from the edges in (so white eyes stay),
  // trimmed and fitted into 64 px
  function cutOut(src, x0, y0, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); c.drawImage(src, x0, y0, w, h, 0, 0, w, h);
    const d = c.getImageData(0, 0, w, h), px = d.data;
    const bg = i => px[i + 3] < 24 || (px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232);
    const seen = new Uint8Array(w * h), stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const k = stack.pop();
      if (seen[k] || !bg(k * 4)) continue;
      seen[k] = 1; px[k * 4 + 3] = 0;
      const x = k % w, y = (k - x) / w;
      if (x > 0) stack.push(k - 1); if (x < w - 1) stack.push(k + 1); if (y > 0) stack.push(k - w); if (y < h - 1) stack.push(k + w);
    }
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    if (maxX - minX < 8 || maxY - minY < 8) return null;
    c.putImageData(d, 0, 0);
    const out = document.createElement('canvas'); out.width = out.height = 64;
    const o = out.getContext('2d'), bw = maxX - minX + 1, bh = maxY - minY + 1, sc = Math.min(64 / bw, 64 / bh);
    o.drawImage(cv, minX, minY, bw, bh, (64 - bw * sc) / 2, (64 - bh * sc) / 2, bw * sc, bh * sc);
    let url = out.toDataURL('image/webp', 0.85);
    if (!/^data:image\/webp/.test(url)) url = out.toDataURL('image/png');
    return url.length <= IMG_MAX ? url : null;
  }
  // a sheet of emotes on a plain background: cut along the empty rows and columns between them
  function cutSheet(im) {
    const W = im.naturalWidth, H = im.naturalHeight;
    if (W * H > 4096 * 4096) return [];   // (too big to scan without freezing the page)
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.drawImage(im, 0, 0);
    const px = c.getImageData(0, 0, W, H).data;
    const ink = (x, y) => { const i = (y * W + x) * 4; return px[i + 3] >= 24 && !(px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232); };
    // runs of rows (or columns) with ink in them
    const bands = (n, m, at) => {
      const out = []; let start = -1;
      for (let i = 0; i <= n; i++) {
        let has = false;
        if (i < n) for (let j = 0; j < m; j += 2) if (at(i, j)) { has = true; break; }
        if (has && start < 0) start = i;
        if (!has && start >= 0) { if (i - start >= 12) out.push([start, i]); start = -1; }
      }
      return out;
    };
    const urls = [];
    for (const [y0, y1] of bands(H, W, (y, x) => ink(x, y))) {
      for (const [x0, x1] of bands(W, y1 - y0, (x, j) => ink(x, y0 + j))) {
        const u = cutOut(cv, x0, y0, x1 - x0, y1 - y0);
        if (u) urls.push(u);
        if (urls.length >= LIB_MAX) return urls;
      }
    }
    return urls;
  }
  function loadImageFile(file, done) {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => done(im); im.onerror = () => done(null); im.src = fr.result; };
    fr.onerror = () => done(null);
    fr.readAsDataURL(file);
  }

  let picking = -1;   // the slot whose image is being chosen from the library
  function render() {
    panel.querySelector('.co-list').innerHTML = slots.map((c, i) => `
      <div class="co-row${i === picking ? ' picking' : ''}" data-i="${i}">
        <span class="co-prev">${slotHtml(c)}</span>
        <input class="co-text" maxlength="24" value="${c.img ? '' : esc(c.text)}" placeholder="${c.img ? 'Image' : 'Text'}" autocomplete="off">
        <button type="button" class="btn2 co-img">Image</button>
        <button type="button" class="btn2 co-reset" data-tip="Back to “${DEFAULTS[i].text}”" aria-label="Reset"><svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 4.2A3.6 3.6 0 1 1 2.6 7.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1.6 2.2 3.1 4.6 5.6 3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`).join('');
    const pick = panel.querySelector('.co-pick');
    pick.classList.toggle('hidden', picking < 0);
    if (picking >= 0) pick.innerHTML = `<h4>Image for slot ${picking + 1}<button type="button" class="btn2 co-file-btn">From a file</button></h4>` +
      (lib.length ? `<div class="co-lib">${lib.map((u, j) => `<u data-j="${j}" style="background-image:url(${u})"></u>`).join('')}</div>`
        : `<p class="co-note">No emotes yet: load a sheet, or pick a file.</p>`);
    panel.querySelector('.co-libn').textContent = lib.length ? `${lib.length} emote${lib.length === 1 ? '' : 's'}` : '';
    const clr = panel.querySelector('.co-lib-clear');
    clr.classList.toggle('hidden', !lib.length); delete clr.dataset.confirm; clr.classList.remove('armed'); clr.textContent = 'Clear emotes';
  }
  function openPanel() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'callouts'; panel.className = 'hidden';
      panel.innerHTML = `<header><h3>Callouts</h3><button type="button" class="close" aria-label="Close" data-tip="Close (Esc)">×</button></header>
        <p class="co-note">The ping wheel's eight slots, clockwise from the top. Images stay in this browser and travel only inside your pings.</p>
        <div class="co-sheet"><button type="button" class="btn2 co-sheet-btn">Load a sheet</button><span class="co-libn"></span><button type="button" class="btn2 co-lib-clear">Clear emotes</button></div>
        <div class="co-list"></div>
        <div class="co-pick hidden"></div>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="co-file" hidden>
        <input type="file" accept="image/png,image/jpeg,image/webp" class="co-sheet-file" hidden>`;
      document.body.appendChild(panel);
      panel.addEventListener('mousedown', e => e.stopPropagation());
      panel.querySelector('.close').addEventListener('click', closePanel);
      panel.addEventListener('input', e => {
        const row = e.target.closest('.co-row');
        if (!row || !e.target.classList.contains('co-text')) return;
        const i = Number(row.dataset.i), v = e.target.value.trim().slice(0, 24);
        slots[i] = v ? { text: v } : Object.assign({}, DEFAULTS[i]);
        row.querySelector('.co-prev').innerHTML = slotHtml(slots[i]);
        save();
      });
      panel.addEventListener('click', e => {
        const t = e.target;
        if (t.classList.contains('co-sheet-btn')) { panel.querySelector('.co-sheet-file').click(); return; }
        if (t.classList.contains('co-lib-clear')) {
          if (!t.dataset.confirm) { t.dataset.confirm = '1'; t.textContent = `Clear ${lib.length} emote${lib.length === 1 ? '' : 's'}?`; t.classList.add('armed'); return; }
          lib = []; saveLib(); render(); return;
        }
        if (t.classList.contains('co-file-btn')) { panel.querySelector('.co-file').click(); return; }
        if (t.dataset.j != null && picking >= 0) { slots[picking] = { img: lib[Number(t.dataset.j)] }; save(); picking = -1; render(); return; }
        const row = t.closest('.co-row');
        if (!row) return;
        const i = Number(row.dataset.i);
        if (t.classList.contains('co-img')) { picking = picking === i ? -1 : i; render(); }
        if (t.classList.contains('co-reset')) { slots[i] = Object.assign({}, DEFAULTS[i]); save(); render(); }
      });
      panel.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (e.target.classList.contains('co-file') && picking >= 0) {
          const i = picking;
          shrink(f, url => { if (url) { slots[i] = { img: url }; save(); if (!lib.includes(url)) { lib.push(url); saveLib(); } } picking = -1; render(); });
        }
        if (e.target.classList.contains('co-sheet-file')) {
          loadImageFile(f, im => {
            const room = () => 600000 - lib.reduce((n, u) => n + u.length, 0);   // (~600 KB of this browser's storage at most)
            if (im) for (const u of cutSheet(im)) if (!lib.includes(u) && lib.length < LIB_MAX && room() > u.length) lib.push(u);
            saveLib(); render();
          });
        }
        e.target.value = '';
      });
    }
    picking = -1;
    render();
    panel.classList.remove('hidden');
  }
  function closePanel() { if (panel) { panel.classList.add('hidden'); if (document.activeElement && panel.contains(document.activeElement)) document.activeElement.blur(); } }
  const panelOpen = () => !!panel && !panel.classList.contains('hidden');

  return { _cutSheet: cutSheet, wheelOpen, wheelMove, wheelClose, wheelIsOpen: () => !!wheel, add, draw, clear, clean, openPanel, closePanel, panelOpen };
})();

if (typeof module !== 'undefined') module.exports = { Pings };
