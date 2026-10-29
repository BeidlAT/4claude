// ---- (owner, 28.10.2026: „weitere bearbeitungsoptionen … gerne kann das myzel thema fortgeführt werden und in seiner
// klangästhetik ausdruck finden“) Verwandeln and Färben – a chosen stretch grown over, written into the audio as the other
// stretch tools are (hxRegionEdit: every Schicht, dry and baked alike, one step, ↶ back). Each one a processor
// (ch, r0, N, R) → [left, right] of the stretch's N frames, read from the chunk list ch at r0, R the edit's own random
// (the same in every Schicht and in the Vorhören's quick version). The loudness stays the stretch's own (RMS), never
// more than +9 dB (Licht, the body gone, stays quieter).
//   Nebel     – the stretch dissolves into a hall of its own (a feedback delay network: eight lines, Householder, damped)
//   Sporen    – it scatters into grains (50–150 ms), strewn over the stretch, a few cents apart, wide
//   Keimen    – its beginning sprouts: repeated, quicker and quicker (⅛, 1/16, 1/32, 1/64 of the stretch)
//   Wurzel    – an octave down, its length kept (grains read at half speed, overlapped)
//   Krone     – an octave up, its length kept
//   Erde      – dark: a low-pass at 650 Hz
//   Licht     – airy: a high-pass at 900 Hz (4th order)
//   Welken    – it withers: darker and quieter to its end
//   Sprießen  – it sprouts: from silence and dark, opening to its end ----
const HX_RV_NAME = { nebel: 'Nebel', sporen: 'Sporen', keimen: 'Keimen', wurzel: 'Wurzel', krone: 'Krone', erde: 'Erde', licht: 'Licht', welken: 'Welken', spriessen: 'Sprießen' };
// the stretch read plainly (frame i of it)
function hxRvIn(ch, r0, N) {
  const l = new Float32Array(N), r = new Float32Array(N);
  for (let i = 0; i < N;) { const f = r0 + i, c = ch[Math.floor(f / HX_CH)], j = f % HX_CH, m = Math.min(N - i, HX_CH - j); if (c && f >= 0) { l.set(c[0].subarray(j, j + m), i); r.set(c[1].subarray(j, j + m), i); } i += m; }
  return [l, r];
}
const hxRvRms = (l, r) => { let s = 0; for (let i = 0; i < l.length; i++) s += l[i] * l[i] + r[i] * r[i]; return Math.sqrt(s / Math.max(1, 2 * l.length)); };
// its loudness as the stretch's own (at most +9 dB – a near-silent result stays quiet)
function hxRvLevel(src, out) {
  const a = hxRvRms(src[0], src[1]), b = hxRvRms(out[0], out[1]); if (!(a > 1e-7) || !(b > 1e-9)) return out;
  const g = Math.min(2.8, a / b); for (const c of out) for (let i = 0; i < c.length; i++) c[i] *= g;
  return out;
}
// a biquad (RBJ), its cutoff per 32 frames from fr(x) (x: 0 … 1 through the stretch) – direct form I, per channel
function hxRvBq(c, type, fr, Q) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const N = c.length, set = (f) => {
    const w = 2 * Math.PI * clamp(f, 10, 0.45 * SR) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al;
    if (type === 'lp') { b0 = (1 - cs) / 2 / a0; b1 = (1 - cs) / a0; b2 = b0; } else { b0 = (1 + cs) / 2 / a0; b1 = -(1 + cs) / a0; b2 = b0; }
    a1 = (-2 * cs) / a0; a2 = (1 - al) / a0;
  };
  for (let i = 0; i < N; i++) {
    if ((i & 31) === 0) set(fr(i / Math.max(1, N - 1)));
    const x = c[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; c[i] = y;
  }
}
// a half-sample read: a 32-tap windowed sinc (Kaiser, β 9) at the fraction ½, made once
const HX_RV_K = (() => { const T = 16, k = new Float32Array(2 * T), I0 = (x) => { let a = 1, t = 1; for (let j = 1; j < 40; j++) { t *= (x / (2 * j)) * (x / (2 * j)); a += t; } return a; }; let s = 0;
  for (let j = 0; j < 2 * T; j++) { const x = j - T + 0.5, u = x / T; k[j] = (Math.sin(Math.PI * x) / (Math.PI * x)) * (I0(9 * Math.sqrt(Math.max(0, 1 - u * u))) / I0(9)); s += k[j]; }
  for (let j = 0; j < 2 * T; j++) k[j] /= s; return k; })();
