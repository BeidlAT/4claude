/* ---------- Klangquellen: the row at every place a source is chosen, and the library ---------- */
// Every place a source is chosen – the field, the second layer, the four Puls lanes, their copies in the mixer's
// Fruchtkörper, the Sporenregen – shows one row: ‹ · glyph, name · family, sentence · ›. ‹ › step to the neighbour in
// ENG_OPTS (no wrap; sources the place cannot take are passed) and play a short probe – not while that place sounds
// (a held finger, its running lane, the rain); a tap on the name opens the library, holding the name plays the source
// for as long as it is held; the die picks a surprise (the source only, never its knobs) with Rückgängig.
// The library lives once in the sheet, over the panel; the sheet grows as it does for the mixer, so about 130 px of the
// field stay playable – tap a tile, then try it with a finger. Search, the family row (★ Favoriten, ⟲ Zuletzt, Alle and
// the five families), tiles (glyph, name, how it plays, cost dots with the voices this device has for it, the sentence,
// ★ and ▶). It opens on the family of the chosen source. Favourites and the recent ones are this device's
// (myzel.klang.v1), never the patch's.
const KQ_KEY = 'myzel.klang.v1';
const KQ_PIDS = ['v.eng', 'v.layer', 'l0.eng', 'l1.eng', 'l2.eng', 'l3.eng', ...EB.slice(2).map((e) => e.eng)];   // (Ebenen 3–8, 30.10.2026)
const KQ = { fav: [], recent: [], T: null, fam: '', q: '', where: '', el: null, probe: null, hold: null, rows: new Set(), miss: [], openers: new Set(), opener: null,
  save() { store.set(KQ_KEY, JSON.stringify({ fav: this.fav, recent: this.recent })); } };
(() => { try { const o = JSON.parse(store.get(KQ_KEY) || 'null'); if (o && typeof o === 'object') { if (Array.isArray(o.fav)) KQ.fav = o.fav.filter((k) => typeof k === 'string').slice(0, 64); if (Array.isArray(o.recent)) KQ.recent = o.recent.filter((k) => typeof k === 'string').slice(0, 7); } } catch (e) {} })();
const KQ_ICO = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.6"/><g fill="currentColor" stroke="none"><circle cx="8.6" cy="8.6" r="1.35"/><circle cx="15.4" cy="8.6" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="8.6" cy="15.4" r="1.35"/><circle cx="15.4" cy="15.4" r="1.35"/></g></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z"/></svg>',
  recent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.2"/><path d="M4.4 4.6v3.8h3.8M12 8v4.4l2.8 1.8"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.8v12.4L18.2 12z"/></svg>',
  find: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
};
const SVGNS = 'http://www.w3.org/2000/svg';
const kqHref = (k) => '#g-' + (k === 'off' || !ENG_META[k] ? 'off' : k);
function kqGlyph(k, cls) {
  const s = document.createElementNS(SVGNS, 'svg'), u = document.createElementNS(SVGNS, 'use');
  s.setAttribute('class', 'kq-g' + (cls ? ' ' + cls : '')); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  u.setAttribute('href', kqHref(k)); s.append(u);
  return s;
}
const listDe = (a, w = 'und') => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + w + ' ' + a[a.length - 1]);
const kqKeysOf = (f) => ENG_OPTS.map((o) => o[0]).filter((k) => ENG_META[k].fam === f);
// a worklet source this browser plays as its stand-in (the key stays in the patch), and one whose module still loads
const kqFb = (k) => (ENGINES[k] && ENGINES[k].needs === 'worklet' && ENGINES[k].fallback !== 'native' && (DSP.state === 'kein' || A.workletBroken.has(k)) ? ENGINES[k].fallback : '');   // (a native stand-in of its own plays as itself)
const kqLoading = (k) => !!(ENGINES[k] && ENGINES[k].needs === 'worklet' && DSP.state === 'laden');
// cost in units of a level-1 Nebel voice → dots, a word, the voices this device has for it
function kqCost(k) {
  const c = Q.cost[k] || 1, n = Math.max(1, Math.floor(VBUDGET / c));
  return { dots: c <= 0.5 ? 1 : c <= 1 ? 2 : 3, word: c <= 0.5 ? 'gering' : c <= 1 ? 'mittel' : 'hoch', n, txt: 'Kosten ' + dec(c.toFixed(2)) + ' – etwa ' + n + ' Stimmen auf diesem Gerät' };
}
// families by how their sources play – for the help texts (generated, never a list of sources)
function famPlay() {   // (a family by the way most of its sources play – each tile says its own)
  const held = (f) => kqKeysOf(f).filter((k) => ENG_META[k].art === 'haelt').length * 2 > kqKeysOf(f).length;
  const hold = FAM.filter(([f]) => kqKeysOf(f).length && held(f)).map((f) => f[1]);
  const strike = FAM.filter(([f]) => kqKeysOf(f).length && !held(f)).map((f) => f[1]);
  return { hold, strike };
}
// search: name, family, how it plays, sentence, height word, tags; ö = oe = o, ß = ss
const kqNorm = (s) => String(s).toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/([aou])e/g, '$1');
const KQ_HAY = {};
const kqHay = (k) => KQ_HAY[k] || (KQ_HAY[k] = kqNorm([ENG_META[k].n, FAM_NAME[ENG_META[k].fam], ART_WORD[ENG_META[k].art], ENG_META[k].i, ENG_META[k].hoehe || '', ENG_META[k].tags || ''].join(' ')));

