// Böe: level 3 vs level 1 in Node, same seeds: total power (L² + R² at level 3, the mono signal at level 1) of short
// notes (0.4 s, then off) over 3 s, on a grid of pitches and heights; and held 3 s.   node l13-boe.js
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const PRM = JSON.parse(process.env.PRM || '{}');
const pw = (r, a, b) => { let s = 0; for (let i = a * SR; i < b * SR; i++) s += r.L[i] * r.L[i] + (r.R ? r.R[i] * r.R[i] : 0); return s; };
for (const off of [0.4, null]) {
  const rows = []; let tA = 0, tB = 0;
  for (const f of [110, 220, 440, 880, 1760]) for (const y of [0.3, 0.55, 0.8]) {
    let a = 0, b = 0;
    for (const seed of [3, 4, 5, 6]) {
      const go = (rich) => L.render(D, { name: 'myzel-aeol', po: { rich, seed, prm: PRM }, ch: rich ? 2 : 1, dur: 3, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: seed * 7 }]].concat(off ? [[off, { off }]] : []) });
      a += pw(go(false), 0, 3); b += pw(go(true), 0, 3);
    }
    tA += a; tB += b; rows.push(`${f}/${y} ${(10 * Math.log10(b / a)).toFixed(2)}`);
  }
  console.log((off ? 'short' : 'held') + ': ' + rows.join(', ') + ` | total ${(10 * Math.log10(tB / tA)).toFixed(2)} dB`);
}
