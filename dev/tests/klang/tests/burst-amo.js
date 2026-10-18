// Amöbe in Node: the Puls Zucken (35 ms of a wild run), two hits' correlation, and healing after a Höhe spike / shake
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const perFlux = (m, T, t0, t1) => { const out = []; for (let s = Math.round(t0 * SR); s + 2 * T < t1 * SR; s += T) { let dd = 0, ee = 0; for (let i = 0; i < T; i++) { const q = m[s + i + T] - m[s + i]; dd += q * q; ee += m[s + i] * m[s + i]; } out.push(Math.sqrt(dd / ee)); } return out; };
const dist = (m, T, ref, t) => { const a = Math.round(t * SR), r = Math.round(ref * SR); let dd = 0, ee = 0; for (let i = 0; i < T; i++) { const q = m[a + i] - m[r + i]; dd += q * q; ee += m[r + i] * m[r + i]; } return Math.sqrt(dd / ee); };
const hit = (seed, y = 0.6, f = 200) => L.render(D, { name: 'myzel-gendy', po: {}, ch: 1, dur: 0.6, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, burst: true, gate: 0.22, rel: 0.3, seed }]] }).L;
for (const [y, f] of [[0.2, 200], [0.6, 200], [1, 200], [0.2, 100], [0.2, 50]]) {
  const a = hit(11, y, f), b = hit(22, y, f);
  let ab = 0, aa = 0, bb = 0; for (let i = Math.round(0.06 * SR); i < 0.25 * SR; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  const fl = perFlux(a, 240, 0.05, 0.3);
  console.log(`f ${f} y ${y}: corr ${(ab / Math.sqrt(aa * bb)).toFixed(2)}; flux per period from the hit: ${fl.slice(0, 14).map((x) => x.toFixed(2)).join(' ')} …`);
}
const held = (moves, prm) => L.render(D, { name: 'myzel-gendy', po: { prm }, ch: 1, dur: 3.4, params: (t) => { let y = 0.3; for (const [t0, v] of moves) if (t >= t0) y = v; return { freq: 200, hoehe: y }; }, msgs: [[0, { on: 0, f: 200, y: 0.3, vel: 0.75, seed: 5 }]].concat(prm && prm.zuck ? [[1.0, { zuck: 1, t: 1.0 }]] : []) }).L;
for (const [name, mv, prm] of [['spike', [[1.0, 1], [1.12, 0.3]], { rueck: 0.3 }], ['spike, Rückkehr 0', [[1.0, 1], [1.12, 0.3]], { rueck: 0 }], ['shake', [], { rueck: 0.3, zuck: 1 }]]) {
  const m = held(mv, prm);
  console.log(name + ': distance from 0.9 s: ' + [0.95, 1.05, 1.1, 1.15, 1.2, 1.4, 1.8, 2.6, 3.0].map((t) => t + ' ' + dist(m, 240, 0.9, t).toFixed(2)).join(', '));
}
