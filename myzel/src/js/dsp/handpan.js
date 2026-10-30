  // ---- Handpan: myzel-hng – a steel tone field (Klangbibliothek II, 26.10.2026). A handpan's field is hammered so
  // that its modes are harmonic: the fundamental, the octave and the compound fifth (×3) – each mode a pair of nearly
  // equal frequencies (the field is never perfectly round), so every partial shimmers slowly; the shell answers with
  // a few inharmonic modes that die fast, and the air in the body (the Helmholtz „Gu“, ≈ 90 Hz) with a soft low
  // thump. Höhe is where the hand strikes: low on the field the thumb in the middle (a soft, wide force – the
  // fundamental and the body), high up the fingertip at the edge (a short, hard force – octave, fifth and shell
  // ring out, a little skin). Struck only; the field rings for seconds (Nachklang, longer in the low register).
  // (Handpan-Pilot, 26.10.2026) the instrument around the field: the other fields of the scale (on: sym, their
  // frequencies) ring along – driven by the struck field through the shell, so a field whose note meets one of its
  // partials (the octave on the Ding's D4) blooms, the others only answer the knock faintly; a hard strike sounds a
  // few cents sharp and settles (the steel hardens with amplitude) and is shorter, so brighter; no two strikes alike
  // (where the hand lands, its width, each mode ±1 dB); a new strike on a ringing field touches it first ({touch}).
  // ----
  const HNG_OUT = 0.16;
  // [ratio, centre gain, edge gain, decay share, split share]
  const HNG_M = [[1, 1, 0.45, 1, 1], [2, 0.38, 0.85, 0.72, 0.8], [3, 0.14, 0.55, 0.48, 0.6],
    [2.47, 0.045, 0.3, 0.12, 0], [3.68, 0.03, 0.24, 0.09, 0], [5.09, 0.018, 0.18, 0.06, 0], [6.85, 0.01, 0.12, 0.045, 0]];
  // the other fields: modes 1, 2 (and 3 under 330 Hz), a shorter ring than struck (the shell carries them, it damps)
  const HNG_SYM = [[1, 1, 0.6], [2, 0.5, 0.45], [3, 0.25, 0.3]];   // [ratio, gain, decay share]
  const HNG_SYM_DRIVE = 2, HNG_SYM_KNOCK = 0.04, HNG_GLIDE = 7, HNG_GLIDE_T = 0.08;   // drive at a perfect match; knock; cents at velocity 1; s
  // the shell is not linear: the fundamental's square drives the octave (f·f → 2f), fundamental × octave the fifth
  // (→ 3f) – so a hard strike opens the octave and the fifth, a soft one stays round (the real handpan's dynamic colour)
  const HNG_NL2 = -0.8, HNG_NL3 = -0.8;
  class Hng extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { glanz: 0.5, nachklang: 0.5, koerper: 0.5, schweben: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 11);
      this.md = [];
      HNG_M.forEach((m, i) => { const n = m[4] > 0 ? 2 : 1; for (let j = 0; j < n; j++) this.md.push({ i, j, n, r: new Reso(), g: 0, fr: 0, t: 1, vg: 1, vs: 1, dm: 1, kq: 0, pan: this.rich ? (i % 2 ? 0.3 : -0.3) * (j ? -1 : 1) : 0 }); });
      this.sy = [];
      this.gu = new Reso(); this.guF = 86 + 12 * this.rng.next(); this.guG = 0; this.guV = 1;
      this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.nzN = 0; this.nzI = 0; this.nzA = 0; this.hp = 0;
      this.vel = 0.75; this.y0 = 0.5; this.dmul = 1; this.age = 0; this.pg0 = 0; this.pg = 0; this.tN = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const m of this.md) m.r.re = m.r.im = 0; for (const m of this.sy) m.r.re = m.r.im = 0; this.gu.re = this.gu.im = 0; this.exN = this.nzN = 0; }
    // the modes for this pitch (again when the pitch moves more than a tenth of a percent – a bend, a glide)
    tune(f) {
      this.fT = f;
      const p = this.p, y = this.y0, br = 0.4 + 1.2 * p.glanz, lim = 0.45 * SR, life = (2 + 10 * p.nachklang) * this.dmul;
      const base = life * Math.max(0.6, Math.min(1.5, Math.pow(220 / f, 0.3))), sp = (0.0005 + 0.0032 * p.schweben) / 2, mul = Math.pow(2, this.pg / 1200);
      for (const m of this.md) {
        const M = HNG_M[m.i];
        m.fr = f * M[0] * (m.n > 1 ? 1 + (m.j ? sp : -sp) * M[4] * m.vs : 1); m.t = base * M[3];
        if (m.fr * mul >= lim || (this.lite && m.i >= 5)) { m.g = 0; continue; }
        m.r.set(m.fr * mul, m.t);
        m.g = (M[1] * (1 - y) + M[2] * y) * (m.i ? br : 1) * m.vg / m.n;
        m.kq = m.i === 1 ? HNG_NL2 * (1 - Math.pow(0.001, 1 / (m.t * SR))) : m.i === 2 ? HNG_NL3 * (1 - Math.pow(0.001, 1 / (m.t * SR))) : 0;
      }
      for (const m of this.sy) {
        const M = HNG_SYM[m.k], fs = m.fs * M[0];
        if (fs >= lim || (this.lite && m.k === 2)) { m.g = 0; continue; }
        const t = life * Math.max(0.6, Math.min(1.5, Math.pow(220 / m.fs, 0.3))) * HNG_M[m.k][3] * M[2], r = Math.pow(0.001, 1 / (t * SR));
        m.r.set(fs, t);
        m.g = M[1] * (m.k ? br : 1); m.kd = HNG_SYM_DRIVE * (1 - r); m.ki = m.k ? 0 : HNG_SYM_KNOCK * (0.5 + 0.5 * y);
      }
      this.gu.set(this.guF, 0.55); this.guG = 0.35 * p.koerper * (1 - 0.7 * y) * this.guV;
    }
    // (a hard strike settles from a few cents sharp) only the frequencies, the rings keep their state
    glide(mul) { const lim = 0.45 * SR; for (const m of this.md) if (m.g && m.fr * mul < lim) m.r.set(m.fr * mul, m.t); }
    start(m) {
      const rng = this.rng = new PRNG((m.seed | 0) || 11);
      this.vel = m.vel != null ? m.vel : 0.75; this.dmul = m.dmul || 1;   // (dmul: a Puls hit rings shorter)
      // no two strikes alike: where the hand lands (±0.04), the width of its force (±5 %), each mode ±1 dB, each pair's split ±20 %
      this.y0 = Math.max(0, Math.min(1, this.y + 0.08 * (rng.next() - 0.5)));
      for (const d of this.md) { d.vg = Math.pow(10, (rng.next() - 0.5) * 0.1); d.vs = 0.8 + 0.4 * rng.next(); d.dm = 1; }
      this.guV = 0.9 + 0.2 * rng.next();
      // the other fields of the scale (not this one)
      this.sy = [];
      const fs = Array.isArray(m.sym) ? m.sym : [];
      for (let k = 0, n = 0; k < fs.length && n < 12; k++) {
        const g = +fs[k]; if (!(g > 16) || Math.abs(Math.log2(g / this.f)) < 0.012) continue;
        const pan = this.rich ? (n % 2 ? 0.45 : -0.45) * (0.5 + 0.5 * ((n >> 1) % 2)) : 0; n++;
        for (let j = 0; j < (g < 330 ? 3 : 2); j++) this.sy.push({ fs: g, k: j, r: new Reso(), g: 0, kd: 0, ki: 0, pan });
      }
      // a hard strike: a few cents sharp, settling in 80 ms
      this.age = 0; this.pg0 = HNG_GLIDE * this.vel * this.vel; this.pg = this.pg0;
      this.tune(this.f);
      // the force: a raised cosine, wide for the thumb (5 ms), short for the fingertip (0.7 ms) – and shorter the harder
      // it strikes (a little: the hand is softer than Hertz' ball, v^-1/10); its area is the velocity
      const hard = Math.pow(0.75 / Math.max(0.05, this.vel), 0.1);
      this.exN = Math.max(8, Math.round((0.0007 + 0.0045 * (1 - this.y0)) * hard * (0.95 + 0.1 * rng.next()) * SR)); this.exI = 0; this.exA = 2 * this.vel / this.exN;
      // the skin of a finger at the edge
      this.nzN = this.y0 > 0.55 ? Math.round(0.003 * SR) : 0; this.nzI = 0; this.nzA = 0.5 * (this.y0 - 0.55) * this.vel;
    }
    // a new strike on this field while it rings: the hand touches it first – the thumb longer than the fingertip; the
    // shell modes lose most, the fundamental least (≈ 1.5 / 3 / 6 dB over the touch)
    extra(m) {
      if (!m.touch) return;
      const y = Math.max(0, Math.min(1, +m.y || 0.5)), n = this.tN = Math.max(16, Math.round((0.0015 + 0.0045 * (1 - y)) * SR));
      for (const d of this.md) d.dm = Math.pow(10, -(d.i === 0 ? 1.5 : d.i < 3 ? 3 : 6) / (20 * n));
    }
    render(L, R, a, b) {
      if (Math.abs(this.f - this.fT) > 0.001 * this.fT) this.tune(this.f);
      if (this.pg0 > 0) {
        const pg = this.pg0 * Math.exp(-this.age / (HNG_GLIDE_T * SR));
        if (pg < 0.02) { this.pg0 = 0; this.pg = 0; this.glide(1); } else if (Math.abs(pg - this.pg) > 0.02) { this.pg = pg; this.glide(Math.pow(2, pg / 1200)); }
      }
      this.age += b - a;
      const md = this.md, nm = md.length, sy = this.sy, ns = sy.length, gu = this.gu, guG = this.guG, rng = this.rng, og = R ? HNG_OUT * Math.SQRT1_2 : HNG_OUT;   // (two channels: each at −3 dB, as a mono voice reaches the panner)
      let exI = this.exI, hp = this.hp, nzI = this.nzI, tN = this.tN;
      for (let i = a; i < b; i++) {
        let x = 0;
        if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        if (tN > 0) { for (let k = 0; k < nm; k++) { const r = md[k].r, d = md[k].dm; r.re *= d; r.im *= d; } if (--tN === 0) for (let k = 0; k < nm; k++) md[k].dm = 1; }
        let sl = 0, sr = 0, s = 0, u1 = 0, u2 = 0;
        for (let k = 0; k < nm; k++) {
          const m = md[k]; if (!m.g) continue;
          const mi = m.i, u = m.r.tick(mi === 1 ? x + m.kq * u1 * u1 : mi === 2 ? x + m.kq * u1 * u2 : x), v = u * m.g;
          if (mi === 0) u1 += u; else if (mi === 1) u2 += u;
          s += v; sl += v * (1 - m.pan); sr += v * (1 + m.pan);
        }
        for (let k = 0; k < ns; k++) { const m = sy[k]; if (!m.g) continue; const v = m.r.tick(s * m.kd + x * m.ki) * m.g; sl += v * (1 - m.pan); sr += v * (1 + m.pan); }
        const g = gu.tick(x) * guG; sl += g; sr += g;
        if (nzI < this.nzN) { const nz = rng.next() * 2 - 1, h = nz - hp; hp = nz; const e = this.nzA * (1 - nzI / this.nzN); sl += h * e; sr += h * e; nzI++; }
        L[i] = sl * og; if (R) R[i] = sr * og;
      }
      this.exI = exI; this.hp = hp; this.nzI = nzI; this.tN = tN;
      for (const m of md) { m.r.re = flush(m.r.re); m.r.im = flush(m.r.im); }
      for (const m of sy) { m.r.re = flush(m.r.re); m.r.im = flush(m.r.im); }
    }
  }
