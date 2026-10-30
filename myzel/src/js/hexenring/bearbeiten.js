// ---- (owner, 25.10.2026) „Die Editiermöglichkeit … hab ich nicht gefunden“ – a loop looked at and edited, as far as the
// engine goes: a right click on a ring opens its menu (Ansehen und bearbeiten, Karte, stumm, Solo, Aufnahme, MIDI,
// Löschen); the editor (also Umschalt+1…8, a strip's head in the mixer's view „Schleifen“) lies over the field: the
// loop's waveform with its bars and beats, its notes and the playhead; a stretch dragged over it plays alone (Trimmen
// to any whole beats – hxBandTrimTo, ↶ undoes); its Schichten each with their own waveform, level, stumm and löschen;
// the tape's tools, the timing's corrections, the notes' tools, export and delete – the same calls as the card. ----
const HXE = { menu: null, ed: null, key: null, sel: null, sig: '', wsig: '', peaks: null, cv: null, drag: null, ph: -1, tmr: 0 };
const HXE_W = 1200;   // (the waveform's columns: peaks per column, drawn to the canvas's width)

// ---- the menu of a ring (a right click; on a keyboard the context-menu key on a focused ring) ----
function hxCtxMenu(slot, x, y) {
  hxCtxClose();
  const L = hxRingL(slot), box = h('div', { class: 'hx-cm', role: 'menu', 'aria-label': 'Schleife ' + (slot + 1) });
  const it = (t, fn, o = {}) => {
    const b = h('button', { type: 'button', role: 'menuitem', class: 'hx-cm-i' + (o.cls ? ' ' + o.cls : ''), title: o.tip || '', disabled: o.dis || null }, h('span', null, t), o.key ? h('kbd', null, o.key) : null);
    b.addEventListener('click', () => { hxCtxClose(); fn(); }); box.append(b); return b;
  };
  const sep = () => box.append(h('i', { class: 'hx-cm-sep', 'aria-hidden': 'true' }));
  if (!L) {
    box.append(h('div', { class: 'hx-cm-h' }, 'Platz ' + (slot + 1) + ' · leer'));
    it('Hier aufnehmen', () => hxRingTap(slot, null), { tip: 'Nimmt eine neue Schleife auf diesem Platz auf – wie ein Tipp auf den Ring.' });
  } else {
    const notes = L.sch.some((id) => hxWCan(HX.sch.get(id)));
    box.append(h('div', { class: 'hx-cm-h' }, h('i', { class: 'hx-cm-dot', style: 'background:' + hxCol(L) }), hxName(L) + (hxEngName(L) ? ' · ' + hxEngName(L) : '') + ' · ' + hxLenText(L)), hxColRow(L, hxCtxClose));   // (26.10.2026: its pigment)
    it('Ansehen und bearbeiten …', () => hxEdOpen(L), { key: '⇧' + (slot + 1), tip: 'Wellenform, Noten und Schichten ansehen; schneiden, Band, Zeit und Noten bearbeiten.' });
    it('Karte – alle Einstellungen', () => hxCardOpen(slot), { tip: 'Die Karte der Schleife im Aufnahme-Panel.' });
    it('Duplizieren', () => hxDuplicate(L), { tip: 'Eine Kopie auf einem freien Platz – mit Schichten, Bearbeitungen und Farbe; sie spielt im Takt mit dem Original.', dis: hxZiel() < 0 });
    sep();
    if (L.state === 'angehalten') it('Weiterspielen', () => hxReenter([L]), { tip: 'Beginnt auf der nächsten Eins wieder.' });
    else it(L.state === 'stumm' ? 'Wieder an' : 'Stumm', () => hxmMute(L, L.state !== 'stumm'), { tip: 'Sofort – auf dem Ring wartet dasselbe auf die Eins.' });
    it(HX.solo && HX.solo.id === L.id ? 'Solo aus' : 'Solo', () => hxmSolo(L), { tip: 'Nur diese Schleife; noch einmal: alle wie vorher.', dis: L.state === 'angehalten' });
    sep();
    it('Als Aufnahme (WAV)', () => hxExportTake(L), { tip: 'Ein Durchgang als Aufnahme – unter „Aufnahme“ anhören und als WAV speichern.' });
    if (notes) it('Noten als MIDI-Datei', () => hxExportMidi(L), { tip: 'Die Noten der Schleife als MIDI-Datei.' });
    sep();
    it('Löschen', () => hxDelete(L), { cls: 'danger', tip: 'Die Schleife löschen – mit ↶ oder unter „Gelöscht“ in der Karte zurückzuholen.' });
  }
  document.body.append(box); HXE.menu = box;
  const r = box.getBoundingClientRect();
  box.style.left = Math.round(clamp(x, 6, innerWidth - r.width - 6)) + 'px'; box.style.top = Math.round(clamp(y - r.height, 6, innerHeight - r.height - 6)) + 'px';
  const items = () => [...box.querySelectorAll('.hx-cm-i:not([disabled])')];
  box.addEventListener('keydown', (e) => {
    const l = items(), i = l.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hxCtxClose(); const rb = HXU.rings[slot]; if (rb) rb.focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length].focus(); }
    else if (e.key === 'Tab') hxCtxClose();
  });
  items()[0].focus({ preventScroll: true });
  hxBlitzOn(box);
}
function hxCtxClose() { if (HXE.menu) { HXE.menu.remove(); HXE.menu = null; } }
document.addEventListener('pointerdown', (e) => { if (HXE.menu && !HXE.menu.contains(e.target)) hxCtxClose(); }, true);
window.addEventListener('blur', hxCtxClose);

