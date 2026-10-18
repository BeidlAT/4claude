// Böe (myzel-aeol) in Node, block by block: the caught string, the shedding ratio, the gust, each string's amplitude
// over time – for a held note at y (or a y path).   node trace-boe.js y [dur]   env PRM, F, RICH, SEED, YPATH='[[t,y],…]'
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const F = +(process.env.F || 220), y0 = +(process.argv[2] || 0.5), DUR = +(process.argv[3] || 8), PRM = JSON.parse(process.env.PRM || '{}'), RICH = !!process.env.RICH;
const YP = JSON.parse(process.env.YPATH || '[]');
const C = D.procs['myzel-aeol'], node = new C({ processorOptions: { rich: RICH, prm: PRM, seed: 5 } });
node.port.onmessage({ data: { on: 0, f: F, y: y0, vel: +(process.env.VEL || 0.75), seed: +(process.env.SEED || 1234), burst: !!process.env.GATE, gate: +(process.env.GATE || 0) } });
if (process.env.OFF) node.port.onmessage({ data: { off: +process.env.OFF } });
const P = { freq: [F], detune: [0], hoehe: [y0] };
let last = -1, out = [];
const yAt = (t) => { let y = y0; for (const [tt, yy] of YP) if (t >= tt) y = yy; return y; };
const sig = new Float32Array(Math.ceil(DUR * SR));
for (let f0 = 0, b = 0; f0 < DUR * SR; f0 += 128, b++) {
  D.scope.currentTime = f0 / SR; P.hoehe[0] = yAt(f0 / SR);
  const Lb = new Float32Array(128), Rb = new Float32Array(128);
  node.process([], [RICH ? [Lb, Rb] : [Lb]], P);
  sig.set(Lb.subarray(0, Math.min(128, sig.length - f0)), f0);
  if (b % 47 === 0) {   // ≈ 0.125 s
    const amps = []; for (let k = 0; k < node.K; k++) amps.push(Math.round(L.db(Math.hypot(node.re[k], node.im[k]))));
    out.push(`${(f0 / SR).toFixed(2)}s y ${P.hoehe[0].toFixed(2)} ratio ${node.rt.toFixed(2)} gust ${node.gu.toFixed(2)} cap ${node.cap} | ${amps.join(' ')} | out ${L.db(L.rms(sig, Math.max(0, f0 - 6000), f0 + 1)).toFixed(1)}`);
  }
}
console.log(out.join('\n'));
