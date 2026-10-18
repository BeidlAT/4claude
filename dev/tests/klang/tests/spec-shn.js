// harmonic profile of a Sehne pluck: h1..h16 (dB re the strongest) at 60 ms, averaged over seeds
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const PRM = JSON.parse(process.env.PRM || '{}'), at = +(process.env.AT || 0.08);
for (const vel of (process.env.VEL || '0.3,0.75,1').split(',').map(Number)) for (const f of (process.env.F || '110,220,440').split(',').map(Number)) for (const y of (process.env.Y || '0.5').split(',').map(Number)) {
  const acc = new Float64Array(17);
  for (let s = 1; s <= 6; s++) {
    const r = L.render(D, { name: 'myzel-string', po: { seed: s, prm: PRM }, dur: at + 0.2, params: { freq: f, hoehe: y }, msgs: [[0.02, { on: 0.02, f, y, vel, seed: 1000 + s }]] });
    const sp = L.spectrum(r.L, SR, at, 8192);
    for (let h = 1; h <= 16; h++) { let mx = 0; for (let k = Math.round(h * f * 0.99 / sp.hz); k <= Math.round(h * f * 1.02 / sp.hz); k++) mx = Math.max(mx, sp.p[k] || 0); acc[h] += mx; }
  }
  let mx = 0; for (let h = 1; h <= 16; h++) mx = Math.max(mx, acc[h]);
  const row = []; for (let h = 1; h <= 16; h++) row.push((10 * Math.log10(acc[h] / mx)).toFixed(0).padStart(4));
  console.log(`vel ${vel} f ${f} y ${y}: ${row.join('')}`);
}
