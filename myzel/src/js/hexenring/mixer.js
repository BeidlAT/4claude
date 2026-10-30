// ---- (owner, 25.10.2026) „separater Mixer für Schleifen“: the mixer's third view, beside Pult and Geflecht – a strip per
// Schleife in slot order: its name and sound (a tap on the head opens its card), its state, its Balance, M and S (at
// once, as the card's state chips do – the ring, the card and the Gärtner see the same state), its level on the
// console's fader law with its own meter (the processor's level of that loop, after its gain and balance) and the
// value. At the end „Alle“: the Hexenring's own channel, the same fader as its strip in the Pult. ----
MXV.views.schleifen = { label: 'Schleifen', build: hxmBuild, open: hxmOpen, close: () => mxTipHide(MX.root, 0), frame: hxmFrame, layout: hxmLayout, select: () => {} };
const HXM = { host: null, row: null, empty: null, st: [], sig: '', all: null, t: 0 };
const HXM_COL = '#e9a35e';   // (the Hexenring channel's colour – every loop strip wears it)
function hxmBuild(host) {
  HXM.host = host;
  HXM.row = h('div', { class: 'hxm-row', role: 'group', 'aria-label': 'Schleifen' });
  HXM.empty = h('p', { class: 'hxm-empty' }, 'Noch keine Schleife. Nimm eine auf (● oder die Leertaste) oder ernte mit dem Korb – dann hat hier jede Schleife ihren eigenen Kanal: Pegel, Balance, stumm und solo.');
  host.append(HXM.row, HXM.empty);
  HXM.sig = '';
}
function hxmOpen() { HXM.sig = ''; hxmSync(); }
function hxmLayout() { hxmLayoutR(HXM); }
function hxmLayoutR(R) { for (const S of R.st) hxmStemLayout(S); if (R.all) hxmStemLayout(R.all); }
// the strips follow the loops: built again when a loop comes or goes (never per frame) – in this view (with „Alle“) and
// in the Pult's group „Schleifen“ (HXMP, beside the Hexenring's own channel); true when they changed
function hxmSync() { return hxmSyncR(HXM, true); }
function hxmSyncR(R, withAll) {
  if (!R.row) return false;
  const loops = hxLoopsLive().filter((L) => !L.bew).sort((a, b) => a.slot - b.slot), sig = loops.map((L) => L.slot + ':' + L.key).join(',');
  if (sig === R.sig) return false;
  R.sig = sig;
  R.st = loops.map((L) => hxmStrip(L));
  R.all = withAll && loops.length ? hxmAllStrip() : null;
  R.row.replaceChildren(...R.st.map((S) => S.el), ...(R.all ? [h('i', { class: 'hxm-sep', 'aria-hidden': 'true' }), R.all.el] : []));
  if (R.empty) R.empty.hidden = !!loops.length;
  R.row.hidden = !loops.length;
  requestAnimationFrame(() => hxmLayoutR(R));
  return true;
}
const hxmL = (S) => { const L = hxByKey(S.key); return L && L.state !== 'weg' ? L : null; };
const hxmDb = (g) => (g > 0 ? 20 * Math.log10(g) : -Infinity);
// one strip: o = { name, sub, aria, get db (−∞…+6), set db, pan get/set (or null), mute get/set, solo get/set, dorm(), lv(), open, pidV, pidM, pidS, pidP }
function hxmStripOf(o) {
  const S = Object.assign({ g: null, w: 0, h: 0, bg: null, bgKey: '', gradKey: '', grad: null, capPos: 0, lv: { pk: [0, 0], rms: [0, 0], hp: [0, 0], ht: [0, 0], hv: [0, 0], lvl: 0, gr: 0, max: 0 }, txt: {} }, o);
  const col = S.col = () => (o.col ? o.col() : HXM_COL);   // (26.10.2026: a loop's pigment)
  const el = S.el = h('div', { class: 'hxm-st' + (o.cls ? ' ' + o.cls : ''), role: 'group', 'aria-label': o.aria || o.name, style: '--c:' + col() });
  S.nm = h('span', { class: 'hxm-nm' }, h('i', { 'aria-hidden': 'true' }), h('span', null, o.name));
  S.src = h('span', { class: 'hxm-src' });
  S.head = h('button', { type: 'button', class: 'hxm-sh', title: o.headTip || '' }, S.nm, S.src);
  if (o.open) S.head.addEventListener('click', o.open);
  S.state = h('span', { class: 'hxm-state' });
  el.append(S.head, S.state);
  // Balance: a knob (drag up/down, wheel, arrows; a double click: the middle)
  if (o.pan) {
    S.kcv = h('canvas', { 'aria-hidden': 'true' });
    S.kn = h('div', { class: 'hxm-kn', role: 'slider', tabindex: '0', 'aria-label': o.name + ' Balance', 'aria-valuemin': '-100', 'aria-valuemax': '100', title: 'Balance: ziehen (hoch = rechts), Mausrad oder Pfeiltasten; Doppelklick: Mitte' }, S.kcv);
    S.kv = h('span', { class: 'hxm-kv', 'aria-hidden': 'true' });
    el.append(h('div', { class: 'hxm-kw' }, S.kn, S.kv, h('span', { class: 'hxm-kl', 'aria-hidden': 'true' }, 'Balance')));
    const setN = (n, fine) => { let v = clamp(n * 2 - 1, -1, 1); if (!fine && Math.abs(v) < 0.032) v = 0; o.pan.set(v); };
    const tip = () => ({ n: o.name + ' · Balance', v: mxPanTxt(o.pan.get()), c: col() });
    mxDrag(S.kn, { axis: 'y', host: () => MX.root, span: () => 160, get: () => (o.pan.get() + 1) / 2, set: setN, tip, focus: S.kn });
    const step = (d, coarse) => { o.pan.set(clamp(Math.round((o.pan.get() + d * (coarse ? 0.25 : 0.05)) * 100) / 100, -1, 1)); mxTipFlash(MX.root, S.kn, tip()); };
    S.kn.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowRight') step(1, e.shiftKey); else if (k === 'ArrowDown' || k === 'ArrowLeft') step(-1, e.shiftKey);
      else if (k === 'Home') o.pan.set(-1); else if (k === 'End') o.pan.set(1); else if (k === 'Delete' || k === 'Backspace' || k === '0') o.pan.set(0); else return;
      e.preventDefault();
    });
    S.kn.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); step(e.deltaY < 0 ? 1 : -1, e.shiftKey); }, { passive: false });
    mxDbl(S.kn, () => { o.pan.set(0); mxTipFlash(MX.root, S.kn, tip()); });
    if (o.pidP) mPid(S.kn, o.pidP);
  } else el.append(h('div', { class: 'hxm-kw hxm-kw0', 'aria-hidden': 'true' }));
  // M, S
  S.mb = h('button', { type: 'button', class: 'mx-m', 'aria-pressed': 'false', 'aria-label': o.name + ' stumm', title: o.muteTip || 'Stumm (sofort)' }, h('span', null, 'M'));
  S.mb.addEventListener('click', () => o.mute.set(!o.mute.get()));
  if (o.pidM) mPid(S.mb, o.pidM);
  const ms = h('div', { class: 'hxm-ms' }, S.mb);
  if (o.solo) {
    S.sb = h('button', { type: 'button', class: 'mx-s', 'aria-pressed': 'false', 'aria-label': o.name + ' solo', title: 'Solo: nur diese Schleife (sofort); noch einmal – alle wie vorher' }, h('span', null, 'S'));
    S.sb.addEventListener('click', () => o.solo.set(!o.solo.get()));
    if (o.pidS) mPid(S.sb, o.pidS);
    ms.append(S.sb);
  }
  el.append(ms);
  // the stem: scale, meter (canvas), the cap as the fader's knob; the value under it (a double click: 0 dB)
  S.cv = h('canvas', { 'aria-hidden': 'true' });
  S.cap = h('div', { class: 'hxm-cap', 'aria-hidden': 'true', html: mxCapSvg(false) });
  S.stem = h('div', { class: 'hxm-stem', role: 'slider', tabindex: '0', 'aria-orientation': 'vertical', 'aria-label': o.name + ' Pegel', 'aria-valuemin': '-60', 'aria-valuemax': '6', 'aria-keyshortcuts': MX_VOLKEYS, title: o.faderTip || 'Pegel: ziehen, Mausrad oder Pfeiltasten (Umschalt: fein beim Ziehen, grob mit Pfeilen)' }, S.cv, S.cap);
  S.val = h('button', { type: 'button', class: 'hxm-val', tabindex: '-1', title: 'Doppelklick: 0 dB' }, h('span'));
  el.append(S.stem, S.val);
  const flash = () => mxTipFlash(MX.root, S.cap, { n: o.name, v: hxmDbTxt(o.db.get()), c: col() });
  mxDrag(S.stem, { axis: 'y', host: () => MX.root, span: () => (S.g ? S.g.span : 160), get: () => mxPos(o.db.get()), set: (n) => o.db.set(n <= 0 ? -Infinity : mxDb(n)), tip: () => ({ n: o.name, v: hxmDbTxt(o.db.get()), c: col() }), focus: S.stem, anchor: () => S.cap });
  S.stem.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const v = o.db.get(), b = v > -60 ? v : -60; let n = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = b + (e.shiftKey ? 3 : 0.5); else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = b - (e.shiftKey ? 3 : 0.5);
    else if (e.key === 'PageUp') n = b + 6; else if (e.key === 'PageDown') n = b - 6; else if (e.key === 'Home' || e.key === '0') n = 0; else if (e.key === 'End' && e.shiftKey) n = -Infinity;
    if (n == null) return;
    e.preventDefault(); o.db.set(n === -Infinity || n <= -60 ? -Infinity : clamp(Math.round(n * 10) / 10, -60, 6)); flash();
  });
  S.stem.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); const v = o.db.get(), b = v > -60 ? v : -60; o.db.set(clamp(Math.round((b + (e.deltaY < 0 ? 0.5 : -0.5)) * 10) / 10, -60, 6)); flash(); }, { passive: false });
  mxDbl(S.val, () => { o.db.set(0); flash(); });
  if (o.pidV) mPid(S.stem, o.pidV);
  return S;
}
const hxmDbTxt = (db) => (db > -60 ? mxDbTxt(db) + ' dB' : MX_MINUS + '∞');
// a loop's strip
function hxmStrip(L0) {
  const key = L0.key, slot = L0.slot, n = slot + 1, nm = 'Schleife ' + n;
  const S = hxmStripOf({ name: nm, key, slot, aria: nm, col: () => hxCol(hxByKey(key)),   // (by its key: S is not made yet when the strip first asks)
   
    headTip: 'Schleife ' + n + ': antippen öffnet sie zum Ansehen und Bearbeiten (Wellenform, Schichten, Schnitt)',
    open: () => { const L = hxmL(S); if (L) hxEdOpen(L); },
    db: { get: () => { const L = hxmL(S); return L ? hxmDb(L.gain) : -Infinity; }, set: (db) => { const L = hxmL(S); if (L) { hxLevel(L, db > -60 ? dbToGain(db) : 0); L.lvT = performance.now(); hxRailDirty(); } } },
    pan: { get: () => { const L = hxmL(S); return L ? L.pan || 0 : 0; }, set: (v) => { const L = hxmL(S); if (L) hxPan(L, v); } },
    mute: { get: () => { const L = hxmL(S); return !!L && (L.pendTo || L.state) === 'stumm'; }, set: (on) => { const L = hxmL(S); if (L) hxmMute(L, on); } },
    solo: { get: () => !!(HX.solo && hxmL(S) && HX.solo.id === hxmL(S).id), set: () => { const L = hxmL(S); if (L) hxmSolo(L); } },
    pidV: 'hx.ring.' + n + '.pegel', pidS: 'hx.ring.' + n + '.solo', pidM: 'hx.ring.' + n + '.stumm', pidP: 'hx.ring.' + n + '.balance',
    muteTip: 'Stumm: die Schleife läuft lautlos im Takt weiter (sofort). Auf dem Ring wartet dasselbe auf die Eins.' });
  return S;
}
// „Alle“: the Hexenring's own channel (its fader and mute in the Pult)
function hxmAllStrip() {
  return hxmStripOf({ name: 'Alle', aria: 'Alle Schleifen', cls: 'hxm-all', headTip: 'Alle Schleifen zusammen – derselbe Kanal „Hexenring“ wie im Pult', open: () => { mxSetView('pult'); selectChannel('hxr'); },
    db: { get: () => (P['xhxr.vol'] > FADER_OFF ? P['xhxr.vol'] : -Infinity), set: (db) => setParam('xhxr.vol', db > -60 ? clamp(db, PD['xhxr.vol'].min, PD['xhxr.vol'].max) : PD['xhxr.vol'].min) },
    pan: null, solo: null,
    mute: { get: () => !!P['xhxr.mute'], set: (on) => setParam('xhxr.mute', !!on) },
    pidV: 'xhxr.vol', pidM: 'xhxr.mute', muteTip: 'Alle Schleifen stumm (der Kanal „Hexenring“)', faderTip: 'Pegel aller Schleifen zusammen' });
}
// (a loop's Balance) – sent at once, kept with the loop (its snapshot, the device's copy)
function hxPan(L, v) { L.pan = clamp(Math.round(v * 100) / 100, -1, 1); hxGain(L.id, null, null, 0.03, L.pan); hxSaveMeta(L.id); }
// M and S here act at once (a fade of 20 ms), as the card's state chips do; a change that waited for the bar line gives way
function hxmState(L, to) {
  const p = HX.pend.find((x) => x.loop === L.id && x.kind === 'state');
  if (p) { hxPendDrop(p); hxState(L.id, to, p.t, { X: 0.02 }); L.pendTo = null; }   // (the change it scheduled: overridden at its own moment)
  hxState(L.id, to, null, { X: 0.02 }); hxRailDirty(); hxCardDirty();
}
function hxmMute(L, on) {
  if (L.state === 'angehalten') { hxSay(hxName(L) + ' ist angehalten – auf dem Ring tippen startet sie'); return; }
  if (HX.solo && on && HX.solo.id === L.id) HX.solo = null;
  hxmState(L, on ? 'stumm' : 'spielt');
  hxSay(hxName(L) + (on ? ' stumm' : ' spielt'));
}
function hxmSolo(L) {
  if (HX.solo && HX.solo.id === L.id) {   // off: the others as they were
    const S0 = HX.solo; HX.solo = null;
    for (const [k, st] of S0.was) { const X = hxByKey(k); if (X && X.id !== L.id && st === 'spielt' && X.state === 'stumm') hxmState(X, 'spielt'); }
    hxSay(hxName(L) + ': Solo aus'); return;
  }
  const was = HX.solo ? HX.solo.was : hxLoopsLive().map((X) => [X.key, X.pendTo || X.state]);   // (solo moved from another loop: the states from before the first)
  HX.solo = { id: L.id, was };
  for (const X of hxLoopsLive()) { if (X.state === 'angehalten' || X.bew) continue; const st = X.pendTo || X.state, to = X === L ? 'spielt' : 'stumm'; if (st !== to) hxmState(X, to); }
  hxSay(hxName(L) + ' solo');
}
// every frame while the view is open: the words, the buttons, the knob, the cap, the meter
function hxmFrame(dt) {
  if (!HXM.row) return;
  const now = performance.now();
  if (now - HXM.t > 250) { HXM.t = now; hxmSync(); }
  hxmDrawR(HXM, dt);
}
function hxmDrawR(R, dt) {
  const met = new Map((HX.meter || []).map((m) => [m[0], m]));
  for (const S of R.st) {
    const L = hxmL(S); if (!L) continue;
    { const c0 = S.col(); if (S.cV !== c0) { S.cV = c0; S.el.style.setProperty('--c', c0); S.bgKey = ''; } }   // (its pigment, when it changes)
    let m = met.get(L.id); const st = L.state, pend = L.pendTo && L.pendTo !== st ? L.pendTo : null, pv = L.pvMute && HXE.pv && HXE.pv.key === L.key;
    if (pv && HXE.pv.out.an) m = hxmPvLv(HXE.pv.out.an, L.id);   // (owner, 27.10.2026, again 30.10.2026: „zeigt keinen Ausschlag“ – the editor listens to it: its strip shows what is heard)
    hxmText(S, 'src', S.src, hxEngName(L) + ' · ' + (hxTakt(L) ? dec(+(L.d.beats / (L.bpb || 4)).toFixed(2)) + ' T' : dec(hxLen(L).toFixed(1)) + ' s'));   // (short: the strip is narrow – the card says it whole)
    hxmText(S, 'state', S.state, (pv ? 'Vorhören' : st === 'spielt' ? 'spielt' : st === 'stumm' ? 'stumm' : 'angehalten') + (pend ? ' → ' + (pend === 'stumm' ? 'stumm' : 'an') : '') + (HX.fokus === L.id ? ' · Fokus' : ''));
    S.el.classList.toggle('spielt', st === 'spielt'); S.el.classList.toggle('dormant', st !== 'spielt');
    hxmLv(S, m ? m[1] : 0, m ? m[2] : 0, dt, st === 'spielt' || pv);
    try { hxmStrDraw(S); } catch (e) { if (!HXM.err) { HXM.err = 1; console.warn('Hexenring: ein Schleifen-Kanal ließ sich nicht zeichnen', e); } }   // (one strip never blanks the others)
  }
  if (R.all) {
    const A2 = R.all, L2 = MX.ch.hxr && MX.ch.hxr.lv;
    hxmText(A2, 'src', A2.src, hxSrcText()); hxmText(A2, 'state', A2.state, P['xhxr.mute'] ? 'stumm' : '');
    A2.el.classList.toggle('dormant', !!(MX.ch.hxr && MX.ch.hxr.dorm));
    if (L2) { A2.lv = L2; A2.shared = true; }
    hxmStrDraw(A2);
  }
}
function hxmText(S, k, el, t) { if (S.txt[k] !== t) { S.txt[k] = t; el.textContent = t; } }
// the loop's level as the processor reports it (15 a second: RMS and peak, after its gain) on the console's law; the
// peak's spore hangs 1.6 s, then falls
const HXM_PV = new Float32Array(2048);
function hxmPvLv(an, id) { an.getFloatTimeDomainData(HXM_PV); let s = 0, p = 0; for (let i = 0; i < HXM_PV.length; i++) { const v = HXM_PV[i]; s += v * v; if (v > p) p = v; else if (-v > p) p = -v; } return [id, Math.sqrt(s / HXM_PV.length), p]; }
function hxmLv(S, rms, pk, dt, on) {
  const L = S.lv, t = performance.now() / 1000, p = on ? mxPosA(pk) : 0, r = on ? mxPosA(rms) : 0;
  L.pk[0] = L.pk[1] = p; L.rms[0] = L.rms[1] = r;
  L.lvl = rms > 1e-4 ? clamp((20 * Math.log10(rms) + 44) / 38, 0, 1) : 0;
  for (let s = 0; s < 2; s++) {
    if (p >= L.hp[s]) { L.hp[s] = p; L.ht[s] = t; L.hv[s] = 0; }
    else if (t - L.ht[s] > 1.6) { if (REDUCED) L.hp[s] = p; else { L.hv[s] += dt * 0.9; L.hp[s] = Math.max(p, L.hp[s] - L.hv[s] * dt); } }
  }
}
function hxmStemLayout(S) {
  const w = S.stem.clientWidth, hh = S.stem.clientHeight;
  S.w = w; S.h = hh; S.bgKey = ''; S.gradKey = '';
  if (!w || !hh) return;
  const capW = 44, cx = Math.round(w - capW / 2 - 6);
  S.g = { x: 0, y: 0, w, h: hh, sw: 16, capW, cx, lx: cx - capW / 2 - 3, yt: 18, yb: hh - 12 };
  S.g.span = Math.max(20, S.g.yb - S.g.yt);
  S.cap.style.left = cx + 'px'; S.cap.style.width = (capW + 2) + 'px';
  if (S.cap.firstChild) S.cap.firstChild.style.top = (22 - 19 * capW / 46).toFixed(1) + 'px';
}
function hxmStrDraw(S) {
  if (!S.g) { hxmStemLayout(S); if (!S.g) return; }
  mxSprites();   // (26.10.2026, owner: only Schleife 1 drawn – the mixer opened straight in this view: the Pult had not made the stems' glow yet, the meter failed on it)
  const db = S.db.get(), cc = MXK.hxr, dpr = MX_LDPR(), key = S.w + 'x' + S.h + ':' + dpr;
  if (S.bgKey !== key) { S.bgKey = key; S.bg = S.bg || document.createElement('canvas'); const b = mxFit(S.bg, S.w, S.h, 0, dpr); b.clearRect(0, 0, S.w, S.h); mxStemBody(b, S.g, cc, false); }
  const c = mxFit(S.cv, S.w, S.h, 0, dpr);
  c.clearRect(0, 0, S.w, S.h); c.drawImage(S.bg, 0, 0, S.w, S.h);
  S.capPos = mxPos(db); S.dorm = S.el.classList.contains('dormant');
  mxMeter(c, S, cc);
  S.cap.style.transform = 'translate(-50%,' + (S.g.yb - S.capPos * S.g.span - 22).toFixed(1) + 'px)';
  const vt = hxmDbTxt(db);
  if (S.txt.val !== vt) { S.txt.val = vt; S.val.firstChild.textContent = vt; S.stem.setAttribute('aria-valuenow', String(db > -60 ? Math.round(db * 10) / 10 : -60)); S.stem.setAttribute('aria-valuetext', db > -60 ? mxDbAria(db) : 'aus'); }
  const m = S.mute.get(); if (S.txt.m !== m) { S.txt.m = m; S.mb.setAttribute('aria-pressed', String(m)); }
  if (S.sb) { const so = S.solo.get(); if (S.txt.s !== so) { S.txt.s = so; S.sb.setAttribute('aria-pressed', String(so)); } }
  if (S.kn) {
    const v = S.pan.get(), kk = v + ':' + S.dorm;
    if (S.txt.k !== kk) { S.txt.k = kk; S.kv.textContent = mxPanTxt(v); S.kn.setAttribute('aria-valuenow', String(Math.round(v * 100))); S.kn.setAttribute('aria-valuetext', mxPanAria(v)); hxmKnobDraw(S, v); }
  }
}
// the Balance knob: a ring from the middle to its value
function hxmKnobDraw(S, v) {
  const c = mxFit(S.kcv, 34, 34, 0, MX_LDPR()), cx = 17, cy = 17, r = 12, a0 = -Math.PI / 2, a1 = a0 + v * 0.75 * Math.PI;
  c.clearRect(0, 0, 34, 34);
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(240,230,216,.16)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, a0 - 0.75 * Math.PI, a0 + 0.75 * Math.PI); c.stroke();
  c.strokeStyle = S.dorm ? '#7a6d63' : S.col ? S.col() : HXM_COL; c.lineWidth = 3; c.beginPath(); if (Math.abs(v) < 0.005) c.arc(cx, cy, r, a0 - 0.04, a0 + 0.04); else c.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
  c.fillStyle = 'rgba(240,230,216,.9)'; c.beginPath(); c.arc(cx + Math.cos(a1) * (r - 6), cy + Math.sin(a1) * (r - 6), 2, 0, Math.PI * 2); c.fill();
}

