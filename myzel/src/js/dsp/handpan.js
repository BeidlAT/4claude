  // ---- Handpan: myzel-hng – a steel tone field (Klangbibliothek II, 26.10.2026). A handpan's field is hammered so
  // that its modes are harmonic: the fundamental, the octave and the compound fifth (×3) – each mode a pair of nearly
  // equal frequencies (the field is never perfectly round), so every partial shimmers slowly; the shell answers with
  // a few inharmonic modes that die fast, and the air in the body (the Helmholtz „Gu“, ≈ 90 Hz) with a soft low
  // thump. Höhe is where the hand strikes: low on the field the thumb in the middle (a soft, wide force – the
  // fundamental and the body), high up the fingertip at the edge (a short, hard force – octave, fifth and shell
  // ring out, a little skin). Struck only; the field rings for seconds (Nachklang, longer in the low register). ----
  const HNG_OUT = 0.16;
  // [ratio, centre gain, edge gain, decay share, split share]
  const HNG_M = [[1, 1, 0.45, 1, 1], [2, 0.38, 0.85, 0.72, 0.8], [3, 0.14, 0.55, 0.48, 0.6],
    [2.47, 0.045, 0.3, 0.12, 0], [3.68, 0.03, 0.24, 0.09, 0], [5.09, 0.018, 0.18, 0.06, 0], [6.85, 0.01, 0.12, 0.045, 0]];
  class Hng extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { glanz: 0.5, nachklang: 0.5, koerper: 0.5, schweben: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 11);
      this.md = [];
      HNG_M.forEach((m, i) => { const n = m[4] > 0 ? 2 : 1; for (let j = 0; j < n; j++) this.md.push({ i, j, n, r: new Reso(), g: 0, pan: this.rich ? (i % 2 ? 0.3 : -0.3) * (j ? -1 : 1) : 0 }); });
      this.gu = new Reso(); this.guF = 86 + 12 * this.rng.next(); this.guG = 0;
      this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.nzN = 0; this.nzI = 0; this.nzA = 0; this.hp = 0;
      this.vel = 0.75; this.y0 = 0.5; this.dmul = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const m of this.md) m.r.re = m.r.im = 0; this.gu.re = this.gu.im = 0; this.exN = this.nzN = 0; }
    // the modes for this pitch (again when the pitch moves more than a tenth of a percent – a bend, a glide)
    tune(f) {
      this.fT = f;
      const p = this.p, base = (2 + 10 * p.nachklang) * this.dmul * Math.max(0.6, Math.min(1.5, Math.pow(220 / f, 0.3))), y = this.y0;
      const sp = (0.0005 + 0.0032 * p.schweben) / 2, br = 0.4 + 1.2 * p.glanz, lim = 0.45 * SR;
      for (const m of this.md) {
        const M = HNG_M[m.i], fr = f * M[0] * (m.n > 1 ? 1 + (m.j ? sp : -sp) * M[4] : 1);
        if (fr >= lim || (this.lite && m.i >= 5)) { m.g = 0; continue; }
        m.r.set(fr, base * M[3]);
        m.g = (M[1] * (1 - y) + M[2] * y) * (m.i ? br : 1) / m.n;
      }
      this.gu.set(this.guF, 0.55); this.guG = 0.35 * p.koerper * (1 - 0.7 * y);
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dmul = m.dmul || 1;   // (dmul: a Puls hit rings shorter)
      this.rng = new PRNG((m.seed | 0) || 11);
      this.tune(this.f);
      // the force: a raised cosine, wide for the thumb (5 ms), short for the fingertip (0.7 ms); its area is the velocity
      this.exN = Math.max(8, Math.round((0.0007 + 0.0045 * (1 - this.y0)) * SR)); this.exI = 0; this.exA = 2 * this.vel / this.exN;
      // the skin of a finger at the edge
      this.nzN = this.y0 > 0.55 ? Math.round(0.003 * SR) : 0; this.nzI = 0; this.nzA = 0.5 * (this.y0 - 0.55) * this.vel;
    }
    render(L, R, a, b) {
      if (Math.abs(this.f - this.fT) > 0.001 * this.fT) this.tune(this.f);
      const md = this.md, nm = md.length, gu = this.gu, guG = this.guG, rng = this.rng, og = R ? HNG_OUT * Math.SQRT1_2 : HNG_OUT;   // (two channels: each at −3 dB, as a mono voice reaches the panner)
      let exI = this.exI, hp = this.hp, nzI = this.nzI;
      for (let i = a; i < b; i++) {
        let x = 0;
        if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        let sl = 0, sr = 0;
        for (let k = 0; k < nm; k++) { const m = md[k]; if (!m.g) continue; const s = m.r.tick(x) * m.g; sl += s * (1 - m.pan); sr += s * (1 + m.pan); }
        const g = gu.tick(x) * guG; sl += g; sr += g;
        if (nzI < this.nzN) { const nz = rng.next() * 2 - 1, h = nz - hp; hp = nz; const e = this.nzA * (1 - nzI / this.nzN); sl += h * e; sr += h * e; nzI++; }
        L[i] = sl * og; if (R) R[i] = sr * og;
      }
      this.exI = exI; this.hp = hp; this.nzI = nzI;
      for (const m of md) { m.r.re = flush(m.r.re); m.r.im = flush(m.r.im); }
    }
  }
