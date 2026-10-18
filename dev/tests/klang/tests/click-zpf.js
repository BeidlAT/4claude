// Zapfen Fels: what the click (the scream) adds – band energies 1–2.6 and 2.6–6 kHz with and without it, by Höhe and
// velocity, held notes and 112-ms strokes.   env SUBS
const L = require('./dsplib'), Z = require('./zsrc');
const SR = 48000, base = JSON.parse(process.env.SUBS || '[]');
const band = (m, at, N, lo, hi) => { const sp = L.spectrum(m, SR, at, N); let e = 0; for (let k = Math.round(lo / sp.hz); k < Math.round(hi / sp.hz); k++) e += sp.p[k]; return 10 * Math.log10(e + 1e-30); };
for (const off of [false, true]) {
  process.env.SUBS = JSON.stringify(off ? base.concat([['const ct = cg * cd + dg * dd', 'const ct = 0 * cd + dg * dd']]) : base);
  const D = Z.load(SR), rows = [];
  for (const [y, vel, burst] of [[0.2, 0.75, true], [0.6, 0.75, true], [0.2, 0.3, true], [0.2, 1, true], [0.3, 0.75, false], [0.9, 0.75, false], [1, 0.75, false]]) {
    const m = L.render(D, { name: 'myzel-scrape', po: { prm: { koerper: 'fels' }, seed: 3 }, ch: 1, dur: 1.5, params: { freq: 220, hoehe: y }, msgs: [[0.05, { on: 0.05, f: 220, y, vel, burst, gate: 0.112, seed: 7 }]] }).L;
    const at = burst ? 0.05 : 0.6, N = burst ? 4096 : 32768;
    rows.push(`${burst ? 'stroke' : 'held  '} y ${y} vel ${vel}: 1–2.6k ${band(m, at, N, 1000, 2600).toFixed(1)}  2.6–6k ${band(m, at, N, 2600, 6000).toFixed(1)}`);
  }
  console.log((off ? 'without click\n' : 'with click\n') + rows.join('\n'));
}
