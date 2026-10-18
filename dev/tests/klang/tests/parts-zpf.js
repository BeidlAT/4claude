// Zapfen: the top tone's parts on their own – harmonic levels (dB) of each part.   env F, B (body), Y, SUBS
const L = require('./dsplib'), Z = require('./zsrc');
const SR = 48000, F = +(process.env.F || 220), body = process.env.B || 'zapfen', y = +(process.env.Y || 1);
const base = JSON.parse(process.env.SUBS || '[]');
for (const [name, line] of [['all', 'yl + ct'], ['modes', 'yl'], ['saw', 'sd'], ["box", "ZPF_BOX * bo"], ['click+dir', 'cg * cim + dg * dd']]) {
  process.env.SUBS = JSON.stringify(base.concat([['L[i] = yl + ct;', 'L[i] = ' + line + ';']]));
  const D = Z.load(SR);
  const top = L.render(D, { name: 'myzel-scrape', po: { prm: { koerper: body }, seed: 3 }, ch: 1, dur: 2, params: { freq: F, hoehe: y }, msgs: [[0.05, { on: 0.05, f: F, y, vel: 0.75, seed: 77 }]] });
  const sp = L.spectrum(top.L, SR, 1.0, 16384), hs = [];
  for (let k = 1; k <= 16; k++) hs.push(L.harm(sp, F, k).toFixed(0).padStart(4));
  console.log(name.padEnd(10) + hs.join(' ') + '   rms ' + L.db(L.rms(top.L, SR, 2 * SR)).toFixed(1));
}
