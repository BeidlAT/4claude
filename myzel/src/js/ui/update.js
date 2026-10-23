/* ---------- update check (installed app only: build.py's page calls window.myzelUpdate) ---------- */
// At every start the app asks for a newer version while the start screen shows – before the instrument starts. A new
// version loads completely into its own cache and then waits (pwa/sw.js) until „Jetzt aktualisieren“ lets it take over
// and the page reloads once; that happens only from the start screen, so never while sound plays. Offline or slow, the
// check never holds anything up: the card simply appears once the new version is ready, while the start screen is
// still there. Release notes: build.py embeds myzel/CHANGELOG.json (build.notes, newest first) and caches it as
// changelog.json, so the waiting version's notes come from its own cache; shown are the entries this page lacks.
// After an update the first start shows „Neu in dieser Version“ once. The claude.ai artifact has none of this.
const UPD = { build: null, reg: null, mode: '', q: [], later: false, said: false, going: false, done: false, w: null, checking: false };
const UPD_SEEN = 'myzel.neu', UPD_FROM = 'myzel.neu.von';
function updBoot(build) {
  if (HXW.on || UPD.build || !build || !('serviceWorker' in navigator)) return;
  UPD.build = build;
  const sw = navigator.serviceWorker;
  $('#updGo').addEventListener('click', updGo);
  $('#updLater').addEventListener('click', () => { if (UPD.mode !== 'neu') UPD.later = true; updClose(); });
  sw.addEventListener('controllerchange', () => { if (UPD.going) updReload(); });   // only the page that asked reloads
  try { updNeu(); } catch (e) {}
  sw.register('sw.js').then((reg) => {
    UPD.reg = reg;
    reg.addEventListener('updatefound', () => updWatch(reg));   // the browser's own check at navigation, too
    updCheck();
  }).catch(() => {});
  // back to an app that waited in the background with its start screen: ask again
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !A.started) updCheck(); });
}
async function updCheck() {
  const reg = UPD.reg;
  if (!reg || A.started || UPD.checking) return;
  UPD.checking = true;
  try { if (!reg.waiting) await Promise.race([reg.update().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]); }
  catch (e) {}
  UPD.checking = false;
  updWatch(reg);
}
// a waiting version is offered; one still loading shows the card in its loading state (and offers itself when ready)
function updWatch(reg) {
  if (!reg.active) return;   // the first install: nothing to update
  if (reg.waiting) { updOffer(reg); return; }
  const w = reg.installing;
  if (!w || UPD.w === w) return;
  UPD.w = w;
  if (!A.started && !UPD.later && !UPD.mode) updShow('load');
  w.addEventListener('statechange', () => {
    if (w.state === 'installed') updOffer(reg);
    else if (w.state === 'redundant' && UPD.mode === 'load') updClose();
  });
}
async function updOffer(reg) {
  const w = reg.waiting;
  if (!w || UPD.going) return;
  if (A.started) {   // found only after the start: no card, no reload – it comes at the next start
    if (!UPD.said) { UPD.said = true; toast('Neue Version bereit – sie kommt beim nächsten Start.', 5000); }
    return;
  }
  if (UPD.later) return;
  let notes = null;
  try {
    const v = await Promise.race([new Promise((res) => { const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data && e.data.version); w.postMessage({ type: 'version' }, [ch.port2]); }), new Promise((r) => setTimeout(r, 1500))]);
    const r = v && await caches.match('changelog.json', { cacheName: 'myzel-' + v });
    if (r) { const have = new Set(updIds(UPD.build.notes)); notes = (await r.json()).filter((e) => e && !have.has(e.id)); }
  } catch (e) {}
  if (A.started || UPD.later || UPD.going || reg.waiting !== w) return;
  updShow('upd', notes);
}
const updIds = (n) => (Array.isArray(n) ? n : []).map((e) => e.id);
// „Neu in dieser Version“, once: the entries the version before lacked (stored by updGo), else those after the last one
// seen; a page that was installed before but never stored one (an update from a version without notes) shows the newest
function updNeu() {
  const notes = Array.isArray(UPD.build.notes) ? UPD.build.notes : [], top = notes[0];
  if (!top) return;
  const seen = store.get(UPD_SEEN), from = store.get(UPD_FROM);
  let show = [];
  if (from) {
    let old = []; try { old = JSON.parse(from) || []; } catch (e) {}
    show = notes.filter((e) => !old.includes(e.id));
    try { localStorage.removeItem(UPD_FROM); } catch (e) {}
  } else if (seen) { if (seen !== top.id) { const i = notes.findIndex((e) => e.id === seen); show = notes.slice(0, i < 0 ? 1 : i); } }
  else if (navigator.serviceWorker.controller) show = [top];
  store.set(UPD_SEEN, top.id);
  if (show.length) updShow('neu', show);
}
function updShow(mode, notes) {
  if ($('#start').hidden) return;
  const box = $('#updNotes'), go = $('#updGo'), later = $('#updLater');
  UPD.mode = mode;
  $('#updTitle').textContent = mode === 'neu' ? 'Neu in dieser Version' : mode === 'load' ? 'Neue Version wird geladen …' : 'Neue Version verfügbar';
  box.replaceChildren();
  if (mode === 'upd' && !(notes && notes.length)) box.append(h('p', { class: 'p' }, 'Verbesserungen und Korrekturen.'));
  for (const e of notes || []) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.id || '');
    if (m) box.append(h('p', { class: 'd' }, +m[3] + '.' + +m[2] + '.' + m[1]));
    for (const p of e.punkte || []) box.append(h('p', { class: 'p' }, String(p)));
  }
  box.hidden = !box.childNodes.length;
  go.hidden = mode !== 'upd'; go.disabled = false; later.disabled = false;
  later.textContent = mode === 'neu' ? 'OK' : 'Später';
  $('#upd').hidden = false;
}
function updClose() {
  if (!UPD.mode) return;
  UPD.mode = '';
  $('#upd').hidden = true;
  const q = UPD.q; UPD.q = [];
  q.forEach((a, i) => setTimeout(() => toast(...a), 400 + i * 3400));
}
function updGo() {
  const w = UPD.reg && UPD.reg.waiting;
  if (!w || A.started) { updClose(); return; }
  UPD.going = true;
  store.set(UPD_FROM, JSON.stringify(updIds(UPD.build.notes)));
  $('#updTitle').textContent = 'Wird aktualisiert …';
  for (const id of ['updGo', 'updLater', 'btnStart', 'btnStartKeys']) $('#' + id).disabled = true;
  w.postMessage({ type: 'skipWaiting' });
  setTimeout(updReload, 4000);   // a browser that missed the controllerchange: reload anyway (still A? the card comes again)
}
function updReload() { if (UPD.done || A.started) return; UPD.done = true; location.reload(); }

