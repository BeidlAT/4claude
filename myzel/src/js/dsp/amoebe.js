  // ---- Amöbe: myzel-gendy – Xenakis' GENDY with Gendy3's pitch lock, Höhe = unrest (SPEC §3.5) ----
  // The wave is a closed polygon of K points (amplitude, duration), the first pinned to 0. Every period each point takes
  // a random step and is pulled back toward the note's seed polygon (Rückkehr, amplitudes and durations alike), mirrored
  // at the edges; the durations are then renormalised to the period (Gendy3) – the pitch stands, the shape crawls.
  // Höhe is the unrest: the amplitude step a = 0.01·60^y of the seed's size (SPEC's 30^y left the top a tone with a
  // little noise, −12 dB between the harmonics; KONZEPT's top is a raw noise with a pitch: 60^y gives −7 dB), and the
  // durations' step 0.3·Zeit scaled the same way (with Zeit alone the low end was never calm: the change from period
  // to period 9 % at y 0 – now 1 %). The steps come from tables (no Math.tan per draw: SPEC measured that alone at 0.66
  // units). Per period: at most one point per AMO_SEG samples (fewer samples per segment alias: the polygon would have
  // no shape left), no segment under two samples, the gain that brings the polygon's AC level to AMO_TGT (slewed ±6 dB
  // a period – the random polygon's level wanders by ±10 dB, measured; its peak capped), its corners band-limited
  // (polyBLAMP). Then a DC blocker (15 Hz) and a one-pole low-pass that opens with the unrest: SPEC's min(8f, 0.4·SR)
  // at y 0, four octaves higher at the top (at 8f the top's noise stayed a muffled rumble under 1 kHz). Level 3: two
  // amoebas, left and right ±3 ct with their own seeds, the right one Gendy2 (its steps random-walk: smoother, further),
  // both at twice the rate and decimated by a half-band filter (folding −10 dB less again).
  const AMO_TGT = 0.25, AMO_SEG = 6, AMO_MAXK = 24, AMO_G2 = 0.6, AMO_BLAMP = 1, AMO_RAND = 0.4, AMO_RANDB = 0.8, AMO_ZA = 0.15, AMO_ZD = 0.06, AMO_ZS = 0.4, AMO_EDGE = 0.2, AMO_DMIN = 0.05, AMO_AR = 60, AMO_LPY = 4, AMO_PK = 0.9, AMO_SMIN = 2 / 48000;
  const AMO_TN = 1024, AMO_CG = 0.015, AMO_CM = 3, AMO_TC = Math.atan(AMO_CM / AMO_CG), AMO_ZL = 0.998;
  // inverse CDFs. Ausreißer (Cauchy): γ·tan(π(u − ½)), γ = 0.015, clipped at ±3 – mostly still, now and then a point
  // jumps up to three times the uniform's widest step (≈ 0.2 such jumps a period): the crackle that heals. SC's
  // normalised Cauchy (tan(c·x)/tan(c), c = atan(10·s)) is bounded at the uniform's width, its outliers came every
  // period (24 draws) and drowned – measured: the per-period change's crest 3.1 vs 2.9 linear. Logistic: SC's
  // normalised form at full shape, atanh(0.998·x)/atanh(0.998), its RMS brought to the uniform's (AMO_NL)
  const AMO_TAN = new Float32Array(AMO_TN + 2), AMO_ATH = new Float32Array(AMO_TN + 2), AMO_NL = new Float32Array(66);
  for (let i = 0; i < AMO_TN + 2; i++) { const q = Math.min(i, AMO_TN) / AMO_TN; AMO_TAN[i] = AMO_CG * Math.tan(q * AMO_TC); AMO_ATH[i] = Math.atanh(q * AMO_ZL); }
  for (let j = 0; j < 66; j++) { const z = AMO_ZL * Math.max(0.01, Math.min(1, j / 64)), top = Math.atanh(z); let e = 0; for (let k = 0; k < 256; k++) { const v = Math.atanh(z * (k + 0.5) / 256) / top; e += v * v; } AMO_NL[j] = Math.sqrt(256 / 3 / e); }
  const AMO_CI = 0.5 * Math.PI / AMO_TC * AMO_TN, AMO_LM = AMO_NL[64] / Math.atanh(AMO_ZL);   // (table index per |x|; the logistic's scale)
  // the half-band decimator of level 3 (47 taps, Kaiser β 8: −80 dB from 29 kHz at 96 kHz – what folds lands above 18.7 kHz)
  const AMO_HJ = 12, AMO_HB = new Float64Array(AMO_HJ);
  {
    const I0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    const M = 2 * AMO_HJ - 1; let sum = 0.5;
    for (let j = 0; j < AMO_HJ; j++) { const k = 2 * j + 1, r = k / (M + 1); AMO_HB[j] = Math.sin(Math.PI * k / 2) / (Math.PI * k) * I0(8 * Math.sqrt(1 - r * r)) / I0(8); sum += 2 * AMO_HB[j]; }
    for (let j = 0; j < AMO_HJ; j++) AMO_HB[j] *= 0.5 / (sum - 0.5);   // (DC gain 1)
  }
  const amoMir = (x, lo, hi) => { if (x >= lo && x <= hi) return x; const r = hi - lo; let u = (x - lo) % (2 * r); if (u < 0) u += 2 * r; return lo + (u > r ? 2 * r - u : u); };
  const AMO_DIST = { linear: 0, cauchy: 1, logist: 2, sinus: 3 };
  const amoSin = (u) => { const ph = u * 0.5, q = (ph - Math.floor(ph)) * 4096, i = q | 0; return SIN[i] + (q - i) * (SIN[i + 1] - SIN[i]); };   // sin(π·u)
  // one amoeba: its points (the walk), the seed polygon Rückkehr pulls toward, and the polygon it plays this period
  class Amoeba {
    constructor(two) {
      const N = AMO_MAXK + 2;
      this.two = two;   // Gendy2: the steps themselves random-walk (smoother, further)
      this.amp = new Float64Array(N); this.dur = new Float64Array(N); this.a0 = new Float64Array(N); this.d0 = new Float64Array(N); this.sa = new Float64Array(N); this.sd = new Float64Array(N);
      this.ys = new Float64Array(N); this.ss = new Float64Array(N); this.cum = new Float64Array(N);
      this.Kp = 12; this.K = 2; this.A = 0.6; this.ns = 1; this.T = 200; this.fq = 240; this.hw = null;   // (every field set here: one shape for the JIT)
      this.clear();
    }
    clear() { this.p = 0; this.i = 0; this.g = 0; this.yp = 0; this.x0 = 0; this.sl = 0; this.c0 = 0; this.c1 = 0; this.K = 0; this.dc1 = 0; this.dc2 = 0; this.lp = 0; this.n2 = 0; if (this.hw) this.hw.fill(0); }
  }
  class Gendy extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po;
      this.rich = !!po.rich;
      this.p = { punkte: 12, zeit: 0.15, verteilung: 'linear', rueck: 0.3, att: 0.02, rel: 0.3 };
      if (po.prm) this.set(po.prm);
      this.G = [new Amoeba(false)]; if (this.rich) this.G.push(new Amoeba(true));
      this.buf = new Float64Array(256);
      this.vel = 0.75; this.fs = 0; this.gr = 1; this.gk = 1; this.zN = 0; this.zA = 1; this.zD = 1; this.zF = 0; this.zG = 0;
      this.burst = false; this.gate = 0; this.rel = undefined; this.aS = 0.01; this.dS = 0; this.kr = 0.03; this.dist = 0; this.lvl = 1;
      this.reset();
    }
    reset() { for (const G of this.G) { G.clear(); this.seed(G); } this.fs = 0; }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'verteilung' ? String(p[k]) : +p[k] || 0; }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      this.gate = this.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      this.rel = m.rel;   // (a Puls hit's release; a held note's is the knob's at its end)
      this.gr = 1; this.gk = 1;
      const s0 = (m.seed | 0) || 0x1234567;
      // a fresh seed polygon for every note and every Puls hit (from its own seed): hard touches = a more extreme shape
      this.G.forEach((G, j) => { G.ns = (s0 ^ (j ? 0x5bd1e995 : 0)) | 0 || 1; G.Kp = this.kp(); this.seed(G); G.clear(); });
      // Zucken: 35 ms of a wild run (a×4, d×2 – and at least AMO_ZA, AMO_ZD: low on the field a×4 barely moved the polygon,
      // every hit the same blip), then normal – Rückkehr heals it. A touch gets a gentler one (its onset)
      this.zN = Math.round(0.035 * SR);
      if (this.burst) { this.zA = 4; this.zD = 2; this.zF = AMO_ZA; this.zG = AMO_ZD; } else { this.zA = 1 + 2 * this.vel; this.zD = 1 + this.vel; this.zF = this.zG = 0; }
      this.fs = 0;
    }
    stop(m) {
      // the processor fades too, so it falls silent and ends: τ = 0.8·Ausklingen (a slow lift stretches it) – with the
      // voice's own release, slowed to match (AMO_REL), the two together fall as Ausklingen says (τ = rel/5)
      const r = Math.max(0.01, (this.rel || this.p.rel) * (m && m.k ? m.k : 1));
      this.gk = Math.exp(-1 / (0.8 * r * SR));
    }
    // a shake's swing (Gestik): a burst of the form – 60 ms of a run as wild as the top of the field – that Rückkehr heals
    extra(m) { if (m.zuck && this.act && !this.off) { const s = Math.min(1, +m.zuck || 0); this.zN = Math.round(0.06 * SR); this.zA = 1 + 3 * s; this.zD = 1 + s; this.zF = AMO_ZS * s; this.zG = AMO_ZD * s; } }
    kp() { return Math.max(3, Math.min(AMO_MAXK, Math.round(this.p.punkte) || 12)); }
    // the seed polygon (where Rückkehr pulls): a saw drawn with K points – a ramp across the period and a steep edge
    // back through the pinned 0 – plus each note's own random share; hard touches = a more extreme form (a steeper edge,
    // more of the random share, jagged, the durations more uneven), soft ones rounder (the random share smoothed). The
    // saw is what makes it saw (the random polygon alone hums dull: h16 −33 dB) and holds a note's colour to its velocity
    // (a random polygon's centroid scatters 2× note to note, measured). Free of DC: the healed form carries none.
    seed(G) {
      const K = G.Kp, v = this.vel, A = G.A = 0.3 + 0.7 * v, a = G.amp, d = G.dur, a0 = G.a0, d0 = G.d0, sm = 0.35 * (1 - v), w = 0.3 + 0.6 * v, q = this.burst ? AMO_RANDB : AMO_RAND * (0.4 + 0.8 * v);
      let s = G.ns;
      const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
      a[0] = 0;
      for (let i = 1; i < K; i++) a[i] = 2 * rnd() - 1;
      for (let i = 0; i < K; i++) d0[i] = 1 - w * rnd();
      const eg = AMO_EDGE * (1 - 0.8 * v); if (K > 3) { d0[0] = Math.max(AMO_DMIN, eg * d0[0]); d0[K - 1] = Math.max(AMO_DMIN, eg * d0[K - 1]); }
      let sd = 0; for (let i = 0; i < K; i++) sd += d0[i];
      let t = d0[0];
      const t1 = t, tK = sd - d0[K - 1];
      for (let i = 1; i < K; i++) { const r = K > 3 ? -1 + 2 * (t - t1) / Math.max(1e-9, tK - t1) : 0; a0[i] = (1 - q) * r + q * (a[i] + sm * ((i > 1 ? a[i - 1] : 0) + (i < K - 1 ? a[i + 1] : 0))); t += d0[i]; }
      a0[0] = 0;
      let mean = 0; for (let i = 0; i < K; i++) mean += d0[i] * (a0[i] + (i + 1 < K ? a0[i + 1] : 0)) / 2;
      mean /= sd;
      const c = mean / Math.max(0.2, 1 - (d0[0] + d0[K - 1]) / (2 * sd));
      let mx = 1e-9; for (let i = 1; i < K; i++) { a0[i] -= c; mx = Math.max(mx, Math.abs(a0[i])); }
      for (let i = 1; i < K; i++) a0[i] *= A / mx;
      for (let i = 0; i < K; i++) { a[i] = a0[i]; d[i] = d0[i]; G.sa[i] = 0; G.sd[i] = 0; }
      G.ns = s;
    }
    // Punkte turned while a note sounds: one point more or less per period – a new one splits the longest segment (and
    // grows into the form: its seed point lies off the line), a merge drops the point closest to its neighbours' line
    regrow(G) {
      const K = G.Kp, a = G.amp, d = G.dur, a0 = G.a0, d0 = G.d0, sa = G.sa, sd = G.sd;
      if (K < this.kp()) {
        let j = 0; for (let i = 1; i < K; i++) if (d[i] > d[j]) j = i;
        for (let i = K; i > j + 1; i--) { a[i] = a[i - 1]; d[i] = d[i - 1]; a0[i] = a0[i - 1]; d0[i] = d0[i - 1]; sa[i] = sa[i - 1]; sd[i] = sd[i - 1]; }
        const n = j + 2 < K + 1 ? j + 2 : 0, an = n ? a[n] : 0, a0n = n ? a0[n] : 0;
        let s = G.ns; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; G.ns = s;
        a[j + 1] = (a[j] + an) / 2; a0[j + 1] = amoMir((a0[j] + a0n) / 2 + 0.5 * G.A * (s / 2147483648), -1, 1);
        d[j] /= 2; d[j + 1] = d[j]; d0[j] /= 2; d0[j + 1] = Math.max(AMO_DMIN, d0[j]); d0[j] = d0[j + 1]; sa[j + 1] = sd[j + 1] = 0;
        G.Kp = K + 1;
      } else {
        let j = 1, best = Infinity;
        for (let i = 1; i < K; i++) { const e = Math.abs(a[i] - (a[i - 1] + (i + 1 < K ? a[i + 1] : 0)) / 2); if (e < best) { best = e; j = i; } }
        d[j - 1] = Math.min(1, d[j - 1] + d[j]); d0[j - 1] = Math.min(1, d0[j - 1] + d0[j]);
        for (let i = j; i < K - 1; i++) { a[i] = a[i + 1]; d[i] = d[i + 1]; a0[i] = a0[i + 1]; d0[i] = d0[i + 1]; sa[i] = sa[i + 1]; sd[i] = sd[i + 1]; }
        G.Kp = K - 1;
      }
    }
    // one draw from the chosen distribution for x uniform in (−1, 1): linear x; Ausreißer and logistic by their tables
    dv(x) {
      const dist = this.dist;
      if (dist === 0) return x;
      const ax = x < 0 ? -x : x;
      let q, i, t;
      if (dist === 1) { q = ax * AMO_CI; if (q >= AMO_TN) t = AMO_CM; else { i = q | 0; t = AMO_TAN[i] + (q - i) * (AMO_TAN[i + 1] - AMO_TAN[i]); } }
      else { q = ax * AMO_TN; i = q | 0; t = (AMO_ATH[i] + (q - i) * (AMO_ATH[i + 1] - AMO_ATH[i])) * AMO_LM; }
      return x < 0 ? -t : t;
    }
    // a new period: every point takes its step, the durations are renormalised, the polygon played this period is the
    // walk's (or every k-th of its points where the period has too few samples), at the gain that holds its level
    period(G) {
      if (G.Kp !== this.kp()) this.regrow(G);
      const Kp = G.Kp, a = G.amp, d = G.dur, a0 = G.a0, d0 = G.d0, kr = this.kr, aS = this.aS * G.A, dS = this.dS, dist = this.dist, two = G.two;
      let s = G.ns;
      if (dist === 3) {
        // Sinus: no dice – each point is pushed by its neighbour's value of the period before through a sine (a ring of
        // coupled sine maps: still where Höhe is low, deterministic chaos above)
        const f1 = a[1], g1 = d[0], iA = 1 / G.A;
        for (let i = 1; i < Kp; i++) { const nb = i + 1 < Kp ? a[i + 1] : f1; a[i] = amoMir(a[i] + aS * amoSin(nb * iA) + kr * (a0[i] - a[i]), -1, 1); }
        for (let i = 0; i < Kp; i++) { const nb = i + 1 < Kp ? d[i + 1] : g1; d[i] = amoMir(d[i] + dS * amoSin(2 * nb - 1) + kr * (d0[i] - d[i]), AMO_DMIN, 1); }
      } else if (two) {
        const sa = G.sa, sd = G.sd;
        for (let i = 1; i < Kp; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; sa[i] = amoMir(sa[i] + this.dv(s / 2147483648), -1, 1); a[i] = amoMir(a[i] + AMO_G2 * aS * sa[i] + kr * (a0[i] - a[i]), -1, 1); }
        if (dS > 0) for (let i = 0; i < Kp; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; sd[i] = amoMir(sd[i] + this.dv(s / 2147483648), -1, 1); d[i] = amoMir(d[i] + AMO_G2 * dS * sd[i] + kr * (d0[i] - d[i]), AMO_DMIN, 1); }
        else for (let i = 0; i < Kp; i++) d[i] = amoMir(d[i] + kr * (d0[i] - d[i]), AMO_DMIN, 1);
      } else {
        for (let i = 1; i < Kp; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; a[i] = amoMir(a[i] + aS * this.dv(s / 2147483648) + kr * (a0[i] - a[i]), -1, 1); }
        if (dS > 0) for (let i = 0; i < Kp; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = amoMir(d[i] + dS * this.dv(s / 2147483648) + kr * (d0[i] - d[i]), AMO_DMIN, 1); }
        else for (let i = 0; i < Kp; i++) d[i] = amoMir(d[i] + kr * (d0[i] - d[i]), AMO_DMIN, 1);
      }
      G.ns = s;
      // the polygon of this period: K_eff points (≥ AMO_SEG samples per segment on average), every Kp/K-th of the walk's
      const K = Math.max(2, Math.min(Kp, Math.floor(G.T / AMO_SEG))), ys = G.ys, ss = G.ss, cum = G.cum;
      let sum = 0; for (let i = 0; i < Kp; i++) sum += d[i];
      // no segment shorter than AMO_SMIN (2 samples at 48 kHz; the shares squeezed toward equal): high notes with wild
      // durations would otherwise put corners closer than a sample
      const wm = Math.min(0.9 / K, AMO_SMIN * G.fq), is = (1 - K * wm) / sum;
      let c = 0, mean = 0, ms = 0, pk = 0;
      for (let j = 0; j < K; j++) {
        const i0 = K === Kp ? j : Math.floor(j * Kp / K), i1 = K === Kp ? j + 1 : Math.floor((j + 1) * Kp / K);
        let w = 0; for (let i = i0; i < i1; i++) w += d[i];
        w = wm + w * is; cum[j] = c; c += w;
        const q0 = a[i0], q1 = i1 < Kp ? a[i1] : 0;
        ys[j] = q0; ss[j] = w; if (q0 > pk) pk = q0; else if (-q0 > pk) pk = -q0;
        mean += w * (q0 + q1); ms += w * (q0 * q0 + q0 * q1 + q1 * q1);
      }
      cum[K] = 1; ys[K] = 0;
      mean *= 0.5; ms /= 3;
      const rms = Math.sqrt(Math.max(ms - mean * mean, 4e-4));
      // the level slewed (±6 dB a period), then never past AMO_PK (a polygon mostly on one side, or a thin one: its peak,
      // not its AC level, sets the gain)
      const gt = AMO_TGT * this.lvl / rms, g = Math.min(G.g > 0 ? Math.min(Math.max(gt, 0.5 * G.g), 2 * G.g) : gt, AMO_PK * this.lvl / Math.max(pk, 1e-3));
      G.g = g;
      for (let j = 0; j < K; j++) { const w = ss[j]; ss[j] = (ys[j + 1] - ys[j]) * g / w; ys[j] *= g; }
      G.K = K;
    }
    // the raw polygon at rate r (1 or 2), n samples into out from o (one sample late: a corner's polyBLAMP reaches back one)
    run(G, out, o, n, inc0, inc1) {
      let p = G.p, i = G.i, x0 = G.x0, sl = G.sl, c0 = G.c0, c1 = G.c1, yp = G.yp, inc = inc0;
      const dinc = (inc1 - inc0) / n, ys = G.ys, ss = G.ss, cum = G.cum, bl = AMO_BLAMP / 6;
      for (let k = 0; k < n; k++) {
        inc += dinc; p += inc;
        let corr = 0;
        while (p >= c1) {
          const s0 = sl;
          if (++i >= G.K) { p -= 1; i = 0; this.period(G); }
          x0 = ys[i]; sl = ss[i]; c0 = cum[i]; c1 = cum[i + 1];
          // the corner (slope change ds per sample) d samples ago: its band-limited residual on this sample and the one before
          const d = (p - c0) / inc, ds = (sl - s0) * inc * bl, e = 1 - d;
          yp += ds * d * d * d; corr += ds * e * e * e;
        }
        out[o + k] = yp; yp = x0 + (p - c0) * sl + corr;
      }
      G.p = p; G.i = i; G.x0 = x0; G.sl = sl; G.c0 = c0; G.c1 = c1; G.yp = yp;
    }
    render(L, R, a, b) {
      const p = this.p, n = b - a, G = this.G, two = G.length > 1 && !!R, os = two && !this.lite ? 2 : 1;
      // the walk's steps this block: Höhe's unrest (a share of the seed's size), Zeit, Rückkehr; Zucken multiplies them
      const ua = 0.01 * Math.pow(AMO_AR, Math.min(1, Math.max(0, this.y))), z = this.zN > 0;
      const dw = 0.3 * p.zeit * (ua / (0.01 * Math.sqrt(AMO_AR)));   // (Zeit's step at mid-height, scaled with the unrest)
      this.aS = z ? Math.max(ua * this.zA, this.zF) : ua; this.dS = z ? Math.max(dw * this.zD, this.zG) : dw; this.kr = 0.1 * p.rueck;
      if (z) this.zN -= n;
      this.dist = AMO_DIST[p.verteilung] || 0;
      // (a stereo voice passes the voice's panner at full gain, a mono one at −3 dB: each side √½)
      this.lvl = two ? Math.SQRT1_2 : 1;
      // pitch: 10 ms smoothing per block, the increment ramped across the block; level 3 ±3 ct
      const fT = Math.min(this.f, 0.45 * SR), k10 = 1 - Math.exp(-n / (0.01 * SR)), f0 = this.fs || fT;
      const f1 = this.fs = f0 + (fT - f0) * (this.fs ? k10 : 1);
      const lc = 1 - Math.exp(-2 * Math.PI * Math.min(8 * f1 * Math.pow(2, AMO_LPY * Math.min(1, Math.max(0, this.y))), 0.4 * SR) / SR), dcR = 1 - 2 * Math.PI * 15 / SR;
      if (this.buf.length < n) this.buf = new Float64Array(n);
      const buf = this.buf;
      for (let c = 0; c < (two ? 2 : 1); c++) {
        const g = G[c], det = two ? (c ? cents(3) : cents(-3)) : 1, out = c ? R : L;
        const i0 = det * f0 / (os * SR), i1 = det * f1 / (os * SR);
        g.T = os * SR / (det * f1); g.fq = det * f1;
        if (!g.K) { this.period(g); g.c1 = g.cum[1]; g.x0 = g.ys[0]; g.sl = g.ss[0]; }   // the first period
        if (os === 2) {   // at twice the rate behind the half-band's history (4J − 2 samples), then decimated
          const H = 4 * AMO_HJ - 2;
          if (!g.hw || g.hw.length < H + 2 * n) { const w = new Float64Array(H + 2 * n); if (g.hw) w.set(g.hw.subarray(g.n2, g.n2 + H)); g.hw = w; g.n2 = 0; }
          const hw = g.hw;
          if (g.n2) hw.copyWithin(0, g.n2, g.n2 + H);
          this.run(g, hw, H, 2 * n, i0, i1);
          g.n2 = 2 * n;
          const hb = AMO_HB, h0 = hb[0], h1 = hb[1], h2 = hb[2], h3 = hb[3], h4 = hb[4], h5 = hb[5], h6 = hb[6], h7 = hb[7], h8 = hb[8], h9 = hb[9], h10 = hb[10], h11 = hb[11];
          for (let m = 0, ce = 2 * AMO_HJ; m < n; m++, ce += 2) {
            buf[m] = 0.5 * hw[ce] + h0 * (hw[ce - 1] + hw[ce + 1]) + h1 * (hw[ce - 3] + hw[ce + 3]) + h2 * (hw[ce - 5] + hw[ce + 5]) + h3 * (hw[ce - 7] + hw[ce + 7])
              + h4 * (hw[ce - 9] + hw[ce + 9]) + h5 * (hw[ce - 11] + hw[ce + 11]) + h6 * (hw[ce - 13] + hw[ce + 13]) + h7 * (hw[ce - 15] + hw[ce + 15])
              + h8 * (hw[ce - 17] + hw[ce + 17]) + h9 * (hw[ce - 19] + hw[ce + 19]) + h10 * (hw[ce - 21] + hw[ce + 21]) + h11 * (hw[ce - 23] + hw[ce + 23]);
          }
        } else this.run(g, buf, 0, n, i0, i1);
        let d1 = g.dc1, d2 = g.dc2, lp = g.lp, gr = this.gr;
        const gk = this.gk;
        for (let k = 0; k < n; k++) {
          const x = buf[k], hp = x - d1 + dcR * d2; d1 = x; d2 = hp;
          lp += lc * (hp - lp);
          gr *= gk;
          const o = lp * gr;
          out[a + k] = o > 0.9 ? 0.9 + 0.1 * tanh(10 * (o - 0.9)) : o < -0.9 ? -0.9 - 0.1 * tanh(-10 * (o + 0.9)) : o;   // (a knee above 0.9: the period's mean jumping at the very top of the keyboard, measured 1.25)
        }
        g.dc1 = d1; g.dc2 = flush(d2); g.lp = flush(lp);
        if (c === (two ? 1 : 0)) this.gr = gr;
      }
      if (R && !two) for (let k = a; k < b; k++) R[k] = L[k];
      if (this.burst && !this.off) { if (this.gate <= n) { this.gate = 0; this.off = true; this.stop(null); } else this.gate -= n; }
    }
  }

