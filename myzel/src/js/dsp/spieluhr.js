  // ---- Spieluhr: myzel-spu – a music box (Klangbibliothek II, 26.10.2026). A steel comb: each tine a clamped bar
  // whose modes are not harmonic (1, 6.27, 17.55 × the fundamental – Glanz brings the upper ones), plucked by a pin
  // on the cylinder: the pin lifts the tine and lets it go (a tiny click before the tone), the soundboard of the box
  // answers with a few short wooden modes (Kasten), and the mechanism ticks softly under it (Uhrwerk). Höhe is the
  // winding: low on the field the spring is nearly run down – the cylinder turns slowly and unevenly, the tone sags a
  // few cents and wavers, the pluck is soft –, high up freshly wound: steady, bright and crisp. Struck only. ----
  const SPU_OUT = 0.2, SPU_M = [[1, 1, 1], [6.27, 0.32, 0.22], [17.55, 0.1, 0.07]], SPU_B = [[520, 0.09, 0.5], [1180, 0.06, 0.35], [2650, 0.04, 0.2]];
  class Spu extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { glanz: 0.45, nachklang: 0.5, uhrwerk: 0.3, kasten: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 79);
      this.t = SPU_M.map(() => new Reso()); this.t2 = SPU_M.map(() => new Reso()); this.bx = SPU_B.map(() => new Reso()); this.tg = new Float64Array(3); this.all = this.t.concat(this.t2, this.bx); this.wobT = 0; this.te = 1; this.teK = 1;
      this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.pre = 0; this.ck = 0; this.tick = 0; this.tickN = 0; this.wob = 0; this.wv = 0; this.hp = 0;
      this.vel = 0.75; this.y0 = 0.5; this.dmul = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const r of this.all) r.re = r.im = 0; }
    tune(f) {
      this.fT = f;
      const p = this.p, base = (1.5 + 6 * p.nachklang) * Math.max(0.35, Math.min(1.8, Math.pow(523 / f, 0.7))) * this.dmul, lim = 0.45 * SR, br = 0.3 + 1.4 * p.glanz;
      SPU_M.forEach((M, k) => {
        const fr = f * M[0];
        if (fr >= lim) { this.tg[k] = 0; return; }
        this.t[k].set(fr, base * (k ? 0.25 / k : 1)); this.t2[k].set(fr * (1.0011 + 0.0004 * k), base * (k ? 0.22 / k : 0.9));
        this.tg[k] = M[1] * (k ? br * (0.5 + 0.7 * this.y0) : 1);
      });
      SPU_B.forEach((B, k) => this.bx[k].set(B[0], B[1]));
      this.teK = Math.pow(0.001, 1 / (base * 0.7 * SR));   // (the mechanism ticks as long as the tune rings)
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dmul = m.dmul || 1;
      this.rng = new PRNG((m.seed | 0) || 79); this.tune(this.f);
      // the pin: a little lift (the click, 2 … 6 ms before), then the release – shorter and harder when wound up
      this.pre = Math.round((0.002 + 0.004 * (1 - this.y0)) * SR); this.ck = this.pre;
      this.exN = Math.max(4, Math.round((0.0003 + 0.0012 * (1 - this.y0)) * SR)); this.exI = -this.pre; this.exA = 2 * this.vel / this.exN;
      this.tickN = Math.round(SR * (0.09 + 0.08 * (1 - this.y0))); this.tick = Math.floor(this.rng.next() * this.tickN); this.te = 1;
    }
    render(L, R, a, b) {
      const f = this.f, p = this.p, rng = this.rng;
      // the run-down spring: the cylinder wavers (≈ 0.7 Hz, irregular) and sags – the tine's pitch with it
      const tired = Math.max(0, 0.5 - this.y0) * 2, ff = f * (1 - 0.004 * tired + this.wob * 0.006 * tired);
      if (Math.abs(ff - this.fT) > 0.0004 * ff) this.tune(ff);
      const t = this.t, t2 = this.t2, bx = this.bx, tg = this.tg, kb = 0.6 * p.kasten, uw = p.uhrwerk * 0.06, two = R && this.rich, og = R ? SPU_OUT * Math.SQRT1_2 : SPU_OUT;
      let exI = this.exI, hp = this.hp;
      for (let i = a; i < b; i++) {
        let x = 0, cl = 0;
        if (exI < 0) { if (exI === -this.pre) cl = 0.12 * this.vel * (0.6 + 0.4 * this.y0); exI++; }
        else if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        this.te *= this.teK;
        if (++this.tick >= this.tickN) { this.tick = 0; cl += uw * this.te * (0.6 + 0.4 * rng.next()); }   // (the mechanism)
        let sl = 0, sr = 0;
        for (let k = 0; k < 3; k++) { if (!tg[k]) continue; const a1 = t[k].tick(x) * tg[k], a2 = t2[k].tick(x) * tg[k] * 0.45; sl += a1 + a2 * (two ? 0.4 : 1); sr += a1 * (two ? 0.6 : 1) + a2 * (two ? 1.4 : 1); }
        // the box: the tine's root and the clicks excite it
        const ex = x * 0.6 + cl + (sl + sr) * 0.002;
        let bb = 0; for (let k = 0; k < 3; k++) bb += bx[k].tick(ex) * SPU_B[k][2];
        const nz = rng.next() * 2 - 1, h = nz - hp; hp = nz;
        const c = cl ? h * cl * 2 : 0;
        L[i] = (sl + bb * kb + c) * og; if (R) R[i] = (sr + bb * kb + c) * og;
      }
      this.exI = exI; this.hp = hp;
      if ((this.wv += 1) % 48 === 0) this.wobT = rng.next() * 2 - 1;
      this.wob += (this.wobT - this.wob) * 0.03;
      for (const r of this.all) { r.re = flush(r.re); r.im = flush(r.im); }
    }
  }
