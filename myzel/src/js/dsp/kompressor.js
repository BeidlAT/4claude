  // ---- Verdichter: myzel-komp – a mixer channel's compressor (owner, 30.10.2026: „bau alle 3 Punkte ein“; the Summe's
  // Verdichtung is one for everything together, this one works on one channel – a Puls lane's hits, a plucked layer's
  // attacks). Without look-ahead (no delay in the channel). Detector: the peak of both sides (stereo-linked, one gain
  // for both), followed with Anschlag (attack) and Loslassen (release) times; the static curve in dB with a soft knee of
  // `knee` dB around the threshold, gain −over·(1 − 1/ratio); the release grows with how long and deep it has been
  // holding (program-dependent: up to 3× the set time after a long pressure – a sustained passage lets go smoothly, a
  // single hit comes back as set). Ausgleich (makeup) on the pressed signal, Mix blends it with the dry one (parallel
  // compression: the attacks stay, the body comes up). Ratio 1 = off: the input itself, sample for sample. It reports its
  // reduction (‹red›, dB, the deepest of 32 quanta) a few times a second. ----
  class Komp extends AudioWorkletProcessor {
    constructor() {
      super();
      this.thr = -18; this.ratio = 1; this.knee = 6; this.mix = 1; this.mk = 1; this.mkT = 1;
      this.setT(0.01, 0.15);
      this.env = 0; this.g = 1; this.hold = 0; this.red = 1; this.redN = 0; this.on = 0;
      this.gs = 1 - Math.exp(-1 / (0.0008 * sampleRate));   // (the gain smoothed over 0.8 ms – no zipper, attacks still kept)
      this.port.onmessage = (e) => {
        const m = e.data || {};
        if (m.thr != null) this.thr = Math.max(-60, Math.min(0, +m.thr));
        if (m.ratio != null) this.ratio = Math.max(1, Math.min(20, +m.ratio));
        if (m.knee != null) this.knee = Math.max(0, Math.min(24, +m.knee));
        if (m.mix != null) this.mix = Math.max(0, Math.min(1, +m.mix));
        if (m.mk != null) this.mkT = Math.pow(10, Math.max(-12, Math.min(24, +m.mk)) / 20);
        if (m.att != null || m.rel != null) this.setT(m.att != null ? +m.att : this.attS, m.rel != null ? +m.rel : this.relS);
      };
    }
    setT(att, rel) {
      this.attS = Math.max(0.0001, Math.min(0.1, att)); this.relS = Math.max(0.01, Math.min(2, rel));
      this.ca = 1 - Math.exp(-1 / (this.attS * sampleRate)); this.cr = 1 - Math.exp(-1 / (this.relS * sampleRate)); this.cr3 = 1 - Math.exp(-1 / (3 * this.relS * sampleRate));
    }
    process(inputs, outputs) {
      const I = inputs[0], O = outputs[0], n = O[0].length, iL = I && I[0], iR = I && (I[1] || I[0]), oL = O[0], oR = O[1] || null;
      const off = this.ratio <= 1 + 1e-6;
      if (off && this.on === 0 && Math.abs(this.g - 1) < 1e-4 && Math.abs(this.mk - this.mkT) < 1e-4) {   // (off and settled: the input itself)
        this.g = 1; this.env = 0; this.hold = 0; this.red = 1;
        for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; if (oR) oR[i] = iR ? iR[i] : 0; }
        return true;
      }
      // the blend into and out of work glides over 10 ms (so Ratio turned to 1 does not step)
      const onT = off ? 0 : 1, go = 1 - Math.exp(-1 / (0.01 * sampleRate)), mg = 1 - Math.exp(-1 / (0.02 * sampleRate));
      const thr = this.thr, k = this.knee, slope = 1 - 1 / this.ratio, ca = this.ca, mix = this.mix;
      let env = this.env, g = this.g, hold = this.hold, red = this.red, on = this.on, mk = this.mk;
      for (let i = 0; i < n; i++) {
        const xl = iL ? iL[i] : 0, xr = iR ? iR[i] : 0, x = Math.max(Math.abs(xl), Math.abs(xr));
        // the detector: up with the attack, down with the release – slower the longer it has been pressing
        if (x > env) { env += ca * (x - env); }
        else { const cr = this.cr + (this.cr3 - this.cr) * hold; env += cr * (x - env); }
        const d = env > 1e-7 ? 20 * Math.log10(env) - thr : -200;   // dB above the threshold
        let over = 0;
        if (k > 0 && d > -k / 2 && d < k / 2) over = (d + k / 2) * (d + k / 2) / (2 * k); else if (d >= k / 2) over = d;
        const want = over > 0 ? Math.pow(10, -over * slope / 20) : 1;
        g += this.gs * (want - g);
        if (over > 3) hold = Math.min(1, hold + 1 / (0.4 * sampleRate)); else hold = Math.max(0, hold - 1 / (1.5 * sampleRate));
        on += go * (onT - on); mk += mg * (this.mkT - mk);
        const wl = xl * g * mk, wr = xr * g * mk, m = on * mix;   // (the pressed, made up; blended with the dry by Mix – and faded while off)
        oL[i] = xl + (wl - xl) * m; if (oR) oR[i] = xr + (wr - xr) * m;
        if (g < red) red = g;
      }
      this.env = env < 1e-18 ? 0 : env; this.g = g; this.hold = hold; this.red = red; this.on = on < 1e-4 && onT === 0 ? 0 : on; this.mk = mk;
      if (++this.redN >= 32) { this.port.postMessage({ red: 20 * Math.log10(Math.max(1e-6, this.red)) }); this.red = 1; this.redN = 0; }
      return true;
    }
  }
