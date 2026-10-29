/* =====================================================================
   UI: controls generated from the schema
   ===================================================================== */
const CTL = {};
const UI = { panel: null, lane: 0 };
const domId = (id, pre = '') => pre + 'p-' + id.replace(/\./g, '-');
function bindCtl(id, fn) { (CTL[id] || (CTL[id] = [])).push(fn); fn(P[id], null); }
const CTLWRAP = {};
function onDoubleTap(el, fn) {
  let last = 0;
  el.addEventListener('dblclick', fn);
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    const t = performance.now();
    if (t - last < 350) { last = 0; fn(); } else last = t;
  });
}
// every control carries its param (data-ww): the Wurzelwerk sows it from there, and marks it when sown (wurzelwerk.js)
function ctl(id, opts = {}) {
  const w = ctl0(id, opts);
  if (w && w.dataset) { w.dataset.ww = id; if (typeof WW !== 'undefined' && WW.set.has(id) && !/^ww-/.test(opts.prefix || '')) w.classList.add('ww-gesaet'); }
  return w;
}
function ctl0(id, opts = {}) {
  const d = PD[id];
  const did = domId(id, opts.prefix || ''), pid = d.dev || d.rec ? null : id;   // a target for MIDI „Zuweisen“
  const name = (opts.label || d.label) + (groupOf(id) ? ' – ' + groupOf(id) : '');
  if (d.kind === 'num') {
    const native = d.curve === 'lin' && d.step && (d.max - d.min) / d.step <= 200;
    const inp = h('input', { type: 'range', id: did, min: native ? d.min : 0, max: native ? d.max : 1000, step: native ? d.step : 1, 'aria-label': name });
    const out = h('span', { class: 'val', 'aria-hidden': 'true' });
    const lab = h('label', { for: did, title: 'Doppeltippen setzt zurück' }, opts.label || d.label);
    const wrap = h('div', { class: 'ctl' + (opts.wide ? ' wide' : ''), 'data-pid': pid }, h('div', { class: 'ctl-row' }, lab, out), inp);
    let touchDrag = false;
    inp.addEventListener('input', () => {
      if (touchDrag) { inp.value = native ? P[id] : Math.round(clamp(toNorm(d, P[id]), 0, 1) * 1000); return; }
      setParam(id, native ? Number(inp.value) : fromNorm(d, inp.value / 1000), inp);
    });
    // Touch: drag sideways to change (relative, no jump); vertical swipes scroll the panel and never change the value.
    inp.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      e.preventDefault();
      const r = inp.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, n0 = clamp(toNorm(d, P[id]), 0, 1);
      let drag = false;
      touchDrag = true;
      const mv = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!drag) {
          if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
          drag = true; inp.classList.add('dragging');
          try { inp.setPointerCapture(ev.pointerId); } catch (err) {}
        }
        setParam(id, fromNorm(d, n0 + dx / Math.max(60, r.width - 24)));
      };
      const end = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        touchDrag = false; inp.classList.remove('dragging');
        inp.removeEventListener('pointermove', mv); inp.removeEventListener('pointerup', end); inp.removeEventListener('pointercancel', end);
      };
      inp.addEventListener('pointermove', mv); inp.addEventListener('pointerup', end); inp.addEventListener('pointercancel', end);
    });
    onDoubleTap(lab, () => { setParam(id, d.d); toast(d.label + ' zurückgesetzt: ' + fmt(d, d.d), 1800); });
    bindCtl(id, (v, src) => {
      const n = clamp(toNorm(d, v), 0, 1);
      if (d.lab && !opts.label) { const t = d.lab() || d.label, tn = lab.firstChild; if (tn && tn.nodeType === 3 && tn.nodeValue !== t) { tn.nodeValue = t; inp.setAttribute('aria-label', t + (groupOf(id) ? ' – ' + groupOf(id) : '')); } }   // (a label that follows another knob, e.g. Halm's pipe; the macro mark A/B stays)
      if (src !== inp) inp.value = native ? v : Math.round(n * 1000);
      inp.style.setProperty('--p', (n * 100).toFixed(2) + '%');
      out.textContent = fmt(d, v);
      inp.setAttribute('aria-valuetext', fmt(d, v));
    });
    (CTLWRAP[id] || (CTLWRAP[id] = [])).push(wrap);
    return wrap;
  }
  if (d.kind === 'sel') {
    if (d.lib) { const T = kqTarget(id); return kqRow(T, { id: did, label: opts.label || d.label, pid, where: opts.prefix === 'mxd-' ? 'Kanal ' + T.ch : null }); }
    if (d.chips) {
      const lab = h('div', { class: 'lab', id: did + '-l' }, opts.label || d.label);
      const box = h('div', { class: 'chips' + (d.small ? ' small' : ''), role: 'radiogroup', 'aria-label': name, id: did });
      const btns = d.opts.map(([val, text]) => {
        const b = h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': 'false', onclick: () => setParam(id, val) }, text);
        b.dataset.val = val; box.append(b); return b;
      });
      bindCtl(id, (v) => { for (const b of btns) { const on = b.dataset.val === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; } });
      box.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        const i = d.opts.findIndex((o) => o[0] === P[id]);
        const ni = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + d.opts.length) % d.opts.length;
        setParam(id, d.opts[ni][0]); btns[ni].focus();
      });
      return h('div', { class: 'ctl wide', 'data-pid': pid }, lab, box);
    }
    // (options with a third field are grouped: optgroups in their order)
    const grp = [], og = {}; for (const [val, text, g] of d.opts) { const o = h('option', { value: val }, text); if (!g) { grp.push(o); continue; } if (!og[g]) { og[g] = h('optgroup', { label: g }); grp.push(og[g]); } og[g].append(o); }
    const s = h('select', { id: did, 'aria-label': name }, grp);
    s.addEventListener('change', () => setParam(id, s.value));
    bindCtl(id, (v) => { s.value = v; });
    return h('div', { class: 'ctl' + (opts.wide ? ' wide' : ''), 'data-pid': pid }, h('label', { for: did }, opts.label || d.label), s);
  }
  const b = h('button', { type: 'button', class: 'sw', role: 'switch', id: did, 'aria-checked': 'false', 'aria-label': name, onclick: () => setParam(id, !P[id]) },
    h('span', { class: 'lab' }, opts.label || d.label), h('span', { class: 'knob', 'aria-hidden': 'true' }));
  bindCtl(id, (v) => b.setAttribute('aria-checked', String(!!v)));
  return h('div', { class: 'ctl' + (opts.wide !== false ? ' wide' : ''), 'data-pid': pid }, b);
}
function section(title, sub, ...kids) {
  return h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('h3', null, title), sub ? h('p', null, sub) : null), ...kids);
}
const grid = (...kids) => h('div', { class: 'grid' }, ...kids);
const ctls = (ids, o) => ids.map((id) => ctl(id, o));

