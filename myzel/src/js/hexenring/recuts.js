// ---- re-cuts (the corrections, Quelle, Runde davor): new audio for a Schicht from the Humus – or its own earlier copy
// – swapped at the loop's next seam without stopping; a new length takes effect at the same frame (geom). Messages
// sent together in hxBatch reach the processor as one (a new tempo and the grid that keeps the loop's seam). ----
function hxBatch(fn) {
  const B = (HX.batch = { m: {}, tr: [] });
  try { fn(); } finally { HX.batch = null; }
  if (Object.keys(B.m).length) hxPost(B.m, B.tr);
}
// the next seam at least ≈ 60 ms ahead (the swap must reach the processor first)
function hxNextSeam(L) { const f = Math.round(hxF(hxNowT() + 0.06)), k = hxPassK(L, f); return { k: k + 1, f: hxPassF(L, k + 1) }; }
// (owner, 26.10.2026: „on the fly“) a change of a loop's sound without a new length is heard at once: its audio swapped
// mid-pass (the processor's crossfade at the same place, HX_XM) – unless a new length or another swap still waits for
// its seam (the swap would come before it); then at the seam, as before
const HX_XM = Math.round(0.025 * SR);
function hxNowOk(L) {
  const f = Math.round(hxF(hxNowT() + 0.06));
  return !!L && !L.prev && !HX.pend.some((p) => p.loop === L.id && p.kind === 'band') && !L.sch.some((id) => { const S = HX.sch.get(id); return S && S.swapF > f; });
}
const hxSwapAt = (L) => (hxNowOk(L) ? { f: Math.round(hxF(hxNowT() + 0.06)), now: true } : hxNextSeam(L));
function hxSchSwap(S, c, o = {}) {
  const L = HX.loops.get(S.loop); if (!L) return;
  if (!o.aud) { const H = hxHumOf(c); if (H) o = Object.assign({}, o, hxHumSlice(H, c), { hum: true }); }   // (26.10.2026: a window inside a Schleife's whole Ernte – from there, whatever the ring still holds)
  // (owner, 26.10.2026: „die Zeitleisten passen nicht zusammen“) a window moved in the Ernte: its Ausklang ends where the
  // next thing played begins (a note, else an onset in the audio) – never the notes that followed carried over the start
  if (o.hum && c.aus && c.aus.len > 0) { const al = hxAusFrom(c, o.aud); if (al < c.aus.len) { c = Object.assign({}, c, { aus: { off: c.aus.off, len: al } }); o = Object.assign({}, o, { cutAus: true }); } }
  S.ver = (S.ver || 0) + 1;
  // (step 1c: audio from the Humus plays dry – through the live chain until it is baked again; the page's own versions
  // take the baked one where there is one)
  const bak = o.aud && o.bak && S.chain && !L.folgt ? o.bak : null, out = S.chain && !bak ? 1 : 0;
  const d = { loop: S.loop, schicht: S.id, n: c.n, pre: c.pre, len: c.len, ausklang: c.aus ? { off: c.aus.off, len: c.aus.len, fade: o.fade || 0 } : null, f: o.f, out, zo: o.zo || 0, kc: (bak ? o.kcB : o.kc) || 0, dd: out && !L.folgt ? 0 : 1 };
  S.ddOn = false;
  if (out) hxOut1();
  let tr;
  if (o.aud) { const [cp, t1] = hxCopy(bak || o.aud); d.chunks = cp; tr = t1; if (o.join) Object.assign(d, { join: o.join, X: o.X, rho: o.rho }); if (o.now) d.XM = HX_XM; const dr = o.dr || S.dr; if (dr) { d.dr = Float32Array.from(dr); tr.push(d.dr.buffer); } }
  else { const [dst, t1] = hxChunks(c.n), [cp, t2] = hxChunks(c.n); d.chunks = dst; d.copy = cp; tr = t1.concat(t2); d.fill = { in: c.in, f0: c.f0, v: S.ver }; d.dr = new Float32Array(Math.ceil(c.n / 128) + 1); d.drc = new Float32Array(d.dr.length); tr.push(d.dr.buffer, d.drc.buffer); }
  const m = { replace: d };
  if (o.geom) { m.geom = Object.assign({ loop: S.loop, f: o.f }, o.geom); const k = hxPassK(L, (o.f != null ? o.f : Math.round(hxF(hxNowT()))) - 1); hxGeomMirror(L, hxPassF(L, k + 1), k, o.geom.beats || L.d.beats, o.geom.L || L.d.L); }
  hxPost(m, tr);
  S.swapF = o.f;
  Object.assign(S, { cut: c, len: c.len, pre: c.pre, n: c.n, aus: c.aus ? Object.assign({}, c.aus) : null, aud: o.aud || null, live: !o.aud, saved: 0, out, bak: o.aud ? o.bak || null : null, baked: !!bak, zo: o.zo || 0, kc: o.kc || null, kcB: o.kcB || null, dr: o.aud ? o.dr || S.dr : null, cutAus: !!o.cutAus, spliced: !!o.spliced });
  hxCount();
  if (S.play && S.play !== 'ab') S.play = 'ab';   // Hexenring (step 2b): the version swapped in is an Abdruck – a Wuchs version is sent again by hxWUpdate, never assumed still playing
  if (L.sch[0] === S.id && (!o.aud || o.hum)) { L.cut = c; L.notesDue = Math.max(hxT(c.w1), hxNowT()); }   // (its notes from the new window)
  if (o.hum) { hxSaveSch(S); hxAfterFill(S); }   // (as a fill from the ring: stored, its Ausklang rendered, baked)
  if (o.join) Object.assign(S, { join: o.join, X: o.X, rho: o.rho });
  if (!o.aud) hxProbe(S, o.f != null ? hxT(o.f) + 0.012 : 0);
}
// how long a cut's Ausklang may ring (frames): to the first note after its window, else the first onset in its audio there
function hxAusFrom(c, aud) {
  const w1t = hxT(c.w1), evs = hxEvents(w1t + 0.002, w1t + c.aus.len / SR + 0.01, false).filter((e) => hxSrcIn(e.src, c.in));
  let al = evs.length ? Math.max(0, Math.round((evs[0].t0 - w1t - 0.005) * SR)) : c.aus.len;
  if (aud) {   // (a loop without notes – or an onset no note names)
    const pre = Math.round(0.02 * SR), x = hxMono(aud, c.pre + c.len - pre, Math.min(al, c.aus.len) + pre);
    const on = x.length > 1024 ? hxFlux(x, 0.003).map((v) => v - pre).filter((v) => v > 0.01 * SR) : [];
    if (on.length) al = Math.min(al, Math.max(0, on[0] - Math.round(0.005 * SR)));
  }
  return al;
}
// the page's mirror of a geom that keeps the seam at frame f (the end of pass k): as the processor derives it
function hxGeomMirror(L, f, k, beats, Lf) {
  if (f > hxF(hxNowT()) && !(L.prev && L.prev.until <= f)) L.prev = { d: Object.assign({}, L.d), until: f, k: k + 1 };   // (until that seam, the old one)
  if (hxTakt(L)) { L.d.beats = beats; L.d.b0 = hxBeatAtF(f) - (k + 1) * beats; }
  else { L.d.L = Lf; L.d.ph0 = f - (k + 1) * Lf; }
}
// what a loop is now (geometry, tempo, its Schichten) – a re-cut's undo goes back to it
function hxGeo(L) { return { d: Object.assign({}, L.d), bpb: L.bpb, bpm: TG.hx, hxOn: TG.hxOn, o: TG.o, sch: L.sch.map((id) => hxSnapS(HX.sch.get(id))).filter(Boolean), nudge: L.nudge || 0 }; }
function hxGeoBack(L, g, o = {}) {
  const same = g.d.beats === L.d.beats && g.d.L === L.d.L && Math.abs(g.bpm - TG.hx) < 1e-9 && Math.abs(g.o - TG.o) < 1e-9 && g.nudge === (L.nudge || 0);
  const sw = o.now && same ? hxSwapAt(L) : hxNextSeam(L);   // (the undo of a change heard at once: at once too)
  hxBatch(() => {
    if (g.hxOn && TG.hxOn && Math.abs(g.bpm - TG.hx) > 1e-9 && !SEQ.ext) { TG.hx = g.bpm; tgRetempo(g.bpm); for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null); }
    if (Math.abs(g.o - TG.o) > 1e-9) { const sh = g.o - TG.o; TG.o = g.o; TG.ver++; rgRebase(sh); }
    for (const s of g.sch) {
      const S = hxSchByKey(s.key); if (!S) continue;
      const c = { in: s.cut.in, w0: s.cut.w0, w1: s.cut.w1, f0: s.cut.f0, pre: s.pre, len: s.len, post: s.cut.post, n: s.n, aus: s.aus };
      if (s.aud || hxReach(s.cut)) hxSchSwap(S, s.aud ? c : s.cut, { aud: s.aud, bak: s.bak, zo: s.zo, kc: s.kc, kcB: s.kcB, dr: s.dr, cutAus: s.cutAus, spliced: s.spliced, f: sw.f, now: !!sw.now, join: s.join, X: s.X, rho: s.rho, fade: Math.min(Math.round(0.03 * SR), s.aus ? s.aus.len : 0),
        geom: s === g.sch[0] && (g.d.beats !== L.d.beats || g.d.L !== L.d.L) ? (hxTakt(L) ? { beats: g.d.beats } : { L: g.d.L }) : null });
    }
  });
  L.bpb = g.bpb; L.nudge = g.nudge;
  hxSaveLoop(L); hxCardDirty();
  return !!sw.now;
}
// a new tempo for the Schleife that gave it: the Taktgeber's slope and the loop's beats in one message, from its next
// seam (a bar line – the new grid starts there; its sound is untouched); also the undo of such a correction
function hxTempoGeo(L, bpm, beats, bpb) {
  const sw = hxNextSeam(L), k = sw.k - 1, f1 = sw.f;   // (at its next seam – a bar line: the new grid starts on it, no bar line moves)
  hxBatch(() => { TG.hx = bpm; if (!SEQ.ext) tgRetempo(bpm, hxT(f1)); hxPost({ geom: { loop: L.id, beats, f: f1 } }); });
  hxGeomMirror(L, f1, k, beats); L.bpm = bpm; if (bpb) L.bpb = bpb;
  for (const fn of CTL['seq.bpm'] || []) fn(P['seq.bpm'], null);
  updDelay();
}
function hxKorr(L, what) {
  const S = L && HX.sch.get(L.sch[0]), cr = L && hxCorrs(L);
  if (!S || !L) return;
  const c = S.cut, beatF = hxTakt(L) ? c.len / L.d.beats : 0, before = hxGeo(L), key = L.key;
  let label = '', step = null;
  const audioStep = () => { const after = {}; return { undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); } }, redo() { const X = hxByKey(key); if (X && after.g) hxGeoBack(X, after.g); } }; };
  const tempoStep = (b0, n0, m0, b1, n1, m1) => ({ undo() { const X = hxByKey(key); if (X) hxTempoGeo(X, b0, n0, m0); }, redo() { const X = hxByKey(key); if (X) hxTempoGeo(X, b1, n1, m1); } });
  if ((what === 'x2' || what === 'h2') && cr.tempo) {
    const f2 = what === 'x2' ? 2 : 0.5, bpm = TG.hx * f2, beats = L.d.beats * f2, b0 = TG.hx, n0 = L.d.beats;
    if (bpm < 20 || bpm > 300 || !Number.isInteger(beats) || beats < 1) { toast('Dieses Tempo geht nicht.'); return; }
    hxTempoGeo(L, bpm, beats);
    label = 'Tempo ' + (f2 > 1 ? '×2' : '½') + ' (' + dec(bpm.toFixed(1)) + ' BPM)'; step = tempoStep(b0, n0, L.bpb, bpm, beats, L.bpb);
  } else if ((what === 'l+' || what === 'l-') && cr.len && (what === 'l+' || cr.minus)) {
    const nb = L.d.beats + (what === 'l+' ? 1 : -1) * (L.bpb || 4), nl = Math.round(beatF * nb), end = L.plan === 'grid' || L.plan == null;
    const f0 = end ? c.w1 - nl : c.w0, nc = hxCut(c.in, 0, 0, { f0, f1: f0 + nl });
    if (!hxReach(nc)) { toast('So weit reicht der Humus nicht zurück.'); return; }
    hxSchSwap(S, nc, { f: hxNextSeam(L).f, geom: { beats: nb } });
    label = 'Länge ' + (what === 'l+' ? '+1' : '−1') + ' Takt'; step = audioStep();
  } else if ((what === 'e<' || what === 'e>') && cr.eins) {
    const dlt = what === 'e<' ? -1 : 1;
    if (L.setTG && !SEQ.on && !SEQ.ext && hxLoopsLive().filter((x) => hxTakt(x)).length === 1) {   // the Takt is this loop's: its bar lines move, the sound stays
      const sh = (d) => { TG.o += d; TG.ver++; rgRebase(d); hxRailDirty(); };
      sh(dlt); step = { undo: () => sh(-dlt), redo: () => sh(dlt) };
    } else {
      const shF = Math.round(beatF) * -dlt, nc = hxCut(c.in, 0, 0, { f0: c.w0 + shF, f1: c.w1 + shF });
      if (!hxReach(nc)) { toast('So weit reicht der Humus nicht zurück.'); return; }
      hxSchSwap(S, nc, { f: hxNextSeam(L).f }); step = audioStep();
    }
    label = 'Eins ' + (dlt < 0 ? '←' : '→');
  } else if (what === '3er' && cr.drei) {
    const to = (L.bpb || 4) === 3 ? 4 : 3, m0 = L.bpb || 4;
    if (L.setTG && cr.tempo && L.tk) {   // the Takt finder's best reading in that meter, same duration
      const c3 = L.tk.filter((x) => x.m === to).sort((a, b) => b.S - a.S)[0];
      if (!c3) { toast('Kein ' + to + 'er-Takt passt.'); return; }
      const b0 = TG.hx, n0 = L.d.beats, bpm = (60 * c3.n) / hxLen(L);
      hxTempoGeo(L, bpm, c3.n, to); step = tempoStep(b0, n0, m0, bpm, c3.n, to);
    } else {
      const bars = Math.max(1, Math.round(L.d.beats / m0)), nb = bars * to, nl = Math.round(beatF * nb), nc = hxCut(c.in, 0, 0, { f0: c.w1 - nl, f1: c.w1 });
      if (!hxReach(nc)) { toast('So weit reicht der Humus nicht zurück.'); return; }
      hxSchSwap(S, nc, { f: hxNextSeam(L).f, geom: { beats: nb } }); step = audioStep();
      const u = step.undo, r0 = step.redo; step.undo = () => { u(); const X = hxByKey(key); if (X) X.bpb = m0; }; step.redo = () => { r0(); const X = hxByKey(key); if (X) X.bpb = to; };
    }
    L.bpb = to; label = to === 3 ? '3er-Takt' : '4er-Takt';
  } else if (what === 'davor' && cr.davor) {
    const nc = hxCut(c.in, 0, 0, { f0: c.w0 - c.len, f1: c.w1 - c.len });
    hxSchSwap(S, nc, { f: hxNextSeam(L).f }); label = 'Runde davor'; step = audioStep();
  } else if (what === 'in0' || what === 'in1' || what === 'in3') {
    const inp = what === 'in1' ? 1 : what === 'in3' ? 3 : 0;
    if (c.in === inp) return;
    const sh = (inp === 3 ? hxMicRt() : 0) - (c.in === 3 ? hxMicRt() : 0), nc = Object.assign({}, c, { in: inp, w0: c.w0 + sh, w1: c.w1 + sh, f0: c.f0 + sh });   // (step 4: the Mikro's ring – its round trip later)
    if (!hxReach(nc)) { toast('Der Humus hält dieses Stück nicht mehr.'); return; }
    hxSchSwap(S, nc, { f: hxNextSeam(L).f }); L.src = inp; label = 'Quelle ' + (inp === 1 ? 'Alles' : inp === 3 ? 'Mikro' : 'Gespielt'); step = audioStep();
    const u = step.undo, r0 = step.redo; step.undo = () => { u(); const X = hxByKey(key); if (X) X.src = c.in; }; step.redo = () => { r0(); const X = hxByKey(key); if (X) X.src = inp; };
  }
  if (!step) return;
  hxHist(Object.assign({ kind: 'recut', label: hxName(L) + ': ' + label }, step));
  if (HX.chips && HX.chips.key === key) { HX.chips.until = Math.max(HX.chips.until, performance.now() + HX_CHIP_S * 1000); HX.chips.kor = hxCorrs(L); }
  hxSay(hxName(L) + ': ' + label); hxSaveLoop(L); hxRailDirty(); hxCardDirty();
}
// a re-cut asked for by a second Korb tap or the card (a new window for a one-Schicht loop)
function hxRecut(L, o) {
  const S = HX.sch.get(L.sch[0]); if (!S) return;
  const before = hxGeo(L), c = hxCut(S.cut.in, o.w0, o.w1);
  if (!hxReach(c)) return;
  const nb = o.beats && hxTakt(L) && o.beats !== L.d.beats ? o.beats : null;
  hxSchSwap(S, c, { f: hxNextSeam(L).f, geom: nb ? { beats: nb } : null });
  const key = L.key, after = {};
  hxHist({ kind: 'recut', label: hxName(L) + ' ' + o.label, undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); } }, redo() { const X = hxByKey(key); if (X && after.g) hxGeoBack(X, after.g); } });
  hxSay(hxName(L) + ' ' + o.label); hxCardDirty();
}
// the phase in 5-ms or one-beat steps (the card): every Schicht read that much earlier or later, crossed at once
function hxNudge(L, sec) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
  if (sch.some((S) => !S.aud)) { toast('Einen Moment – die Schleife wird noch aufgenommen.'); return; }
  const dF = Math.round(sec * SR);
  if (sch.some((S) => S.pre - dF < 0 || S.pre - dF + S.len + S.X > S.n)) { toast('Weiter lässt sich die Phase nicht schieben.'); return; }
  const before = hxGeo(L);
  for (const S of sch) {
    const c = Object.assign({}, S.cut, { pre: S.pre - dF, w0: S.cut.w0 - dF, w1: S.cut.w1 - dF, aus: S.aus ? { off: S.aus.off - dF, len: S.aus.len } : null });
    hxSchSwap(S, c, { aud: S.aud, bak: S.bak, zo: S.zo, kc: S.kc, kcB: S.kcB, dr: S.dr, cutAus: S.cutAus, spliced: S.spliced, join: S.join, X: S.X, rho: S.rho, fade: Math.min(Math.round(0.03 * SR), S.aus ? S.aus.len : 0) });
  }
  L.nudge = (L.nudge || 0) + sec;
  const last = HX.hist[HX.hist.length - 1], key = L.key;
  if (last && last.kind === 'phase' && last.key === key && Date.now() - last.t < 4000) { last.t = Date.now(); last.label = hxName(L) + ': Phase ' + hxMs(L.nudge); }
  else { const after = {}; hxHist({ kind: 'phase', key, label: hxName(L) + ': Phase ' + hxMs(L.nudge), undo() { const X = hxByKey(key); if (X) { after.g = hxGeo(X); hxGeoBack(X, before); } }, redo() { const X = hxByKey(key); if (X && after.g) hxGeoBack(X, after.g); } }); }
  hxSaveLoop(L); hxCardDirty();
}
const hxMs = (s) => (s >= 0 ? '+' : '−') + dec(Math.abs(s * 1000).toFixed(0)) + ' ms';
// levels are performance (not in the history): a loop's, a Schicht's, a Schicht's mute
function hxLevel(L, g) { L.gain = clamp(g, 0, 2); hxGain(L.id, L.gain, null, 0.03); hxSaveMeta(L.id); }
function hxSchLevel(S, g, mute) {
  if (g != null) S.gain = clamp(g, 0, 2);
  if (mute != null) S.mute = !!mute;
  hxGain({ schicht: S.id }, S.mute || S.lm ? 0 : S.gain, null, 0.02);   // (step 2a: in Live mode its Abdruck rests)
  hxSaveMeta(S.loop);
}
function hxSchDel(S) {
  const L = HX.loops.get(S.loop); if (!L) return;
  if (L.sch.length <= 1) { hxDelete(L); return; }
  const sn = hxSnapS(S), lk = L.key;
  hxUndo(S.id); hxSaveMeta(L.id);
  hxHist({ kind: 'schicht', label: 'Schicht aus ' + hxName(L) + ' gelöscht', undo() { const X = hxByKey(lk); if (X) hxSchRebuild(X.id, sn); }, redo() { const X = hxSchByKey(sn.key); if (X) { hxUndo(X.id); hxSaveMeta(X.loop); } } });
  hxCardDirty();
}
// Zusammenlegen: a loop's audible Schichten as one – the processor itself renders its steady pass offline (Ausklänge of
// earlier passes included), so the sum is exact; the seam joins equal signals (ρ 1: the sum stays as it was). The
// single Schichten stay in the history for an undo until memory needs them.
async function hxMerge(L) {
  const sch = L.sch.map((id) => HX.sch.get(id)).filter((S) => S && !S.mute);
  if (sch.length < 2) { toast('Zum Zusammenlegen braucht es zwei hörbare Schichten.'); return false; }
  if (sch.some((S) => !S.aud)) { toast('Einen Moment – eine Schicht wird noch aufgenommen.'); return false; }
  // (step 1c: each as it plays – baked, or dry where it follows the chain; a dry one that waits for its bake waits)
  if (!L.folgt && sch.some((S) => S.chain && !S.baked && S.baking)) { toast('Einen Moment – eine Schicht wird noch eingebrannt.'); return false; }
  const ver = (S) => (S.baked && S.bak ? S.bak : S.aud), dry = L.folgt && sch.some((S) => S.chain);
  const k = hxPassK(L, Math.round(hxF(hxNowT()))), Lf = hxPassF(L, k + 1) - hxPassF(L, k), tail = Math.max(0, ...sch.map((S) => (S.aus ? S.aus.len : 0)));
  const passes = Math.ceil(tail / Lf) + 2, ctx = new OfflineAudioContext(2, Lf * (passes + 2), SR);
  if (!(await ensureDSP(ctx))) return false;
  const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gain: 1 } }];
  sch.forEach((S, i) => msgs.push({ schicht: { loop: 1, id: i + 1, chunks: ver(S), n: S.n, pre: S.pre, len: S.len, ausklang: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, gain: S.gain, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: (S.baked ? S.kcB : S.kc) || 0, fin: 0 } }));
  const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: HX_CH, msgs } });
  node.connect(ctx.destination, 0);
  const buf = await ctx.startRendering(), Lc = buf.getChannelData(0), Rc = buf.getChannelData(1), a = passes * Lf;
  const n = 2 * Lf, [aud] = hxChunks(n);
  for (let i = 0; i < n; i++) { const j = a + (i % Lf), c = aud[Math.floor(i / HX_CH)]; c[0][i % HX_CH] = Lc[j]; c[1][i % HX_CH] = Rc[j]; }
  if (!HX.loops.has(L.id)) return false;
  const snaps = sch.map(hxSnapS), lk = L.key, c = { in: sch[0].cut.in, w0: 0, w1: Lf, f0: 0, pre: 0, len: Lf, post: Lf, n, aus: null, stale: true };
  // (Taumeln: the sum follows the drift its first Schicht was played with – each was rendered here at its own pitch)
  const b0 = sch[0], dr = b0.dr ? Float32Array.from({ length: Math.ceil(n / 128) + 1 }, (_, k) => b0.dr[Math.min(b0.dr.length - 1, Math.max(0, Math.floor((b0.pre + ((k * 128) % Lf)) / 128)))]) : null;
  for (const S of sch) hxUndo(S.id, null, 0.01);
  const id = hxSchNew(L.id, c, { aud, dr, join: 'xf', X: 0.01, rho: 1, kind: 'sediment', fin: 0.01, probe: false, chain: dry });   // (the sum: baked as its Schichten were, or dry when the loop follows the chain)
  const mk = HX.sch.get(id).key;
  hxHist({ kind: 'merge', label: hxName(L) + ': ' + sch.length + ' Schichten zusammengelegt', snaps,
    undo() { const M = hxSchByKey(mk), X = hxByKey(lk); if (M) hxUndo(M.id, null, 0.01); if (X) for (const s of snaps) hxSchRebuild(X.id, s); },
    redo() { const X = hxByKey(lk); if (!X) return; for (const s of snaps) { const S = hxSchByKey(s.key); if (S) hxUndo(S.id, null, 0.01); } hxSchNew(X.id, c, { aud, dr, key: mk, join: 'xf', X: 0.01, rho: 1, kind: 'sediment', fin: 0.01, probe: false, chain: dry }); } });
  hxSaveLoop(L); hxCardDirty();
  hxSay(hxName(L) + ': Schichten zusammengelegt');
  return true;
}

