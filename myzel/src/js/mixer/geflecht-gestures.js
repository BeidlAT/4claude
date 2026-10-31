/* ---------- gestures ---------- */
// which column is under the pointer: the gutter is nobody's, the root belongs to the Summe. pick: a press within
// 4 px of a boundary between two columns could mean either – it goes to the chosen channel when that is one of
// them, else to the column it landed in (which then lights up before anything moves)
function mxgColAt(x, y, pick) {
  const G = MXG, r = G.fr || G.field.getBoundingClientRect(), px = x - r.left, py = y - r.top, V = G.vis || G.cols, n = V.length;
  if (!G.w) return null;
  if (py > G.soilY && Math.hypot(px - G.rootX, py - G.rootY) < G.rootR + 4) return V[n - 1];
  if (px < G.x0 - 4) return null;
  const f = (px - G.x0) / G.u, i = clamp(Math.floor(f), 0, n - 1);
  if (pick && i < n - 1) {
    const fr = (f - Math.floor(f)) * G.u, j = fr < 4 ? i - 1 : fr > G.u - 4 ? i + 1 : -1;
    if (j >= 0 && j < n && V[j].k === MX.sel) return V[j];
  }
  return V[i];
}
function mxgPointer(f) {
  const G = MXG;
  f.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || G.pd) return;
    G.fr = f.getBoundingClientRect();
    const C = mxgColAt(e.clientX, e.clientY, true);
    if (!C) return;
    mxgMenu(null);
    const d = G.pd = { id: e.pointerId, C, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, on: false, ax: null, fine: false, wf: false, shift: false, push: 0, sunk: false, menu: false, above: P[mxVolId(C.k)] > MXG_DET + 0.05 };
    // the column in hand lights up at once (tag and a ring round its spore), before any value moves
    G.grab = C; C.tag.classList.add('grab');
    try { f.setPointerCapture(e.pointerId); } catch (er) {}
    // a mouse press takes the keyboard focus along to the column's slider
    if (e.pointerType === 'mouse') { e.preventDefault(); C.el.focus({ preventScroll: true }); }
    // a long press without moving: the channel's menu (stumm, solo, 0 dB, Mitte, Einzelheiten)
    d.lp = setTimeout(() => { if (G.pd === d && !d.on) { d.menu = true; mxBuzz(); selectChannel(C.k); mxgMenu(C.k, false, d.y - G.fr.top); } }, 520);
  });
  f.addEventListener('pointermove', (e) => {
    const d = G.pd;
    if (!d) {
      if (e.pointerType === 'mouse') mxgHover(e);
      return;
    }
    if (e.pointerId !== d.id) return;
    const x = e.clientX, y = e.clientY;
    d.shift = e.shiftKey;
    if (!d.on) {
      const ax = Math.abs(x - d.x), ay = Math.abs(y - d.y);
      if (ax < 6 && ay < 6) return;
      clearTimeout(d.lp);
      if (d.menu) return;
      // the first pixels decide: up and down is the level, sideways the balance – then the axis stays
      d.ax = ay >= ax ? 'y' : mxgHasPan(d.C) ? 'x' : null;
      d.on = true; d.lx = x; d.ly = y;
      if (MX.sel !== d.C.k) selectChannel(d.C.k);
      f.classList.add('drag');
      if (d.ax) { mxgAnchor(d, x, y); mxgTip(d); }
      mxgStill(d);
      return;
    }
    if (Math.abs(x - d.lx) + Math.abs(y - d.ly) > 2) { d.lx = x; d.ly = y; mxgStill(d); }
    if (d.ax) mxgMove(d, x, y);
  });
  f.addEventListener('pointerup', (e) => mxgUp(e, false));
  f.addEventListener('pointercancel', (e) => mxgUp(e, true));
  f.addEventListener('lostpointercapture', (e) => { if (G.pd && G.pd.id === e.pointerId) mxgUp(e, true); });
  f.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !G.pd) { G.hov = null; if (G.rootTip) { G.rootTip = false; mxTipHide(MX.root, 0); } } });
  f.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    G.fr = f.getBoundingClientRect();
    const C = mxgColAt(e.clientX, e.clientY);
    if (C && !(G.pd && G.pd.on)) { if (G.pd) { clearTimeout(G.pd.lp); G.pd.menu = true; } selectChannel(C.k); mxgMenu(C.k); }
  });
  // the wheel: up and down moves the level by half a dB, sideways the balance
  f.addEventListener('wheel', (e) => {
    G.fr = f.getBoundingClientRect();
    const C = mxgColAt(e.clientX, e.clientY);
    if (!C) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (!mxgHasPan(C)) return;
      const id = 'x' + C.k + '.pan';
      setParam(id, clamp(Math.round((P[id] + (e.deltaX > 0 ? 0.05 : -0.05)) * 100) / 100, -1, 1));
      mxTipFlash(MX.root, C.el, mxgTipPan(C.k));
    } else {
      const id = mxVolId(C.k), dd = PD[id], v = P[id], b = v > FADER_OFF ? v : dd.min;
      setParam(id, clamp(Math.round((b + (e.deltaY < 0 ? 0.5 : -0.5)) * 10) / 10, dd.min, dd.max));
      mxTipFlash(MX.root, C.el, mxTipVol(C.k));
    }
  }, { passive: false });
}
// the mouse over the field: the column it is over comes forward; over the root, who fills which frequency
function mxgHover(e) {
  const G = MXG;
  G.fr = G.field.getBoundingClientRect();
  const C = mxgColAt(e.clientX, e.clientY);
  G.hov = C ? C.k : null;
  const fr = G.fr, R = G.rootR, inRoot = Math.hypot(e.clientX - fr.left - G.rootX, e.clientY - fr.top - G.rootY) < R;
  if (inRoot && MX.fk.co.parentNode === G.root) { G.rootTip = true; mxFkHover(e, { left: fr.left + G.rootX - R, top: fr.top + G.rootY - R, width: 2 * R, height: 2 * R }); }
  else if (G.rootTip) { G.rootTip = false; mxTipHide(MX.root, 0); }
}
function mxgAnchor(d, x, y) {
  d.ax0 = x; d.ay0 = y;
  d.n0 = d.ax === 'x' ? P['x' + d.C.k + '.pan'] : mxPos(P[mxVolId(d.C.k)]);
}
// holding still while dragging: fine (×0.2) until the finger lets go – except while resting on the soil's edge,
// where holding means sinking in
function mxgStill(d) {
  clearTimeout(d.st);
  d.st = setTimeout(() => {
    if (MXG.pd !== d || d.fine || d.push || !d.ax) return;
    d.fine = d.wf = true; mxgAnchor(d, d.lx, d.ly); mxBuzz(); mxgTip(d);
  }, 420);
}
function mxgMove(d, x, y) {
  const G = MXG, k = d.C.k, fine = d.fine || d.shift, f = fine ? 0.2 : 1;
  if (fine !== d.wf) { d.wf = fine; mxgAnchor(d, x, y); }
  if (d.ax === 'x') {
    const id = 'x' + k + '.pan', raw = d.n0 + (x - d.ax0) / G.panSpan * 2 * f, want = clamp(raw, -1, 1);
    let v = want;
    if (!fine && Math.abs(v) < 0.04) v = 0;
    setParam(id, Math.round(v * 100) / 100);
    if (raw !== want) mxgAnchor(d, x, y);   // pushed past an end: turning back responds at once
  } else {
    const id = mxVolId(k), raw = d.n0 + (d.ay0 - y) / G.span * f, want = clamp(raw, 0, 1);
    let db = mxDb(want);
    // the soil's edge: coming from above, the fader rests at −48 dB; holding there a moment sinks it in
    if (d.above && !d.sunk && db < MXG_DET) {
      if (!d.push) { d.push = performance.now(); clearTimeout(d.pt); d.pt = setTimeout(() => mxgSink(d), 560); mxBuzz(); }
      db = MXG_DET;
    } else if (d.push) { d.push = 0; clearTimeout(d.pt); }
    mxFader(k, db, fine);
    if (raw !== want || d.push || Math.abs(mxPos(P[id]) - want) > 0.02) mxgAnchor(d, x, y);
  }
  mxgTip(d);
}
function mxgSink(d) {
  if (MXG.pd !== d || !d.push) return;
  d.sunk = true; d.push = 0;
  const id = mxVolId(d.C.k);
  setParam(id, PD[id].min);
  mxBuzz();
  mxgAnchor(d, d.lx, d.ly);
  mxgTip(d);
  mxgSay(mxgName(d.C.k) + ' aus – in den Boden gesunken');
}
const mxgTipPan = (k) => ({ n: MXK[k].name + ' · Balance', v: mxPanTxt(P['x' + k + '.pan']), c: MXK[k].col });
function mxgTip(d) {
  const k = d.C.k, t = d.ax === 'x' ? mxgTipPan(k) : mxTipVol(k);
  if (d.push) t.n = mxgName(k) + ' · halten: aus';
  if (MXG.geo) mxgGeo();
  mxTip(MX.root, d.C.el, t, d.fine || d.shift);
}
function mxgUp(e, cancel) {
  const G = MXG, d = G.pd;
  if (!d || e.pointerId !== d.id) return;
  clearTimeout(d.lp); clearTimeout(d.st); clearTimeout(d.pt);
  G.pd = null;
  if (G.grab) { G.grab.tag.classList.remove('grab'); G.grab = null; }
  G.field.classList.remove('drag');
  // the finger that opened the menu lets go: the click the browser makes of that must not choose an item
  if (d.menu) G.menuUp = performance.now();
  if (d.on) { mxTipHide(MX.root); if (d.ax) mxgSay(mxgSayVal(d.C.k)); return; }
  if (d.menu || cancel) return;
  // a tap selects (and clears a latched clip); a second one opens the Fruchtkörper
  const k = d.C.k, now = performance.now();
  if (G.tapK === k && now - G.tapT < 380) { G.tapK = null; openDetail(k); return; }
  G.tapK = k; G.tapT = now;
  if (MX.sel !== k) selectChannel(k);
  if (MX.ch[k].lv.clip) { mxPeakReset(k); mxgSay('Übersteuerung von ' + mxgName(k) + ' zurückgesetzt'); }
}
function mxgSayVal(k) {
  const v = P[mxVolId(k)], C = mxgCol(k);
  return mxgName(k) + ' ' + (v > FADER_OFF ? mxDbTxt(v) + ' Dezibel' : 'aus') + (mxgHasPan(C) ? ', Balance ' + mxPanAria(P['x' + k + '.pan']) : '');
}
function mxgSay(txt) {
  const G = MXG;
  clearTimeout(G.sayTm);
  G.sayTm = setTimeout(() => { G.live.textContent = txt; }, 150);
}
function mxgKeys(C) {
  const k = C.k, el = C.el;
  el.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key, pid = 'x' + k + '.pan', mid = mxMuteId(k), sid = mxSoloId(k);
    if ((key === 'ArrowLeft' || key === 'ArrowRight') && mxgHasPan(C)) {
      setParam(pid, clamp(Math.round((P[pid] + (key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 0.2 : 0.05)) * 100) / 100, -1, 1));
      mxTipFlash(MX.root, el, mxgTipPan(k));
    } else if (mxVolKey(e, mxVolId(k))) { if (MXG.geo) mxgGeo(); mxTipFlash(MX.root, el, mxTipVol(k)); return; }
    else if (key === 'Enter' || key === ' ') openDetail(k);
    else if ((key === 'Delete' || key === 'Backspace') && mxgHasPan(C)) setParam(pid, 0);
    else if (key === 'ContextMenu') mxgMenu(k);
    else if ((key === 'm' || key === 'M') && mid) setParam(mid, !P[mid]);
    else if ((key === 's' || key === 'S') && sid) setParam(sid, !P[sid]);
    else return;
    e.preventDefault();
  });
  el.addEventListener('focus', () => { MXG.focus = k; if (MX.sel !== k) selectChannel(k); });
  el.addEventListener('blur', () => { if (MXG.focus === k) MXG.focus = null; });
}

