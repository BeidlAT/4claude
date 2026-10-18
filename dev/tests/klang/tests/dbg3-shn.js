// where the partials are: the strongest line near each harmonic (Hz, cents off h·f, dB) at `at`
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const f = +(process.argv[2] || 440), at = +(process.argv[3] || 0.05), y = +(process.env.Y || 0.5);
const r = L.render(D, { name: 'myzel-string', po: { seed: 1, prm: JSON.parse(process.env.PRM || '{}') }, dur: at + 0.4, params: { freq: f, hoehe: y }, msgs: [[0.02, { on: 0.02, f, y, vel: 0.75, seed: 1001 }]] });
const sp = L.spectrum(r.L, SR, at, 32768), out = [];
let top = 0; for (let k = 0; k < sp.p.length; k++) top = Math.max(top, sp.p[k]);
for (let h = 1; h <= 16; h++) {
  let b = Math.round(h * f * 0.97 / sp.hz); for (let k = b; k <= Math.round(h * f * 1.06 / sp.hz); k++) if (sp.p[k] > sp.p[b]) b = k;
  out.push(`h${h} ${(1200 * Math.log2(b * sp.hz / (h * f))).toFixed(0)}ct ${(10 * Math.log10(sp.p[b] / top)).toFixed(0)}dB`);
}
console.log(out.join(' | '));
