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
    box.append(h('div', { class: 'hx-cm-h' }, hxName(L) + (hxEngName(L) ? ' · ' + hxEngName(L) : '') + ' · ' + hxLenText(L)));
    it('Ansehen und bearbeiten …', () => hxEdOpen(L), { key: '⇧' + (slot + 1), tip: 'Wellenform, Noten und Schichten ansehen; schneiden, Band, Zeit und Noten bearbeiten.' });
    it('Karte – alle Einstellungen', () => hxCardOpen(slot), { tip: 'Die Karte der Schleife im Aufnahme-Panel.' });
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
  HXE.key = L.key; HXE.sel = null; HXE.sig = ''; HXE.wsig = '';
  HXE.ed.hidden = false; hxEdPlace(); hxEdRender();
  HXE.ed.querySelector('.hx-ed-x').focus({ preventScroll: true });
  hxSay(hxName(L) + ': bearbeiten');
}
function hxEdClose() { if (!HXE.ed || HXE.ed.hidden) return; HXE.ed.hidden = true; HXE.key = null; HXE.drag = null; }
function hxEdBuild() {
  const ed = HXE.ed = h('section', { class: 'hx-ed', role: 'dialog', 'aria-label': 'Schleife bearbeiten', hidden: true });
  ed.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hxEdClose(); } });
  document.body.append(ed);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ed.hidden && !HXE.menu && !(MX.open && MX.detailK)) { e.preventDefault(); e.stopPropagation(); hxEdClose(); } }, true);   // (wherever the focus is)
  window.addEventListener('resize', () => { if (!ed.hidden) { hxEdPlace(); HXE.wsig = ''; } });
  hxBlitzOn(ed);
}
// over the field (its column), never over the rail: you still play and the rings still answer
function hxEdPlace() {
  const st = typeof stage !== 'undefined' && stage.getBoundingClientRect(), ed = HXE.ed; if (!st || !ed) return;
  const m = st.width < 700 ? 6 : 14;
  ed.style.left = Math.round(st.left + m) + 'px'; ed.style.top = Math.round(st.top + m) + 'px';
  ed.style.width = Math.round(st.width - 2 * m) + 'px'; ed.style.maxHeight = Math.round(st.height - 2 * m) + 'px';
}
// what the editor shows depends on: rebuilt when it changes (a frame compares it), the playhead drawn every frame
// (the ↶ ↷ buttons follow the history: it is part of what is shown, not of what is rendered)
const hxEdSig = (L) => hxEdRSig(L) + '|' + HX.hist.length + ':' + HX.redo.length + ':' + HX.pend.length + ':' + !!L.prev;
function hxEdRSig(L) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
  return [L.key, L.state, L.d.beats, L.d.L, L.bpb, L.sp || 1, !!L.rev, JSON.stringify(L.trim || 0), L.dbl || 1, HX.fokus === L.id, HX.solo ? HX.solo.id : 0, JSON.stringify(L.nt || 0), JSON.stringify(L.slc || 0), L.vb, JSON.stringify(L.ab || 0), L.notes.length,   // (26.10.2026: Lücken – its chips lit only after another change)
   
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
  const head = h('div', { class: 'hx-ed-h' },
    h('div', { class: 'hx-ed-t' }, h('h3', null, hxName(L)), h('span', { class: 'meta' }, [hxEngName(L), hxLenText(L), bpm, { spielt: 'spielt', stumm: 'stumm', angehalten: 'angehalten' }[L.state] || L.state, HX.fokus === L.id ? 'Fokus' : ''].filter(Boolean).join(' · '))),
    h('div', { class: 'hx-ed-hb' },
      loops.length > 1 ? btn('‹', () => go(-1), 'Vorige Schleife', 'ghost') : null, loops.length > 1 ? btn('›', () => go(1), 'Nächste Schleife', 'ghost') : null,
      (() => { const u = btn('↶', hxUndoStep, HX.hist.length ? 'Rückgängig: ' + HX.hist[HX.hist.length - 1].label + ' (Strg+Z)' : 'Nichts rückgängig zu machen', 'ghost'); u.disabled = !HX.hist.length && !HX.pend.length; u.setAttribute('aria-label', 'Rückgängig'); return u; })(),
      (() => { const r = btn('↷', hxRedoStep, HX.redo.length ? 'Wiederholen: ' + HX.redo[HX.redo.length - 1].label + ' (Strg+Umschalt+Z)' : 'Nichts zu wiederholen', 'ghost'); r.disabled = !HX.redo.length; r.setAttribute('aria-label', 'Wiederholen'); return r; })(),
      btn('Grundeinstellung', () => hxDefaults(L), 'Alle Bearbeitungen zurück: Band ×1, vorwärts, ganz, keine Lücken, kein Verblassen, kein Abrieb, Noten wie gespielt – als ein Schritt (↶ holt sie zurück). Pegel, Balance und Schichten bleiben.', 'ghost'),
      btn('Karte', () => { hxEdClose(); hxCardOpen(L.slot); }, 'Die Karte mit allen Einstellungen dieser Schleife', 'ghost'),
      (() => { const x = btn('✕', hxEdClose, 'Schließen (Esc)', 'ghost hx-ed-x'); x.setAttribute('aria-label', 'Schließen'); return x; })()));
  // the waveform: drag over it to choose a stretch
  HXE.cv = h('canvas', { class: 'hx-ed-cv', role: 'img', 'aria-label': 'Wellenform von ' + hxName(L) + (tk ? ', ' + hxLenText(L) : '') });
  const wbox = h('div', { class: 'hx-ed-wave', title: 'Die Schleife, wie sie klingt. Türkise Striche: die gespielten Noten – wo sie liegen, wie hoch (oben hoch), wie lang. Ziehen wählt einen Teil (auf ganze Schläge).' }, HXE.cv);
  hxEdWaveDrag(wbox);
  const selTxt = HXE.sel ? hxEdSelText(L, HXE.sel) : '';
  // (26.10.2026) a change that waits for the next seam: the picture already shows it – when it is heard
  const wait = L.prev || HX.pend.some((p) => p.loop === L.id && p.kind === 'band');
  HXE.waitEl = wait ? h('span', { class: 'hx-ed-wait' }, '') : null;
  const selRow = h('div', { class: 'hx-ed-sel' },
    h('span', { class: 'hx-ms' }, HXE.sel ? 'Auswahl: ' + selTxt : L.trim ? 'Getrimmt – es spielt nur ein Teil der Aufnahme.' : 'Ziehe über die Wellenform, um einen Teil auszuwählen – dann lässt er sich allein bearbeiten.'),
    HXE.sel ? btn('Nur die Auswahl spielen', () => hxEdTrimSel(L), 'Die Schleife spielt ab der nächsten Naht nur diesen Teil (↶ macht es rückgängig). Den Teil bearbeiten: die Zeilen „Abschnitt bearbeiten“ darunter.', 'primary') : null,
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
  const sp = L.sp || 1, slc = L.slc || {}, nt = L.nt || {};
  const tools = [
    row('Band', 'Wie ein Tonband: langsamer und tiefer, schneller und höher, rückwärts, auslaufen, verdoppeln.', ...HX_SP.map(([v, t]) => chip(t, Math.abs(sp - v) < 1e-6, () => hxSpeed(L, v), 'Bandgeschwindigkeit ' + t)),
      chip('rückwärts', !!L.rev, () => hxRev(L), 'Rückwärts ab der Naht'), chip('Stopp', false, () => hxBandstopp([L]), 'Bandstopp: das Band läuft aus'), chip('Verdoppeln', false, () => hxDouble(L), 'Doppelt so lang durch Wiederholung')),
    row('Trimmen', 'Nur einen Teil spielen – oder oben einen Teil auswählen.', chip('½', !!(L.trim && L.trim.f === 0.5), () => hxBandTrim(L, 'h'), 'Die halbe Schleife'), chip('¼', !!(L.trim && L.trim.f === 0.25), () => hxBandTrim(L, 'v'), 'Ein Viertel'),
      L.trim ? chip('◀', false, () => hxBandTrim(L, '<'), 'Ausschnitt früher') : null, L.trim ? chip('▶', false, () => hxBandTrim(L, '>'), 'Ausschnitt später') : null, L.trim ? chip('ganz', false, () => hxBandTrim(L, 'ganz'), 'Wieder ganz') : null),
    row('Zeit', 'Die Schleife zeitlich verschieben oder Erkanntes korrigieren.', chip('−1 Schlag', false, () => hxNudge(L, -60 / tgBpm(hxNowT())), 'Einen Schlag früher'), chip('−5 ms', false, () => hxNudge(L, -0.005), 'Fein früher'),
      chip('+5 ms', false, () => hxNudge(L, 0.005), 'Fein später'), chip('+1 Schlag', false, () => hxNudge(L, 60 / tgBpm(hxNowT())), 'Einen Schlag später'),
      k.eins ? chip('Eins ←', false, () => hxKorr(L, 'e<'), 'Die Eins einen Schlag früher') : null, k.eins ? chip('Eins →', false, () => hxKorr(L, 'e>'), 'Die Eins einen Schlag später') : null,
      k.len && k.minus ? chip('Takt −1', false, () => hxKorr(L, 'l-'), 'Einen Takt kürzer') : null, k.len ? chip('Takt +1', false, () => hxKorr(L, 'l+'), 'Einen Takt länger') : null,
      k.tempo ? chip('Tempo ½', false, () => hxKorr(L, 'h2'), 'Halbes Tempo') : null, k.tempo ? chip('Tempo ×2', false, () => hxKorr(L, 'x2'), 'Doppeltes Tempo') : null),
    row('Weglassen', 'Lässt zufällig einige Anschläge weg.', ...HX_SLP.map(([v, t]) => chip(t, (slc.pd || 0) === v, () => hxSlcSet(L, 'pd', v), v ? 'Weglassen: ' + t + ' der Anschläge fallen weg' : 'Nichts weglassen'))),
    row('Tauschen', 'Vertauscht zufällig die Plätze einiger Anschläge.', ...HX_SLP.map(([v, t]) => chip(t, (slc.pw || 0) === v, () => hxSlcSet(L, 'pw', v), v ? 'Tauschen: ' + t + ' der Anschläge tauschen den Platz' : 'Nichts tauschen')),
      slc.pd || slc.pw ? chip('neu würfeln', false, () => hxSlcSet(L, 'neu'), 'Andere Anschläge weglassen oder tauschen') : null),
    row('Altern', 'Leiser werden oder sich abnutzen wie ein Tonband.', ...HX_VB.map(([v, t]) => chip('verblassen ' + t, (L.vb != null ? L.vb : 1) === v, () => hxVbSet(L, v), v < 1 ? 'Verblassen ' + t + ': jede Schicht pro Durchgang leiser' : 'Nicht verblassen')),
      ...HX_ABR.map(([v, t]) => chip('Abrieb ' + t, ((L.ab && L.ab.rate) || 0) === v, () => hxAbSet(L, v), v ? 'Abrieb ' + t + ': das Band nutzt sich an denselben Stellen ab' : 'Kein Abrieb'))),
    notes ? row('Noten', 'Die Noten umformen (die Schleife spielt sie neu).', chip('Stufe −1', false, () => hxNtSet(L, 'tr', -1), 'Eine Stufe tiefer in der Tonart'), chip('Stufe +1', false, () => hxNtSet(L, 'tr', 1), 'Eine Stufe höher'),
      chip('dünner', (nt.dens || 0) < 0, () => hxNtSet(L, 'dens', -1), 'Die schwächsten Töne weg'), chip('dichter', (nt.dens || 0) > 0, () => hxNtSet(L, 'dens', 1), 'Durchgangstöne dazu'),
      chip('Krebs', !!nt.krebs, () => hxNtSet(L, 'krebs'), 'Rückwärts gespielt'), chip('Umkehrung', !!nt.umk, () => hxNtSet(L, 'umk'), 'Gespiegelt in der Tonleiter'), hxNtOn(L) ? chip('wie gespielt', false, () => hxNtSet(L, 'zurueck'), 'Die Noten wie gespielt') : null) : null,
  ].filter(Boolean);
  const foot = h('div', { class: 'hx-ed-foot' }, audible > 1 ? btn('Schichten zusammenlegen', () => hxMerge(L), 'Alle hörbaren Schichten zu einer – spart Rechenzeit und Speicher') : null,
    btn('Als Aufnahme (WAV)', () => hxExportTake(L), 'Ein Durchgang als Aufnahme'), notes ? btn('MIDI', () => hxExportMidi(L), 'Die Noten als MIDI-Datei') : null,
    btn('Löschen', () => { hxDelete(L); hxEdClose(); }, 'Die Schleife löschen (↶ holt sie zurück)', 'ghost danger'));
  // (owner, 26.10.2026) a stretch chosen: its own tools – they change only that part (written into the audio, ↶ back)
  let part = null;
  if (HXE.sel) {
    const s = HXE.sel, go = (op, v) => () => { hxRegionEdit(L, s.a, s.b, op, v); }, act = (t, op, v, tip) => chip(t, false, go(op, v), tip);
    part = h('div', { class: 'hx-ed-sec hx-ed-part' }, h('div', { class: 'hx-ed-st' }, 'Abschnitt bearbeiten – ' + hxRxName(L, s.a, s.b) + ' (nur dieser Teil; der Rest bleibt)'),
      row('Band', 'Der Abschnitt wie ein Tonband langsamer oder schneller – er behält seine Länge: ×2 spielt ihn zweimal, ½ seine erste Hälfte langsam.', ...HX_SP.filter(([v]) => v !== 1).map(([v, t]) => act(t, 'band', v, 'Abschnitt mit Band ' + t)), act('rückwärts', 'rev', 0, 'Den Abschnitt rückwärts')),
      row('Weglassen', 'Lässt Anschläge in diesem Abschnitt weg.', ...HX_SLP.filter(([v]) => v).map(([v, t]) => act(t, 'weg', v, 'Im Abschnitt ' + t + ' der Anschläge weglassen'))),
      row('Tauschen', 'Vertauscht Anschläge in diesem Abschnitt.', ...HX_SLP.filter(([v]) => v).map(([v, t]) => act(t, 'tausch', v, 'Im Abschnitt ' + t + ' der Anschläge tauschen'))),
      row('Pegel', 'Der Abschnitt lauter, leiser oder still.', act('stumm', 'gain', 0, 'Den Abschnitt still'), act('−6 dB', 'gain', dbToGain(-6), 'Leiser'), act('−3 dB', 'gain', dbToGain(-3), 'Etwas leiser'), act('+3 dB', 'gain', dbToGain(3), 'Etwas lauter'), act('+6 dB', 'gain', dbToGain(6), 'Lauter')),
      h('p', { class: 'note' }, 'Jeder Klick ist ein Schritt – ↶ nimmt ihn zurück. Die Auswahl bleibt, du kannst weiter darauf arbeiten oder einen anderen Teil wählen.'));
  }
  ed.replaceChildren(head, wbox, ...(HXE.waitEl ? [HXE.waitEl] : []), selRow, ...(part ? [part] : []), h('div', { class: 'hx-ed-sec' }, h('div', { class: 'hx-ed-st' }, sch.length === 1 ? 'Schicht' : sch.length + ' Schichten'), ...schRows), h('div', { class: 'hx-ed-sec' }, h('div', { class: 'hx-ed-st' }, HXE.sel ? 'Ganze Schleife' : 'Bearbeiten'), ...tools), foot);
  HXE.wsig = '';
  requestAnimationFrame(() => { hxEdWave(true); for (const c of ed.querySelectorAll('.hx-ed-mini')) hxEdMini(c); });
}
// the selection's words: beats and bars of a Takt loop, seconds of a free one
function hxEdSelText(L, s) {
  if (hxTakt(L)) { const B = L.d.beats, bpb = L.bpb || 4, a = Math.round(s.a * B), b = Math.round(s.b * B), bar = (x) => Math.floor(x / bpb) + 1 + (x % bpb ? '.' + ((x % bpb) + 1) : '');
    return 'Schlag ' + (a + 1) + '–' + b + ' von ' + B + ' (ab Takt ' + bar(a) + ', ' + dec(+((b - a) / bpb).toFixed(2)) + ((b - a) === bpb ? ' Takt' : ' Takte') + ')'; }
  const T = hxLen(L); return dec((s.a * T).toFixed(2)) + '–' + dec((s.b * T).toFixed(2)) + ' s';
}
// the grid a stretch snaps to: a beat on the Takt, a sixteenth of a free loop
const hxEdStep = (L) => (hxTakt(L) ? 1 / Math.max(1, Math.round(L.d.beats)) : 1 / 16);
function hxEdWaveDrag(box) {
  const at = (e) => { const r = HXE.cv.getBoundingClientRect(), L = hxEdL(); return clamp((e.clientX - r.left) / Math.max(1, r.width * hxEdWf(L)), 0, 1); };
  box.addEventListener('pointerdown', (e) => {
    const L = hxEdL(); if (!L || e.button > 0) return;
    e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (x) {}
    HXE.drag = { id: e.pointerId, x0: at(e), moved: false };
  });
  box.addEventListener('pointermove', (e) => {
    const D = HXE.drag, L = hxEdL(); if (!D || e.pointerId !== D.id || !L) return;
    const x = at(e); if (Math.abs(x - D.x0) > 0.004) D.moved = true; if (!D.moved) return;
    const u = hxEdStep(L), a = Math.floor(Math.min(D.x0, x) / u + 1e-9) * u, b = Math.min(1, Math.ceil(Math.max(D.x0, x) / u - 1e-9) * u);
    HXE.sel = { a, b: Math.max(b, a + u) }; HXE.wsig = '';
  });
  const up = (e) => { const D = HXE.drag; if (!D || e.pointerId !== D.id) return; HXE.drag = null; if (!D.moved) HXE.sel = null; hxEdRender(); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
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
// and Abrieb – three passes, the third drawn (with the Ausklang of the one before, as it sounds)
async function hxEdRenderPass(L, W) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter((S) => S && !S.mute);
  const ver = (S) => (S.play === 'wu' && S.wu && S.wu.aud ? { ch: S.wu.aud, n: S.wu.n, pre: S.wu.pre || 0, len: S.wu.len, aus: S.wu.rev ? null : { off: S.wu.len, len: Math.max(0, S.wu.n - S.wu.len), fade: 0 }, join: S.wu.rev ? 'xf' : 'ola', kc: 0 }
    : S.play === 'anc' && S.anc && S.anc.aud ? { ch: S.anc.aud, n: S.anc.n, pre: S.anc.pre || 0, len: S.anc.len, aus: { off: S.anc.len, len: Math.max(0, S.anc.n - S.anc.len), fade: 0 }, join: 'ola', kc: 0 }
      : S.aud ? { ch: S.baked && S.bak ? S.bak : S.aud, n: S.n, pre: S.pre, len: S.len, aus: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, join: S.join, kc: (S.baked ? S.kcB : S.kc) || 0 } : null);
  const vs = sch.map(ver); if (!sch.length || vs.some((v) => !v)) return null;
  // (26.10.2026: the pass as it will be – a change waits for the next seam, the pass now may still be the old one's length)
  const Lf = Math.max(128, Math.round(hxTakt(L) ? (L.d.beats * 60 * SR) / tgBpm(hxNowT()) : L.d.L)), N = 3;
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
  return { mn, mx };
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
  const ws = HXE.rsig + '|' + (HXE.rw ? HXE.rw.sig : '') + '|' + w + 'x' + hh + '|' + JSON.stringify(HXE.sel || 0);
  if (force || ws !== HXE.wsig || !HXE.bg) {   // the still layer: grid, waveform, notes, the selection
    HXE.wsig = ws;
    const raw = hxEdPeaks(L, HXE_W), rd = HXE.rw && HXE.rw.sig === HXE.rsig && !HXE.rw.none ? HXE.rw : null, pk = rd || raw, W = HXE_W;
    hxEdRenderKick(L);
    const bg = HXE.bg || (HXE.bg = document.createElement('canvas')), c = mxFit(bg, w, hh, 0, Math.min(2, devicePixelRatio || 1));
    c.clearRect(0, 0, w, hh); c.fillStyle = '#120e0b'; c.fillRect(0, 0, w, hh);
    const tk = hxTakt(L), B = tk ? Math.round(L.d.beats) : 16, bpb = L.bpb || 4;
    const wf = hxEdWf(L), ww = w * wf, sp = L.sp || 1;
    if (wf < 1) { c.fillStyle = 'rgba(168,152,138,.07)'; c.fillRect(ww, 0, w - ww, hh); c.fillStyle = HXC.dim; c.font = '400 11px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Band ' + (HX_SP.find((x) => Math.abs(x[0] - sp) < 1e-6) || [0, '×' + sp])[1] + ': die Schleife ist ' + (sp === 2 ? 'halb so lang' : 'kürzer'), ww + (w - ww) / 2, hh / 2); }
    else if (sp < 1) { const xm = Math.round(sp * w) + 0.5; c.strokeStyle = 'rgba(240,230,216,.35)'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(xm, 0); c.lineTo(xm, hh); c.stroke(); c.setLineDash([]); c.fillStyle = HXC.dim; c.font = '400 10px ' + COL.fontNum; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('Länge bei ×1', xm + 4, hh - 3); }
    for (let b = 0; b <= B; b++) {
      const x = Math.round((b / B) * (ww - 1)) + 0.5, one = tk && b % bpb === 0;
      c.strokeStyle = one ? 'rgba(255,179,92,.45)' : 'rgba(240,230,216,.08)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, one ? 0 : 14); c.lineTo(x, hh); c.stroke();
      if (one && b < B) { c.fillStyle = 'rgba(255,179,92,.85)'; c.font = '500 10px ' + COL.fontNum; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(String(b / bpb + 1), x + 3, 2); }
    }
    if (HXE.sel) { c.fillStyle = 'rgba(134,240,208,.16)'; c.fillRect(HXE.sel.a * ww, 0, (HXE.sel.b - HXE.sel.a) * ww, hh); c.strokeStyle = 'rgba(134,240,208,.7)'; c.strokeRect(HXE.sel.a * ww + 0.5, 0.5, (HXE.sel.b - HXE.sel.a) * ww - 1, hh - 1); }
    if (!L.sch.some((id) => { const S = HX.sch.get(id); return S && S.aud; })) { c.fillStyle = HXC.dim; c.font = '400 12px ' + COL.fontNum; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Die Schleife wird noch fertig eingefangen …', w / 2, hh / 2); }
    // the scale: the recording's own peak – so quieter (Verblassen, a Schicht down) or emptier (gaps) shows as such
    let m = 1e-4; for (let x = 0; x < W; x++) m = Math.max(m, -raw.mn[x], raw.mx[x]);
    for (let x = 0; x < W; x++) m = Math.max(m, -pk.mn[x], pk.mx[x]);
    const yc = hh * 0.55, amp = (hh * 0.42) / Math.max(m, 0.05);
    if (!rd) { c.fillStyle = HXC.dim; c.font = '400 10px ' + COL.fontNum; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('Klang wird berechnet …', w - 6, 3); }
    c.fillStyle = L.state === 'spielt' ? 'rgba(233,163,94,.85)' : 'rgba(168,152,138,.7)';
    for (let x = 0; x < W; x++) { const X = (x / W) * ww, y0 = yc - pk.mx[x] * amp, y1 = yc - pk.mn[x] * amp; c.fillRect(X, y0, Math.max(1, ww / W), Math.max(1, y1 - y0)); }
    // the notes: where they sound, how high (the loop's own range), how long
    const D = Math.max(0.05, hxLen(L));
    c.fillStyle = 'rgba(134,240,208,.85)';
    for (const n of L.notes) { const x = n.ph * ww, y = 16 + (1 - (n.r != null ? n.r : 0.5)) * (hh - 30), len = Math.max(3, ((n.d || 0.1) / D) * ww); c.fillRect(x, y - 1.5, len, 3); }
  }
  const c = mxFit(cv, w, hh, 0, Math.min(2, devicePixelRatio || 1));
  c.clearRect(0, 0, w, hh); c.drawImage(HXE.bg, 0, 0, w, hh);
  if (L.state !== 'angehalten' && A.ctx) { const x = Math.round(hxPhase(L, heardT()) * (w * hxEdWf(L) - 1)) + 0.5; c.strokeStyle = L.state === 'spielt' ? HXC.hypha : HXC.dim; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); }
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
  if (HXE.waitEl) { const f = L.prev ? L.prev.until : null, p = HX.pend.find((x) => x.loop === L.id && x.kind === 'band'), t = f != null ? hxT(f) : p ? p.t : null, s = t != null ? Math.max(0, Math.ceil(t - hxNowT())) : null, tx = s != null ? 'Das Bild zeigt schon den neuen Stand – zu hören ab der nächsten Naht, in ' + s + ' s.' : ''; if (HXE.waitEl.textContent !== tx) HXE.waitEl.textContent = tx; }
}
