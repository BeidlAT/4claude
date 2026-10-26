  // ---- (owner, 26.10.2026: „mit dem Touché viel weitreichendere Klangformung – F5 bis F12, jede klingt fundamental
  // anders“) the Touché's insert: what the hand does to the sound as it is played, in the strips Klang and Ebene 2 (so a
  // Schleife records it). One processor, one Spielweise at a time; the four directions arrive as c = [weg, heran, links,
  // rechts] (0 … 1, the page's calibrated values) and glide here per sample (12 ms). At rest – every direction 0, every
  // tail rung out – the output is the input sample for sample (the page then takes it out of the path again and reports
  // nothing changed). The input is always written into a ring of ≈ 10.9 s (the cloud, the freeze, the stutter read it).
  //   koerner   a cloud of grains from what was just played: weg denser, heran sprays the pitch (octaves, fifths) and
  //             turns grains round, links reaches back in time (up to 6 s), rechts scatters them wide
  //   eis       a press freezes the sound of that moment (0.6 s, grains at random places – it stands still and breathes);
  //             the pressure is its level, links/rechts transpose it (±1 octave, gliding), weg smears it into a wash,
  //             heran darkens it and adds the octave below
  //   oberton   4× oversampled: weg the drive, links even harmonics (asymmetric – warm, octave-like), rechts odd ones
  //             (hollow, square), heran folds the wave (rough, metallic)
  //   (Fächer is played by the instrument itself – real voices, js/midi/touche-fx.js: a pitch shifter here warbled)
  //   stottern  a press repeats the moment just heard, in the Puls's tempo: links long (a beat) … rechts short (1/16 beat),
  //             weg slows the tape down, heran lets each repetition fade and darken
  //   resonanz  six strings tuned to the held notes (else the key) ring with what is played: the pressure holds them
  //             longer, weg brighter, heran inharmonic like a bell, links/rechts bend their tuning ±1 octave
  class Tfx extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const N = 1 << 19;
      this.N = N; this.M = N - 1; this.bL = new Float32Array(N); this.bR = new Float32Array(N); this.w = 0;
      this.mode = ''; this.ct = new Float32Array(4); this.c = new Float32Array(4); this.a = 1 - Math.exp(-1 / (0.012 * SR));
      this.beat = 0.5; this.freqs = [220, 277.2, 329.6, 440, 554.4, 659.3]; this.alive = true; this.idle = true; this.idleN = 0; this.rep = -1;
      this.rnd = new PRNG(0x5eed1);
      // grains (koerner, eis): a pool of 96
      const G = 96; this.gn = G; this.gOn = new Uint8Array(G); this.gPos = new Float64Array(G); this.gRate = new Float32Array(G); this.gLen = new Float32Array(G); this.gT = new Float32Array(G); this.gL = new Float32Array(G); this.gR = new Float32Array(G); this.gSrc = new Uint8Array(G);
      this.gNext = 0; this.gAmp = 0;
      // eis: the frozen moment
      this.fN = Math.round(0.6 * SR); this.fL = new Float32Array(this.fN); this.fR = new Float32Array(this.fN); this.frozen = false; this.fLvl = 0; this.fLow = 0; this.fOff = 0; this.lpL = 0; this.lpR = 0;
      this.ap = [0.0071, 0.0113, 0.0167, 0.0229, 0.0083, 0.0127, 0.0151, 0.0241].map((t) => ({ d: new Float32Array(Math.round(t * SR)), i: 0 }));   // (eis: two diffusers, L and R)
      // oberton: the 4× oversampler (a 64-tap windowed sinc at the 4× rate, polyphase) and its state
      this.os = this.osDesign(); this.uL = new Float32Array(16); this.uR = new Float32Array(16); this.dL = new Float32Array(64); this.dR = new Float32Array(64); this.ui = 0; this.di = 0; this.dcL = new DcBlock(12); this.dcR = new DcBlock(12); this.obMix = 0;
      // stottern
      this.st = { on: false, start: 0, len: 0, ph: 0, rate: 1, mix: 0, g: 1, lp: 0, lpR: 0, n: 0 };
      // resonanz: six strings (delay line, loop low pass, a dispersion allpass)
      this.rs = [0, 1, 2, 3, 4, 5].map(() => ({ b: new Float32Array(4096), w: 0, z: 0, ap: 0, apx: 0, d: 200 })); this.rsLvl = 0; this.rsHp = 0; this.rsHpx = 0; this.rsEnv = 0;
      // (tests and offline renders: the Spielweise and the hand from the start)
      const po = (o && o.processorOptions) || {};
      if (po.mode) this.setMode(po.mode);
      if (po.c) for (let i = 0; i < 4; i++) this.ct[i] = this.c[i] = Math.max(0, Math.min(1, +po.c[i] || 0));
      if (po.beat) this.beat = po.beat; if (po.freqs) this.freqs = po.freqs.slice(0, 6);
      this.port.onmessage = (e) => { const m = e.data || {}; if (m.kill) { this.alive = false; return; } if (m.mode != null && m.mode !== this.mode) this.setMode(m.mode); if (m.c) for (let i = 0; i < 4; i++) this.ct[i] = Math.max(0, Math.min(1, +m.c[i] || 0)); if (m.beat) this.beat = Math.max(0.05, Math.min(4, +m.beat)); if (m.freqs && m.freqs.length) this.freqs = m.freqs.slice(0, 6); };
    }
    setMode(m) { this.mode = m; this.gOn.fill(0); this.frozen = false; this.fLvl = 0; this.st.on = false; this.st.mix = 0; this.obMix = 0; this.rsLvl = 0; for (const r of this.rs) { r.b.fill(0); r.z = r.ap = r.apx = 0; } this.idle = false; this.idleN = 0; }
    // 4× windowed-sinc low pass (cut-off at 0.45 of the original Nyquist), as 4 phases of 16
    osDesign() {
      const T = 64, h = new Float32Array(T), fc = 0.45 / 4; let s = 0;
      for (let i = 0; i < T; i++) { const x = i - (T - 1) / 2, w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (T - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (T - 1)); h[i] = (x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x)) * w; s += h[i]; }
      for (let i = 0; i < T; i++) h[i] /= s;
      return h;
    }
    // Hermite read of the ring at an absolute position
    rd(b, p) { const M = this.M, i = Math.floor(p), f = p - i, x0 = b[(i - 1) & M], x1 = b[i & M], x2 = b[(i + 1) & M], x3 = b[(i + 2) & M], c = (x2 - x0) * 0.5, v = x1 - x2, w = c + v, a = w + v + (x3 - x1) * 0.5, bn = w + a; return ((a * f - bn) * f + c) * f + x1; }
    rdF(b, p) { const n = this.fN, i = Math.floor(p), f = p - i, at = (k) => b[((k % n) + n) % n], x0 = at(i - 1), x1 = at(i), x2 = at(i + 1), x3 = at(i + 2), c = (x2 - x0) * 0.5, v = x1 - x2, w = c + v, a = w + v + (x3 - x1) * 0.5, bn = w + a; return ((a * f - bn) * f + c) * f + x1; }
    apT(A, v) { const d = A.d, z = d[A.i], o = z - 0.62 * v; d[A.i] = v + 0.62 * o; A.i = A.i + 1 === d.length ? 0 : A.i + 1; return o; }
    grain(pos, rate, len, pan, src) {
      const G = this.gn; for (let k = 0; k < G; k++) if (!this.gOn[k]) { this.gOn[k] = 1; this.gPos[k] = pos; this.gRate[k] = rate; this.gLen[k] = Math.max(64, len); this.gT[k] = 0; const a = (pan + 1) * Math.PI / 4; this.gL[k] = Math.cos(a); this.gR[k] = Math.sin(a); this.gSrc[k] = src; return; }
    }
    process(inputs, outputs) {
      if (!this.alive) return false;
      const I = inputs[0], O = outputs[0], oL = O[0], oR = O[1] || O[0], n = oL.length;
      const iL = I && I[0] ? I[0] : null, iR = I && I[1] ? I[1] : iL;
      const bL = this.bL, bR = this.bR, M = this.M;
      // the input into the ring
      for (let i = 0; i < n; i++) { const x = iL ? iL[i] : 0, y = iR ? iR[i] : x; bL[(this.w + i) & M] = x; bR[(this.w + i) & M] = y; }
      const w0 = this.w; this.w += n;
      const c = this.c, ct = this.ct, a = this.a;
      let busy = false;
      // the controls glide (per block: their value at its end – 12 ms smoothing, 128 frames are 2.7 ms)
      const c0 = [c[0], c[1], c[2], c[3]];
      for (let k = 0; k < 4; k++) { const g = 1 - Math.pow(1 - a, n); c[k] += (ct[k] - c[k]) * g; if (Math.abs(ct[k] - c[k]) < 1e-5) c[k] = ct[k]; if (c[k] > 0 || ct[k] > 0) busy = true; }
      const md = this.mode;
      if (md === 'koerner' || md === 'eis') busy = this.grains(md, I, iL, iR, oL, oR, n, w0, c0) || busy;
      else if (md === 'oberton') busy = this.oberton(iL, iR, oL, oR, n, c0) || busy;
      else if (md === 'stottern') busy = this.stottern(iL, iR, oL, oR, n, w0, c0) || busy;
      else if (md === 'resonanz') busy = this.resonanz(iL, iR, oL, oR, n, c0) || busy;
      else for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; oR[i] = iR ? iR[i] : 0; }
      // idle: told once (the page takes the insert out of the path – its output is the input again)
      if (!busy) { if (++this.idleN === 8 && !this.idle) { this.idle = true; this.port.postMessage({ idle: 1 }); } }
      else { this.idleN = 0; if (this.idle) { this.idle = false; this.port.postMessage({ idle: 0 }); } }
      return true;
    }
    // per frame i of the block: a control linearly from its start to its end
    lerp(c0, k, i, n) { return c0[k] + (this.c[k] - c0[k]) * (i + 1) / n; }
    grains(md, I, iL, iR, oL, oR, n, w0, c0) {
      const c = this.c, weg = c[0], her = c[1], li = c[2], re = c[3], p = Math.max(weg, her, li, re), R = this.rnd, eis = md === 'eis';
      // eis: a press freezes (above 6 %), released below 2 % for a quarter second it lets the next press freeze anew
      if (eis) {
        if (!this.frozen && p > 0.06) { const s0 = w0 + n - this.fN; for (let k = 0; k < this.fN; k++) { this.fL[k] = this.bL[(s0 + k) & this.M]; this.fR[k] = this.bR[(s0 + k) & this.M]; } this.frozen = true; this.fOff = 0; }
        if (this.frozen && p < 0.02) { this.fOff += n; if (this.fOff > 0.25 * SR && this.fLvl < 1e-4) this.frozen = false; } else this.fOff = 0;
      }
      // spawning: koerner from pressure on, eis while frozen
      const want = eis ? this.frozen : p > 0.003;
      if (want) {
        const dens = eis ? 18 + 22 * weg : 6 + 74 * Math.pow(weg, 1.2) + 10 * p, gap = SR / dens;
        while (this.gNext < n) {
          if (eis) {
            const len = (0.16 + 0.34 * weg) * SR, semi = 12 * (re - li), sp = 1 + weg * 0.012 * (R.next() * 2 - 1), low = R.next() < her * 0.5;
            const rate = Math.pow(2, semi / 12) * sp * (low ? 0.5 : 1), room = this.fN - len * Math.abs(rate) - 8;
            this.grain(4 + R.next() * Math.max(1, room), rate, len, (R.next() * 2 - 1) * (0.35 + 0.5 * weg), low ? 2 : 1);
          } else {
            const len = (0.035 + 0.17 * (1 - 0.6 * weg) + 0.12 * re) * SR;
            let rate = 1; if (R.next() < her) { const iv = [12, -12, 7, 19, -5, 24][Math.floor(R.next() * 6)]; rate = Math.pow(2, iv / 12); }
            if (R.next() < her * 0.45) rate = -rate;
            const back = (0.06 + 6 * Math.pow(li, 1.5)) * SR + R.next() * (0.02 + 1.6 * re) * SR, need = len * Math.abs(rate) + 64;
            const pos = w0 + this.gNext - Math.max(back, need);
            this.grain(rate < 0 ? pos + len * Math.abs(rate) : pos, rate, len, (R.next() * 2 - 1) * (0.25 + 0.6 * re + 0.3 * weg), 0);
          }
          this.gNext += gap * (0.6 + 0.8 * R.next());
        }
      }
      this.gNext = Math.max(0, this.gNext - n);
      // the grains' sum, normalised by how many overlap (≈ density × length)
      const G = this.gn, gOn = this.gOn, gPos = this.gPos, gRate = this.gRate, gLen = this.gLen, gT = this.gT, gLv = this.gL, gRv = this.gR;
      let act = 0; for (let k = 0; k < G; k++) if (gOn[k]) act++;
      const ovl = eis ? (18 + 22 * weg) * (0.16 + 0.34 * weg) : (6 + 74 * Math.pow(weg, 1.2)) * (0.035 + 0.17 * (1 - 0.6 * weg) + 0.12 * re), norm = 1 / Math.sqrt(Math.max(1, ovl * 0.5));
      // levels: koerner – the cloud rises with the pressure, the dry sound gives way a little; eis – the frozen layer is
      // the pressure (glides 120 ms, so a release lets it fade), the dry stays
      const lvT = eis ? (this.frozen ? Math.pow(p, 0.7) : 0) : Math.min(1, p * 1.4);
      const lg = 1 - Math.exp(-1 / ((eis ? 0.12 : 0.03) * SR));
      const low = 0.02 + 0.98 * Math.pow(1 - her, 2), lpc = 1 - Math.exp(-2 * Math.PI * (300 + 15000 * low) / SR);
      let lv = this.gAmp, any = act > 0;
      for (let i = 0; i < n; i++) {
        lv += (lvT - lv) * lg;
        let sL = 0, sR = 0;
        if (any) for (let k = 0; k < G; k++) {
          if (!gOn[k]) continue;
          const t = gT[k], L = gLen[k], wv = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / L), p2 = gPos[k] + t * gRate[k];
          let x, y; if (this.gSrc[k]) { x = this.rdF(this.fL, p2); y = this.rdF(this.fR, p2); if (this.gSrc[k] === 2) { x *= 0.5 + her; y *= 0.5 + her; } } else { x = this.rd(this.bL, p2); y = this.rd(this.bR, p2); }
          const m = 0.5 * (x + y) * 0.7071;   // (half its own stereo, half the mono at its place)
          sL += wv * (0.5 * x + m * gLv[k]); sR += wv * (0.5 * y + m * gRv[k]);
          if ((gT[k] = t + 1) >= L) gOn[k] = 0;
        }
        sL *= norm; sR *= norm;
        if (eis) {   // dark (heran) and smeared (weg: four allpasses, a wash)
          this.lpL += (sL - this.lpL) * lpc; this.lpR += (sR - this.lpR) * lpc; sL = this.lpL; sR = this.lpR;
          if (weg > 0.01) { const AP = this.ap; let u = sL, v = sR; for (let q = 0; q < 4; q++) { u = this.apT(AP[q], u); v = this.apT(AP[q + 4], v); } sL += weg * 0.85 * (u - sL); sR += weg * 0.85 * (v - sR); }
        }
        const x = iL ? iL[i] : 0, y = iR ? iR[i] : x, dry = eis ? 1 : 1 - 0.45 * lv;
        oL[i] = x * dry + sL * lv; oR[i] = y * dry + sR * lv;
      }
      this.gAmp = lv;
      if (lv < 1e-5 && lvT === 0) this.gAmp = 0;
      return any || lv > 1e-5 || (eis && this.frozen);
    }
    oberton(iL, iR, oL, oR, n, c0) {
      const h = this.os, T = h.length, uL = this.uL, uR = this.uR, dL = this.dL, dR = this.dR;
      const tgt = Math.max(this.c[0], this.c[1], this.c[2], this.c[3]) > 0.004 ? 1 : 0;   // (in at once over 10 ms – a light hand shapes lightly: the drive starts at unity)
      const mg = 1 - Math.exp(-1 / (0.01 * SR));
      let mx = this.obMix;
      if (tgt === 0 && mx < 1e-5) { this.obMix = 0; for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; oR[i] = iR ? iR[i] : 0; } uL.fill(0); uR.fill(0); dL.fill(0); dR.fill(0); return false; }
      for (let i = 0; i < n; i++) {
        mx += (tgt - mx) * mg;
        const weg = this.lerp(c0, 0, i, n), her = this.lerp(c0, 1, i, n), li = this.lerp(c0, 2, i, n), re = this.lerp(c0, 3, i, n);
        const g = 1 + 9 * weg * weg + 1.5 * (li + re + her), b = 0.9 * li, tb = Math.tanh(b), fold = her, comp = 1 / Math.pow(g * (1 - tb * tb), 0.75);
        const x = iL ? iL[i] : 0, y = iR ? iR[i] : x;
        this.ui = (this.ui + 1) & 15; uL[this.ui] = x; uR[this.ui] = y;
        let aL = 0, aR = 0;
        for (let ph = 0; ph < 4; ph++) {   // the four sub-samples: interpolated (polyphase), shaped, into the decimator's line
          let s = 0, t = 0; for (let k = ph, j = this.ui; k < T; k += 4, j = (j - 1) & 15) { s += h[k] * uL[j]; t += h[k] * uR[j]; }
          s *= 4; t *= 4;
          const sh = (v) => { const z = v * g; let o = Math.tanh(z + b) - tb; o += re * 0.45 * (4 * o * o * o - 3 * o) * 0.5; if (fold > 0) o = o * (1 - fold) + Math.sin(1.5707963 * z * (1 + 2.5 * fold)) * fold * 0.8; return o * comp; };
          this.di = (this.di + 1) & 63; dL[this.di] = sh(s); dR[this.di] = sh(t);
        }
        for (let k = 0, j = this.di; k < T; k++, j = (j - 1) & 63) { aL += h[k] * dL[j]; aR += h[k] * dR[j]; }
        aL = this.dcL.tick(aL); aR = this.dcR.tick(aR);
        // (the shaped path is ≈ 16 samples late – up and down: in and out it crossfades in 10 ms, never held between)
        oL[i] = (iL ? iL[i] : 0) * (1 - mx) + aL * mx; oR[i] = (iR ? iR[i] : 0) * (1 - mx) + aR * mx;
      }
      this.obMix = mx;
      return true;
    }
    stottern(iL, iR, oL, oR, n, w0, c0) {
      const c = this.c, ct = this.ct, weg = c[0], her = c[1], p = Math.max(ct[0], ct[1], ct[2], ct[3]), S = this.st;
      // the division of a beat: links a whole beat … rechts a sixteenth (in steps – a stutter is in time; from where the
      // hand is going, not the glide on its way there)
      const sd = ct[3] - ct[2], steps = [1, 0.5, 0.25, 0.125, 0.0625], k = Math.max(0, Math.min(4, Math.round((sd + 1) * 2))), len = Math.max(64, Math.round(steps[k] * this.beat * SR));
      if (!S.on && p > 0.08) { S.on = true; S.len = len; S.start = w0 - len; S.ph = 0; S.g = 1; S.n = 0; }
      else if (S.on && p < 0.04) S.on = false;
      const mg = 1 - Math.exp(-1 / (0.004 * SR)), X = Math.min(Math.round(0.003 * SR), S.len >> 2);
      let mix = S.mix;
      if (!S.on && mix < 1e-5) { S.mix = 0; for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; oR[i] = iR ? iR[i] : 0; } return false; }
      const rT = 1 - 0.75 * weg, dec = 1 - 0.55 * her, lpc = 1 - Math.exp(-2 * Math.PI * (200 + 18000 * Math.pow(1 - her, 2)) / SR);
      for (let i = 0; i < n; i++) {
        mix += ((S.on ? 1 : 0) - mix) * mg;
        S.rate += (rT - S.rate) * 0.0005;
        // at a repetition's end: the next (a new division takes over there), its level a step down with heran
        if (S.ph >= S.len) { S.ph -= S.len; S.n++; S.g *= dec; if (S.on && len !== S.len) S.len = len; }
        const t = S.ph, pos = S.start + t;
        let x = this.rd(this.bL, pos), y = this.rd(this.bR, pos);
        if (t < X) { const e = t / X; x = x * e + this.rd(this.bL, pos + S.len) * (1 - e); y = y * e + this.rd(this.bR, pos + S.len) * (1 - e); }   // (the seam: the slice's own continuation fades under its start)
        S.lp += (x - S.lp) * lpc; S.lpR += (y - S.lpR) * lpc;
        const g = S.g; x = S.lp * g; y = S.lpR * g;
        oL[i] = (iL ? iL[i] : 0) * (1 - mix) + x * mix; oR[i] = (iR ? iR[i] : 0) * (1 - mix) + y * mix;
        S.ph += S.rate;
      }
      S.mix = mix;
      return true;
    }
    resonanz(iL, iR, oL, oR, n, c0) {
      const c = this.c, weg = c[0], her = c[1], li = c[2], re = c[3], p = Math.max(weg, her, li, re), RS = this.rs;
      // the strings ring longer the harder the hand (a release shortens them: they ring out); the wet level holds 4 s after
      const t60 = 0.25 + 9 * Math.pow(p, 1.4), lvT = p > 0.002 ? 1 : 0, lg = 1 - Math.exp(-1 / ((lvT ? 0.05 : 4) * SR));
      const bend = Math.pow(2, (re - li)), damp = 0.15 + 0.8 * weg, disp = 0.55 * her;
      let lv = this.rsLvl;
      if (lvT === 0 && lv < 1e-5) { this.rsLvl = 0; let e = 0; for (const r of RS) e += Math.abs(r.z); for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; oR[i] = iR ? iR[i] : 0; } return e > 1e-6; }
      for (let s = 0; s < 6; s++) { const r = RS[s], f = Math.max(30, Math.min(3000, (this.freqs[s % this.freqs.length] || 220) * bend * (1 + (her * 0.013 * (s - 2.5))))); r.dT = SR / f; if (!r.d0) { r.d = r.dT; r.d0 = 1; } r.g = Math.pow(0.001, (r.dT) / (t60 * SR)); r.ex = 1.5 * Math.sqrt(1 - r.g); }   // (a long ring builds up: its drive the less)
      const hpc = 1 - Math.exp(-2 * Math.PI * 120 / SR);
      for (let i = 0; i < n; i++) {
        lv += (lvT - lv) * lg;
        const x = iL ? iL[i] : 0, y = iR ? iR[i] : x, m = 0.5 * (x + y);
        this.rsHp += (m - this.rsHp) * hpc; const ex0 = m - this.rsHp;
        let sL = 0, sR = 0;
        for (let s = 0; s < 6; s++) {
          const r = RS[s], b = r.b; r.d += (r.dT - r.d) * 0.002;
          const pos = r.w - r.d, i0 = Math.floor(pos), f = pos - i0, a0 = b[i0 & 4095], a1 = b[(i0 + 1) & 4095], o = a0 + f * (a1 - a0);
          r.z += (o - r.z) * damp;
          // (heran: a dispersion allpass in the loop – partials stretch apart, a bell)
          let u = r.z; if (disp > 0) { const ap = -disp * u + r.apx + disp * r.ap; r.apx = u; r.ap = ap; u = ap; }
          b[r.w & 4095] = ex0 * r.ex + u * r.g; r.w++;
          if (s & 1) sR += o; else sL += o;
        }
        // (a guard over the strings: a held note at their own tuning builds them up – the level is held under 0.5, gently)
        const pk = Math.max(Math.abs(sL), Math.abs(sR)) * 0.5; this.rsEnv = pk > this.rsEnv ? this.rsEnv + (pk - this.rsEnv) * 0.01 : this.rsEnv * 0.99995;
        const ag = this.rsEnv > 0.5 ? 0.5 / this.rsEnv : 1;
        oL[i] = x + sL * 0.5 * ag * lv; oR[i] = y + sR * 0.5 * ag * lv;
      }
      this.rsLvl = lv;
      return true;
    }
  }
