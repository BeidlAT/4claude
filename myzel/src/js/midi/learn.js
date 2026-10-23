/* ---------- MIDI learn ("Zuweisen") ---------- */
// Touch first: move a control on the device, then tap the target – any control in any panel that carries data-pid (a
// parameter) or data-act (an action), the mixer's faders, knobs and buttons included – or pick it from the list; the
// other order works too. The first message that clearly comes from a control is captured: real-time never; keys not
// while a knob target waits; the wheels, pressure, CC 1 and 2 only after moving by 10, so brushing them does not bind.
// The gesture shows what the control is: a knob, a relative encoder (repeated small steps around 0 or 64), a 14-bit
// pair, or a button. While learn is on the captured control acts on nothing else.
const LEARN = { on: false, cap: null, tgt: null, cand: new Map(), ui: null, swT: 0, swEl: null, swDown: false, tm: 0, said: '', saidB: null, done: null, sel: null, undo: null, no: false };
function learnIn(src, ev) {
  const k = KIND[ev.type];
  if (!k || ev.type === 'poly') return false;
  if (k === 'axis' || k === 'gest') return gkLearnIn(src, ev);
  const num = k === 'bend' || k === 'press' ? -1 : ev.num, c = LEARN.cap, now = performance.now();
  // the bytes of an RPN or NRPN (select 98–101, data 6/38, step 96/97) are assembled first: the parameter is learned,
  // not its select byte (a constant). Data entry alone, with nothing selected, is a plain CC.
  if (k === 'cc' && (num >= 98 && num <= 101 || ((num === 6 || num === 38 || num === 96 || num === 97) && chState(src, ev.ch).pk))) return false;
  if (ev.type === 'off') return !!c && c.src === src && c.kind === 'note' && c.num === num && !MIDI.notes.has(midiId(src, ev.ch, num));
  // the control just assigned, still moving: it already acts on its new target
  const D = LEARN.done;
  if (D && D.src === src && D.kind === k && D.num === num && D.ch === ev.ch && now - D.t < 600) { D.t = now; return false; }
  if (c && c.src === src && c.ch === ev.ch) {
    if (c.kind === k && c.num === num) { c.vals.push(ev.val); c.last = now; return true; }
    if (k === 'cc' && c.kind === 'cc' && c.num < 32 && num === c.num + 32) { c.lsb++; c.last = now; return true; }
  }
  const T = LEARN.tgt && mtOf(LEARN.tgt);
  if (k === 'note' && T && T.cont) return false;   // keys play on while a knob's target waits for its knob
  // a control that just spoke keeps the capture (an X-Y pad sends two CCs) – not Gestik's: a hand never rests, so a knob
  // turned on the keyboard wins over a swaying phone
  if (c && c.kind !== 'axis' && c.kind !== 'gest' && now - c.last < 600) return k !== 'note';
  if (k === 'bend' || k === 'press' || (k === 'cc' && (num === 1 || num === 2))) {
    const key = k + ':' + ev.ch + ':' + num, v = k === 'bend' ? ev.val / 128 : ev.val;
    let r = LEARN.cand.get(key);
    if (!r || now - r.t > 1500) LEARN.cand.set(key, (r = { lo: v, hi: v, t: now }));
    r.lo = Math.min(r.lo, v); r.hi = Math.max(r.hi, v); r.t = now;
    if (r.hi - r.lo < 10) return true;
  }
  LEARN.cap = { src, kind: k, ch: ev.ch, num, vals: [ev.val], lsb: 0, t0: now, last: now };
  LEARN.cand.clear(); LEARN.said = '';
  learnShow();
  if (LEARN.tgt) { clearTimeout(LEARN.tm); LEARN.tm = setTimeout(learnDone, 400); }   // a moment to see how it moves
  return true;
}
// what kind of control made the captured gesture
function learnFmt(c) {
  if (c.kind !== 'cc') return { btn: c.kind === 'note' || c.kind === 'pc' || c.kind === 'gest' };
  const v = c.vals, all = (f) => v.every(f), some = (f) => v.some(f), small = (x) => x >= 1 && x <= 15;
  if (c.lsb >= 2 && c.num < 32) return { hires: true };
  if (all((x) => x === 0 || x === 127)) return { btn: true };
  let rep = 0;
  for (let i = 1; i < v.length; i++) if (v[i] === v[i - 1]) rep++;
  if (all((x) => small(x) || x >= 113) && (rep || (some(small) && some((x) => x >= 113)))) return { rel: 'rel2c' };
  if (rep && some(small) && all((x) => small(x) || (x >= 65 && x <= 79))) return { rel: 'relSB' };
  if (rep && all((x) => x >= 49 && x <= 79 && x !== 64)) return { rel: 'relBO' };
  return {};
}
// "nanoKEY Studio · Regler CC 21 · Kanal 1"
function capText(c) {
  const b = { type: c.kind, num: c.num };
  if (c.kind === 'axis' || c.kind === 'gest') return 'Gestik · ' + ctlDesc(b);
  return devShort(c.src.name) + ' · ' + (c.kind === 'cc' ? 'Regler ' : c.kind === 'note' ? (c.ch === 9 ? 'Pad · ' : 'Taste · ') : '') + ctlDesc(b) + ' · Kanal ' + (c.ch + 1);
}
function learnDone() {
  clearTimeout(LEARN.tm);
  const c = LEARN.cap;
  let key = LEARN.tgt, T = mtOf(key);
  if (!c || !T) return null;
  // Gestik's axes only form (konzept: motion never writes the patch): a parameter with a counterpart in Formen takes
  // that one, any other that would change the preset is refused – the captured axis waits for another target
  if (c.kind === 'axis' && gkTarget(key) !== key) {
    const k2 = gkTarget(key);
    if (!k2) { LEARN.tgt = null; LEARN.no = true; learnSel(null); learnShow(); return null; }
    key = k2; T = mtOf(key);
  }
  LEARN.no = false;
  const f = learnFmt(c), keeps = !!(T.get || tPid(T));
  let mode = f.rel || 'abs';
  if (f.btn) mode = key === 'fae' || HX_MOMENT.has(key) ? 'momentary' : T.hit || !keeps ? 'trigger' : T.mod || key === 'xy.gate' || key === 'sus' || key === 'sost' || key === 'soft' || key === 'gk.hold' || key === 'gk.taste' ? 'momentary' : 'toggle';   // the Fährte pad: tap, hold and double tap need its release
  const b = { dev: c.src.name, ch: c.ch, type: c.kind, num: c.num, target: key, mode };
  if (f.hires) b.hires = true;
  const prof = profOf(c.src), pb = prof && prof.binds.find((x) => x.type === c.kind && x.num === c.num && x.name);
  if (pb) b.name = pb.name;
  LEARN.undo = { b, prev: MAP.user.filter((u) => sameCtl(u, b)) };
  MAP.user = MAP.user.filter((u) => !sameCtl(u, b)).concat(b);
  mapSave();
  learnSel(null, true);
  // the knob rests where the gesture left it: soft takeover starts from there
  const last = c.vals[c.vals.length - 1];
  if (mode === 'abs' && !f.hires) bState(c.src, b).prev = c.kind === 'axis' ? last : c.kind === 'bend' ? last / 16383 : last / 127;
  LEARN.cap = null; LEARN.tgt = null; LEARN.done = { src: c.src, kind: c.kind, ch: c.ch, num: c.num, t: c.last };
  if (LEARN.gk) LEARN.gk.clear();
  LEARN.said = 'Zugewiesen: ' + capText(c) + ' → ' + tName(T) + '. Nächster Regler – oder „Fertig“.'; LEARN.saidB = capText(c) + ' → ' + tName(T);
  learnShow();
  return b;
}
// a target from a tap or from the list; with a captured control it is assigned at once
function learnPick(key) {
  if (!LEARN.on || !mtOf(key)) return false;
  LEARN.tgt = key; LEARN.said = ''; LEARN.undo = null; LEARN.no = false;
  if (LEARN.gk) LEARN.gk.clear();   // Gestik: only what moves from now on counts
  if (LEARN.cap) learnDone(); else learnShow();
  return true;
}
function midiLearn(on) {
  on = !!on;
  if (on === LEARN.on) return;
  const back = !on && LEARN.ui && LEARN.ui.el.contains(document.activeElement);
  LEARN.on = on; LEARN.cap = null; LEARN.tgt = null; LEARN.said = ''; LEARN.undo = null; LEARN.no = false; LEARN.cand.clear(); clearTimeout(LEARN.tm);
  if (LEARN.gk) LEARN.gk.clear();
  learnSel(null);
  document.body.classList.toggle('mlearn', on);
  learnShow();
  if (back && LEARN.opener && LEARN.opener.isConnected && !LEARN.opener.hidden) LEARN.opener.focus({ preventScroll: true });   // where it began
}
// "Zuweisen" from a button: started from the keyboard (click without a pointer), the focus goes into the banner – its
// search, or on a touch screen its message (no on-screen keyboard popping up)
function learnBtn(e) {
  LEARN.opener = e && e.currentTarget;
  midiLearn(!LEARN.on);
  if (LEARN.on && e && e.detail === 0) learnFocus();
}
const learnFocus = () => { const U = LEARN.ui; if (U) (MOBILE ? U.msg : U.q).focus({ preventScroll: true }); };
// marks a control for "Zuweisen": a parameter id, or a function for controls that follow the chosen channel
function mPid(el, id) { if (typeof id === 'function') { el._pid = id; el.dataset.pid = ''; } else el.dataset.pid = id; return el; }
function elTarget(el) {
  const key = typeof el._pid === 'function' ? el._pid() : el.dataset.pid || el.dataset.act;
  return key && mtOf(key) ? key : null;
}
// While learn is on, a tap (or Enter / Space) on a marked control chooses it instead of changing it: the rest of that
// tap – up, click, the slider's input – is swallowed and the control shows its value again.
function learnEv(e) {
  if (!LEARN.on) return;
  if (e.type === 'keydown' && e.key === 'Escape') { midiLearn(false); e.stopImmediatePropagation(); return; }
  const t = e.target && e.target.nodeType === 1 ? e.target : null, el = t ? t.closest('[data-pid],[data-act]') : null;
  if (!t || (LEARN.ui && LEARN.ui.el.contains(t))) return;
  if (LEARN.swEl && LEARN.swEl.contains(t) && (LEARN.swDown || performance.now() - LEARN.swT < 500) && e.type !== 'pointerdown' && e.type !== 'keydown') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === 'pointerup' || e.type === 'pointercancel' || e.type === 'mouseup') { LEARN.swDown = false; LEARN.swT = performance.now(); }
    if (e.type === 'input' || e.type === 'change') learnResync(LEARN.swEl);
    return;
  }
  if (!el || (e.type === 'pointerdown' ? e.button > 0 : e.type !== 'keydown' || (e.key !== 'Enter' && e.key !== ' '))) return;
  const key = elTarget(el);
  if (!key) return;
  e.preventDefault(); e.stopImmediatePropagation();
  LEARN.swT = performance.now(); LEARN.swEl = el; LEARN.swDown = e.type === 'pointerdown';
  learnPick(key);
  if (LEARN.tgt === key && !LEARN.cap) { learnSel(el); setTimeout(() => learnResync(el), 700); return; }
  el.classList.add('ml-ok');
  setTimeout(() => { el.classList.remove('ml-ok'); learnResync(el); }, 700);
}
// the control chosen as target before its device control: outlined until assigned (then a short flash) or replaced
function learnSel(el, flash) {
  const o = LEARN.sel;
  if (o && o !== el) { o.classList.remove('ml-sel'); if (flash) { o.classList.add('ml-ok'); setTimeout(() => o.classList.remove('ml-ok'), 700); } }
  LEARN.sel = el || null;
  if (el) el.classList.add('ml-sel');
}
// "Rückgängig": the last assignment goes, what it replaced comes back
function learnUndo() {
  const u = LEARN.undo;
  if (!u) return;
  MAP.user = MAP.user.filter((x) => x !== u.b).concat(u.prev);
  mapSave();
  LEARN.undo = null; LEARN.said = ''; LEARN.saidB = null; LEARN.done = null;
  learnShow();
  toast('Zuweisung zurückgenommen.', 2500);
}
function learnResync(el) { const id = elTarget(el); if (id && PD[id]) for (const fn of CTL[id] || []) fn(P[id], null); }
for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'input', 'change']) window.addEventListener(t, learnEv, true);
// the list of all targets, grouped like the panels, for the search
// the words a musician types for the mixer's levels
const SYN_VOL = 'mixer fader lautstärke volume level kanalzug';
function mapTargets() {
  if (MAP.list) return MAP.list;
  const l = [];
  for (const T of MTARGETS.values()) l.push({ key: T.key, label: T.label, group: T.group || '' });
  for (const id of Object.keys(PD)) {
    const T = mtParam(id);
    if (T) l.push({ key: id, label: T.label, group: T.group, syn: isVolId(id) ? SYN_VOL + (id === 'mst.vol' ? ' master summe gesamt' : id === 'mix.pulsVol' ? ' puls gesamt' : '') : '' });
  }
  for (const t of l) { t.f = fold(t.group + ' ' + t.label + ' ' + t.key + ' ' + (t.syn || '')); t.fl = fold(t.label); }
  return (MAP.list = l);
}
const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
// every word must match; the targets whose own name has them all come first, then those found through their group
function mapSearch(q, max = 40) {
  const w = fold(q).split(/\s+/).filter(Boolean), a = [], b = [];
  for (const t of mapTargets()) if (w.every((x) => t.f.includes(x))) (w.every((x) => t.fl.includes(x)) ? a : b).push(t);
  return a.concat(b).slice(0, max);
}
// The banner while learn is on: a step badge (1 – waiting for a control on the device, 2 – for the target, ✓ – just
// assigned), what to do next (read out as it changes), the search, "Rückgängig" after an assignment, "Fertig". While a
// control waits for its target every target glows (ml-want).
function learnShow() {
  kcLearnSync();
  document.body.classList.toggle('ml-want', LEARN.on && !!LEARN.cap);
  const U = learnBar();
  if (!LEARN.on) { U.el.hidden = true; return; }
  // beside the open mixer on a phone held sideways: only as wide as the play field left of it
  const sh = $('#sheet');
  if (sh && !sh.hidden && sh.dataset.panel === 'mix') U.el.style.setProperty('--mlw', Math.max(180, Math.round(sh.getBoundingClientRect().left - 24)) + 'px');
  // a live region reads what changes in it: words set together with its appearing may go unread – so a frame later
  // (a timer where a hidden page has no frames)
  const appear = U.el.hidden;
  U.el.hidden = false;
  if (appear) { U.key = ''; U.msg.textContent = ''; const go = () => { if (LEARN.on && !U.key) learnShow(); }; requestAnimationFrame(go); setTimeout(go, 100); }
  const c = LEARN.cap, T = LEARN.tgt && mtOf(LEARN.tgt), b = (t) => h('b', null, t);
  const step = c ? '2' : !T && LEARN.said ? 'ok' : '1';
  // the parts in ml-opt / ml-tail give way on small screens (the search is not shown beside the open mixer on phones)
  const sp = (cls, t) => h('span', { class: cls }, t);
  const parts = c && LEARN.no ? [b(capText(c)), ' formt nur, ohne das Preset zu ändern – wähle ein Ziel aus „Formen“ (Höhe, Filter, Echo-Anteil …).']
    : c ? [b(capText(c)), ' – tippe jetzt auf das Ziel', sp('ml-opt', ' oder suche es'), '.'] : T ? ['Ziel: ', b(tName(T)), ' – ' + gkLearnAsk().replace(/^bewege/, 'bewege jetzt').replace(/^neige/, 'neige jetzt') + '.']
    : LEARN.said ? (LEARN.saidB ? ['Zugewiesen: ', b(LEARN.saidB), '.', sp('ml-tail', ' Nächster Regler – oder „Fertig“.')] : [LEARN.said]) : [gkLearnAsk()[0].toUpperCase() + gkLearnAsk().slice(1) + '.'];
  const key = step + parts.map((x) => (typeof x === 'string' ? x : x.textContent)).join('');
  if (U.key !== key && !appear) { U.key = key; U.msg.replaceChildren(...parts); }
  U.el.dataset.step = step;
  U.n.textContent = step === 'ok' ? '✓' : step;
  U.undo.hidden = !(LEARN.undo && step === 'ok');
}
function learnBar() {
  let U = LEARN.ui;
  if (!U) {
    const msg = h('p', { class: 'ml-msg', tabindex: '-1' }), n = h('span', { class: 'ml-n', 'aria-hidden': 'true' }, '1');
    const q = h('input', { type: 'search', class: 'ml-q', placeholder: 'Ziel suchen …', 'aria-label': 'Ziel suchen', enterkeyhint: 'search' });
    const list = h('div', { class: 'ml-list', role: 'group', 'aria-label': 'Ziele' });
    const undo = h('button', { type: 'button', class: 'btn ghost', hidden: true, onclick: learnUndo }, 'Rückgängig');
    const done = h('button', { type: 'button', class: 'btn', onclick: () => midiLearn(false) }, 'Fertig');
    q.addEventListener('input', () => learnList(q.value));
    U = LEARN.ui = { el: h('div', { class: 'mlearn-bar', role: 'region', 'aria-label': 'MIDI zuweisen', hidden: true }, h('div', { class: 'ml-top' }, n, h('div', null, msg, undo), done), h('div', { class: 'ml-row' }, q), list), msg, q, list, n, undo, key: '' };
    U.msg.setAttribute('aria-live', 'polite');
    ($('#app') || document.body).append(U.el);
  }
  return U;
}
function learnList(q) {
  const U = LEARN.ui;
  U.list.textContent = '';
  if (!q.trim()) return;
  // the chosen button goes with the list: the focus stays in the banner instead of falling to the page
  for (const r of mapSearch(q, 24)) U.list.append(h('button', { type: 'button', onclick: () => { learnPick(r.key); U.q.value = ''; U.list.textContent = ''; learnFocus(); } }, (r.group ? r.group + ' · ' : '') + r.label));
}
mapLoad();

