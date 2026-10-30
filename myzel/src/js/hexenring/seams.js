// ---- seams, complete (SPEC §7) ----
// the attack offsets of sources whose sound rises well after the note (bowed, blown, swelling): a note's forbidden zone
// reaches that much further (s)
const HX_ATT = { hrz: 0.25, hlm: 0.12, boe: 0.4, mdr: 0.3, glt: 0.3, khl: 0.06, amo: 0.05 };
// a radix-2 FFT in place
function hxFFT(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b = a + h, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
// a window of audio as one channel (L + R)/2: get(i) for i in [0, n)
const hxMono = (chunks, off, n) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) { const p = off + i, c = chunks[Math.floor(p / HX_CH)]; if (c && p >= 0) { const j = p % HX_CH; x[i] = 0.5 * (c[0][j] + c[1][j]); } } return x; };
// audio onsets (frames into x): the positive spectral flux of log magnitudes (512-frame Hann frames, hop 128), its
// peaks over an adaptive threshold and an absolute floor – the attacks inside voices that no note names (Rhizom's
// pings, grains, crackle), and the onsets of loops without notes
function hxFlux(x, floor) {
  const N = 512, H = 128, nf = Math.max(0, Math.floor((x.length - N) / H) + 1), win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  let prev = null; const fl = new Float32Array(nf), lv = new Float32Array(nf);
  for (let f = 0; f < nf; f++) {
    let e = 0;
    for (let i = 0; i < N; i++) { const v = x[f * H + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    hxFFT(re, im);
    const mag = new Float32Array(N / 2);
    for (let k = 1; k < N / 2; k++) mag[k] = Math.log(1 + 1000 * Math.hypot(re[k], im[k]));
    if (prev) { let s = 0; for (let k = 1; k < N / 2; k++) { const d = mag[k] - prev[k]; if (d > 0) s += d; } fl[f] = s; }
    prev = mag; lv[f] = Math.sqrt(e / N);
  }
  const out = [], fl0 = floor != null ? floor : 0.0018;
  for (let f = 2; f < nf - 2; f++) {
    const a = Math.max(0, f - 8), b = Math.min(nf, f + 9), w = Array.from(fl.subarray(a, b)).sort((p, q) => p - q), med = w[w.length >> 1];
    if (fl[f] > 1.6 * med + 4 && fl[f] >= fl[f - 1] && fl[f] >= fl[f + 1] && fl[f] > fl[f - 2] && lv[Math.min(nf - 1, f + 1)] > fl0) out.push(f * H + N / 2 - H);
  }
  return out;
}
// the seam's gain curve over the fade (K + 1 points, 1 at both ends): the output's short-term power (a 10-ms window)
// held at the equal-power blend of the two sides' own – a: what goes on (the pass that ended), b: the start; both as
// functions of the frame j from the fade's start, stereo [l, r]
function hxSeamK(a, b, X) {
  const K = Math.max(2, Math.ceil(X / 32)), W = 480, kc = new Float32Array(K + 1).fill(1);
  const g = (j) => { const x = (j + 0.5) / X; if (x <= 0) return [1, 0]; if (x >= 1) return [0, 1]; const s = 0.5 - 0.5 * Math.cos(Math.PI * x); return [Math.cos(HXP_HP * s), Math.sin(HXP_HP * s)]; };
  const kAt = (j) => { if (j < 0 || j >= X) return 1; const p = (j + 0.5) / X * K, i = Math.min(K - 1, Math.floor(p)), f = p - i; return kc[i] + f * (kc[i + 1] - kc[i]); };
  const Aj = [], Bj = [], Gj = [];
  for (let j = -W; j < X + 2 * W; j++) { Aj.push(a(j)); Bj.push(b(j)); Gj.push(g(j)); }   // (to the band's last window)
  for (let it = 0; it < 4; it++) {
    const nk = kc.slice();
    for (let i = 1; i < K; i++) {
      const c = Math.round(i * X / K);
      let M = 0, T = 0;
      for (let u = -W / 2; u < W / 2; u++) {
        const j = c + u, q = j + W, w = 0.5 + 0.5 * Math.cos(Math.PI * u / (W / 2)), [go, gi] = Gj[q], A2 = Aj[q], B2 = Bj[q], k = kAt(j);
        for (let ch = 0; ch < 2; ch++) { const y = k * (go * A2[ch] + gi * B2[ch]); M += w * y * y; T += w * (go * go * A2[ch] * A2[ch] + gi * gi * B2[ch] * B2[ch]); }
      }
      nk[i] = M > 1e-20 ? clamp(kc[i] * Math.sqrt(T / M), 0.5, 2) : kc[i];
    }
    for (let p = 0; p < 2; p++) { for (let i = 1; i < K; i++) kc[i] = 0.25 * nk[i - 1] + 0.5 * nk[i] + 0.25 * nk[i + 1]; for (let i = 1; i < K; i++) nk[i] = kc[i]; }   // (smoothed: the gain glides, no edge of its own in the sound)
  }
  return hxSeamBand(Aj, Bj, Gj, W, X, K, kc);
}
// the seam law itself (SPEC §7, ±1 dB): every 10-ms window through the seam – from one before the fade to one after it,
// a quarter window apart – heard within the two sides' own levels. The equal-power blend above is the curve's start; where
// a side's level swings inside a window (a Gong's beating partials against the other side's) the blend alone fell up to
// 1.7 dB below both (t-hx-seams, random Gong runs). There the curve's points move – the least that brings every window
// into the band, its bends kept small (a curve without an edge of its own: the third difference stays the material's).
// Each window's power is a quadratic form in the points (linear between them), so a point's move is checked on the
// windows it reaches alone.
function hxSeamBand(Aj, Bj, Gj, W, X, K, kc) {
  const H = W >> 2, K1 = K + 1, LAM = 5, nW = Math.floor((X + W) / H) + 1, PA = new Float64Array(nW), PB = new Float64Array(nW), C = new Float64Array(nW), O = new Float64Array(nW), Q = [];
  const S = new Float64Array(X), hp = new Int32Array(X), hu = new Float64Array(X);
  for (let j = 0; j < X; j++) { const q = j + W, [go, gi] = Gj[q], A = Aj[q], B = Bj[q], l = go * A[0] + gi * B[0], r = go * A[1] + gi * B[1], p = (j + 0.5) / X * K, i = Math.min(K - 1, Math.floor(p)); S[j] = l * l + r * r; hp[j] = i; hu[j] = 1 - (p - i); }
  for (let w = 0; w < nW; w++) {
    const i0 = -W + w * H, q = new Float64Array(K1 * 3);   // (per point: its own term and its two neighbours')
    let pa = 0, pb = 0, c = 0;
    for (let j = i0; j < i0 + W; j++) {
      const A = Aj[j + W], B = Bj[j + W], a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1];
      pa += a2; pb += b2;
      if (j < 0) c += a2; else if (j >= X) c += b2;
      else { const p = hp[j], u = hu[j], v = 1 - u, s2 = S[j]; q[p * 3 + 1] += u * u * s2; q[(p + 1) * 3 + 1] += v * v * s2; q[p * 3 + 2] += u * v * s2; q[(p + 1) * 3] += u * v * s2; }
    }
    PA[w] = pa; PB[w] = pb; C[w] = c; Q.push(q);
  }
  const pw = (w) => { const q = Q[w]; let v = C[w]; for (let p = 0; p <= K; p++) v += kc[p] * (kc[p] * q[p * 3 + 1] + (p ? kc[p - 1] * q[p * 3] : 0) + (p < K ? kc[p + 1] * q[p * 3 + 2] : 0)); return v; };
  const viol = (w, v) => { const lo = Math.min(PA[w], PB[w]), hi = Math.max(PA[w], PB[w]); if (!(hi > 1e-10)) return 0; const d = v < lo ? 10 * Math.log10(Math.max(v, 1e-30) / lo) : v > hi ? 10 * Math.log10(v / hi) : 0; return d * d; };
  let bad = 0; for (let w = 0; w < nW; w++) { O[w] = pw(w); bad += viol(w, O[w]); }
  if (!(bad > 0.01)) return kc;   // (every window within 0.1 dB of the band: the blend as it was)
  const by = []; for (let i = 0; i <= K; i++) { const L = []; for (let w = 0; w < nW; w++) if (Q[w][i * 3 + 1] > 0) L.push(w); by.push(L); }
  const sm = (i) => { let o = 0; for (let m = Math.max(1, i - 1); m <= Math.min(K - 1, i + 1); m++) { const d2 = kc[m - 1] - 2 * kc[m] + kc[m + 1]; o += LAM * d2 * d2; } return o; };
  for (const st of [1.08, 1.03, 1.01]) for (let it = 0; it < 30; it++) {
    let moved = false;
    for (let i = 1; i < K; i++) for (const m of [st, 1 / st]) {
      const old = kc[i], nv = clamp(old * m, 0.5, 2); if (nv === old) continue;
      const d = nv - old, nO = []; let before = sm(i), after = 0;
      for (const w of by[i]) { const q = Q[w]; let dv = d * d * q[i * 3 + 1] + 2 * d * (old * q[i * 3 + 1] + (i ? kc[i - 1] * q[i * 3] : 0) + (i < K ? kc[i + 1] * q[i * 3 + 2] : 0)); const v = O[w] + dv; before += viol(w, O[w]); after += viol(w, v); nO.push(v); }
      kc[i] = nv; after += sm(i);
      if (after < before - 1e-12) { by[i].forEach((w, n) => { O[w] = nO[n]; }); moved = true; } else kc[i] = old;
    }
    if (!moved) break;
  }
  return kc;
}
const HXP_HP = Math.PI / 2;
// the curve of a Schicht's own seam, from its own audio (its baked version, or the page's copy): the pass that ended goes
// on from pre + len (+ zo), the start from pre (+ zo)
function hxSeamOf(S, aud) {
  const at = (i) => { const c = aud[Math.floor(i / HX_CH)]; return c && i >= 0 ? [c[0][i % HX_CH], c[1][i % HX_CH]] : [0, 0]; }, z = S.zo || 0;
  return hxSeamK((j) => at(S.pre + S.len + z + j), (j) => at(S.pre + z + j), S.X);
}
// Nahtwahl and the join, once the window's end and the room after it have sounded: cold (the start holds no ring-in,
// ≥ 10 dB under what followed the end, with ≥ 30 ms of Ausklang) → the Ausklang overlap-added; warm → the crossfade
// (40 ms for sustained sound, else 10, never into an onset), its place inside the pass rotated only where the material
// is confirmed as a repetition (the notes after the window's end are those after its start, one length later) and
// never 5 ms before to 60 ms after an onset (the notes ∪ the audio's own, a slow source's attack later), its gain curve
// from both sides. The Ausklang ends at the first foreign onset (a note of a captured source; for a loop without notes
// an audio onset) – what it would have rung on is rendered from the notes in the Werk-Rahmen (hxTail).
function hxProbe(S, after) {
  const c = S.cut, L = HX.loops.get(S.loop), w1t = hxT(c.w1), ver = S.ver || 0;
  const len = c.len, Zc = L && S.kind !== 'punch' ? Math.max(0, Math.min((hxGrid() ? hxBar() : 1) / 2, 0.4 * len / SR, (c.post - Math.round(0.1 * SR)) / SR)) : 0;
  S.wait = { probe: true, ausT: c.aus ? w1t + c.aus.len / SR : 0 };
  const pad = Math.round(0.03 * SR), X40 = Math.round(0.04 * SR), span = Math.round(Zc * SR) + X40 + pad;
  const go = async () => {
    const [A0, B0] = await Promise.all([hxGrab({ in: c.in, f0: c.w0 - pad, f1: c.w0 + span }), hxGrab({ in: c.in, f0: c.w1 - pad, f1: c.w1 + span })]);
    if (!HX.sch.has(S.id) || !A0 || !B0 || (S.ver || 0) !== ver) return;
    const at = (g, i) => { const ch = g.chunks[Math.floor(i / HX_CH)], j = i % HX_CH; return ch && i >= 0 ? [ch[0][j], ch[1][j]] : [0, 0]; };
    const a = (j) => at(B0, pad + j), b = (j) => at(A0, pad + j);   // (a: what followed the end; b: the start – j frames from the bar line)
    const rmsR = (f, i0, n) => { let s = 0; for (let i = i0; i < i0 + n; i++) { const v = f(i); s += v[0] * v[0] + v[1] * v[1]; } return Math.sqrt(s / (2 * Math.max(1, n))); };
    const st = rmsR(b, 0, X40), co = rmsR(a, 0, X40), gap = hxForeign(S, w1t);
    const cold = co > 1e-5 && st < co * 0.316;
    if (S.aus) { const al = isFinite(gap) ? Math.max(0, Math.round((gap - 0.005) * SR)) : S.aus.len; if (al < S.aus.len) { S.aus.len = al; S.cutAus = true; S.wait.ausT = 0; } }
    let join = cold && S.aus && S.aus.len >= 0.03 * SR ? 'ola' : 'xf', zo = 0;
    let X = cold ? 0.01 : st > 0.02 && gap > 0.045 ? 0.04 : Math.max(0.004, Math.min(0.01, gap - 0.005));
    if (join === 'xf' && Zc > 0) zo = hxNaht(S, A0, B0, pad, Zc, Math.round(X * SR), a, b);
    if (zo) X = Math.min(X, 0.04);
    const Xf = Math.round(X * SR);
    let ab = 0, aa = 0, bb = 0;
    for (let j = 0; j < Xf; j++) { const p = a(zo + j), q = b(zo + j); ab += p[0] * q[0] + p[1] * q[1]; aa += p[0] * p[0] + p[1] * p[1]; bb += q[0] * q[0] + q[1] * q[1]; }
    const rho = aa > 1e-20 && bb > 1e-20 ? clamp(ab / Math.sqrt(aa * bb), -1, 1) : 0;
    const kc = join === 'xf' ? hxSeamK((j) => a(zo + j), (j) => b(zo + j), Xf) : null;
    Object.assign(S, { join, X: Xf, rho, cold, zo, kc });
    const m = { schicht: S.id, join, X: Xf, rho, zo, kc: kc || 0 };
    if (S.aus) { m.len = S.aus.len; m.fade = S.aus.fade = Math.min(Math.round(0.03 * SR), S.aus.len); }
    hxPost({ aus: m });
    S.wait.probe = false;
    if (!S.wait.ausT || hxNowT() > S.wait.ausT) S.wait = null;
    if (S.wait && !(L && L.notes.length)) S.wait.flux = c.w1;   // (no notes: the Ausklang watches the audio for an onset)
    hxSaveMeta(S.loop);
  };
  const due = Math.max(w1t + Zc + 0.045 + 0.04, after || 0) - hxNowT();   // (a swap: after it acted, so the reply meets the new version)
  if (due <= 0) go(); else setTimeout(go, due * 1000);
}
// Nahtwahl: where inside the pass the seam lies (frames after the bar line, 0 … Zc) – only as far as the repetition is
// confirmed, outside every onset's zone, where it is quiet and both sides agree; the bar line when it is as good
function hxNaht(S, A0, B0, pad, Zc, Xf, a, b) {
  const c = S.cut, Zf = Math.round(Zc * SR), w0 = hxT(c.w0), w1 = hxT(c.w1);
  const nA = hxNotes(w0 - 0.03, w0 + Zc + 0.06, c.in, false).filter((e) => e.t0 >= w0 - 0.03), nB = hxNotes(w1 - 0.03, w1 + Zc + 0.06, c.in, false).filter((e) => e.t0 >= w1 - 0.03);
  // the repetition, confirmed: every onset after the start has its twin after the end (the same pitch, ±40 ms)
  let lim = 0;
  if (nA.length || nB.length) {
    const tw = (x, list, off) => list.find((y) => Math.abs(y.t0 - off - x.t0) < 0.04 && y.oct === x.oct && y.deg === x.deg && Math.abs(y.alt - x.alt) < 0.3);
    const evs = nA.map((x) => [x.t0 - w0, !!tw(x, nB, w1 - w0)]).concat(nB.map((y) => [y.t0 - w1, !!tw(y, nA, w0 - w1)])).sort((p, q) => p[0] - q[0]);
    lim = Zc; for (const [t, okk] of evs) if (!okk) { lim = Math.max(0, t - 0.065); break; }
    if (evs.length && !evs.some((e) => e[1])) lim = 0;
  } else {   // no notes: only audio that repeats itself closely (its correlation over the room ≥ 0.7)
    let ab = 0, aa = 0, bb = 0; for (let j = 0; j < Zf; j += 2) { const p = a(j), q = b(j); ab += p[0] * q[0] + p[1] * q[1]; aa += p[0] * p[0] + p[1] * p[1]; bb += q[0] * q[0] + q[1] * q[1]; }
    lim = aa > 1e-12 && bb > 1e-12 && ab / Math.sqrt(aa * bb) >= 0.7 ? Zc : 0;
  }
  const lf = Math.min(Zf, Math.round(lim * SR));
  if (lf < 96) return 0;
  // the zones: notes (their attack offset added), the audio's own onsets
  const zones = [];
  for (const [list, off] of [[nA, w0], [nB, w1]]) for (const e of list) { const t = Math.round((e.t0 - off) * SR); zones.push([t - Math.round(0.005 * SR), t + Math.round((0.06 + (HX_ATT[e.eng] || 0)) * SR)]); }
  for (const g of [A0, B0]) for (const o of hxFlux(hxMono(g.chunks, 0, g.n))) { const t = o - pad; zones.push([t - Math.round(0.01 * SR), t + Math.round(0.06 * SR)]); }
  const free = (z) => !zones.some(([p, q]) => p < z + Xf && q > z);
  let best = -1, bc = Infinity, c0 = Infinity;
  for (let z = 0; z <= lf; z += 48) {
    if (!free(z)) continue;
    let e = 0, ab = 0, aa = 0, bb = 0;
    for (let j = z; j < z + Xf; j += 2) { const p = a(j), q = b(j); e += p[0] * p[0] + p[1] * p[1] + q[0] * q[0] + q[1] * q[1]; ab += p[0] * q[0] + p[1] * q[1]; aa += p[0] * p[0] + p[1] * p[1]; bb += q[0] * q[0] + q[1] * q[1]; }
    const rho = aa > 1e-20 && bb > 1e-20 ? ab / Math.sqrt(aa * bb) : 1, cost = (e / Xf + 1e-9) * (1.25 - rho) * (1 + 0.3 * z / Math.max(1, Zf));
    if (z === 0) c0 = cost;
    if (cost < bc) { bc = cost; best = z; }
  }
  if (best <= 0 || c0 <= 1.3 * bc) return 0;
  return best;
}
// seconds from the window's end to the first note of a source this Schicht captured (Infinity: none yet)
function hxForeign(S, w1t) {
  const evs = hxEvents(w1t + 0.002, hxNowT() + 1, false).filter((e) => hxSrcIn(e.src, S.cut.in));
  return evs.length ? evs[0].t0 - w1t : Infinity;
}
// watched in hxTick: an open Ausklang closes at the first foreign onset – a note, or (a loop without notes) an onset in
// the audio after the window's end, looked for four times a second
function hxAusWatch() {
  const now = hxNowT();
  for (const S of HX.sch.values()) {
    const w = S.wait;
    if (!w || w.probe || !w.ausT) continue;
    const w1t = hxT(S.cut.w1), gap = hxForeign(S, w1t);
    if (isFinite(gap) && gap < S.aus.len / SR) {
      S.aus.len = Math.max(0, Math.round((gap - 0.005) * SR)); S.aus.fade = Math.min(Math.round(0.03 * SR), S.aus.len); S.cutAus = true;
      hxPost({ aus: { schicht: S.id, len: S.aus.len, fade: S.aus.fade } });
      S.wait = null; hxSaveMeta(S.loop);
    } else if (now > w.ausT) S.wait = null;
    else if (w.flux != null && !w.fluxBusy && now - (w.fluxT || 0) > 0.25) {
      w.fluxT = now; w.fluxBusy = true;
      const f0 = w.flux, f1 = Math.min(Math.round(hxF(now - 0.02)), S.cut.w1 + S.aus.len), pre = Math.round(0.02 * SR);
      if (f1 - f0 < 1024) { w.fluxBusy = false; continue; }
      hxGrab({ in: S.cut.in, f0: f0 - pre, f1 }).then((g) => {
        w.fluxBusy = false;
        if (!g || S.wait !== w) return;
        const on = hxFlux(hxMono(g.chunks, 0, g.n), 0.003).map((o) => o - pre).filter((o) => o > 0.01 * SR);
        if (on.length) { const al = Math.max(0, f0 + on[0] - S.cut.w1 - Math.round(0.005 * SR)); if (al < S.aus.len) { S.aus.len = al; S.aus.fade = Math.min(Math.round(0.03 * SR), al); S.cutAus = true; hxPost({ aus: { schicht: S.id, len: al, fade: S.aus.fade } }); S.wait = null; hxSaveMeta(S.loop); return; } }
        w.flux = Math.max(f0, f1 - 1024);
      });
    }
  }
}
// the Ausklang's rest, rendered: the notes that sounded into the window's end (started up to 12 s before it), in the
// Werk-Rahmen with this patch and level – from the cut on, behind a 30-ms equal-power crossfade, its level matched to
// the Humus's just before; it rings until −90 dB or 12 s after the window. A sibling of the live notes' sound (other
// random draws, another drift phase) – only for a decaying tail.
async function hxTail(S) {
  const c = S.cut, w1 = hxT(c.w1), al = S.aus ? S.aus.len : 0, xf = Math.round(0.03 * SR);
  if (!S.aud || al < xf + Math.round(0.03 * SR)) return false;
  const evs = hxNotes(w1 - 12, w1, c.in, true).filter((e) => e.t0 >= w1 - 12 && e.t0 < w1 - 0.002);
  if (!evs.length) return false;
  const tS = Math.min(...evs.map((e) => e.t0)) - 0.05, TT = 12, dur = w1 - tS + TT, from = w1 - tS + (al - xf) / SR - 0.06;
  const rel = (p) => p.map(([t, v]) => [t - tS, v]);
  const notes = evs.map((e) => ({ t0: e.t0 - tS, t1: e.t1 != null ? e.t1 - tS : null, eng: e.eng, f: e.f, y0: e.y0, vel: e.vel, pan: e.pan, amp: e.amp, src: e.src === 'ras' ? 'fin' : e.src, burst: e.burst, gate: e.gate, hold: e.hold, curves: { y: rel(e.curves.y), f: rel(e.curves.f) } }));
  const m = await hxwCall('tail', { sr: SR, dur, from, notes, P: Object.assign({}, P), q: P['dev.q'], seed: (Math.random() * 2147483647) | 1, jrg: { age: A.jrgAge, season: A.season }, mask: [...HX.mask] });
  if (!m || m.err || !m.L || !HX.sch.has(S.id) || !S.aud) return false;
  // level: the Humus's last 60 ms before the crossfade against the render's same 60 ms
  const off = S.aus.off, h0 = off + al - xf - Math.round(0.06 * SR), r0 = 0;   // (the render starts 60 ms before the crossfade)
  let eH = 0, eR = 0;
  for (let i = 0; i < Math.round(0.06 * SR); i++) { const p = h0 + i, ch = S.aud[Math.floor(p / HX_CH)], j = p % HX_CH; if (ch) eH += ch[0][j] * ch[0][j] + ch[1][j] * ch[1][j]; eR += m.L[r0 + i] * m.L[r0 + i] + m.R[r0 + i] * m.R[r0 + i]; }
  if (eR < 1e-14 || eH < 1e-14) return false;
  const g = clamp(Math.sqrt(eH / eR), 0.1, 10), s0 = Math.round(0.06 * SR);   // (the render's frame at the crossfade's start)
  // its end: −90 dB under its peak (held 50 ms), at most 12 s after the window
  let pk = 0; for (let i = s0; i < m.L.length; i++) pk = Math.max(pk, Math.abs(m.L[i]), Math.abs(m.R[i]));
  const thr = pk * g * Math.pow(10, -90 / 20);
  let end = m.L.length; for (let i = m.L.length - 1; i > s0; i--) if (Math.abs(m.L[i]) * g > thr || Math.abs(m.R[i]) * g > thr) { end = Math.min(m.L.length, i + Math.round(0.05 * SR)); break; }
  const nl = al - xf + (end - s0), n2 = Math.max(S.pre + S.len + (S.cut.post || 0), off + nl), [aud] = hxChunks(n2);
  // the splice's gain curve, as a seam's (the render is the same notes' sibling – partly correlated: a plain equal-power
  // fade would bulge there)
  const hAt = (p) => { const ch = S.aud[Math.floor(p / HX_CH)], j = p % HX_CH; return ch && p >= 0 && p < S.n ? [ch[0][j], ch[1][j]] : [0, 0]; }, x0 = off + al - xf;
  const kc = hxSeamK((j) => hAt(x0 + j), (j) => [g * (m.L[s0 + j] || 0), g * (m.R[s0 + j] || 0)], xf), K = kc.length - 1;
  const kAt = (u) => { const p = (u + 0.5) / xf * K, i = Math.min(K - 1, Math.floor(p)), f = p - i; return kc[i] + f * (kc[i + 1] - kc[i]); };
  for (let i = 0; i < n2; i++) {
    let l = 0, r = 0;
    if (i < off + al - xf) { const ch = S.aud[Math.floor(i / HX_CH)], j = i % HX_CH; if (ch && i < S.n) { l = ch[0][j]; r = ch[1][j]; } }
    else if (i < off + nl) {
      const u = i - (off + al - xf), q = s0 + u, rl = g * (m.L[q] || 0), rr = g * (m.R[q] || 0);
      if (u < xf) { const s = 0.5 - 0.5 * Math.cos(Math.PI * (u + 0.5) / xf), k = kAt(u), gi = k * Math.sin(HXP_HP * s), go = k * Math.cos(HXP_HP * s), [hl, hr] = hAt(i); l = go * hl + gi * rl; r = go * hr + gi * rr; }
      else { l = rl; r = rr; }
    }
    const ch = aud[Math.floor(i / HX_CH)], j = i % HX_CH; ch[0][j] = l; ch[1][j] = r;
  }
  S.aud = aud; S.n = n2; S.aus = { off, len: nl, fade: Math.min(Math.round(0.03 * SR), nl) }; S.spliced = true;
  if (S.cold) S.join = 'ola';
  HX.tails = (HX.tails || 0) + 1;
  return true;
}
// the Auftakt (KONZEPT §2.6): what was played in the half bar before the loop's 1 (a pick-up after a rest) is laid onto
// its end, where it belongs musically – only if the end holds no onset of its own; otherwise a chip offers it. It is a
// Schicht of its own (its audio, read from len − its length to len: pre < 0), baked like the others.
function hxAuftaktPlan(c, evs, inp) {
  const w0 = hxT(c.w0), w1 = hxT(c.w1), h = Math.min(hxGrid() ? hxBar() / 2 : 1, (c.w1 - c.w0) / SR / 2);
  // (a note held on into the window is no pick-up but the window's own, struck early: laid on its end it would sound twice)
  const pick = hxNotes(w0 - h, w0 - 0.005, inp, false).filter((e) => e.t0 >= w0 - h && !(e.hold && (e.t1 == null || e.t1 > w0 + 0.25 * h)));
  if (!pick.length) return null;
  const first = pick[0].t0, before = hxNotes(first - 0.3, first - 0.002, inp, true).filter((e) => e.t0 < first - 0.002 && (e.t1 == null ? e.t0 + 0.25 > first - 0.3 : e.t1 > first - 0.3));
  if (before.length) return null;   // (no rest before it: not a pick-up, the phrase began earlier)
  const end = (evs || []).some((e) => e.t0 >= w1 - h && e.t0 < w1);
  return { a: Math.round(hxF(first - 0.012)), b: c.w0, notes: pick, auto: !end, h };
}
async function hxAuftakt(L, ap, o = {}) {
  if (!L || !ap || L.state === 'weg') return 0;
  const g = await hxGrab({ in: L.src || 0, f0: ap.a, f1: ap.b, dr: true });
  if (!g || !HX.loops.has(L.id) || L.state === 'weg') return 0;
  const n = g.n, fi = Math.round(0.01 * SR);
  for (let i = 0; i < Math.min(fi, n); i++) { const w = Math.sin(HXP_HP * (0.5 - 0.5 * Math.cos(Math.PI * (i + 0.5) / fi))), ch = g.chunks[Math.floor(i / HX_CH)], j = i % HX_CH; ch[0][j] *= w; ch[1][j] *= w; }
  const Lf = hxTakt(L) ? hxPassF(L, Math.max(0, L.k || 0) + 1) - hxPassF(L, Math.max(0, L.k || 0)) : L.d.L, len = (HX.sch.get(L.sch[0]) || {}).len || Lf;
  const cut = { in: L.src || 0, w0: ap.a, w1: ap.b, f0: ap.a, pre: -(len - n), len, post: 0, n, aus: null };
  const id = hxSchNew(L.id, cut, { aud: g.chunks, dr: g.dr, join: 'cut', fin: 0, kind: 'auftakt', probe: false, chain: hxChainFor(L.src || 0, ap.notes) });
  const S = HX.sch.get(id);
  if (S) { S.aud = g.chunks; S.live = false; S.cut.stale = false; hxAfterFill(S); }
  for (const e of ap.notes) L.notes.push({ ph: clamp(1 - (ap.b - Math.round(hxF(e.t0))) / len, 0, 0.9999), x: e.x != null ? e.x : 0.5, y: e.y0, r: 0.5, v: e.vel, d: 0.2, deg: e.deg, oct: e.oct, src: e.src, eng: e.eng, f: e.f });
  if (o.step !== false) hxHist(hxSchStep(L.key, [S.key], 'Auftakt an ' + hxName(L)));
  hxSay(hxName(L) + ': Auftakt angefügt'); hxRailDirty(); hxCardDirty(); hxSaveLoop(L);
  return id;
}
// once the window's end has sounded: a pick-up before its 1? laid on at once when its end holds no onset (notes, and the
// audio's own), else offered as a chip for the harvest's 8 s
function hxAuftaktLater(L, c, inp) {
  const key = L.key, due = hxT(c.w1) + 0.08 - hxNowT();
  setTimeout(async () => {
    const X = hxByKey(key); if (!X || X.sch.length !== 1) return;
    const evs = hxNotes(hxT(c.w0) - 0.03, hxT(c.w1), inp, false), ap = hxAuftaktPlan(c, evs, inp);
    if (!ap) return;
    if (ap.auto) {
      const h = Math.round(ap.h * SR), g = await hxGrab({ in: inp, f0: c.w1 - h, f1: c.w1 });
      if (g && hxFlux(hxMono(g.chunks, 0, g.n)).length) ap.auto = false;
    }
    if (!hxByKey(key)) return;
    if (ap.auto) { await hxAuftakt(X, ap, { step: false }); return; }
    X.auf = ap;
    if (HX.chips && HX.chips.key === key) { HX.chips.auf = true; HX.chips.until = Math.max(HX.chips.until, performance.now() + 4000); HXU.sig = ''; hxRailDirty(); }
  }, Math.max(0, due * 1000));
}

