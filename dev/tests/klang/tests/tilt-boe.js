// Böe: level across the field (held 5 s at each string's centre, 220/440 Hz, 3 seeds) for the excitation's tilt k^−p –
// SPEC's 1/√k (0.5, as built) against k^−0.25.   node tilt-boe.js
const L = require('./dsplib');
const SR = 48000, base = L.dspSource();
for (const p of ['0.25', '0.5']) {
  const D = L.loadDsp(SR, base.split('AEOL_TILT = 0.5').join('AEOL_TILT = ' + p));
  const lv = [];
  for (let k = 1; k <= 7; k++) {
    const y = (k - 0.7) / 7 / 0.9; let s = 0, n = 0;
    for (const f of [220, 440]) for (const seed of [3, 4, 5]) { const r = L.render(D, { name: 'myzel-aeol', po: { seed }, dur: 5, params: { freq: f, hoehe: y }, msgs: [[0, { on: 0, f, y, vel: 0.75, seed: seed * 11 }]] }); s += L.rms(r.L, 1 * SR, 5 * SR) ** 2; n++; }
    lv.push(10 * Math.log10(s / n));
  }
  const mx = Math.max(...lv), mn = Math.min(...lv);
  console.log(`tilt ${p}: ` + lv.map((v) => (v - mx).toFixed(1)).join(' ') + ` (range ${(mx - mn).toFixed(1)} dB)`);
}