/* ---------- the channel menu (long press, right-click, the context key) ---------- */
function mxgMenu(k, refocus, atY) {
  const G = MXG, M = G.menu;
  if (k == null) {
    if (G.menuK == null) return;
    const was = G.menuK;
    G.menuK = null; M.hidden = true;
    if (refocus) mxgCol(was).el.focus({ preventScroll: true });
    return;
  }
  const c = MXK[k], C = mxgCol(k), mid = mxMuteId(k), sid = mxSoloId(k), vid = mxVolId(k), name = mxgName(k);
  const item = (txt, fn, chk, dis) => h('button', { type: 'button', role: chk == null ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': chk == null ? null : String(!!chk), disabled: !!dis, onclick: () => {
    if (performance.now() - (G.menuUp || 0) < 450) return;
    mxgMenu(null, true); fn();
  } }, h('i', { 'aria-hidden': 'true' }), txt);
  M.textContent = '';
  M.setAttribute('aria-label', name);
  M.style.setProperty('--c', c.col);
  M.append(h('div', { class: 'mxg-mh', 'aria-hidden': 'true' }, h('i'), name, h('small', null, mxSrcText(k))));
  if (k === 'sum') M.append(item('Mono abhören', () => { setMonMono(!A.monoChk); mxMonSync(); }, A.monoChk, !A.ctx), item('Abhöre 20 dB leiser', () => { setMonDim(!A.dim); mxMonSync(); }, A.dim, !A.ctx));
  if (mid) M.append(item(k === 'puls' ? 'Puls stumm' : 'Stumm', () => setParam(mid, !P[mid]), P[mid]));
  if (sid) M.append(item('Solo', () => mxSolo(k, false), P[sid]), item('Nur dieser Kanal im Solo', () => mxSolo(k, true)));
  // 0 dB for every channel and the Summe alike – the same target as the double tap on a strip's value
  M.append(h('hr', { 'aria-hidden': 'true' }), item('Pegel auf 0 dB', () => setParam(vid, 0)));
  if (mxgHasPan(C)) M.append(item('Balance in die Mitte', () => setParam('x' + k + '.pan', 0)));
  if (MXV.detail) M.append(item('Einzelheiten öffnen ›', () => openDetail(k)));
  G.menuK = k; M.hidden = false;
  // beside the spore (or clear of the finger that pressed), inside the field
  const mw = M.offsetWidth, mh = M.offsetHeight, y0 = atY != null ? atY : C.y, gap = atY != null ? 34 : 20;
  const above = y0 - gap - mh >= 4 && (atY != null || y0 + gap + mh > G.h - 4);
  M.style.left = clamp(C.x - mw / 2, 6, G.w - mw - 6) + 'px';
  M.style.top = clamp(above ? y0 - gap - mh : y0 + gap, 4, Math.max(4, G.h - mh - 4)) + 'px';
  M.querySelector('button:not(:disabled)').focus({ preventScroll: true });
}

/* ---------- life ---------- */
function mxgOpen() {
  const G = MXG;
  G.w = 0; G.dirty = G.geo = true;
  mxgLayout();
  for (const C of G.cols) C.tag.classList.toggle('dormant', MX.ch[C.k].dorm);
  mxSrcAll(); mxgSelect(MX.sel);
}
function mxgClose() {
  const G = MXG;
  mxgMenu(null);
  if (G.pd) { clearTimeout(G.pd.lp); clearTimeout(G.pd.st); clearTimeout(G.pd.pt); G.pd = null; }
  if (G.grab) { G.grab.tag.classList.remove('grab'); G.grab = null; }
  G.hov = null; G.rootTip = false;
  if (G.field) G.field.classList.remove('drag');
  mxTipHide(MX.root, 0);
  G.w = 0; mxgRootHome();
}
function mxgSelect(k) {
  for (const C of MXG.cols) C.tag.classList.toggle('sel', C.k === k);
  mxgBar();
}

