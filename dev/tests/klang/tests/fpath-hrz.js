// the friction force alone (DC-blocked), per height: level, harmonics, share off the harmonics
const L = require('./dsplib');
const SR = 48000;
let src = L.dspSource();
src = src.split('L[i] = yl + fo * d0;').join('L[i] = d0;').split('L[i] = tanh(og * L[i]);').join('L[i] = L[i];');
const D = L.loadDsp(SR, src), f = +(process.env.F || 220), body = process.argv[2] || 'glas';
for (const y of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
  const r = L.render(D, { name: 'myzel-bow', po: { prm: { koerper: body }, seed: 3 }, dur: 2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 1234 }]] });
  const m = r.L, sp = L.spectrum(m, SR, 1.2, 16384), h1 = L.harm(sp, f, 1);
  let tot = 0, harmE = 0; for (let k = 1; k * sp.hz < 12000; k++) { tot += sp.p[k]; const h = Math.round(k * sp.hz / f); if (h >= 1 && Math.abs(k * sp.hz - h * f) < 20) harmE += sp.p[k]; }
  console.log(`y ${y.toFixed(2)}: F rms ${L.db(L.rms(m, 1.2 * SR, 1.9 * SR)).toFixed(1)} dB  h1 ${h1.toFixed(0)} h2 ${(L.harm(sp, f, 2) - h1).toFixed(0)} h3 ${(L.harm(sp, f, 3) - h1).toFixed(0)} h4 ${(L.harm(sp, f, 4) - h1).toFixed(0)}  noise share ${(100 * (1 - harmE / tot)).toFixed(0)} %  centroid ${Math.round(L.centroid(m, SR, 1.2, 4096))}`);
}
