// Böe level 3: correlation of L and R (zero lag) for held notes – what the voice's panner would fold together
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
for (const y of [0.1, 0.36, 0.7]) {
  const r = L.render(D, { name: 'myzel-aeol', po: { rich: true, seed: 5 }, ch: 2, dur: 3, params: { freq: 220, hoehe: y }, msgs: [[0, { on: 0, f: 220, y, vel: 0.75, seed: 99 }], [1, { off: 1 }]] });
  for (const [a, b] of [[0.1, 1], [1.05, 3]]) { let lr = 0, ll = 0, rr = 0; for (let i = a * SR; i < b * SR; i++) { lr += r.L[i] * r.R[i]; ll += r.L[i] ** 2; rr += r.R[i] ** 2; } console.log(`y ${y} ${a}-${b}s corr ${(lr / Math.sqrt(ll * rr)).toFixed(3)} L/R ${(10 * Math.log10(ll / rr)).toFixed(1)} dB`); }
}
