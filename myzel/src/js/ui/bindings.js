/* ---------- the bindings, per device ---------- */
const MODE_TXT = { abs: 'Regler', rel2c: 'relativ (1/127)', relSB: 'relativ (1/65)', relBO: 'relativ (63/65)', toggle: 'umschalten', momentary: 'halten', trigger: 'auslösen' };
const kcCtlTxt = (b) => (b.name && b.name !== ctlDesc(b) ? b.name + ' · ' : '') + ctlDesc(b) + (b.ch >= 0 ? ' · Kanal ' + (b.ch + 1) : '');
// Gestik's axes: what the binding really drives (a parameter's counterpart in Formen, or nothing – it would write)
const kcTgtTxt = (b) => {
  const k = b.type === 'axis' && b.target != null ? gkTarget(b.target) : b.target, T = k != null && mtOf(k);
  return T ? tName(T) : b.target == null ? 'nichts (abgeschaltet)' : b.type === 'axis' && mtOf(b.target) ? 'nichts – Gestik ändert kein Preset' : 'unbekanntes Ziel';
};
function kcModeTxt(b, x) {
  const lo = b.min != null ? b.min : 0, hi = b.max != null ? b.max : 1;
  return (MODE_TXT[b.mode] || b.mode) + (lo > 0 || hi < 1 ? ' · ' + Math.round(lo * 100) + '–' + Math.round(hi * 100) + ' %' : '') + (b.inv ? ' · umgekehrt' : '') + (b.hires ? ' · 14 bit' : '') +
    (b.when === 'pads' ? ' · mit „Pads als Auslöser“' : '') +
    (b.dz ? ' · Ruhezone ' + Math.round(b.dz * 100) + ' %' : '') + (b.sm ? ' · Glätte ' + Math.round(b.sm * 100) + ' %' : '') + (b.cv ? (b.cv > 0 ? ' · fein' : ' · kräftig') : '') + (x && x.note ? ' · vermutet' : '') + (x && x.off ? (x.layer === 'p' && !profOn(x.s) ? ' · Profil aus' : ' · überdeckt') : '');
}
function kcBindsUI(force) {
  if (!devEls) return;
  if (KC.ed && !force) return;   // an open editor keeps its rows (a rebuild would take its focus)
  const srcs = [...MIDI.srcs.values()].filter((s) => s.enabled && !s.dup);
  KC.bmv = MAP.v;
  // what the rows would show – rebuilt only when that changed, not on every bump of MAP.v (a port event, a poll)
  let sig = (P['midi.std'] ? 1 : 0) + (P['midi.pads'] ? 1 : 0) + P['v.eng'] + '|' + JSON.stringify(MAP.user);
  for (const s of srcs) { sig += '|' + s.key + s.name + (profOn(s) ? 1 : 0); for (const x of mapList(s)) sig += (x.off ? 'o' : '-') + x.layer; }
  if (sig === KC.bsig && !force) return;
  KC.bsig = sig; KC.rows = [];
  const el = devEls.binds, f = kcFocus(el);
  el.textContent = '';
  for (const s of srcs) el.append(kcGroup(s));
  // learned for a device that is not here now: kept, and can be deleted
  const other = MAP.user.filter((b) => b.dev !== '*' && !srcs.some((s) => sameDev(b.dev, s.name)));
  if (other.length) el.append(kcFold('Gespeichert für andere Geräte', other.map((b) => ({ b, layer: 'u', s: { name: b.dev, key: 'x:' + b.dev, other: true } })), 'other'));
  if (!srcs.length && !other.length) el.append(h('p', { class: 'kc-empty' }, 'Verbinde ein Keyboard oder einen Controller – hier stehen dann seine Regler, Pads und Tasten.'));
  kcFocus(el, f);
}
function kcGroup(s) {
  const L = mapList(s).map((x) => Object.assign(x, { s })), u = L.filter((x) => x.layer === 'u'), p = L.filter((x) => x.layer === 'p'), sd = L.filter((x) => x.layer === 's');
  const reset = u.some((x) => x.b.dev !== '*') || (s.prof && !profOn(s));
  const g = h('div', { class: 'kc-bg', role: 'group', 'aria-label': 'Zuordnungen ' + s.name },
    h('div', { class: 'kc-bgh' }, h('b', null, s.name), reset ? kcSure(s.prof ? 'Profil wiederherstellen' : 'Alle löschen', () => { mapRestore(s); KC.bsig = ''; updDevUI(); toast(s.prof ? s.name + ': Profil wiederhergestellt.' : s.name + ': eigene Zuordnungen gelöscht.', 2500); }) : null));
  if (u.length) { const ul = h('ul', { class: 'kc-bl' }); for (const x of u) ul.append(kcRow(x)); g.append(ul); }
  else g.append(h('p', { class: 'kc-empty' }, s.prof ? 'Eigene Zuordnungen: noch keine. Das Profil gilt.' : 'Noch nichts zugewiesen – tippe auf „Zuweisen“.'));
  if (p.length) g.append(kcFold('Profil ' + s.prof.name + (profOn(s) ? '' : ' (aus)'), p, 'p:' + s.name));
  if (sd.length) g.append(kcFold('Standard (General MIDI)', sd, 's:' + s.name));
  return g;
}
// a folded list of bindings, built when first opened
function kcFold(title, list, key) {
  const ul = h('ul', { class: 'kc-bl' }), d = h('details', { class: 'kc-bd' }, h('summary', null, title + ' · ' + list.length), ul);
  const fill = () => { if (!ul.childNodes.length) for (const x of list) ul.append(kcRow(x)); };
  if (KC.open['b:' + key]) { d.open = true; fill(); }
  d.addEventListener('toggle', () => { kcKeep('b:' + key, d.open); if (d.open) fill(); });
  return d;
}
function kcRow(x) {
  const b = x.b, R = { s: x.s.other ? null : x.s, b, x, lit: false };
  R.led = h('i', { class: 'kc-led', 'aria-hidden': 'true' });
  R.ctl = h('span', { class: 'kc-bc' }, kcCtlTxt(b));
  R.tgt = h('span', { class: 'kc-bt' });
  R.btn = h('button', { type: 'button', class: 'kc-be', 'aria-expanded': 'false', 'data-kc': 'b:' + x.s.key + ':' + b.type + ':' + b.ch + ':' + b.num, html: ICON_TUNE });
  R.li = h('li', { class: 'kc-b' }, R.led, R.ctl, R.tgt, R.btn);
  R.btn.addEventListener('click', () => kcEdit(R));
  kcRowSync(R);
  KC.rows.push(R);
  return R.li;
}
function kcRowSync(R) {
  const b = R.b, x = R.x, t = kcTgtTxt(b), m = kcModeTxt(b, R.edited ? null : x);
  R.tgt.textContent = '→ ' + t; R.tgt.append(h('em', null, m));
  R.li.classList.toggle('off', !!x.off && !R.edited);
  R.li.classList.toggle('none', b.target == null);
  R.btn.setAttribute('aria-label', 'Bearbeiten: ' + kcCtlTxt(b) + ' → ' + t);
}
// the editor under a row: how the control acts (mode, range, invert, soft takeover), its target, delete. Edits are kept
// at once (a profile's binding becomes a learned copy); the list is rebuilt when the editor closes.
function kcEdit(R) {
  const was = KC.ed;
  if (was) kcEditClose();
  if (was && was.R === R) return;
  const s = R.s, ed = KC.ed = { R, el: null };
  const set = (patch) => { const u = mapEdit(s || { name: R.b.dev }, R.b, patch); if (u) { R.b = u; R.edited = true; } kcRowSync(R); sync(); };
  const modes = h('div', { class: 'chips small', role: 'radiogroup', 'aria-label': 'Art' });
  const mb = MODES.map((m) => { const c = h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': 'false', onclick: () => set({ mode: m }) }, MODE_TXT[m][0].toUpperCase() + MODE_TXT[m].slice(1)); c.dataset.m = m; modes.append(c); return c; });
  const rng = (lab, v) => { const i = h('input', { type: 'range', min: 0, max: 100, step: 1, value: v, 'aria-label': 'Bereich ' + lab }), o = h('span', { class: 'val' }); return { i, o, el: h('div', { class: 'kc-rng' }, h('span', null, lab), i, o) }; };
  const lo = rng('von', Math.round((R.b.min != null ? R.b.min : 0) * 100)), hi = rng('bis', Math.round((R.b.max != null ? R.b.max : 1) * 100));
  for (const r of [lo, hi]) {
    r.i.addEventListener('input', () => { r.o.textContent = r.i.value + ' %'; r.i.style.setProperty('--p', r.i.value + '%'); });
    r.i.addEventListener('change', () => set({ min: lo.i.value / 100, max: hi.i.value / 100 }));
  }
  // Gestik's axes: Ruhezone (nothing near rest), Glätte, Kurve
  const isAx = R.b.type === 'axis', isG = isAx || R.b.type === 'gest', gx = [];
  if (isAx) {
    for (const [k, lab, max] of [['dz', 'Ruhezone', 40], ['sm', 'Glätte', 100]]) {
      const i = h('input', { type: 'range', min: 0, max, step: 1, value: Math.round((R.b[k] || 0) * 100), 'aria-label': lab }), o = h('span', { class: 'val' });
      const show = () => { o.textContent = i.value + ' %'; i.style.setProperty('--p', (100 * i.value) / max + '%'); };
      i.addEventListener('input', show); i.addEventListener('change', () => set({ [k]: i.value / 100 }));
      show(); gx.push(h('div', { class: 'kc-rng gk-rng' }, h('span', null, lab), i, o));
    }
    gx.push(h('div', null, h('div', { class: 'lab' }, 'Kurve'), gkChips('Kurve', [[1, 'Fein'], [0, 'Linear'], [-1, 'Kräftig']], () => R.b.cv || 0, (v) => set({ cv: +v }))));
  }
  for (const c of mb) c.hidden = isG && c.dataset.m[0] === 'r';
  const inv = kcSwitch('Umkehren', !!R.b.inv, (v) => set({ inv: v }));
  const tko = kcSwitch('Weich übernehmen', R.b.to !== false, (v) => set({ to: v }), { title: 'Ein Regler übernimmt erst, wenn er den aktuellen Wert erreicht – kein Sprung im Klang' });
  const tgtName = h('b'), q = h('input', { type: 'search', placeholder: 'Neues Ziel suchen …', 'aria-label': 'Neues Ziel suchen', enterkeyhint: 'search', hidden: true }), res = h('div', { class: 'kc-res', role: 'group', 'aria-label': 'Ziele' });
  const chg = h('button', { type: 'button', class: 'btn ghost', onclick: () => { q.hidden = !q.hidden; if (!q.hidden) q.focus(); else { q.value = ''; res.textContent = ''; } } }, 'Ziel ändern');
  q.addEventListener('input', () => {
    res.textContent = '';
    if (!q.value.trim()) return;
    for (const r of mapSearch(q.value, 80).filter((r) => !isAx || gkTarget(r.key) === r.key).slice(0, 24)) res.append(h('button', { type: 'button', onclick: () => { set({ target: r.key }); q.value = ''; q.hidden = true; res.textContent = ''; chg.focus(); } }, r.group ? h('i', null, r.group + ' · ') : null, r.label));
  });
  const learned = () => MAP.user.includes(R.b);
  const del = h('button', { type: 'button', class: 'btn ghost danger' });
  del.addEventListener('click', () => {
    const name = kcCtlTxt(R.b), back = learned() && R.b.target == null;
    mapDel(s || { name: R.b.dev }, R.b);
    kcEditClose(true);
    toast(back ? name + ': wieder wie vorher.' : learned() ? name + ': gelöscht.' : name + ': abgeschaltet.', 2500);
  });
  const done = h('button', { type: 'button', class: 'btn', onclick: () => kcEditClose(true) }, 'Fertig');
  const sync = () => {
    const b = R.b, abs = (b.mode || 'abs') === 'abs';
    for (const c of mb) { const on = c.dataset.m === (b.mode || 'abs'); c.setAttribute('aria-checked', String(on)); c.tabIndex = on ? 0 : -1; }
    for (const r of [lo, hi]) { r.o.textContent = r.i.value + ' %'; r.i.style.setProperty('--p', r.i.value + '%'); }
    lo.el.hidden = hi.el.hidden = b.mode && b.mode[0] === 'r';
    tko.hidden = !abs;
    tgtName.textContent = kcTgtTxt(b);
    del.textContent = learned() ? (b.target == null ? 'Wieder einschalten' : 'Löschen') : 'Abschalten';
  };
  modes.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const ms = MODES.filter((m) => !(isG && m[0] === 'r')), i = (ms.indexOf(R.b.mode || 'abs') + d + ms.length) % ms.length;
    set({ mode: ms[i] }); mb[MODES.indexOf(ms[i])].focus();
  });
  ed.el = h('div', { class: 'kc-ed', role: 'group', 'aria-label': 'Zuordnung bearbeiten' },
    h('div', null, h('div', { class: 'lab' }, 'Art'), modes), lo.el, hi.el, ...gx, h('div', { class: 'kc-opts' }, inv, tko),
    h('div', { class: 'kc-tgt' }, h('span', null, 'Ziel: ', tgtName), chg), q, res, h('div', { class: 'row' }, del, done));
  ed.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); kcEditClose(true); } });
  sync();
  R.li.append(ed.el);
  R.btn.setAttribute('aria-expanded', 'true');
}
function kcEditClose(focus) {
  const E = KC.ed;
  if (!E) return;
  KC.ed = null;
  E.el.remove(); E.R.btn.setAttribute('aria-expanded', 'false');
  const k = focus && E.R.btn.dataset.kc;
  kcBindsUI(true);
  if (k) kcFocus(devEls.binds, k);
}
function kcExport() {
  if (!MAP.user.length) { toast('Noch keine eigenen Zuordnungen – die Profile sind in Myzel eingebaut.', 3500); return; }
  offerFile('myzel-midi-zuordnungen.json', new Blob([mapExport()], { type: 'application/json' }));
}
function kcImport(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const n = mapImport(String(r.result || ''), false);
    toast(n > 0 ? n + (n === 1 ? ' Zuordnung übernommen.' : ' Zuordnungen übernommen.') : n === 0 ? 'In dieser Datei stehen keine Zuordnungen.' : 'Diese Datei enthält keine Myzel-Zuordnungen.', 3500);
    input.value = '';
    updDevUI();
  };
  r.readAsText(f);
}

