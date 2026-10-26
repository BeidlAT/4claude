  // ---- Sitar: myzel-sit – a string on a curved bridge (Klangbibliothek II, 26.10.2026). The jawari: the string
  // rests on a wide, gently curved bridge, so while it swings towards it its speaking length shortens a little – its
  // pitch and its spectrum move with every period; the buzz that comes from it is loudest in the attack and fades with
  // the swing (a delay line whose length follows the string's own displacement: Välimäki et al., the sitar model). The
  // mizrab (wire plectrum) strikes near the bridge. Two chikari strings (the key's Sa, high) are touched with every
  // stroke; eleven tarab strings under the frets, tuned to the scale, ring with what is played. Höhe is the bridge:
  // low on the field a clean, round tone, high up the open, buzzing jawari. A glide of the finger (meend) bends the
  // string as it rings. ----
  const SIT_OUT = 0.018;
  class SitStr {
    constructor(n) { this.b = new Float32Array(n); this.m = n - 1; this.w = 0; this.z = 0; this.d = 100; this.g = 0.999; this.c = 0.5; this.x1 = 0; }
    tune(f, t60, bright) {
      this.c = Math.min(0.98, 0.18 + 0.8 * bright * Math.min(1, 1600 / f));
      this.d = Math.max(4, SR / f - pd1(this.c, f) - 1);
      this.g = Math.pow(0.001, 1 / (Math.max(0.05, t60) * f));
    }
    // one sample: the excitation in, the string's output at the bridge out; jaw: how much the bridge shortens it
    tick(x, jaw) {   // (the bridge's contact shortens the string while it presses: the open length is set a little longer, see Sit.tune)
      const b = this.b, m = this.m;
      // the contact: the string's last output towards the bridge (positive side) shortens the delay, smoothly
      const u = this.x1 > 0 ? this.x1 * 6 : 0, ct = u < 1 ? u * u * (3 - 2 * u) : 1, d = this.d * (1 - jaw * 0.018 * ct);
      const i = Math.floor(d), f = d - i, p = f + 1, w = this.w + 1 - i;
      const o = -(p - 1) * (p - 2) * (p - 3) / 6 * b[w & m] + p * (p - 2) * (p - 3) / 2 * b[(w - 1) & m] - p * (p - 1) * (p - 3) / 2 * b[(w - 2) & m] + p * (p - 1) * (p - 2) / 6 * b[(w - 3) & m];
      this.z += this.c * (o - this.z);
      this.w = (this.w + 1) & m; b[this.w] = x + this.z * this.g;
      this.x1 = o;
      return o;
    }
    clear() { this.b.fill(0); this.z = 0; this.x1 = 0; }
  }
  class Sit extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { jawari: 0.6, tarab: 0.5, chikari: 0.35, nachklang: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 17);
      const n = 1 << Math.ceil(Math.log2(SR / 25 + 8));
      this.s = new SitStr(n);
      const ch = this.po.ch && this.po.ch.length ? this.po.ch : [523.25, 1046.5];
      this.ch = ch.slice(0, 2).map((f) => { const s = new SitStr(1 << Math.ceil(Math.log2(SR / 60 + 8))); s.f0 = f; return s; });
      const tar = this.po.tar && this.po.tar.length ? this.po.tar : [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3, 659.3, 784];
      this.tar = tar.slice(0, this.lite ? 6 : 11).map((f, i) => { const r = new Reso(); r.set(f, 3.2 + (i % 3) * 0.6); return { r, pan: this.rich ? ((i % 2) ? 0.15 : -0.15) : 0 }; });
      this.fT = 0; this.exN = 0; this.exI = 0; this.exA = 0; this.vel = 0.75; this.y0 = 0.5; this.hp = 0; this.lp = 0; this.dmul = 1; this.dcL = new DcBlock(20); this.dcR = new DcBlock(20);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fT = 0; }
    reset() { this.s.clear(); for (const c of this.ch) c.clear(); for (const t of this.tar) t.r.re = t.r.im = 0; this.exN = 0; }
    tune(f) {
      this.fT = f;
      const t60 = (2 + 9 * this.p.nachklang) * this.dmul * Math.max(0.5, Math.min(1.5, Math.pow(260 / f, 0.35)));
      this.s.tune(f, t60, 0.55 + 0.35 * this.y0); this.s.d *= 1 + 0.0045 * Math.min(1.6, this.p.jawari * (0.25 + 1.5 * this.y0));   // (in tune on average)
      for (const c of this.ch) c.tune(c.f0, 1.4, 0.9);
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.dmul = m.dmul || 1;
      this.rng = new PRNG((m.seed | 0) || 17);
      this.tune(this.f);
      // the mizrab: a short pulse near the bridge (1.2 … 0.5 ms – the open jawari is struck harder), a little wire noise
      this.exN = Math.max(6, Math.round((0.0012 - 0.0007 * this.y0) * SR)); this.exI = 0; this.exA = this.vel * 0.9;
      this.chA = this.p.chikari * this.vel * 0.35;
    }
    render(L, R, a, b) {
      if (Math.abs(this.f - this.fT) > 0.0005 * this.fT) this.tune(this.f);
      const s = this.s, ch = this.ch, tar = this.tar, nt = tar.length, rng = this.rng;
      const og = R ? SIT_OUT * Math.SQRT1_2 : SIT_OUT, jaw = Math.min(1.6, this.p.jawari * (0.25 + 1.5 * this.y0)), tg = 0.06 * this.p.tarab, chA = this.chA;
      let exI = this.exI, lp = this.lp;
      for (let i = a; i < b; i++) {
        let x = 0, xc = 0;
        if (exI < this.exN) { const u = exI / this.exN; x = this.exA * (u < 0.5 ? 2 * u : 2 - 2 * u) + 0.08 * this.exA * (rng.next() * 2 - 1); xc = x * chA; exI++; }
        const o = s.tick(x, jaw);
        let c = 0; for (let k = 0; k < ch.length; k++) c += ch[k].tick(xc, jaw * 0.8);
        // the tarab strings hear the main string (through the bridge), softly
        lp += 0.3 * (o - lp);
        let tl = 0, tr = 0; for (let k = 0; k < nt; k++) { const t = tar[k], v = t.r.tick(lp * tg); tl += v * (1 - t.pan); tr += v * (1 + t.pan); }
        const m0 = o + 0.6 * c;
        L[i] = this.dcL.tick((m0 + tl * this.p.tarab * 1.6) * og); if (R) R[i] = this.dcR.tick((m0 + tr * this.p.tarab * 1.6) * og);
      }
      this.exI = exI; this.lp = lp;
      for (const t of tar) { t.r.re = flush(t.r.re); t.r.im = flush(t.r.im); }
    }
  }
