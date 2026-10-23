  // ---- Sehne: myzel-string – a live string under the hand (SPEC §3.7) ----
  // Two travelling waves on one string: the right-going line (written at the nut, read at the bridge) and the
  // left-going one (written at the bridge, read at the nut), each half the round trip, read with Lagrange-3. The nut
  // reflects with −1; the bridge with the loss of the Nachklang, a one-pole low-pass (the string's own damping of the
  // highs) and a cascade of first-order all-passes (stiffness: the partials stretched sharp). What happens ON the
  // string – the pluck, the hand's light touch at a node (flageolet), the E-Bow's push – is done in place at its point
  // in both lines (the two cells around the point read, then written back): the point moves without moving the waves,
  // so the hand slides from ½ to ⅓ under a sounding string without a click, and the length glides per sample (per
  // block it would step: 2.7-ms pitch stairs on a slide).
  const SHN_M = 4, SHN_LMIN = 2.5, SHN_FD = 5000, SHN_B = 8e-4, SHN_EX = 0.5, SHN_NZ = 0.5, SHN_OUT = 0.45, SHN_EBK = 1, SHN_EBG = 32, SHN_EBN = 0.002, SHN_SQ = 0.3, SHN_JU = 0.02, SHN_JK = 0.15, SHN_JK0 = -0.6, SHN_JTH = 0.002, SHN_BODY = 1;
  const SHN_FEED = 0.17;   // (Hexenring step 4: where a feeding Schleife pushes, from the bridge – as a pluck there, every low mode hears it)
  const SHN_ZB = [0.3, 0.7, 0.765, 0.81, 0.85, 0.95];   // palm | open | flageolet ½ | ⅓ | ¼ | E-Bow | E-Bow on the octave
  const shnLag = (a, w) => Math.atan2(Math.sin(w), Math.cos(w) - a) + Math.atan2(a * Math.sin(w), 1 - a * Math.cos(w));   // phase lag (rad) of y = −a·x + x1 + a·y1
  const shnLpLag = (c, w) => { const p = 1 - c; return Math.atan2(p * Math.sin(w), 1 - p * Math.cos(w)); };   // of y += c·(x − y)
  const shnHpLag = (r, w) => Math.atan2(r * Math.sin(w), 1 - r * Math.cos(w)) - 0.5 * (Math.PI - w);   // of the loop's high-pass y = x − x1 + r·y1 (a lead: < 0)
  // the zone for a height, moving to a neighbour only 0.01 past the boundary (hysteresis 0.02)
  function shnZone(y, z) {
    let n = 0; while (n < 6 && y >= SHN_ZB[n]) n++;
    if (z < 0 || n === z) return n;
    if (n > z) { while (n > z && y < SHN_ZB[n - 1] + 0.01) n--; }
    else { while (n < z && y >= SHN_ZB[n] - 0.01) n++; }
    return n;
  }
  class ShnStr {   // one string (level 3: two)
    constructor(n) {
      this.N = n; this.bR = new Float32Array(n); this.bL = new Float32Array(n);
      this.ex = new Float32Array(Math.ceil(SR / 16) + 8); this.nz = new Float32Array(this.ex.length); this.ap = new Float64Array(2 * SHN_M + 5);
      this.reset();
    }
    reset() {
      this.bR.fill(0); this.bL.fill(0); this.ap.fill(0);
      this.w = 0; this.Lh = 0; this.LhT = 0; this.lp = 0; this.exN = 0; this.exI = 0; this.xp = 1; this.xe = 1;
      this.c = 1; this.gl = 0.99; this.aa = 0; this.hr = 1; this.k0 = SHN_JK0; this.jm = (1 - SHN_JK0) / (1 + SHN_JK0); this.aKey = -1; this.xi = 0.5; this.f = 220; this.w1 = 0.03;
      this.e1 = this.e2 = 0; this.b0 = this.a1 = this.a2 = 0; this.loss = 0.01; this.de = 1; this.ni = (this.ni || 0) + 12345 & 65535;
      this.pk = 0.3;
    }
  }
  class Strg extends MyzelProc {
    constructor(o) {
      super(o);
      const po = this.po;
      this.rich = !!po.rich;
      let n = 8; while (n < Math.ceil(SR / 32) + 40) n <<= 1;   // half the round trip at 16 Hz
      this.sA = new ShnStr(n); this.sB = this.rich ? new ShnStr(n) : null;
      this.p = { daempfung: 2.5, steifheit: 0.25, zupfort: 0.13, hand: 0.5, ebow: 0.5, steg: 'flach' };
      if (po.prm) this.set(po.prm);
      this.rng = new PRNG(po.seed || 7);
      this.bo = new Float64Array(8); this.d2 = new Float64Array(4);
      this.vel = 0.75;
      this.reset();
    }
    reset() {
      this.sA.reset(); if (this.sB) this.sB.reset();
      this.zone = -1; this.kj = 0; this.zg = 1; this.geb = 0; this.cap = 1; this.walk = 0; this.sw = 0; this.sq = 0; this.grab = 0;
      this.rel = 0; this.gate = 0; this.dl = this.dr = this.dxl = this.dxr = 0; this.bo.fill(0); this.d2.fill(0); this.t60 = 2.5; this.rho = 0.18;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = k === 'steg' ? String(p[k]) : +p[k] || 0; }
    start(m) {
      const fresh = this.g === 0;   // (the contract set the click ramp: a silent string)
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst;
      if (m.seed) this.rng = new PRNG(m.seed);
      if (m.y != null) this.y = m.y;
      this.gate = this.burst ? Math.max(1, Math.round((m.gate || 0.22) * SR)) : 0;
      this.rel = 0; this.zone = shnZone(this.y, -1); this.grab = 0;
      const two = this.sB && !this.lite;
      if (!m.silent) {   // (Hexenring step 4: a string fed by a Schleife starts silent – it rings only in sympathy)
        this.pluck(this.sA, this.f * (two ? cents(-3) : 1), 0);
        if (two) this.pluck(this.sB, this.f * cents(3), Math.round(0.002 * SR));   // the course's second string a little late
      }
      if (fresh) { this.g = 1; this.gN = 0; }   // a pluck on a silent string needs no click ramp (the native attack is the guard)
    }
    // one period, filtered by the touch (soft → dark, hard → bright), its mean taken out, injected at the pluck's point
    // (±3 % each pluck) into both directions – the point combs it (a node of a harmonic leaves it out)
    pluck(S, f, lag) {
      const p = this.p, P = Math.max(4, Math.min(S.ex.length - 8, Math.round(SR / f))), ex = S.ex, rng = this.rng;
      const jw = p.steg === 'jawari';
      // a plucked string's force falls ≈ 6 dB an octave (the shape's 1/n): a pole at (1 + 2.5·vel²)·f; the touch's own
      // corner 400 Hz (soft) … 18 kHz (hard) above it
      const v = this.vel, f1 = f * (1 + 2.5 * v * v) * (jw ? 0.5 : 1); let fc = 400 * Math.pow(2, 5.5 * v) * (jw ? 0.35 : 1); if (fc < 2 * f) fc = 2 * f;
      const c1 = 1 - Math.exp(-2 * Math.PI * Math.min(f1, 0.45 * SR) / SR), cc = 1 - Math.exp(-2 * Math.PI * Math.min(fc, 0.45 * SR) / SR);
      // the pluck itself (an impulse through those poles: with the point's comb the string's ideal sin(nπp)/n) and the
      // per-hit noise beside it at −6 dB (each pluck a little different, none thin by chance: noise alone moved the
      // fundamental ±10 dB from pluck to pluck)
      let lp = 0, l2 = 0, np = 0, n2 = 0, ep = 0, en = 0;
      const nz = S.nz;
      for (let i = 0; i < P; i++) {
        lp += c1 * ((i === 0 ? 1 : 0) - lp); l2 += cc * (lp - l2); ex[i] = l2; ep += l2;
        np += c1 * (rng.next() * 2 - 1 - np); n2 += cc * (np - n2); nz[i] = n2; en += n2;
      }
      ep /= P; en /= P; let sp = 0, sn = 0;
      for (let i = 0; i < P; i++) { ex[i] -= ep; nz[i] -= en; sp += ex[i] * ex[i]; sn += nz[i] * nz[i]; }
      const kp = 1 / Math.sqrt(sp / P + 1e-20), kn = SHN_NZ / Math.sqrt(sn / P + 1e-20);
      let e = 0, pk = 0;
      for (let i = 0; i < P; i++) { const x = ex[i] * kp + nz[i] * kn; ex[i] = x; e += x * x; }
      const g = SHN_EX / Math.sqrt(e / P + 1e-12);
      for (let i = 0; i < P; i++) { ex[i] *= g; const ax = Math.abs(ex[i]); if (ax > pk) pk = ax; }
      S.exN = P; S.exI = -lag; S.pk = pk;
      S.xp = this.pos(true) * (1 + 0.06 * (rng.next() - 0.5));
    }
    // the pluck's point from the bridge (share of the string): Zupfort, drifting 0.13 → 0.2 across the open zone; at a
    // node touch and under the E-Bow no further than 0.2 (else the harmonic's node, measured: the flageolet 10–15 dB down);
    // under the E-Bow (it sits by the bridge) the hand plucks a fifth closer to the bridge – brighter
    pos(pl) {
      const p = this.p, y = this.y, z = this.zone;
      let x = p.zupfort;
      if (z === 1) x += 0.07 * Math.min(1, Math.max(0, (y - 0.3) / 0.4));
      if (z >= 5) x *= 0.8;
      if (z >= 2) x = Math.min(x, 0.2);
      if (!pl || z >= 5) x = Math.max(0.06, Math.min(x, 0.2));
      return x;
    }
    stop() { this.rel = 1; }
    // per block: the string's loss, its bridge filters and its length for f (exact at f: the filters' phase taken off)
    tune(S, f) {
      const p = this.p, w1 = 2 * Math.PI * f / SR, P = SR / f, T = this.t60;
      const gl = Math.pow(10, -3 / (T * f));
      // the bridge's low-pass: the highs (5 kHz, at least the third harmonic) ring rho of the Nachklang
      let c = 1; const wd = 2 * Math.PI * Math.max(SHN_FD, 3 * f) / SR;
      if (wd < 0.9 * Math.PI) {
        const mg = Math.pow(gl, 1 / this.rho - 1), q = 1 - Math.cos(wd), m2 = mg * mg;
        if (m2 < 0.99999) c = (-2 * m2 * q + Math.sqrt(4 * m2 * m2 * q * q + 8 * (1 - m2) * m2 * q)) / (2 * (1 - m2));
        const cmin = 1 - Math.exp(-2 * Math.PI * 1.5 * f / SR); if (c < cmin) c = cmin;
      }
      const lpd = shnLpLag(c, w1) / w1;
      // stiffness: partial n_r (≈ 2.5 kHz) sharp by √((1 + B n²)/(1 + B)) – the all-passes' coefficient solved for it
      // (Newton from the last one; again only when the pitch or Steifheit moved)
      const B = SHN_B * Math.pow(p.steifheit, 1.5), key = Math.round(f * 20) * 100 + Math.round(p.steifheit * 99);
      let a = S.aa;
      if (key !== S.aKey) {
        S.aKey = key; a = 0;
        const nr = Math.min(24, Math.max(2, Math.round(2500 / f))), wr = nr * w1;
        if (B > 1e-7 && wr < 2.6) {
          const want = P * (1 - Math.sqrt((1 + B) / (1 + B * nr * nr)));
          const dt = (x) => SHN_M * (shnLag(x, w1) / w1 - shnLag(x, wr) / wr) - want;
          let lo = 0, hi = 0.97; a = S.aa > 0 && S.aa < 0.97 ? S.aa : 0.5;
          for (let it = 0; it < 12; it++) {   // safeguarded Newton (bisection when it leaves the bracket)
            const v = dt(a); if (Math.abs(v) < 1e-4 * (want + 1e-3)) break;
            if (v < 0) lo = a; else hi = a;
            const d = (dt(a + 1e-4) - v) / 1e-4; let nx = d > 0 ? a - v / d : 0.5 * (lo + hi);
            if (!(nx > lo && nx < hi)) nx = 0.5 * (lo + hi);
            a = nx;
          }
        }
        S.aa = a;
      }
      // the jawari: its three sections (their delay at f, scaled by what the press took off it on average last block: the
      // string pressed onto the bridge is shorter – its pitch held) and a high-pass in the loop at 0.02·f (the moving
      // bridge leaves a little DC in the waves, R = c, L = −c, which nothing else would take out; per period the same
      // share at every pitch). The flat bridge needs none: exact harmonics.
      const jw = p.steg === 'jawari', hr = S.hr = jw ? 1 - 2 * Math.PI * 0.02 * f / SR : 1;
      const k0 = S.k0 = SHN_JK0 + 1.1 * Math.min(1, Math.max(0, Math.log2(f / 1500) / 2));   // (above 1.5 kHz the bridge's rest delay shrinks: it must fit a short loop)
      const hpd = jw ? shnHpLag(hr, w1) / w1 + 3 * shnLag(-k0, w1) / w1 * S.jm / ((1 - k0) / (1 + k0)) : 0;
      let apd = SHN_M * shnLag(a, w1) / w1, Lh = 0.5 * (P - lpd - apd - hpd);
      if (Lh < SHN_LMIN) {   // very high notes: the all-passes give up their delay (a < 0: under a sample each)
        let lo = -0.95, hi = a;
        for (let it = 0; it < 20; it++) { const mid = 0.5 * (lo + hi); if (0.5 * (P - lpd - hpd - SHN_M * shnLag(mid, w1) / w1) < SHN_LMIN) hi = mid; else lo = mid; }
        a = S.aa = lo; S.aKey = -1; apd = SHN_M * shnLag(a, w1) / w1; Lh = Math.max(2.05, 0.5 * (P - lpd - apd - hpd));
      }
      // the fundamental rings the whole Nachklang: what the low-pass and the two reads (Lagrange-3, at this fraction)
      // take from it each period is given back in the loss (kept below 1: elsewhere they take less – above ≈ 3 kHz the
      // reads' loss is more than a string's own and high notes ring shorter)
      const pq = Lh - (Lh | 0) + 1, hl = [-(pq - 1) * (pq - 2) * (pq - 3) / 6, pq * (pq - 2) * (pq - 3) / 2, -pq * (pq - 1) * (pq - 3) / 2, pq * (pq - 1) * (pq - 2) / 6];
      let lr = 0, li = 0; for (let k = 0; k < 4; k++) { lr += hl[k] * Math.cos(w1 * k); li -= hl[k] * Math.sin(w1 * k); }
      const p1 = 1 - c, lm = c / Math.sqrt(1 - 2 * p1 * Math.cos(w1) + p1 * p1) * (jw ? (1 + hr) * Math.sin(0.5 * w1) / Math.sqrt(1 - 2 * hr * Math.cos(w1) + hr * hr) : 1);
      S.c = c; S.gl = Math.min(0.99999, gl / (lm * (lr * lr + li * li))); S.LhT = Lh; S.f = f; S.w1 = w1; S.jw = jw;
      if (!S.Lh) S.Lh = Lh;
    }
    // the frequency (rad/sample) of the string's m-th mode: the loop's phase 2π·m (the stiffness stretches it)
    mode(S, m) {
      let w = m * S.w1; const L2 = 2 * S.LhT;
      for (let it = 0; it < 4; it++) {
        const ph = w * L2 + shnLpLag(S.c, w) + SHN_M * shnLag(S.aa, w) + shnHpLag(S.hr, w) + (S.jw ? 3 * shnLag(-S.k0, w) : 0) - 2 * Math.PI * m;
        const d = L2 + (shnLpLag(S.c, w + 1e-4) - shnLpLag(S.c, w) + SHN_M * (shnLag(S.aa, w + 1e-4) - shnLag(S.aa, w)) + shnHpLag(S.hr, w + 1e-4) - shnHpLag(S.hr, w) + (S.jw ? 3 * (shnLag(-S.k0, w + 1e-4) - shnLag(-S.k0, w)) : 0)) / 1e-4;
        w -= ph / d;
      }
      return w;
    }
    render(L, R, a, b) {
      if (this.f > 0.2 * SR) this.f = 0.2 * SR;   // (a loop of five samples at least: freq 8 kHz + a bend)
      const p = this.p, n = b - a, y = this.y, two = !!(this.sB && R && !this.lite), jw = p.steg === 'jawari';
      const z = this.zone = shnZone(y, this.zone);
      // a Puls stroke: the gate ends → the hand damps it (0.15 s)
      if (this.burst && !this.rel) { if (this.gate <= n) { this.gate = 0; this.rel = 2; this.off = true; } else this.gate -= n; }
      // the hand. Palm (y < 0.3): the ring shortened to 0.05× at the bottom (Hand 0.5; stronger with Hand), geometrically
      // up to the open string at 0.3 (a linear ramp left the palm's lower half nearly open: 0.53× at y 0.15, now 0.22×),
      // and darker – a thud. Open: the plain string. Flageolet: a light touch at a node, ½ / ⅓ / ¼ (octave, twelfth,
      // double octave), Hand its pressure. Released: the hand mutes it (0.25 s), after a Puls gate 0.15 s.
      const hs = 0.4 + 1.2 * p.hand, pd = y < 0.3 ? 1 - y / 0.3 : 0;
      let t60 = p.daempfung * Math.pow(0.05, pd * hs), rho = (jw ? 0.7 : 0.2) * (1 - 0.8 * pd);   // (the jawari's shimmer rings long)
      if (this.rel === 1) { t60 = Math.min(t60, 0.25); rho = 0.15; } else if (this.rel === 2) { t60 = Math.min(t60, 0.15); rho = 0.12; }
      this.t60 = Math.max(0.02, t60); this.rho = rho;
      this.tune(this.sA, two ? this.f * cents(-3) : this.f); if (two) this.tune(this.sB, this.f * cents(3));   // (after underruns: one string)
      const flag = !this.rel && z >= 2 && z <= 4 && this.f < 2500, hm = flag ? z : 0;   // the node's harmonic: 2, 3, 4
      const kT = flag ? 0.3 * p.hand : 0, k0 = this.kj; this.kj += (kT - this.kj) * Math.min(1, n / (0.004 * SR));
      // flageolet: the node of mode m from the nut, half its wavelength (the stiffness stretches the mode: its own)
      if (flag) for (const S of [this.sA, two ? this.sB : null]) if (S) S.xi = Math.PI / this.mode(S, hm) / S.LhT;
      // E-Bow (y > 0.85): a pickup at the bridge → tanh → a band-pass on the fundamental (the octave above 0.95) → a
      // push at the pluck's point; its loop gain carries the loss of a period, so it holds every note at its own level
      // (deeper in the zone stronger: from ≈ 3 dB under the pluck to its level); it takes hold within ≈ 0.4 s – the dying
      // pluck sinks first and swells back
      const eb = !this.rel && z >= 5;
      let gT = eb ? p.ebow * (0.35 + 0.65 * Math.min(1, Math.max(0, (y - 0.85) / 0.15))) : 0;
      this.grab += ((eb ? 1 : 0) - this.grab) * Math.min(1, n / (0.4 * SR));
      gT *= this.grab;
      const g0 = this.geb; this.geb += (gT - this.geb) * Math.min(1, n / (0.01 * SR));
      if (eb || g0 > 1e-4) {
        this.walk += 0.06 * (this.rng.next() * 2 - 1) - 0.01 * this.walk; if (this.walk > 1) this.walk = 1; else if (this.walk < -1) this.walk = -1;
        // at the very edge (y > 0.97) a little of the pickup's raw, limited signal goes past the band-pass: the upper modes
        // are pushed too, now more, now less (a slow walk of its own) – the faint squeal
        this.sw += 0.08 * (this.rng.next() * 2 - 1) - 0.01 * this.sw; if (this.sw > 1) this.sw = 1; else if (this.sw < -1) this.sw = -1;
        this.sq = SHN_SQ * Math.max(0, (y - 0.97) / 0.03) * (0.5 + 0.5 * this.sw);
        const Q = 3 + 9 * (1 - this.vel);
        // its life: a slow walk moves the push along the string (±5 %: the coupling breathes) and the band a little (±0.1 %:
        // more would pull the sustained pitch – ±0.3 % moved it 3 ct)
        for (const S of [this.sA, two ? this.sB : null]) if (S) {
          let we = z === 6 ? this.mode(S, 2) : S.w1; we *= 1 + 0.001 * this.walk; if (we > 0.9 * Math.PI) we = 0.9 * Math.PI;
          const al = Math.sin(we) / (2 * Q), a0 = 1 + al;
          S.b0 = al / a0; S.a1 = -2 * Math.cos(we) / a0; S.a2 = (1 - al) / a0;
          const p1 = 1 - S.c, mg = S.c / Math.sqrt(1 - 2 * p1 * Math.cos(we) + p1 * p1);
          S.loss = Math.max(1e-4, 1 - S.gl * mg);   // what a period loses there
          // the pickup hears the wave before the bridge's filters: the push would come half their delay early (a phase
          // the string answers by moving its pitch – 5.5 ct at 55 Hz, where the stiffness's all-passes are long) – so it
          // listens that much later
          S.de = 0.5 * (shnLpLag(S.c, we) + SHN_M * shnLag(S.aa, we) + (jw ? shnHpLag(S.hr, we) + 3 * shnLag(-S.k0, we) : 0)) / we;
          S.xe = 1 - this.pos(false) * (1 + 0.05 * this.walk);
        }
      }
      const dg = (this.geb - g0) * this.cap / n;
      this.run(this.sA, L, a, b, k0, this.kj, g0 * this.cap, dg, jw);
      if (two) this.run(this.sB, R, a, b, k0, this.kj, g0 * this.cap, dg, jw);
      // out: level 3 – the two strings left and right and a wooden body (180 / 420 Hz, T60 80 ms); the DC taken out;
      // the zone's gain: a touched node leaves its harmonics, measured 4–5 (½), 4–7 (⅓), 7–9 dB (¼) under the open
      // string – each brought back to it (a light hand that barely damps: less); a soft ceiling
      const hw = Math.min(1, p.hand / 0.25), zgT = flag ? [1, 1, 1.7, 1.9, 2.5][hm] * hw + 1 - hw : 1;
      const zg0 = this.zg; this.zg += (zgT - this.zg) * Math.min(1, n / (0.02 * SR)); const dz = (this.zg - zg0) / n;
      // (the DC: 8 Hz; the jawari's moving bridge leaves a little below 20 Hz – there a second order at min(20 Hz, 0.35·f),
      // outside the loop: no partial moves)
      const og = SHN_OUT * (two ? Math.SQRT1_2 : 1), r = 1 - 2 * Math.PI * (jw ? Math.min(20, 0.35 * this.f) : 8) / SR, rn = 0.5 * (1 + r);
      let dl = this.dl, dxl = this.dxl, dr = this.dr, dxr = this.dxr, zg = zg0, e = 0;
      if (jw) { const d2 = this.d2; let a0 = d2[0], a1 = d2[1], b0 = d2[2], b1 = d2[3];
        for (let i = a; i < b; i++) { let x = L[i]; const u = rn * (x - a1) + r * a0; a1 = x; a0 = u; L[i] = u; if (two) { x = R[i]; const v = rn * (x - b1) + r * b0; b1 = x; b0 = v; R[i] = v; } }
        d2[0] = flush(a0); d2[1] = a1; d2[2] = flush(b0); d2[3] = b1; }
      for (let i = a; i < b; i++) {
        zg += dz;
        let x = L[i]; const ul = (jw ? rn : 1) * (x - dxl) + r * dl; dxl = x; dl = ul; x = ul * zg * og;
        L[i] = x > 0.6 ? 0.6 + 0.4 * tanh((x - 0.6) * 2.5) : x < -0.6 ? -0.6 + 0.4 * tanh((x + 0.6) * 2.5) : x;
        e += x * x;
        if (two) { let u = R[i]; const ur = (jw ? rn : 1) * (u - dxr) + r * dr; dxr = u; dr = ur; u = ur * zg * og; R[i] = u > 0.6 ? 0.6 + 0.4 * tanh((u - 0.6) * 2.5) : u < -0.6 ? -0.6 + 0.4 * tanh((u + 0.6) * 2.5) : u; }
        else if (R) R[i] = L[i];
      }
      this.dl = flush(dl); this.dxl = dxl; this.dr = flush(dr); this.dxr = dxr;
      if (two) this.body(L, R, a, b);
      // the E-Bow's ceiling: −6 dBFS RMS inside the processor
      const rms = Math.sqrt(e / n);
      if (rms > 0.5) this.cap *= Math.max(0.5, 0.5 / rms); else this.cap += (1 - this.cap) * 0.02;
    }
    // level 3's wooden body: two short resonances, each side its own (the strings differ)
    body(L, R, a, b) {
      const bo = this.bo, r1 = Math.pow(0.001, 1 / (0.08 * SR)), w1 = 2 * Math.PI * 180 / SR, w2 = 2 * Math.PI * 420 / SR;
      const c1 = r1 * Math.cos(w1), s1 = r1 * Math.sin(w1), c2 = r1 * Math.cos(w2), s2 = r1 * Math.sin(w2), gi = (1 - r1) * SHN_BODY;
      for (let ch = 0; ch < 2; ch++) {
        const X = ch ? R : L, o = 4 * ch;
        let ar = bo[o], ai = bo[o + 1], br = bo[o + 2], bi = bo[o + 3];
        for (let i = a; i < b; i++) {
          const x = X[i] * gi;
          const nr = ar * c1 - ai * s1 + x; ai = ar * s1 + ai * c1; ar = nr;
          const mr = br * c2 - bi * s2 + x; bi = br * s2 + bi * c2; br = mr;
          X[i] += ai + 0.7 * bi;
        }
        bo[o] = flush(ar); bo[o + 1] = flush(ai); bo[o + 2] = flush(br); bo[o + 3] = flush(bi);
      }
    }
    // one string's samples [i0, i1): the waves, the bridge, the hand at its node, the pluck and the E-Bow at their point
    run(S, out, i0, i1, k0, k1, g0, dg, jw) {
      const bR = S.bR, bL = S.bL, M = S.N - 1, ex = S.ex, ap = S.ap, n = i1 - i0;
      let w = S.w, Lh = S.Lh; const dLh = (S.LhT - Lh) / n;
      let lp = S.lp; const c = S.c, gl = S.gl, aa = S.aa, hr = S.hr, hn = 0.5 * (1 + hr);
      let x0 = ap[0], y0 = ap[1], x1 = ap[2], y1 = ap[3], x2 = ap[4], y2 = ap[5], x3 = ap[6], y3 = ap[7], hx = ap[8], hy = ap[9];
      let k = k0; const dk = (k1 - k0) / n, xi = S.xi;
      let exI = S.exI; const exN = S.exN, xp = S.xp, kx = 0.5 * SR / S.f / S.LhT;   // (points along the acoustic half-length: the bridge filters' delay is string too)
      let gE = g0; const ebOn = g0 > 1e-5 || dg > 0, b0 = S.b0, a1 = S.a1, a2 = S.a2, xe = S.xe, eK = SHN_EBK * S.loss, sq = this.sq, de = S.de + 1; let ni = S.ni;   // (+1: w has moved on since rOut was read)
      let e1 = S.e1, e2 = S.e2;
      const xin = this.ix ? (S === this.sB && this.ix[1] ? this.ix[1] : this.ix[0]) : null, xg = 0.5 * this.inj, xX = Math.min(S.LhT - 1.2, (1 - SHN_FEED) * S.LhT * kx);   // (Hexenring step 4: Nähren)
      let j0 = ap[10], j1 = ap[11], j2 = ap[12], jm = 0; const je = Math.max(1, SHN_JU * S.LhT * kx), jpk = 1 / (S.pk + 1e-9), jK = SHN_JK * Math.pow(220 / S.f, S.f < 220 ? 1.3 : 1.7), jth = SHN_JTH, jk0 = S.k0;   // (the press per period scaled: the bloom takes as long at every pitch)   // (jawari: where the press is felt, how deep it goes)
      for (let i = i0; i < i1; i++) {
        Lh += dLh;
        // the two waves arriving: at the bridge (right-going) and at the nut (left-going)
        let di = Lh | 0, q = Lh - di + 1, j = w + 1 - di;
        let h0 = -(q - 1) * (q - 2) * (q - 3) / 6, h1 = q * (q - 2) * (q - 3) / 2, h2 = -q * (q - 1) * (q - 3) / 2, h3 = q * (q - 1) * (q - 2) / 6;
        const lOut = h0 * bL[j & M] + h1 * bL[(j - 1) & M] + h2 * bL[(j - 2) & M] + h3 * bL[(j - 3) & M];
        const rOut = h0 * bR[j & M] + h1 * bR[(j - 1) & M] + h2 * bR[(j - 2) & M] + h3 * bR[(j - 3) & M];
        // the bridge: the highs' loss, the stiffness, the Nachklang, −1
        lp += c * (rOut - lp);
        let u = lp, t;
        t = aa * (y0 - u) + x0; x0 = u; y0 = t; u = t;
        t = aa * (y1 - u) + x1; x1 = u; y1 = t; u = t;
        t = aa * (y2 - u) + x2; x2 = u; y2 = t; u = t;
        t = aa * (y3 - u) + x3; x3 = u; y3 = t; u = t;
        if (jw) {   // jawari: the string lies on the curved bridge – pressed down onto it (one side of its swing) it wraps on
          // and is shorter there: the bridge answers earlier. The press is the string's displacement just before the bridge
          // (the wave on its way in plus the one on its way out); the sharper the wave, the harder it presses, the more its
          // front runs ahead – sharper still, period by period: the bloom. The bridge's delay is three all-passes in
          // normalized-lattice form, their coefficient moved by the press: orthogonal at every coefficient, so the
          // moving bridge neither adds energy (a delay modulated by the signal pumped the string up to the ceiling) nor
          // takes it (an in-place contact threw kinks above 10 kHz, where the reads lose them: the note died 5× faster).
          let d = Lh - je, ii = d | 0; const fr = d - ii; d = je; const i2 = d | 0, f2 = d - i2;
          const sv = bR[(w - ii) & M] + fr * (bR[(w - ii - 1) & M] - bR[(w - ii) & M]) + bL[(w - i2) & M] + f2 * (bL[(w - i2 - 1) & M] - bL[(w - i2) & M]);
          const ev = -sv * jpk - jth;
          let kj = ev > 0 ? jk0 + jK * ev : jk0; if (kj > 0.9) kj = 0.9;
          const cj = Math.sqrt(1 - kj * kj);
          t = kj * u + cj * j0; j0 = cj * u - kj * j0; u = t;
          t = kj * u + cj * j1; j1 = cj * u - kj * j1; u = t;
          t = kj * u + cj * j2; j2 = cj * u - kj * j2; u = t;
          t = hn * (u - hx) + hr * hy; hx = u; hy = t; u = t;   // (no DC round the loop; normalized: ≤ 1 everywhere – 2/(1 + r) at Nyquist outgrew a high note's loss)
          jm += (1 - kj) / (1 + kj);
        }
        bR[w] = -lOut; bL[w] = -gl * u;
        w = (w + 1) & M;
        // the hand at the node: s = v⁺ + v⁻ there, both lose k·s (modes with a node there pass untouched)
        if (k > 1e-5) {
          const X = xi * Lh;
          let d = X + 1, ii = d | 0; const fr = d - ii, r0 = (w - ii) & M, r1 = (w - ii - 1) & M;
          d = Lh + 1 - X; ii = d | 0; const fl = d - ii, l0 = (w - ii) & M, l1 = (w - ii - 1) & M;
          const ks = k * (bR[r0] + fr * (bR[r1] - bR[r0]) + bL[l0] + fl * (bL[l1] - bL[l0]));
          bR[r0] -= ks * (1 - fr); bR[r1] -= ks * fr; bL[l0] -= ks * (1 - fl); bL[l1] -= ks * fl;
        }
        k += dk;
        // (Hexenring step 4) Nähren: a Schleife's audio pushed in near the bridge, into both directions as the pluck – the
        // string rings in sympathy with what of it falls on its modes
        if (xin) { const e = xg * xin[i]; let d = xX + 1, ii = d | 0; const fr = d - ii; bR[(w - ii) & M] += e * (1 - fr); bR[(w - ii - 1) & M] += e * fr; d = Lh + 1 - xX; ii = d | 0; const fl = d - ii; bL[(w - ii) & M] += e * (1 - fl); bL[(w - ii - 1) & M] += e * fl; }
        // the pluck: one period into both directions at its point
        if (exI < exN) {
          if (exI >= 0) {
            const e = 0.5 * ex[exI]; let X = (1 - xp) * Lh * kx; if (X > Lh - 1.2) X = Lh - 1.2;
            let d = X + 1, ii = d | 0; const fr = d - ii; bR[(w - ii) & M] += e * (1 - fr); bR[(w - ii - 1) & M] += e * fr;
            d = Lh + 1 - X; ii = d | 0; const fl = d - ii; bL[(w - ii) & M] += e * (1 - fl); bL[(w - ii - 1) & M] += e * fl;
          }
          exI++;
        }
        // the E-Bow: the pickup's signal limited, the band-pass, pushed in at its point (the two directions opposed: in
        // phase with the mode's swing there)
        if (ebOn) {
          const ds = Lh + de, ie = ds | 0, fe = ds - ie, pu = bR[(w - ie) & M] + fe * (bR[(w - ie - 1) & M] - bR[(w - ie) & M]);
          ni = (ni + 1) & 65535;   // (its own faint noise, ≈ −50 dB under a sounding string: as a real E-Bow, it starts a silent string – a held note swept up through the ¼ node arrives with no fundamental left to grab)
          const sx = tanh(SHN_EBG * (pu + SHN_EBN * NOISE[ni])), ev = b0 * sx + e1; e1 = e2 - a1 * ev; e2 = -b0 * sx - a2 * ev;
          const dv = 0.5 * gE * eK * (ev + sq * sx); let X = xe * Lh * kx; if (X > Lh - 1.2) X = Lh - 1.2;
          let d = X + 1, ii = d | 0; const fr = d - ii; bR[(w - ii) & M] += dv * (1 - fr); bR[(w - ii - 1) & M] += dv * fr;
          d = Lh + 1 - X; ii = d | 0; const fl = d - ii; bL[(w - ii) & M] -= dv * (1 - fl); bL[(w - ii - 1) & M] -= dv * fl;
          gE += dg;
        }
        if (out) out[i] = rOut;
      }
      S.w = w; S.Lh = Lh; S.lp = flush(lp); S.exI = exI; S.e1 = flush(e1); S.e2 = flush(e2); S.ni = ni;
      if (jw) S.jm += 0.3 * (jm / n - S.jm);   // (the jawari sections' mean delay, slowly)
      ap[0] = flush(x0); ap[1] = flush(y0); ap[2] = flush(x1); ap[3] = flush(y1); ap[4] = flush(x2); ap[5] = flush(y2); ap[6] = flush(x3); ap[7] = flush(y3); ap[8] = hx; ap[9] = flush(hy); ap[10] = flush(j0); ap[11] = flush(j1); ap[12] = flush(j2);
    }
  }

