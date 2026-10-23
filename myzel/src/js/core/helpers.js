
/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const dbToGain = (db) => Math.pow(10, db / 20);
const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-9));
const dec = (s) => String(s).replace('.', ',');
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const MOBILE = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
const ANDROID = /Android/i.test(navigator.userAgent);
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// Hexenring: the Werk-Rahmen – this page in a hidden frame of itself (?werk=1) renders offline for the looper (SPEC
// §8): no UI, no storage writes, no MIDI, no Gestik, no live context, no service worker. t/now: a recorded change set at
// its own moment / a recorded state set at once (setP); dead: voices that end during a render, cleaned after it.
const HXW = { on: (() => { try { return /[?&]werk=1(&|$)/.test(location.search); } catch (e) { return false; } })(), t: null, now: false, dead: null, ctx: null };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { if (HXW.on) return false; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },   // (Hexenring: the Werk-Rahmen writes nothing)
};
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return e;
}
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>',
  freeze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  klang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 12h2.5l2-6 3 13 3-15 3 12 2-4H22"/></svg>',
  fx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="9" r="2.2" fill="currentColor"/><circle cx="12" cy="15" r="2.2" fill="currentColor"/><circle cx="19" cy="7" r="2.2" fill="currentColor"/></svg>',
  puls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3.4"/><circle cx="12" cy="3.5" r="1.8" fill="currentColor"/><circle cx="19.4" cy="16.2" r="1.8" fill="currentColor"/><circle cx="4.6" cy="16.2" r="1.8" fill="currentColor"/></svg>',
  rec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 12v7M15 12v7"/><path d="M7.5 5h3v7h-3zM13.5 5h3v7h-3z" fill="currentColor" stroke-width="1"/></svg>',
  presets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c2 3.5 6 4.5 6 9a6 6 0 0 1-12 0c0-4.5 4-5.5 6-9z"/><path d="M12 21v-6"/></svg>',
};

