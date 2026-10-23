  // ---- Ranke: myzel-scan – scanned synthesis on a ring of masses (SPEC §3.6) ----
  // N masses on a ring, mass 0 clamped (standing waves: where and how wide the hammer hits is audible). The physics runs
  // in seconds, independent of pitch, and is stepped on a grid locked to the scan (kU steps per period on low notes,
  // one every nU periods on high ones, see sched) – so every stepping artefact lands on a harmonic of f. The scan
  // reads the ring through a 2N-point table, crossfading the previous and the current state across each interval.
  // Held = hammer, then a mirrored push and light taps keep the form moving (see step); no AGC: the gain is fixed.
  const SCAN_OUT = 0.7, RNK_HIT = 2, RNK_SWELL = 0.8, RNK_PUSH = 0.04, RNK_TAP = 0.5, RNK_TAPS = 3, RNK_WOBBLE = 0.3, RNK_DLAP = 3, RNK_DSYM = 13.8 / 0.6, RNK_UMAX = 400, RNK_THETA = 0.52;
  class Scan extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po;
      this.rich = !!po.rich; const N = this.N = this.rich ? 96 : 48;
      // x[N] = v[N] = 0 stand for the clamped mass 0 seen from mass N − 1 (the ring closes there)
      this.x = new Float64Array(N + 1); this.v = new Float64Array(N + 1); this.mi = new Float64Array(N); this.dm = new Float64Array(N);
      this.dv = new Float64Array(N); this.cp = new Float64Array(N + 1); this.den = new Float64Array(N + 1); this.dp = new Float64Array(N + 1); this.vo = new Float64Array(N + 1); this.dtK = 0;
      this.F = new Float64Array(N + 1); this.fz = new Float64Array(3); this.fi = -1;
      this.sl = 1; this.dmul = 1;
      this.pv = new Float32Array(2 * N + 2); this.dl = new Float32Array(2 * N + 2);
      this.p = { masse: 0.5, feder: 0.5, mitte: 0.3, daempfung: 0.4, hammer: 0.5, holz: 0.3 };
      this.rng = new PRNG(po.seed || 7);
      this.rnd = new Float64Array(2 * N); for (let i = 0; i < 2 * N; i++) this.rnd[i] = this.rng.next() * 2 - 1;
      if (po.prm) this.set(po.prm);
      this.tempo = 1; this.drive = 0; this.dmul = 1; this.g = 1; this.gain = this.rich ? SCAN_OUT * Math.SQRT1_2 : SCAN_OUT;   // (stereo: √½, see Blow)
      this.reset(); this.coef();
    }
    reset() {
      this.x.fill(0); this.v.fill(0); this.pv.fill(0); this.dl.fill(0); this.F.fill(0); this.fz.fill(0); this.fi = -1;
      this.ph = 0; this.cyc = 0; this.sg = 0; this.nU = 1; this.kU = 1; this.dcx = this.dcy = this.dcx2 = this.dcy2 = 0; this.l1 = this.l2 = this.r1 = this.r2 = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; if (this.mi) this.coef(); }
    // physical constants from the six knobs, all in seconds: the ring's slowest mode R1 (Feder), the centring rate (Mitte),
    // the decay T60 0.3–8 s (Dämpfung, Höhe blends it), the mass (Masse, ×¼…×4) with Holz's per-mass irregularity
    coef() {
      const p = this.p, N = this.N, rnd = this.rnd;
      const R1 = 0.25 * Math.pow(2, 7 * p.feder), m = Math.pow(4, 2 * (p.masse - 0.5));
      this.ks = Math.pow(Math.PI * R1 / Math.sin(Math.PI / (2 * N)), 2);
      const rc = 12 * Math.pow(p.mitte, 1.5); this.kc = Math.pow(2 * Math.PI * rc, 2);
      const t60 = 8 * Math.pow(0.3 / 8, p.daempfung) * (1 / (0.6 + 0.8 * (1 - this.y)));
      const d = 13.8 / t60;
      // Holz: uneven masses and losses – mirrored about the middle, so the ring stays symmetric and the mirrored push
      // keeps to the even modes (an uneven ring couples them back: a wobble of ≈ 1 ct at 55–82 Hz, measured)
      for (let i = 0; i < N; i++) { const j = Math.min(i, N - i); this.mi[i] = 1 / (m * (1 + 0.1 * p.holz * rnd[j])); this.dm[i] = d * (1 + 0.3 * p.holz * rnd[N + j]); }
      this.mi[0] = 0;
      this.dlap = RNK_DLAP;   // extra loss of the short modes (Laplacian damping): a hit rounds off within ≈ 0.5 s
      this.yC = this.y; this.damp();
      // the held push spreads like the hammer: wide and round low on the field, one sharp corner at the top
      const wp = Math.max(0, Math.round((5 - 5 * this.y) * N / 48)), pw = this.pw = new Float64Array(wp + 1); let sw = 0;
      for (let j = 0; j <= wp; j++) { pw[j] = 0.5 + 0.5 * Math.cos(Math.PI * j / (wp + 1)); sw += j ? 2 * pw[j] : pw[j]; }
      for (let j = 0; j <= wp; j++) pw[j] /= sw;
    }
    // (the losses are meant in real time: divided by the bass slow-down sl, which slows the modes, not the decay)
    damp() { for (let i = 0; i < this.N; i++) this.dv[i] = (this.dm[i] * this.dmul + 2 * this.dlap + 0.5 * RNK_DSYM) / this.sl; this.dtK = 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      this.gate = m.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      if (m.seed) { this.rng = new PRNG(m.seed); for (let i = 0; i < 2 * this.N; i++) this.rnd[i] = this.rng.next() * 2 - 1; }
      // a Puls hit runs the ring faster so it disperses inside short gates – up to 3× from 440 Hz up; bass notes less
      // (their modes would breathe at rates near f: half-harmonic sidebands, an octave-down growl)
      this.tempo = this.burst ? 1 + 2 * Math.min(1, this.f / 440) : 1; this.dmul = 1;   // (coef() below refreshes the damping)
      this.drive = this.burst ? 0 : (0.5 + this.p.hammer) * this.vel; this.dr = 0; this.tap = 0.3;
      this.y = m.y != null ? m.y : this.y; this.coef();
      this.hit(RNK_HIT, Math.round(this.N / 3));
      this.snap(true);
      this.ph = 0; this.cyc = 0; this.sg = 0; this.sched(this.f);
    }
    stop() { this.drive = 0; this.dmul = 3; this.damp(); }   // let go: no push, more loss (and the fade in step)
    extra(m) { if (m.hammer && this.act && !this.off) { this.hit(RNK_HIT * Math.min(1, m.hammer), Math.round(this.N * (0.25 + 0.5 * this.rng.next()))); } }   // a shake: one more hammer, anywhere
    // the hammer: a dent and a push around position c, width 12 − 9·y masses (at 48), harder = more peaked; the gain
    // is fixed (no AGC)
    hit(amp, c) {
      const N = this.N, x = this.x, v = this.v, w = Math.max(3, (12 - 9 * this.y) * N / 48), ex = 1 + 3 * this.p.hammer;
      amp *= Math.sqrt(7.5 * N / 48 / w);   // the same energy at every width: narrow is brighter, not quieter
      // a hard hammer leaves more of a dent (displacement: every mode at once, bright and spiky), a soft one more of a
      // push (velocity: the dent grows while it spreads, rounder, 6–7 dB less crest)
      const hx = 0.3 + 0.4 * this.p.hammer, hv = 40 * (1 - 0.5 * this.p.hammer);
      for (let i = 1; i < N; i++) {
        let d = i - c; if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
        if (d > -w && d < w) { const k = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * d / w), ex) * amp; x[i] += k * hx; v[i] += k * hv; }
      }
    }
    // the scan table: the ring at 2N points – the masses and cubic midpoints between them, (9(b + c) − (a + d))/16 –
    // read linearly per sample (cheaper than a cubic per sample, same images); padded by two for the wrap. The update
    // crossfades: pv = the previous table, dl = new − previous; first: no crossfade
    snap(first) {
      const N = this.N, x = this.x, pv = this.pv, dl = this.dl, M = 2 * N;
      for (let i = 0; i < N; i++) {
        const a = x[i === 0 ? N - 1 : i - 1], b = x[i], c = x[i + 1 < N ? i + 1 : 0], d = x[i + 2 < N ? i + 2 : i + 2 - N], m = 0.5625 * (b + c) - 0.0625 * (a + d), j = 2 * i;
        if (first) { pv[j] = b; dl[j] = 0; pv[j + 1] = m; dl[j + 1] = 0; }
        else { let nv = pv[j] + dl[j]; pv[j] = nv; dl[j] = b - nv; nv = pv[j + 1] + dl[j + 1]; pv[j + 1] = nv; dl[j + 1] = m - nv; }
      }
      pv[M] = pv[0]; dl[M] = dl[0]; pv[M + 1] = pv[1]; dl[M + 1] = dl[1];
    }
    // the update grid for this pitch: at least 110 Hz (Puls: 330, the ring runs three times faster) – kU updates per
    // period on low notes, so fast modes are not sampled below their rate –, at most 400 Hz (Puls 1200) – one update
    // every nU periods on high ones. Always a whole ratio to f: every artefact of the stepping lands on a harmonic.
    sched(f) {
      const lo = this.burst ? 700 : 220, hi = this.burst ? 1200 : RNK_UMAX;
      const kU = f < lo ? Math.ceil(lo / f) : 1, nU = f > hi ? Math.ceil(f / hi) : 1;
      const sl = f < 110 ? Math.pow(f / 110, 0.8) : 1;   // below 110 Hz the ring moves slower (see step)
      if (sl !== this.sl) { this.sl = sl; this.damp(); }
      if (kU === this.kU && nU === this.nU) return false;
      this.kU = kU; this.nU = nU; return true;
    }
    // one update: simulate nU/(kU·f)·tempo seconds in one θ-step (θ = RNK_THETA, a little past Crank–Nicolson) –
    // unconditionally stable, so no substeps however stiff the ring (96 masses at level 3 would need 4–8 explicit ones);
    // the price is a tridiagonal solve (Thomas, factors cached while dt holds). Past ½ the fastest modes lose a third
    // per step instead of flipping sign every update (Crank–Nicolson's limit: a growl at f/2, measured in Puls hits at
    // 110 Hz); the slow modes, the ones that breathe, keep their decay. Below 110 Hz the ring moves slower (its fast modes would otherwise breathe at rates near f:
    // sidebands between the harmonics, and a pitch that wanders by a few cents)
    step() {
      if (this.yC !== this.y && Math.abs(this.yC - this.y) > 0.01) this.coef();   // Höhe moved: damping, finger width
      const N = this.N, x = this.x, v = this.v, mi = this.mi, dv = this.dv, F = this.F, cp = this.cp, den = this.den, dp = this.dp, vo = this.vo;
      const T = this.nU / (this.kU * this.f) * this.tempo * this.sl;
      const th = RNK_THETA, ks = this.ks, k0 = 2 * ks + this.kc, ds = RNK_DSYM * 0.5 / this.sl, dl = this.dlap / this.sl;
      const q = th * th * T * T, h = th * T, gm = -(q * ks + h * dl), qr = th * (1 - th) * T * T, hr = (1 - th) * T, gr = -(qr * ks + hr * dl);
      if (this.dtK !== T) {   // A = I + M⁻¹(θ²T²·K + θT·C): factor once per dt
        this.dtK = T; let c = 0;
        for (let i = 1; i < N; i++) { const ai = mi[i] * gm, d = 1 + mi[i] * (q * k0 + h * dv[i]) - ai * c; den[i] = 1 / d; c = cp[i] = ai / d; }
      }
      // held: a steady push near the hammer holds a form (the tone keeps its pitch line), spread like the hammer; its
      // strength wanders around 4 Hz by ±60 %, and a second push further round wakes more of the slow modes. Both push
      // in mirrored pairs (+F at c, −F at N − c): that moves only the even modes, whose scans are pure sine-phase
      // harmonics – the harmonics breathe in level only. Anything else mixes modes of different phase into one
      // harmonic, i.e. a pitch wobble (measured 5–13 ct at 55–110 Hz with a single or a wandering push point)
      if (this.drive > 0) {   // (the push comes in over ≈ RNK_SWELL s: first the hit rings)
        this.dr += (1 - this.dr) * (1 - Math.exp(-this.nU / (this.kU * this.f * RNK_SWELL)));
        const fz = this.fz, k = 1 - Math.exp(-2 * Math.PI * 4 * T), nk = 1.73 / Math.sqrt(k / (2 - k)), Ft = this.ks * this.drive * this.dr * RNK_PUSH;
        const c0 = Math.round(0.27 * N), c1 = Math.round(0.42 * N), pw = this.pw, wp = pw.length - 1;   // (not ⅓: a mirrored pair there cancels every third harmonic)
        for (let j = 0; j < 2; j++) fz[j] += k * ((this.rng.next() * 2 - 1) - fz[j]);
        const f0 = Ft * (1 + RNK_WOBBLE * Math.max(-1.5, Math.min(1.5, fz[0] * nk))), f1 = 0.5 * Ft * RNK_WOBBLE * Math.max(-2, Math.min(2, fz[1] * nk));
        F.fill(0);
        for (let j = -wp; j <= wp; j++) { const w = f0 * pw[j < 0 ? -j : j]; F[c0 + j] = w; F[N - c0 - j] = -w; }
        F[c1] = f1; F[N - c1] = -f1; this.fi = 1;
        // stroking: light taps at random (≈ 3 per second), as wide as the hammer – Höhe keeps shaping the held tone
        if ((this.tap -= this.nU / (this.kU * this.f)) <= 0) {
          this.tap = -Math.log(1 - 0.95 * this.rng.next()) / RNK_TAPS;
          const a = this.drive * this.dr * RNK_TAP * (0.4 + 1.2 * this.y) * (0.5 + this.rng.next());   // higher = harder strokes
          this.hit(a, c0); this.hit(-a, N - c0);
        }
      } else if (this.fi >= 0) { F.fill(0); this.fi = -1; }
      // springs to both neighbours, centring, damping (own + the short modes' + the symmetric part, see RNK_DSYM – its
      // mirrored half explicit): right side, forward sweep, back substitution, then x by the trapezoid
      let pd = 0;
      for (let i = 1; i < N; i++) {
        const vi = v[i], mt = mi[i];
        const r = vi - mt * ((qr * k0 + hr * dv[i]) * vi + gr * (v[i - 1] + v[i + 1])) + T * mt * (ks * (x[i - 1] + x[i + 1]) - k0 * x[i] + F[i] - ds * v[N - i]);
        vo[i] = vi; pd = dp[i] = (r - mt * gm * pd) * den[i];
      }
      let vn = 0, big = 0;
      for (let i = N - 1; i >= 1; i--) { vn = v[i] = dp[i] - cp[i] * vn; const xi = x[i] + hr * vo[i] + h * vn; x[i] = xi; if (xi > big) big = xi; else if (-xi > big) big = -xi; }
      if (big > 3) for (let i = 1; i < N; i++) if (x[i] > 3 || x[i] < -3) x[i] = 4 * tanh(x[i] / 4);   // soft limit ±4
      // after the end the hand stops the ring: form and motion fade (T60 0.6 s) – more damping alone would not do it,
      // a slack ring (Feder and Mitte low) is then overdamped and creeps back over seconds, still sounding
      if (this.off) { const k = Math.exp(-23 * this.nU / (this.kU * this.f)); for (let i = 1; i < N; i++) { x[i] *= k; v[i] *= k; } }
      for (let i = 1; i < N; i++) { x[i] = flush(x[i]); v[i] = flush(v[i]); }
      this.snap(false);
    }
    render(L, R, a, b) {
      const f = this.f, M = 2 * this.N, pv = this.pv, dl = this.dl, two = !!R && !this.lite;
      if (this.burst && !this.off) { if (this.gate <= b - a) { this.gate = 0; this.off = true; this.stop(); } else this.gate -= b - a; }
      const inc = f / SR;
      let ph = this.ph, cyc = this.cyc, nU = this.nU, kU = this.kU, sg = this.sg;
      const fc = Math.min((5 + 11 * this.y) * f, 0.4 * SR), lc = 1 - Math.exp(-2 * Math.PI * fc / SR), dcR = 1 - 2 * Math.PI * 20 / SR, g = this.gain;
      let dcx = this.dcx, dcy = this.dcy, l1 = this.l1, l2 = this.l2, dcx2 = this.dcx2, dcy2 = this.dcy2, r1 = this.r1, r2 = this.r2;
      // in runs between update points (kU per period, or one every nU periods): the inner loops carry no branch and no
      // call; the crossfade al goes 0 → 1 across each update interval
      let i = a;
      while (i < b) {
        let e;
        const pb = (sg + 1) / kU;   // the next update point (in scan phase; 1 = the wrap)
        if (ph + inc >= pb) {   // this sample crosses it: update first, then it renders with the new state
          ph += inc;
          const wrap = ph >= 1;
          if (wrap) ph -= 1;
          sg = wrap ? 0 : sg + 1;
          if (kU > 1 || (wrap && ++cyc >= nU)) { cyc = 0; this.step(); }
          if (wrap && this.sched(f)) { nU = this.nU; kU = this.kU; cyc = 0; }   // the grid changes only at a wrap
          ph -= inc; e = i + 1;
        } else { e = i + Math.floor((pb - ph) / inc); if (e > b) e = b; }   // (the table's padding covers rounding)
        const cm = kU > 1 ? kU : 1 / nU, c0 = kU > 1 ? -sg : cyc / nU, ci = inc * cm;
        let al = c0 + ph * cm;
        if (!two) {
          for (; i < e; i++) {
            ph += inc; al += ci;
            const u = ph * M, k = u | 0, a0 = pv[k] + al * dl[k];
            const o = a0 + (u - k) * (pv[k + 1] + al * dl[k + 1] - a0);
            const d = o - dcx + dcR * dcy; dcx = o; dcy = d;
            l1 += lc * (d - l1); l2 += lc * (l1 - l2);
            L[i] = l2 * g;
          }
        } else {
          for (; i < e; i++) {
            ph += inc; al += ci;
            const u = ph * M, k = u | 0, a0 = pv[k] + al * dl[k];
            const o = a0 + (u - k) * (pv[k + 1] + al * dl[k + 1] - a0);
            const d = o - dcx + dcR * dcy; dcx = o; dcy = d;
            l1 += lc * (d - l1); l2 += lc * (l1 - l2);
            L[i] = l2 * g;
            let u2 = u + M * 0.5; if (u2 >= M) u2 -= M;   // second head half a ring away
            const k2 = u2 | 0, b0 = pv[k2] + al * dl[k2];
            const o2 = b0 + (u2 - k2) * (pv[k2 + 1] + al * dl[k2 + 1] - b0);
            const d2 = o2 - dcx2 + dcR * dcy2; dcx2 = o2; dcy2 = d2;
            r1 += lc * (d2 - r1); r2 += lc * (r1 - r2);
            R[i] = r2 * g;
          }
        }
      }
      // soft clip above ±0.8 (the ring is bounded, the gain fixed: rare – only stacked shake hammers get there)
      for (let j = a; j < b; j++) { const o = L[j]; if (o > 0.8 || o < -0.8) L[j] = o > 0 ? 0.8 + 0.2 * tanh(5 * o - 4) : -0.8 + 0.2 * tanh(5 * o + 4); }
      if (two) for (let j = a; j < b; j++) { const o = R[j]; if (o > 0.8 || o < -0.8) R[j] = o > 0 ? 0.8 + 0.2 * tanh(5 * o - 4) : -0.8 + 0.2 * tanh(5 * o + 4); }
      else if (R) R.set(L.subarray(a, b), a);
      this.ph = ph; this.cyc = cyc; this.sg = sg;
      this.dcx = dcx; this.dcy = flush(dcy); this.l1 = flush(l1); this.l2 = flush(l2); this.dcx2 = dcx2; this.dcy2 = flush(dcy2); this.r1 = flush(r1); this.r2 = flush(r2);
    }
  }

