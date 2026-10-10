// Sphärenwerk – kleine Helfer für DOM, Speicher, Hinweise und Zahlen.
'use strict';

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IN_VIEWER = !!(window.claude && typeof window.claude.use === 'function');
const STANDALONE = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// h('div', { class: 'x', onclick: fn }, kind1, kind2 …)
function h(tag, attrs, ...kids) {
  const el = document.createElementNS(tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'g' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  json(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } },
};

let toastTimer = 0;
function toast(msg, ms, action) {
  const el = $('#toast');
  if (!el) return;
  el.replaceChildren(h('span', null, msg));
  if (action) el.append(h('button', { type: 'button', class: 'toast-act', onclick: () => { el.hidden = true; action.fn(); } }, action.label));
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms || 3200);
}

function debounce(fn, ms) { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

let uidN = Date.now() % 100000;
const uid = (p) => p + (++uidN).toString(36);

const fnum1 = (v, d) => v.toFixed(d).replace('.', ',');

function isoDate(d) { const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function stamp(d) { const p = (n) => String(n).padStart(2, '0'); return isoDate(d) + '_' + p(d.getHours()) + p(d.getMinutes()); }
function slug(s) {
  return (s || 'aufnahme').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'aufnahme';
}

// Pointer-Hilfe: zieht mit Fangen und meldet Bewegung relativ zum Start
function dragger(el, { down, move, up, tap, longpress, threshold = 6 }) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const st = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false, e };
    if (down && down(e, st) === false) return;
    e.stopPropagation();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    let lp = 0;
    if (longpress) lp = setTimeout(() => { if (!st.moved) { st.long = true; longpress(e, st); } }, 480);
    const mv = (ev) => {
      if (ev.pointerId !== st.id) return;
      const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) > threshold) { st.moved = true; clearTimeout(lp); }
      if (st.moved && move) move(ev, dx, dy, st);
    };
    const fin = (ev) => {
      if (ev.pointerId !== st.id) return;
      clearTimeout(lp);
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin);
      if (!st.moved && !st.long && tap && ev.type === 'pointerup') tap(ev, st);
      if (up) up(ev, st);
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  });
}
