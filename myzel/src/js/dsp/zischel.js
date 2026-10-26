  // ---- Zischel: myzel-hht – the 808 hi-hat (Klangbibliothek II, 26.10.2026). Six square oscillators at the TR-808's
  // inharmonic frequencies (205 … 800 Hz, tuned with the note: the hat sits higher or lower), summed into a metallic
  // cluster, through two band passes and a high pass (Ton: from dark and dusty to bright and thin), with a touch of
  // noise (Rauschen); the envelope is the hat: closed a tick of 70 ms, open a hiss that rings up to a second – Höhe is
  // how open. A new hat chokes an open one on the same channel (Abwürgen, page side). The trap roll: in the Puls a
  // hit becomes a roll – the hat retriggers in 1/2, 1/3, 1/4 of the step (Wirbel), each hit a little softer, the last
  // ringing out. The squares are band-limited (PolyBLEP). ----
  const HHT_OUT = 0.5, HHT_F = [205.3, 304.4, 369.6, 522.7, 540, 800];
  class Hht extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { ton: 0.5, wirbel: 0.4, rauschen: 0.25, abwuergen: 1 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 71);
      this.ph = new Float64Array(6); this.dts = new Float64Array(6); for (let k = 0; k < 6; k++) this.ph[k] = this.rng.next();
      this.b1 = new Biquad(); this.b2 = new Biquad(); this.b1R = new Biquad(); this.b2R = new Biquad(); this.hp = 0; this.hx = 0; this.hpR = 0; this.hxR = 0;
      this.env = 0; this.dk = 0.999; this.age = 0; this.vel = 0.75; this.y0 = 0.5; this.dmul = 1; this.rN = 0; this.rI = 0; this.rT = 0; this.rG = 1; this.choke = false;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; for (const q of [this.b1, this.b2, this.b1R, this.b2R]) q.z1 = q.z2 = 0; }
    hit(g) { this.env = g; this.age = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dmul = m.dmul || 1; this.choke = false;
      this.rng = new PRNG((m.seed | 0) || 71);
      const p = this.p, tc = 6500 + 6500 * p.ton, tw = Math.min(0.45 * SR, tc);
      this.b1.bp(tw, 1.1); this.b2.bp(Math.min(0.45 * SR, tc * 0.62), 1.4); this.b1R.bp(Math.min(0.45 * SR, tc * 1.04), 1.1); this.b2R.bp(Math.min(0.45 * SR, tc * 0.6), 1.4);
      // a Puls hit with Wirbel: a roll inside the gate (the step split in 2, 3 or 4, every hit ×0.8)
      const g = m.gate || 0;
      if (m.burst && g > 0 && p.wirbel > 0.05) { const div = 2 + Math.min(2, Math.floor(p.wirbel * 3)); this.rT = Math.max(1, Math.round(g / div * SR)); this.rN = div - 1; this.rI = 0; this.rG = 1; }
      else this.rN = 0;
      this.hit(1);
    }
    extra(m) { if (m.choke) { this.choke = true; } }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const p = this.p, f = this.f, rng = this.rng, tr = Math.pow(f / 440, 0.5), two = R && this.rich, og = R ? HHT_OUT * Math.SQRT1_2 : HHT_OUT;
      // closed 30 ms … open 1.1 s (Höhe), a Puls hit rings shorter (dmul); choked: 8 ms
      const op = Math.pow(Math.max(0, Math.min(1, this.y0)), 1.7), T = (this.choke ? 0.01 : (0.07 + 1.05 * op) * this.dmul) * (this.rN > 0 ? 0.6 : 1);
      const dk = Math.pow(0.001, 1 / (T * SR)), nz = p.rauschen * 0.8, hk = Math.exp(-2 * Math.PI * 5000 / SR), ph = this.ph;
      const dts = this.dts; for (let k = 0; k < 6; k++) dts[k] = Math.min(0.2, HHT_F[k] * tr / SR);
      let env = this.env, hp = this.hp, hx = this.hx, hpR = this.hpR, hxR = this.hxR;
      for (let i = a; i < b; i++) {
        if (this.rN > 0 && ++this.rI >= this.rT) { this.rI = 0; this.rN--; this.rG *= 0.8; env = this.rG; }
        let c = 0, cR = 0;
        for (let k = 0; k < 6; k++) {
          const dt = dts[k]; let q = ph[k] + dt; if (q >= 1) q -= 1; ph[k] = q;
          let h = q + 0.5; if (h >= 1) h -= 1;
          const sq = (q < 0.5 ? 1 : -1) + blep(q, dt) - blep(h, dt);
          c += sq; if (two) cR += k % 2 ? sq : -sq * 0.6;
        }
        const w = rng.next() * 2 - 1;
        const src = c * (1 - 0.5 * nz) / 6 + w * nz;
        let s = this.b1.tick(src) + 0.6 * this.b2.tick(src);
        hp = hk * (hp + s - hx); hx = s;   // (the high pass: the cymbal has no body)
        env *= dk;
        const o = hp * env * this.vel * og;
        L[i] = o;
        if (R) {
          if (two) { const sr = cR * (1 - 0.5 * nz) / 6 + w * nz, t = this.b1R.tick(sr) + 0.6 * this.b2R.tick(sr); hpR = hk * (hpR + t - hxR); hxR = t; R[i] = hpR * env * this.vel * og; }
          else R[i] = o;
        }
      }
      this.env = flush(env); this.hp = flush(hp); this.hx = hx; this.hpR = flush(hpR); this.hxR = hxR;
    }
  }