// the places a source is chosen: get/set, the choices, what it cannot take (and why), how a probe sounds there, and
// whether it sounds right now (then ‹ › do not probe – no stray note in a performance)
const KQ_T = {};
function kqTarget(key) {
  if (KQ_T[key]) return KQ_T[key];
  const all = () => ENG_OPTS, ok = () => '', mid = () => noteAt(0.5);
  let T;
  if (key === 'v.eng') T = { where: 'Spielfläche', dat: 'die Spielfläche', ch: 'Klang', opts: all, allow: ok, busy: () => touches.size > 0,
    probe: () => { const nt = mid(); return { f: lyF(layers()[0], nt.f, nt.idx), y: 0.5, vel: P['v.vel'], bus: stripIn('fin') }; } };
  else if (key === 'v.layer') T = { where: 'zweite Ebene', dat: 'die zweite Ebene', ch: 'Ebene 2', opts: () => PD['v.layer'].opts, allow: ok, busy: () => touches.size > 0,
    probe: () => { const nt = mid(); return { f: lyF({ ratio: Math.pow(2, P['v.layerInt'] / 12), deg: P['v.layerDeg'] }, nt.f, nt.idx), y: 0.5, vel: P['v.vel'] * Math.max(0.35, P['v.layerLvl']), bus: stripIn('eb2') }; } };
  else if (/^e\d\.eng$/.test(key)) {   // (Ebenen 3–8, 30.10.2026: as Ebene 2 – the note in the middle at its interval)
    const e = EB.find((x) => x.eng === key), w = 'Ebene ' + e.n;
    T = { where: w, dat: w, ch: w, opts: () => PD[key].opts, allow: ok, busy: () => touches.size > 0,
      probe: () => { const nt = mid(), fine = P[e.pre + 'fine']; return { f: lyF({ ratio: Math.pow(2, P[e.int] / 12 + fine / 1200), deg: P[e.deg] }, nt.f, nt.idx), y: 0.5, vel: P['v.vel'] * Math.max(0.35, P[e.lvl]), bus: stripIn(e.k) }; } };
  } else if (/^l\d\.eng$/.test(key)) {
    const i = +key[1], p = 'l' + i + '.';
    T = { where: 'Spur ' + (i + 1), dat: 'Spur ' + (i + 1), ch: 'Spur ' + (i + 1), lane: i, opts: all, allow: ok, busy: () => SEQ.on && !!P[p + 'on'],
      // the lane's own note (its step and octave, without its walk), brightness, level, balance and gate, through its channel
      probe: () => {
        const len = N.free ? 12 * P['t.range'] + 1 : N.notes.length, idx = clamp(P[p + 'deg'], 0, Math.max(0, len - 1));
        const f = (N.free ? N.base * ratioForSemi(idx) : N.notes[idx].f) * Math.pow(2, P[p + 'oct']);
        return { f, y: P[p + 'bright'], vel: Math.max(0.3, P[p + 'vol']), pan: P[p + 'pan'], gate: divBeats(P[p + 'div']) * 60 / seqBpm() * 0.9, strike: true, bus: stripIn('l' + i) };
      } };
  } else if (key === 'rgS') T = { where: 'Sporenregen', dat: 'den Sporenregen', ch: 'Regen', opts: all, get: () => GK.p.rgS,
    set: (k) => { gkSet('rgS', k); if (k === 'sai') warmKS(); gkCardSync(); kqUsed(k); kqSyncRows(); const q = MXD.qu.rgn; if (q && q.sync) q.sync(); },
    allow: (k) => (ENGINES[k].sustain ? 'hält – der Regen braucht einen Anschlag' : ENG_META[k].regen === 0 ? 'blüht zu lange nach für den Regen' : ''),
    why: 'Der Regen schlägt an – gehaltene Quellen sind hier grau.', quiet: (k) => ENGINES[k].sustain, busy: () => RG.on && RG.k.length > 0,
    probe: () => ({ f: mid().f, y: 0.5, vel: 0.7, strike: true, bus: stripIn('rgn') }) };
  else return null;
  T.key = key;
  if (!T.get) { T.id = key; T.get = () => P[key]; T.set = (k) => setParam(key, k); }
  return (KQ_T[key] = T);
}
function kqUsed(k) {
  if (!ENG_META[k]) return;
  KQ.recent = [k, ...KQ.recent.filter((x) => x !== k)].slice(0, 7);
  KQ.save();
}
function kqSyncRows() { for (const f of KQ.rows) f(); }
// after a change of the module's state, the quality level or the favourites: every row, the open library, the bar
function kqSyncAll() { kqSyncRows(); if (KQ.T) kqRender(); refreshEngineUI(); }
// a polite word for screen readers: in the library its footer, else a hidden region
function kqSay(msg) {
  const el = KQ.T && KQ.live ? KQ.live : $('#kqSay');
  if (!el) return;
  el.textContent = msg || (KQ.T ? kqCount() : '');
}
const kqCount = () => ENG_OPTS.length + ' Quellen' + (KQ.fav.filter((k) => ENG_META[k]).length ? ' · ' + KQ.fav.filter((k) => ENG_META[k]).length + ' ★' : '');

/* hearing: one probe at a time, through the place's own channel and effects; it changes nothing in the patch */
function kqProbeEnd() {
  const v = KQ.probe; KQ.probe = null;
  if (v && v.alive && A.ctx) { v.probeEnd = true; vFade(v); }
  if (KQ.el) for (const b of KQ.el.querySelectorAll('.kq-hear.playing')) b.classList.remove('playing');
}
function kqHear(T, k, held) {
  if (!A.ctx || !A.started || !T || k === 'off' || !ENGINES[k]) return null;
  ensureRunning();
  kqProbeEnd();
  const E = ENGINES[k], M = ENG_META[k] || {}, o = T.probe(), now = A.ctx.currentTime + 0.01, opt = { pan: o.pan || 0, bus: o.bus };
  // a worklet source loads its module now – until it stands, the probe sounds as the stand-in
  if (E.needs === 'worklet' && !A.ctx.__dspOK) { ensureDSP().then(kqSyncAll); kqSyncAll(); }
  let v;
  if (held) v = playNote(k, now, o.f, o.y, o.vel, opt);
  else if (o.strike || !E.sustain) v = hit(k, now, o.f, o.y, o.vel, Object.assign({ gate: o.gate || 0.4 }, opt));
  else v = playNote(k, now, o.f, o.y, o.vel, Object.assign({ burst: true, gate: (M.hear && M.hear.gate) || 1.2 }, opt));
  if (v) { v.probe = true; KQ.probe = v; hxEvProbe(v); }   // (Hexenring: a probe is no note of the Humus)
  return v;
}
function kqHold(T, k) { const v = kqHear(T, k, true); KQ.hold = v; return v; }
function kqHoldEnd() {
  const v = KQ.hold; KQ.hold = null;
  if (v && v.alive && !v.released && v.release) v.release(1);
}
// a long press (≥ 400 ms without moving 8 px) plays while held; dragging up and down then moves the height. The tap
// that ends it is swallowed (el._heldT). sel: delegate to the element under the finger
function kqPress(el, start, end, sel, ms = 400) {
  el.addEventListener('contextmenu', (e) => { if (!sel || e.target.closest(sel)) e.preventDefault(); });
  el.addEventListener('touchmove', (e) => { if (el._holding && e.cancelable) e.preventDefault(); }, { passive: false });
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const t = sel ? e.target.closest(sel) : el;
    if (!t) return;
    const x0 = e.clientX, y0 = e.clientY;
    let v = null, fired = false;
    const tm = setTimeout(() => { fired = true; el._holding = true; try { el.setPointerCapture(e.pointerId); } catch (err) {} v = start(t); }, ms);
    const mv = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const dy = ev.clientY - y0;
      if (!fired) { if (Math.hypot(ev.clientX - x0, dy) > 8) done(ev); return; }
      if (v && v.alive && v.setY) v.setY(clamp(0.5 - dy / 160, 0, 1));
    };
    const done = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      clearTimeout(tm);
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', done); el.removeEventListener('pointercancel', done);
      if (fired) { el._holding = false; el._heldT = performance.now(); kqHoldEnd(); if (end) end(t); }
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', done); el.addEventListener('pointercancel', done);
  });
}
const kqSwallow = (el) => performance.now() - (el._heldT || 0) < 450;

/* choosing */
function kqStepTo(T, d) {
  const L = T.opts(), i = L.findIndex((o) => o[0] === T.get());
  for (let j = i + d; j >= 0 && j < L.length; j += d) if (L[j][0] === 'off' || !T.allow(L[j][0])) return L[j][0];
  return null;
}
// how: 'step' (‹ ›: no probe while the place sounds), 'pick' (a tile: a probe), 'quiet' (no probe) – never a probe while
// Myzel sounds or records (owner, 28.10.2026: „während eines schleifen-spiels … ertönt kurz der sound der neuen klangquelle
// … störend, insbesondere wenn gerade eine aufnahme läuft“); „Anhören“ on a tile still plays it
const kqLoud = () => !!A.started && (CAP.state !== 'idle' || SEQ.on || !!A.bor || touches.size > 0 || (typeof hxLoopsLive === 'function' && hxLoopsLive().some((L) => L.state === 'spielt')) || !!(typeof HX !== 'undefined' && (HX.rec || HX.punch)));
function kqChoose(T, k, how) {
  const why = k === 'off' ? '' : T.allow(k);
  if (why) { kqSay(ENG_NAME[k] + ': ' + why + '.'); return false; }
  if (T.get() !== k) T.set(k);
  if (k === 'off') kqProbeEnd();
  else if (!kqLoud() && (how === 'pick' || (how === 'step' && !T.busy()))) kqHear(T, k);
  kqSay(k === 'off' ? 'Zweite Ebene aus' : ENG_NAME[k] + ' gewählt für ' + (KQ.T === T && KQ.where !== T.where ? KQ.where : T.dat));
  return true;
}
function kqStep(T, d) { const k = kqStepTo(T, d); return k != null && kqChoose(T, k, 'step'); }
// a surprise: a source the place can take, not the chosen one, one never chosen lately first; in the library from the
// tiles in view. The row's die says it in a toast with Rückgängig
function kqSurprise(T, inline) {
  if (!T) return null;
  const cur = T.get();
  const keys = !inline && KQ.list ? [...KQ.list.querySelectorAll('.kq-tile')].map((t) => t.dataset.k) : T.opts().map((o) => o[0]);
  const pool = keys.filter((k) => k !== 'off' && k !== cur && ENG_META[k] && !T.allow(k));
  if (!pool.length) { if (!inline) kqSay('Keine andere Quelle in dieser Ansicht.'); return null; }
  const fresh = pool.filter((k) => !KQ.recent.includes(k));
  const k = pick(fresh.length ? fresh : pool);
  kqChoose(T, k, 'pick');
  if (inline) toast('Überraschung: ' + ENG_NAME[k] + ' – ' + ENG_INFO[k], 6000, { label: 'Rückgängig', fn: () => { kqChoose(T, cur, 'quiet'); kqSay(cur === 'off' ? 'Zweite Ebene wieder aus' : 'Wieder ' + ENG_NAME[cur]); } });
  else { kqRender(k); kqSay('Zufall: ' + ENG_NAME[k]); }
  return k;
}