// ---- the editor ----
const hxEdL = () => { const L = HXE.key && hxByKey(HXE.key); return L && L.state !== 'weg' ? L : null; };
function hxEdOpen(L) {
  if (!L || L.bew) { if (L && L.bew) toast('Eine Schleife aus Bewegung hat keinen Klang zum Bearbeiten – ihre Karte zeigt, was sie bewegt.', 3500); return; }
  hxCtxClose();
  if (!HXE.ed) hxEdBuild();
  if (HXE.key !== L.key) { hxPvStop(); HXE.zv = null; HXE.pvAt = 0; }   // (another loop: its own view and mark)
  HXE.key = L.key; HXE.sel = null; HXE.sig = ''; HXE.wsig = '';
  HXE.ed.hidden = false; hxEdPlace(); hxEdRender();
  HXE.ed.querySelector('.hx-ed-x').focus({ preventScroll: true });
  hxSay(hxName(L) + ': bearbeiten');
}
function hxEdClose() { if (!HXE.ed || HXE.ed.hidden) return; hxPvStop(); HXE.ed.hidden = true; if (HXE.grip) HXE.grip.hidden = true; HXE.key = null; HXE.drag = null; HXE.rw = null; HXE.zv = null; }   // (the rendered pass freed – a long loop's is large)
function hxEdBuild() {
  const ed = HXE.ed = h('section', { class: 'hx-ed', role: 'dialog', 'aria-label': 'Schleife bearbeiten', hidden: true });
  ed.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hxEdClose(); } });
  document.body.append(ed);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ed.hidden && !HXE.menu && !(MX.open && MX.detailK)) { e.preventDefault(); e.stopPropagation(); hxEdClose(); } }, true);   // (wherever the focus is)
  window.addEventListener('resize', () => { if (!ed.hidden) { hxEdPlace(); HXE.wsig = ''; } });
  // (owner, 26.10.2026: „die Leiste nach rechts verschiebbar“; again 30.10.2026: „Das Fenster soll breiter ziehbar sein“)
  // its width, dragged at the right edge – it may then reach over an open panel (double click: as the field again)
  HXE.w = +store.get('myzel.edW') || 0;
  const g = HXE.grip = h('div', { class: 'hx-ed-grip', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Breite des Bearbeiten-Fensters', title: 'Ziehen: breiter oder schmaler · Doppelklick: so breit wie das Feld', hidden: true });
  let x0 = 0, w0 = 0;
  g.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); x0 = e.clientX; w0 = ed.getBoundingClientRect().width; try { g.setPointerCapture(e.pointerId); } catch (x) {} g.classList.add('on'); });
  g.addEventListener('pointermove', (e) => { if (!g.classList.contains('on')) return; HXE.w = Math.max(360, w0 + e.clientX - x0); hxEdPlace(); HXE.wsig = ''; });
  const end = () => { if (!g.classList.contains('on')) return; g.classList.remove('on'); store.set('myzel.edW', String(Math.round(HXE.w || 0))); };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  g.addEventListener('dblclick', () => { HXE.w = 0; store.set('myzel.edW', '0'); hxEdPlace(); HXE.wsig = ''; });
  document.body.append(g);
  hxBlitzOn(ed);
}
// over the field (its column), never over the rail: you still play and the rings still answer
function hxEdPlace() {
  const st = typeof stage !== 'undefined' && stage.getBoundingClientRect(), ed = HXE.ed; if (!st || !ed) return;
  const m = st.width < 700 ? 6 : 14;
  ed.style.left = Math.round(st.left + m) + 'px'; ed.style.top = Math.round(st.top + m) + 'px';
  const wd = HXE.w ? Math.min(HXE.w, window.innerWidth - st.left - m - 8) : st.width - 2 * m;
  ed.style.width = Math.round(wd) + 'px'; ed.style.maxHeight = Math.round(st.height - 2 * m) + 'px';
  if (HXE.grip) { const g = HXE.grip; g.hidden = ed.hidden; g.style.left = Math.round(st.left + m + wd - 5) + 'px'; g.style.top = Math.round(st.top + m + 14) + 'px'; g.style.height = Math.max(40, Math.round(Math.min(ed.getBoundingClientRect().height || st.height, st.height - 2 * m) - 28)) + 'px'; }
}
// what the editor shows depends on: rebuilt when it changes (a frame compares it), the playhead drawn every frame
// (the ↶ ↷ buttons follow the history, the state its words and colour: part of what is shown, not of what is rendered –
// 30.10.2026: Stopp halts the loop, ▶ right after plays the same pass without rendering it again)
const hxEdSig = (L) => hxEdRSig(L) + '|' + L.state + '|' + HX.hist.length + ':' + HX.redo.length + ':' + HX.pend.length + ':' + !!L.prev + '|' + P['t.root'] + P['t.scale'] + P['t.a4'] + '|' + hxRxSig(hxRxOf(L)) + (L.rxBusy ? 'b' : '') + (L.nudge || 0);   // (30.10.2026: the head names the key; the switches of the Klangfarbe and the shifts)
function hxEdRSig(L) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
  return [L.key, L.hum ? 1 : L.humBusy ? 2 : 0, L.d.beats, L.d.L, L.bpb, L.sp || 1, !!L.rev, JSON.stringify(L.trim || 0), L.dbl || 1, HX.fokus === L.id, HX.solo ? HX.solo.id : 0, JSON.stringify(L.nt || 0), JSON.stringify(L.slc || 0), L.vb, JSON.stringify(L.ab || 0), L.notes.length,   // (26.10.2026: Lücken – its chips lit only after another change)
   
    sch.map((S) => S.key + ':' + (S.ver || 0) + ':' + S.pre + ':' + S.len + ':' + S.gain + ':' + !!S.mute + ':' + !!S.aud + ':' + (S.play || 'ab') + ':' + (S.wu ? S.wu.sig || 1 : 0) + ':' + !!S.baked).join(','), hxLoopsLive().map((X) => X.slot).join('')].join('|');
}
function hxEdRender() {
  const L = hxEdL(), ed = HXE.ed; if (!ed || ed.hidden) return;
  if (!L) { hxEdClose(); return; }
  HXE.sig = hxEdSig(L); HXE.rsig = hxEdRSig(L);
  const chip = (t, on, fn, tip, o = {}) => { const b = h('button', { type: 'button', class: 'chip' + (o.cls ? ' ' + o.cls : ''), 'aria-pressed': on ? 'true' : 'false', title: tip || '', disabled: o.dis || null }, t); b.addEventListener('click', fn); return b; };
  const btn = (t, fn, tip, cls) => { const b = h('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), title: tip || '' }, t); b.addEventListener('click', fn); return b; };
  const row = (lab, tip, ...kids) => h('div', { class: 'hx-ed-row' }, h('span', { class: 'lab', title: tip }, lab), h('div', { class: 'chips' }, ...kids.filter(Boolean)));
  const loops = hxLoopsLive().filter((X) => !X.bew).sort((a, b) => a.slot - b.slot), i = loops.indexOf(L);
  const go = (d) => { const X = loops[(i + d + loops.length) % loops.length]; if (X && X !== L) hxEdOpen(X); };
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean), notes = sch.some(hxWCan), tk = hxTakt(L), k = hxCorrs(L);
  const bpm = tk ? dec(tgBpm(hxNowT()).toFixed(1)) + ' BPM' : '';
  // (owner, 30.10.2026: „oben muss auch Stimmung und Skala stehen – auch die ursprüngliche“) the key it was harvested in
  // (its notes' record) and the field's now; the Kammerton when it is not 440 Hz
  const W = sch.map((S) => S.wn).find((w) => w && w.key), k0 = W && W.key, kn = { root: P['t.root'], scale: P['t.scale'] };
  const kName = (k) => NOTE_NAMES[((Math.round(+k.root) % 12) + 12) % 12] + ' ' + ((SCALES[k.scale] || {}).n || k.scale);
  const same = k0 && String(k0.root) === String(kn.root) && k0.scale === kn.scale;
  const keyTxt = !k0 ? '' : same ? kName(k0) : (hxTonOf(L) === 'fest' ? kName(k0) + ' (geerntet; Feld jetzt ' + kName(kn) + ')' : 'jetzt ' + kName(kn) + ' · geerntet in ' + kName(k0));
  const a4 = Math.round(P['t.a4']) !== 440 ? 'a′ ' + dec((+P['t.a4']).toFixed(1)) + ' Hz' : '';
  const head = h('div', { class: 'hx-ed-h' },
    h('div', { class: 'hx-ed-t' }, h('h3', { style: 'color:' + hxCol(L) }, h('i', { class: 'hx-cm-dot', style: 'background:' + hxCol(L) }), hxName(L)), h('span', { class: 'meta' }, [hxEngName(L), hxLenText(L), bpm, keyTxt, a4, { spielt: 'spielt', stumm: 'stumm', angehalten: 'angehalten' }[L.state] || L.state, HX.fokus === L.id ? 'Fokus' : ''].filter(Boolean).join(' · '))),
    h('div', { class: 'hx-ed-hb' },
      loops.length > 1 ? btn('‹', () => go(-1), 'Vorige Schleife', 'ghost') : null, loops.length > 1 ? btn('›', () => go(1), 'Nächste Schleife', 'ghost') : null,
      (() => { const u = btn('↶', hxUndoStep, HX.hist.length ? 'Rückgängig: ' + HX.hist[HX.hist.length - 1].label + ' (Strg+Z)' : 'Nichts rückgängig zu machen', 'ghost'); u.disabled = !HX.hist.length && !HX.pend.length; u.setAttribute('aria-label', 'Rückgängig'); return u; })(),
      (() => { const r = btn('↷', hxRedoStep, HX.redo.length ? 'Wiederholen: ' + HX.redo[HX.redo.length - 1].label + ' (Strg+Umschalt+Z)' : 'Nichts zu wiederholen', 'ghost'); r.disabled = !HX.redo.length; r.setAttribute('aria-label', 'Wiederholen'); return r; })(),
      btn('Grundeinstellung', () => hxDefaults(L), 'Alle Bearbeitungen zurück: Band ×1, vorwärts, ganz, keine Lücken, kein Verblassen, kein Abrieb, Noten wie gespielt, bearbeitete Abschnitte wie aufgenommen – als ein Schritt (↶ holt sie zurück). Pegel, Balance und Schichten bleiben.', 'ghost'),
      btn('Karte', () => { hxEdClose(); hxCardOpen(L.slot); }, 'Die Karte mit allen Einstellungen dieser Schleife', 'ghost'),
      (() => { const x = btn('✕', hxEdClose, 'Schließen (Esc)', 'ghost hx-ed-x'); x.setAttribute('aria-label', 'Schließen'); return x; })()));
  // the waveform: drag over it to choose a stretch
  HXE.cv = h('canvas', { class: 'hx-ed-cv', role: 'img', 'aria-label': 'Wellenform von ' + hxName(L) + (tk ? ', ' + hxLenText(L) : '') });
  const wbox = h('div', { class: 'hx-ed-wave', tabindex: '0', title: 'Die Schleife, wie sie klingt. Türkise Striche: die gespielten Noten – wo sie liegen, wie hoch (oben hoch), wie lang. Klicken spielt ab dieser Stelle (Leertaste: Abspielen/Stopp). Ziehen wählt einen Teil (auf ganze Schläge, mit Alt feiner). Strg+Mausrad zoomt, Umschalt+Mausrad schiebt.' }, HXE.cv);
  hxEdWaveDrag(wbox);
  // (owner, 26.10.2026) the transport: Vorhören from any place, the stretch repeating, the clock, the zoom
  const zoomed = !!HXE.zv;
  HXE.pvBtn = btn(HXE.pv ? '■ Stopp' : '▶ Abspielen', hxPvToggle, 'Vorhören (Leertaste): die Schleife so, wie sie mit allen Änderungen klingt – sofort, ab der Marke. Die laufende Schleife schweigt solange, die anderen spielen weiter; ■ Stopp hält auch die Schleife an. Ein Klick in die Wellenform spielt ab dort.', 'primary hx-pv-play');
  const tp = h('div', { class: 'hx-ed-tp' }, HXE.pvBtn,
    btn('⏮', () => hxPvJump(HXE.sel ? HXE.sel.a : 0), HXE.sel ? 'An den Anfang der Auswahl' : 'An den Anfang', 'ghost'),
    HXE.sel ? chip('Auswahl wiederholen', HXE.pvRep !== false, () => { HXE.pvRep = HXE.pvRep === false; hxEdRender(); }, 'Beim Vorhören nur die Auswahl, immer wieder') : null,
    HXE.tEl = h('span', { class: 'hx-pv-t', 'aria-live': 'off' }, hxPvTime(L, hxPvPos())),
    h('span', { class: 'hx-ed-zoom' }, h('span', { class: 'lab' }, 'Zoom'),
      btn('−', () => hxEdZoom(2), 'Weiter weg (Strg+Mausrad)', 'ghost'), btn('+', () => hxEdZoom(0.5), 'Näher heran (Strg+Mausrad)', 'ghost'),
      HXE.sel ? btn('Auswahl', () => hxEdZoomTo(HXE.sel.a, HXE.sel.b), 'Die Auswahl groß', 'ghost') : null,
      zoomed ? btn('ganz', () => { HXE.zv = null; HXE.wsig = ''; hxEdRender(); }, 'Die ganze Schleife', 'ghost') : null));
  const selTxt = HXE.sel ? hxEdSelText(L, HXE.sel) : '';
  // (26.10.2026) a change that waits for the next seam: the picture already shows it – when it is heard
  HXE.waitEl = h('span', { class: 'hx-ed-wait' }, '');
  const selRow = h('div', { class: 'hx-ed-sel' },
    h('span', { class: 'hx-ms' }, HXE.sel ? 'Auswahl: ' + selTxt : L.trim ? 'Getrimmt – es spielt nur ein Teil der Aufnahme.' : 'Ziehe über die Wellenform, um einen Teil auszuwählen – dann lässt er sich allein bearbeiten.'),
    HXE.sel ? btn('Schleife auf die Auswahl kürzen', () => hxEdTrimSel(L), 'Die Schleife besteht ab der nächsten Naht nur noch aus diesem Teil (↶ macht es rückgängig). Nur anhören: ▶ Abspielen mit „Auswahl wiederholen“. Den Teil bearbeiten: „Abschnitt bearbeiten“ darunter – jede Änderung ist sofort zu hören.', 'primary') : null,
    HXE.sel ? btn('Auswahl aufheben', () => { HXE.sel = null; hxEdRender(); }, '', 'ghost') : null,
    L.trim ? btn('Wieder ganz', () => hxBandTrim(L, 'ganz'), 'Wieder die ganze Aufnahme spielen', '') : null);
  // the Schichten
  const KIND = { ernte: 'Ernte', retro: 'Durchgang', punch: 'Überspielt', aufnahme: 'Aufnahme', sediment: 'Zusammengelegt' };
  const toN = (g) => Math.round(clamp((gainToDb(Math.max(g, 1e-6)) + 40) / 46, 0, 1) * 1000), fromN = (v) => (v <= 0 ? 0 : dbToGain((v / 1000) * 46 - 40));
  const schRows = sch.map((S, j) => {
    const cv = h('canvas', { class: 'hx-ed-mini', 'aria-hidden': 'true' }); cv.hxS = S;
    const r = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Pegel Schicht ' + (j + 1), title: 'Pegel dieser Schicht' });
    r.value = toN(S.gain); r.style.setProperty('--p', r.value / 10 + '%');
    let g0 = S.gain;
    r.addEventListener('pointerdown', () => { g0 = S.gain; }); r.addEventListener('keydown', () => { if (!r.hxK) { g0 = S.gain; r.hxK = 1; } });
    r.addEventListener('input', () => { hxSchLevel(S, fromN(+r.value)); r.style.setProperty('--p', r.value / 10 + '%'); });
    r.addEventListener('change', () => { r.hxK = 0; hxEdSchStep(S, { gain: g0 }, { gain: S.gain }, 'Pegel Schicht ' + (j + 1)); });
    return h('div', { class: 'hx-ed-srow' + (S.mute ? ' mute' : '') }, h('span', { class: 'lab' }, (j + 1) + ' · ' + (KIND[S.kind] || S.kind) + (S.aud ? '' : ' …')), cv, r,
      chip('stumm', !!S.mute, () => { const m0 = !!S.mute; hxSchLevel(S, null, !m0); hxEdSchStep(S, { mute: m0 }, { mute: !m0 }, 'Schicht ' + (j + 1) + (m0 ? ' an' : ' stumm')); }, 'Diese Schicht stumm'), chip('löschen', false, () => hxSchDel(S), 'Diese Schicht löschen (↶ holt sie zurück)', { cls: 'danger' }));
  });
  const audible = sch.filter((S) => !S.mute).length;
  const sp = L.sp || 1, slc = L.slc || {}, nt = L.nt || {}, nd = L.nudge || 0;
  const zt = (t, v, tip) => { const on = Math.abs(nd - v) < 1e-4; return chip(t, on, () => hxNudge(L, on ? -nd : v - nd), tip + (on ? ' – noch einmal: zurück' : '')); };
  const ntTo = (k, v) => () => hxNtSet(L, k, ((nt[k] || 0) === v ? 0 : v) - (nt[k] || 0));   // (a Noten tool as a switch: the value, or back to 0)
  const tools = [
    row('Farbe', 'Das Pigment der Schleife – in der Ringleiste, im Mixer und hier. „aus dem Klang“: dunkle Klänge tiefe Pigmente, helle leuchtende.', hxColRow(L)),
    row('Band', 'Wie ein Tonband: langsamer und tiefer, schneller und höher, rückwärts, auslaufen, verdoppeln.', ...HX_SP.map(([v, t]) => chip(t, Math.abs(sp - v) < 1e-6, () => hxSpeed(L, v), 'Bandgeschwindigkeit ' + t)),
      chip('rückwärts', !!L.rev, () => hxRev(L), 'Rückwärts – sofort, ab der gespiegelten Stelle'), chip('Stopp', false, () => hxBandstopp([L]), 'Bandstopp: das Band läuft aus'), chip('Verdoppeln', false, () => hxDouble(L), 'Doppelt so lang durch Wiederholung')),
    row('Trimmen', 'Nur einen Teil spielen – oder oben einen Teil auswählen.', chip('½', !!(L.trim && L.trim.f === 0.5), () => hxBandTrim(L, L.trim && L.trim.f === 0.5 ? 'ganz' : 'h'), 'Die halbe Schleife' + (L.trim && L.trim.f === 0.5 ? ' – noch einmal: ganz' : '')), chip('¼', !!(L.trim && L.trim.f === 0.25), () => hxBandTrim(L, L.trim && L.trim.f === 0.25 ? 'ganz' : 'v'), 'Ein Viertel' + (L.trim && L.trim.f === 0.25 ? ' – noch einmal: ganz' : '')),
      L.trim ? chip('◀', false, () => hxBandTrim(L, '<'), 'Ausschnitt früher') : null, L.trim ? chip('▶', false, () => hxBandTrim(L, '>'), 'Ausschnitt später') : null, L.trim ? chip('ganz', false, () => hxBandTrim(L, 'ganz'), 'Wieder ganz') : null),
    // (owner, 30.10.2026: „einfach wieder dort klicken“) the shifts are switches: the chip of the shift that stands is lit, the same
    // one again brings the loop back to 0, another one sets that shift
    row('Zeit', 'Die Schleife zeitlich verschieben (ein Schalter – noch einmal: zurück auf 0) oder Erkanntes korrigieren.', zt('−1 Schlag', -60 / tgBpm(hxNowT()), 'Einen Schlag früher'), zt('−5 ms', -0.005, 'Fein früher'),
      zt('+5 ms', 0.005, 'Fein später'), zt('+1 Schlag', 60 / tgBpm(hxNowT()), 'Einen Schlag später'),
      k.eins ? chip('Eins ←', false, () => hxKorr(L, 'e<'), 'Die Eins einen Schlag früher') : null, k.eins ? chip('Eins →', false, () => hxKorr(L, 'e>'), 'Die Eins einen Schlag später') : null,
      k.len && k.minus ? chip('Takt −1', false, () => hxKorr(L, 'l-'), 'Einen Takt kürzer') : null, k.len ? chip('Takt +1', false, () => hxKorr(L, 'l+'), 'Einen Takt länger') : null,
      k.tempo ? chip('Tempo ½', false, () => hxKorr(L, 'h2'), 'Halbes Tempo') : null, k.tempo ? chip('Tempo ×2', false, () => hxKorr(L, 'x2'), 'Doppeltes Tempo') : null),
    row('Weglassen', 'Lässt zufällig einige Anschläge weg.', ...HX_SLP.map(([v, t]) => chip(t, (slc.pd || 0) === v, () => hxSlcSet(L, 'pd', v), v ? 'Weglassen: ' + t + ' der Anschläge fallen weg' : 'Nichts weglassen'))),
    row('Tauschen', 'Vertauscht zufällig die Plätze einiger Anschläge.', ...HX_SLP.map(([v, t]) => chip(t, (slc.pw || 0) === v, () => hxSlcSet(L, 'pw', v), v ? 'Tauschen: ' + t + ' der Anschläge tauschen den Platz' : 'Nichts tauschen')),
      slc.pd || slc.pw ? chip('neu würfeln', false, () => hxSlcSet(L, 'neu'), 'Andere Anschläge weglassen oder tauschen') : null),
    row('Altern', 'Leiser werden oder sich abnutzen wie ein Tonband.', ...HX_VB.map(([v, t]) => chip('verblassen ' + t, (L.vb != null ? L.vb : 1) === v, () => hxVbSet(L, v), v < 1 ? 'Verblassen ' + t + ': jede Schicht pro Durchgang leiser' : 'Nicht verblassen')),
      ...HX_ABR.map(([v, t]) => chip('Abrieb ' + t, ((L.ab && L.ab.rate) || 0) === v, () => hxAbSet(L, v), v ? 'Abrieb ' + t + ': das Band nutzt sich an denselben Stellen ab' : 'Kein Abrieb'))),
    notes ? row('Noten', 'Die Noten umformen (die Schleife spielt sie neu) – Schalter, noch einmal: wie gespielt.', chip('Stufe −1', (nt.tr || 0) === -1, ntTo('tr', -1), 'Eine Stufe tiefer in der Tonart'), chip('Stufe +1', (nt.tr || 0) === 1, ntTo('tr', 1), 'Eine Stufe höher'),
      chip('dünner', (nt.dens || 0) < 0, ntTo('dens', -1), 'Die schwächsten Töne weg'), chip('dichter', (nt.dens || 0) > 0, ntTo('dens', 1), 'Durchgangstöne dazu'),
      chip('Krebs', !!nt.krebs, () => hxNtSet(L, 'krebs'), 'Rückwärts gespielt'), chip('Umkehrung', !!nt.umk, () => hxNtSet(L, 'umk'), 'Gespiegelt in der Tonleiter'), hxNtOn(L) ? chip('wie gespielt', false, () => hxNtSet(L, 'zurueck'), 'Die Noten wie gespielt') : null) : null,
  ].filter(Boolean);
  const foot = h('div', { class: 'hx-ed-foot' }, audible > 1 ? btn('Schichten zusammenlegen', () => hxMerge(L), 'Alle hörbaren Schichten zu einer – spart Rechenzeit und Speicher') : null,
    btn('Als Aufnahme (WAV)', () => hxExportTake(L), 'Ein Durchgang als Aufnahme'), notes ? btn('MIDI', () => hxExportMidi(L), 'Die Noten als MIDI-Datei') : null,
    btn('Löschen', () => { hxDelete(L); hxEdClose(); }, 'Die Schleife löschen (↶ holt sie zurück)', 'ghost danger'));
  // (owner, 26.10.2026) a stretch chosen: its own tools – they change only that part (written into the audio, ↶ back)
  let part = null;
  {   // (28.10.2026: without a selection the whole loop – its colours, its pitch, Einspielen over all of it)
    const s = HXE.sel || { a: 0, b: 1 }, whole = !HXE.sel, go = (op, v) => () => { hxRegionEdit(L, s.a, s.b, op, v); }, act = (t, op, v, tip) => chip(t, false, go(op, v), tip);
    // (28.10.2026, Direkt – direkt.js)
    const mk = HXE.mark && HXE.mark.key === L.key ? HXE.mark : null, mOk = hxRxMarkOk(L, s.a, s.b), tk = HX.take && HX.take.key === L.key ? HX.take : null;
    HXE.takeEl = h('span', { class: 'hx-ed-take', role: 'status' }, hxTakeText());
    const semis = [-12, -7, -5, -2, -1, 1, 2, 5, 7, 12], cents = [-50, -20, -10, 10, 20, 50], sg = (x) => (x > 0 ? '+' : '−') + Math.abs(x);
    // (owner, 30.10.2026) the whole loop: switches of its Klangfarbe (klangebene.js) – a part: steps, as before
    const rx = hxRxOf(L), tg = (t, kind, v, tip) => chip(t, rx[kind] === v, () => hxRxToggle(L, kind, v), tip + (rx[kind] === v ? ' – noch einmal: aus' : ''));
    const sw = (t, kind, v, op, opv, tip) => (whole ? tg(t, kind, v, tip) : act(t, op, opv, tip));
    part = h('div', { class: 'hx-ed-sec hx-ed-part' }, h('div', { class: 'hx-ed-st' }, whole ? 'Klang verwandeln – die ganze Schleife (oder oben einen Teil wählen: dann nur ihn)' : 'Abschnitt bearbeiten – ' + hxRxName(L, s.a, s.b) + ' (nur dieser Teil; der Rest bleibt)'), !whole && hxWAktiv(L) ? h('p', { class: 'hx-ed-frz' }, 'Diese Schleife spielt ihre Noten gerade neu' + (hxWWhy(L) ? ' – ' + hxWWhy(L) : '') + '. Bearbeitet wird ein fester Klang: beim ersten Klick hier wird sie so festgehalten, wie sie jetzt klingt („Erstarren“) – danach folgt sie Tonart und Tempo nicht mehr von selbst. ↶ nimmt es zurück.') : null,
      whole ? null : row('Direkt', 'Den Abschnitt löschen (die Schleife bleibt gleich lang), merken – und dann einen anderen Teil mit ihm tauschen oder ihn dort einsetzen.',
        act('Löschen', 'loeschen', 0, 'Den Abschnitt leeren – die Schleife bleibt gleich lang'),
        chip(mk && Math.abs(mk.a - s.a) < 1e-9 && Math.abs(mk.b - s.b) < 1e-9 ? 'Gemerkt ✓' : 'Merken', !!(mk && Math.abs(mk.a - s.a) < 1e-9 && Math.abs(mk.b - s.b) < 1e-9), () => hxRxMark(L, s.a, s.b), 'Diesen Abschnitt merken – dann einen anderen Teil wählen'),
        chip('Tauschen ⇄', false, () => hxRxMoveGo(L, s.a, s.b, 'swap'), mk ? 'Dieser Teil und der gemerkte tauschen die Plätze' : 'Zuerst einen anderen Abschnitt merken', { dis: !mOk }),
        chip('Einsetzen', false, () => hxRxMoveGo(L, s.a, s.b, 'paste'), mk ? 'Der gemerkte Abschnitt wird hier eingesetzt (er selbst bleibt)' : 'Zuerst einen anderen Abschnitt merken', { dis: !mOk })),
      row('Einspielen', 'Spiel etwas – es wird genau an dieser Stelle in die Schleife eingebaut, wenn der Abschnitt das nächste Mal kommt. „ersetzen“ leert ihn vorher, „dazu“ legt es darüber.',
        tk ? chip('Abbrechen', true, () => hxTakeStop(), 'Einspielen abbrechen') : chip('● ersetzen', false, () => hxTakeArm(L, s.a, s.b, 'ersetzen'), 'Der Abschnitt wird geleert – spiel hinein, wenn er kommt'),
        tk ? null : chip('● dazu', false, () => hxTakeArm(L, s.a, s.b, 'dazu'), 'Was du spielst, kommt zum Abschnitt dazu'), HXE.takeEl),
      row('Tonhöhe', whole ? 'Die Schleife in Halbtönen höher oder tiefer – ein Schalter, sie behält ihre Länge.' : 'Den Abschnitt in Halbtönen höher oder tiefer – er behält seine Länge.', ...semis.map((x) => sw(sg(x), 'pitch', x, 'pitch', x, (whole ? 'Die Schleife ' : 'Den Abschnitt ') + Math.abs(x) + (Math.abs(x) === 1 ? ' Halbton ' : ' Halbtöne ') + (x > 0 ? 'höher' : 'tiefer')))),
      row('Verstimmen', (whole ? 'Die Schleife' : 'Den Abschnitt') + ' um einige Cent verstimmen (100 Cent sind ein Halbton)' + (whole ? ' – ein Schalter.' : ' – er behält seine Länge.'), ...cents.map((x) => sw(sg(x) + ' ct', 'ct', x, 'pitch', x / 100, (whole ? 'Die Schleife' : 'Den Abschnitt') + ' um ' + Math.abs(x) + ' Cent ' + (x > 0 ? 'höher' : 'tiefer') + ' stimmen'))),
      whole ? null : row('Band', 'Der Abschnitt wie ein Tonband langsamer oder schneller – er behält seine Länge: ×2 spielt ihn zweimal, ½ seine erste Hälfte langsam.', ...HX_SP.filter(([v]) => v !== 1).map(([v, t]) => act(t, 'band', v, 'Abschnitt mit Band ' + t)), act('rückwärts', 'rev', 0, 'Den Abschnitt rückwärts')),
      whole ? null : row('Weglassen', 'Lässt Anschläge in diesem Abschnitt weg.', ...HX_SLP.filter(([v]) => v).map(([v, t]) => act(t, 'weg', v, 'Im Abschnitt ' + t + ' der Anschläge weglassen'))),
      whole ? null : row('Tauschen', 'Vertauscht Anschläge in diesem Abschnitt.', ...HX_SLP.filter(([v]) => v).map(([v, t]) => act(t, 'tausch', v, 'Im Abschnitt ' + t + ' der Anschläge tauschen'))),
      whole ? null : row('Pegel', 'Der Abschnitt lauter, leiser oder still.', act('stumm', 'gain', 0, 'Den Abschnitt still'), act('−6 dB', 'gain', dbToGain(-6), 'Leiser'), act('−3 dB', 'gain', dbToGain(-3), 'Etwas leiser'), act('+3 dB', 'gain', dbToGain(3), 'Etwas lauter'), act('+6 dB', 'gain', dbToGain(6), 'Lauter')),
      // (28.10.2026: Verwandeln and Färben – verwandeln.js)
      row('Verwandeln', (whole ? 'Die Schleife' : 'Der Abschnitt') + ' wächst um – wie ein Myzel: löst sich auf, zerstäubt, keimt, wurzelt tiefer oder wächst in die Krone.' + (whole ? ' Ein Schalter je Zeile.' : ''),
        sw('Nebel', 'verw', 'nebel', 'nebel', 0, 'Nebel: löst sich in einen eigenen Hall auf'), sw('Sporen', 'verw', 'sporen', 'sporen', 0, 'Sporen: zerstäubt in kleine Körner, breit verstreut'),
        sw('Keimen', 'verw', 'keimen', 'keimen', 0, 'Keimen: der Anfang treibt aus – wiederholt, immer schneller'), sw('Wurzel', 'verw', 'wurzel', 'wurzel', 0, 'Wurzel: eine Oktave tiefer, gleiche Länge'), sw('Krone', 'verw', 'krone', 'krone', 0, 'Krone: eine Oktave höher, gleiche Länge')),
      row('Färben', (whole ? 'Die Schleife' : 'Der Abschnitt') + ' dunkler, heller, verwelkend oder aufkeimend.' + (whole ? ' Ein Schalter.' : ''),
        sw('Erde', 'farb', 'erde', 'erde', 0, 'Erde: dunkel – nur die Tiefen'), sw('Licht', 'farb', 'licht', 'licht', 0, 'Licht: luftig – nur die Höhen'), sw('Welken', 'farb', 'welken', 'welken', 0, 'Welken: wird zum Ende dunkler und leiser'), sw('Sprießen', 'farb', 'spriessen', 'spriessen', 0, 'Sprießen: kommt aus der Stille und öffnet sich zum Ende')),
      h('p', { class: 'note' }, whole ? 'Jeder Eintrag ist ein Schalter: leuchtend heißt an, noch einmal klicken nimmt ihn zurück – sofort zu hören, das Vorhören startet von selbst. Die Klangfarbe bleibt auch, wenn die Noten-Werkzeuge die Schleife neu spielen. Für einen Teil: in der Wellenform oben ziehen (dort sind es Schritte, ↶ nimmt sie zurück).' : 'Jeder Klick ist ein Schritt und sofort zu hören – das Vorhören startet von selbst und wiederholt die Auswahl. ↶ nimmt ihn zurück. Die Auswahl bleibt, du kannst weiter darauf arbeiten oder einen anderen Teil wählen.'));
  }
  const hum = hxEdHumRow(L);   // (26.10.2026: the whole Ernte, the loop's window in it)
  // (30.10.2026) rebuilt while the waveform or ▶/■ has the focus (Stopp halts the loop – a new state): it stays there, so
  // Space plays again
  const fa = document.activeElement, fk = fa && ed.contains(fa) ? (fa.classList.contains('hx-ed-wave') ? wbox : fa.classList.contains('hx-pv-play') ? HXE.pvBtn : null) : null;
  ed.replaceChildren(head, tp, wbox, HXE.waitEl, selRow, ...(hum ? [hum] : []), ...(part ? [part] : []), h('div', { class: 'hx-ed-sec' }, h('div', { class: 'hx-ed-st' }, sch.length === 1 ? 'Schicht' : sch.length + ' Schichten'), ...schRows), h('div', { class: 'hx-ed-sec' }, h('div', { class: 'hx-ed-st' }, HXE.sel ? 'Ganze Schleife' : 'Bearbeiten'), ...tools), foot);
  if (fk) fk.focus({ preventScroll: true });
  HXE.wsig = '';
  requestAnimationFrame(() => { hxEdWave(true); for (const c of ed.querySelectorAll('.hx-ed-mini')) hxEdMini(c); hxHumDraw(); });
}
// the selection's words: beats and bars of a Takt loop, seconds of a free one
function hxEdSelText(L, s) {
  if (hxTakt(L)) { const B = L.d.beats, bpb = L.bpb || 4, q = (x) => Math.round(x * 16) / 16, a = q(s.a * B), b = q(s.b * B), fb = (x) => dec(+x.toFixed(2)), bar = (x) => Math.floor(x / bpb) + 1 + (Math.floor(x % bpb) ? '.' + (Math.floor(x % bpb) + 1) : '');   // (Alt: on sixteenths – a beat with its share)
    return 'Schlag ' + fb(a + 1) + '–' + fb(b) + ' von ' + B + ' (ab Takt ' + bar(a) + ', ' + fb((b - a) / bpb) + ((b - a) === bpb ? ' Takt' : ' Takte') + ')'; }
  const T = hxLen(L); return dec((s.a * T).toFixed(2)) + '–' + dec((s.b * T).toFixed(2)) + ' s';
}
// the grid a stretch snaps to: a beat on the Takt, a sixteenth of a free loop
const hxEdStep = (L) => (hxTakt(L) ? 1 / Math.max(1, Math.round(L.d.beats)) : 1 / 16);
function hxEdWaveDrag(box) {
  // (a place of the pass under the pointer – in the view, zoomed or whole; px: its share of the drawn width)
  const px = (e) => { const r = HXE.cv.getBoundingClientRect(), L = hxEdL(); return clamp((e.clientX - r.left) / Math.max(1, r.width * hxEdWf(L)), 0, 1); };
  const at = (e) => { const [v0, v1] = HXE.zv || [0, 1]; return v0 + px(e) * (v1 - v0); };
  box.addEventListener('pointerdown', (e) => {
    const L = hxEdL(); if (!L || e.button > 0) return;
    e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (x) {} box.focus({ preventScroll: true });
    const r = HXE.cv.getBoundingClientRect();
    if (HXE.zv && e.clientY > r.bottom - 14) {   // (owner, 26.10.2026; again 30.10.2026: the bar under a zoomed view – dragged to the end of the take; a press beside its thumb centres it there)
      const [v0, v1] = HXE.zv, s = v1 - v0, u = px(e);
      if (u < v0 || u > v1) hxEdPan((u - (v0 + v1) / 2) / s);
      HXE.drag = { id: e.pointerId, bar: true, cx: e.clientX, v0: HXE.zv[0] }; HXE.wsig = ''; return;
    }
    HXE.drag = { id: e.pointerId, x0: at(e), cx: e.clientX, moved: false };
  });
  box.addEventListener('pointermove', (e) => {
    const D = HXE.drag, L = hxEdL(); if (!D || e.pointerId !== D.id || !L) return;
    if (D.bar) { if (!HXE.zv) return; const r = HXE.cv.getBoundingClientRect(), s = HXE.zv[1] - HXE.zv[0], n0 = clamp(D.v0 + (e.clientX - D.cx) / Math.max(1, r.width * hxEdWf(L)), 0, 1 - s); HXE.zv = [n0, n0 + s]; HXE.wsig = ''; return; }
    const x = at(e); if (Math.abs(e.clientX - D.cx) > 4) D.moved = true; if (!D.moved) return;
    const u = hxEdStep(L) / (e.altKey ? 4 : 1), a = Math.floor(Math.min(D.x0, x) / u + 1e-9) * u, b = Math.min(1, Math.ceil(Math.max(D.x0, x) / u - 1e-9) * u);   // (Alt: a sixteenth of a beat)
    HXE.sel = { a, b: Math.max(b, a + u) }; HXE.wsig = '';
  });
  // a click: it plays from there (owner, 26.10.2026) – inside the selection the selection stays, outside it goes
  const up = (e) => {
    const D = HXE.drag; if (!D || e.pointerId !== D.id) return; HXE.drag = null;
    if (D.bar) return;
    if (D.moved) { hxEdRender(); return; }
    const had = !!HXE.sel; if (HXE.sel && (D.x0 < HXE.sel.a || D.x0 >= HXE.sel.b)) HXE.sel = null;
    hxPvPlay(D.x0); HXE.wsig = '';
    if (had !== !!HXE.sel) hxEdRender();
  };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', (e) => { const D = HXE.drag; if (D && e.pointerId === D.id) { HXE.drag = null; hxEdRender(); } });
  // Strg+Mausrad: zoom around the pointer; Umschalt+Mausrad (or sideways): move the view
  box.addEventListener('wheel', (e) => {
    if (!hxEdL()) return;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); hxEdZoom(Math.exp(clamp(e.deltaY, -200, 200) * 0.004), at(e)); }
    else if (HXE.zv && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) { e.preventDefault(); hxEdPan(((e.shiftKey ? e.deltaY : 0) + e.deltaX) / Math.max(200, box.clientWidth)); }
  }, { passive: false });
}
function hxEdTrimSel(L) {
  const s = HXE.sel; if (!s) return;
  const cur = L.trim || { f: 1, a: 0 }, a0 = hxTrA(cur), a = a0 + s.a * cur.f, f = (s.b - s.a) * cur.f;
  if (hxBandTrimTo(L, a, f)) { HXE.sel = null; hxEdRender(); }
}
// the peaks of the loop as it plays a pass: every audible Schicht's window (its own level), summed per column – min, max
function hxEdPeaks(L, W, only) {
  const sch = (only ? [only] : L.sch.map((id) => HX.sch.get(id))).filter((S) => S && S.aud && (only || !S.mute));
  const mn = new Float32Array(W), mx = new Float32Array(W);
  for (const S of sch) {
    const g = only ? 1 : S.gain, n = S.len, step = n / W;
    for (let x = 0; x < W; x++) {
      let lo = 0, hi = 0; const i0 = Math.floor(x * step), i1 = Math.max(i0 + 1, Math.floor((x + 1) * step)), st = Math.max(1, Math.floor((i1 - i0) / 64));
      for (let i = i0; i < i1; i += st) { const f = S.pre + i, c = S.aud[Math.floor(f / HX_CH)]; if (!c) continue; const j = f % HX_CH, v = 0.5 * (c[0][j] + c[1][j]) * g; if (v < lo) lo = v; else if (v > hi) hi = v; }
      mn[x] += lo; mx[x] += hi;
    }
  }
  return { mn, mx };
}
// a Schicht's level or mute as a step of its own (a slider: one step per drag)
function hxEdSchStep(S, from, to, label) {
  const k = S.key, L = HX.loops.get(S.loop); if (!L || (from.gain != null && Math.abs(from.gain - to.gain) < 1e-6)) return;
  const put = (o) => { const X = hxSchByKey(k); if (X) hxSchLevel(X, o.gain != null ? o.gain : null, o.mute != null ? o.mute : null); };
  hxHist({ kind: 'schicht', label: hxName(L) + ': ' + label, undo() { put(from); }, redo() { put(to); } });
}
// (owner, 26.10.2026: „die Wellenform ändert sich nie – eine exakte Darstellung jederzeit“) what a pass sounds like now,
// rendered offline by the loop's own processor: every audible Schicht in the version it plays (Abdruck dry or baked,
// its Wuchs render, its anchor) with its level, the tape's speed, the slices (Weglassen, Tauschen, Schnitt), Verblassen
// and Abrieb – three passes, the third drawn (with the Ausklang of the one before, as it sounds); a loop longer than
// 20 s two (its render's time and memory). The pass drawn is kept as a buffer: Vorhören plays it
async function hxEdRenderPass(L, W) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter((S) => S && !S.mute);
  const ver = (S) => (S.play === 'wu' && S.wu && S.wu.aud ? { ch: S.wu.aud, n: S.wu.n, pre: S.wu.pre || 0, len: S.wu.len, aus: S.wu.rev ? null : { off: S.wu.len, len: Math.max(0, S.wu.n - S.wu.len), fade: 0 }, join: S.wu.rev ? 'xf' : 'ola', kc: 0 }
    : S.play === 'anc' && S.anc && S.anc.aud ? { ch: S.anc.aud, n: S.anc.n, pre: S.anc.pre || 0, len: S.anc.len, aus: { off: S.anc.len, len: Math.max(0, S.anc.n - S.anc.len), fade: 0 }, join: 'ola', kc: 0 }
      : S.aud ? { ch: S.baked && S.bak ? S.bak : S.aud, n: S.n, pre: S.pre, len: S.len, aus: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, join: S.join, kc: (S.baked ? S.kcB : S.kc) || 0 } : null);
  const vs = sch.map(ver); if (!sch.length || vs.some((v) => !v)) return null;
  // (26.10.2026: the pass as it will be – a change waits for the next seam, the pass now may still be the old one's length)
  const Lf = Math.max(128, Math.round(hxTakt(L) ? (L.d.beats * 60 * SR) / tgBpm(hxNowT()) : L.d.L)), N = Lf > 20 * SR ? 2 : 3;
  const ctx = new OfflineAudioContext(2, Lf * N, SR);
  if (!(await ensureDSP(ctx))) return null;
  const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gain: 1 } }];
  sch.forEach((S, i) => { const v = vs[i]; msgs.push({ schicht: { loop: 1, id: i + 1, chunks: v.ch, n: v.n, pre: v.pre, len: v.len, ausklang: v.aus, gain: S.gain, join: v.join, X: S.X || Math.round(0.01 * SR), rho: S.rho || 0, zo: S.zo || 0, kc: v.kc, fin: 0 } }); });
  if ((L.sp || 1) !== 1) msgs.push({ band: { loop: 1, vs: L.sp, T: 1, f: 0 } });
  if (L.vb != null && L.vb < 1) msgs.push({ vb: sch.map((S, i) => ({ schicht: i + 1, fb: L.vb })) });
  if (L.ab && L.ab.rate > 0) msgs.push({ abr: sch.map((S, i) => ({ schicht: i + 1, rate: L.ab.rate, seed: L.ab.seed })) });
  const sl = hxBandSliceOf(L); if (sl) msgs.push({ slice: Object.assign({}, sl, { loop: 1 }) });
  const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: HX_CH, msgs } });
  node.connect(ctx.destination, 0); node.connect(ctx.destination, 1);
  const buf = await ctx.startRendering(), a = buf.getChannelData(0), b = buf.getChannelData(1), o = (N - 1) * Lf;
  const mn = new Float32Array(W), mx = new Float32Array(W);
  for (let x = 0; x < W; x++) { const i0 = o + Math.floor((x * Lf) / W), i1 = o + Math.max(Math.floor(((x + 1) * Lf) / W), Math.floor((x * Lf) / W) + 1); let lo = 0, hi = 0; for (let i = i0; i < i1; i++) { const v = 0.5 * (a[i] + b[i]); if (v < lo) lo = v; else if (v > hi) hi = v; } mn[x] = lo; mx[x] = hi; }
  const pb = new AudioBuffer({ numberOfChannels: 2, length: Lf, sampleRate: SR }); pb.copyToChannel(a.subarray(o, o + Lf), 0); pb.copyToChannel(b.subarray(o, o + Lf), 1);
  return { mn, mx, buf: pb };
}
// one render at a time, a moment after the last change; a render overtaken by a change is thrown away
function hxEdRenderKick(L) {
  const sig = HXE.rsig; if (HXE.rw && HXE.rw.sig === sig) return;
  if (HXE.rBusy) { HXE.rAgain = true; return; }
  clearTimeout(HXE.rT);
  HXE.rT = setTimeout(async () => {
    const X = hxEdL(); if (!X || HXE.rsig !== sig) return;
    HXE.rBusy = true;
    let r = null; try { r = await hxEdRenderPass(X, HXE_W); } catch (e) { console.warn('Hexenring: the editor render failed', e); }
    HXE.rBusy = false;
    if (r && HXE.rsig === sig) { HXE.rw = Object.assign(r, { sig }); HXE.wsig = ''; } else if (!r && HXE.rsig === sig) HXE.rw = { sig, none: true };
    if (HXE.rAgain) { HXE.rAgain = false; const Y = hxEdL(); if (Y) hxEdRenderKick(Y); }
  }, 220);
}
// (owner, 26.10.2026: the waveform as it sounds – also how long) the canvas's width is the longer of the loop now and at
// ×1: the whole tape faster leaves the loop that much shorter – the rest of the width stays empty, its ×1 length marked
const hxEdWf = (L) => (L ? Math.min(1, 1 / (L.sp || 1)) : 1);
function hxEdWave(force) {
  const L = hxEdL(), cv = HXE.cv; if (!L || !cv || !cv.isConnected) return;
  const w = cv.clientWidth, hh = cv.clientHeight; if (!w || !hh) return;
  const ws = HXE.rsig + '|' + L.state + '|' + (HXE.rw ? HXE.rw.sig : '') + '|' + w + 'x' + hh + '|' + JSON.stringify(HXE.sel || 0) + '|' + JSON.stringify(HXE.zv || 0) + '|' + JSON.stringify(HXE.mark || 0) + '|' + (HX.take ? HX.take.st + HX.take.a : '');
  if (force || ws !== HXE.wsig || !HXE.bg) {   // the still layer: grid, waveform, notes, the selection
    HXE.wsig = ws;
    const raw = hxEdPeaks(L, HXE_W), rd = HXE.rw && HXE.rw.sig === HXE.rsig && !HXE.rw.none ? HXE.rw : null, W = HXE_W;
    // (owner, 26.10.2026: long loops) the view: a share [v0, v1) of the pass – zoomed, its peaks from the rendered pass
    const [v0, v1] = HXE.zv || [0, 1], vs = v1 - v0;
    const pk = !HXE.zv ? rd || raw : rd && rd.buf ? hxEdPkBuf(rd.buf, v0, v1, W) : (() => { const q = rd || raw, mn = new Float32Array(W), mx = new Float32Array(W); for (let x = 0; x < W; x++) { const i = Math.min(W - 1, Math.floor((v0 + (x / W) * vs) * W)); mn[x] = q.mn[i]; mx[x] = q.mx[i]; } return { mn, mx }; })();
    hxEdRenderKick(L);
    const bg = HXE.bg || (HXE.bg = document.createElement('canvas')), c = mxFit(bg, w, hh, 0, Math.min(2, devicePixelRatio || 1));
    c.clearRect(0, 0, w, hh); c.fillStyle = '#120e0b'; c.fillRect(0, 0, w, hh);
    const tk = hxTakt(L), B = tk ? Math.round(L.d.beats) : 16, bpb = L.bpb || 4;
    const wf = hxEdWf(L), ww = w * wf, sp = L.sp || 1, X = (u) => ((u - v0) / vs) * ww;
    if (wf < 1) { c.fillStyle = 'rgba(168,152,138,.07)'; c.fillRect(ww, 0, w - ww, hh); c.fillStyle = HXC.dim; c.font = '400 11px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Band ' + (HX_SP.find((x) => Math.abs(x[0] - sp) < 1e-6) || [0, '×' + sp])[1] + ': die Schleife ist ' + (sp === 2 ? 'halb so lang' : 'kürzer'), ww + (w - ww) / 2, hh / 2); }
    else if (sp < 1 && X(sp) <= w) { const xm = Math.round(X(sp)) + 0.5; c.strokeStyle = 'rgba(240,230,216,.35)'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(xm, 0); c.lineTo(xm, hh); c.stroke(); c.setLineDash([]); c.fillStyle = HXC.dim; c.font = '400 10px ' + COL.fontNum; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('Länge bei ×1', xm + 4, hh - 3); }
    const sub = tk && (ww / vs / B) > 48 ? 4 : 1;   // (zoomed in far: the sixteenths too)
    for (let q = 0; q <= B * sub; q++) {
      const u = q / (B * sub); if (u < v0 - 1e-9 || u > v1 + 1e-9) continue;
      const b = q / sub, x = Math.round(X(u) * (ww - 1) / ww) + 0.5, one = tk && q % (bpb * sub) === 0, beat = q % sub === 0;
      c.strokeStyle = one ? 'rgba(255,179,92,.45)' : beat ? 'rgba(240,230,216,.08)' : 'rgba(240,230,216,.04)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, one ? 0 : beat ? 14 : 24); c.lineTo(x, hh); c.stroke();
      if (one && b < B) { c.fillStyle = 'rgba(255,179,92,.85)'; c.font = '500 10px ' + COL.fontNum; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(String(b / bpb + 1), x + 3, 2); }
    }
    if (HXE.sel) { const xa = X(HXE.sel.a), xb = X(HXE.sel.b); c.fillStyle = 'rgba(134,240,208,.16)'; c.fillRect(xa, 0, xb - xa, hh); c.strokeStyle = 'rgba(134,240,208,.7)'; c.strokeRect(xa + 0.5, 0.5, xb - xa - 1, hh - 1); }
    // (28.10.2026, Direkt) the stretch kept for Tauschen/Einsetzen – dashed spore; the one armed for Einspielen – rec red
    if (HXE.mark && HXE.mark.key === HXE.key) { const xa = X(HXE.mark.a), xb = X(HXE.mark.b); c.save(); c.setLineDash([5, 4]); c.strokeStyle = HXC.spore; c.lineWidth = 1.5; c.strokeRect(xa + 1, 1.5, xb - xa - 2, hh - 3); c.restore(); }
    if (HX.take && HX.take.key === HXE.key) { const xa = X(HX.take.a), xb = X(HX.take.b); c.fillStyle = HX.take.st === 'nimmt' ? 'rgba(255,91,77,.22)' : 'rgba(255,91,77,.1)'; c.fillRect(xa, 0, xb - xa, hh); c.strokeStyle = HXC.rec; c.strokeRect(xa + 0.5, 0.5, xb - xa - 1, hh - 1); }
    if (!L.sch.some((id) => { const S = HX.sch.get(id); return S && S.aud; })) { c.fillStyle = HXC.dim; c.font = '400 12px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Die Schleife wird noch fertig eingefangen …', w / 2, hh / 2); }
    // the scale: the recording's own peak – so quieter (Verblassen, a Schicht down) or emptier (gaps) shows as such
    let m = 1e-4; const whole = rd || raw; for (let x = 0; x < W; x++) m = Math.max(m, -raw.mn[x], raw.mx[x], -whole.mn[x], whole.mx[x]);   // (the whole pass's: zooming keeps the scale)
    const yc = hh * 0.55, amp = (hh * 0.42) / Math.max(m, 0.05);
    if (!rd) { c.fillStyle = HXC.dim; c.font = '400 10px ' + COL.fontNum; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('Klang wird berechnet …', w - 6, 3); }
    c.fillStyle = L.state === 'spielt' ? 'rgba(233,163,94,.85)' : 'rgba(168,152,138,.7)';
    for (let x = 0; x < W; x++) { const xc = (x / W) * ww, y0 = yc - pk.mx[x] * amp, y1 = yc - pk.mn[x] * amp; c.fillRect(xc, y0, Math.max(1, ww / W), Math.max(1, y1 - y0)); }
    // the notes: where they sound, how high (the loop's own range), how long – reshaped by the notes' tools: the notes it
    // plays now bright, the ones played faint behind them (owner, 26.10.2026: „Stufe −1, Krebs, dünner – keine Wirkung?“)
    const D = Math.max(0.05, hxLen(L)), mk = hxEdNtMarks(L);
    const bar = (n, D0) => { const x = X(n.ph), y = 16 + (1 - (n.r != null ? n.r : 0.5)) * (hh - 30), len = Math.max(3, ((n.d || 0.1) / D0 / vs) * ww); if (x + len >= 0 && x <= ww) c.fillRect(x, y - 1.5, len, 3); };
    if (mk) { c.fillStyle = 'rgba(134,240,208,.22)'; for (const n of mk.was) bar(n, 1); c.fillStyle = 'rgba(134,240,208,.9)'; for (const n of mk.now) bar(n, 1); }
    else { c.fillStyle = 'rgba(134,240,208,.85)'; for (const n of L.notes) bar(n, D); }
    if (HXE.zv) { c.fillStyle = 'rgba(240,230,216,.12)'; c.fillRect(0, hh - 8, ww, 8); c.fillStyle = 'rgba(240,230,216,.6)'; c.beginPath(); const bw = Math.max(10, vs * ww), bx = Math.min(v0 * ww, ww - bw); if (c.roundRect) c.roundRect(bx, hh - 7, bw, 6, 3); else c.rect(bx, hh - 7, bw, 6); c.fill(); }   // (where the view is in the whole – drag it)
  }
  const c = mxFit(cv, w, hh, 0, Math.min(2, devicePixelRatio || 1));
  c.clearRect(0, 0, w, hh); c.drawImage(HXE.bg, 0, 0, w, hh);
  const [v0, v1] = HXE.zv || [0, 1], ww = w * hxEdWf(L), X = (u) => Math.round(((u - v0) / (v1 - v0)) * (ww - 1)) + 0.5;
  // one playhead at a time (owner, 26.10.2026: two heads – which one plays?): while the editor plays, only its own (the
  // loop is silent meanwhile); else the loop's, and the mark where ▶ starts as a small triangle on top, no line
  if (!HXE.pv && L.state !== 'angehalten' && A.ctx) { const x = X(hxPhase(L, heardT())); if (x >= 0 && x <= ww) { c.strokeStyle = L.state === 'spielt' ? HXC.hypha : HXC.dim; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); } }
  const pu = hxPvPos(), xp = X(pu);
  if (xp >= 0 && xp <= ww) {
    if (HXE.pv) { c.strokeStyle = '#f6efe4'; c.lineWidth = 2; c.beginPath(); c.moveTo(xp, 0); c.lineTo(xp, hh); c.stroke(); c.fillStyle = '#f6efe4'; c.beginPath(); c.moveTo(xp - 5, 0); c.lineTo(xp + 5, 0); c.lineTo(xp, 7); c.closePath(); c.fill(); }
    else if (pu > 0) { c.fillStyle = 'rgba(246,239,228,.75)'; c.beginPath(); c.moveTo(xp - 4, 0); c.lineTo(xp + 4, 0); c.lineTo(xp, 6); c.closePath(); c.fill(); }
  }
}
// the notes a loop plays when its notes' tools reshape them (Stufen, dünner, dichter, Krebs, Umkehrung, Groove): place,
// height on one scale with the notes as played, length – shares of the pass (null: it plays them as played)
function hxEdNtMarks(L) {
  if (!hxNtOn(L)) return null;
  const S = L.sch.map((id) => HX.sch.get(id)).find((x) => hxWCan(x)); if (!S) return null;
  const W = hxWNotesT(L, S); if (!W || !W.n) return null;
  const U = Math.max(1e-6, W.len || 1), fs = W.n.concat(S.wn.n).map((n) => Math.log2(n.f)).filter(Number.isFinite), lo = Math.min(...fs), hi = Math.max(...fs);
  const one = (n) => { const d = n.d != null ? Math.max(0, n.d) / U : 0.02; let ph = (((n.t % U) + U) % U) / U; if (L.rev) ph = clamp(1 - ph - Math.min(d, 1), 0, 0.9999); return { ph, d, r: hi > lo ? (Math.log2(n.f) - lo) / (hi - lo) : 0.5 }; };
  return { now: W.n.map(one), was: S.wn.n.map(one) };
}
function hxEdMini(cv) {
  const S = cv.hxS, L = hxEdL(); if (!S || !L) return;
  const w = cv.clientWidth, hh = cv.clientHeight; if (!w || !hh) return;
  const c = mxFit(cv, w, hh, 0, Math.min(2, devicePixelRatio || 1));
  c.clearRect(0, 0, w, hh); c.fillStyle = '#120e0b'; c.fillRect(0, 0, w, hh);
  if (!S.aud) { c.fillStyle = HXC.dim; c.font = '400 10px ' + COL.fontNum; c.textBaseline = 'middle'; c.fillText('wird aufgenommen …', 6, hh / 2); return; }
  const W = Math.min(400, Math.round(w)), pk = hxEdPeaks(L, W, S); let m = 1e-4; for (let x = 0; x < W; x++) m = Math.max(m, -pk.mn[x], pk.mx[x]);
  const amp = (hh * 0.45) / Math.max(m, 0.05); c.fillStyle = S.mute ? 'rgba(168,152,138,.45)' : 'rgba(233,163,94,.8)';
  for (let x = 0; x < W; x++) { const y0 = hh / 2 - pk.mx[x] * amp, y1 = hh / 2 - pk.mn[x] * amp; c.fillRect((x / W) * w, y0, Math.max(1, w / W), Math.max(1, y1 - y0)); }
}
// every frame while open: rebuilt when the loop changed (never under a dragged slider), the playhead
function hxEdFrame() {
  if (!HXE.ed || HXE.ed.hidden) return;
  const L = hxEdL(); if (!L) { hxEdClose(); return; }
  const a = document.activeElement, busy = HXE.drag || (a && a.type === 'range' && HXE.ed.contains(a) && (a.matches(':active')));
  if (!busy && hxEdSig(L) !== HXE.sig) hxEdRender();
  hxEdWave(false);
  hxPvFrame(L);
  if (HXE.waitEl) {   // (26.10.2026) what still waits: the notes played anew, a new length or a swap at the next seam
    const now = hxNowT(), f = L.prev ? L.prev.until : null, p = HX.pend.find((x) => x.loop === L.id && x.kind === 'band'), sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean), sw = sch.reduce((m, S) => (S.swapF != null && hxT(S.swapF) > now + 0.15 ? Math.max(m, hxT(S.swapF)) : m), 0);
    const t = f != null ? hxT(f) : p ? p.t : sw || null, s = t != null ? Math.max(0, Math.ceil(t - now)) : null, busy = sch.some((S) => S.wBusy);
    const tx = busy ? 'Die Noten werden neu gespielt … gleich zu hören.' : s != null ? (HXE.pv ? 'Beim Vorhören schon zu hören – in der laufenden Schleife ab der nächsten Naht, in ' : 'Das Bild zeigt schon den neuen Stand – zu hören ab der nächsten Naht, in ') + s + ' s.' : '';
    if (HXE.waitEl.textContent !== tx) HXE.waitEl.textContent = tx;
  }
}
