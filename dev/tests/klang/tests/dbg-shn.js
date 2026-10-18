const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const fs = (process.argv[2] || '2000,3000,5000').split(',').map(Number);
const gz = (x, a, b, fq) => { a = Math.round(a); b = Math.round(b); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return 2 * Math.hypot(re, im) / Math.max(1, b - a); };
for (const f of fs) {
  const r = L.render(D, { name: 'myzel-string', po: { seed: 3, prm: JSON.parse(process.env.PRM || '{}') }, dur: 1.2, params: { freq: f, hoehe: +(process.env.Y || 0.5) }, msgs: [[0.05, { on: 0.05, f, y: 0.5, vel: 0.75, seed: 1234 }]] });
  const S = r.node.sA;
  const env = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => L.db(gz(r.L, t * SR, (t + 0.05) * SR, f)).toFixed(1));
  console.log(f, 'Lh', S.Lh.toFixed(3), 'a', S.aa.toFixed(4), 'c', S.c.toFixed(4), 'gl', S.gl.toFixed(6), 't60', r.node.t60, 'fundamental dB at .1/.2/.4/.6/.8/1', env.join(' '));
}
