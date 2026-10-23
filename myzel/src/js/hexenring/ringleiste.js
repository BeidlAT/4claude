// ---- the Ringleiste (SPEC §16): real buttons over one canvas, redrawn every frame; a toolbar (← → between them);
// every change said once in a polite live region (never the beats) ----
const HXU = { rail: null, cv: null, cx: null, korb: null, haupt: null, mid: null, rings: [], chips: null, pg: null, undo: null, redo: null, fold: null, live: null, coach: null,
  dirty: true, per: 4, w: 0, h: 0, dpr: 1, g: null, say: '', sayT: 0, uHold: null, sig: '' };
function hxSay(msg) { if (!HXU.live) return; HXU.live.textContent = ''; clearTimeout(HXU.sayT); HXU.sayT = setTimeout(() => { if (HXU.live) HXU.live.textContent = msg; }, 30); }
function hxRailDirty() { HXU.dirty = true; }
function hxRailBuild() {
  const rail = $('#hxRail');
  if (!rail || HXU.rail) return;
  HXU.rail = rail; HXU.cv = $('#hxCv'); HXU.cx = HXU.cv.getContext('2d');
  HXU.korb = $('#hxKorb'); HXU.haupt = $('#hxHaupt'); HXU.mid = $('#hxMid'); HXU.pg = $('#hxPg'); HXU.undo = $('#hxUndo'); HXU.redo = $('#hxRedo'); HXU.fold = $('#hxFold'); HXU.live = $('#hxLive'); HXU.coach = $('#hxCoach');
  HXU.form = $('#hxForm');   // (step 1d)
  const ringBox = h('div', { class: 'hx-rings' });
  for (let i = 0; i < HX_SLOTS; i++) {
    const b = h('button', { type: 'button', class: 'hxb hx-ring', 'data-slot': i, tabindex: '-1', 'aria-label': 'Schleife ' + (i + 1) + ', leer' }, h('span', { class: 'w' }, 'aufnehmen'));
    b.addEventListener('pointerdown', (e) => hxRingDown(i, e));
    b.addEventListener('click', (e) => { if (e.detail === 0) hxRingTap(i, null); });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    HXU.rings.push(b); ringBox.append(b);
  }
  HXU.ringBox = ringBox; HXU.chips = h('div', { class: 'hx-chips', role: 'group', 'aria-label': 'Nach der Ernte' });
  HXU.chips.hidden = true;
  HXU.mid.append(ringBox, HXU.chips);
  const press = (el, down, key) => {
    el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); down(e); });
    el.addEventListener('click', (e) => { if (e.detail === 0) key(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  press(HXU.korb, (e) => hxKorb(e), () => hxKorb(null));
  press(HXU.haupt, (e) => { try { HXU.haupt.setPointerCapture(e.pointerId); } catch (x) {} hxHaupt(e); }, () => hxHaupt(null));
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) HXU.haupt.addEventListener(ev, hxHauptUp);
  // ↶: a tap undoes (or cancels what waits) on release; held 1.5 s (a ring fills) it empties everything
  HXU.undo.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; e.preventDefault();
    try { HXU.undo.setPointerCapture(e.pointerId); } catch (x) {}
    HXU.uHold = { pid: e.pointerId, t: performance.now(), fired: false, tm: setTimeout(() => { if (HXU.uHold) { HXU.uHold.fired = true; hxLeeren(); hxRailDirty(); } }, HX_CLEAR_HOLD * 1000) };
  });
  const uUp = (e) => { const u = HXU.uHold; if (!u || u.pid !== e.pointerId) return; clearTimeout(u.tm); HXU.uHold = null; if (!u.fired && e.type === 'pointerup') hxUndoStep(); hxRailDirty(); };
  for (const ev of ['pointerup', 'pointercancel']) HXU.undo.addEventListener(ev, uUp);
  HXU.undo.addEventListener('click', (e) => { if (e.detail === 0) hxUndoStep(); });
  HXU.redo.addEventListener('click', () => hxRedoStep());
  // the form button (step 1d): a tap at the press (the next Lichtung, pending); held 0.5 s the row instead
  HXU.form.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; e.preventDefault();
    try { HXU.form.setPointerCapture(e.pointerId); } catch (x) {}
    const did = hxFormTap(), G = { pid: e.pointerId };
    G.tm = setTimeout(() => { if (did === 'go') { const p = HX.pend.find((x) => x.kind === 'licht'); if (p) { hxPendDrop(p); p.cancel(); } } if (did !== 'row') hxFormRow(); }, HX_HOLD * 1000);
    const up = (ev) => { if (ev.pointerId !== G.pid) return; clearTimeout(G.tm); HXU.form.removeEventListener('pointerup', up); HXU.form.removeEventListener('pointercancel', up); };
    HXU.form.addEventListener('pointerup', up); HXU.form.addEventListener('pointercancel', up);
  });
  HXU.form.addEventListener('click', (e) => { if (e.detail === 0) hxFormTap(); });
  HXU.form.addEventListener('contextmenu', (e) => e.preventDefault());
  HXU.pg.addEventListener('click', () => { HX.page = HX.page ? 0 : 1; hxRailDirty(); });
  HXU.fold.addEventListener('click', () => {
    const f = HXU.rail.dataset.fold === '1';
    if (f && hxRailAuto()) HXU.autoOpen = true;   // (folded for a panel on a short screen: open for this panel)
    if (!f || P['hx.rail'] === 'klein') setParam('hx.rail', f ? 'offen' : 'klein'); else hxRailShow();
  });
  window.addEventListener('resize', () => { if (UI.panel) hxRailShow(); });
  // the toolbar: ← → move between its buttons (one tab stop)
  rail.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = [...rail.querySelectorAll('button')].filter((b) => !b.hidden && b.offsetParent);
    const i = all.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault();
    const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    for (const b of all) b.tabIndex = -1; n.tabIndex = 0; n.focus();
  });
  // pointer presses leave no focus behind (a page-turner's keys must not reach a focused button)
  rail.addEventListener('pointerup', () => { if (rail.contains(document.activeElement)) document.activeElement.blur(); });
  if (window.ResizeObserver) new ResizeObserver(() => { HXU.w = 0; hxRailDirty(); }).observe(rail);
  hxRailShow();
}
// with a panel open the rail folds to its 24-px form only where the field would otherwise be shorter than 260 px – read
// from the layout (the field's height now, as it would be with the rail open), not from the screen's size (step 1d;
// before: every screen under 800 px). Korb and Hauptknopf stay; the fold button opens it again for that panel.
const HX_FIELD_MIN = 260;
function hxRailAuto() {
  if (!UI.panel || HXU.autoOpen || !HXU.rail || HXU.rail.hidden || typeof stage === 'undefined') return false;
  const fh = stage.getBoundingClientRect().height, rh = HXU.rail.getBoundingClientRect().height;
  return fh > 0 && fh - ((P['hx.buehne'] ? 84 : 56) - rh) < HX_FIELD_MIN;   // (step 2b: the Bühnenansicht's rail is taller)
}
function hxRailShow() {
  if (!HXU.rail) return;
  const fold = P['hx.rail'] === 'klein' || hxRailAuto();
  HXU.rail.hidden = !A.started;
  if (HXU.rail.dataset.fold !== (fold ? '1' : '0')) HXU.rail.dataset.fold = fold ? '1' : '0';
  hxBuehneSync();   // (step 2b)
  HXU.fold.setAttribute('aria-label', fold ? 'Ringleiste aufklappen' : 'Ringleiste einklappen');
  HXU.w = 0; hxRailDirty();
  if (A.started && !hxDev().coach) hxCoachShow();
  // (step 1d: the panel's own layout may settle a frame later – the mixer's, the library's – look again then)
  if (UI.panel && !HXU.reT) HXU.reT = requestAnimationFrame(() => { HXU.reT = 0; const f2 = P['hx.rail'] === 'klein' || hxRailAuto(); if (HXU.rail && (HXU.rail.dataset.fold === '1') !== f2) hxRailShow(); });
}
// a ring pressed: it acts at once; held 0.5 s it opens its card instead, dragged up or down it sets the level
function hxRingDown(i, e) {
  if (e.button > 0) return;
  e.preventDefault();
  const b = HXU.rings[i];
  try { b.setPointerCapture(e.pointerId); } catch (x) {}
  const id = HX.slot[i], L = id && HX.loops.get(id), g0 = L ? L.gain : 1;
  const G = { i, pid: e.pointerId, y0: e.clientY, mode: 'tap', g0, L, did: null };
  G.did = hxRingTap(i, e);
  G.tm = setTimeout(() => { if (G.mode === 'tap') { G.mode = 'card'; hxRingRevert(G); hxCardOpen(i); } }, HX_HOLD * 1000);
  const mv = (ev) => {
    if (ev.pointerId !== G.pid || !G.L || G.L.state === 'weg') return;
    const dy = G.y0 - ev.clientY;
    if (G.mode === 'tap' && Math.abs(dy) > 12) { G.mode = 'level'; clearTimeout(G.tm); hxRingRevert(G); }
    if (G.mode === 'level') { const db = clamp(gainToDb(G.g0) + dy / 3, -40, 6); hxLevel(G.L, db <= -39.9 ? 0 : dbToGain(db)); G.L.lvT = performance.now(); hxRailDirty(); }
  };
  const up = (ev) => {
    if (ev.pointerId !== G.pid) return;
    clearTimeout(G.tm); HXU.g = null;
    b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
  };
  b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  HXU.g = G;
}
// a hold or a drag means no tap: what the press did is taken back (a pending change cancelled, a fade reversed)
function hxRingRevert(G) {
  const L = G.L;
  if (G.did === 'neu' && HX.rec && HX.rec.slot === G.i) { hxRecCancel(true); return; }
  if (!L || L.state === 'weg') return;
  const p = HX.pend.find((x) => x.loop === L.id);
  if (p && (G.did === 'stumm' || G.did === 'spielt' || G.did === 'an')) { hxPendDrop(p); p.cancel(); return; }
  if (G.did === 'stumm') hxState(L.id, 'spielt', null, { X: 0.02 });
  else if (G.did === 'spielt') hxState(L.id, 'stumm', null, { X: 0.02 });
}

