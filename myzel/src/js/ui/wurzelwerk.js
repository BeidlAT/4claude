/* ---------- Wurzelwerk: the essentials in one place, from the bar (owner, 27.10.2026: „ein von der home gui aus
   erreichbares schnelle einstellmöglichkeit für all solche und ähnliche essentiellen dinge“) ----------
   The bar shows the tempo and the key at all times („♩ frei“ before the first Schleife gives one); a tap there opens the
   tempo's tools. The knot opens the Wurzelwerk over the field (the playing goes on): what has been sown, then Schleifen,
   Klang & Presets, Takt, Gerät, Gesichert. Its controls are the same params as at their homes (ctl – one value, many
   views). Säen: the spore tool, then a tap on any setting in Myzel sows it into the Wurzelwerk (myzel.ww.v1); a sown
   setting wears a small spore at its home. W (outside the field and text fields) opens and closes it, Esc closes.
   Etappe 2 (28.10.2026): Suche – „/“ opens it with the search field; every setting of Myzel (its name, its group, its
   choices) and every action is found and set right there, a spore sows it. */
const WW = { open: false, saen: false, set: new Set(), el: null, tiles: new Map(), qTiles: new Map(), taps: [], tk: null, pop: null, sig: '', q: '' };
try { const a = JSON.parse(store.get('myzel.ww.v1') || '["ui.tonart"]');   // (sown from the start: the key's direction – owner, 27.10.2026)
   if (Array.isArray(a)) for (const id of a) if (PD[id] || /^a:/.test(id)) WW.set.add(id); } catch (e) {}
