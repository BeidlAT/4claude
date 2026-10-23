  // ---- Zapfen: myzel-scrape – a stick over the scales of a cone: scrape → tone (SPEC §3.8) ----
  // The teeth: a phase accumulator at the scrape rate R places a tooth where it crosses a whole number plus that
  // tooth's own offset – drawn fresh for every tooth and never cumulative, so the mean rate is exactly R (at the top the
  // tone is exactly the note) and no pattern repeats (a 64-tooth table loops: a flutter at R/64, the check). A tooth is a
  // 4-sample Hann bump band-limited by an 8-tap windowed sinc, written at its sub-sample time from a table of 64 phases
  // (whole samples jitter the period by ±18–35 ct at 1–2 kHz, the check), ±30 % in height, with a 2–6-ms burst of noise
  // (Kratzen). The teeth knock the body – modes tuned to the note (complex rotations: every knock rings on the note) –
  // and ring a short click resonator (the contact); the contact is heard itself too: each tooth high-passed, and the
  // stick's ride over the scales – the integrated teeth, the saw in the top tone, with the wood's formant.
  // Höhe is the rate, on a log scale from ZPF_R0 per second (at every pitch: single ticks at the bottom) up to the note;
  // above the Rast threshold 0.6·(1.3 − Rast) it snaps to f/2ⁿ (n = 0 … 4, the nearest) with ±8 % hysteresis and a short
  // slew. The finger's speed adds up to half the rate below the Rast (dead zone 0.02/s, 50-ms leaky integrator).
  // Fels (from Kluft): each tooth is a stone contact that has loaded up and gives – a rasp of slips (see render: the stone).
  const ZPF_R0 = 3, ZPF_G = 0.15, ZPF_GD = 0.2, ZPF_OUT = 0.2, ZPF_H = Math.log2(1.08), ZPF_KT = 12, ZPF_KP = 64, ZPF_DIR = 0.35, ZPF_CLK = 0.5, ZPF_NZ = 0.25, ZPF_SLEW = 0.015, ZPF_FC = 1.6, ZPF_SAW = 1.85, ZPF_BOX = 1.2;
  const ZPF_K = new Float32Array((ZPF_KP + 1) * ZPF_KT);   // the tooth at sub-sample phase u = j/64: sample n after it fires = k(n + u − 6); area 1
  {
    const bump = (t) => (t > -2 && t < 2 ? 0.5 + 0.5 * Math.cos(Math.PI * t / 2) : 0), fc = 0.42;
    const sinc = (t) => { if (t <= -4 || t >= 4) return 0; const x = 2 * fc * t, s = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); return 2 * fc * s * (0.42 + 0.5 * Math.cos(Math.PI * t / 4) + 0.08 * Math.cos(Math.PI * t / 2)); };
    for (let j = 0; j <= ZPF_KP; j++) {
      let sum = 0;
      for (let n = 0; n < ZPF_KT; n++) { const t = n + j / ZPF_KP - 6; let v = 0; for (let m = -32; m < 32; m++) { const tau = (m + 0.5) / 16; v += bump(tau) * sinc(t - tau) / 16; } ZPF_K[j * ZPF_KT + n] = v; sum += v; }
      for (let n = 0; n < ZPF_KT; n++) ZPF_K[j * ZPF_KT + n] /= sum;
    }
  }
  const ZPF_B = {   // r: mode ratios (level 1 the first four, level 3 all six), a: their weights, ring: × Klang's T60, ck: the click (Hz) – cy, cv: its octaves over Höhe and velocity, cl: its level –, bx: the wood's formant (Hz), lv: the body's level (every body as loud in the standard phrase, klang/tests/loud-zpf.js)
    zapfen: { r: [1, 0.5, 2.572, 4.644, 6.984, 9.723], a: [1, 0.7, 0.55, 0.35, 0.25, 0.18], ring: 1, ck: 2600, bx: 900, lv: 1 },   // a wooden bar (Csound) and the cone's hollow
    holz: { r: [1, 2.572, 4.644, 6.984, 9.723, 12], a: [1, 0.6, 0.42, 0.3, 0.22, 0.16], ring: 1.3, ck: 1800, bx: 650, lv: 1.23 },     // the uniform wooden bar (Csound)
    panzer: { r: [1, 1.47, 2.09, 2.56, 2.94, 3.62], a: [1, 0.8, 0.6, 0.5, 0.35, 0.3], ring: 0.5, ck: 3800, bx: 1600, lv: 1.15 },        // a wooden plate (Csound) – chitin: dry, crowded
    kuerbis: { r: [1, 0.7, 2, 3.01, 4.01, 4.69], a: [1, 0.9, 0.5, 0.35, 0.25, 0.2], ring: 1.6, ck: 1100, bx: 480, lv: 1.11 },         // a gourd: a near-harmonic shell and its Helmholtz boom
    fels: { r: [1, 2.756, 5.404, 8.933, 0.5, 13.345], a: [1, 0.5, 0.35, 0.25, 0.45, 0.15], ring: 1.4, ck: 2400, bx: 1300, cy: 1.4, cv: 1, cl: 2, lv: 1.05 },   // a stone slab (Kluft's Stein) and its hollow; its click is the scream: 1.5–4 kHz with the load and the force (Kluft)
  };
  class Scrape extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po, J = 6;
      this.rich = !!po.rich;
      this.rr = new Float64Array(J); this.wa = new Float64Array(J); this.cs = new Float64Array(J); this.sn = new Float64Array(J); this.mre = new Float64Array(J); this.mim = new Float64Array(J);
      this.oL = new Float64Array(J); this.oR = new Float64Array(J); this.qL = new Float64Array(J); this.qR = new Float64Array(J);
      this.acc = new Float64Array(16); this.ap = new Float64Array(6);
      this.p = { koerper: 'zapfen', schuppen: 0.3, rast: 0.7, klang: 0.4, strich: 0.5, kratzen: 0.3 };
      this.rng = new PRNG(po.seed || 13); this.vel = 0.75; this.K = 0; this.body = ''; this.bf = 0; this.bk = 0; this.two = false;
      if (po.prm) this.set(po.prm);
      this.reset();
    }
    reset() {
      this.mre.fill(0); this.mim.fill(0); this.acc.fill(0); this.ap.fill(0);
      this.aw = 0; this.ph = 0; this.nx = 1; this.lt = -8; this.lock = -1; this.sp = 0; this.yp = this.y;
      this.ni = 0; this.nb = 0; this.nd = 0; this.hx = 0; this.dl = 0; this.cre = this.cim = 0; this.sI = this.sx = this.sy = this.bre = this.bim = this.em = 0;
      this.fT = 0; this.fN = Infinity; this.fS = 1; this.fSi = 0; this.fSa = 0; this.fw = 0; this.ra = 0; this.bt = 0; this.toff = 0; this.going = false; this.first = 1; this.tok = 0; this.nT = this.nS = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'koerper' ? String(p[k]) : +p[k] || 0; this.bk = 0; }
    // the body: its modes at the note (per block when the pitch, the body or Klang moved), their sides at level 3
    build(two) {
      const p = this.p, B = ZPF_B[p.koerper] || ZPF_B.zapfen, K = this.lite ? 3 : this.rich ? 6 : 4, f = this.f;
      if (this.bk && K === this.K && two === this.two && Math.abs(f - this.bf) < 1e-4 * f) return;   // (bk: cleared when a knob or the note changes)
      this.bk = 1; this.bf = f; this.K = K; this.two = two; this.B = B; this.body = p.koerper;
      const t60 = (0.05 + 0.35 * p.klang) * B.ring;
      for (let k = 0; k < K; k++) {
        const fk = f * B.r[k], a = B.a[k];
        if (fk > 0.45 * SR) { this.cs[k] = this.sn[k] = 0; this.oL[k] = this.oR[k] = this.qL[k] = this.qR[k] = 0; continue; }
        const t = Math.min(2.5, t60 * Math.min(1.6, Math.pow(B.r[k], -0.4))), r = Math.pow(0.001, 1 / (t * SR)), w = 2 * Math.PI * fk / SR;
        this.cs[k] = r * Math.cos(w); this.sn[k] = r * Math.sin(w); this.rr[k] = B.r[k];
        if (k === 0) this.t60 = t;
        // heard as its velocity (the step from the last sample, ÷ 2·sin(ω/2)): its ring starts at full height with the
        // knock and has no low tail (the rotation's displacement kept one: a tick train 12 dB louder below 80 Hz, measured)
        // level 3: the modes alternate sides at equal power (1.31 / 0.53), the softer side hears the mode in quadrature – its
        // displacement (a velocity's quadrature; the other component's step carries the knock itself through ÷ sin, +10 dB
        // peaks, measured): two coherent channels would sum up to 2 dB louder off centre in the voice's panner
        const aw = a / (2 * Math.sin(w / 2));
        if (two) { const s = k % 2; this.oL[k] = s ? 0 : 1.31 * aw; this.qL[k] = s ? 0.53 * a : 0; this.oR[k] = s ? 1.31 * aw : 0; this.qR[k] = s ? 0 : 0.53 * a; }
        else { this.oL[k] = aw; this.qL[k] = this.oR[k] = this.qR[k] = 0; }
      }
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      if (m.seed) this.rng = new PRNG(m.seed);
      if (m.y != null) this.y = m.y;
      this.yp = this.y; this.sp = 0; this.lock = -1; this.bk = 0; this.toff = 0; this.going = true; this.em = -1;
      // the first tooth at once (the stick sets on), a little harder
      this.ph = 1; this.nx = 1; this.first = 1 + 0.25 * this.vel;
      this.lt = this.target(0, true);
      if (this.burst) {
        // a stroke: the rate swells and falls as sin(πt/gate)^(1 + 2·Strich) and passes at least 5 + 25·gate teeth
        const g = Math.max(0.01, m.gate || 0.22), e = 1 + 2 * this.p.strich; let mm = 0;
        for (let i = 0; i < 64; i++) mm += Math.pow(Math.sin(Math.PI * (i + 0.5) / 64), e) / 64;
        this.gate = Math.round(g * SR); this.bt = 0; this.bx = e;
        this.rmax = Math.min(2500, Math.max(this.rateFree(), (5 + 25 * g) / (g * mm)));
        this.tok = Math.round(0.92 * g * SR);   // and a last, harder tooth just before the end (the stick leaves: tok)
      }
    }
    stop() { this.toff = 0; }
    rateFree() { const oc = Math.log2(Math.max(this.f, 1.01 * ZPF_R0) / ZPF_R0); return this.f * Math.pow(2, -(1 - this.y) * oc); }
    // the target log₂(R/f) from Höhe, Rast and the finger's speed (per block)
    target(n, now) {
      const p = this.p, y = this.y, oc = Math.log2(Math.max(this.f, 1.01 * ZPF_R0) / ZPF_R0), Lf = (1 - y) * oc;   // octaves below the note
      if (n) { const dy = Math.abs(y - this.yp) * SR / n; this.sp += (Math.max(0, dy - 0.02) - this.sp) * (1 - Math.exp(-n / (0.05 * SR))); }
      this.yp = y;
      const yR = 0.6 * (1.3 - p.rast);
      if (this.lock < 0) { if (y >= yR + 0.01 && Lf < 4.5 + ZPF_H) this.lock = Math.min(4, Math.max(0, Math.round(Lf))); }
      else if (y < yR - 0.01 || Lf > 4.5 + ZPF_H) this.lock = -1;
      else if (Math.abs(Lf - this.lock) > 0.5 + ZPF_H) this.lock = Math.min(4, Math.max(0, Math.round(Lf)));
      if (this.lock >= 0) return -this.lock;
      let t = -Lf + Math.log2(1 + Math.min(0.5, this.sp));
      if (p.koerper === 'fels') t += this.fw;   // the stone's creaks wander (free only)
      return t;
    }
    render(L, R, a, b) {
      const p = this.p, n = b - a, two = !!(R && this.rich && !this.lite), fels = p.koerper === 'fels';
      this.build(two);
      const K = this.K, f = this.f, rng = this.rng;
      // the rate
      let Rt;
      if (this.burst) {
        const t = this.bt / Math.max(1, this.gate);
        Rt = t < 1 ? this.rmax * Math.pow(Math.sin(Math.PI * Math.min(1, t + 0.5 * n / this.gate)), this.bx) : 0;
        if (this.bt >= this.gate && !this.off) { this.off = true; this.going = false; }
        this.bt += n;
      } else {
        if (fels) { const w = this.fw + 0.08 * (rng.next() * 2 - 1) * (0.2 + p.schuppen) - 0.01 * this.fw; this.fw = w > 0.6 ? 0.6 : w < -0.6 ? -0.6 : w; }
        let tg = this.target(n, false);
        if (this.off) { this.toff += n; tg = this.lt - n / (SR * 0.2 * Math.LN2); if (this.toff > 0.6 * SR) this.going = false; }   // let go: the stick coasts (R → 0, τ 0.2 s)
        this.lt += (tg - this.lt) * (this.off ? 1 : 1 - Math.exp(-n / (ZPF_SLEW * SR)));
        Rt = this.going ? f * Math.pow(2, this.lt) : 0;
        if (this.off && Rt < 1.5) this.going = false;
      }
      const inc = Rt / SR, ry = Rt > ZPF_R0 ? Math.min(1, Math.log2(Rt / ZPF_R0) / Math.max(1, Math.log2(f / ZPF_R0))) : 0;
      // irregular scales: each tooth ±J of a period off its place – more at the bottom (the hand), ±0.5 % in the stone's tone
      const J = fels ? (0.006 + 0.01 * p.schuppen) * (1 + 20 * (1 - ry)) : (0.008 + 0.025 * p.schuppen) * (1 + 3 * (1 - ry));
      const hA = 0.2 + 0.3 * p.schuppen;
      // a tooth's force: a little harder the slower the stick (single ticks carry), the contact's own sound softer per
      // tooth as they crowd; into the body the fundamental's build-up at this rate is taken off – locked on f/2ⁿ every
      // tooth adds in phase (the knock's ring × 1/(1 − ρ)): the note's mode stands at the level of one knock at every
      // rate (it follows the rate's own slew: a lag of its own let the first knocks of a step overshoot, +1.8 dB)
      const At = Rt > 0 ? Math.pow(Math.max(1, Rt / ZPF_R0), -ZPF_G) : 0, gd = Rt > 0 ? Math.pow(Math.max(1, Rt / ZPF_R0), -ZPF_GD) : 0;
      const rho = Rt > 0 ? Math.exp(-6.91 / (this.t60 * Rt)) : 0;
      const gm = 1 - rho;
      const kz = p.kratzen * (0.5 + this.vel), hc = 1 - Math.exp(-2 * Math.PI * Math.min(0.4 * SR, 1500 * Math.pow(2, 3 * this.vel)) / SR);
      const dg = ZPF_DIR * (0.4 + 0.6 * this.vel) * gd, cg = ZPF_CLK * gd * (this.B.cl || 1), dc = 1 - Math.exp(-2 * Math.PI * 700 / SR);
      // the click: higher with Höhe and velocity
      const fk = Math.min(0.4 * SR, this.B.ck * Math.pow(2, (this.B.cy || 0.8) * (this.y - 0.5) + (this.B.cv || 0.6) * (this.vel - 0.5))), rk = Math.pow(0.001, 1 / (0.006 * SR)), wk = 2 * Math.PI * fk / SR, kc = rk * Math.cos(wk), ks = rk * Math.sin(wk), kn = 1 / (2 * Math.sin(wk / 2));   // (as a mode: its velocity)
      const fc = Math.min(4000, ZPF_FC * f * (1 - 0.5 * ry * ry * ry * ry)), fq = 1 - 0.6 * ry;   // (the stone's slips: a rasp at 1.6·f low – at the top slower than the period: one slip a period, the tone; as uneven as a creak low, a flutter in its tone)
      // the stick's ride: up each scale, down at its edge – a sawtooth whose drops are the teeth, heard once they crowd
      // into a buzz (from ≈ 50 per second: slower, its ramps are a rumble) – the tone's saw – and the wood's formant on
      // it (a broad band-pass). A small body hardly radiates below its own modes: the saw is high-passed at 0.35·f (2nd
      // order, ≥ 30 Hz) – on the Rast's lower steps the buzz keeps its pitch by its harmonics, without the rumble of its
      // 14–55-Hz fundamental (the standard phrase: 20–80 Hz carried most of its energy)
      const fh = Math.min(400, Math.max(30, 0.35 * f)), wh = 2 * Math.PI * fh / SR, ah = Math.sin(wh) * Math.SQRT1_2, ha0 = 1 + ah, hb0 = (1 + Math.cos(wh)) / 2 / ha0, ha1 = -2 * Math.cos(wh) / ha0, ha2 = (1 - ah) / ha0;
      const sw = ZPF_SAW * Rt * Rt / (Rt * Rt + 2500), li = 1 - 2 * Math.PI * 25 / SR, wb = 2 * Math.PI * Math.min(0.4 * SR, this.B.bx) / SR, al = Math.sin(wb) / 2.4, b0 = al / (1 + al), a1 = -2 * Math.cos(wb) / (1 + al), a2 = (1 - al) / (1 + al);   // (RBJ band-pass, Q 1.2, 0 dB at its centre)
      const acc = this.acc, cs = this.cs, sn = this.sn, mre = this.mre, mim = this.mim, oL = this.oL, oR = this.oR, qL = this.qL, qR = this.qR, ap = this.ap;
      let ph = this.ph, nx = this.nx, aw = this.aw, ni = this.ni, nb = this.nb, nd = this.nd, hx = this.hx, dl = this.dl, cre = this.cre, cim = this.cim, sI = this.sI, sx = this.sx, sy = this.sy, bre = this.bre, bim = this.bim, em = this.em < 0 ? At * Rt / SR : this.em;
      let fT = this.fT, fN = this.fN, fS = this.fS, fSi = this.fSi, fSa = this.fSa;
      for (let i = a; i < b; i++) {
        // -- the scheduler: a tooth (or, on the stone, a rasp) where the phase crosses its place
        let tk = 0;
        if (this.tok && this.bt - n + (i - a) >= this.tok) { this.tok = 0; tk = 1; }   // the stroke's last tooth, now
        if (inc > 0 || tk) {
          ph += inc;
          if (ph >= nx || tk) {
            const u = tk ? 0 : Math.min(1, (ph - nx) / inc); this.nT++;   // (counted: the tests)
            const amp = (tk ? 1.3 : At * (1 + hA * (rng.next() * 2 - 1))) * this.first; this.first = 1;
            if (fels) { fT = 1 + 0.3 * p.schuppen * (rng.next() * 2 - 1); fN = -u; this.ra = amp; }   // the load gives: a rasp starts (at its sub-sample time)
            else {
              const q = u * ZPF_KP, j = q | 0, fr = q - j, o0 = j * ZPF_KT, o1 = j < ZPF_KP ? o0 + ZPF_KT : o0;
              for (let k = 0; k < ZPF_KT; k++) acc[(aw + k) & 15] += amp * (ZPF_K[o0 + k] + fr * (ZPF_K[o1 + k] - ZPF_K[o0 + k]));
              nb = Math.max(nb, amp); nd = Math.exp(-1 / ((0.0005 + 0.001 * rng.next()) * SR));   // its noise, 2–6 ms
            }
            if (tk) { ph = 0; nx = 1; } else { ph -= 1; nx = 1 + J * (rng.next() * 2 - 1); }
          }
        }
        let e, ec = 0;
        if (fels) {
          // -- the stone: slips while the load is above the kinetic level; each lets a part go, the next comes sooner the more is left
          if (fN <= 0) {
            const qq = 0.23 + 0.09 * fq * (rng.next() * 2 - 1), rel = qq * fT; this.nS++;
            fT -= rel;
            const gap = SR / (fc * Math.pow(Math.max(0.05, fT), 0.8)), d = Math.max(2, Math.min((0.001 + 0.002 * rng.next()) * SR, 0.12 * SR / f, 0.6 * gap));
            fSi = 1 / d; fS = -fN * fSi; fSa = this.ra * rel * 4.35 * (0.55 + 0.45 * ry) * Math.PI / (2 * d);   // (its area: a tooth's at the top, where one slip is a period; a rasp's slips together about one tooth's energy low)
            nb = Math.max(nb, this.ra * rel * 3); nd = Math.exp(-1 / (d * 0.5));
            // the slip's start cracks (stick lets go at once): a tooth into the contact – it screams with the load (Höhe) and the force
            // (a hard stroke cracks the stone much more: velocity 0.3 → 1 ×3.3)
            const cr = this.ra * rel * 3 * (0.2 + 0.8 * this.y) * (0.2 + 1.2 * this.vel * this.vel), q = Math.min(1, -fN) * ZPF_KP, j = q | 0, fr = q - j, o0 = j * ZPF_KT, o1 = j < ZPF_KP ? o0 + ZPF_KT : o0;
            for (let k = 0; k < ZPF_KT; k++) acc[(aw + k) & 15] += cr * (ZPF_K[o0 + k] + fr * (ZPF_K[o1 + k] - ZPF_K[o0 + k]));
            fN = fT > 0.32 ? fN + gap : Infinity;
          }
          fN -= 1;
          ec = acc[aw]; acc[aw] = 0; e = 0; if (fS < 1) { e = fSa * SIN[(fS * 2048) | 0]; fS += fSi; }   // a half-sine velocity pulse (its crack: the contact only)
        } else { e = acc[aw]; acc[aw] = 0; }
        aw = (aw + 1) & 15;
        ni = (ni + 1) & 65535; const nz = NOISE[ni] * nb * kz; nb *= nd;
        hx += hc * (e - hx);
        const x = (hx + ZPF_NZ * nz) * gm;
        // -- the body
        let yl = 0, yr = 0;
        for (let k = 0; k < K; k++) {
          const r0 = mre[k], m0 = mim[k], c = cs[k], s = sn[k], rq = r0 * c - m0 * s, m1 = r0 * s + m0 * c;
          mre[k] = rq + x; mim[k] = m1;
          const dm = m1 - m0;
          yl += oL[k] * dm + qL[k] * m1; yr += oR[k] * dm + qR[k] * m1;
        }
        // -- the contact: its click (a short resonance) and itself, high-passed
        const xd = e + ec + nz, cq = cre * kc - cim * ks, c1 = cre * ks + cim * kc, cd = (c1 - cim) * kn; cim = c1; cre = cq + xd;
        dl += dc * (xd - dl); const dd = xd - dl;
        em += 0.004 * (e - em); sI = sI * li + (e - em) * sw;
        const sd = hb0 * sI + sx; sx = -2 * hb0 * sI - ha1 * sd + sy; sy = hb0 * sI - ha2 * sd;   // (RBJ high-pass, transposed: sx, sy its state)   // (the ramp: the teeth's mean taken off – integrated, it would rise to A·R/(2π·25), a thump at the onset: 2.7 at 8 kHz, measured)
        const bo = b0 * sd + bre; bre = bim - a1 * bo; bim = -b0 * sd - a2 * bo;
        const ct = cg * cd + dg * dd + sd + ZPF_BOX * bo;
        L[i] = yl + ct;
        if (two) {   // the right side's contact through three all-passes: decorrelated
          let u2 = ct, z;
          z = u2 - 0.7 * ap[1]; u2 = 0.7 * z + ap[1]; ap[1] = z; z = u2 + 0.6 * ap[2]; u2 = -0.6 * z + ap[2]; ap[2] = z; z = u2 - 0.5 * ap[3]; u2 = 0.5 * z + ap[3]; ap[3] = z;
          R[i] = yr + u2;
        }
      }
      this.ph = ph; this.nx = nx; this.aw = aw; this.ni = ni; this.nb = flush(nb); this.nd = nd; this.hx = flush(hx); this.dl = flush(dl); this.cre = flush(cre); this.cim = flush(cim); this.sI = flush(sI); this.sx = sx; this.sy = flush(sy); this.bre = flush(bre); this.bim = flush(bim); this.em = em;
      this.fT = fT; this.fN = fN; this.fS = fS; this.fSi = fSi; this.fSa = fSa;
      for (let k = 0; k < K; k++) { mre[k] = flush(mre[k]); mim[k] = flush(mim[k]); }
      const og = (two ? ZPF_OUT * Math.SQRT1_2 : ZPF_OUT) * this.B.lv;
      for (let i = a; i < b; i++) { L[i] = tanh(og * L[i]); if (two) R[i] = tanh(og * R[i]); else if (R) R[i] = L[i]; }
    }
  }

