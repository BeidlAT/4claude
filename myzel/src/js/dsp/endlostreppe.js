  // ---- Endlostreppe: myzel-stp – the Shepard–Risset glissando (Klangbibliothek II, 26.10.2026). Eight voices an
  // octave apart under one bell over the octaves (Spanne: how wide): as they glide, the top one fades out where the
  // bottom one fades in – the tone climbs (or falls) forever and never arrives. Each voice is a pair a breath apart
  // (Atmen: 0 … 1.5 Hz), so the still middle is not a dead chord but slow waves. Höhe is the stair: the middle of the
  // field stands still (Ruhe: how wide that middle is), above it the tone climbs, below it falls, the further from the
  // middle the faster (Tempo: the fastest, in octaves a second). The note's pitch class is always in the chord: when the
  // stair stands, it stands on the note. ----
  const STP_OUT = 0.24;
  // the bell over the octaves (centre bc, width wb) – a function of its own, not a closure made each block
  const stpBell = (x, bc, wb) => { const u = (x - bc) / (0.5 * wb); return Math.abs(u) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u); };
  class Stp extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { tempo: 0.4, spanne: 0.6, atmen: 0.4, ruhe: 0.3 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 47);
      this.K = this.lite ? 6 : 8;
      this.pa = new Float64Array(this.K * 2); for (let i = 0; i < this.pa.length; i++) this.pa[i] = this.rng.next();
      this.phi = 0; this.rate = 0; this.env = 0; this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, K = this.K, pa = this.pa;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.06 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      // the stair's speed: still in the middle, faster towards the edges
      const dz = 0.04 + 0.3 * p.ruhe, d = this.ys - 0.5, mag = Math.max(0, Math.abs(d) - dz / 2) / (0.5 - dz / 2), rT = Math.sign(d) * mag * mag * (0.03 + 0.6 * p.tempo);
      this.rate += (rT - this.rate) * (1 - Math.exp(-n / (0.15 * SR)));
      // the octaves: the lowest voice K/2 octaves under the note's pitch class; the bell over log2
      const f = this.f, base = f * Math.pow(2, -Math.floor(K / 2)), br = 0.4 * p.atmen + 0.02, wb = 0.5 + 0.5 * p.spanne, lim = 0.45 * SR;
      const att = 1 - Math.exp(-1 / (0.12 * SR)), rel = 1 - Math.exp(-1 / (0.3 * SR)), envT = this.off ? 0 : 1, og = R ? STP_OUT * Math.SQRT1_2 : STP_OUT;
      for (let i = a; i < b; i++) { L[i] = 0; if (R) R[i] = 0; }
      let phi = this.phi, env = this.env;
      if (!this.E || this.E.length < n) this.E = new Float32Array(Math.max(256, n));
      const E = this.E; for (let i = 0; i < n; i++) { env += (envT - env) * (envT > env ? att : rel); E[i] = env; }
      const dphi = this.rate * n / SR;
      const bc = 0.5 + 0.2 * (this.ys - 0.5);
      for (let k = 0; k < K; k++) {
        // its place over the block (start, end): the frequency and the bell glide linearly
        const x0 = (k + phi) / K, x1 = (k + phi + dphi) / K;
        const g0 = stpBell(x0, bc, wb), g1 = stpBell(x1, bc, wb); if (g0 === 0 && g1 === 0) continue;
        const f0 = base * Math.pow(2, k + phi), f1 = base * Math.pow(2, k + phi + dphi); if (f0 >= lim) continue;
        for (let j = 0; j < 2; j++) {
          let q = pa[2 * k + j]; const sh = j ? br : -br;
          for (let i = 0; i < n; i++) {
            const u = i / n, fr = f0 + (f1 - f0) * u + sh;
            q += fr / SR; if (q >= 1) q -= 1;
            const e = E[i], xx = q * 4096, jj = xx | 0, s = (SIN[jj] + (xx - jj) * (SIN[jj + 1] - SIN[jj])) * (g0 + (g1 - g0) * u) * e * 0.5;
            if (R && this.rich) { if ((k + j) % 2) R[a + i] += s * 1.6; else L[a + i] += s * 1.6; } else L[a + i] += s;
          }
          pa[2 * k + j] = q;
        }
      }
      // the stair turns over: a voice past the top becomes the bottom one (its phase moves with it – no click)
      phi += dphi;
      if (phi >= 1) { phi -= 1; const t0 = pa[2 * (K - 1)], t1 = pa[2 * (K - 1) + 1]; for (let k = K - 1; k > 0; k--) { pa[2 * k] = pa[2 * (k - 1)]; pa[2 * k + 1] = pa[2 * (k - 1) + 1]; } pa[0] = t0; pa[1] = t1; }
      else if (phi < 0) { phi += 1; const t0 = pa[0], t1 = pa[1]; for (let k = 0; k < K - 1; k++) { pa[2 * k] = pa[2 * (k + 1)]; pa[2 * k + 1] = pa[2 * (k + 1) + 1]; } pa[2 * (K - 1)] = t0; pa[2 * (K - 1) + 1] = t1; }
      this.phi = phi; this.env = env;
      for (let i = a; i < b; i++) { L[i] *= og; if (R) R[i] = this.rich ? R[i] * og : L[i]; }
    }
  }
