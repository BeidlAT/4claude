// Böe (myzel-aeol) in Node: a held note at a few heights – level, which string is caught over time, band energies per
// string, the wind's share.   node proto-boe.js [y ...]   env: PRM='{"boeen":0}' F=220 DUR=6 RICH=1 SEED=…
const L = require('./dsplib');
const SR = 48000, D = L.loadDsp(SR);
const F = +(process.env.F || 220), DUR = +(process.env.DUR || 6), PRM = JSON.parse(process.env.PRM || '{}'), RICH = !!process.env.RICH;
const ys = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [0, 0.05, 0.12, 0.2, 0.36, 0.52, 0.68, 0.84, 1];
// band energy of string k (±f/4) in a window
function bands(sig, at, len = 0.5, K = 8) {
  const N = 16384, sp = L.spectrum(sig, SR, at, N), out = [];
  let tot = 0; for (let i = 1; i < sp.p.length; i++) tot += sp.p[i];
  for (let k = 1; k <= K; k++) { let e = 0; for (let i = Math.round((k - 0.25) * F / sp.hz); i <= Math.round((k + 0.25) * F / sp.hz); i++) e += sp.p[i]; out.push(10 * Math.log10(e + 1e-30)); }
  return { k: out, tot: 10 * Math.log10(tot + 1e-30) };
}
for (const y of ys) {
  const caps = [];
  const node = { };
  const r = L.render(D, { name: 'myzel-aeol', po: { rich: RICH, prm: PRM, seed: +(process.env.SEED || 5) }, ch: RICH ? 2 : 1, dur: DUR, params: { freq: F, hoehe: y },
    msgs: [[0, { on: 0, f: F, y, vel: 0.75, seed: +(process.env.SEED || 1234) }]] });
  // sample the capture over time by re-rendering is costly; instead read the final state
  const m = r.L;
  const lv = []; for (let t = 0; t + 0.5 <= DUR; t += 0.5) lv.push(L.db(L.rms(m, t * SR, (t + 0.5) * SR)).toFixed(1));
  const b1 = bands(m, DUR - 0.5);
  console.log(`y ${y}: RMS/0.5s ${lv.join(' ')} | last 0.34 s band dB (k1..8) ${b1.k.map((x) => (x - b1.tot).toFixed(0)).join(' ')} | cap ${r.node.cap} ratio ${r.node.rt.toFixed(2)} peak ${L.db(L.peak(m)).toFixed(1)}`);
}
