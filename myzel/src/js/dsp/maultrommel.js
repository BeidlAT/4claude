  // ---- Maultrommel: myzel-mtr – a steel tongue in a frame, the mouth as its resonator (Klangbibliothek II,
  // 26.10.2026). Plucked, the lamella swings through the frame once a period: a train of sharp pulses, every harmonic
  // nearly equally strong (a band-limited pulse – the Dirichlet kernel – softened by Klang). The player's mouth is a
  // narrow resonance that picks single harmonics out of it: moving the tongue plays a melody of overtones over the
  // drone – the jaw harp's „boing“ and „wow“. Höhe is that resonance: low on the field the 3rd harmonic, high up the
  // 16th (the tongue's brightness follows it); Mund is how narrow it is. Held, the thumb re-plucks the tongue (Zupfen per second; 0: once), the breath
  // swells and colours it (Atem). A Puls hit is one twang. ----
  const MTR_OUT = 0.3;
  class Mtr extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { zupfen: 0.35, mund: 0.6, atem: 0.35, klang: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 29);
      this.r1 = new Biquad(); this.r2 = new Biquad(); this.r3 = new Biquad(); this.lp = 0;
      this.ph = 0; this.env = 0; this.envT = 0; this.ys = this.y; this.yT = -1; this.fT = 0; this.pk = 0; this.nb = 0; this.bph = 0;
      this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(30);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const q of [this.r1, this.r2, this.r3]) q.z1 = q.z2 = 0; this.env = 0; }
    tuneMouth(f, y) {
      this.fT = f; this.yT = y;
      const F = Math.min(0.42 * SR, f * (3 + 13 * y)), q = 5 + 22 * this.p.mund;
      this.r1.bp(F, q); this.r2.bp(F, q * 0.7); this.r3.bp(Math.min(0.44 * SR, F * 1.72), 4 + 6 * this.p.mund);
      this.M = Math.max(1, Math.min(48, Math.floor(0.45 * SR / f)));
      this.gc = Math.sqrt(q) * 0.55;   // (a narrower mouth passes less: its gain holds the level)
    }
    pluck() { this.envT = 1; this.pk = Math.round(0.003 * SR); }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      this.rng = new PRNG((m.seed | 0) || 29);
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.tuneMouth(this.f, this.ys); this.pluck(); this.nb = this.p.zupfen > 0.01 ? Math.round(SR / (0.5 + 7.5 * this.p.zupfen)) : -1;
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, f = this.f, p = this.p, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.025 * SR)));
      if (Math.abs(f - this.fT) > 0.001 * f || Math.abs(this.ys - this.yT) > 0.003) this.tuneMouth(f, this.ys);
      const M = this.M, dt = f / SR, dec = Math.exp(-1 / ((0.35 + 0.9 * (1 - p.klang * 0.5)) * SR)), soft = 1 - Math.exp(-2 * Math.PI * Math.min(0.4 * SR, f * (2 + (3 + 13 * this.ys) * (0.8 + 1.6 * p.klang))) / SR);   // (the pulse's top follows the mouth: no harmonics far above the sung one)
      const g = this.gc * this.vel, at = p.atem, r1 = this.r1, r2 = this.r2, r3 = this.r3;
      let ph = this.ph, env = this.env, lp = this.lp, bph = this.bph; const og = R ? MTR_OUT * Math.SQRT1_2 : MTR_OUT;
      for (let i = a; i < b; i++) {
        // the tongue: plucked (a 3-ms rise), then it rings down; held, the thumb plucks it again
        if (this.pk > 0) { env += (this.envT - env) * 0.02; this.pk--; } else env *= dec;
        if (!this.off && this.nb > 0 && --this.nb === 0) { this.pluck(); this.nb = Math.round(SR / (0.5 + 7.5 * p.zupfen)); }
        if (this.burst && --this.gate <= 0) this.off = true;
        ph += dt; if (ph >= 1) ph -= 1;
        // the pulse train: Dirichlet kernel (M harmonics of equal height), then softened
        const sd = Math.sin(Math.PI * ph);
        let x = (Math.abs(sd) < 1e-6 ? 2 * M : Math.sin((2 * M + 1) * Math.PI * ph) / sd - 1) * 0.12;   // (each harmonic ≈ 0.24: the mouth picks one out at full height)
        lp += soft * (x - lp); x = lp;
        // the breath: a slow swell, a little air through the same mouth
        bph += 0.6 / SR; if (bph >= 1) bph -= 1;
        const br = 1 + at * 0.25 * Math.sin(2 * Math.PI * bph), air = at * 0.04 * (rng.next() * 2 - 1);
        const s = (x * env + air * (this.off ? env : 0.3 + env)) * br;   // (let go: the breath ends with the tongue)
        const m1 = r2.tick(r1.tick(s)), m2 = r3.tick(s);
        let o = this.dc.tick((0.05 * s + m1 * 1.0 + m2 * 0.15) * g);
        L[i] = o * og; if (R) R[i] = L[i];
      }
      this.ph = ph; this.env = env; this.lp = lp; this.bph = bph;
      if (this.off) this.nb = -1;
    }
  }
