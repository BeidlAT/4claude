// Zapfen: how much of a held note lies below 80 Hz (the stick's ride must not rumble low on the field), per height.
//   env F, B, SUBS
const L = require('./dsplib'), Z = require('./zsrc');
const SR = 48000, F = +(process.env.F || 220), body = process.env.B || 'zapfen', D = Z.load(SR);
const band = (m, lo, hi) => { const sp = L.spectrum(m, SR, 0.6, 65536); let e = 0; for (let k = Math.max(1, Math.round(lo / sp.hz)); k < Math.round(hi / sp.hz); k++) e += sp.p[k]; return e; };
const rows = [];
for (const y of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
  const r = L.render(D, { name: 'myzel-scrape', po: { prm: { koerper: body }, seed: 3 }, ch: 1, dur: 2.2, params: { freq: F, hoehe: y }, msgs: [[0.05, { on: 0.05, f: F, y, vel: 0.75, seed: 77 }]] });
  const lo = band(r.L, 10, 80), all = band(r.L, 10, 20000);
  rows.push(`y ${y}: below 80 Hz ${(10 * Math.log10(lo / all)).toFixed(1)} dB of all, rms ${L.db(L.rms(r.L, 0.6 * SR, 2 * SR)).toFixed(1)}`);
}
console.log(rows.join('\n'));