let saveTimer = null;
function setParam(id, v, src) {
  const d = PD[id];
  if (!d) return;
  v = sanitize(d, v);
  const changed = P[id] !== v, was = P[id];
  P[id] = v;
  for (const fn of CTL[id] || []) fn(v, src);
  if (changed) { if (FAE_PAR[id]) faeP(id, was, v); onParamChanged(id); clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400); }
  if (id === 'kor.src') korSourcePicked();
}
// a tap on a grain source (also on the one already chosen): open the microphone or the file picker – both need the tap
function korSourcePicked() {
  syncMic();
  if (P['kor.src'] === 'datei' && !A.userTex && !USERTEX.pending && userFileIn) userFileIn.click();
}
// the microphone is open exactly while "Mikrofon (live)" is the source
function syncMic() {
  if (P['kor.src'] !== 'mikro') { if (MIC.on || MIC.starting) micStop(); }
  else if (A.started && !MIC.on && !MIC.starting) micStart();
}
function updInactive() {
  for (const w of CTLWRAP['dly.ms'] || []) w.classList.toggle('inactive', !!P['dly.sync']);
  for (const el of document.querySelectorAll('#p-dly-div')) el.parentNode.classList.toggle('inactive', !P['dly.sync']);
}
function onParamChanged(id) {
  if ((id === 't.root' || id === 't.scale') && hxWTonHold(id)) return;   // Hexenring: (step 2a) the field and the loops change key on the announced bar line
  const pre = id.slice(0, id.indexOf('.'));
  if (HX.wFeld && A.ctx && (ENGINES[pre] || id === 'v.eng' || id === 'v.layer')) HX.wKlang = performance.now() + 400;   // Hexenring: (step 2a) loops that sound as the field: anew, once the knob rests
  if (id === 'v.eng' || id === 'v.layer') { refreshEngineUI(); }
  if (id === 'ui.instrument' && A.ctx) for (const L of hxLoopsLive()) hxWUpdate(L);   // Hexenring: (28.10.2026) the loops take the preset's instrument, or their own again, from their next seam
  if (KQ_PIDS.includes(id) && !UI.loading) kqUsed(P[id]);
  if ((id === 'v.eng' || id === 'v.layer' || /^l\d\.eng$/.test(id)) && WORKLET_ENGINES.has(P[id])) dspMaybe();
  if (id === 'flt.type') for (const fn of CTL['flt.q'] || []) fn(P['flt.q'], null);
  if (pre === 'sai' || pre === 't' || id === 'v.eng' || id === 'v.layer' || id === 'v.layerInt' || id === 'v.oct' || id === 'v.deg' || id === 'v.layerDeg' || /^l\d\.(eng|on|oct)$/.test(id)) warmKS();
  if (id === 'kor.src' && P['kor.src'] === 'echo' && A.started) ensureCapture();
  if (id === 'kor.src' && A.ctx && !LIVE_SRC.has(P['kor.src'])) texture(P['kor.src']);
  if (id === 'dly.sync') updInactive();
  if (id === 'rec.len' || id === 'rec.bars' || id === 'seq.bpm') { renderBarInfo(); if (CAP.state === 'idle') updRecUI(); }
  if (id === 'rec.bars') barRecue();
  if (pre === 't') { buildNotes(); drawBg(); if (A.ctx) retuneBordun(); }
  if (pre === 't' || id === 'v.oct' || id === 'gsp.saiten') gspRetune();
  if (pre === 't') rhzRetune();
  if (pre === 'l' + id[1] && /^l\d$/.test(pre)) updLaneTabs();
  if (pre === 'rec') return;
  if (PD[id].dev) { onDeviceChanged(id); return; }
  if (PD[id].live) { if (A.ctx && pre[0] === 'x' && MIX.s[pre.slice(1)]) mixParam(MIX.s[pre.slice(1)], 'solo'); return; }
  if (pre === 'xhxr') { if (A.ctx) mixParam(MIX.s.hxr, id.slice(5)); return; }   // Hexenring: its strip is not the patch's
  if (pre === 'hx') { hxParam(id); return; }
  markPresetDirty();
  if (!A.ctx) return;
  if (pre[0] === 'x' && MIX.s[pre.slice(1)]) { mixParam(MIX.s[pre.slice(1)], id.slice(pre.length + 1)); return; }
  switch (pre) {
    case 'drv': updDrive(); break;
    case 'rng': updRing(); break;
    case 'flt': updFilter(); break;
    case 'pha': updPhaser(); break;
    case 'cho': updChorus(); break;
    case 'dly': updDelay(); break;
    case 'rev': if (id === 'rev.size' || id === 'rev.damp' || id === 'rev.typ' || id === 'rev.dist' || id === 'rev.len') regenIR(); else updReverbMix(); break;
    case 'fx': fxUpd(); break;
    case 'mov': updMove(); break;
    case 'mst': updMaster(); break;
    case 'bor': updBordun(); break;
    case 'mix': if (id === 'mix.pulsVol' || id === 'mix.pulsMute') for (const st of MIX.list) if (st.lane != null) updStrip(st); break;
    case 'seq': if (id === 'seq.bpm') { TG.hxOn = false; seqRetempo(); updDelay(); hxWTempo(); fxTune(); } break;   // (Hexenring: the slider takes the tempo back from a Schleife; step 2a: loops with notes follow it)
    case 'neb':
      if (id === 'neb.cut' || id === 'neb.ymod' || id === 'neb.res') for (const t of touches.values()) for (const { v } of t.voices) if (v.alive && v.eng === 'neb') { v.setY(modY(t)); setP(v.filt.Q, P['neb.res']); }
      break;
    case 'hlm': case 'rnk': case 'hrz': case 'shn': case 'zpf': case 'glt': case 'khl': case 'mdr': case 'boe': case 'amo': case 'nrd': case 'sht': case 'ond': case 'wal': case 'stp': case 'atr': case 'tnl': case 'wkg': case 'bnt': case 'kas': case 'bit': case 'gbs': case 'hht': case 'vox': case 'spu': case 'kto': case 'hng': case 'gml': case 'sit': case 'tbl': case 'did': case 'mtr':   // the sounding voices follow at once (the processor reads its knobs per block; Moder's body, mallet and Nachklang at the next strike)
      for (const v of A.voices) if (v.alive && v.as === pre) { if (v.wk) v.wk.port.postMessage({ set: wkPrm(pre) }); else if (v.upd) v.upd(); }
      if (id === 'zpf.koerper') for (const fn of CTL['zpf.klang'] || []) fn(P['zpf.klang'], null);   // (its Nachklang is the body's)
      if (id === 'hrz.koerper') for (const fn of CTL['hrz.daempfung'] || []) fn(P['hrz.daempfung'], null);   // (its Nachklang is the body's)
      if (id === 'hlm.rohr') {   // each pipe names the knobs its own way, and says how it plays
        for (const k of ['atem', 'mund', 'blatt', 'luft', 'zunge']) for (const fn of CTL['hlm.' + k] || []) fn(P['hlm.' + k], null);
        const el = document.getElementById('eng-note-hlm'); if (el) el.textContent = ENG_NOTE.hlm();
      }
      break;
    case 'elm': for (const v of A.voices) if (v.alive && !v.released && v.upd && v.as === 'elm') v.upd(); break;
    case 'gsp': if (id === 'gsp.halo') { if (A.gsp) setP(A.gsp.out.gain, dbToGain(P['gsp.halo']), 0.05); hxWebsHalo(); } else if (id !== 'gsp.saiten') gspSet(); break;
    case 'jrg':   // a fixed season is where the running year goes on from
      if (id === 'jrg.jahreszeit' && JRG_FIX[P[id]] != null) A.season = JRG_FIX[P[id]];
      jrgText();
      break;
  }
}
function onDeviceChanged(id) {
  if (id === 'dev.q') {
    A.budgetScale = 1; A.lite = false;
    if (A.ctx) gdLearned();   // (Leistung, 25.10.2026: the scale this device learned for the new level)
    applyQuality();
    kqSyncAll();
    if (P['dev.q'] !== '1' && A.ctx && !CAL.fresh) calibrate();
  }
  if (id === 'dev.lat') {
    latChosen();
    applyQuality();
    if (A.ctx && P['dev.lat'] !== A.latMode) toast('Der neue Ausgabepuffer gilt nach einem Neustart des Klangs.', 8000, { label: 'Neu starten', fn: restartAudio });
  }
  // the wheel setting overrides a range a device sent (RPN 0)
  if (id === 'midi.bend') { for (const s of MIDI.srcs.values()) for (const cs of s.chs) if (cs) cs.range = null; applyBend(); }
  if (id === 'midi.y') midiRecolor();
  if (id === 'midi.mpe') { MIDI.zv++; midiAllOff(); }
  if (id === 'midi.clock' && P['midi.clock'] === 'off') clkLost();
  if (id === 'midi.map') warmKS();
  if (id === 'midi.ble') bleFlushAll();
  if (id === 'midi.std' && !P['midi.std']) exprSet(1, null);   // CC 11 no longer reaches it: let go of what it held
  updDevUI();
}
// the output buffer is fixed when the audio context is created: save everything and reload (recordings are backed up)
function restartAudio() {
  if (CAP.state !== 'idle' || CAP.finishing) { toast('Beende zuerst die Aufnahme.'); return; }
  saveState();
  location.reload();
}
function patchValues() { const o = {}; for (const id of PATCH_IDS) o[id] = P[id]; return o; }
function loadValues(vals, keepUnset) {
  KQ.miss = []; vals = engKeysIn(vals);
  const was = {}; for (const id in FAE_PAR) was[id] = P[id];   // (Hexenring: the Bewegung lanes take the new values)
  for (const id of PATCH_IDS) {
    const d = PD[id];
    const v = vals && Object.prototype.hasOwnProperty.call(vals, id) ? sanitize(d, vals[id]) : keepUnset ? P[id] : d.d;
    P[id] = v;
  }
  for (const id of PATCH_IDS) for (const fn of CTL[id] || []) fn(P[id], null);
  hxMvSync(was);
  buildNotes(); drawBg(); refreshEngineUI(); updLaneTabs(); updInactive(); renderBarInfo();
  if (A.ctx) { applyAll(); seqRetempo(); warmKS(); dspMaybe(); if (P['kor.src'] === 'echo') ensureCapture(); if (!LIVE_SRC.has(P['kor.src'])) texture(P['kor.src']); }
  syncMic();
  // (owner, 27.10.2026: „man muss erst auf stille gehen … dann ein preset … dann auf weiter“) a preset's values come in here,
  // past setParam: the loops that sound as the field take the new sound too (as a knob turned does it – onParamChanged)
  if (A.ctx && hxLoopsLive().some((X) => hxKlangOf(X) === 'feld')) { HX.wFeld = true; HX.wKlang = performance.now() + 50; }
  clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400);
}
function saveState() {
  store.set('myzel.patch.v1', JSON.stringify({ values: patchValues(), preset: UI.preset || null }));
  const r = {}, dv = {}; for (const id in PD) { if (PD[id].rec) r[id] = P[id]; if (PD[id].dev) dv[id] = P[id]; }
  store.set('myzel.rec.v1', JSON.stringify(r));
  store.set('myzel.dev.v1', JSON.stringify(dv));
}
function restoreState() {
  try {
    const dv = JSON.parse(store.get('myzel.dev.v1') || 'null');
    if (dv) for (const id in dv) if (PD[id] && PD[id].dev) P[id] = sanitize(PD[id], dv[id]);
    // (owner, 26.10.2026: „leer starten“) the sound begins as Leere Erde – unless „Beim Öffnen mit Leerer Erde
    // beginnen“ is off: then the last one, as before
    const s = JSON.parse(store.get('myzel.patch.v1') || 'null');
    if (P['ui.leer']) { const v = PRESET_LEER.v; for (const id of PATCH_IDS) P[id] = id in v ? sanitize(PD[id], v[id]) : PD[id].d; UI.preset = 'leer'; }
    else if (s && s.values) { const v = engKeysIn(s.values); for (const id of PATCH_IDS) if (id in v) P[id] = sanitize(PD[id], v[id]); UI.preset = s.preset || null; }
    const r = JSON.parse(store.get('myzel.rec.v1') || 'null');
    if (r) for (const id in r) if (PD[id] && PD[id].rec) P[id] = sanitize(PD[id], r[id]);
    if (!store.get('myzel.ws.v2')) { store.set('myzel.ws.v2', '1'); if (P['hx.ws.durchg'] === '1') P['hx.ws.durchg'] = 'auto'; }   // (once, 28.10.2026: the Werkstatt's creations „gehen viel zu schnell“ – at least 10 s each now)
    latRestore(dv);   // (the latency: chosen by hand, or the default with this device's step – ui/leistung.js)
  } catch (e) {}
}

