const ENGINES = {
  neb: {
    sustain: true,
    start(v, t, f, y, vel, o) {
      const filt = v.n(BQ('lowpass', nebCut(y), P['neb.res']));
      const spread = P['neb.spread'], w = P['v.width'];
      const oscs = [];
      // level 3: seven oscillators across the detune range, each wandering on its own; same loudness as three
      const ks = Q.rich ? [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1] : [-1, 0, 1];
      const og = 0.2 * Math.sqrt(3 / ks.length);
      ks.forEach((k, i) => {
        const osc = v.s(OSC(P['neb.wave'], f));
        osc.detune.value = k * spread + rand(-2, 2);
        v.mod(osc.detune);
        if (Q.rich) v.lnk(A.uni[i % 4], osc.detune);
        osc.connect(v.n(G(og))).connect(v.n(PAN(k * 0.75 * w))).connect(filt);
        oscs.push({ osc, mul: 1 });
      });
      if (P['neb.sub'] > 0.001) {
        const sub = v.s(OSC('sine', f / 2)); v.mod(sub.detune);
        sub.connect(v.n(G(0.4 * P['neb.sub']))).connect(filt);
        oscs.push({ osc: sub, mul: 0.5 });
      }
      let bp = null, ns = null;
      if (P['neb.breath'] > 0.001) {
        ns = v.s(noiseSrc());
        bp = v.n(BQ('bandpass', f * 2, 1.4));
        ns.connect(bp).connect(v.n(G(0.9 * P['neb.breath']))).connect(filt);
      }
      filt.connect(v.out);
      for (const s of v.srcs) { if (s === ns) s.start(t, rand(0, 1.8)); else s.start(t); }
      const peak = vel * 0.48;
      v.filt = filt;
      v.setF = (nf, glide) => { for (const x of oscs) glideTo(x.osc.frequency, nf * x.mul, glide); if (bp) glideTo(bp.frequency, nf * 2, glide); };
      v.setY = (ny) => setP(filt.frequency, nebCut(ny), 0.04);
      if (o.burst) burstEnv(v, t, peak, P['neb.att'], o.gate, Math.min(P['neb.rel'], 3));
      else { adsrStart(v, t, peak, P['neb.att']); v.release = sustainRelease(v, P['neb.rel']); }
    },
  },
  kor: {
    sustain: true,
    start(v, t, f, y, vel, o) {
      const src = korSource();
      // grains share four fixed stereo positions per finger instead of one panner each
      const w = P['v.width'];
      const pans = (Q.rich ? [-1, -0.71, -0.43, -0.14, 0.14, 0.43, 0.71, 1] : [-1, -0.33, 0.33, 1]).map((x) => { const p = v.n(PAN(x * w)); p.connect(v.out); return p; });
      v.kor = { f, y, next: t, buf: src && src.buf, rev: src && src.rev, ref: src ? src.ref : TEX_F, pans };
      const peak = vel * 0.55;
      A.grainVoices.add(v);
      v.setF = (nf) => { v.kor.f = nf; };
      v.setY = (ny) => { v.kor.y = ny; };
      if (o.burst) burstEnv(v, t, peak, Math.min(P['kor.att'], 0.03), o.gate, Math.min(P['kor.rel'], 2));
      else { adsrStart(v, t, peak, P['kor.att']); v.release = sustainRelease(v, P['kor.rel']); }
    },
  },
  hau: {
    sustain: true,
    start(v, t, f, y, vel, o) {
      const q = P['hau.q'];
      const fc = hauFreq(f, y);
      // level 3: three bands, slightly apart and spread left to right, each with its own noise
      const n = Q.rich ? 3 : 1, gn = 0.78 / Math.sqrt(n), bands = [];
      for (let i = 0; i < n; i++) {
        const ns = v.s(noiseSrc());
        const bp = v.n(BQ('bandpass', fc, q));
        if (n > 1) bp.detune.value = (i - 1) * (8 + 40 / Math.sqrt(q));
        v.mod(bp.detune);
        const g = v.n(G(hauGain(fc, q) * gn));
        ns.connect(bp).connect(g);
        if (n > 1) g.connect(v.n(PAN((i - 1) * 0.7 * P['v.width']))).connect(v.out); else g.connect(v.out);
        ns.start(t, rand(0, 1.8));
        bands.push({ bp, g });
      }
      const peak = vel;
      const retune = (c, glide) => { for (const b of bands) { if (glide != null) glideTo(b.bp.frequency, c, glide); else setP(b.bp.frequency, c, 0.04); setP(b.g.gain, hauGain(c, q) * gn, 0.05); } };
      v.setF = (nf, glide) => { v.f = nf; retune(hauFreq(nf, v.y), glide || 0); };
      v.setY = (ny) => { v.y = ny; retune(hauFreq(v.f, ny)); };
      v.f = f; v.y = y;
      if (o.burst) burstEnv(v, t, peak, 0.002, Math.max(0.005, o.gate * 0.1), P['hau.burst'] * (o.decayMul || 1));
      else { adsrStart(v, t, peak, P['hau.att']); v.release = sustainRelease(v, P['hau.rel']); }
    },
  },
  glo: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      const decay = P['glo.decay'] * (o.decayMul || 1) * (0.6 + 0.8 * y);
      const ratio = P['glo.ratio'], idx = P['glo.index'] * (0.3 + 1.4 * y);
      const dev = Math.min(idx * f * ratio, SR * 0.18);
      // level 3: two bells a few cents apart, left and right, shimmer against each other
      const sides = Q.rich ? [-1, 1] : [0], k = Q.rich ? 0.68 : 1, srcs = [];
      for (const side of sides) {
        const car = v.s(OSC('sine', f)), car2 = v.s(OSC('sine', f + P['glo.beat'])), mod = v.s(OSC('sine', f * ratio * (1 + side * 0.0015)));
        car.detune.value = car2.detune.value = side * 3.5;
        v.mod(car.detune); v.mod(car2.detune); v.mod(mod.detune);
        const mg = v.n(G(0));
        mg.gain.setValueAtTime(dev, t);
        mg.gain.setTargetAtTime(dev * 0.05, t, Math.max(0.01, decay * P['glo.bright'] * 0.4));
        mod.connect(mg); mg.connect(car.frequency); mg.connect(car2.frequency);
        const dst = side ? v.n(PAN(side * 0.55 * P['v.width'])) : v.out;
        if (side) dst.connect(v.out);
        car.connect(v.n(G(0.55 * k))).connect(dst);
        car2.connect(v.n(G(0.4 * k))).connect(dst);
        srcs.push(car, car2, mod);
      }
      if (P['glo.click'] > 0.01) {
        const ns = v.s(noiseSrc()), hp = v.n(BQ('highpass', 2500, 0.7)), cg = v.n(G(0));
        cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(0.5 * P['glo.click'], t + 0.001); cg.gain.setTargetAtTime(0, t + 0.001, 0.006);
        ns.connect(hp).connect(cg).connect(v.out);
        ns.start(t, rand(0, 1.8));
        ns._end = t + 0.1;
      }
      for (const o of srcs) o.start(t);
      v.out.gain.setValueAtTime(0, t);
      v.out.gain.linearRampToValueAtTime(vel * 0.42, t + 0.002);
      v.out.gain.setTargetAtTime(0, t + 0.002, decay / 6.9);
      v.released = true;
      v.finish(t + decay + 0.1);
    },
  },
  mem: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      const decay = P['mem.decay'] * (o.decayMul || 1) * (0.5 + y);
      const jump = Math.pow(2, P['mem.drop'] / 12), dt = P['mem.dropT'];
      const osc = v.s(OSC('sine', f * jump)); v.mod(osc.detune);
      osc.frequency.setValueAtTime(f * jump, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + dt);
      // level 3 places modes left and right; the centre parts then pass a centre panner so they keep their level
      // (a stereo voice skips the −3 dB a mono voice gets in its panner)
      const mid = Q.rich ? v.n(PAN(0)) : v.out;
      if (Q.rich) mid.connect(v.out);
      osc.connect(mid);
      if (P['mem.mode2'] > 0.01) {
        const r = P['mem.ratio2'];
        const o2 = v.s(OSC('sine', f * r * jump)); v.mod(o2.detune);
        o2.frequency.setValueAtTime(f * r * jump, t);
        o2.frequency.exponentialRampToValueAtTime(f * r, t + dt);
        const g2 = v.n(G(0));
        g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.6 * P['mem.mode2'], t + 0.001);
        g2.gain.setTargetAtTime(0, t + 0.001, decay * 0.45 / 6.9);
        o2.connect(g2).connect(mid);
        o2.start(t);
        o2._end = t + 0.031 + decay * 0.45;
        // level 3: two more membrane modes (near the circular drumhead's 2.14 and 2.30), placed left and right
        if (Q.rich) [[1.34, 0.5, 0.32, -1], [1.44, 0.34, 0.24, 1]].forEach(([rk, lk, dk, side]) => {
          const o3 = v.s(OSC('sine', f * r * rk * jump)); v.mod(o3.detune);
          o3.frequency.setValueAtTime(f * r * rk * jump, t);
          o3.frequency.exponentialRampToValueAtTime(f * r * rk, t + dt);
          const g3 = v.n(G(0));
          g3.gain.setValueAtTime(0, t); g3.gain.linearRampToValueAtTime(0.6 * P['mem.mode2'] * lk, t + 0.001);
          g3.gain.setTargetAtTime(0, t + 0.001, decay * dk / 6.9);
          o3.connect(g3).connect(v.n(PAN(side * 0.5 * P['v.width']))).connect(v.out);
          o3.start(t);
          o3._end = t + 0.031 + decay * dk;
        });
      }
      if (P['mem.noise'] > 0.01) {
        const ns = v.s(noiseSrc());
        const bp = v.n(BQ('bandpass', clamp(f * P['mem.tone'] * (0.6 + 0.8 * y), 60, 15000), 1.2));
        const gn = v.n(G(0));
        gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(1.4 * P['mem.noise'], t + 0.001);
        gn.gain.setTargetAtTime(0, t + 0.001, Math.min(decay * 0.3, 0.25) / 6.9 * 2);
        ns.connect(bp).connect(gn).connect(mid);
        ns.start(t, rand(0, 1.8));
        ns._end = t + 0.031 + 2 * Math.min(decay * 0.3, 0.25);
      }
      osc.start(t);
      v.out.gain.setValueAtTime(0, t);
      v.out.gain.linearRampToValueAtTime(vel * 0.62, t + 0.0015);
      v.out.gain.setTargetAtTime(0, t + 0.0015, decay / 6.9);
      v.released = true;
      v.finish(t + decay + 0.08);
    },
  },
  sai: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      const { buf, rate } = ksBuffer(...ksArgs(f, P['sai.decay'] * (o.decayMul || 1)));
      // finger height: from a dark, fundamental-heavy pluck (bottom) to the open string (top)
      const lp = v.n(BQ('lowpass', clamp(f * Math.pow(2, 1.5 + 7 * clamp(y, 0, 1)), 200, 20000), -3));
      // level 3: a double course like a twelve-string – two strings a few cents apart, left and right
      const course = Q.rich ? [-1, 1] : [0];
      for (const side of course) {
        const s = v.s(A.ctx.createBufferSource()); s.buffer = buf; s.playbackRate.value = rate;
        if (side) { if (s.detune) s.detune.value = side * 3; else s.playbackRate.value = rate * Math.pow(2, side * 3 / 1200); }
        if (s.detune) v.mod(s.detune);
        const g = side ? v.n(G(0.62)) : null;
        if (side) s.connect(g).connect(v.n(PAN(side * 0.4 * P['v.width']))).connect(lp); else s.connect(lp);
        s.start(t + (side > 0 ? 0.002 : 0));
      }
      let node = lp;
      if (P['sai.body'] > 0.01) {
        const pk1 = v.n(BQ('peaking', 210, 1.4)); pk1.gain.value = P['sai.body'] * 9;
        const pk2 = v.n(BQ('peaking', 1150, 1.8)); pk2.gain.value = P['sai.body'] * 5;
        node.connect(pk1); pk1.connect(pk2); node = pk2;
      }
      node.connect(v.out);
      v.out.gain.value = vel * 1.5;
      v.released = true;
      v.finish(t + buf.duration / rate + 0.02);
    },
  },
  sch: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      const decay = P['sch.decay'] * (o.decayMul || 1);
      const bright = clamp(P['sch.bright'] * (0.5 + y), 0.05, 1);
      // level 3: two more partials, and each beating pair split left and right
      const base = Q.rich ? [1, 2.71, 5.15, 8.43, 12.3, 16.9] : [1, 2.71, 5.15, 8.43];
      const w = P['v.width'];
      const att = 0.002 + (1 - P['sch.mallet']) * 0.025;
      base.forEach((r0, i) => {
        const r = r0 * (1 + P['sch.stretch'] * i * 0.08);
        const fr = f * r;
        if (fr > 16000) return;
        const amp = Math.pow(bright, i) * (i ? 0.8 : 1);
        if (amp < 0.01) return;
        const di = decay / (1 + i * 1.1);
        const beat = P['sch.beat'] * (1 + i * 0.5);
        const o1 = v.s(OSC('sine', fr - beat / 2)), o2 = v.s(OSC('sine', fr + beat / 2));
        v.mod(o1.detune); v.mod(o2.detune);
        const g = v.n(G(0));
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * 0.32, t + att);
        g.gain.setTargetAtTime(0, t + att, di / 6.9);
        if (Q.rich) { o1.connect(v.n(PAN(-0.55 * w))).connect(g); o2.connect(v.n(PAN(0.55 * w))).connect(g); }
        else { o1.connect(g); o2.connect(g); }
        g.connect(v.out);
        o1.start(t); o2.start(t);
        o1._end = o2._end = t + att + di + 0.02;
      });
      if (P['sch.mallet'] > 0.02) {
        const ns = v.s(noiseSrc()), bp = v.n(BQ('bandpass', clamp(f * 6, 300, 12000), 2)), cg = v.n(G(0));
        cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(0.5 * P['sch.mallet'], t + 0.001); cg.gain.setTargetAtTime(0, t + 0.001, 0.008);
        ns.connect(bp).connect(cg).connect(v.out);
        ns.start(t, rand(0, 1.8));
        ns._end = t + 0.12;
      }
      v.out.gain.value = vel * 0.55;
      v.released = true;
      v.finish(t + decay + 0.1);
    },
  },
  gng: {
    sustain: false,
    // plate modes as ratios to the hum: the low ones answer the strike at once, the high ones bloom up after it
    low: [[1.52, 0.35], [1.73, 0.8], [2.33, 0.6], [2.69, 0.4], [3.18, 0.3]],
    high: [[3.91, 0.8], [4.11, 0.7], [4.62, 0.5], [5.29, 0.55], [6.3, 0.6], [6.71, 0.5], [7.34, 0.45], [8.01, 0.35],
      [8.98, 0.4], [9.68, 0.35], [10.9, 0.3], [11.82, 0.3], [12.4, 0.25], [13.6, 0.2], [14.9, 0.2], [15.7, 0.15],
      [17.2, 0.12], [18.6, 0.1], [20.3, 0.08]],
    // a whole group of modes in one oscillator: on a grid of 1/16 of the hum they fit one periodic wave, whose
    // 16-cycle period is far too slow to be heard; spread phases keep the group free of peaks
    wave(key, modes, stretch) {
      key += stretch;
      if (!A.waves[key]) {
        const re = new Float32Array(340), im = new Float32Array(340);
        modes.forEach(([r, a], i) => { const k = Math.round(r * stretch * 16), ph = i * i * 0.7; re[k] += a * Math.cos(ph); im[k] += a * Math.sin(ph); });
        A.waves[key] = A.ctx.createPeriodicWave(re, im);
      }
      return key;
    },
    // the plates: [side, stretch, ratio of the spread, twin's beat, unison bus]. Level 3: two plates' worth of modes,
    // stretched against each other, left and right
    banks() { return Q.rich ? [[-1, 1, 0.59, 1, 1], [1, 1.023, 0.83, -0.7, 2]] : [[0, 1, 0.59, 1, 1]]; },
    // a periodic wave computes all its tables when it is created, some ms on a phone: Myzel calls this while the gong
    // is in use, as it warms up Saite's strings, so the first strike does not have to
    warm() { for (const [, s] of this.banks()) { this.wave('gngL', this.low, s); this.wave('gngH', this.high, s); } },
    start(v, t, f, y, vel, o) {
      // finger height is the strike: higher hits harder – an earlier, brighter bloom, a wider bend, a longer ring
      const decay = P['gng.decay'] * (o.decayMul || 1) * (0.8 + 0.4 * y) * clamp(Math.pow(220 / f, 0.3), 0.6, 1.6);
      // the swell has to peak while the plate still rings: beyond a tenth of the ring at mid height (less for a harder
      // strike, whose high modes start louder) the voice would fade faster than they rise
      const bloom = Math.min(P['gng.bloom'], decay * 0.1) * (1.5 - y);
      const bright = P['gng.bright'] * (0.3 + 0.7 * y);
      const att = 0.002 + 0.006 * (1 - y);
      // a hard swing stiffens the plate: every mode starts off pitch and settles as the swing narrows
      const bend = -P['gng.glide'] * (0.3 + 0.9 * y), settle = clamp(decay * 0.08, 0.3, 3);
      const w = P['v.width'], rich = Q.rich;
      // level 3 places parts left and right; the centre parts then pass a centre panner so they keep their level
      const mid = rich ? v.n(PAN(0)) : v.out;
      if (rich) mid.connect(v.out);
      // an envelope: struck to `hit`, swelling on to `amp` over `rise`, then ringing out over `ring`
      const env = (hit, amp, rise, ring) => {
        const g = v.n(G(0)), top = t + Math.max(rise, att);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(hit, t + att);
        if (rise > att) g.gain.linearRampToValueAtTime(amp, top);
        g.gain.setTargetAtTime(0, top, ring / 6.9);
        return g;
      };
      const osc = (type, fr, dst, stop, uni) => {
        const s = v.s(OSC(type, fr));
        s.detune.setValueAtTime(bend * rand(0.6, 1.4), t);
        s.detune.setTargetAtTime(0, t, settle * rand(0.7, 1.3));
        v.mod(s.detune);
        if (rich) v.lnk(A.uni[uni], s.detune);
        s.connect(dst);
        s.start(t);
        s._end = stop + 0.02;
      };
      // the hum: the lowest mode rings longest, so its decay is the voice's own and the plate's envelopes ride on top
      // of it (a ring of 2.33 decays on top makes 0.7 overall, 1.5 makes 0.6). Its twin rings with the low modes,
      // 'Schwebung' Hz off, and the two beat slowly
      v.out.gain.setValueAtTime(0, t);
      v.out.gain.linearRampToValueAtTime(vel * 0.125, t + att);
      v.out.gain.setTargetAtTime(0, t + att, decay / 6.9);
      osc('sine', f, mid, t + decay, 0);
      // level 3: both plates at the same loudness as one
      const lvl = rich ? 0.52 : 1;
      for (const [side, stretch, pmr, twin, uni] of this.banks()) {
        const dst = side ? v.n(PAN(side * 0.7 * w)) : mid;
        if (side) dst.connect(v.out);
        // the low modes keep the hum's tuning; the twin is a sine of its own, about 0.3 × the hum, so the beat moves
        // nothing else
        const lowG = env(1.15 * lvl, 1.15 * lvl, 0, decay * 2.33), twinG = v.n(G(0.27));
        lowG.connect(dst);
        twinG.connect(lowG);
        osc(this.wave('gngL', this.low, stretch), f / 16, lowG, t + decay * 0.7, uni);
        osc('sine', f + P['gng.beat'] * twin, twinG, t + decay * 0.7, uni);
        if (bright < 0.005) continue;
        // the high modes pass a delay line whose time wobbles: an inharmonic tone spreads every mode into a cloud of
        // sidebands as the bloom swells, a slow random jitter smears them into hiss – the higher, the wider
        const dl = v.n(A.ctx.createDelay(0.02)), highG = env(2 * bright * (0.1 + 0.3 * y) * lvl, 2 * bright * lvl, bloom, decay * 1.5);
        dl.delayTime.value = 0.006;
        highG.connect(dl).connect(dst);
        osc(this.wave('gngH', this.high, stretch), f / 16, highG, t + bloom + decay * 0.6, uni + 1);
        // the spread's depth counts in cycles of the hum, so every pitch blooms alike – but its cloud stays below 18 kHz
        const top = Math.min(f * 16, 16000);
        const depth = Math.min((0.03 + 0.14 * bright) / f, (18000 - top) / (2 * Math.PI * top * f * pmr), 0.0025);
        // it swells with the bloom and fades as an exponential ramp: Chrome cuts a decay toward 0 off below 4.5e-5,
        // which is still a lot for a depth counted in seconds
        const pm = v.s(OSC('sine', f * pmr)), pmG = v.n(G(0));
        KR(pmG.gain);
        pmG.gain.setValueAtTime(depth * (0.05 + 0.15 * y), t);
        pmG.gain.linearRampToValueAtTime(depth, t + bloom * 1.2);
        pmG.gain.exponentialRampToValueAtTime(depth * 0.001, t + bloom * 1.2 + decay * 0.5);
        v.mod(pm.detune);
        pm.connect(pmG).connect(dl.delayTime);
        pm.start(t);
        pm._end = t + bloom * 1.2 + decay * 0.6 + 0.02;
        // the shimmer: white noise played very slowly is a smooth random wobble of about 100 Hz
        if (P['gng.shimmer'] > 0.005) {
          const jit = v.s(noiseSrc());
          jit.playbackRate.value = 0.002;
          jit.connect(v.n(G(P['gng.shimmer'] ** 2 * 0.0006))).connect(dl.delayTime);
          jit.start(t, rand(0, 1.8));
          jit._end = pm._end;
        }
      }
      v.released = true;
      v.finish(t + att + decay + 0.1);
    },
  },
  klb: {
    sustain: false,
    // bottle-cap slack: the caps only touch the plate while the tine swings wider than 0.3, so they tick once a cycle
    slack: makeShaperCurve((x) => (x > 0.3 ? (x - 0.3) / 0.7 : 0), 1024),
    // the thumb's knock: 80 ms of fixed noise, the same on every note. Fresh noise from a random spot rang the box's
    // narrow band up to 8 dB louder or softer by chance; this seed rings box and lid within 1 dB of that spread's median.
    // Built at 48 kHz whatever the context's rate, so it is the same on every device
    knock() {
      if (A.klbKnock) return A.klbKnock;
      const buf = A.ctx.createBuffer(1, 3840, 48000), d = buf.getChannelData(0);
      for (let i = 0, s = 163; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) | 0; d[i] = s / 2147483648; }
      return (A.klbKnock = buf);
    },
    start(v, t, f, y, vel, o) {
      // the tine itself: nearly a sine, with a hint of 2nd and 3rd harmonic from its lopsided swing
      if (!A.waves.tine) A.waves.tine = A.ctx.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, 0.08, 0.03]));
      // short high tines ring shorter than long low ones; a higher finger lets the tine ring longer and brighter
      const decay = P['klb.decay'] * (o.decayMul || 1) * (0.6 + 0.8 * y) * clamp(Math.pow(262 / f, 0.3), 0.55, 1.6);
      const w = P['v.width'], rich = Q.rich;
      // level 3 places parts left and right; the centre parts then pass a centre panner so they keep their level
      const mid = rich ? v.n(PAN(0)) : v.out;
      if (rich) mid.connect(v.out);
      const sides = rich ? [-0.5, 0.5].map((x) => { const p = v.n(PAN(x * w)); p.connect(v.out); return p; }) : null;
      // the wooden box: a Helmholtz resonance that the thumb's knock and the low tines make bloom
      const body = P['klb.body'];
      const box = v.n(BQ('bandpass', 205, 7));
      box.connect(v.n(G(body * 3.2))).connect(mid);
      // level 3: the box's lid joins the knock as a second, higher wood mode, off to one side
      const lid = rich ? v.n(BQ('bandpass', 690, 5)) : null;
      if (lid) lid.connect(v.n(G(body * 1.6))).connect(sides[0]);
      // a plucked tine starts a little sharp and settles as its swing narrows
      const sharp = 5 + 10 * vel;
      const mode = (type, fr, cents, dst, uni) => {
        const osc = v.s(OSC(type, fr));
        osc.detune.setValueAtTime(cents + sharp, t);
        osc.detune.setTargetAtTime(cents, t, 0.04);
        v.mod(osc.detune);
        if (uni != null) v.lnk(A.uni[uni], osc.detune);
        osc.connect(dst);
        osc.start(t);
        return osc;
      };
      const fade = (amp, ring) => {
        const g = v.n(G(0));
        g.gain.setValueAtTime(amp, t);
        g.gain.setTargetAtTime(0, t, ring / 6.9);
        return g;
      };
      const tine = v.n(G(1));
      tine.connect(mid);
      tine.connect(v.n(G(0.3))).connect(box);
      const fund = mode('tine', f, 0, tine);
      // the tine's bending modes (a clamped bar: about 6× and 17×) shimmer metallic and fade far sooner than the tone
      const ratio = P['klb.ratio'];
      const oAmp = 0.55 * P['klb.over'] * (0.3 + 0.7 * y) * (0.7 + 0.4 * vel);
      const ring = decay * (0.05 + 0.2 * y);
      if (oAmp > 0.003 && f * ratio < 16000) {
        // level 3: the bending mode splits into a beating pair, left and right, each drifting on its own
        const pair = rich ? [[-1, 0.72], [1, 0.72]] : [[0, 1]];
        for (const [s, k] of pair) {
          const g = fade(oAmp * k, ring);
          mode('sine', f * ratio, s * 2.5, g, rich ? (s < 0 ? 1 : 2) : null)._end = t + ring + 0.02;
          g.connect(s ? sides[(s + 1) / 2] : tine);
        }
        if (f * ratio * 2.8 < 16000) {
          const g = fade(oAmp * 0.4, ring * 0.3);
          mode('sine', f * ratio * 2.8, 0, g)._end = t + ring * 0.3 + 0.02;
          g.connect(tine);
        }
      }
      // level 3: the octave tine next door rings along in sympathy, softly and a little late
      if (rich && f * 2 < 12000) {
        const g = v.n(G(0));
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.15);
        g.gain.setTargetAtTime(0, t + 0.15, decay * 0.7 / 6.9);
        mode('sine', f * 2, 0, g, 3)._end = t + 0.17 + decay * 0.7;
        g.connect(sides[1]);
      }
      // thumb: a soft, dull knock of flesh on metal, mostly heard through the box; brighter higher up
      const thumb = P['klb.thumb'];
      if (thumb > 0.01) {
        const ns = v.s(A.ctx.createBufferSource()), lp = v.n(BQ('lowpass', 300 + 1200 * y * y, 0.7)), tg = v.n(G(0));
        ns.buffer = this.knock();
        tg.gain.setValueAtTime(0, t);
        tg.gain.linearRampToValueAtTime(thumb * 1.6, t + 0.003);
        tg.gain.setTargetAtTime(0, t + 0.003, 0.006);
        ns.connect(lp).connect(tg);
        tg.connect(v.n(G(0.4))).connect(mid);
        // past the default thumb × box (0.225) the wood's ring grows only with the square root of that product:
        // both at full ring 6.5 dB above the default instead of 13 dB
        const wood = Math.sqrt(0.225 / Math.max(thumb * body, 0.225));
        tg.connect(v.n(G(30 * wood))).connect(box);
        if (lid) tg.connect(v.n(G(12 * wood))).connect(lid);
        ns.start(t);
      }
      // Schnarren: bottle caps on the plate rattle in time with the tine's swing; harder plucks and more buzz rattle
      // longer, and the rattle stops before the tone (level 3: two caps, left and right, each in its own band)
      const buzz = P['klb.buzz'];
      if (buzz > 0.01) {
        const len = decay * (0.15 + 0.45 * buzz) * (0.5 + 0.7 * vel);
        const swing = v.n(G(0)), contact = v.n(A.ctx.createWaveShaper());
        contact.curve = this.slack;
        swing.gain.setValueAtTime(1, t);
        swing.gain.setTargetAtTime(0, t, len / 1.2);
        fund.connect(swing).connect(contact);
        for (const s of rich ? [-1, 1] : [0]) {
          const ns = v.s(noiseSrc()), rg = v.n(G(0)), bp = v.n(BQ('bandpass', (2400 + 2600 * y) * (1 + s * 0.12), 1.4));
          contact.connect(rg.gain);
          ns.connect(rg).connect(bp).connect(v.n(G(Math.pow(buzz, 0.8) * (rich ? 2.7 : 3.6)))).connect(s ? sides[(s + 1) / 2] : mid);
          ns.start(t, rand(0, 1.8));
          ns._end = t + len + 0.05;
        }
      }
      v.out.gain.setValueAtTime(0, t);
      // a stereo voice gains in the voice panner off centre, so level 3 plays a little softer
      v.out.gain.linearRampToValueAtTime(vel * (rich ? 0.29 : 0.32), t + 0.0025);
      v.out.gain.setTargetAtTime(0, t + 0.0025, decay / 6.9);
      v.released = true;
      v.finish(t + decay + 0.1);
    },
  },
  obt: {
    sustain: true,
    // a pressed, buzzing voice: the first twenty harmonics about equally strong, so any one of them can be singled out
    wave() {
      if (A.waves.obtGlottis) return;
      const n = 64, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = 1 / Math.sqrt(1 + (k / 20) * (k / 20));
      A.waves.obtGlottis = A.ctx.createPeriodicWave(re, im, { disableNormalization: true });
    },
    // the wandering melody: a slow random walk over whole steps −4..4 (stored as −1..1) with short glides between
    // them, a minute long and looping seamlessly; every voice starts somewhere else in it. The k-rate detune needs no
    // more than 125 points a second, so the first note builds it in a few hundred steps; they sit in a buffer at the
    // lowest rate (3 kHz) that plays 24× slower, the source interpolating between them
    walk() {
      if (A.obtWalk) return A.obtWalk;
      const pps = 125, buf = A.ctx.createBuffer(1, pps * 60, 3000), d = buf.getChannelData(0), gl = Math.round(0.12 * pps);
      for (let i = 0, cur = 0; i < d.length;) {
        const hold = Math.round(rand(0.5, 1.6) * pps);
        const next = d.length - i < hold + gl || Math.random() < 0.3 ? 0 : clamp(cur + pick([-2, -1, -1, 1, 1, 2]), -4, 4);
        for (let k = 0; k < gl && i < d.length; k++, i++) d[i] = (cur + (next - cur) * (1 - Math.cos(Math.PI * k / gl)) / 2) / 4;
        d.fill(next / 4, i, i + hold - gl);
        i += hold - gl; cur = next;
      }
      return (A.obtWalk = buf);
    },
    // the highest harmonic a spotlight may sing on note f: the last one below 6 kHz, but at least the 2nd
    cap(f) { return Math.max(2, Math.floor(6000 / f)); },
    // finger height picks the harmonic that sings: two octaves of the series up to 'Obertonbereich'; on high notes
    // both ends stay under the ceiling and y keeps up to an octave of harmonics below it
    harm(f, y) {
      const top = P['obt.top'], hi = Math.min(top, this.cap(f)), lo = Math.max(2, Math.min(Math.round(top / 4), Math.ceil(hi / 2)));
      return Math.round(lo + clamp(y, 0, 1) * (hi - lo));
    },
    start(v, t, f, y, vel, o) {
      this.wave();
      const w = P['v.width'], kq = 1 + 5 * P['obt.focus'], wander = P['obt.wander'];
      // optional wandering: the walk (its minute squeezed into the buffer), faster with more 'Wandern', moves the
      // spotlights to neighbouring harmonics
      let steps = null;
      if (wander > 0.001) {
        steps = v.s(A.ctx.createBufferSource()); steps.buffer = this.walk(); steps.loop = true;
        steps.playbackRate.value = (0.5 + 0.8 * wander) * steps.buffer.duration / 60;
      }
      // one singer: a buzz whose drone sits under a low-pass a few harmonics up (opening towards the top like a
      // mouth), and its spotlight, two narrow band-passes in a row on the note, detuned up to the chosen harmonic
      // (Q = kq·n keeps the band 1/kq of the harmonic spacing wide). Level 3: a second singer a few cents apart on
      // the other side, whistling a quieter 3:2 above the first and wandering the other way.
      const bodyC = (ny) => 1200 * Math.log2(2.5 + 5 * ny), bodyG = 0.9 * P['obt.body'] * (Q.rich ? 0.65 : 1);
      const singers = (Q.rich ? [[-4, -0.5, 1, 1, 0.75], [4, 0.5, 1.5, -1, 0.45]] : [[0, 0, 1, 1, 1]]).map(([det, pan, mul, dir, lvl], i) => {
        const osc = v.s(OSC('obtGlottis', f)); osc.detune.value = det;
        const lp = v.n(BQ('lowpass', f, 0.7)); lp.detune.value = bodyC(y);
        const a = v.n(BQ('bandpass', f)), b = v.n(BQ('bandpass', f));
        for (const p of [osc.detune, a.detune, b.detune]) { v.mod(p); if (Q.rich) v.lnk(A.uni[i], p); }
        v.mod(lp.detune);   // the body's cutoff follows the pitch wheel, too
        // the walk drives two shapers: the spotlight's detune and its Q
        let ws = null, wq = null;
        if (steps) {
          ws = v.n(A.ctx.createWaveShaper()); wq = v.n(A.ctx.createWaveShaper());
          steps.connect(ws); steps.connect(wq);
          for (const bp of [a, b]) { ws.connect(bp.detune); wq.connect(bp.Q); }
        }
        const out = Q.rich ? v.n(PAN(pan * w)) : v.out;
        if (Q.rich) out.connect(v.out);
        osc.connect(lp).connect(v.n(G(bodyG))).connect(out);
        const g = v.n(G(0));
        osc.connect(a).connect(b).connect(g).connect(out);
        return { osc, lp, a, b, g, ws, wq, det, mul, dir, lvl };
      });
      // tuning: singer s on harmonic n of the note; the shapers turn walk steps into the cents and the Q of whole
      // harmonics around it (±4 steps move one from the bottom of 'Wandern' on, every step moves at full), never
      // above the ceiling. The Q curve adds to the walk's lowest Q, so Q stays positive while a new harmonic glides in
      const harmC = (s, n) => 1200 * Math.log2(Math.round(n * s.mul)) + s.det, harmQ = (s, n) => kq * Math.round(n * s.mul);
      const wv = 0.1875 + 0.8125 * wander, reach = (d) => Math.sign(d) * Math.floor(Math.abs(d) * wv + 0.25);
      const tune = () => {
        for (const s of singers) {
          const ns = s.ws ? Array.from({ length: 9 }, (_, i) => clamp(v.h + s.dir * reach(i - 4), 2, v.cap)) : [v.h];
          s.Q = harmQ(s, Math.min(...ns));
          if (!s.ws) continue;
          s.ws.curve = Float32Array.from(ns, (n) => harmC(s, n) - harmC(s, v.h));
          s.wq.curve = Float32Array.from(ns, (n) => harmQ(s, n) - s.Q);
        }
      };
      // whistling stronger the higher it sits, fading out before the band reaches Nyquist (the 3:2 singer, extreme notes)
      const level = (s) => 0.9 * s.lvl * Math.sqrt(v.h / 8) * clamp((0.45 * SR - Math.round(v.h * s.mul) * v.f) / (0.1 * SR), 0, 1);
      v.f = f; v.y = y; v.h = this.harm(f, y); v.cap = this.cap(f); tune();
      // onset: the spotlight scoops up from an octave below, like the mouth closing round a jaw harp's twang
      for (const s of singers) {
        s.g.gain.value = s.gain = level(s);
        for (const bp of [s.a, s.b]) { bp.Q.value = s.Q; bp.detune.setValueAtTime(harmC(s, v.h) - 1200, t); bp.detune.setTargetAtTime(harmC(s, v.h), t, 0.03); }
      }
      for (const s of v.srcs) { if (s === steps) s.start(t, rand(0, s.buffer.duration)); else s.start(t); }
      // finger moves: the spotlight glides on as soon as the height selects another harmonic (or the ceiling moves)
      const retarget = () => {
        const h = this.harm(v.f, v.y), cap = this.cap(v.f);
        if (h !== v.h || cap !== v.cap) {
          v.h = h; v.cap = cap; tune();
          for (const s of singers) for (const bp of [s.a, s.b]) { glideTo(bp.detune, harmC(s, h), 0.15); setP(bp.Q, s.Q, 0.05); }
        }
        for (const s of singers) { const g = level(s); if (g !== s.gain) setP(s.g.gain, (s.gain = g), 0.05); }
      };
      v.setF = (nf, glide) => {
        v.f = nf;
        for (const s of singers) for (const x of [s.osc, s.lp, s.a, s.b]) glideTo(x.frequency, nf, glide);
        retarget();
      };
      v.setY = (ny) => { v.y = ny; for (const s of singers) setP(s.lp.detune, bodyC(ny), 0.05); retarget(); };
      // in the Puls a short twang: a quick attack under the scoop, a little hotter to sit with the other engines
      const peak = vel * (o.burst ? 0.135 : 0.105);
      if (o.burst) burstEnv(v, t, peak, Math.min(P['obt.att'], 0.03), o.gate, Math.min(P['obt.rel'], 2));
      else { adsrStart(v, t, peak, P['obt.att']); v.release = sustainRelease(v, P['obt.rel']); }
    },
  },
  stm: {
    sustain: true,
    // vowels u – o – a – e – i from bottom to top: formant frequencies (Hz), bandwidths (Hz) and peak levels (dB)
    vowels: [
      [[325, 700, 2600], [60, 70, 160], [0, -14, -32]],
      [[450, 800, 2800], [70, 80, 130], [0, -9, -24]],
      [[800, 1150, 2850], [80, 90, 130], [0, -5, -22]],
      [[400, 1800, 2750], [60, 100, 130], [-1, -6, -13]],
      [[290, 2100, 2950], [55, 100, 130], [-2, -6, -12]],
    ],
    // three formants [Hz, Q, gain] for pitch f, finger height y and vocal tract size (ratio)
    formants(f, y, tract) {
      const p = clamp(y, 0, 1) * 4, i = Math.min(3, Math.floor(p)), x = p - i, a = this.vowels[i], b = this.vowels[i + 1];
      return [0, 1, 2].map((j) => {
        let F = Math.min(a[0][j] * Math.pow(b[0][j] / a[0][j], x) * tract, 16000);
        if (!j) F = Math.max(F, f * 1.1);   // high voices lift the first formant onto the fundamental, as sopranos do
        // never narrower than the harmonic spacing allows, so every note finds a harmonic in every formant
        const bw = Math.max(a[1][j] + (b[1][j] - a[1][j]) * x, f * 0.7);
        // more effort higher up: the upper formants grow with y
        const lvl = dbToGain(a[2][j] + (b[2][j] - a[2][j]) * x) * [1, 0.7 + 0.6 * y, 0.5 + 1.5 * y][j];
        // undo the source roll-off at this formant, so the table levels hold for every pitch (deep basses stay darker)
        const k = F / f;
        return [F, F / bw, lvl * Math.min(k * Math.sqrt(1 + (k / 14) ** 2), 40)];
      });
    },
    start(v, t, f, y, vel, o) {
      // glottal source: harmonics fall like a sawtooth, twice as fast above the 14th (built once per audio context);
      // odd and even harmonics a quarter turn apart, so the wave swings as far up as down and the drive adds no DC
      if (!A.waves.stmGlottis) {
        const n = 96, re = new Float32Array(n), im = new Float32Array(n);
        for (let k = 1; k < n; k++) (k % 2 ? re : im)[k] = 1 / k / Math.sqrt(1 + (k / 14) ** 2);
        A.waves.stmGlottis = A.ctx.createPeriodicWave(re, im);
      }
      const w = P['v.width'], choir = P['stm.choir'], vib = P['stm.vib'];
      const tract = Math.pow(2, P['stm.shift'] / 12);
      v.f = f; v.y = y;
      // breath: one noise whispers through all formants, with an aspirated "h" at the onset; less of it higher up,
      // where the upper formants open, and on notes below 110 Hz, where the pitch-compensated formant gains lift it
      const airGain = (fr) => 5 * P['stm.breath'] * Math.pow(0.15, v.y) * Math.min(1, fr / 110);
      // the "h" lives in a node of its own that nothing retunes, so a finger move at the onset keeps it whole
      const ns = v.s(noiseSrc()), breath = v.n(G(0)), air = v.n(G(airGain(f)));
      breath.gain.setValueAtTime(2.5, t);
      breath.gain.setTargetAtTime(1, t + 0.02, 0.08);
      ns.connect(breath).connect(air);
      // level 3: six singers in two groups left and right, each group with its own slightly different vocal tract
      const ks = Q.rich ? [-1, -0.6, -0.2, 0.2, 0.6, 1] : [-1, 0, 1];
      const sides = Q.rich ? [-1, 1] : [0];
      // as loud as three singers; a little less, because a stereo voice gains in the voice panner off centre
      const og = Q.rich ? 0.29 : 0.46;
      const singers = [], banks = [];
      for (const side of sides) {
        const inp = v.n(G(og));
        air.connect(inp);
        // a natural vibrato per group that sets in after the onset; every other singer swings the opposite way
        const lfo = v.s(OSC('sine', rand(4.6, 5.6)));
        const vp = v.n(G(0)), vn = v.n(G(0));
        lfo.connect(vp); lfo.connect(vn);
        vp.gain.setValueAtTime(0, t); vp.gain.linearRampToValueAtTime(0, t + 0.25); vp.gain.linearRampToValueAtTime(vib, t + 1.4);
        vn.gain.setValueAtTime(0, t); vn.gain.linearRampToValueAtTime(0, t + 0.25); vn.gain.linearRampToValueAtTime(-vib, t + 1.4);
        ks.forEach((k, i) => {
          if (sides.length > 1 && (i % 2 ? 1 : -1) !== side) return;
          const osc = v.s(OSC('stmGlottis', f));
          const d = (k + rand(-0.2, 0.2)) * choir + rand(-2, 2);
          // each singer slides into the note from slightly below
          osc.detune.setValueAtTime(d - rand(20, 45), t);
          osc.detune.setTargetAtTime(d, t, 0.06);
          v.mod(osc.detune);
          if (Q.rich) v.lnk(A.uni[i % 4], osc.detune);
          (singers.length % 2 ? vn : vp).connect(osc.detune);
          osc.connect(inp);
          singers.push(osc);
        });
        const dst = side ? v.n(PAN(side * 0.5 * w)) : v.out;
        if (side) dst.connect(v.out);
        const bank = { tract: tract * (1 + side * 0.03), bp: [], g: [] };
        this.formants(f, y, bank.tract).forEach(([F, q, gain]) => {
          const bp = v.n(BQ('bandpass', F, q)), g = v.n(G(gain));
          inp.connect(bp).connect(g).connect(dst);
          bank.bp.push(bp); bank.g.push(g);
        });
        // the vowel never quite stands still: the two lower formants sway apart on the slow shared drifts (±40 ct)
        const u = (Math.random() * 4) | 0;
        [0, 1].forEach((j) => {
          const sway = v.n(G((j ? -1 : 1) * rand(10, 13)));
          v.lnk(A.uni[(u + j * 2) % 4], sway);
          sway.connect(bank.bp[j].detune);
        });
        banks.push(bank);
      }
      for (const s of v.srcs) { if (s === ns) s.start(t, rand(0, 1.8)); else s.start(t); }
      // the singers' pitch glide (as glideTo runs it), so the formants can follow the pitch actually sung
      let gl = { t0: t, from: f, to: f, tc: 0.004 };
      const pitchAt = (at) => gl.to + (gl.from - gl.to) * Math.exp(-(at - gl.t0) / gl.tc);
      // everything that depends on pitch and finger height, and its values at pitch fr
      const params = [air.gain, ...banks.flatMap((b) => b.bp.flatMap((bp, j) => [bp.frequency, bp.Q, b.g[j].gain]))];
      const values = (fr) => [airGain(fr), ...banks.flatMap((b) => this.formants(fr, v.y, b.tract).flat())];
      // their schedule: points [time, values], then an ease towards end. Kept here rather than held in the params,
      // because Chromium's cancelAndHoldAtTime inside a setTargetAtTime lets a following ramp start from 0.
      const x0 = values(f);
      let plan = { pts: [[0, x0]], end: x0, tc: 0.05 };
      const valuesAt = (at) => {
        const { pts, end, tc } = plan, i = pts.findIndex(([ti]) => ti > at);
        if (i < 0) {
          const [tl, xl] = pts[pts.length - 1], k = Math.exp(-(at - tl) / tc);
          return end.map((x, m) => x + (xl[m] - x) * k);
        }
        const [ta, xa] = pts[i - 1], [tb, xb] = pts[i];
        return xa.map((x, m) => x + (xb[m] - x) * (at - ta) / (tb - ta));
      };
      // during a glide, frequency, width and the pitch-compensated gain follow the singers a quarter octave at a time
      // and ease in with them for the last stretch: set for the target at once, the strong low harmonics of a falling
      // voice would sweep through narrow, boosted resonances (a rising one would sink). Height alone glides in quickly.
      const retune = () => {
        const now = A.ctx.currentTime, oct = Math.log2(pitchAt(now) / gl.to), gliding = Math.abs(oct) > 0.02;
        const n = gliding ? Math.ceil(Math.abs(oct) * 4) : 0, pts = [[now, valuesAt(now)]];
        for (let i = 1; i < n; i++) {
          const fr = gl.to * Math.pow(2, oct * (1 - i / n));
          pts.push([gl.t0 + gl.tc * Math.log((gl.from - gl.to) / (fr - gl.to)), values(fr)]);
        }
        plan = { pts, end: values(gl.to), tc: gliding ? Math.max(0.05, gl.tc) : 0.05 };
        params.forEach((p, m) => {
          p.cancelScheduledValues(now);
          pts.forEach(([ti, x], i) => { if (i) p.linearRampToValueAtTime(x[m], ti); else p.setValueAtTime(x[m], ti); });
          p.setTargetAtTime(plan.end[m], pts[pts.length - 1][0], plan.tc);
        });
      };
      v.setF = (nf, glide) => {
        const now = A.ctx.currentTime, tc = Math.max(0.004, glide / 3);
        if (nf === gl.to && tc === gl.tc) return;   // the glide in flight already leads there
        gl = { t0: now, from: pitchAt(now), to: nf, tc };
        v.f = nf; for (const s of singers) glideTo(s.frequency, nf, glide);
        retune();
      };
      v.setY = (ny) => { v.y = ny; retune(); };
      const peak = vel * 0.5;
      if (o.burst) burstEnv(v, t, peak, P['stm.att'], o.gate, Math.min(P['stm.rel'], 3));
      else { adsrStart(v, t, peak, P['stm.att']); v.release = sustainRelease(v, P['stm.rel']); }
    },
  },
  swm: {
    sustain: true,
    // chirp rhythm: trills of 2–6 round pulses (20–50 ms) with pauses between them, 8 s long and looping;
    // built once, every swarm starts somewhere else in it
    chirps() {
      if (A.swmChirps) return A.swmChirps;
      const buf = A.ctx.createBuffer(1, SR * 8, SR), d = buf.getChannelData(0);
      for (let i = Math.floor(0.1 * SR); i < d.length - SR;) {
        const len = Math.floor(rand(0.02, 0.05) * SR), gap = Math.floor(len * rand(0.5, 1.2)), a = rand(0.6, 1);
        for (let k = 2 + Math.floor(rand(0, 5)); k > 0; k--, i += len + gap)
          for (let j = 0; j < len; j++) d[i + j] = a * Math.sin(Math.PI * j / len) ** 2;
        i += Math.floor(rand(0.12, 0.8) * SR);
      }
      return (A.swmChirps = buf);
    },
    // flight curve: 512 smooth random points over 16 s, looping, so even the fastest flutter only repeats after 9 s;
    // smooth enough for a low sample rate. Built once, every swarm starts somewhere else in it
    flutter() {
      if (A.swmFly) return A.swmFly;
      const sr = 3000, buf = A.ctx.createBuffer(1, sr * 16, sr), d = buf.getChannelData(0), pts = 512, v = [];
      for (let i = 0; i < pts; i++) v.push(rand(-1, 1));
      v.push(v[0]);
      for (let i = 0; i < d.length; i++) {
        const p = i * pts / d.length, k = Math.floor(p), m = (1 - Math.cos((p - k) * Math.PI)) / 2;
        d[i] = v[k] * (1 - m) + v[k + 1] * m;
      }
      return (A.swmFly = buf);
    },
    start(v, t, f, y, vel, o) {
      const w = P['v.width'], spread = P['swm.spread'], unrest = P['swm.unrest'];
      // three insects per swarm [harmonic, detune (× spread), level at the bottom, at the top]: a calm one on the
      // note, the cricket on the 3rd harmonic and a buzzer on the 2nd, both a little sharp of it. The calm one bends
      // the cricket's pitch; cricket and buzzer bend each other in a loop closed by a short delay, so the overtones
      // keep stirring themselves up while nothing bends the calm one and the note stays clear.
      // Level 3: two swarms, left and right and apart in tuning, whose loops join into one
      const kinds = [[1, 0, 1, 0.45], [3, 0.4, 0.03, 1], [2, 1, 0.05, 0.35]];
      const sides = Q.rich ? [-1, 1] : [0];
      const g0 = Q.rich ? 0.175 : 0.3;
      // finger height = chaos and density: louder overtones, stronger coupling (FM index of the calm one on the
      // cricket for brightness, of the loop for unrest; less on high notes, whose sparse harmonics would drown in
      // the sidebands), a faster and deeper flutter, quicker and stronger trills and an open filter. Insects above
      // 0.3 × the sample rate stay silent, and so do the cricket's flares
      const mute = (k, nf) => nf * k[0] > SR * 0.3;
      const level = (k, nf, ny) => (mute(k, nf) ? 0 : g0 * (k[2] + (k[3] - k[2]) * ny ** 1.5));
      const index = (nf, ny, loop) => {
        const c = P['swm.chaos'] * Math.min(1, Math.sqrt(250 / nf));
        return loop ? Math.min(0.6, c * (0.3 + 0.9 * ny * ny)) : Math.min(4, c * (0.5 + 2 * ny + 6 * ny ** 3));
      };
      // speed through the flight curve (32 points a second at 1)
      const flight = (ny) => (0.05 + 0.95 * ny) * (0.3 + 1.4 * unrest);
      const depth = (ny) => Math.min(0.9, unrest * (0.6 + 0.9 * ny));
      const trill = (ny) => 0.5 + ny;
      const flare = (nf, ny) => (mute(kinds[1], nf) ? 0 : g0 * P['swm.chirp'] * 1.5 * ny);
      // a low-pass that opens with height, and a high-pass just below the note for the sidebands the coupled sines
      // throw down towards 0 Hz. Their frequencies follow the note (× 2^0.6 and × 0.7) and glide with the insects;
      // height and the limits act on the low-pass's detune, vibrato and the pitch wheel on both detunes
      const cut = (nf, ny) => clamp(nf * Math.pow(2, 0.6 + 4.4 * ny), 150, 14000);
      const lpf = (nf) => nf * Math.pow(2, 0.6), open = (nf, ny) => 1200 * Math.log2(cut(nf, ny) / lpf(nf));
      const lp = v.n(BQ('lowpass', lpf(f), 0.7)), hp = v.n(BQ('highpass', f * 0.7, 0.7));
      lp.detune.value = open(f, y);
      v.mod(lp.detune); v.mod(hp.detune);
      lp.connect(hp).connect(v.out);
      const swarms = sides.map((side, s) => {
        const mix = v.n(G(1));
        if (side) mix.connect(v.n(PAN(side * 0.6 * w))).connect(lp); else mix.connect(lp);
        // flight: one smooth random curve bends the calm one and the buzzer one way and the cricket the other, and
        // makes the whole swarm flutter
        const fly = v.s(A.ctx.createBufferSource());
        fly.buffer = this.flutter(); fly.loop = true; fly.playbackRate.value = flight(y);
        const wander = v.n(G(spread * 1.5 + 4)), counter = v.n(G(-(spread * 1.5 + 4))), trem = v.n(G(depth(y)));
        fly.connect(wander); fly.connect(counter); fly.connect(trem).connect(mix.gain);
        fly.start(t, rand(0, fly.buffer.duration));
        const ins = kinds.map((k, j) => {
          const osc = v.s(OSC('sine', f * k[0]));
          osc.detune.value = (k[1] + side * 0.5) * spread;
          v.mod(osc.detune);
          if (Q.rich) v.lnk(A.uni[(s * 3 + j) % 4], osc.detune);
          (j === 1 ? counter : wander).connect(osc.detune);
          const amp = v.n(G(level(k, f, y)));
          osc.connect(amp).connect(mix);
          osc.start(t);
          return { osc, k, amp };
        });
        // the cricket flares up and swoops a semitone up in the trill rhythm
        const trills = v.s(A.ctx.createBufferSource());
        trills.buffer = this.chirps(); trills.loop = true; trills.playbackRate.value = trill(y);
        const up = v.n(G(flare(f, y))), swoop = v.n(G(f * 3 * 0.06));
        trills.connect(up).connect(ins[1].amp.gain);
        trills.connect(swoop).connect(ins[1].osc.frequency);
        trills.start(t, rand(0, trills.buffer.duration));
        return { ins, fly, trem, trills, up, swoop };
      });
      // links [from, to]: each bends the other's pitch by up to index × its own frequency; the last one closes the loop
      const loop = swarms.flatMap((x) => [x.ins[1], x.ins[2]]);
      const pairs = [...swarms.map((x) => [x.ins[0], x.ins[1]]), ...loop.map((a, i) => [a, loop[(i + 1) % loop.length]])];
      const dev = (i, nf, ny) => Math.min(index(nf, ny, i >= swarms.length) * nf * pairs[i][0].k[0], SR * 0.08);
      const links = pairs.map(([a, b], i) => {
        const g = v.n(G(dev(i, f, y)));
        if (i === pairs.length - 1) {
          const d = v.n(A.ctx.createDelay(0.05));
          d.delayTime.value = rand(0.004, 0.009);
          a.osc.connect(d).connect(g);
        } else a.osc.connect(g);
        g.connect(b.osc.frequency);
        return g;
      });
      v.f = f; v.y = y;
      // while the insects glide to a new note (time constant tc, until end), the bending glides along with the same
      // time constant, so its depth and the pitches move in step; otherwise it follows height quickly
      let gl = { end: 0, tc: 0.05 };
      // height, and what the note only gates or limits; never a param that setF glides (setP would cancel the glide)
      const shape = () => {
        const nf = v.f, ny = v.y, tc = A.ctx.currentTime < gl.end ? gl.tc : 0.05;
        links.forEach((g, i) => setP(g.gain, dev(i, nf, ny), tc));
        setP(lp.detune, open(nf, ny), 0.05);
        for (const x of swarms) {
          for (const a of x.ins) setP(a.amp.gain, level(a.k, nf, ny), 0.05);
          setP(x.fly.playbackRate, flight(ny), 0.1); setP(x.trem.gain, depth(ny), 0.05);
          setP(x.trills.playbackRate, trill(ny), 0.1); setP(x.up.gain, flare(nf, ny), 0.05);
        }
      };
      // what is proportional to the note glides with the insects, so the filters stay in step with them
      v.setF = (nf, glide) => {
        if (nf !== v.f) gl = { end: A.ctx.currentTime + glide, tc: Math.max(0.004, glide / 3) };
        v.f = nf;
        for (const x of swarms) {
          for (const a of x.ins) glideTo(a.osc.frequency, nf * a.k[0], glide);
          glideTo(x.swoop.gain, nf * 3 * 0.06, glide);
        }
        glideTo(lp.frequency, lpf(nf), glide); glideTo(hp.frequency, nf * 0.7, glide);
        shape();
      };
      v.setY = (ny) => { v.y = ny; shape(); };
      // a Puls hit is short: a little hotter, so it sits with the other engines
      const peak = vel * (o.burst ? 0.68 : 0.47);
      if (o.burst) burstEnv(v, t, peak, Math.min(P['swm.att'], 0.03), o.gate, Math.min(P['swm.rel'], 2));
      else { adsrStart(v, t, peak, P['swm.att']); v.release = sustainRelease(v, P['swm.rel']); }
    },
  },
  tie: {
    sustain: true,
    // one soft-clipping curve for all voices: tanh(6x), so the input level decides how hard the growl is driven
    curve: null,
    // the note an octave or two down. Below the key's lowest octave (its root between 24 and 48 Hz) a note folds up, so
    // a line wraps at the root, as a bass changes register, instead of somewhere inside the scale
    base(f) { return octFold(f * Math.pow(2, P['tie.oct']), 24); },
    // finger height is the drive: how hard sine and octave hit the curve (u, from a soft octave to a buzzing growl) and
    // how loud the overtones then sit against the sub (m), at the same overall level. High notes hold u back so what
    // folds back above Nyquist stays about 40 dB down, and the growl fades out from SR/16 to SR/8
    drive(y, fb) {
      const dr = P['tie.drive'], sr = A.ctx.sampleRate, m = dr * (0.3 + 2.1 * y) * clamp(2 - 16 * fb / sr, 0, 1);
      return { u: clamp(sr / (10 * fb) - 0.5, 0.1, 0.5 + 10 * dr * y), m, s: 1 / Math.sqrt(1 + m * m) };
    },
    // one growl with octave share a: its own fundamental b1 (measured over one period, 64 points), which the sub takes
    // back out, and the gain that brings the remaining overtones to m times the sub
    growl(d, a) {
      let ss = 0, b1 = 0;
      for (let i = 0; i < 64; i++) {
        const th = i * Math.PI / 32, x = Math.tanh(d.u * (Math.sin(th) + a * Math.sin(2 * th)));
        ss += x * x; b1 += x * Math.sin(th);
      }
      b1 /= 32;
      return { b1, mk: d.m * d.s * Math.sqrt(0.5 / (ss / 64 - b1 * b1 / 2)) };
    },
    start(v, t, f, y, vel, o) {
      if (!this.curve) this.curve = makeShaperCurve((x) => Math.tanh(6 * x));
      const sr = A.ctx.sampleRate, fb = this.base(f), w = P['v.width'], rich = Q.rich;
      // a growl needs some drive and its octave in the clean range
      const driven = P['tie.drive'] > 0.005 && fb < sr / 8;
      // the 808 fall: every oscillator starts higher and settles on the note, fast at first, then gently. It starts at
      // most at 3 kHz, and with a growl at most where the strongest drive still stays clean (the cap in drive, inverted)
      const top = driven ? Math.min(3000, sr / (10 * (this.drive(1, fb).u + 0.5))) : 3000;
      const jump = Math.min(Math.pow(2, P['tie.drop'] / 12), Math.max(1, top / fb)), tau = P['tie.dropT'] / 5;
      const dropEnd = jump > 1.001 ? t + 5 * tau : t;
      const osc = (fr) => {
        const s = v.s(OSC('sine', fr));
        if (jump > 1.001) { s.frequency.setValueAtTime(fr * jump, t); s.frequency.setTargetAtTime(fr, t, tau); }
        v.mod(s.detune);
        s.start(t);
        return s;
      };
      // level 3 places parts left and right; the centre parts then pass a centre panner so they keep their level
      const mid = rich ? v.n(PAN(0)) : v.out;
      if (rich) mid.connect(v.out);
      // the sub: a plain sine, always in the middle
      const sub = osc(fb), subG = v.n(G(0));
      sub.connect(subG).connect(mid);
      // the growl: the sub and its octave driven together. In phase they form a point-symmetric wave, which the curve
      // fills with every overtone, even and odd, and which stays symmetric – no offset, also not in the drive effect
      // after the voice. Its fundamental lines up with the sub's, so the sub, inverted and scaled to it, takes it out
      // again before the growl's level gain: neither that gain nor a panner can touch the sub.
      // Level 3: two growls left and right, hollower (less octave, odd overtones) on one side and warmer (even ones) on
      // the other; their levels swing slowly against each other, so the colours wander from side to side
      const growls = [], k = rich ? 0.5 : 1;
      let o2 = null, g1 = null;
      if (driven) {
        o2 = osc(fb * 2); g1 = v.n(G(0));
        sub.connect(g1);
        for (const side of rich ? [-1, 1] : [0]) {
          const g2 = v.n(G(0)), sh = v.n(A.ctx.createWaveShaper()), cut = v.n(G(0)), mk = v.n(G(0));
          sh.curve = this.curve;
          g1.connect(sh); o2.connect(g2).connect(sh);
          sh.connect(mk); sub.connect(cut).connect(mk);
          let dst = mid, sw = null;
          if (side) {
            dst = v.n(PAN(side * 0.9 * w)); dst.connect(v.out);
            // one slow drift moves the level, up on one side and down on the other
            sw = v.n(G(0)); v.lnk(A.uni[1], sw); sw.connect(mk.gain);
          }
          mk.connect(dst);
          growls.push({ a: 0.5 + 0.1 * side, g2, cut, mk, sw, side });
        }
      }
      // the base and finger height the gains are set for
      let cb = fb, cy = y;
      const shape = (tc) => {
        const d = this.drive(cy, cb), set = (p, x) => (tc ? setP(p, x, tc) : (p.value = x));
        set(subG.gain, d.s);
        if (g1) set(g1.gain, d.u / 6);
        for (const x of growls) {
          const gr = this.growl(d, x.a);
          set(x.g2.gain, x.a * d.u / 6); set(x.cut.gain, -gr.b1); set(x.mk.gain, gr.mk * k);
          if (x.sw) set(x.sw.gain, x.side * 0.5 * gr.mk * k / A.uni[1].gain.value);
        }
      };
      shape(0);
      // the beater: a few milliseconds of band-passed noise, brighter higher up
      if (P['tie.click'] > 0.01) {
        const ns = v.s(noiseSrc()), bp = v.n(BQ('bandpass', 1300 * Math.pow(2, 1.6 * y), 0.8)), cg = v.n(G(0));
        cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(0.9 * P['tie.click'], t + 0.0015); cg.gain.setTargetAtTime(0, t + 0.0015, 0.005);
        ns.connect(bp).connect(cg).connect(mid);
        ns.start(t, rand(0, 1.8));
        ns._end = t + 0.06;
      }
      // a slide keeps the octave fold of its first note (only below 16 Hz it folds again). During the fall every move
      // takes over its time constant, so jitter leaves the fall as it is and a new note is reached at its speed
      const mul = fb / f;
      v.setF = (nf, glide) => {
        const g = A.ctx.currentTime < dropEnd ? 3 * tau : glide;
        cb = nf * mul;
        while (cb < 16) cb *= 2;
        glideTo(sub.frequency, cb, g);
        if (o2) glideTo(o2.frequency, cb * 2, g);
        shape(Math.max(0.004, g / 3));
      };
      v.setY = (ny) => { cy = ny; shape(0.04); };
      const peak = vel * 0.16, rel = P['tie.rel'];
      if (o.burst) burstEnv(v, t, peak * 1.6, 0.003, o.gate * 0.8, rel * (o.decayMul || 1));
      else { adsrStart(v, t, peak, 0.003); v.release = sustainRelease(v, rel); }
    },
  },
  trp: {
    sustain: false,
    // the chirp's shape: an ease-out from the bubble's first ring up to the note, fast at first, landing softly
    ease: Float32Array.from({ length: 24 }, (_, i) => Math.pow(1 - i / 23, 3)),
    // the scale's note nearest to a frequency, in any octave: rain drops fall in key
    inKey(fr) {
      let best = fr, bd = 1;
      for (const nt of N.notes) {
        const d = Math.log2(fr / nt.f), r = d - Math.round(d);
        if (Math.abs(r) < bd) { bd = Math.abs(r); best = fr * Math.pow(2, -r); }
      }
      return best;
    },
    // a small drop rings harder: its bubble swings past linear and the tone turns glassy with a few odd harmonics
    // (two shades in the upper half, one wave each); bigger drops ring as a round sine
    wave(y) {
      const k = Math.max(0, Math.round(y * 4) - 2), key = 'trp' + k, b = (k / 2) ** 2;
      if (!A.waves[key]) A.waves[key] = A.ctx.createPeriodicWave(new Float32Array(8), new Float32Array([0, 1, 0, 0.45 * b, 0, 0.2 * b, 0, 0.08 * b]));
      return key;
    },
    start(v, t, f, y, vel, o) {
      // finger height is the drop's size: a big drop (bottom) bloops up from just below and rings round, a small one
      // (top) chirps further and faster, rings glassy and ticks brighter as it hits; high notes ring shorter
      const decay = P['trp.decay'] * (o.decayMul || 1) * clamp(Math.pow(330 / f, 0.3), 0.55, 1.6);
      const depth = P['trp.chirp'] * (0.2 + 1.6 * y), rise = P['trp.rise'] * (1.3 - 0.6 * y);
      const w = P['v.width'], rich = Q.rich, wave = this.wave(y);
      // every drop starts on a one-sided swing at its lowest pitch: a gentle high-pass keeps that thump free of DC
      const bus = v.n(BQ('highpass', 30, 0.6));
      bus.connect(v.out);
      // level 3 places drops left and right; the centre parts then pass a centre panner so they keep their level
      const mid = rich ? v.n(PAN(0)) : bus;
      if (rich) mid.connect(bus);
      let end = t;
      // a bubble rings as a damped tone: as it pinches off, its resonance shoots up to the note (the chirp), then it
      // keeps creeping upward while it rises and fades – the deeper the chirp, the further it creeps. The chirp starts
      // no lower than 50 Hz and takes at most 0.4 of the ring time, so it lands on the note while the drop still rings
      // (−24 dB at the latest): a long Steigzeit glides slowly only on a long ring, and the rain lands in key
      const drop = (at, fr, amp, dec, dep, rt, dst, uni) => {
        dep = Math.min(dep, Math.max(0, Math.log2(fr / 50)));
        rt = Math.min(rt, 0.4 * dec);
        const osc = v.s(OSC(wave, fr)), g = v.n(G(0));
        osc.frequency.setValueCurveAtTime(this.ease.map((e) => fr * Math.pow(2, -dep * e)), at, rt);
        osc.frequency.linearRampToValueAtTime(fr * (1 + 0.08 * dep), at + rt + dec);
        v.mod(osc.detune);
        if (uni != null) v.lnk(A.uni[uni], osc.detune);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(amp, at + 0.0008);
        g.gain.setTargetAtTime(0, at + 0.0008, dec / 6.9);
        osc.connect(g).connect(dst);
        osc.start(at);
        osc._end = at + dec * 1.15 + 0.02;
        end = Math.max(end, osc._end);
      };
      // the impact: one noise source for all drops, ticking briefly as each of them hits the surface
      const splash = P['trp.splash'], ticks = splash > 0.01 ? v.n(G(0)) : null;
      const tick = (at, amp) => {
        if (!ticks) return;
        ticks.gain.setValueAtTime(0, at);
        ticks.gain.linearRampToValueAtTime(amp * splash, at + 0.0005);
        ticks.gain.setTargetAtTime(0, at + 0.0005, 0.0015 + 0.003 * (1 - y));
      };
      // the drop itself, a hair off pitch each time (level 3: two bubbles side by side, left and right, drifting)
      const d0 = depth * rand(0.9, 1.1), dec0 = decay * rand(0.9, 1.1);
      if (rich) [-1, 1].forEach((s, i) => {
        const p = v.n(PAN(s * 0.35 * w));
        p.connect(bus);
        drop(t, f * Math.pow(2, (s * 5 + rand(-3, 3)) / 1200), 0.5, dec0, d0, rise, p, i);
      });
      else drop(t, f * Math.pow(2, rand(-3, 3) / 1200), 1, dec0, d0, rise, mid);
      tick(t, 1.4);
      // rain: smaller drops splash off and fall back over the next moments – higher, softer, shorter, each on a note
      // of the scale, thinning out as they go. A harder hit throws more; a big drop throws a few droplets just above
      // its own note that fall back soon and ring briefly, a small one a spray of tiny ones high up. Each droplet lands
      // somewhere in its own share of the time, so they spread out instead of clumping (at most 10 per hit, level 3: 15)
      const reach = 0.5 + 0.5 * y;
      const rain = MOD.t.trp.s.size ? clamp(P['trp.rain'] + 0.65 * modVal('trp', t), 0, 1.5) : P['trp.rain'];   // Formen · Tropfen-Regen
      const spread = P['trp.spread'] * reach, x = rain * (2 + 6 * vel) * (0.15 + 1.45 * y) * (rich ? 1.5 : 1);
      const n = Math.min(Math.floor(x + Math.random()), rich ? 15 : 10);
      const times = Array.from({ length: n }, (_, k) => 0.02 + spread * Math.pow((k + Math.random()) / n, 1.6));
      for (const dt of times) {
        const at = t + dt, fade = 1 - 0.6 * dt / (spread + 0.02);
        let fr = this.inKey(f * Math.pow(2, rand(0.25, 0.9) + 1.5 * y * y));
        while (fr > 7000) fr /= 2;
        const amp = rand(0.25, 0.55) * fade * (rich ? 0.8 : 1);
        const dst = rich ? v.n(PAN(rand(-0.8, 0.8) * w)) : mid;
        if (rich) dst.connect(bus);
        drop(at, fr, amp, decay * reach * rand(0.2, 0.45), depth * rand(0.7, 1.3), rise * rand(0.5, 0.9), dst);
        tick(at, amp);
      }
      if (ticks) {
        const ns = v.s(noiseSrc()), bp = v.n(BQ('bandpass', 1500 + 5000 * y, 0.8));
        ns.connect(bp).connect(ticks).connect(mid);
        ns.start(t, rand(0, 1.8));
        ns._end = t + (times.length ? times[times.length - 1] : 0) + 0.05;
      }
      // a stereo voice gains in the voice panner off centre, so level 3 plays a little softer
      v.out.gain.value = vel * (rich ? 0.62 : 0.67);
      v.released = true;
      v.finish(end + 0.1);
    },
  },
  // ---- native engines (klang): standard nodes only, no module ----
  // Elmsfeuer (SPEC §3.9): hum → corona → arc on one column. The hum is the note folded into the bass octave, driven
  // hard; the corona is noise crossing a threshold – single ticks low, a fizz high, its colour opening with Höhe; the
  // arc is a saw one or two octaves up, stepping to fifths and octaves now and then, stuttering, band-passed with the
  // crackle inside it, and opened by the crackle (no crackle, no arc). Touching ignites it (Zündstoß), each Puls hit
  // is a zap
  elm: {
    sustain: true,
    start(v, t, f, y, vel, o) {
      const rich = Q.rich, w = P['v.width'], sr = A.ctx.sampleRate, KG = (x) => { const g = v.n(G(x)); KR(g.gain); return g; };
      const L = ELM.loops(), loop = (buf, at) => { const s = v.s(A.ctx.createBufferSource()); s.buffer = buf; s.loop = true; s.playbackRate.value = rand(0.9, 1.1); s.start(at, rand(0, 15.9)); return s; };
      // one slow wander for every hum – one mains (±4 ct, the drift's random walk)
      if (!A.elmDrift || A.elmDrift.context !== A.ctx) { A.elmDrift = G(4); A.driftSrc.connect(A.elmDrift); }
      const mid = rich ? v.n(PAN(0)) : v.out, sk = rich ? 0.65 : 1;   // (level 3: two sides, each a little softer)
      if (rich) mid.connect(v.out);
      let cy = y, cf = f;
      // the hum: one oscillator for the note folded into the bass octave (30–120 Hz) and the note itself, driven hard
      // (ELM.wave: Netz mixes them, the drive is in the wave)
      const fb = octFold(f / Math.pow(2, Math.ceil(Math.log2(f / 30))), 30), b = Math.min(fb, f), mh = Math.round(fb / b), mn = Math.round(f / b);
      let wk = ELM.wave(mh, mn, P['elm.netz']);
      const ho = v.s(OSC(wk, b)), humG = KG(0);
      v.mod(ho.detune); v.lnk(A.elmDrift, ho.detune);
      ho.connect(humG).connect(mid);
      ho.start(t);
      // the corona: two noise sources at their own places and speeds (the 2-s loop never repeats), low-passed,
      // amplified up to the threshold, the dead zone, the crack. Level 3: a corona on each side, each with its own arc
      const sides = [];
      const side = (pan) => {
        const n1 = v.s(noiseSrc()), n2 = v.s(noiseSrc()), lp = v.n(BQ('lowpass', ELM.fc(y), 0)), pre = KG(0), dz = v.n(A.ctx.createWaveShaper());
        const hc = v.n(A.ctx.createBiquadFilter()), cg = KG(0);
        n1.playbackRate.value = rand(0.97, 1.03); n2.playbackRate.value = rand(1.04, 1.1);
        dz.curve = ELM.dz; hc.type = 'highpass'; hc.frequency.value = 1500; hc.Q.value = 0;
        n1.connect(lp); n2.connect(lp);
        lp.connect(pre).connect(dz).connect(hc).connect(cg);
        let dst = mid;
        if (pan) { dst = v.n(PAN(pan * w)); dst.connect(v.out); }
        cg.connect(dst);
        n1.start(t, rand(0, 1.9)); n2.start(t, rand(0, 1.9));
        sides.push({ lp, pre, dz, cg, dst, arc: null });
      };
      if (rich) { side(-0.6); side(0.6); } else side(0);
      // the arc (built when Höhe first reaches it, or for a Puls hit): a saw at f·2^Reichweite (high notes an octave
      // less: it stays under 5 kHz) stepping along the shared pattern; the two gates (Flackern blends them, toward the
      // top it stands); with the crackle into a band-pass around its 3rd harmonic, tanh (level 3: 4× oversampled, else
      // 2×), its offset high-passed away; then opened by the follower – the ticks rectified and smoothed (30 Hz),
      // over their mean at the arc's threshold, a soft ceiling against bursts (ELM.lim), scaled by Bogen
      const arc = (S, at) => {
        if (S.arc || P['elm.bogen'] < 0.01) return;
        let am = Math.pow(2, P['elm.reichweite']);
        while (cf * am > 5000 && am > 1) am /= 2;
        const fa = cf * am, osc = v.s(OSC('sawtooth', fa)), st = loop(L.steps, at), g0 = loop(L.g0, at), g1 = loop(L.g1, at);
        const w0 = KG(0), w1 = KG(0), stut = v.n(G(0)), nz = KG(ELM.NA), bp = v.n(BQ('bandpass', Math.min(3 * fa, 0.42 * sr), 2));
        const sat = v.n(A.ctx.createWaveShaper()), hp = v.n(A.ctx.createBiquadFilter()), ag = KG(0);
        const rc = v.n(A.ctx.createWaveShaper()), fl = v.n(A.ctx.createBiquadFilter()), kn = KG(0), lm = v.n(A.ctx.createWaveShaper()), k = KG(0);
        v.mod(osc.detune); st.connect(osc.detune);
        g0.connect(w0).connect(stut.gain); g1.connect(w1).connect(stut.gain);
        sat.curve = ELM.sat; sat.oversample = rich ? '4x' : '2x'; rc.curve = ELM.rect; lm.curve = ELM.lim;
        hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = 0; fl.type = 'lowpass'; fl.frequency.value = 30; fl.Q.value = 0;
        osc.connect(stut).connect(bp); S.dz.connect(nz).connect(bp);
        bp.connect(sat).connect(hp).connect(ag).connect(S.dst);
        S.dz.connect(rc).connect(fl).connect(kn).connect(lm).connect(k).connect(ag.gain);
        osc.start(at);
        S.arc = { osc, bp, w0, w1, kn, k, ag, am };
      };
      // Höhe: the corona's colour, density and level, the arc's opening and its gates, the hum a little back at the top
      const set = (tc) => {
        const put = (p, x) => (tc ? setP(p, x, tc) : (p.value = x)), fl = P['elm.flackern'] * (1 - ELM.top(cy));
        const kn = 1 / (ELM.FM * ELM.ez(Math.max(cy, ELM.yArc()))), ka = P['elm.bogen'] * ELM.KA * ELM.fade(cy) * sk;
        put(humG.gain, ELM.humLvl(cy));
        for (const S of sides) {
          put(S.lp.frequency, ELM.fc(cy)); put(S.pre.gain, ELM.pg(cy)); put(S.cg.gain, ELM.corLvl(cy) * sk);
          if (S.arc) { put(S.arc.kn.gain, kn); put(S.arc.k.gain, ka); put(S.arc.w0.gain, 1 - fl); put(S.arc.w1.gain, fl); }
        }
      };
      if (o.burst || ELM.fade(y) > 0) for (const S of sides) arc(S, t);
      set(0);
      // Zündstoß: the arc flares for about 0.1 s; without an arc (low on the field) the corona spits a few sparks
      const zap = ELM.KZ * (0.5 + vel) * Math.max(P['elm.bogen'], 0.3) * sk;
      for (const S of sides) {
        if (S.arc) { const g = S.arc.ag.gain; g.setValueAtTime(zap, t); g.setTargetAtTime(0, t + 0.012, 0.03); }
        else { const g = S.pre.gain, x = g.value; g.setValueAtTime(x * (1.5 + 1.5 * vel), t); g.setTargetAtTime(x, t + 0.05, 0.03); }
      }
      v.setY = (ny) => {
        cy = ny;
        if (!v.released && ELM.fade(ny) > 0) for (const S of sides) arc(S, A.ctx.currentTime);
        set(0.04);
      };
      v.upd = () => {   // a knob moved while it sounds
        const kk = ELM.wave(mh, mn, P['elm.netz']);
        if (kk !== wk) { wk = kk; ho.setPeriodicWave(A.waves[kk]); }
        v.setY(cy);
      };
      v.parts = { hum: humG, sides };   // (for the tests: each stage on its own)
      v.setF = (nf, glide) => {
        cf = nf;
        glideTo(ho.frequency, Math.max(16, nf * b / f), glide);
        for (const S of sides) if (S.arc) { glideTo(S.arc.osc.frequency, nf * S.arc.am, glide); glideTo(S.arc.bp.frequency, Math.min(3 * nf * S.arc.am, 0.42 * sr), glide); }
      };
      const peak = vel * 0.3;
      if (o.burst) {   // the zap: the arc over a softer hum for the gate, then the corona crackles on for a moment
        const te = t + Math.max(0.01, o.gate), dm = o.decayMul || 1;
        v.out.gain.setValueAtTime(0, t); v.out.gain.linearRampToValueAtTime(peak, t + 0.002);
        humG.gain.value *= 0.5; humG.gain.setTargetAtTime(0, te, 0.03 * dm);
        for (const S of sides) { S.cg.gain.setTargetAtTime(0, te, 0.07 * dm); if (S.arc) { S.arc.k.gain.setTargetAtTime(0, te, 0.03 * dm); S.arc.ag.gain.setTargetAtTime(0, te, 0.03 * dm); } }
        v.released = true; v.relAt = te;
        v.finish(te + 0.5 * dm + 0.05);
        return;
      }
      adsrStart(v, t, peak, 0.003);
      // letting go: the hum drops with a click, the arc goes out, the last crackles die away
      v.release = (kr, at) => {
        if (!v.alive || v.released) return;
        v.released = true; kr = kr || 1;
        const now = relT(at), soon = now > A.ctx.currentTime;
        v.relAt = now;
        // (a note-off ahead, at its MIDI moment: the decay from wherever the param stands then – fadeAt)
        const off = (p, tc) => { if (soon) { fadeAt(p, now, tc * kr); return; } const x = p.value; p.cancelScheduledValues(now); p.setValueAtTime(x, now); p.setTargetAtTime(0, now, tc * kr); };
        off(humG.gain, 0.004);
        for (const S of sides) { off(S.cg.gain, 0.08); if (S.arc) { off(S.arc.k.gain, 0.01); off(S.arc.ag.gain, 0.01); } }
        v.finish(now + 0.55 * kr + 0.05);
      };
    },
  },
  // Jahresring (SPEC §3.12): a wooden bar under the mallet. Höhe is where it strikes (centre: round, the fundamental
  // strong; the nodal line a little above: the fundamental gone, a hollow knock; the end: bright); Schnitt blends the
  // free bar into the undercut marimba bar. The mallet – its contact and a burst of noise – through its low-pass into
  // four band-pass modes (level 3: six, on two bars left and right), then the box (low-pass) and the tube (band-pass
  // at 0.9 f, −12 dB). The year and the bar's age colour every hit (jrgSeason, A.jrgAge)
  jrg: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      jrgCount();
      const sr = A.ctx.sampleRate, rich = Q.rich, w = P['v.width'], [sp, su, au, wi] = jrgSeason();
      const age = 1 - Math.exp(-A.jrgAge / 600), K = rich ? 6 : 4, x = 0.5 + 0.5 * y, sc = P['jrg.schnitt'], lv = P['jrg.laub'];
      // the ring: Holz 0.4–3 s, the season's share, a Puls step's length (lanes ring as long as their steps), high
      // notes a little shorter; each higher mode shorter, winter's 3rd and 4th longer (glassy)
      const life = (o.decayMul || 1) * (o.gate ? clamp(o.gate / 0.35, 0.35, 1) : 1) * clamp(Math.pow(330 / f, 0.25), 0.6, 1.4);
      const t60 = jrgT60(P['jrg.holz']) * (0.6 * sp + 1.3 * su + 0.8 * au + wi) * life;
      // the mallet: its contact (a click, the same every time, so no hit comes out weak) and a 2–6 ms burst of noise
      // (harder: shorter; age: louder), through the mallet's low-pass, 2–8 kHz by Schlägel and the hit (spring and
      // winter brighter, autumn duller). The contact loops on far below hearing until the voice ends (jrgImp)
      const bright = 1 + 0.4 * sp + 0.2 * wi - 0.15 * au;
      const mlp = v.n(BQ('lowpass', Math.min(0.45 * sr, 2000 * Math.pow(4, P['jrg.schlaegel']) * (0.6 + 0.8 * vel) * bright), 0));
      const imp = v.s(A.ctx.createBufferSource());
      imp.buffer = jrgImp(); imp.loop = true; imp.loopStart = 2 / sr; imp.loopEnd = imp.buffer.duration;
      imp.connect(mlp); imp.start(t);
      const ns = v.s(noiseSrc()), ng = v.n(G(0)), gd = 0.006 - 0.004 * vel;
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.03 * (1 + 0.5 * age), t + 0.0005); ng.gain.linearRampToValueAtTime(0, t + gd);
      ns.connect(ng).connect(mlp); ns.start(t, rand(0, 1.9)); ns._end = t + gd + 0.005;
      // winter: a tiny ice crack 25–60 ms later – a second contact at −10 dB through the mallet into the modes, and the
      // crack itself, a 2-ms tick of white noise past the box
      if (lv * wi > 0.02) {
        const at = t + rand(0.025, 0.06), ic = v.s(A.ctx.createBufferSource()), ig = v.n(G(0.32 * lv * wi)), nt = v.s(noiseSrc()), tg = v.n(G(0));
        ic.buffer = jrgImp(); ic.connect(ig).connect(mlp); ic.start(at); ic._end = at + 0.01;
        tg.gain.setValueAtTime(0, at); tg.gain.linearRampToValueAtTime(0.45 * lv * wi, at + 0.0003); tg.gain.linearRampToValueAtTime(0, at + 0.0025);
        nt.connect(tg).connect(v.out); nt.start(t, rand(0, 1.9)); nt._end = at + 0.01;
      }
      // the modes: ratios blended by Schnitt (winter: the upper ones 2 % sharp, never the fundamental), the strength
      // where the mallet strikes (the fundamental keeps a floor of 0.1 for melody; spring and winter thin it), the upper
      // ones weaker under a soft mallet or a gentle hit; a band-pass each, its gain matched to its Q so the contact gives
      // it that strength. Spring: every mode starts 25 ct high and settles in 60 ms; autumn: the upper modes ±8 ct per
      // hit; age: all of them up to 6 ct flat
      const md = [], tilt = 0.5 * (1 - 0.7 * P['jrg.schlaegel']) * (1.15 - 0.3 * vel);
      for (let k = 0; k < K; k++) {
        const r = Math.pow(JRG_FREE[k], 1 - sc) * Math.pow(JRG_MAR[k], sc) * (k ? 1 + 0.02 * wi : 1), fk = f * r;
        if (fk > Math.min(16000, 0.4 * sr)) break;
        let g = Math.abs(jrgPhi(k, x)) / 2 * Math.pow(r, -tilt);
        if (!k) g = Math.max(0.05, g) * (1 - 0.2 * sp - 0.5 * wi);
        md.push({ fk, g, T: t60 * (1 - 0.5 * k / K) * (k === 2 || k === 3 ? 1 + 1.5 * wi : 1), c: k ? rand(-8, 8) * au : 0 });
      }
      const norm = 1 / Math.max(0.7, Math.sqrt(md.reduce((a, m) => a + m.g * m.g, 0)));
      // the box: opening toward the bar's end, brighter in spring and winter, darker in autumn and with age
      const kc = Math.min(0.45 * sr, clamp(8 * f, 1500, 14000) * (0.75 + 0.5 * y) * (1 + 0.4 * sp + 0.3 * wi - 0.2 * au) * (1 - 0.2 * age));
      let tMax = 0.3;
      // one bar (level 3: two, ±3 ct, left and right): modes → sum → box (with the knock) and tube → out
      const bar = (det, pan, share) => {
        const sum = v.n(G(share)), box = v.n(BQ('lowpass', kc, 0)), tube = v.n(BQ('bandpass', 0.9 * f, 5)), tg = v.n(G(0.25)), kn = v.n(G(0.6 * share));
        let dst = v.out;
        if (rich) { dst = v.n(PAN(pan * w)); dst.connect(v.out); }
        sum.connect(box); sum.connect(tube).connect(tg).connect(box); mlp.connect(kn).connect(box);
        box.connect(dst);
        for (const m of md) {
          const q = Math.PI * m.fk * m.T / 6.9, bp = v.n(BQ('bandpass', m.fk, q)), mg = v.n(G(2 * m.g * norm * q / Math.sin(2 * Math.PI * m.fk / sr)));
          const c = -6 * age + det + m.c;
          v.mod(bp.detune);
          bp.detune.setValueAtTime(c + 25 * sp, t);
          if (sp > 0.01) bp.detune.setTargetAtTime(c, t, 0.02);
          mlp.connect(bp).connect(mg).connect(sum);
          tMax = Math.max(tMax, m.T);
        }
      };
      if (rich) { bar(-3, -1, 0.53); bar(3, 1, 0.53); } else bar(0, 0, 1);   // (wide apart: their onsets do not pile up)
      // autumn: leaves rustle after the knock – 120–300 ms of a few small bursts of noise through a band-pass at 3–6 kHz
      if (lv * au > 0.02) {
        const ln = v.s(noiseSrc()), lb = v.n(BQ('bandpass', rand(3000, 6000), 1.2)), lg = v.n(G(0)), dur = rand(0.12, 0.3), n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const at = t + 0.012 + dur * (i + Math.random() * 0.7) / n;
          lg.gain.setTargetAtTime(1.2 * lv * au * rand(0.4, 1), at, 0.004); lg.gain.setTargetAtTime(0, at + 0.008, 0.012);
        }
        let ld = v.out;
        if (rich) { ld = v.n(PAN(rand(-0.6, 0.6) * w)); ld.connect(v.out); }
        ln.connect(lb).connect(lg).connect(ld);
        ln.start(t, rand(0, 1.9)); ln._end = t + dur + 0.1;
      }
      v.out.gain.setValueAtTime(vel * 0.64, t);
      v.released = true;
      v.finish(t + tMax + 0.15);
    },
  },
  // ---- worklet engines (klang): the processor is exciter + resonator, envelopes stay native on v.out ----
  // Halm: a reed blown by the finger's height (myzel-blow). Below a quarter of the field only air, then the tone speaks;
  // a Puls hit is a tongue stroke at the sweet spot. Without AudioWorklet it plays as Hauch.
  hlm: {
    sustain: true, needs: 'worklet', fallback: 'hau',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-blow', f, y, { prm: wkPrm('hlm'), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      // the end: the reed and the flute stop with the breath; the flame's tube rings out in its hiss (one last crack)
      const peak = vel * 0.9, fl = P['hlm.rohr'] === 'flamme', rel = fl ? 0.8 : 0.08;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, (fl ? 0.35 : 0.08) * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.004, rel);
    },
  },
  // Kehlchen: a songbird's syrinx (myzel-syrinx). Höhe is the air sac's pressure: breath below the threshold, then a
  // chip, a clear whistle, rough at the top; Silbe shapes every onset (a jump of Höhe, a shake and each Puls hit start
  // one). Let go: the pressure falls, the labia stop within milliseconds. Stand-in: Schwarm.
  khl: {
    sustain: true, needs: 'worklet', fallback: 'swm',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-syrinx', f, y, { prm: wkPrm('khl'), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * KHL_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.06 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.004, 0.08);
    },
  },
  // ---- Klangbibliothek II, Etappe 1 (26.10.2026): Welt. Struck sources ring as long as their processor says (Nachklang;
  // a Puls hit shorter, as every struck source's life follows the gate); held ones as their kind. ----
  // Handpan: a steel tone field (myzel-hng) – Höhe is where the hand strikes. Stand-in: Glocke.
  hng: {
    sustain: false, needs: 'worklet', fallback: 'glo',
    start(v, t, f, y, vel, o) {
      const L0 = (2 + 10 * P['hng.nachklang']) * clamp(Math.pow(220 / f, 0.3), 0.6, 1.5) * 1.15, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      wkVoice(v, 'myzel-hng', f, y, { prm: wkPrm('hng'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      wkRing(v, t, HNG_PEAK, life);
    },
  },
  // Gamelan: bronze keys in pairs (myzel-gml) – Höhe is the mallet; a new stroke damps the one before on the same
  // channel (Abdämpfen, the player's other hand). Stand-in: Glocke.
  gml: {
    sustain: false, needs: 'worklet', fallback: 'glo',
    start(v, t, f, y, vel, o) {
      const L0 = (1.4 + 8 * P['gml.nachklang']) * clamp(Math.pow(300 / f, 0.55), 0.5, 2) * 1.3, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      if (P['gml.daempfen'] > 0) for (const w of A.voices) if (w !== v && w.alive && w.as === 'gml' && w.wk && w.bus === v.bus && w.t0 < t) w.wk.port.postMessage({ damp: 1, t: t + 0.004 });
      wkVoice(v, 'myzel-gml', f, y, { prm: wkPrm('gml'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      wkRing(v, t, GML_PEAK, life);
    },
  },
  // Sitar: a string on a curved bridge, chikari and tarab strings (myzel-sit) – Höhe is the bridge (clean → jawari);
  // the tarab tuned to the scale around the middle of the field, the chikari to the key's Sa. Stand-in: Saite.
  sit: {
    sustain: false, needs: 'worklet', fallback: 'sai',
    start(v, t, f, y, vel, o) {
      const L0 = (2 + 9 * P['sit.nachklang']) * clamp(Math.pow(260 / f, 0.35), 0.5, 1.5) * 1.15, dmul = wkDmul(o, L0), life = L0 * dmul + 0.4 + (o.gate ? 0 : 1.5 * P['sit.tarab']);   // (the tarab ring on)
      wkVoice(v, 'myzel-sit', f, y, { prm: wkPrm('sit'), seed: wkSeed(), ch: sitChikari(), tar: sitTarab(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      wkRing(v, t, SIT_PEAK, life);
    },
  },
  // Tabla: the dayan's loaded skin, the bayan below its limit (myzel-tbl) – Höhe is the stroke (Tun · Tin · Na; on the
  // bayan Ge … Ke); held, moving up raises the bayan's pitch (the heel). Let go: the drum rings on. Stand-in: Membran.
  tbl: {
    sustain: true, needs: 'worklet', fallback: 'mem',
    start(v, t, f, y, vel, o) {
      const L0 = (0.4 + 1.6 * P['tbl.nachklang']) * 1.4, dmul = wkDmul(o, L0), life = L0 * dmul + 0.25;
      wkVoice(v, 'myzel-tbl', f, y, { prm: wkPrm('tbl'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      v.out.gain.setValueAtTime(TBL_PEAK, t);
      if (o.burst) { wkRing(v, t, TBL_PEAK, life); return; }
      v.release = (k, at) => { if (!v.alive || v.released) return; const now = relT(at); v.wk.port.postMessage({ off: now }); v.released = true; v.relAt = now; v.out.gain.setTargetAtTime(0, now + life, 0.05); v.finish(now + life + 0.3); };
    },
  },
  // Didgeridoo: lips in a long tube (myzel-did) – Höhe is the tongue; a Puls hit is a toot. Stand-in: Obertöne.
  did: {
    sustain: true, needs: 'worklet', fallback: 'obt',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-did', f, y, { prm: wkPrm('did'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * DID_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.012, o.gate, 0.18 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.03, 0.25);
    },
  },
  // Maultrommel: a steel tongue, the mouth as resonator (myzel-mtr) – Höhe is the mouth (which overtone sings); held,
  // the thumb plucks again. Let go: the tongue rings out. Stand-in: Obertöne.
  mtr: {
    sustain: true, needs: 'worklet', fallback: 'obt',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-mtr', f, y, { prm: wkPrm('mtr'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * MTR_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.3 * (o.decayMul || 1));   // (a twang: it ends within the next step)
      else wkHold(v, t, peak, 0.002, 0.7);
    },
  },
  // Nordlicht: an additive surface under moving curtains (myzel-nrd) – Höhe lifts the curtains. Stand-in: Nebel.
  nrd: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-nrd', f, y, { prm: wkPrm('nrd'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * NRD_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.03, o.gate, 0.5 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.03, 1.4);
    },
  },
  // Schimmer: a surface in its own rising room (myzel-sht) – Höhe is the shimmer; let go, the halo rings out. Stand-in: Nebel.
  sht: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-sht', f, y, { prm: wkPrm('sht'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * SHT_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.05, o.gate, 1.2 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.05, 3.5);
    },
  },
  // Ätherwelle: the Ondes Martenot (myzel-ond) – Höhe glides through its timbres; its diffuseurs ring. Stand-in: Nebel.
  ond: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-ond', f, y, { prm: wkPrm('ond'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * OND_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.02, o.gate, 0.12 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.02, 0.15);
    },
  },
  // Walgesang: a humpback's moan under water (myzel-wal) – Höhe is the arc; held, the song goes on. Stand-in: Stimme.
  wal: {
    sustain: true, needs: 'worklet', fallback: 'stm',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-wal', f, y, { prm: wkPrm('wal'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * WAL_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.12, o.gate, 0.5 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.12, 0.9);
    },
  },
  // Endlostreppe: the Shepard–Risset glissando (myzel-stp) – Höhe is the stair (still in the middle). Stand-in: Nebel.
  stp: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-stp', f, y, { prm: wkPrm('stp'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * STP_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.08, o.gate, 0.3 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.08, 0.6);
    },
  },
  // Attraktor: the Rössler system played (myzel-atr) – Höhe is the road to chaos. Stand-in: Amöbe.
  atr: {
    sustain: true, needs: 'worklet', fallback: 'amo',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-atr', f, y, { prm: wkPrm('atr'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * ATR_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.01, o.gate, 0.12 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.01, 0.12);
    },
  },
  // Tunnel: a jet through a tuned tube (myzel-tnl) – Höhe is the pull. Stand-in: Hauch.
  tnl: {
    sustain: true, needs: 'worklet', fallback: 'hau',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-tnl', f, y, { prm: wkPrm('tnl'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * TNL_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.04, o.gate, 0.25 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.04, 0.4);
    },
  },
  // Westküste: complex oscillator, wavefolder, low pass gate (myzel-wkg) – Höhe folds. Stand-in: Nebel.
  wkg: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-wkg', f, y, { prm: wkPrm('wkg'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * WKG_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.4 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.002, 1.2);
    },
  },
  // Schaltkreis: a circuit-bent toy (myzel-bnt) – Höhe is the destruction. Stand-in: Körner.
  bnt: {
    sustain: true, needs: 'worklet', fallback: 'kor',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-bnt', f, y, { prm: wkPrm('bnt'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * BNT_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.003, o.gate, 0.06 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.003, 0.08);
    },
  },
  // Kassette: a tine piano on a worn tape (myzel-kas) – Höhe is the strike; let go, the damper. Stand-in: Kalimba.
  kas: {
    sustain: true, needs: 'worklet', fallback: 'klb',
    start(v, t, f, y, vel, o) {
      const L0 = (1.2 + 7 * P['kas.nachklang']) * clamp(Math.pow(260 / f, 0.6), 0.35, 1.6) * 1.2, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      wkVoice(v, 'myzel-kas', f, y, { prm: wkPrm('kas'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      v.out.gain.setValueAtTime(KAS_PEAK, t);
      if (o.burst) { wkRing(v, t, KAS_PEAK, life); return; }
      v.release = (k, at) => { if (!v.alive || v.released) return; const now = relT(at); v.wk.port.postMessage({ off: now }); v.released = true; v.relAt = now; v.out.gain.setTargetAtTime(0, now + 0.6, 0.08); v.finish(now + 1.1); };
      v.finish(t + life);
    },
  },
  // Achtbit: a pulse-wave sound chip (myzel-bit) – Höhe is the width. Stand-in: Obertöne.
  bit: {
    sustain: true, needs: 'worklet', fallback: 'obt',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-bit', f, y, { prm: wkPrm('bit'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * BIT_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.08 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.002, 0.13);
    },
  },
  // Gleitbass: the 808 bass (myzel-gbs) – Höhe is the drive; a note while the last still sounds glides from it (legato,
  // that one is cut). Stand-in: Tiefe.
  gbs: {
    sustain: true, needs: 'worklet', fallback: 'tie',
    start(v, t, f, y, vel, o) {
      let from = 0; if (P['gbs.gleiten'] > 0.02 && !o.burst) for (const w of A.voices) if (w !== v && w.alive && w.as === 'gbs' && w.bus === v.bus && w.t0 < t && w._gf && (!w.released || t - w.relAt < 0.25)) { from = w._gf; w.out.gain.cancelScheduledValues(t); w.out.gain.setTargetAtTime(0, t, 0.012); w.released = true; w.relAt = t; w.finish(t + 0.1); }
      v._gf = f;
      wkVoice(v, 'myzel-gbs', f, y, { prm: wkPrm('gbs'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed(), from } });
      const peak = vel * GBS_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.001, o.gate, 0.12 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.001, 0.1);
    },
  },
  // Zischel: the 808 hi-hat (myzel-hht) – Höhe opens it; a new hat chokes an open one on the same channel. Stand-in: Membran.
  hht: {
    sustain: false, needs: 'worklet', fallback: 'mem',
    start(v, t, f, y, vel, o) {
      const L0 = (0.03 + 1.1 * Math.pow(clamp(y, 0, 1), 1.7)) * 1.6 + 0.1, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      if (P['hht.abwuergen'] > 0.5) for (const w of A.voices) if (w !== v && w.alive && w.as === 'hht' && w.wk && w.bus === v.bus && w.t0 < t) w.wk.port.postMessage({ choke: 1, t: t + 0.002 });
      wkVoice(v, 'myzel-hht', f, y, { prm: wkPrm('hht'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed(), burst: !!o.burst, gate: o.burst ? o.gate : 0 } });
      wkRing(v, t, HHT_PEAK, life);
    },
  },
  // Silbe: a sung syllable (myzel-vox) – Höhe is the vowel. Stand-in: Stimme.
  vox: {
    sustain: true, needs: 'worklet', fallback: 'stm',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-vox', f, y, { prm: wkPrm('vox'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * VOX_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.004, o.gate, 0.08 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.004, 0.12);
    },
  },
  // Spieluhr: a music box (myzel-spu) – Höhe is the winding. Stand-in: Kalimba.
  spu: {
    sustain: false, needs: 'worklet', fallback: 'klb',
    start(v, t, f, y, vel, o) {
      const L0 = (1.5 + 6 * P['spu.nachklang']) * clamp(Math.pow(523 / f, 0.7), 0.35, 1.8) + 0.2, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      wkVoice(v, 'myzel-spu', f, y, { prm: wkPrm('spu'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed(), burst: !!o.burst, gate: o.burst ? o.gate : 0 } });
      wkRing(v, t, SPU_PEAK, life);
    },
  },
  // Koto: a silk string, an ivory nail (myzel-kto) – Höhe is the pluck, held moving up presses behind the bridge. Stand-in: Saite.
  kto: {
    sustain: true, needs: 'worklet', fallback: 'sai',
    start(v, t, f, y, vel, o) {
      const L0 = (1.2 + 6 * P['kto.nachklang']) * clamp(Math.pow(260 / f, 0.5), 0.4, 1.6) * 1.15, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      wkVoice(v, 'myzel-kto', f, y, { prm: wkPrm('kto'), seed: wkSeed(), on: { on: t, f, y, vel, dmul, seed: wkSeed() } });
      v.out.gain.setValueAtTime(KTO_PEAK, t);
      if (o.burst) { wkRing(v, t, KTO_PEAK, life); return; }
      v.release = (k, at) => { if (!v.alive || v.released) return; const now = relT(at); v.wk.port.postMessage({ off: now }); v.released = true; v.relAt = now; v.out.gain.setTargetAtTime(0, now + 0.6, 0.08); v.finish(now + 1.1); };
      v.finish(t + life);
    },
  },
  // Ranke: scanned synthesis on a ring of masses (myzel-scan). Touch = a hammer (Höhe: wide and soft → narrow and
  // bright), held = a steady push keeps the form alive; Puls = hammer only, the ring three times faster. Stand-in: Nebel.
  rnk: {
    sustain: true, needs: 'worklet', fallback: 'neb',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-scan', f, y, { prm: wkPrm('rnk'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * 1.25;   // (the ring's output is spiky: the processor keeps ≥ 2 dB headroom below its soft clip)
      if (o.burst) burstEnv(v, t, peak, 0.003, o.gate, 0.4 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.003, 0.6);
    },
  },
  // Harz: a bow on the modes of a body (myzel-bow). Höhe is the bow's pressure: a breath of friction low on the field,
  // the tone swells within tenths of a second, rougher and louder higher up, at the very top it slips and tears (the
  // Teich's rod screams). Let go: the bow lifts and the modes ring as long as Dämpfung says – the native release is
  // six times slower (the ring is the release; the processor ends the voice once it is silent). Puls: a stroke (a
  // short one with a pluck). Stand-in: Schale.
  hrz: {
    sustain: true, needs: 'worklet', fallback: 'sch',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-bow', f, y, { prm: wkPrm('hrz'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * HRZ_PEAK, t60 = hrzT60(P['hrz.daempfung']);
      if (o.burst) burstEnv(v, t, peak * (o.gate < 0.3 ? 2 : 1), 0.005, o.gate, Math.min(t60, 3) * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.005, clamp(6 * t60, 0.5, 40));
    },
  },
  // Moder: a Kompostglocke (myzel-rot). A clear strike – bell, wood or bone –, then the fungus eats the upper partials:
  // each crumbles into a crackle on its own pitch while the fundamental swells (an inverted envelope), holds as a round
  // hum and dries out with a last crackle within the Nachklang. Höhe at the hit is the moisture (dry: nearly an
  // ordinary bell darkening slowly; wet: fast compost, strong crackle, a thick hum). Puls: SPEC §3.10's gate scaling – a
  // step's gate shortens the life (×0.25–1) and speeds the digestion (×1–6), so a fast lane keeps ≤ 10 voices. The
  // processor ends the voice at −60 dB ({done}); the finish here is only the safety. Stand-in: Glocke.
  mdr: {
    sustain: false, needs: 'worklet', fallback: 'glo',
    start(v, t, f, y, vel, o) {
      const dm = o.decayMul || 1, life = P['mdr.nachklang'] * (o.gate ? clamp(o.gate, 0.25, 1) : 1) * dm;
      const sc = Math.max(o.gate ? clamp(1 / o.gate, 1, 6) : 1, clamp(5 / life, 1, 6)) / dm;   // (a short Nachklang runs the compost faster too)
      wkVoice(v, 'myzel-rot', f, y, { prm: wkPrm('mdr'), seed: wkSeed(), on: { on: t, f, y, vel, life, sc, seed: wkSeed() } });
      v.out.gain.setValueAtTime(MDR_PEAK, t);
      v.out.gain.setTargetAtTime(0, t + 1.3 * life, 0.02);   // (the safety's own fade – the processor is silent long before)
      v.released = true; v.relAt = t;
      v.finish(t + 1.3 * life + 0.1);
    },
  },
  // Böe: an aeolian harp (myzel-aeol). Höhe is the wind's strength: the string (harmonic) it catches sings, the ones
  // caught before ring on – a chord of memory that gusts and a slow walk of the wind move on. Let go: the wind dies
  // within 0.3 s and the strings ring as Nachklang says – the native release is six times slower (the ring is the
  // release; the processor ends the voice once it is silent). Puls: a gust-pluck that rings past the gate. Stand-in:
  // Obertöne.
  boe: {
    sustain: true, needs: 'worklet', fallback: 'obt',
    start(v, t, f, y, vel, o) {
      wkVoice(v, 'myzel-aeol', f, y, { prm: wkPrm('boe'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * BOE_PEAK, nk = P['boe.nachklang'];
      if (o.burst) burstEnv(v, t, peak * BOE_BURST, 0.005, o.gate, Math.min(2, nk) * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.005, clamp(6 * nk, 1, 40));
    },
  },
  // Amöbe: Xenakis' GENDY with the pitch held (myzel-gendy) – a polygon that changes its form every period while the
  // period stays. Höhe is the unrest: a calm, strange organ low on the field, the harmonics wander in the middle, at the
  // top the wave rages – a raw noise with a pitch. A touch seeds the polygon (harder: a more extreme form); Rückkehr
  // heals every burst back to it. Puls: Zucken – 35 ms of a wild run, every hit freshly seeded; a shake (Gestik) is a
  // burst that heals. Lives low (a declared bass, 50–500 Hz; higher the polygon keeps fewer points). Stand-in: Tiefe.
  amo: {
    sustain: true, needs: 'worklet', fallback: 'tie',
    start(v, t, f, y, vel, o) {
      const rel = P['amo.rel'] * (o.decayMul || 1);   // (the processor fades with it: the native part is slowed by AMO_REL)
      wkVoice(v, 'myzel-gendy', f, y, { prm: wkPrm('amo'), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, rel: o.burst ? rel : undefined, seed: wkSeed() } });
      const peak = vel * AMO_PEAK;
      if (o.burst) { burstEnv(v, t, peak, 0.005, o.gate, rel * AMO_REL); return; }
      // held: the native envelope, and the processor fades with it (a slow or quick lift stretches both)
      adsrStart(v, t, peak, P['amo.att']);
      const r = sustainRelease(v, P['amo.rel'] * AMO_REL);
      v.release = (k, at) => { if (v.alive && !v.released && v.wk) v.wk.port.postMessage({ off: relT(at), k }); r(k, at); };
    },
  },
  // Gespinst: a plucked string on the finger (Saite's, its own colour: Höhe opens it) and its send into the one web
  // of sympathetic strings (myzel-web, gspWeb) – vel² and Höhe set how much goes in, Sporenregen sends half; at level 3
  // a double course as Saite's. Stand-in without the module: Saite.
  gsp: {
    sustain: false, needs: 'worklet', fallback: 'sai',
    start(v, t, f, y, vel, o) {
      const W = gspWeb();
      const { buf, rate } = ksBuffer(f, 0.55, clamp(1.75 * P['gsp.nachklang'], 1.2, 8) * (o.decayMul || 1), 0.4, 0.18);   // (the finger's string rings 1.75 × the web's Nachklang)
      const lp = v.n(BQ('lowpass', clamp(f * Math.pow(2, 1.5 + 7 * clamp(y, 0, 1)), 200, 20000), -3));
      for (const side of Q.rich ? [-1, 1] : [0]) {
        const s = v.s(A.ctx.createBufferSource()); s.buffer = buf; s.playbackRate.value = rate;
        if (side) { if (s.detune) s.detune.value = side * 3; else s.playbackRate.value = rate * Math.pow(2, side * 3 / 1200); }
        if (s.detune) v.mod(s.detune);
        if (side) s.connect(v.n(G(0.66))).connect(v.n(PAN(side * 0.4 * P['v.width']))).connect(lp); else s.connect(lp);   // (the double choir: two strings ±3 ct, together as loud as the one at level 1)
        s.start(t + (side > 0 ? 0.002 : 0));
      }
      lp.connect(v.out);
      v.out.gain.value = vel * GSP_PEAK;
      if (W) {   // the send: post-fader on the voice's own channel (gspSend), so a muted lane feeds nothing
        const bus = o.bus || stripIn('fin'), sg = v.n(G(vel * vel * (0.3 + 0.7 * clamp(y, 0, 1)) * (bus === stripIn('rgn') ? 0.5 : 1)));
        lp.connect(sg).connect(gspSend(bus));
        W.active = true;
      }
      v.released = true;
      v.finish(t + buf.duration / rate + 0.02);
    },
  },
  // Rhizom (klang SPEC §3.13): the strike fires its node in the net – it always pings, on the note itself – and the
  // net carries it on (rhzFire, rhzRun); the voice lives until nothing it carries is underway and its last ping rang out
  rhz: {
    sustain: false,
    start(v, t, f, y, vel, o) {
      const R = rhzVoice(v, t, f, y, vel, o);
      v.out.gain.setValueAtTime(vel * RHZ_PEAK * R.kn.lv, t);
      v.released = true;
      rhzFire(v, t, R.i0, 0, true);
      rhzRun(rhzAhead() ? Infinity : Math.max(RHZ.h, t + 0.05));
    },
  },
  // Sehne: a live string (myzel-string). The touch plucks it; then it lives under the finger – sliding glides it (no new
  // pluck), Höhe is the hand: the palm (a thud), the open string, a light touch at a node (flageolet ½ / ⅓ / ¼), the
  // E-Bow (the dying string swells back and holds; at the top it tips into the octave). Let go: the hand mutes it.
  // Puls: a pluck, muted after the gate – short gates are a palm-mute riff; a lane stays below the E-Bow unless its gate
  // is a second or more (an E-Bow on every step would never let go). Stand-in: Saite.
  shn: {
    sustain: true, needs: 'worklet', fallback: 'sai',
    start(v, t, f, y, vel, o) {
      if (o.burst && !(o.gate >= 1)) y = Math.min(y, 0.8);
      wkVoice(v, 'myzel-string', f, y, { prm: wkPrm('shn'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      // the price follows the hand: the E-Bow's zone costs more (voiceLoad() sums v.cost)
      const lo = v.cost, hi = Math.max(lo, SHN_EBOW_COST[Q.rich ? 1 : 0]), sy = v.setY;
      v.cost = y > 0.84 ? hi : lo;
      v.setY = (ny) => { sy(ny); v.cost = ny > 0.84 ? hi : lo; };
      const peak = vel * SHN_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.3 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.003, 0.25);
    },
  },
  // Zapfen: a stick over the scales of a cone (myzel-scrape). Höhe is the scrape rate: single ticks low on the field,
  // each a knock ringing on the note, then a rasp; above the Rast the rate locks onto f/16 … f/2 and at the top it is
  // the note – a raw, sawing tone with a wooden formant; Fels: a stone that creaks and turns into a tone. Puls: a stroke
  // (the rate swells and coasts, a last knock). Without AudioWorklet its own native stand-in (zpfNative), not another
  // source.
  zpf: {
    sustain: true, needs: 'worklet', fallback: 'native',
    start(v, t, f, y, vel, o) {
      if (!wkReady('zpf')) return zpfNative(v, t, f, y, vel, o);
      wkVoice(v, 'myzel-scrape', f, y, { prm: wkPrm('zpf'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      const peak = vel * ZPF_PEAK;
      if (o.burst) burstEnv(v, t, peak, 0.002, o.gate, 0.25 * (o.decayMul || 1));
      else wkHold(v, t, peak, 0.002, P['zpf.koerper'] === 'fels' ? 0.5 : 0.3);   // (let go: the stick coasts, the stone creaks once or twice more)
    },
  },
  // Glut: a tuned feedback loop (myzel-ember). Höhe is the loop's gain as growth per second: under a third of the field
  // a knock and a muffled ping, above it the tone grows by itself, swings in and breathes; at the top it jumps to the
  // octave or the twelfth. Let go: it glows on (Nachglühen) – the loop decays, the envelope only closes it. Puls: the
  // loop's state is set at once and grows for the gate, then glows. Without AudioWorklet: its own native loop.
  glt: {
    sustain: true, needs: 'worklet', fallback: 'native',
    start(v, t, f, y, vel, o) {
      if (gltNat()) gltNative(v, t, f, y, vel, o);
      else wkVoice(v, 'myzel-ember', f, y, { prm: wkPrm('glt'), seed: wkSeed(), on: { on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed() } });
      gltEnv(v, t, vel, o);
    },
  },
};

