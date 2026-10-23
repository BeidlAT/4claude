// ---- the Handschrift (SPEC §12.5): memory across sessions, on the device only (IndexedDB „myzel-hand“, store
// „handschrift“, ≤ 1 MB) – the token counts (pruned), grooves per tempo band, tempi, scales, sources, the chord
// progressions, the operators' weights from ✓ and ✕. Off by default; when on, each session's material waits as „pend“
// until the player takes it („In die Handschrift übernehmen?“ – at the next start, or in the card); Vergessen; export and
// import as a file (another player's only by an explicit choice) ----
const HXH = { db: null, prog: {}, tS: 0, asked: false };
HX.hs = null;
function hxHandDb() {
  if (HXH.db) return Promise.resolve(HXH.db);
  return new Promise((res) => { try { const rq = indexedDB.open('myzel-hand', 1); rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('handschrift')) rq.result.createObjectStore('handschrift', { keyPath: 'id' }); }; rq.onsuccess = () => { HXH.db = rq.result; res(HXH.db); }; rq.onerror = () => res(null); rq.onblocked = () => res(null); } catch (e) { res(null); } });
}
async function hxHandIo(mode, fn) { const db = await hxHandDb(); if (!db) return null; return new Promise((res) => { try { const tx = db.transaction('handschrift', mode), r = fn(tx.objectStore('handschrift')); tx.oncomplete = () => res(r && 'result' in r ? r.result : true); tx.onerror = tx.onabort = () => res(null); } catch (e) { res(null); } }); }
const hxHandGet = (id) => hxHandIo('readonly', (st) => st.get(id));
const hxHandPut = (o) => hxHandIo('readwrite', (st) => st.put(o));
const hxHandDel = (id) => hxHandIo('readwrite', (st) => st.delete(id));
// this session's material as a Handschrift (what the next ones would learn from it)
function hxHandSess() {
  const tok = {}; for (const [ctx, m] of HXA.sc) { const o = {}; for (const [k, v] of m) o[k] = v; tok[ctx] = o; }
  const tempi = {}, scales = {}, srcs = {}, grooves = {};
  for (const L of hxLoopsLive().concat(HX.grave.map((g) => g.snap))) {
    if (!L || L.bew || L.eng === 'bew') continue;
    if (L.bpm && (L.d ? hxTakt(L) : true)) { const b = String(Math.round(L.bpm)); tempi[b] = (tempi[b] || 0) + 1; }
    if (L.eng) srcs[L.eng] = (srcs[L.eng] || 0) + 1;
    const sch = L.sch && L.sch.map ? L.sch.map((x) => (typeof x === 'number' ? HX.sch.get(x) : x)).filter(Boolean) : [];
    const W = (sch.find((S) => S.wn) || {}).wn;
    if (W && W.key) { scales[W.key.scale] = (scales[W.key.scale] || 0) + 1; const G = hxGrooveOf(W, L.bpb); if (G && L.bpm) { const band = String(Math.round(L.bpm / 20) * 20); const g = grooves[band] || (grooves[band] = { C: [0, 0, 0, 0], n: 0 }); G.C.forEach((v, i) => (g.C[i] += v)); g.n++; } }
  }
  return { tok, tempi, scales, srcs, grooves, prog: Object.assign({}, HXH.prog), ow: Object.assign({}, HX.vw), n: 1, t: Date.now() };
}
// two Handschriften into one; then pruned to stay under 1 MB (the rarest contexts go first)
function hxHandMerge(a, b) {
  const o = a ? JSON.parse(JSON.stringify(a)) : { v: 1, tok: {}, tempi: {}, scales: {}, srcs: {}, grooves: {}, prog: {}, ow: {}, n: 0 };
  const add = (x, y) => { for (const k in y || {}) x[k] = (x[k] || 0) + y[k]; };
  for (const ctx in b.tok || {}) { const m = o.tok[ctx] || (o.tok[ctx] = {}); add(m, b.tok[ctx]); }
  add(o.tempi, b.tempi); add(o.scales, b.scales); add(o.srcs, b.srcs); add(o.prog, b.prog);
  for (const band in b.grooves || {}) { const g = o.grooves[band] || (o.grooves[band] = { C: [0, 0, 0, 0], n: 0 }), h = b.grooves[band]; h.C.forEach((v, i) => (g.C[i] += v)); g.n += h.n; }
  for (const k in b.ow || {}) o.ow[k] = o.ow[k] != null ? Math.sqrt(o.ow[k] * b.ow[k]) : b.ow[k];
  o.n = (o.n || 0) + (b.n || 1); o.t = Date.now(); o.v = 1;
  return hxHandPrune(o);
}
function hxHandPrune(o, cap) {
  const lim = cap || 1000000;
  let s = JSON.stringify(o);
  while (s.length > lim) {
    const ctxs = Object.entries(o.tok).map(([k, m]) => [k, Object.values(m).reduce((a, b) => a + b, 0)]).sort((a, b) => a[1] - b[1]);
    if (!ctxs.length) break;
    const drop = Math.max(1, Math.floor(ctxs.length * 0.15));
    for (let i = 0; i < drop; i++) delete o.tok[ctxs[i][0]];
    s = JSON.stringify(o);
  }
  o.bytes = s.length;
  return o;
}
// the Handschrift into play: the corpus starts with its counts, the operators with its weights, the Takt finder's tempo prior
function hxHandUse(hs) {
  HX.hs = hs; HXA.c = new Map(); HXA.hsN = 0;
  for (const [ctx, m] of HXA.sc) for (const [k, v] of m) hxAntCount(HXA.c, ctx, k, v);
  if (hs && P['hx.hand'] === 'an') {
    for (const ctx in hs.tok) for (const k in hs.tok[ctx]) { hxAntCount(HXA.c, ctx, k, hs.tok[ctx][k]); if (ctx === '') HXA.hsN += hs.tok[ctx][k]; }
    for (const k in hs.ow || {}) if (HX.vw[k] == null) HX.vw[k] = clamp(hs.ow[k], 0.05, 2);
  }
}
// the tempo the Takt finder leans to: 100, or the player's own (the median of his loops' tempi)
function hxTempoPrior() {
  const hs = HX.hs; if (!hs || P['hx.hand'] !== 'an' || !hs.tempi) return 100;
  const list = []; for (const b in hs.tempi) for (let i = 0; i < Math.min(50, hs.tempi[b]); i++) list.push(+b);
  if (!list.length) return 100;
  list.sort((a, b) => a - b); return clamp(list[list.length >> 1], 40, 220);
}
async function hxHandLoad() {
  if (P['hx.hand'] !== 'an') { hxHandUse(null); return; }
  const hs = await hxHandGet('main'); hxHandUse(hs || null);
  const pend = await hxHandGet('pend');
  if (pend && pend.d && !HXH.asked && pend.sess !== HXH.sess) { HXH.asked = true; toast('Die letzte Sitzung in die Handschrift übernehmen?', 12000, [{ label: 'Übernehmen', fn: () => hxHandTake(pend) }, { label: 'Nein', fn: () => hxHandDel('pend') }]); }
}
HXH.sess = Date.now().toString(36);
// the session waits as „pend“ (written every minute while there is material, and when the page is hidden)
async function hxHandPend() {
  if (P['hx.hand'] !== 'an' || HXA.n < 8) return;
  await hxHandPut({ id: 'pend', sess: HXH.sess, d: hxHandSess(), t: Date.now() });
}
async function hxHandTake(pend) {
  const p = pend || { d: hxHandSess() }, hs = hxHandMerge((await hxHandGet('main')) || null, p.d);
  await hxHandPut(Object.assign({ id: 'main' }, hs)); await hxHandDel('pend');
  if (!pend) { HXA.sc = new Map(); HXH.prog = {}; }   // (this session is in it now: it is not counted twice)
  hxHandUse(hs); toast('In die Handschrift übernommen (' + Math.round((hs.bytes || 0) / 1024) + ' kB).', 2500); hxCardDirty();
  return hs;
}
async function hxHandForget() { await hxHandDel('main'); await hxHandDel('pend'); hxHandUse(null); toast('Die Handschrift ist vergessen.', 2500); hxCardDirty(); }
async function hxHandExport() { const hs = await hxHandGet('main'); if (!hs) { toast('Noch keine Handschrift gespeichert.'); return null; } const o = Object.assign({}, hs); delete o.id; offerFile('myzel-handschrift-' + stamp(new Date()) + '.json', new Blob([JSON.stringify({ app: 'Myzel', handschrift: 1, d: o })], { type: 'application/json' })); return o; }
function hxHandImport(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let o = null; try { o = JSON.parse(rd.result); } catch (e) {}
    const d = o && o.handschrift && o.d && typeof o.d.tok === 'object' ? o.d : null;
    if (!d) { toast('Diese Datei ist keine Handschrift von Myzel.'); return; }
    toast('Diese Handschrift verwenden? Sie ersetzt deine.', 12000, [{ label: 'Ersetzen', fn: async () => { const hs = hxHandPrune(Object.assign({ v: 1 }, d)); await hxHandPut(Object.assign({ id: 'main' }, hs)); if (P['hx.hand'] !== 'an') setParam('hx.hand', 'an'); else hxHandUse(hs); toast('Handschrift übernommen.', 2000); hxCardDirty(); } }, { label: 'Abbrechen', fn: () => {} }]);
  };
  rd.readAsText(file);
}
function hxHandParam() { if (P['hx.hand'] === 'an') hxHandLoad(); else { hxHandUse(null); } hxCardDirty(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && !HXW.on) hxHandPend(); });

