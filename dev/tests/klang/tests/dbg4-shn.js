// decay of single partials over time (dB at a few moments), and their expected loss per period from the bridge low-pass
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const f = +(process.argv[2] || 440), y = +(process.env.Y || 0.5);
const r = L.render(D, { name: 'myzel-string', po: { seed: 1, prm: JSON.parse(process.env.PRM || '{}') }, dur: 0.6, params: { freq: f, hoehe: y }, msgs: [[0.0, { on: 0.0, f, y, vel: 0.75, seed: 1001 }]] });
const S = r.node.sA, c = S.c;
const ts = [0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32];
for (const h of [1, 3, 6, 10, 14]) {
  const row = ts.map((t) => { const sp = L.spectrum(r.L, SR, t, 2048); let mx = 0; for (let k = Math.round(h * f * 0.98 / sp.hz); k <= Math.round(h * f * 1.03 / sp.hz); k++) mx = Math.max(mx, sp.p[k] || 0); return (10 * Math.log10(mx + 1e-30)).toFixed(1).padStart(6); });
  const w = 2 * Math.PI * h * f / SR, p = 1 - c, mg = c / Math.sqrt(1 - 2 * p * Math.cos(w) + p * p);
  console.log(`h${h}: ${row.join(' ')}   LP ${(20 * Math.log10(mg)).toFixed(3)} dB/period → ${(20 * Math.log10(mg) * f).toFixed(0)} dB/s`);
}
console.log('c', c.toFixed(3), 'gl', S.gl.toFixed(5));
