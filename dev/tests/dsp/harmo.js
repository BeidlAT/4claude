const load = require('./harness'), P = load('/home/user/4claude/myzel/src');
const SR = 48000, C = P['myzel-harmo'];
function run(opts, sig, secs = 2) {
  const nd = new C({ processorOptions: opts }); const n = 128, B = Math.round(secs * SR / n), oL = new Float32Array(B * n), oR = new Float32Array(B * n), O = [new Float32Array(n), new Float32Array(n)], iL = new Float32Array(n), iR = new Float32Array(n);
  let t = 0; for (let b = 0; b < B; b++) { for (let i = 0; i < n; i++) { const v = sig(b * n + i); iL[i] = v; iR[i] = v; } const t0 = process.hrtime.bigint(); nd.process([[iL, iR]], [O], {}); t += Number(process.hrtime.bigint() - t0); oL.set(O[0], b * n); oR.set(O[1], b * n); }
  return { oL, oR, ms: t / 1e6 };
}
// spectrum peak and purity over the last second
function anal(x, f0s) {
  const N = 32768, a = x.length - N, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  // naive DFT at candidate frequencies and total energy
  let tot = 0; for (let i = 0; i < N; i++) tot += re[i] * re[i];
  const en = (f) => { let s = 0, c = 0; for (let i = 0; i < N; i++) { const w = 2 * Math.PI * f * i / SR; s += re[i] * Math.sin(w); c += re[i] * Math.cos(w); } return (s * s + c * c) / N * 2.67; };
  const rms = Math.sqrt(tot / N / 0.375);
  return { rms: +rms.toFixed(4), at: f0s.map((f) => +(10 * Math.log10(en(f) / (tot + 1e-30) + 1e-30)).toFixed(1)) };
}
const sine = (f, a = 0.3) => (i) => a * Math.sin(2 * Math.PI * f * i / SR);
const saw = (f, a = 0.2) => (i) => { let s = 0; for (let h = 1; h * f < 8000; h++) s += Math.sin(2 * Math.PI * h * f * i / SR) / h; return a * s * 0.6; };
const cmaj = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88];
let r = run({ set: { v1: 7, v2: 0, v3: 0, modus: 0, form: 0, schimmer: 0 } }, sine(220));
console.log('chrom +7 on 220: rms', anal(r.oL, [220 * Math.pow(2, 7 / 12), 220]), 'ms', r.ms.toFixed(0));
r = run({ set: { v1: 2, v2: 0, v3: 0, modus: 1, form: 0, schimmer: 0 }, freqs: cmaj }, sine(329.63));
console.log('diat +2 on E4 (→G4 392):', anal(r.oL, [392, 392 * Math.pow(2, -1 / 12), 329.63]));
r = run({ set: { v1: 2, v2: 0, v3: 0, modus: 1, form: 0, schimmer: 0 }, freqs: cmaj }, sine(261.63));
console.log('diat +2 on C4 (→E4 329.6):', anal(r.oL, [329.63, 311.13, 261.63]));
r = run({ set: { v1: 2, v2: 4, v3: -7, modus: 1, form: 0.6, schimmer: 0.2 }, freqs: cmaj }, saw(220));
console.log('3 voices on saw A3 (C5? E4, A2): out rms', anal(r.oL, [261.63, 329.63, 110]), 'nan', r.oL.some((x) => !Number.isFinite(x)), 'ms', r.ms.toFixed(0));
r = run({ set: { v1: 0, v2: 0, v3: 0 } }, saw(220)); console.log('all off rms', anal(r.oL, [220]).rms);
const inR = anal(Float32Array.from({ length: 96000 }, (_, i) => sine(220)(i)), [220]).rms; console.log('input sine rms', inR);
