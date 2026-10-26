  // ---- Ätherwelle: myzel-ond – the Ondes Martenot (Klangbibliothek II, 26.10.2026). One oscillator whose wave the
  // player chooses by „timbres“: Onde (a pure sine), Creux (hollow – the odd harmonics), Nasillard (nasal – a narrow
  // pulse through a band), Gambe (thin and bright – a saw); Höhe glides through them: Onde, Creux, Gambe, Nasillard. The left hand's
  // touche shapes the attack, the finger on the ribbon a vibrato (Vibrato: depth, ≈ 5.6 Hz, never quite regular) and
  // a little scoop into each note. And its loudspeakers, the diffuseurs: the „Palme“ – twelve strings tuned to the
  // chromatic scale that the sound sets ringing (a shimmering halo) – and the „Métallique“, a gong as membrane
  // (a metallic shiver over every note). ----
  const OND_OUT = 0.41;
  const blep = (t, dt) => (t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0);   // (PolyBLEP: a step's band-limited correction)
  class Ond extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { palme: 0.4, metall: 0.15, vibrato: 0.35, klang: 0 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 41);
      this.palme = []; this.fP = 0;
      for (let k = 0; k < (this.lite ? 6 : 12); k++) this.palme.push({ r: new Reso(), k, pan: this.rich ? (k % 2 ? 0.4 : -0.4) : 0 });
      const mf = [410, 618, 983, 1342, 1791, 2457, 3120];
      this.met = mf.slice(0, this.lite ? 4 : 7).map((f, i) => { const r = new Reso(); r.set(f * (0.97 + 0.06 * this.rng.next()), 1.6 + 0.4 * i % 2); return r; });
      this.ph = 0; this.vp = this.rng.next(); this.vr = 5.6; this.bp = new Biquad(); this.lp = 0; this.env = 0; this.sc = 0; this.ys = this.y; this.yT = -1;
      this.vel = 0.75; this.burst = false; this.gate = 0; this.dc = new DcBlock(15); this.dcL = new DcBlock(15); this.dcR = new DcBlock(15);
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; this.fP = 0; }
    reset() { for (const s of this.palme) s.r.re = s.r.im = 0; for (const r of this.met) r.re = r.im = 0; this.env = 0; }
    // the palme's twelve strings: the chromatic scale over an octave from a little below the note
    tunePalme(f) {
      this.fP = f;
      let b = f; while (b > 330) b /= 2; while (b < 165) b *= 2;
      for (const s of this.palme) s.r.set(b * Math.pow(2, s.k / 12) * (1 + 0.0007 * (this.rng.next() - 0.5)), 2.6 + 0.8 * this.rng.next());
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.sc = -1;   // (the scoop: from 25 cents below into the note)
      if (!this.fP) this.tunePalme(this.f);
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.04 * SR)));
      if (Math.abs(f - this.fP) > 0.03 * f) this.tunePalme(f);
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const tm = Math.max(0, Math.min(1, this.ys + p.klang * (1 - this.ys))) * 3, seg = Math.min(2, Math.floor(tm)), u = tm - seg;
      if (Math.abs(this.ys - this.yT) > 0.01) { this.yT = this.ys; this.bp.bp(Math.min(0.4 * SR, Math.max(f * 3, 1200)), 1.4); }
      const vd = p.vibrato * 35 / 1731, att = 1 - Math.exp(-1 / (0.018 * SR)), rel = 1 - Math.exp(-1 / (0.09 * SR)), envT = this.off ? 0 : 1;
      const og = R ? OND_OUT * Math.SQRT1_2 : OND_OUT, pg = 0.9 * p.palme * 6.9 / (3 * SR), mg = 1.2 * p.metall * 6.9 / (1.8 * SR),   // (a resonator rings 1/(1 − r) ≈ t60·SR/6.9 times its input on its pitch: the halo stays a halo)
        np = this.palme.length, met = this.met, nm = met.length;
      let ph = this.ph, vp = this.vp, lp = this.lp, env = this.env, sc = this.sc;
      for (let i = a; i < b; i++) {
        env += (envT - env) * (envT > env ? att : rel);
        vp += this.vr / SR; if (vp >= 1) { vp -= 1; this.vr = 5.3 + 0.7 * rng.next(); }
        sc *= 0.9993;
        const dt = f * (1 + vd * Math.sin(2 * Math.PI * vp) + 0.0145 * sc) / SR;
        ph += dt; if (ph >= 1) ph -= 1;
        // the four timbres (band-limited by PolyBLEP), two neighbours crossfaded
        let x = 0;
        for (let k = seg; k <= seg + 1 && k <= 3; k++) {
          const g = k === seg ? (seg === 3 ? 1 : 1 - u) : u; if (g <= 0) continue;
          let s;
          if (k === 0) s = Math.sin(2 * Math.PI * ph);
          else if (k === 1) { const q = ph + 0.5 >= 1 ? ph - 0.5 : ph + 0.5; s = (2 * ph - 1 - blep(ph, dt) - (2 * q - 1 - blep(q, dt))) * 0.55; }
          else if (k === 3) { const q = ph + 0.86 >= 1 ? ph - 0.14 : ph + 0.86, pu = (2 * ph - 1 - blep(ph, dt) - (2 * q - 1 - blep(q, dt))) * 0.5; s = this.bp.tick(pu) * 2.2 + pu * 0.35; }
          else s = (2 * ph - 1 - blep(ph, dt)) * 0.6;   // (k 2: Gambe, before the nasal pulse – the brightest last)
          x += s * g;
        }
        x *= env * this.vel;
        lp += 0.5 * (x - lp); x = 0.5 * (x + lp);
        // the diffuseurs: the palme's strings and the gong ring with the sound
        let pl = 0, pr = 0; for (let k = 0; k < np; k++) { const s = this.palme[k], v = s.r.tick(x * pg); pl += v * (1 - s.pan); pr += v * (1 + s.pan); }
        let mt = 0; for (let k = 0; k < nm; k++) mt += met[k].tick(x * mg);
        const dry = this.dc.tick(x);
        L[i] = this.dcL.tick((dry + pl * 2 + mt * 1.6) * og); if (R) R[i] = this.dcR.tick((dry + pr * 2 + mt * 1.6) * og);
      }
      this.ph = ph; this.vp = vp; this.lp = lp; this.env = env; this.sc = sc;
      for (const s of this.palme) { s.r.re = flush(s.r.re); s.r.im = flush(s.r.im); }
      for (const r of met) { r.re = flush(r.re); r.im = flush(r.im); }
    }
  }