/* ---------- the MIDI monitor ---------- */
// records through MIDI.tap while its section is open (nothing is kept otherwise): the message, the device and what it
// did here, decided the way the mapping layer will decide right after
function kcMonOn(on) {
  KCM.on = on;
  if (on) { if (!KCM.t0) KCM.t0 = performance.now(); MIDI.tap = kcTap; KCM.dirty = true; }
  else if (MIDI.tap === kcTap) MIDI.tap = null;
}
function kcTap(src, ev) {
  if (KCM.hold) return;
  KCM.list.unshift({ id: ++KCM.n, t: performance.now(), name: devShort(src.name), ev, w: LEARN.on ? 'wird zugewiesen' : kcWhat(src, ev) });
  if (KCM.list.length > 30) KCM.list.length = 30;
  KCM.dirty = true;
}
// Drawn at most four times a second, only while it can be seen, and only what is new: a knob streaming a hundred
// values a second must not cost the main thread – it handles the notes too
function kcMonUI() {
  const E = devEls, now = performance.now();
  if (!E || !KCM.on || E.monSec.hidden || UI.panel !== 'dev' || !KCM.vis || now - KCM.uiT < 250) return;
  KCM.dirty = false; KCM.uiT = now;
  const clk = CLK.src && SEQ.ext ? 'MIDI-Clock von ' + CLK.src.name + ': ' + dec(SEQ.ext.bpm.toFixed(1)) + ' BPM' : '';
  if (E.monClk.textContent !== clk) { E.monClk.textContent = clk; E.monClk.hidden = !clk; }
  const L = E.monList, top = KCM.list.length ? KCM.list[0].id : 0;
  for (const li of L.querySelectorAll('li.new')) if (now - li.t >= 400) li.classList.remove('new');
  if (top === KCM.shown && L.childNodes.length) { KCM.dirty = L.querySelector('li.new') !== null; return; }
  if (!KCM.list.length) { KCM.shown = 0; L.replaceChildren(h('li', null, h('span', { class: 'e' }, 'Noch nichts angekommen. Bewege etwas am Gerät.'))); return; }
  // the records newer than the newest shown, oldest of them first, each on top
  const fresh = [];
  for (const r of KCM.list) { if (r.id <= KCM.shown) break; fresh.push(r); }
  if (!KCM.shown || fresh.length >= 30) L.textContent = '';
  for (let i = fresh.length - 1; i >= 0; i--) {
    const r = fresh[i], sec = ((r.t - KCM.t0) / 1000) % 1000, c = r.ev.ch >= 0 ? 'K' + (r.ev.ch + 1) : '';
    const li = h('li', { class: now - r.t < 400 ? 'new' : null }, h('span', { class: 't' }, dec(sec.toFixed(2)) + ' s'), h('span', { class: 'm' }, kcEvText(r.ev)), h('span', { class: 'c' }, c),
      h('span', { class: 'x' + (r.w ? '' : ' no') }, h('i', null, r.name), h('b', null, r.w ? '→ ' + r.w : '–')));
    li.t = r.t;
    L.prepend(li);
  }
  while (L.childNodes.length > 30) L.lastChild.remove();
  KCM.shown = top;
  KCM.dirty = !!L.querySelector('li.new');   // their highlight still has to fade
}

