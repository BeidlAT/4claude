  // ---- Harmonizer (owner, 29.10.2026: „Harmonizer als Audio-Effekt“): up to three voices above or below what comes in –
  // in the key (Tonart: steps of the scale, from the pitch it hears) or in semitones. A phase vocoder (STFT 2048, hop 512
  // – 4× overlap, Hann² summing to 1.5): one analysis of both sides at once (L real, R imaginary), every voice's spectrum
  // shifted from it and summed into one spectrum per side, one synthesis back – three voices cost what one does.
  //   the shift: each bin's true frequency from its phase advance, moved to the bin r·k, its phase run on at r·ω; phases
  //   locked to their peak (identity phase locking, Laroche–Dolson) – the partials of a sound keep their shape, no
  //   „phasiness“
  //   formant: the spectral envelope (a third-octave smoothing of the log magnitude) kept where it was – a voice moved
  //   up does not turn into a chipmunk (form 0 … 1 how much)
  //   the key: the input's pitch from the autocorrelation (the analysis spectrum's power, transformed back), its nearest
  //   scale degree, the voice that many degrees on; while it hears no clear pitch, a voice keeps its last interval
  //   schimmer: each voice a few cents off (–, +, –) – the voices beat a little, as a choir does; breite: their places
  //   (left, right, middle). Wet only: a return or an Einschub mixes it with the dry sound. ----
  const HM_N = 2048, HM_H = 512, HM_B = HM_N / 2 + 1;
  const HM_TAB = (() => {
    const N = HM_N, rev = new Uint32Array(N), cs = new Float64Array(N / 2), sn = new Float64Array(N / 2), win = new Float64Array(N);
    for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; rev[i] = j; }
    for (let j = 0; j < N / 2; j++) { cs[j] = Math.cos(2 * Math.PI * j / N); sn[j] = Math.sin(2 * Math.PI * j / N); }
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    return { rev, cs, sn, win };
  })();
  function hmFft(re, im, inv) {
    const n = re.length, rv = HM_TAB.rev, cs = HM_TAB.cs, sn = HM_TAB.sn, sg = inv ? 1 : -1;
    for (let i = 1; i < n; i++) { const j = rv[i]; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let L = 2; L <= n; L <<= 1) { const h = L >> 1, st = n / L; for (let i = 0; i < n; i += L) for (let j = 0, q = 0; j < h; j++, q += st) { const u = i + j, v = u + h, cr = cs[q], ci = sg * sn[q], tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; } }
  }
  const hmWrap = (x) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
  class Harmo extends FxBase {
    defaults() { return { v1: 2, v2: 4, v3: 0, modus: 0, form: 0.6, breite: 0.6, schimmer: 0.2 }; }
    constructor(o) {
      super(o);
      const N = HM_N, B = HM_B;
      this.inL = new Float32Array(N); this.inR = new Float32Array(N); this.ip = 0; this.cnt = 0;
      this.outL = new Float64Array(N + HM_H); this.outR = new Float64Array(N + HM_H);
      this.re = new Float64Array(N); this.im = new Float64Array(N);
      // per side: magnitude, phase now and before (analysis), true frequency (radians per hop), the envelope
      this.S = [0, 1].map(() => ({ mag: new Float64Array(B), ph: new Float64Array(B), ph0: new Float64Array(B), om: new Float64Array(B), env: new Float64Array(B), lg: new Float64Array(B + 1) }));
      // per voice and side: the synthesis phases, and the ratio it glides to
      this.V = [0, 1, 2].map(() => ({ r: 1, rT: 1, on: 0, ps: [new Float64Array(B), new Float64Array(B)] }));
      this.yL = [new Float64Array(B), new Float64Array(B)]; this.yR = [new Float64Array(B), new Float64Array(B)];
      this.peak = new Int32Array(B); this.f0 = 0; this.pc = new Float64Array(0); this.tune();
    }
    // the scale's pitch classes (cents within the octave, from the notes the page sends), sorted
    tune() { const pc = this.freqs.map((f) => ((1200 * Math.log2(f / 440)) % 1200 + 1200) % 1200).sort((a, b) => a - b); this.pc = Float64Array.from(pc.filter((c, i) => i === 0 || c - pc[i - 1] > 30)); }
    // a voice's ratio: semitones, or steps of the scale from the pitch heard (the input's own deviation kept)
    ratio(k) {
      const p = this.p, st = Math.round(p['v' + (k + 1)]);
      if (!st) return 0;
      if (!(p.modus > 0.5) || this.pc.length < 2) return Math.pow(2, st / 12);   // (Halbtöne)
      if (!this.f0) return -1;   // (no pitch heard: keep the last)
      const c = 1200 * Math.log2(this.f0 / 440), oc = Math.floor(c / 1200), w = c - 1200 * oc, P = this.pc, n = P.length;
      let bi = 0, bd = 1e9; for (let i = 0; i < n; i++) for (const o of [-1200, 0, 1200]) { const d = Math.abs(w - (P[i] + o)); if (d < bd) { bd = d; bi = i + (o < 0 ? -n : o > 0 ? n : 0); } }
      const deg = (x) => { const q = Math.floor(x / n), i = x - q * n; return 1200 * (oc + q) + P[i]; };
      return Math.pow(2, (deg(bi + st) - deg(bi)) / 1200);
    }
    frame() {
      const N = HM_N, H = HM_H, B = HM_B, M = N - 1, re = this.re, im = this.im, w = HM_TAB.win, p = this.p, iL = this.inL, iR = this.inR, ip = this.ip;
      for (let i = 0; i < N; i++) { const j = (ip + i) & M; re[i] = iL[j] * w[i]; im[i] = iR[j] * w[i]; }
      hmFft(re, im, false);
      // the two sides parted, their magnitudes, phases and true frequencies; the power for the pitch
      const om0 = 2 * Math.PI * H / N;
      for (let k = 0; k < B; k++) {
        const n = (N - k) & M, zr = re[k], zi = im[k], nr = re[n], ni = im[n];
        const sides = [[0.5 * (zr + nr), 0.5 * (zi - ni)], [0.5 * (zi + ni), 0.5 * (nr - zr)]];
        for (let s = 0; s < 2; s++) {
          const S = this.S[s], a = sides[s][0], b = sides[s][1], ph = Math.atan2(b, a);
          S.mag[k] = Math.sqrt(a * a + b * b); S.om[k] = om0 * k + hmWrap(ph - S.ph0[k] - om0 * k); S.ph0[k] = ph; S.ph[k] = ph;
        }
      }
      this.pitch();
      // the envelope (formant): log magnitude smoothed over a third of an octave (at least 3 bins)
      for (const S of this.S) { S.lg[0] = 0; for (let k = 0; k < B; k++) S.lg[k + 1] = S.lg[k] + Math.log(S.mag[k] + 1e-9); for (let k = 0; k < B; k++) { const h = Math.max(1, Math.round(k * 0.116)), a = Math.max(0, k - h), b = Math.min(B, k + h + 1); S.env[k] = (S.lg[b] - S.lg[a]) / (b - a); } }
      // the voices: their ratios (gliding over two hops), placed and slightly apart
      const cents = [-1, 1, -0.5].map((x) => x * 14 * p.schimmer), pans = [-p.breite, p.breite, 0];
      let nv = 0;
      for (let k = 0; k < 3; k++) { const V = this.V[k], r = this.ratio(k); if (r === 0) { V.on = 0; continue; } if (r > 0) V.rT = r * Math.pow(2, cents[k] / 1200); if (!V.on) { V.r = V.rT; V.ps[0].set(this.S[0].ph); V.ps[1].set(this.S[1].ph); } V.on = 1; V.r += 0.5 * (V.rT - V.r); nv++; }
      for (let s = 0; s < 2; s++) { this.yL[s].fill(0); this.yR[s].fill(0); }
      if (nv) {
        const g = 1 / Math.sqrt(nv), fo = p.form, pk = this.peak;
        for (let s = 0; s < 2; s++) {
          const S = this.S[s], mag = S.mag, out = s === 0 ? this.yL : this.yR;
          // the peaks (over two neighbours each side) and each bin's region: up to half way to the next peak
          const L = []; for (let k = 2; k < B - 2; k++) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > mag[k - 2] && mag[k] >= mag[k + 2] && mag[k] > 1e-7) L.push(k);
          if (!L.length) continue;
          for (let k = 0, j = 0; k < B; k++) { while (j < L.length - 1 && k > (L[j] + L[j + 1]) / 2) j++; pk[k] = L[j]; }
          for (let v = 0; v < 3; v++) {
            const V = this.V[v]; if (!V.on) continue;
            const r = V.r, ps = V.ps[s], pan = pans[v], gs = g * Math.SQRT2 * (s === 0 ? Math.cos((pan + 1) * Math.PI / 4) : Math.sin((pan + 1) * Math.PI / 4));
            // every region moves as a whole to where its peak's frequency goes (its lobe keeps its shape); the peak's
            // phase runs on at r times its frequency, every bin keeps its phase to the peak's
            for (const q of L) ps[q] = hmWrap(ps[q] + S.om[q] * r);
            for (let k = 1; k < B - 1; k++) {
              const q = pk[k], t = k + Math.round(q * r - q); if (t < 1 || t >= B - 1) continue;
              const phs = ps[q] + (S.ph[k] - S.ph[q]);
              let m = mag[k] * gs; if (fo > 0) m *= Math.exp(fo * (S.env[t] - S.env[k]));   // (formant: the envelope where the bin lands, not where it came from)
              out[0][t] += m * Math.cos(phs); out[1][t] += m * Math.sin(phs);
            }
          }
        }
      }
      // back as one: Y = L + i·R over the whole circle
      const [lr, li] = this.yL, [rr, ri] = this.yR;
      lr[0] = lr[B - 1] = rr[0] = rr[B - 1] = 0; li[0] = li[B - 1] = ri[0] = ri[B - 1] = 0;
      for (let k = 0; k < B; k++) { re[k] = lr[k] - ri[k]; im[k] = li[k] + rr[k]; }
      for (let k = 1; k < N / 2; k++) { re[N - k] = lr[k] + ri[k]; im[N - k] = rr[k] - li[k]; }
      hmFft(re, im, true);
      const oL = this.outL, oR = this.outR, kk = 1 / (1.5 * N);
      for (let i = 0; i < N; i++) { oL[i] += re[i] * kk * w[i]; oR[i] += im[i] * kk * w[i]; }
    }
    // the pitch heard: the autocorrelation of both sides' power (one more transform), its first strong peak 60 … 1400 Hz
    pitch() {
      const N = HM_N, B = HM_B, re = this.re, im = this.im;
      for (let k = 0; k < B; k++) { const a = this.S[0].mag[k], b = this.S[1].mag[k]; re[k] = a * a + b * b; im[k] = 0; }
      for (let k = 1; k < N / 2; k++) { re[N - k] = re[k]; im[N - k] = 0; }
      hmFft(re, im, true);
      const r0 = re[0]; if (!(r0 > 1e-6)) { this.f0 = 0; return; }
      const t0 = Math.floor(SR / 1400), t1 = Math.min(N / 2 - 2, Math.ceil(SR / 60));
      let best = 0, bt = 0; for (let t = t0; t <= t1; t++) { const v = re[t] / r0; if (v > best) { best = v; bt = t; } }
      // the first peak within 0.9 of the best (an octave error to the long side avoided)
      let tt = bt; for (let t = t0 + 1; t < bt; t++) { const v = re[t] / r0; if (v > 0.9 * best && v >= re[t - 1] / r0 && v >= re[t + 1] / r0) { tt = t; break; } }
      if (best < 0.45) { this.f0 = 0; return; }
      const a = re[tt - 1], b = re[tt], c = re[tt + 1], d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0;
      this.f0 = SR / (tt + off);
    }
    run(iL, iR, oL, oR, n) {
      const N = HM_N, H = HM_H;
      for (let i = 0; i < n; i++) {
        this.inL[this.ip] = iL ? iL[i] : 0; this.inR[this.ip] = iR ? iR[i] : 0; this.ip = (this.ip + 1) & (N - 1);
        oL[i] = this.outL[this.cnt]; oR[i] = this.outR[this.cnt];
        if (++this.cnt === H) {
          this.cnt = 0;
          this.outL.copyWithin(0, H); this.outR.copyWithin(0, H); this.outL.fill(0, N); this.outR.fill(0, N);
          this.frame();
        }
      }
    }
  }
