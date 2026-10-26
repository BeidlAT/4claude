// ---- (owner, 26.10.2026) „einzelne Abschnitte, die man auswählt, separat editieren, ohne dass der Rest betroffen ist“ –
// a stretch chosen in the editor is changed on its own, written into the Schicht's audio (its dry and its baked version
// alike, the same frames): the tape faster or slower (the stretch keeps its length – owner's choice: ×2 plays it twice
// in its time, ½ its first half slowly), rückwärts, Weglassen and Tauschen of its onsets, louder, softer or silent.
// 5-ms crossfades at the stretch's edges and inside; one history step each (↶ swaps the audio before back – hxGeo).
// The loop's own tools (the whole tape, Verblassen, Abrieb) keep working on top. ----
const HX_RX = Math.round(0.005 * SR);   // the crossfade at a stretch's edges, at a repetition's joins and a slice's
// a windowed sinc (Kaiser, β 9, 32 taps) read at a fractional position of a chunk list – the cutoff lowered for a
// faster tape (no folding); the window from a table, the sum of the taps normalised (no level change at any rate)
const HX_RS = { T: 16, n: 4096, w: null };
function hxRsWin() {
  const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; }, b = 9, w = new Float32Array(HX_RS.n + 2);
  for (let j = 0; j <= HX_RS.n + 1; j++) { const u = Math.min(1, j / HX_RS.n); w[j] = I0(b * Math.sqrt(Math.max(0, 1 - u * u))) / I0(b); }
  return (HX_RS.w = w);
}
const HX_RSO = [0, 0];
function hxRsRead(ch, p, fc) {
  const T = HX_RS.T, W = HX_RS.w || hxRsWin(), n = HX_RS.n, i = Math.floor(p), fr = p - i;
  let sl = 0, sr = 0, ws = 0;
  for (let k = -T + 1; k <= T; k++) {
    const x = k - fr, au = Math.abs(x) / T; if (au >= 1) continue;
    const q = au * n, j = q | 0, w = W[j] + (W[j + 1] - W[j]) * (q - j), s = x === 0 ? fc : Math.sin(Math.PI * fc * x) / (Math.PI * x), g = w * s, f = i + k;
    ws += g; if (f < 0) continue;
    const c = ch[Math.floor(f / HX_CH)]; if (!c) continue;
    const m = f % HX_CH; sl += c[0][m] * g; sr += c[1][m] * g;
  }
  HX_RSO[0] = ws > 1e-9 ? sl / ws : 0; HX_RSO[1] = ws > 1e-9 ? sr / ws : 0;
  return HX_RSO;
}
// the stretch [a, b) of a Schicht's window as frames of its audio
const hxRxFrames = (S, a, b) => [S.pre + Math.round(a * S.len), S.pre + Math.round(b * S.len)];
// a chunk list's frame (0 outside), and a copy to write into
const hxRxGet = (ch) => (f) => { const c = ch[Math.floor(f / HX_CH)]; if (!c || f < 0) return [0, 0]; const j = f % HX_CH; return [c[0][j], c[1][j]]; };
const hxRxCopy = (ch) => ch.map((c) => [c[0].slice(), c[1].slice()]);
function hxRxSet(ch, f, l, r) { const c = ch[Math.floor(f / HX_CH)]; if (!c) return; const j = f % HX_CH; c[0][j] = l; c[1][j] = r; }
// the stretch processed: out(i) for i in [0, N) – then written in with its edges crossfaded to the audio around it
function hxRxApply(ch, r0, r1, out) {
  const N = r1 - r0, dst = hxRxCopy(ch), get = hxRxGet(ch), X = Math.min(HX_RX, Math.floor(N / 4));
  for (let i = 0; i < N; i++) {
    const o = out(i), w = X ? Math.min(1, Math.min(i, N - 1 - i) / X) : 1, e = Math.sin(0.5 * Math.PI * w), q = Math.cos(0.5 * Math.PI * w), v = get(r0 + i);
    hxRxSet(dst, r0 + i, o[0] * e + v[0] * q, o[1] * e + v[1] * q);
  }
  return dst;
}
// the operations: what the stretch plays, frame by frame
function hxRxOp(ch, r0, r1, op, v, u) {
  const N = r1 - r0, get = hxRxGet(ch);
  if (op === 'band') {   // the tape at v: its sound read v times as fast; it keeps its length – repeated (v > 1) or cut (v < 1)
    const fc = Math.min(1, 1 / v) * 0.97, M = Math.max(16, Math.floor(N / v)), X = Math.min(HX_RX, Math.floor(M / 4));
    const seq = new Float32Array((M + X) * 2);
    for (let k = 0; k < M + X; k++) { const s = hxRsRead(ch, r0 + k * v, fc); seq[2 * k] = s[0]; seq[2 * k + 1] = s[1]; }
    return (i) => {
      if (v <= 1) return [seq[2 * i], seq[2 * i + 1]];
      const t = i % M, kk = Math.floor(i / M);
      if (kk === 0 || t >= X) return [seq[2 * t], seq[2 * t + 1]];
      const w = t / X, e = Math.sin(0.5 * Math.PI * w), q = Math.cos(0.5 * Math.PI * w), p = M + t;   // (the tile before rings on under the new one)
      return [seq[2 * t] * e + seq[2 * p] * q, seq[2 * t + 1] * e + seq[2 * p + 1] * q];
    };
  }
  if (op === 'rev') return (i) => get(r1 - 1 - i);
  if (op === 'gain') return (i) => { const s = get(r0 + i); return [s[0] * v, s[1] * v]; };
  // Weglassen / Tauschen: the stretch's slices at the loop's onsets (u: shares of the window, a slice from its start)
  const cuts = [0].concat(u.filter((x) => x > 1e-6 && x < 1 - 1e-6).map((x) => Math.round(x * N))).filter((x, i, A) => i === 0 || x - A[i - 1] > 2 * HX_RX).concat([N]);
  const sl = []; for (let i = 0; i + 1 < cuts.length; i++) sl.push([cuts[i], cuts[i + 1]]);
  const rnd = hxRng(((Math.random() * 2147483646) | 0) + 1), ord = sl.map((x, i) => i), keep = sl.map(() => true);
  if (op === 'weg') { for (let i = 0; i < sl.length; i++) if (rnd() < v) keep[i] = false; if (keep.every(Boolean) && sl.length > 1) keep[Math.floor(rnd() * sl.length)] = false; }
  else { const pick = ord.filter(() => rnd() < Math.max(v, 0.0001)); if (pick.length < 2 && sl.length >= 2) { pick.length = 0; const a = Math.floor(rnd() * sl.length); pick.push(a, (a + 1 + Math.floor(rnd() * (sl.length - 1))) % sl.length); } const sh = pick.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } pick.forEach((p, i) => { ord[p] = sh[i]; }); }
  // the stretch rebuilt slice by slice: each slot plays its (other) slice from its start, as long as the slot – with 5-ms fades
  const at = new Int32Array(N); for (let s = 0; s < sl.length; s++) for (let i = sl[s][0]; i < sl[s][1]; i++) at[i] = s;
  return (i) => {
    const s = at[i], [a, b] = sl[s], k = i - a, src = sl[ord[s]], n = b - a, X = Math.min(Math.round(0.003 * SR), Math.floor(n / 4));
    const g = X ? Math.min(1, k / X, (n - 1 - k) / X) : 1;
    if (!keep[s]) { const y = get(r0 + i); return [y[0] * (1 - g), y[1] * (1 - g)]; }   // (out with a 3-ms fade, back in at its end)
    const f = src[0] + k, x = f < src[1] || ord[s] === s ? get(r0 + f) : [0, 0];
    return ord[s] === s ? x : [x[0] * g, x[1] * g];
  };
}
// the edit: every Schicht of the loop (its dry audio and its baked one), one step; refused while the loop plays its notes
// anew (Wuchs – it would not be heard: the Abdruck is what changes) or is still being caught
function hxRegionEdit(L, a, b, op, v) {
  if (!L || L.bew || !(b > a)) return false;
  if (hxWAktiv(L)) { toast('Diese Schleife spielt ihre Noten neu (Wuchs) – Abschnitte lassen sich nur an der Aufnahme bearbeiten. Zuerst „Erstarren“ oder Noten wie gespielt.', 5000); return false; }
  const sch = hxBandReady(L); if (!sch) return false;
  if (sch.some((S) => !hxMemOk(2 * S.n))) return false;
  const before = hxGeo(L), fl0 = hxBandFl(L), sw = hxNextSeam(L), u = hxBandU(L).map((p) => (p - a) / (b - a)).filter((p) => p >= 0 && p < 1);
  const done = [];
  for (const S of sch) {
    const [r0, r1] = hxRxFrames(S, a, b); if (r1 - r0 < 64) continue;
    const ed = (ch) => hxRxApply(ch, r0, r1, hxRxOp(ch, r0, r1, op, v, u));
    const aud = ed(S.aud), bak = S.bak ? ed(S.bak) : null, X = S.X || Math.round(0.01 * SR), g = { pre: S.pre, len: S.len, X, zo: S.zo || 0 };
    const c = Object.assign({}, S.cut, { pre: S.pre, len: S.len, n: S.n, aus: S.aus ? Object.assign({}, S.aus) : null, stale: true });
    done.push([S.key, S.aud, aud, S.bak, bak]);
    hxSchSwap(S, c, { aud, bak, f: sw.f, join: 'xf', X, rho: hxRho(bak && S.chain && !L.folgt ? bak : aud, S.n, S.pre, S.len, X), zo: S.zo || 0, kc: hxSeamOf(g, aud), kcB: bak ? hxSeamOf(g, bak) : null, dr: S.dr });
  }
  if (!done.length) { toast('Der Abschnitt ist zu kurz.'); return false; }
  // a trimmed loop: its whole keeps the edit too (the same frames of the same audio)
  if (L.tr0) L.tr0 = Object.assign({}, L.tr0, { sch: L.tr0.sch.map((s) => { const d = done.find((x) => x[0] === s.key && x[1] === s.aud); return d ? Object.assign({}, s, { aud: d[2], bak: s.bak === d[3] ? d[4] : s.bak }) : s; }) });
  const lab = { band: 'Band ' + (HX_SP.find((x) => Math.abs(x[0] - v) < 1e-6) || [0, '×' + v])[1], rev: 'rückwärts', weg: 'Weglassen ' + Math.round(v * 100) + ' %', tausch: 'Tauschen ' + Math.round(v * 100) + ' %', gain: v === 0 ? 'stumm' : (v > 1 ? 'lauter ' : 'leiser ') + Math.round(Math.abs(20 * Math.log10(v))) + ' dB' }[op];
  hxBandStep(L, 'Abschnitt ' + hxRxName(L, a, b) + ' ' + lab, before, fl0);
  hxSay(hxName(L) + ': Abschnitt ' + lab); hxSaveLoop(L); hxCardDirty();
  return true;
}
// a stretch's name: its beats on a Takt („Takt 1–2“, „Schlag 3–5“), else its seconds
function hxRxName(L, a, b) {
  if (!hxTakt(L)) { const T = hxLen(L); return dec((a * T).toFixed(1)) + '–' + dec((b * T).toFixed(1)) + ' s'; }
  const B = L.d.beats, bpb = L.bpb || 4, x = Math.round(a * B), y = Math.round(b * B);
  return x % bpb === 0 && y % bpb === 0 ? 'Takt ' + (x / bpb + 1) + (y - x > bpb ? '–' + y / bpb : '') : 'Schlag ' + (x + 1) + '–' + y;
}
