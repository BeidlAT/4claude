/* ---------- Touché: eigene Spielweisen (owner, 31.10.2026) ---------- */
// „Interessant wäre, wenn der User die Spielweisen umfangreich bearbeiten könnte – je Richtung Ziel, Stärke und Kurve
// einstellen, eigene Spielweisen speichern und benennen.“ An own Spielweise: a name, a Grundlage (one of the sixteen, or
// none) and for each of the four directions a list of routes { z: target, s: strength −1 … 1, k: curve }. A target is
// one of the Grundlage's four inputs ('b:weg' … – so a direction can drive another of its directions, or none), a target of
// Formen (MODT: Höhe, Filter, Hall …) or one of the Touché's own: Gleiten (a fifth), Vibrato, its tempo, the loop's tape
// (Platte). A new one starts as its Grundlage exactly (each direction to its own input); every change plays at once.
// Kept on this device (myzel.tch.eigen.v1), like the calibration.
const TCHE = { list: [], sel: null, on: new Set(), ed: null, raf: 0 };
const TCH_DIRS = [['weg', 'Weg drücken'], ['her', 'Heran ziehen'], ['li', 'Nach links'], ['re', 'Nach rechts']];
const TCH_KURVE = [['lin', 'Linear'], ['weich', 'Sanft beginnen'], ['schnell', 'Schnell da'], ['s', 'S-Kurve'], ['spaet', 'Erst ab einem Drittel']];
const tchKurve = (k, v) => (k === 'weich' ? v * v : k === 'schnell' ? Math.sqrt(v) : k === 's' ? v * v * (3 - 2 * v) : k === 'spaet' ? Math.max(0, (v - 1 / 3) * 1.5) : v);
// the targets, grouped as in the editor's list (labels of Formen's targets where there are some)
const TCH_ZG = [
  ['Ton', [['hoehe'], ['bend'], ['gleit', 'Tonhöhe bis eine Quinte (neuester Ton)'], ['vib', 'Vibrato – Tiefe (alle Töne)'], ['vibR', 'Vibrato – Tempo'], ['expr']]],
  ['Klangfarbe', [['flt'], ['pha'], ['rng'], ['vok'], ['vokO'], ['vokV'], ['bor']]],
  ['Raum', [['rev'], ['dly'], ['cho'], ['fx'], ['pan'], ['wow']]],
  ['Bewegung', [['morph'], ['platte', 'Band der Schleife: bremsen ↔ anschieben'], ['korD'], ['korS'], ['trp'], ['pulsD'], ['pulsH'], ['gspK'], ['rgx'], ['rgy'], ['rhzR']]]];
