// Harz: what Höhe (bow pressure) does – centroid, h2/h3 and the share off the harmonics, per body
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const rich = process.env.RICH === '1', f = +(process.env.F || 220);
for (const body of (process.argv.slice(2).length ? process.argv.slice(2) : ['glas', 'schale', 'stab', 'zunge', 'teich'])) {
  const rows = [];
  for (const y of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
    const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: Object.assign({ koerper: body }, JSON.parse(process.env.PRM || '{}')), seed: 3 }, ch: rich ? 2 : 1, dur: 2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: 1234 }]] });
    const m = r.L, sp = L.spectrum(m, SR, 1.2, 16384), h1 = L.harm(sp, f, 1);
    let cs = 0; for (let t = 1.0; t < 1.8; t += 0.1) cs += L.centroid(m, SR, t, 4096) / 8;
    rows.push(`y ${y.toFixed(2)}: ${L.db(L.rms(m, 1.2 * SR, 1.9 * SR)).toFixed(1)} dB  centroid ${Math.round(cs)}  h2 ${(L.harm(sp, f, 2) - h1).toFixed(0)}  h3 ${(L.harm(sp, f, 3) - h1).toFixed(0)}  h5 ${(L.harm(sp, f, 5) - h1).toFixed(0)}  off-harm ${L.inharmonic(sp, f).toFixed ? L.inharmonic(sp, f).toFixed(1) : JSON.stringify(L.inharmonic(sp, f))}`);
  }
  console.log('== ' + body + ' ' + f + ' Hz\n' + rows.join('\n'));
}
