// Böe level 3 debug: L/R correlation of the wind alone (strings off), the air alone, the band alone
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
const V = {
  'wind+air': [['ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0;', 'ex[k] = 0;']],
  'band only': [['ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0;', 'ex[k] = 0;'], ['sL[j] = wk * d + ag * al;', 'sL[j] = wk * d;'], ['sR[j] = wk * d + ag * bl;', 'sR[j] = wk * d;']],
  'air only': [['ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0;', 'ex[k] = 0;'], ['sL[j] = wk * d + ag * al;', 'sL[j] = ag * al;'], ['sR[j] = wk * d + ag * bl;', 'sR[j] = ag * bl;']],
};
for (const [nm, reps] of Object.entries(V)) {
  let src = base; for (const [a, b] of reps) { if (!src.includes(a)) throw new Error(a); src = src.split(a).join(b); }
  const D = L.loadDsp(SR, src);
  const r = L.render(D, { name: 'myzel-aeol', po: { rich: true, seed: 5, prm: { boeen: 0 } }, ch: 2, dur: 3, params: { freq: 220, hoehe: 0.36 }, msgs: [[0, { on: 0, f: 220, y: 0.36, vel: 0.2, seed: 99 }]] });
  let lr = 0, ll = 0, rr = 0; for (let i = 1.5 * SR; i < 3 * SR; i++) { lr += r.L[i] * r.R[i]; ll += r.L[i] ** 2; rr += r.R[i] ** 2; }
  console.log(nm, 'corr', (lr / Math.sqrt(ll * rr)).toFixed(3), 'L/R', (10 * Math.log10(ll / rr)).toFixed(1));
}
