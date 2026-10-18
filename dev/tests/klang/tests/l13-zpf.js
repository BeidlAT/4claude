// Zapfen: level 1 vs level 3 – per-channel RMS and peaks (before and after the output's tanh), notes across the field
//   env SUBS, B
const L = require('./dsplib'), Z = require('./zsrc');
const SR = 48000, body = process.env.B || 'zapfen';
const base = JSON.parse(process.env.SUBS || '[]');
const run = (raw) => {
  process.env.SUBS = JSON.stringify(raw ? base.concat([['L[i] = tanh(og * L[i]); if (two) R[i] = tanh(og * R[i]);', 'L[i] = og * L[i]; if (two) R[i] = og * R[i];']]) : base);
  const D = Z.load(SR), out = {};
  for (const rich of [false, true]) {
    let pk = 0, pw = 0, n = 0;
    for (const [f, y] of [[196, 0.3], [262, 0.45], [330, 0.6], [392, 0.75], [523, 0.8], [220, 0.1], [440, 1]]) for (const seed of [1, 2, 3]) {
      const r = L.render(D, { name: 'myzel-scrape', po: { rich, prm: { koerper: body }, seed }, ch: rich ? 2 : 1, dur: 0.8, params: { freq: f, hoehe: y }, msgs: [[0.01, { on: 0.01, f, y, vel: 0.75, seed: seed * 7 }]] });
      const chans = rich ? [r.L, r.R] : [r.L];
      for (const c of chans) { pk = Math.max(pk, L.peak(c)); const e = L.rms(c, 0, c.length); pw += e * e * (rich ? 1 : 0.5) ; n += rich ? 1 : 1; }   // (mono passes the panner at −3 dB per channel)
    }
    out[rich ? 'L3' : 'L1'] = { peak: +L.db(pk * (rich ? 1 : Math.SQRT1_2)).toFixed(1), rms: +(10 * Math.log10(pw / n)).toFixed(1) };
  }
  return out;
};
console.log('after tanh', JSON.stringify(run(false)), '\nraw', JSON.stringify(run(true)));
