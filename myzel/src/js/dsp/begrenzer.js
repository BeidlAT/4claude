  // ---- Begrenzer: myzel-lim – the sum's ceiling (owner, 29.10.2026: „den sauberen Begrenzer … zuerst“). It replaces
  // the soft clipper at the end of the master (dev/klang/effekte-konzept.md §3.4): a peak that would go over the
  // ceiling is met by turning the whole sum down for a moment, never by bending its wave. Its peaks are found between
  // the samples too (4× oversampled, a 48-tap windowed sinc), 2 ms ahead (the sum runs 2.1 ms late for that); the gain
  // holds the lowest it needs over those 2 ms and glides there (a box of the same length – no step, no click), and comes
  // back with a release that waits longer after longer pressure (50 … 400 ms). Below the ceiling it changes nothing:
  // the sum passes exactly, only later. Ceiling −0.3 dBTP. It reports its reduction (‹red›, dB) a few times a second. ----
  const LIM_OS = 4, LIM_TP = 12, LIM_FIR = (() => {
    // 4 phases × 12 taps of a Kaiser-windowed sinc (β 8) at the fractions ¼, ½, ¾ (phase 0 is the sample itself)
    const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    const h = new Float64Array(LIM_OS * LIM_TP);
    for (let p = 1; p < LIM_OS; p++) {
      let s = 0;
      for (let j = 0; j < LIM_TP; j++) { const x = j - LIM_TP / 2 + 1 - p / LIM_OS, u = x / (LIM_TP / 2), v = (Math.sin(Math.PI * x) / (Math.PI * x)) * (Math.abs(u) < 1 ? I0(8 * Math.sqrt(1 - u * u)) / I0(8) : 0); h[p * LIM_TP + j] = v; s += v; }
      for (let j = 0; j < LIM_TP; j++) h[p * LIM_TP + j] /= s;
    }
    return h;
  })();
  // the most any interpolated point can be against the largest sample of its window (Σ|taps| of the worst phase)
  const LIM_SUM = (() => { let m = 1; for (let p = 1; p < LIM_OS; p++) { let s = 0; for (let j = 0; j < LIM_TP; j++) s += Math.abs(LIM_FIR[p * LIM_TP + j]); m = Math.max(m, s); } return m; })();
  class Lim extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      this.ceil = Math.pow(10, (po.ceil != null ? po.ceil : -0.3) / 20);
      const L = (this.L = Math.max(16, Math.round((po.ahead || 0.002) * sampleRate)));
      this.N = L + LIM_TP + 2; this.dl = [new Float32Array(2 * this.N), new Float32Array(2 * this.N)]; this.w = 0;   // (kept twice over: a window reads in one run)
      // the gain wanted per sample, its running minimum over L + 1 (a monotone deque) and the box of L over that
      this.gq = new Float64Array(L + 2); this.qi = new Int32Array(L + 2); this.qh = 0; this.qt = 0; this.t = 0;
      this.box = new Float64Array(L); this.bs = L; this.bi = 0; this.box.fill(1);
      this.g = 1; this.hold = 0; this.red = 0; this.redN = 0;
      this.port.onmessage = (e) => { const m = e.data || {}; if (m.ceil != null) this.ceil = Math.pow(10, m.ceil / 20); };
    }
    // the true peak at sample P of channel c: the sample and the three points between it and the next (the sinc's taps
    // reach P − 5 … P + 6 – P lies 6 behind the newest); B: where P − 5 lies in the doubled history
    tp(c, B) {
      const d = this.dl[c]; let m = Math.abs(d[B + LIM_TP / 2 - 1]);
      for (let p = 1; p < LIM_OS; p++) {
        let s = 0; const o = p * LIM_TP;
        for (let j = 0; j < LIM_TP; j++) s += LIM_FIR[o + j] * d[B + j];
        const a = Math.abs(s); if (a > m) m = a;
      }
      return m;
    }
    process(inputs, outputs) {
      const I = inputs[0], O = outputs[0], n = O[0].length, iL = I && I[0], iR = I && (I[1] || I[0]), oL = O[0], oR = O[1] || null;
      const L = this.L, N = this.N, gq = this.gq, qi = this.qi, Q = L + 2, ceil = this.ceil, box = this.box;
      const relFast = 1 - Math.exp(-1 / (0.05 * sampleRate)), relSlow = 1 - Math.exp(-1 / (0.4 * sampleRate));
      let red = this.red;
      // (29.10.2026, measured: 2.1 units) a quantum whose samples – and the 11 before it, which its first windows reach –
      // are so low that no point between them can reach the ceiling needs no true peak: it needs gain 1, as it would
      let big = 0;
      for (let i = 0; i < n; i++) { const a = iL ? Math.abs(iL[i]) : 0, b = iR ? Math.abs(iR[i]) : 0; if (a > big) big = a; if (b > big) big = b; }
      for (let k = 1; k < LIM_TP; k++) { const j = (this.w - k + N) % N, a = Math.abs(this.dl[0][j]), b = Math.abs(this.dl[1][j]); if (a > big) big = a; if (b > big) big = b; }
      const calm = big * LIM_SUM < ceil;
      for (let i = 0; i < n; i++) {
        const w = this.w; this.dl[0][w] = this.dl[0][w + N] = iL ? iL[i] : 0; this.dl[1][w] = this.dl[1][w + N] = iR ? iR[i] : 0;
        // the gain this sample needs (its true peak, both sides), into the running minimum (window L + 1)
        const P = (w - LIM_TP / 2 + N) % N, B = w + N - LIM_TP + 1, pk = calm ? 0 : Math.max(this.tp(0, B), this.tp(1, B)), need = pk > ceil ? ceil / pk : 1, t = this.t++;
        while (this.qt > this.qh && gq[(this.qt - 1) % Q] >= need) this.qt--;
        gq[this.qt % Q] = need; qi[this.qt % Q] = t; this.qt++;
        while (qi[this.qh % Q] <= t - L - 1) this.qh++;
        const mn = gq[this.qh % Q];
        // the box over the minimum: the gain is down to it when that peak leaves the delay
        this.bs += mn - box[this.bi]; box[this.bi] = mn; this.bi = (this.bi + 1) % L;
        const gb = this.bs / L;
        // release: back up slowly, the slower the longer it held
        let g = this.g;
        if (gb < g) { g = gb; this.hold = Math.min(1, this.hold + 1 / (0.5 * sampleRate)); }
        else { const r = relFast + (relSlow - relFast) * this.hold; g += (gb - g) * r; this.hold = Math.max(0, this.hold - 1 / (2 * sampleRate)); }
        if (g > 1) g = 1;
        this.g = g;
        // out: the sample L before P (the delay is L + 6)
        const r0 = (P - L + N) % N;
        let a = this.dl[0][r0] * g, b = this.dl[1][r0] * g;
        if (a > ceil) a = ceil; else if (a < -ceil) a = -ceil;   // (a last guard – the box keeps it from ever acting)
        if (b > ceil) b = ceil; else if (b < -ceil) b = -ceil;
        oL[i] = a; if (oR) oR[i] = b;
        if (g < red) red = g;
        this.w = (w + 1) % N;
      }
      this.red = red;
      if (++this.redN >= 32) { this.port.postMessage({ red: 20 * Math.log10(Math.max(1e-6, this.red)) }); this.red = 1; this.redN = 0; }
      return true;
    }
  }
