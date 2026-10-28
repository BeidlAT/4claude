  // ---- Glut: myzel-ember – a tuned feedback loop (SPEC §3.3) ----
  // A delay of one period of the note, a band-pass (RBJ: 0 dB and zero phase at its centre) on the mode m·f, a tanh,
  // a gain, back into the delay. Höhe is the growth per second r (y 0 → −6, 0.3 → 0: the threshold, 0.6 → +8,
  // 1 → +12 nepers/s, × (0.5 + Glühen)), the same at every pitch: the loop's every part is exponentially weighted –
  // z⁻¹ → e^(σ/SR)·z⁻¹ in the delay and in the band's poles and zeros – so whatever the neutral loop sustains grows or
  // dies at exactly σ per second (a gain per pass would make it 16× pitch-dependent, and with the band's group delay
  // a narrow band at 55 Hz could never die faster than its own ring – the check, lesson 2; measured: 69.5–71.8 dB/s at
  // 55–1760 Hz for r = 8, i.e. 69.5). The neutral loop: the interpolator's loss and phase compensated at the mode, the
  // tanh's gain on the fundamental divided out by its describing function at the loop's amplitude (read in quadrature
  // from the band's output) – the tanh only colours (Hitze: drive and band). The amplitude settles where σ = r − c·A²
  // (the Hopf normal form a real loop follows near its threshold, per second instead of per pass; A² smoothed over 50 ms,
  // so it swings in ≈ 1 dB over): a soft knee in loudness above the threshold, the same at every pitch (a tanh alone
  // limits by its compression per pass: ≈ 10 dB lower at 1.76 kHz than at 220 Hz) – and lets go at once: let go,
  // σ = −6.9/Nachglühen (T60 = Nachglühen). Glimmen, always on: r and the loop's period wander (±1.5/s, ±2 ct, 0.2–1 Hz;
  // let go ±8 % of the decay) – the settled tone breathes. Sprung: above y 0.77 (0.92) the band jumps to the 2nd or
  // 3rd mode (Oktave, Duodezime), seeded there at 0.4 × the loop's amplitude, while the old mode rings out beside the
  // loop (35 ms) – SPEC's 60-ms glide of the band let the old mode die before the new one had grown: a hole of 28–83 dB,
  // measured; the odd tanh never seeds even modes – the check. Onset: a knock of noise (Zunder) and one period of the
  // note's own tone in the loop with the band's state (a noise burst falls mostly outside the band – lesson 1); a Puls
  // hit sets the loop's state at once and grows at +10/s for the gate. Level 3: two loops ±5 ct, left and right,
  // coupled by a rotation (lossless) and seeded a quarter period apart.
  const EMB_OUT = 0.6, EMB_KD = 0.5, EMB_SEED = 0.25, EMB_INJ = 0.5, EMB_KNOCK = 0.35, EMB_FLOOR = 3e-4, EMB_KAP = 0.1, EMB_DET = 5, EMB_RTOP = 12, EMB_GMAX = 10, EMB_JUMP = 0.4, EMB_GHOST = 0.035, EMB_WALK = 1.2;
  const embR = (y) => (y < 0.3 ? -6 + 20 * y : y < 0.6 ? (y - 0.3) * 80 / 3 : 8 + (y - 0.6) * 10);   // Höhe → growth (nepers/s) before Glühen
  const TDF = new Float32Array(1026);   // the describing function of tanh: the gain a sine of amplitude a sees, a in [0, 16]
  for (let i = 0; i < 1026; i++) { const a = i / 64; if (!i) { TDF[0] = 1; continue; } let s = 0; for (let k = 0; k < 128; k++) { const sn = Math.sin(Math.PI * (k + 0.5) / 128); s += Math.tanh(a * sn) * sn; } TDF[i] = 2 * s / (128 * a); }
  const tdf = (a) => { if (a >= 16) return 4 / (Math.PI * a); const p = a * 64, i = p | 0; return TDF[i] + (p - i) * (TDF[i + 1] - TDF[i]); };
  class Ember extends MyzelProc {
    constructor(o) {
      super(o);
      this.lgD = 0; this.lgW = 0; this.lpd = 0; this.lmag = 1;   // (lagH's input and output)
      const po = this.po;
      this.rich = !!po.rich;
      const K = this.Kx = this.rich ? 2 : 1;
      let n = 8; while (n < Math.ceil(SR / 16 * 1.2) + 8) n <<= 1;   // one period of the lowest note (with a bend's and the walk's room)
      this.N = n; this.buf = new Float32Array(K * n); this.w = 0;
      this.xr = new Float32Array(K * 1024); this.xw = 0;   // each loop's band output, a quarter period back: its amplitude, a jump's ghost
      // per loop: delay (now, target), Lagrange weights, the band (coefficients, state, centre), the neutral gain, the
      // growth σ and its weighting, the amplitude² (now, smoothed), Glimmen's two walks (r, period), the ghost of a jump
      this.D = new Float64Array(K); this.Dt = new Float64Array(K); this.h = new Float64Array(4 * K); this.di = new Int32Array(K);
      this.b0 = new Float64Array(K); this.a1 = new Float64Array(K); this.a2 = new Float64Array(K); this.b2 = new Float64Array(K); this.z1 = new Float64Array(K); this.z2 = new Float64Array(K);
      this.Fc = new Float64Array(K); this.G0 = new Float64Array(K); this.qD = new Float64Array(K); this.sg = new Float64Array(K); this.A2 = new Float64Array(K); this.As = new Float64Array(K);
      this.gw = new Float64Array(K); this.gv = new Float64Array(K); this.tw = new Float64Array(K); this.tv = new Float64Array(K);
      this.hRe = new Float64Array(K); this.hIm = new Float64Array(K); this.hA = new Float64Array(K); this.hC = new Float64Array(K); this.hS = new Float64Array(K);   // the old mode ringing out after a jump
      this.lp = new Float64Array(6); this.hp = new Float64Array(4);
      this.p = { gluehen: 0.5, nachgluehen: 1.5, zunder: 0.4, hitze: 0.5, sprung: '3', kasten: 0.5 };
      this.rng = new PRNG(po.seed || 7);
      if (po.prm) this.set(po.prm);
      this.vel = 0.75; this.m = 1; this.kl = 1;
      this.reset();
    }
    reset() {
      this.buf.fill(0); this.xr.fill(0); this.z1.fill(0); this.z2.fill(0); this.A2.fill(0); this.As.fill(0); this.D.fill(0); this.hA.fill(0);
      this.lp.fill(0); this.hp.fill(0); this.kn = 0; this.ni = 0; this.gate = 0; this.held = false;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'sprung' ? String(p[k]) : +p[k] || 0; }
    // the mode for a height: Sprung above 0.75, the twelfth above 0.9 (hysteresis ±0.02); never above 0.42·SR
    mode(f) {
      const y = this.y, s = this.p.sprung === '2' ? 2 : 3, m0 = this.m;
      let m = y >= 0.92 || (m0 === 3 && y >= 0.88) ? 3 : y >= 0.77 || (m0 > 1 && y >= 0.73) ? s : 1;
      while (m > 1 && m * f > 0.42 * SR) m--;
      return m;
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      if (m.seed) this.rng = new PRNG(m.seed);
      if (m.y != null) this.y = m.y;
      this.held = true; this.kl = 1;
      this.gate = this.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      const K = this.Kx, z = this.p.zunder, f = Math.min(this.f, 0.42 * SR);
      this.m = this.mode(f);
      for (let k = 0; k < K; k++) {
        this.gw[k] = 2 * this.rng.next() - 1; this.gv[k] = 0; this.tw[k] = 2 * this.rng.next() - 1; this.tv[k] = 0;
        this.D[k] = 0; this.sg[k] = 0; this.hA[k] = 0;
        this.coef(k, 0);
        // the onset: one period of its own tone in the loop (a Puls hit: the loop state itself, louder)
        this.seed(k, (this.burst ? EMB_INJ : EMB_SEED * (0.5 + 0.5 * z)) * this.vel);
      }
      // the knock: 5–20 ms of noise into the loop (heard, and ringing the band), harder with Zunder and velocity
      const dur = (0.005 + 0.015 * this.rng.next()) * SR;
      this.kn = EMB_KNOCK * (0.2 + 0.8 * z) * this.vel * (this.burst ? 0.5 : 1); this.kd = Math.exp(-3 / dur);
      this.ni = (this.rng.next() * 65536) | 0;
    }
    stop(m) { this.held = false; this.kl = m && m.k > 0 ? m.k : 1; }
    // one period of the mode's tone, written into the loop (fresh: the band's state with it, so it sounds at once). The
    // second loop of level 3 a quarter period late: the pair starts as its coupling's own mode (seeded in phase, the
    // rotation sloshed the energy from side to side and the knees settled the pair 1.6 dB under level 1 – measured)
    seed(k, amp) {
      const N = this.N, M = N - 1, o = k * N, buf = this.buf, w0 = 2 * Math.PI * this.Fc[k] / SR, n = Math.min(N - 8, Math.ceil(this.D[k]) + 4), ph = k ? -Math.PI / 2 : 0;
      for (let i = 1; i <= n; i++) buf[o + ((this.w - i) & M)] = amp * Math.sin(ph - w0 * i);
      const b = 1 - this.b0[k];   // (the band's steady state for a sine at its centre: y = x)
      this.z1[k] = amp * b * Math.sin(ph); this.z2[k] = amp * (b * Math.sin(w0 + ph) + this.a1[k] * Math.sin(ph));
      this.A2[k] = amp * amp;
    }
    // per block: the loop's note (Glimmen's walk on its period, level 3's ±5 ct), its mode, the band, the delay with the
    // interpolator's phase and loss compensated at the mode, the growth σ and its weighting
    coef(k, n) {
      const p = this.p, K = this.Kx, rich = K > 1 && !this.lite, dt = n / SR;
      // Glimmen: two slow walks per loop (white noise through 1 Hz and 0.2 Hz one-poles; ≈ ±1 at 2σ)
      if (n) {
        const c1 = 1 - Math.exp(-2 * Math.PI * dt), c2 = 1 - Math.exp(-2 * Math.PI * 0.2 * dt), s = EMB_WALK / Math.sqrt(dt);   // (the noise per step scaled with the step: the same walk at any block size)
        this.gv[k] += c1 * (s * (2 * this.rng.next() - 1) - this.gv[k]); this.gw[k] += c2 * (this.gv[k] - this.gw[k]);
        this.tv[k] += c1 * (s * (2 * this.rng.next() - 1) - this.tv[k]); this.tw[k] += c2 * (this.tv[k] - this.tw[k]);
      }
      const fk = Math.min(this.f, 0.42 * SR) * cents((rich ? (k ? EMB_DET : -EMB_DET) : 0) + 2 * this.tw[k]);
      // the band on the mode m (the delay stays one period of the note: the mode is its m-th harmonic)
      const F = Math.min(this.m * fk, 0.45 * SR), Q = 8 + 12 * p.hitze, w0 = 2 * Math.PI * F / SR, al = Math.sin(w0) / (2 * Q), a0 = 1 + al;
      this.Fc[k] = F;
      // the delay: one period of the note, the 4-tap interpolator's phase error at F taken out (one correction step)
      let D = SR / fk;
      this.lgW = w0; this.lgD = D; this.lagH(); D += D - this.lpd; this.lgD = D; this.lagH();
      this.Dt[k] = Math.max(2, Math.min(this.N - 8, D));
      if (!this.D[k]) this.D[k] = this.Dt[k];
      this.G0[k] = 1 / Math.max(0.5, this.lmag);
      // the growth per second: held – Höhe (with Glühen) and Glimmen, less c·A² (the knee); a Puls gate +10/s; let go – the
      // afterglow (T60 = Nachglühen), still glimmering a little
      // (c·A² on the amplitude² smoothed over 50 ms: the knee swings in – ≈ 1 dB over, settled in ≈ 0.4 s)
      if (n) this.As[k] += (this.A2[k] - this.As[k]) * (1 - Math.exp(-dt / 0.05)); else this.As[k] = this.A2[k];
      const gl = 0.5 + p.gluehen, c = EMB_RTOP * gl, A2 = this.As[k], rl = -6.908 / Math.max(0.05, p.nachgluehen * this.kl);
      let sg;
      if (this.held && this.gate > 0) sg = 10 + 1.5 * this.gw[k] - c * A2;
      else if (this.held && !this.burst) sg = embR(this.y) * gl + 1.5 * this.gw[k] - c * A2;
      else sg = rl * (1 + 0.08 * this.gw[k]);   // (±8 % of the decay: the glow flickers, its T60 stays Nachglühen)
      sg = sg > 30 ? 30 : sg < -80 ? -80 : sg;
      this.sg[k] = sg;
      const q = Math.exp(sg / SR);
      this.b0[k] = al / a0; this.a1[k] = -2 * Math.cos(w0) / a0 * q; this.a2[k] = (1 - al) / a0 * q * q; this.b2[k] = -al / a0 * q * q;
      this.qD[k] = Math.exp(sg * this.D[k] / SR);
    }
    // the 4-tap Lagrange interpolator at delay d, at w0: its phase delay (lpd, samples) and gain (lmag)
    // (d and w0 come in fields: V8 does not inline it into coef, and each number passed to a call is a new heap object)
    lagH() {
      const d = this.lgD, w0 = this.lgW, i = d | 0, q = d - i + 1, h0 = -(q - 1) * (q - 2) * (q - 3) / 6, h1 = q * (q - 2) * (q - 3) / 2, h2 = -q * (q - 1) * (q - 3) / 2, h3 = q * (q - 1) * (q - 2) / 6;
      const c0 = w0 * (i - 1), re = h0 * Math.cos(c0) + h1 * Math.cos(c0 + w0) + h2 * Math.cos(c0 + 2 * w0) + h3 * Math.cos(c0 + 3 * w0), im = -(h0 * Math.sin(c0) + h1 * Math.sin(c0 + w0) + h2 * Math.sin(c0 + 2 * w0) + h3 * Math.sin(c0 + 3 * w0));
      let pd = -Math.atan2(im, re) / w0; const c = 2 * Math.PI / w0; pd += Math.round((d - pd) / c) * c;
      this.lpd = pd; this.lmag = Math.hypot(re, im);
    }
    lag(k) { const d = this.D[k], i = d | 0, q = d - i + 1, h = this.h, j = 4 * k; this.di[k] = i; h[j] = -(q - 1) * (q - 2) * (q - 3) / 6; h[j + 1] = q * (q - 2) * (q - 3) / 2; h[j + 2] = -q * (q - 1) * (q - 3) / 2; h[j + 3] = q * (q - 1) * (q - 2) / 6; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, two = !!(this.rich && R), K = two && !this.lite ? 2 : 1;
      if (this.gate > 0) { this.gate -= n; if (this.gate <= 0) { this.gate = 0; this.held = false; this.off = true; } }   // a Puls gate ends: the afterglow
      // Sprung: the band jumps to the new mode, seeded there from the loop's amplitude; the old mode rings out beside
      // the loop (a gliding band let the old mode die before the new one had grown: a hole of 28–83 dB, measured)
      { const m = this.mode(Math.min(this.f, 0.42 * SR));
        if (m !== this.m) {
          this.m = m;
          for (let k = 0; k < this.Kx; k++) {
            const A = Math.sqrt(this.A2[k]), F = this.Fc[k], xo = k * 1024, P = SR / (4 * F), xw = (this.xw - 1) & 1023, yb = this.xr[xo + xw], i0 = Math.round(P);
            this.hIm[k] = yb; this.hRe[k] = -this.xr[xo + ((xw - i0) & 1023)]; this.hA[k] = 1;
            const w = 2 * Math.PI * F / SR, r = Math.exp(-1 / (EMB_GHOST * SR)); this.hC[k] = r * Math.cos(w); this.hS[k] = r * Math.sin(w);
            this.coef(k, 0); this.seed(k, EMB_JUMP * A);
          }
        } }
      const hk = (1 + 4 * p.hitze) * EMB_KD, ihk = 1 / hk, bias = p.sprung === '2' ? 0.05 : 0, fl = this.held ? EMB_FLOOR * (0.25 + p.zunder) : 0;
      const xi = this.ix ? this.ix[0] : null, xj = this.ix ? this.ix[1] || this.ix[0] : null, ij = this.inj;   // (Hexenring step 4: a feeding Schleife's audio)
      const N = this.N, M = N - 1, buf = this.buf, xr = this.xr, ca = 1 - Math.exp(-1 / (0.002 * SR));
      const w0 = this.w, xw0 = this.xw, kd = this.kd;
      for (let k = 0; k < K; k++) this.coef(k, n);
      if (K === 1) {   // one loop (level 1, or level 3 after underruns): everything in locals
        const b0 = this.b0[0], a1 = this.a1[0], a2 = this.a2[0], b2 = this.b2[0], G0 = this.G0[0], qD = this.qD[0], hh = this.h;
        const Pq = SR / (4 * this.Fc[0]), Pi = Pq | 0, Pf = Pq - Pi;
        let D = this.D[0]; const dD = (this.Dt[0] - D) / n, glide = dD > 1e-4 || dD < -1e-4;
        if (!glide) D = this.D[0] = this.Dt[0];
        this.lag(0);
        let z1 = this.z1[0], z2 = this.z2[0], A2 = this.A2[0], w = w0, xw = xw0, kn = this.kn, ni = this.ni, nf = (ni + 32768) & 65535;
        let di = this.di[0], h0 = hh[0], h1 = hh[1], h2 = hh[2], h3 = hh[3];
        const gA = this.hA[0], gc = this.hC[0], gs = this.hS[0]; let gr = this.hRe[0], gi = this.hIm[0];
        for (let i = a; i < b; i++) {
          if (glide) { D += dD; this.D[0] = D; this.lag(0); di = this.di[0]; h0 = hh[0]; h1 = hh[1]; h2 = hh[2]; h3 = hh[3]; }
          const j = w + 1 - di;
          const x = qD * (h0 * buf[j & M] + h1 * buf[(j - 1) & M] + h2 * buf[(j - 2) & M] + h3 * buf[(j - 3) & M]);
          const yb = b0 * x + z1; z1 = z2 - a1 * yb; z2 = b2 * x - a2 * yb;
          xr[xw] = yb;
          // the amplitude: the band's output now and a quarter period ago
          const q0 = xr[(xw - Pi) & 1023], yq = q0 + Pf * (xr[(xw - Pi - 1) & 1023] - q0);
          A2 += ca * (yb * yb + yq * yq - A2);
          let g = G0 / tdf(hk * Math.sqrt(A2)); if (g > EMB_GMAX) g = EMB_GMAX;
          ni = (ni + 1) & 65535; nf = (nf + 1) & 65535;
          let s = g * tanh(hk * (yb + bias)) * ihk + kn * NOISE[ni] + fl * NOISE[nf];
          if (xi) s += ij * xi[i];   // (Hexenring step 4: Nähren – the Schleife is the tinder: its partials near the mode catch and glow)
          kn *= kd;
          if (s > 4) s = 4; else if (s < -4) s = -4;
          buf[w] = s; L[i] = s;
          if (gA) { const re = gr * gc - gi * gs; gi = gr * gs + gi * gc; gr = re; L[i] += gi; }
          w = (w + 1) & M; xw = (xw + 1) & 1023;
        }
        this.z1[0] = flush(z1); this.z2[0] = flush(z2); this.A2[0] = A2;
        if (gA) { this.hRe[0] = gr; this.hIm[0] = gi; if (gr * gr + gi * gi < 1e-12) this.hA[0] = 0; }
        this.w = w; this.xw = xw; this.kn = kn < 1e-6 ? 0 : kn; this.ni = ni;
      } else {
        // two loops, coupled by a rotation (κ = 0.1: each keeps √(1 − κ²) of itself and takes ±κ of the other, sample by
        // sample) – lossless whatever their phases: the pair neither grows nor dies by the coupling, as a feedback delay
        // network's orthogonal matrix (a lagged coupling, even in quadrature, added gain whenever the detuned loops passed
        // in phase: the afterglow grew back – measured)
        const cr = Math.sqrt(1 - EMB_KAP * EMB_KAP), sr = EMB_KAP, hh = this.h, b0 = this.b0, a1 = this.a1, a2 = this.a2, b2 = this.b2, z1 = this.z1, z2 = this.z2, A2 = this.A2, D = this.D, di = this.di;
        const G00 = this.G0[0], G01 = this.G0[1], qD0 = this.qD[0], qD1 = this.qD[1];
        const Pq0 = SR / (4 * this.Fc[0]), Pi0 = Pq0 | 0, Pf0 = Pq0 - Pi0, Pq1 = SR / (4 * this.Fc[1]), Pi1 = Pq1 | 0, Pf1 = Pq1 - Pi1;
        const dD0 = (this.Dt[0] - D[0]) / n, dD1 = (this.Dt[1] - D[1]) / n, glide = Math.abs(dD0) > 1e-4 || Math.abs(dD1) > 1e-4;
        if (!glide) { D[0] = this.Dt[0]; D[1] = this.Dt[1]; }
        this.lag(0); this.lag(1);
        let w = w0, xw = xw0, kn = this.kn, ni = this.ni, n1 = (ni + 7919) & 65535, nf = (ni + 32768) & 65535, nf1 = (ni + 40687) & 65535;
        const gA0 = this.hA[0], gA1 = this.hA[1];
        for (let i = a; i < b; i++) {
          if (glide) { D[0] += dD0; D[1] += dD1; this.lag(0); this.lag(1); }
          let j = w + 1 - di[0];
          const x0 = qD0 * (hh[0] * buf[j & M] + hh[1] * buf[(j - 1) & M] + hh[2] * buf[(j - 2) & M] + hh[3] * buf[(j - 3) & M]);
          j = w + 1 - di[1];
          const x1 = qD1 * (hh[4] * buf[N + (j & M)] + hh[5] * buf[N + ((j - 1) & M)] + hh[6] * buf[N + ((j - 2) & M)] + hh[7] * buf[N + ((j - 3) & M)]);
          const y0 = b0[0] * x0 + z1[0]; z1[0] = z2[0] - a1[0] * y0; z2[0] = b2[0] * x0 - a2[0] * y0;
          const y1 = b0[1] * x1 + z1[1]; z1[1] = z2[1] - a1[1] * y1; z2[1] = b2[1] * x1 - a2[1] * y1;
          xr[xw] = y0; xr[1024 + xw] = y1;
          let q = xr[(xw - Pi0) & 1023], yq = q + Pf0 * (xr[(xw - Pi0 - 1) & 1023] - q); A2[0] += ca * (y0 * y0 + yq * yq - A2[0]);
          q = xr[1024 + ((xw - Pi1) & 1023)]; yq = q + Pf1 * (xr[1024 + ((xw - Pi1 - 1) & 1023)] - q); A2[1] += ca * (y1 * y1 + yq * yq - A2[1]);
          let g0 = G00 / tdf(hk * Math.sqrt(A2[0])); if (g0 > EMB_GMAX) g0 = EMB_GMAX;
          let g1 = G01 / tdf(hk * Math.sqrt(A2[1])); if (g1 > EMB_GMAX) g1 = EMB_GMAX;
          const v0 = g0 * tanh(hk * (y0 + bias)) * ihk, v1 = g1 * tanh(hk * (y1 + bias)) * ihk;
          ni = (ni + 1) & 65535; n1 = (n1 + 1) & 65535; nf = (nf + 1) & 65535; nf1 = (nf1 + 1) & 65535;
          let sL = cr * v0 - sr * v1 + kn * NOISE[ni] + fl * NOISE[nf], sR = sr * v0 + cr * v1 + kn * NOISE[n1] + fl * NOISE[nf1];
          if (xi) { sL += ij * xi[i]; sR += ij * xj[i]; }   // (Hexenring step 4: Nähren, each side its own)
          kn *= kd;
          if (sL > 4) sL = 4; else if (sL < -4) sL = -4;
          if (sR > 4) sR = 4; else if (sR < -4) sR = -4;
          buf[w] = sL; buf[N + w] = sR; L[i] = sL; R[i] = sR;
          w = (w + 1) & M; xw = (xw + 1) & 1023;
        }
        for (let k = 0; k < 2; k++) { z1[k] = flush(z1[k]); z2[k] = flush(z2[k]); }
        // the old mode after a jump, ringing out beside the loops
        for (let k = 0; k < 2; k++) if (k ? gA1 : gA0) {
          const X = k ? R : L, gc = this.hC[k], gs = this.hS[k]; let gr = this.hRe[k], gi = this.hIm[k];
          for (let i = a; i < b; i++) { const re = gr * gc - gi * gs; gi = gr * gs + gi * gc; gr = re; X[i] += gi; }
          this.hRe[k] = gr; this.hIm[k] = gi; if (gr * gr + gi * gi < 1e-12) this.hA[k] = 0;
        }
        this.w = w; this.xw = xw; this.kn = kn < 1e-6 ? 0 : kn; this.ni = ni;
      }
      if (K === 1 && this.Kx > 1) {   // (after underruns: one loop; the second's line keeps its place)
        const o = this.N, M2 = this.N - 1; for (let i = 0; i < n; i++) buf[o + ((w0 + i) & M2)] = 0;
      }
      // the box: a low-pass (Kasten 1.5–8 kHz, never below the mode) and a gentle high-pass under the note
      const F = this.Fc[0], fc = Math.max(1500 * Math.pow(16 / 3, p.kasten), 1.25 * F), fh = Math.min(60, 0.5 * Math.min(this.f, F));
      const wl = 2 * Math.PI * Math.min(fc, 0.45 * SR) / SR, all = Math.sin(wl) / Math.SQRT2, la0 = 1 + all, lb0 = (1 - Math.cos(wl)) / 2 / la0, lb1 = 2 * lb0, la1 = -2 * Math.cos(wl) / la0, la2 = (1 - all) / la0;
      const hc = Math.exp(-2 * Math.PI * fh / SR), og = EMB_OUT * (two ? Math.SQRT1_2 : 1), lp = this.lp, hp = this.hp;
      for (let c = 0; c < (two ? 2 : 1); c++) {
        const X = c ? R : L, s = 3 * c, t = 2 * c;
        if (c && K === 1) { for (let i = a; i < b; i++) R[i] = L[i]; break; }
        let s1 = lp[s], s2 = lp[s + 1], hx = hp[t], hy = hp[t + 1];
        for (let i = a; i < b; i++) {
          const x = X[i], yv = lb0 * x + s1; s1 = lb1 * x - la1 * yv + s2; s2 = lb0 * x - la2 * yv;
          const hv = hc * (hy + yv - hx); hx = yv; hy = hv;
          X[i] = og * hv;
        }
        lp[s] = flush(s1); lp[s + 1] = flush(s2); hp[t] = hx; hp[t + 1] = flush(hy);
      }
      if (!two && R) for (let i = a; i < b; i++) R[i] = L[i];   // (a copy, not R.set(L.subarray()): a view object a block)
      else if (two) { let e = 0; for (let i = a; i < b; i++) e += R[i] * R[i]; if (!(e < 1e6)) { this.reset(); L.fill(0, a, b); R.fill(0, a, b); } }   // (the contract's guard reads the left side only)
    }
  }

