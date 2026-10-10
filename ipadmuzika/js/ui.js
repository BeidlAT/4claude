// Sphärenwerk – Blätter (Dialoge) und Zettel (kleine Fenster an einer Stelle).
'use strict';

const Sheet = {
  stack: [],
  open(title, body, opts = {}) {
    const root = $('#sheet');
    const panel = h('div', { class: 'sheet-panel' + (opts.wide ? ' wide' : '') + (opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', { class: 'sheet-head' },
        h('h2', null, title),
        h('button', { type: 'button', class: 'icon-btn sheet-x', 'aria-label': 'Schließen', onclick: () => this.close() }, '×')),
      h('div', { class: 'sheet-body' }, body));
    root.replaceChildren(h('div', { class: 'sheet-veil', onclick: () => this.close() }), panel);
    root.hidden = false;
    this.onClose = opts.onClose || null;
    const f = panel.querySelector('button:not(.sheet-x), input, select');
    try { (f || panel.querySelector('.sheet-x')).focus({ preventScroll: true }); } catch (e) { /* egal */ }
    return panel;
  },
  close() {
    const root = $('#sheet');
    if (root.hidden) return;
    root.hidden = true; root.replaceChildren();
    if (this.onClose) { const f = this.onClose; this.onClose = null; f(); }
  },
  get isOpen() { return !$('#sheet').hidden; },
};

const Pop = {
  open(x, y, content, opts = {}) {
    const el = $('#pop');
    el.replaceChildren(content);
    el.hidden = false;
    el.style.left = '0px'; el.style.top = '0px';
    const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    let px = x - r.width / 2, py = opts.below ? y + 14 : y - r.height - 14;
    if (py < 8) py = y + 14;
    if (py + r.height > H - 8) py = Math.max(8, H - r.height - 8);
    px = clamp(px, 8, W - r.width - 8);
    el.style.left = px + 'px'; el.style.top = py + 'px';
    setTimeout(() => {
      const off = (e) => { if (!el.contains(e.target)) { this.close(); document.removeEventListener('pointerdown', off, true); } };
      this.off = off;
      document.addEventListener('pointerdown', off, true);
    }, 0);
  },
  close() {
    const el = $('#pop');
    el.hidden = true; el.replaceChildren();
    if (this.off) { document.removeEventListener('pointerdown', this.off, true); this.off = null; }
  },
};

// Schieberegler als Zeile: Beschriftung, Wert, input[type=range]
function sliderRow(id, label, min, max, step, value, fmt, onInput) {
  const out = h('output', { for: id }, fmt(value));
  const inp = h('input', { type: 'range', id, min, max, step, value });
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); out.textContent = fmt(v); onInput(v); });
  return h('label', { class: 'srow', for: id }, h('span', { class: 'srow-l' }, label), out, inp);
}

// Auswahl als Reihe von Knöpfen
function chips(list, current, onPick, cls) {
  const wrap = h('div', { class: 'chips' + (cls ? ' ' + cls : ''), role: 'radiogroup' });
  for (const it of list) {
    const b = h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(it.id === current), onclick: () => {
      for (const x of wrap.children) x.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-checked', 'true');
      onPick(it.id);
    } }, it.label);
    wrap.append(b);
  }
  return wrap;
}

// Zweistufige Bestätigung im Knopf selbst (confirm() gibt es im Betrachter nicht)
function confirmButton(label, ask, fn, cls) {
  let armed = false, t = 0;
  const b = h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: () => {
    if (!armed) { armed = true; b.textContent = ask; b.classList.add('armed'); t = setTimeout(() => { armed = false; b.textContent = label; b.classList.remove('armed'); }, 3000); return; }
    clearTimeout(t); fn();
  } }, label);
  return b;
}

function svgIcon(path, cls) {
  const s = h('svg', { viewBox: '0 0 24 24', class: cls || 'ico', 'aria-hidden': 'true' });
  s.append(h('path', { d: path }));
  return s;
}
