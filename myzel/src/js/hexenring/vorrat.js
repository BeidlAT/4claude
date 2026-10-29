// ---- (owner, 26.10.2026: „auf die gesamte gecapturte Audiodatei zurückgreifen … einfacher als im Korb, wo man nur auf
// vorher klicken kann, was sich dann nicht mehr rückgängig machen lässt“) the whole Ernte kept with a Schleife: once its
// first Schicht has filled, everything its Humus ring still held up to then is copied beside it (L.hum). Every re-cut –
// Länge ±, Eins ← →, Runde davor, the window moved in the editor – and every undo of one takes its audio from there,
// however long ago the Schleife was harvested; the editor shows the Ernte whole with the loop's window in it, its
// edges and the window itself dragged on the beats (heard at the next seam, ↶ ↷ and Grundeinstellung as always).
// Kept while the session lives (not stored), counted against the Speichergrenze; several Ernten share their audio. ----
// (owner, 26.10.2026: „geteiltes Lager“) the Ernten share one store per Humus ring: its chunks (HX_CH frames, aligned on
// the ring's absolute frames – the same number is the same audio) each held once; an Ernte is a list of references to
// them. A new harvest copies out of the ring only the chunks the store does not hold yet (a chunk an earlier grab
// filled only in part is taken again). The store holds them weakly: a chunk no Ernte refers to any more is freed by
// the browser's garbage collection.
const HX_LAGER = [new Map(), new Map(), new Map(), new Map()];
const hxLagerGet = (inp, k) => { const r = HX_LAGER[inp] && HX_LAGER[inp].get(k), c = r && r.deref(); if (!c && r) HX_LAGER[inp].delete(k); return c || null; };
function hxHumKeep(L, S) {
  if (!P['hx.ernte'] || !L || L.hum || L.humBusy || L.bew || !S || !S.cut || S.cut.stale || !HX.node || typeof WeakRef === 'undefined') return;
  const c = S.cut, inp = c.in, f1 = c.f0 + S.n, k0 = Math.ceil(Math.max(Math.ceil(hxOldestF()), f1 - Math.round(P['hx.humus'] * SR)) / HX_CH), f0 = k0 * HX_CH;
  if (f1 - f0 <= S.n + SR) return;   // (the Humus held nothing beyond its own window)
  const k1 = Math.ceil(f1 / HX_CH);   // (chunks k0 … k1 − 1; the last one up to f1)
  // the first chunk the store lacks (or holds only in part) – from there on it is copied
  let km = k0; while (km < k1) { const ch = hxLagerGet(inp, km); if (!ch || ch.end < Math.min(HX_CH, f1 - km * HX_CH)) break; km++; }
  if (km < k1 && hxMemUsed() + hxBytes(f1 - km * HX_CH) > P['hx.mem'] * 1048576) {
    if (!(HX.humToastT > performance.now())) { HX.humToastT = performance.now() + 60000; toast('Speichergrenze: die ganze Ernte wird nicht mehr mit der Schleife behalten (' + P['hx.mem'] + ' MB, unter Einstellungen erhöhbar).', 6000); }
    return;
  }
  const done = () => {
    const aud = []; for (let k = k0; k < k1; k++) { const ch = hxLagerGet(inp, k); if (!ch) { hxEdTouch(L); return; } aud.push(ch); }
    L.hum = { in: inp, f0, n: f1 - f0, aud, w0: c.w0, w1: c.w1, beats: L.d.beats, Lf: L.d.L };   // (w0, w1, beats: the window as harvested – Grundeinstellung)
    hxEdTouch(L);
  };
  if (km >= k1) { done(); return; }   // (all there already: the Ernte is references only)
  L.humBusy = true; hxEdTouch(L);
  hxGrab({ in: inp, f0: km * HX_CH, f1, dr: true }).then((g) => {
    L.humBusy = false;
    if (!g || !g.chunks || HX.loops.get(L.id) !== L || L.hum) { hxEdTouch(L); return; }
    const st = HX_LAGER[inp], per = HX_CH / 128;
    g.chunks.forEach((ch, j) => {
      const k = km + j, end = Math.min(HX_CH, f1 - k * HX_CH); if (end <= 0) return;
      ch.end = end; ch.dr = g.dr ? g.dr.subarray(j * per, (j + 1) * per) : null;
      const old = hxLagerGet(inp, k); if (old && old.end >= end) return;   // (a chunk filled meanwhile by another grab)
      st.set(k, new WeakRef(ch));
    });
    done();
  });
}
const hxEdTouch = (L) => { if (HXE.ed && !HXE.ed.hidden && hxEdL() === L) HXE.rsig = ''; };
// the Ernte that holds a cut (its window and margin inside it; an Ausklang beyond its end is silence)
function hxHumOf(c) {
  if (!c || c.stale) return null;
  for (const L of HX.loops.values()) { const H = L.hum; if (H && H.in === c.in && c.f0 >= H.f0 && c.w1 + (c.post || 0) <= H.f0 + H.n) return H; }
  return null;
}
// a cut's audio copied out of the Ernte (and the drift it was played with)
function hxHumSlice(H, c) {
  const [aud] = hxChunks(c.n), off = c.f0 - H.f0;
  for (let i = 0; i < c.n;) {
    const s = off + i; if (s >= H.n) break;
    const so = s % HX_CH, dO = i % HX_CH, k = Math.min(HX_CH - so, HX_CH - dO, c.n - i, H.n - s), src = H.aud[Math.floor(s / HX_CH)], dst = aud[Math.floor(i / HX_CH)];
    if (src) { dst[0].set(src[0].subarray(so, so + k), dO); dst[1].set(src[1].subarray(so, so + k), dO); }
    i += k;
  }
  // the drift, chunk by chunk (each chunk keeps the drift it was played with, 64 values)
  let dr = null;
  if (H.aud[0] && H.aud[0].dr) { const per = HX_CH / 128, b = Math.floor(off / 128), mx = H.aud.length * per - 1; dr = new Float32Array(Math.ceil(c.n / 128) + 1); for (let k = 0; k < dr.length; k++) { const q = Math.min(mx, b + k), ch = H.aud[Math.floor(q / per)]; dr[k] = ch && ch.dr ? ch.dr[q % per] : 0; } }
  return { aud, dr };
}
// the loop's window moved or resized in its Ernte (frames, absolute): heard at once when its length stays, else from the
// next seam; one step in the history
function hxHumApply(L, w0, w1, label) {
  hxRxWait();   // (a stretch's edit still in the Workers: written first – abschnitt.js)
  const S = L && HX.sch.get(L.sch[0]), H = L && L.hum;
  if (!S || !H) return false;
  if (L.sch.length > 1) { toast('Den Ausschnitt in der Ernte wählst du bei einer Schleife mit einer Schicht – lege die Schichten erst zusammen.'); return false; }
  if (!S.aud) { toast('Einen Moment – die Schleife wird noch aufgenommen.'); return false; }
  const c = S.cut, tk = hxTakt(L), beatF = tk ? c.len / L.d.beats : 0;
  w0 = Math.round(w0); w1 = Math.round(w1);
  if (w0 === c.w0 && w1 === c.w1) return false;
  const nc = hxCut(c.in, 0, 0, { f0: w0, f1: w1 });
  if (!hxHumOf(nc)) { toast('So weit reicht die Ernte nicht.'); return false; }
  const nb = tk ? Math.max(1, Math.round((w1 - w0) / beatF)) : 0, geom = tk ? (nb !== L.d.beats ? { beats: nb } : null) : (w1 - w0 !== L.d.L ? { L: w1 - w0 } : null);
  const before = hxGeo(L), key = L.key, sw = geom ? hxNextSeam(L) : hxSwapAt(L);
  hxSchSwap(S, nc, { f: sw.f, now: !!sw.now, geom });
  const after = {};
  hxHist({ kind: 'recut', label: hxName(L) + ': ' + (label || 'Ausschnitt in der Ernte'), undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); } }, redo() { const X = hxByKey(key); if (X && after.g) hxGeoBack(X, after.g); } });
  hxSay(hxName(L) + ': ' + (label || 'Ausschnitt in der Ernte')); hxSaveLoop(L); hxRailDirty(); hxCardDirty();
  return true;
}
// Grundeinstellung: the window as harvested
function hxHumReset(L) { const H = L && L.hum, S = L && HX.sch.get(L.sch[0]); if (H && S && L.sch.length === 1 && (S.cut.w0 !== H.w0 || S.cut.w1 !== H.w1)) hxHumApply(L, H.w0, H.w1, 'Ausschnitt wie geerntet'); }