// ---- drawing ----
const HXC = { rec: '#ff5b4d', spore: '#ffb35c', lumen: '#86f0d0', hypha: '#f0e6d8', dim: '#a8988a', line: '#3d312a' };
function hxRailFrame(ts) {
  if (!HXU.rail || HXU.rail.hidden) return;
  const rail = HXU.rail, fold = rail.dataset.fold === '1';
  const lay = !HXU.w || HXU.dirty;
  if (lay) hxRailLayout();
  // a still picture is not drawn again: only while something moves (a playhead, a recording, a wait, a hold, a level)
  // or when what it shows changed (the heard beat on the Taktlinie, any state – each change calls hxRailDirty)
  const K = HX.korb, anim = hxRailAnim(), key = anim ? '' : (hxGrid() ? Math.floor(tgBeat(heardT())) & 3 : -1) + '|' + HXU.w + '|' + HXU.h + '|' + fold + '|' + HX.hist.length + '|' + HX.redo.length + '|' + HX.fokus + '|' + hxZiel() + '|' + HX.loops.size + '|' + !!HX.ruht + '|' + P['hx.modus'] + '|' + (K ? K.label + !!K.light : '') + '|' + HX.page + '|' + HX.lich.length + HX.lichCur;
  if (!anim && !lay && key === HXU.drawn) return;
  HXU.drawn = key;
  const c = HXU.cx, w = HXU.w, hh = HXU.h;
  c.setTransform(HXU.dpr, 0, 0, HXU.dpr, 0, 0);
  c.clearRect(0, 0, w, hh);
  hxDrawTakt(c, w);
  const P0 = HXU.pos, gy = fold ? 13 : 23;
  hxDrawKorb(c, P0.korb, gy, fold);
  hxDrawHaupt(c, P0.haupt, gy, fold, ts);
  if (!HXU.ringBox.hidden) for (let i = 0; i < HX_SLOTS; i++) if (P0.rings[i]) hxDrawRing(c, i, P0.rings[i], gy, fold, ts);
  hxDrawUndo(c, P0.undo, gy, fold);
  if (P0.redo) hxGlyph(c, P0.redo.cx, gy, '↷', HXC.hypha, fold ? 13 : 18);
  if (P0.form) hxDrawForm(c, P0.form, gy);
  if (P0.fold) { const f = P0.fold; c.strokeStyle = HXC.dim; c.lineWidth = 1.5; c.beginPath(); const y = f.y + f.h / 2, d = fold ? -2.5 : 2.5; c.moveTo(f.cx - 4, y - d); c.lineTo(f.cx, y + d); c.lineTo(f.cx + 4, y - d); c.stroke(); }
}
function hxRailAnim() {
  if (HX.rec || HX.punch || HX.pend.length || HX.wake || (HXU.uHold && !HXU.uHold.fired)) return true;
  const t = performance.now();
  for (const L of HX.loops.values()) if (L.state === 'spielt' || L.state === 'stumm' || (L.lvT && t - L.lvT < 1000)) return true;
  return false;
}
function hxRailLayout() {
  const rail = HXU.rail, r = rail.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (Math.round(r.width * dpr) !== HXU.cv.width || Math.round(r.height * dpr) !== HXU.cv.height) { HXU.cv.width = Math.round(r.width * dpr); HXU.cv.height = Math.round(r.height * dpr); }
  HXU.w = r.width; HXU.h = r.height; HXU.dpr = dpr;
  // rings per page: 8 where they fit at ≥ 44 px each (iPad, PC), else 4
  const midW = HXU.mid.getBoundingClientRect().width || r.width - 200;
  HXU.per = midW + (HXU.pg.hidden ? 0 : 34) >= 8 * 44 ? 8 : 4;
  hxRailState();
  // where each button sits (the canvas draws under them)
  const q = r, at = (el) => { if (el.hidden || !el.offsetParent) return null; const b = el.getBoundingClientRect(); return { x: b.left - q.left, y: b.top - q.top, w: b.width, h: b.height, cx: b.left - q.left + b.width / 2 }; };
  HXU.pos = { korb: at(HXU.korb), haupt: at(HXU.haupt), undo: at(HXU.undo), redo: at(HXU.redo), fold: at(HXU.fold), form: at(HXU.form), rings: HXU.rings.map(at) };
  HXU.dirty = false;
}
// buttons, words and labels from the state (cheap; only on change)
function hxRailState() {
  const per = HXU.per, R = HX.rec, fold = HXU.rail.dataset.fold === '1';
  // the page: the recording's, else the one asked for
  if (per === 4 && R && Math.floor(R.slot / 4) !== HX.page) HX.page = Math.floor(R.slot / 4);
  if (per === 8) HX.page = 0;
  const other = per === 4 ? [0, 1, 2, 3].map((i) => i + (HX.page ? 0 : 4)) : [];
  const otherLoops = other.map((i) => HX.loops.get(HX.slot[i])).filter(Boolean), playing = otherLoops.filter((L) => L.state === 'spielt').length;
  const needPg = per === 4 && (otherLoops.length || HX.page === 1 || HX.slot.slice(0, 4).every(Boolean));
  HXU.pg.hidden = !needPg || fold;
  if (needPg) { const t = playing ? '+' + playing : HX.page ? '1–4' : '5–8', sub = playing ? 'spielen' : 'Seite'; if (HXU.pg.dataset.t !== t + sub) { HXU.pg.dataset.t = t + sub; HXU.pg.replaceChildren(h('b', null, t), h('span', { class: 'w' }, sub)); }  HXU.pg.setAttribute('aria-label', playing ? playing + ' weitere spielen – Seite wechseln' : 'Schleifen ' + (HX.page ? '1 bis 4' : '5 bis 8') + ' zeigen'); }
  const chipsOn = !fold && !!HX.chips;
  HXU.ringBox.hidden = chipsOn; HXU.chips.hidden = !chipsOn;
  if (chipsOn) hxChipsRender();
  for (let i = 0; i < HX_SLOTS; i++) {
    const b = HXU.rings[i], vis = per === 8 || Math.floor(i / 4) === HX.page;
    b.hidden = !vis;
    if (!vis) continue;
    const L = HX.loops.get(HX.slot[i]), pend = L && HX.pend.find((p) => p.loop === L.id), w = b.firstChild;
    let word, aria;
    if (R && R.slot === i) { word = R.phase === 'rec' ? 'schließen' : 'abbrechen'; aria = 'Schleife ' + (i + 1) + (R.phase === 'rec' ? ', nimmt auf – schließen' : ', wartet – abbrechen'); }
    else if (!L) { word = 'aufnehmen'; aria = 'Schleife ' + (i + 1) + ', leer' + (hxZiel() === i ? ', Ziel' : '') + ' – aufnehmen'; }
    else {
      word = pend ? 'abbrechen' : L.state === 'spielt' ? 'stumm' : L.state === 'stumm' ? 'an' : 'weiter';
      const sw = pend ? '' : hxStance(L); b.classList.toggle('g', !!sw); if (sw) word = sw;   // (Etappe 3: the stance – a tap on it takes the Gärtner's change back)
      aria = hxName(L) + ', ' + hxEngName(L) + ', ' + hxLenText(L) + ', ' + (L.state === 'spielt' ? 'spielt' : L.state) + (pend ? ', ' + pend.label : '') + (HX.fokus === L.id ? ', Fokus' : '') + ' – ' + (hxStance(L) && !pend ? hxStance(L) + ', tippen: ' + (L.mi && L.mi.sugg ? 'einschalten' : 'zurücknehmen') : word);
    }
    if (w.textContent !== word) w.textContent = word;
    if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
  }
  // the Korb: what a tap takes now
  const K = HX.korb, kp = HX.pend.find((p) => p.kind === 'ernte');
  const kw = HX.memFull ? 'Speicher' : kp ? kp.label : K ? K.label : 'leer';
  if (HXU.korb.firstChild.textContent !== kw) HXU.korb.firstChild.textContent = kw;
  HXU.korb.setAttribute('aria-label', 'Korb: ' + (kp ? 'Ernte wartet, ' + kp.label + ' – abbrechen' : 'ernten, ' + kw));
  HXU.korb.classList.toggle('lit', !!(K && K.light));
  // the Hauptknopf
  const ruht = HX.ruht && hxLoopsLive().some((L) => L.state === 'angehalten'), dies = P['hx.modus'] === 'dieselbe' && hxFok();
  const hw = HX.punch ? 'beenden' : R ? (R.phase === 'rec' ? 'schließen' : 'abbrechen') : ruht ? 'weiter' : dies ? 'überspielen' : 'neu';
  if (HXU.haupt.firstChild.textContent !== hw) HXU.haupt.firstChild.textContent = hw;
  HXU.haupt.setAttribute('aria-label', HX.punch ? 'Überspielen beenden' : R ? (R.phase === 'rec' ? 'Aufnahme schließen' : 'Warten abbrechen') : ruht ? 'Weiter: angehaltene Schleifen beginnen auf der nächsten Eins' : dies ? 'Überspielen: ' + hxName(hxFok()) : 'Neue Schleife aufnehmen');
  HXU.redo.hidden = !HX.redoT || !HX.redo.length || fold;
  HXU.fold.hidden = false;
  // the form button (step 1d): what a tap does now – its word the pending switch, the Schluss, or the Lichtung
  const fp = HX.pend.find((p) => p.kind === 'licht'), li = hxLichOf(HX.lichCur), fi = li ? HX.lich.indexOf(li) : -1;
  const fw = fp ? (fp.label.match(/Takt (\d+)/) ? 'ab T ' + fp.label.match(/Takt (\d+)/)[1] : 'gleich') : HX.schluss ? 'Schluss' : fi >= 0 ? 'L ' + (fi + 1) : HX.lich.length ? 'Form' : 'Form';
  if (HXU.form.firstChild.textContent !== fw) HXU.form.firstChild.textContent = fw;
  const nx = HX.lich.length ? HX.lich[(fi + 1) % HX.lich.length] : null;
  HXU.form.setAttribute('aria-label', 'Form: ' + (fp ? fp.label + ' – abbrechen' : nx ? 'nächste Lichtung, ' + nx.name : 'noch keine Lichtung') + (li ? ' (jetzt ' + li.name + ')' : '') + ' – halten: Form-Zeile');
  HXU.undo.setAttribute('aria-label', HX.pend.length ? 'Abbrechen: ' + HX.pend[HX.pend.length - 1].label : 'Zurück' + (HX.hist.length ? ': ' + HX.hist[HX.hist.length - 1].label : '') + ' (halten: alle leeren)');
}
function hxChipsRender() {
  const C = HX.chips, sig = JSON.stringify([C.kind, C.key, C.to, C.kor, HX.rec && HX.rec.mult, TG.hx, !!C.auf, C.kind === 'form' ? [HX.lich.map((x) => x.id + x.rule + x.kern), HX.lichCur, HX.pend.filter((p) => p.lich).map((p) => p.lich), !!HX.schluss, !!HX.kernBack] : 0, C.ausl || 0, C.kind === 'folge' && HX.folge ? HX.folge.b : 0, HXG.plan ? HXG.plan.items.map((x) => x.key) : 0, HXW_K.wk ? HXW_K.wk.key : 0, hxAntOn()]);
  if (HXU.sig === sig) return;
  HXU.sig = sig;
  const box = HXU.chips; box.replaceChildren();
  const chip = (t, fn, o = {}) => { const b = h('button', { type: 'button', class: 'hx-chip' + (o.cls ? ' ' + o.cls : ''), 'aria-label': o.aria || t }, t); b.addEventListener('click', (e) => { e.preventDefault(); if (HX.chips) HX.chips.until = performance.now() + HX_CHIP_S * 1000; fn(); }); box.append(b); return b; };
  const sep = () => box.append(h('span', { class: 'hx-sep', 'aria-hidden': 'true' }, '│'));
  if (hxChipsMach(chip, box)) return;   // (Etappe 3: what the Gärtner plans – ✕ per loop · ✓)
  if (C.kind === 'tempo') chip('Tempo behalten · ' + dec(Math.round(TG.hx * 10) / 10), hxTempoKeep, { cls: 'pri' });
  if (C.kind === 'folge' && HX.folge) {   // (step 2a) the key change announced: its bar line, ✕ takes it back
    const F = HX.folge;
    box.append(h('span', { class: 'hx-cw' }, 'Schleifen folgen ' + (F.b != null ? 'ab Takt ' + hxBarNo(F.b) : 'gleich')));
    chip('✕', () => { hxWTonAb(); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Tonartwechsel abbrechen' });
    return;
  }
  if (C.kind === 'mult') for (const m of [1, 2, 4]) chip('×' + m, () => { if (HX.rec) { HX.rec.mult = m; hxRecAuto(); hxRailDirty(); } }, { cls: HX.rec && HX.rec.mult === m ? 'on' : '' });
  if (C.kind === 'form') {   // (step 1d) the row: the Lichtungen (their rule on the chip), merken, Kern, Lücke, Schluss
    const wait = HX.pend.find((p) => p.kind === 'licht');
    HX.lich.forEach((Li, i) => chip((i + 1) + ' · ' + (Li.rule === 'ende' ? 'Ende' : 'Takt') + (Li.kern ? ' · Kern' : ''), () => { hxLichGo(Li); HXU.sig = ''; hxRailDirty(); },
      { cls: wait && wait.lich === Li.id ? 'pri' : HX.lichCur === Li.id ? 'on' : '', aria: Li.name + ', wechselt ' + HX_REGEL[Li.rule] + (Li.kern ? ', Kern' : '') + (HX.lichCur === Li.id ? ', jetzt' : '') }));
    if (HX.lich.length) sep();
    chip('merken', () => { hxLichMerken(); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Lichtung merken: was jetzt klingt' });
    chip(HX.kernBack ? 'Kern ↩' : 'Kern', () => { hxKern(); HXU.sig = ''; hxRailDirty(); }, { aria: HX.kernBack ? 'Zurück vom Kern, auf der Eins' : 'Zum Kern, auf der Eins' });
    chip('Lücke', () => hxLuecke(1), { aria: 'Lücke: der letzte Schlag vor der Eins' }); chip('Takt-Lücke', () => hxLuecke(4), { aria: 'Lücke: der letzte Takt vor der Eins' });
    sep();
    if (HX.schluss) chip('Schluss ✕', () => { hxSchlussAb(); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Schluss abbrechen' });
    else for (const [k, t] of [['ende', 'Schluss'], ['welkend', 'welkend'], ['abbauend', 'abbauend']]) chip(t, () => { hxSchluss(k); HXU.sig = ''; hxRailDirty(); }, { aria: { ende: 'Schluss: jede Schleife endet an ihrem Ende', welkend: 'Schluss: welkend über ' + P['hx.welk'] + ' Takte', abbauend: 'Schluss: abbauend, die jüngste zuerst' }[k] });
  }
  if (C.kind === 'ernte') {
    const L = hxByKey(C.key), k = C.kor || {};
    for (const s of C.to) chip('→ ' + (s + 1), () => hxChipTo(s), { cls: 'pri', aria: 'Als Schicht in Schleife ' + (s + 1) });
    if (L) {
      if (C.to.length) sep();
      if (k.tempo) { chip('Tempo ½', () => hxKorr(L, 'h2')); chip('×2', () => hxKorr(L, 'x2'), { aria: 'Tempo verdoppeln' }); sep(); }
      if (k.len) { if (k.minus) chip('Länge −1', () => hxKorr(L, 'l-')); chip('+1', () => hxKorr(L, 'l+'), { aria: 'Länge plus ein Takt' }); sep(); }
      if (k.eins) { chip('Eins ←', () => hxKorr(L, 'e<')); chip('→', () => hxKorr(L, 'e>'), { aria: 'Eins einen Schlag später' }); sep(); }
      if (k.drei) { chip((L.bpb || 4) === 3 ? '4er' : '3er', () => hxKorr(L, '3er')); sep(); }
      if (k.davor) chip('Runde davor', () => hxKorr(L, 'davor'));
      if (C.bew) { sep(); chip('nur Bewegung', () => { hxBewOnly(L); HXU.sig = ''; hxRailDirty(); }, { aria: 'Nur die Bewegung dieser Takte als Schleife: sie formt, was du live spielst; der Klang geht' }); }   // (step 1d)
      if (C.auf && L.auf) { sep(); chip('Auftakt anfügen', () => { const ap = L.auf; L.auf = null; if (HX.chips) HX.chips.auf = false; HXU.sig = ''; hxAuftakt(L, ap); }, { cls: 'pri' }); }
      if (L.ausl && L.ausl.w0 != null) { sep(); chip('Auslese aus ' + L.ausl.k + ' · ' + L.ausl.p + ' %', () => { hxAusleseDo(L); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Auslese: die Wiederholung, die am besten zu allen passt (' + L.ausl.k + ' Wiederholungen, ' + L.ausl.p + ' % Übereinstimmung)' }); }   // (step 1d)
      if (L.ausl && L.ausl.cons && hxWCan(HX.sch.get(L.sch[0]))) { sep(); chip('Gemeint · Wuchs', () => { hxAusleseWuchs(L); HXU.sig = ''; hxRailDirty(); }, { cls: L.ausl.w0 == null ? 'pri' : '', aria: 'Auslese aus ' + L.ausl.k + ' als Wuchs: was alle Versuche gemeinsam haben, neu gespielt' }); }   // (step 2b: the consensus itself)
    }
  }
  chip('✕', () => { HX.chips = null; HXU.sig = ''; hxRailDirty(); }, { aria: 'Schließen' });
}
function hxDrawTakt(c, w) {
  const grid = hxGrid();
  if (!grid) {   // dotted: frei – no Takt yet
    c.fillStyle = HXC.dim; for (let x = 6; x < w - 4; x += 7) c.fillRect(x, 0, 2, 2);
    return;
  }
  const b = tgBeat(heardT()), beat = Math.floor(b - 4 * Math.floor(b / 4)), seg = w / 4;
  for (let i = 0; i < 4; i++) {
    const on = i === beat;
    c.fillStyle = i === 0 ? (on ? HXC.spore : 'rgba(255,179,92,0.55)') : on ? HXC.hypha : 'rgba(168,152,138,0.45)';
    c.fillRect(i * seg + 1, 0, seg - 2, on ? 3 : 2);
  }
}
function hxGlyph(c, x, y, t, col, px) { c.fillStyle = col; c.font = '500 ' + px + 'px ' + (HXU.font || (HXU.font = CSSV('--font-ui'))); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y); }
function hxDrawKorb(c, r, y, fold) {
  if (!r) return;
  const K = HX.korb, lit = K && K.light, s = fold ? 0.6 : 1, x = r.cx;
  if (lit) { const g = c.createRadialGradient(x, y, 0, x, y, 20 * s); g.addColorStop(0, 'rgba(134,240,208,0.45)'); g.addColorStop(1, 'rgba(134,240,208,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 20 * s, 0, Math.PI * 2); c.fill(); }
  const pend = HX.pend.some((p) => p.kind === 'ernte');
  c.strokeStyle = lit ? HXC.lumen : pend ? HXC.spore : HXC.hypha; c.lineWidth = 1.6; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - 11 * s, y - 2 * s); c.lineTo(x + 11 * s, y - 2 * s); c.lineTo(x + 8 * s, y + 8 * s); c.lineTo(x - 8 * s, y + 8 * s); c.closePath(); c.stroke();
  c.beginPath(); c.arc(x, y - 2 * s, 7 * s, Math.PI, 0); c.stroke();
  c.beginPath(); c.moveTo(x - 9.5 * s, y + 3 * s); c.lineTo(x + 9.5 * s, y + 3 * s); c.stroke();
}
function hxDrawHaupt(c, r, y, fold, ts) {
  if (!r) return;
  const x = r.cx, R0 = fold ? 9 : 16, Rc = HX.rec, now = A.ctx ? heardT() : 0;
  const ruht = HX.ruht && hxLoopsLive().some((L) => L.state === 'angehalten'), dies = P['hx.modus'] === 'dieselbe' && hxFok();
  c.lineWidth = 1.6;
  if (HX.punch) {   // overdubbing: red ring, a + in it
    c.strokeStyle = HXC.rec; c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = HXC.rec; c.beginPath(); c.arc(x, y, R0 * 0.55, 0, Math.PI * 2); c.fill();
    hxGlyph(c, x, y, '+', '#140f0c', fold ? 10 : 14); return;
  }
  if (Rc && Rc.phase === 'rec') {   // recording: a red disc, its arc toward the auto end
    c.fillStyle = HXC.rec; c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.fill();
    if (Rc.w1 && Rc.t0 < Rc.w1) { const f = clamp((now - Rc.t0) / (Rc.w1 - Rc.t0), 0, 1); c.strokeStyle = '#140f0c'; c.lineWidth = 2.4; c.beginPath(); c.arc(x, y, R0 - 4, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke(); }
    else if (!fold) hxGlyph(c, x, y, fmtDur(Math.max(0, now - Rc.t0)).replace(/,\d$/, ''), '#140f0c', 9);
    return;
  }
  if (Rc) {   // waiting (count-in) or listening for the first note: dashed red, the beats left
    c.strokeStyle = HXC.rec; c.setLineDash([3, 4]); c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    if (Rc.phase === 'wait') { const left = Math.max(1, Math.ceil(((Rc.t0 - now) * tgBpm(hxNowT())) / 60 - 1e-6)); hxGlyph(c, x, y + 1, String(left), HXC.rec, fold ? 10 : 15); }
    else { for (let k = 0; k < 3; k++) { c.globalAlpha = 1 - k * 0.25; c.beginPath(); c.arc(x - 3, y, 4 + k * 4, -0.9, 0.9); c.stroke(); } c.globalAlpha = 1; c.fillStyle = HXC.rec; c.beginPath(); c.arc(x - 4, y, 2.5, 0, Math.PI * 2); c.fill(); }
    return;
  }
  c.strokeStyle = HXC.line; c.fillStyle = '#1d1714'; c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.fill(); c.strokeStyle = HXC.dim; c.stroke();
  if (ruht) { c.fillStyle = HXC.hypha; c.beginPath(); c.moveTo(x - R0 * 0.3, y - R0 * 0.42); c.lineTo(x + R0 * 0.45, y); c.lineTo(x - R0 * 0.3, y + R0 * 0.42); c.closePath(); c.fill(); return; }
  if (dies) { c.strokeStyle = HXC.hypha; c.beginPath(); c.arc(x, y, R0 * 0.62, 0, Math.PI * 2); c.stroke(); }   // („dieselbe“: a ring inside – a layer)
  c.fillStyle = HXC.hypha; c.beginPath(); c.arc(x, y, R0 * 0.36, 0, Math.PI * 2); c.fill();   // (the dot is red only while recording)
}
function hxDrawUndo(c, r, y, fold) {
  if (!r) return;
  const x = r.cx, u = HXU.uHold;
  hxGlyph(c, x, y + 1, '↶', HX.pend.length || HX.hist.length ? HXC.hypha : HXC.dim, fold ? 13 : 19);
  if (u && !u.fired) { const f = clamp((performance.now() - u.t) / (HX_CLEAR_HOLD * 1000), 0, 1); c.strokeStyle = HXC.rec; c.lineWidth = 2; c.beginPath(); c.arc(x, y, fold ? 9 : 14, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke(); }
}
// the form button: a clearing (an open ring among three trees) with the Lichtung's number; dashed while a switch waits
function hxDrawForm(c, r, y) {
  const x = r.cx, R0 = 11, fp = HX.pend.some((p) => p.kind === 'licht'), li = hxLichOf(HX.lichCur), i = li ? HX.lich.indexOf(li) : -1;
  c.lineWidth = 1.4; c.strokeStyle = fp ? HXC.spore : HX.schluss ? HXC.rec : HXC.hypha;
  if (fp) c.setLineDash([2.5, 3]);
  c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  c.fillStyle = HXC.dim;
  for (const a of [-2.2, -0.95, 0.3]) { const tx = x + Math.cos(a) * (R0 + 4), ty = y + Math.sin(a) * (R0 + 4); c.beginPath(); c.moveTo(tx, ty - 3.5); c.lineTo(tx + 2.5, ty + 1.5); c.lineTo(tx - 2.5, ty + 1.5); c.closePath(); c.fill(); }
  if (i >= 0) hxGlyph(c, x, y + 0.5, String(i + 1), HXC.hypha, 11);
  else if (HX.lich.length) hxGlyph(c, x, y + 0.5, '·', HXC.dim, 14);
}
function hxDrawRing(c, i, r, y, fold, ts) {
  if (!r) return;
  const x = r.cx, R0 = fold ? 5 : Math.max(9, Math.min(17, r.w / 2 - 4)), id = HX.slot[i], L = id && HX.loops.get(id), Rc = HX.rec && HX.rec.slot === i ? HX.rec : null;
  const now = A.ctx ? heardT() : 0;
  c.lineWidth = 1.4;
  if (Rc) {
    if (Rc.phase === 'rec') {
      c.fillStyle = 'rgba(255,91,77,0.85)'; c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.fill();
      if (Rc.w1 && !fold) { const f = clamp((now - Rc.t0) / (Rc.w1 - Rc.t0), 0, 1); c.strokeStyle = '#140f0c'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R0 - 3, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke(); }
    } else {
      c.strokeStyle = HXC.rec; c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      if (Rc.phase === 'wait' && !fold) { const left = Math.max(1, Math.ceil(((Rc.t0 - now) * tgBpm(hxNowT())) / 60 - 1e-6)); c.lineWidth = 2.4; c.beginPath(); c.arc(x, y, R0 + 2.5, -Math.PI / 2, -Math.PI / 2 + Math.min(1, left / 4) * Math.PI * 2); c.stroke(); hxGlyph(c, x, y + 1, String(left), HXC.rec, 12); }
    }
    return;
  }
  if (!L) {   // empty: dashed, „+“ – the Ziel in orange
    const ziel = hxZiel() === i;
    c.strokeStyle = ziel ? HXC.spore : 'rgba(168,152,138,0.7)'; c.setLineDash([2.5, 3.5]); c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    if (!fold) hxGlyph(c, x, y, '+', ziel ? HXC.spore : HXC.dim, 13);
    return;
  }
  const st = L.state, pend = HX.pend.find((p) => p.loop === L.id), dimA = st === 'angehalten' ? 0.45 : 1;
  if (L.mi && L.mi.sugg && !fold) { c.strokeStyle = HXC.lumen; c.lineWidth = 1.2; c.setLineDash([2, 3]); c.beginPath(); c.arc(x, y, R0 + 3, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); c.lineWidth = 1.4; }   // (Etappe 3: a suggestion – dashed lumen)
  if (L.gg === 0 && !fold) { c.strokeStyle = HXC.lumen; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - R0 * 0.35, y - R0 * 0.3); c.lineTo(x - R0 * 0.35, y + R0 * 0.3); c.moveTo(x + R0 * 0.35, y - R0 * 0.3); c.lineTo(x + R0 * 0.35, y + R0 * 0.3); c.stroke(); c.lineWidth = 1.4; }   // (paused by the Gärtner: ‖ in lumen)
  const ph = hxPhase(L, REDUCED ? hxBeatStep(L, now) : now), ang = (p) => -Math.PI / 2 + p * Math.PI * 2;
  // track, bar ticks outside, one thin ring per Schicht inside
  c.strokeStyle = 'rgba(168,152,138,' + (0.55 * dimA).toFixed(2) + ')'; c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.stroke();
  if (!fold) {
    const bars = hxTakt(L) ? Math.max(1, Math.round(L.d.beats / (L.bpb || 4))) : 0;
    c.strokeStyle = HXC.dim; c.lineWidth = 1.2;
    for (let k = 0; k < bars && bars <= 16; k++) { const a = ang(k / bars); c.beginPath(); c.moveTo(x + Math.cos(a) * (R0 + 1.5), y + Math.sin(a) * (R0 + 1.5)); c.lineTo(x + Math.cos(a) * (R0 + 4), y + Math.sin(a) * (R0 + 4)); c.stroke(); }
    const ns = Math.min(4, L.sch.length);
    c.strokeStyle = 'rgba(240,230,216,' + (0.28 * dimA).toFixed(2) + ')'; c.lineWidth = 0.8;
    for (let k = 1; k < ns; k++) { c.beginPath(); c.arc(x, y, R0 * (0.3 - 0.06 * (k - 1)), 0, Math.PI * 2); c.stroke(); }
    if (L.bew && L.bew.lanes.length) {   // (step 1d) a Schleife of Bewegung: its first lane as a wave around the ring
      const ln = L.bew.lanes[0], N = 32, v = ln.v; let mx = 1e-6; for (let j = 0; j < v.length; j += 8) mx = Math.max(mx, Math.abs(v[j]));
      c.strokeStyle = st === 'spielt' ? HXC.lumen : 'rgba(168,152,138,0.7)'; c.lineWidth = 1.1; c.beginPath();
      for (let j = 0; j <= N; j++) { const p = j / N, x0 = v[Math.min(v.length - 1, Math.floor(p * v.length))] / mx, rr = R0 * (0.62 + 0.28 * x0), a = ang(p); if (j) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.stroke();
    }
    // (step 2a) Wuchs: fine hyphae from each spore to the centre; a living loop breathes (slowly, never with reduced motion)
    const wu = hxWAktiv(L) && L.sch.some((sid) => hxWCan(HX.sch.get(sid))), lebt = wu && hxWLebt(L) && st === 'spielt';
    const br = lebt && !REDUCED ? 1 + 0.06 * Math.sin((ts || 0) / 640) : 1;
    if (wu) {
      c.strokeStyle = 'rgba(134,240,208,' + (0.38 * dimA).toFixed(2) + ')'; c.lineWidth = 0.6;
      for (const n of L.notes) { const a = ang(n.ph), rr = R0 * (0.38 + 0.52 * n.r) * br; c.beginPath(); c.moveTo(x + Math.cos(a) * rr * 0.35, y + Math.sin(a) * rr * 0.35); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); c.stroke(); }
    }
    if (L.treuBis != null && A.ctx) { const left = clamp((L.treuBis - tgBeat(hxNowT())) / 32, 0, 1); c.strokeStyle = HXC.lumen; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, R0 + 2.5, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.stroke(); }
    // the notes as spores: angle = phase, radius = pitch within the loop's range
    for (const n of L.notes) {
      const a = ang(n.ph), rr = R0 * (0.38 + 0.52 * n.r) * br, sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr, sz = 1 + 1.3 * clamp(n.v, 0, 1);
      c.beginPath(); c.arc(sx, sy, sz, 0, Math.PI * 2);
      if (st === 'stumm') { c.strokeStyle = 'rgba(168,152,138,0.9)'; c.lineWidth = 0.8; c.stroke(); } else { c.fillStyle = st === 'angehalten' ? 'rgba(168,152,138,0.6)' : HXC.hypha; c.fill(); }
    }
  }
  // the playhead keeps running while stumm (you see it is still in time); angehalten shows ▶
  if (st !== 'angehalten') { const a = ang(ph); c.fillStyle = st === 'stumm' ? HXC.dim : HXC.spore; c.beginPath(); c.arc(x + Math.cos(a) * R0, y + Math.sin(a) * R0, fold ? 1.6 : 2.4, 0, Math.PI * 2); c.fill(); }
  if (st === 'stumm') { c.strokeStyle = HXC.dim; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - R0 * 0.7, y + R0 * 0.7); c.lineTo(x + R0 * 0.7, y - R0 * 0.7); c.stroke(); }
  if (st === 'angehalten' && !(pend && pend.kind === 'weiter')) { c.fillStyle = HXC.hypha; c.beginPath(); c.moveTo(x - R0 * 0.25, y - R0 * 0.35); c.lineTo(x + R0 * 0.4, y); c.lineTo(x - R0 * 0.25, y + R0 * 0.35); c.closePath(); c.fill(); }
  // pending at the bar line: a grey wedge from the head to it (the time left)
  if (pend && !fold && A.ctx) {
    const left = Math.max(0, pend.t - hxNowT()), frac = clamp(left / Math.max(0.1, hxLen(L)), 0, 1), a0 = ang(ph);
    c.fillStyle = 'rgba(168,152,138,0.32)'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, R0 - 1, a0, a0 + frac * Math.PI * 2); c.closePath(); c.fill();
    if (pend.kind === 'ernte' || pend.kind === 'weiter') { c.strokeStyle = HXC.spore; c.setLineDash([2, 3]); c.beginPath(); c.arc(x, y, R0 + 2.5, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
  }
  // the Fokus: a bright bracket on both sides
  if (HX.fokus === L.id && !fold) { c.strokeStyle = HXC.hypha; c.lineWidth = 1.6; for (const s of [-1, 1]) { c.beginPath(); c.arc(x, y, R0 + 6, (s < 0 ? Math.PI : 0) - 0.55, (s < 0 ? Math.PI : 0) + 0.55); c.stroke(); } }
  // a level being dragged
  if (L.lvT && performance.now() - L.lvT < 900 && !fold) { const t = L.gain <= 0 ? '−∞' : (gainToDb(L.gain) >= 0 ? '+' : '−') + dec(Math.abs(gainToDb(L.gain)).toFixed(0)); c.fillStyle = 'rgba(17,13,11,0.85)'; c.fillRect(x - 15, y - 7, 30, 14); hxGlyph(c, x, y, t + ' dB', HXC.hypha, 9); }
  // its number, small, top left
  if (!fold) hxGlyph(c, x - R0 - 2, y - R0 + 1, String(i + 1), HXC.dim, 8);
}
// reduced motion: the playhead steps per beat
function hxBeatStep(L, t) { if (!hxTakt(L)) return t; const b = tgBeat(t); return tgTime(Math.floor(b)); }

// ---- the coach mark, once: on the field above the Korb, gone at the first harvest or after a while ----
function hxDev(k, v) {
  let o = {}; try { o = JSON.parse(store.get('myzel.hx.dev.v1') || '{}') || {}; } catch (e) {}
  if (k === undefined) return o;
  o[k] = v; store.set('myzel.hx.dev.v1', JSON.stringify(o)); return o;
}
function hxCoachShow() {
  if (!HXU.coach || HXU.coachOn) return;
  HXU.coachOn = true; HXU.coach.hidden = false;
  HXU.coachT = setTimeout(hxCoachDone, 14000);
}
function hxCoachDone() { if (!HXU.coach) return; clearTimeout(HXU.coachT); if (!HXU.coach.hidden) { HXU.coach.hidden = true; hxDev('coach', 1); } }

