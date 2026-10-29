// ---- the Hexenring's Worker (off the main thread; the functions copied by toString – no outside closures): Abrieb nach
// Moder (STFT) and the pitch of a voice (YIN) ----
function hxModerPass(L, R, age, rate, seed, sr) {
  const n = L.length, N = 1024, H = 256, half = N / 2, w = new Float64Array(N);
  for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const fft = (re, im, inv) => {
    for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= N; len <<= 1) { const a = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
    if (inv) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  };
  const hash = (a, b, c) => { let h = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b) ^ Math.imul(c + 7, 0xc2b2ae35)) | 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // the age: the wear x in [0, 1); the cutoff falls 12 kHz → 300 Hz with it. Above it the partials crumble: per frame
  // (5 ms apart) and per third of an octave a grain is kept with a chance p – sparser with age – its bins at their own
  // magnitude × 1/√p (the energy stays), each with a random phase: short bursts at the partials' own pitches, crackle;
  // a frame without a grain is silent there. Half an octave above the cutoff it fades from intact to crumbled. Below
  // 300 Hz a low shelf warms, up to +4 dB
  const x = 1 - Math.exp(-rate * age), fc = 12000 * Math.pow(300 / 12000, x), p = Math.max(0.05, 0.35 - 0.3 * x), boost = 1 + 0.585 * x, kc = (1 - 0.3 * x) / Math.sqrt(p);
  const out = [new Float32Array(n), new Float32Array(n)], re = new Float64Array(N), im = new Float64Array(N), wsum = new Float64Array(n);
  // (29.10.2026) a bin with a random phase adds to its neighbours' frames by power, not by amplitude: after the division by
  // Σw² (right for what keeps its phase) it stood at mean(w²)/Σw² = ¼ of its energy (−6 dB) – its amplitude × √(Σw²/mean(w²))
  // = 2 gives it back; intact and crumbled blend by power too (they are unrelated)
  const HXMD_RND = Math.sqrt(N / H);   // (Hann: Σw² = (N/H)·⅜, mean(w²) = ⅜)
  const frames = Math.ceil(n / H);
  for (let c = 0; c < 2; c++) {
    const X = c ? R : L, O = out[c];
    for (let f = 0; f < frames; f++) {
      const s = f * H;
      for (let i = 0; i < N; i++) { const j = (s + i) % n; re[i] = X[j] * w[i]; im[i] = 0; }
      fft(re, im, false);
      for (let b = 1; b < half; b++) {
        const hz = (b * sr) / N, g = hz < 300 ? boost : hz < 450 ? 1 + ((boost - 1) * (450 - hz)) / 150 : 1;
        if (hz > fc) {
          const sh = Math.min(1, Math.log2(hz / fc) * 2), band = Math.floor(3 * Math.log2(hz / fc)), keep = hash(f, band, 1) < p;   // (the same grain decision for both sides: the crackle stands where it falls)
          const mag = keep ? Math.hypot(re[b], im[b]) * kc : 0, ph = 2 * Math.PI * hash(f, b, 9 + c);
          const ci = Math.cos(0.5 * Math.PI * sh), cr = Math.sin(0.5 * Math.PI * sh) * HXMD_RND, ir = re[b] * ci, ii = im[b] * ci;
          re[b] = (ir + cr * mag * Math.cos(ph)) * g; im[b] = (ii + cr * mag * Math.sin(ph)) * g;
        } else { re[b] *= g; im[b] *= g; }
        re[N - b] = re[b]; im[N - b] = -im[b];
      }
      im[0] = 0; re[half] = 0; im[half] = 0;
      fft(re, im, true);
      for (let i = 0; i < N; i++) { const j = (s + i) % n; O[j] += re[i] * w[i]; if (c === 0) wsum[j] += w[i] * w[i]; }
    }
  }
  for (let c = 0; c < 2; c++) { const O = out[c]; for (let j = 0; j < n; j++) O[j] = wsum[j] > 1e-9 ? O[j] / wsum[j] : 0; }
  return out;
}
// YIN (de Cheveigné & Kawahara 2002): per hop the period with the cumulative mean normalised difference under a threshold
// (the first dip below 0.12, refined parabolically), its aperiodicity and level – mono, at the given rate
function hxYin(x, sr, fmin, fmax, hop) {
  hop = hop || Math.round(sr * 0.005);
  const tmin = Math.max(2, Math.floor(sr / fmax)), tmax = Math.min(Math.floor(sr / fmin), 4096), W = Math.max(tmax + 2, Math.round(sr * 0.03)), n = x.length;
  const out = { f: [], ap: [], rms: [], c: [], hop, sr }, d = new Float64Array(tmax + 2);
  for (let s = 0; s + W + tmax < n; s += hop) {
    let e = 0; for (let i = 0; i < W; i++) e += x[s + i] * x[s + i];
    out.rms.push(Math.sqrt(e / W));
    d[0] = 1; let run = 0, best = -1, bv = 1;
    for (let t = 1; t <= tmax; t++) {
      let q = 0; for (let i = 0; i < W; i++) { const v = x[s + i] - x[s + i + t]; q += v * v; }
      run += q; d[t] = run > 0 ? (q * t) / run : 1;
    }
    for (let t = tmin; t <= tmax; t++) { if (d[t] < 0.12) { while (t + 1 <= tmax && d[t + 1] < d[t]) t++; best = t; bv = d[t]; break; } }
    if (best < 0) { for (let t = tmin; t <= tmax; t++) if (d[t] < bv) { bv = d[t]; best = t; } }
    // a strong upper partial (a formant on the third harmonic, say) can dip below the threshold at a fraction of the
    // period: a dip at twice, three or four times the lag that is much deeper is the period
    if (best > 0 && bv > 0.05) for (let k = 2; k <= 4 && k * best <= tmax; k++) {
      let m = -1, mv = 1; for (let t = Math.max(tmin, Math.floor(k * best * 0.97)); t <= Math.min(tmax, Math.ceil(k * best * 1.03)); t++) if (d[t] < mv) { mv = d[t]; m = t; }
      if (m > 0 && mv < 0.35 * bv) { best = m; bv = mv; break; }
    }
    let T = best;
    if (best > tmin && best < tmax) { const a = d[best - 1], b = d[best], c = d[best + 1], den = a - 2 * b + c; if (Math.abs(den) > 1e-12) T = best + 0.5 * (a - c) / den; }
    out.f.push(T > 0 ? sr / T : 0); out.ap.push(bv);
    // every other dip that is nearly periodic (the note's context decides between them: hxGesangSeg)
    const cs = [];
    for (let t = tmin + 1; t < tmax; t++) if (d[t] < 0.4 && d[t] <= d[t - 1] && d[t] < d[t + 1]) { const a = d[t - 1], b = d[t], c = d[t + 1], den = a - 2 * b + c; cs.push([sr / (Math.abs(den) > 1e-12 ? t + 0.5 * (a - c) / den : t), b]); }
    cs.sort((p, q) => p[1] - q[1]); out.c.push(cs.slice(0, 8));
  }
  return out;
}
const HXWK = { w: null, seq: 0, wait: new Map(), broken: false };
const HXWK_FN = { moder: (o) => { const r = hxModerPass(o.L, o.R, o.age, o.rate, o.seed, o.sr); return { L: r[0], R: r[1] }; }, yin: (o) => hxYin(o.x, o.sr, o.fmin, o.fmax, o.hop) };
function hxWk(type, o) {
  const run = () => HXWK_FN[type](o);
  if (!HXWK.broken && !HXWK.w) {
    try {
      const src = [hxModerPass, hxYin].map((f) => f.toString()).join('\n') + '\nvar F={moder:function(o){var r=hxModerPass(o.L,o.R,o.age,o.rate,o.seed,o.sr);return {L:r[0],R:r[1]};},yin:function(o){return hxYin(o.x,o.sr,o.fmin,o.fmax,o.hop);}};' +
        'onmessage=function(e){var d=e.data,r=null;try{r=F[d.type](d.o);}catch(x){r=null;}var t=[];if(r&&r.L)t=[r.L.buffer,r.R.buffer];postMessage({id:d.id,r:r},t);};';
      HXWK.w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      HXWK.w.onmessage = (e) => { const j = HXWK.wait.get(e.data.id); if (j) { HXWK.wait.delete(e.data.id); j.resolve(e.data.r); } };
      HXWK.w.onerror = () => { HXWK.broken = true; HXWK.w = null; for (const j of HXWK.wait.values()) j.resolve(j.run()); HXWK.wait.clear(); };
    } catch (e) { HXWK.broken = true; HXWK.w = null; }
  }
  if (!HXWK.w) return Promise.resolve(run());
  return new Promise((resolve) => { const id = ++HXWK.seq; HXWK.wait.set(id, { resolve, run }); HXWK.w.postMessage({ id, type, o }); });
}

