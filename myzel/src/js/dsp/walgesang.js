  // ---- Walgesang: myzel-wal – a humpback's moan under water (Klangbibliothek II, 26.10.2026). A song is phrases of
  // units: a tone that glides in a long arc – up into a cry, down into a moan, or a hump – with a throat formant that
  // follows it, now and then a creak or a burble (Knarren: pulses of the larynx, 20 … 60 a second). Held, the whale
  // sings on: a new unit every few seconds (Dauer), each a little different; every arc arrives on the note. Under water the top is gone, the sound
  // arrives smeared and the sea answers late (Tiefe: four allpasses, a long echo of the water). Höhe is the arc: low
  // on the field the deep moan that sinks, the middle a hump, high up the rising cry. ----
  const WAL_OUT = 0.34;
  class Wal extends MyzelProc {
    constructor(o) {
      super(o);
      this.rich = !!this.po.rich;
      this.p = { bogen: 0.6, dauer: 0.5, knarren: 0.3, tiefe: 0.6 };
      if (this.po.prm) this.set(this.po.prm);
      this.rng = new PRNG(this.po.seed || 43);
      this.fm = new Biquad(); this.fT = -1;
      this.ap = [0.0123, 0.0177, 0.0251, 0.0311].map((t) => ({ d: new Float32Array(Math.round(t * SR)), i: 0 }));
      this.ec = new Float32Array(1 << Math.ceil(Math.log2(0.6 * SR))); this.ecW = 0; this.lp = 0; this.lp2 = 0;
      this.ph = 0; this.cp = 0; this.u = 0; this.uN = 1; this.from = 0; this.to = 0; this.env = 0; this.uEnv = 0; this.ys = this.y; this.wob = 0;
      this.vel = 0.75; this.burst = false; this.gate = 0; this.next = 0;
    }
    set(p) { for (const k in p) if (k in this.p) this.p[k] = +p[k] || 0; }
    reset() { this.env = 0; for (const A of this.ap) A.d.fill(0); this.ec.fill(0); }
    apT(A, v) { const d = A.d, z = d[A.i], o = z - 0.6 * v; d[A.i] = v + 0.6 * o; A.i = A.i + 1 === d.length ? 0 : A.i + 1; return o; }
    // a unit: its arc (semitones from where it starts to where it ends, a hump goes up and back), its length
    unit() {
      const p = this.p, r = this.rng.next(), y = this.ys, dep = (1.5 + 6 * p.bogen) * (0.7 + 0.6 * r);
      this.kind = y < 0.38 ? 'moan' : y > 0.62 ? 'cry' : 'hump';
      // (every arc arrives on the note – the song stays in the key: the moan sinks into it, the cry rises into it, the
      // hump leaves it and comes back)
      if (this.kind === 'moan') { this.from = dep; this.to = 0; }
      else if (this.kind === 'cry') { this.from = -dep; this.to = 0; }
      else { this.from = 0; this.to = 0; this.hump = dep * 0.8; }
      this.u = 0; this.uN = Math.round((0.8 + 2.6 * p.dauer) * (0.75 + 0.5 * this.rng.next()) * SR);
      this.next = this.uN + Math.round((0.15 + 0.6 * this.rng.next()) * SR);
      this.cr = this.rng.next() < 0.3 + 0.6 * p.knarren ? 20 + 40 * this.rng.next() : 0;   // (this unit creaks)
    }
    start(m) {
      this.vel = m.vel != null ? m.vel : 0.75; this.burst = !!m.burst; this.gate = m.burst ? Math.round((m.gate || 0.22) * SR) : 0;
      if (!this.wasOn) { this.ys = this.y; this.wasOn = true; }
      this.rng = new PRNG((m.seed | 0) || 43); this.unit();
      if (this.burst) this.uN = Math.round(Math.max(0.12, m.gate || 0.22) * SR * 1.5);
    }
    stop() { this.off = true; }
    render(L, R, a, b) {
      const n = b - a, p = this.p, f = this.f, rng = this.rng;
      this.ys += (this.y - this.ys) * (1 - Math.exp(-n / (0.1 * SR)));
      if (this.burst) { this.gate -= n; if (this.gate <= 0) this.off = true; }
      const tf = 1 - Math.exp(-2 * Math.PI * (2400 - 1500 * p.tiefe) / SR), og = R ? WAL_OUT * 0.57 : WAL_OUT, wet = 0.15 + 0.5 * p.tiefe, EM = this.ec.length - 1, eD = Math.round((0.28 + 0.2 * p.tiefe) * SR);
      const att = 1 - Math.exp(-1 / (0.18 * SR)), rel = 1 - Math.exp(-1 / (0.35 * SR)), envT = this.off ? 0 : 1;
      let ph = this.ph, cp = this.cp, env = this.env, uEnv = this.uEnv, lp = this.lp, lp2 = this.lp2, wob = this.wob, ecW = this.ecW;
      for (let i = a; i < b; i++) {
        env += (envT - env) * (envT > env ? att : rel);
        // the unit's arc (a smooth step from → to; a hump rises and falls between), its own swell
        this.u++; const s = Math.min(1, this.u / this.uN), s6 = Math.min(1, s / 0.6), sm = s6 * s6 * (3 - 2 * s6);   // (arrived after 60 % of the unit)
        let semi = this.from + (this.to - this.from) * sm + (this.kind === 'hump' ? this.hump * Math.sin(Math.PI * s6) : 0);
        if ((i & 255) === 0) wob += ((rng.next() * 2 - 1) * 0.15 - wob) * 0.2;
        semi += wob;
        const uT = s < 1 ? (s < 0.1 ? s / 0.1 : s > 0.85 ? (1 - s) / 0.15 : 1) : 0; uEnv += (uT - uEnv) * 0.002;
        if (!this.off && this.u >= this.next) this.unit();
        const fr = f * Math.pow(2, semi / 12);
        ph += fr / SR; if (ph >= 1) ph -= 1;
        // the tone: a sine with a few harmonics, through the throat's formant (it follows the pitch)
        const sn = Math.sin(2 * Math.PI * ph);
        const hb = 0.4 + 1.2 * this.ys; let x = sn + 0.32 * hb * Math.sin(4 * Math.PI * ph) + 0.14 * hb * hb * Math.sin(6 * Math.PI * ph);   // (the cry is brighter than the moan)
        if ((i & 31) === 0) { const ff = Math.min(0.4 * SR, Math.max(300, fr * 2.4)); if (Math.abs(ff - this.fT) > 0.01 * ff) { this.fT = ff; this.fm.peak(ff, 2.5, 8); } }
        x = this.fm.tick(x) * 0.5;
        // the creak: the larynx pulses
        if (this.cr) { cp += this.cr / SR; if (cp >= 1) cp -= 1; x *= 1 - 0.7 * p.knarren * (cp < 0.35 ? 0 : 1); }
        x *= env * uEnv * this.vel;
        // under water: the top taken, smeared, the sea's echo
        lp += tf * (x - lp); lp2 += tf * (lp - lp2);
        let v = lp2; for (let k = 0; k < 4; k++) v = this.apT(this.ap[k], v);
        const e = this.ec[(ecW - eD) & EM]; this.ec[ecW & EM] = v * 0.6 + e * 0.45; ecW++;
        const o = lp2 * (1 - 0.5 * wet) + (v + e) * wet;
        L[i] = o * og; if (R) R[i] = (lp2 * (1 - 0.5 * wet) + (v * 0.7 + e * 1.2) * wet) * og;
      }
      this.ph = ph; this.cp = cp; this.env = env; this.uEnv = uEnv; this.lp = lp; this.lp2 = lp2; this.wob = wob; this.ecW = ecW;
    }
  }