const tchZName = (z) => { if (z.startsWith('b:')) return 'Grundlage: ' + TCH_DIRS.find((d) => d[0] === z.slice(2))[1].toLowerCase(); for (const [, L] of TCH_ZG) for (const [k, n] of L) if (k === z) return n || (MODT[k] && MODT[k].label) || k; return z; };
const TCH_JS = new Set(['gleit', 'vib', 'vibR', 'platte']);   // (the Touché's own targets – touche.js)
(() => { try { const o = JSON.parse(store.get('myzel.tch.eigen.v1') || 'null'); if (o && Array.isArray(o.list)) { TCHE.list = o.list.filter((x) => x && x.id && x.dirs); TCHE.sel = TCHE.list.some((x) => x.id === o.sel) ? o.sel : null; } } catch (e) {} })();
function tchEigSave() { store.set('myzel.tch.eigen.v1', JSON.stringify({ list: TCHE.list, sel: TCHE.sel })); }
const tchEigCur = () => (TCHE.sel && TCHE.list.find((x) => x.id === TCHE.sel)) || null;
// the hand through the routes: the Grundlage's four inputs (0 … 1) and every other target's sum
function tchEigRoute(E, v) {
  const b = { weg: 0, her: 0, li: 0, re: 0 }, t = {};
  for (const [d] of TCH_DIRS) for (const r of E.dirs[d] || []) {
    const y = tchKurve(r.k, clamp(v[d] || 0, 0, 1)) * r.s;
    if (r.z.startsWith('b:')) b[r.z.slice(2)] += y; else t[r.z] = (t[r.z] || 0) + y;
  }
  for (const d in b) b[d] = clamp(b[d], 0, 1);
  return { b, t };
}
// the targets of Formen (and Gleiten) from the routes; those no longer fed leave
function tchEigMod(R) {
  const now = new Set();
  if (R) for (const k in R.t) {
    if (k === 'gleit') { modSet('map:tch:o:gleit', 'bend', clamp(R.t[k], -1, 1), { per: (tt, v, nw) => (nw ? v * 700 : 0) }); now.add(k); }
    else if (!TCH_JS.has(k) && MODT[k]) { modSet('map:tch:o:' + k, k, R.t[k]); now.add(k); }
  }
  for (const k of TCHE.on) if (!now.has(k)) modSet('map:tch:o:' + k, k === 'gleit' ? 'bend' : k, 0);
  TCHE.on = now;
}
// choose (null: leave the own one – the built-in in P['midi.tch'] plays again)
function tchEigSel(id, quiet) {
  const E = id && TCHE.list.find((x) => x.id === id);
  if ((E ? E.id : null) === TCHE.sel) { if (E && !quiet) toast('Touché: ' + E.name, 1800); return; }
  TCHE.sel = E ? E.id : null; tchEigSave();
  tchApply(); tchMark();
  if (E && !quiet) toast('Touché: ' + E.name + ' (eigene Spielweise)', 2000);
}
// a new one: the Grundlage the hand plays now, each direction to its own input – it sounds exactly as before
function tchEigNew(from) {
  const S = from ? JSON.parse(JSON.stringify(from)) : null, n = TCHE.list.length + 1;
  const base = S ? S.base : P['midi.tch'], nm = S ? S.name + ' (Kopie)' : (TCH_W.find((x) => x[0] === base) || [0, 'Eigene'])[1] + ' – eigene';
  const E = { id: 'e' + Date.now().toString(36) + n, name: nm, base, dirs: S ? S.dirs : Object.fromEntries(TCH_DIRS.map(([d]) => [d, [{ z: 'b:' + d, s: 1, k: 'lin' }]])) };
  TCHE.list.push(E); TCHE.sel = E.id; tchEigSave(); tchEigCards(); tchApply(); tchMark();
  return E;
}
function tchEigDel(E) {
  TCHE.list = TCHE.list.filter((x) => x !== E); if (TCHE.sel === E.id) TCHE.sel = null;
  tchEigSave(); tchEigCards(); tchApply(); tchMark(); toast('„' + E.name + '“ gelöscht.', 2200);
}
// the device card again (its row of own Spielweisen)
function tchEigCards() { if (typeof KC !== 'undefined' && typeof devEls !== 'undefined' && devEls && devEls.devs) { KC.sig = ''; kcDevsUI(); } }
// the card's row (geraet.js): the own ones and „Bearbeiten“ (an own one: it; a built-in: a new own one from it)
function tchEigRow(key) {
  const cur = tchEigCur();
  return h('div', { class: 'tche-row' }, h('span', { class: 'lab' }, 'Eigene Spielweisen'),
    h('div', { class: 'chips small', role: 'group', 'aria-label': 'Eigene Touché-Spielweisen' },
      ...TCHE.list.map((E) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(TCHE.sel === E.id), 'data-kc': key + ':tche:' + E.id, title: E.name + (E.base ? ' – auf ' + TCH_W.find((x) => x[0] === E.base)[1] : ''), onclick: () => tchEigSel(E.id) }, E.name)),
      h('button', { type: 'button', class: 'chip tche-edit', 'data-kc': key + ':tchedit', title: 'Die gewählte eigene Spielweise bearbeiten – bei einer der sechzehn: eine eigene Kopie von ihr anlegen und bearbeiten', onclick: () => tchEigOpen(tchEigCur() || tchEigNew()) }, cur ? 'Bearbeiten …' : '＋ Eigene aus dieser')));
}

