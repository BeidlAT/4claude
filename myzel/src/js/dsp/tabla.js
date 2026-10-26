  // ---- Tabla: myzel-tbl – the dayan's loaded skin and the bayan's bending one (Klangbibliothek II, 26.10.2026). The
  // syahi (the black paste on the dayan) loads the skin so its modes fall nearly onto the harmonic series (Raman): the
  // drum has a pitch and rings like a string. Höhe is the stroke: low on the field „Tun“ (the open centre – the
  // fundamental sings), the middle „Tin“ (fundamental and harmonics), high up „Na“ (the rim – the finger stays on the
  // skin: the fundamental is damped, the second to fifth harmonics ring, a sharp click). Below the bayan's limit the
  // big drum plays: its unloaded skin (inharmonic), a little drop of pitch at the stroke, and while the finger lies the
  // heel of the hand presses the skin – moving up the field raises the pitch (gamak, up to a fifth); high strokes are
  // „Ke“, flat and dry. ----
  const TBL_OUT = 0.3;
  // dayan: ratios, and per stroke (tun, tin, na) [gain, decay]
  const TBL_D = [1, 2, 2.995, 4.02, 5.05, 1.59, 2.14];
  const TBL_S = [
    [[1, 1.4], [0.28, 0.7], [0.1, 0.5], [0.04, 0.4], [0.02, 0.3], [0.22, 0.12], [0.12, 0.1]],
    [[0.7, 0.95], [0.55, 0.8], [0.35, 0.6], [0.2, 0.45], [0.1, 0.35], [0.1, 0.1], [0.06, 0.08]],
    [[0.14, 0.11], [0.7, 0.7], [0.55, 0.5], [0.36, 0.38], [0.24, 0.3], [0.05, 0.06], [0.04, 0.05]]];
  const TBL_B = [[1, 1, 1], [1.59, 0.5, 0.32], [2.14, 0.34, 0.26], [2.3, 0.24, 0.2], [2.65, 0.17, 0.15], [2.92, 0.11, 0.12]];
  class Tbl extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { syahi: 0.6, nachklang: 0.5, bayan: 0.5, gamak: 0.6 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 19);
      this.md = TBL_D.map(() => ({ r: new Reso(), g: 0, ratio: 1, t: 0.5 }));
      this.bmd = TBL_B.map((b) => ({ r: new Reso(), g: 0, ratio: b[0], t: 0.5 }));
      this.ba = false; this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.kN = 0; this.kI = 0; this.bp = new Biquad();
      this.drop = 1; this.heel = 1; this.vel = 0.75; this.y0 = 0.5; this.dmul = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const m of this.md.concat(this.bmd)) m.r.re = m.r.im = 0; this.exN = this.kN = 0; this.bp.z1 = this.bp.z2 = 0; }
    // the stroke's weights (tun 0 … tin 0.5 … na 1), the syahi's load (less: the skin's own inharmonic modes speak)
    strokeD() {
      const y = Math.max(0, Math.min(1, this.y0)), k = y < 0.5 ? 0 : 1, u = y < 0.5 ? y * 2 : y * 2 - 1, A = TBL_S[k], B = TBL_S[k + 1], sy = this.p.syahi, nk = (0.3 + 1.4 * this.p.nachklang) * this.dmul;
      this.md.forEach((m, i) => {
        m.g = A[i][0] + (B[i][0] - A[i][0]) * u; m.t = (A[i][1] + (B[i][1] - A[i][1]) * u) * nk;
        if (i >= 5) m.g *= 2.2 - 1.8 * sy; else if (i > 0) m.g *= 0.5 + 0.7 * sy;
        m.ratio = i < 5 ? 1 + (TBL_D[i] - 1) * (0.985 + 0.015 * sy) : TBL_D[i];
      });
    }
    strokeB() {
      const ke = Math.max(0, Math.min(1, (this.y0 - 0.45) / 0.45)), nk = (0.4 + 1.2 * this.p.nachklang) * (1 - 0.85 * ke) * this.dmul;
      this.bmd.forEach((m, i) => { m.g = TBL_B[i][1] * (i ? 1 + ke : 1); m.t = TBL_B[i][2] * nk; });
    }
    tune(f) {
      this.fT = f;
      const lim = 0.45 * SR;
      if (this.ba) { const fb = f * this.drop * this.heel; for (const m of this.bmd) { const fr = fb * m.ratio; if (fr < lim) m.r.set(fr, m.t); else m.g = 0; } }
      else for (const m of this.md) { const fr = f * m.ratio; if (fr < lim && !(this.lite && m.ratio > 4.5)) m.r.set(fr, m.t); else m.g = 0; }
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dmul = m.dmul || 1;
      this.rng = new PRNG((m.seed | 0) || 19);
      this.ba = this.f < 110 + 120 * this.p.bayan;
      if (this.ba) { this.strokeB(); this.drop = 1.26; } else this.strokeD();
      this.heel = 1; this.tune(this.f);
      const hard = this.ba ? this.y0 : Math.max(0, this.y0 - 0.2) / 0.8;
      this.exN = Math.max(6, Math.round((0.0016 - 0.0012 * hard) * SR)); this.exI = 0; this.exA = 2 * this.vel / this.exN;
      this.kN = Math.round(0.004 * SR); this.kI = 0; this.kA = (0.15 + 0.6 * hard) * this.vel * (this.ba ? 0.6 : 1); this.bp.bp(this.ba ? 1200 : 3400, 1.2);
    }
    render(L, R, a, b) {
      // the bayan: the stroke's drop of pitch (50 ms), the heel (the field's height above where the stroke began)
      if (this.ba) {
        const n = b - a; this.drop = 1 + (this.drop - 1) * Math.exp(-n / (0.05 * SR));
        const hT = Math.pow(2, (7 * this.p.gamak * Math.max(0, this.y - this.y0)) / 12); this.heel += (hT - this.heel) * (1 - Math.exp(-n / (0.03 * SR)));
        this.tune(this.f);
      } else if (Math.abs(this.f - this.fT) > 0.001 * this.fT) this.tune(this.f);
      const md = this.ba ? this.bmd : this.md, nm = md.length, rng = this.rng, bp = this.bp, og = R ? TBL_OUT * Math.SQRT1_2 : TBL_OUT;
      let exI = this.exI, kI = this.kI;
      for (let i = a; i < b; i++) {
        let x = 0;
        if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        let s = 0; for (let k = 0; k < nm; k++) { const m = md[k]; if (m.g) s += m.r.tick(x) * m.g; }
        if (kI < this.kN) { s += bp.tick(rng.next() * 2 - 1) * this.kA * Math.pow(1 - kI / this.kN, 2); kI++; }
        L[i] = s * og; if (R) R[i] = L[i];
      }
      this.exI = exI; this.kI = kI;
      for (const m of md) { m.r.re = flush(m.r.re); m.r.im = flush(m.r.im); }
    }
  }
