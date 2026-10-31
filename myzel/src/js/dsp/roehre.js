  // ---- Röhre & Vintage: myzel-roehre (owner, 31.10.2026: „hochwertige Röhrensimulationen, auch in Richtung Vintage –
  // schreib eigenen Code, von Grund auf, im Myzel-Stil, unique“). The insert's Verzerrung for the four types that are not a
  // fixed curve but a circuit with a memory (dev/klang/roehre-recherche.md):
  //   vorstufe   two 12AX7 triode stages, each with its coupling capacitor, grid resistor and grid current: the plate law
  //              (Koren) solved against its load line into a table; the grid conducts on loud peaks, charges the coupling
  //              capacitor and shifts the bias (blocking – the bloom, the level-dependent even harmonics); a Miller low
  //              pass before each grid. Farbe: dark and full (Miller low, cathode bypass) → open and tight (bass cut, bright)
  //   endstufe   phase inverter and a push-pull pair (Child's law, a bias that goes colder with Stärke: the crossover's
  //              grit), the supply sagging under load (its release from Farbe: solid-state 40 ms → valve rectifier 300 ms)
  //              and the output transformer's iron (lows saturate first) with its resonance
  //   pult       a console: input transformer → class-A stage (2nd and 3rd harmonic, soft beyond) → output transformer.
  //              Farbe: clean iron → dense, much iron
  //   band       tape: record pre-emphasis, the magnetisation with its hysteresis (it follows the field only as the field
  //              moves – rate-independent, as a real loop), playback de-emphasis, the head bump and the gap's high loss,
  //              a breath of wow and flutter. Farbe: the speed, 7.5 → 15 → 30 ips (bump 35 → 60 → 105 Hz, brighter)
  // Everything runs 4× oversampled (two linear-phase Kaiser half-bands, 95 and 31 taps: ≈ 1 ms in all); the dry signal
  // takes the same way and is mixed with the wet in the oversampled domain (Anteil – no comb); a level of its own is measured
  // for every setting (the model run on a fixed test signal) and the wet made as loud as the dry, gliding. Parameters glide
  // over 20 ms. At Anteil 0 – or as long as nothing but silence comes – it passes the input through.
  const RO_HB = (T, beta) => {
    const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    const h = new Float64Array(T), c = (T - 1) / 2; let s = 0;
    for (let i = 0; i < T; i++) { const n = i - c, u = (2 * i) / (T - 1) - 1, sinc = n === 0 ? 1 : Math.sin(Math.PI * n / 2) / (Math.PI * n / 2); h[i] = 0.5 * sinc * I0(beta * Math.sqrt(Math.max(0, 1 - u * u))) / I0(beta); s += h[i]; }
    for (let i = 0; i < T; i++) { h[i] /= s; if ((i - c) % 2 === 0 && i !== c) h[i] = 0; }
    // the two phases for upsampling (×2 for the zero-stuffing) and the taps that are not 0 for downsampling
    const ph = [[], []]; for (let i = 0; i < T; i++) if (h[i] !== 0) ph[i % 2].push([i >> 1, 2 * h[i]]);
    const dn = []; for (let i = 0; i < T; i++) if (h[i] !== 0) dn.push([i, h[i]]);
    return { T, ph: ph.map((p) => ({ k: Int32Array.from(p.map((q) => q[0])), g: Float64Array.from(p.map((q) => q[1])) })), dk: Int32Array.from(dn.map((q) => q[0])), dg: Float64Array.from(dn.map((q) => q[1])), half: Math.ceil(T / 2) };
  };
  const RO_A = RO_HB(95, 9), RO_B = RO_HB(31, 8);   // (measured: A −92 dB from 28 kHz at 2×, flat to 20 kHz; B −84 dB from 72 kHz at 4×)
  // one up-and-down pair per half-band and channel: histories kept twice over (a write at w and w + n), a window read in one run
  class RoHB {
    constructor(F) { this.F = F; const n = F.half + 2; this.n = n; this.x = new Float64Array(2 * n); this.w = 0; this.m = F.T; this.y = new Float64Array(2 * F.T); this.yw = 0; }
    up(v, out, o) {   // one sample in, two out (out[o], out[o + 1])
      const n = this.n, x = this.x; x[this.w] = x[this.w + n] = v; this.w = this.w + 1 === n ? 0 : this.w + 1;
      const b = this.w + n - 1;
      for (let p = 0; p < 2; p++) { const P = this.F.ph[p], k = P.k, g = P.g; let s = 0; for (let j = 0; j < k.length; j++) s += g[j] * x[b - k[j]]; out[o + p] = s; }
    }
    down(a, b2) {   // two samples in, one out
      const m = this.m, y = this.y;
      y[this.yw] = y[this.yw + m] = a; this.yw = this.yw + 1 === m ? 0 : this.yw + 1;
      y[this.yw] = y[this.yw + m] = b2; this.yw = this.yw + 1 === m ? 0 : this.yw + 1;
      const e = this.yw + m - 1, k = this.F.dk, g = this.F.dg; let s = 0;
      for (let j = 0; j < k.length; j++) s += g[j] * y[e - k[j]];
      return s;
    }
  }
  // biquads (RBJ) at the oversampled rate, direct form I in Float64
  const roBq = (type, f, q, db, fs) => {
    const w = 2 * Math.PI * Math.min(f, fs * 0.45) / fs, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, (db || 0) / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'pk') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
    else { const s2 = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cw + s2); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s2); a0 = (A + 1) - (A - 1) * cw + s2; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s2; }   // (hs: high shelf)
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  };
  class RoBq { constructor() { this.c = [1, 0, 0, 0, 0]; this.x1 = this.x2 = this.y1 = this.y2 = 0; } set(c) { this.c = c; } run(x) { const c = this.c, y = c[0] * x + c[1] * this.x1 + c[2] * this.x2 - c[3] * this.y1 - c[4] * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; } }
  // the 12AX7 (Koren's plate law: μ 100, x 1.4, kg1 1060, kp 600, kvb 300) at 250 V through 100 kΩ, cathode 1.5 kΩ bypassed:
  // the plate voltage for a grid voltage, solved once against the load line into a table over −8 … +2 V
  let RO_TRI = null;
  const roTriMake = () => {
    const mu = 100, ex = 1.4, kg1 = 1060, kp = 600, kvb = 300, B = 250, Rp = 100e3, Rk = 1500;
    const Ip = (vg, vp) => { const E1 = (vp / kp) * Math.log1p(Math.exp(Math.min(60, kp * (1 / mu + vg / Math.sqrt(kvb + vp * vp))))); return E1 > 0 ? 2 * Math.pow(E1, ex) / kg1 : 0; };
    const Vp = (vg) => { let lo = 0, hi = B; for (let i = 0; i < 30; i++) { const m = 0.5 * (lo + hi); if (m - B + Rp * Ip(vg, m) > 0) hi = m; else lo = m; } return 0.5 * (lo + hi); };
    const N = 1024, V0 = -8, V1 = 2, t = new Float64Array(N);
    for (let i = 0; i < N; i++) t[i] = Vp(V0 + (V1 - V0) * i / (N - 1));
    // the bias: the cathode's own drop (Vgk = −Rk·Ip)
    let vgk = -1; for (let i = 0; i < 40; i++) vgk = -Rk * Ip(vgk, Vp(vgk));
    const vp0 = Vp(vgk), dv = 0.01, gain = -(Vp(vgk + dv) - Vp(vgk - dv)) / (2 * dv);
    // (ADAA) the plate voltage's integral over the grid voltage, at the table's points (trapezoids)
    const F = new Float64Array(N), st = (V1 - V0) / (N - 1); for (let i = 1; i < N; i++) F[i] = F[i - 1] + 0.5 * (t[i - 1] + t[i]) * st;
    return { t, F, dv: st, N, V0, V1, k: (N - 1) / (V1 - V0), vgk, vp0, gain, B };
  };
  // the integral at v (exact for the table read linearly – the half-sample average of ADAA needs no more)
  const roTriF = (v) => { const T = RO_TRI; let p = (v - T.V0) * T.k; if (p < 0) return T.t[0] * (v - T.V0); if (p > T.N - 1.000001) return T.F[T.N - 1] + T.t[T.N - 1] * (v - T.V1);   // (beyond the table: the edge's value goes on)
     const i = p | 0, d = (p - i) * T.dv; return T.F[i] + T.t[i] * d + (T.t[i + 1] - T.t[i]) * d * d / (2 * T.dv); };
  // first-order antiderivative antialiasing (Parker, Zavalishin & Le Bivic, DAFx 2016): the curve's mean between the last
  // input and this one – what lies above the oversampled band folds back 20 … 40 dB less
  const roAdaa = (S, x, F, f) => { const Fx = F(x), d = x - S.x1; const y = d > 1e-7 || d < -1e-7 ? (Fx - S.F1) / d : f(0.5 * (x + S.x1)); S.x1 = x; S.F1 = Fx; return y; };
  const roTri = (vg) => {   // plate voltage at grid voltage vg (absolute), cubic Hermite in the table
    const T = RO_TRI; let p = (vg - T.V0) * T.k;
    if (p <= 1) p = 1; else if (p >= T.N - 3) p = T.N - 3;
    const i = p | 0, f = p - i, t = T.t, x0 = t[i - 1], x1 = t[i], x2 = t[i + 1], x3 = t[i + 2], c = (x2 - x0) * 0.5, v = x1 - x2, w = c + v, a = w + v + (x3 - x1) * 0.5, bn = w + a;
    return ((a * f - bn) * f + c) * f + x1;
  };
  // the grid current (Dempwolf & Zölzer: Gg 6.2e-4, Cg 9.9, ξ 1.31) and its slope
  const roIg = (v) => { const z = 9.9 * v, sp = z > 30 ? z : Math.log1p(Math.exp(z)); return 6.2e-4 * Math.pow(sp / 9.9, 1.31); };
  const roIgD = (v) => { const z = 9.9 * v, sp = z > 30 ? z : Math.log1p(Math.exp(z)), sg = z > 30 ? 1 : 1 / (1 + Math.exp(-z)); return 6.2e-4 * 1.31 * Math.pow(Math.max(1e-12, sp / 9.9), 0.31) * sg; };
  // one triode stage with its input network: coupling capacitor Cc in series, the source and grid stopper Rs, grid
  // resistor Rg to ground and the grid current – the grid voltage solved by two Newton steps each sample (semi-implicit:
  // the capacitor's charge from the step before), the capacitor charged by the current that flowed
  class RoTriode {
    constructor() { this.vc = 0; this.vg = 0; this.ml = 0; this.ad = { x1: 0, F1: 0 }; this.adOn = false; }
    run(vin, dt, Cc, Rs, Rg, mla) {
      let vg = this.vg;
      const b = vin - this.vc, v0 = RO_TRI.vgk;
      vg = b / (1 + Rs / Rg);   // (the grid not conducting: the divider alone – exact)
      if (v0 + vg > -0.4) for (let it = 0; it < 2; it++) { const g = (b - vg) / Rs - vg / Rg - roIg(v0 + vg), gd = -1 / Rs - 1 / Rg - roIgD(v0 + vg); vg -= g / gd; }
      const i = (b - vg) / Rs;
      this.vc += i * dt / Cc;
      this.vg = vg;
      this.ml += (vg - this.ml) * mla;   // (the Miller low pass on the grid)
      const v = v0 + this.ml;
      if (!this.adOn) { this.adOn = true; this.ad.x1 = v; this.ad.F1 = roTriF(v); }
      return roAdaa(this.ad, v, roTriF, roTri);
    }
  }
  // a transformer's iron: the flux the voltage's integral (leaky at 3 Hz), its magnetising current saturating – what it
  // takes from the signal is linear far below (a high pass at fc) and grows with the cube of the flux: the lows first
  class RoIron {
    constructor() { this.phi = 0; }
    run(x, dt, wc, ws, gam, leak) {
      this.phi = this.phi * leak + x * dt;
      const p = this.phi * ws, sat = p * p * p / (1 + p * p);
      return x - wc * this.phi - gam * sat;
    }
  }
  // the power valve's law (softplus(3.5·v)^1.5, Child's) as a table over −24 … +24, linear in between (smooth enough at 4×)
  const RO_PP = (() => { const N = 16384, t = new Float64Array(N + 1); for (let i = 0; i <= N; i++) { const z = 3.5 * (-24 + 48 * i / N), sp = z > 30 ? z : Math.log1p(Math.exp(z)); t[i] = Math.pow(sp, 1.5); } return { t, N, k: N / 48 }; })();
  const RO_PPF = (() => { const T = RO_PP.t, N = RO_PP.N, dv = 48 / N, F = new Float64Array(N + 1); for (let i = 1; i <= N; i++) F[i] = F[i - 1] + 0.5 * (T[i - 1] + T[i]) * dv; return { F, dv }; })();
  const roPPF = (v) => { let p = (v + 24) * RO_PP.k; if (p <= 0) return 0; if (p >= RO_PP.N) p = RO_PP.N - 1e-9; const i = p | 0, d = (p - i) * RO_PPF.dv, T = RO_PP.t; return RO_PPF.F[i] + T[i] * d + (T[i + 1] - T[i]) * d * d / (2 * RO_PPF.dv); };
  const roPP = (v) => { let p = (v + 24) * RO_PP.k; if (p <= 0) return 0; if (p >= RO_PP.N) p = RO_PP.N - 1e-9; const i = p | 0; return RO_PP.t[i] + (RO_PP.t[i + 1] - RO_PP.t[i]) * (p - i); };
  const RO_TYPES = ['vorstufe', 'endstufe', 'pult', 'band'];
  // the model of one channel at the oversampled rate (fs): state and the step; prm() sets its coefficients
  class RoModel {
    constructor(type, fs, seed) {
      if (type === 'vorstufe' && !RO_TRI) RO_TRI = roTriMake();
      this.type = type; this.fs = fs; this.dt = 1 / fs; this.fb = fs / 4;
      this.t1 = new RoTriode(); this.t2 = new RoTriode(); this.hp = new RoBq(); this.lp = new RoBq(); this.pre = new RoBq(); this.de = new RoBq(); this.bump = new RoBq(); this.dip = new RoBq(); this.hl1 = new RoBq(); this.hl2 = new RoBq(); this.sub = new RoBq();
      this.ir1 = new RoIron(); this.ir2 = new RoIron(); this.env = 0; this.M = 0; this.H1 = 0; this.dc1 = 0; this.dcy = 0;
      this.leak = Math.exp(-2 * Math.PI * 3 / fs); this.dcR = 1 - 2 * Math.PI * 7 / (fs / 4);
      this.s = -1; this.f = -1;
    }
    prm(s, f) {
      if (Math.abs(s - this.s) < 1e-4 && Math.abs(f - this.f) < 1e-4) return;
      this.s = s; this.f = f; const fs = this.fs, T = this.type;
      if (T === 'vorstufe') {
        this.gin = 0.35 * Math.pow(10, s * 1.75);   // (volts at the first grid for a full-scale sample: 0.35 … 20 V)
        this.att = 0.02 + 0.2 * s * s;   // (the volume between the stages: the second joins in with Stärke)
        const mlf = 5200 + 12000 * f; this.mla = 1 - Math.exp(-2 * Math.PI * mlf / fs);
        this.hp.set(roBq('hp', 18 + 230 * f * f, 0.6, 0, fs));   // (the cathode's bypass: full below, tight and bright above)
        this.lp.set(roBq('lp', 11000 + 7000 * f, 0.6, 0, this.fb));
        this.norm = 1 / ((RO_TRI.B - RO_TRI.vp0) * 0.9);
      } else if (T === 'endstufe') {
        this.g = Math.pow(10, s * 1.5); this.bias = 0.55 - 0.42 * s;
        const d = 1e-2; this.slope = (roPP(this.bias + d) - roPP(this.bias - d)) / (2 * d) * 2; this.ad = null; this.ad2 = null;
        this.sagK = 0.1 + 0.9 * f; this.ea = 1 - Math.exp(-1 / ((0.015 + 0.06 * f) * fs)); this.er = 1 - Math.exp(-1 / ((0.06 + 0.3 * f) * fs));   // (Farbe 0: solid-state rectifier – tight; 1: valve rectifier – it sags deep and comes back slowly)
        this.wc = 2 * Math.PI * 22; this.ws = 2 * Math.PI * 45; this.gam = 0.06 + 0.12 * s;
        this.lp.set(roBq('lp', Math.min(21000, 0.45 * this.fb), 0.95, 0, this.fb));
      } else if (T === 'pult') {
        this.g = Math.pow(10, s * 1.2); this.a2 = 0.06 + 0.14 * f; this.a3 = 0.03 + 0.03 * f;
        this.wc = 2 * Math.PI * 9; this.ws = 2 * Math.PI * 60; this.gam = (0.02 + 0.1 * f) * (0.4 + s);
        this.lp.set(roBq('lp', 18500 - 3500 * f, 0.7, 0, this.fb));
      } else {   // band
        const ips = 7.5 * Math.pow(2, 2 * f), tau = 70e-6 * 7.5 / ips, fe = 1 / (2 * Math.PI * tau);
        this.g = Math.pow(10, (-6 + 24 * s) / 20);
        this.pre.set(roBq('hs', fe, 0.7, 10, fs)); this.de.set(roBq('hs', fe, 0.7, -10, fs));
        const fb = 35 * Math.pow(ips / 7.5, 0.79), F = this.fb; this.bump.set(roBq('pk', fb, 1.1, 2.6, F)); this.dip.set(roBq('pk', fb * 1.9, 1.2, -1.1, F));
        const fh = Math.min(12500 * Math.pow(ips / 7.5, 0.47), 0.44 * F); this.hl1.set(roBq('lp', fh, 0.62, 0, F)); this.hl2.set(roBq('lp', Math.min(fh * 1.35, 0.45 * F), 0.55, 0, F));
        this.sub.set(roBq('hp', 18, 0.7, 0, F));
        this.wd = 1 / (0.10 + 0.25 * (1 - s));   // (the loop's width: what the field must move before the tape follows)
        this.kb = 1 - Math.exp(-1 / (0.000025 * fs)); this.hy = 0.12 + 0.2 * s;   // (follows within 25 µs on its own: low levels stay clean and flat – the loop only on big, fast moves)
      }
    }
    // one oversampled sample of the wet path
    step(x) {
      const T = this.type, dt = this.dt;
      let y;
      if (T === 'vorstufe') {
        const v1 = this.hp.run(x) * this.gin;
        const p1 = this.t1.run(v1, dt, 22e-9, 68e3, 1e6, this.mla);
        const v2 = (RO_TRI.vp0 - p1) * this.att;   // (inverted, attenuated – the second grid)
        const p2 = this.t2.run(v2, dt, 22e-9, 68e3, 1e6, this.mla);
        y = (RO_TRI.vp0 - p2) * this.norm;   // (inverted twice: in phase with the input)
      } else if (T === 'endstufe') {
        const h = 1 / (1 + this.sagK * this.env), u = x * this.g, b = this.bias;
        // the pair's curve (one half 2 % stronger: a trace of the 2nd harmonic), read through ADAA: F = ∫(pp(b+u) − 1.02·pp(b−u)) du
        const F = (w) => roPPF(b + w) + 1.02 * roPPF(b - w), fu = (w) => roPP(b + w) - 1.02 * roPP(b - w), A = this.ad || (this.ad = { x1: u, F1: F(u) });
        const raw = roAdaa(A, u, F, fu) / this.slope;
        // the plate swings no further than the supply lets it: a soft ceiling at h (the sagging supply), read through ADAA too
        const lc = (w) => { const z = Math.abs(w); return z + Math.log1p(Math.exp(-2 * z)) - Math.LN2; }, A2 = this.ad2 || (this.ad2 = { x1: 0, F1: 0 });
        const v = h * roAdaa(A2, raw / h, lc, Math.tanh);
        const a = Math.abs(v); this.env += (a - this.env) * (a > this.env ? this.ea : this.er);
        y = this.ir1.run(v, dt, this.wc, this.ws, this.gam, this.leak);
      } else if (T === 'pult') {
        const a = this.ir1.run(x * this.g, dt, this.wc, this.ws, this.gam, this.leak);
        let c = a + this.a2 * a * a + this.a3 * a * a * a;
        c = c > 1.5 ? 1.5 - 0.5 / (c - 0.5) + 0.5 : c < -1.5 ? -(1.5 - 0.5 / (-c - 0.5) + 0.5) : c;   // (soft beyond)
        y = this.ir2.run(c, dt, this.wc, this.ws, this.gam * 0.6, this.leak) / this.g;
      } else {
        const H = this.pre.run(x) * this.g;
        // the magnetisation follows the anhysteretic curve only as the field moves (rate-independent loop), a fifth reversible
        const lc = (w) => { const z = Math.abs(1.6 * w); return (z + Math.log1p(Math.exp(-2 * z)) - Math.LN2) / 2.56; }, A = this.ad || (this.ad = { x1: H, F1: lc(H) });
        const man = roAdaa(A, H, lc, (w) => Math.tanh(1.6 * w) / 1.6), dH = Math.abs(H - this.H1); this.H1 = H;
        // (the AC bias of a real machine keeps low levels clean: the magnetisation also follows by itself within 25 µs –
        // what is left of the loop is a lag on big, fast moves: softened transients and the tape's slightly blurred highs)
        this.M += (man - this.M) * Math.min(1, dH * this.wd + this.kb);
        const m = man + this.hy * (this.M - man);
        y = this.de.run(m / this.g);
      }
      return y;
    }
    // after the mix, at the base rate: the type's linear voicing (output low passes; the tape's head bump, dip, gap loss and
    // subsonic cut – on the dry share too: the same machine) and the DC of the asymmetric stages out (7 Hz)
    post(y) {
      const T = this.type;
      if (T === 'band') y = this.sub.run(this.hl2.run(this.hl1.run(this.dip.run(this.bump.run(y)))));
      else y = this.lp.run(y);
      const o = y - this.dc1 + this.dcR * this.dcy; this.dc1 = y; this.dcy = o;
      return o;
    }
  }
  class Roehre extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      this.type = RO_TYPES.includes(po.type) ? po.type : 'vorstufe';
      this.s = this.sT = po.s != null ? +po.s : 0.3; this.f = this.fT = po.f != null ? +po.f : 0.5; this.mx = this.mxT = po.mix != null ? +po.mix : 1;
      this.fs = 4 * sampleRate; this.mk = 1; this.mkT = 1; this.calT = -1; this.calS = -1; this.calF = -1; this.quiet = 0;
      this.ch = [0, 1].map(() => ({ a: new RoHB(RO_A), b: new RoHB(RO_B), da: new RoHB(RO_A), db: new RoHB(RO_B),   // (each stage one filter that sees the whole stream)
        m: new RoModel(this.type, this.fs) }));
      this.u2 = new Float64Array(2); this.u4 = new Float64Array(2); this.r = 0x9e3779b9 >>> 0;
      // wow and flutter (band): one modulation for both channels, a short delay line at the oversampled rate
      this.wN = 256; this.wl = [new Float64Array(this.wN), new Float64Array(this.wN)]; this.ww = 0; this.wp = [0.7, 2.1]; this.wn = 0; this.wnT = 0; this.wk = 0;
      this.port.onmessage = (e) => { const m = e.data || {}; if (m.s != null) this.sT = Math.max(0, Math.min(1, +m.s)); if (m.f != null) this.fT = Math.max(0, Math.min(1, +m.f)); if (m.mix != null) this.mxT = Math.max(0, Math.min(1, +m.mix)); if (m.type && RO_TYPES.includes(m.type) && m.type !== this.type) { this.type = m.type; for (const C of this.ch) C.m = new RoModel(this.type, this.fs); this.calS = -1; this.calibrate(true); } };
      this.calibrate(true);
    }
    // the wet path's level against the dry for this setting: the model, fresh, run on a fixed test signal (three tones at
    // −18 dBFS RMS, 0.25 s at the oversampled rate); the make-up is the RMS ratio over its second half
    calibrate(now) {
      const M = new RoModel(this.type, this.fs); M.prm(this.s, this.f);
      this.cal = { M, i: 0, n: Math.round(0.25 * this.fs), si: 0, so: 0 };
      this.calS = this.s; this.calF = this.f; this.calT = currentTime;
      if (now) this.calRun(Math.round(0.03 * this.fs), true);
    }
    // its test signal: three tones at −18 dBFS RMS; the make-up is the RMS ratio over the second half (or, for the quick
    // first estimate, over all but its first fifth)
    calRun(k, quick) {
      const C = this.cal; if (!C) return;
      const fs = this.fs, A = 0.126 / Math.sqrt(1 / 2 + 1 / 8 + 1 / 32), from = quick ? k / 5 : C.n / 2, end = quick ? k : Math.min(C.n, C.i + k);
      for (; C.i < end; C.i++) {
        const t = C.i / fs, x = A * (Math.sin(2 * Math.PI * 110 * t) + 0.5 * Math.sin(2 * Math.PI * 830 * t + 1) + 0.25 * Math.sin(2 * Math.PI * 3700 * t + 2)), y = C.M.step(x);
        if (C.i > from) { C.si += x * x; C.so += y * y; }
      }
      if (C.i >= (quick ? k : C.n)) { this.mkT = C.so > 1e-20 ? Math.max(0.05, Math.min(20, Math.sqrt(C.si / C.so))) : 1; if (quick) { this.mk = this.mkT; this.calibrate(false); } else this.cal = null; }   // (the quick one: at once – then the careful one, over the next blocks)
    }
    process(inputs, outputs) {
      const I = inputs[0], O = outputs[0], n = O[0].length;
      const ga = 1 - Math.exp(-n / (0.02 * sampleRate));
      this.s += (this.sT - this.s) * ga; this.f += (this.fT - this.f) * ga;
      if (Math.abs(this.sT - this.s) < 1e-4) this.s = this.sT; if (Math.abs(this.fT - this.f) < 1e-4) this.f = this.fT;
      // a new level measure when the setting moved (at most ten times a second); the make-up glides there (50 ms)
      if ((Math.abs(this.s - this.calS) > 0.004 || Math.abs(this.f - this.calF) > 0.004) && currentTime - this.calT > 0.1) this.calibrate(false);
      if (this.cal) this.calRun(2048);
      this.mk += (this.mkT - this.mk) * (1 - Math.exp(-n / (0.05 * sampleRate)));
      const x0 = I && I[0] ? I[0] : null, x1 = I && I[1] ? I[1] : x0;
      // silence in, the mix at rest: passed through (the models' states rest at zero with it)
      let any = false; if (x0) for (let i = 0; i < n; i += 4) if (x0[i] !== 0 || (x1 && x1[i] !== 0)) { any = true; break; }
      this.quiet = any ? 0 : this.quiet + n;
      if (this.quiet > sampleRate) { for (let c = 0; c < O.length; c++) O[c].fill(0); this.mx = this.mxT; return true; }   // (a second of silence: its tails are long gone – nothing to compute)
      for (const C of this.ch) C.m.prm(this.s, this.f);
      const mg = 1 - Math.exp(-1 / (0.02 * this.fs)), band = this.type === 'band', mk = this.mk;
      // wow (0.55 Hz), flutter (7.3 Hz) and a slow random drift – peak speed deviation 0.04 … 0.12 %, more on slow tape and
      // with Stärke; the delay (in oversampled frames) for every oversampled frame of this block, the same for both channels
      if (band) {
        const fs = sampleRate, dep = (0.0004 + 0.0008 * this.s) * (1.6 - 0.6 * this.f), DL = this.dl || (this.dl = new Float64Array(128));
        const Aw = fs * dep * 0.6 / (2 * Math.PI * 0.55), Af = fs * dep * 0.3 / (2 * Math.PI * 7.3), Ad = fs * dep * 0.4 / (2 * Math.PI * 0.2);
        let p0 = this.wp[0], p1 = this.wp[1], wn = this.wn;
        for (let j = 0; j < n; j++) {
          p0 += 2 * Math.PI * 0.55 / fs; p1 += 2 * Math.PI * 7.3 / fs;
          if (((this.wk = (this.wk + 1) | 0) & 511) === 0) { this.r ^= this.r << 13; this.r >>>= 0; this.r ^= this.r >>> 17; this.r ^= this.r << 5; this.r >>>= 0; this.wnT = (this.r / 4294967296) * 2 - 1; }
          wn += (this.wnT - wn) * (2 * Math.PI * 0.2 / fs);
          DL[j] = 60 + Aw * Math.sin(p0) + Af * Math.sin(p1) + Ad * wn;   // (≈ 1.25 ms around which it wobbles)
        }
        this.wp[0] = p0 % (2 * Math.PI); this.wp[1] = p1 % (2 * Math.PI); this.wn = wn;
      }
      for (let c = 0; c < O.length && c < 2; c++) {
        const C = this.ch[c], x = c ? x1 : x0, o = O[c], M = C.m, wl = this.wl[c];
        let mx = this.mx, ww = this.ww;
        for (let i = 0; i < n; i++) {
          const v = x ? x[i] : 0;
          C.a.up(v, this.u2, 0);
          let acc0 = 0, acc1 = 0;
          for (let h2 = 0; h2 < 2; h2++) {
            C.b.up(this.u2[h2], this.u4, 0);
            let r0 = 0, r1 = 0;
            for (let q = 0; q < 2; q++) {
              const d = this.u4[q];
              mx += (this.mxT - mx) * mg;
              let w = M.step(d) * mk, z = d + (w - d) * mx;
              if (q) r1 = z; else r0 = z;
            }
            const y2 = C.db.down(r0, r1);
            if (h2) acc1 = y2; else acc0 = y2;
          }
          let y = M.post(C.da.down(acc0, acc1));
          if (band) {   // the tape's speed wobbles the wet and the dry alike (after the mix: no comb) – at the base rate
            const N = this.wN; wl[ww] = y;
            let rp = ww - this.dl[i]; if (rp < 0) rp += N;
            const ri = rp | 0, fr = rp - ri, a0 = wl[(ri + N - 1) % N], a1 = wl[ri], a2 = wl[(ri + 1) % N], a3 = wl[(ri + 2) % N], cc = (a2 - a0) * 0.5, vv = a1 - a2, w2 = cc + vv, aa = w2 + vv + (a3 - a1) * 0.5;
            y = ((aa * fr - (w2 + aa)) * fr + cc) * fr + a1;
            ww = ww + 1 === N ? 0 : ww + 1;
          }
          if (!(y === y) || y > 64 || y < -64) { y = 0; C.m = new RoModel(this.type, this.fs); }   // (never wild: a state that ran away starts again)
          o[i] = y;
        }
        if (c === Math.min(1, O.length - 1)) { this.mx = mx; this.ww = ww; }
      }
      return true;
    }
  }
