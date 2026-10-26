  // ---- Tunnel: myzel-tnl – a jet through a tuned tube (Klangbibliothek II, 26.10.2026). A source of noise and a saw
  // (Rauschen: how much of each) rings in a comb tuned to the note – its harmonics stand in the noise like a tone in
  // a pipe – and passes a through-zero flanger: two copies of it, one held at 3 ms, the other swept from before it to
  // after it, so the notch sweep passes through zero (the jet plane, the tape flange of psychedelic records). Höhe is
  // the pull („Sog“): low on the field the comb barely rings and the sweep is shallow, high up the tube howls and the
  // sweep plunges through. Tempo is the sweep's speed, Tiefe its depth, Breite turns the right channel's sweep away. ----
  const TNL_OUT = 0.22;
  class Tnl extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { tempo: 0.3, tiefe: 0.7, rauschen: 0.45, breite: 0.5 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 59);
      this.cb = new Float32Array(1 << Math.ceil(Math.log2(SR / 20 + 8))); this.cbW = 0; this.cz = 0;
      this.fb = new Float32Array(1 << Math.ceil(Math.log2(0.03 * SR))); this.fbW = 0;
      this.ph = 0; this.lfo = this.rng.next(); this.env = 0; this.ys = this.y; this.pk1 = 0; this.pk2 = 0; this.fl = 0; this.flR = 0;
      this.dc = new DcBlock(20); this.dcR = new DcBlock(20); this.vel = 0.75; this.burst = false; this.gate = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.cb.fill(0); this.fb.fill(0); this.env = 0; this.cz = 0; }
    start(m) { this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0; if (!this.wasOn) { this.ys = this.y; this.wasOn = true; } }
    stop() { this.off = true; }
    rdF(b, pos) { const m = b.length - 1, i = Math.floor(pos), f = pos - i, x0 = b[i & m]; return x0 + f * (b[(i + 1) & m] - x0); }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.05 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const sog = this.ys, g = 0.55 + 0.43 * Math.pow(sog, 0.7), damp = 0.35 + 0.55 * sog, per = Math.max(2, SR / f - pd1(damp, f));   // (the loop's low pass delays: the tube stays in tune)
      const d0 = 0.003 * SR, depth = d0 * (0.3 + 0.7 * p.tiefe) * (0.4 + 0.6 * sog), rate = 0.03 + 1.6 * p.tempo * p.tempo, off = 0.5 * p.breite;
      const nz = p.rauschen, dt = f / SR, att = 1 - Math.exp(-1 / (0.04 * SR)), rel = 1 - Math.exp(-1 / (0.25 * SR)), envT = this.off ? 0 : 1, og = R ? TNL_OUT * Math.SQRT1_2 : TNL_OUT;
      const CM = this.cb.length - 1, FM = this.fb.length - 1, cb = this.cb, fbb = this.fb;
      let ph = this.ph, lfo = this.lfo, env = this.env, cz = this.cz, cbW = this.cbW, fbW = this.fbW, pk1 = this.pk1, pk2 = this.pk2;
      for (let i = a; i < b; i++) {
        env += (envT - env) * (envT > env ? att : rel);
        // the source: a saw (PolyBLEP) and pinkish noise
        ph += dt; if (ph >= 1) ph -= 1;
        const w = rng.next() * 2 - 1; pk1 = 0.97 * pk1 + 0.03 * w; pk2 = 0.6 * pk2 + 0.4 * w;
        const src = ((2 * ph - 1 - blep(ph, dt)) * (1 - nz) * 0.5 + (pk1 * (3 - 2 * sog) + pk2 * (0.4 + 1.8 * sog)) * nz * 0.5) * env * this.vel;   // (the pull draws a brighter jet)
        // the comb, tuned to the note (a damped loop: the tube)
        const o = this.rdF(cb, cbW - per); cz += damp * (o - cz);
        cb[cbW & CM] = src + cz * g; cbW++;
        const tube = this.dc.tick(o * (1 - g) * 2.2 + src * 0.25);
        // the through-zero flanger: the held copy at d0, the swept one around it (crossing it)
        fbb[fbW & FM] = tube; fbW++;
        lfo += rate / SR; if (lfo >= 1) lfo -= 1;
        const sw = Math.sin(2 * Math.PI * lfo), swR = Math.sin(2 * Math.PI * (lfo + off));
        const held = this.rdF(fbb, fbW - 1 - d0), mov = this.rdF(fbb, fbW - 1 - (d0 + depth * sw)), movR = this.rdF(fbb, fbW - 1 - (d0 + depth * swR));
        const l = (held + mov) * 0.5, r = (held + movR) * 0.5;
        L[i] = l * og; if (R) R[i] = (this.rich ? r : l) * og;
      }
      this.ph = ph; this.lfo = lfo; this.env = env; this.cz = flush(cz); this.cbW = cbW; this.fbW = fbW; this.pk1 = pk1; this.pk2 = pk2;
    }
  }
