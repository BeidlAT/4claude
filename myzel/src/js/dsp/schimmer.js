  // ---- Schimmer: myzel-sht – a surface in a space of its own that grows upwards (Klangbibliothek II, 26.10.2026).
  // The source is quiet and plain: two slightly detuned saws (band-limited, PolyBLEP) and a sub an octave down through
  // a soft low pass (Farbe). It sounds in its own room – four delay lines mixed by a Hadamard matrix (Raum: their size
  // and how long it rings) – and what returns from the room passes a pitch shifter (two crossfaded taps of a 40-ms
  // window: an octave up, with Quinte a fifth) back into it: every pass of the reverb rises, so the tail blooms into a
  // halo of octaves above the note. Höhe is the shimmer: low on the field the dry surface in a plain room, high up the
  // room sings above it. Let go: the source ends, the halo rings out. ----
  const SHT_OUT = 0.26, SHT_D = [0.0413, 0.0537, 0.0671, 0.0799];
  class Sht extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { schimmer: 0.6, raum: 0.6, quinte: 0.2, farbe: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 37);
      const mx = Math.ceil(0.08 * 1.7 * SR) + 8;
      this.dl = SHT_D.map(() => ({ b: new Float32Array(1 << Math.ceil(Math.log2(mx))), w: 0, z: 0 }));
      this.ps = new Float32Array(1 << 14); this.psW = 0; this.psD = 0; this.psD2 = 0;
      this.p1 = this.rng.next(); this.p2 = this.rng.next(); this.p3 = 0; this.lp1 = 0; this.lp2 = 0; this.env = 0; this.vel = 0.75; this.burst = false; this.gate = 0; this.ys = this.y;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { for (const d of this.dl) { d.b.fill(0); d.z = 0; } this.ps.fill(0); this.env = 0; }
    start(m) { this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0; if (!this.wasOn) { this.ys = this.y; this.wasOn = true; } }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.05 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const sh = Math.min(1, this.ys * (0.3 + 1.0 * p.schimmer)), size = 0.6 + p.raum, t60 = 1.5 + 9 * p.raum;
      const len = SHT_D.map((d) => Math.round(d * size * SR)), gfb = len.map((l) => Math.pow(0.001, l / (t60 * SR)));
      const damp = 1 - Math.exp(-2 * Math.PI * (2500 + 7000 * p.farbe) / SR), cut = 1 - Math.exp(-2 * Math.PI * Math.min(0.4 * SR, f * (2 + 10 * p.farbe) * (0.4 + 2.6 * this.ys * this.ys)) / SR);   // (Höhe opens the surface too: dark below, glassy above)
      const dt1 = f * 1.0035 / SR, dt2 = f * 0.9965 / SR, dt3 = f * 0.5 / SR, att = 1 - Math.exp(-1 / ((this.burst ? 0.01 : 0.25) * SR)), rel = 1 - Math.exp(-1 / (0.5 * SR));
      const W = 2048, PM = this.ps.length - 1, q = p.quinte, wet = 0.25 + 0.65 * sh, fbs = 0.24 * sh;
      const dl = this.dl, ps = this.ps, og = R ? SHT_OUT * 0.51 : SHT_OUT, envT = this.off ? 0 : 1;
      let p1 = this.p1, p2 = this.p2, p3 = this.p3, lp1 = this.lp1, lp2 = this.lp2, env = this.env, psW = this.psW, d1 = this.psD, d2 = this.psD2;
      for (let i = a; i < b; i++) {
        env += (envT - env) * (envT > env ? att : rel);
        // the source: two saws and a sub, softened
        p1 += dt1; if (p1 >= 1) p1 -= 1; p2 += dt2; if (p2 >= 1) p2 -= 1; p3 += dt3; if (p3 >= 1) p3 -= 1;
        let s = (2 * p1 - 1 - blep(p1, dt1)) + (2 * p2 - 1 - blep(p2, dt2)) + 0.6 * Math.sin(2 * Math.PI * p3);
        lp1 += cut * (s - lp1); lp2 += cut * (lp1 - lp2); s = lp2 * 0.35 * (1.5 - 0.6 * this.ys) * env * this.vel;   // (the darker surface below loses its top: its level held)
        // the room: four lines, Hadamard
        const o0 = dl[0].b[(dl[0].w - len[0]) & (dl[0].b.length - 1)], o1 = dl[1].b[(dl[1].w - len[1]) & (dl[1].b.length - 1)], o2 = dl[2].b[(dl[2].w - len[2]) & (dl[2].b.length - 1)], o3 = dl[3].b[(dl[3].w - len[3]) & (dl[3].b.length - 1)];
        // the shimmer: the room's sum an octave (and a fifth) up, back into it
        const sum = o0 + o1 + o2 + o3; ps[psW & PM] = sum; psW++;
        let up = 0;
        if (1 - q > 0.001) for (let h = 0; h < 2; h++) { let dq = d1 + h * W / 2; if (dq >= W) dq -= W; const wv = Math.sin(Math.PI * dq / W), at = psW - 4 - dq, j = Math.floor(at), fr = at - j, x0 = ps[j & PM]; up += (x0 + fr * (ps[(j + 1) & PM] - x0)) * wv * wv * (1 - q); }
        if (q > 0.001) for (let h = 0; h < 2; h++) { let dq = d2 + h * W / 2; if (dq >= W) dq -= W; const wv = Math.sin(Math.PI * dq / W), at = psW - 4 - dq, j = Math.floor(at), fr = at - j, x0 = ps[j & PM]; up += (x0 + fr * (ps[(j + 1) & PM] - x0)) * wv * wv * q; }
        d1 -= 1; if (d1 < 0) d1 += W; d2 -= 0.5; if (d2 < 0) d2 += W;   // (the tap runs through its window at the shift's rate: ×2 one sample a sample, ×1.5 half)
        const inp = s + tanh(up * fbs * 0.5);   // (the rise never runs away: what returns is limited softly)
        const h0 = (o0 + o1 + o2 + o3) * 0.5, h1 = (o0 - o1 + o2 - o3) * 0.5, h2 = (o0 + o1 - o2 - o3) * 0.5, h3 = (o0 - o1 - o2 + o3) * 0.5;
        let D = dl[0]; D.z += damp * (h0 - D.z); D.b[D.w & (D.b.length - 1)] = inp + D.z * gfb[0]; D.w++;
        D = dl[1]; D.z += damp * (h1 - D.z); D.b[D.w & (D.b.length - 1)] = inp + D.z * gfb[1]; D.w++;
        D = dl[2]; D.z += damp * (h2 - D.z); D.b[D.w & (D.b.length - 1)] = inp + D.z * gfb[2]; D.w++;
        D = dl[3]; D.z += damp * (h3 - D.z); D.b[D.w & (D.b.length - 1)] = inp + D.z * gfb[3]; D.w++;
        const wl = (o0 + o2) * wet, wr = (o1 + o3) * wet;
        L[i] = (s * (1 - 0.4 * sh) + wl) * og; if (R) R[i] = (s * (1 - 0.4 * sh) + wr) * og;
        if (!R) L[i] = (s * (1 - 0.4 * sh) + (wl + wr) * 0.5) * og;
      }
      this.p1 = p1; this.p2 = p2; this.p3 = p3; this.lp1 = lp1; this.lp2 = lp2; this.env = env; this.psW = psW; this.psD = d1; this.psD2 = d2;
      for (const D of dl) D.z = flush(D.z);
    }
  }
