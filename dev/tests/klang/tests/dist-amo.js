// Amöbe: how the distributions differ – per period the change of the waveform (next period minus this one): its crest
// (max |Δ| / rms Δ – one point jumping far vs all moving a little) and the 99th percentile / median of rms Δ
//   node dist-amo.js ['from|to;…']
const L = require('./dsplib'); const SR = 48000;
let src = L.dspSource();
for (const rep of (process.argv[2] || '').split(';').filter(Boolean)) { const [a, b] = rep.split('|'); if (!src.includes(a)) throw new Error('not found ' + a); src = src.split(a).join(b); }
const D = L.loadDsp(SR, src);
const T = 240, f = 200;
for (const y of [0.3, 0.5, 0.7]) {
  const row = [];
  for (const d of ['linear', 'logist', 'cauchy']) {
    let cr = 0, sp = 0, fl = 0; const N = 4;
    for (let s = 1; s <= N; s++) {
      const m = L.render(D, { name: 'myzel-gendy', po: { prm: { verteilung: d } }, ch: 1, dur: 2.5, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: s * 31 }]] }).L;
      const cs = [], rs = [];
      for (let a = Math.round(0.5 * SR); a + 2 * T < 2.4 * SR; a += T) { let ss = 0, mx = 0, ee = 0; for (let i = 0; i < T; i++) { const q = m[a + T + i] - m[a + i]; ss += q * q; ee += m[a + i] * m[a + i]; if (Math.abs(q) > mx) mx = Math.abs(q); } const r = Math.sqrt(ss / T); cs.push(mx / r); rs.push(Math.sqrt(ss / ee)); }
      cr += L.mean(cs) / N; rs.sort((x, z) => x - z); sp += rs[Math.floor(0.99 * rs.length)] / rs[Math.floor(0.5 * rs.length)] / N; fl += L.mean(rs) / N;
    }
    row.push(`${d} crest ${cr.toFixed(2)} p99/med ${sp.toFixed(2)} flux ${fl.toFixed(3)}`);
  }
  console.log('y ' + y + ': ' + row.join(' | '));
}