// any other fraction (Tonhöhe, Verstimmen): the same sinc in 512 phases, the two nearest blended
const HX_RV_PP = (() => { const T = 16, P = 512, k = new Float32Array((P + 1) * 2 * T), I0 = (x) => { let a = 1, t = 1; for (let j = 1; j < 40; j++) { t *= (x / (2 * j)) * (x / (2 * j)); a += t; } return a; };
  for (let ph = 0; ph <= P; ph++) { let s = 0; for (let j = 0; j < 2 * T; j++) { const x = j - T + 1 - ph / P, u = x / T, v = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * (Math.abs(u) < 1 ? I0(9 * Math.sqrt(1 - u * u)) / I0(9) : 0); k[ph * 2 * T + j] = v; s += v; } for (let j = 0; j < 2 * T; j++) k[ph * 2 * T + j] /= s; }
  return k; })();
function hxRvAt(c, p) {
  const i = Math.floor(p), fr = p - i, n = c.length; if (fr === 0) return i >= 0 && i < n ? c[i] : 0;
  let s = 0;
  if (fr === 0.5) { for (let j = 0; j < 32; j++) { const q = i - 15 + j; if (q >= 0 && q < n) s += HX_RV_K[j] * c[q]; } return s; }
  const ph = fr * 512, p0 = Math.floor(ph), w = ph - p0, o0 = p0 * 32, o1 = o0 + 32;
  for (let j = 0; j < 32; j++) { const q = i - 15 + j; if (q >= 0 && q < n) s += (HX_RV_PP[o0 + j] + w * (HX_RV_PP[o1 + j] - HX_RV_PP[o0 + j])) * c[q]; }
  return s;
}
// grains of the stretch, Hann-windowed, overlapped four times, read at rate rt (through the sinc; faster than about a
// semitone: low-passed below the new Nyquist first – no folding) – the length kept, the pitch moved by rt
function hxRvShift(src, N, rt, R) {
  const G = Math.round(0.085 * SR) & ~1, H = G >> 2, l = new Float32Array(N), r = new Float32Array(N);
  let x = src;
  if (rt > 1.04) { x = [src[0].slice(), src[1].slice()]; for (const c of x) for (let k = 0; k < 4; k++) hxRvBq(c, 'lp', () => (0.46 * SR) / rt, [0.51, 0.6, 0.9, 2.56][k]); }   // (8th order Butterworth below the new Nyquist – no folding)
  for (let t = -G; t < N; t += H) {
    const c0 = t + G / 2 + Math.round((R() - 0.5) * H * 0.5);   // (a little jitter: no comb of equal grains)
    for (let j = 0; j < G; j++) {
      const d = t + j; if (d < 0 || d >= N) continue;
      const w = 0.25 - 0.25 * Math.cos((2 * Math.PI * j) / G), p = c0 + (j - G / 2) * rt;   // (29.10.2026: beyond the stretch it reads silence – clamped, a grain at Krone's end repeated the last sample: a thump of DC)
      l[d] += w * hxRvAt(x[0], p); r[d] += w * hxRvAt(x[1], p);
    }
  }
  return [l, r];
}
// a read at any place near rate 1 (Sporen's few cents): 4-point Hermite
const hxRvHm = (c, p) => { const i = Math.floor(p), f = p - i, a = c[i - 1] || 0, b = c[i] || 0, d = c[i + 1] || 0, e = c[i + 2] || 0, c1 = 0.5 * (d - a), c2 = a - 2.5 * b + 2 * d - 0.5 * e, c3 = 0.5 * (e - a) + 1.5 * (b - d); return ((c3 * f + c2) * f + c1) * f + b; };
// Tonhöhe and Verstimmen exactly: a phase vocoder stretches the stretch by rt (STFT 2048, hop 256 in, Hann, the
// phases locked to their peaks – Laroche & Dolson's identity locking: no phasiness between a partial's bins), then it
// is read back at rate rt (the sinc; faster: low-passed below the new Nyquist first) – the length kept, every partial
// moved by rt
function hxRvPv(x, rt) {
  const W = 2048, Ha = 256, N = x.length, B = W / 2 + 1, out = new Float32Array(Math.ceil(N * rt) + 2 * W), ws = new Float32Array(out.length), win = new Float32Array(W);
  for (let i = 0; i < W; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / W);
  const re = new Float64Array(W), im = new Float64Array(W), mag = new Float64Array(B), ph = new Float64Array(B), phA = new Float64Array(B), phS = new Float64Array(B), nx = new Float64Array(B), om = new Float64Array(B), near = new Int32Array(B);
  for (let k = 0; k < B; k++) om[k] = (2 * Math.PI * k * Ha) / W;
  const frames = Math.ceil(N / Ha) + 8, at = (f) => Math.round(f * Ha * rt);   // (analysis every 256 frames – 29.10.2026: 8× overlap, so even at +12 (hop 512) the frames overlap 4×: what keeps no steady phase, noise, added by power and rippled 1–2 dB at 2×; each synthesis frame at its whole place, its hop 256·rt ± ½)
  for (let f = 0; f < frames; f++) {
    const ta = f * Ha - W / 2, dS = at(f) - at(f - 1);
    for (let i = 0; i < W; i++) { const q = ta + i; re[i] = q >= 0 && q < N ? x[q] * win[i] : 0; im[i] = 0; }
    hxFFT(re, im);
    for (let k = 0; k < B; k++) { mag[k] = Math.hypot(re[k], im[k]); ph[k] = Math.atan2(im[k], re[k]); }
    if (f === 0) { for (let k = 0; k < B; k++) nx[k] = ph[k]; }
    else {
      // the peaks: each bin belongs to the peak of its region (the valleys between peaks the borders)
      const pk = []; for (let k = 1; k < B - 1; k++) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1]) pk.push(k);
      if (!pk.length) pk.push(1);
      let j = 0; for (let k = 0; k < B; k++) { while (j + 1 < pk.length) { let lo = pk[j], v = mag[lo]; for (let q = pk[j]; q <= pk[j + 1]; q++) if (mag[q] < v) { v = mag[q]; lo = q; } if (k > lo) j++; else break; } near[k] = pk[j]; }
      for (const p of pk) { let d = ph[p] - phA[p] - om[p]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); nx[p] = phS[p] + ((om[p] + d) * dS) / Ha; }
      for (let k = 0; k < B; k++) { const p = near[k]; if (p !== k) nx[k] = nx[p] + ph[k] - ph[p]; }
    }
    for (let k = 0; k < B; k++) { phA[k] = ph[k]; phS[k] = nx[k]; re[k] = mag[k] * Math.cos(nx[k]); im[k] = -mag[k] * Math.sin(nx[k]); }   // (conjugated: the inverse by the forward transform)
    im[0] = 0; im[W / 2] = 0;
    for (let k = 1; k < W / 2; k++) { re[W - k] = re[k]; im[W - k] = -im[k]; }
    hxFFT(re, im);
    const to = at(f) - W / 2;
    for (let i = 0; i < W; i++) { const q = to + i; if (q >= 0 && q < out.length) { out[q] += (re[i] / W) * win[i]; ws[q] += win[i] * win[i]; } }
  }
  // each sample divided by the Hann² that landed on it: the synthesis hop is 512·rt, so a fixed ⅔ (right only at 4×
  // overlap) left a ripple at the frame rate – ≈ 6 dB at +12 (owner, 29.10.2026: „die Korrektur macht absolut Sinn“);
  // a floor at a tenth of the full sum keeps the open ends from blowing up
  let mx = 0; for (let q = 0; q < ws.length; q++) if (ws[q] > mx) mx = ws[q];
  const fl = 0.1 * mx; for (let q = 0; q < out.length; q++) out[q] /= Math.max(ws[q], fl);
  return out;
}
function hxRvPitch(src, N, rt) {
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let c = 0; c < 2; c++) {
    let y = hxRvPv(src[c], rt);
    if (rt > 1.04) { y = y.slice(); for (let k = 0; k < 4; k++) hxRvBq(y, 'lp', () => (0.46 * SR) / rt, [0.51, 0.6, 0.9, 2.56][k]); }
    for (let i = 0; i < N; i++) out[c][i] = hxRvAt(y, i * rt);
  }
  return out;
}
// a hall of its own: eight delay lines (prime lengths, 29–83 ms), a Householder matrix, each line damped (one pole) to
// T60 ≈ 3 s; left and right read from different lines; the wet fades out over the stretch's last 80 ms (the tape after
// it comes back clean)
function hxRvNebel(ch, r0, N, R) {
  const src = hxRvIn(ch, r0, N), [l0, r0c] = src, M = [1427, 1601, 1871, 2053, 2357, 2671, 3089, 3659].map((x) => Math.round((x * SR) / 44100)), K = M.length;
  const buf = M.map((m) => new Float32Array(m)), pos = new Int32Array(K), lp = new Float32Array(K), T60 = 3, damp = 0.32;
  const g = M.map((m) => Math.pow(10, (-3 * m) / (T60 * SR))), ol = new Float32Array(N), or = new Float32Array(N), y = new Float32Array(K);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = 0; k < K; k++) { const v = buf[k][pos[k]]; lp[k] += (1 - damp) * (v - lp[k]); y[k] = lp[k] * g[k]; s += y[k]; }
    s *= 2 / K;
    const xi = 0.5 * (l0[i] + r0c[i]), xd = 0.5 * (l0[i] - r0c[i]);
    for (let k = 0; k < K; k++) { buf[k][pos[k]] = y[k] - s + (k & 1 ? xi + 0.4 * xd : xi - 0.4 * xd) * 0.35; if (++pos[k] >= M[k]) pos[k] = 0; }
    ol[i] = y[0] + y[2] + y[4] - y[6]; or[i] = y[1] + y[3] - y[5] + y[7];
  }
  hxRvLevel(src, [ol, or]);
  const F = Math.min(Math.round(0.08 * SR), N >> 2), out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < N; i++) { const e = i >= N - F ? (N - i) / F : 1; out[0][i] = 0.3 * l0[i] + 0.85 * e * ol[i]; out[1][i] = 0.3 * r0c[i] + 0.85 * e * or[i]; }
  return hxRvLevel(src, out);
}
const HX_RV = {
  nebel: hxRvNebel,
  sporen(ch, r0, N, R) {
    const src = hxRvIn(ch, r0, N), l = new Float32Array(N), r = new Float32Array(N), n = Math.max(4, Math.round((N / SR) * 32));
    for (let k = 0; k < n; k++) {
      const G = Math.min(N, Math.round((0.05 + 0.1 * R()) * SR)), sp = Math.floor(R() * Math.max(1, N - G)), dp = Math.floor(R() * Math.max(1, N - G));
      const rt = Math.pow(2, ((R() - 0.5) * 20) / 1200), pn = (R() - 0.5) * 1.4, gl = Math.cos((pn + 1) * Math.PI / 4), gr = Math.sin((pn + 1) * Math.PI / 4);
      for (let j = 0; j < G; j++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / G), p = Math.min(N - 1, sp + j * rt), m = 0.5 * (hxRvHm(src[0], p) + hxRvHm(src[1], p)) * w; l[dp + j] += m * gl; r[dp + j] += m * gr; }
    }
    const out = hxRvLevel(src, [l, r]);
    for (let i = 0; i < N; i++) { out[0][i] = 0.8 * out[0][i] + 0.2 * src[0][i]; out[1][i] = 0.8 * out[1][i] + 0.2 * src[1][i]; }   // (a trace of its shape stays)
    return hxRvLevel(src, out);
  },
  keimen(ch, r0, N) {
    const get = hxRxGet(ch), l = new Float32Array(N), r = new Float32Array(N), parts = [[8, 2], [16, 4], [32, 8], [64, 16]];
    let d = 0;
    parts.forEach(([div, rep], pi) => {
      const n = Math.max(32, Math.floor(N / div)), X = Math.min(Math.round(0.003 * SR), n >> 2), gn = 0.8 + 0.2 * (pi / 3);   // (it grows a little as it quickens)
      for (let q = 0; q < rep && d < N; q++) for (let j = 0; j < n && d < N; j++, d++) { const w = X ? Math.min(1, j / X, (n - 1 - j) / X) : 1, s = get(r0 + j); l[d] = s[0] * w * gn; r[d] = s[1] * w * gn; }
    });
    for (; d < N; d++) { const s = get(r0 + d); l[d] = s[0]; r[d] = s[1]; }
    return [l, r];
  },
  wurzel(ch, r0, N, R) { const s = hxRvIn(ch, r0, N); return hxRvLevel(s, hxRvShift(s, N, 0.5, R)); },
  krone(ch, r0, N, R) { const s = hxRvIn(ch, r0, N); return hxRvLevel(s, hxRvShift(s, N, 2, R)); },
  pitch(ch, r0, N, R, v) { const s = hxRvIn(ch, r0, N); return hxRvLevel(s, hxRvPitch(s, N, Math.pow(2, v / 12))); },   // (Direkt: Tonhöhe in semitones, Verstimmen in cents/100)
  erde(ch, r0, N) { const s = hxRvIn(ch, r0, N), o = [s[0].slice(), s[1].slice()]; for (const c of o) { hxRvBq(c, 'lp', () => 650, 0.8); hxRvBq(c, 'lp', () => 650, 0.6); } return hxRvLevel(s, o); },
  licht(ch, r0, N) { const s = hxRvIn(ch, r0, N), o = [s[0].slice(), s[1].slice()]; for (const c of o) { hxRvBq(c, 'hp', () => 900, 0.54); hxRvBq(c, 'hp', () => 900, 1.31); } return hxRvLevel(s, o); },   // (4th order Butterworth)
  welken(ch, r0, N) { const o = hxRvIn(ch, r0, N); for (const c of o) { hxRvBq(c, 'lp', (x) => 16000 * Math.pow(260 / 16000, x), 0.7); for (let i = 0; i < c.length; i++) c[i] *= Math.pow(1 - i / c.length, 1.6); } return o; },
  spriessen(ch, r0, N) { const o = hxRvIn(ch, r0, N); for (const c of o) { hxRvBq(c, 'lp', (x) => 260 * Math.pow(16000 / 260, x), 0.7); for (let i = 0; i < c.length; i++) c[i] *= Math.pow(i / c.length, 1.6); } return o; },
};
// the Vorhören at once (owner, 28.10.2026: „die änderungen bei der auswahl gleich on the fly hörbar“): the pass it plays
// gets the same edit straight away (the same processor, the same random) – the exact render takes over a moment later,
// crossfaded; not playing yet: it starts at the stretch, which repeats. A loop whose tape runs faster or slower or is
// sliced: its pass is not the Schicht's frames one to one – the render alone (a moment later).
function hxPvEdit(L, a, b, mk, full, wk) {   // (full: the whole pass handed over – Tauschen and Einsetzen read outside the stretch)
  if (!HXE.ed || HXE.ed.hidden || hxEdL() !== L || !A.ctx) return;
  hxEdTouch(L);   // (the render made before the edit is not this one any more)
  // (29.10.2026) worked out in a Worker (wk: the edit – abschnitt-werk.js), one after another: a quick second edit
  // finds the first one in the pass
  if (wk) { HXE.pvQ = (HXE.pvQ || Promise.resolve()).then(() => hxPvEditW(L, a, b, wk)).catch(() => {}); return; }
  const P = HXE.pv, buf = P && P.key === L.key ? P.buf : HXE.rw && HXE.rw.buf ? HXE.rw.buf : null;
  if (!buf || (L.sp || 1) !== 1 || hxBandSliceOf(L)) { if (!HXE.pv) hxPvPlay(a); return; }
  const n = buf.length, r0 = Math.round(a * n), r1 = Math.min(n, Math.round(b * n)); if (r1 - r0 < 64) { if (!HXE.pv) hxPvPlay(a); return; }
  if (full) {
    const ch = []; for (let k = 0; k * HX_CH < n; k++) { const x = [new Float32Array(HX_CH), new Float32Array(HX_CH)]; x[0].set(buf.getChannelData(0).subarray(k * HX_CH, Math.min(n, (k + 1) * HX_CH))); x[1].set(buf.getChannelData(1).subarray(k * HX_CH, Math.min(n, (k + 1) * HX_CH))); ch.push(x); }
    const dst = full(ch, n), nb = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: buf.sampleRate }), ol = new Float32Array(n), or = new Float32Array(n);
    for (let k = 0; k < dst.length; k++) { const m = Math.min(HX_CH, n - k * HX_CH); ol.set(dst[k][0].subarray(0, m), k * HX_CH); or.set(dst[k][1].subarray(0, m), k * HX_CH); }
    nb.copyToChannel(ol, 0); nb.copyToChannel(or, 1); hxPvSrc(L, nb, P ? hxPvPos() : a); HXE.pvWant = false; return;
  }
  // (only the stretch is worked on: a chunk list of its frames alone – the whole pass is not copied twice)
  const cl = buf.getChannelData(0), cr = buf.getChannelData(1), N = r1 - r0, ch = [];
  for (let k = 0; k * HX_CH < N; k++) { const x = [new Float32Array(HX_CH), new Float32Array(HX_CH)], q = r0 + k * HX_CH, e = Math.min(r1, q + HX_CH); x[0].set(cl.subarray(q, e)); x[1].set(cr.subarray(q, e)); ch.push(x); }
  const dst = hxRxApply(ch, 0, N, mk(ch, 0, N)), nb = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: buf.sampleRate });
  const ol = cl.slice(), or = cr.slice();
  for (let k = 0; k < dst.length; k++) { const m = Math.min(HX_CH, N - k * HX_CH); ol.set(dst[k][0].subarray(0, m), r0 + k * HX_CH); or.set(dst[k][1].subarray(0, m), r0 + k * HX_CH); }
  nb.copyToChannel(ol, 0); nb.copyToChannel(or, 1);
  hxPvSrc(L, nb, P ? hxPvPos() : a);
  HXE.pvWant = false;
}
const hxPvBufOf = (L) => { const P = HXE.pv; return P && P.key === L.key ? P.buf : HXE.rw && HXE.rw.buf ? HXE.rw.buf : null; };
async function hxPvEditW(L, a, b, wk) {
  if (!HXE.ed || HXE.ed.hidden || hxEdL() !== L || !A.ctx) return;
  const buf = hxPvBufOf(L);
  if (!buf || (L.sp || 1) !== 1 || hxBandSliceOf(L)) { if (!HXE.pv) hxPvPlay(a); return; }
  const n = buf.length, r0 = Math.round(a * n), r1 = Math.min(n, Math.round(b * n)); if (r1 - r0 < 64) { if (!HXE.pv) hxPvPlay(a); return; }
  const cl = buf.getChannelData(0), cr = buf.getChannelData(1), N = r1 - r0, ch = [];
  for (let k = 0; k * HX_CH < N; k++) { const x = [new Float32Array(HX_CH), new Float32Array(HX_CH)], q = r0 + k * HX_CH, e = Math.min(r1, q + HX_CH); x[0].set(cl.subarray(q, e)); x[1].set(cr.subarray(q, e)); ch.push(x); }
  const res = await hxRw(ch, 0, N, wk.op, wk.v, wk.u, wk.seed);
  // (the editor closed, another loop, or the exact render took over meanwhile – it carries the edit already)
  if (!HXE.ed || HXE.ed.hidden || hxEdL() !== L || !A.ctx || hxPvBufOf(L) !== buf) return;
  const nb = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: buf.sampleRate }), ol = cl.slice(), or = cr.slice();
  ol.set(res[0], r0); or.set(res[1], r0);
  nb.copyToChannel(ol, 0); nb.copyToChannel(or, 1);
  hxPvSrc(L, nb, HXE.pv ? hxPvPos() : a);
  HXE.pvWant = false;
}
