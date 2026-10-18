// Böe: the parts of a held note on their own (source replacement): strings, wind band, air – RMS and the share below
// 120 Hz, at a few heights (L1, 220 Hz unless F)
const L = require('./dsplib');
const SR = 48000, base = L.dspSource(), F = +(process.env.F || 220);
const V = {
  all: [],
  strings: [['sL[j] = wk * d + ag * al;', 'sL[j] = 0;']],
  band: [['ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0;', 'ex[k] = 0;'], ['sL[j] = wk * d + ag * al;', 'sL[j] = wk * d;']],
  air: [['ex[k] = k < Kav ? ex[k] * gk[k] * dr : 0;', 'ex[k] = 0;'], ['sL[j] = wk * d + ag * al;', 'sL[j] = ag * al;']],
};
const low = (m) => { const sp = L.spectrum(m, SR, 1, 32768); let a = 0, t = 0; for (let k = 1; k < sp.p.length; k++) { t += sp.p[k]; if (k * sp.hz < 120) a += sp.p[k]; } return 10 * Math.log10(a / t); };
for (const y of [0.1, 0.36, 0.7]) {
  const row = [];
  for (const [nm, reps] of Object.entries(V)) {
    let src = base; for (const [a, b] of reps) { if (!src.includes(a)) throw new Error(a); src = src.split(a).join(b); }
    const D = L.loadDsp(SR, src);
    const r = L.render(D, { name: 'myzel-aeol', po: { seed: 5, prm: JSON.parse(process.env.PRM || '{}') }, dur: 4, params: { freq: F, hoehe: y }, msgs: [[0, { on: 0, f: F, y, vel: 0.75, seed: 99 }]] });
    row.push(`${nm} ${L.db(L.rms(r.L, 1 * SR, 4 * SR)).toFixed(1)} (<120 Hz ${low(r.L).toFixed(0)})`);
  }
  console.log(`y ${y}: ` + row.join(' | '));
}
