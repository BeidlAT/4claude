// jawari internals: the contact's shortening (samples) and the wave at the bridge relative to the pluck's peak, per block
const L = require('./dsplib'); const SR = 48000;
const D = L.loadDsp(SR, process.env.SRC ? require('fs').readFileSync(process.env.SRC, 'utf8') : L.dspSource());
const f = +(process.argv[2] || 220);
const C = D.procs['myzel-string'];
const node = new C({ processorOptions: { seed: 1, prm: { steg: 'jawari' } } });
const n = 128, P = { freq: [f], detune: [0], hoehe: [0.5] };
node.port.onmessage({ data: { on: 0, f, y: 0.5, vel: 0.75, seed: 101 } });
let jmax = 0, rmax = 0, t = 0;
const run = node.run.bind(node);
node.run = function (S, out, i0, i1, ...rest) { run(S, out, i0, i1, ...rest); jmax = Math.max(jmax, S.jd); for (let i = i0; i < i1; i++) rmax = Math.max(rmax, Math.abs(out[i])); };
for (let b = 0; b < 375 * 2; b++) {
  const Lb = new Float32Array(n); node.process([], [[Lb]], P); t += n / SR;
  if (b % 75 === 74) { const S = node.sA; console.log(`t ${t.toFixed(2)}: max shortening ${jmax.toFixed(2)} samples (Lh ${S.Lh.toFixed(1)}), max |out| ${rmax.toFixed(3)}, pk ${S.pk.toFixed(3)} → max ev ${(rmax / S.pk - 0.05).toFixed(3)}`); jmax = 0; rmax = 0; }
}