/* ---------- learn: the buttons that start it ---------- */
function kcLearnSync() {
  const on = LEARN.on;
  if (devEls && devEls.learnBtn) devEls.learnBtn.setAttribute('aria-pressed', String(on));
  if (KC.mx) { KC.mx.setAttribute('aria-pressed', String(on)); KC.mx.hidden = !(MIDI.ports.size || on); }
}
// The browser reports these values; it opens the output when the sound starts, so after changing the audio driver
// (for example its buffer size) a restart lets it measure again. Refreshed live while the panel is open.
function updLatText() {
  if (!devEls || !devEls.latInfo) return;
  let lt;
  if (!A.ctx) lt = 'Wird beim Klangstart gemessen.';
  else {
    const base = A.ctx.baseLatency || 0, out = A.ctx.outputLatency || 0, g = graphLatency();
    lt = 'Vom Browser gemeldet: Puffer ' + msTxt(base) + (out ? ' + Ausgabegerät ' + msTxt(out) : '') + ' + Klangweg ' + msTxt(g) + ' ≈ ' + msTxt(base + out + g) + '.';
    if (out > 0.04) lt += ' Das Ausgabegerät meldet viel Verzögerung – meist ein großer Puffer im Audiotreiber (in dessen Einstellungen verkleinern), Bluetooth (100 bis 300 ms) oder Lautsprecher am Monitor.';
  }
  const mode = P['dev.lat'];
  lt += mode === 'min' ? ' Minimal: kleinster Puffer, den das System erlaubt; die Verzerrung läuft ohne Überabtastung (minimal rauer).'
    : mode === 'std' ? ' Standard: üblicher Puffer der Plattform, Verzerrung mit Überabtastung.'
      : ' Sicher: größerer Puffer gegen Aussetzer bei hoher Last (Standard auf Android).';
  if (IOS) lt += ' iPhone und iPad wählen den Puffer selbst.';
  if (A.ctx) lt += A.latMode !== mode ? ' Der neue Puffer gilt nach einem Neustart des Klangs.' : ' Nach Änderungen am Audiotreiber den Klang neu starten, dann misst der Browser neu.';
  if (devEls.latInfo.textContent !== lt) devEls.latInfo.textContent = lt;
  devEls.latBtn.hidden = !A.ctx;
}
function updDevLive() {
  if (!devEls || !devEls.qInfo) return;
  updLatText();
  kcBleLines();
  if (!A.ctx) { devEls.qLive.textContent = ''; return; }
  const load = voiceLoad();
  devEls.qLive.textContent = 'Jetzt: ' + A.voices.size + (A.voices.size === 1 ? ' Stimme klingt' : ' Stimmen klingen') + ' · ' + Math.round(100 * load / Math.max(1, VBUDGET)) + ' % der Grenze' +
    (A.grains ? ' · ' + A.grains + ' Körner' : '') + (A.budgetScale && A.budgetScale < 1 ? ' · nach Aussetzern auf ' + Math.round(A.budgetScale * 100) + ' % gesenkt' : '');
  lmLive();   // (Leistung: the loops' share)
}

