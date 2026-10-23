  // ---- Harz: myzel-bow – banded waveguides under a bow (SPEC §3.1) ----
  // Each mode of the body is a band: a band-pass at its frequency (RBJ: 0 dB and zero phase at the centre) inside a
  // loop of exactly one of its periods, losing g per pass. The bow feels the velocity of all bands at the contact,
  // Δv = v_bow − Σ, and pushes F = Δv · table(Δv) back into each (STK BandedWG after Essl & Cook; the bow table
  // (|Δv·slope| + 0.75)^−4, ≤ 0.98). Measured (klang/tests, and the check): weights per mode let the fundamental win
  // the race at every pitch and pressure; the force is not divided by the number of bands (the tone speaks in tenths
  // of a second, not in 1–2 s); a band needs ≥ BOW_GMIN per pass while bowed (a lifted bow leaves the ring to
  // Dämpfung); the friction force itself (stick-slip: even harmonics and noise, growing with pressure) is what Druck
  // is heard by – Harz mixes it into the output.
  // Glas and Schale are round: each mode is a pair (its two orientations, n nodal diameters, split a little – the
  // doublets that beat), bowed where the finger set on; the finger circles the rim and the pattern turns with it past
  // the listeners – the bowl's wah (see render). Level 1: the fundamental as a pair, the upper modes single.
  // Zunge (Hans Reichel's daxophone): a clamped wooden tongue – modes 1 : 6.27 : 17.55, bitten at the onset, the
  // friction through two vowel formants that open with the pressure, a growl of the bow arm at the top. Teich
  // (waterphone): bowed rods over a bowl of water – a neighbour rod rings with the bowed one, the water sloshes (every
  // stroke stirs it) and bends the rods and the bowl's resonance; at the top the rod screams on its second mode.
  const BOW_OUT = 1, BOW_F = 5.5, BOW_N = 0.004, BOW_R = 0.25, BOW_SEED = 0.075, BOW_GMIN = 0.98, BOW_BW = 32, BOW_TBP = 1 / (Math.PI * BOW_BW);
  const hrzT60 = (v) => 0.4 + 6 * (1 - v) * (1 - v);   // Dämpfung → the ring of a lifted bow, before the body's factor (s)
  const BOW_W = [1, 0.5, 0.3, 0.2, 0.15, 0.12, 0.1, 0.08], BOW_O = [1, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2];
  const BOW_AM = (v, cc) => Math.sqrt(cc + (1 - cc) * v * v);   // a turning pattern's level at a listener (cc: its lowest power)
  const BOW_B = {   // r: ratios, n: nodal diameters (round bodies), sp: doublet split per mode (× 0.8 % · Schwebung), ring: T60 × body, rot: [Hz, Hz per Bogen]
    glas: { r: [1, 2.32, 4.25, 6.63, 9.38], n: [2, 3, 4, 5, 6], sp: [1, 0.8, 0.6, 0.5, 0.4], ring: 0.6, rot: [0.35, 0.6], k1: 4, k3: 5, hp: 1500 },
    schale: { r: [1, 2.778, 5.181, 8.163, 11.661], n: [2, 3, 4, 5, 6], sp: [1, 0.6, 0.1, 0.25, 0.3], ring: 2.5, rot: [0.25, 0.5], k1: 4, k3: 5, hp: 800 },
    stab: { r: [1, 2.756, 5.404, 8.933, 13.345, 18.638], ring: 1.6, k1: 4, k3: 6, hp: 300 },
    zunge: { r: [1, 6.27, 17.55, 34.39], ring: 0.35, k1: 3, k3: 4, hp: 60 },
    teich: { r: [1, 6.27, 17.55, 34.39], ring: 2, k1: 3, k3: 4, hp: 500 },
  };
  class Bow extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po;
      this.rich = !!po.rich;
      const J = this.Jx = this.rich ? 10 : 6;   // the most bands a body needs (Glas, Schale: level 1 five, level 3 ten)
      let n = 8; while (n < Math.ceil(SR / 16) + 8) n <<= 1;   // one ring of n samples per band
      this.N = n; this.buf = new Float32Array(J * n); this.w = 0;
      // per band: ratio, weight in, out L/R, kind (0 single, 1/2 a pair's cos/sin), nodal diameters, split sign, its
      // share of the T60, mode index, rod; the delay (now, target) and its Lagrange weights; the band-pass and its
      // state; the loss per pass (bowed, ringing); its slow walk; its weight at the contact
      this.fr = new Float64Array(J); this.wi = new Float64Array(J); this.oL = new Float64Array(J); this.oR = new Float64Array(J);
      this.kd = new Int8Array(J); this.nd = new Float64Array(J); this.ss = new Float64Array(J); this.tf = new Float64Array(J); this.md = new Int8Array(J); this.rod = new Int8Array(J);
      this.D = new Float64Array(J); this.Dt = new Float64Array(J); this.dD = new Float64Array(J); this.h = new Float64Array(4 * J); this.di = new Int32Array(J);
      this.b0 = new Float64Array(J); this.a1 = new Float64Array(J); this.a2 = new Float64Array(J); this.z1 = new Float64Array(J); this.z2 = new Float64Array(J);
      this.lg = new Float64Array(J); this.gr = new Float64Array(J); this.rw = new Float64Array(J); this.pc = new Float64Array(J); this.mL = new Float64Array(J); this.mR = new Float64Array(J); this.qL = new Float64Array(J); this.qR = new Float64Array(J); this.sd = new Int8Array(J); this.dmL = new Float64Array(J); this.dmR = new Float64Array(J); this.r = new Float64Array(J);
      this.fs = [new Float64Array(4), new Float64Array(4)]; this.lp = new Float64Array(2); this.ap = new Float64Array(4);
      this.p = { koerper: 'glas', druck: 0.5, bogen: 0.5, daempfung: 0.6, schwebung: 0.3, harz: 0.3 };
      this.rng = new PRNG(po.seed || 11);
      if (po.prm) this.set(po.prm);
      this.vel = 0.75; this.J = 0; this.body = ''; this.sk = 1; this.age = 0;
      this.reset();
    }
    reset() {
      this.buf.fill(0); this.z1.fill(0); this.z2.fill(0); this.D.fill(0);
      this.vb = 0; this.kc = 0; this.kt = 0; this.phi = 0; this.psi = 0; this.fh = 0; this.rn = 0; this.ni = 0; this.gp = 0; this.gf = 35;
      this.wx = 0; this.wv = 0; this.fs[0].fill(0); this.fs[1].fill(0); this.lp.fill(0);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'koerper' ? String(p[k]) : +p[k] || 0; if (this.body && this.p.koerper !== this.body) this.build(); }
    // the bands of the body, level 1 or 3
    build() {
      const B = BOW_B[this.p.koerper] || BOW_B.glas, rich = this.rich, K = rich ? B.k3 : B.k1;
      let j = 0;
      const add = (ratio, wi, oL, oR, kd, nd, ss, tf, m, rod) => {
        if (j >= this.Jx) return;
        this.fr[j] = ratio; this.wi[j] = wi; this.oL[j] = oL; this.oR[j] = oR; this.kd[j] = kd; this.sd[j] = oR > oL ? 1 : 0; this.nd[j] = nd; this.ss[j] = ss; this.tf[j] = tf; this.md[j] = m; this.rod[j] = rod;
        j++;
      };
      // single bands at level 3 alternate between the sides, equal power (1.31 and 0.53: on average the band's own level);
      // the softer side hears it a quarter period late (see render: two coherent channels would sum louder in the panner)
      const one = (ratio, wi, o, tf, m, rod, side) => add(ratio, wi, rich ? o * (side < 0 ? 1.31 : 0.53) : o, rich ? o * (side < 0 ? 0.53 : 1.31) : 0, 0, 0, 0, tf, m, rod);
      for (let k = 0; k < K; k++) {
        const tf = 1 - 0.3 * k / K, o = BOW_O[k];
        // a pair: its two orientations (the pickups, turning, decide what is heard where – see render)
        if (B.n && (rich || k === 0)) { add(B.r[k], BOW_W[k], o, o, 1, B.n[k], -B.sp[k], tf, k, 0); add(B.r[k], BOW_W[k], o, o, 2, B.n[k], B.sp[k], tf, k, 0); }
        else one(B.r[k], BOW_W[k], o, tf, k, 0, k % 2 ? 1 : -1);
      }
      if (this.p.koerper === 'teich') {   // the neighbour rod (seeded per note ±3 %); level 3: its second mode and a third rod
        const rb = 1.031 * (1 + 0.06 * (this.rng.next() - 0.5));
        one(rb, 0.5, 0.8, 1, 0, 1, 1);
        if (rich) { one(rb * 6.27, 0.2, 0.4, 0.8, 1, 1, 1); one(0.962 * (1 + 0.04 * (this.rng.next() - 0.5)), 0.35, 0.6, 1, 0, 2, -1); }
      }
      this.J = j; this.body = this.p.koerper; this.round = !!B.n; this.B = B;
      this.D.fill(0);
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      if (m.seed) this.rng = new PRNG(m.seed);
      if (m.y != null) this.y = m.y;
      this.build();
      this.gate = this.burst ? Math.max(1, Math.round(0.8 * (m.gate || 0.22) * SR)) : 0;
      // Glas speaks at once at every height (owner, 22.10.2026): high notes start as loud in their band as low ones do
      // (the seed (f/800)^1.5 above 800 Hz, not √), and the doublets' split grows in over the first 0.3 s – split from
      // the first sample, a high pair beat within ≈ 0.1 s (3.8 Hz at 1568 Hz) and drew its pattern away from the bow
      // while it took hold: one high note in 3–16 spoke only after 0.5–1 s, from −52 dB. Once sounding, the same tone.
      this.age = 0; this.sk = this.body === 'glas' ? 0 : 1;
      this.kt = 1; this.kc = 0; this.vb = 0; this.phi = 2 * Math.PI * this.rng.next(); this.psi = 2 * Math.PI * this.rng.next();
      for (let j = 0; j < this.J; j++) this.pc[j] = this.kd[j] === 1 ? Math.cos(this.nd[j] * this.phi) : this.kd[j] === 2 ? Math.sin(this.nd[j] * this.phi) : 1;
      this.rw.fill(0);
      this.coef(true);
      // the onset: one period of each band's own vibration in its loop (in band: a noise burst would mostly fall
      // outside the 32-Hz bands – measured −62 dB), so the modes speak at once and the bow takes them up; a Puls stroke
      // under 0.3 s three times as much, notes above 800 Hz √(f/800) as much (their bands answer slower); the tongue's bite
      // favours its upper modes
      const N = this.N, M = N - 1, buf = this.buf, amp = BOW_SEED * this.vel * (this.burst && m.gate < 0.3 ? 3 : 1) * (this.f > 800 ? (this.body === 'glas' ? Math.pow(this.f / 800, 1.5) : Math.sqrt(this.f / 800)) : 1), bite = this.body === 'zunge';
      // (Glas: a pair's two orientations seeded in phase – the one pattern the bow holds at its contact; with a phase of
      // its own each, the two could cancel there and the bow found nothing to take up: about one high note in 16 spoke
      // only after ≈ 1 s, from −52 dB)
      const inPh = this.body === 'glas'; let phP = 0;
      for (let j = 0; j < this.J; j++) {
        const D = this.Dt[j], n = Math.min(N - 8, Math.ceil(2 * D)), o = j * N, k = this.md[j], ph0 = 2 * Math.PI * this.rng.next(), ph = inPh && this.kd[j] === 2 ? phP : ph0;
        if (this.kd[j] === 1) phP = ph0;
        const wj = (bite ? [0.6, 1, 0.7, 0.5][k] : this.wi[j]) * (this.kd[j] === 1 ? Math.cos(this.nd[j] * this.phi) : this.kd[j] === 2 ? Math.sin(this.nd[j] * this.phi) : 1);
        for (let i = n; i >= 1; i--) buf[o + ((this.w - i) & M)] = amp * wj * Math.sin(ph - 2 * Math.PI * i / D);
      }
      this.wv += 3 * this.vel;   // a stroke stirs the water
    }
    stop() { this.kt = 0; }
    // per block: each band's frequency (Schwebung's doublets and slow walk, the water), delay, band-pass and losses
    coef(now) {
      const p = this.p, B = this.B, J = this.J, f = this.f, sch = p.schwebung, t60 = hrzT60(p.daempfung) * B.ring;
      const fmax = Math.min(16000, 0.42 * SR), teich = this.body === 'teich', wb = teich ? 25 * this.wx * (0.15 + 0.85 * sch) : 0;
      for (let j = 0; j < J; j++) {
        let fj = f * this.fr[j];
        if (this.kd[j]) fj *= 1 + 0.004 * sch * this.ss[j] * this.sk;   // a doublet: ±0.4 % apart at full Schwebung (Glas: grown in over the first 0.3 s, see start)
        else if (!this.round) fj *= cents(3 * sch * this.rw[j] + (this.rod[j] === 1 ? -wb : wb));   // ±3 ct walk; the water bends the rods apart
        if (fj > fmax) { this.gr[j] = 0; this.Dt[j] = this.D[j] = 4; this.b0[j] = 0; continue; }
        this.Dt[j] = Math.min(this.N - 8, SR / fj);
        this.gr[j] = Math.pow(10, -3 * (1 / fj + BOW_TBP) / Math.max(0.05, t60 * this.tf[j]));   // a pass takes its period plus the band's group delay
        const w0 = 2 * Math.PI * fj / SR, al = Math.sin(w0) * BOW_BW / (2 * fj), a0 = 1 + al;
        this.b0[j] = al / a0; this.a1[j] = -2 * Math.cos(w0) / a0; this.a2[j] = (1 - al) / a0;
        if (now || !this.D[j]) this.D[j] = this.Dt[j];
      }
    }
    lag(j) { const d = this.D[j], i = d | 0, q = d - i + 1, h = this.h, k = 4 * j; this.di[j] = i; h[k] = -(q - 1) * (q - 2) * (q - 3) / 6; h[k + 1] = q * (q - 2) * (q - 3) / 2; h[k + 2] = -q * (q - 1) * (q - 3) / 2; h[k + 3] = q * (q - 1) * (q - 2) / 6; }
    render(L, R, a, b) {
      const p = this.p, n = b - a, J = this.lite && this.J > 3 ? 3 : this.J, N = this.N, M = N - 1, buf = this.buf, two = !!(this.rich && R);   // (after underruns: three bands)
      const wi = this.wi, kd = this.kd, sd = this.sd, oL = this.oL, oR = this.oR, qL = this.qL, qR = this.qR, b0 = this.b0, a1 = this.a1, a2 = this.a2, z1 = this.z1, z2 = this.z2, g = this.lg, gr = this.gr, pc = this.pc, mL = this.mL, mR = this.mR, dmL = this.dmL, dmR = this.dmR, rr = this.r, D = this.D, Dt = this.Dt, dD = this.dD, hh = this.h, di = this.di;
      const B = this.B, round = this.round, zunge = this.body === 'zunge', teich = this.body === 'teich', sch = p.schwebung;
      // Schwebung's walk (±1 → ±3 ct, ≈ 0.1 Hz) and the water: a damped slosh at 0.8 Hz, stirred by every stroke and a
      // little all the time
      for (let j = 0; j < J; j++) { let r = this.rw[j] + 0.02 * (this.rng.next() * 2 - 1) - 0.002 * this.rw[j]; this.rw[j] = r > 1 ? 1 : r < -1 ? -1 : r; }
      if (teich) {
        const dt = n / SR, wf = 2 * Math.PI * 0.8;
        this.wv += dt * (-wf * wf * this.wx - 0.8 * this.wv) + Math.sqrt(dt) * 3 * (this.rng.next() * 2 - 1); this.wx += dt * this.wv;
        if (this.wx > 1) { this.wx = 1; this.wv = 0; } else if (this.wx < -1) { this.wx = -1; this.wv = 0; }
      }
      this.age += n; this.sk = this.body === 'glas' && this.age < 0.3 * SR ? this.age / (0.3 * SR) : 1;
      this.coef(false);
      // the bow: pressure from Höhe and Druck (0.1–0.75; above, the table sticks for good), speed from velocity and Bogen
      // with the arm's inertia – pressing harder plays louder (Schelleng: a light bow cannot drive as far), y > 0.9 ever
      // faster, slipping; the contact fades in and out in 20 ms
      const y = this.y, pr = Math.min(0.75, Math.max(0.1, (0.15 + 0.55 * y) * (0.6 + 0.8 * p.druck))), top = y > 0.9 ? (y - 0.9) / 0.1 : 0;
      const vt = (0.08 + 0.14 * this.vel) * (0.6 + 0.8 * p.bogen) * (0.55 + 0.9 * pr) * (1 + 0.4 * top);
      // the rough contact: the pressure trembles with the surface (low-passed noise, ±BOW_R at full Harz), every slip
      // a little early or late – grain in the friction and a shimmer in the bands; at the very top it tears
      const rough = BOW_R * (0.3 + p.harz) * (0.3 + pr) + 0.8 * top, rc = 1 - Math.exp(-2 * Math.PI * 3000 / SR);
      if (this.burst && this.kt) { if (this.gate <= n) { this.gate = 0; this.kt = 0; this.off = true; } else this.gate -= n; }
      // the tongue's growl: the bow arm shaking at 25–45 Hz, from y 0.55 up
      const gd = zunge ? 0.45 * Math.max(0, (y - 0.55) / 0.45) : 0;
      if (gd > 0) { const x = this.gf + 0.5 * (this.rng.next() * 2 - 1); this.gf = x < 25 ? 25 : x > 45 ? 45 : x; }
      const gInc = 2 * Math.PI * this.gf / SR;
      // the loss per pass: at least BOW_GMIN while bowed, the ring alone once the bow is lifted
      const kc0 = this.kc;
      for (let j = 0; j < J; j++) g[j] = gr[j] ? gr[j] + (Math.max(gr[j], BOW_GMIN) - gr[j]) * kc0 : 0;
      // the round bodies: a pair's vibration is the pattern the bow keeps at its contact (S) and the share the doublets'
      // beat turns away from it (O). The finger circles the rim and S turns with it: two listeners a quarter turn of
      // the pattern apart (left, right; level 1: the left) hear it swell and fade at 2n × the finger's turns, each
      // when the other one fades (as amplitude: turning the listeners around a fixed pattern would shift the pitch of
      // its travelling share); O, which does not follow, beats in at a level of its own (Schwebung) – heard a quarter
      // period late, so the two never add or cancel by where the bow happened to sit (measured: ±2.5 dB note to note).
      // The right listener takes S late and O now: the sides are in quadrature – a stereo voice's two coherent channels
      // would sum up to 2 dB louder off centre in the voice's panner (it folds one side into the other, measured)
      const psi0 = this.psi, psi1 = psi0 + (round ? 2 * Math.PI * (B.rot[0] + B.rot[1] * p.bogen) * this.kc * n / SR : 0);   // (a lifted finger stops circling)
      this.psi = psi1 % (2 * Math.PI);
      const deep = 0.25 + 0.5 * sch, cc = (1 - deep) * (1 - deep), bo = 0.2 + 0.4 * sch;
      const am = BOW_AM;
      for (let j = 0; j < J; j++) {
        if (!kd[j]) { mL[j] = oL[j]; mR[j] = oR[j]; dmL[j] = dmR[j] = 0; continue; }
        const nd = this.nd[j], cp = Math.cos(nd * this.phi), sp = Math.sin(nd * this.phi);
        // the band's share of S (its orientation at the contact) and of O
        const ws = kd[j] === 1 ? cp : sp, wo = kd[j] === 1 ? -sp : cp;
        mL[j] = oL[j] * am(Math.cos(nd * psi0), cc) * ws; mR[j] = oR[j] * am(Math.sin(nd * psi0), cc) * ws;
        dmL[j] = (oL[j] * am(Math.cos(nd * psi1), cc) * ws - mL[j]) / n; dmR[j] = (oR[j] * am(Math.sin(nd * psi1), cc) * ws - mR[j]) / n;
        this.qL[j] = oL[j] * bo * wo; this.qR[j] = -oR[j] * bo * wo;
      }
      // the delays: Lagrange weights per block, per sample while a glide moves them by more than ¼ sample a block
      let glide = false;
      for (let j = 0; j < J; j++) { const d = Dt[j] - D[j]; if (d > 0.25 || d < -0.25) { dD[j] = d / n; glide = true; } else { D[j] = Dt[j]; dD[j] = 0; } this.lag(j); }
      // the friction force in the output (Harz), growing with the square of the pressure: a breath of it low on the
      // field, alive in the middle, grit at the top – through each body's high-pass (the wet finger's squeak on glass,
      // wood on metal, rosin on the bar, the tongue's voice is mostly this)
      const fo = (zunge ? 0.25 + 0.75 * p.harz : p.harz) * (0.2 + 2.5 * pr * pr) * BOW_F, hc = 1 - Math.exp(-2 * Math.PI * B.hp / SR);
      // the waterphone's rod screams at the top: its second mode pulled in by the pressure (the bow jumps up to it and
      // back with the rough contact)
      const sq = teich ? 1 : -1, squ = Math.max(0, (y - 0.85) / 0.15), sqw = 1 + 5 * squ * squ;
      const ap = this.ap;
      const kStep = 1 / (0.02 * SR), kt = this.kt, nAmt = BOW_N * (1.5 - pr);
      let w = this.w, vb = this.vb, kc = this.kc, ni = this.ni, gp = this.gp, fh = this.fh, rn = this.rn;
      for (let i = a; i < b; i++) {
        vb += 0.0005 * ((gd > 0 ? vt * (1 + gd * Math.sin(gp)) : vt) - vb); gp += gInc;
        if (kc !== kt) { kc += kc < kt ? kStep : -kStep; if (Math.abs(kc - kt) < kStep) kc = kt; }
        // the bands' velocity at the contact
        let vc = 0;
        for (let j = 0; j < J; j++) {
          if (glide && dD[j] !== 0) { D[j] += dD[j]; this.lag(j); }
          const o = j * N, k = w + 1 - di[j], h4 = 4 * j;
          const r = g[j] * (hh[h4] * buf[o + (k & M)] + hh[h4 + 1] * buf[o + ((k - 1) & M)] + hh[h4 + 2] * buf[o + ((k - 2) & M)] + hh[h4 + 3] * buf[o + ((k - 3) & M)]);
          rr[j] = r; vc += pc[j] * r;
        }
        ni = (ni + 1) & 65535;
        const nz = NOISE[ni]; rn += rc * (nz - rn);
        let ps = pr * (1 + rough * 4 * rn); ps = ps < 0.05 ? 0.05 : ps > 0.85 ? 0.85 : ps;
        const dv = vb + nAmt * nz - vc;
        let t = (dv < 0 ? -dv : dv) * (10 - 9 * ps) + 0.75; t *= t;
        let bt = 1 / (t * t); if (bt > 0.98) bt = 0.98; else if (bt < 0.01) bt = 0.01;
        const F = dv * bt * kc;
        let yl = 0, yr = 0;
        for (let j = 0; j < J; j++) {
          const x = F * wi[j] * pc[j] * (j === sq ? sqw : 1) + rr[j];
          const yo = b0[j] * x + z1[j]; z1[j] = z2[j] - a1[j] * yo; z2[j] = -b0[j] * x - a2[j] * yo;
          buf[j * N + w] = yo;
          if (kd[j] || two) {   // the band a quarter period ago
            const q = 0.25 * D[j], qi = q | 0, fq = q - qi, o = j * N, k = w - qi, s0 = buf[o + (k & M)], yq = s0 + fq * (buf[o + ((k - 1) & M)] - s0);
            if (kd[j]) { yl += mL[j] * yo + qL[j] * yq; yr += mR[j] * yq + qR[j] * yo; mL[j] += dmL[j]; mR[j] += dmR[j]; }   // a pair: S now and O late on the left, S late and O now on the right
            else if (sd[j]) { yl += oL[j] * yq; yr += oR[j] * yo; } else { yl += oL[j] * yo; yr += oR[j] * yq; }   // a single band: the softer side late
          } else yl += oL[j] * yo;
        }
        w = (w + 1) & M;
        fh += hc * (F - fh); const d0 = fo * (F - fh);   // the friction force above the body's corner (its offset gone with it)
        L[i] = yl + d0;
        if (two) {   // the right side through three all-passes: decorrelated, as the bands are (see the pairs above)
          let u = d0, z;
          z = u - 0.7 * ap[1]; u = 0.7 * z + ap[1]; ap[1] = z; z = u + 0.6 * ap[2]; u = -0.6 * z + ap[2]; ap[2] = z; z = u - 0.5 * ap[3]; u = 0.5 * z + ap[3]; ap[3] = z;
          R[i] = yr + u;
        }
      }
      this.w = w; this.vb = vb; this.kc = kc; this.ni = ni; this.fh = flush(fh); this.rn = rn; this.gp = gp % (2 * Math.PI);
      for (let j = 0; j < J; j++) { z1[j] = flush(z1[j]); z2[j] = flush(z2[j]); }
      // the bodies' own colour: the tongue's two formants (opening with the pressure, u → a) and its wood; the
      // waterphone's bowl, moving with the water
      if (zunge) { this.peak(L, R, a, b, 0, 350 + 400 * pr, 4, 9, two); this.peak(L, R, a, b, 1, 900 + 900 * pr, 4, 9, two); this.low(L, R, a, b, 3500, two); }
      else if (teich) this.peak(L, R, a, b, 0, 180 * Math.pow(2, this.wx * (0.15 + 0.85 * sch)), 2, 6, two);
      const og = two ? BOW_OUT * Math.SQRT1_2 : BOW_OUT;   // (a stereo voice passes its panner at full gain, a mono one at −3 dB)
      for (let i = a; i < b; i++) { L[i] = tanh(og * L[i]); if (two) R[i] = tanh(og * R[i]); else if (R) R[i] = L[i]; }
    }
    // a peaking filter on both channels (state q), coefficients per block
    peak(L, R, a, b, q, f0, Q, dB, two) {
      const A = Math.pow(10, dB / 40), w0 = 2 * Math.PI * Math.min(f0, 0.45 * SR) / SR, al = Math.sin(w0) / (2 * Q), a0 = 1 + al / A;
      const c0 = (1 + al * A) / a0, c1 = -2 * Math.cos(w0) / a0, c2 = (1 - al * A) / a0, d2 = (1 - al / A) / a0, s = this.fs[q];
      let s0 = s[0], s1 = s[1];
      for (let i = a; i < b; i++) { const x = L[i], yv = c0 * x + s0; s0 = c1 * x - c1 * yv + s1; s1 = c2 * x - d2 * yv; L[i] = yv; }
      s[0] = flush(s0); s[1] = flush(s1);
      if (two) { s0 = s[2]; s1 = s[3]; for (let i = a; i < b; i++) { const x = R[i], yv = c0 * x + s0; s0 = c1 * x - c1 * yv + s1; s1 = c2 * x - d2 * yv; R[i] = yv; } s[2] = flush(s0); s[3] = flush(s1); }
    }
    low(L, R, a, b, fc, two) {
      const c = 1 - Math.exp(-2 * Math.PI * fc / SR), lp = this.lp;
      let l0 = lp[0]; for (let i = a; i < b; i++) { l0 += c * (L[i] - l0); L[i] = l0; } lp[0] = flush(l0);
      if (two) { let l1 = lp[1]; for (let i = a; i < b; i++) { l1 += c * (R[i] - l1); R[i] = l1; } lp[1] = flush(l1); }
    }
  }