/* the row */
function kqRow(T, o = {}) {
  const did = o.id || 'kq-' + T.key.replace(/\./g, '-'), labId = did + '-l';
  const lab = h('div', { class: 'lab', id: labId }, o.label || 'Klangquelle');
  const dice = h('button', { type: 'button', class: 'kq-dice', title: 'Überrasch mich', 'aria-label': 'Überrasch mich: eine zufällige Klangquelle für ' + T.dat, html: KQ_ICO.dice, onclick: () => kqSurprise(T, true) });
  const prev = h('button', { type: 'button', class: 'kq-step', 'aria-label': 'Vorige Klangquelle', title: 'Vorige Klangquelle', html: KQ_ICO.prev });
  const next = h('button', { type: 'button', class: 'kq-step', 'aria-label': 'Nächste Klangquelle', title: 'Nächste Klangquelle', html: KQ_ICO.next });
  const g = kqGlyph('neb'), nm = h('span', { class: 'kq-n' }), inf = h('span', { class: 'kq-i' });
  const name = h('button', { type: 'button', class: 'kq-name', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'kqLib', title: 'Bibliothek öffnen – lange drücken: anhören' }, g, nm, inf);
  const row = h('div', { class: 'kq-row', role: 'group', 'aria-labelledby': labId, id: did }, prev, name, next);
  const where = o.where || T.where;
  const step = (d) => { kqStep(T, d); if (document.activeElement && document.activeElement.disabled) name.focus(); };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  name.addEventListener('click', () => { if (!kqSwallow(name)) kqOpen(T, { opener: name, where }); });
  name.addEventListener('keydown', (e) => { if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.metaKey) { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); } });
  kqPress(name, () => { const k = T.get(); if (k === 'off') return null; name.classList.add('held'); return kqHold(T, k); }, () => name.classList.remove('held'));
  const sync = () => {
    const k = T.get(), off = k === 'off', M = ENG_META[k], fb = off ? '' : kqFb(k);
    g.firstChild.setAttribute('href', kqHref(k)); g.classList.toggle('loading', kqLoading(k));
    const fam = off ? 'keine zweite Ebene' : M ? FAM_NAME[M.fam] : '';
    nm.replaceChildren(off ? 'Aus' : ENG_NAME[k] || k, h('small', null, ' · ' + fam));
    inf.replaceChildren(...(fb ? [h('span', { class: 'kq-fb' }, '⌁ spielt als ' + ENG_NAME[fb]), ' · '] : []), off ? 'Tippen öffnet die Bibliothek' : ENG_INFO[k] || '');
    name.setAttribute('aria-label', 'Klangquelle für ' + T.dat + ': ' + (off ? 'aus' : (ENG_NAME[k] || k) + (M ? ', ' + fam + ', ' + ART_WORD[M.art] : '') + (fb ? ', spielt als ' + ENG_NAME[fb] : '')) + '. Bibliothek öffnen');
    prev.disabled = kqStepTo(T, -1) == null; next.disabled = kqStepTo(T, 1) == null;
    row.classList.toggle('off', off);
  };
  KQ.rows.add(sync);
  if (T.id) bindCtl(T.id, sync); else sync();
  const wrap = h('div', { class: 'ctl wide kq', 'data-pid': o.pid || null }, h('div', { class: 'ctl-row' }, lab, dice), row);
  wrap.sync = sync; wrap.dice = dice; wrap.row = row;
  return wrap;
}

