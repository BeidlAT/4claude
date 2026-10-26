  // ---- Westküste: myzel-wkg – the West Coast's complex oscillator, wavefolder and low pass gate (Klangbibliothek II,
  // 26.10.2026). A carrier (a sine, a little triangle in it) frequency-modulated by its modulator (Verhältnis: 1, 1.5,
  // 2, 3, 3.5 × the note, FM: how deep), then folded – the wave is driven into a sine fold again and again, every
  // fold adds harmonics in a bright, rubbery way (Faltung, and Höhe on top) –, then the low pass gate: a vactrol that
  // opens filter and level together, fast, and closes slowly and unevenly (Vaktrol: how long) – the „Buchla bongo“.
  // Struck (a touch, a Puls hit) it pings; held, the gate stays open while the finger lies and closes when it lifts.
  // Höhe is the fold: low on the field round and woody, high up a buzzing, glassy wall of harmonics. ----
  const WKG_OUT = 0.32, WKG_R = [1, 1.5, 2, 3, 3.5];
  class Wkg extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { faltung: 0.4, fm: 0.3, verhaeltnis: 0.25, vaktrol: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.ph = 0; this.pm = 0; this.g = 0; this.gT = 0; this.l1 = 0; this.l2 = 0; this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0; this.ping = 0;
      this.dc = new DcBlock(15);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.g = 0; this.l1 = this.l2 = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.ping = Math.round(0.004 * SR);   // (the strike: the vactrol flashes open)
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.02 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const ri = Math.min(4, Math.round(p.verhaeltnis * 4)), r = WKG_R[ri], idx = 3.5 * p.fm * p.fm, fold = 1 + 7 * Math.pow(Math.min(1, p.faltung * 0.6 + this.ys * 0.8), 1.4) * Math.min(1, 1400 / f);   // (high notes fold less: their harmonics would fold past Nyquist)
      const dt = f / SR, dm = f * r / SR, og = R ? WKG_OUT * Math.SQRT1_2 : WKG_OUT;
      // the vactrol: opens in ≈ 2 ms, closes in two parts (fast, then a long tail – Vaktrol scales it)
      const up = 1 - Math.exp(-1 / (0.002 * SR)), dn1 = 1 - Math.exp(-1 / ((0.05 + 0.25 * p.vaktrol) * SR)), dn2 = 1 - Math.exp(-1 / ((0.3 + 1.6 * p.vaktrol) * SR));
      let ph = this.ph, pm = this.pm, g = this.g, l1 = this.l1, l2 = this.l2;
      for (let i = a; i < b; i++) {
        const tgt = this.ping > 0 ? 1 : this.off || this.burst ? 0 : 0.78;
        if (this.ping > 0) this.ping--;
        g += (tgt - g) * (tgt > g ? up : g > 0.35 ? dn1 : dn2);
        pm += dm; if (pm >= 1) pm -= 1;
        ph += dt * (1 + idx * Math.sin(2 * Math.PI * pm) * 0.35); if (ph >= 1) ph -= 1; else if (ph < 0) ph += 1;
        const c = Math.sin(2 * Math.PI * ph) * 0.85 + (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph) * 0.15;
        // the fold: sin(π/2 · k · x) folds the wave back on itself the more k drives it
        let x = Math.sin(1.5707963 * fold * c) * (0.6 + 0.4 / fold);
        // the low pass gate: the vactrol's level sets the cut-off (40 Hz … 14 kHz) and the gain at once
        const fc = 40 + 14000 * g * g, k = 1 - Math.exp(-2 * Math.PI * Math.min(fc, 0.45 * SR) / SR);
        l1 += k * (x - l1); l2 += k * (l1 - l2);
        const o = this.dc.tick(l2 * g * this.vel);
        L[i] = o * og; if (R) R[i] = o * og;
      }
      this.ph = ph; this.pm = pm; this.g = g; this.l1 = l1; this.l2 = l2;
    }
  }
