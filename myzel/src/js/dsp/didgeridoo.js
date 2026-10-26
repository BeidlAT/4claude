  // ---- Didgeridoo: myzel-did – lips buzzing into a long tube (Klangbibliothek II, 26.10.2026). The lips open once a
  // period (a smooth flow pulse, a little uneven – Rauheit); the bore answers with resonances that are not harmonic
  // (≈ 1, 2.45, 3.9, 5.35 × the drone: the tube is wider at its end), and the player's mouth – tongue and cheeks –
  // throws strong formants over the drone: that is the didgeridoo's „wa-yo“. Höhe is the tongue: low on the field a
  // dark „oo“, high up a bright „ee“; moving makes the vowels talk. Knurren sings with the lips (a voice a fifth up, its
  // difference tone a growl, and a subharmonic flutter); circular breathing leaves a short dip and an accent every
  // few seconds (Atem). A Puls hit is a „toot“: an overblown accent. ----
  const DID_OUT = 0.32;
  class Did extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { rohr: 0.6, knurren: 0.25, atem: 0.5, rauheit: 0.3 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 23);
      this.bore = [0, 1, 2, 3].map(() => new Biquad()); this.fm = [new Biquad(), new Biquad()];
      this.ph = 0; this.ph2 = 0; this.ph3 = 0; this.u1 = 0; this.pr = 0; this.ys = this.y; this.fT = 0; this.yT = -1;
      this.br = 0; this.brN = Math.round(2.6 * SR); this.toot = 0; this.dc = new DcBlock(25); this.jit = 0; this.jitT = 0; this.vel = 0.75; this.burst = false; this.gate = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { for (const q of this.bore.concat(this.fm)) q.z1 = q.z2 = 0; this.pr = 0; this.u1 = 0; }
    tuneBore(f) {
      this.fT = f;
      const R = [1, 2.45, 3.9, 5.35], Q = [3 + 4 * this.p.rohr, 5 + 5 * this.p.rohr, 6 + 5 * this.p.rohr, 7 + 5 * this.p.rohr];
      this.bore.forEach((q, i) => q.bp(Math.min(0.45 * SR, f * R[i]), Q[i]));
    }
    // the mouth: F1 280 → 800 Hz, F2 700 → 2300 Hz along the tongue, strong and narrow
    tuneMouth(y) {
      this.yT = y;
      this.fm[0].peak(280 + 520 * y, 5, 10); this.fm[1].peak(700 + 1700 * Math.pow(y, 1.15), 7, 18);
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      this.rng = new PRNG((m.seed | 0) || 23);
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.tuneBore(this.f); this.tuneMouth(this.ys);
      this.toot = this.burst ? 1 : 0.35;   // (the first push of air; a Puls hit overblows)
      this.br = Math.round((1.2 + this.rng.next()) * SR);
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, f = this.f;
      if (Math.abs(f - this.fT) > 0.001 * f) this.tuneBore(f);
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.03 * SR)));
      if (Math.abs(this.ys - this.yT) > 0.002) this.tuneMouth(this.ys);
      const p = this.p, rng = this.rng, bore = this.bore, fm0 = this.fm[0], fm1 = this.fm[1], G = [1, 0.8, 0.6, 0.4];
      const oq = 0.5 + 0.1 * p.rauheit, gr = p.knurren * (0.4 + 0.6 * this.ys), ra = p.rohr, dt = f / SR;
      let ph = this.ph, ph2 = this.ph2, ph3 = this.ph3, u1 = this.u1, pr = this.pr, toot = this.toot, br = this.br, jit = this.jit;
      const target = this.off ? 0 : 1, og = R ? DID_OUT * Math.SQRT1_2 : DID_OUT;
      for (let i = a; i < b; i++) {
        // the breath: the lips' pressure, its dips (circular breathing) and the toots
        if (!this.off && p.atem > 0 && --br <= 0) { br = Math.round((2.2 + 1.4 * rng.next()) * SR); toot = 0.5 * p.atem; }
        const brDip = br < 0.14 * SR && br > 0 && p.atem > 0 ? 0.55 : 1;
        pr += (target * brDip * (1 + toot) - pr) * (this.off ? 0.0016 : 0.0009);
        toot *= 0.99985;
        if (this.burst && --this.gate <= 0) { this.off = true; }
        // the lips: a flow pulse (sin² over the open part of the period), its slope brightens it; a little jitter
        if ((i & 63) === 0) jit += ((rng.next() - 0.5) * 0.004 * p.rauheit - jit) * 0.3;
        ph += dt * (1 + jit); if (ph >= 1) ph -= 1;
        const u = ph < oq ? Math.pow(Math.sin(Math.PI * ph / oq), 2) : 0, du = u - u1; u1 = u;
        let s = (u - 0.5 * oq) * (0.7 - 0.35 * this.ys) + du * (4 + 22 * this.ys + 30 * toot) * Math.min(1, 300 / f);   // (the tongue up: the lips' edge sharper, a brighter buzz)
        // Knurren: a voice a fifth above (the difference tone growls) and a flutter at half the drone
        if (gr > 0.01) { ph2 += dt * 1.4983; if (ph2 >= 1) ph2 -= 1; ph3 += dt * 0.5; if (ph3 >= 1) ph3 -= 1; s = s * (1 + 0.55 * gr * Math.sin(2 * Math.PI * ph3)) + gr * 0.35 * (2 * ph2 - 1); }
        s *= pr;
        // the bore: its resonances over the lips' buzz
        let bo = 0; for (let k = 0; k < 4; k++) bo += bore[k].tick(s) * G[k];
        let o = (0.3 + 0.4 * this.ys) * s + bo * (0.8 + 1.4 * ra) * (1 - 0.35 * this.ys);
        o = fm1.tick(fm0.tick(o));
        o = this.dc.tick(o);
        o = tanh(o * 0.9) * 1.1;
        L[i] = o * og; if (R) R[i] = L[i];
      }
      this.ph = ph; this.ph2 = ph2; this.ph3 = ph3; this.u1 = u1; this.pr = pr; this.toot = toot; this.br = br; this.jit = jit;
    }
  }
