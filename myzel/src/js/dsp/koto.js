  // ---- Koto: myzel-kto – a silk string on a movable bridge (Klangbibliothek II, 26.10.2026). A waveguide string (its
  // loop tuned with the filters' phase delay, its damping that of silk – the high partials fade quickly, Seide also
  // lets the string's tension wobble a little: the slightly grainy, breathing tone), plucked by an ivory nail (Nagel:
  // the pluck point close to the bridge and the nail's hard click, against the soft flesh of the finger), its body a
  // long paulownia box (three wooden resonances). The left hand behind the bridge: pressing the string there raises
  // its pitch (Oshide) – while a note is held, moving the finger up on the field presses it, up to a whole tone
  // (Druck), moving back releases; with Druck a pressed note also trembles (Yuri). Höhe at the strike is where the
  // nail plucks: low on the field round and dark, high up close to the bridge, bright and twangy. Let go: the hand
  // damps the string. ----
  const KTO_OUT = 0.3, KTO_B = [[190, 0.12, 0.6], [440, 0.08, 0.4], [950, 0.05, 0.22]];
  class Kto extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { nagel: 0.6, seide: 0.5, nachklang: 0.5, druck: 0.6 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 83);
      this.d = new FracDelay(Math.ceil(SR / 20) + 8); this.lp = 0; this.bx = KTO_B.map(() => new Reso());
      this.y0 = 0.5; this.vel = 0.75; this.dmul = 1; this.damp = false; this.ex = null; this.exI = 0; this.ck = 0; this.ys = 0.5; this.yl = 0; this.age = 0; this.dc = new DcBlock(20); this.tw = 0; this.twT = 0; this.cnt = 0; this.bend = 1;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.d.b.fill(0); this.lp = 0; for (const r of this.bx) r.re = r.im = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.y0 = this.y; this.ys = this.y; this.yl = this.y; this.dmul = m.dmul || 1; this.damp = false; this.age = 0; this.bend = 1;
      this.rng = new PRNG((m.seed | 0) || 83);
      KTO_B.forEach((B, k) => this.bx[k].set(B[0], B[1]));
      // the pluck: a displaced string (a triangle peaked at the pluck point β), the nail's click on top
      const N = Math.max(4, Math.round(SR / this.f)), beta = 0.32 - 0.24 * Math.min(1, this.y0) * (0.5 + 0.5 * this.p.nagel), pk = Math.max(1, Math.round(beta * N));
      const ex = new Float32Array(N), soft = 1 - 0.85 * this.p.nagel;
      for (let i = 0; i < N; i++) ex[i] = i < pk ? i / pk : (N - i) / (N - pk);
      // soften by the finger (a few passes of a three-point smoother: the flesh has a width)
      const passes = Math.round(soft * 6);
      for (let q = 0; q < passes; q++) { let pv = ex[0]; for (let i = 1; i < N - 1; i++) { const c = ex[i]; ex[i] = 0.25 * pv + 0.5 * c + 0.25 * ex[i + 1]; pv = c; } }
      let mean = 0; for (let i = 0; i < N; i++) mean += ex[i]; mean /= N; for (let i = 0; i < N; i++) ex[i] = (ex[i] - mean) * this.vel;
      this.ex = ex; this.exI = 0; this.ck = Math.round(0.0015 * SR);
    }
    stop() { this.off = true; this.damp = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, rng = this.rng;
      // Oshide: the finger moving up from where it struck presses the string (up to Druck × a whole tone)
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.07 * SR)));
      const press = Math.max(0, this.ys - this.y0) * 2.2, semis = Math.min(1, press) * 2 * p.druck;
      this.age += n;
      const yuri = semis > 0.15 ? 0.25 * p.druck * Math.sin(2 * Math.PI * 5.2 * this.age / SR) * Math.min(1, (semis - 0.15) * 3) : 0;
      if ((this.cnt += 1) % 24 === 0) this.twT = (rng.next() * 2 - 1) * p.seide;
      this.tw += (this.twT - this.tw) * 0.05;
      const f = this.f * Math.pow(2, (semis + yuri + this.tw * 0.04) / 12);
      // the loop: silk damps the top; the hand's damper at release; the low pass's phase delay comes off the length
      const T60 = (1.2 + 6 * p.nachklang) * Math.max(0.4, Math.min(1.6, Math.pow(260 / f, 0.5))) * this.dmul * (this.damp ? 0.05 : 1);
      const g = Math.pow(0.001, 1 / (T60 * f)), c = Math.min(0.95, 0.25 + 0.6 * (1 - 0.6 * p.seide) * Math.min(1, 900 / f + 0.3)), per = Math.max(2.5, SR / f - pd1(c, f));
      const bx = this.bx, two = R && this.rich, og = R ? KTO_OUT * Math.SQRT1_2 : KTO_OUT, d = this.d, ex = this.ex;
      let lp = this.lp;
      for (let i = a; i < b; i++) {
        let x = 0;
        if (ex && this.exI < ex.length) x = ex[this.exI++];
        let ck = 0; if (this.ck > 0) { ck = (rng.next() * 2 - 1) * 0.25 * p.nagel * this.vel * (this.ck / (0.0015 * SR)); this.ck--; }
        const o = d.read3(per);
        lp += c * (o - lp);
        d.write(x + lp * g);
        let bb = 0; for (let k = 0; k < 3; k++) bb += bx[k].tick(o * 0.02 + ck * 0.2) * KTO_B[k][2];
        const s = this.dc.tick(o * 0.9 + bb + ck);
        if (two) { L[i] = (s + bb * 0.3) * og; R[i] = (s - bb * 0.3) * og; } else { L[i] = s * og; if (R) R[i] = s * og; }
      }
      this.lp = flush(lp);
      for (const r of bx) { r.re = flush(r.re); r.im = flush(r.im); }
    }
  }
