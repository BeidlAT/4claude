  // ---- Nordlicht: myzel-nrd – an additive surface under moving curtains of light (Klangbibliothek II, 26.10.2026).
  // 48 partials (24 light, 64 at level 3) of the note, each slowly drifting a few cents of its own (Schimmer – the
  // surface breathes, never a chorus); their levels are three curtains: soft bands over the partials (in the log of the
  // frequency) whose centres and widths wander on their own slow paths (Vorhang: how fast), so the colour of the tone
  // moves like an aurora. Höhe lifts the curtains: low on the field a dark, warm drone, high up a glassy shimmer of the
  // upper partials. Teiltöne thins the spectrum to the odd ones (hollow, clarinet-like). A Puls hit is a flare: the
  // curtains leap up and sink back. Level 3: odd partials lean left, even ones right, slowly turning. ----
  const NRD_OUT = 0.14;
  class Nrd extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { vorhang: 0.4, schimmer: 0.4, teiltoene: 0, anstieg: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 31);
      this.K = this.lite ? 24 : this.rich ? 64 : 48;
      const K = this.K;
      this.ph = new Float64Array(K); this.dr = new Float32Array(K); this.drV = new Float32Array(K); this.a = new Float32Array(K); this.a0 = new Float32Array(K);
      for (let k = 0; k < K; k++) { this.ph[k] = this.rng.next(); this.dr[k] = (this.rng.next() * 2 - 1) * 0.5; }
      // the curtains: centre (in octaves above the note), width, level, and their own slow walks
      this.cv = [0, 1, 2].map((i) => ({ c: 0.6 + i * 1.3, w: 0.5 + 0.3 * i, g: 1 - 0.25 * i, vc: 0, vw: 0 }));
      this.fl = 0; this.env = 0; this.vel = 0.75; this.burst = false; this.gate = 0; this.pan = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; this.a.fill(0); }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (this.burst) this.fl = 1;
    }
    stop() { this.off = true; }
    // per block: the curtains walk, the partials' levels follow (glide over the block), their drift
    levels(n) {
      const p = this.p, rng = this.rng, dt = n / SR, sp = 0.05 + 0.5 * p.vorhang, lift = 3.6 * this.y + 1.8 * this.fl;
      for (const C of this.cv) {
        C.vc += ((rng.next() * 2 - 1) * sp - C.vc) * 0.02; C.c += C.vc * dt * 2;
        C.vw += ((rng.next() * 2 - 1) * sp * 0.5 - C.vw) * 0.02; C.w = Math.max(0.25, Math.min(1.6, C.w + C.vw * dt));
        if (C.c < -0.5) C.vc = Math.abs(C.vc); if (C.c > 4.5) C.vc = -Math.abs(C.vc);
      }
      this.fl *= Math.exp(-dt / 0.35);
      const K = this.K, f = this.f, lim = 0.45 * SR, odd = p.teiltoene;
      let sum = 0;
      for (let k = 0; k < K; k++) {
        const n1 = k + 1, oc = Math.log2(n1);
        if (f * n1 >= lim) { this.a0[k] = 0; continue; }
        let g = 0; for (const C of this.cv) { const d = (oc - (C.c + lift * 0.6 - 1)) / C.w; g += C.g * Math.exp(-d * d); }
        g *= Math.pow(n1, -0.55) * (n1 % 2 === 0 ? 1 - 0.95 * odd : 1);
        this.a0[k] = g; sum += g * g;
      }
      const nr = 1 / Math.sqrt(sum + 1e-9);
      for (let k = 0; k < K; k++) this.a0[k] *= nr;
      // the drift: every partial's own slow walk, ±(2 … 12) cents
      const dd = 2 + 10 * p.schimmer;
      for (let k = 0; k < K; k++) { this.drV[k] += ((rng.next() * 2 - 1) * 0.6 - this.drV[k]) * 0.01; this.dr[k] = Math.max(-1, Math.min(1, this.dr[k] + this.drV[k] * dt)); }
      this.ddc = dd;
    }
    render(L, R, a, b) {
      const n = b - a; this.levels(n);
      const K = this.K, f = this.f, ph = this.ph, A = this.a, A0 = this.a0, dr = this.dr, dd = this.ddc, two = !!R && this.rich;
      const att = 1 - Math.exp(-1 / ((this.burst ? 0.01 : 0.02 + 2.5 * this.p.anstieg * this.p.anstieg) * SR)), rel = 1 - Math.exp(-1 / (0.4 * SR));
      const og = R ? NRD_OUT * Math.SQRT1_2 : NRD_OUT;
      for (let i = a; i < b; i++) { L[i] = 0; if (R) R[i] = 0; }
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      // the envelope per sample (the swell is the source's own attack; a release the voice's)
      const envT = this.off ? 0 : 1, env0 = this.env;
      let env = env0;
      if (!this.envBuf || this.envBuf.length < n) this.envBuf = new Float32Array(Math.max(256, n));
      const E = this.envBuf;
      for (let i = 0; i < n; i++) { env += (envT - env) * (envT > env ? att : rel); E[i] = env; }
      this.env = env;
      this.pan += 0.05 * n / SR;
      for (let k = 0; k < K; k++) {
        const g0 = A[k], g1 = A0[k] * this.vel; if (g0 === 0 && g1 === 0) continue;
        const inc = f * (k + 1) * (1 + dr[k] * dd / 1731) / SR; let p = ph[k];
        const dg = (g1 - g0) / n, pl = two ? 0.5 + 0.45 * Math.sin(this.pan * 6.283 + k * 0.7) * (k % 2 ? 1 : -1) : 0.5;
        let g = g0; const cl = Math.sqrt(2 * (1 - pl)), cr = Math.sqrt(2 * pl);   // (equal power: level 3 as loud as level 1)
        for (let i = 0; i < n; i++) {
          p += inc; if (p >= 1) p -= 1;
          const x = p * 4096, j = x | 0, s = (SIN[j] + (x - j) * (SIN[j + 1] - SIN[j])) * g * E[i];
          g += dg;
          if (two) { L[a + i] += s * cl; R[a + i] += s * cr; } else L[a + i] += s;
        }
        ph[k] = p; A[k] = g1;
      }
      for (let i = a; i < b; i++) { L[i] *= og; if (R) R[i] = two ? R[i] * og : L[i]; }
    }
  }