/* the editor: name, Grundlage, the four directions with their routes; every change plays at once */
function tchEigOpen(E) {
  if (!E) return;
  if (!TCHE.ed) {
    TCHE.ed = h('div', { class: 'tche', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Spielweise bearbeiten', hidden: true });
    TCHE.ed.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tchEigClose(); } });
    document.body.append(TCHE.ed);
  }
  TCHE.cur = E; TCHE.ed.hidden = false;
  if (TCHE.sel !== E.id) tchEigSel(E.id, true);
  tchEigRender();
  if (!TCHE.raf) TCHE.raf = requestAnimationFrame(tchEigFrame);
  const f = TCHE.ed.querySelector('input'); if (f) f.focus();
}
function tchEigClose() { if (TCHE.ed) TCHE.ed.hidden = true; TCHE.cur = null; if (TCHE.raf) cancelAnimationFrame(TCHE.raf); TCHE.raf = 0; tchEigCards(); }
// a change: kept and heard
function tchEigTouch(rerender) { tchEigSave(); tchApply(); if (rerender) tchEigRender(); }
function tchEigRender() {
  const E = TCHE.cur, el = TCHE.ed; if (!E || !el) return;
  const opt = (v, t, on) => h('option', { value: v, selected: on ? '' : null }, t);
  const name = h('input', { type: 'text', class: 'tche-name', value: E.name, maxlength: 40, 'aria-label': 'Name der Spielweise' });
  name.addEventListener('input', () => { E.name = name.value.trim() || 'Ohne Namen'; tchEigSave(); });
  const base = h('select', { 'aria-label': 'Grundlage' }, opt('', 'Keine – nur die Ziele unten', !E.base), ...TCH_W.map(([w, nm]) => opt(w, nm, E.base === w)));
  base.addEventListener('change', () => {
    E.base = base.value;
    if (!E.base) for (const [d] of TCH_DIRS) E.dirs[d] = (E.dirs[d] || []).filter((r) => !r.z.startsWith('b:'));   // (no Grundlage: its inputs lead nowhere)
    tchEigTouch(true);
  });
  const x = h('button', { type: 'button', class: 'btn ghost tche-x', 'aria-label': 'Schließen', title: 'Schließen (Esc)', onclick: tchEigClose }, '✕');
  const head = h('div', { class: 'tche-h' }, h('h2', null, 'Spielweise bearbeiten'), h('span', { class: 'tche-sp' }), x);
  const top = h('div', { class: 'tche-top' }, h('label', null, h('span', null, 'Name'), name), h('label', null, h('span', null, 'Grundlage'), base));
  const note = h('p', { class: 'tche-note' }, E.base
    ? 'Die Grundlage klingt, wie die Hand ihre Eingänge „Grundlage: …“ treibt – lösche eine solche Zeile, und die Richtung tut dort nichts mehr; leg sie auf eine andere Richtung, und sie tauscht. Weitere Ziele kommen dazu.'
    : 'Ohne Grundlage tut jede Richtung genau das, was in ihren Zeilen steht.');
  const dirs = TCH_DIRS.map(([d, dn]) => {
    const rows = (E.dirs[d] = E.dirs[d] || []);
    const meter = h('span', { class: 'tche-m', 'data-d': d }, h('i'));
    const list = h('div', { class: 'tche-list' }, ...rows.map((r, i) => tchEigRowEd(E, d, r, i)));
    const add = h('button', { type: 'button', class: 'btn ghost tche-add', onclick: () => { rows.push({ z: 'hoehe', s: 0.5, k: 'lin' }); tchEigTouch(true); } }, '＋ Ziel');
    return h('section', { class: 'tche-dir' }, h('h3', null, dn, meter), rows.length ? list : h('p', { class: 'tche-none' }, 'Tut nichts.'), add);
  });
  const del = h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { if (confirm('„' + E.name + '“ löschen?')) { tchEigDel(E); tchEigClose(); } } }, 'Löschen');
  const dup = h('button', { type: 'button', class: 'btn ghost', onclick: () => { const N = tchEigNew(E); TCHE.cur = N; tchEigRender(); } }, 'Kopie anlegen');
  const done = h('button', { type: 'button', class: 'btn primary', onclick: tchEigClose }, 'Fertig');
  el.replaceChildren(head, top, note, h('div', { class: 'tche-dirs' }, ...dirs), h('div', { class: 'tche-foot' }, del, dup, h('span', { class: 'tche-sp' }), done));
}
// one route: target, strength (−100 … +100 %), curve, remove
function tchEigRowEd(E, d, r, i) {
  const opt = (v, t, on) => h('option', { value: v, selected: on ? '' : null }, t);
  const z = h('select', { 'aria-label': 'Ziel' },
    ...(E.base ? [h('optgroup', { label: 'Grundlage' }, ...TCH_DIRS.map(([b]) => opt('b:' + b, tchZName('b:' + b), r.z === 'b:' + b)))] : []),
    ...TCH_ZG.map(([g, L]) => h('optgroup', { label: g }, ...L.map(([k]) => opt(k, tchZName(k), r.z === k)))));
  z.addEventListener('change', () => { r.z = z.value; tchEigTouch(); });
  const val = h('output', { class: 'tche-v' }, Math.round(r.s * 100) + ' %');
  const s = h('input', { type: 'range', min: -100, max: 100, step: 5, value: Math.round(r.s * 100), 'aria-label': 'Stärke' });
  s.addEventListener('input', () => { r.s = +s.value / 100; val.textContent = s.value + ' %'; tchEigTouch(); });
  const k = h('select', { 'aria-label': 'Kurve' }, ...TCH_KURVE.map(([v, t]) => opt(v, t, r.k === v)));
  k.addEventListener('change', () => { r.k = k.value; tchEigTouch(); });
  const x = h('button', { type: 'button', class: 'btn ghost tche-del', 'aria-label': 'Ziel entfernen', title: 'Entfernen', onclick: () => { E.dirs[d].splice(i, 1); tchEigTouch(true); } }, '✕');
  return h('div', { class: 'tche-r' }, z, h('span', { class: 'tche-s' }, s, val), k, x);
}
// the four meters follow the hand while the editor is open
function tchEigFrame() {
  TCHE.raf = 0; if (!TCHE.ed || TCHE.ed.hidden) return;
  for (const m of TCHE.ed.querySelectorAll('.tche-m')) m.firstChild.style.width = Math.round(100 * (TCH.v[m.dataset.d] || 0)) + '%';
  TCHE.raf = requestAnimationFrame(tchEigFrame);
}
// learnable: each own Spielweise by its place in the list
for (let i = 1; i <= 8; i++) midiTarget('tche.' + i, 'Touché: eigene Spielweise ' + i, (v) => { if (v >= 0.5 && TCHE.list[i - 1]) tchEigSel(TCHE.list[i - 1].id); }, { group: 'Spielweise', button: true });