// what can be sown: a param's control (data-ww; the mixer's data-pid) or an action (data-wa: a MIDI target – „a:key“)
const WW_SEL = '[data-ww],[data-wa],[data-pid]';
const wwKeyOf = (el) => (el.dataset.ww ? el.dataset.ww : el.dataset.wa ? 'a:' + el.dataset.wa : el.dataset.pid && PD[el.dataset.pid] ? el.dataset.pid : null);
const wwA = (el, key) => { if (el) el.dataset.wa = key; return el; };
function wwMarkIn(root) { for (const el of root.querySelectorAll(WW_SEL)) { const k = wwKeyOf(el); if (k) el.classList.toggle('ww-gesaet', WW.set.has(k)); } }
const wwLabel = (k) => { if (/^a:/.test(k)) { const t = MTARGETS.get(k.slice(2)); return t ? t.label : k.slice(2); } return PD[k] ? PD[k].label : k; };
ICON.knot = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.6"/><path d="M12 9.4V3.8M12 14.6v5.6M9.7 10.8 4.6 7.8M14.3 13.2l5.1 3M9.7 13.2l-5.1 3M14.3 10.8l5.1-3"/><circle cx="12" cy="3.4" r="1.1" fill="currentColor"/><circle cx="4.3" cy="7.6" r="1.1" fill="currentColor"/><circle cx="19.7" cy="16.4" r="1.1" fill="currentColor"/></svg>';
ICON.spore = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>';
const WW_GROUPS = [
  { k: 'schleifen', t: 'Schleifen', c: 'var(--spore)', ids: ['hx.beginn', ['hx.folgen', 'Tonart folgen'], 'hx.laenge', 'hx.start', 'hx.ein', 'hx.klick'] },
  { k: 'klang', t: 'Klang & Presets', c: 'var(--lilac)', ids: ['ui.tonart', 'ui.instrument', 'ui.leer', 't.root', 't.scale', ['rev.mix', 'Hall'], ['dly.mix', 'Echo'], ['flt.freq', 'Filter']] },
  { k: 'takt', t: 'Takt', c: 'var(--lumen)', ids: ['midi.clock'] },
  { k: 'geraet', t: 'Gerät', c: 'var(--rose)', ids: ['dev.lat', 'dev.q'] },
  { k: 'gesichert', t: 'Gesichert', c: '#7fb069', ids: [] },
];
const wwSave = () => store.set('myzel.ww.v1', JSON.stringify([...WW.set]));
const wwKey = () => NOTE_NAMES[+P['t.root']] + ' ' + ((SCALES[P['t.scale']] || {}).n || P['t.scale']);
// the tempo now: null while none is set (no Puls, no Takt Schleife, none kept – the first Schleife will give it)
const wwBpm = () => (A.ctx && typeof hxGrid === 'function' && hxGrid() ? tgBpm(hxNowT()) : null);
function wwTempoSet(b) {
  if (SEQ.ext) { toast('Das Tempo kommt gerade von der MIDI-Uhr.', 3000); return; }
  b = clamp(Math.round(b * 10) / 10, PD['seq.bpm'].min, PD['seq.bpm'].max);
  if (TG.hxOn) hxTempo(b); else setParam('seq.bpm', b);
  hxSay('Tempo ' + dec(b.toFixed(1)));
  wwTick(true);
}
function wwTempoFrei() {
  if (hxLoopsLive().some((L) => hxTakt(L))) { toast('Solange Schleifen im Takt liegen, bleibt ihr Tempo. Leere die Leiste, dann ist es frei.', 5000); return; }
  if (SEQ.on) seqStop();
  TG.keep = false; HX.keepT = null; hxTempoFree();
  toast('Tempo frei – die nächste Schleife, die du mit dem Korb erntest, gibt es vor.', 4500);
  wwTick(true);
}
function wwTap() {
  const now = performance.now();
  if (WW.taps.length && now - WW.taps[WW.taps.length - 1] > 2000) WW.taps = [];
  WW.taps.push(now); if (WW.taps.length > 8) WW.taps.shift();
  if (WW.taps.length < 3) { toast('Weiter tippen …', 900); return; }
  const d = []; for (let i = 1; i < WW.taps.length; i++) d.push(WW.taps[i] - WW.taps[i - 1]);
  d.sort((a, b) => a - b);
  wwTempoSet(60000 / d[Math.floor(d.length / 2)]);
}
// the tempo's tools – in the bar's popover and in the Takt group alike
function wwTaktTools() {
  const b = (t, fn, tip) => h('button', { type: 'button', class: 'chip', title: tip, onclick: fn }, t);
  const cur = () => wwBpm() || P['seq.bpm'];
  return h('div', { class: 'ww-tt' },
    h('div', { class: 'chips small' }, b('−1', () => wwTempoSet(cur() - 1), 'Langsamer'), b('+1', () => wwTempoSet(cur() + 1), 'Schneller'),
      b('Tippen', wwTap, 'Im Tempo tippen (drei Mal und mehr)'), b('½×', () => wwTempoSet(cur() / 2), 'Halbes Tempo'), b('2×', () => wwTempoSet(cur() * 2), 'Doppeltes Tempo')),
    h('div', { class: 'chips small' }, b('Tempo freigeben', wwTempoFrei, 'Kein Tempo: die erste Schleife, die du mit dem Korb erntest, gibt es vor'),
      b(TG.keep ? 'Tempo behalten ✓' : 'Tempo behalten', () => { TG.keep = !TG.keep; wwTick(true); wwRender(); }, 'Das Tempo bleibt, auch wenn die letzte Schleife geht')));
}
// the bar: tempo and key, a tap opens the tempo's tools
function wwTick(force) {
  if (!WW.tk) return;
  const b = wwBpm(), t = b == null ? '♩ frei · Tempo aus Schleife 1' : '♩ ' + dec(b.toFixed(1)) + ' BPM', k = wwKey(), sig = t + '|' + k;
  if (!force && sig === WW.sig) return;
  const was = WW.sig.startsWith('♩ frei');
  WW.sig = sig;
  WW.tkT.textContent = t; WW.tkK.textContent = k;
  WW.tk.classList.toggle('frei', b == null);
  if (was && b != null) { WW.tk.classList.remove('neu'); void WW.tk.offsetWidth; WW.tk.classList.add('neu'); }   // (the first Schleife gave the tempo: it lights up once)
  if (WW.bigT) { WW.bigT.textContent = b == null ? 'frei' : dec(b.toFixed(1)); WW.bigU.textContent = b == null ? 'Tempo aus Schleife 1' : 'BPM'; }
}
function wwPopToggle(on) {
  if (on == null) on = WW.pop.hidden;
  WW.pop.hidden = !on; WW.tk.setAttribute('aria-expanded', String(on));
  if (on) { const r = WW.tk.getBoundingClientRect(), a = $('#app').getBoundingClientRect(), w = Math.min(420, innerWidth - 32); WW.pop.style.left = clamp(r.left + r.width / 2 - a.left, 16 + w / 2, a.width - 16 - w / 2) + 'px'; }   // (under the display)
  if (on) WW.pop.replaceChildren(h('div', { class: 'ww-ph' }, 'Tempo'), wwTaktTools(), h('p', { class: 'note' }, wwBpm() == null ? 'Noch kein Tempo: spiel, dann tippe den Korb – Myzel findet Takt und Tempo aus dem Gespielten.' : 'Läuft: ' + (SEQ.ext ? 'nach der MIDI-Uhr' : TG.hxOn ? 'aus den Schleifen' : SEQ.on ? 'Puls' : 'Takt') + '.'));
}
// ---- the drawer ----
function wwTile(id) {
  let w = WW.tiles.get(id);
  if (!w) {
    const rm = h('button', { type: 'button', class: 'ww-rm', title: 'Aus dem Wurzelwerk nehmen', 'aria-label': wwLabel(id) + ' aus dem Wurzelwerk nehmen', html: ICON.spore, onclick: () => wwSow(id, false) });
    w = h('div', { class: 'ww-tile' }, rm, /^a:/.test(id) ? wwAct(id.slice(2)) : ctl(id, { prefix: 'ww-s-', label: (groupOf(id) ? groupOf(id) + ': ' : '') + PD[id].label }));   // (its group with it: „Hall: Anteil“)
    WW.tiles.set(id, w);
  }
  if (w.wwUpd) w.wwUpd();
  return w;
}
// an action sown: its MIDI target – a button presses it; a choice „(a · b · c)“ shows its steps; any other continuous one
// a slider of its 0…1
const wwGet = (t) => { try { return t.get ? t.get() : null; } catch (e) { return null; } };   // (a target whose binding is gone has nothing to show)
function wwAct(key) {
  const t = MTARGETS.get(key), box = h('div', { class: 'ctl wide ww-act' });
  if (!t) { box.append(h('p', { class: 'note' }, key + ' gibt es nicht mehr.')); return box; }
  const m = /^(.*?)\s*\(([^)]*·[^)]*)\)\s*$/.exec(t.label), name = m ? m[1] : t.label;
  if (t.cont && t.set) {
    const lab = h('div', { class: 'lab' }, name);
    if (m) {
      const steps = m[2].split('·').map((x) => x.trim()), n = steps.length, chips = steps.map((x, i) => h('button', { type: 'button', class: 'chip', onclick: () => { t.set((i + 0.5) / n); upd(); } }, x));
      const upd = () => { const g = wwGet(t); chips.forEach((c, i) => c.setAttribute('aria-checked', String(g != null && Math.min(n - 1, Math.round(g * (n - 1))) === i))); };
      box.append(lab, h('div', { class: 'chips small' }, ...chips)); box.wwUpd = upd; upd();
    } else {
      const r = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': name });
      r.addEventListener('input', () => { t.set(r.value / 1000); r.style.setProperty('--p', r.value / 10 + '%'); });
      const upd = () => { const g = wwGet(t); if (g != null) r.value = Math.round(g * 1000); r.style.setProperty('--p', r.value / 10 + '%'); };   // (the track filled as every slider's)
      box.append(lab, r); box.wwUpd = upd; upd();
    }
    return box;
  }
  box.append(h('button', { type: 'button', class: 'btn ww-go', onclick: () => { if (!A.started) { toast('Erst „Klang starten“.', 2000); return; } if (t.run) t.run(1); else if (t.press) { t.press(1, null); if (t.release) setTimeout(() => t.release(null), 120); } }, title: t.label }, name.replace(/\s*\(.*\)\s*$/, '')));
  return box;
}
function wwGesichert() {
  const K = (typeof HXKR !== 'undefined' && HXKR.list) || [], auto = K.filter((k) => k.auto), mb = Math.round(auto.reduce((s, k) => s + (k.bytes || 0), 0) / 1048576), last = auto[0];
  const own = UI.upr ? (userPresets().find((p) => p.name === UI.upr.name) || null) : null;
  return [h('p', { class: 'note' }, auto.length ? auto.length + (auto.length === 1 ? ' automatisch gesicherter Kreis' : ' automatisch gesicherte Kreise') + ' · ' + mb + ' MB · zuletzt ' + new Date(last.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Noch nichts automatisch gesichert – was die Leiste verlässt, landet hier.'),
    h('p', { class: 'note' }, own ? 'Eigenes Preset „' + own.name + '“' + (own.kr && own.kr !== 'leer' ? ' – seine Leiste ist gesichert.' : ' – noch ohne Leiste.') : 'Kein eigenes Preset geladen.'),
    h('div', { class: 'chips small' }, h('button', { type: 'button', class: 'chip', onclick: () => { if (typeof hxKrSave === 'function') hxKrSave(''); } }, 'Leiste jetzt sichern'),
      h('button', { type: 'button', class: 'chip', onclick: () => { wwToggle(false); hxCardOpen(); setTimeout(() => { if (HXK.kreise) HXK.kreise.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 220); } }, 'Kreise ↗'))];
}
// ---- Suche: the index (built once – the params and actions do not change while Myzel runs) and its matches ----
const wwNorm = (t) => String(t || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function wwIndex() {
  if (WW.idx) return WW.idx;
  const out = [];
  for (const id in PD) {
    const d = PD[id]; if (!d.label || !/^(num|sel|bool)$/.test(d.kind)) continue;
    const g = groupOf(id), opts = d.kind === 'sel' ? d.opts.map((o) => o[1]).join(' ') : '';
    out.push({ id, l: wwNorm(d.label), g: wwNorm(g), all: wwNorm([d.label, g, opts, id].join(' ')) });
  }
  for (const [k, t] of MTARGETS) { if (!t.label) continue; out.push({ id: 'a:' + k, l: wwNorm(t.label), g: wwNorm('aktion'), all: wwNorm(t.label + ' aktion ' + k) }); }
  return (WW.idx = out);
}
function wwFind(q) {
  const toks = wwNorm(q).split(/\s+/).filter(Boolean); if (!toks.length) return [];
  const hit = [];
  for (const e of wwIndex()) {
    if (!toks.every((t) => e.all.includes(t))) continue;
    let sc = 0;
    for (const t of toks) sc += e.l.startsWith(t) ? 6 : e.l.includes(t) ? 4 : e.g.startsWith(t) ? 3 : e.g.includes(t) ? 2 : 1;
    sc += /^(x|l\d)/.test(e.id) ? -2 : /^a:/.test(e.id) ? -1 : 3;   // (the settings themselves first, then the actions, then the mixer's and the lanes' copies)
    hit.push([sc - e.l.length / 200, e.id]);
  }
  hit.sort((a, b) => b[0] - a[0]);
  return hit.slice(0, 30).map((x) => x[1]);
}
// a found setting: its home (the group) above it, a spore to sow it; built once per id (a control binds for good)
function wwQTile(id) {
  let w = WW.qTiles.get(id);
  if (!w) {
    const lab = /^a:/.test(id) ? 'Aktion' : groupOf(id) || 'Allgemein';
    w = h('div', { class: 'ww-tile ww-qt' }, h('div', { class: 'ww-qwo' }, lab),
      h('button', { type: 'button', class: 'ww-rm ww-qs', title: 'Ins Wurzelwerk säen', 'aria-label': wwLabel(id) + ' ins Wurzelwerk säen', html: ICON.spore, onclick: () => { if (!WW.set.has(id)) wwSow(id, true); } }),
      /^a:/.test(id) ? wwAct(id.slice(2)) : ctl(id, { prefix: 'ww-q-' }));
    WW.qTiles.set(id, w);
  }
  w.classList.toggle('gesaet', WW.set.has(id));
  const a = w.querySelector('.ww-act'); if (a && a.wwUpd) a.wwUpd();
  return w;
}
function wwSearch(q) {
  WW.q = q;
  if (WW.qIn && WW.qIn.value !== q) WW.qIn.value = q;
  const on = !!q.trim();
  WW.sown.hidden = on; WW.groups.hidden = on; WW.res.hidden = !on;
  if (!on) return;
  const ids = wwFind(q);
  WW.res.replaceChildren(...(ids.length ? ids.map(wwQTile) : [h('p', { class: 'note' }, 'Nichts gefunden für „' + q.trim() + '“.')]));
}
function wwSearchOpen() { wwToggle(true); if (WW.qIn) { WW.qIn.focus(); WW.qIn.select(); } }
function wwBuild() {
  const app = $('#app');
  WW.el = h('section', { class: 'ww', id: 'ww', hidden: true, 'aria-label': 'Wurzelwerk' });
  WW.saenBtn = h('button', { type: 'button', class: 'ww-saen', 'aria-pressed': 'false', title: 'Säen: dann eine Einstellung irgendwo in Myzel antippen – sie kommt ins Wurzelwerk', html: ICON.spore + '<span>Säen</span>', onclick: () => wwSaen(!WW.saen) });
  const close = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Wurzelwerk schließen', html: ICON.close, onclick: () => wwToggle(false) });
  WW.sown = h('div', { class: 'ww-sown' });
  WW.groups = h('div', { class: 'ww-grid' });
  WW.foot = h('div', { class: 'ww-foot' });
  WW.res = h('div', { class: 'ww-res', hidden: true, role: 'region', 'aria-label': 'Suchergebnisse' });
  WW.qIn = h('input', { type: 'search', class: 'ww-q', placeholder: 'Suchen …  /', 'aria-label': 'Alle Einstellungen durchsuchen', autocomplete: 'off', spellcheck: 'false' });
  WW.qIn.addEventListener('input', () => wwSearch(WW.qIn.value));
  WW.qIn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && WW.qIn.value) { e.preventDefault(); e.stopPropagation(); wwSearch(''); }
    else if (e.key === 'Enter') { const f = WW.res.querySelector('input, select, button:not(.ww-qs)'); if (f) { e.preventDefault(); f.focus(); } }
    else if (e.key === 'ArrowDown') { const f = WW.res.querySelector('input, select, button:not(.ww-qs)'); if (f) { e.preventDefault(); f.focus(); } }
  });
  WW.el.append(h('div', { class: 'ww-hd' }, h('h2', null, 'wurzelwerk'), h('span', { class: 'ww-sub' }, 'das Wichtigste auf einen Blick'), WW.qIn, WW.saenBtn, close), WW.sown, WW.groups, WW.res, WW.foot);
  // the groups: built once (their controls bind for good), the Takt's and Gesichert's live lines on every open
  for (const g of WW_GROUPS) {
    const box = h('div', { class: 'ww-grp', 'data-g': g.k }, h('h3', null, h('i', { style: 'background:' + g.c }), g.t));
    if (g.k === 'takt') { WW.bigT = h('b', null, ''); box.append(h('div', { class: 'ww-big' }, WW.bigT, (WW.bigU = h('small', null, 'BPM'))), (WW.taktTools = h('div'))); }
    if (g.k === 'gesichert') box.append((WW.ges = h('div')));
    for (const x of g.ids) { const [id, label] = Array.isArray(x) ? x : [x]; if (PD[id]) box.append(ctl(id, { prefix: 'ww-' + g.k + '-', label })); }
    if (g.k === 'geraet') box.append((WW.dev = h('p', { class: 'note' })));
    WW.groups.append(box);
  }
  app.append(WW.el);
  // Säen: the tool's own layer (a banner while it is on) and the capture of a tap on any setting
  WW.ban = h('div', { class: 'ww-ban', hidden: true, role: 'status' }, h('span', { html: ICON.spore }), h('b', null, 'Säen'), ' – tippe eine Einstellung an. ', h('button', { type: 'button', class: 'chip', onclick: () => wwSaen(false) }, 'Fertig'));
  app.append(WW.ban);
  document.addEventListener('click', (e) => {
    if (!WW.saen) return;
    const w = e.target.closest && e.target.closest(WW_SEL);
    if (!w || WW.el.contains(w) || WW.ban.contains(w)) return;
    const id = wwKeyOf(w); if (!id) return;
    e.preventDefault(); e.stopPropagation();
    if (WW.set.has(id)) { toast('„' + wwLabel(id) + '“ ist schon im Wurzelwerk.', 2000); return; }
    wwSow(id, true); wwFly(e.clientX, e.clientY);
  }, true);
}
function wwRender() {
  if (!WW.el || WW.el.hidden) return;
  if (WW.q.trim()) wwSearch(WW.q);
  const ids = [...WW.set];
  for (const id of ids) { const w = WW.tiles.get(id); if (w) { const a = w.querySelector('.ww-act'); if (a && a.wwUpd) a.wwUpd(); } }
  WW.sown.replaceChildren(h('div', { class: 'ww-lab' }, 'GESÄT'), ...(ids.length ? ids.map(wwTile) : [h('p', { class: 'note' }, 'Tippe „Säen“ und dann eine Einstellung irgendwo in Myzel – Regler, Schalter, Auswahl. Sie wächst hier an.')]));
  WW.taktTools.replaceChildren(wwTaktTools());
  WW.ges.replaceChildren(...wwGesichert());
  const ins = typeof MIDI !== 'undefined' ? MIDI.srcs.size : 0;
  WW.dev.textContent = 'Controller: ' + (ins ? ins + ' verbunden' : 'keiner') + ' · ' + (FIREFOX ? 'Firefox' : /Edg\//.test(navigator.userAgent) ? 'Edge' : /Chrome\//.test(navigator.userAgent) ? 'Chrome' : 'Browser') + (A.ctx ? ' · Ausgabe ' + Math.round(((A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0)) * 1000) + ' ms' : '');
  WW.foot.textContent = '';
  try { if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { WW.foot.textContent = 'Speicher ' + Math.round((e.usage || 0) / 1048576) + ' MB belegt · / sucht · Säen: einmal tippen, dann die Einstellung · Esc schließt'; }); } catch (e) {}
  wwTick(true);
}
function wwToggle(on) {
  if (!WW.el) return;
  if (on == null) on = WW.el.hidden;
  if (on && WW.pop && !WW.pop.hidden) wwPopToggle(false);
  WW.el.hidden = !on; WW.btn.setAttribute('aria-expanded', String(on));
  if (on) { if (typeof HXKR !== 'undefined' && !HXKR.list && typeof hxKrList === 'function') hxKrList().then(() => wwRender()); wwRender(); }
}
// ---- Säen ----
function wwSaen(on) {
  WW.saen = !!on;
  document.body.classList.toggle('ww-saen-an', WW.saen);
  WW.saenBtn.setAttribute('aria-pressed', String(WW.saen));
  WW.ban.hidden = !WW.saen;
  if (WW.saen) { WW.el.hidden = true; WW.btn.setAttribute('aria-expanded', 'false'); toast('Säen: tippe eine Einstellung an – auch in den Bereichen unten. „Fertig“ oder Esc beendet.', 4000); }
  else if (WW.sowed) { WW.sowed = false; wwToggle(true); }
}
function wwSow(id, on) {
  if (on) WW.set.add(id); else WW.set.delete(id);
  wwSave(); wwMark(id);
  if (on) { WW.sowed = true; hxSay(wwLabel(id) + ' ins Wurzelwerk gesät'); }
  wwRender();
}
const wwMark = () => { for (const el of document.querySelectorAll(WW_SEL)) if (!WW.el || !WW.el.contains(el)) { const k = wwKeyOf(el); if (k) el.classList.toggle('ww-gesaet', WW.set.has(k)); } };
function wwFly(x, y) {
  const r = WW.btn.getBoundingClientRect(), s = h('i', { class: 'ww-fly', html: ICON.spore });
  s.style.left = x + 'px'; s.style.top = y + 'px';
  document.body.append(s);
  requestAnimationFrame(() => { s.style.transform = 'translate(' + (r.left + r.width / 2 - x) + 'px,' + (r.top + r.height / 2 - y) + 'px) scale(.4)'; s.style.opacity = '0.2'; });
  setTimeout(() => s.remove(), 700);
  WW.btn.classList.remove('neu'); void WW.btn.offsetWidth; WW.btn.classList.add('neu');
}
// ---- into the bar (from buildUI) ----
function wwInit() {
  if (!store.get('myzel.tonart.v3')) { store.set('myzel.tonart.v2', '1'); store.set('myzel.tonart.v3', '1'); if (P['ui.tonart'] !== 'preset') setParam('ui.tonart', 'preset'); }   // (once: the new default for everyone, also who kept the old one – owner, 29.10.2026)
  const bar = $('#bar'), rec = $('#btnRec');
  WW.tkT = h('span', { class: 'ww-tkt' }); WW.tkK = h('span', { class: 'ww-tkk' });
  WW.tk = h('button', { type: 'button', class: 'ww-tk', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', title: 'Tempo und Tonart – tippen: Tempo einstellen', onclick: () => wwPopToggle() }, WW.tkT, h('i', null, '·'), WW.tkK);
  WW.btn = h('button', { type: 'button', class: 'iconbtn ww-btn', 'aria-expanded': 'false', 'aria-controls': 'ww', 'aria-label': 'Wurzelwerk', title: 'Wurzelwerk – das Wichtigste auf einen Blick (W)', html: ICON.knot, onclick: () => wwToggle() });
  WW.pop = h('div', { class: 'ww-pop', role: 'dialog', 'aria-label': 'Tempo', hidden: true });
  bar.insertBefore(WW.btn, rec); bar.insertBefore(WW.tk, rec); bar.insertBefore(h('div', { class: 'ww-gap' }), rec);
  $('#app').append(WW.pop);
  wwBuild();
  wwMark();
  setInterval(() => wwTick(false), 250);
  document.addEventListener('pointerdown', (e) => { if (WW.pop && !WW.pop.hidden && !WW.pop.contains(e.target) && !WW.tk.contains(e.target)) wwPopToggle(false); }, true);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && WW.saen) { e.preventDefault(); e.stopImmediatePropagation(); wwSaen(false); } }, true);   // (Säen first: the panel it sows from stays open)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (WW.pop && !WW.pop.hidden) { wwPopToggle(false); return; } if (WW.el && !WW.el.hidden) { wwToggle(false); e.preventDefault(); } return; }
    if ((e.key === 'w' || e.key === 'W' || e.key === '/') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
      const a = document.activeElement;
      if (a && (a.id === 'cvFx' || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      e.preventDefault();
      if (e.key === '/') wwSearchOpen(); else wwToggle();
    }
  });
  wwTick(true);
}
