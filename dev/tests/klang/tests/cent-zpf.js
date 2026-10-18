// Zapfen: the bench's centroid row on the processor alone (mean over 0.3–2 s) at y 0 / 0.5 / 1, a few seeds
const L = require('./dsplib'), Z = require('./zsrc');
const SR = 48000, D = Z.load(SR);
for (const seed of [1, 2, 3, 4]) {
  const c = [0, 0.5, 1].map((y) => { const m = L.render(D, { name: 'myzel-scrape', po: { prm: {}, seed }, ch: 1, dur: 2.2, params: { freq: 220, hoehe: y }, msgs: [[0.05, { on: 0.05, f: 220, y, vel: 0.75, seed: seed * 13 }]] }).L; let s = 0, n = 0; for (let t = 0.3; t < 2.05; t += 0.05) { s += L.centroid(m, SR, t, 4096); n++; } return Math.round(s / n); });
  console.log('seed ' + seed + ': ' + c.join(' / '));
}
