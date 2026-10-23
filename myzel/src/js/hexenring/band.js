// ---- §14 the tape: speed steps (octaves, fifths) from the next seam, gliding with the motor's inertia; the loop's
// length follows (a Takt loop: beats × old / new – it stays on the grid, the servo lands in phase) ----
function hxSpeed(L, sp) {
  if (!L || L.bew || !HX.node) return;
  const was = L.sp || 1; if (Math.abs(was - sp) < 1e-9) return;
  if (HX.pend.some((p) => p.kind === 'band' && p.loop === L.id)) { const p = HX.pend.find((x) => x.kind === 'band' && x.loop === L.id); hxPendDrop(p); p.cancel(); }
  const sw = hxNextSeam(L), f = sw.f, k = sw.k - 1, takt = hxTakt(L);
  const geo = takt ? { beats: (L.d.beats * was) / sp } : { L: Math.round((L.d.L * was) / sp) }, P1 = takt ? (geo.beats * 60) / tgBpm(hxT(f)) : geo.L / SR;
  const T = Math.max(0.05, Math.min(P['hx.traeg'], 0.9 * P1));
  const d0 = Object.assign({}, L.d);
  hxBatch(() => hxPost({ geom: Object.assign({ loop: L.id, f }, geo), band: { loop: L.id, f, vs: sp, T: Math.round(T * SR) } }));
  hxGeomMirror(L, f, k, geo.beats || L.d.beats, geo.L || L.d.L);
  L.sp = sp; L.spT = hxT(f);
  const lab = 'Band ' + HX_SP.find((x) => Math.abs(x[0] - sp) < 1e-6)[1];
  hxPendAdd({ kind: 'band', loop: L.id, t: hxT(f), label: lab + (takt ? ' ab Takt ' + hxBarNo(Math.round(hxBeatAtF(f) - TG.o)) : ' an der Naht'),
    cancel: () => { const X = HX.loops.get(L.id); if (!X) return; hxBatch(() => hxPost({ geom: Object.assign({ loop: X.id, f }, takt ? { beats: d0.beats } : { L: d0.L }), band: { loop: X.id, f, vs: was, T: 1 } })); hxGeomMirror(X, f, k, d0.beats, d0.L); X.sp = was; hxCardDirty(); } });
  hxSay(hxName(L) + ': ' + lab); hxSaveMeta(L.id); hxCardDirty(); hxRailDirty();
}
// Bandstopp: the tape runs down (exponentially, hx.stopp s) and stands – a cadence; each loop angehalten after it
function hxBandstopp(Ls) {
  if (!HX.node) return 0;
  const T = P['hx.stopp'], t = hxNowT() + HX_LEAD, f = Math.round(hxF(t));
  const list = (Ls || hxLoopsLive()).filter((L) => !L.bew && L.state === 'spielt' && L.pendTo !== 'angehalten');
  if (!list.length) { hxHint('Nichts läuft'); return 0; }
  hxBatch(() => { for (const L of list) hxPost({ band: { loop: L.id, stop: 1, T: Math.round(T * SR), f } }); });
  for (const L of list) { L.pendTo = 'angehalten'; L.stopT = t + T; }
  hxSay('Bandstopp'); hxRailDirty();
  return list.length;
}
function hxBandStopped(id) {
  const L = HX.loops.get(id); if (!L || L.state === 'weg') return;
  L.state = 'angehalten'; L.pendTo = null; L.stopT = null; HX.ruht = true;
  hxCount(); hxRailDirty(); hxCardDirty(); hxSaveMeta(L.id);
}
// the audio of every Schicht of a loop, whole (none still recording; a dry one waiting for its bake waits too)
function hxBandReady(L, what) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
  if (!sch.length || L.bew) return null;
  if (sch.some((S) => !S.aud)) { toast('Einen Moment – die Schleife wird noch aufgenommen.'); return null; }
  if (!L.folgt && sch.some((S) => S.chain && !S.baked)) { toast('Einen Moment – eine Schicht wird noch eingebrannt.'); return null; }
  if (what && L.sch.some((id) => { const S = HX.sch.get(id); return S && S.play && S.play !== 'ab'; }) && what !== 'wuchs') { /* (a Wuchs version plays: the tool acts on its Abdruck, heard again when it plays it) */ }
  return sch;
}
// the step for a content change of the tape: ↶ gives back what was (its geometry, its Schichten), ↷ again
const hxBandFl = (L) => ({ rev: !!L.rev, revW: !!L.revW, trim: L.trim || null, tr0: L.tr0 || null, dbl: L.dbl || 1, notes0: L.notes0 || null, aon0: L.aon0 || null });
function hxBandStep(L, label, before, f0) {
  const key = L.key, after = {}, f1 = hxBandFl(L);
  hxHist({ kind: 'band', label: hxName(L) + ': ' + label,
    undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); Object.assign(X, f0); hxBandNotesFix(X); hxSaveMeta(X.id); } },
    redo() { const X = hxByKey(key); if (X && after.g) { hxGeoBack(X, after.g); Object.assign(X, f1); hxBandNotesFix(X); hxSaveMeta(X.id); } } });
}
// the ring's spores and the slices follow what the tape does (rückwärts, Trimmen, Verdoppeln)
function hxBandNotesFix(L) {
  const base = L.notes0 || (L.notes0 = L.notes);
  let ns = base.map((n) => Object.assign({}, n));
  const tr = L.trim; if (tr && tr.f < 1) { const a = tr.i * tr.f; ns = ns.filter((n) => n.ph >= a - 1e-9 && n.ph < a + tr.f - 1e-9).map((n) => Object.assign(n, { ph: (n.ph - a) / tr.f, d: n.d })); }
  for (let i = 1; i < (L.dbl || 1); i *= 2) ns = ns.map((n) => Object.assign({}, n, { ph: n.ph / 2 })).concat(ns.map((n) => Object.assign({}, n, { ph: 0.5 + n.ph / 2 })));
  if (L.rev) { const D = Math.max(0.05, hxLen(L)); ns = ns.map((n) => Object.assign(n, { ph: clamp(1 - n.ph - Math.min(n.d || 0, D) / D, 0, 0.9999) })); }
  L.notes = ns;
  if (L.aon0 || L.aon) { const a0 = L.aon0 || (L.aon0 = L.aon); let u = a0.slice(); if (tr && tr.f < 1) { const a = tr.i * tr.f; u = u.filter((p) => p >= a && p < a + tr.f).map((p) => (p - a) / tr.f); } for (let i = 1; i < (L.dbl || 1); i *= 2) u = u.map((p) => p / 2).concat(u.map((p) => 0.5 + p / 2)); if (L.rev) u = u.map((p) => (1 - p) % 1).sort((a, b) => a - b); L.aon = u; }
  hxBandSend(L); hxRailDirty(); hxCardDirty();
}
const hxRevArr = (ch, n) => { const [a] = hxChunks(n); for (let i = 0; i < n; i++) { const s = ch[Math.floor((n - 1 - i) / HX_CH)], j = (n - 1 - i) % HX_CH, d = a[Math.floor(i / HX_CH)], k = i % HX_CH; d[0][k] = s ? s[0][j] : 0; d[1][k] = s ? s[1][j] : 0; } return a; };
const hxDrMap = (dr, n, map) => { if (!dr) return null; const o = new Float32Array(Math.ceil(n / 128) + 1); for (let j = 0; j < o.length; j++) o[j] = dr[clamp(Math.floor(map(Math.min(n - 1, j * 128)) / 128), 0, dr.length - 1)]; return o; };
// rückwärts at the seam: every Schicht's audio (dry and baked) mirrored – its margins swap: what came before the window
// is the continuation after it now; the seam is the warm crossfade
function hxRev(L) {
  const sch = hxBandReady(L); if (!sch) return false;
  const before = hxGeo(L), sw = hxNextSeam(L), was = !!L.rev;
  for (const S of sch) {
    const n = S.n, pre = n - S.pre - S.len, aud = hxRevArr(S.aud, n), bak = S.bak ? hxRevArr(S.bak, n) : null, X = S.X || Math.round(0.01 * SR);
    const c = Object.assign({}, S.cut, { pre, len: S.len, post: S.pre, n, aus: null, stale: true });
    const g = { pre, len: S.len, X, zo: 0 };   // (the mirrored seam's own curve, as every seam's – the law held in every window, not the one-number fallback)
    hxSchSwap(S, c, { aud, bak, f: sw.f, join: 'xf', X, rho: hxRho(bak && S.chain && !L.folgt ? bak : aud, n, pre, S.len, X), zo: 0, kc: hxSeamOf(g, aud), kcB: bak ? hxSeamOf(g, bak) : null, dr: hxDrMap(S.dr, n, (i) => n - 1 - i) });
  }
  const fl = hxBandFl(L); L.rev = !was; L.revW = !L.revW;   // (revW: its Wuchs renders mirrored too)
  hxBandStep(L, was ? 'vorwärts' : 'rückwärts', before, fl);
  hxBandNotesFix(L); if (hxWAktiv(L)) hxWUpdate(L);
  hxSay(hxName(L) + (L.rev ? ' rückwärts' : ' vorwärts')); hxSaveLoop(L);
  return true;
}
// Trimmen: a loop in the loop – ½ or ¼ of it, from its start or shifted by its own length (◀ ▶); „ganz“ the whole again
function hxBandTrim(L, what) {
  const sch = hxBandReady(L); if (!sch) return false;
  const T0 = L.tr0 || hxGeo(L), cur = L.trim || { f: 1, i: 0 };
  let f = cur.f, i = cur.i;
  if (what === 'h') { f = cur.f / 2; i = cur.i * 2; } else if (what === 'v') { f = cur.f / 4; i = cur.i * 4; }
  else if (what === '<') i = cur.i - 1; else if (what === '>') i = cur.i + 1; else if (what === 'ganz') { f = 1; i = 0; }
  if (f < 0.25 - 1e-9) { toast('Kürzer als ein Viertel lässt sich nicht trimmen.'); return false; }
  i = ((i % Math.round(1 / f)) + Math.round(1 / f)) % Math.round(1 / f);
  if (f === cur.f && i === cur.i) return false;
  const before = hxGeo(L), sw = hxNextSeam(L), tk = hxTakt(L);
  T0.sch.forEach((s, j) => {
    const S = hxSchByKey(s.key); if (!S || !s.aud) return;
    const len = Math.max(1, Math.round(s.len * f)), pre = s.pre + Math.round(s.len * f * i), X = Math.round(0.01 * SR);
    const c = Object.assign({}, s.cut, { pre, len, post: s.n - pre - len, n: s.n, aus: f === 1 && s.aus ? Object.assign({}, s.aus) : null, stale: true });
    const geom = j === 0 ? (tk ? { beats: T0.d.beats * f } : { L: Math.round(T0.d.L * f) }) : null;
    hxSchSwap(S, c, { aud: s.aud, bak: s.bak, f: sw.f, join: f === 1 ? s.join : 'xf', X: f === 1 ? s.X : X, rho: f === 1 ? s.rho : hxRho(s.bak && S.chain && !L.folgt ? s.bak : s.aud, s.n, pre, len, X), zo: f === 1 ? s.zo : 0, kc: f === 1 ? s.kc : hxSeamOf({ pre, len, X, zo: 0 }, s.aud), kcB: f === 1 ? s.kcB : s.bak ? hxSeamOf({ pre, len, X, zo: 0 }, s.bak) : null, dr: s.dr, geom,
      fade: f === 1 && s.aus ? Math.min(Math.round(0.03 * SR), s.aus.len) : 0 });
    S.wn = s.wn ? hxWnWin(s.wn, f * i, f) : S.wn;
  });
  const fl0 = hxBandFl(L);
  L.trim = f === 1 ? null : { f, i }; L.tr0 = f === 1 ? null : T0;
  hxBandStep(L, f === 1 ? 'ganz' : 'getrimmt auf ' + (f === 0.5 ? '½' : f === 0.25 ? '¼' : f) + (i ? ' · ' + (i + 1) + '.' : ''), before, fl0);
  hxBandNotesFix(L); if (hxWAktiv(L)) hxWUpdate(L);
  hxSay(hxName(L) + (f === 1 ? ': ganz' : ': getrimmt')); hxSaveLoop(L);
  return true;
}
// the notes of a window of a Wuchs record (start a, length f, as shares of it): times from the window's start
function hxWnWin(W, a, f) {
  const U = W.len, A = a * U, B = (a + f) * U;
  return Object.assign({}, W, { len: f * U, n: W.n.filter((n) => n.t >= A - 1e-6 && n.t < B - 1e-6).map((n) => Object.assign({}, n, { t: n.t - A, held: false })),
    lanes: (W.lanes || []).map((ln) => ({ id: ln.id, pts: ln.pts.filter(([x]) => x >= A && x < B).map(([x, v]) => [x - A, v]) })) });
}
// Verdoppeln: the loop twice as long by repetition – each Schicht rendered by the processor offline over two of its own
// passes (the seam inside as it sounds, its margins as a loop has them: before, the pass before; after, the next pass –
// or, for a cold Schicht, its Ausklang alone), so a longer Schicht fits over it
async function hxDouble(L) {
  const sch = hxBandReady(L); if (!sch) return false;
  if (sch.some((S) => !hxMemOk(2 * S.n))) return false;
  const before = hxGeo(L), lk = L.key, out = [];
  for (const S of sch) {
    const one = async (aud, kc) => {
      const len = S.len, cold = S.join === 'ola' && S.aus && S.aus.len > 0, ausN = cold ? S.aus.len : 0, pre = Math.min(S.pre, len), post = Math.max(S.n - S.pre - len, ausN);
      const tot = 4 * len + post + 128, ctx = new OfflineAudioContext(2, tot, SR);
      if (!(await ensureDSP(ctx))) return null;
      const msgs = [{ loop: { id: 1, lock: 'frei', L: len, ph0: 0, gain: 1 } }, { schicht: { loop: 1, id: 1, chunks: aud, n: S.n, pre: S.pre, len, ausklang: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, gain: 1, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: kc || 0, fin: 0 } }];
      if (cold) msgs.push({ state: { loop: 1, to: 'angehalten', f: 3 * len } });   // (its third pass is not played: what follows the doubled pass is its Ausklang)
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: HX_CH, msgs } });
      node.connect(ctx.destination, 0);
      const buf = await ctx.startRendering(), Lc = buf.getChannelData(0), Rc = buf.getChannelData(1), a0 = len - pre, n = pre + 2 * len + post, [a] = hxChunks(n);
      for (let i = 0; i < n; i++) { const j = a0 + i, c = a[Math.floor(i / HX_CH)]; if (j < tot) { c[0][i % HX_CH] = Lc[j]; c[1][i % HX_CH] = Rc[j]; } }
      return { aud: a, n, pre, post, ausN };
    };
    const dry = await one(S.aud, S.kc), bak = S.bak ? await one(S.bak, S.kcB) : null;
    if (!dry) return false;
    out.push([S, dry, bak]);
  }
  if (!HX.loops.has(L.id) || L.state === 'weg') return false;
  const sw = hxNextSeam(L), tk = hxTakt(L);
  out.forEach(([S, dry, bak], j) => {
    const len2 = 2 * S.len, c = Object.assign({}, S.cut, { pre: dry.pre, len: len2, post: dry.post, n: dry.n, aus: dry.ausN ? { off: dry.pre + len2, len: dry.ausN } : null, stale: true });
    const src = (i) => (i < dry.pre ? S.pre - dry.pre + i : i < dry.pre + len2 ? S.pre + ((i - dry.pre) % S.len) : S.pre + S.len + (i - dry.pre - len2));
    hxSchSwap(S, c, { aud: dry.aud, bak: bak ? bak.aud : null, f: sw.f, join: S.join, X: S.X, rho: S.rho, zo: 0, kc: S.join === 'xf' ? hxSeamOf({ pre: dry.pre, len: len2, X: S.X, zo: 0 }, dry.aud) : null, kcB: S.join === 'xf' && bak ? hxSeamOf({ pre: dry.pre, len: len2, X: S.X, zo: 0 }, bak.aud) : null, dr: hxDrMap(S.dr, dry.n, src), fade: dry.ausN ? Math.min(Math.round(0.03 * SR), dry.ausN) : 0,
      geom: j === 0 ? (tk ? { beats: L.d.beats * 2 } : { L: L.d.L * 2 }) : null });
    if (S.wn) S.wn = Object.assign({}, S.wn, { len: 2 * S.wn.len, n: S.wn.n.concat(S.wn.n.map((x) => Object.assign({}, x, { t: x.t + S.wn.len, held: false }))), lanes: (S.wn.lanes || []).map((ln) => ({ id: ln.id, pts: ln.pts.concat(ln.pts.map(([x, v]) => [x + S.wn.len, v])) })) });
  });
  const fl0 = hxBandFl(L);
  if (L.tr0 || L.rev) { L.notes0 = L.notes; L.aon0 = L.aon; L.tr0 = null; L.trim = null; L.rev = false; L.dbl = 2; }   // (revW stays: its Wuchs still plays mirrored)   // (a trimmed or mirrored loop doubled is a new whole: what it plays now, twice)
  else L.dbl = (L.dbl || 1) * 2;
  hxBandStep(L, 'verdoppelt', before, fl0);
  hxBandNotesFix(L); if (hxWAktiv(L)) hxWUpdate(L);
  hxSay(hxName(L) + ' verdoppelt – ' + hxLenText(L)); hxSaveLoop(L); hxCardDirty();
  return hxByKey(lk) === L;
}
// Verblassen (per Schicht, each by its own age: a fresh Schicht sounds over the faded ones), Abrieb (wear at the same
// places, deeper each pass; Auffrischen – as new), Auslassen and Würfeln (slices left out or thrown, per pass, seeded)
const HX_VB = [[1, 'nie'], [0.97, 'langsam'], [0.9, 'mittel'], [0.75, 'schnell']];
const HX_ABR = [[0, 'aus'], [0.04, 'langsam'], [0.1, 'mittel'], [0.25, 'schnell']];
const HX_SLP = [[0, 'aus'], [0.15, '15 %'], [0.3, '30 %'], [0.5, '50 %']];
function hxVbSet(L, fb) { L.vb = fb; hxPost({ vb: L.sch.map((id) => ({ schicht: id, fb })) }); hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Verblassen ' + HX_VB.find((x) => x[0] === fb)[1]); }
function hxAbSet(L, rate, fresh) {
  const seed = (L.ab && L.ab.seed) || (((Math.random() * 2147483646) | 0) + 1);
  if (fresh) { hxPost({ abr: L.sch.map((id) => ({ schicht: id, rate: (L.ab && L.ab.rate) || 0.1, seed, reset: 1, off: !(L.ab && L.ab.rate > 0) ? 1 : 0 })) }); hxSay(hxName(L) + ': aufgefrischt'); return; }
  L.ab = rate > 0 ? { rate, seed } : null;
  hxPost({ abr: L.sch.map((id) => (rate > 0 ? { schicht: id, rate, seed } : { schicht: id, off: 1 })) });
  hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Abrieb ' + HX_ABR.find((x) => x[0] === rate)[1]);
}
function hxSlcSet(L, k, v) {
  const s = (L.slc = Object.assign({ pd: 0, pw: 0, seed: ((Math.random() * 2147483646) | 0) + 1 }, L.slc || {}));
  if (k === 'neu') s.seed = ((Math.random() * 2147483646) | 0) + 1; else s[k] = v;
  hxBandSend(L); hxSaveMeta(L.id); hxCardDirty();
  hxSay(hxName(L) + ': ' + (k === 'pd' ? 'Auslassen ' : k === 'pw' ? 'Würfeln ' : 'neu gewürfelt') + (k === 'neu' ? '' : HX_SLP.find((x) => x[0] === v)[1]));
}

