  // ---- Gamelan: myzel-gml – a bronze key over its resonator tube (Klangbibliothek II, 26.10.2026). A free bar's modes
  // (1, 2.76, 5.40, 8.93), the tube under it lengthens the fundamental. A gamelan's instruments come in pairs tuned a
  // few hertz apart – pengumbang and pengisep – so every note beats (Ombak, the „wave“), at the same rate across the
  // whole register (the pair is tuned in hertz, not in cents: 0 … 10 Hz). Höhe is the mallet: low on the field the
  // padded mallet of the gendèr (round, the fundamental), high up the horn of the saron (bright, a knock of wood).
  // A new stroke can damp the note before (the player's hand, „tutupan“: the engine sends {damp}). ----
  const GML_OUT = 0.2;
  // [ratio, soft gain, hard gain, decay share]
  const GML_M = [[1, 1, 1, 1], [2.76, 0.16, 0.62, 0.34], [5.4, 0.05, 0.44, 0.17], [8.93, 0.018, 0.28, 0.09]];
  class Gml extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { ombak: 0.65, nachklang: 0.5, schlegel: 0.5, daempfen: 0.6 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 13);
      this.md = []; for (let i = 0; i < GML_M.length; i++) for (let j = 0; j < 2; j++) this.md.push({ i, j, r: new Reso(), g: 0 });
      this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.kN = 0; this.kI = 0; this.bp = new Biquad(); this.vel = 0.75; this.y0 = 0.5; this.dm = 1; this.dmT = 1; this.dmul = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const m of this.md) m.r.re = m.r.im = 0; this.exN = this.kN = 0; this.bp.z1 = this.bp.z2 = 0; }
    tune(f) {
      this.fT = f;
      const p = this.p, y = this.y0, hard = Math.min(1, Math.max(0, p.schlegel * 0.6 + y * 0.8 - 0.2));
      const base = (1.4 + 8 * p.nachklang) * this.dmul * Math.max(0.5, Math.min(2, Math.pow(300 / f, 0.55))) * this.dm, beat = Math.min(10 * p.ombak, f * 0.012), lim = 0.45 * SR;   // (the pair a beat apart in hertz – low down at most ≈ 20 cents: never a wrong note)
      for (const m of this.md) {
        const M = GML_M[m.i], fr = (f + (m.j ? 0.5 : -0.5) * beat) * M[0];   // (pengumbang below, pengisep above: the note in the middle)
        if (fr >= lim || (this.lite && m.i === 3)) { m.g = 0; continue; }
        m.r.set(fr, base * M[3] * (m.i ? 1 : 1.25));
        m.g = (M[1] * (1 - hard) + M[2] * hard) * 0.5 * (this.rich && m.j ? 0.92 : 1);
      }
      this.hard = hard;
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dm = 1; this.dmul = m.dmul || 1;
      this.rng = new PRNG((m.seed | 0) || 13);
      this.tune(this.f);
      this.exN = Math.max(6, Math.round((0.0007 + 0.0055 * (1 - this.hard)) * SR)); this.exI = 0; this.exA = 2 * this.vel / this.exN;
      // the horn's knock: a 2-ms burst of noise through a band at 2.6 kHz
      this.kN = Math.round(0.0025 * SR); this.kI = 0; this.kA = 0.55 * this.hard * this.vel; this.bp.bp(2600, 1.6);
    }
    // the player's hand lies on the key: the note dies within a tenth of a second (daempfen: how firmly)
    extra(m) { if (m.damp) { this.dm = Math.max(0.012, 1 - 0.988 * this.p.daempfen); this.fT = 0; } }
    render(L, R, a, b) {
      if (Math.abs(this.f - this.fT) > 0.001 * this.fT || !this.fT) this.tune(this.f);
      const md = this.md, nm = md.length, rng = this.rng, bp = this.bp, og = R ? GML_OUT * Math.SQRT1_2 : GML_OUT;
      let exI = this.exI, kI = this.kI;
      for (let i = a; i < b; i++) {
        let x = 0;
        if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        let s0 = 0, s1 = 0;
        for (let k = 0; k < nm; k++) { const m = md[k]; if (!m.g) continue; const v = m.r.tick(x) * m.g; if (m.j) s1 += v; else s0 += v; }
        let kn = 0; if (kI < this.kN) { kn = bp.tick(rng.next() * 2 - 1) * this.kA * (1 - kI / this.kN); kI++; }
        // (level 3: the pair stands apart – pengumbang left, pengisep right – and the beating moves across)
        if (R) { L[i] = (s0 * 1.3 + s1 * 0.7 + kn) * og; R[i] = (s0 * 0.7 + s1 * 1.3 + kn) * og; }
        else L[i] = (s0 + s1 + kn) * og;
      }
      this.exI = exI; this.kI = kI;
      for (const m of md) { m.r.re = flush(m.r.re); m.r.im = flush(m.r.im); }
    }
  }
