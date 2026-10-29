  // ---- Sättigung: myzel-sat – a mixer channel's saturation (owner, 29.10.2026: „bau den Baustein ohne Verzögerung“). The
  // same curve as the WaveShaper it replaces – half dry, half tanh, matched at −14 dBFS peaks: y = (1 − m)·x + c·tanh(g·x)/g,
  // the input held to ±4 as the shaper held it – but without its folding: 2× oversampled (a 47-tap half-band, Kaiser β 8,
  // flat to 20 kHz) and the curve read through its antiderivative (ADAA, first order). Measured against the shaper at
  // full saturation: what folds back −29 … −50 dB → −65 … −73 dB (1.8–5.3 kHz). Its delay ≈ 23 frames (0.5 ms; the
  // browser's own 4× oversampling, ≈ 4 ms, was the other way). At 0 it passes the input through at once, sample for
  // sample; in and out over 10 ms. ----
  const SAT_T = 47, SAT_H = (() => {
    const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    const h = new Float64Array(SAT_T); let s = 0;
    for (let i = 0; i < SAT_T; i++) { const n = i - (SAT_T - 1) / 2, u = (2 * i) / (SAT_T - 1) - 1, sinc = n === 0 ? 1 : Math.sin(Math.PI * n / 2) / (Math.PI * n / 2); h[i] = 0.5 * sinc * I0(8 * Math.sqrt(Math.max(0, 1 - u * u))) / I0(8); s += h[i]; }
    for (let i = 0; i < SAT_T; i++) h[i] /= s;
    return h;
  })();
  class Sat extends AudioWorkletProcessor {
    constructor() {
      super();
      this.a = 0; this.aT = 0; this.mix = 0;
      // per channel: the 1× input history (upsampling), the 2× output history (downsampling), the ADAA state
      this.ch = [0, 1].map(() => ({ xi: new Float64Array(SAT_T), xw: 0, yi: new Float64Array(SAT_T), yw: 0, x1: 0, F1: 0 }));
      this.port.onmessage = (e) => { const m = e.data || {}; if (m.a != null) this.aT = Math.max(0, Math.min(1, +m.a || 0)); };
    }
    // the curve at a: y = (1 − m)·x + c·tanh(g·x)/g, its antiderivative F = (1 − m)·x²/2 + c·ln cosh(g·x)/g²
    setA(a) { this.a = a; this.g = 1 + 9 * a; const ref = 0.2; this.c = (a / 2) * ref / (Math.tanh(this.g * ref) / this.g); this.m = a / 2; }
    f(x) { return (1 - this.m) * x + this.c * Math.tanh(this.g * x) / this.g; }
    F(x) { const z = Math.abs(this.g * x); return (1 - this.m) * x * x / 2 + this.c * (z - Math.LN2 + Math.log1p(Math.exp(-2 * z))) / (this.g * this.g); }
    adaa(C, x) {
      x = x > 4 ? 4 : x < -4 ? -4 : x;
      const Fx = this.F(x), d = x - C.x1, y = Math.abs(d) > 1e-6 ? (Fx - C.F1) / d : this.f(0.5 * (x + C.x1));
      C.x1 = x; C.F1 = Fx; return y;
    }
    process(inputs, outputs) {
      const I = inputs[0], O = outputs[0], n = O[0].length;
      // the amount glides per block (20 ms); a change of it reads the curve anew – the antiderivative's state follows
      const ga = 1 - Math.exp(-n / (0.02 * sampleRate));
      let a = this.a + (this.aT - this.a) * ga; if (Math.abs(this.aT - a) < 1e-4) a = this.aT;
      const on = a > 1e-4 || this.aT > 0, mg = 1 - Math.exp(-1 / (0.01 * sampleRate));
      if (!on && this.mix < 1e-6) { this.mix = 0; for (let c = 0; c < O.length; c++) { const x = I && I[c] ? I[c] : I && I[0] ? I[0] : null; if (x) O[c].set(x); else O[c].fill(0); } this.a = a; return true; }
      if (a !== this.a || this.g == null) { this.setA(a); for (const C of this.ch) C.F1 = this.F(C.x1); }
      const h = SAT_H, T = SAT_T;
      for (let c = 0; c < O.length && c < 2; c++) {
        const x = I && I[c] ? I[c] : I && I[0] ? I[0] : null, o = O[c], C = this.ch[c];
        let mix = this.mix;
        for (let i = 0; i < n; i++) {
          const v = x ? x[i] : 0;
          C.xi[C.xw] = v; C.xw = (C.xw + 1) % T;
          // two samples at 2×: the zero-stuffed input through the half-band (its even and odd taps), ×2 for the stuffing
          let u0 = 0, u1 = 0;
          for (let k = 0, j = (C.xw - 1 + T) % T; 2 * k < T; k++, j = (j - 1 + T) % T) { u0 += h[2 * k] * C.xi[j]; if (2 * k + 1 < T) u1 += h[2 * k + 1] * C.xi[j]; }
          C.yi[C.yw] = this.adaa(C, 2 * u0); C.yw = (C.yw + 1) % T; C.yi[C.yw] = this.adaa(C, 2 * u1); C.yw = (C.yw + 1) % T;
          // one sample back at 1×
          let y = 0; for (let k = 0, j = (C.yw - 1 + T) % T; k < T; k++, j = (j - 1 + T) % T) y += h[k] * C.yi[j];
          mix += ((on ? 1 : 0) - mix) * mg;
          o[i] = mix >= 1 - 1e-9 ? y : v + (y - v) * mix;
        }
        if (c === O.length - 1 || c === 1) this.mix = mix;
      }
      return true;
    }
  }
