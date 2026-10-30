/* =====================================================================
   Views, selection, details, the panel's life
   ===================================================================== */
const mxViewKeys = () => MXV.order.filter((k) => MXV.views[k]).concat(Object.keys(MXV.views).filter((k) => !MXV.order.includes(k)));
// Selecting scrolls the rack to the strip only when the choice came from elsewhere (keyboard, the Puls block, the
// bridge, the Geflecht, the detail's ‹ ›): a finger or mouse in the rack itself only marks it – the strip must not
// slide away while the next tap is on its way.
function selectChannel(k) {
  if (!MXK[k]) return;
  if (MX.sel !== k) MX.sendT = performance.now();
  MX.sel = k;
  for (const key of mxViewKeys()) { const v = MXV.views[key]; if (v.select && v.built) v.select(k); }
  if (MX.open && MX.view === 'pult' && performance.now() - (MX.ptrT || 0) > 600) mxScrollTo(k, true);
}
// the detail remembers what opened it (a strip head, a spore, a button of the Puls block) to give the focus back
function openDetail(k) {
  const D = MXV.detail;
  if (!D || !MX.detailHost || !MXK[k]) return;
  if (!D.built) { D.build(MX.detailHost); D.built = true; }
  const first = !MX.detailK;
  if (first) { const a = document.activeElement; MX.detailFrom = a && a !== document.body && !MX.detailHost.contains(a) ? a : null; }
  if (MX.sel !== k) selectChannel(k);
  MX.detailK = k;
  MX.detailHost.hidden = false;
  MX.root.dataset.detail = '1';
  mxTipHide(MX.root, 0);
  mxRegPlace();
  if (D.open) D.open(k, first);
  if (MX.relayout) { MX.relayout = false; mxLayout(); }
}
function closeDetail() {
  const D = MXV.detail;
  if (!MX.detailK) return;
  MX.detailK = null;
  MX.detailHost.hidden = true;
  delete MX.root.dataset.detail;
  MX.root.setAttribute('aria-label', 'Mixer');
  if (D && D.close) D.close();
  if (typeof mxdCover === 'function') mxdCover(false);
  MX.dirtyStatic = true;
  mxRegPlace();
  if (MX.relayout) { MX.relayout = false; mxLayout(); }
  if (!MX.open) return;
  // back to what opened it; a strip head stands for the channel, so the one now shown gets the focus
  const f = MX.detailFrom, S = MX.ch[MX.sel];
  MX.detailFrom = null;
  if (f && f.isConnected && f.offsetParent && !f.classList.contains('mx-sh')) f.focus({ preventScroll: true });
  else if (S && S.head && MX.view === 'pult') S.head.focus({ preventScroll: true });
  else if (f && f.isConnected && f.offsetParent) f.focus({ preventScroll: true });
}
function mxSetView(key) {
  if (!MXV.views[key] || key === MX.view) return;
  const old = MXV.views[MX.view];
  if (old && old.close) old.close();
  MX.view = key;
  MX.root.dataset.view = key;
  for (const k of mxViewKeys()) MXV.views[k].host.hidden = k !== key;
  for (const b of MX.vswBtns) { const on = b.dataset.v === key; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
  store.set('myzel.mixview', key);
  const v = MXV.views[key];
  mxLayout();
  if (v.open) v.open();
  if (v.select) v.select(MX.sel);
}
// the view switch lives in the sheet's head while the mixer is open
function mxBuildViewSwitch() {
  const keys = mxViewKeys();
  const box = h('div', { class: 'mx-vsw', role: 'radiogroup', 'aria-label': 'Ansicht des Mixers' });
  MX.vswBtns = keys.map((k) => {
    const b = h('button', { type: 'button', role: 'radio', 'data-v': k, 'aria-checked': String(k === MX.view), tabindex: k === MX.view ? '0' : '-1', onclick: () => mxSetView(k) }, h('span', null, (MXV.views[k].label || k).toLowerCase()));
    box.append(b);
    return b;
  });
  box.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = keys.indexOf(MX.view), n = keys[(i + d + keys.length) % keys.length];
    mxSetView(n); MX.vswBtns[keys.indexOf(n)].focus();
  });
  return box;
}
function mxDefs() {
  const d = h('div', { class: 'mx-defs', 'aria-hidden': 'true' });
  d.innerHTML = '<svg width="0" height="0" focusable="false"><defs><linearGradient id="mxCap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3b2f"/><stop offset=".5" stop-color="#2b211b"/><stop offset="1" stop-color="#17110d"/></linearGradient>' +
    '<radialGradient id="mxCapHi" cx=".36" cy=".2" r=".55"><stop offset="0" stop-color="#fff4e6" stop-opacity=".28"/><stop offset="1" stop-color="#fff4e6" stop-opacity="0"/></radialGradient></defs></svg>';
  return d;
}
function buildMixer() {
  mxInit();
  const v = store.get('myzel.mixview');
  const R = MX.root = h('div', { class: 'mx', 'data-layer': MX.layer, 'data-strip': 'classic', 'data-w': 'narrow' });
  R.append(mxDefs(), mxBuildBand());
  // "?": what the pictures mean – anchored to the fruiting body's corner, the emblem of the whole console; first in
  // the band, as it is seen first
  MX.legBtn = h('button', { type: 'button', class: 'mx-q', 'aria-label': 'Was die Bilder bedeuten', 'aria-expanded': 'false', title: 'Was die Bilder bedeuten', onclick: () => mxLegend(MX.leg.hidden) }, h('span', { 'aria-hidden': 'true' }, '?'));
  MX.band.prepend(MX.legBtn);
  // "Zuweisen" from the mixer, while a controller is connected: a knob or fader on the device, then a fader, knob or
  // button here – the corner below the "?"
  KC.mx = MX.mlBtn = h('button', { type: 'button', class: 'mx-ml', 'aria-pressed': 'false', 'aria-label': 'MIDI – Zuweisen: Regler am Gerät mit dem Mixer verbinden', title: 'Zuweisen – Regler am Gerät mit dem Mixer verbinden', hidden: !MIDI.ports.size, onclick: learnBtn },
    h('span', { 'aria-hidden': 'true' }, 'MIDI'));
  MX.band.append(MX.mlBtn);
  MX.live = h('div', { class: 'mx-sr', 'aria-live': 'polite' });
  R.append(MX.live);
  const body = MX.body = h('div', { class: 'mx-body' });
  for (const key of mxViewKeys()) {
    const V = MXV.views[key], host = h('div', { class: 'mx-view mx-v-' + key, 'data-v': key });
    V.host = host; body.append(host);
    V.build(host); V.built = true;
  }
  if (v && MXV.views[v]) MX.view = v;
  for (const key of mxViewKeys()) MXV.views[key].host.hidden = key !== MX.view;
  R.dataset.view = MX.view;
  MX.detailHost = h('div', { class: 'mx-detail', hidden: true });
  MX.leg = mxLegendBuild();
  R.append(body, MX.detailHost, MX.leg);
  R.setAttribute('aria-label', 'Mixer');
  if (MXV.detail) R.dataset.detailOn = '1';
  MX.vsw = mxBuildViewSwitch();
  for (const id of MX_SRC_IDS) bindCtl(id, () => { if (MX.root) mxSrcAll(); });
  for (const e of EB.slice(2)) bindCtl(e.eng, () => { if (MX.root) mxRgnSync(); });   // (an Ebene given a sound stands in the Pult)
  for (const id of ['drv.mix', 'rng.mix', 'pha.mix', 'cho.mix']) bindCtl(id, () => { MX.dirtyStatic = true; });
  mxSrcAll();
  mxSetLayer(MX.layer);
  mxRgnSync();
  selectChannel(MX.sel);
  if (window.ResizeObserver) new ResizeObserver(() => mxLayout()).observe(R);
  // canvas text uses the web fonts: draw the cached layers again once they have arrived
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { MX.dirtyStatic = true; MXG.dirty = true; MXL.key = ''; if (MX.fk) MX.fk.bgKey = ''; });
  // Escape closes the menu, then the details – before the app closes the whole panel
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !MX.open) return;
    if (MXG.menuK != null) { mxgMenu(null, true); e.stopImmediatePropagation(); }
    else if (!MX.sn.menu.hidden) { mxMenu(false); MX.sn.store.focus(); e.stopImmediatePropagation(); }
    else if (!MX.leg.hidden) { mxLegend(false); e.stopImmediatePropagation(); }
    else if (MX.detailK) { closeDetail(); e.stopImmediatePropagation(); }
  }, true);
  return R;
}
function mixerOpen() {
  MX.open = true;
  mxRgnSync();
  mxTaps('mix', true);
  // the sheet's head: the view switch, then "2. Regler" (mxRegPlace picks the chips or the compact one)
  if (MX.vsw && mxViewKeys().length > 1) sheetTitle.after(MX.vsw);
  (MX.vsw && MX.vsw.isConnected ? MX.vsw : sheetTitle).after(MX.regBox, MX.regC.el);
  mxwOpen();   // (26.10.2026: its width, folded or not)
  mxMonSync();
  mxSrcAll();
  mxLayout();
  const v = MXV.views[MX.view];
  if (v && v.open) v.open();
  mxPultSelect(MX.sel);
}
function mixerClose() {
  MX.open = false;
  mxTaps('mix', false);
  if (MX.vsw) MX.vsw.remove();
  mxwClose();
  MX.regBox.remove(); MX.regC.el.remove();
  mxMenu(false);
  mxTipHide(MX.root, 0);
  if (MX.glide) { MX.mUI = MX.glide.to; MX.glide = null; MX.morphPend = MX.mUI; }
  if (MX.morphPend != null) { mxMorphApply(MX.morphPend); MX.morphPend = null; }
  MX.morphUI = false; MX.mDrag = null; mxGhostSet();
  if (MX.leg && !MX.leg.hidden) MX.leg.hidden = true;
  if (MX.detailK) closeDetail();
  const v = MXV.views[MX.view];
  if (v && v.close) v.close();
}
// dt in seconds (≤ 0.05), ts = rAF time
function mixerFrame(dt, ts) {
  mxMeterFrame(dt);
  mxMorphFrame(ts);
  // the head lies under the detail on phones: nothing to draw there then
  if (!(MX.detailK && MX.detCover)) mxFkDraw(dt);
  mxLoudFrame(dt, ts / 1000);
  const v = MXV.views[MX.view];
  if (v && v.frame && !MX.detailK) v.frame(dt, ts);
  if (MX.detailK && MXV.detail && MXV.detail.frame) MXV.detail.frame(dt, ts);
  if (MX.scrollable && MX.view === 'pult' && MX.scrollAria && ts - (MX.ariaT || 0) > 500) { MX.ariaT = ts; MX.scrollAria(); }
}

