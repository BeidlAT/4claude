// Harz demos (Node, processor only): per body a held note at 196 Hz with Höhe swept 0 → 1 → 0 over 8 s, released at
// 8.5 s; L3 stereo. WAV + spectrogram into hrz/demo/.
const L = require('./dsplib');
const path = require('path');
const SR = 48000, D = L.loadDsp(SR), OUT = process.env.OUT;
for (const body of (process.argv.slice(2).length ? process.argv.slice(2) : ['glas', 'schale', 'stab', 'zunge', 'teich'])) {
  const rich = process.env.RICH !== '0', f = +(process.env.F || 196);
  const yAt = (t) => (t < 0.5 ? 0.3 : t < 4.5 ? 0.3 + 0.7 * (t - 0.5) / 4 : t < 8.5 ? 1 - (t - 4.5) / 4 : 0);
  const r = L.render(D, { name: 'myzel-bow', po: { rich, prm: { koerper: body }, seed: 3 }, ch: 2, dur: 12, params: (t) => ({ freq: f, hoehe: yAt(t) }), msgs: [[0.05, { on: 0.05, f, y: 0.3, vel: 0.75, seed: 99 }], [8.5, { off: 8.5 }]] });
  const R = r.R || r.L, file = path.join(OUT, body + (rich ? '-L3' : '-L1') + '.wav');
  // (the voice's own level as the app plays it: × peak 0.55·vel would follow; here ×1.4 for listening)
  const g = 1.4, Lo = r.L.map((x) => x * g), Ro = R.map((x) => x * g);
  L.wav(file, Lo, Ro, SR); L.spectro(file);
  console.log(body, 'peak', L.db(Math.max(L.peak(Lo), L.peak(Ro))).toFixed(1), 'dB', (r.nsPerSample).toFixed(0), 'ns/smp');
}
