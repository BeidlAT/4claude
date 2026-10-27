// ---- §14 the tape: speed steps (octaves, fifths) from the next seam, gliding with the motor's inertia; the loop's
// length follows (a Takt loop: beats × old / new – it stays on the grid, the servo lands in phase) ----
function hxSpeed(L, sp, o = {}) {
  if (!L || L.bew || !HX.node) return;
  // (26.10.2026) a switch of the player's own still waiting is taken back first (its step with it) – the new one is
  // reckoned from what plays then; one that an ↶ ↷ waits for stays: the new one follows it at the same seam
  const pw = HX.pend.find((x) => x.kind === 'band' && x.loop === L.id && !x.replay); if (pw) { hxPendDrop(pw); pw.cancel(); }
  const was = L.sp || 1; if (Math.abs(was - sp) < 1e-9) { hxCardDirty(); hxRailDirty(); return; }
  const sw = hxNextSeam(L), f = sw.f, k = sw.k - 1, takt = hxTakt(L);
  const geo = takt ? { beats: (L.d.beats * was) / sp } : { L: Math.round((L.d.L * was) / sp) }, P1 = takt ? (geo.beats * 60) / tgBpm(hxT(f)) : geo.L / SR;
  const T = Math.max(0.05, Math.min(P['hx.traeg'], 0.9 * P1));
  const d0 = Object.assign({}, L.d);
  hxBatch(() => hxPost({ geom: Object.assign({ loop: L.id, f }, geo), band: { loop: L.id, f, vs: sp, T: Math.round(T * SR) } }));
  hxGeomMirror(L, f, k, geo.beats || L.d.beats, geo.L || L.d.L);
  L.sp = sp; L.spT = hxT(f);
  const lab = 'Band ' + HX_SP.find((x) => Math.abs(x[0] - sp) < 1e-6)[1];
  // (26.10.2026, owner: every edit of a loop undoable at once) the step; a ↶ while the switch still waits cancels it and the step
  const lk = L.key, step = o.noHist ? null : { kind: 'band', label: hxName(L) + ': ' + lab, undo() { const X = hxByKey(lk); if (X) hxSpeed(X, was, { noHist: 1 }); }, redo() { const X = hxByKey(lk); if (X) hxSpeed(X, sp, { noHist: 1 }); } };
  hxPendAdd({ kind: 'band', loop: L.id, t: hxT(f), replay: !!o.noHist, label: lab + (takt ? ' ab Takt ' + hxBarNo(Math.round(hxBeatAtF(f) - TG.o)) : ' an der Naht'),
    cancel: () => { if (step) HX.hist = HX.hist.filter((x) => x !== step); const X = HX.loops.get(L.id); if (!X) return; hxBatch(() => hxPost({ geom: Object.assign({ loop: X.id, f }, takt ? { beats: d0.beats } : { L: d0.L }), band: { loop: X.id, f, vs: was, T: 1 } })); hxGeomMirror(X, f, k, d0.beats, d0.L); X.sp = was; hxCardDirty(); } });
  if (step) hxHist(step);
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
  if (!L.folgt && sch.some((S) => S.chain && !S.baked && S.baking)) { toast('Einen Moment – eine Schicht wird noch eingebrannt.'); return null; }
  if (what && L.sch.some((id) => { const S = HX.sch.get(id); return S && S.play && S.play !== 'ab'; }) && what !== 'wuchs') { /* (a Wuchs version plays: the tool acts on its Abdruck, heard again when it plays it) */ }
  return sch;
}
// the step for a content change of the tape: ↶ gives back what was (its geometry, its Schichten), ↷ again
const hxBandFl = (L) => ({ rev: !!L.rev, revW: !!L.revW, trim: L.trim || null, tr0: L.tr0 || null, dbl: L.dbl || 1, notes0: L.notes0 || L.notes || null, aon0: L.aon0 || L.aon || null, rx0: L.rx0 || null });   // (25.10.2026: the notes as played – ↶ after a first trim gave back only the trimmed ones)
function hxBandStep(L, label, before, f0, o = {}) {
  const key = L.key, after = {}, f1 = hxBandFl(L), now = { now: !!o.now };   // (a change heard at once: its ↶ ↷ at once too)
  hxHist({ kind: 'band', label: hxName(L) + ': ' + label,
    undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); const n = hxGeoBack(X, before, now); Object.assign(X, f0); hxBandNotesFix(X, n); if (n && hxWAktiv(X)) hxWUpdate(X, { now: 1 }); hxSaveMeta(X.id); } },
    redo() { const X = hxByKey(key); if (X && after.g) { const n = hxGeoBack(X, after.g, now); Object.assign(X, f1); hxBandNotesFix(X, n); if (n && hxWAktiv(X)) hxWUpdate(X, { now: 1 }); hxSaveMeta(X.id); } } });
}
// the ring's spores and the slices follow what the tape does (rückwärts, Trimmen, Verdoppeln)
function hxBandNotesFix(L, now) {
  const base = L.notes0 || (L.notes0 = L.notes);
  let ns = base.map((n) => Object.assign({}, n));
  const tr = L.trim; if (tr && tr.f < 1) { const a = hxTrA(tr); ns = ns.filter((n) => n.ph >= a - 1e-9 && n.ph < a + tr.f - 1e-9).map((n) => Object.assign(n, { ph: (n.ph - a) / tr.f, d: n.d })); }
  for (let i = 1; i < (L.dbl || 1); i *= 2) ns = ns.map((n) => Object.assign({}, n, { ph: n.ph / 2 })).concat(ns.map((n) => Object.assign({}, n, { ph: 0.5 + n.ph / 2 })));
  if (L.rev) { const D = Math.max(0.05, hxLen(L)); ns = ns.map((n) => Object.assign(n, { ph: clamp(1 - n.ph - Math.min(n.d || 0, D) / D, 0, 0.9999) })); }
  L.notes = ns;
  if (L.aon0 || L.aon) { const a0 = L.aon0 || (L.aon0 = L.aon); let u = a0.slice(); if (tr && tr.f < 1) { const a = hxTrA(tr); u = u.filter((p) => p >= a && p < a + tr.f).map((p) => (p - a) / tr.f); } for (let i = 1; i < (L.dbl || 1); i *= 2) u = u.map((p) => p / 2).concat(u.map((p) => 0.5 + p / 2)); if (L.rev) u = u.map((p) => (1 - p) % 1).sort((a, b) => a - b); L.aon = u; }
  hxBandSend(L, now); hxRailDirty(); hxCardDirty();
}
const hxRevArr = (ch, n) => { const [a] = hxChunks(n); for (let i = 0; i < n; i++) { const s = ch[Math.floor((n - 1 - i) / HX_CH)], j = (n - 1 - i) % HX_CH, d = a[Math.floor(i / HX_CH)], k = i % HX_CH; d[0][k] = s ? s[0][j] : 0; d[1][k] = s ? s[1][j] : 0; } return a; };
const hxDrMap = (dr, n, map) => { if (!dr) return null; const o = new Float32Array(Math.ceil(n / 128) + 1); for (let j = 0; j < o.length; j++) o[j] = dr[clamp(Math.floor(map(Math.min(n - 1, j * 128)) / 128), 0, dr.length - 1)]; return o; };
// rückwärts: every Schicht's audio (dry and baked) mirrored – its margins swap: what came before the window is the
// continuation after it now; the seam is the warm crossfade. At once (owner, 26.10.2026: mid-pass, from the mirrored
// place – crossfaded), or at the seam while a new length waits for it
function hxRev(L) {
  const sch = hxBandReady(L); if (!sch) return false;
  const before = hxGeo(L), sw = hxSwapAt(L), was = !!L.rev;
  for (const S of sch) {
    const n = S.n, pre = n - S.pre - S.len, aud = hxRevArr(S.aud, n), bak = S.bak ? hxRevArr(S.bak, n) : null, X = S.X || Math.round(0.01 * SR);
    const c = Object.assign({}, S.cut, { pre, len: S.len, post: S.pre, n, aus: null, stale: true });
    const g = { pre, len: S.len, X, zo: 0 };   // (the mirrored seam's own curve, as every seam's – the law held in every window, not the one-number fallback)
    hxSchSwap(S, c, { aud, bak, f: sw.f, now: !!sw.now, join: 'xf', X, rho: hxRho(bak && S.chain && !L.folgt ? bak : aud, n, pre, S.len, X), zo: 0, kc: hxSeamOf(g, aud), kcB: bak ? hxSeamOf(g, bak) : null, dr: hxDrMap(S.dr, n, (i) => n - 1 - i) });
  }
  const fl = hxBandFl(L); L.rev = !was; L.revW = !L.revW;   // (revW: its Wuchs renders mirrored too)
  hxBandStep(L, was ? 'vorwärts' : 'rückwärts', before, fl, { now: !!sw.now });
  hxBandNotesFix(L, !!sw.now); if (hxWAktiv(L)) hxWUpdate(L, sw.now ? { now: 1 } : {});
  hxSay(hxName(L) + (L.rev ? ' rückwärts' : ' vorwärts')); hxSaveLoop(L);
  return true;
}
// Trimmen: a loop in the loop – ½ or ¼ of it, from its start or shifted by its own length (◀ ▶); „ganz“ the whole again
const hxTrA = (tr) => (!tr ? 0 : tr.a != null ? tr.a : tr.i * tr.f);   // (where a trim starts, a share of the whole: ½ and ¼ by their index, a stretch chosen in the editor by its own start)
function hxBandTrim(L, what) {
  const cur = L.trim || { f: 1, i: 0 }, a0 = hxTrA(cur);
  let f = cur.f, a = a0;
  if (what === 'h') f = cur.f / 2; else if (what === 'v') f = cur.f / 4;
  else if (what === '<' || what === '>') { a = a0 + (what === '<' ? -cur.f : cur.f); if (a < -1e-9) a = 1 - cur.f; else if (a > 1 - cur.f + 1e-9) a = 0; }
  else if (what === 'ganz') { f = 1; a = 0; }
  if (f < 0.25 - 1e-9 && (what === 'h' || what === 'v')) { toast('Kürzer als ein Viertel lässt sich nicht trimmen – oder wähle im Bearbeiten-Fenster einen Teil.'); return false; }
  if (what === 'h' || what === 'v') { const n = Math.round(1 / f); a = Math.min(Math.floor(a / f + 1e-9), n - 1) * f; }   // (½ and ¼ on their own grid, from where it stood)
  return hxBandTrimDo(L, f, a);
}
// (owner, 25.10.2026) any stretch: start a and length f as shares of the whole (the editor snaps them to whole beats)
function hxBandTrimTo(L, a, f) {
  if (!(f > 0) || !(a >= -1e-9) || a + f > 1 + 1e-9) return false;
  const T0 = L.tr0 || hxGeo(L), whole = hxTakt(L) ? (T0.d.beats * 60) / tgBpm(hxNowT()) : T0.d.L / SR;
  if (f * whole < 0.1 || (hxTakt(L) && f * T0.d.beats < 1 - 1e-6)) { toast('So kurz lässt sich nicht trimmen – mindestens ein Schlag.'); return false; }
  return hxBandTrimDo(L, Math.min(1, f), clamp(a, 0, 1 - f));
}
function hxBandTrimDo(L, f, a) {
  const sch = hxBandReady(L); if (!sch) return false;
  const T0 = L.tr0 || Object.assign(hxGeo(L), { rev: !!L.rev, revW: !!L.revW, sp: L.sp || 1 }), cur = L.trim || { f: 1, i: 0 }, ks = (T0.sp || 1) / (L.sp || 1);   // (26.10.2026: the tape's speed since the whole was kept – „ganz“ after Band ½ was half as long)   // (26.10.2026: the whole's direction – „ganz“ plays its audio as it was, so the loop says that direction again)
  if (Math.abs(f - cur.f) < 1e-9 && Math.abs(a - hxTrA(cur)) < 1e-9) return false;
  const before = hxGeo(L), sw = hxNextSeam(L), tk = hxTakt(L), whole = f > 1 - 1e-9;
  T0.sch.forEach((s, j) => {
    const S = hxSchByKey(s.key); if (!S || !s.aud) return;
    const len = Math.max(1, Math.round(s.len * f)), pre = s.pre + Math.round(s.len * a), X = Math.round(0.01 * SR);
    const c = Object.assign({}, s.cut, { pre, len, post: s.n - pre - len, n: s.n, aus: whole && s.aus ? Object.assign({}, s.aus) : null, stale: true });
    const geom = j === 0 ? (tk ? { beats: T0.d.beats * f * ks } : { L: Math.round(T0.d.L * f * ks) }) : null;
    hxSchSwap(S, c, { aud: s.aud, bak: s.bak, f: sw.f, join: whole ? s.join : 'xf', X: whole ? s.X : X, rho: whole ? s.rho : hxRho(s.bak && S.chain && !L.folgt ? s.bak : s.aud, s.n, pre, len, X), zo: whole ? s.zo : 0, kc: whole ? s.kc : hxSeamOf({ pre, len, X, zo: 0 }, s.aud), kcB: whole ? s.kcB : s.bak ? hxSeamOf({ pre, len, X, zo: 0 }, s.bak) : null, dr: s.dr, geom,
      fade: whole && s.aus ? Math.min(Math.round(0.03 * SR), s.aus.len) : 0 });
    S.wn = s.wn ? hxWnWin(s.wn, a, f) : S.wn;
  });
  const fl0 = hxBandFl(L), i = Math.abs(a / f - Math.round(a / f)) < 1e-9 ? Math.round(a / f) : null;
  L.trim = whole ? null : { f, i: i != null ? i : 0, a }; L.tr0 = whole ? null : T0;
  if (whole && T0.rev != null) { L.rev = T0.rev; L.revW = T0.revW; }
  const fw = f === 0.5 ? '½' : f === 0.25 ? '¼' : tk ? dec(+(T0.d.beats * f).toFixed(2)) + ' Schläge' : Math.round(f * 100) + ' %';
  hxBandStep(L, whole ? 'ganz' : 'getrimmt auf ' + fw + (i ? ' · ' + (i + 1) + '.' : ''), before, fl0);
  hxBandNotesFix(L); if (hxWAktiv(L)) hxWUpdate(L);
  hxSay(hxName(L) + (whole ? ': ganz' : ': getrimmt')); hxSaveLoop(L);
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
function hxVbSet(L, fb, o = {}) {
  const was = L.vb != null ? L.vb : 1, lk = L.key; if (Math.abs(was - fb) < 1e-9 && !o.force) return;
  L.vb = fb; hxPost({ vb: L.sch.map((id) => ({ schicht: id, fb })) }); hxSaveMeta(L.id); hxCardDirty();
  const lab = 'Verblassen ' + HX_VB.find((x) => x[0] === fb)[1]; hxSay(hxName(L) + ': ' + lab);
  if (!o.noHist) hxHist({ kind: 'band', label: hxName(L) + ': ' + lab, undo() { const X = hxByKey(lk); if (X) hxVbSet(X, was, { noHist: 1 }); }, redo() { const X = hxByKey(lk); if (X) hxVbSet(X, fb, { noHist: 1 }); } });
}
function hxAbSet(L, rate, fresh, o = {}) {
  const was = L.ab ? Object.assign({}, L.ab) : null, lk = L.key;
  if (!fresh && !o.noHist) { if (((was && was.rate) || 0) === rate) return; hxHist({ kind: 'band', label: hxName(L) + ': Abrieb ' + HX_ABR.find((x) => x[0] === rate)[1], undo() { const X = hxByKey(lk); if (X) hxAbPut(X, was); }, redo() { const X = hxByKey(lk); if (X) hxAbSet(X, rate, false, { noHist: 1 }); } }); }
  const seed = (L.ab && L.ab.seed) || (((Math.random() * 2147483646) | 0) + 1);
  if (fresh) { hxPost({ abr: L.sch.map((id) => ({ schicht: id, rate: (L.ab && L.ab.rate) || 0.1, seed, reset: 1, off: !(L.ab && L.ab.rate > 0) ? 1 : 0 })) }); hxSay(hxName(L) + ': aufgefrischt'); return; }
  L.ab = rate > 0 ? { rate, seed } : null;
  hxPost({ abr: L.sch.map((id) => (rate > 0 ? { schicht: id, rate, seed } : { schicht: id, off: 1 })) });
  hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Abrieb ' + HX_ABR.find((x) => x[0] === rate)[1]);
}
// a loop's Abrieb as it was (↶): its rate and its seed – the wear starts again from new
function hxAbPut(L, ab) { L.ab = ab ? Object.assign({}, ab) : null; hxPost({ abr: L.sch.map((id) => (L.ab ? { schicht: id, rate: L.ab.rate, seed: L.ab.seed } : { schicht: id, off: 1 })) }); hxSaveMeta(L.id); hxCardDirty(); }
function hxSlcPut(L, s) { L.slc = s ? Object.assign({}, s) : null; hxBandSend(L, true); hxSaveMeta(L.id); hxCardDirty(); }
function hxSlcSet(L, k, v, o = {}) {
  const was = L.slc ? Object.assign({}, L.slc) : null, lk = L.key;
  if (k !== 'neu' && ((was && was[k]) || 0) === v) return;
  const s = (L.slc = Object.assign({ pd: 0, pw: 0, seed: ((Math.random() * 2147483646) | 0) + 1 }, L.slc || {}));
  if (k === 'neu') s.seed = ((Math.random() * 2147483646) | 0) + 1; else s[k] = v;
  hxBandSend(L, true); hxSaveMeta(L.id); hxCardDirty();
  const lab = (k === 'pd' ? 'Auslassen ' : k === 'pw' ? 'Würfeln ' : 'neu gewürfelt') + (k === 'neu' ? '' : HX_SLP.find((x) => x[0] === v)[1]), to = Object.assign({}, L.slc);
  hxSay(hxName(L) + ': ' + lab);
  if (!o.noHist) hxHist({ kind: 'band', label: hxName(L) + ': ' + lab, undo() { const X = hxByKey(lk); if (X) hxSlcPut(X, was); }, redo() { const X = hxByKey(lk); if (X) hxSlcPut(X, to); } });
}
// (26.10.2026, owner) all a loop's edits back to their defaults – the tape (speed, direction, the whole), the gaps,
// Verblassen, Abrieb, the notes as played – as one step (↶ gives them back); its level, balance and Schichten stay, and
// a doubled loop stays doubled (that is its new whole – ↶ takes the doubling back)
function hxDefaults(L) {
  if (!L || L.bew) return false;
  if (!hxBandReady(L)) { if (L.hum) { const n1 = HX.hist.length; hxHumReset(L); return hxHistGroup(n1, hxName(L) + ': Ausschnitt wie geerntet'); } return false; }   // (26.10.2026: the window in the Ernte needs no finished bake)
  const n0 = HX.hist.length;
  if (L.trim) hxBandTrim(L, 'ganz');
  if (L.rev) hxRev(L);
  if ((L.sp || 1) !== 1) hxSpeed(L, 1);
  if (L.slc && L.slc.pd) hxSlcSet(L, 'pd', 0);
  if (L.slc && L.slc.pw) hxSlcSet(L, 'pw', 0);
  if (L.vb != null && L.vb < 1) hxVbSet(L, 1);
  if (L.ab) hxAbSet(L, 0);
  if (hxNtOn(L)) hxNtSet(L, 'zurueck');
  if (L.rx0) hxRxRestore(L);   // (the stretches edited on their own: the audio as recorded)
  hxHumReset(L);   // (26.10.2026: the window in the whole Ernte as harvested)
  const did = hxHistGroup(n0, hxName(L) + ': alles auf Grundeinstellung');
  hxSay(hxName(L) + (did ? ': alles auf Grundeinstellung' : ': ist schon in der Grundeinstellung'));
  return did;
}
// the steps pushed since n0 as one (↶ takes them back together, newest first)
function hxHistGroup(n0, label) {
  const steps = HX.hist.splice(n0); if (!steps.length) return false;
  hxHist({ kind: 'gruppe', label, undo() { for (let i = steps.length - 1; i >= 0; i--) steps[i].undo(); }, redo() { for (const s of steps) s.redo(); } });
  return true;
}

