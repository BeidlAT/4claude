// ---- the bake (SPEC §9): a Gespielt Schicht plays dry through the live chain (out 1 → a copy of the chain → the strip)
// until its baked version – the same audio through the chain with the settings, changes and LFO phases of the
// recording – is swapped in at its next seam (out 0, straight to the strip: the live chain no longer touches it). A
// loop set to „folgt der Effektkette“ stays dry on out 1. „Alles“ heard the chain already: out 0, never baked. ----
// does the chain apply to what this window captured? (Gespielt: the strips whose notes are in it go through the chain –
// a strip routed past it (dir) is not baked; mixed routes take the chain: the documented compromise of one strip)
function hxChainFor(inp, evs) {
  if (inp === 1 || inp === 3) return false;   // (step 4: the Mikro never went through the chain – it stays as it was sung)   // (step 2b: the Puls's ring is a tap before the chain, as Gespielt)
  const ks = [...new Set((evs || []).map((e) => (e.src === 'ras' ? 'fin' : e.src)).filter((k) => MIX.s[k]))];
  const list = ks.length ? ks : ['fin'];
  return list.some((k) => P['x' + k + '.route'] !== 'dir');
}
// the processor plays this version of the Schicht from frame f (its next seam): dry (out 1 through the live chain, or
// out 0 when nothing chains it) or baked (out 0)
function hxSchPlay(S, bak, f) {
  const L = HX.loops.get(S.loop), aud = bak ? S.bak : S.aud;
  if (!L || !aud || !HX.node) return false;
  const [cp, tr] = hxCopy(aud), out = bak || !S.chain ? 0 : 1;
  const au = S.aus ? { off: S.aus.off, len: S.aus.len, fade: S.aus.fade != null ? S.aus.fade : Math.min(Math.round(0.03 * SR), S.aus.len) } : null;
  hxPost({ replace: { loop: S.loop, schicht: S.id, chunks: cp, n: S.n, pre: S.pre, len: S.len, ausklang: au, f, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: (bak ? S.kcB : S.kc) || 0, out, dd: out && !L.folgt ? 0 : 1 } }, tr);
  S.out = out; S.baked = !!bak; S.swapF = f; S.ddOn = false; hxCount();
  return true;
}
// a Schicht's audio is complete on the page (its live fill came back, or a re-cut's): the Ausklang's rendered rest, the
// bake – then one swap at the next seam. A newer version (a re-cut, an undo) makes the old work void.
async function hxAfterFill(S) {
  const L = HX.loops.get(S.loop);
  if (!L || !S.aud) return;
  const ver = S.ver || 0, ok = () => HX.sch.has(S.id) && (S.ver || 0) === ver && HX.loops.has(S.loop);
  let changed = false;
  if (S.cutAus && !S.spliced && L.notes.length && S.cut.in === 0) { const r = await hxTail(S); if (!ok()) return; if (r) changed = true; }
  if (S.chain && !L.folgt && hxwOk()) {
    const r = await hxBake(S);
    if (!ok()) return;
    if (r) { hxSchPlay(S, true, hxNextSeam(L).f); if (changed) hxSaveSch(S); hxSaveSch(S, 'b'); return; }
  }
  if (changed) { hxSchPlay(S, false, hxNextSeam(L).f); hxSaveSch(S); }
}
// → true when S.bak holds the baked audio of S.aud
async function hxBake(S) {
  const n = S.n, c = S.cut, ta = c.stale ? null : hxT(c.f0);
  if (ta == null || !S.aud) return false;
  if (hxNowT() - ta > 170) return false;   // (the chain's record reaches three minutes back)
  const Lb = new Float32Array(n), Rb = new Float32Array(n);
  for (let i = 0; i < n; i++) { const ch = S.aud[Math.floor(i / HX_CH)], j = i % HX_CH; if (ch) { Lb[i] = ch[0][j]; Rb[i] = ch[1][j]; } }
  const bv = (S.bv = (S.bv || 0) + 1), aud = S.aud;
  const m = await hxwCall('bake', { sr: SR, n, L: Lb, R: Rb, chain: hxChainRec(ta, ta + n / SR) }, [Lb.buffer, Rb.buffer]);
  if (!m || m.err || !m.L || S.bv !== bv || S.aud !== aud) { if (m && m.err) console.warn('Hexenring: Einbrennen', m.err); return false; }
  const [bak] = hxChunks(n);
  for (let i = 0; i < n; i++) { const ch = bak[Math.floor(i / HX_CH)], j = i % HX_CH; ch[0][j] = m.L[i]; ch[1][j] = m.R[i]; }
  S.bak = bak; S.kcB = S.join === 'xf' ? hxSeamOf(S, bak) : null;
  return true;
}
// „folgt der Effektkette“ for a loop: its Schichten go dry through the live chain from the next seam on – or back to
// their baked versions (baked now if they were not)
function hxFolgt(L, on) {
  L.folgt = !!on;
  const f = hxNextSeam(L).f;
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!S || !S.aud || !S.chain) continue;
    if (on && S.baked) hxSchPlay(S, false, f);
    else if (!on && !S.baked) { if (S.bak) hxSchPlay(S, true, f); else hxAfterFill(S); }
  }
  hxSay(hxName(L) + (on ? ' folgt der Effektkette' : ': Effektkette eingebrannt')); hxSaveMeta(L.id); hxCardDirty();
}

// ---- Taumeln (SPEC §9, per loop, default on): the shared drift bends every live voice; the processor hears it (input
// 1, once a render quantum – as the voices' k-rate detune reads it), keeps it beside the Humus, and gives each Schicht the
// drift its own frames were played with (S.dr, one value per 128 frames, filled along with its audio and kept with it,
// also across a reload). Playing, it reads each Schicht faster or slower by the drift now against the drift there – a
// pitch that follows the live one exactly, the content a few milliseconds early or late within a pass, back in phase at
// every seam. Off: the loop keeps its recorded tuning. ----
// (step 1d) Taumeln off: a de-drifted Schicht plays its own audio again from the next seam – as recorded, bit for bit
// (the processor holds only the de-drifted version; read against its own drift it would be resampled and ~ −69 dB off)
function hxTauOrig(L) {
  const sw = hxNextSeam(L);
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!S || !S.ddOn || S.ddZ || !S.aud) continue;
    const s = hxSnapS(S), c = { in: s.cut.in, w0: s.cut.w0, w1: s.cut.w1, f0: s.cut.f0, pre: s.pre, len: s.len, post: s.cut.post, n: s.n, aus: s.aus };
    hxSchSwap(S, c, { aud: s.aud, bak: s.bak, zo: s.zo, kc: s.kc, kcB: s.kcB, dr: s.dr, cutAus: s.cutAus, spliced: s.spliced, f: sw.f, join: s.join, X: s.X, rho: s.rho, fade: Math.min(Math.round(0.03 * SR), s.aus ? s.aus.len : 0) });
  }
}
function hxTaumelnSet(L, on) {
  if (on && HX.tauRest) { HX.tauRest = false; for (const X of hxLoopsLive()) if (X !== L && !X.bew && X.taumeln !== false) hxPost({ tau: { loop: X.id, on: true } }); }   // (phone report: „mit“ brings back what the guard let rest, for every loop)
  L.taumeln = !!on; hxPost({ tau: { loop: L.id, on: !!on } }); if (!on) hxTauOrig(L); hxCount(); hxSay(hxName(L) + (on ? ': taumelt mit' : ': bleibt in ihrer Stimmung')); hxSaveMeta(L.id); hxCardDirty(); }