// ---- the editor's row: the Ernte whole, the loop's window in it ----
const HXEH = { drag: null };
function hxEdHumRow(L) {
  if (L.bew) return null;
  const H = L.hum;
  if (!H) return L.humBusy ? h('div', { class: 'hx-ed-sec hx-ed-hum' }, h('div', { class: 'hx-ed-st' }, 'Ganze Ernte'), h('p', { class: 'note' }, 'Die ganze Ernte wird gerade übernommen …')) : null;
  const S = HX.sch.get(L.sch[0]); if (!S) return null;
  const cv = h('canvas', { class: 'hx-ed-humcv', role: 'img', 'aria-label': 'Ganze Ernte von ' + hxName(L) + ' mit dem Ausschnitt der Schleife' });
  HXE.hcv = cv;
  const sec = (f) => (f >= 60 * SR ? Math.floor(f / SR / 60) + ':' + String(Math.floor(f / SR) % 60).padStart(2, '0') + ' min' : dec((f / SR).toFixed(1)) + ' s');
  const tk = hxTakt(L), one = L.sch.length === 1;
  const info = h('span', { class: 'hx-ms' }, 'Die ganze Ernte: ' + sec(hxHumView(H).n) + ' ab dem ersten Ton' + (tk ? ' · Ausschnitt ' + hxLenText(L) : ' · Ausschnitt ' + sec(S.cut.len)) + (one ? '' : ' – den Ausschnitt verschiebst du bei einer Schicht (Schichten zusammenlegen)'));
  const btn = (t, fn, tip) => { const b = h('button', { type: 'button', class: 'btn ghost', title: tip }, t); b.addEventListener('click', fn); b.disabled = !one; return b; };
  const beatF = tk ? S.cut.len / L.d.beats : 0, c = () => S.cut;   // (read at the click: one click after another adds up)
  // (owner, 29.10.2026: „jeweils eine Auswahl, was vorne oder hinten dazukommt oder wegkommt … auch 1/32 oder gar 1/64 …
  // triolisches Raster würde wohl auch Sinn machen … zusätzlich nächsten Ton einrasten“) the step: a Takt loop's in note
  // values (a beat is a quarter), straight or as triplets (⅔); a free loop's in seconds. Anfang and Ende each take it away
  // or add it; a Takt loop's length stays whole beats – a finer step moves the window (Verschieben), a pickup comes in
  // that way. „Ton“: the edge to the nearest attack before or after it (the audio's own onsets, any source)
  const st = hxHumStep(tk), stF = tk ? st.b * beatF : st.s * SR, whole = !tk || Math.abs(st.b - Math.round(st.b)) < 1e-9, nm = st.t;
  const why = tk && !whole ? 'Im Takt bleibt die Länge in ganzen Schlägen – feiner geht es mit „Verschieben“' : '';
  const edge = (lab, dz, wg, tip) => { const a = btn(lab === 'Anfang' ? '+ ' + nm + ' dazu' : '− ' + nm + ' weg', lab === 'Anfang' ? dz : wg, why || tip[0]), b = btn(lab === 'Anfang' ? '− ' + nm + ' weg' : '+ ' + nm + ' dazu', lab === 'Anfang' ? wg : dz, why || tip[1]); if (why) a.disabled = b.disabled = true; return [a, b]; };
  const ton = (which, dir) => () => { const { w0, w1 } = c(), f = hxHumTon(L, which === 'a' ? w0 : w1, dir); if (f == null) { toast('Dort ist kein Anschlag in der Nähe.'); return; } if (which === 'a') hxHumApply(L, f, tk ? f + (w1 - w0) : w1, 'Anfang an den Ton'); else hxHumApply(L, w0, f, 'Ende an den Ton'); };
  const row = (lab, ...kids) => h('div', { class: 'hx-ed-hrow' }, h('span', { class: 'hx-ed-hl' }, lab), h('div', { class: 'chips' }, ...kids));
  const steps = h('div', { class: 'chips hx-ed-steps', role: 'radiogroup', 'aria-label': 'Raster für Anfang, Ende und Verschieben' },
    ...(tk ? HX_STEPS_T : HX_STEPS_F).map(([k, t]) => { const b = h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(k === st.k), onclick: () => { HXEH.step[tk ? 't' : 'f'] = k; hxHumStepSave(); hxEdRender(); } }, t); return b; }),
    tk ? h('button', { type: 'button', class: 'chip', 'aria-pressed': String(!!HXEH.tri), title: 'Triolisch: jeder Schritt ⅔ so lang (drei in der Zeit von zwei)', disabled: st.k === 'takt', onclick: () => { HXEH.tri = !HXEH.tri; hxHumStepSave(); hxEdRender(); } }, 'Triole') : null);
  const tools = h('div', { class: 'hx-ed-htools' },
    row('Raster', steps),
    row('Anfang', ...edge('Anfang', () => hxHumApply(L, c().w0 - stF, c().w1, 'Anfang: ' + nm + ' dazu'), () => hxHumApply(L, c().w0 + stF, c().w1, 'Anfang: ' + nm + ' weg'), ['Vorn ' + nm + ' dazu – die Schleife beginnt früher', 'Vorn ' + nm + ' weg – die Schleife beginnt später']),
      btn('◀ Ton', ton('a', -1), tk ? 'Der Ausschnitt so, dass er am Anschlag davor beginnt (gleiche Länge)' : 'Der Anfang an den Anschlag davor'), btn('Ton ▶', ton('a', 1), tk ? 'Der Ausschnitt so, dass er am Anschlag danach beginnt (gleiche Länge)' : 'Der Anfang an den Anschlag danach')),
    row('Ende', ...edge('Ende', () => hxHumApply(L, c().w0, c().w1 + stF, 'Ende: ' + nm + ' dazu'), () => hxHumApply(L, c().w0, c().w1 - stF, 'Ende: ' + nm + ' weg'), ['Hinten ' + nm + ' weg – die Schleife endet früher', 'Hinten ' + nm + ' dazu – die Schleife endet später']),
      tk ? null : btn('◀ Ton', ton('b', -1), 'Das Ende an den Anschlag davor (die Schleife endet kurz vor ihm)'), tk ? null : btn('Ton ▶', ton('b', 1), 'Das Ende an den Anschlag danach')),
    row('Verschieben', btn('◀ ' + nm, () => hxHumApply(L, c().w0 - stF, c().w1 - stF, 'Ausschnitt ' + nm + ' früher'), 'Der Ausschnitt ' + nm + ' früher – gleiche Länge, sofort'), btn(nm + ' ▶', () => hxHumApply(L, c().w0 + stF, c().w1 + stF, 'Ausschnitt ' + nm + ' später'), 'Der Ausschnitt ' + nm + ' später'),
      btn('wie geerntet', () => hxHumReset(L), 'Der Ausschnitt wie beim Ernten')));
  const box = h('div', { class: 'hx-ed-humbox', title: 'Die ganze Ernte – alles, was der Humus beim Ernten hielt. Hell: was die Schleife spielt. Ziehen verschiebt den Ausschnitt, die Ränder ziehen ändert seine Länge (auf ganze Schläge, mit Umschalt auf ganze Takte; eine freie Schleife auf 10 ms). Gehört wird es ab der nächsten Naht – oder sofort, wenn die Länge bleibt. ↶ nimmt es zurück.' }, cv);
  if (one) hxHumDrag(box, L);
  return h('div', { class: 'hx-ed-sec hx-ed-hum' }, h('div', { class: 'hx-ed-st' }, 'Ganze Ernte'), box, h('div', { class: 'hx-ed-humft' }, info), tools);
}
// the steps (k, its word, beats – a quarter is a beat; a free loop's in seconds) and the one chosen, kept for the device
const HX_STEPS_T = [['takt', 'Takt'], ['2', '1/2'], ['1', '1/4'], ['0.5', '1/8'], ['0.25', '1/16'], ['0.125', '1/32'], ['0.0625', '1/64']];
const HX_STEPS_F = [['1', '1 s'], ['0.1', '0,1 s'], ['0.01', '10 ms'], ['0.001', '1 ms']];
HXEH.step = { t: 'takt', f: '0.1' }; HXEH.tri = false;
try { const o = JSON.parse(store.get('myzel.hxStep') || 'null'); if (o) { Object.assign(HXEH.step, o.step || {}); HXEH.tri = !!o.tri; } } catch (e) {}
function hxHumStepSave() { store.set('myzel.hxStep', JSON.stringify({ step: HXEH.step, tri: HXEH.tri })); }
function hxHumStep(tk) {
  if (!tk) { const k = HX_STEPS_F.some((x) => x[0] === HXEH.step.f) ? HXEH.step.f : '0.1', t = HX_STEPS_F.find((x) => x[0] === k)[1]; return { k, s: +k, t }; }
  const L = hxEdL(), bpb = (L && L.bpb) || 4, k = HX_STEPS_T.some((x) => x[0] === HXEH.step.t) ? HXEH.step.t : 'takt', base = HX_STEPS_T.find((x) => x[0] === k)[1];
  if (k === 'takt') return { k, b: bpb, t: 'Takt' };
  return HXEH.tri ? { k, b: (+k * 2) / 3, t: base + 'T' } : { k, b: +k, t: base };
}
// the attack nearest an edge (frames, absolute) – before it (dir −1) or after it (+1), within 4 s, a few ms ahead of the
// attack so the seam's crossfade leaves it whole; null when none
function hxHumTon(L, at, dir) {
  const H = L && L.hum; if (!H) return null;
  const span = Math.round(4 * SR), a = Math.max(H.f0, at - span), b = Math.min(H.f0 + H.n, at + span);
  if (b - a < SR / 10) return null;
  const x = hxMono(H.aud, a - H.f0, b - a), ons = hxOnsetsAt(x).map((f) => a + f - Math.round(0.004 * SR)), gap = Math.round(0.02 * SR);
  const cand = dir < 0 ? ons.filter((f) => f < at - gap) : ons.filter((f) => f > at + gap);
  return cand.length ? (dir < 0 ? cand[cand.length - 1] : cand[0]) : null;
}
// the strip's view: from the first sound in the Ernte (a second before it) to its end – the silence before is left out
function hxHumView(H) {
  if (!H.vw) {
    let a = H.n;
    for (let i = 0; i < H.n; i += 256) { const ch = H.aud[Math.floor(i / HX_CH)]; if (!ch) continue; const j = i % HX_CH; if (Math.abs(ch[0][j]) > 3e-4 || Math.abs(ch[1][j]) > 3e-4) { a = i; break; } }
    const v0 = H.f0 + Math.max(0, Math.min(a - SR, H.n - 10 * SR));
    H.vw = { f0: v0, n: H.f0 + H.n - v0 };
  }
  return H.vw;
}
// frames ↔ the strip's x (the Ernte from its first sound)
const hxHumX = (H, f, w) => { const V = hxHumView(H); return ((f - V.f0) / Math.max(1, V.n)) * w; };
function hxHumDrag(box, L) {
  const fr = (e) => { const r = HXE.hcv.getBoundingClientRect(), V = hxHumView(L.hum); return V.f0 + clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1) * V.n; };
  box.addEventListener('pointerdown', (e) => {
    const S = HX.sch.get(L.sch[0]), H = L.hum; if (!S || !H || e.button > 0) return;
    const r = HXE.hcv.getBoundingClientRect(), x = e.clientX - r.left, xa = hxHumX(H, S.cut.w0, r.width), xb = hxHumX(H, S.cut.w1, r.width);
    const mode = Math.abs(x - xa) < 8 ? 'a' : Math.abs(x - xb) < 8 ? 'b' : x > xa && x < xb ? 'm' : 'j';
    HXEH.drag = { L, mode, f: fr(e), w0: S.cut.w0, w1: S.cut.w1, v0: S.cut.w0, v1: S.cut.w1, moved: false };
    if (mode === 'j') { const len = S.cut.w1 - S.cut.w0, st = hxHumSnap(L, fr(e) - len / 2, e, S); Object.assign(HXEH.drag, { mode: 'm', w0: st, w1: st + len, v0: st, v1: st + len, moved: true }); }   // (a press beside the window: it jumps there, centred – dragging on moves it)
    box.setPointerCapture(e.pointerId); e.preventDefault(); hxHumDraw();
  });
  box.addEventListener('pointermove', (e) => {
    const D = HXEH.drag; if (!D || D.L !== L) { const S = HX.sch.get(L.sch[0]), H = L.hum; if (S && H && HXE.hcv) { const r = HXE.hcv.getBoundingClientRect(), x = e.clientX - r.left; box.style.cursor = Math.abs(x - hxHumX(H, S.cut.w0, r.width)) < 8 || Math.abs(x - hxHumX(H, S.cut.w1, r.width)) < 8 ? 'ew-resize' : 'grab'; } return; }
    const S = HX.sch.get(L.sch[0]), H = L.hum; if (!S || !H) return;
    const d = fr(e) - D.f, minF = hxTakt(L) ? S.cut.len / L.d.beats : 0.1 * SR, maxF = hxTakt(L) ? (S.cut.len / L.d.beats) * 128 * (L.bpb || 4) : H.n;
    let v0 = D.w0, v1 = D.w1;
    if (D.mode === 'm') { v0 = hxHumSnap(L, D.w0 + d, e, S); v1 = v0 + (D.w1 - D.w0); }
    else if (D.mode === 'a') { v0 = clamp(hxHumSnap(L, D.w0 + d, e, S), D.w1 - maxF, D.w1 - minF); }
    else { v1 = clamp(hxHumSnap(L, D.w1 + d, e, S), D.w0 + minF, D.w0 + maxF); }
    const lo = H.f0 + S.cut.pre, hi = H.f0 + H.n - S.cut.post;   // (its margins inside the Ernte)
    if (v0 < lo) { const k = lo - v0; v0 += k; if (D.mode !== 'a') v1 += k; }
    if (v1 > hi) { const k = v1 - hi; v1 -= k; if (D.mode !== 'b') v0 -= k; }
    D.v0 = v0; D.v1 = v1; D.moved = D.moved || Math.abs(d) > 0.002 * H.n; hxHumDraw();
  });
  const end = () => { const D = HXEH.drag; if (!D || D.L !== L) return; HXEH.drag = null; if (D.moved) { const lab = D.mode === 'a' ? 'Anfang in der Ernte' : D.mode === 'b' ? 'Ende in der Ernte' : 'Ausschnitt in der Ernte'; if (!hxHumApply(L, D.v0, D.v1, lab)) hxHumDraw(); } else hxHumDraw(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}
// a frame on the loop's grid: its beats (Umschalt: bars) counted from where it starts, a free loop's 10 ms
function hxHumSnap(L, f, e, S) {
  if (!hxTakt(L)) { const q = 0.01 * SR; return S.cut.w0 + Math.round((f - S.cut.w0) / q) * q; }
  const beatF = S.cut.len / L.d.beats, q = e && e.shiftKey ? beatF * (L.bpb || 4) : beatF;
  return S.cut.w0 + Math.round((f - S.cut.w0) / q) * q;
}
// the strip: the Ernte's peaks (made once per width), its bars, the loop's window bright, the rest dim
function hxHumDraw() {
  const cv = HXE.hcv, L = hxEdL(); if (!cv || !cv.isConnected || !L || !L.hum) return;
  const H = L.hum, S = HX.sch.get(L.sch[0]); if (!S) return;
  const w = cv.clientWidth, hh = cv.clientHeight; if (!w || !hh) return;
  const c = mxFit(cv, w, hh, 0, Math.min(2, devicePixelRatio || 1)), W = Math.min(1600, Math.round(w));
  if (!H.pk || H.pk.W !== W) {
    const V = hxHumView(H), off = V.f0 - H.f0, mn = new Float32Array(W), mx = new Float32Array(W), per = V.n / W;
    for (let x = 0; x < W; x++) {
      const a = off + Math.floor(x * per), b = Math.min(H.n, off + Math.floor((x + 1) * per)), st = Math.max(1, Math.floor((b - a) / 96));   // (≈ 96 reads a column – enough for a picture)
      let lo = 0, hi = 0;
      for (let i = a; i < b; i += st) { const ch = H.aud[Math.floor(i / HX_CH)]; if (!ch) continue; const j = i % HX_CH, v = (ch[0][j] + ch[1][j]) * 0.5; if (v < lo) lo = v; if (v > hi) hi = v; }
      mn[x] = lo; mx[x] = hi;
    }
    let m = 1e-4; for (let x = 0; x < W; x++) m = Math.max(m, -mn[x], mx[x]);
    H.pk = { W, mn, mx, m };
  }
  const D = HXEH.drag && HXEH.drag.L === L ? HXEH.drag : null, v0 = D ? D.v0 : S.cut.w0, v1 = D ? D.v1 : S.cut.w1;
  const xa = hxHumX(H, v0, w), xb = hxHumX(H, v1, w), amp = (hh * 0.44) / Math.max(H.pk.m, 0.05);
  c.clearRect(0, 0, w, hh); c.fillStyle = '#120e0b'; c.fillRect(0, 0, w, hh);
  c.fillStyle = 'rgba(255,179,92,.10)'; c.fillRect(xa, 0, Math.max(1, xb - xa), hh);
  // the bars on the loop's grid, across the whole Ernte
  if (hxTakt(L)) {
    const V = hxHumView(H), barF = (S.cut.len / L.d.beats) * (L.bpb || 4), k0 = Math.ceil((V.f0 - v0) / barF), k1 = Math.floor((V.f0 + V.n - v0) / barF);
    if ((k1 - k0) * 9 < w) { c.fillStyle = 'rgba(240,230,216,.10)'; for (let k = k0; k <= k1; k++) c.fillRect(Math.round(hxHumX(H, v0 + k * barF, w)), 0, 1, hh); }
  }
  for (let x = 0; x < W; x++) {
    const px = (x / W) * w, inW = px >= xa && px < xb, y0 = hh / 2 - H.pk.mx[x] * amp, y1 = hh / 2 - H.pk.mn[x] * amp;
    c.fillStyle = inW ? 'rgba(233,163,94,.9)' : 'rgba(168,152,138,.35)';
    c.fillRect(px, y0, Math.max(1, w / W), Math.max(1, y1 - y0));
  }
  c.fillStyle = '#ffb35c'; c.fillRect(xa - 1, 0, 2, hh); c.fillRect(xb - 1, 0, 2, hh);
  c.fillRect(xa - 4, 0, 8, 3); c.fillRect(xb - 4, 0, 8, 3); c.fillRect(xa - 4, hh - 3, 8, 3); c.fillRect(xb - 4, hh - 3, 8, 3);
  if (D) { const t = hxTakt(L) ? Math.round((v1 - v0) / (S.cut.len / L.d.beats)) : 0, bpb = L.bpb || 4; c.fillStyle = '#f0e6d8'; c.font = '600 11px ' + COL.fontNum; c.textBaseline = 'top';
    c.fillText(hxTakt(L) ? (t % bpb ? t + ' Schläge' : t / bpb + (t / bpb === 1 ? ' Takt' : ' Takte')) : dec(((v1 - v0) / SR).toFixed(2)) + ' s', clamp(xa + 6, 4, w - 80), 5); }
}
