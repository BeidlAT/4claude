  // ---- Böe: myzel-aeol – an aeolian harp whose strings catch the wind (SPEC §3.4) ----
  // The harmonics k·f of a string (level 1 eight, level 3 fourteen), each a complex-rotation resonator. The wind sheds
  // vortices at f_shed = f·(0.7 + 7w), w = Höhe·(0.5 + Wind) + a slow walk + gusts. One string at a time catches the
  // shedding (lock-in): once f_shed comes within ±band of k·f (band 6–25 %, Fang) it is pulled onto k·f, and the
  // string keeps it until f_shed is 1.6 bands away (hysteresis). The caught string is driven by the wind's noise and,
  // as the shedding locks to its motion, fed in phase: its damping turns into growth until it sings at the wind's
  // strength (it swells in ≈ 0.1 s – 25 nepers/s at most; at 12 a string caught from its neighbour's leak rose only
  // 8.5 dB within 150 ms in one of 20 tries – and holds: a noise-driven band alone fades in and out at random,
  // measured: 10 % of the time 10 dB under its mean). Its neighbours leak at −20 dB; the fundamental always gets a
  // little (−18 dB): between the harmonics the wind only brushes the strings, never silent. A string let go rings on
  // (Nachklang; upper ones shorter, Dunkel shorter still): the chord of memory. The wind itself: a band at the shedding
  // frequency (Rauschen; ≈ 12 % wide, as the wake of a wire) and a soft broadband air that swells with the gusts.
  // Level 3: the odd strings louder left, the even ones right (each side hears the other's a quarter period late:
  // two coherent channels would sum louder in the voice's panner), a second wind for the right.
  const AEOL_OUT = 0.455, AEOL_TILT = 0.5, AEOL_GROW = 25, AEOL_WALK = 0.15, AEOL_G0 = 0.4, AEOL_AIR = 9, AEOL_PLUCK = 4, AEOL_BO = 0.15, AEOL_BW = 3.6, AEOL_L3 = 1.06, AEOL_KAPPA = 0.25, AEOL_BT = 0.2, AEOL_LOCK = 1.2;
  const AEOL_WB = 1 / Math.sqrt(1 - Math.pow(0.001, 2 / (0.02 * SR)));   // the wind band's level as SPEC's (a T60 of 20 ms), whatever its width
  const AEOL_FMAX = Math.min(0.45 * SR, 18000);   // strings above are left out
  class Aeol extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po;
      this.rich = !!po.rich;
      const K = this.K = this.rich ? 14 : 8;
      // per string: its state, cos/sin of k·ω, natural radius and decay rate, excitation gain (normalised: every string
      // as loud whatever its ring), excitation and coefficients this block, the quarter-period all-pass (level 3)
      this.re = new Float64Array(K); this.im = new Float64Array(K); this.cw = new Float64Array(K); this.sw = new Float64Array(K);
      this.rk = new Float64Array(K); this.sg = new Float64Array(K); this.gk = new Float64Array(K); this.ex = new Float64Array(K);
      this.ca = new Float64Array(K); this.sa = new Float64Array(K); this.apa = new Float64Array(K); this.apx = new Float64Array(K); this.apy = new Float64Array(K);
      this.nb = new Float64Array(128); this.sL = new Float64Array(128); this.sR = new Float64Array(128);
      this.tf = new Float64Array(3); this.tp = new Float64Array(3);
      this.p = { wind: 0.4, boeen: 0.4, nachklang: 3, rauschen: 0.3, fang: 0.3, dunkel: 0.3 };
      this.rng = new PRNG(po.seed || 13);
      if (po.prm) this.set(po.prm);
      this.vel = 0.75; this.burst = false; this.gate = 0; this.park = 1;
      this.reset();
    }
    reset() {
      this.re.fill(0); this.im.fill(0); this.apx.fill(0); this.apy.fill(0);
      this.wr = this.wi = this.vr = this.vi = this.wq1 = this.wq2 = this.vq1 = this.vq2 = 0; this.ah = this.ah2 = this.al = this.bh = this.bh2 = this.bl = 0;
      this.wa = 0; this.gT = this.gu = 0; this.cap = 0; this.fs = 0; this.rt = 0; this.fc = 0; this.dirty = true;
      this.n1 = this.n1 || 0x2468ACE1; this.n2 = this.n2 || 0x1357BDF3;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.dirty = true; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      if (m.seed) this.rng = new PRNG(m.seed);
      if (m.y != null) this.y = m.y;
      const rng = this.rng;
      // the two winds' noise: the second state scrambled (two successive xorshift states are one sequence a sample apart –
      // after the narrow bands the sides came out 99.6 % correlated, measured)
      this.n1 = ((rng.next() * 4294967296) | 0) || 0x2468ACE1; this.n2 = (Math.imul(this.n1 ^ 0x5BD1E995, 0x27D4EB2D) ^ 0x7F4A7C15) || 0x1357BDF3;
      this.gate = this.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      this.park = 1 + Math.round(5 * Math.min(1, Math.max(0, this.y)));   // a Puls gust parks the shedding on a string by the height
      // the touch is an initial gust (Anschlag): it lifts the shedding a little above the finger's string and settles –
      // 0.4·vel (SPEC: vel; at 0.75 that swept 3 → 4 → 5 → 6 and back, the finger's own string caught only after 1.6 s,
      // measured; now 3 → 4 → 3 in 1.1 s)
      this.gT = this.burst ? this.vel : AEOL_G0 * this.vel; this.gu = 0; this.bt = 0;
      this.tg = 2 + 6 * rng.next();
      this.w0 = 0; this.w1 = 2 * rng.next() - 1; this.wt = 0; this.wd = 5 + 15 * rng.next();   // the walk starts where the finger is
      for (let j = 0; j < 3; j++) { this.tf[j] = [0.11, 0.27, 0.53][j] * (0.75 + 0.5 * rng.next()); this.tp[j] = 2 * Math.PI * rng.next(); }
      this.cap = 0; this.fs = 0; this.dirty = true;
      if (this.burst) {   // the gust-pluck: an impulse into every string (in band: an impulse is flat), ∝ k^−0.8 as a plucked string
        this.coef();
        for (let k = 0; k < this.K; k++) if ((k + 1) * this.f < AEOL_FMAX) this.re[k] += AEOL_PLUCK * this.vel * (rng.next() < 0.5 ? -1 : 1) * (0.7 + 0.3 * rng.next()) * Math.pow(k + 1, -0.8);
      }
    }
    stop() { this.cap = 0; }
    // the strings' rotation (cos/sin of k·ω by the Chebyshev recursion: one cos/sin per change of f), their rings and
    // excitation gains (when a knob or the note changed)
    coef() {
      const f = this.f, K = this.K;
      if (f !== this.fc) {
        const w = 2 * Math.PI * f / SR, c1 = Math.cos(w), s1 = Math.sin(w);
        let cp = 1, sp = 0, cn = c1, sn = s1;
        for (let k = 0; k < K; k++) {
          this.cw[k] = cn; this.sw[k] = sn;
          const t = sn / (1 + cn); this.apa[k] = (1 - t) / (1 + t);   // the all-pass that is −90° at k·f
          const c2 = 2 * c1 * cn - cp, s2 = 2 * c1 * sn - sp; cp = cn; sp = sn; cn = c2; sn = s2;
        }
        this.fc = f;
      }
      if (this.dirty) {
        const p = this.p, T = this.burst ? Math.min(p.nachklang, 1.5) : p.nachklang;   // (a Puls gust rings ≤ 1.5 s: lanes)
        for (let k = 0; k < K; k++) {
          // SPEC: T60_k = Nachklang·(1 − 0.5·(k−1)/8)·(1 − 0.6·Dunkel·(k−1)/8) – the slope of level 1's eight continued
          // for level 3's upper strings (the first eight ring alike on both levels)
          const t60 = Math.max(0.05, T * Math.max(0.2, 1 - 0.5 * k / 8) * Math.max(0.2, 1 - 0.6 * p.dunkel * k / 8)), r = Math.exp(-6.907755 / (t60 * SR));
          this.rk[k] = r; this.sg[k] = 6.907755 / t60; this.gk[k] = Math.sqrt(1 - r * r) * Math.pow(k + 1, -AEOL_TILT);   // (SPEC's 1/√k: the field's level within 1.7 dB, measured)
        }
        this.dirty = false;
      }
    }
    render(L, R, a, b) {
      const p = this.p, n = b - a, dt = n / SR, two = !!(this.rich && R);
      if (this.nb.length < n) { this.nb = new Float64Array(n); this.sL = new Float64Array(n); this.sR = new Float64Array(n); }
      const nb = this.nb, sL = this.sL, sR = this.sR, rng = this.rng;
      const f = this.f, K = this.K, Ku = this.lite && K > 6 ? 6 : K, Kav = Math.min(Ku, Math.floor(AEOL_FMAX / f));   // (after underruns: six strings)
      this.coef();
      // the Puls gate; the wind comes in over 20 ms and goes over 0.3 s (SPEC) once the finger lifts or the gate ends
      if (this.burst && this.gate > 0) { this.gate -= n; if (this.gate <= 0) { this.gate = 0; this.off = true; this.stop(); } }
      this.wa = this.off ? Math.max(0, this.wa - dt / 0.3) : Math.min(1, this.wa + dt / 0.02);
      const wa = this.wa;
      // gusts at random every 2–8 s, Böen their size; each rises in ≈ 0.1 s and dies away over 0.5 s
      if (!this.off && !this.burst) { this.tg -= dt; if (this.tg <= 0) { this.gT += p.boeen * (0.4 + 0.6 * rng.next()); this.tg = 2 + 6 * rng.next(); } }
      this.gT *= Math.exp(-dt / 0.5); this.gu += (1 - Math.exp(-dt / 0.08)) * (this.gT - this.gu);
      const gu = this.gu;
      // the walk: waypoint to waypoint 5–20 s apart (a raised cosine), ±0.15 at Böen 0.4 (SPEC), calmer or wilder with Böen
      this.wt += dt; if (this.wt >= this.wd) { this.w0 = this.w1; this.w1 = 2 * rng.next() - 1; this.wt = 0; this.wd = 5 + 15 * rng.next(); }
      const walk = (this.w0 + (this.w1 - this.w0) * 0.5 * (1 - Math.cos(Math.PI * this.wt / this.wd))) * AEOL_WALK * Math.min(1.6, 0.25 + 1.875 * p.boeen);
      // turbulence: three slow sines (≈ 0.1–0.7 Hz, per note) – how strongly the caught string sings, the wind's level
      for (let j = 0; j < 3; j++) this.tp[j] = (this.tp[j] + 2 * Math.PI * this.tf[j] * dt) % (2 * Math.PI);
      const turb = (Math.sin(this.tp[0]) + Math.sin(this.tp[1]) + Math.sin(this.tp[2])) / 3;
      // the shedding, in harmonics of f
      let ratio = 0.7 + 7 * (this.y * (0.5 + p.wind) + walk + gu);
      ratio = ratio < 0.35 ? 0.35 : ratio > 40 ? 40 : ratio;
      this.rt = ratio;
      // capture: one string at a time, with hysteresis (a Puls gust: parked on its string for the gate)
      const band = 0.06 + 0.19 * p.fang;
      let cap = this.cap;
      if (this.off || Kav < 1) cap = 0;
      else if (this.burst) cap = Math.min(this.park, Kav);
      else {
        if (cap && (cap > Kav || Math.abs(ratio / cap - 1) > 1.6 * band)) cap = 0;
        if (!cap) { const k = Math.round(ratio); if (k >= 1 && k <= Kav && Math.abs(ratio / k - 1) < band) cap = k; }
      }
      this.cap = cap;
      // the shedding frequency: pulled onto the caught string, glides there in ≈ 25 ms
      const fsT = (cap || ratio) * f;
      this.fs = this.fs > 0 ? this.fs + (1 - Math.exp(-dt / 0.025)) * (fsT - this.fs) : fsT;
      // drive: the wind, stronger in a gust; a Puls gust: ×12·vel at its onset (SPEC), dying away over ≈ 0.2 s to the
      // wind's own (held for the whole gate the parked string rose on: +8.8 dB over a held note at 0.5 s, measured)
      const bz = this.burst ? Math.exp(-this.bt / AEOL_BT) : 0; if (this.burst) this.bt += dt;
      const dr = wa * (this.burst ? Math.max(1, 12 * this.vel * bz) : 1 + gu);
      const ex = this.ex, gk = this.gk, re = this.re, im = this.im, cw = this.cw, sw = this.sw, ca = this.ca, sa = this.sa, rk = this.rk;
      ex.fill(0);
      if (dr > 0 && Kav >= 1) { ex[0] = 0.12; if (cap) { ex[cap - 1] += 1; if (cap > 1) ex[cap - 2] += 0.1; if (cap < Kav) ex[cap] += 0.1; } }
      for (let k = 0; k < K; k++) { ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0; ca[k] = rk[k] * cw[k]; sa[k] = rk[k] * sw[k]; }
      // the lock-in: the caught string's loss turns into growth below the strength it sings at (AEOL_LOCK × √2 × the RMS
      // its noise alone would reach; ±50 % with the turbulence), into a little more loss above it; once it sings, the
      // shedding is locked to it and the noise drives it at a quarter (a noise-driven band wanders in pitch within its
      // width: ±0.4 Hz, at 55 Hz ±12 ct)
      if (cap) {
        const k = cap - 1, e2 = re[k] * re[k] + im[k] * im[k], A = AEOL_LOCK * 0.577 * Math.pow(cap, -AEOL_TILT) * dr * (1 + 0.5 * turb), q = e2 / (A * A + 1e-30);
        let mu = AEOL_GROW * (1 - q);
        const lo = -Math.max(2, this.sg[k]); mu = mu < lo ? lo : mu > AEOL_GROW ? AEOL_GROW : mu;
        const rho = Math.exp(mu / SR); ca[k] = rho * cw[k]; sa[k] = rho * sw[k];
        ex[k] *= AEOL_KAPPA + (1 - AEOL_KAPPA) * (q < 1 ? 1 - q : 0);
      }
      // the wind band at the shedding frequency: 40 Hz + 12 % wide, its level independent of its width; through 1 − z⁻²
      // (zeros at DC and Nyquist, ÷ its gain 2·sin ω at the band: the resonator alone leaks −12 dB at DC from a 300-Hz band)
      const fw = Math.min(this.fs, 0.45 * SR), rw = Math.exp(-Math.PI * (40 + 0.12 * fw) / SR), ww = 2 * Math.PI * fw / SR, wk = 0.5 / Math.max(0.02, Math.sin(ww));
      const wc = rw * Math.cos(ww), ws = rw * Math.sin(ww), wg = Math.sqrt(1 - rw * rw) * AEOL_WB * 0.3 * p.rauschen * wa * (this.burst ? 1 + (AEOL_BW - 1) * bz : 1 + 1.5 * gu) * (1 + 0.25 * turb);
      // the air: noise between 150 Hz (second order) and 300 Hz–2.8 kHz (brighter with more wind), swelling with the gusts
      const ax = ratio > 8 ? 1 : ratio / 8, hc = 1 - Math.exp(-2 * Math.PI * 150 / SR), lc = 1 - Math.exp(-2 * Math.PI * (300 + 2500 * ax) / SR);
      const ag = AEOL_AIR * 0.3 * p.rauschen * wa * (0.3 + 0.7 * ax) * (this.burst ? 1 + (1.5 * AEOL_BW - 1) * bz : 1 + 2 * gu);
      // noise, wind and air (left; level 3: a second wind on the right)
      let s1 = this.n1, wr = this.wr, wi = this.wi, w1 = this.wq1, w2 = this.wq2, ah = this.ah, ah2 = this.ah2, al = this.al;
      for (let j = 0; j < n; j++) {
        s1 ^= s1 << 13; s1 ^= s1 >>> 17; s1 ^= s1 << 5;
        const x = s1 * 4.656612873e-10; nb[j] = x;
        const t = wr * wc - wi * ws + x * wg; wi = wr * ws + wi * wc; wr = t;
        const d = wi - w2; w2 = w1; w1 = wi;
        ah += hc * (x - ah); const u = x - ah; ah2 += hc * (u - ah2); al += lc * (u - ah2 - al);
        sL[j] = wk * d + ag * al;
      }
      this.n1 = s1; this.wr = flush(wr); this.wi = flush(wi); this.wq1 = flush(w1); this.wq2 = flush(w2); this.ah = flush(ah); this.ah2 = flush(ah2); this.al = flush(al);
      if (two) {
        let s2 = this.n2, vr = this.vr, vi = this.vi, v1 = this.vq1, v2 = this.vq2, bh = this.bh, bh2 = this.bh2, bl = this.bl;
        for (let j = 0; j < n; j++) {
          s2 ^= s2 << 13; s2 ^= s2 >>> 17; s2 ^= s2 << 5;
          const x = s2 * 4.656612873e-10;
          const t = vr * wc - vi * ws + x * wg; vi = vr * ws + vi * wc; vr = t;
          const d = vi - v2; v2 = v1; v1 = vi;
          bh += hc * (x - bh); const u = x - bh; bh2 += hc * (u - bh2); bl += lc * (u - bh2 - bl);
          sR[j] = wk * d + ag * bl;
        }
        this.n2 = s2; this.vr = flush(vr); this.vi = flush(vi); this.vq1 = flush(v1); this.vq2 = flush(v2); this.bh = flush(bh); this.bh2 = flush(bh2); this.bl = flush(bl);
      }
      // the strings (a silent one that is not driven is skipped)
      for (let k = 0; k < K; k++) {
        let r0 = re[k], i0 = im[k];
        const e = ex[k];
        if (e === 0 && r0 * r0 + i0 * i0 < 1e-14) { re[k] = im[k] = 0; continue; }
        const c = ca[k], s = sa[k];
        if (!two) {
          for (let j = 0; j < n; j++) { const t = r0 * c - i0 * s + nb[j] * e; i0 = r0 * s + i0 * c; r0 = t; sL[j] += i0; }
        } else {   // odd strings louder left, even right (equal power: 1.31 and 0.53); the softer side through the all-pass
          const A = this.apa[k], X = k & 1 ? sL : sR, Y = k & 1 ? sR : sL;
          let x1 = this.apx[k], y1 = this.apy[k];
          for (let j = 0; j < n; j++) {
            const t = r0 * c - i0 * s + nb[j] * e; i0 = r0 * s + i0 * c; r0 = t;
            const q = -A * i0 + x1 + A * y1; x1 = i0; y1 = q;
            Y[j] += 1.31 * i0; X[j] += 0.53 * q;
          }
          this.apx[k] = flush(x1); this.apy[k] = flush(y1);
        }
        re[k] = flush(r0); im[k] = flush(i0);
      }
      // out (a stereo voice passes its panner at full gain, a mono one at −3 dB; level 3 +0.5 dB: the effects' auto-pan
      // folds a level-1 voice's coherent sides up to 1.4 dB louder, measured −1 dB on the standard phrase without this, ±0.3
      // dry), a Puls gust ×0.15 inside (its pluck and its strings driven ×9 stand up to 16 dB over a held note: the knee
      // would bend them; the voice's envelope gives it back, BOE_BURST), a soft knee above 0.5
      const og = (two ? AEOL_OUT * Math.SQRT1_2 * AEOL_L3 : AEOL_OUT) * (this.burst ? AEOL_BO : 1);
      for (let j = 0; j < n; j++) {
        let v = og * sL[j]; if (v > 0.5 || v < -0.5) v = v > 0 ? 0.5 + 0.5 * tanh(2 * v - 1) : -0.5 - 0.5 * tanh(-2 * v - 1);
        L[a + j] = v;
        if (two) { let u = og * sR[j]; if (u > 0.5 || u < -0.5) u = u > 0 ? 0.5 + 0.5 * tanh(2 * u - 1) : -0.5 - 0.5 * tanh(-2 * u - 1); R[a + j] = u; }
        else if (R) R[a + j] = v;
      }
    }
  }

