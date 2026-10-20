// In-game tooltips (never the browser's own title= popups). Anything with a data-tip attribute,
// or registered with Tip.set(el, html | () => html), gets a styled tooltip that follows the cursor.

const Tip = (() => {
  const el = document.createElement('div');
  el.id = 'tip'; el.className = 'hidden';
  document.body.appendChild(el);
  const fns = new WeakMap();
  let cur = null, shown = '', mx = -1, my = -1;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function owner(t) {
    for (let n = t; n && n.nodeType === 1; n = n.parentNode) if (fns.has(n) || n.dataset.tip) return n;
    return null;
  }
  function content(n) {
    const f = fns.get(n);
    if (f) return typeof f === 'function' ? f() : f;
    return n.dataset.tip ? esc(n.dataset.tip) : '';
  }
  function place() {
    const r = el.getBoundingClientRect();
    let x = mx + 16, y = my + 20;
    if (x + r.width > innerWidth - 8) x = mx - r.width - 12;
    if (y + r.height > innerHeight - 8) y = my - r.height - 14;
    el.style.transform = `translate(${Math.round(Math.max(8, x))}px, ${Math.round(Math.max(8, y))}px)`;
  }
  // which element is under the cursor? (re-checked on a timer too, because UI that re-renders
  // under a still mouse replaces the hovered element)
  function check() {
    if (mx < 0) return;
    const n = owner(document.elementFromPoint(mx, my));
    // live tips (functions) are rebuilt while hovered so readouts like gauge values stay current
    if (n !== cur || (n && typeof fns.get(n) === 'function')) {
      cur = n;
      const html = n ? (typeof Num !== 'undefined' ? Num.fill(content(n)) : content(n)) : '';   // (move text: exact numbers, numbers.js)
      el.classList.toggle('hidden', !html);
      if (html && html !== shown) el.innerHTML = html;
      shown = html;
    }
    if (cur && !el.classList.contains('hidden')) place();
  }
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; check(); }, { passive: true });
  document.addEventListener('mouseleave', () => { mx = -1; hide(); });
  setInterval(check, 250);

  function set(node, html) { fns.set(node, html); }
  function hide() { cur = null; shown = ''; el.classList.add('hidden'); }
  return { set, hide, esc };
})();
