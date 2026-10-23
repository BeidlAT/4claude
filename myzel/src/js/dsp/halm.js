  // ---- Halm: myzel-blow – reed (STK clarinet), Höhe = breath (SPEC §3.2) ----
  // One bore = one delay line read with Lagrange-3, a one-pole loss (Mund) and the reed table r = r0 − 0.3·Δp; tuned by
  // subtracting the loss's phase delay at f (D = SR/2f − pd, ≤ 2 ct). Measured in this loop (klang/tests): the tone
  // speaks above P_thr = 0.60 − 1.33·(r0 − 0.69) and the reed slams shut above P_ch = 1.12 − 3.93·(r0 − 0.69), at every
  // pitch – so Höhe maps into that window: below y 0.27 only air (filtered noise outside the loop), then the tone,
  // brighter and louder with breath (the bell, see render), at the very top squeezed against the choke and wavering:
  // the tone chokes and comes back (Quietschen).
  const BLOW_OUT = 0.71, BLOW_Y0 = 0.27, FLUTE_OUT = 0.6, FL_Y0 = 0.12, FLAME_OUT = 1, FLAME_TUBE = 0.19, FLAME_ROAR = 0.6, FLAME_BED = 3, FLAME_CRACK = 0.6, FLAME_PUFF = 1, FLAME_U = 0.5, FLAME_SU = Math.sqrt(FLAME_U), FLAME_K = 4 * FLAME_SU;   // level: the standard phrase as loud as Nebel/Glocke/Membran (klang/tests/bench.js)
  // ---- Halm's flute: an open pipe blown across (STK Flute's jet and bore, the bore non-inverting) ----
  // The bore is one round trip of the note's period (both ends open: every harmonic, octave overblowing); the jet's
  // delay picks the register – half the played period speaks the fundamental, a quarter the octave, a sixth the
  // twelfth (measured: exact there, pulled in between). Breath above ≈ 1.35 tears the jet into hiss. The bore's
  // low-pass and the breath pull the pitch (sharp with breath, as a real flute: +4…+65 ct measured) – the player's
  // lips keep it in tune: a frequency-locked loop measures the period (low-passed, interpolated zero crossings) and
  // stretches the bore by (measured/target)^0.15 per period, within ±2 semitones (then ≤ 3 ct, 110–1320 Hz, registers
  // 1 and 2).
  class FluteLoop {
    constructor() { const n = Math.ceil(SR / 16) + 16; this.bore = new FracDelay(n); this.jet = new FracDelay(n); this.reset(); }
    reset() { this.bore.b.fill(0); this.jet.b.fill(0); this.lp = this.dx = this.dy = 0; this.c = 1; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.prev = 0; this.lastX = -1; this.lastT = 0; this.t = 0; this.Tm = 0; this.reg = 0; this.j = 0; }
    // per block: the note (f), the register, the bore's low-pass pole
    tune(f, reg, pole) {
      const ft = f * reg, fc = Math.min(0.45 * SR, 1.3 * ft), wc = 2 * Math.PI * fc / SR, al = Math.sin(wc) / 1.2, a0 = 1 + al;
      this.fb0 = (1 - Math.cos(wc)) / 2 / a0; this.fa1 = -2 * Math.cos(wc) / a0; this.fa2 = (1 - al) / a0;
      if (reg !== this.reg || !this.Tm) { this.Tm = SR / ft; this.reg = reg; }
      this.Tt = SR / ft; this.D0 = SR / f; this.pole = pole;
      const jt = 0.5 / reg; this.j = this.j ? this.j + 0.25 * (jt - this.j) : jt;   // (the lips move to the new register in a few blocks)
    }
    tick(br) {
      const D = Math.max(4, this.c * this.D0), Dj = Math.max(2, D * this.j), pole = this.pole, jg = br >= 0.5 ? 1 : br > 0 ? 2 * br : 0;   // (no breath, no jet: the bore rings down)
      const bo = this.bore.read3(D);
      this.lp = (1 - pole) * bo + pole * this.lp;
      const t = this.lp - this.dx + 0.995 * this.dy; this.dx = this.lp; this.dy = t;
      this.jet.write(br - 0.5 * t);
      let x = this.jet.read3(Dj); x = x * (x * x - 1); x = jg * (x > 1 ? 1 : x < -1 ? -1 : x);
      this.bore.write(x + 0.5 * t);
      // the lips: the period, measured
      const yv = this.fb0 * (bo + 2 * this.x1 + this.x2) - this.fa1 * this.y1 - this.fa2 * this.y2; this.x2 = this.x1; this.x1 = bo; this.y2 = this.y1; this.y1 = yv;
      if (this.prev < 0 && yv >= 0) {
        const tz = this.t - 1 + this.prev / (this.prev - yv);
        if (this.lastX >= 0) { const T = tz - this.lastX, Tt = this.Tt; if (T > 0.6 * Tt && T < 1.6 * Tt && Math.abs(T - this.lastT) < 0.03 * T) { this.Tm += 0.35 * (T - this.Tm); const c = this.c * Math.pow(Tt / this.Tm, 0.15); this.c = c < 0.89 ? 0.89 : c > 1.12 ? 1.12 : c; } this.lastT = T; }
        this.lastX = tz;
      }
      this.prev = yv; this.t++;
      return bo;
    }
  }
  // ---- Halm's flame: a Rijke tube (a heater a quarter up an open tube sings) ----
  // Two travelling waves split at the heater; both ends open (inverting) with a little loss and a radiation low-pass.
  // The heat release follows the air's velocity at the heater after a lag τ (a quarter period: then it is in phase
  // with the pressure there – Rayleigh's criterion), by King's law: the heat a hot gauze gives off grows with the root
  // of the flow past it, the convection's U0 plus the sound's u – q = heat·tanh(K·(√|U0 + u(t − τ)| − √U0))·(1 + flicker)
  // (slope 2 at rest). Once u swings below −U0 the flow reverses and the release is rectified: even harmonics, more of
  // them with heat (measured at 110 Hz: h2 −42 dB at the threshold, −18 dB at y 0.6; a plain tanh(2u) gives none –
  // the tone stays a hollow sine). Plus the flame's own turbulent roar. Measured: silent below a threshold (heat ≈ 0.04), bursting irregularly at it (envelope
  // ±15–30 dB), a steady limit cycle above, louder with heat. A lower heater and a quicker flame (pos 0.25 → 0.13,
  // τ 0.25 → 0.1 period) overblow it into the octave. The FLL keeps it in tune (the end low-passes pull it 5–60 ct flat).
  class FlameTube {
    constructor() { const n = Math.ceil(SR / 32) + 16; this.a1 = new FracDelay(n); this.a2 = new FracDelay(n); this.b1 = new FracDelay(n); this.b2 = new FracDelay(n); this.ud = new FracDelay(Math.ceil(SR / 16) + 16); this.reset(); }
    reset() { for (const d of [this.a1, this.a2, this.b1, this.b2, this.ud]) d.b.fill(0); this.lb = this.lt = 0; this.c = 1; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.prev = 0; this.lastX = -1; this.lastT = 0; this.t = 0; this.Tm = 0; this.reg = 0; this.damp = 0; this.reseed = 0; this.seedAt = 0; this.rr = 0.97; }
    // one period of a tone in all four waves (a Puls stroke, a register flip: the tube sings at once)
    seed(fq, amp) { const D = SR / fq; for (let k = Math.ceil(D); k >= 1; k--) { const v = amp * Math.sin(2 * Math.PI * k / D); this.a2.write(v); this.b2.write(-v); this.a1.write(v); this.b1.write(-v); } }
    tune(f, reg, pos, tau, lpc) {
      const ft = f * reg, fc = Math.min(0.45 * SR, 1.3 * ft), wc = 2 * Math.PI * fc / SR, al = Math.sin(wc) / 1.2, a0 = 1 + al;
      this.fb0 = (1 - Math.cos(wc)) / 2 / a0; this.fa1 = -2 * Math.cos(wc) / a0; this.fa2 = (1 - al) / a0;
      if (reg !== this.reg || !this.Tm) { this.Tm = SR / ft; this.reg = reg; }
      this.Tt = SR / ft; this.D0 = SR / f - 2 * pd1(lpc, ft); this.pos = pos; this.tau = tau; this.lpc = lpc;   // (the ends' low-passes delay the round trip: taken off, the FLL only trims)
    }
    // heat, flicker (its unrest, ±), roar (turbulence and cracks, added to the release)
    tick(heat, fl, roar) {
      const D = this.c * this.D0, d1 = Math.max(2, 0.5 * D * this.pos), d2 = Math.max(2, 0.5 * D * (1 - this.pos));
      const a1o = this.a1.read3(d1), b2o = this.b2.read3(d2), a2o = this.a2.read3(d2), b1o = this.b1.read3(d1);
      this.lb += this.lpc * (b1o - this.lb); this.lt += this.lpc * (a2o - this.lt);
      const u = a1o - b2o; this.ud.write(u);
      const ul = this.ud.read3(Math.max(2, this.tau * D));
      const q = heat * tanh(FLAME_K * (Math.sqrt(Math.abs(FLAME_U + ul)) - FLAME_SU)) * (1 + fl) + roar;
      const rf = this.damp > 0 ? (this.damp--, -0.6) : -this.rr;   // (a flip: the ends let the old mode out for a moment)
      this.a2.write(a1o + 0.5 * q); this.b1.write(b2o + 0.5 * q); this.a1.write(rf * this.lb); this.b2.write(rf * this.lt);
      // the FLL, on the sound radiated at the top
      const yv = this.fb0 * (a2o + 2 * this.x1 + this.x2) - this.fa1 * this.y1 - this.fa2 * this.y2; this.x2 = this.x1; this.x1 = a2o; this.y2 = this.y1; this.y1 = yv;
      if (this.prev < 0 && yv >= 0) {
        const tz = this.t - 1 + this.prev / (this.prev - yv);
        if (this.lastX >= 0) { const T = tz - this.lastX, Tt = this.Tt; if (T > 0.6 * Tt && T < 1.6 * Tt && Math.abs(T - this.lastT) < 0.03 * T) { this.Tm += 0.35 * (T - this.Tm); const c = this.c * Math.pow(Tt / this.Tm, 0.15); this.c = c < 0.89 ? 0.89 : c > 1.12 ? 1.12 : c; } this.lastT = T; }
        this.lastX = tz;
      }
      this.prev = yv; this.t++;
      return a2o + 0.5 * b1o;   // (both ends breathe out together on the fundamental – a monopole; the listener sits nearer the top, so the octave, a dipole, still sounds)
    }
  }
  class Blow extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po, len = Math.ceil(SR / 32) + 8;
      this.rich = !!po.rich;
      this.bA = new FracDelay(len); this.bB = this.rich ? new FracDelay(len) : null;
      this.p = { rohr: 'rohrblatt', atem: 0.5, mund: 0.4, blatt: 0.5, luft: 0.4, zunge: 0.5 };
      if (po.prm) this.set(po.prm);
      this.vel = 0.75;
      this.reset();
    }
    // the flute's and the flame's loops (built when first played: a reed never carries them)
    pipes() {
      const two = this.rich, k = this.p.rohr;
      if (k === 'floete' && !this.flA) { this.flA = new FluteLoop(); if (two) this.flB = new FluteLoop(); }
      if (k === 'flamme' && !this.fmA) { this.fmA = new FlameTube(); if (two) this.fmB = new FlameTube(); }
    }
    reset() {
      this.bA.b.fill(0); if (this.bB) this.bB.b.fill(0);
      this.br = 0; this.ap = 0; this.nl = 0; this.sw = 0; this.lzA = this.lzB = 0; this.DA = this.DB = 0; this.az1 = this.az2 = 0; this.rA = this.rB = this.qA = this.qB = 0;
      this.dxA = this.dyA = this.dxB = this.dyB = 0; this.tn = 0; this.click = 0; this.ns = this.ns || 0x1234567;
      this.pz = this.pzB = this.rl = this.wm = this.ck = this.cl = this.lastCk = this.om = this.obT = 0; this.push = 0; this.fgt = null; this.reg = 0; this.fl = 0; this.fxA = this.fyA = this.fxB = this.fyB = 0;
      for (const F of [this.flA, this.flB, this.fmA, this.fmB]) if (F) F.reset(); this.e1 = this.e2 = this.w1 = this.w2 = this.nlB = this.flB = this.f1 = this.f2 = 0; this.ns2 = 0x2468ace;
    }
    set(p) {
      const was = this.p.rohr;
      for (const k in p) if (k in this.p) this.p[k] = k === 'rohr' ? String(p[k]) : +p[k] || 0;
      if (this.act) { this.pipes(); if (this.p.rohr !== was && !this.off) { this.pipeOn(); this.bc = 1 / (0.006 * SR); } }   // (another pipe under a sounding note: it starts from its own tone)
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      this.ns = (m.seed | 0) || 0x1234567;
      this.pipes(); this.pipeOn();
      const z = this.p.zunge;
      this.tn = this.tn0 = Math.round((0.004 + 0.008 * z) * SR);   // tongue: a noise burst into the bore, 4–12 ms
      this.tA = (0.2 + 0.8 * z) * (0.5 + 0.7 * this.vel) * (this.p.rohr === 'floete' ? 0.15 : 1);   // (the flute's tongue: a little noise beside the push)
      this.bc = 1 / (0.001 * SR); this.att = Math.round(0.04 * SR); // breath steps in with a 1 ms ramp
      if (this.burst && m.gate < 0.06) this.click = 0.6 + 0.6 * this.vel;   // a very short Puls gate: a click into the tube
    }
    // a pipe's own start (a note, or the pipe changed under a sounding one)
    pipeOn() {
      this.reg = 0; this.fl = 0; this.ns2 = (this.ns ^ 0x5bd1e995) || 0x2468ace;
      if (this.p.rohr === 'floete') {   // the flute: its tone in the bore first (a noise tongue kicks low notes into an upper mode – measured), the
        // tongue a short breath push ("t") with a little noise
        for (const F of [this.flA, this.flB]) if (F) { F.reset(); F.seedAt = this.f; }
        this.push = (0.08 + 0.17 * this.p.zunge) * (0.6 + 0.6 * this.vel); this.fgt = null;
      }
      if (this.p.rohr === 'flamme') {   // the ignition: a puff of heat (Zunge) – a Puls stroke starts the tube already singing
        this.wm = (0.3 + 0.7 * this.p.zunge) * (0.5 + 0.5 * this.vel); this.lastCk = 0;
        this.obT = this.om = !this.burst && this.y > 0.9 && this.f < 1000 ? 1 : 0;   // (a note played at the very top starts overblown)
        for (const T of [this.fmA, this.fmB]) if (T) { if (this.burst) { T.reset(); T.seedAt = this.f; } else if (this.obT) T.reseed = 1; }
      }
    }
    stop() {   // breath to 0 within ≈ 15 ms; the flame: one last crack 40–160 ms later
      this.bc = 1 / (0.005 * SR);
      if (this.p.rohr === 'flamme' && !this.burst) { let s = this.ns; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.ns = s; this.lastCk = Math.round((0.04 + 0.12 * (s >>> 0) / 4294967296) * SR); }
    }
    // breath for a height: under the threshold up to y0, then across the window (Atem and velocity widen the stride)
    breath(y, thr, ch) {
      if (y < BLOW_Y0) return thr * 0.92 * y / BLOW_Y0;
      const k = (y - BLOW_Y0) / (1 - BLOW_Y0) * (0.6 + 0.8 * this.p.atem) * (0.8 + 0.27 * this.vel);
      return thr + (ch - thr) * Math.min(0.97, 0.02 + 0.91 * k);
    }
    render(L, R, a, b) {
      if (this.p.rohr === 'floete' && this.flA) return this.flute(L, R, a, b);
      if (this.p.rohr === 'flamme' && this.fmA) return this.flame(L, R, a, b);
      const p = this.p, n = b - a;
      let f = this.f; if (f > SR / 6) f = SR / 6;
      const y = this.y, r0 = 0.64 + 0.14 * p.blatt, thr = 0.6 - 1.33 * (r0 - 0.69), ch = 1.12 - 3.93 * (r0 - 0.69);
      // breath target: during a Puls gate the sweet spot whatever the height, then nothing
      let bt;
      if (this.off) bt = 0;
      else if (this.burst) { bt = thr + 0.55 * (ch - thr); if (this.gate <= n) { this.gate = 0; this.off = true; this.stop(); } else this.gate -= n; }
      else bt = this.breath(y, thr, ch);
      if (this.att > 0 && !this.off && bt > thr) bt = Math.min(bt + 0.2 * (ch - thr), thr + 0.9 * (ch - thr));   // the attack blows harder: the tone speaks sooner
      if (this.att > 0 && (this.att -= n) <= 0 && !this.off) this.bc = 1 / (0.006 * SR);   // after the attack: follow Höhe smoothly
      // Quietschen: squeezed against the choke and wavering (a slow random walk, ≈ 5 Hz) – over it the reed shuts for a
      // moment: the tone chokes and comes back
      const sq = y > 0.9 && !this.burst ? (y - 0.9) / 0.1 : 0;
      if (sq > 0 && !this.off) {
        let s = this.ns; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.ns = s;
        this.sw += 0.08 * (s * 4.656612873e-10 - this.sw);
        bt += (ch - bt) * 0.9 * sq + sq * sq * 0.4 * (ch - thr) * Math.max(-1.5, Math.min(1.5, this.sw * 8.5));
      }
      const nAmt = 0.45 * (1 + 3 * sq);
      // The bore's loss sits at a fixed multiple of f (10–18 f, Mund): with less loss above that the reed jumps at random
      // into an upper regime (5th/7th harmonic over the fundamental – measured in a third of the notes at y 0.5), so the
      // tone itself stays in one register; the brightness that follows the breath comes from outside the loop: the
      // bell radiates the highs above 3f more (second order), and a soft clip adds an odd edge
      const kb = Math.min(1, Math.max(0, (this.br - thr) / (ch - thr)));
      // (a stereo voice passes the voice's panner at full gain, a mono one at −3 dB: level 3 plays √½ as loud inside)
      const og = this.rich ? BLOW_OUT * Math.SQRT1_2 : BLOW_OUT, lc = 1 - Math.exp(-2 * Math.PI * Math.min(0.45 * SR, f * (10 + 8 * p.mund)) / SR), rad = 0.5 + 8 * kb, lvl = og * (0.55 + 0.45 * kb) / (1 + 0.25 * rad), sk = 0.3 + 0.7 * kb, sn = 1 / sk;
      const rc = 1 - Math.exp(-2 * Math.PI * Math.min(3 * f, 0.4 * SR) / SR);
      // bore lengths (a glide moves D per sample across the block)
      const DtA = Math.max(2, SR / (2 * f * (this.rich ? cents(-4) : 1)) - pd1(lc, f)), DtB = this.rich ? Math.max(2, SR / (2 * f * cents(4)) - pd1(lc, f)) : 0;
      let DA = this.DA || DtA, DB = this.DB || DtB;
      const dDA = (DtA - DA) / n, dDB = (DtB - DB) / n, gl = dDA !== 0 || dDB !== 0;
      // Lagrange-3 weights: per block while the bore holds its length, per sample during a glide
      let di = DA | 0, pp = DA - di + 1, h0 = -(pp - 1) * (pp - 2) * (pp - 3) / 6, h1 = pp * (pp - 2) * (pp - 3) / 2, h2 = -pp * (pp - 1) * (pp - 3) / 2, h3 = pp * (pp - 1) * (pp - 2) / 6;
      let ei = DB | 0, qq = DB - ei + 1, k0 = -(qq - 1) * (qq - 2) * (qq - 3) / 6, k1 = qq * (qq - 2) * (qq - 3) / 2, k2 = -qq * (qq - 1) * (qq - 3) / 2, k3 = qq * (qq - 1) * (qq - 2) / 6;
      // air: noise through a resonant lowpass near the bore's lowest modes (a hiss through a tube), ∝ how far the
      // breath is below the tone, and only while the finger is down
      const fa = Math.min(Math.max(2 * f, 150), 4000), w0 = 2 * Math.PI * fa / SR, al = Math.sin(w0) / 3, a0 = 1 + al, cw = Math.cos(w0);
      const ab0 = (1 - cw) / 2 / a0, aa1 = -2 * cw / a0, aa2 = (1 - al) / a0, luft = 0.25 * og * p.luft, ithr = 1 / thr, apT = this.off ? 0 : 1;
      let az1 = this.az1, az2 = this.az2, ap = this.ap;
      let br = this.br, bc = this.bc, nl = this.nl, s = this.ns, tn = this.tn, tA = this.tA / Math.max(1, this.tn0);
      let lzA = this.lzA, lzB = this.lzB, dxA = this.dxA, dyA = this.dyA, dxB = this.dxB, dyB = this.dyB, rA = this.rA, rB = this.rB, qA = this.qA, qB = this.qB;
      const bA = this.bA.b, mA = this.bA.m, bB = this.bB ? this.bB.b : null, mB = this.bB ? this.bB.m : 0;
      let wA = this.bA.w, wB = this.bB ? this.bB.w : 0;
      const dcR = 1 - 2 * Math.PI * 20 / SR, two = !!bB && !this.lite;
      let click = this.click; this.click = 0;
      for (let i = a; i < b; i++) {
        br += bc * (bt - br); ap += bc * (apT - ap);
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        const wn = s * 4.656612873e-10;
        nl += 0.12 * (wn - nl);
        let pA = br * (1 + nAmt * nl);
        if (tn > 0) { pA += tA * tn * wn; tn--; }   // tongue: a decaying noise burst
        pA += click; click = 0;
        // bore A
        if (gl) { DA += dDA; di = DA | 0; pp = DA - di + 1; h0 = -(pp - 1) * (pp - 2) * (pp - 3) / 6; h1 = pp * (pp - 2) * (pp - 3) / 2; h2 = -pp * (pp - 1) * (pp - 3) / 2; h3 = pp * (pp - 1) * (pp - 2) / 6; }
        let j = wA + 1 - di;
        let bore = h0 * bA[j & mA] + h1 * bA[(j - 1) & mA] + h2 * bA[(j - 2) & mA] + h3 * bA[(j - 3) & mA];
        lzA += lc * (bore - lzA);
        let dp = -0.95 * lzA - pA, r = r0 - 0.3 * dp;
        if (r > 1) r = 1; else if (r < -1) r = -1;
        bA[wA] = pA + dp * r; wA = (wA + 1) & mA;
        rA += rc * (bore - rA); const hA = bore - rA; qA += rc * (hA - qA);
        let o = bore + rad * (hA - qA);                 // the bell: highs above 3f radiate more (second order)
        const d0 = o - dxA + dcR * dyA; dxA = o; dyA = d0; o = tanh(sk * d0) * sn * lvl;   // more breath, a harder edge (odd)
        // air
        const ag = luft * ap * (1 - br * ithr);
        if (ag > 0) { const ya = ab0 * wn + az1; az1 = 2 * ab0 * wn - aa1 * ya + az2; az2 = ab0 * wn - aa2 * ya; o += ag * ya; }
        L[i] = o;
        if (two) {
          if (gl) { DB += dDB; ei = DB | 0; qq = DB - ei + 1; k0 = -(qq - 1) * (qq - 2) * (qq - 3) / 6; k1 = qq * (qq - 2) * (qq - 3) / 2; k2 = -qq * (qq - 1) * (qq - 3) / 2; k3 = qq * (qq - 1) * (qq - 2) / 6; }
          j = wB + 1 - ei;
          bore = k0 * bB[j & mB] + k1 * bB[(j - 1) & mB] + k2 * bB[(j - 2) & mB] + k3 * bB[(j - 3) & mB];
          lzB += lc * (bore - lzB);
          dp = -0.95 * lzB - pA; r = r0 - 0.3 * dp;
          if (r > 1) r = 1; else if (r < -1) r = -1;
          bB[wB] = pA + dp * r; wB = (wB + 1) & mB;
          rB += rc * (bore - rB); const hB = bore - rB; qB += rc * (hB - qB);
          let o2 = bore + rad * (hB - qB);
          const d1 = o2 - dxB + dcR * dyB; dxB = o2; dyB = d1; o2 = tanh(sk * d1) * sn * lvl;
          if (ag > 0) o2 += ag * az2;   // the same air, a little apart
          R[i] = o2;
        } else if (R) R[i] = o;
      }
      this.br = br; this.ap = ap; this.nl = flush(nl); this.ns = s; this.tn = tn; this.lzA = flush(lzA); this.lzB = flush(lzB); this.rA = flush(rA); this.rB = flush(rB); this.qA = flush(qA); this.qB = flush(qB);
      this.dxA = dxA; this.dyA = flush(dyA); this.dxB = dxB; this.dyB = flush(dyB); this.az1 = flush(az1); this.az2 = flush(az2);
      this.DA = gl ? DA : DtA; this.DB = gl ? DB : DtB; this.bA.w = wA; if (this.bB) this.bB.w = wB;
    }
    // the flute: Höhe is the breath and with it the register – soft and breathy low (the loop speaks from breath 1.0,
    // in tune), louder and brighter up to the overblowing point (Strahl moves it, 0.57–0.87), then the octave, at the
    // very top the twelfth (below 2.6 kHz). The breath's noise and an air hiss outside the loop (Luft) fade as it
    // fills; the bore radiates its highs more with breath (the lips' opening)
    flute(L, R, a, b) {
      const p = this.p, n = b - a, y = this.y, two = !!(this.flB && R && !this.lite);
      const f = Math.min(this.f, 2600), ob = 0.72 - 0.3 * (p.blatt - 0.5);
      // the register, with a little hysteresis (the lips hold it)
      let reg = this.reg;
      if (this.burst) reg = 1;
      else {
        const want = y > 0.95 && 3 * f < 2600 ? 3 : y > ob && 2 * f < 2600 ? 2 : 1;
        if (!reg) reg = want;   // (a note starts in the register its height asks for)
        else if (want > reg && y > (want === 3 ? 0.95 : ob) + 0.015) reg = want;
        else if (want < reg && y < (reg === 3 ? 0.95 : ob) - 0.015) reg = want;
      }
      this.reg = reg;
      // breath: 1.0 at the floor of each register, up to 1.22 (Atem widens the stride)
      const at = 0.6 + 0.8 * p.atem, k0 = reg === 1 ? y / ob : reg === 2 ? (y - ob) / Math.max(0.05, 0.95 - ob) : 1;
      let bt = this.off ? 0 : 1 + (reg === 1 ? 0.22 : 0.18) * Math.min(1, Math.max(0, k0)) * at * (0.85 + 0.2 * this.vel);
      if (this.burst && !this.off) { bt = 1.1; if (this.gate <= n) { this.gate = 0; this.off = true; this.stop(); } else this.gate -= n; }
      const pole = 0.75 - 0.25 * p.mund;   // Lippe: brighter with a smaller pole
      this.flA.tune(f * cents(two ? -4 : 0), reg, pole); if (two) this.flB.tune(f * cents(4), reg, pole);
      for (const F of [this.flA, this.flB]) if (F && F.seedAt) {   // one period of the note in its register, as the loop carries it
        const D = SR / F.seedAt, amp = 0.3;
        for (let k = Math.ceil(D); k >= 1; k--) F.bore.write(amp * Math.sin(2 * Math.PI * k * reg / D));
        F.seedAt = 0;
      }
      const push = this.push || 0, pd = Math.exp(-1 / (0.012 * SR));
      // loudness and brightness with the breath (the loop itself saturates): −10 dB at the floor, full at the top
      const kb = this.off ? 1 : Math.min(1, Math.max(0, y)), og = (two ? BLOW_OUT * Math.SQRT1_2 : BLOW_OUT) * FLUTE_OUT * (0.32 + 0.68 * kb), rad = 0.5 + 2.5 * kb;
      // under FL_Y0 the lips have not found the edge yet: only air, the tone grows out of it (the loop runs on in tune –
      // a loop started from noise alone catches the twelfth on low notes, measured)
      const gq = this.burst || this.off || y >= FL_Y0 ? 1 : (y / FL_Y0) * (y / FL_Y0), g0 = this.fgt == null ? gq : this.fgt, dgq = (gq - g0) / n; this.fgt = gq;
      const nAmt = 0.02 + 0.1 * p.luft * (1.2 - 0.6 * kb), hiss = 0.25 * (0.15 + p.luft) * (1 - 0.7 * kb) * (1 + 1.5 * (1 - gq)) * (this.off ? 0 : 1);
      let br = this.br, bc = this.bc, s = this.ns, s2 = this.ns2, tn = this.tn, nl = this.nl, ap = this.ap, ha = this.az1, hb = this.az2, d1 = this.dxA, d2 = this.dxB, gt = g0;
      let xa = this.fxA || 0, ya = this.fyA || 0, xb = this.fxB || 0, yb = this.fyB || 0; const dcR = 1 - 2 * Math.PI * 20 / SR;
      const tA = this.tA / Math.max(1, this.tn0), apT = this.off ? 0 : 1, hc = 1 - Math.exp(-2 * Math.PI * Math.min(0.4 * SR, Math.max(2500, 4 * f)) / SR);   // (breath hiss: at least up to 2.5 kHz)
      if (this.att > 0 && (this.att -= n) <= 0 && !this.off) this.bc = 1 / (0.006 * SR);
      for (let i = a; i < b; i++) {
        br += bc * (bt - br); ap += bc * (apT - ap);
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        const wn = s * 4.656612873e-10;
        nl += 0.2 * (wn - nl);
        let pb = br * (1 + nAmt * nl * 4) + this.push * apT; this.push *= pd;
        if (tn > 0) { pb += tA * tn * wn; tn--; }   // the tongue
        const oA = this.flA.tick(pb);
        let o = oA + rad * (oA - d1); d1 = oA;   // the open end radiates its highs
        const q0 = o - xa + dcR * ya; xa = o; ya = q0; o = q0;   // (the jet's breath offset sits in the bore: no DC out)
        ha += hc * (wn - ha);                        // air hiss: noise low-passed near 4f, outside the loop
        gt += dgq;
        o = og * (0.3 * gt * o) + hiss * ap * ha * og;
        L[i] = tanh(o);
        if (two) {   // (its own air: a mirrored noise would fold away in the voice's panner off centre)
          s2 ^= s2 << 13; s2 ^= s2 >>> 17; s2 ^= s2 << 5;
          const oB = this.flB.tick(pb); let o2 = oB + rad * (oB - d2); d2 = oB; const q1 = o2 - xb + dcR * yb; xb = o2; yb = q1; o2 = q1;
          hb += hc * (s2 * 4.656612873e-10 - hb); R[i] = tanh(og * (0.3 * gt * o2) + hiss * ap * hb * og);
        }
        else if (R) R[i] = L[i];
      }
      this.br = br; this.ns = s; this.ns2 = s2; this.tn = tn; this.nl = flush(nl); this.ap = ap; this.az1 = flush(ha); this.az2 = flush(hb); this.dxA = d1; this.dxB = d2;
      this.fxA = xa; this.fyA = flush(ya); this.fxB = xb; this.fyB = flush(yb);
    }
    // the flame: Höhe is the heat. Below the threshold the flame only roars – a soft fire (a low rumble and a turbulent
    // hiss; the hiss half inside the tube, so it whispers on the note) with now and then a crack of wood (Luft = Feuer);
    // at the threshold (y ≈ 0.25–0.4) the flame's slow pulsing (≈ 2 Hz, Flackern) lifts the tube over it and drops it
    // again: the tone surges in and out (wumm … wumm); above it sings, louder and brighter with heat, the cracks
    // thicken; from y 0.9 the heater creeps down and the flame quickens – it overblows into the octave (back below
    // 0.875). Zunge is the ignition's gas puff (a low thump that heats the tube for a moment). Let go: the flame dies,
    // the tube rings out in its hiss, one last crack.
    flame(L, R, a, b) {
      const p = this.p, n = b - a, y = this.y, two = !!(this.fmB && R && !this.lite);
      const f = Math.min(this.f, 2400), hf = 1;   // (the ends' loss scales with f – one threshold at every pitch)
      let ht = 0.004 + (y < 0.3 ? 0.03 * y / 0.3 : y < 0.45 ? 0.03 + 0.016 * (y - 0.3) / 0.15 : 0.046 + 0.2 * (y - 0.45) / 0.55);   // (the threshold, heat ≈ 0.04, at y ≈ 0.36)
      ht *= (0.6 + 0.8 * p.atem) * hf;
      if (this.burst && !this.off) { ht = 0.15 * hf; if (this.gate <= n) { this.gate = 0; this.off = true; this.stop(); } else this.gate -= n; }
      if (this.off) ht = 0;
      // overblowing: the heater moves down (pos 0.25 → 0.125 of the tube: the octave's pressure × velocity is largest
      // there, the fundamental's half) and the flame's lag fits the octave (τ ⅛ period). A sounding fundamental holds on
      // whatever the heater does (measured over pos 0.1–0.15 × τ 0.05–0.4: never flips), so the flip is a flare: the
      // ends let the old mode out for 30 ms (−56 dB at 220 Hz) and the new one starts from a period of itself.
      // Hysteresis: up above 0.9, down below 0.875. The octave needs the heat held at 0.07 (above it the fundamental
      // comes back: measured h2 − h1 +9…+39 dB at 110–880 Hz with it, −30 dB at 880 Hz without) and a note below 1 kHz
      // (an octave above 2 kHz dies in the ends' loss)
      if (!this.burst) { const o = this.obT; if (y > 0.9 && f < 1000) this.obT = 1; else if (y < 0.875 || f >= 1000) this.obT = 0; if (o !== this.obT) for (const T of [this.fmA, this.fmB]) if (T) { T.damp = Math.round(0.03 * SR); T.reseed = 1; } }
      const om = this.om = this.obT, reg = om ? 2 : 1;
      // the ends radiate the highs: a low-pass at 6–20 f (Rohr) – the same loss per round trip at every pitch
      const pos = om ? 0.125 : 0.25, tau = om ? 0.125 : 0.25, lpc = 1 - Math.exp(-2 * Math.PI * Math.min(0.45 * SR, f * (6 + 14 * p.mund)) / SR);
      if (om && ht > 0.07 * hf) ht = 0.07 * hf;
      this.fmA.tune(f * cents(two ? -4 : 0), reg, pos, tau, lpc); if (two) this.fmB.tune(f * cents(4), reg, pos, tau, lpc);
      const rr = this.off ? Math.min(0.97, Math.pow(10, -6 / f)) : 0.97;   // (let go: the tube rings out within ≈ 0.5 s at any pitch – a 16-Hz tube would ring for seconds)
      for (const T of [this.fmA, this.fmB]) if (T) {
        T.rr = rr;
        if (T.seedAt) { T.seed(T.seedAt, 0.25 * (0.5 + 0.5 * this.vel)); T.seedAt = 0; }   // a Puls stroke: it sings at once
        if (T.reseed && T.damp <= 0) { T.seed(f * reg, 0.15); T.reseed = 0; }
      }
      // per block: the flame's slow pulse (a random walk low-passed at 1.25–2.5 Hz, σ 0.45 × Flackern – per tube at level 3), the roar's
      // level (it follows the heat, √, slower than the heat: the hiss outlives the tone), the cracks (Poisson, rate with
      // heat and Feuer: 1–2/s low, ≈ 30/s at the top)
      let s = this.ns;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u1 = (s >>> 0) / 4294967296;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u2 = (s >>> 0) / 4294967296;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u3 = (s >>> 0) / 4294967296;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const u4 = (s >>> 0) / 4294967296;
      const kz = 1 - Math.exp(-2 * Math.PI * Math.min(2.5, 1 + f / 440) * n / SR), gz = 0.45 * Math.sqrt(6 / kz);   // (slower on low tubes: they build up slower)
      this.pz += kz * ((2 * u1 - 1) * gz - this.pz); if (two) this.pzB += kz * ((2 * u4 - 1) * gz - this.pzB);
      const flk = (0.3 + 0.7 * p.blatt) * Math.max(0.35, Math.min(1, 1 - (y - 0.4) / 0.4)), fu = p.luft,   // (Flackern; above the threshold the song locks: the pulse weighs less)
        hy = Math.min(1, this.br / (0.25 * hf));
      const rT = this.off ? 0 : 0.75 + 0.25 * Math.sqrt(hy), rl0 = this.rl, rl1 = this.rl = rl0 + (rT - rl0) * (1 - Math.exp(-n / ((rT > rl0 ? 0.02 : 0.08) * SR))), drl = (rl1 - rl0) / n;
      let ckAt = -1, ckA = 0;
      if (!this.off && u2 < (1.5 + 35 * y * y) * (0.15 + 1.7 * fu) * n / SR) { ckAt = a + Math.floor(u3 * n); ckA = (0.3 + 0.7 * u1 * u1) * (0.6 + 1.6 * hy); }   // (a hotter fire cracks harder: heard over the song)
      if (this.lastCk > 0 && (this.lastCk -= n) <= 0) { ckAt = Math.max(a, b + this.lastCk - 1); ckA = 0.8; this.lastCk = 0; }
      const ckP = two ? u3 : 0.5;   // (each crack somewhere along the fire)
      // output: the tube (King's law keeps its amplitude within 4 dB from the threshold to the top – measured), lifted
      // when overblown (with the heat held and the octave radiating less towards the listener: −5…−9 dB, see FlameTube); the fire (bed, cracks,
      // the puff) beside it
      const base = (two ? BLOW_OUT * Math.SQRT1_2 : BLOW_OUT) * FLAME_OUT;
      const tg = base * FLAME_TUBE * (1 + om * (2.7 + f / 330)), dg = base * (0.4 + 0.6 * fu);
      const fb = 120 + 600 * y, cb = 1 - Math.exp(-2 * Math.PI * fb / SR), nb = 1.6 / Math.sqrt(cb), cw = 1 - Math.exp(-2 * Math.PI * 150 / SR), nw = 1.6 / Math.sqrt(cw);
      const ckd = Math.exp(-1 / (0.0015 * SR)), ckc = 1 - Math.exp(-2 * Math.PI * 1500 / SR), wmd = Math.exp(-1 / (0.1 * SR));
      let br = this.br, bc = this.bc, nl = this.nl, fl = this.fl, rl = rl0, wm = this.wm, ck = this.ck, cl = this.cl;
      let e1 = this.e1, e2 = this.e2, w1 = this.w1, w2 = this.w2, s2 = this.ns2, nlB = this.nlB, flB = this.flB, f1 = this.f1, f2 = this.f2;
      const pz = this.pz, pzB = this.pzB;
      if (this.att > 0 && (this.att -= n) <= 0 && !this.off) this.bc = 1 / (0.02 * SR);
      for (let i = a; i < b; i++) {
        br += bc * (ht - br); rl += drl;
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        const wn = s * 4.656612873e-10;
        nl += 0.15 * (wn - nl); fl += 0.002 * (wn * 8 - fl);   // the turbulence (≈ 1 kHz) and the flicker (≈ 15 Hz)
        e1 += cb * (wn - e1); e2 += cb * (e1 - e2);             // the fire's rumble (120–720 Hz with the heat)
        w1 += cw * (wn - w1); w2 += cw * (w1 - w2);             // the puff (150 Hz)
        if (i === ckAt) ck = ckA;
        cl += ckc * (ck * wn - cl); const cr = ck * wn - cl; ck *= ckd;   // a crack: a 1.5-ms burst, high-passed at 1.5 kHz
        const h = br + 0.08 * wm, fire = rl * fu;
        const puff = wm * 0.25 * nw * w2, mA = flk * (pz + 0.5 * fl), oA = this.fmA.tick(h, mA < -0.9 ? -0.9 : mA, FLAME_ROAR * fire * nl + 0.2 * cr + FLAME_PUFF * puff);
        const bed = rl * FLAME_BED * (0.05 * nb * e2 + 0.03 * nl) + puff;
        L[i] = tanh(tg * oA + dg * bed + FLAME_CRACK * cr * (1 - ckP));
        if (two) {
          s2 ^= s2 << 13; s2 ^= s2 >>> 17; s2 ^= s2 << 5;
          const wB = s2 * 4.656612873e-10;
          nlB += 0.15 * (wB - nlB); flB += 0.002 * (wB * 8 - flB); f1 += cb * (wB - f1); f2 += cb * (f1 - f2);
          const mB = flk * (pzB + 0.5 * flB), oB = this.fmB.tick(h, mB < -0.9 ? -0.9 : mB, FLAME_ROAR * fire * nlB + 0.2 * cr + FLAME_PUFF * puff);
          R[i] = tanh(tg * oB + dg * (rl * FLAME_BED * (0.05 * nb * f2 + 0.03 * nlB) + wm * 0.25 * nw * w2) + FLAME_CRACK * cr * ckP);
        } else if (R) R[i] = L[i];
        wm *= wmd;
      }
      this.br = br; this.ns = s; this.nl = flush(nl); this.fl = fl; this.wm = flush(wm); this.ck = flush(ck); this.cl = flush(cl);
      this.e1 = flush(e1); this.e2 = flush(e2); this.w1 = flush(w1); this.w2 = flush(w2);
      if (two) { this.ns2 = s2; this.nlB = flush(nlB); this.flB = flB; this.f1 = flush(f1); this.f2 = flush(f2); }
    }
  }

