// jawari: the means of both lines over the string (the waveguide's DC mode is R = c, L = −c) per 0.1 s
const L = require('./dsplib'); const SR = 48000; const D = L.loadDsp(SR);
const f = +(process.argv[2] || 220), C = D.procs['myzel-string'];
const node = new C({ processorOptions: { seed: 1, prm: { steg: process.env.STEG || 'jawari' } } });
const n = 128, P = { freq: [f], detune: [0], hoehe: [0.5] };
node.port.onmessage({ data: { on: 0, f, y: 0.5, vel: 0.75, seed: 101 } });
let t = 0;
for (let b = 0; b < 375 * 1.5; b++) {
  const Lb = new Float32Array(n); node.process([], [[Lb]], P); t += n / SR;
  if (b % 37 === 36) {
    const S = node.sA, M = S.N - 1, Lh = Math.floor(S.Lh); let mr = 0, ml = 0, er = 0, el = 0;
    for (let a = 1; a <= Lh; a++) { const r = S.bR[(S.w - a) & M], l = S.bL[(S.w - a) & M]; mr += r; ml += l; er += r * r; el += l * l; }
    console.log(`t ${t.toFixed(2)}: mean R ${(mr / Lh).toFixed(4)} L ${(ml / Lh).toFixed(4)}  rms R ${Math.sqrt(er / Lh).toFixed(4)} L ${Math.sqrt(el / Lh).toFixed(4)}  lp ${S.lp.toFixed(4)}`);
  }
}
