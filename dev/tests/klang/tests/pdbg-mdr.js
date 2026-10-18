// Moder: the processor's power ODE as it runs (P_k per block) – for tuning.   node pdbg-mdr.js '{"y":0.7}'
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR), C = D.procs['myzel-rot'];
const o = JSON.parse(process.argv[2] || '{}');
const f = o.f || 220, y = o.y != null ? o.y : 0.7, vel = o.vel != null ? o.vel : 0.8;
const node = new C({ processorOptions: { rich: !!o.rich, prm: o.prm || {}, seed: 5, on: { on: 0, f, y, vel, life: o.life, sc: o.sc, seed: 1234 } } });
const P = { freq: [f], detune: [0], hoehe: [y] }, db = (x) => (10 * Math.log10(x + 1e-30)).toFixed(1);
const marks = [0.003, 0.05, 0.1, 0.2, 0.4, 0.7, 1, 1.3, 1.6, 2, 3, 4, 4.5, 5, 5.5];
let mi = 0;
for (let b = 0; b < SR * 6 / 128; b++) {
  D.scope.currentTime = b * 128 / SR;
  const Lb = new Float32Array(128), Rb = new Float32Array(128);
  if (!node.process([], [o.rich ? [Lb, Rb] : [Lb]], P)) { console.log('ended at', (b * 128 / SR).toFixed(2)); break; }
  const t = (b + 1) * 128 / SR;
  if (mi < marks.length && t >= marks[mi]) { console.log(t.toFixed(3), 'P:', [...node.Pw.slice(0, node.K)].map(db).join(' '), ' sum', db(node.sumP), ' lam', [...node.lam.slice(0, node.K)].map((x) => x.toFixed(1)).join(' ')); mi++; }
}
