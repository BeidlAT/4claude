  // ---- Kehlchen: myzel-syrinx – a songbird's syrinx (SPEC §3.13, reserve 1) ----
  // The labia as a normal-form oscillator (Laje/Mindlin): x'' = −x − κx³ − C·x²·x' + b·x' + η, in the phase of the
  // note (φ = ω t; semi-implicit Euler, two substeps a sample). b is the air-sac pressure: below 0 the labia rest (air
  // only), at 0 they start to sing (a Hopf threshold, amplitude ∝ √b), higher up the tone turns relaxed and rich. The
  // pitch is held by a frequency-locked loop (zero crossings → the step's multiplier, 20 ms): pressure and stiffness bend
  // a labium's pitch by up to two semitones (measured, SPEC), the loop takes it back. Roughness is turbulence in the
  // drive, every other cycle's pressure up and down at the top (period doubling – a raven's croak) and, at level 3, the
  // second pair a few cents (rough: up to 100 ct) away, both on one air sac (the pressure one pair's flow takes is the
  // other's loss: −24 dB tones between). A syllable generator shapes pressure and pitch per onset: Chip (an upward
  // flick into the note), Triller (pressure pulses, 13–25 a second), Ruf (a down-slurred call, repeated while held);
  // a jump of Höhe, a shake (Gestik) and every Puls hit start a new one. The throat follows the note, the trachea's
  // resonance (c/4L, L 3–7 cm: Schnabel) and the beak (a low-pass opening with the pressure) colour it.
  const KHL_OUT = 0.23, KHL_C = 1, KHL_Q0 = 1.1, KHL_DC = 2 * Math.PI * 20 / SR;
  const khlCeil = (x) => (x > 0.9 ? 0.9 + 0.1 * tanh((x - 0.9) * 10) : x < -0.9 ? -0.9 - 0.1 * tanh((-x - 0.9) * 10) : x);   // (never past 1: the top's rough peaks)
  class Syrinx extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { spannung: 0.5, druck: 0.5, schnabel: 0.5, rauheit: 0.3, silbe: 'chip', anstieg: 0.3 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 7);
      this.tA = [new Biquad(), new Biquad()]; this.tB = this.rich ? [new Biquad(), new Biquad()] : null;
      this.vel = 0.75; this.burst = false; this.gate = 0;
      this.reset(); this.coef();
    }
    reset() {
      this.xA = this.uA = this.xB = this.uB = 0; this.mA = this.mB = 1;
      this.pr = -0.6; this.ys = this.y; this.yT = this.y;
      this.zA = { last: 0, cnt: 0, arm: false, amp: 0, flip: 1 }; this.zB = { last: 0, cnt: 0, arm: false, amp: 0, flip: 1 };
      this.bA = this.bB = 0; this.sy = 0; this.syN = 0; this.syD = 1; this.tr = 0; this.ruf = 0;
      for (const q of [this.tA, this.tB]) if (q) for (const f of q) f.z1 = f.z2 = 0;
    }
    set(p) {
      for (const k in p) if (k in this.p) this.p[k] = k === 'silbe' ? String(p[k]) : +p[k] || 0;
      if (this.tA) this.coef();
    }
    // the trachea: c/4L and 3c/4L for L 7 cm (Schnabel 0) … 3 cm (Schnabel 1)
    coef() {
      const f1 = 1225 * Math.pow(2.8 / 1.225, this.p.schnabel);
      for (const q of [this.tA, this.tB]) if (q) q[1].peak(f1, 2.2, 3.5);
      this.kap = 0.04 + 0.3 * this.p.spannung;   // Spannung: the labia's stiffness – more of the odd partials
      this.fo = 0;
    }
    // the throat (oropharyngeal cavity) follows the note – a songbird tunes it to its fundamental (Riede 2006): the
    // tone stays pure and even across the field; the trachea's fixed resonance colours the partials
    oec(f) { if (Math.abs(f - this.fo) > 0.01 * this.fo) { this.fo = f; for (const q of [this.tA, this.tB]) if (q) q[0].peak(Math.min(0.42 * SR, f), 1.4, 4); } }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      this.rng = new PRNG((m.seed | 0) || 7);
      if (!this.wasOn) { this.pr = -0.4; this.xA = 1e-3; this.uA = 0; this.xB = -1e-3; this.uB = 0; this.wasOn = true; this.mA = this.mB = this.guess(); }
      this.ys = this.yT = this.y;
      this.trig();
    }
    stop() { this.off = true; }
    extra(m) { if (m.silbe) this.trig(); }
    // a syllable begins: its shape runs over syD samples (Triller runs on by itself, Ruf repeats while held)
    trig() {
      const k = this.p.silbe, r = this.rng.next();
      this.sy = 0; this.syK = k;
      this.syD = Math.round((k === 'chip' ? 0.022 + 0.022 * r + 0.02 * (1 - this.vel) : k === 'ruf' ? 0.1 + 0.05 * r : 0.05) * SR);
      if (k === 'ruf') this.ruf = Math.round((0.55 + 0.35 * this.rng.next()) * SR);
      if (k === 'triller') this.tr = 0;
    }
    // the step's first multiplier: the labia's own pitch at the pressure the note starts with (a short run without
    // sound: a dozen periods), so the first chip already lands where the loop would bring it
    guess() {
      const b = Math.max(0.02, this.bOf(this.y)), k = this.kap, h = 2 * Math.PI * Math.min(this.f, 6000) / SR / 2;
      let x = 0.5, u = 0, last = 0, t = 0, n = 0, t0 = 0, per = 0;
      for (let i = 0; i < 40000 && n < 14; i++) {
        for (let s = 0; s < 2; s++) { u += h * (-x - k * x * x * x - KHL_C * x * x * u + b * u); x += h * u; }
        t++;
        if (last < 0 && x >= 0) { const tc = t - x / (x - last); if (n === 4) t0 = tc; if (n >= 4) per = (tc - t0) / Math.max(1, n - 4); n++; }
        last = x;
      }
      const T = SR / Math.min(this.f, 6000);
      return per > 0 ? Math.min(1.8, Math.max(0.6, per / T)) : 1;
    }
    // the pressure a height asks for (Druck moves the threshold: at 0.5 the labia start at y ≈ 0.19)
    bOf(y) { return -0.3 + 1.6 * y + (this.p.druck - 0.5) * 0.6; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, rr = p.rauheit, two = this.rich && !this.lite, kap = this.kap, C = KHL_C;
      // the pressure: up with Anstieg (a harder touch faster: a chip), down within ≈ 5 ms after the end
      const yk = 1 - Math.exp(-n / (0.012 * SR)); this.ys += yk * (this.y - this.ys);
      if (!this.off && Math.abs(this.y - this.yT) > 0.12) { this.yT = this.y; if (p.silbe !== 'aus' && p.silbe !== 'triller') this.trig(); }   // a jump of Höhe: a new syllable
      const ys = this.ys, bT = this.off ? -0.8 : this.bOf(ys);
      const rise = (0.002 + 0.16 * p.anstieg * p.anstieg) * (1.45 - 0.9 * this.vel), rk = 1 - Math.exp(-1 / ((bT > this.pr ? rise : 0.005) * SR));
      const top = Math.max(0, Math.min(1, (ys - 0.55) / 0.4)), pd = rr * top * top * 0.7;   // period doubling at the top
      const eta = rr * 0.35 + 0.004, w0 = 2 * Math.PI * this.f / SR, cB = cents(two ? 6 + 94 * rr * top : 0);
      const K = two ? 0.15 + 0.55 * rr : 0;   // the shared air sac
      const bk = Math.min(0.45, (1800 + 9000 * Math.max(0, ys)) * (0.6 + 0.8 * p.schnabel) / SR), bkc = 1 - Math.exp(-2 * Math.PI * bk);
      // what sounds is the air let through: the labia's opening (rest 1.1) – past it they shut for part of each cycle, so
      // the higher the pressure (the wider the swing), the more partials; a little of the opening's speed on top
      const br = 0.1 + 0.25 * Math.max(0, Math.min(1, (ys - 0.3) / 0.7)), og = KHL_OUT * (two ? 0.75 : 1);   // (level 3 is stereo past the voice's centre panner: as loud as level 1)
      this.oec(this.f);
      const fa0 = this.tA[0], fa1 = this.tA[1], fb0 = two ? this.tB[0] : fa0, fb1 = two ? this.tB[1] : fa1;
      const a0b0 = fa0.b0, a0b1 = fa0.b1, a0b2 = fa0.b2, a0a1 = fa0.a1, a0a2 = fa0.a2, a1b0 = fa1.b0, a1b1 = fa1.b1, a1b2 = fa1.b2, a1a1 = fa1.a1, a1a2 = fa1.a2;
      let za1 = fa0.z1, za2 = fa0.z2, zb1 = fa1.z1, zb2 = fa1.z2, zc1 = fb0.z1, zc2 = fb0.z2, zd1 = fb1.z1, zd2 = fb1.z2;
      const zA = this.zA, zB = this.zB, trR = (13 + 12 * ys) / SR, kd = this.syK, off = this.off, burst = this.burst;
      let xA = this.xA, uA = this.uA, xB = this.xB, uB = this.uB, pr = this.pr, lA = this.bA, lB = this.bB, rs = this.rng.s | 0;
      let mA = this.mA, mB = this.mB, cA = zA.cnt, sA0 = zA.last, gA = zA.arm, aA = zA.amp, fA = zA.flip, cBn = zB.cnt, sB0 = zB.last, gB = zB.arm, aB = zB.amp, fB = zB.flip;
      let sy = this.sy, syD = this.syD, tr = this.tr, ruf = this.ruf, gate = this.gate, wsL = NaN, csg = 1, dA = this.dA || 0, dB = this.dB || 0;
      const aG = 0.55 + 0.45 * rr;
      for (let i = a; i < b; i++) {
        pr += rk * (bT - pr);
        // the syllable: a pressure offset and a pitch shape
        let sb = 0, sg = 0;
        if (kd === 'triller' && !off) {   // pulses with gaps: under the threshold for a third of each
          tr += trR; if (tr >= 1) tr -= 1;
          sb = tr < 0.66 ? 0.25 * Math.sin(Math.PI * tr / 0.66) : -0.6 - (pr > 0 ? pr : 0); sg = tr < 0.15 ? -90 * (1 - tr / 0.15) : 0;
        } else if (sy < syD) {
          const ph = sy / syD; sy++;
          if (kd === 'chip') { sg = -260 * (1 - ph) * (1 - ph); sb = 0.5 * (1 - ph); }
          else if (kd === 'ruf') { sg = 320 * Math.pow(1 - ph, 1.5); sb = 0.35 * Math.sin(Math.PI * ph); }
        } else if (kd === 'ruf' && !off && !burst) {   // the call again, after a breath
          if (--ruf <= 0) { this.sy = sy; this.trig(); sy = this.sy; syD = this.syD; ruf = this.ruf; }
          else if (ruf < 0.05 * SR) sb = -0.7 - (pr > 0 ? pr : 0);
        }
        const bb = pr + sb, pos = bb > 0 ? bb : 0, gw = pr + 0.6 < 0 ? 0 : pr + 0.6 > 0.2 ? 0.2 : pr + 0.6;
        if (sg !== wsL) { wsL = sg; csg = sg === 0 ? 1 : cents(sg); }
        const ws = 0.5 * w0 * csg;
        // pair A (and B), two substeps; the pressure each sees: the sac's, less the other's flow (K), every other
        // cycle up or down (period doubling)
        rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; const r1 = (rs >>> 0) / 2147483648 - 1;   // (noise −1 … 1, xorshift inline)
        const nA = eta * r1 * (gw + pos);
        const bAe = bb * (1 + pd * fA) - K * xB * xB, hA = ws * mA;
        uA += hA * (-xA - kap * xA * xA * xA - C * xA * xA * uA + bAe * uA + nA); xA += hA * uA;
        uA += hA * (-xA - kap * xA * xA * xA - C * xA * xA * uA + bAe * uA + nA); xA += hA * uA;
        // the loop: a crossing upward, its period against the note's (with the syllable's pitch)
        cA++;
        if (xA < -0.3 * aA) gA = true;
        if (gA && sA0 < 0 && xA >= 0) {
          const tc = cA - xA / (xA - sA0); gA = false; fA = -fA;
          if (tc > 2 && aA > 0.05 && bb > 0.02) { const T = Math.PI / ws; mA *= Math.pow(tc / T, 1 - Math.exp(-tc / (0.02 * SR))); mA = mA > 1.8 ? 1.8 : mA < 0.6 ? 0.6 : mA; }
          cA -= tc;
        }
        sA0 = xA; aA = xA > aA ? xA : -xA > aA ? -xA : aA * 0.9995;
        // air: the sac's flow through the trachea, with or without the labia (singing, less of it)
        rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; const pa = pr + 0.6, air = aG * (pa < 0 ? 0 : pa > 0.6 ? 0.6 : pa) * (aA > 0.3 ? 0.35 : 1) * ((rs >>> 0) / 2147483648 - 1);
        // throat (it follows the note) and trachea, then the beak
        const qA = xA + KHL_Q0, wA = 0.5 * (qA + Math.sqrt(qA * qA + 0.02)); dA += KHL_DC * (wA - dA);
        let v = wA - dA + br * uA + air, y0 = a0b0 * v + za1; za1 = a0b1 * v - a0a1 * y0 + za2; za2 = a0b2 * v - a0a2 * y0;
        let y1 = a1b0 * y0 + zb1; zb1 = a1b1 * y0 - a1a1 * y1 + zb2; zb2 = a1b2 * y0 - a1a2 * y1;
        lA += bkc * (y1 - lA);
        if (two) {
          const bBe = bb * (1 + pd * fB) - K * xA * xA, hB = ws * cB * mB, nB = eta * r1 * (gw + pos);
          uB += hB * (-xB - kap * xB * xB * xB - C * xB * xB * uB + bBe * uB + nB); xB += hB * uB;
          uB += hB * (-xB - kap * xB * xB * xB - C * xB * xB * uB + bBe * uB + nB); xB += hB * uB;
          cBn++;
          if (xB < -0.3 * aB) gB = true;
          if (gB && sB0 < 0 && xB >= 0) {
            const tc = cBn - xB / (xB - sB0); gB = false; fB = -fB;
            if (tc > 2 && aB > 0.05 && bb > 0.02) { const T = Math.PI / (ws * cB); mB *= Math.pow(tc / T, 1 - Math.exp(-tc / (0.02 * SR))); mB = mB > 1.8 ? 1.8 : mB < 0.6 ? 0.6 : mB; }
            cBn -= tc;
          }
          sB0 = xB; aB = xB > aB ? xB : -xB > aB ? -xB : aB * 0.9995;
          const qB = xB + KHL_Q0, wB = 0.5 * (qB + Math.sqrt(qB * qB + 0.02)); dB += KHL_DC * (wB - dB);
          v = wB - dB + br * uB + air; y0 = a0b0 * v + zc1; zc1 = a0b1 * v - a0a1 * y0 + zc2; zc2 = a0b2 * v - a0a2 * y0;
          y1 = a1b0 * y0 + zd1; zd1 = a1b1 * y0 - a1a1 * y1 + zd2; zd2 = a1b2 * y0 - a1a2 * y1;
          lB += bkc * (y1 - lB);
          const oL = og * (lA + 0.3 * lB), oR = og * (lB + 0.3 * lA);
          L[i] = oL > 0.9 || oL < -0.9 ? khlCeil(oL) : oL; if (R) R[i] = oR > 0.9 || oR < -0.9 ? khlCeil(oR) : oR;
        } else { const o = og * lA; L[i] = o > 0.9 || o < -0.9 ? khlCeil(o) : o; if (R) R[i] = L[i]; }
        if (burst && gate > 0 && --gate === 0) this.off = true;   // a Puls hit: the gate is the syllable's breath
      }
      this.xA = flush(xA); this.uA = flush(uA); this.xB = flush(xB); this.uB = flush(uB); this.pr = pr; this.bA = flush(lA); this.bB = flush(lB); this.rng.s = rs || 0x2545F491;
      this.mA = mA; this.mB = mB; zA.cnt = cA; zA.last = sA0; zA.arm = gA; zA.amp = aA; zA.flip = fA; zB.cnt = cBn; zB.last = sB0; zB.arm = gB; zB.amp = aB; zB.flip = fB;
      this.sy = sy; this.syD = syD; this.tr = tr; this.ruf = ruf; this.gate = gate; this.dA = dA; this.dB = dB;
      fa0.z1 = flush(za1); fa0.z2 = flush(za2); fa1.z1 = flush(zb1); fa1.z2 = flush(zb2);
      if (two) { fb0.z1 = flush(zc1); fb0.z2 = flush(zc2); fb1.z1 = flush(zd1); fb1.z2 = flush(zd2); }
    }
  }

