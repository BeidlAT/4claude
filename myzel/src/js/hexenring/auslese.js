// ---- Auslese (SPEC §12.1c, Etappe 1): k ≥ 3 repetitions of what was harvested, aligned by DTW on (onset, degree); the
// clusters present in ≥ ⌈k/2⌉ of them survive with median timing and velocity – the consensus; agreement p = the mean
// F-measure of each repetition against it. Offered (never automatic, only from p ≥ 80 %): the REAL repetition closest
// to the consensus, as an exact Abdruck – a chip „Auslese aus k · p %“. (The consensus itself, as Wuchs: Etappe 2b.) ----
const HX_AUSL_P = 80;
// DTW of two onset lists ({t, d}): matched pairs where time (σ 50 ms) and degree agree, the cost of the path
function hxDtw(a, b) {
  const n = a.length, m = b.length, gap = 1.5, c = (x, y) => Math.min(2, Math.abs(x.t - y.t) / 0.05) + (x.d === y.d ? 0 : 1);
  const D = new Float64Array((n + 1) * (m + 1)).fill(Infinity), W = m + 1;
  D[0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (!i && !j) continue;
    let v = Infinity;
    if (i && j) v = D[(i - 1) * W + j - 1] + c(a[i - 1], b[j - 1]);
    if (i) v = Math.min(v, D[(i - 1) * W + j] + gap);
    if (j) v = Math.min(v, D[i * W + j - 1] + gap);
    D[i * W + j] = v;
  }
  const pairs = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    const here = D[i * W + j];
    if (i && j && Math.abs(here - (D[(i - 1) * W + j - 1] + c(a[i - 1], b[j - 1]))) < 1e-9) { if (c(a[i - 1], b[j - 1]) < 1) pairs.push([i - 1, j - 1]); i--; j--; }
    else if (i && Math.abs(here - (D[(i - 1) * W + j] + gap)) < 1e-9) i--;
    else j--;
  }
  return { cost: D[n * W + m], pairs: pairs.reverse() };
}
// cycles: [[{t (s into the cycle), d (degree index), v}]] → {k, p (%), best (the index of the real one closest to the
// consensus), cons} or null
function hxAuslese(cyc) {
  const k = cyc.length;
  if (k < 3 || cyc.some((c) => !c.length)) return null;
  // the medoid is the reference: every cycle aligned to it, its events the clusters' seeds
  let ref = 0, rc = Infinity;
  for (let i = 0; i < k; i++) { let s = 0; for (let j = 0; j < k; j++) if (j !== i) s += hxDtw(cyc[i], cyc[j]).cost; if (s < rc) { rc = s; ref = i; } }
  const R = cyc[ref], cl = R.map((e) => [e]);
  for (let j = 0; j < k; j++) if (j !== ref) for (const [a, b] of hxDtw(R, cyc[j]).pairs) cl[a].push(cyc[j][b]);
  const need = Math.ceil(k / 2), med = (x) => { const s = x.slice().sort((p, q) => p - q); return s.length % 2 ? s[s.length >> 1] : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]); };
  const kept = cl.filter((c) => c.length >= need), cons = kept.map((c) => ({ t: med(c.map((e) => e.t)), d: c[0].d, v: med(c.map((e) => e.v)) }));
  if (!cons.length) return null;
  let pS = 0, best = -1, bc = Infinity;
  for (let i = 0; i < k; i++) {
    const r = hxDtw(cyc[i], cons), mt = r.pairs.length, f = (2 * mt) / (cyc[i].length + cons.length);
    pS += f;
    if (r.cost < bc - 1e-9 || (Math.abs(r.cost - bc) < 1e-9 && i > best)) { bc = r.cost; best = i; }
  }
  return { k, p: Math.round((100 * pS) / k), best, cons, cl: kept, med };   // (step 2b: the clusters, for the consensus as Wuchs)
}
// for a harvested Schleife: its repetitions in the Humus (the region the Ohr found, one loop length apart, back from its
// window) → L.ausl {k, p, w0, w1} when a different real one is closer to the consensus; the chip offers it
function hxAusleseFor(L, rep) {
  const c = L.cut, S = HX.sch.get(L.sch[0]);
  if (!c || !rep || !S || L.sch.length !== 1 || c.in !== 0) return null;
  const w0 = hxT(c.w0), len = c.len / SR, P0 = Math.abs(rep.p - len) / len < 0.04 ? len : null;
  if (!P0 || hxT(c.w1) > hxNowT()) return null;
  const cyc = [], starts = [];
  for (let j = 0; j < 16; j++) {
    const a = w0 - j * P0;
    if (a < rep.anchor - 0.06 || !hxReach(hxCut(0, 0, 0, { f0: Math.round(hxF(a)), f1: Math.round(hxF(a + P0)) }))) break;
    const evs = hxNotes(a - 0.04, a + P0 - 0.04, 0, false), ons = hxOnsets(evs).map((o) => ({ t: o.t - a, d: o.d[0], v: o.v, a0: a, evs: evs.filter((e) => Math.abs(e.t0 - o.t) < 0.031) }));   // (step 2b: each onset with its notes – the consensus is made of them)
    cyc.unshift(ons); starts.unshift(a);
  }
  const r = hxAuslese(cyc);
  L.ausl = null;
  if (!r || r.p < HX_AUSL_P) return r;
  // (step 2b) the consensus itself, as a Wuchs record: offered when it is not the harvest as played
  const W0 = S.wn || hxWNotesOf(S, L), cons = W0 ? hxAusleseCons(L, S, cyc, r, starts, P0) : null, same = cons && W0 && cons.n.length === W0.n.length && cons.n.every((x, i) => Math.abs(x.t - W0.n[i].t) < 0.005 && Math.abs((x.vel || 0) - (W0.n[i].vel || 0)) < 0.02 && x.deg === W0.n[i].deg);
  if (r.best === cyc.length - 1 && (!cons || same)) return r;   // (the harvest is itself the closest and the consensus: nothing better to offer)
  L.ausl = { k: r.k, p: r.p, w0: r.best === cyc.length - 1 ? null : starts[r.best], w1: r.best === cyc.length - 1 ? null : starts[r.best] + P0, cons: same ? null : cons };
  if (HX.chips && HX.chips.key === L.key) { HX.chips.ausl = 1; HX.chips.until = Math.max(HX.chips.until, performance.now() + 4000); HXU.sig = ''; hxRailDirty(); }
  hxCardDirty();
  return r;
}
// the chip: that repetition's audio becomes the Schicht (from the Humus, swapped at the next seam; ↶ brings the harvest back)
function hxAusleseDo(L) {
  hxRxWait();   // (a stretch's edit still in the Workers: written first – abschnitt.js)
  const A0 = L && L.ausl, S = L && HX.sch.get(L.sch[0]);
  if (!A0 || !S) return false;
  if (A0.w0 == null) return A0.cons ? hxAusleseWuchs(L) : false;   // (step 2b: only the consensus to offer)
  const c = hxCut(S.cut.in, A0.w0, A0.w1);
  if (!hxReach(c)) { toast('So weit reicht der Humus nicht zurück.'); L.ausl = null; hxCardDirty(); return false; }
  const before = hxGeo(L), key = L.key, after = {};
  hxSchSwap(S, c, { f: hxNextSeam(L).f });
  L.ausl = null; L.rep = null;
  hxHist({ kind: 'recut', label: hxName(L) + ': Auslese aus ' + A0.k + ' · ' + A0.p + ' %', undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); } }, redo() { const X = hxByKey(key); if (X && after.g) hxGeoBack(X, after.g); } });
  hxSay(hxName(L) + ': Auslese – die Wiederholung, die am besten passt'); hxRailDirty(); hxCardDirty();
  return true;
}

