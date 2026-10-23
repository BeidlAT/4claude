  // ---- Gespinst: myzel-web – one web of sympathetic strings on a shared bridge, for every voice (SPEC §3.11) ----
  // N Karplus-Strong loops (8, level 3 12) tuned to the field's scale, fed by the sum of every Gespinst voice's send;
  // all hang on one bridge: each string gets κ·B, B the strings' mean, linear below −12 dBFS and saturating above it
  // (Steg = the drive). The loop's stability limit is κ_crit = N / Σ 1/(1 − G_i) (G_i the string's gain per round trip –
  // 0.02–0.12 depending on the tuning and Nachklang, measured in the check): Kopplung is a share of 0.8 × that, and a
  // governor lowers κ while the bridge grows with nothing coming in. Ruhe: 10 s without input the strings lose energy
  // until silent, then the node idles (no cost) until the next send. Each string drifts ±2 ct (5–15 s, else the
  // ringing web is a static organ), its loss filter is dark (Metall brightens it and adds the stiff string's
  // dispersion); a new tuning glides the lengths over 90 ms. Stereo by pitch: low left, high right.
  const WEB_GLIDE = 0.09, WEB_OUT = 0.08, WEB_DCR = 1 - 2 * Math.PI * 5 / SR, WEB_MARGIN = 0.75;   // (Kopplung 1 → 0.71 of the limit: the common mode rings ≤ 3.5 × Nachklang)
  class Web extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      this.rich = !!po.rich; const N = this.N = this.rich ? 12 : 8;
      this.lite = po.lite ? 1 : 0; this.dead = false;
      // the strings' delay lines (one ring each, a common mask) and their Lagrange-3 taps, set per block while the length
      // holds (per sample during a retune's glide): the same interpolation as FracDelay.read3, without a call per string
      let ml = 8; while (ml < SR / 16 + 24) ml <<= 1;
      this.M = ml - 1; this.bufs = []; for (let i = 0; i < N; i++) this.bufs.push(new Float32Array(ml));
      this.wp = new Int32Array(N); this.di = new Int32Array(N); this.h0 = new Float64Array(N); this.h1 = new Float64Array(N); this.h2 = new Float64Array(N); this.h3 = new Float64Array(N);
      this.f = new Float64Array(N).fill(220); this.Lt = new Float64Array(N); this.Lc = new Float64Array(N); this.gi = new Float64Array(N);
      this.lp = new Float64Array(N); this.ax = new Float64Array(N); this.ay = new Float64Array(N); this.s = new Float64Array(N); this.dx = new Float64Array(N); this.dy = new Float64Array(N);
      this.pl = new Float64Array(N); this.pr = new Float64Array(N); this.dr = new Float64Array(N); this.drT = new Float64Array(N); this.drN = new Float64Array(N);
      this.p = { kopplung: 0.4, nachklang: 2, metall: 0.2, steg: 0.5 };
      this.rng = new PRNG(po.seed || 11);
      this.on = false; this.quiet = 0; this.sil = 0; this.ruhe = 1; this.gov = 1; this.bS = this.bL = 0; this.glide = 0; this.fade = 0; this.hx = this.hy = 0; this.deaf = 0;
      if (po.prm) Object.assign(this.p, po.prm);
      this.tune(po.freqs || [], false);
      this.port.onmessage = (e) => {
        const m = e.data; if (!m) return;
        if (m.kill) this.dead = true;
        if (m.set) { for (const k in m.set) if (k in this.p) this.p[k] = +m.set[k]; this.coef(); }
        if (m.tune) this.tune(m.tune, m.glide !== false);
        if (m.lite != null) this.lite = m.lite ? 1 : 0;
        if (m.clear) { if (this.on) this.fade = Math.round(0.01 * SR); this.deaf = Math.round(0.08 * SR); }   // (a 10-ms fade, then everything at rest – and deaf for 80 ms to the voices' last breath)
      };
    }
    tune(fs, glide) {
      const N = this.N;
      for (let i = 0; i < N; i++) this.f[i] = Math.min(4000, Math.max(20, +fs[i] || this.f[i]));
      // pan by pitch across the web's span
      let lo = Infinity, hi = 0; for (let i = 0; i < N; i++) { lo = Math.min(lo, this.f[i]); hi = Math.max(hi, this.f[i]); }
      const span = Math.max(0.5, Math.log2(hi / lo));
      for (let i = 0; i < N; i++) { const x = 0.8 * (2 * Math.log2(this.f[i] / lo) / span - 1), a = (x + 1) * Math.PI / 4; this.pl[i] = Math.cos(a) * Math.SQRT2; this.pr[i] = Math.sin(a) * Math.SQRT2; }
      // the bridge's feed back into the strings passes a high-pass (Butterworth, 0.35 × the lowest string): below the
      // strings, where the in-loop DC blockers lead the delays' lag, every string answers in phase – a sub-audio mode
      // that rang (14 Hz at Nachklang 0.5) and, at Kopplung 1, oscillated
      const wc = Math.tan(Math.PI * Math.min(150, Math.max(10, 0.35 * lo)) / SR), k2 = wc * wc, nq = 1 / (1 + Math.SQRT2 * wc + k2);
      this.hb = [nq, -2 * nq, nq, 2 * (k2 - 1) * nq, (1 - Math.SQRT2 * wc + k2) * nq];
      this.coef();
      if (!glide) { for (let i = 0; i < N; i++) this.Lc[i] = this.Lt[i]; this.glide = 0; }
      else this.glide = Math.round(WEB_GLIDE * SR);
    }
    // the strings' lengths (the loss filter's and the dispersion's delays taken off), gains per round trip, κ_crit
    coef() {
      const N = this.N, p = this.p, T60 = Math.max(0.3, p.nachklang);
      const key = T60 + ' ' + p.metall + ' ' + this.f.join(' '); if (key === this.ck) return; this.ck = key;   // (Kopplung and Steg change nothing here: Gestik moves them 20 times a second)
      this.rho = 0.62 - 0.5 * p.metall; this.apa = -0.3 * p.metall;
      for (let i = 0; i < N; i++) {
        const f = this.f[i], w = 2 * Math.PI * f / SR, r = this.rho, a = this.apa;
        const hre = 1 - r * Math.cos(w), him = r * Math.sin(w), mag = (1 - r) / Math.hypot(hre, him);
        const pdl = Math.atan2(him, hre) / w;   // the one-pole's phase delay
        // the all-pass (−a + z⁻¹)/(1 − a z⁻¹): its phase delay
        const nr = -a + Math.cos(w), ni = -Math.sin(w), dr = 1 - a * Math.cos(w), di = a * Math.sin(w);
        const pda = -Math.atan2(ni * dr - nr * di, nr * dr + ni * di) / w;
        // the DC blocker (1 − z⁻¹)/(1 − R z⁻¹) at 5 Hz in the loop: it leads a little
        const R = WEB_DCR, br = 1 - Math.cos(w), bi = Math.sin(w), qr = 1 - R * Math.cos(w), qi = R * Math.sin(w);
        const pdd = -Math.atan2(bi * qr - br * qi, br * qr + bi * qi) / w;
        this.Lt[i] = Math.max(4, SR / f - pdl - pda - pdd);
        const G = Math.pow(10, -3 / (T60 * f));
        this.gi[i] = Math.min(0.99995, G / mag);
      }
      // κ_crit from the strings themselves: the bridge's loop gain is κ/N · |Σ H_i(φ)| (H_i a string's response, in to
      // out); its peaks lie at the strings' partials, higher where partials of several strings meet (root, fifth, octave
      // share every few) – the loudest such meeting sets the limit. (SPEC's N/Σ 1/(1 − G_i) assumes every string on one
      // pitch: ×3–8 too careful for a scale, and the coupling was inaudible.)
      // Checked where the peaks can be: every partial's exact resonance, between neighbouring partials (short Nachklang:
      // broad peaks overlap), and below the lowest string; with the bridge's high-pass – and for the lite web's first six
      const ph = [];
      for (let j = 0; j < N; j++) for (let k = 1; k <= 8 && k * this.f[j] < 0.45 * SR; k++) {
        let x = 2 * Math.PI * k * this.f[j] / SR;
        for (let it = 0; it < 3; it++) { const e = this.resp(j, x, true); x += e / this.Lt[j]; }   // (to the partial's exact resonance)
        ph.push(x);
      }
      ph.sort((a, b) => a - b);
      for (let i = ph.length - 1; i > 0; i--) ph.push(0.5 * (ph[i] + ph[i - 1]));
      let lo = Infinity; for (let i = 0; i < N; i++) lo = Math.min(lo, this.f[i]);
      for (let i = 0; i < 48; i++) ph.push(2 * Math.PI * 2 * Math.pow(lo / 2, i / 47) / SR);
      const hb = this.hb, n6 = Math.min(6, N);
      let wF = 1, wL = 1;
      for (const x of ph) {
        const c1 = Math.cos(x), s1 = Math.sin(x), c2 = Math.cos(2 * x), s2 = Math.sin(2 * x);
        const nr = hb[0] + hb[1] * c1 + hb[2] * c2, ni = -hb[1] * s1 - hb[2] * s2, dr = 1 + hb[3] * c1 + hb[4] * c2, di = -hb[3] * s1 - hb[4] * s2;
        const hp = Math.hypot(nr, ni) / Math.hypot(dr, di);
        let re = 0, im = 0;
        for (let i = 0; i < N; i++) { const h = this.resp(i, x, false); re += h[0]; im += h[1]; if (i === n6 - 1) wL = Math.max(wL, hp * Math.hypot(re, im)); }
        wF = Math.max(wF, hp * Math.hypot(re, im));
      }
      this.kc = WEB_MARGIN * N / wF; this.kcL = WEB_MARGIN * n6 / wL;
    }
    // string i at φ (rad/sample): the loop E = g·LP·AP·DCB·e^(−jφL); its response E/(1 − E) – or, with ang, E's phase
    resp(i, ph, ang) {
      const c = Math.cos(ph), sn = Math.sin(ph), r = this.rho, a = this.apa, R = WEB_DCR;
      // LP = (1 − r)/(1 − r e^−jφ)
      let dr = 1 - r * c, di = r * sn, m = dr * dr + di * di, er = (1 - r) * dr / m, ei = -(1 - r) * di / m;
      // AP = (−a + e^−jφ)/(1 − a e^−jφ)
      let nr = -a + c, ni = -sn; dr = 1 - a * c; di = a * sn; m = dr * dr + di * di;
      let tr = (nr * dr + ni * di) / m, ti = (ni * dr - nr * di) / m, xr = er * tr - ei * ti, xi = er * ti + ei * tr;
      // DCB = (1 − e^−jφ)/(1 − R e^−jφ)
      nr = 1 - c; ni = sn; dr = 1 - R * c; di = R * sn; m = dr * dr + di * di;
      tr = (nr * dr + ni * di) / m; ti = (ni * dr - nr * di) / m; er = xr * tr - xi * ti; ei = xr * ti + xi * tr;
      const L = this.Lt[i], cr = Math.cos(ph * L), ci = -Math.sin(ph * L), g = this.gi[i];
      xr = g * (er * cr - ei * ci); xi = g * (er * ci + ei * cr);
      if (ang) return Math.atan2(xi, xr);
      dr = 1 - xr; di = -xi; m = dr * dr + di * di;
      return [(xr * dr + xi * di) / m, (xi * dr - xr * di) / m];
    }
    process(inputs, outputs) {
      if (this.dead) return false;
      const out = outputs[0], L = out && out[0]; if (!L) return true;
      const R = out[1] || null, n = L.length, inp = inputs[0], x0 = inp && inp[0], x1 = inp && inp[1];
      let ein = 0;
      if (x0) for (let i = 0; i < n; i++) { const v = x1 ? 0.5 * (x0[i] + x1[i]) : x0[i]; ein += v * v; }
      if (this.deaf > 0) { this.deaf -= n; ein = 0; }
      const has = ein > n * 1e-14;
      if (!this.on && !has) { L.fill(0); if (R) R.fill(0); return true; }   // at rest: nothing to compute
      if (has) { if (!this.on) { this.on = true; this.port.postMessage({ active: 1 }); } this.quiet = 0; this.ruhe = 1; this.sil = 0; }
      else this.quiet += n;
      if (ein / n >= 1e-6) this.gov = 1;   // (input back, −60 dB: κ returns)
      if (this.quiet > 10 * SR) this.ruhe *= 0.98;   // Ruhe: 10 s without input – the strings lose energy until silent
      const N = this.lite ? Math.min(6, this.N) : this.N, Lc = this.Lc, Lt = this.Lt, gi = this.gi, lp = this.lp, ax = this.ax, ay = this.ay, s = this.s, pl = this.pl, pr = this.pr, dx = this.dx, dy = this.dy;
      // drift: each string wanders within ±2 ct, a new aim every 5–15 s
      const dk = 1 - Math.exp(-n / (2.5 * SR));
      for (let i = 0; i < N; i++) {
        if ((this.drN[i] -= n) <= 0) { this.drT[i] = (2 * this.rng.next() - 1) * 2; this.drN[i] = (5 + 10 * this.rng.next()) * SR; }
        this.dr[i] += dk * (this.drT[i] - this.dr[i]);
      }
      const glide = this.glide > 0, gl = glide ? Math.max(1, this.glide) : n, dL = this.dL || (this.dL = new Float64Array(this.N));
      const bufs = this.bufs, M = this.M, wp = this.wp, di = this.di, h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;
      const taps = (i, D) => { const q = D | 0, pp = D - q + 1; di[i] = q; h0[i] = -(pp - 1) * (pp - 2) * (pp - 3) / 6; h1[i] = pp * (pp - 2) * (pp - 3) / 2; h2[i] = -pp * (pp - 1) * (pp - 3) / 2; h3[i] = pp * (pp - 1) * (pp - 2) / 6; };
      for (let i = 0; i < N; i++) { const tgt = Lt[i] / cents(this.dr[i]); if (glide) dL[i] = (tgt - Lc[i]) / gl; else { Lc[i] = tgt; taps(i, tgt); } }   // (the drift moves < 0.01 ct a block)
      this.glide = Math.max(0, this.glide - n);
      const kap = this.p.kopplung * 0.95 * (N < this.N ? this.kcL : this.kc) * this.gov, hb = this.hb, rho = this.rho, r1 = 1 - rho, a = this.apa, dr = 1 + 7 * this.p.steg, idr = 1 / dr, ru = this.ruhe, iN = 1 / N;
      const og = WEB_OUT / Math.sqrt(N);
      let fade = this.fade, fk = fade > 0 ? 1 / fade : 0, fg = 1, eb = 0, eo = 0;
      let hx = this.hx, hy = this.hy, b1 = this.b1 || 0, b2 = this.b2 || 0, c1 = this.c1 || 0, c2 = this.c2 || 0; const hr = 1 - 2 * Math.PI * 20 / SR;
      for (let k = 0; k < n; k++) {
        const xi = x0 && !this.deaf ? (x1 ? 0.5 * (x0[k] + x1[k]) : x0[k]) : 0, x = xi - hx + hr * hy; hx = xi; hy = x;   // (no DC in: a loop's gain at 0 Hz is ≈ 1 – it would pile up)
        let B = 0, l = 0, r = 0;
        for (let i = 0; i < N; i++) {
          if (glide) { Lc[i] += dL[i]; taps(i, Lc[i]); }
          const bi = bufs[i], j = wp[i] + 1 - di[i];
          let y = h0[i] * bi[j & M] + h1[i] * bi[(j - 1) & M] + h2[i] * bi[(j - 2) & M] + h3[i] * bi[(j - 3) & M];
          y = lp[i] = r1 * y + rho * lp[i];                        // the loss filter (dark)
          const z = -a * y + ax[i] + a * ay[i]; ax[i] = y; ay[i] = z;   // dispersion (Metall)
          const q = z - dx[i] + WEB_DCR * dy[i]; dx[i] = z; dy[i] = q;   // (the loop's mode at 0 Hz keeps ≈ all its energy: a DC blocker)
          const v = s[i] = gi[i] * ru * q;
          B += v; l += v * pl[i]; r += v * pr[i];
        }
        B *= iN; eb += B * B;
        const ab = B < 0 ? -B : B, Bn = ab < 0.25 ? B : (B < 0 ? -1 : 1) * (0.25 + tanh(dr * (ab - 0.25)) * idr);   // the bridge: linear below −12 dBFS
        const Bh = hb[0] * Bn + hb[1] * b1 + hb[2] * b2 - hb[3] * c1 - hb[4] * c2; b2 = b1; b1 = Bn; c2 = c1; c1 = Bh;
        const c = x + kap * Bh;
        for (let i = 0; i < N; i++) { const w = wp[i]; bufs[i][w] = c + s[i]; wp[i] = (w + 1) & M; }
        if (fade > 0) { fg = fade * fk; if (--fade === 0) { this.rest(); this.port.postMessage({ idle: 1 }); } }   // (cleared: at rest, and the budget hears it)
        l *= og * fg; r *= og * fg; eo += l * l + r * r;
        // (a soft ceiling: linear to 0.5, never past 1 – many lanes at once pile up)
        L[k] = l > 0.5 ? 0.5 + 0.5 * tanh(2 * l - 1) : l < -0.5 ? -0.5 - 0.5 * tanh(-2 * l - 1) : l;
        if (R) R[k] = r > 0.5 ? 0.5 + 0.5 * tanh(2 * r - 1) : r < -0.5 ? -0.5 - 0.5 * tanh(-2 * r - 1) : r;
      }
      this.fade = fade; this.hx = hx; this.hy = flush(hy); this.b1 = b1; this.b2 = b2; this.c1 = flush(c1); this.c2 = flush(c2);
      for (let i = 0; i < N; i++) { lp[i] = flush(lp[i]); ay[i] = flush(ay[i]); dy[i] = flush(dy[i]); }
      // the governor: a second without input and the bridge not dying away (its level over 50 ms against 400 ms: a
      // decay of even 30 s T60 reads ≤ 0.92) – κ down 1 % per block until it does
      const be = eb / n, k1 = 1 - Math.exp(-n / (0.05 * SR)), k2 = 1 - Math.exp(-n / (0.4 * SR));
      this.bS += k1 * (be - this.bS); this.bL += k2 * (be - this.bL);
      if (!has && this.quiet > SR && this.bS > 1e-10 && this.bS > 0.94 * this.bL) this.gov *= 0.99;   // (energies: 0.94 ≈ 0.97 in level)
      if (!(eo < 1e6)) { this.rest(); L.fill(0); if (R) R.fill(0); return true; }   // (a NaN: clear, keep running)
      if (!has && eo < n * 1e-10 && this.quiet > 0.5 * SR) { if (++this.sil > 8) { this.rest(); this.port.postMessage({ idle: 1 }); } } else this.sil = 0;
      return true;
    }
    rest() { this.b1 = this.b2 = this.c1 = this.c2 = 0; for (const x of this.bufs) x.fill(0); this.lp.fill(0); this.ax.fill(0); this.ay.fill(0); this.s.fill(0); this.dx.fill(0); this.dy.fill(0); this.on = false; this.fade = 0; this.ruhe = 1; this.gov = 1; this.quiet = 0; this.sil = 0; this.bS = this.bL = 0; }
  }

