// ---- (owner, 26.10.2026: „den Mixer gerne als Ganzes darstellen, mit Einklappfunktion und der Möglichkeit, ihn in
// seiner Breite zu verschieben“) on a wide screen the mixer's sheet takes the width the player drags its left edge to
// (a double click: the whole width, again: as before), and folds to a narrow bar at the right edge (its button in the
// head; the bar unfolds it). Both kept on this device; the Pult lays itself out again (its ResizeObserver). ----
const MXW = { w: 0, mini: false, grip: null, fold: null, bar: null };
try { MXW.w = +localStorage.getItem('myzel.mixW') || 0; MXW.mini = localStorage.getItem('myzel.mixMini') === '1'; } catch (e) {}
const mxwSave = () => { try { localStorage.setItem('myzel.mixW', String(MXW.w || 0)); localStorage.setItem('myzel.mixMini', MXW.mini ? '1' : '0'); } catch (e) {} };
const mxwMax = () => Math.max(480, window.innerWidth - 40);   // (a sliver of the field stays: the page keeps its layout)
function mxwApply() {
  const sh = $('#sheet'); if (!sh) return;
  const on = sh.dataset.panel === 'mix';
  sh.style.setProperty('--mixw', on && MXW.w ? Math.round(clamp(MXW.w, 480, mxwMax())) + 'px' : '');
  sh.classList.toggle('mx-mini', on && MXW.mini);
  if (MXW.fold) { MXW.fold.textContent = MXW.mini ? '‹' : '›'; MXW.fold.setAttribute('aria-expanded', String(!MXW.mini)); }
}
function mxwBuild() {
  const sh = $('#sheet'); if (!sh || MXW.grip) return;
  MXW.grip = h('div', { class: 'mx-grip', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Breite des Mixers', tabindex: '0', title: 'Ziehen: der Mixer breiter oder schmaler · Doppelklick: ganze Breite / wie vorher · Pfeiltasten: in Schritten' });
  let x0 = 0, w0 = 0, prev = 0;
  MXW.grip.addEventListener('pointerdown', (e) => { if (e.button > 0) return; x0 = e.clientX; w0 = sh.getBoundingClientRect().width; MXW.grip.setPointerCapture(e.pointerId); MXW.grip.classList.add('on'); e.preventDefault(); });
  MXW.grip.addEventListener('pointermove', (e) => { if (!MXW.grip.classList.contains('on')) return; MXW.w = clamp(w0 + (x0 - e.clientX), 480, mxwMax()); mxwApply(); });
  const end = () => { if (!MXW.grip.classList.contains('on')) return; MXW.grip.classList.remove('on'); mxwSave(); };
  MXW.grip.addEventListener('pointerup', end); MXW.grip.addEventListener('pointercancel', end);
  MXW.grip.addEventListener('dblclick', () => { const full = MXW.w >= mxwMax() - 2; if (full) MXW.w = prev || 0; else { prev = MXW.w; MXW.w = mxwMax(); } mxwApply(); mxwSave(); });
  MXW.grip.addEventListener('keydown', (e) => { const d = e.key === 'ArrowLeft' ? 80 : e.key === 'ArrowRight' ? -80 : 0; if (!d) return; e.preventDefault(); MXW.w = clamp((MXW.w || sh.getBoundingClientRect().width) + d, 480, mxwMax()); mxwApply(); mxwSave(); });
  MXW.fold = h('button', { type: 'button', class: 'iconbtn mx-foldb', 'aria-label': 'Mixer einklappen', title: 'Mixer einklappen – eine schmale Leiste am Rand; ein Klick darauf holt ihn zurück' }, '›');
  MXW.fold.addEventListener('click', () => mxwMini(!MXW.mini));
  MXW.bar = h('button', { type: 'button', class: 'mx-minibar', 'aria-label': 'Mixer ausklappen', title: 'Mixer ausklappen' }, h('span', null, 'mixer ‹'));
  MXW.bar.addEventListener('click', () => mxwMini(false));
  sh.append(MXW.grip, MXW.bar);
  window.addEventListener('resize', () => { if (MXW.w) mxwApply(); });
}
function mxwMini(on) { MXW.mini = !!on; mxwApply(); mxwSave(); if (!on && MX.open) requestAnimationFrame(() => mxLayout()); }
// with the mixer's head (mixerOpen / mixerClose)
function mxwOpen() { mxwBuild(); const close = $('#btnClose'); if (close && MXW.fold) close.before(MXW.fold); mxwApply(); }
function mxwClose() { if (MXW.fold) MXW.fold.remove(); const sh = $('#sheet'); if (sh) { sh.classList.remove('mx-mini'); sh.style.removeProperty('--mixw'); } }
