  // ---- Achtbit: myzel-bit – a pulse-wave sound chip (Klangbibliothek II, 26.10.2026). The chip's pulse channel: a
  // pulse whose width (Tastgrad) is the colour – 12.5 % thin and nasal, 25 % the hollow lead, 50 % the square –,
  // its volume a 4-bit register (16 steps: the envelope falls in audible stairs, Abklingen), the arpeggio of the
  // trackers (the chord as a flicker of single notes, one per frame, Arpeggio: octave → fifth → major chord), the
  // delayed vibrato and a slow width sweep (Leben), and beneath it the chip's triangle channel an octave down – 32
  // steps per period, the grainy bass (Dreieck). Höhe is the width. The pulse is band-limited (PolyBLEP), the
  // triangle's stairs stay (they are the sound) but are rolled off below Nyquist. ----
  const BIT_OUT = 0.11, BIT_ARP = [[0, 12], [0, 7, 12], [0, 4, 7, 12], [0, 3, 7, 10, 12]];
  class Bit extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { arpeggio: 0, leben: 0.35, dreieck: 0.4, abklingen: 0.4 };
      if (this.po.prm) this.set(this.po.prm);
      this.ph = 0; this.ph2 = 0.37; this.pt = 0; this.fr = 0; this.fc = 0; this.ai = 0; this.age = 0; this.lfo = 0;
      this.env = 0; this.ys = this.y; this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(12); this.dcR = new DcBlock(12); this.lt = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; this.lt = 0; }
    start(m) { this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0; if (!this.wasOn) { this.ys = this.y; this.wasOn = true; } this.age = 0; this.env = 1; this.fc = 0; this.ai = 0; }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.02 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const ar = p.arpeggio > 0.04 ? BIT_ARP[Math.min(3, Math.floor(p.arpeggio * 4))] : null, frame = Math.round(SR / 60);
      // the volume register: falls from 15 to the hold level (Abklingen: how fast and how far), let go 15 frames to 0
      const fall = (0.15 + 2.5 * p.abklingen * p.abklingen) * SR, hold = 1 - 0.75 * p.abklingen, relS = 1 / (0.12 * SR);
      const duty0 = 0.5 - 0.375 * Math.min(1, this.ys), lv = p.leben, tri = p.dreieck * Math.max(0, Math.min(1, (1400 - f) / 900)), og = R ? BIT_OUT * Math.SQRT1_2 : BIT_OUT;
      const lp = 1 - Math.exp(-2 * Math.PI * Math.min(0.42 * SR, 14000) / SR);
      let ph = this.ph, ph2 = this.ph2, pt = this.pt, fc = this.fc, ai = this.ai, age = this.age, lfo = this.lfo, env = this.env, lt = this.lt;
      for (let i = a; i < b; i++) {
        // the frame clock: the arpeggio steps once a frame
        if (++fc >= frame) { fc = 0; ai++; }
        const semi = ar ? ar[ai % ar.length] : 0;
        age++;
        lfo += (4.5 + 2 * lv) / SR; if (lfo >= 1) lfo -= 1;
        const sl = Math.sin(2 * Math.PI * lfo), vib = age > 0.3 * SR ? Math.min(1, (age - 0.3 * SR) / (0.4 * SR)) * lv * 0.012 * sl : 0;   // (± 20 ct, after 0.3 s)
        const fr = f * (semi ? Math.pow(2, semi / 12) : 1) * (1 + vib), dt = fr / SR;
        const duty = Math.max(0.06, Math.min(0.5, duty0 + lv * 0.09 * Math.sin(2 * Math.PI * (age / SR) * 0.35)));
        // the register: this.env runs smooth, the chip hears it in 16 steps
        if (this.off) env -= relS; else env = hold + (1 - hold) * Math.exp(-age / fall);
        if (env < 0) env = 0;
        const v4 = Math.ceil(env * 15 - 1e-6) / 15;
        ph += dt; if (ph >= 1) ph -= 1;
        let q = ph + 1 - duty; if (q >= 1) q -= 1;
        const pul = (2 * ph - 1 - blep(ph, dt)) - (2 * q - 1 - blep(q, dt));
        // the triangle, an octave down, 32 steps per period
        pt += dt * 0.5; if (pt >= 1) pt -= 1;
        const st = Math.floor(pt * 32), tv = (st < 16 ? st : 31 - st) / 7.5 - 1;
        lt += lp * (tv - lt);
        const s = (pul * 0.5 + lt * tri * 0.9) * v4 * this.vel;
        if (R && this.rich) {
          ph2 += dt * 1.0046; if (ph2 >= 1) ph2 -= 1;
          let q2 = ph2 + 1 - Math.min(0.5, duty * 1.25); if (q2 >= 1) q2 -= 1;
          const p2 = (2 * ph2 - 1 - blep(ph2, dt)) - (2 * q2 - 1 - blep(q2, dt)), s2 = (p2 * 0.5 + lt * tri * 0.9) * v4 * this.vel;
          L[i] = this.dc.tick(s * 0.75 + s2 * 0.25) * og; R[i] = this.dcR.tick(s * 0.25 + s2 * 0.75) * og;
        } else { const o = this.dc.tick(s) * og; L[i] = o; if (R) R[i] = o; }
      }
      this.ph = ph; this.ph2 = ph2; this.pt = pt; this.fc = fc; this.ai = ai; this.age = age; this.lfo = lfo; this.env = env; this.lt = lt;
    }
  }
