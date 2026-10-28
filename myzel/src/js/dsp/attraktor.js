  // ---- Attraktor: myzel-atr – a strange attractor played as an instrument (Klangbibliothek II, 26.10.2026). The
  // Rössler system (x' = −y − z, y' = x + a·y, z' = b + z·(x − c)) integrated at audio rate (Runge–Kutta, substeps for
  // high notes): its orbit loops once per period, and a frequency-locked loop scales its time so that the loop is the
  // note. Höhe is c, the road to chaos: low on the field a single loop (a soft, round tone), then the period doubles –
  // every second loop differs: the octave below appears –, doubles again (two octaves below), and high up the orbit
  // never repeats: chaos, a growling, breathing noise around the note. Mischung blends the smooth x into the spiky z
  // (each loop's sharp flick), Farbe is a low pass, Drift lets a and b wander slowly – the road moves under the hand. ----
  const ATR_OUT = 0.085;
  class Atr extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { mischung: 0.3, farbe: 0.6, drift: 0.3, tiefe: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 53);
      this.x = 1; this.yv = 1; this.z = 0.05; this.m = 1; this.last = 0; this.cnt = 0; this.ys = this.y; this.env = 0; this.lp = 0; this.lp2 = 0; this.hp = 0; this.zx = 0; this.dv = 0; this.dw = 0;
      this.dc = new DcBlock(15); this.dc2 = new DcBlock(15); this.vel = 0.75; this.burst = false; this.gate = 0;
      this.kH = 0; this.kA = 0; this.kB = 0; this.kC = 0;   // (rk's step and constants, set once a block)
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.x = 1; this.yv = 1; this.z = 0.05; this.env = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; this.m = 1.0; }
    }
    stop() { this.off = true; }
    // one Runge–Kutta step of the system (written out: no closure, no array in the inner loop). Its step and constants
    // come in fields, not as arguments: render is too large for V8 to inline rk, and every number passed to a call is a
    // new heap object there – four per step, 3 MB of the audio thread's garbage per voice and second in Chrome (28.10.2026)
    rk() {
      const h = this.kH, a = this.kA, bb = this.kB, c = this.kC;
      const x = this.x, y = this.yv, z = this.z;
      const a1 = -y - z, b1 = x + a * y, c1 = bb + z * (x - c);
      let X = x + 0.5 * h * a1, Y = y + 0.5 * h * b1, Z = z + 0.5 * h * c1;
      const a2 = -Y - Z, b2 = X + a * Y, c2 = bb + Z * (X - c);
      X = x + 0.5 * h * a2; Y = y + 0.5 * h * b2; Z = z + 0.5 * h * c2;
      const a3 = -Y - Z, b3 = X + a * Y, c3 = bb + Z * (X - c);
      X = x + h * a3; Y = y + h * b3; Z = z + h * c3;
      const a4 = -Y - Z, b4 = X + a * Y, c4 = bb + Z * (X - c);
      this.x = x + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4); this.yv = y + h / 6 * (b1 + 2 * b2 + 2 * b3 + b4); this.z = z + h / 6 * (c1 + 2 * c2 + 2 * c3 + c4);
      if (!(Math.abs(this.x) < 100 && Math.abs(this.z) < 200)) { this.x = 1; this.yv = 1; this.z = 0.05; }   // (never off to infinity)
    }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.05 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      // the road: c from a single loop (2.3) through the doublings (≈ 3.5, 4.2, 4.5) into chaos (≥ 5)
      this.dv += ((rng.next() * 2 - 1) * 0.3 - this.dv) * 0.01; this.dw += this.dv * n / SR; this.dw = Math.max(-1, Math.min(1, this.dw));
      const c = 2.3 + 3.9 * Math.pow(this.ys, 1.25), A = 0.2 + 0.03 * p.drift * this.dw, B = 0.2 + 0.05 * p.drift * Math.sin(3 * this.dw);
      // time: one loop of the orbit (≈ 6.07 units at the start of the road) is one period of the note; the lock corrects
      const per = SR / f, H = (6.07 / per) * this.m, sub = Math.max(1, Math.ceil(H / 0.12)), h = H / sub;
      const mix = p.mischung + 0.55 * this.ys * (1 - p.mischung), cut = 1 - Math.exp(-2 * Math.PI * Math.min(0.42 * SR, f * (1.5 + 14 * p.farbe) * (0.7 + 0.8 * this.ys)) / SR), og = R ? ATR_OUT * Math.SQRT1_2 : ATR_OUT;
      const att = 1 - Math.exp(-1 / (0.01 * SR)), rel = 1 - Math.exp(-1 / (0.08 * SR)), envT = this.off ? 0 : 1;
      let env = this.env, lp = this.lp, lp2 = this.lp2;
      this.kH = h; this.kA = A; this.kB = B; this.kC = c;
      for (let i = a; i < b; i++) {
        for (let s = 0; s < sub; s++) this.rk();
        env += (envT - env) * (envT > env ? att : rel);
        // the lock: x's upward zero crossings, the loop's length against the period (≈ 30 ms to settle)
        this.cnt++;
        if (this.last < 0 && this.x >= 0) { if (this.cnt > per * 0.4) { const r = this.cnt / per; this.m *= Math.pow(r, 0.08); this.m = Math.max(0.3, Math.min(3, this.m)); } this.cnt = 0; }
        this.last = this.x;
        // the voice: smooth x, and z's flick (high-passed), blended; the sub octave a doubling makes is kept warm (Tiefe)
        const zh = this.dc2.tick(this.z);
        let o = this.x * (1 - mix) + zh * 0.6 * mix + this.yv * 0.25 * (1 - mix) * p.tiefe;
        lp += cut * (o - lp); lp2 += cut * (lp - lp2); o = this.dc.tick(lp2);
        o = tanh(o * env * this.vel * ATR_OUT * 1.6) / 1.6;
        const k = og / ATR_OUT; L[i] = o * k; if (R) R[i] = this.rich ? (0.75 * o + 0.25 * tanh(this.yv * env * this.vel * ATR_OUT * 1.6) / 1.6) * k : L[i];   // (level 3: y beside x – the orbit's other side to the right)
      }
      this.env = env; this.lp = lp; this.lp2 = lp2;
    }
  }
