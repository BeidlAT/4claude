// level 3 vs level 1 per channel (L1 mono → the panner's −3 dB per side at centre), several pitches/heights/seeds;
// L/R correlation at level 3
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const PRM = JSON.parse(process.env.PRM || '{}');
const pw = (x, a, b) => { const r = L.rms(x, Math.round(a * SR), Math.round(b * SR)); return r * r; };
let all1 = 0, all3 = 0;
for (const f of [110, 220, 440, 880]) for (const y of [0.1, 0.5, 0.75, 0.95]) {
  let p1 = 0, p3 = 0, cc = 0;
  for (let s = 1; s <= 3; s++) {
    const a = L.render(D, { name: 'myzel-string', po: { seed: s, prm: PRM }, dur: 1.6, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 100 + s }]] });
    const b = L.render(D, { name: 'myzel-string', po: { seed: s, rich: true, prm: PRM }, ch: 2, dur: 1.6, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: 100 + s }]] });
    p1 += 0.5 * pw(a.L, 0.02, 1.5);   // (mono through the panner at the centre: half the power per side)
    p3 += 0.5 * (pw(b.L, 0.02, 1.5) + pw(b.R, 0.02, 1.5));
    let x = 0, l = 0, r = 0; for (let i = Math.round(0.1 * SR); i < 1.5 * SR; i++) { x += b.L[i] * b.R[i]; l += b.L[i] ** 2; r += b.R[i] ** 2; } cc += x / Math.sqrt(l * r) / 3;
  }
  all1 += p1; all3 += p3;
  console.log(`${f} Hz y ${y}: L3 − L1 ${(10 * Math.log10(p3 / p1)).toFixed(2)} dB, L/R correlation ${cc.toFixed(2)}`);
}
console.log(`overall L3 − L1 ${(10 * Math.log10(all3 / all1)).toFixed(2)} dB`);
