// level 1 vs level 3 through a stereo panner off centre (Web Audio's StereoPanner law), short notes, 8 seeds
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const pan = (l, r, p) => { const out = [new Float32Array(l.length), new Float32Array(l.length)]; if (!r) { const x = (p + 1) / 2, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2); for (let i = 0; i < l.length; i++) { out[0][i] = l[i] * gl; out[1][i] = l[i] * gr; } return out; }
  if (p <= 0) { const x = p + 1, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2); for (let i = 0; i < l.length; i++) { out[0][i] = l[i] + r[i] * gl; out[1][i] = r[i] * gr; } } else { const x = p, gl = Math.cos(x * Math.PI / 2), gr = Math.sin(x * Math.PI / 2); for (let i = 0; i < l.length; i++) { out[0][i] = l[i] * gl; out[1][i] = r[i] + l[i] * gr; } } return out; };
for (const body of ['glas', 'schale', 'stab', 'zunge', 'teich']) {
  const res = {};
  for (const p of [0, -0.4, 0.4]) { const acc = [0, 0];
    for (let s = 1; s <= 6; s++) for (const rich of [false, true]) {
      const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: { koerper: body }, seed: s * 7919 }, ch: rich ? 2 : 1, dur: 1.5, params: { freq: 330, hoehe: 0.5 }, msgs: [[0.05, { on: 0.05, f: 330, y: 0.5, vel: 0.75, seed: s * 104729 }], [0.45, { off: 0.45 }]] });
      const [a, b] = pan(r.L, r.R, p); acc[rich ? 1 : 0] += (Math.pow(L.rms(a), 2) + Math.pow(L.rms(b), 2)) / 2; }
    res[p] = (10 * Math.log10(acc[1] / acc[0])).toFixed(2); }
  console.log(body, 'L3 − L1 at pan 0 / −0.4 / +0.4:', res[0], res[-0.4], res[0.4]);
}
