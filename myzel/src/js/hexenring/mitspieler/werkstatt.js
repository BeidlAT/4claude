// ---- the Gärtner's Werkstatt (owner, 28.10.2026: „der gärtner designt im hintergrund laufend … 10 kreationen … aus der
// liste auswählen und on the fly durchklicken … alle 10 automatisch durchgespielt und der user kann on the fly ja sagen“).
// A creation is a recipe per Schicht – its notes varied by the operators the player allows (Noten: neighbour degrees,
// thinner, passing notes, ornaments; Rhythmus: euclid, half-bar swaps; Oktaven) and, if allowed, another source of the
// same kind – rendered in the Werk-Rahmen one after another while the loop plays on. A creation plays from the next 1
// (the processor's replace, as every version); „Ja“ keeps it as a Trieb: its recipe is stored with the loop (its audio
// is made again from it – the same seed, the same sound), the original is never touched. Umfang „Leiste“: the same
// creation index for every loop with notes, chosen and played together.
// Etappe 2 (28.10.2026): Effekte – a creation may colour the loop too (Filterwelle, Phaser, Chorus, Wärme, Kreisen,
// Bandfilter), burnt into its audio through the loop's insert chain as a Wuchs pass is (hxwChain); the waves move in whole
// cycles per pass, so each pass sounds as the one before. A creation differs clearly from the original (≥ 30 % of its
// notes), and each one in the automatic run plays at least 10 s („geht viel zu schnell“). ----
const HXWS = { auto: null, gen: null, pop: null, slot: null, glyphs: [], t: 0 };
const hxWsOn = (L) => !!(L && !L.bew && L.state !== 'weg' && L.sch.some((id) => hxWCan(HX.sch.get(id))));
const hxWsOf = (L) => L.krea || (L.krea = { list: [], sel: null, triebe: [] });
function hxWsRecipe(T) { return { seed: T.seed, sch: T.sch, name: T.name, t: T.t }; }
const HX_WS_DIFF = 0.3;   // (how much of the notes a creation changes at least – hxVDist)
function hxWsRestore(L, krt, krs) {
  const K = hxWsOf(L);
  K.triebe = krt.filter((x) => x && x.sch).map((x) => ({ seed: x.seed, sch: x.sch, name: x.name || 'Trieb', t: x.t || Date.now(), V: null }));
  if (krs && /^t\d+$/.test(krs) && K.triebe[+krs.slice(1)]) K.want = krs;   // (played again once its audio is made – hxWsTick)
}
// the loops a creation is for
const hxWsLoops = (L) => (P['hx.ws.umfang'] === 'leiste' ? hxLoopsLive().filter(hxWsOn) : [L]);
// a creation's notes for one Schicht: the operators allowed, chained three steps from the Schicht's own notes
function hxWsNotes(W0, seed) {
  const al = { nb: P['hx.ws.noten'], th: P['hx.ws.noten'], fi: P['hx.ws.noten'], orn: P['hx.ws.noten'], eu: P['hx.ws.rhythmus'], sw: P['hx.ws.rhythmus'], ok: P['hx.ws.oktaven'] };
  if (!Object.values(al).some(Boolean)) return null;
  const wts = {}; for (const k in al) wts[k] = al[k] ? 1 : 0;
  let prev = { n: W0.n, hist: [] }, best = null, bd = 0;
  for (let s = 0; s < 24; s++) {
    const r = hxVarStep(W0, W0.n, prev, { seed: (seed ^ Math.imul(s + 1, 0x2c1b3c6d)) | 0, lvl: 3, wts, gd: 0, segs: [], bpb: 4 });
    if (!r.ops.length || r.ops[0] === 'ret') continue;
    prev = r;
    const d = hxVDist(W0, W0.n, r.n); if (d > bd) { bd = d; best = r.n; }
    if (s >= 2 && d >= HX_WS_DIFF) break;   // (clearly another – „er merkte oft nichts“)
  }
  return best;
}
// another source of the same kind (holds, strikes or both) – its family first
function hxWsEng(eng, R) {
  const M = ENG_META[eng]; if (!M) return null;
  const same = Object.keys(ENG_META).filter((k) => k !== eng && ENG_META[k].art === M.art && ENGINES[k] && !['gsp', 'rhz', 'kor'].includes(k));
  const fam = same.filter((k) => ENG_META[k].fam === M.fam), pool = fam.length && R() < 0.6 ? fam : same;
  return pool.length ? pool[Math.floor(R() * pool.length)] : null;
}
// Effekte: one or two colours, each a set of the insert chain's settings (HX_CHAIN); a wave moves k whole cycles per pass
const HX_WS_FX = {
  filter: { n: 'Filterwelle', g: 'flt', v: (R, w) => ({ 'flt.type': 'lowpass', 'flt.freq': 650 * Math.pow(4, R()), 'flt.q': 1.2 + 4 * R(), 'flt.lfoRate': w([1, 2]), 'flt.lfoDepth': 0.8 + 1.2 * R() }) },
  band: { n: 'Bandfilter', g: 'flt', v: (R) => ({ 'flt.type': 'bandpass', 'flt.freq': 700 * Math.pow(2.6, R()), 'flt.q': 0.7 + 0.9 * R(), 'flt.lfoDepth': 0 }) },
  phaser: { n: 'Phaser', g: 'pha', v: (R, w) => ({ 'pha.mix': 0.35 + 0.25 * R(), 'pha.rate': w([1, 2, 4]), 'pha.depth': 0.5 + 0.4 * R(), 'pha.fb': 0.3 + 0.35 * R() }) },
  chorus: { n: 'Chorus', g: 'cho', v: (R) => ({ 'cho.mix': 0.35 + 0.2 * R(), 'cho.rate': 0.25 + 0.65 * R(), 'cho.depth': 0.35 + 0.4 * R() }) },
  waerme: { n: 'Wärme', g: 'drv', v: (R) => ({ 'drv.type': 'tube', 'drv.amt': 0.18 + 0.22 * R(), 'drv.mix': 0.35 + 0.25 * R() }) },
  kreisen: { n: 'Kreisen', g: 'mov', v: (R, w) => ({ 'mov.pan': 0.35 + 0.45 * R(), 'mov.panRate': w([1, 2]) }) },
};
// the chain as the loop has it (dry: every colour off), the recipe's colours over it
const HX_WS_DRY = { 'drv.mix': 0, 'rng.mix': 0, 'flt.type': 'lowpass', 'flt.freq': 18000, 'flt.lfoDepth': 0, 'pha.mix': 0, 'cho.mix': 0, 'mov.pan': 0 };
function hxWsFx(R, passS) {
  const w = (ks) => { let k = ks[Math.floor(R() * ks.length)]; while (k / passS > 1.5 && k > 1) k /= 2; return clamp(k / passS, 0.02, 3); };   // (whole cycles per pass, never a flutter)
  const keys = Object.keys(HX_WS_FX), n = R() < 0.6 ? 1 : 2, out = [];
  while (out.length < n) { const k = keys[Math.floor(R() * keys.length)]; if (!out.some((x) => x === k || HX_WS_FX[x].g === HX_WS_FX[k].g)) out.push(k); }
  const v = {}; for (const k of out) Object.assign(v, HX_WS_FX[k].v(R, w));
  return { k: out, v };
}
function hxWsChain(L, fx, seed) {
  const C0 = L.chainRec, R = hxRng(seed ^ 0x5bd1e995), base = {};
  HX_CHAIN.forEach((id, i) => { base[id] = C0 ? C0.snap[i] : id in HX_WS_DRY ? HX_WS_DRY[id] : PD[id].d; });
  Object.assign(base, fx.v);
  const rate = { rng: base['rng.freq'], flt: base['flt.lfoRate'], pha: base['pha.rate'], cho1: base['cho.rate'], cho2: base['cho.rate'] * 1.13, pan: base['mov.panRate'] };
  const lfo = {}; for (const k in HX_LFO) lfo[k] = [R(), rate[k], rate[k], 1];   // (a phase of its own, the rate as set)
  return { ids: HX_CHAIN, snap: HX_CHAIN.map((id) => base[id]), os: QP[3].os, lite: false, ev: [], lfo, mod: {} };   // (always the best oversampling)
}
const hxWsWhat = (it) => { if (!it || !it.sch) return ''; const r = Object.values(it.sch), w = []; if (r.some((x) => x.vn)) w.push('Noten'); const e = r.find((x) => x.eng); if (e) w.push(ENG_NAME[e.eng] || e.eng); const f = r.find((x) => x.fx); if (f) for (const k of f.fx.k) w.push(HX_WS_FX[k].n); return w.join(' · '); };
// a recipe for loop L: per Schicht (by its place in the loop) its notes and source
function hxWsMake(L, seed) {
  const sch = {}, R = hxRng(seed), sw = hxNextSeam(L), fx = P['hx.ws.effekte'] && !L.folgt ? hxWsFx(R, Math.max(0.25, (hxPassF(L, sw.k + 1) - hxPassF(L, sw.k)) / SR)) : null;   // (a loop that follows the live chain: its colours are the field's)
  L.sch.forEach((id, i) => {
    const S = HX.sch.get(id); if (!hxWCan(S)) return;
    const W0 = hxWBase(L, S); if (!W0) return;
    const vn = hxWsNotes(W0, (seed ^ Math.imul(i + 3, 0x61c88647)) | 0);
    const eng0 = (W0.n.find((n) => EB_OF[n.src]) || W0.n[0] || {}).eng, eng = P['hx.ws.klang'] ? hxWsEng(hxWEng(L, { src: 'fin', eng: eng0 }), R) : null;
    if (vn || eng || fx) sch[i] = { vn: vn || null, eng: eng || null, fx };
  });
  return Object.keys(sch).length ? sch : null;
}
// its audio: each Schicht rendered as the loop's next pass would be, with the recipe's notes and source
async function hxWsRender(L, rec, seed) {
  const V = {};
  for (const i in rec) {
    const S = HX.sch.get(L.sch[+i]); if (!S || !hxWCan(S)) continue;
    const W0 = hxWBase(L, S), r = rec[i], W = r.vn ? Object.assign({}, W0, { n: r.vn }) : W0;
    const k = hxNextSeam(L).k, job = hxWPass(L, S, k, { W }); if (!job) continue;
    if (r.eng) for (const n of job.notes) if (EB_OF[n.src] || !n.src) n.eng = r.eng;
    const d = hxWJob(L, S, job, seed); if (r.fx) d.chain = hxWsChain(L, r.fx, seed);
    const m = await hxwCall('wuchs', d);
    if (!m || m.err || !m.L) { if (m && m.err) hxwLog('werkstatt: ' + String(m.err).slice(0, 120)); return null; }
    const n = hxWTrim(m.L, m.R, job.lenF);
    if (!hxMemOk(n)) return null;
    const [aud] = hxChunks(n);
    for (let j = 0; j < n; j++) { const ch = aud[Math.floor(j / HX_CH)], q = j % HX_CH; ch[0][q] = m.L[j]; ch[1][q] = m.R[j]; }
    if (n >= m.L.length) hxWFadeEnd(aud, n, job.lenF);
    V[i] = { aud, n, len: job.lenF, sig: 'krea', seed };
  }
  return Object.keys(V).length ? V : null;
}
// grow the creations (the count set), one after another, for every loop of the Umfang
async function hxWsGrow(L0) {
  if (HXWS.gen) return;
  if (HXW.st === 'kein') { toast('Der Werk-Rahmen fehlt hier – die Werkstatt kann nichts wachsen lassen.', 4000); return; }
  if (!P['hx.ws.noten'] && !P['hx.ws.rhythmus'] && !P['hx.ws.oktaven'] && !P['hx.ws.klang'] && !P['hx.ws.effekte']) { toast('Wähle, was der Gärtner verändern darf: Noten, Rhythmus, Oktaven, Klang oder Effekte.', 4000); return; }
  const loops = hxWsLoops(L0); if (!loops.length) return;
  const N = +P['hx.ws.anzahl'] || 10, G = (HXWS.gen = { loops: loops.map((L) => L.key), n: 0, N, stop: false });
  for (const L of loops) { const K = hxWsOf(L); K.list = []; if (typeof K.sel === 'number') hxWsPlay(L, null); }
  hxSay('Gärtner: ' + N + ' Kreationen wachsen'); hxWsDirty();
  for (let c = 0; c < N && !G.stop; c++) {
    const seed = ((Math.random() * 2147483646) | 0) + 1;
    for (const key of G.loops) {
      const L = hxByKey(key); if (!L || !hxWsOn(L)) continue;
      const K = hxWsOf(L), item = { i: c, seed, sch: null, V: null, st: 'waechst' };
      K.list.push(item); hxWsDirty();
      item.sch = hxWsMake(L, seed);
      item.V = item.sch ? await hxWsRender(L, item.sch, seed) : null;
      item.st = item.V ? 'fertig' : 'leer';
      hxWsDirty();
      if (G.stop) break;
    }
    G.n = c + 1;
  }
  HXWS.gen = null;
  for (const key of G.loops) { const L = hxByKey(key); if (L) L.krea.list = L.krea.list.filter((x) => x.st === 'fertig'); }
  if (!G.stop) hxSay('Gärtner: Kreationen fertig');
  hxWsDirty();
}
function hxWsStop() { if (HXWS.gen) HXWS.gen.stop = true; if (HXWS.auto) hxWsAuto(null); hxWsDirty(); }
// play a creation (its index), a Trieb ('t' + index) or the original (null) – for every loop of the Umfang, from the next 1
function hxWsPlay(L0, which, fAt) {
  const lst = P['hx.ws.umfang'] === 'leiste', has = (L) => (which == null ? L.krea && L.krea.sel != null : typeof which === 'number' ? L.krea && L.krea.list.some((x) => x.i === which && x.V) : L.krea && L.krea.triebe[+String(which).slice(1)]);
  const loops = lst ? [L0].concat(hxLoopsLive().filter((L) => L !== L0 && has(L))) : [L0];   // (die ganze Leiste: every loop together – the original too)
  for (const L of loops) {
    const K = hxWsOf(L), T = which == null ? null : typeof which === 'number' ? K.list.find((x) => x.i === which) : K.triebe[+String(which).slice(1)];
    if (which != null && (!T || !T.V)) continue;
    const f = fAt != null && L === L0 ? fAt : hxNextSeam(L).f;
    if (which == null) { K.sel = null; hxWUpdate(L, { f }); }   // (what it played before: the Abdruck, its anchor or its render)
    else {
      K.sel = which;
      L.sch.forEach((id, i) => { const S = HX.sch.get(id), V = T.V[i]; if (S && V) hxWPlay(S, 'krea', f, false, false, V); });
    }
    hxSaveMeta(L.id);
  }
  hxWsDirty(); hxRailDirty();
}
// „Ja“: what plays becomes a Trieb (kept, saved with the loop) – for every loop of the Umfang that plays a creation
function hxWsJa(L0) {
  const loops = P['hx.ws.umfang'] === 'leiste' ? hxLoopsLive().filter((L) => L.krea && typeof L.krea.sel === 'number') : [L0];
  let n = 0;
  for (const L of loops) {
    const K = hxWsOf(L); if (typeof K.sel !== 'number') continue;
    const T = K.list.find((x) => x.i === K.sel); if (!T || !T.V) continue;
    K.triebe.unshift({ seed: T.seed, sch: T.sch, name: 'Trieb ' + (K.triebe.length + 1), t: Date.now(), V: T.V });
    K.list = K.list.filter((x) => x !== T);
    K.sel = 't0'; n++;
    hxSaveMeta(L.id);
  }
  if (HXWS.auto) hxWsAuto(null, true);
  if (n) { hxSay('Behalten – ein neuer Trieb'); toast('Behalten: ein neuer Trieb. Das Original bleibt.', 2500); }
  hxWsDirty();
}
function hxWsDel(L, j) {
  const K = hxWsOf(L); const sel = K.sel;
  if (sel === 't' + j) hxWsPlay(L, null);
  K.triebe.splice(j, 1);
  if (typeof K.sel === 'string') { const s = +K.sel.slice(1); if (s > j) K.sel = 't' + (s - 1); }
  hxSaveMeta(L.id); hxWsDirty();
}
// automatic: every ready creation in turn, each for its passes (all its bars), then stop or grow new ones
function hxWsAuto(L, keep) {
  if (!L) { const A0 = HXWS.auto; HXWS.auto = null; if (A0 && !keep) { const X = hxByKey(A0.key); if (X && typeof X.krea.sel === 'number') hxWsPlay(X, null); } hxWsDirty(); return; }
  const K = hxWsOf(L); if (!K.list.some((x) => x.V)) { toast('Noch keine Kreation fertig.', 2000); return; }
  HXWS.auto = { key: L.key, idx: -1, until: -1 };
  hxWsAutoNext();
}
function hxWsAutoNext() {
  const A0 = HXWS.auto; if (!A0) return;
  const L = hxByKey(A0.key); if (!L) { HXWS.auto = null; return; }
  const ready = L.krea.list.filter((x) => x.V);
  const nx = ready.find((x) => x.i > A0.idx);
  if (!nx) {
    if (P['hx.ws.danach'] === 'neu' && !HXWS.gen) { HXWS.auto = null; hxWsPlay(L, null); hxWsGrow(L).then(() => { if (!HXWS.auto) hxWsAuto(L); }); return; }
    if (HXWS.gen) { A0.wait = true; return; }   // (still growing: the next one when it is there)
    hxWsAuto(null); return;
  }
  A0.wait = false; A0.idx = nx.i;
  const k0 = A0.until >= 0 ? A0.until : hxNextSeam(L).k;   // (seamless: the next one at the end of the last one's passes)
  hxWsPlay(L, nx.i, hxPassF(L, k0));
  A0.until = k0 + hxWsPasses(L, k0);   // (its passes from its first on – all its bars)
  const what = hxWsWhat(nx); hxSay('Kreation ' + (nx.i + 1) + (what ? ': ' + what : ''));
}
// how many passes a creation plays in the automatic run: as set, or („mind. 10 s“) as many as make 10 s, two at least
function hxWsPasses(L, k0) {
  const v = P['hx.ws.durchg']; if (v !== 'auto') return +v || 1;
  const s = Math.max(0.25, (hxPassF(L, k0 + 1) - hxPassF(L, k0)) / SR);
  return Math.max(2, Math.ceil(10 / s - 1e-6));
}
// every tick: the automatic run's turn, a Trieb wanted after a reload, the glyphs at the rings
function hxWsTick() {
  const now = performance.now(); if (now - HXWS.t < 120) return; HXWS.t = now;
  const A0 = HXWS.auto;
  if (A0) { const L = hxByKey(A0.key); if (!L) HXWS.auto = null; else if (A0.wait ? L.krea.list.some((x) => x.V && x.i > A0.idx) : L.k >= A0.until - 1) { if (A0.wait) A0.until = -1; hxWsAutoNext(); } }
  for (const L of hxLoopsLive()) {
    const K = L.krea; if (!K || !K.want || K.wantBusy) continue;
    const j = +K.want.slice(1), T = K.triebe[j]; if (!T) { K.want = null; continue; }
    K.wantBusy = true;
    hxWsRender(L, T.sch, T.seed).then((V) => { K.wantBusy = false; K.want = null; if (V) { T.V = V; hxWsPlay(L, 't' + j); } });
  }
  hxWsGlyphs();
}
// ---- on the rail: a small Keimling at the right of each ring with notes; a tap opens the Werkstatt above it ----
const HX_WS_ICON = '<svg viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 17V8"/><path d="M8 10C8 6 5 4 2 4c0 3 2 6 6 6"/><path d="M8 8c0-3 2-5 6-5 0 3-2 5-6 5"/></svg>';
function hxWsGlyphs() {
  if (!HXU.mid || !HXU.rings) return;
  const box = HXU.mid, mb = box.getBoundingClientRect();
  for (let i = 0; i < HXU.rings.length; i++) {
    let g = HXWS.glyphs[i];
    const L = hxRingL(i), rb = HXU.rings[i], show = !!(L && hxWsOn(L) && rb.getClientRects().length && rb.getBoundingClientRect().width > 0);   // (offsetParent: null inside a fixed rail)
    if (!show) { if (g) g.hidden = true; continue; }
    if (!g) {
      g = HXWS.glyphs[i] = h('button', { type: 'button', class: 'hx-wsg', tabindex: '-1', html: HX_WS_ICON + '<i></i>' });
      g.addEventListener('pointerdown', (e) => e.stopPropagation());
      g.addEventListener('click', (e) => { e.stopPropagation(); hxWsOpen(i); });
      box.append(g);
    }
    const r = rb.getBoundingClientRect(), K = L.krea, n = K ? K.list.filter((x) => x.V).length + K.triebe.length : 0;
    const x = Math.round(r.right - mb.left - 7), y = Math.round(r.top - mb.top + r.height / 2 - 9);
    if (g.hxX !== x || g.hxY !== y) { g.style.left = x + 'px'; g.style.top = y + 'px'; g.hxX = x; g.hxY = y; }
    g.hidden = false;
    g.style.setProperty('--c', hxPigOf(L.col || L.colA) ? hxPigOf(L.col || L.colA).c : 'var(--spore)');
    const st = HXWS.gen && HXWS.gen.loops.includes(L.key) ? 'waechst' : n ? 'da' : '';
    if (g.dataset.st !== st) g.dataset.st = st;
    const lab = 'Gärtner-Werkstatt, Schleife ' + (i + 1) + (n ? ': ' + n + ' Kreationen' : '');
    if (g.getAttribute('aria-label') !== lab) { g.setAttribute('aria-label', lab); g.title = lab + ' – tippen öffnet sie'; }
    const cnt = g.querySelector('i'), t = n ? String(n) : ''; if (cnt.textContent !== t) cnt.textContent = t;
  }
}
// ---- the Werkstatt above the ring: the list (Triebe, Original, the creations), ▶ / ■, Ja, ⚙ ----
function hxWsDirty() { HXWS.dirty = true; if (HXWS.pop && !HXWS.pop.hidden) requestAnimationFrame(hxWsRender2); hxCardDirty(); }
function hxWsOpen(slot) {
  if (!HXWS.pop) {
    HXWS.pop = h('div', { class: 'hx-ws', role: 'dialog', 'aria-label': 'Gärtner-Werkstatt', hidden: true });
    document.getElementById('app').append(HXWS.pop);
    document.addEventListener('pointerdown', (e) => { const p = HXWS.pop; if (p && !p.hidden && !p.contains(e.target) && !(e.target.closest && e.target.closest('.hx-wsg'))) p.hidden = true; }, true);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && HXWS.pop && !HXWS.pop.hidden) { HXWS.pop.hidden = true; e.stopPropagation(); } }, true);
  }
  const P0 = HXWS.pop;
  if (!P0.hidden && HXWS.slot === slot) { P0.hidden = true; return; }
  HXWS.slot = slot; P0.hidden = false; HXWS.set = false;
  hxWsRender2();
}
function hxWsRender2() {
  const P0 = HXWS.pop; if (!P0 || P0.hidden) return;
  const L = hxRingL(HXWS.slot); if (!L) { P0.hidden = true; return; }
  const K = hxWsOf(L), b = (t, fn, o = {}) => h('button', { type: 'button', class: 'hx-wsb' + (o.cls ? ' ' + o.cls : ''), title: o.tip || null, 'aria-label': o.aria || o.tip || null, html: o.html || null, onclick: fn }, o.html ? null : t);
  const gen = HXWS.gen && HXWS.gen.loops.includes(L.key), auto = HXWS.auto && HXWS.auto.key === L.key;
  const ready = K.list.filter((x) => x.V);
  const head = h('div', { class: 'hx-wsh' }, h('span', { class: 'hx-wsi', style: '--c:' + (hxPigOf(L.col || L.colA) ? hxPigOf(L.col || L.colA).c : 'var(--spore)'), html: HX_WS_ICON }), h('b', null, String(L.slot + 1)),
    gen ? b('■', hxWsStop, { tip: 'Wachsen anhalten' }) : b('', () => hxWsGrow(L), { tip: 'Kreationen wachsen lassen', html: HX_WS_ICON + '<span>+</span>', cls: 'grow' }),
    auto ? b('■', () => hxWsAuto(null), { tip: 'Durchspielen anhalten', cls: 'on' }) : b('▶', () => hxWsAuto(L), { tip: 'Alle nacheinander durchspielen' }),
    auto || typeof K.sel === 'number' ? b('Ja', () => hxWsJa(L), { tip: 'Diese Kreation behalten', cls: 'ja' }) : null,
    b('⚙', () => { HXWS.set = !HXWS.set; hxWsRender2(); }, { tip: 'Was der Gärtner verändern darf', cls: HXWS.set ? 'on' : '' }));
  const row = (lab, sel, fn, o = {}) => {
    const r = h('div', { class: 'hx-wsr' + (sel ? ' sel' : '') + (o.cls ? ' ' + o.cls : ''), role: 'button', tabindex: '0', title: o.tip || null }, h('span', { class: 'hx-wsn' }, lab), o.extra || null);
    r.addEventListener('click', fn); r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    if (o.del) { let tm = 0; r.addEventListener('pointerdown', () => { tm = setTimeout(() => { tm = -1; o.del(); }, 700); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) r.addEventListener(ev, () => { if (tm > 0) clearTimeout(tm); }); r.addEventListener('click', (e) => { if (tm === -1) { e.stopImmediatePropagation(); tm = 0; } }, true); }
    return r;
  };
  const list = h('div', { class: 'hx-wsl' });
  K.triebe.forEach((T, j) => list.append(row(T.name, K.sel === 't' + j, () => (T.V ? hxWsPlay(L, 't' + j) : (K.want = 't' + j)), { cls: 'trieb', tip: 'Gedrückt halten: löschen', del: () => hxWsDel(L, j) })));
  list.append(row('Original', K.sel == null, () => hxWsPlay(L, null), { cls: 'orig' }));
  const N = HXWS.gen && gen ? HXWS.gen.N : K.list.length;
  for (let c = 0; c < N; c++) {
    const it = K.list.find((x) => x.i === c);
    if (it && !it.V && it.st !== 'waechst') continue;
    const what = it && it.V ? hxWsWhat(it) : '';
    list.append(row(String(c + 1), K.sel === c, () => { if (it && it.V) { if (HXWS.auto) hxWsAuto(null, true); hxWsPlay(L, c); } }, { cls: !it ? 'warte' : it.V ? '' : 'waechst', tip: what || null, extra: what ? h('small', { class: 'hx-wsw' }, what) : null }));
  }
  const kids = [head, list];
  if (HXWS.set) kids.push(HXWS.setBox || (HXWS.setBox = h('div', { class: 'hx-wss' }, ctl('hx.ws.umfang', { prefix: 'ws-' }), h('div', { class: 'hx-wsrow' }, ctl('hx.ws.noten', { prefix: 'ws-' }), ctl('hx.ws.rhythmus', { prefix: 'ws-' }), ctl('hx.ws.oktaven', { prefix: 'ws-' }), ctl('hx.ws.klang', { prefix: 'ws-' }), ctl('hx.ws.effekte', { prefix: 'ws-' })), ctl('hx.ws.anzahl', { prefix: 'ws-' }), ctl('hx.ws.durchg', { prefix: 'ws-' }), ctl('hx.ws.danach', { prefix: 'ws-' }))));   // (built once: a control binds for good)
  P0.replaceChildren(...kids);
  // above its ring, inside the app
  const rb = HXU.rings[HXWS.slot].getBoundingClientRect(), ab = document.getElementById('app').getBoundingClientRect(), w = P0.offsetWidth || 200;
  P0.style.left = clamp(rb.left - ab.left + rb.width / 2 - w / 2, 8, ab.width - w - 8) + 'px';
  P0.style.bottom = Math.max(8, ab.bottom - rb.top + 8) + 'px';
}

if (!HXW.on) setInterval(() => { try { hxWsTick(); } catch (e) { console.warn(e); } }, 150);   // (not in a Werk-Rahmen realm)
