// Amöbe in Node: harmonic levels and the noise between harmonics per band, against Höhe (4 seeds averaged)
//   node spec-amo.js f [prm-json] [rich]
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const note = (f, y, o = {}) => L.render(D, { name: 'myzel-gendy', po: { rich: !!o.rich, prm: o.prm }, ch: o.rich ? 2 : 1, dur: o.dur || 2, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: o.vel == null ? 0.75 : o.vel, seed: o.seed || 1234 }]] });
const f = +process.argv[2] || 110, prm = JSON.parse(process.argv[3] || '{}'), rich = process.argv[4] === 'rich';
for (const y of [0, 0.25, 0.5, 0.75, 1]) {
  const acc = new Float64Array(40), nacc = [0, 0, 0, 0, 0, 0], band = [0, 0, 0, 0, 0, 0];
  const bands = [[20, 1000], [1000, 2000], [2000, 4000], [4000, 8000], [8000, 16000]];
  for (const seed of [11, 22, 33, 44]) {
    const r = note(f, y, { seed, prm, rich }); const sp = L.spectrum(r.L, SR, 0.8, 32768);
    for (let h = 1; h <= 32; h++) acc[h] += Math.pow(10, L.harm(sp, f, h) / 10);
    bands.forEach(([lo, hi], bi) => { let s = 0, n = 0, e = 0; for (let k = Math.ceil(lo / sp.hz); k < hi / sp.hz; k++) { const hz = k * sp.hz, d = Math.abs(hz - Math.round(hz / f) * f); e += sp.p[k]; if (d > f / 4) { s += sp.p[k]; n++; } } nacc[bi] += s / Math.max(1, n); band[bi] += e; });
  }
  const h1 = acc[1], tot = band.reduce((a, b) => a + b, 0);
  console.log(`y ${y}: harm (dB re h1) ` + [2, 3, 4, 6, 8, 12, 16, 24, 32].map((h) => h + ':' + (10 * Math.log10(acc[h] / h1)).toFixed(0)).join(' ') + ' | noise/bin ' + nacc.slice(0, 5).map((v) => (10 * Math.log10(v / h1)).toFixed(0)).join(' ') + ' | band share dB ' + band.slice(0, 5).map((v) => (10 * Math.log10(v / tot)).toFixed(1)).join(' '));
}