// ---- (owner, 26.10.2026: „im Mixer fehlen die einzelnen Schleifen zum Einstellen“ – chosen: directly in the Pult) the
// Pult's group „Schleifen“ right of the Spiel group, so beside the Hexenring's channel: the same strips as the view
// „Schleifen“ (level, Balance, M, S, meter; the head opens the loop's editor). Only while there are loops; its header
// folds it to one narrow column (kept on this device). A loop coming or going lays the Pult out again. ----
const HXMP = { grp: null, row: null, st: [], all: null, sig: '', t: 0, fold: false, btn: null };
try { HXMP.fold = localStorage.getItem('myzel.hxmPultFold') === '1'; } catch (e) {}
function hxmPultGroup() {
  HXMP.sig = ''; HXMP.st = [];
  HXMP.btn = h('button', { type: 'button', class: 'hxmp-fold', 'aria-expanded': 'true', title: 'Die Schleifen des Hexenrings einzeln ein- oder ausklappen' });
  HXMP.btn.addEventListener('click', () => { HXMP.fold = !HXMP.fold; try { localStorage.setItem('myzel.hxmPultFold', HXMP.fold ? '1' : '0'); } catch (e) {} hxmPultFold(); });
  HXMP.row = h('div', { class: 'mx-gs hxmp-row' });
  HXMP.grp = h('div', { class: 'mx-grp mx-g-hxl', role: 'group', 'aria-label': 'Schleifen', hidden: true }, h('div', { class: 'mx-gh' }, HXMP.btn), HXMP.row);
  hxmPultFold();
  return HXMP.grp;
}
function hxmPultFold() {
  const n = HXMP.st.length, f = HXMP.fold;
  if (!HXMP.btn) return;
  HXMP.btn.replaceChildren(h('span', { class: 'hxmp-of' }, 'hexenring · '), f ? 'schleifen ' + n + ' ›' : 'schleifen ‹');   // (26.10.2026: whose they are)
  HXMP.btn.setAttribute('aria-expanded', String(!f));
  HXMP.grp.classList.toggle('fold', f);
  if (MX.view === 'pult' && MX.scroll) requestAnimationFrame(() => { mxLayout(); hxmLayoutR(HXMP); });
}
function hxmPultFrame(dt) {
  if (!HXMP.row || !HXMP.row.isConnected) return;
  const now = performance.now();
  if (now - HXMP.t > 250) {
    HXMP.t = now;
    if (hxmSyncR(HXMP, false)) { HXMP.grp.hidden = !HXMP.st.length; hxmPultFold(); }
  }
  if (!HXMP.fold && !HXMP.grp.hidden) hxmDrawR(HXMP, dt);
}
