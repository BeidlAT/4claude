  // ---- Moder: myzel-rot – a struck body whose glitter is digested downward (SPEC §3.10) ----
  // Eight modes (level 3: twelve) as phasors, each at an amplitude √P_k; the power P_k moves per block by an ODE: every
  // mode rings out by itself (μ_k = k/T, T = the hit's Nachklang) and, from mode 2 up, is digested at
  // d_k = D·m·max(0.5, 3(k/8)^1.5) (D = Pilz, m = the moisture from Höhe; higher modes faster). A share η (Schwellen) of
  // what is digested flows straight into the fundamental – the stem –, the rest crackles away. Measured (klang/tests,
  // the check's simulation): the stem only swells when the energy flows to it directly, when the strike leaves it 10 dB
  // down and when the upper modes are digested faster than they ring out (D = 3.5 × Pilz: SPEC's 1 × Pilz gave mode 5
  // −14 dB by 1.5 s, the row asks −20, and a swell of +3.5 dB); the fungus grows into the strike (∝ t² at first, half
  // grown at ROT_TG: else a third of the swell is over by 0.1 s, where it is measured from, and the strike's glitter is
  // eaten before it is heard). Fed, the stem holds; it dries out towards the end of its Nachklang: a drying loss growing
  // as (t/T)^7 takes every mode, and what it takes crackles too – the hum sighs out dry, and the voice ends at ≈ 0.9 T
  // (SPEC's τ_1 = T alone would let the swollen stem ring for 13.8·T, past the row's 1.3·T; 0.9 T keeps a Puls lane at
  // 8 hits/s to 10 voices). Short steps (Puls) and a short Nachklang run the whole compost faster (sc: digestion ×,
  // growth ÷), as SPEC's gate scaling.
  // Crackle (SPEC: AM of the mode): per mode a Poisson stream of events (λ_k = Knistern·40·its crackling share of the
  // loss, ≤ 20/s); an event is a 2–8-ms grain of noise into a leaky complex integrator G that decays in ≈ ROT_B.cyc
  // periods of the mode, and the mode sounds as Im(z·(1 + G)): a tick on the partial's own pitch – its energy lies
  // within ±5 % of f_k (a Lorentzian ten periods wide: 80 %), its depth grows with √(the digested power), the sizes
  // mostly small, a few large (as crackling noise is). The stem: the fundamental through a biased tanh (soft even and odd
  // harmonics that thicken as it swells, its offset blocked) plus a fifth of it on mode 2 (no bare sine 'wub').
  const ROT_OUT = 0.15, ROT_STEM = 0.316, ROT_DSC = 3.5, ROT_TG = 0.3, ROT_DRY = 360, ROT_DP = 7, ROT_EPS = 0.4, ROT_C = 2.2, ROT_CMAX = 3.5, ROT_CAP = 3, ROT_S2 = 0.2, ROT_END = 1e-6;
  const ROT_SG = 1.2, ROT_SB = 0.3, ROT_SN = Math.tanh(ROT_SB), ROT_SK = 1 / (ROT_SG * (1 - ROT_SN * ROT_SN)), ROT_DC = 1 - 2 * Math.PI * 10 / SR, ROT_NZ = 0.25;   // (the stem's offset blocked below 10 Hz)
  // r: ratios (glocke: handbell, the first five measured (Csound), the rest and level 3's four assumed; holz: a wooden
  // bar (Csound) and on; knochen: a free bar (STK) bending into a bone's wider series); tilt: the body's own darkening
  // of the upper modes; mu: their own ring × k/T; cyc: a crackle grain's length in periods (bone dry and short); the
  // mallet's knock: low-pass from-to (by Schlägel), level
  const ROT_B = {
    glocke: { r: [1, 1.794, 2.52, 2.991, 3.786, 4.5, 5.4, 6.8, 8.1, 9.6, 11.2, 13], tilt: 0, mu: 1, cyc: 12, nlp: [2500, 9000], nl: 0.6 },
    holz: { r: [1, 2.572, 4.644, 6.984, 9.723, 12, 14.5, 17, 20, 23.5, 27, 31], tilt: 0.1, mu: 1.1, cyc: 8, nlp: [1000, 4000], nl: 1.2 },
    knochen: { r: [1, 2.756, 5.404, 8.933, 12.9, 17.6, 22.5, 28, 34, 40.5, 47.5, 55], tilt: 0, mu: 1.2, cyc: 6, nlp: [3500, 12000], nl: 0.9 },
  };
  class Rot extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po, J = 12;
      this.rich = !!po.rich;
      // per mode: ratio, power, amplitude (as the last block ended), digestion shape, own loss; the phasor and its
      // rotation; at level 3 its weights left/right, which side hears it late and how many samples it is still silent
      // there (the late side starts at a zero crossing); crackle: rate, depth, the grain (wait, length, kick per side),
      // the integrator per side (G = r + i·i), its decay per sample, a noise position, whether a grain is alive
      this.fr = new Float64Array(J); this.Pw = new Float64Array(J); this.am = new Float64Array(J); this.dsh = new Float64Array(J); this.mu = new Float64Array(J);
      this.zr = new Float64Array(J); this.zi = new Float64Array(J); this.rc = new Float64Array(J); this.rs = new Float64Array(J);
      this.oL = new Float64Array(J); this.oR = new Float64Array(J); this.sd = new Int8Array(J); this.ls = new Int32Array(J);
      this.lam = new Float64Array(J); this.cd = new Float64Array(J); this.gw = new Int32Array(J); this.gn = new Int32Array(J); this.kL = new Float64Array(J); this.kR = new Float64Array(J);
      this.gLr = new Float64Array(J); this.gLi = new Float64Array(J); this.gRr = new Float64Array(J); this.gRi = new Float64Array(J); this.rho = new Float64Array(J); this.nx = new Int32Array(J); this.cOn = new Uint8Array(J);
      this.p = { koerper: 'glocke', pilz: 0.5, knistern: 0.4, schwellen: 0.6, nachklang: 5, schlaegel: 0.6 };
      this.rng = new PRNG(po.seed || 13); this.rk = new PRNG(((po.seed || 13) ^ 0x5bd1e995) | 0);   // (the crackle draws from its own: Knistern changes nothing else)
      if (po.prm) this.set(po.prm);
      this.B = ROT_B.glocke; this.K = 0; this.fq = 0; this.vel = 0.75; this.mo = 1; this.wet = 1; this.life = 5; this.sc = 1;
      this.reset();
    }
    reset() {
      this.Pw.fill(0); this.am.fill(0); this.zr.fill(1); this.zi.fill(0); this.gw.fill(0); this.gn.fill(0); this.ls.fill(0);
      this.gLr.fill(0); this.gLi.fill(0); this.gRr.fill(0); this.gRi.fill(0); this.cOn.fill(0);
      this.tt = 0; this.sumP = 0; this.fin = false; this.nev = 0;
      this.mi = 0; this.mz = 0; this.ml = 0; this.mr = 0; this.dxL = this.dyL = this.dxR = this.dyR = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'koerper' ? String(p[k]) : +p[k] || 0; }   // (body, mallet and Nachklang are taken at the strike)
    start(m) {
      const p = this.p, B = this.B = ROT_B[p.koerper] || ROT_B.glocke, vel = this.vel = m.vel != null ? Math.max(0, Math.min(1, m.vel)) : 0.75;
      if (m.seed) { this.rng = new PRNG(m.seed); this.rk = new PRNG((m.seed ^ 0x5bd1e995) | 0); }
      const y = Math.max(0, Math.min(1, m.y != null ? m.y : this.y));
      this.reset();
      this.mo = 0.1 + 2 * y; this.wet = Math.min(1, this.mo / 1.5);   // Höhe at the hit: the moisture (no live Höhe after it)
      this.life = Math.max(0.25, m.life || p.nachklang || 5);
      this.sc = m.sc || Math.max(1, Math.min(6, 5 / this.life));
      this.gN = 0; this.g = 1;   // a strike starts at once: the modes start at zero (sine phase), the mallet is the attack
      const K = this.K = this.rich ? 12 : 8, fmax = Math.min(16000, 0.45 * SR), f = this.f;
      // the strike: the fundamental 10 dB down, the upper modes tilted by the mallet – a soft one or a gentle hit leaves
      // them weaker (soft hits have little to compost)
      const beta = (1 - p.schlaegel) * 0.75 * (1.3 - 0.5 * vel) + B.tilt;
      let s8 = 0, sK = 0;
      for (let k = 0; k < K; k++) {
        const r = this.fr[k] = B.r[k], a = f * r > fmax ? 0 : k ? Math.pow(r, -beta) : ROT_STEM;
        this.am[k] = a; if (k < 8) s8 += a * a; sK += a * a;
        this.dsh[k] = k ? Math.max(0.5, 3 * Math.pow((k + 1) / 8, 1.5)) : 0;
        this.mu[k] = k ? (k + 1) * B.mu / this.life : 1 / this.life;
        // level 3: the modes alternate between the sides at equal power (1.31/0.53), the softer side a quarter period
        // late; the stem and mode 2 (it carries the stem's share) on both, in quadrature (two coherent channels sum
        // louder off centre in the voice's panner)
        if (this.rich) { const mid = k < 2, left = k % 2 === 0; this.oL[k] = mid ? 1 : left ? 1.31 : 0.53; this.oR[k] = mid ? 1 : left ? 0.53 : 1.31; this.sd[k] = mid || left ? 0 : 1; }
        else { this.oL[k] = 1; this.oR[k] = 0; this.sd[k] = 0; }
        this.ls[k] = Math.round(SR / (4 * f * r));
      }
      const nrm = sK > 0 ? vel * Math.sqrt(s8 / sK) : 0;   // (level 3's four more modes take their share of the same strike)
      for (let k = 0; k < K; k++) { this.am[k] *= nrm; this.Pw[k] = this.am[k] * this.am[k]; }
      this.am[1] += ROT_S2 * this.am[0];
      this.coef();
      // the mallet: 3 ms of noise through a low-pass that opens with Schlägel and the hit
      this.mz = Math.round(0.003 * SR); this.mi = 0; this.mx = (this.rng.next() * 65536) | 0;
      this.mc = 1 - Math.exp(-2 * Math.PI * Math.min(0.45 * SR, B.nlp[0] * Math.pow(B.nlp[1] / B.nlp[0], p.schlaegel * (0.4 + 0.6 * vel))) / SR);
      this.mg = ROT_NZ * B.nl * vel * (0.4 + 0.6 * p.schlaegel);
    }
    // the rotations (per block when the pitch moved: Bebung, vibrato) and the crackle's decay (cyc periods, 1.5–25 ms;
    // the stem's – it only crackles as it dries – a third of that: dry, short)
    coef() {
      const f = this.fq = this.f, B = this.B, K = this.K;
      for (let k = 0; k < K; k++) {
        const fk = f * this.fr[k], w = 2 * Math.PI * Math.min(fk, 0.49 * SR) / SR;
        this.rc[k] = Math.cos(w); this.rs[k] = Math.sin(w);
        this.rho[k] = Math.exp(-1 / (Math.max(0.0015, Math.min(0.025, (k ? B.cyc : B.cyc / 3) / fk)) * SR));
      }
    }
    // one step of the ODE over n samples (exact per block: each mode's losses as one exponential, the shares by rate),
    // the crackle's rates and depths, and this block's events
    tick(n, K) {
      const p = this.p, dt = n / SR, t = (this.tt += dt), u = Math.min(1.5, t / this.life), sc = this.sc;
      const gx = t * sc / ROT_TG, gro = gx * gx / (1 + gx * gx);   // the fungus grows into the strike (slowly at first: the strike rings clear)
      const D = p.pilz * ROT_DSC * sc * this.mo * gro, eta = 0.4 + 0.45 * p.schwellen;
      const dry = ROT_DRY * Math.pow(u, ROT_DP) / this.life, kn = 40 * p.knistern, ed = ROT_EPS * (0.3 + 0.7 * this.wet) * dry;   // the drying (1/s) and its crackling share
      const isc = 1 / sc;   // (a compost run faster crackles denser, not in bigger pieces: the depth as at its own pace)
      const Pw = this.Pw, lam = this.lam, cd = this.cd;
      let inflow = 0, sum = 0;
      for (let k = 1; k < K; k++) {
        const P = Pw[k];
        if (P <= 0) { lam[k] = 0; continue; }
        const dk = D * this.dsh[k], tot = this.mu[k] + dk + dry, f = Math.exp(-tot * dt), lost = P * (1 - f), cr = (1 - eta) * dk + ed;
        inflow += eta * lost * dk / tot;
        lam[k] = Math.min(20, kn * cr); cd[k] = Math.min(ROT_CMAX, ROT_C * Math.sqrt(cr * isc));
        const q = P * f; Pw[k] = q < 1e-11 ? 0 : q; sum += Pw[k];   // (below −110 dB a mode is gone)
      }
      // the stem: its own ring and the drying; fed from above until it nears its cap (a loud swell stays under the strike)
      const P1 = Pw[0], q1 = P1 * Math.exp(-(this.mu[0] + dry) * dt) + inflow * Math.max(0, 1 - (P1 / ROT_CAP) * (P1 / ROT_CAP));
      Pw[0] = q1 < 1e-11 ? 0 : q1; sum += Pw[0];
      lam[0] = Math.min(20, kn * ed); cd[0] = Math.min(ROT_CMAX, ROT_C * Math.sqrt(ed * isc));
      for (let k = K; k < this.K; k++) { Pw[k] = 0; this.am[k] = 0; }   // (after underruns the modes above six are gone for good)
      this.sumP = sum;
      // crackle: Poisson (≤ 20/s: one chance per block), at a random sample of it; one grain at a time per mode; the
      // kick normalised so the grain leaves |G| ≈ depth × size (uniform noise: variance ⅓ per sample)
      const rk = this.rk;
      for (let k = 0; k < K; k++) {
        if (!(lam[k] > 0) || rk.next() >= lam[k] * dt || this.gn[k] > 0 || sum < ROT_END) continue;   // (none once all is below −60 dB)
        const len = Math.round((0.002 + 0.006 * rk.next()) * SR), sz = 0.25 + 0.75 * Math.pow(rk.next(), 2), kick = cd[k] * sz / Math.sqrt(len / 3);
        this.gw[k] = (rk.next() * n) | 0; this.gn[k] = len; this.nx[k] = (rk.next() * 65536) | 0; this.cOn[k] = 1; this.nev++;
        if (this.rich) { const ph = rk.next() * 0.5 * Math.PI; this.kL[k] = kick * Math.SQRT2 * Math.cos(ph); this.kR[k] = kick * Math.SQRT2 * Math.sin(ph); }   // (each grain somewhere between the sides)
        else this.kL[k] = kick;
      }
    }
    render(L, R, a, b) {
      const n = b - a, two = !!(this.rich && R), K = this.lite && this.K > 6 ? 6 : this.K;   // (after underruns: six modes)
      if (this.f !== this.fq) this.coef();
      this.tick(n, K);
      for (let i = a; i < b; i++) L[i] = 0;
      if (two) for (let i = a; i < b; i++) R[i] = 0;
      const Pw = this.Pw, am = this.am, zr = this.zr, zi = this.zi, inv = 1 / n, sA = Math.sqrt(Pw[0]);
      let alive = 0;
      for (let k = 0; k < K; k++) {
        const tgt = Math.sqrt(Pw[k]) + (k === 1 ? ROT_S2 * sA : 0), a0 = am[k], crk = this.cOn[k];
        am[k] = tgt;
        if (a0 === 0 && tgt === 0 && !crk) continue;
        const c = this.rc[k], s = this.rs[k], dA = (tgt - a0) * inv, stem = k === 0;
        let xr = zr[k], xi = zi[k], A = a0;
        let gr = this.gLr[k], gi = this.gLi[k], hr = this.gRr[k], hi = this.gRi[k], gw = this.gw[k], gn = this.gn[k], nx = this.nx[k];
        const kl = this.kL[k], kr = this.kR[k], rho = crk ? this.rho[k] : 1;
        if (!two) {
          if (stem) {   // the fundamental through the stem's shaper (and its crackle with it), offset blocked
            let dx = this.dxL, dy = this.dyL;
            for (let i = a; i < b; i++) {
              const r = xr * c - xi * s; xi = xr * s + xi * c; xr = r; A += dA;
              if (crk) { if (gw > 0) gw--; else if (gn > 0) { gr += kl * NOISE[nx]; gi += kl * NOISE[(nx + 21841) & 65535]; nx = (nx + 1) & 65535; gn--; } gr *= rho; gi *= rho; }
              const yv = tanh(ROT_SG * A * (xi * (1 + gr) + xr * gi) + ROT_SB) - ROT_SN, d = yv - dx + ROT_DC * dy; dx = yv; dy = d;
              L[i] += ROT_SK * d;
            }
            this.dxL = dx; this.dyL = flush(dy);
          } else if (!crk) {
            for (let i = a; i < b; i++) { const r = xr * c - xi * s; xi = xr * s + xi * c; xr = r; A += dA; L[i] += A * xi; }
          } else {
            for (let i = a; i < b; i++) {
              const r = xr * c - xi * s; xi = xr * s + xi * c; xr = r; A += dA;
              if (gw > 0) gw--; else if (gn > 0) { gr += kl * NOISE[nx]; gi += kl * NOISE[(nx + 21841) & 65535]; nx = (nx + 1) & 65535; gn--; }
              gr *= rho; gi *= rho;
              L[i] += A * (xi * (1 + gr) + xr * gi);
            }
          }
        } else {
          // level 3: 'now' = Im z, 'late' = −Re z (a quarter period later; silent until its first zero crossing)
          const sd = this.sd[k], wLn = sd ? 0 : this.oL[k], wLl = sd ? this.oL[k] : 0, wRn = sd ? this.oR[k] : 0, wRl = sd ? 0 : this.oR[k];
          let ls = this.ls[k], dx = this.dxL, dy = this.dyL, ex = this.dxR, ey = this.dyR;
          for (let i = a; i < b; i++) {
            const r = xr * c - xi * s; xi = xr * s + xi * c; xr = r; A += dA;
            if (crk) {
              if (gw > 0) gw--;
              else if (gn > 0) { gr += kl * NOISE[nx]; gi += kl * NOISE[(nx + 21841) & 65535]; hr += kr * NOISE[(nx + 43691) & 65535]; hi += kr * NOISE[(nx + 9973) & 65535]; nx = (nx + 1) & 65535; gn--; }
              gr *= rho; gi *= rho; hr *= rho; hi *= rho;
            }
            const late = ls > 0 ? (ls--, 0) : -xr;
            if (stem) {
              const yl = tanh(ROT_SG * A * (xi + xi * gr + xr * gi) + ROT_SB) - ROT_SN, yr = ls > 0 ? 0 : tanh(ROT_SG * A * (late + xi * hr + xr * hi) + ROT_SB) - ROT_SN;
              const d = yl - dx + ROT_DC * dy; dx = yl; dy = d; const e = yr - ex + ROT_DC * ey; ex = yr; ey = e;
              L[i] += ROT_SK * d; R[i] += ROT_SK * e;
            } else {
              L[i] += A * (wLn * xi + wLl * late + xi * gr + xr * gi);
              R[i] += A * (wRn * xi + wRl * late + xi * hr + xr * hi);
            }
          }
          this.ls[k] = ls;
          if (stem) { this.dxL = dx; this.dyL = flush(dy); this.dxR = ex; this.dyR = flush(ey); }
        }
        const m2 = 1.5 - 0.5 * (xr * xr + xi * xi); zr[k] = xr * m2; zi[k] = xi * m2;   // (the phasor kept on the unit circle)
        if (crk) {
          const g2 = gr * gr + gi * gi + hr * hr + hi * hi;
          if (gn === 0 && (g2 < 1e-6 || A * A * g2 < 1e-13)) { this.cOn[k] = 0; gr = gi = hr = hi = 0; } else alive++;   // (a grain is over below −60 dB of its own or −130 dB absolute)
          this.gLr[k] = gr; this.gLi[k] = gi; this.gRr[k] = hr; this.gRi[k] = hi; this.gw[k] = gw; this.gn[k] = gn; this.nx[k] = nx;
        }
      }
      // the mallet (and 1 ms for its low-pass to settle)
      if (this.mi < this.mz + 48) {
        const mz = this.mz, mc = this.mc, mg = this.mg;
        let mi = this.mi, ml = this.ml, mr = this.mr, mx = this.mx;
        for (let i = a; i < b && mi < mz + 48; i++, mi++) {
          const w = mi < mz ? Math.sin(Math.PI * mi / mz) : 0, e = mg * w * w;
          ml += mc * (e * NOISE[mx] - ml); L[i] += ml;
          if (two) { mr += mc * (e * NOISE[(mx + 30011) & 65535] - mr); R[i] += mr; }
          mx = (mx + 1) & 65535;
        }
        this.mi = mi; this.ml = ml; this.mr = mr; this.mx = mx;
      }
      // out: a stereo voice passes its panner at full gain, a mono one at −3 dB; a soft ceiling above ±0.8 (only stacked
      // grains on a loud hit reach it)
      const og = two ? ROT_OUT * Math.SQRT1_2 : ROT_OUT;
      for (let i = a; i < b; i++) { const o = L[i] * og; L[i] = o > 0.8 || o < -0.8 ? (o > 0 ? 0.8 + 0.2 * tanh(5 * o - 4) : -0.8 + 0.2 * tanh(5 * o + 4)) : o; }
      if (two) for (let i = a; i < b; i++) { const o = R[i] * og; R[i] = o > 0.8 || o < -0.8 ? (o > 0 ? 0.8 + 0.2 * tanh(5 * o - 4) : -0.8 + 0.2 * tanh(5 * o + 4)) : o; }
      else if (R) R.set(L.subarray(a, b), a);
      // the end: all modes below −60 dB and no grain ringing (or, at the latest, 1.6 × the Nachklang) – {done} at once
      // (the voice is freed 30 ms later: the 5-ms fade is over by then; a Puls lane's voices do not overlap a step
      // longer than they sound), the contract's own {done} follows once silent
      if (!this.fin && this.tt > 0.05 && ((this.sumP < ROT_END && !alive) || this.tt > 1.6 * this.life)) { this.fin = true; this.off = true; this.ramp(0); this.port.postMessage({ done: 1 }); }
    }
  }