/* the library */
function kqBuild() {
  const back = h('button', { type: 'button', class: 'iconbtn kq-back', 'aria-label': 'Zurück', title: 'Zurück', html: KQ_ICO.prev, onclick: () => kqClose() });
  const title = h('h2', { id: 'kqTitle' });
  const done = h('button', { type: 'button', class: 'btn primary kq-done', onclick: () => kqClose() }, 'Fertig');
  const head = h('div', { class: 'kq-head' }, back, title, done);
  const search = h('input', { type: 'search', id: 'kqSearch', placeholder: 'Suchen – Name, Stichwort', 'aria-label': 'Klangquellen durchsuchen', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search' });
  const fams = h('div', { class: 'chips kq-fams', role: 'radiogroup', 'aria-label': 'Familie' });
  const famBtns = [['fav', KQ_ICO.star, 'Favoriten'], ['recent', KQ_ICO.recent, 'Zuletzt'], ['alle', 'Alle'], ...FAM.map(([f, n]) => [f, n])].map(([f, t, al]) => {
    const b = h('button', al ? { type: 'button', class: 'chip ico', role: 'radio', 'aria-checked': 'false', tabindex: '-1', 'aria-label': al, title: al, html: t } : { type: 'button', class: 'chip', role: 'radio', 'aria-checked': 'false', tabindex: '-1' }, al ? null : t);
    b.dataset.fam = f; fams.append(b); return b;
  });
  const list = h('div', { class: 'kq-list', role: 'radiogroup', 'aria-label': 'Klangquelle', 'aria-describedby': 'kq-keys' });
  const sur = h('button', { type: 'button', class: 'btn ghost kq-sur', 'aria-label': 'Überrasch mich', title: 'Überrasch mich: eine zufällige Quelle aus dieser Ansicht', html: KQ_ICO.dice + '<span>Überrasch mich</span>', onclick: () => kqSurprise(KQ.T, false) });
  const live = h('p', { class: 'kq-live', 'aria-live': 'polite' });
  const keys = h('p', { id: 'kq-keys', hidden: true }, 'Pfeiltasten wandern durch die Quellen, Leertaste oder Eingabe wählt und spielt kurz, Umschalt und Leertaste hält sie länger, f markiert als Favorit, h hört an, ein Buchstabe springt zur nächsten Quelle mit diesem Anfang. Escape schließt.');
  const el = h('div', { class: 'kq-lib', id: 'kqLib', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'kqTitle', hidden: true },
    head, h('label', { class: 'kq-search', html: KQ_ICO.find }, search), fams, list, h('div', { class: 'kq-foot' }, sur, live), keys);
  Object.assign(KQ, { el, title, search, fams, famBtns, list, live, sur });
  sheet.append(el);
  search.addEventListener('input', () => { KQ.q = search.value; kqRender(); kqSay(KQ.q.trim() ? (list.querySelectorAll('.kq-tile').length || 'Keine') + ' Treffer' : ''); });
  search.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.isComposing)) { const t = list.querySelector('.kq-pick[tabindex="0"]'); if (t) { e.preventDefault(); t.focus(); } } });
  const famGo = (b, focus) => {
    KQ.fam = b.dataset.fam; KQ.q = ''; search.value = ''; kqRender(); kqSay(''); list.scrollTop = 0;
    if (focus) b.focus({ preventScroll: true });
    kqFamShow(b);
  };
  fams.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) famGo(b, false); });
  fams.addEventListener('keydown', (e) => {
    const i = famBtns.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? Math.min(famBtns.length - 1, i + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? Math.max(0, i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? famBtns.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault(); famGo(famBtns[j], true);
  });
  const fade = () => { fams.classList.toggle('kq-a0', fams.scrollLeft <= 4); fams.classList.toggle('kq-a1', fams.scrollLeft + fams.clientWidth >= fams.scrollWidth - 4); };
  fams.addEventListener('scroll', fade, { passive: true });
  KQ.famFade = fade;
  list.addEventListener('click', (e) => {
    if (kqSwallow(list)) return;
    const tile = e.target.closest('.kq-tile'); if (!tile) return;
    const k = tile.dataset.k;
    if (e.target.closest('.kq-fav')) kqFav(k);
    else if (e.target.closest('.kq-hear')) kqHearTile(k);
    else if (e.target.closest('.kq-pick')) kqPick(k);
  });
  kqPress(list, (t) => {
    const k = t.closest('.kq-tile').dataset.k;
    if (k === 'off' || !KQ.T) return null;
    const v = kqHold(KQ.T, k), hb = t.closest('.kq-tile').querySelector('.kq-hear');
    if (hb) hb.classList.add('playing');
    return v;
  }, (t) => { const hb = t.closest('.kq-tile') && t.closest('.kq-tile').querySelector('.kq-hear'); if (hb) hb.classList.remove('playing'); }, '.kq-pick, .kq-hear', 350);
  list.addEventListener('keydown', kqListKey);
  // modal: Tab stays inside
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('button, input')].filter((x) => !x.disabled && x.tabIndex >= 0 && x.getClientRects().length);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
  });
  // a swipe down on the head closes it
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const y0 = e.clientY, id = e.pointerId;
    const mv = (ev) => { if (ev.pointerId === id && ev.clientY - y0 > 56) { up(ev); kqClose(); } };
    const up = (ev) => { if (ev.pointerId !== id) return; head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); };
    try { head.setPointerCapture(id); } catch (err) {}
    head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
  });
}
// a family chip in view, clear of the row's fading right edge
function kqFamShow(b) {
  const f = KQ.fams.getBoundingClientRect(), r = b.getBoundingClientRect();
  if (r.right > f.right - 28) KQ.fams.scrollLeft += r.right - f.right + 28;
  else if (r.left < f.left + 12) KQ.fams.scrollLeft += r.left - f.left - 12;
}
function kqListKey(e) {
  const picks = [...KQ.list.querySelectorAll('.kq-pick')], i = picks.indexOf(document.activeElement);
  if (i < 0) return;
  const k = picks[i].closest('.kq-tile').dataset.k, mods = e.ctrlKey || e.metaKey || e.altKey;
  let j = -1;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(picks.length - 1, i + 1);
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(0, i - 1);
  else if (e.key === 'Home') j = 0;
  else if (e.key === 'End') j = picks.length - 1;
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (e.repeat) return;
    if (e.key === ' ' && e.shiftKey && k !== 'off') { const v = kqHold(KQ.T, k); if (v) setTimeout(() => { if (KQ.hold === v) kqHoldEnd(); }, 1200); }
    else kqPick(k);
    return;
  } else if (!mods && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); kqFav(k); return; }
  else if (!mods && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); kqHearTile(k); return; }
  else if (!mods && e.key.length === 1 && /\p{L}/u.test(e.key)) {
    const c = kqNorm(e.key)[0];
    for (let n = 1; n <= picks.length; n++) { const p = picks[(i + n) % picks.length], kk = p.closest('.kq-tile').dataset.k; if (kqNorm(kk === 'off' ? 'aus' : ENG_NAME[kk])[0] === c) { j = (i + n) % picks.length; break; } }
    if (j < 0) return;
  }
  if (j < 0) return;
  e.preventDefault();
  picks[i].tabIndex = -1; picks[j].tabIndex = 0; picks[j].focus(); picks[j].scrollIntoView({ block: 'nearest' });
}
function kqPick(k) {
  const T = KQ.T; if (!T) return;
  if (kqChoose(T, k, 'pick')) kqRender(k);
}
function kqFav(k) {
  if (!ENG_META[k]) return;
  const on = !KQ.fav.includes(k);
  KQ.fav = on ? [...KQ.fav, k] : KQ.fav.filter((x) => x !== k);
  KQ.save();
  kqRender(k);
  kqSay(ENG_NAME[k] + (on ? ' ist jetzt Favorit' : ' ist kein Favorit mehr'));
}
function kqHearTile(k) {
  if (!KQ.T || k === 'off') return;
  const v = kqHear(KQ.T, k), b = KQ.list.querySelector('.kq-tile[data-k="' + k + '"] .kq-hear');
  if (!v) { if (!A.started) kqSay('Starte zuerst den Klang.'); return; }
  if (b) { b.classList.add('playing'); setTimeout(() => { if (KQ.probe !== v || !v.alive) b.classList.remove('playing'); }, 1500); }
  kqSay(ENG_NAME[k] + ' – zum Anhören');
}
function kqTile(T, k, cur) {
  const off = k === 'off', M = ENG_META[k] || {}, why = off ? '' : T.allow(k), fb = off ? '' : kqFb(k), on = k === cur, kids = [kqGlyph(k, kqLoading(k) ? 'loading' : '')];
  let label;
  if (off) {
    kids.push(h('b', { class: 'kq-n' }, 'Aus'), h('span', { class: 'kq-art' }), h('span', { class: 'kq-cost' }), h('span', { class: 'kq-i' }, 'Keine zweite Ebene – jeder Finger spielt einen Klang'));
    label = 'Aus: keine zweite Ebene';
  } else {
    const c = kqCost(k);
    kids.push(h('b', { class: 'kq-n' }, M.n), h('span', { class: 'kq-art' }, ART_WORD[M.art]),
      h('span', { class: 'kq-cost', title: c.txt, 'aria-hidden': 'true', html: '<b>' + '●'.repeat(c.dots) + '</b>' + '○'.repeat(3 - c.dots) }),
      h('span', { class: 'kq-i' }, ...(fb ? [h('span', { class: 'kq-fb' }, '⌁ spielt als ' + ENG_NAME[fb]), ' · '] : []), why && !(T.quiet && T.quiet(k)) ? why[0].toUpperCase() + why.slice(1) : M.i));
    label = M.n + ', ' + FAM_NAME[M.fam] + ', ' + ART_WORD[M.art] + ', Kosten ' + c.word + ', etwa ' + c.n + ' Stimmen. ' + (why ? 'Nicht für ' + T.dat + ': ' + why + '. ' : '') + M.i + '.' + (fb ? ' Spielt hier als ' + ENG_NAME[fb] + '.' : '') + (KQ.fav.includes(k) ? ' Favorit.' : '');
  }
  const pk = h('button', { type: 'button', class: 'kq-pick', role: 'radio', 'aria-checked': String(on), 'aria-disabled': why ? 'true' : null, tabindex: '-1', 'aria-label': label }, ...kids);
  const tile = h('div', { class: 'kq-tile' + (on ? ' on' : ''), 'data-k': k }, pk);
  if (off) tile.append(h('span'), h('span'));
  else tile.append(h('button', { type: 'button', class: 'kq-fav', tabindex: '-1', 'aria-pressed': String(KQ.fav.includes(k)), 'aria-label': M.n + ' als Favorit', title: 'Favorit', html: KQ_ICO.star }),
    h('button', { type: 'button', class: 'kq-hear', tabindex: '-1', 'aria-label': M.n + ' anhören', title: 'Anhören – lange drücken: halten', html: KQ_ICO.play }));
  return tile;
}
// the list for the family row's choice (or the search); keep: the key whose tile keeps the focus (it had it)
function kqRender(keep) {
  const T = KQ.T; if (!T || !KQ.el) return;
  const cur = T.get(), q = kqNorm(KQ.q.trim()), list = KQ.list;
  const hadFocus = list.contains(document.activeElement), fk = keep || (hadFocus && document.activeElement.closest('.kq-tile') ? document.activeElement.closest('.kq-tile').dataset.k : null);
  KQ.famBtns.forEach((b, i) => { const on = !q && b.dataset.fam === KQ.fam; b.setAttribute('aria-checked', String(on)); b.tabIndex = on || (q && i === 2) ? 0 : -1; });
  const groups = [], all = ENG_OPTS.map((o) => o[0]);
  if (q) groups.push({ h: 'Suche', sub: (n) => n + (n === 1 ? ' Treffer' : ' Treffer'), ks: all.filter((k) => kqHay(k).includes(q)), empty: 'search' });
  else if (KQ.fam === 'fav') groups.push({ h: 'Favoriten', sub: (n) => n ? String(n) : '', ks: KQ.fav.filter((k) => ENG_META[k]), empty: 'fav' });
  else if (KQ.fam === 'recent') groups.push({ h: 'Zuletzt', sub: () => 'gewählt, ohne die jetzige', ks: KQ.recent.filter((k) => ENG_META[k] && k !== cur).slice(0, 6), empty: 'recent' });
  else for (const [f, n, s] of FAM) if (KQ.fam === 'alle' || KQ.fam === f) groups.push({ h: n, sub: (c) => c + ' · ' + s, ks: kqKeysOf(f) });
  const out = [];
  let why = false;
  groups.forEach((g, gi) => {
    out.push(h('h3', { class: 'kq-fh' }, g.h, h('small', null, g.sub(g.ks.length) ? ' · ' + g.sub(g.ks.length) : '')));
    if (gi === 0 && (T.key === 'v.layer' || /^e\d\.eng$/.test(T.key)) && !q) out.push(kqTile(T, 'off', cur));
    if (T.why && !why && g.ks.some((k) => T.allow(k))) { out.push(h('p', { class: 'kq-why' }, T.why)); why = true; }
    for (const k of g.ks) out.push(kqTile(T, k, cur));
    if (!g.ks.length && g.empty) {
      const msg = g.empty === 'fav' ? 'Tippe ★ auf einer Quelle – sie landet hier.' : g.empty === 'recent' ? 'Was du wählst, landet hier – die sechs letzten.' : 'Nichts gefunden – versuch „Wind“, „Fell“ oder „Bass“.';
      const p = h('div', { class: 'kq-empty' }, h('p', { style: 'margin:0' }, msg));
      if (g.empty === 'search') p.append(h('button', { type: 'button', class: 'btn ghost', html: KQ_ICO.dice + '<span>Überrasch mich</span>', onclick: () => { KQ.q = ''; KQ.search.value = ''; KQ.fam = 'alle'; kqRender(); kqSurprise(T, false); } }));
      out.push(p);
    }
  });
  list.replaceChildren(...out);
  const picks = [...list.querySelectorAll('.kq-pick')];
  const t = (fk && picks.find((p) => p.closest('.kq-tile').dataset.k === fk)) || picks.find((p) => p.getAttribute('aria-checked') === 'true') || picks[0];
  if (t) t.tabIndex = 0;
  if (t && hadFocus) t.focus({ preventScroll: true });
  if (KQ.famFade) KQ.famFade();
  KQ.sur.disabled = !picks.some((p) => { const k = p.closest('.kq-tile').dataset.k; return k !== 'off' && k !== cur && !T.allow(k); });
}
// t: a place (kqTarget); o.opener: the button to return to, o.where: the place in its words ("Kanal Spur 2")
function kqOpen(T, o = {}) {
  if (!T) return;
  if (!KQ.el) kqBuild();
  if (sheet.hidden) openPanel(o.panel || 'klang');
  if (KQ.T) { kqHoldEnd(); kqProbeEnd(); }
  for (const b of KQ.openers) b.setAttribute('aria-expanded', 'false');
  KQ.openers.clear();
  KQ.T = T; KQ.where = o.where || T.where; KQ.opener = o.opener || (document.activeElement !== document.body ? document.activeElement : null);
  if (o.opener && o.opener.hasAttribute('aria-expanded')) { o.opener.setAttribute('aria-expanded', 'true'); KQ.openers.add(o.opener); }
  const cur = T.get(), M = ENG_META[cur === 'off' ? P['v.eng'] : cur];
  KQ.fam = M ? M.fam : 'alle'; KQ.q = ''; KQ.search.value = '';
  KQ.title.replaceChildren(h('small', null, 'Klangquelle für'), h('span', null, KQ.where.toLowerCase()));
  KQ.el.hidden = false;
  sheet.dataset.lib = T.key;
  kqRender();
  kqSay('');
  const on = KQ.list.querySelector('.kq-pick[tabindex="0"]');
  if (on) on.scrollIntoView({ block: 'nearest' });
  const fc = KQ.famBtns.find((b) => b.dataset.fam === KQ.fam);
  KQ.fams.scrollLeft = 0;
  if (fc) kqFamShow(fc);
  // a phone's keyboard would cover the tiles: the search takes the focus only with a fine pointer
  ((MOBILE || o.focusTile) && on ? on : KQ.search).focus({ preventScroll: true });
}
function kqClose(refocus = true) {
  if (!KQ.T) return;
  kqHoldEnd(); kqProbeEnd();
  const inside = KQ.el.contains(document.activeElement);
  KQ.el.hidden = true;
  delete sheet.dataset.lib;
  KQ.T = null;
  for (const b of KQ.openers) b.setAttribute('aria-expanded', 'false');
  KQ.openers.clear();
  const op = KQ.opener; KQ.opener = null;
  if (refocus && inside && op && op.isConnected && op.getClientRects().length) op.focus({ preventScroll: true });
  $('#kqSay').textContent = '';
}
// a preset or a stored patch names a source this version lacks: renamed keys follow ENG_ALIAS, the others are noted
// (they load as the default, as they always did) for one hint
function engKeysIn(vals) {
  if (!vals || typeof vals !== 'object') return vals;
  let out = vals;
  for (const id of KQ_PIDS) {
    if (!Object.prototype.hasOwnProperty.call(vals, id) || typeof vals[id] !== 'string') continue;
    let k = vals[id];
    if (ENG_ALIAS[k]) { if (out === vals) out = Object.assign({}, vals); out[id] = k = ENG_ALIAS[k]; }
    if (k !== 'off' && !ENG_META[k]) KQ.miss.push([id, k]);
  }
  return out;
}
function engMissSay() {
  if (!KQ.miss.length) return '';
  const q = (n) => '„' + n + '“', names = [...new Set(KQ.miss.map(([, k]) => q(ENG_LATER[k] || k)))];
  const subs = [...new Set(KQ.miss.map(([id]) => (id === 'v.eng' ? ENG_NAME[P[id]] + ' gewählt' : id === 'v.layer' ? 'zweite Ebene aus' : id[0] === 'e' ? 'Ebene ' + id[1] + ' aus' : 'Spur ' + (+id[1] + 1) + ' spielt ' + ENG_NAME[P[id]])))];
  KQ.miss = [];
  return (names.length > 1 ? 'Klangquellen ' + listDe(names) + ' gibt' : 'Klangquelle ' + names[0] + ' gibt') + ' es in dieser Version nicht – ' + listDe(subs) + '.';
}

