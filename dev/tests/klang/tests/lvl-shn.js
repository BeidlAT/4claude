// Sehne levels per zone (mean over seeds): pluck 0.02–0.12 s, 0.2–0.4 s, E-Bow 2–4 s; palm envelope; T60 of the fundamental
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const PRM = JSON.parse(process.env.PRM || '{}');
const gz = (x, a, b, fq) => { a = Math.round(a); b = Math.round(b); let re = 0, im = 0; for (let i = a; i < b; i++) { const w = 2 * Math.PI * fq * i / SR; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); } return 2 * Math.hypot(re, im) / Math.max(1, b - a); };
const pw = (x, a, b) => { const r = L.rms(x, Math.round(a * SR), Math.round(b * SR)); return r * r; };
const db = (p) => (10 * Math.log10(p + 1e-30)).toFixed(1);
for (const f of (process.env.F || '110,220,440').split(',').map(Number)) {
  console.log('-- ' + f + ' Hz');
  for (const y of (process.env.Y || '0,0.1,0.2,0.5,0.75,0.78,0.83,0.88,0.92,0.95,1').split(',').map(Number)) {
    let a = 0, b = 0, c = 0, d = 0; const ns = 4, env = new Float64Array(12);
    for (let s = 1; s <= ns; s++) {
      const r = L.render(D, { name: 'myzel-string', po: { seed: s, prm: PRM }, dur: 4.2, params: { freq: f, hoehe: y }, msgs: [[0.0, { on: 0.0, f, y, vel: 0.75, seed: 100 + s }]] });
      a += pw(r.L, 0.0, 0.1); b += pw(r.L, 0.2, 0.4); c += pw(r.L, 1.0, 1.2); d += pw(r.L, 3.6, 4.0);
      for (let k = 0; k < 12; k++) env[k] += pw(r.L, k * 0.02, (k + 1) * 0.02);
    }
    console.log(`y ${y.toFixed(2)}: 0–0.1 ${db(a / ns)}  0.2–0.4 ${db(b / ns)}  1–1.2 ${db(c / ns)}  3.6–4 ${db(d / ns)}   env 20ms: ${[...env].map((v) => db(v / ns)).join(' ')}`);
  }
}
