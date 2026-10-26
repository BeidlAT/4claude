  // ---- Silbe: myzel-vox – a sung syllable, the vocal chop (Klangbibliothek II, 26.10.2026). The voice from its parts:
  // the vocal folds (a Rosenberg glottal pulse – its closing edge band-limited – with the little unsteadiness of a
  // real voice: jitter and shimmer, and a delayed vibrato), breath that rides on the folds' cycle (Hauch), five
  // formants of the vocal tract, and at the onset a consonant – none, p, t, k, s or ch (Konsonant) – before the vowel
  // opens. Höhe is the vowel: low on the field u, then o, a, e, high up i (the formants glide between them as the
  // finger moves). Größe scales the tract (a large, dark voice → a small, bright one). In the Puls each hit is a
  // chopped syllable. Level 3: two singers, a little apart in pitch and tract. ----
  const VOX_OUT = 0.21;
  // u o a e i: F1 … F5 (Hz), and their levels (dB)
  const VOX_F = [[300, 870, 2240, 3300, 4200], [430, 780, 2500, 3350, 4250], [730, 1090, 2440, 3400, 4300], [520, 1840, 2480, 3450, 4350], [280, 2250, 2950, 3600, 4400]];
  const VOX_G = [[0, -14, -30, -34, -42], [0, -6, -26, -30, -38], [0, -4, -20, -26, -34], [0, -7, -10, -18, -28], [0, -6, -4, -10, -22]];   // (e and i: the front vowels' bright cluster of F2 … F4)
  // consonants: [centre Hz, Q, length s, level, voiced gap s]
  const VOX_C = [null, [500, 0.8, 0.012, 1.2, 0.02], [4200, 1.4, 0.018, 0.9, 0.03], [2200, 2, 0.022, 1.0, 0.035], [7000, 2.2, 0.11, 0.5, 0.0], [3000, 1.3, 0.1, 0.45, 0.0]];
  class Vox extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { konsonant: 0.4, hauch: 0.3, groesse: 0.5, vibrato: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 73);
      this.fm = [new Biquad(), new Biquad(), new Biquad(), new Biquad(), new Biquad()]; this.fmR = [new Biquad(), new Biquad(), new Biquad(), new Biquad(), new Biquad()];
      this.fg = new Float64Array(5); this.fgR = new Float64Array(5); this.cb = new Biquad(); this.ph = 0; this.ph2 = 0.3; this.jit = 0; this.jit2 = 0; this.shm = 1; this.lfo = 0; this.age = 0; this.cn = 0; this.cI = 0; this.cIdx = 0;
      this.env = 0; this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(30); this.dcR = new DcBlock(30);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { for (const q of this.fm.concat(this.fmR, [this.cb])) q.z1 = q.z2 = 0; this.env = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.rng = new PRNG((m.seed | 0) || 73); this.age = 0;
      this.cIdx = Math.min(5, Math.floor(this.p.konsonant * 6)); const C = VOX_C[this.cIdx];
      if (C) { this.cb.bp(Math.min(0.45 * SR, C[0]), C[1]); this.cn = Math.round(C[2] * SR); this.gap = Math.round(C[4] * SR); } else { this.cn = 0; this.gap = 0; }
      this.cI = 0;
    }
    stop() { this.off = true; }
    // the tract for a vowel position 0 … 4 (between two vowels: the formants and levels glide), scaled by the size
    tract(fm, fg, v, sc) {
      const i = Math.min(3, Math.floor(v)), u = v - i, A = VOX_F[i], B = VOX_F[i + 1], GA = VOX_G[i], GB = VOX_G[i + 1];
      for (let k = 0; k < 5; k++) {
        const F = (A[k] + (B[k] - A[k]) * u) * sc, bw = 60 + 0.07 * F + (k > 2 ? 60 : 0);
        fm[k].bp(Math.min(0.45 * SR, F), F / bw); fg[k] = Math.pow(10, 0.5 * (GA[k] + (GB[k] - GA[k]) * u) / 20);   // (half the measured levels: the source's slope is the other half)
      }
    }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.06 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const v = 4 * Math.max(0, Math.min(1, this.ys)), sc = (0.82 + 0.36 * p.groesse) * Math.pow(Math.max(1, f / 300), 0.12), two = R && this.rich, fg = this.fg, fgR = this.fgR;
      this.tract(this.fm, fg, v, sc);
      if (two) this.tract(this.fmR, fgR, Math.min(4, v + 0.08), sc * 1.04);
      const oq = 0.72 - 0.34 * this.ys, hb = p.hauch, att = 1 - Math.exp(-1 / (0.025 * SR)), rel = 1 - Math.exp(-1 / (0.08 * SR)), og = R ? VOX_OUT * Math.SQRT1_2 : VOX_OUT;
      const C = VOX_C[this.cIdx], vd = 0.1 * p.vibrato;
      let ph = this.ph, ph2 = this.ph2, env = this.env, age = this.age, lfo = this.lfo;
      for (let i = a; i < b; i++) {
        // the onset: the consonant's noise first, the vowel after its gap
        const voiced = age >= this.gap, envT = this.off ? 0 : voiced ? 1 : 0;
        env += (envT - env) * (envT > env ? att : rel);
        age++;
        lfo += 5.3 / SR; if (lfo >= 1) lfo -= 1;
        const vib = age > 0.25 * SR ? Math.min(1, (age - 0.25 * SR) / (0.5 * SR)) * vd * Math.sin(2 * Math.PI * lfo) : 0;
        const fr = f * (1 + 0.058 * vib + this.jit), dt = fr / SR;
        ph += dt; let wrap = false; if (ph >= 1) { ph -= 1; wrap = true; }
        if (wrap) { this.jit = (rng.next() - 0.5) * 0.004; this.shm = 1 + (rng.next() - 0.5) * 0.08; }
        // the glottal flow's derivative (Rosenberg): rises, falls, a sharp close at oq (its step band-limited)
        const tp = oq * 0.66, tn = oq - tp;
        let gs = ph < tp ? Math.PI / tp * 0.5 * Math.sin(Math.PI * ph / tp) : ph < oq ? -Math.PI / (2 * tn) * Math.sin(Math.PI * (ph - tp) / (2 * tn)) : 0;
        let pc = ph - oq; if (pc < 0) pc += 1;
        gs += (Math.PI / (2 * tn)) * 0.5 * blep(pc, dt);
        gs *= 0.5 * this.shm;
        // breath on the open phase
        const br = (rng.next() * 2 - 1) * hb * (ph < oq ? 1 : 0.3) * 0.18;
        let x = (gs * (1 - 0.5 * hb) + br) * env;
        let o = 0; for (let k = 0; k < 5; k++) o += this.fm[k].tick(x) * fg[k];   // (the flow's derivative carries the lips' radiation already)
        if (this.cI < this.cn) { const e = Math.sin(Math.PI * this.cI / this.cn); o += this.cb.tick(rng.next() * 2 - 1) * C[3] * e; this.cI++; }
        o = this.dc.tick(o) * this.vel * og;
        if (two) {
          ph2 += dt * 0.9965; if (ph2 >= 1) ph2 -= 1;
          let g2 = ph2 < tp ? Math.PI / tp * 0.5 * Math.sin(Math.PI * ph2 / tp) : ph2 < oq ? -Math.PI / (2 * tn) * Math.sin(Math.PI * (ph2 - tp) / (2 * tn)) : 0;
          let pc2 = ph2 - oq; if (pc2 < 0) pc2 += 1; g2 += (Math.PI / (2 * tn)) * 0.5 * blep(pc2, dt); g2 *= 0.5;
          const x2 = (g2 * (1 - 0.5 * hb) + br) * env; let s2 = 0; for (let k = 0; k < 5; k++) s2 += this.fmR[k].tick(x2) * fgR[k];
          const o2 = this.dcR.tick(s2) * this.vel * og;
          L[i] = (o * 0.8 + o2 * 0.2) * 1.2; R[i] = (o * 0.2 + o2 * 0.8) * 1.2;   // (two singers, partly apart: their sum is ≈ 1.6 dB weaker)
        } else { L[i] = o; if (R) R[i] = o; }
      }
      this.ph = ph; this.ph2 = ph2; this.env = env; this.age = age; this.lfo = lfo;
    }
  }
