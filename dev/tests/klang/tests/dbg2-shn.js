// the pluck's own spectrum (the excitation buffer, repeated) vs the string's output early on
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const f = +(process.argv[2] || 440);
const r = L.render(D, { name: 'myzel-string', po: { seed: 1, prm: JSON.parse(process.env.PRM || '{}') }, dur: 0.2, params: { freq: f, hoehe: 0.5 }, msgs: [[0.02, { on: 0.02, f, y: 0.5, vel: 0.75, seed: 1001 }]] });
const S = r.node.sA, P = S.exN, rep = new Float32Array(16384);
for (let i = 0; i < rep.length; i++) rep[i] = S.ex[i % P];
const hl = (sig, at) => { const sp = L.spectrum(sig, SR, at, 8192); const o = []; for (let h = 1; h <= 16; h++) { let mx = 0; for (let k = Math.round(h * (SR / P) * 0.99 / sp.hz); k <= Math.round(h * (SR / P) * 1.02 / sp.hz); k++) mx = Math.max(mx, sp.p[k] || 0); o.push(mx); } const m = Math.max(...o); return o.map((v) => (10 * Math.log10(v / m)).toFixed(0).padStart(4)).join(''); };
console.log('excitation   ', hl(rep, 0));
for (const at of [0.025, 0.04, 0.08]) console.log('output @' + at, hl(r.L, at));
console.log('P', P, 'Lh', S.Lh.toFixed(2), 'xp', S.xp.toFixed(3), 'c', S.c.toFixed(3), 'a', S.aa.toFixed(3));
