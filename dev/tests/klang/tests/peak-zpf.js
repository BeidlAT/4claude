// Zapfen: the raw peak before the output's tanh over bodies, pitches, heights, knobs at their extremes (find what overdrives)
const L = require('./dsplib'), Z = require('./zsrc');
process.env.SUBS = JSON.stringify([['L[i] = tanh(og * L[i]); if (two) R[i] = tanh(og * R[i]);', 'L[i] = og * L[i]; if (two) R[i] = og * R[i];']].concat(JSON.parse(process.env.SUBS0 || '[]')));
const SR = 48000, D = Z.load(SR), rows = [];
for (const b of ['zapfen', 'holz', 'panzer', 'kuerbis', 'fels']) for (const f of [16, 55, 220, 1000, 3000, 8000]) for (const y of [0, 0.5, 1]) for (const k of [0, 1]) for (const burst of [false, true]) {
  const prm = { koerper: b, kratzen: k, klang: k, schuppen: k, rast: k, strich: k };
  const r = L.render(D, { name: 'myzel-scrape', po: { prm, seed: 3 }, ch: 1, dur: 1, params: { freq: f, hoehe: y }, msgs: [[0.01, { on: 0.01, f, y, vel: 1, burst, gate: burst ? 0.06 : 0, seed: 7 }]] });
  rows.push([L.peak(r.L), `${b} f ${f} y ${y} knobs ${k} ${burst ? 'burst' : 'held'}`]);
}
rows.sort((a, b) => b[0] - a[0]);
console.log(rows.slice(0, 15).map((r) => r[0].toFixed(2) + '  ' + r[1]).join('\n'));
