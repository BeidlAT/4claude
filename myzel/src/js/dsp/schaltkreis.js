  // ---- Schaltkreis: myzel-bnt – a circuit-bent toy (Klangbibliothek II, 26.10.2026). Two square-ish oscillators
  // whose wires have been crossed (Kreuz: the second modulates the first's pitch and ring), sampled by a clock that
  // stumbles (the sample rate drops – the tone grows metallic aliases) and stored in too few bits; now and then the
  // circuit jumps – to the octave, the fifth, a step below (Sprung) – or the buffer sticks and stutters a few times
  // (Stottern). Höhe is the destruction: low on the field a clean little square, high up the circuit is falling apart.
  // A Puls hit is one burst of it. Every jump comes back to the note. ----
  const BNT_OUT = 0.2, BNT_J = [12, 7, -5, 24, -12, 19];
  class Bnt extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { bits: 0.4, sprung: 0.4, stottern: 0.3, kreuz: 0.3 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 61);
      this.p1 = 0; this.p2 = 0.25; this.hold = 0; this.hc = 0; this.jump = 0; this.jN = 0; this.st = new Float32Array(Math.round(0.12 * SR)); this.stW = 0; this.stB = 0; this.stI = 0; this.stLen = 1; this.stN = 0;
      this.env = 0; this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(20); this.lp = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; this.st.fill(0); this.stN = 0; }
    start(m) { this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0; if (!this.wasOn) { this.ys = this.y; this.wasOn = true; } this.rng = new PRNG((m.seed | 0) || 61); }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.03 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const D = Math.min(1, this.ys * 0.85 + 0.15 * (p.bits + p.sprung + p.stottern) / 3 * 2), hold = Math.max(1, Math.round(1 + 9 * D * D)), lev = Math.pow(2, Math.round(12 - 9 * Math.max(D, p.bits * 0.8)));
      const jr = p.sprung * D * 9, sp = p.stottern * D * 3, kx = p.kreuz * Math.min(1, 1.4 * D), att = 1 - Math.exp(-1 / (0.003 * SR)), rel = 1 - Math.exp(-1 / (0.05 * SR)), envT = this.off ? 0 : 1, og = R ? BNT_OUT * Math.SQRT1_2 : BNT_OUT;
      const SL = this.st.length;
      let p1 = this.p1, p2 = this.p2, hc = this.hc, hv = this.hold, env = this.env, lp = this.lp;
      for (let i = a; i < b; i++) {
        env += (envT - env) * (envT > env ? att : rel);
        // a jump now and then (Sprung per second), held for 40 … 160 ms, then back to the note
        if (this.jN > 0) { if (--this.jN === 0) this.jump = 0; } else if (jr > 0 && rng.next() < jr / SR) { this.jump = BNT_J[Math.floor(rng.next() * BNT_J.length)]; this.jN = Math.round((0.04 + 0.12 * rng.next()) * SR); }
        const fr = f * (this.jump ? Math.pow(2, this.jump / 12) : 1);
        // the crossed wires: the second oscillator (a seventh below, detuned) bends the first and rings with it
        p2 += fr * 0.4447 / SR; if (p2 >= 1) p2 -= 1;
        const o2 = p2 < 0.5 ? 1 : -1;
        p1 += fr * (1 + kx * 0.25 * o2) / SR; if (p1 >= 1) p1 -= 1;
        let s = (p1 < 0.5 ? 1 : -1) * (1 - 0.5 * kx) + (p1 < 0.5 ? 1 : -1) * o2 * 0.5 * kx;
        // the stumbling clock: sample and hold (the alias), then too few bits
        if (++hc >= hold) { hc = 0; hv = Math.round(s * env * lev) / lev; }
        let x = hv;
        // the sticking buffer: a slice of what just played, repeated two to six times
        if (this.stN > 0) { x = this.st[(this.stB + this.stI) % SL]; if (++this.stI >= this.stLen) { this.stI = 0; this.stN--; } }   // (the slice again – nothing new is written meanwhile)
        else {
          this.st[this.stW] = x; this.stW = this.stW + 1 === SL ? 0 : this.stW + 1;
          if (sp > 0 && rng.next() < sp / SR) { this.stLen = Math.round((0.02 + 0.06 * rng.next()) * SR); this.stB = (this.stW - this.stLen + SL) % SL; this.stI = 0; this.stN = 2 + Math.floor(rng.next() * 5); }
        }
        lp += (0.6 + 0.4 * D) * (x - lp);   // (the clean toy is a little soft; broken, every edge stays)
        const o = this.dc.tick(lp * this.vel);
        L[i] = o * og; if (R) R[i] = o * og;
      }
      this.p1 = p1; this.p2 = p2; this.hc = hc; this.hold = hv; this.env = env; this.lp = lp;
    }
  }
