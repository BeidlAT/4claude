/* ---------- sheet + tabs ---------- */
ICON.hush = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
function buildUI() {
  const tabs = $('#tabs');
  for (const p of PANELS) {
    const b = h('button', { type: 'button', class: 'tab', id: 'tab-' + p.key, 'aria-expanded': 'false', 'aria-controls': 'sheet', html: p.icon + '<span>' + p.title + '</span>' + (p.key === 'dev' ? '<i id="midiDot" class="mdot" aria-hidden="true"></i>' : '') });
    b.addEventListener('pointerdown', () => { b.hxPdT = performance.now(); }, true); b.addEventListener('click', (e) => { if (P['hx.buehne'] && (e.detail !== 0 || performance.now() - (b.hxPdT || -1e9) < 800)) { if (b.held) { b.held = false; return; } hxSay('Bühne: lange drücken öffnet ' + p.title); hxBuehneHint(b); return; } openPanel(p.key); });   // Hexenring (step 2b): on stage the sheet opens only on a long press (the keyboard opens it at once)
    b.addEventListener('pointerdown', () => { if (!P['hx.buehne']) return; clearTimeout(b.hT); b.held = false; b.hT = setTimeout(() => { b.held = true; openPanel(p.key); }, 500); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => clearTimeout(b.hT));
    tabs.append(b);
  }
  for (const p of PANELS) panelEls[p.key] = p.build();
  midiDot = $('#midiDot');
  for (const k in panelEls) { panelEls[k].hidden = true; sheetBody.append(panelEls[k]); }
  const q = $('#quick');
  q.append(ctl('flt.freq', { prefix: 'q-', label: 'Filter' }), ctl('dly.mix', { prefix: 'q-', label: 'Echo' }), ctl('rev.mix', { prefix: 'q-', label: 'Hall' }),
    h('button', { type: 'button', class: 'iconbtn', id: 'btnPanic2', 'data-act': 'stille', 'aria-label': 'Stille: alles sofort stoppen', title: 'Stille: alles sofort stoppen', html: ICON.hush, onclick: panic }));
  $('#btnClose').innerHTML = ICON.close;
  $('#btnFreeze').innerHTML = ICON.freeze;
  $('#btnClose').addEventListener('click', closePanel);
  $('#btnPanic').addEventListener('click', panic);
  const chip = $('#engChip'), chipLib = () => { if (UI.panel !== 'klang') openPanel('klang'); kqOpen(kqTarget('v.eng'), { opener: chip, where: 'Spielfläche', focusTile: true }); };
  chip.addEventListener('click', () => { if (kqSwallow(chip)) return; if (KQ.T) kqClose(false); if (UI.panel !== 'klang') openPanel('klang'); sheetBody.scrollTop = 0; });
  kqPress(chip, () => { chipLib(); return null; });
  chip.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!KQ.T) chipLib(); });
  $('#app').append(h('p', { id: 'kqSay', class: 'mx-sr', 'aria-live': 'polite' }));
  // Escape closes the library first (before the mixer's details and the panel)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !KQ.T) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (document.activeElement === KQ.search && KQ.search.value) { KQ.search.value = ''; KQ.q = ''; kqRender(); return; }
    kqClose();
  }, true);
  $('#startFingerLine').textContent = 'Mehrere gleichzeitig; Wischen schlägt ' + listDe(famPlay().strike) + ' an';
  $('#btnPuls').addEventListener('click', () => { if (!A.started) return; SEQ.on ? seqStop() : seqStart(); });
  $('#btnFreeze').addEventListener('click', () => { if (A.started) setFreeze(!A.frozen); });
  $('#btnGk').addEventListener('click', gkIcoTap);
  $('#btnRec').addEventListener('click', recToggle);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.panel) closePanel(); });
  refreshEngineUI(); updLaneTabs(); updPulsUI(); updRecUI(); updInactive();
}
const panelOf = (key) => PANELS.find((p) => p.key === key);
function openPanel(key) {
  if (KQ.T) kqClose(false);
  if (UI.panel === key) { closePanel(); return; }
  const prev = UI.panel && panelOf(UI.panel);
  if (prev && prev.close) prev.close();
  UI.panel = key;
  UI.opener = document.getElementById('tab-' + key);
  sheet.hidden = false;
  sheet.dataset.panel = key;
  for (const k in panelEls) panelEls[k].hidden = k !== key;
  sheetTitle.textContent = panelOf(key).title.toLowerCase();
  for (const p of PANELS) $('#tab-' + p.key).setAttribute('aria-expanded', String(p.key === key));
  sheetBody.scrollTop = 0;
  HXU.autoOpen = false; hxRailShow();   // Hexenring: a short screen folds the rail while a panel is open
  if (panelOf(key).open) panelOf(key).open();
  if (LEARN.on) learnShow();   // the banner makes room for the mixer
}
function closePanel() {
  if (KQ.T) kqClose(false);
  const hadFocus = sheet.contains(document.activeElement);
  const prev = UI.panel && panelOf(UI.panel);
  if (prev && prev.close) prev.close();
  UI.panel = null;
  sheet.hidden = true;
  delete sheet.dataset.panel;
  for (const p of PANELS) $('#tab-' + p.key).setAttribute('aria-expanded', 'false');
  HXU.autoOpen = false; hxRailShow();   // Hexenring: the rail unfolds again
  if (hadFocus && UI.opener) UI.opener.focus({ preventScroll: true });
}

/* ---------- misc ---------- */
function toast(msg, ms = 3200, action) {
  if (UPD.mode) { UPD.q.push([msg, ms, action]); if (UPD.q.length > 4) UPD.q.shift(); return; }   // the update card is answered first (updClose shows them)
  const t = $('#toast'), b = $('#toastAct'), b2 = $('#toastAct2'), acts = Array.isArray(action) ? action : action ? [action] : [];   // (Hexenring: „Weiter · Leeren“ – two)
  if (P['hx.buehne'] && !acts.length && ms < 5000) { if (typeof hxSay === 'function') hxSay(msg); return; }   // Hexenring (step 2b): the Bühnenansicht shows few toasts – the rest is said
  toast.at = performance.now(); if (typeof hxMsgHide === 'function') hxMsgHide();   // (Hexenring, 25.10.2026: the rail's line for the same moment gives way)
  $('#toastMsg').textContent = msg;
  b.hidden = !acts[0]; b2.hidden = !acts[1];
  b.onclick = b2.onclick = null;
  action = acts[0];
  if (action) { b.textContent = action.label; b.onclick = () => { t.classList.remove('show', 'act'); action.fn(); }; }
  if (acts[1]) { b2.textContent = acts[1].label; b2.onclick = () => { t.classList.remove('show', 'act'); acts[1].fn(); }; }
  t.classList.toggle('act', !!action);
  t.classList.add('show');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('show', 'act'), ms);
}
