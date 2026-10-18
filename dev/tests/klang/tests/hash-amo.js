// Amöbe: a fingerprint of the processor's output over many cases (to prove a refactor changes nothing)
//   node hash-amo.js > before.txt ; (edit) ; node hash-amo.js | diff before.txt -
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const crypto = require('crypto');
const cases = [];
for (const d of ['linear', 'cauchy', 'logist', 'sinus']) for (const f of [55, 220, 1500, 5000]) for (const y of [0, 0.5, 1]) for (const rich of [false, true]) cases.push({ d, f, y, rich });
for (const c of cases) {
  const r = L.render(D, { name: 'myzel-gendy', po: { rich: c.rich, prm: { verteilung: c.d, zeit: 0.4 } }, ch: c.rich ? 2 : 1, dur: 0.5, params: { freq: c.f, hoehe: c.y }, msgs: [[0, { on: 0, f: c.f, y: c.y, vel: 0.8, seed: 99 }], [0.2, { zuck: 1, t: 0.2 }], [0.3, { set: { punkte: 17 } }], [0.4, { off: 0.4 }]] });
  const h = crypto.createHash('md5'); h.update(Buffer.from(r.L.buffer)); if (r.R) h.update(Buffer.from(r.R.buffer));
  console.log(JSON.stringify(c) + ' ' + h.digest('hex'));
}
