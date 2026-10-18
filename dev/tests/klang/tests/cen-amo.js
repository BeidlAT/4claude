// Amöbe: the bench's centroid row (one note, 4096 at 0.3 s) over many seeds – how often y 0 < 0.5 < 1 holds
//   F=220 N=20 node cen-amo.js ['from|to;…']
const L = require('./dsplib'); const SR = 48000;
let src = L.dspSource();
for (const rep of (process.argv[2] || '').split(';').filter(Boolean)) { const [a, b] = rep.split('|'); if (!src.includes(a)) throw new Error('not found ' + a); src = src.split(a).join(b); }
const D = L.loadDsp(SR, src);
const f = +(process.env.F || 220), N = +(process.env.N || 20), at = +(process.env.AT || 0.3);
let ok = 0; const c = { 0: [], 0.5: [], 1: [] };
for (let s = 1; s <= N; s++) {
  const r = {};
  for (const y of [0, 0.5, 1]) { const x = L.render(D, { name: 'myzel-gendy', po: {}, ch: 1, dur: 0.8, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed: s * 7919 + Math.round(y * 13) }]] }); r[y] = L.centroid(x.L, SR, at, 4096); c[y].push(r[y]); }
  if (r[0] < r[0.5] && r[0.5] < r[1]) ok++;
}
const st = (a) => `${Math.round(Math.min(...a))}–${Math.round(Math.max(...a))} (mean ${Math.round(L.mean(a))})`;
console.log(`f ${f}: y 0 ${st(c[0])}, y 0.5 ${st(c[0.5])}, y 1 ${st(c[1])}; ordered in ${ok}/${N}`);
