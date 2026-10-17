const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const body = process.argv[2] || 'zunge';
for (const f of [220, 330, 440, 880]) for (const [dur, off] of [[4, null], [1.5, 0.45]]) {
  const acc = [0, 0];
  for (let s = 1; s <= 4; s++) for (const rich of [false, true]) {
    const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: { koerper: body }, seed: s * 7919 }, ch: rich ? 2 : 1, dur, params: { freq: f, hoehe: 0.5 }, msgs: [[0.05, { on: 0.05, f, y: 0.5, vel: 0.75, seed: s * 104729 }]].concat(off ? [[off, { off }]] : []) });
    const a = off ? 0.05 : 1, b = off ? 1.5 : 3.9;
    acc[rich ? 1 : 0] += rich ? (Math.pow(L.rms(r.L, a * SR, b * SR), 2) + Math.pow(L.rms(r.R, a * SR, b * SR), 2)) / 2 : Math.pow(L.rms(r.L, a * SR, b * SR), 2) / 2;
  }
  console.log(body, f, off ? 'short' : 'held ', 'L3 − L1', (10 * Math.log10(acc[1] / acc[0])).toFixed(2));
}