/* ---------- panels ---------- */
const sheet = $('#sheet'), sheetBody = $('#sheetBody'), sheetTitle = $('#sheetTitle');
// build: the panel's content; optional open/close: called when it shows or hides; frame(dt, ts): every frame while open
const PANELS = [
  { key: 'klang', title: 'Klang', icon: ICON.klang, build: buildKlang, frame: klangFrame },
  { key: 'fx', title: 'Effekte', icon: ICON.fx, build: buildFx },
  { key: 'puls', title: 'Puls', icon: ICON.puls, build: buildPuls, frame: (dt, ts) => { drawRings(); if (typeof pulsMixFrame === 'function') pulsMixFrame(dt, ts); },
    open: () => { if (typeof pulsMixOpen === 'function') pulsMixOpen(); }, close: () => { if (typeof pulsMixClose === 'function') pulsMixClose(); } },
  { key: 'rec', title: 'Aufnahme', icon: ICON.rec, build: buildRec, open: () => { renderTakes(); renderBarInfo(); hxCardRender(); }, frame: () => hxCardFrame() },   // (Hexenring: its card)
  { key: 'presets', title: 'Presets', icon: ICON.presets, build: buildPresets, frame: () => kbFrame() },   // (the Klangwelten's pictures move)
  { key: 'dev', title: 'Gerät', icon: ICON.dev, build: buildDev, open: updDevUI, frame: devFrame },
];
