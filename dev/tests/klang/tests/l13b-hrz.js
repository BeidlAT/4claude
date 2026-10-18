const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
for (const body of ['glas', 'schale', 'stab']) {
  const acc = [[], []];
  for (let s = 1; s <= 10; s++) for (const rich of [false, true]) {
    const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: { koerper: body }, seed: s * 7919 }, ch: rich ? 2 : 1, dur: 4, params: { freq: 440, hoehe: 0.5 }, msgs: [[0.05, { on: 0.05, f: 440, y: 0.5, vel: 0.75, seed: s * 104729 }]] });
    const p = rich ? (Math.pow(L.rms(r.L, SR, 3.9 * SR), 2) + Math.pow(L.rms(r.R, SR, 3.9 * SR), 2)) / 2 : Math.pow(L.rms(r.L, SR, 3.9 * SR), 2) / 2;
    acc[rich ? 1 : 0].push(10 * Math.log10(p));
  }
  const mean = (a) => 10 * Math.log10(a.reduce((x, d) => x + Math.pow(10, d / 10), 0) / a.length);
  console.log(body, 'L1', acc[0].map((x) => x.toFixed(1)).join(' '), '| L3', acc[1].map((x) => x.toFixed(1)).join(' '), '| mean diff', (mean(acc[1]) - mean(acc[0])).toFixed(2));
}
