// Böe level 3: L/R balance and correlation per harmonic (debug)
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
for (const prm of [{ rauschen: 0, boeen: 0 }, { boeen: 0 }]) for (const y of [0.05, 0.36]) {
  const r = L.render(D, { name: 'myzel-aeol', po: { rich: true, seed: 5, prm }, ch: 2, dur: 3, params: { freq: 220, hoehe: y }, msgs: [[0, { on: 0, f: 220, y, vel: 0.2, seed: 99 }]] });
  const a = 1.5, b = 3; let lr = 0, ll = 0, rr = 0; for (let i = a * SR; i < b * SR; i++) { lr += r.L[i] * r.R[i]; ll += r.L[i] ** 2; rr += r.R[i] ** 2; }
  const sl = L.spectrum(r.L, SR, 2, 16384), sr = L.spectrum(r.R, SR, 2, 16384);
  console.log(JSON.stringify(prm), `y ${y} corr ${(lr / Math.sqrt(ll * rr)).toFixed(3)} L/R ${(10 * Math.log10(ll / rr)).toFixed(1)} dB; per harmonic L−R: ` + [1, 2, 3, 4].map((h) => (L.harm(sl, 220, h) - L.harm(sr, 220, h)).toFixed(1)).join(' ') + ' cap ' + r.node.cap);
}
