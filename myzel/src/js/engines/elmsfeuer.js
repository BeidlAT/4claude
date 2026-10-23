// Elmsfeuer's shared parts (SPEC §3.9). The corona: two noise sources low-passed at 30 + 3000·y² Hz, amplified so the
// threshold 0.55 lies z standard deviations out (z falls from 4.1 at the bottom to 1.7 at the top: a few ticks a
// second, about a hundred in the middle, a dense fizz above – SPEC's pre-gain 0.6 + 1.2·y gave almost none, measured),
// then the dead zone (0 below 0.55, a cubic above) and a high-pass at 1.5 kHz: the crack. The arc's follower divides by
// the mean height of the ticks at the arc's own threshold (ez), so its strength follows Bogen and only its flicker the
// crackle. Levels: hum LH, corona KC, arc KA, Zündstoß KZ, the crackle inside the arc NA
const ELM = {
  LH: 0.3, KC: 2.4, KA: 1.25, KZ: 0.55, NA: 1.2, FM: 8,
  dz: makeShaperCurve((x) => { const a = Math.abs(x); return a < 0.55 ? 0 : Math.sign(x) * Math.pow((a - 0.55) / 0.45, 3); }),
  rect: makeShaperCurve(Math.abs, 1025),
  // the follower's soft ceiling: fed its level over FM times its mean, it passes the flicker and squashes a burst of
  // ticks to at most 2.5 times the mean (no pops)
  lim: makeShaperCurve((x) => 2.5 * Math.tanh(8 * x / 2.5), 1025),
  sat: makeShaperCurve((x) => Math.tanh(3 * x)),
  bufs: null, ezc: new Map(),
  fc: (y) => 30 + 3000 * y * y,
  z: (y) => 1.4 + 2.7 * (1 - y) * (1 - y),
  pg(y) { return 0.55 / (this.z(y) * Math.sqrt((2 / 3) * Math.PI * this.fc(y) / A.ctx.sampleRate)); },
  ez(y) {   // the dead zone's mean |output| for Gaussian noise z standard deviations below its threshold
    const z = Math.round(this.z(y) * 100) / 100;
    if (this.ezc.has(z)) return this.ezc.get(z);
    const sp = 0.55 / z, ds = 0.02;
    let e = 0;
    for (let s = z + ds / 2; s < z + 10; s += ds) e += Math.pow((Math.min(sp * s, 1) - 0.55) / 0.45, 3) * Math.exp(-s * s / 2);
    e *= 2 * ds / Math.sqrt(2 * Math.PI);
    this.ezc.set(z, e);
    return e;
  },
  // the arc's threshold on the field: Spannung moves it (0.3 … 0.85); it fades in over ±0.15 around it and stands
  // steady (no stutter) toward the top
  yArc: () => 0.3 + 0.55 * (1 - P['elm.spannung']),
  fade(y) { const x = clamp((y - this.yArc() + 0.15) / 0.3, 0, 1); return x * x * (3 - 2 * x); },
  top(y) { const x = clamp((y - this.yArc() - 0.15) / 0.25, 0, 1); return x * x * (3 - 2 * x); },
  humLvl(y) { const x = y * y * (3 - 2 * y); return this.LH * (1 - 0.6 * x); },
  // the corona's level: SPEC's Knistern·(0.2 + y), its rise with the density held back (the cubic dead zone gets 30 dB
  // louder from y 0.3 to 0.9 on its own – the single ticks low would vanish, the fizz high would bury the arc)
  corLvl(y) { return P['elm.knistern'] * (0.2 + y) * this.KC * Math.pow(10, -1.5 * (y - 0.5)); },
  // the shared loops, 16 s each at 8 kHz (every voice reads them from its own place and speed, 0.9–1.1): the arc's
  // pitch steps (cents: 0, a fifth, an octave, a fourth down, a twelfth, every 150–500 ms – about 2.5 jumps a second)
  // and its two gates – steady (on, dropping out for 10–40 ms now and then) and stuttering (on 15–120 ms, off 10–80 ms),
  // which Flackern blends
  loops() {
    if (this.bufs) return this.bufs;
    let sr = 8000;
    const mk = () => { try { return A.ctx.createBuffer(1, sr * 16, sr); } catch (e) { sr = A.ctx.sampleRate; return A.ctx.createBuffer(1, sr * 16, sr); } };
    const steps = mk(), g0 = mk(), g1 = mk(), d = steps.getChannelData(0), vals = [0, 700, 1200, -500, 1900], seg = [];
    for (let i = 0; i < d.length;) { const n = Math.round(rand(0.15, 0.5) * sr); seg.push([i, n, vals[Math.floor(Math.random() * 5)]]); i += n; }
    // at most 2.7 jumps a second at the fastest speed (1.1 × 2.7 < 3): a random step too many repeats its neighbour
    const jumps = () => seg.reduce((a, s, i) => a + (i && s[2] !== seg[i - 1][2] ? 1 : 0), 0);
    while (jumps() > 2.7 * 16) { const i = 1 + Math.floor(Math.random() * (seg.length - 1)); seg[i][2] = seg[i - 1][2]; }
    for (const [i, n, x] of seg) d.fill(x, i, Math.min(d.length, i + n));
    const gate = (b, on, off) => {
      const x = b.getChannelData(0), e = Math.round(0.002 * sr);
      for (let i = 0, up = true; i < x.length; up = !up) {
        const n = Math.round((up ? rand(on[0], on[1]) : rand(off[0], off[1])) * sr);
        for (let j = 0; j < n && i < x.length; j++, i++) x[i] = up ? Math.min(1, (j + 1) / e, (n - j) / e) : 0;
      }
    };
    gate(g0, [0.3, 1.2], [0.01, 0.04]); gate(g1, [0.015, 0.12], [0.01, 0.08]);
    return (this.bufs = { steps, g0, g1 });
  },
  // the hum's wave on base frequency b: a buzz (every harmonic at 1/k up to the 24th, the 2nd and 4th 6 dB up) on the
  // folded note (harmonic mh) and on the note itself (mn) – Netz mixes them along a quarter circle (0: the note only, 1:
  // the folded hum only, 0.4: the note 10 dB under the hum) – then driven through SPEC's slightly lopsided tanh(3x) and
  // turned back into harmonics: the same sound as a shaper after two oscillators, without its aliasing, its offset
  // gone with harmonic 0. One wave per fold and Netz step of 1/20, built when first played (two 4096-point FFTs)
  wave(mh, mn, netz) {
    const q = Math.round(netz * 20), key = 'elm' + mh + '.' + mn + '.' + q;
    if (A.waves[key]) return key;
    const N = 4096, H = N / 2, th = Math.PI / 2 * Math.pow(q / 20, 0.25), c = new Float64Array(H);
    const buzz = (m, a) => { for (let k = 1; k <= 24 && k * m < H; k++) c[k * m] += a * (k === 2 || k === 4 ? 2 : 1) / k; };
    if (mh === mn) buzz(mh, 1); else { buzz(mh, Math.sin(th)); buzz(mn, Math.cos(th)); }
    // the waveform by an inverse FFT (the FFT of the conjugate spectrum: N·x in the real part), driven, back again
    const x = new Float64Array(N), y = new Float64Array(N);
    for (let k = 1; k < H; k++) { y[k] = c[k] * H; y[N - k] = -c[k] * H; }
    fftInPlace(x, y);
    let pk = 0;
    for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(x[i]));
    for (let i = 0; i < N; i++) { const u = x[i] / pk; x[i] = Math.tanh(3 * u * (1 + 0.1 * u)); y[i] = 0; }
    fftInPlace(x, y);
    const re = new Float32Array(H), im = new Float32Array(H);
    for (let k = 1; k < H; k++) { re[k] = 2 * x[k] / N; im[k] = -2 * y[k] / N; }
    A.waves[key] = A.ctx.createPeriodicWave(re, im);
    return key;
  },
};