function buildFx() {
  const box = h('div');
  box.append(h('p', { class: 'note', style: 'margin-top:12px' }, 'Signalweg: Verzerrung → Ringmodulator → Filter → Phaser → Schweben → Kreisen, dann parallel Echo, Hall, Effekt und Effekt 2 in die Summe.'));
  box.append(section('Verzerrung', 'Sättigung, Wellenfalter, Bitreduktion', grid(ctl('drv.type'), ctl('drv.amt'), ctl('drv.mix'))));
  box.append(section('Ringmodulator', 'Metallische Seitenbänder', grid(ctl('rng.freq'), ctl('rng.mix'))));
  box.append(section('Filter', 'Mit langsamer Welle', grid(ctl('flt.type'), ctl('flt.freq'), ctl('flt.q'), ctl('flt.lfoRate'), ctl('flt.lfoDepth'))));
  box.append(section('Phaser', '6 Allpass-Stufen', grid(ctl('pha.mix'), ctl('pha.rate'), ctl('pha.depth'), ctl('pha.fb'))));
  box.append(section('Schweben', 'Stereo-Chorus', grid(ctl('cho.mix'), ctl('cho.rate'), ctl('cho.depth'))));
  box.append(section('Echo', 'Bandecho mit Ping-Pong', grid(ctl('dly.mix'), ctl('dly.fb'), ctl('dly.sync'), ctl('dly.div'), ctl('dly.ms'), ctl('dly.pp'), ctl('dly.tone'), ctl('dly.wow')),
    h('p', { class: 'note' }, 'Ab 100 % Rückkopplung schwillt das Echo von selbst an, die Bandsättigung begrenzt es. „Einfrieren“ (Schneeflocke oben) hält die aktuelle Schleife endlos fest; „Stille“ leert sie.')));
  box.append(section('Hall', 'Erzeugter Raum', grid(ctl('rev.mix'), ctl('rev.size'), ctl('rev.damp'), ctl('rev.pre'))));
  // (owner, 30.10.2026: „Ich hab gestern einen Harmonizer in Auftrag gegeben. Wo ist der eigentlich zu finden?“) the
  // returns „Effekt“ and „Effekt 2“ – until now only in the mixer's return channels: here too, the same settings
  for (const [r, name] of FX_RETS) {
    const grids = {}, txt = h('p', { class: 'note' }), upd = () => { const T = FX_TYPES[P[r + '.typ']] || FX_TYPES.netz; for (const t in grids) grids[t].hidden = t !== P[r + '.typ']; txt.textContent = T.i + '.'; };
    for (const t in FX_TYPES) grids[t] = grid(...Object.values(FX_TYPES[t].keys).map((id) => ctl(r + '.' + id)));
    bindCtl(r + '.typ', upd); upd();
    box.append(section(name, 'Resonanz-Netz, Wolke, Spektral-Nebel, Oktav-Echo, Vokal-Filter oder Harmonizer – jeder Kanal sendet hinein (Mixer)', ctl(r + '.typ'), txt, grid(ctl(r + '.mix')), ...Object.values(grids)));
  }
  box.append(section('Bewegung', 'Tonhöhe und Raum aller Stimmen', grid(ctl('mov.vib'), ctl('mov.vibRate'), ctl('mov.drift'), ctl('mov.driftRate'), ctl('mov.pan'), ctl('mov.panRate'))));
  box.append(section('Summe', 'Klangregelung, Kompressor, Sättigung', grid(ctl('mst.low'), ctl('mst.high'), ctl('mst.comp'), ctl('mst.vol')),
    h('p', { class: 'note' }, 'Die Verdichtung ändert die Dynamik, nicht die Lautstärke leiser Passagen. Eine weiche Sättigung am Ende fängt seltene Spitzen ab und hält den Ausgang unter 0 dBFS.')));
  return box;
}
let ringCv = null, laneTabs = [], laneGrids = [];
function buildPuls() {
  const box = h('div');
  const play = h('button', { type: 'button', class: 'btn primary', id: 'pulsPlay', 'aria-pressed': 'false', 'data-act': 'puls', onclick: () => (SEQ.on ? seqStop() : seqStart()) });
  box.append(section('Puls', 'Euklidische Rhythmen, polymetrisch', h('div', { class: 'transport' }, play), grid(ctl('seq.bpm'), ctl('seq.swing')), hxPulsErnteSec()));   // (Hexenring step 2b: Puls ernten)
  // level, balance and pitch of every lane right under the transport (the mixer module adds it)
  if (typeof buildPulsMix === 'function') box.append(buildPulsMix());
  ringCv = h('canvas', { id: 'ringCv', 'aria-label': 'Rhythmus-Ringe der vier Spuren', role: 'img' });
  const lanes = h('div', { class: 'lanes', role: 'group', 'aria-label': 'Spur zum Bearbeiten wählen' });
  laneTabs = [0, 1, 2, 3].map((i) => {
    const b = h('button', { type: 'button', class: 'lane-tab', 'aria-pressed': String(i === UI.lane), style: '--c:' + ['var(--spore)', 'var(--lumen)', 'var(--lilac)', 'var(--rose)'][i], onclick: () => selectLane(i) },
      h('b', null, h('i'), 'Spur ' + (i + 1)), h('small'), h('small'));
    lanes.append(b); return b;
  });
  laneGrids = [0, 1, 2, 3].map((i) => {
    const p = 'l' + i + '.';
    const g = grid(ctl(p + 'on'), ctl(p + 'eng'), ctl(p + 'steps'), ctl(p + 'puls'), ctl(p + 'rot'), ctl(p + 'div'), ctl(p + 'deg'), ctl(p + 'oct'), ctl(p + 'walk'), ctl(p + 'prob'), ctl(p + 'vol'), ctl(p + 'bright'), ctl(p + 'pan'));
    g.hidden = i !== UI.lane; return g;
  });
  box.append(section('Spuren', 'Impulse verteilt auf Schritte', h('div', { class: 'lanehead' }, ringCv, lanes), ...laneGrids));
  box.append(section('Bordun', 'Liegender Grundton unter allem', grid(ctl('bor.on'), ctl('bor.lvl'), ctl('bor.int'), ctl('bor.oct'), ctl('bor.wave'), ctl('bor.cut'), ctl('bor.breath'))));
  return box;
}
function selectLane(i) {
  UI.lane = i;
  laneTabs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  laneGrids.forEach((g, k) => (g.hidden = k !== i));
}
function updLaneTabs() {
  laneTabs.forEach((b, i) => {
    const p = 'l' + i + '.';
    b.classList.toggle('off', !P[p + 'on']);
    const sm = b.querySelectorAll('small');
    sm[0].textContent = 'E(' + Math.min(P[p + 'puls'], P[p + 'steps']) + ',' + P[p + 'steps'] + ')';
    sm[1].replaceChildren(...(P[p + 'on'] ? [kqGlyph(P[p + 'eng']), ENG_NAME[P[p + 'eng']]] : ['aus']));
  });
}
function updPulsUI() {
  const b = $('#btnPuls');
  b.setAttribute('aria-pressed', String(SEQ.on));
  b.innerHTML = SEQ.on ? ICON.stop : ICON.play;
  const pp = $('#pulsPlay');
  if (pp) { pp.setAttribute('aria-pressed', String(SEQ.on)); pp.innerHTML = (SEQ.on ? ICON.stop : ICON.play) + (SEQ.on ? 'Puls anhalten' : 'Puls starten'); }
}
function drawRings() {
  if (!ringCv) return;
  const rect = ringCv.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(rect.width * dpr);
  if (ringCv.width !== W) { ringCv.width = W; ringCv.height = W; }
  const c = ringCv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const S = rect.width, cx = S / 2, cy = S / 2;
  c.clearRect(0, 0, S, S);
  for (let i = 0; i < 4; i++) {
    const p = 'l' + i + '.', on = P[p + 'on'];
    const steps = P[p + 'steps'], pat = euclid(steps, P[p + 'puls'], P[p + 'rot']);
    const r = S * (0.46 - i * 0.1), col = COL.lanes[i];
    const dot = Math.min(3.6, Math.PI * r / steps * 0.6);
    c.strokeStyle = 'rgba(240,230,216,0.08)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    const cur = SEQ.on ? SEQ.lanes[i].cur : -1;
    for (let s = 0; s < steps; s++) {
      const a = -Math.PI / 2 + (s / steps) * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const isCur = s === cur;
      c.globalAlpha = on ? 1 : 0.35;
      c.fillStyle = pat[s] ? col : 'rgba(240,230,216,0.25)';
      c.beginPath(); c.arc(x, y, pat[s] ? (isCur ? dot * 1.7 : dot) : (isCur ? dot : dot * 0.5), 0, Math.PI * 2); c.fill();
      if (isCur && on) { c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, dot * 2.3, 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = 1;
  }
  c.fillStyle = COL.hypha; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '500 13px ' + COL.fontNum;
  c.fillText(SEQ.ext ? dec(SEQ.ext.bpm.toFixed(1)) : TG.hxOn ? dec(TG.hx.toFixed(1)) : Math.round(P['seq.bpm']), cx, cy - 4);   // (Hexenring: a Schleife's exact tempo)
  c.fillStyle = COL.dim; c.font = '500 8px ' + COL.fontNum;
  c.fillText(SEQ.ext ? 'EXT BPM' : 'BPM', cx, cy + 9);
}

let recBig, recTimeEl, recSubEl, recInfoEl, barInfoEl, takesEl, mBars = [], mPks = [];
function buildRec() {
  const box = h('div');
  box.append(hxCardSec());   // Hexenring: its section on top
  recBig = h('button', { type: 'button', class: 'big', 'aria-label': 'Aufnahme starten', onclick: recToggle }, h('i'));
  recTimeEl = h('div', { class: 'rectime' }, '0:00,0');
  recSubEl = h('div', { class: 'recsub' }, 'Tippe zum Aufnehmen');
  const meters = h('div', { class: 'meters' }, ['L', 'R'].map((ch, i) => {
    const bar = h('i'), pk = h('span', { class: 'pk' }, '−∞ dB');
    mBars[i] = bar; mPks[i] = pk;
    return h('div', { class: 'mrow' }, h('span', null, ch), h('div', { class: 'mbar' }, bar), pk);
  }));
  barInfoEl = h('p', { class: 'note', style: 'margin-top:8px' });
  box.append(section('Aufnahme', null, h('div', { class: 'recbig' }, recBig, h('div', null, recTimeEl, recSubEl)), meters,
    h('div', { class: 'grid', style: 'margin-top:12px' }, ctl('rec.len'), ctl('rec.bars')), barInfoEl));
  recInfoEl = h('p', { class: 'note', style: 'margin-top:10px' });
  box.append(section('Qualität', null, grid(ctl('rec.fmt'), ctl('rec.norm'), ctl('rec.arm'), ctl('rec.tail'), ctl('rec.comp')), recInfoEl));
  takesEl = h('div', { class: 'takes' });
  box.append(section('Aufnahmen', 'Auf diesem Gerät zwischengespeichert', takesEl));
  renderTakes(); renderRecInfo(); renderBarInfo();
  return box;
}
function renderBarInfo() {
  for (const w of CTLWRAP['rec.bars'] || []) w.classList.toggle('inactive', P['rec.len'] !== 'bars');
  if (!barInfoEl) return;
  if (P['rec.len'] !== 'bars') { barInfoEl.textContent = 'Frei: läuft, bis du wieder tippst.'; barInfoEl.title = ''; return; }
  // (phone report 22.10.2026: the tempo the take will have – a Schleife's or a device's where it leads, not the slider's –
  // and the length is set here, in Takten: the tempo is what plays, and moving it moves the Schleifen with it)
  const bars = P['rec.bars'], bpm = A.ctx ? barGrid().bpm : P['seq.bpm'], sec = bars * 4 * 60 / bpm;
  const who = SEQ.ext ? 'das Tempo des Geräts' : TG.hxOn ? 'das Tempo der Schleifen' : 'das Tempo unter „Puls“';
  barInfoEl.textContent = bars + (bars === 1 ? ' Takt' : ' Takte') + ' im 4/4-Takt bei ' + dec(String(Math.round(bpm * 10) / 10)) + ' BPM (' + who + ') = ' + fmtDur(sec) + '.';
  // (owner, 26.10.2026: „die lange Beschreibung kürzen“) the rest on hover
  barInfoEl.title = 'Die Länge stellst du hier in Takten ein; sie ändert nichts an dem, was gerade spielt. ' +
    'Läuft der Puls, beginnt die Aufnahme auf der nächsten Eins, sonst sofort – oder mit dem ersten Ton, wenn „Erst mit dem ersten Ton starten“ an ist. ' +
    'Die Datei ist auf das Sample genau so lang. Läuft der Puls schon vor dem Start, geht die Schleife von selbst nahtlos weiter; sonst legt „Nachklang“ den Ausklang an den Anfang, wenn am Ende nichts mehr klingt. Tippen während der Aufnahme beendet sie mit dem laufenden Takt, ein zweites Tippen sofort.';
}
function renderRecInfo() {
  if (!recInfoEl) return;
  const sr = A.ctx ? SR.toLocaleString('de-DE') + ' Hz' : 'Abtastrate des Geräts';
  const path = CAP.mode === 'worklet' ? 'bitgenau von der Summe abgegriffen' : CAP.mode === 'script' ? 'im Kompatibilitätsmodus abgegriffen (bei hoher Last sind kurze Aussetzer möglich)' : 'bitgenau von der Summe abgegriffen, sobald du zum ersten Mal aufnimmst';
  let save = '';
  if (DL) save = 'Beim Speichern entsteht ein ZIP-Archiv mit der WAV-Datei, deinen Klangeinstellungen und einer Info-Datei.';
  else if (inViewer && dlChecked) save = 'Speichern als Datei ist in dieser Ansicht nicht verfügbar – du kannst aber aufnehmen und anhören.';
  else if (!inViewer) save = 'Gespeichert wird direkt als WAV-Datei.';
  const backup = IDB.ok ? (IDB.failed ? ' Die Zwischenspeicherung auf dem Gerät ist voll – speichere Aufnahmen als Datei.' : ' Aufnahmen werden auf diesem Gerät zwischengespeichert und überstehen ein Neuladen.') : '';
  recInfoEl.textContent = 'Stereo, ' + sr + ', ' + path + '. 32-Bit-Float ist verlustfrei und ideal zum Weiterbearbeiten; 24 Bit spielt fast jedes Gerät ab. ' + save + backup;
  recInfoEl.classList.toggle('warn', inViewer && dlChecked && !DL);
}
function renderTakes() {
  if (!takesEl) return;
  takesEl.replaceChildren();
  if (!takes.length) {
    takesEl.append(h('div', { class: 'empty' }, 'Noch keine Aufnahmen. Tippe auf REC, spiele und tippe erneut, um zu beenden.'));
    return;
  }
  // (owner, 26.10.2026) all of them at once – a second tap confirms, and says how many are not saved as a file
  const nUn = takes.filter((t) => !t.saved).length, delAll = h('button', { type: 'button', class: 'btn ghost danger' }, 'Alle löschen');
  delAll.addEventListener('click', () => {
    if (delAll.dataset.confirm) {
      if (preview) stopPreview();
      for (const tk of takes.splice(0)) forgetTake(tk);
      renderTakes(); toast('Alle Aufnahmen gelöscht.', 2500); return;
    }
    delAll.dataset.confirm = '1'; delAll.textContent = 'Wirklich alle ' + takes.length + ' löschen?' + (nUn ? ' (' + nUn + ' nicht als Datei gespeichert)' : '');
    setTimeout(() => { if (delAll.isConnected) { delete delAll.dataset.confirm; delAll.textContent = 'Alle löschen'; } }, 4000);
  });
  if (takes.length > 1) takesEl.append(h('div', { class: 'take-all' }, delAll));
  let mem = 0;
  for (const tk of takes) {
    if (tk.L) mem += tk.frames * 8;
    const name = h('input', { type: 'text', id: 'take-' + tk.id, value: tk.name, 'aria-label': 'Name der Aufnahme', maxlength: '60' });
    name.addEventListener('change', () => { tk.name = name.value.trim() || tk.name; idbDo('takes', 'readwrite', (st) => st.put(takeMeta(tk))); });
    const playing = preview && preview.id === tk.id;
    const saveLabel = DL || inViewer ? 'Speichern (ZIP mit WAV)' : 'WAV speichern';
    const saveBtn = canSave() ? h('button', { type: 'button', class: 'btn primary', onclick: (e) => saveTake(tk, e.currentTarget) }, saveLabel) : null;
    const splitBtn = tk.needSplit && canSave() ? h('button', { type: 'button', class: 'btn', onclick: (e) => saveTake(tk, e.currentTarget, true) }, 'In Teilen speichern') : null;
    const del = h('button', { type: 'button', class: 'btn ghost danger' }, 'Löschen');
    del.addEventListener('click', () => {
      if (del.dataset.confirm) {
        if (preview && preview.id === tk.id) stopPreview();
        takes.splice(takes.indexOf(tk), 1); forgetTake(tk); renderTakes(); return;
      }
      del.dataset.confirm = '1'; del.textContent = 'Wirklich löschen?';
      setTimeout(() => { if (del.isConnected) { delete del.dataset.confirm; del.textContent = 'Löschen'; } }, 3500);
    });
    const actions = h('div', { class: 'take-actions' },
      h('button', { type: 'button', class: 'btn', 'aria-pressed': String(playing), onclick: () => playTake(tk), html: (playing ? ICON.stop : ICON.play) + (playing ? 'Stopp' : tk.bars ? 'Als Schleife anhören' : 'Anhören') }),
      saveBtn, splitBtn,
      h('button', { type: 'button', class: 'btn', onclick: () => takeToGrains(tk) }, 'Als Körner-Quelle'),
      tk.comp && canSave() ? h('button', { type: 'button', class: 'btn', onclick: () => offerFile('myzel-' + slug(tk.name) + '-' + stamp(tk.date) + '.' + tk.compExt, tk.comp) }, 'Kleine Datei (' + tk.compExt.toUpperCase() + ')') : null,
      del);
    const meta = h('div', { class: 'take-meta' },
      fmtDur(tk.frames / tk.sr) + (tk.bars ? ' · Schleife' : '') + ' · Spitze ' + dec(gainToDb(tk.peak).toFixed(1)) + ' dBFS · ' + (tk.sr / 1000).toLocaleString('de-DE') + ' kHz · ',
      h('b', { class: tk.saved ? '' : 'unsaved' }, tk.saved ? 'als Datei gespeichert' : tk.recovered ? 'wiederhergestellt, noch nicht gespeichert' : 'noch nicht als Datei gespeichert'));
    takesEl.append(h('div', { class: 'take' }, name, meta, actions));
  }
  if (mem) takesEl.append(h('p', { class: 'note' }, 'Belegter Arbeitsspeicher: ' + Math.round(mem / 1048576) + ' MB.' + (IDB.ok ? '' : ' Diese Ansicht kann Aufnahmen nicht zwischenspeichern – speichere wichtige Aufnahmen, bevor du die Seite schließt.')));
}
function updRecUI() {
  const st = CAP.state;
  const b = $('#btnRec');
  b.dataset.state = st;
  const bar = CAP.bar;
  const lbl = st === 'idle' ? 'Aufnahme starten' : st === 'armed' || st === 'cue' ? 'Warten abbrechen' : st === 'tail' ? 'Nachklang jetzt beenden'
    : bar && !bar.stopAt ? 'Mit diesem Takt beenden' : 'Aufnahme beenden';
  b.setAttribute('aria-label', lbl);
  if (st === 'idle') $('#recLabel').textContent = 'REC';
  if (st === 'armed' || st === 'cue') $('#recLabel').textContent = 'WARTET';
  if (recBig) {
    recBig.dataset.state = st;
    recBig.setAttribute('aria-label', lbl);
    recSubEl.textContent = st === 'rec' ? (bar ? '' : 'Nimmt auf …') : st === 'armed' ? 'Startet mit dem ersten Ton' : st === 'cue' ? 'Beginnt auf der nächsten Eins …'
      : st === 'tail' ? (bar ? 'Legt den Nachklang an den Anfang der Schleife … (tippen beendet sofort)' : 'Nimmt den Nachklang auf … (tippen beendet sofort)')
        : P['rec.len'] === 'bars' ? 'Tippe zum Aufnehmen: ' + P['rec.bars'] + (P['rec.bars'] === 1 ? ' Takt' : ' Takte') : 'Tippe zum Aufnehmen';
    if (st === 'idle') { recTimeEl.textContent = '0:00,0'; for (const pk of mPks) { pk.textContent = '−∞ dB'; pk.classList.remove('clip'); } }
  }
}
const meterState = { l: 0, r: 0, o: 0 };
function updateMeters(dt) {
  // (phone report 22.10.2026) a tap that has stopped delivering while a recording waits or runs is made anew, once per
  // recording: its blocks carry the audio clock's frames, so a take in bars goes on where it stood (the gap is silence)
  if (CAP.state === 'idle') CAP.reTap = false;
  else if (CAP.node && !CAP.pending && !CAP.reTap && A.ctx && A.ctx.state === 'running' && performance.now() - (CAP.lastP || 0) > 4000) {
    CAP.reTap = true; console.warn('Aufnahme: der Abgriff liefert nichts – neu verbunden');
    capDrop(); ensureCapture().then((ok) => { if (!ok) toast('Die Aufnahme bekommt keinen Klang – bitte die Seite neu laden.', 6000); });
  }
  const decay = Math.pow(0.05, dt);
  const inL = CAP.node ? CAP.mL : A.anaPeak || 0, inR = CAP.node ? CAP.mR : A.anaPeak || 0;
  meterState.l = Math.max(inL, meterState.l * decay);
  meterState.r = Math.max(inR, meterState.r * decay);
  CAP.mL = CAP.mR = 0; A.anaPeak = 0;
  const lvl = Math.max(meterState.l, meterState.r);
  const pct = (g) => clamp((gainToDb(g) + 60) / 60, 0, 1) * 100;
  // (a style is written only when the bar moves: an unchanged width would still cost a style pass each frame)
  const ow = pct(lvl).toFixed(1) + '%', om = meterState.el || (meterState.el = $('#outMeter'));
  if (ow !== meterState.w) { meterState.w = ow; om.style.width = ow; }
  const bar = CAP.bar;
  if (bar && CAP.state === 'cue') {
    const left = Math.max(0, bar.f0 / SR - A.ctx.currentTime);
    if (recSubEl) recSubEl.textContent = 'Beginnt auf der nächsten Eins – in ' + dec(left.toFixed(1)) + ' s';
  } else if (bar && CAP.state === 'rec') {
    // bar in progress, from the audio clock (the tap delivers its blocks a little later)
    const pos = Math.round(A.ctx.currentTime * SR) + Math.round(graphLatency() * SR) - bar.f0;
    const k = clamp(Math.floor(pos / bar.barF) + 1, 1, bar.stopAt || bar.bars), n = bar.stopAt || bar.bars;
    $('#recLabel').textContent = k + '/' + n;
    if (recTimeEl) recTimeEl.textContent = 'Takt ' + k + '/' + n;
    if (recSubEl) recSubEl.textContent = fmtDur(Math.max(0, pos) / SR) + ' von ' + fmtDur(bar.total / SR) + (bar.stopAt ? ' · endet mit Takt ' + bar.stopAt + ' – nochmal tippen beendet sofort' : ' · tippen beendet mit dem laufenden Takt');
  } else if (CAP.rec && (CAP.state === 'rec' || CAP.state === 'tail')) {
    const t = fmtDur(CAP.rec.frames / SR);
    $('#recLabel').textContent = t;
    if (recTimeEl) recTimeEl.textContent = t;
  }
  if (UI.panel === 'rec' && mBars.length) {
    for (let i = 0; i < 2; i++) { const v = pct(i ? meterState.r : meterState.l).toFixed(1) + '%'; if (mBars[i].style.width !== v) mBars[i].style.width = v; }
    if (CAP.state !== 'idle') [CAP.pkL, CAP.pkR].forEach((g, i) => {
      mPks[i].textContent = g > 0 ? dec(gainToDb(g).toFixed(1)) + ' dB' : '−∞ dB';
      mPks[i].classList.toggle('clip', g >= 0.97);
    });
  }
}