// the field's tag (top left, no pointer events): the nanoKONTROL2's page
function hxTagSync() {
  const tg = HXU.tag || (HXU.tag = $('#hxTag')); if (!tg) return;
  const nk = [...MIDI.srcs.values()].some((s) => s.nkHx && s.enabled);
  const t = nk ? 'nanoKONTROL2: Seite Hexenring' : '';
  if (tg.textContent !== t) tg.textContent = t;
  tg.hidden = !t;
}

// the session's form, with the Schleifen (IndexedDB '_s')
function hxFormSave() { if (IDB.ok && hxLive()) { clearTimeout(HX.formTm); HX.formTm = setTimeout(() => hxDbPut('rings', hxSessRec()), 250); } }

/* ---- Step 2a: Wuchs (SPEC §10; KONZEPT §3.4, §3.5, §5.2) – a Schleife with notes, played anew by Myzel's own sources in
   the Werk-Rahmen. Treu: rendered once per change (one throw, its seed fixed) and played as an Abdruck. Lebendig: a new
   throw every pass and the timing breathing a little around the groove, each pass streamed into myzel-ring. It follows
   the key (diatonisch · transponieren · fest – the field and the loops change on the same bar line), the tempo (from the
   change, a pass rendered from its start in the new tempo) and the sound (eigen · Spielfeld · any source). ✓ keeps the
   pass that sounds – its audio is the anchor; ✕ plays the anchor for the next pass (twice in four bars: Treu for eight);
   ⚓ goes back to the original. The live instrument comes first: the Werk-Rahmen's work is no voice budget, and an
   underrun pauses the living passes before it touches anything live (§10.5). ---- */
