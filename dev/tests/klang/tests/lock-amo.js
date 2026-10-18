// Amöbe: two ways to measure the period lock on a stochastic wave (Node): the fundamental's phase slope over 3.5 s and
// the autocorrelation's peak near the period (parabolic), seeds × pitches × heights
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const lockPhase = (m, f, t0, t1) => {
  const w = Math.round(0.2 * SR), ph = [], ts = [];
  for (let t = t0; t + 0.2 < t1; t += 0.1) { const a = Math.round(t * SR); let re = 0, im = 0; for (let i = 0; i < w; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / w), x = m[a + i] * h, q = 2 * Math.PI * f * (a + i) / SR; re += x * Math.cos(q); im -= x * Math.sin(q); } ph.push(Math.atan2(im, re)); ts.push(t); }
  for (let i = 1; i < ph.length; i++) { while (ph[i] - ph[i - 1] > Math.PI) ph[i] -= 2 * Math.PI; while (ph[i] - ph[i - 1] < -Math.PI) ph[i] += 2 * Math.PI; }
  const mt = L.mean(ts), mp = L.mean(ph); let num = 0, den = 0; for (let i = 0; i < ph.length; i++) { num += (ts[i] - mt) * (ph[i] - mp); den += (ts[i] - mt) ** 2; }
  return L.cents(f + num / den / (2 * Math.PI), f);
};
// the period: the autocorrelation over [t0, t1) near SR/f, its peak refined by a parabola through the three best lags
const lockAC = (m, f, t0, t1) => {
  const T = SR / f, a = Math.round(t0 * SR), b = Math.round(t1 * SR), lo = Math.floor(T * 0.98), hi = Math.ceil(T * 1.02);
  let best = lo, bv = -Infinity; const r = {};
  for (let k = lo - 1; k <= hi + 1; k++) { let s = 0; for (let i = a; i + k < b; i++) s += m[i] * m[i + k]; r[k] = s / (b - a - k); if (k >= lo && k <= hi && r[k] > bv) { bv = r[k]; best = k; } }
  const y0 = r[best - 1], y1 = r[best], y2 = r[best + 1], d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
  return L.cents(SR / (best + d), f);
};
module.exports = { lockPhase, lockAC };
if (require.main === module) {
  for (const y of [0.2, 0.5, 0.8]) for (const f of [50, 82.4, 110, 220, 330, 500]) {
    const ph = [], ac = [];
    for (const seed of [3, 4, 5]) { const m = L.render(D, { name: 'myzel-gendy', po: { prm: { zeit: 0 } }, ch: 1, dur: 4.2, params: { freq: f, hoehe: y }, msgs: [[0.05, { on: 0.05, f, y, vel: 0.75, seed }]] }).L; ph.push(lockPhase(m, f, 0.5, 4.1).toFixed(2)); ac.push(lockAC(m, f, 0.5, 4.1).toFixed(2)); }
    console.log(`y ${y} f ${f}: phase ${ph.join(' ')} | autocorr ${ac.join(' ')}`);
  }
}
