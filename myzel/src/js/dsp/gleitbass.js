  // ---- Gleitbass: myzel-gbs – the 808 bass of trap (Klangbibliothek II, 26.10.2026). A sine whose pitch falls into the
  // note from above in the first tens of milliseconds (Knack: how far and how sharp – the kick inside the bass), a
  // click of the hammer, then the long body that dies in its own time (Ausklang) – and the glide: a new note while
  // the last still sounds slides from its pitch to the new one (Gleiten: how long), the 808 run. Höhe is the drive:
  // low on the field the clean sub, then tanh saturation, high up an asymmetric distortion that adds the growl
  // (antiderivative anti-aliasing: the overtones stay clean). Ton closes a low pass after the drive. ----
  const GBS_OUT = 0.26;
  const lcosh = (x) => { const a = Math.abs(x); return a + Math.log1p(Math.exp(-2 * a)) - 0.6931471805599453; };   // ∫ tanh
  class Gbs extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { knack: 0.5, ausklang: 0.6, gleiten: 0.4, ton: 0.6 };
      if (this.po.prm) this.set(this.po.prm);
      this.ph = 0; this.gl = 1; this.age = 0; this.env = 0; this.x1 = 0; this.F1 = 0; this.l1 = 0; this.l2 = 0; this.ck = 0;
      this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(8); this.relE = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; this.l1 = this.l2 = 0; this.x1 = 0; this.F1 = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.gl = m.from ? Math.max(0.25, Math.min(4, m.from / Math.max(16, m.f || this.f))) : 1;   // (legato: from the last note's pitch)
      this.legato = !!m.from; this.age = 0; this.relE = 1; this.ck = this.legato ? 0 : Math.round(0.0012 * SR);
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.02 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const kn = this.legato ? 0 : p.knack, kSemi = 4 + 20 * kn, kT = (0.012 + 0.03 * (1 - kn)) * SR;
      const T60 = (0.4 + 7 * p.ausklang * p.ausklang) * Math.max(0.5, Math.min(1.6, Math.pow(80 / f, 0.35))), dk = Math.pow(0.001, 1 / (T60 * SR));
      const glK = 1 - Math.exp(-1 / ((0.015 + 0.35 * p.gleiten * p.gleiten) * SR)), rel = Math.pow(0.001, 1 / (0.09 * SR));
      const dr = 1 + 18 * Math.pow(this.ys, 1.6), asym = Math.max(0, this.ys - 0.5) * 1.1, mk = 1 / tanh(dr * 0.9 + 0.1);
      const fc = Math.min(0.42 * SR, f * (2 + 40 * p.ton * p.ton) + 120), k = 1 - Math.exp(-2 * Math.PI * fc / SR), og = R ? GBS_OUT * Math.SQRT1_2 : GBS_OUT;
      let ph = this.ph, gl = this.gl, age = this.age, x1 = this.x1, F1 = this.F1, l1 = this.l1, l2 = this.l2, env = this.env, relE = this.relE;
      for (let i = a; i < b; i++) {
        // the pitch: the knock falls in from above, the glide slides from the last note (in the log domain)
        const knock = kn > 0 ? Math.pow(2, kSemi * Math.exp(-age / kT) / 12) : 1;
        gl = Math.exp(Math.log(gl) * (1 - glK));
        ph += f * gl * knock / SR; if (ph >= 1) ph -= 1;
        env = age === 0 ? 1 : env * dk;
        if (this.off) relE *= rel;
        age++;
        let x = Math.sin(2 * Math.PI * ph) * env * relE;
        if (this.ck > 0) { x += 0.35 * kn * (this.ck / (0.0012 * SR)); this.ck--; }
        // the drive: tanh with its antiderivative (ADAA), the asymmetry (a bias) for the even growl
        const u = (x + asym * x * x) * dr, du = u - x1;
        const y = Math.abs(du) > 1e-5 ? (lcosh(u) - F1) / du : tanh(0.5 * (u + x1));
        x1 = u; F1 = lcosh(u);
        l1 += k * (y * mk - l1); l2 += k * (l1 - l2);
        const o = this.dc.tick(l2) * this.vel * og;
        L[i] = o; if (R) R[i] = o;
      }
      this.ph = ph; this.gl = gl; this.age = age; this.x1 = x1; this.F1 = F1; this.l1 = l1; this.l2 = l2; this.env = flush(env); this.relE = flush(relE);
    }
  }