const HX_WTAIL = 12, HX_WLEAD = 1.25, HX_WSTART = 2.4;   // s: a pass's tail at most (until −90 dB); a streamed pass ahead of what plays; a living pass's render starts this long before it
// the Werk-Rahmen beside the first one for the living passes: one renders one pass at a time, so passes overlap (a tail
// rendering while the next pass starts) and loops live side by side – strong devices use their cores
// A paced render waits most of the time (it may run only HX_WLEAD ahead of what plays), so a realm is busy about as long as
// its pass lasts plus its tail's render: a living Schicht keeps one or two realms busy whatever the cores – the cap is the
// memory each realm holds (a second copy of the app). Desktops and tablets up to 8, phones by their memory (2 … 4).
const HX_TABLET = MOBILE && Math.min(screen.width || 0, screen.height || 0) >= 700;
const HX_WPOOL = !MOBILE || HX_TABLET ? clamp(navigator.hardwareConcurrency || 4, 4, 8) : clamp(Math.floor((navigator.deviceMemory || 4) / 2), 2, 4);
// measured render time of the Werk-Rahmen (SPEC §21, step 2a): seconds of rendering per second of one voice, in units of
// this machine's CAL.unit (one level-1 Nebel voice offline) – per source, levels 1, 2, 3; and the graph's own share per
// second of audio and per render (ms). The guard's prediction scales them by the device's own CAL.unit.
// (dev/tests/hexenring/wrt.js, step 2a: the higher of two runs, +15 %; def – the Bordun, a source not measured – the median.
// The empty graph's share per render is under the machine's scatter at levels 1 and 2: 0 there)
const HX_WRT = { def: [1.85, 2.15, 2.85], hau: [0.78, 1.65, 1.61], obt: [1.56, 2.08, 2.28], stm: [2.25, 2.86, 3.67], hlm: [1.02, 1.48, 1.4], boe: [2.26, 2.2, 2.81],
  elm: [1.85, 2.12, 2.85], khl: [0.92, 1.07, 1.15], neb: [2.19, 1.9, 3.02], kor: [4.74, 3.81, 5.07], swm: [2.63, 2.27, 4.02], amo: [1.85, 1.77, 2.66], hrz: [2.74, 2.9, 5.14],
  shn: [1.29, 1.34, 1.62], zpf: [1.72, 2.42, 2.11], rnk: [0.92, 1.27, 1.48], sai: [2.14, 2.15, 2.68], jrg: [1.66, 1.95, 3.46], glo: [1.35, 2.17, 3.26], sch: [1.89, 2.19, 3.42],
  gng: [1.97, 2.22, 4.29], klb: [1, 1.66, 2.04], gsp: [3.38, 3.19, 4.19], tie: [0.64, 1.19, 2.2], glt: [2.12, 2.14, 2.23], mem: [0.69, 0.8, 0.87], trp: [0.92, 1.38, 1.33],
  mdr: [3.03, 3.32, 4.71], rhz: [3.29, 3.84, 3.97] };
const HX_WBASE = { 1: { perS: 8.76, perRender: 0 }, 2: { perS: 5.76, perRender: 0 }, 3: { perS: 5.55, perRender: 24 } };
Object.assign(HX, { wLast: 0, wGuard: { pause: 0, max: Infinity, n: 0, t: 0 }, folge: null, tonK: null, wJobs: 0, wLate: 0, wRen: 0 });
HXW.pool = [];

