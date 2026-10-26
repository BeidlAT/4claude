  // ---- Kassette: myzel-kas – a tine piano on a worn tape (Klangbibliothek II, 26.10.2026). The electric piano: a
  // hammer strikes a tine (its fundamental and an inharmonic bell partial ≈ 7.1 × that dies fast – Glocke), the tone
  // bar beside it rings the octave; the pickup sits a little off the tine's axis, so its curve adds even harmonics –
  // the more the harder it is driven, the „bark“. Höhe is the strike: low on the field soft and round, high up the
  // bark. While the key is held the tine rings (Nachklang), let go the damper stops it. Then the tape: wow (a slow,
  // uneven drift of speed) and flutter (≈ 7 Hz), saturation (Wärme), the top worn off, hiss and short dropouts – Alter
  // is how old the cassette is. ----
  const KAS_OUT = 0.3;
  class Kas extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { alter: 0.5, glocke: 0.4, nachklang: 0.5, waerme: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 67);
      this.t1 = new Reso(); this.t2 = new Reso(); this.tb = new Reso(); this.fT = 0;
      this.tape = new Float32Array(1 << 11); this.tW = 0; this.wow = 0; this.wv = 0; this.fl = this.rng.next(); this.drop = 1; this.dropN = 0; this.l1 = 0; this.l2 = 0; this.hs = 0;
      this.exN = 0; this.exI = 0; this.exA = 0; this.vel = 0.75; this.y0 = 0.5; this.damp = false; this.dmul = 1; this.dc = new DcBlock(20);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const r of [this.t1, this.t2, this.tb]) r.re = r.im = 0; this.tape.fill(0); }
    tune(f) {
      this.fT = f;
      const nk = (1.2 + 7 * this.p.nachklang) * Math.max(0.35, Math.min(1.6, Math.pow(260 / f, 0.6))) * this.dmul * (this.damp ? 0.025 : 1);
      this.t1.set(f, nk); this.t2.set(Math.min(0.45 * SR, f * 7.11), (this.damp ? 0.02 : 0.25) * this.dmul); this.tb.set(Math.min(0.45 * SR, f * 2), nk * 0.6);
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.damp = false; this.dmul = m.dmul || 1;
      this.rng = new PRNG((m.seed | 0) || 67); this.tune(this.f);
      this.exN = Math.max(6, Math.round((0.0018 - 0.0012 * this.y0) * SR)); this.exI = 0; this.exA = 2 * this.vel / this.exN;
    }
    stop() { this.off = true; this.damp = true; this.fT = 0; }   // (let go: the damper)
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      if (Math.abs(f - this.fT) > 0.001 * f || !this.fT) this.tune(f);
      const bell = 0.12 + 0.8 * p.glocke, bark = 0.15 + 1.6 * this.y0 * this.y0, drv = 1 + 2.5 * p.waerme, age = p.alter, og = R ? KAS_OUT * Math.SQRT1_2 : KAS_OUT;
      const TM = this.tape.length - 1, hc = 1 - Math.exp(-2 * Math.PI * (12000 - 8500 * age) / SR), wd = 0.0006 + 0.004 * age, fd = 0.00025 + 0.0012 * age;
      let exI = this.exI, l1 = this.l1, l2 = this.l2, tW = this.tW, wow = this.wow, wv = this.wv, fl = this.fl, hs = this.hs;
      for (let i = a; i < b; i++) {
        let x = 0; if (exI < this.exN) { x = this.exA * (0.5 - 0.5 * Math.cos(2 * Math.PI * exI / this.exN)); exI++; }
        const s1 = this.t1.tick(x), s2 = this.t2.tick(x * bell), s3 = this.tb.tick(x * 0.3);
        // the pickup: off-axis – an asymmetric curve (even harmonics), harder strikes drive it further
        let t = (s1 + s2 + s3) * 6;
        t = t + bark * t * t * 0.35 - 0.12 * bark * t * t * t;
        t = tanh(t * drv * 0.4) / (drv * 0.4);
        // the tape: wow (slow, uneven) and flutter as a moving read head, the top worn, hiss, now and then a dropout
        this.tape[tW & TM] = t; tW++;
        if ((i & 63) === 0) { wv += ((rng.next() * 2 - 1) * 0.5 - wv) * 0.05; }
        wow += wv / SR * 0.6; if (wow > 1) wow = 1; if (wow < -1) wow = -1;
        fl += 7.1 / SR; if (fl >= 1) fl -= 1;
        const d = 40 + SR * (wd * (0.5 + 0.5 * wow) + fd * (0.5 + 0.5 * Math.sin(2 * Math.PI * fl))), rp = tW - 1 - d, j = Math.floor(rp), fr = rp - j;
        let y = this.tape[j & TM] + fr * (this.tape[(j + 1) & TM] - this.tape[j & TM]);
        l1 += hc * (y - l1); l2 += hc * (l1 - l2); y = l2;
        if (this.dropN > 0) { this.dropN--; this.drop += (0.25 - this.drop) * 0.01; } else { this.drop += (1 - this.drop) * 0.002; if (age > 0.2 && rng.next() < age * age * 0.6 / SR) this.dropN = Math.round((0.03 + 0.08 * rng.next()) * SR); }
        hs = 0.7 * hs + 0.3 * (rng.next() * 2 - 1);
        y = this.dc.tick(y * this.drop + hs * age * 0.006 * (this.off ? 0 : 1));
        L[i] = y * og; if (R) R[i] = y * og;
      }
      this.exI = exI; this.l1 = l1; this.l2 = l2; this.tW = tW; this.wow = wow; this.wv = wv; this.fl = fl; this.hs = hs;
      for (const r of [this.t1, this.t2, this.tb]) { r.re = flush(r.re); r.im = flush(r.im); }
    }
  }
