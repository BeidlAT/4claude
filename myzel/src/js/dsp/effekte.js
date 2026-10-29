  // ---- Die Effektseite (owner, 29.10.2026: „eine Effektseite … etwas, das man im Mixer dazuschalten kann, damit die
  // Klänge noch vielschichtiger und kreativer werden“ – dev/klang/effektseite.md): the return „Effekt“ of the mixer plays
  // one of these, chosen (fx.typ); every channel sends into it as into echo and hall. Each a processor of its own (stereo
  // in, stereo out, wet only); its knobs arrive as {set:{…}} (gliding where they move a sound), the scale as {freqs},
  // the Puls's beat as {beat}. Quiet input and a rung-out tail: the processor reports {idle} and costs little.
  //   netz      Resonanz-Netz: strings (or bells, or a wooden body) tuned to the scale ring with whatever is played
  //   wolke     the cloud: grains of what was just played come back in time with the beat – octaves, backwards, wide
  //   spektral  Spektral-Nebel: the sound melts into a standing surface (its spectrum held and smeared, phases free)
  //   oktav     Oktav-Echo: an echo that climbs – each repeat shifted (an octave, a fifth) and a little darker
  //   vokal     Vokal-Filter: the sound speaks – three formants gliding through a, e, i, o, u ----
  const FX_LP = (r) => { const q = [0.51, 0.6, 0.9, 2.56], w = 2 * Math.PI * 0.45 / r, cs = Math.cos(w), sn = Math.sin(w), c = new Float64Array(20);
    for (let k = 0; k < 4; k++) { const al = sn / (2 * q[k]), a0 = 1 + al; c[5 * k] = (1 - cs) / 2 / a0; c[5 * k + 1] = (1 - cs) / a0; c[5 * k + 2] = (1 - cs) / 2 / a0; c[5 * k + 3] = -2 * cs / a0; c[5 * k + 4] = (1 - al) / a0; }
    return { c, z: new Float64Array(8) }; };
  const fxLpTick = (F, x) => { const c = F.c, z = F.z; for (let k = 0; k < 4; k++) { const y = c[5 * k] * x + z[2 * k]; z[2 * k] = c[5 * k + 1] * x - c[5 * k + 3] * y + z[2 * k + 1]; z[2 * k + 1] = c[5 * k + 2] * x - c[5 * k + 4] * y; x = y; } return x; };
  class FxBase extends AudioWorkletProcessor {
    constructor(o) {
      super();
      const po = (o && o.processorOptions) || {};
      this.p = Object.assign({}, this.defaults(), po.set || {}); this.beat = po.beat || 0.5; this.freqs = po.freqs || [220, 247, 277, 330, 370, 440];
      this.quiet = 0; this.idle = false; this.alive = true;
      this.port.onmessage = (e) => { const m = e.data || {}; if (m.kill) { this.alive = false; return; } if (m.set) for (const k in m.set) this.p[k] = +m.set[k]; if (m.beat) this.beat = Math.max(0.05, Math.min(4, +m.beat)); if (m.freqs && m.freqs.length) { this.freqs = m.freqs.slice(); this.tune && this.tune(); } };
    }
    defaults() { return {}; }
    process(inputs, outputs) {
      if (!this.alive) return false;
      const I = inputs[0], O = outputs[0], n = O[0].length, iL = I && I[0] ? I[0] : null, iR = I && I[1] ? I[1] : iL, oL = O[0], oR = O[1] || O[0];
      let e = 0; if (iL) for (let i = 0; i < n; i++) e += Math.abs(iL[i]) + Math.abs(iR[i]);
      this.run(iL, iR, oL, oR, n);
      let eo = 0; for (let i = 0; i < n; i++) eo += Math.abs(oL[i]) + Math.abs(oR[i]);
      // (resting: nothing in and nothing left ringing – the page may take it out of the path)
      if (e < 1e-7 && eo < 1e-6) { if (++this.quiet === 400 && !this.idle) { this.idle = true; this.port.postMessage({ idle: 1 }); } } else { this.quiet = 0; if (this.idle) { this.idle = false; this.port.postMessage({ idle: 0 }); } }
      return true;
    }
  }

  // ---- Resonanz-Netz: up to 18 resonators on the scale's notes (over three octaves from its root up). art 0 Saiten
  // (strings: a delay line each, its fraction in a Thiran allpass – every note as bright as the next; a loop low pass,
  // the decay set per note), 1 Glocken (each note four bell partials as decaying two-pole resonators), 2 Korpus (a wooden
  // body: twelve fixed modes 90 Hz … 2.4 kHz, short – the scale does not tune it). klang: how long they ring (0.4 … 14 s),
  // hell: how bright, breite: spread, ton: an octave down … up. ----
  class Netz extends FxBase {
    defaults() { return { art: 0, klang: 0.5, hell: 0.6, breite: 0.7, ton: 0 }; }
    constructor(o) {
      super(o);
      this.K = 18; this.lines = []; for (let k = 0; k < this.K; k++) this.lines.push({ b: new Float32Array(4096), w: 0, D: 100, ca: 0, xa: 0, ya: 0, lp: 0, g: 0.99, f: 220, pan: 0 });
      this.res = []; this.hp = 0; this.hpx = 0; this.tuned = '';
      this.tune();
    }
    tune() {
      const p = this.p, art = Math.round(p.art), T60 = 0.4 * Math.pow(35, p.klang), sh = Math.pow(2, Math.round(p.ton));
      const key = [art, p.klang.toFixed(3), p.hell.toFixed(3), p.breite.toFixed(3), sh, this.freqs.join(',')].join('|'); if (key === this.tuned) return; this.tuned = key;
      const base = this.freqs.slice().sort((a, b) => a - b), notes = [];
      for (let o = 0; notes.length < this.K && o < 4; o++) for (const f of base) { const x = f * sh * Math.pow(2, o); if (x > 60 && x < 0.2 * SR && notes.length < this.K) notes.push(x); }
      this.lines.forEach((L, k) => {
        const f = notes[k % notes.length] || 220; L.f = f; L.pan = (((k * 7) % this.K) / (this.K - 1) * 2 - 1) * p.breite;
        const s = 0.5 - 0.45 * p.hell, Ltot = SR / f - s, D = Math.max(2, Math.floor(Ltot - 0.5)), d = Ltot - D;
        L.D = Math.min(4000, D); L.ca = (1 - d) / (1 + d); L.s = s; L.g = Math.pow(10, -3 / (T60 * f)); L.gl = Math.cos((L.pan + 1) * Math.PI / 4); L.gr = Math.sin((L.pan + 1) * Math.PI / 4);
      });
      // bells and the body: two-pole resonators
      this.res = [];
      if (art === 1) for (let k = 0; k < Math.min(12, notes.length); k++) for (const [r, a, d] of [[1, 1, 1], [2.0, 0.5, 0.6], [3.01, 0.35, 0.4], [4.17, 0.25, 0.3]]) this.res.push(this.mkRes(notes[k] * r, T60 * d * (0.6 + 0.4 * p.hell), a, (((k * 5) % 12) / 11 * 2 - 1) * p.breite));
      if (art === 2) { const M = [92, 131, 178, 243, 317, 402, 515, 668, 860, 1130, 1580, 2400]; M.forEach((f, k) => this.res.push(this.mkRes(f * (sh > 1 ? 1.25 : sh < 1 ? 0.8 : 1), Math.min(1.2, 0.15 + 0.5 * p.klang) * (1.2 - k / 14), 1 - k / 18, ((k % 2) * 2 - 1) * 0.5 * p.breite))); }
    }
    mkRes(f, T, a, pan) { const r = Math.exp(-6.9078 / (T * SR)), w = 2 * Math.PI * Math.min(f, 0.45 * SR) / SR; return { a1: 2 * r * Math.cos(w), a2: -r * r, g: a * (1 - r), y1: 0, y2: 0, gl: Math.cos((pan + 1) * Math.PI / 4), gr: Math.sin((pan + 1) * Math.PI / 4) }; }
    run(iL, iR, oL, oR, n) {
      this.tune();
      const art = Math.round(this.p.art), hpc = 1 - Math.exp(-2 * Math.PI * 70 / SR);
      for (let i = 0; i < n; i++) {
        const x0 = iL ? 0.5 * (iL[i] + iR[i]) : 0;
        this.hp += hpc * (x0 - this.hp); const x = x0 - this.hp;   // (no rumble into the strings)
        let l = 0, r = 0;
        if (art === 0) {
          const inj = x * 0.12;
          for (const L of this.lines) {
            const b = L.b, m = 4095, xi = b[(L.w - L.D) & m], yp = L.ya;
            L.ya = L.ca * xi + L.xa - L.ca * L.ya; L.xa = xi;
            const v = L.g * ((1 - L.s) * L.ya + L.s * yp);
            b[L.w & m] = v + inj; L.w++;
            l += v * L.gl; r += v * L.gr;
          }
          l *= 0.2; r *= 0.2;   // (measured with Myzel's Kalimba: the net at the input's level)
        } else {
          for (const Z of this.res) { const y = Z.a1 * Z.y1 + Z.a2 * Z.y2 + Z.g * x; Z.y2 = Z.y1; Z.y1 = y; l += y * Z.gl; r += y * Z.gr; }
          const gn = art === 1 ? 0.19 : 0.95; l *= gn; r *= gn;
        }
        oL[i] = l; oR[i] = r;
      }
      for (const L of this.lines) { L.ya = flush(L.ya); L.xa = flush(L.xa); }
      for (const Z of this.res) { Z.y1 = flush(Z.y1); Z.y2 = flush(Z.y2); }
    }
  }

  // ---- Wolke: grains of what was just played (a ring of 8 s) come back on the beat – their delay a division of it (dichte:
  // how many a second, zeit: ⅛ … 2 beats, hoehe: how many leave their pitch – an octave up or down, a fifth –, rueck: how
  // many play backwards, streu: how wide and how loose in time, nach: how much of the cloud goes round again). Grains read
  // faster come from a copy low-passed below their new Nyquist (no folding). ----
  class Wolke extends FxBase {
    defaults() { return { dichte: 0.4, zeit: 0.5, hoehe: 0.3, rueck: 0.2, streu: 0.5, nach: 0.3 }; }
    constructor(o) {
      super(o);
      const N = 1 << 19; this.N = N; this.M = N - 1; this.bL = new Float32Array(N); this.bR = new Float32Array(N); this.fL = new Float32Array(N); this.fR = new Float32Array(N); this.w = 0;
      this.lpL = FX_LP(2); this.lpR = FX_LP(2);
      const G = 48; this.G = G; this.gOn = new Uint8Array(G); this.gPos = new Float64Array(G); this.gRate = new Float32Array(G); this.gLen = new Float32Array(G); this.gT = new Float32Array(G); this.gL = new Float32Array(G); this.gR = new Float32Array(G); this.gF = new Uint8Array(G);
      this.next = 0; this.rnd = new PRNG(0x77011e); this.fbL = 0; this.fbR = 0;
    }
    rd(b, p) { const M = this.M, i = Math.floor(p), f = p - i, x0 = b[(i - 1) & M], x1 = b[i & M], x2 = b[(i + 1) & M], x3 = b[(i + 2) & M], c = (x2 - x0) * 0.5, v = x1 - x2, w = c + v, a = w + v + (x3 - x1) * 0.5, bn = w + a; return ((a * f - bn) * f + c) * f + x1; }
    run(iL, iR, oL, oR, n) {
      const p = this.p, R = this.rnd, M = this.M, divs = [0.125, 0.25, 0.5, 1, 2], div = divs[Math.max(0, Math.min(4, Math.round(p.zeit * 4)))] * this.beat;
      const dens = 2 + 58 * p.dichte * p.dichte, gap = SR / dens, len = Math.max(0.03, Math.min(0.4, div * 0.9)) * SR, ovl = dens * len / SR, norm = 1 / Math.sqrt(Math.max(1, ovl * 0.6));
      for (let i = 0; i < n; i++) {
        // the input and the cloud's own return into the ring (and its low-passed copy)
        const xl = (iL ? iL[i] : 0) + p.nach * 0.6 * this.fbL, xr = (iR ? iR[i] : 0) + p.nach * 0.6 * this.fbR, w = this.w;
        this.bL[w & M] = xl; this.bR[w & M] = xr; this.fL[w & M] = fxLpTick(this.lpL, xl); this.fR[w & M] = fxLpTick(this.lpR, xr); this.w++;
        if (--this.next <= 0) {
          this.next = gap * (0.5 + R.next());
          for (let k = 0; k < this.G; k++) if (!this.gOn[k]) {
            const q = R.next(); let rate = 1; if (q < p.hoehe) { const s = [12, -12, 7, 12, 19, -5][Math.floor(R.next() * 6)]; rate = Math.pow(2, s / 12); }
            const back = R.next() < p.rueck, k2 = 1 + Math.floor(R.next() * 3), delay = div * k2 * SR * (1 + p.streu * 0.15 * (R.next() * 2 - 1)) + len * Math.abs(rate) + 64;
            this.gOn[k] = 1; this.gRate[k] = back ? -rate : rate; this.gLen[k] = len * (0.6 + 0.8 * R.next()); this.gT[k] = 0; this.gF[k] = rate > 1.01 ? 1 : 0;
            this.gPos[k] = back ? this.w - delay + this.gLen[k] * rate : this.w - delay;
            const pan = (R.next() * 2 - 1) * p.streu, a = (pan + 1) * Math.PI / 4; this.gL[k] = Math.cos(a); this.gR[k] = Math.sin(a);
            break;
          }
        }
        let sl = 0, sr = 0;
        for (let k = 0; k < this.G; k++) {
          if (!this.gOn[k]) continue;
          const t = this.gT[k], L = this.gLen[k], wv = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / L), pos = this.gPos[k] + t * this.gRate[k];
          const a = this.gF[k] ? this.rd(this.fL, pos) : this.rd(this.bL, pos), b = this.gF[k] ? this.rd(this.fR, pos) : this.rd(this.bR, pos), m = 0.5 * (a + b);
          sl += wv * (0.5 * a + m * this.gL[k]); sr += wv * (0.5 * b + m * this.gR[k]);
          if ((this.gT[k] = t + 1) >= L) this.gOn[k] = 0;
        }
        sl *= norm; sr *= norm; this.fbL = sl; this.fbR = sr;
        oL[i] = sl; oR[i] = sr;
      }
    }
  }

  // ---- Spektral-Nebel: the sound's spectrum (STFT 2048, hop 256 – 8× overlap) held and smeared over time (zeit: 0.3 …
  // 20 s), its phases set free each frame – a standing surface. Normalised by Σw² and, for the free phases (they add by
  // power), ×√(N/H)·⅜/… – the energy stays (the Moder lesson). hell: tilt dark … bright; halten: holds the surface. ----
  class Spektral extends FxBase {
    defaults() { return { zeit: 0.5, hell: 0.5, halten: 0 }; }
    constructor(o) {
      super(o);
      const N = 2048, H = 256; this.N = N; this.H = H; this.B = N / 2 + 1;
      this.win = new Float32Array(N); for (let i = 0; i < N; i++) this.win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
      this.inL = new Float32Array(N); this.inR = new Float32Array(N); this.outL = new Float32Array(N + H); this.outR = new Float32Array(N + H); this.ip = 0; this.op = 0; this.cnt = 0;
      this.mL = new Float64Array(this.B); this.mR = new Float64Array(this.B);
      this.re = new Float64Array(N); this.im = new Float64Array(N); this.rnd = new PRNG(0x5bec);
      this.os = new Float32Array(2 * H); this.oq = 0; this.oL = new Float32Array(H); this.oR = new Float32Array(H); this.ok = 0;
    }
    fft(re, im, inv) {
      const n = re.length;
      for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (let L = 2; L <= n; L <<= 1) { const a = (inv ? 2 : -2) * Math.PI / L, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += L) { let cr = 1, ci = 0; for (let j = 0; j < L / 2; j++) { const u = i + j, v = u + L / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    }
    frame(inp, m, out) {
      const N = this.N, H = this.H, re = this.re, im = this.im, w = this.win, p = this.p, R = this.rnd;
      for (let i = 0; i < N; i++) { re[i] = inp[(this.ip + i) % N] * w[i]; im[i] = 0; }
      this.fft(re, im, false);
      const a = p.halten > 0.5 ? 1 : Math.exp(-H / (0.3 * Math.pow(66, p.zeit) * SR)), tilt = (p.hell - 0.5) * 2;
      for (let k = 0; k < this.B; k++) {
        const mag = Math.hypot(re[k], im[k]); m[k] = a * m[k] + (1 - a) * mag;
        const f = k * SR / N, g = Math.pow(Math.max(f, 50) / 1000, tilt * 0.5), ph = 2 * Math.PI * R.next(), v = m[k] * g * Math.sqrt(N / H);
        re[k] = v * Math.cos(ph); im[k] = v * Math.sin(ph);
      }
      for (let k = 1; k < N / 2; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; } im[0] = 0; im[N / 2] = 0;
      this.fft(re, im, true);
      // overlap-add: Hann² sums to 3 at 8× overlap
      for (let i = 0; i < N; i++) out[i] += (re[i] / N) * w[i] * (2.75 / 3);   // (×2.75: measured, the surface at the input's level – its peaks are spread, its energy not)
    }
    run(iL, iR, oL, oR, n) {
      const N = this.N, H = this.H;
      for (let i = 0; i < n; i++) {
        this.inL[this.ip] = iL ? iL[i] : 0; this.inR[this.ip] = iR ? iR[i] : 0; this.ip = (this.ip + 1) % N;
        oL[i] = this.outL[this.cnt]; oR[i] = this.outR[this.cnt];
        if (++this.cnt === H) {
          this.cnt = 0;
          this.outL.copyWithin(0, H); this.outR.copyWithin(0, H); this.outL.fill(0, N); this.outR.fill(0, N);
          this.frame(this.inL, this.mL, this.outL); this.frame(this.inR, this.mR, this.outR);
        }
      }
    }
  }

  // ---- Oktav-Echo: a delay on the beat (zeit: ¼ … 2 beats) whose repeats go through a pitch shifter (schritt: −12, +5,
  // +7, +12, +19 semitones) – each one higher (or lower) and a little darker (hell); nach: how many repeats. The shifter:
  // two taps in a 60 ms window, crossfaded (sin²), the input low-passed below the new Nyquist before it reads faster. ----
  class Oktav extends FxBase {
    defaults() { return { zeit: 0.5, nach: 0.5, schritt: 3, hell: 0.6 }; }
    constructor(o) {
      super(o);
      const N = 1 << 18; this.N = N; this.M = N - 1; this.dL = new Float32Array(N); this.dR = new Float32Array(N); this.w = 0;
      this.sL = new Float32Array(8192); this.sR = new Float32Array(8192); this.sw = 0; this.ph = 0; this.lpA = FX_LP(2); this.lpB = FX_LP(2); this.tl = 0; this.tr = 0; this.dt = 0;
    }
    run(iL, iR, oL, oR, n) {
      const p = this.p, M = this.M, divs = [0.25, 0.5, 0.75, 1, 1.5, 2], tgt = divs[Math.max(0, Math.min(5, Math.round(p.zeit * 5)))] * this.beat * SR;
      const st = [-12, 5, 7, 12, 19][Math.max(0, Math.min(4, Math.round(p.schritt)))], rate = Math.pow(2, st / 12), W = Math.round(0.06 * SR), fb = 0.92 * p.nach;
      const lc = 1 - Math.exp(-2 * Math.PI * (1500 + 12000 * p.hell * p.hell) / SR);
      if (!this.dt) this.dt = tgt;
      for (let i = 0; i < n; i++) {
        this.dt += (tgt - this.dt) * 0.0002;
        const rp = this.w - this.dt, j = Math.floor(rp), f = rp - j;
        const yl = this.dL[j & M] * (1 - f) + this.dL[(j + 1) & M] * f, yr = this.dR[j & M] * (1 - f) + this.dR[(j + 1) & M] * f;
        // the shifter on the repeat: written into its own short ring, read by two taps sliding at rate − 1 against it
        const sm = 8191; this.sL[this.sw & sm] = rate > 1 ? fxLpTick(this.lpA, yl) : yl; this.sR[this.sw & sm] = rate > 1 ? fxLpTick(this.lpB, yr) : yr;
        this.ph += (1 - rate); if (this.ph < 0) this.ph += W; if (this.ph >= W) this.ph -= W;
        let a = 0, b = 0;
        for (let k = 0; k < 2; k++) { let d = this.ph + k * W / 2; if (d >= W) d -= W; const g = Math.sin(Math.PI * d / W) ** 2, q = this.sw - 4 - d, qi = Math.floor(q), qf = q - qi; a += g * (this.sL[qi & sm] * (1 - qf) + this.sL[(qi + 1) & sm] * qf); b += g * (this.sR[qi & sm] * (1 - qf) + this.sR[(qi + 1) & sm] * qf); }
        this.sw++;
        this.tl += lc * (a - this.tl); this.tr += lc * (b - this.tr);
        const xl = iL ? iL[i] : 0, xr = iR ? iR[i] : 0;
        this.dL[this.w & M] = xl + fb * this.tr; this.dR[this.w & M] = xr + fb * this.tl;   // (ping-pong: each repeat on the other side)
        this.w++;
        oL[i] = yl; oR[i] = yr;
      }
      this.tl = flush(this.tl); this.tr = flush(this.tr);
    }
  }

  // ---- Vokal-Filter: three formants (state-variable band passes, stable while they glide) through a, e, i, o, u
  // (vokal), moving by themselves (bewegung: 0 … 2 Hz), resonanz: how narrow, stimme: a man's to a child's formants. ----
  const VOK = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240]];
  class Vokal extends FxBase {
    defaults() { return { vokal: 0, bewegung: 0.2, resonanz: 0.5, stimme: 0.3 }; }
    constructor(o) { super(o); this.s = [0, 1, 2].map(() => [{ lo: 0, bp: 0 }, { lo: 0, bp: 0 }]); this.lfo = 0; }
    run(iL, iR, oL, oR, n) {
      const p = this.p;
      for (let i = 0; i < n; i++) {
        if ((i & 15) === 0) {
          this.lfo += 16 * (2 * p.bewegung * p.bewegung) / SR;
          const pos = Math.max(0, Math.min(3.999, (p.vokal + 0.5 * (1 - Math.cos(2 * Math.PI * this.lfo)) * Math.min(1, p.bewegung * 3) * 0.5) * 4)), a = Math.floor(pos), t = pos - a, sc = 1 + 0.5 * p.stimme;
          this.f = VOK[a].map((f, k) => (f + (VOK[a + 1][k] - f) * t) * sc);
          this.q = 1 / (2 + 14 * p.resonanz);
        }
        const x = [iL ? iL[i] : 0, iR ? iR[i] : 0], y = [0, 0];
        for (let k = 0; k < 3; k++) {
          const F = 2 * Math.sin(Math.PI * Math.min(this.f[k], 0.2 * SR) / SR), gk = [1, 0.7, 0.4][k];
          for (let c = 0; c < 2; c++) { const S = this.s[k][c], hi = x[c] - S.lo - this.q * S.bp; S.bp += F * hi; S.lo += F * S.bp; y[c] += gk * S.bp; }
        }
        oL[i] = y[0] * (0.5 + 2 * this.q); oR[i] = y[1] * (0.5 + 2 * this.q);
      }
      for (const a of this.s) for (const S of a) { S.lo = flush(S.lo); S.bp = flush(S.bp); }
    }
  }
